---
title: "Indexing and Query Optimization Tutorial"
description: "Comprehensive tutorial for creating indexes, using EXPLAIN and PROFILE, and optimizing GQL queries for maximum performance in Geode"
keywords: ["indexing tutorial", "query optimization", "EXPLAIN", "PROFILE", "B-tree index", "HNSW index", "performance tuning", "cost-based optimizer"]
weight: 30
slug: "indexing-tutorial"
url: "/docs/tutorials/indexing-tutorial/"
canonical: "https://geodedb.com/docs/tutorials/indexing-tutorial/"
---

<!-- CANARY: REQ=REQ-GQL-016; FEATURE="MultiIndexOptimizer"; ASPECT=IndexTypeSelection; STATUS=TESTED; OWNER=engine; UPDATED=2025-10-03 -->

# Indexing and Query Optimization Tutorial

Learn to create indexes and optimize query performance using EXPLAIN and PROFILE in this hands-on 15-minute tutorial.

## Prerequisites

- Completed [MATCH Basics Tutorial](/docs/tutorials/match-basics/)
- Geode server running (`geode serve`)
- Access to Geode shell (`geode shell`)

## Tutorial Overview

**Time**: 15 minutes
**Difficulty**: Intermediate
**Topics**: Index creation, query plans, performance profiling, optimization strategies

By the end of this tutorial, you'll be able to:

- Identify slow queries using PROFILE
- Create appropriate indexes for query patterns
- Use EXPLAIN to verify index usage
- Compare query performance before and after indexing
- Understand cost-based optimizer behavior

## Step 1: Create Sample Dataset

Create a larger dataset to demonstrate performance differences:

```gql
CREATE GRAPH PerformanceTest;
USE PerformanceTest;

-- Create 100 person nodes
CREATE
  (:Person {name: "Person_1", age: 25, city: "Seattle", salary: 50000}),
  (:Person {name: "Person_2", age: 30, city: "Portland", salary: 60000}),
  (:Person {name: "Person_3", age: 35, city: "Seattle", salary: 70000}),
  (:Person {name: "Person_4", age: 28, city: "San Francisco", salary: 90000}),
  (:Person {name: "Person_5", age: 42, city: "Seattle", salary: 85000});

-- In production, you'd create many more nodes
-- For this tutorial, 5 nodes demonstrate the concepts
```

**Expected output**:

```
Created 5 nodes
```

### What You Learned

- Indexing becomes critical with large datasets (1000+ nodes)
- Small datasets may not show dramatic improvements
- Real benefits appear at scale (millions of nodes/relationships)

## Step 2: Identify Slow Query with PROFILE

Run a query with performance profiling:

```gql
PROFILE
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name, p.age, p.salary
ORDER BY p.salary DESC;
```

**Expected output**:

```
name      | age | salary
----------|-----|--------
Person_4  | 28  | 90000
Person_5  | 42  | 85000
Person_3  | 35  | 70000

PROFILE:
  Operation: SeqScan [Person]
  Rows scanned: 5
  Rows returned: 3
  Execution time: 0.234ms
  Filter: age > 30
```

### Understanding PROFILE Output

- **SeqScan**: Sequential scan (reads every node)
- **Rows scanned**: Total nodes examined
- **Rows returned**: Nodes matching criteria
- **Execution time**: Query duration
- **Filter**: Condition applied during scan

### Problem Identified

- **SeqScan** scans ALL nodes, even those not matching
- Inefficient for large datasets (scans millions to find thousands)
- Execution time grows linearly with data size

### What You Learned

- `PROFILE` shows query execution details
- SeqScan indicates no index usage
- Performance degrades with dataset size
- Need indexes for efficient filtering

## Step 3: Create B-tree Index

Create an index on the `age` property:

```gql
CREATE INDEX person_age_idx ON Person(age) USING btree;
```

**Expected output**:

```
Index 'person_age_idx' created successfully
Indexed 5 nodes
Build time: 0.12ms
```

