---
title: "ISO/IEC 39075:2024 Standard"
description: "Complete guide to ISO/IEC 39075:2024 GQL standard: specification overview, features, design principles, and implementation in Geode graph database."
keywords:
  - ISO/IEC 39075:2024
  - GQL standard
  - ISO standard
  - Graph Query Language
  - ISO specification
  - standards compliance
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/iso-standard/"
    noindex: false
---

ISO/IEC 39075:2024 is the international standard for GQL (Graph Query Language), defining a vendor-neutral, declarative query language for property graph databases. Geode implements this standard with 100% compliance.

## Standard Overview

**Full Title**: ISO/IEC 39075:2024 - Information technology — Database languages — GQL

**Published**: April 2024

**Scope**: Defines syntax, semantics, and behavior of GQL for querying and manipulating property graphs

**Status**: Active International Standard

**Working Group**: ISO/IEC JTC 1/SC 32/WG 3 (Database Languages)

**Related Standards**:
- ISO/IEC 9075 (SQL) - Aligns with SQL patterns
- ISO/IEC 13249 (SQL Multimedia) - Spatial types
- ISO/IEC 19075 (SQL Technical Reports) - Extensions

## Design Principles

### 1. Declarative Syntax

GQL follows SQL's declarative approach - describe what you want, not how to get it:

```gql
// Declarative: what to find
MATCH (u:User)-[:FRIEND]->(f:User)
WHERE u.name = 'Alice'
RETURN f.name

// Not imperative: how to find it
// (Query optimizer determines execution plan)
```

### 2. Pattern Matching

Visual ASCII art syntax for intuitive graph patterns:

```gql
// Pattern syntax mirrors graph structure
(node1)-[relationship]->(node2)

// Example
(alice:Person)-[:KNOWS]->(bob:Person)-[:LIVES_IN]->(city:City)
```

### 3. Composability

Build complex queries from simple building blocks:

```gql
// Simple patterns compose into complex queries
MATCH (u:User)
WHERE u.age > 25
WITH u, SIZE((u)-[:FRIEND]->()) AS friends
WHERE friends > 10
RETURN u.name, friends
ORDER BY friends DESC
LIMIT 10
```

### 4. Property Graph Model

Based on labeled property graph model:

- **Nodes**: Entities with labels and properties
- **Relationships**: Directed edges with type and properties
- **Properties**: Key-value pairs on nodes and relationships
- **Labels**: Categories for nodes
- **Types**: Categories for relationships

## Standard Structure

### Part 1: Framework (Foundation)

Defines overall architecture, terminology, and concepts.

**Key Sections**:
- §1: Scope and normative references
- §2: Terms and definitions
- §3: Symbols and conventions
- §4: Concepts (property graph model)

### Part 2: Foundation (Data Language)

Core GQL language specification.

**Key Sections**:
- §5: Lexical elements (keywords, identifiers, literals)
- §6: Data types (scalar, temporal, collection)
- §7: Graph patterns (nodes, relationships, paths)
- §8: Data manipulation (CREATE, DELETE, SET, MERGE)
- §9: Query expressions (MATCH, WHERE, RETURN, WITH)
- §10: Operators (comparison, logical, arithmetic)
- §11: Functions (aggregation, string, mathematical, temporal)
- §12: Schema (indexes, constraints)
- §13: Transactions (BEGIN, COMMIT, ROLLBACK)

### Part 3: Advanced Features

Extended functionality beyond core language.

**Key Sections**:
- §14: Subqueries (EXISTS, COUNT)
- §15: CASE expressions
- §16: List comprehensions
- §17: Pattern comprehensions
- §18: User-defined functions (UDFs)
- §19: Stored procedures

## Core Language Features

### Pattern Syntax (§7)

