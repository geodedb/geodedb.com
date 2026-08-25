---
title: "Data Model"
description: "Property graph data model, type system, and graph modeling patterns for Geode database"
summary: "Understand Geode's property graph data model including nodes, relationships, properties, labels, and the comprehensive type system with 50+ specialized types."
weight: 25
keywords:
  - data model
  - property graph
  - graph model
  - nodes
  - relationships
  - properties
  - labels
  - type system
tags:
  - data-model
  - graph-model
  - types
  - schema
categories:
  - core-concepts
  - reference
toc: true
params:
  seo:
    keywords: "property graph, graph data model, nodes, relationships, graph database types, property graph model"
    description: "Complete guide to Geode's property graph data model covering nodes, relationships, properties, labels, and comprehensive type system"
---

<!-- CANARY: REQ=REQ-GQL-001; FEATURE="BasicQuery"; ASPECT=Testing; STATUS=TESTED; OWNER=test; UPDATED=2025-10-02 -->

# Data Model

Understand Geode's property graph data model and how to effectively model your data using nodes, relationships, properties, and labels.

## Overview

Geode implements the property graph model, a flexible and powerful way to represent connected data. Unlike relational databases with rigid table schemas or document databases with isolated documents, property graphs excel at representing and querying relationships between entities.

The property graph model consists of four fundamental concepts: nodes (entities), relationships (connections between entities), properties (key-value pairs attached to nodes and relationships), and labels (types that categorize nodes and relationships). This simple but expressive model enables natural representation of complex, interconnected data.

## Property Graph Model

### Core Concepts

**Nodes** represent entities in your domain (people, products, locations, events, etc.). Each node can have:

- **Labels**: One or more type tags (e.g., `:Person`, `:Employee`)
- **Properties**: Key-value pairs storing data about the entity
- **Unique ID**: System-assigned identifier

**Relationships** represent connections between nodes. Each relationship has:

- **Type**: Exactly one relationship type (e.g., `:KNOWS`, `:WORKS_FOR`)
- **Direction**: Relationships are always directed (source → target)
- **Properties**: Key-value pairs describing the connection
- **Unique ID**: System-assigned identifier

**Properties** store data as key-value pairs where:

- **Keys**: String identifiers (e.g., "name", "age", "created_at")
- **Values**: Any supported data type (see Type System below)
- **Schema-optional**: Properties can be added/removed dynamically

**Labels** categorize nodes and relationships:

- **Multiple Labels**: Nodes can have multiple labels (e.g., `:Person:Employee:Manager`)
- **Single Type**: Relationships have exactly one type
- **Index Support**: Labels enable efficient querying via indexes

### Graph Example

```
(alice:Person {name: "Alice", age: 30})
    -[:WORKS_FOR {since: 2020, role: "Engineer"}]->
(acme:Company {name: "Acme Corp", founded: 2010})
    <-[:WORKS_FOR {since: 2021, role: "Designer"}]-
(bob:Person {name: "Bob", age: 25})

(alice)-[:KNOWS {since: 2019}]->(bob)
```

This simple graph represents:

- Two people (Alice and Bob) with properties
- One company (Acme Corp)
- Three relationships (two WORKS_FOR, one KNOWS) with properties
- Direction indicating who works for whom and who knows whom

## Topics in This Section

- **[Data Model and Types](/docs/model/data-model-and-types/)** - Comprehensive guide to the property graph model, type system, and all 50+ supported data types

## Type System

Geode supports **50+ specialized data types** organized into categories:

### Core Types

- **Primitives**: `NULL`, `BOOLEAN`, `INTEGER`, `FLOAT`, `STRING`, `BYTES`
- **Temporal**: `DATE`, `TIME`, `TIMESTAMP`, `DURATION`, `ZONED_DATETIME`
- **Collections**: `LIST`, `MAP`, `SET`

### Advanced Types

- **Geometric**: `POINT`, `LINESTRING`, `POLYGON`, `GEOGRAPHY`, `GEOMETRY`
- **Network**: `IPV4`, `IPV6`, `CIDR`, `MAC_ADDRESS`
- **Specialized**: `UUID`, `VECTOR`, `JSON`, `BIGDECIMAL`, `REGEX`
- **Financial**: `MONEY`, `CURRENCY`
- **Cryptographic**: `HASH`, `ENCRYPTED`

### Type Promotion and Coercion

Geode automatically promotes compatible types:

```gql
-- INTEGER to FLOAT
RETURN 1 + 2.5  -- Returns 3.5 (FLOAT)

-- STRING to TIMESTAMP
RETURN timestamp('2024-01-01')

-- LIST concatenation
RETURN [1, 2] + [3, 4]  -- Returns [1, 2, 3, 4]
```

See [Data Model and Types](/docs/model/data-model-and-types/) for complete type reference.

## Modeling Patterns

### Entity Modeling

**Nodes for Entities**: Model domain entities as nodes with labels:

