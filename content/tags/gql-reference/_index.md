---
title: "GQL Reference Documentation"
description: "Complete GQL (Graph Query Language) reference for Geode: syntax, clauses, expressions, functions, and ISO/IEC 39075:2024 language specification."
keywords:
  - GQL reference
  - Graph Query Language
  - GQL documentation
  - GQL syntax
  - ISO GQL
  - query language
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/gql-reference/"
    noindex: false
---

Complete reference documentation for GQL (Graph Query Language), the ISO/IEC 39075:2024 standard language for graph databases. This guide covers all GQL syntax, clauses, expressions, functions, and advanced features as implemented in Geode.

## What is GQL?

GQL (Graph Query Language) is the ISO/IEC 39075:2024 international standard for querying property graph databases. It provides a declarative syntax for pattern matching, data manipulation, and graph traversal, similar to SQL for relational databases but optimized for highly connected data.

Key characteristics:
- **Declarative**: Describe what you want, not how to get it
- **Pattern-based**: Match graph patterns using visual ASCII art syntax
- **Composable**: Build complex queries from simple building blocks
- **Type-safe**: Strong typing with comprehensive type system
- **Standard**: ISO-standardized, vendor-neutral specification

## Query Structure

### Basic Query Pattern

```gql
MATCH pattern
WHERE conditions
RETURN expressions
ORDER BY sort_expressions
LIMIT row_count
```

### Complete Query Anatomy

```gql
// Graph pattern clause
MATCH (n:Label {property: value})-[r:TYPE]->(m)

// Optional patterns
OPTIONAL MATCH (n)-[:RELATED]->(opt)

// Filtering
WHERE n.age > 25 AND m.verified = true

// WITH clause for piping
WITH n, COUNT(m) AS connections
WHERE connections > 10

// Return results
RETURN n.name,
       connections,
       COLLECT(opt.name) AS related_items

// Post-processing
ORDER BY connections DESC
LIMIT 20
OFFSET 0
```

## Pattern Matching Syntax

### Node Patterns

```gql
// Anonymous node
()

// Named node variable
(n)

// Node with label
(n:User)

// Multiple labels
(n:User:Admin)

// Node with properties
(n:User {name: 'Alice', age: 30})

// Property pattern matching
(n:User) WHERE n.age > 25
```

### Relationship Patterns

```gql
// Undirected relationship
(a)-[]-(b)

// Directed relationship
(a)-->(b)
(a)<--(b)

// Named relationship
(a)-[r]->(b)

// Relationship with type
(a)-[r:KNOWS]->(b)

// Multiple relationship types
(a)-[r:KNOWS|FOLLOWS]->(b)

// Relationship with properties
(a)-[r:KNOWS {since: 2020}]->(b)

// Variable-length paths
(a)-[*]-(b)           // Any length
(a)-[*1..3]-(b)       // 1 to 3 hops
(a)-[*..5]-(b)        // Up to 5 hops
(a)-[*3..]-(b)        // 3 or more hops
```

### Path Patterns

```gql
// Named path
MATCH path = (a)-[:KNOWS*]->(b)
RETURN path

// Shortest path
MATCH path = SHORTEST (a)-[:KNOWS*]-(b)
WHERE a.name = 'Alice' AND b.name = 'Bob'
RETURN path

// All shortest paths
MATCH paths = ALL SHORTEST (a)-[:KNOWS*]-(b)
RETURN paths
```

## Data Manipulation Language (DML)

### CREATE

```gql
// Create nodes
CREATE (n:Label {property: value})

// Create relationships
MATCH (a:User {id: 1}), (b:User {id: 2})
CREATE (a)-[:KNOWS {since: 2024}]->(b)

// Create complex patterns
CREATE (a:User {name: 'Alice'})-[:POSTED]->(p:Post {title: 'Hello'}),
       (a)-[:FOLLOWS]->(b:User {name: 'Bob'})
```

### SET

```gql
// Set properties
MATCH (n:User {id: 1})
SET n.name = 'New Name',
    n.updated_at = NOW()

// Set all properties from map
MATCH (n:User {id: 1})
SET n = {name: 'Alice', age: 30}

// Add properties from map
MATCH (n:User {id: 1})
SET n += {city: 'NYC', verified: true}

// Add labels
MATCH (n:User {id: 1})
SET n:Admin:Verified
```

### DELETE

```gql
// Delete relationships
MATCH (a)-[r:KNOWS]->(b)
WHERE a.id = 1
DELETE r

// Delete nodes (must not have relationships)
MATCH (n:User {id: 1})
DELETE n

// Delete node and all relationships
MATCH (n:User {id: 1})
DETACH DELETE n

// Conditional delete
MATCH (n:TempData)
WHERE n.created_at < DATE('2024-01-01')
DETACH DELETE n
```

### MERGE

```gql
// Upsert pattern
MERGE (u:User {email: 'alice@example.com'})
ON CREATE SET u.created_at = NOW(), u.login_count = 1
ON MATCH SET u.last_login = NOW(), u.login_count = u.login_count + 1
RETURN u

// Merge relationships
MATCH (a:User {id: 1}), (b:User {id: 2})
MERGE (a)-[r:KNOWS]->(b)
ON CREATE SET r.since = NOW()
RETURN r
```

## Schema Definition Language (DDL)

### Indexes

```gql
// Create index
CREATE INDEX FOR (n:Label) ON (n.property)

// Named index
CREATE INDEX index_name FOR (n:Label) ON (n.property)

// Composite index
CREATE INDEX FOR (n:Label) ON (n.prop1, n.prop2, n.prop3)

// Index types
CREATE INDEX FOR (n:Label) ON (n.property)         // B-tree (default)
CREATE HASH INDEX FOR (n:Label) ON (n.property)    // Hash
CREATE TEXT INDEX FOR (n:Label) ON (n.property)    // Full-text
CREATE VECTOR INDEX FOR (n:Label) ON (n.embedding) // Vector similarity

// Drop index
DROP INDEX index_name
```

