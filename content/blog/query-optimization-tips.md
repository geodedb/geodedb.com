---
title: "10 Query Optimization Tips for Geode"
description: "Practical tips to make your GQL queries faster and more efficient"
date: 2024-02-01
author: "Performance Team"
tags: ["performance", "optimization", "tutorial"]
categories: ["blog", "guides"]
---

# 10 Query Optimization Tips for Geode

Query performance can make or break your application. Here are 10 practical tips to optimize your GQL queries in Geode, complete with examples and explanations.

## 1. Use Indexes Wisely

**Problem**: Full scans of all nodes
```gql
// Slow: scans all Person nodes
MATCH (p:Person)
WHERE p.email = "alice@example.com"
RETURN p
```

**Solution**: Create an index
```gql
// Create index
CREATE INDEX person_email ON :Person(email)

// Now this is fast
MATCH (p:Person)
WHERE p.email = "alice@example.com"
RETURN p
```

**Why it works**: The index allows direct lookup instead of scanning every Person node.

**Benchmark**:
- Without index: 500ms (1M nodes)
- With index: 2ms (1M nodes)

## 2. Filter Early with WHERE

**Problem**: Filtering after expensive operations
```gql
// Slow: traverses everything then filters
MATCH (p:Person)-[:KNOWS*1..3]-(friend)
WITH p, friend
WHERE p.country = "USA"
RETURN p.name, count(friend)
```

**Solution**: Filter as early as possible
```gql
// Fast: filters first, then traverses
MATCH (p:Person)
WHERE p.country = "USA"
MATCH (p)-[:KNOWS*1..3]-(friend)
RETURN p.name, count(friend)
```

**Why it works**: Reducing the initial set before expensive operations saves computation.

**Rule**: Apply WHERE clauses immediately after the MATCH that introduces the variables.

## 3. Limit Variable-Length Paths

**Problem**: Unbounded traversals
```gql
// Slow: could traverse entire graph
MATCH path = (start:Person)-[:KNOWS*]-(end:Person)
RETURN path
```

**Solution**: Specify reasonable bounds
```gql
// Fast: limited to 3 hops
MATCH path = (start:Person)-[:KNOWS*1..3]-(end:Person)
RETURN path
```

**Why it works**: Limiting path length prevents exponential growth in traversals.

**Guidelines**:
- Social networks: 1-3 hops is usually sufficient
- Organizational hierarchies: 5-7 hops
- Always specify upper bound

## 4. Use LIMIT for Large Results

**Problem**: Returning huge result sets
```gql
// Slow: returns millions of rows
MATCH (p:Person)
RETURN p
```

**Solution**: Add LIMIT
```gql
// Fast: returns only what you need
MATCH (p:Person)
RETURN p
LIMIT 100
```

**Why it works**: The query engine can short-circuit once the limit is reached.

**Best Practice**: Always use LIMIT in production queries unless you truly need all results.

## 5. Optimize Aggregations

**Problem**: Aggregating after unnecessary operations
```gql
// Slow: creates full cartesian product first
MATCH (p:Person)
MATCH (c:Company)
WHERE (p)-[:WORKS_AT]->(c)
RETURN p.department, count(p)
```

**Solution**: Use relationship pattern directly
```gql
// Fast: follows relationship efficiently
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN p.department, count(p)
GROUP BY p.department
```

**Why it works**: Pattern matching is optimized, cartesian products are not.

## 6. Use WITH for Pipeline Optimization

**Problem**: Computing values multiple times
```gql
// Slow: computes length multiple times
MATCH (p:Person)-[:KNOWS*1..3]-(friend)
WHERE length((p)-[:KNOWS*1..3]-(friend)) > 2
RETURN p.name, length((p)-[:KNOWS*1..3]-(friend))
```

**Solution**: Compute once with WITH
```gql
// Fast: computes length once
MATCH path = (p:Person)-[:KNOWS*1..3]-(friend)
WITH p, friend, length(path) AS path_length
WHERE path_length > 2
RETURN p.name, path_length
```

**Why it works**: WITH creates a pipeline stage, computing values once.

## 7. Avoid Cartesian Products

**Problem**: Multiple independent MATCH clauses
```gql
// Slow: creates cartesian product
MATCH (p:Person)
MATCH (c:Company)
RETURN p.name, c.name
```

**Solution**: Connect patterns with relationships
```gql
// Fast: uses relationship
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN p.name, c.name
```

**Why it works**: Connected patterns leverage indexes and relationships.

**Warning**: If you see multiple disconnected MATCH clauses, you're probably creating a cartesian product.

## 8. Choose Specific Relationship Types

**Problem**: Matching all relationship types
```gql
// Slow: checks every relationship type
MATCH (p:Person)-[r]-(other)
WHERE type(r) IN ["KNOWS", "WORKS_WITH"]
RETURN p, other
```

**Solution**: Specify types upfront
```gql
// Fast: only checks specified types
MATCH (p:Person)-[r:KNOWS|WORKS_WITH]-(other)
RETURN p, other
```

**Why it works**: The query planner can use type-specific indexes.

## 9. Use EXISTS for Existence Checks

**Problem**: Counting to check existence
```gql
// Slow: counts all matches
MATCH (p:Person)
WHERE count((p)-[:KNOWS]->()) > 0
RETURN p
```

**Solution**: Use EXISTS
```gql
// Fast: stops at first match
MATCH (p:Person)
WHERE EXISTS((p)-[:KNOWS]->())
RETURN p
```

**Why it works**: EXISTS short-circuits after finding one match.

**Benchmark**:
- COUNT approach: 100ms
- EXISTS approach: 5ms

## 10. Profile Your Queries

