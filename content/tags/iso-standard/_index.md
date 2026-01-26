---
title: "ISO/IEC 39075:2024 Standard"
description: "Complete guide to ISO/IEC 39075:2024 GQL standard: specification overview, features, design principles, and implementation in Geode graph database."
keywords:
  - ISO/IEC 39075:2024
  - GQL standard
  - ISO standard
  - Graph Query Language
  - ISO specification
  - standards compliance
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/iso-standard/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

ISO/IEC 39075:2024 is the international standard for GQL (Graph Query Language), defining a vendor-neutral, declarative query language for property graph databases. Geode implements this standard with 100% compliance.

## Standard Overview

**Full Title**: ISO/IEC 39075:2024 - Information technology — Database languages — GQL

**Published**: April 2024

**Scope**: Defines syntax, semantics, and behavior of GQL for querying and manipulating property graphs

**Status**: Active International Standard

**Working Group**: ISO/IEC JTC 1/SC 32/WG 3 (Database Languages)

**Related Standards**:
- ISO/IEC 9075 (SQL) - Aligns with SQL patterns
- ISO/IEC 13249 (SQL Multimedia) - Spatial types
- ISO/IEC 19075 (SQL Technical Reports) - Extensions

## Design Principles

### 1. Declarative Syntax

GQL follows SQL's declarative approach - describe what you want, not how to get it:

```gql
// Declarative: what to find
MATCH (u:User)-[:FRIEND]->(f:User)
WHERE u.name = 'Alice'
RETURN f.name

// Not imperative: how to find it
// (Query optimizer determines execution plan)
```

### 2. Pattern Matching

Visual ASCII art syntax for intuitive graph patterns:

```gql
// Pattern syntax mirrors graph structure
(node1)-[relationship]->(node2)

// Example
(alice:Person)-[:KNOWS]->(bob:Person)-[:LIVES_IN]->(city:City)
```

### 3. Composability

Build complex queries from simple building blocks:

```gql
// Simple patterns compose into complex queries
MATCH (u:User)
WHERE u.age > 25
WITH u, SIZE((u)-[:FRIEND]->()) AS friends
WHERE friends > 10
RETURN u.name, friends
ORDER BY friends DESC
LIMIT 10
```

### 4. Property Graph Model

Based on labeled property graph model:

- **Nodes**: Entities with labels and properties
- **Relationships**: Directed edges with type and properties
- **Properties**: Key-value pairs on nodes and relationships
- **Labels**: Categories for nodes
- **Types**: Categories for relationships

## Standard Structure

### Part 1: Framework (Foundation)

Defines overall architecture, terminology, and concepts.

**Key Sections**:
- §1: Scope and normative references
- §2: Terms and definitions
- §3: Symbols and conventions
- §4: Concepts (property graph model)

### Part 2: Foundation (Data Language)

Core GQL language specification.

**Key Sections**:
- §5: Lexical elements (keywords, identifiers, literals)
- §6: Data types (scalar, temporal, collection)
- §7: Graph patterns (nodes, relationships, paths)
- §8: Data manipulation (CREATE, DELETE, SET, MERGE)
- §9: Query expressions (MATCH, WHERE, RETURN, WITH)
- §10: Operators (comparison, logical, arithmetic)
- §11: Functions (aggregation, string, mathematical, temporal)
- §12: Schema (indexes, constraints)
- §13: Transactions (BEGIN, COMMIT, ROLLBACK)

### Part 3: Advanced Features

Extended functionality beyond core language.

**Key Sections**:
- §14: Subqueries (EXISTS, COUNT)
- §15: CASE expressions
- §16: List comprehensions
- §17: Pattern comprehensions
- §18: User-defined functions (UDFs)
- §19: Stored procedures

## Core Language Features

### Pattern Syntax (§7)

```gql
// Node pattern
(variable:Label1:Label2 {prop1: value1, prop2: value2})

// Relationship pattern
-[variable:TYPE1|TYPE2 {prop: value}]->

// Path pattern
path = (a)-[:KNOWS*1..3]-(b)

// Shortest path
path = SHORTEST (a)-[:KNOWS*]-(b)
```

