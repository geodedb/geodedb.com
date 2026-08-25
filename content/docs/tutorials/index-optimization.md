---
title: "Index Optimization Tutorial"
description: "Practical guide to index optimization in Geode including EXPLAIN analysis, B-tree, HNSW, and full-text indexes with performance tuning strategies"
keywords: ["index optimization", "performance tuning", "B-tree", "HNSW", "full-text search", "EXPLAIN", "query optimization"]
weight: 40
slug: "index-optimization"
url: "/docs/tutorials/index-optimization/"
canonical: "https://geodedb.com/docs/tutorials/index-optimization"
---

<!-- CANARY: REQ=REQ-GQL-016; FEATURE="MultiIndexOptimizer"; ASPECT=IndexTypeSelection; STATUS=TESTED; OWNER=engine; UPDATED=2025-10-03 -->

# Index Optimization Tutorial

Learn how to optimize query performance in Geode through strategic index design, EXPLAIN analysis, and performance tuning. This tutorial covers B-tree, HNSW vector, spatial, and full-text indexes with practical examples.

## Prerequisites

- Geode server running (port 3141)
- Basic GQL knowledge
- Sample dataset loaded (we'll create one)
- Understanding of query patterns

## Learning Objectives

By completing this tutorial, you will:

1. Understand different index types and their use cases
2. Use EXPLAIN to analyze query execution plans
3. Create and optimize B-tree indexes
4. Implement HNSW vector indexes for similarity search
5. Configure full-text search with BM25 ranking
6. Monitor index performance and effectiveness

## Tutorial Dataset

Let's create a realistic e-commerce dataset:

\`\`\`gql
-- Create customers
CREATE (c1:Customer {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    location: point({latitude: 37.7749, longitude: -122.4194}),
    joined: datetime('2023-01-15T10:30:00')
})

CREATE (c2:Customer {
    id: 2,
    name: 'Bob Smith',
    email: 'bob@example.com',
    location: point({latitude: 40.7128, longitude: -74.0060}),
    joined: datetime('2023-02-20T14:15:00')
})

CREATE (c3:Customer {
    id: 3,
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    location: point({latitude: 34.0522, longitude: -118.2437}),
    joined: datetime('2023-03-10T09:45:00')
})

-- Create products
CREATE (p1:Product {
    id: 101,
    name: 'Wireless Headphones',
    description: 'Premium wireless headphones with noise cancellation and 30-hour battery life',
    price: 199.99,
    category: 'Electronics',
    stock: 150,
    embedding: [0.1, 0.3, 0.5, 0.2, 0.8, 0.4, 0.6, 0.7]
})

CREATE (p2:Product {
    id: 102,
    name: 'Smartphone Case',
    description: 'Durable protective case for smartphones with shock absorption',
    price: 29.99,
    category: 'Accessories',
    stock: 500,
    embedding: [0.2, 0.4, 0.1, 0.9, 0.3, 0.5, 0.2, 0.6]
})

CREATE (p3:Product {
    id: 103,
    name: 'USB-C Cable',
    description: 'Fast charging USB-C cable with data transfer support',
    price: 15.99,
    category: 'Accessories',
    stock: 1000,
    embedding: [0.3, 0.2, 0.7, 0.1, 0.4, 0.8, 0.3, 0.5]
})

-- Create orders and relationships
MATCH (c:Customer {id: 1}), (p:Product {id: 101})
CREATE (c)-[:PURCHASED {date: datetime('2023-04-01T10:00:00'), quantity: 1}]->(p)

MATCH (c:Customer {id: 1}), (p:Product {id: 102})
CREATE (c)-[:PURCHASED {date: datetime('2023-04-01T10:05:00'), quantity: 2}]->(p)

MATCH (c:Customer {id: 2}), (p:Product {id: 103})
CREATE (c)-[:PURCHASED {date: datetime('2023-04-05T15:30:00'), quantity: 5}]->(p)

-- Create product views
MATCH (c:Customer {id: 3}), (p:Product {id: 101})
CREATE (c)-[:VIEWED {timestamp: datetime('2023-04-10T08:20:00')}]->(p)
\`\`\`

## Part 1: Understanding Query Plans with EXPLAIN

### Step 1: Baseline Query Analysis

Let's analyze a simple query without indexes:

\`\`\`gql
EXPLAIN MATCH (c:Customer {email: 'alice@example.com'}) RETURN c
\`\`\`

**Expected Output**:
\`\`\`

| plan              |
|-------------------|
| EXPLAIN           |
| MATCH             |
|   NodeScan        |
|   Filter          |
| RETURN            |
|   Project         |
\`\`\`

**Analysis**:

- **NodeScan**: Scans all Customer nodes (O(n) complexity)
- **Filter**: Applies email predicate after scan
- **Problem**: Inefficient for large datasets

### Step 2: Create B-tree Index

Create an index on the email field:

\`\`\`gql
CREATE INDEX ON :Customer(email)
\`\`\`

Now re-run the EXPLAIN:

\`\`\`gql
EXPLAIN MATCH (c:Customer {email: 'alice@example.com'}) RETURN c
\`\`\`

**Improved Output**:
\`\`\`

| plan              |
|-------------------|
| EXPLAIN           |
| MATCH             |
|   IndexSeek       |
| RETURN            |
|   Project         |
\`\`\`

**Analysis**:

- **IndexSeek**: Uses B-tree index for O(log n) lookup
- **No Filter**: Predicate handled by index
- **Benefit**: Significantly faster for large datasets

### Step 3: Profile Query Performance

Use PROFILE to measure actual execution:

\`\`\`gql
PROFILE MATCH (c:Customer {email: 'alice@example.com'}) RETURN c
\`\`\`

**Output**:
\`\`\`

| metric              | value |
|---------------------|-------|
| rows_returned       | 1     |
| columns             | 1     |
| execution_time_ms   | 1     |
\`\`\`

**Interpretation**:

- Query completes in ~1ms with index
- Without index: ~50-100ms for 100k customers

## Part 2: B-tree Index Optimization

### Composite Indexes

Create a composite index for complex queries:

\`\`\`gql
-- Create composite index
CREATE INDEX ON :Product(category, price)

-- Query using composite index
EXPLAIN MATCH (p:Product)
WHERE p.category = 'Electronics' AND p.price < 300
RETURN p.name, p.price
ORDER BY p.price
\`\`\`

**Plan Analysis**:
\`\`\`

| plan              |
|-------------------|
| EXPLAIN           |
| MATCH             |
|   IndexSeek       |  <-- Uses composite index
| RETURN            |
|   Project         |
|   Sort            |  <-- Sort optimized by index ordering
\`\`\`

**Benefits**:

- Index handles both WHERE predicates
- ORDER BY can use index ordering
- No separate sort operation needed

### Index Selection Guidelines

**When to Use B-tree Indexes**:

1. **Equality Lookups**:
\`\`\`gql
-- Excellent for B-tree
MATCH (c:Customer {email: $email}) RETURN c
MATCH (p:Product {id: $id}) RETURN p
\`\`\`

2. **Range Queries**:
\`\`\`gql
-- Excellent for B-tree
MATCH (p:Product)
WHERE p.price >= 50 AND p.price <= 200
RETURN p
\`\`\`

3. **Prefix Matching**:
\`\`\`gql
-- Good for B-tree
MATCH (c:Customer)
WHERE c.name STARTS WITH 'Alice'
RETURN c
\`\`\`

4. **Sorting**:
\`\`\`gql
-- B-tree index provides sorted access
MATCH (p:Product)
WHERE p.category = 'Electronics'
RETURN p.name
ORDER BY p.price  -- Uses index ordering
\`\`\`

**When NOT to Use B-tree Indexes**:

1. **Low Cardinality Fields**:
\`\`\`gql
-- Don't index boolean or low-cardinality fields
CREATE INDEX ON :Product(in_stock)  -- Only true/false values
\`\`\`

2. **Frequently Updated Fields**:

- Index maintenance overhead on writes
- Consider read/write ratio

3. **Large Text Fields**:

- Use full-text indexes instead

## Part 3: HNSW Vector Index for Similarity Search

### Step 1: Create HNSW Index

Create a vector index for product embeddings:

\`\`\`gql
CREATE VECTOR INDEX product_embeddings
ON :Product(embedding)
WITH (metric = 'cosine')
\`\`\`

**Index Parameters**:

- **metric**: Distance metric the index is built for. One of `l2` (default),
  `euclidean`, `cosine`, `dot`, `dot_product`, `inner_product`.

`metric` is the only supported parameter. Vector dimensionality is inferred
from the indexed data, and the HNSW graph parameters (`m`, `ef_construction`,
`ef_search`) are not currently tunable — they use engine-managed defaults and
are reserved for a future release. Passing them returns an error.

### Step 2: Similarity Search Query

Find products similar to a query vector:

\`\`\`gql
MATCH (p:Product)
WHERE similarity(p.embedding, [0.15, 0.35, 0.45, 0.25, 0.75, 0.45, 0.55, 0.65], 'cosine') > 0.8
RETURN p.name, p.description
ORDER BY similarity(p.embedding, [0.15, 0.35, 0.45, 0.25, 0.75, 0.45, 0.55, 0.65], 'cosine') DESC
LIMIT 5
\`\`\`

### Step 3: Choose the Right Metric

**For Normalized Text/ML Embeddings (Recommendation Systems)**:
\`\`\`gql
CREATE VECTOR INDEX product_embeddings_cosine
ON :Product(embedding)
WITH (metric = 'cosine')
\`\`\`

**For Magnitude-Sensitive Embeddings (Image Features, Coordinates)**:
\`\`\`gql
CREATE VECTOR INDEX product_embeddings_l2
ON :Product(embedding)
WITH (metric = 'euclidean')
\`\`\`

**Performance Trade-offs**:

Because the HNSW graph parameters are engine-managed, tune the recall/latency
trade-off at query time instead:

| Lever | Higher Value | Lower Value |
|-------|--------------|-------------|
| Distance threshold | More candidates, better recall, slower | Fewer candidates, faster, lower recall |
| `LIMIT` | Better recall, slower | Faster, lower recall |
| Pre-filtering (label/property) | Faster by shrinking the candidate set | Larger scan, slower |

### Step 4: Distance Metric Selection

**Cosine Similarity** - Recommended for normalized embeddings:
\`\`\`gql
-- Good for text embeddings, ML features
distance: 'cosine'
\`\`\`

**Euclidean Distance** - For absolute magnitude:
\`\`\`gql
-- Good for spatial data, image features
distance: 'euclidean'
\`\`\`

**Dot Product** - For unnormalized vectors:
\`\`\`gql
-- Good for recommendation scores
distance: 'dot_product'
\`\`\`

**Manhattan Distance** - For sparse vectors:
\`\`\`gql
-- Good for high-dimensional sparse data
distance: 'manhattan'
\`\`\`

## Part 4: Full-Text Search with BM25

### Step 1: Create Full-Text Index

Create a full-text index on product descriptions:

\`\`\`gql
CREATE FULLTEXT INDEX product_search
ON :Product(name, description)
OPTIONS {
    analyzer: 'standard',
    k1: 1.2,
    b: 0.75
}
\`\`\`

**BM25 Parameters**:

- **k1**: Term frequency saturation (typical: 1.2-2.0)
- **b**: Length normalization (0.0 = no normalization, 1.0 = full normalization)
- **analyzer**: Text tokenization (standard, english, whitespace)

### Step 2: Full-Text Search Query

Search for products mentioning "wireless charging":

\`\`\`gql
MATCH (p:Product)
WHERE fulltext_search(p, 'wireless charging')
RETURN p.name, p.description, fulltext_score(p, 'wireless charging') AS score
ORDER BY score DESC
LIMIT 10
\`\`\`

### Step 3: Optimize BM25 Parameters

**For Short Documents** (product names):
\`\`\`gql
CREATE FULLTEXT INDEX product_names
ON :Product(name)
OPTIONS {
    k1: 2.0,    -- Higher for short documents
    b: 0.5      -- Less length normalization
}
\`\`\`

**For Long Documents** (descriptions, reviews):
\`\`\`gql
CREATE FULLTEXT INDEX product_descriptions
ON :Product(description)
OPTIONS {
    k1: 1.2,    -- Standard value
    b: 0.75     -- Standard length normalization
}
\`\`\`

**For Exact Phrase Matching**:
\`\`\`gql
MATCH (p:Product)
WHERE fulltext_search(p, '"noise cancellation"')  -- Exact phrase
RETURN p.name, p.description
\`\`\`

### Step 4: Multi-field Search

Search across multiple fields with weights:

\`\`\`gql
MATCH (p:Product)
WHERE fulltext_search(p.name, 'headphones', {boost: 2.0})
   OR fulltext_search(p.description, 'headphones', {boost: 1.0})
RETURN p.name,
       fulltext_score(p.name, 'headphones') * 2.0 +
       fulltext_score(p.description, 'headphones') AS total_score
ORDER BY total_score DESC
LIMIT 10
\`\`\`

## Part 5: Spatial Indexes for Geographic Queries

### Step 1: Create Spatial Index

Create an R-tree spatial index for customer locations:

\`\`\`gql
CREATE SPATIAL INDEX customer_locations
ON :Customer(location)
OPTIONS {
    dimensions: 2,
    min_entries: 4,
    max_entries: 16
}
\`\`\`

### Step 2: Geographic Range Query

Find customers within 50km of a point:

\`\`\`gql
MATCH (c:Customer)
WHERE distance(c.location, point({latitude: 37.7749, longitude: -122.4194})) < 50000  -- meters
RETURN c.name, c.location,
       distance(c.location, point({latitude: 37.7749, longitude: -122.4194})) / 1000 AS distance_km
ORDER BY distance_km
\`\`\`

### Step 3: Bounding Box Query

Find customers in a geographic bounding box:

\`\`\`gql
MATCH (c:Customer)
WHERE c.location.latitude >= 37.0 AND c.location.latitude <= 38.0
  AND c.location.longitude >= -123.0 AND c.location.longitude <= -121.0
RETURN c.name, c.location
\`\`\`

## Part 6: Index Maintenance and Monitoring

### Step 1: List All Indexes

\`\`\`gql
CALL db.indexes() YIELD name, type, properties, options
RETURN name, type, properties, options
\`\`\`

**Output**:
\`\`\`

| name                  | type      | properties        | options              |
|-----------------------|-----------|-------------------|----------------------|
| customer_email        | btree     | ["email"]         | {}                   |
| product_category_price| btree     | ["category","price"]| {}                 |
| product_embeddings    | hnsw      | ["embedding"]     | {metric:'cosine'}    |
| product_search        | fulltext  | ["name","description"]| {k1:1.2,b:0.75} |
| customer_locations    | spatial   | ["location"]      | {dimensions:2}       |
\`\`\`

### Step 2: Analyze Index Usage

Check which indexes are being used:

\`\`\`gql
CALL db.index.stats() YIELD name, hits, misses, hit_rate
WHERE hit_rate < 0.5  -- Find underutilized indexes
RETURN name, hits, misses, hit_rate
ORDER BY hit_rate
\`\`\`

### Step 3: Rebuild Index

Rebuild an index to improve performance:

\`\`\`gql
-- Drop and recreate index
DROP INDEX customer_email

CREATE INDEX ON :Customer(email)
\`\`\`

### Step 4: Monitor Index Size

Check index storage size:

\`\`\`gql
CALL db.index.size() YIELD name, size_bytes, entry_count
RETURN name, size_bytes / (1024 * 1024) AS size_mb, entry_count
ORDER BY size_mb DESC
\`\`\`

## Part 7: Advanced Optimization Techniques

### Covering Indexes

Create indexes that include all queried fields:

\`\`\`gql
-- Create covering index
CREATE INDEX ON :Product(category, name, price)

-- Query covered by index (no table lookup needed)
MATCH (p:Product)
WHERE p.category = 'Electronics'
RETURN p.name, p.price  -- All fields in index
\`\`\`

### Index Hints

Force query planner to use specific index:

\`\`\`gql
-- Use index hint
MATCH (p:Product)
USING INDEX product_category_price
WHERE p.category = 'Electronics' AND p.price < 300
RETURN p
\`\`\`

### Partial Indexes

Create indexes with filter conditions (if supported):

\`\`\`gql
-- Index only active products
CREATE INDEX ON :Product(name)
WHERE in_stock = true
\`\`\`

### Index-Only Scans

Optimize queries to use index-only scans:

\`\`\`gql
-- Before: Requires table access
MATCH (p:Product)
WHERE p.category = 'Electronics'
RETURN p  -- Returns all properties

-- After: Index-only scan
MATCH (p:Product)
WHERE p.category = 'Electronics'
RETURN p.name, p.category  -- Only indexed properties
\`\`\`

## Part 8: Performance Testing

### Step 1: Benchmark Query Performance

Create a benchmark dataset:

\`\`\`bash

# Generate 100k customers

for i in {1..100000}; do
  echo "CREATE (:Customer {
    id: $i,
    email: 'user${i}@example.com',
    name: 'User $i'
  })"
done | geode query
\`\`\`

### Step 2: Measure Query Performance

**Without Index**:
\`\`\`gql
-- Measure time
PROFILE MATCH (c:Customer {email: 'user50000@example.com'}) RETURN c
-- execution_time_ms: ~150ms (full scan)
\`\`\`

**With Index**:
\`\`\`gql
CREATE INDEX ON :Customer(email)

PROFILE MATCH (c:Customer {email: 'user50000@example.com'}) RETURN c
-- execution_time_ms: ~2ms (index seek)
\`\`\`

**Performance Improvement**: 75x faster

### Step 3: Load Testing

Use a load testing tool to measure throughput:

\`\`\`python
import asyncio
from geode_client import open_database
import time

async def benchmark_queries(db, num_queries=1000):
    start = time.time()
    tasks = []

    async with db.connection() as conn:
        for i in range(num_queries):
            task = conn.query(
                "MATCH (c:Customer {email: $email}) RETURN c",
                {"email": f"user{i}@example.com"}
            )
            tasks.append(task)

        await asyncio.gather(*tasks)

    elapsed = time.time() - start
    qps = num_queries / elapsed
    print(f"Queries: {num_queries}, Time: {elapsed:.2f}s, QPS: {qps:.0f}")

# Run benchmark

db = open_database("quic://localhost:3141", pool_size=50)
asyncio.run(benchmark_queries(db, 1000))

# Output: Queries: 1000, Time: 2.15s, QPS: 465

\`\`\`

## Part 9: Common Pitfalls and Solutions

### Pitfall 1: Too Many Indexes

**Problem**: Every index adds write overhead

**Solution**: Only create indexes for frequent queries
\`\`\`gql
-- Analyze query patterns first
CALL db.query.stats() YIELD query, execution_count
WHERE execution_count > 100
RETURN query, execution_count
ORDER BY execution_count DESC
LIMIT 10

-- Create indexes for top queries only
\`\`\`

### Pitfall 2: Wrong Index Type

**Problem**: B-tree index for vector similarity

**Solution**: Use appropriate index type
\`\`\`gql
-- Wrong: B-tree for embeddings
CREATE INDEX ON :Product(embedding)

-- Correct: HNSW for embeddings
CREATE VECTOR INDEX ON :Product(embedding)
WITH (metric = 'cosine')
\`\`\`

### Pitfall 3: Unselective Indexes

**Problem**: Index on low-cardinality field

**Solution**: Check index selectivity
\`\`\`gql
-- Check cardinality
MATCH (p:Product)
RETURN p.category, count(*) AS count
ORDER BY count DESC

-- If most values have high count, index is not useful
\`\`\`

### Pitfall 4: Stale Statistics

**Problem**: Query planner uses outdated statistics

**Solution**: Update statistics regularly
\`\`\`gql
CALL db.stats.update()
\`\`\`

## Practice Exercises

### Exercise 1: E-commerce Search Optimization

**Task**: Optimize this query:
\`\`\`gql
MATCH (p:Product)
WHERE p.category = 'Electronics'
  AND p.price >= 100 AND p.price <= 500
  AND fulltext_search(p.description, 'wireless bluetooth')
RETURN p.name, p.price, fulltext_score(p.description, 'wireless bluetooth') AS score
ORDER BY score DESC, p.price
LIMIT 20
\`\`\`

**Steps**:

1. Create composite B-tree index: category + price
2. Create full-text index on description
3. Verify with EXPLAIN
4. Measure with PROFILE

**Solution**:
\`\`\`gql
CREATE INDEX ON :Product(category, price)
CREATE FULLTEXT INDEX ON :Product(description)

EXPLAIN MATCH (p:Product)
WHERE p.category = 'Electronics'
  AND p.price >= 100 AND p.price <= 500
  AND fulltext_search(p.description, 'wireless bluetooth')
RETURN p.name, p.price, fulltext_score(p.description, 'wireless bluetooth') AS score
ORDER BY score DESC, p.price
LIMIT 20
\`\`\`

### Exercise 2: Geospatial Query Optimization

**Task**: Find customers within 10km of stores

\`\`\`gql
MATCH (c:Customer), (s:Store)
WHERE distance(c.location, s.location) < 10000
RETURN c.name, s.name, distance(c.location, s.location) AS distance_m
ORDER BY distance_m
\`\`\`

**Steps**:

1. Create spatial indexes on both Customer and Store locations
2. Use EXPLAIN to verify R-tree usage
3. Compare performance with/without indexes

**Solution**:
\`\`\`gql
CREATE SPATIAL INDEX ON :Customer(location)
CREATE SPATIAL INDEX ON :Store(location)

PROFILE MATCH (c:Customer), (s:Store)
WHERE distance(c.location, s.location) < 10000
RETURN c.name, s.name, distance(c.location, s.location) AS distance_m
ORDER BY distance_m
\`\`\`

### Exercise 3: Vector Similarity Optimization

**Task**: Implement product recommendation based on embedding similarity

\`\`\`gql
-- Given a product, find similar products
MATCH (p:Product {id: 101})
MATCH (similar:Product)
WHERE similar.id <> p.id
  AND similarity(p.embedding, similar.embedding, 'cosine') > 0.7
RETURN similar.name, similarity(p.embedding, similar.embedding, 'cosine') AS similarity
ORDER BY similarity DESC
LIMIT 10
\`\`\`

**Steps**:

1. Create the HNSW index with the metric your queries use
2. Test different distance metrics
3. Tune the threshold and `LIMIT` for the recall/latency trade-off

**Solution**:
\`\`\`gql
CREATE VECTOR INDEX product_recommendations
ON :Product(embedding)
WITH (metric = 'cosine')

-- Query uses index automatically
MATCH (p:Product {id: 101})
MATCH (similar:Product)
WHERE similar.id <> p.id
  AND similarity(p.embedding, similar.embedding, 'cosine') > 0.7
RETURN similar.name, similarity(p.embedding, similar.embedding, 'cosine') AS similarity
ORDER BY similarity DESC
LIMIT 10
\`\`\`

## Quick Reference Card

### Index Type Selection

| Query Pattern | Index Type | Example |
|---------------|------------|---------|
| Equality lookup | B-tree | \`email = 'alice@example.com'\` |
| Range query | B-tree | \`price BETWEEN 100 AND 200\` |
| Text search | Full-text | \`fulltext_search(description, 'wireless')\` |
| Vector similarity | HNSW | \`similarity(embedding, query_vector)\` |
| Geographic range | Spatial | \`distance(location, point) < 10000\` |
| Prefix matching | B-tree | \`name STARTS WITH 'Alice'\` |

### EXPLAIN Plan Operators

| Operator | Meaning | Performance |
|----------|---------|-------------|
| IndexSeek | Index lookup | O(log n) - Excellent |
| NodeScan | Full table scan | O(n) - Poor |
| Filter | Post-scan filtering | O(n) - Poor if large result set |
| VectorIndexScan | HNSW search | O(log n) avg - Good |
| SpatialIndexScan | R-tree search | O(log n) - Good |

### Optimization Checklist

- [ ] Analyze query patterns with db.query.stats()
- [ ] Create indexes for frequent queries
- [ ] Use EXPLAIN to verify index usage
- [ ] Use PROFILE to measure performance
- [ ] Monitor index hit rates
- [ ] Update statistics regularly
- [ ] Remove unused indexes
- [ ] Consider covering indexes for common queries
- [ ] Tune HNSW parameters for vector indexes
- [ ] Benchmark before and after index creation

## Next Steps

1. **Production Deployment** - Apply index strategies to your application
2. **Monitoring** - Set up index usage monitoring
3. **Query Optimization** - Review slow queries and add indexes
4. **Advanced Topics** - Explore query hints and optimizer settings
5. **Performance Testing** - Benchmark with realistic workloads

**Related Documentation**:

- [Query Performance Tuning](/docs/query/performance-tuning)
- [EXPLAIN/PROFILE Commands](/docs/query/explain-profile)
- [Full-Text Search](/docs/query/full-text-search)
- [Indexing Reference](/docs/query/indexing-and-optimization/)

---

*Last Updated: January 2026*
*Difficulty: Intermediate*
*Estimated Time: 90 minutes*
