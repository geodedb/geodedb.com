---
title: "Serializable Snapshot Isolation (SSI)"
description: "Complete guide to Serializable Snapshot Isolation in Geode including conflict detection, optimistic concurrency control, transaction anomaly prevention, and performance tuning for production ACID compliance."
keywords:
  - serializable snapshot isolation
  - SSI
  - serializability
  - concurrency control
  - MVCC
  - optimistic locking
  - transaction isolation
  - ACID compliance
  - write skew
  - phantom reads
  - conflict detection
  - transaction anomalies
  - isolation levels
  - snapshot isolation
  - read-write conflicts
  - transaction consistency
  - concurrent transactions
  - database isolation
  - Geode
  - graph database
  - documentation
  - performance tuning
  - production database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/ssi/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

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

## Production Use Cases

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
  timestamp: datetime(),
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
  timestamp: datetime()
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

## Advanced SSI Patterns

### Read-Your-Writes Consistency

Ensure transactions see their own writes:

```python
async with client.connection() as tx:
    # Isolation is configured server-side
    await tx.begin()
    # Write
    await tx.execute("""
        CREATE (u:User {id: $id, name: $name})
    """, {"id": 123, "name": "Alice"})

    # Read own write
    result, _ = await tx.query("""
        MATCH (u:User {id: $id})
        RETURN u.name
    """, {"id": 123})

    assert result.rows[0]['u.name'] == "Alice"  # Always true
```

### Monotonic Reads

Guarantee forward progress:

```python
# Read from consistent snapshot
snapshot_time = None

async def read_consistent(client, query):
    global snapshot_time

    async with client.connection() as tx:
        # Isolation is configured server-side
        await tx.begin()
        if snapshot_time:
            await tx.execute(f"SET TRANSACTION SNAPSHOT '{snapshot_time}'")

        result, _ = await tx.query(query)

        if not snapshot_time:
            snapshot_time = await tx.get_snapshot_timestamp()

        return result
```

### Retry Logic with Exponential Backoff

Handle serialization failures gracefully:

```python
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(10),
    wait=wait_exponential(multiplier=1, min=0.1, max=10),
    retry=retry_if_exception_type(SerializationFailure)
)
async def execute_with_retry(client, query, params=None):
    """Execute query with automatic retry on serialization failures"""
    async with client.connection() as tx:
        # Isolation is configured server-side
        await tx.begin()
        result, _ = await tx.query(query, params)
        await tx.commit()
        return result

# Usage
result = await execute_with_retry(client, """
    MATCH (product:Product {sku: $sku})
    WHERE product.quantity >= $qty
    SET product.quantity = product.quantity - $qty
""", {"sku": "WIDGET-001", "qty": 5})
```

## Performance Tuning for SSI

### Transaction Duration Optimization

Keep transactions short to reduce conflicts:

```python
# ANTI-PATTERN: Long transaction with non-critical work
async with client.connection() as tx:
    # Isolation is configured server-side
    await tx.begin()
    # External API call (slow!)
    customer_data = await fetch_customer_from_api(customer_id)

    # Complex computation
    recommendations = compute_recommendations(customer_data)

    # Critical database update
    await tx.execute("CREATE (o:Order {data: $data})", {"data": recommendations})

# PATTERN: Move non-critical work outside transaction
customer_data = await fetch_customer_from_api(customer_id)
recommendations = compute_recommendations(customer_data)

# Short transaction for critical section
async with client.connection() as tx:
    # Isolation is configured server-side
    await tx.begin()
    await tx.execute("CREATE (o:Order {data: $data})", {"data": recommendations})
```

### Access Order Consistency

Access data in consistent order to reduce deadlocks:

```python
# ANTI-PATTERN: Random access order
async def transfer_random_order(from_id, to_id, amount):
    async with client.connection() as tx:
        # Isolation is configured server-side
        await tx.begin()
        await tx.execute("""
            MATCH (from:Account {id: $from_id})
            SET from.balance = from.balance - $amount
        """, {"from_id": from_id, "amount": amount})

        await tx.execute("""
            MATCH (to:Account {id: $to_id})
            SET to.balance = to.balance + $amount
        """, {"to_id": to_id, "amount": amount})

# PATTERN: Consistent access order
async def transfer_ordered(from_id, to_id, amount):
    # Always access accounts in ID order
    first_id, second_id = (from_id, to_id) if from_id < to_id else (to_id, from_id)

    async with client.connection() as tx:
        # Isolation is configured server-side
        await tx.begin()
        await tx.execute("""
            MATCH (a1:Account {id: $id1}), (a2:Account {id: $id2})
            SET a1.balance = CASE WHEN $id1 = $from THEN a1.balance - $amt ELSE a1.balance + $amt END,
                a2.balance = CASE WHEN $id2 = $from THEN a2.balance - $amt ELSE a2.balance + $amt END
        """, {"id1": first_id, "id2": second_id, "from": from_id, "amt": amount})
```

