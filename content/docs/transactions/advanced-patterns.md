---
title: "Advanced Transaction Patterns"
description: "Master advanced transaction patterns in Geode including isolation levels, savepoints, phantom read prevention, deadlock detection, distributed transactions, and ACID compliance strategies."
url: /docs/transactions/advanced-patterns/
keywords: ["transactions", "ACID", "isolation levels", "savepoints", "MVCC", "SSI", "deadlock detection", "phantom reads", "distributed transactions", "two-phase commit", "serializable"]
weight: 20
slug: "advanced-patterns"
canonical: "https://geodedb.com/docs/transactions/advanced-patterns/"
---

<!-- CANARY: REQ=REQ-TXN-UNDO-001; FEATURE="TransactionUndoLog"; ASPECT=UndoEntry; STATUS=TESTED; OWNER=engine; UPDATED=2026-01-15 -->

Geode provides enterprise-grade transaction management with comprehensive ACID compliance, advanced isolation levels, savepoint support, phantom read prevention, and sophisticated deadlock detection. This guide covers advanced transaction patterns for building robust, concurrent applications.

## Transaction Fundamentals

### Basic Transaction Lifecycle

All transactions follow the standard ACID lifecycle:

```gql
-- Begin transaction
START TRANSACTION;

-- Perform operations
CREATE (p:Person {name: 'Alice', age: 30});
CREATE (c:Company {name: 'TechCorp'});
CREATE (p)-[:WORKS_FOR {since: 2024}]->(c);

-- Commit changes
COMMIT;
```

**ACID Guarantees**:
- **Atomicity**: All operations succeed or all fail
- **Consistency**: Database remains in valid state
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed changes persist after crash

### Rollback on Error

Discard changes if an error occurs:

```gql
START TRANSACTION;

CREATE (p:Person {name: 'Bob', age: 25});
CREATE (c:Company {name: 'Acme Inc'});

-- Decide to cancel
ROLLBACK;
```

### Transaction State Persistence

Geode persists transaction state across CLI invocations within a session:

```bash
# First command: start transaction
geode query "START TRANSACTION"

# Second command: perform operations (same session)
geode query "CREATE (n:Test {id: 1})"

# Third command: commit (same session)
geode query "COMMIT"
```

**Implementation**: Transaction state saved to session file, loaded before each query execution.

## Savepoints

### Creating Savepoints

Save intermediate points within a transaction for partial rollback:

```gql
START TRANSACTION;

-- Create initial data
CREATE (p:Person {name: 'Alice', age: 30});

-- Create savepoint
SAVEPOINT after_person;

-- Create more data
CREATE (c:Company {name: 'TechCorp'});
CREATE (p)-[:WORKS_FOR {since: 2024}]->(c);

-- Create another savepoint
SAVEPOINT after_company;

-- More operations
MATCH (p:Person {name: 'Alice'})
SET p.status = 'employed';

COMMIT;
```

### Rolling Back to Savepoints

Rollback to specific savepoint without aborting entire transaction:

```gql
START TRANSACTION;

CREATE (p:Person {name: 'Bob', age: 25});
SAVEPOINT person_created;

CREATE (c:Company {name: 'Acme Inc'});
SAVEPOINT company_created;

-- Oops, wrong company - rollback to person_created
ROLLBACK TO person_created;

-- Create correct company
CREATE (c:Company {name: 'RealCorp'});
CREATE (p)-[:WORKS_FOR]->(c);

COMMIT;
```

**Use Cases**:
- Complex multi-step operations with error recovery
- Batch imports with partial rollback on validation failure
- Nested logical operations requiring independent rollback

### Nested Savepoints

Create hierarchical savepoints for granular control:

```gql
START TRANSACTION;

-- Level 1: Create person
CREATE (p:Person {name: 'Charlie', age: 35});
SAVEPOINT level1;

-- Level 2: Create address
CREATE (a:Address {street: '123 Main St', city: 'Seattle'});
CREATE (p)-[:LIVES_AT]->(a);
SAVEPOINT level2;

-- Level 3: Create phone
CREATE (ph:Phone {number: '555-1234'});
CREATE (p)-[:HAS_PHONE]->(ph);
SAVEPOINT level3;

-- Error in phone validation - rollback only level 3
ROLLBACK TO level2;

-- Try different phone
CREATE (ph:Phone {number: '555-5678'});
CREATE (p)-[:HAS_PHONE]->(ph);

COMMIT;
```

