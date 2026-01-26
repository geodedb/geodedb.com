---
title: "Tag: Write-Ahead Logging (WAL)"
description: "Explore Geode documentation tagged with wal. Learn about wal features, best practices, and implementation details."
keywords:
  - wal
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/wal/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Documentation tagged with **Write-Ahead Logging (WAL)** in the Geode graph database. WAL is a fundamental technique for ensuring data durability and enabling crash recovery—every database modification is recorded in a sequential log file before being applied to the database itself.

## Introduction to Write-Ahead Logging

Write-Ahead Logging (WAL) is the cornerstone of database durability. The principle is elegantly simple: before modifying any data in the database, first write a description of the change to a sequential log file on persistent storage. This ensures that even if the system crashes mid-operation, the database can recover to a consistent state by replaying the log.

WAL has been a standard component of database systems since the 1970s, used by virtually every production database including PostgreSQL, Oracle, MySQL, and now Geode. The technique solves a fundamental problem: random writes to database pages are expensive (requiring disk seeks and scattered I/O), but sequential writes to a log file are fast (leveraging sequential disk throughput).

By committing transactions via WAL, Geode achieves both:
- **Fast commits**: Write sequential log records instead of scattered database pages
- **Crash recovery**: Replay the WAL to reconstruct lost in-memory state
- **Point-in-time recovery**: Restore database to any historical moment
- **Replication**: Ship WAL records to replicas for synchronization

Geode's WAL implementation provides full ACID durability guarantees while maintaining high write throughput—critical for production graph workloads.

## Core WAL Concepts

### The WAL Protocol

The fundamental WAL protocol consists of three rules:

1. **Write-Ahead Rule**: Log records must reach persistent storage before data pages
2. **Force-Log-at-Commit**: All log records for a transaction must be durable before commit returns
3. **No-Force Policy**: Data pages may remain in memory; only WAL must be forced to disk

These rules ensure that:
- Committed transactions survive crashes (durability)
- Uncommitted transactions can be rolled back (atomicity)
- The database can be reconstructed from the WAL (recoverability)

### Log Sequence Numbers (LSN)

Every WAL record is assigned a monotonically increasing Log Sequence Number (LSN). LSNs serve multiple purposes:

```
LSN: 64-bit integer representing log position
Example: 0x0000000123456789

Components:
- High 32 bits: WAL file number
- Low 32 bits: Offset within file
```

LSNs enable:
- Ordering of operations
- Tracking which records have been applied
- Identifying the recovery start point
- Coordinating replication

### WAL Record Structure

Each WAL record contains:

```
WAL Record Format:
[LSN][Transaction ID][Operation Type][Before Image][After Image][Checksum]

Example:
[0x123456][tx-98765][UPDATE_NODE][{name: "Alice"}][{name: "Alice", age: 30}][crc32: 0xABCD]
```

Components:
- **LSN**: Unique identifier for this record
- **Transaction ID**: Which transaction generated this operation
- **Operation Type**: INSERT, UPDATE, DELETE, BEGIN, COMMIT, ABORT
- **Before Image**: Data state before modification (for undo)
- **After Image**: Data state after modification (for redo)
- **Checksum**: Integrity verification

### Checkpointing

Periodically, Geode performs a checkpoint:

1. Flush all dirty pages to disk
2. Write a checkpoint record to WAL
3. Record the LSN in a known location

During recovery, Geode only needs to replay WAL records after the last checkpoint, dramatically reducing recovery time.

## How WAL Works in Geode

### Write Path

When a transaction modifies data:

1. **Generate WAL Record**: Create log record describing the change
2. **Append to WAL Buffer**: Write to in-memory buffer (fast)
3. **Modify In-Memory Data**: Update in-memory database structures
4. **Flush WAL on Commit**: Call `fsync()` to ensure WAL reaches disk
5. **Return Success**: Commit completes only after WAL is durable

```gql
BEGIN TRANSACTION;
MATCH (p:Person {id: 123})
SET p.age = 30;
-- At this point, WAL record exists in memory buffer

COMMIT;
-- fsync() forces WAL to disk, then commit returns
```

