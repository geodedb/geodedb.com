---
title: "Category: Query Optimization"
description: "Comprehensive query optimization documentation for Geode including query planning, cost-based optimization, EXPLAIN/PROFILE usage, index strategies, and performance tuning techniques."
keywords:
  - query optimization
  - query planning
  - cost-based optimization
  - EXPLAIN
  - PROFILE
  - performance tuning
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/query-optimization/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

The **Query Optimization** category provides in-depth guidance on understanding, analyzing, and improving the performance of GQL queries in Geode. From query planner internals to practical optimization techniques, this collection helps you write efficient queries and troubleshoot performance issues.

## Understanding Query Optimization

Query optimization is the process of transforming a declarative GQL query into an efficient execution plan. Geode's cost-based optimizer analyzes multiple execution strategies, estimates their costs using statistics, and selects the approach with minimal expected resource consumption. Understanding how the optimizer works enables you to write queries that produce optimal plans.

The optimization process involves several phases:

1. **Parsing**: Converts GQL text into an Abstract Syntax Tree (AST)
2. **Logical Planning**: Transforms AST into logical operators (scans, joins, filters)
3. **Optimization**: Rewrites logical plan using optimization rules
4. **Physical Planning**: Selects specific algorithms for each operator
5. **Execution**: Runs the physical plan and returns results

## The Query Planner

Geode's query planner uses **cost-based optimization** to choose execution strategies. The planner maintains statistics about your data - node counts, relationship cardinalities, property value distributions - and uses these to estimate the cost of different plans.

### Cardinality Estimation

The planner estimates how many rows each operator produces:

```gql
MATCH (u:User {country: 'USA'})-[:PURCHASED]->(p:Product {category: 'Electronics'})
RETURN u.name, p.name
```

The planner estimates:
- How many users have `country = 'USA'`
- How many products have `category = 'Electronics'`
- How many purchase relationships connect them
- Which join order produces fewer intermediate results

Accurate cardinality estimates lead to better plan choices. Geode automatically updates statistics as data changes.

### Join Ordering

For queries with multiple patterns, join order significantly impacts performance:

```gql
-- Three patterns to join
MATCH (a:User)-[:FRIEND]->(b:User)
      -[:POSTED]->(p:Post)
      -[:TAGGED]->(t:Tag {name: 'database'})
RETURN a.name, p.title
```

Possible join orders:
1. Tag → Post → User → User (start with selective tag filter)
2. User → User → Post → Tag (start with social graph)
3. Post → User → User → Tag (start with content)

The planner chooses based on estimated selectivity. Starting with the most selective pattern minimizes intermediate results.

### Index Selection

When multiple indexes could satisfy a pattern, the planner chooses based on selectivity:

```gql
-- Which index to use?
MATCH (u:User)
WHERE u.country = 'USA' AND u.premium = true
RETURN u
```

If you have indexes on both `country` and `premium`:
- If 5% of users have `country = 'USA'` (low selectivity)
- And 1% have `premium = true` (high selectivity)
- The planner uses the premium index, then filters by country

Use `EXPLAIN` to verify index selection.

## Using EXPLAIN

`EXPLAIN` shows the execution plan without running the query:

```gql
EXPLAIN
MATCH (u:User {email: $email})-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN p.name, p.price
ORDER BY p.price DESC
```

Output includes:

```
Sort [p.price DESC]
├─ Project [p.name, p.price]
   ├─ Filter [p.price > 100]
      ├─ Expand [(u)-[:PURCHASED]->(p)]
         └─ IndexSeek [u:User WHERE email = $email]
            └─ Index: user_email_idx
```

Key information:
- **Operator tree**: Physical operators in execution order
- **Index usage**: Which indexes are used
- **Estimated cardinalities**: Expected rows at each step
- **Estimated cost**: Relative cost metric

### Interpreting EXPLAIN Output

**IndexSeek**: Uses an index for direct lookup (optimal for selective filters)

**IndexScan**: Scans an entire index (useful for ordered retrieval)

**NodeScan**: Scans all nodes with a label (expensive for large graphs)

**Expand**: Traverses relationships from matched nodes

**Filter**: Applies predicates to filter rows

**HashJoin**: Joins patterns using hash table (for large joins)

**NestedLoopJoin**: Joins patterns with nested iteration (for small inner sets)

**Sort**: Orders results (expensive, avoid if possible)

**Distinct**: Removes duplicates

## Using PROFILE

`PROFILE` executes the query and reports actual metrics:

```gql
PROFILE
MATCH (u:User)-[:FOLLOWS*2..3]->(recommendation:User)
WHERE NOT EXISTS {
    MATCH (u)-[:FOLLOWS]->(recommendation)
}
RETURN recommendation.name, COUNT(*) AS mutual_connections
ORDER BY mutual_connections DESC
LIMIT 10
```

Output includes everything from `EXPLAIN` plus:

```
Sort [mutual_connections DESC] LIMIT 10
├─ Actual rows: 10
├─ Actual time: 45ms
├─ Memory: 2.1MB
└─ Aggregate [COUNT(*)]
   ├─ Actual rows: 1,247
   ├─ Actual time: 42ms
   └─ Filter [NOT EXISTS ...]
      ├─ Actual rows: 1,247 (estimated: 1,500)
      ├─ Actual time: 38ms
      └─ ExpandVariableLength [(u)-[:FOLLOWS*2..3]->(recommendation)]
         ├─ Actual rows: 8,934 (estimated: 10,000)
         ├─ Actual time: 25ms
         └─ NodeScan [u:User]
            ├─ Actual rows: 1,000
            └─ Actual time: 2ms
```

Key metrics:
- **Actual rows**: How many rows each operator produced
- **Actual time**: Wall-clock time per operator
- **Memory usage**: Memory consumed per operator
- **Estimated vs. actual**: Comparison of planner estimates to reality

### Identifying Problems with PROFILE

**Large cardinality misestimates**: If estimated and actual rows differ by orders of magnitude, statistics may be outdated. Run `ANALYZE` to update them.

**Expensive operators**: Operators consuming most time are optimization targets. Consider indexes, alternative query structures, or materialized views.

**Memory spikes**: Large memory consumption may indicate sorting or aggregating too much data. Use filters earlier or add indexes.

**Full table scans**: NodeScan operations on large label sets. Add property filters with indexes.

## Optimization Techniques

### Index-Based Optimization

Create indexes on properties used in filters:

```gql
-- Before: Full scan
MATCH (u:User)
WHERE u.email = $email
RETURN u

-- Create index
CREATE INDEX user_email_idx ON User(email);

-- After: Index seek
MATCH (u:User)
WHERE u.email = $email
RETURN u
```

Profile shows difference:

```
-- Before (slow)
NodeScan [u:User]
└─ Filter [email = $email]
   Actual rows: 1, time: 500ms (scanned 1,000,000 nodes)

-- After (fast)
IndexSeek [u:User WHERE email = $email]
└─ Index: user_email_idx
   Actual rows: 1, time: 1ms
```

### Pattern Ordering

Order patterns from most to least selective:

```gql
-- Inefficient: Starts with broad pattern
MATCH (u:User)-[:VIEWED]->(p:Product)
WHERE u.id = $userId AND p.featured = true
RETURN p.name

-- Efficient: Starts with selective filter
MATCH (u:User {id: $userId})-[:VIEWED]->(p:Product {featured: true})
RETURN p.name
```

The efficient version filters early, reducing intermediate rows.

### Predicate Pushdown

Move filters close to data sources:

```gql
-- Less efficient
MATCH (u:User)-[:POSTED]->(p:Post)
WITH u, p
WHERE p.published = true AND u.active = true
RETURN u.name, p.title

-- More efficient
MATCH (u:User {active: true})-[:POSTED]->(p:Post {published: true})
RETURN u.name, p.title
```

Filtering in `MATCH` patterns enables index usage and reduces intermediate results.

### Limiting Variable-Length Paths

Unbounded variable-length paths can be expensive:

```gql
-- Potentially expensive
MATCH path = (a:Person)-[:KNOWS*]-(b:Person {name: 'Bob'})
RETURN path

-- Better: Bounded depth
MATCH path = (a:Person)-[:KNOWS*1..4]-(b:Person {name: 'Bob'})
RETURN path
LIMIT 10
```

Limits prevent exponential expansion in dense graphs.

### Avoiding Cartesian Products

Ensure patterns are connected:

```gql
-- Cartesian product (expensive!)
MATCH (u:User), (p:Product)
WHERE u.country = p.origin_country
RETURN u.name, p.name

-- Connected pattern (efficient)
MATCH (u:User)-[:INTERESTED_IN]->(c:Country)<-[:ORIGIN]-(p:Product)
RETURN u.name, p.name
```

Disconnected patterns produce |Users| × |Products| intermediate rows.

### Aggregation Optimization

Filter before aggregating:

```gql
-- Less efficient: Aggregates then filters
MATCH (u:User)-[:TRANSACTION]->(m:Merchant)
WITH u, COUNT(m) AS transaction_count
WHERE transaction_count > 10
RETURN u.name, transaction_count

-- More efficient: Filters then aggregates
MATCH (u:User)-[:TRANSACTION]->(m:Merchant)
WHERE m.suspicious = false
WITH u, COUNT(m) AS transaction_count
WHERE transaction_count > 10
RETURN u.name, transaction_count
```

Reducing data volume before aggregation improves performance.

## Index Strategies

### Single-Property Indexes

Index frequently queried properties:

```gql
CREATE INDEX user_email_idx ON User(email);
CREATE INDEX product_sku_idx ON Product(sku);
CREATE INDEX order_timestamp_idx ON Order(timestamp);
```

### Composite Indexes

Index property combinations queried together:

```gql
-- Query pattern
MATCH (p:Product)
WHERE p.category = $category AND p.price > $min_price
RETURN p

-- Optimal index
CREATE INDEX product_category_price_idx ON Product(category, price);
```

Column order matters: put equality filters before range filters.

### Covering Indexes

Include all needed properties in the index:

```gql
-- Query needs name and email
MATCH (u:User)
WHERE u.country = 'USA'
RETURN u.name, u.email

-- Covering index (avoids table lookup)
CREATE INDEX user_country_covering_idx ON User(country, name, email);
```

The planner can satisfy the query entirely from the index.

### Index Maintenance

Monitor index usage:

```gql
-- Show index statistics
SHOW INDEX STATISTICS;

-- Identify unused indexes
SELECT index_name, read_count, write_count
FROM system.index_stats
WHERE read_count = 0 AND created < current_timestamp() - INTERVAL '30' DAY;
```

Drop unused indexes to reduce write overhead:

```gql
DROP INDEX unused_index_name;
```

## Query Rewriting Patterns

### Subquery Materialization

Extract subqueries that don't depend on outer variables:

```gql
-- Before: Subquery re-executes for each row
MATCH (u:User)
WHERE u.created > (
    SELECT avg(created) FROM User
)
RETURN u.name

-- After: Materialize once
WITH (SELECT avg(created) FROM User) AS avg_created
MATCH (u:User)
WHERE u.created > avg_created
RETURN u.name
```

### EXISTS to JOIN Conversion

Sometimes explicit joins outperform EXISTS:

```gql
-- Using EXISTS
MATCH (u:User)
WHERE EXISTS {
    MATCH (u)-[:PURCHASED]->(:Product {category: 'Electronics'})
}
RETURN u.name

-- Using explicit join
MATCH (u:User)-[:PURCHASED]->(:Product {category: 'Electronics'})
RETURN DISTINCT u.name
```

Profile both to determine which is faster for your data.

### Common Table Expression (CTE) Optimization

Use `WITH` to materialize intermediate results:

```gql
-- Calculate once, use multiple times
WITH (
    MATCH (u:User)
    WHERE u.active = true
    RETURN collect(u.id) AS active_user_ids
)
MATCH (u:User)
WHERE u.id IN active_user_ids
MATCH (u)-[:POSTED]->(p:Post)
RETURN u.name, COUNT(p) AS posts
```

## Troubleshooting Slow Queries

### Step 1: Profile the Query

Run `PROFILE` to identify expensive operators:

```gql
PROFILE
<your slow query>
```

Look for:
- Operators consuming >80% of time
- Large cardinality estimates vs. actuals
- Missing index usage
- Full table scans

### Step 2: Check Index Usage

Verify expected indexes are used:

```gql
EXPLAIN
<your slow query>
```

If indexes aren't used:
- Ensure index exists: `SHOW INDEXES`
- Check statistics are current: `ANALYZE`
- Verify query predicates match index definition

### Step 3: Analyze Cardinalities

Compare estimated vs. actual row counts. Large mismatches indicate:
- Outdated statistics (run `ANALYZE`)
- Correlated predicates planner can't model
- Need for query rewrite

### Step 4: Simplify and Test

Simplify the query to isolate the problem:
- Remove complex subqueries
- Reduce variable-length path bounds
- Remove expensive filters

Test each component individually to identify the bottleneck.

### Step 5: Consider Alternatives

Sometimes structural changes help:
- Materialize frequently computed results
- Denormalize for read-heavy workloads
- Add redundant indexes for specific queries
- Use query hints (if available)

## Best Practices

1. **Profile before optimizing**: Measure actual performance, don't guess
2. **Keep statistics current**: Run `ANALYZE` regularly
3. **Index strategically**: Cover common queries without over-indexing
4. **Start selective**: Begin patterns with most selective filters
5. **Limit results**: Always use `LIMIT` for exploration queries
6. **Bound paths**: Limit variable-length path depth
7. **Avoid Cartesian products**: Ensure patterns are connected
8. **Filter early**: Push predicates into MATCH patterns
9. **Monitor production**: Track slow queries and optimize frequently run ones
10. **Document optimizations**: Explain why specific indexes or query structures exist

## Related Topics

- [Performance and Scaling](/categories/performance-and-scaling/) - Overall performance strategy
- [Indexing](/tags/indexing/) - Index design and management
- [EXPLAIN Command](/tags/explain/) - Query plan analysis
- [PROFILE Command](/tags/profiling/) - Performance measurement
- [Query Language](/categories/query-language/) - GQL fundamentals
- [Best Practices](/categories/best-practices/) - General optimization patterns

## Further Reading

- [Query Execution](/docs/architecture/query-execution/) - Planner internals
- [Index Types](/docs/reference/indexes/) - Index implementation details
- [Statistics](/docs/reference/statistics/) - Statistics system
- [Performance Tuning](/docs/query/performance-tuning/) - Advanced techniques
- [Performance Benchmarking](/docs/guides/performance-benchmarking/) - Performance testing
