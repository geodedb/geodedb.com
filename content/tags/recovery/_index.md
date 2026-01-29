---
title: "Backup and Recovery"
description: "Comprehensive guide to Geode backup strategies, point-in-time recovery, disaster recovery procedures, and data restoration techniques for graph database resilience."
keywords:
  - backup
  - recovery
  - disaster recovery
  - point-in-time recovery
  - PITR
  - data restoration
  - WAL archiving
  - snapshot
  - incremental backup
  - RTO
  - RPO
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/recovery/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Backup and Recovery in Geode

Data is the lifeblood of modern applications. Robust backup and recovery capabilities protect against hardware failures, software bugs, human errors, and disasters. Geode provides comprehensive backup and recovery features including continuous archiving, point-in-time recovery, and automated disaster recovery procedures.

This guide covers backup strategies, recovery procedures, and best practices for ensuring data resilience in Geode deployments.

## Understanding Backup and Recovery

### Recovery Objectives

**RPO (Recovery Point Objective)**: Maximum acceptable data loss
- RPO = 0: No data loss (synchronous replication)
- RPO = 1 minute: Lose at most 1 minute of data
- RPO = 1 hour: Daily backups acceptable for non-critical data

**RTO (Recovery Time Objective)**: Maximum acceptable downtime
- RTO = seconds: Requires hot standby with automatic failover
- RTO = minutes: Requires warm standby or fast restore
- RTO = hours: Cold backup restoration acceptable

### Backup Types

**Full Backup**: Complete copy of all data
- Largest storage requirement
- Fastest restore (single operation)
- Slowest to create

**Incremental Backup**: Changes since last backup
- Smallest storage requirement
- Requires full + all incrementals to restore
- Fastest to create

**Differential Backup**: Changes since last full backup
- Medium storage requirement
- Requires full + latest differential to restore
- Medium creation speed

**Continuous Archiving (WAL)**: Stream write-ahead log
- Enables point-in-time recovery
- Minimal additional storage overhead
- Near-zero RPO

## Backup Configuration

### Full Database Backup

Create a complete backup of the database:

```bash
# Create full backup
./geode backup create \
  --output /backups/geode/full-$(date +%Y%m%d) \
  --type full \
  --compress gzip \
  --parallel 4

# Backup with encryption
./geode backup create \
  --output /backups/geode/full-$(date +%Y%m%d) \
  --type full \
  --encrypt \
  --encryption-key-file /etc/geode/backup.key
```

**Configuration**:
```toml
# geode.toml - Backup configuration
[backup]
enabled = true
directory = "/var/lib/geode/backups"

[backup.full]
# Schedule full backups
schedule = "0 2 * * 0"  # Weekly at 2 AM Sunday
retention_days = 30
compression = "gzip"
parallel_workers = 4

[backup.incremental]
# Schedule incremental backups
schedule = "0 2 * * 1-6"  # Daily at 2 AM Mon-Sat
retention_days = 7
base_backup = "latest_full"
```

### Incremental Backups

Capture only changes since the last backup:

```bash
# Create incremental backup
./geode backup create \
  --output /backups/geode/incr-$(date +%Y%m%d-%H%M) \
  --type incremental \
  --base-backup /backups/geode/full-20260125

# List backup chain
./geode backup list --chain /backups/geode/full-20260125
```

**Output**:
```
Backup Chain for full-20260125:
  1. full-20260125      (12.4 GB, 2026-01-25 02:00:00)
  2. incr-20260126-0200 (234 MB, 2026-01-26 02:00:00)
  3. incr-20260127-0200 (189 MB, 2026-01-27 02:00:00)
  4. incr-20260128-0200 (312 MB, 2026-01-28 02:00:00)

Total size: 13.1 GB
Restore point: 2026-01-28 02:00:00
```

### WAL Archiving for Point-in-Time Recovery

Enable continuous WAL archiving for near-zero RPO:

```toml
# geode.toml - WAL archiving
[wal]
enabled = true
directory = "/var/lib/geode/wal"
max_size_mb = 1024
sync_mode = "fsync"

[wal.archiving]
enabled = true
destination = "/backups/geode/wal"
compression = "lz4"

# Ship WAL to remote storage
[wal.archiving.remote]
enabled = true
type = "s3"
bucket = "geode-wal-archive"
prefix = "production/wal"
upload_interval_seconds = 60
```

**Monitor WAL archiving**:
```gql
-- Check WAL archiving status
SELECT
    current_wal_file,
    last_archived_file,
    archive_lag_bytes,
    archive_lag_seconds,
    failed_archive_count
FROM system.wal_archiving_status;
```

### Cloud Storage Integration

