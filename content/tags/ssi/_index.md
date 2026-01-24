---
title: "Tag: Serializable Snapshot Isolation (SSI)"
description: "Explore Geode documentation tagged with ssi. Learn about ssi features, best practices, and implementation details."
keywords:
  - ssi
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/ssi/"
    noindex: false
---

Documentation tagged with **Serializable Snapshot Isolation (SSI)** in the Geode graph database. SSI is an advanced concurrency control mechanism that provides true serializability without the performance overhead of traditional two-phase locking, making it the gold standard for ACID-compliant distributed databases.

## Introduction to Serializable Snapshot Isolation

Serializable Snapshot Isolation (SSI) represents the pinnacle of concurrency control mechanisms—it provides the strongest isolation guarantee (serializability) while maintaining the high concurrency benefits of snapshot isolation. Published in 2008 by Michael James Cahill, SSI solved a decades-old problem: how to achieve true serializability without sacrificing performance.

Traditional serializability implementations use two-phase locking, which forces transactions to acquire locks before accessing data. This creates contention bottlenecks—readers block writers, writers block readers, and throughput plummets under concurrent load. Snapshot isolation (SI) solved the performance problem by allowing readers and writers to proceed concurrently, but SI permits certain anomalies like write skew that violate serializability.

SSI bridges this gap. It starts with snapshot isolation's optimistic concurrency model, then adds lightweight conflict detection to catch the specific patterns that would violate serializability. When SSI detects a dangerous structure, it aborts one transaction to maintain correctness. The key insight: these dangerous patterns are rare in practice, so SSI achieves near-SI performance with full serializability guarantees.

Geode implements SSI as its highest isolation level, providing true ACID semantics for applications that require it. This makes Geode suitable for financial systems, inventory management, and other domains where correctness cannot be compromised.

## Understanding Serializability

Serializability means transaction executions are equivalent to some serial (one-at-a-time) execution. If transactions T1 and T2 run concurrently, the result must match either:

- T1 runs completely, then T2 runs completely
- T2 runs completely, then T1 runs completely

This guarantee prevents all concurrency anomalies:

### Write Skew Anomaly

The classic SSI problem case:

```gql
-- Initial state: account1.balance = $100, account2.balance = $100
-- Business rule: total balance must stay >= $100

-- Transaction 1
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
MATCH (a1:Account {id: 'account1'}), (a2:Account {id: 'account2'})
WHERE a1.balance + a2.balance >= 100
SET a1.balance = a1.balance - 80;
COMMIT;

-- Transaction 2 (concurrent)
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
MATCH (a1:Account {id: 'account1'}), (a2:Account {id: 'account2'})
WHERE a1.balance + a2.balance >= 100
SET a2.balance = a2.balance - 80;
COMMIT;

-- Result: account1 = $20, account2 = $20, total = $40 (violates constraint!)
```

Under basic snapshot isolation, both transactions see the initial $200 total, both pass the constraint check, and both commit—violating the business rule. SSI detects this dangerous structure and aborts one transaction.

### Phantom Reads

SSI also prevents phantoms:

```gql
-- Transaction 1
BEGIN;
MATCH (p:Person) WHERE p.age < 18 RETURN count(*) AS minors; -- Returns 5

-- Transaction 2 (concurrent)
BEGIN;
INSERT (:Person {name: 'Child', age: 10});
COMMIT;

-- Transaction 1 continues
MATCH (p:Person) WHERE p.age < 18 RETURN count(*) AS minors; -- Returns 6 in SI
COMMIT;
```

Basic SI would allow the count to change within T1. SSI detects the conflict and aborts one transaction.

## How SSI Works in Geode

### Conflict Detection

SSI tracks two types of dependencies between transactions:

1. **Read-Write (rw) Dependencies**: T1 reads data that T2 modifies
2. **Write-Read (wr) Dependencies**: T1 writes data that T2 reads

