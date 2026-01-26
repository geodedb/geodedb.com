---
title: "Transactions and Data Integrity"
description: "Use START TRANSACTION/COMMIT/ROLLBACK, understand MVCC + SSI isolation, and learn how WAL and recovery preserve integrity in Geode"
weight: 10
tags:
  - transactions
  - acid
  - mvcc
  - ssi
  - wal
  - data-integrity
categories:
  - graph-databases-101
  - gql
keywords:
  - ACID
  - MVCC
  - SSI
  - WAL
  - transaction isolation
---

<!-- CANARY: REQ=REQ-TXN-ISOLATION-003; FEATURE="Serializable Snapshot Isolation"; ASPECT=SerializableSSI; STATUS=TESTED; OWNER=txn; UPDATED=2025-10-05 -->

# Transactions and Data Integrity

Geode provides true ACID transactions with MVCC (Multi-Version Concurrency Control) and SSI (Serializable Snapshot Isolation) for the strongest consistency guarantees.

## Transaction Basics

From `TRANSACTION_MANAGEMENT.md`:

### Starting Transactions

```gql
-- Explicit transaction
START TRANSACTION;

-- Make changes
CREATE (:Person {name: "Alice", age: 30});
CREATE (:Person {name: "Bob", age: 25});

-- Commit changes
COMMIT;
```

**Auto-commit mode**: Single statements outside a transaction are auto-committed.

```gql
-- This is auto-committed
CREATE (:Person {name: "Charlie", age: 35});
```

### Rollback on Error

```gql
START TRANSACTION;

CREATE (:Person {name: "Alice", age: 30});

-- Oops, error or need to undo
ROLLBACK;

-- All changes since START TRANSACTION are undone
```

### Savepoints (Extension)

**Savepoints** allow partial rollback within a transaction:

```gql
START TRANSACTION;

-- Checkpoint 1
CREATE (:Person {name: "Alice", age: 30});
SAVEPOINT sp1;

-- Checkpoint 2
CREATE (:Person {name: "Bob", age: 25});
SAVEPOINT sp2;

-- Checkpoint 3
CREATE (:Person {name: "Charlie", age: 35});

-- Rollback to sp2 (undoes Charlie, keeps Alice and Bob)
ROLLBACK TO SAVEPOINT sp2;

-- Rollback to sp1 (undoes Bob and Charlie, keeps Alice)
ROLLBACK TO SAVEPOINT sp1;

COMMIT;
```

**Use cases**:
- Error recovery within complex transactions
- Partial rollback without losing all work
- Implementing application-level "undo" functionality

## ACID Semantics

Geode guarantees **ACID** properties:

### Atomicity

**All-or-nothing**: Either all operations in a transaction succeed, or none do.

```gql
START TRANSACTION;

CREATE (:Account {id: 1, balance: 1000});
CREATE (:Account {id: 2, balance: 500});

-- Transfer $100: debit from 1, credit to 2
MATCH (a1:Account {id: 1})
SET a1.balance = a1.balance - 100;

MATCH (a2:Account {id: 2})
SET a2.balance = a2.balance + 100;

-- If any statement fails, ALL are rolled back
COMMIT;
```

**Failure scenarios**:
- Constraint violation → entire transaction rolled back
- Disk I/O error → transaction rolled back
- Server crash during transaction → WAL replay recovers consistent state

### Consistency

**Integrity constraints** are maintained:

```gql
-- Constraint: account balance must be non-negative
CREATE CONSTRAINT positive_balance ON Account(balance) CHECK (balance >= 0);

START TRANSACTION;

MATCH (a:Account {id: 1})
SET a.balance = a.balance - 2000;  -- Would make balance negative

-- Transaction fails with constraint violation
COMMIT;  -- Returns error, no changes applied
```

### Isolation

**Isolation level**: **Serializable Snapshot Isolation (SSI)**

**What this means**:
- Transactions see a consistent snapshot of the database
- Concurrent transactions are serializable (equivalent to some serial execution)
- No dirty reads, no non-repeatable reads, no phantom reads

**Example: No dirty reads**:

```gql
-- Transaction 1 (T1)
START TRANSACTION;
CREATE (:Person {name: "Alice", age: 30});
-- Not yet committed

-- Transaction 2 (T2, concurrent)
START TRANSACTION;
MATCH (p:Person {name: "Alice"})
RETURN p;
-- Returns nothing (Alice not visible until T1 commits)
COMMIT;

-- T1 commits
COMMIT;

-- Now T2 would see Alice
START TRANSACTION;
MATCH (p:Person {name: "Alice"})
RETURN p;  -- Returns Alice
COMMIT;
```

See **Isolation Model** section below for MVCC + SSI details.

### Durability

**Write-Ahead Logging (WAL)** ensures committed transactions survive crashes.

**Guarantee**: Once `COMMIT` returns success, changes are durable (written to WAL on disk).

**Recovery**:
- On startup, Geode replays WAL to recover committed transactions
- Uncommitted transactions are rolled back

## Isolation Model: MVCC + SSI

From `ENHANCED_TRANSACTION_ISOLATION.md`:

### Multi-Version Concurrency Control (MVCC)

**MVCC** maintains multiple versions of data to allow concurrent readers and writers.

**How it works**:
1. Each transaction sees a **snapshot** of the database at transaction start
2. Writes create **new versions** without blocking readers
3. Readers see old versions until writers commit
4. Old versions are garbage-collected after all transactions complete

**Example**:

```
Time  | T1 (Read)                    | T2 (Write)
------|------------------------------|----------------------------
t0    | START TRANSACTION            |
t1    |                              | START TRANSACTION
t2    | MATCH (p:Person {id: 1})     |
      | RETURN p.age;  -- Returns 30 |
t3    |                              | MATCH (p:Person {id: 1})
      |                              | SET p.age = 31;
t4    | MATCH (p:Person {id: 1})     |
      | RETURN p.age;  -- Still 30!  |
t5    |                              | COMMIT;
t6    | MATCH (p:Person {id: 1})     |
      | RETURN p.age;  -- Still 30!  |
t7    | COMMIT;                      |
t8    | START TRANSACTION            |
t9    | MATCH (p:Person {id: 1})     |
      | RETURN p.age;  -- Now 31     |
```

**Benefit**: Readers never block writers, writers never block readers.

### Serializable Snapshot Isolation (SSI)

**SSI** prevents anomalies by detecting **conflicts** between concurrent transactions.

**Conflict types**:
- **Read-Write conflict**: T1 reads X, T2 modifies X
- **Write-Write conflict**: T1 modifies X, T2 modifies X
- **Dependency cycle**: T1 → T2 → T3 → T1 (serialization impossible)

**Example: Write skew prevention**:

```gql
-- Initial state: Alice balance = 1000, Bob balance = 1000

-- T1: Transfer $800 from Alice to Charlie
START TRANSACTION;
MATCH (a:Account {name: "Alice"})
WHERE a.balance >= 800  -- Check passes (balance = 1000)
SET a.balance = a.balance - 800;
-- T1 pauses here

-- T2: Transfer $800 from Alice to Diana (concurrent)
START TRANSACTION;
MATCH (a:Account {name: "Alice"})
WHERE a.balance >= 800  -- Check passes (sees snapshot with balance = 1000)
SET a.balance = a.balance - 800;
COMMIT;  -- T2 commits first

-- T1 resumes
COMMIT;  -- FAILS with serialization error (conflict detected)
```

**SSI detects** that T1 and T2 both read Alice's balance and would cause inconsistency if both committed.

**Application handling**: Retry failed transactions with exponential backoff.

```python
# Python client example
max_retries = 3
for attempt in range(max_retries):
    try:
        async with client.transaction():
            # Execute transaction
            await client.query("MATCH (a:Account {name: 'Alice'}) SET a.balance = a.balance - 800")
            await client.query("MATCH (c:Account {name: 'Charlie'}) SET c.balance = c.balance + 800")
        break  # Success
    except SerializationError:
        if attempt == max_retries - 1:
            raise  # Final attempt failed
        await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

## Sessions and Transaction Scope

From `SESSION_MANAGEMENT.md`:

**Sessions** maintain state across multiple requests:

- **Current graph**: Selected with `USE <graph>`
- **Transaction state**: Active transaction, savepoints
- **Prepared statements**: Cached query plans
- **Session variables**: User-defined variables (future)

**Session lifetime**:
- Created on first connection
- Persists across queries until disconnected
- Automatically cleaned up on disconnect or timeout

**Example**:

```gql
-- Session 1
USE SocialNetwork;  -- Set graph context

START TRANSACTION;
CREATE (:Person {name: "Alice", age: 30});
-- Transaction is in-progress

-- Another query in same session
CREATE (:Person {name: "Bob", age: 25});
-- Added to same transaction

COMMIT;
-- Both Alice and Bob committed atomically

-- Session 2 (different connection)
USE CompanyGraph;  -- Different graph context
-- Alice and Bob are not visible here (different graph)
```

**Session isolation**: Each session has independent transaction state.

## Write-Ahead Logging (WAL) and Recovery

From `SERVER_FEATURES.md`:

### WAL Architecture

**Write-Ahead Log** ensures durability:

1. **Before** modifying data pages, write changes to WAL
2. WAL writes are **sequential** (fast, no random I/O)
3. WAL is **fsync'd** to disk before returning commit success
4. Data pages are written **asynchronously** (in background)

**WAL entry format**:

```
[LSN | Transaction ID | Operation | Old Value | New Value | Checksum]
```

- **LSN**: Log Sequence Number (monotonic)
- **Transaction ID**: Unique transaction identifier
- **Operation**: INSERT/UPDATE/DELETE
- **Old Value**: For undo (rollback)
- **New Value**: For redo (recovery)
- **Checksum**: Detect corruption

### Recovery Process

**On startup** (after crash):

1. **Read WAL** from last checkpoint
2. **Redo phase**: Replay committed transactions (apply changes)
3. **Undo phase**: Roll back uncommitted transactions
4. **Checkpoint**: Write all dirty pages to disk, truncate WAL

**Example timeline**:

```
t0: Checkpoint (all pages on disk)
t1: T1 START
t2: T1 INSERT (:Person {name: "Alice"})
t3: T1 COMMIT (WAL entry written)
t4: T2 START
t5: T2 INSERT (:Person {name: "Bob"})
t6: CRASH (T2 not committed)

