---
title: "Query Profiling Guide"
description: "Analyze and optimize GQL queries using EXPLAIN and PROFILE in Geode"
weight: 22
tags: ["profiling", "explain", "performance", "debugging", "optimization"]
categories: ["guides", "performance"]
keywords:
  - query profiling
  - EXPLAIN plan
  - PROFILE execution
  - query analysis
  - performance debugging
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Query Profiling Guide

Understanding how Geode executes your queries is essential for optimization. This guide covers using EXPLAIN and PROFILE to analyze execution plans, identify bottlenecks, and systematically improve query performance.

## EXPLAIN vs PROFILE

Geode provides two tools for query analysis:

| Tool | What It Does | When to Use |
|------|--------------|-------------|
| **EXPLAIN** | Shows the execution plan without running | Planning queries, understanding structure |
| **PROFILE** | Executes query and shows actual metrics | Measuring real performance, finding bottlenecks |

### Using EXPLAIN

EXPLAIN shows the planned execution strategy:

```gql
EXPLAIN
MATCH (user:User {email: "alice@example.com"})-[:POSTED]->(post:Post)
WHERE post.created_at > datetime() - duration('P7D')
RETURN post.title, post.created_at
ORDER BY post.created_at DESC
LIMIT 10
```

**Output**:
```
+---------------------------+
| Plan                      |
+---------------------------+
| Projection                |
| |                         |
| +Sort                     |
|   |                       |
|   +Filter                 |
|     |                     |
|     +Expand(All)          |
|       |                   |
|       +NodeIndexSeek      |
+---------------------------+
```

### Using PROFILE

PROFILE executes the query and collects metrics:

```gql
PROFILE
MATCH (user:User {email: "alice@example.com"})-[:POSTED]->(post:Post)
WHERE post.created_at > datetime() - duration('P7D')
RETURN post.title, post.created_at
ORDER BY post.created_at DESC
LIMIT 10
```

**Output**:
```
+---------------------------+----------------+----------+------------+
| Operator                  | Rows           | DB Hits  | Time (ms)  |
+---------------------------+----------------+----------+------------+
| ProduceResults            | 10             | 0        | 0.1        |
| |                         |                |          |            |
| +Top                      | 10             | 0        | 0.2        |
|   |                       |                |          |            |
|   +Projection             | 42             | 84       | 0.3        |
|     |                     |                |          |            |
|     +Filter               | 42             | 42       | 0.5        |
|       |                   |                |          |            |
|       +Expand(All)        | 156            | 157      | 1.2        |
|         |                 |                |          |            |
|         +NodeIndexSeek    | 1              | 2        | 0.1        |
+---------------------------+----------------+----------+------------+
Total database hits: 285
Total time: 2.4ms
```

## Reading Execution Plans

### Plan Structure

Execution plans read from bottom to top - data flows upward through operators:

```
ProduceResults        <-- Final output (top)
    |
  Sort                <-- Ordering
    |
  Filter              <-- WHERE conditions
    |
  Expand              <-- Relationship traversal
    |
NodeIndexSeek         <-- Starting point (bottom)
```

### Common Operators

#### Data Access Operators

| Operator | Description | Performance |
|----------|-------------|-------------|
| **NodeIndexSeek** | Uses index to find nodes | Fast - O(log n) |
| **NodeByLabelScan** | Scans all nodes with label | Slow - O(n) |
| **NodeByIdSeek** | Finds node by internal ID | Very fast - O(1) |
| **AllNodesScan** | Scans every node | Very slow - avoid |

**Example - Good (index seek)**:
```gql
EXPLAIN
MATCH (u:User {email: "alice@example.com"})
RETURN u

// Plan shows: NodeIndexSeek
```

**Example - Bad (label scan)**:
```gql
EXPLAIN
MATCH (u:User)
WHERE u.signup_source = "organic"
RETURN u

// Plan shows: NodeByLabelScan + Filter
// Consider: CREATE INDEX user_signup ON :User(signup_source)
```

#### Traversal Operators

| Operator | Description | Performance |
|----------|-------------|-------------|
| **Expand(All)** | Follow relationships | O(degree) |
| **Expand(Into)** | Check if relationship exists | O(degree) |
| **VarLengthExpand** | Variable-length paths | O(branching^depth) |
| **ShortestPath** | Find shortest path | Expensive - use with caution |

**Example - Expand**:
```gql
EXPLAIN
MATCH (u:User)-[:FOLLOWS]->(f:User)
RETURN f

// Plan shows: Expand(All) - follows FOLLOWS relationships
```

