---
title: "Property Graph Data Model"
description: "Complete guide to the property graph data model in Geode. Learn about nodes, relationships, properties, labels, directed graphs, schema design patterns, and how to effectively model domain data as property graphs with GQL."
keywords:
  - property graph
  - graph data model
  - nodes and relationships
  - graph properties
  - labeled property graph
  - directed graph
  - schema design
  - Geode
  - GQL
  - data modeling
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/property-graph/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Property Graph Data Model

The property graph model is the most intuitive and widely-adopted approach to graph database modeling, combining the simplicity of labeled nodes and relationships with the flexibility of arbitrary properties. Geode's implementation of the property graph model through the ISO/IEC 39075:2024 GQL standard provides a powerful foundation for modeling complex, connected data.

## Understanding Property Graphs

A property graph consists of nodes (vertices) and relationships (edges), where both can carry properties (key-value pairs). This model extends basic graph theory with labels for categorization and rich data attributes, making it ideal for real-world applications.

### Core Elements

**Nodes** represent entities:
```gql
(p:Person {
  id: 'u123',
  name: 'Alice Johnson',
  age: 30,
  email: 'alice@example.com',
  joined: DATE '2024-01-15'
})
```

**Relationships** connect nodes with direction and type:
```gql
(alice)-[:WORKS_AT {
  since: DATE '2022-03-01',
  role: 'Senior Engineer',
  department: 'Platform'
}]->(company:Company)
```

**Properties** store data on both nodes and relationships:
```gql
-- Node properties
{name: 'Alice', age: 30, verified: true}

-- Relationship properties
{since: DATE '2022-03-01', strength: 0.85, context: 'professional'}
```

**Labels** categorize nodes:
```gql
-- Single label
(p:Person)

-- Multiple labels
(e:Person:Employee:Manager)
```

## Key Characteristics

### 1. Directed Relationships

All relationships in the property graph model have explicit direction, though queries can ignore direction when needed:

```gql
-- Directed relationship
(alice:Person)-[:FOLLOWS]->(bob:Person)  -- Alice follows Bob

-- Query with direction
MATCH (a:Person {name: 'Alice'})-[:FOLLOWS]->(followed)
RETURN followed.name;  -- Who Alice follows

-- Query ignoring direction (bidirectional pattern)
MATCH (a:Person {name: 'Alice'})-[:FOLLOWS]-(connected)
RETURN connected.name;  -- All connections regardless of direction
```

### 2. Typed Relationships

Relationships always have a type, enabling multi-relational graphs:

```gql
-- Multiple relationship types between same nodes
(alice:Person)-[:KNOWS]->(bob:Person)
(alice)-[:WORKS_WITH]->(bob)
(alice)-[:FOLLOWS]->(bob)

-- Query specific relationship types
MATCH (alice:Person {name: 'Alice'})-[:WORKS_WITH]->(colleague)
RETURN colleague.name;
```

### 3. Properties on Relationships

Unlike simple graphs, property graphs allow rich data on relationships:

```gql
-- Relationship properties add context
(user)-[:RATED {
  score: 4.5,
  timestamp: TIMESTAMP '2024-06-15 10:30:00',
  review: 'Great product!',
  verified_purchase: true
}]->(product)

-- Query by relationship properties
MATCH (u:User)-[r:RATED]->(p:Product)
WHERE r.score >= 4.0 AND r.verified_purchase = true
RETURN p.name, avg(r.score) AS avg_rating
GROUP BY p.name;
```

### 4. Schema Flexibility

Property graphs support schema-optional modeling:

```gql
-- Nodes of same label can have different properties
INSERT (p1:Person {name: 'Alice', age: 30, email: 'alice@example.com'});
INSERT (p2:Person {name: 'Bob', age: 28});  -- No email
INSERT (p3:Person {name: 'Charlie', age: 35, phone: '+1-555-0100'});  -- No email, has phone

-- Query handles missing properties gracefully
MATCH (p:Person)
RETURN p.name, p.email;  -- email is NULL for Bob and Charlie
```

## Modeling Domain Data

### Entity Identification

**When to use nodes**:
- Thing exists independently
- Referenced by multiple entities
- Has its own relationships
- Queried directly

**When to use properties**:
- Simple attribute value
- Not queried independently
- Unique to single entity
- No relationships of its own

```gql
-- GOOD: Address as node (shared, queryable)
INSERT (addr:Address {street: '123 Main St', city: 'Austin', state: 'TX'});
INSERT (alice:Person {name: 'Alice'})-[:LIVES_AT]->(addr);
INSERT (bob:Person {name: 'Bob'})-[:LIVES_AT]->(addr);  -- Same address

-- GOOD: Email as property (unique, simple)
INSERT (charlie:Person {name: 'Charlie', email: 'charlie@example.com'});

-- BAD: Address as property (can't be shared)
INSERT (dave:Person {name: 'Dave', address: '456 Oak St, Dallas, TX'});
```

