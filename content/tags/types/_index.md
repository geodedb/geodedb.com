---
title: "Data Types"
description: "Comprehensive guide to Geode data types: primitives, collections, temporal types, and custom types for robust graph database schemas."
keywords:
  - data types
  - primitive types
  - collection types
  - temporal types
  - type system
  - schema types
  - GQL types
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/types/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Data types define the kinds of values that can be stored as properties in nodes and relationships. Geode implements the complete ISO/IEC 39075:2024 GQL type system, providing rich type support for graph data modeling.

## What are Data Types?

Data types specify:

- **Format**: How values are represented and stored
- **Operations**: What operations are valid on the values
- **Constraints**: What values are permitted (ranges, formats, etc.)
- **Storage**: How efficiently values are stored and retrieved

Strong typing ensures data integrity, enables query optimization, and provides clear contracts for application development.

## Primitive Types

### Boolean

True/false values:

```gql
// Boolean literals
CREATE (:User {verified: true, suspended: false})

// Boolean expressions
MATCH (u:User)
WHERE u.verified = true AND u.suspended <> true
RETURN u

// Null boolean
CREATE (:User {pending: NULL})  // Unknown/unset state
```

### Integer Types

Whole numbers of various sizes:

```gql
// Integer (64-bit signed: -2^63 to 2^63-1)
CREATE (:Counter {value: 42})
CREATE (:BigNumber {value: 9223372036854775807})

// Integer arithmetic
MATCH (c:Counter)
SET c.value = c.value + 1
RETURN c.value

// Integer ranges
MATCH (u:User) WHERE u.age BETWEEN 18 AND 65 RETURN u
```

### Floating Point Types

Decimal numbers:

```gql
// Float (64-bit IEEE 754 double precision)
CREATE (:Product {price: 99.99})
CREATE (:Measurement {value: 3.141592653589793})

// Scientific notation
CREATE (:Constant {avogadro: 6.022e23})

// Special float values
CREATE (:Special {
  positive_infinity: 1.0 / 0.0,
  negative_infinity: -1.0 / 0.0,
  not_a_number: 0.0 / 0.0
})

// Float precision
MATCH (p:Product)
RETURN ROUND(p.price * 1.0825, 2) AS total  // Round to 2 decimals
```

### Decimal Types

Exact numeric values for financial calculations:

```gql
// Decimal (arbitrary precision)
CREATE (:Account {
  balance: DECIMAL('10000.50'),
  interest_rate: DECIMAL('0.0375')
})

// Exact arithmetic (no floating point errors)
MATCH (a:Account)
SET a.balance = a.balance * (1 + a.interest_rate)
RETURN a.balance
```

### String Types

Text data with Unicode support:

```gql
// String literals (single or double quotes)
CREATE (:User {name: 'Alice', bio: "Software Engineer"})

// Unicode strings
CREATE (:Message {text: 'Hello 世界 🌍', lang: 'multi'})

// Escape sequences
CREATE (:Code {snippet: 'SELECT * FROM users\nWHERE id = \'123\''})

// Empty string vs null
CREATE (:User {
  name: '',           // Empty string (valid value)
  middle_name: NULL   // Null (no value)
})

// String operations
MATCH (u:User)
RETURN UPPER(u.name) AS name_upper,
       LOWER(u.name) AS name_lower,
       SUBSTRING(u.name, 0, 1) AS initial,
       LENGTH(u.name) AS name_length
```

### Bytes (Binary Data)

Raw binary data:

```gql
// Bytes literal (hexadecimal)
CREATE (:File {
  content: 0x89504E470D0A1A0A,  // PNG header
  hash: 0xDEADBEEF
})

// Bytes from encoding
CREATE (:Image {data: ENCODE('Hello', 'base64')})
```

## Temporal Types

### Date

Calendar dates without time:

```gql
// Date literals
CREATE (:Event {date: DATE('2024-06-15')})
CREATE (:Event {date: DATE('2024-W24-3')})  // Week date
CREATE (:Event {date: DATE('2024-166')})    // Ordinal date

// Current date
CREATE (:Event {created: CURRENT_DATE})

// Date arithmetic
MATCH (e:Event)
WHERE e.date >= DATE('2024-01-01')
  AND e.date < DATE('2025-01-01')
RETURN e

// Date components
MATCH (e:Event)
RETURN e.date.year AS year,
       e.date.month AS month,
       e.date.day AS day,
       e.date.dayOfWeek AS weekday
```