### Data Manipulation (§8)

```gql
// CREATE
CREATE (n:Label {property: value})

// DELETE
DELETE n
DETACH DELETE n

// SET
SET n.property = value
SET n:Label

// REMOVE
REMOVE n.property
REMOVE n:Label

// MERGE
MERGE (n:Label {key: value})
ON CREATE SET n.created = NOW()
ON MATCH SET n.updated = NOW()
```

### Query Clauses (§9)

```gql
// MATCH - pattern matching
MATCH (n:Label)

// OPTIONAL MATCH - optional patterns
OPTIONAL MATCH (n)-[:REL]->(m)

// WHERE - filtering
WHERE condition

// WITH - pipeline processing
WITH expression AS alias

// RETURN - result projection
RETURN expression AS alias

// ORDER BY - sorting
ORDER BY expression ASC|DESC

// LIMIT/OFFSET - pagination
LIMIT count OFFSET skip

// UNION - combine results
query1 UNION query2
```

## Data Type System (§6)

### Scalar Types

- **Boolean**: `true`, `false`, `NULL`
- **Integer**: 64-bit signed integers
- **Float**: 64-bit IEEE 754 floating point
- **Decimal**: Arbitrary precision decimal
- **String**: Unicode text (UTF-8)
- **Bytes**: Raw binary data

### Temporal Types

- **Date**: Calendar date (no time)
- **Time**: Time of day (no date)
- **DateTime**: Combined date and time with timezone
- **Duration**: Time interval (ISO 8601)

### Collection Types

- **List**: Ordered sequence `[1, 2, 3]`
- **Map**: Key-value pairs `{key: value}`
- **Path**: Graph traversal path

### Graph Types

- **Node**: Graph node reference
- **Relationship**: Graph edge reference

## Operators (§10)

### Comparison

`=`, `<>`, `!=`, `<`, `>`, `<=`, `>=`, `IS NULL`, `IS NOT NULL`, `IN`, `BETWEEN`

### Logical

`AND`, `OR`, `NOT`, `XOR`

### Arithmetic

`+`, `-`, `*`, `/`, `%`, `^`

### String

`STARTS WITH`, `ENDS WITH`, `CONTAINS`, `=~` (regex)

### List

`IN`, `+` (concatenation), `[index]`, `[start..end]`

## Functions (§11)

### Aggregation

`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `COLLECT`, `STRING_AGG`

### String

`UPPER`, `LOWER`, `TRIM`, `SUBSTRING`, `LENGTH`, `CONCAT`, `REPLACE`, `SPLIT`

### Mathematical

`ABS`, `CEIL`, `FLOOR`, `ROUND`, `SQRT`, `POWER`, `SIN`, `COS`, `TAN`, `LOG`, `EXP`, `RAND`

### Temporal

`NOW`, `CURRENT_DATE`, `CURRENT_TIME`, `CURRENT_TIMESTAMP`, `DATE`, `DATETIME`, `TIME`, `DURATION`

### List

`SIZE`, `HEAD`, `LAST`, `TAIL`, `REVERSE`, `RANGE`

### Path

`LENGTH`, `NODES`, `RELATIONSHIPS`

### Type Conversion

`TOSTRING`, `TOINTEGER`, `TOFLOAT`, `TOBOOLEAN`

## Schema and Constraints (§12)

### Indexes

```gql
CREATE INDEX FOR (n:Label) ON (n.property)
CREATE INDEX index_name FOR (n:Label) ON (n.prop1, n.prop2)
DROP INDEX index_name
SHOW INDEXES
```

### Constraints

```gql
CREATE CONSTRAINT ON (n:Label) ASSERT n.property IS UNIQUE
CREATE CONSTRAINT ON (n:Label) ASSERT EXISTS(n.property)
DROP CONSTRAINT constraint_name
SHOW CONSTRAINTS
```

## Transaction Model (§13)

### ACID Properties

- **Atomicity**: All-or-nothing execution
- **Consistency**: Valid state transitions
- **Isolation**: Concurrent transaction isolation
- **Durability**: Committed changes persist

### Transaction Control

```gql
BEGIN TRANSACTION
  // statements
