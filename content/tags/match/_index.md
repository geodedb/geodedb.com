---
title: "MATCH Clause"
description: "Complete guide to the MATCH clause in Geode GQL: pattern syntax, relationship traversal, variable-length paths, and advanced graph querying techniques."
keywords:
  - MATCH clause
  - graph patterns
  - GQL syntax
  - pattern matching
  - relationship traversal
  - graph queries
  - node patterns
  - path queries
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/match/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

The MATCH clause is the primary mechanism for finding patterns in your graph data with Geode. As the foundation of GQL queries, MATCH allows you to declaratively specify the graph structures you want to retrieve, from simple node lookups to complex multi-hop traversals.

## What is MATCH?

MATCH is a declarative graph pattern matching clause that:

- **Finds Patterns**: Locates nodes and relationships matching specified patterns
- **Binds Variables**: Assigns names to matched elements for use in other clauses
- **Traverses Graphs**: Navigates relationships between nodes
- **Filters Results**: Combines with WHERE for property-based filtering
- **Composes Queries**: Chains multiple patterns together

MATCH is analogous to SQL's FROM clause but designed specifically for graph structures.

## Basic Syntax

### Node Patterns

```gql
// Match any single node
MATCH (n)
RETURN n

// Match nodes with specific label
MATCH (u:User)
RETURN u

// Match with inline property filter
MATCH (u:User {verified: true})
RETURN u

// Match with multiple properties
MATCH (p:Product {category: 'electronics', in_stock: true})
RETURN p

// Match with multiple labels
MATCH (u:User:Premium:Verified)
RETURN u

// Anonymous node (no variable binding)
MATCH (:User)
RETURN COUNT(*) AS user_count
```

**Syntax Components**:
- `(n)` - Parentheses denote nodes, `n` is variable name
- `:Label` - Colon prefix for label constraint
- `{prop: value}` - Curly braces for inline property filters
- Multiple labels are AND conditions (must have all labels)

### Relationship Patterns

```gql
// Any directed relationship
MATCH (a)-[r]->(b)
RETURN a, r, b

// Specific relationship type
MATCH (u:User)-[:FOLLOWS]->(other:User)
RETURN u.name, other.name

// Relationship with variable binding
MATCH (u:User)-[f:FOLLOWS]->(other:User)
RETURN u.name, other.name, f.since

// Relationship with properties
MATCH (u:User)-[:RATED {score: 5}]->(m:Movie)
RETURN u.name, m.title

// Multiple relationship types (OR condition)
MATCH (u:User)-[:FOLLOWS|:BLOCKS]->(other:User)
RETURN u.name, other.name, TYPE(r) AS relationship_type

// Undirected relationship (either direction)
MATCH (a:Person)-[:KNOWS]-(b:Person)
RETURN a.name, b.name

// Reverse direction
MATCH (post:Post)<-[:POSTED]-(author:User)
RETURN post.title, author.name

// No relationship variable needed
MATCH (u:User)-[:FOLLOWS]->(:User)
RETURN u.name
```

**Relationship Directions**:
- `->` - Directed right (from left to right)
- `<-` - Directed left (from right to left)
- `-` - Undirected (matches both directions)

### Complete Path Patterns

```gql
// Linear path (3 nodes, 2 relationships)
MATCH (a:User)-[:FOLLOWS]->(b:User)-[:FOLLOWS]->(c:User)
RETURN a.name, b.name, c.name

// Triangle pattern
MATCH (a:User)-[:FOLLOWS]->(b:User)-[:FOLLOWS]->(c:User)
WHERE (a)-[:FOLLOWS]->(c)
RETURN a, b, c

// Star pattern (one center, multiple connections)
MATCH (center:User)-[:FOLLOWS]->(f1:User),
      (center)-[:FOLLOWS]->(f2:User),
      (center)-[:FOLLOWS]->(f3:User)
WHERE f1 <> f2 AND f2 <> f3 AND f1 <> f3
RETURN center.name, COLLECT([f1.name, f2.name, f3.name]) AS following

// Bi-directional pattern
MATCH (a:User)-[:FOLLOWS]->(b:User)<-[:FOLLOWS]-(a)
RETURN a.name, b.name  // Mutual followers
```

