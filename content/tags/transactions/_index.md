---
title: "Tag: Transaction Management"
description: "Master Geode's ACID transaction support with MVCC, SSI isolation, savepoints, and distributed transaction coordination."
keywords:
  - transactions
  - ACID
  - MVCC
  - SSI
  - consistency
  - isolation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/transactions/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Transaction management is a cornerstone of Geode's enterprise-ready architecture. Unlike many graph databases that sacrifice consistency for performance, Geode provides full ACID guarantees with Serializable Snapshot Isolation (SSI), ensuring your data remains consistent even under high concurrency and complex workloads.

Geode's transaction system is built on Multi-Version Concurrency Control (MVCC), which enables high-performance concurrent access without locking readers. Combined with Write-Ahead Logging (WAL) for durability and savepoint support for complex transaction logic, Geode delivers the reliability and correctness required for mission-critical applications.

This comprehensive guide explores transaction concepts, usage patterns, and best practices for leveraging Geode's transaction capabilities effectively.

## Core Transaction Concepts

**ACID Guarantees**: Geode enforces all four ACID properties:
- **Atomicity**: Transactions execute completely or not at all
- **Consistency**: Transactions maintain all integrity constraints
- **Isolation**: Concurrent transactions don't interfere with each other
- **Durability**: Committed changes survive system failures

**Serializable Snapshot Isolation (SSI)**: Geode implements the strongest isolation level, preventing all anomalies including phantom reads, non-repeatable reads, and serialization anomalies. Your transactions execute as if they were run serially, even when running concurrently.

**Multi-Version Concurrency Control (MVCC)**: Instead of locking, Geode maintains multiple versions of each graph element. Readers access consistent snapshots without blocking writers, and writers don't block readers. This architecture delivers excellent concurrency while maintaining strict consistency.

**Write-Ahead Logging (WAL)**: Every change is first written to a durable log before being applied to the database. If the system crashes, Geode can recover to a consistent state by replaying the WAL.

## Transaction Lifecycle in Geode

Understanding the transaction lifecycle helps you write correct and efficient code:

1. **BEGIN**: Start a new transaction, creating a consistent snapshot of the database
2. **EXECUTE**: Run GQL queries and mutations within the transaction context
3. **COMMIT**: Persist all changes durably and make them visible to other transactions
4. **ROLLBACK**: Abort the transaction and discard all changes

All database operations in Geode execute within a transaction context. If you don't explicitly begin a transaction, Geode automatically wraps each statement in its own implicit transaction.

## Using Transactions in GQL

Geode provides standard SQL-style transaction control:

```gql
-- Explicit transaction
START TRANSACTION;

-- Create nodes and relationships
MATCH (u:User {id: 123})
CREATE (p:Post {title: 'New Post', content: '...'})
CREATE (u)-[:POSTED]->(p);

-- Update existing data
MATCH (u:User {id: 456})
SET u.last_login = current_timestamp();

-- Commit all changes
COMMIT;
```

**Rollback on Error**:
```gql
START TRANSACTION;

MATCH (account:Account {id: 'A'})
SET account.balance = account.balance - 100;

MATCH (account:Account {id: 'B'})
SET account.balance = account.balance + 100;

-- If anything fails, rollback
ROLLBACK;
```

**Read-Only Transactions**: Optimize read-heavy workloads by declaring transactions as read-only:
```gql
START TRANSACTION READ ONLY;

MATCH (u:User)-[:FOLLOWS]->(other:User)
RETURN u.name, collect(other.name);

COMMIT;
```

## Savepoints for Complex Logic

Savepoints enable partial rollback within a transaction, useful for implementing complex business logic:

```gql
START TRANSACTION;

-- Checkpoint 1
SAVEPOINT before_user_update;

MATCH (u:User {id: 123})
SET u.name = 'New Name';

-- Checkpoint 2
SAVEPOINT before_post_creation;

CREATE (p:Post {title: 'Draft Post'});

-- Oops, rollback post creation but keep user update
ROLLBACK TO SAVEPOINT before_post_creation;

-- Release the savepoint
RELEASE SAVEPOINT before_user_update;

COMMIT;
```

**Savepoint Use Cases**:
- Try-catch style error handling within transactions
- Implementing multi-step workflows with conditional logic
- Batch operations where some items may fail
- Testing changes before committing

