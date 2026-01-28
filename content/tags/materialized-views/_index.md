---
title: "Materialized Views - Pre-Computed Query Results"
description: "Comprehensive guide to materialized views in Geode: pre-computed, cached query results for dramatically improved read performance. Includes refresh strategies, incremental updates, indexing, and real-world analytics patterns."
keywords:
  - materialized views
  - cached queries
  - query optimization
  - pre-computed results
  - view refresh
  - incremental update
  - OLAP
  - analytics
  - data warehouse
  - query performance
  - view indexing
  - refresh strategies
  - concurrent refresh
  - automatic refresh
  - materialization
  - aggregation caching
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Materialized Views

Materialized views are pre-computed query results stored as physical data, providing orders-of-magnitude performance improvements for complex analytical queries. Unlike regular views that execute queries on-demand, materialized views cache results persistently, trading storage space and update complexity for dramatically faster read access. Essential for OLAP workloads, reporting dashboards, and data warehousing scenarios.

## Understanding Materialized Views

### What are Materialized Views?

Materialized views transform query execution:

**Pre-Computed** - Results calculated ahead of time during refresh
**Persistently Stored** - Saved to disk like regular tables or nodes
**Indexable** - Support standard indexes for fast lookups
**Refreshable** - Updated when source data changes via manual, scheduled, or incremental refresh
**Query-Transparent** - Can be queried like regular tables

### Benefits Over Regular Views

| Aspect | Regular View | Materialized View |
|--------|-------------|-------------------|
| Query Speed | Slow (recompute) | Fast (pre-computed) |
| Storage | None | Moderate to high |
| Freshness | Always current | Depends on refresh |
| Indexes | No | Yes |
| Use Case | Simple queries | Complex aggregations |

### When to Use Materialized Views

**Ideal Scenarios**:
- Complex aggregations across millions of rows
- Multi-table joins with expensive computations
- Frequently accessed reports and dashboards
- Historical snapshots and time-series rollups
- OLAP cubes and dimensional analytics

**Not Recommended For**:
- Transactional queries requiring real-time data
- Infrequently accessed queries
- Simple single-table lookups
- Data that changes constantly

## Creating Materialized Views

### Basic Syntax

```gql
-- Create materialized view for user statistics
CREATE MATERIALIZED VIEW user_stats AS
SELECT
    u.id AS user_id,
    u.name AS user_name,
    u.email,
    COUNT(DISTINCT p.id) AS post_count,
    COUNT(DISTINCT c.id) AS comment_count,
    COUNT(DISTINCT l.id) AS like_count,
    MAX(p.created_at) AS last_post_date,
    MIN(u.join_date) AS join_date
FROM User u
LEFT JOIN Post p ON u.id = p.author_id
LEFT JOIN Comment c ON u.id = c.author_id
LEFT JOIN Like l ON u.id = l.user_id
GROUP BY u.id, u.name, u.email;

-- Query materialized view (fast!)
SELECT * FROM user_stats
WHERE post_count > 100
ORDER BY like_count DESC
LIMIT 10;
```

### With Indexes for Performance

```gql
CREATE MATERIALIZED VIEW product_sales_summary AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.category,
    COUNT(DISTINCT o.id) AS order_count,
    SUM(oi.quantity) AS total_units_sold,
    SUM(oi.quantity * oi.unit_price) AS total_revenue,
    AVG(oi.unit_price) AS avg_price,
    MAX(o.created_at) AS last_sold_date
FROM Product p
LEFT JOIN OrderItem oi ON p.id = oi.product_id
LEFT JOIN Order o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY p.id, p.name, p.category;

-- Add indexes for common query patterns
CREATE INDEX idx_product_sales_category ON product_sales_summary(category);
CREATE INDEX idx_product_sales_revenue ON product_sales_summary(total_revenue DESC);
CREATE INDEX idx_product_sales_units ON product_sales_summary(total_units_sold DESC);

-- Fast filtered queries
SELECT * FROM product_sales_summary
WHERE category = 'Electronics'
  AND total_revenue > 100000
ORDER BY total_units_sold DESC;
```

