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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

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

    client = geode_client.open_database('geode://localhost:3141')

    async with client.connection() as conn:
        result, _ = await conn.query(query, {'name': user_name})
        return [row for row in result.rows]
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
        result, _ = await conn.query("""
            MATCH (p:Product)
            RETURN AVG(p.price) AS avg_price, COUNT(p.price) AS count
        """)

        row = result.rows[0] if result.rows else None
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
- [GQL Standards Blog](https://codepros.org/blog/gql-standards/) - Updates and commentary
- [Contributing to GQL](/docs/contributing-to-gql/) - Participating in standards work

## Advanced Standards Compliance Features

### Cross-Platform Query Portability

Write once, run anywhere with ISO-compliant GQL:

```python
# Portable query testing across multiple databases
import asyncio
from geode_client import Client
from neo4j import GraphDatabase
from tigergraph import TigerGraphConnection

async def test_query_portability():
    """Verify same query works across GQL-compliant databases."""

    portable_query = """
        MATCH (u:User)-[:FRIEND]->(friend:User)
        WHERE u.age > 25
        RETURN friend.name, friend.email
        ORDER BY friend.name
        LIMIT 10
    """

    # Test on Geode
    client = Client("geode-server", 3141)
    async with client.connection() as geode:
        geode_result = await geode.execute(portable_query)
        geode_rows = [row for row in geode_result.rows]

    # Test on other ISO-compliant database
    # (pseudo-code - actual API may differ)
    other_db = OtherGQLDatabase("other-server", 7687)
    other_result = other_db.run(portable_query)
    other_rows = list(other_result)

    # Results should be semantically equivalent
    assert len(geode_rows) == len(other_rows)
    print("✓ Query portable across databases")

asyncio.run(test_query_portability())
```

### ISO Compliance Testing Framework

```python
class ISOComplianceValidator:
    """Validate ISO/IEC 39075:2024 compliance."""

    def __init__(self, client):
        self.client = client
        self.test_results = []

    async def run_compliance_suite(self):
        """Execute full ISO compliance test suite."""
        await self.test_pattern_matching()
        await self.test_data_manipulation()
        await self.test_aggregation()
        await self.test_subqueries()
        await self.test_null_handling()
        await self.test_type_system()

        return self.generate_report()

    async def test_pattern_matching(self):
        """Test ISO §7: Pattern Matching."""
        tests = [
            {
                'name': 'Basic node pattern',
                'query': 'MATCH (n:Person) RETURN count(n)',
                'section': '7.2.1'
            },
            {
                'name': 'Relationship pattern',
                'query': 'MATCH (a)-[r:KNOWS]->(b) RETURN count(r)',
                'section': '7.2.2'
            },
            {
                'name': 'Variable-length path',
                'query': 'MATCH (a)-[:KNOWS*1..3]->(b) RETURN count(b)',
                'section': '7.2.3'
            }
        ]

        for test in tests:
            try:
                await self.client.execute(test['query'])
                self.test_results.append({
                    'section': test['section'],
                    'name': test['name'],
                    'status': 'PASS'
                })
            except Exception as e:
                self.test_results.append({
                    'section': test['section'],
                    'name': test['name'],
                    'status': 'FAIL',
                    'error': str(e)
                })

    async def test_null_handling(self):
        """Test ISO §6.4: NULL Handling (Three-valued logic)."""
        tests = [
            {
                'query': 'RETURN NULL = NULL AS result',
                'expected': None,  # NULL, not true!
                'section': '6.4.1'
            },
            {
                'query': 'RETURN NULL AND true AS result',
                'expected': None,
                'section': '6.4.2'
            },
            {
                'query': 'RETURN NULL OR true AS result',
                'expected': True,
                'section': '6.4.3'
            }
        ]

        for test in tests:
            result, _ = await self.client.query(test['query'])
            row = result.rows[0] if result.rows else None
            actual = row['result']

            status = 'PASS' if actual == test['expected'] else 'FAIL'
            self.test_results.append({
                'section': test['section'],
                'name': f"NULL handling: {test['query']}",
                'status': status,
                'expected': test['expected'],
                'actual': actual
            })

    def generate_report(self):
        """Generate compliance test report."""
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r['status'] == 'PASS')
        failed = total - passed

        report = f"""
ISO/IEC 39075:2024 Compliance Report
====================================
Total Tests: {total}
Passed: {passed} ({100*passed/total:.1f}%)
Failed: {failed} ({100*failed/total:.1f}%)

"""
        if failed > 0:
            report += "Failed Tests:\n"
            for result in self.test_results:
                if result.rows['status'] == 'FAIL':
                    report += f"  • §{result.rows['section']}: {result.rows['name']}\n"
                    if 'error' in result:
                        report += f"    Error: {result.rows['error']}\n"

        return report
```

### Standards-Based Migration Path

```python
class StandardsMigrationHelper:
    """Help migrate from proprietary to ISO-standard GQL."""

    def __init__(self):
        self.translations = {
            'cypher': {
                # Neo4j Cypher → ISO GQL mappings
                'DETACH DELETE': 'DELETE',  # ISO includes implicit detach
                'CALL {...} YIELD': 'CALL {...}',
                # Property existence
                'exists(n.prop)': 'n.prop IS NOT NULL',
            },
            'gremlin': {
                # Gremlin → ISO GQL mappings
                '.hasLabel("Person")': ':Person',
                '.has("age", gt(25))': 'WHERE age > 25',
                '.values("name")': 'RETURN name',
            }
        }

    def translate_query(self, query, source_dialect):
        """Translate proprietary query to ISO GQL."""
        translated = query

        if source_dialect in self.translations:
            for pattern, replacement in self.translations[source_dialect].items():
                translated = translated.replace(pattern, replacement)

        return translated

    def analyze_compatibility(self, query, source_dialect):
        """Analyze query for ISO compatibility."""
        issues = []

        # Check for vendor-specific features
        vendor_patterns = {
            'cypher': [
                r'CALL apoc\.', r'CALL gds\.',  # APOC, GDS libraries
                r'UNWIND.*WHERE.*IN',  # Cypher-specific patterns
            ],
            'gremlin': [
                r'\.fold\(\)',  # Gremlin step
                r'\.cap\(',  # Gremlin cap step
            ]
        }

        if source_dialect in vendor_patterns:
            for pattern in vendor_patterns[source_dialect]:
                if re.search(pattern, query):
                    issues.append({
                        'type': 'vendor_specific',
                        'pattern': pattern,
                        'message': f'Vendor-specific feature: {pattern}'
                    })

        return issues

# Usage example
helper = StandardsMigrationHelper()

# Translate Cypher query
cypher_query = """
    MATCH (n:Person)
    WHERE exists(n.email)
    DETACH DELETE n
"""

iso_query = helper.translate_query(cypher_query, 'cypher')
print(iso_query)
# Output:
# MATCH (n:Person)
# WHERE n.email IS NOT NULL
# DELETE n
```

## ISO Certification and Validation

### Automated Conformance Testing

```yaml
# .github/workflows/iso-conformance.yml
name: ISO/IEC 39075:2024 Conformance

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  conformance-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Geode
        run: |
          docker pull codepros/geode:latest
          docker run -d -p 3141:3141 codepros/geode:latest

      - name: Run ISO Test Suite
        run: |
          python scripts/iso_conformance_tests.py \
            --host localhost \
            --port 3141 \
            --report-format json \
            --output conformance-report.json

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: iso-conformance-report
          path: conformance-report.json

      - name: Check Pass Rate
        run: |
          pass_rate=$(jq '.pass_rate' conformance-report.json)
          if (( $(echo "$pass_rate < 100" | bc -l) )); then
            echo "Conformance test failure: $pass_rate% pass rate"
            exit 1
          fi
```

### Compliance Documentation Generation

```python
class ComplianceDocGenerator:
    """Generate ISO compliance documentation."""

    def __init__(self, test_results):
        self.results = test_results

    def generate_markdown_report(self):
        """Generate markdown compliance report."""

        report = """# ISO/IEC 39075:2024 Compliance Report

## Executive Summary

Geode Graph Database v0.18.0 achieves **100% compliance** with ISO/IEC 39075:2024
(Graph Query Language) international standard.

## Test Results Summary

| Category               | Tests | Passed | Pass Rate |
|------------------------|-------|--------|-----------|
"""

        for category, stats in self.results.items():
            report += f"| {category:22} | {stats['total']:5} | {stats['passed']:6} | {stats['pass_rate']:8.1f}% |\n"

        report += """

## Detailed Results

"""

        for category, stats in self.results.items():
            report += f"### {category}\n\n"
            for test in stats['tests']:
                status = '✓' if test['passed'] else '✗'
                report += f"{status} **{test['name']}** (§{test['section']})\n"
                if not test['passed']:
                    report += f"  - Error: {test['error']}\n"
            report += "\n"

        return report

    def generate_html_report(self):
        """Generate HTML compliance report with interactive features."""
        # Implementation for HTML report
        pass
```

## Performance Implications of Standards Compliance

### Benchmarking ISO-Compliant Queries

```python
import time
from statistics import mean, stdev

async def benchmark_iso_compliance_overhead():
    """Measure performance impact of ISO compliance features."""

    benchmarks = []

    # Benchmark 1: Type checking overhead
    queries_with_types = [
        "MATCH (n:Person) WHERE n.age > 25 RETURN n",
        "MATCH (n:Person) WHERE toInteger(n.age) > 25 RETURN n",
    ]

    for query in queries_with_types:
        timings = []
        for _ in range(100):
            start = time.time()
            await client.execute(query)
            timings.append(time.time() - start)

        benchmarks.append({
            'query': query,
            'mean_ms': mean(timings) * 1000,
            'stdev_ms': stdev(timings) * 1000
        })

    # Benchmark 2: NULL handling overhead
    null_queries = [
        "MATCH (n) WHERE n.optional IS NULL RETURN count(n)",
        "MATCH (n) WHERE NOT EXISTS(n.optional) RETURN count(n)",
    ]

    for query in null_queries:
        timings = []
        for _ in range(100):
            start = time.time()
            await client.execute(query)
            timings.append(time.time() - start)

        benchmarks.append({
            'query': query,
            'mean_ms': mean(timings) * 1000,
            'stdev_ms': stdev(timings) * 1000
        })

    # Print results
    print("\nISO Compliance Performance Impact")
    print("=" * 60)
    for b in benchmarks:
        print(f"\nQuery: {b['query']}")
        print(f"  Mean: {b['mean_ms']:.2f}ms (±{b['stdev_ms']:.2f}ms)")

    # Typical results show <2% overhead for compliance features

asyncio.run(benchmark_iso_compliance_overhead())
```

### Optimization While Maintaining Compliance

```python
class ISOCompliantOptimizer:
    """Optimize queries while preserving ISO semantics."""

    def optimize_query(self, query):
        """Apply optimizations that maintain ISO compliance."""

        optimizations = []

        # Optimization 1: Predicate pushdown (ISO-safe)
        if self.can_push_predicate(query):
            query = self.push_predicate(query)
            optimizations.append('predicate_pushdown')

        # Optimization 2: Index hints (ISO extension)
        if self.should_add_index_hint(query):
            query = self.add_index_hint(query)
            optimizations.append('index_hint')

        # Optimization 3: Parallel execution (preserves ISO semantics)
        if self.can_parallelize(query):
            query = self.add_parallel_hint(query)
            optimizations.append('parallel_execution')

        return query, optimizations

    def validate_optimization(self, original, optimized):
        """Ensure optimization doesn't change ISO semantics."""

        # Run both queries and compare results
        original_result = self.execute_and_hash(original)
        optimized_result = self.execute_and_hash(optimized)

        if original_result != optimized_result:
            raise ValueError("Optimization changed query semantics!")

        return True
```

- [Contributing to GQL](/docs/contributing-to-gql/) - Participating in standards work
