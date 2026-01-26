---
title: "Real-Time Analytics"
description: "Perform real-time graph analytics with Geode's streaming aggregations, temporal queries, and incremental computation. Build live dashboards, detect trends, and monitor metrics as data arrives."
keywords:
  - real-time analytics
  - streaming analytics
  - live dashboards
  - temporal queries
  - incremental computation
  - metrics
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/real-time-analytics/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Real-time analytics in Geode enables instant insights from graph data through streaming aggregations, temporal queries, and incremental computation. Build live dashboards, detect trends, and monitor business metrics with millisecond-latency queries on continuously evolving data.

## What Are Real-Time Graph Analytics?

Real-time graph analytics processes graph data as it arrives, computing aggregations, detecting patterns, and updating metrics without batch processing delays. Geode achieves this through:

- Streaming aggregations over time windows
- Incremental materialized views
- Temporal queries for trend analysis
- Change data capture for event processing
- Efficient concurrent query execution

## Streaming Aggregations

### Time Window Queries

Compute metrics over sliding time windows:

```gql
// Events in last 5 minutes
MATCH (e:Event)
WHERE e.timestamp > datetime().minusMinutes(5)
RETURN COUNT(e) AS recent_events,
       COUNT(DISTINCT e.user_id) AS active_users;

// Rolling hourly metrics for last 24 hours
MATCH (e:Event)
WHERE e.timestamp > datetime().minusHours(24)
WITH date.truncate('hour', e.timestamp) AS hour,
     COUNT(e) AS event_count,
     COUNT(DISTINCT e.user_id) AS unique_users
ORDER BY hour DESC
RETURN hour, event_count, unique_users;

// Minute-by-minute breakdown for real-time monitoring
MATCH (t:Transaction)
WHERE t.timestamp > datetime().minusMinutes(15)
WITH date.truncate('minute', t.timestamp) AS minute,
     COUNT(t) AS tx_count,
     SUM(t.amount) AS total_amount,
     AVG(t.amount) AS avg_amount
ORDER BY minute ASC
RETURN minute, tx_count, total_amount, avg_amount;
```

### Cumulative Aggregations

Track running totals and cumulative metrics:

```gql
// Daily cumulative revenue
MATCH (t:Transaction)
WHERE t.timestamp > datetime().minusDays(30)
WITH date.truncate('day', t.timestamp) AS day,
     SUM(t.amount) AS daily_revenue
ORDER BY day ASC
WITH day, daily_revenue,
     SUM(daily_revenue) OVER (ORDER BY day) AS cumulative_revenue
RETURN day, daily_revenue, cumulative_revenue;

// Running user count over time
MATCH (u:User)
WITH date.truncate('day', u.created_at) AS day, COUNT(u) AS new_users
ORDER BY day ASC
WITH day, new_users,
     SUM(new_users) OVER (ORDER BY day) AS total_users
RETURN day, new_users, total_users;
```

## Live Dashboard Queries

### Key Performance Indicators

Real-time KPI tracking for dashboards:

```gql
// Real-time business metrics
MATCH (t:Transaction)
WHERE t.timestamp > datetime().minusHours(1)
WITH COUNT(t) AS last_hour_tx,
     SUM(t.amount) AS last_hour_revenue,
     AVG(t.amount) AS avg_transaction_value,
     COUNT(DISTINCT t.user_id) AS active_buyers

MATCH (u:User)
WHERE u.created_at > datetime().minusHours(1)
WITH last_hour_tx, last_hour_revenue, avg_transaction_value, active_buyers,
     COUNT(u) AS new_users

MATCH (p:Product)-[:PURCHASED]->()
WHERE p.stock_quantity < 10
WITH last_hour_tx, last_hour_revenue, avg_transaction_value, active_buyers, new_users,
     COUNT(p) AS low_stock_products

RETURN {
  transactions_last_hour: last_hour_tx,
  revenue_last_hour: last_hour_revenue,
  avg_transaction_value: avg_transaction_value,
  active_buyers: active_buyers,
  new_users_last_hour: new_users,
  low_stock_alerts: low_stock_products
} AS dashboard_metrics;
```

### Top-N Real-Time Rankings

Track trending items and top performers:

```gql
// Trending products (last hour)
MATCH (p:Product)<-[purchase:PURCHASED]-()
WHERE purchase.timestamp > datetime().minusHours(1)
WITH p,
     COUNT(purchase) AS purchase_count,
     SUM(purchase.amount) AS revenue,
     COUNT(DISTINCT purchase.user_id) AS unique_buyers
ORDER BY purchase_count DESC
LIMIT 10
RETURN p.product_id,
       p.name,
       purchase_count,
       revenue,
       unique_buyers;

// Most active users (last 24 hours)
MATCH (u:User)-[activity:PERFORMED|PURCHASED|VIEWED]->()
WHERE activity.timestamp > datetime().minusHours(24)
WITH u,
     COUNT(activity) AS activity_count,
     SIZE([a IN COLLECT(activity) WHERE type(a) = 'PURCHASED']) AS purchases,
     SIZE([a IN COLLECT(activity) WHERE type(a) = 'VIEWED']) AS views
ORDER BY activity_count DESC
LIMIT 20
RETURN u.user_id,
       u.name,
       activity_count,
       purchases,
       views;
```

## Trend Detection

### Growth Rate Analysis

Detect accelerating or declining trends:

```gql
// Compare current week to previous week
MATCH (e:Event)
WHERE e.timestamp > datetime().minusDays(14)
WITH CASE
       WHEN e.timestamp > datetime().minusDays(7) THEN 'current_week'
       ELSE 'previous_week'
     END AS period,
     COUNT(e) AS event_count
WITH MAX(CASE WHEN period = 'current_week' THEN event_count ELSE 0 END) AS current,
     MAX(CASE WHEN period = 'previous_week' THEN event_count ELSE 0 END) AS previous
RETURN current,
       previous,
       ((current - previous) * 100.0 / previous) AS growth_rate_pct;

// Hourly growth compared to same hour yesterday
WITH datetime().hour AS current_hour
MATCH (e_today:Event)
WHERE e_today.timestamp > datetime().minusHours(1)
WITH current_hour, COUNT(e_today) AS today_count

MATCH (e_yesterday:Event)
WHERE e_yesterday.timestamp > datetime().minusHours(25)
  AND e_yesterday.timestamp < datetime().minusHours(24)
  AND e_yesterday.timestamp.hour = current_hour
WITH today_count, COUNT(e_yesterday) AS yesterday_count
RETURN today_count,
       yesterday_count,
       ((today_count - yesterday_count) * 100.0 / yesterday_count) AS change_pct;
```

### Anomaly Detection in Real-Time

Identify unusual spikes or drops:

```gql
// Detect transaction volume anomalies
MATCH (t:Transaction)
WHERE t.timestamp > datetime().minusHours(24)
WITH date.truncate('hour', t.timestamp) AS hour,
     COUNT(t) AS hourly_count
WITH AVG(hourly_count) AS avg_count,
     STDDEV(hourly_count) AS stddev_count,
     COLLECT({hour: hour, count: hourly_count}) AS hourly_data
UNWIND hourly_data AS data
WITH data.hour AS hour,
     data.count AS count,
     avg_count,
     stddev_count,
     (data.count - avg_count) / stddev_count AS z_score
WHERE ABS(z_score) > 2  // More than 2 standard deviations
RETURN hour,
       count,
       avg_count,
       z_score,
       CASE
         WHEN z_score > 2 THEN 'spike'
         WHEN z_score < -2 THEN 'drop'
       END AS anomaly_type
ORDER BY ABS(z_score) DESC;
```

## Incremental Materialized Views

### Pre-Computed Aggregations

Maintain real-time summary tables:

```gql
// Create materialized view for user statistics
CREATE MATERIALIZED VIEW user_activity_stats AS
SELECT u.user_id,
       COUNT(DISTINCT e) AS total_events,
       COUNT(DISTINCT p) AS total_purchases,
       SUM(p.amount) AS lifetime_value,
       MAX(e.timestamp) AS last_activity,
       MIN(e.timestamp) AS first_activity
FROM (u:User)
LEFT JOIN (u)-[e:PERFORMED]->()
LEFT JOIN (u)-[p:PURCHASED]->()
GROUP BY u.user_id;

// Query materialized view (fast, pre-computed)
MATCH (stats:user_activity_stats {user_id: $user_id})
RETURN stats.total_events,
       stats.total_purchases,
       stats.lifetime_value,
       stats.last_activity;

// View is automatically updated when new events arrive
INSERT (u:User {user_id: 'user_123'})
INSERT (e:Event {event_id: 'evt_456'})
INSERT (u)-[:PERFORMED {timestamp: datetime()}]->(e);
// user_activity_stats for user_123 immediately reflects the new event
```