### Crash Recovery

On startup after a crash, Geode performs WAL replay:

1. **Find Last Checkpoint**: Read checkpoint LSN from control file
2. **Read WAL**: Start reading from checkpoint LSN
3. **Identify Transactions**: Separate committed from uncommitted transactions
4. **Redo Pass**: Replay committed transactions to reconstruct state
5. **Undo Pass**: Roll back uncommitted transactions
6. **Resume Operation**: Database is now consistent and ready

```
Recovery Example:
Checkpoint at LSN 1000
Crash at LSN 1500

WAL Records:
[1001][tx-1][BEGIN]
[1002][tx-1][INSERT Node(Person, id=1)]
[1003][tx-1][COMMIT]
[1004][tx-2][BEGIN]
[1005][tx-2][INSERT Node(Person, id=2)]
[CRASH - no commit for tx-2]

Recovery:
- Replay tx-1: INSERT Node(Person, id=1) - COMMITTED
- Rollback tx-2: Undo INSERT Node(Person, id=2) - UNCOMMITTED
```

### WAL Archival and Rotation

WAL files grow continuously. Geode manages this through:

**WAL Rotation**: When a WAL file reaches a size limit (default 64MB), start a new file

```
wal/
├── 00000001.wal (complete, archived)
├── 00000002.wal (complete, archived)
├── 00000003.wal (complete, archived)
└── 00000004.wal (current, active)
```

**WAL Archival**: Old WAL files are moved to archive storage for:
- Point-in-time recovery
- Replication to new replicas
- Audit and compliance

**WAL Recycling**: After checkpoint, archived WAL files older than the retention period are deleted or recycled.

### Integration with MVCC

WAL works hand-in-hand with Multi-Version Concurrency Control:

- **Before Images**: WAL records contain old version data for rollback
- **After Images**: WAL records contain new version data for redo
- **Version Chains**: WAL enables reconstruction of version chains after crash
- **Garbage Collection**: WAL archival coordinated with MVCC GC

## Use Cases and Benefits

### Crash Recovery

WAL enables automatic recovery from crashes:

```bash
# Server crashes during transaction
$ geode serve
[CRASH - power failure]

# Restart automatically recovers
$ geode serve
[2026-01-24 10:00:00] Starting crash recovery...
[2026-01-24 10:00:01] Reading WAL from LSN 123456789
[2026-01-24 10:00:02] Replaying 1523 committed transactions
[2026-01-24 10:00:03] Rolling back 2 uncommitted transactions
[2026-01-24 10:00:04] Recovery complete
[2026-01-24 10:00:05] Database ready
```

### Point-in-Time Recovery

WAL enables time-travel recovery:

```bash
# Restore database to specific timestamp
$ geode restore --time "2026-01-24T09:00:00Z"
[2026-01-24 10:05:00] Restoring from checkpoint at 08:00:00
[2026-01-24 10:05:01] Replaying WAL up to 09:00:00
[2026-01-24 10:05:02] Restored to 2026-01-24T09:00:00Z
```

This is invaluable for:
- Recovering from accidental data deletion
- Investigating historical states for debugging
- Compliance and audit requirements

### Replication

WAL enables efficient replication:

```
Primary Server                 Replica Server
    |                                |
    |----[WAL Record 1001]---------->|
    |----[WAL Record 1002]---------->|
    |----[WAL Record 1003]---------->|
    |                                |
    |                          [Apply WAL]
```

Replicas apply WAL records to stay synchronized with the primary, enabling:
- High availability (fail over to replica)
- Read scalability (distribute reads across replicas)
- Geographic distribution (replicas in multiple regions)

### Audit Logging

WAL provides a complete audit trail:

```gql
-- Query WAL for specific transaction
CALL dbms.audit.wal.query({
  transaction_id: "tx-12345",
  time_range: {start: "2026-01-24T00:00:00Z", end: "2026-01-24T23:59:59Z"}
}) YIELD lsn, operation, before_image, after_image, timestamp
RETURN lsn, operation, before_image, after_image, timestamp;
```

