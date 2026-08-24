---
title: "GQL Specification Reference"
description: "Complete ISO/IEC 39075:2024 Graph Query Language specification reference with Geode's implementation status, conformance profile, and feature mapping"
summary: "Comprehensive GQL specification reference documenting ISO/IEC 39075:2024 conformance, profile scope, and Geode's published conformance profile."
slug: "specification"
url: "/docs/gql-reference/specification/"
date: 2026-01-28
lastmod: 2026-01-28
draft: false
weight: 10
keywords: ["GQL specification", "ISO 39075", "GQL standard", "graph query language", "GQL compliance", "conformance profile"]
tags: ["reference", "gql", "specification", "iso-standard"]
categories: ["GQL Reference"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/gql-reference/specification/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# GQL Specification Reference

Geode implements the **ISO/IEC 39075:2024 Graph Query Language (GQL)** 100% compliance. This reference documents the specification and links to Geode's current conformance profile and implementation notes.

## Standard Overview

### ISO/IEC 39075:2024

The Graph Query Language (GQL) is an international standard for querying property graph databases. It provides:

- **Declarative graph pattern matching**
- **Standard data types and operators**
- **Transaction semantics**
- **Error handling with standardized codes**
- **Extensibility for implementations**

### Document Structure

The GQL standard comprises multiple parts:

| Part | Title | Status in Geode |
|------|-------|-----------------|
| Part 1 | Framework | Implemented |
| Part 2 | Foundation | Implemented |
| Part 3 | GQL Query Language | Implemented |
| Part 4 | Bindings | Implemented |

---

## Conformance Profile

### Geode Conformance Level

Geode publishes a conformance profile for ISO/IEC 39075:2024 compliance. The profile documents implementation-defined behavior and focuses on deterministic ordering, pagination, and diagnostics.

**Profile highlights (non-exhaustive):**

- `MATCH` / `OPTIONAL MATCH` with bounded path expansions
- `WHERE`, `RETURN`, `ORDER BY`
- `LIMIT` / `OFFSET` (unordered pagination rejected per US001)
- Set operations: `UNION`, `INTERSECT`, `EXCEPT`
- Data modification statements (`CREATE`, `INSERT`, `UPDATE`, `DELETE`, `MERGE`)
- Schema and type system behaviors (labels, property types, constraints, indexes)
- Transactions, functions, and standardized error codes

See the [conformance profile](/docs/gql/conformance-profile/) for authoritative scope, diagnostics, and implementation-defined behaviors.

---

## Syntax Reference

### Query Structure

```bnf
<gql-query> ::=
    [ <graph-specification> ]
    <query-expression>

<query-expression> ::=
    <simple-query>
  | <composite-query>

<simple-query> ::=
    <match-statement>
  | <call-statement>
  | <return-statement>

<composite-query> ::=
    <simple-query> <set-operator> <simple-query>
```

### Pattern Syntax

```bnf
<pattern> ::=
    <node-pattern>
  | <path-pattern>

<node-pattern> ::=
    '(' [ <variable> ] [ <label-expression> ] [ <property-specification> ] ')'

<label-expression> ::=
    ':' <label-name> [ <label-expression> ]

<property-specification> ::=
    '{' <property-list> '}'

<property-list> ::=
    <property-setting> [ ',' <property-setting> ]*

<property-setting> ::=
    <property-name> ':' <expression>
```

### Relationship Pattern

```bnf
<relationship-pattern> ::=
    <left-arrow>? '-' [ <relationship-detail> ] '-' <right-arrow>?

<relationship-detail> ::=
    '[' [ <variable> ] [ <type-expression> ] [ <length-specification> ] [ <property-specification> ] ']'

<type-expression> ::=
    ':' <relationship-type>
  | ':' <relationship-type> '|' <type-expression>

<length-specification> ::=
    '*' [ <range> ]

<range> ::=
    <integer> [ '..' [ <integer> ] ]
  | '..' <integer>
```

---

## Data Types (ISO Mapping)

### Core Types

| ISO Type | GQL Syntax | Geode Type | Notes |
|----------|------------|------------|-------|
| Boolean | `BOOLEAN` | BOOLEAN | true/false |
| Signed Integer | `INTEGER` | INT64 | 64-bit default |
| Floating Point | `REAL` | FLOAT64 | IEEE 754 double |
| Character String | `STRING` | STRING | UTF-8 |
| Byte String | `BYTES` | BYTES | Binary data |

### Extended Types

| ISO Type | GQL Syntax | Geode Type | Notes |
|----------|------------|------------|-------|
| Date | `DATE` | DATE | ISO 8601 |
| Time | `TIME` | TIME | With/without TZ |
| Timestamp | `TIMESTAMP` | TIMESTAMP | ISO 8601 |
| Duration | `DURATION` | DURATION | ISO 8601 |
| List | `LIST<T>` | LIST | Ordered collection |
| Map | `MAP<K,V>` | MAP | Key-value pairs |

### Implementation-Defined Types

Geode extends the standard with additional types:

| Geode Type | Category | Standard Mapping |
|------------|----------|------------------|
| VECTOR_F32 | Numeric | Implementation-defined |
| LATLON | Geographic | Implementation-defined |
| JSONB | Structured | STRING with semantics |
| UUID | Identity | STRING with semantics |
| IPADDR | Network | STRING with semantics |

---

## Operators (ISO Mapping)

### Comparison Operators

| ISO Operator | Symbol | Geode Support |
|--------------|--------|---------------|
| Equals | `=` | Full |
| Not Equals | `<>` | Full |
| Less Than | `<` | Full |
| Greater Than | `>` | Full |
| Less Than or Equal | `<=` | Full |
| Greater Than or Equal | `>=` | Full |
| Is Null | `IS NULL` | Full |
| Is Not Null | `IS NOT NULL` | Full |

### Logical Operators

| ISO Operator | Symbol | Geode Support |
|--------------|--------|---------------|
| And | `AND` | Full |
| Or | `OR` | Full |
| Not | `NOT` | Full |
| Exclusive Or | `XOR` | Full |

### Arithmetic Operators

| ISO Operator | Symbol | Geode Support |
|--------------|--------|---------------|
| Addition | `+` | Full |
| Subtraction | `-` | Full |
| Multiplication | `*` | Full |
| Division | `/` | Full |
| Modulo | `%` | Full |
| Unary Minus | `-` | Full |
| Unary Plus | `+` | Full |

### String Operators

| ISO Operator | Syntax | Geode Support |
|--------------|--------|---------------|
| Concatenation | `\|\|` | Full |
| Starts With | `STARTS WITH` | Full |
| Ends With | `ENDS WITH` | Full |
| Contains | `CONTAINS` | Full |
| Like | `LIKE` | Full |
| Regex Match | `=~` | Full |

### Collection Operators

| ISO Operator | Syntax | Geode Support |
|--------------|--------|---------------|
| In | `IN` | Full |
| Index Access | `[i]` | Full |
| Range Access | `[i..j]` | Full |

---

## Functions (ISO Mapping)

### Aggregate Functions

| ISO Function | Geode Support | Notes |
|--------------|---------------|-------|
| `COUNT(*)` | Full | Row count |
| `COUNT(expr)` | Full | Non-null count |
| `COUNT(DISTINCT expr)` | Full | Distinct count |
| `SUM(expr)` | Full | Numeric sum |
| `AVG(expr)` | Full | Average |
| `MIN(expr)` | Full | Minimum |
| `MAX(expr)` | Full | Maximum |
| `COLLECT(expr)` | Full | Collect to list |

### Scalar Functions

| ISO Function | Geode Support | Category |
|--------------|---------------|----------|
| `abs(x)` | Full | Numeric |
| `ceil(x)` | Full | Numeric |
| `floor(x)` | Full | Numeric |
| `round(x)` | Full | Numeric |
| `sign(x)` | Full | Numeric |
| `sqrt(x)` | Full | Numeric |
| `lower(s)` | Full | String |
| `upper(s)` | Full | String |
| `trim(s)` | Full | String |
| `ltrim(s)` | Full | String |
| `rtrim(s)` | Full | String |
| `substring(s, start, len)` | Full | String |
| `replace(s, from, to)` | Full | String |
| `length(s)` | Full | String/List |
| `size(list)` | Full | List |
| `head(list)` | Full | List |
| `tail(list)` | Full | List |
| `last(list)` | Full | List |
| `keys(map)` | Full | Map |
| `values(map)` | Full | Map |

### Path Functions

| ISO Function | Geode Support | Description |
|--------------|---------------|-------------|
| `nodes(path)` | Full | Nodes in path |
| `relationships(path)` | Full | Relationships in path |
| `length(path)` | Full | Path length |

### Type Functions

| ISO Function | Geode Support | Description |
|--------------|---------------|-------------|
| `type(r)` | Full | Relationship type |
| `labels(n)` | Full | Node labels |
| `id(n)` | Full | Internal ID |
| `properties(n)` | Full | Property map |

---

## Error Handling

### ISO Status Codes

Geode implements standard GQL status codes:

| Code | Category | Description |
|------|----------|-------------|
| 00000 | Success | Successful completion |
| 01xxx | Warning | Warning condition |
| 02xxx | No Data | Query returned empty |
| 22xxx | Data Exception | Data error |
| 23xxx | Integrity Violation | Constraint violation |
| 42xxx | Syntax/Access | Syntax error or access violation |

### Error Response Format

```json
{
  "type": "ERROR",
  "code": "42000",
  "sqlstate": "42000",
  "message": "Syntax error at position 15",
  "detail": "Unexpected token 'METCH', did you mean 'MATCH'?",
  "position": {
    "line": 1,
    "column": 15
  }
}
```

---

## Transaction Semantics

### Isolation Levels

| Level | ISO Section | Geode Support |
|-------|-------------|---------------|
| READ UNCOMMITTED | 9.5.1 | Not supported (minimum is READ COMMITTED) |
| READ COMMITTED | 9.5.2 | Full |
| REPEATABLE READ | 9.5.3 | Full |
| SERIALIZABLE | 9.5.4 | Full (default) |

### ACID Guarantees

| Property | Implementation |
|----------|----------------|
| **Atomicity** | All-or-nothing via WAL |
| **Consistency** | Constraint enforcement |
| **Isolation** | MVCC with snapshot isolation |
| **Durability** | WAL + checkpointing |

---

## Implementation-Defined Behavior

The ISO standard allows implementations to define certain behaviors:

### Collation and Ordering

```gql
-- Geode's default collation is Unicode binary
MATCH (p:Person)
RETURN p.name
ORDER BY p.name;  -- Unicode code point order

-- Case-insensitive comparison
WHERE lower(p.name) = lower($search)
```

### NULL Ordering

```gql
-- NULLs sort last by default (configurable)
ORDER BY p.age ASC NULLS LAST
ORDER BY p.age DESC NULLS FIRST
```

### Identifier Length

| Element | Maximum Length |
|---------|----------------|
| Label name | 65,535 characters |
| Property name | 65,535 characters |
| Variable name | 65,535 characters |
| Index name | 65,535 characters |

### Numeric Precision

| Type | Precision |
|------|-----------|
| INTEGER | 64-bit signed |
| FLOAT | IEEE 754 double (64-bit) |
| DECIMAL | Arbitrary precision |

---

## Conformance Testing

### Running Conformance Tests

```bash
cd geode
make test-gql-conformance
```

### Test Categories

1. **Lexer Tests**: Token recognition
2. **Parser Tests**: Syntax validation
3. **Semantic Tests**: Type checking, resolution
4. **Execution Tests**: Correct results
5. **Error Tests**: Proper error handling

### Test Results Summary

Conformance tests are tracked against the published ISO/IEC 39075:2024 profile. For current status, diagnostics, and implementation-defined behaviors, see the conformance profile and the CI evidence linked there.

---

## Extensions Beyond Standard

Geode provides extensions not in the ISO standard:

### Full-text Search

```gql
-- BM25 full-text search (Geode extension)
MATCH (d:Document)
WHERE fulltext_match(d.content, 'graph database')
RETURN d.title, bm25_score(d.content, 'graph database') AS score
ORDER BY score DESC;
```

### Vector Similarity

```gql
-- Vector similarity search (Geode extension)
MATCH (d:Document)
RETURN d.title, distance(d.embedding, $query_vector, 'cosine') AS distance
ORDER BY distance
LIMIT 10;
```

### Geographic Functions

```gql
-- Geographic queries (Geode extension)
MATCH (s:Store)
WHERE geo_distance(s.location, $user_location) < 5000
RETURN s.name, geo_distance(s.location, $user_location) AS meters;
```

### Query Hints

```gql
-- Index hints (Geode extension)
MATCH (p:Person)
USING INDEX p:Person(email)
WHERE p.email = $email
RETURN p;
```

---

## Reserved Words

GQL reserved words that cannot be used as unquoted identifiers:

```
ALL, AND, ANY, AS, ASC, ASCENDING, BY, CALL, CASE, COMMIT, CONSTRAINT,
CONTAINS, COUNT, CREATE, DELETE, DESC, DESCENDING, DETACH, DISTINCT,
DROP, ELSE, END, ENDS, EXISTS, FALSE, FOR, FROM, GRAPH, GROUP, HAVING,
IN, INDEX, IS, LIMIT, MATCH, MERGE, NOT, NULL, ON, OPTIONAL, OR, ORDER,
REMOVE, RETURN, ROLLBACK, SESSION, SET, SKIP, START, STARTS, THEN, TO,
TRUE, UNION, UNIQUE, UNWIND, USE, USING, WHEN, WHERE, WITH, XOR, YIELD
```

**Escaping reserved words:**

```gql
-- Use backticks for reserved words as identifiers
MATCH (n:`ORDER`)
RETURN n.`LIMIT`;
```

---

## Related Documentation

- [GQL Guide](/docs/gql/guide/) - Query language tutorial
- [Conformance Profile](/docs/gql/conformance-profile/) - Detailed conformance
- [Functions Reference](/docs/gql-reference/functions/) - All functions
- [Operators Reference](/docs/reference/operators/) - All operators
- [Data Types Reference](/docs/reference/types/) - Type system

---

**Last Updated:** January 28, 2026
**Geode Version:** **GEODE_TAG**+
**ISO Standard:** ISO/IEC 39075:2024
**Conformance Profile:** ISO/IEC 39075:2024 compliance (see conformance profile)
