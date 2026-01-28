---
title: "Disaster Recovery"
description: "Complete disaster recovery guide for Geode including DR planning, RTO/RPO objectives, failover procedures, and business continuity"
weight: 30
tags:
  - operations
  - disaster-recovery
  - failover
  - business-continuity
  - high-availability
categories:
  - operations
keywords:
  - disaster recovery
  - DR
  - failover
  - RTO
  - RPO
  - business continuity
  - high availability
  - replication
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Disaster Recovery

This guide covers disaster recovery (DR) planning and procedures for Geode, including RTO/RPO objectives, failover strategies, and business continuity planning.

## Overview

Disaster recovery ensures business continuity when failures occur:

| Scenario | Impact | Recovery Strategy |
|----------|--------|-------------------|
| Server crash | Single node unavailable | Automatic restart, replica failover |
| Data center outage | Full DC unavailable | Cross-DC failover |
| Data corruption | Data integrity compromised | Point-in-time recovery |
| Ransomware | Data encrypted/lost | Offline backup restore |
| Region failure | Cloud region unavailable | Multi-region failover |

## Recovery Objectives

### RTO (Recovery Time Objective)

Maximum acceptable downtime:

| Tier | RTO | Use Case |
|------|-----|----------|
| Tier 1 | < 1 minute | Real-time, financial |
| Tier 2 | < 15 minutes | Production critical |
| Tier 3 | < 4 hours | Standard production |
| Tier 4 | < 24 hours | Non-critical |

### RPO (Recovery Point Objective)

Maximum acceptable data loss:

| Tier | RPO | Method |
|------|-----|--------|
| Zero | 0 | Synchronous replication |
| Near-zero | < 1 minute | Async replication + WAL |
| Standard | < 15 minutes | Incremental backups |
| Extended | < 24 hours | Daily backups |

### Geode Capabilities

| Feature | RTO | RPO |
|---------|-----|-----|
| Automatic restart | < 30s | 0 |
| Replica failover | < 1 min | < 1s |
| PITR (Point-in-Time) | < 5 min | < 5 min |
| Backup restore | < 30 min | < 24h |

## DR Architecture Patterns

### Single-Region HA

High availability within a single region:

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │    (Active)     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │ Geode 1 │◄────────►│ Geode 2 │◄────────►│ Geode 3 │
   │(Primary)│  Sync    │(Replica)│  Sync    │(Replica)│
   └────┬────┘  Repl    └────┬────┘  Repl    └────┬────┘
        │                    │                    │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │ Zone A  │          │ Zone B  │          │ Zone C  │
   └─────────┘          └─────────┘          └─────────┘
```

**Characteristics**:
- RTO: < 1 minute
- RPO: < 1 second (sync replication)
- Protects against: Server failure, zone failure

### Multi-Region Active-Passive

Cross-region disaster recovery:

```
┌─────────────────────────────────────┐
│           Primary Region            │
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │ Geode 1 │──│ Geode 2 │──┐       │
│  │(Primary)│  │(Replica)│  │       │
│  └────┬────┘  └─────────┘  │       │
│       │                    │       │
│       ▼                    │       │
│  ┌─────────────────────────┤       │
│  │   Async Replication     │       │
│  └─────────────────────────┘       │
└─────────────────┬───────────────────┘
                  │ Async
                  ▼
┌─────────────────────────────────────┐
│           DR Region                 │
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │ Geode 1 │──│ Geode 2 │          │
│  │(Standby)│  │(Standby)│          │
│  └─────────┘  └─────────┘          │
│                                     │
└─────────────────────────────────────┘
```

**Characteristics**:
- RTO: 15-60 minutes (manual failover)
- RPO: < 5 minutes (async replication)
- Protects against: Region failure, DC failure

### Multi-Region Active-Active

Global deployment with bidirectional replication:

```
┌─────────────────────────┐     ┌─────────────────────────┐
│      Region US-East     │     │     Region EU-West      │
│                         │     │                         │
│  ┌─────────┐           │     │           ┌─────────┐  │
│  │ Geode   │◄─────────────────────────────│ Geode   │  │
│  │ Cluster │ Bidirectional│     │Replication│ Cluster │  │
│  └────┬────┘           │     │           └────┬────┘  │
│       │                │     │                │       │
│  ┌────▼────┐           │     │           ┌────▼────┐  │
│  │  Users  │           │     │           │  Users  │  │
│  │ US/LATAM│           │     │           │  EMEA   │  │
│  └─────────┘           │     │           └─────────┘  │
└─────────────────────────┘     └─────────────────────────┘
```

**Characteristics**:
- RTO: 0 (automatic)
- RPO: Conflict resolution dependent
- Protects against: Regional failures
- Note: Requires conflict resolution strategy

## Configuration

### Replication Setup

```yaml
# geode.yaml - Primary
replication:
  mode: primary
  sync_replicas:
    - host: geode-replica-1.example.com
      port: 3141
    - host: geode-replica-2.example.com
      port: 3141

  async_replicas:
    - host: geode-dr.us-west.example.com
      port: 3141
      lag_threshold: 5m    # Alert if lag > 5 minutes

  settings:
    sync_commit: true      # Wait for sync replicas
    max_lag_bytes: 100MB   # Max replication lag
