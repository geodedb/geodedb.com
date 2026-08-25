---
title: "Tag: ACID Transactions"
description: "Explore Geode documentation tagged with acid. Learn about acid features, best practices, and implementation details."
keywords:
  - acid
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/acid/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Documentation tagged with **ACID Transactions** in the Geode graph database. ACID (Atomicity, Consistency, Isolation, Durability) represents the fundamental guarantees that make database transactions reliable, ensuring data integrity even in the face of failures, concurrent access, and system crashes.

## Introduction to ACID

ACID is the cornerstone of reliable data management. Coined by Andreas Reuter and Theo Härder in 1983, the ACID acronym describes four essential properties that transaction processing systems must provide to ensure data remains consistent and reliable:

- **Atomicity**: Transactions are all-or-nothing operations
- **Consistency**: Transactions move the database from one valid state to another
- **Isolation**: Concurrent transactions don't interfere with each other
- **Durability**: Committed data survives system failures

These properties matter profoundly in real-world systems. Without atomicity, partial updates could leave data in invalid states. Without consistency, business rules could be violated. Without isolation, concurrent users could corrupt each other's work. Without durability, committed work could vanish in a crash.

Geode implements full ACID semantics, making it suitable for mission-critical applications where correctness cannot be compromised. This positions Geode alongside traditional RDBMS systems in terms of reliability while providing the flexibility and performance of a native graph database.

## The Four ACID Properties

### Atomicity: All or Nothing

Atomicity means transactions execute completely or not at all. If any part of a transaction fails, the entire transaction rolls back, leaving no partial effects.

```gql
BEGIN TRANSACTION;

-- Transfer $100 between accounts
MATCH (from:Account {id: $fromId})
WHERE from.balance >= 100
SET from.balance = from.balance - 100;

MATCH (to:Account {id: $toId})
SET to.balance = to.balance + 100;

-- If this fails, everything rolls back
INSERT (:AuditLog {
  timestamp: datetime(),
  from: $fromId,
  to: $toId,
  amount: 100
});

COMMIT; -- Either all succeed or all fail
```

If the audit log insertion fails, atomicity guarantees that the account balances remain unchanged. The money doesn't disappear into the ether.

**Implementation in Geode**: Geode uses Write-Ahead Logging (WAL) to implement atomicity. All transaction operations are recorded in the WAL before being applied. On rollback, Geode reads the WAL to undo all changes. On crash, Geode replays or rolls back incomplete transactions during recovery.

### Consistency: Validity Preservation

Consistency means transactions transform the database from one valid state to another, preserving all integrity constraints, business rules, and invariants.

```gql
-- Consistency example: Referential integrity
BEGIN TRANSACTION;

-- Delete an order
MATCH (order:Order {id: $orderId})
DELETE order;

-- Must also delete related line items (constraint)
MATCH (lineItem:LineItem)-[:BELONGS_TO]->(:Order {id: $orderId})
DELETE lineItem;

COMMIT; -- Database remains consistent
```

Consistency also includes application-level constraints:

```gql
-- Business rule: Total allocation cannot exceed 100%
BEGIN TRANSACTION;

MATCH (portfolio:Portfolio {id: $portfolioId})-[:HOLDS]->(asset:Asset)
WITH portfolio, sum(asset.allocation) AS total_allocation
WHERE total_allocation + $newAllocation <= 100

INSERT (portfolio)-[:HOLDS]->(:Asset {
  name: $assetName,
  allocation: $newAllocation
});

COMMIT;
```

**Implementation in Geode**: Geode enforces consistency through:

- Constraint checking (uniqueness, type constraints, schema validation)
- Trigger execution (pre-commit and post-commit hooks)
- Transaction validation before commit
- Application-level constraint checking in WHERE clauses

### Isolation: Concurrent Independence

Isolation means concurrent transactions behave as if they executed serially. One transaction's intermediate states are invisible to others.

Geode supports multiple isolation levels:

**Read Committed**: See only committed data

```gql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
-- Won't see uncommitted changes from other transactions
BEGIN;
MATCH (p:Product {sku: $sku}) RETURN p.quantity;
COMMIT;
```

**Snapshot Isolation**: See consistent snapshot from transaction start

