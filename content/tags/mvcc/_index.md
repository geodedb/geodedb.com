---
title: "Tag: Multi-Version Concurrency Control (MVCC)"
description: "Explore Geode documentation tagged with mvcc. Learn about mvcc features, best practices, and implementation details."
keywords:
  - mvcc
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/mvcc/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Documentation tagged with **Multi-Version Concurrency Control (MVCC)** in the Geode graph database. MVCC is a fundamental concurrency control mechanism that enables high-performance concurrent access to data while maintaining ACID transaction guarantees.

## Introduction to MVCC

Multi-Version Concurrency Control (MVCC) is a sophisticated concurrency control method that allows multiple transactions to access the same data simultaneously without blocking each other. Unlike traditional locking mechanisms that force readers and writers to wait for each other, MVCC creates multiple versions of data items, allowing readers to access consistent snapshots while writers create new versions.

MVCC has become the de facto standard for modern database systems because it solves the fundamental trade-off between consistency and concurrency. Traditional two-phase locking provides strong consistency but suffers from contention—readers block writers and writers block readers. MVCC breaks this deadlock by maintaining multiple timestamped versions of each data item.

In Geode's implementation, MVCC enables true snapshot isolation and serializable snapshot isolation (SSI), ensuring that transactions see consistent views of the database while allowing maximum concurrency. This is critical for graph databases where complex traversal queries might read thousands of nodes and relationships—blocking those reads would cripple performance.

## Core MVCC Concepts

### Version Chains

Every data item (node, relationship, or property) in Geode exists as a version chain—a linked list of versions ordered by transaction timestamp. Each version contains:

- **Transaction ID (TxID)**: The transaction that created this version
- **Begin timestamp**: When this version became visible
- **End timestamp**: When this version was superseded (NULL if current)
- **Data payload**: The actual node/relationship/property value
- **Visibility metadata**: Information for determining version visibility

When a transaction reads data, MVCC walks the version chain to find the appropriate version based on the transaction's snapshot timestamp.

### Snapshot Isolation

Each transaction in Geode operates on a consistent snapshot of the database taken at transaction start time. This snapshot represents a point-in-time view where:

- All committed transactions up to the snapshot time are visible
- All uncommitted or future transactions are invisible
- The data remains consistent throughout the transaction

Snapshot isolation eliminates many concurrency anomalies:

- **Dirty reads**: Can't happen—uncommitted data is invisible
- **Non-repeatable reads**: Can't happen—the snapshot is immutable
- **Phantom reads**: Can't happen—new rows don't appear in snapshots

### Visibility Rules

MVCC determines version visibility using sophisticated rules:

```
A version V is visible to transaction T if:
1. V.begin_timestamp <= T.snapshot_timestamp
2. V.end_timestamp > T.snapshot_timestamp OR V.end_timestamp IS NULL
3. V.creating_transaction is committed at T.snapshot_timestamp
4. V.deleting_transaction is not committed at T.snapshot_timestamp
```

These rules ensure transactions only see committed data that was valid at their snapshot time.

### Write-Write Conflicts

While MVCC allows readers and writers to proceed concurrently, write-write conflicts still require coordination. When two transactions attempt to modify the same data:

```gql
-- Transaction 1
BEGIN;
MATCH (p:Person {id: 123})
SET p.balance = p.balance + 100;
-- Transaction 2 attempts same update
COMMIT; -- One transaction succeeds, other aborts with conflict error
```

Geode detects write-write conflicts and aborts one transaction, forcing retry. This preserves serializability while maximizing concurrency.

## How MVCC Works in Geode

### Transaction Lifecycle

1. **BEGIN**: Allocate transaction ID, capture snapshot timestamp
2. **READ**: Walk version chains to find visible versions
3. **WRITE**: Create new versions with current transaction ID
4. **COMMIT**: Mark all created versions as committed, update timestamps
5. **ROLLBACK**: Mark all created versions as aborted

### Version Storage

Geode stores versions using a highly optimized layout:

- **In-Memory Version Table**: Hot versions kept in memory for fast access
- **Versioned B-Tree**: Persistent storage with efficient range scans
- **Version Compression**: Delta encoding for similar versions
- **Garbage Collection**: Background cleanup of obsolete versions

