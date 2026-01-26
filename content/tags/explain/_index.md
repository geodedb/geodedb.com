---
title: "Query Execution Plans (EXPLAIN)"
description: "Master query optimization in Geode with EXPLAIN and PROFILE: analyze execution plans, identify bottlenecks, and optimize graph query performance."
keywords:
  - explain
  - query execution plans
  - query optimization
  - profile
  - performance analysis
  - query planning
  - execution strategy
  - query tuning
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/explain/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

EXPLAIN and PROFILE are essential tools for understanding and optimizing query performance in Geode. They provide visibility into how the query planner executes your GQL queries, helping you identify bottlenecks and optimize performance.

## What is EXPLAIN?

EXPLAIN shows the query execution plan without actually running the query. It reveals:

- **Execution Steps**: What operations will be performed
- **Order of Operations**: The sequence of execution
- **Index Usage**: Which indexes will be used
- **Estimated Costs**: Relative cost estimates for each operation
- **Optimization Decisions**: How the query planner optimized your query

PROFILE goes further by executing the query and providing actual runtime statistics including row counts, execution times, and memory usage.

## Basic Usage

### EXPLAIN Syntax

```gql
// Show execution plan without running query
EXPLAIN
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.id = 123
RETURN f.name, f.email

// Output shows plan but doesn't execute query
```

### PROFILE Syntax

```gql
// Show execution plan AND run query with actual statistics
PROFILE
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.id = 123
RETURN f.name, f.email

// Output includes actual row counts, timing, and memory usage
```

## Understanding Execution Plans

### Plan Structure

```gql
EXPLAIN
MATCH (u:User {email: 'alice@example.com'})-[:POSTED]->(p:Post)
WHERE p.published = true
RETURN p.title, p.created_at
ORDER BY p.created_at DESC
LIMIT 10
```

**Example Output**:
```
Limit (rows=10)
  Sort (key=p.created_at DESC)
    Filter (p.published = true)
      Expand (u)-[:POSTED]->(p:Post)
        NodeIndexSeek (u:User, email='alice@example.com')
          [Index: User.email]
```

**Reading the Plan** (bottom to top):
1. **NodeIndexSeek**: Use index on User.email to find user
2. **Expand**: Traverse POSTED relationships to find posts
3. **Filter**: Keep only published posts
4. **Sort**: Order results by created_at descending
5. **Limit**: Take only first 10 results

### Common Plan Operators

#### Index Operations

```gql
// NodeIndexSeek - Fast index lookup
EXPLAIN
MATCH (u:User {email: 'alice@example.com'})
RETURN u
// Plan: NodeIndexSeek (u:User, email='alice@example.com')

// NodeIndexScan - Scan entire index
EXPLAIN
MATCH (u:User)
WHERE u.verified = true
RETURN u
// Plan: NodeIndexScan (u:User, verified=true)

// NodeLabelScan - Scan all nodes with label
EXPLAIN
MATCH (u:User)
RETURN u
// Plan: NodeLabelScan (u:User)

// AllNodesScan - Scan all nodes (slowest)
EXPLAIN
MATCH (n)
RETURN n
// Plan: AllNodesScan
```

#### Relationship Traversal

```gql
// Expand - Traverse relationships
EXPLAIN
MATCH (u:User)-[:FOLLOWS]->(f:User)
RETURN f
// Plan: Expand (u)-[:FOLLOWS]->(f:User)

// VarLengthExpand - Variable-length path traversal
EXPLAIN
MATCH (u:User)-[:KNOWS*1..3]->(friend)
RETURN friend
// Plan: VarLengthExpand (u)-[:KNOWS*1..3]->(friend)

// OptionalExpand - Left outer join
EXPLAIN
MATCH (u:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
RETURN u, p
// Plan: OptionalExpand (u)-[:POSTED]->(p:Post)
```

#### Filtering and Processing