## Variable-Length Patterns

### Basic Variable-Length Syntax

```gql
// Exactly N hops
MATCH (a:User)-[:KNOWS*2]->(b:User)
RETURN a.name, b.name  // Friends of friends (2 hops exactly)

// Range of hops (min..max)
MATCH (a:User)-[:KNOWS*1..3]->(b:User)
RETURN a.name, b.name  // 1 to 3 hops away

// Minimum hops only (N or more)
MATCH (a:User)-[:KNOWS*2..]->(b:User)
RETURN a.name, b.name  // At least 2 hops

// Maximum hops only (up to N)
MATCH (a:User)-[:KNOWS*..4]->(b:User)
RETURN a.name, b.name  // Up to 4 hops

// Unbounded (any number of hops - use with caution!)
MATCH (a:User)-[:KNOWS*]->(b:User)
RETURN a.name, b.name
LIMIT 100
```

**Important**: Always use bounded variable-length patterns in production to prevent excessive graph traversal.

### Path Variable Binding

```gql
// Bind entire path to variable
MATCH path = (a:User {name: 'Alice'})-[:KNOWS*1..3]->(b:User)
RETURN path,
       LENGTH(path) AS hops,
       NODES(path) AS nodes_in_path,
       RELATIONSHIPS(path) AS rels_in_path

// Path functions
MATCH path = (a:City)-[:ROAD*]->(b:City)
WHERE a.name = 'New York' AND b.name = 'Los Angeles'
RETURN LENGTH(path) AS segments,
       [node IN NODES(path) | node.name] AS cities,
       [rel IN RELATIONSHIPS(path) | rel.distance] AS distances,
       REDUCE(total = 0, rel IN RELATIONSHIPS(path) | total + rel.distance) AS total_distance
ORDER BY total_distance
LIMIT 1
```

### Shortest Path

```gql
// Single shortest path
MATCH path = SHORTEST_PATH((a:User {id: 1})-[:KNOWS*]-(b:User {id: 100}))
RETURN path, LENGTH(path) AS degrees_of_separation

// Shortest path with relationship type constraint
MATCH path = SHORTEST_PATH((a:Airport)-[:FLIGHT*]-(b:Airport))
WHERE a.code = 'JFK' AND b.code = 'LAX'
RETURN path,
       [node IN NODES(path) | node.code] AS route,
       SUM([rel IN RELATIONSHIPS(path) | rel.distance]) AS total_miles

// All shortest paths (if multiple exist)
MATCH path = ALL_SHORTEST_PATHS((a:User)-[:KNOWS*]-(b:User))
WHERE a.id = 1 AND b.id = 100
RETURN path, LENGTH(path) AS hops

// Shortest path with constraints
MATCH path = SHORTEST_PATH((a:Station)-[:CONNECTED*]-(b:Station))
WHERE a.name = 'Central'
  AND b.name = 'Airport'
  AND ALL(rel IN RELATIONSHIPS(path) WHERE rel.operational = true)
  AND ALL(node IN NODES(path) WHERE node.status = 'open')
RETURN path
```

## Multiple MATCH Clauses

### Independent Patterns

```gql
// Sequential MATCH clauses
MATCH (u:User)
WHERE u.verified = true
MATCH (u)-[:POSTED]->(p:Post)
WHERE p.published = true
RETURN u.name, p.title

// Comma-separated patterns (same MATCH clause)
MATCH (u:User {verified: true})-[:POSTED]->(p:Post),
      (p)-[:HAS_TAG]->(t:Tag)
RETURN u.name, p.title, COLLECT(t.name) AS tags

// Cartesian product (use with care!)
MATCH (u:User), (p:Product)
WHERE u.location = p.region
RETURN u.name, p.name
```

### Dependent Patterns

```gql
// Second MATCH uses results from first
MATCH (u:User {name: 'Alice'})
MATCH (u)-[:FOLLOWS]->(following:User)-[:POSTED]->(p:Post)
WHERE p.created_at > DATE() - DURATION('P7D')
RETURN following.name, COUNT(p) AS recent_posts
ORDER BY recent_posts DESC

// Chain multiple traversals
MATCH (start:Category {name: 'Electronics'})
MATCH (start)-[:SUBCATEGORY*1..3]->(category:Category)
MATCH (category)<-[:IN_CATEGORY]-(product:Product)
WHERE product.in_stock = true
RETURN category.name, COUNT(product) AS available_products
ORDER BY available_products DESC
```

