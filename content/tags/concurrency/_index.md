---
title: "Concurrency Control"
description: "Explore Geode documentation tagged with concurrency. Learn about concurrency features, best practices, and implementation details."
keywords:
  - concurrency
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/concurrency/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Concurrency Control in Geode

Concurrency control manages simultaneous access to database resources, ensuring data consistency while maximizing throughput. Geode implements sophisticated concurrency mechanisms based on Multi-Version Concurrency Control (MVCC) and Serializable Snapshot Isolation (SSI), enabling high-performance concurrent operations without compromising ACID guarantees.

## Introduction to Database Concurrency

When multiple clients access a database simultaneously, conflicts can arise:

- **Read-Write Conflicts**: One transaction reads data while another modifies it
- **Write-Write Conflicts**: Two transactions modify the same data concurrently
- **Phantom Reads**: Query results change due to concurrent inserts/deletes
- **Lost Updates**: One transaction's changes overwrite another's

Traditional locking approaches (pessimistic concurrency) prevent conflicts by blocking operations, but reduce throughput. Modern databases like Geode use optimistic approaches that allow conflicts but detect and resolve them, providing both consistency and performance.

## Geode's Concurrency Architecture

### Multi-Version Concurrency Control (MVCC)

MVCC maintains multiple versions of data, allowing readers and writers to proceed without blocking each other:

**How it works**:
1. Each transaction sees a consistent snapshot of the database
2. Writes create new versions rather than modifying existing data
3. Readers access appropriate versions based on transaction start time
4. Old versions are garbage collected when no longer needed

**Benefits**:
- **Readers never block writers** (and vice versa)
- **Consistent reads** without locks
- **High throughput** for read-heavy workloads
- **Point-in-time queries** possible

```gql
-- Transaction 1 starts
BEGIN TRANSACTION;
MATCH (u:User {id: 123}) RETURN u.balance;  -- Returns $100

-- Transaction 2 (concurrent) modifies the same user
-- Transaction 1 still sees $100 (snapshot isolation)

-- Transaction 1 continues with consistent view
MATCH (u:User {id: 123})
SET u.last_accessed = timestamp();
COMMIT;
```

### Serializable Snapshot Isolation (SSI)

SSI prevents anomalies that can occur with basic snapshot isolation:

```gql
-- Example: Preventing write skew
-- Two users try to book the last seat

-- Transaction 1
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
MATCH (seat:Seat {id: 42})
WHERE NOT EXISTS { MATCH (seat)<-[:BOOKED]-() }
CREATE (user1:User {id: 1})-[:BOOKED]->(seat);
COMMIT;  -- Succeeds

-- Transaction 2 (concurrent)
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
MATCH (seat:Seat {id: 42})
WHERE NOT EXISTS { MATCH (seat)<-[:BOOKED]-() }
CREATE (user2:User {id: 2})-[:BOOKED]->(seat);
COMMIT;  -- Fails with serialization error
```

**SSI detection mechanisms**:
- **Read-Write conflict detection**: Tracks dependencies between transactions
- **Write-Write conflict detection**: Identifies concurrent modifications
- **Automatic retry**: Failed transactions can be retried automatically

## Isolation Levels

Geode supports multiple isolation levels, trading off between consistency and performance:

### Read Uncommitted (Rarely Used)

**Behavior**: Can see uncommitted changes from other transactions
**Use case**: Approximate queries where accuracy isn't critical

```gql
BEGIN TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
-- May see intermediate states
MATCH (p:Product) RETURN avg(p.price);
COMMIT;
```

### Read Committed (Default for Many Operations)

**Behavior**: Sees only committed data, but may observe changes during transaction
**Use case**: Most OLTP workloads

```gql
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
MATCH (u:User {id: $id}) RETURN u;  -- Sees committed state at query time
-- Another transaction commits changes to same user
MATCH (u:User {id: $id}) RETURN u;  -- May see different data
COMMIT;
```

### Repeatable Read

**Behavior**: Consistent snapshot throughout transaction
**Use case**: Reports, analytics requiring consistent view

```gql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;
MATCH (u:User {id: $id}) RETURN u;  -- Snapshot at transaction start
-- Other transactions modify data
MATCH (u:User {id: $id}) RETURN u;  -- Same result as first query
COMMIT;
```