```gql
// Filter - Apply WHERE conditions
EXPLAIN
MATCH (u:User)
WHERE u.age >= 18 AND u.verified = true
RETURN u
// Plan: Filter (u.age >= 18 AND u.verified = true)

// Sort - ORDER BY clause
EXPLAIN
MATCH (u:User)
RETURN u.name
ORDER BY u.created_at DESC
// Plan: Sort (u.created_at DESC)

// Limit - LIMIT clause
EXPLAIN
MATCH (u:User)
RETURN u
LIMIT 10
// Plan: Limit (rows=10)

// Skip - OFFSET clause
EXPLAIN
MATCH (u:User)
RETURN u
OFFSET 20 LIMIT 10
// Plan: Limit (rows=10)
//       Skip (rows=20)
```

#### Aggregation

```gql
// Aggregate - Grouping and aggregation
EXPLAIN
MATCH (u:User)-[:POSTED]->(p:Post)
RETURN u.name, COUNT(p) AS post_count
// Plan: Aggregate (key=[u.name], agg=[COUNT(p)])

// Distinct - Remove duplicates
EXPLAIN
MATCH (u:User)-[:POSTED]->(p:Post)-[:HAS_TAG]->(t:Tag)
RETURN DISTINCT t.name
// Plan: Distinct (t.name)
```

## PROFILE Statistics

### Runtime Metrics

```gql
PROFILE
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE u.verified = true
  AND p.published = true
RETURN u.name, COUNT(p) AS posts
ORDER BY posts DESC
LIMIT 10
```

**Example PROFILE Output**:
```
Limit (rows=10) [actual_rows=10, time=0.2ms]
  Sort (key=posts DESC) [actual_rows=1523, time=5.4ms, memory=256KB]
    Aggregate (key=[u.name], agg=[COUNT(p)]) [actual_rows=1523, time=12.3ms]
      Filter (p.published = true) [actual_rows=42891, time=8.7ms]
        Expand (u)-[:POSTED]->(p:Post) [actual_rows=45203, time=15.2ms]
          Filter (u.verified = true) [actual_rows=8234, time=3.1ms]
            NodeLabelScan (u:User) [actual_rows=10000, time=2.8ms]
              [scanned: 10000 nodes]
```

**Key Metrics**:
- **actual_rows**: Number of rows produced by this step
- **time**: Time spent in this operation
- **memory**: Memory used (for operations like Sort, Aggregate)
- **scanned**: Number of nodes/relationships examined

### Identifying Performance Issues

#### High Row Count Discrepancy

```gql
// Problem: Scanning many rows, returning few
PROFILE
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE u.email = 'alice@example.com'
RETURN p

// Output shows:
// Expand [...] [actual_rows=100]
//   NodeLabelScan (u:User) [actual_rows=1000000]
//
// ISSUE: Scanning 1M users to find 1 user!
// SOLUTION: Add index on User.email
```

#### Expensive Sorts

```gql
// Problem: Sorting large result sets
PROFILE
MATCH (p:Post)
RETURN p.title
ORDER BY p.created_at DESC
LIMIT 10

// Output shows:
// Limit [...] [actual_rows=10]
//   Sort [...] [actual_rows=10000000, time=5000ms, memory=2GB]
//
// ISSUE: Sorting 10M rows to get 10 results
// SOLUTION: Use index on created_at for sorted scan
```

#### Cartesian Products

```gql
// Problem: Unintended Cartesian product
PROFILE
MATCH (u:User), (p:Post)
WHERE u.location = p.location
RETURN u, p

// Output shows:
// Filter [...] [actual_rows=5000]
//   CartesianProduct [actual_rows=100000000]
//     NodeLabelScan (u:User) [actual_rows=10000]
//     NodeLabelScan (p:Post) [actual_rows=10000]
//
// ISSUE: 10K * 10K = 100M intermediate rows!
// SOLUTION: Add relationship or index-backed join
```

## Optimization Techniques

### Index Creation

