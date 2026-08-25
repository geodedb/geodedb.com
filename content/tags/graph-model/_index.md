---
title: "Property Graph Model"
description: "Deep dive into the property graph model implemented by Geode. Learn about nodes, relationships, properties, labels, directed graphs, schema design, modeling patterns, and best practices for representing domain data as graphs."
keywords:
  - property graph
  - graph model
  - nodes and relationships
  - graph schema
  - data modeling
  - directed graph
  - graph design
  - Geode
  - GQL
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/graph-model/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Property Graph Model

The property graph model is the most widely adopted graph database model, used by Geode, Neo4j, Amazon Neptune, TigerGraph, and many others. It provides an intuitive, flexible way to model complex, interconnected data by representing entities as nodes and connections as relationships, with both capable of holding rich property data.

## Core Concepts

### Nodes (Vertices)

Nodes represent entities in your domain model: people, products, locations, events, documents, or any discrete object.

**Characteristics**:

- Unique identity (typically an ID)
- Zero or more labels for categorization
- Zero or more properties (key-value pairs)

```gql
-- Simple node
(p:Person)

-- Node with properties
(p:Person {
  id: 'user_12345',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  age: 32,
  city: 'San Francisco',
  joined: DATE '2024-01-15',
  verified: true
})

-- Node with multiple labels
(e:Person:Employee:Manager {
  id: 'emp_789',
  name: 'Bob Smith',
  department: 'Engineering'
})
```

### Relationships (Edges)

Relationships connect nodes and represent how entities relate to each other.

**Characteristics**:

- Always directed (source → target)
- Always have a type/label
- Connect exactly two nodes (source and target)
- Can have properties

```gql
-- Simple relationship
(alice:Person)-[:KNOWS]->(bob:Person)

-- Relationship with properties
(alice)-[:KNOWS {
  since: DATE '2020-05-15',
  context: 'college',
  strength: 0.85
}]->(bob)

-- Multiple relationships between same nodes
(alice)-[:FOLLOWS]->(bob)
(alice)-[:WORKS_WITH]->(bob)
(alice)-[:KNOWS]->(bob)
```

### Properties

Properties are key-value pairs that store data on nodes and relationships.

**Supported Data Types** (in Geode):

- **Primitives**: INTEGER, FLOAT, STRING, BOOLEAN
- **Temporal**: DATE, TIME, TIMESTAMP, DURATION
- **Complex**: LIST, MAP
- **Special**: NULL

```gql
-- Various property types
INSERT (p:Product {
  id: 'prod_123',                          -- STRING
  name: 'Wireless Headphones',             -- STRING
  price: 99.99,                            -- FLOAT
  stock: 47,                               -- INTEGER
  available: true,                         -- BOOLEAN
  released: DATE '2024-03-15',             -- DATE
  last_updated: CURRENT_TIMESTAMP,         -- TIMESTAMP
  tags: ['audio', 'wireless', 'premium'],  -- LIST
  specs: {
    battery: '30 hours',
    weight: '250g',
    bluetooth: '5.3'
  }                                        -- MAP
});
```

### Labels

Labels categorize nodes into types or groups, enabling efficient filtering and schema organization.

**Single Label**:

```gql
INSERT (u:User {name: 'Alice'});
MATCH (u:User) RETURN u.name;
```

**Multiple Labels**:

```gql
-- Node can have multiple labels
INSERT (e:Person:Employee:Manager {name: 'Bob'});

-- Query by any label
MATCH (p:Person) WHERE p.name = 'Bob' RETURN p;
MATCH (m:Manager) WHERE m.name = 'Bob' RETURN m;
```

## Directed vs. Undirected Relationships

The property graph model uses **directed relationships** by default, meaning every relationship has a source and target node.

### Directed Relationships

