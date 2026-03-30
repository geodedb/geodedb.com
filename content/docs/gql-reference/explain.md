---
title: "EXPLAIN Command"
description: "Reference for the EXPLAIN command in GQL to analyze query execution plans without running queries"
summary: "Learn how to use EXPLAIN to view query execution plans, understand operators, and optimize GQL queries before execution."
slug: "explain"
url: "/docs/gql-reference/explain/"
date: 2026-01-28
lastmod: 2026-01-28
draft: false
weight: 30
keywords: ["EXPLAIN", "execution plan", "query plan", "query optimization", "plan analysis", "GQL EXPLAIN"]
tags: ["gql", "explain", "optimization", "reference"]
categories: ["GQL", "Reference"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/gql-reference/explain/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# EXPLAIN Command

The EXPLAIN command displays the query execution plan without executing the query. Use it to understand how Geode will process your queries and identify optimization opportunities.

## Overview

### What EXPLAIN Does

- Parses and plans the query
- Returns the logical execution plan
- **Does NOT execute** the query
- **Does NOT access data**
- Zero-cost operation (safe for production)

### When to Use EXPLAIN

- Before running expensive queries
- When optimizing query performance
- To verify index usage
- When comparing query alternatives
- For understanding query processing

## Syntax

```gql
EXPLAIN <statement>
```

The EXPLAIN keyword prefixes any GQL statement:

```gql
EXPLAIN MATCH (n:Person) RETURN n.name;
EXPLAIN CREATE (p:Person {name: 'Alice'});
EXPLAIN MATCH (a)-[:KNOWS]->(b) DELETE a;
```

## Basic Examples

### Simple MATCH Query

```gql
EXPLAIN MATCH (p:Person) RETURN p.name;
```

**Output:**

```
| plan              |
|-------------------|
| EXPLAIN           |
| MATCH             |
|   NodeScan        |
| RETURN            |
|   Project         |
```

**Reading the Plan:**

- `NodeScan`: Scans nodes with the Person label
- `Project`: Selects the `name` property for output

### MATCH with WHERE

```gql
EXPLAIN MATCH (p:Person)
WHERE p.age > 30
RETURN p.name, p.age;
```

**Output:**

```
| plan              |
|-------------------|
| EXPLAIN           |
| MATCH             |
|   NodeScan        |
|   Filter          |
| RETURN            |
|   Project         |
```

**New Operator:**

- `Filter`: Applies the `WHERE p.age > 30` predicate

### Relationship Pattern

```gql
EXPLAIN MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN a.name, b.name;
```

**Output:**

```
| plan                    |
|-------------------------|
| EXPLAIN                 |
| MATCH                   |
|   NodeScan              |
|   ExpandRelationships   |
| RETURN                  |
|   Project               |
```

**New Operator:**

- `ExpandRelationships`: Traverses KNOWS relationships

## Execution Plan Operators

### Scan Operators

| Operator | Description | When Used |
|----------|-------------|-----------|
| `NodeScan` | Scans nodes (optionally by label) | MATCH clauses |
| `IndexScan` | Uses index to find nodes | Indexed property lookups |
| `UniqueIndexScan` | Uses unique index | Unique constraint lookups |

### Filter Operators

| Operator | Description | When Used |
|----------|-------------|-----------|
| `Filter` | Applies WHERE predicates | WHERE clauses |
| `LabelFilter` | Filters by label | Multiple labels |

### Traversal Operators

| Operator | Description | When Used |
|----------|-------------|-----------|
| `ExpandRelationships` | Follows relationships | Relationship patterns |
| `VarLengthExpand` | Variable-length traversal | `*1..3` patterns |
| `ShortestPath` | Computes shortest path | shortestPath() |

### Aggregation Operators

| Operator | Description | When Used |
|----------|-------------|-----------|
| `Aggregate` | Groups and computes aggregates | COUNT, SUM, etc. |
| `Distinct` | Removes duplicates | DISTINCT keyword |

### Modification Operators

| Operator | Description | When Used |
|----------|-------------|-----------|
| `CreateNodes` | Creates new nodes | CREATE |
| `CreateRelationships` | Creates relationships | CREATE |
| `DeleteNodes` | Deletes nodes | DELETE |
| `SetProperties` | Updates properties | SET |

### Other Operators

| Operator | Description | When Used |
|----------|-------------|-----------|
| `Project` | Selects/transforms columns | RETURN |
| `Sort` | Orders results | ORDER BY |
| `Limit` | Restricts row count | LIMIT |
| `Skip` | Skips rows | OFFSET/SKIP |

## Complex Query Examples

### Aggregation Query

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
|   Aggregate             |
|   Project               |
|   Sort                  |
|   Limit                 |
```

### Variable-Length Path

```gql
EXPLAIN MATCH path = (a:Person {name: 'Alice'})-[:KNOWS*1..3]->(b:Person)
RETURN path;
```

**Output:**

```
| plan                    |
|-------------------------|
| EXPLAIN                 |
| MATCH                   |
|   NodeScan              |
|   Filter                |
|   VarLengthExpand       |
| RETURN                  |
|   Project               |
```

### CREATE Statement

```gql
EXPLAIN CREATE (p:Person {name: 'Bob', age: 30})
       -[:WORKS_FOR]->
       (c:Company {name: 'Acme'});
```

**Output:**

```
| plan                    |
|-------------------------|
| EXPLAIN                 |
| CREATE                  |
|   CreateNodes           |
|   CreateRelationships   |
```

### DELETE Statement

```gql
EXPLAIN MATCH (p:Person)
WHERE p.status = 'inactive'
DETACH DELETE p;
```

**Output:**

```
| plan                    |
|-------------------------|
| EXPLAIN                 |
| DELETE                  |
|   NodeScan              |
|   Filter                |
|   DeleteNodes           |
```

## Interpreting Plans

### Reading Plan Order

Plans execute from **innermost to outermost**:

```
| EXPLAIN           |  <- Final output
| MATCH             |
|   NodeScan        |  <- Start here
|   Filter          |  <- Then filter
| RETURN            |
|   Project         |  <- Finally project
```

**Execution flow:** NodeScan -> Filter -> Project

### Identifying Issues

**Issue: Full Node Scan**

```
|   NodeScan              |  <- No label = scans ALL nodes
```

**Solution:** Add label to pattern:

```gql
MATCH (p:Person)  -- Scans only Person nodes
```

**Issue: Late Filtering**

```
|   NodeScan              |
|   ExpandRelationships   |  <- Expands before filter
|   Filter                |  <- Filter applied late
```

**Solution:** Move filter to pattern or earlier WHERE:

```gql
MATCH (p:Person {status: 'active'})-[:KNOWS]->(f)
-- OR use WITH to filter before expanding
MATCH (p:Person)
WHERE p.status = 'active'
WITH p
MATCH (p)-[:KNOWS]->(f)
```

### Plan Comparison

Compare different query formulations:

**Query A:**

```gql
EXPLAIN MATCH (p:Person), (c:Company)
WHERE p.company_id = c.id
RETURN p.name, c.name;
```

**Query B:**

```gql
EXPLAIN MATCH (p:Person)-[:WORKS_FOR]->(c:Company)
RETURN p.name, c.name;
```

Query B is likely more efficient (uses relationship vs. property join).

## EXPLAIN for Optimization

### Workflow

1. **Write query**
2. **Run EXPLAIN**
3. **Analyze plan**
4. **Identify issues**
5. **Refactor query**
6. **Repeat**

### Optimization Checklist

Check EXPLAIN output for:

- [ ] `NodeScan` without label filter?
- [ ] `Filter` after expensive operations?
- [ ] Missing index usage?
- [ ] Unnecessary `Sort` operations?
- [ ] `VarLengthExpand` without bounds?

### Example Optimization

**Before:**

```gql
EXPLAIN MATCH (n)
WHERE n:Person AND n.email = 'alice@example.com'
RETURN n;
```

```
| plan              |
|-------------------|
| EXPLAIN           |
| MATCH             |
|   NodeScan        |  <- Scans all nodes!
|   LabelFilter     |
|   Filter          |
```

**After:**

```gql
-- Create index
CREATE INDEX person_email ON Person(email);

EXPLAIN MATCH (n:Person {email: 'alice@example.com'})
RETURN n;
```

```
| plan              |
|-------------------|
| EXPLAIN           |
| MATCH             |
|   IndexScan       |  <- Uses index!
```

## Limitations

### Current Limitations

1. **No Cost Estimates**: Plans don't show estimated costs
2. **No Row Estimates**: No estimated row counts per operator
3. **No Index Details**: Doesn't show which specific index is used
4. **No Memory Estimates**: Memory usage not shown

### Future Enhancements

Planned improvements include:

- Cost-based plan display
- Row count estimates
- Index usage details
- Memory allocation estimates
- Visual plan representation

## Best Practices

### When to Use EXPLAIN

**DO use EXPLAIN:**

- Before deploying new queries
- When queries are slow
- To verify index usage
- When comparing query alternatives

**DON'T rely only on EXPLAIN:**

- Use PROFILE for actual performance data
- Real execution may differ from plan

### Production Safety

EXPLAIN is safe for production:

- No data access
- No locks acquired
- No side effects
- Fast execution

```gql
-- Safe to run in production
EXPLAIN MATCH (n:CriticalData) RETURN count(n);
```

## Related Commands

### PROFILE

Execute query and measure actual performance:

```gql
PROFILE MATCH (p:Person) WHERE p.age > 30 RETURN p.name;
```

See [PROFILE Command](/docs/gql-reference/profile/) for details.

### Comparison

| Aspect | EXPLAIN | PROFILE |
|--------|---------|---------|
| Executes query | No | Yes |
| Shows plan | Yes | Yes (with metrics) |
| Safe for production | Yes | Use with caution |
| Performance impact | None | Query execution time |
| Best for | Planning | Measuring |

## Examples by Query Type

### SELECT/MATCH Queries

```gql
EXPLAIN MATCH (p:Person)-[:FRIENDS]->(f:Person)
WHERE p.name = 'Alice'
RETURN f.name;
```

### Aggregation Queries

```gql
EXPLAIN MATCH (o:Order)
RETURN o.category, sum(o.total) AS revenue
ORDER BY revenue DESC;
```

### Path Queries

```gql
EXPLAIN MATCH path = shortestPath(
  (a:Person {name: 'Alice'})-[*]-(b:Person {name: 'Bob'})
)
RETURN path;
```

### Mutation Queries

```gql
EXPLAIN MATCH (p:Person {status: 'inactive'})
SET p.archived = true;
```

## Related Documentation

- **[PROFILE Command](/docs/gql-reference/profile/)** - Measure actual performance
- **[Query Performance Tuning](/docs/query/performance-tuning/)** - Optimization guide
- **[Indexing Guide](/docs/query/indexing-and-optimization/)** - Index strategies
- **[GQL Guide](/docs/gql/guide/)** - Complete GQL reference

---

**Last Updated:** January 28, 2026
**Geode Version:** **GEODE_TAG**+
**GQL Compliance:** ISO/IEC 39075:2024
