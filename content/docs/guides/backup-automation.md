---
title: "Automated Backup Guide"
description: "Complete guide to automated backup and recovery for Geode including S3 cloud backups, scheduled backups, point-in-time recovery, and disaster recovery procedures"
keywords: ["automated backups", "S3 backup", "cloud backup", "disaster recovery", "point-in-time recovery", "backup automation", "cron", "backup testing", "recovery testing"]
weight: 65
slug: "backup-automation"
canonical: "https://geodedb.com/docs/guides/backup-automation/"
---

Implementing robust automated backup strategies is critical for production Geode deployments. This guide covers automated backup configuration, scheduling, testing, and disaster recovery procedures.

## Overview

Geode supports multiple backup strategies:

- **Full Backups**: Complete database snapshot
- **Incremental Backups**: Changes since last full backup
- **Point-in-Time Recovery (PITR)**: Restore to specific timestamp
- **Cloud Storage**: S3-compatible object storage integration
- **Automated Scheduling**: Cron-based backup automation

**Recovery Time Objective (RTO)**: < 5 minutes for full restore
**Recovery Point Objective (RPO)**: < 15 minutes with incremental backups

## S3 Cloud Backup Configuration

### Prerequisites

**S3-Compatible Storage**:
- Amazon S3
- Digital Ocean Spaces
- MinIO
- Wasabi
- Backblaze B2

**Required Credentials**:
- Access Key ID
- Secret Access Key
- Region (for AWS)
- Endpoint URL (for non-AWS providers)

### Environment Setup

```bash
# AWS S3
export AWS_ACCESS_KEY_ID='AKIAIOSFODNN7EXAMPLE'
export AWS_SECRET_ACCESS_KEY='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
export AWS_REGION='us-east-1'

# Digital Ocean Spaces
export AWS_ACCESS_KEY_ID='DO_SPACES_KEY'
export AWS_SECRET_ACCESS_KEY='DO_SPACES_SECRET'
export AWS_ENDPOINT_URL='https://nyc3.digitaloceanspaces.com'
export AWS_REGION='us-east-1'  # Required but not used by DO

# MinIO
export AWS_ACCESS_KEY_ID='minio_access_key'
export AWS_SECRET_ACCESS_KEY='minio_secret_key'
export AWS_ENDPOINT_URL='https://minio.example.com:9000'
export AWS_REGION='us-east-1'
```

### Server Configuration

```yaml
# geode.yaml
backup:
  s3:
    enabled: true
    bucket: 'geode-production-backups'
    prefix: 'prod'  # Optional: organize by environment
    region: 'us-east-1'
    endpoint: ''  # Leave empty for AWS S3
    access_key_id: '${AWS_ACCESS_KEY_ID}'
    secret_access_key: '${AWS_SECRET_ACCESS_KEY}'
    compression: true  # gzip compression
    encryption: true  # Server-side encryption
    retention_days: 90  # Auto-delete old backups

  schedule:
    enabled: true
    full_backup: '0 2 * * 0'  # Weekly on Sunday at 2 AM
    incremental_backup: '0 2 * * 1-6'  # Daily at 2 AM except Sunday
```

## Manual Backup Operations

### Full Backup

```bash
# Create full backup
geode backup \
  --dest s3://geode-backups/production \
  --mode full \
  --compression gzip

# Output:
# Backup started: backup-20260123-020000
# Backup ID: 1738012345
# Compressing data...
# Uploading to S3: s3://geode-backups/production/backup-1738012345.tar.gz
# Backup completed successfully
# Size: 2.3 GB (compressed from 5.1 GB)
# Duration: 45s
```

### Incremental Backup

```bash
# Create incremental backup (delta since last full)
geode backup \
  --dest s3://geode-backups/production \
  --mode incremental \
  --parent 1738012345

# Output:
# Incremental backup started
# Parent backup: 1738012345 (2026-01-23 02:00:00)
# Backup ID: 1738098745
# Changes: 156 MB
# Duration: 8s
```

### List Backups

```bash
# List all backups
geode backup \
  --dest s3://geode-backups/production \
  --list

# Output:
# Backup ID       Type          Size      Timestamp            Status
# 1738012345      full          2.3 GB    2026-01-23 02:00:00  complete
# 1738098745      incremental   156 MB    2026-01-24 02:00:00  complete
# 1738185145      incremental   89 MB     2026-01-25 02:00:00  complete
# 1738271545      incremental   134 MB    2026-01-26 02:00:00  complete
```

### Verify Backup Integrity

