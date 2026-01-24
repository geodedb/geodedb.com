---
title: "Category: Graph Query Language (GQL)"
description: "Comprehensive GQL query language documentation for Geode including ISO standard syntax, pattern matching, MATCH clauses, CREATE operations, aggregations, and advanced query techniques."
keywords:
  - GQL
  - Graph Query Language
  - ISO 39075
  - query language
  - pattern matching
  - MATCH
  - CREATE
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/query-language/"
    noindex: false
---

The **Graph Query Language (GQL)** category provides comprehensive documentation on writing queries in Geode using the ISO/IEC 39075:2024 standard. From basic pattern matching to advanced analytical queries, this collection covers everything you need to effectively query graph data.

## Introduction to GQL

Graph Query Language (GQL) is the ISO-standardized language for querying graph databases, analogous to SQL for relational databases. Ratified as ISO/IEC 39075:2024, GQL represents decades of graph database research unified into a single, coherent specification. Geode provides 100% compliance with this standard, ensuring your queries are portable, future-proof, and backed by international consensus.

GQL adopts a **declarative approach**: you describe what patterns to find, not how to find them. The query engine determines optimal execution strategies using cost-based optimization, indexes, and graph-specific algorithms. This separation of concerns lets you focus on business logic while Geode handles performance.

## Core Concepts

### Nodes and Relationships

Graphs consist of **nodes** (entities) and **relationships** (connections). Nodes have **labels** that categorize them and **properties** that store attributes. Relationships have **types** and can also contain properties.

```gql
-- Node: (variable:Label {property: value})
(person:Person {name: 'Alice', age: 30})

-- Relationship: -[variable:TYPE {property: value}]->
-[friendship:KNOWS {since: 2020}]->

-- Undirected relationship
-[connection:CONNECTED]-
```

### Pattern Matching

Pattern matching is the foundation of GQL queries. Use `MATCH` to describe patterns in the graph, then `RETURN` to specify what to retrieve:

```gql
-- Find Alice's friends
MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend:Person)
RETURN friend.name, friend.age
```

**Patterns** describe graph structure using ASCII art notation:
- `()` - A node
- `(n)` - A node bound to variable `n`
- `(n:Label)` - A node with label `Label`
- `(n:Label {prop: value})` - A node with label and properties
- `-[r:TYPE]->` - A directed relationship
- `-[r:TYPE]-` - An undirected relationship
- `-[:TYPE*1..3]->` - Variable-length path (1 to 3 hops)

### Variables and Binding

Variables bind to matched elements, allowing you to reference them in other clauses:

```gql
MATCH (u:User {id: $userId})-[:FOLLOWS]->(followed:User)
      -[:POSTED]->(post:Post)
WHERE post.created > current_timestamp() - INTERVAL '7' DAY
RETURN followed.username, post.content, post.created
ORDER BY post.created DESC
```

Variables scope within a query. Use `WITH` to pass variables between query parts:

```gql
MATCH (u:User)
WITH u, count{(u)-[:POSTED]->()} AS post_count
WHERE post_count > 10
RETURN u.username, post_count
```

## Basic Query Operations

### Reading Data: MATCH

`MATCH` finds patterns in the graph:

```gql
-- Single node
MATCH (n:Person)
RETURN n.name

-- Node with specific properties
MATCH (n:Person {country: 'USA', age: 25})
RETURN n.name

-- Node with relationship
MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN a.name, b.name

-- Multi-hop relationship
MATCH (a:Person)-[:KNOWS]->(:Person)-[:KNOWS]->(c:Person)
WHERE a.name = 'Alice'
RETURN c.name
```

### Creating Data: CREATE

`CREATE` adds new nodes and relationships:

```gql
-- Create single node
CREATE (n:Person {name: 'Alice', age: 30})

-- Create multiple nodes
CREATE (a:Person {name: 'Alice'}),
       (b:Person {name: 'Bob'})

-- Create nodes with relationship
CREATE (a:Person {name: 'Alice'})
       -[:KNOWS {since: 2020}]->
       (b:Person {name: 'Bob'})
```

### Updating Data: SET and REMOVE

`SET` modifies properties:

```gql
-- Set single property
MATCH (n:Person {name: 'Alice'})
SET n.age = 31

-- Set multiple properties
MATCH (n:Person {name: 'Alice'})
SET n.age = 31, n.city = 'New York'

-- Add label
MATCH (n:Person {name: 'Alice'})
SET n:VIP

-- Copy properties
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
SET b = a
```

`REMOVE` deletes properties or labels:

```gql
-- Remove property
MATCH (n:Person {name: 'Alice'})
REMOVE n.age

-- Remove label
MATCH (n:Person {name: 'Alice'})
REMOVE n:VIP
```

### Deleting Data: DELETE

`DELETE` removes nodes and relationships:

```gql
-- Delete relationship
MATCH (a:Person)-[r:KNOWS]->(b:Person)
WHERE a.name = 'Alice' AND b.name = 'Bob'
DELETE r

-- Delete node and its relationships
MATCH (n:Person {name: 'Alice'})
DETACH DELETE n

-- Delete all matching nodes
MATCH (n:TempData)
DELETE n
```

`DETACH DELETE` automatically removes all relationships connected to deleted nodes.

## Filtering with WHERE

`WHERE` filters matched patterns using predicates:

```gql
-- Comparison operators
MATCH (n:Person)
WHERE n.age > 25 AND n.age < 40
RETURN n.name

-- String matching
MATCH (n:Person)
WHERE n.name STARTS WITH 'A'
   OR n.email CONTAINS '@example.com'
RETURN n.name

-- NULL checks
MATCH (n:Person)
WHERE n.middle_name IS NULL
RETURN n.name

-- List membership
MATCH (n:Person)
WHERE n.country IN ['USA', 'Canada', 'Mexico']
RETURN n.name

-- Pattern existence
MATCH (u:User)
WHERE EXISTS {
    MATCH (u)-[:PURCHASED]->(:Product {category: 'Electronics'})
}
RETURN u.name
```

## Aggregations and Grouping

GQL provides statistical aggregation functions:

```gql
-- Count
MATCH (n:Person)
RETURN count(n) AS total_people

-- Sum, average, min, max
MATCH (u:User)-[t:TRANSACTION]->()
RETURN u.name,
       sum(t.amount) AS total_spent,
       avg(t.amount) AS avg_transaction,
       min(t.amount) AS smallest,
       max(t.amount) AS largest

-- Group by
MATCH (p:Product)
RETURN p.category, count(p) AS products_per_category
GROUP BY p.category
ORDER BY products_per_category DESC

-- Collect into list
MATCH (u:User {name: 'Alice'})-[:KNOWS]->(friend:Person)
RETURN u.name, collect(friend.name) AS friend_names
```

## Advanced Pattern Matching

### Variable-Length Paths

Match paths with varying length:

```gql
-- 1 to 3 hops
MATCH (a:Person {name: 'Alice'})-[:KNOWS*1..3]->(friend:Person)
RETURN friend.name

-- Exactly 2 hops
MATCH (a:Person {name: 'Alice'})-[:KNOWS*2]->(friend:Person)
RETURN friend.name

-- Any length (use cautiously!)
MATCH path = (a:Person {name: 'Alice'})-[:KNOWS*]->(b:Person {name: 'Bob'})
RETURN path
```

### Shortest Paths

Find minimal-length paths:

```gql
-- Shortest path
MATCH path = SHORTEST (a:Person {name: 'Alice'})
                      -[:KNOWS*]->
                      (b:Person {name: 'Bob'})
RETURN path, length(path) AS hops

-- All shortest paths
MATCH paths = ALL SHORTEST (a:Person {name: 'Alice'})
                           -[:KNOWS*]->
                           (b:Person {name: 'Bob'})
RETURN paths
```

### Optional Patterns

Match patterns that may not exist:

```gql
-- OPTIONAL MATCH returns NULL if pattern doesn't exist
MATCH (u:User)
OPTIONAL MATCH (u)-[:PURCHASED]->(p:Product)
RETURN u.name, p.name

-- Multiple optional patterns
MATCH (u:User {name: 'Alice'})
OPTIONAL MATCH (u)-[:LIKES]->(post:Post)
OPTIONAL MATCH (u)-[:FOLLOWS]->(other:User)
RETURN u.name, post.title, other.username
```

### Subqueries

Execute nested queries:

```gql
-- Correlated subquery
MATCH (u:User)
WHERE EXISTS {
    MATCH (u)-[:PURCHASED]->(p:Product)
    WHERE p.price > 100
}
RETURN u.name

-- COUNT subquery
MATCH (u:User)
WITH u, count{(u)-[:POSTED]->()} AS post_count
WHERE post_count > 10
RETURN u.username, post_count
```

## Ordering and Limiting Results

Control result ordering and size:

```gql
-- Order by single property
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.price DESC

-- Order by multiple properties
MATCH (p:Person)
RETURN p.lastName, p.firstName
ORDER BY p.lastName, p.firstName

-- Limit results
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.price DESC
LIMIT 10

-- Skip and limit (pagination)
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.price DESC
SKIP 20
LIMIT 10
```

