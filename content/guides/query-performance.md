---
title: "Query Performance Guide"
slug: "query-performance"
description: "Optimize your GQL queries for maximum performance in Geode"
weight: 20
tags: ["performance", "optimization", "queries", "best-practices"]
categories: ["guides", "performance"]
keywords:
  - query performance
  - GQL optimization
  - graph query tuning
  - Geode performance
  - query efficiency
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Query Performance Guide

Writing efficient GQL queries is essential for building responsive applications. This guide covers query execution fundamentals, optimization techniques, and common pitfalls to avoid.

## Understanding Query Execution

### How Geode Executes Queries

When you submit a GQL query, Geode processes it through several stages:

1. **Parsing**: Query text is parsed into an abstract syntax tree (AST)
2. **Planning**: The query planner creates an execution plan
3. **Optimization**: The optimizer rewrites the plan for efficiency
4. **Execution**: The engine executes the optimized plan
5. **Result Assembly**: Results are collected and returned

```gql
// This simple query...
MATCH (p:Person)-[:KNOWS]->(friend:Person)
WHERE p.name = "Alice"
RETURN friend.name

// ...becomes an execution plan:
// 1. Index scan on Person(name) for "Alice"
// 2. Expand relationships [:KNOWS]
// 3. Filter by Person label on target
// 4. Project friend.name
```

### Execution Plan Components

Understanding plan components helps you write better queries:

| Component | Description | Performance Impact |
|-----------|-------------|-------------------|
| **NodeByLabelScan** | Scans all nodes with a label | O(n) - slow for large datasets |
| **NodeIndexSeek** | Uses index to find nodes | O(log n) - fast |
| **Expand** | Follows relationships | O(degree) - varies by connectivity |
| **Filter** | Applies WHERE conditions | O(n) - applied to current result set |
| **Projection** | Selects return columns | O(n) - minimal overhead |

## Writing Efficient MATCH Patterns

### Start with Selective Nodes

Always begin your MATCH pattern with the most selective (narrowest) node. This minimizes the initial working set.

**Inefficient** (scans all Posts first):

```gql
MATCH (post:Post)<-[:POSTED]-(user:User {username: "alice"})
RETURN post.title
```

**Efficient** (uses index on User.username):

```gql
MATCH (user:User {username: "alice"})-[:POSTED]->(post:Post)
RETURN post.title
```

### Use Specific Relationship Types

Specify relationship types when possible to reduce exploration:

**Inefficient** (explores all relationship types):

```gql
MATCH (a:Person)-[r]->(b:Person)
WHERE type(r) = "KNOWS"
RETURN a, b
```

**Efficient** (only explores KNOWS relationships):

```gql
MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN a, b
```

### Limit Relationship Depth

Variable-length patterns can be expensive. Always set bounds:

**Dangerous** (unbounded traversal):

```gql
MATCH (start:Person)-[:KNOWS*]->(end:Person)
RETURN end
```

**Safe** (bounded traversal):

```gql
MATCH (start:Person)-[:KNOWS*1..4]->(end:Person)
RETURN end
```

### Choose Relationship Direction

Directional patterns are more efficient than undirected ones:

**Less efficient** (explores both directions):

```gql
MATCH (a:Person)-[:KNOWS]-(b:Person)
RETURN a, b
```

**More efficient** (specific direction):

```gql
MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN a, b
```

## Avoiding Cartesian Products

A Cartesian product occurs when two unconnected patterns create all possible combinations, leading to explosive result sets.

### Recognizing Cartesian Products

**Cartesian product** (users x products = millions of rows):

```gql
MATCH (u:User), (p:Product)
RETURN u.name, p.name
```

**Connected pattern** (only related pairs):

```gql
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name, p.name
```

### Unintentional Cartesian Products

Watch for separated patterns in the same MATCH:

**Cartesian product** (a,b and c,d are unconnected):

```gql
MATCH (a:Person)-[:KNOWS]->(b:Person),
      (c:Company)-[:LOCATED_IN]->(d:City)
RETURN a, b, c, d
```

**Solution 1** - Connect the patterns:

```gql
MATCH (a:Person)-[:KNOWS]->(b:Person)-[:WORKS_AT]->(c:Company)-[:LOCATED_IN]->(d:City)
RETURN a, b, c, d
```

**Solution 2** - Use separate queries:

```gql
// Query 1
MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN a, b

// Query 2
MATCH (c:Company)-[:LOCATED_IN]->(d:City)
RETURN c, d
```

### Detecting Cartesian Products

Use EXPLAIN to identify Cartesian products:

```gql
EXPLAIN
MATCH (u:User), (p:Product)
RETURN u.name, p.name
```

Look for `CartesianProduct` in the execution plan - this is a warning sign.

## Using WITH for Query Chaining

The WITH clause allows you to chain query parts, reducing intermediate result sets and enabling optimizations.

### Filtering Early with WITH

**Inefficient** (processes all relationships before filtering):

```gql
MATCH (user:User)-[:POSTED]->(post:Post)-[:HAS_COMMENT]->(comment:Comment)
WHERE user.active = true
RETURN user.name, count(comment) AS comment_count
```

**Efficient** (filters users early):

```gql
MATCH (user:User)
WHERE user.active = true
WITH user
MATCH (user)-[:POSTED]->(post:Post)-[:HAS_COMMENT]->(comment:Comment)
RETURN user.name, count(comment) AS comment_count
```

### Aggregating Before Continuing

Aggregate intermediate results to reduce the working set:

```gql
// Find users with more than 100 posts, then get their most recent comments
MATCH (user:User)-[:POSTED]->(post:Post)
WITH user, count(post) AS post_count
WHERE post_count > 100
MATCH (user)-[:COMMENTED]->(comment:Comment)
RETURN user.name, post_count, comment
ORDER BY comment.created_at DESC
LIMIT 10
```

### Breaking Complex Queries

Split complex queries into manageable parts:

```gql
// Step 1: Find influential users
MATCH (user:User)-[:FOLLOWS]->(follower:User)
WITH user, count(follower) AS followers
WHERE followers > 1000
WITH user ORDER BY followers DESC LIMIT 100

// Step 2: Get their recent activity
MATCH (user)-[:POSTED]->(post:Post)
WHERE post.created_at > datetime() - duration('P30D')
WITH user, collect(post)[0..5] AS recent_posts

// Step 3: Return with statistics
RETURN user.name, size(recent_posts) AS recent_post_count, recent_posts
```

## Aggregation Performance

### Use COUNT Efficiently

COUNT operations have different performance characteristics:

```gql
// Fast: Counting with early termination
MATCH (p:Person)
RETURN count(p) AS total

// Slower: Counting after traversal
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN count(friend) AS total_friends

// Optimize: Aggregate per-person first
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN p.name, count(friend) AS friend_count
```

### Optimize SUM and AVG

Pre-filter data before aggregating:

**Inefficient**:

```gql
MATCH (o:Order)
WHERE o.status = "completed"
RETURN sum(o.total) AS revenue
```

**More efficient with index**:

```gql
// Ensure index exists: CREATE INDEX order_status ON :Order(status)
MATCH (o:Order {status: "completed"})
RETURN sum(o.total) AS revenue
```

### Collect Wisely

The `collect()` function gathers values into a list. Limit what you collect:

**Inefficient** (collects everything):

```gql
MATCH (author:Author)-[:WROTE]->(book:Book)
RETURN author.name, collect(book) AS all_books
```

**Efficient** (limits collection):

```gql
MATCH (author:Author)-[:WROTE]->(book:Book)
WITH author, book
ORDER BY book.published DESC
WITH author, collect(book)[0..10] AS recent_books
RETURN author.name, recent_books
```

## Limiting Results Early

### Use LIMIT Strategically

Place LIMIT as early as possible in your query:

**Inefficient** (processes all results, then limits):

```gql
MATCH (p:Person)-[:KNOWS]->(friend:Person)-[:KNOWS]->(fof:Person)
RETURN DISTINCT fof.name
ORDER BY fof.name
LIMIT 10
```

**Efficient** (limits intermediate results):