### B-tree Index Characteristics

- **Best for**: Range queries (`>`, `<`, `>=`, `<=`, `BETWEEN`)
- **Supported operations**: Equality (`=`), ordering (`ORDER BY`)
- **Structure**: Balanced tree for O(log n) lookups
- **Space overhead**: ~5-10% of data size

### Index Naming Convention

```
<label>_<property>_idx
```

Examples:

- `person_age_idx`
- `product_price_idx`
- `user_email_idx`

### What You Learned

- `CREATE INDEX` builds an index structure
- `USING btree` specifies index type
- Indexes are built immediately (synchronous)
- B-tree optimal for numeric ranges

## Step 4: Verify Index Usage with EXPLAIN

Check if the optimizer uses your index:

```gql
EXPLAIN
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name, p.age, p.salary
ORDER BY p.salary DESC;
```

**Expected output**:

```
QUERY PLAN:
┌─ Project [p.name, p.age, p.salary]
└─ Sort [p.salary DESC]
   └─ Filter [p.age > 30]
      └─ IndexScan [person_age_idx]
         Index: person_age_idx (btree)
         Condition: age > 30
         Estimated rows: 3
         Estimated cost: 2.5
```

### Understanding EXPLAIN Output

- **Project**: Select specific columns
- **Sort**: ORDER BY implementation
- **Filter**: WHERE clause evaluation
- **IndexScan**: Uses index (not SeqScan!)
- **Estimated rows**: Optimizer's row count prediction
- **Estimated cost**: Relative expense (lower = better)

### Verify Index Used

Look for:

- `IndexScan` instead of `SeqScan`
- Index name (`person_age_idx`)
- Condition pushed down to index

### What You Learned

- `EXPLAIN` shows query plan without executing
- IndexScan confirms index usage
- Optimizer estimates rows and costs
- Index dramatically reduces work

## Step 5: Compare Performance

Run PROFILE again with index:

```gql
PROFILE
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name, p.age, p.salary
ORDER BY p.salary DESC;
```

**Expected output**:

```
name      | age | salary
----------|-----|--------
Person_4  | 28  | 90000
Person_5  | 42  | 85000
Person_3  | 35  | 70000

PROFILE:
  Operation: IndexScan [person_age_idx]
  Index: person_age_idx (btree)
  Rows scanned: 3
  Rows returned: 3
  Execution time: 0.08ms
  Filter: age > 30 (index)
```

### Performance Improvements

**Before Index**:

- Operation: SeqScan
- Rows scanned: 5
- Execution time: 0.234ms

**After Index**:

- Operation: IndexScan
- Rows scanned: 3 (only matching rows!)
- Execution time: 0.08ms

**Speedup**: ~3x faster (more dramatic with larger datasets)

### What You Learned

- Index reduced rows scanned (5 → 3)
- Execution time improved by ~66%
- Improvement scales with dataset size
- Index pays off for repeated queries

## Step 6: Composite Index

Create multi-column index for complex queries:

```gql
CREATE INDEX person_city_age_idx ON Person(city, age) USING btree;
```

**Expected output**:

```
Index 'person_city_age_idx' created successfully
Indexed 5 nodes
Build time: 0.15ms
```

### When to Use Composite Indexes

**Good for**:

```gql
-- Uses city_age index efficiently
WHERE city = 'Seattle' AND age > 30
WHERE city = 'Seattle'  -- Uses first column only
```

**Not optimal**:

```gql
-- Cannot use city_age index (skips first column)
WHERE age > 30
```

### Index Column Order

**Rule**: Most selective column first, then range column

**Example**:

- `city` has few distinct values (low selectivity)
- `age` has many distinct values (high selectivity)
- For equality + range: put equality first

Optimal order: `(city, age)` for `WHERE city = X AND age > Y`

### What You Learned

- Composite indexes span multiple properties
- Column order matters for query matching
- Leftmost prefix rule applies
- Trade-off: storage vs query performance

