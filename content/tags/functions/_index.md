---
title: "Built-in Functions"
description: "Comprehensive reference for Geode's built-in GQL functions: aggregation, string, math, temporal, list, and graph-specific functions for powerful queries."
keywords:
  - built-in functions
  - GQL functions
  - aggregation functions
  - string functions
  - math functions
  - temporal functions
  - list functions
  - graph functions
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/functions/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Built-in functions extend GQL with powerful data manipulation, aggregation, and computation capabilities. Geode implements the complete ISO/IEC 39075:2024 function specification plus performance-optimized extensions.

## Function Categories

### Aggregation Functions

Compute summary values across result sets:

```gql
// COUNT - count rows or non-null values
MATCH (u:User)
RETURN COUNT(*) AS total_users,
       COUNT(u.email) AS users_with_email

// SUM - sum numeric values
MATCH (o:Order)
RETURN SUM(o.total) AS revenue

// AVG - average of numeric values
MATCH (p:Product)-[:HAS_REVIEW]->(r:Review)
RETURN p.name, AVG(r.rating) AS avg_rating

// MIN/MAX - minimum and maximum values
MATCH (u:User)
RETURN MIN(u.age) AS youngest,
       MAX(u.age) AS oldest

// COLLECT - collect values into list
MATCH (u:User)-[:LIKES]->(p:Product)
RETURN u.name, COLLECT(p.name) AS liked_products

// String aggregation: COLLECT returns a LIST; join it in the client.
// There is no STRING_AGG function.
MATCH (t:Tag)
RETURN COLLECT(t.name) AS tag_list
```

### String Functions

Text manipulation and analysis:

```gql
// UPPER/LOWER - case conversion
MATCH (u:User)
RETURN UPPER(u.name) AS name_upper,
       LOWER(u.email) AS email_lower

// LENGTH - string length
MATCH (p:Post)
WHERE LENGTH(p.content) > 280
RETURN p

// SUBSTRING - extract substring (there is no POSITION/STRPOS function;
// substring takes a start offset and a length)
MATCH (u:User)
RETURN SUBSTRING(u.email, 0, 5) AS email_prefix

// TRIM/LTRIM/RTRIM - remove whitespace
MATCH (t:Text)
RETURN TRIM(t.value) AS trimmed

// Concatenation is an operator (`+` or `||`); there is no CONCAT function
MATCH (u:User)
RETURN u.first_name || ' ' || u.last_name AS full_name

// REPLACE - literal substring replacement
MATCH (t:Text)
RETURN REPLACE(t.content, 'old', 'new') AS updated

// Regular expressions: `=~` is a predicate over a lightweight matcher
// (^, $, ., *, +, ?, character classes, escapes — no alternation or captures)
MATCH (p:Product)
WHERE p.sku =~ '^PROD-[0-9]{4}$'
RETURN p
```

### Mathematical Functions

Numeric computations:

```gql
// Basic math
RETURN ABS(-42) AS absolute,
       CEIL(3.14) AS ceiling,
       FLOOR(3.14) AS floor,
       ROUND(3.14159, 2) AS rounded,
       SIGN(-5) AS sign_value

// Power and roots
RETURN POWER(2, 10) AS power,
       SQRT(16) AS square_root,
       EXP(1) AS e,
       LOG(100) AS natural_log,
       LOG10(1000) AS log_base_10

// Trigonometry
RETURN SIN(3.14159) AS sine,
       COS(0) AS cosine,
       TAN(0.785) AS tangent,
       ASIN(0.5) AS arcsine

// Random numbers
RETURN RAND() AS random_0_to_1,
       FLOOR(RAND() * 100) AS random_0_to_99
```

### Temporal Functions

Date and time operations:

```gql
// Current time functions
RETURN CURRENT_DATE AS today,
       CURRENT_TIME AS now_time,
       CURRENT_TIMESTAMP AS now_datetime,
       datetime() AS timestamp

// Date construction
RETURN DATE('2024-06-15') AS specific_date,
       DATETIME('2024-06-15T14:30:00') AS specific_datetime

// Date components
MATCH (e:Event)
RETURN e.date.year AS year,
       e.date.month AS month,
       e.date.day AS day,
       e.date.dayOfWeek AS weekday,
       e.date.weekOfYear AS week

// Duration arithmetic
MATCH (e:Event)
WHERE e.timestamp > datetime() - duration('P7D')  // Last 7 days
RETURN e

// Date formatting
MATCH (e:Event)
RETURN FORMAT_DATETIME(e.timestamp, 'YYYY-MM-DD HH:mm:ss') AS formatted
```

