---
title: "Performance & Optimization"
description: "Comprehensive performance optimization documentation covering query tuning, indexing strategies, profiling, benchmarking, and system-level performance improvements for Geode graph database."
keywords:
  - performance
  - optimization
  - query tuning
  - indexing
  - profiling
  - benchmarking
  - throughput
  - latency
  - performance tuning
  - system optimization
  - EXPLAIN
  - PROFILE
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/performance/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Performance & Optimization

The **Performance & Optimization** category provides comprehensive guidance for maximizing Geode's performance across all workloads. From query optimization and index design through system tuning and capacity planning, these resources help achieve optimal throughput and latency whether you're running analytical queries, real-time transactions, or mixed workloads at scale.

## Overview

Database performance optimization requires understanding query patterns, data characteristics, system architecture, and operational requirements. Geode provides extensive tooling for performance analysis and optimization: EXPLAIN visualizes query execution plans before execution; PROFILE measures actual execution time and resource usage; metrics expose system-level bottlenecks; and tracing reveals complete query lifecycles. Combined with proper indexing, query optimization, and system tuning, these tools enable achieving exceptional performance.

This category covers performance optimization at all levels: **query-level** optimization through better GQL patterns and index usage; **system-level** tuning through configuration and resource allocation; **operational** optimization through monitoring and capacity planning. Whether optimizing a single slow query or scaling to higher throughput, these resources provide actionable guidance grounded in production experience.

## Performance Fundamentals

### Performance Dimensions

**Throughput**: Queries processed per second (QPS). Critical for high-volume applications. Geode throughput varies by workload and configuration.

**Latency**: Time to execute individual queries. Measured at p50 (median), p95, and p99 percentiles. Critical for user-facing applications requiring consistent response times.

**Concurrency**: Number of simultaneous queries. Geode's MVCC architecture enables high read concurrency without locks.

**Resource Efficiency**: CPU, memory, I/O, and network utilization per query. Optimized queries minimize resource usage.

**Scalability**: Performance characteristics as data grows. Proper indexing ensures logarithmic rather than linear query time growth.

### Performance Trade-offs

**Indexing vs Write Performance**: Indexes accelerate reads but add write overhead. Balance index count with write requirements.

**Caching vs Memory**: Larger caches improve performance but consume memory. Size caches based on working set and available RAM.

**Consistency vs Performance**: Stronger consistency guarantees reduce concurrency. Choose appropriate isolation levels.

**Normalization vs Denormalization**: Normalized schemas reduce redundancy; denormalized schemas improve read performance. Denormalize strategically.

**Batch Size vs Latency**: Larger batches improve throughput but increase individual request latency. Tune batch sizes for workload.

## Performance Documentation

### Core Performance Guides

**[Performance Documentation Index](/docs/performance/)**
Entry point for all performance-related documentation including tuning, benchmarking, and capacity planning.

**[Performance Tuning Guide](/docs/query/performance-tuning/)**
Comprehensive query-level performance optimization covering pattern design, index usage, filtering strategies, and execution plan analysis.

**[Indexing and Optimization](/docs/query/indexing-and-optimization/)**
Complete guide to index design, index types (B+tree, HNSW, BM25), index selection strategies, and index maintenance for optimal query performance.

**[EXPLAIN and PROFILE](/docs/query/explain-profile/)**
Essential tools for query optimization. Learn to interpret execution plans, identify bottlenecks, and validate optimization strategies.

**[Performance Benchmarking Guide](/docs/guides/performance-benchmarking/)**
Methodologies for benchmarking Geode performance including workload design, metric collection, result analysis, and comparison techniques.

**[Architecture: Performance and Scaling](/docs/architecture/performance-and-scaling/)**
System-level performance architecture including query engine optimization, storage layer tuning, and distributed scaling patterns.

### Advanced Performance Topics

**[Full-Text Search Performance](/docs/query/full-text-search/)**
Optimizing BM25 full-text search queries including index tuning, query optimization, and hybrid graph+text search patterns.

**[Materialized Views](/docs/query/materialized-views/)**
Pre-computing expensive aggregations and complex queries for dramatic read performance improvements. Refresh strategies and maintenance.

**[Query Execution Architecture](/docs/architecture/query-execution/)**
Deep dive into query execution including operator pipeline, join strategies, memory management, and parallelization.

**[Distributed Architecture Performance](/docs/architecture/distributed-architecture/)**
Performance characteristics of distributed deployments including sharding, replication, and cross-shard query optimization.

## Query Optimization

### Index-Driven Optimization

**Create Strategic Indexes**:
```gql
-- Node property index
CREATE INDEX person_email ON Person(email)

-- Relationship type index
CREATE INDEX knows_relationship ON :KNOWS

-- Composite index
CREATE INDEX person_city_age ON Person(city, age)

-- Full-text index
CREATE FULLTEXT INDEX person_bio ON Person(bio) USING BM25

-- Vector index
CREATE VECTOR INDEX product_embedding ON Product(embedding)
  USING HNSW WITH {dimensions: 768, metric: 'cosine'}
```