### Category Aggregations

Real-time category performance metrics:

```gql
// Materialized category statistics
CREATE MATERIALIZED VIEW category_metrics AS
SELECT c.category_id,
       c.name AS category_name,
       COUNT(DISTINCT p) AS product_count,
       COUNT(DISTINCT purchase) AS total_purchases,
       SUM(purchase.amount) AS total_revenue,
       AVG(purchase.amount) AS avg_sale_price
FROM (c:Category)
LEFT JOIN (c)<-[:IN_CATEGORY]-(p:Product)
LEFT JOIN (p)<-[purchase:PURCHASED]-()
WHERE purchase.timestamp > datetime().minusDays(7)
GROUP BY c.category_id, c.name;

// Fast category performance queries
MATCH (cm:category_metrics)
ORDER BY cm.total_revenue DESC
LIMIT 10
RETURN cm.category_name,
       cm.product_count,
       cm.total_purchases,
       cm.total_revenue,
       cm.avg_sale_price;
```

## Temporal Pattern Analysis

### Session Analytics

Analyze user sessions in real-time:

```gql
// Current active sessions
MATCH (u:User)-[:PERFORMED]->(e:Event)
WHERE e.timestamp > datetime().minusMinutes(30)
WITH u, MAX(e.timestamp) AS last_activity
WHERE duration.between(last_activity, datetime()).minutes < 5  // Active in last 5 min
RETURN COUNT(DISTINCT u) AS active_users_now;

// Session duration distribution
MATCH (u:User)-[:PERFORMED]->(e:Event)
WHERE e.timestamp > datetime().minusHours(24)
WITH u,
     MIN(e.timestamp) AS session_start,
     MAX(e.timestamp) AS session_end,
     COUNT(e) AS event_count
WITH duration.between(session_start, session_end).minutes AS session_duration_min
WITH CASE
       WHEN session_duration_min < 1 THEN '0-1 min'
       WHEN session_duration_min < 5 THEN '1-5 min'
       WHEN session_duration_min < 15 THEN '5-15 min'
       WHEN session_duration_min < 30 THEN '15-30 min'
       ELSE '30+ min'
     END AS duration_bucket,
     COUNT(*) AS session_count
RETURN duration_bucket, session_count
ORDER BY duration_bucket;
```

### Conversion Funnels

Track real-time conversion rates:

```gql
// E-commerce funnel (last hour)
MATCH (view:Event {event_type: 'page_view'})
WHERE view.timestamp > datetime().minusHours(1)
  AND view.page_type = 'product'
WITH COUNT(DISTINCT view.user_id) AS viewed_users

MATCH (cart:Event {event_type: 'add_to_cart'})
WHERE cart.timestamp > datetime().minusHours(1)
WITH viewed_users, COUNT(DISTINCT cart.user_id) AS cart_users

MATCH (purchase:Transaction)
WHERE purchase.timestamp > datetime().minusHours(1)
WITH viewed_users, cart_users, COUNT(DISTINCT purchase.user_id) AS purchased_users

RETURN {
  step: 'viewed',
  users: viewed_users,
  conversion_rate: 100.0
} AS funnel_step
UNION ALL
RETURN {
  step: 'added_to_cart',
  users: cart_users,
  conversion_rate: (cart_users * 100.0 / viewed_users)
} AS funnel_step
UNION ALL
RETURN {
  step: 'purchased',
  users: purchased_users,
  conversion_rate: (purchased_users * 100.0 / cart_users)
} AS funnel_step;
```

## Geolocation Analytics

### Regional Performance

Real-time metrics by region:

```gql
// Sales by region (last 24 hours)
MATCH (t:Transaction)-[:FROM_USER]->(u:User)
WHERE t.timestamp > datetime().minusHours(24)
WITH u.country AS country,
     COUNT(t) AS transaction_count,
     SUM(t.amount) AS revenue,
     AVG(t.amount) AS avg_order_value,
     COUNT(DISTINCT u) AS unique_customers
ORDER BY revenue DESC
RETURN country,
       transaction_count,
       revenue,
       avg_order_value,
       unique_customers;

// Active users by city (current hour)
MATCH (u:User)-[:PERFORMED]->(e:Event)
WHERE e.timestamp > datetime().minusHours(1)
WITH u.city AS city,
     COUNT(DISTINCT u) AS active_users,
     COUNT(e) AS total_events
ORDER BY active_users DESC
LIMIT 20
RETURN city, active_users, total_events;
```