### List Functions

List manipulation and analysis:

```gql
// SIZE - list length
MATCH (u:User)
RETURN u.tags, SIZE(u.tags) AS tag_count

// HEAD/LAST - first and last elements
MATCH (u:User)
RETURN HEAD(u.tags) AS first_tag,
       LAST(u.tags) AS last_tag

// TAIL - all but first element
MATCH (u:User)
RETURN TAIL(u.tags) AS remaining_tags

// REVERSE - reverse list order
MATCH (u:User)
RETURN REVERSE(u.scores) AS reversed

// RANGE - generate numeric range
RETURN RANGE(1, 10) AS one_to_ten,
       RANGE(0, 100, 10) AS tens

// List comprehension
MATCH (u:User)
RETURN [tag IN u.tags WHERE LENGTH(tag) > 5] AS long_tags,
       [x IN RANGE(1, 10) | x * x] AS squares

// REDUCE - fold/accumulate
MATCH (o:Order)-[:CONTAINS]->(i:Item)
WITH o, COLLECT(i.price * i.quantity) AS subtotals
RETURN o.id, null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS order_total
```

### Map Functions

Work with map/object data:

```gql
// KEYS - get map keys
MATCH (u:User)
RETURN KEYS(u.settings) AS setting_keys

// VALUES - get map values
MATCH (u:User)
RETURN VALUES(u.settings) AS setting_values

// SIZE - count map entries
MATCH (u:User)
RETURN SIZE(u.profile) AS profile_field_count

// Map access
MATCH (u:User)
RETURN u.settings['theme'] AS theme,
       u.settings.notifications AS notifications
```

### Path Functions

Graph path manipulation:

```gql
// LENGTH - path length (number of relationships)
MATCH path = (a:User)-[:KNOWS*]->(b:User)
WHERE LENGTH(path) <= 3
RETURN path

// NODES - extract nodes from path
MATCH path = (a:User)-[:KNOWS*]->(b:User)
RETURN NODES(path) AS users_in_path

// RELATIONSHIPS - extract relationships
MATCH path = (a)-[r:KNOWS*]->(b)
RETURN RELATIONSHIPS(path) AS connections

// Path predicates
MATCH path = (a:User)-[:KNOWS*]->(b:User)
WHERE ALL(node IN NODES(path) WHERE node.active = true)
  AND NONE(rel IN RELATIONSHIPS(path) WHERE rel.blocked = true)
RETURN path
```

### Type Conversion Functions

Convert between data types:

```gql
// To string
RETURN TOSTRING(42) AS str,
       TOSTRING(3.14) AS float_str,
       TOSTRING(true) AS bool_str

// To integer
RETURN TOINTEGER('42') AS int,
       TOINTEGER(3.14) AS truncated

// To float
RETURN TOFLOAT('3.14') AS float,
       TOFLOAT(42) AS int_as_float

// To boolean
RETURN TOBOOLEAN('true') AS bool_true,
       TOBOOLEAN(1) AS bool_from_int
```

### Conditional Functions

Conditional logic and null handling:

```gql
// COALESCE - first non-null value
MATCH (u:User)
RETURN COALESCE(u.nickname, u.username, 'Anonymous') AS display_name

// CASE - conditional expressions
MATCH (u:User)
RETURN u.name,
  CASE
    WHEN u.age < 18 THEN 'minor'
    WHEN u.age < 65 THEN 'adult'
    ELSE 'senior'
  END AS age_group

// NULLIF - return null if values equal
MATCH (u:User)
RETURN NULLIF(u.display_name, '') AS name  // NULL if empty string
```

### Scalar Functions

Single-value utilities:

```gql
// ID - get node/relationship ID
MATCH (n:User)
RETURN ID(n) AS node_id

// LABELS - get node labels
MATCH (n)
RETURN LABELS(n) AS node_labels

// TYPE - get relationship type
MATCH ()-[r]->()
RETURN TYPE(r) AS rel_type

// PROPERTIES - get all properties
MATCH (n:User {id: 123})
RETURN PROPERTIES(n) AS user_props

// EXISTS - check existence
MATCH (u:User)
WHERE EXISTS { (u)-[:PURCHASED]->(:Product) }
RETURN u
```