```bash
# Verify backup without restoring
geode backup \
  --dest s3://geode-backups/production \
  --verify \
  --backup-id 1738012345

# Output:
# Verifying backup 1738012345...
# Downloading metadata...
# Checking file integrity (SHA256)...
# ✓ data/nodes.db: OK
# ✓ data/edges.db: OK
# ✓ data/indexes/: OK
# ✓ wal/: OK
# Backup integrity: VALID
```

## Automated Backup Scripts

### Backup Script

```bash
#!/bin/bash
# /usr/local/bin/geode-backup.sh

set -euo pipefail

# Configuration
BUCKET="s3://geode-production-backups"
RETENTION_DAYS=90
LOG_FILE="/var/log/geode/backup.log"
ALERT_EMAIL="ops@example.com"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Error handler
handle_error() {
    log "ERROR: Backup failed at line $1"
    echo "Geode backup failed. Check $LOG_FILE for details." | \
        mail -s "Geode Backup Failure" "$ALERT_EMAIL"
    exit 1
}

trap 'handle_error $LINENO' ERR

log "Starting backup"

# Determine backup type (full on Sunday, incremental otherwise)
DOW=$(date +%u)

if [ "$DOW" -eq 7 ]; then
    log "Performing full backup (Sunday)"
    BACKUP_ID=$(geode backup \
        --dest "$BUCKET" \
        --mode full \
        --compression gzip | \
        grep "Backup ID" | \
        awk '{print $3}')

    echo "$BACKUP_ID" > /var/lib/geode/last-full-backup
    log "Full backup completed: $BACKUP_ID"
else
    log "Performing incremental backup"
    PARENT=$(cat /var/lib/geode/last-full-backup)
    BACKUP_ID=$(geode backup \
        --dest "$BUCKET" \
        --mode incremental \
        --parent "$PARENT" \
        --compression gzip | \
        grep "Backup ID" | \
        awk '{print $3}')

    log "Incremental backup completed: $BACKUP_ID"
fi

# Verify backup integrity
log "Verifying backup integrity"
geode backup \
    --dest "$BUCKET" \
    --verify \
    --backup-id "$BACKUP_ID" >> "$LOG_FILE" 2>&1

# Prune old backups
log "Pruning backups older than $RETENTION_DAYS days"
geode backup \
    --dest "$BUCKET" \
    --prune \
    --older-than-days "$RETENTION_DAYS" >> "$LOG_FILE" 2>&1

log "Backup completed successfully"

# Send success notification
echo "Backup completed successfully. ID: $BACKUP_ID" | \
    mail -s "Geode Backup Success" "$ALERT_EMAIL"
```

### Crontab Configuration

```bash
# Install backup script
sudo cp geode-backup.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/geode-backup.sh

# Add to crontab
sudo crontab -e

# Daily backups at 2 AM
0 2 * * * /usr/local/bin/geode-backup.sh >> /var/log/geode/backup-cron.log 2>&1
```

### Systemd Timer (Alternative to Cron)

```ini
# /etc/systemd/system/geode-backup.service
[Unit]
Description=Geode Automated Backup
Wants=geode-backup.timer

[Service]
Type=oneshot
User=geode
Group=geode
ExecStart=/usr/local/bin/geode-backup.sh
StandardOutput=append:/var/log/geode/backup.log
StandardError=append:/var/log/geode/backup.log

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/geode-backup.timer
[Unit]
Description=Geode Backup Timer
Requires=geode-backup.service

[Timer]
# Daily at 2 AM
OnCalendar=daily
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Enable timer
sudo systemctl daemon-reload
sudo systemctl enable geode-backup.timer
sudo systemctl start geode-backup.timer

# Check status
sudo systemctl status geode-backup.timer
sudo systemctl list-timers geode-backup.timer
```

## Restore Procedures

### Full Restore

```bash
# Stop Geode server
sudo systemctl stop geode

# Backup current data (safety)
sudo mv /var/lib/geode/data /var/lib/geode/data.backup-$(date +%Y%m%d)

# Restore from backup
geode restore \
  --source s3://geode-backups/production \
  --backup-id 1738012345 \
  --target /var/lib/geode/data

# Verify data integrity
geode verify --data-dir /var/lib/geode/data

# Start server
sudo systemctl start geode

# Verify server health
geode query "RETURN 1 AS health_check"
```

### Point-in-Time Recovery (PITR)

