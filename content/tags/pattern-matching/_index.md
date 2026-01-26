---
title: "Graph Pattern Matching"
description: "Master graph pattern matching in Geode: node patterns, relationship traversals, variable-length paths, and complex graph queries with GQL."
keywords:
  - pattern matching
  - graph patterns
  - relationship traversal
  - path queries
  - variable-length paths
  - graph navigation
  - MATCH clause
  - GQL patterns
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/pattern-matching/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Pattern matching is the cornerstone of graph querying in Geode, allowing you to describe the structural patterns you want to find in your graph data. Using GQL's intuitive syntax, you can express complex graph traversals and relationships with clear, visual patterns.

## What is Pattern Matching?

Pattern matching in graph databases allows you to:

- **Describe Structure**: Specify graph structures you want to find
- **Traverse Relationships**: Navigate connections between nodes
- **Filter Data**: Combine structural and property constraints
- **Express Paths**: Find direct and multi-hop connections
- **Query Declaratively**: Focus on what to find, not how to find it

Unlike traditional table joins, graph patterns match the natural structure of connected data.

## Basic Pattern Syntax

### Node Patterns

```gql
// Any node (anonymous)
MATCH (n)
RETURN n

// Node with variable name
MATCH (user)
RETURN user

// Node with label
MATCH (u:User)
RETURN u

// Node with multiple labels
MATCH (u:User:Premium)
RETURN u

// Node with label and properties
MATCH (u:User {verified: true})
RETURN u

// Node with label and multiple properties
MATCH (u:User {verified: true, active: true, role: 'admin'})
RETURN u
```

**Pattern Components**:
- `(n)` - Variable binding (can reference later)
- `:User` - Label constraint
- `{verified: true}` - Property constraint (inline)

### Relationship Patterns

```gql
// Any relationship, directed right
MATCH (a)-[r]->(b)
RETURN a, r, b

// Specific relationship type
MATCH (u:User)-[:FOLLOWS]->(other:User)
RETURN u.name, other.name

// Relationship with variable binding
MATCH (u:User)-[f:FOLLOWS]->(other:User)
RETURN u.name, other.name, f.since

// Undirected relationship (matches either direction)
MATCH (a)-[:KNOWS]-(b)
RETURN a, b

// Left-directed relationship
MATCH (a)<-[:CREATED]-(b)
RETURN a, b

// Multiple relationship types
MATCH (a)-[:FOLLOWS|BLOCKS]->(b)
RETURN a, b

// Relationship with properties
MATCH (a)-[:RATED {score: 5}]->(movie)
RETURN a, movie
```

**Relationship Directions**:
- `->` - Right-directed (from left node to right node)
- `<-` - Left-directed (from right node to left node)
- `-` - Undirected (matches either direction)

### Complete Patterns

```gql
// User who posted a specific post
MATCH (u:User)-[:POSTED]->(p:Post {id: 123})
RETURN u

// Users who like posts by other users
MATCH (liker:User)-[:LIKES]->(p:Post)<-[:POSTED]-(author:User)
WHERE liker <> author
RETURN liker.name, author.name, p.title

// Three-node pattern (triangle)
MATCH (a:User)-[:FOLLOWS]->(b:User)-[:FOLLOWS]->(c:User)
WHERE (a)-[:FOLLOWS]->(c)
RETURN a, b, c
```

## Variable-Length Patterns

### Basic Variable-Length Paths

```gql
// Exactly 2 hops
MATCH (a:User)-[:KNOWS*2]->(b:User)
RETURN a.name, b.name

// 1 to 3 hops
MATCH (a:User)-[:KNOWS*1..3]->(b:User)
RETURN a.name, b.name, LENGTH(path) AS hops

// 2 or more hops
MATCH (a:User)-[:KNOWS*2..]->(b:User)
RETURN a.name, b.name

// Up to 5 hops
MATCH (a:User)-[:KNOWS*..5]->(b:User)
RETURN a.name, b.name

// Any number of hops (use with caution!)
MATCH (a:User)-[:KNOWS*]->(b:User)
RETURN a.name, b.name
LIMIT 100
```

