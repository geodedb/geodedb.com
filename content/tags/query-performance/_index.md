---
title: "Tag: Query Performance"
description: "Achieve optimal query performance in Geode. Learn performance analysis, benchmarking, monitoring, tuning strategies, and production optimization techniques for high-throughput graph database workloads."
keywords:
  - query performance
  - Geode benchmarking
  - graph database speed
  - performance testing
  - throughput optimization
  - latency reduction
  - performance monitoring
  - load testing
  - query tuning
  - production performance
  - database metrics
  - performance baseline
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/query-performance/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Documentation tagged with **query-performance** in the Geode graph database. This comprehensive collection covers performance analysis, benchmarking methodologies, monitoring strategies, tuning techniques, and best practices for achieving maximum throughput and minimal latency in production graph workloads.

## Overview

Query performance is fundamental to building responsive, scalable graph applications. Geode is designed for high-performance graph operations, with optimizations for pattern matching, traversals, aggregations, and complex multi-hop queries. Understanding performance characteristics and tuning strategies ensures your applications meet production SLAs.

Performance considerations include:

- **Throughput**: Queries per second under load
- **Latency**: Response time for individual queries
- **Concurrency**: Performance with multiple simultaneous users
- **Scalability**: Behavior as data volume grows
- **Resource Efficiency**: CPU, memory, and I/O utilization

## Performance Characteristics

### Geode Benchmarks

Representative performance metrics from the server features documentation:

**Point Queries**:

```gql
// Point lookup by unique ID (indexed)
// Latency: <1ms (typically 100-500us)
MATCH (u:User {user_id: '12345'})
RETURN u.name, u.email, u.created_at;
```

**Pattern Matching**:

```gql
// Short path (1-2 hops) with filters
// Latency: 1-5ms
MATCH (u:User {region: 'West'})-[:FOLLOWS]->(f:User)-[:POSTS]->(p:Post)
WHERE p.created_at > '2025-01-01'
RETURN u.name, f.name, p.title
LIMIT 100;
```

**Aggregations**:

```gql
// Aggregation over relationships
// Latency: 5-20ms for ~10k rows; 100-500ms for ~1M rows
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.region = 'East'
RETURN u.region, COUNT(p) AS purchases, SUM(p.price) AS total
GROUP BY u.region;
```

**Complex Traversals**:

```gql
// Variable-length path with filters
// Latency: 10-100ms for 3-5 hops
MATCH path = (u:User)-[:FOLLOWS*1..3]->(influencer:User)
WHERE u.id = 'user123' AND influencer.verified = true
RETURN influencer.name, LENGTH(path) AS hops
ORDER BY hops ASC
LIMIT 20;
```

### Hardware Considerations

Performance scales with hardware resources:

**CPU**:

- Graph traversals are CPU-intensive
- Pattern matching benefits from multiple cores
- Parallel query execution scales linearly up to 64 cores
- Aggregations can leverage SIMD instructions

**Memory**:

- Hot working set should fit in RAM
- Index caching improves lookup performance significantly
- Large result sets require memory for materialization
- Graph cache reduces disk I/O dramatically

**Storage**:

- NVMe SSDs recommended for I/O-intensive workloads
- Read-heavy workloads benefit from SSD caching
- Sequential scans leverage fast sequential reads
- Random access patterns need low-latency storage

**Network**:

- QUIC protocol requires minimal bandwidth
- Large result sets can saturate gigabit connections
- 10GbE recommended for high-throughput applications
- Low latency networks (< 1ms) critical for distributed setups

## Performance Analysis

### Benchmarking Methodology

Establish performance baselines systematically:

**Step 1: Define Workload**:

```gql
-- Identify representative query patterns
-- Example: Social network workload mix

-- 60% Point lookups
MATCH (u:User {user_id: $user_id})
RETURN u;

-- 25% Relationship traversals
MATCH (u:User {user_id: $user_id})-[:FOLLOWS]->(f:User)
RETURN f;

-- 10% Aggregations
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.region = $region
RETURN COUNT(p), SUM(p.price);

-- 5% Complex patterns
MATCH (u:User)-[:FOLLOWS*1..2]->(f:User)-[:POSTS]->(p:Post)
WHERE u.user_id = $user_id
RETURN p
LIMIT 50;
```

**Step 2: Load Test Data**:

```bash
# Create representative dataset
# - Realistic data distribution
# - Production-like volume
# - Appropriate relationship density

# Example: 1M users, 50M follows, 10M posts
geode load --nodes User:1000000 \
           --edges FOLLOWS:50000000 \
           --edges POSTS:10000000 \
           --distribution power-law
```

