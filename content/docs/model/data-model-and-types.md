---
title: "Data Model and Types"
description: "Property-graph modeling in Geode plus the full type system (numeric, temporal, JSON, binary, vectors) with constructors and conversion rules"
url: /docs/model/data-model-and-types/
weight: 10
tags:
  - data-model
  - types
  - property-graph
  - schema
  - vectors
  - json
categories:
  - graph-databases-101
  - gql
keywords:
  - property graph
  - geode types
  - json
  - timestamp
  - vector embeddings
---

<!-- CANARY: REQ=REQ-GQL-001; FEATURE="BasicQuery"; ASPECT=Testing; STATUS=TESTED; OWNER=test; UPDATED=2025-10-02 -->

# Data Model and Types

Understand Geode's property graph model and comprehensive type system with practical guidance for schema design and indexing.

## Property Graph Model

Geode implements the **property graph** model as defined by ISO/IEC 39075:2024 GQL.

### Core Concepts

**Nodes (Vertices)**:
- Basic unit representing entities
- Can have zero or more **labels** (e.g., `:Person`, `:Employee`)
- Can have **properties** (key-value pairs)
- Example: `(:Person {name: "Alice", age: 30})`

**Relationships (Edges)**:
- Directed connections between nodes
- Have exactly one **type** (e.g., `:KNOWS`, `:WORKS_AT`)
- Can have **properties** (key-value pairs)
- Example: `(a)-[:KNOWS {since: 2020}]->(b)`

**Properties**:
- Key-value pairs attached to nodes or relationships
- Keys are strings
- Values are typed (see Type System below)
- Example: `{name: "Alice", age: 30, active: true}`

**Graphs**:
- Named collections of nodes and relationships
- Created with `CREATE GRAPH <name>`
- Selected with `USE <name>`

### Example Model

```gql
-- Create a graph
CREATE GRAPH CompanyGraph;
USE CompanyGraph;

-- Nodes with labels and properties
CREATE (:Person {id: 1, name: "Alice", age: 30, email: "[email protected]"});
CREATE (:Person {id: 2, name: "Bob", age: 25, email: "[email protected]"});
CREATE (:Company {id: 100, name: "Acme Corp", founded: 2010});

-- Relationships with type and properties
MATCH (p:Person {name: "Alice"}), (c:Company {name: "Acme Corp"})
CREATE (p)-[:WORKS_AT {since: 2020, role: "Engineer"}]->(c);

MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS {since: 2018}]->(b);
```

### Schema Constraints

**Current status**: Basic constraint support implemented.

```gql
-- Unique constraint on property
CREATE CONSTRAINT unique_person_email ON Person(email) ASSERT UNIQUE;

-- NOT NULL constraint
CREATE CONSTRAINT person_name_required ON Person(name) ASSERT NOT NULL;
```

**Planned**: Additional constraint types (foreign key, cardinality, pattern constraints) per ISO standard.

## Type System

Geode provides **50+ specialized types** with optimized storage and indexing.

### Core Types

#### Null

```gql
-- Null value
RETURN null AS empty_value;

-- Check for null
MATCH (p:Person)
WHERE p.phone IS NULL
RETURN p.name;
```

#### Boolean

```gql
-- Boolean literals
CREATE (:User {active: true, verified: false});

-- Boolean operations
MATCH (u:User)
WHERE u.active AND NOT u.deleted
RETURN u.name;
```

#### Integer

**Storage**: Variable-width integer storage (Int8, Int16, Int32, Int64)

```gql
-- Integer literals
CREATE (:Product {id: 42, stock: 100, price_cents: 1999});

-- Integer operations
MATCH (p:Product)
WHERE p.stock > 0 AND p.price_cents <= 5000
RETURN p.id;
```

#### String

**Storage**: UTF-8 encoded strings with efficient representation

```gql
-- String literals
CREATE (:Person {name: "Alice", bio: "Software engineer"});

-- String operations
MATCH (p:Person)
WHERE p.name STARTS WITH "Al"
RETURN p.name;

-- Concatenation
MATCH (p:Person)
RETURN p.name + " <" + p.email + ">" AS display;
```