### Monitoring SSI Performance

Track serialization failures:

```python
from geode_client import QueryError
from prometheus_client import Counter, Histogram

serialization_failures = Counter('geode_serialization_failures', 'Total serialization failures')
transaction_duration = Histogram('geode_transaction_duration_seconds', 'Transaction duration')

async def monitored_transaction(client, operation):
    start_time = time.time()

    try:
        async with client.connection() as tx:
            # Isolation is configured server-side
            await tx.begin()
            result = await operation(tx)
            await tx.commit()
            return result
    except QueryError as exc:
        if "SERIALIZATION" not in str(exc):
            raise
        serialization_failures.inc()
        raise
    finally:
        duration = time.time() - start_time
        transaction_duration.observe(duration)
```

### Adaptive Isolation Levels

Use SSI only when necessary:

```python
class AdaptiveIsolation:
    def __init__(self, client):
        self.client = client
        self.failure_counts = {}

    async def execute_adaptive(self, key, query, params=None):
        """Automatically adjust isolation level based on failure rate"""

        failures = self.failure_counts.get(key, 0)

        try:
            async with self.client.connection() as conn:
                # Isolation is configured server-side
                await conn.begin()
                result, _ = await conn.query(query, params)
                await conn.commit()

            # Success - decay failure count
            if key in self.failure_counts:
                self.failure_counts[key] = max(0, self.failure_counts[key] - 1)

            return result

        except QueryError as exc:
            if "SERIALIZATION" not in str(exc):
                raise
            # Increment failure count
            self.failure_counts[key] = self.failure_counts.get(key, 0) + 1
            raise
```

## Troubleshooting SSI Issues

### High Abort Rates

**Symptom**: Many serialization failures
**Diagnosis**:

```python
# Check abort rate
async def check_abort_rate(client):
    async with client.connection() as conn:
        stats, _ = await conn.query(
            """
            SELECT
                COUNT(*) FILTER (WHERE status = 'aborted') AS aborted,
                COUNT(*) FILTER (WHERE status = 'committed') AS committed,
                COUNT(*) FILTER (WHERE status = 'aborted') * 100.0 / COUNT(*) AS abort_rate
            -- no transaction-log table
            WHERE timestamp > now() - interval '1 hour'
            """
        )

    row = stats.rows[0] if stats.rows else None
    if row:
        abort_rate = float(row["abort_rate"].as_decimal)
        if abort_rate > 5.0:
            print(f"WARNING: High abort rate: {abort_rate:.2f}%")
```

**Solutions**:

- Reduce transaction duration
- Access data in consistent order
- Partition hotspot data
- Use lower isolation if acceptable

### Conflict Analysis

Identify conflicting transactions:

```gql
-- Find transactions with frequent conflicts
-- Geode reports no per-conflict history; serialization failures surface as
-- errors on the failing statement.
```

### Performance Degradation

Monitor commit latency:

```python
import matplotlib.pyplot as plt

async def plot_commit_latency(client):
    async with client.connection() as conn:
        stats, _ = await conn.query(
            """
            SELECT
                date_trunc('minute', timestamp) AS minute,
                AVG(commit_duration_ms) AS avg_latency,
                MAX(commit_duration_ms) AS max_latency,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY commit_duration_ms) AS p95_latency
            -- no transaction-log table
            WHERE timestamp > now() - interval '1 hour'
              AND status = 'committed'
            GROUP BY minute
            ORDER BY minute
            """
        )

    minutes = [row['minute'] for row in stats]
    avg = [row['avg_latency'] for row in stats]
    p95 = [row['p95_latency'] for row in stats]

    plt.plot(minutes, avg, label='Average')
    plt.plot(minutes, p95, label='P95')
    plt.xlabel('Time')
    plt.ylabel('Latency (ms)')
    plt.legend()
    plt.savefig('commit_latency.png')
```

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

- [Transactions Guide](/docs/transactions/) - Complete transaction documentation
- [Performance Optimization](/docs/performance/) - Performance tuning techniques

### Academic Papers

- "Serializable Isolation for Snapshot Databases" (Cahill et al., 2008) - Original SSI paper

### Implementation Details

- [Architecture Overview](/docs/architecture/) - System architecture including SSI
- [Distributed Systems](/docs/architecture/distributed-systems/) - Distributed transaction handling

Geode's SSI implementation provides true serializability with excellent performance. By detecting dangerous structures at commit time rather than blocking during execution, SSI enables high-concurrency workloads while maintaining the strongest possible correctness guarantees.