**Index Selection**: Geode's optimizer chooses indexes based on:
- Selectivity (fraction of data matched)
- Cardinality estimates (rows expected)
- Index type (hash, B+tree, HNSW, BM25)
- Query pattern (equality, range, text, vector)

**Verify Index Usage**:
```gql
EXPLAIN
MATCH (p:Person {email: $email})
RETURN p

-- Look for "Index Seek" operator, not "Node Scan"
```

### Query Pattern Optimization

**Anchor Patterns**: Start with most selective predicates:
```gql
-- Good: Anchor with unique index
MATCH (p:Person {id: $userId})-[:KNOWS]->(friend)
RETURN friend

-- Bad: Unanchored scan
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.age > 30
RETURN friend
```

**Filter Pushdown**: Apply filters early:
```gql
-- Good: Filter before traversal
MATCH (p:Person)
WHERE p.age > 30
MATCH (p)-[:KNOWS]->(friend)
RETURN friend

-- Bad: Filter after traversal
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.age > 30
RETURN friend
```

**Limit Results**: Bound open-ended queries:
```gql
-- Always use LIMIT for exploratory queries
MATCH (p:Person)-[:KNOWS*1..5]->(friend)
RETURN friend
LIMIT 100
```

**Avoid Cartesian Products**: Connect all patterns:
```gql
-- Good: Connected pattern
MATCH (p:Person)-[:KNOWS]->(f:Person),
      (f)-[:WORKS_AT]->(c:Company)
RETURN p, f, c

-- Bad: Cartesian product (missing connection)
MATCH (p:Person), (c:Company)
RETURN p, c
```

### Aggregation Optimization

**Pre-aggregate with Materialized Views**:
```gql
-- Create materialized view for expensive aggregation
CREATE MATERIALIZED VIEW company_stats AS
MATCH (c:Company)<-[:WORKS_AT]-(p:Person)
RETURN c.id, c.name, COUNT(p) AS employees
REFRESH EVERY 1 HOUR

-- Query materialized view (fast)
MATCH (c IN company_stats)
WHERE c.employees > 100
RETURN c.name, c.employees
```

**Optimize GROUP BY**: Let optimizer choose aggregation strategy:
```gql
-- Optimizer chooses hash or sort aggregation
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN c.name, COUNT(p) AS employees
ORDER BY employees DESC
```

### Subquery Optimization

**Use EXISTS for filtering**:
```gql
-- Good: EXISTS subquery (short-circuits)
MATCH (p:Person)
WHERE EXISTS {
  MATCH (p)-[:KNOWS]->(:Person {city: 'NYC'})
}
RETURN p

-- Bad: Count subquery (evaluates all)
MATCH (p:Person)
WHERE (MATCH (p)-[:KNOWS]->(:Person {city: 'NYC'}) RETURN COUNT(*)) > 0
RETURN p
```

**Correlated subqueries**: Optimizer pushes down correlated predicates when possible.

## System-Level Optimization

### Configuration Tuning

**Memory Settings**:
```toml
[memory]
buffer_pool_size = "8GB"          # Buffer pool for data pages
query_cache_size = "2GB"          # Query result cache
index_cache_size = "4GB"          # Index page cache
```

**Query Engine**:
```toml
[query]
max_query_time = "30s"            # Query timeout
parallel_workers = 8              # Parallel query workers
batch_size = 10000                # Batch operation size
enable_query_cache = true         # Cache query results
```

**Storage**:
```toml
[storage]
wal_buffer_size = "64MB"          # WAL buffer
checkpoint_interval = "5min"      # Checkpoint frequency
compression = "lz4"               # Data compression
```

**Network**:
```toml
[network]
max_connections = 1000            # Connection pool size
connection_timeout = "30s"        # Connection timeout
keepalive_interval = "60s"        # Keepalive interval
```

### Resource Allocation

**CPU**: Geode scales linearly with cores for parallel queries. Allocate sufficient CPU for query workers and background tasks.

**Memory**: Size buffer pool to working set. Monitor cache hit rates; >95% indicates sufficient memory.

**Storage**: Use SSDs for optimal I/O. NVME provides best latency. RAID 10 for redundancy and performance.

**Network**: QUIC protocol requires UDP; ensure firewall allows port 3141. Low-latency networks critical for distributed deployments.

### Monitoring and Metrics

**Query Metrics**:
- Execution time (p50, p95, p99)
- Throughput (queries per second)
- Queue depth (waiting queries)
- Error rate

**System Metrics**:
- CPU utilization
- Memory usage and cache hit rates
- Disk I/O (read/write IOPS, throughput)
- Network bandwidth