```gql
// Identify missing index
PROFILE
MATCH (u:User)
WHERE u.email = 'alice@example.com'
RETURN u

// Output shows NodeLabelScan - no index!
// Plan: NodeLabelScan (u:User) [actual_rows=1000000]
//       Filter (u.email = 'alice@example.com') [actual_rows=1]

// Solution: Create index
CREATE INDEX FOR (u:User) ON (u.email)

// Verify index usage
EXPLAIN
MATCH (u:User)
WHERE u.email = 'alice@example.com'
RETURN u
// Plan now shows: NodeIndexSeek (u:User, email='alice@example.com')
```

### Filter Pushdown

```gql
// Before optimization
PROFILE
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE u.verified = true
RETURN p

// Better: Filter early
PROFILE
MATCH (u:User)
WHERE u.verified = true
MATCH (u)-[:POSTED]->(p:Post)
RETURN p

// Best: Use inline filter
PROFILE
MATCH (u:User {verified: true})-[:POSTED]->(p:Post)
RETURN p
```

### Limit Early

```gql
// Inefficient: Sort then limit
PROFILE
MATCH (u:User)
RETURN u.name
ORDER BY u.created_at DESC
LIMIT 10

// Efficient: Use top-N optimization
// (Geode automatically optimizes this pattern)
PROFILE
MATCH (u:User)
RETURN u.name
ORDER BY u.created_at DESC
LIMIT 10
```

### Index-Backed Ordering

```gql
// Create index for ordering
CREATE INDEX FOR (p:Post) ON (p.created_at)

// Before index
EXPLAIN
MATCH (p:Post)
RETURN p.title
ORDER BY p.created_at DESC
// Plan: Sort (p.created_at DESC)
//       NodeLabelScan (p:Post)

// After index
EXPLAIN
MATCH (p:Post)
RETURN p.title
ORDER BY p.created_at DESC
// Plan: NodeIndexScan (p:Post, order=created_at DESC)
// No separate Sort operation needed!
```

## Advanced Analysis

### Comparing Query Alternatives

```gql
// Option 1: Aggregate then filter
EXPLAIN
MATCH (u:User)-[:POSTED]->(p:Post)
WITH u, COUNT(p) AS post_count
WHERE post_count > 10
RETURN u.name, post_count

// Option 2: Filter then aggregate
EXPLAIN
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE p.published = true
WITH u, COUNT(p) AS post_count
WHERE post_count > 10
RETURN u.name, post_count

// Compare plans to see which is more efficient
```

### Analyzing Variable-Length Paths

```gql
// Check path expansion cost
PROFILE
MATCH path = (a:User {id: 1})-[:KNOWS*1..3]->(b:User)
RETURN b.name, LENGTH(path) AS hops

// Output shows:
// VarLengthExpand [...] [actual_rows=15234, time=234ms]
//   NodeIndexSeek (a:User, id=1) [actual_rows=1]
//
// If too expensive, consider:
// - Reducing max hops
// - Adding relationship property filters
// - Using shortest path instead
```

### Subquery Performance

```gql
// Analyze subquery efficiency
PROFILE
MATCH (u:User)
WHERE EXISTS {
  MATCH (u)-[:POSTED]->(p:Post)
  WHERE p.likes > 100
}
RETURN u.name

// Look for Semi-Apply or Anti-Apply operators
// Plan: SemiApply
//         Expand (u)-[:POSTED]->(p:Post)
//           Filter (p.likes > 100)
//       NodeLabelScan (u:User)
```

## Real-World Optimization Examples

### Example 1: Slow User Profile Query

