---
title: "PROFILE Command"
description: "Reference for the PROFILE command in GQL to execute queries and measure actual performance metrics"
summary: "Learn how to use PROFILE to execute queries with performance measurement, analyze execution metrics, and optimize query performance."
slug: "profile"
url: "/docs/gql-reference/profile/"
date: 2026-01-28
lastmod: 2026-01-28
draft: false
weight: 40
keywords: ["PROFILE", "query profiling", "performance metrics", "execution time", "query optimization", "GQL PROFILE"]
tags: ["gql", "profile", "performance", "reference"]
categories: ["GQL", "Reference"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/gql-reference/profile/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# PROFILE Command

The PROFILE command executes a query and returns execution statistics. Use it to measure actual query performance and identify bottlenecks.

## Overview

### What PROFILE Does

- **Executes the query** (unlike EXPLAIN)
- Collects execution metrics
- Returns performance statistics
- Measures actual resource usage

### When to Use PROFILE

- Measuring query performance
- Comparing query alternatives with real data
- Identifying slow query sections
- Validating optimization improvements
- Benchmarking queries

## Syntax

```gql
PROFILE <statement>
```

The PROFILE keyword prefixes any GQL statement:

```gql
PROFILE MATCH (n:Person) RETURN n.name;
PROFILE MATCH (a)-[:KNOWS]->(b) RETURN count(*);
```

## Basic Examples

### Simple Query Profile

```gql
PROFILE MATCH (p:Person) RETURN p.name;
```

**Output:**
```
| metric              | value |
|---------------------|-------|
| rows_returned       | 42    |
| columns             | 1     |
| execution_time_ms   | 5     |
```

### Aggregation Query

```gql
PROFILE MATCH (p:Person)
RETURN count(p) AS person_count;
```

**Output:**
```
| metric              | value |
|---------------------|-------|
| rows_returned       | 1     |
| columns             | 1     |
| execution_time_ms   | 3     |
```

### Relationship Query

```gql
PROFILE MATCH (p:Person)-[:WORKS_FOR]->(c:Company)
WHERE c.industry = 'Technology'
RETURN p.name, c.name;
```

**Output:**
```
| metric              | value |
|---------------------|-------|
| rows_returned       | 156   |
| columns             | 2     |
| execution_time_ms   | 12    |
```

## Metrics Reference

### Current Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `rows_returned` | Number of result rows | Integer |
| `columns` | Number of result columns | Integer |
| `execution_time_ms` | Total execution time (milliseconds) | Integer |

### Understanding Metrics

**rows_returned**
- Total rows in the result set
- For aggregations, typically 1 or few rows
- High values may indicate missing LIMIT

**columns**
- Number of columns in RETURN clause
- Corresponds to query structure

**execution_time_ms**
- Wall-clock time for query execution
- Includes parsing, planning, and execution
- Compare across query variations

## Profile Analysis

### Comparing Query Performance

Test different query formulations:

**Query A: Property Filter**
```gql
PROFILE MATCH (p:Person)
WHERE p.status = 'active'
RETURN count(p);
```

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 1     |
| execution_time_ms   | 15    |
```

**Query B: Pattern Filter**
```gql
PROFILE MATCH (p:Person {status: 'active'})
RETURN count(p);
```

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 1     |
| execution_time_ms   | 8     |
```

**Analysis:** Query B is faster with pattern-based filtering.

### Before/After Optimization

**Before Index:**
```gql
PROFILE MATCH (p:Person)
WHERE p.email = 'alice@example.com'
RETURN p;
```

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 1     |
| execution_time_ms   | 45    |
```

**After Creating Index:**
```gql
CREATE INDEX person_email ON Person(email);

PROFILE MATCH (p:Person)
WHERE p.email = 'alice@example.com'
RETURN p;
```

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 1     |
| execution_time_ms   | 2     |
```

**Analysis:** Index reduced execution time by 95%.

### Result Set Size Analysis

```gql
-- Large result set
PROFILE MATCH (n:Node) RETURN n;
```

```
| metric              | value   |
|---------------------|---------|
| rows_returned       | 100000  |
| execution_time_ms   | 250     |
```

**Recommendation:** Add LIMIT for interactive queries:

```gql
PROFILE MATCH (n:Node) RETURN n LIMIT 100;
```

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 100   |
| execution_time_ms   | 8     |
```

## Complex Query Examples

### Aggregation with Grouping

```gql
PROFILE MATCH (p:Person)-[:LIVES_IN]->(c:City)
RETURN c.name, count(p) AS population
ORDER BY population DESC
LIMIT 10;
```

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 10    |
| columns             | 2     |
| execution_time_ms   | 25    |
```

### Variable-Length Path

```gql
PROFILE MATCH path = (a:Person {name: 'Alice'})-[:KNOWS*1..4]->(b:Person)
RETURN count(DISTINCT b) AS reachable;
```

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 1     |
| columns             | 1     |
| execution_time_ms   | 85    |
```

### Multi-Pattern Query

```gql
PROFILE MATCH (c:Customer)-[:PURCHASED]->(p:Product)
MATCH (p)-[:IN_CATEGORY]->(cat:Category)
WHERE cat.name = 'Electronics'
RETURN c.name, collect(p.name) AS products;
```

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 245   |
| columns             | 2     |
| execution_time_ms   | 42    |
```

## Performance Optimization Workflow

### Step 1: Baseline Measurement

```gql
-- Measure current performance
PROFILE MATCH (o:Order)
WHERE o.date > date('2026-01-01')
RETURN o.id, o.total
ORDER BY o.total DESC;
```

Record baseline: `execution_time_ms: 150`

### Step 2: Analyze Query

```gql
-- Check execution plan
EXPLAIN MATCH (o:Order)
WHERE o.date > date('2026-01-01')
RETURN o.id, o.total
ORDER BY o.total DESC;
```

Identify: No index on `Order.date`

### Step 3: Apply Optimization

```gql
-- Create index
CREATE INDEX order_date ON Order(date);
```

### Step 4: Measure Improvement

```gql
PROFILE MATCH (o:Order)
WHERE o.date > date('2026-01-01')
RETURN o.id, o.total
ORDER BY o.total DESC;
```

New result: `execution_time_ms: 25`

**Improvement:** 83% reduction in execution time.

## Profiling Different Query Types

### Data Modification

```gql
PROFILE CREATE (p:Person {name: 'New Person', age: 25});
```

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 0     |
| columns             | 0     |
| execution_time_ms   | 3     |
```

**Note:** Modification queries execute fully; changes are committed.

### Bulk Operations

```gql
PROFILE MATCH (p:Person)
WHERE p.status = 'pending'
SET p.status = 'active';
```

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 0     |
| columns             | 0     |
| execution_time_ms   | 45    |
```

### DELETE Operations

```gql
PROFILE MATCH (p:Person {temp: true})
DETACH DELETE p;
```

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 0     |
| columns             | 0     |
| execution_time_ms   | 12    |
```

**Warning:** PROFILE executes the query. For destructive operations, use a test database.

## Best Practices

### Safe Profiling

**DO:**
- Profile on test/staging environments first
- Use LIMIT when profiling SELECT queries
- Run multiple times for consistent measurements
- Profile during representative load conditions

**DON'T:**
- Profile destructive queries on production without caution
- Compare profiles from different data sizes
- Ignore cold-start effects (first run may be slower)

### Consistent Measurements

```gql
-- Run multiple times
PROFILE MATCH (p:Person) RETURN count(p);  -- Run 1
PROFILE MATCH (p:Person) RETURN count(p);  -- Run 2
PROFILE MATCH (p:Person) RETURN count(p);  -- Run 3

-- Average the results for accuracy
```

### Cache Warming

First run may include cache warming overhead:

```gql
-- Cold run (may be slower)
PROFILE MATCH (p:Person) RETURN count(p);

-- Warm run (cached data)
PROFILE MATCH (p:Person) RETURN count(p);
```

Compare warm runs for accurate benchmarks.

## PROFILE vs EXPLAIN

| Aspect | EXPLAIN | PROFILE |
|--------|---------|---------|
| Executes query | No | Yes |
| Shows plan | Yes | Yes (with metrics) |
| Measures time | No | Yes |
| Counts rows | No | Yes |
| Data access | None | Full |
| Side effects | None | Yes (for mutations) |
| Production safe | Yes | Use caution |

### Workflow: EXPLAIN First, Then PROFILE

1. **EXPLAIN** to understand the plan
2. **PROFILE** to measure actual performance
3. **Optimize** based on findings
4. **Repeat**

```gql
-- Step 1: Understand plan
EXPLAIN MATCH (p:Person) WHERE p.age > 30 RETURN p;

-- Step 2: Measure performance
PROFILE MATCH (p:Person) WHERE p.age > 30 RETURN p;

-- Step 3: Optimize (e.g., create index)
CREATE INDEX person_age ON Person(age);

-- Step 4: Measure improvement
PROFILE MATCH (p:Person) WHERE p.age > 30 RETURN p;
```

## Troubleshooting

### Zero Rows Returned

```gql
PROFILE MATCH (p:NonExistent) RETURN p;
```

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 0     |
| columns             | 1     |
| execution_time_ms   | 1     |
```

**Causes:**
- No matching data
- Incorrect label/property names
- WHERE clause too restrictive

**Diagnosis:**
```gql
-- Check if label exists
MATCH (n) RETURN DISTINCT labels(n);

-- Simplify query
PROFILE MATCH (n) RETURN count(n);
```

### Unexpectedly Slow Query

```gql
PROFILE MATCH (a)-[*]->(b) RETURN count(*);
```

```
| metric              | value |
|---------------------|-------|
| rows_returned       | 1     |
| execution_time_ms   | 15000 |
```

**Causes:**
- Unbounded variable-length path
- Large result set
- Missing indexes

**Solution:** Add bounds:
```gql
PROFILE MATCH (a)-[*1..5]->(b) RETURN count(*);
```

### Inconsistent Timing

If profiling shows different times on each run:

1. Run query multiple times (warm cache)
2. Profile during consistent load
3. Use average of multiple runs
4. Check for concurrent operations

## Future Enhancements

Planned improvements to PROFILE:

### Per-Operator Metrics

```
| operator              | rows  | time_ms | memory_kb |
|-----------------------|-------|---------|-----------|
| NodeScan              | 1000  | 5       | 120       |
| Filter                | 500   | 2       | 80        |
| ExpandRelationships   | 2000  | 15      | 300       |
| Project               | 2000  | 1       | 50        |
| TOTAL                 | 2000  | 23      | 550       |
```

### Memory Profiling

```
| metric              | value    |
|---------------------|----------|
| peak_memory_kb      | 102400   |
| allocated_kb        | 85000    |
| cache_hits          | 1250     |
| cache_misses        | 45       |
```

### I/O Statistics

```
| metric              | value |
|---------------------|-------|
| disk_reads          | 125   |
| disk_writes         | 0     |
| index_lookups       | 42    |
```

## Related Documentation

- **[EXPLAIN Command](/docs/gql-reference/explain/)** - View execution plans
- **[Query Performance Tuning](/docs/query/performance-tuning/)** - Optimization guide
- **[Indexing Guide](/docs/query/indexing-and-optimization/)** - Index strategies
- **[EXPLAIN and PROFILE](/docs/query/explain-profile/)** - Detailed usage guide

---

**Last Updated:** January 28, 2026
**Geode Version:** v0.1.3+
**GQL Compliance:** ISO/IEC 39075:2024