### Garbage Collection

Over time, old versions accumulate. Geode's MVCC garbage collector reclaims space:

```
A version V can be garbage collected if:
1. V is not the current version
2. No active transaction has a snapshot_timestamp that could see V
3. V has been superseded for longer than the retention period
```

The GC runs continuously in the background, using a generational approach similar to modern memory managers.

### Integration with WAL

MVCC works hand-in-hand with Write-Ahead Logging (WAL):

- **Before Image**: WAL records contain old version data
- **After Image**: WAL records contain new version data
- **Recovery**: Replay WAL to reconstruct version chains
- **Point-in-Time Recovery**: Use version timestamps to recover to specific moments

## Use Cases and Benefits

### High-Concurrency Read Workloads

MVCC shines in read-heavy workloads:

```gql
-- Thousands of concurrent read transactions
MATCH (p:Person)-[:KNOWS*1..3]->(friend)
WHERE p.id = $userId
RETURN friend.name, friend.interests
```

These queries never block each other or block writes, enabling linear scaling of read throughput.

### Long-Running Analytics

Complex graph analytics can run without locking:

```gql
-- Multi-minute PageRank computation
MATCH (n:Page)
RETURN n.id, pageRank(n) AS rank
ORDER BY rank DESC
LIMIT 100
```

The transaction operates on a consistent snapshot, unaffected by concurrent updates.

### Time-Travel Queries

MVCC enables querying historical data:

```gql
-- See data as it existed at specific time
SET TRANSACTION SNAPSHOT AT '2025-01-01T00:00:00Z';
MATCH (account:Account {id: $accountId})
RETURN account.balance -- Balance on Jan 1, 2025
```

This is invaluable for auditing, debugging, and historical analysis.

### Optimistic Concurrency

MVCC supports optimistic locking patterns:

```gql
-- Optimistic update with version check
MATCH (product:Product {sku: $sku})
WHERE product.version = $expectedVersion
SET product.quantity = product.quantity - $amount,
    product.version = product.version + 1
RETURN product.version
```

If the version changed, the WHERE clause fails, signaling a conflict.

## Best Practices

### Transaction Management

1. **Keep transactions short**: Long transactions hold snapshots, preventing garbage collection
   ```gql
   -- Good: Short transaction
   BEGIN;
   MATCH (p:Person {id: $id}) SET p.last_login = now();
   COMMIT;

   -- Bad: Long-running transaction
   BEGIN;
   -- Complex processing...
   -- Hours later...
   COMMIT;
   ```

2. **Use appropriate isolation levels**: Choose between snapshot isolation and serializable snapshot isolation based on requirements

3. **Handle conflicts gracefully**: Implement retry logic for write-write conflicts
   ```python
   for attempt in range(max_retries):
       try:
           with db.transaction():
               # Perform updates
               break
       except ConflictError:
           if attempt == max_retries - 1:
               raise
           time.sleep(backoff_delay)
   ```

### Performance Optimization

1. **Monitor version chain length**: Long chains indicate hot spots
2. **Tune garbage collection**: Balance retention needs with storage efficiency
3. **Use bulk operations**: Reduce transaction overhead for batch updates
4. **Partition hot data**: Distribute high-contention data across nodes

### Debugging and Monitoring

Track MVCC metrics:

- **Active transactions**: Number of concurrent transactions
- **Version chain depth**: Average and max version count per item
- **GC throughput**: Versions reclaimed per second
- **Conflict rate**: Write-write conflicts per second
- **Snapshot age**: Age of oldest active snapshot

```gql
-- Query MVCC statistics
CALL dbms.monitor.mvcc.stats() YIELD metric, value
RETURN metric, value
```

## Troubleshooting

### Long Version Chains

**Symptom**: Queries slow down over time
**Cause**: Hot-spot data with frequent updates
**Solution**: Partition data, increase GC frequency, or redesign schema

### Garbage Collection Stalls

**Symptom**: Storage keeps growing
**Cause**: Long-running transactions preventing GC
**Solution**: Identify and terminate long transactions, tune retention policy

