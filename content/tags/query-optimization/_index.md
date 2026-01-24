---
title: "Tag: Query Optimization"
description: "Master query optimization in Geode. Learn execution plan analysis, index strategies, performance tuning techniques, and best practices for achieving maximum query efficiency in production graph workloads."
keywords:
  - query optimization
  - Geode performance
  - graph database tuning
  - execution plans
  - query analysis
  - EXPLAIN plans
  - index optimization
  - query rewriting
  - performance tuning
  - graph traversal optimization
  - pattern matching efficiency
  - cost-based optimization
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/query-optimization/"
    noindex: false
---

Documentation tagged with **query-optimization** in the Geode graph database. This comprehensive collection covers query performance analysis, optimization techniques, execution plan understanding, and strategies for achieving maximum efficiency in your GQL queries.

## Overview

Query optimization is critical for building high-performance graph applications. Geode provides powerful tools for analyzing and optimizing query execution, including the EXPLAIN command for execution plan analysis, the PROFILE command for runtime performance metrics, and advanced index strategies for accelerating pattern matching and traversals.

Understanding query optimization helps you:

- **Analyze Query Performance**: Use EXPLAIN to understand execution strategies
- **Optimize Index Usage**: Design indexes that accelerate critical access patterns
- **Reduce Execution Time**: Apply optimization techniques to slow queries
- **Scale to Production**: Ensure consistent performance under load
- **Debug Performance Issues**: Identify and resolve bottlenecks systematically

## Core Concepts

### Execution Plan Analysis

Geode's query optimizer generates execution plans that determine how queries are executed:

**Understanding EXPLAIN Output**:

```gql
// Analyze a pattern match query
EXPLAIN
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.name = 'Alice'
RETURN f.name, f.created_at
ORDER BY f.created_at DESC
LIMIT 10

// Output shows:
// 1. Access method (index seek vs scan)
// 2. Join strategy (nested loop, hash join)
// 3. Filter application points
// 4. Sort operations
// 5. Estimated row counts
```

**Key Plan Components**:

- **Access Methods**: Index seek, index scan, full scan
- **Join Strategies**: Nested loop, hash join, merge join
- **Filter Placement**: Early vs late predicate application
- **Sort Operations**: In-memory vs external sort
- **Projection**: Column selection and transformation

### Index Strategy

Indexes dramatically accelerate query execution when used effectively:

**Index Types**:

```gql
// Property index for equality lookups
CREATE INDEX user_email_idx ON User(email);

// Composite index for multi-property filters
CREATE INDEX user_location_idx ON User(city, state);

// Label index for type-based queries
CREATE INDEX transaction_type_idx ON Transaction(type, amount);
```

**Index Selection Rules**:

1. **Equality First**: Indexes work best for equality predicates
2. **Prefix Matching**: Composite indexes match left-to-right
3. **Cardinality Matters**: High-cardinality columns benefit most
4. **Covering Indexes**: Include all referenced properties when possible

### Pattern Matching Efficiency

Graph pattern matching can be optimized through careful query design:

**Optimization Techniques**:

```gql
// BEFORE: Inefficient - scans all users
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE f.name STARTS WITH 'A'
RETURN u.name, f.name;

// AFTER: Optimized - uses index on target first
MATCH (f:User)-[:FOLLOWS]-(u:User)
WHERE f.name STARTS WITH 'A'
RETURN u.name, f.name;

// Even better: Add index
CREATE INDEX user_name_prefix_idx ON User(name);
```

**Pattern Ordering**:

- **Filter Early**: Apply selective predicates first
- **Index-Backed Patterns**: Start with indexed properties
- **Relationship Direction**: Consider relationship cardinality
- **Optional Matches**: Use sparingly, can force Cartesian products

## Optimization Strategies

### Query Rewriting

Restructure queries for better performance:

**Predicate Pushdown**:

```gql
// BEFORE: Filter after aggregation
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH u, COUNT(p) AS purchase_count
WHERE purchase_count > 10
RETURN u.name, purchase_count;

// AFTER: Filter during traversal
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH u, p
WHERE u.account_status = 'active'
WITH u, COUNT(p) AS purchase_count
WHERE purchase_count > 10
RETURN u.name, purchase_count;
```

**Join Elimination**:

```gql
// BEFORE: Unnecessary self-join
MATCH (u1:User)-[:FOLLOWS]->(u2:User)
MATCH (u2)-[:POSTS]->(p:Post)
WHERE u1.id = 'user123'
RETURN p;

// AFTER: Direct path
MATCH (u:User {id: 'user123'})-[:FOLLOWS]->()-[:POSTS]->(p:Post)
RETURN p;
```

### Aggregation Optimization

Optimize aggregation queries for large datasets:

**Incremental Aggregation**:

```gql
// Use WITH to aggregate incrementally
MATCH (u:User)-[:PURCHASED]->(p:Product)-[:IN_CATEGORY]->(c:Category)
WHERE u.region = 'West'
WITH c, SUM(p.price) AS category_total
WHERE category_total > 1000
RETURN c.name, category_total
ORDER BY category_total DESC;
```

**Pre-Aggregated Data**:

```gql
// Maintain aggregates for fast access
MATCH (u:User)
SET u.total_purchases = size((u)-[:PURCHASED]->());

// Query uses pre-computed value
MATCH (u:User)
WHERE u.total_purchases > 100
RETURN u.name, u.total_purchases;
```

### Index Coverage

Design indexes that cover entire queries:

**Covering Index Example**:

```gql
// Create covering index
CREATE INDEX user_profile_idx ON User(city, state, age, name);

// Query uses index without accessing node
MATCH (u:User)
WHERE u.city = 'Seattle' AND u.state = 'WA' AND u.age > 25
RETURN u.name;
// All data comes from index, no node lookup needed
```

## Performance Tools

### EXPLAIN Command

Analyze query execution plans before running queries:

**Basic Usage**:

```gql
// See execution plan without running query
EXPLAIN
MATCH (u:User)-[:FOLLOWS*1..3]->(friend:User)
WHERE u.name = 'Alice'
RETURN friend.name;
```

**Plan Interpretation**:

```
QueryPlan:
  - NodeIndexSeek: User(name = 'Alice') -> u
    Estimated rows: 1
    Index: user_name_idx

  - VariableLengthExpand: (u)-[:FOLLOWS*1..3]->(friend)
    Estimated rows: 150
    Strategy: BFS traversal
    Max depth: 3

  - Projection: friend.name
    Estimated rows: 150
```

### PROFILE Command

Measure actual runtime performance:

**Runtime Analysis**:

```gql
// Execute query and collect performance metrics
PROFILE
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.region = 'East' AND p.price > 100
RETURN u.name, p.name, p.price
LIMIT 100;
```

**Profile Output**:

```
Execution Profile:
  Total time: 45ms

  NodeIndexSeek (User.region = 'East'):
    Time: 2ms
    Rows: 15,234
    Index: user_region_idx

  Expand (PURCHASED):
    Time: 28ms
    Rows: 45,678

  Filter (p.price > 100):
    Time: 12ms
    Input rows: 45,678
    Output rows: 12,345

  Projection + Limit:
    Time: 3ms
    Rows: 100
```

### Query Metrics

Monitor query performance in production:

**Key Metrics**:

- **Execution Time**: Total query runtime
- **Rows Examined**: Total nodes/edges accessed
- **Rows Returned**: Result set size
- **Index Hits**: Index usage count
- **Cache Efficiency**: Hot data access rate
- **Memory Usage**: Query memory footprint

## Best Practices

### Index Design

Create indexes strategically:

**High-Impact Indexes**:

```gql
// 1. Unique identifiers
CREATE UNIQUE INDEX user_id_idx ON User(user_id);

// 2. Foreign key equivalents
CREATE INDEX order_user_idx ON Order(user_id);

// 3. Common filter columns
CREATE INDEX product_category_idx ON Product(category);

// 4. Sort columns
CREATE INDEX event_timestamp_idx ON Event(timestamp);

// 5. Composite for complex queries
CREATE INDEX user_search_idx ON User(status, region, created_at);
```

**Index Maintenance**:

- **Avoid Over-Indexing**: Each index adds write overhead
- **Monitor Usage**: Remove unused indexes
- **Update Statistics**: Keep optimizer statistics current
- **Rebuild When Needed**: Maintain index health

### Query Structure

Write efficient query patterns:

**Efficiency Guidelines**:

```gql
// ✓ Good: Filter early with indexes
MATCH (u:User {status: 'active'})-[:PURCHASED]->(p:Product)
WHERE p.category = 'Electronics'
RETURN u.name, COUNT(p);

// ✗ Bad: Late filtering forces full scan
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.status = 'active' AND p.category = 'Electronics'
RETURN u.name, COUNT(p);

// ✓ Good: Limit early when possible
MATCH (u:User)-[:RECENT_LOGIN]->(l:Login)
WHERE u.region = 'West'
WITH u, l
ORDER BY l.timestamp DESC
LIMIT 10
RETURN u.name, l.timestamp;

// ✗ Bad: Sort entire result set
MATCH (u:User)-[:RECENT_LOGIN]->(l:Login)
WHERE u.region = 'West'
RETURN u.name, l.timestamp
ORDER BY l.timestamp DESC
LIMIT 10;
```

### Traversal Optimization

Optimize graph traversal queries:

**Traversal Strategies**:

```gql
// Bounded depth prevents runaway queries
MATCH (u:User)-[:FOLLOWS*1..3]->(friend)
WHERE u.id = 'user123'
RETURN DISTINCT friend.name;

// Directed traversals when possible
MATCH (u:User)-[:FOLLOWS]->(friend)  // Better
// vs
MATCH (u:User)-[:FOLLOWS]-(friend)   // Checks both directions

// Prune paths early
MATCH path = (u:User)-[:FOLLOWS*1..5]->(influencer:User)
WHERE ALL(n IN nodes(path) WHERE n.account_status = 'active')
  AND influencer.follower_count > 10000
RETURN influencer.name;
```

## Troubleshooting

### Slow Query Diagnosis

Systematic approach to finding bottlenecks:

**Step 1: Get Baseline**:

```gql
// Measure current performance
PROFILE
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.region = 'West'
RETURN u.name, COUNT(p) AS purchases
ORDER BY purchases DESC
LIMIT 20;
```

**Step 2: Analyze Plan**:

```gql
// Check execution strategy
EXPLAIN
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.region = 'West'
RETURN u.name, COUNT(p) AS purchases
ORDER BY purchases DESC
LIMIT 20;

// Look for:
// - Full scans (missing indexes)
// - Large intermediate results
// - Cartesian products
// - Late filtering
```

**Step 3: Add Indexes**:

```gql
// Address index gaps
CREATE INDEX user_region_idx ON User(region);

// Re-measure
PROFILE
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.region = 'West'
RETURN u.name, COUNT(p) AS purchases
ORDER BY purchases DESC
LIMIT 20;
```

### Common Issues

**Issue: Full Table Scans**:

```gql
// Problem: No index on filter column
MATCH (p:Product)
WHERE p.sku = 'ABC123'
RETURN p;
// Shows: FullScan (Product) in EXPLAIN

// Solution: Add index
CREATE INDEX product_sku_idx ON Product(sku);
```

**Issue: Cartesian Products**:

```gql
// Problem: Disconnected patterns
MATCH (u:User), (p:Product)
WHERE u.region = 'West' AND p.category = 'Books'
RETURN u.name, p.name;
// Generates u_count * p_count rows

// Solution: Add relationship
MATCH (u:User)-[:INTERESTED_IN]->(c:Category {name: 'Books'})<-[:IN_CATEGORY]-(p:Product)
WHERE u.region = 'West'
RETURN u.name, p.name;
```