### Hash and Encoding Functions

Geode does not compute digests and has no Base64 or URL encoders: there is no
`SHA256`, `MD5`, `BASE64_ENCODE`, `BASE64_DECODE` or `URL_ENCODE` function.
What it provides is a `HASH` type built from an already-computed hex digest, a
constant-time comparison, hex encode/decode, and URL *parsing*:

```gql
// Store a client-computed digest as a typed HASH value
RETURN hash('sha3-256', $hex_digest) AS digest;

// Constant-time comparison
RETURN hash_equals(hash('sha3-256', $a), hash('sha3-256', $b)) AS same;

// Hex encoding (bytea/from_hex require the \x prefix)
RETURN to_hex($bytes) AS hex, from_hex('\x48656c6c6f') AS bytes;

// URL parsing
RETURN url_scheme($href) AS scheme,
       url_host($href) AS host,
       url_path($href) AS path,
       url_query($href) AS query;
```

## Advanced Function Usage

### Window Functions

Compute over partitions:

```gql
// Row number within partition
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name,
       p.name,
       null /* Geode has no window functions and no OVER clause */ AS rank

// Running totals
MATCH (t:Transaction)
RETURN t.date,
       t.amount,
       SUM(t.amount) AS running_total

// Moving averages
MATCH (m:Measurement)
RETURN m.timestamp,
       m.value,
       AVG(m.value) AS moving_avg
```

### User-Defined Functions

Extend with custom functions (Python example):

```python
from geode_client import Client

client = Client(host="localhost", port=3141)

async with client.connection() as conn:
    # Register custom function
    await conn.execute("""
        CREATE FUNCTION haversine_distance(
            lat1 FLOAT, lon1 FLOAT,
            lat2 FLOAT, lon2 FLOAT
        ) RETURNS FLOAT
        LANGUAGE PYTHON
        AS $$
        import math
        R = 6371  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat/2) ** 2 +
             math.cos(math.radians(lat1)) *
             math.cos(math.radians(lat2)) *
             math.sin(dlon/2) ** 2)
        c = 2 * math.asin(math.sqrt(a))
        return R * c
        $$
    """)

    # Use custom function
    result, _ = await conn.query("""
        MATCH (loc1:Location {name: 'NYC'}),
              (loc2:Location {name: 'SF'})
        RETURN haversine_distance(
            loc1.lat, loc1.lon,
            loc2.lat, loc2.lon
        ) AS distance_km
    """)
```

## Performance Considerations

### Function Execution Cost

- **Aggregations**: Process all matching rows (O(n))
- **String operations**: Linear in string length
- **Math functions**: Constant time (O(1))
- **Path functions**: Linear in path length

### Optimization Tips

```gql
// Expensive: function in WHERE with no index
MATCH (u:User)
WHERE UPPER(u.email) = 'ADMIN@EXAMPLE.COM'
RETURN u

// Better: index on computed column or filter differently
CREATE INDEX FOR (u:User) ON (u.email);
MATCH (u:User)
WHERE u.email = 'admin@example.com'  // Case-insensitive index
RETURN u

// Avoid repeated function calls
MATCH (p:Product)
WITH p, LENGTH(p.description) AS desc_len  // Compute once
WHERE desc_len > 100 AND desc_len < 500
RETURN p
```

## Best Practices

1. **Use Indexes**: Filter on indexed properties before applying functions
2. **Compute Once**: Store function results in variables with WITH
3. **Null Safety**: Always handle potential nulls with COALESCE or IS NULL
4. **Type Compatibility**: Ensure function arguments match expected types
5. **Aggregation Scope**: Use GROUP BY explicitly for clarity
6. **Function Composition**: Chain functions for complex transformations
7. **Performance Testing**: Profile expensive function calls on realistic data

## Common Patterns

### Calculate Derived Properties

```gql
MATCH (u:User)
SET u.full_name = u.first_name || ' ' || u.last_name,
    u.name_length = LENGTH(u.first_name || ' ' || u.last_name)
```

### Conditional Aggregation

