---
title: "Graph Modeling"
description: "Master graph modeling in Geode: design nodes, relationships, and property schemas for efficient, scalable graph databases using GQL standards."
keywords:
  - graph modeling
  - data modeling
  - schema design
  - node types
  - relationship patterns
  - property graphs
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/modeling/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Graph modeling is the foundational practice of designing how data is structured, connected, and queried in a graph database. In Geode, effective graph modeling determines query performance, data integrity, and application scalability.

## What is Graph Modeling?

Graph modeling involves designing the structure of your graph data by defining:

- **Nodes (vertices)**: Entities representing real-world objects (users, products, locations)
- **Relationships (edges)**: Connections between nodes with semantic meaning
- **Properties**: Key-value pairs storing attributes on nodes and relationships
- **Labels**: Categories or types that classify nodes and relationships
- **Constraints**: Rules ensuring data integrity and uniqueness

Unlike relational modeling with normalized tables, graph modeling emphasizes connections as first-class citizens. This paradigm shift enables natural representation of highly connected data with complex relationship patterns.

## Core Modeling Concepts

### Property Graph Model

Geode implements the ISO/IEC 39075:2024 property graph model, where both nodes and relationships can have properties:

```gql
// Node with properties
CREATE (:Person {name: 'Alice', age: 30, email: 'alice@example.com'})

// Relationship with properties
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
CREATE (a)-[:KNOWS {since: 2020, strength: 0.8}]->(b)
```

### Node Design Patterns

**Single vs. Multiple Labels**: Nodes can have multiple labels representing different facets:

```gql
// Single label
CREATE (:User {id: 1, name: 'Alice'})

// Multiple labels (composite type)
CREATE (:User:Admin:Verified {id: 1, name: 'Alice'})
```

**Property Selection**: Choose properties that support your query patterns:

```gql
// Good: properties support common queries
CREATE (:Product {
  sku: 'PROD-123',
  name: 'Laptop',
  category: 'Electronics',
  price: 999.99,
  in_stock: true,
  created_at: datetime('2024-01-15T10:30:00Z')
})

// Avoid: redundant computed properties
// Instead compute on query or use functions
```

### Relationship Design Patterns

**Directional Semantics**: Relationships are directed, conveying meaning through direction:

```gql
// Clear directional semantics
CREATE (user:User)-[:PURCHASED]->(product:Product)
CREATE (user:User)-[:FOLLOWS]->(other:User)
CREATE (product:Product)-[:BELONGS_TO]->(category:Category)
```

**Relationship Properties**: Store metadata about connections:

```gql
// Temporal relationships
CREATE (u:User)-[:VISITED {timestamp: datetime(), duration_ms: 4500}]->(p:Page)

// Weighted relationships
CREATE (u1:User)-[:SIMILAR_TO {score: 0.85, method: 'collaborative'}]->(u2:User)
```

**Avoiding Anti-Patterns**:

```gql
// Anti-pattern: Dense nodes (hub problem)
// Don't create single nodes with millions of relationships
// Instead, use intermediate nodes or time-based partitioning

// Better: Partition by time
CREATE (u:User)-[:PURCHASED]->(o:Order {date: '2024-01'})-[:CONTAINS]->(p:Product)
```

## Schema Design Strategies

### Schema-First vs. Schema-Less

Geode supports both approaches:

**Schema-First** (recommended for production):
```gql
// Define node types with constraints
CREATE CONSTRAINT ON (u:User) ASSERT u.id IS UNIQUE;
CREATE CONSTRAINT ON (u:User) ASSERT u.email IS UNIQUE;
CREATE INDEX FOR (u:User) ON (u.name);
```

**Schema-Less** (flexible for rapid prototyping):
```gql
// Add properties dynamically
CREATE (:DynamicNode {anything: 'goes', schema: 'evolves'})
```

### Normalization vs. Denormalization

**Normalize for Consistency**:
```gql
// Normalized: separate node for address
CREATE (u:User {name: 'Alice'})
CREATE (a:Address {street: '123 Main', city: 'NYC', zip: '10001'})
CREATE (u)-[:LIVES_AT]->(a)
```

**Denormalize for Performance**:
```gql
// Denormalized: embed address in user
CREATE (:User {
  name: 'Alice',
  street: '123 Main',
  city: 'NYC',
  zip: '10001'
})
```

Trade-offs: normalization reduces duplication and maintains consistency; denormalization improves query speed by reducing traversals.