```gql
-- Single label
CREATE (:Person {name: "Alice", age: 30})

-- Multiple labels for hierarchies
CREATE (:Person:Employee:Manager {
  name: "Alice",
  employee_id: "E123",
  department: "Engineering"
})
```

### Relationship Modeling

**Relationships for Connections**: Model associations as typed relationships:

```gql
-- Simple relationship
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS]->(b)

-- Relationship with properties
MATCH (a:Person {name: "Alice"}), (c:Company {name: "Acme"})
CREATE (a)-[:WORKS_FOR {
  since: date('2020-01-01'),
  role: "Engineer",
  salary: currency(150000, 'USD')
}]->(c)
```

### Property Modeling

**Choose Property vs. Node**: General guidelines:

- **Use Properties** for:
  - Attributes of an entity (name, age, email)
  - Simple values that don't need relationships
  - Data used primarily for filtering/sorting

- **Use Nodes** for:
  - Entities that have their own relationships
  - Shared reference data (cities, countries, categories)
  - Complex entities with lifecycle management

```gql
-- Property approach (simple)
CREATE (:Person {name: "Alice", city: "Seattle"})

-- Node approach (enables city relationships)
CREATE (p:Person {name: "Alice"})
CREATE (c:City {name: "Seattle", state: "WA"})
CREATE (p)-[:LIVES_IN]->(c)
```

### Denormalization Trade-offs

Unlike relational databases, property graphs benefit from selective denormalization:

```gql
-- Normalized (requires traversal)
(:Person)-[:LIVES_IN]->(:City)-[:IN_STATE]->(:State)

-- Denormalized (faster queries, more storage)
(:Person {city: "Seattle", state: "WA"})

-- Hybrid (balanced approach)
(:Person {city: "Seattle"})-[:LIVES_IN]->(:City {state: "WA"})
```

## Schema Design Best Practices

### Label Strategy

- Use **meaningful, domain-specific labels** (`:Person`, `:Product`, not `:Node1`)
- Use **multiple labels for hierarchies** (`:Person:Employee:Manager`)
- Keep **label names singular** (`:Person` not `:Persons`)
- Use **UPPER_SNAKE_CASE** for relationship types (`:WORKS_FOR`)

### Property Strategy

- Store **immutable data in properties** (birth_date, created_at)
- Use **relationships for mutable associations** (current_company, current_location)
- Denormalize **frequently accessed paths** for performance
- Normalize **frequently updated data** to reduce update overhead

### Performance Considerations

- Create **indexes on frequently queried properties**
- Use **unique constraints** to prevent duplicates
- Design **relationships for primary query patterns**
- Consider **cardinality** when modeling relationships

See [Schema Design Guide](/docs/guides/schema-design/) for detailed patterns.

## Constraints and Validation

Geode supports schema constraints:

```gql
-- UNIQUE constraint
CREATE CONSTRAINT person_email_unique
FOR (p:Person)
REQUIRE p.email IS UNIQUE

-- NOT NULL constraint
CREATE CONSTRAINT person_name_not_null
FOR (p:Person)
REQUIRE p.name IS NOT NULL

-- NODE KEY (combined uniqueness + existence)
CREATE CONSTRAINT person_ssn_key
FOR (p:Person)
REQUIRE (p.ssn) IS NODE KEY
```

See [Data Model and Types](/docs/model/data-model-and-types/) for constraint details.

## Learn More

- [GQL Guide](/docs/gql/guide/) - Query your graph model with GQL
- [Schema Design Guide](/docs/guides/schema-design/) - Advanced modeling patterns
- [Data Types Reference](/docs/data-types/) - Complete type system reference
- [Indexing and Optimization](/docs/query/indexing-and-optimization/) - Index strategies for your model
- [Use Cases](/docs/use-cases/) - Real-world modeling examples

## Examples by Domain

### Social Network

```gql
CREATE GRAPH SocialNetwork;
USE SocialNetwork;

-- People
CREATE (:Person {name: "Alice", email: "alice@example.com"})
CREATE (:Person {name: "Bob", email: "bob@example.com"})

-- Relationships
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS {since: 2020}]->(b)

-- Posts
CREATE (p:Post {
  content: "Hello, world!",
  created_at: timestamp(),
  likes: 0
})

MATCH (author:Person {name: "Alice"}), (p:Post)
CREATE (author)-[:POSTED]->(p)
```

### E-Commerce

```gql
-- Products and Categories
CREATE (:Product {
  sku: "WIDGET-001",
  name: "Super Widget",
  price: currency(29.99, 'USD')
})-[:IN_CATEGORY]->(:Category {name: "Widgets"})

-- Orders
CREATE (o:Order {
  order_id: "ORD-123",
  created_at: timestamp(),
  status: "pending"
})

MATCH (customer:Person {email: "alice@example.com"}), (o:Order)
CREATE (customer)-[:PLACED]->(o)
```

## Next Steps

- [Data Model and Types](/docs/model/data-model-and-types/) - Complete reference
- [GQL Guide](/docs/gql/guide/) - Learn to query your model
- [Tutorials](/docs/tutorials/) - Hands-on modeling exercises
