---
title: "Schema Design"
description: "Design flexible and efficient schemas for Geode graph databases. Learn about label hierarchies, property constraints, index strategies, and schema evolution patterns."
keywords:
  - schema design
  - graph schema
  - constraints
  - indexes
  - data validation
  - schema evolution
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/schema/"
    noindex: false
---

Schema design in Geode defines the structure, constraints, and indexes that govern your graph data. While Geode supports schema-optional modeling, explicit schema definitions improve data quality, query performance, and application reliability.

## Schema-Optional vs. Schema-Required

### Flexible Schema

Geode allows schema-free development for rapid prototyping:

```gql
// No predefined schema required
INSERT (u:User {
  user_id: 'user_123',
  name: 'Alice',
  email: 'alice@example.com',
  age: 30
});

// Add new properties dynamically
MATCH (u:User {user_id: 'user_123'})
SET u.verified = true,
    u.premium_tier = 'gold';
```

### Explicit Schema Constraints

Define constraints for data integrity:

```gql
// Unique constraint on user_id
CREATE CONSTRAINT unique_user_id
ON (u:User)
ASSERT u.user_id IS UNIQUE;

// Property existence constraint
CREATE CONSTRAINT user_must_have_email
ON (u:User)
ASSERT EXISTS(u.email);

// Type constraint
CREATE CONSTRAINT user_age_is_integer
ON (u:User)
ASSERT u.age IS :: INTEGER;

// Range constraint
CREATE CONSTRAINT user_age_valid
ON (u:User)
ASSERT u.age >= 0 AND u.age <= 150;
```

## Label Design

### Single vs. Multiple Labels

Nodes can have one or more labels for classification:

```gql
// Single label
INSERT (p:Product {product_id: 'prod_123', name: 'Laptop'});

// Multiple labels for role-based classification
INSERT (u:User:Premium:Admin {
  user_id: 'admin_123',
  name: 'Bob',
  tier: 'premium',
  permissions: ['read', 'write', 'admin']
});

// Query by label combination
MATCH (admin:User:Admin)
RETURN admin.name;

MATCH (premium:Premium)
WHERE premium:User  // Check for specific label
RETURN premium.name, premium.tier;
```

### Label Hierarchies

Model inheritance with multiple labels:

```gql
// Person is base label, Employee and Customer are specializations
INSERT (e:Person:Employee {
  person_id: 'emp_123',
  name: 'Alice',
  employee_id: 'emp_001',
  department: 'Engineering'
});

INSERT (c:Person:Customer {
  person_id: 'cust_456',
  name: 'Charlie',
  customer_id: 'cust_789',
  loyalty_points: 1500
});

// Query all persons
MATCH (p:Person)
RETURN p.name, labels(p);

// Query only employees
MATCH (e:Employee)
RETURN e.name, e.department;
```

## Property Schemas

### Property Types

Define expected types for properties:

```gql
// String properties
CREATE CONSTRAINT name_is_string
ON (u:User)
ASSERT u.name IS :: STRING;

// Numeric properties
CREATE CONSTRAINT price_is_decimal
ON (p:Product)
ASSERT p.price IS :: DECIMAL;

// Boolean properties
CREATE CONSTRAINT verified_is_boolean
ON (u:User)
ASSERT u.verified IS :: BOOLEAN;

// Datetime properties
CREATE CONSTRAINT created_is_datetime
ON (n:Node)
ASSERT n.created_at IS :: DATETIME;

// Array properties
CREATE CONSTRAINT tags_is_array
ON (p:Product)
ASSERT p.tags IS :: ARRAY;
```

### Required Properties

Enforce presence of critical properties:

```gql
// User must have user_id and email
CREATE CONSTRAINT user_required_props
ON (u:User)
ASSERT EXISTS(u.user_id)
  AND EXISTS(u.email)
  AND u.user_id IS NOT NULL
  AND u.email IS NOT NULL;

// Product must have product_id, name, and price
CREATE CONSTRAINT product_required_props
ON (p:Product)
ASSERT EXISTS(p.product_id)
  AND EXISTS(p.name)
  AND EXISTS(p.price);
```

### Property Value Constraints

Validate property values:

```gql
// Email format validation (regex)
CREATE CONSTRAINT valid_email
ON (u:User)
ASSERT u.email =~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';

// Price must be positive
CREATE CONSTRAINT positive_price
ON (p:Product)
ASSERT p.price > 0;

// Status must be from allowed set
CREATE CONSTRAINT valid_status
ON (o:Order)
ASSERT o.status IN ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

// Rating must be between 1 and 5
CREATE CONSTRAINT valid_rating
ON (r:Review)
ASSERT r.rating >= 1 AND r.rating <= 5;
```

## Index Strategies

### B-Tree Indexes

Create indexes for fast property lookups:

```gql
// Single-property index
CREATE INDEX user_email_idx ON :User(email);
CREATE INDEX product_category_idx ON :Product(category);
CREATE INDEX order_date_idx ON :Order(order_date);

// Composite index for combined lookups
CREATE INDEX product_category_price_idx ON :Product(category, price);
CREATE INDEX user_country_city_idx ON :User(country, city);

// Query uses index
MATCH (u:User)
WHERE u.email = 'alice@example.com'
RETURN u;

// Composite index for range queries
MATCH (p:Product)
WHERE p.category = 'Electronics'
  AND p.price BETWEEN 100 AND 500
RETURN p.name, p.price;
```

### Full-Text Indexes

Enable text search on string properties:

```gql
// Full-text index on product names and descriptions
CREATE FULLTEXT INDEX product_text_idx
ON :Product(name, description)
WITH (analyzer = 'english', stopwords = ['the', 'a', 'an']);

// Full-text search query
MATCH (p:Product)
WHERE FULLTEXT(p, 'wireless headphones bluetooth')
RETURN p.name, p.description
ORDER BY SCORE(p) DESC
LIMIT 10;
```

### Vector Indexes

Index embeddings for similarity search:

```gql
// HNSW vector index for product embeddings
CREATE VECTOR INDEX product_embedding_idx
ON :Product(embedding)
USING HNSW
WITH (
  dimensions = 384,
  metric = 'cosine',
  m = 16,
  ef_construction = 200
);

// Similarity search
MATCH (p:Product)
WHERE p.embedding IS NOT NULL
WITH p, vector.similarity(p.embedding, $query_embedding, 'cosine') AS score
WHERE score > 0.7
ORDER BY score DESC
LIMIT 10
RETURN p.product_id, p.name, score;
```

## Relationship Schemas

### Relationship Type Constraints

Define valid relationship types between labels:

```gql
// User can PURCHASE Product
CREATE CONSTRAINT purchase_relationship
ON ()-[r:PURCHASED]->()
ASSERT startNode(r):User AND endNode(r):Product;

// Employee WORKS_FOR Organization
CREATE CONSTRAINT works_for_relationship
ON ()-[r:WORKS_FOR]->()
ASSERT startNode(r):Employee AND endNode(r):Organization;

// Product IN_CATEGORY Category
CREATE CONSTRAINT category_relationship
ON ()-[r:IN_CATEGORY]->()
ASSERT startNode(r):Product AND endNode(r):Category;
```

### Relationship Property Constraints

Validate relationship properties:

```gql
// Purchase must have timestamp and amount
CREATE CONSTRAINT purchase_required_props
ON ()-[r:PURCHASED]->()
ASSERT EXISTS(r.timestamp)
  AND EXISTS(r.amount)
  AND r.amount > 0;

// Rating must have score between 1 and 5
CREATE CONSTRAINT rating_score_range
ON ()-[r:RATED]->()
ASSERT EXISTS(r.score)
  AND r.score >= 1
  AND r.score <= 5;

// Friendship must have bidirectional constraint
CREATE CONSTRAINT mutual_friendship
ON ()-[r:FRIENDS_WITH]->()
ASSERT EXISTS(reverse(r));
```

## Schema Patterns

### Enforcing Cardinality

Limit relationship counts:

```gql
// User can have at most one ShoppingCart
CREATE CONSTRAINT one_cart_per_user
ON (u:User)
ASSERT COUNT((u)-[:HAS_CART]->(:ShoppingCart)) <= 1;

// Product must be in exactly one Category
CREATE CONSTRAINT product_single_category
ON (p:Product)
ASSERT COUNT((p)-[:IN_CATEGORY]->(:Category)) = 1;

// User must have at least one Email
CREATE CONSTRAINT user_has_email
ON (u:User)
ASSERT COUNT((u)-[:HAS_EMAIL]->(:Email)) >= 1;
```