### Relationship Modeling

Choose meaningful, action-oriented relationship types:

```gql
-- GOOD: Clear, specific relationships
(person:Person)-[:WORKS_AT]->(company:Company)
(user:User)-[:PURCHASED]->(product:Product)
(employee:Employee)-[:REPORTS_TO]->(manager:Manager)
(student:Student)-[:ENROLLED_IN]->(course:Course)

-- BAD: Generic, unclear relationships
(entity1)-[:RELATED_TO]->(entity2)
(node1)-[:CONNECTED]->(node2)
```

### Hierarchical Structures

Model trees and hierarchies naturally:

```gql
-- Organization chart
INSERT (ceo:Employee {name: 'CEO', level: 1});
INSERT (vp_eng:Employee {name: 'VP Engineering', level: 2});
INSERT (eng_manager:Employee {name: 'Engineering Manager', level: 3});
INSERT (senior_dev:Employee {name: 'Senior Developer', level: 4});

INSERT (vp_eng)-[:REPORTS_TO]->(ceo);
INSERT (eng_manager)-[:REPORTS_TO]->(vp_eng);
INSERT (senior_dev)-[:REPORTS_TO]->(eng_manager);

-- Query entire reporting chain
MATCH path = (emp:Employee {name: 'Senior Developer'})
             -[:REPORTS_TO*]->(ceo:Employee {level: 1})
RETURN path, length(path) AS levels_up;

-- Find all direct and indirect reports
MATCH (manager:Employee {name: 'VP Engineering'})
      <-[:REPORTS_TO*]-(report:Employee)
RETURN report.name, report.level
ORDER BY report.level;
```

### Many-to-Many Relationships

Property graphs handle many-to-many naturally without junction tables:

```gql
-- Students enroll in multiple courses; courses have multiple students
INSERT (alice:Student {name: 'Alice'});
INSERT (bob:Student {name: 'Bob'});
INSERT (math:Course {name: 'Math 101', credits: 3});
INSERT (cs:Course {name: 'CS 101', credits: 4});

-- Direct relationships with enrollment data
INSERT (alice)-[:ENROLLED_IN {semester: 'Fall 2024', grade: NULL}]->(math);
INSERT (alice)-[:ENROLLED_IN {semester: 'Fall 2024', grade: NULL}]->(cs);
INSERT (bob)-[:ENROLLED_IN {semester: 'Fall 2024', grade: NULL}]->(math);

-- Query: all students in a course
MATCH (s:Student)-[:ENROLLED_IN]->(c:Course {name: 'Math 101'})
RETURN s.name;

-- Query: all courses for a student
MATCH (s:Student {name: 'Alice'})-[:ENROLLED_IN]->(c:Course)
RETURN c.name, c.credits;
```

### Temporal Modeling

Model time-based relationships:

```gql
-- Historical relationships with time bounds
INSERT (emp:Employment {
  position: 'Software Engineer',
  start_date: DATE '2020-01-15',
  end_date: DATE '2022-06-30',
  salary: 95000
});
INSERT (alice:Person {name: 'Alice'})-[:HAD_EMPLOYMENT]->(emp);
INSERT (emp)-[:AT_COMPANY]->(company:Company {name: 'TechCorp'});

-- Current employment (end_date is NULL)
INSERT (emp2:Employment {
  position: 'Senior Engineer',
  start_date: DATE '2022-07-01',
  end_date: NULL,
  salary: 125000
});
INSERT (alice)-[:HAD_EMPLOYMENT]->(emp2);
INSERT (emp2)-[:AT_COMPANY]->(company2:Company {name: 'BigTech'});

-- Query current employer
MATCH (p:Person {name: 'Alice'})
      -[:HAD_EMPLOYMENT]->(emp:Employment {end_date: NULL})
      -[:AT_COMPANY]->(company)
RETURN company.name, emp.position;

-- Query employment history
MATCH (p:Person {name: 'Alice'})
      -[:HAD_EMPLOYMENT]->(emp:Employment)
      -[:AT_COMPANY]->(company)
RETURN company.name, emp.position, emp.start_date, emp.end_date
ORDER BY emp.start_date DESC;
```

## Advanced Patterns

### Reified Relationships (Hyperedges)

When relationships need their own relationships, convert them to nodes:

```gql
-- Problem: Can't attach relationships to relationships
-- (alice)-[:WORKED_ON {role: 'Developer'}]->(project)
-- How to represent that a manager approved this assignment?

-- Solution: Reify the relationship as a node
INSERT (assignment:Assignment {
  role: 'Developer',
  allocated_hours: 40,
  start_date: DATE '2024-01-15'
});
INSERT (alice:Person)-[:ASSIGNED]->(assignment);
INSERT (assignment)-[:TO_PROJECT]->(project:Project {name: 'WebApp'});
INSERT (manager:Person {name: 'Manager'})-[:APPROVED]->(assignment);
INSERT (assignment)-[:APPROVED_AT {timestamp: CURRENT_TIMESTAMP}]->(approval:Approval);
```

### Qualified Relationships

Add context through properties:

```gql
-- Social network with relationship strength and context
INSERT (alice)-[:KNOWS {
  strength: 0.85,
  context: 'work',
  since: DATE '2020-05-15',
  interactions_count: 47,
  last_interaction: TIMESTAMP '2024-06-10 14:30:00'
}]->(bob);

-- Query by relationship quality
MATCH (a:Person {name: 'Alice'})-[k:KNOWS]->(friend)
WHERE k.strength > 0.7 AND k.context = 'work'
RETURN friend.name, k.strength, k.since
ORDER BY k.strength DESC;
```

### Super Node Avoidance

Avoid nodes with millions of relationships (performance bottleneck):

```gql
-- PROBLEM: Country node connected to millions of users
-- INSERT (user1)-[:LIVES_IN]->(usa:Country);
-- INSERT (user2)-[:LIVES_IN]->(usa:Country);
-- ... millions more

-- SOLUTION 1: Use property instead
INSERT (user:User {name: 'Alice', country: 'USA'});
CREATE INDEX user_country ON User(country);

MATCH (u:User {country: 'USA'})
RETURN count(u);

-- SOLUTION 2: Introduce intermediate nodes
INSERT (user)-[:LIVES_IN]->(city:City {name: 'Austin'});
INSERT (city)-[:IN_STATE]->(state:State {name: 'Texas'});
INSERT (state)-[:IN_COUNTRY]->(country:Country {name: 'USA'});
```

### Multi-Graph Modeling

Multiple logical graphs in one database:

```gql
-- Tenant isolation via properties
INSERT (alice:Person {tenant_id: 'company_a', name: 'Alice'});
INSERT (bob:Person {tenant_id: 'company_b', name: 'Bob'});

-- Query single tenant
MATCH (p:Person {tenant_id: 'company_a'})
RETURN p.name;

-- Or use Row-Level Security
CREATE POLICY tenant_isolation ON ALL
USING (tenant_id = current_tenant());

-- Now all queries automatically filter by tenant
MATCH (p:Person) RETURN p.name;  -- Only returns current tenant's people
```

## Data Types and Properties

### Supported Types in Geode

**Primitive Types**:
- `INTEGER`: Whole numbers
- `FLOAT`: Decimal numbers
- `STRING`: Text
- `BOOLEAN`: true/false

**Temporal Types**:
- `DATE`: Calendar dates
- `TIME`: Time of day
- `TIMESTAMP`: Point in time
- `DURATION`: Time intervals

**Complex Types**:
- `LIST`: Arrays of values
- `MAP`: Nested key-value structures

**Special**:
- `NULL`: Absence of value

```gql
INSERT (product:Product {
  id: 'prod_123',              -- STRING
  name: 'Laptop',              -- STRING
  price: 1299.99,              -- FLOAT
  stock: 47,                   -- INTEGER
  available: true,             -- BOOLEAN
  released: DATE '2024-03-15', -- DATE
  updated: CURRENT_TIMESTAMP,  -- TIMESTAMP
  tags: ['electronics', 'computers', 'portable'],  -- LIST
  specs: {
    cpu: 'Intel i9',
    ram: '32GB',
    storage: '1TB SSD'
  },                          -- MAP
  discontinued: NULL          -- NULL
});
```

## Schema Design Best Practices

### 1. Model for Queries

Design based on how you'll query, not just domain structure:

```gql
-- If you frequently need "products a user might like"
-- Model supports this efficiently:
MATCH (u:User {id: $user_id})-[:LIKES]->(category:Category)
MATCH (p:Product)-[:IN_CATEGORY]->(category)
WHERE NOT EXISTS { MATCH (u)-[:PURCHASED]->(p) }
RETURN p.name, count(category) AS relevance
ORDER BY relevance DESC;
```

### 2. Normalize Appropriately

Unlike relational, some denormalization is beneficial:

```gql
-- OK: Store commonly-accessed data redundantly for performance
INSERT (order:Order {
  id: 'o123',
  customer_id: 'c456',
  customer_name: 'Alice',  -- Denormalized for quick access
  total: 299.99
});
INSERT (order)-[:PLACED_BY]->(customer:Customer {id: 'c456', name: 'Alice'});
```

### 3. Use Meaningful Labels