```gql
-- Alice follows Bob (unidirectional)
(alice:Person)-[:FOLLOWS]->(bob:Person)

-- Query respects direction
MATCH (a:Person {name: 'Alice'})-[:FOLLOWS]->(followed)
RETURN followed.name;  -- Returns 'Bob'

MATCH (a:Person {name: 'Alice'})<-[:FOLLOWS]-(follower)
RETURN follower.name;  -- Returns nothing (no one follows Alice in this example)
```

### Modeling Bidirectional Relationships

**Option 1**: Create two relationships

```gql
-- Mutual friendship
INSERT (alice)-[:FRIENDS_WITH]->(bob);
INSERT (bob)-[:FRIENDS_WITH]->(alice);
```

**Option 2**: Query without direction

```gql
-- Query both directions with undirected pattern
MATCH (alice:Person {name: 'Alice'})-[:FRIENDS_WITH]-(friend)
RETURN friend.name;
-- Returns friends regardless of direction
```

**Option 3**: Use symmetric relationship type

```gql
-- Create once, query bidirectionally
INSERT (alice)-[:MARRIED_TO]->(bob);

-- Query either direction
MATCH (a:Person {name: 'Alice'})-[:MARRIED_TO]-(spouse)
RETURN spouse.name;  -- Returns 'Bob'
```

## Schema Design Patterns

### Entity Modeling

**Rule of Thumb**: If it's a "thing" in your domain, it's probably a node.

```gql
-- E-commerce domain model
INSERT (customer:Customer {id: 'c123', name: 'Alice'});
INSERT (product:Product {id: 'p456', name: 'Laptop', price: 1299});
INSERT (order:Order {id: 'o789', date: CURRENT_DATE, total: 1299});
INSERT (category:Category {name: 'Electronics'});

-- Relationships define the structure
INSERT (customer)-[:PLACED]->(order);
INSERT (order)-[:CONTAINS {quantity: 1}]->(product);
INSERT (product)-[:IN_CATEGORY]->(category);
```

### Relationship Types

Choose descriptive, action-oriented relationship types:

**Good Examples**:

- `:KNOWS`, `:FOLLOWS`, `:LIKES`
- `:WORKS_AT`, `:REPORTS_TO`, `:MANAGES`
- `:PURCHASED`, `:CONTAINS`, `:SHIPPED_TO`
- `:DEPENDS_ON`, `:IMPLEMENTS`, `:EXTENDS`

**Avoid**:

- Generic types like `:RELATED_TO`, `:CONNECTED_TO`
- Nouns instead of verbs: `:FRIEND` (use `:FRIENDS_WITH`)

### When to Use Nodes vs. Properties

**Use a Node When**:

- Entity is referenced by multiple other entities
- Entity has its own relationships
- Entity has complex attributes
- You need to query by this entity

**Use a Property When**:

- Simple attribute value
- Not queried independently
- Not shared across entities
- No relationships of its own

```gql
-- GOOD: Address as node (shared, has relationships)
INSERT (alice:Person {name: 'Alice'});
INSERT (addr:Address {street: '123 Main St', city: 'SF', zip: '94102'});
INSERT (alice)-[:LIVES_AT]->(addr);
-- Multiple people can live at same address

-- GOOD: Email as property (simple, unique to person)
INSERT (bob:Person {name: 'Bob', email: 'bob@example.com'});

-- BAD: Address as property (can't be shared)
INSERT (charlie:Person {
  name: 'Charlie',
  address: '123 Main St, SF 94102'  -- Can't share or query efficiently
});
```

### Hierarchical Data

**Tree Structures**:

```gql
-- Organization hierarchy
INSERT (ceo:Employee {name: 'CEO', title: 'Chief Executive'});
INSERT (cto:Employee {name: 'CTO', title: 'Chief Technology Officer'});
INSERT (dev1:Employee {name: 'Alice', title: 'Senior Developer'});
INSERT (dev2:Employee {name: 'Bob', title: 'Developer'});

INSERT (cto)-[:REPORTS_TO]->(ceo);
INSERT (dev1)-[:REPORTS_TO]->(cto);
INSERT (dev2)-[:REPORTS_TO]->(dev1);

-- Query hierarchy
MATCH path = (e:Employee)-[:REPORTS_TO*]->(ceo:Employee {title: 'Chief Executive'})
RETURN e.name, length(path) AS levels_from_ceo
ORDER BY levels_from_ceo;
```