**Step 3: Measure Baseline**:

```bash
# Run benchmark suite
geode benchmark run \
  --workload social-network.yaml \
  --duration 300s \
  --concurrency 10 \
  --report baseline-results.json

# Output metrics:
# - Throughput (QPS)
# - Latency (p50, p95, p99, max)
# - Error rate
# - Resource utilization
```

**Step 4: Analyze Results**:

```bash
# Generate performance report
geode benchmark analyze baseline-results.json

# Metrics to review:
# - Query distribution by latency
# - Slow query identification
# - Resource bottlenecks (CPU, memory, I/O)
# - Cache hit rates
# - Index utilization
```

### Performance Profiling

Detailed analysis of query execution:

**PROFILE Command**:

```gql
// Profile query execution
PROFILE
MATCH (u:User)-[:PURCHASED]->(p:Product)-[:IN_CATEGORY]->(c:Category)
WHERE u.region = 'West' AND c.name = 'Electronics'
RETURN u.name, COUNT(p) AS purchases, SUM(p.price) AS total
ORDER BY total DESC
LIMIT 20;

// Output breakdown:
// Planning time: 1.2ms
// Execution time: 45.3ms
//   - Index seek (User.region): 2.1ms, 15,234 rows
//   - Expand (PURCHASED): 18.7ms, 89,456 rows
//   - Expand (IN_CATEGORY): 12.3ms, 89,456 rows
//   - Filter (c.name): 3.2ms, 12,345 rows
//   - Aggregation: 7.8ms, 234 groups
//   - Sort: 1.2ms, 234 rows
//   - Limit: 0.1ms, 20 rows
// Total time: 46.5ms
```

**Execution Metrics**:

Key metrics to analyze:

- **Planning Time**: Query optimization overhead
- **Index Seek Time**: Index access efficiency
- **Expand Time**: Relationship traversal cost
- **Filter Time**: Predicate evaluation overhead
- **Aggregation Time**: Grouping and computation cost
- **Sort Time**: Ordering overhead
- **Materialization**: Result set construction time

### Query Metrics

Monitor query performance in production:

**System Views**:

```gql
// Query performance statistics
-- There is no query-statistics table, slow-query log or plan cache to
-- query. Measure a specific statement with EXPLAIN / PROFILE, and scrape
-- aggregate counters from the Prometheus endpoint (GEODE_METRICS_PORT).
```

**Real-Time Monitoring**:

```bash
# Stream live query metrics
geode monitor queries --stream

# Output:
# Timestamp | Query Hash | Duration | Rows | Status
# 14:23:01  | a7b3c2d1   | 12ms     | 150  | OK
# 14:23:01  | e4f5g6h7   | 45ms     | 1200 | OK
# 14:23:02  | a7b3c2d1   | 15ms     | 148  | OK
```

## Performance Tuning

### Index Strategy

Indexes are the primary lever for performance optimization:

**Create High-Impact Indexes**:

```gql
// 1. Primary key lookups (highest impact)
CREATE UNIQUE INDEX user_id_idx ON User(user_id);

// 2. Foreign key traversals
CREATE INDEX follows_source_idx ON FOLLOWS(source_user_id);
CREATE INDEX follows_target_idx ON FOLLOWS(target_user_id);

// 3. Common filters
CREATE INDEX user_region_idx ON User(region);
CREATE INDEX post_created_idx ON Post(created_at);

// 4. Composite indexes for multi-column filters
CREATE INDEX user_search_idx ON User(region, account_status, created_at);
```

**Index Coverage Analysis**:

```gql
// Find queries missing indexes
-- There is no query-statistics table, slow-query log or plan cache to
-- query. Measure a specific statement with EXPLAIN / PROFILE, and scrape
-- aggregate counters from the Prometheus endpoint (GEODE_METRICS_PORT).
```

### Query Optimization

Rewrite queries for better performance:

**Before Optimization**:

```gql
// Slow: Multiple separate queries
MATCH (u:User)
WHERE u.user_id = '12345'
RETURN u;

MATCH (u:User {user_id: '12345'})-[:FOLLOWS]->(f:User)
RETURN f;

MATCH (u:User {user_id: '12345'})-[:FOLLOWS]->(f:User)-[:POSTS]->(p:Post)
RETURN p
LIMIT 10;

// Total time: ~150ms (3 round trips)
```

**After Optimization**:

```gql
// Fast: Single combined query
MATCH (u:User {user_id: '12345'})
OPTIONAL MATCH (u)-[:FOLLOWS]->(f:User)
OPTIONAL MATCH (f)-[:POSTS]->(p:Post)
RETURN u,
       COLLECT(DISTINCT f) AS following,
       COLLECT(p)[0..10] AS recent_posts;

// Total time: ~45ms (1 round trip, less overhead)
```

### Connection Pooling

Reuse connections for better throughput:

**Go Client**:

```go
db, err := sql.Open("geode", "localhost:3141")
if err != nil {
    log.Fatal(err)
}
db.SetMaxOpenConns(100)
db.SetMaxIdleConns(10)
db.SetConnMaxIdleTime(5 * time.Minute)
// Pool handles connection reuse automatically
```

**Python Client**:

```python
# Async connection pool
from geode_client import ConnectionPool

pool = ConnectionPool(host="localhost", port=3141, min_size=10, max_size=100)
async with pool:
    async with pool.acquire() as conn:
        result, _ = await conn.query("MATCH (n:User) RETURN n LIMIT 10")
```

**Rust Client**:

```rust
// High-performance pool with tokio
use geode_client::ConnectionPool;

let pool = ConnectionPool::new("localhost", 3141, 100);
let conn = pool.acquire().await?;
// Connection reuse handled by the pool
```

### Caching Strategy

Leverage caching for repeated queries:

**Query Result Caching**:

```gql
// Frequently accessed data
MATCH (u:User {user_id: $user_id})
RETURN u.name, u.email, u.profile_image
WITH CACHE TTL 300;  -- Cache for 5 minutes
```

**Application-Level Caching**:

```go
// Cache hot data in application layer
var userCache = NewLRUCache(10000)

func GetUser(userID string) (*User, error) {
    // Check cache first
    if user, ok := userCache.Get(userID); ok {
        return user, nil
    }

    // Query database on cache miss
    user, err := db.Query(`
        MATCH (u:User {user_id: $1})
        RETURN u
    `, userID)

    if err == nil {
        userCache.Set(userID, user)
    }

    return user, err
}
```

## Production Optimization

### Load Testing

Validate performance under realistic conditions:

**Concurrent User Simulation**:

```bash
# Simulate 100 concurrent users
geode loadtest run \
  --workload production-mix.yaml \
  --users 100 \
  --duration 600s \
  --ramp-up 60s \
  --report load-test-results.json

# Monitor during test:
# - Throughput (QPS)
# - Latency percentiles
# - Error rate
# - Resource utilization (CPU, memory, I/O)
# - Connection pool saturation
```

**Stress Testing**:

```bash
# Find breaking point
geode loadtest stress \
  --initial-users 10 \
  --increment 10 \
  --increment-interval 30s \
  --max-users 500 \
  --stop-on-error-rate 1.0

# Identifies:
# - Maximum throughput
# - Saturation point
# - Performance degradation curve
# - Resource bottlenecks
```

### Monitoring

Continuous performance monitoring in production:

**Key Metrics to Track**:

```yaml
# Prometheus metrics configuration
metrics:
  query_duration_seconds:
    type: histogram
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0]

  query_throughput:
    type: counter
    labels: [query_type, status]

  active_connections:
    type: gauge

  cache_hit_rate:
    type: gauge
    labels: [cache_type]

  index_usage:
    type: counter
    labels: [index_name, operation]
```

**Alerting Rules**:

```yaml
# Performance degradation alerts
alerts:
  - name: HighQueryLatency
    condition: p99_latency > 500ms
    duration: 5m
    severity: warning

  - name: LowThroughput
    condition: qps < 1000
    duration: 5m
    severity: warning

  - name: HighErrorRate
    condition: error_rate > 1.0%
    duration: 1m
    severity: critical
```

### Capacity Planning

Plan for growth and scale:

**Growth Modeling**:

```python
# Project performance at scale
import pandas as pd
import numpy as np

# Current metrics
current_data_size = 1_000_000  # nodes
current_qps = 10_000
current_latency_p99 = 50  # ms

# Growth projections
growth_scenarios = [
    {"months": 6, "data_multiplier": 2, "traffic_multiplier": 1.5},
    {"months": 12, "data_multiplier": 5, "traffic_multiplier": 2.5},
    {"months": 24, "data_multiplier": 10, "traffic_multiplier": 4.0},
]

for scenario in growth_scenarios:
    projected_data = current_data_size * scenario["data_multiplier"]
    projected_qps = current_qps * scenario["traffic_multiplier"]

    # Latency grows sub-linearly with data (logarithmic for indexed queries)
    projected_latency = current_latency_p99 * np.log2(scenario["data_multiplier"])

    print(f"Month {scenario['months']}:")
    print(f"  Data size: {projected_data:,} nodes")
    print(f"  QPS: {projected_qps:,}")
    print(f"  Estimated p99 latency: {projected_latency:.1f}ms")
```