## OPTIONAL MATCH

### Left Outer Join

```gql
// Return users even if they have no posts
MATCH (u:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
RETURN u.name, COUNT(p) AS post_count
ORDER BY post_count DESC

// Multiple optional matches
MATCH (u:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
OPTIONAL MATCH (u)-[:FOLLOWS]->(f:User)
OPTIONAL MATCH (u)-[:LIKED]->(liked:Post)
RETURN u.name,
       COUNT(DISTINCT p) AS posts,
       COUNT(DISTINCT f) AS following,
       COUNT(DISTINCT liked) AS likes

// Optional with WHERE filter
MATCH (u:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
WHERE p.published = true
RETURN u.name, COLLECT(p.title) AS published_posts
```

### Mixed Required and Optional

```gql
// Required user, optional posts and followers
MATCH (u:User {verified: true})
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower:User)
RETURN u.name,
       COUNT(DISTINCT p) AS posts,
       COUNT(DISTINCT follower) AS followers
ORDER BY followers DESC

// Required relationship, optional second level
MATCH (u:User)-[:MEMBER_OF]->(g:Group)
OPTIONAL MATCH (g)-[:PARENT_GROUP]->(parent:Group)
RETURN u.name, g.name, parent.name AS parent_group_name
```

## MATCH with WHERE

### Property Filters

```gql
// Simple property conditions
MATCH (u:User)
WHERE u.age >= 18
  AND u.verified = true
  AND u.status = 'active'
RETURN u

// String operations
MATCH (p:Product)
WHERE p.name STARTS WITH 'iPhone'
   OR p.name ENDS WITH 'Pro'
   OR p.name CONTAINS 'Max'
RETURN p.name

// Numeric ranges
MATCH (p:Product)
WHERE p.price BETWEEN 100 AND 500
  AND p.rating >= 4.0
RETURN p.name, p.price, p.rating

// IN operator
MATCH (u:User)
WHERE u.role IN ['admin', 'moderator', 'editor']
  AND u.region IN ['US', 'CA', 'UK']
RETURN u.name, u.role, u.region

// Regular expressions
MATCH (u:User)
WHERE u.email =~ '.*@(gmail|hotmail|yahoo)\\.com$'
RETURN u.name, u.email

// Null checks
MATCH (u:User)
WHERE u.phone_verified IS NOT NULL
  AND u.email_verified IS NULL
RETURN u.name
```

### Pattern Predicates

```gql
// Existence check
MATCH (u:User)
WHERE (u)-[:POSTED]->(:Post)
RETURN u.name  // Users who have posted

// Non-existence check
MATCH (u:User)
WHERE NOT (u)-[:POSTED]->(:Post)
RETURN u.name  // Users who haven't posted

// Complex pattern predicates
MATCH (u:User)
WHERE (u)-[:POSTED]->(:Post {featured: true})
  AND NOT (u)-[:SUSPENDED]->()
  AND SIZE((u)-[:FOLLOWS]->(:User)) > 100
RETURN u.name AS influencer

// Pattern with property constraints
MATCH (u:User)
WHERE (u)-[:RATED {score: 5}]->(:Movie)
RETURN u.name  // Users who gave 5-star ratings

// Counting in predicates
MATCH (u:User)
WHERE SIZE((u)-[:POSTED]->(:Post)) > 10
  AND SIZE((u)<-[:FOLLOWS]-(:User)) > 100
RETURN u.name AS power_user
```

### Collection Predicates

```gql
// IN operator with property
MATCH (u:User)
WHERE 'python' IN u.skills
RETURN u.name

// ALL predicate
MATCH (u:User)
WHERE ALL(tag IN u.tags WHERE LENGTH(tag) > 2)
RETURN u.name, u.tags

// ANY predicate
MATCH (u:User)
WHERE ANY(score IN u.test_scores WHERE score > 90)
RETURN u.name

// NONE predicate
MATCH (u:User)
WHERE NONE(flag IN u.flags WHERE flag = 'banned')
RETURN u.name

// SINGLE predicate
MATCH (u:User)
WHERE SINGLE(email IN u.contact_emails WHERE email ENDS WITH '@company.com')
RETURN u.name
```