### Temporal Modeling

Model time-varying data with versioned nodes or time-based relationships:

```gql
// Version-based modeling
CREATE (u:User {id: 1, name: 'Alice', version: 1, valid_from: datetime()})

// Event-based modeling
CREATE (u:User)-[:HAS_EVENT]->(e:Event {
  type: 'address_change',
  timestamp: datetime(),
  old_city: 'NYC',
  new_city: 'SF'
})
```

## Modeling for Performance

### Index Strategy

Identify access patterns and create indexes:

```gql
// Frequently filtered properties
CREATE INDEX FOR (p:Product) ON (p.category);
CREATE INDEX FOR (p:Product) ON (p.price);

// Compound indexes for multi-property queries
CREATE INDEX FOR (u:User) ON (u.last_name, u.first_name);
```

### Relationship Cardinality

Design relationships based on expected cardinality:

- **One-to-One**: User → Profile (direct relationship)
- **One-to-Many**: User → Orders (multiple relationships from one node)
- **Many-to-Many**: Users → Groups (relationships in both directions)

High-cardinality relationships may require intermediate nodes:

```gql
// Instead of millions of direct relationships
// User -[:LIKED]-> millions of Posts

// Use intermediate aggregation
User -[:HAS_ACTIVITY]-> Activity -[:INCLUDES]-> Posts
```

## Advanced Modeling Patterns

### Hypergraphs and Meta-Relationships

Model relationships between relationships:

```gql
// Relationship as a node (reification)
CREATE (u1:User)-[:PARTICIPATED]->(r:Relationship {type: 'collaboration'})<-[:PARTICIPATED]-(u2:User)
CREATE (r)-[:RESULTED_IN]->(p:Project)
```

### Multi-Tenancy

Isolate data by tenant:

```gql
// Tenant-scoped nodes
CREATE (:User {tenant_id: 'acme', email: 'user@acme.com'})
CREATE (:User {tenant_id: 'globex', email: 'user@globex.com'})

// Enforce with Row-Level Security
CREATE POLICY tenant_isolation ON User
USING (tenant_id = current_setting('app.tenant_id'))
```

### Hierarchies and Trees

Model hierarchical data:

```gql
// Parent-child relationships
CREATE (root:Category {name: 'Electronics'})
CREATE (sub:Category {name: 'Laptops'})
CREATE (root)-[:HAS_SUBCATEGORY]->(sub)

// Materialized paths for fast traversal
CREATE (:Category {name: 'Laptops', path: '/Electronics/Computers/Laptops'})
```

## Best Practices

1. **Model for Your Queries**: Design based on how data will be accessed, not just how it's structured
2. **Use Meaningful Labels**: Choose descriptive, singular nouns (`:User`, `:Product`, not `:Users` or `:user`)
3. **Relationship Types as Verbs**: Name relationships as actions (`:PURCHASED`, `:FOLLOWS`, `:CONTAINS`)
4. **Constrain Early**: Define uniqueness and existence constraints during design, not as an afterthought
5. **Property Naming**: Use snake_case or camelCase consistently across the schema
6. **Avoid Graph Anti-Patterns**: Dense nodes, properties as relationships, relationship overloading
7. **Version Your Schema**: Track schema changes with migration scripts and version metadata
8. **Test with Production Scale**: Validate model performance with realistic data volumes

## Modeling Tools and Workflow

### Python Client Modeling

```python
from geode_client import Client

client = Client(host="localhost", port=3141)

async with client.connection() as conn:
    # Define schema with constraints
    await conn.query("""
        CREATE CONSTRAINT ON (u:User) ASSERT u.id IS UNIQUE;
        CREATE INDEX FOR (u:User) ON (u.email);
    """)

    # Insert modeled data
    await conn.query("""
        CREATE (u:User {id: $id, email: $email, created_at: datetime()})
    """, {"id": 1, "email": "alice@example.com"})
```

### Go Client Modeling

```go
db, _ := sql.Open("geode", "geode://localhost:3141")

// Schema definition
_, err := db.Exec(`
    CREATE CONSTRAINT ON (p:Product) ASSERT p.sku IS UNIQUE;
    CREATE INDEX FOR (p:Product) ON (p.category);
`)

// Insert with prepared statement
stmt, _ := db.Prepare("CREATE (:Product {sku: $1, name: $2, price: $3})")
stmt.Exec("PROD-123", "Laptop", 999.99)
```

