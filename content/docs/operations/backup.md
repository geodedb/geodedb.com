---
title: "Backup Procedures"
description: "Comprehensive backup procedures for Geode including full backups, incremental backups, S3 cloud storage, point-in-time recovery, and automated backup strategies"
weight: 10
tags:
  - operations
  - backup
  - recovery
  - s3
  - pitr
categories:
  - operations
keywords:
  - backup
  - restore
  - recovery
  - S3
  - point-in-time recovery
  - incremental backup
  - disaster recovery
  - data protection
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Backup Procedures

This guide covers comprehensive backup strategies for Geode, including full backups, incremental backups, cloud storage integration, point-in-time recovery, and automated backup procedures.

## Overview

Geode provides robust backup capabilities for data protection:

| Feature | Description |
|---------|-------------|
| Full Backups | Complete database snapshot |
| Incremental Backups | Changes since last full backup |
| Point-in-Time Recovery | Restore to specific timestamp |
| Cloud Storage | S3-compatible object storage |
| Compression | gzip compression for space efficiency |
| Encryption | Server-side encryption for security |
| Verification | Integrity checking with checksums |

**Key Metrics**:
- **RTO (Recovery Time Objective)**: < 5 minutes for full restore
- **RPO (Recovery Point Objective)**: < 15 minutes with incremental backups

## Backup Types

### Full Backup

A complete snapshot of the entire database:

```bash
# Create full backup to local directory
geode backup \
  --dest /backups/geode \
  --mode full \
  --compression gzip

# Create full backup to S3
geode backup \
  --dest s3://my-bucket/geode-backups \
  --mode full \
  --compression gzip

# Output:
# Backup started: 2026-01-28 02:00:00 UTC
# Backup ID: 1738012345
# Mode: full
# Compressing data...
# Uploading to destination...
# Backup completed successfully
# Size: 2.3 GB (compressed from 5.1 GB)
# Duration: 45s
# Checksum: sha256:abc123...
```

**Use Cases**:
- Initial backup for new deployment
- Weekly baseline backup
- Before major upgrades or changes
- Archival purposes

### Incremental Backup

Only changes since the last full backup:

```bash
# Create incremental backup
geode backup \
  --dest s3://my-bucket/geode-backups \
  --mode incremental \
  --parent 1738012345  # Reference to full backup

# Output:
# Incremental backup started
# Parent backup: 1738012345 (2026-01-28 02:00:00 UTC)
# Backup ID: 1738098745
# Scanning for changes...
# Changes detected: 156 MB
# Compressing data...
# Uploading...
# Backup completed successfully
# Size: 45 MB (compressed)
# Duration: 8s
```

**Benefits**:
- 80-90% faster than full backups
- Lower storage costs
- Reduced network bandwidth
- Faster backup windows

### Continuous WAL Archiving

Archive Write-Ahead Log segments for point-in-time recovery:

```yaml
# geode.yaml
backup:
  wal_archiving:
    enabled: true
    destination: s3://my-bucket/geode-wal
    interval: 5m               # Archive every 5 minutes
    compression: gzip
    retention_hours: 168       # 7 days of WAL
```

**Benefits**:
- RPO < 5 minutes
- Enables PITR to any point
- Continuous protection

## S3 Cloud Storage

### AWS S3 Configuration

```bash
# Configure AWS credentials
export AWS_ACCESS_KEY_ID='AKIAIOSFODNN7EXAMPLE'
export AWS_SECRET_ACCESS_KEY='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
export AWS_REGION='us-east-1'

# Create backup
geode backup \
  --dest s3://my-bucket/geode-backups \
  --mode full
```

### S3-Compatible Storage

**MinIO**:
```bash
export AWS_ACCESS_KEY_ID='minio-access-key'
export AWS_SECRET_ACCESS_KEY='minio-secret-key'
export AWS_ENDPOINT_URL='https://minio.example.com:9000'
export AWS_REGION='us-east-1'

geode backup --dest s3://geode-backups/production --mode full
```

**Digital Ocean Spaces**:
```bash
export AWS_ACCESS_KEY_ID='DO_SPACES_KEY'
export AWS_SECRET_ACCESS_KEY='DO_SPACES_SECRET'
export AWS_ENDPOINT_URL='https://nyc3.digitaloceanspaces.com'
export AWS_REGION='us-east-1'

geode backup --dest s3://my-space/geode-backups --mode full
```