## Advanced MATCH Patterns

### Subquery Expressions

```gql
// EXISTS with subquery
MATCH (u:User)
WHERE EXISTS {
  MATCH (u)-[:POSTED]->(p:Post)
  WHERE p.likes > 100
}
RETURN u.name

// COUNT in subquery
MATCH (u:User)
WHERE COUNT {
  MATCH (u)-[:POSTED]->(p:Post)
  WHERE p.published = true
} > 10
RETURN u.name

// Nested patterns
MATCH (u:User)
WHERE EXISTS {
  MATCH (u)-[:FOLLOWS]->(f:User)
  WHERE EXISTS {
    MATCH (f)-[:POSTED]->(p:Post)
    WHERE p.featured = true
  }
}
RETURN u.name  // Users following someone with featured posts
```

### List Comprehensions

```gql
// Pattern-based list comprehension
MATCH (u:User)
RETURN u.name,
  [(u)-[:FOLLOWS]->(f:User) | f.name] AS following_names

// With filtering
MATCH (u:User)
RETURN u.name,
  [(u)-[:FOLLOWS]->(f:User) WHERE f.verified = true | f.name] AS verified_following

// With transformation
MATCH (u:User)
RETURN u.name,
  [(u)-[:POSTED]->(p:Post) | {title: p.title, likes: p.likes}] AS posts

// Nested comprehensions
MATCH (u:User)
RETURN u.name,
  [(u)-[:MEMBER_OF]->(g:Group) |
    {
      group: g.name,
      members: [(g)<-[:MEMBER_OF]-(m:User) | m.name]
    }
  ] AS groups_and_members
```

## Performance Optimization

### Anchor Pattern First

```gql
// Good: Start with indexed property
MATCH (u:User {email: 'alice@example.com'})
MATCH (u)-[:POSTED]->(p:Post)
RETURN p.title

// Avoid: Broad pattern first
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE u.email = 'alice@example.com'
RETURN p.title
```

### Use Inline Filters

```gql
// Good: Inline property filter
MATCH (u:User {verified: true, active: true})-[:POSTED]->(p:Post)
RETURN p

// Less efficient: Separate WHERE clause
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE u.verified = true AND u.active = true
RETURN p
```

### Specify Relationship Direction

```gql
// Good: Known direction
MATCH (author:User)-[:POSTED]->(p:Post)
RETURN author, p

// Slower: Undirected when direction is known
MATCH (author:User)-[:POSTED]-(p:Post)
RETURN author, p
```

### Limit Variable-Length Paths

```gql
// Good: Bounded traversal
MATCH (a:User)-[:KNOWS*1..4]->(b:User)
RETURN b.name

// Dangerous: Unbounded traversal
MATCH (a:User)-[:KNOWS*]->(b:User)
RETURN b.name
```

## Common Patterns

### Social Network

```gql
// Find friends of friends
MATCH (me:User {id: $my_id})-[:KNOWS]->(:User)-[:KNOWS]->(fof:User)
WHERE NOT (me)-[:KNOWS]->(fof) AND me <> fof
RETURN DISTINCT fof.name, COUNT(*) AS mutual_friends
ORDER BY mutual_friends DESC

// Mutual followers
MATCH (me:User {id: $my_id})-[:FOLLOWS]->(mutual)<-[:FOLLOWS]-(you:User {id: $your_id})
RETURN mutual.name

// Influencer detection
MATCH (u:User)<-[:FOLLOWS]-(follower)
WITH u, COUNT(follower) AS follower_count
WHERE follower_count > 1000
RETURN u.name, follower_count
ORDER BY follower_count DESC
```

### Recommendation