```gql
MATCH (p:Person)-[:KNOWS]->(friend:Person)
WITH friend LIMIT 100
MATCH (friend)-[:KNOWS]->(fof:Person)
RETURN DISTINCT fof.name
ORDER BY fof.name
LIMIT 10
```

### Skip Efficiently

Combine SKIP and LIMIT for pagination:

```gql
// Page 1 (items 0-9)
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.created_at DESC
SKIP 0 LIMIT 10

// Page 2 (items 10-19)
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.created_at DESC
SKIP 10 LIMIT 10
```

**Note**: Deep pagination (large SKIP values) can be slow. Consider cursor-based pagination for large datasets:

```gql
// Cursor-based pagination using a timestamp
MATCH (p:Product)
WHERE p.created_at < $cursor_timestamp
RETURN p.name, p.price, p.created_at
ORDER BY p.created_at DESC
LIMIT 10
```

## Parameterized Queries for Plan Caching

### Why Use Parameters

Geode caches execution plans for parameterized queries. This provides:

- **Faster parsing**: Cached plans skip parsing and planning
- **Better security**: Prevents GQL injection
- **Cleaner code**: Separation of query and data

### Parameter Syntax

Use `$name` syntax for parameters:

```gql
// Parameterized query
MATCH (user:User {username: $username})
WHERE user.age >= $min_age
RETURN user.name, user.email
```

**Client usage (Python)**:

```python
result, _ = await conn.query(
    """
    MATCH (user:User {username: $username})
    WHERE user.age >= $min_age
    RETURN user.name, user.email
    """,
    {"username": "alice", "min_age": 18}
)
```

**Client usage (Go)**:

```go
rows, err := db.QueryContext(ctx, `
    MATCH (user:User {username: ?})
    WHERE user.age >= ?
    RETURN user.name, user.email
`, "alice", 18)
```

### Parameter Best Practices

**Good**: Parameterize variable values:

```gql
MATCH (p:Product)
WHERE p.category = $category AND p.price <= $max_price
RETURN p
```

**Bad**: Don't parameterize structural elements:

```gql
// Labels and relationship types cannot be parameterized
// This does NOT work:
MATCH (n:$label)-[:$reltype]->(m)  // INVALID
```

### Batch Operations with Parameters

Parameterized queries work well for batch operations:

```gql
// Use UNWIND for batch inserts
UNWIND $users AS user_data
CREATE (u:User {
    name: user_data.name,
    email: user_data.email,
    created_at: timestamp()
})
```

**Client usage**:

```python
users = [
    {"name": "Alice", "email": "alice@example.com"},
    {"name": "Bob", "email": "bob@example.com"},
    {"name": "Charlie", "email": "charlie@example.com"}
]
await conn.execute(
    "UNWIND $users AS user_data CREATE (u:User {name: user_data.name, email: user_data.email})",
    {"users": users}
)
```

## Common Performance Pitfalls

### Pitfall 1: Selecting All Properties

**Problem**: Returning entire nodes when you only need specific properties.

**Slow**:

```gql
MATCH (user:User)-[:POSTED]->(post:Post)
RETURN user, post  // Returns all properties
```

**Fast**:

```gql
MATCH (user:User)-[:POSTED]->(post:Post)
RETURN user.name, post.title, post.created_at  // Returns only needed properties
```

### Pitfall 2: Not Using Indexes

**Problem**: Full label scans when indexes could be used.

```gql
// Slow: Full scan of User nodes
MATCH (u:User)
WHERE u.email = "alice@example.com"
RETURN u

// Fast: Uses index (after creating it)
// CREATE INDEX user_email ON :User(email)
MATCH (u:User {email: "alice@example.com"})
RETURN u
```

### Pitfall 3: Unnecessary Ordering

**Problem**: Sorting large result sets unnecessarily.

```gql
// Slow: Sorts millions of rows
MATCH (p:Product)
RETURN p.name
ORDER BY p.name

// Fast: Only sort what you need
MATCH (p:Product)
RETURN p.name
ORDER BY p.name
LIMIT 100
```

### Pitfall 4: Repeated Pattern Matching

**Problem**: Matching the same pattern multiple times.

