---
title: "GQL Query Language Reference"
description: "Complete reference for the Graph Query Language (GQL) with ISO/IEC 39075:2024 conformance profile guidance"
weight: 30

keywords:
  - GQL reference
  - Graph Query Language reference
  - ISO 39075
  - GQL syntax
  - Geode GQL
---

<!-- CANARY: REQ=REQ-GQL-001; FEATURE="BasicQuery"; ASPECT=Testing; STATUS=TESTED; OWNER=test; UPDATED=2025-10-02 -->

# GQL Query Language Reference

Geode implements the ISO/IEC 39075:2024 Graph Query Language (GQL) 100% compliance. See the conformance profile for scope and diagnostics.

## Overview

GQL is a declarative query language specifically designed for property graph databases. It provides powerful pattern matching capabilities, expressive syntax for graph traversals, and comprehensive data manipulation operations.

## Key Features

- **Pattern Matching**: Express complex graph patterns with intuitive syntax
- **Variable-Length Paths**: Traverse relationships with flexible path lengths
- **Aggregations**: Built-in aggregate functions for analytics
- **Transactions**: Full ACID compliance with MVCC isolation
- **Advanced Types**: Support for 50+ specialized data types
- **Set Operations**: UNION, INTERSECT, EXCEPT for combining query results

## Basic Query Structure

```gql
-- Simple pattern match
MATCH (n:Person)
WHERE n.age > 30
RETURN n.name, n.age
ORDER BY n.age DESC
LIMIT 10
```

## Quick Reference

### Pattern Matching

```gql
-- Node pattern
(n:Label {property: value})

-- Relationship pattern
-[:TYPE]->

-- Path pattern
(a)-[:KNOWS*1..3]->(b)
```

### Data Modification

```gql
-- Create node
CREATE (p:Person {name: 'Alice', age: 30})

-- Create relationship
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
CREATE (a)-[:KNOWS {since: 2024}]->(b)

-- Update properties
MATCH (p:Person {name: 'Alice'})
SET p.age = 31

-- Delete
MATCH (p:Person {name: 'Alice'})
DELETE p
```

### Aggregations

```gql
-- Count
MATCH (n:Person)
RETURN count(n)

-- Group by
MATCH (p:Person)
RETURN p.city, count(*) AS population
GROUP BY p.city
ORDER BY population DESC
```

## Reference Topics

Detailed reference documentation for GQL:

- **[GQL Specification](/docs/gql-reference/specification/)** - ISO/IEC 39075:2024 standard reference
- **[Advanced Pattern Matching](/docs/gql-reference/advanced-patterns/)** - Variable-length paths, shortest path, pattern predicates
- **[Built-in Functions](/docs/gql-reference/functions/)** - All 80+ functions by category

## Related Documentation

For comprehensive GQL coverage, see also:

- **[GQL Guide](/docs/gql/guide/)** - Complete query language guide
- **[Data Types Reference](/docs/reference/types/)** - All 50+ supported types
- **[Operators Reference](/docs/reference/operators/)** - All operators with examples
- **[Query Performance Tuning](/docs/query/performance-tuning/)** - Optimization guide
- **[Troubleshooting Guide](/docs/guides/troubleshooting/)** - Common query issues

## ISO/IEC 39075:2024 Conformance Profile

Geode publishes the ISO GQL conformance profile:

- ✅ Deterministic ordering and pagination policies
- ✅ MATCH pattern matching with bounded expansions and OPTIONAL MATCH
- ✅ Aggregations and set operations
- ✅ Transaction semantics
- ✅ Diagnostics aligned to the conformance profile

## Examples

### Find Friends of Friends

```gql
MATCH (me:Person {name: 'Alice'})-[:KNOWS*2]->(fof:Person)
WHERE fof <> me
RETURN DISTINCT fof.name
```

### Shortest Path

```gql
MATCH path = shortestPath((a:City {name: 'Seattle'})-[*]-(b:City {name: 'Boston'}))
RETURN path, length(path) AS hops
```

### Social Network Analysis

```gql
MATCH (p:Person)-[:POSTED]->(post:Post)
WHERE post.timestamp > timestamp('2024-01-01')
RETURN p.name, count(post) AS posts
ORDER BY posts DESC
LIMIT 10
```

## Next Steps

- [GQL Specification](/docs/gql-reference/specification/) - ISO standard reference
- [Advanced Patterns](/docs/gql-reference/advanced-patterns/) - Complex pattern matching
- [Functions Reference](/docs/gql-reference/functions/) - Built-in functions
- [GQL Guide](/docs/gql/guide/) - Query language tutorial