### Temporal Validity

Ensure valid time ranges:

```gql
// Employment period must be valid
CREATE CONSTRAINT valid_employment_period
ON ()-[e:EMPLOYED_BY]->()
ASSERT e.start_date IS NOT NULL
  AND (e.end_date IS NULL OR e.end_date >= e.start_date);

// Subscription must not overlap
CREATE CONSTRAINT no_overlapping_subscriptions
ON (u:User)
ASSERT NOT EXISTS {
  MATCH (u)-[s1:HAS_SUBSCRIPTION]->(service:Service)
  MATCH (u)-[s2:HAS_SUBSCRIPTION]->(service)
  WHERE s1 <> s2
    AND s1.start_date <= s2.end_date
    AND s2.start_date <= s1.end_date
};
```

## Schema Evolution

### Adding Properties

Safely add new properties to existing nodes:

```gql
// Add optional property to all users
MATCH (u:User)
WHERE NOT EXISTS(u.verified)
SET u.verified = false;

// Add property with default value
MATCH (p:Product)
WHERE NOT EXISTS(p.in_stock)
SET p.in_stock = true,
    p.stock_quantity = 0;
```

### Migrating Labels

Rename or refactor labels:

```gql
// Migrate from old label to new label
MATCH (n:OldLabel)
SET n:NewLabel
REMOVE n:OldLabel;

// Split label into multiple labels
MATCH (u:User)
WHERE u.role = 'admin'
SET u:Admin;

MATCH (u:User)
WHERE u.tier = 'premium'
SET u:Premium;
```

### Schema Versioning

Track schema versions:

```gql
// Create schema version node
INSERT (v:SchemaVersion {
  version: '2.0.0',
  applied_at: datetime(),
  changes: [
    'Added User.verified property',
    'Created unique constraint on Product.product_id',
    'Added vector index on Product.embedding'
  ]
});

// Check current schema version
MATCH (v:SchemaVersion)
RETURN v.version, v.applied_at
ORDER BY v.applied_at DESC
LIMIT 1;
```

## Schema Introspection

### List Labels

Query existing labels in the database:

```gql
// Get all labels
CALL db.labels() YIELD label
RETURN label
ORDER BY label;

// Count nodes by label
CALL db.labels() YIELD label
MATCH (n)
WHERE label IN labels(n)
RETURN label, COUNT(n) AS node_count
ORDER BY node_count DESC;
```

### List Relationship Types

Query relationship types:

```gql
// Get all relationship types
CALL db.relationshipTypes() YIELD relationshipType
RETURN relationshipType
ORDER BY relationshipType;

// Count relationships by type
CALL db.relationshipTypes() YIELD relationshipType
MATCH ()-[r]->()
WHERE type(r) = relationshipType
RETURN relationshipType, COUNT(r) AS count
ORDER BY count DESC;
```

### List Constraints and Indexes

View schema definitions:

```gql
// List all constraints
SHOW CONSTRAINTS;

// List all indexes
SHOW INDEXES;

// Get index statistics
SHOW INDEX product_category_idx STATISTICS;
```

## Best Practices

1. **Start Schema-Free**: Prototype without constraints, add them as requirements emerge
2. **Index Lookup Properties**: Create indexes on properties used in WHERE clauses
3. **Unique Constraints for IDs**: Always constrain unique identifiers
4. **Validate Critical Data**: Add constraints for business-critical properties
5. **Composite Indexes**: Use multi-property indexes for common query patterns
6. **Document Schema**: Maintain documentation of labels, properties, and constraints
7. **Version Migrations**: Track schema changes with version nodes
8. **Test Constraints**: Validate constraints with test data before production
9. **Monitor Index Usage**: Track query plans to ensure indexes are used effectively
10. **Evolve Gradually**: Add schema constraints incrementally, not all at once

## Integration with Geode Features

Schema design leverages:

- **GQL Compliance**: Standard ISO constraint and index syntax
- **MVCC**: Schema changes don't block ongoing queries
- **Indexes**: B-tree, full-text, and vector indexes for diverse workloads
- **Constraints**: Unique, existence, type, and custom validation rules
- **Introspection**: Query schema metadata programmatically

Browse the tagged content below to discover documentation, tutorials, and guides for designing effective schemas in Geode.