### Serializable (Strongest)

**Behavior**: Transactions appear to execute serially
**Use case**: Critical operations requiring absolute consistency

```gql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- All operations see consistent snapshot
-- Write conflicts detected and transaction may abort
COMMIT;
```

## Concurrency Patterns and Best Practices

### Pattern 1: Optimistic Locking with Version Numbers

Detect concurrent modifications using version fields:

```gql
-- Read with version
MATCH (account:Account {id: $account_id})
RETURN account.balance, account.version;
-- Returns: balance=100, version=5

-- Update with version check
MATCH (account:Account {id: $account_id})
WHERE account.version = $expected_version  -- Check version hasn't changed
SET account.balance = $new_balance,
    account.version = $expected_version + 1
RETURN account;
-- Fails if another transaction modified account (version changed)
```

**Python implementation**:
```python
from geode_client import GeodeClient, ConcurrentModificationError

async def update_account_balance(account_id, amount):
    async with GeodeClient("localhost", 3141) as client:
        while True:  # Retry loop
            # Read current state
            result = await client.execute("""
                MATCH (a:Account {id: $id})
                RETURN a.balance AS balance, a.version AS version
            """, {"id": account_id})

            current_balance = result.bindings[0]['balance']
            current_version = result.bindings[0]['version']

            # Attempt update with version check
            try:
                await client.execute("""
                    MATCH (a:Account {id: $id})
                    WHERE a.version = $version
                    SET a.balance = $new_balance,
                        a.version = $version + 1
                """, {
                    "id": account_id,
                    "version": current_version,
                    "new_balance": current_balance + amount
                })
                break  # Success
            except ConcurrentModificationError:
                # Another transaction modified it, retry
                await asyncio.sleep(0.01)  # Brief backoff
```

### Pattern 2: Atomic Operations

Use atomic modifications to avoid read-modify-write races:

```gql
-- WRONG: Read-modify-write (not atomic)
MATCH (counter:Counter {name: 'page_views'})
WITH counter.value AS current
MATCH (counter:Counter {name: 'page_views'})
SET counter.value = current + 1;  -- Race condition!

-- RIGHT: Atomic increment
MATCH (counter:Counter {name: 'page_views'})
SET counter.value = counter.value + 1;  -- Atomic operation
```

### Pattern 3: Batch Processing with Transactions

Group operations to reduce transaction overhead:

```python
async def process_orders_batch(orders):
    async with GeodeClient("localhost", 3141) as client:
        async with client.transaction(isolation_level="SERIALIZABLE"):
            for order in orders:
                await client.execute("""
                    MATCH (p:Product {id: $product_id})
                    WHERE p.stock >= $quantity
                    SET p.stock = p.stock - $quantity
                    CREATE (order:Order {
                        id: $order_id,
                        product_id: $product_id,
                        quantity: $quantity,
                        timestamp: timestamp()
                    })
                """, {
                    "product_id": order.product_id,
                    "quantity": order.quantity,
                    "order_id": order.id
                })
            # All operations commit together
```

### Pattern 4: Pessimistic Locking When Necessary

For critical sections requiring exclusive access:

```gql
-- Explicit locking (use sparingly)
BEGIN TRANSACTION;
MATCH (resource:Resource {id: $id})
SET resource.locked = true;  -- Application-level lock

-- Perform critical operations
MATCH (resource:Resource {id: $id})
WHERE resource.locked = true
SET resource.state = 'processing';

-- Release lock
MATCH (resource:Resource {id: $id})
SET resource.locked = false;
COMMIT;
```

## Handling Deadlocks

Deadlocks occur when transactions wait for each other circularly:

**Example scenario**:
- Transaction A locks Node 1, waits for Node 2
- Transaction B locks Node 2, waits for Node 1
- Neither can proceed (deadlock)

**Geode's deadlock prevention**:
1. **Timeout-based detection**: Transactions timeout after configurable period
2. **Automatic rollback**: One transaction is chosen as victim and rolled back
3. **Retry hints**: Client receives error indicating retry-able failure