**Category Hierarchies**:

```gql
-- Product categories
INSERT (electronics:Category {name: 'Electronics'});
INSERT (computers:Category {name: 'Computers'});
INSERT (laptops:Category {name: 'Laptops'});

INSERT (laptops)-[:SUBCATEGORY_OF]->(computers);
INSERT (computers)-[:SUBCATEGORY_OF]->(electronics);

-- Find all products in category hierarchy
MATCH (product:Product)-[:IN_CATEGORY]->(category:Category)
WHERE category.name = 'Laptops'
   OR (category)-[:SUBCATEGORY_OF*]->(parent:Category {name: 'Laptops'})
RETURN product.name;
```

### Many-to-Many Relationships

Graph models naturally represent many-to-many relationships without junction tables.

```gql
-- Students and courses (many-to-many)
INSERT (alice:Student {name: 'Alice'});
INSERT (bob:Student {name: 'Bob'});
INSERT (math:Course {name: 'Mathematics 101'});
INSERT (cs:Course {name: 'Computer Science 101'});

-- Direct relationships
INSERT (alice)-[:ENROLLED_IN {semester: 'Fall 2024', grade: NULL}]->(math);
INSERT (alice)-[:ENROLLED_IN {semester: 'Fall 2024', grade: NULL}]->(cs);
INSERT (bob)-[:ENROLLED_IN {semester: 'Fall 2024', grade: NULL}]->(math);

-- Query: students in a course
MATCH (s:Student)-[:ENROLLED_IN]->(c:Course {name: 'Mathematics 101'})
RETURN s.name;

-- Query: courses for a student
MATCH (s:Student {name: 'Alice'})-[:ENROLLED_IN]->(c:Course)
RETURN c.name;
```

### Reified Relationships (Hyperedges)

When relationships need their own relationships, convert them to nodes.

```gql
-- BAD: Can't attach relationships to relationships directly
(alice)-[:WORKED_ON {role: 'Developer'}]->(project)
-- How to represent: manager approved this assignment?

-- GOOD: Reify relationship as node
INSERT (assignment:Assignment {
  role: 'Developer',
  start_date: DATE '2024-01-15',
  status: 'active'
});
INSERT (alice:Person)-[:ASSIGNED]->(assignment);
INSERT (assignment)-[:FOR_PROJECT]->(project:Project);
INSERT (manager:Person)-[:APPROVED]->(assignment);
INSERT (assignment)-[:APPROVED_BY]->(manager);
```

### Temporal Modeling

Model data that changes over time.

**Version 1: Properties on Relationships**:

```gql
-- Simple: dates on relationship
INSERT (alice)-[:EMPLOYED_BY {
  start_date: DATE '2024-01-15',
  end_date: NULL,
  position: 'Engineer'
}]->(company);
```

**Version 2: Separate Time Periods**:

```gql
-- Complex: multiple employment periods
INSERT (employment:Employment {
  position: 'Junior Engineer',
  start_date: DATE '2024-01-15',
  end_date: DATE '2024-06-30'
});
INSERT (alice:Person)-[:HAD_EMPLOYMENT]->(employment);
INSERT (employment)-[:AT_COMPANY]->(company:Company);

INSERT (employment2:Employment {
  position: 'Senior Engineer',
  start_date: DATE '2024-07-01',
  end_date: NULL  -- Current
});
INSERT (alice)-[:HAD_EMPLOYMENT]->(employment2);
INSERT (employment2)-[:AT_COMPANY]->(company);
```