### Rust Client Modeling

```rust
use geode_client::Client;

let client = Client::from_dsn("localhost:3141")?;
let mut conn = client.connect().await?;

// Define relationships with properties
let _ = conn.query(r#"
    CREATE (u:User {id: 1})-[:PLACED {timestamp: datetime()}]->(o:Order {total: 99.99})
"#).await?;
```

## Common Modeling Mistakes

1. **Over-Denormalization**: Embedding everything in single nodes, losing relationship semantics
2. **Under-Indexing**: Not creating indexes on frequently queried properties
3. **Property Soup**: Adding every possible attribute without considering query patterns
4. **Relationship Overloading**: Using single relationship type for multiple semantic meanings
5. **Ignoring Cardinality**: Not accounting for high-cardinality relationships causing dense nodes
6. **No Schema Evolution Plan**: Making schema changes without backward compatibility strategy

## Migration and Evolution

Handle schema changes gracefully:

```gql
// Add new property with default
MATCH (u:User)
SET u.status = COALESCE(u.status, 'active')

// Add new label to existing nodes
MATCH (u:User) WHERE u.is_admin = true
SET u:Admin

// Migrate relationship properties
MATCH (u:User)-[r:KNOWS]->(v:User)
SET r.migrated_at = datetime()
```

## Performance Testing

Validate your model with realistic queries:

```python
# Test query performance
start = time.time()
result, _ = await client.query("""
    MATCH (u:User)-[:PURCHASED]->(p:Product)
    WHERE p.category = 'Electronics'
    RETURN u.name, COUNT(p) AS purchases
    ORDER BY purchases DESC
    LIMIT 10
""")
elapsed = time.time() - start
print(f"Query took {elapsed:.2f}s, returned {len(result.rows)} rows")
```

## Related Topics

- **Graph Algorithms**: Leverage your model with pathfinding, centrality, and community detection
- **Query Optimization**: Optimize GQL queries based on your schema design
- **Indexing**: Create appropriate indexes for your access patterns
- **Transactions**: Ensure data consistency when modifying your graph
- **Security**: Implement Row-Level Security policies based on your data model

## Further Reading

- [GQL Data Types](/tags/types/) - Understand available property types
- [Indexing Strategies](/tags/indexing/) - Optimize query performance
- [Query Performance](/tags/performance/) - Performance tuning techniques
- [GQL Reference](/tags/gql-reference/) - Complete language reference
- [Transaction Management](/tags/transactions/) - Ensure data integrity

Graph modeling is both an art and science. Start with a clear understanding of your domain, iterate based on query patterns, and continuously validate with realistic workloads to achieve optimal performance and maintainability.

## Domain-Driven Graph Modeling

### Social Network Example

Model a social network with rich relationship semantics:

```gql
-- Core entities
CREATE (:User {
  id: INTEGER,
  username: STRING,
  email: STRING,
  bio: TEXT,
  joined_at: TIMESTAMP,
  last_active: TIMESTAMP
})

CREATE (:Post {
  id: INTEGER,
  content: TEXT,
  created_at: TIMESTAMP,
  edited_at: TIMESTAMP,
  visibility: STRING  -- 'public', 'friends', 'private'
})

CREATE (:Comment {
  id: INTEGER,
  content: TEXT,
  created_at: TIMESTAMP
})

-- Relationships with properties
CREATE (u1:User)-[:FOLLOWS {
  since: TIMESTAMP,
  notification_enabled: BOOLEAN
}]->(u2:User)

CREATE (u:User)-[:POSTED {
  posted_at: TIMESTAMP
}]->(p:Post)

CREATE (u:User)-[:LIKED {
  liked_at: TIMESTAMP,
  reaction_type: STRING  -- 'like', 'love', 'laugh', etc.
}]->(p:Post)

CREATE (u:User)-[:COMMENTED {
  commented_at: TIMESTAMP
}]->(c:Comment)-[:ON]->(p:Post)

-- Constraints
CREATE CONSTRAINT ON (u:User) ASSERT u.id IS UNIQUE;
CREATE CONSTRAINT ON (u:User) ASSERT u.email IS UNIQUE;
CREATE CONSTRAINT ON (p:Post) ASSERT p.id IS UNIQUE;

-- Indexes for common queries
CREATE INDEX FOR (u:User) ON (u.username);
CREATE INDEX FOR (p:Post) ON (p.created_at);
CREATE INDEX FOR (u:User) ON (u.last_active);
```

