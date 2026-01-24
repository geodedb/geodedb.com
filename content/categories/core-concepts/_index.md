---
title: "Category: Core Concepts"
description: "Comprehensive core-concepts documentation for Geode graph database including guides, tutorials, and reference materials."
keywords:
  - core-concepts
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/core-concepts/"
    noindex: false
---

Core concepts form the foundation of understanding Geode graph database, providing the essential knowledge needed to model data, write queries, manage transactions, and build robust applications. These fundamental principles underpin everything from simple graph traversals to complex analytical workloads, security policies, and distributed deployments. Mastering these concepts enables developers and architects to leverage Geode's full capabilities effectively.

Geode's core concepts include graph data models (nodes, relationships, properties, labels), the ISO/IEC 39075:2024 Graph Query Language (GQL), ACID transactions with MVCC isolation, indexes for efficient lookups, and security primitives including authentication and Row-Level Security (RLS). Each concept builds on others to create a cohesive, powerful platform for managing connected data at scale.

This category explores these foundational concepts in depth, explaining not just what they are but why they matter, how they work in Geode's architecture, and how to apply them effectively in real-world scenarios. Whether you're new to graph databases or transitioning from other platforms, these core concepts provide the mental models needed for success.

## Graph Data Model

### Nodes

Nodes represent entities in your domain. Each node can have:
- Zero or more labels (types)
- Properties (key-value pairs)
- Relationships to other nodes

```gql
-- Create nodes with labels and properties
CREATE (:User {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    created_at: datetime()
})

CREATE (:Product {
    id: 101,
    title: 'Graph Database Guide',
    price: 49.99,
    category: 'Books'
})
```

**Key characteristics**:
- Nodes are the fundamental unit of data storage
- Labels enable categorization and indexing
- Properties store actual data
- Nodes can have multiple labels: `(:User:PremiumUser:Subscriber)`

### Relationships

Relationships connect nodes and model the graph structure. Each relationship has:
- A single type (semantic meaning)
- Direction (from source to target)
- Properties (attributes of the relationship)
- References to source and target nodes

```gql
-- Create relationships with properties
MATCH (u:User {id: 1}), (p:Product {id: 101})
CREATE (u)-[:PURCHASED {
    price: 49.99,
    quantity: 1,
    timestamp: datetime(),
    discount_applied: true
}]->(p)

-- Relationships have direction
MATCH (alice:User {name: 'Alice'}), (bob:User {name: 'Bob'})
CREATE (alice)-[:FRIEND_OF]->(bob)
CREATE (bob)-[:FRIEND_OF]->(alice)  -- Bidirectional requires two relationships
```

**Key characteristics**:
- Relationships always have a type and direction
- Traversing relationships is O(1) per relationship
- Relationship properties enable rich modeling
- Bi-directional traversal is efficient regardless of direction

### Properties

Properties are key-value pairs attached to nodes or relationships:

```gql
-- Supported property types
CREATE (:Example {
    string_prop: 'text value',
    integer_prop: 42,
    float_prop: 3.14159,
    boolean_prop: true,
    date_prop: date('2025-01-24'),
    datetime_prop: datetime(),
    list_prop: [1, 2, 3, 4, 5],
    map_prop: {key1: 'value1', key2: 'value2'},
    null_prop: NULL,
    vector_prop: [0.1, 0.2, 0.3]  -- For vector search
})
```

**Property types**:
- Scalar: strings, integers, floats, booleans, dates, datetimes
- Complex: lists, maps
- Special: NULL, vector embeddings
- All property types are strongly typed

### Labels

Labels categorize nodes and enable efficient filtering:

```gql
-- Multiple labels provide multi-dimensional categorization
CREATE (:Person:Employee:Manager {name: 'Alice'})
CREATE (:Person:Customer:PremiumCustomer {name: 'Bob'})

-- Query by label
MATCH (m:Manager)
RETURN m.name

-- Query by multiple labels (intersection)
MATCH (n:Person:Employee)
RETURN n.name

-- Labels enable label-specific indexes
CREATE INDEX employee_id_idx ON :Employee(employee_id)
```

**Label best practices**:
- Use labels for major categories
- Multiple labels for multi-dimensional classification
- Create indexes on labeled node properties
- Labels affect query planning and performance

## Graph Query Language (GQL)

### ISO/IEC 39075:2024 Standard

Geode implements 100% of the GQL standard, providing:
- **Pattern matching**: Declarative graph traversal
- **Read/write operations**: CREATE, MATCH, SET, DELETE
- **Aggregations**: COUNT, SUM, AVG, MIN, MAX
- **Functions**: String, math, date, list, map functions
- **Subqueries**: Nested queries and CALL expressions
- **Path expressions**: Variable-length paths and path functions