```python
from geode_client import DeadlockError

async def transfer_funds_with_retry(from_account, to_account, amount, max_retries=3):
    for attempt in range(max_retries):
        try:
            async with GeodeClient("localhost", 3141) as client:
                async with client.transaction(isolation_level="SERIALIZABLE"):
                    # Debit from account
                    await client.execute("""
                        MATCH (a:Account {id: $id})
                        WHERE a.balance >= $amount
                        SET a.balance = a.balance - $amount
                    """, {"id": from_account, "amount": amount})

                    # Credit to account
                    await client.execute("""
                        MATCH (a:Account {id: $id})
                        SET a.balance = a.balance + $amount
                    """, {"id": to_account, "amount": amount})

            return  # Success
        except DeadlockError:
            if attempt == max_retries - 1:
                raise  # Final attempt failed
            await asyncio.sleep(0.1 * (attempt + 1))  # Exponential backoff
```

**Deadlock avoidance strategies**:
1. **Consistent ordering**: Always access resources in same order
2. **Short transactions**: Minimize lock hold time
3. **Coarse-grained locking**: Lock at higher level to reduce conflicts
4. **Retry logic**: Implement exponential backoff

## Connection Pool Management

Connection pooling critical for concurrent access patterns:

```python
from geode_client import ConnectionPool

# Configure pool for high concurrency
pool = ConnectionPool(
    host="localhost",
    port=3141,
    min_connections=10,      # Always maintain 10 connections
    max_connections=100,     # Scale up to 100 under load
    max_idle_time=300,       # Close idle connections after 5 minutes
    connection_timeout=10,   # Fail fast if pool exhausted
    retry_on_timeout=True    # Retry if connection temporarily unavailable
)

# Concurrent query execution
async def concurrent_queries(user_ids):
    tasks = []
    for user_id in user_ids:
        tasks.append(query_user(user_id))

    # Execute concurrently (pool manages connection allocation)
    results = await asyncio.gather(*tasks)
    return results

async def query_user(user_id):
    async with pool.acquire() as client:
        result = await client.execute("""
            MATCH (u:User {id: $id})
            RETURN u
        """, {"id": user_id})
        return result.bindings[0]
```

## Performance Considerations

### Read-Heavy Workloads

MVCC excels for read-heavy patterns:

```python
# Efficient concurrent reads (no locking)
async def analytics_query():
    async with GeodeClient("localhost", 3141) as client:
        # Large analytical query doesn't block writes
        result = await client.execute("""
            MATCH (u:User)-[:PURCHASED]->(p:Product)
            RETURN p.category, count(u) AS buyers
            ORDER BY buyers DESC
        """)
        return result.bindings

# Concurrent writes continue unblocked
async def record_purchase(user_id, product_id):
    async with GeodeClient("localhost", 3141) as client:
        await client.execute("""
            MATCH (u:User {id: $user_id}), (p:Product {id: $product_id})
            CREATE (u)-[:PURCHASED {timestamp: timestamp()}]->(p)
        """, {"user_id": user_id, "product_id": product_id})
```

### Write-Heavy Workloads

For write-heavy scenarios, minimize contention:

```python
# GOOD: Partition writes to reduce conflicts
async def record_page_view(page_id, user_id):
    # Use time-based partitioning
    partition_key = f"{page_id}_{datetime.now().hour}"

    async with GeodeClient("localhost", 3141) as client:
        await client.execute("""
            MERGE (counter:PageViewCounter {key: $key})
            ON CREATE SET counter.views = 1
            ON MATCH SET counter.views = counter.views + 1
        """, {"key": partition_key})

# BAD: Single hot counter (high contention)
async def record_page_view_bad(page_id):
    async with GeodeClient("localhost", 3141) as client:
        await client.execute("""
            MATCH (page:Page {id: $id})
            SET page.view_count = page.view_count + 1
        """, {"id": page_id})
```

## Troubleshooting Concurrency Issues

### Symptom: High Transaction Abort Rate

**Diagnosis**:
```gql
-- Check transaction statistics
SHOW STATUS LIKE 'transaction_%';
-- Look for: transaction_aborts, transaction_conflicts
```

**Solutions**:
1. Lower isolation level if consistency requirements permit
2. Reduce transaction scope (fewer operations per transaction)
3. Implement retry logic with exponential backoff
4. Redesign schema to reduce hot spots

