---
title: "Database Recovery"
description: "Complete guide to database recovery procedures for Geode including crash recovery, point-in-time recovery, disaster recovery, and data restoration"
summary: "Learn how to recover Geode databases from crashes, corruption, and disasters with step-by-step procedures for various recovery scenarios."
weight: 75
keywords:
  - database recovery
  - crash recovery
  - disaster recovery
  - point-in-time recovery
  - PITR
  - data restoration
  - backup restore
  - WAL recovery
tags:
  - recovery
  - operations
  - backup
  - disaster-recovery
categories:
  - operations
  - guides
toc: true
params:
  seo:
    keywords: "database recovery, crash recovery, disaster recovery, PITR, Geode backup restore"
    description: "Complete database recovery guide for Geode including crash recovery, PITR, and disaster recovery procedures"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Database Recovery

This guide covers all aspects of database recovery for Geode, from automatic crash recovery to manual disaster recovery procedures. Understanding these concepts ensures minimal data loss and rapid service restoration.

## Overview

Geode provides multiple recovery mechanisms to handle various failure scenarios:

| Recovery Type | Use Case | RTO | RPO |
|--------------|----------|-----|-----|
| **Automatic Crash Recovery** | Server restart after crash | Seconds | Zero |
| **WAL Replay** | Incomplete transactions | Seconds | Zero |
| **Point-in-Time Recovery** | Restore to specific timestamp | Minutes | Configurable |
| **Full Restore** | Complete database restoration | Minutes | Last backup |
| **Disaster Recovery** | Site failure, data corruption | Minutes-Hours | Last backup |

**Key Terms**:
- **RTO** (Recovery Time Objective): Maximum acceptable downtime
- **RPO** (Recovery Point Objective): Maximum acceptable data loss

## Automatic Crash Recovery

### How It Works

Geode uses Write-Ahead Logging (WAL) to ensure durability. When the server restarts after a crash:

1. **WAL Analysis**: Scans WAL to identify incomplete transactions
2. **Redo Phase**: Replays committed transactions not yet flushed to disk
3. **Undo Phase**: Rolls back uncommitted transactions
4. **Checkpoint**: Creates recovery checkpoint

### Crash Recovery Process

```plaintext
Server Crash
    │
    ▼
Server Restart
    │
    ▼
┌─────────────────────────────────────┐
│  1. Load last checkpoint            │
│  2. Scan WAL from checkpoint LSN    │
│  3. Build transaction table         │
│  4. Redo committed transactions     │
│  5. Undo uncommitted transactions   │
│  6. Create new checkpoint           │
└─────────────────────────────────────┘
    │
    ▼
Server Ready
```

### Verifying Crash Recovery

After server restart, verify recovery completed:

```bash
# Check server logs for recovery messages
geode logs --tail 100 | grep -i recovery

# Expected output:
# [INFO] Starting crash recovery from checkpoint LSN: 12345678
# [INFO] WAL replay: 156 transactions to redo
# [INFO] WAL replay: 3 transactions to undo
# [INFO] Crash recovery completed in 1.2s
# [INFO] Server ready on port 3141

# Verify database integrity
geode verify --data-dir /var/lib/geode/data

# Run health check query
geode query "RETURN 1 AS health_check"
```

### Recovery Configuration

```yaml
# geode.yaml
recovery:
  # WAL configuration
  wal:
    enabled: true
    sync_mode: fsync        # Options: none, fsync, fdatasync
    buffer_size: 16MB
    segment_size: 64MB

  # Checkpoint configuration
  checkpoint:
    interval: 5m            # Checkpoint frequency
    min_wal_size: 256MB     # Minimum WAL before checkpoint

  # Recovery limits
  max_recovery_time: 10m    # Abort if recovery exceeds
  parallel_redo: true       # Parallel transaction replay
  redo_threads: 4           # Number of redo threads
```

## Point-in-Time Recovery (PITR)

PITR allows restoring the database to any point in time within the retention period.

### Prerequisites

- WAL archiving enabled
- Periodic full backups
- Archived WAL segments

### Enable WAL Archiving

```yaml
# geode.yaml
backup:
  wal_archiving:
    enabled: true
    archive_path: /var/lib/geode/wal_archive
    # Or use S3
    s3:
      enabled: true
      bucket: geode-wal-archive
      prefix: production/wal
    retention_hours: 168     # 7 days
```

