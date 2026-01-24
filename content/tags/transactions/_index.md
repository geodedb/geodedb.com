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

## Further Reading

- ISO/IEC 39075:2024 GQL Transaction Semantics
- Transaction Processing: Concepts and Techniques
- Geode Architecture: MVCC Implementation
- Distributed Transaction Coordination
- Performance Tuning Guide
