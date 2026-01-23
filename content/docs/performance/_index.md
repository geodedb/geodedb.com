---
title: "Performance Tuning"
description: "Optimize Geode for maximum performance with tuning guides, benchmarks, and best practices"
weight: 70
---

# Performance Tuning Guide

This guide covers performance optimization strategies, configuration tuning, and best practices for achieving optimal performance with Geode.

## Performance Overview

### Current Benchmarks

**Query Performance**:
- Simple queries: <1ms latency
- Complex patterns: <10ms (10-hop traversals)
- Throughput: 10,000+ queries/second
- Vector similarity: <50ns per distance calculation (8D L2)

**Storage Performance**:
- Write throughput: 100,000+ writes/second with WAL
- Read latency: <100μs for indexed lookups
- Memory-mapped I/O: 13.18x improvement
- Cache hit ratio: >90% typical

**Scalability**:
- Nodes: 100M+ tested
- Relationships: 1B+ tested
- Concurrent connections: 10,000+ with pooling
- Shards: Up to 32 with linear scale-out

## Query Optimization

### Use Indexes Effectively

**Create Appropriate Indexes**:

```gql
-- B-tree for range queries
CREATE INDEX person_age_idx ON Person(age) USING btree;

-- Hash for exact matches
CREATE INDEX person_email_idx ON Person(email) USING hash;

-- Spatial for geographic queries
CREATE INDEX location_coords_idx ON Location(coordinates) USING spatial;

-- Vector for similarity search
CREATE INDEX document_embedding_idx ON Document(embedding) USING vector;

-- Full-text for text search
CREATE INDEX article_content_idx ON Article(content) USING fulltext;
```

**Index Selection Guidelines**:

| Query Pattern | Index Type | Example |
|--------------|------------|---------|
| Exact match | Hash | `WHERE p.email = 'user@example.com'` |
| Range query | B-tree | `WHERE p.age > 30 AND p.age < 50` |
| Sorting | B-tree | `ORDER BY p.name` |
| Geographic | R-tree | `WHERE distanceKm(loc, point) < 10` |
| Vector similarity | HNSW | `WHERE cosineSimilarity(v1, v2) > 0.8` |
| Text search | Full-text | `WHERE content CONTAINS 'graph database'` |
| IP prefix | Patricia Trie | `WHERE ip_contains(subnet, ip)` |

### Analyze Query Plans

Use `EXPLAIN` to understand query execution:

```gql
-- View query plan
EXPLAIN MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30
RETURN f.name
ORDER BY f.name
LIMIT 10;

-- Analyze actual execution
EXPLAIN ANALYZE MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30
RETURN f.name;
```

**Key Metrics to Review**:
- Index usage (are indexes being used?)
- Estimated vs actual row counts
- Join methods
- Sort operations
- Filter selectivity

### Optimize Pattern Matching

**Anchor Patterns Early**:

```gql
-- GOOD: Anchor with indexed property
MATCH (p:Person {email: 'user@example.com'})-[:KNOWS]->(f)
RETURN f

-- BAD: Cartesian product
MATCH (p:Person)-[:KNOWS]->(f)
WHERE p.email = 'user@example.com'
RETURN f
```

**Limit Path Expansion**:

```gql
-- GOOD: Bounded expansion
MATCH (a)-[:KNOWS*1..3]->(b)
RETURN b

-- BAD: Unbounded expansion (can explode)
MATCH (a)-[:KNOWS*]->(b)
RETURN b
```

**Use LIMIT with ORDER BY**:

```gql
-- Required for deterministic results
MATCH (n:Person)
RETURN n.name
ORDER BY n.name  -- ORDER BY required with LIMIT
LIMIT 100
```

### Aggregation Optimization

**Push Filters Before Aggregation**:

```gql
-- GOOD: Filter first
MATCH (p:Person)
WHERE p.age > 30
RETURN p.city, count(*) AS population
GROUP BY p.city

-- BAD: Filter after aggregation
MATCH (p:Person)
RETURN p.city, count(*) AS population
GROUP BY p.city
HAVING max(p.age) > 30
```

