---
title: "Tag: Indexes"
description: "Master index design and management in Geode. Learn index types, creation strategies, performance optimization, maintenance best practices, and advanced indexing techniques for high-performance graph queries."
keywords:
  - indexes
  - Geode indexing
  - graph database indexes
  - index optimization
  - unique indexes
  - composite indexes
  - index performance
  - index management
  - query acceleration
  - database indexes
  - index design
  - index strategy
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/indexes/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Documentation tagged with **indexes** in the Geode graph database. This comprehensive collection covers index design, implementation strategies, performance optimization, maintenance procedures, and best practices for leveraging indexes to accelerate graph queries and ensure optimal database performance.

## Overview

Indexes are the cornerstone of database performance, dramatically reducing query execution time by providing fast access paths to data. In Geode, indexes accelerate node lookups, property searches, relationship traversals, and complex pattern matching operations. Understanding index design and management is essential for building high-performance graph applications.

Key benefits of indexes:

- **Fast Lookups**: O(log n) access instead of O(n) scans
- **Efficient Filtering**: Quick predicate evaluation on indexed properties
- **Relationship Traversals**: Accelerated edge navigation
- **Unique Constraints**: Enforce data integrity at database level
- **Query Optimization**: Enable better execution plans

## Index Types

### Property Indexes

Index individual node or edge properties:

**Basic Property Index**:

```gql
// Create index on single property
CREATE INDEX user_email_idx ON User(email);

// Accelerates queries like:
MATCH (u:User)
WHERE u.email = 'user@example.com'
RETURN u;

// Performance: Significantly faster than full scans (workload dependent)
```

**Benefits**:

- Equality lookups (property = value)
- Range queries (property > value, property BETWEEN x AND y)
- Ordering (ORDER BY indexed_property)
- Existence checks (WHERE property IS NOT NULL)

### Unique Indexes

Enforce uniqueness while providing fast access:

**Unique Constraint**:

```gql
// Create unique index
CREATE UNIQUE INDEX user_id_idx ON User(user_id);

// Enforces constraint:
// - No two User nodes can have same user_id
// - NULL values allowed (treated as distinct)
// - Provides index performance benefits

// Accelerates lookups:
MATCH (u:User {user_id: '12345'})
RETURN u;
```

**Use Cases**:

- Primary keys (user IDs, email addresses)
- External identifiers (SSN, account numbers)
- Natural keys (ISBN, SKU)
- Usernames and handles

### Composite Indexes

Index multiple properties together:

**Multi-Column Index**:

```gql
// Create composite index
CREATE INDEX user_location_idx ON User(city, state, country);

// Optimizes queries using indexed prefix:
// ✓ Efficient: Uses index fully
MATCH (u:User)
WHERE u.city = 'Seattle' AND u.state = 'WA'
RETURN u;

// ✓ Efficient: Uses index on city
MATCH (u:User)
WHERE u.city = 'Seattle'
RETURN u;

// ✗ Inefficient: Can't use index (no prefix match)
MATCH (u:User)
WHERE u.state = 'WA'
RETURN u;
```

**Index Prefix Rule**:

Composite indexes match queries left-to-right:

```gql
// Index: (a, b, c)

// Can optimize:
// - WHERE a = x
// - WHERE a = x AND b = y
// - WHERE a = x AND b = y AND c = z

// Cannot optimize:
// - WHERE b = y
// - WHERE c = z
// - WHERE b = y AND c = z
```

### Covering Indexes

Include all query columns in index:

**Index-Only Scans**:

```gql
// Create covering index
CREATE INDEX user_profile_idx ON User(email, name, created_at);

// Query satisfied entirely from index:
MATCH (u:User)
WHERE u.email = 'user@example.com'
RETURN u.name, u.created_at;

// No node access needed - all data in index
// Performance: 2-5x faster than regular index
```

**Design Strategy**:

```gql
// Identify frequent query pattern
SELECT name, email, created_at
FROM User
WHERE status = 'active' AND region = 'West';

// Create covering index:
// - Filter columns first (status, region)
// - Return columns last (name, email, created_at)
CREATE INDEX user_active_region_idx
ON User(status, region, name, email, created_at);
```

### Full-Text Indexes

Search text content efficiently:

**Text Search Index**:

```gql
// Create full-text index
CREATE FULLTEXT INDEX post_content_idx ON Post(title, body);

// Enables text search:
MATCH (p:Post)
WHERE p.title CONTAINS 'graph database'
   OR p.body CONTAINS 'graph database'
RETURN p
ORDER BY p.relevance DESC;

// Supports:
// - Keyword search
// - Phrase matching
// - Relevance ranking
// - Stemming and tokenization
```