**Best Practice**: Always limit variable-length paths to prevent excessive traversal and ensure query performance.

### Path Variables

```gql
// Capture entire path
MATCH path = (a:User)-[:KNOWS*1..3]->(b:User)
RETURN path,
       LENGTH(path) AS hops,
       NODES(path) AS users_in_path,
       RELATIONSHIPS(path) AS connections

// Path with conditions
MATCH path = (a:User)-[:KNOWS*1..3]->(b:User)
WHERE ALL(node IN NODES(path) WHERE node.active = true)
  AND ALL(rel IN RELATIONSHIPS(path) WHERE rel.verified = true)
RETURN path

// Multiple paths
MATCH path1 = (a:User)-[:POSTED]->(p:Post),
      path2 = (p)<-[:LIKED]-(b:User)
RETURN path1, path2
```

### Shortest Path

```gql
// Find shortest path between two nodes
MATCH path = SHORTEST_PATH((a:User {name: 'Alice'})-[:KNOWS*]-(b:User {name: 'Bob'}))
RETURN path, LENGTH(path) AS degrees_of_separation

// Shortest path with relationship type constraints
MATCH path = SHORTEST_PATH(
  (a:City {name: 'New York'})-[:CONNECTED_TO*]-(b:City {name: 'Los Angeles'})
)
WHERE ALL(rel IN RELATIONSHIPS(path) WHERE rel.type IN ['HIGHWAY', 'AIRPORT'])
RETURN path, SUM([rel IN RELATIONSHIPS(path) | rel.distance]) AS total_distance

// All shortest paths (if multiple exist)
MATCH path = ALL_SHORTEST_PATHS((a:User)-[:KNOWS*]-(b:User))
WHERE a.name = 'Alice' AND b.name = 'Bob'
RETURN path
```

## Complex Pattern Matching

### Multiple Patterns in Single Query

```gql
// Independent patterns (Cartesian product)
MATCH (u:User), (p:Product)
WHERE u.location = p.available_region
RETURN u, p

// Connected patterns
MATCH (u:User)-[:PURCHASED]->(p:Product),
      (p)<-[:MANUFACTURED]-(c:Company)
RETURN u.name, p.name, c.name

// Sequential patterns with filtering
MATCH (u:User)-[:FOLLOWS]->(influencer:User)
MATCH (influencer)-[:POSTED]->(p:Post)
WHERE p.likes > 1000
RETURN u.name, COUNT(DISTINCT p) AS viral_posts_from_influencers
```

### Optional Patterns

```gql
// Users with or without posts
MATCH (u:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
RETURN u.name, COUNT(p) AS post_count

// Multiple optional patterns
MATCH (u:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
OPTIONAL MATCH (u)-[:FOLLOWS]->(f:User)
RETURN u.name,
       COUNT(DISTINCT p) AS posts,
       COUNT(DISTINCT f) AS following

// Optional with WHERE clause
MATCH (u:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
WHERE p.published = true
RETURN u.name, COLLECT(p.title) AS published_posts
```

### Pattern Predicates in WHERE

```gql
// Existence check
MATCH (u:User)
WHERE (u)-[:POSTED]->(:Post)
RETURN u.name

// Non-existence check
MATCH (u:User)
WHERE NOT (u)-[:POSTED]->(:Post)
RETURN u.name AS users_with_no_posts

// Complex existence patterns
MATCH (u:User)
WHERE (u)-[:POSTED]->(:Post {featured: true})
  AND NOT (u)-[:BANNED]->()
RETURN u

// Count in pattern predicate
MATCH (u:User)
WHERE SIZE((u)-[:FOLLOWS]->(:User)) > 100
RETURN u.name AS influencer

// Pattern with properties
MATCH (u:User)
WHERE (u)-[:RATED {score: 5}]->(:Product)
RETURN u.name
```