## Isolation Levels

Geode supports six isolation levels with different concurrency-consistency trade-offs:

### Isolation Level Comparison

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance | Use Case |
|----------------|------------|---------------------|--------------|-------------|----------|
| Read Uncommitted | ✅ Allowed | ✅ Allowed | ✅ Allowed | Highest | Bulk operations, analytics |
| Read Committed | ❌ Prevented | ✅ Allowed | ✅ Allowed | High | General queries |
| Repeatable Read | ❌ Prevented | ❌ Prevented | ✅ Allowed | Medium | Analytical workloads |
| Snapshot Isolation (Default) | ❌ Prevented | ❌ Prevented | ⚠️ Possible | High | High-concurrency OLTP |
| Serializable Snapshot (SSI) | ❌ Prevented | ❌ Prevented | ❌ Prevented | Medium | Strict consistency |
| Serializable | ❌ Prevented | ❌ Prevented | ❌ Prevented | Low | Critical transactions |

### Read Uncommitted

Lowest isolation level, allows dirty reads:

```gql
-- Set isolation level
BEGIN TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

-- Can see uncommitted changes from other transactions
MATCH (p:Person) WHERE p.age > 25 RETURN p;

COMMIT;
```

**Characteristics**:
- Highest performance
- No read locks
- May read uncommitted data
- Suitable for bulk operations where dirty reads are acceptable

### Read Committed

Prevents dirty reads, default for many systems:

```gql
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Only see committed changes
MATCH (p:Person) WHERE p.age > 25 RETURN p;

-- But values may change between reads
MATCH (p:Person {name: 'Alice'}) RETURN p.age;
-- Result: 30

-- Another transaction commits: SET Alice.age = 31

MATCH (p:Person {name: 'Alice'}) RETURN p.age;
-- Result: 31 (non-repeatable read)

COMMIT;
```

**Characteristics**:
- Prevents dirty reads
- Allows non-repeatable reads
- Good balance for general queries
- Lower overhead than higher levels

### Repeatable Read

Prevents dirty and non-repeatable reads:

```gql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- First read
MATCH (p:Person {name: 'Alice'}) RETURN p.age;
-- Result: 30

-- Another transaction commits: SET Alice.age = 31
-- Our transaction still sees original value

MATCH (p:Person {name: 'Alice'}) RETURN p.age;
-- Result: 30 (repeatable read guaranteed)

-- But new rows may appear (phantom reads)
MATCH (p:Person) WHERE p.age > 25 RETURN count(p);
-- May change as new rows inserted

COMMIT;
```

**Characteristics**:
- Consistent reads within transaction
- Allows phantom reads (new rows)
- Suitable for analytical workloads
- Higher locking overhead

### Snapshot Isolation (Default)

MVCC-based snapshot isolation for high concurrency:

```gql
BEGIN TRANSACTION ISOLATION LEVEL SNAPSHOT;

-- See consistent snapshot of database at transaction start
MATCH (p:Person) RETURN p.name, p.age;

-- Other transactions can modify data without blocking
-- Our view remains consistent

-- Write operations use first-committer-wins
MATCH (p:Person {name: 'Alice'})
SET p.age = p.age + 1;

COMMIT;
```

**Characteristics**:
- No read locks (high concurrency)
- Consistent snapshot view
- First-committer-wins for writes
- Optimal for OLTP workloads
- **Default isolation level in Geode**

**Implementation**:
```zig
// Initialize snapshot isolation
var isolation = try IsolationIntegration.init(allocator, mvcc_manager);
defer isolation.deinit();

// Begin transaction
const txn = try isolation.beginTransaction(.SnapshotIsolation, 100);

// Perform reads (see snapshot)
const data = try isolation.read(txn, resource_id, .SnapshotIsolation);

// Commit with conflict detection
try isolation.commit(txn, .SnapshotIsolation);
```

### Serializable Snapshot Isolation (SSI)

Hybrid approach combining snapshot isolation with serializability:

```gql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE SNAPSHOT;

-- Read-write dependencies tracked
MATCH (p:Person) WHERE p.age > 30 RETURN count(p) AS older_count;

-- System detects dangerous structures
-- If another transaction creates serialization conflict:
-- ERROR: SerializationConflict - transaction aborted

-- Application should retry transaction
COMMIT;
```