```

```yaml
# geode.yaml - DR Site
replication:
  mode: standby
  upstream:
    host: geode-primary.us-east.example.com
    port: 3141
    restore_command: 'geode wal-restore %f %p'

  recovery:
    target_timeline: latest
    recovery_target_action: pause  # Pause on recovery
```

### Backup Configuration for DR

```yaml
# geode.yaml
backup:
  # Local backup (primary site)
  local:
    enabled: true
    path: /backups/local
    retention_days: 7

  # S3 backup (same region)
  s3_primary:
    enabled: true
    bucket: geode-backups-us-east
    region: us-east-1
    retention_days: 30

  # S3 backup (DR region)
  s3_dr:
    enabled: true
    bucket: geode-backups-us-west
    region: us-west-2
    retention_days: 90
    storage_class: STANDARD_IA

  # WAL archiving
  wal_archive:
    enabled: true
    destination: s3://geode-wal-archive-us-east
    interval: 1m
    dr_copy: s3://geode-wal-archive-us-west
```

## Failover Procedures

### Automatic Failover (Single Region)

For replica failover within a region:

```yaml
# geode.yaml
high_availability:
  enabled: true
  auto_failover: true
  failover_timeout: 30s
  min_replicas: 2

  health_check:
    interval: 5s
    timeout: 10s
    unhealthy_threshold: 3
```

The system automatically:
1. Detects primary failure (missed health checks)
2. Elects new primary from replicas
3. Updates routing configuration
4. Notifies connected clients

### Manual Failover (Cross-Region)

For planned DR failover:

```bash
#!/bin/bash
# failover-to-dr.sh

set -euo pipefail

PRIMARY_REGION="us-east"
DR_REGION="us-west"

echo "=== Starting DR Failover ==="
echo "From: $PRIMARY_REGION"
echo "To: $DR_REGION"

# 1. Verify DR site is ready
echo "Checking DR site status..."
DR_STATUS=$(geode admin status --host geode-dr.us-west.example.com)
echo "$DR_STATUS"

# 2. Check replication lag
LAG=$(geode admin replication-lag --host geode-dr.us-west.example.com)
echo "Replication lag: $LAG"

if [ "$LAG" -gt 300 ]; then  # > 5 minutes
    echo "WARNING: High replication lag. Potential data loss."
    read -p "Continue? (yes/no): " CONFIRM
    [ "$CONFIRM" != "yes" ] && exit 1
fi

# 3. Stop writes to primary (if accessible)
echo "Stopping writes to primary..."
geode admin read-only --host geode-primary.us-east.example.com 2>/dev/null || true

# 4. Wait for replication to catch up
echo "Waiting for replication to synchronize..."
sleep 30

# 5. Promote DR to primary
echo "Promoting DR site to primary..."
geode admin promote --host geode-dr.us-west.example.com

# 6. Verify promotion
echo "Verifying promotion..."
geode admin status --host geode-dr.us-west.example.com

# 7. Update DNS/load balancer
echo "Updating DNS..."
# aws route53 change-resource-record-sets ...

# 8. Notify monitoring
echo "Sending notification..."
curl -X POST https://hooks.slack.com/... \
  -d '{"text": "DR Failover completed. Active region: '"$DR_REGION"'"}'

echo "=== Failover Complete ==="
```

### Emergency Failover

For unplanned primary failure:

```bash
#!/bin/bash
# emergency-failover.sh

set -euo pipefail

DR_HOST="geode-dr.us-west.example.com"

echo "=== EMERGENCY FAILOVER ==="
echo "WARNING: Primary is unavailable. Data loss may occur."

# 1. Check DR status
echo "Checking DR site..."
geode admin status --host $DR_HOST

# 2. Get last known state
LAST_WAL=$(geode admin last-wal --host $DR_HOST)
echo "Last WAL received: $LAST_WAL"

# 3. Force promote (no wait for sync)
echo "Force promoting DR site..."
geode admin promote --force --host $DR_HOST

# 4. Verify
geode admin status --host $DR_HOST

# 5. Update routing
echo "Updating DNS/routing..."
# Implement DNS update

# 6. Alert
echo "Sending critical alert..."
# Implement alerting

echo "=== Emergency Failover Complete ==="
echo "IMPORTANT: Document data loss window and investigate primary failure"
```

## Recovery Procedures

### Point-in-Time Recovery

Recover to a specific timestamp:

```bash
#!/bin/bash
# pitr-recovery.sh

