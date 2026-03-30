---
title: "Index Types Reference"
description: "Complete reference for all index types in Geode including B-tree, Hash, Full-text, Spatial, Vector (HNSW), and specialized indexes with configuration options and performance characteristics"
summary: "Comprehensive index reference covering all six index families in Geode with syntax, configuration options, performance characteristics, and best practices for enterprise graph workloads."
slug: "indexes"
url: "/docs/reference/indexes/"
date: 2026-01-28
lastmod: 2026-01-28
draft: false
weight: 25
keywords: ["index types", "B-tree index", "Hash index", "HNSW", "full-text index", "spatial index", "vector index", "index configuration", "index performance"]
tags: ["reference", "indexes", "performance", "optimization"]
categories: ["Reference"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/reference/indexes/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Index Types Reference

Geode provides six specialized index families optimized for different access patterns. This reference documents all index types, their configuration options, and performance characteristics.

## Index Overview

| Index Type | Best For | Complexity | Storage Overhead |
|------------|----------|------------|------------------|
| **B-tree** | Range queries, sorting | O(log N) | Low-Medium |
| **Hash** | Exact equality | O(1) | Low |
| **Full-text** | Text search with ranking | O(log N) | Medium-High |
| **Spatial** | Geographic queries | O(log N) | Medium |
| **Vector (HNSW)** | Similarity search | O(log N) | High |
| **Composite** | Multi-property queries | O(log N) | Medium |

---

## B-tree Index

B-tree indexes are the default index type, providing balanced performance for range queries and equality lookups.

### Syntax

```gql
CREATE INDEX [index_name] ON :Label(property) USING BTREE;
CREATE INDEX [index_name] ON :Label(property);  -- BTREE is default
```

### Configuration Options

```gql
CREATE INDEX person_age_idx ON :Person(age) USING BTREE
  OPTIONS {
    fill_factor: 0.9,        -- Page fill factor (default: 0.9)
    unique: false,           -- Enforce uniqueness
    nulls_distinct: true     -- Treat NULLs as distinct values
  };
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fill_factor` | Float | 0.9 | Page fill percentage (0.5-1.0) |
| `unique` | Boolean | false | Enforce unique constraint |
| `nulls_distinct` | Boolean | true | Whether NULL values are distinct |

### Supported Operations

| Operation | Supported | Example |
|-----------|-----------|---------|
| Equality (`=`) | Yes | `WHERE p.age = 30` |
| Range (`<`, `>`, `<=`, `>=`) | Yes | `WHERE p.age > 25` |
| BETWEEN | Yes | `WHERE p.age BETWEEN 20 AND 40` |
| IS NULL | Yes | `WHERE p.age IS NULL` |
| STARTS WITH | Yes | `WHERE p.name STARTS WITH 'Al'` |
| ORDER BY | Yes | `ORDER BY p.age` |
| IN list | Yes | `WHERE p.age IN [25, 30, 35]` |

### Performance Characteristics

```
Operation          | Time Complexity | Notes
-------------------|-----------------|----------------------------------
Point lookup       | O(log N)        | Tree traversal
Range scan         | O(log N + K)    | K = result count
Insert             | O(log N)        | May trigger page split
Delete             | O(log N)        | May trigger page merge
Bulk load          | O(N log N)      | Sequential insert optimization
```

### Examples

```gql
-- Range query with ordering
CREATE INDEX person_age_idx ON :Person(age) USING BTREE;

MATCH (p:Person)
WHERE p.age >= 25 AND p.age <= 65
RETURN p.name, p.age
ORDER BY p.age DESC;

-- Prefix search
CREATE INDEX person_name_idx ON :Person(name) USING BTREE;

MATCH (p:Person)
WHERE p.name STARTS WITH 'Alex'
RETURN p.name;

-- Unique constraint
CREATE INDEX person_email_unique ON :Person(email) USING BTREE
  OPTIONS { unique: true };
```

---

## Hash Index

Hash indexes provide O(1) lookup performance for exact equality queries.

### Syntax

```gql
CREATE INDEX [index_name] ON :Label(property) USING HASH;
```

### Configuration Options

```gql
CREATE INDEX user_id_idx ON :User(id) USING HASH
  OPTIONS {
    bucket_count: 1024,      -- Initial hash buckets
    load_factor: 0.75        -- Resize threshold
  };
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `bucket_count` | Integer | 1024 | Initial number of hash buckets |
| `load_factor` | Float | 0.75 | Resize when load exceeds this |

### Supported Operations

| Operation | Supported | Example |
|-----------|-----------|---------|
| Equality (`=`) | Yes | `WHERE u.email = 'alice@example.com'` |
| IN list | Yes | `WHERE u.id IN [1, 2, 3]` |
| IS NULL | Yes | `WHERE u.phone IS NULL` |
| Range (`<`, `>`) | **No** | Use B-tree instead |
| ORDER BY | **No** | Use B-tree instead |

### Performance Characteristics

```
Operation          | Time Complexity | Notes
-------------------|-----------------|----------------------------------
Point lookup       | O(1) average    | O(N) worst case with collisions
Insert             | O(1) average    | May trigger rehash
Delete             | O(1) average    | Tombstone-based
Bulk load          | O(N)            | Linear time
```

### Examples

```gql
-- High-cardinality equality lookup
CREATE INDEX user_email_idx ON :User(email) USING HASH;

MATCH (u:User)
WHERE u.email = 'alice@example.com'
RETURN u;

-- UUID lookups
CREATE INDEX session_id_idx ON :Session(id) USING HASH;

MATCH (s:Session)
WHERE s.id = '550e8400-e29b-41d4-a716-446655440000'
RETURN s;
```

### When to Use Hash vs B-tree

| Scenario | Recommendation |
|----------|----------------|
| Only equality queries | Hash (faster) |
| Need range queries | B-tree |
| Need sorting | B-tree |
| High-cardinality unique values | Hash |
| Low-cardinality (few distinct values) | B-tree |

---

## Full-text Index

Full-text indexes enable text search with BM25 relevance ranking.

### Syntax

```gql
CREATE INDEX [index_name] ON :Label(property) USING FULLTEXT;
```

### Configuration Options

```gql
CREATE INDEX article_content_idx ON :Article(content) USING FULLTEXT
  OPTIONS {
    language: 'english',     -- Stemming language
    min_word_length: 3,      -- Minimum word length
    stop_words: 'default',   -- Stop word list
    k1: 1.2,                 -- BM25 term frequency saturation
    b: 0.75                  -- BM25 length normalization
  };
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `language` | String | 'english' | Stemming/stopwords language |
| `min_word_length` | Integer | 2 | Minimum indexed word length |
| `stop_words` | String | 'default' | Stop word list ('default', 'none', or custom) |
| `k1` | Float | 1.2 | BM25 term frequency saturation |
| `b` | Float | 0.75 | BM25 length normalization (0-1) |

### Supported Operations

| Operation | Supported | Example |
|-----------|-----------|---------|
| `fulltext_match()` | Yes | `WHERE fulltext_match(a.content, 'graph database')` |
| `bm25_score()` | Yes | `RETURN bm25_score(a.content, 'query') AS score` |
| Boolean operators | Yes | `'graph AND database'`, `'graph OR network'` |
| Phrase search | Yes | `'"graph database"'` |
| Wildcard | Yes | `'graph*'` |
| Fuzzy search | Yes | `'grph~'` (edit distance 1) |

### BM25 Scoring

The BM25 algorithm provides relevance ranking:

```
BM25(d, q) = SUM_i [ IDF(qi) * f(qi,d) * (k1+1) / (f(qi,d) + k1*(1-b+b*|d|/avgdl)) ]

Where:
- f(qi,d) = frequency of term qi in document d
- |d| = document length (word count)
- avgdl = average document length
- k1 = term frequency saturation (higher = more weight to frequency)
- b = length normalization (higher = penalize long documents more)
```

### Examples

```gql
-- Basic full-text search
CREATE INDEX doc_content_idx ON :Document(content) USING FULLTEXT;

MATCH (d:Document)
WHERE fulltext_match(d.content, 'graph database performance')
RETURN d.title, bm25_score(d.content, 'graph database performance') AS relevance
ORDER BY relevance DESC
LIMIT 10;

-- Boolean operators
MATCH (d:Document)
WHERE fulltext_match(d.content, 'graph AND (database OR storage) NOT sql')
RETURN d.title;

-- Phrase search
MATCH (d:Document)
WHERE fulltext_match(d.content, '"property graph"')
RETURN d.title;

-- Fuzzy search (typo-tolerant)
MATCH (d:Document)
WHERE fulltext_match(d.content, 'databse~')  -- Matches "database"
RETURN d.title;
```

---

## Spatial Index

Spatial indexes (R-tree) enable efficient geographic queries.

### Syntax

```gql
CREATE INDEX [index_name] ON :Label(property) USING SPATIAL;
```

### Configuration Options

```gql
CREATE INDEX location_idx ON :Store(location) USING SPATIAL
  OPTIONS {
    srid: 4326,              -- Spatial Reference ID (WGS84)
    precision: 'high'        -- Index precision
  };
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `srid` | Integer | 4326 | Spatial Reference System ID |
| `precision` | String | 'high' | Index precision ('low', 'medium', 'high') |

### Supported Operations

| Operation | Supported | Example |
|-----------|-----------|---------|
| `geo_distance()` | Yes | `WHERE geo_distance(s.location, point) < 5000` |
| `geo_within_box()` | Yes | `WHERE geo_within_box(s.location, sw, ne)` |
| `geo_within_polygon()` | Yes | `WHERE geo_within_polygon(s.location, polygon)` |
| `geo_contains()` | Yes | `WHERE geo_contains(region, point)` |
| `geo_intersects()` | Yes | `WHERE geo_intersects(area1, area2)` |

### Performance Characteristics

```
Operation          | Time Complexity | Notes
-------------------|-----------------|----------------------------------
Point-in-region    | O(log N)        | R-tree traversal
k-nearest          | O(log N + K)    | Priority queue search
Range query        | O(log N + K)    | Bounding box filter
Insert             | O(log N)        | May trigger split
```

### Examples

```gql
-- Find stores within 5km
CREATE INDEX store_location_idx ON :Store(location) USING SPATIAL;

MATCH (s:Store)
WHERE geo_distance(s.location, latlon(40.7128, -74.0060)) < 5000
RETURN s.name, geo_distance(s.location, latlon(40.7128, -74.0060)) AS meters
ORDER BY meters
LIMIT 10;

-- Bounding box query
MATCH (s:Store)
WHERE geo_within_box(s.location,
                     latlon(40.70, -74.05),   -- Southwest corner
                     latlon(40.75, -73.95))   -- Northeast corner
RETURN s.name;

-- Polygon containment
WITH polygon([
  latlon(40.70, -74.05),
  latlon(40.70, -73.95),
  latlon(40.75, -73.95),
  latlon(40.75, -74.05)
]) AS nyc_area
MATCH (s:Store)
WHERE geo_within_polygon(s.location, nyc_area)
RETURN s.name;
```

---

## Vector Index (HNSW)

Vector indexes enable approximate nearest neighbor (ANN) search using HNSW (Hierarchical Navigable Small World) algorithm with SIMD acceleration.

### Syntax

```gql
CREATE INDEX [index_name] ON :Label(property) USING VECTOR;
```

### Configuration Options

```gql
CREATE INDEX embedding_idx ON :Document(embedding) USING VECTOR
  OPTIONS {
    dimensions: 512,         -- Vector dimensions (required if not inferred)
    metric: 'l2',            -- Distance metric
    m: 16,                   -- HNSW max connections per layer
    ef_construction: 200,    -- Build-time search width
    ef_search: 100           -- Query-time search width
  };
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dimensions` | Integer | (inferred) | Vector dimensions |
| `metric` | String | 'l2' | Distance metric: 'l2', 'cosine', 'dot' |
| `m` | Integer | 16 | Max connections per node per layer |
| `ef_construction` | Integer | 200 | Construction search width (accuracy vs speed) |
| `ef_search` | Integer | 100 | Query search width (accuracy vs speed) |

### Distance Metrics

| Metric | Function | Best For |
|--------|----------|----------|
| `l2` | `vector_distance_l2()` | Euclidean distance (general purpose) |
| `cosine` | `vector_distance_cosine()` | Normalized vectors (text embeddings) |
| `dot` | `vector_distance_dot()` | Inner product (maximum inner product search) |

### Performance Characteristics

```
Operation          | Time Complexity | Notes
-------------------|-----------------|----------------------------------
k-NN search        | O(log N)        | Approximate, SIMD-accelerated
Insert             | O(log N)        | Builds graph structure
Delete             | O(log N)        | Marks as deleted (lazy cleanup)
Build              | O(N log N)      | Initial index construction
```

### HNSW Tuning Guide

| Parameter | Low Value | High Value |
|-----------|-----------|------------|
| `m` | Faster build, less memory | Better recall, more memory |
| `ef_construction` | Faster build | Better index quality |
| `ef_search` | Faster queries | Better recall |

**Recommended settings by use case:**

| Use Case | m | ef_construction | ef_search |
|----------|---|-----------------|-----------|
| Low latency | 8 | 100 | 50 |
| Balanced | 16 | 200 | 100 |
| High recall | 32 | 400 | 200 |

### Examples

```gql
-- Create vector index
CREATE INDEX doc_embedding_idx ON :Document(embedding) USING VECTOR
  OPTIONS { metric: 'cosine', m: 16, ef_search: 100 };

-- k-NN similarity search
MATCH (d:Document)
WITH d, vector_distance_cosine(d.embedding, $query_vector) AS distance
WHERE distance < 0.5
RETURN d.title, distance
ORDER BY distance
LIMIT 10;

-- Find similar documents to a given document
MATCH (source:Document {id: 123})
MATCH (d:Document)
WHERE d.id <> source.id
WITH d, vector_distance_cosine(d.embedding, source.embedding) AS similarity
RETURN d.title, similarity
ORDER BY similarity
LIMIT 5;

-- Hybrid search: vector + filter
MATCH (d:Document)
WHERE d.category = 'technical'
WITH d, vector_distance_l2(d.embedding, $query_vector) AS distance
RETURN d.title, distance
ORDER BY distance
LIMIT 10;
```

---

## Composite Index

Composite indexes span multiple properties for complex query patterns.

### Syntax

```gql
CREATE INDEX [index_name] ON :Label(prop1, prop2, ...) USING BTREE;
```

### Configuration Options

Same as B-tree index.

### Column Ordering

**Important**: Column order affects which queries can use the index.

```gql
-- Index on (lastname, firstname)
CREATE INDEX person_name_idx ON :Person(lastname, firstname);

-- Can use index:
WHERE p.lastname = 'Smith'                           -- Leading column
WHERE p.lastname = 'Smith' AND p.firstname = 'John' -- Both columns

-- Cannot use index efficiently:
WHERE p.firstname = 'John'                           -- Non-leading column only
```

### Examples

```gql
-- Composite index for common query pattern
CREATE INDEX order_customer_date_idx ON :Order(customer_id, order_date);

-- Query using both columns (optimal)
MATCH (o:Order)
WHERE o.customer_id = 123 AND o.order_date >= date('2026-01-01')
RETURN o;

-- Query using leading column only (still uses index)
MATCH (o:Order)
WHERE o.customer_id = 123
RETURN o;
```

---

## Specialized Indexes

Geode implements additional specialized indexes automatically for certain data types.

### JSONB Inverted Index

Automatically created for JSONB properties to support path queries.

```gql
-- JSONB path queries use inverted index
MATCH (d:Document)
WHERE d.metadata->'author' = '"Alice"'
RETURN d;

MATCH (d:Document)
WHERE d.metadata->'tags'->0 = '"ml"'
RETURN d;
```

### Interval Tree Index

Automatically used for temporal overlap queries.

```gql
-- Interval overlap queries
MATCH (e:Event)
WHERE e.duration OVERLAPS interval('[2026-01-01, 2026-01-31]')
RETURN e;
```

### Patricia Trie Index

Automatically used for IP address prefix queries.

```gql
-- IP subnet containment
MATCH (s:Server)
WHERE subnet_contains('10.0.0.0/8'::subnet, s.ip)
RETURN s;
```

---

## Index Management

### Listing Indexes

```gql
-- Show all indexes
SHOW INDEXES;

-- Show indexes for a label
SHOW INDEXES ON :Person;

-- Show index details
SHOW INDEX person_email_idx;
```

### Dropping Indexes

```gql
-- Drop by name
DROP INDEX person_email_idx;

-- Drop with IF EXISTS
DROP INDEX IF EXISTS person_email_idx;
```

### Index Statistics

```gql
-- View index statistics
CALL db.index.stats('person_email_idx');

-- Update index statistics
CALL db.index.analyze('person_email_idx');

-- Rebuild index
CALL db.index.rebuild('person_email_idx');
```

---

## Best Practices

### 1. Index Selection Guidelines

| Query Pattern | Recommended Index |
|---------------|-------------------|
| Equality on unique values | Hash |
| Equality on non-unique values | B-tree or Hash |
| Range queries | B-tree |
| Text search | Full-text |
| Geographic queries | Spatial |
| Vector similarity | Vector (HNSW) |
| Multi-property queries | Composite B-tree |

### 2. Avoid Over-Indexing

- Each index adds write overhead (INSERT/UPDATE/DELETE)
- Each index consumes disk space
- Only index properties used in WHERE, ORDER BY, or JOIN conditions

### 3. Monitor Index Usage

```gql
-- Check if index is being used
EXPLAIN
MATCH (p:Person)
WHERE p.email = 'alice@example.com'
RETURN p;

-- Look for "uses index: <name>" in output
```

### 4. Consider Covering Indexes

Include all needed columns to avoid table lookups:

```gql
-- Composite index covers the query
CREATE INDEX person_name_email_idx ON :Person(name, email);

-- Query returns indexed columns only (no table lookup)
MATCH (p:Person)
WHERE p.name = 'Alice'
RETURN p.email;
```

---

## Performance Comparison

| Index Type | Read | Write | Memory | Best Use Case |
|------------|------|-------|--------|---------------|
| B-tree | Fast | Fast | Medium | General purpose |
| Hash | Fastest | Fast | Low | Unique lookups |
| Full-text | Fast | Slow | High | Text search |
| Spatial | Fast | Medium | Medium | Geographic |
| Vector | Fast | Slow | Very High | ML embeddings |

---

## Related Documentation

- [Indexing and Optimization](/docs/query/indexing-and-optimization/) - Query optimization guide
- [Data Types Reference](/docs/reference/types/) - Type-specific indexing
- [Storage Engine Architecture](/docs/architecture/storage-engine/) - Index storage internals
- [Performance Tuning](/docs/query/performance-tuning/) - Optimization strategies

---

**Last Updated:** January 28, 2026
**Geode Version:** **GEODE_TAG**+
**ISO GQL Conformance Profile:** ISO/IEC 39075:2024 compliance (see conformance profile)