**Example - VarLengthExpand**:
```gql
EXPLAIN
MATCH (u:User)-[:FOLLOWS*1..3]->(f:User)
RETURN f

// Plan shows: VarLengthExpand - WARNING: can be expensive
```

#### Processing Operators

| Operator | Description | Performance |
|----------|-------------|-------------|
| **Filter** | Apply WHERE conditions | O(n) on input rows |
| **Projection** | Select/transform columns | O(n) - lightweight |
| **Sort** | Order results | O(n log n) |
| **Top** | Sort + limit combined | More efficient than Sort + Limit |
| **Limit** | Restrict output rows | Can short-circuit |
| **Skip** | Skip initial rows | Must process skipped rows |
| **Distinct** | Remove duplicates | O(n) with hash |

#### Aggregation Operators

| Operator | Description | Performance |
|----------|-------------|-------------|
| **EagerAggregation** | GROUP BY with aggregates | O(n) - must see all rows |
| **OrderedAggregation** | Aggregation on sorted input | More efficient |
| **Count** | Count rows | O(n) |

#### Join Operators

| Operator | Description | Performance |
|----------|-------------|-------------|
| **NodeHashJoin** | Hash join on nodes | O(n + m) |
| **ValueHashJoin** | Hash join on values | O(n + m) |
| **CartesianProduct** | Cross product | O(n * m) - WARNING |
| **Apply** | Nested loop join | O(n * m) - can be expensive |

### Key Metrics to Watch

When analyzing PROFILE output:

1. **Rows**: Number of rows passing through each operator
   - Large row counts early = may need better filtering
   - Rows increasing dramatically = possible Cartesian product

2. **DB Hits**: Number of storage accesses
   - High DB hits = more I/O, slower query
   - Compare DB hits to rows for efficiency

3. **Time**: Execution time per operator
   - Identify slowest operators
   - Focus optimization efforts there

4. **Estimated Rows** (EXPLAIN): Planner's row estimates
   - Compare to actual rows in PROFILE
   - Large discrepancies indicate stale statistics

## Identifying Bottlenecks

### High Row Counts

**Problem**: Operators processing too many rows

```
+---------------------------+----------------+
| Operator                  | Rows           |
+---------------------------+----------------+
| Filter                    | 100            |
|   |                       |                |
|   +Expand(All)            | 1,000,000      | <-- Bottleneck!
|     |                     |                |
|     +NodeByLabelScan      | 10,000         |
+---------------------------+----------------+
```

**Solution**: Add index or restructure query

```gql
// Before: Scanning all users, expanding all relationships
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE f.verified = true
RETURN f

// After: Start from verified users (with index)
MATCH (f:User {verified: true})<-[:FOLLOWS]-(u:User)
RETURN f
```

### NodeByLabelScan

**Problem**: Full label scan instead of index

```
+---------------------------+
| Operator                  |
+---------------------------+
| Filter                    |
|   |                       |
|   +NodeByLabelScan        | <-- No index used
+---------------------------+
```

**Solution**: Create appropriate index

```gql
// Identify the filtering property
EXPLAIN
MATCH (p:Product)
WHERE p.category = "electronics"
RETURN p

// Create index
CREATE INDEX product_category ON :Product(category)

// Verify index usage
EXPLAIN
MATCH (p:Product {category: "electronics"})
RETURN p
// Should show: NodeIndexSeek
```

### CartesianProduct

**Problem**: Unconnected patterns creating cross product

```
+---------------------------+----------------+
| Operator                  | Rows           |
+---------------------------+----------------+
| CartesianProduct          | 10,000,000     | <-- Explosive!
|   |\                      |                |
|   | NodeByLabelScan       | 10,000         |
|   |                       |                |
|   +NodeByLabelScan        | 1,000          |
+---------------------------+----------------+
```

**Solution**: Connect patterns or split queries

```gql
// Before: Cartesian product
MATCH (u:User), (p:Product)
WHERE u.country = p.origin_country
RETURN u, p

// After: Connected pattern
MATCH (u:User)-[:INTERESTED_IN]->(:Category)<-[:IN_CATEGORY]-(p:Product)
WHERE u.country = p.origin_country
RETURN u, p
```

### Expensive VarLengthExpand

**Problem**: Unbounded or deep variable-length patterns