### Nested Patterns

```gql
// Subquery with pattern
MATCH (u:User)
WHERE EXISTS {
  MATCH (u)-[:POSTED]->(p:Post)
  WHERE p.likes > 100
}
RETURN u.name

// List comprehension with pattern
MATCH (u:User)
RETURN u.name,
  [(u)-[:FOLLOWS]->(f:User) WHERE f.verified = true | f.name] AS verified_following

// Pattern within aggregation
MATCH (u:User)
RETURN u.name,
  COUNT {(u)-[:POSTED]->(p:Post) WHERE p.published = true} AS published_count
```

## Pattern Matching Strategies

### Anchor Pattern First

```gql
// Good: Start with specific anchor
MATCH (u:User {email: 'alice@example.com'})
MATCH (u)-[:POSTED]->(p:Post)
RETURN p

// Avoid: Starting with broad pattern
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE u.email = 'alice@example.com'
RETURN p
```

**Why**: Starting with a specific anchor (indexed property) dramatically reduces the search space.

### Filter Early

```gql
// Good: Filter on first MATCH
MATCH (u:User)
WHERE u.verified = true
MATCH (u)-[:POSTED]->(p:Post)
WHERE p.published = true
RETURN u, p

// Avoid: Late filtering
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE u.verified = true AND p.published = true
RETURN u, p
```

### Use Relationship Direction

```gql
// Good: Specify direction when known
MATCH (author:User)-[:POSTED]->(p:Post)
RETURN author, p

// Slower: Undirected when direction is known
MATCH (author:User)-[:POSTED]-(p:Post)
RETURN author, p
```

## Pattern Examples by Use Case

### Social Network Analysis

```gql
// Find mutual followers
MATCH (me:User {id: $my_id})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(you:User {id: $your_id})
RETURN mutual.name, mutual.profile_image

// Second-degree connections (friends of friends)
MATCH (me:User {id: $my_id})-[:KNOWS]->(:User)-[:KNOWS]->(suggestion:User)
WHERE NOT (me)-[:KNOWS]->(suggestion)
  AND me <> suggestion
RETURN DISTINCT suggestion.name, COUNT(*) AS mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10

// Influencer detection (users with many followers)
MATCH (u:User)<-[:FOLLOWS]-(follower:User)
WITH u, COUNT(follower) AS follower_count
WHERE follower_count > 1000
RETURN u.name, follower_count
ORDER BY follower_count DESC
```

### Knowledge Graph Queries

```gql
// Find related topics through shared papers
MATCH (topic1:Topic {name: 'Machine Learning'})<-[:ABOUT]-(paper:Paper)-[:ABOUT]->(topic2:Topic)
WHERE topic1 <> topic2
RETURN topic2.name, COUNT(paper) AS shared_papers
ORDER BY shared_papers DESC

// Author collaboration networks
MATCH (author1:Author)-[:WROTE]->(paper:Paper)<-[:WROTE]-(author2:Author)
WHERE author1 <> author2
RETURN author1.name, author2.name, COUNT(paper) AS collaborations
ORDER BY collaborations DESC

// Citation chains (papers citing papers)
MATCH path = (start:Paper {title: 'Attention Is All You Need'})<-[:CITES*1..3]-(citing:Paper)
RETURN citing.title, citing.year, LENGTH(path) AS citation_distance
ORDER BY citation_distance, citing.year DESC
```

### E-Commerce Recommendations

