---
title: "Query Language & Patterns"
description: "Complete GQL query language documentation including syntax reference, pattern matching, optimization techniques, and advanced query features for building high-performance graph applications."
keywords:
  - GQL
  - query language
  - pattern matching
  - query optimization
  - ISO 39075
  - graph queries
  - MATCH clause
  - WHERE filtering
  - RETURN projection
  - query patterns
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/query/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Query Language & Patterns

The **Query Language & Patterns** category provides comprehensive documentation for writing, optimizing, and debugging GQL queries in Geode. From basic pattern matching through advanced optimization techniques, these resources cover the complete query lifecycle including syntax, semantics, execution strategies, and performance tuning.

## Overview

GQL (Graph Query Language) is Geode's ISO/IEC 39075:2024-compliant query language for property graphs. Unlike imperative traversal APIs, GQL is declarative—you specify what data you want, not how to retrieve it. The query optimizer determines the execution strategy, enabling powerful optimizations while maintaining query readability and portability across GQL-compliant databases.

This category focuses on practical query writing: how to express graph patterns effectively, filter results efficiently, project complex outputs, aggregate data accurately, and optimize queries for production workloads. Whether you're writing your first MATCH query or tuning complex analytical queries for millions of nodes, these resources provide the knowledge you need.

## Query Language Fundamentals

### Declarative Query Model

GQL follows a declarative model where queries describe **what** to find rather than **how** to find it:

```gql
// Declarative: Describe the pattern
MATCH (person:Person)-[:KNOWS]->(friend:Person)
WHERE person.name = 'Alice'
RETURN friend.name

// Not: How to traverse (handled by optimizer)
```

The query optimizer automatically:
- Chooses join order and strategies
- Selects indexes to use
- Determines filtering order
- Estimates cardinalities
- Applies cost-based optimization

### Query Structure

GQL queries consist of clauses that process data sequentially:

```gql
MATCH (pattern)           // Find graph patterns
WHERE (conditions)        // Filter matches
WITH (intermediate)       // Intermediate projections
MATCH (more_patterns)     // Additional patterns
RETURN (results)          // Final projection
ORDER BY (sorting)        // Sort results
LIMIT (count)            // Limit output
```

Each clause transforms the working set, passing results to the next clause. This composable structure enables building complex queries from simple parts.

### Pattern Matching

Pattern matching is the core of GQL, describing graph structure visually:

**Node patterns**: `(variable:Label {property: value})`

**Relationship patterns**: `-[variable:TYPE {property: value}]->`

**Path patterns**: `(start)-[:TYPE*1..5]->(end)`

**Complex patterns**: Multiple patterns connected by commas

Patterns use ASCII art notation that mirrors graph structure, making queries readable and intuitive.

## Query Language Documentation

### Core Query Guides

**[Query Documentation Index](/docs/query/)**
Entry point for all query-related documentation including syntax, optimization, indexing, and advanced features.

**[Indexing and Optimization](/docs/query/indexing-and-optimization/)**
Comprehensive guide to index design, query optimization, and performance tuning. Learn to create effective indexes and optimize query execution.

**[EXPLAIN and PROFILE](/docs/query/explain-profile/)**
Using EXPLAIN to visualize query plans and PROFILE to measure actual execution time. Essential tools for query optimization.

**[Performance Tuning](/docs/query/performance-tuning/)**
Query-level performance optimization including pattern design, index usage, filtering strategies, and execution plan analysis.

**[Full-Text Search](/docs/query/full-text-search/)**
BM25 full-text search integration with GQL queries. Learn to combine text search with graph traversals for powerful hybrid queries.

**[Materialized Views](/docs/query/materialized-views/)**
Creating and maintaining materialized views for frequently accessed aggregations and complex queries. Dramatically improve read performance.

### GQL Language Reference

**[GQL Guide](/docs/gql/guide/)**
Complete GQL language guide from basics through advanced features. Comprehensive coverage of syntax, semantics, and best practices.

**[GQL Advanced Patterns](/docs/gql/advanced-patterns/)**
Advanced pattern matching techniques including variable-length paths, optional matches, complex predicates, and performance patterns.

**[GQL Reference](/docs/gql-reference/)**
Complete syntax reference for all GQL clauses, operators, functions, and language constructs. Authoritative technical reference.

**[Quick Reference](/docs/quick-reference/)**
GQL syntax cheat sheet for quick lookup of common patterns, functions, and operations.

## Common Query Patterns

### Basic Queries

**Finding nodes by property**:
```gql
MATCH (p:Person {name: 'Alice'})
RETURN p
```

**Finding relationships**:
```gql
MATCH (p:Person)-[k:KNOWS]->(f:Person)
WHERE p.name = 'Alice'
RETURN f.name, k.since
```

