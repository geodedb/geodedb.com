---
title: "Graph Query Language (GQL) Guide"
description: "Learn GQL in Geode with executable examples: MATCH patterns, variable-length paths, transactions, functions, and standards-compliance notes"
weight: 10
tags:
  - gql
  - iso-gql
  - gql-compliance
  - tutorial
  - match
  - transactions
categories:
  - gql
  - tutorials
keywords:
  - GQL tutorial
  - ISO 39075
  - MATCH
  - property graph queries
  - EXPLAIN
  - PROFILE
---

<!-- CANARY: REQ=REQ-GQL-001; FEATURE="BasicQuery"; ASPECT=Testing; STATUS=TESTED; OWNER=test; UPDATED=2025-10-02 -->

# Graph Query Language (GQL) Guide

Learn Geode's implementation of the ISO/IEC 39075:2024 Graph Query Language (GQL) standard with executable examples.

## What GQL is in Geode

Geode implements **100% ISO/IEC 39075:2024 GQL compliance** (70/70 official conformance tests passing):

- Complete pattern matching syntax
- Full aggregation and grouping support
- Set operations (UNION, INTERSECT, EXCEPT)
- Variable-length path patterns
- Subqueries and chained queries
- Transaction management
- Deterministic ordering and pagination

**Standards vs Extensions**: This guide clearly marks:
- ✅ **Standard**: ISO/IEC 39075:2024 compliant
- 🔧 **Extension**: Geode-specific feature
- 📋 **Planned**: Not yet supported

## Core Query Flow

The fundamental GQL query structure:

```gql
MATCH <pattern>
WHERE <predicate>
RETURN <projection>
ORDER BY <expression>
LIMIT <count>
```

### Example: Basic Pattern Matching

```gql
-- Match all Person nodes
MATCH (p:Person)
RETURN p.name, p.age;

-- Match with predicate
MATCH (p:Person)
WHERE p.age > 25
RETURN p.name, p.age;

-- Match relationship
MATCH (p:Person)-[k:KNOWS]->(friend:Person)
RETURN p.name AS person, friend.name AS friend_name;
```

### Example: Multiple Patterns

```gql
-- Match multiple patterns with comma separation
MATCH
  (a:Person {name: "Alice"}),
  (b:Person {name: "Bob"}),
  (a)-[r:KNOWS]->(b)
RETURN r.since;

-- Alternative: chain MATCH clauses
MATCH (a:Person {name: "Alice"})
MATCH (b:Person {name: "Bob"})
MATCH (a)-[r:KNOWS]->(b)
RETURN r.since;
```

## Writing Data

### CREATE - Insert Nodes and Relationships

```gql
-- Create single node (✅ Standard)
CREATE (:Person {name: "Alice", age: 30});

-- Create multiple nodes
CREATE
  (:Person {name: "Bob", age: 25}),
  (:Person {name: "Charlie", age: 35});

-- Create node and relationship in one statement
CREATE (a:Person {name: "Alice"})-[:KNOWS {since: 2020}]->(b:Person {name: "Bob"});

-- Create relationship between existing nodes
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS {since: 2020}]->(b);
```

### SET - Update Properties

```gql
-- Set property (✅ Standard)
MATCH (p:Person {name: "Alice"})
SET p.age = 31;

-- Set multiple properties
MATCH (p:Person {name: "Alice"})
SET p.age = 31, p.city = "NYC";

-- Add label
MATCH (p:Person {name: "Alice"})
SET p:Employee;
```

### DELETE - Remove Nodes and Relationships

```gql
-- Delete relationship (✅ Standard)
MATCH (a:Person)-[k:KNOWS]->(b:Person)
WHERE a.name = "Alice" AND b.name = "Bob"
DELETE k;

-- Delete node (fails if relationships exist)
MATCH (p:Person {name: "Charlie"})
DELETE p;

-- DETACH DELETE - remove node and all its relationships
MATCH (p:Person {name: "Charlie"})
DETACH DELETE p;
```

### MERGE - Upsert Pattern

```gql
-- Create if not exists, match if exists (✅ Standard)
MERGE (p:Person {name: "Alice"})
ON CREATE SET p.created_at = timestamp()
ON MATCH SET p.last_seen = timestamp()
RETURN p;
```

## Paths and Pattern Matching

### Variable-Length Patterns

**✅ Standard**: GQL supports variable-length path patterns with `*min..max` syntax.

```gql
-- Friends of friends (1 to 2 hops)
MATCH (p:Person {name: "Alice"})-[:KNOWS*1..2]->(friend)
RETURN DISTINCT friend.name;

-- All reachable via KNOWS (unbounded)
MATCH (p:Person {name: "Alice"})-[:KNOWS*]->(friend)
RETURN friend.name;

-- Exactly 3 hops
MATCH (p:Person {name: "Alice"})-[:KNOWS*3]->(friend)
RETURN friend.name;
```