### High Conflict Rates

**Symptom**: Many transaction aborts
**Cause**: Write-write conflicts on shared data
**Solution**: Redesign to reduce contention, use application-level sharding

## Related Topics

- [Serializable Snapshot Isolation (SSI)](/tags/ssi/) - Advanced isolation level built on MVCC
- [Write-Ahead Logging (WAL)](/tags/wal/) - Durability mechanism integrated with MVCC
- [ACID Transactions](/tags/acid/) - Transaction guarantees enabled by MVCC
- [Concurrency Control](/tags/concurrency/) - Broader concurrency mechanisms
- [Isolation Levels](/tags/isolation/) - Transaction isolation guarantees
- [Performance](/tags/performance/) - MVCC performance characteristics
- [Transactions](/tags/transactions/) - Transaction management

## Further Reading

### Documentation

- [Transaction Guide](/docs/transactions/) - Complete transaction documentation
- [Concurrency Control](/docs/concurrency/) - Detailed concurrency mechanisms
- [Performance Tuning](/docs/performance-tuning/) - MVCC optimization techniques

### Implementation Details

- [Architecture Overview](/docs/architecture/) - System architecture including MVCC
- [Storage Engine](/docs/storage/) - Version storage and indexing
- [Recovery and Durability](/docs/recovery/) - WAL integration with MVCC

### Advanced Topics

- [Distributed MVCC](/tags/distributed/) - MVCC in distributed environments
- [Garbage Collection](/docs/gc/) - Version cleanup strategies
- [Time-Travel Queries](/docs/time-travel/) - Historical query capabilities

## MVCC Implementation Deep Dive

### Version Storage Architecture

Geode stores versions using an optimized multi-tier approach:

```
Node Version Chain Example:
┌─────────────────────────────────────────────────────────┐
│ Node ID: 42 (Person:Alice)                             │
├─────────────────────────────────────────────────────────┤
│ Current Version (TxID: 1005, committed)                │
│   age: 31                                              │
│   email: "alice@newdomain.com"                         │
│   ↓                                                     │
│ Previous Version (TxID: 1003, committed)               │
│   age: 31                                              │
│   email: "alice@example.com"                           │
│   ↓                                                     │
│ Previous Version (TxID: 1001, committed)               │
│   age: 30                                              │
│   email: "alice@example.com"                           │
│   ↓                                                     │
│ NULL (end of chain)                                    │
└─────────────────────────────────────────────────────────┘
```

### Version Visibility Algorithm

```zig
// geode/src/mvcc/visibility.zig

pub fn isVersionVisible(
    version: *Version,
    snapshot: *Snapshot
) bool {
    // Check version begin timestamp
    if (version.begin_timestamp > snapshot.timestamp) {
        return false; // Created after snapshot
    }

    // Check version end timestamp
    if (version.end_timestamp != null and
        version.end_timestamp.? <= snapshot.timestamp) {
        return false; // Deleted before snapshot
    }

    // Check creating transaction status
    if (!isCommitted(version.creating_tx, snapshot.timestamp)) {
        return false; // Creating transaction not committed
    }

    // Check deleting transaction status
    if (version.deleting_tx != null and
        isCommitted(version.deleting_tx.?, snapshot.timestamp)) {
        return false; // Deleting transaction committed
    }

    return true;
}
```

### Snapshot Isolation Example

