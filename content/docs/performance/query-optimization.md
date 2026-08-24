---
title: "Query Optimization"
description: "Optimize GQL queries for maximum performance with indexing strategies, query planning, and execution tuning"
url: /docs/performance/query-optimization/
weight: 20
tags:
  - performance
  - query-optimization
  - indexing
  - explain
  - tuning
categories:
  - performance
keywords:
  - query optimization
  - EXPLAIN
  - indexes
  - query planning
  - performance tuning
  - slow queries
  - query profiling
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Query Optimization

This guide covers techniques for optimizing GQL queries in Geode, including query analysis, indexing strategies, and performance tuning.

## Overview

Query optimization improves performance through:

| Technique | Impact | Effort |
|-----------|--------|--------|
| Proper indexes | High | Low |
| Query rewriting | High | Medium |
| Schema optimization | High | High |
| Configuration tuning | Medium | Low |
| Hardware upgrades | Medium | High |

## Query Analysis

### Using EXPLAIN

Analyze query execution plans:

```gql
-- Basic EXPLAIN
EXPLAIN MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30
RETURN f.name;

-- Output:
-- Query Plan
-- =============================================
-- NodeByLabelScan (Person, alias: p)
--   └── Filter (p.age > 30)
--       └── Expand (p)-[:KNOWS]->(f)
--           └── Return (f.name)
--
-- Estimated rows: 1500
-- Indexes used: none
```

### Using EXPLAIN ANALYZE

Execute and measure actual performance:

```gql
-- EXPLAIN with actual execution
EXPLAIN ANALYZE MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30
RETURN f.name;

-- Output:
-- Query Plan (Actual)
-- =============================================
-- NodeByLabelScan (Person, alias: p)
--   Rows: 10000, Time: 45ms
--   └── Filter (p.age > 30)
--       Rows: 3500, Selectivity: 35%
--       └── Expand (p)-[:KNOWS]->(f)
--           Rows: 15000, Time: 120ms
--           └── Return (f.name)
--               Rows: 15000, Time: 5ms
--
-- Total Time: 170ms
-- Rows Returned: 15000
-- Peak Memory: 12MB
```

### Using PROFILE

Get detailed execution statistics:

```gql
PROFILE MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30
RETURN f.name
LIMIT 100;

-- Output:
-- Profile Results
-- =============================================
-- Operator          | Rows   | Time   | Memory | Hits
-- NodeByLabelScan   | 10000  | 45ms   | 2MB    | 10000
-- Filter            | 3500   | 12ms   | 0.1MB  | 10000
-- Expand            | 15000  | 120ms  | 8MB    | 15000
-- Limit             | 100    | 0.1ms  | 0.01MB | 100
-- Return            | 100    | 0.5ms  | 0.1MB  | 100
-- =============================================
-- Total: 177.6ms
-- Index Lookups: 0
-- Cache Hits: 8500
-- Cache Misses: 1500
```

## Index Optimization

### Index Types

| Index Type | Use Case | Query Pattern |
|------------|----------|---------------|
| B-tree | Range queries, sorting | `WHERE x > 10`, `ORDER BY x` |
| Hash | Exact match | `WHERE x = 'value'` |
| Spatial (R-tree) | Geographic queries | `WHERE distance(a, b) < 10` |
| Vector (HNSW) | Similarity search | `WHERE similarity(v1, v2) > 0.9` |
| Full-text | Text search | `WHERE content CONTAINS 'word'` |
| Patricia Trie | Prefix matching, IP ranges | `WHERE ip LIKE '192.168.%'` |

### Creating Effective Indexes