```gql
-- GOOD: Specific labels
(p:Person), (c:Company), (prod:Product)

-- BAD: Generic label with type property
(entity:Entity {type: 'person'})
```

### 4. Index Strategic Properties

```gql
-- Index properties used for lookups
CREATE INDEX user_email ON User(email);
CREATE INDEX product_sku ON Product(sku);
CREATE INDEX order_date ON Order(date);

-- Composite indexes for multi-property queries
CREATE INDEX product_category_price ON Product(category, price);
```

### 5. Avoid Redundant Relationships

```gql
-- BAD: Redundant relationship
INSERT (user)-[:LIVES_IN]->(city:City);
INSERT (city)-[:IN_STATE]->(state:State);
INSERT (user)-[:LIVES_IN_STATE]->(state);  -- Redundant! Can be derived

-- GOOD: Derive through traversal
MATCH (user:User)-[:LIVES_IN]->(city)-[:IN_STATE]->(state)
RETURN state.name;
```

## Querying Property Graphs

### Pattern Matching

```gql
-- Simple pattern
MATCH (p:Person {age: 30})
RETURN p.name;

-- Multi-hop pattern
MATCH (a:Person)-[:KNOWS]->(b)-[:KNOWS]->(c)
WHERE a.name = 'Alice'
RETURN c.name;

-- Variable-length paths
MATCH (a:Person)-[:KNOWS*2..4]->(distant)
WHERE a.name = 'Alice'
RETURN distant.name, length(path) AS hops;
```

### Property Access

```gql
-- Access node properties
MATCH (p:Person)
RETURN p.name, p.age, p.email;

-- Access relationship properties
MATCH (a:Person)-[r:KNOWS]->(b:Person)
RETURN a.name, b.name, r.since, r.strength;

-- Filter by properties
MATCH (p:Product)
WHERE p.price > 100 AND p.category = 'Electronics'
RETURN p.name, p.price;
```

### Path Operations

```gql
-- Extract path components
MATCH path = (a:Person)-[:KNOWS*]-(b:Person)
WHERE a.name = 'Alice' AND b.name = 'Bob'
RETURN
  nodes(path) AS all_nodes,
  relationships(path) AS all_rels,
  length(path) AS hop_count;

-- Shortest path
MATCH path = SHORTEST (a:Person {name: 'Alice'})-[:KNOWS*]-(b:Person {name: 'Bob'})
RETURN path, length(path);
```

## Comparison with Other Models

### vs. Relational Model

| Aspect | Property Graph | Relational |
|--------|----------------|------------|
| Relationships | First-class | Foreign keys |
| Traversal | O(1) per hop | JOIN (expensive) |
| Schema | Flexible | Rigid |
| Many-to-many | Direct | Junction tables |

### vs. RDF Triple Stores

| Aspect | Property Graph | RDF |
|--------|----------------|-----|
| Structure | Labeled nodes/relationships | Subject-predicate-object triples |
| Properties | On nodes and relationships | Requires reification |
| Query | GQL (pattern matching) | SPARQL |
| Use Case | General graph data | Semantic web, ontologies |

### vs. Document Databases

| Aspect | Property Graph | Document |
|--------|----------------|----------|
| Relationships | Explicit, navigable | Embedded or referenced |
| Queries | Pattern traversal | Key lookup or full scan |
| Consistency | ACID (Geode) | Eventual (most) |
| Use Case | Connected data | Document-centric |

## Implementation in Geode

Geode implements the property graph model through:

- **ISO/IEC 39075:2024 GQL**: Standard query language
- **Native Graph Storage**: Adjacency lists for O(1) traversals
- **B-tree Indexes**: Fast property lookups
- **Row-Level Security**: Property-level access control
- **ACID Transactions**: Full consistency guarantees

```gql
-- Example leveraging Geode features
BEGIN TRANSACTION;

INSERT (user:User {id: 'u123', name: 'Alice'});
INSERT (product:Product {id: 'p456', name: 'Laptop', price: 1299});
INSERT (user)-[:PURCHASED {date: CURRENT_DATE, amount: 1299}]->(product);

COMMIT;

-- Query with RLS
CREATE POLICY user_purchases ON PURCHASED
USING (source.id = current_user_id());

MATCH (u:User)-[p:PURCHASED]->(prod:Product)
RETURN prod.name;  -- Only returns current user's purchases
```

## Conclusion

The property graph model provides an intuitive, flexible approach to modeling connected data that closely mirrors how we think about relationships in the real world. By combining nodes, relationships, properties, and labels, you can represent complex domains naturally and query them efficiently with pattern matching.

Geode's implementation of the property graph model through the ISO GQL standard brings this powerful paradigm to production workloads with enterprise features, ACID guarantees, and high performance. Explore the documentation below for domain-specific modeling patterns, optimization techniques, and best practices.