**Backblaze B2**:
```bash
export AWS_ACCESS_KEY_ID='B2_KEY_ID'
export AWS_SECRET_ACCESS_KEY='B2_APP_KEY'
export AWS_ENDPOINT_URL='https://s3.us-west-002.backblazeb2.com'
export AWS_REGION='us-west-002'

geode backup --dest s3://my-b2-bucket/geode-backups --mode full
```

### Server Configuration

```yaml
# geode.yaml
backup:
  s3:
    enabled: true
    bucket: 'geode-production-backups'
    prefix: 'prod'              # Optional prefix
    region: 'us-east-1'
    endpoint: ''                # Empty for AWS S3
    access_key_id: '${AWS_ACCESS_KEY_ID}'
    secret_access_key: '${AWS_SECRET_ACCESS_KEY}'

    # Storage options
    compression: true           # gzip compression
    encryption: true            # Server-side encryption (SSE-S3)
    storage_class: 'STANDARD_IA'  # Infrequent Access for cost savings

    # Retention
    retention_days: 90          # Auto-delete old backups

    # Performance
    multipart_threshold: 100MB  # Use multipart for files > 100MB
    max_concurrent_uploads: 10  # Parallel upload threads
```

## Backup Commands

### Create Backup

```bash
# Full backup with all options
geode backup \
  --dest s3://bucket/backups \
  --mode full \
  --compression gzip \
  --verify \
  --retention-days 90 \
  --label "pre-upgrade-backup"

# Incremental backup
geode backup \
  --dest s3://bucket/backups \
  --mode incremental \
  --parent <backup-id>
```

### List Backups

```bash
geode backup --dest s3://bucket/backups --list

# Output:
# Backup ID       Type          Size      Timestamp            Status    Label
# 1738012345      full          2.3 GB    2026-01-28 02:00:00  complete  weekly
# 1738098745      incremental   156 MB    2026-01-29 02:00:00  complete  -
# 1738185145      incremental   89 MB     2026-01-30 02:00:00  complete  -
# 1738271545      full          2.4 GB    2026-02-04 02:00:00  complete  weekly

# Filter by type
geode backup --dest s3://bucket/backups --list --type full

# Filter by date range
geode backup --dest s3://bucket/backups --list \
  --since "2026-01-01" \
  --until "2026-01-31"
```

### Verify Backup

```bash
# Verify backup integrity
geode backup \
  --dest s3://bucket/backups \
  --verify \
  --backup-id 1738012345

# Output:
# Verifying backup 1738012345...
# Downloading metadata...
# Checking file integrity (SHA256)...
# [OK] manifest.json
# [OK] data/nodes.db
# [OK] data/edges.db
# [OK] data/indexes/btree_001.idx
# [OK] data/indexes/hash_001.idx
# [OK] wal/segment_001.wal
# [OK] wal/segment_002.wal
#
# Verification Summary:
# Total files: 127
# Verified: 127
# Failed: 0
# Status: VALID
```

### Delete Backup

```bash
# Delete specific backup
geode backup \
  --dest s3://bucket/backups \
  --delete \
  --backup-id 1738012345

# Prune old backups
geode backup \
  --dest s3://bucket/backups \
  --prune \
  --older-than-days 90
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
  --source s3://bucket/backups \
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

Restore to a specific timestamp:

```bash
# Restore to specific point in time
geode restore \
  --source s3://bucket/backups \
  --backup-id 1738012345 \
  --target /var/lib/geode/data \
  --pitr-timestamp "2026-01-28 10:30:00"

# Output:
# Restoring base backup 1738012345...
# Base backup restored: 2026-01-28 02:00:00
#
# Applying WAL segments...
# Segment: wal_000001.gz (02:00:00 - 02:05:00)
# Segment: wal_000002.gz (02:05:00 - 02:10:00)
# ...
# Segment: wal_000102.gz (10:25:00 - 10:30:00)
#
# Stopping replay at: 2026-01-28 10:30:00
# Recovery complete
# Last transaction: txn_1738012345678
```

### Incremental Restore

Restore chain of incremental backups:

```bash
# Restore full + all incremental backups
geode restore \
  --source s3://bucket/backups \
  --backup-id 1738271545 \
  --target /var/lib/geode/data \
  --include-incrementals

