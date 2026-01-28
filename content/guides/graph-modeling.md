---
title: "Graph Modeling Guide"
description: "Best practices for designing effective graph schemas in Geode"
weight: 10
tags: ["schema", "modeling", "design", "best-practices"]
categories: ["guides", "design"]
keywords:
  - graph modeling
  - property graph
  - schema design
  - Geode
  - graph database design
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Graph Modeling Guide

Designing an effective graph schema is crucial for query performance and application maintainability. This guide covers best practices, common patterns, and anti-patterns for modeling data in Geode.

## Graph Thinking

### Shift from Tables to Graphs

**Relational Thinking**:
```sql
-- Tables with foreign keys
Users (id, name, email)
Posts (id, user_id, content)
Likes (user_id, post_id, timestamp)
```

**Graph Thinking**:
```gql
// Entities as nodes, connections as relationships
(:User {id, name, email})
(:Post {id, content})

(User)-[:POSTED]->(Post)
(User)-[:LIKES {timestamp}]->(Post)
```

**Key Differences**:
- **Relationships are first-class**: Not just foreign keys
- **Traversal is natural**: Follow relationships directly
- **Flexible schema**: Add new relationships easily

## Core Principles

### 1. Nodes for Entities

**Rule**: Use nodes for entities you'll query independently.

**Good**:
```gql
(:Person {name, age, email})
(:Company {name, industry})
(:Product {name, price})
```

**Bad**:
```gql
// Don't use nodes for simple values
(:Email {address})  // Just use property
(:Age {value})      // Just use property
```

### 2. Relationships for Connections

**Rule**: Use relationships to connect entities with meaningful semantics.

**Good**:
```gql
(:Person)-[:WORKS_AT {since, role}]->(:Company)
(:Person)-[:KNOWS {since, context}]->(:Person)
(:Person)-[:PURCHASED {date, price}]->(:Product)
```

**Bad**:
```gql
// Don't use properties for relationships
(:Person {company_id})  // Use relationship instead

// Don't use generic relationships
(:Person)-[:RELATED_TO]->(:Company)  // Be specific
```

### 3. Properties for Attributes

**Rule**: Use properties for intrinsic attributes of entities.

**Good**:
```gql
(:Person {
  name: "Alice",
  age: 30,
  email: "alice@example.com",
  created_at: timestamp()
})
```

**Bad**:
```gql
// Don't create nodes for attributes
(:Person)-[:HAS_NAME]->(:Name {value: "Alice"})

// Don't duplicate data unnecessarily
(:Person {
  name: "Alice",
  uppercase_name: "ALICE",  // Compute on demand
  name_length: 5             // Compute on demand
})
```

## Common Patterns

### Pattern 1: Hierarchies

**Use Case**: Organizational structures, categories, taxonomies

**Implementation**:
```gql
// Tree structure
(:Category {name: "Electronics"})
  -[:PARENT]->(:Category {name: "Computers"})
    -[:PARENT]->(:Category {name: "Laptops"})
    -[:PARENT]->(:Category {name: "Desktops"})

// Query: Find all descendants
MATCH (root:Category {name: "Electronics"})-[:PARENT*]->(child)
RETURN child.name

// Query: Find path to root
MATCH path = (leaf:Category {name: "Laptops"})-[:PARENT*]->(root)
WHERE NOT (root)-[:PARENT]->()
RETURN path
```

**Best Practices**:
- Consider max depth when querying (`[:PARENT*1..5]`)
- Add level property for quick filtering
- Cache common paths if frequently accessed

### Pattern 2: Timeline/Activity

**Use Case**: Events, posts, messages, logs

**Implementation**:
```gql
// Timeline with linked list
(:Post {content, created_at})-[:NEXT]->(:Post)

// Or time-based relationships
(:User)-[:POSTED {timestamp}]->(:Post)

// Query: Recent activity
MATCH (u:User)-[p:POSTED]->(post:Post)
WHERE p.timestamp > timestamp() - duration('P7D')
RETURN post
ORDER BY p.timestamp DESC
LIMIT 20
```