### Provenance and Metadata

Track data lineage and metadata.

```gql
-- Provenance pattern
INSERT (data:DataSet {name: 'Customer Analytics Q1 2024'});
INSERT (source1:DataSource {name: 'CRM Export', type: 'CSV'});
INSERT (source2:DataSource {name: 'Web Analytics', type: 'API'});
INSERT (transform:Transformation {
  script: 'etl_pipeline_v2.py',
  executed_at: CURRENT_TIMESTAMP,
  executed_by: 'etl_service'
});

INSERT (data)-[:DERIVED_FROM {timestamp: CURRENT_TIMESTAMP}]->(transform);
INSERT (transform)-[:USED_SOURCE]->(source1);
INSERT (transform)-[:USED_SOURCE]->(source2);
```

## Advanced Modeling Patterns

### Super Nodes (Hub Nodes)

Avoid nodes with millions of relationships (degrades performance).

**Problem**:

```gql
-- BAD: Country node connected to millions of users
INSERT (user1)-[:LIVES_IN]->(usa:Country);
INSERT (user2)-[:LIVES_IN]->(usa:Country);
-- ... millions more
```

**Solution 1**: Use property instead

```gql
-- Store country as property, index it
INSERT (user:User {name: 'Alice', country: 'USA'});
CREATE INDEX user_country ON User(country);
```

**Solution 2**: Intermediate grouping nodes

```gql
-- Add state/region level
INSERT (user)-[:LIVES_IN]->(state:State {name: 'California'});
INSERT (state)-[:IN_COUNTRY]->(country:Country {name: 'USA'});
```

### Qualified Relationships

Add context to relationships through properties.

```gql
-- Social network with relationship context
INSERT (alice)-[:KNOWS {
  context: 'colleague',
  strength: 0.8,
  since: DATE '2022-03-15',
  last_interaction: CURRENT_TIMESTAMP
}]->(bob);

-- Query by relationship qualities
MATCH (a:Person {name: 'Alice'})-[k:KNOWS]->(friend)
WHERE k.context = 'colleague' AND k.strength > 0.5
RETURN friend.name, k.since;
```

### Multi-Graph Modeling

Separate logical graphs within one database.

```gql
-- Use properties to segment graphs
INSERT (alice:Person {tenant_id: 'company_a', name: 'Alice'});
INSERT (bob:Person {tenant_id: 'company_b', name: 'Bob'});

-- Query single tenant
MATCH (p:Person {tenant_id: 'company_a'})
RETURN p.name;

-- Or use row-level security
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Label', 'access_tag', 'access_tag');
```

## Schema Evolution

The property graph model supports flexible schema evolution.

### Adding New Properties

```gql
-- Existing nodes
INSERT (user:User {name: 'Alice', email: 'alice@example.com'});

-- Later: add new property to specific nodes
MATCH (u:User {name: 'Alice'})
SET u.phone = '+1-555-0100';

-- New nodes include new property
INSERT (user2:User {
  name: 'Bob',
  email: 'bob@example.com',
  phone: '+1-555-0200'
});
```

### Adding New Labels

```gql
-- Add label to existing node
MATCH (u:User {email: 'alice@example.com'})
SET u:PremiumUser;

-- Now node has both labels
MATCH (u:User:PremiumUser)
RETURN u.name;
```

### Adding New Relationship Types

```gql
-- Existing relationships
INSERT (alice)-[:FOLLOWS]->(bob);

-- Add new relationship type
INSERT (alice)-[:BLOCKS]->(spammer:User {name: 'Spammer'});

-- Both relationship types coexist
MATCH (alice:User {name: 'Alice'})-[r]-(other)
RETURN type(r), other.name;
```

## Best Practices

### 1. Model for Your Queries

Design your graph based on how you'll query it, not just how you think about the domain.

