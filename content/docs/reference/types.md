---
title: "Data Types Reference"
description: "Complete reference for all 50+ data types in Geode including core types, temporal types, collection types, vector types, geographic types, and specialized types with constructors and conversion rules"
summary: "Comprehensive data types reference covering Geode's full type system with constructors, storage characteristics, indexing recommendations, and type conversion rules."
slug: "types"
url: "/docs/reference/types/"
date: 2026-01-28
lastmod: 2026-01-28
draft: false
weight: 26
keywords: ["data types", "type system", "type conversion", "vectors", "temporal types", "geographic types", "JSON", "UUID"]
tags: ["reference", "types", "data-model"]
categories: ["Reference"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/reference/types/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Data Types Reference

Geode provides **50+ specialized data types** optimized for different use cases. This reference documents all types, their constructors, storage characteristics, and indexing recommendations.

## Type System Overview

### Type Categories

| Category | Types | Description |
|----------|-------|-------------|
| **Core** | NULL, BOOLEAN, INTEGER, FLOAT, STRING, BYTES | Fundamental types |
| **Numeric** | INT8-INT64, FLOAT32-FLOAT64, DECIMAL | Precision-specific numerics |
| **Temporal** | DATE, TIME, TIMESTAMP, ZONED_DATETIME, DURATION, INTERVAL | Date and time |
| **Collection** | LIST, MAP, SET | Compound types |
| **Vector** | VECTOR_F32, VECTOR_I32 | ML embeddings |
| **Geographic** | LATLON, GEOPOINT, POLYGON | Spatial data |
| **Network** | IPADDR, SUBNET, MACADDR | Network addressing |
| **Structured** | JSON, JSONB | Semi-structured data |
| **Identity** | UUID, HASH | Unique identifiers |
| **Financial** | MONEY, BIGDECIMAL | Exact decimals |

---

## Core Types

### NULL

Represents the absence of a value.

```gql
-- NULL literal
RETURN null AS empty;

-- NULL check
MATCH (p:Person)
WHERE p.middle_name IS NULL
RETURN p.name;

-- NULL coalescing
RETURN coalesce(p.nickname, p.name) AS display_name;
```

**Properties:**
- NULL propagates through most operations
- NULL = NULL evaluates to NULL (not true)
- Use `IS NULL` / `IS NOT NULL` for comparisons

---

### BOOLEAN

Logical true/false values.

**Storage:** 1 byte

```gql
-- Literals
CREATE (:User {active: true, verified: false});

-- Boolean operations
MATCH (u:User)
WHERE u.active AND NOT u.deleted
RETURN u.name;

-- Boolean expressions
MATCH (p:Person)
RETURN p.name, p.age >= 18 AS is_adult;
```

**Constructor:**
```gql
toBoolean('true')   -- true
toBoolean('false')  -- false
toBoolean(1)        -- true
toBoolean(0)        -- false
```

---

### INTEGER

Whole numbers (default 64-bit signed).

**Storage:** Variable (1-8 bytes based on value)

```gql
-- Literals
CREATE (:Product {id: 42, stock: 1000, price_cents: 1999});

-- Arithmetic
RETURN 10 + 5 * 3 AS result;  -- 25

-- Integer division
RETURN 7 / 2 AS quotient;     -- 3 (truncates)
```

**Constructor:**
```gql
toInteger('42')     -- 42
toInteger(3.7)      -- 3 (truncates)
toInteger(true)     -- 1
```

**Range:** -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807

---

### FLOAT

Floating-point numbers (IEEE 754 double precision).

**Storage:** 8 bytes

```gql
-- Literals
CREATE (:Measurement {value: 3.14159, tolerance: 0.001});

-- Scientific notation
RETURN 1.5e10 AS large_number;

-- Arithmetic
RETURN 7.0 / 2 AS division;  -- 3.5
```

**Constructor:**
```gql
toFloat('3.14')     -- 3.14
toFloat(42)         -- 42.0
```

**Special values:** `Infinity`, `-Infinity`, `NaN`

---

### STRING

UTF-8 encoded text.

**Storage:** Variable (length prefix + UTF-8 bytes)

```gql
-- Literals
CREATE (:Person {name: 'Alice', bio: "Software engineer"});

-- Concatenation
RETURN 'Hello' || ' ' || 'World' AS greeting;

-- String functions
RETURN upper('hello') AS uppercase;        -- 'HELLO'
RETURN substring('hello', 0, 3) AS sub;    -- 'hel'
RETURN length('hello') AS len;             -- 5
```

**Constructor:**
```gql
toString(42)              -- '42'
toString(3.14)            -- '3.14'
toString(true)            -- 'true'
toString(date('2026-01-28'))  -- '2026-01-28'
```

**Escapes:** `\n`, `\t`, `\\`, `\'`, `\"`

---

### BYTES

Raw binary data.

**Storage:** Variable (length prefix + raw bytes)

```gql
-- Hex literal
CREATE (:File {data: '\\x48656c6c6f'::bytea});

-- Base64 (if supported)
CREATE (:File {data: base64_decode('SGVsbG8=')});

-- Length
MATCH (f:File)
RETURN length(f.data) AS bytes;
```

**Constructor:**
```gql
'\\x48656c6c6f'::bytea    -- Hex encoding
bytes_from_hex('48656c6c6f')
```

---

## Numeric Types (Precision-Specific)

### Integer Variants

| Type | Storage | Range | Use Case |
|------|---------|-------|----------|
| `INT8` | 1 byte | -128 to 127 | Small counters |
| `INT16` | 2 bytes | -32,768 to 32,767 | Medium counters |
| `INT32` | 4 bytes | -2.1B to 2.1B | Default integer |
| `INT64` | 8 bytes | -9.2Q to 9.2Q | Large IDs |

```gql
-- Explicit constructors
RETURN int8(127) AS i8;
RETURN int16(32000) AS i16;
RETURN int32(2000000) AS i32;
RETURN int64(9000000000000) AS i64;
```

### Float Variants

| Type | Storage | Precision | Use Case |
|------|---------|-----------|----------|
| `FLOAT32` | 4 bytes | ~7 digits | Approximate decimals |
| `FLOAT64` | 8 bytes | ~15 digits | High-precision decimals |

```gql
RETURN float32(3.14) AS f32;
RETURN float64(3.14159265358979) AS f64;
```

### DECIMAL / BIGDECIMAL

Arbitrary-precision decimal numbers.

**Storage:** Variable

```gql
-- Exact decimal arithmetic
CREATE (:Account {balance: decimal('1234567.89')});

-- No floating-point errors
RETURN decimal('0.1') + decimal('0.2') AS sum;  -- 0.3 (exact)
```

**Constructor:**
```gql
decimal('123.456')
decimal('999999999999999999.999999999999')
```

**Use cases:** Financial calculations, currency, exact arithmetic

---

## Temporal Types

### DATE

Calendar date (year, month, day).

**Storage:** 4 bytes

```gql
-- Constructor
RETURN date('2026-01-28') AS d;

-- Current date
RETURN date() AS today;

-- Components
RETURN date('2026-01-28').year AS year;    -- 2026
RETURN date('2026-01-28').month AS month;  -- 1
RETURN date('2026-01-28').day AS day;      -- 28

-- Arithmetic
RETURN date('2026-01-28') + duration('P7D') AS next_week;
```

**Format:** ISO 8601 (`YYYY-MM-DD`)

---

### TIME

Time of day without timezone.

**Storage:** 8 bytes (nanosecond precision)

```gql
-- Constructor
RETURN time('14:30:00') AS t;
RETURN time('14:30:00.123456789') AS precise_time;

-- Components
RETURN time('14:30:45').hour AS hour;      -- 14
RETURN time('14:30:45').minute AS minute;  -- 30
RETURN time('14:30:45').second AS second;  -- 45
```

**Format:** ISO 8601 (`HH:MM:SS[.nnnnnnnnn]`)

---

### TIMESTAMP

Date and time with optional timezone.

**Storage:** 12 bytes

```gql
-- Constructor
RETURN timestamp('2026-01-28T14:30:00Z') AS ts;
RETURN timestamp('2026-01-28T14:30:00-05:00') AS ts_est;

-- Current timestamp
RETURN timestamp() AS now;

-- Arithmetic
MATCH (e:Event)
WHERE e.created_at > timestamp() - duration('P30D')
RETURN e.name;
```

**Format:** ISO 8601 (`YYYY-MM-DDTHH:MM:SS[.nnn][Z|+HH:MM]`)

---

### ZONED_DATETIME

Date and time with explicit timezone.

**Storage:** 16 bytes

```gql
-- Constructor with timezone
RETURN zoned_datetime('2026-01-28T14:30:00', 'America/New_York') AS zdt;

-- Timezone conversion
RETURN zdt.in_timezone('Europe/London') AS london_time;
```

---

### DURATION

Time span (ISO 8601 duration).

**Storage:** 16 bytes

```gql
-- Constructor
RETURN duration('P7D') AS one_week;           -- 7 days
RETURN duration('PT2H30M') AS two_half_hours; -- 2 hours 30 minutes
RETURN duration('P1Y2M3DT4H5M6S') AS complex; -- 1 year, 2 months, ...

-- Components
RETURN duration('P7D').days AS days;          -- 7
RETURN duration('PT2H30M').hours AS hours;    -- 2
RETURN duration('PT2H30M').minutes AS mins;   -- 30

-- Arithmetic
RETURN timestamp() + duration('P7D') AS next_week;
RETURN timestamp() - duration('PT1H') AS one_hour_ago;
```

**Format:** ISO 8601 (`PnYnMnDTnHnMnS`)

---

### INTERVAL

Time range for overlap queries.

**Storage:** 24 bytes

```gql
-- Constructor
RETURN interval('[2026-01-01, 2026-01-31]') AS january;

-- Open/closed bounds
RETURN interval('[2026-01-01, 2026-02-01)') AS january_exclusive;

-- Overlap query
MATCH (e:Event)
WHERE e.duration OVERLAPS interval('[2026-01-15, 2026-01-20]')
RETURN e.name;

-- Contains
MATCH (e:Event)
WHERE interval_contains(e.duration, timestamp('2026-01-15T12:00:00Z'))
RETURN e.name;
```

---

## Collection Types

### LIST

Ordered collection of values.

**Storage:** Variable

```gql
-- Literal
RETURN [1, 2, 3, 4, 5] AS numbers;
RETURN ['apple', 'banana', 'cherry'] AS fruits;

-- Indexing (0-based)
RETURN [10, 20, 30][0] AS first;   -- 10
RETURN [10, 20, 30][2] AS third;   -- 30
RETURN [10, 20, 30][-1] AS last;   -- 30 (negative indexing)

-- Slicing
RETURN [1, 2, 3, 4, 5][1..3] AS slice;  -- [2, 3]

-- Functions
RETURN size([1, 2, 3]) AS len;          -- 3
RETURN head([1, 2, 3]) AS first;        -- 1
RETURN tail([1, 2, 3]) AS rest;         -- [2, 3]
RETURN last([1, 2, 3]) AS final;        -- 3

-- List comprehension
RETURN [x * 2 FOR x IN [1, 2, 3]] AS doubled;  -- [2, 4, 6]
```

---

### MAP

Key-value pairs (dictionary/object).

**Storage:** Variable

```gql
-- Literal
RETURN {name: 'Alice', age: 30} AS person;

-- Access
RETURN {name: 'Alice'}.name AS name;           -- 'Alice'
RETURN {name: 'Alice'}['name'] AS name;        -- 'Alice'

-- Keys and values
RETURN keys({a: 1, b: 2}) AS k;                -- ['a', 'b']
RETURN values({a: 1, b: 2}) AS v;              -- [1, 2]

-- Merge
RETURN {a: 1} + {b: 2} AS merged;              -- {a: 1, b: 2}
```

---

### SET

Unordered collection of unique values.

**Storage:** Variable

```gql
-- Constructor
RETURN set([1, 2, 2, 3, 3, 3]) AS unique;  -- {1, 2, 3}

-- Operations
RETURN set_union({1, 2}, {2, 3}) AS union;        -- {1, 2, 3}
RETURN set_intersect({1, 2}, {2, 3}) AS inter;    -- {2}
RETURN set_difference({1, 2, 3}, {2}) AS diff;    -- {1, 3}

-- Membership
RETURN 2 IN {1, 2, 3} AS contains;                -- true
```

---

## Vector Types

### VECTOR_F32

32-bit floating-point vector for ML embeddings.

**Storage:** 4 bytes per dimension

```gql
-- Constructor
RETURN '[0.1, 0.2, 0.3, 0.4]'::vector_f32 AS v;

-- From array
RETURN vector_f32([0.1, 0.2, 0.3, 0.4]) AS v;

-- Distance functions
RETURN vector_distance_l2(v1, v2) AS euclidean;
RETURN vector_distance_cosine(v1, v2) AS cosine;
RETURN vector_distance_dot(v1, v2) AS dot_product;

-- Dimension
RETURN vector_dimension(v) AS dims;
```

**Indexing:** HNSW index for approximate nearest neighbor search

```gql
CREATE INDEX doc_embedding_idx ON :Document(embedding) USING VECTOR
  OPTIONS { metric: 'cosine', dimensions: 512 };
```

---

### VECTOR_I32

32-bit integer vector.

**Storage:** 4 bytes per dimension

```gql
RETURN '[1, 2, 3, 4]'::vector_i32 AS v;
RETURN vector_i32([1, 2, 3, 4]) AS v;
```

---

## Geographic Types

### LATLON

Latitude/longitude coordinate pair.

**Storage:** 16 bytes

```gql
-- Constructor
RETURN latlon(40.7128, -74.0060) AS nyc;

-- Components
RETURN latlon(40.7128, -74.0060).latitude AS lat;   -- 40.7128
RETURN latlon(40.7128, -74.0060).longitude AS lon;  -- -74.0060

-- Distance (meters)
RETURN geo_distance(
  latlon(40.7128, -74.0060),
  latlon(34.0522, -118.2437)
) AS nyc_to_la;
```

**Indexing:** Spatial (R-tree) index

---

### GEOPOINT

Generic geographic point.

**Storage:** 16 bytes

```gql
RETURN geopoint(40.7128, -74.0060) AS point;
```

---

### POLYGON

Geographic polygon (boundary).

**Storage:** Variable

```gql
-- Constructor from points
RETURN polygon([
  latlon(40.70, -74.05),
  latlon(40.70, -73.95),
  latlon(40.75, -73.95),
  latlon(40.75, -74.05)
]) AS manhattan;

-- Containment check
MATCH (s:Store)
WHERE geo_within_polygon(s.location, $manhattan_polygon)
RETURN s.name;
```

---

## Network Types

### IPADDR

IPv4 or IPv6 address.

**Storage:** 4 bytes (IPv4) or 16 bytes (IPv6)

```gql
-- Constructor
RETURN '192.168.1.100'::ipaddr AS ip4;
RETURN '2001:db8::1'::ipaddr AS ip6;

-- Version check
RETURN ip_version('192.168.1.100'::ipaddr) AS version;  -- 4

-- Subnet containment
MATCH (s:Server)
WHERE subnet_contains('192.168.0.0/16'::subnet, s.ip)
RETURN s.hostname;
```

---

### SUBNET

IP network in CIDR notation.

**Storage:** 5 bytes (IPv4) or 17 bytes (IPv6)

```gql
-- Constructor
RETURN '192.168.1.0/24'::subnet AS network;
RETURN '10.0.0.0/8'::subnet AS large_network;

-- Containment
RETURN subnet_contains('10.0.0.0/8'::subnet, '10.1.2.3'::ipaddr);  -- true

-- Network address
RETURN network_address('192.168.1.100/24'::subnet);  -- 192.168.1.0

-- Broadcast address
RETURN broadcast_address('192.168.1.0/24'::subnet);  -- 192.168.1.255
```

**Indexing:** Patricia trie for efficient prefix queries

---

### MACADDR

MAC (hardware) address.

**Storage:** 6 bytes

```gql
-- Constructor
RETURN '00:1A:2B:3C:4D:5E'::macaddr AS mac;
RETURN '001A.2B3C.4D5E'::macaddr AS mac_cisco;

-- Manufacturer prefix
RETURN mac_manufacturer_prefix('00:1A:2B:3C:4D:5E'::macaddr);
```

---

## Structured Types

### JSON

JSON text (stored as string, parsed on access).

**Storage:** Variable (UTF-8 string)

```gql
-- Constructor
RETURN '{"name": "Alice", "age": 30}'::json AS j;

-- Path access
RETURN j->'name' AS name;           -- "Alice" (as JSON string)
RETURN j->>'name' AS name;          -- Alice (as text)
RETURN j->'tags'->0 AS first_tag;   -- First array element
```

---

### JSONB

Binary JSON (parsed and validated on insert).

**Storage:** Variable (binary format)

```gql
-- Constructor
RETURN '{"name": "Alice", "tags": ["a", "b"]}'::jsonb AS j;

-- Path access (same as JSON)
RETURN j->'name' AS name;
RETURN j->'tags'->0 AS first_tag;

-- Containment
RETURN '{"a": 1}'::jsonb @> '{"a": 1, "b": 2}'::jsonb;  -- Does left contain right?

-- Key existence
RETURN '{"a": 1}'::jsonb ? 'a';  -- true
```

**Advantages over JSON:**
- Faster queries (pre-parsed)
- Indexable with JSONB inverted index
- Supports containment operators

---

## Identity Types

### UUID

Universally Unique Identifier (128-bit).

**Storage:** 16 bytes

```gql
-- Generate random UUID (v4)
RETURN gen_random_uuid() AS id;

-- From string
RETURN '550e8400-e29b-41d4-a716-446655440000'::uuid AS id;

-- Version
RETURN uuid_version('550e8400-e29b-41d4-a716-446655440000'::uuid);  -- 4
```

**Indexing:** Hash index recommended for equality lookups

---

### HASH

Cryptographic hash (e.g., SHA-256).

**Storage:** Variable (depends on algorithm)

```gql
-- SHA-256 hash
RETURN sha256('hello') AS hash;

-- Store hash
CREATE (:File {
  name: 'document.pdf',
  sha256: sha256(content)
});

-- Compare
MATCH (f:File)
WHERE f.sha256 = sha256($input_content)
RETURN f.name;
```

---

## Financial Types

### MONEY

Currency amount with precision.

**Storage:** 8 bytes + currency code

```gql
-- Constructor
RETURN money(99.99, 'USD') AS price;
RETURN money(1234.56, 'EUR') AS euro_amount;

-- Arithmetic (same currency only)
RETURN money(10.00, 'USD') + money(5.50, 'USD') AS total;

-- Currency code
RETURN money(99.99, 'USD').currency AS code;  -- 'USD'
```

---

## Type Conversion Reference

### Explicit Conversion Functions

| From | To | Function | Example |
|------|-----|----------|---------|
| STRING | INTEGER | `toInteger()` | `toInteger('42')` |
| STRING | FLOAT | `toFloat()` | `toFloat('3.14')` |
| STRING | BOOLEAN | `toBoolean()` | `toBoolean('true')` |
| * | STRING | `toString()` | `toString(42)` |
| FLOAT | INTEGER | `toInteger()` | `toInteger(3.7)` (truncates to 3) |
| INTEGER | FLOAT | `toFloat()` | `toFloat(42)` |
| LIST | SET | `set()` | `set([1,1,2])` |

### Implicit Type Promotion

| Operation | Result Type |
|-----------|-------------|
| INTEGER + INTEGER | INTEGER |
| INTEGER + FLOAT | FLOAT |
| FLOAT + FLOAT | FLOAT |
| INTEGER * FLOAT | FLOAT |
| INTEGER / INTEGER | INTEGER (truncates) |
| INTEGER / FLOAT | FLOAT |

### Type Checking Functions

```gql
RETURN type(value) AS type_name;
RETURN value IS INTEGER AS is_int;
RETURN value IS STRING AS is_string;
RETURN value IS NULL AS is_null;
```

---

## Type-to-Index Mapping

| Type | Recommended Index | Operations Supported |
|------|-------------------|---------------------|
| INTEGER, STRING | B-tree | =, <, >, <=, >=, BETWEEN |
| INTEGER, STRING | Hash | = (equality only) |
| STRING (text) | Full-text | Text search, BM25 |
| JSONB | JSONB inverted | Path queries |
| VECTOR_F32/I32 | HNSW | Similarity search |
| LATLON, GEOPOINT | Spatial | Distance, containment |
| IPADDR, SUBNET | Patricia trie | Prefix, containment |
| INTERVAL | Interval tree | Overlap queries |

---

## Related Documentation

- [Data Model and Types](/docs/model/data-model-and-types/) - Schema design guide
- [Type Conversion](/docs/reference/type-conversion/) - Detailed conversion rules
- [Index Types Reference](/docs/reference/indexes/) - Indexing by type
- [Operators Reference](/docs/reference/operators/) - Type-compatible operators

---

**Last Updated:** January 28, 2026
**Geode Version:** v0.18.0+
**Type Count:** 50+ specialized types
