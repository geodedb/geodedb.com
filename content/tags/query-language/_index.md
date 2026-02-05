---
title: "Query Language Design"
description: "Comprehensive guide to Geode's GQL query language: ISO/IEC 39075:2024 standard implementation, syntax patterns, and advanced query techniques."
keywords:
  - query language
  - GQL
  - ISO/IEC 39075:2024
  - graph query language
  - declarative queries
  - query syntax
  - graph patterns
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/query-language/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Geode implements the Graph Query Language (GQL) as standardized in ISO/IEC 39075:2024, providing a powerful, declarative language for querying graph databases. GQL builds on decades of query language evolution, combining the best aspects of SQL's familiarity with specialized graph traversal capabilities.

## What is GQL?

GQL (Graph Query Language) is an international standard for querying property graphs, officially published as ISO/IEC 39075:2024. It provides:

- **Declarative Syntax**: Describe what data you want, not how to retrieve it
- **Pattern Matching**: Express complex graph patterns intuitively
- **Property Graph Model**: Native support for labeled nodes and relationships with properties
- **SQL Compatibility**: Familiar syntax and semantics where applicable
- **Composability**: Build complex queries from simple building blocks

Geode follows the 100% GQL compliance; see the conformance profile for scope and diagnostics.

## Query Structure

### Basic Query Anatomy

```gql
// Simple query structure
MATCH (u:User {verified: true})
WHERE u.age >= 18
RETURN u.name, u.email
ORDER BY u.name
LIMIT 10
```

Every GQL query consists of clauses that form a pipeline:

1. **MATCH**: Find patterns in the graph
2. **WHERE**: Filter matched results
3. **RETURN**: Project output columns
4. **ORDER BY**: Sort results
5. **LIMIT/OFFSET**: Paginate results

### Reading Clauses

#### MATCH - Pattern Matching

```gql
// Node patterns
MATCH (n)                          // Any node
MATCH (u:User)                     // Nodes with User label
MATCH (p:Product {active: true})   // Nodes with label and property

// Relationship patterns
MATCH (a)-[r]->(b)                 // Any directed relationship
MATCH (a)-[:FOLLOWS]->(b)          // Specific relationship type
MATCH (a)<-[r:CREATED]-(b)         // Reverse direction
MATCH (a)-[r]-(b)                  // Undirected (either direction)

// Multi-hop patterns
MATCH (a)-[:KNOWS*1..3]->(b)       // Variable-length path (1 to 3 hops)
MATCH (a)-[:KNOWS*]->(b)           // Unlimited hops
MATCH (a)-[:KNOWS*..5]->(b)        // Up to 5 hops

// Complex patterns
MATCH (u:User)-[:POSTED]->(p:Post)<-[:LIKED]-(f:User)
WHERE u <> f
RETURN u.name AS author, COUNT(DISTINCT f) AS unique_likes
```

#### OPTIONAL MATCH - Left Outer Join

```gql
// Return users even if they have no posts
MATCH (u:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
RETURN u.name, COUNT(p) AS post_count
```

#### WHERE - Filtering

```gql
// Property conditions
MATCH (u:User)
WHERE u.age >= 18
  AND u.verified = true
  AND u.status IN ['active', 'premium']
RETURN u

// Pattern predicates
MATCH (u:User)
WHERE (u)-[:POSTED]->(:Post)  // Users who posted
  AND NOT (u)-[:BANNED]->()   // Not banned
RETURN u

// String matching
MATCH (p:Product)
WHERE p.name STARTS WITH 'Pro'
   OR p.name ENDS WITH 'Edition'
   OR p.name CONTAINS 'Premium'
RETURN p

// Regular expressions
MATCH (u:User)
WHERE u.email =~ '.*@example\\.com$'
RETURN u

// Null checks
MATCH (u:User)
WHERE u.phone IS NOT NULL
  AND u.email_verified IS NULL
RETURN u

// Collection predicates
MATCH (u:User)
WHERE 'python' IN u.skills
  AND ALL(tag IN u.tags WHERE LENGTH(tag) > 2)
  AND ANY(score IN u.scores WHERE score > 90)
RETURN u
```

### Writing Clauses

#### CREATE - Insert Data

```gql
// Create single node
CREATE (u:User {
  name: 'Alice',
  email: 'alice@example.com',
  created_at: CURRENT_TIMESTAMP
})
RETURN u

// Create multiple nodes
CREATE (u1:User {name: 'Alice'}),
       (u2:User {name: 'Bob'}),
       (u3:User {name: 'Charlie'})

// Create with relationships
CREATE (u:User {name: 'Alice'})-[:FOLLOWS]->(f:User {name: 'Bob'})

// Create from matched patterns
MATCH (u:User {name: 'Alice'})
CREATE (u)-[:POSTED]->(p:Post {
  title: 'Hello World',
  content: 'My first post',
  created_at: NOW()
})
RETURN p
```