**Database Metrics**:
- Transaction rate
- Lock contention
- WAL write rate
- Checkpoint duration

**Alerting**: Set alerts for:
- Query latency p99 > threshold
- Cache hit rate < 95%
- Disk queue depth > threshold
- Error rate > baseline

## Performance Analysis Tools

### EXPLAIN

Visualize execution plan before running query:

```gql
EXPLAIN
MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30 AND f.city = 'SF'
RETURN f.name, f.email
```

**Key information**:
- **Operators**: Scan, Seek, Join, Filter, Aggregate
- **Index usage**: Which indexes are used
- **Cardinality estimates**: Expected rows at each stage
- **Join strategy**: Hash join, nested loop, merge join
- **Filter placement**: Where predicates are evaluated

**Reading plans**:
- Top-down execution flow
- Indentation shows operator nesting
- Row estimates guide optimization
- Look for "Index Seek" not "Node Scan"

### PROFILE

Measure actual execution performance:

```gql
PROFILE
MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30 AND f.city = 'SF'
RETURN f.name, f.email
```

**Metrics provided**:
- Execution time per operator
- Actual rows processed (vs estimated)
- Cache hit rates
- Memory usage
- I/O operations

**Optimization workflow**:
1. PROFILE query to find bottleneck
2. Check index usage in slow operators
3. Create or modify indexes
4. PROFILE again to verify improvement
5. Iterate until acceptable performance

### Query Log Analysis

Enable slow query logging:

```toml
[logging]
log_slow_queries = true
slow_query_threshold = "1s"
```

Analyze logs for patterns:
- Common slow queries
- Missing indexes
- Cartesian products
- Large result sets

## Performance Best Practices

### Indexing Strategy

1. **Index high-selectivity predicates**: Properties that filter to small result sets
2. **Index foreign keys**: Properties used in joins (relationship endpoints)
3. **Composite indexes**: For multi-column predicates in WHERE
4. **Cover queries**: Include RETURN columns in index for index-only scans
5. **Monitor index usage**: Drop unused indexes to reduce write overhead

### Query Design

1. **Start selective**: Begin patterns with most selective predicates
2. **Filter early**: Apply WHERE immediately after MATCH
3. **Limit results**: Use LIMIT to bound open-ended queries
4. **Parameterize**: Use parameters for plan caching and security
5. **Batch operations**: Group inserts/updates for better throughput

### Schema Design

1. **Denormalize strategically**: Duplicate data when read patterns justify it
2. **Use appropriate types**: Smaller types reduce storage and I/O
3. **Partition large properties**: Store large blobs separately
4. **Model relationships explicitly**: Use relationship types, not property arrays
5. **Consider cardinality**: High-cardinality relationships may need optimization

### Operational Practices

1. **Monitor continuously**: Track metrics, set alerts
2. **Benchmark regularly**: Validate performance after changes
3. **Update statistics**: Keep cardinality estimates accurate
4. **Vacuum regularly**: Reclaim space from deleted data
5. **Plan capacity**: Provision for peak load with headroom

## Performance Patterns by Workload

### OLTP (Transactional)

**Characteristics**: High concurrency, low latency, point queries

**Optimization**:
- Index all lookup keys
- Use prepared statements
- Enable connection pooling
- Tune for low latency (p99 < 10ms)
- Monitor lock contention

**Example query**:
```gql
-- User profile lookup
MATCH (u:User {id: $userId})
RETURN u.name, u.email, u.settings
```

### OLAP (Analytical)

**Characteristics**: Complex queries, large scans, aggregations

**Optimization**:
- Create materialized views
- Use columnar storage for analytics
- Batch large operations
- Tune for throughput (QPS)
- Enable query parallelization

**Example query**:
```gql
-- Daily active users by region
MATCH (u:User)-[:LOGGED_IN]->(event:LoginEvent)
WHERE event.timestamp > timestamp() - duration({days: 1})
WITH u.region AS region, COUNT(DISTINCT u) AS users
RETURN region, users
ORDER BY users DESC
```

### Mixed Workload

**Characteristics**: Combination of OLTP and OLAP

**Optimization**:
- Separate read replicas for analytics
- Use materialized views to offload aggregations
- Prioritize OLTP queries
- Schedule heavy analytics off-peak
- Monitor resource contention

## Scaling Strategies

### Vertical Scaling

**Increase resources on single node**:
- More CPU cores (parallel query execution)
- More RAM (larger caches, less I/O)
- Faster storage (NVME, more IOPS)
- Faster network (10GbE+)

**Limits**: Single-machine limits (cores, RAM, I/O bandwidth)

### Horizontal Scaling

**Distribute across nodes**:
- **Sharding**: Partition graph by node/edge ownership
- **Replication**: Read replicas for read scaling
- **Caching**: Application-level caching layer