## Working with Data Types

GQL supports rich data types:

```gql
-- Strings
CREATE (n:Node {text: 'Hello, World!'})

-- Numbers (integers and floats)
CREATE (n:Node {count: 42, ratio: 3.14159})

-- Booleans
CREATE (n:Node {active: true, deleted: false})

-- Dates and times
CREATE (n:Node {
    created: DATE '2024-01-15',
    updated: TIMESTAMP '2024-01-15T10:30:00Z',
    duration: DURATION 'P1Y2M3DT4H5M6S'
})

-- Lists
CREATE (n:Node {tags: ['important', 'urgent', 'review']})

-- Maps
CREATE (n:Node {metadata: {author: 'Alice', version: 2}})

-- NULL values
CREATE (n:Node {optional_field: NULL})
```

## Parameterized Queries

Use parameters for security and performance:

```python
import geode_client

async with geode_client.connect("localhost:3141") as client:
    result = await client.execute("""
        MATCH (u:User {email: $email})
        SET u.last_login = $timestamp
        RETURN u
    """, {
        "email": "alice@example.com",
        "timestamp": datetime.now(timezone.utc)
    })
```

Parameters prevent SQL injection, enable query plan caching, and improve readability.

## Transaction Control

Manage multi-statement transactions:

```python
async with client.transaction() as tx:
    # All operations in one transaction
    await tx.execute("""
        MATCH (a:Account {id: $from})
        SET a.balance = a.balance - $amount
    """, {"from": 123, "amount": 100})

    await tx.execute("""
        MATCH (a:Account {id: $to})
        SET a.balance = a.balance + $amount
    """, {"to": 456, "amount": 100})

    # Commit atomically
    await tx.commit()
```

## Best Practices

1. **Use parameters**: Never concatenate user input into queries
2. **Filter early**: Place selective predicates in `MATCH` patterns when possible
3. **Limit results**: Always use `LIMIT` for unbounded queries
4. **Index wisely**: Create indexes on properties used in `WHERE` and `MATCH`
5. **Avoid Cartesian products**: Ensure patterns are connected
6. **Use OPTIONAL carefully**: Optional matches can complicate query plans
7. **Profile queries**: Use `EXPLAIN` and `PROFILE` to understand execution
8. **Document complex queries**: Explain business logic in comments

## Common Patterns

### Recommendation Query

```gql
-- Collaborative filtering
MATCH (me:User {id: $userId})-[:LIKES]->(item)<-[:LIKES]-(similar:User)
      -[:LIKES]->(recommendation)
WHERE NOT EXISTS {MATCH (me)-[:LIKES]->(recommendation)}
RETURN recommendation.title, COUNT(similar) AS score
ORDER BY score DESC
LIMIT 10
```

### Fraud Detection

```gql
-- Find suspicious transaction patterns
MATCH (a1:Account)-[t1:TRANSFER]->(a2:Account)-[t2:TRANSFER]->(a3:Account)
WHERE a3.id = a1.id
  AND t1.timestamp > current_timestamp() - INTERVAL '24' HOUR
RETURN a1.id, a2.id, SUM(t1.amount) AS circular_flow
```

### Social Network Analysis

```gql
-- Find friends of friends who aren't yet friends
MATCH (me:User {id: $userId})-[:FRIEND]->(friend)-[:FRIEND]->(suggestion)
WHERE NOT EXISTS {MATCH (me)-[:FRIEND]->(suggestion)}
  AND suggestion.id <> $userId
RETURN suggestion.name, COUNT(friend) AS mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10
```

## Related Topics

- [GQL Syntax Reference](/tags/gql-syntax/) - Detailed syntax documentation
- [Pattern Matching](/tags/pattern-matching/) - Advanced pattern techniques
- [Query Optimization](/categories/query-optimization/) - Performance tuning
- [Aggregation Functions](/tags/functions/) - Statistical operations
- [ISO GQL Standard](/tags/iso-gql/) - Official specification
- [MATCH Clause](/tags/match/) - Pattern matching details
- [Operators](/tags/operators/) - Comparison and logical operators

## Further Reading

- [GQL Tutorial](/docs/tutorials/gql-basics/) - Step-by-step learning path
- [API Reference](/docs/api-reference/) - Complete function reference
- [Examples](/categories/examples/) - Real-world query examples
- [GQL Specification](/docs/gql-reference/specification/) - ISO standard details