```gql
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name,
       COUNT(p) AS total_purchases,
       SUM(CASE WHEN p.price > 100 THEN 1 ELSE 0 END) AS expensive_purchases,
       AVG(CASE WHEN p.category = 'Electronics' THEN p.price ELSE NULL END) AS avg_electronics_price
```

### Time-Based Analysis

```gql
MATCH (e:Event)
WHERE e.timestamp >= DATE_TRUNC('month', datetime())
WITH $bucket_start /* no date_trunc(): bucket at write time or compare an explicit range */ AS day, COUNT(*) AS count
RETURN day, count
ORDER BY day
```

## Graph-Specific Functions

### Shortest Path Functions

```gql
-- Find shortest path between nodes
MATCH path = SHORTEST_PATH((a:User {id: 1})-[:KNOWS*]-(b:User {id: 100}))
RETURN path, length(path) AS hops;

-- All shortest paths (multiple paths with same length)
MATCH paths = ALL_SHORTEST_PATHS((a)-[:RELATED*]-(b))
RETURN paths;

-- Weighted shortest path
MATCH path = SHORTEST_PATH((a)-[r:ROAD*]-(b))
RETURN path, null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS total_distance;
```

### Centrality Functions

```gql
-- PageRank centrality (runs over the whole graph; takes no arguments)
CALL algo.pagerank.stream()
YIELD nodeId, score
MATCH (n:User) WHERE id(n) = nodeId
RETURN n.name, score
ORDER BY score DESC
LIMIT 10;

-- Betweenness centrality
CALL algo.betweenness.stream()
YIELD nodeId, betweenness
MATCH (n:User) WHERE id(n) = nodeId
RETURN n.name, betweenness;

-- Degree centrality
MATCH (n:User)
RETURN n.name,
       SIZE([(n)-[:FOLLOWS]->() | 1]) AS out_degree,
       SIZE([()<-[:FOLLOWS]-(n) | 1]) AS in_degree,
       SIZE([(n)-[:FOLLOWS]-() | 1]) AS total_degree;
```

### Community Detection

```gql
-- Louvain community detection
CALL algo.louvain.stream()
YIELD nodeId, community
MATCH (n:User) WHERE id(n) = nodeId
SET n.community = community;

-- Label propagation
CALL algo.labelPropagation.stream()
YIELD nodeId, label
MATCH (n:User) WHERE id(n) = nodeId
RETURN label AS community, COUNT(n) AS size
ORDER BY size DESC;
```

None of the `algo.*` procedures accept label, relationship-type or iteration
arguments; they run over every node and relationship in the current graph.

## Geospatial Functions

### Distance Calculations

```gql
-- Haversine distance (km)
MATCH (a:Location), (b:Location)
RETURN a.name, b.name,
       geospatial.distance(
         point({latitude: a.lat, longitude: a.lon}),
         point({latitude: b.lat, longitude: b.lon})
       ) AS distance_km;

-- Find locations within radius
MATCH (center:Location {name: 'New York'})
MATCH (nearby:Location)
WHERE geospatial.distance(
  point({latitude: center.lat, longitude: center.lon}),
  point({latitude: nearby.lat, longitude: nearby.lon})
) < 100  -- 100 km radius
RETURN nearby.name, nearby.lat, nearby.lon;
```

### Bounding Box Queries

```gql
-- Find all locations in bounding box
MATCH (loc:Location)
WHERE loc.lat >= $min_lat AND loc.lat <= $max_lat
  AND loc.lon >= $min_lon AND loc.lon <= $max_lon
RETURN loc.name, loc.lat, loc.lon;
```

## JSON Functions

### JSON Processing

```gql
-- Parse JSON string
MATCH (d:Document)
WITH d, JSON_PARSE(d.content) AS json_obj
RETURN json_obj.title, json_obj.author;

-- Extract JSON field
MATCH (d:Document)
RETURN json_get(d.metadata, '$.tags[0]') AS first_tag;

-- Build JSON object
MATCH (u:User)
RETURN JSON_OBJECT(
  'name', u.name,
  'email', u.email,
  'age', u.age
) AS user_json;

-- Convert to JSON string
MATCH (u:User)
RETURN JSON_STRINGIFY(u) AS user_string;
```

### Array Functions

