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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

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
  --source-version=0.1.2 \
  --target-version=__GEODE_VERSION__ \
  --migrate-schema=true
```

## Advanced Backup Patterns

### Application-Consistent Backups

Ensure application consistency during backups by coordinating with application state:

```python
# application_consistent_backup.py
async def create_application_consistent_backup():
    # Step 1: Quiesce application writes
    await app.pause_writes()

    # Step 2: Flush pending transactions
    async with geode_client.connection() as tx:
        await tx.begin()
        await tx.execute("CALL dbms.checkpoint()")

    # Step 3: Create backup
    subprocess.run([
        'geode', 'backup', 'create',
        '--type=full',
        '--output=/backups/app-consistent.tar.gz'
    ], check=True)

    # Step 4: Resume application writes
    await app.resume_writes()
```

### Backup Cataloging

Maintain backup metadata for efficient management:

```sql
-- backup_catalog schema
CREATE TABLE backup_catalog (
    backup_id SERIAL PRIMARY KEY,
    backup_type VARCHAR(20),  -- full, incremental, differential
    backup_path TEXT,
    created_at TIMESTAMP,
    size_bytes BIGINT,
    compressed_size_bytes BIGINT,
    checksum VARCHAR(64),
    encryption_enabled BOOLEAN,
    retention_until TIMESTAMP,
    parent_backup_id INTEGER REFERENCES backup_catalog(backup_id),
    status VARCHAR(20),  -- completed, failed, in_progress
    metadata JSONB
);
```

Track backups programmatically:

```python
def register_backup(backup_path, backup_type):
    size = os.path.getsize(backup_path)
    checksum = calculate_sha256(backup_path)

    cursor.execute("""
        INSERT INTO backup_catalog
        (backup_type, backup_path, created_at, size_bytes, checksum, status)
        VALUES (%s, %s, NOW(), %s, %s, 'completed')
        RETURNING backup_id
    """, (backup_type, backup_path, size, checksum))

    return cursor.fetchone()[0]
```

### Backup Compliance Reporting

Generate compliance reports for auditors:

```python
def generate_backup_compliance_report():
    """Generate monthly backup compliance report"""
    report = {
        'period': datetime.now().strftime('%Y-%m'),
        'metrics': {}
    }

    # Daily backup success rate
    cursor.execute("""
        SELECT
            DATE(created_at) as backup_date,
            COUNT(*) FILTER (WHERE status = 'completed') as successful,
            COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM backup_catalog
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY backup_date
    """)

    report['daily_backups'] = cursor.fetchall()

    # Verify backups exist for all required days
    cursor.execute("""
        SELECT COUNT(DISTINCT DATE(created_at))
        FROM backup_catalog
        WHERE created_at > NOW() - INTERVAL '30 days'
          AND status = 'completed'
    """)

    days_with_backups = cursor.fetchone()[0]
    report['metrics']['backup_coverage'] = f"{days_with_backups}/30 days"

    # Average backup size and duration
    cursor.execute("""
        SELECT
            AVG(size_bytes) as avg_size,
            AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration
        FROM backup_catalog
        WHERE created_at > NOW() - INTERVAL '30 days'
    """)

    stats = cursor.fetchone()
    report['metrics']['avg_backup_size_gb'] = f"{stats[0] / 1e9:.2f}"
    report['metrics']['avg_duration_minutes'] = f"{stats[1] / 60:.1f}"

    return report
```

### Incremental Forever Strategy

Implement "incremental forever" backup approach:

```bash
#!/bin/bash
# incremental_forever.sh

BACKUP_DIR=/backups/incremental-forever

# Create synthetic full backup weekly by merging incrementals
if [ $(date +%u) -eq 7 ]; then
    echo "Creating synthetic full backup..."

    # Get all incrementals from past week
    INCREMENTALS=$(find $BACKUP_DIR -name "incr-*.tar.gz" -mtime -7 | sort)

    # Merge into synthetic full
    geode backup merge \
        --incrementals $INCREMENTALS \
        --output $BACKUP_DIR/synthetic-full-$(date +%Y%m%d).tar.gz

    # Delete old incrementals
    find $BACKUP_DIR -name "incr-*.tar.gz" -mtime +7 -delete
fi