Common query patterns:

```gql
-- User feed: posts from followed users
MATCH (me:User {id: $my_id})-[:FOLLOWS]->(friend:User)
MATCH (friend)-[:POSTED]->(post:Post)
WHERE post.created_at > datetime().minusDays(7)
RETURN post, friend.username
ORDER BY post.created_at DESC
LIMIT 50

-- Friend recommendations: friends of friends
MATCH (me:User {id: $my_id})-[:FOLLOWS]->()-[:FOLLOWS]->(suggestion:User)
WHERE NOT (me)-[:FOLLOWS]->(suggestion)
  AND suggestion.id != $my_id
WITH suggestion, COUNT(*) AS mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10
RETURN suggestion, mutual_friends

-- Trending posts: high engagement recently
MATCH (p:Post)
WHERE p.created_at > datetime().minusHours(24)
WITH p,
     COUNT{(p)<-[:LIKED]-()} AS likes,
     COUNT{(p)<-[:ON]-(c:Comment)} AS comments
WITH p, (likes * 1.0 + comments * 2.0) AS engagement_score
ORDER BY engagement_score DESC
LIMIT 20
RETURN p, engagement_score
```

### E-Commerce Platform

Model products, inventory, and orders:

```gql
-- Product catalog
CREATE (:Product {
  sku: STRING,
  name: STRING,
  description: TEXT,
  price: DECIMAL,
  currency: STRING,
  stock_quantity: INTEGER,
  reorder_point: INTEGER,
  discontinued: BOOLEAN
})

CREATE (:Category {
  id: INTEGER,
  name: STRING,
  slug: STRING,
  parent_id: INTEGER  -- Self-referential hierarchy
})

CREATE (:Brand {
  id: INTEGER,
  name: STRING,
  logo_url: STRING
})

-- Relationships
CREATE (p:Product)-[:IN_CATEGORY]->(c:Category)
CREATE (p:Product)-[:MADE_BY]->(b:Brand)
CREATE (p1:Product)-[:SIMILAR_TO {
  similarity_score: FLOAT,
  algorithm: STRING
}]->(p2:Product)

-- Orders and customers
CREATE (:Customer {
  id: INTEGER,
  email: STRING,
  name: STRING,
  lifetime_value: DECIMAL
})

CREATE (:Order {
  id: INTEGER,
  order_number: STRING,
  status: STRING,  -- 'pending', 'confirmed', 'shipped', 'delivered'
  total: DECIMAL,
  created_at: TIMESTAMP,
  shipped_at: TIMESTAMP,
  delivered_at: TIMESTAMP
})

CREATE (:OrderItem {
  quantity: INTEGER,
  unit_price: DECIMAL,
  discount: DECIMAL
})

-- Order relationships
CREATE (c:Customer)-[:PLACED]->(o:Order)
CREATE (o:Order)-[:CONTAINS]->(item:OrderItem)-[:OF_PRODUCT]->(p:Product)

-- Indexes for e-commerce queries
CREATE INDEX FOR (p:Product) ON (p.sku);
CREATE INDEX FOR (p:Product) ON (p.price);
CREATE INDEX FOR (p:Product) ON (p.stock_quantity);
CREATE INDEX FOR (o:Order) ON (o.status);
CREATE INDEX FOR (o:Order) ON (o.created_at);
```

E-commerce query patterns:

```gql
-- Product search with filters
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
WHERE p.price BETWEEN $min_price AND $max_price
  AND c.slug = $category
  AND p.stock_quantity > 0
  AND p.discontinued = false
RETURN p
ORDER BY p.popularity_score DESC
LIMIT 24

-- Shopping cart recommendations
MATCH (cart_product:Product {id IN $cart_product_ids})
MATCH (cart_product)-[:SIMILAR_TO]->(rec:Product)
WHERE NOT rec.id IN $cart_product_ids
  AND rec.stock_quantity > 0
WITH rec, AVG(similarity_score) AS avg_similarity
ORDER BY avg_similarity DESC
LIMIT 10
RETURN rec

-- Inventory reordering
MATCH (p:Product)
WHERE p.stock_quantity <= p.reorder_point
  AND p.discontinued = false
WITH p, p.reorder_point + 100 AS reorder_quantity
RETURN p.sku, p.name, p.stock_quantity, reorder_quantity
ORDER BY p.stock_quantity ASC
```