**Amazon S3**:
```toml
[backup.storage]
type = "s3"
bucket = "mycompany-geode-backups"
prefix = "production"
region = "us-east-1"
storage_class = "STANDARD_IA"

[backup.storage.credentials]
# Use IAM role or explicit credentials
use_instance_role = true
# Or:
# access_key_id = "..."
# secret_access_key = "..."
```

**Google Cloud Storage**:
```toml
[backup.storage]
type = "gcs"
bucket = "mycompany-geode-backups"
prefix = "production"
credentials_file = "/etc/geode/gcs-credentials.json"
```

**Azure Blob Storage**:
```toml
[backup.storage]
type = "azure"
container = "geode-backups"
prefix = "production"
account = "mycompanybackups"
# Uses managed identity or connection string
```

## Recovery Procedures

### Full Restore

Restore from a full backup:

```bash
# Stop Geode server
systemctl stop geode

# Clear existing data (if any)
rm -rf /var/lib/geode/data/*

# Restore from backup
./geode backup restore \
  --input /backups/geode/full-20260125 \
  --data-dir /var/lib/geode/data \
  --parallel 4

# Start Geode server
systemctl start geode

# Verify restoration
./geode shell -c "MATCH (n) RETURN count(n) as node_count"
```

### Incremental Restore

Restore full backup plus incrementals:

```bash
# Restore full backup first
./geode backup restore \
  --input /backups/geode/full-20260125 \
  --data-dir /var/lib/geode/data

# Apply incremental backups in order
./geode backup restore \
  --input /backups/geode/incr-20260126-0200 \
  --data-dir /var/lib/geode/data \
  --incremental

./geode backup restore \
  --input /backups/geode/incr-20260127-0200 \
  --data-dir /var/lib/geode/data \
  --incremental

# Or restore entire chain automatically
./geode backup restore \
  --input /backups/geode/incr-20260127-0200 \
  --data-dir /var/lib/geode/data \
  --restore-chain
```

### Point-in-Time Recovery (PITR)

Recover to a specific moment in time:

```bash
# Restore to specific timestamp
./geode backup restore \
  --input /backups/geode/full-20260125 \
  --wal-archive /backups/geode/wal \
  --data-dir /var/lib/geode/data \
  --target-time "2026-01-27 14:30:00 UTC"

# Restore to specific transaction
./geode backup restore \
  --input /backups/geode/full-20260125 \
  --wal-archive /backups/geode/wal \
  --data-dir /var/lib/geode/data \
  --target-xid 12847293

# Restore to named recovery point
./geode backup restore \
  --input /backups/geode/full-20260125 \
  --wal-archive /backups/geode/wal \
  --data-dir /var/lib/geode/data \
  --target-name "pre-migration-checkpoint"
```

**Create named recovery points**:
```gql
-- Create a named checkpoint for easy PITR targeting
CREATE CHECKPOINT 'pre-migration-checkpoint';

-- List available checkpoints
SELECT name, timestamp, wal_position
FROM system.checkpoints
ORDER BY timestamp DESC;
```

### Selective Recovery

Restore specific graphs or data:

```bash
# Restore single graph
./geode backup restore \
  --input /backups/geode/full-20260125 \
  --data-dir /var/lib/geode/data \
  --include-graphs "social_network,analytics"

# Exclude specific graphs
./geode backup restore \
  --input /backups/geode/full-20260125 \
  --data-dir /var/lib/geode/data \
  --exclude-graphs "temp_data,staging"
```

## Disaster Recovery

### DR Architecture

Design for disaster resilience:

```
Primary Site (us-east-1)          DR Site (us-west-2)
┌─────────────────────┐           ┌─────────────────────┐
│  Geode Cluster      │           │  Geode Standby      │
│  (3 nodes)          │──WAL──────│  (3 nodes)          │
│                     │  Stream   │  (read-only)        │
└─────────────────────┘           └─────────────────────┘
         │                                  │
         ▼                                  ▼
┌─────────────────────┐           ┌─────────────────────┐
│  S3 Backup Bucket   │───Repl────│  S3 Backup Bucket   │
│  (us-east-1)        │           │  (us-west-2)        │
└─────────────────────┘           └─────────────────────┘
```

**Configuration for DR standby**:
```toml
# geode.toml - DR standby site
[server]
mode = "standby"
read_only = true

[replication.streaming]
enabled = true
primary_host = "primary.geode.internal"
primary_port = 7687

[replication.wal]
# Receive WAL from primary
receive_directory = "/var/lib/geode/wal_receive"
apply_delay_seconds = 0  # Real-time, or delay for protection

[failover]
# Manual failover only for DR
auto_promote = false
promotion_command = "/etc/geode/promote-to-primary.sh"
```

### DR Failover Procedure

