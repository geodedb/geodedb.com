---
title: "Graph Query Language (GQL)"
description: "Master the ISO/IEC 39075:2024 Graph Query Language with comprehensive guides, pattern matching techniques, conformance documentation, and advanced GQL features in Geode."
keywords:
  - GQL
  - graph query language
  - ISO 39075
  - pattern matching
  - graph queries
  - ISO standard
  - property graph
  - declarative queries
  - GQL syntax
  - GQL semantics
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/gql/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Graph Query Language (GQL)

The **Graph Query Language (GQL)** is the ISO/IEC 39075:2024 international standard for querying property graphs. As the SQL of graph databases, GQL provides declarative syntax for expressing graph patterns, traversals, and analytics. Geode follows the ISO/IEC 39075:2024 compliance to provide portable, standards-aligned queries with a clearly documented scope.

## What is GQL?

GQL is a declarative language designed specifically for property graphs. Unlike imperative traversal APIs, GQL lets you specify *what* data you want rather than *how* to retrieve it—the query optimizer determines the execution strategy. This declarative approach enables powerful optimizations while maintaining query readability.

### Key Characteristics

**Declarative**: Express patterns, not procedures. The database finds efficient execution paths.

**Pattern-Centric**: Graph traversals are expressed as visual patterns matching graph structure.

**SQL-Like Syntax**: Familiar MATCH, WHERE, RETURN clauses reduce the learning curve for SQL users.

**Type-Safe**: Static typing of node labels and relationship types enables compile-time validation.

**Composable**: Subqueries, CTEs, and UNION enable building complex queries from simple parts.

**Standards-Based**: ISO standard ensures portability and interoperability across implementations.

## GQL in Geode

Geode provides a production-ready GQL implementation aligned with the conformance profile:

- **100% GQL compliance**: Deterministic ordering and pagination policies
- **Query Optimization**: Cost-based optimizer with index-aware execution planning
- **EXPLAIN/PROFILE**: Visibility into query execution for performance tuning
- **Error Messages**: Clear, actionable error messages with ISO status codes
- **Performance**: Statistics-driven planning for graph workloads

### ISO/IEC 39075:2024 Conformance

Geode documents conformance and implementation-defined behaviors in the ISO/IEC 39075:2024 conformance profile:

- **Pattern Matching**: MATCH and OPTIONAL MATCH with bounded expansions
- **Ordering & Pagination**: Deterministic ORDER BY with LIMIT/OFFSET policies
- **Set Operations**: UNION, INTERSECT, EXCEPT
- **Diagnostics**: US001 and related ordering diagnostics (see profile)

See the [GQL Conformance Profile](/docs/gql/conformance-profile/) for authoritative scope.

## GQL Fundamentals

### Basic Query Structure

GQL queries consist of clauses that compose to form complete operations:

```gql
MATCH (pattern)
WHERE (conditions)
RETURN (projections)
```

**MATCH**: Specifies graph patterns to find

**WHERE**: Filters matched patterns with predicates

**RETURN**: Projects results with column expressions

### Pattern Matching

Patterns are the heart of GQL, describing graph structure visually:

```gql
// Node pattern
MATCH (n:Person)

// Relationship pattern
MATCH (p:Person)-[:KNOWS]->(f:Person)

// Multi-hop pattern
MATCH (p:Person)-[:KNOWS*1..3]->(friend)

// Complex pattern
MATCH (p:Person)-[:WORKS_AT]->(c:Company)<-[:WORKS_AT]-(colleague)
WHERE colleague <> p
```

Patterns use ASCII art notation: `(node)` for nodes, `-[rel]->` for directed relationships, `-[rel]-` for undirected.

### Data Manipulation

GQL provides full CRUD capabilities:

```gql
// Create nodes
INSERT (:Person {name: 'Alice', age: 30})

// Create relationships
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
INSERT (a)-[:KNOWS]->(b)

// Update properties
MATCH (p:Person {name: 'Alice'})
SET p.age = 31

// Delete nodes and relationships
MATCH (p:Person {name: 'Alice'})
DELETE p
```

### Aggregations

GQL supports standard aggregation functions:

```gql
// Count nodes
MATCH (p:Person)
RETURN COUNT(p) AS person_count

// Group by with aggregation
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN c.name, COUNT(p) AS employees
ORDER BY employees DESC

// Multiple aggregations
MATCH (p:Person)
RETURN
  COUNT(p) AS total,
  AVG(p.age) AS avg_age,
  MIN(p.age) AS min_age,
  MAX(p.age) AS max_age
```

## Learning GQL

### For SQL Users

GQL will feel familiar with its SQL-like syntax:

| SQL Concept | GQL Equivalent |
|-------------|----------------|
| SELECT | RETURN |
| FROM | MATCH |
| WHERE | WHERE |
| JOIN | Pattern matching |
| GROUP BY | Implicit grouping with aggregations |
| ORDER BY | ORDER BY |
| LIMIT | LIMIT |
| UNION | UNION |

**Key differences**: Joins are implicit in patterns; relationships are first-class; paths are queryable.

