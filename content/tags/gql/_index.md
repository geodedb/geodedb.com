---
title: "Tag: Graph Query Language (GQL)"
description: "Explore Geode's ISO/IEC 39075:2024 GQL standard implementation including query syntax, pattern matching, and full compliance with the graph query language specification."
keywords:
  - GQL
  - graph query language
  - ISO 39075
  - pattern matching
  - query syntax
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/gql/"
    noindex: false
---

Geode documentation tagged with **Graph Query Language (GQL)**. GQL is the ISO/IEC 39075:2024 international standard for querying property graph databases, providing a declarative, composable language designed specifically for graph data structures.

## Introduction to GQL

The Graph Query Language (GQL) represents a watershed moment in database standardization. Published as ISO/IEC 39075:2024, GQL provides the first international standard specifically designed for querying property graphs. Unlike SQL, which evolved from relational theory, or Cypher and SPARQL, which were vendor-specific or domain-specific, GQL was built from the ground up as a universal standard for graph databases.

GQL combines the best ideas from existing graph query languages while introducing new capabilities for modern graph workloads. The language supports both read queries (MATCH) and write operations (INSERT, SET, REMOVE, DELETE), making it a complete data manipulation language. Its declarative nature means you describe what data you want, not how to retrieve it—the query optimizer handles execution strategy.

Geode implements 100% of the ISO/IEC 39075:2024 specification, passing all 70 official ISO compliance tests. This makes Geode one of the first production-ready databases to offer complete GQL support, positioning it as a reference implementation for the standard.

## Key Concepts

### Pattern Matching

At the heart of GQL is pattern matching. The `MATCH` clause lets you describe graph structures using ASCII-art syntax:

```gql
MATCH (person:Person)-[:KNOWS]->(friend:Person)
WHERE person.name = 'Alice'
RETURN friend.name
```

This query reads naturally: "Match a Person node named Alice, connected by a KNOWS relationship to friend nodes, and return the friends' names."

### Node and Relationship Patterns

GQL supports rich pattern syntax:

- **Node patterns**: `(variable:Label {property: value})`
- **Relationship patterns**: `-[:TYPE]->`, `<-[:TYPE]-`, `-[:TYPE]-`
- **Variable-length paths**: `-[:KNOWS*1..3]->` (1 to 3 hops)
- **Property constraints**: `WHERE node.age > 30`

### Data Manipulation

GQL provides comprehensive write operations:

```gql
// Insert new nodes
INSERT (:Person {name: 'Bob', age: 30})

// Create relationships
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
INSERT (a)-[:KNOWS]->(b)

// Update properties
MATCH (p:Person {name: 'Bob'})
SET p.age = 31

// Remove properties
MATCH (p:Person {name: 'Bob'})
REMOVE p.temporary_flag

// Delete nodes and relationships
MATCH (p:Person {name: 'Bob'})
DELETE p
```

### Composability and Modularity

GQL queries compose naturally using subqueries, CTEs (Common Table Expressions), and nested patterns:

```gql
MATCH (p:Person)
WHERE EXISTS {
  MATCH (p)-[:WORKS_AT]->(:Company {name: 'Acme Corp'})
}
RETURN p.name
```

## How GQL Works in Geode

Geode's GQL implementation is built on a sophisticated query engine that transforms GQL syntax into optimized execution plans.

### Query Pipeline

1. **Lexical Analysis**: The lexer tokenizes GQL source code into tokens (keywords, identifiers, operators)
2. **Parsing**: The parser builds an Abstract Syntax Tree (AST) representing the query structure
3. **Semantic Analysis**: Type checking, label validation, and constraint verification
4. **Query Optimization**: The optimizer applies rules to generate efficient execution plans
5. **Execution**: The runtime engine executes the plan using Geode's storage and indexing layers

### Standards Compliance

Geode achieves 100% ISO/IEC 39075:2024 compliance through:

- **Complete syntax support**: All GQL keywords, operators, and expressions
- **Correct semantics**: Exact ISO-specified behavior for edge cases
- **Test validation**: All 70 ISO compliance tests passing
- **Error handling**: ISO-compliant status codes and error messages

### Performance Optimizations

Geode's GQL engine includes advanced optimizations:

- **Index-aware planning**: Automatically uses indexes for WHERE clauses
- **Join reordering**: Optimizes multi-pattern queries
- **Predicate pushdown**: Filters data as early as possible
- **Parallel execution**: Distributes work across CPU cores
- **Query caching**: Reuses compiled query plans

## Use Cases

### Social Network Analysis

```gql
// Find friends-of-friends who share interests
MATCH (me:Person {id: $userId})-[:KNOWS]->()-[:KNOWS]->(foaf:Person)
WHERE NOT EXISTS {
  MATCH (me)-[:KNOWS]->(foaf)
}
AND EXISTS {
  MATCH (me)-[:INTERESTED_IN]->(interest)<-[:INTERESTED_IN]-(foaf)
}
RETURN DISTINCT foaf.name, COUNT(interest) AS shared_interests
ORDER BY shared_interests DESC
LIMIT 10
```

### Fraud Detection

