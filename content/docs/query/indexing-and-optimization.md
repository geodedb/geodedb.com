---
title: "Querying, Indexing, and Query Optimization"
description: "Create and choose indexes (btree/hash/fulltext/spatial/vector), use EXPLAIN and PROFILE, and understand Geode's cost-based optimizer and IndexOptimizer"
weight: 10
tags:
  - indexing
  - optimization
  - query-performance
  - explain
  - profile
  - hnsw
  - bm25
categories:
  - performance-and-scaling
  - gql
keywords:
  - CREATE INDEX
  - HNSW
  - BM25
  - EXPLAIN
  - PROFILE
  - query planner
---

<!-- CANARY: REQ=REQ-GQL-024; FEATURE="Conformance Flagger"; ASPECT=ImplDefinedCollationAndNullOrdering; STATUS=TESTED; OWNER=engine; UPDATED=2025-09-21 -->

# Querying, Indexing, and Query Optimization

Learn how Geode executes queries, how to create indexes for different access patterns, and how to use EXPLAIN/PROFILE to tune performance.

## Index Overview

Indexes accelerate queries by providing efficient data structures for specific access patterns.

**When to index**:
- Columns used in `WHERE` predicates
- Properties used in `ORDER BY` clauses
- Join/match columns for relationship traversal
- Full-text search on text fields
- Vector similarity search on embeddings
- Spatial queries on geographic data

**Cost**: Indexes consume disk space and slow down writes (insert/update/delete). Choose indexes based on your query patterns, not preemptively.

## Creating Indexes

### Syntax

From `API_REFERENCE.md`:

```gql
CREATE INDEX [index_name] ON label(property) USING index_type;
```

**Index types**:
- `btree` - B-tree (default)
- `hash` - Hash table
- `fulltext` - Full-text search with BM25
- `spatial` - R-tree for geographic data
- `vector` - HNSW for vector similarity (ANN)

### Examples

```gql
-- B-tree index (default, supports range queries)
CREATE INDEX person_age_idx ON Person(age) USING btree;

-- Hash index (fast equality lookups)
CREATE INDEX person_email_idx ON Person(email) USING hash;

-- Full-text index
CREATE INDEX document_content_idx ON Document(content) USING fulltext;

-- Spatial index (geographic queries)
CREATE INDEX location_coords_idx ON Location(coords) USING spatial;

-- Vector index (similarity search)
CREATE INDEX doc_embedding_idx ON Document(embedding) USING vector;
```

### Dropping Indexes

```gql
DROP INDEX person_age_idx;
```

## Index Types: When to Use

### B-tree Indexes

**Best for**:
- Range queries (`>`, `<`, `BETWEEN`)
- Sorting (`ORDER BY`)
- Prefix matching (`STARTS WITH`)

**Example**:

```gql
-- Create index
CREATE INDEX person_age_idx ON Person(age) USING btree;

-- Queries that benefit
MATCH (p:Person)
WHERE p.age > 25 AND p.age < 50
RETURN p.name
ORDER BY p.age;

MATCH (p:Person)
WHERE p.name STARTS WITH "Al"
RETURN p.name;
```

**Performance**: O(log N) lookups, efficient range scans

### Hash Indexes

**Best for**:
- Exact equality (`=`)
- High-cardinality columns (emails, UUIDs)

**Not suitable for**:
- Range queries
- Sorting
- Prefix matching

**Example**:

```gql
-- Create index
CREATE INDEX user_email_idx ON User(email) USING hash;

-- Query that benefits
MATCH (u:User)
WHERE u.email = "[email protected]"
RETURN u;
```

**Performance**: O(1) lookups for exact matches

### Full-text Indexes

**Best for**:
- Text search with ranking
- Natural language queries
- Document search

**Features** (from `BM25_INDEX_OPTIMIZER_INTEGRATION.md`):
- BM25 relevance scoring
- Tokenization and stemming
- Stop word filtering
- Optimizer integration for ranking queries

**Example**:

```gql
-- Create full-text index
CREATE INDEX article_content_idx ON Article(content) USING fulltext;

-- Full-text search with ranking
MATCH (a:Article)
WHERE fulltext_match(a.content, "graph database performance")
RETURN a.title, bm25_score(a.content, "graph database performance") AS score
ORDER BY score DESC
LIMIT 10;
```

**BM25 Scoring**: Balances term frequency (TF) and inverse document frequency (IDF) for relevance ranking.

**See also**: [BM25 Integration](/docs/query/full-text-search/) for tuning parameters (k1, b).

### Spatial Indexes

**Best for**:
- Geographic queries (distance, containment)
- Location-based search
- Geofencing

**Implementation**: R-tree spatial indexing

**Example**:

```gql
-- Create spatial index
CREATE INDEX store_location_idx ON Store(location) USING spatial;

-- Find stores within 5km
MATCH (s:Store)
WHERE geo_distance(s.location, latlon(40.7128, -74.0060)) < 5000
RETURN s.name, geo_distance(s.location, latlon(40.7128, -74.0060)) AS meters
ORDER BY meters
LIMIT 5;

-- Bounding box query
MATCH (s:Store)
WHERE geo_within_box(s.location, latlon(40.7, -74.1), latlon(40.8, -74.0))
RETURN s.name;
```

