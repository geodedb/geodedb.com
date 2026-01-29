---
title: "Caching Strategies"
description: "Master Geode's multi-layer caching architecture including query result caching, plan caching, buffer pool management, and application-level caching patterns for optimal graph database performance."
keywords:
  - caching
  - query cache
  - result cache
  - plan cache
  - buffer pool
  - cache invalidation
  - LRU cache
  - cache warming
  - distributed cache
  - performance
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/caching/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Caching Strategies in Geode

Caching is fundamental to database performance, reducing latency by avoiding repeated computation and I/O. Geode implements a sophisticated multi-layer caching architecture that optimizes performance at every level, from query planning to data retrieval. Understanding and properly configuring these caches can dramatically improve application performance.

This guide explores Geode's caching mechanisms, configuration options, and best practices for achieving optimal cache efficiency.

## Caching Architecture Overview

### Multi-Layer Cache Hierarchy

Geode implements caching at multiple levels:

```
┌─────────────────────────────────────────────────────────────┐
│                Application Layer                            │
│         (Client-side caching, connection pooling)           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Query Result Cache                         │
│            (Complete query result memoization)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Query Plan Cache                          │
│              (Compiled execution plans)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Metadata Cache                            │
│            (Schema, statistics, indexes)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Buffer Pool                              │
│               (Data and index pages)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   OS Page Cache                             │
│              (File system cache)                            │
└─────────────────────────────────────────────────────────────┘
```

### Cache Hit Flow

When a query executes, Geode checks caches top-down:

1. **Result Cache**: Return cached result if exact query matches
2. **Plan Cache**: Use cached execution plan if available
3. **Metadata Cache**: Use cached schema and statistics
4. **Buffer Pool**: Return cached page if in memory
5. **OS Cache**: Read from OS file cache if available
6. **Disk**: Read from disk (slowest path)

## Query Result Cache

### How It Works

The query result cache stores complete results for parameterized queries:

```gql
-- First execution: cache miss, full execution
MATCH (u:User {id: $id})
RETURN u.name, u.email;
-- Time: 5ms

-- Subsequent executions with same parameters: cache hit
MATCH (u:User {id: $id})  -- Same query, same $id value
RETURN u.name, u.email;
-- Time: 0.1ms (from cache)
```

### Configuration

```toml
[cache.query_result]
enabled = true

# Cache size limits
max_size_mb = 512
max_entries = 10000
max_entry_size_kb = 1024  # Skip caching large results

# Eviction policy
eviction_policy = "lru"  # lru, lfu, or ttl
ttl_seconds = 300        # Time-to-live

# Cache key settings
include_user_context = true  # Different cache per user
include_transaction_context = false
```

### Cache Invalidation

Query cache entries are invalidated when underlying data changes:

```toml
[cache.query_result.invalidation]
# Invalidation strategy
strategy = "fine_grained"  # fine_grained, table_level, or time_based

# Fine-grained tracking
track_dependencies = true
max_tracked_entries = 100000

# Time-based fallback
max_staleness_ms = 1000
```

**Manual Cache Control**:
```gql
-- Bypass cache for fresh results
MATCH (u:User {id: $id})
RETURN u.name
OPTION (NO_CACHE);

-- Force cache refresh
MATCH (u:User {id: $id})
RETURN u.name
OPTION (REFRESH_CACHE);

-- Clear all query cache
CALL system.clear_query_cache();

-- Clear cache for specific query pattern
CALL system.clear_query_cache('MATCH (u:User%)');
```

### Monitoring Query Cache

```gql
-- Query cache statistics
SELECT
    total_entries,
    size_mb,
    hit_count,
    miss_count,
    hit_ratio,
    eviction_count,
    invalidation_count
FROM system.query_cache_stats;

-- Top cached queries
SELECT
    query_hash,
    query_text,
    execution_count,
    cache_hits,
    hit_ratio,
    avg_result_size_kb
FROM system.cached_queries
ORDER BY cache_hits DESC
LIMIT 20;
```

## Query Plan Cache

### Plan Caching Mechanism

Compiled execution plans are cached to avoid repeated parsing and optimization:

```
Query Processing Pipeline:
┌─────────┐    ┌─────────┐    ┌───────────┐    ┌─────────┐
│  Parse  │───>│Validate │───>│  Optimize │───>│ Execute │
└─────────┘    └─────────┘    └───────────┘    └─────────┘
     │              │               │
     └──────────────┴───────────────┘
              Plan Cache
         (Skip on cache hit)
```

### Configuration