This supports:
- Compliance (SOC 2, HIPAA, GDPR)
- Forensic investigation
- Change tracking

## Best Practices

### WAL Storage Configuration

1. **Use dedicated storage**: Place WAL on separate disks from data files
   ```bash
   $ geode serve --wal-dir /mnt/wal-ssd --data-dir /mnt/data-hdd
   ```

2. **Use SSDs for WAL**: Sequential writes benefit from SSD latency
   ```
   WAL on HDD: ~10ms fsync latency → 100 commits/sec
   WAL on SSD: ~0.1ms fsync latency → 10,000 commits/sec
   ```

3. **RAID configuration**: Use RAID 1 or RAID 10 for WAL reliability

### Checkpoint Tuning

Configure checkpoint frequency to balance:
- **Recovery time**: More frequent checkpoints → faster recovery
- **Performance**: Less frequent checkpoints → less I/O overhead

```yaml
# geode.yaml
wal:
  checkpoint_interval: 5m  # Checkpoint every 5 minutes
  checkpoint_timeout: 30s  # Max time for checkpoint
  max_wal_size: 1GB        # Force checkpoint if WAL exceeds 1GB
```

### WAL Archival Strategy

```yaml
# geode.yaml
wal:
  archive_mode: enabled
  archive_command: "cp %p /mnt/wal-archive/%f"
  archive_timeout: 60s
  retention_days: 30
```

Configure archival based on requirements:
- **Compliance**: Long retention (90+ days)
- **Replication**: Keep WAL until all replicas apply it
- **Storage cost**: Balance retention with storage costs

### Monitoring WAL Health

Track critical WAL metrics:

```gql
-- WAL metrics
CALL dbms.monitor.wal.stats()
YIELD current_lsn, checkpoint_lsn, wal_files, wal_size, flush_rate;

-- WAL lag (replication)
CALL dbms.monitor.replication.lag()
YIELD replica, wal_lag_bytes, wal_lag_seconds;

-- Checkpoint statistics
CALL dbms.monitor.checkpoint.stats()
YIELD last_checkpoint, duration, pages_written;
```

Alert on:
- **WAL accumulation**: WAL files growing without bound
- **Slow fsync**: Commit latency increasing
- **Replication lag**: Replicas falling behind

## Troubleshooting

### WAL Disk Full

**Symptom**: Commits fail with "WAL disk full" error
**Cause**: WAL directory ran out of space
**Solution**:
1. Add storage to WAL directory
2. Reduce WAL retention
3. Increase checkpoint frequency
4. Archive old WAL files to cheaper storage

### Slow Commits

**Symptom**: High commit latency
**Cause**: Slow fsync() calls
**Solution**:
1. Move WAL to faster storage (SSD)
2. Check disk I/O contention
3. Tune filesystem mount options (noatime, data=writeback)
4. Consider group commit optimization

### Long Recovery Times

**Symptom**: Database takes minutes to recover after crash
**Cause**: Large amount of WAL to replay
**Solution**:
1. Increase checkpoint frequency
2. Reduce transaction size
3. Add more memory for in-memory buffers
4. Use parallel WAL replay (if available)

### Corrupted WAL

**Symptom**: Recovery fails with checksum mismatch
**Cause**: Disk corruption, partial write, bit flip
**Solution**:
1. Restore from backup
2. Recover to last valid LSN (may lose recent commits)
3. Use WAL archive if available
4. Check hardware (bad disk, bad memory)

## Performance Considerations

### WAL Write Throughput

Optimize WAL write performance:

1. **Batch commits**: Group multiple transactions into single fsync
   ```yaml
   wal:
     group_commit_delay: 10ms  # Wait up to 10ms to batch commits
     group_commit_size: 100     # Or batch up to 100 transactions
   ```

2. **Asynchronous commit**: Trade durability for throughput (use cautiously)
   ```gql
   BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED, COMMIT MODE ASYNC;
   -- Transaction commits without waiting for fsync
   COMMIT;
   ```

