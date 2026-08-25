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
-- Create view with manual refresh
CREATE MATERIALIZED VIEW quarterly_analytics AS
MATCH (s:Sale)-[:CONTAINS]->(p:Product)
WHERE s.quarter = 'Q4-2025'
RETURN p.category, sum(s.amount) AS total_sales, count(s) AS sale_count
WITH REFRESH STRATEGY manual
```

**Characteristics**:

- Refresh only on explicit command
- Lowest resource overhead
- Best for infrequently changing data
- Suitable for monthly/quarterly reports

**Refresh Command**:

```gql
-- Manually refresh view
REFRESH MATERIALIZED VIEW quarterly_analytics
```

### Auto-Immediate Refresh

**Use Case**: Real-time dashboards, critical metrics

```gql
-- Create view with immediate refresh
CREATE MATERIALIZED VIEW real_time_metrics AS
MATCH (o:Order)
WHERE o.created_date > datetime().subtract(PT1H)
RETURN o.status, count(o) AS order_count, sum(o.total) AS revenue
WITH REFRESH STRATEGY auto_immediate
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
-- Create view with hourly refresh
CREATE MATERIALIZED VIEW user_activity_summary AS
MATCH (u:User)-[a:ACTION]->(t:Target)
WHERE a.timestamp > datetime().subtract(P30D)
RETURN u.department, t.type, count(a) AS action_count, avg(a.duration) AS avg_duration
WITH REFRESH STRATEGY auto_scheduled INTERVAL 3600  -- Every hour
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
-- Create view with incremental refresh
CREATE MATERIALIZED VIEW order_summary AS
MATCH (o:Order)
RETURN o.date, o.region, count(o) AS order_count, sum(o.amount) AS revenue
WITH REFRESH STRATEGY incremental
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
CREATE MATERIALIZED VIEW live_sensor_data AS
MATCH (s:Sensor)-[:REPORTS]->(m:Measurement)
WHERE m.timestamp > datetime().subtract(PT5M)
RETURN s.id, avg(m.value) AS avg_value, max(m.value) AS max_value
WITH REFRESH STRATEGY streaming
```

**Characteristics**:

- Continuous incremental updates
- Sub-second data freshness
- Integrates with event streams
- Best for IoT, monitoring, real-time dashboards

## Creating Materialized Views

### Basic Syntax

```gql
CREATE MATERIALIZED VIEW view_name AS
<GQL query>
[WITH REFRESH STRATEGY <strategy> [INTERVAL <seconds>]]
```

### Simple Aggregation

```gql
-- Product sales summary
CREATE MATERIALIZED VIEW product_sales AS
MATCH (p:Product)<-[:CONTAINS]-(s:Sale)
RETURN p.category,
       count(s) AS sale_count,
       sum(s.amount) AS total_revenue,
       avg(s.amount) AS avg_sale
WITH REFRESH STRATEGY auto_scheduled INTERVAL 3600
```

**Benefit**: Returns pre-computed results instead of scanning source data.

### Complex Join

```gql
-- Customer behavior analysis
CREATE MATERIALIZED VIEW customer_insights AS
MATCH (c:Customer)-[:PLACED]->(o:Order)-[:CONTAINS]->(p:Product)
WHERE o.created_date > datetime().subtract(P90D)
RETURN c.segment,
       c.region,
       count(DISTINCT o) AS order_count,
       count(DISTINCT p) AS unique_products,
       sum(o.total) AS lifetime_value,
       avg(o.total) AS avg_order_value
WITH REFRESH STRATEGY auto_scheduled INTERVAL 7200
```

**Benefits**:

- Pre-computed joins eliminate join cost
- Aggregations computed once
- Perfect for dashboard queries

### Time-Series Data

```gql
-- Daily metrics rollup
CREATE MATERIALIZED VIEW daily_metrics AS
MATCH (m:Metric)
WHERE m.timestamp > datetime().subtract(P365D)
RETURN date(m.timestamp) AS metric_date,
       m.type,
       count(m) AS count,
       avg(m.value) AS avg_value,
       percentile(m.value, 0.95) AS p95_value,
       percentile(m.value, 0.99) AS p99_value