-- Recovery
t7: Startup
t8: Replay WAL:
    - T1 committed → REDO (Alice inserted)
    - T2 not committed → UNDO (Bob not inserted)
t9: Recovery complete (Alice visible, Bob not)
```

### Point-in-Time Recovery (PITR)

**Restore to specific timestamp**:

```bash
# Restore from backup + replay WAL to timestamp
geode restore \
  --from s3://backups/geode-2024-01-15.tar.gz \
  --wal-dir /var/lib/geode/wal \
  --until "2024-01-15T14:30:00Z"
```

**Use cases**:
- Recover from accidental data deletion
- Audit historical state
- Clone database at specific point

**See also**: [Deployment Guide](/docs/ops/deployment#backups) for backup/restore procedures

## Storage Checksums and Integrity

From `SERVER_FEATURES.md`:

**Checksums** detect data corruption:

- **Page-level checksums**: Each data page has CRC32 checksum
- **WAL checksums**: Each WAL entry has checksum
- **Verification**: On read, checksum is validated
- **Corruption handling**: If checksum fails, return error (do not return corrupt data)

**Example error**:

```
ERROR: page checksum verification failed
DETAIL: Expected checksum 0x12345678, found 0xabcdef00
HINT: This may indicate disk corruption. Restore from backup.
```

## Constraints and Integrity (Current Status)

**Implemented**:
- `UNIQUE` - Unique constraint on property
- `NOT NULL` - Property must have value
- `CHECK` - Custom predicate constraint

**Example**:

```gql
-- Unique email
CREATE CONSTRAINT unique_email ON User(email) ASSERT UNIQUE;

-- Not null name
CREATE CONSTRAINT name_required ON Person(name) ASSERT NOT NULL;

-- Check constraint (balance >= 0)
CREATE CONSTRAINT positive_balance ON Account(balance) CHECK (balance >= 0);
```

**Planned** (per ISO standard):
- Foreign key constraints (relationship cardinality)
- Pattern constraints (e.g., "Person must have at least one EMAIL relationship")
- Existence constraints (e.g., "Person must have 'age' property")

## Best Practices

### 1. Keep Transactions Short

**Good** (fast commit):

```gql
START TRANSACTION;
MATCH (a:Account {id: 1})
SET a.balance = a.balance - 100;
COMMIT;
```

**Bad** (long-running transaction blocks others):

```gql
START TRANSACTION;
-- Complex analytics query taking 30 seconds
MATCH (p:Person)-[:KNOWS*]->(friend)
RETURN COUNT(friend);
-- Locks held for 30 seconds
COMMIT;
```

**Tip**: Use read-only queries outside transactions for analytics.

### 2. Retry on Serialization Errors

SSI may abort transactions due to conflicts. **Retry** with exponential backoff.

```python
# Pseudo-code
def transfer_money(from_id, to_id, amount):
    for attempt in range(MAX_RETRIES):
        try:
            with client.transaction():
                debit(from_id, amount)
                credit(to_id, amount)
            return  # Success
        except SerializationError:
            if attempt == MAX_RETRIES - 1:
                raise
            sleep(2 ** attempt)  # Exponential backoff
```

### 3. Use Savepoints for Complex Logic

**Break complex transactions** into logical steps with savepoints:

```gql
START TRANSACTION;

-- Step 1: Validate input
SAVEPOINT validate;
MATCH (a:Account {id: 1})
WHERE a.balance >= 100
RETURN a;  -- Ensure sufficient balance

-- Step 2: Debit
SAVEPOINT debit;
MATCH (a:Account {id: 1})
SET a.balance = a.balance - 100;

-- Step 3: Credit
MATCH (b:Account {id: 2})
SET b.balance = b.balance + 100;

-- If step 3 fails, can rollback to 'debit' and retry
-- ROLLBACK TO SAVEPOINT debit;

COMMIT;
```

### 4. Monitor Transaction Metrics

**Key metrics** (from Prometheus):
- `geode_transactions_active` - Active transactions (should be low)
- `geode_transactions_committed` - Successful commits
- `geode_transactions_aborted` - Serialization errors (retry rate)
- `geode_wal_writes_bytes` - WAL write throughput

**See**: [Monitoring and Telemetry](/docs/ops/observability) for metrics setup

## Next Steps

- **[GQL Guide](/docs/gql/guide)** - Transaction syntax and examples
- **[Security Guide](/docs/security/overview)** - Audit logging and integrity
- **[Deployment Guide](/docs/ops/deployment)** - Backup and recovery procedures
- **[Enhanced Transaction Isolation](/docs/architecture/transaction-isolation)** - Deep dive into MVCC + SSI
- **[Session Management](/docs/reference/session-management)** - Session lifecycle and state