```gql
-- B-tree for range queries
CREATE INDEX person_age_idx ON Person(age) USING btree;

-- Hash for exact matches (faster than B-tree for equality)
CREATE INDEX person_email_idx ON Person(email) USING hash;

-- Composite index for multiple columns
CREATE INDEX person_name_age_idx ON Person(name, age);

-- Spatial index for geographic data
CREATE INDEX location_coords_idx ON Location(coordinates) USING spatial;

-- Vector index for embeddings
CREATE INDEX doc_embedding_idx ON Document(embedding)
USING vector
WITH (metric = 'cosine');

-- Full-text index for text search
CREATE INDEX article_content_idx ON Article(content)
USING fulltext
WITH (language = 'english', stemmer = 'porter');
```

### Index Selection Guidelines

```gql
-- GOOD: Indexed column in WHERE
CREATE INDEX person_email_idx ON Person(email);
MATCH (p:Person) WHERE p.email = 'alice@example.com' RETURN p;
-- Uses index scan: O(log n)

-- BAD: Function on indexed column prevents index use
MATCH (p:Person) WHERE lower(p.email) = 'alice@example.com' RETURN p;
-- Full table scan: O(n)

-- BETTER: Create functional index
CREATE INDEX person_email_lower_idx ON Person(lower(email));
```

### Verifying Index Usage

```gql
-- Check if index is used
EXPLAIN MATCH (p:Person) WHERE p.email = 'alice@example.com' RETURN p;

-- Good output: "IndexSeek (person_email_idx)"
-- Bad output: "NodeByLabelScan (Person)"

-- List all indexes
SHOW INDEXES;

-- Check index statistics
SHOW INDEX STATISTICS FOR person_email_idx;
```

## Query Patterns

### Pattern: Anchor Early

Start patterns with indexed lookups:

```gql
-- GOOD: Anchor with indexed property first
MATCH (p:Person {email: 'alice@example.com'})-[:KNOWS]->(f)
RETURN f;
-- Index lookup -> Expand (fast)

-- BAD: No anchor, scans all relationships
MATCH (p:Person)-[:KNOWS]->(f)
WHERE p.email = 'alice@example.com'
RETURN f;
-- May scan all Person nodes
```

### Pattern: Limit Path Depth

Bound variable-length paths:

```gql
-- GOOD: Bounded path length
MATCH (a)-[:KNOWS*1..3]->(b)
RETURN b;
-- Predictable expansion

-- BAD: Unbounded path (can explode)
MATCH (a)-[:KNOWS*]->(b)
RETURN b;
-- May traverse entire graph

-- BETTER: Use shortest path for specific queries
MATCH path = shortestPath((a)-[:KNOWS*1..10]->(b))
WHERE a.email = 'alice@example.com'
  AND b.email = 'bob@example.com'
RETURN path;
```

### Pattern: Filter Early

Push filters as early as possible:

```gql
-- GOOD: Filter in MATCH
MATCH (p:Person {status: 'active'})-[:WORKS_AT]->(c:Company)
WHERE c.industry = 'Tech'
RETURN p, c;
-- Filters applied during traversal

-- BAD: Filter after collecting all data
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
WHERE p.status = 'active' AND c.industry = 'Tech'
RETURN p, c;
-- May collect more data than needed
```

### Pattern: Use LIMIT with ORDER BY

Always use ORDER BY with LIMIT for deterministic results:

```gql
-- GOOD: Deterministic results
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY p.age DESC
LIMIT 10;

-- BAD: Non-deterministic (different results each run)
MATCH (p:Person)
RETURN p.name, p.age
LIMIT 10;
```

### Pattern: Avoid Cartesian Products

Ensure patterns are connected:

```gql
-- BAD: Cartesian product (n * m combinations)
MATCH (p:Person), (c:Company)
WHERE p.company_id = c.id
RETURN p, c;
-- Computes all Person x Company pairs first

-- GOOD: Connected pattern
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN p, c;
-- Direct traversal
```

## Aggregation Optimization

### Push Filters Before Aggregation