### Symptom: Slow Query Performance Under Load

**Diagnosis**:
```python
# Monitor connection pool metrics
print(f"Active connections: {pool.active_connections}")
print(f"Idle connections: {pool.idle_connections}")
print(f"Wait time: {pool.average_wait_time}ms")
```

**Solutions**:
1. Increase connection pool size
2. Optimize queries to reduce execution time
3. Add read replicas for read-heavy workloads
4. Implement caching for frequently accessed data

### Symptom: Deadlock Errors

**Diagnosis**: Check error logs for deadlock cycles

**Solutions**:
1. Ensure consistent resource access ordering
2. Break long transactions into smaller ones
3. Add retry logic with backoff
4. Consider application-level coordination

## Related Topics

- **[MVCC](/tags/mvcc/)**: Multi-Version Concurrency Control details
- **[SSI](/tags/ssi/)**: Serializable Snapshot Isolation deep dive
- **[Transactions](/tags/transactions/)**: Transaction management
- **[Isolation](/tags/isolation/)**: Isolation levels explained
- **[Performance](/tags/performance/)**: Performance optimization
- **[Connections](/tags/connections/)**: Connection management

## Advanced Concurrency Techniques

### Lock-Free Data Structures

Geode uses lock-free algorithms internally for maximum concurrency:

```
Compare-and-Swap (CAS) Operations:
1. Read current value
2. Compute new value
3. Atomically update if value unchanged
4. Retry if value changed (optimistic)

Example: Lock-free counter increment
do {
    old_value = counter.read()
    new_value = old_value + 1
} while (!counter.compare_and_swap(old_value, new_value))
```

Benefits:
- No thread blocking
- Progress guarantee (wait-free or lock-free)
- Better CPU cache utilization
- Higher throughput under contention

### Multi-Version Read Consistency

MVCC provides snapshot isolation by maintaining version chains:

```
Node ID: 123
Version Chain:
  [v5] name='Alice'  age=35  txn=550  valid_from=LSN_550  valid_to=∞
  [v4] name='Alice'  age=34  txn=510  valid_from=LSN_510  valid_to=LSN_550
  [v3] name='Alice'  age=33  txn=480  valid_from=LSN_480  valid_to=LSN_510
  [v2] name='Alice'  age=32  txn=450  valid_from=LSN_450  valid_to=LSN_480
  [v1] name='Alice'  age=30  txn=420  valid_from=LSN_420  valid_to=LSN_450

Transaction at LSN_500 sees version v3 (age=33)
Transaction at LSN_540 sees version v4 (age=34)
```

Garbage collection removes old versions when no transactions need them.

### Write Skew Prevention

Serializable isolation prevents write skew anomalies:

```python
# Classic write skew example: on-call doctors
async def assign_on_call_shift(doctor_id):
    async with client.transaction(isolation_level="SERIALIZABLE"):
        # Check if at least one doctor will remain on call
        result = await client.execute("""
            MATCH (d:Doctor {on_call: true})
            WHERE d.id != $doctor_id
            RETURN COUNT(d) AS on_call_count
        """, {"doctor_id": doctor_id})

        if result.bindings[0]['on_call_count'] >= 1:
            # Safe to go off call
            await client.execute("""
                MATCH (d:Doctor {id: $doctor_id})
                SET d.on_call = false
            """, {"doctor_id": doctor_id})
        else:
            raise Exception("Cannot go off call - no other doctors available")

# Without SERIALIZABLE, two doctors could simultaneously check and both go off call
# With SERIALIZABLE, one transaction aborts with serialization error
```

### Timestamp Ordering

Geode uses hybrid logical clocks for timestamp ordering:

```
Hybrid Logical Clock (HLC):
  physical_time: System wall clock (64-bit microseconds)
  logical_counter: Incrementing counter for same physical time

Transaction Ordering:
  T1: HLC = (1706097600000000, 0)
  T2: HLC = (1706097600000000, 1)  # Same physical time, later logical
  T3: HLC = (1706097600000001, 0)  # Later physical time

Total Order: T1 < T2 < T3
```

This provides:
- Global transaction ordering
- Causality tracking
- Clock skew tolerance