### Path Helper Functions

**✅ Standard** path functions (from `API_REFERENCE.md`):

| Function | Description | Example |
|----------|-------------|---------|
| `length(path)` | Number of edges in path | `RETURN length(p)` |
| `nodes(path)` | Array of nodes in path | `RETURN nodes(p)` |
| `relationships(path)` | Array of edges in path | `RETURN relationships(p)` |

**Example**:

```gql
-- Find paths and analyze them
MATCH path = (a:Person {name: "Alice"})-[:KNOWS*1..3]->(b:Person)
WHERE b.name = "Charlie"
RETURN
  length(path) AS hops,
  [n IN nodes(path) | n.name] AS names,
  path;
```

### Deterministic Ordering and Pagination

**🔧 Extension**: Geode enforces deterministic ordering for pagination (from `match_tutorial.md`).

**Policy**: When using `LIMIT` or `OFFSET` without `ORDER BY`, Geode applies an implicit stable ordering based on internal node/edge IDs to ensure consistent pagination results.

```gql
-- Explicit ordering (recommended)
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY p.age DESC, p.name ASC
LIMIT 10;

-- Pagination with offset
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY p.age DESC
LIMIT 10 OFFSET 20;

-- Implicit ordering (Geode applies stable order)
MATCH (p:Person)
RETURN p.name
LIMIT 10;  -- Geode ensures same 10 nodes each time
```

## Aggregations and Grouping

**✅ Standard**: Full aggregation support

```gql
-- Count nodes
MATCH (p:Person)
RETURN COUNT(p) AS total_people;

-- Group by and aggregate
MATCH (p:Person)
RETURN p.city, COUNT(p) AS count, AVG(p.age) AS avg_age
GROUP BY p.city;

-- Multiple aggregates
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN
  p.name,
  COUNT(friend) AS friend_count,
  AVG(friend.age) AS avg_friend_age,
  MIN(friend.age) AS youngest_friend,
  MAX(friend.age) AS oldest_friend;
```

**Supported aggregates** (from `API_REFERENCE_GENERATED.md`):
- `COUNT()` - Count rows or non-null values
- `SUM()` - Sum numeric values
- `AVG()` - Average numeric values
- `MIN()` - Minimum value
- `MAX()` - Maximum value

## Set Operations

**✅ Standard**: UNION, INTERSECT, EXCEPT

```gql
-- UNION - combine results
MATCH (p:Person {city: "NYC"})
RETURN p.name
UNION
MATCH (p:Person {city: "LA"})
RETURN p.name;

-- UNION ALL - keep duplicates
MATCH (p:Person {city: "NYC"})
RETURN p.name
UNION ALL
MATCH (p:Person)-[:KNOWS]->(:Person {city: "NYC"})
RETURN p.name;

-- INTERSECT - common results
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name
INTERSECT
MATCH (p:Person)-[:KNOWS]->(:Person)
RETURN p.name;

-- EXCEPT - set difference
MATCH (p:Person)
RETURN p.name
EXCEPT
MATCH (p:Person {city: "NYC"})
RETURN p.name;
```

## Transactions in GQL

**✅ Standard**: Transaction control statements

### Basic Transaction Flow

```gql
-- Start transaction
START TRANSACTION;

-- Make changes
CREATE (:Person {name: "Alice", age: 30});
CREATE (:Person {name: "Bob", age: 25});

-- Commit changes
COMMIT;
```

### Rollback on Error

```gql
START TRANSACTION;

CREATE (:Person {name: "Charlie", age: 35});

-- Oops, something went wrong
ROLLBACK;

-- Changes are undone
```

### Savepoints

**🔧 Extension**: Savepoint support for partial rollback

```gql
START TRANSACTION;

CREATE (:Person {name: "Alice", age: 30});

SAVEPOINT sp1;

CREATE (:Person {name: "Bob", age: 25});

-- Rollback to savepoint (undoes Bob, keeps Alice)
ROLLBACK TO SAVEPOINT sp1;

COMMIT;
```

**See also**: [Transactions and Data Integrity](/docs/transactions/overview) for MVCC and SSI details.

## Functions and Operators

### String Functions

```gql
-- Concatenation
MATCH (p:Person)
RETURN p.name + " (" + toString(p.age) + ")" AS display;

-- Case conversion
MATCH (p:Person)
RETURN upper(p.name), lower(p.name);

-- Substring
MATCH (p:Person)
RETURN substring(p.name, 0, 3) AS short_name;
```

### Numeric Functions

```gql
-- Math operations
RETURN abs(-5), ceil(4.3), floor(4.7), round(4.5);

-- Random
RETURN rand() AS random_value;
```

