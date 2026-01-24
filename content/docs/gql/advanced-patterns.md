---
title: "Advanced GQL Query Patterns"
description: "Master advanced GQL patterns including VALUES clause, MATCH chaining, subqueries, and complex query composition for sophisticated graph database operations."
summary: "Learn advanced GQL techniques with VALUES-MATCH chaining, complex pattern matching, query composition, and best practices for enterprise graph queries."
slug: "advanced-patterns"
url: "/docs/gql/advanced-patterns/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 350
keywords: ["VALUES clause", "MATCH chaining", "advanced GQL", "query patterns", "subqueries", "query composition", "graph patterns"]
tags: ["gql", "advanced", "patterns", "query"]
categories: ["GQL"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/gql/advanced-patterns/"
    noindex: false
---

## Overview

This guide covers advanced GQL query patterns that enable sophisticated graph database operations beyond basic MATCH queries. Learn how to chain VALUES with MATCH, compose complex patterns, and build enterprise-grade graph queries.

### What You'll Learn

- VALUES → MATCH chaining for parameterized queries
- Complex pattern matching techniques
- Subquery composition and optimization
- Query rewriting patterns
- Best practices for performance

## VALUES Clause Fundamentals

### What is VALUES?

The VALUES clause constructs a table of literal values that can be used as input for subsequent query clauses. Think of it as an inline table constructor.

**Basic Syntax**:
```gql
VALUES (expression AS alias [, ...])
[, (expression AS alias [, ...])]
```

### Simple VALUES Query

```gql
-- Single row
VALUES (1 AS x, 'Alice' AS name)

-- Output:
-- | x | name  |
-- |---|-------|
-- | 1 | Alice |
```

**Multiple Rows**:
```gql
VALUES
  (1 AS id, 'Alice' AS name),
  (2 AS id, 'Bob' AS name),
  (3 AS id, 'Carol' AS name)

-- Output:
-- | id | name  |
-- |----|-------|
-- |  1 | Alice |
-- |  2 | Bob   |
-- |  3 | Carol |
```

## VALUES → MATCH Chaining

### Basic Chaining

**Concept**: Use VALUES to generate parameters, then feed them into MATCH for pattern matching.

```gql
VALUES (1 AS search_id)
MATCH (n:Person {id: search_id})
RETURN n.name, search_id

-- How it works:
-- 1. VALUES creates binding: search_id = 1
-- 2. MATCH uses search_id in pattern
-- 3. Results include both matched node and VALUES binding
```

**Multiple Search Terms**:
```gql
VALUES
  (1 AS user_id),
  (2 AS user_id),
  (5 AS user_id)
MATCH (u:User {id: user_id})
RETURN u.name, u.email, user_id
```

### VALUES in WHERE Clauses

**Threshold-Based Filtering**:
```gql
VALUES (10 AS min_price, 100 AS max_price)
MATCH (p:Product)
WHERE p.price >= min_price AND p.price <= max_price
RETURN p.name, p.price
ORDER BY p.price
```

**Date Range Queries**:
```gql
VALUES (
  datetime('2026-01-01') AS start_date,
  datetime('2026-12-31') AS end_date
)
MATCH (o:Order)
WHERE o.created_date >= start_date
  AND o.created_date <= end_date
RETURN count(o) AS order_count
```

### VALUES with Complex Expressions

```gql
VALUES (
  1 + 1 AS computed_id,
  'test' + '_suffix' AS label,
  datetime().subtract(P7D) AS week_ago
)
MATCH (n:Node)
WHERE n.count = computed_id
  AND n.label = label
  AND n.updated_at > week_ago
RETURN n
```

## Multi-Row VALUES → MATCH

### Cartesian Product Behavior

When VALUES returns multiple rows, MATCH executes once per row, creating a cartesian product:

```gql
VALUES
  (1 AS id),
  (2 AS id),
  (3 AS id)
MATCH (u:User {id: id})
RETURN u.name, id

-- Execution:
-- Row 1: MATCH (u:User {id: 1}) → Returns User #1
-- Row 2: MATCH (u:User {id: 2}) → Returns User #2
-- Row 3: MATCH (u:User {id: 3}) → Returns User #3
-- Final result: 3 rows (one per VALUES row)
```

### IN Clause Alternative

**VALUES Pattern** (recommended for complex queries):
```gql
VALUES
  ('Alice' AS name),
  ('Bob' AS name),
  ('Carol' AS name)
MATCH (u:User {name: name})
RETURN u.email
```

**IN Clause Pattern** (simpler for lists):
```gql
MATCH (u:User)
WHERE u.name IN ['Alice', 'Bob', 'Carol']
RETURN u.email
```

**When to Use Each**:
- **VALUES**: Complex expressions, multiple columns, need cartesian product
- **IN**: Simple list membership, single column

## Advanced Pattern Matching

### Multi-Hop Path Patterns

**Variable-Length Relationships**:
```gql
-- Find all paths up to 3 hops
MATCH p = (start:Person {name: 'Alice'})-[:KNOWS*1..3]->(end:Person)
RETURN start.name, end.name, length(p) AS hops
ORDER BY hops
```

**Shortest Path**:
```gql
-- Find shortest path between two people
MATCH p = shortestPath(
  (alice:Person {name: 'Alice'})-[:KNOWS*]-(bob:Person {name: 'Bob'})
)
RETURN [node IN nodes(p) | node.name] AS path_names,
       length(p) AS distance
```

### Multiple Pattern Clauses

**Independent Patterns** (cartesian product):
```gql
MATCH (a:Person {name: 'Alice'})
MATCH (b:Person {name: 'Bob'})
RETURN a.email, b.email

-- Returns: 1 row (Alice, Bob)
```

**Dependent Patterns** (chained):
```gql
MATCH (a:Person {name: 'Alice'})
MATCH (a)-[:KNOWS]->(friend)
RETURN a.name, collect(friend.name) AS friends
```

### Optional Patterns

**OPTIONAL MATCH**:
```gql
MATCH (u:User)
OPTIONAL MATCH (u)-[:HAS_ORDER]->(o:Order)
RETURN u.name, count(o) AS order_count

-- Users without orders return count = 0
```

**Multiple OPTIONAL**:
```gql
MATCH (u:User)
OPTIONAL MATCH (u)-[:PLACED]->(o:Order)
OPTIONAL MATCH (u)-[:REVIEWED]->(r:Review)
RETURN u.name,
       count(DISTINCT o) AS orders,
       count(DISTINCT r) AS reviews
```

## Query Composition Patterns

### WITH Clause for Pipeline Stages

**Basic Pipeline**:
```gql
-- Stage 1: Filter users
MATCH (u:User)
WHERE u.created_date > datetime().subtract(P30D)
WITH u

-- Stage 2: Get their orders
MATCH (u)-[:PLACED]->(o:Order)
WITH u, count(o) AS order_count

-- Stage 3: Filter by order count
WHERE order_count > 5
RETURN u.name, order_count
```

**Aggregation Pipeline**:
```gql
MATCH (p:Product)<-[:CONTAINS]-(o:Order)
WITH p, count(o) AS sale_count, sum(o.quantity) AS total_sold
WHERE sale_count > 100
WITH p, sale_count, total_sold
ORDER BY total_sold DESC
LIMIT 10
RETURN p.name, sale_count, total_sold
```

### Subquery Patterns

**Correlated Subqueries** (future GQL feature):
```gql
-- Future: Subquery in WHERE
MATCH (u:User)
WHERE EXISTS {
  MATCH (u)-[:PLACED]->(o:Order)
  WHERE o.total > 1000
}
RETURN u.name
```

**Current Workaround** (WITH clause):
```gql
MATCH (u:User)
OPTIONAL MATCH (u)-[:PLACED]->(o:Order)
WHERE o.total > 1000
WITH u, count(o) AS high_value_orders
WHERE high_value_orders > 0
RETURN u.name
```

## Complex Filtering Patterns

### Boolean Logic Composition

**AND/OR Combinations**:
```gql
MATCH (p:Product)
WHERE (p.category = 'Electronics' AND p.price < 500)
   OR (p.category = 'Books' AND p.rating > 4.5)
RETURN p.name, p.category, p.price
```

**NOT Patterns**:
```gql
-- Find users without orders
MATCH (u:User)
WHERE NOT EXISTS {
  MATCH (u)-[:PLACED]->(o:Order)
}
RETURN u.name
```

### Range Queries

**Numeric Ranges**:
```gql
MATCH (p:Product)
WHERE p.price BETWEEN 50 AND 150
RETURN p.name, p.price
```

**Date Ranges**:
```gql
MATCH (e:Event)
WHERE e.date >= datetime('2026-01-01')
  AND e.date < datetime('2027-01-01')
RETURN e.title, e.date
```

## Aggregation Patterns

### GROUP BY (Implicit)

```gql
-- Group by category, aggregate sales
MATCH (p:Product)<-[:CONTAINS]-(o:Order)
RETURN p.category,
       count(o) AS order_count,
       sum(o.quantity) AS total_sold,
       avg(p.price) AS avg_price
```

### Multiple Aggregation Levels

```gql
-- Aggregate per product, then per category
MATCH (p:Product)<-[:CONTAINS]-(o:Order)
WITH p.category AS category, p, count(o) AS product_sales
WITH category,
     count(p) AS product_count,
     sum(product_sales) AS category_sales,
     avg(product_sales) AS avg_per_product
RETURN category, product_count, category_sales, avg_per_product
ORDER BY category_sales DESC
```

### COLLECT for List Aggregation

```gql
-- Collect related items
MATCH (u:User)-[:PLACED]->(o:Order)
RETURN u.name,
       collect(o.id) AS order_ids,
       collect(o.total) AS order_totals,
       sum(o.total) AS lifetime_value
```

## Performance Optimization Patterns

### Index-Friendly Patterns

**Use Indexed Properties**:
```gql
-- ✅ Good: Uses index on User.email
MATCH (u:User {email: 'alice@example.com'})
RETURN u

-- ❌ Bad: Full node scan
MATCH (u:User)
WHERE u.email = 'alice@example.com'
RETURN u
```

**Label + Property Pattern**:
```gql
-- ✅ Optimal: Label filter + indexed property
MATCH (u:User)
WHERE u.email = 'alice@example.com'
RETURN u

-- Index: CREATE INDEX user_email_idx ON User (email)
```

### Early Filtering

**Filter Before Expansion**:
```gql
-- ✅ Good: Filter first, then expand
MATCH (u:User)
WHERE u.active = true
MATCH (u)-[:PLACED]->(o:Order)
RETURN u.name, count(o)

-- ❌ Bad: Expand all, then filter
MATCH (u:User)-[:PLACED]->(o:Order)
WHERE u.active = true
RETURN u.name, count(o)
```

### LIMIT Pushdown

```gql
-- ✅ Good: Limit early
MATCH (p:Product)
WHERE p.in_stock = true
RETURN p.name
ORDER BY p.price
LIMIT 10

-- Query optimizer pushes LIMIT to scan
```

## Error Handling Patterns

### NULL Handling

**COALESCE for Defaults**:
```gql
MATCH (u:User)
RETURN u.name,
       coalesce(u.phone, 'No phone') AS phone,
       coalesce(u.age, 0) AS age
```

**Null-Safe Navigation**:
```gql
MATCH (u:User)
OPTIONAL MATCH (u)-[:HAS_ADDRESS]->(a:Address)
RETURN u.name,
       CASE WHEN a IS NOT NULL THEN a.city ELSE 'Unknown' END AS city
```

### CASE Expressions

**Conditional Logic**:
```gql
MATCH (u:User)
RETURN u.name,
       CASE
         WHEN u.order_count > 100 THEN 'VIP'
         WHEN u.order_count > 50 THEN 'Premium'
         WHEN u.order_count > 10 THEN 'Regular'
         ELSE 'New'
       END AS tier
```

## Real-World Examples

### User Segmentation

```gql
-- Segment users by lifetime value
MATCH (u:User)-[:PLACED]->(o:Order)
WITH u, sum(o.total) AS ltv, count(o) AS order_count
RETURN CASE
         WHEN ltv > 10000 THEN 'Diamond'
         WHEN ltv > 5000 THEN 'Platinum'
         WHEN ltv > 1000 THEN 'Gold'
         ELSE 'Silver'
       END AS segment,
       count(u) AS user_count,
       avg(ltv) AS avg_ltv,
       avg(order_count) AS avg_orders
```

### Recommendation Engine

```gql
-- Find similar products based on co-purchases
MATCH (target:Product {id: 123})<-[:CONTAINS]-(o1:Order)-[:CONTAINS]->(other:Product)
WHERE other.id <> target.id
MATCH (other)<-[:CONTAINS]-(o2:Order)
WITH other, count(DISTINCT o1) AS co_purchase_count, count(DISTINCT o2) AS popularity
RETURN other.name,
       co_purchase_count,
       popularity,
       co_purchase_count * 1.0 / popularity AS relevance_score
ORDER BY relevance_score DESC
LIMIT 10
```

### Fraud Detection

```gql
-- Find suspicious patterns
VALUES (datetime().subtract(PT1H) AS recent_time)
MATCH (u:User)-[:PLACED]->(o:Order)
WHERE o.created_date > recent_time
WITH u, count(o) AS recent_orders, sum(o.total) AS recent_spend
WHERE recent_orders > 10 OR recent_spend > 10000
MATCH (u)-[:HAS_PAYMENT]->(pm:PaymentMethod)
RETURN u.email,
       recent_orders,
       recent_spend,
       collect(pm.type) AS payment_methods
ORDER BY recent_spend DESC
```

## Best Practices

### Query Readability

1. **Use Meaningful Aliases**:
   ```gql
   -- ✅ Good
   MATCH (customer:User)-[:PLACED]->(order:Order)

   -- ❌ Bad
   MATCH (n)-[r]->(m)
   ```

2. **Break Complex Queries into Stages**:
   ```gql
   -- ✅ Good: Clear stages with WITH
   MATCH (u:User)
   WITH u, u.created_date AS join_date
   WHERE join_date > datetime().subtract(P30D)
   WITH u
   MATCH (u)-[:PLACED]->(o:Order)
   RETURN u.name, count(o)
   ```

3. **Comment Complex Logic**:
   ```gql
   -- Find high-value customers from last quarter
   MATCH (u:User)-[:PLACED]->(o:Order)
   WHERE o.created_date >= startOfQuarter()
   WITH u, sum(o.total) AS quarterly_spend
   WHERE quarterly_spend > 5000  -- VIP threshold
   RETURN u.email, quarterly_spend
   ```

### Performance

1. **Use EXPLAIN to Validate**:
   ```gql
   EXPLAIN MATCH (u:User {email: 'alice@example.com'})
   RETURN u
   -- Verify index usage
   ```

2. **Avoid Cartesian Products**:
   ```gql
   -- ❌ Bad: Unintended cartesian
   MATCH (u:User)
   MATCH (p:Product)
   RETURN u, p

   -- ✅ Good: Explicit relationship
   MATCH (u:User)-[:PURCHASED]->(p:Product)
   RETURN u, p
   ```

3. **Limit Result Sets**:
   ```gql
   -- Always use LIMIT for large result sets
   MATCH (n)
   RETURN n
   LIMIT 1000
   ```

## Troubleshooting

### Common Issues

**Issue**: VALUES bindings not visible in MATCH

**Solution**: Verify VALUES comes before MATCH in query order
```gql
-- ✅ Correct order
VALUES (1 AS x)
MATCH (n {id: x})

-- ❌ Wrong order
MATCH (n {id: x})
VALUES (1 AS x)  -- Too late!
```

---

**Issue**: Unexpected cartesian product

**Solution**: Add explicit relationship patterns
```gql
-- Instead of:
MATCH (a:Person), (b:Person)

-- Use:
MATCH (a:Person)-[:KNOWS]-(b:Person)
```

---

**Issue**: Poor performance with complex patterns

**Solution**: Use PROFILE to identify bottlenecks
```gql
PROFILE MATCH (a)-[:REL1]->(b)-[:REL2]->(c)
WHERE a.prop = 'value'
RETURN c
```

## References

### Specifications

- **ISO/IEC 39075:2024**: GQL Standard
  - VALUES clause specification
  - Query composition rules

### Code Location

- **Parser**: `src/gql/parser.zig`
- **Execution**: `src/execution.zig`
- **Spec**: `docs/VALUES_MATCH_CHAINING_SPEC.md`

## Next Steps

**For New Users**:
- [GQL Guide](/docs/gql/guide/) - Basic query syntax
- [Query Optimization](/docs/query/performance-tuning/) - Performance tuning
- [Data Model](/docs/model/data-model-and-types/) - Graph fundamentals

**For Advanced Users**:
- [Full-Text Search](/docs/query/full-text-search/) - Text search patterns
- [Materialized Views](/docs/query/materialized-views/) - Pre-computed queries
- [Real-Time Analytics](/docs/analytics/real-time-analytics/) - Streaming patterns

**For Developers**:
- [Testing](/docs/guides/testing-strategies/) - Query testing
- [API Reference](/docs/reference/api-reference-complete/) - Complete GQL reference
- [Client Libraries](/docs/client-libraries/go-client/) - Client integration

---

**Document Version**: 1.0
**Last Updated**: January 24, 2026
**Status**: Production Ready
**GQL Compliance**: ISO/IEC 39075:2024
**CANARY**: REQ-GQL-VALUES-MATCH-001 (TESTED)
