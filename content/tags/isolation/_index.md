---
title: "Transaction Isolation"
description: "Comprehensive guide to transaction isolation in Geode. Learn about isolation levels, concurrency control, ACID guarantees, and best practices for consistent graph database operations."
keywords:
  - transaction isolation
  - isolation levels
  - ACID
  - concurrency control
  - read committed
  - repeatable read
  - serializable
  - snapshot isolation
  - Geode
  - graph database
  - transactions
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/isolation/"
    noindex: false
    title: "Transaction Isolation - Geode Graph Database"
    description: "Understand transaction isolation in Geode. Full ACID compliance with configurable isolation levels, snapshot isolation, and optimistic concurrency control for graph operations."
---

Transaction isolation in Geode ensures that concurrent transactions execute correctly without interference, maintaining data consistency and integrity. Geode implements full ACID guarantees with configurable isolation levels to balance consistency requirements with performance needs.

## Isolation Fundamentals

Transaction isolation prevents concurrent transactions from interfering with each other, addressing phenomena like:

- **Dirty Reads**: Reading uncommitted changes from other transactions
- **Non-Repeatable Reads**: Reading different values for the same data within a transaction
- **Phantom Reads**: Seeing different sets of rows when repeating a query
- **Lost Updates**: Concurrent updates overwriting each other
- **Write Skew**: Concurrent transactions violating invariants

Geode provides multiple isolation levels to prevent these phenomena based on your application requirements.

## Isolation Levels

Geode supports four standard isolation levels defined by the SQL standard, plus an enhanced snapshot isolation level:

### Read Uncommitted

Lowest isolation level, allows dirty reads. Not recommended for production use.

```gql
-- Begin transaction with read uncommitted (not recommended)
BEGIN TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

-- Can see uncommitted changes from other transactions
MATCH (p:Person)
RETURN p.name, p.balance;

COMMIT;
```

**Phenomena Prevented**: None
**Performance**: Highest
**Use Case**: Approximate queries where consistency is not critical

### Read Committed (Default)

Prevents dirty reads by only reading committed data. Default isolation level in Geode.

```gql
-- Begin transaction with read committed (default)
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Only sees committed data, but may see different values on repeated reads
MATCH (p:Person {id: $person_id})
RETURN p.balance;

-- If another transaction commits a balance update, next read may see different value
MATCH (p:Person {id: $person_id})
RETURN p.balance;  -- May return different balance

COMMIT;
```

**Phenomena Prevented**: Dirty reads
**Performance**: High
**Use Case**: Most applications where consistency within a transaction is needed

### Repeatable Read

Prevents dirty reads and non-repeatable reads. Same data returns same values throughout transaction.

```gql
-- Begin transaction with repeatable read
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- First read
MATCH (p:Person {id: $person_id})
RETURN p.balance;

-- Guaranteed to return the same balance even if another transaction commits changes
MATCH (p:Person {id: $person_id})
RETURN p.balance;  -- Same value as first read

COMMIT;
```

**Phenomena Prevented**: Dirty reads, non-repeatable reads
**Performance**: Medium
**Use Case**: Reports and analytics requiring consistent snapshots

### Snapshot Isolation (Recommended)

Geode's enhanced isolation level using multi-version concurrency control (MVCC). Provides excellent balance of consistency and performance.

```gql
-- Begin transaction with snapshot isolation (recommended)
BEGIN TRANSACTION ISOLATION LEVEL SNAPSHOT;

-- Sees a consistent snapshot of the database as of transaction start
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
WHERE c.industry = 'technology'
RETURN count(p) AS tech_workers;

-- Another transaction inserts new Person nodes
-- This query still sees the original snapshot
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
WHERE c.industry = 'technology'
RETURN count(p) AS tech_workers;  -- Same count as before

COMMIT;
```

**Phenomena Prevented**: Dirty reads, non-repeatable reads, phantom reads
**Performance**: High (uses MVCC, no read locks)
**Use Case**: Most enterprise applications, recommended default

### Serializable

Strictest isolation level, guarantees transactions execute as if run serially.

```gql
-- Begin transaction with serializable isolation
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Check inventory level
MATCH (p:Product {sku: $sku})
WHERE p.inventory > $quantity
RETURN p.inventory;

-- Reserve inventory
MATCH (p:Product {sku: $sku})
SET p.inventory = p.inventory - $quantity;

-- No other transaction can modify this product concurrently
-- Prevents write skew anomalies

COMMIT;
```

**Phenomena Prevented**: All (dirty reads, non-repeatable reads, phantom reads, write skew)
**Performance**: Lower (uses pessimistic locking)
**Use Case**: Financial transactions, inventory management, critical operations

## Concurrency Control

Geode uses different concurrency control mechanisms depending on isolation level:

### Multi-Version Concurrency Control (MVCC)

Used for snapshot isolation and repeatable read:

```
Transaction Timeline:
T1: BEGIN (snapshot at timestamp 100)
T2: BEGIN (snapshot at timestamp 101)
T1: MATCH (p:Person {id: 1}) RETURN p.balance  -- Reads version at timestamp 100
T2: MATCH (p:Person {id: 1}) SET p.balance = 500  -- Creates new version at timestamp 101
T2: COMMIT (version 101 becomes visible)
T1: MATCH (p:Person {id: 1}) RETURN p.balance  -- Still reads version at timestamp 100
T1: COMMIT
```

Benefits of MVCC:
- Readers never block writers
- Writers never block readers
- No read locks required
- Excellent concurrency for read-heavy workloads

### Pessimistic Locking

Used for serializable isolation:

```gql
-- Serializable isolation uses locks
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Acquires shared lock for reads
MATCH (a:Account {id: $account_id})
RETURN a.balance;

-- Acquires exclusive lock for writes
MATCH (a:Account {id: $account_id})
SET a.balance = a.balance - $amount;

-- Locks held until commit
COMMIT;  -- Releases all locks
```

Lock types:
- **Shared locks (S)**: Multiple transactions can hold shared locks simultaneously for reads
- **Exclusive locks (X)**: Only one transaction can hold an exclusive lock for writes
- **Intent locks**: Hierarchical locks on graphs/nodes to improve performance

### Optimistic Concurrency Control

Used for high-contention scenarios with snapshot isolation:

```gql
-- Optimistic approach with version checking
BEGIN TRANSACTION ISOLATION LEVEL SNAPSHOT;

-- Read current version
MATCH (p:Product {sku: $sku})
RETURN p.inventory, p.version;

-- Update with version check
MATCH (p:Product {sku: $sku})
WHERE p.version = $expected_version
SET p.inventory = $new_inventory,
    p.version = $expected_version + 1;

-- If another transaction updated first, WHERE clause fails
-- Transaction can detect conflict and retry

COMMIT;
```

## Practical Examples

### Preventing Lost Updates

Without proper isolation, concurrent updates can be lost:

```gql
-- Transaction 1: Transfer from Account A to B
BEGIN;
MATCH (a:Account {id: 'A'})
SET a.balance = a.balance - 100;  -- Balance: $1000 -> $900
COMMIT;

-- Transaction 2: Transfer from Account A to C (concurrent)
BEGIN;
MATCH (a:Account {id: 'A'})
SET a.balance = a.balance - 50;   -- Reads $1000, sets to $950 (loses T1's update!)
COMMIT;
```

Use proper isolation to prevent:

```gql
-- Transaction 1 with serializable isolation
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
MATCH (a:Account {id: 'A'})
SET a.balance = a.balance - 100;
COMMIT;

-- Transaction 2 blocks until T1 completes
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
MATCH (a:Account {id: 'A'})  -- Waits for T1 to commit
SET a.balance = a.balance - 50;  -- Now correctly sees $900, sets to $850
COMMIT;
```

### Preventing Phantom Reads

```gql
-- Transaction 1: Count high-value customers
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
MATCH (c:Customer)
WHERE c.lifetime_value > 10000
RETURN count(c);  -- Returns 5

-- Transaction 2: Add new high-value customer (concurrent)
BEGIN;
CREATE (:Customer {name: 'New VIP', lifetime_value: 15000});
COMMIT;

-- Transaction 1: Repeat count
MATCH (c:Customer)
WHERE c.lifetime_value > 10000
RETURN count(c);  -- Returns 6 (phantom read!)
COMMIT;
```

Prevent with snapshot isolation:

```gql
-- Transaction 1 with snapshot isolation
BEGIN TRANSACTION ISOLATION LEVEL SNAPSHOT;
MATCH (c:Customer)
WHERE c.lifetime_value > 10000
RETURN count(c);  -- Returns 5

-- Transaction 2: Add new high-value customer (concurrent)
BEGIN;
CREATE (:Customer {name: 'New VIP', lifetime_value: 15000});
COMMIT;

-- Transaction 1: Repeat count sees same snapshot
MATCH (c:Customer)
WHERE c.lifetime_value > 10000
RETURN count(c);  -- Still returns 5 (no phantom)
COMMIT;
```

### Preventing Write Skew

Write skew occurs when concurrent transactions read overlapping data and make conflicting updates:

```gql
-- Constraint: At least one doctor must be on call
-- Initially: Doctor A and B are both on call

-- Transaction 1: Doctor A goes off call
BEGIN TRANSACTION ISOLATION LEVEL SNAPSHOT;
MATCH (d:Doctor)
WHERE d.on_call = true
RETURN count(d);  -- Returns 2, seems safe to go off call
MATCH (da:Doctor {name: 'Dr. A'})
SET da.on_call = false;
-- Now only 1 doctor on call (still safe)
COMMIT;

-- Transaction 2: Doctor B goes off call (concurrent)
BEGIN TRANSACTION ISOLATION LEVEL SNAPSHOT;
MATCH (d:Doctor)
WHERE d.on_call = true
RETURN count(d);  -- Returns 2, seems safe to go off call
MATCH (db:Doctor {name: 'Dr. B'})
SET db.on_call = false;
-- Now 0 doctors on call (constraint violated!)
COMMIT;
```