### Time

Time of day without date:

```gql
// Time literals (24-hour format)
CREATE (:Schedule {start: TIME('09:30:00')})
CREATE (:Schedule {start: TIME('14:45:30.500')})  // With milliseconds

// Time with timezone
CREATE (:Meeting {time: TIME('15:00:00-05:00')})  // EST

// Current time
CREATE (:Log {logged_at: CURRENT_TIME})

// Time comparison
MATCH (s:Schedule)
WHERE s.start >= TIME('09:00:00')
  AND s.start < TIME('17:00:00')
RETURN s
```

### DateTime (Timestamp)

Combined date and time:

```gql
// DateTime literals (ISO 8601)
CREATE (:Post {
  created_at: DATETIME('2024-06-15T14:30:00'),
  updated_at: DATETIME('2024-06-15T14:30:00.123Z'),  // UTC
  scheduled: DATETIME('2024-06-16T09:00:00-05:00')   // With timezone
})

// Current timestamp
CREATE (:Event {timestamp: CURRENT_TIMESTAMP})
CREATE (:Event {timestamp: datetime()})  // Alias

// DateTime arithmetic
MATCH (p:Post)
WHERE p.created_at > DATETIME() - duration('P7D')  // Last 7 days
RETURN p

// Extract components
MATCH (p:Post)
RETURN p.created_at.year AS year,
       p.created_at.month AS month,
       p.created_at.day AS day,
       p.created_at.hour AS hour,
       p.created_at.minute AS minute,
       p.created_at.second AS second,
       p.created_at.timezone AS tz
```

### Duration

Time intervals:

```gql
// Duration literals (ISO 8601)
CREATE (:Task {
  estimated: duration('PT2H30M'),    // 2 hours 30 minutes
  actual: duration('P1DT6H'),        // 1 day 6 hours
  timeout: duration('PT30S')         // 30 seconds
})

// Duration components
MATCH (t:Task)
RETURN t.estimated.days AS days,
       t.estimated.hours AS hours,
       t.estimated.minutes AS minutes,
       t.estimated.seconds AS seconds

// Duration arithmetic
MATCH (e:Event)
SET e.end_time = e.start_time + duration('PT1H')
RETURN e.start_time, e.end_time
```

## Collection Types

### Lists (Arrays)

Ordered sequences of values:

```gql
// List literals
CREATE (:User {
  tags: ['developer', 'python', 'golang'],
  scores: [95, 87, 92, 88],
  mixed: [1, 'two', 3.0, true]  // Mixed types allowed
})

// Empty list
CREATE (:User {favorites: []})

// List access
MATCH (u:User)
RETURN u.tags[0] AS first_tag,
       u.tags[-1] AS last_tag,
       u.tags[1..3] AS middle_tags

// List operations
MATCH (u:User)
RETURN SIZE(u.tags) AS tag_count,
       u.tags + ['new-tag'] AS expanded,
       REVERSE(u.tags) AS reversed

// List predicates
MATCH (u:User)
WHERE 'python' IN u.tags
RETURN u

MATCH (u:User)
WHERE ALL(score IN u.scores WHERE score >= 80)
RETURN u

// List comprehension
MATCH (u:User)
RETURN [tag IN u.tags WHERE LENGTH(tag) > 5] AS long_tags
```

### Maps (Records)

Key-value pairs:

```gql
// Map literals
CREATE (:User {
  profile: {
    bio: 'Software Engineer',
    location: 'San Francisco',
    website: 'https://example.com'
  },
  settings: {
    theme: 'dark',
    notifications: true,
    language: 'en'
  }
})

// Empty map
CREATE (:User {metadata: {}})

// Map access
MATCH (u:User)
RETURN u.profile.bio AS bio,
       u.settings['theme'] AS theme

// Dynamic key access
MATCH (u:User)
WITH u, 'location' AS key
RETURN u.profile[key] AS value

// Map operations
MATCH (u:User)
RETURN KEYS(u.profile) AS profile_keys,
       VALUES(u.profile) AS profile_values,
       SIZE(u.profile) AS profile_size
```