**Filtering with WHERE**:
```gql
MATCH (p:Person)
WHERE p.age > 30 AND p.city = 'San Francisco'
RETURN p.name, p.age
ORDER BY p.age DESC
```

### Pattern Matching

**Multi-hop traversals**:
```gql
MATCH (p:Person)-[:KNOWS*2..4]->(friend)
WHERE p.name = 'Alice'
RETURN DISTINCT friend.name
```

**Optional patterns**:
```gql
MATCH (p:Person)
OPTIONAL MATCH (p)-[:WORKS_AT]->(c:Company)
RETURN p.name, c.name
```

**Multiple patterns**:
```gql
MATCH (p:Person)-[:KNOWS]->(f:Person),
      (p)-[:WORKS_AT]->(c:Company),
      (f)-[:WORKS_AT]->(c)
RETURN p.name, f.name, c.name
```

### Aggregations

**Count and group**:
```gql
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN c.name, COUNT(p) AS employees
ORDER BY employees DESC
```

**Multiple aggregations**:
```gql
MATCH (p:Person)
RETURN
  COUNT(p) AS total,
  AVG(p.age) AS avg_age,
  MIN(p.age) AS min_age,
  MAX(p.age) AS max_age
```

**Collecting values**:
```gql
MATCH (c:Company)<-[:WORKS_AT]-(p:Person)
RETURN c.name, COLLECT(p.name) AS employees
```

### Subqueries

**Scalar subqueries**:
```gql
MATCH (p:Person)
RETURN p.name,
  (MATCH (p)-[:KNOWS]->(f) RETURN COUNT(f)) AS friend_count
ORDER BY friend_count DESC
```

**Existential subqueries**:
```gql
MATCH (p:Person)
WHERE EXISTS {
  MATCH (p)-[:KNOWS]->(:Person {city: 'NYC'})
}
RETURN p.name
```

**List subqueries**:
```gql
MATCH (c:Company)
RETURN c.name,
  [MATCH (c)<-[:WORKS_AT]-(p:Person) RETURN p.name] AS employees
```

### Path Queries

**Shortest paths**:
```gql
MATCH path = shortestPath(
  (a:Person {name: 'Alice'})-[:KNOWS*]-(b:Person {name: 'Bob'})
)
RETURN length(path), nodes(path)
```

**All paths with constraints**:
```gql
MATCH path = (a:Person)-[:KNOWS*1..5]-(b:Person)
WHERE a.name = 'Alice' AND b.name = 'Bob'
RETURN path
LIMIT 10
```

**Path filtering**:
```gql
MATCH path = (a:Person)-[:KNOWS*]-(b:Person)
WHERE a.name = 'Alice'
  AND b.name = 'Bob'
  AND ALL(n IN nodes(path) WHERE n.active = true)
RETURN path
```

## Query Optimization

### Index-Driven Queries

**Anchor patterns with indexes**:
```gql
// Good: Start with indexed property
MATCH (p:Person {id: $userId})-[:KNOWS]->(f)
RETURN f

// Bad: Unanchored pattern scans all nodes
MATCH (p:Person)-[:KNOWS]->(f)
WHERE p.age > 30
RETURN f
```

**Use relationship type indexes**:
```gql
// Index on :KNOWS relationship enables fast lookup
MATCH ()-[k:KNOWS]->()
WHERE k.since > '2020-01-01'
RETURN COUNT(k)
```

### Filter Pushdown

**Filter early in the pipeline**:
```gql
// Good: Filter immediately after MATCH
MATCH (p:Person)
WHERE p.age > 30
MATCH (p)-[:KNOWS]->(f)
RETURN f

// Bad: Filter after expensive traversal
MATCH (p:Person)-[:KNOWS]->(f)
WHERE p.age > 30
RETURN f
```

### Cardinality Optimization

**Order patterns by selectivity**:
```gql
// Good: Start with most selective pattern
MATCH (rare:RareLabel {unique_id: $id}),
      (rare)-[:COMMON_REL]->(common)
RETURN common

// Bad: Start with large result set
MATCH (common:CommonLabel)-[:COMMON_REL]->(rare)
WHERE rare.unique_id = $id
RETURN common
```

### Limit Early

**Use LIMIT to bound results**:
```gql
// Good: Limit as soon as possible
MATCH (p:Person)-[:KNOWS]->(f)
RETURN f
LIMIT 100

// Good: Limit in subqueries
MATCH (c:Company)
RETURN c.name,
  (MATCH (c)<-[:WORKS_AT]-(p:Person)
   RETURN p.name
   LIMIT 10) AS top_employees
```

## Query Analysis Tools

### EXPLAIN

Visualize query execution plan before execution:

```gql
EXPLAIN
MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30
RETURN f.name
```

