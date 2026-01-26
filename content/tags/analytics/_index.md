---
title: "Graph Analytics"
description: "Comprehensive guide to graph analytics in Geode including path analysis, centrality measures, community detection, pattern matching, aggregations, time-series analysis, and real-time analytics for business intelligence."
keywords:
  - graph analytics
  - path analysis
  - centrality measures
  - community detection
  - pattern matching
  - aggregations
  - time-series analysis
  - business intelligence
  - Geode
  - graph database
  - GQL
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/analytics/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Graph Analytics in Geode

Graph analytics transforms connected data into actionable insights by revealing patterns, relationships, and structures invisible in traditional databases. Geode's implementation of the ISO/IEC 39075:2024 GQL standard provides powerful analytical capabilities for path analysis, centrality measurement, community detection, and business intelligence.

## Why Graph Analytics?

Traditional relational databases excel at structured queries but struggle with relationship-heavy analytics. Graph databases like Geode naturally model and query connected data, enabling:

- **Relationship Discovery**: Find hidden connections across multiple hops
- **Pattern Recognition**: Identify recurring structures in complex networks
- **Influence Analysis**: Measure node importance and information flow
- **Community Detection**: Discover clusters and groupings
- **Anomaly Detection**: Spot unusual patterns in connected data

## Core Analytical Capabilities

### Path Analysis

Path queries reveal how nodes connect through relationship chains, essential for network analysis, recommendation systems, and logistics optimization.

#### Shortest Path Queries

Find the most efficient route between two nodes:

```gql
-- Single shortest path
MATCH path = SHORTEST (a:Person {name: 'Alice'})-[:KNOWS*]->(b:Person {name: 'Bob'})
RETURN path, length(path) AS hops;

-- All shortest paths (when multiple exist)
MATCH paths = ALL SHORTEST (a:City {name: 'San Francisco'})
  -[:FLIGHT*]->
  (b:City {name: 'New York'})
RETURN paths,
  [r IN relationships(paths) | r.airline] AS airlines,
  reduce(cost = 0, r IN relationships(paths) | cost + r.price) AS total_cost;
```

#### K-Shortest Paths

Find multiple alternative paths:

```gql
-- Top 3 shortest paths with total distance
MATCH paths = K SHORTEST 3
  (start:Location {id: 'warehouse_1'})
  -[:ROUTE*]->
  (end:Location {id: 'customer_42'})
RETURN paths,
  reduce(dist = 0, r IN relationships(paths) | dist + r.distance) AS total_distance
ORDER BY total_distance;
```

#### Path Filtering

Apply constraints on intermediate nodes or relationships:

```gql
-- Find paths through active accounts only
MATCH path = (sender:Account {id: $from})
  -[:TRANSFER*2..5 (r, n | n.status = 'active' AND r.amount > 1000)]->
  (receiver:Account {id: $to})
WHERE all(r IN relationships(path) WHERE r.timestamp >= DATE '2024-01-01')
RETURN path;
```

### Centrality Measures

Centrality algorithms identify the most important nodes in a graph based on different criteria.

#### Degree Centrality

Count of direct connections:

```gql
-- Find most connected users
MATCH (u:User)
OPTIONAL MATCH (u)-[r:FOLLOWS]-()
RETURN u.id, u.name, count(r) AS connections
ORDER BY connections DESC
LIMIT 20;

-- In-degree vs out-degree
MATCH (u:User)
OPTIONAL MATCH (u)<-[:FOLLOWS]-(followers)
OPTIONAL MATCH (u)-[:FOLLOWS]->(following)
RETURN
  u.name,
  count(DISTINCT followers) AS follower_count,
  count(DISTINCT following) AS following_count,
  count(DISTINCT followers) * 1.0 / nullif(count(DISTINCT following), 0) AS follower_ratio
ORDER BY follower_count DESC;
```

#### Betweenness Centrality

Measures how often a node appears on shortest paths between other nodes (bridge/bottleneck detection):

```gql
-- Identify key intermediaries in network
MATCH (p:Person)
CALL graph.betweenness_centrality(p, 'KNOWS') AS bc
RETURN p.name, bc.score
ORDER BY bc.score DESC
LIMIT 10;
```

#### PageRank and Influence

Recursive importance based on connections from important nodes:

```gql
-- Calculate PageRank scores
MATCH (page:WebPage)
CALL graph.pagerank(page, 'LINKS_TO', {
  iterations: 20,
  damping: 0.85
}) AS pr
RETURN page.url, pr.score
ORDER BY pr.score DESC
LIMIT 50;

-- Social influence ranking
MATCH (u:User)
CALL graph.pagerank(u, 'FOLLOWS') AS influence
WHERE influence.score > 0.01
RETURN u.name, influence.score, u.followers_count
ORDER BY influence.score DESC;
```