```gql
// Original query (slow)
PROFILE
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE u.username = 'alice'
RETURN u.name, COUNT(p) AS posts

// Plan shows:
// Aggregate [...] [actual_rows=1]
//   Expand (u)-[:POSTED]->(p) [actual_rows=100]
//     Filter (u.username = 'alice') [actual_rows=1]
//       NodeLabelScan (u:User) [actual_rows=1000000, time=500ms]

// Problem: Scanning 1M users

// Solution: Add index
CREATE INDEX FOR (u:User) ON (u.username)

// Optimized query
PROFILE
MATCH (u:User {username: 'alice'})-[:POSTED]->(p:Post)
RETURN u.name, COUNT(p) AS posts

// New plan:
// Aggregate [...] [actual_rows=1]
//   Expand (u)-[:POSTED]->(p) [actual_rows=100]
//     NodeIndexSeek (u:User, username='alice') [actual_rows=1, time=0.1ms]

// Improvement: 5000x faster!
```

### Example 2: Expensive Recommendation Query

```gql
// Original query (very slow)
PROFILE
MATCH (u:User)-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(other:User)
MATCH (other)-[:PURCHASED]->(rec:Product)
WHERE u.id = 123
  AND NOT (u)-[:PURCHASED]->(rec)
RETURN rec.name, COUNT(other) AS similar_users
ORDER BY similar_users DESC
LIMIT 10

// Plan shows Cartesian product and late filtering

// Optimized query
PROFILE
MATCH (u:User {id: 123})-[:PURCHASED]->(p:Product)
WITH u, COLLECT(p) AS purchased
MATCH (p IN purchased)<-[:PURCHASED]-(other:User)-[:PURCHASED]->(rec:Product)
WHERE NOT rec IN purchased
  AND rec <> p
RETURN rec.name, COUNT(DISTINCT other) AS similar_users
ORDER BY similar_users DESC
LIMIT 10

// New plan shows early anchoring and reduced intermediate rows
```

### Example 3: Inefficient Sorting

```gql
// Original query
PROFILE
MATCH (p:Post)
WHERE p.category = 'tech'
RETURN p.title, p.created_at
ORDER BY p.created_at DESC
LIMIT 20

// Plan shows:
// Limit [...] [actual_rows=20]
//   Sort [...] [actual_rows=500000, time=2000ms, memory=1GB]
//     Filter (p.category = 'tech') [actual_rows=500000]
//       NodeLabelScan (p:Post) [actual_rows=5000000]

// Solution: Composite index
CREATE INDEX FOR (p:Post) ON (p.category, p.created_at)

// Optimized plan:
// Limit [...] [actual_rows=20, time=0.5ms]
//   NodeIndexScan (p:Post, category='tech', order=created_at DESC)
//     [actual_rows=20]  // Only reads 20 rows!
```

## Client Library Integration

### Python

```python
from geode_client import Client

client = Client(host="localhost", port=3141)

async with client.connection() as conn:
    # Get EXPLAIN output
    result, _ = await conn.query("""
        EXPLAIN
        MATCH (u:User)-[:FOLLOWS]->(f:User)
        WHERE u.id = $user_id
        RETURN f.name
    """, {"user_id": 123})

    # Plan is in result metadata
    plan = result.execution_plan
    print(f"Plan: {plan}")

    # Get PROFILE statistics
    result, _ = await conn.query("""
        PROFILE
        MATCH (u:User)-[:FOLLOWS]->(f:User)
        WHERE u.id = $user_id
        RETURN f.name
    """, {"user_id": 123})

    stats = result.profile_stats
    print(f"Total time: {stats['total_time_ms']}ms")
    print(f"Rows examined: {stats['rows_examined']}")
```

### Go

```go
import "database/sql"
import _ "go.codepros.org/geode"

db, _ := sql.Open("geode", "geode://localhost:3141")

// Execute EXPLAIN
rows, _ := db.Query(`
    EXPLAIN
    MATCH (u:User)-[:FOLLOWS]->(f:User)
    WHERE u.id = $1
    RETURN f.name