```bash
# Restore to specific timestamp
geode restore \
  --source s3://geode-backups/production \
  --backup-id 1738012345 \
  --target /var/lib/geode/data \
  --pitr-timestamp "2026-01-23 10:30:00"

# Process:
# 1. Restore base backup (full backup 1738012345)
# 2. Apply WAL segments up to specified timestamp
# 3. Stop at exact recovery point
#
# Output:
# Restoring base backup...
# Applying WAL segments...
# - wal/segment-001.log (2026-01-23 02:05:00 - 03:00:00)
# - wal/segment-002.log (2026-01-23 03:00:00 - 04:00:00)
# ...
# - wal/segment-009.log (2026-01-23 10:00:00 - 10:35:12)
# Stopping at 2026-01-23 10:30:00
# Recovery complete
```

### Automated Restore Script

```bash
#!/bin/bash
# /usr/local/bin/geode-restore.sh

set -euo pipefail

BUCKET="$1"
BACKUP_ID="$2"
TARGET="${3:-/var/lib/geode/data}"
PITR_TIMESTAMP="${4:-}"

echo "Stopping Geode server..."
sudo systemctl stop geode

echo "Creating safety backup of current data..."
if [ -d "$TARGET" ]; then
    sudo mv "$TARGET" "${TARGET}.before-restore-$(date +%Y%m%d-%H%M%S)"
fi

echo "Restoring from backup $BACKUP_ID..."
if [ -n "$PITR_TIMESTAMP" ]; then
    geode restore \
        --source "$BUCKET" \
        --backup-id "$BACKUP_ID" \
        --target "$TARGET" \
        --pitr-timestamp "$PITR_TIMESTAMP"
else
    geode restore \
        --source "$BUCKET" \
        --backup-id "$BACKUP_ID" \
        --target "$TARGET"
fi

echo "Verifying data integrity..."
geode verify --data-dir "$TARGET"

echo "Starting Geode server..."
sudo systemctl start geode

# Wait for server to start
sleep 5

echo "Verifying server health..."
geode query "RETURN 1 AS health_check"

echo "Restore completed successfully"

# Usage:
# ./geode-restore.sh s3://geode-backups/production 1738012345
# ./geode-restore.sh s3://geode-backups/production 1738012345 /var/lib/geode/data "2026-01-23 10:30:00"
```

## Disaster Recovery Testing

### Monthly DR Test

```bash
#!/bin/bash
# /usr/local/bin/geode-dr-test.sh

set -euo pipefail

BUCKET="s3://geode-backups/production"
TEST_DIR="/tmp/geode-dr-test-$(date +%Y%m%d)"
REPORT_FILE="/var/log/geode/dr-test-$(date +%Y%m%d).log"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$REPORT_FILE"
}

log "=== Disaster Recovery Test Started ==="

# Get latest backup
LATEST_BACKUP=$(geode backup --dest "$BUCKET" --list | \
    grep "full" | \
    head -1 | \
    awk '{print $1}')

log "Testing restore of backup: $LATEST_BACKUP"

# Create test directory
mkdir -p "$TEST_DIR"

# Restore to test directory
log "Restoring backup..."
START_TIME=$(date +%s)

geode restore \
    --source "$BUCKET" \
    --backup-id "$LATEST_BACKUP" \
    --target "$TEST_DIR" >> "$REPORT_FILE" 2>&1

END_TIME=$(date +%s)
RESTORE_DURATION=$((END_TIME - START_TIME))

log "Restore completed in ${RESTORE_DURATION}s (RTO target: 300s)"

# Verify data integrity
log "Verifying data integrity..."
geode verify --data-dir "$TEST_DIR" >> "$REPORT_FILE" 2>&1

# Start test server
log "Starting test server..."
geode serve \
    --data-dir "$TEST_DIR" \
    --listen 127.0.0.1:3142 &
SERVER_PID=$!

sleep 5

# Run validation queries
log "Running validation queries..."
QUERY_COUNT=$(geode query "MATCH (n) RETURN count(n)" --server 127.0.0.1:3142 | \
    jq -r '.result.rows[0].count')

log "Node count: $QUERY_COUNT"

# Stop test server
kill $SERVER_PID

# Cleanup
rm -rf "$TEST_DIR"

# Generate report
log "=== Disaster Recovery Test Summary ==="
log "Backup ID: $LATEST_BACKUP"
log "Restore Duration: ${RESTORE_DURATION}s (RTO: 300s)"
log "RTO Status: $([ $RESTORE_DURATION -lt 300 ] && echo 'PASS' || echo 'FAIL')"
log "Data Integrity: VERIFIED"
log "Node Count: $QUERY_COUNT"
log "Test Status: SUCCESS"

# Schedule monthly
# 0 3 1 * * /usr/local/bin/geode-dr-test.sh
```

## Monitoring and Alerting

### Backup Monitoring Script