```gql
// Collaborative filtering
MATCH (me:User {id: $my_id})-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(other:User)-[:PURCHASED]->(rec:Product)
WHERE NOT (me)-[:PURCHASED]->(rec)
RETURN rec.name, COUNT(DISTINCT other) AS similar_users
ORDER BY similar_users DESC
LIMIT 10

// Content-based
MATCH (item:Product {id: $product_id})-[:HAS_TAG]->(tag:Tag)
      <-[:HAS_TAG]-(similar:Product)
WHERE item <> similar
RETURN similar.name, COUNT(tag) AS shared_tags
ORDER BY shared_tags DESC
LIMIT 10
```

### Hierarchical

```gql
// Organization chart
MATCH path = (boss:Employee {title: 'CEO'})-[:MANAGES*]->(report:Employee)
RETURN report.name, LENGTH(path) AS depth
ORDER BY depth, report.name

// Category tree
MATCH path = (root:Category {name: 'Electronics'})-[:SUBCATEGORY*]->(leaf:Category)
WHERE NOT (leaf)-[:SUBCATEGORY]->()
RETURN leaf.name, [node IN NODES(path) | node.name] AS breadcrumb
```

## Client Library Examples

### Python

```python
from geode_client import GeodeClient

async with GeodeClient("localhost:3141") as client:
    # Simple MATCH
    result = await client.query("""
        MATCH (u:User)-[:FOLLOWS]->(f:User)
        WHERE u.id = $user_id
        RETURN f.name, f.bio
    """, {"user_id": 123})

    async for row in result:
        print(f"{row['name']}: {row['bio']}")

    # Variable-length path
    result = await client.query("""
        MATCH path = (a:User)-[:KNOWS*1..3]->(b:User)
        WHERE a.id = $from AND b.id = $to
        RETURN [node IN NODES(path) | node.name] AS path_names
        ORDER BY LENGTH(path)
        LIMIT 1
    """, {"from": 1, "to": 100})
```

### Go

```go
import "database/sql"
import _ "go.codepros.org/geode"

db, _ := sql.Open("geode", "geode://localhost:3141")

rows, _ := db.Query(`
    MATCH (u:User)-[:POSTED]->(p:Post)<-[:LIKED]-(liker:User)
    WHERE u.id = $1
    RETURN p.title, COUNT(DISTINCT liker) AS likes
    ORDER BY likes DESC
    LIMIT 10
`, 123)

for rows.Next() {
    var title string
    var likes int
    rows.Scan(&title, &likes)
    fmt.Printf("%s: %d likes\n", title, likes)
}
```

### Rust

```rust
use geode_client::Client;

let client = Client::connect("localhost:3141").await?;

let result = client.query(
    r#"
        MATCH (u:User {verified: true})-[:POSTED]->(p:Post)
        WHERE p.published = true
        RETURN u.name, COUNT(p) AS posts
        ORDER BY posts DESC
        LIMIT 10
    "#,
    &[],
).await?;

for row in result.rows() {
    println!("{}: {} posts", row["name"], row["posts"]);
}
```

## Best Practices

1. **Start Specific**: Begin with indexed properties for anchoring
2. **Use Inline Filters**: Apply property filters in MATCH when possible
3. **Know Directions**: Specify relationship directions when known
4. **Bound Paths**: Always limit variable-length pattern hops
5. **Filter Early**: Apply WHERE conditions immediately after relevant MATCH
6. **Avoid Cartesian Products**: Connect patterns with relationships
7. **Use OPTIONAL Carefully**: Understand LEFT OUTER JOIN semantics
8. **Index Strategically**: Create indexes on frequently matched properties

## Related Topics

- **Pattern Matching**: Deep dive into graph patterns
- **Query Language**: Complete GQL syntax
- **WHERE Clause**: Filtering and predicates
- **EXPLAIN**: Query execution analysis
- **Performance**: Query optimization

## Further Reading

- [Pattern Matching](/tags/pattern-matching/) - Graph pattern techniques
- [Query Language](/tags/query-language/) - Full GQL guide
- [EXPLAIN](/tags/explain/) - Query optimization
- [Performance](/tags/performance/) - Performance tuning
- [GQL Reference](/tags/gql-reference/) - Complete GQL documentation

The MATCH clause is the foundation of graph querying in Geode, enabling you to express complex graph patterns with simple, declarative syntax that scales from simple lookups to sophisticated graph analytics.