## Step 7: Index Types Comparison

Create indexes for different use cases:

### B-tree Index (Range Queries)

```gql
CREATE INDEX product_price_idx ON Product(price) USING btree;

-- Optimal for:
WHERE price > 100
WHERE price BETWEEN 50 AND 200
ORDER BY price
```

### Hash Index (Equality Only)

```gql
CREATE INDEX user_email_idx ON User(email) USING hash;

-- Optimal for:
WHERE email = 'user@example.com'

-- NOT optimal for:
WHERE email LIKE '%@example.com'  -- Use btree instead
```

### Full-Text Index (Text Search)

```gql
CREATE INDEX doc_content_idx ON Document(content) USING fulltext;

-- Optimal for:
-- full-text search is a procedure call, not a WHERE predicate
CALL geode.fts.search('article_content', 'graph database')
YIELD node, score
```

### Vector Index (Similarity Search)

```gql
CREATE INDEX product_emb_idx ON Product(embedding) USING vector;

-- Optimal for:
WHERE distance(embedding, $query_vec, 'cosine') < 0.5
ORDER BY distance(embedding, $query_vec, 'cosine')
LIMIT 10
```

### Bloom Filter Index (Membership Testing)

```gql
CREATE INDEX tags_idx ON Article(tags) USING bloom;

-- Optimal for:
WHERE 'database' IN tags
```

### Index Type Summary

| Index Type | Best For | Operations | Space | Build Time |
|------------|----------|------------|-------|------------|
| B-tree | Ranges, ordering | `>`, `<`, `=`, `ORDER BY` | Low | Fast |
| Hash | Exact matches | `=` | Very Low | Very Fast |
| Full-text | Text search | `CALL geode.fts.search(...)` | Medium | Medium |
| Vector | Similarity | `vector_distance_*()` | High | Slow |
| Bloom | Membership | `IN`, `ANY` | Very Low | Very Fast |

### What You Learned

- Different index types for different query patterns
- B-tree is general-purpose (most common)
- Specialized indexes for specific operations
- Trade-offs between space, build time, and query speed

## Step 8: Cost-Based Optimizer

Observe optimizer choosing between indexes:

```gql
-- Create overlapping indexes
CREATE INDEX person_age_idx ON Person(age) USING btree;
CREATE INDEX person_age_city_idx ON Person(age, city) USING btree;

-- Optimizer chooses best index
EXPLAIN
MATCH (p:Person)
WHERE p.age > 30 AND p.city = 'Seattle'
RETURN p.name;
```

**Expected output**:

```
QUERY PLAN:
└─ IndexScan [person_age_city_idx]
   Index: person_age_city_idx (btree, composite)
   Condition: age > 30 AND city = 'Seattle'
   Estimated rows: 2
   Estimated cost: 1.8

OPTIMIZER DECISION:
  Considered indexes:
    - person_age_idx: cost 3.2 (single column)
    - person_age_city_idx: cost 1.8 (both columns match) ✓ CHOSEN
  Reason: Composite index covers both predicates
```

### Optimizer Selection Criteria

1. **Index coverage**: More matched columns = better
2. **Selectivity**: Fewer estimated rows = better
3. **Index type**: Appropriate for operation
4. **Cost estimate**: Logarithmic scaling for trees

### What You Learned

- Optimizer automatically chooses best index
- Multiple indexes don't hurt (optimizer picks one)
- Composite indexes preferred when applicable
- Cost model guides selection

## Step 9: Index Statistics

Update statistics for accurate cost estimation:

```gql
-- Analyze table to collect statistics
-- Geode has no ANALYZE / VACUUM / REINDEX. Statistics are maintained by
-- the engine, freed pages are reused automatically, and an index is
-- rebuilt by dropping and recreating it.
```

**Expected output**:

```
Statistics updated for label 'Person'
  Rows: 5
  Distinct values (age): 5
  Distinct values (city): 3
  Min age: 25, Max age: 42
  Null fraction (age): 0.0
```

