---
title: "ISO/IEC 39075:2024 Specification"
description: "Complete guide to the ISO/IEC 39075:2024 GQL specification implemented by Geode. Learn about the standard, its features, syntax, semantics, conformance, and how Geode follows the ISO/IEC 39075:2024 conformance profile."
keywords:
  - ISO 39075
  - GQL specification
  - ISO GQL standard
  - graph query language
  - standards compliance
  - GQL syntax
  - ISO standard
  - Geode
  - graph database
  - international standard
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/specification/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# ISO/IEC 39075:2024 Specification

The ISO/IEC 39075:2024 standard, also known as GQL (Graph Query Language), is the international standard for querying property graph databases. Like SQL for relational databases, GQL provides a vendor-neutral, standardized language for graph data manipulation and querying. Geode follows the ISO/IEC 39075:2024 compliance — see the conformance profile for scope and diagnostics.

## Understanding the GQL Standard

### What is ISO/IEC 39075:2024?

ISO/IEC 39075:2024 is the **first international standard for graph database query language**, published by the International Organization for Standardization (ISO) and the International Electrotechnical Commission (IEC). It defines:

- **Syntax**: How queries are written
- **Semantics**: What queries mean
- **Data Model**: Property graph structure
- **Type System**: Data types and their operations
- **Conformance**: Requirements for compliant implementations

### Why Standards Matter

**Portability**: Write queries once, run on any GQL-compliant database
**Longevity**: Standards evolve through consensus, protecting long-term investments
**Interoperability**: Tools, libraries, and skills transfer across implementations
**No Vendor Lock-In**: Avoid proprietary language dependencies
**Quality**: Rigorously specified behavior reduces ambiguity

### Historical Context

GQL evolved from practical experience with graph query languages:

- **2000s**: Neo4j creates Cypher (proprietary)
- **2010s**: Apache TinkerPop develops Gremlin (procedural)
- **2016**: ISO begins GQL standardization process
- **2019**: First GQL working drafts
- **2024**: ISO/IEC 39075:2024 published

GQL incorporates best practices from Cypher, SPARQL, SQL, and other predecessors while addressing their limitations.

## Core Language Features

### Pattern Matching

GQL's most powerful feature is declarative pattern matching using visual graph patterns:

```gql
-- Match pattern: nodes and relationships
MATCH (p:Person)-[:KNOWS]->(friend:Person)
WHERE p.name = 'Alice'
RETURN friend.name;

-- Multi-hop patterns
MATCH (a:Person)-[:KNOWS*2..4]->(distant)
WHERE a.city = 'San Francisco'
RETURN distant.name, distant.city;

-- Complex patterns with multiple relationships
MATCH (author:Person)-[:WROTE]->(paper:Paper)-[:CITES]->(cited:Paper)
WHERE paper.year >= 2020
RETURN author.name, count(cited) AS citation_count
ORDER BY citation_count DESC;
```

### Path Queries

Standard path operations for finding routes through graphs:

```gql
-- Shortest path
MATCH path = SHORTEST (a:Person {name: 'Alice'})
                      -[:KNOWS*]->
                      (b:Person {name: 'Bob'})
RETURN path, length(path) AS hops;

-- All shortest paths
MATCH paths = ALL SHORTEST (a:City {name: 'NYC'})
                           -[:FLIGHT*]->
                           (b:City {name: 'LAX'})
RETURN paths,
       null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS total_cost;

-- K shortest paths
MATCH paths = K SHORTEST 5 (a:Location)-[:ROUTE*]->(b:Location)
WHERE a.id = $start AND b.id = $end
RETURN paths,
       null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS distance
ORDER BY distance;
```

### Data Manipulation

Standard CRUD operations:

```gql
-- INSERT: Create nodes and relationships
INSERT (p:Person {name: 'Alice', age: 30, city: 'SF'});
INSERT (a:Person {name: 'Alice'})-[:KNOWS {since: DATE '2020-01-15'}]->(b:Person {name: 'Bob'});

-- SET: Update properties
MATCH (p:Person {name: 'Alice'})
SET p.age = 31, p.last_updated = CURRENT_TIMESTAMP;

-- DELETE: Remove nodes or relationships
MATCH (p:Person {name: 'Alice'})-[r:KNOWS]->(b:Person {name: 'Bob'})
DELETE r;

MATCH (p:Person {name: 'Bob'})
DELETE p;
```

### Aggregations

Standard aggregate functions:

```gql
-- Basic aggregations
MATCH (p:Product)
RETURN
  count(p) AS total_products,
  avg(p.price) AS average_price,
  sum(p.stock) AS total_inventory,
  min(p.price) AS cheapest,
  max(p.price) AS most_expensive;

-- GROUP BY
MATCH (p:Product)
RETURN p.category, count(p) AS count, avg(p.price) AS avg_price
GROUP BY p.category
ORDER BY count DESC;

-- HAVING clause
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(u) AS buyers
WHERE buyers > 100
RETURN p.name, buyers
ORDER BY buyers DESC;
```

### Temporal Data Types

Native support for dates, times, and durations:

```gql
-- Temporal literals
INSERT (event:Event {
  name: 'Conference',
  start: TIMESTAMP '2024-06-15 09:00:00-07:00',
  end: TIMESTAMP '2024-06-15 17:00:00-07:00',
  duration: DURATION 'PT8H',
  date: DATE '2024-06-15',
  time: TIME '09:00:00'
});

-- Temporal operations
MATCH (e:Event)
WHERE e.start >= CURRENT_TIMESTAMP
  AND e.start <= CURRENT_TIMESTAMP + DURATION 'P30D'
RETURN e.name, e.start;

-- Extract temporal components
MATCH (s:Sale)
RETURN
  s.timestamp.year AS year,
  s.timestamp.month AS month,
  s.timestamp.day AS day
GROUP BY year, month, day;
```

### Type System

GQL defines a rich type system:

**Primitive Types**:

- `BOOLEAN`: true or false
- `INTEGER`: Whole numbers
- `FLOAT`: Floating-point numbers
- `STRING`: Text
- `BYTES`: Binary data

**Temporal Types**:

- `DATE`: Calendar dates (YYYY-MM-DD)
- `TIME`: Time of day with optional timezone
- `TIMESTAMP`: Point in time
- `DURATION`: Time intervals (ISO 8601 format)

**Structured Types**:

- `LIST<T>`: Ordered collection
- `MAP<K, V>`: Key-value mappings
- `RECORD`: Named fields

**Special Types**:

- `NULL`: Absence of value
- `PATH`: Graph path
- `NODE`: Graph node
- `RELATIONSHIP`: Graph relationship

```gql
-- Type examples
INSERT (p:Product {
  id: 'prod_123',                    -- STRING
  name: 'Laptop',                    -- STRING
  price: 1299.99,                    -- FLOAT
  stock: 47,                         -- INTEGER
  available: true,                   -- BOOLEAN
  released: DATE '2024-03-15',       -- DATE
  updated: CURRENT_TIMESTAMP,        -- TIMESTAMP
  tags: ['electronics', 'portable'], -- LIST<STRING>
  specs: {cpu: 'i9', ram: '32GB'}   -- MAP<STRING, STRING>
});
```

## Syntax and Semantics

### Query Structure

GQL queries consist of clauses that can be combined:

```gql
-- Linear composition
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name, p.city
ORDER BY p.age DESC
LIMIT 10;

-- Subqueries
MATCH (company:Company)
WHERE EXISTS {
  MATCH (company)<-[:WORKS_AT]-(emp:Employee)
  WHERE emp.salary > 150000
}
RETURN company.name;

-- CALL for procedures
CALL algo.pagerank.stream()
YIELD nodeId, score
MATCH (p:Person) WHERE id(p) = nodeId
RETURN p.name, score
ORDER BY score DESC
LIMIT 20;
```

### Expression Language

Rich expression support:

```gql
-- Arithmetic
MATCH (p:Product)
RETURN p.price * 1.08 AS price_with_tax,
       p.price * 0.8 AS discounted_price;

-- String operations
MATCH (p:Person)
WHERE p.email LIKE '%@example.com'
RETURN upper(p.name), lower(p.email);

-- Boolean logic
MATCH (p:Product)
WHERE (p.category = 'Electronics' AND p.price < 500)
   OR (p.category = 'Books' AND p.rating >= 4.5)
RETURN p.name;

-- NULL handling
MATCH (p:Person)
RETURN p.name, coalesce(p.email, 'no email') AS email;

-- List operations
MATCH (p:Person)
WHERE 'engineer' IN p.roles
RETURN p.name, size(p.roles) AS role_count;
```

### Pattern Constraints

Powerful WHERE clause constraints:

```gql
-- Property filters
MATCH (p:Person)
WHERE p.age >= 30 AND p.age <= 40
  AND p.city IN ['SF', 'NYC', 'Austin']
RETURN p.name;

-- Relationship filters
MATCH (a:Person)-[r:KNOWS]->(b:Person)
WHERE r.since >= DATE '2020-01-01'
  AND r.strength > 0.7
RETURN a.name, b.name;

-- Path constraints (filter on intermediate nodes)
MATCH path = (a:Person)-[:KNOWS*2..5 (r, n | n.active = true)]->(b:Person)
WHERE a.name = 'Alice'
RETURN path;

-- Existential subqueries
MATCH (p:Product)
WHERE EXISTS {
  MATCH (p)<-[:PURCHASED]-(u:User)
  WHERE u.premium = true
}
RETURN p.name;
```

## Transaction Model

### ACID Properties

GQL specifies full ACID transaction semantics:

```gql
-- Explicit transaction
BEGIN TRANSACTION;

INSERT (order:Order {id: 'o123', total: 99.99});
MATCH (customer:Customer {id: 'c456'})
INSERT (customer)-[:PLACED]->(order);

-- Atomic: all succeed or all fail
COMMIT;

-- Or rollback
ROLLBACK;
```

### Isolation Levels

Standard SQL isolation levels:

- READ UNCOMMITTED
- READ COMMITTED (default)
- REPEATABLE READ
- SERIALIZABLE

```gql
-- Set isolation level
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

BEGIN TRANSACTION;
-- Queries here run with SERIALIZABLE isolation
COMMIT;
```

### Savepoints

Partial rollback capability:

```gql
BEGIN TRANSACTION;

INSERT (u:User {name: 'Alice'});
SAVEPOINT sp1;

-- Risky operation
INSERT (u:User {email: 'invalid'});

-- Rollback to savepoint
ROLLBACK TO SAVEPOINT sp1;

-- Continue transaction
INSERT (u:User {name: 'Bob'});
COMMIT;
```

## Schema and Constraints

### Schema Definition

Optional schema definition for type safety:

```gql
-- Define node type
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: NOT NULL — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE PersonType AS {
  id STRING,
  name STRING,
  age INTEGER,
  email STRING
};

-- Define relationship type
CREATE RELATIONSHIP TYPE KNOWS (
  since DATE NOT NULL,
  strength FLOAT CHECK (strength >= 0 AND strength <= 1)
);
```

### Constraints

Data integrity enforcement:

```gql
-- Unique constraint
CREATE CONSTRAINT user_email_unique ON User(email) UNIQUE;

-- Existence constraint
CREATE CONSTRAINT user_name_required ON User REQUIRE name;

-- Check constraint
CREATE CONSTRAINT product_price_positive ON Product
CHECK (price > 0);

-- Composite unique constraint
CREATE CONSTRAINT person_name_dob_unique ON Person(name, date_of_birth) UNIQUE;
```

### Indexes

Performance optimization:

```gql
-- Single-column index
CREATE INDEX person_name ON Person(name);

-- Composite index
CREATE INDEX product_category_price ON Product(category, price);

-- Full-text index
CREATE INDEX product_search ON Product(name, description) USING fulltext;
```

## Conformance Levels

The GQL standard defines conformance requirements:

### Core GQL

Minimum required features:

- Pattern matching (MATCH)
- Basic CRUD (INSERT, SET, DELETE)
- WHERE filters
- RETURN projection
- Basic aggregations (COUNT, SUM, AVG, MIN, MAX)
- ORDER BY and LIMIT

### Full GQL

Complete specification including:

- Path queries (SHORTEST, ALL SHORTEST, K SHORTEST)
- Temporal types and operations
- Full text search
- Transactions and savepoints
- Schema definition
- Constraints and indexes

**Geode publishes a conformance profile**: ISO/IEC 39075:2024 compliance (see conformance profile)

## Geode's GQL Implementation

### Compliance

Geode maintains 100% GQL compliance:

- ✅ MATCH and OPTIONAL MATCH with bounded expansions
- ✅ WHERE, RETURN, ORDER BY
- ✅ LIMIT/OFFSET policies (US001)
- ✅ Set operations (UNION, INTERSECT, EXCEPT)
- ✅ Diagnostics aligned to the conformance profile

### Extensions

Geode adds enterprise features beyond the standard:

**Row-Level Security (RLS)**:

```gql
-- User.id must equal the caller's 'user_id' principal attribute
CALL geode.rls.add_attribute_policy('app', 'User', 'id', 'user_id');
```

**Advanced Aggregations**:

```gql
MATCH (p:Product)
RETURN collect(p.price) /* percentile_cont/_disc parse but are never computed; sort client-side */ AS p95_price;
```

**Parallel Query Execution**:
Automatic parallelization for analytical queries