```gql
SET TRANSACTION ISOLATION LEVEL SNAPSHOT;
BEGIN;
-- Transaction sees consistent snapshot, immune to concurrent updates
MATCH (account:Account) RETURN sum(account.balance) AS total;
-- This sum won't change during transaction, even if balances update
COMMIT;
```

**Serializable**: Strongest isolation, prevents all anomalies

```gql
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
BEGIN;
-- Guaranteed serializable execution
MATCH (inventory:Product {sku: $sku})
WHERE inventory.quantity >= $qty
SET inventory.quantity = inventory.quantity - $qty;
COMMIT;
```

**Implementation in Geode**: Isolation is implemented through Multi-Version Concurrency Control (MVCC) and Serializable Snapshot Isolation (SSI). Each transaction operates on a consistent snapshot, and Geode detects dangerous dependency structures to prevent anomalies.

### Durability: Persistence Guarantee

Durability guarantees that once a transaction commits, its changes persist even if the system immediately crashes.

```gql
BEGIN TRANSACTION;
INSERT (:CriticalOrder {id: $orderId, amount: $amount});
COMMIT; -- From this point, data survives any failure
```

Even if the server crashes one nanosecond after COMMIT returns, the order will still exist after recovery.

**Implementation in Geode**: Durability is achieved through:

1. **Write-Ahead Logging**: All changes written to persistent WAL before commit
2. **fsync()**: Forcing data to physical storage media
3. **Checkpointing**: Periodic snapshots of database state
4. **Replication**: Synchronous replication to multiple nodes (in distributed mode)

## ACID in Geode's Architecture

### Transaction Lifecycle

1. **BEGIN**: Allocate transaction ID, capture snapshot timestamp
2. **Execution**: Read data from snapshot, write new versions to WAL
3. **Validation**: Check constraints, detect conflicts, verify isolation
4. **Commit**: Flush WAL to disk, make versions visible, return success
5. **Cleanup**: Garbage collect old versions, update indexes

### Write-Ahead Logging (WAL)

Every modification is logged before being applied:

```
WAL Entry Format:
[TxID][LSN][Operation][Before Image][After Image][Checksum]

Example:
[tx-12345][lsn-98765][SET][{balance: 100}][{balance: 200}][crc32]
```

On commit, Geode calls `fsync()` to ensure WAL reaches physical media. Only then does commit return to the client.

### MVCC and Isolation

Geode maintains multiple versions of each data item, timestamped with transaction IDs. This allows:

- Readers to access consistent snapshots without blocking writers
- Writers to create new versions without blocking readers
- Time-travel queries to historical states

### Crash Recovery

On restart after a crash, Geode:

1. Reads WAL from last checkpoint
2. Identifies incomplete transactions
3. Rolls back uncommitted transactions
4. Replays committed transactions
5. Rebuilds in-memory structures

This guarantees that all committed data is recovered.

## Use Cases for ACID Transactions

### Financial Systems

Banking, trading, and payment processing require absolute correctness:

```gql
-- Multi-party atomic transfer
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

MATCH (account1:Account {id: $account1})
WHERE account1.balance >= $amount1
SET account1.balance = account1.balance - $amount1;

MATCH (account2:Account {id: $account2})
WHERE account2.balance >= $amount2
SET account2.balance = account2.balance - $amount2;

MATCH (account3:Account {id: $account3})
SET account3.balance = account3.balance + $amount1 + $amount2;

INSERT (:Transaction {
  id: $txId,
  timestamp: datetime(),
  accounts: [$account1, $account2, $account3],
  amounts: [$amount1, $amount2]
});

COMMIT;
```

ACID guarantees no money is created or destroyed, even with concurrent transactions or failures.

### E-Commerce

Order processing, inventory management, and payment processing:

```gql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Check inventory
MATCH (product:Product {sku: $sku})
WHERE product.quantity >= $orderQty
SET product.quantity = product.quantity - $orderQty;

-- Create order
INSERT (order:Order {
  id: $orderId,
  customer: $customerId,
  total: $total,
  timestamp: datetime()
});

-- Create line items
INSERT (order)-[:CONTAINS]->(:LineItem {
  product: $sku,
  quantity: $orderQty,
  price: $price
});

-- Process payment
INSERT (order)-[:PAID_BY]->(:Payment {
  method: $paymentMethod,
  amount: $total,
  status: 'COMPLETED'
});

COMMIT;
```