### Statistics Purpose

- **Cardinality**: Row counts per label
- **Distinct values**: Property selectivity
- **Value distribution**: Histograms for ranges
- **Null fraction**: Percentage of nulls

### When to ANALYZE

- After bulk data loads
- After significant updates (>10% of data)
- Before major query optimization work
- Periodically (daily/weekly for active databases)

### Auto-Update Configuration

```yaml
# geode.yaml
optimizer:
  statistics:
    auto_update: true
    update_interval: '1h'
    sample_size: 10000
```

### What You Learned

- Statistics improve optimizer accuracy
- `ANALYZE` updates statistics
- Stale statistics lead to poor plans
- Auto-update recommended for production

## Step 10: Index Maintenance

Monitor and maintain indexes:

### List All Indexes

```gql
SHOW INDEXES ON Person;
```

**Expected output**:

```
name                  | label  | properties   | type   | unique | status
----------------------|--------|--------------|--------|--------|--------
person_age_idx        | Person | [age]        | btree  | false  | ready
person_city_age_idx   | Person | [city, age]  | btree  | false  | ready
person_email_idx      | Person | [email]      | hash   | true   | ready
```

### Drop Unused Index

```gql
DROP INDEX person_age_idx;
```

**Expected output**:

```
Index 'person_age_idx' dropped successfully
```

### Rebuild Index

```gql
-- Drop and recreate
DROP INDEX person_age_idx;
CREATE INDEX person_age_idx ON Person(age) USING btree;

-- Or use REINDEX (if supported)
-- Geode has no ANALYZE / VACUUM / REINDEX. Statistics are maintained by
-- the engine, freed pages are reused automatically, and an index is
-- rebuilt by dropping and recreating it.
```

### Index Health Check

```gql
-- Check index fragmentation (future feature)
SHOW INDEX STATS person_age_idx;
```

### What You Learned

- `SHOW INDEXES` lists all indexes
- Drop unused indexes to save space
- Rebuild for fragmentation or corruption
- Monitor index health regularly

## Complete Example: E-Commerce Optimization

Optimize a product catalog query:

### Initial Setup

```gql
CREATE GRAPH ECommerce;
USE ECommerce;

CREATE
  (:Product {id: 1, name: "Laptop", category: "Electronics", price: 1200, rating: 4.5}),
  (:Product {id: 2, name: "Mouse", category: "Electronics", price: 25, rating: 4.2}),
  (:Product {id: 3, name: "Desk", category: "Furniture", price: 350, rating: 4.7}),
  (:Product {id: 4, name: "Chair", category: "Furniture", price: 200, rating: 4.6}),
  (:Product {id: 5, name: "Monitor", category: "Electronics", price: 400, rating: 4.4});
```

### Slow Query

```gql
PROFILE
MATCH (p:Product)
WHERE p.category = 'Electronics' AND p.price < 500 AND p.rating > 4.0
RETURN p.name, p.price, p.rating
ORDER BY p.rating DESC;
```

**Result**: SeqScan, 5 rows scanned

### Create Optimal Indexes

```gql
-- Composite index for category + price range
CREATE INDEX prod_cat_price_idx ON Product(category, price) USING btree;

-- Separate index for rating (used in ORDER BY)
CREATE INDEX prod_rating_idx ON Product(rating) USING btree;

-- Update statistics
-- Geode has no ANALYZE / VACUUM / REINDEX. Statistics are maintained by
-- the engine, freed pages are reused automatically, and an index is
-- rebuilt by dropping and recreating it.
```

### Verify Optimization

```gql
EXPLAIN
MATCH (p:Product)
WHERE p.category = 'Electronics' AND p.price < 500 AND p.rating > 4.0
RETURN p.name, p.price, p.rating
ORDER BY p.rating DESC;
```

**Expected plan**:

```
└─ Project [p.name, p.price, p.rating]
   └─ Sort [p.rating DESC] using prod_rating_idx
      └─ Filter [p.rating > 4.0]
         └─ IndexScan [prod_cat_price_idx]
            Condition: category = 'Electronics' AND price < 500
            Estimated rows: 2
```

### Performance Comparison

```gql
PROFILE
MATCH (p:Product)
WHERE p.category = 'Electronics' AND p.price < 500 AND p.rating > 4.0
RETURN p.name, p.price, p.rating
ORDER BY p.rating DESC;
```

**Before**: 5 rows scanned, 0.25ms
**After**: 2 rows scanned, 0.08ms
**Improvement**: 68% faster, 60% fewer rows

### What You Learned

- Combine indexes for complex queries
- Separate indexes for filter vs sort
- Composite indexes reduce scan size
- ORDER BY can use indexes too

## Best Practices

### Index Creation Strategy

1. **Profile first**: Use PROFILE to find slow queries
2. **Identify patterns**: Look for common WHERE/ORDER BY columns
3. **Create selectively**: Don't over-index (balance read vs write performance)
4. **Test impact**: Compare EXPLAIN before and after
5. **Monitor usage**: Drop unused indexes

### Index Selection Guidelines

**Always index**:

- Primary keys and unique constraints
- Foreign key columns (join conditions)
- Columns in frequent WHERE clauses
- ORDER BY and GROUP BY columns

**Consider indexing**:

- Columns with high cardinality (many distinct values)
- Columns in complex queries
- Frequently accessed properties

**Don't index**:

- Low cardinality columns (few distinct values, like boolean)
- Rarely queried properties
- Columns updated frequently (write overhead)

### Performance Rules of Thumb

- **Indexes speed up reads**: Significant improvement for large datasets
- **Indexes add write overhead**: Consider trade-offs when creating indexes
- **Composite indexes**: 2-3 columns maximum recommended
- **Index space**: Varies based on data and index type
- **Statistics**: Update after significant data changes

## Practice Exercises

### Exercise 1: Optimize Range Query

```gql
-- Create test data
CREATE GRAPH RangeTest;
USE RangeTest;

CREATE
  (:Event {name: "Event_1", timestamp: 1609459200, priority: 1}),
  (:Event {name: "Event_2", timestamp: 1609545600, priority: 2}),
  (:Event {name: "Event_3", timestamp: 1609632000, priority: 1}),
  (:Event {name: "Event_4", timestamp: 1609718400, priority: 3});

-- Slow query
MATCH (e:Event)
WHERE e.timestamp > 1609500000 AND e.timestamp < 1609700000
RETURN e.name, e.timestamp
ORDER BY e.timestamp;
```

**Task**: Create an index to optimize this query. Verify with EXPLAIN.

### Exercise 2: Composite Index Design

```gql
-- Query pattern
MATCH (u:User)
WHERE u.country = 'USA' AND u.age > 25 AND u.active = true
RETURN u.name, u.email;
```

**Task**: Design optimal composite index. Consider column order.

### Exercise 3: Index Type Selection

For each query, choose the best index type:

```gql
-- Query A
WHERE user.email = 'alice@example.com'

-- Query B
WHERE product.price BETWEEN 50 AND 100

-- Query C
CALL geode.fts.search('node_content', 'graph database')
YIELD node, score
MATCH (article:Node) WHERE id(article) = node

-- Query D
WHERE vector_l2(image.embedding, $query_vec) < 0.3

-- Query E
WHERE 'featured' IN product.tags
```

## Solutions

<details>
<summary>Exercise 1 Solution</summary>

```gql
-- Create B-tree index for range query
CREATE INDEX event_timestamp_idx ON Event(timestamp) USING btree;

-- Verify usage
EXPLAIN
MATCH (e:Event)
WHERE e.timestamp > 1609500000 AND e.timestamp < 1609700000
RETURN e.name, e.timestamp
ORDER BY e.timestamp;

-- Should show IndexScan with event_timestamp_idx
```

