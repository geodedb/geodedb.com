---
title: "Data Types Reference"
description: "Complete reference for Geode's 50+ specialized data types including vectors, geographic, network, and cryptographic types"
weight: 40

keywords:
  - Geode data types
  - GQL types
  - graph database types
  - property types
  - vector types
---

<!-- CANARY: REQ=REQ-TYPES-001; FEATURE="Types"; ASPECT=TypeCoercion; STATUS=TESTED; OWNER=engine; UPDATED=2026-01-15 -->

# Data Types Reference

Geode provides a comprehensive type system with over 50 specialized data types designed for modern applications, including advanced support for vectors, geographic data, network addresses, cryptographic types, and more.

## Type Categories

### Core Types

The foundational types that form the basis of the type system:

- **Null** - Absence of value with SQL semantics
- **Boolean** - True, false, or null
- **Integer** (i64) - Default integer type
- **String** - UTF-8 encoded text

### Numeric Types

Precision numeric types for different use cases:

- **SmallInt** (i16) - 16-bit signed integer
- **Int** (i32) - 32-bit signed integer
- **BigInt** (i64) - 64-bit signed integer
- **Real** (f32) - Single-precision floating point
- **Double** (f64) - Double-precision floating point
- **Decimal128** - 38-digit precision decimal with banker's rounding

```gql
RETURN SmallInt(42), Int(1000), BigInt(9999999),
       Real(3.14), Double(3.14159), Decimal(123.45, 2)
```

### String Types

Specialized string types with different constraints:

- **Char(n)** - Fixed-length character string
- **Varchar(n)** - Variable-length with maximum
- **Text** - Unlimited length UTF-8 text

```gql
RETURN Char('Hello', 10), Varchar('World', 50), Text('Long text...')
```

### Temporal Types

Date and time types with timezone support:

- **Date** - Calendar date (YYYY-MM-DD)
- **Time** - Time of day with microsecond precision
- **TimeTZ** - Time with timezone offset
- **Timestamp** - Date and time
- **TimestampTZ** - Timestamp with timezone (stored as UTC)
- **Interval** - Duration (ISO-8601 format)

```gql
RETURN Date('2024-12-25'),
       Time('14:30:00.123456'),
       TimeTZ('14:30:00', -28800),
       Timestamp('2024-12-25 14:30:00'),
       TimestampTZ('2024-12-25 14:30:00 -08:00'),
       Interval('P1Y2M3DT4H5M6S')
```

### Network Types

First-class support for network addresses:

- **IpAddr** - IPv4 or IPv6 address with RFC 5952 canonicalization
- **Subnet** (CIDR) - Network prefix with host bits zeroed
- **Mac** (EUI-48) - MAC address in uppercase colon notation

```gql
-- Network operations
RETURN IpAddr('192.168.1.1'),
       Subnet('192.168.0.0/24'),
       Mac('00:11:22:33:44:55')

-- Network functions
MATCH (device {ip: IpAddr('10.0.1.5')})
WHERE ip_contains(Subnet('10.0.0.0/16'), device.ip)
RETURN device
```

### Geographic Types

Spatial data types with R-tree indexing:

- **LatLon** - Geographic coordinate (WGS84)
- **LatLonAlt** - Coordinate with altitude
- **GeoPoint** - Enhanced geographic point with metadata
- **Geometry** - WKB format with GeoJSON output

```gql
-- Geographic queries
CREATE (loc:Location {
  coords: LatLon('40.7128,-74.0060'),
  name: 'New York City'
})

-- Distance calculation
MATCH (a:Location), (b:Location)
RETURN a.name, b.name, st_distance(a.coords, b.coords) AS distance_km
ORDER BY distance_km
```

### Vector Types

High-dimensional vector support for machine learning:

- **VectorF32** - Single-precision float vectors (up to 65,535 dimensions)
- **VectorI32** - Integer vectors for discrete features

```gql
-- Vector similarity search
MATCH (doc:Document)
WHERE similarity(doc.embedding, VectorF32('[0.1, 0.2, 0.3]')) > 0.8
RETURN doc.title, doc.content
ORDER BY similarity(doc.embedding, VectorF32('[0.1, 0.2, 0.3]')) DESC
LIMIT 10
```

**HNSW Index Support**: Automatic approximate nearest neighbor search with 6 distance metrics (L2, cosine, dot product, Manhattan, Hamming, Jaccard).

### Cryptographic Types

Security-focused types:

- **Hash** - SHA3-256, SHA3-512, BLAKE3 with constant-time comparison
- **Currency** (ISO-4217) - Three-letter currency code with decimal validation
- **UUID** - Version 4 and 7 UUIDs

```gql
RETURN Hash('SHA3-256', 'deadbeef..'),
       Currency('USD'),
       uuid_v4() AS random_id,
       uuid_v7() AS time_ordered_id
```

### Advanced Types

Specialized types for complex use cases:

- **Bytea** - Binary data (hex format: `\xDEADBEEF`)
- **Json** - JSON text with validation
- **Jsonb** - Binary JSON with canonical form and sorted keys
- **XML** - Well-formed XML (no DTD)
- **URL/URI** - WHATWG URL standard with IDNA support
- **Domain/FQDN** - Domain name with punycode for IDN
- **Enum** - Schema-backed enumeration types
- **Array** - Homogeneous element arrays
- **BitString** - Bit and VarBit types
- **Range** - Range types with bounds (`[)`, `[]`, `()`, `(]`)

### Physical Quantities

Types with unit conversion:

- **Temperature** - K, C, F (stored as Kelvin)
- **Pressure** - Pa, kPa, bar, atm (stored as Pascals)

```gql
RETURN Temperature(100, 'C'),  -- Stored as 373.15 K
       Pressure(1, 'atm')      -- Stored as 101,325 Pa
```

### Locale Types

Internationalization support:

- **LanguageTag** (BCP-47) - Canonicalized language tags with alias resolution

```gql
RETURN LanguageTag('en-US'),
       lang_canonicalize('iw-IL')  -- Returns 'he-IL'
```

## Type Constructors

Each type has a constructor function for explicit type creation:

```gql
-- Numeric constructors
SmallInt(42)
Int(1000)
BigInt(9999999)
Real(3.14)
Double(3.14159)
Decimal(123.45, 2)

-- String constructors
Char('Hello', 10)
Varchar('World', 50)
Text('Long text')

-- Temporal constructors
Date('2024-12-25')
Time('14:30:00')
Timestamp('2024-12-25 14:30:00')

-- Network constructors
IpAddr('192.168.1.1')
Subnet('10.0.0.0/8')
Mac('00:11:22:33:44:55')

-- Geographic constructors
LatLon('40.7128,-74.0060')
LatLonAlt('40.7128,-74.0060,100.0')

-- Vector constructors
VectorF32('[1.0, 2.0, 3.0]')
VectorI32('[1, 2, 3]')
```

## Type Conversions

### Implicit Conversions

Automatic conversions follow standard promotion rules:

- SmallInt → Int → BigInt
- Real → Double
- Int → Decimal (scale 0)
- Char → Varchar → Text

### NULL Propagation

Operations with NULL input return NULL, except:

- `IS NULL` and `IS NOT NULL`
- `COALESCE()`

## Indexes by Type

Different index types optimize different data types:

| Index Type | Supported Types | Use Case |
|------------|----------------|----------|
| **B-tree** | Numeric, String, Temporal | Range queries, sorting |
| **Hash** | Any equality-comparable | Exact match lookups |
| **R-tree** | LatLon, LatLonAlt, GeoPoint | Spatial queries |
| **HNSW** | VectorF32, VectorI32 | K-nearest neighbor search |
| **Full-text** | Text, Varchar | Text search with ranking |
| **Patricia Trie** | IpAddr, Subnet | IP prefix matching |

## Performance Characteristics

### Storage Efficiency

- Compact binary encodings minimize storage overhead
- Canonical forms reduce duplication
- Compression-friendly layouts

### Query Complexity

- **SIMD acceleration**: Vectorized operations for supported types
- **Patricia trie**: O(32) for IPv4, O(128) for IPv6 lookups
- **HNSW**: O(log N) approximate K-NN search
- **R-tree**: Sub-linear spatial queries

## Error Handling

Type-specific errors provide clear diagnostics:

- `ERR_FLOAT_NAN` - NaN or Inf not allowed
- `ERR_CHAR_LEN` - Character limit exceeded
- `ERR_IP_PARSE` - Invalid IP address
- `ERR_JSON_INVALID` - Malformed JSON
- `ERR_RANGE_BOUNDS` - Invalid range bounds

## Examples

### Vector Similarity Search

```gql
-- Create HNSW index for fast similarity search
CREATE INDEX embedding_idx ON Document(embedding) USING vector;

-- Find similar documents
MATCH (doc:Document)
WHERE distance(doc.embedding, VectorF32('[0.1, 0.2, 0.3]'), 'l2') < 0.5
RETURN doc.title, doc.content
ORDER BY distance(doc.embedding, VectorF32('[0.1, 0.2, 0.3]'), 'l2')
LIMIT 10
```

### Geographic Radius Search

```gql
-- Create spatial index
CREATE INDEX location_coords_idx ON Location(coordinates) USING spatial;

-- Find locations within 10km
MATCH (loc:Location)
WHERE st_distance(loc.coordinates, LatLon('40.7128,-74.0060')) < 10
RETURN loc.name, st_distance(loc.coordinates, LatLon('40.7128,-74.0060')) AS distance
ORDER BY distance
```

### Network Subnet Queries

```gql
-- Create CIDR index
CREATE INDEX device_network_idx ON Device(ip) USING patricia_trie;

-- Find all devices in subnet
MATCH (device:Device)
WHERE ip_contains(Subnet('10.0.0.0/16'), device.ip)
RETURN device.name, device.ip
```

## Next Steps

- [GQL Reference](../gql-reference/) - Query language syntax
- [Functions Reference](../api-reference/) - Type manipulation functions
- [Index Types](/docs/reference/indexes/) - Index configuration guide
