---
title: "Built-in Functions Reference"
description: "Complete reference for all built-in GQL functions in Geode including aggregate functions, scalar functions, list functions, map functions, and specialized functions"
summary: "Comprehensive built-in functions reference covering all GQL functions in Geode organized by category with signatures, examples, and return types."
slug: "functions"
url: "/docs/gql-reference/functions/"
date: 2026-01-28
lastmod: 2026-01-28
draft: false
weight: 30
keywords: ["functions", "aggregate functions", "scalar functions", "string functions", "math functions", "list functions", "temporal functions"]
tags: ["reference", "gql", "functions"]
categories: ["GQL Reference"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/gql-reference/functions/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Built-in Functions Reference

Geode provides a comprehensive set of built-in functions conforming to ISO/IEC 39075:2024 plus Geode-specific extensions. This reference documents all available functions organized by category.

## Function Categories

| Category | Description | Count |
|----------|-------------|-------|
| [Aggregate](#aggregate-functions) | Statistical computations over groups | 8 |
| [String](#string-functions) | Text manipulation | 15 |
| [Numeric](#numeric-functions) | Mathematical operations | 12 |
| [List](#list-functions) | Collection operations | 12 |
| [Map](#map-functions) | Key-value operations | 4 |
| [Temporal](#temporal-functions) | Date/time operations | 10 |
| [Type](#type-functions) | Type inspection and conversion | 8 |
| [Path](#path-functions) | Graph path operations | 4 |
| [Spatial](#spatial-functions) | Geographic operations | 6 |
| [Vector](#vector-functions) | ML embedding operations | 4 |
| [Predicate](#predicate-functions) | Boolean predicates | 6 |

---

## Aggregate Functions

Aggregate functions compute a single result from multiple input rows.

### COUNT

Returns the number of rows or non-null values.

**Signatures:**

```
COUNT(*) -> INTEGER
COUNT(expression) -> INTEGER
COUNT(DISTINCT expression) -> INTEGER
```

**Examples:**

```gql
-- Count all rows
MATCH (n:Person)
RETURN COUNT(*) AS total;

-- Count non-null values
MATCH (n:Person)
RETURN COUNT(n.email) AS with_email;

-- Count distinct values
MATCH (n:Person)
RETURN COUNT(DISTINCT n.city) AS unique_cities;
```

---

### SUM

Returns the sum of numeric values.

**Signature:**

```
SUM(numeric_expression) -> FLOAT | INTEGER
```

**Examples:**

```gql
MATCH (o:Order)
RETURN SUM(o.total) AS revenue;

-- With grouping
MATCH (o:Order)
RETURN o.category, SUM(o.quantity) AS total_quantity
GROUP BY o.category;
```

**Notes:**

- Returns NULL if all values are NULL
- Returns 0 for empty result set

---

### AVG

Returns the arithmetic mean.

**Signature:**

```
AVG(numeric_expression) -> FLOAT
```

**Examples:**

```gql
MATCH (p:Person)
RETURN AVG(p.age) AS average_age;

-- Rounded average
MATCH (p:Product)
RETURN round(AVG(p.price), 2) AS avg_price;
```

---

### MIN / MAX

Returns minimum or maximum value.

**Signatures:**

```
MIN(expression) -> same type as input
MAX(expression) -> same type as input
```

**Examples:**

```gql
MATCH (p:Person)
RETURN MIN(p.age) AS youngest,
       MAX(p.age) AS oldest;

-- Works with strings (lexicographic)
MATCH (p:Person)
RETURN MIN(p.name) AS first_alphabetically;

-- Works with dates
MATCH (o:Order)
RETURN MAX(o.order_date) AS most_recent;
```

---

### COLLECT

Aggregates values into a list.

**Signature:**

```
COLLECT(expression) -> LIST
COLLECT(DISTINCT expression) -> LIST
```

**Examples:**

```gql
-- Collect all values
MATCH (p:Person)-[:LIVES_IN]->(c:City)
RETURN c.name, COLLECT(p.name) AS residents;

-- Collect distinct values
MATCH (p:Person)
RETURN COLLECT(DISTINCT p.city) AS unique_cities;

-- Collect objects
MATCH (p:Person)
RETURN COLLECT({name: p.name, age: p.age}) AS people;
```

---

### STDEV / STDEVP

Returns standard deviation.

**Signatures:**

```
STDEV(numeric_expression) -> FLOAT   -- Sample standard deviation
STDEVP(numeric_expression) -> FLOAT  -- Population standard deviation
```

**Examples:**

```gql
MATCH (s:Score)
RETURN STDEV(s.value) AS sample_stdev,
       STDEVP(s.value) AS population_stdev;
```

---

### PERCENTILE_CONT / PERCENTILE_DISC

Returns percentile values.

**Signatures:**

```
PERCENTILE_CONT(numeric_expression, percentile) -> FLOAT  -- Continuous (interpolated)
PERCENTILE_DISC(numeric_expression, percentile) -> FLOAT  -- Discrete (actual value)
```

**Examples:**

```gql
MATCH (p:Person)
RETURN PERCENTILE_CONT(p.salary, 0.5) AS median_salary,
       PERCENTILE_CONT(p.salary, 0.95) AS p95_salary;
```

---

## String Functions

### lower / upper

Converts string case.

**Signatures:**

```
lower(string) -> STRING
upper(string) -> STRING
```

**Examples:**

```gql
RETURN lower('Hello World') AS lowercase;  -- 'hello world'
RETURN upper('Hello World') AS uppercase;  -- 'HELLO WORLD'

-- Case-insensitive comparison
MATCH (p:Person)
WHERE lower(p.email) = lower($input_email)
RETURN p;
```

---

### trim / ltrim / rtrim

Removes whitespace.

**Signatures:**

```
trim(string) -> STRING
ltrim(string) -> STRING
rtrim(string) -> STRING
trim(string, characters) -> STRING  -- Remove specific characters
```

**Examples:**

```gql
RETURN trim('  hello  ') AS trimmed;       -- 'hello'
RETURN ltrim('  hello  ') AS left_trim;    -- 'hello  '
RETURN rtrim('  hello  ') AS right_trim;   -- '  hello'
RETURN trim('xxhelloxx', 'x') AS custom;   -- 'hello'
```

---

### substring

Extracts a portion of a string.

**Signature:**

```
substring(string, start) -> STRING
substring(string, start, length) -> STRING
```

**Examples:**

```gql
RETURN substring('Hello World', 0, 5) AS sub;   -- 'Hello'
RETURN substring('Hello World', 6) AS rest;     -- 'World'

-- Negative start (from end)
RETURN substring('Hello', -2) AS last_two;      -- 'lo'
```

**Notes:**

- Start index is 0-based
- Negative start counts from end

---

### replace

Replaces occurrences in a string.

**Signature:**

```
replace(string, search, replacement) -> STRING
```

**Examples:**

```gql
RETURN replace('hello world', 'world', 'there') AS replaced;
-- 'hello there'

-- Remove characters
RETURN replace('hello-world', '-', '') AS no_dashes;
-- 'helloworld'
```

---

### split

Splits a string into a list.

**Signature:**

```
split(string, delimiter) -> LIST<STRING>
```

**Examples:**

```gql
RETURN split('a,b,c', ',') AS parts;           -- ['a', 'b', 'c']
RETURN split('hello world', ' ') AS words;     -- ['hello', 'world']
```

---

### length (string)

Returns string length.

**Signature:**

```
length(string) -> INTEGER
```

**Examples:**

```gql
RETURN length('hello') AS len;  -- 5

-- Unicode-aware
RETURN length('') AS emoji_len;  -- 1 (grapheme count)
```

---

### reverse

Reverses a string.

**Signature:**

```
reverse(string) -> STRING
```

**Examples:**

```gql
RETURN reverse('hello') AS reversed;  -- 'olleh'
```

---

### left / right

Extracts characters from start or end.

**Signatures:**

```
left(string, count) -> STRING
right(string, count) -> STRING
```

**Examples:**

```gql
RETURN left('hello', 3) AS first_three;   -- 'hel'
RETURN right('hello', 3) AS last_three;   -- 'llo'
```

---

### lpad / rpad

Pads a string to a length.

**Signatures:**

```
lpad(string, length, pad_string) -> STRING
rpad(string, length, pad_string) -> STRING
```

**Examples:**

```gql
RETURN lpad('42', 5, '0') AS padded;    -- '00042'
RETURN rpad('hi', 5, '-') AS padded;    -- 'hi---'
```

---

### toString

Converts any value to string.

**Signature:**

```
toString(value) -> STRING
```

**Examples:**

```gql
RETURN toString(42) AS str;              -- '42'
RETURN toString(3.14) AS str;            -- '3.14'
RETURN toString(true) AS str;            -- 'true'
RETURN toString(date('2026-01-28')) AS str;  -- '2026-01-28'
```

---

## Numeric Functions

### abs

Returns absolute value.

**Signature:**

```
abs(number) -> same type
```

**Examples:**

```gql
RETURN abs(-42) AS absolute;     -- 42
RETURN abs(-3.14) AS absolute;   -- 3.14
```

---

### ceil / floor

Rounds to integer.

**Signatures:**

```
ceil(number) -> INTEGER
floor(number) -> INTEGER
```

**Examples:**

```gql
RETURN ceil(3.2) AS ceiling;     -- 4
RETURN floor(3.8) AS floor_val;  -- 3
RETURN ceil(-3.2) AS neg_ceil;   -- -3
RETURN floor(-3.8) AS neg_floor; -- -4
```

---

### round

Rounds to specified precision.

**Signature:**

```
round(number) -> INTEGER
round(number, precision) -> FLOAT
```

**Examples:**

```gql
RETURN round(3.5) AS rounded;           -- 4
RETURN round(3.14159, 2) AS precise;    -- 3.14
RETURN round(123.456, -1) AS tens;      -- 120
```

---

### sign

Returns sign of number.

**Signature:**

```
sign(number) -> INTEGER  -- Returns -1, 0, or 1
```

**Examples:**

```gql
RETURN sign(42) AS positive;    -- 1
RETURN sign(-42) AS negative;   -- -1
RETURN sign(0) AS zero;         -- 0
```

---

### sqrt / cbrt

Square root and cube root.

**Signatures:**

```
sqrt(number) -> FLOAT
cbrt(number) -> FLOAT
```

**Examples:**

```gql
RETURN sqrt(16) AS square_root;  -- 4.0
RETURN cbrt(27) AS cube_root;    -- 3.0
```

---

### power / exp / log

Exponential and logarithmic functions.

**Signatures:**

```
power(base, exponent) -> FLOAT
exp(number) -> FLOAT              -- e^x
log(number) -> FLOAT              -- Natural logarithm
log10(number) -> FLOAT            -- Base-10 logarithm
```

**Examples:**

```gql
RETURN power(2, 10) AS two_to_ten;  -- 1024.0
RETURN exp(1) AS e_value;           -- 2.718281828...
RETURN log(exp(1)) AS ln_e;         -- 1.0
RETURN log10(100) AS log_100;       -- 2.0
```

---

### sin / cos / tan

Trigonometric functions.

**Signatures:**

```
sin(radians) -> FLOAT
cos(radians) -> FLOAT
tan(radians) -> FLOAT
asin(value) -> FLOAT
acos(value) -> FLOAT
atan(value) -> FLOAT
atan2(y, x) -> FLOAT
```

**Examples:**

```gql
RETURN sin(0) AS sine_zero;        -- 0.0
RETURN cos(0) AS cosine_zero;      -- 1.0
RETURN atan2(1, 1) AS angle;       -- 0.785398... (PI/4)
```

---

### rand

Returns random number.

**Signature:**

```
rand() -> FLOAT  -- Returns 0.0 <= x < 1.0
```

**Examples:**

```gql
RETURN rand() AS random_value;

-- Random integer in range [1, 100]
RETURN floor(rand() * 100) + 1 AS random_int;

-- Random sample
MATCH (p:Person)
RETURN p.name
ORDER BY rand()
LIMIT 10;
```

---

## List Functions

### size / length

Returns list length.

**Signature:**

```
size(list) -> INTEGER
length(list) -> INTEGER  -- Alias
```

**Examples:**

```gql
RETURN size([1, 2, 3, 4, 5]) AS count;  -- 5
RETURN size([]) AS empty;               -- 0
```

---

### head / last / tail

Extracts list elements.

**Signatures:**

```
head(list) -> element type
last(list) -> element type
tail(list) -> LIST  -- All except first
```

**Examples:**

```gql
RETURN head([1, 2, 3]) AS first;   -- 1
RETURN last([1, 2, 3]) AS final;   -- 3
RETURN tail([1, 2, 3]) AS rest;    -- [2, 3]
```

---

### range

Creates a list of integers.

**Signature:**

```
range(start, end) -> LIST<INTEGER>
range(start, end, step) -> LIST<INTEGER>
```

**Examples:**

```gql
RETURN range(1, 5) AS nums;          -- [1, 2, 3, 4, 5]
RETURN range(0, 10, 2) AS evens;     -- [0, 2, 4, 6, 8, 10]
RETURN range(10, 1, -1) AS countdown; -- [10, 9, 8, ..., 1]
```

---

### reverse (list)

Reverses a list.

**Signature:**

```
reverse(list) -> LIST
```

**Examples:**

```gql
RETURN reverse([1, 2, 3]) AS reversed;  -- [3, 2, 1]
```

---

### reduce

Reduces a list to a single value.

**Signature:**

```
reduce(accumulator = initial_value, element IN list | expression) -> result
```

**Examples:**

```gql
-- Sum of list
RETURN reduce(total = 0, x IN [1, 2, 3, 4] | total + x) AS sum;  -- 10

-- Product
RETURN reduce(prod = 1, x IN [1, 2, 3, 4] | prod * x) AS product;  -- 24

-- String concatenation
RETURN reduce(s = '', x IN ['a', 'b', 'c'] | s + x) AS concat;  -- 'abc'

-- Path total cost
MATCH p = (a)-[rels*]->(b)
RETURN reduce(cost = 0, r IN relationships(p) | cost + r.weight) AS total_cost;
```

---

### filter (list comprehension)

Filters a list.

**Signature:**

```
[element IN list WHERE condition]
[element IN list WHERE condition | expression]
```

**Examples:**

```gql
-- Filter to even numbers
RETURN [x IN [1, 2, 3, 4, 5, 6] WHERE x % 2 = 0] AS evens;  -- [2, 4, 6]

-- Filter and transform
RETURN [x IN [1, 2, 3, 4] WHERE x > 2 | x * 2] AS doubled;  -- [6, 8]
```

---

### concat / + (list concatenation)

Concatenates lists.

**Signature:**

```
list1 + list2 -> LIST
```

**Examples:**

```gql
RETURN [1, 2] + [3, 4] AS combined;  -- [1, 2, 3, 4]
```

---

### IN (list membership)

Tests list membership.

**Signature:**

```
element IN list -> BOOLEAN
```

**Examples:**

```gql
RETURN 2 IN [1, 2, 3] AS contains;     -- true
RETURN 5 IN [1, 2, 3] AS contains;     -- false

MATCH (p:Person)
WHERE p.role IN ['admin', 'manager']
RETURN p.name;
```

---

## Map Functions

### keys

Returns map keys.

**Signature:**

```
keys(map) -> LIST<STRING>
keys(node) -> LIST<STRING>
keys(relationship) -> LIST<STRING>
```

**Examples:**

```gql
RETURN keys({name: 'Alice', age: 30}) AS k;  -- ['name', 'age']

MATCH (n:Person)
RETURN keys(n) AS property_names;
```

---

### values

Returns map values.

**Signature:**

```
values(map) -> LIST
```

**Examples:**

```gql
RETURN values({a: 1, b: 2, c: 3}) AS vals;  -- [1, 2, 3]
```

---

### properties

Returns properties as map.

**Signature:**

```
properties(node) -> MAP
properties(relationship) -> MAP
```

**Examples:**

```gql
MATCH (p:Person {name: 'Alice'})
RETURN properties(p) AS all_props;
-- {name: 'Alice', age: 30, email: 'alice@example.com'}
```

---

## Temporal Functions

### date / time / timestamp

Constructs temporal values.

**Signatures:**

```
date() -> DATE                        -- Current date
date(string) -> DATE                  -- Parse ISO string
date({year, month, day}) -> DATE      -- From components

time() -> TIME
time(string) -> TIME

timestamp() -> TIMESTAMP
timestamp(string) -> TIMESTAMP
```

**Examples:**

```gql
RETURN date() AS today;
RETURN date('2026-01-28') AS specific;
RETURN date({year: 2026, month: 1, day: 28}) AS from_parts;

RETURN timestamp() AS now;
RETURN timestamp('2026-01-28T14:30:00Z') AS specific_time;
```

---

### duration

Constructs duration values.

**Signature:**

```
duration(string) -> DURATION           -- ISO 8601 format
duration({days, hours, ...}) -> DURATION
```

**Examples:**

```gql
RETURN duration('P7D') AS one_week;
RETURN duration('PT2H30M') AS two_half_hours;
RETURN duration({days: 7, hours: 12}) AS custom;
```

---

### Temporal Arithmetic

**Operations:**

```gql
-- Add duration to date
RETURN date('2026-01-28') + duration('P7D') AS next_week;

-- Subtract dates
RETURN date('2026-01-28') - date('2026-01-01') AS days_between;

-- Compare timestamps
MATCH (e:Event)
WHERE e.start_time > timestamp() - duration('P30D')
RETURN e;
```

---

### Temporal Component Extraction

**Functions:**

```gql
RETURN date('2026-01-28').year AS year;        -- 2026
RETURN date('2026-01-28').month AS month;      -- 1
RETURN date('2026-01-28').day AS day;          -- 28
RETURN date('2026-01-28').dayOfWeek AS dow;    -- 3 (Wednesday)
RETURN date('2026-01-28').dayOfYear AS doy;    -- 28

RETURN timestamp().hour AS hour;
RETURN timestamp().minute AS minute;
RETURN timestamp().second AS second;
```

---

## Type Functions

### type

Returns relationship type.

**Signature:**

```
type(relationship) -> STRING
```

**Examples:**

```gql
MATCH (a)-[r]->(b)
RETURN type(r) AS relationship_type;
```

---

### labels

Returns node labels.

**Signature:**

```
labels(node) -> LIST<STRING>
```

**Examples:**

```gql
MATCH (n)
RETURN labels(n) AS node_labels;

-- Check for label
MATCH (n)
WHERE 'Person' IN labels(n)
RETURN n;
```

---

### id

Returns internal ID.

**Signature:**

```
id(node) -> INTEGER
id(relationship) -> INTEGER
```

**Examples:**

```gql
MATCH (n:Person)
RETURN id(n) AS internal_id, n.name;
```

**Note:** Internal IDs may change; use application-defined IDs for stability.

---

### Type Conversion Functions

```gql
-- To Integer
toInteger('42')        -- 42
toInteger(3.7)         -- 3
toInteger(true)        -- 1

-- To Float
toFloat('3.14')        -- 3.14
toFloat(42)            -- 42.0

-- To Boolean
toBoolean('true')      -- true
toBoolean(1)           -- true
toBoolean(0)           -- false

-- To String
toString(42)           -- '42'
toString(true)         -- 'true'
```

---

## Path Functions

### nodes

Returns all nodes in a path.

**Signature:**

```
nodes(path) -> LIST<NODE>
```

**Examples:**

```gql
MATCH p = (a)-[*]->(b)
RETURN nodes(p) AS path_nodes;

-- Node names
MATCH p = (a)-[*]->(b)
RETURN [n IN nodes(p) | n.name] AS names;
```

---

### relationships

Returns all relationships in a path.

**Signature:**

```
relationships(path) -> LIST<RELATIONSHIP>
```

**Examples:**

```gql
MATCH p = (a)-[*]->(b)
RETURN relationships(p) AS path_rels;

-- Relationship types
MATCH p = (a)-[*]->(b)
RETURN [r IN relationships(p) | type(r)] AS types;
```

---

### length (path)

Returns path length (number of relationships).

**Signature:**

```
length(path) -> INTEGER
```

**Examples:**

```gql
MATCH p = shortestPath((a)-[*]-(b))
RETURN length(p) AS hops;
```

---

## Spatial Functions

### geo_distance

Calculates distance between two points.

**Signature:**

```
geo_distance(point1, point2) -> FLOAT  -- Returns meters
```

**Examples:**

```gql
RETURN geo_distance(latlon(40.7128, -74.0060), latlon(34.0522, -118.2437)) AS meters;

MATCH (s:Store)
RETURN s.name, geo_distance(s.location, $user_location) AS distance
ORDER BY distance
LIMIT 5;
```

---

### geo_within_box

Tests if point is within bounding box.

**Signature:**

```
geo_within_box(point, southwest, northeast) -> BOOLEAN
```

**Examples:**

```gql
MATCH (s:Store)
WHERE geo_within_box(s.location, latlon(40.70, -74.05), latlon(40.75, -73.95))
RETURN s.name;
```

---

### geo_within_polygon

Tests if point is within polygon.

**Signature:**

```
geo_within_polygon(point, polygon) -> BOOLEAN
```

---

## Vector Functions

### vector_distance_l2

Euclidean distance between vectors.

**Signature:**

```
vector_distance_l2(vector1, vector2) -> FLOAT
```

**Examples:**

```gql
MATCH (d:Document)
RETURN d.title, vector_distance_l2(d.embedding, $query_vector) AS distance
ORDER BY distance
LIMIT 10;
```

---

### vector_distance_cosine

Cosine distance between vectors.

**Signature:**

```
vector_distance_cosine(vector1, vector2) -> FLOAT
```

---

### vector_distance_dot

Dot product (inner product) of vectors.

**Signature:**

```
vector_distance_dot(vector1, vector2) -> FLOAT
```

---

### vector_dimension

Returns vector dimensionality.

**Signature:**

```
vector_dimension(vector) -> INTEGER
```

---

## Predicate Functions

### exists

Tests if property or pattern exists.

**Signature:**

```
exists(property) -> BOOLEAN
EXISTS { pattern } -> BOOLEAN
```

**Examples:**

```gql
-- Property exists
MATCH (p:Person)
WHERE exists(p.phone)
RETURN p.name;

-- Pattern exists
MATCH (p:Person)
WHERE EXISTS { (p)-[:MANAGES]->() }
RETURN p.name AS managers;
```

---

### all / any / none / single

List predicates.

**Signatures:**

```
all(x IN list WHERE predicate) -> BOOLEAN
any(x IN list WHERE predicate) -> BOOLEAN
none(x IN list WHERE predicate) -> BOOLEAN
single(x IN list WHERE predicate) -> BOOLEAN
```

**Examples:**

```gql
-- All elements satisfy
RETURN all(x IN [2, 4, 6] WHERE x % 2 = 0) AS all_even;  -- true

-- Any element satisfies
RETURN any(x IN [1, 2, 3] WHERE x > 2) AS has_large;  -- true

-- No element satisfies
RETURN none(x IN [1, 2, 3] WHERE x < 0) AS all_positive;  -- true

-- Exactly one satisfies
RETURN single(x IN [1, 2, 3] WHERE x > 2) AS exactly_one;  -- true
```

---

### coalesce

Returns first non-null value.

**Signature:**

```
coalesce(value1, value2, ...) -> first non-null
```

**Examples:**

```gql
RETURN coalesce(null, 'default') AS result;  -- 'default'
RETURN coalesce(null, null, 42) AS result;   -- 42

MATCH (p:Person)
RETURN coalesce(p.nickname, p.name) AS display_name;
```

---

### CASE Expression

Conditional logic.

**Syntax:**

```gql
CASE expression
  WHEN value1 THEN result1
  WHEN value2 THEN result2
  ELSE default
END

CASE
  WHEN condition1 THEN result1
  WHEN condition2 THEN result2
  ELSE default
END
```

**Examples:**

```gql
-- Simple CASE
MATCH (p:Person)
RETURN p.name,
       CASE p.status
         WHEN 'active' THEN 'Active'
         WHEN 'pending' THEN 'Pending Approval'
         ELSE 'Inactive'
       END AS status_text;

-- Searched CASE
MATCH (p:Person)
RETURN p.name,
       CASE
         WHEN p.age < 18 THEN 'Minor'
         WHEN p.age < 65 THEN 'Adult'
         ELSE 'Senior'
       END AS age_group;
```

---

## Related Documentation

- [Operators Reference](/docs/reference/operators/) - All operators
- [Data Types Reference](/docs/reference/types/) - Type system
- [GQL Specification](/docs/gql-reference/specification/) - ISO standard
- [GQL Guide](/docs/gql/guide/) - Query tutorial

---

**Last Updated:** January 28, 2026
**Geode Version:** **GEODE_TAG**+
**Function Count:** 80+ built-in functions