**See also**: [Unicode Support](/docs/reference/unicode-support/) for identifier and string handling.

### Numeric Types

**From `TYPES_AND_FUNCTIONS.md`**:

| Type | Storage | Range | Use Case |
|------|---------|-------|----------|
| `Int8` | 1 byte | -128 to 127 | Small counters |
| `Int16` | 2 bytes | -32,768 to 32,767 | Medium counters |
| `Int32` | 4 bytes | -2B to 2B | Default integer |
| `Int64` | 8 bytes | -9Q to 9Q | Large IDs |
| `Float32` | 4 bytes | IEEE 754 single | Approximate decimals |
| `Float64` | 8 bytes | IEEE 754 double | High-precision decimals |
| `Decimal` | Variable | Arbitrary precision | Financial data |

**Constructors** (from `TYPE_QUICK_REFERENCE.md`):

```gql
-- Explicit type constructors
RETURN int8(127) AS i8;
RETURN int16(32000) AS i16;
RETURN int32(2000000) AS i32;
RETURN int64(9000000000) AS i64;

RETURN float32(3.14) AS f32;
RETURN float64(3.14159265359) AS f64;

RETURN decimal('123.456789') AS dec;
```

### Temporal Types

**From `TYPE_QUICK_REFERENCE.md`**:

| Type | Description | Example |
|------|-------------|---------|
| `Date` | Calendar date | `2024-01-15` |
| `Time` | Time of day (no timezone) | `14:30:00` |
| `Timestamp` | Date + time with timezone | `2024-01-15T14:30:00Z` |
| `Interval` | Duration | `P7D` (7 days) |

**Constructors**:

```gql
-- Date
RETURN date('2024-01-15') AS d;

-- Time
RETURN time('14:30:00') AS t;
RETURN time('14:30:00.123') AS t_millis;

-- Timestamp with timezone
RETURN timestamp('2024-01-15T14:30:00Z') AS ts;
RETURN timestamp('2024-01-15T14:30:00-05:00') AS ts_est;

-- Interval (ISO 8601 duration)
RETURN interval('P7D') AS one_week;
RETURN interval('PT2H30M') AS two_hours_thirty_minutes;

-- Current time
RETURN timestamp() AS now;
```

**Arithmetic**:

```gql
-- Add interval to date
RETURN date('2024-01-15') + interval('P7D') AS next_week;

-- Subtract dates
RETURN date('2024-01-22') - date('2024-01-15') AS days_between;

-- Timestamp arithmetic
MATCH (e:Event)
WHERE e.created_at > timestamp() - interval('P30D')
RETURN e.name;
```

### Advanced Types

#### JSON and JSONB

**Storage**: Parsed JSON with path indexing support

```gql
-- JSON literal
CREATE (:Document {
  metadata: '{"author": "Alice", "tags": ["ai", "ml"], "version": 2}'::jsonb
});

-- JSON path queries
MATCH (d:Document)
WHERE d.metadata->'version' = 2
RETURN d.metadata->'author' AS author;

-- Array access
MATCH (d:Document)
WHERE d.metadata->'tags'->0 = '"ai"'
RETURN d.metadata;
```

**JSONB benefits**:
- Parsed and validated on insert
- Efficient path indexing
- Faster querying than text JSON