**QUIC Transport**:
Modern HTTP/3 protocol for low-latency communication

### Compatibility

Geode's GQL queries are portable to other GQL-compliant databases:

```gql
-- This query works on ANY GQL-compliant database
MATCH (p:Person)-[:KNOWS*2..3]->(friend)
WHERE p.city = 'San Francisco'
RETURN friend.name, friend.city
ORDER BY friend.name
LIMIT 20;
```

## Comparison with Other Languages

### GQL vs. Cypher

Cypher (Neo4j's proprietary language) influenced GQL but has differences:

| Feature | GQL | Cypher |
|---------|-----|--------|
| Status | ISO standard | Proprietary |
| MATCH syntax | Very similar | Similar |
| Path queries | SHORTEST standardized | Implementation-specific |
| Type system | Formally specified | Less formal |
| Portability | Cross-database | Neo4j only |

**Migration**: Most Cypher queries work in GQL with minimal changes.

### GQL vs. Gremlin

Gremlin (Apache TinkerPop) uses procedural traversal syntax:

```groovy
// Gremlin (procedural)
g.V().hasLabel('Person')
  .has('name', 'Alice')
  .out('KNOWS')
  .out('KNOWS')
  .values('name')
```

```gql
-- GQL (declarative)
MATCH (a:Person {name: 'Alice'})-[:KNOWS]->(f)-[:KNOWS]->(fof)
RETURN fof.name
```

GQL's declarative approach is generally more intuitive and optimizable.

### GQL vs. SPARQL

SPARQL (W3C standard for RDF) targets semantic web:

```sparql
# SPARQL (for RDF triples)
SELECT ?friendName
WHERE {
  ?alice rdf:type :Person .
  ?alice :name "Alice" .
  ?alice :knows ?friend .
  ?friend :name ?friendName .
}
```

```gql
-- GQL (for property graphs)
MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend)
RETURN friend.name
```

GQL is designed for property graphs; SPARQL for RDF triple stores.

## Practical Examples

### Social Network

```gql
-- Friend recommendations
MATCH (me:User {id: $user_id})-[:FRIEND]->(f1)-[:FRIEND]->(f2)
WHERE f2 <> me
  AND NOT EXISTS { MATCH (me)-[:FRIEND]->(f2) }
RETURN f2.name, count(f1) AS mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10;
```

### E-Commerce

```gql
-- Product recommendations
MATCH (me:User {id: $user_id})-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(similar:User)
MATCH (similar)-[:PURCHASED]->(rec:Product)
WHERE NOT EXISTS { MATCH (me)-[:PURCHASED]->(rec) }
RETURN rec.name, count(similar) AS score
ORDER BY score DESC
LIMIT 20;
```

### Fraud Detection

```gql
-- Circular transaction patterns
MATCH path = (a:Account)-[:TRANSFER*3..5]->(a)
WHERE all(r IN relationships(path) WHERE r.amount > 10000)
RETURN path,
  null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS total;
```

### Knowledge Graph

```gql
-- Concept hierarchy traversal
MATCH path = (specific:Concept)-[:IS_A*]->(general:Concept {name: 'Science'})
RETURN specific.name, length(path) AS levels_up
ORDER BY levels_up;
```

## Future of GQL

The GQL standard will continue evolving:

**Expected in future versions**:

- Graph schema definition language (extended)
- Graph algorithms (PageRank, community detection)
- Streaming query results
- Time-travel queries
- Multi-graph queries
- Federated graph queries

**Geode's commitment**: Track and implement new GQL features as standard evolves.

## Resources

### Official Specification

- ISO/IEC 39075:2024 document (available from ISO)
- GQL working group: <https://www.gqlstandards.org>
- Public drafts and discussions

### Learning Resources

- Geode GQL tutorial
- GQL reference documentation
- Interactive query examples
- Comparison guides (Cypher to GQL, etc.)

### Standards Bodies

- ISO/IEC JTC 1/SC 32 (Data management and interchange)
- ANSI INCITS DM32 (Database committee)
- GQL community forums

## Conclusion

The ISO/IEC 39075:2024 GQL specification represents a landmark achievement in database standardization, providing a vendor-neutral, rigorously defined language for graph data querying. Geode's conformance profile alignment keeps queries portable, future-proof, and based on international consensus rather than proprietary technology.

By learning GQL through Geode, you're investing in a standardized skill set that will remain relevant as the graph database ecosystem matures and more vendors adopt the specification.

Explore the documentation below for detailed GQL syntax reference, examples, and best practices for writing efficient, standard-compliant graph queries.