# Output:
# Backup chain detected:
# 1. 1738012345 (full, 2026-01-28 02:00:00)
# 2. 1738098745 (incremental, 2026-01-29 02:00:00)
# 3. 1738185145 (incremental, 2026-01-30 02:00:00)
# 4. 1738271545 (incremental, 2026-01-31 02:00:00)
#
# Restoring base backup...
# Applying incremental 1738098745...
# Applying incremental 1738185145...
# Applying incremental 1738271545...
# Restore complete
```

## Automated Backup

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

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Error handler
handle_error() {
    log "ERROR: Backup failed at line $1"
    echo "Geode backup failed. Check $LOG_FILE" | \
        mail -s "[ALERT] Geode Backup Failure" "$ALERT_EMAIL"
    exit 1
}

trap 'handle_error $LINENO' ERR

log "=== Starting backup ==="

# Determine backup type
DOW=$(date +%u)

if [ "$DOW" -eq 7 ]; then
    # Full backup on Sunday
    log "Creating full backup (Sunday)"
    BACKUP_ID=$(geode backup \
        --dest "$BUCKET" \
        --mode full \
        --compression gzip \
        --verify \
        --label "weekly-$(date +%Y%m%d)" 2>&1 | \
        grep "Backup ID" | awk '{print $3}')

    echo "$BACKUP_ID" > /var/lib/geode/last-full-backup
    log "Full backup completed: $BACKUP_ID"
else
    # Incremental backup on other days
    log "Creating incremental backup"
    PARENT=$(cat /var/lib/geode/last-full-backup)

    BACKUP_ID=$(geode backup \
        --dest "$BUCKET" \
        --mode incremental \
        --parent "$PARENT" \
        --compression gzip \
        --verify 2>&1 | \
        grep "Backup ID" | awk '{print $3}')

    log "Incremental backup completed: $BACKUP_ID"
fi

# Prune old backups
log "Pruning backups older than $RETENTION_DAYS days"
geode backup \
    --dest "$BUCKET" \
    --prune \
    --older-than-days "$RETENTION_DAYS" >> "$LOG_FILE" 2>&1

log "=== Backup completed successfully ==="

# Send success notification
echo "Backup completed: $BACKUP_ID" | \
    mail -s "[OK] Geode Backup Success" "$ALERT_EMAIL"
```

### Cron Schedule

```bash
# Install backup script
sudo cp geode-backup.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/geode-backup.sh

# Add to crontab
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /usr/local/bin/geode-backup.sh >> /var/log/geode/backup-cron.log 2>&1
```

### Systemd Timer

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
OnCalendar=*-*-* 02:00:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

```bash
# Enable timer
sudo systemctl daemon-reload
sudo systemctl enable geode-backup.timer
sudo systemctl start geode-backup.timer

# Check status
sudo systemctl list-timers geode-backup.timer
```

## Backup Strategy

### 3-2-1 Rule

- **3** copies of data (production + 2 backups)
- **2** different storage types (local + cloud)
- **1** offsite copy (different region)

### Recommended Schedule

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Full | Weekly (Sunday) | 90 days | S3 Standard-IA |
| Incremental | Daily | 30 days | S3 Standard |
| WAL Archive | Every 5 min | 7 days | S3 Standard |
| Monthly Archive | Monthly | 1 year | S3 Glacier |

### Configuration Example

```yaml
# geode.yaml - Complete backup configuration
backup:
  # S3 storage
  s3:
    enabled: true
    bucket: 'geode-backups'
    prefix: 'production'
    region: 'us-east-1'
    encryption: true
    storage_class: 'STANDARD_IA'

  # Automated schedule
  schedule:
    enabled: true
    full_backup: '0 2 * * 0'      # Sunday 2 AM
    incremental_backup: '0 2 * * 1-6'  # Mon-Sat 2 AM
    retention_days: 90

  # WAL archiving for PITR
  wal_archiving:
    enabled: true
    destination: s3://geode-backups/wal
    interval: 5m
    retention_hours: 168

  # Verification
  verify:
    enabled: true
    after_backup: true
    weekly_full_verify: true

  # Notifications
  notifications:
    email:
      enabled: true
      recipients: ['ops@example.com']
      on_success: false
      on_failure: true
    webhook:
      enabled: true
      url: 'https://hooks.slack.com/...'
```