```gql
-- If you frequently need "products a user might like"
-- Model user preferences and product attributes to support this query
MATCH (u:User {id: $user_id})-[:LIKES]->(pref:Preference)
MATCH (p:Product)-[:HAS_ATTRIBUTE]->(pref)
WHERE NOT EXISTS { MATCH (u)-[:PURCHASED]->(p) }
RETURN p.name, count(pref) AS match_score
ORDER BY match_score DESC;
```

### 2. Use Meaningful Names

```gql
-- GOOD: Clear, specific names
(person:Person)-[:WORKS_AT]->(company:Company)
(user:User)-[:PURCHASED]->(product:Product)

-- BAD: Generic, unclear names
(node1:Entity)-[:RELATED_TO]->(node2:Entity)
```

### 3. Normalize Carefully

Unlike relational databases, some denormalization is acceptable and beneficial in graphs.

```gql
-- OK to duplicate data for query performance
INSERT (order:Order {
  id: 'o123',
  customer_id: 'c456',
  customer_name: 'Alice',  -- Denormalized for quick access
  total: 99.99
});
INSERT (order)-[:PLACED_BY]->(customer:Customer {id: 'c456', name: 'Alice'});
```

### 4. Index Strategically

```gql
-- Index properties used for lookups
CREATE INDEX user_email ON User(email);
CREATE INDEX product_sku ON Product(sku);
CREATE INDEX order_date ON Order(order_date);
```

### 5. Avoid Over-Connecting

Don't create relationships just because data is related conceptually.

```gql
-- BAD: Redundant relationship
INSERT (user)-[:LIVES_IN]->(city:City);
INSERT (city)-[:IN_STATE]->(state:State);
INSERT (user)-[:LIVES_IN_STATE]->(state);  -- Redundant! Can be derived

-- GOOD: Derive through traversal
MATCH (user:User)-[:LIVES_IN]->(city)-[:IN_STATE]->(state)
RETURN state.name;
```

## Common Modeling Mistakes

### 1. Storing Lists in Properties Instead of Relationships

```gql
-- BAD: List property
INSERT (user:User {
  name: 'Alice',
  friend_ids: ['user_2', 'user_3', 'user_4']  -- Hard to query
});

-- GOOD: Relationships
INSERT (alice:User {name: 'Alice'});
INSERT (bob:User {name: 'Bob'});
INSERT (charlie:User {name: 'Charlie'});
INSERT (alice)-[:FRIENDS_WITH]->(bob);
INSERT (alice)-[:FRIENDS_WITH]->(charlie);
```

### 2. Using Node Properties Instead of Relationships

```gql
-- BAD: Foreign key style
INSERT (order:Order {
  id: 'o123',
  customer_id: 'c456'  -- Relational thinking
});

-- GOOD: Relationship
INSERT (order:Order {id: 'o123'});
INSERT (customer:Customer {id: 'c456'});
INSERT (order)-[:PLACED_BY]->(customer);
```

### 3. Single Super Label

```gql
-- BAD: Generic label with type property
INSERT (entity:Entity {type: 'person', name: 'Alice'});
INSERT (entity:Entity {type: 'company', name: 'Acme Corp'});

-- GOOD: Specific labels
INSERT (person:Person {name: 'Alice'});
INSERT (company:Company {name: 'Acme Corp'});
```

## Model Validation

Geode supports schema constraints to ensure data quality:

```gql
-- Unique constraint
CREATE CONSTRAINT user_email_unique ON User(email) UNIQUE;

-- Existence constraint
CREATE CONSTRAINT user_email_required ON User REQUIRE email;

-- Type constraint (implicit in GQL)
-- Properties automatically validated against declared types
```

## Conclusion

The property graph model provides a natural, intuitive way to model complex, interconnected data. By understanding nodes, relationships, properties, and common design patterns, you can create efficient, queryable graph schemas that closely mirror your domain and support your application's query requirements.

Explore the documentation below for detailed examples of modeling specific domains, advanced patterns, and optimization techniques.
