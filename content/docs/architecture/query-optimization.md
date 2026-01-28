---
title: "Query Optimization"
description: "Geode's cost-based query optimizer including index selection, join ordering, predicate pushdown, and adaptive query execution"
keywords: ["query optimization", "cost-based optimizer", "CBO", "index selection", "join ordering", "predicate pushdown"]
weight: 25
slug: "query-optimization"
canonical: "https://geodedb.com/docs/architecture/query-optimization/"
---

<!-- CANARY: REQ=REQ-ENGINE-005; FEATURE="Engine"; ASPECT=CostBasedOptimizer; STATUS=TESTED; OWNER=engine; UPDATED=2026-01-28 -->

# Query Optimization

Geode implements a sophisticated cost-based query optimizer (CBO) that automatically selects efficient execution plans based on data statistics, index availability, and query patterns.

## Overview

The optimizer transforms logical query plans into optimized physical execution plans:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Logical Plan   │────▶│   Optimizer     │────▶│ Physical Plan   │
│                 │     │                 │     │                 │
│ - What to do    │     │ - Statistics    │     │ - How to do it  │
│ - Declarative   │     │ - Cost model    │     │ - Imperative    │
└─────────────────┘     │ - Index info    │     └─────────────────┘
                        └─────────────────┘
```

## Cost Model

### Cost Components

The optimizer considers three primary cost factors:

1. **I/O Cost**: Disk reads and writes
2. **CPU Cost**: Computation overhead
3. **Memory Cost**: Buffer pool utilization

```zig
pub const Cost = struct {
    io_cost: f64,      // Estimated page reads
    cpu_cost: f64,     // Estimated operations
    memory_cost: f64,  // Estimated memory usage

    pub fn total(self: Cost) f64 {
        return self.io_cost * IO_WEIGHT +
               self.cpu_cost * CPU_WEIGHT +
               self.memory_cost * MEMORY_WEIGHT;
    }
};
```

### Cost Estimation

| Operation | Cost Formula |
|-----------|--------------|
| Full Scan | `pages * io_cost + rows * cpu_cost` |
| Index Seek | `log(n) * io_cost + selectivity * rows * cpu_cost` |
| Hash Join | `build_cost + probe_cost + memory_cost` |
| Sort | `n * log(n) * cpu_cost + spill_io_cost` |

## Optimization Strategies

### 1. Predicate Pushdown

Move filters closer to data sources to reduce intermediate result sizes:

```
Before:                         After:
  Filter (age > 30)               Expand (KNOWS)
    │                               │
    └─▶ Expand (KNOWS)              └─▶ Filter (age > 30)
           │                               │
           └─▶ Scan (Person)               └─▶ Scan (Person)
```

**Example**:
```gql
-- Original query
MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30
RETURN f.name

-- Optimized: Filter pushed before expansion
```

### 2. Index Selection

The optimizer automatically selects the most efficient index:

```zig
fn selectBestIndex(
    scan: *ScanOperator,
    available_indexes: []Index,
    stats: *Statistics
) ?Index {
    var best_index: ?Index = null;
    var best_cost = std.math.inf(f64);

    for (available_indexes) |index| {
        if (!index.covers(scan.predicates)) continue;

        const selectivity = estimateSelectivity(scan.predicates, index, stats);
        const cost = estimateIndexCost(index, selectivity, stats);

        if (cost < best_cost) {
            best_cost = cost;
            best_index = index;
        }
    }

    return best_index;
}
```

**Index Selection Rules**:
- Use equality indexes for exact matches
- Use range indexes for comparison predicates
- Consider covering indexes to avoid lookups
- Prefer composite indexes matching multiple predicates

### 3. Join Ordering

Optimal join order minimizes intermediate result sizes:

```
Poor Order:                    Optimal Order:
  Join (1M × 10K = 10B)          Join (10 × 10K = 100K)
    │                              │
    ├─▶ Scan A (1M rows)           ├─▶ Filter (10 rows)
    │                              │      │
    └─▶ Scan B (10K rows)          │      └─▶ Scan A
                                   │
                                   └─▶ Scan B (10K rows)
```

**Join Order Algorithm**:
```zig
fn optimizeJoinOrder(joins: []Join, stats: *Statistics) []Join {
    // Use dynamic programming for small join counts
    if (joins.len <= 6) {
        return dpJoinOrdering(joins, stats);
    }
    // Use greedy heuristic for larger join counts
    return greedyJoinOrdering(joins, stats);
}
```

### 4. Join Type Selection

Choose the optimal join algorithm based on input sizes:

| Join Type | Best For | Cost |
|-----------|----------|------|
| Nested Loop | Small inner, indexed | `O(n)` with index |
| Hash Join | Equality joins, fits memory | `O(n + m)` |
| Merge Join | Pre-sorted inputs | `O(n + m)` |

### 5. Aggregation Pushdown

Push aggregations to reduce data movement:

```
Before:                         After:
  Aggregate (COUNT)               Aggregate (SUM of counts)
    │                               │
    └─▶ Union All                   └─▶ Union All
           │                               │
           ├─▶ Shard 1                     ├─▶ Local COUNT (Shard 1)
           └─▶ Shard 2                     └─▶ Local COUNT (Shard 2)