# Always create incremental
geode backup create --type=incremental \
    --base=$BACKUP_DIR/synthetic-full-latest.tar.gz \
    --output=$BACKUP_DIR/incr-$(date +%Y%m%d-%H%M%S).tar.gz
```

Benefits: Reduces backup window, optimizes storage, simplifies retention management.

## Disaster Recovery Scenarios

### Complete Data Center Loss

Recover from total data center failure:

```bash
#!/bin/bash
# disaster_recovery_full.sh

DR_REGION="us-west-2"
PRIMARY_REGION="us-east-1"

echo "Initiating disaster recovery for complete DC loss..."

# 1. Provision infrastructure in DR region
cd terraform/dr-region
terraform apply -auto-approve -var="region=$DR_REGION"

# 2. Retrieve latest backup from off-site storage
aws s3 cp \
    "s3://geode-backups-$PRIMARY_REGION/latest-full.tar.gz" \
    /tmp/recovery-backup.tar.gz \
    --region $PRIMARY_REGION

# 3. Deploy Geode instances
DR_INSTANCES=$(terraform output -json instance_ips | jq -r '.[]')

# 4. Restore to all instances in parallel
for instance in $DR_INSTANCES; do
    (
        scp /tmp/recovery-backup.tar.gz geode@$instance:/tmp/
        ssh geode@$instance "geode restore --backup=/tmp/recovery-backup.tar.gz"
    ) &
done
wait

# 5. Verify data integrity
geode shell --host $DR_INSTANCES[0] -c "
    MATCH (n) RETURN COUNT(n) AS node_count;
    MATCH ()-[r]->() RETURN COUNT(r) AS rel_count;
"

# 6. Update DNS for failover
aws route53 change-resource-record-sets \
    --hosted-zone-id Z123456 \
    --change-batch file://dns-failover.json

echo "DR complete. Database active in $DR_REGION"
```

### Ransomware Recovery

Recover from ransomware attack:

```bash
# Detect ransomware early
geode backup verify /backups/geode-full-20260124.tar.gz

# If current data is compromised, restore to pre-attack state
geode restore \
    --backup=/backups/geode-full-20260122.tar.gz \
    --recovery-target-time="2026-01-22 23:59:59" \
    --verify-integrity=true

# Apply WAL up to attack time (discard compromised transactions)
geode recover \
    --wal-archive=s3://wal-archive/ \
    --recovery-target-time="2026-01-22 23:55:00" \
    --skip-corrupted-wal=true
```

### Logical Data Corruption

Recover from application bug that corrupted data:

```bash
# Identify when corruption occurred
geode query -c "
    SELECT MIN(modified_at) as corruption_start
    FROM audit_log
    WHERE data_integrity_check = false
" > /tmp/corruption_time.txt

# Restore to point before corruption
RECOVERY_TIME=$(cat /tmp/corruption_time.txt | awk '{print $1}')

geode restore \
    --backup=/backups/closest-backup-before-corruption.tar.gz

geode recover \
    --wal-archive=/wal-archive \
    --recovery-target-time="$RECOVERY_TIME" \
    --recovery-target-inclusive=false
```

## Backup Best Practices Summary

1. **Implement 3-2-1 rule**: 3 copies, 2 different media, 1 off-site
2. **Test restores quarterly**: Ensure backups actually work
3. **Monitor backup health**: Automate checks for freshness and integrity
4. **Encrypt backups**: Protect sensitive data at rest
5. **Document procedures**: Maintain runbooks for disaster recovery
6. **Automate everything**: Eliminate human error
7. **Verify after creation**: Check checksums and test-restore samples
8. **Set retention policies**: Balance compliance needs with storage costs
9. **Separate backup credentials**: Don't use same account as production
10. **Practice disaster recovery**: Regular drills ensure team readiness

## Related Topics

- [Server Configuration](/tags/server/) - Server settings for backup operations
- [Monitoring](/tags/monitoring/) - Backup monitoring and alerting
- [Encryption](/tags/encryption/) - Backup encryption and access control

## Further Reading

- [Backup Automation Guide](/docs/guides/backup-automation/) - Detailed backup procedures
- [Deployment Patterns](/docs/deployment/deployment-patterns/) - Production deployment strategies