3. **WAL compression**: Reduce WAL size with compression
   ```yaml
   wal:
     compression: lz4  # Fast compression algorithm
   ```

### Recovery Performance

Optimize recovery speed:

1. **Parallel replay**: Replay independent transactions concurrently
2. **Incremental checkpoints**: Spread checkpoint I/O over time
3. **Hot standby**: Keep replica always ready for instant failover

## Related Topics

- [ACID Transactions](/tags/acid/) - WAL enables durability
- [Multi-Version Concurrency Control (MVCC)](/tags/mvcc/) - WAL integrates with MVCC
- [Crash Recovery](/docs/recovery/) - Recovery process details
- [Replication](/tags/distributed/) - WAL-based replication
- [Backup and Restore](/docs/backup/) - Using WAL for backups
- [Performance](/tags/performance/) - WAL performance tuning

## Further Reading

- [Durability and Recovery Guide](/docs/recovery/) - Complete recovery documentation
- [Architecture Overview](/docs/architecture/) - WAL in system architecture
- [Replication Guide](/docs/replication/) - WAL streaming replication
- [Performance Tuning](/docs/performance-tuning/) - WAL optimization
- [Monitoring Guide](/docs/monitoring/) - WAL health monitoring

Geode's Write-Ahead Logging implementation provides rock-solid durability guarantees while maintaining high write throughput—essential for production graph workloads where data loss is unacceptable.

## Advanced WAL Features

### Parallel WAL Writing

Geode uses parallel WAL writers for improved throughput:

```
Transaction Commit Pipeline:

Thread 1: Txn A → WAL Buffer → Flush Queue
Thread 2: Txn B → WAL Buffer → Flush Queue
Thread 3: Txn C → WAL Buffer → Flush Queue
                                    ↓
                            WAL Writer Thread
                                    ↓
                              fsync() call
                            (batches A, B, C)
                                    ↓
                            All 3 txns commit

Benefit: Single fsync() commits multiple transactions
Result: 10,000+ commits/sec on NVMe SSD
```

### Group Commit Optimization

Batch commits to amortize fsync() cost:

```yaml
# geode.yaml
wal:
  group_commit:
    enabled: true
    max_delay_ms: 10      # Wait up to 10ms to batch
    max_batch_size: 100   # Or commit when 100 txns queued

# Result:
# - Individual commit latency: 0.1ms (WAL append)
# - Actual fsync() latency: 10ms (once per batch)
# - Effective throughput: 10,000 commits/sec vs 100 commits/sec
```

### WAL Compression

Reduce WAL storage and I/O:

```yaml
wal:
  compression:
    algorithm: lz4  # Fast compression
    level: 1        # Low CPU overhead
    min_size: 1024  # Only compress records >1KB

# Results:
# - 60-80% compression ratio for typical graph operations
# - <5% CPU overhead for compression
# - Reduced network bandwidth for replication
```

### Incremental Checkpointing

Spread checkpoint I/O over time:

```
Traditional Checkpoint:
Time: ────────────[CHECKPOINT]────────────────────
I/O:               ████████████ (burst)

Incremental Checkpoint:
Time: ────────────────────────────────────────────
I/O:               ██ ██ ██ ██ ██ ██ (spread out)

Benefits:
- No I/O spikes
- Consistent query performance
- Faster recovery (shorter WAL replay)
```

Configuration:

```yaml
wal:
  checkpoint:
    mode: incremental
    target_duration: 300s     # Spread over 5 minutes
    max_dirty_pages: 100000   # Trigger at 100k dirty pages
    completion_target: 0.9    # Aim to complete 90% of checkpoint interval
```

## WAL Replication Strategies

### Streaming Replication

Ship WAL records to replicas in real-time:

```
Primary Server                        Replica Server
     │                                      │
     │ [Txn Commit]                         │
     │      ↓                                │
     │ [WAL Write]                           │
     │      ↓                                │
     │ [Stream WAL Record]───────────────>  │
     │                                    [Apply WAL]
     │                                       ↓
     │ <─────────────[ACK]──────────────  [Update State]
     │                                       │
     │ [Commit Txn]                          │
```