```bash
#!/bin/bash
# /usr/local/bin/geode-backup-monitor.sh

BUCKET="s3://geode-backups/production"
ALERT_EMAIL="ops@example.com"
MAX_AGE_HOURS=26  # Alert if no backup in 26 hours

# Get latest backup timestamp
LATEST=$(geode backup --dest "$BUCKET" --list | \
    head -2 | \
    tail -1 | \
    awk '{print $4" "$5}')

LATEST_EPOCH=$(date -d "$LATEST" +%s)
NOW_EPOCH=$(date +%s)
AGE_HOURS=$(( (NOW_EPOCH - LATEST_EPOCH) / 3600 ))

if [ $AGE_HOURS -gt $MAX_AGE_HOURS ]; then
    echo "WARNING: Last backup is ${AGE_HOURS} hours old (max: ${MAX_AGE_HOURS})" | \
        mail -s "Geode Backup Alert" "$ALERT_EMAIL"
    exit 1
fi

echo "OK: Last backup is ${AGE_HOURS} hours old"
exit 0

# Run hourly
# 0 * * * * /usr/local/bin/geode-backup-monitor.sh
```

### Prometheus Metrics

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'geode-backups'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'

# Exposed metrics:
# geode_backup_last_success_timestamp
# geode_backup_duration_seconds
# geode_backup_size_bytes
# geode_backup_age_hours
```

### Alert Rules

```yaml
# alerts.yml
groups:
  - name: geode_backups
    rules:
      - alert: BackupTooOld
        expr: geode_backup_age_hours > 26
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Geode backup is too old"
          description: "Last backup is {{ $value }} hours old (max: 26)"

      - alert: BackupFailed
        expr: increase(geode_backup_failures_total[1h]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Geode backup failed"
          description: "{{ $value }} backup failures in last hour"

      - alert: BackupSlowDuration
        expr: geode_backup_duration_seconds > 600
        labels:
          severity: warning
        annotations:
          summary: "Geode backup duration exceeded threshold"
          description: "Backup took {{ $value }}s (max: 600s)"
```

## Best Practices

### Backup Strategy

**3-2-1 Rule**:
- **3** copies of data (production + 2 backups)
- **2** different storage types (local + cloud)
- **1** offsite copy (different region/provider)

**Backup Schedule**:
```
Full backup:         Weekly (Sunday 2 AM)
Incremental backups: Daily (Monday-Saturday 2 AM)
WAL archival:        Continuous (every 5 minutes)
Retention:           90 days
```

### Testing Requirements

**Monthly DR Tests**:
- Full restore to test environment
- Verify data integrity
- Measure RTO (should be < 5 minutes)
- Test PITR accuracy

**Quarterly Full DR Drills**:
- Complete failover simulation
- Document recovery procedures
- Update runbooks
- Train operations team

### Security

**Encryption**:
```yaml
backup:
  s3:
    encryption: true  # Server-side encryption (AES-256)
    sse_kms_key_id: 'arn:aws:kms:us-east-1:123456789:key/...'  # Optional KMS
```

**Access Control**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::123456789:user/geode-backup"},
      "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::geode-backups/*",
        "arn:aws:s3:::geode-backups"
      ]
    }
  ]
}
```

### Performance Optimization

**Compression**:
- Use gzip for general workloads (good compression, fast)
- Use zstd for better compression (requires more CPU)
- Disable for pre-compressed data

**Parallel Uploads**:
```bash
# Configure parallel uploads
export AWS_MAX_CONCURRENT_REQUESTS=10
export AWS_MAX_BANDWIDTH=100MB/s
```

**Incremental Strategy**:
- Reduces backup time by 80-90%
- Lower network bandwidth usage
- Faster recovery for recent data

## Related Documentation

- **[Migration Guide](/docs/guides/migration-guide/)** - Backup and restore procedures
- **[Server Configuration](/docs/configuration/server-configuration/)** - Backup configuration options
- **[Troubleshooting Guide](/docs/guides/troubleshooting/)** - Backup troubleshooting
- **[Disaster Recovery](/docs/ops/disaster-recovery/)** - Complete DR procedures

## Summary

Automated backup implementation checklist:

✅ **Configure S3 credentials** - Set up cloud storage access
✅ **Enable automated backups** - Schedule full + incremental backups
✅ **Test restore procedures** - Verify backups work (monthly)
✅ **Implement monitoring** - Alert on backup failures
✅ **Document procedures** - Maintain DR runbooks
✅ **Practice DR drills** - Regular failover testing

**Key Metrics**:
- RTO: < 5 minutes (full restore)
- RPO: < 15 minutes (with incremental backups)
- Backup frequency: Daily
- Retention: 90 days
- Test frequency: Monthly

Automated backups ensure business continuity and data protection for production Geode deployments.