**Planned Failover** (maintenance):
```bash
# On primary site
# 1. Stop accepting writes
./geode admin set-read-only true

# 2. Wait for replication to catch up
./geode admin wait-for-sync --target dr-site

# 3. Create final checkpoint
./geode admin checkpoint --name "failover-$(date +%Y%m%d)"

# On DR site
# 4. Promote standby to primary
./geode admin promote --accept-writes

# 5. Update DNS/load balancer
# 6. Verify applications reconnect
```

**Unplanned Failover** (disaster):
```bash
# On DR site
# 1. Check last received WAL position
./geode admin wal-status

# 2. Decide on data loss acceptance
# 3. Promote to primary
./geode admin promote --force --accept-data-loss

# 4. Update DNS/load balancer
# 5. Notify stakeholders of potential data loss
# 6. Begin incident response
```

### DR Testing

Regular DR drills ensure readiness:

```python
#!/usr/bin/env python3
"""Automated DR test script"""

import subprocess
import time
from datetime import datetime

def run_dr_test():
    """Execute DR failover test"""
    print(f"Starting DR test at {datetime.now()}")

    # 1. Record current state
    primary_count = get_node_count("primary.geode.internal")
    print(f"Primary node count: {primary_count}")

    # 2. Create test data
    create_test_nodes("primary.geode.internal", 1000)

    # 3. Wait for replication
    time.sleep(30)
    dr_count = get_node_count("dr.geode.internal")
    print(f"DR node count: {dr_count}")

    # 4. Simulate primary failure
    print("Simulating primary failure...")
    subprocess.run(["ssh", "primary", "systemctl", "stop", "geode"])

    # 5. Promote DR
    print("Promoting DR site...")
    subprocess.run(["ssh", "dr", "./geode", "admin", "promote"])

    # 6. Verify DR is operational
    time.sleep(10)
    dr_count_after = get_node_count("dr.geode.internal")
    print(f"DR node count after promotion: {dr_count_after}")

    # 7. Run test queries
    verify_queries("dr.geode.internal")

    # 8. Restore primary (cleanup)
    print("Restoring primary...")
    subprocess.run(["ssh", "primary", "systemctl", "start", "geode"])
    subprocess.run(["ssh", "dr", "./geode", "admin", "demote"])

    print(f"DR test completed at {datetime.now()}")

def get_node_count(host):
    result = subprocess.run(
        ["./geode", "shell", "--host", host, "-c",
         "MATCH (n) RETURN count(n) as cnt"],
        capture_output=True, text=True
    )
    # Parse count from output
    return int(result.stdout.strip().split()[-1])

def create_test_nodes(host, count):
    subprocess.run([
        "./geode", "shell", "--host", host, "-c",
        f"UNWIND range(1, {count}) AS i CREATE (:DRTest {{id: i, ts: datetime()}})"
    ])

def verify_queries(host):
    queries = [
        "MATCH (n:DRTest) RETURN count(n)",
        "MATCH (n) RETURN labels(n), count(*) GROUP BY labels(n)",
    ]
    for query in queries:
        subprocess.run(["./geode", "shell", "--host", host, "-c", query])

if __name__ == "__main__":
    run_dr_test()
```

## Backup Monitoring

### Backup Status Metrics

```bash
# Prometheus metrics
curl http://localhost:3141/metrics | grep backup

# Example metrics
geode_backup_last_full_timestamp 1706140800
geode_backup_last_full_duration_seconds 847
geode_backup_last_full_size_bytes 13421772800
geode_backup_last_incremental_timestamp 1706227200
geode_backup_last_incremental_size_bytes 245366784
geode_backup_wal_archive_lag_bytes 0
geode_backup_wal_archive_lag_seconds 12
```

### Backup Health Checks

```gql
-- Check backup status
SELECT
    backup_type,
    last_backup_time,
    last_backup_size_mb,
    last_backup_duration_seconds,
    backup_count_24h,
    oldest_backup_time
FROM system.backup_status;

-- Check WAL archiving health
SELECT
    current_wal_file,
    last_archived_file,
    archive_lag_bytes,
    archive_lag_seconds,
    archive_failures_24h
FROM system.wal_archiving_status;
```

### Alerting Rules

```yaml
# Prometheus alerting rules for backups
groups:
  - name: geode_backup_alerts
    rules:
      - alert: BackupOverdue
        expr: time() - geode_backup_last_full_timestamp > 86400 * 8
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Full backup overdue"
          description: "Last full backup was {{ $value | humanizeDuration }} ago"

      - alert: BackupFailed
        expr: geode_backup_last_status != 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Backup failed"

      - alert: WALArchiveLagHigh
        expr: geode_backup_wal_archive_lag_seconds > 300
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "WAL archive lag is high"
          description: "WAL archiving is {{ $value }}s behind"

      - alert: WALArchiveFailed
        expr: increase(geode_backup_wal_archive_failures_total[1h]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "WAL archiving failed"

      - alert: BackupStorageLow
        expr: geode_backup_storage_free_bytes / geode_backup_storage_total_bytes < 0.1
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Backup storage below 10%"
```