## Transaction Isolation and Concurrency

Geode's SSI implementation prevents concurrency anomalies while maintaining high performance:

**Preventing Lost Updates**:
```gql
-- Transaction 1
START TRANSACTION;
MATCH (u:User {id: 123})
SET u.login_count = u.login_count + 1;
COMMIT;

-- Transaction 2 (concurrent)
START TRANSACTION;
MATCH (u:User {id: 123})
SET u.last_login = current_timestamp();
COMMIT;
```
Both transactions succeed without conflict. MVCC ensures each sees a consistent snapshot and updates are properly serialized.

**Detecting Write Conflicts**:
```gql
-- Transaction 1
START TRANSACTION;
MATCH (p:Product {id: 'PROD-1'})
WHERE p.stock > 0
SET p.stock = p.stock - 1;
COMMIT;

-- Transaction 2 (concurrent, same product)
START TRANSACTION;
MATCH (p:Product {id: 'PROD-1'})
WHERE p.stock > 0
SET p.stock = p.stock - 1;
COMMIT;  -- May fail with serialization error
```
If both transactions attempt to modify the same product concurrently, one will succeed and the other will be aborted with a serialization error. Your application should retry the failed transaction.

## Best Practices for Transaction Management

**Keep Transactions Short**: Long-running transactions hold resources and increase conflict probability. Execute transactions quickly and commit as soon as possible.

**Batch Operations Wisely**: Group related operations into transactions, but avoid massive transactions that could exhaust memory:
```gql
-- Good: Reasonably sized batch
START TRANSACTION;
UNWIND $batch AS item
CREATE (n:Node {id: item.id, data: item.data});
COMMIT;

-- Avoid: Extremely large batches (>100k items)
-- Instead, split into multiple transactions
```

**Use Read-Only Transactions**: When you only need to query data, mark transactions as read-only for better performance and reduced conflict potential.

**Handle Serialization Errors**: SSI may abort transactions due to conflicts. Implement retry logic with exponential backoff:
```python
import time
import random

def execute_with_retry(query, max_attempts=3):
    for attempt in range(max_attempts):
        try:
            result = geode.execute(query)
            return result
        except SerializationError:
            if attempt == max_attempts - 1:
                raise
            time.sleep(random.uniform(0.01, 0.1) * (2 ** attempt))
```

**Avoid Mixing Reads and Writes**: When possible, separate read-heavy and write-heavy operations. This reduces contention and improves throughput.

**Use Savepoints for Complex Logic**: Instead of aborting entire transactions, use savepoints to implement partial rollback logic.

## Transaction Performance Optimization

**Connection Pooling**: Reuse database connections to avoid transaction setup overhead:
```python
from geode import ConnectionPool

pool = ConnectionPool(max_connections=20)
conn = pool.get_connection()
conn.execute("START TRANSACTION")
# ... operations ...
conn.execute("COMMIT")
pool.release(conn)
```

**Prepared Statements**: Pre-compile frequently used queries to reduce parsing overhead:
```python
stmt = geode.prepare("""
  MATCH (u:User {id: $user_id})
  SET u.last_login = current_timestamp()
""")

with geode.transaction():
    stmt.execute(user_id=123)
```

**Deferred Constraints**: For bulk operations, consider deferring constraint checking until commit time to avoid intermediate validation overhead.

**WAL Configuration**: Tune WAL settings for your durability vs. performance requirements. Geode defaults to fsync on commit for maximum durability, but you can adjust for specific workloads.

## Distributed Transaction Coordination

For multi-node deployments, Geode coordinates distributed transactions:

**Two-Phase Commit**: Geode uses 2PC to ensure atomic commits across shards. The coordinator node ensures all participants commit or all abort.

**Distributed Deadlock Detection**: Geode detects deadlocks across nodes and aborts one transaction to resolve the deadlock.

**Cross-Shard Transactions**: Transactions can span multiple shards transparently:
```gql
START TRANSACTION;

-- May access data on different shards
MATCH (u:User {id: 123}), (p:Product {id: 'PROD-1'})
CREATE (u)-[:PURCHASED]->(p);

COMMIT;
```

## Monitoring Transaction Health

Monitor key transaction metrics to ensure system health:

- **Transaction throughput**: Commits per second
- **Transaction latency**: Time from START to COMMIT
- **Abort rate**: Percentage of transactions rolled back
- **Conflict rate**: Serialization failures per second
- **Long-running transactions**: Identify transactions holding resources

Use Geode's metrics endpoints to track these values:
```gql
-- View transaction statistics
SHOW TRANSACTION STATS;

-- Find long-running transactions
SHOW TRANSACTIONS WHERE duration > 1000;
```

## Troubleshooting Common Issues

**High Abort Rates**: If many transactions abort due to conflicts:
- Reduce transaction duration
- Decrease batch sizes
- Implement exponential backoff retry logic
- Consider partitioning hot data

**Deadlocks**: If deadlocks occur frequently:
- Access resources in consistent order across transactions
- Use shorter transactions
- Implement timeout logic

**Performance Degradation**: If transaction throughput drops:
- Check for long-running transactions blocking others
- Monitor WAL write performance
- Verify sufficient connection pool capacity
- Review query execution plans for inefficient operations

## Advanced Transaction Features

**Transaction Hooks**: Register callbacks for transaction lifecycle events:
```python
def on_commit(txn):
    # Trigger side effects after successful commit
    send_notification()

geode.register_hook('after_commit', on_commit)
```

**Deferred Triggers**: Execute logic after transaction commit without blocking the commit path.

**Read-Your-Writes Consistency**: Geode guarantees that within a transaction, you always see your own writes, even before commit.

## Related Topics

- [ACID Compliance and Guarantees](/tags/acid/)
- [Multi-Version Concurrency Control (MVCC)](/tags/mvcc/)
- [Serializable Snapshot Isolation (SSI)](/tags/ssi/)
- [Write-Ahead Logging (WAL)](/tags/wal/)
- [Concurrency Control](/tags/concurrency/)
- [Performance Tuning and Optimization](/tags/performance/)
- [Data Integrity and Consistency](/tags/data-integrity/)

## Transaction Isolation Levels in Detail

### Serializable Snapshot Isolation (SSI)

Geode's default isolation level provides the strongest guarantees:

```python
from geode_client import Client

async def ssi_example():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Default SSI behavior
        await conn.begin()
        result1, _ = await conn.query("""
            MATCH (account:Account {id: $id})
            RETURN account.balance AS balance
        """, {'id': 'acc_123'})

        balance = result1.rows[0]["balance"].raw_value if result1.rows else 0

        # Concurrent transaction cannot modify our snapshot
        if balance >= 100:
            await conn.execute("""
                MATCH (account:Account {id: $id})
                SET account.balance = account.balance - 100
            """, {'id': 'acc_123'})

        # Commits only if no conflicts detected
        await conn.commit()
```

### Read Committed Isolation

Lower isolation for higher concurrency:

```python
async def read_committed_example():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # If your deployment enables READ COMMITTED, the same flow applies
        await conn.begin()
        result1, _ = await conn.query("""
            MATCH (product:Product {sku: $sku})
            RETURN product.stock AS stock
        """, {'sku': 'PROD-123'})

        # Another transaction commits here - you'll see the change

        result2, _ = await conn.query("""
            MATCH (product:Product {sku: $sku})
            RETURN product.stock AS stock
        """, {'sku': 'PROD-123'})

        await conn.commit()
```

## Advanced Transaction Patterns

### Two-Phase Commit for Distributed Transactions

```python
class DistributedTransaction:
    def __init__(self, coordinator, participants):
        self.coordinator = coordinator
        self.participants = participants
        self.transaction_id = None

    async def execute(self, operations):
        """Execute distributed transaction with 2PC."""
        self.transaction_id = generate_tx_id()

        # Phase 1: Prepare
        prepared = []
        try:
            for participant, operation in zip(self.participants, operations):
                vote = await participant.prepare(self.transaction_id, operation)
                if vote != 'PREPARED':
                    raise TransactionAbort(f"Participant {participant} voted abort")
                prepared.append(participant)

            # Phase 2: Commit
            for participant in prepared:
                await participant.commit(self.transaction_id)

            return True

        except Exception as e:
            # Rollback all prepared participants
            for participant in prepared:
                await participant.rollback(self.transaction_id)
            raise

# Usage
async def distributed_transfer():
    coordinator = Client("coordinator:3141")
    shard1 = Client("shard1:3141")
    shard2 = Client("shard2:3141")

    tx = DistributedTransaction(coordinator, [shard1, shard2])

    operations = [
        # Debit from account on shard1
        """
        MATCH (account:Account {id: $from_id})
        WHERE account.balance >= $amount
        SET account.balance = account.balance - $amount
        """,
        # Credit to account on shard2
        """
        MATCH (account:Account {id: $to_id})
        SET account.balance = account.balance + $amount
        """
    ]

    await tx.execute(operations)
```

