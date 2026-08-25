---
title: "Query Performance Tuning Guide"
description: "Complete guide to analyzing and optimizing Geode query performance using EXPLAIN, PROFILE, indexes, and the cost-based optimizer with BM25 integration."
summary: "Learn how to diagnose slow queries, understand execution plans, and apply optimization techniques for maximum performance in Geode."
slug: "performance-tuning"
url: "/docs/query/performance-tuning/"
aliases: []
date: "2026-01-23"
lastmod: "2026-01-23"
draft: false
weight: 20
keywords: ["query optimization", "EXPLAIN plan", "database performance tuning", "index selection", "query profiling", "BM25", "cost-based optimizer"]
tags: ["performance", "optimization", "tuning", "EXPLAIN", "PROFILE", "indexes"]
categories: ["Query Optimization", "Performance"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/query/performance-tuning/"
    noindex: false
---

<!-- CANARY: REQ=REQ-GQL-024; FEATURE="Conformance Flagger"; ASPECT=ImplDefinedCollationAndNullOrdering; STATUS=TESTED; OWNER=engine; UPDATED=2025-09-21 -->

## Overview

This guide teaches you how to analyze and optimize query performance in Geode using EXPLAIN, PROFILE, indexes, and the cost-based optimizer. You'll learn to diagnose slow queries, understand execution plans, and apply optimization strategies.

**Performance Tuning Process:**

1. **Measure** - Use PROFILE to identify slow queries
2. **Analyze** - Use EXPLAIN to understand execution plans
3. **Optimize** - Apply indexes, rewrite queries, tune configuration
4. **Verify** - Re-measure to confirm improvements

**Quick Links:**

- [Using EXPLAIN](#using-explain)
- [Using PROFILE](#using-profile)
- [Index Optimization](#index-optimization)
- [Query Rewriting Patterns](#query-rewriting-patterns)
- [Common Performance Issues](#common-performance-issues)

---

## Using EXPLAIN

**EXPLAIN** shows the query execution plan **without** running the query. Use it to understand how Geode will execute your query before committing resources.

### Basic EXPLAIN Syntax

```gql
EXPLAIN <statement>
```

### Understanding Execution Plans

EXPLAIN output shows **logical operators** Geode will use:

| Operator | Description | Performance Impact |
|----------|-------------|-------------------|
| `NodeScan` | Scans all nodes (or by label) | O(n) - can be slow for large graphs |
| `IndexSeek` | Uses index for direct lookup | O(log n) - fast |
| `IndexScan` | Scans index range | O(k log n) - moderate |
| `ExpandRelationships` | Traverses relationships | O(degree) per node |
| `Filter` | Applies WHERE predicates | O(n) on input rows |
| `Project` | Selects/transforms columns | O(n) - lightweight |
| `Sort` | Orders results (ORDER BY) | O(n log n) - expensive |
| `Limit` | Restricts output rows | O(1) - cheap |
| `Aggregate` | Groups and aggregates | O(n) - moderate |

### EXPLAIN Examples

**Example 1: Simple Node Scan**

```gql
EXPLAIN MATCH (p:Person) RETURN p.name;
```

**Output:**

```
| plan              |
|-------------------|
| EXPLAIN           |
| MATCH             |
|   NodeScan        |    ← Scans all Person nodes
| RETURN            |
|   Project         |    ← Selects name property
```

**Analysis**: Full node scan - acceptable for small graphs, slow for large.

---

**Example 2: Filtered Query**

```gql
EXPLAIN MATCH (p:Person) WHERE p.age > 25 RETURN p.name, p.age;
```

**Output:**

```
| plan              |
|-------------------|
| EXPLAIN           |
| MATCH             |
|   NodeScan        |    ← Scans all Person nodes
|   Filter          |    ← Filters age > 25
| RETURN            |
|   Project         |
```

**Analysis**: Scans all nodes, then filters. **Optimization needed** if large dataset.

---

**Example 3: Relationship Traversal**

```gql
EXPLAIN MATCH (p:Person)-[:WORKS_FOR]->(c:Company)
RETURN p.name, c.name;
```

**Output:**

```
| plan                    |
|-------------------------|
| EXPLAIN                 |
| MATCH                   |
|   NodeScan              |    ← Start with Person nodes
|   ExpandRelationships   |    ← Traverse WORKS_FOR edges
| RETURN                  |
|   Project               |
```

**Analysis**: Scans all Persons, expands relationships. Consider index on Company if filtering by company properties.

---

**Example 4: Complex Query with Aggregation**

```gql
EXPLAIN MATCH (p:Person)-[:WORKS_FOR]->(c:Company)
WHERE p.age > 25
RETURN c.name, count(p) AS employee_count
ORDER BY employee_count DESC
LIMIT 10;
```

**Output:**

```
| plan                    |
|-------------------------|
| EXPLAIN                 |
| MATCH                   |
|   NodeScan              |
|   ExpandRelationships   |
|   Filter                |
| RETURN                  |
|   Aggregate             |    ← Group by company, count employees
|   Sort                  |    ← Sort by count (expensive!)
|   Limit                 |
|   Project               |
```

**Analysis**: Full scan → filter → aggregate → **sort** (expensive). Optimize filter with index.

---

### Reading EXPLAIN Output

**🚩 Red Flags (Slow Patterns)**:

- `NodeScan` without subsequent `Filter` on large graphs
- `Sort` on large result sets
- Multiple `ExpandRelationships` without indexes
- `Aggregate` on unindexed properties

**✅ Good Patterns (Fast)**:

- `IndexSeek` for direct lookups
- `Filter` early in the plan (before expensive operations)
- `Limit` without `Sort` for large datasets
- Index-backed `Aggregate` operations

---

## Using PROFILE

**PROFILE** executes the query and returns **real execution metrics**. Use it to measure actual performance.

### Basic PROFILE Syntax

```gql
PROFILE <statement>
```

### PROFILE Metrics

| Metric | Description |
|--------|-------------|
| `rows_returned` | Number of rows returned |
| `columns` | Number of columns in result |
| `execution_time_ms` | Execution time in milliseconds |

### PROFILE Examples

**Example 1: Measure Simple Query**

```gql
PROFILE MATCH (p:Person) RETURN p.name;
```

**Output:**

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 42    |
| columns             | 1     |
| execution_time_ms   | 1     |
```

**Analysis**: Returned 42 rows in 1ms - acceptable.

---

**Example 2: Measure Query with Filter**

```gql
PROFILE MATCH (p:Person) WHERE p.age > 30 RETURN p.name, p.age;
```

**Output:**

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 15    |
| columns             | 2     |
| execution_time_ms   | 2     |
```

**Analysis**: 15 results in 2ms - good. If time is higher, add index on `age`.

---

**Example 3: Before/After Optimization**

**Before (no index):**

```gql
PROFILE MATCH (p:Person) WHERE p.email = '[email protected]' RETURN p;
```

**Output:**

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 1     |
| execution_time_ms   | 50    |    ← Slow: full scan
```

**Create Index:**

```gql
CREATE INDEX person_email ON Person(email);
```

**After (with index):**

```gql
PROFILE MATCH (p:Person) WHERE p.email = '[email protected]' RETURN p;
```

**Output:**

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 1     |
| execution_time_ms   | 2     |    ← Fast: index seek!
```

**Result**: Significant speedup with index.

---

### Performance Measurement Workflow

**Step 1: Establish Baseline**

```gql
PROFILE MATCH (p:Person)-[:KNOWS]->(friend:Person)
WHERE p.age > 30
RETURN p.name, count(friend) AS friend_count
ORDER BY friend_count DESC;
```

**Step 2: Analyze with EXPLAIN**

```gql
EXPLAIN MATCH (p:Person)-[:KNOWS]->(friend:Person)
WHERE p.age > 30
RETURN p.name, count(friend) AS friend_count
ORDER BY friend_count DESC;
```

**Step 3: Apply Optimization** (add index, rewrite query)

```gql
CREATE INDEX person_age ON Person(age);
```

**Step 4: Re-measure with PROFILE**

```gql
PROFILE MATCH (p:Person)-[:KNOWS]->(friend:Person)
WHERE p.age > 30
RETURN p.name, count(friend) AS friend_count
ORDER BY friend_count DESC;
```

**Step 5: Compare Results**

- Before: execution_time_ms = 150
- After: execution_time_ms = 20
- **Speedup: 7.5x** ✅

---

## Index Optimization

### Index Types in Geode

| Index Type | Use Case | Creation Syntax |
|------------|----------|-----------------|
| **B-tree** (default) | Exact matches, range queries, sorting | `CREATE INDEX name ON Label(property)` |
| **Hash** | Exact lookups only (faster than B-tree) | `CREATE INDEX name ON Label(property) USING hash` |
| **Fulltext** | Text search, CONTAINS queries | `CREATE FULLTEXT INDEX name ON Label(property)` |
| **Spatial** | Geographic queries (distance, bounding box) | `CREATE SPATIAL INDEX name ON Label(property)` |
| **Vector** | Similarity search (embeddings, recommendations) | `CREATE VECTOR INDEX name ON Label(property)` |

### Creating Indexes

**B-tree Index (Default)**

```gql
-- For exact matches and range queries
CREATE INDEX person_age ON Person(age);
CREATE INDEX product_price ON Product(price);

-- Use for queries like:
MATCH (p:Person) WHERE p.age > 30 RETURN p;
MATCH (prod:Product) WHERE prod.price < 100 RETURN prod;
```

**Hash Index**

```gql
-- For exact lookups only (faster than B-tree for equality)
CREATE INDEX person_email ON Person(email) USING hash;

-- Use for queries like:
MATCH (p:Person {email: '[email protected]'}) RETURN p;
MATCH (p:Person) WHERE p.email = '[email protected]' RETURN p;
```

**Fulltext Index (BM25-Optimized)**

```gql
-- For text search with relevance ranking
CREATE INDEX article_content ON Article(content) USING fulltext;
CREATE INDEX doc_abstract ON Document(abstract) USING fulltext;

-- Use for queries like:
MATCH (a:Article) WHERE a.content CONTAINS 'graph database' RETURN a;
MATCH (d:Document)
WHERE d.abstract CONTAINS 'machine learning'
RETURN d.title, score AS relevance
ORDER BY relevance DESC;
```

**Spatial Index**

```gql
-- For geographic queries
CREATE INDEX location_coords ON Location(coordinates) USING spatial;

-- Use for queries like:
MATCH (loc:Location)
WHERE distance(loc.coordinates, point(37.7749, -122.4194)) < 10000  -- 10km
RETURN loc.name, distance(loc.coordinates, point(37.7749, -122.4194)) AS dist
ORDER BY dist;
```

**Vector Index (HNSW)**

```gql
-- For similarity search (embeddings)
CREATE INDEX doc_embedding ON Document(embedding) USING vector;

-- Use for queries like:
MATCH (doc:Document)
WHERE vector_cosine(doc.embedding, $query_embedding) > 0.7
RETURN doc.title, vector_cosine(doc.embedding, $query_embedding) AS similarity
ORDER BY similarity DESC
LIMIT 10;
```

### When to Create Indexes

**✅ Create Indexes For:**

1. **Frequently filtered properties**

   ```gql
   -- Queries like WHERE p.status = 'active' are common
   CREATE INDEX user_status ON User(status);
   ```

2. **Properties used in ORDER BY**

   ```gql
   -- Queries like ORDER BY created_at DESC
   CREATE INDEX post_created ON Post(created_at);
   ```

3. **Properties in JOIN conditions**

   ```gql
   -- Foreign-key-like lookups
   CREATE INDEX order_customer_id ON Order(customer_id);
   ```

4. **Unique identifiers**

   ```gql
   -- Email, username, SKU, etc.
   CREATE INDEX user_email ON User(email) USING hash;
   CREATE INDEX product_sku ON Product(sku) USING hash;
   ```

**❌ Don't Create Indexes For:**

1. **Rarely queried properties** - Index overhead not worth it
2. **High-cardinality properties with rare lookups** - E.g., free-text descriptions
3. **Properties that change frequently** - Index maintenance overhead
4. **Small datasets** - Full scans are fast enough (<1000 nodes)

### Viewing Indexes

```gql
-- Show all indexes
SHOW INDEXES;

-- Output:
| index_name       | label   | property    | type      |
|------------------|---------|-------------|-----------|
| person_email     | Person  | email       | hash      |
| person_age       | Person  | age         | btree     |
| article_content  | Article | content     | fulltext  |
| doc_embedding    | Document| embedding   | vector    |
```

### Dropping Indexes

```gql
-- Drop unused or redundant indexes
DROP INDEX person_age;
DROP INDEX article_content;
```

---

## BM25 Full-Text Search Optimization

Geode's **cost-based optimizer** automatically uses **BM25 relevance ranking** for fulltext searches, providing enterprise-grade search quality.

### BM25 Scoring Formula

```
score(q,d) = Σ IDF(qi) × f(qi,d) × (k1 + 1) / (f(qi,d) + k1 × (1 - b + b × |d| / avgdl))
```

**Where:**

- `IDF(qi)` = Inverse document frequency (rare terms score higher)
- `f(qi,d)` = Term frequency in document
- `|d|` = Document length in words
- `avgdl` = Average document length in collection
- `k1 = 1.2` = Term frequency saturation parameter
- `b = 0.75` = Length normalization parameter

### BM25 Optimization Examples

**Example 1: Simple Text Search**

```gql
-- Create fulltext index
CREATE INDEX article_content ON Article(content) USING fulltext;

-- Query automatically uses BM25
MATCH (a:Article)
WHERE a.content CONTAINS 'machine learning algorithms'
RETURN a.title, a.author
ORDER BY a.relevance_score DESC;
```

**Optimizer Behavior:**

- **Base cost**: 25.0 (vs 20.0 for standard fulltext)
- **Query complexity**: 1.0 + (3 terms - 1) × 0.3 = 1.6x multiplier
- **Corpus scaling**: Logarithmic with document count
- **Result**: Relevance-ranked results, 40-60% better quality

---

**Example 2: Multi-Term Search with Ranking**

```gql
MATCH (doc:Document)
WHERE doc.abstract CONTAINS 'artificial intelligence'
  AND doc.keywords CONTAINS 'neural networks'
RETURN doc.title,
       score AS relevance
ORDER BY relevance DESC
LIMIT 10;
```

**Performance:**

- BM25 considers document length and term frequency
- Shorter documents with exact matches score higher
- Longer documents are penalized unless terms are frequent
- **Typical speedup over naive text search: 2-5x** with better results

---

**Example 3: Corpus-Aware Optimization**

```gql
-- Technical documentation (high vocabulary density, long docs)
MATCH (tech_doc:TechnicalDocument)
WHERE tech_doc.content CONTAINS 'distributed systems architecture'
RETURN tech_doc.title, tech_doc.complexity_score;

-- Optimizer adjusts:
-- - Vocabulary density > 100 → 1.2x cost multiplier
-- - Average document length > 1000 words → length normalization
-- - Result: Accurate cost estimation for complex corpus
```

```gql
-- Social media posts (low vocabulary, short docs)
MATCH (post:SocialPost)
WHERE post.text CONTAINS 'climate change'
RETURN post.text, post.engagement_score
ORDER BY post.timestamp DESC;

-- Optimizer adjusts:
-- - Vocabulary density < 20 → 0.9x cost multiplier (simpler)
-- - Average document length < 200 words → reduced length penalty
-- - Result: Faster execution for short-form content
```

### BM25 vs Standard Fulltext Comparison

| Metric | Standard Fulltext | BM25 Enhanced | Benefit |
|--------|------------------|---------------|---------|
| Base cost | 20.0 | 25.0 | 25% overhead for ranking |
| Query complexity | 20% per term | 30% per term | Better multi-term accuracy |
| Corpus scaling | Linear | Logarithmic | Better large-scale performance |
| Search quality | Term matching | Relevance ranking | **40-60% better results** |
| Cost accuracy | Heuristic | Statistics-based | **25-35% more accurate** |

---

## Query Rewriting Patterns

### Pattern 1: Push Filters Early

**❌ Bad (Filter Late)**:

```gql
MATCH (p:Person)-[:KNOWS]->(friend:Person)
WHERE p.age > 30 AND friend.age > 25
RETURN p.name, friend.name;
```

**✅ Good (Filter Early)**:

```gql
MATCH (p:Person {age: 30})  -- Filter immediately
MATCH (p)-[:KNOWS]->(friend:Person)
WHERE friend.age > 25       -- Filter on expansion
RETURN p.name, friend.name;
```

**Why**: Reduces nodes to expand from, fewer relationship traversals.

---

### Pattern 2: Avoid Cartesian Products

**❌ Bad (Cartesian Product)**:

```gql
MATCH (p:Person)
MATCH (c:Company)
WHERE p.company_id = c.id
RETURN p.name, c.name;
-- If 1000 people × 100 companies = 100,000 intermediate rows!
```

**✅ Good (Connected Pattern)**:

```gql
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN p.name, c.name;
-- Direct relationship traversal
```

**Why**: Explicit relationships prevent combinatorial explosion.

---

### Pattern 3: Use Limits Early

**❌ Bad (Limit After Sort)**:

```gql
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY p.age DESC;  -- Sorts ALL people
-- Then application takes only first 10
```

**✅ Good (Limit in Query)**:

```gql
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY p.age DESC
LIMIT 10;  -- Database returns only 10
```

**Why**: Database can use top-K optimization, avoid sorting/returning all rows.

---

### Pattern 4: Denormalize for Read Performance

**❌ Bad (Join on Every Query)**:

```gql
MATCH (order:Order)-[:CONTAINS]->(:LineItem)-[:OF_PRODUCT]->(product:Product)
WHERE order.id = 12345
RETURN sum(product.price) AS total;
-- Complex join every time
```

**✅ Good (Precompute Total)**:

```gql
-- Store total on Order when creating
MATCH (order:Order {id: 12345})
RETURN order.total;  -- Single property lookup

-- Update total when items change (trade write speed for read speed)
MATCH (order:Order {id: 12345})-[:CONTAINS]->(li:LineItem)
SET order.total = sum(li.subtotal);
```

**Why**: Read-heavy workloads benefit from denormalization.

---

### Pattern 5: Use OPTIONAL MATCH Sparingly

**❌ Bad (Multiple OPTIONAL)**:

```gql
MATCH (p:Person)
OPTIONAL MATCH (p)-[:WORKS_AT]->(c:Company)
OPTIONAL MATCH (p)-[:LIVES_IN]->(city:City)
OPTIONAL MATCH (p)-[:STUDIED_AT]->(school:School)
RETURN p, c, city, school;
-- Many optional branches slow execution
```

**✅ Good (Filter Required First)**:

```gql
-- If most people work somewhere, make it required
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
OPTIONAL MATCH (p)-[:LIVES_IN]->(city:City)
RETURN p, c, city;
```

**Why**: Required MATCH is faster than OPTIONAL.

---

## Common Performance Issues

### Issue 1: Full Node Scans

**Symptom**: Queries slow on large graphs, EXPLAIN shows `NodeScan`.

**Example**:

```gql
MATCH (p:Person) WHERE p.email = '[email protected]' RETURN p;
-- EXPLAIN shows: NodeScan → Filter
```

**Solution**: Create index on filtered property.

```gql
CREATE INDEX person_email ON Person(email);
-- Now EXPLAIN shows: IndexSeek
```

**Impact**: Significant improvement on large datasets.

---

### Issue 2: Expensive Sorts

**Symptom**: Queries with ORDER BY are slow, high memory usage.

**Example**:

```gql
MATCH (p:Person)
RETURN p.name, p.created_at
ORDER BY p.created_at DESC;
-- Sorts ALL people in memory
```

**Solution 1**: Create index on sort property.

```gql
CREATE INDEX person_created ON Person(created_at);
-- Index provides sorted iteration
```

**Solution 2**: Add LIMIT if you don't need all results.

```gql
MATCH (p:Person)
RETURN p.name, p.created_at
ORDER BY p.created_at DESC
LIMIT 100;  -- Only sort top 100
```

**Impact**: **5-50x speedup** depending on dataset size.

---

### Issue 3: Supernode Expansion

**Symptom**: Queries traversing high-degree nodes are slow.

**Example**:

```gql
-- "Popular" node with 1,000,000 followers
MATCH (celebrity:Person {name: "Celebrity"})-[:FOLLOWED_BY]->(follower:Person)
RETURN follower.name;
-- Expands 1M relationships!
```

**Solution 1**: Add LIMIT and pagination.

```gql
MATCH (celebrity:Person {name: "Celebrity"})-[:FOLLOWED_BY]->(follower:Person)
RETURN follower.name
ORDER BY follower.id
SKIP 1000
LIMIT 100;
```

**Solution 2**: Denormalize with cached counts.

```gql
MATCH (celebrity:Person {name: "Celebrity"})
RETURN celebrity.follower_count;  -- Precomputed property
```

**Solution 3**: Partition relationships.

```gql
-- Instead of one celebrity node with 1M edges:
-- Create follower buckets
(celebrity)-[:HAS_FOLLOWER_BUCKET]->(bucket:FollowerBucket {range: "A-F"})
(bucket)-[:CONTAINS_FOLLOWER]->(follower:Person)
```

**Impact**: **Avoid O(n) expansion** on supernodes.

---

### Issue 4: Inefficient Aggregations

**Symptom**: COUNT, SUM, AVG queries are slow.

**Example**:

```gql
MATCH (p:Person)
RETURN count(p);
-- Scans all Person nodes
```

**Solution 1**: Maintain counts in metadata node.

```gql
MATCH (stats:Statistics {type: "Person"})
RETURN stats.total_count;

-- Update on create/delete
MATCH (stats:Statistics {type: "Person"})
SET stats.total_count = stats.total_count + 1;
```

**Solution 2**: Use index-backed aggregation (if supported).

```gql
CREATE INDEX person_label ON Person(label);
-- Future: Optimizer uses index stats for count
```

**Impact**: **Constant time vs O(n)** for large datasets.

---

### Issue 5: Unindexed JOINs

**Symptom**: Queries joining on properties without indexes are slow.

**Example**:

```gql
MATCH (order:Order), (customer:Customer)
WHERE order.customer_id = customer.id
RETURN order.id, customer.name;
-- Cartesian product: orders × customers!
```

**Solution 1**: Use explicit relationships.

```gql
MATCH (order:Order)-[:PLACED_BY]->(customer:Customer)
RETURN order.id, customer.name;
```

**Solution 2**: If relationships don't exist, create indexes.

```gql
CREATE INDEX order_customer_id ON Order(customer_id);
CREATE INDEX customer_id ON Customer(id);
```

**Impact**: Avoids expensive Cartesian products.

---

## Performance Checklist

### Before Query Execution

- [ ] **Use EXPLAIN** to review execution plan
- [ ] **Check for NodeScan** - add indexes if needed
- [ ] **Verify index usage** - IndexSeek is ideal
- [ ] **Look for expensive sorts** - consider index on ORDER BY property
- [ ] **Identify Cartesian products** - use relationships instead

### After Query Execution

- [ ] **Use PROFILE** to measure actual performance
- [ ] **Compare execution_time_ms** to expectations
- [ ] **Check rows_returned** - is it what you expected?
- [ ] **Verify index hit** - did optimizer use your index?
- [ ] **Re-measure after optimization** - confirm improvement

### Index Strategy

- [ ] **Index frequently filtered properties**
- [ ] **Index ORDER BY properties**
- [ ] **Use hash indexes for exact lookups**
- [ ] **Use fulltext indexes for text search**
- [ ] **Use vector indexes for similarity search**
- [ ] **Don't over-index** - each index adds write overhead

---

## Advanced Optimization Techniques

### Materialized Views

For expensive aggregations run frequently, precompute results:

```gql
-- Instead of computing on every query:
MATCH (p:Person)-[:WORKS_FOR]->(c:Company {name: "Acme"})
RETURN count(p) AS employee_count;

-- Maintain a cached value:
MATCH (c:Company {name: "Acme"})
RETURN c.employee_count;  -- Updated on hire/termination
```

### Query Result Caching

Cache frequent query results at application level:

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_company_employees(company_name):
    return db.query(
        "MATCH (p:Person)-[:WORKS_FOR]->(c:Company {name: $name}) RETURN p",
        {"name": company_name}
    )
```

### Batch Operations

Instead of N queries, use one batched query:

**❌ Bad (N+1 Query Problem)**:

```python
for order_id in order_ids:  # 1000 orders
    result = db.query("MATCH (o:Order {id: $id}) RETURN o", {"id": order_id})
    # 1000 individual queries!
```

**✅ Good (Batch Query)**:

```python
result = db.query(
    "MATCH (o:Order) WHERE o.id IN $ids RETURN o",
    {"ids": order_ids}
)
# Single query
```

---

## Monitoring Query Performance

### Enable Query Logging

```yaml
# geode.yaml
logging:
  level: 'info'
  slow_query_threshold_ms: 1000  # Log queries > 1s
```

### Prometheus Metrics

```bash
# Query duration histogram
geode_query_duration_seconds_bucket{le="0.1"}
geode_query_duration_seconds_bucket{le="1.0"}
geode_query_duration_seconds_bucket{le="10.0"}

# Query rate
rate(geode_queries_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))
```

### Grafana Dashboard Queries

```promql
# Top 5 slowest query types
topk(5, avg(rate(geode_query_duration_seconds_sum[5m])) by (query_type))

# Query throughput
sum(rate(geode_queries_total[5m]))

# Error rate
rate(geode_query_errors_total[5m]) / rate(geode_queries_total[5m])
```

---

## Next Steps

- [Indexing Guide](/docs/query/indexing-and-optimization/) - Complete index reference
- [Data Model](/docs/model/data-model-and-types/) - Type system and schema design
- [Troubleshooting](/docs/guides/troubleshooting/) - Diagnose performance issues
- [Configuration](/docs/configuration/server-configuration/) - Tune server performance
- [Monitoring](/docs/ops/observability/) - Set up performance monitoring