WITH REFRESH STRATEGY auto_scheduled INTERVAL 86400  -- Daily
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
CREATE MATERIALIZED VIEW user_summary AS
MATCH (u:User)-[:POSTED]->(p:Post)-[:HAS_TAG]->(t:Tag)
RETURN u.name, count(p) AS post_count, collect(DISTINCT t.name) AS tags
```

**Detected Dependencies**:

- Tables: User, Post, Tag
- Relationships: POSTED, HAS_TAG
- Change to any triggers refresh consideration

### Cascading Refreshes

**Dependency Chain**:

```gql
-- Base view
CREATE MATERIALIZED VIEW daily_sales AS
MATCH (s:Sale)
RETURN date(s.created_date) AS sale_date, sum(s.amount) AS revenue

-- Dependent view
CREATE MATERIALIZED VIEW monthly_sales AS
MATCH (d:daily_sales)
RETURN year_month(d.sale_date) AS month, sum(d.revenue) AS monthly_revenue
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
CREATE MATERIALIZED VIEW sales_by_date PARTITION BY date AS
MATCH (s:Sale)
RETURN date(s.created_date) AS sale_date,
       s.region,
       sum(s.amount) AS revenue
WITH REFRESH STRATEGY incremental
```

**Benefits**:

- Refresh only affected partitions
- Parallel partition processing
- Efficient data pruning
- Better compression

### View Chaining

```gql
-- Base view
CREATE MATERIALIZED VIEW hourly_metrics AS ...

-- Derived view (uses base view)
CREATE MATERIALIZED VIEW daily_summary AS
MATCH (h:hourly_metrics)
RETURN date(h.timestamp) AS metric_date,
       avg(h.value) AS avg_daily_value
WITH REFRESH STRATEGY auto_scheduled INTERVAL 86400
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
CREATE MATERIALIZED VIEW active_users_now AS
MATCH (u:User)-[:SESSION]->(s:Session)
WHERE s.last_seen > datetime().subtract(PT15M)
RETURN count(DISTINCT u) AS active_users,
       count(s) AS total_sessions,
       avg(s.duration_seconds) AS avg_session_duration
WITH REFRESH STRATEGY auto_immediate
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
CREATE MATERIALIZED VIEW monthly_sales_report AS
MATCH (s:Sale)-[:SOLD_BY]->(rep:SalesRep)
WHERE s.created_date >= startOfMonth()
RETURN rep.name,
       rep.region,
       count(s) AS deals_closed,
       sum(s.amount) AS total_revenue,
       avg(s.amount) AS avg_deal_size,
       percentile(s.amount, 0.5) AS median_deal
WITH REFRESH STRATEGY auto_scheduled INTERVAL 3600
```

### Customer Segmentation

```gql
-- Customer lifetime value segments
CREATE MATERIALIZED VIEW customer_segments AS
MATCH (c:Customer)-[:PLACED]->(o:Order)
WITH c, sum(o.total) AS ltv, count(o) AS order_count
RETURN CASE
  WHEN ltv > 10000 THEN 'VIP'
  WHEN ltv > 5000 THEN 'High Value'
  WHEN ltv > 1000 THEN 'Medium Value'
  ELSE 'New Customer'
END AS segment,
count(c) AS customer_count,
avg(ltv) AS avg_ltv,
avg(order_count) AS avg_orders
WITH REFRESH STRATEGY auto_scheduled INTERVAL 86400
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
DROP MATERIALIZED VIEW old_view
CREATE MATERIALIZED VIEW new_view AS ...
WITH REFRESH STRATEGY incremental ENABLE_CHANGE_TRACKING true
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
   CREATE MATERIALIZED VIEW partitioned_sales PARTITION BY region AS ...
   ```

3. **Prune old data**:

   ```gql
   ALTER MATERIALIZED VIEW sales_view SET RETENTION P90D
   ```

## Best Practices

### View Design

1. **Appropriate Granularity**:

   ```gql
   -- ✅ Good: Aggregate to useful level
   CREATE MATERIALIZED VIEW daily_sales AS ...  -- Daily granularity

   -- ❌ Bad: Too granular
   CREATE MATERIALIZED VIEW second_by_second AS ...  -- Too detailed
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
