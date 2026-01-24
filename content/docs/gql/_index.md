---
title: "GQL Language"
description: "Complete Graph Query Language (GQL) reference with ISO/IEC 39075:2024 compliance for pattern matching and graph queries"
summary: "Master the Graph Query Language (GQL) with comprehensive guides covering syntax, advanced patterns, and full ISO/IEC 39075:2024 conformance."
weight: 30
keywords:
  - GQL
  - graph query language
  - ISO GQL
  - pattern matching
  - graph queries
  - GQL syntax
  - GQL conformance
  - ISO 39075
tags:
  - gql
  - query-language
  - iso-standard
  - pattern-matching
categories:
  - query-language
  - reference
toc: true
params:
  seo:
    keywords: "GQL, graph query language, ISO 39075, pattern matching, graph queries, GQL syntax, GQL conformance"
    description: "Complete GQL reference with ISO/IEC 39075:2024 compliance covering syntax, advanced patterns, and conformance profile"
---

# GQL Language

Master the Graph Query Language (GQL), the ISO/IEC 39075:2024 standard for querying property graph databases. Geode achieves 100% GQL compliance with all 70 official conformance tests passing.

## Overview

GQL is a declarative query language specifically designed for property graph databases. Like SQL for relational databases, GQL provides a standard, expressive syntax for querying and manipulating graph data. Geode's implementation delivers complete ISO compliance with powerful extensions for enterprise use cases.

The language combines intuitive pattern matching syntax with comprehensive data manipulation operations, advanced path expressions, and rich analytical capabilities. Whether you're querying social networks, analyzing fraud patterns, or exploring knowledge graphs, GQL provides the expressive power you need.

## Key Features

- **Pattern Matching**: Express complex graph patterns with intuitive ASCII-art syntax
- **Variable-Length Paths**: Flexible path traversals with bounded or unbounded lengths
- **Aggregations**: Built-in aggregate functions (COUNT, SUM, AVG, MIN, MAX) with GROUP BY
- **Set Operations**: UNION, INTERSECT, EXCEPT for combining query results
- **Transactions**: Full ACID compliance with serializable isolation
- **Advanced Types**: Support for 50+ specialized data types including vectors, geometries, and temporal types

## ISO/IEC 39075:2024 Compliance

Geode achieves **100% compliance** with the ISO GQL standard:

- ✅ All 70 official conformance tests passing
- ✅ Complete pattern matching syntax
- ✅ Full aggregation support
- ✅ Set operations (UNION, INTERSECT, EXCEPT)
- ✅ Transaction semantics
- ✅ Error handling with standard status codes

## Topics in This Section

- **[GQL Guide](guide/)** - Comprehensive guide to GQL syntax, patterns, and query structure with examples
- **[Advanced Patterns](advanced-patterns/)** - Advanced GQL patterns including recursive queries, complex path expressions, and optimization techniques
- **[Conformance Profile](conformance-profile/)** - Detailed ISO/IEC 39075:2024 conformance profile and compliance documentation

## Quick Start

### Basic Pattern Matching

```gql
-- Simple node pattern
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name, p.age
ORDER BY p.age DESC
LIMIT 10
```

### Relationship Patterns

```gql
-- Find friends of friends
MATCH (me:Person {name: 'Alice'})-[:KNOWS*2]->(fof:Person)
WHERE fof <> me
RETURN DISTINCT fof.name
```

### Aggregations

```gql
-- Group by with aggregation
MATCH (p:Person)-[:LIVES_IN]->(c:City)
RETURN c.name, count(*) AS population
GROUP BY c.name
ORDER BY population DESC
```

### Data Modification

```gql
-- Create nodes and relationships
CREATE (p:Person {name: 'Alice', age: 30})
CREATE (c:City {name: 'Seattle'})

MATCH (p:Person {name: 'Alice'}), (c:City {name: 'Seattle'})
CREATE (p)-[:LIVES_IN {since: 2020}]->(c)
```

## Language Syntax

### Pattern Syntax

```gql
-- Node pattern
(variable:Label {property: value})

-- Relationship pattern
-[variable:TYPE {property: value}]->

-- Variable-length path
-[:TYPE*min..max]->

-- Path pattern
path = (a)-[:TYPE*1..3]->(b)
```

### Query Structure

```gql
-- Complete query structure
MATCH pattern
WHERE condition
WITH projection
MATCH pattern
WHERE condition
RETURN expression
ORDER BY expression
LIMIT n
OFFSET m
```

## Learn More

- [Data Model and Types](/docs/model/data-model-and-types/) - Understand property graphs and type system
- [Query Performance Tuning](/docs/query/performance-tuning/) - Optimize GQL queries
- [EXPLAIN and PROFILE](/docs/query/explain-profile/) - Understand query execution
- [Indexing and Optimization](/docs/query/indexing-and-optimization/) - Index strategies for GQL queries
- [Error Codes](/docs/reference/error-codes/) - GQL error codes and handling

## Examples by Use Case

### Social Networks

```gql
-- Find mutual friends
MATCH (me:Person {name: 'Alice'})-[:KNOWS]->(friend:Person)
      -[:KNOWS]->(mutual:Person)<-[:KNOWS]-(me)
RETURN mutual.name, count(*) AS mutual_friends
GROUP BY mutual.name
ORDER BY mutual_friends DESC
```

### Recommendation Engine

```gql
-- Recommend products based on similar users
MATCH (me:User {id: 123})-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(other:User)-[:PURCHASED]->(rec:Product)
WHERE NOT (me)-[:PURCHASED]->(rec)
RETURN rec.name, count(*) AS score
GROUP BY rec.name
ORDER BY score DESC
LIMIT 10
```

### Fraud Detection

```gql
-- Find suspicious transaction patterns
MATCH (a:Account)-[t1:TRANSFER]->(b:Account)-[t2:TRANSFER]->(c:Account)
WHERE t1.amount > 10000
  AND t2.amount > 10000
  AND t1.timestamp - t2.timestamp < duration({hours: 1})
RETURN a.id, b.id, c.id, t1.amount, t2.amount
```

## Next Steps

- [GQL Guide](guide/) - Start with the comprehensive GQL guide
- [Tutorials](/docs/tutorials/) - Hands-on tutorials for common patterns
- [API Reference](/docs/reference/api-reference-complete/) - Complete function and operator reference
- [REPL Basics](/docs/tutorials/repl-basics/) - Interactive query development