**Best Practices**:
- Index timestamp properties
- Consider time-bucketing for very active users
- Use LIMIT to control result size

### Pattern 3: Recommendations

**Use Case**: Friend suggestions, product recommendations

**Implementation**:
```gql
// Collaborative filtering
MATCH (me:User)-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(other)
MATCH (other)-[:PURCHASED]->(recommendation)
WHERE NOT (me)-[:PURCHASED]->(recommendation)
RETURN recommendation, count(other) AS score
ORDER BY score DESC
LIMIT 10

// Content-based
MATCH (me:User)-[:LIKES]->(item)
WITH me, collect(item.category) AS my_categories
MATCH (recommendation)
WHERE recommendation.category IN my_categories
  AND NOT (me)-[:LIKES]->(recommendation)
RETURN recommendation
```

**Best Practices**:
- Limit traversal depth
- Use aggregations for scoring
- Consider pre-computing for popular items

### Pattern 4: Access Control

**Use Case**: Permissions, privacy, authorization

**Implementation**:
```gql
// Role-based access
(:User)-[:HAS_ROLE]->(:Role {name: "admin"})
(:Role)-[:CAN_ACCESS]->(:Resource)

// Permission check
MATCH (user:User {id: $user_id})-[:HAS_ROLE]->(:Role)
      -[:CAN_ACCESS]->(resource:Resource {id: $resource_id})
RETURN count(resource) > 0 AS has_access

// Ownership
(:User)-[:OWNS]->(:Document)

// Sharing
(:User)-[:CAN_VIEW]->(:Document)
(:User)-[:CAN_EDIT]->(:Document)
```

**Best Practices**:
- Cache permission checks
- Use groups/roles instead of individual permissions
- Consider separate authorization service for complex cases

### Pattern 5: Versioning

**Use Case**: Document history, audit trails

**Implementation**:
```gql
// Version chain
(:Document {current_version: 3})
  -[:HAS_VERSION]->(:Version {number: 3, content, timestamp})
    -[:PREVIOUS]->(:Version {number: 2})
      -[:PREVIOUS]->(:Version {number: 1})

// Query: Get history
MATCH (doc:Document {id: $id})-[:HAS_VERSION]->(v:Version)
MATCH path = (v)-[:PREVIOUS*0..]->(older)
RETURN older
ORDER BY older.number DESC

// Query: Diff versions
MATCH (doc:Document {id: $id})-[:HAS_VERSION]->(current)
MATCH (current)-[:PREVIOUS*3]->(old)
RETURN current.content, old.content
```

**Best Practices**:
- Limit history depth or archive old versions
- Consider external storage for large content
- Add version metadata (author, timestamp, message)

## Schema Design Process

### Step 1: Identify Entities

List the main entities in your domain:

```
E-commerce example:
- Users (customers, sellers)
- Products
- Categories
- Orders
- Reviews
- Addresses
```

### Step 2: Model Relationships

Determine how entities connect:

```gql
(:User)-[:SELLS]->(:Product)
(:User)-[:PURCHASED]->(:Product)
(:User)-[:REVIEWED]->(:Product)
(:Product)-[:IN_CATEGORY]->(:Category)
(:Order)-[:CONTAINS]->(:Product)
(:User)-[:PLACED]->(:Order)
(:User)-[:HAS_ADDRESS]->(:Address)
```

### Step 3: Add Properties

Determine what data belongs on each entity:

```gql
(:User {
  id: INTEGER,
  email: STRING,
  name: STRING,
  created_at: TIMESTAMP
})

(:Product {
  id: INTEGER,
  name: STRING,
  price: FLOAT,
  description: STRING,
  stock: INTEGER
})

(:Order {
  id: INTEGER,
  total: FLOAT,
  status: STRING,
  created_at: TIMESTAMP
})
```

### Step 4: Add Relationship Properties

Capture context about connections:

```gql
(:User)-[:REVIEWED {
  rating: INTEGER,
  comment: STRING,
  timestamp: TIMESTAMP
}]->(:Product)

(:User)-[:PURCHASED {
  quantity: INTEGER,
  price: FLOAT,
  timestamp: TIMESTAMP
}]->(:Product)
```