A dangerous structure exists when there's a cycle of rw dependencies:

```
T1 --(rw)--> T2 --(rw)--> T3 --(rw)--> T1
```

This pattern is called a "dangerous structure" or "pivot." When detected, Geode aborts one transaction in the cycle to break it.

### Read Tracking

Geode maintains read sets for each transaction:

```
Transaction T1 read set:
  - Node(Person, id=123) version 42
  - Node(Person, id=456) version 38
  - Relationship(KNOWS, id=789) version 51
```

When another transaction modifies these items, Geode records an rw-dependency from the reading transaction to the writing transaction.

### Write Tracking

Geode maintains write sets for each transaction:

```
Transaction T2 write set:
  - Node(Person, id=123) version 43 (new)
  - Relationship(KNOWS, id=999) version 52 (new)
```

When another transaction reads items in the write set, Geode records a wr-dependency.

### Commit-Time Validation

At commit time, Geode checks for dangerous structures:

1. Collect all transactions that have rw or wr dependencies with this transaction
2. Check if any dependency cycle exists
3. If a cycle exists, abort this transaction with a serialization failure error
4. If no cycle, commit successfully

This validation is fast—typically microseconds—because the dependency graph is small.

### Lock-Free Implementation

SSI is completely lock-free:

- Readers never block writers
- Writers never block readers
- Writers only block other writers on the same item (write-write conflict)
- Detection happens optimistically at commit time

This enables linear scalability of concurrent transactions.

## Use Cases

### Financial Transactions

SSI is essential for financial correctness:

```gql
-- Account transfer with serializability
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

MATCH (from:Account {id: $fromId})
WHERE from.balance >= $amount
SET from.balance = from.balance - $amount;

MATCH (to:Account {id: $toId})
SET to.balance = to.balance + $amount;

INSERT (:AuditLog {
  timestamp: now(),
  from: $fromId,
  to: $toId,
  amount: $amount
});

COMMIT;
```

SSI guarantees no lost updates, no double-spending, and no constraint violations.

### Inventory Management

Prevent overselling in concurrent environments:

```gql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

MATCH (product:Product {sku: $sku})
WHERE product.quantity >= $orderQty
SET product.quantity = product.quantity - $orderQty;

INSERT (:Order {
  product_sku: $sku,
  quantity: $orderQty,
  customer: $customerId,
  timestamp: now()
});

COMMIT;
```

Multiple concurrent orders won't exceed available inventory.

### Constraint Enforcement

Enforce complex multi-record constraints:

```gql
-- Ensure department budget not exceeded
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

MATCH (d:Department {id: $deptId})-[:HAS_EMPLOYEE]->(e:Employee)
WITH d, sum(e.salary) AS total_salaries
WHERE total_salaries + $newSalary <= d.budget

INSERT (d)-[:HAS_EMPLOYEE]->(:Employee {
  name: $name,
  salary: $newSalary
});

COMMIT;
```

SSI prevents concurrent hires from violating budget constraints.

## Best Practices

### When to Use SSI

Use SSI when you need:

- Absolute correctness (financial, medical, legal data)
- Complex multi-record constraints
- Protection against all concurrency anomalies
- Compliance requirements (SOC 2, HIPAA, PCI-DSS)

Don't use SSI when:

- Read Committed or Snapshot Isolation is sufficient
- Maximum throughput is critical and anomalies are acceptable
- Transactions are read-only (no benefit from SSI)

### Minimizing Aborts

1. **Keep transactions short**: Reduces conflict window
   ```gql
   -- Good: Short critical section
   BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
   MATCH (inventory:Product {sku: $sku})
   WHERE inventory.quantity >= $qty
   SET inventory.quantity = inventory.quantity - $qty;
   COMMIT;

   -- Bad: Long transaction with non-critical work
   BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
   -- Complex calculations...
   -- External API calls...
   -- Image processing...
   MATCH (inventory:Product {sku: $sku})
   WHERE inventory.quantity >= $qty
   SET inventory.quantity = inventory.quantity - $qty;
   COMMIT;
   ```