`, 123)

// Read plan from result
for rows.Next() {
    var planStep string
    rows.Scan(&planStep)
    fmt.Println(planStep)
}

// Execute PROFILE
rows, _ = db.Query(`
    PROFILE
    MATCH (u:User)-[:FOLLOWS]->(f:User)
    WHERE u.id = $1
    RETURN f.name
`, 123)

// Profile results include stats
```

### Rust

```rust
use geode_client::Client;

let client = Client::connect("localhost:3141").await?;

// Get EXPLAIN plan
let result = client.query(
    r#"
        EXPLAIN
        MATCH (u:User)-[:FOLLOWS]->(f:User)
        WHERE u.id = $user_id
        RETURN f.name
    "#,
    &[("user_id", &123)],
).await?;

println!("Execution plan: {}", result.explain_plan().unwrap());

// Get PROFILE statistics
let result = client.query(
    r#"
        PROFILE
        MATCH (u:User)-[:FOLLOWS]->(f:User)
        WHERE u.id = $user_id
        RETURN f.name
    "#,
    &[("user_id", &123)],
).await?;

let stats = result.profile_stats().unwrap();
println!("Total time: {}ms", stats.total_time_ms);
println!("Rows examined: {}", stats.rows_examined);
```

## Best Practices

1. **Always EXPLAIN First**: Before optimizing, understand the current plan
2. **Create Indexes Strategically**: Add indexes for frequently filtered properties
3. **Use PROFILE for Real Data**: Estimated costs can differ from actual performance
4. **Compare Alternatives**: Use EXPLAIN to compare different query formulations
5. **Monitor Production**: Track query performance over time as data grows
6. **Index Selectivity**: Prioritize indexes on high-selectivity properties
7. **Avoid Over-Indexing**: Too many indexes slow down writes
8. **Composite Indexes**: Use for common multi-property filters and ordering

## Common Plan Patterns

### Good Plans

```
// Index seek with minimal rows
NodeIndexSeek (u:User, email='...') [actual_rows=1]
  Expand (u)-[:POSTED]->(p) [actual_rows=10]

// Early filtering
Filter (u.verified = true) [actual_rows=1000]
  NodeLabelScan (u:User) [actual_rows=1500]

// Index-backed ordering
NodeIndexScan (p:Post, order=created_at DESC) [actual_rows=10]
```

### Problematic Plans

```
// Full table scan
NodeLabelScan (u:User) [actual_rows=10000000]
  Filter (u.email = '...') [actual_rows=1]

// Cartesian product
CartesianProduct [actual_rows=100000000]

// Large sort
Sort [...] [actual_rows=5000000, memory=10GB]

// Unbounded expansion
VarLengthExpand (...)-[:KNOWS*]->(...) [actual_rows=50000000]
```

## Troubleshooting Guide

### Query Taking Too Long

1. Run PROFILE to identify bottleneck
2. Look for high-cost operations (Sort, Filter with many rows)
3. Check if indexes are being used
4. Consider query restructuring

### High Memory Usage

1. Look for Sort operators on large result sets
2. Check Aggregate operations
3. Consider pagination (LIMIT/OFFSET)
4. Use streaming in client libraries

### Unexpected Results

1. Check actual_rows vs. expected
2. Verify filter conditions are applied
3. Look for Cartesian products
4. Ensure correct relationship directions

## Related Topics

- **Query Language**: GQL query syntax and patterns
- **Indexing**: Creating and managing indexes
- **Performance**: Query optimization strategies
- **MATCH Clause**: Pattern matching fundamentals
- **Monitoring**: Production query monitoring

## Further Reading

- [Query Language](/tags/query-language/) - Complete GQL guide
- [Performance](/tags/performance/) - Performance tuning
- [Indexing](/tags/indexing/) - Index strategies
- [MATCH Clause](/tags/match/) - Pattern matching
- [Monitoring](/tags/monitoring/) - Production monitoring

EXPLAIN and PROFILE are indispensable tools for developing high-performance graph queries in Geode, enabling you to understand, optimize, and maintain query performance as your data grows.