```
+---------------------------+----------------+----------+
| Operator                  | Rows           | Time     |
+---------------------------+----------------+----------+
| VarLengthExpand           | 5,000,000      | 4500ms   | <-- Very slow!
|   |                       |                |          |
|   +NodeIndexSeek          | 1              | 1ms      |
+---------------------------+----------------+----------+
```

**Solution**: Bound the depth, add intermediate filtering

```gql
// Before: Unbounded depth
MATCH path = (start:Person)-[:KNOWS*]->(end:Person)
RETURN path

// After: Bounded depth
MATCH path = (start:Person)-[:KNOWS*1..4]->(end:Person)
RETURN path
LIMIT 1000

// Even better: Filter at each hop
MATCH path = (start:Person {id: $id})-[:KNOWS*1..3]->(end:Person)
WHERE ALL(n IN nodes(path) WHERE n.active = true)
RETURN path
```

### Late Filtering

**Problem**: Filters applied after expensive operations

```
+---------------------------+----------------+----------+
| Operator                  | Rows           | Time     |
+---------------------------+----------------+----------+
| Filter                    | 10             | 50ms     |
|   |                       |                |          |
|   +Sort                   | 100,000        | 500ms    | <-- Sorted everything
|     |                     |                |          |
|     +Expand               | 100,000        | 200ms    |
|       |                   |                |          |
|       +NodeByLabelScan    | 10,000         | 100ms    |
+---------------------------+----------------+----------+
```

**Solution**: Filter earlier

```gql
// Before: Filter after sort
MATCH (u:User)-[:POSTED]->(p:Post)
RETURN p
ORDER BY p.created_at
LIMIT 10
// Then filtering for specific user in application

// After: Filter first
MATCH (u:User {id: $user_id})-[:POSTED]->(p:Post)
RETURN p
ORDER BY p.created_at
LIMIT 10
```

## Query Optimization Workflow

### Step 1: Baseline Measurement

Profile the original query to establish baseline:

```gql
PROFILE
MATCH (user:User)-[:PURCHASED]->(product:Product)
WHERE product.category = "electronics"
  AND product.price > 100
RETURN user.name, product.name, product.price
ORDER BY product.price DESC
LIMIT 20
```

Record metrics:
- Total time: 450ms
- Total DB hits: 125,000
- Rows at each stage

### Step 2: Identify Bottlenecks

Analyze the profile output:

```
+---------------------------+----------------+----------+------------+
| Operator                  | Rows           | DB Hits  | Time (ms)  |
+---------------------------+----------------+----------+------------+
| Top                       | 20             | 0        | 1          |
| |                         |                |          |            |
| +Projection               | 500            | 1000     | 5          |
|   |                       |                |          |            |
|   +Filter                 | 500            | 500      | 10         |
|     |                     |                |          |            |
|     +Expand               | 50,000         | 50,001   | 200        | <-- High rows
|       |                   |                |          |            |
|       +NodeByLabelScan    | 10,000         | 73,500   | 230        | <-- No index!
+---------------------------+----------------+----------+------------+
```

Bottlenecks identified:
1. NodeByLabelScan on User (no index)
2. 50,000 rows from Expand before filtering
3. Filter on Product properties applied late

### Step 3: Apply Optimizations

**Optimization 1**: Start from indexed Product instead:

```gql
// Create index on Product category and price
CREATE INDEX product_category_price ON :Product(category, price)
```

**Optimization 2**: Restructure query:

```gql
PROFILE
MATCH (product:Product)
WHERE product.category = "electronics"
  AND product.price > 100
WITH product
ORDER BY product.price DESC
LIMIT 20
MATCH (user:User)-[:PURCHASED]->(product)
RETURN user.name, product.name, product.price
```

### Step 4: Measure Improvement

Profile the optimized query:

```
+---------------------------+----------------+----------+------------+
| Operator                  | Rows           | DB Hits  | Time (ms)  |
+---------------------------+----------------+----------+------------+
| Projection                | 20             | 40       | 1          |
| |                         |                |          |            |
| +Expand                   | 20             | 40       | 2          |
|   |                       |                |          |            |
|   +Top                    | 20             | 0        | 1          |
|     |                     |                |          |            |
|     +NodeIndexSeek        | 500            | 501      | 5          |
+---------------------------+----------------+----------+------------+
```

Results:
- Total time: 9ms (98% improvement)
- Total DB hits: 581 (99.5% reduction)

### Step 5: Document and Monitor

Record the optimization:

```markdown
## Query: User Purchases by Category

### Original
- Time: 450ms
- DB Hits: 125,000
- Issue: Full User scan, late Product filtering

### Optimized
- Time: 9ms
- DB Hits: 581
- Changes:
  1. Created composite index on Product(category, price)
  2. Restructured to start from Product with early LIMIT
  3. Expand to User as final step

### Index Added
CREATE INDEX product_category_price ON :Product(category, price)
```

## Before/After Comparisons

### Example 1: Adding an Index

**Before** (no index):
```gql
PROFILE
MATCH (u:User)
WHERE u.email = "alice@example.com"
RETURN u
```
```
+---------------------------+----------------+----------+
| Operator                  | Rows           | DB Hits  |
+---------------------------+----------------+----------+
| Filter                    | 1              | 0        |
|   |                       |                |          |
|   +NodeByLabelScan        | 1,000,000      | 2,000,000|
+---------------------------+----------------+----------+
Time: 850ms
```

**After** (with index):
```gql
-- CREATE INDEX user_email ON :User(email)

PROFILE
MATCH (u:User {email: "alice@example.com"})
RETURN u
```
```
+---------------------------+----------------+----------+
| Operator                  | Rows           | DB Hits  |
+---------------------------+----------------+----------+
| NodeIndexSeek             | 1              | 2        |
+---------------------------+----------------+----------+
Time: 1ms
```

**Improvement**: 850x faster, 1,000,000x fewer DB hits

### Example 2: Restructuring Pattern Order

**Before** (starting from less selective node):
```gql
PROFILE
MATCH (post:Post)-[:WRITTEN_BY]->(author:Author {verified: true})
WHERE post.published = true
RETURN post.title, author.name
LIMIT 10
```
```
+---------------------------+----------------+----------+
| Operator                  | Rows           | DB Hits  |
+---------------------------+----------------+----------+
| Top                       | 10             | 0        |
| |                         |                |          |
| +Filter                   | 500            | 500      |
|   |                       |                |          |
|   +Expand                 | 10,000         | 10,001   |
|     |                     |                |          |
|     +NodeByLabelScan      | 10,000         | 30,000   |
+---------------------------+----------------+----------+
Time: 120ms
```

**After** (starting from more selective indexed node):
```gql
-- CREATE INDEX author_verified ON :Author(verified)

PROFILE
MATCH (author:Author {verified: true})-[:WROTE]->(post:Post)
WHERE post.published = true
RETURN post.title, author.name
LIMIT 10
```
```
+---------------------------+----------------+----------+
| Operator                  | Rows           | DB Hits  |
+---------------------------+----------------+----------+
| Top                       | 10             | 0        |
| |                         |                |          |
| +Filter                   | 50             | 50       |
|   |                       |                |          |
|   +Expand                 | 200            | 201      |
|     |                     |                |          |
|     +NodeIndexSeek        | 100            | 101      |
+---------------------------+----------------+----------+
Time: 8ms
```

**Improvement**: 15x faster, 115x fewer DB hits

### Example 3: Using WITH for Early Aggregation

**Before** (aggregating at the end):
```gql
PROFILE
MATCH (user:User)-[:FOLLOWS]->(followed:User)-[:POSTED]->(post:Post)
WHERE user.id = $user_id
RETURN followed.name, count(post) AS post_count
ORDER BY post_count DESC
LIMIT 10
```
```
+---------------------------+----------------+----------+
| Operator                  | Rows           | DB Hits  |
+---------------------------+----------------+----------+
| Top                       | 10             | 0        |
| |                         |                |          |
| +EagerAggregation         | 500            | 0        |
|   |                       |                |          |
|   +Expand                 | 50,000         | 50,001   |  <-- Many posts
|     |                     |                |          |
|     +Expand               | 500            | 501      |
|       |                   |                |          |
|       +NodeIndexSeek      | 1              | 2        |
+---------------------------+----------------+----------+
Time: 180ms
```

**After** (limiting followed users first):
```gql
PROFILE
MATCH (user:User {id: $user_id})-[:FOLLOWS]->(followed:User)
WITH followed
ORDER BY followed.follower_count DESC
LIMIT 50
MATCH (followed)-[:POSTED]->(post:Post)
RETURN followed.name, count(post) AS post_count
ORDER BY post_count DESC
LIMIT 10
```
```
+---------------------------+----------------+----------+
| Operator                  | Rows           | DB Hits  |
+---------------------------+----------------+----------+
| Top                       | 10             | 0        |
| |                         |                |          |
| +EagerAggregation         | 50             | 0        |
|   |                       |                |          |
|   +Expand                 | 5,000          | 5,001    |  <-- Reduced posts
|     |                     |                |          |
|     +Top                  | 50             | 0        |
|       |                   |                |          |
|       +Expand             | 500            | 501      |
|         |                 |                |          |
|         +NodeIndexSeek    | 1              | 2        |
+---------------------------+----------------+----------+
Time: 25ms
```

