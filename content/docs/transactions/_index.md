---
title: "Transactions"
description: "ACID transactions with MVCC, isolation levels, and transaction patterns for Geode graph database"
summary: "Comprehensive transaction documentation covering ACID guarantees, MVCC implementation, six isolation levels, savepoints, and transaction patterns."
weight: 45
keywords:
  - transactions
  - ACID
  - MVCC
  - isolation levels
  - serializable
  - snapshot isolation
  - savepoints
  - transaction patterns
tags:
  - transactions
  - ACID
  - concurrency
  - isolation
categories:
  - core-concepts
  - advanced-features
toc: true
params:
  seo:
    keywords: "ACID transactions, MVCC, isolation levels, serializable, snapshot isolation, transaction patterns"
    description: "Complete transaction guide for Geode covering ACID guarantees, MVCC, six isolation levels, and transaction patterns"
---

# Transactions

Geode provides full ACID transaction guarantees with Multi-Version Concurrency Control (MVCC) and six isolation levels ranging from Read Uncommitted to Linearizable.

## Overview

Transactions ensure data consistency and integrity even in the presence of concurrent access, system failures, and application errors. Geode's transaction system combines ACID guarantees with high performance using MVCC (Multi-Version Concurrency Control) and Serializable Snapshot Isolation (SSI).

Whether you're executing a single query or coordinating complex multi-step operations, Geode's transaction support ensures your data remains consistent. Choose from six isolation levels to balance consistency requirements with performance needs.

## ACID Guarantees

### Atomicity

All operations in a transaction succeed or fail as a unit:

```gql
-- Begin transaction
BEGIN;

-- Multiple operations (all or nothing)
CREATE (:Person {name: 'Alice', email: 'alice@example.com'});
CREATE (:Person {name: 'Bob', email: 'bob@example.com'});
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
CREATE (a)-[:KNOWS]->(b);

-- Commit (all changes applied) or Rollback (nothing applied)
COMMIT;
```

If any operation fails or ROLLBACK is called, all changes are discarded.

### Consistency

Transactions move the database from one consistent state to another:

```gql
BEGIN;

-- Constraints enforced within transaction
CREATE (:Person {email: 'alice@example.com'});
-- This fails if email uniqueness constraint exists
CREATE (:Person {email: 'alice@example.com'});

ROLLBACK;  -- Database remains consistent
```

### Isolation

Concurrent transactions don't interfere with each other:

```gql
-- Transaction 1
BEGIN;
MATCH (p:Person {name: 'Alice'})
SET p.age = 31;
-- Transaction 2 doesn't see uncommitted change
COMMIT;
```

Geode provides six isolation levels for different consistency requirements.

### Durability

Committed transactions survive system failures:

```gql
BEGIN;
CREATE (:Person {name: 'Alice'});
COMMIT;  -- Guaranteed durable via WAL

-- Even if system crashes immediately after COMMIT,
-- Alice will exist after recovery
```

Write-Ahead Logging (WAL) ensures durability with point-in-time recovery.

## Topics in This Section

- **[Transaction Overview](overview/)** - Complete transaction guide covering ACID properties, MVCC architecture, and transaction lifecycle
- **[Advanced Patterns](advanced-patterns/)** - Advanced transaction patterns including savepoints, nested transactions, and optimistic concurrency control

## Isolation Levels

Geode supports six isolation levels:

### 1. Read Uncommitted

**Dirty reads allowed**: See uncommitted changes from other transactions.

```gql
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
BEGIN;
-- May see uncommitted changes
MATCH (p:Person) RETURN p.name;
COMMIT;
```

**Use Cases**: Analytics queries where approximate data is acceptable.

### 2. Read Committed

**Default**: Only see committed changes.

```gql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN;
-- Only sees committed data
MATCH (p:Person) RETURN p.name;
COMMIT;
```

**Use Cases**: General-purpose transactions, web applications.

### 3. Repeatable Read

**No non-repeatable reads**: Same query returns same results within transaction.

```gql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;
MATCH (p:Person) RETURN count(*);  -- Returns N
-- Other transactions commit changes
MATCH (p:Person) RETURN count(*);  -- Still returns N
COMMIT;
```

**Use Cases**: Reports, financial calculations requiring consistency.

### 4. Snapshot

**Point-in-time snapshot**: Transaction sees database state at BEGIN time.

```gql
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;
BEGIN;
-- Transaction sees snapshot from BEGIN time
MATCH (p:Person) RETURN p.name;
COMMIT;
```

**Use Cases**: Long-running read transactions, backups.

### 5. Serializable (Default)