```gql
// Detect suspicious transaction patterns
MATCH (account:Account)-[t1:TRANSACTION]->(intermediary:Account)
     -[t2:TRANSACTION]->(destination:Account)
WHERE t1.timestamp - t2.timestamp < duration('PT1H')
AND t1.amount > 10000
AND account.risk_score > 0.7
RETURN account.id, destination.id, t1.amount
```

### Knowledge Graph Queries

```gql
// Find related concepts within 3 hops
MATCH path = (start:Concept {name: 'Machine Learning'})
            -[:RELATED_TO*1..3]->(related:Concept)
WHERE related.importance > 0.5
RETURN related.name, length(path) AS distance
ORDER BY distance, related.importance DESC
```

### Recommendation Systems

```gql
// Collaborative filtering recommendations
MATCH (user:User {id: $userId})-[:RATED]->(item:Item)
     <-[:RATED]-(similar:User)-[:RATED]->(recommendation:Item)
WHERE NOT EXISTS {
  MATCH (user)-[:RATED]->(recommendation)
}
RETURN recommendation.title, COUNT(similar) AS score
ORDER BY score DESC
LIMIT 20
```

## Best Practices

### Query Optimization

1. **Use indexes**: Create indexes on frequently queried properties
   ```gql
   CREATE INDEX person_name FOR (p:Person) ON (p.name)
   ```

2. **Filter early**: Place selective WHERE clauses near MATCH patterns
3. **Limit results**: Always use LIMIT for unbounded queries
4. **Profile queries**: Use PROFILE to understand execution plans

### Schema Design

- **Label consistently**: Use clear, singular noun labels (`:Person`, `:Product`)
- **Type relationships**: Give relationships meaningful types (`:PURCHASED`, `:FRIEND_OF`)
- **Index strategically**: Index properties used in WHERE, JOIN, and ORDER BY
- **Normalize carefully**: Balance between normalization and query performance

### Transaction Management

```gql
BEGIN TRANSACTION;

MATCH (account:Account {id: $fromId})
WHERE account.balance >= $amount
SET account.balance = account.balance - $amount;

MATCH (recipient:Account {id: $toId})
SET recipient.balance = recipient.balance + $amount;

COMMIT;
```

### Error Handling

- Check for NULL values in optional patterns
- Use EXISTS for conditional logic
- Validate inputs in WHERE clauses
- Handle constraint violations gracefully

## Code Examples

### Basic Pattern Matching

```gql
// Find all employees in engineering department
MATCH (p:Person)-[:WORKS_IN]->(d:Department {name: 'Engineering'})
RETURN p.name, p.title
ORDER BY p.hire_date DESC
```

### Aggregation

```gql
// Count connections by relationship type
MATCH (p:Person)-[r]->()
RETURN type(r) AS relationship_type, COUNT(*) AS count
ORDER BY count DESC
```

### Path Queries

```gql
// Find shortest path between two people
MATCH path = shortestPath(
  (start:Person {name: 'Alice'})-[:KNOWS*]-(end:Person {name: 'Bob'})
)
RETURN [node IN nodes(path) | node.name] AS path
```

### Conditional Logic

```gql
// Use CASE for computed values
MATCH (p:Person)
RETURN p.name,
       CASE
         WHEN p.age < 18 THEN 'Minor'
         WHEN p.age < 65 THEN 'Adult'
         ELSE 'Senior'
       END AS age_group
```

## Related Topics

Explore related GQL concepts and features:

- [ISO GQL Standard](/tags/iso-gql/) - ISO/IEC 39075:2024 specification details
- [GQL Compliance](/tags/gql-compliance/) - Standards conformance and testing
- [Pattern Matching](/tags/pattern-matching/) - Advanced pattern techniques
- [MATCH Clause](/tags/match/) - Core query patterns
- [Query Language](/tags/query-language/) - Language fundamentals
- [Query Optimization](/tags/query-optimization/) - Performance tuning
- [GQL Syntax](/tags/gql-syntax/) - Syntax reference
- [GQL Reference](/tags/gql-reference/) - Complete language reference

## Further Reading

### Documentation

- [GQL Quick Reference](/docs/quick-reference/) - Syntax cheat sheet
- [API Reference](/docs/api-reference/) - Complete API documentation
- [Query Optimization Guide](/docs/query-optimization/) - Performance best practices
- [GQL Tutorial Series](/tags/tutorial/) - Step-by-step learning path

### Specifications

- [ISO/IEC 39075:2024 Overview](/tags/iso-standard/) - International standard details
- [GQL Specification](/tags/specification/) - Technical specification

### Advanced Topics

- [Transaction Management](/tags/transactions/) - ACID guarantees and isolation
- [Distributed Queries](/tags/distributed/) - Multi-node query execution
- [Security](/tags/security/) - Row-level security and query authorization
- [Performance](/tags/performance/) - Benchmarks and optimization

Geode's complete GQL implementation provides a production-ready platform for graph workloads. Whether you're building social networks, fraud detection systems, recommendation engines, or knowledge graphs, GQL's declarative syntax and Geode's optimized execution deliver both developer productivity and runtime performance.