#### MERGE - Upsert Pattern

```gql
// Create if not exists
MERGE (u:User {email: 'alice@example.com'})
ON CREATE SET u.created_at = NOW()
ON MATCH SET u.last_seen = NOW()
RETURN u

// Merge relationships
MATCH (u1:User {name: 'Alice'}), (u2:User {name: 'Bob'})
MERGE (u1)-[f:FOLLOWS]->(u2)
ON CREATE SET f.since = NOW()
RETURN f

// Complex merge
MERGE (u:User {email: 'alice@example.com'})
ON CREATE SET
  u.created_at = NOW(),
  u.verified = false,
  u.login_count = 1
ON MATCH SET
  u.last_login = NOW(),
  u.login_count = u.login_count + 1
RETURN u
```

#### SET - Update Properties

```gql
// Set single property
MATCH (u:User {id: 123})
SET u.verified = true
RETURN u

// Set multiple properties
MATCH (u:User {id: 123})
SET u.name = 'Alice Smith',
    u.updated_at = NOW()
RETURN u

// Set from map
MATCH (u:User {id: 123})
SET u += {verified: true, role: 'admin'}
RETURN u

// Set labels
MATCH (u:User {id: 123})
SET u:Premium:Verified
RETURN u

// Conditional updates
MATCH (p:Post)
WHERE p.likes > 100
SET p.featured = true,
    p.featured_at = NOW()
RETURN COUNT(p) AS featured_count
```

#### DELETE - Remove Data

```gql
// Delete nodes (must have no relationships)
MATCH (u:User {deleted: true})
DELETE u

// Delete relationships
MATCH (u1:User)-[f:FOLLOWS]->(u2:User)
WHERE u1.id = 123
DELETE f

// Delete nodes and relationships
MATCH (u:User {id: 123})
DETACH DELETE u  // Deletes node and all its relationships

// Conditional delete
MATCH (p:Post)
WHERE p.created_at < DATE() - DURATION('P1Y')
  AND p.archived = true
DETACH DELETE p
```

#### REMOVE - Remove Properties/Labels

```gql
// Remove property
MATCH (u:User {id: 123})
REMOVE u.deprecated_field
RETURN u

// Remove label
MATCH (u:User {id: 123})
REMOVE u:Premium
RETURN u

// Remove multiple properties
MATCH (u:User)
WHERE u.migrated = true
REMOVE u.old_field1, u.old_field2, u.migration_flag
```

### Query Composition

#### WITH - Pipeline Chaining

```gql
// Aggregate then filter
MATCH (u:User)-[:POSTED]->(p:Post)
WITH u, COUNT(p) AS post_count
WHERE post_count > 10
RETURN u.name, post_count
ORDER BY post_count DESC

// Multiple aggregations
MATCH (u:User)-[:POSTED]->(p:Post)
WITH u, COUNT(p) AS posts, AVG(p.likes) AS avg_likes
WHERE posts > 5 AND avg_likes > 10
RETURN u.name, posts, avg_likes

// Subquery pattern
MATCH (u:User)
WITH u, [(u)-[:POSTED]->(p:Post) | p.likes] AS post_likes
RETURN u.name, SUM(post_likes) AS total_likes
```

#### UNION - Combine Results

```gql
// Union all (includes duplicates)
MATCH (u:User {verified: true})
RETURN u.name AS name
UNION ALL
MATCH (a:Admin)
RETURN a.name AS name

// Union distinct (removes duplicates)
MATCH (u:User)
WHERE u.role = 'author'
RETURN u.id, u.name
UNION
MATCH (u:User)-[:POSTED]->(p:Post)
RETURN u.id, u.name
```

#### UNWIND - Expand Collections

```gql
// Expand list to rows
UNWIND [1, 2, 3, 4, 5] AS number
RETURN number, number * number AS square

// Process collection property
MATCH (u:User)
UNWIND u.tags AS tag
RETURN tag, COUNT(u) AS user_count
ORDER BY user_count DESC

// Create from list
WITH [{name: 'Alice', age: 30}, {name: 'Bob', age: 25}] AS users
UNWIND users AS user_data
CREATE (u:User)
SET u = user_data
RETURN u
```

## Advanced Query Patterns

### Aggregation

