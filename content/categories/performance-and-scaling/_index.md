---
title: "Category: Performance and Scaling"
description: "Comprehensive performance optimization and scaling documentation for Geode including indexing strategies, query optimization, connection pooling, profiling, and horizontal scaling."
keywords:
  - performance
  - scaling
  - optimization
  - indexing
  - query tuning
  - profiling
  - benchmarking
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/performance-and-scaling/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

The **Performance and Scaling** category provides comprehensive guidance on optimizing Geode for maximum throughput, minimal latency, and efficient resource utilization. Whether you're tuning a single-node deployment or planning a distributed architecture, these resources help you achieve production-ready performance.

## Understanding Graph Database Performance

Graph database performance differs fundamentally from relational databases. Traditional databases excel at scanning large tables but struggle with multi-hop joins. Graphs invert this: traversing relationships is fast regardless of depth, but scanning all nodes is expensive. Understanding this trade-off is essential for effective optimization.

**Index-based lookups** provide O(log n) access to starting points for graph traversals. **Relationship traversal** operates in O(k) time where k is the number of adjacent relationships, regardless of total graph size. **Pattern matching** combines these primitives, making proper index usage critical for query performance.

## Indexing Strategies

Indexes are the foundation of graph query performance. Without indexes, Geode must scan all nodes to find pattern matches. With proper indexes, queries execute in milliseconds even on large graphs.

### Label and Property Indexes

Create indexes on frequently queried node labels and properties:

```gql
-- Index for user lookups by email
CREATE INDEX user_email_idx ON Person(email);

-- Composite index for multi-property queries
CREATE INDEX product_category_price_idx ON Product(category, price);

-- Index on relationship properties
CREATE INDEX transaction_timestamp_idx ON TRANSACTION(timestamp);
```

**When to index**:
- Properties used in `WHERE` clauses
- Properties used for `ORDER BY`
- Properties used in equality comparisons
- Frequently traversed relationship types

**When not to index**:
- Properties with very low cardinality (e.g., boolean flags)
- Properties rarely queried
- Write-heavy workloads where index maintenance overhead outweighs read benefits

### Index Selection and Monitoring

Geode's query planner automatically selects optimal indexes using cost-based optimization. Use `EXPLAIN` to verify index usage:

```gql
EXPLAIN
MATCH (u:User {email: $email})-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN p.name, p.price
ORDER BY p.price DESC
```

The execution plan shows:
- Which indexes were considered and chosen
- Estimated cardinalities at each step
- Scan types (index seek vs. full scan)
- Join strategies

Monitor index effectiveness in production:

```python
import geode_client

client = geode_client.open_database("localhost:3141")

async with client.connection() as client:
    # Query index statistics
    stats, _ = await client.query("""
        SHOW INDEX STATISTICS
    """)

    for idx in stats:
        print(f"Index: {idx['name']}")
        print(f"  Reads: {idx['read_count']}")
        print(f"  Selectivity: {idx['selectivity']}")
        print(f"  Size: {idx['size_bytes']}")
```

## Query Optimization

### Pattern Matching Optimization

Order patterns from most selective to least selective. The query planner uses cardinality estimates, but you can guide it with explicit ordering:

```gql
-- Inefficient: starts with broad pattern
MATCH (u:User)-[:FOLLOWS]->(friend:User)
WHERE u.email = 'alice@example.com'
RETURN friend.name

-- Efficient: starts with indexed lookup
MATCH (u:User {email: 'alice@example.com'})-[:FOLLOWS]->(friend:User)
RETURN friend.name
```

**Variable-length paths** can be expensive. Limit the maximum depth when possible:

```gql
-- Unbounded depth (potentially expensive)
MATCH path = (a:Person)-[:KNOWS*]-(b:Person {name: 'Bob'})
RETURN path

-- Bounded depth (more predictable)
MATCH path = (a:Person)-[:KNOWS*1..4]-(b:Person {name: 'Bob'})
RETURN path
LIMIT 10
```

### Aggregation Optimization

Push filters before aggregations to reduce data volumes:

```gql
-- Less efficient: aggregates then filters
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH u, COUNT(p) AS purchase_count
WHERE purchase_count > 10
RETURN u.name, purchase_count

-- More efficient: filters then aggregates
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE p.price > 50
WITH u, COUNT(p) AS expensive_purchases
WHERE expensive_purchases > 10
RETURN u.name, expensive_purchases
```

Use indexes on aggregation keys:

```gql
-- Ensure index exists for grouping
CREATE INDEX transaction_user_idx ON TRANSACTION(user_id);

-- Efficient grouped aggregation
MATCH (u:User)-[t:TRANSACTION]->()
RETURN u.id, SUM(t.amount) AS total
GROUP BY u.id
```

### Prepared Statements

Prepared statements improve performance by caching query plans:

```python
client = geode_client.open_database("localhost:3141")
async with client.connection() as client:
    # Prepare once
    stmt = await client.prepare("""
        MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)
        RETURN p.name, p.price
        ORDER BY p.price DESC
    """)

    # Execute many times with different parameters
    for user_id in range(1000):
        result, _ = await stmt.execute({"user_id": user_id})
        process_results(result)
```

Benefits:
- Query parsing and planning occur once
- Parameter values can be efficiently bound
- Network roundtrips reduced in some protocols
- Query plan cache improves resource utilization

## Profiling and Diagnostics

### Query Profiling

Use `PROFILE` to measure actual query execution:

```gql
PROFILE
MATCH (u:User)-[:FOLLOWS*2..3]->(recommendation:User)
WHERE NOT EXISTS {
    MATCH (u)-[:FOLLOWS]->(recommendation)
}
RETURN recommendation.name, COUNT(*) AS mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10
```

Profile output includes:
- **Execution time**: Actual wall-clock time per operator
- **Rows processed**: Actual cardinalities vs. estimates
- **Cache hits**: Index and data cache effectiveness
- **Memory usage**: Peak memory per operator

Compare estimated vs. actual cardinalities. Large discrepancies indicate:
- Missing or outdated statistics
- Complex predicates the planner can't estimate
- Correlated data patterns
- Opportunities for manual optimization

### Performance Metrics

Monitor key metrics in production:

```python
# Query performance metrics
metrics, _ = await client.query("""
    SELECT
        query_id,
        execution_time_ms,
        rows_read,
        rows_written,
        cache_hit_ratio
    FROM system.query_log
    WHERE execution_time_ms > 1000
    ORDER BY execution_time_ms DESC
    LIMIT 20
""")
```

Critical metrics:
- **Query latency**: p50, p95, p99 percentiles
- **Throughput**: Queries per second
- **Cache hit rates**: Index cache, data cache, query plan cache
- **Resource utilization**: CPU, memory, disk I/O
- **Connection pool**: Active connections, wait times, errors

### Continuous Profiling

Enable query logging for production systems:

```bash
# Server configuration
./geode serve \
    --query-log /var/log/geode/queries.log \
    --slow-query-threshold 100ms \
    --metrics-export prometheus \
    --metrics-port 9090
```

Integrate with observability platforms:

```yaml
# Prometheus configuration
scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: '/metrics'
```

## Connection Management

### Connection Pooling

Client libraries provide automatic connection pooling:

```go
import "go.codepros.org/geode"

// Create connection pool
pool, err := geode.NewPool(geode.PoolConfig{
    MinSize: 10,
    MaxSize: 100,
    MaxIdleTime: 5 * time.Minute,
    MaxLifetime: 30 * time.Minute,
})

// Pool automatically manages connections
ctx := context.Background()
result, err := pool.Query(ctx, "MATCH (n:Node) RETURN count(n)")
```

**Pool sizing guidelines**:
- MinSize: Keep connections warm for low-latency response
- MaxSize: Match available server connection capacity
- Idle timeout: Balance resource utilization vs. connection overhead
- Lifetime: Rotate connections to prevent resource leaks

### Concurrent Queries

Geode's MVCC architecture enables high concurrency:

```python
import asyncio

async def concurrent_queries():
    client = geode_client.open_database("localhost:3141")
    async with client.connection() as client:
        # Execute 100 queries concurrently
        tasks = [
            client.execute("MATCH (n:Node {id: $id}) RETURN n", {"id": i})
            for i in range(100)
        ]
        results = await asyncio.gather(*tasks)
        return results
```