## Cohort Analysis

### Retention Tracking

Real-time cohort retention metrics:

```gql
// Weekly cohort retention
MATCH (u:User)
WHERE u.created_at > datetime().minusDays(90)
WITH date.truncate('week', u.created_at) AS cohort_week, u
WITH cohort_week, COLLECT(u) AS cohort_users

// Check activity in each subsequent week
MATCH (cu:User)-[:PERFORMED]->(e:Event)
WHERE cu IN cohort_users
WITH cohort_week,
     SIZE(cohort_users) AS cohort_size,
     date.truncate('week', e.timestamp) AS activity_week,
     COUNT(DISTINCT cu) AS active_users
WITH cohort_week,
     cohort_size,
     duration.between(cohort_week, activity_week).weeks AS weeks_since_join,
     active_users
WHERE weeks_since_join >= 0
RETURN cohort_week,
       cohort_size,
       weeks_since_join,
       active_users,
       (active_users * 100.0 / cohort_size) AS retention_rate
ORDER BY cohort_week, weeks_since_join;
```

## Performance Optimization

### Query Caching

Cache frequently accessed analytics:

```gql
// Cache dashboard query results (application layer)
CREATE CACHED QUERY dashboard_summary
REFRESH EVERY 30 SECONDS
AS
MATCH (t:Transaction)
WHERE t.timestamp > datetime().minusHours(24)
RETURN COUNT(t) AS tx_24h,
       SUM(t.amount) AS revenue_24h,
       AVG(t.amount) AS avg_tx_value;

// Subsequent calls return cached results (sub-millisecond)
GET CACHED QUERY dashboard_summary;
```

### Approximate Aggregations

Use sampling for faster approximate results:

```gql
// Sample 10% of data for faster estimates
MATCH (e:Event)
WHERE e.timestamp > datetime().minusDays(30)
  AND rand() < 0.1  // 10% sample
WITH COUNT(e) AS sampled_count,
     COUNT(DISTINCT e.user_id) AS sampled_users
RETURN sampled_count * 10 AS estimated_total_events,
       sampled_users * 10 AS estimated_unique_users;
```

## Integration with Streaming Platforms

### Kafka Integration

Process streaming events from Kafka:

```python
# Python consumer example
from geode_client import Client
from kafka import KafkaConsumer
import json

client = Client("geodedb://localhost:3141")
consumer = KafkaConsumer(
    'user-events',
    bootstrap_servers=['localhost:9092'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    event = message.value

    # Insert event into Geode in real-time
    client.execute("""
        MERGE (u:User {user_id: $user_id})
        CREATE (e:Event {
          event_id: $event_id,
          event_type: $event_type,
          timestamp: $timestamp
        })
        CREATE (u)-[:PERFORMED]->(e)
    """, {
        'user_id': event['user_id'],
        'event_id': event['event_id'],
        'event_type': event['event_type'],
        'timestamp': event['timestamp']
    })
```

## Best Practices

1. **Use Time Windows**: Limit analytical queries to recent time ranges for better performance
2. **Materialize Common Aggregations**: Pre-compute frequently accessed metrics
3. **Index Temporal Properties**: Ensure timestamp fields are indexed for fast filtering
4. **Batch Small Updates**: Group related updates into transactions for better throughput
5. **Sample Large Datasets**: Use sampling for approximate results on massive datasets
6. **Cache Dashboard Queries**: Cache results for 30-60 seconds for high-traffic dashboards
7. **Partition by Time**: Organize data by time periods for efficient pruning
8. **Monitor Query Performance**: Track slow queries and optimize hot paths
9. **Use Prepared Statements**: Reduce parsing overhead for repeated analytics queries
10. **Leverage CDC**: Use change streams for event-driven analytics pipelines

## Integration with Geode Features

Real-time analytics leverages:

- **MVCC**: Non-blocking concurrent reads for consistent analytics
- **Indexes**: Fast temporal filtering with indexed timestamp fields
- **Materialized Views**: Incrementally maintained aggregations
- **CDC**: Change data capture for event streaming
- **Telemetry**: Real-time performance metrics via Prometheus
- **QUIC Protocol**: Low-latency query execution

Browse the tagged content below to discover documentation, tutorials, and guides for building real-time analytics applications with Geode.