### Spatial Indexes

Optimize geographic queries:

**Geo Index**:

```gql
// Create spatial index for location data
CREATE SPATIAL INDEX location_idx ON Place(latitude, longitude);

// Accelerates proximity queries:
MATCH (p:Place)
WHERE distance(p.location, point({latitude: 47.6, longitude: -122.3})) < 10000
RETURN p.name, p.location
ORDER BY distance(p.location, point({latitude: 47.6, longitude: -122.3}));

// Supports:
// - Distance calculations
// - Bounding box queries
// - K-nearest neighbors
```

## Index Design

### Design Principles

**Cardinality Considerations**:

```gql
// High cardinality - excellent for indexes
// - email (millions of unique values)
// - user_id (all unique)
// - order_number (all unique)
CREATE UNIQUE INDEX user_email_idx ON User(email);

// Medium cardinality - good for indexes
// - city (thousands of values)
// - zip_code (tens of thousands)
// - product_category (hundreds)
CREATE INDEX user_city_idx ON User(city);

// Low cardinality - poor index candidates
// - gender (2-3 values)
// - boolean flags (2 values)
// - status (3-5 values)
// Skip indexing or use in composite index
```

**Selectivity**:

Indexes work best when they filter out most rows:

```gql
// Highly selective - great index
// Returns <0.1% of rows
MATCH (u:User)
WHERE u.email = 'specific@example.com'
RETURN u;

// Moderately selective - good index
// Returns ~5% of rows
MATCH (u:User)
WHERE u.city = 'Seattle'
RETURN u;

// Low selectivity - poor index
// Returns ~50% of rows
MATCH (u:User)
WHERE u.account_type = 'free'  -- 50% of users
RETURN u;
```

### Index Selection Strategy

**Step 1: Analyze Query Patterns**:

```sql
-- Identify frequent queries
SELECT
  query_text,
  execution_count,
  avg_duration_ms,
  table_scans
FROM system.query_stats
WHERE table_scans > 0
ORDER BY execution_count DESC
LIMIT 50;
```

**Step 2: Identify Filter Columns**:

```gql
-- Extract WHERE clause columns
-- Query: MATCH (u:User) WHERE u.region = 'West' AND u.status = 'active'
-- Candidates: region, status

-- Query: MATCH (p:Product) WHERE p.category = 'Books' AND p.price > 20
-- Candidates: category, price
```

**Step 3: Prioritize by Impact**:

```python
# Calculate index impact score
impact = execution_count * avg_duration * selectivity

# Example:
# Query 1: 10,000 executions/day, 500ms avg, 0.01 selectivity
# Impact: 10,000 * 500 * 0.01 = 50,000

# Query 2: 1,000 executions/day, 100ms avg, 0.1 selectivity
# Impact: 1,000 * 100 * 0.1 = 10,000

# Prioritize Query 1 index
```

**Step 4: Create Strategic Indexes**:

```gql
-- High-impact indexes first
CREATE INDEX user_region_status_idx ON User(region, status);

-- Measure improvement
EXPLAIN
MATCH (u:User)
WHERE u.region = 'West' AND u.status = 'active'
RETURN u;
-- Should show: Index seek instead of full scan
```

## Index Management

### Creating Indexes

**Syntax**:

```gql
-- Basic index
CREATE INDEX index_name ON NodeType(property);

-- Unique index
CREATE UNIQUE INDEX index_name ON NodeType(property);

-- Composite index
CREATE INDEX index_name ON NodeType(prop1, prop2, prop3);

-- Conditional index
CREATE INDEX index_name ON NodeType(property)
WHERE condition;

-- Include additional columns (covering index)
CREATE INDEX index_name ON NodeType(filter_prop)
INCLUDE (return_prop1, return_prop2);
```

**Online Index Creation**:

```gql
-- Create index without blocking writes
CREATE INDEX CONCURRENTLY user_email_idx ON User(email);

-- Progress tracking
SELECT
  index_name,
  build_progress,
  estimated_completion
FROM system.index_builds
WHERE status = 'in_progress';
```

### Monitoring Indexes

**Index Usage Statistics**:

```gql
-- View index usage
SELECT
  index_name,
  table_name,
  index_scans,
  rows_read,
  last_scan_time,
  index_size_mb
FROM system.index_stats
ORDER BY index_scans DESC;
```

**Unused Indexes**:

```gql
-- Find indexes that are never used
SELECT
  index_name,
  table_name,
  index_size_mb,
  created_at
FROM system.index_stats
WHERE index_scans = 0
  AND created_at < NOW() - INTERVAL '30 days'
ORDER BY index_size_mb DESC;
```

**Index Efficiency**:

```gql
-- Identify inefficient indexes
SELECT
  index_name,
  table_name,
  index_scans,
  rows_read / NULLIF(index_scans, 0) AS avg_rows_per_scan,
  index_size_mb
FROM system.index_stats
WHERE index_scans > 0
  AND rows_read / NULLIF(index_scans, 0) > 1000  -- Low selectivity
ORDER BY avg_rows_per_scan DESC;
```

### Index Maintenance

**Rebuild Fragmented Indexes**:

```gql
-- Check index health
SELECT
  index_name,
  fragmentation_percent,
  page_count,
  last_rebuild_time
FROM system.index_health
WHERE fragmentation_percent > 30;

-- Rebuild index
REINDEX INDEX user_email_idx;

-- Rebuild all indexes on table
REINDEX TABLE User;
```

**Update Statistics**:

```gql
-- Refresh optimizer statistics
ANALYZE User;

-- Full database analysis
ANALYZE;

-- Check statistics freshness
SELECT
  table_name,
  last_analyze_time,
  row_count,
  mod_count
FROM system.table_stats
WHERE last_analyze_time < NOW() - INTERVAL '7 days';
```

### Dropping Indexes

**Remove Unused Indexes**:

```gql
-- Drop single index
DROP INDEX user_old_idx;

-- Drop if exists (safe)
DROP INDEX IF EXISTS user_old_idx;

-- Drop multiple indexes
DROP INDEX user_idx1, user_idx2, user_idx3;
```

**Impact Analysis Before Dropping**:

```gql
-- Check what queries use an index
SELECT DISTINCT query_text
FROM system.query_plans
WHERE index_name = 'user_region_idx';
```

## Performance Optimization

### Index Selection by Query Optimizer

**How Optimizer Chooses Indexes**:

```gql
-- Query with multiple index candidates
MATCH (u:User)
WHERE u.region = 'West' AND u.email = 'user@example.com'
RETURN u;

-- Available indexes:
-- 1. user_region_idx on (region)
-- 2. user_email_idx on (email)

-- Optimizer chooses user_email_idx because:
-- - Higher selectivity (unique email vs common region)
-- - Faster lookup (1 row vs many rows)
```

**Force Index Usage**:

```gql
-- Force specific index with hint
MATCH (u:User)
USING INDEX user_region_idx
WHERE u.region = 'West'
RETURN u;
```

### Index vs. Table Scan Decision

**Cost-Based Optimization**:

```gql
-- When index is used:
MATCH (u:User)
WHERE u.email = 'user@example.com'
RETURN u;
-- Cost: Index seek (3 I/Os) + 1 row fetch = 4 I/Os

-- When table scan is used:
MATCH (u:User)
WHERE u.account_type = 'premium'
RETURN u;
-- 50% of rows match
-- Cost: Index seek (3 I/Os) + 500,000 row fetches = 500,003 I/Os
-- vs Table scan: 10,000 page reads = 10,000 I/Os
-- Optimizer chooses table scan (cheaper)
```

### Composite Index Optimization

**Column Order Matters**:

```gql
-- Query pattern: Filter by status, then region, then created_at
MATCH (u:User)
WHERE u.status = 'active'
  AND u.region = 'West'
  AND u.created_at > '2025-01-01'
RETURN u;

-- Optimal index order:
// 1. Most selective first
CREATE INDEX user_composite_idx ON User(status, region, created_at);

// Or prioritize equality over range
CREATE INDEX user_composite_idx ON User(region, status, created_at);
// Equality (region, status) then range (created_at)
```

## Best Practices

### Index Design Guidelines

**DO**:

- Index primary keys and foreign keys
- Index columns frequently in WHERE clauses
- Index columns used in JOIN conditions
- Index columns in ORDER BY clauses
- Use composite indexes for multi-column filters
- Include covering columns for hot queries
- Monitor index usage and remove unused indexes

**DON'T**:

- Over-index (each index slows writes)
- Index low-cardinality columns alone
- Create redundant indexes
- Index columns rarely queried
- Forget to update statistics
- Ignore index fragmentation

### Write Performance Considerations

**Index Overhead**:

```gql
-- Each write operation updates all indexes

-- Node with 5 indexes:
CREATE (u:User {
  user_id: '12345',
  email: 'user@example.com',
  name: 'Alice',
  city: 'Seattle',
  created_at: timestamp()
});

// Updates:
// 1. Primary table storage
// 2. user_id_idx
// 3. email_idx
// 4. name_idx
// 5. city_idx
// 6. created_at_idx
// Total: 6 write operations
```

**Batch Operations**:

```gql
-- Disable indexes during bulk load
ALTER INDEX user_email_idx DISABLE;

-- Load data
LOAD CSV FROM 'users.csv' AS row
CREATE (u:User {user_id: row.id, email: row.email, ...});

-- Rebuild indexes
ALTER INDEX user_email_idx REBUILD;
```

### Index Monitoring Workflow

**Weekly Review**:

```gql
-- 1. Check unused indexes
SELECT index_name, index_size_mb
FROM system.index_stats
WHERE index_scans = 0 AND created_at < NOW() - INTERVAL '30 days';

-- 2. Identify missing indexes
SELECT query_text, execution_count, avg_duration_ms
FROM system.query_stats
WHERE table_scans > 0 AND execution_count > 100
ORDER BY execution_count * avg_duration_ms DESC
LIMIT 20;

-- 3. Review index health
SELECT index_name, fragmentation_percent
FROM system.index_health
WHERE fragmentation_percent > 30;

-- 4. Update statistics
ANALYZE;
```

## Advanced Techniques

### Partial Indexes

Index subset of rows:

```gql
-- Index only active users
CREATE INDEX active_users_idx ON User(email)
WHERE status = 'active';

-- Much smaller than full index
-- Faster for queries on active users only
MATCH (u:User)
WHERE u.status = 'active' AND u.email = 'user@example.com'
RETURN u;
```

### Expression Indexes

Index computed values:

```gql
-- Index lowercase email for case-insensitive search
CREATE INDEX user_email_lower_idx ON User(LOWER(email));

-- Enables fast case-insensitive lookup
MATCH (u:User)
WHERE LOWER(u.email) = LOWER('User@Example.com')
RETURN u;
```

### Index-Organized Tables

Store table data in index order:

```gql
-- Create table ordered by timestamp
CREATE NODE TYPE Event (
  event_id UUID PRIMARY KEY,
  timestamp TIMESTAMP,
  event_type STRING,
  data JSON
) CLUSTERED BY (timestamp);

-- Range queries on timestamp are extremely fast
MATCH (e:Event)
WHERE e.timestamp > '2025-01-01' AND e.timestamp < '2025-01-31'
RETURN e
ORDER BY e.timestamp;
-- No sort needed, data already in order
```

## Troubleshooting

### Index Not Being Used

**Diagnosis**:

```gql
-- Check execution plan
EXPLAIN
MATCH (u:User)
WHERE u.email = 'user@example.com'
RETURN u;

-- If showing table scan instead of index seek:
```

**Common Causes**:

1. **Function on indexed column**:

```gql
-- ✗ Index not used
MATCH (u:User)
WHERE LOWER(u.email) = 'user@example.com'
RETURN u;

-- ✓ Index used
MATCH (u:User)
WHERE u.email = 'user@example.com'
RETURN u;
```

2. **Type mismatch**:

```gql
-- ✗ Index not used (string vs integer)
MATCH (u:User)
WHERE u.user_id = 12345  -- user_id is string
RETURN u;

-- ✓ Index used
MATCH (u:User)
WHERE u.user_id = '12345'
RETURN u;
```

3. **Stale statistics**:

```gql
-- Update optimizer statistics
ANALYZE User;
```

### Slow Index Scans

**Issue**: Index exists but queries still slow.

**Solutions**:

```gql
-- 1. Check index selectivity
SELECT
  index_name,
  rows_read / NULLIF(index_scans, 0) AS avg_rows_per_scan
FROM system.index_stats
WHERE index_name = 'problematic_idx';
-- High avg_rows_per_scan indicates low selectivity

-- 2. Consider composite index for better selectivity
CREATE INDEX better_idx ON User(region, status, created_at);

-- 3. Use covering index to avoid row fetches
CREATE INDEX covering_idx ON User(region)
INCLUDE (name, email, created_at);
```

## Integration with Geode

Indexes integrate seamlessly with Geode features:

- **Query Optimizer**: Automatic index selection for optimal plans
- **EXPLAIN Command**: Shows index usage in execution plans
- **Transactions**: Indexes updated atomically within transactions
- **Concurrency**: Online index creation without blocking writes
- **Monitoring**: Built-in index usage and health metrics
- **Security**: RLS policies work efficiently with indexes

## Related Topics

- **Query Optimization**: Using indexes for better performance
- **Query Performance**: Index impact on throughput and latency
- **EXPLAIN Command**: Analyzing index usage in query plans
- **Schema Design**: Designing schemas with indexing in mind
- **Best Practices**: Index design and management best practices
- **Monitoring**: Tracking index usage and performance

---

Browse the tagged content below to discover comprehensive guides, tutorials, and best practices for indexes in Geode. Learn how to design, create, and manage indexes that dramatically improve query performance and scale your graph database applications to production workloads.