2. **Access data in consistent order**: Prevents dependency cycles
   ```gql
   -- Always access accounts in ascending ID order
   MATCH (a1:Account), (a2:Account)
   WHERE a1.id = $id1 AND a2.id = $id2
   WITH a1, a2
   ORDER BY a1.id
   -- Perform updates
   ```

3. **Implement retry logic**: Handle serialization failures gracefully
   ```python
   @retry(on=SerializationFailure, max_attempts=5, backoff=exponential)
   def transfer_funds(from_id, to_id, amount):
       with db.transaction(isolation='SERIALIZABLE'):
           # Perform transfer
           pass
   ```

### Performance Tuning

1. **Monitor abort rates**: Track serialization failures
   ```gql
   CALL dbms.monitor.transactions.aborts()
   YIELD reason, count
   WHERE reason = 'SERIALIZATION_FAILURE'
   RETURN count
   ```

2. **Use READ COMMITTED for read-only queries**: No need for SSI overhead
   ```gql
   BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
   MATCH (p:Person)-[:KNOWS*1..3]->(friend)
   RETURN friend.name;
   COMMIT;
   ```

3. **Partition hot data**: Reduce conflicts across independent partitions

### Debugging Serialization Failures

When a transaction aborts with serialization failure:

1. **Identify conflicting transactions**: Check the error message for transaction IDs
2. **Analyze access patterns**: Determine which data both transactions accessed
3. **Reorder operations**: Access shared data in consistent order
4. **Consider lower isolation**: If acceptable, use Snapshot Isolation

## Troubleshooting

### High Abort Rates

**Symptom**: Many serialization failures
**Cause**: High contention on shared data
**Solution**:
- Reduce transaction duration
- Partition data to reduce sharing
- Access data in consistent order
- Use lower isolation if acceptable

### Deadlock-Like Behavior

**Symptom**: Transactions appear stuck
**Cause**: Cycle detection algorithm running
**Solution**: This is normal—Geode will abort one transaction to break the cycle

### Performance Degradation

**Symptom**: Slower commits over time
**Cause**: Growing dependency graph
**Solution**: Increase transaction commit rate, reduce long-running transactions

## Related Topics

- [Multi-Version Concurrency Control (MVCC)](/tags/mvcc/) - Foundation for SSI
- [ACID Transactions](/tags/acid/) - Serializability is the "I" in ACID
- [Isolation Levels](/tags/isolation/) - Different isolation guarantees
- [Concurrency Control](/tags/concurrency/) - Broader concurrency mechanisms
- [Transactions](/tags/transactions/) - Transaction management
- [Write-Ahead Logging (WAL)](/tags/wal/) - Durability mechanism
- [Performance](/tags/performance/) - Performance implications

## Further Reading

### Documentation

- [Transaction Isolation Guide](/docs/isolation-levels/) - Complete isolation documentation
- [Concurrency Control](/docs/concurrency/) - Detailed concurrency mechanisms
- [Performance Tuning](/docs/performance-tuning/) - SSI optimization techniques

### Academic Papers

- "Serializable Isolation for Snapshot Databases" (Cahill et al., 2008) - Original SSI paper
- [ISO/IEC 39075:2024](/tags/iso-standard/) - GQL standard transaction semantics

### Implementation Details

- [Architecture Overview](/docs/architecture/) - System architecture including SSI
- [Conflict Detection](/docs/conflict-detection/) - Detailed detection algorithms
- [Distributed SSI](/tags/distributed/) - SSI in distributed environments

Geode's SSI implementation provides true serializability with excellent performance. By detecting dangerous structures at commit time rather than blocking during execution, SSI enables high-concurrency workloads while maintaining the strongest possible correctness guarantees.
