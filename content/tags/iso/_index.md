---
title: "Tag: ISO/IEC 39075:2024 GQL Standard"
description: "Explore Geode's complete implementation of the ISO/IEC 39075:2024 Graph Query Language standard including compliance, conformance testing, and standardized graph operations."
keywords:
  - ISO 39075
  - GQL standard
  - graph query language
  - international standard
  - ISO compliance
  - standards conformance
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/iso/"
    noindex: false
---

Geode documentation tagged with **ISO/IEC 39075:2024 GQL Standard**. ISO/IEC 39075:2024 is the first international standard for graph query languages, providing a vendor-neutral specification for querying property graphs with full interoperability.

## Introduction to ISO/IEC 39075:2024

ISO/IEC 39075:2024, officially titled "Information technology — Database languages — Graph Query Language (GQL)," represents a historic milestone in database standardization. Published in April 2024 after nearly a decade of development by working group ISO/IEC JTC 1/SC 32/WG 3, GQL is the first international standard specifically designed for property graph databases.

The standard emerged from the need for interoperability in the rapidly growing graph database market. Prior to GQL, each vendor implemented proprietary query languages (Cypher, Gremlin, SPARQL variants), creating lock-in and limiting portability. GQL provides a common foundation that enables queries to work across compliant databases, tooling to support multiple backends, and developers to transfer skills between platforms.

Geode achieves 100% compliance with ISO/IEC 39075:2024, passing all 70 official conformance tests in the test suite. This makes Geode one of the first production-ready databases to fully implement the standard, positioning it as a reference implementation for the graph database community. Geode's commitment to standards compliance ensures long-term portability, predictable semantics, and compatibility with emerging GQL tooling.

## Key Concepts

### The GQL Standard Structure

ISO/IEC 39075:2024 is organized into comprehensive sections:

- **Part 1: Framework**: Core concepts, data model, and type system
- **Part 2: Foundation**: Basic syntax, expressions, and operations
- **Part 3: Advanced Features**: Subqueries, aggregations, and functions
- **Part 4: Schema DDL**: Graph schema definition language
- **Part 5: Conformance**: Test requirements and compliance levels

### Property Graph Model

The ISO standard defines property graphs consisting of:

- **Nodes (Vertices)**: Entities with zero or more labels and properties
- **Relationships (Edges)**: Directed connections between nodes with a type and properties
- **Properties**: Key-value pairs where keys are strings and values have defined types
- **Labels**: Node classification tags (e.g., `:Person`, `:Product`)
- **Types**: Relationship classification (e.g., `:PURCHASED`, `:KNOWS`)

### Data Types

ISO/IEC 39075:2024 specifies a rich type system:

- **Primitive Types**: BOOLEAN, INTEGER, FLOAT, STRING, DATE, TIME, TIMESTAMP
- **Temporal Types**: DATE, TIME, LOCALDATETIME, ZONEDDATETIME, DURATION
- **Spatial Types**: POINT (2D/3D with coordinate reference systems)
- **Collection Types**: LIST, SET, MAP
- **Path Types**: Structured path objects for graph traversals
- **NULL**: Explicit null handling with three-valued logic

### Query Language Components

The standard defines comprehensive query capabilities:

- **Pattern Matching**: ASCII-art syntax for graph patterns
- **Data Manipulation**: INSERT, SET, REMOVE, DELETE operations
- **Aggregation**: COUNT, SUM, AVG, MIN, MAX, COLLECT functions
- **Subqueries**: Nested queries with EXISTS, OPTIONAL, and UNION
- **Path Patterns**: Variable-length paths and shortest path algorithms
- **Ordering and Limiting**: ORDER BY, LIMIT, OFFSET clauses

### Conformance Levels

The standard defines three conformance levels:

1. **Core GQL**: Basic pattern matching and simple queries
2. **Intermediate GQL**: Aggregations, subqueries, and path operations
3. **Full GQL**: All features including advanced functions and procedures

Geode implements **Full GQL** conformance, supporting all features defined in the standard.

## How ISO Compliance Works in Geode