**Trade-offs**: Distributed query complexity, cross-shard joins, consistency

### Hybrid Scaling

**Combine vertical and horizontal**:
- Shard data across powerful nodes
- Replicate hot shards
- Cache at application layer
- Use materialized views on replicas

## Benchmarking

### Workload Design

1. **Representative queries**: Match production patterns
2. **Realistic data**: Similar size and distribution
3. **Concurrent load**: Simulate actual concurrency
4. **Sustained duration**: Run long enough for steady state
5. **Varied operations**: Mix of reads, writes, updates

### Metrics Collection

**Throughput**: Queries per second (QPS)
**Latency**: p50, p95, p99, p999
**Resource usage**: CPU, memory, I/O, network
**Error rate**: Failed queries per second
**Scalability**: Performance vs data size/concurrency

### Analysis

- Compare before/after optimization
- Identify regressions
- Validate scalability claims
- Find bottlenecks
- Establish baselines

## Performance Troubleshooting

### Slow Query Diagnosis

1. **PROFILE query**: Identify slow operators
2. **Check indexes**: Verify index usage in plan
3. **Examine estimates**: Large estimate errors indicate stale statistics
4. **Review pattern**: Look for Cartesian products, missing filters
5. **Test alternatives**: Try different query formulations

### High Latency

**Symptoms**: Consistently high p95/p99 latency

**Causes**:
- Missing indexes (full scans)
- Lock contention (high concurrency)
- Large result sets (missing LIMIT)
- Cold caches (insufficient RAM)
- Slow storage (I/O bottleneck)

**Solutions**:
- Create indexes
- Reduce transaction scope
- Add LIMIT clauses
- Increase memory
- Upgrade storage

### Low Throughput

**Symptoms**: Low queries per second despite low latency

**Causes**:
- Insufficient concurrency
- Connection pool too small
- CPU bottleneck
- Lock contention
- Network saturation

**Solutions**:
- Increase connection pool
- Add CPU cores
- Reduce lock scope
- Optimize network
- Use read replicas

## Related Documentation

### Query Optimization

- **[Query Language](/categories/query/)** - Query writing and patterns
- **[GQL Guide](/docs/gql/guide/)** - GQL language guide
- **[Indexing and Optimization](/docs/query/indexing-and-optimization/)** - Index strategies
- **[EXPLAIN/PROFILE](/docs/query/explain-profile/)** - Query analysis

### System Architecture

- **[Architecture](/categories/architecture/)** - System architecture
- **[Query Execution](/docs/architecture/query-execution/)** - Execution internals
- **[Performance and Scaling](/docs/architecture/performance-and-scaling/)** - Scaling architecture
- **[Distributed Architecture](/docs/architecture/distributed-architecture/)** - Distributed patterns

### Operations

- **[Operations](/categories/operations/)** - Production operations
- **[Configuration](/categories/configuration/)** - System configuration
- **[Deployment](/categories/deployment-and-devops/)** - Deployment patterns
- **[Best Practices](/categories/best-practices/)** - Production patterns

## Related Tags

- **[Query Optimization](/tags/query-optimization/)** - Query tuning
- **[Indexing](/tags/indexing/)** - Index strategies
- **[Profiling](/tags/profiling/)** - Performance profiling
- **[EXPLAIN](/tags/explain/)** - Query plans
- **[Benchmarking](/tags/benchmarking/)** - Performance testing
- **[Optimization](/tags/optimization/)** - General optimization
- **[Scalability](/tags/scalability/)** - Scaling patterns

## Performance Resources

### Tools

- **EXPLAIN**: Query plan visualization
- **PROFILE**: Performance measurement
- **Metrics API**: System metrics
- **Query Log**: Slow query analysis
- **Benchmark Suite**: Standard workloads

### Guides

- **[Performance Tuning](/docs/query/performance-tuning/)** - Comprehensive tuning
- **[Benchmarking](/docs/guides/performance-benchmarking/)** - Benchmark methodology
- **[Indexing](/docs/query/indexing-and-optimization/)** - Index design

## Next Steps

**Slow queries?** Use [EXPLAIN/PROFILE](/docs/query/explain-profile/) to diagnose bottlenecks.

**Missing indexes?** Review [Indexing and Optimization](/docs/query/indexing-and-optimization/) for index strategies.

**System tuning?** Check [Performance and Scaling](/docs/architecture/performance-and-scaling/) for configuration guidance.

**Benchmarking?** Follow [Performance Benchmarking Guide](/docs/guides/performance-benchmarking/) methodology.

**Production optimization?** See [Best Practices](/categories/best-practices/) for proven patterns.

---

**Scalability**: Distributed deployment with up to 32 shards
**Last Updated**: January 2026
**Geode Version**: v0.1.3+
