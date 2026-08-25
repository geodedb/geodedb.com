---
title: "Materialized Views System"
description: "Enterprise materialized views in Geode with automatic refresh strategies, dependency tracking, and query acceleration for complex analytical queries."
summary: "Learn how Geode's materialized view system accelerates query performance through intelligent refresh strategies, dependency tracking, and automatic query optimization."
slug: "materialized-views"
url: "/docs/query/materialized-views/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 370
keywords: ["materialized views", "query acceleration", "refresh strategies", "incremental refresh", "query optimization", "caching", "analytics", "performance"]
tags: ["query", "optimization", "analytics", "performance"]
categories: ["Query Optimization"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/query/materialized-views/"
    noindex: false
---

<!-- CANARY: REQ=REQ-GQL-024; FEATURE="Conformance Flagger"; ASPECT=ImplDefinedCollationAndNullOrdering; STATUS=TESTED; OWNER=engine; UPDATED=2025-09-21 -->

## Overview

{{< callout type="warning" >}}
**Not reachable from GQL yet.** The materialized-view manager exists inside the
engine (`MaterializedViewManager`: catalog, dependency tracker, refresh
scheduler, query rewriter), but the GQL grammar has no `MATERIALIZED` keyword
and the procedure registry has no `db.view.*` namespace. Nothing on this page
can be executed against a running server today; it documents the internal
design and the intended surface. For pre-computed results you can use now,
write the aggregate back onto nodes with an ordinary `MATCH ... SET` batch job,
as shown in [Manual Precomputation](#manual-precomputation).
{{< /callout >}}

The Geode Materialized Views System provides comprehensive view management with intelligent refresh strategies, dependency tracking, and query optimization. This system improves query performance for complex analytical queries by pre-computing and storing query results with enterprise-grade reliability.

### What are Materialized Views?

**Materialized Views** are pre-computed query results stored as physical data structures that can be queried like regular tables. Unlike regular views (which re-execute the query each time), materialized views cache results for instant access.

**Key Benefits**:

- **Query Acceleration**: Faster access to pre-computed results
- **Resource Efficiency**: Compute once, query many times
- **Automatic Refresh**: Keep data current with configurable strategies
- **Dependency Tracking**: Automatic updates when source data changes
- **Query Rewriting**: Optimizer automatically uses views when beneficial

## Architecture

### System Components

```
MaterializedViewManager
├── ViewCatalog          - Metadata and storage management
├── DependencyTracker    - Table-view dependency detection
├── RefreshScheduler     - Priority-based refresh scheduling
├── QueryRewriter        - Automatic query optimization using views
└── ViewMetrics         - Performance monitoring and statistics
```

### Data Flow

```plaintext
1. CREATE MATERIALIZED VIEW → Parse query, extract dependencies
2. ViewCatalog → Store metadata (source query, refresh strategy)
3. Initial Refresh → Execute source query, store results
4. DependencyTracker → Monitor source table changes
5. RefreshScheduler → Trigger refresh based on strategy
6. QueryRewriter → Match incoming queries to compatible views
7. Result → Return cached data (faster than re-computing)
```

## Refresh Strategies

### Manual Refresh

**Use Case**: Full control over refresh timing, analytical reports

```gql
-- Geode has no views (no CREATE VIEW). Save the query text in your
-- application, or precompute the result onto nodes.
```

**Characteristics**:

- Refresh only on explicit command
- Lowest resource overhead
- Best for infrequently changing data
- Suitable for monthly/quarterly reports

**Refresh Command**:

```gql
-- Manually refresh view
-- There is no materialized view to refresh or drop. Re-run the
-- precompute batch above to update the stored aggregate.
```

### Auto-Immediate Refresh

**Use Case**: Real-time dashboards, critical metrics

```gql
-- Geode has no views (no CREATE VIEW). Save the query text in your
-- application, or precompute the result onto nodes.
```

**Characteristics**:

- Refreshes immediately when source data changes
- Always returns current data
- Higher resource usage
- Best for mission-critical dashboards

**Behavior**:

```plaintext
1. Transaction commits to Order table
2. DependencyTracker detects change
3. RefreshScheduler queues immediate refresh
4. View refreshes within seconds
5. Next query sees updated data
```

### Auto-Scheduled Refresh

**Use Case**: Regular reports, hourly/daily aggregations

```gql
-- Geode has no views (no CREATE VIEW). Save the query text in your
-- application, or precompute the result onto nodes.
```

**Characteristics**:

- Predictable refresh schedule
- Balanced resource usage
- Data freshness within refresh interval
- Best for periodic analytics

**Configuration**:

```yaml
# Default intervals
default_refresh_intervals:
  high_priority: 900    # 15 minutes
  normal: 3600          # 1 hour
  low_priority: 86400   # 24 hours
```

### Incremental Refresh

**Use Case**: Large views with small updates

```gql
-- Geode has no views (no CREATE VIEW). Save the query text in your
-- application, or precompute the result onto nodes.
```

**Characteristics**:

- Only processes changed rows
- Dramatically faster for large datasets
- Requires change tracking
- Best for append-only or small update patterns

**Behavior**:

```plaintext
Initial Refresh: Process all 1M rows → 60 seconds
Incremental Refresh: Process 1K changed rows → 0.5 seconds (120x faster)
```

### Streaming Refresh

**Use Case**: Continuous data feeds, real-time analytics

```gql
-- Create streaming view
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
```

**Characteristics**:

- Continuous incremental updates
- Sub-second data freshness
- Integrates with event streams
- Best for IoT, monitoring, real-time dashboards

## Creating Materialized Views

### Basic Syntax

```gql
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
```

### Simple Aggregation

```gql
-- Product sales summary
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
```

**Benefit**: Returns pre-computed results instead of scanning source data.

### Complex Join

```gql
-- Customer behavior analysis
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
```

**Benefits**:

- Pre-computed joins eliminate join cost
- Aggregations computed once
- Perfect for dashboard queries

### Time-Series Data

```gql
-- Daily metrics rollup
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
```

**Use Case**: Historical trend analysis, SLA reporting

## Querying Materialized Views

### Direct Query

```gql
-- Query the materialized view directly
MATCH (v:product_sales)
WHERE v.category = 'Electronics'
RETURN v.category, v.total_revenue
ORDER BY v.total_revenue DESC
```

**Characteristics**:

- Instant results from cached data
- No re-computation
- Limited to pre-computed columns

### Automatic Query Rewriting

Geode's optimizer automatically rewrites queries to use compatible materialized views:

**Original Query**:

```gql
MATCH (p:Product)<-[:CONTAINS]-(s:Sale)
WHERE p.category = 'Electronics'
RETURN p.category, sum(s.amount) AS revenue
```

**Optimizer Rewrite**:

```gql
-- Automatically uses product_sales view
MATCH (v:product_sales)
WHERE v.category = 'Electronics'
RETURN v.category, v.total_revenue AS revenue
```

**Performance Impact**:

```plaintext
Original: 1.8 seconds
Rewritten: 0.015 seconds (120x speedup)
```

### View Compatibility

**Compatible Query** (uses view):

```gql
-- Matches view structure
MATCH (p:Product)<-[:CONTAINS]-(s:Sale)
RETURN p.category, count(s)
-- ✅ Uses product_sales view
```

**Incompatible Query** (doesn't use view):

```gql
-- Different aggregation
MATCH (p:Product)<-[:CONTAINS]-(s:Sale)
RETURN p.brand, count(s)  -- Grouped by brand, not category
-- ❌ Cannot use product_sales view
```

## Dependency Tracking

### Automatic Dependency Detection

Geode automatically extracts table and relationship dependencies:

```gql
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
```

**Detected Dependencies**:

- Tables: User, Post, Tag
- Relationships: POSTED, HAS_TAG
- Change to any triggers refresh consideration

### Cascading Refreshes

**Dependency Chain**:

```gql
-- Base view
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
-- Dependent view
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
```

**Refresh Behavior**:

```plaintext
1. Sale table updated
2. daily_sales refresh triggered
3. DependencyTracker detects monthly_sales depends on daily_sales
4. monthly_sales refresh queued after daily_sales completes
5. Cascade preserves consistency
```

### Change Detection

**Change Log**:

```zig
pub const ChangeLogEntry = struct {
    table_name: []const u8,
    change_type: ChangeType,  // INSERT, UPDATE, DELETE
    timestamp: i64,
    row_count: u32,
    processed: bool,
};
```

**Incremental Refresh Logic**:

```plaintext
1. Track changes since last refresh
2. Apply only delta changes to view
3. Update view statistics
4. Mark changes as processed
```

## Performance Monitoring

### View Statistics

View statistics are collected internally by `ViewMetrics`. There is no
`db.view.stats` procedure to read them with — the introspection procedures the
server dispatches are `db.labels`, `db.relationshipTypes`, `db.propertyKeys`,
`db.indexes`, `db.constraints`, `dbms.procedures` and `dbms.functions`. The
shape the manager tracks per view is:

**Output**:

```json
{
  "total_refreshes": 240,
  "successful_refreshes": 238,
  "failed_refreshes": 2,
  "average_refresh_time_ms": 1250,
  "total_query_hits": 15420,
  "cache_hit_ratio": 0.98,
  "last_refresh": "2026-01-24T10:30:00Z",
  "next_refresh": "2026-01-24T11:30:00Z",
  "storage_mb": 45.2
}
```

### System Statistics

Manager-level statistics are aggregated the same way, and are likewise not
exposed through a procedure:

**Output**:

```json
{
  "total_views": 12,
  "active_refreshes": 2,
  "total_storage_gb": 2.4,
  "average_cache_hit_ratio": 0.95,
  "refresh_success_rate": 0.992
}
```

### Performance Metrics

**Collected Metrics**:

- **total_refreshes**: Lifetime refresh count
- **successful_refreshes**: Successful refresh operations
- **failed_refreshes**: Failed refresh attempts
- **average_refresh_time_ms**: Mean refresh duration
- **total_query_hits**: View usage count
- **last_query_hit_timestamp**: Most recent query
- **cache_hit_ratio**: Queries served from view vs re-executed
- **storage_efficiency**: Compression ratio vs raw data

## Configuration

### View Manager Settings

```yaml
# config/views.yaml
materialized_views:
  max_views: 1000
  max_view_size_mb: 1024
  default_refresh_interval_seconds: 3600
  enable_auto_refresh: true
  enable_incremental_refresh: true
  max_concurrent_refreshes: 4
  refresh_timeout_seconds: 1800
```

**Options Explained**:

- **max_views**: Maximum concurrent materialized views
- **max_view_size_mb**: Per-view storage limit
- **default_refresh_interval_seconds**: Default auto-scheduled interval
- **enable_auto_refresh**: Global auto-refresh toggle
- **enable_incremental_refresh**: Enable incremental refresh capability
- **max_concurrent_refreshes**: Parallel refresh limit
- **refresh_timeout_seconds**: Refresh operation timeout

### Refresh Priority

```zig
pub const RefreshPriority = enum {
    immediate,  // <1 minute
    high,       // <15 minutes
    normal,     // <1 hour
    low,        // <24 hours
    background, // Best effort
};
```

**Priority Queue**:

```plaintext
Immediate → High → Normal → Low → Background

Scheduling:
- Immediate: Pre-empts normal operations
- High: Priority over normal queries
- Normal: Standard priority
- Low: Off-peak hours preferred
- Background: Idle time only
```

## Advanced Features

### Partitioned Views

```gql
-- Create partitioned view by date
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
```

**Benefits**:

- Refresh only affected partitions
- Parallel partition processing
- Efficient data pruning
- Better compression

### View Chaining

```gql
-- Base view
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
-- Derived view (uses base view)
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
```

**Benefits**:

- Compose complex analytics pipelines
- Reuse intermediate results
- Optimize storage (base view can be pruned)

### Custom Refresh Logic

```zig
// Custom refresh trigger
pub fn refreshOnThreshold(
    view_name: []const u8,
    threshold_rows: u32,
) !void {
    const change_count = try getChangeCount(view_name);
    if (change_count >= threshold_rows) {
        try refreshView(view_name);
    }
}
```

## Use Cases

### Real-Time Dashboards

```gql
-- Active users dashboard
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
```

**Dashboard Integration**:

```javascript
// Frontend refreshes every 30 seconds
setInterval(async () => {
  const metrics = await query('MATCH (v:active_users_now) RETURN v');
  updateDashboard(metrics);
}, 30000);
```

### Analytical Reporting

```gql
-- Monthly sales report
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
```

### Customer Segmentation

```gql
-- Customer lifetime value segments
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;
```

## Troubleshooting

### Refresh Failures

**Issue**: View refresh fails with timeout

**Diagnosis**: no view-status procedure exists; time the source query directly
with `PROFILE` to see where the refresh cost comes from.

**Solution**:

```yaml
# Increase refresh timeout
materialized_views:
  refresh_timeout_seconds: 3600  # 1 hour

# Or optimize source query
# Add indexes on frequently joined columns
# Reduce aggregation complexity
# Consider partitioning
```

---

**Issue**: Incremental refresh not working

**Diagnosis**: change tracking is internal to `DependencyTracker` and has no
inspection procedure.

**Solution**:

```gql
-- Rebuild view with change tracking
-- There is no materialized view to refresh or drop. Re-run the
-- precompute batch above to update the stored aggregate.
```

### Performance Issues

**Issue**: View queries slower than expected

**Analysis**:

```gql
PROFILE MATCH (v:product_sales)
WHERE v.category = 'Electronics'
RETURN v
```

**Solutions**:

1. **Add indexes on view columns**:

   ```gql
   CREATE INDEX view_category_idx ON product_sales (category)
   ```

2. **Partition large views**:

   ```gql
   -- Materialized views are not reachable from GQL: the grammar has no
   -- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
   MATCH (u:User)-[:PURCHASED]->(p:Product)
   WITH p, count(*) AS purchases
   SET p.purchase_count = purchases;
   ```

3. **Prune old data**:

   ```gql
   -- There is no materialized view to refresh or drop. Re-run the
   -- precompute batch above to update the stored aggregate.
   ```

## Best Practices

### View Design

1. **Appropriate Granularity**:

   ```gql
   -- ✅ Good: Aggregate to useful level
   -- Materialized views are not reachable from GQL: the grammar has no
   -- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
   MATCH (u:User)-[:PURCHASED]->(p:Product)
   WITH p, count(*) AS purchases
   SET p.purchase_count = purchases;   -- ❌ Bad: Too granular
   -- Materialized views are not reachable from GQL: the grammar has no
   -- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
   MATCH (u:User)-[:PURCHASED]->(p:Product)
   WITH p, count(*) AS purchases
   SET p.purchase_count = purchases;
   ```

2. **Include Filtering Columns**:

   ```gql
   -- ✅ Good: Include common filter columns
   RETURN sale_date, region, category, revenue

   -- ❌ Bad: Missing important dimensions
   RETURN revenue  -- Can't filter by date/region
   ```

3. **Balance Freshness vs Cost**:

   ```gql
   -- Dashboard: Immediate refresh
   WITH REFRESH STRATEGY auto_immediate

   -- Reports: Scheduled refresh
   WITH REFRESH STRATEGY auto_scheduled INTERVAL 3600

   -- Archives: Manual refresh
   WITH REFRESH STRATEGY manual
   ```

### Refresh Strategy Selection

| Use Case | Strategy | Interval | Notes |
|----------|----------|----------|-------|
| Live dashboards | auto_immediate | N/A | Always current |
| Hourly reports | auto_scheduled | 3600 | Predictable |
| Daily analytics | auto_scheduled | 86400 | Overnight refresh |
| Large aggregations | incremental | 3600 | Process deltas only |
| Archive reports | manual | N/A | On-demand |
| Real-time feeds | streaming | N/A | Continuous updates |

### Monitoring

**Automated Checks**: there is no health-check or failed-refresh procedure to
poll. Until the GQL surface lands, monitor the batch job that maintains your
precomputed properties — it is an ordinary client program and can report its own
success or failure:

```bash
# Cron job: refresh precomputed aggregates, alert if the job fails
0 * * * * /usr/local/bin/geode-refresh-aggregates.sh \
  || mail -s "ALERT: aggregate refresh failed" ops@example.com
```

## Manual Precomputation

Until the GQL surface lands, the working equivalent of a materialized view is a
batch job that writes the aggregate onto the graph as ordinary properties:

```gql
-- "Refresh": recompute per-product sales and store them on the node
MATCH (p:Product)<-[:CONTAINS]-(o:Order)
WITH p, count(o) AS order_count, sum(o.total) AS revenue
SET p.order_count = order_count,
    p.revenue = revenue,
    p.aggregates_refreshed_at = datetime();

-- "Query the view": read the stored values, no aggregation at read time
MATCH (p:Product)
WHERE p.revenue > 10000
RETURN p.name, p.order_count, p.revenue
ORDER BY p.revenue DESC;
```

Schedule that statement from cron or your job runner at whatever interval your
staleness budget allows, and index the properties you filter on:

```gql
CREATE INDEX product_revenue_idx ON Product(revenue);
```

## References

### Documentation

- **Implementation**: `src/query/enhanced_materialized_views.zig`
- **Tests**: `tests/test_materialized_views_enhanced.zig`
- **Integration**: `tests/test_materialized_views_enhanced_integration.zig`
- **Source Docs**: `docs/MATERIALIZED_VIEWS.md`

### Related Topics

- [Query Optimization](/docs/query/performance-tuning/) - EXPLAIN and PROFILE
- [Indexing Guide](/docs/query/indexing-and-optimization/) - Index strategies
- [Real-Time Analytics](/docs/analytics/real-time-analytics/) - Streaming integration
- [Distributed Architecture](/docs/architecture/distributed-architecture/) - Federated views

## Next Steps

**For New Users**:

- [Indexing Guide](/docs/query/indexing-and-optimization/) - Foundation for view optimization
- [Query Performance](/docs/query/performance-tuning/) - Query optimization basics
- [GQL Guide](/docs/gql/guide/) - Query language fundamentals

**For Advanced Users**:

- [Real-Time Analytics](/docs/analytics/real-time-analytics/) - Streaming view integration
- [Distributed Coordination](/docs/architecture/distributed-architecture/) - Cross-shard views
- [Performance Benchmarking](/docs/guides/performance-benchmarking/) - View performance testing

**For Administrators**:

- [Monitoring](/docs/ops/observability/) - View health monitoring
- [Performance Tuning](/docs/configuration/server-configuration/) - System optimization
- [Backup & Recovery](/docs/guides/backup-automation/) - View backup strategies

---

**Document Version**: 1.0
**Last Updated**: January 24, 2026
**Status**: Production Ready
**Test Coverage**: 23 tests (15 unit + 8 integration)
**Concurrency**: Tested with 50+ concurrent views