```python
from geode_client import GeodeClient
import asyncio

async def demonstrate_snapshot_isolation():
    client1 = GeodeClient("localhost", 3141)
    client2 = GeodeClient("localhost", 3141)

    # Setup: Create test data
    await client1.execute("""
        CREATE (account:Account {id: 'acc_123', balance: 1000})
    """)

    # Transaction 1: Long-running read
    async with client1.transaction() as tx1:
        # Take snapshot at t=1
        result1 = await tx1.execute("""
            MATCH (account:Account {id: 'acc_123'})
            RETURN account.balance AS balance
        """)
        balance_t1 = (await result1.fetch_one())['balance']
        print(f"T1 reads balance: {balance_t1}")  # 1000

        # Transaction 2: Concurrent update
        async with client2.transaction() as tx2:
            await tx2.execute("""
                MATCH (account:Account {id: 'acc_123'})
                SET account.balance = account.balance - 100
            """)
            # T2 commits here

        # Sleep to ensure T2 commits
        await asyncio.sleep(0.1)

        # T1 reads again from same snapshot
        result2 = await tx1.execute("""
            MATCH (account:Account {id: 'acc_123'})
            RETURN account.balance AS balance
        """)
        balance_t2 = (await result2.fetch_one())['balance']
        print(f"T1 reads balance again: {balance_t2}")  # Still 1000!

        # T1 sees consistent snapshot despite T2's committed change

    # After T1 commits, new snapshot sees T2's change
    result3 = await client1.execute("""
        MATCH (account:Account {id: 'acc_123'})
        RETURN account.balance AS balance
    """)
    balance_final = (await result3.fetch_one())['balance']
    print(f"New snapshot sees: {balance_final}")  # 900

asyncio.run(demonstrate_snapshot_isolation())
```

## Advanced MVCC Patterns

### Optimistic Concurrency Control

```python
class OptimisticLock:
    """Implement optimistic locking using MVCC."""

    def __init__(self, client):
        self.client = client

    async def read_with_version(self, entity_id):
        """Read entity and its current version."""
        result = await self.client.execute("""
            MATCH (e:Entity {id: $id})
            RETURN e, e.version AS version
        """, {'id': entity_id})

        row = await result.fetch_one()
        return row['e'], row['version']

    async def update_with_version_check(self, entity_id, expected_version, updates):
        """Update entity only if version matches."""
        result = await self.client.execute("""
            MATCH (e:Entity {id: $id})
            WHERE e.version = $expected_version
            SET e += $updates,
                e.version = e.version + 1
            RETURN e.version AS new_version
        """, {
            'id': entity_id,
            'expected_version': expected_version,
            'updates': updates
        })

        row = await result.fetch_one()
        if not row:
            raise OptimisticLockException("Version mismatch - entity was modified")

        return row['new_version']

# Usage
async def safe_concurrent_update():
    lock = OptimisticLock(client)

    # Read current state
    entity, version = await lock.read_with_version(entity_id="entity_1")

    # Perform business logic
    new_quantity = entity['quantity'] - 5

    # Attempt update with version check
    try:
        new_version = await lock.update_with_version_check(
            entity_id="entity_1",
            expected_version=version,
            updates={'quantity': new_quantity}
        )
        print(f"Updated to version {new_version}")
    except OptimisticLockException:
        print("Concurrent modification detected - retry")
```

### Time-Travel Queries

MVCC enables querying historical database states:

```gql
-- Query database as it existed at specific time
BEGIN TRANSACTION
    AS OF SYSTEM TIME '2025-01-01T00:00:00Z';

MATCH (account:Account {id: 'acc_123'})
RETURN account.balance AS balance_at_jan1;

COMMIT;

-- Query multiple historical points
MATCH (account:Account {id: 'acc_123'})
WITH account.id AS account_id
UNWIND [
    '2025-01-01T00:00:00Z',
    '2025-02-01T00:00:00Z',
    '2025-03-01T00:00:00Z'
] AS timestamp
WITH account_id, timestamp
CALL {
    BEGIN TRANSACTION AS OF SYSTEM TIME timestamp;
    MATCH (account:Account {id: account_id})
    RETURN account.balance AS balance;
    COMMIT;
}
RETURN timestamp, balance
ORDER BY timestamp;
```

```python
async def historical_balance_report(account_id, start_date, end_date):
    """Generate historical balance report using time-travel."""

    # Generate monthly timestamps
    timestamps = generate_monthly_timestamps(start_date, end_date)

    balances = []
    for ts in timestamps:
        result = await client.execute("""
            BEGIN TRANSACTION AS OF SYSTEM TIME $timestamp;
            MATCH (account:Account {id: $account_id})
            RETURN account.balance AS balance;
            COMMIT;
        """, {'account_id': account_id, 'timestamp': ts})

        row = await result.fetch_one()
        balances.append({
            'timestamp': ts,
            'balance': row['balance'] if row else None
        })

    return balances
```