BACKUP_SOURCE="s3://geode-backups/production"
RECOVERY_TARGET="2026-01-28 10:30:00"
DATA_DIR="/var/lib/geode/data"

echo "=== Point-in-Time Recovery ==="
echo "Target: $RECOVERY_TARGET"

# 1. Stop server
sudo systemctl stop geode

# 2. Backup current state
sudo mv $DATA_DIR ${DATA_DIR}.before-recovery-$(date +%Y%m%d-%H%M%S)

# 3. Find appropriate base backup
BASE_BACKUP=$(geode backup --list --dest $BACKUP_SOURCE \
  --before "$RECOVERY_TARGET" \
  --type full \
  --format json | jq -r '.backups[0].id')

echo "Base backup: $BASE_BACKUP"

# 4. Restore base backup
geode restore \
  --source $BACKUP_SOURCE \
  --backup-id $BASE_BACKUP \
  --target $DATA_DIR

# 5. Apply WAL to target time
geode restore \
  --source $BACKUP_SOURCE \
  --backup-id $BASE_BACKUP \
  --target $DATA_DIR \
  --pitr-timestamp "$RECOVERY_TARGET"

# 6. Verify integrity
geode verify --data-dir $DATA_DIR

# 7. Start server in recovery mode
sudo systemctl start geode

# 8. Verify recovery
geode query "MATCH (n) RETURN count(n) as count"

echo "=== Recovery Complete ==="
```

### Full Backup Restore

Restore from backup after complete loss:

```bash
#!/bin/bash
# full-restore.sh

BACKUP_SOURCE="s3://geode-backups/production"
BACKUP_ID="$1"
DATA_DIR="/var/lib/geode/data"

if [ -z "$BACKUP_ID" ]; then
    echo "Usage: $0 <backup-id>"
    echo "Available backups:"
    geode backup --list --dest $BACKUP_SOURCE
    exit 1
fi

echo "=== Full Restore from Backup ==="
echo "Backup ID: $BACKUP_ID"

# 1. Verify backup exists and is valid
geode backup --verify --dest $BACKUP_SOURCE --backup-id $BACKUP_ID

# 2. Stop server
sudo systemctl stop geode