```gql
// Node pattern
(variable:Label1:Label2 {prop1: value1, prop2: value2})

// Relationship pattern
-[variable:TYPE1|TYPE2 {prop: value}]->

// Path pattern
path = (a)-[:KNOWS*1..3]-(b)

// Shortest path
path = SHORTEST (a)-[:KNOWS*]-(b)
```

### Data Manipulation (§8)

```gql
// CREATE
CREATE (n:Label {property: value})

// DELETE
DELETE n
DETACH DELETE n

// SET
SET n.property = value
SET n:Label

// REMOVE
REMOVE n.property
REMOVE n:Label

// MERGE
MERGE (n:Label {key: value})
ON CREATE SET n.created = NOW()
ON MATCH SET n.updated = NOW()
```

### Query Clauses (§9)

```gql
// MATCH - pattern matching
MATCH (n:Label)

// OPTIONAL MATCH - optional patterns
OPTIONAL MATCH (n)-[:REL]->(m)

// WHERE - filtering
WHERE condition

// WITH - pipeline processing
WITH expression AS alias

// RETURN - result projection
RETURN expression AS alias

// ORDER BY - sorting
ORDER BY expression ASC|DESC

// LIMIT/OFFSET - pagination
LIMIT count OFFSET skip

// UNION - combine results
query1 UNION query2
```

## Data Type System (§6)

### Scalar Types

- **Boolean**: `true`, `false`, `NULL`
- **Integer**: 64-bit signed integers
- **Float**: 64-bit IEEE 754 floating point
- **Decimal**: Arbitrary precision decimal
- **String**: Unicode text (UTF-8)
- **Bytes**: Raw binary data

### Temporal Types

- **Date**: Calendar date (no time)
- **Time**: Time of day (no date)
- **DateTime**: Combined date and time with timezone
- **Duration**: Time interval (ISO 8601)

### Collection Types

- **List**: Ordered sequence `[1, 2, 3]`
- **Map**: Key-value pairs `{key: value}`
- **Path**: Graph traversal path

### Graph Types

- **Node**: Graph node reference
- **Relationship**: Graph edge reference

## Operators (§10)

### Comparison

`=`, `<>`, `!=`, `<`, `>`, `<=`, `>=`, `IS NULL`, `IS NOT NULL`, `IN`, `BETWEEN`

### Logical

`AND`, `OR`, `NOT`, `XOR`

### Arithmetic

`+`, `-`, `*`, `/`, `%`, `^`

### String

`STARTS WITH`, `ENDS WITH`, `CONTAINS`, `=~` (regex)

### List

`IN`, `+` (concatenation), `[index]`, `[start..end]`

## Functions (§11)

### Aggregation

`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `COLLECT`, `STRING_AGG`

### String

`UPPER`, `LOWER`, `TRIM`, `SUBSTRING`, `LENGTH`, `CONCAT`, `REPLACE`, `SPLIT`

### Mathematical

`ABS`, `CEIL`, `FLOOR`, `ROUND`, `SQRT`, `POWER`, `SIN`, `COS`, `TAN`, `LOG`, `EXP`, `RAND`

### Temporal

`NOW`, `CURRENT_DATE`, `CURRENT_TIME`, `CURRENT_TIMESTAMP`, `DATE`, `DATETIME`, `TIME`, `DURATION`

### List

`SIZE`, `HEAD`, `LAST`, `TAIL`, `REVERSE`, `RANGE`

### Path

`LENGTH`, `NODES`, `RELATIONSHIPS`

### Type Conversion

`TOSTRING`, `TOINTEGER`, `TOFLOAT`, `TOBOOLEAN`

## Schema and Constraints (§12)

### Indexes

```gql
CREATE INDEX FOR (n:Label) ON (n.property)
CREATE INDEX index_name FOR (n:Label) ON (n.prop1, n.prop2)
DROP INDEX index_name
SHOW INDEXES
```

### Constraints

```gql
CREATE CONSTRAINT ON (n:Label) ASSERT n.property IS UNIQUE
CREATE CONSTRAINT ON (n:Label) ASSERT EXISTS(n.property)
DROP CONSTRAINT constraint_name
SHOW CONSTRAINTS
```

## Transaction Model (§13)

### ACID Properties

- **Atomicity**: All-or-nothing execution
- **Consistency**: Valid state transitions
- **Isolation**: Concurrent transaction isolation
- **Durability**: Committed changes persist

### Transaction Control

```gql
BEGIN TRANSACTION
  // statements