ACID prevents overselling, duplicate orders, and payment inconsistencies.

### Healthcare Records

Medical records require strict consistency and audit trails:

```gql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Update patient record
MATCH (patient:Patient {mrn: $mrn})
SET patient.lastVisit = datetime(),
    patient.primaryPhysician = $physicianId;

-- Add diagnosis
INSERT (patient)-[:DIAGNOSED_WITH {
  date: datetime(),
  physician: $physicianId,
  icd10: $icd10Code
}]->(:Condition {name: $conditionName});

-- Log access for HIPAA compliance
INSERT (:AuditLog {
  timestamp: datetime(),
  user: $userId,
  action: 'UPDATE_PATIENT_RECORD',
  patient: $mrn
});

COMMIT;
```

ACID ensures medical records remain consistent and auditable.

## Best Practices

### Transaction Boundaries

Keep transactions as short as possible:

```gql
-- Good: Focused transaction
BEGIN;
MATCH (inventory:Product {sku: $sku})
SET inventory.quantity = inventory.quantity - 1;
COMMIT;

-- Bad: Long-running transaction holding locks
BEGIN;
-- Complex calculations...
-- External API calls...
-- Batch processing...
MATCH (inventory:Product {sku: $sku})
SET inventory.quantity = inventory.quantity - 1;
COMMIT;
```

### Error Handling

Always handle transaction errors:

```python
try:
    with db.transaction():
        db.execute("MATCH (p:Product {sku: $sku}) SET p.quantity = p.quantity - 1", sku=sku)
        db.execute("INSERT (:Order {sku: $sku})", sku=sku)
except ConstraintViolation as e:
    logger.error(f"Constraint violated: {e}")
    raise
except SerializationFailure as e:
    logger.warn(f"Conflict detected, retrying: {e}")
    # Implement retry with exponential backoff
except Exception as e:
    logger.error(f"Transaction failed: {e}")
    raise
```

### Choosing Isolation Levels

Select the appropriate isolation level:

- **Read Committed**: Fast, suitable for read-heavy workloads, tolerant of non-repeatable reads
- **Snapshot Isolation**: Good balance of performance and consistency
- **Serializable**: Use when absolute correctness is required

### Idempotency

Design operations to be idempotent when possible:

```gql
-- Idempotent: Can safely retry
MERGE (user:User {email: $email})
SET user.lastLogin = datetime();

-- Not idempotent: Creates duplicates on retry
INSERT (:User {email: $email});
```

### Batch Operations

Use batch operations to reduce transaction overhead:

```gql
BEGIN;

UNWIND $batch AS item
MATCH (product:Product {sku: item.sku})
SET product.quantity = product.quantity - item.qty;

COMMIT;
```

## Monitoring and Troubleshooting

### Transaction Metrics

Monitor key ACID metrics:

There is no `dbms.monitor.*` namespace: active transactions, abort reasons,
WAL file sizes and durability lag are not exposed as procedures. The equivalent
signals are the transaction counters on the metrics endpoint and the WAL
position in the storage statistics:

```bash
# Transaction volume and abort rate
curl -s http://localhost:9090/metrics | grep '^geode_transactions'
```

```gql
-- How far the WAL has advanced past the last checkpoint
CALL geode.storage.stats()
YIELD wal_lsn, last_checkpoint_lsn
RETURN wal_lsn, last_checkpoint_lsn, wal_lsn - last_checkpoint_lsn AS unflushed;
```

### Common Issues

**Transaction Conflicts**: High abort rates

- Reduce transaction duration
- Use lower isolation level if acceptable
- Partition hot data

**WAL Growth**: Unbounded WAL files

- Increase checkpoint frequency
- Reduce transaction size
- Check for long-running transactions

**Slow Commits**: High commit latency

- Check disk I/O performance
- Tune fsync settings
- Use SSDs for WAL storage

## Related Topics

- [Transactions](/tags/transactions/) - Transaction management
- [Isolation Levels](/tags/isolation/) - Isolation guarantees

## Further Reading

- [Transaction Guide](/docs/transactions/) - Complete transaction documentation
- [Architecture Overview](/docs/architecture/) - System architecture

Geode's full ACID implementation ensures your graph data remains consistent, reliable, and durable—essential for production applications where correctness cannot be compromised.
