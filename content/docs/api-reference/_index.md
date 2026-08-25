---
title: "API Reference"
description: "Complete API reference for Geode functions, operators, and system procedures"
weight: 45

keywords:
  - Geode API reference
  - GQL API
  - protocol reference
  - CLI reference
  - developer docs
---

<!-- CANARY: REQ=REQ-API-DOCS-002; FEATURE="APIDocumentation"; ASPECT=BuildTarget; STATUS=EXEMPT; OWNER=tooling; UPDATED=2026-01-03 -->

# API Reference

Complete reference documentation for Geode's query language, functions, operators, and system procedures.

## Index Operations

### CREATE INDEX

Creates an index on node properties for improved query performance.

**Syntax**:

```gql
CREATE [UNIQUE] INDEX [IF NOT EXISTS] index_name
ON label(property[, ...])
[USING {btree | hash | fulltext | spatial | vector}]
```

**Index Types**:

- **btree** (Default) - B-tree index for range queries and sorted access
- **hash** - Hash index for exact match lookups
- **fulltext** - Full-text search with tokenization and ranking
- **spatial** - R-tree index for geographic and spatial data
- **vector** - HNSW index for vector similarity search
- **patricia_trie** - IP prefix matching and CIDR queries

**Examples**:

```gql
-- B-tree index for range queries
CREATE INDEX person_age_idx ON Person(age) USING btree;

-- Hash index for exact matches
CREATE INDEX person_email_idx ON Person(email) USING hash;

-- Full-text search index
CREATE INDEX article_content_idx ON Article(content) USING fulltext;

-- Spatial index for geographic queries
CREATE INDEX location_coords_idx ON Location(coordinates) USING spatial;

-- Vector index for similarity search
CREATE INDEX embedding_idx ON Document(embedding) USING vector;

-- Unique constraint
CREATE UNIQUE INDEX person_email_unique ON Person(email);
```

### DROP INDEX

Removes an existing index.

**Syntax**:

```gql
DROP INDEX [IF EXISTS] index_name
```

**Example**:

```gql
DROP INDEX IF EXISTS person_age_idx;
```

### SHOW INDEXES

Lists all indexes in the database.

**Syntax**:

```gql
SHOW INDEXES;
```

**Returns**:

- Index name
- Label
- Properties
- Type (btree, hash, fulltext, spatial, vector)
- Unique constraint
- Statistics (entries, size, last updated)

## Variable-Length Path Patterns

### Path Pattern Syntax

```gql
(start)-[relationship*min..max]->(end)
```

### Patterns

**Any Length** (`*`):

```gql
MATCH (a:Person)-[*]->(b:Company) RETURN b;
```

**Exact Length** (`*n`):

```gql
MATCH (a:Person)-[*2]->(b:Person) RETURN b;
```

**Range** (`*min..max`):

```gql
MATCH (a:Person)-[*1..3]->(b:Person) RETURN b;
```

**Up To** (`*..max`):

```gql
MATCH (a:Person)-[*..5]->(b:Person) RETURN b;
```

**At Least** (`*min..`):

```gql
MATCH (a:Person)-[*2..]->(b:Person) RETURN b;
```

### Path Functions

**length(path)** - Returns path length:

```gql
MATCH path = (a)-[*]->(b) RETURN length(path);
```

**nodes(path)** - Returns all nodes in path:

```gql
MATCH path = (a)-[*]->(b) RETURN nodes(path);
```

**relationships(path)** - Returns all relationships in path:

```gql
MATCH path = (a)-[*]->(b) RETURN relationships(path);
```

**shortestPath()** - Finds shortest path:

```gql
MATCH path = shortestPath((a:Person)-[*]->(b:Company))
RETURN path;
```

**allShortestPaths()** - Finds all shortest paths:

```gql
MATCH path = allShortestPaths((a:Person)-[*]->(b:Company))
RETURN path;
```

## Vector Operations

### Vector Search Functions

**similarity(vector1, vector2)** - Cosine similarity in [-1, 1] (higher is more similar):

```gql
MATCH (d:Document)
WHERE similarity(d.embedding, VectorF32('[0.1, 0.2, 0.3]')) > 0.8
RETURN d;
```

**distance(vector1, vector2, metric)** - Calculates distance using specified metric:

```gql
MATCH (d:Document)
WHERE distance(d.embedding, VectorF32('[0.1, 0.2, 0.3]'), 'l2') < 0.5
RETURN d;
```

**Supported Metrics** (for `distance()`; `similarity()` accepts `'cosine'` and
`'dot'` only):

- `'l2'` / `'euclidean'` - Euclidean distance (default for `distance()`)
- `'cosine'` - Cosine distance (1 - cosine similarity)
- `'dot'` / `'dot_product'` - Negative dot product