Concurrency limits:
- **Read queries**: Limited only by system resources (CPU, memory)
- **Write queries**: SSI isolation may cause conflicts in high-contention scenarios
- **Transactions**: Use optimistic concurrency; retry on conflicts

## Memory Management

### Cache Tuning

Geode uses multiple caches for performance:

```bash
# Server configuration
./geode serve \
    --index-cache-size 2GB \
    --data-cache-size 8GB \
    --query-plan-cache-size 256MB
```

**Index cache**: Stores index B-tree nodes. Size based on index working set.

**Data cache**: Stores frequently accessed nodes and relationships. Size based on hot data working set.

**Query plan cache**: Stores compiled query plans. Usually small (100-500MB).

Monitor cache effectiveness:

```gql
SELECT
    cache_name,
    size_bytes,
    entry_count,
    hit_rate,
    eviction_count
FROM system.cache_statistics
```

Adjust sizes based on hit rates. Target 90%+ hit rate for index cache, 70%+ for data cache.

### Memory-Bounded Operations

Limit memory usage for large operations:

```gql
-- Use LIMIT to bound result sets
MATCH (n:Node)
RETURN n
LIMIT 10000

-- Use pagination for large exports
MATCH (n:Node)
WHERE n.created > $checkpoint
ORDER BY n.created
LIMIT 10000
```

For analytical workloads, consider materialized views or batch processing.

## Horizontal Scaling

### Read Replicas

Distribute read load across multiple nodes:

```bash
# Primary node (accepts writes)
./geode serve --role primary --listen 0.0.0.0:3141

# Read replica (read-only)
./geode serve \
    --role replica \
    --primary primary.example.com:3141 \
    --listen 0.0.0.0:3141
```

Client routing:

```python
# Primary for writes
primary = geode_client.open_database("primary.example.com:3141")
# Replicas for reads
replicas = geode_client.Pool([
    "replica1.example.com:3141",
    "replica2.example.com:3141",
    "replica3.example.com:3141"
])

# Route appropriately
await primary.execute("CREATE (n:Node {id: 123})")
result, _ = await replicas.query("MATCH (n:Node) RETURN count(n)")
```

### Sharding Strategies

Partition large graphs across multiple databases:

**Geographic sharding**: Route based on location
**Functional sharding**: Separate by entity type
**Hash sharding**: Distribute by consistent hash

Implement application-level routing:

```python
def get_shard(user_id):
    """Route to appropriate shard based on user ID"""
    shard_id = hash(user_id) % NUM_SHARDS
    return shard_connections[shard_id]

# Route query to correct shard
shard = get_shard(user_id)
result, _ = await shard.query("MATCH (u:User {id: $id})", {"id": user_id})
```

## Best Practices

1. **Index strategically**: Cover common query patterns without over-indexing
2. **Profile before optimizing**: Measure actual bottlenecks, don't guess
3. **Use prepared statements**: For repeated queries with different parameters
4. **Leverage connection pooling**: Reuse connections efficiently
5. **Monitor continuously**: Track performance metrics in production
6. **Test at scale**: Performance characteristics change with data volume
7. **Plan for growth**: Design with 10x future capacity in mind
8. **Document optimization decisions**: Explain why indexes and tuning choices were made

## Related Topics

- [Query Optimization](/categories/query-optimization/) - GQL query tuning techniques
- [Indexing](/tags/indexing/) - Index design and management
- [Profiling](/tags/profiling/) - Performance measurement tools
- [Monitoring](/tags/monitoring/) - Production observability
- [Architecture](/docs/architecture/) - System design for performance
- [Deployment](/tags/deployment/) - Production deployment patterns

## Further Reading

- [EXPLAIN Command](/docs/gql-reference/explain/) - Query execution plans
- [PROFILE Command](/docs/gql-reference/profile/) - Query performance measurement
- [Index Management](/docs/reference/indexes/) - Creating and maintaining indexes
- [Configuration Reference](/docs/configuration/) - Performance tuning parameters
- [Benchmarking Guide](/docs/performance/benchmarking/) - Performance testing methodology