```gql
// Basic aggregates
MATCH (u:User)
RETURN COUNT(u) AS total_users,
       AVG(u.age) AS avg_age,
       MIN(u.created_at) AS first_user,
       MAX(u.created_at) AS latest_user

// Group by
MATCH (u:User)-[:POSTED]->(p:Post)
RETURN u.name,
       COUNT(p) AS posts,
       SUM(p.likes) AS total_likes,
       AVG(p.likes) AS avg_likes
ORDER BY total_likes DESC

// Collect aggregation
MATCH (u:User)-[:POSTED]->(p:Post)
RETURN u.name, COLLECT(p.title) AS post_titles

// Distinct aggregation
MATCH (u:User)-[:POSTED]->(p:Post)-[:HAS_TAG]->(t:Tag)
RETURN u.name, COUNT(DISTINCT t) AS unique_tags
```

### Path Queries

```gql
// Shortest path
MATCH path = SHORTEST_PATH((a:User {name: 'Alice'})-[:KNOWS*]-(b:User {name: 'Bob'}))
RETURN path, LENGTH(path) AS hops

// All paths with length constraint
MATCH path = (a:User {name: 'Alice'})-[:KNOWS*1..4]-(b:User {name: 'Bob'})
RETURN path, LENGTH(path) AS hops
ORDER BY hops

// Path with conditions
MATCH path = (a:User)-[:KNOWS*]-(b:User)
WHERE ALL(node IN NODES(path) WHERE node.active = true)
  AND LENGTH(path) <= 5
RETURN path
```

### Subqueries

```gql
// Correlated subquery (EXISTS)
MATCH (u:User)
WHERE EXISTS {
  MATCH (u)-[:POSTED]->(p:Post)
  WHERE p.likes > 100
}
RETURN u

// Scalar subquery
MATCH (u:User)
RETURN u.name,
  (SELECT COUNT(p) FROM (u)-[:POSTED]->(p:Post)) AS post_count

// List subquery
MATCH (u:User)
RETURN u.name,
  [(u)-[:FOLLOWS]->(f:User) | f.name] AS following_names
```

### Conditional Logic

```gql
// CASE expressions
MATCH (u:User)
RETURN u.name,
  CASE
    WHEN u.posts > 100 THEN 'power_user'
    WHEN u.posts > 10 THEN 'regular_user'
    ELSE 'new_user'
  END AS user_tier

// CASE with searched conditions
MATCH (p:Post)
RETURN p.title,
  CASE
    WHEN p.likes > 1000 AND p.shares > 100 THEN 'viral'
    WHEN p.likes > 100 THEN 'popular'
    WHEN p.likes > 10 THEN 'normal'
    ELSE 'new'
  END AS status

// Simple CASE
MATCH (u:User)
RETURN u.name,
  CASE u.role
    WHEN 'admin' THEN 'Administrator'
    WHEN 'moderator' THEN 'Moderator'
    ELSE 'User'
  END AS role_label
```

## Query Optimization

### Use Indexes

```gql
// Create indexes for frequently queried properties
CREATE INDEX FOR (u:User) ON (u.email)
CREATE INDEX FOR (p:Post) ON (p.created_at)
CREATE INDEX FOR (t:Tag) ON (t.name)

// Composite index
CREATE INDEX FOR (u:User) ON (u.status, u.role)
```

### Filter Early

```gql
// Good: Filter before expanding pattern
MATCH (u:User)
WHERE u.verified = true
MATCH (u)-[:POSTED]->(p:Post)
RETURN u, p

// Avoid: Late filtering causes unnecessary work
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE u.verified = true
RETURN u, p
```

### Limit Relationship Traversals

```gql
// Good: Bounded traversal
MATCH (u:User)-[:KNOWS*1..3]->(friend)
RETURN friend.name
LIMIT 100

// Avoid: Unbounded traversal
MATCH (u:User)-[:KNOWS*]->(friend)
RETURN friend.name
```

### Use Query Profiling

```gql
// Explain query plan
EXPLAIN
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE u.verified = true
RETURN u.name, COUNT(p) AS posts

// Profile actual execution
PROFILE
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE u.verified = true
RETURN u.name, COUNT(p) AS posts
```

## Client Library Integration

### Python

```python
from geode_client import Client

client = Client(host="localhost", port=3141)

async with client.connection() as conn:
    # Simple query
    result, _ = await conn.query("""
        MATCH (u:User)
        WHERE u.age >= $min_age
        RETURN u.name, u.age
        ORDER BY u.age DESC
        LIMIT 10
    """, {"min_age": 18})

    for row in result.rows:
        print(f"{row['name']}: {row['age']}")

    # Parameterized write
    await conn.query("""
        CREATE (u:User {
            name: $name,
            email: $email,
            created_at: CURRENT_TIMESTAMP
        })
    """, {
        "name": "Alice",
        "email": "alice@example.com"
    })
```

### Go