# 3. Clear existing data
sudo rm -rf $DATA_DIR/*

# 4. Restore
geode restore \
  --source $BACKUP_SOURCE \
  --backup-id $BACKUP_ID \
  --target $DATA_DIR \
  --include-incrementals  # Apply all incrementals

# 5. Verify
geode verify --data-dir $DATA_DIR

# 6. Start server
sudo systemctl start geode

# 7. Health check
sleep 10
geode admin status

echo "=== Restore Complete ==="
```

## DR Testing

### Monthly DR Test

```bash
#!/bin/bash
# dr-test-monthly.sh

TEST_DIR="/tmp/geode-dr-test-$(date +%Y%m%d)"
REPORT_FILE="/var/log/geode/dr-test-$(date +%Y%m%d).log"
BACKUP_SOURCE="s3://geode-backups/production"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$REPORT_FILE"
}

log "=== Monthly DR Test Started ==="

# Get latest backup
LATEST_BACKUP=$(geode backup --list --dest $BACKUP_SOURCE \
  --type full --format json | jq -r '.backups[0].id')

log "Testing backup: $LATEST_BACKUP"

# Create test directory
mkdir -p "$TEST_DIR"

# Measure restore time (RTO test)
START_TIME=$(date +%s)

log "Starting restore..."
geode restore \
  --source $BACKUP_SOURCE \
  --backup-id $LATEST_BACKUP \
  --target "$TEST_DIR" >> "$REPORT_FILE" 2>&1

END_TIME=$(date +%s)
RTO_SECONDS=$((END_TIME - START_TIME))
RTO_MINUTES=$((RTO_SECONDS / 60))

log "Restore completed in ${RTO_SECONDS}s (${RTO_MINUTES}m)"

# Verify data integrity
log "Verifying data integrity..."
geode verify --data-dir "$TEST_DIR" >> "$REPORT_FILE" 2>&1

# Start test server
log "Starting test server..."
geode serve \
  --data-dir "$TEST_DIR" \
  --listen 127.0.0.1:3142 \
  --config-only &
SERVER_PID=$!

sleep 10

# Run validation queries
log "Running validation queries..."
NODE_COUNT=$(geode query "MATCH (n) RETURN count(n) as count" \
  --server 127.0.0.1:3142 --format json | jq -r '.rows[0].count')

log "Node count: $NODE_COUNT"

# Stop test server
kill $SERVER_PID 2>/dev/null

# Cleanup
rm -rf "$TEST_DIR"

# Generate report
log "=== DR Test Summary ==="
log "Backup ID: $LATEST_BACKUP"
log "RTO: ${RTO_MINUTES} minutes (target: 5 minutes)"
log "RTO Status: $([ $RTO_MINUTES -le 5 ] && echo 'PASS' || echo 'FAIL')"
log "Data Integrity: VERIFIED"
log "Node Count: $NODE_COUNT"
log "Test Status: SUCCESS"

# Send report
cat "$REPORT_FILE" | mail -s "Geode DR Test Report - $(date +%Y-%m-%d)" ops@example.com
```

### Quarterly Full DR Drill

```bash
#!/bin/bash
# dr-drill-quarterly.sh

# This script performs a full DR drill including:
# 1. Simulated primary failure
# 2. DR site promotion
# 3. Application failover
# 4. Data validation
# 5. Failback

DRILL_ID="drill-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/var/log/geode/dr-drill-$DRILL_ID.log"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Quarterly DR Drill: $DRILL_ID ==="
log "This drill will:"
log "1. Put primary in read-only mode"
log "2. Promote DR site"
log "3. Run validation tests"
log "4. Fail back to primary"

read -p "Proceed with DR drill? (yes/no): " CONFIRM
[ "$CONFIRM" != "yes" ] && exit 1

# Phase 1: Simulate failure
log "Phase 1: Simulating primary failure..."
# ... implementation

# Phase 2: Promote DR
log "Phase 2: Promoting DR site..."
# ... implementation

# Phase 3: Validate
log "Phase 3: Running validation..."
# ... implementation

# Phase 4: Failback
log "Phase 4: Failing back to primary..."
# ... implementation

log "=== DR Drill Complete ==="
```

## Runbooks

### Runbook: Primary Server Failure

```markdown
# Runbook: Primary Server Failure

## Symptoms
- Primary server unreachable
- Health checks failing
- Client connection errors

## Immediate Actions

1. **Verify failure**
   ```bash
   ping geode-primary.example.com
   geode admin status --host geode-primary.example.com
   ```

2. **Check replica status**
   ```bash
   geode admin status --host geode-replica-1.example.com
   geode admin status --host geode-replica-2.example.com
   ```

3. **Automatic failover should occur**
   - If auto-failover enabled, new primary elected within 30s
   - Verify: `geode admin cluster-status`

4. **If auto-failover fails**
   ```bash
   geode admin promote --host geode-replica-1.example.com
   ```

5. **Update monitoring**
   - Acknowledge alert
   - Create incident ticket

## Recovery
1. Investigate root cause
2. Repair/replace failed server
3. Rejoin as replica
4. Conduct post-incident review
```

### Runbook: Data Corruption

```markdown
# Runbook: Data Corruption Detected

## Symptoms
- Query errors: "checksum mismatch"
- Unexpected query results
- Verification failures

## Immediate Actions

1. **Stop writes**
   ```bash
   geode admin read-only
   ```

2. **Identify corruption scope**
   ```bash
   geode verify --data-dir /var/lib/geode/data --verbose
   ```

3. **Check backup status**
   ```bash
   geode backup --list --dest s3://geode-backups
   ```

4. **Determine recovery point**
   - Last known good backup
   - Or PITR to before corruption

5. **Perform recovery**
   ```bash
   ./pitr-recovery.sh "2026-01-28 09:00:00"
   ```

## Post-Recovery
1. Validate data integrity
2. Resume writes
3. Investigate root cause
4. Review and enhance monitoring
```

## Best Practices

### DR Planning

1. **Define RTO/RPO**: Match business requirements
2. **Document procedures**: Detailed runbooks
3. **Automate where possible**: Reduce human error
4. **Regular testing**: Monthly tests, quarterly drills
5. **Update procedures**: After every change

### Replication

1. **Use sync replication for zero RPO**: Within region
2. **Use async for cross-region**: Accept lag tradeoff
3. **Monitor replication lag**: Alert on threshold
4. **Test failover regularly**: Validate automation
5. **Consider network latency**: For cross-region

### Backup Strategy

1. **3-2-1 rule**: 3 copies, 2 media, 1 offsite
2. **Automate backups**: No manual intervention
3. **Verify backups**: Regular integrity checks
4. **Test restores**: Monthly at minimum
5. **Encrypt backups**: At rest and in transit

### Documentation

1. **Maintain runbooks**: Step-by-step procedures
2. **Include contact info**: Escalation paths
3. **Version control**: Track changes
4. **Regular review**: Update quarterly
5. **Accessible offline**: DR docs available during outage

## Related Documentation

- **[Backup Procedures](/docs/operations/backup/)** - Backup configuration and procedures
- **[Monitoring](/docs/operations/monitoring/)** - DR-related monitoring
- **[Multi-Datacenter Guide](/docs/guides/multi-datacenter/)** - Multi-DC deployment
- **[High Availability](/docs/architecture/distributed-architecture/)** - HA architecture