**Improvement**: 7x faster, 10x fewer rows processed

## Advanced Profiling Techniques

### Comparing Plan Variants

Test multiple query formulations:

```gql
// Variant A: Standard pattern
PROFILE
MATCH (a:Person)-[:KNOWS]->(b:Person)-[:KNOWS]->(c:Person)
WHERE a.name = "Alice"
RETURN DISTINCT c.name

// Variant B: Using WITH
PROFILE
MATCH (a:Person {name: "Alice"})-[:KNOWS]->(b:Person)
WITH DISTINCT b
MATCH (b)-[:KNOWS]->(c:Person)
RETURN DISTINCT c.name

// Variant C: Using shortestPath (if applicable)
PROFILE
MATCH (a:Person {name: "Alice"}), (c:Person)
WHERE (a)-[:KNOWS*2..2]->(c)
RETURN DISTINCT c.name
```

Compare total time and DB hits to choose the best variant.

### Profiling with Parameters

Always profile with realistic parameter values:

```gql
// Profile with edge case (very connected user)
:param user_id => "power_user_123"
PROFILE
MATCH (u:User {id: $user_id})-[:FOLLOWS]->(f:User)
RETURN count(f)

// Profile with typical case
:param user_id => "average_user_456"
PROFILE
MATCH (u:User {id: $user_id})-[:FOLLOWS]->(f:User)
RETURN count(f)
```

### Analyzing Memory Usage

For complex queries, check memory consumption:

```gql
PROFILE
MATCH (a)-[r*1..5]->(b)
WHERE a.id = $id
RETURN count(DISTINCT b)
```

Watch for operators that accumulate state:
- `EagerAggregation`: Holds all groups in memory
- `Sort`: Holds all rows to sort
- `Distinct`: Maintains hash set of seen values
- `Collect`: Accumulates list in memory

## Profiling Checklist

When optimizing a query:

- [ ] **Profile the original** - Establish baseline metrics
- [ ] **Identify expensive operators** - Focus on highest time/DB hits
- [ ] **Check for label scans** - NodeByLabelScan often indicates missing index
- [ ] **Look for Cartesian products** - CartesianProduct is usually a bug
- [ ] **Verify index usage** - Ensure NodeIndexSeek where expected
- [ ] **Check row counts** - Large intermediate counts indicate filtering issues
- [ ] **Test with realistic data** - Small test data may hide problems
- [ ] **Document improvements** - Record before/after metrics

## Common Profiling Patterns

### Pattern: Index Verification

```gql
// Check if index is used
EXPLAIN
MATCH (u:User {email: $email})
RETURN u

// If NodeByLabelScan shown, create index:
CREATE INDEX user_email ON :User(email)

// Verify index usage:
EXPLAIN
MATCH (u:User {email: $email})
RETURN u
// Should show NodeIndexSeek
```

### Pattern: Finding Hot Spots

```gql
// Profile and sort by time
PROFILE
MATCH (complex query here)
RETURN results

// Look at the Time column - operators taking >50% of total time
// are optimization targets
```

### Pattern: Comparing Index Types

```gql
// Test B-tree index
CREATE INDEX user_age_btree ON :User(age)
PROFILE
MATCH (u:User) WHERE u.age > 25 AND u.age < 35 RETURN count(u)
DROP INDEX user_age_btree

// B-tree is better for range queries
// Hash is better for equality-only queries
```

## Summary

Effective query profiling follows these principles:

1. **Use EXPLAIN for planning**: Understand query structure before execution
2. **Use PROFILE for measurement**: Get real execution metrics
3. **Read bottom-to-top**: Data flows upward through operators
4. **Focus on bottlenecks**: Optimize the slowest, most expensive operators
5. **Compare before/after**: Quantify improvements
6. **Test with real data**: Small datasets hide performance issues
7. **Document findings**: Record optimizations for future reference

## Related Guides

- [Query Performance Guide](/guides/query-performance/) - Writing efficient queries
- [Index Strategy Guide](/guides/index-strategy/) - Creating effective indexes
- [Graph Modeling Guide](/guides/graph-modeling/) - Schema design for performance

---

**Questions?** Discuss query profiling in our [forum](https://forum.geodedb.com).