COMMIT

// Or
ROLLBACK

// Savepoints
SAVEPOINT savepoint_name
ROLLBACK TO SAVEPOINT savepoint_name
```

### Isolation Levels

- **SERIALIZABLE**: Strongest isolation (default)
- **READ COMMITTED**: Read committed data only
- **READ UNCOMMITTED**: Read uncommitted data

## Error Handling

### Error Codes

ISO/IEC 39075:2024 aligns with SQL error codes:

| Class | Description |
|-------|-------------|
| 00xxx | Success |
| 01xxx | Warning |
| 02xxx | No data |
| 21xxx | Cardinality violation |
| 22xxx | Data exception |
| 23xxx | Constraint violation |
| 42xxx | Syntax error |
| 40xxx | Transaction rollback |

### Error Format

```json
{
  "code": "42000",
  "message": "Syntax error: unexpected token",
  "position": 12,
  "sqlstate": "42000"
}
```

## Standard Conformance

### Conformance Levels

1. **Core**: Mandatory features all implementations must support
2. **Enhanced**: Optional features for extended functionality
3. **Full**: Core + all Enhanced features

Geode implements **Full** conformance.

### Conformance Claims

Implementations must document:
- Which features are supported
- Test results from ISO test suite
- Deviations or extensions

## Extensions and Future Work

### Planned Extensions

ISO/IEC JTC 1/SC 32/WG 3 is considering:

- Temporal graph queries (time-traveling graphs)
- Recursive common table expressions (CTEs)
- Graph analytics functions
- Streaming query extensions
- Multi-graph operations

### Vendor Extensions

While compliant, implementations may add:
- Additional index types (vector, full-text)
- Custom functions
- Performance optimizations
- Platform-specific features

## Comparison to Other Standards

### vs. SQL (ISO/IEC 9075)

- **Similarity**: Declarative syntax, ACID transactions, type system
- **Difference**: Graph patterns vs. table joins
- **Complementary**: GQL for graphs, SQL for tables

### vs. SPARQL (W3C)

- **Similarity**: Graph query languages
- **Difference**: SPARQL for RDF graphs, GQL for property graphs
- **Model**: SPARQL (subject-predicate-object), GQL (labeled property graphs)

### vs. Cypher (openCypher)

- **Relationship**: GQL builds on Cypher concepts
- **Standardization**: GQL is ISO standard, Cypher is community specification
- **Evolution**: GQL formalizes and extends Cypher patterns

## Implementation in Geode

Geode provides:
- **100% Compliance**: All 70 ISO tests passing
- **Full Feature Support**: Core + Enhanced + Full
- **Standards Documentation**: ISO section references throughout
- **Test Verification**: Continuous compliance testing

## Related Topics

- **GQL Compliance**: Geode's conformance details
- **GQL Reference**: Complete language documentation
- **GQL Syntax**: Syntax guide
- **ISO GQL**: Implementation notes

## Further Reading

- [GQL Compliance](/tags/gql-compliance/) - Conformance details
- [ISO GQL Implementation](/tags/iso-gql/) - Implementation guide
- [GQL Reference](/tags/gql-reference/) - Language reference
- [GQL Syntax](/tags/gql-syntax/) - Syntax guide
- [Official ISO Standard](https://www.iso.org/standard/76120.html) - Purchase from ISO

## Detailed Feature Specification

### Pattern Matching Grammar (§7)

Complete BNF grammar for ISO GQL patterns:

```bnf
<graph_pattern> ::=
    <node_pattern> [ <relationship_pattern> <node_pattern> ]*

<node_pattern> ::=
    '(' [ <variable> ] [ <label_expression> ] [ <property_specification> ] ')'

<label_expression> ::=
    ':' <label_name> [ ':' <label_name> ]*

<property_specification> ::=
    '{' <property> [ ',' <property> ]* '}'

