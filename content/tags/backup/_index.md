---
title: "Backup and Recovery"
description: "Comprehensive guide to Geode backup strategies, recovery procedures, disaster planning, and data protection best practices for production graph databases."
keywords:
  - backup
  - recovery
  - disaster recovery
  - data protection
  - Geode
  - graph database
  - database backup
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/backup/"
    noindex: false
---

# Backup and Recovery

Database backup and recovery are critical operations for protecting your Geode graph data against hardware failures, software bugs, human errors, and disaster scenarios. Geode provides enterprise-grade backup capabilities designed for production workloads with minimal performance impact and point-in-time recovery guarantees.

## Introduction to Geode Backup

Geode implements a comprehensive backup strategy that balances data protection, performance, and operational simplicity. The system supports multiple backup methods, each optimized for different scenarios and recovery time objectives (RTO) and recovery point objectives (RPO).

Key characteristics of Geode's backup system include transactional consistency through MVCC (Multi-Version Concurrency Control), incremental backup support via the Write-Ahead Log (WAL), online backup operations with zero downtime, point-in-time recovery capabilities, and automatic verification of backup integrity.

The backup architecture integrates deeply with Geode's storage engine, ensuring that backups capture a consistent snapshot of the graph database state without blocking concurrent read or write operations.

## Backup Methods

### Full Database Backup

Full backups capture the complete state of your Geode database at a specific point in time. This method creates a self-contained backup that can be restored independently without requiring any other backup files.

```bash
# Create a full backup
geode backup create --type=full --output=/backups/geode-full-$(date +%Y%m%d).tar.gz

# With compression
geode backup create --type=full --compress=zstd --output=/backups/geode-full.tar.zst

# Verify backup integrity
geode backup verify /backups/geode-full-20260124.tar.gz
```

Full backups are ideal for establishing baseline backups, disaster recovery scenarios, migrating databases between environments, and creating development or testing databases from production snapshots.

### Incremental Backup

Incremental backups capture only the changes made since the last backup, significantly reducing backup time and storage requirements for active databases.

```bash
# Create incremental backup
geode backup create --type=incremental --base=/backups/geode-full.tar.gz \
  --output=/backups/geode-incr-$(date +%Y%m%d-%H%M%S).tar.gz

# Chain multiple incrementals
geode backup create --type=incremental \
  --base=/backups/geode-full.tar.gz \
  --previous=/backups/geode-incr-20260124-120000.tar.gz \
  --output=/backups/geode-incr-20260124-180000.tar.gz
```

Geode's incremental backups leverage the Write-Ahead Log (WAL) to identify changed data efficiently, enabling frequent backups with minimal overhead.

### Continuous Archiving with WAL

For databases requiring minimal data loss in disaster scenarios, Geode supports continuous WAL archiving, providing near-zero RPO.

```bash
# Enable WAL archiving
geode config set wal.archive.enabled=true
geode config set wal.archive.directory=/wal-archive
geode config set wal.archive.compression=zstd

# Restore with WAL replay
geode restore --backup=/backups/geode-full.tar.gz \
  --wal-archive=/wal-archive \
  --recovery-target-time="2026-01-24 14:30:00"
```

WAL archiving enables point-in-time recovery to any moment between backups, supports streaming replication for standby servers, and provides audit trails for compliance requirements.

## Backup Strategies

### Production Backup Schedule

A comprehensive backup strategy combines multiple backup types to balance protection and resource utilization:

```bash
# Daily full backup (off-peak hours)
0 2 * * * /usr/local/bin/geode backup create --type=full \
  --output=/backups/daily/geode-$(date +\%Y\%m\%d).tar.gz

# Hourly incremental backups
0 * * * * /usr/local/bin/geode backup create --type=incremental \
  --base=/backups/daily/geode-latest.tar.gz \
  --output=/backups/hourly/geode-$(date +\%Y\%m\%d-\%H00).tar.gz

# Continuous WAL archiving
*/5 * * * * /usr/local/bin/geode wal archive --compress=zstd
```

### Retention Policies

Implement retention policies to manage backup storage costs while maintaining adequate recovery options:

```bash
# Configure retention policy
geode backup retention set \
  --full-daily=7 \
  --full-weekly=4 \
  --full-monthly=12 \
  --incremental-hours=168

# Automated cleanup
geode backup cleanup --apply-retention --dry-run=false
```