### Step 5: Plan for Queries

Design schema to support your queries efficiently:

```gql
// Query: Products in category
// Ensure relationship direction supports this
MATCH (cat:Category)<-[:IN_CATEGORY]-(product:Product)
RETURN product

// Query: User's purchase history
// Add timestamp for ordering
MATCH (user:User)-[p:PURCHASED]->(product:Product)
RETURN product
ORDER BY p.timestamp DESC
```

## Advanced Patterns

### Hypernodes

**Problem**: Some nodes have millions of relationships (celebrity accounts, popular products)

**Solution**: Introduce intermediate nodes

**Bad**:
```gql
// Popular product with 10M likes
(:Product {id: 1})<-[:LIKES]-(:User) // x10,000,000
```

**Good**:
```gql
// Bucket by time
(:Product)-[:LIKES_2024_01]->(:LikeBucket)
(:LikeBucket)<-[:LIKES]->(:User) // x1,000

// Query with bucket
MATCH (product:Product {id: 1})-[:LIKES_2024*]->(bucket)
MATCH (bucket)<-[:LIKES]-(user)
RETURN count(user)
```

### Denormalization

**When**: Read performance critical, data rarely changes

**Example**:
```gql
// Normalized
(:User)-[:LIVES_IN]->(:City)-[:IN_STATE]->(:State)-[:IN_COUNTRY]->(:Country)

// Denormalized for fast queries
(:User {
  city: "San Francisco",
  state: "California",
  country: "USA"
})

// Trade-off: Faster queries, but updates affect multiple nodes
```

### Materialized Paths

**When**: Frequent queries on hierarchies

**Example**:
```gql
// Store full path
(:Category {
  name: "Laptops",
  path: ["Electronics", "Computers", "Laptops"],
  level: 3
})

// Fast queries
MATCH (cat:Category)
WHERE "Electronics" IN cat.path
RETURN cat

// Fast level queries
MATCH (cat:Category {level: 2})
RETURN cat
```

### Event Sourcing

**When**: Need complete audit trail

**Example**:
```gql
// Events as nodes
(:User)-[:TRIGGERED]->(:Event {
  type: "user.created",
  timestamp: timestamp(),
  data: {...}
})

(:User)-[:TRIGGERED]->(:Event {
  type: "user.updated",
  timestamp: timestamp(),
  data: {...}
})

// Rebuild state from events
MATCH (user:User)-[:TRIGGERED]->(event:Event)
WHERE event.type STARTS WITH "user."
RETURN event
ORDER BY event.timestamp
```

## Anti-Patterns

### 1. Deep Nesting

**Bad**:
```gql
// Too many levels
(:Person)-[:KNOWS]->(:Person)-[:KNOWS]->(:Person)-[:KNOWS*10]->(:Person)
```

**Solution**: Limit depth or add shortcuts
```gql
// Add direct connections for common paths
(:Person)-[:KNOWS_INDIRECTLY {hops: 3}]->(:Person)
```

### 2. Property Explosions

**Bad**:
```gql
(:User {
  friend_1_id: 123,
  friend_2_id: 456,
  friend_3_id: 789,
  // ...
  friend_1000_id: 999
})
```

**Solution**: Use relationships
```gql
(:User)-[:FRIENDS_WITH]->(:User)
```

### 3. Generic Relationships

**Bad**:
```gql
(:Person)-[:RELATED_TO]->(:Company)
(:Person)-[:RELATED_TO]->(:Product)
```

**Solution**: Specific relationship types
```gql
(:Person)-[:WORKS_AT]->(:Company)
(:Person)-[:PURCHASED]->(:Product)
```

### 4. Nodes for Properties

**Bad**:
```gql
(:Person)-[:HAS_EMAIL]->(:Email {address: "alice@example.com"})
(:Person)-[:HAS_PHONE]->(:Phone {number: "555-0123"})
```