## Refresh Strategies

### Manual Refresh

Explicitly refresh when needed:

```gql
-- Full refresh (recompute everything)
REFRESH MATERIALIZED VIEW user_stats;

-- Concurrent refresh (non-blocking, allows queries during refresh)
REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;

-- Check last refresh time
SELECT view_name, last_refresh, row_count
FROM system.materialized_views
WHERE view_name = 'user_stats';
```

### Automatic Scheduled Refresh

Configure automatic refresh schedules:

```gql
-- Refresh daily at 1 AM
CREATE MATERIALIZED VIEW daily_revenue AS
SELECT
    DATE(o.created_at) AS order_date,
    COUNT(*) AS order_count,
    SUM(o.total) AS total_revenue,
    AVG(o.total) AS avg_order_value,
    COUNT(DISTINCT o.customer_id) AS unique_customers
FROM Order o
WHERE o.status = 'completed'
GROUP BY DATE(o.created_at)
WITH REFRESH SCHEDULE '0 1 * * *';  -- Cron syntax

-- Refresh every hour
CREATE MATERIALIZED VIEW hourly_metrics AS
SELECT
    DATE_TRUNC('hour', timestamp) AS hour,
    metric_name,
    AVG(value) AS avg_value,
    MAX(value) AS max_value,
    MIN(value) AS min_value,
    COUNT(*) AS sample_count
FROM metrics
GROUP BY DATE_TRUNC('hour', timestamp), metric_name
WITH REFRESH SCHEDULE '0 * * * *';  -- Every hour on the hour
```

### Incremental Refresh

Update only changed data for efficiency:

```gql
CREATE MATERIALIZED VIEW product_inventory
WITH INCREMENTAL REFRESH AS
SELECT
    p.id AS product_id,
    p.name,
    p.stock_quantity,
    COALESCE(SUM(
        CASE
            WHEN oi.order_status = 'pending' THEN oi.quantity
            ELSE 0
        END
    ), 0) AS reserved_quantity,
    p.stock_quantity - COALESCE(SUM(
        CASE
            WHEN oi.order_status = 'pending' THEN oi.quantity
            ELSE 0
        END
    ), 0) AS available_quantity,
    COUNT(DISTINCT CASE
        WHEN oi.order_status = 'pending' THEN oi.order_id
    END) AS pending_orders
FROM Product p
LEFT JOIN OrderItem oi ON p.id = oi.product_id
GROUP BY p.id, p.name, p.stock_quantity;

-- Incremental refresh only updates changed products
REFRESH MATERIALIZED VIEW INCREMENTALLY product_inventory;
```

### Refresh on Write (Eager Materialization)

Automatically refresh when source data changes:

```gql
CREATE MATERIALIZED VIEW current_inventory
WITH REFRESH ON WRITE AS
SELECT
    p.id,
    p.name,
    p.stock_quantity,
    p.stock_quantity - COALESCE(reserved.qty, 0) AS available
FROM Product p
LEFT JOIN (
    SELECT product_id, SUM(quantity) AS qty
    FROM OrderItem
    WHERE order_status = 'pending'
    GROUP BY product_id
) reserved ON p.id = reserved.product_id;

-- View automatically updates when:
-- - Product stock_quantity changes
-- - OrderItem is created/updated/deleted
-- - Order status changes
```

## Real-World Analytics Patterns

### Time-Series Rollups

Create hierarchical time aggregations:

```gql
-- Hourly rollup (base level)
CREATE MATERIALIZED VIEW metrics_hourly AS
SELECT
    DATE_TRUNC('hour', timestamp) AS hour,
    sensor_id,
    metric_type,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    STDDEV(value) AS stddev_value,
    COUNT(*) AS sample_count
FROM sensor_readings
GROUP BY DATE_TRUNC('hour', timestamp), sensor_id, metric_type
WITH REFRESH SCHEDULE '5 * * * *';  -- 5 minutes past each hour

-- Daily rollup (aggregates hourly data)
CREATE MATERIALIZED VIEW metrics_daily AS
SELECT
    DATE_TRUNC('day', hour) AS day,
    sensor_id,
    metric_type,
    AVG(avg_value) AS avg_value,
    MIN(min_value) AS min_value,
    MAX(max_value) AS max_value,
    AVG(stddev_value) AS avg_stddev,
    SUM(sample_count) AS total_samples
FROM metrics_hourly
GROUP BY DATE_TRUNC('day', hour), sensor_id, metric_type
WITH REFRESH SCHEDULE '0 2 * * *';  -- 2 AM daily

-- Monthly rollup (aggregates daily data)
CREATE MATERIALIZED VIEW metrics_monthly AS
SELECT
    DATE_TRUNC('month', day) AS month,
    sensor_id,
    metric_type,
    AVG(avg_value) AS avg_value,
    MIN(min_value) AS min_value,
    MAX(max_value) AS max_value,
    SUM(total_samples) AS total_samples
FROM metrics_daily
GROUP BY DATE_TRUNC('month', day), sensor_id, metric_type
WITH REFRESH SCHEDULE '0 3 1 * *';  -- 3 AM on 1st of month
```

### Customer Segmentation

```gql
CREATE MATERIALIZED VIEW customer_segments AS
SELECT
    c.id AS customer_id,
    c.name,
    c.email,
    COUNT(DISTINCT o.id) AS order_count,
    SUM(o.total) AS lifetime_value,
    AVG(o.total) AS avg_order_value,
    MAX(o.created_at) AS last_order_date,
    DATEDIFF(DAY, MAX(o.created_at), NOW()) AS days_since_last_order,
    DATEDIFF(DAY, MIN(o.created_at), MAX(o.created_at)) AS customer_lifetime_days,

    -- Segment classification
    CASE
        WHEN SUM(o.total) > 10000 AND DATEDIFF(DAY, MAX(o.created_at), NOW()) < 90
            THEN 'vip_active'
        WHEN SUM(o.total) > 10000 AND DATEDIFF(DAY, MAX(o.created_at), NOW()) >= 90
            THEN 'vip_at_risk'
        WHEN SUM(o.total) > 1000 AND DATEDIFF(DAY, MAX(o.created_at), NOW()) < 180
            THEN 'loyal'
        WHEN DATEDIFF(DAY, MAX(o.created_at), NOW()) >= 365
            THEN 'churned'
        WHEN COUNT(DISTINCT o.id) = 1
            THEN 'one_time'
        ELSE 'regular'
    END AS segment,

    -- RFM score (Recency, Frequency, Monetary)
    NTILE(5) OVER (ORDER BY MAX(o.created_at) DESC) AS recency_score,
    NTILE(5) OVER (ORDER BY COUNT(DISTINCT o.id)) AS frequency_score,
    NTILE(5) OVER (ORDER BY SUM(o.total)) AS monetary_score

FROM Customer c
LEFT JOIN Order o ON c.id = o.customer_id
WHERE o.status = 'completed'
GROUP BY c.id, c.name, c.email
WITH REFRESH SCHEDULE '0 0 * * 0';  -- Weekly on Sunday midnight
```

### Product Performance Dashboard