**Dangerous Structure Detection**:
```zig
// Dependency tracker detects RW and WR conflicts
if (try dependency_tracker.checkDangerousStructure(txn.id)) {
    return error.SerializationConflict;
}
```

**Characteristics**:
- Detects read-write (RW) and write-read (WR) dependencies
- Aborts transactions forming dangerous cycles
- Higher overhead than snapshot isolation
- Maintains serializability without full locking

### Serializable

Full serializability with phantom read prevention:

```gql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Creates predicate locks to prevent phantom reads
MATCH (p:Person) WHERE p.age > 30 RETURN p;

-- Another transaction trying to insert Person with age=35:
-- BLOCKED until our transaction commits

UPDATE p:Person SET p.age = p.age + 1 WHERE p.age > 30;

COMMIT;
```

**Characteristics**:
- Full ACID serializability
- Phantom read prevention via predicate locks
- Highest consistency guarantees
- Lowest concurrency (highest locking overhead)
- Suitable for critical financial transactions

## Phantom Read Prevention

### Predicate Locks

Geode prevents phantom reads using sophisticated predicate locking:

```zig
// Example: Range query with phantom read protection
const range = PropertyRange{
    .min_value = PropertyValue{ .Int = 100 },
    .max_value = PropertyValue{ .Int = 200 },
    .min_inclusive = true,
    .max_inclusive = false,
};

// Acquire predicate lock
try phantom_prevention.acquirePredicateLock(txn.id, "Person", "age", range);
```

**GQL Example**:
```gql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- This query creates predicate lock on Person.age > 30
MATCH (p:Person) WHERE p.age > 30 RETURN p.name, p.age;

-- Concurrent transaction trying to insert Person with age=35:
-- BLOCKED by predicate lock

COMMIT;
-- Predicate lock released, blocked transaction can proceed
```

### Label-Based Locks

Lock entire label to prevent structural changes:

```gql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Lock all Person nodes
MATCH (p:Person) RETURN count(p);

-- Another transaction trying to CREATE (:Person {...}):
-- BLOCKED until commit

COMMIT;
```

### Range Locks

Protect numeric and string ranges:

```gql
-- Numeric range lock
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
MATCH (p:Product) WHERE p.price >= 100 AND p.price < 200 RETURN p;
-- Locks price range [100, 200)
COMMIT;

-- String range lock
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
MATCH (u:User) WHERE u.email >= 'a@' AND u.email < 'b@' RETURN u;
-- Locks email range starting with 'a'
COMMIT;
```

## Deadlock Detection and Resolution

### Automatic Deadlock Detection

Geode implements wait-for graph cycle detection:

```zig
// Configure deadlock detection
isolation.configure(
    .SerializableSnapshot,
    true,   // enable deadlock detection
    500,    // detection interval (ms)
);
```

**Detection Process**:
1. Construct wait-for graph of blocked transactions
2. Detect cycles indicating deadlocks
3. Select victim based on priority
4. Abort victim transaction automatically
5. Log deadlock event for monitoring

### Priority-Based Victim Selection

Set transaction priority to influence deadlock resolution:

```gql
-- High priority transaction (less likely to be victim)
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE PRIORITY 100;
MATCH (account:Account {id: 'acct-123'})
SET account.balance = account.balance - 100;
COMMIT;

-- Low priority transaction (more likely to be victim)
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE PRIORITY 10;
MATCH (account:Account {id: 'acct-456'})
SET account.balance = account.balance + 50;
COMMIT;
```

**Priority Selection**:
```zig
// Set transaction priority for deadlock resolution
try deadlock_detector.setPriority(txn.id, priority);

// Victim selection: lowest priority transaction aborted
const victim = selectVictim(cycle_transactions);
```

### Deadlock Example

Classic deadlock scenario with automatic resolution:

```gql
-- Transaction 1
BEGIN TRANSACTION;
MATCH (a:Account {id: 'A'}) SET a.balance = a.balance - 100;
-- ... waits for lock on Account B held by Transaction 2

-- Transaction 2
BEGIN TRANSACTION;
MATCH (b:Account {id: 'B'}) SET b.balance = b.balance - 50;
-- ... waits for lock on Account A held by Transaction 1

-- Deadlock detected after 500ms!
-- Transaction 2 (lower priority) aborted automatically
-- ERROR: DeadlockDetected - transaction rolled back

-- Transaction 1 proceeds
MATCH (b:Account {id: 'B'}) SET b.balance = b.balance + 100;
COMMIT;

-- Application should retry Transaction 2
```

## Multi-Operation Transaction Patterns

### Batch Create Pattern

Create multiple related entities atomically:

```gql
START TRANSACTION;

-- Create person
CREATE (p:Person {name: 'Diana', age: 28, email: '[email protected]'});

-- Create address
CREATE (a:Address {street: '456 Oak St', city: 'Portland', zip: '97201'});

-- Create relationships
CREATE (p)-[:LIVES_AT {since: date('2024-01-15')}]->(a);

-- Create phone numbers
CREATE (ph1:Phone {type: 'mobile', number: '555-1111'});
CREATE (ph2:Phone {type: 'work', number: '555-2222'});
CREATE (p)-[:HAS_PHONE]->(ph1);
CREATE (p)-[:HAS_PHONE]->(ph2);

-- Create employment
CREATE (c:Company {name: 'DataCorp', industry: 'Technology'});
CREATE (p)-[:WORKS_FOR {since: date('2022-03-01'), title: 'Engineer'}]->(c);

COMMIT;
```

### Conditional Update Pattern

Update based on current state with validation:

```gql
START TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Read current state
MATCH (product:Product {sku: 'WIDGET-123'})
RETURN product.stock AS current_stock;

-- Validate sufficient stock
-- If current_stock < order_quantity, ROLLBACK

-- Deduct stock atomically
MATCH (product:Product {sku: 'WIDGET-123'})
SET product.stock = product.stock - $order_quantity;

-- Create order record
CREATE (order:Order {
    id: $order_id,
    product_sku: 'WIDGET-123',
    quantity: $order_quantity,
    timestamp: timestamp()
});

COMMIT;
```

### Graph Traversal with Modification

Traverse graph and modify along the path:

```gql
START TRANSACTION;

-- Find path from user to product
MATCH path = (u:User {id: $user_id})-[:VIEWED*1..5]->(p:Product)
WHERE p.category = 'Electronics'

-- Update view counts along path
UNWIND relationships(path) AS rel
SET rel.view_count = coalesce(rel.view_count, 0) + 1;

-- Update product popularity
MATCH (p:Product) WHERE id(p) IN [id IN nodes(path) WHERE label(id) = 'Product']
SET p.popularity_score = p.popularity_score + 1;

COMMIT;
```

### Cascading Delete Pattern

Delete node and all related entities:

```gql
START TRANSACTION;

-- Find user and all relationships
MATCH (u:User {id: $user_id})
OPTIONAL MATCH (u)-[r1]-()
OPTIONAL MATCH ()-[r2]->(u)

-- Delete relationships first
DELETE r1, r2;

-- Delete related entities (addresses, phones, etc.)
MATCH (u)-[:LIVES_AT]->(a:Address) DELETE a;
MATCH (u)-[:HAS_PHONE]->(p:Phone) DELETE p;

-- Delete user
DELETE u;

COMMIT;
```

## Distributed Transactions

### Two-Phase Commit (2PC)

Coordinate transactions across multiple shards:

```zig
// Begin distributed transaction
const distributed_txn = try txn_coordinator.beginDistributedTransaction(
    participating_nodes,
    isolation_level
);

// Execute queries within transaction
const result = try coordinator.executeDistributedQuery(
    query,
    params,
    QueryOptions{ .transaction_id = distributed_txn.id }
);

// Two-phase commit across shards
try txn_coordinator.commitDistributedTransaction(distributed_txn);
```

**2PC Protocol**:
1. **Prepare Phase**: Coordinator sends PREPARE to all participants
2. **Vote Collection**: Wait for YES/NO votes from participants
3. **Commit Decision**: Send COMMIT (all YES) or ABORT (any NO)
4. **Acknowledgment**: Wait for final ACKs from participants

### Distributed Transaction GQL

Execute distributed transactions via GQL:

```gql
-- Distributed transaction across shards
BEGIN DISTRIBUTED TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Multi-shard operations
CREATE (u:User {id: '12345', name: 'Eve', shard: 1});
CREATE (p:Product {id: '67890', name: 'Gadget', shard: 2});
CREATE (u)-[:PURCHASED {timestamp: timestamp()}]->(p);

-- Two-phase commit across all participating shards
COMMIT;
```

### Distributed Isolation

Maintain isolation guarantees across shards:

```gql
BEGIN DISTRIBUTED TRANSACTION ISOLATION LEVEL SERIALIZABLE SNAPSHOT;

-- Read from shard 1
MATCH (u:User {id: $user_id}) RETURN u.balance;

-- Read from shard 2
MATCH (p:Product {id: $product_id}) RETURN p.price;

-- Distributed validation: check consistency across shards
-- Deduct balance on shard 1
MATCH (u:User {id: $user_id})
SET u.balance = u.balance - $product_price;

-- Decrement stock on shard 2
MATCH (p:Product {id: $product_id})
SET p.stock = p.stock - 1;

-- Distributed 2PC commit
COMMIT;
```

## Best Practices

### Choose Appropriate Isolation Level

Select isolation based on workload requirements:

```gql
-- Analytics/reporting (allow dirty reads for performance)
BEGIN TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
MATCH (p:Person) RETURN avg(p.age) AS average_age;
COMMIT;

-- General OLTP (snapshot isolation for concurrency)
BEGIN TRANSACTION ISOLATION LEVEL SNAPSHOT;
MATCH (u:User {id: $id}) SET u.last_login = timestamp();
COMMIT;

-- Financial transactions (serializable for consistency)
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
MATCH (from:Account {id: $from_id}), (to:Account {id: $to_id})
SET from.balance = from.balance - $amount
SET to.balance = to.balance + $amount;
COMMIT;
```

### Use Savepoints for Complex Operations

Break complex transactions into logical units:

```gql
START TRANSACTION;

-- Step 1: Validate input
MATCH (user:User {id: $user_id})
WHERE user.status = 'active'
RETURN user;
SAVEPOINT validation_complete;

-- Step 2: Perform operation
CREATE (order:Order {user_id: $user_id, items: $items});
SAVEPOINT order_created;

-- Step 3: Update inventory
MATCH (product:Product) WHERE product.id IN $product_ids
SET product.stock = product.stock - 1;
SAVEPOINT inventory_updated;

-- If any step fails, rollback to previous savepoint
-- ROLLBACK TO validation_complete;

COMMIT;
```

### Minimize Transaction Duration

Keep transactions short to reduce lock contention:

```gql
-- ❌ Bad: Long transaction holding locks
START TRANSACTION;
MATCH (p:Person) RETURN p;  -- Long query
-- ... application logic taking 10 seconds ...
CREATE (n:Node {data: $result});
COMMIT;

-- ✅ Good: Short transaction
-- Do expensive computation outside transaction
-- Application logic computes result first
START TRANSACTION;
CREATE (n:Node {data: $result});  -- Quick insert
COMMIT;
```

### Retry on Serialization Conflicts

Implement retry logic for transient conflicts:

```python
# Python client example
max_retries = 3
for attempt in range(max_retries):
    try:
        conn.execute("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE SNAPSHOT")
        conn.execute("MATCH (a:Account {id: $id}) SET a.balance = a.balance - $amount", params)
        conn.execute("COMMIT")
        break  # Success
    except SerializationConflict:
        if attempt == max_retries - 1:
            raise  # Max retries exceeded
        time.sleep(0.1 * (2 ** attempt))  # Exponential backoff
        continue
```

### Monitor Transaction Metrics

Track transaction statistics for optimization:

```zig
// Get isolation statistics
const stats = isolation.getStatistics();
const phantom_stats = isolation.getPhantomReadStatistics();

// Monitor key metrics:
// - Total transactions
// - Serialization conflicts
// - Deadlocks detected
// - Phantom read conflicts
// - Average transaction duration
```

## Error Handling

### Transaction Error Types

Comprehensive error handling for transaction conflicts:

```zig
pub const TransactionError = error{
    SerializationConflict,   // SSI dangerous structure
    PhantomReadConflict,     // Phantom read blocked
    DeadlockDetected,        // Deadlock cycle found
    TimeoutExpired,          // Transaction timeout
    ConflictDetected,        // General conflict
    TransactionAlreadyActive,  // START TRANSACTION when active
    NoActiveTransaction,     // COMMIT/ROLLBACK without transaction
};
```