### Community Detection

Identify clusters and groupings in your graph.

#### Label Propagation

Fast algorithm for community detection:

```gql
-- Detect communities in social network
MATCH (u:User)
CALL graph.label_propagation(u, 'FOLLOWS', 10) AS community
RETURN community.id, collect(u.name) AS members, count(u) AS size
ORDER BY size DESC;
```

#### Connected Components

Find disconnected subgraphs:

```gql
-- Identify isolated clusters
MATCH (n:Node)
CALL graph.connected_components(n, 'CONNECTS') AS component
RETURN component.id, count(n) AS size, collect(n.id) AS nodes
HAVING size > 1
ORDER BY size DESC;
```

#### Modularity-Based Clustering

```gql
-- High-quality community detection
MATCH (u:User)
CALL graph.louvain(u, 'INTERACTS', {
  levels: 3,
  resolution: 1.0
}) AS cluster
RETURN
  cluster.level,
  cluster.community_id,
  collect(u.name) AS members,
  count(u) AS size
ORDER BY cluster.level, size DESC;
```

### Pattern Matching and Discovery

GQL's powerful pattern matching enables complex analytical queries.

#### Triangle Counting

Measure clustering coefficient:

```gql
-- Find triangles in social network
MATCH (a:Person)-[:KNOWS]->(b:Person)-[:KNOWS]->(c:Person)-[:KNOWS]->(a)
WHERE a.id < b.id AND b.id < c.id  -- Avoid duplicates
RETURN count(*) AS triangle_count;

-- Triangles involving specific user
MATCH (a:Person {name: 'Alice'})-[:KNOWS]->(b)-[:KNOWS]->(c)-[:KNOWS]->(a)
RETURN DISTINCT b.name, c.name;
```

#### Cycle Detection

Find circular dependencies or loops:

```gql
-- Detect circular dependencies in task graph
MATCH path = (t:Task)-[:DEPENDS_ON*2..10]->(t)
RETURN path, length(path) AS cycle_length
ORDER BY cycle_length;
```

#### Motif Discovery

Find specific subgraph patterns:

```gql
-- Find "star" pattern: one person followed by many
MATCH (influencer:Person)<-[:FOLLOWS]-(followers:Person)
WITH influencer, collect(followers) AS follower_list
WHERE size(follower_list) > 100
RETURN influencer.name, size(follower_list) AS follower_count
ORDER BY follower_count DESC;

-- Find "bridge" pattern: users connecting different communities
MATCH (a:Person)-[:KNOWS]->(bridge:Person)-[:KNOWS]->(b:Person)
WHERE a.community_id <> b.community_id
  AND a.community_id <> bridge.community_id
  AND b.community_id <> bridge.community_id
RETURN bridge.name, count(DISTINCT a.community_id) AS communities_bridged
ORDER BY communities_bridged DESC;
```

## Aggregations and Statistics

### Basic Aggregations

```gql
-- Sales analytics
MATCH (p:Product)<-[:PURCHASED]-(u:User)
RETURN
  p.category,
  count(u) AS total_purchases,
  count(DISTINCT u) AS unique_customers,
  avg(p.price) AS avg_price,
  sum(p.price) AS total_revenue
GROUP BY p.category
ORDER BY total_revenue DESC;
```

### Statistical Functions

```gql
-- Price distribution analysis
MATCH (p:Product)
WHERE p.category = 'Electronics'
RETURN
  p.subcategory,
  count(*) AS product_count,
  avg(p.price) AS mean_price,
  stddev(p.price) AS price_stddev,
  percentile(p.price, 0.25) AS q1_price,
  percentile(p.price, 0.50) AS median_price,
  percentile(p.price, 0.75) AS q3_price,
  percentile(p.price, 0.95) AS p95_price,
  min(p.price) AS min_price,
  max(p.price) AS max_price
GROUP BY p.subcategory;
```

### Window Functions

```gql
-- Rank products within categories
MATCH (p:Product)
RETURN
  p.category,
  p.name,
  p.sales,
  rank() OVER (PARTITION BY p.category ORDER BY p.sales DESC) AS rank_in_category,
  p.sales - avg(p.sales) OVER (PARTITION BY p.category) AS deviation_from_avg
ORDER BY p.category, rank_in_category;
```

## Time-Series Analytics

Geode's temporal support enables time-based graph analysis.

### Temporal Aggregations

```gql
-- Sales trends over time
MATCH (s:Sale)
WHERE s.timestamp >= DATE '2024-01-01'
RETURN
  date_trunc('month', s.timestamp) AS month,
  count(*) AS sale_count,
  sum(s.amount) AS revenue,
  avg(s.amount) AS avg_order_value
GROUP BY month
ORDER BY month;
```