Typical retention strategies include daily full backups for 7 days, weekly backups for 4 weeks, monthly backups for 12 months, and hourly incrementals for 7 days.

## Recovery Procedures

### Basic Recovery

Restore from a full backup to recover your database to a known good state:

```bash
# Stop the database
geode stop

# Restore from backup
geode restore --backup=/backups/geode-full-20260124.tar.gz \
  --target-directory=/var/lib/geode

# Verify restored data
geode verify --full-scan=true

# Start the database
geode start
```

### Point-in-Time Recovery

Recover your database to a specific moment using base backup and WAL archives:

```bash
# Restore base backup
geode restore --backup=/backups/geode-full-20260124.tar.gz \
  --target-directory=/var/lib/geode

# Apply WAL archives up to target time
geode recover \
  --wal-archive=/wal-archive \
  --recovery-target-time="2026-01-24 14:30:00" \
  --recovery-target-inclusive=false

# Verify recovery point
geode query --execute "SELECT current_timestamp()" --format=table
```

This technique is invaluable for recovering from logical errors like accidental data deletion, rolling back failed migrations or updates, and investigating database state at specific times for auditing.

### Incremental Restore

When restoring from incremental backups, apply them in chronological order:

```bash
# Restore base backup
geode restore --backup=/backups/geode-full-20260120.tar.gz

# Apply incremental backups in order
geode restore --backup=/backups/geode-incr-20260121.tar.gz --incremental
geode restore --backup=/backups/geode-incr-20260122.tar.gz --incremental
geode restore --backup=/backups/geode-incr-20260123.tar.gz --incremental
geode restore --backup=/backups/geode-incr-20260124.tar.gz --incremental

# Automated incremental chain restore
geode restore --backup=/backups/geode-full-20260120.tar.gz \
  --apply-incrementals=/backups/incrementals/ \
  --recovery-target=latest
```

## Online Backup Operations

Geode's MVCC architecture enables consistent backups without blocking database operations:

```gql
-- Query backup status during backup
SELECT backup_id, start_time, progress_percent, estimated_completion
FROM system.active_backups;

-- Monitor backup impact
PROFILE
SELECT COUNT(*) FROM (MATCH (n) RETURN n);
```

Online backups maintain ACID guarantees, support concurrent transactions during backup operations, use snapshot isolation for consistency, and minimize performance impact through efficient I/O scheduling.

## Disaster Recovery Planning

### Multi-Region Backup Strategy

Distribute backups across geographic regions for disaster resilience:

```bash
# Local backup
geode backup create --type=full --output=/local/backups/geode-full.tar.gz

# Replicate to remote regions
aws s3 sync /local/backups/ s3://geode-backups-us-east-1/ --region us-east-1
aws s3 sync /local/backups/ s3://geode-backups-eu-west-1/ --region eu-west-1

# Cloud-native backup
geode backup create --type=full \
  --output=s3://geode-backups/geode-full-$(date +%Y%m%d).tar.gz \
  --storage-class=GLACIER_IR
```

### Recovery Time Objectives

Optimize backup strategies for your recovery time requirements:

- RTO < 15 minutes: Maintain hot standby with streaming replication
- RTO < 1 hour: Keep recent backups on fast local storage
- RTO < 4 hours: Use cloud storage with standard retrieval
- RTO < 24 hours: Archive to cold storage tiers

### Testing Recovery Procedures

Regularly test backup recovery to ensure reliability:

```bash
# Automated recovery testing
#!/bin/bash
BACKUP_FILE="/backups/geode-full-$(date +%Y%m%d).tar.gz"
TEST_DIR="/tmp/geode-recovery-test"

# Create test environment
mkdir -p $TEST_DIR
geode restore --backup=$BACKUP_FILE --target-directory=$TEST_DIR

# Verify restored database
geode --data-dir=$TEST_DIR verify --full-scan=true
geode --data-dir=$TEST_DIR query --execute "SELECT COUNT(*) FROM graph_nodes"

# Cleanup
rm -rf $TEST_DIR
```

## Backup Performance Optimization

### Parallel Backup Operations

Leverage multiple CPU cores for faster backups:

```bash
# Parallel compression
geode backup create --type=full \
  --output=/backups/geode-full.tar.gz \
  --compress=zstd \
  --compress-threads=8 \
  --parallel-workers=4

# Benchmark backup performance
time geode backup create --type=full \
  --output=/dev/null \
  --compress=none \
  --parallel-workers=1

time geode backup create --type=full \
  --output=/dev/null \
  --compress=zstd \
  --parallel-workers=8
```

### I/O Throttling

Limit backup I/O impact on production workloads:

```bash
# Rate-limited backup
geode backup create --type=full \
  --output=/backups/geode-full.tar.gz \
  --io-limit=100MB/s \
  --priority=low

# Adaptive throttling based on load
geode backup create --type=full \
  --output=/backups/geode-full.tar.gz \
  --adaptive-throttling=true \
  --max-cpu-percent=20 \
  --max-io-percent=30
```

## Backup Verification and Integrity

### Automated Verification

Ensure backup integrity with automated checks:

```bash
# Verify backup checksums
geode backup verify /backups/geode-full.tar.gz --verify-checksums

# Test restore in isolated environment
geode backup verify /backups/geode-full.tar.gz --test-restore

# Verify data integrity after restore
geode backup verify /backups/geode-full.tar.gz \
  --test-restore \
  --verify-queries=/etc/geode/verify-queries.gql
```

Example verification queries:

```gql
-- Verify node counts
SELECT COUNT(*) AS node_count FROM (MATCH (n) RETURN n);

-- Verify relationship integrity
SELECT COUNT(*) AS edge_count FROM (MATCH ()-[r]->() RETURN r);

-- Verify critical data
MATCH (u:User)
WHERE u.role = 'admin'
RETURN COUNT(u) AS admin_count;
```

## Best Practices

1. **Backup Schedule**: Implement a 3-2-1 backup strategy (3 copies, 2 different media types, 1 offsite)
2. **Encryption**: Encrypt backups containing sensitive data using strong encryption algorithms
3. **Monitoring**: Monitor backup success rates, backup sizes, and backup duration trends
4. **Documentation**: Document recovery procedures and maintain runbooks for disaster scenarios
5. **Testing**: Test recovery procedures quarterly and after major system changes
6. **Automation**: Automate backup processes to eliminate human error and ensure consistency
7. **Validation**: Validate backup integrity immediately after creation
8. **Retention**: Balance retention requirements with storage costs and compliance needs

## Troubleshooting

### Backup Failures

Common backup issues and solutions:

```bash
# Insufficient disk space
geode backup create --type=full \
  --output=/backups/geode-full.tar.gz \
  --compress=zstd \
  --compress-level=9

# Network timeouts for cloud backups
geode backup create --type=full \
  --output=s3://bucket/backup.tar.gz \
  --retry-attempts=5 \
  --timeout=3600

# Check backup logs
geode logs --filter=backup --level=error --tail=100
```

### Recovery Issues

```bash
# Corrupted backup file
geode backup verify /backups/geode-full.tar.gz --repair

# WAL archive gaps
geode recover \
  --wal-archive=/wal-archive \
  --recovery-target-time="2026-01-24 14:30:00" \
  --skip-missing-wal=true \
  --recovery-target-inclusive=false

# Version compatibility
geode restore --backup=/backups/geode-full.tar.gz \
  --source-version=0.17.0 \
  --target-version=0.18.0 \
  --migrate-schema=true
```

## Related Topics

- [WAL](/tags/wal/) - Write-Ahead Logging for continuous archiving
- [MVCC](/tags/mvcc/) - Multi-Version Concurrency Control for consistent snapshots
- [Server Configuration](/tags/server/) - Server settings for backup operations
- [Data Integrity](/tags/data-integrity/) - Ensuring data consistency and reliability
- [Disaster Recovery](/tags/production/) - Production deployment and disaster planning

## Further Reading

- [Backup Administration Guide](/docs/administration/backup/) - Detailed backup procedures
- [Recovery Procedures](/docs/administration/recovery/) - Step-by-step recovery guides
- [High Availability Architecture](/docs/deployment/high-availability/) - HA configurations
- [Disaster Recovery Planning](/docs/operations/disaster-recovery/) - DR strategies
- [Backup Performance Tuning](/docs/performance/backup-optimization/) - Optimization techniques