```gql
-- Pattern matching (declarative traversal)
MATCH (u:User)-[:FRIEND]->(friend)-[:LIKES]->(p:Product)
WHERE u.name = 'Alice'
RETURN friend.name, p.title

-- Write operations
CREATE (u:User {name: 'Charlie'})
SET u.verified = true
RETURN u

-- Aggregations
MATCH (p:Product)<-[:PURCHASED]-(u:User)
RETURN p.title, COUNT(u) AS purchases
ORDER BY purchases DESC
LIMIT 10

-- Variable-length paths
MATCH path = (a:User)-[:FRIEND*1..3]-(b:User)
WHERE a.name = 'Alice' AND b.name = 'Frank'
RETURN LENGTH(path) AS degrees_of_separation
```

### Pattern Matching

Patterns describe graph structures to match:

```gql
-- Simple pattern: node-relationship-node
MATCH (a:User)-[:FRIEND]->(b:User)
RETURN a.name, b.name

-- Complex pattern with multiple relationships
MATCH (u:User)-[:POSTED]->(p:Post)-[:HAS_TAG]->(t:Tag)
WHERE u.city = 'San Francisco'
  AND t.name IN ['databases', 'graphs']
RETURN u.name, COUNT(DISTINCT p) AS posts

-- Variable-length relationships
MATCH (a:Person)-[:KNOWS*1..4]-(b:Person)
WHERE a.name = 'Alice'
RETURN DISTINCT b.name, LENGTH(path) AS hops

-- Optional patterns
MATCH (u:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
RETURN u.name, COUNT(p) AS post_count
```

### Query Composition

Build complex queries from simple parts:

```gql
-- WITH clause for query pipelining
MATCH (u:User)
WHERE u.last_login >= datetime() - duration('P30D')
WITH u, SIZE((u)-[:FRIEND]->()) AS friend_count
WHERE friend_count > 10
MATCH (u)-[:PURCHASED]->(p:Product)
RETURN u.name, friend_count, COLLECT(p.title) AS purchases

-- Subqueries
MATCH (u:User)
WHERE EXISTS {
    MATCH (u)-[:POSTED]->(p:Post)
    WHERE p.created_at >= datetime() - duration('P7D')
}
RETURN u.name AS active_users

-- UNION for combining results
MATCH (u:User)-[:LIKES]->(content)
RETURN content.title AS liked_content
UNION
MATCH (u:User)-[:SAVED]->(content)
RETURN content.title AS liked_content
```

## ACID Transactions

### Transaction Guarantees

Geode provides full ACID compliance:

- **Atomicity**: All operations succeed or all fail
- **Consistency**: Database moves from valid state to valid state
- **Isolation**: Concurrent transactions don't interfere (MVCC)
- **Durability**: Committed data survives crashes (WAL)

```python
# Python example
async with client.transaction() as tx:
    # Create user
    user = await tx.execute("""
        CREATE (u:User {name: $name, email: $email})
        RETURN id(u) AS user_id
    """, {'name': 'Alice', 'email': 'alice@example.com'})

    user_id = (await user.single())['user_id']

    # Create initial posts
    await tx.execute("""
        MATCH (u:User) WHERE id(u) = $user_id
        CREATE (u)-[:POSTED]->(p:Post {
            title: 'My First Post',
            content: 'Hello, world!'
        })
    """, {'user_id': user_id})

    # Commit atomically (all or nothing)
    await tx.commit()
```

### Isolation Levels

Geode supports multiple isolation levels:

**Snapshot Isolation** (default):
- Each transaction sees a consistent snapshot
- No dirty reads, non-repeatable reads, or phantom reads
- Write conflicts detected at commit time

```gql
-- Transaction 1
BEGIN TRANSACTION ISOLATION LEVEL SNAPSHOT ISOLATION
MATCH (u:User {id: 1})
SET u.balance = u.balance - 100
-- Transaction sees consistent snapshot even if others write
COMMIT
```

**Read Committed**:
- Each statement sees committed data
- Faster than snapshot isolation
- May see changes from concurrent transactions

**Serializable**:
- Strongest isolation
- Equivalent to serial execution
- Highest consistency, lowest concurrency

### Concurrency Control

Geode uses MVCC (Multi-Version Concurrency Control):

```
Key benefits:
- Readers never block writers
- Writers never block readers
- Only write-write conflicts cause blocking
- Historical data available for time-travel queries
```

```gql
-- MVCC enables time-travel queries
MATCH (u:User {id: 1})
AS OF TIMESTAMP '2025-01-01T00:00:00Z'
RETURN u.name, u.email

-- Query all historical versions
MATCH (u:User {id: 1})
FOR ALL VERSIONS
RETURN u.name, version_timestamp(), version_transaction_id()
ORDER BY version_timestamp()
```

## Indexes

### Index Types

**Property Indexes**: Fast lookup by property value