### Temporal Pattern Analysis

```gql
-- User activity patterns by day of week
MATCH (u:User)-[:LOGGED_IN]->(session:Session)
RETURN
  extract(dow from session.timestamp) AS day_of_week,
  extract(hour from session.timestamp) AS hour,
  count(*) AS session_count
GROUP BY day_of_week, hour
ORDER BY day_of_week, hour;
```

### Change Detection

```gql
-- Identify sudden spikes in activity
WITH
  DATE '2024-01-01' AS start_date,
  DATE '2024-12-31' AS end_date
MATCH (e:Event)
WHERE e.timestamp >= start_date AND e.timestamp <= end_date
WITH
  date_trunc('day', e.timestamp) AS day,
  count(*) AS daily_count
WITH
  day,
  daily_count,
  avg(daily_count) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg
WHERE daily_count > moving_avg * 2  -- Spike: 2x the moving average
RETURN day, daily_count, moving_avg
ORDER BY day;
```

## Real-Time Analytics

### Streaming Aggregations

```gql
-- Recent activity dashboard (last 15 minutes)
MATCH (u:User)-[:ACTION]->(a:Action)
WHERE a.timestamp >= CURRENT_TIMESTAMP - DURATION 'PT15M'
RETURN
  a.type,
  count(*) AS action_count,
  count(DISTINCT u) AS unique_users,
  max(a.timestamp) AS last_occurrence
GROUP BY a.type
ORDER BY action_count DESC;
```

### Live Monitoring

```gql
-- Active sessions right now
MATCH (u:User)-[:HAS_SESSION]->(s:Session)
WHERE s.started <= CURRENT_TIMESTAMP
  AND (s.ended IS NULL OR s.ended >= CURRENT_TIMESTAMP)
RETURN count(DISTINCT u) AS active_users, count(s) AS active_sessions;
```

## Business Intelligence Use Cases

### Customer Analytics

#### Customer Segmentation

```gql
-- RFM analysis (Recency, Frequency, Monetary)
MATCH (c:Customer)-[:MADE]->(o:Order)
WITH c,
  max(o.date) AS last_order_date,
  count(o) AS order_count,
  sum(o.total) AS total_spent
RETURN
  c.id,
  c.name,
  CURRENT_DATE - last_order_date AS days_since_last_order,
  order_count,
  total_spent,
  CASE
    WHEN days_since_last_order <= 30 AND total_spent > 1000 THEN 'VIP'
    WHEN days_since_last_order <= 90 AND order_count > 5 THEN 'Loyal'
    WHEN days_since_last_order > 180 THEN 'At Risk'
    ELSE 'Regular'
  END AS segment
ORDER BY total_spent DESC;
```

#### Customer Lifetime Value

```gql
-- Calculate CLV projection
MATCH (c:Customer)-[:MADE]->(o:Order)
WITH c,
  count(o) AS order_count,
  sum(o.total) AS total_spent,
  avg(o.total) AS avg_order_value,
  min(o.date) AS first_order,
  max(o.date) AS last_order
WITH c, order_count, total_spent, avg_order_value,
  (last_order - first_order) AS customer_age_days,
  (order_count * 1.0 / nullif((last_order - first_order), 0)) AS orders_per_day
RETURN
  c.id,
  total_spent AS historical_value,
  avg_order_value * orders_per_day * 365 AS projected_annual_value,
  total_spent + (avg_order_value * orders_per_day * 365 * 3) AS projected_3yr_ltv
ORDER BY projected_3yr_ltv DESC
LIMIT 100;
```

### Recommendation Analytics

#### Collaborative Filtering

```gql
-- Find similar users based on purchase behavior
MATCH (u1:User {id: $user_id})-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(u2:User)
WHERE u1 <> u2
WITH u2, count(DISTINCT p) AS common_products
ORDER BY common_products DESC
LIMIT 10
MATCH (u2)-[:PURCHASED]->(recommended:Product)
WHERE NOT EXISTS {
  MATCH (u1)-[:PURCHASED]->(recommended)
}
RETURN
  recommended.name,
  count(u2) AS recommended_by,
  avg(recommended.rating) AS avg_rating
GROUP BY recommended.name
ORDER BY recommended_by DESC, avg_rating DESC
LIMIT 20;
```

#### Content-Based Recommendations