```gql
-- Array contains
MATCH (u:User)
WHERE ARRAY_CONTAINS(u.tags, 'developer')
RETURN u;

-- Array length
MATCH (u:User)
RETURN u.name, ARRAY_LENGTH(u.interests) AS interest_count;

-- Array slice
MATCH (u:User)
RETURN u.name, ARRAY_SLICE(u.purchases, 0, 5) AS recent_purchases;

-- Array distinct
MATCH (u:User)
SET u.unique_tags = ARRAY_DISTINCT(u.tags);
```

## Statistical Functions

### Descriptive Statistics

```gql
-- Standard deviation
MATCH (u:User)
RETURN collect(u.age) /* stddev/variance parse but are never computed; reduce client-side */ AS age_stddev,
       collect(u.age) /* stddev/variance parse but are never computed; reduce client-side */ AS population_stddev;

-- Variance
MATCH (p:Product)
RETURN collect(p.price) /* stddev/variance parse but are never computed; reduce client-side */ AS price_variance;

-- Percentiles
MATCH (u:User)
RETURN collect(u.age) /* percentile_cont/_disc parse but are never computed; sort client-side */ AS q1,
       collect(u.age) /* percentile_cont/_disc parse but are never computed; sort client-side */ AS median,
       collect(u.age) /* percentile_cont/_disc parse but are never computed; sort client-side */ AS q3;

-- Mode (most common value)
MATCH (u:User)
RETURN u.country, COUNT(*) AS frequency
ORDER BY frequency DESC
LIMIT 1;
```

### Correlation

```gql
-- Correlation between two properties
MATCH (u:User)
RETURN CORR(u.age, u.purchase_count) AS age_purchase_correlation;
```

## Text Search Procedures

Full-text search is **not** a scalar function in Geode — it is a set of `CALL`
procedures in the `geode.fts.*` namespace, backed by a durable on-disk index you
create with `CREATE INDEX ... USING fulltext`.

### Full-Text Search

```gql
-- Create the index once
CREATE INDEX post_content_fts FOR (p:Post) ON (p.content) USING fulltext;

-- BM25-ranked search: yields the matching node's id and its relevance score
CALL geode.fts.search('post_content_fts', 'graph database', 10) YIELD node, score;

-- Exact phrase match (position-based)
CALL geode.fts.phrase('post_content_fts', 'graph database') YIELD node, score;

-- Proximity: terms within N positions of each other
CALL geode.fts.proximity('post_content_fts', 'graph database', 5) YIELD node, score;
```

See [Full-Text Search](/docs/query/full-text-search/) for the full reference.

### Text Analysis

Tokenization, case-folding and stopword removal happen **inside** the full-text
index at write time; they are not exposed as callable GQL functions. There is no
`TOKENIZE()`, `STEM()`, `WORD_COUNT()`, `FUZZY_MATCH()` or `SOUNDEX()` in the
function registry.

For the substring and case-insensitive matching the evaluator does implement:

```gql
-- Case-insensitive containment
MATCH (p:Post)
WHERE icontains(p.content, 'graph database')
RETURN p.title;

-- Prefix matching (STARTS WITH / ENDS WITH are infix operators, not functions)
MATCH (u:User)
WHERE u.name STARTS WITH 'Ali'
RETURN u.name;
```

**Limitation**: edit-distance ("fuzzy") matching, phonetic matching, per-document
word counts and standalone stemming are not implemented in the engine. Compute
them client-side, or store the derived value as an ordinary indexed property.

## Vector Functions

### Vector Operations

```gql
-- Cosine similarity
MATCH (a:Product {id: 1}), (b:Product)
WHERE b <> a
RETURN b.name,
       similarity(a.embedding, b.embedding) AS similarity
ORDER BY similarity DESC
LIMIT 10;

-- Euclidean distance (euclidean() is an alias of vector_l2())
MATCH (a:Item), (b:Item)
RETURN a.id, b.id,
       euclidean(a.features, b.features) AS distance;

-- Dot product
MATCH (v:Vector)
RETURN vector_dot(v.vec1, v.vec2) AS dot_prod;

-- Vector magnitude: there is no built-in magnitude/norm function. The L2 norm
-- is the distance to the zero vector of the same dimensionality.
MATCH (v:Vector)
RETURN vector_l2(v.embedding, vectorf32([0.0, 0.0, 0.0])) AS mag;
```

## Custom Function Development

### Python UDFs