```gql
-- Create single-property index
CREATE INDEX user_email_idx ON :User(email)

-- Use in queries
MATCH (u:User)
WHERE u.email = 'alice@example.com'  -- Uses index
RETURN u

-- Create composite index
CREATE INDEX user_location_idx ON :User(city, state)

-- Use in multi-property queries
MATCH (u:User)
WHERE u.city = 'San Francisco' AND u.state = 'CA'
RETURN u.name
```

**Full-Text Indexes**: BM25-based text search

```gql
-- Create full-text index
CREATE TEXT INDEX doc_content_idx ON :Document(content)

-- Search with relevance ranking
MATCH (d:Document)
WHERE text_search(d.content, 'graph database performance')
RETURN d.title, bm25_score(d.content, 'graph database performance') AS score
ORDER BY score DESC
```

**Vector Indexes**: HNSW for semantic similarity

```gql
-- Create vector index
CREATE VECTOR INDEX doc_embedding_idx ON :Document(embedding)

-- Semantic search
MATCH (d:Document)
WITH d, vector_similarity(d.embedding, $query_vector) AS similarity
WHERE similarity > 0.75
RETURN d.title, similarity
ORDER BY similarity DESC
LIMIT 10
```

### Index Usage

Indexes are automatically used when appropriate:

```gql
-- Check if query uses indexes
EXPLAIN MATCH (u:User)
WHERE u.email = 'alice@example.com'
RETURN u

-- Output shows index usage:
-- Index Scan: user_email_idx (estimated cost: 1.0)
```

Monitor index effectiveness:

```bash
# View index statistics
geode index stats

# Show index usage
geode index analyze --show-usage

# Identify missing indexes
geode index recommendations
```

## Security Fundamentals

### Authentication

Geode supports multiple authentication providers:

```yaml
# Configuration
security:
  authentication:
    enabled: true
    provider: "local"  # or ldap, oauth2, saml
```

```python
# Connect with authentication
client = GeodeClient(
    "localhost:3141",
    username="alice",
    password="secure_password"
)
```

### Authorization

Role-based access control:

```gql
-- Create roles
CREATE ROLE analyst_role
CREATE ROLE admin_role

-- Grant permissions
GRANT MATCH ON DATABASE mydb TO analyst_role
GRANT ALL ON DATABASE mydb TO admin_role

-- Assign roles to users
GRANT ROLE analyst_role TO user_alice
```

### Row-Level Security (RLS)

Fine-grained data-level access control:

```gql
-- Create RLS policy
CREATE POLICY user_data_isolation ON :UserData
USING (node.user_id = current_user_id())
WITH CHECK (node.user_id = current_user_id())

-- Queries automatically enforce policy
MATCH (d:UserData)
RETURN d.content
-- Users only see their own data
```

RLS policies are:
- **Mandatory**: Cannot be bypassed by application code
- **Transparent**: Automatically applied to queries
- **Flexible**: Support complex conditions
- **Performant**: Integrated with query planner

## Data Types

Geode supports rich data types:

```gql
CREATE (:Example {
    -- Numeric types
    int_val: 42,
    float_val: 3.14159,

    -- String types
    string_val: 'text value',
    text_val: 'longer text content...',

    -- Boolean
    bool_val: true,

    -- Temporal types
    date_val: date('2025-01-24'),
    time_val: time('14:30:00'),
    datetime_val: datetime('2025-01-24T14:30:00Z'),
    duration_val: duration('P1Y2M3DT4H5M6S'),

    -- Collection types
    list_val: [1, 2, 3, 4, 5],
    map_val: {key1: 'value1', key2: 42},

    -- Special types
    null_val: NULL,
    vector_val: [0.1, 0.2, 0.3]  -- Vector embeddings
})
```

## Best Practices

### Data Modeling

1. **Model relationships explicitly** as first-class entities
2. **Use labels for categorization**, not properties
3. **Denormalize strategically** for query performance
4. **Index frequently queried properties**
5. **Use specific relationship types** for semantic clarity

### Query Writing

1. **Filter early** to reduce working set
2. **Use parameters** to prevent injection and enable plan caching
3. **Limit traversal depth** on variable-length paths
4. **Use EXPLAIN/PROFILE** to understand query execution
5. **Batch operations** for bulk updates

### Transaction Management

1. **Keep transactions short** to reduce lock contention
2. **Handle deadlocks** with retry logic
3. **Use appropriate isolation levels** for your use case
4. **Avoid long-running transactions** that hold snapshots
5. **Use savepoints** for partial rollback

## Further Reading

- [Graph Modeling](/categories/graph-modeling/) - Data modeling patterns
- [GQL Reference](/tags/gql-reference/) - Complete GQL syntax
- [Transaction Guide](/tags/transactions/) - Transaction management
- [Index Management](/tags/indexing/) - Index strategies
- [Security Guide](/categories/security/) - Authentication and authorization
- [Performance Tuning](/categories/performance/) - Optimization techniques
- [MVCC Deep Dive](/tags/mvcc/) - Concurrency control details