```gql
// Products bought together
MATCH (p:Product {id: $product_id})<-[:CONTAINS]-(order:Order)-[:CONTAINS]->(rec:Product)
WHERE p <> rec
RETURN rec.name, COUNT(order) AS times_bought_together
ORDER BY times_bought_together DESC
LIMIT 10

// Personalized recommendations (collaborative filtering)
MATCH (user:User {id: $user_id})-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(similar:User)
MATCH (similar)-[:PURCHASED]->(recommendation:Product)
WHERE NOT (user)-[:PURCHASED]->(recommendation)
RETURN recommendation.name,
       COUNT(DISTINCT similar) AS similar_users,
       AVG(recommendation.rating) AS avg_rating
ORDER BY similar_users DESC, avg_rating DESC
LIMIT 20

// Browse hierarchy navigation
MATCH path = (root:Category {name: 'Electronics'})-[:SUBCATEGORY*]->(leaf:Category)
WHERE NOT (leaf)-[:SUBCATEGORY]->()
RETURN leaf.name, [node IN NODES(path) | node.name] AS breadcrumb
```

### Fraud Detection

```gql
// Detect suspicious account networks
MATCH (account:Account)-[:TRANSFER*2..4]->(suspicious:Account)
WHERE suspicious.flagged = true
  AND account <> suspicious
RETURN DISTINCT account.id, account.holder_name

// Find circular payment patterns
MATCH path = (a:Account)-[:TRANSFER*3..5]->(a)
WHERE ALL(rel IN RELATIONSHIPS(path) WHERE rel.amount > 1000)
  AND ALL(node IN NODES(path) WHERE node.created_at > DATE() - DURATION('P30D'))
RETURN path, SUM([rel IN RELATIONSHIPS(path) | rel.amount]) AS total_amount

// Shared contact information
MATCH (user1:User)-[:HAS_PHONE|HAS_EMAIL]->(contact)<-[:HAS_PHONE|HAS_EMAIL]-(user2:User)
WHERE user1 <> user2
  AND user1.created_at > DATE() - DURATION('P7D')
  AND user2.created_at > DATE() - DURATION('P7D')
RETURN user1, user2, COLLECT(contact) AS shared_contacts
```

## Performance Optimization

### Index Usage

```gql
// Create indexes on pattern anchor points
CREATE INDEX FOR (u:User) ON (u.email)
CREATE INDEX FOR (p:Product) ON (p.id)
CREATE INDEX FOR (o:Order) ON (o.date)

// Query uses index on anchor
MATCH (u:User {email: 'alice@example.com'})  // Index seek
MATCH (u)-[:PURCHASED]->(p:Product)
RETURN p
```

### Bound Variable-Length Paths

```gql
// Good: Bounded traversal
MATCH (a)-[:KNOWS*1..4]->(b)
RETURN a, b

// Risky: Unbounded traversal
MATCH (a)-[:KNOWS*]->(b)
RETURN a, b
LIMIT 100  // LIMIT doesn't prevent full traversal!
```

### Pattern Complexity

```gql
// Efficient: Simple linear pattern
MATCH (a)-[:R1]->(b)-[:R2]->(c)
RETURN a, b, c

// More complex: Star pattern (one node, many relationships)
MATCH (center)
WHERE (center)-[:R1]->() AND (center)-[:R2]->() AND (center)-[:R3]->()
RETURN center

// Most complex: Cyclic pattern
MATCH (a)-[:R1]->(b)-[:R2]->(c)-[:R3]->(a)
RETURN a, b, c
```

## Client Library Examples

### Python

```python
from geode_client import GeodeClient

async with GeodeClient("localhost:3141") as client:
    # Simple pattern match
    result = await client.query("""
        MATCH (u:User)-[:FOLLOWS]->(followed:User)
        WHERE u.id = $user_id
        RETURN followed.name, followed.bio
    """, {"user_id": 123})

    async for row in result:
        print(f"{row['name']}: {row['bio']}")

    # Variable-length path
    result = await client.query("""
        MATCH path = (a:User {id: $from})-[:KNOWS*1..3]->(b:User {id: $to})
        RETURN LENGTH(path) AS degrees,
               [node IN NODES(path) | node.name] AS path_names
        ORDER BY degrees
        LIMIT 1
    """, {"from": 1, "to": 100})
```