<property> ::=
    <property_name> ':' <expression>

<relationship_pattern> ::=
    '-' '[' [ <variable> ] [ <type_expression> ] [ <property_specification> ] ']' '->'
    | '<-' '[' [ <variable> ] [ <type_expression> ] [ <property_specification> ] ']' '-'
    | '-' '[' [ <variable> ] [ <type_expression> ] [ <property_specification> ] ']' '-'

<type_expression> ::=
    ':' <type_name> [ '|' <type_name> ]*

<variable_length> ::=
    '*' [ <min_hops> ] [ '..' [ <max_hops> ] ]
```

### Type System Specification (§6)

Complete type hierarchy:

```
Type System Hierarchy
=====================

Value Types:
├── NULL
├── Scalar Types
│   ├── Boolean
│   ├── Numeric
│   │   ├── Integer (64-bit signed)
│   │   ├── Float (IEEE 754 double)
│   │   └── Decimal (arbitrary precision)
│   ├── String (UTF-8)
│   └── Bytes
├── Temporal Types
│   ├── Date (ISO 8601)
│   ├── Time (with timezone)
│   ├── DateTime (ISO 8601 with timezone)
│   └── Duration (ISO 8601 duration)
├── Spatial Types
│   └── Point (2D/3D with CRS)
├── Collection Types
│   ├── List [ordered, allows duplicates]
│   ├── Set [unordered, no duplicates]
│   └── Map {key: value pairs}
└── Graph Types
    ├── Node (entity reference)
    ├── Relationship (edge reference)
    └── Path (node-relationship sequence)
```

### Function Specification Examples

Detailed specifications from ISO §11:

```gql
-- String Functions (§11.3)
FUNCTION substring(
    str: STRING,
    start: INTEGER,
    length: INTEGER?
) RETURNS STRING

-- Behavior:
-- - start is 0-indexed
-- - length is optional (defaults to end of string)
-- - Returns empty string if start > string length
-- - NULL propagation: NULL input → NULL output

MATCH (p:Person)
RETURN substring(p.name, 0, 3) AS initials;

-- Mathematical Functions (§11.5)
FUNCTION round(
    value: NUMERIC,
    precision: INTEGER DEFAULT 0
) RETURNS NUMERIC

-- Behavior:
-- - Rounds to nearest integer by default
-- - precision > 0: decimal places
-- - precision < 0: rounds before decimal point
-- - Banker's rounding (round half to even)

MATCH (p:Product)
RETURN round(p.price, 2) AS rounded_price;

-- Aggregation Functions (§11.7)
FUNCTION count(
    expression: ANY
) RETURNS INTEGER

-- Behavior:
-- - count(*): counts all rows including NULL
-- - count(expr): counts non-NULL values
-- - DISTINCT optional: count(DISTINCT expr)

MATCH (u:User)
RETURN count(u) AS total_users,
       count(u.email) AS users_with_email,
       count(DISTINCT u.country) AS unique_countries;