## Real-World Concurrency Patterns

### High-Frequency Trading System

```python
# Process market data updates with high concurrency
from geode_client import ConnectionPool, SerializationError
import asyncio

pool = ConnectionPool(
    host="localhost",
    port=3141,
    min_connections=50,
    max_connections=200
)

async def update_order_book(symbol, price, quantity):
    """Update order book with optimistic concurrency"""
    max_retries = 10
    for attempt in range(max_retries):
        try:
            async with pool.acquire() as client:
                async with client.transaction(isolation_level="SERIALIZABLE"):
                    # Read current order book version
                    result = await client.execute("""
                        MATCH (book:OrderBook {symbol: $symbol})
                        RETURN book.version AS version,
                               book.bids AS bids,
                               book.asks AS asks
                    """, {"symbol": symbol})

                    current = result.bindings[0]

                    # Update order book (business logic)
                    updated_bids, updated_asks = merge_order(
                        current['bids'],
                        current['asks'],
                        price,
                        quantity
                    )

                    # Write with version check
                    await client.execute("""
                        MATCH (book:OrderBook {symbol: $symbol})
                        WHERE book.version = $version
                        SET book.bids = $bids,
                            book.asks = $asks,
                            book.version = $version + 1,
                            book.last_update = timestamp()
                    """, {
                        "symbol": symbol,
                        "version": current['version'],
                        "bids": updated_bids,
                        "asks": updated_asks
                    })

                return  # Success
        except SerializationError:
            if attempt == max_retries - 1:
                raise
            # Exponential backoff with jitter
            await asyncio.sleep(0.001 * (2 ** attempt) * (0.5 + random.random()))

# Run hundreds of concurrent updates
async def main():
    tasks = []
    for _ in range(1000):
        symbol = random.choice(['AAPL', 'GOOGL', 'MSFT'])
        price = random.uniform(100, 200)
        quantity = random.randint(1, 100)
        tasks.append(update_order_book(symbol, price, quantity))

    await asyncio.gather(*tasks)
    # All updates complete with correct concurrency control
```

### Social Media Feed Generation

```python
# Generate personalized feeds with concurrent reads
async def generate_user_feed(user_id, limit=50):
    """Generate feed by reading from multiple sources concurrently"""
    async with pool.acquire() as client:
        # Start transaction with REPEATABLE READ (consistent snapshot)
        async with client.transaction(isolation_level="REPEATABLE_READ"):
            # Concurrent queries for feed components
            following_posts, trending, ads = await asyncio.gather(
                # Posts from followed users
                client.execute("""
                    MATCH (u:User {id: $user_id})-[:FOLLOWS]->(f:User)
                    MATCH (f)-[:POSTED]->(p:Post)
                    WHERE p.created_at > datetime().minusDays(7)
                    RETURN p
                    ORDER BY p.created_at DESC
                    LIMIT 30
                """, {"user_id": user_id}),

                # Trending posts
                client.execute("""
                    MATCH (p:Post)
                    WHERE p.created_at > datetime().minusHours(24)
                    RETURN p
                    ORDER BY p.engagement_score DESC
                    LIMIT 10
                """),

                # Targeted ads
                client.execute("""
                    MATCH (u:User {id: $user_id})-[:INTERESTED_IN]->(i:Interest)
                    MATCH (a:Ad)-[:TARGETS]->(i)
                    WHERE NOT (u)-[:DISMISSED]->(a)
                    RETURN a
                    LIMIT 5
                """, {"user_id": user_id})
            )

            # Merge and rank results (all from consistent snapshot)
            feed = merge_feed_items(
                following_posts.bindings,
                trending.bindings,
                ads.bindings
            )

            return feed[:limit]
```

### Inventory Management with Reservations