**Slow**:

```gql
MATCH (user:User {id: $id})-[:POSTED]->(post:Post)
WITH user, count(post) AS post_count
MATCH (user)-[:COMMENTED]->(comment:Comment)
WITH user, post_count, count(comment) AS comment_count
MATCH (user)-[:LIKED]->(liked:Post)
RETURN user.name, post_count, comment_count, count(liked) AS like_count
```

**Fast** (using OPTIONAL MATCH):

```gql
MATCH (user:User {id: $id})
OPTIONAL MATCH (user)-[:POSTED]->(post:Post)
WITH user, count(post) AS post_count
OPTIONAL MATCH (user)-[:COMMENTED]->(comment:Comment)
WITH user, post_count, count(comment) AS comment_count
OPTIONAL MATCH (user)-[:LIKED]->(liked:Post)
RETURN user.name, post_count, comment_count, count(liked) AS like_count
```

### Pitfall 5: Over-fetching in Traversals

**Problem**: Fetching all paths when you only need a few.

**Slow**:

```gql
MATCH path = (start:Person)-[:KNOWS*1..6]->(end:Person)
WHERE start.name = "Alice"
RETURN path
```

**Fast**:

```gql
MATCH path = (start:Person {name: "Alice"})-[:KNOWS*1..6]->(end:Person)
RETURN path
LIMIT 100
```

### Pitfall 6: String Operations Without Indexes

**Problem**: Using CONTAINS or regex without full-text indexes.

**Slow**:

```gql
MATCH (p:Product)
WHERE p.description CONTAINS "wireless"
RETURN p
```

**Fast** (with full-text index):

```gql
// First, create a full-text index:
// CREATE FULLTEXT INDEX product_search ON :Product(name, description)

CALL geode.fts.search('product_search', 'wireless')
YIELD node, score
MATCH (p) WHERE id(p) = node
RETURN p, score
```

## Performance Checklist

Before deploying queries to production, verify:

- [ ] **Indexes exist** for properties used in WHERE clauses and node lookups
- [ ] **No Cartesian products** - all MATCH patterns are connected
- [ ] **Bounded traversals** - variable-length patterns have max depth
- [ ] **Early filtering** - WHERE clauses appear as early as possible
- [ ] **Limited results** - LIMIT is applied before expensive operations
- [ ] **Parameterized queries** - variable values use parameters
- [ ] **Selective projections** - only necessary properties are returned
- [ ] **Profiled execution** - PROFILE shows acceptable metrics

## Measuring Performance

### Using EXPLAIN

Get the query plan without executing:

```gql
EXPLAIN
MATCH (user:User {username: "alice"})-[:POSTED]->(post:Post)
WHERE post.created_at > datetime() - duration('P7D')
RETURN post.title, post.created_at
ORDER BY post.created_at DESC
LIMIT 10
```

### Using PROFILE

Execute and get actual metrics:

```gql
PROFILE
MATCH (user:User {username: "alice"})-[:POSTED]->(post:Post)
WHERE post.created_at > datetime() - duration('P7D')
RETURN post.title, post.created_at
ORDER BY post.created_at DESC
LIMIT 10
```

For detailed profiling techniques, see the [Query Profiling Guide](/guides/query-profiling/).

## Summary

Optimizing GQL queries follows these principles:

1. **Start selective**: Begin patterns with the most filtered nodes
2. **Be specific**: Use exact labels and relationship types
3. **Bound traversals**: Always limit variable-length patterns
4. **Filter early**: Apply WHERE conditions as soon as possible
5. **Limit early**: Reduce working sets before expensive operations
6. **Use indexes**: Ensure indexes exist for common lookups
7. **Parameterize**: Enable plan caching with parameters
8. **Profile**: Measure before and after optimizations

## Related Guides

- [Index Strategy Guide](/guides/index-strategy/) - Choosing and creating indexes
- [Query Profiling Guide](/guides/query-profiling/) - Analyzing execution plans
- [Graph Modeling Guide](/guides/graph-modeling/) - Schema design for performance

---

**Questions?** Discuss query optimization in our [forum](https://forum.geodedb.com).