**Problem**: Guessing at performance issues
```gql
// You think it's slow, but why?
MATCH (p:Person)-[:KNOWS*2..3]-(friend)
WHERE p.age > 30
RETURN friend.name
```

**Solution**: Use PROFILE
```gql
PROFILE
MATCH (p:Person)-[:KNOWS*2..3]-(friend)
WHERE p.age > 30
RETURN friend.name
```

**Output shows**:
```
┌─────────────────────────────────────────────────┐
│ Operator         │ Rows  │ DB Hits │ Time (ms) │
├─────────────────────────────────────────────────┤
│ ProduceResults   │ 1000  │ 0       │ 2         │
│ Projection       │ 1000  │ 1000    │ 5         │
│ VarLengthExpand  │ 1000  │ 50000   │ 150       │ ← Slow!
│ Filter           │ 100   │ 10000   │ 20        │
│ NodeByLabelScan  │ 10000 │ 10000   │ 30        │
└─────────────────────────────────────────────────┘
```

**Why it works**: PROFILE shows exactly where time is spent.

**Analysis**:
- High DB Hits = missing index
- High Rows = need better filtering
- High Time = computational bottleneck

## Bonus Tips

### Use Compound Indexes

```gql
// For queries with multiple filters
CREATE INDEX person_country_age ON :Person(country, age)

// Now this is fast
MATCH (p:Person)
WHERE p.country = "USA" AND p.age > 30
RETURN p
```

### Batch Operations

```gql
// Slow: 1000 individual queries
// for i in range(1000):
//   CREATE (:Person {id: i})

// Fast: single transaction
BEGIN
  UNWIND range(0, 999) AS i
  CREATE (:Person {id: i})
COMMIT
```

### Use Parameters

```gql
// Slow: reparsing every time
MATCH (p:Person {name: "Alice"}) RETURN p
MATCH (p:Person {name: "Bob"}) RETURN p

// Fast: parsed once, cached plan
MATCH (p:Person {name: $name}) RETURN p
// Execute with different $name values
```

### Denormalize When Appropriate

```gql
// Slow: traversing every time
MATCH (p:Person)-[:LIVES_IN]->(c:City)-[:IN_STATE]->(s:State)
WHERE s.name = "California"
RETURN p

// Fast: denormalized
MATCH (p:Person)
WHERE p.state = "California"
RETURN p
```

## Optimization Checklist

Before deploying a query, check:

- [ ] Are all WHERE filters as early as possible?
- [ ] Do I have indexes for my filter properties?
- [ ] Are variable-length paths bounded?
- [ ] Am I using LIMIT on large result sets?
- [ ] Did I avoid cartesian products?
- [ ] Are relationship types specified?
- [ ] Am I using EXISTS instead of COUNT for existence checks?
- [ ] Have I profiled the query?
- [ ] Are parameters used for repeated queries?
- [ ] Is this the simplest way to express the query?

## Common Anti-Patterns

### Anti-Pattern 1: Multiple Optional Matches

```gql
// Slow
MATCH (p:Person)
OPTIONAL MATCH (p)-[:KNOWS]->(f1)
OPTIONAL MATCH (p)-[:KNOWS]->(f2)
OPTIONAL MATCH (p)-[:KNOWS]->(f3)
RETURN p, f1, f2, f3
```

Better:
```gql
MATCH (p:Person)
OPTIONAL MATCH (p)-[:KNOWS]->(friend)
RETURN p, collect(friend) AS friends
```

### Anti-Pattern 2: Nested Aggregations

```gql
// Slow
MATCH (p:Person)
RETURN p.name,
       count((p)-[:KNOWS]->()),
       count((p)-[:WORKS_WITH]->())
```

Better:
```gql
MATCH (p:Person)
OPTIONAL MATCH (p)-[:KNOWS]->(k)
OPTIONAL MATCH (p)-[:WORKS_WITH]->(w)
RETURN p.name, count(DISTINCT k), count(DISTINCT w)
```

### Anti-Pattern 3: Complex WHERE Expressions

```gql
// Slow
MATCH (p:Person)
WHERE toUpper(p.name) = "ALICE"
  AND substring(p.email, 0, 5) = "alice"
RETURN p
```

Better:
```gql
// Store normalized data
MATCH (p:Person)
WHERE p.name_normalized = "alice"
  AND p.email_prefix = "alice"
RETURN p
```

## Monitoring Performance

### Set Up Metrics

```gql
// Enable query logging
SET geode.log_queries = true
SET geode.log_slow_queries = 100  // ms

// Monitor slow queries
SHOW SLOW QUERIES
```

### Use Explain

```gql
// See query plan without execution
EXPLAIN
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.age > 30
RETURN friend.name
```

### Track Index Usage

```gql
// See which indexes are used
SHOW INDEXES

// See index hit rate
SHOW INDEX STATS
```

## Conclusion

Query optimization is an iterative process:

1. **Write** a correct query
2. **Profile** to find bottlenecks
3. **Optimize** based on data
4. **Test** to verify improvement
5. **Monitor** in production

Remember: "Premature optimization is the root of all evil." Start with correct queries, then optimize the ones that matter.

## Resources

- [GQL Reference](/docs/gql-reference/)
- [Index Strategy Guide](/guides/index-strategy/)
- [Query Profiling Guide](/guides/query-profiling/)
- [Performance Documentation](/docs/performance/)

## Try It Yourself

Download our [performance testing toolkit](https://gitlab.com/devnw/codepros/geode/geode-perf-tools) to benchmark these patterns on your own data.

---

**About the Author**: The Geode Performance Team works on making Geode faster for everyone.

**Questions?** Join the discussion in our [community forum](https://forum.geodedb.com).
