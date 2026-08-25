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

MVCC is entirely internal to the storage engine: there is no `dbms.mvcc.*` or
`dbms.monitor.*` procedure namespace, and version chains, snapshots and GC are
not exposed as queryable objects. The signals you actually get are the
transaction counters on the Prometheus endpoint and the storage-engine LSNs:

```bash
curl -s http://localhost:9090/metrics | grep '^geode_transactions'
```

```gql
-- How far the WAL has advanced past the last checkpoint
CALL geode.storage.stats()
YIELD wal_lsn, last_checkpoint_lsn
RETURN wal_lsn, last_checkpoint_lsn, wal_lsn - last_checkpoint_lsn AS unflushed;
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
- [Concurrency Control](/tags/concurrency/) - Detailed concurrency mechanisms
- [Performance Tuning](/docs/query/performance-tuning/) - MVCC optimization techniques

### Implementation Details

- [Architecture Overview](/docs/architecture/) - System architecture including MVCC
- [Storage Engine](/tags/storage/) - Version storage and indexing
- [Recovery and Durability](/docs/recovery/) - WAL integration with MVCC

### Advanced Topics

- [Distributed MVCC](/tags/distributed/) - MVCC in distributed environments
- [Garbage Collection](/tags/performance/) - Version cleanup strategies
- [Temporal Queries](/tags/temporal/) - Historical query capabilities

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
from geode_client import Client
import asyncio

async def demonstrate_snapshot_isolation():
    client1 = Client("localhost", 3141)
    client2 = Client("localhost", 3141)

    # Setup: Create test data
    await tx1.execute("""
        CREATE (account:Account {id: 'acc_123', balance: 1000})
    """)

    # Transaction 1: Long-running read
    async with client1.connection() as tx1:
        await tx1.begin()
        # Take snapshot at t=1
        result1 = await tx1.execute("""
            MATCH (account:Account {id: 'acc_123'})
            RETURN account.balance AS balance
        """)
        balance_t1 = (result1.rows[0] if result1.rows else None)['balance']
        print(f"T1 reads balance: {balance_t1}")  # 1000

        # Transaction 2: Concurrent update
        async with client2.connection() as tx2:
            await tx2.begin()
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
        balance_t2 = (result2.rows[0] if result2.rows else None)['balance']
        print(f"T1 reads balance again: {balance_t2}")  # Still 1000!

        # T1 sees consistent snapshot despite T2's committed change

    # After T1 commits, new snapshot sees T2's change
    result3 = await tx1.execute("""
        MATCH (account:Account {id: 'acc_123'})
        RETURN account.balance AS balance
    """)
    balance_final = (result3.rows[0] if result3.rows else None)['balance']
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
        result, _ = await self.client.query("""
            MATCH (e:Entity {id: $id})
            RETURN e, e.version AS version
        """, {'id': entity_id})

        row = result.rows[0] if result.rows else None
        return row['e'], row['version']

    async def update_with_version_check(self, entity_id, expected_version, updates):
        """Update entity only if version matches."""
        result, _ = await self.client.query("""
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

        row = result.rows[0] if result.rows else None
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
        result, _ = await client.query("""
            BEGIN TRANSACTION AS OF SYSTEM TIME $timestamp;
            MATCH (account:Account {id: $account_id})
            RETURN account.balance AS balance;
            COMMIT;
        """, {'account_id': account_id, 'timestamp': ts})

        row = result.rows[0] if result.rows else None
        balances.append({
            'timestamp': ts,
            'balance': row['balance'] if row else None
        })

    return balances
```

## Garbage Collection Strategies

### What Is Configurable

Version retention and garbage collection are engine-internal. There is no
`dbms.mvcc.setRetentionPolicy`, `dbms.mvcc.garbageCollect` or
`dbms.mvcc.configure` procedure, no retention-hours setting, and no manual GC
trigger: the storage engine reclaims superseded versions on its own once no
active snapshot can see them.

What you control from outside the engine is how much garbage you create and how
long you keep snapshots open:

- **Keep transactions short.** An open transaction pins a snapshot, and every
  version newer than that snapshot has to be retained until it commits or
  rolls back.
- **Batch updates.** Rewriting the same property a thousand times in a thousand
  transactions produces a thousand versions; one transaction produces one.
- **Checkpoint pressure is observable.** A `wal_lsn` that keeps running away
  from `last_checkpoint_lsn` is the signal that write volume is outpacing the
  engine's background work.

```gql
CALL geode.storage.stats()
YIELD wal_lsn, last_checkpoint_lsn, free_pages_nodes, free_pages_props
RETURN wal_lsn - last_checkpoint_lsn AS unflushed,
       free_pages_nodes,
       free_pages_props;
```

Rising `free_pages_*` counts mean the engine has reclaimed pages and is reusing
them — that is GC working, not leaking.

## Performance Monitoring

### Transaction Metrics

The server publishes transaction outcomes, not version-chain internals. There
are no `geode_mvcc_*` metrics to scrape:

| Metric | Type | Description |
|--------|------|-------------|
| `geode_transactions_total` | Counter | Total number of transactions |
| `geode_transactions_failed_total` | Counter | Total number of failed transactions |

A rising failure ratio is the practical conflict signal:

```promql
rate(geode_transactions_failed_total[5m]) / rate(geode_transactions_total[5m])
```

### Identifying Performance Bottlenecks

There is no transaction-list, version-chain or blocking-transaction procedure
(`dbms.transactions.*` does not exist). Diagnose from the client side instead:

```python
import time

async def measure_update_contention(client, node_id, attempts=100):
    """Measure how often a hot-node update has to be retried."""
    failures = 0
    started = time.monotonic()

    for _ in range(attempts):
        try:
            await client.execute(
                "MATCH (n) WHERE id(n) = $id SET n.counter = n.counter + 1",
                {"id": node_id},
            )
        except Exception:
            failures += 1

    elapsed = time.monotonic() - started
    print(f"{failures}/{attempts} updates failed in {elapsed:.2f}s")
    if failures:
        print("Recommendation: batch the updates or spread the contention")
```

Pair that with `PROFILE` on the statement itself to see whether the cost is
contention or plan shape:

```gql
PROFILE MATCH (n:Account {id: 42}) SET n.balance = n.balance + 100;
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
            tx = await node.begin(snapshot_timestamp)
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

**Diagnosis**: version chains are not queryable — there is no
`dbms.mvcc.analyzeChains`. Find the entities you rewrite most often from your
own write patterns, and watch storage-level growth:

```gql
CALL geode.storage.stats()
YIELD node_count, edge_count, free_pages_props, page_size
RETURN node_count, edge_count, free_pages_props, page_size;
```

**Solutions**:

1. Batch updates so one transaction produces one version
2. Keep read transactions short so old versions become reclaimable
3. Redesign hot counters (for example, append events and aggregate on read)
4. Consider partitioning hot entities

### Issue: GC Starvation

**Symptom**: Storage grows continuously, GC not reclaiming space

**Diagnosis**: there is no GC-health or blocking-transaction procedure. Watch
whether free pages are being handed back and whether checkpoints keep up:

```gql
CALL geode.storage.stats()
YIELD wal_lsn, last_checkpoint_lsn,
      free_pages_nodes, free_pages_adj_out, free_pages_props
RETURN wal_lsn - last_checkpoint_lsn AS unflushed,
       free_pages_nodes, free_pages_adj_out, free_pages_props;
```

Free-page counts that stay flat while the data directory grows point at
snapshots that are never released — almost always a client that opened a
transaction and never committed it.

**Solutions**:

1. Set client-side statement/transaction timeouts (`geode shell --timeout`)
2. Make sure every code path commits or rolls back, including error paths
3. Restart clients that hold connections open indefinitely

Geode's MVCC implementation provides the foundation for high-concurrency, consistent graph queries. By maintaining multiple versions and using snapshot isolation, Geode achieves both strong consistency guarantees and excellent concurrent performance—essential for production graph workloads.