### Saga Pattern for Long-Running Transactions

```python
class Saga:
    """Saga pattern for managing long-running business transactions."""

    def __init__(self, client):
        self.client = client
        self.steps = []
        self.compensations = []

    def add_step(self, forward_action, compensation_action):
        self.steps.append(forward_action)
        self.compensations.append(compensation_action)

    async def execute(self):
        """Execute saga with automatic compensation on failure."""
        completed_steps = []

        try:
            for i, step in enumerate(self.steps):
                await step()
                completed_steps.append(i)

            return True

        except Exception as e:
            # Compensate in reverse order
            for i in reversed(completed_steps):
                try:
                    await self.compensations[i]()
                except Exception as comp_error:
                    # Log compensation failure
                    logger.error(f"Compensation failed for step {i}: {comp_error}")

            raise

# Example: Order fulfillment saga
async def order_fulfillment_saga(order_id):
    saga = Saga(client)

    # Step 1: Reserve inventory
    saga.add_step(
        forward_action=lambda: client.execute("""
            MATCH (product:Product {sku: $sku})
            WHERE product.stock >= $quantity
            SET product.stock = product.stock - $quantity,
                product.reserved = product.reserved + $quantity
        """, order.items),
        compensation_action=lambda: client.execute("""
            MATCH (product:Product {sku: $sku})
            SET product.stock = product.stock + $quantity,
                product.reserved = product.reserved - $quantity
        """, order.items)
    )

    # Step 2: Process payment
    saga.add_step(
        forward_action=lambda: process_payment(order),
        compensation_action=lambda: refund_payment(order)
    )

    # Step 3: Create shipment
    saga.add_step(
        forward_action=lambda: create_shipment(order),
        compensation_action=lambda: cancel_shipment(order)
    )

    await saga.execute()
```

### Optimistic Locking with Version Numbers

```gql
-- Add version column to entities
MATCH (product:Product)
SET product.version = COALESCE(product.version, 0);

-- Optimistic update
MATCH (product:Product {sku: $sku})
WHERE product.version = $expected_version
SET product.stock = product.stock - $quantity,
    product.version = product.version + 1
RETURN product.version AS new_version;

-- If version mismatch, handle conflict
```

```python
async def optimistic_update(client, sku, quantity, max_retries=3):
    """Update with optimistic locking and retry."""
    for attempt in range(max_retries):
        # Read current version
        result, _ = await client.query("""
            MATCH (product:Product {sku: $sku})
            RETURN product.version AS version, product.stock AS stock
        """, {'sku': sku})

        row = result.rows[0] if result.rows else None
        if not row:
            raise ProductNotFound(sku)

        current_version = row['version']
        current_stock = row['stock']

        if current_stock < quantity:
            raise InsufficientStock(sku, current_stock, quantity)

        # Attempt update with version check
        try:
            update_result, _ = await client.query("""
                MATCH (product:Product {sku: $sku})
                WHERE product.version = $expected_version
                SET product.stock = product.stock - $quantity,
                    product.version = product.version + 1
                RETURN product.version AS new_version
            """, {
                'sku': sku,
                'expected_version': current_version,
                'quantity': quantity
            })

            updated_row = update_result.rows[0] if update_result.rows else None
            if updated_row:
                return updated_row['new_version']
            else:
                # Version mismatch - retry
                if attempt < max_retries - 1:
                    await asyncio.sleep(0.1 * (2 ** attempt))
                    continue
                else:
                    raise OptimisticLockException(sku)

        except Exception as e:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(0.1 * (2 ** attempt))
```

## Transaction Performance Tuning

### Batch Operations Within Transactions