**Serializable Snapshot Isolation (SSI)**: Prevents all anomalies including phantoms.

```gql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
-- Guaranteed serializable execution
MATCH (p:Person) WHERE p.age > 30
CREATE (:Report {count: count(p)});
COMMIT;
```

**Use Cases**: Financial transactions, inventory management.

### 6. Linearizable

**Strongest isolation**: Real-time ordering with external consistency.

```gql
SET TRANSACTION ISOLATION LEVEL LINEARIZABLE;
BEGIN;
-- Guaranteed real-time ordering
CREATE (:Order {timestamp: now()});
COMMIT;
```

**Use Cases**: Distributed systems requiring strict ordering.

## MVCC Architecture

Multi-Version Concurrency Control enables high concurrency:

### How MVCC Works

1. **Version Creation**: Each update creates new version of data
2. **Visibility**: Transactions see appropriate version based on isolation level
3. **No Read Locks**: Readers never block writers
4. **No Write Locks**: Writers don't block readers (different rows)
5. **Garbage Collection**: Old versions cleaned up when no longer needed

### Benefits

- **High Concurrency**: Readers and writers don't block each other
- **Consistent Snapshots**: Transactions see consistent database state
- **No Deadlocks**: For read-only transactions
- **Time-Travel**: Historical queries possible