**Performance**: O(log N) for point queries, efficient range queries

### Vector Indexes (HNSW)

**Best for**:
- Vector similarity search
- Approximate Nearest Neighbor (ANN)
- Embedding-based search (ML models)

**Implementation**: HNSW (Hierarchical Navigable Small World) with SIMD acceleration

**Characteristics**:
- SIMD-optimized distance metrics
- Sub-linear search time O(log N)

**Example**:

```gql
-- Create vector index
CREATE INDEX doc_embedding_idx ON Document(embedding) USING vector;

-- Similarity search (k-NN)
MATCH (d:Document)
WHERE vector_distance_l2(d.embedding, '[0.1, 0.2, ..., 0.512]'::vector_f32) < 0.5
RETURN d.title, vector_distance_l2(d.embedding, '[0.1, 0.2, ..., 0.512]'::vector_f32) AS distance
ORDER BY distance
LIMIT 10;
```

**Distance metrics**:
- `vector_distance_l2()` - Euclidean distance
- `vector_distance_cosine()` - Cosine similarity
- `vector_distance_dot()` - Dot product

**See also**: [Graph Algorithms and Analytics](/docs/analytics/graph-algorithms) for embeddings

## Specialized Indexes

From `SERVER_FEATURES.md`, Geode implements additional specialized indexes:

| Index Type | Purpose | User-Facing |
|------------|---------|-------------|
| **JSONB inverted index** | Path queries in JSON | 🔧 Via `jsonb` type |
| **Interval tree** | Temporal overlap queries | 🔧 Via `interval` type |
| **Patricia trie** | IP prefix/subnet queries | 🔧 Via `ipaddr`/`subnet` types |
| **Domain trie** | Hierarchical domain queries | 📋 Planned |

**Example: JSONB path indexing**:

```gql
-- Implicit JSONB indexing
CREATE INDEX doc_metadata_idx ON Document(metadata) USING btree;

-- Path queries (automatically use index)
MATCH (d:Document)
WHERE d.metadata->'author' = '"Alice"'
RETURN d.title;

-- Array indexing
MATCH (d:Document)
WHERE d.metadata->'tags'->0 = '"ml"'
RETURN d.title;
```

## Cost-Based Optimizer (CBO)

Geode's **Cost-Based Optimizer** selects the best execution plan based on:

- **Statistics**: Row counts, cardinality estimates, value distributions
- **Index availability**: Which indexes exist and their selectivity
- **Predicate selectivity**: Estimated fraction of rows matching `WHERE` clause
- **Join cost**: Cost of expanding relationships

**How it works**:
1. Parse query into logical plan
2. Generate alternative physical plans (different index choices, join orders)
3. Estimate cost for each plan (I/O, CPU, memory)
4. Select plan with lowest estimated cost

**IndexOptimizer** (from `SERVER_FEATURES.md`):
- Specialized component for index selection
- Evaluates index applicability for each predicate
- Combines multiple indexes via bitmap operations
- Integrates with CBO for holistic plan selection

**User control**: Currently automatic. Future: query hints for manual override.

## EXPLAIN and PROFILE

### EXPLAIN: Query Plan

**Show query execution plan without running**:

```gql
EXPLAIN
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.age > 25
RETURN p.name, friend.name;
```

**Sample output**:

```
Project [p.name, friend.name]
  Expand [(p)-[:KNOWS]->(friend)]
    Filter [p.age > 25]
      Scan [Person] (uses index: person_age_idx)
```

**Plan operators**:
- `Scan` - Read nodes/relationships (with or without index)
- `Filter` - Apply predicates
- `Expand` - Traverse relationships
- `Project` - Select output columns
- `Sort` - Order results
- `Aggregate` - Group and aggregate

**Index usage**: Look for "uses index: <name>" to confirm index selection.

### PROFILE: Execution Metrics

**Run query and show actual performance metrics**:

```gql
PROFILE
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.age > 25
RETURN p.name, friend.name;
```

**Sample output**:

```
Project [p.name, friend.name]
  Rows: 150 | Time: 0.5ms
  Expand [(p)-[:KNOWS]->(friend)]
    Rows: 200 | Time: 1.2ms
    Filter [p.age > 25]
      Rows: 500 | Time: 0.8ms
      Scan [Person] (uses index: person_age_idx)
        Rows: 1000 | Time: 0.3ms | Index: person_age_idx
```

**Metrics**:
- **Rows**: Actual rows processed at each operator
- **Time**: Execution time per operator
- **Index**: Index used (if any)

**Performance analysis**:
- High row counts early → poor selectivity, consider better indexes
- High time in `Expand` → relationship fanout, consider materialized views
- No index usage → add index for `WHERE`/`ORDER BY` columns

**See also**: `EXPLAIN_PROFILE.md` for detailed usage patterns