### Temporal Functions

```gql
-- Current timestamp
RETURN timestamp() AS now;

-- Date/time constructors (from TYPE_QUICK_REFERENCE.md)
RETURN date('2024-01-15') AS d;
RETURN time('14:30:00') AS t;
RETURN timestamp('2024-01-15T14:30:00Z') AS ts;

-- Interval arithmetic
RETURN date('2024-01-15') + interval('P7D') AS next_week;
```

### Type Conversion

```gql
-- Explicit casting
RETURN toInteger("42") AS int_val;
RETURN toFloat("3.14") AS float_val;
RETURN toString(42) AS str_val;
RETURN toBoolean("true") AS bool_val;
```

See [Type Conversion Functions](/docs/reference/type-conversion) for complete conversion rules.

## EXPLAIN and PROFILE

### EXPLAIN - Query Plan

**✅ Standard**: Show query execution plan without running

```gql
EXPLAIN
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.age > 25
RETURN p.name, friend.name;
```

**Output**: Logical plan with operators (Scan, Filter, Expand, Project).

### PROFILE - Execution Metrics

**🔧 Extension**: Show actual execution metrics

```gql
PROFILE
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.age > 25
RETURN p.name, friend.name;
```

**Output**: Actual rows processed, execution time, index usage.

See [EXPLAIN and PROFILE](/docs/query/indexing-and-optimization#explain-and-profile) for detailed usage.

## Session Management

**🔧 Extension**: Session state persistence

Sessions maintain:
- Current graph context (`USE <graph>`)
- Transaction state
- Prepared statements
- Session variables

```gql
-- Set session graph
USE SocialNetwork;

-- All subsequent queries use this graph
MATCH (p:Person) RETURN p.name;
```

See [Session Management](/docs/transactions/overview#sessions) for details.

## Extensions vs Standard

### Currently Supported Extensions

**🔧 Extensions** (from `API_REFERENCE_GENERATED.md`):

- `FOREACH` - Iterate over list and execute statements
- `SAVEPOINT` / `ROLLBACK TO SAVEPOINT` - Partial transaction rollback
- Session-level graph context
- Deterministic ordering for pagination

### Planned Features

**📋 Not Yet Supported** (from `VALUES_MATCH_CHAINING_SPEC.md`):

- `VALUES` clause → `MATCH` chaining
  ```gql
  -- NOT SUPPORTED YET
  VALUES (1), (2), (3) AS t(x)
  MATCH (p:Person)
  WHERE p.id = t.x
  RETURN p;
  ```

When this feature ships, the documentation will be updated with examples.

## Complete Example: Social Network

```gql
-- Create graph
CREATE GRAPH SocialNetwork;
USE SocialNetwork;

-- Start transaction
START TRANSACTION;

-- Create people
CREATE
  (:Person {name: "Alice", age: 30, city: "NYC"}),
  (:Person {name: "Bob", age: 25, city: "LA"}),
  (:Person {name: "Charlie", age: 35, city: "NYC"}),
  (:Person {name: "Diana", age: 28, city: "SF"});

-- Create relationships
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS {since: 2020}]->(b);

MATCH (a:Person {name: "Alice"}), (c:Person {name: "Charlie"})
CREATE (a)-[:KNOWS {since: 2018}]->(c);

MATCH (b:Person {name: "Bob"}), (d:Person {name: "Diana"})
CREATE (b)-[:KNOWS {since: 2021}]->(d);

-- Commit
COMMIT;

-- Query: Who does Alice know?
MATCH (a:Person {name: "Alice"})-[:KNOWS]->(friend)
RETURN friend.name, friend.city;

-- Query: Mutual friends
MATCH (a:Person {name: "Alice"})-[:KNOWS]->(mutual)<-[:KNOWS]-(b:Person {name: "Bob"})
RETURN mutual.name;

-- Query: Friends of friends (not direct friends)
MATCH (a:Person {name: "Alice"})-[:KNOWS*2]->(fof)
WHERE NOT (a)-[:KNOWS]->(fof)
RETURN DISTINCT fof.name;

-- Analytics: Average age by city
MATCH (p:Person)
RETURN p.city, AVG(p.age) AS avg_age, COUNT(p) AS count
GROUP BY p.city
ORDER BY avg_age DESC;
```

## Next Steps

- **[Data Model and Types](/docs/model/data-model-and-types)** - Property graph concepts and type system
- **[Indexing and Optimization](/docs/query/indexing-and-optimization)** - Speed up queries with indexes
- **[API Reference](/docs/reference/cli-and-api)** - Complete keyword/function reference
- **[Tutorials](/docs/tutorials/overview)** - Step-by-step learning paths
- **[GQL Compliance](/docs/gql-reference/compliance)** - Detailed conformance notes