```python
# Register custom function
await client.execute("""
CREATE FUNCTION sentiment_score(text STRING)
RETURNS FLOAT
LANGUAGE PYTHON
AS $$
from textblob import TextBlob

def sentiment_score(text):
    blob = TextBlob(text)
    return blob.sentiment.polarity
$$
""")

# Use custom function
result, _ = await client.query("""
MATCH (p:Post)
RETURN p.content,
       sentiment_score(p.content) AS sentiment
ORDER BY sentiment DESC
""")
```

### JavaScript UDFs

```gql
-- Create JavaScript function
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.
    return price * (1 - (discounts[tier] || 0));
}
$$;

-- Use function
MATCH (p:Product)
RETURN p.name,
       p.price,
       calculate_discount(p.price, 'gold') AS discounted_price;
```

## Performance Tips for Functions

### Indexed Function Results

```gql
-- Create index on function result
CREATE INDEX user_name_upper ON User(UPPER(name));

-- Efficient case-insensitive search
MATCH (u:User)
WHERE UPPER(u.name) = UPPER($search_name)
RETURN u;
```

### Materialized Function Results

```gql
-- Pre-compute expensive functions
MATCH (u:User)
SET u.full_name_normalized = UPPER(TRIM(u.first_name || ' ' || u.last_name));

-- Later queries are fast
MATCH (u:User {full_name_normalized: 'ALICE SMITH'})
RETURN u;
```

### Avoid Repeated Function Calls

```gql
-- Inefficient: LENGTH called twice
MATCH (p:Product)
WHERE LENGTH(p.description) > 100 AND LENGTH(p.description) < 500
RETURN p;

-- Efficient: Compute once with WITH
MATCH (p:Product)
WITH p, LENGTH(p.description) AS desc_len
WHERE desc_len > 100 AND desc_len < 500
RETURN p;
```

## Function Reference Summary

### Aggregation

- COUNT, SUM, AVG, MIN, MAX, COLLECT, STRING_AGG
- STDDEV, VARIANCE, PERCENTILE_CONT

### String

- UPPER, LOWER, LENGTH, SUBSTRING, TRIM, CONCAT, REPLACE, SPLIT
- FULLTEXT_SEARCH, FUZZY_MATCH, SOUNDEX

### Math

- ABS, CEIL, FLOOR, ROUND, SIGN, POWER, SQRT, EXP, LOG
- SIN, COS, TAN, RAND

### Temporal

- CURRENT_DATE, CURRENT_TIME, CURRENT_TIMESTAMP, NOW
- DATE, DATETIME, DURATION, DATE_TRUNC

### List

- SIZE, HEAD, LAST, TAIL, REVERSE, RANGE, REDUCE

### Type Conversion

- TOSTRING, TOINTEGER, TOFLOAT, TOBOOLEAN

### Conditional

- COALESCE, CASE, NULLIF

### Graph

- SHORTEST_PATH, ALL_SHORTEST_PATHS, NODES, RELATIONSHIPS
- PageRank, Betweenness, Louvain

### Geospatial

- geospatial.distance, point

### Vector

- COSINE_SIMILARITY, EUCLIDEAN_DISTANCE, DOT_PRODUCT

## Related Topics

- **[GQL Operators](/tags/operators/)**: Operators work alongside functions in expressions
- **[Data Types](/tags/types/)**: Understand type compatibility for function arguments
- **[Query Optimization](/tags/query-optimization/)**: Optimize function usage for performance
- **[Aggregation](/tags/aggregation/)**: Deep dive into aggregation patterns
- **[GQL Reference](/tags/gql-reference/)**: Complete function documentation
- **[Stored Procedures](/tags/stored-procedures/)**: Creating custom functions
- **[Graph Algorithms](/tags/graph-algorithms/)**: Algorithm implementations

## Further Reading

- [GQL Operators](/tags/operators/) - Operators and expressions
- [Data Types](/tags/types/) - Type system and conversions
- [Query Performance](/tags/performance/) - Optimize function calls
- [Aggregation Patterns](/tags/aggregation/) - Advanced aggregation techniques
- [GQL Reference](/tags/gql-reference/) - Complete language documentation
- Function Performance Guide - Optimization strategies
- Custom Function Development - UDF best practices

Master Geode's built-in functions to write expressive, powerful queries that transform and analyze your graph data efficiently.
