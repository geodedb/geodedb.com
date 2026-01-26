---
title: "Query Profiling with EXPLAIN and PROFILE"
description: "Master query profiling and optimization using EXPLAIN and PROFILE commands in Geode to analyze execution plans and identify performance bottlenecks."
summary: "Complete guide to using EXPLAIN and PROFILE commands for query analysis, performance profiling, and optimization in Geode graph database."
slug: "explain-profile"
url: "/docs/query/explain-profile/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 30
keywords: ["query profiling", "EXPLAIN", "PROFILE", "execution plan", "query optimization", "performance analysis", "graph database tuning"]
tags: ["query-optimization", "performance", "profiling"]
categories: ["Query"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/query/explain-profile/"
    noindex: false
---

<!-- CANARY: REQ=REQ-GQL-024; FEATURE="Conformance Flagger"; ASPECT=ImplDefinedCollationAndNullOrdering; STATUS=TESTED; OWNER=engine; UPDATED=2025-09-21 -->

## Overview

Geode provides two powerful commands for understanding and optimizing query execution: **EXPLAIN** and **PROFILE**. These tools are essential for query optimization, performance tuning, and understanding how Geode processes your graph queries.

### What You'll Learn

- How to use EXPLAIN to view execution plans without running queries
- How to use PROFILE to measure actual query performance
- Understanding execution plan operators and their meaning
- Identifying performance bottlenecks using profiling metrics
- Best practices for query optimization based on analysis results

### Prerequisites

- Geode server running (see [Installation Guide](/docs/get-started/install/))
- Basic familiarity with [GQL syntax](/docs/gql/guide/)
- Understanding of [graph data models](/docs/model/data-model-and-types/)

---

## EXPLAIN Command

The **EXPLAIN** command displays the query execution plan without actually executing the query. This is useful for understanding how Geode will process a query before committing to the execution.

### Basic Syntax

```gql
EXPLAIN <statement>
```

### How It Works

When you prefix a query with `EXPLAIN`, Geode:
1. Parses the query to build an Abstract Syntax Tree (AST)
2. Generates a logical execution plan
3. Returns a textual representation of the plan
4. **Does not execute** the query or access data

This makes EXPLAIN a zero-cost operation perfect for exploring query strategies.

---

## EXPLAIN Examples

### Simple MATCH Query

```gql
EXPLAIN MATCH (p:Person) RETURN p.name
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

**Interpretation:**
- `NodeScan`: Scans all nodes with the `Person` label
- `Project`: Selects and transforms `p.name` for the RETURN clause

### MATCH with WHERE Clause

```gql
EXPLAIN MATCH (p:Person)
WHERE p.age > 25
RETURN p.name, p.age
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
- `Filter`: Applies the `WHERE p.age > 25` predicate to filter results

### Relationship Traversal

```gql
EXPLAIN MATCH (p:Person)-[:WORKS_FOR]->(c:Company)
RETURN p.name, c.name
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
- `ExpandRelationships`: Traverses `WORKS_FOR` relationships from `Person` nodes

### Complex Query with Aggregation

```gql
EXPLAIN MATCH (p:Person)-[:WORKS_FOR]->(c:Company)
WHERE p.age > 25
RETURN c.name, count(p) AS employee_count
ORDER BY employee_count DESC
LIMIT 10
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

**Additional Operators:**
- `Aggregate`: Groups by `c.name` and computes `count(p)`
- `Sort`: Orders results by `employee_count DESC`
- `Limit`: Restricts output to 10 rows

---

## Understanding Execution Plan Operators

### Core Operators

| Operator | Description | When Used |
|----------|-------------|-----------|
| **NodeScan** | Scans all nodes (or nodes matching a label) | Every MATCH clause |
| **ExpandRelationships** | Traverses relationships from source nodes | Relationship patterns `()-[]->()` |
| **Filter** | Applies WHERE clause predicates | Queries with WHERE conditions |
| **Project** | Selects and transforms columns for RETURN | All queries with RETURN |
| **Sort** | Orders results | Queries with ORDER BY |
| **Limit** | Restricts output rows | Queries with LIMIT |
| **Aggregate** | Groups and aggregates data | Aggregation functions (COUNT, SUM, etc.) |

### Data Modification Operators

| Operator | Description | Statement Type |
|----------|-------------|----------------|
| **CreateNodes** | Creates new nodes | CREATE |
| **CreateRelationships** | Creates new relationships | CREATE |
| **DeleteNodes** | Deletes nodes | DELETE, DETACH DELETE |
| **ExecuteStatement** | Generic execution wrapper | MERGE, SET, REMOVE |

---

## EXPLAIN for Different Statement Types

### CREATE Statement

```gql
EXPLAIN CREATE (p:Person {name: 'Alice', age: 30})
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
WHERE p.temp = true
DELETE p
```

**Output:**
```
| plan                    |
|-------------------------|
| EXPLAIN                 |
| DELETE                  |
|   DeleteNodes           |
```

### MERGE Statement

```gql
EXPLAIN MERGE (p:Person {email: 'user@example.com'})
ON CREATE SET p.created = datetime()
ON MATCH SET p.accessed = now()
```

**Output:**
```
| plan                    |
|-------------------------|
| EXPLAIN                 |
| ExecuteStatement        |
```

**Note:** MERGE operations show `ExecuteStatement` as they combine MATCH, CREATE, and SET logic.

---

## PROFILE Command

The **PROFILE** command executes a query and returns execution statistics. Unlike EXPLAIN, PROFILE actually runs the query and provides real metrics about the execution.

### Basic Syntax

```gql
PROFILE <statement>
```

### How It Works

When you prefix a query with `PROFILE`, Geode:
1. Executes the query normally
2. Collects execution metrics (rows returned, execution time, column count)
3. Returns statistics as a result set
4. **Does execute** the query (results are generated but not returned)

---

## PROFILE Examples

### Simple Query Profiling

```gql
PROFILE MATCH (p:Person) RETURN p.name
```

**Output:**
```
| metric              | value |
|---------------------|-------|
| rows_returned       | 42    |
| columns             | 1     |
| execution_time_ms   | 1     |
```

**Metrics Explained:**
- `rows_returned`: Number of rows returned by the query (42 Person nodes)
- `columns`: Number of columns in the result set (1: `p.name`)
- `execution_time_ms`: Execution time in milliseconds (placeholder in current implementation)

### Profiling with Aggregation

```gql
PROFILE MATCH (p:Person)
RETURN count(p) AS person_count
```

**Output:**
```
| metric              | value |
|---------------------|-------|
| rows_returned       | 1     |
| columns             | 1     |
| execution_time_ms   | 1     |
```

**Observation:** Aggregation queries return a single row with the aggregated value.

### Profiling Complex Queries

```gql
PROFILE MATCH (p:Person)-[:WORKS_FOR]->(c:Company)
WHERE c.industry = 'Technology'
RETURN p.name, c.name
```

**Output:**
```
| metric              | value |
|---------------------|-------|
| rows_returned       | 156   |
| columns             | 2     |
| execution_time_ms   | 1     |
```

**Metrics:**
- `rows_returned`: 156 Person-Company pairs in the Technology industry
- `columns`: 2 (`p.name`, `c.name`)

### Profiling Empty Results

```gql
PROFILE MATCH (p:NonExistent) RETURN p
```

**Output:**
```
| metric              | value |
|---------------------|-------|
| rows_returned       | 0     |
| columns             | 1     |
| execution_time_ms   | 1     |
```

**Note:** Zero rows returned but column structure is still defined.

---

## Performance Analysis Workflow

### Step 1: Understand the Plan with EXPLAIN

Before running an expensive query, use EXPLAIN to understand the execution strategy:

```gql
EXPLAIN MATCH (p:Person)-[:KNOWS*1..3]->(friend:Person)
WHERE p.age > 30
RETURN friend.name
ORDER BY friend.name
LIMIT 100
```

**Analysis Questions:**
- Are indexes being used? (Look for index scan operators)
- Is filtering applied early? (`Filter` should appear after `NodeScan`)
- Are expensive operations (like variable-length paths) necessary?

### Step 2: Measure Performance with PROFILE

Execute the query with PROFILE to gather real metrics:

```gql
PROFILE MATCH (p:Person)-[:KNOWS*1..3]->(friend:Person)
WHERE p.age > 30
RETURN friend.name
ORDER BY friend.name
LIMIT 100
```

**Metrics to Check:**
- `rows_returned`: Validate the result set size
- `execution_time_ms`: Measure actual execution time (future enhancement)

### Step 3: Compare Approaches

Test different query formulations and compare their performance:

**Approach 1: Filter in WHERE**
```gql
PROFILE MATCH (p:Person)
WHERE p.age > 30
RETURN p.name
```

**Approach 2: Filter with Label Test**
```gql
PROFILE MATCH (n)
WHERE n:Person AND n.age > 30
RETURN n.name
```

**Compare `rows_returned` and adjust based on results.**

---

## Common Optimization Patterns

### Pattern 1: Index Selection Verification

**Problem:** Unsure if an index is being used.

**Solution:** Use EXPLAIN to check for index scan operators (future enhancement).

```gql
-- Without index
EXPLAIN MATCH (p:Person {email: 'user@example.com'}) RETURN p

-- After creating index
-- CREATE INDEX ON :Person(email)
EXPLAIN MATCH (p:Person {email: 'user@example.com'}) RETURN p
```

**Expected Change:** Look for `IndexScan` instead of `NodeScan` (future enhancement).

### Pattern 2: Filter Ordering

**Problem:** Expensive filters applied too late.

**Solution:** Ensure filters appear early in the execution plan.

```gql
EXPLAIN MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 25 AND f.age > 25
RETURN p.name, f.name
```

**Good Plan:** `Filter` appears right after `NodeScan` before `ExpandRelationships`.

### Pattern 3: Pagination Impact

**Problem:** Expensive ORDER BY with large result sets.

**Solution:** Use LIMIT to reduce the cost of sorting.

```gql
-- Expensive: Sort all results
PROFILE MATCH (p:Person)
RETURN p.name
ORDER BY p.name

-- Efficient: Sort only top 100
PROFILE MATCH (p:Person)
RETURN p.name
ORDER BY p.name
LIMIT 100
```

**Comparison:** Second query should return the same columns but with fewer `rows_returned` if the table has more than 100 rows.

---

## Implementation Details

### Parser Implementation

Both EXPLAIN and PROFILE are parsed as top-level statements that wrap another statement:

```zig
// From parser.zig:2554-2572
fn parseExplainStatement(self: *Parser) ParserError!ast.Statement {
    _ = try self.expect(.EXPLAIN);
    const query_stmt_ptr = try self.arena.allocator().create(ast.Statement);
    query_stmt_ptr.* = try self.parseStatement();
    return .{ .Explain = .{ .query = query_stmt_ptr } };
}

fn parseProfileStatement(self: *Parser) ParserError!ast.Statement {
    _ = try self.expect(.PROFILE);
    const query_stmt_ptr = try self.arena.allocator().create(ast.Statement);
    query_stmt_ptr.* = try self.parseStatement();
    return .{ .Profile = .{ .query = query_stmt_ptr } };
}
```

### AST Structures

```zig
// From ast.zig:46-47
pub const Statement = union(enum) {
    // ... other statements ...
    Explain: ExplainStatement,
    Profile: ProfileStatement,
    // ... other statements ...
};

pub const ExplainStatement = struct {
    query: *Statement,
};

pub const ProfileStatement = struct {
    query: *Statement,
};
```

### Execution Logic

**EXPLAIN Execution** (`execution.zig:863-940`):
- Analyzes the wrapped statement structure
- Generates a plan description based on query type
- Returns plan as a result set with a single `plan` column

**PROFILE Execution** (`execution.zig:942-988`):
- Executes the wrapped query using `executeStatementWithContext`
- Collects metrics (rows returned, column count)
- Returns statistics as a result set with `metric` and `value` columns

---

## Use Cases

### Use Case 1: Query Optimization

**Scenario:** Optimize a slow query before deploying to production.

```gql
-- Step 1: Understand execution plan
EXPLAIN MATCH (p:Person)-[:WORKS_FOR]->(c:Company)
WHERE c.name = 'Acme Corp'
RETURN p.name

-- Step 2: Check if index would help
-- CREATE INDEX ON :Company(name)

-- Step 3: Re-check plan
EXPLAIN MATCH (p:Person)-[:WORKS_FOR]->(c:Company)
WHERE c.name = 'Acme Corp'
RETURN p.name

-- Step 4: Measure improvement
PROFILE MATCH (p:Person)-[:WORKS_FOR]->(c:Company)
WHERE c.name = 'Acme Corp'
RETURN p.name
```

### Use Case 2: Understanding Behavior

**Scenario:** Understand how Geode processes a complex path query.

```gql
EXPLAIN MATCH (p:Person)
WHERE p.age > 30 OR p.department = 'Engineering'
RETURN p.name, p.age
ORDER BY p.age DESC
LIMIT 50
```

**Analysis:**
- Check that `Filter` is applied before expensive operations
- Verify `Sort` and `Limit` operators are present
- Understand the logical flow: Scan → Filter → Project → Sort → Limit

### Use Case 3: Performance Tuning

**Scenario:** Identify which part of a query is slow.

```gql
-- Measure overall performance
PROFILE MATCH (a:Person)-[:KNOWS]->(b:Person)-[:KNOWS]->(c:Person)
WHERE a.name = 'Alice'
RETURN c.name

-- Check execution plan
EXPLAIN MATCH (a:Person)-[:KNOWS]->(b:Person)-[:KNOWS]->(c:Person)
WHERE a.name = 'Alice'
RETURN c.name
```

**Optimization Strategy:**
- If `rows_returned` is very high, consider adding more WHERE clauses
- If multiple `ExpandRelationships` operators are expensive, consider indexing relationships

---

## Best Practices

### When to Use EXPLAIN

✅ **Use EXPLAIN when:**
- Developing new queries and want to understand the execution strategy
- Verifying that indexes are being used (when index operators are available)
- Comparing different query formulations before choosing one
- Learning how Geode processes different query patterns
- Checking query plans for queries that will run frequently

❌ **Don't use EXPLAIN when:**
- You need actual performance metrics (use PROFILE instead)
- You need to see actual query results (run the query normally)

### When to Use PROFILE

✅ **Use PROFILE when:**
- Measuring actual query performance
- Validating optimization changes (before/after comparison)
- Identifying slow queries in development
- Understanding result set sizes before running expensive queries
- Testing pagination and limit strategies

❌ **Don't use PROFILE when:**
- You want to avoid executing the query (use EXPLAIN instead)
- Running queries with side effects (CREATE, DELETE, SET)—results will be committed

### Combining Both Commands

**Best Practice:** Use EXPLAIN first, then PROFILE.

```gql
-- 1. Understand the plan
EXPLAIN MATCH (p:Person) WHERE p.age > 30 RETURN p.name

-- 2. Measure performance
PROFILE MATCH (p:Person) WHERE p.age > 30 RETURN p.name

-- 3. Run the actual query
MATCH (p:Person) WHERE p.age > 30 RETURN p.name
```

---

## Current Limitations

### EXPLAIN Limitations

1. **Simplified Plans**: Shows logical operators but not detailed cost estimates
2. **No Index Information**: Plans don't currently show which indexes are used
3. **No Row Estimates**: No estimated row counts per operator
4. **Limited Detail**: No per-operator statistics or memory usage

### PROFILE Limitations

1. **Placeholder Timing**: `execution_time_ms` is currently a placeholder (always returns 1)
2. **No Operator Breakdown**: Doesn't show per-operator metrics
3. **No Memory Usage**: Memory consumption not tracked
4. **Limited Metrics**: Only rows, columns, and execution time (placeholder)

---

## Future Enhancements

### Planned Improvements

**EXPLAIN Enhancements:**
- **Cost-Based Plans**: Include estimated costs and row counts per operator
- **Index Usage**: Show which indexes are being used in the plan
- **Visual Plans**: Tree or graph visualization of query plans
- **Warnings**: Detect and warn about potential performance issues (e.g., missing indexes)
- **Comparison Mode**: Compare plans for different query formulations side-by-side

**PROFILE Enhancements:**
- **Actual Timing**: Real execution time measurements with high precision
- **Per-Operator Stats**: Detailed metrics for each operator (rows processed, time spent)
- **Memory Profiling**: Track memory allocation and usage during execution
- **Cache Statistics**: Show index and data cache hit/miss ratios
- **I/O Metrics**: Track disk reads and writes during query execution

### Example Future PROFILE Output

```
| operator              | rows  | time_ms | memory_kb |
|-----------------------|-------|---------|-----------|
| NodeScan              | 1000  | 5       | 120       |
| Filter                | 500   | 2       | 80        |
| ExpandRelationships   | 2000  | 15      | 300       |
| Project               | 2000  | 1       | 50        |
| Sort                  | 2000  | 10      | 400       |
| Limit                 | 100   | 0       | 10        |
| **TOTAL**             | 100   | 33      | 960       |
```

---

## Troubleshooting

### EXPLAIN Returns Empty Plan

**Problem:** EXPLAIN shows minimal or unexpected output.

**Solutions:**
- Verify the query syntax is correct (EXPLAIN won't show errors, it analyzes the parsed AST)
- Check that the statement type is supported (some statements may show `ExecuteStatement`)
- Ensure the query is not too complex (deeply nested queries may show simplified plans)

### PROFILE Shows Zero Rows

**Problem:** PROFILE returns `rows_returned: 0` when you expect results.

**Solutions:**
- Verify the query would actually return results (run it normally without PROFILE)
- Check WHERE clause conditions are correct
- Ensure nodes/relationships exist in the database
- Verify label names and property keys are spelled correctly

### Execution Time Always Shows 1ms

**Issue:** The `execution_time_ms` metric currently returns a placeholder value (1).

**Workaround:** Use external timing for now:
```bash
time geode query "MATCH (p:Person) RETURN count(p)"
```

**Future:** Real timing will be implemented in a future release.

---

## Quick Reference

### EXPLAIN Command

| Purpose | Show execution plan without running query |
|---------|-------------------------------------------|
| Syntax | `EXPLAIN <statement>` |
| Executes Query | ❌ No |
| Returns | Execution plan operators |
| Use For | Understanding query strategy, comparing approaches |

### PROFILE Command

| Purpose | Execute query and return performance metrics |
|---------|----------------------------------------------|
| Syntax | `PROFILE <statement>` |
| Executes Query | ✅ Yes |
| Returns | Metrics (rows, columns, time) |
| Use For | Measuring performance, validating optimizations |

### Common Operators

- **NodeScan**: Scan nodes in graph
- **ExpandRelationships**: Traverse relationships
- **Filter**: Apply WHERE predicates
- **Project**: Select RETURN columns
- **Sort**: Order results
- **Limit**: Restrict row count
- **Aggregate**: Group and aggregate

---

## Practice Exercises

### Exercise 1: Basic EXPLAIN

**Task:** Use EXPLAIN to understand how Geode processes a simple query.

```gql
EXPLAIN MATCH (p:Person) WHERE p.age > 25 RETURN p.name, p.email
```

**Questions:**
1. What operators are used?
2. Where does the `Filter` operator appear?
3. What does the `Project` operator select?

### Exercise 2: PROFILE Comparison

**Task:** Compare performance of two query formulations.

**Query 1:**
```gql
PROFILE MATCH (p:Person) WHERE p.age > 30 RETURN count(p)
```

**Query 2:**
```gql
PROFILE MATCH (p:Person) RETURN count(CASE WHEN p.age > 30 THEN 1 ELSE null END)
```

**Compare `rows_returned` and `columns`.**

### Exercise 3: Optimization

**Task:** Optimize a query using EXPLAIN and PROFILE.

**Initial Query:**
```gql
MATCH (p:Person)-[:WORKS_FOR]->(c:Company)
WHERE c.industry = 'Finance'
RETURN p.name, c.name
ORDER BY p.name
```

**Steps:**
1. Use EXPLAIN to see the plan
2. Identify potential improvements (add index on `c.industry`?)
3. Use PROFILE to measure initial performance
4. Apply optimizations
5. Use PROFILE to measure improved performance

---

## Next Steps

- **[Query Performance Tuning](/docs/query/performance-tuning/)** - Detailed optimization strategies
- **[Indexing Guide](/docs/query/indexing-and-optimization/)** - Create and optimize indexes
- **[GQL Query Language](/docs/gql/guide/)** - Master GQL syntax
- **[Troubleshooting Guide](/docs/guides/troubleshooting/)** - Solve common query issues

---

## Related Documentation

- [Session Management](/docs/security/session-management/) - Query execution contexts
- [Transaction Management](/docs/transactions/overview/) - ACID guarantees and isolation
- [GQL Compliance](/docs/gql/conformance-profile/) - ISO/IEC 39075:2024 standard support
- [Graph Algorithms](/docs/analytics/graph-algorithms/) - Built-in algorithm performance

---

**Last Updated:** January 24, 2026
**Geode Version:** v0.18.0+
**ISO GQL Compliance:** 100% (70/70 tests passing)