## Backup Validation

### Automated Backup Testing

Regularly verify backup integrity:

```bash
# Verify backup integrity
./geode backup verify \
  --input /backups/geode/full-20260125 \
  --check-checksums \
  --check-consistency

# Test restore to temporary location
./geode backup test-restore \
  --input /backups/geode/full-20260125 \
  --temp-dir /tmp/geode-restore-test \
  --run-queries "MATCH (n) RETURN count(n)"
```

**Automated validation script**:
```bash
#!/bin/bash
# /etc/geode/scripts/validate-backup.sh

BACKUP_DIR="/backups/geode"
TEST_DIR="/tmp/geode-backup-test"
ALERT_EMAIL="ops@company.com"

# Find latest full backup
LATEST_FULL=$(ls -t $BACKUP_DIR/full-* | head -1)

echo "Validating backup: $LATEST_FULL"

# Verify checksums
if ! ./geode backup verify --input "$LATEST_FULL" --check-checksums; then
    echo "CRITICAL: Backup checksum verification failed!" | mail -s "Backup Alert" $ALERT_EMAIL
    exit 1
fi

# Test restore
rm -rf $TEST_DIR
mkdir -p $TEST_DIR

if ! ./geode backup restore --input "$LATEST_FULL" --data-dir "$TEST_DIR" 2>/dev/null; then
    echo "CRITICAL: Backup restore test failed!" | mail -s "Backup Alert" $ALERT_EMAIL
    exit 1
fi

# Start temporary instance and verify
./geode serve --data-dir "$TEST_DIR" --listen 127.0.0.1:13141 &
TEMP_PID=$!
sleep 10

# Run verification queries
NODE_COUNT=$(./geode shell --host 127.0.0.1:13141 -c "MATCH (n) RETURN count(n)" 2>/dev/null)

# Cleanup
kill $TEMP_PID 2>/dev/null
rm -rf $TEST_DIR

echo "Backup validation successful. Node count: $NODE_COUNT"
```

### Retention Management

Configure backup retention policies:

```toml
[backup.retention]
# Keep full backups for 30 days
full_retention_days = 30
full_min_count = 4  # Keep at least 4 full backups

# Keep incremental backups for 7 days
incremental_retention_days = 7

# Keep WAL archives for 14 days
wal_retention_days = 14

# Automatic cleanup
auto_cleanup = true
cleanup_schedule = "0 4 * * *"  # 4 AM daily
```

```bash
# Manual cleanup
./geode backup cleanup \
  --older-than 30d \
  --keep-min 4 \
  --dry-run  # Preview what will be deleted

# Actually delete
./geode backup cleanup \
  --older-than 30d \
  --keep-min 4
```

## Best Practices

### Backup Strategy

1. **Follow 3-2-1 rule**: 3 copies, 2 different media, 1 offsite
2. **Automate backups**: Never rely on manual processes
3. **Encrypt sensitive data**: Protect backups at rest
4. **Test restores regularly**: Untested backups may not work
5. **Document procedures**: Clear runbooks for emergencies

### Recovery Planning

1. **Define RTO/RPO**: Based on business requirements
2. **Choose appropriate strategy**: Balance cost vs. recovery speed
3. **Plan for different scenarios**: Hardware failure, data corruption, disaster
4. **Train team members**: Everyone should know recovery procedures
5. **Conduct regular drills**: Practice makes perfect

### Monitoring and Alerting

1. **Monitor backup success**: Alert on failures immediately
2. **Track backup duration**: Detect performance degradation
3. **Monitor storage capacity**: Plan ahead for growth
4. **Check WAL archiving**: Ensure continuous protection
5. **Validate backups**: Automated integrity checks

### Security

1. **Encrypt backups**: Use strong encryption (AES-256)
2. **Secure backup storage**: Restrict access to backup locations
3. **Audit backup access**: Log who accesses backups
4. **Rotate encryption keys**: Regular key rotation policy
5. **Test decryption**: Verify you can decrypt backups

## Related Topics

- [High Availability](/tags/high-availability/) - HA configuration and failover
- [Backup](/tags/backup/) - Backup creation and management
- [Replication](/tags/replication/) - Data replication strategies
- [Distributed Systems](/tags/distributed-systems/) - Distributed architecture
- [Operations](/tags/operations/) - Operational procedures
- [Security](/tags/security/) - Data protection and encryption

## Further Reading

- Backup and Recovery Best Practices Guide
- Disaster Recovery Planning Handbook
- Point-in-Time Recovery Tutorial
- Backup Encryption Guide
- DR Testing Procedures
- Compliance and Backup Retention