**Solution**: Use properties
```gql
(:Person {
  email: "alice@example.com",
  phone: "555-0123"
})
```

### 5. Bi-directional Duplication

**Bad**:
```gql
// Creating both directions unnecessarily
(:Person)-[:KNOWS]->(:Person)
(:Person)<-[:KNOWN_BY]-(:Person)
```

**Solution**: Use one direction, query both ways
```gql
// Create one direction
(:Person)-[:KNOWS]->(:Person)

// Query either direction
MATCH (p1:Person)-[:KNOWS]-(p2:Person)
RETURN p2
```

## Migration Strategy

### From Relational

```sql
-- SQL Schema
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR,
  email VARCHAR
);

CREATE TABLE friendships (
  user_id INT REFERENCES users(id),
  friend_id INT REFERENCES users(id),
  since DATE
);
```

**To Graph**:
```gql
// Import users
LOAD CSV WITH HEADERS FROM 'file:///users.csv' AS row
CREATE (:User {
  id: toInteger(row.id),
  name: row.name,
  email: row.email
})

// Import friendships
LOAD CSV WITH HEADERS FROM 'file:///friendships.csv' AS row
MATCH (u1:User {id: toInteger(row.user_id)})
MATCH (u2:User {id: toInteger(row.friend_id)})
CREATE (u1)-[:KNOWS {since: date(row.since)}]->(u2)
```

### Incremental Migration

```python
# Dual-write to both systems during migration
async def create_user(data):
    # Write to PostgreSQL
    await pg_conn.execute(
        "INSERT INTO users (name, email) VALUES ($1, $2)",
        data['name'], data['email']
    )

    # Write to Geode
    await geode_client.query(
        "CREATE (:User {name: $name, email: $email})",
        params=data
    )
```

## Testing Your Schema

### Unit Tests

```python
import pytest

@pytest.mark.asyncio
async def test_user_creation():
    await client.query(
        "CREATE (:User {id: 1, name: 'Test'})"
    )

    result, _ = await client.query(
        "MATCH (u:User {id: 1}) RETURN u.name"
    )
    user = result.rows[0] if result.rows else None
    assert user['u.name'] == 'Test'

@pytest.mark.asyncio
async def test_friendship():
    # Create users
    await client.query(
        "CREATE (:User {id: 1, name: 'Alice'})"
    )
    await client.query(
        "CREATE (:User {id: 2, name: 'Bob'})"
    )

    # Create friendship
    await client.query("""
        MATCH (a:User {id: 1})
        MATCH (b:User {id: 2})
        CREATE (a)-[:KNOWS]->(b)
    """)

    # Verify
    result, _ = await client.query("""
        MATCH (a:User {id: 1})-[:KNOWS]->(b)
        RETURN b.name
    """)
    friend = result.rows[0] if result.rows else None
    assert friend['b.name'] == 'Bob'
```

## Documentation

Document your schema:

```markdown
# Schema Documentation

## Nodes

### User
Represents a user account.

Properties:
- `id` (INTEGER): Unique identifier
- `username` (STRING): Unique username
- `email` (STRING): Email address
- `created_at` (TIMESTAMP): Account creation time

Relationships:
- `[:KNOWS]->(:User)`: Friend connections
- `[:POSTED]->(:Post)`: Created posts
- `[:LIKES]->(:Post)`: Liked posts

Constraints:
- `user_id_unique`: Unique user ID
- `user_username_unique`: Unique username

Indexes:
- `user_username`: B-tree on username
- `user_email`: B-tree on email
```

## Conclusion

Good graph modeling:
- Makes queries natural and efficient
- Evolves with requirements
- Balances normalization and performance
- Documents design decisions

Start simple, iterate based on usage patterns, and always profile your queries.

## Resources

- [GQL Reference](/docs/gql-reference/)
- [Performance Guide](/docs/performance/)
- [Migration Guide](/docs/guides/migration-guide/)
- [Example Schemas](https://gitlab.com/devnw/codepros/geode/examples)

---

**Questions?** Discuss schema design in our [forum](https://forum.geodedb.com).