### Standards-First Development

Geode's development follows a standards-first approach:

1. **Specification Review**: New features begin with careful ISO specification analysis
2. **Test-Driven Implementation**: Conformance tests guide implementation
3. **Semantic Validation**: Edge cases verified against ISO-specified behavior
4. **Continuous Testing**: All 70 ISO tests run in CI/CD pipeline
5. **Specification Tracking**: CANARY markers link code to specification sections

### Conformance Testing

Geode validates compliance through:

- **Official Test Suite**: All 70 ISO/IEC 39075:2024 conformance tests
- **Syntax Tests**: Parser validates all legal GQL syntax
- **Semantic Tests**: Query behavior matches ISO-specified semantics
- **Error Tests**: Error codes and messages follow ISO conventions
- **Type Tests**: Type system behaves according to specification

### Query Semantics

Geode implements ISO-specified semantics including:

- **Three-Valued Logic**: NULL handling follows ISO rules
- **Operator Precedence**: Expression evaluation order matches specification
- **Pattern Matching**: Graph pattern matching uses ISO algorithm
- **Aggregation**: GROUP BY and aggregation functions match ISO behavior
- **Type Coercion**: Implicit conversions follow ISO type compatibility rules

### Error Handling

ISO compliance extends to error reporting:

```gql
-- Invalid syntax produces ISO-specified error codes
MATCH (n:Person WHERE n.age > 30  -- Missing closing parenthesis
-- Error: GQL-42601: Syntax error at line 1, column 33

-- Type errors follow ISO conventions
MATCH (n:Person)
SET n.age = 'not a number'
-- Error: GQL-22007: Invalid type conversion: STRING to INTEGER

-- Constraint violations use ISO codes
INSERT (:Person {id: 12345})  -- Duplicate key
-- Error: GQL-23505: Unique constraint violation on Person(id)
```

## Use Cases

### Portable Query Development

```gql
-- This query works identically on all ISO-compliant databases
MATCH (p:Person)-[:KNOWS]->(friend:Person)
WHERE p.name = 'Alice'
AND friend.age > 25
RETURN friend.name, friend.city
ORDER BY friend.age DESC
LIMIT 10
```

### Cross-Platform Migration

```python
# Application code is portable across GQL databases
import geode_client

async def get_user_friends(user_name: str):
    """Works with any ISO-compliant GQL database."""
    query = """
        MATCH (u:User {name: $name})-[:FRIEND]->(friend:User)
        RETURN friend.name, friend.email
        ORDER BY friend.name
    """

    async with geode_client.connect('geode://localhost:3141') as conn:
        result = await conn.execute(query, {'name': user_name})
        return [row async for row in result]
```

### Standards-Based Tooling

```python
# GQL language servers work with any compliant database
from gql_language_server import GQLServer

server = GQLServer(
    database_url='geode://localhost:3141',
    validate_against='ISO/IEC 39075:2024'
)

# Provides syntax highlighting, auto-completion, and validation
# for any ISO-compliant GQL database
```

### Specification-Driven Testing

```python
import pytest
from geode_client import connect

@pytest.mark.iso_compliance
async def test_aggregation_semantics():
    """Verify aggregation follows ISO specification."""
    async with connect('geode://localhost:3141') as conn:
        # Create test data
        await conn.execute("""
            INSERT (:Product {id: 1, price: 10.0}),
                   (:Product {id: 2, price: 20.0}),
                   (:Product {id: 3, price: NULL})
        """)

        # ISO specifies that aggregate functions ignore NULL
        result = await conn.execute("""
            MATCH (p:Product)
            RETURN AVG(p.price) AS avg_price, COUNT(p.price) AS count
        """)

        row = await result.fetch_one()
        assert row['avg_price'] == 15.0  # (10 + 20) / 2
        assert row['count'] == 2  # NULL excluded
```

## Best Practices

### Writing Portable Queries

1. **Use Standard Syntax**: Avoid vendor-specific extensions
2. **Test on Multiple Databases**: Validate portability with different implementations
3. **Follow ISO Naming Conventions**: Use standard function and operator names
4. **Handle NULL Correctly**: Use ISO three-valued logic
5. **Document Assumptions**: Note any database-specific optimizations