```toml
[cache.query_plan]
enabled = true

# Cache size
max_entries = 5000
max_plan_size_kb = 64

# Plan lifetime
revalidation_interval_seconds = 3600
statistics_sensitivity = 0.2  # Replan if stats change >20%

# Parameterization
auto_parameterize = true
parameterization_threshold = 3  # Queries seen before parameterizing
```

### Prepared Statements

Prepared statements maximize plan cache efficiency:

**Python Client**:
```python
from geode_client import Client

async def efficient_queries():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Prepare statement once
        stmt = await conn.prepare("""
            MATCH (u:User {id: $id})-[:PURCHASED]->(p:Product)
            RETURN p.name, p.price
        """)

        # Execute multiple times with different parameters
        for user_id in user_ids:
            result, _ = await conn.execute_prepared(stmt, {"id": user_id})
            # Uses cached plan every time
```

**Go Client**:
```go
import (
    "database/sql"
    _ "geodedb.com/geode"
)

func efficientQueries(db *sql.DB, userIDs []string) {
    // Prepare statement
    stmt, err := db.Prepare(`
        MATCH (u:User {id: $1})-[:PURCHASED]->(p:Product)
        RETURN p.name, p.price
    `)
    if err != nil {
        log.Fatal(err)
    }
    defer stmt.Close()

    // Execute with different parameters
    for _, userID := range userIDs {
        rows, err := stmt.Query(userID)
        // Uses cached plan
    }
}
```

### Monitoring Plan Cache

```gql
-- Plan cache statistics
SELECT
    total_entries,
    size_mb,
    hit_count,
    miss_count,
    hit_ratio,
    eviction_count,
    recompilation_count
FROM system.plan_cache_stats;

-- View cached plans
SELECT
    plan_hash,
    query_pattern,
    execution_count,
    avg_planning_time_ms,
    avg_execution_time_ms,
    last_used
FROM system.cached_plans
ORDER BY execution_count DESC
LIMIT 20;

-- Clear plan cache
CALL system.clear_plan_cache();
```

## Buffer Pool Cache

### Memory Management

The buffer pool caches data and index pages in memory:

```toml
[cache.buffer_pool]
# Total size
size_mb = 8192  # 8 GB

# Allocation
data_percent = 70     # Data pages
index_percent = 25    # Index pages
temp_percent = 5      # Temporary operations

# Eviction
eviction_policy = "lru-k"
k = 2  # Track last K accesses

# Background writer
background_writer_enabled = true
background_writer_interval_ms = 100
dirty_page_threshold = 0.25
```

### Page Warming

Preload frequently accessed data on startup:

```toml
[cache.buffer_pool.warming]
enabled = true

# Warming strategy
strategy = "previous_state"  # previous_state, explicit, or none

# Previous state: restore pages from last shutdown
restore_file = "/var/lib/geode/buffer_state.dat"

# Explicit warming queries
warming_queries = [
    "MATCH (u:User) RETURN count(u)",
    "MATCH (p:Product) WHERE p.active = true RETURN count(p)"
]
```

**Manual Warming**:
```gql
-- Warm specific table into buffer pool
CALL system.warm_table('User');

-- Warm index
CALL system.warm_index('user_email_idx');

-- Check warming progress
SELECT table_name, pages_loaded, pages_total, percent_complete
FROM system.warming_status;
```

### Monitoring Buffer Pool

```gql
-- Buffer pool statistics
SELECT
    total_pages,
    used_pages,
    dirty_pages,
    free_pages,
    hit_count,
    miss_count,
    hit_ratio,
    evictions_total
FROM system.buffer_pool_stats;

-- Buffer usage by table
SELECT
    table_name,
    cached_pages,
    cached_mb,
    dirty_pages,
    access_count,
    hit_ratio
FROM system.buffer_usage_by_table
ORDER BY cached_mb DESC;

-- Buffer usage by index
SELECT
    index_name,
    cached_pages,
    cached_mb,
    hit_ratio
FROM system.buffer_usage_by_index
ORDER BY cached_mb DESC;
```

## Metadata Cache

### Schema and Statistics Caching

Geode caches schema information and query statistics:

```toml
[cache.metadata]
enabled = true

# Schema cache
schema_cache_size = 1000  # Entries
schema_refresh_interval_seconds = 60

# Statistics cache
statistics_cache_size = 10000
statistics_refresh_interval_seconds = 300
auto_analyze_threshold = 0.1  # 10% data change triggers refresh
```

### Statistics Refresh

```gql
-- Refresh statistics for a table
ANALYZE User;

-- Refresh all statistics
ANALYZE;

-- View cached statistics
SELECT
    table_name,
    row_count,
    distinct_values,
    null_fraction,
    avg_width,
    last_analyzed
FROM system.table_statistics;

-- Column statistics
SELECT
    table_name,
    column_name,
    n_distinct,
    most_common_values,
    histogram_bounds
FROM system.column_statistics
WHERE table_name = 'User';
```