```python
async def bulk_insert_with_batching(client, items, batch_size=1000):
    """Insert large datasets efficiently using batched transactions."""
    total_inserted = 0

    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]

        async with client.connection() as conn:
            await conn.begin()
            try:
                await conn.execute("""
                    UNWIND $batch AS item
                    CREATE (p:Product {
                        sku: item.sku,
                        name: item.name,
                        price: item.price,
                        created_at: datetime()
                    })
                """, {'batch': batch})

                total_inserted += len(batch)
                print(f"Inserted {total_inserted}/{len(items)} items")
                await conn.commit()
            except Exception:
                await conn.rollback()
                raise

    return total_inserted
```

### Connection Pooling for Transaction Throughput

```python
from geode_client import ConnectionPool

class TransactionPool:
    def __init__(self, host, port, pool_size=20):
        self.pool = ConnectionPool(
            host=host,
            port=port,
            min_connections=5,
            max_connections=pool_size,
            connection_timeout=30.0,
            idle_timeout=300.0
        )

    async def execute_transaction(self, operations):
        """Execute transaction using pooled connection."""
        conn = await self.pool.acquire()
        try:
            await conn.begin()
            try:
                results = []
                for query, params in operations:
                    result, _ = await conn.query(query, params)
                    results.append([row for row in result.rows])
                await conn.commit()
                return results
            except Exception:
                await conn.rollback()
                raise
        finally:
            await self.pool.release(conn)

# Usage
async def high_throughput_transactions():
    pool = TransactionPool("localhost", 3141, pool_size=50)

    # Execute 10000 concurrent transactions
    tasks = []
    for i in range(10000):
        operations = [
            ("MATCH (u:User {id: $id}) SET u.last_seen = datetime()", {'id': i})
        ]
        task = pool.execute_transaction(operations)
        tasks.append(task)

    results = await asyncio.gather(*tasks)
    print(f"Completed {len(results)} transactions")
```

### Transaction Timeout Configuration

```python
async def transaction_with_timeout(client, timeout_seconds=30):
    """Execute transaction with explicit timeout."""
    try:
        async with asyncio.timeout(timeout_seconds):
            async with client.connection() as conn:
                await conn.begin()
                try:
                    # Long-running operations
                    await conn.execute("""
                        MATCH (n:Node)
                        SET n.processed = true
                    """)

                    # More operations...
                    await conn.commit()
                except Exception:
                    await conn.rollback()
                    raise

    except asyncio.TimeoutError:
        # Explicit rollback happens on exception
        logger.error(f"Transaction exceeded {timeout_seconds}s timeout")
        raise
```

## Transaction Monitoring and Debugging

### Live Transaction Monitoring

```python
class TransactionMonitor:
    """Monitor active transactions and identify issues."""

    def __init__(self, client):
        self.client = client

    async def list_active_transactions(self):
        """List all currently active transactions."""
        result, _ = await self.client.query("""
            CALL dbms.transactions.list()
            YIELD transactionId, username, database,
                  elapsedTime, lockCount, status
            RETURN transactionId,
                   username,
                   duration.inSeconds(elapsedTime) AS seconds,
                   lockCount,
                   status
            ORDER BY elapsedTime DESC
        """)

        return [row for row in result.rows]

    async def find_blocked_transactions(self):
        """Identify transactions waiting on locks."""
        result, _ = await self.client.query("""
            CALL dbms.transactions.list()
            YIELD transactionId, status, waitingOn
            WHERE status = 'BLOCKED'
            RETURN transactionId, waitingOn
        """)

        return [row for row in result.rows]

    async def kill_long_running_transaction(self, tx_id):
        """Terminate a specific transaction."""
        await self.client.execute("""
            CALL dbms.transactions.terminate($tx_id)
        """, {'tx_id': tx_id})

# Usage
async def monitor_transactions():
    monitor = TransactionMonitor(client)

    # Find long-running transactions
    active = await monitor.list_active_transactions()
    for tx in active:
        if tx['seconds'] > 300:  # 5 minutes
            print(f"Long-running tx: {tx['transactionId']} ({tx['seconds']}s)")
            await monitor.kill_long_running_transaction(tx['transactionId'])
```

### Transaction Metrics Collection