**See**: [Transaction Overview](overview/#mvcc-architecture)

## Transaction Lifecycle

### Basic Transaction

```gql
-- 1. Begin transaction
BEGIN;

-- 2. Execute operations
MATCH (p:Person {name: 'Alice'})
SET p.age = 31;

CREATE (:AuditLog {
  action: 'UPDATE',
  user: 'admin',
  timestamp: now()
});

-- 3. Commit or rollback
COMMIT;  -- Apply all changes
-- OR
ROLLBACK;  -- Discard all changes
```

### Auto-Commit Mode

Single statements auto-commit:

```gql
-- Implicitly wrapped in BEGIN...COMMIT
CREATE (:Person {name: 'Alice'});
```

Equivalent to:
```gql
BEGIN;
CREATE (:Person {name: 'Alice'});
COMMIT;
```

### Explicit Transactions

Multiple statements in one transaction:

```gql
BEGIN;
-- Statement 1
CREATE (:Person {name: 'Alice'});
-- Statement 2
CREATE (:Person {name: 'Bob'});
-- Statement 3
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
CREATE (a)-[:KNOWS]->(b);
COMMIT;
```

## Savepoints

Create rollback points within transactions:

```gql
BEGIN;

-- Create person
CREATE (:Person {name: 'Alice', email: 'alice@example.com'});

-- Savepoint after person creation
SAVEPOINT person_created;

-- Create order (might fail)
CREATE (:Order {customer: 'Alice', total: 100.00});

-- If order creation fails, rollback to savepoint
ROLLBACK TO SAVEPOINT person_created;

-- Person still exists, order doesn't
COMMIT;
```

**Use Cases**:
- Partial rollback on errors
- Nested transaction simulation
- Complex multi-step operations

**See**: [Advanced Patterns](advanced-patterns/#savepoints)

## Transaction Patterns

### Optimistic Concurrency Control

```gql
-- 1. Read with version
MATCH (p:Product {id: 123})
RETURN p.stock, p.version;

-- 2. Business logic (outside database)
new_stock = current_stock - quantity;

-- 3. Update with version check
MATCH (p:Product {id: 123})
WHERE p.version = $read_version
SET p.stock = $new_stock,
    p.version = p.version + 1;

-- If version doesn't match, retry
```

### Pessimistic Locking

```gql
BEGIN;

-- Lock row for update
MATCH (p:Product {id: 123})
SET p.locked = true;

-- Perform operations
SET p.stock = p.stock - 1;

-- Unlock
SET p.locked = false;

COMMIT;
```

### Retry Pattern

```python
def execute_with_retry(query, max_retries=3):
    for attempt in range(max_retries):
        try:
            with client.transaction() as tx:
                result = tx.query(query)
                tx.commit()
                return result
        except SerializationError:
            if attempt == max_retries - 1:
                raise
            # Exponential backoff
            time.sleep(2 ** attempt)
```

### Batch Processing

```gql
BEGIN;

-- Process in batches to avoid long-running transactions
MATCH (p:Person)
WHERE p.processed = false
WITH p LIMIT 1000
SET p.processed = true,
    p.processed_at = now();

COMMIT;

-- Repeat until all processed
```

**See**: [Advanced Patterns](advanced-patterns/) for more patterns.

## Error Handling

### Transaction Errors

```gql
BEGIN;

-- First operation succeeds
CREATE (:Person {name: 'Alice'});

-- Second operation fails (constraint violation)
CREATE (:Person {email: 'alice@example.com'});  -- Duplicate
-- Error: Unique constraint violation

-- Entire transaction rolls back automatically
-- Alice is NOT created
```

### Serialization Errors

```gql
BEGIN;

-- Read data
MATCH (p:Product {id: 123}) RETURN p.stock;

-- Another transaction updates same product

-- Update fails with serialization error
MATCH (p:Product {id: 123})
SET p.stock = p.stock - 1;
-- Error: Serialization failure, retry transaction

ROLLBACK;
```

**Solution**: Retry with exponential backoff.

### Deadlock Detection

```gql
-- Transaction 1
BEGIN;
MATCH (a:Account {id: 1}) SET a.balance = a.balance - 100;
-- Transaction 2 locks account 2

MATCH (b:Account {id: 2}) SET b.balance = b.balance + 100;
-- Deadlock detected!
-- Error: Deadlock detected, transaction aborted

ROLLBACK;
```

Geode automatically detects and resolves deadlocks.

## Performance Considerations

### Transaction Size

- **Keep Transactions Small**: Large transactions increase conflict probability
- **Batch Appropriately**: Balance between transaction overhead and size
- **Avoid Long-Running Transactions**: Blocks MVCC garbage collection

### Isolation Level Trade-offs

| Isolation Level | Consistency | Concurrency | Use Case |
|----------------|-------------|-------------|----------|
| Read Uncommitted | Lowest | Highest | Analytics |
| Read Committed | Medium | High | Web apps |
| Repeatable Read | High | Medium | Reports |
| Snapshot | High | Medium | Backups |
| Serializable | Highest | Low | Financial |
| Linearizable | Strongest | Lowest | Distributed |

### Monitoring

```gql
-- Check active transactions
SELECT * FROM system.active_transactions;

-- Check transaction conflicts
SELECT * FROM system.transaction_conflicts;

-- Average transaction duration
SELECT avg(duration) FROM system.completed_transactions;
```

## Best Practices

### Transaction Design

- **Keep transactions short**: Minimize hold time
- **Choose appropriate isolation level**: Balance consistency and performance
- **Handle serialization errors**: Implement retry logic
- **Use savepoints**: For partial rollback capability
- **Avoid user interaction**: Within transaction scope

### Error Handling

- **Always use try/finally**: Ensure rollback on errors
- **Retry serialization errors**: With exponential backoff
- **Log transaction failures**: For debugging and monitoring
- **Set transaction timeout**: Prevent runaway transactions

### Testing

- **Test concurrent scenarios**: Simulate concurrent users
- **Test failure scenarios**: Rollback, serialization errors
- **Load test**: Measure transaction throughput
- **Monitor metrics**: Track transaction duration and conflicts

## Learn More

- [Transaction Overview](overview/) - Complete transaction guide
- [Advanced Patterns](advanced-patterns/) - Savepoints and advanced patterns
- [Architecture: Transaction Management](/docs/architecture/#storage-engine) - MVCC implementation
- [Performance Tuning](/docs/query/performance-tuning/) - Optimize transaction performance
- [Client Libraries](/docs/client-libraries/) - Language-specific transaction APIs

## Examples

### Transfer Between Accounts

```gql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Deduct from source account
MATCH (source:Account {id: $from_account})
WHERE source.balance >= $amount
SET source.balance = source.balance - $amount;

-- Add to destination account
MATCH (dest:Account {id: $to_account})
SET dest.balance = dest.balance + $amount;

-- Create audit trail
CREATE (:Transaction {
  from: $from_account,
  to: $to_account,
  amount: $amount,
  timestamp: now()
});

COMMIT;
```

### Inventory Management

```gql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Check stock availability
MATCH (p:Product {sku: $product_sku})
WHERE p.stock >= $quantity
SET p.stock = p.stock - $quantity;

-- Create order
CREATE (o:Order {
  order_id: $order_id,
  product_sku: $product_sku,
  quantity: $quantity,
  created_at: now()
});

-- Link to customer
MATCH (c:Customer {id: $customer_id})
CREATE (c)-[:PLACED]->(o);

COMMIT;
```

## Next Steps

1. **[Read Transaction Overview](overview/)** - Understand transaction fundamentals
2. **[Learn Advanced Patterns](advanced-patterns/)** - Master savepoints and patterns
3. **[Practice with Tutorials](/docs/tutorials/transaction-patterns-tutorial/)** - Hands-on examples
4. **[Optimize Performance](/docs/query/performance-tuning/)** - Transaction performance tuning