## Advanced Modeling Patterns

### Graph Versioning

Track changes over time:

```gql
-- Version-aware entities
CREATE (:Document {
  id: INTEGER,
  version: INTEGER,
  content: TEXT,
  valid_from: TIMESTAMP,
  valid_to: TIMESTAMP,
  is_current: BOOLEAN
})

-- Version chain
CREATE (doc_v1:Document {id: 1, version: 1, valid_from: '2024-01-01T00:00:00Z'})
CREATE (doc_v2:Document {id: 1, version: 2, valid_from: '2024-01-15T10:30:00Z'})
CREATE (doc_v1)-[:NEXT_VERSION]->(doc_v2)

-- Query specific version
MATCH (d:Document {id: $doc_id})
WHERE d.valid_from <= $timestamp
  AND (d.valid_to IS NULL OR d.valid_to > $timestamp)
RETURN d

-- Query current version
MATCH (d:Document {id: $doc_id, is_current: true})
RETURN d
```

### Bipartite Graphs

Model two distinct node types with relationships:

```gql
-- Users and movies (recommendation system)
CREATE (:User {id: INTEGER, name: STRING})
CREATE (:Movie {id: INTEGER, title: STRING, genre: STRING})

CREATE (u:User)-[:RATED {
  rating: FLOAT,  -- 1.0 to 5.0
  timestamp: TIMESTAMP
}]->(m:Movie)

-- Collaborative filtering query
MATCH (me:User {id: $my_id})-[r1:RATED]->(m:Movie)<-[r2:RATED]-(similar:User)
WHERE ABS(r1.rating - r2.rating) < 1.0  -- Similar ratings
WITH similar, COUNT(m) AS common_movies
ORDER BY common_movies DESC
LIMIT 10

MATCH (similar)-[r:RATED]->(rec:Movie)
WHERE NOT (me)-[:RATED]->(rec)
  AND r.rating >= 4.0
RETURN rec.title, AVG(r.rating) AS avg_rating
ORDER BY avg_rating DESC
LIMIT 20
```

### Knowledge Graphs

Model entities and semantic relationships:

```gql
-- Entities with types
CREATE (:Entity {
  id: STRING,
  name: STRING,
  type: STRING,  -- 'person', 'organization', 'location', 'event'
  description: TEXT
})

-- Semantic relationships
CREATE (e1:Entity)-[:WORKED_AT {
  from_date: DATE,
  to_date: DATE,
  role: STRING
}]->(e2:Entity)

CREATE (e1:Entity)-[:LOCATED_IN]->(e2:Entity)
CREATE (e1:Entity)-[:FOUNDED {founding_date: DATE}]->(e2:Entity)

-- Knowledge graph queries
MATCH path = (person:Entity {type: 'person', name: 'Alice'})
             -[:WORKED_AT*1..2]->
             (company:Entity {type: 'organization'})
RETURN path

-- Find connections between entities
MATCH path = shortestPath(
  (e1:Entity {name: 'Alice'})-[*..5]-(e2:Entity {name: 'Bob'})
)
RETURN path, LENGTH(path) AS degree_of_separation
```

### Geospatial Modeling

Model location-based data:

```gql
-- Locations with coordinates
CREATE (:Place {
  id: INTEGER,
  name: STRING,
  latitude: FLOAT,
  longitude: FLOAT,
  category: STRING  -- 'restaurant', 'hotel', 'attraction'
})

-- Spatial index (for distance queries)
CREATE SPATIAL INDEX FOR (p:Place) ON (p.latitude, p.longitude);

-- Distance-based queries
MATCH (p:Place)
WHERE distance(
  point({latitude: p.latitude, longitude: p.longitude}),
  point({latitude: $my_lat, longitude: $my_lon})
) < $radius_meters
  AND p.category = 'restaurant'
RETURN p, distance(...) AS distance_m
ORDER BY distance_m
LIMIT 10
```

## Performance Modeling

### Hotspot Avoidance

Prevent dense nodes (supernodes):