## Distributed Caching

### Cache Coordination in Clusters

In distributed deployments, Geode coordinates caches across nodes:

```toml
[cache.distributed]
enabled = true

# Cache coherence protocol
coherence = "invalidate"  # invalidate or update

# Coordination
coordinator = "leader"  # leader or gossip
invalidation_delay_ms = 10

# Local cache settings
local_result_cache_mb = 256
local_plan_cache_entries = 1000
```

### Cache Invalidation Propagation

```
Write on Node 1:
┌──────────┐
│  Node 1  │───Write───> Data
│ (Leader) │
└────┬─────┘
     │ Invalidate
     ▼
┌────────────────────────────────────┐
│     Invalidation Broadcast         │
└────┬──────────────┬───────────────┘
     │              │
     ▼              ▼
┌──────────┐   ┌──────────┐
│  Node 2  │   │  Node 3  │
│  Cache   │   │  Cache   │
│ Invalid  │   │ Invalid  │
└──────────┘   └──────────┘
```

### Monitoring Distributed Cache

```gql
-- Distributed cache statistics
SELECT
    node_id,
    local_cache_size_mb,
    invalidations_received,
    invalidations_sent,
    cache_coherence_lag_ms
FROM system.distributed_cache_stats;

-- Cross-node cache coordination
SELECT
    event_type,
    source_node,
    target_nodes,
    entries_invalidated,
    latency_ms
FROM system.cache_coordination_log
ORDER BY timestamp DESC
LIMIT 20;
```

## Application-Level Caching

### Client-Side Caching Patterns

Implement application-layer caching for frequently accessed data:

**Python with Redis**:
```python
import redis
import json
from geode_client import Client

class CachedGeodeClient:
    def __init__(self, geode_host, redis_host):
        self.geode = Client(host=geode_host, port=3141)
        self.redis = redis.Redis(host=redis_host)

    async def get_user(self, user_id, ttl=300):
        """Get user with Redis caching"""
        cache_key = f"user:{user_id}"

        # Check cache
        cached = self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        # Query Geode
        async with self.geode.connection() as conn:
            result, _ = await conn.query(
                "MATCH (u:User {id: $id}) RETURN u",
                {"id": user_id}
            )

            if result.rows:
                user = dict(result.rows[0]['u'])
                # Cache result
                self.redis.setex(cache_key, ttl, json.dumps(user))
                return user

            return None

    async def update_user(self, user_id, properties):
        """Update user and invalidate cache"""
        async with self.geode.connection() as conn:
            await conn.execute(
                "MATCH (u:User {id: $id}) SET u += $props",
                {"id": user_id, "props": properties}
            )

        # Invalidate cache
        self.redis.delete(f"user:{user_id}")
```

**Go with In-Memory Cache**:
```go
import (
    "sync"
    "time"
    "database/sql"
    _ "geodedb.com/geode"
)

type CacheEntry struct {
    Data      map[string]interface{}
    ExpiresAt time.Time
}

type CachedClient struct {
    db    *sql.DB
    cache sync.Map
    ttl   time.Duration
}

func NewCachedClient(dsn string, ttl time.Duration) (*CachedClient, error) {
    db, err := sql.Open("geode", dsn)
    if err != nil {
        return nil, err
    }
    return &CachedClient{db: db, ttl: ttl}, nil
}

func (c *CachedClient) GetUser(userID string) (map[string]interface{}, error) {
    cacheKey := "user:" + userID

    // Check cache
    if entry, ok := c.cache.Load(cacheKey); ok {
        ce := entry.(CacheEntry)
        if time.Now().Before(ce.ExpiresAt) {
            return ce.Data, nil
        }
        c.cache.Delete(cacheKey)
    }

    // Query database
    row := c.db.QueryRow(
        "MATCH (u:User {id: $1}) RETURN u.name, u.email",
        userID,
    )

    var name, email string
    if err := row.Scan(&name, &email); err != nil {
        return nil, err
    }

    // Cache result
    data := map[string]interface{}{"name": name, "email": email}
    c.cache.Store(cacheKey, CacheEntry{
        Data:      data,
        ExpiresAt: time.Now().Add(c.ttl),
    })

    return data, nil
}
```

### Cache-Aside Pattern

