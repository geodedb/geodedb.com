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
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;

-- Query materialized view (fast!)
SELECT * FROM user_stats
WHERE post_count > 100
ORDER BY like_count DESC
LIMIT 10;
```

### With Indexes for Performance

```gql
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;

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
-- There is no materialized view to refresh or drop. Re-run the
-- precompute batch above to update the stored aggregate.

-- Concurrent refresh (non-blocking, allows queries during refresh)
-- There is no materialized view to refresh or drop. Re-run the
-- precompute batch above to update the stored aggregate.

-- Check last refresh time
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword and there is no view catalog to query.
```

### Automatic Scheduled Refresh

Configure automatic refresh schedules:

```gql
-- Refresh daily at 1 AM
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;  -- Cron syntax

-- Refresh every hour
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;  -- Every hour on the hour
```

### Incremental Refresh

Update only changed data for efficiency:

```gql
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;

-- Incremental refresh only updates changed products
-- There is no materialized view to refresh or drop. Re-run the
-- precompute batch above to update the stored aggregate.
```

### Refresh on Write (Eager Materialization)

Automatically refresh when source data changes:

```gql
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;

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
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;  -- 5 minutes past each hour

-- Daily rollup (aggregates hourly data)
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;  -- 2 AM daily

-- Monthly rollup (aggregates daily data)
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;  -- 3 AM on 1st of month
```

### Customer Segmentation

```gql
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;    -- Segment classification
    CASE
        WHEN SUM(o.total) > 10000 AND (datetime( - MAX(o.created_at)) /* Duration; no DATEDIFF(): store epoch millis to get an integer */) < 90
            THEN 'vip_active'
        WHEN SUM(o.total) > 10000 AND (datetime( - MAX(o.created_at)) /* Duration; no DATEDIFF(): store epoch millis to get an integer */) >= 90
            THEN 'vip_at_risk'
        WHEN SUM(o.total) > 1000 AND (datetime( - MAX(o.created_at)) /* Duration; no DATEDIFF(): store epoch millis to get an integer */) < 180
            THEN 'loyal'
        WHEN (datetime( - MAX(o.created_at)) /* Duration; no DATEDIFF(): store epoch millis to get an integer */) >= 365
            THEN 'churned'
        WHEN COUNT(DISTINCT o.id) = 1
            THEN 'one_time'
        ELSE 'regular'
    END AS segment,

    -- RFM score (Recency, Frequency, Monetary)
    NTILE(5) DESC) AS recency_score,
    NTILE(5)) AS frequency_score,
    NTILE(5)) AS monetary_score

FROM Customer c
LEFT JOIN Order o ON c.id = o.customer_id
WHERE o.status = 'completed'
GROUP BY c.id, c.name, c.email
WITH REFRESH SCHEDULE '0 0 * * 0';  -- Weekly on Sunday midnight
```

### Product Performance Dashboard

```gql
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;    -- Sales metrics
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
    (MAX(o.created_at - MIN(o.created_at)) /* Duration; no DATEDIFF(): store epoch millis to get an integer */) AS days_on_market,

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
-- Materialized views are not reachable from GQL; there is no view catalog.
```

### Partitioning Large Views

```gql
-- Partition by date for better refresh performance
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;

-- Refresh only recent partitions
-- There is no materialized view to refresh or drop. Re-run the
-- precompute batch above to update the stored aggregate.
```

### Cascading Refreshes

```gql
-- Create dependency chain for efficient updates
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;

-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;  -- Automatically refresh after base
```

## Monitoring and Maintenance

### View Health Monitoring

```gql
-- Check view freshness
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword and there is no view catalog to query.

-- Identify stale views
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword and there is no view catalog to query.  -- Should auto-refresh
```

### Refresh Performance

```gql
-- Analyze refresh performance
-- Materialized views are not reachable from GQL; there is no refresh history.
```

### Storage Management

```gql
-- Identify large views
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword and there is no view catalog to query.

-- Drop unused views
-- There is no materialized view to refresh or drop. Re-run the
-- precompute batch above to update the stored aggregate.
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
-- There is no materialized view to refresh or drop. Re-run the
-- precompute batch above to update the stored aggregate.

-- Partition large views
-- There is no materialized view to refresh or drop. Re-run the
-- precompute batch above to update the stored aggregate.
```

### Out-of-Sync Data

```gql
-- Force full refresh
-- There is no materialized view to refresh or drop. Re-run the
-- precompute batch above to update the stored aggregate.

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