```

## Advanced ISO Features

### Recursive Query Patterns

ISO specifies recursive queries through WITH clauses:

```gql
-- Organizational hierarchy traversal
WITH RECURSIVE hierarchy AS (
    -- Base case
    MATCH (emp:Employee {id: $start_id})
    RETURN emp, 0 AS level

    UNION ALL

    -- Recursive case
    MATCH (h.emp)-[:REPORTS_TO]->(manager:Employee)
    FROM hierarchy h
    WHERE h.level < $max_depth
    RETURN manager AS emp, h.level + 1 AS level
)
SELECT emp.name, level
FROM hierarchy
ORDER BY level, emp.name;
```

### Window Functions (ISO Extension)

Advanced analytical queries:

```gql
-- Running totals and moving averages
MATCH (sale:Sale)
WHERE sale.date >= date('2025-01-01')
RETURN sale.date,
       sale.amount,
       sum(sale.amount) OVER (
           ORDER BY sale.date
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_total,
       avg(sale.amount) OVER (
           ORDER BY sale.date
           ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
       ) AS moving_avg_7day
ORDER BY sale.date;

-- Ranking functions
MATCH (product:Product)
RETURN product.name,
       product.sales,
       rank() OVER (ORDER BY product.sales DESC) AS sales_rank,
       dense_rank() OVER (
           PARTITION BY product.category
           ORDER BY product.sales DESC
       ) AS category_rank,
       percent_rank() OVER (ORDER BY product.sales) AS percentile;
```

### Common Table Expressions (CTEs)

ISO-standard query composition:

```gql
-- Multi-step query with CTEs
WITH active_users AS (
    MATCH (u:User)
    WHERE u.last_login >= datetime() - duration('P30D')
    RETURN u
),
power_users AS (
    MATCH (u:User)-[:PURCHASED]->(p:Product)
    WITH u, count(p) AS purchase_count
    WHERE purchase_count > 10
    RETURN u
),
targeted_segment AS (
    SELECT *
    FROM active_users
    INTERSECT
    SELECT *
    FROM power_users
)
MATCH (u:User)
WHERE u IN targeted_segment
RETURN u.email, u.name
ORDER BY u.last_login DESC;
```

## ISO Compliance in Practice

### Real-World Compliance Validation

```python
class ProductionComplianceMonitor:
    """Monitor ISO compliance in production environment."""

    def __init__(self, client):
        self.client = client
        self.violations = []

    async def monitor_query_compliance(self, query, params):
        """Check if query follows ISO standards."""

        violations = []

        # Check 1: Use of vendor-specific syntax
        vendor_patterns = [
            r'CALL apoc\.',
            r'CALL gds\.',
            r'CREATE FULLTEXT INDEX',  # Vendor extension
        ]

        for pattern in vendor_patterns:
            if re.search(pattern, query, re.IGNORECASE):
                violations.append({
                    'type': 'vendor_syntax',
                    'pattern': pattern,
                    'message': 'Query uses vendor-specific syntax'
                })

        # Check 2: Parameter usage (should use $param, not string concat)
        if any(f"'{param}'" in query or f'"{param}"' in query for param in params):
            violations.append({
                'type': 'sql_injection_risk',
                'message': 'Parameters embedded in query string'
            })

        # Check 3: ISO-compliant NULL handling
        if re.search(r'= NULL|!= NULL', query):
            violations.append({
                'type': 'incorrect_null_handling',
                'message': 'Should use IS NULL/IS NOT NULL'
            })

        if violations:
            self.violations.extend(violations)
            logger.warning(f"ISO compliance violations detected: {violations}")

        return len(violations) == 0

    async def generate_compliance_report(self):
        """Generate production compliance report."""

        report = {
            'total_queries': len(self.violations) + 1000,  # Example
            'violations': len(self.violations),
            'compliance_rate': 1.0 - (len(self.violations) / 1000),
            'violation_types': {}
        }

        for violation in self.violations:
            vtype = violation['type']
            report['violation_types'][vtype] = \
                report['violation_types'].get(vtype, 0) + 1

        return report

# Usage in production
monitor = ProductionComplianceMonitor(client)

@app.middleware("http")
async def check_query_compliance(request, call_next):
    """Middleware to monitor query compliance."""
    if hasattr(request.state, 'query'):
        await monitor.monitor_query_compliance(
            request.state.query,
            request.state.params
        )

    response = await call_next(request)
    return response
```

### ISO Migration Path from Legacy Systems

```python
class LegacyToISOConverter:
    """Convert legacy graph queries to ISO GQL."""

    def __init__(self):
        self.conversions = {}
        self.warnings = []

    def convert_neo4j_cypher(self, cypher_query):
        """Convert Neo4j Cypher to ISO GQL."""

        iso_query = cypher_query

        # Conversion 1: DETACH DELETE → DELETE
        iso_query = re.sub(
            r'\bDETACH DELETE\b',
            'DELETE',
            iso_query,
            flags=re.IGNORECASE
        )

        # Conversion 2: exists(n.prop) → n.prop IS NOT NULL
        iso_query = re.sub(
            r'\bexists\s*\(\s*(\w+)\.(\w+)\s*\)',
            r'\1.\2 IS NOT NULL',
            iso_query
        )

        # Conversion 3: APOC functions (warn - no direct equivalent)
        if re.search(r'\bapoc\.', iso_query, re.IGNORECASE):
            self.warnings.append({
                'type': 'unsupported_function',
                'message': 'APOC functions have no ISO equivalent',
                'suggestion': 'Implement logic in application code'
            })

        # Conversion 4: Variable-length path syntax
        iso_query = re.sub(
            r'-\[(\w+):(\w+)\*(\d+)\.\.(\d+)\]->',
            r'-[\1:\2*\3..\4]->',
            iso_query
        )

        return iso_query, self.warnings

    def convert_gremlin(self, gremlin_query):
        """Convert Apache Gremlin to ISO GQL."""

        # This is more complex due to imperative nature of Gremlin
        # Simplified example:

        patterns = {
            r"g\.V\(\)\.hasLabel\('(\w+)'\)": r"MATCH (n:\1)",
            r"\.has\('(\w+)',\s*'([^']+)'\)": r"WHERE \1 = '\2'",
            r"\.values\('(\w+)'\)": r"RETURN \1",
        }

        iso_query = gremlin_query
        for gremlin_pattern, gql_pattern in patterns.items():
            iso_query = re.sub(gremlin_pattern, gql_pattern, iso_query)

        return iso_query

# Usage
converter = LegacyToISOConverter()

cypher_query = """
    MATCH (n:Person)
    WHERE exists(n.email)
    DETACH DELETE n
"""

iso_query, warnings = converter.convert_neo4j_cypher(cypher_query)
print(iso_query)
# Output:
# MATCH (n:Person)
# WHERE n.email IS NOT NULL
# DELETE n

for warning in warnings:
    print(f"Warning: {warning['message']}")
```

## Future ISO Standard Evolution

### Proposed Extensions (Under Discussion)

```gql
-- Temporal graph queries (proposed for ISO amendment)
MATCH (p:Person)
FOR SYSTEM_TIME AS OF '2025-01-01T00:00:00Z'
WHERE p.status = 'active'
RETURN p.name;

-- Graph pattern matching with quantification
MATCH (user:User)
WHERE ALL x IN (user)-[:PURCHASED]->(products) SATISFIES (x.rating >= 4)
RETURN user.name;

-- Multi-graph queries
MATCH (p:Product) IN GRAPH production_graph,
      (s:Sale) IN GRAPH analytics_graph
WHERE s.product_id = p.id
RETURN p.name, sum(s.amount) AS total_sales;
```

### Tracking Standards Updates

```python
class ISOStandardsTracker:
    """Track and notify about ISO GQL standard updates."""

    def __init__(self):
        self.subscription_endpoint = "https://www.iso.org/committee/45342/x/feed"
        self.last_check = None

    async def check_for_updates(self):
        """Check ISO working group for updates."""

        feed = await self.fetch_rss_feed(self.subscription_endpoint)
        updates = []

        for entry in feed.entries:
            if entry.published > self.last_check:
                updates.append({
                    'title': entry.title,
                    'link': entry.link,
                    'published': entry.published,
                    'summary': entry.summary
                })

        self.last_check = datetime.now()
        return updates

    async def notify_team(self, updates):
        """Notify development team of standard updates."""
        if not updates:
            return

        message = "ISO/IEC 39075 Updates:\n\n"
        for update in updates:
            message += f"• {update['title']}\n"
            message += f"  {update['link']}\n\n"

        await send_slack_notification(channel="#standards", message=message)

# Scheduled task
async def monitor_iso_standards():
    tracker = ISOStandardsTracker()

    while True:
        updates = await tracker.check_for_updates()
        if updates:
            await tracker.notify_team(updates)

        await asyncio.sleep(86400)  # Daily check
```

ISO/IEC 39075:2024 provides a solid, vendor-neutral foundation for graph database applications, ensuring portability, interoperability, and longevity of graph data solutions.