### PITR Restore Procedure

**Step 1: Stop the Server**

```bash
sudo systemctl stop geode
```

**Step 2: Identify Target Time**

Determine the point in time to restore to:

```bash
# List available recovery points
geode backup --dest s3://geode-backups/production --list-recovery-points

# Output:
# Recovery Points Available:
# ─────────────────────────────────────────────────────────
# Base Backup ID    Timestamp               Earliest PITR
# 1738012345        2026-01-23 02:00:00     2026-01-23 02:00:00
# WAL Segments: 2026-01-23 02:00:00 to 2026-01-28 10:30:00
# ─────────────────────────────────────────────────────────
```

**Step 3: Restore Base Backup**

```bash
# Create fresh data directory
sudo mv /var/lib/geode/data /var/lib/geode/data.old

# Restore base backup
geode restore \
  --source s3://geode-backups/production \
  --backup-id 1738012345 \
  --target /var/lib/geode/data
```

**Step 4: Apply WAL to Target Time**

```bash
geode recover \
  --data-dir /var/lib/geode/data \
  --wal-archive s3://geode-wal-archive/production/wal \
  --target-time "2026-01-28 10:30:00" \
  --timezone UTC

# Output:
# Starting point-in-time recovery
# Base backup: 1738012345 (2026-01-23 02:00:00)
# Target time: 2026-01-28 10:30:00 UTC
# Applying WAL segments:
#   - segment-0001.wal (2026-01-23 02:05:00 - 2026-01-24 02:00:00)
#   - segment-0002.wal (2026-01-24 02:00:00 - 2026-01-25 02:00:00)
#   - segment-0003.wal (2026-01-25 02:00:00 - 2026-01-26 02:00:00)
#   - segment-0004.wal (2026-01-26 02:00:00 - 2026-01-27 02:00:00)
#   - segment-0005.wal (2026-01-27 02:00:00 - 2026-01-28 02:00:00)
#   - segment-0006.wal (2026-01-28 02:00:00 - 2026-01-28 11:00:00)
# Stopping at: 2026-01-28 10:30:00 UTC
# Recovery complete
# Transactions applied: 12,456
# Final LSN: 0x1A2B3C4D
```

**Step 5: Verify and Start**

```bash
# Verify data integrity
geode verify --data-dir /var/lib/geode/data

# Start server
sudo systemctl start geode

# Verify recovery
geode query "MATCH (n) RETURN count(n) AS node_count"
```

### PITR to Named Recovery Point

If you created named recovery points:

```bash
# Recover to named point
geode recover \
  --data-dir /var/lib/geode/data \
  --wal-archive s3://geode-wal-archive/production/wal \
  --target-name "pre-migration-backup"
```

## Full Database Restore

For complete database restoration from backup.

### Standard Restore

```bash
# Stop server
sudo systemctl stop geode

# Backup current data (safety)
sudo mv /var/lib/geode/data /var/lib/geode/data.backup-$(date +%Y%m%d)

# List available backups
geode backup --dest s3://geode-backups/production --list

# Restore latest backup
LATEST_BACKUP=$(geode backup --dest s3://geode-backups/production --list --latest --quiet)

geode restore \
  --source s3://geode-backups/production \
  --backup-id $LATEST_BACKUP \
  --target /var/lib/geode/data

# Verify integrity
geode verify --data-dir /var/lib/geode/data

# Start server
sudo systemctl start geode
```

### Restore with Incremental Backups

When using incremental backup strategy:

```bash
# Restore full backup chain
geode restore \
  --source s3://geode-backups/production \
  --backup-id 1738012345 \                    # Base full backup
  --apply-incrementals \                       # Apply all incremental backups
  --target /var/lib/geode/data

# Output:
# Restoring base backup 1738012345...
# Applying incremental 1738098745 (2026-01-24)...
# Applying incremental 1738185145 (2026-01-25)...
# Applying incremental 1738271545 (2026-01-26)...
# Applying incremental 1738357945 (2026-01-27)...
# Restore complete
```

### Restore to Different Location