## Garbage Collection Strategies

### Configurable GC Policies

```python
class MVCCGarbageCollector:
    """Configure and manage MVCC garbage collection."""

    def __init__(self, client):
        self.client = client

    async def set_retention_policy(self, retention_hours):
        """Set how long to retain old versions."""
        await self.client.execute("""
            CALL dbms.mvcc.setRetentionPolicy($hours)
        """, {'hours': retention_hours})

    async def run_gc_manually(self):
        """Trigger manual garbage collection."""
        result = await self.client.execute("""
            CALL dbms.mvcc.garbageCollect()
            YIELD versionsReclaimed, bytesFreed
            RETURN versionsReclaimed, bytesFreed
        """)

        stats = await result.fetch_one()
        return stats

    async def get_gc_stats(self):
        """Get garbage collection statistics."""
        result = await self.client.execute("""
            CALL dbms.mvcc.stats()
            YIELD metric, value
            RETURN metric, value
        """)

        return {row['metric']: row['value'] async for row in result}

# Usage
async def manage_storage():
    gc = MVCCGarbageCollector(client)

    # Set 24-hour retention
    await gc.set_retention_policy(retention_hours=24)

    # Run GC and get stats
    stats = await gc.run_gc_manually()
    print(f"Reclaimed {stats['versionsReclaimed']} versions")
    print(f"Freed {stats['bytesFreed'] / 1024 / 1024:.2f} MB")

    # Monitor GC health
    gc_stats = await gc.get_gc_stats()
    print(f"Average version chain length: {gc_stats['avg_chain_length']}")
    print(f"Oldest active snapshot age: {gc_stats['oldest_snapshot_age_seconds']}s")
```

### Aggressive vs. Conservative GC

```python
# Conservative: Keep more history (better for time-travel)
await client.execute("""
    CALL dbms.mvcc.configure({
        retention_hours: 168,  // 1 week
        gc_frequency_minutes: 60,
        max_chain_length: 100
    })
""")

# Aggressive: Minimize storage (faster queries)
await client.execute("""
    CALL dbms.mvcc.configure({
        retention_hours: 1,
        gc_frequency_minutes: 5,
        max_chain_length: 10
    })
""")
```

## Performance Monitoring

### MVCC Performance Metrics

```python
from prometheus_client import Gauge, Histogram

# Define metrics
version_chain_length = Histogram(
    'geode_mvcc_version_chain_length',
    'Length of version chains',
    buckets=[1, 5, 10, 25, 50, 100, 250]
)

active_snapshots = Gauge(
    'geode_mvcc_active_snapshots',
    'Number of active snapshots'
)

gc_reclaimed_versions = Counter(
    'geode_mvcc_gc_reclaimed_versions_total',
    'Total versions reclaimed by GC'
)

async def collect_mvcc_metrics():
    """Collect and export MVCC metrics."""
    stats = await client.execute("""
        CALL dbms.mvcc.detailedStats()
        YIELD metric, value
        RETURN metric, value
    """)

    async for row in stats:
        metric = row['metric']
        value = row['value']

        if metric == 'avg_version_chain_length':
            version_chain_length.observe(value)
        elif metric == 'active_snapshots':
            active_snapshots.set(value)
        elif metric == 'gc_reclaimed_versions':
            gc_reclaimed_versions.inc(value)
```

### Identifying Performance Bottlenecks

```python
async def diagnose_mvcc_issues():
    """Diagnose MVCC-related performance issues."""

    # Check for long version chains
    result = await client.execute("""
        CALL dbms.mvcc.versionChainStats()
        YIELD nodeId, chainLength
        WHERE chainLength > 50
        RETURN nodeId, chainLength
        ORDER BY chainLength DESC
        LIMIT 10
    """)

    long_chains = [row async for row in result]
    if long_chains:
        print("WARNING: Long version chains detected")
        for chain in long_chains:
            print(f"  Node {chain['nodeId']}: {chain['chainLength']} versions")
        print("Recommendation: Increase GC frequency or reduce update rate")

    # Check for old snapshots blocking GC
    result = await client.execute("""
        CALL dbms.transactions.list()
        YIELD transactionId, startTime
        WHERE duration.between(startTime, datetime()) > duration('PT5M')
        RETURN transactionId, startTime
    """)

    old_txs = [row async for row in result]
    if old_txs:
        print("WARNING: Long-running transactions blocking GC")
        for tx in old_txs:
            print(f"  Transaction {tx['transactionId']}")
            print(f"    Started: {tx['startTime']}")
        print("Recommendation: Terminate or shorten these transactions")
```

