---
title: "Complete GQL API Reference"
description: "Comprehensive API reference for Geode's GQL implementation including all keywords, functions, data types, operators, and procedures with detailed examples."
summary: "Auto-generated complete API reference documenting 100+ GQL functions, 60+ keywords, 19 data types, and graph algorithms with syntax and examples."
slug: "api-reference-complete"
url: "/docs/reference/api-reference-complete/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 10
keywords: ["GQL API", "function reference", "keyword reference", "data types", "graph query language", "ISO GQL", "operators", "procedures"]
tags: ["reference", "API", "GQL", "functions"]
categories: ["Reference"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/reference/api-reference-complete/"
    noindex: false
---

<!-- CANARY: REQ=REQ-API-DOCS-002; FEATURE="APIDocumentation"; ASPECT=BuildTarget; STATUS=EXEMPT; OWNER=tooling; UPDATED=2026-01-03 -->

## Overview

This document provides a complete reference for Geode's GQL (Graph Query Language) implementation, including all keywords, functions, types, and procedures. Features align with the ISO/IEC 39075:2024 compliance.

**Auto-generated from**: `src/gql/language_metadata.zig`
**Last updated**: 2026-01-03
**GQL Conformance Profile**: ISO/IEC 39075:2024 compliance (see conformance profile)

### Quick Navigation

- [Keywords](#keywords) - GQL language keywords
- [Functions](#functions) - Built-in functions
- [Data Types](#data-types) - Type system
- [Operators](#operators) - Expression operators
- [Procedures](#procedures) - Graph algorithms

## Keywords

### Clause Keywords

Keywords used to define query clauses and structure:

| Keyword | Description | GQL Standard | Example |
|---------|-------------|--------------|---------|
| `CALL` | Invoke a procedure | Yes | `CALL algo.pagerank.stream()` |
| `CASE` | Begin conditional expression | Yes | `CASE WHEN n.age > 18 THEN 'adult' END` |
| `CREATE` | Create nodes or edges | Yes | `CREATE (n:Person {name: 'Alice'})` |
| `DELETE` | Delete nodes or edges | Yes | `DELETE n` |
| `DETACH` | Detach delete (remove edges first) | Yes | `DETACH DELETE n` |
| `ELSE` | Else branch in CASE | Yes | `CASE ... ELSE 'default' END` |
| `END` | End of CASE expression | Yes | `CASE ... END` |
| `EXPLAIN` | Show query execution plan | Yes | `EXPLAIN MATCH (n) RETURN n` |
| `FILTER` | Filter clause | Yes | `MATCH p = (a)-[*]-(b) WHERE all(r IN relationships(p) WHERE r.weight > 0)` |
| `FINISH` | Finish linear graph query | Yes | `FINISH` |
| `FOREACH` | Iterate over a list | Extension | `FOREACH (x IN [1,2,3] | CREATE (:Node {val: x}))` |
| `FROM` | Source specification | Yes | `SELECT * FROM users` |
| `INSERT` | Insert data | Yes | `INSERT (n:Person {name: 'Bob'})` |
| `JOIN` | Join operation | Yes | `FROM users u JOIN orders o ON u.id = o.user_id` |
| `LET` | Variable binding | Yes | `LET x = 10 IN RETURN x` |
| `LIMIT` | Limit number of results | Yes | `RETURN n LIMIT 10` |
| `LOAD` | Load data from file | Extension | `LOAD CSV FROM 'data.csv' AS row` |
| `MATCH` | Pattern matching clause | Yes | `MATCH (n:Person) RETURN n` |
| `MERGE` | Match or create pattern | Yes | `MERGE (n:Person {id: 123})` |
| `OFFSET` | Skip results (alias for SKIP) | Yes | `RETURN n OFFSET 10` |
| `OTHERWISE` | Otherwise branch | Yes | `CASE ... OTHERWISE 'default' END` |
| `PROFILE` | Profile query execution | Yes | `PROFILE MATCH (n) RETURN n` |
| `REMOVE` | Remove properties or labels | Yes | `REMOVE n.age, n:OldLabel` |
| `REPLACE` | Replace existing data | Yes | `REPLACE (n:Person {id: 1, name: 'Updated'})` |
| `RETURN` | Return results from query | Yes | `MATCH (n) RETURN n.name` |
| `SCAN` | Table scan operation | Extension | `SCAN TABLE users` |
| `SELECT` | Select clause (table-like) | Yes | `SELECT name, age FROM Person` |
| `SET` | Set properties or variables | Yes | `SET n.age = 30` |
| `SHOW` | Show metadata | Yes | `SHOW GRAPHS` |
| `SKIP` | Skip N results | Yes | `RETURN n SKIP 10` |
| `THEN` | Then branch in CASE | Yes | `CASE WHEN ... THEN 'value'` |
| `UNWIND` | Unwind a list into rows | Yes | `UNWIND [1,2,3] AS x RETURN x` |
| `VALUE` | Value specification | Yes | `INSERT (:Person) VALUE {name: 'Alice'}` |
| `VALUES` | Multiple values | Yes | `VALUES (1), (2), (3)` |
| `WHEN` | When branch in CASE | Yes | `CASE WHEN n.age > 18` |
| `WHERE` | Filter condition | Yes | `MATCH (n) WHERE n.age > 25` |
| `WITH` | Intermediate result binding | Yes | `MATCH (n) WITH n, count(*) AS c RETURN n, c` |

### DDL Keywords

Data Definition Language keywords:

| Keyword | Description | GQL Standard |
|---------|-------------|--------------|
| `ASSERT` | Assert constraint condition | Extension |
| `CONSTRAINT` | Define a constraint | Yes |
| `DROP` | Drop graphs, schemas, or constraints | Yes |
| `GRAPH` | Graph reference | Yes |
| `INDEX` | Index definition | Yes |
| `KEY` | Key constraint | Yes |
| `PROPERTY` | Property definition | Yes |
| `REQUIRE` | Require constraint | Yes |
| `SCHEMA` | Schema definition | Yes |
| `TABLE` | Table reference | Yes |

### Boolean & Logical Keywords

| Keyword | Description | Example |
|---------|-------------|---------|
| `AND` | Logical AND operator | `WHERE a AND b` |
| `CONTAINS` | String containment | `WHERE name CONTAINS 'Alice'` |
| `ENDS` | String ends-with | `WHERE name ENDS WITH 'son'` |
| `EXISTS` | Existence predicate | `WHERE EXISTS { MATCH (n)-[:KNOWS]->() }` |
| `FALSE` | Boolean false literal | `RETURN FALSE` |
| `IN` | Membership predicate | `WHERE age IN [25, 30, 35]` |
| `IS` | Type/NULL checking | `WHERE n IS NOT NULL` |
| `LIKE` | Pattern matching | `WHERE name LIKE '%Smith%'` |
| `NOT` | Logical NOT operator | `WHERE NOT n.active` |
| `NULL` | NULL literal | `RETURN NULL` |
| `OR` | Logical OR operator | `WHERE a OR b` |
| `STARTS` | String starts-with | `WHERE name STARTS WITH 'A'` |
| `TRUE` | Boolean true literal | `RETURN TRUE` |
| `UNKNOWN` | Unknown truth value | `RETURN UNKNOWN` |
| `XOR` | Logical XOR operator | `WHERE a XOR b` |

### Transaction Keywords

| Keyword | Description |
|---------|-------------|
| `BEGIN` | Begin a transaction |
| `COMMIT` | Commit the current transaction |
| `READ` | Read transaction mode |
| `REPEATABLE` | Repeatable read isolation |
| `ROLLBACK` | Rollback transaction |
| `START` | Start transaction |
| `TRANSACTION` | Transaction keyword |
| `WRITE` | Write transaction mode |

### Path Pattern Keywords

| Keyword | Description |
|---------|-------------|
| `ACYCLIC` | Restricts paths to acyclic (no repeated nodes) |
| `SHORTEST` | Shortest path pattern |
| `SIMPLE` | Simple path (no repeated edges) |
| `TRAIL` | Trail path (no repeated edges) |
| `WALK` | Walk path (any path) |

### Set Operation Keywords

| Keyword | Description |
|---------|-------------|
| `EXCEPT` | Set difference operation |
| `INTERSECT` | Set intersection operation |
| `UNION` | Set union operation |

## Functions

### Aggregate Functions

#### `count(expr: ANY) -> INTEGER`

Count the number of non-null values.

```gql
MATCH (n:Person)
RETURN count(n) AS total_people
```

**Variations**:
- `count(*)` - Count all rows (including nulls)
- `count(DISTINCT n.age)` - Count unique values

#### `sum(expr: NUMERIC) -> NUMERIC`

Sum of numeric values.

```gql
MATCH (p:Product)
RETURN sum(p.price) AS total_revenue
```

#### `avg(expr: NUMERIC) -> FLOAT`

Average of numeric values.

```gql
MATCH (u:User)
RETURN avg(u.age) AS average_age
```

#### `min(expr: ANY) -> ANY`

Minimum value.

```gql
MATCH (p:Product)
RETURN min(p.price) AS cheapest
```

#### `max(expr: ANY) -> ANY`

Maximum value.

```gql
MATCH (t:Transaction)
RETURN max(t.timestamp) AS latest_transaction
```

#### `collect(expr: ANY) -> LIST`

Collect values into a list.

```gql
MATCH (u:User)
RETURN collect(u.name) AS all_names
```

### Mathematical Functions

#### `abs(x: NUMERIC) -> NUMERIC`

Absolute value.

```gql
RETURN abs(-42) AS result  -- Returns: 42
```

#### `ceil(x: FLOAT) -> INTEGER`

Ceiling (round up).

```gql
RETURN ceil(3.2) AS result  -- Returns: 4
```

#### `floor(x: FLOAT) -> INTEGER`

Floor (round down).

```gql
RETURN floor(3.8) AS result  -- Returns: 3
```

#### `round(x: FLOAT) -> INTEGER`

Round to nearest integer.

```gql
RETURN round(3.5) AS result  -- Returns: 4
```

#### `sqrt(x: NUMERIC) -> FLOAT`

Square root.

```gql
RETURN sqrt(16) AS result  -- Returns: 4.0
```

#### `rand() -> FLOAT`

Random number between 0 and 1.

```gql
RETURN rand() AS random_value
```

#### `sign(x: NUMERIC) -> INTEGER`

Sign of a number (-1, 0, or 1).

```gql
RETURN sign(-5) AS result  -- Returns: -1
```

#### `exp(x: NUMERIC) -> FLOAT`

Exponential (e^x).

```gql
RETURN exp(1) AS e  -- Returns: 2.718281828...
```

#### `log(x: NUMERIC) -> FLOAT`

Natural logarithm.

```gql
RETURN log(10) AS result
```

#### `log10(x: NUMERIC) -> FLOAT`

Base-10 logarithm.

```gql
RETURN log10(100) AS result  -- Returns: 2.0
```

#### Trigonometric Functions

```gql
RETURN sin(pi()/2) AS sine      -- Returns: 1.0
RETURN cos(0) AS cosine         -- Returns: 1.0
RETURN tan(pi()/4) AS tangent   -- Returns: 1.0
RETURN asin(0.5) AS arcsine
RETURN acos(0.5) AS arccosine
RETURN atan(1) AS arctangent    -- Returns: 0.785398... (π/4)
RETURN atan2(1, 1) AS arctan2   -- Returns: 0.785398... (π/4)
```

#### Constants

```gql
RETURN pi() AS pi  -- Returns: 3.14159265358979...
RETURN e() AS e    -- Returns: 2.71828182845904...
```

#### Angle Conversion

```gql
RETURN degrees(pi()) AS deg     -- Returns: 180.0
RETURN radians(180) AS rad      -- Returns: 3.14159...
```

### String Functions

#### `size(value: STRING|LIST) -> INTEGER`

Length of string or list.

```gql
RETURN size('hello') AS len           -- Returns: 5
RETURN size([1, 2, 3, 4, 5]) AS len   -- Returns: 5
```

#### `length(path: PATH) -> INTEGER`

Length of a path.

```gql
MATCH p = (a)-[*]-(b)
RETURN length(p) AS hop_count
```

#### `substring(str: STRING, start: INTEGER, length: INTEGER) -> STRING`

Extract substring.

```gql
RETURN substring('hello world', 0, 5) AS result  -- Returns: 'hello'
```

#### `replace(str: STRING, search: STRING, replacement: STRING) -> STRING`

Replace occurrences in string.

```gql
RETURN replace('hello world', 'world', 'universe')  -- Returns: 'hello universe'
```

#### `toLower(str: STRING) -> STRING`

Convert to lowercase.

```gql
RETURN toLower('HELLO') AS result  -- Returns: 'hello'
```

#### `toUpper(str: STRING) -> STRING`

Convert to uppercase.

```gql
RETURN toUpper('hello') AS result  -- Returns: 'HELLO'
```

#### `trim(str: STRING) -> STRING`

Remove leading/trailing whitespace.

```gql
RETURN trim('  hello  ') AS result  -- Returns: 'hello'
```

#### `lTrim(str: STRING) -> STRING`

Remove leading whitespace.

```gql
RETURN lTrim('  hello') AS result  -- Returns: 'hello'
```

#### `rTrim(str: STRING) -> STRING`

Remove trailing whitespace.

```gql
RETURN rTrim('hello  ') AS result  -- Returns: 'hello'
```

#### `left(str: STRING, n: INTEGER) -> STRING`

Get leftmost n characters.

```gql
RETURN left('hello world', 5) AS result  -- Returns: 'hello'
```

#### `right(str: STRING, n: INTEGER) -> STRING`

Get rightmost n characters.

```gql
RETURN right('hello world', 5) AS result  -- Returns: 'world'
```

#### `split(str: STRING, delimiter: STRING) -> LIST`

Split string into list.

```gql
RETURN split('a,b,c', ',') AS result  -- Returns: ['a', 'b', 'c']
```

#### `startsWith(str: STRING, prefix: STRING) -> BOOLEAN`

Check if string starts with prefix.

```gql
RETURN startsWith('hello world', 'hello') AS result  -- Returns: true
```

#### `endsWith(str: STRING, suffix: STRING) -> BOOLEAN`

Check if string ends with suffix.

```gql
RETURN endsWith('hello world', 'world') AS result  -- Returns: true
```

#### `contains(str: STRING, search: STRING) -> BOOLEAN`

Check if string contains substring.

```gql
RETURN contains('hello world', 'wor') AS result  -- Returns: true
```

### List Functions

#### `head(list: LIST) -> ANY`

First element of list.

```gql
RETURN head([1, 2, 3]) AS result  -- Returns: 1
```

#### `last(list: LIST) -> ANY`

Last element of list.

```gql
RETURN last([1, 2, 3]) AS result  -- Returns: 3
```

#### `tail(list: LIST) -> LIST`

All but first element.

```gql
RETURN tail([1, 2, 3]) AS result  -- Returns: [2, 3]
```

#### `reverse(list: LIST) -> LIST`

Reverse a list.

```gql
RETURN reverse([1, 2, 3]) AS result  -- Returns: [3, 2, 1]
```

#### `range(start: INTEGER, end: INTEGER, step: INTEGER) -> LIST`

Create a list of integers.

```gql
RETURN range(1, 10) AS nums        -- Returns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
RETURN range(0, 20, 5) AS nums     -- Returns: [0, 5, 10, 15, 20]
```

### Temporal Functions

#### `timestamp() -> INTEGER`

Current Unix timestamp in milliseconds.

```gql
RETURN timestamp() AS now
```

#### `date(value: STRING) -> DATE`

Create or get current date.

```gql
RETURN date('2024-01-15') AS specific_date
RETURN date() AS today
```

#### `time(value: STRING) -> TIME`

Create or get current time.

```gql
RETURN time('14:30:00') AS afternoon
RETURN time() AS now
```

#### `datetime(value: STRING) -> DATETIME`

Create or get current datetime.

```gql
RETURN datetime('2024-01-15T14:30:00Z') AS dt
RETURN datetime() AS now
```

#### `duration(value: STRING) -> DURATION`

Create a duration (ISO 8601 format).

```gql
RETURN duration('P1DT2H') AS one_day_two_hours
RETURN duration('PT30M') AS thirty_minutes
```

### Graph Functions

#### `id(element: NODE|RELATIONSHIP) -> INTEGER`

Get element ID.

```gql
MATCH (n:Person)
RETURN id(n) AS node_id
```

#### `type(rel: RELATIONSHIP) -> STRING`

Get relationship type.

```gql
MATCH (a)-[r]->(b)
RETURN type(r) AS relationship_type
```

#### `labels(node: NODE) -> LIST`

Get node labels.

```gql
MATCH (n)
RETURN labels(n) AS node_labels
```

#### `properties(element: NODE|RELATIONSHIP) -> MAP`

Get all properties as map.

```gql
MATCH (n:Person)
RETURN properties(n) AS all_props
```

#### `keys(element: NODE|RELATIONSHIP|MAP) -> LIST`

Get property keys.

```gql
MATCH (n:Person)
RETURN keys(n) AS property_names
```

#### `nodes(path: PATH) -> LIST`

Get nodes in a path.

```gql
MATCH p = (a)-[*]-(b)
RETURN nodes(p) AS path_nodes
```

#### `relationships(path: PATH) -> LIST`

Get relationships in a path.

```gql
MATCH p = (a)-[*]-(b)
RETURN relationships(p) AS path_edges
```

#### `indegree(node: NODE) -> INTEGER`

Number of incoming edges.

```gql
MATCH (n)
RETURN n.name, indegree(n) AS incoming_edges
ORDER BY indegree(n) DESC
LIMIT 10
```

#### `outdegree(node: NODE) -> INTEGER`

Number of outgoing edges.

```gql
MATCH (n)
RETURN n.name, outdegree(n) AS outgoing_edges
ORDER BY outdegree(n) DESC
LIMIT 10
```

### Path Functions

#### `shortestPath(pattern: PATTERN) -> PATH`

Find shortest path.

```gql
MATCH p = shortestPath((a:Person {name: 'Alice'})-[*]-(b:Person {name: 'Bob'}))
RETURN p
```

#### `allShortestPaths(pattern: PATTERN) -> LIST`

Find all shortest paths.

```gql
MATCH p = allShortestPaths((a:City)-[*]-(b:City))
WHERE a.name = 'New York' AND b.name = 'Los Angeles'
RETURN p
```

### Vector Functions

#### `vectorf32(list: LIST) -> VECTOR`

Create a float32 vector from list.

```gql
RETURN vectorf32([1.0, 2.0, 3.0, 4.0]) AS embedding
```

#### `vectori32(list: LIST) -> VECTOR`

Create an int32 vector from list.

```gql
RETURN vectori32([1, 2, 3, 4]) AS int_vector
```

#### `vector_l2(v1: VECTOR, v2: VECTOR) -> FLOAT`

L2 (Euclidean) distance between vectors.

```gql
MATCH (n:Document)
RETURN n.title, vector_l2(n.embedding, $query_embedding) AS distance
ORDER BY distance ASC
LIMIT 10
```

#### `vector_cosine(v1: VECTOR, v2: VECTOR) -> FLOAT`

Cosine distance between vectors.

```gql
MATCH (n:Product)
RETURN n.name, vector_cosine(n.features, $target_features) AS distance
ORDER BY distance ASC
LIMIT 5
```

#### `vector_dot(v1: VECTOR, v2: VECTOR) -> FLOAT`

Dot product of vectors.

```gql
RETURN vector_dot(vectorf32([1, 2, 3]), vectorf32([4, 5, 6])) AS dot_product
-- Returns: 32.0 (1*4 + 2*5 + 3*6)
```

#### `distance(v1: VECTOR, v2: VECTOR) -> FLOAT`

Default distance metric (L2).

```gql
MATCH (n:Image)
RETURN n.filename, distance(n.embedding, $query) AS similarity
ORDER BY similarity ASC
LIMIT 20
```

#### `similarity(v1: VECTOR, v2: VECTOR) -> FLOAT`

Cosine similarity (1 - cosine_distance).

```gql
MATCH (n:Article)
RETURN n.title, similarity(n.embedding, $query) AS relevance
ORDER BY relevance DESC
LIMIT 10
```

#### `cosine(v1: VECTOR, v2: VECTOR) -> FLOAT`

Cosine similarity (alias for similarity).

```gql
MATCH (n:User)
RETURN n.name, cosine(n.preferences, $user_profile) AS match_score
ORDER BY match_score DESC
```

#### `euclidean(v1: VECTOR, v2: VECTOR) -> FLOAT`

Euclidean distance (alias for vector_l2).

```gql
RETURN euclidean(vectorf32([0, 0]), vectorf32([3, 4])) AS distance
-- Returns: 5.0
```

#### `manhattan(v1: VECTOR, v2: VECTOR) -> FLOAT`

Manhattan (L1) distance.

```gql
RETURN manhattan(vectorf32([1, 2]), vectorf32([4, 6])) AS distance
-- Returns: 7.0 (|1-4| + |2-6|)
```

### Conversion Functions

#### `toInteger(value: ANY) -> INTEGER`

Convert to integer.

```gql
RETURN toInteger('42') AS num      -- Returns: 42
RETURN toInteger(3.14) AS num      -- Returns: 3
RETURN toInteger(true) AS num      -- Returns: 1
```

#### `toFloat(value: ANY) -> FLOAT`

Convert to float.

```gql
RETURN toFloat('3.14') AS num      -- Returns: 3.14
RETURN toFloat(42) AS num          -- Returns: 42.0
```

#### `toString(value: ANY) -> STRING`

Convert to string.

```gql
RETURN toString(42) AS str         -- Returns: '42'
RETURN toString(3.14) AS str       -- Returns: '3.14'
RETURN toString(true) AS str       -- Returns: 'true'
```

#### `toBoolean(value: ANY) -> BOOLEAN`

Convert to boolean.

```gql
RETURN toBoolean('true') AS bool   -- Returns: true
RETURN toBoolean(1) AS bool        -- Returns: true
RETURN toBoolean(0) AS bool        -- Returns: false
```

### Predicate Functions

#### `all(variable: IDENTIFIER, list: LIST, predicate: BOOLEAN) -> BOOLEAN`

True if all elements satisfy predicate.

```gql
RETURN all(x IN [1,2,3,4,5] WHERE x > 0) AS result  -- Returns: true
RETURN all(x IN [1,2,3,4,5] WHERE x > 3) AS result  -- Returns: false
```

#### `any(variable: IDENTIFIER, list: LIST, predicate: BOOLEAN) -> BOOLEAN`

True if any element satisfies predicate.

```gql
RETURN any(x IN [1,2,3,4,5] WHERE x > 3) AS result  -- Returns: true
RETURN any(x IN [1,2,3] WHERE x > 10) AS result     -- Returns: false
```

#### `none(variable: IDENTIFIER, list: LIST, predicate: BOOLEAN) -> BOOLEAN`

True if no elements satisfy predicate.

```gql
RETURN none(x IN [1,2,3] WHERE x > 10) AS result  -- Returns: true
RETURN none(x IN [1,2,3] WHERE x > 2) AS result   -- Returns: false
```

#### `single(variable: IDENTIFIER, list: LIST, predicate: BOOLEAN) -> BOOLEAN`

True if exactly one element satisfies predicate.

```gql
RETURN single(x IN [1,2,3,4,5] WHERE x > 4) AS result  -- Returns: true
RETURN single(x IN [1,2,3,4,5] WHERE x > 3) AS result  -- Returns: false
```

#### `coalesce(values: ANY...) -> ANY`

Return first non-null value.

```gql
MATCH (n:Person)
RETURN coalesce(n.nickname, n.name, 'Unknown') AS display_name
```

#### `nullIf(value: ANY, null_value: ANY) -> ANY`

Return NULL if values are equal.

```gql
RETURN nullIf(n.status, 'inactive') AS active_status
```

## Data Types

| Type | Description | Example |
|------|-------------|---------|
| `INTEGER` | 64-bit signed integer | `42`, `-100`, `0` |
| `FLOAT` | 64-bit floating point | `3.14`, `-0.5`, `1.0e10` |
| `STRING` | Unicode string | `'hello'`, `"world"` |
| `BOOLEAN` | Boolean value | `true`, `false` |
| `DATE` | Calendar date | `date('2024-01-15')` |
| `TIME` | Time of day | `time('14:30:00')` |
| `DATETIME` | Date and time with timezone | `datetime('2024-01-15T14:30:00Z')` |
| `DURATION` | Time duration | `duration('P1DT2H')` |
| `POINT` | Geographic point | `point({latitude: 40.7, longitude: -74.0})` |
| `VECTOR` | Fixed-dimension numeric vector | `vectorf32([1.0, 2.0, 3.0])` |
| `UUID` | UUID identifier | `uuid('550e8400-e29b-41d4-a716-446655440000')` |
| `BYTES` | Binary data | `bytes('0x48656c6c6f')` |
| `JSON` | JSON document | `json('{"key": "value"}')` |
| `LIST` | Ordered collection | `[1, 2, 3]`, `['a', 'b', 'c']` |
| `MAP` | Key-value map | `{name: 'Alice', age: 30}` |
| `NODE` | Graph node element | `(n:Person {name: 'Alice'})` |
| `RELATIONSHIP` | Graph relationship element | `-[:KNOWS]->` |
| `PATH` | Graph path | `(a)-[:KNOWS]->(b)-[:KNOWS]->(c)` |
| `GRAPH` | Named graph | `GRAPH social_network` |
| `ANY` | Any type (wildcard) | Used in function signatures |

## Operators

### Comparison Operators

```gql
n.age = 25          -- Equal
n.age <> 25         -- Not equal
n.age != 25         -- Not equal (alternative)
n.age > 25          -- Greater than
n.age >= 25         -- Greater than or equal
n.age < 25          -- Less than
n.age <= 25         -- Less than or equal
```

### Arithmetic Operators

```gql
a + b               -- Addition
a - b               -- Subtraction
a * b               -- Multiplication
a / b               -- Division
a % b               -- Modulo
a ^ b               -- Exponentiation
```

### String Operators

```gql
'Hello' + ' ' + 'World'           -- Concatenation: 'Hello World'
name STARTS WITH 'A'              -- String starts with
name ENDS WITH 'son'              -- String ends with
name CONTAINS 'mitt'              -- String contains
name =~ '.*Smith.*'               -- Regular expression match
```

### Logical Operators

```gql
a AND b             -- Logical AND
a OR b              -- Logical OR
NOT a               -- Logical NOT
a XOR b             -- Logical XOR
```

### List Operators

```gql
x IN [1, 2, 3]                    -- Membership test
[1, 2] + [3, 4]                   -- List concatenation: [1, 2, 3, 4]
list[0]                           -- List indexing (0-based)
list[1..3]                        -- List slicing
```

### NULL Operators

```gql
n.age IS NULL                     -- NULL check
n.age IS NOT NULL                 -- NOT NULL check
coalesce(n.age, 0)                -- NULL coalescing
```

### Property Access

```gql
n.name                            -- Property access
n['name']                         -- Dynamic property access
n.address.city                    -- Nested property access
```

## Procedures

### Centrality Algorithms

#### `CALL algo.degree.stream()`

Compute degree centrality for all nodes.

**Yields**: `nodeId: INTEGER`, `degree: INTEGER`

```gql
CALL algo.degree.stream()
YIELD nodeId, degree
MATCH (n) WHERE id(n) = nodeId
RETURN n.name, degree
ORDER BY degree DESC
LIMIT 10
```

#### `CALL algo.betweenness.stream()`

Compute betweenness centrality.

**Yields**: `nodeId: INTEGER`, `betweenness: FLOAT`

```gql
CALL algo.betweenness.stream()
YIELD nodeId, betweenness
MATCH (n) WHERE id(n) = nodeId
RETURN n.name, betweenness
ORDER BY betweenness DESC
LIMIT 10
```

#### `CALL algo.closeness.stream()`

Compute closeness centrality.

**Yields**: `nodeId: INTEGER`, `closeness: FLOAT`

#### `CALL algo.eigenvector.stream()`

Compute eigenvector centrality.

**Yields**: `nodeId: INTEGER`, `eigenvector: FLOAT`

#### `CALL algo.pagerank.stream()`

Compute PageRank.

**Yields**: `nodeId: INTEGER`, `score: FLOAT`

```gql
CALL algo.pagerank.stream({dampingFactor: 0.85, maxIterations: 20})
YIELD nodeId, score
MATCH (n) WHERE id(n) = nodeId
RETURN n.name, score
ORDER BY score DESC
LIMIT 10
```

#### `CALL algo.harmonic.stream()`

Compute harmonic centrality.

**Yields**: `nodeId: INTEGER`, `harmonic: FLOAT`

#### `CALL algo.bridgeLeverage.stream()`

Compute bridge/leverage centrality.

**Yields**: `nodeId: INTEGER`, `bridgeLeverage: FLOAT`

#### `CALL algo.greyCardinal.stream()`

Compute grey cardinal composite centrality.

**Yields**: `nodeId: INTEGER`, `composite: FLOAT`

### Community Detection

#### `CALL algo.louvain.stream()`

Detect communities using Louvain algorithm.

**Yields**: `nodeId: INTEGER`, `community: INTEGER`

```gql
CALL algo.louvain.stream()
YIELD nodeId, community
MATCH (n) WHERE id(n) = nodeId
RETURN community, collect(n.name) AS members
ORDER BY size(members) DESC
```

#### `CALL algo.labelPropagation.stream()`

Detect communities using label propagation.

**Yields**: `nodeId: INTEGER`, `label: INTEGER`

#### `CALL algo.leiden.stream()`

Detect communities using Leiden algorithm.

**Yields**: `nodeId: INTEGER`, `community: INTEGER`

### Connectivity Analysis

#### `CALL algo.unionFind.stream()`

Find connected components using union-find.

**Yields**: `nodeId: INTEGER`, `setId: INTEGER`

```gql
CALL algo.unionFind.stream()
YIELD nodeId, setId
MATCH (n) WHERE id(n) = nodeId
RETURN setId, count(*) AS component_size
ORDER BY component_size DESC
```

#### `CALL algo.scc.stream()`

Find strongly connected components.

**Yields**: `nodeId: INTEGER`, `componentId: INTEGER`

#### `CALL algo.articulationPoints.stream()`

Find articulation points (cut vertices).

**Yields**: `nodeId: INTEGER`

```gql
CALL algo.articulationPoints.stream()
YIELD nodeId
MATCH (n) WHERE id(n) = nodeId
RETURN n.name AS critical_node
```

#### `CALL algo.bridges.stream()`

Find bridge edges (cut edges).

**Yields**: `sourceId: INTEGER`, `targetId: INTEGER`

#### `CALL algo.biconnectedComponents.stream()`

Find biconnected components.

**Yields**: `nodeId: INTEGER`, `componentId: INTEGER`

## Expression Examples

### CASE Expressions

```gql
MATCH (p:Person)
RETURN p.name,
  CASE
    WHEN p.age < 18 THEN 'minor'
    WHEN p.age < 65 THEN 'adult'
    ELSE 'senior'
  END AS age_group
```

### List Comprehensions

```gql
RETURN [x IN range(1, 10) WHERE x % 2 = 0 | x * 2] AS even_doubles
-- Returns: [4, 8, 12, 16, 20]
```

### Pattern Comprehensions

```gql
MATCH (p:Person)
RETURN p.name,
  [(p)-[:KNOWS]->(friend) | friend.name] AS friend_names
```

### Map Projections

```gql
MATCH (p:Person)
RETURN p {.name, .age, friends: size((p)-[:KNOWS]->())}
```

## Next Steps

**Explore More**:
- [GQL Guide](/docs/gql/guide/) - Learn GQL syntax
- [Query Performance](/docs/query/performance-tuning/) - Optimize queries
- [Graph Algorithms](/docs/analytics/graph-algorithms/) - Advanced algorithms

**Related Topics**:
- [Data Types](/docs/data-types/) - Detailed type system
- [Schema Design](/docs/guides/schema-design/) - Graph modeling
- [Testing Strategies](/docs/guides/testing-strategies/) - Test your queries

**Standards**:
- ISO/IEC 39075:2024 GQL Standard
- 100% compliance (see conformance profile)

---

**Generated from**: `src/gql/language_metadata.zig`
**Last updated**: 2026-01-03
**GQL Conformance Profile**: see conformance profile
**Functions**: 100+
**Keywords**: 60+
**Data Types**: 19