Prevent with serializable isolation:

```gql
-- Transaction 1 with serializable
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
MATCH (d:Doctor)
WHERE d.on_call = true
RETURN count(d);  -- Returns 2
MATCH (da:Doctor {name: 'Dr. A'})
SET da.on_call = false;
COMMIT;

-- Transaction 2 blocks until T1 completes
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
MATCH (d:Doctor)
WHERE d.on_call = true
RETURN count(d);  -- Returns 1 (after T1 committed)
-- Sees constraint would be violated, can abort
ROLLBACK;
```

## Configuration

### Setting Default Isolation Level

```bash
# Set default isolation level for all connections
geode serve --default-isolation-level=snapshot

# Per-connection isolation level
geode shell --isolation-level=serializable
```

### Isolation Level Per Session

```gql
-- Change isolation level for current session
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;

-- All subsequent transactions use snapshot isolation
BEGIN;
MATCH (p:Person) RETURN p;
COMMIT;

-- Reset to default
SET TRANSACTION ISOLATION LEVEL DEFAULT;
```

### Deadlock Detection

```bash
# Configure deadlock detection
geode serve --deadlock-detection=enabled \
  --deadlock-timeout=10s \
  --deadlock-retry-attempts=3
```

When deadlock is detected:

```gql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- Transaction acquires locks that create a deadlock cycle
-- Geode detects deadlock after timeout
-- Error: Deadlock detected, transaction aborted

-- Application should retry
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- Retry logic
COMMIT;
```

## Performance Considerations

### Choosing the Right Isolation Level

| Isolation Level | Read Throughput | Write Throughput | Latency | Consistency |
|----------------|-----------------|------------------|---------|-------------|
| Read Uncommitted | Highest | Highest | Lowest | Lowest |
| Read Committed | High | High | Low | Medium |
| Repeatable Read | Medium | Medium | Medium | High |
| Snapshot | High | High | Low | High |
| Serializable | Low | Low | High | Highest |

### Performance Best Practices

1. **Use Snapshot Isolation for most workloads**: Best balance of consistency and performance
2. **Reserve Serializable for critical operations**: Financial transactions, inventory management
3. **Keep transactions short**: Reduces lock contention and blocking
4. **Read before write**: Minimize time holding write locks
5. **Batch operations**: Group related updates into single transaction
6. **Avoid long-running transactions**: Can block other transactions and prevent garbage collection

### Monitoring Isolation Performance

```bash
# Monitor transaction statistics
geode stats --component=transactions \
  --metrics=isolation_level,conflicts,retries,deadlocks

# Example output:
# Isolation Level | Transactions | Conflicts | Retries | Deadlocks
# READ_COMMITTED  | 1,234,567   | 45        | 12      | 0
# SNAPSHOT        | 5,678,901   | 234       | 67      | 0
# SERIALIZABLE    | 123,456     | 1,234     | 456     | 12
```

## Troubleshooting

### High Conflict Rate

If seeing many conflicts with snapshot/serializable isolation:

1. **Reduce transaction scope**: Break large transactions into smaller ones
2. **Increase retry logic**: Implement exponential backoff for retries
3. **Consider read committed**: If strict consistency not required
4. **Partition data**: Reduce contention by sharding hot data

### Deadlocks

If experiencing deadlocks:

1. **Access resources in consistent order**: Always lock nodes/relationships in same order
2. **Reduce lock hold time**: Keep transactions as short as possible
3. **Lower isolation level**: Use snapshot instead of serializable if possible
4. **Implement retry logic**: Automatically retry deadlocked transactions

### Performance Degradation

If isolation causing performance issues:

1. **Profile transactions**: Identify which transactions are slowest
2. **Reduce isolation level**: Use lowest level that meets consistency requirements
3. **Optimize queries**: Ensure efficient query plans to reduce lock time
4. **Scale horizontally**: Add more replicas for read-heavy workloads

## Related Topics

- [Transactions](/tags/transactions/) - Transaction management and ACID properties
- [Data Integrity](/tags/data-integrity/) - Ensuring data consistency
- [Sessions](/tags/sessions/) - Session management and connection settings
- [Configuration](/tags/configuration/) - Transaction configuration options
- [Performance](/docs/performance/) - Performance tuning and optimization
- [Concurrency](/docs/advanced/concurrency/) - Concurrency control mechanisms
- [ACID Guarantees](/docs/fundamentals/acid/) - ACID transaction properties