```python
from prometheus_client import Counter, Histogram, Gauge

# Metrics
transaction_total = Counter(
    'geode_transactions_total',
    'Total transactions',
    ['status', 'isolation_level']
)

transaction_duration = Histogram(
    'geode_transaction_duration_seconds',
    'Transaction execution time',
    ['isolation_level'],
    buckets=[0.01, 0.1, 0.5, 1.0, 5.0, 10.0, 30.0]
)

active_transactions = Gauge(
    'geode_active_transactions',
    'Number of active transactions'
)

async def instrumented_transaction(client, operations, isolation=None):
    """Execute transaction with metrics collection."""
    active_transactions.inc()
    start_time = time.time()

    try:
        async with client.connection() as conn:
            await conn.begin()
            try:
                for query, params in operations:
                    await conn.execute(query, params)
                await conn.commit()
            except Exception:
                await conn.rollback()
                raise

        duration = time.time() - start_time
        transaction_total.labels(
            status='commit',
            isolation_level=isolation or 'serializable'
        ).inc()
        transaction_duration.labels(
            isolation_level=isolation or 'serializable'
        ).observe(duration)

    except Exception as e:
        transaction_total.labels(
            status='rollback',
            isolation_level=isolation or 'serializable'
        ).inc()
        raise

    finally:
        active_transactions.dec()
```

## Distributed Transaction Coordination

### Cross-Shard Transaction Example

```python
async def cross_shard_transfer(amount, from_account, to_account):
    """Transfer money across database shards."""

    # Determine shards
    from_shard = get_shard_for_account(from_account)
    to_shard = get_shard_for_account(to_account)

    if from_shard == to_shard:
        # Same shard - simple transaction
        async with from_shard.transaction():
            await from_shard.execute("""
                MATCH (from:Account {id: $from_id}),
                      (to:Account {id: $to_id})
                WHERE from.balance >= $amount
                SET from.balance = from.balance - $amount,
                    to.balance = to.balance + $amount
            """, {
                'from_id': from_account,
                'to_id': to_account,
                'amount': amount
            })
    else:
        # Cross-shard - distributed transaction
        coordinator = DistributedTransactionCoordinator()

        async with coordinator.distributed_transaction([from_shard, to_shard]):
            # Debit from source shard
            await from_shard.execute("""
                MATCH (account:Account {id: $id})
                WHERE account.balance >= $amount
                SET account.balance = account.balance - $amount
            """, {'id': from_account, 'amount': amount})

            # Credit to destination shard
            await to_shard.execute("""
                MATCH (account:Account {id: $id})
                SET account.balance = account.balance + $amount
            """, {'id': to_account, 'amount': amount})

            # Coordinator ensures both commit or both rollback
```

## Troubleshooting Transaction Issues

### Diagnosing Deadlocks

```python
async def detect_deadlock_cycle():
    """Identify circular wait dependencies."""
    result, _ = await client.query("""
        CALL dbms.transactions.graph()
        YIELD transaction, waitingFor
        WITH collect({tx: transaction, waits: waitingFor}) AS dependencies

        // Find cycles
        WITH dependencies
        UNWIND dependencies AS d1
        UNWIND dependencies AS d2
        WHERE d1.tx = d2.waits AND d2.tx = d1.waits
        RETURN DISTINCT d1.tx AS tx1, d2.tx AS tx2
    """)

    cycles = [row for row in result.rows]
    if cycles:
        print("Deadlock detected!")
        for cycle in cycles:
            print(f"  {cycle['tx1']} ↔ {cycle['tx2']}")

    return cycles
```

### Resolving High Abort Rates

```python
async def analyze_transaction_conflicts():
    """Analyze conflict patterns to reduce abort rate."""

    # Identify hot spots (frequently conflicted entities)
    result, _ = await client.query("""
        CALL dbms.conflicts.summary()
        YIELD entity, conflictCount, avgRetries
        WHERE conflictCount > 100
        RETURN entity, conflictCount, avgRetries
        ORDER BY conflictCount DESC
        LIMIT 20
    """)

    hotspots = [row for row in result.rows]

    # Recommendations
    for hotspot in hotspots:
        entity = hotspot['entity']
        conflicts = hotspot['conflictCount']
        retries = hotspot['avgRetries']

        print(f"Hot spot: {entity}")
        print(f"  Conflicts: {conflicts}")
        print(f"  Avg retries: {retries}")
        print(f"  Recommendation: Consider sharding or using queuing")
```

## Further Reading

- ISO/IEC 39075:2024 GQL Transaction Semantics
- Transaction Processing: Concepts and Techniques
- Geode Architecture: MVCC Implementation
- Distributed Transaction Coordination
- Performance Tuning Guide