EXPLAIN shows:
- Operator pipeline
- Index usage
- Join strategies
- Estimated cardinalities
- Filter placement

### PROFILE

Measure actual query execution:

```gql
PROFILE
MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30
RETURN f.name
```

PROFILE provides:
- Actual execution time per operator
- Rows processed at each stage
- Cache hit rates
- Index effectiveness
- Bottleneck identification

### Query Metrics

Monitor query performance in production:

- **Execution time**: Track p50, p95, p99 latencies
- **Throughput**: Queries per second
- **Resource usage**: CPU, memory, I/O
- **Cache hit rates**: Index and data cache effectiveness
- **Query patterns**: Identify slow query patterns

## Advanced Query Features

### Common Table Expressions (CTEs)

Build complex queries compositionally:

```gql
WITH top_companies AS (
  MATCH (c:Company)<-[:WORKS_AT]-(p:Person)
  RETURN c, COUNT(p) AS employees
  ORDER BY employees DESC
  LIMIT 10
)
MATCH (c IN top_companies)<-[:WORKS_AT]-(p:Person)
RETURN c.name, COLLECT(p.name) AS employee_names
```

### UNION Queries

Combine results from multiple queries:

```gql
MATCH (p:Person {city: 'SF'})-[:KNOWS]->(f)
RETURN f.name AS name, 'friend' AS relationship
UNION
MATCH (p:Person {city: 'SF'})-[:WORKS_WITH]->(c)
RETURN c.name AS name, 'colleague' AS relationship
```

### Conditional Logic

Use CASE expressions for conditional results:

```gql
MATCH (p:Person)
RETURN p.name,
  CASE
    WHEN p.age < 18 THEN 'minor'
    WHEN p.age < 65 THEN 'adult'
    ELSE 'senior'
  END AS age_category
```

### List Comprehensions

Transform lists with comprehensions:

```gql
MATCH (c:Company)<-[:WORKS_AT]-(p:Person)
RETURN c.name,
  [person IN COLLECT(p) WHERE person.age > 30 | person.name] AS senior_employees
```

### Pattern Comprehensions

Generate lists from patterns:

```gql
MATCH (p:Person)
RETURN p.name,
  [(p)-[:KNOWS]->(f) WHERE f.city = 'NYC' | f.name] AS nyc_friends
```

## Data Manipulation Queries

### Creating Data

**Insert nodes**:
```gql
INSERT (:Person {name: 'Alice', age: 30, city: 'SF'})
```

**Insert relationships**:
```gql
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
INSERT (a)-[:KNOWS {since: '2020-01-01'}]->(b)
```

**Bulk inserts**:
```gql
UNWIND $batch AS row
INSERT (:Person {name: row.name, age: row.age})
```

### Updating Data

**Set properties**:
```gql
MATCH (p:Person {name: 'Alice'})
SET p.age = 31, p.updated_at = timestamp()
```

**Conditional updates**:
```gql
MATCH (p:Person)
WHERE p.age < 18
SET p.category = 'minor'
```

**Merge (upsert)**:
```gql
MERGE (p:Person {email: $email})
ON CREATE SET p.name = $name, p.created_at = timestamp()
ON MATCH SET p.updated_at = timestamp()
```

### Deleting Data

**Delete nodes**:
```gql
MATCH (p:Person {name: 'Alice'})
DELETE p
```

**Delete relationships**:
```gql
MATCH (p:Person {name: 'Alice'})-[k:KNOWS]->()
DELETE k
```

**Detach delete (remove relationships first)**:
```gql
MATCH (p:Person {name: 'Alice'})
DETACH DELETE p
```

## Query Best Practices

### Performance

1. **Index anchors**: Always start patterns with indexed properties
2. **Filter early**: Apply WHERE clauses immediately after MATCH
3. **Limit results**: Use LIMIT to bound open-ended queries
4. **Avoid Cartesian products**: Ensure patterns are connected
5. **Use EXPLAIN**: Verify query plans before deploying

### Maintainability

1. **Format consistently**: Use clear indentation and line breaks
2. **Comment complex logic**: Explain non-obvious patterns
3. **Use meaningful names**: Choose descriptive variable names
4. **Parameterize queries**: Use parameters for values, not string concatenation
5. **Test thoroughly**: Validate queries with representative data

### Security

1. **Use parameters**: Prevent injection attacks
2. **Validate inputs**: Check parameter values before execution
3. **Limit privileges**: Use Row-Level Security (RLS) for access control
4. **Audit queries**: Log data access for compliance
5. **Sanitize outputs**: Escape special characters in results

### Scalability

1. **Batch operations**: Group inserts/updates for better throughput
2. **Use materialized views**: Pre-compute expensive aggregations
3. **Partition large graphs**: Distribute data across shards
4. **Cache results**: Use application-level caching for frequent queries
5. **Monitor performance**: Track query metrics in production