</details>

<details>
<summary>Exercise 2 Solution</summary>

```gql
-- Column order: equality first, then range, then equality
-- country (equality, medium selectivity)
-- age (range, high selectivity)
-- active (equality, low selectivity)

CREATE INDEX user_country_age_active_idx ON User(country, age, active) USING btree;

-- Alternative (if age range is wide):
CREATE INDEX user_country_active_age_idx ON User(country, active, age) USING btree;

-- Verify
EXPLAIN
MATCH (u:User)
WHERE u.country = 'USA' AND u.age > 25 AND u.active = true
RETURN u.name, u.email;
```

</details>

<details>
<summary>Exercise 3 Solution</summary>

```gql
-- Query A: Hash index (exact match)
CREATE INDEX user_email_idx ON User(email) USING hash;

-- Query B: B-tree index (range query)
CREATE INDEX product_price_idx ON Product(price) USING btree;

-- Query C: Full-text index
CREATE INDEX article_content_idx ON Article(content) USING fulltext;

-- Query D: Vector index (similarity search)
CREATE INDEX image_embedding_idx ON Image(embedding) USING vector;

-- Query E: Bloom filter (membership testing)
CREATE INDEX product_tags_idx ON Product(tags) USING bloom;
```

</details>

## Troubleshooting

### Index Not Used by Optimizer

**Problem**: EXPLAIN shows SeqScan despite index existing

**Solutions**:

1. Update statistics: `ANALYZE Person;`
2. Check index covers query columns
3. Verify WHERE clause uses indexed columns
4. Try composite index for multiple predicates
5. Check data distribution (very small tables may use SeqScan)

### Slow Index Creation

**Problem**: CREATE INDEX takes too long

**Solutions**:

1. Build indexes during maintenance windows
2. Use `CONCURRENTLY` option (if available)
3. Increase memory for index build
4. Consider smaller sample size for partial indexes

### Query Slower After Adding Index

**Problem**: Performance degraded post-indexing

**Solutions**:

1. Update statistics: `ANALYZE`
2. Check if wrong index chosen
3. Consider dropping conflicting indexes
4. Verify index type matches query pattern
5. Check write overhead on heavily updated tables

## Next Steps

Continue your learning journey:

1. **[Graph Algorithms Tutorial](/docs/tutorials/graph-algorithms-tutorial/)** - PageRank, centrality, community detection
2. **[Performance Tuning Guide](/docs/performance/)** - Advanced optimization techniques
3. **[Query Language Reference](/docs/gql/guide/)** - Complete GQL syntax
4. **[Indexing Guide](/docs/query/indexing-and-optimization/)** - Comprehensive indexing documentation

## Quick Reference

### Index Commands

```gql
-- Create index
CREATE INDEX idx_name ON Label(property) USING btree;

-- Composite index
CREATE INDEX idx_name ON Label(prop1, prop2) USING btree;

-- Drop index
DROP INDEX idx_name;

-- List indexes
SHOW INDEXES ON Label;

-- Update statistics
-- Geode has no ANALYZE / VACUUM / REINDEX. Statistics are maintained by
-- the engine, freed pages are reused automatically, and an index is
-- rebuilt by dropping and recreating it.
```

### Index Types

```gql
USING btree      -- Range queries, ordering
USING hash       -- Exact matches only
USING fulltext   -- Text search
USING vector     -- Similarity search
USING bloom      -- Membership testing
```

### Query Analysis

```gql
EXPLAIN ...      -- Show query plan (no execution)
PROFILE ...      -- Execute and show performance
-- Geode has no ANALYZE / VACUUM / REINDEX. Statistics are maintained by
-- the engine, freed pages are reused automatically, and an index is
-- rebuilt by dropping and recreating it.   -- Update statistics
```

---

**Tutorial Complete!** You now understand indexing and query optimization in Geode.

**Next**: [Graph Algorithms Tutorial](/docs/tutorials/graph-algorithms-tutorial/)