### Sets

Unordered collections of unique values:

```gql
// Sets (represented as lists with uniqueness)
CREATE (:Group {
  member_ids: [1, 2, 3, 4, 5]  // Treat as set
})

// Set operations via list functions
MATCH (g1:Group {id: 1}), (g2:Group {id: 2})
WITH g1.member_ids AS set1, g2.member_ids AS set2
RETURN [x IN set1 WHERE x IN set2] AS intersection,
       [x IN set1 WHERE NOT x IN set2] + set2 AS union
```

## Null Type

Represents absence of value:

```gql
// Null literal
CREATE (:User {
  email: 'alice@example.com',
  phone: NULL  // No phone number
})

// Null checking
MATCH (u:User)
WHERE u.phone IS NULL
RETURN u

MATCH (u:User)
WHERE u.phone IS NOT NULL
RETURN u

// Null coalescing
MATCH (u:User)
RETURN COALESCE(u.nickname, u.username, 'Anonymous') AS display_name

// Null in collections
CREATE (:Data {values: [1, NULL, 3, NULL, 5]})

MATCH (d:Data)
RETURN [v IN d.values WHERE v IS NOT NULL] AS non_null_values
```

## Graph-Specific Types

### Node References

References to graph nodes:

```gql
// Store node reference
MATCH (u:User {id: 123})
CREATE (:Audit {actor: u})  // Stores reference to user node

// Retrieve via reference
MATCH (a:Audit)
RETURN a.actor.name AS actor_name
```

### Relationship References

References to graph relationships:

```gql
// Store relationship reference
MATCH (u1:User)-[f:FOLLOWS]->(u2:User)
CREATE (:Event {relationship: f})

// Access relationship properties
MATCH (e:Event)
RETURN e.relationship.since AS follow_since
```

### Path Type

Represents graph traversal paths:

```gql
// Path variable
MATCH path = (a:User)-[:KNOWS*1..3]->(b:User)
RETURN path,
       LENGTH(path) AS hops,
       NODES(path) AS users_in_path,
       RELATIONSHIPS(path) AS connections
```

## Type Conversion

### Explicit Casting

```gql
// String to number
RETURN TOINTEGER('123') AS int_value,
       TOFLOAT('3.14') AS float_value

// Number to string
RETURN TOSTRING(42) AS str_value

// String to boolean
RETURN TOBOOLEAN('true') AS bool_value

// Date/time conversions
RETURN DATE('2024-06-15') AS date_obj,
       DATETIME('2024-06-15T14:30:00') AS datetime_obj
```

### Implicit Coercion

```gql
// Numeric types coerce in arithmetic
RETURN 42 + 3.14 AS result  // Integer + Float = Float

// Strings concatenate with +
RETURN 'Count: ' + TOSTRING(42) AS message

// Booleans in conditions
MATCH (u:User)
WHERE u.verified  // Implicit = true
RETURN u
```

## Type Constraints

### Property Type Constraints

```gql
// Enforce type on property
CREATE CONSTRAINT ON (u:User)
ASSERT u.email IS :: STRING

CREATE CONSTRAINT ON (p:Product)
ASSERT p.price IS :: FLOAT

CREATE CONSTRAINT ON (e:Event)
ASSERT e.date IS :: DATE
```

### Type Validation

```gql
// Validate before insert
MATCH (u:User)
WHERE u.age IS :: INTEGER AND u.age >= 0
RETURN u

// Type checking
MATCH (n)
WHERE TYPE(n.value) = 'INTEGER'
RETURN n
```

## Performance Considerations

### Type-Specific Indexing

```gql
// B-tree indexes for ordered types (numbers, dates, strings)
CREATE INDEX FOR (u:User) ON (u.created_at)  // Date index
CREATE INDEX FOR (p:Product) ON (p.price)    // Numeric index

// Hash indexes for equality (any type)
CREATE INDEX FOR (u:User) ON (u.id)

// Text indexes for string search
CREATE INDEX FOR (p:Post) ON (p.content) USING fulltext
```

### Type-Aware Storage

- **Integers**: Fixed-width encoding (8 bytes for 64-bit)
- **Strings**: Variable-length with UTF-8 encoding
- **Dates**: Compact binary representation (day offset)
- **Lists**: Length prefix + elements
- **Maps**: Size prefix + key-value pairs

