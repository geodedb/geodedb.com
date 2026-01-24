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

// String aggregation
MATCH (t:Tag)
RETURN STRING_AGG(t.name, ', ') AS tag_list
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

// SUBSTRING - extract substring
MATCH (u:User)
RETURN SUBSTRING(u.email, 0, POSITION('@', u.email)) AS username

// TRIM/LTRIM/RTRIM - remove whitespace
MATCH (t:Text)
RETURN TRIM(t.value) AS trimmed

// CONCAT - concatenate strings
MATCH (u:User)
RETURN CONCAT(u.first_name, ' ', u.last_name) AS full_name

// REPLACE - replace substring
MATCH (t:Text)
RETURN REPLACE(t.content, 'old', 'new') AS updated

// SPLIT - split string into list
MATCH (t:Tag)
RETURN SPLIT(t.path, '/') AS path_parts

// Regular expressions
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
       NOW() AS timestamp

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
WHERE e.timestamp > NOW() - DURATION('P7D')  // Last 7 days
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
RETURN o.id, REDUCE(total = 0, price IN subtotals | total + price) AS order_total
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

Cryptographic and encoding operations:

```gql
// Hash functions
RETURN SHA256('password') AS hash,
       MD5('data') AS md5_hash

// Encoding
RETURN BASE64_ENCODE('Hello World') AS encoded,
       BASE64_DECODE('SGVsbG8gV29ybGQ=') AS decoded,
       URL_ENCODE('hello world') AS url_encoded
```

## Advanced Function Usage

### Window Functions

Compute over partitions:

```gql
// Row number within partition
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name,
       p.name,
       ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY p.price DESC) AS rank

// Running totals
MATCH (t:Transaction)
RETURN t.date,
       t.amount,
       SUM(t.amount) OVER (ORDER BY t.date) AS running_total

// Moving averages
MATCH (m:Measurement)
RETURN m.timestamp,
       m.value,
       AVG(m.value) OVER (
         ORDER BY m.timestamp
         ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING
       ) AS moving_avg
```

### User-Defined Functions

Extend with custom functions (Python example):

```python
from geode_client import GeodeClient

async with GeodeClient('localhost:3141') as client:
    # Register custom function
    await client.execute("""
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
    result = await client.query("""
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
SET u.full_name = CONCAT(u.first_name, ' ', u.last_name),
    u.name_length = LENGTH(u.full_name)
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
WHERE e.timestamp >= DATE_TRUNC('month', NOW())
WITH DATE_TRUNC('day', e.timestamp) AS day, COUNT(*) AS count
RETURN day, count
ORDER BY day
```

## Related Topics

- **GQL Operators**: Operators work alongside functions in expressions
- **Data Types**: Understand type compatibility for function arguments
- **Query Optimization**: Optimize function usage for performance
- **Aggregation**: Deep dive into aggregation patterns
- **GQL Reference**: Complete function documentation

## Further Reading

- [GQL Operators](/tags/operators/) - Operators and expressions
- [Data Types](/tags/types/) - Type system and conversions
- [Query Performance](/tags/performance/) - Optimize function calls
- [Aggregation Patterns](/tags/aggregation/) - Advanced aggregation techniques
- [GQL Reference](/tags/gql-reference/) - Complete language documentation

Master Geode's built-in functions to write expressive, powerful queries that transform and analyze your graph data efficiently.