## Monitoring Backups

### Prometheus Metrics

```yaml
# Exposed backup metrics
geode_backup_last_success_timestamp
geode_backup_last_failure_timestamp
geode_backup_duration_seconds
geode_backup_size_bytes
geode_backup_age_hours
geode_backup_total{status="success|failure"}
```

### Alert Rules

```yaml
# prometheus/alerts.yml
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
          description: "Last backup is {{ $value }} hours old"

      - alert: BackupFailed
        expr: increase(geode_backup_total{status="failure"}[1h]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Geode backup failed"

      - alert: BackupSlow
        expr: geode_backup_duration_seconds > 3600
        labels:
          severity: warning
        annotations:
          summary: "Backup taking longer than expected"
```

### Monitoring Script

```bash
#!/bin/bash
# /usr/local/bin/geode-backup-monitor.sh

BUCKET="s3://geode-backups/production"
MAX_AGE_HOURS=26

# Get latest backup
LATEST=$(geode backup --dest "$BUCKET" --list --format json | \
    jq -r '.backups[0].timestamp')

LATEST_EPOCH=$(date -d "$LATEST" +%s)
NOW_EPOCH=$(date +%s)
AGE_HOURS=$(( (NOW_EPOCH - LATEST_EPOCH) / 3600 ))

if [ $AGE_HOURS -gt $MAX_AGE_HOURS ]; then
    echo "CRITICAL: Backup is $AGE_HOURS hours old"
    exit 2
fi

echo "OK: Backup is $AGE_HOURS hours old"
exit 0
```

## Best Practices

### Backup Best Practices

1. **Test restores regularly**: Monthly restore verification
2. **Encrypt backups**: Enable server-side encryption
3. **Use compression**: Reduce storage costs and transfer time
4. **Verify integrity**: Check backups after creation
5. **Monitor backup age**: Alert if backup older than 26 hours
6. **Document procedures**: Maintain runbooks for restore

### Storage Best Practices

1. **Use appropriate storage class**: Standard-IA for backups
2. **Enable versioning**: Protect against accidental deletion
3. **Configure lifecycle policies**: Automatic transition to Glacier
4. **Cross-region replication**: DR copy in different region
5. **Set retention policies**: Auto-delete old backups

### Security Best Practices

1. **Encrypt at rest**: SSE-S3 or SSE-KMS
2. **Encrypt in transit**: HTTPS for S3 access
3. **IAM least privilege**: Minimal permissions for backup
4. **Audit access**: Enable S3 access logging
5. **Separate backup credentials**: Don't use admin credentials

## Troubleshooting

### Backup Fails with Timeout

```bash
# Increase timeout
export GEODE_BACKUP_TIMEOUT_MS=600000  # 10 minutes

# Use incremental backups for large datasets
geode backup --mode incremental --parent <id>
```

### S3 Permission Denied

```bash
# Test S3 access
aws s3 ls s3://my-bucket/

# Check IAM policy has required permissions:
# - s3:PutObject
# - s3:GetObject
# - s3:ListBucket
# - s3:DeleteObject (for pruning)
```

### Restore Fails with Corruption

```bash
# Verify backup integrity
geode backup --verify --backup-id <id>

# Try previous backup
geode backup --list
geode restore --backup-id <previous-id>
```

### Slow Backup Performance

```bash
# Increase parallel uploads
export AWS_MAX_CONCURRENT_REQUESTS=20

# Use faster compression
geode backup --compression lz4

# Check network bandwidth
iperf3 -c s3.amazonaws.com -p 443
```

## Related Documentation

- **[Disaster Recovery](/docs/operations/disaster-recovery/)** - Complete DR procedures
- **[Monitoring](/docs/operations/monitoring/)** - Backup monitoring setup
- **[Migration Guide](/docs/guides/migration-guide/)** - Backup-based migration
- **[Backup Automation](/docs/guides/backup-automation/)** - Advanced automation