### Leveraging Conformance

1. **Rely on Semantics**: Trust ISO-specified behavior for edge cases
2. **Use Standard Functions**: Prefer ISO functions over custom implementations
3. **Validate Inputs**: Use ISO type system for input validation
4. **Error Handling**: Catch and handle ISO error codes appropriately

### Migration Planning

1. **Audit Queries**: Identify vendor-specific syntax before migration
2. **Test Incrementally**: Validate each query against target database
3. **Use Feature Detection**: Check conformance level if using advanced features
4. **Plan Transitions**: Migrate to ISO syntax gradually

### Standards Tracking

1. **Monitor Updates**: Track ISO working group for future revisions
2. **Test New Features**: Validate new capabilities against specification
3. **Report Issues**: Contribute feedback to standards process
4. **Community Engagement**: Participate in GQL community discussions

## Performance Considerations

### Standards Overhead

ISO compliance has minimal performance impact:

- **Parsing**: Standards-compliant parser adds <0.1ms overhead
- **Validation**: Type checking and semantic validation is <0.5ms
- **Execution**: Standard semantics enable aggressive optimizations
- **Interoperability**: Portable queries may miss database-specific optimizations

### Optimization Within Standards

Geode optimizes while maintaining compliance:

- **Query Planning**: ISO semantics enable advanced optimization rules
- **Index Usage**: Standard patterns enable automatic index selection
- **Parallel Execution**: Deterministic semantics enable safe parallelization
- **Caching**: Standard query plans can be cached and reused

### Benchmarking

ISO compliance enables fair benchmarks:

- **Apples-to-Apples**: Same queries work across databases
- **Standard Workloads**: ISO defines reference workloads for comparison
- **Reproducibility**: Standard semantics ensure reproducible results
- **Vendor Neutrality**: Eliminate bias from proprietary syntax

## Troubleshooting

### Syntax Errors

**Symptom**: Query fails with syntax error

**Solutions**:
- Consult ISO/IEC 39075:2024 specification
- Verify query against GQL grammar
- Use GQL-compliant syntax validator
- Check for vendor-specific extensions

### Semantic Differences

**Symptom**: Query produces unexpected results

**Solutions**:
- Review ISO-specified semantics for operation
- Check NULL handling with three-valued logic
- Verify type coercion rules
- Test with official conformance suite

### Migration Issues

**Symptom**: Queries fail after migration

**Solutions**:
- Identify vendor-specific syntax
- Rewrite using ISO-standard constructs
- Test against target database conformance level
- Validate behavior with conformance tests

## Related Topics

- [GQL (Graph Query Language)](/tags/gql/) - GQL query language fundamentals
- [GQL Compliance](/tags/gql-compliance/) - Conformance testing and validation
- [GQL Syntax](/tags/gql-syntax/) - Syntax reference and examples
- [Standards](/tags/standards/) - Database standards and specifications
- [Query Language](/tags/query-language/) - Query language concepts
- [Specification](/tags/specification/) - Technical specifications

## Further Reading

### Official Specification

- [ISO/IEC 39075:2024 Overview](https://www.iso.org/standard/76120.html) - Official ISO page
- [GQL Specification Document](/docs/gql-specification/) - Complete specification
- [Conformance Requirements](/docs/conformance-requirements/) - Testing and validation

### Implementation Guides

- [GQL Implementation Guide](/docs/gql-implementation/) - Building ISO-compliant systems
- [Migration to GQL](/docs/migration-to-gql/) - Transitioning from other languages
- [Portable Query Development](/docs/portable-queries/) - Writing cross-platform queries

### Standards Process

- [ISO/IEC JTC 1/SC 32/WG 3](https://www.iso.org/committee/45342.html) - Working group
- [GQL Standards Blog](/blog/gql-standards/) - Updates and commentary
- [Contributing to GQL](/docs/contributing-to-gql/) - Participating in standards work