```gql
-- GOOD: Filter before aggregation
MATCH (p:Person)
WHERE p.status = 'active'
RETURN p.city, count(*) AS population
GROUP BY p.city;
-- Filters first, then aggregates

-- BAD: Aggregate then filter (if possible to rewrite)
MATCH (p:Person)
RETURN p.city, count(*) AS population, p.status
GROUP BY p.city, p.status
HAVING p.status = 'active';
```

### Use Covering Indexes

```gql
-- Create composite index
CREATE INDEX person_city_status_idx ON Person(city, status);

-- Query uses index only (no table access)
MATCH (p:Person)
WHERE p.status = 'active'
RETURN p.city, count(*) AS count
GROUP BY p.city;
```

### Pre-aggregate with Materialized Views

```gql
-- Create materialized view for common aggregation
CREATE MATERIALIZED VIEW city_population AS
SELECT city, count(*) AS population
FROM (MATCH (p:Person) WHERE p.status = 'active' RETURN p.city AS city)
GROUP BY city;

-- Query the materialized view
SELECT * FROM city_population WHERE city = 'New York';
```

## Join Optimization

### Choose Optimal Join Order

The optimizer chooses join order, but hints can help:

```gql
-- Smaller table first (better for nested loop join)
MATCH (small:Rare)-[:RELATES_TO]->(large:Common)
RETURN small, large;

-- Use EXPLAIN to verify join order
EXPLAIN MATCH (a:TypeA)-[:REL]->(b:TypeB)
RETURN a, b;
```

### Use Relationship Direction

Specify direction when known:

```gql
-- GOOD: Explicit direction
MATCH (a)-[:KNOWS]->(b)
RETURN b;
-- One direction traversal

-- SLOWER: Both directions
MATCH (a)-[:KNOWS]-(b)
RETURN b;
-- Checks both directions
```

## Subquery Optimization

### EXISTS vs COUNT

```gql
-- GOOD: EXISTS for existence check
MATCH (p:Person)
WHERE EXISTS {
    MATCH (p)-[:OWNS]->(c:Car)
}
RETURN p;
-- Stops at first match

-- BAD: COUNT for existence check
MATCH (p:Person)
WHERE (MATCH (p)-[:OWNS]->(c:Car) RETURN count(c)) > 0
RETURN p;
-- Counts all cars
```

### Correlated vs Non-Correlated

```gql
-- Non-correlated subquery (computed once)
MATCH (p:Person)
WHERE p.salary > (
    SELECT avg(salary) FROM (MATCH (x:Person) RETURN x.salary AS salary)
)
RETURN p;

-- Correlated subquery (computed per row - slower)
MATCH (p:Person)
WHERE p.salary > (
    MATCH (p)-[:WORKS_AT]->(c:Company)
    RETURN avg(c.avg_salary)
)
RETURN p;
```

## Configuration Tuning

### Query Optimizer Settings

```yaml
# geode.yaml
optimizer:
  # Cost model parameters
  cost_model:
    seq_scan_cost: 1.0       # Sequential scan cost per row
    index_scan_cost: 0.1     # Index scan cost per row
    join_cost: 2.0           # Join cost multiplier

  # Optimization limits
  max_optimization_time_ms: 1000  # Max time for optimization
  max_join_permutations: 10000    # Max join orders to consider

  # Statistics
  statistics_sample_size: 10000   # Rows to sample for stats
  auto_analyze: true              # Auto-update statistics
```

### Memory Settings

```yaml
# geode.yaml
memory:
  # Query execution memory
  query_memory_limit: '1GB'       # Per-query memory limit
  sort_memory: '256MB'            # Memory for sorting
  hash_join_memory: '512MB'       # Memory for hash joins

  # Page cache
  page_cache_size: '4GB'          # Page cache for data
```

### Parallelism

```yaml
# geode.yaml
parallelism:
  max_parallel_queries: 100       # Concurrent queries
  parallel_workers: 8             # Workers per parallel query
  parallel_threshold: 10000       # Min rows for parallel scan
```

## Slow Query Analysis

### Enable Slow Query Logging