**Use Covering Indexes**:

```gql
-- Create composite index
CREATE INDEX person_city_age_idx ON Person(city, age);

-- Query uses index only (no table access)
MATCH (p:Person)
RETURN p.city, count(*)
WHERE p.age > 30
GROUP BY p.city
```

## Configuration Tuning

### Memory Settings

**Page Cache Size**:

```yaml
# geode.yaml
storage:
  page_cache_size: '4GB'  # Increase for read-heavy workloads
  page_size: 8192         # 8KB pages (default)
```

Environment variable:
```bash
export GEODE_PAGE_CACHE_SIZE=4294967296  # 4GB in bytes
```

**Recommendations**:
- Read-heavy: 50-75% of RAM
- Write-heavy: 25-40% of RAM
- Mixed workload: 40-50% of RAM

### WAL Configuration

```yaml
storage:
  wal_dir: '/fast-ssd/geode/wal'
  wal_buffer_size: '16MB'
  wal_sync_interval: 100ms  # Balance durability vs performance
```

**Tuning Tips**:
- Place WAL on separate fast SSD
- Increase buffer size for write-heavy workloads
- Adjust sync interval (lower = more durable, higher = faster)

### Connection Pooling

```yaml
server:
  max_connections: 10000
  connection_timeout: '30s'
  idle_timeout: '5m'
```

**Client-Side Pooling** (Go example):

```go
db.SetMaxOpenConns(100)   // Maximum connections
db.SetMaxIdleConns(25)    // Idle connection pool
db.SetConnMaxLifetime(5 * time.Minute)
db.SetConnMaxIdleTime(1 * time.Minute)
```

### Query Optimizer Settings

```yaml
optimizer:
  small_n_threshold: 100     # When to use brute-force
  trace: false               # Enable for debugging
  cost_model:
    seq_scan_cost: 1.0
    index_scan_cost: 0.1
    join_cost: 2.0
```

Enable optimizer tracing for diagnostics:
```bash
export GEODE_TRACE_OPTIMIZER=1
```

## Index Optimization

### HNSW Vector Index Tuning

```gql
-- Create with custom parameters
CREATE INDEX embedding_idx ON Document(embedding)
USING vector
WITH (
  M = 16,                    -- Max connections per node
  ef_construction = 200,     -- Search width during construction
  ef_search = 100           -- Search width at query time
);
```

**Parameter Guidelines**:
- **M**: Higher = better recall, more memory (16-32 typical)
- **ef_construction**: Higher = better index quality (200-400 typical)
- **ef_search**: Higher = better recall, slower queries (50-200 typical)

**Performance Trade-offs**:
- M=16, ef_search=50: Fast, ~85% recall
- M=16, ef_search=100: Medium, ~92% recall
- M=32, ef_search=200: Slow, ~97% recall

### Spatial Index Optimization

```gql
-- R-tree with custom node capacity
CREATE INDEX location_coords_idx ON Location(coordinates)
USING spatial
WITH (
  M = 8,                     -- Max entries per node (default)
  min_fill = 0.4            -- Minimum fill factor
);
```

**Best Practices**:
- Higher M = fewer levels, more entries per node
- Place on SSD for random access patterns
- Regularly rebuild after bulk inserts

### Full-Text Index Configuration

```gql
CREATE INDEX article_content_idx ON Article(content)
USING fulltext
WITH (
  language = 'english',
  stemmer = 'porter',
  stop_words = ['the', 'a', 'an']
);
```

## Hardware Recommendations

### Storage

**SSD vs HDD**:
- **WAL**: Always SSD (write-heavy, sequential)
- **Data files**: SSD for <1TB, SATA SSD for 1-10TB
- **Backup storage**: HDD acceptable for cold storage

**RAID Configuration**:
- RAID 10: Best performance (recommended)
- RAID 5/6: Acceptable for read-heavy workloads
- RAID 0: Maximum performance (no redundancy)

### Memory

**Minimum Requirements**:
- Development: 4GB
- Small production: 16GB
- Medium production: 64GB
- Large production: 256GB+