### For Cypher Users

GQL is based on Cypher with ISO standardization:

- **Similar syntax**: Pattern matching, clauses, functions
- **Differences**: Type syntax, path semantics, some function names
- **Standard features**: ISO-defined behavior, portable across implementations

### Learning Path

**Beginners**: Start with basic MATCH patterns and simple WHERE conditions. Master node and relationship patterns before complex traversals.

**Intermediate**: Learn multi-hop patterns, variable-length paths, aggregations, and subqueries. Practice optimization with EXPLAIN.

**Advanced**: Master path queries, graph algorithms, complex analytical queries, and performance tuning.

## GQL Documentation in This Category

### Core GQL Guides

**[GQL Guide](/docs/gql/guide/)**
Comprehensive GQL tutorial from basics through advanced features. Learn pattern matching, filtering, projections, aggregations, subqueries, and data manipulation.

**[GQL Advanced Patterns](/docs/gql/advanced-patterns/)**
Advanced pattern matching techniques including variable-length paths, optional matches, complex predicates, and performance optimization.

**[GQL Conformance Profile](/docs/gql/conformance-profile/)**
Detailed ISO/IEC 39075:2024 conformance documentation, including scope and diagnostics.

### Related Documentation

**[GQL Reference](/docs/gql-reference/)**
Complete GQL syntax reference including all clauses, operators, functions, and language constructs.

**[Query Language Documentation](/categories/query/)**
Broader query language category with optimization, EXPLAIN/PROFILE, indexing, and performance tuning.

**[Reference Documentation](/docs/reference/)**
Reference documentation including operators and API details.

### Tutorials and Examples

**[MATCH Basics Tutorial](/docs/tutorials/match-basics/)**
Step-by-step introduction to GQL with hands-on examples and exercises.

**[GQL Advanced Patterns](/docs/gql/advanced-patterns/)**
Deep dive into graph pattern matching with progressive complexity.

**[Use Cases](/docs/use-cases/)**
Practical GQL examples across various use cases and domains.

## Common GQL Use Cases

### Social Network Queries

Find friends, communities, influence:

```gql
// Friends of friends
MATCH (me:Person {id: $userId})-[:KNOWS*2..2]->(fof)
WHERE fof <> me
RETURN DISTINCT fof.name

// Community detection
MATCH (p:Person)-[:KNOWS]-(friend)
WITH p, COUNT(friend) AS degree
WHERE degree > 10
RETURN p.name, degree
ORDER BY degree DESC
```

### Recommendation Queries

Collaborative filtering, similar items:

```gql
// Product recommendations
MATCH (me:User {id: $userId})-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(other:User)-[:PURCHASED]->(rec:Product)
WHERE NOT (me)-[:PURCHASED]->(rec)
WITH rec, COUNT(other) AS score
RETURN rec.name, score
ORDER BY score DESC
LIMIT 10
```

### Hierarchy Queries

Organization charts, category trees:

```gql
// Report chain
MATCH path = (employee:Person)-[:REPORTS_TO*]->(ceo:Person)
WHERE employee.id = $employeeId AND NOT (ceo)-[:REPORTS_TO]->()
RETURN [p IN nodes(path) | p.name] AS chain

// Subtree query
MATCH (category:Category {id: $categoryId})-[:PARENT_OF*]->(child)
RETURN child.name
```

### Path Queries

Shortest paths, connectivity:

```gql
// Shortest path
MATCH path = shortestPath(
  (a:Person {id: $id1})-[:KNOWS*]-(b:Person {id: $id2})
)
RETURN length(path) AS distance, [n IN nodes(path) | n.name] AS names

// All paths with constraints
MATCH path = (a:Person)-[:KNOWS*1..5]-(b:Person)
WHERE a.id = $id1 AND b.id = $id2
RETURN path
LIMIT 100
```

### Analytical Queries

Graph metrics, statistics:

```gql
// Degree distribution
MATCH (p:Person)-[r:KNOWS]-()
WITH p, COUNT(r) AS degree
RETURN degree, COUNT(p) AS node_count
ORDER BY degree

// Connected components size
MATCH (p:Person)
OPTIONAL MATCH path = (p)-[:KNOWS*]-(other)
WITH p.component_id AS component, COUNT(DISTINCT p) AS size
RETURN size, COUNT(component) AS components
ORDER BY size DESC
```

## GQL Best Practices

### Query Writing

1. **Start specific**: Begin MATCH with the most selective pattern
2. **Filter early**: Use WHERE immediately after MATCH for selectivity
3. **Limit results**: Always use LIMIT for open-ended queries
4. **Use parameters**: Parameterize queries for caching and security
5. **Avoid Cartesian products**: Ensure patterns are connected

### Pattern Design

1. **Anchor patterns**: Start with indexed properties (IDs, unique values)
2. **Direction matters**: Use directed relationships when known
3. **Relationship types**: Specify types to enable index usage
4. **Variable-length carefully**: Limit maximum depth to avoid infinite expansion
5. **Optional matches last**: Place OPTIONAL MATCH after required patterns