```

## Statistics Collection

### Automatic Statistics

Geode automatically maintains statistics for optimization:

```yaml
statistics:
  auto_update: true
  update_threshold: 10000  # Update after N modifications
  sample_size: 1000        # Rows sampled for histograms
```

### Statistics Types

| Statistic | Description |
|-----------|-------------|
| Cardinality | Number of rows per label/type |
| Selectivity | Predicate filtering ratio |
| Histogram | Value distribution for range estimation |
| Distinct Count | Number of unique values |

### Manual Statistics Update

```gql
-- Update all statistics
CALL db.stats.update()

-- Update statistics for specific label
CALL db.stats.update('Person')

-- View current statistics
CALL db.stats.show()
```

## Adaptive Query Execution

Geode can adjust execution plans at runtime:

### Runtime Statistics

```zig
pub const RuntimeStats = struct {
    rows_processed: u64,
    actual_selectivity: f64,
    memory_used: usize,

    pub fn shouldReplan(self: RuntimeStats, estimated: Cost) bool {
        const actual_cost = self.computeActualCost();
        return actual_cost > estimated.total() * REPLAN_THRESHOLD;
    }
};
```

### Mid-Query Optimization

When actual cardinalities differ significantly from estimates:
1. Pause execution
2. Re-optimize with actual statistics
3. Resume with new plan

## Query Hints

Override optimizer decisions when needed:

```gql
-- Force specific index
MATCH (p:Person)
USING INDEX p:Person(email)
WHERE p.email = 'alice@example.com'
RETURN p

-- Force join order
MATCH (a:Account)-[:OWNS]->(t:Transaction)
USING JOIN ON a
WHERE a.balance > 10000
RETURN t
```

## EXPLAIN and PROFILE

### EXPLAIN

View the query plan without execution:

```gql
EXPLAIN
MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30
RETURN f.name
```

Output:
```
| plan                          | estimated_rows |
|-------------------------------|----------------|
| Project (f.name)              | 1000           |
|   Expand (KNOWS, OUTGOING)    | 1000           |
|     Filter (p.age > 30)       | 500            |
|       IndexSeek (Person.age)  | 500            |
```

### PROFILE

Execute and show actual statistics:

```gql
PROFILE
MATCH (p:Person)-[:KNOWS]->(f:Person)
WHERE p.age > 30
RETURN f.name
```

Output:
```
| plan                          | rows  | db_hits | time_ms |
|-------------------------------|-------|---------|---------|
| Project (f.name)              | 847   | 847     | 0.5     |
|   Expand (KNOWS, OUTGOING)    | 847   | 1694    | 12.3    |
|     Filter (p.age > 30)       | 423   | 423     | 1.2     |
|       IndexSeek (Person.age)  | 423   | 846     | 3.1     |
| Total                         |       | 3810    | 17.1    |
```

## Best Practices

### 1. Create Appropriate Indexes

```gql
-- Index frequently filtered properties
CREATE INDEX ON :Person(email)
CREATE INDEX ON :Person(age)

-- Composite index for common predicates
CREATE INDEX ON :Transaction(account_id, timestamp)
```

### 2. Write Selective Predicates First

```gql
-- Good: Most selective predicate first
MATCH (p:Person)
WHERE p.email = 'alice@example.com'  -- Unique
  AND p.age > 30                      -- Less selective
RETURN p

-- The optimizer handles this, but it helps readability
```

### 3. Avoid Cartesian Products

```gql
-- Bad: Cartesian product
MATCH (p:Person), (c:Company)
RETURN p.name, c.name

-- Good: Use relationships
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN p.name, c.name
```

### 4. Use LIMIT for Large Results

```gql
-- Always limit result sets
MATCH (p:Person)
RETURN p
ORDER BY p.name
LIMIT 100
```

## Performance Tuning

See also:
- [Performance Tuning Guide](/docs/guides/performance-tuning/)
- [Index Optimization Tutorial](/docs/tutorials/index-optimization/)

## Next Steps

- [Storage Engine](../storage-engine/) - Understand data storage
- [Distributed Systems](../distributed-systems/) - Multi-node query execution
- [Query Execution](../query-execution/) - Execution pipeline details
