---
title: "GQL Query Language Reference"
description: "Complete reference for the Graph Query Language (GQL) with ISO/IEC 39075:2024 compliance"
weight: 30
---

# GQL Query Language Reference

Geode implements the complete ISO/IEC 39075:2024 Graph Query Language (GQL) standard with 100% compliance (70/70 official tests passing).

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

## Detailed Topics

Explore the following sections for comprehensive coverage:

- **[Pattern Matching](pattern-matching/)** - Node and relationship patterns
- **[Path Expressions](path-expressions/)** - Variable-length paths and shortest path
- **[Data Manipulation](data-manipulation/)** - CREATE, UPDATE, DELETE operations
- **[Aggregations](aggregations/)** - GROUP BY, aggregate functions
- **[Set Operations](set-operations/)** - UNION, INTERSECT, EXCEPT
- **[Functions](functions/)** - Built-in and user-defined functions
- **[Operators](operators/)** - Comparison, logical, arithmetic operators

## ISO/IEC 39075:2024 Compliance

Geode achieves **100% compliance** with the ISO GQL standard:

- ✅ All 70 official conformance tests passing
- ✅ Complete pattern matching syntax
- ✅ Full aggregation support
- ✅ Set operations
- ✅ Transaction semantics
- ✅ Error handling with standard status codes

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

- [Pattern Matching Guide](pattern-matching/) - Learn about graph patterns
- [Data Types Reference](../data-types/) - Explore Geode's type system
- [API Reference](../api-reference/) - Complete function documentation