```python
async def get_user_friends(user_id):
    """Cache-aside pattern for friend list"""
    cache_key = f"friends:{user_id}"

    # 1. Try cache first
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # 2. Cache miss - query database
    async with geode.connection() as conn:
        result, _ = await conn.query("""
            MATCH (u:User {id: $id})-[:FRIENDS_WITH]-(friend)
            RETURN friend.id, friend.name
        """, {"id": user_id})

        friends = [dict(r) for r in result.rows]

    # 3. Update cache
    await redis.setex(cache_key, 300, json.dumps(friends))

    return friends
```

### Write-Through Pattern

```python
async def add_friend(user_id, friend_id):
    """Write-through: update cache on write"""
    async with geode.connection() as conn:
        # 1. Write to database
        await conn.execute("""
            MATCH (u:User {id: $uid}), (f:User {id: $fid})
            CREATE (u)-[:FRIENDS_WITH]->(f)
        """, {"uid": user_id, "fid": friend_id})

    # 2. Update cache (or invalidate)
    cache_key = f"friends:{user_id}"

    # Option A: Invalidate
    await redis.delete(cache_key)

    # Option B: Update cache
    friends = await get_user_friends_from_db(user_id)
    await redis.setex(cache_key, 300, json.dumps(friends))
```

## Cache Tuning and Optimization

### Sizing Guidelines

**Query Result Cache**:
- Size based on unique query patterns and result sizes
- Start with 256-512 MB for small deployments
- Scale to 1-4 GB for large deployments

**Plan Cache**:
- Typically 2000-10000 entries sufficient
- Monitor miss rate; increase if >10%

**Buffer Pool**:
- 50-75% of available RAM
- Should hold working set for good hit ratio (>95%)

### Performance Tuning

```toml
# High-performance caching configuration
[cache]
# Aggressive result caching for read-heavy workloads
[cache.query_result]
enabled = true
max_size_mb = 2048
ttl_seconds = 600
eviction_policy = "lfu"  # Favor frequently used

# Large plan cache for complex applications
[cache.query_plan]
enabled = true
max_entries = 10000
auto_parameterize = true

# Buffer pool sized for working set
[cache.buffer_pool]
size_mb = 32768  # 32 GB
eviction_policy = "lru-k"
background_writer_enabled = true

# Metadata refresh
[cache.metadata]
statistics_refresh_interval_seconds = 600
auto_analyze_threshold = 0.05  # More aggressive refresh
```

### Cache Metrics and Alerting

```yaml
# Prometheus alerting rules
groups:
  - name: geode_cache_alerts
    rules:
      - alert: QueryCacheHitRateLow
        expr: geode_query_cache_hit_ratio < 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Query cache hit rate below 50%"

      - alert: PlanCacheMissRateHigh
        expr: rate(geode_plan_cache_misses_total[5m]) / rate(geode_plan_cache_requests_total[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Plan cache miss rate above 10%"

      - alert: BufferPoolHitRateLow
        expr: geode_buffer_pool_hit_ratio < 0.95
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Buffer pool hit rate below 95%"

      - alert: CacheMemoryPressure
        expr: geode_cache_evictions_total > 1000
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "High cache eviction rate"
```

## Best Practices

### General Guidelines

1. **Size caches appropriately**: Monitor hit ratios and adjust sizes
2. **Use prepared statements**: Maximize plan cache effectiveness
3. **Parameterize queries**: Enable automatic parameterization
4. **Monitor invalidation**: High invalidation rates may indicate issues
5. **Warm caches on startup**: Reduce cold-start latency

### Query Result Cache

1. **Cache read-heavy queries**: Greatest benefit for repeated reads
2. **Set appropriate TTL**: Balance freshness vs. cache efficiency
3. **Exclude volatile data**: Don't cache rapidly changing results
4. **Use cache hints**: Control caching per-query when needed

### Buffer Pool

1. **Size for working set**: Hit ratio >95% is target
2. **Enable background writer**: Smooth I/O patterns
3. **Monitor dirty pages**: Keep below threshold
4. **Use page warming**: Reduce cold-start impact

### Distributed Caching

1. **Choose coherence strategy**: Invalidate for consistency, update for performance
2. **Monitor coordination lag**: Alert on high latency
3. **Consider local caches**: Reduce cross-node traffic

## Related Topics

- [Performance](/tags/performance/) - Performance optimization
- [Query Optimization](/tags/query-optimization/) - Query tuning
- [Storage](/tags/storage/) - Storage engine details
- [Monitoring](/tags/monitoring/) - Cache monitoring
- [Configuration](/tags/configuration/) - Server configuration
- [Indexing](/tags/indexing/) - Index management

## Further Reading

- Cache Configuration Deep Dive
- Query Result Cache Tuning
- Buffer Pool Optimization Guide
- Distributed Cache Architecture
- Application Caching Patterns
- Cache Monitoring Dashboard Setup