```gql
CREATE MATERIALIZED VIEW product_performance_dashboard AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.category,
    p.base_price,

    -- Sales metrics
    COUNT(DISTINCT o.id) AS orders_with_product,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.quantity * oi.unit_price) AS gross_revenue,
    SUM(oi.quantity * p.cost) AS total_cost,
    SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * p.cost) AS gross_profit,
    (SUM(oi.quantity * oi.unit_price) - SUM(oi.quantity * p.cost)) /
        NULLIF(SUM(oi.quantity * oi.unit_price), 0) * 100 AS profit_margin,

    -- Customer metrics
    COUNT(DISTINCT o.customer_id) AS unique_customers,
    AVG(oi.quantity) AS avg_quantity_per_order,

    -- Time metrics
    MIN(o.created_at) AS first_sale_date,
    MAX(o.created_at) AS last_sale_date,
    DATEDIFF(DAY, MIN(o.created_at), MAX(o.created_at)) AS days_on_market,

    -- Review metrics
    COUNT(DISTINCT r.id) AS review_count,
    AVG(r.rating) AS avg_rating,

    -- Inventory metrics
    p.stock_quantity AS current_stock,
    CASE
        WHEN p.stock_quantity = 0 THEN 'out_of_stock'
        WHEN p.stock_quantity < 10 THEN 'low_stock'
        WHEN p.stock_quantity < 50 THEN 'moderate_stock'
        ELSE 'well_stocked'
    END AS stock_status,

    -- Performance classification
    CASE
        WHEN SUM(oi.quantity * oi.unit_price) > 100000 THEN 'top_performer'
        WHEN SUM(oi.quantity * oi.unit_price) > 10000 THEN 'strong_seller'
        WHEN SUM(oi.quantity * oi.unit_price) > 1000 THEN 'moderate_seller'
        WHEN SUM(oi.quantity) > 0 THEN 'slow_mover'
        ELSE 'no_sales'
    END AS performance_tier

FROM Product p
LEFT JOIN OrderItem oi ON p.id = oi.product_id
LEFT JOIN Order o ON oi.order_id = o.id AND o.status = 'completed'
LEFT JOIN Review r ON p.id = r.product_id
GROUP BY p.id, p.name, p.category, p.base_price, p.cost, p.stock_quantity
WITH REFRESH SCHEDULE '0 */6 * * *';  -- Every 6 hours
```

## Performance Optimization

### Choosing What to Materialize

```gql
-- Use EXPLAIN to identify expensive queries
EXPLAIN ANALYZE
SELECT
    category,
    COUNT(*) AS product_count,
    SUM(total_sales) AS category_revenue
FROM products
GROUP BY category;

-- If execution time > 1000ms and query frequency > 100/day:
-- → CREATE MATERIALIZED VIEW

-- Monitor view usage
SELECT
    view_name,
    query_count,
    avg_query_time_ms,
    last_refresh_duration_ms,
    storage_size_mb
FROM system.materialized_view_stats
ORDER BY query_count DESC;
```

### Partitioning Large Views

```gql
-- Partition by date for better refresh performance
CREATE MATERIALIZED VIEW sales_by_month
PARTITION BY month AS
SELECT
    DATE_TRUNC('month', order_date) AS month,
    product_id,
    COUNT(*) AS order_count,
    SUM(quantity) AS units_sold,
    SUM(revenue) AS total_revenue
FROM order_items
GROUP BY DATE_TRUNC('month', order_date), product_id;

-- Refresh only recent partitions
REFRESH MATERIALIZED VIEW sales_by_month
PARTITION WHERE month >= '2026-01-01';
```

### Cascading Refreshes

```gql
-- Create dependency chain for efficient updates
CREATE MATERIALIZED VIEW base_metrics AS
SELECT /* expensive base computation */
WITH REFRESH SCHEDULE '0 1 * * *';

CREATE MATERIALIZED VIEW derived_metrics AS
SELECT /* aggregates from base_metrics */
FROM base_metrics
WITH REFRESH AFTER base_metrics;  -- Automatically refresh after base
```

## Monitoring and Maintenance

### View Health Monitoring

```gql
-- Check view freshness
SELECT
    view_name,
    last_refresh_time,
    DATEDIFF(MINUTE, last_refresh_time, NOW()) AS minutes_since_refresh,
    last_refresh_duration_ms / 1000.0 AS refresh_duration_seconds,
    row_count,
    storage_size_mb
FROM system.materialized_views
ORDER BY minutes_since_refresh DESC;

-- Identify stale views
SELECT view_name, last_refresh_time
FROM system.materialized_views
WHERE last_refresh_time < NOW() - INTERVAL '24 hours'
AND refresh_schedule IS NOT NULL;  -- Should auto-refresh
```