**Allocation**:
- OS: 2-4GB
- Page cache: 50-70% of remaining
- Query execution: 20-30% of remaining
- Buffer pools: 10-20% of remaining

### CPU

**Core Count**:
- 4 cores: Minimum for development
- 8-16 cores: Small to medium production
- 32+ cores: Large production with high concurrency

**Features**:
- AVX2/AVX-512: 2x+ speedup for vector operations
- AES-NI: Hardware-accelerated encryption
- NUMA: Configure for local memory access

### Network

**Bandwidth**:
- 1 Gbps: Minimum
- 10 Gbps: Recommended for distributed setups
- 25/40 Gbps: High-throughput scenarios

**Latency**:
- <1ms: Same datacenter
- <10ms: Cross-region acceptable
- >50ms: Consider caching layer

## Monitoring and Profiling

### Metrics to Monitor

```bash
# Query performance
geode_query_duration_ms{percentile="50|95|99"}
geode_query_total{status="success|error"}

# Storage metrics
geode_storage_cache_hit_ratio
geode_storage_pages_total
geode_storage_wal_segments_total

# Index metrics
geode_index_lookups_total
geode_index_size_bytes
```

### Profiling Queries

```gql
-- Profile query execution
PROFILE MATCH (n:Person)-[:KNOWS*1..3]->(f)
WHERE n.age > 30
RETURN f.name
LIMIT 10;
```

**Profile Output**:
- Execution time per operator
- Rows processed per operator
- Memory usage
- Index hits/misses

### Enable Telemetry

```yaml
monitoring:
  enabled: true
  endpoint: 'http://localhost:9090/metrics'
  interval: '10s'
```

Environment variable:
```bash
export GEODE_TELEMETRY_PAGING=1
```

## Best Practices

### Query Design

1. **Always use ORDER BY with LIMIT** for deterministic results
2. **Create indexes before bulk loads** for optimal index structure
3. **Use prepared statements** for frequently executed queries
4. **Batch operations** in transactions for better throughput
5. **Limit path expansion depth** to prevent combinatorial explosion

### Data Modeling

1. **Denormalize when necessary** for read performance
2. **Use appropriate property types** (VectorF32 vs VectorI32)
3. **Avoid wide nodes** (>100 properties)
4. **Index frequently queried properties**
5. **Consider materialized views** for expensive aggregations

### Transaction Management

1. **Keep transactions short** to reduce lock contention
2. **Use appropriate isolation level** (Snapshot for most cases)
3. **Batch writes** for bulk operations
4. **Use savepoints** for complex multi-step operations
5. **Handle deadlocks** with retry logic

### Federation

1. **Distribute data by access patterns** (co-locate related data)
2. **Monitor shard balance** for even distribution
3. **Use connection pooling** for cross-shard queries
4. **Test failover scenarios** regularly
5. **Set appropriate timeouts** to prevent hanging queries

## Troubleshooting Performance Issues

### Slow Queries

**Checklist**:
1. ✓ Indexes exist for filtered properties?
2. ✓ Using EXPLAIN to verify index usage?
3. ✓ Path expansion bounded?
4. ✓ ORDER BY used with LIMIT?
5. ✓ Appropriate isolation level?

### High Memory Usage

**Investigation**:
```bash
# Check cache hit ratio
curl http://localhost:9090/metrics | grep cache_hit_ratio

# Review page cache size
grep page_cache_size /etc/geode/geode.yaml
```

**Solutions**:
- Reduce page cache size
- Add swap space (temporary)
- Scale horizontally

### Write Performance Issues

**Causes**:
- WAL on slow storage
- Too many indexes
- Large transactions
- Disk I/O saturation

**Solutions**:
- Move WAL to fast SSD
- Batch writes in transactions
- Increase wal_buffer_size
- Monitor disk I/O metrics

## Next Steps

- [Configuration Reference](../configuration/) - Complete config options
- [Monitoring Guide](../monitoring/) - Set up monitoring
- [Distributed Setup](../distributed/) - Scale horizontally