### Error Resolution Strategies

Handle common transaction errors:

```gql
-- Serialization Conflict
-- ERROR: SerializationConflict - dangerous structure detected
-- RESOLUTION: Retry transaction with exponential backoff

-- Phantom Read Conflict
-- ERROR: PhantomReadConflict - predicate lock conflict
-- RESOLUTION: Change query pattern or use lower isolation level

-- Deadlock Detected
-- ERROR: DeadlockDetected - transaction aborted as victim
-- RESOLUTION: Retry transaction, consider changing lock order

-- Timeout Expired
-- ERROR: TimeoutExpired - transaction exceeded timeout
-- RESOLUTION: Optimize query performance or increase timeout

-- Transaction Already Active
-- ERROR: TransactionAlreadyActive
-- RESOLUTION: COMMIT or ROLLBACK current transaction first

-- No Active Transaction
-- ERROR: NoActiveTransaction
-- RESOLUTION: START TRANSACTION before COMMIT/ROLLBACK
```

## Configuration

### Environment Variables

Configure transaction behavior:

```bash
# Default isolation level
export GEODE_DEFAULT_ISOLATION=SNAPSHOT_ISOLATION

# Deadlock detection
export GEODE_DEADLOCK_DETECTION_ENABLED=true
export GEODE_DEADLOCK_DETECTION_INTERVAL_MS=1000

# Transaction timeouts
export GEODE_TRANSACTION_TIMEOUT_MS=30000

# Phantom read prevention
export GEODE_PHANTOM_READ_PREVENTION=true
export GEODE_PREDICATE_LOCK_TIMEOUT_MS=5000
```

### Server Configuration

Configure via YAML:

```yaml
transactions:
  default_isolation: SNAPSHOT_ISOLATION
  deadlock_detection:
    enabled: true
    interval_ms: 1000
  timeout_ms: 30000
  phantom_prevention:
    enabled: true
    lock_timeout_ms: 5000
```

## Performance Characteristics

### Isolation Level Overhead

Empirical overhead for different isolation levels:

| Isolation Level | Read Overhead | Write Overhead | Conflict Rate | Lock Duration |
|----------------|---------------|----------------|---------------|---------------|
| Read Uncommitted | 0μs | 0μs | 0% | None |
| Read Committed | 5-10μs | 10-20μs | <1% | Short |
| Repeatable Read | 10-30μs | 20-50μs | 1-5% | Medium |
| Snapshot Isolation | 10-50μs | 20-80μs | <2% | None (readers) |
| Serializable Snapshot | 20-100μs | 50-150μs | 3-10% | Medium |
| Serializable | 50-200μs | 100-500μs | 5-20% | Long |

### Memory Usage

Transaction system memory overhead:

- **Dependency Tracker**: ~50-200 bytes per active transaction
- **Deadlock Detector**: ~100-500 bytes per active transaction
- **Predicate Locks**: ~200-1000 bytes per lock
- **Total Overhead**: ~350-1700 bytes per active transaction

## Related Documentation

- **[Distributed Architecture](/docs/architecture/distributed-architecture/)** - Distributed transaction coordination
- **[Query Performance Tuning](/docs/query/performance-tuning/)** - Optimize transaction performance
- **[Troubleshooting Guide](/docs/guides/troubleshooting/)** - Common transaction issues
- **[Server Configuration](/docs/configuration/server-configuration/)** - Transaction configuration options

## Summary

Geode provides enterprise-grade transaction management:

- **Six Isolation Levels**: Read Uncommitted, Read Committed, Repeatable Read, Snapshot Isolation, Serializable Snapshot, Serializable
- **Savepoint Support**: Partial rollback within transactions
- **Phantom Read Prevention**: Predicate locking system
- **Deadlock Detection**: Priority-based automatic resolution
- **Distributed Transactions**: Two-phase commit across shards
- **MVCC Implementation**: High-concurrency snapshot isolation
- **SSI Support**: Serializable snapshot isolation with dependency tracking

Choose the appropriate isolation level based on consistency requirements and performance needs. Use savepoints for complex multi-step operations. Monitor transaction metrics to identify performance bottlenecks and optimize accordingly.