**Resource Scaling**:

- **Vertical Scaling**: Increase CPU/memory for single-server deployments
- **Horizontal Scaling**: Add read replicas for read-heavy workloads
- **Sharding**: Partition data for extreme scale
- **Caching**: Add Redis/Memcached for hot data

## Best Practices

### Development

Write performance-conscious code from the start:

**Efficient Patterns**:

```gql
-- ✓ Good: Use indexes effectively
MATCH (u:User {user_id: $user_id})
RETURN u;

-- ✗ Bad: Scan all users
MATCH (u:User)
WHERE u.user_id = $user_id
RETURN u;

-- ✓ Good: Limit result sets
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.user_id = $user_id
RETURN f
LIMIT 100;

-- ✗ Bad: Return unbounded results
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.user_id = $user_id
RETURN f;

-- ✓ Good: Filter early
MATCH (u:User {region: 'West'})-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN u.name, p.name;

-- ✗ Bad: Filter late
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.region = 'West' AND p.price > 100
RETURN u.name, p.name;
```

### Testing

Include performance tests in CI/CD:

**Regression Testing**:

```bash
# Run performance regression suite
geode test performance \
  --baseline baseline-metrics.json \
  --threshold 10%  # Fail if >10% slower
  --report regression-results.json

# Catches performance regressions before deployment
```

**Continuous Benchmarking**:

```yaml
# GitHub Actions workflow
name: Performance Benchmark
on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - name: Run benchmarks
        run: |
          geode benchmark run --workload standard.yaml

      - name: Compare to baseline
        run: |
          geode benchmark compare \
            --baseline main-branch-results.json \
            --current pr-results.json \
            --threshold 5%
```

### Production Deployment

Optimize for production workloads:

**Configuration Tuning**:

```yaml
# geode.yaml - Production configuration
server:
  max_connections: 1000
  connection_timeout: 30s
  query_timeout: 60s

performance:
  query_cache_size: 10000
  query_cache_ttl: 300s
  index_cache_size: 10GB
  worker_threads: 16

# NOTE: `monitoring:` is not a configuration-file section — it is ignored.
# The Prometheus listener is opt-in and env-only:
#   GEODE_METRICS_PORT=9090   (serves /metrics and /health)
#   GEODE_METRICS_BIND=127.0.0.1
```

**Health Checks**:

```gql
// Lightweight health check query
MATCH (n:User)
RETURN COUNT(n) AS total_users
TIMEOUT 5s;

// Should return instantly with cached result
```

## Troubleshooting

### Common Performance Issues

**Issue: Slow Point Lookups**:

```gql
-- Problem: Missing index
MATCH (u:User)
WHERE u.email = 'user@example.com'
RETURN u;
-- 500ms latency

-- Solution: Add unique index
CREATE UNIQUE INDEX user_email_idx ON User(email);
-- Latency drops to <5ms
```

**Issue: High Latency Under Load**:

```bash
# Problem: Connection pool exhaustion
# Symptoms: Latency spikes during peak hours

# Solution: Increase pool size
geode config set max_connections 500
geode restart

# Monitor connection usage
geode monitor connections --watch
```

**Issue: Memory Exhaustion**:

```gql
-- Problem: Unbounded result sets
MATCH (u:User)-[:FOLLOWS]->(f:User)
RETURN u, f;
-- Returns millions of rows, consumes GB of memory

-- Solution: Always limit results
MATCH (u:User)-[:FOLLOWS]->(f:User)
RETURN u, f
LIMIT 1000;
```

## Integration with Geode

Performance optimization integrates with Geode features:

- **EXPLAIN/PROFILE**: Built-in performance analysis tools
- **Indexes**: Automatic query optimization via indexes
- **Caching**: Transparent query result caching
- **Monitoring**: Prometheus metrics integration
- **Connection Pooling**: Efficient resource management
- **Transactions**: Optimized transaction processing

## Related Topics

- **Query Optimization**: Optimization techniques and strategies
- **Indexes**: Index design and management
- **EXPLAIN Command**: Execution plan analysis
- **PROFILE Command**: Runtime profiling
- **Monitoring**: Production monitoring and alerting
- **Best Practices**: Development and deployment best practices
- **Benchmarking**: Performance testing methodologies

---

Browse the tagged content below to discover comprehensive guides, tutorials, and best practices for query performance in Geode. Learn how to build high-performance graph applications that deliver consistent, low-latency responses under production workloads.