```bash
# Restore to alternate directory
geode restore \
  --source s3://geode-backups/production \
  --backup-id 1738012345 \
  --target /var/lib/geode/data-restored

# Start with alternate data directory
geode serve \
  --data-dir /var/lib/geode/data-restored \
  --listen 0.0.0.0:3142
```

## Disaster Recovery

### Complete Site Failure

When the primary site is unavailable:

**Step 1: Provision New Infrastructure**

```bash
# Deploy new Geode server
# (Use your provisioning tool: Terraform, Ansible, etc.)

# Install Geode
curl -fsSL https://geodedb.com/install.sh | sudo bash
```

**Step 2: Configure Cloud Storage Access**

```bash
export AWS_ACCESS_KEY_ID='your-access-key'
export AWS_SECRET_ACCESS_KEY='your-secret-key'
export AWS_REGION='us-west-2'
```

**Step 3: Restore from Off-Site Backup**

```bash
# List available backups
geode backup --dest s3://geode-backups/production --list

# Restore latest backup
geode restore \
  --source s3://geode-backups/production \
  --backup-id latest \
  --target /var/lib/geode/data

# Apply WAL if PITR is needed
geode recover \
  --data-dir /var/lib/geode/data \
  --wal-archive s3://geode-wal-archive/production/wal \
  --target-time "latest"
```

**Step 4: Verify and Start**

```bash
# Verify data
geode verify --data-dir /var/lib/geode/data

# Start server
sudo systemctl start geode

# Run comprehensive health check
geode query "MATCH (n) RETURN labels(n) AS label, count(n) AS count"
```

### Data Corruption Recovery

If data files are corrupted:

**Step 1: Identify Corruption**

```bash
# Run integrity check
geode verify --data-dir /var/lib/geode/data --full

# Output:
# Checking nodes.db... ERROR: Checksum mismatch at block 12345
# Checking edges.db... OK
# Checking indexes/... OK
# Verification FAILED: 1 corrupted file(s)
```

**Step 2: Attempt Repair**

```bash
# Try automatic repair (minor corruption)
geode repair --data-dir /var/lib/geode/data --auto

# Output:
# Repairing nodes.db...
# Block 12345: Reconstructing from WAL
# Block 12345: Repair successful
# Repair complete
```

**Step 3: If Repair Fails, Restore from Backup**

```bash
# Stop server
sudo systemctl stop geode

# Restore from last known good backup
geode restore \
  --source s3://geode-backups/production \
  --backup-id last-verified \
  --target /var/lib/geode/data

# Start server
sudo systemctl start geode
```

### Accidental Data Deletion Recovery

If data was accidentally deleted:

**Option 1: Point-in-Time Recovery (Preferred)**

```bash
# Restore to time before deletion
geode recover \
  --data-dir /var/lib/geode/data-recovery \
  --wal-archive s3://geode-wal-archive/production/wal \
  --target-time "2026-01-28 09:00:00"  # Before deletion at 10:00

# Extract deleted data from recovered instance
geode query "MATCH (n:DeletedLabel) RETURN n" \
  --server localhost:3142 \
  --format json > deleted_data.json

# Re-import to production
geode import --file deleted_data.json --server localhost:3141
```

**Option 2: Partial Restore**

```bash
# Export specific data from backup
geode backup-extract \
  --source s3://geode-backups/production \
  --backup-id 1738012345 \
  --query "MATCH (n:ImportantLabel) RETURN n" \
  --output recovered_data.json

# Import to production
geode import --file recovered_data.json
```

## Recovery Verification

### Post-Recovery Checks

After any recovery, run these verification steps:

```bash
#!/bin/bash
# /usr/local/bin/geode-recovery-verify.sh

echo "=== Geode Recovery Verification ==="

# 1. Check server is running
echo "1. Checking server status..."
systemctl is-active geode || { echo "FAILED: Server not running"; exit 1; }

# 2. Verify data integrity
echo "2. Verifying data integrity..."
geode verify --data-dir /var/lib/geode/data --quick || { echo "FAILED: Integrity check failed"; exit 1; }

# 3. Check node count
echo "3. Checking node count..."
NODE_COUNT=$(geode query "MATCH (n) RETURN count(n)" --format json | jq -r '.result.rows[0][0]')
echo "   Node count: $NODE_COUNT"

# 4. Check relationship count
echo "4. Checking relationship count..."
REL_COUNT=$(geode query "MATCH ()-[r]->() RETURN count(r)" --format json | jq -r '.result.rows[0][0]')
echo "   Relationship count: $REL_COUNT"

# 5. Test transactions
echo "5. Testing transactions..."
geode query "BEGIN; CREATE (:RecoveryTest {ts: datetime()}); ROLLBACK" || { echo "FAILED: Transaction test failed"; exit 1; }

# 6. Check replication (if cluster)
echo "6. Checking cluster status..."
geode cluster status 2>/dev/null || echo "   Single-node mode (no cluster)"

echo ""
echo "=== Recovery Verification PASSED ==="
```

