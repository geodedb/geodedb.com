---
title: "Query Language and Execution"
description: "Explore Geode documentation tagged with query. Learn about query features, best practices, and implementation details."
keywords:
  - query
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/query/"
    noindex: false
---

# Query Language and Execution in Geode

Querying is the primary interface for interacting with graph databases. Geode implements the ISO/IEC 39075:2024 Graph Query Language (GQL) standard, providing a powerful, declarative language for pattern matching, traversals, aggregations, and data manipulation across graph structures.

## Introduction to Graph Querying

Graph queries differ fundamentally from SQL queries:

**SQL (Relational)**:
- Tables with rows and columns
- Joins explicitly specified
- Fixed schema required
- Path queries complex (recursive CTEs)

**GQL (Graph)**:
- Nodes and relationships as first-class citizens
- Relationships traversed naturally with pattern matching
- Flexible schema (property graph model)
- Path queries intuitive with variable-length patterns

Example comparison:
```sql
-- SQL: Find friends-of-friends (complex)
SELECT DISTINCT u3.name
FROM users u1
JOIN friendships f1 ON u1.id = f1.user_id
JOIN users u2 ON f1.friend_id = u2.id
JOIN friendships f2 ON u2.id = f2.user_id
JOIN users u3 ON f2.friend_id = u3.id
WHERE u1.name = 'Alice' AND u3.id != u1.id;
```

```gql
-- GQL: Same query (intuitive)
MATCH (u:User {name: 'Alice'})-[:FRIEND]->()-[:FRIEND]->(fof:User)
WHERE fof <> u
RETURN DISTINCT fof.name;
```

## GQL Query Structure

### Basic Pattern Matching

MATCH finds patterns in the graph:

```gql
-- Match nodes with label
MATCH (u:User)
RETURN u.name;

-- Match relationships
MATCH (u:User)-[:FRIEND]->(friend:User)
RETURN u.name, friend.name;

-- Match with properties
MATCH (p:Product {category: 'Electronics', available: true})
RETURN p.name, p.price;

-- Match with WHERE clause
MATCH (u:User)
WHERE u.age >= 18 AND u.country = 'USA'
RETURN u.name, u.email;
```

### Variable-Length Paths

Query paths of varying lengths:

```gql
-- Friends up to 3 hops away
MATCH (u:User {id: $user_id})-[:FRIEND*1..3]->(connection:User)
RETURN DISTINCT connection.name, length(path) AS hops;

-- All paths (use cautiously!)
MATCH path = (start:Node)-[:CONNECTED*]->(end:Node)
WHERE start.id = $start_id AND end.id = $end_id
RETURN path;

-- Shortest path
MATCH path = shortestPath((start:Node)-[:EDGE*]-(end:Node))
WHERE start.id = $start AND end.id = $end
RETURN path, length(path) AS distance;
```

### Data Manipulation

CREATE, UPDATE, DELETE operations:

```gql
-- Create nodes
CREATE (u:User {
    id: $id,
    name: $name,
    email: $email,
    created_at: timestamp()
});

-- Create relationships
MATCH (u:User {id: $user_id}), (p:Product {id: $product_id})
CREATE (u)-[:PURCHASED {
    timestamp: timestamp(),
    price: $price,
    quantity: $quantity
}]->(p);

-- Update properties
MATCH (u:User {id: $user_id})
SET u.last_login = timestamp(),
    u.login_count = u.login_count + 1;

-- Delete (node and relationships)
MATCH (u:User {id: $user_id})
DETACH DELETE u;  -- Deletes node and all its relationships
```

### Aggregations

Group and aggregate data:

```gql
-- Count by category
MATCH (p:Product)
RETURN p.category, count(p) AS product_count
ORDER BY product_count DESC;

-- Average, sum, min, max
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name,
       count(p) AS purchases,
       avg(p.price) AS avg_price,
       sum(p.price) AS total_spent,
       min(p.price) AS cheapest,
       max(p.price) AS most_expensive;

-- Collect into lists
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name, collect(p.name) AS purchased_products;
```

## Query Execution Process

Understanding how Geode executes queries helps write efficient queries:

### 1. Parsing