### Performance Optimization

1. **Create indexes**: Index frequently queried properties and relationship types
2. **Use EXPLAIN**: Verify query plans before deployment
3. **Profile queries**: Use PROFILE to measure actual execution time
4. **Batch operations**: Group inserts/updates for better throughput
5. **Denormalize strategically**: Duplicate data when read patterns justify it

### Code Quality

1. **Format queries**: Use consistent indentation and line breaks
2. **Comment complex logic**: Explain non-obvious patterns
3. **Use meaningful names**: Choose descriptive variable names
4. **Validate inputs**: Check parameters before query execution
5. **Handle errors**: Implement proper error handling

## GQL Features by Version

Geode's GQL implementation is production-ready with all ISO features:

****GEODE_TAG**+ (Current stable line)**:

- ✅ ISO/IEC 39075:2024 compliance
- ✅ MATCH and OPTIONAL MATCH with bounded expansions
- ✅ Aggregations and set operations
- ✅ Deterministic ordering and pagination policies
- ✅ Diagnostics aligned to the conformance profile

## ISO/IEC 39075:2024 Standard

The GQL standard defines:

**Part 1: Framework**: Overall structure, conformance levels, implementation requirements

**Part 2: Foundation**: Core graph concepts, data types, pattern matching, basic queries

**Part 3: Extended Features**: Advanced patterns, paths, graph unions, computed properties

**Part 4: Routines and Types**: Standard functions, user-defined functions, type system

Geode implements the complete standard, certified through the official ISO test suite.

## Tools for GQL Development

### Interactive Shell (REPL)

```bash
geode shell
```

Interactive query development with autocomplete, syntax highlighting, and query history.

### EXPLAIN and PROFILE

```gql
EXPLAIN MATCH (p:Person)-[:KNOWS]->(f) RETURN p, f
PROFILE MATCH (p:Person)-[:KNOWS]->(f) RETURN p, f
```

Visualize query execution plans and measure performance.

### IDE Integration

Geode provides Language Server Protocol (LSP) support for GQL syntax highlighting, autocomplete, and error checking in editors like VS Code, Vim, and Emacs.

## GQL Resources

### Official Documentation

- **[GQL Guide](/docs/gql/guide/)** - Complete language guide
- **[GQL Reference](/docs/gql-reference/)** - Syntax reference
- **[Quick Reference](/docs/quick-reference/)** - Cheat sheet

### Learning Resources

- **[Tutorials](/categories/tutorials/)** - Step-by-step learning paths
- **[Examples](/categories/examples/)** - Practical code samples
- **[Best Practices](/categories/best-practices/)** - Production patterns

### Performance Resources

- **[Query Optimization](/categories/query-optimization/)** - Optimization techniques
- **[Performance Tuning](/categories/performance/)** - Performance guides
- **[Indexing Guide](/docs/query/indexing-and-optimization/)** - Index strategies

## Related Categories

- **[Query Language & Patterns](/categories/query/)** - Query optimization and advanced techniques
- **[Tutorials](/categories/tutorials/)** - Hands-on learning materials
- **[Reference](/categories/reference/)** - Complete technical reference
- **[Performance](/categories/performance/)** - Performance optimization
- **[Examples](/categories/examples/)** - Practical code examples

## Related Tags

- **[Pattern Matching](/tags/pattern-matching/)** - Pattern matching techniques
- **[Query Optimization](/tags/query-optimization/)** - Query performance
- **[ISO Standard](/tags/iso-standard/)** - ISO/IEC 39075:2024 compliance
- **[MATCH](/tags/match/)** - MATCH clause documentation
- **[GQL Compliance](/tags/gql-compliance/)** - Standards conformance

## Community and Support

### Getting Help

- **Documentation**: Start with guides and reference documentation
- **Examples**: Review practical examples for common patterns
- **GitHub Issues**: Report bugs or request features
- **Community Forums**: Ask questions and share knowledge
- **Commercial Support**: Available for enterprise customers

### Contributing

Found a GQL bug? Have a feature request? Contributions welcome:

- **Bug Reports**: Detailed reproduction steps with queries
- **Feature Requests**: Use cases and examples
- **Documentation**: Improvements to guides and examples
- **Test Cases**: Additional conformance tests

## Next Steps

**New to GQL?** Start with the [GQL Guide](/docs/gql/guide/) for a comprehensive introduction.

**Learning by example?** Browse [GQL Examples](/categories/examples/) for practical code samples.

**Optimizing queries?** Check out [Query Optimization](/categories/query-optimization/) for performance techniques.

**Building applications?** Review [Client Libraries](/categories/client-libraries/) for language-specific GQL usage.

**Advanced features?** Explore [Advanced Patterns](/docs/gql/advanced-patterns/) for complex query techniques.

---

**Standard**: ISO/IEC 39075:2024
**Conformance Profile**: ISO/IEC 39075:2024 compliance (see conformance profile)
**Last Updated**: January 2026
**Geode Version**: **GEODE_TAG**+