Implementation:

```yaml
replication:
  mode: streaming
  sync_mode: async  # or 'sync' for synchronous replication
  max_lag_bytes: 10485760  # 10MB max lag
  max_lag_seconds: 10      # 10 seconds max time lag

  replicas:
    - host: replica1.example.com
      port: 7000
      sync_priority: 1
    - host: replica2.example.com
      port: 7000
      sync_priority: 2
```

### Synchronous vs. Asynchronous Replication

```gql
-- Synchronous replication (wait for replica ACK)
BEGIN TRANSACTION REPLICATION sync;
CREATE (:User {id: 123, name: 'Alice'});
COMMIT;  -- Blocks until replica confirms WAL applied

-- Asynchronous replication (don't wait)
BEGIN TRANSACTION REPLICATION async;
CREATE (:User {id: 456, name: 'Bob'});
COMMIT;  -- Returns immediately, replica applies eventually
```

Trade-offs:

**Synchronous**:
- Pro: Zero data loss on failover
- Pro: Strong consistency across replicas
- Con: Higher commit latency (network round-trip)
- Con: Availability depends on replica health

**Asynchronous**:
- Pro: Low commit latency
- Pro: Primary unaffected by replica failures
- Con: Potential data loss on failover (uncommitted WAL)
- Con: Eventual consistency

### Cascading Replication

Replicate across multiple tiers:

```
      Primary (US-East)
           │
           ├───> Replica 1 (US-East)
           │
           └───> Replica 2 (US-West)
                     │
                     ├───> Replica 3 (EU-West)
                     │
                     └───> Replica 4 (AP-South)

Benefits:
- Reduced load on primary
- Geographic distribution
- Lower cross-region bandwidth
```

## WAL-Based Logical Replication

Replicate specific subsets of data:

```gql
-- Create logical replication slot
CREATE REPLICATION SLOT analytics_slot LOGICAL;

-- Define publication (what to replicate)
CREATE PUBLICATION analytics_pub FOR
  LABELS (User, Order, Product)
  WHERE region = 'us-east';

-- Subscriber consumes filtered WAL stream
SUBSCRIBE TO PUBLICATION analytics_pub
  FROM SLOT analytics_slot;
```

Use cases:
- Replicate subset of data to analytics database
- Multi-tenant replication (one tenant per replica)
- Cross-database replication (Geode → PostgreSQL)

## Disaster Recovery with WAL

### Continuous WAL Archival

```bash
#!/bin/bash
# WAL archival script

# Geode calls this when WAL segment complete
WAL_FILE=$1
WAL_PATH="/var/lib/geode/wal/$WAL_FILE"

# Archive to S3
aws s3 cp "$WAL_PATH" "s3://geode-wal-archive/$(date +%Y%m%d)/$WAL_FILE" \
  --storage-class GLACIER

# Verify upload
if [ $? -eq 0 ]; then
  echo "Archived $WAL_FILE to S3"
else
  echo "Failed to archive $WAL_FILE" >&2
  exit 1
fi
```

Configuration:

```yaml
wal:
  archive:
    enabled: true
    command: "/usr/local/bin/archive_wal.sh %p"
    timeout: 300  # 5 minute timeout
    retention_days: 30
```

### Point-in-Time Recovery (PITR)

Restore database to specific timestamp:

```bash
# Stop Geode server
systemctl stop geode

# Restore base backup
tar -xzf /backups/base-backup-20260124.tar.gz -C /var/lib/geode/data

# Configure recovery
cat > /var/lib/geode/data/recovery.conf <<EOF
restore_command = 'aws s3 cp s3://geode-wal-archive/%f %p'
recovery_target_time = '2026-01-24 14:30:00'
recovery_target_action = promote
EOF

# Start Geode (recovery mode)
systemctl start geode

# Geode replays WAL up to target time, then becomes operational
```

Recovery process:

1. Restore base backup
2. Replay WAL files from archive
3. Stop at recovery target time
4. Apply final checkpoint
5. Database ready at target timestamp

### WAL Retention for Compliance

Configure long-term WAL retention:

```yaml
wal:
  archive:
    enabled: true
    retention:
      short_term:
        days: 7
        storage: local  # /var/lib/geode/wal_archive
      long_term:
        days: 2555  # 7 years for compliance
        storage: s3_glacier
        bucket: geode-compliance-archive
```

## Monitoring WAL Health

### Critical WAL Metrics

```python
from prometheus_client import Gauge, Counter

# WAL metrics
wal_current_lsn = Gauge('geode_wal_current_lsn', 'Current WAL LSN')
wal_files_count = Gauge('geode_wal_files_count', 'Number of WAL files')
wal_bytes_written = Counter('geode_wal_bytes_written_total', 'Total bytes written to WAL')
wal_sync_duration = Histogram('geode_wal_sync_seconds', 'WAL fsync duration')

# Replication lag
replication_lag_bytes = Gauge(
    'geode_replication_lag_bytes',
    'Replication lag in bytes',
    ['replica']
)
replication_lag_seconds = Gauge(
    'geode_replication_lag_seconds',
    'Replication lag in seconds',
    ['replica']
)

# Checkpoint metrics
checkpoint_duration = Histogram('geode_checkpoint_duration_seconds', 'Checkpoint duration')
checkpoint_pages_written = Counter('geode_checkpoint_pages_written_total', 'Pages written during checkpoint')
```

### WAL Health Checks

```python
async def check_wal_health(client):
    """Monitor WAL health"""
    # Check WAL disk usage
    wal_size, _ = await client.query("""
        SELECT SUM(size_bytes) AS total_size
        FROM SYSTEM.wal_files
    """)

    if wal_size > 10 * 1024 * 1024 * 1024:  # >10GB
        alert("WAL directory growing too large")

    # Check replication lag
    lag, _ = await client.query("""
        SELECT replica_name,
               current_lsn - replica_lsn AS lag_bytes,
               extract(epoch from now() - last_replay_time) AS lag_seconds
        FROM SYSTEM.replication_status
    """)

    for replica in lag.bindings:
        if replica['lag_bytes'] > 100 * 1024 * 1024:  # >100MB
            alert(f"Replica {replica['replica_name']} falling behind")

    # Check WAL archival
    unarchived, _ = await client.query("""
        SELECT COUNT(*) AS count
        FROM SYSTEM.wal_files
        WHERE archived = false
          AND created_at < NOW() - INTERVAL '1 hour'
    """)

    if unarchived.bindings[0]['count'] > 10:
        alert("WAL archival falling behind")
```

### Grafana Dashboard Queries

```promql
# WAL write rate
rate(geode_wal_bytes_written_total[5m])

# Average fsync duration
rate(geode_wal_sync_seconds_sum[5m]) /
rate(geode_wal_sync_seconds_count[5m])

# Replication lag (seconds)
geode_replication_lag_seconds{replica="replica1"}

# WAL disk usage
geode_wal_files_count * 64 * 1024 * 1024  # Assuming 64MB segments
```

## Further Reading

- [Durability and Recovery Guide](/docs/recovery/) - Complete recovery documentation
- [Architecture Overview](/docs/architecture/) - WAL in system architecture
- [Replication Guide](/docs/replication/) - WAL streaming replication
- [Performance Tuning](/docs/performance-tuning/) - WAL optimization
- [Monitoring Guide](/docs/monitoring/) - WAL health monitoring
- [PostgreSQL WAL Internals](https://www.postgresql.org/docs/current/wal-internals.html) - Detailed WAL concepts
- [ARIES Recovery Algorithm](https://cs.stanford.edu/people/chrismre/cs345/rl/aries.pdf) - Foundational paper

Geode's Write-Ahead Logging implementation provides rock-solid durability guarantees while maintaining high write throughput—essential for production graph workloads where data loss is unacceptable.
