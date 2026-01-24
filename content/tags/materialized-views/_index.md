---
title: "Materialized Views"
description: "Pre-computed, cached query results for improved read performance in Geode graph database"
keywords: ["materialized views", "cached queries", "query optimization", "pre-computed results", "view refresh", "incremental update", "OLAP", "analytics"]
weight: 10
---

# Materialized Views

Materialized views are pre-computed query results that are stored and maintained for fast retrieval. Unlike regular views that execute queries on-demand, materialized views cache results, dramatically improving read performance for complex analytical queries.

## Understanding Materialized Views

### What are Materialized Views?

Materialized views store query results as physical data:

**Pre-Computed** - Results calculated ahead of time
**Stored** - Persisted to disk like tables
**Indexed** - Can have indexes for fast lookups
**Refreshable** - Updated when source data changes

### Benefits

- **Performance** - Orders of magnitude faster than recomputing
- **Consistency** - Snapshot of data at specific time
- **Simplicity** - Complex queries appear as simple tables
- **Resource Efficiency** - Reduce computational load

## Creating Materialized Views

### Basic Syntax

```gql
-- Create materialized view
CREATE MATERIALIZED VIEW user_stats AS
SELECT
    u.id,
    u.name,
    COUNT(p.id) AS post_count,
    COUNT(c.id) AS comment_count,
    MAX(p.created_at) AS last_post_date
FROM Person u
LEFT JOIN Post p ON u.id = p.author_id
LEFT JOIN Comment c ON u.id = c.author_id
GROUP BY u.id, u.name;

-- Query materialized view
SELECT * FROM user_stats
WHERE post_count > 100
ORDER BY last_post_date DESC;
```

### With Indexes

Add indexes for fast lookups:

```gql
CREATE MATERIALIZED VIEW popular_posts AS
SELECT
    p.id,
    p.title,
    COUNT(DISTINCT l.user_id) AS like_count,
    COUNT(DISTINCT c.id) AS comment_count,
    (COUNT(DISTINCT l.user_id) + COUNT(DISTINCT c.id) * 2) AS popularity_score
FROM Post p
LEFT JOIN Like l ON p.id = l.post_id
LEFT JOIN Comment c ON p.id = c.post_id
GROUP BY p.id, p.title;

CREATE INDEX idx_popularity ON popular_posts(popularity_score DESC);
CREATE INDEX idx_post_id ON popular_posts(id);
```

## Refresh Strategies

### Manual Refresh

Explicitly refresh the view:

```gql
-- Full refresh
REFRESH MATERIALIZED VIEW user_stats;

-- Concurrent refresh (non-blocking)
REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
```

### Automatic Refresh

Configure automatic refresh:

```gql
CREATE MATERIALIZED VIEW daily_revenue AS
SELECT
    DATE(created_at) AS date,
    SUM(amount) AS total_revenue,
    COUNT(*) AS order_count,
    AVG(amount) AS avg_order_value
FROM Orders
GROUP BY DATE(created_at)
WITH REFRESH SCHEDULE '0 1 * * *';  -- Daily at 1 AM
```

### Incremental Refresh

Update only changed data:

```gql
CREATE MATERIALIZED VIEW product_inventory
WITH INCREMENTAL REFRESH AS
SELECT
    p.id,
    p.name,
    p.stock_quantity,
    COALESCE(SUM(oi.quantity), 0) AS reserved_quantity,
    p.stock_quantity - COALESCE(SUM(oi.quantity), 0) AS available_quantity
FROM Product p
LEFT JOIN OrderItem oi ON p.id = oi.product_id AND oi.order_status = 'pending'
GROUP BY p.id, p.name, p.stock_quantity;
```

## Advanced Patterns

### Hierarchical Aggregation

Build rollup hierarchies:

```gql
-- Daily metrics
CREATE MATERIALIZED VIEW daily_metrics AS
SELECT
    DATE(timestamp) AS date,
    metric_name,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value
FROM metrics
GROUP BY DATE(timestamp), metric_name;

-- Monthly rollup
CREATE MATERIALIZED VIEW monthly_metrics AS
SELECT
    DATE_TRUNC('month', date) AS month,
    metric_name,
    AVG(avg_value) AS avg_value,
    MIN(min_value) AS min_value,
    MAX(max_value) AS max_value
FROM daily_metrics
GROUP BY DATE_TRUNC('month', date), metric_name;
```

## Best Practices

### When to Use
- Complex aggregations
- Frequently accessed reports
- Data warehouse queries
- Dashboard metrics
- Historical snapshots

### Design Considerations
- Balance freshness vs performance
- Choose appropriate refresh strategy
- Add indexes for query patterns
- Monitor storage requirements
- Consider incremental refresh

## Related Topics

- [Indexes](/tags/indexes) - Query optimization with indexes
- [Performance](/tags/performance) - Performance tuning
- [Caching](/tags/caching) - Data caching strategies

## Learn More

- [Materialized Views (PostgreSQL)](https://www.postgresql.org/docs/current/rules-materializedviews.html)
- [Data Warehouse Design](https://www.kimballgroup.com/)