**See also**: [Indexing JSON](/docs/query/indexing-and-optimization#json-indexing)

#### Binary Data (Bytea)

**Storage**: Raw binary data

```gql
-- Bytea from hex
CREATE (:File {
  data: '\\x48656c6c6f'::bytea,
  hash: '\\xdeadbeef'::bytea
});

-- Length
MATCH (f:File)
RETURN length(f.data) AS bytes;
```

#### Vector Embeddings

**Types**: `VectorF32`, `VectorI32` (from `TYPES_AND_FUNCTIONS.md`)

**Storage**: Fixed-dimension arrays with SIMD-optimized operations

```gql
-- Create vector (F32)
CREATE (:Document {
  embedding: '[0.1, 0.2, 0.3, 0.4]'::vector_f32
});

-- Vector with explicit dimension
CREATE (:Image {
  embedding: vector_f32(512)  -- 512-dimensional vector
});

-- Distance queries (with HNSW index)
MATCH (d:Document)
WHERE vector_distance_l2(d.embedding, '[0.15, 0.25, 0.35, 0.45]'::vector_f32) < 0.5
RETURN d.id, vector_distance_l2(d.embedding, '[0.15, 0.25, 0.35, 0.45]'::vector_f32) AS distance
ORDER BY distance
LIMIT 10;
```

**Distance metrics**:
- `vector_distance_l2()` - Euclidean (L2) distance
- `vector_distance_cosine()` - Cosine distance
- `vector_distance_dot()` - Dot product (inner product)

**Optimization**: SIMD-accelerated distance calculations

**See also**: [Vector Similarity Search](/docs/analytics/graph-algorithms#embeddings)

#### Geographic Types

**Types**: `LatLon`, `GeoPoint` (from `TYPES_AND_FUNCTIONS.md`)

```gql
-- LatLon (latitude, longitude)
CREATE (:Location {
  name: "NYC",
  coords: latlon(40.7128, -74.0060)
});

-- GeoPoint (more general geographic point)
CREATE (:Place {
  name: "Statue of Liberty",
  location: geopoint(40.6892, -74.0445)
});

-- Distance queries
MATCH (l:Location)
WHERE geo_distance(l.coords, latlon(40.7580, -73.9855)) < 5000  -- 5km
RETURN l.name, geo_distance(l.coords, latlon(40.7580, -73.9855)) AS meters;
```

**Indexing**: R-tree spatial indexing for efficient geographic queries

#### Network Types

**Types**: `IpAddr`, `Subnet`, `MacAddr` (from `TYPES_AND_FUNCTIONS.md`)

```gql
-- IP address
CREATE (:Server {
  hostname: "web01",
  ip: '192.168.1.100'::ipaddr
});

-- Subnet (CIDR)
CREATE (:Network {
  name: "LAN",
  subnet: '192.168.1.0/24'::subnet
});

-- MAC address
CREATE (:Device {
  name: "laptop",
  mac: '00:1A:2B:3C:4D:5E'::macaddr
});

-- IP containment queries
MATCH (s:Server), (n:Network)
WHERE subnet_contains(n.subnet, s.ip)
RETURN s.hostname, n.name;
```

**Indexing**: Patricia trie indexing for efficient IP prefix queries

#### Cryptographic Types

**Types**: `UUID`, `Hash` (from `TYPES_AND_FUNCTIONS.md`)

```gql
-- UUID (version 4)
CREATE (:User {
  id: gen_random_uuid(),
  name: "Alice"
});

-- UUID from string
CREATE (:Session {
  id: '550e8400-e29b-41d4-a716-446655440000'::uuid
});

-- Hash (for checksums, fingerprints)
CREATE (:File {
  name: "document.pdf",
  sha256: '\\xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'::hash
});
```

## Type Constructors

**Quick reference** (from `TYPE_QUICK_REFERENCE.md`):

```gql
-- Numeric
int8(127), int16(32000), int32(2000000), int64(9000000000)
float32(3.14), float64(3.14159265359)
decimal('123.456789')

-- Temporal
date('2024-01-15')
time('14:30:00')
timestamp('2024-01-15T14:30:00Z')
interval('P7D')

-- JSON
'{"key": "value"}'::json
'{"key": "value"}'::jsonb

-- Binary
'\\x48656c6c6f'::bytea

-- Vector
'[0.1, 0.2, 0.3]'::vector_f32
'[1, 2, 3]'::vector_i32

-- Geographic
latlon(40.7128, -74.0060)
geopoint(40.6892, -74.0445)

-- Network
'192.168.1.100'::ipaddr
'192.168.1.0/24'::subnet
'00:1A:2B:3C:4D:5E'::macaddr

-- Cryptographic
gen_random_uuid()
'550e8400-e29b-41d4-a716-446655440000'::uuid
```

## Type Conversion

### Safe Conversions

**From `TYPE_CONVERSION_FUNCTIONS.md`**:

```gql
-- To integer
toInteger("42") → 42
toInteger(3.14) → 3 (truncates)
toInteger(true) → 1

-- To float
toFloat("3.14") → 3.14
toFloat(42) → 42.0

-- To string
toString(42) → "42"
toString(3.14) → "3.14"
toString(true) → "true"
toString(date('2024-01-15')) → "2024-01-15"

-- To boolean
toBoolean("true") → true
toBoolean(1) → true
toBoolean(0) → false
```

### Lossy Conversions

**Warning**: Precision or data loss can occur

```gql
-- Float to integer (truncates)
toInteger(3.99) → 3

-- Large integer to float (precision loss)
toFloat(9007199254740993) → may lose precision

-- String to number (fails on invalid input)
toInteger("abc") → error
```

**Error handling**: Invalid conversions return null or error depending on strictness settings.

## Type System and Indexing

Different types benefit from different index families:

| Type Family | Recommended Index | Use Case |
|-------------|-------------------|----------|
| Integer, String | B-tree or Hash | Equality, range queries |
| Text (large) | Full-text | Search ranking with BM25 |
| JSON/JSONB | JSONB inverted index | Path queries |
| Vector | HNSW | Similarity search (ANN) |
| Geographic | R-tree (spatial) | Distance queries |
| Network (IP) | Patricia trie | Prefix queries |
| Interval | Interval tree | Overlap queries |

**Example**:

```gql
-- B-tree for range queries on integers
CREATE INDEX person_age_idx ON Person(age) USING btree;

-- Full-text for text search
CREATE INDEX doc_content_idx ON Document(content) USING fulltext;

-- HNSW for vector similarity
CREATE INDEX doc_embedding_idx ON Document(embedding) USING vector;

-- Spatial for geographic queries
CREATE INDEX location_coords_idx ON Location(coords) USING spatial;
```

**See**: [Indexing and Optimization](/docs/query/indexing-and-optimization) for index creation and tuning.

## Practical Schema Design

### Example: E-Commerce Graph

```gql
CREATE GRAPH ECommerce;
USE ECommerce;

-- Users with various types
CREATE (:User {
  id: gen_random_uuid(),
  email: "[email protected]",
  created_at: timestamp(),
  verified: true,
  metadata: '{"preferences": {"newsletter": true}}'::jsonb
});

-- Products with rich types
CREATE (:Product {
  id: 42,
  name: "Laptop",
  price: decimal('999.99'),
  stock: 50,
  specs: '{"cpu": "i7", "ram": 16, "storage": 512}'::jsonb,
  embedding: '[0.1, 0.2, ..., 0.512]'::vector_f32  -- for recommendations
});

-- Orders with temporal data
CREATE (:Order {
  id: gen_random_uuid(),
  order_date: timestamp(),
  ship_by: date('2024-01-20'),
  total: decimal('1499.98')
});

-- Locations with geographic data
CREATE (:Warehouse {
  name: "DC-East",
  location: latlon(40.7128, -74.0060),
  capacity: 100000
});

-- Relationships
MATCH (u:User {email: "[email protected]"}), (o:Order)
WHERE o.id = '...'
CREATE (u)-[:PLACED {placed_at: timestamp()}]->(o);

MATCH (o:Order), (p:Product {id: 42})
CREATE (o)-[:CONTAINS {quantity: 2, unit_price: decimal('999.99')}]->(p);
```

### Indexing Strategy

```gql
-- Primary lookups
CREATE INDEX user_email_idx ON User(email) USING hash;
CREATE INDEX product_id_idx ON Product(id) USING hash;

-- Range queries
CREATE INDEX order_date_idx ON Order(order_date) USING btree;

-- Full-text search
CREATE INDEX product_name_idx ON Product(name) USING fulltext;

-- Vector similarity (recommendations)
CREATE INDEX product_embedding_idx ON Product(embedding) USING vector;

-- Geographic queries (nearest warehouse)
CREATE INDEX warehouse_location_idx ON Warehouse(location) USING spatial;
```

## Next Steps

- **[Indexing and Optimization](/docs/query/indexing-and-optimization)** - Create indexes and tune queries
- **[Type Conversion Functions](/docs/reference/type-conversion)** - Detailed conversion rules
- **[API Reference](/docs/reference/cli-and-api)** - Complete type and function reference
- **[GQL Guide](/docs/gql/guide)** - Query patterns and examples