```gql
-- Recommend similar products
MATCH (p:Product {id: $product_id})
MATCH (similar:Product)
WHERE similar <> p
  AND similar.category = p.category
  AND abs(similar.price - p.price) < 50
OPTIONAL MATCH (similar)<-[:PURCHASED]-(u:User)-[:PURCHASED]->(p)
RETURN
  similar.name,
  similar.price,
  count(u) AS also_bought_count,
  similar.rating
ORDER BY also_bought_count DESC, similar.rating DESC
LIMIT 10;
```

### Fraud Detection

```gql
-- Detect suspicious transaction patterns
MATCH (a1:Account)-[t1:TRANSFER]->(a2:Account)-[t2:TRANSFER]->(a3:Account)
WHERE t1.timestamp >= CURRENT_TIMESTAMP - DURATION 'PT1H'
  AND t2.timestamp > t1.timestamp
  AND t2.timestamp <= t1.timestamp + DURATION 'PT5M'
  AND t1.amount > 10000
  AND t2.amount >= t1.amount * 0.9
RETURN
  a1.id AS source,
  a2.id AS intermediary,
  a3.id AS destination,
  t1.amount AS initial_amount,
  t2.amount AS transfer_amount,
  t2.timestamp - t1.timestamp AS time_diff
ORDER BY initial_amount DESC;
```

### Supply Chain Analytics

```gql
-- Analyze supply chain dependencies
MATCH path = (supplier:Company {type: 'supplier'})
  -[:SUPPLIES*]->
  (manufacturer:Company {type: 'manufacturer'})
  -[:SHIPS_TO]->
  (distributor:Company {type: 'distributor'})
RETURN
  supplier.name,
  manufacturer.name,
  distributor.name,
  length(path) AS supply_chain_length,
  reduce(time = 0, r IN relationships(path) | time + r.lead_time_days) AS total_lead_time
ORDER BY total_lead_time DESC;
```

## Performance Optimization for Analytics

### Index Strategy

```gql
-- Create indexes for analytical queries
CREATE INDEX user_timestamp ON User(last_active);
CREATE INDEX product_category_price ON Product(category, price);
CREATE INDEX order_customer_date ON Order(customer_id, order_date);
```

### Query Profiling

```gql
-- Profile analytical query
PROFILE
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE p.category = 'Electronics'
  AND u.country = 'USA'
RETURN
  p.subcategory,
  count(u) AS customers,
  sum(p.price) AS revenue
GROUP BY p.subcategory;
```

### Materialized Views

```gql
-- Pre-compute expensive analytics
CREATE MATERIALIZED VIEW daily_sales_summary AS
  MATCH (o:Order)
  WHERE o.date >= CURRENT_DATE - DURATION 'P90D'
  RETURN
    date_trunc('day', o.date) AS day,
    o.region,
    count(*) AS order_count,
    sum(o.total) AS revenue,
    avg(o.total) AS avg_order_value
  GROUP BY day, o.region;

-- Use materialized view
MATCH (s:daily_sales_summary)
WHERE s.region = 'West' AND s.day >= DATE '2024-01-01'
RETURN s.day, s.revenue
ORDER BY s.day;
```

## Comparison with Other Analytics Platforms

### vs. Traditional OLAP

- **Relationship Analysis**: Geode excels at multi-hop queries; OLAP struggles with joins
- **Real-Time**: Geode supports real-time analytics; OLAP typically batch-oriented
- **Schema**: Graph schema more flexible than star/snowflake schemas

### vs. Spark GraphX

- **Query Language**: GQL (declarative) vs. Scala/Python (procedural)
- **Latency**: Geode optimized for low-latency queries; Spark for batch processing
- **Integration**: Geode native graph DB; Spark requires data loading

### vs. Neo4j

- **Standards**: Geode GQL standard; Neo4j proprietary Cypher
- **Performance**: Similar for most analytics; Geode faster for distributed workloads
- **Built-in Algorithms**: Both support graph algorithms; different implementations

## Best Practices

1. **Index Frequently Filtered Properties**: Speed up WHERE clauses
2. **Use LIMIT**: Prevent excessive memory use in analytical queries
3. **Profile Before Optimizing**: Identify actual bottlenecks
4. **Materialize Expensive Queries**: Cache common analytics
5. **Batch Where Possible**: Process historical analytics in batches
6. **Monitor Resource Usage**: Graph analytics can be memory-intensive

## Getting Started

```gql
-- Import sample dataset
CALL graph.load_sample('analytics_demo');

-- Run basic analytics
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN p.category, count(u) AS customers
ORDER BY customers DESC;

-- Try path analysis
MATCH path = SHORTEST (a:User)-[:KNOWS*]-(b:User)
WHERE a.name = 'Alice' AND b.name = 'Bob'
RETURN path;
```

Explore the documentation below for detailed guides on specific analytical techniques, optimization strategies, and industry-specific use cases.
