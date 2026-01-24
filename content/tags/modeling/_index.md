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
from geode_client import GeodeClient

async with GeodeClient('localhost:3141') as client:
    # Define schema with constraints
    await client.query("""
        CREATE CONSTRAINT ON (u:User) ASSERT u.id IS UNIQUE;
        CREATE INDEX FOR (u:User) ON (u.email);
    """)

    # Insert modeled data
    await client.query("""
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
let client = GeodeClient::connect("localhost:3141").await?;

// Define relationships with properties
client.query(r#"
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
result = await client.query("""
    MATCH (u:User)-[:PURCHASED]->(p:Product)
    WHERE p.category = 'Electronics'
    RETURN u.name, COUNT(p) AS purchases
    ORDER BY purchases DESC
    LIMIT 10
""")
elapsed = time.time() - start
print(f"Query took {elapsed:.2f}s, returned {len(result)} rows")
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