## Full-text Search with BM25

From `BM25_INDEX_OPTIMIZER_INTEGRATION.md`:

**BM25 scoring** provides relevance ranking for full-text queries.

**Formula**:
```
BM25(d, q) = Σ IDF(qi) * (f(qi, d) * (k1 + 1)) / (f(qi, d) + k1 * (1 - b + b * |d| / avgdl))
```

Where:
- `f(qi, d)` = term frequency of query term qi in document d
- `|d|` = document length
- `avgdl` = average document length
- `k1` = term frequency saturation (default: 1.2)
- `b` = length normalization (default: 0.75)

**Example**:

```gql
-- Full-text search with BM25 ranking
CREATE INDEX article_content_idx ON Article(content) USING fulltext;

MATCH (a:Article)
WHERE fulltext_match(a.content, "graph database")
RETURN a.title, bm25_score(a.content, "graph database") AS score
ORDER BY score DESC
LIMIT 10;
```

**Optimizer integration**: When `ORDER BY bm25_score(...)` is present, the optimizer selects full-text index automatically.

## Performance Checklist

### 1. Index Key Predicates

**Before**:
```gql
-- Sequential scan of all Person nodes
MATCH (p:Person)
WHERE p.email = "[email protected]"
RETURN p;
```

**After**:
```gql
-- Create hash index
CREATE INDEX person_email_idx ON Person(email) USING hash;

-- Now uses index
MATCH (p:Person)
WHERE p.email = "[email protected]"
RETURN p;
```

### 2. Use Selective Predicates

**Selectivity** = fraction of rows matching predicate.

**Good** (high selectivity, few matches):
```gql
WHERE p.email = "[email protected]"  -- Selectivity ~0.0001%
```

**Bad** (low selectivity, many matches):
```gql
WHERE p.active = true  -- Selectivity ~90%
```

**Tip**: Filter on high-selectivity predicates first, then apply low-selectivity filters.

### 3. Order Deterministically

From `match_tutorial.md`: Geode enforces deterministic ordering for pagination.

**Explicit ordering** (recommended):
```gql
MATCH (p:Person)
RETURN p.name
ORDER BY p.created_at DESC, p.id ASC  -- Deterministic
LIMIT 10;
```

**Implicit ordering** (Geode applies stable order):
```gql
MATCH (p:Person)
RETURN p.name
LIMIT 10;  -- Geode ensures same 10 nodes each time
```

### 4. Use EXPLAIN Before PROFILE

**Workflow**:
1. Write query
2. Run `EXPLAIN` to check plan and index usage
3. Add/adjust indexes if needed
4. Run `PROFILE` to verify performance

**Example**:

```gql
-- Step 1: Check plan
EXPLAIN
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name
ORDER BY p.age;

-- Step 2: See "Scan [Person] (no index)" → add index
CREATE INDEX person_age_idx ON Person(age) USING btree;

-- Step 3: Re-check plan
EXPLAIN
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name
ORDER BY p.age;
-- Now shows "Scan [Person] (uses index: person_age_idx)"

-- Step 4: Profile actual performance
PROFILE
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name
ORDER BY p.age;
```

### 5. Optimize Relationship Traversal

**High fanout** (many relationships per node) can be expensive.

**Before**:
```gql
-- Expands all KNOWS relationships (potentially millions)
MATCH (p:Person {name: "Alice"})-[:KNOWS*]->(friend)
RETURN friend.name;
```

**After**:
```gql
-- Limit depth
MATCH (p:Person {name: "Alice"})-[:KNOWS*1..3]->(friend)
RETURN DISTINCT friend.name;

-- Or use specific path patterns
MATCH (p:Person {name: "Alice"})-[:KNOWS]->(f1)-[:KNOWS]->(f2)
WHERE NOT (p)-[:KNOWS]->(f2)  -- Friends of friends only
RETURN DISTINCT f2.name;
```

## Federation and Distributed Queries

From `DISTRIBUTED_QUERY_COORDINATION.md`:

**EXPLAIN FEDERATION**: Show distributed query plan

```gql
EXPLAIN FEDERATION
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.city = "NYC"
RETURN p.name, friend.name;
```

**Output**:
- Shows which shards/instances are queried
- Merge operator for combining results
- Network cost estimates

**Distributed optimization**:
- Push predicates to remote instances (reduce network transfer)
- Parallelize shard queries
- Merge results with deterministic ordering

**See also**: [Performance and Scalability](/docs/architecture/performance-and-scaling) for distributed patterns

## Next Steps

- **[EXPLAIN and PROFILE Reference](/docs/query/explain-profile/)** - Detailed operator reference
- **[Performance and Scalability](/docs/architecture/performance-and-scaling)** - Architecture and scaling patterns
- **[BM25 Integration](/docs/query/full-text-search/)** - Full-text search tuning
- **[Data Model and Types](/docs/model/data-model-and-types)** - Type-specific indexing guidance
- **[Tutorials](/docs/tutorials/overview)** - Performance tuning tutorial