### Constraints

```gql
// Uniqueness
CREATE CONSTRAINT ON (n:Label) ASSERT n.property IS UNIQUE

// Existence
CREATE CONSTRAINT ON (n:Label) ASSERT EXISTS(n.property)

// Type constraint
CREATE CONSTRAINT ON (n:Label) ASSERT n.property IS :: TYPE

// Check constraint
CREATE CONSTRAINT ON (n:Label) ASSERT n.age >= 0 AND n.age <= 150

// Drop constraint
DROP CONSTRAINT constraint_name
```

## Expressions and Operators

### Comparison

```gql
=, <>, !=, <, >, <=, >=
IS NULL, IS NOT NULL
IN [list]
BETWEEN min AND max
STARTS WITH, ENDS WITH, CONTAINS
=~ (regex match)
```

### Logical

```gql
AND, OR, NOT, XOR
```

### Arithmetic

```gql
+, -, *, /, %, ^
```

### String

```gql
+ (concatenation)
|| (concatenation)
```

### List

```gql
[element1, element2, ...]    // Literal
list[index]                   // Access
list[start..end]             // Slice
IN list                       // Membership
+ (concatenation)
```

## Built-in Functions

### Aggregation

```gql
COUNT(*), COUNT(expr)
SUM(expr)
AVG(expr)
MIN(expr), MAX(expr)
COLLECT(expr)
STRING_AGG(expr, delimiter)
```

### String

```gql
UPPER(str), LOWER(str)
TRIM(str), LTRIM(str), RTRIM(str)
SUBSTRING(str, start, length)
LENGTH(str)
CONCAT(str1, str2, ...)
REPLACE(str, search, replace)
SPLIT(str, delimiter)
```

### Mathematical

```gql
ABS(num), CEIL(num), FLOOR(num), ROUND(num, precision)
SQRT(num), POWER(base, exponent)
SIN(num), COS(num), TAN(num)
LOG(num), LOG10(num), EXP(num)
RAND()
```

### Temporal

```gql
NOW(), CURRENT_TIMESTAMP, CURRENT_DATE, CURRENT_TIME
DATE(str), DATETIME(str), TIME(str)
DURATION(str)
```

### List

```gql
SIZE(list)
HEAD(list), LAST(list), TAIL(list)
REVERSE(list)
RANGE(start, end, step)
```

### Path

```gql
LENGTH(path)
NODES(path)
RELATIONSHIPS(path)
```

### Type Conversion

```gql
TOSTRING(val)
TOINTEGER(val)
TOFLOAT(val)
TOBOOLEAN(val)
```

## Advanced Features

### Subqueries

```gql
// EXISTS subquery
MATCH (u:User)
WHERE EXISTS {
  MATCH (u)-[:PURCHASED]->(p:Product)
  WHERE p.price > 1000
}
RETURN u

// COUNT subquery
MATCH (u:User)
RETURN u.name, COUNT {
  MATCH (u)-[:POSTED]->(p:Post)
  WHERE p.published = true
} AS post_count
```

### CASE Expressions

```gql
MATCH (u:User)
RETURN u.name,
  CASE
    WHEN u.age < 18 THEN 'minor'
    WHEN u.age < 65 THEN 'adult'
    ELSE 'senior'
  END AS age_group
```

### List Comprehensions

```gql
MATCH (u:User)
RETURN [tag IN u.tags WHERE LENGTH(tag) > 5] AS long_tags

RETURN [x IN RANGE(1, 10) | x * x] AS squares
```

### Pattern Comprehensions

```gql
MATCH (u:User)
RETURN u.name, [(u)-[:FRIEND]->(f) | f.name] AS friend_names
```

## Transaction Control

```gql
BEGIN TRANSACTION;
  // statements
COMMIT;

// Or rollback
ROLLBACK;

// Savepoints
BEGIN TRANSACTION;
  SAVEPOINT sp1;
  // statements
  ROLLBACK TO SAVEPOINT sp1;
COMMIT;
```

## Query Optimization

### EXPLAIN and PROFILE

```gql
// Show query plan
EXPLAIN MATCH (u:User)-[:KNOWS]->(f) RETURN u, f

// Show execution metrics
PROFILE MATCH (u:User)-[:KNOWS]->(f) RETURN u, f
```

## Best Practices

1. **Use Parameters**: Never concatenate user input into queries
2. **Create Indexes**: Index frequently queried properties
3. **Limit Results**: Always use LIMIT for exploratory queries
4. **Filter Early**: Apply WHERE clauses before expensive operations
5. **Use WITH**: Break complex queries into readable stages
6. **Avoid Cartesian Products**: Always connect patterns with relationships
7. **Profile Queries**: Use PROFILE to identify bottlenecks

## Related Topics

- **GQL Syntax**: Detailed syntax guide
- **GQL Operators**: Complete operator reference
- **GQL Functions**: Built-in function documentation
- **Data Types**: GQL type system
- **ISO Standard**: ISO/IEC 39075:2024 specification

## Further Reading

- [GQL Syntax Guide](/tags/gql-syntax/) - Detailed syntax documentation
- [GQL Operators](/tags/operators/) - Operator reference
- [Built-in Functions](/tags/functions/) - Function catalog
- [Data Types](/tags/types/) - Type system documentation
- [ISO/IEC 39075:2024](/tags/iso-standard/) - Official standard

This reference provides comprehensive documentation for writing GQL queries in Geode, from basic pattern matching to advanced features and optimization techniques.