```gql
-- BAD: Single popular user with millions of followers
(:User {id: 'celebrity'})<-[:FOLLOWS]-(:User) [x1,000,000]

-- GOOD: Partition followers by time
(:User {id: 'celebrity'})
  <-[:MANAGED_BY]-(:FollowerList {period: '2024-01'})
    <-[:IN_LIST]-(:User) [x100,000]

(:User {id: 'celebrity'})
  <-[:MANAGED_BY]-(:FollowerList {period: '2024-02'})
    <-[:IN_LIST]-(:User) [x100,000]

-- Query pattern
MATCH (celebrity:User {id: $celebrity_id})
      <-[:MANAGED_BY]-(list:FollowerList)
      <-[:IN_LIST]-(follower:User)
WHERE list.period >= $start_period
RETURN follower
```

### Materialized Aggregations

Pre-compute expensive aggregations:

```gql
-- Expensive query (computed on-demand)
MATCH (u:User {id: $user_id})-[:POSTED]->(p:Post)
RETURN u, COUNT(p) AS post_count

-- Better: Maintain denormalized count
CREATE (:User {
  id: INTEGER,
  post_count: INTEGER  -- Updated by trigger
})

-- Trigger keeps count in sync
CREATE TRIGGER maintain_post_count
AFTER INSERT OR DELETE ON [:POSTED]
FOR EACH RELATIONSHIP
EXECUTE GQL
  MATCH (u:User)
  WHERE id(u) = id(startNode(COALESCE(NEW, OLD)))
  SET u.post_count = u.post_count + CASE WHEN INSERTING THEN 1 ELSE -1 END

-- Fast query
MATCH (u:User {id: $user_id})
RETURN u.post_count
```

### Index Coverage

Design indexes to cover query patterns:

```gql
-- Compound index for multi-property queries
CREATE INDEX FOR (p:Product) ON (p.category, p.price, p.stock_quantity);

-- This index covers:
MATCH (p:Product)
WHERE p.category = 'electronics'
  AND p.price < 1000
  AND p.stock_quantity > 0
RETURN p
-- Index-only scan, no table lookup needed
```

## Schema Evolution

### Adding Properties

Add properties with default values:

```gql
-- Add new property to existing nodes
MATCH (u:User)
WHERE NOT EXISTS(u.email_verified)
SET u.email_verified = false

-- Or use COALESCE in queries
MATCH (u:User)
RETURN u.name, COALESCE(u.email_verified, false) AS verified
```

### Migrating Relationships

Change relationship structure:

```gql
-- Old model: direct relationship
(u:User)-[:FRIEND]->(f:User)

-- New model: relationship as node (to add properties)
(u:User)-[:FRIENDSHIP_REQUEST]->(fr:FriendRequest {
  status: 'accepted',
  requested_at: TIMESTAMP,
  accepted_at: TIMESTAMP
})<-[:FRIENDSHIP_REQUEST]-(f:User)

-- Migration query
MATCH (u1:User)-[old:FRIEND]->(u2:User)
CREATE (u1)-[:FRIENDSHIP_REQUEST]->(fr:FriendRequest {
  status: 'accepted',
  requested_at: old.since,
  accepted_at: old.since
})<-[:FRIENDSHIP_REQUEST]-(u2)
DELETE old
```

### Schema Versioning

Track schema changes:

```gql
-- Schema metadata
CREATE (:SchemaVersion {
  version: INTEGER,
  applied_at: TIMESTAMP,
  description: TEXT
})

-- Migration scripts
-- v1_to_v2.gql
CREATE CONSTRAINT ON (u:User) ASSERT u.email IS UNIQUE;
ALTER LABEL User ADD PROPERTY email_verified BOOLEAN DEFAULT false;
INSERT (:SchemaVersion {version: 2, applied_at: datetime(), description: 'Add email verification'})
```

## Further Reading

- [GQL Data Types](/tags/types/) - Understand available property types
- [Indexing Strategies](/tags/indexing/) - Optimize query performance
- [Query Performance](/tags/performance/) - Performance tuning techniques
- [GQL Reference](/tags/gql-reference/) - Complete language reference
- [Transaction Management](/tags/transactions/) - Ensure data integrity
- [Graph Algorithms for Data Science](https://www.oreilly.com/library/view/graph-algorithms/9781492047674/)
- [NoSQL Distilled](https://martinfowler.com/books/nosql.html) - Data modeling patterns
- [Graph Databases](https://www.oreilly.com/library/view/graph-databases-2nd/9781491930892/) - O'Reilly guide

Graph modeling is both an art and science. Start with a clear understanding of your domain, iterate based on query patterns, and continuously validate with realistic workloads to achieve optimal performance and maintainability.