**Issue: Expensive Aggregations**:

```gql
// Problem: Aggregating too late
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH u, COUNT(p) AS purchase_count
WHERE purchase_count > 50
RETURN u.name, purchase_count;

// Solution: Filter before aggregating
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.account_type = 'premium'  // Reduces input set
WITH u, COUNT(p) AS purchase_count
WHERE purchase_count > 50
RETURN u.name, purchase_count;
```

## Production Optimization

### Monitoring

Track query performance continuously:

**Key Queries to Monitor**:

```gql
// Identify slow queries
SELECT query_text, avg_duration, execution_count
FROM system.query_stats
WHERE avg_duration > 1000  -- milliseconds
ORDER BY avg_duration DESC
LIMIT 20;

// Find missing indexes
SELECT table_name, column_name, scan_count
FROM system.column_stats
WHERE scan_count > 1000 AND index_exists = false
ORDER BY scan_count DESC;
```

### Capacity Planning

Plan for growth:

**Scaling Considerations**:

- **Data Growth**: Test queries at 2x, 5x, 10x current size
- **Concurrent Users**: Validate performance under load
- **Index Memory**: Ensure hot indexes fit in memory
- **Query Mix**: Optimize for actual workload patterns
- **Caching**: Leverage query result caching when appropriate

### Query Tuning Workflow

Systematic optimization process:

1. **Identify Slow Queries**: Use monitoring to find problems
2. **Analyze Execution Plans**: Understand current strategy
3. **Create Targeted Indexes**: Address access pattern gaps
4. **Rewrite Inefficient Queries**: Apply optimization patterns
5. **Measure Improvements**: Validate changes with PROFILE
6. **Deploy and Monitor**: Track production performance
7. **Iterate**: Continuously refine based on real usage

## Advanced Techniques

### Materialized Views

Pre-compute expensive queries:

```gql
// Create materialized aggregation
CREATE GRAPH SCHEMA popular_products AS
MATCH (p:Product)<-[:PURCHASED]-(u:User)
WITH p, COUNT(u) AS purchase_count
WHERE purchase_count > 100
RETURN p.id AS product_id,
       p.name AS product_name,
       purchase_count;

// Query uses pre-computed results
MATCH (mp:popular_products)
WHERE mp.purchase_count > 500
RETURN mp.product_name, mp.purchase_count;
```

### Query Hints

Guide optimizer when needed:

```gql
// Force index usage
MATCH (u:User)
USING INDEX user_email_idx
WHERE u.email = 'user@example.com'
RETURN u;

// Control join strategy
MATCH (u:User)-[:PURCHASED]->(p:Product)
USING JOIN hash_join
WHERE u.region = 'West'
RETURN u.name, p.name;
```

### Batch Processing

Optimize bulk operations:

```gql
// Process in batches to control memory
MATCH (u:User)
WHERE u.status = 'inactive'
WITH u
LIMIT 1000
SET u.archived = true
RETURN COUNT(u);
// Repeat until all processed
```

## Integration with Geode

Query optimization integrates with other Geode features:

- **Transactions**: Optimize within transaction boundaries
- **Concurrency**: Design for concurrent query execution
- **Caching**: Leverage Geode's query cache effectively
- **Monitoring**: Use built-in metrics for continuous improvement
- **Security**: Ensure RLS policies don't impede performance

## Related Topics

- **EXPLAIN Command**: Detailed execution plan analysis
- **PROFILE Command**: Runtime performance profiling
- **Indexes**: Index design and management
- **Query Performance**: Overall performance considerations
- **Monitoring**: Production query monitoring
- **Best Practices**: General optimization guidelines
- **Troubleshooting**: Debugging performance issues

---

Browse the tagged content below to discover comprehensive guides, tutorials, and best practices for query optimization in Geode. Master the tools and techniques needed to build high-performance graph applications that scale to production workloads.