### Data Comparison

Compare recovered data with expected state:

```bash
# Export node counts by label
geode query "
  MATCH (n)
  RETURN labels(n) AS label, count(n) AS count
  ORDER BY label
" --format json > current_counts.json

# Compare with expected (from before incident)
diff expected_counts.json current_counts.json
```

## Recovery Runbook

### Quick Reference: Recovery Decision Tree

```plaintext
Server Down?
    │
    ├── Server crash → Restart server (auto recovery)
    │
    └── Data issue?
            │
            ├── Minor corruption → Run geode repair
            │
            ├── Major corruption → Restore from backup
            │
            └── Accidental deletion?
                    │
                    ├── Need specific time → PITR
                    │
                    └── Need latest data → Restore + WAL replay
```

### Emergency Recovery Checklist

**Immediate Actions**:
- [ ] Assess the situation (type of failure)
- [ ] Check server logs: `geode logs --tail 500`
- [ ] Preserve evidence: `cp -r /var/lib/geode/data /var/lib/geode/data.incident-$(date +%s)`
- [ ] Notify stakeholders

**Recovery Actions**:
- [ ] Determine recovery strategy (auto, PITR, full restore)
- [ ] Execute recovery procedure
- [ ] Run verification checks
- [ ] Monitor server stability

**Post-Recovery**:
- [ ] Document incident timeline
- [ ] Identify root cause
- [ ] Update runbooks if needed
- [ ] Schedule post-incident review

## Best Practices

### Prevention

1. **Regular Backups**: Daily incremental, weekly full
2. **WAL Archiving**: Continuous to enable PITR
3. **Monitoring**: Alert on backup failures, disk space
4. **Testing**: Monthly recovery drills

### Configuration Recommendations

```yaml
# geode.yaml - Production recovery settings
recovery:
  wal:
    enabled: true
    sync_mode: fsync
    segment_size: 64MB

  checkpoint:
    interval: 5m

backup:
  wal_archiving:
    enabled: true
    retention_hours: 168  # 7 days

  schedule:
    full_backup: '0 2 * * 0'      # Weekly Sunday
    incremental_backup: '0 2 * * 1-6'  # Daily

  retention_days: 90
```

### Recovery Time Targets

| Scenario | Target RTO | Target RPO |
|----------|-----------|------------|
| Server crash | < 1 minute | 0 (no data loss) |
| Minor corruption | < 5 minutes | 0 |
| Full restore | < 15 minutes | Last backup |
| PITR | < 30 minutes | Target timestamp |
| Disaster recovery | < 1 hour | Last WAL archive |

## Related Documentation

- **[Backup Automation](/docs/guides/backup-automation/)** - Automated backup configuration
- **[Server Configuration](/docs/configuration/server-configuration/)** - Server settings
- **[Troubleshooting](/docs/guides/troubleshooting/)** - Common issues and solutions
- **[Deployment Patterns](/docs/deployment/deployment-patterns/)** - High availability setup
- **[Distributed Architecture](/docs/architecture/distributed-architecture/)** - Cluster recovery

## Summary

Geode provides robust recovery mechanisms:

- **Automatic crash recovery** with WAL ensures zero data loss for committed transactions
- **Point-in-time recovery** enables restoration to any moment within retention period
- **Full backup restore** provides complete database reconstruction
- **Disaster recovery** procedures handle site-wide failures

**Key Takeaways**:
- Enable WAL archiving for PITR capability
- Test recovery procedures regularly (monthly)
- Document and practice recovery runbooks
- Monitor backup health continuously

---

**Last Updated:** January 28, 2026
**Geode Version:** v0.1.3+
**Status:** Production Ready