### Go

```go
import "database/sql"
import _ "go.codepros.org/geode"

db, _ := sql.Open("geode", "geode://localhost:3141")

// Pattern with multiple relationships
rows, _ := db.Query(`
    MATCH (u:User)-[:POSTED]->(p:Post)<-[:LIKED]-(liker:User)
    WHERE u.id = $1
    RETURN p.title, COUNT(DISTINCT liker) AS like_count
    ORDER BY like_count DESC
    LIMIT 10
`, 123)

for rows.Next() {
    var title string
    var likeCount int
    rows.Scan(&title, &likeCount)
    fmt.Printf("%s: %d likes\n", title, likeCount)
}
```

### Rust

```rust
use geode_client::Client;

let client = Client::connect("localhost:3141").await?;

// Pattern with path variable
let result = client.query(
    r#"
        MATCH path = (start:City {name: $from})-[:ROAD*]->(end:City {name: $to})
        WHERE ALL(node IN NODES(path) WHERE node.accessible = true)
        RETURN path,
               LENGTH(path) AS hops,
               SUM([rel IN RELATIONSHIPS(path) | rel.distance]) AS total_distance
        ORDER BY total_distance
        LIMIT 1
    "#,
    &[
        ("from", &"New York"),
        ("to", &"Los Angeles"),
    ],
).await?;
```

## Best Practices

1. **Start Specific**: Begin patterns with the most selective constraints (indexed properties)
2. **Use Indexes**: Create indexes on properties used as pattern anchors
3. **Bound Paths**: Always limit variable-length paths with reasonable max hops
4. **Filter Early**: Apply WHERE clauses immediately after matching the relevant nodes
5. **Know Direction**: Use directed relationships when direction is known
6. **Avoid Cycles**: Be cautious with patterns that create cycles (can be expensive)
7. **Test Performance**: Use EXPLAIN/PROFILE to understand pattern matching costs
8. **Limit Results**: Add LIMIT clauses to prevent returning massive result sets

## Common Pitfalls

### Cartesian Products

```gql
// Avoid: Creates Cartesian product
MATCH (u:User), (p:Post)
WHERE u.location = p.location
RETURN u, p

// Better: Connect patterns with relationships
MATCH (u:User)-[:LOCATED_IN]->(loc:Location)<-[:LOCATED_IN]-(p:Post)
RETURN u, p
```

### Unbounded Traversals

```gql
// Dangerous: Can traverse entire graph
MATCH (a)-[:KNOWS*]->(b)
RETURN a, b

// Safe: Bounded traversal
MATCH (a)-[:KNOWS*1..4]->(b)
RETURN a, b
LIMIT 100
```

### Late Filtering

```gql
// Inefficient: Filters after expensive pattern match
MATCH (u:User)-[:FOLLOWS*2..3]->(recommendation:User)
WHERE u.id = 123
RETURN recommendation

// Efficient: Anchor first, then traverse
MATCH (u:User {id: 123})-[:FOLLOWS*2..3]->(recommendation:User)
RETURN recommendation
```

## Related Topics

- **MATCH Clause**: Complete MATCH syntax documentation
- **Query Language**: Full GQL query language guide
- **EXPLAIN**: Analyze pattern matching execution plans
- **Indexing**: Optimize pattern matching with indexes
- **Performance**: Pattern matching performance tuning

## Further Reading

- [MATCH Clause](/tags/match/) - Complete MATCH clause reference
- [Query Language](/tags/query-language/) - Full GQL guide
- [EXPLAIN](/tags/explain/) - Query execution analysis
- [Performance](/tags/performance/) - Optimization strategies
- [GQL Reference](/tags/gql-reference/) - Complete GQL documentation

Pattern matching in Geode provides intuitive, powerful graph querying capabilities that scale from simple lookups to complex graph analytics across billions of nodes and relationships.