```python
# Handle concurrent product reservations
async def reserve_inventory(product_id, quantity, order_id):
    """Reserve inventory with pessimistic locking for critical section"""
    async with pool.acquire() as client:
        async with client.transaction(isolation_level="SERIALIZABLE"):
            # Lock product row for update
            result = await client.execute("""
                MATCH (p:Product {id: $product_id})
                WHERE p.available_quantity >= $quantity
                RETURN p.available_quantity AS available
            """, {"product_id": product_id, "quantity": quantity})

            if not result.bindings:
                raise InsufficientInventoryError("Not enough inventory")

            # Create reservation
            await client.execute("""
                MATCH (p:Product {id: $product_id})
                SET p.available_quantity = p.available_quantity - $quantity

                CREATE (r:Reservation {
                    id: $order_id,
                    product_id: $product_id,
                    quantity: $quantity,
                    reserved_at: timestamp(),
                    expires_at: timestamp().plusMinutes(15)
                })
                CREATE (p)-[:HAS_RESERVATION]->(r)
            """, {
                "product_id": product_id,
                "quantity": quantity,
                "order_id": order_id
            })

# Background task to release expired reservations
async def release_expired_reservations():
    """Periodic cleanup of expired reservations"""
    while True:
        async with pool.acquire() as client:
            await client.execute("""
                MATCH (p:Product)-[rel:HAS_RESERVATION]->(r:Reservation)
                WHERE r.expires_at < timestamp()

                SET p.available_quantity = p.available_quantity + r.quantity

                DELETE rel, r
            """)

        await asyncio.sleep(60)  # Check every minute
```

## Concurrency Benchmarking

### Load Testing Framework

```python
import asyncio
import time
from statistics import mean, stdev

class ConcurrencyBenchmark:
    def __init__(self, pool, test_duration=60):
        self.pool = pool
        self.test_duration = test_duration
        self.latencies = []
        self.errors = 0
        self.successes = 0

    async def worker(self, worker_id):
        """Individual worker executing queries"""
        start_time = time.time()

        while time.time() - start_time < self.test_duration:
            query_start = time.time()
            try:
                async with self.pool.acquire() as client:
                    # Execute test query
                    await client.execute("""
                        MATCH (u:User)
                        WHERE u.id = $id
                        RETURN u
                    """, {"id": worker_id % 10000})

                latency = (time.time() - query_start) * 1000  # ms
                self.latencies.append(latency)
                self.successes += 1
            except Exception as e:
                self.errors += 1

    async def run(self, concurrency_level):
        """Run benchmark with specified concurrency"""
        print(f"Running benchmark: {concurrency_level} concurrent workers")

        workers = [self.worker(i) for i in range(concurrency_level)]
        await asyncio.gather(*workers)

        # Calculate statistics
        total_queries = self.successes + self.errors
        qps = total_queries / self.test_duration
        avg_latency = mean(self.latencies)
        p95_latency = sorted(self.latencies)[int(len(self.latencies) * 0.95)]
        p99_latency = sorted(self.latencies)[int(len(self.latencies) * 0.99)]

        print(f"""
Benchmark Results:
  Total Queries: {total_queries}
  Successes: {self.successes}
  Errors: {self.errors}
  QPS: {qps:.2f}
  Avg Latency: {avg_latency:.2f}ms
  P95 Latency: {p95_latency:.2f}ms
  P99 Latency: {p99_latency:.2f}ms
        """)

# Run benchmarks at various concurrency levels
async def main():
    pool = ConnectionPool("localhost", 3141, max_connections=500)

    for concurrency in [10, 50, 100, 200, 500]:
        benchmark = ConcurrencyBenchmark(pool)
        await benchmark.run(concurrency)
```

### Results Interpretation

Use the benchmark output to identify scaling behavior:

- Look for near-linear scaling as concurrency increases until saturation.
- Expect throughput to plateau once CPU or I/O becomes the bottleneck.
- Track p95/p99 latency; rising tail latency signals saturation.
- Tune pool sizes and worker counts based on your hardware and workload.

## Further Reading

- **Concurrency Control Guide**: `/docs/core-concepts/concurrency-control/`
- **Transaction Isolation**: `/docs/transactions/isolation-levels/`
- **MVCC Implementation**: `/docs/architecture/mvcc/`
- **Deadlock Prevention**: `/docs/troubleshooting/deadlocks/`
- **Connection Pooling**: `/docs/client-libraries/connection-pooling/`
- **Lock-Free Programming**: [1024cores.net](http://www.1024cores.net/home/lock-free-algorithms)
- **Transaction Processing**: [Gray & Reuter](http://jimgray.azurewebsites.net/papers/thetransactionconcept.pdf)