Query text parsed into Abstract Syntax Tree (AST):
```gql
MATCH (u:User {country: 'USA'})-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN u.name, p.name;
```

**Parsed structure**:
- MATCH clause: Pattern with node filters
- WHERE clause: Additional predicates
- RETURN clause: Projection

### 2. Planning

Optimizer generates execution plan:
```
EXPLAIN
MATCH (u:User {country: 'USA'})-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN u.name, p.name;

-- Plan:
Project(u.name, p.name)
  Filter(p.price > 100)
    Expand((User)-[:PURCHASED]->(Product))
      IndexSeek(User.country = 'USA')
```

### 3. Execution

Plan executed step-by-step:
1. IndexSeek: Find Users in USA (fast)
2. Expand: Follow PURCHASED relationships
3. Filter: Keep only products with price > 100
4. Project: Return requested properties

### 4. Result Streaming

Results streamed to client as they're produced (not buffered entirely).

## Common Query Patterns

### Pattern 1: Recommendation Engine

Collaborative filtering using graph traversals:

```gql
-- Find products bought by similar users
MATCH (me:User {id: $my_id})-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(similar:User)-[:PURCHASED]->(recommendation:Product)
WHERE NOT (me)-[:PURCHASED]->(recommendation)
WITH recommendation, count(similar) AS similar_users
WHERE similar_users >= 3
RETURN recommendation.name,
       recommendation.price,
       similar_users
ORDER BY similar_users DESC
LIMIT 10;
```

### Pattern 2: Social Network Analysis

Find influential users (high centrality):

```gql
-- Count followers (in-degree centrality)
MATCH (u:User)<-[:FOLLOWS]-(follower)
WITH u, count(follower) AS follower_count
WHERE follower_count > 100
RETURN u.name, follower_count
ORDER BY follower_count DESC
LIMIT 50;

-- Find mutual connections
MATCH (me:User {id: $my_id})-[:FRIEND]-(mutual)-[:FRIEND]-(them:User {id: $their_id})
RETURN mutual.name, mutual.email;
```

### Pattern 3: Fraud Detection

Detect suspicious patterns:

```gql
-- Find accounts sharing devices but claiming to be different people
MATCH (u1:User)-[:LOGGED_IN_FROM]->(device:Device)<-[:LOGGED_IN_FROM]-(u2:User)
WHERE u1.id < u2.id
  AND u1.email <> u2.email
  AND u1.address = u2.address
RETURN u1.name, u2.name, device.fingerprint,
       count(*) AS shared_logins
ORDER BY shared_logins DESC;

-- Circular transfers (possible money laundering)
MATCH path = (a1:Account)-[:TRANSFER*4..6]->(a1)
WHERE reduce(total = 0, r IN relationships(path) | total + r.amount) > 10000
RETURN path, reduce(total = 0, r IN relationships(path) | total + r.amount) AS total_amount;
```

### Pattern 4: Knowledge Graph Queries

Semantic queries over structured knowledge:

```gql
-- Find entities related through multiple relationship types
MATCH (entity:Entity {name: 'Artificial Intelligence'})
      -[r:RELATED_TO|PART_OF|INFLUENCES*1..2]-(related:Entity)
RETURN related.name, collect(type(r)) AS relationship_types, count(r) AS connection_strength
ORDER BY connection_strength DESC
LIMIT 20;

-- Find experts on a topic
MATCH (topic:Topic {name: $topic_name})<-[:WROTE_ABOUT]-(article:Article)
      <-[:AUTHORED]-(author:Person)
WITH author, count(article) AS article_count
WHERE article_count >= 5
RETURN author.name, author.affiliation, article_count
ORDER BY article_count DESC;
```

## Query Optimization Tips

### Tip 1: Use Indexes

Create indexes on frequently filtered properties:

```gql
-- Without index: slow (full scan)
MATCH (u:User {email: 'alice@example.com'})
RETURN u;

-- Create index
CREATE INDEX user_email ON User(email);

-- With index: fast (logarithmic lookup)
MATCH (u:User {email: 'alice@example.com'})
RETURN u;
```

### Tip 2: Filter Early

Push filters as close to data source as possible:

```gql
-- BAD: Filter after expensive traversal
MATCH (u:User)-[:FRIEND*1..3]->(connection:User)
WHERE u.country = 'USA'
RETURN connection.name;

-- GOOD: Filter before traversal
MATCH (u:User {country: 'USA'})-[:FRIEND*1..3]->(connection:User)
RETURN connection.name;
```

### Tip 3: Limit Intermediate Results

Use LIMIT to bound explosion of intermediate results:

```gql
-- Potentially huge intermediate result
MATCH (u:User)-[:FRIEND]->(friend)
WITH friend
MATCH (friend)-[:LIKES]->(item)
RETURN item.name, count(friend) AS likes;

-- Bounded intermediate result
MATCH (u:User)-[:FRIEND]->(friend)
WITH friend
LIMIT 1000  -- Limit before expensive second traversal
MATCH (friend)-[:LIKES]->(item)
RETURN item.name, count(friend) AS likes;
```

### Tip 4: Use Parameters

Parameterized queries enable plan caching:

```gql
-- Plan cached and reused
MATCH (u:User {id: $user_id})
RETURN u;

-- Different plan for each query (slower)
MATCH (u:User {id: 123})
RETURN u;
```

## Client Libraries

### Python Client

```python
from geode_client import GeodeClient
import asyncio

async def query_example():
    async with GeodeClient("localhost", 3141) as client:
        # Simple query
        result = await client.execute("""
            MATCH (u:User)
            WHERE u.country = $country
            RETURN u.name, u.email
            ORDER BY u.name
            LIMIT 10
        """, {"country": "USA"})

        # Iterate results
        for row in result.bindings:
            print(f"{row['name']}: {row['email']}")

        # Transaction
        async with client.transaction():
            await client.execute("""
                CREATE (u:User {id: $id, name: $name})
            """, {"id": 123, "name": "Alice"})

            await client.execute("""
                MATCH (u:User {id: $id})
                SET u.verified = true
            """, {"id": 123})
            # Commits automatically on context exit

asyncio.run(query_example())
```

### Go Client

```go
import (
    "database/sql"
    _ "go.codepros.org/geode"
)

func queryExample() {
    db, err := sql.Open("geode", "geode://localhost:3141/mydb")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Parameterized query
    rows, err := db.Query(`
        MATCH (u:User)
        WHERE u.age >= $1
        RETURN u.name, u.age
        ORDER BY u.age DESC
    `, 18)
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    for rows.Next() {
        var name string
        var age int
        if err := rows.Scan(&name, &age); err != nil {
            log.Fatal(err)
        }
        fmt.Printf("%s: %d\n", name, age)
    }
}
```

## Performance Considerations

**Query latency depends on**:
- Index utilization (indexed vs. full scan)
- Result cardinality (10 rows vs. 1M rows)
- Graph complexity (1 hop vs. 6 hops)
- Concurrent load (single query vs. 1000 QPS)

**Typical performance** (mid-range server):
- Indexed point lookup: <1ms
- Simple 1-2 hop traversal: 1-5ms
- Complex 3-4 hop pattern: 10-100ms
- Analytical aggregation: 100ms-10s

**Use PROFILE to measure**:
```gql
PROFILE
MATCH (u:User {id: $id})-[:FRIEND*1..2]->(connection)
RETURN connection.name;

-- Shows:
-- - Time per operation
-- - Rows processed
-- - Index usage
-- - Cache hits
```

## Related Topics

- **[GQL](/tags/gql/)**: GQL standard and syntax
- **[Query Optimization](/tags/query-optimization/)**: Deep dive into optimization
- **[Pattern Matching](/tags/pattern-matching/)**: Pattern matching techniques
- **[Performance](/tags/performance/)**: Performance tuning
- **[Indexing](/tags/indexing/)**: Index strategies
- **[Explain](/tags/explain/)**: Query plan analysis

## Further Reading

- **GQL Language Guide**: `/docs/gql/language-guide/`
- **Query Patterns**: `/docs/gql/query-patterns/`
- **Optimization Guide**: `/docs/performance/query-optimization/`
- **Client Libraries**: `/docs/client-libraries/overview/`
- **API Reference**: `/docs/api-reference/gql-syntax/`