```yaml
# geode.yaml
logging:
  slow_query:
    enabled: true
    threshold_ms: 1000            # Log queries > 1 second
    log_plan: true                # Include query plan
    log_file: /var/log/geode/slow-queries.log
```

### Analyzing Slow Queries

```bash
# Find slowest queries
grep "duration_ms" /var/log/geode/slow-queries.log | \
  jq -s 'sort_by(.duration_ms) | reverse | .[0:10]'

# Find most frequent slow queries
grep "query_hash" /var/log/geode/slow-queries.log | \
  jq -s 'group_by(.query_hash) | map({hash: .[0].query_hash, count: length}) | sort_by(.count) | reverse'
```

### Query Performance Metrics

```promql
# Slow query rate
rate(geode_query_duration_seconds_bucket{le="1"}[5m]) /
rate(geode_query_duration_seconds_count[5m])

# Query latency percentiles
histogram_quantile(0.99, rate(geode_query_duration_seconds_bucket[5m]))

# Queries by type
rate(geode_query_total[5m]) by (query_type)
```

## Common Anti-Patterns

### Anti-Pattern: SELECT *

```gql
-- BAD: Returns all properties
MATCH (p:Person) RETURN p;

-- GOOD: Return only needed properties
MATCH (p:Person) RETURN p.name, p.email;
```

### Anti-Pattern: N+1 Queries

```gql
-- BAD: One query per person (N+1 problem)
// Application code:
// for person in get_all_persons():
//     friends = query("MATCH (p)-[:KNOWS]->(f) WHERE p.id = $id RETURN f", id=person.id)

-- GOOD: Single query with all data
MATCH (p:Person)-[:KNOWS]->(f:Person)
RETURN p.id, collect(f) AS friends;
```

### Anti-Pattern: Unbounded Collections

```gql
-- BAD: Collect all (memory explosion)
MATCH (p:Person)-[:KNOWS]->(f)
RETURN p.name, collect(f) AS all_friends;

-- GOOD: Limit collection size
MATCH (p:Person)-[:KNOWS]->(f)
RETURN p.name, collect(f)[0..100] AS friends;
```

## Best Practices Summary

### Do

1. Create indexes for frequently queried properties
2. Use EXPLAIN to verify query plans
3. Anchor patterns with indexed lookups
4. Bound variable-length paths
5. Filter early in the query
6. Use LIMIT with ORDER BY
7. Return only needed properties
8. Use EXISTS for existence checks

### Avoid

1. Functions on indexed columns in WHERE
2. Unbounded path expansion
3. Cartesian products
4. SELECT * when specific columns needed
5. N+1 query patterns
6. Unbounded collections
7. Sorting large result sets without indexes

## Troubleshooting

### Query Takes Too Long

```bash
# Check query plan
geode query "EXPLAIN ANALYZE <your-query>"

# Common causes:
# 1. Missing index -> Create appropriate index
# 2. Cartesian product -> Rewrite with connected patterns
# 3. Unbounded path -> Add depth limit
# 4. Large result set -> Add LIMIT
```

### High Memory Usage

```bash
# Check query memory
geode query "PROFILE <your-query>" | grep Memory

# Reduce memory:
# 1. Add LIMIT to reduce result size
# 2. Use pagination
# 3. Avoid large collect() operations
# 4. Increase query_memory_limit if needed
```

### Query Returns Wrong Results

```bash
# Verify query logic
geode query "EXPLAIN <your-query>"

# Check for:
# 1. Missing relationship direction
# 2. Incorrect property names
# 3. Type mismatches in comparisons
```

## Related Documentation

- **[Indexing and Optimization](/docs/query/indexing-and-optimization/)** - Index reference
- **[EXPLAIN and PROFILE](/docs/query/explain-profile/)** - Query analysis
- **[Performance Tuning](/docs/performance/)** - System tuning
- **[Benchmarking](/docs/performance/benchmarking/)** - Performance testing