### Refresh Performance

```gql
-- Analyze refresh performance
SELECT
    view_name,
    refresh_type,
    AVG(duration_ms) AS avg_duration_ms,
    MAX(duration_ms) AS max_duration_ms,
    COUNT(*) AS refresh_count
FROM system.materialized_view_refresh_history
WHERE refresh_time > NOW() - INTERVAL '7 days'
GROUP BY view_name, refresh_type
ORDER BY avg_duration_ms DESC;
```

### Storage Management

```gql
-- Identify large views
SELECT
    view_name,
    storage_size_mb,
    row_count,
    storage_size_mb / NULLIF(row_count, 0) * 1024 AS kb_per_row
FROM system.materialized_views
ORDER BY storage_size_mb DESC
LIMIT 20;

-- Drop unused views
DROP MATERIALIZED VIEW IF EXISTS old_unused_view;
```

## Best Practices

### Design Guidelines

1. **Materialize Aggregations, Not Raw Data**: Focus on expensive computations
2. **Add Appropriate Indexes**: Index columns used in WHERE and ORDER BY clauses
3. **Choose Refresh Strategy Wisely**: Balance freshness vs. performance cost
4. **Monitor Storage Growth**: Regularly review view sizes and cleanup unused views
5. **Document Business Logic**: Explain what each view represents and refresh schedule rationale

### Refresh Strategy Selection

| Data Change Frequency | Freshness Requirement | Recommended Strategy |
|-----------------------|----------------------|---------------------|
| Constant | Real-time | Don't use materialized view |
| Hourly | Minutes | Scheduled refresh every hour |
| Daily | Hours | Scheduled refresh daily |
| Weekly | Days | Scheduled refresh weekly |
| Rarely | Any | Manual refresh on-demand |
| Append-only | Near real-time | Incremental refresh |

### Testing Procedures

1. **Benchmark Performance**: Compare query times before/after materialization
2. **Test Refresh Load**: Ensure refresh doesn't impact production workload
3. **Verify Correctness**: Compare materialized results with live query results
4. **Monitor Resource Usage**: Track CPU, memory, and disk I/O during refresh

## Troubleshooting

### Slow Refresh Times

```gql
-- Check underlying query performance
EXPLAIN ANALYZE SELECT /* view definition query */;

-- Consider incremental refresh
ALTER MATERIALIZED VIEW slow_view
SET REFRESH MODE INCREMENTAL;

-- Partition large views
ALTER MATERIALIZED VIEW slow_view
PARTITION BY date_column;
```

### Out-of-Sync Data

```gql
-- Force full refresh
REFRESH MATERIALIZED VIEW problematic_view FORCE;

-- Verify data consistency
SELECT COUNT(*) FROM materialized_view;
SELECT COUNT(*) FROM (/* view definition query */) AS live_data;
```

## Related Topics

- [Indexes](/tags/indexes/) - Indexing strategies for materialized views
- [Performance](/tags/performance/) - Query optimization techniques
- [Caching](/tags/caching/) - Data caching strategies
- [Computed Properties](/tags/computed-properties/) - Dynamic property calculations
- [Aggregation](/tags/aggregation/) - Aggregation functions
- [Analytics](/tags/analytics/) - Analytical processing patterns

## Further Reading

- [Materialized Views (PostgreSQL)](https://www.postgresql.org/docs/current/rules-materializedviews.html) - PostgreSQL documentation
- [Kimball Dimensional Modeling](https://www.kimballgroup.com/) - Data warehouse design
- [OLAP Cube Design](https://docs.microsoft.com/en-us/analysis-services/multidimensional-models/olap-physical/understanding-microsoft-olap-architecture) - Microsoft Analysis Services
- [View Maintenance Research](https://dl.acm.org/doi/10.1145/170036.170066) - Academic foundations
