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

{{< callout type="warning" >}}
**Cache internals are not addressable from GQL.** The planner's AST/plan cache
and the storage engine's page handling are internal: there is no `system.*`
procedure namespace, no `system.*` catalog tables, no `OPTION (NO_CACHE)` /
`OPTION (REFRESH_CACHE)` clause, and no cache-clearing, warming or statistics
procedure. The cache layers described below are real engine behaviour, but the
only things you can *do* about them from outside are: choose what you query,
size the host, and cache in your own application (see
[Application-Level Caching](#application-level-caching)). Query-level
observability is `EXPLAIN`/`PROFILE`; process-level observability is the
Prometheus endpoint.
{{< /callout >}}

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

**Manual Cache Control**: none is exposed. There is no per-statement cache
hint and no cache-clearing procedure; the engine invalidates cached plans when
the schema or data they depend on changes. If you must guarantee a fresh read,
issue the query — results are computed from the current snapshot, not served
from a stale result cache.

### Monitoring Query Cache

```gql
-- No cache-statistics catalog exists. Measure the effect end-to-end instead:
-- run the statement twice and compare the reported execution time.
PROFILE MATCH (u:User {id: $id}) RETURN u.name;

-- Aggregate query volume comes from the metrics endpoint, not the database:
--   rate(geode_queries_total[5m])
--   histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))
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
-- The plan cache publishes no statistics and cannot be listed or cleared.
-- Inspect the plan the optimizer picked for a specific statement:
EXPLAIN MATCH (u:User {id: $id}) RETURN u.name;

-- ...and what executing it actually cost:
PROFILE MATCH (u:User {id: $id}) RETURN u.name;
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

**Manual Warming**: there is no warming procedure. Warm the cache the same way
production traffic does — by running the queries you care about:

```gql
-- Touch the label and its index the way the hot path will
MATCH (u:User) RETURN count(u);
MATCH (u:User) WHERE u.email = 'warmup@example.com' RETURN u;
```

Run those from a start-up script (`geode query -f warmup.gql`) after the server
comes up.

### Monitoring Buffer Pool

Buffer-pool hit ratios and per-table page residency are not published. The
page-level facts the engine does expose are the page size and free-page counts:

```gql
CALL geode.storage.stats()
YIELD page_size, free_pages_nodes, free_pages_adj_out, free_pages_adj_in,
      free_pages_props, free_pages_var
RETURN page_size, free_pages_nodes, free_pages_adj_out, free_pages_adj_in,
       free_pages_props, free_pages_var;
```

Process memory is on the metrics endpoint as `geode_memory_bytes`; host-level
page-cache behaviour comes from `node_exporter`.

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

Catalog and statistics caching is maintained by the engine. There is no
`ANALYZE` command and no statistics catalog to read; the introspection surface
is the catalog itself:

```gql
SHOW INDEXES;
SHOW CONSTRAINTS;

CALL db.labels() YIELD label RETURN label ORDER BY label;
CALL db.propertyKeys() YIELD propertyKey RETURN propertyKey ORDER BY propertyKey;
```

Real cardinalities come from counting:

```gql
MATCH (u:User) RETURN count(u) AS row_count;
MATCH (u:User) RETURN count(DISTINCT u.email) AS distinct_values;
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

Per-node cache statistics and a coordination log are not published. What a
cluster does expose is membership and leadership:

```gql
SHOW CLUSTER STATUS;
```

That returns one row per member (`node_id`, `role`, `term`, `leader_id`,
`endpoint`, `last_contact_ms`); in standalone mode it returns a single row with
`role = standalone`. Scrape `/metrics` on each node for per-node query,
connection and memory counters.

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