## Query Examples by Domain

### Social Networks

**Friend recommendations**:
```gql
MATCH (me:User {id: $userId})-[:FRIENDS*2..2]->(fof)
WHERE fof <> me AND NOT (me)-[:FRIENDS]->(fof)
WITH fof, COUNT(*) AS mutual_friends
RETURN fof.name, mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10
```

### E-Commerce

**Product recommendations**:
```gql
MATCH (me:User {id: $userId})-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(other)-[:PURCHASED]->(rec:Product)
WHERE NOT (me)-[:PURCHASED]->(rec)
WITH rec, COUNT(DISTINCT other) AS score
RETURN rec.name, score
ORDER BY score DESC
LIMIT 10
```

### Knowledge Graphs

**Entity relationships**:
```gql
MATCH (entity:Entity {id: $entityId})-[r]-(related)
RETURN type(r) AS relationship,
       labels(related) AS related_type,
       related.name AS name
ORDER BY relationship, name
```

### Fraud Detection

**Suspicious patterns**:
```gql
MATCH (account:Account)-[:TRANSFER]->(intermediary)-[:TRANSFER]->(destination)
WHERE account.flagged = true
  AND intermediary.created > timestamp() - duration({days: 7})
WITH account, destination, COUNT(*) AS transfers, SUM(transfer.amount) AS total
WHERE transfers > 5 OR total > 10000
RETURN account.id, destination.id, transfers, total
ORDER BY total DESC
```

## Related Documentation

### Query Language

- **[GQL Category](/categories/gql/)** - Complete GQL language documentation
- **[GQL Guide](/docs/gql/guide/)** - Comprehensive language guide
- **[GQL Reference](/docs/gql-reference/)** - Syntax reference
- **[Quick Reference](/docs/quick-reference/)** - Cheat sheet

### Performance

- **[Performance Category](/categories/performance/)** - Performance optimization
- **[Indexing Guide](/docs/query/indexing-and-optimization/)** - Index strategies
- **[EXPLAIN/PROFILE](/docs/query/explain-profile/)** - Query analysis
- **[Performance Tuning](/docs/query/performance-tuning/)** - Optimization techniques

### Development

- **[Development Category](/categories/development/)** - Development workflow
- **[Client Libraries](/categories/client-libraries/)** - Language-specific clients
- **[Examples](/categories/examples/)** - Practical code samples
- **[Tutorials](/categories/tutorials/)** - Learning materials

### Advanced Features

- **[Full-Text Search](/docs/query/full-text-search/)** - BM25 text search
- **[Materialized Views](/docs/query/materialized-views/)** - View optimization
- **[Graph Algorithms](/categories/graph-algorithms-and-analytics/)** - Algorithm implementations
- **[Advanced Features](/categories/advanced-features/)** - Advanced functionality

## Related Tags

- **[GQL](/tags/gql/)** - Graph Query Language
- **[Pattern Matching](/tags/pattern-matching/)** - Pattern techniques
- **[Query Optimization](/tags/query-optimization/)** - Performance tuning
- **[MATCH](/tags/match/)** - MATCH clause
- **[Indexing](/tags/indexing/)** - Index strategies
- **[EXPLAIN](/tags/explain/)** - Query plans
- **[Profile](/tags/profile/)** - Performance profiling

## Tools and Resources

### Query Development

- **Interactive Shell**: `geode shell` for query development
- **IDE Integration**: LSP support for syntax highlighting and autocomplete
- **Query History**: Track and replay queries
- **REPL Features**: Autocomplete, syntax highlighting, multi-line editing

### Query Analysis

- **EXPLAIN**: Visualize execution plans
- **PROFILE**: Measure actual performance
- **Metrics**: Track query statistics
- **Tracing**: Debug query execution

### Query Optimization

- **Index Advisor**: Suggest indexes for queries
- **Query Hints**: Override optimizer decisions
- **Plan Cache**: Reuse query plans
- **Statistics**: Maintain accurate cardinality estimates

## Next Steps

**New to GQL?** Start with the [GQL Guide](/docs/gql/guide/) for comprehensive language coverage.

**Optimizing queries?** Review [Indexing and Optimization](/docs/query/indexing-and-optimization/) for performance techniques.

**Debugging slow queries?** Use [EXPLAIN and PROFILE](/docs/query/explain-profile/) to analyze execution.

**Building applications?** Check out [Client Libraries](/categories/client-libraries/) for language-specific query patterns.

**Advanced patterns?** Explore [GQL Advanced Patterns](/docs/gql/advanced-patterns/) for complex techniques.

---

**Query Language**: ISO/IEC 39075:2024 GQL
**Optimization**: Cost-based optimizer with index awareness
**Last Updated**: January 2026
**Geode Version**: v0.1.3+