COMMIT

// Or
ROLLBACK

// Savepoints
SAVEPOINT savepoint_name
ROLLBACK TO SAVEPOINT savepoint_name
```

### Isolation Levels

- **SERIALIZABLE**: Strongest isolation (default)
- **READ COMMITTED**: Read committed data only
- **READ UNCOMMITTED**: Read uncommitted data

## Error Handling

### Error Codes

ISO/IEC 39075:2024 aligns with SQL error codes:

| Class | Description |
|-------|-------------|
| 00xxx | Success |
| 01xxx | Warning |
| 02xxx | No data |
| 21xxx | Cardinality violation |
| 22xxx | Data exception |
| 23xxx | Constraint violation |
| 42xxx | Syntax error |
| 40xxx | Transaction rollback |

### Error Format

```json
{
  "code": "42000",
  "message": "Syntax error: unexpected token",
  "position": 12,
  "sqlstate": "42000"
}
```

## Standard Conformance

### Conformance Levels

1. **Core**: Mandatory features all implementations must support
2. **Enhanced**: Optional features for extended functionality
3. **Full**: Core + all Enhanced features

Geode implements **Full** conformance.

### Conformance Claims

Implementations must document:
- Which features are supported
- Test results from ISO test suite
- Deviations or extensions

## Extensions and Future Work

### Planned Extensions

ISO/IEC JTC 1/SC 32/WG 3 is considering:

- Temporal graph queries (time-traveling graphs)
- Recursive common table expressions (CTEs)
- Graph analytics functions
- Streaming query extensions
- Multi-graph operations

### Vendor Extensions

While compliant, implementations may add:
- Additional index types (vector, full-text)
- Custom functions
- Performance optimizations
- Platform-specific features

## Comparison to Other Standards

### vs. SQL (ISO/IEC 9075)

- **Similarity**: Declarative syntax, ACID transactions, type system
- **Difference**: Graph patterns vs. table joins
- **Complementary**: GQL for graphs, SQL for tables

### vs. SPARQL (W3C)

- **Similarity**: Graph query languages
- **Difference**: SPARQL for RDF graphs, GQL for property graphs
- **Model**: SPARQL (subject-predicate-object), GQL (labeled property graphs)

### vs. Cypher (openCypher)

- **Relationship**: GQL builds on Cypher concepts
- **Standardization**: GQL is ISO standard, Cypher is community specification
- **Evolution**: GQL formalizes and extends Cypher patterns

## Implementation in Geode

Geode provides:
- **100% Compliance**: All 70 ISO tests passing
- **Full Feature Support**: Core + Enhanced + Full
- **Standards Documentation**: ISO section references throughout
- **Test Verification**: Continuous compliance testing

## Related Topics

- **GQL Compliance**: Geode's conformance details
- **GQL Reference**: Complete language documentation
- **GQL Syntax**: Syntax guide
- **ISO GQL**: Implementation notes

## Further Reading

- [GQL Compliance](/tags/gql-compliance/) - Conformance details
- [ISO GQL Implementation](/tags/iso-gql/) - Implementation guide
- [GQL Reference](/tags/gql-reference/) - Language reference
- [GQL Syntax](/tags/gql-syntax/) - Syntax guide
- [Official ISO Standard](https://www.iso.org/standard/76120.html) - Purchase from ISO

ISO/IEC 39075:2024 provides a solid, vendor-neutral foundation for graph database applications, ensuring portability, interoperability, and longevity of graph data solutions.