```go
import "database/sql"
import _ "geodedb.com/geode"

db, _ := sql.Open("geode", "quic://localhost:3141")
defer db.Close()

// Query with parameters
rows, err := db.Query(`
    MATCH (u:User)
    WHERE u.age >= $1
    RETURN u.name, u.age
    ORDER BY u.age DESC
    LIMIT 10
`, 18)
defer rows.Close()

for rows.Next() {
    var name string
    var age int
    rows.Scan(&name, &age)
    fmt.Printf("%s: %d\n", name, age)
}

// Insert with parameters
_, err = db.Exec(`
    CREATE (u:User {
        name: $1,
        email: $2,
        created_at: CURRENT_TIMESTAMP
    })
`, "Alice", "alice@example.com")
```

### Rust

```rust
use geode_client::Client;

let client = Client::connect("localhost:3141").await?;

// Query with parameters
let result = client.query(
    r#"
        MATCH (u:User)
        WHERE u.age >= $min_age
        RETURN u.name, u.age
        ORDER BY u.age DESC
        LIMIT 10
    "#,
    &[("min_age", &18)],
).await?;

for row in result.rows() {
    println!("{}: {}", row["name"], row["age"]);
}

// Insert with parameters
client.execute(
    r#"
        CREATE (u:User {
            name: $name,
            email: $email,
            created_at: CURRENT_TIMESTAMP
        })
    "#,
    &[
        ("name", &"Alice"),
        ("email", &"alice@example.com"),
    ],
).await?;
```

## Best Practices

1. **Use Parameters**: Always use parameters ($1, $name, etc.) instead of string concatenation to prevent injection attacks
2. **Index Strategically**: Create indexes on properties used in WHERE clauses and relationship endpoints
3. **Bound Traversals**: Always limit variable-length path traversals (use *1..5, not *)
4. **Filter Early**: Apply WHERE clauses as early as possible in the query pipeline
5. **Limit Results**: Use LIMIT on queries that might return large result sets
6. **Profile Queries**: Use EXPLAIN/PROFILE to understand query execution plans
7. **Batch Writes**: Combine multiple CREATE/MERGE operations in a single transaction
8. **Avoid Cartesian Products**: Be careful with multiple MATCH clauses without relationships

## Common Patterns

### Recommendation Engine

```gql
// Find recommended products based on similar users
MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(similar:User)-[:PURCHASED]->(recommendation:Product)
WHERE NOT (u)-[:PURCHASED]->(recommendation)
  AND recommendation.active = true
RETURN recommendation.name,
       COUNT(DISTINCT similar) AS similar_user_count,
       AVG(recommendation.rating) AS avg_rating
ORDER BY similar_user_count DESC, avg_rating DESC
LIMIT 10
```

### Social Graph Analysis

```gql
// Find mutual friends
MATCH (me:User {id: $my_id})-[:KNOWS]-(mutual)-[:KNOWS]-(friend:User {id: $friend_id})
WHERE mutual <> me AND mutual <> friend
RETURN mutual.name, mutual.location
ORDER BY mutual.name
```

### Hierarchical Queries

```gql
// Organization chart depth-first traversal
MATCH path = (root:Employee {id: $manager_id})-[:MANAGES*]->(report:Employee)
RETURN report.name,
       LENGTH(path) AS depth,
       [node IN NODES(path) | node.name] AS chain
ORDER BY depth, report.name
```

## Troubleshooting

### Query Too Slow

1. Check if indexes exist on filtered properties
2. Use PROFILE to identify bottlenecks
3. Ensure relationship traversals are bounded
4. Consider denormalizing frequently accessed data

### Out of Memory

1. Add LIMIT clauses to constrain result sets
2. Use streaming in client libraries
3. Break large operations into batches
4. Consider variable-length path limits

### Unexpected Results

1. Verify NULL handling (use IS NULL/IS NOT NULL)
2. Check relationship directions
3. Ensure proper use of OPTIONAL MATCH
4. Validate parameter types and values

## Related Topics

- **Pattern Matching**: Deep dive into graph pattern syntax
- **MATCH Clause**: Comprehensive MATCH documentation
- **EXPLAIN**: Query execution plan analysis
- **Functions**: Built-in GQL functions
- **Operators**: GQL operators and expressions

## Further Reading

- [Pattern Matching](/tags/pattern-matching/) - Graph pattern matching techniques
- [MATCH Clause](/tags/match/) - Complete MATCH syntax reference
- [EXPLAIN](/tags/explain/) - Query optimization with EXPLAIN
- [Performance](/tags/performance/) - Query performance tuning
- [GQL Reference](/tags/gql-reference/) - Complete GQL language reference

Geode's full implementation of ISO/IEC 39075:2024 GQL provides a powerful, standardized query language for all your graph database needs, from simple lookups to complex graph analytics.