For L1 distance use `manhattan(v1, v2)`. There are no Hamming or Jaccard vector
metrics.

**vector_knn(property, query_vector, k, metric)** - Returns the ids of the `k`
nearest nodes or edges by vector property (`knn()` is an alias). The first
argument is the **property name as a string**, and the result is a list of ids:

```gql
WITH vector_knn('embedding', VectorF32('[0.1, 0.2, 0.3]'), 10, 'cosine') AS ids
MATCH (d:Document)
WHERE id(d) IN ids
RETURN d.title;
```

**similarity(v1, v2 [, metric])** - Cosine similarity [-1, 1] by default:

```gql
MATCH (d:Document)
RETURN d.title, similarity(d.embedding, VectorF32('[0.1, 0.2, 0.3]')) AS similarity
ORDER BY similarity DESC;
```

**vector_dot(v1, v2)** - Dot product:

```gql
RETURN vector_dot(VectorF32('[1, 2, 3]'), VectorF32('[4, 5, 6]')) AS dot;
```

**vector_cosine(v1, v2)** - Cosine **similarity** (despite the name, it does not
return a distance):

```gql
RETURN vector_cosine(VectorF32('[1, 2, 3]'), VectorF32('[4, 5, 6]')) AS cos_sim;
```

There are no `norm()` / `normalize()` functions: compute the L2 norm as the
distance to a zero vector (`vector_l2(v, vectorf32([0.0, 0.0]))`) and normalize
vectors in the client before storing them.

## Spatial Operations

### Spatial Functions

**LatLon(string)** - Creates geographic coordinate:

```gql
CREATE (l:Location {coords: LatLon('40.7128,-74.0060'), name: 'NYC'});
```

**distanceKm(point1, point2)** - Haversine distance in kilometers:

```gql
MATCH (l:Location)
WHERE st_distance(l.coords, LatLon('40.0,-74.0')) < 100
RETURN l;
```

**bearingTo(point1, point2)** - Initial bearing in degrees [0, 360):

```gql
MATCH (a:Location), (b:Location)
RETURN bearingTo(a.coords, b.coords) AS bearing;
```

**within(geometry, boundary)** - Tests if geometry is within boundary:

```gql
MATCH (l:Location)
WHERE within(l.coords, geometryfromtext(...))
RETURN l;
```

**bbox(min_x, min_y, max_x, max_y)** - Creates bounding box:

```gql
MATCH (l:Location)
WHERE intersects(l.area, bbox(40.0, -75.0, 41.0, -73.0))
RETURN l;
```

## Full-Text Search

### Text Search Functions

**CONTAINS** - Searches for text within property:

```gql
MATCH (a:Article)
WHERE a.content CONTAINS 'graph database'
RETURN a;
```

**STARTS WITH** - Matches text at beginning:

```gql
MATCH (p:Person)
WHERE p.name STARTS WITH 'John'
RETURN p;
```

**ENDS WITH** - Matches text at end:

```gql
MATCH (e:Email)
WHERE e.address ENDS WITH '@example.com'
RETURN e;
```

**REGEX** - Matches using regular expressions:

```gql
MATCH (p:Product)
WHERE p.code =~ '^SKU-[0-9]{4}$'
RETURN p;
```

**score()** - Returns relevance score for full-text results:

```gql
MATCH (a:Article)
WHERE a.content CONTAINS 'machine learning'
RETURN a, score() AS relevance
ORDER BY relevance DESC;
```

## Aggregation Functions

### Basic Aggregations

**count()** - Count rows:

```gql
MATCH (n:Person) RETURN count(*) AS total;
MATCH (n:Person) RETURN count(n.email) AS with_email;
```

**sum()** - Sum values:

```gql
MATCH (o:Order) RETURN sum(o.total) AS revenue;
```

**avg()** - Average value:

```gql
MATCH (p:Person) RETURN avg(p.age) AS average_age;
```

**min()** - Minimum value:

```gql
MATCH (p:Product) RETURN min(p.price) AS cheapest;
```

**max()** - Maximum value:

```gql
MATCH (p:Product) RETURN max(p.price) AS most_expensive;
```

### Collection Functions

**collect()** - Collect values into array:

```gql
MATCH (p:Person)-[:KNOWS]->(f)
RETURN p.name, collect(f.name) AS friends;
```

**collect(DISTINCT)** - Collect unique values:

```gql
MATCH (p:Person)
RETURN p.city, collect(DISTINCT p.country) AS countries;
```

## Transaction Control

### BEGIN

Starts a new transaction:

```gql
BEGIN;
```

### COMMIT

Commits the current transaction:

```gql
COMMIT;
```

### ROLLBACK

Rolls back the current transaction:

```gql
ROLLBACK;
```

### SAVEPOINT

Creates a savepoint within a transaction:

```gql
SAVEPOINT my_savepoint;
```

### ROLLBACK TO

Rolls back to a specific savepoint:

```gql
ROLLBACK TO my_savepoint;
```

## System Functions

### Database Information

**db.info()** - Returns database information:

```gql
RETURN db.info();
```

**db.stats()** - Returns database statistics:

```gql
RETURN db.stats();
```

**db.indexes()** - Returns index information:

```gql
RETURN db.indexes();
```

**db.constraints()** - Returns constraint information:

```gql
RETURN db.constraints();
```

### Temporal Functions

**now()** - Current timestamp with microseconds:

```gql
RETURN datetime() AS current_time;
```

**current_date** - Today's date:

```gql
RETURN current_date AS today;
```

**current_time** - Current time:

```gql
RETURN current_time AS now;
```

**date_add(date, interval)** - Add interval to date:

```gql
RETURN (Date('2024-01-01') + duration('P1D')) /* no date_add(); add a duration */) AS next_month;
```

**date_sub(date, interval)** - Subtract interval:

```gql
RETURN date_sub(datetime(), Interval('P7D')) AS week_ago;
```

**date_part(part, datetime)** - Extract date/time part:

```gql
RETURN datetime(.year) AS current_year;
```

### Type Conversion Functions

**to_int(value)** - Convert to integer:

```gql
RETURN toInteger('42') AS num;
```

**to_float(value)** - Convert to float:

```gql
RETURN toFloat('3.14') AS pi;
```

**to_string(value)** - Convert to string:

```gql
RETURN toString(42) AS str;
```

**to_boolean(value)** - Convert to boolean:

```gql
RETURN toBoolean('true') AS bool;
```

## Type Constructors

### Numeric Types

```gql
SmallInt(42)           -- i16
Int(1000)              -- i32
BigInt(9999999)        -- i64
Real(3.14)             -- f32
Double(3.14159)        -- f64
Decimal(123.45, 2)     -- Decimal with scale
```

### String Types

```gql
Char('Hello', 10)      -- Fixed length
Varchar('World', 50)   -- Variable length
Text('Long text...')   -- Unlimited
```

### Temporal Types

```gql
Date('2024-12-25')
Time('14:30:00.123456')
TimeTZ('14:30:00', -28800)
Timestamp('2024-12-25 14:30:00')
TimestampTZ('2024-12-25 14:30:00 -08:00')
Interval('P1Y2M3DT4H5M6S')
```

### Network Types

```gql
IpAddr('192.168.1.1')
IpAddr('2001:db8::1')
Subnet('192.168.0.0/24')
Mac('00:11:22:33:44:55')
```

### Geographic Types

```gql
LatLon('40.7128,-74.0060')
LatLonAlt('40.7128,-74.0060,100.0')
GeoPoint('37.7749,-122.4194')
```

### Vector Types

```gql
VectorF32('[1.0, 2.0, 3.0]')
VectorI32('[1, 2, 3]')
```

### Advanced Types

```gql
UUID('550e8400-e29b-41d4-a716-446655440000')
Json('{"key": "value"}')
Jsonb('{"key": "value"}')
Xml('<root><child/></root>')
Bytea('\\xDEADBEEF')
URL('https://example.com')
```

## Error Codes

Geode follows ISO/IEC SQL error code standards:

| Code | Description |
|------|-------------|
| `00000` | Success |
| `0A000` | Feature not supported |
| `22000` | Data exception |
| `23000` | Integrity constraint violation |
| `42000` | Syntax error or access rule violation |
| `42P01` | Undefined table |
| `42P07` | Duplicate table/index |
| `53000` | Insufficient resources |
| `58000` | System error |
| `XX000` | Internal error |

## Performance Tips

### Index Usage

1. **Create indexes on frequently queried properties**
2. **Use unique indexes for high cardinality properties**
3. **Use hash indexes for exact match queries only**
4. **Use btree indexes for range queries and sorting**
5. **Use vector indexes for similarity search**
6. **Use spatial indexes for geographic queries**

### Query Optimization

1. **Use EXPLAIN to understand query plans**
2. **Limit result sets with LIMIT clause**
3. **Filter early with WHERE clauses**
4. **Use index hints when necessary**
5. **Avoid cartesian products without filters**
6. **Always use ORDER BY with LIMIT for deterministic results**

## Next Steps

- [GQL Reference](../gql-reference/) - Query language syntax
- [Data Types](../data-types/) - Complete type system reference
- [Performance Tuning](../performance/) - Optimize queries