## Best Practices

1. **Choose Appropriate Types**: Use DATE for dates, not strings; INTEGER for counts, not floats
2. **Consistent Types**: Keep property types consistent across nodes with the same label
3. **Null Handling**: Decide if null is valid for each property; use constraints if not
4. **Collection Sizing**: Avoid very large lists/maps in properties; consider separate nodes
5. **Temporal Precision**: Use Date for day-level, DateTime for second/millisecond precision
6. **Decimal for Money**: Always use DECIMAL for currency to avoid rounding errors
7. **Type Constraints**: Define type constraints early in schema design

## Common Type Patterns

### Enumerations

```gql
// Enum-like constraints
CREATE CONSTRAINT ON (u:User)
ASSERT u.status IN ['active', 'inactive', 'suspended']

CREATE CONSTRAINT ON (o:Order)
ASSERT o.status IN ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
```

### Tagged Unions

```gql
// Type discriminator pattern
CREATE (:Notification {
  type: 'email',
  data: {to: 'user@example.com', subject: 'Welcome', body: '...'}
})

CREATE (:Notification {
  type: 'sms',
  data: {phone: '+1234567890', message: 'Code: 123456'}
})
```

### Polymorphic Properties

```gql
// Store different types in same property
CREATE (:Config {value: 'string-value'})
CREATE (:Config {value: 42})
CREATE (:Config {value: true})
CREATE (:Config {value: ['list', 'of', 'values']})
```

## Client Library Type Mapping

### Python

```python
# Python to GQL type mapping
client.query("""
    CREATE (:Data {
        bool_val: $bool,
        int_val: $int,
        float_val: $float,
        str_val: $str,
        date_val: $date,
        datetime_val: $datetime,
        list_val: $list,
        map_val: $map,
        null_val: $null
    })
""", {
    "bool": True,                          # Boolean
    "int": 42,                             # Integer
    "float": 3.14,                         # Float
    "str": "hello",                        # String
    "date": datetime.date(2024, 6, 15),    # Date
    "datetime": datetime.datetime.now(),   # DateTime
    "list": [1, 2, 3],                     # List
    "map": {"key": "value"},               # Map
    "null": None                           # Null
})
```

### Go

```go
// Go to GQL type mapping
_, err := db.Exec(`
    CREATE (:Data {
        bool_val: $1,
        int_val: $2,
        float_val: $3,
        str_val: $4,
        date_val: $5,
        datetime_val: $6,
        list_val: $7
    })
`,
    true,                                  // bool -> Boolean
    int64(42),                             // int64 -> Integer
    3.14,                                  // float64 -> Float
    "hello",                               // string -> String
    time.Date(2024, 6, 15, 0, 0, 0, 0, time.UTC),  // time.Time -> Date
    time.Now(),                            // time.Time -> DateTime
    []interface{}{1, 2, 3},                // []interface{} -> List
)
```

### Rust

```rust
// Rust to GQL type mapping
client.query(
    r#"
        CREATE (:Data {
            bool_val: $bool,
            int_val: $int,
            float_val: $float,
            str_val: $str,
            list_val: $list
        })
    "#,
    &[
        ("bool", &true),                   // bool -> Boolean
        ("int", &42i64),                   // i64 -> Integer
        ("float", &3.14f64),               // f64 -> Float
        ("str", &"hello".to_string()),     // String -> String
        ("list", &vec![1, 2, 3]),          // Vec<T> -> List
    ]
).await?;
```

## Related Topics

- **GQL Operators**: Operations on different data types
- **Functions**: Built-in functions for type manipulation
- **Constraints**: Enforce type and value constraints
- **Indexing**: Type-specific index strategies
- **Schema Design**: Choosing types for your graph model

## Further Reading

- [GQL Operators](/tags/operators/) - Type-aware operators
- [GQL Functions](/tags/functions/) - Type conversion and manipulation functions
- [Schema Design](/tags/modeling/) - Choosing appropriate types
- [Performance](/tags/performance/) - Type-specific optimization
- [GQL Reference](/tags/gql-reference/) - Complete type system documentation

Understanding Geode's type system enables you to build robust, efficient graph schemas that ensure data integrity and optimize query performance.