## Distributed MVCC

### Multi-Node Version Coordination

```python
class DistributedMVCC:
    """Coordinate MVCC across multiple nodes."""

    def __init__(self, nodes):
        self.nodes = nodes
        self.clock = HybridLogicalClock()

    async def begin_distributed_transaction(self):
        """Start transaction across all nodes with synchronized snapshot."""

        # Get synchronized timestamp from all nodes
        timestamps = []
        for node in self.nodes:
            ts = await node.get_current_timestamp()
            timestamps.append(ts)

        # Use maximum timestamp to ensure consistent snapshot
        snapshot_timestamp = max(timestamps)

        # Begin transaction on all nodes with same snapshot
        transactions = []
        for node in self.nodes:
            tx = await node.begin_transaction(snapshot_timestamp)
            transactions.append(tx)

        return DistributedTransaction(transactions, snapshot_timestamp)

class HybridLogicalClock:
    """Hybrid logical clock for distributed timestamp coordination."""

    def __init__(self):
        self.logical_time = 0
        self.physical_time = 0

    def now(self):
        """Get current HLC timestamp."""
        current_physical = time.time_ns()

        if current_physical > self.physical_time:
            self.physical_time = current_physical
            self.logical_time = 0
        else:
            self.logical_time += 1

        return (self.physical_time, self.logical_time)

    def update(self, remote_timestamp):
        """Update clock based on received timestamp."""
        remote_physical, remote_logical = remote_timestamp
        current_physical = time.time_ns()

        self.physical_time = max(current_physical, remote_physical, self.physical_time)

        if self.physical_time == remote_physical:
            self.logical_time = max(self.logical_time, remote_logical) + 1
        elif self.physical_time == current_physical:
            self.logical_time += 1
        else:
            self.logical_time = 0

        return (self.physical_time, self.logical_time)
```

## Troubleshooting MVCC Issues

### Issue: Version Chain Bloat

**Symptom**: Queries slow down over time on frequently updated entities

**Diagnosis**:
```python
async def find_bloated_chains():
    result = await client.execute("""
        CALL dbms.mvcc.analyzeChains()
        YIELD entityId, entityType, chainLength, storageBytes
        WHERE chainLength > 100
        RETURN entityId, entityType, chainLength, storageBytes
        ORDER BY chainLength DESC
    """)

    return [row async for row in result]
```

**Solutions**:
1. Increase GC frequency
2. Reduce retention period
3. Redesign to batch updates
4. Consider partitioning hot entities

### Issue: GC Starvation

**Symptom**: Storage grows continuously, GC not reclaiming space

**Diagnosis**:
```python
async def check_gc_health():
    result = await client.execute("""
        CALL dbms.mvcc.gcHealth()
        YIELD lastRunTime, versionsEligible, versionsReclaimed
        RETURN lastRunTime, versionsEligible, versionsReclaimed
    """)

    health = await result.fetch_one()

    if health['versionsEligible'] > 0 and health['versionsReclaimed'] == 0:
        # GC unable to run - find why
        blocked_by = await client.execute("""
            CALL dbms.transactions.blocking()
            YIELD transactionId, blockedBy
            RETURN transactionId, blockedBy
        """)

        return await blocked_by.fetch_all()
```

**Solutions**:
1. Identify and terminate long-running transactions
2. Ensure no snapshots held indefinitely
3. Check for GC configuration issues

Geode's MVCC implementation provides the foundation for high-concurrency, consistent graph queries. By maintaining multiple versions and using snapshot isolation, Geode achieves both strong consistency guarantees and excellent concurrent performance—essential for production graph workloads.
