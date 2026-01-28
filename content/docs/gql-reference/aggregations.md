---
title: "Aggregation Functions"
description: "Complete reference for aggregation functions in GQL including COUNT, SUM, AVG, MIN, MAX, COLLECT, and grouping operations"
summary: "Master GQL aggregation functions with comprehensive coverage of COUNT, SUM, AVG, MIN, MAX, COLLECT, and GROUP BY operations for graph analytics."
slug: "aggregations"
url: "/docs/gql-reference/aggregations/"
date: 2026-01-28
lastmod: 2026-01-28
draft: false
weight: 20
keywords: ["aggregation", "COUNT", "SUM", "AVG", "MIN", "MAX", "COLLECT", "GROUP BY", "GQL aggregation", "graph analytics"]
tags: ["gql", "aggregation", "reference", "analytics"]
categories: ["GQL", "Reference"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/gql-reference/aggregations/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Aggregation Functions

Aggregation functions compute summary values over groups of rows. This reference covers all aggregation functions available in GQL.

## Overview

Aggregation functions:
- Operate on multiple rows to produce single values
- Support implicit grouping (non-aggregated columns become group keys)
- Can use DISTINCT to aggregate unique values
- Handle NULL values according to SQL semantics

## COUNT

Counts rows or non-NULL values.

### Syntax

```gql
count(*)              -- Count all rows
count(expression)     -- Count non-NULL values
count(DISTINCT expr)  -- Count distinct non-NULL values
```

### Examples

```gql
-- Count all nodes
MATCH (n)
RETURN count(*) AS total_nodes;

-- Count nodes with label
MATCH (p:Person)
RETURN count(p) AS person_count;

-- Count non-NULL property values
MATCH (p:Person)
RETURN count(p.email) AS has_email;

-- Count distinct values
MATCH (p:Person)
RETURN count(DISTINCT p.city) AS unique_cities;

-- Count relationships
MATCH ()-[r:KNOWS]->()
RETURN count(r) AS friendship_count;
```

### Grouping with COUNT

```gql
-- Count by group
MATCH (p:Person)
RETURN p.city, count(p) AS population
ORDER BY population DESC;

-- Count relationships per node
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN p.name, count(friend) AS friend_count
ORDER BY friend_count DESC;
```

## SUM

Computes the sum of numeric values.

### Syntax

```gql
sum(expression)           -- Sum of values
sum(DISTINCT expression)  -- Sum of distinct values
```

### Examples

```gql
-- Sum all amounts
MATCH (o:Order)
RETURN sum(o.amount) AS total_revenue;

-- Sum with grouping
MATCH (o:Order)
RETURN o.category, sum(o.amount) AS category_total
ORDER BY category_total DESC;

-- Sum distinct values
MATCH (t:Transaction)
RETURN sum(DISTINCT t.amount) AS unique_amounts_sum;

-- Sum relationship properties
MATCH (c:Customer)-[p:PURCHASED]->(prod:Product)
RETURN c.name, sum(p.quantity * prod.price) AS total_spent;
```

### NULL Handling

```gql
-- NULL values are ignored
MATCH (p:Person)
RETURN sum(p.salary) AS total_salary;
-- If some salaries are NULL, they don't affect the sum

-- All NULLs returns NULL
MATCH (p:Person)
WHERE p.bonus IS NULL
RETURN sum(p.bonus);  -- Returns NULL
```

## AVG

Computes the average (mean) of numeric values.

### Syntax

```gql
avg(expression)           -- Average of values
avg(DISTINCT expression)  -- Average of distinct values
```

### Examples

```gql
-- Average age
MATCH (p:Person)
RETURN avg(p.age) AS average_age;

-- Average by group
MATCH (e:Employee)
RETURN e.department, avg(e.salary) AS avg_salary
ORDER BY avg_salary DESC;

-- Average distinct values
MATCH (r:Review)
RETURN avg(DISTINCT r.rating) AS avg_distinct_rating;

-- Weighted average (manual calculation)
MATCH (p:Product)<-[r:REVIEWED]-(u:User)
RETURN p.name,
       sum(r.rating * r.weight) / sum(r.weight) AS weighted_avg;
```

## MIN

Returns the minimum value.

### Syntax

```gql
min(expression)
```

### Examples

```gql
-- Minimum value
MATCH (p:Product)
RETURN min(p.price) AS cheapest;

-- Minimum by group
MATCH (e:Employee)
RETURN e.department, min(e.hire_date) AS first_hire;

-- Minimum across relationships
MATCH (a:City)-[r:ROAD]->(b:City)
RETURN a.name, b.name, min(r.distance) AS shortest_route;

-- Minimum non-numeric (works on strings, dates)
MATCH (u:User)
RETURN min(u.username) AS first_alphabetically;
```

## MAX

Returns the maximum value.

### Syntax

```gql
max(expression)
```

### Examples

```gql
-- Maximum value
MATCH (o:Order)
RETURN max(o.total) AS largest_order;

-- Maximum by group
MATCH (p:Product)
RETURN p.category, max(p.price) AS most_expensive;

-- Maximum date
MATCH (e:Event)
RETURN max(e.date) AS most_recent;

-- Combine with other aggregations
MATCH (p:Person)
RETURN p.city,
       min(p.age) AS youngest,
       max(p.age) AS oldest,
       avg(p.age) AS average;
```

## COLLECT

Aggregates values into a list.

### Syntax

```gql
collect(expression)           -- Collect all values
collect(DISTINCT expression)  -- Collect distinct values
```

### Examples

```gql
-- Collect names
MATCH (p:Person)
RETURN collect(p.name) AS all_names;

-- Collect by group
MATCH (c:Customer)-[:PURCHASED]->(p:Product)
RETURN c.name, collect(p.name) AS purchased_products;

-- Collect distinct
MATCH (p:Person)
RETURN collect(DISTINCT p.city) AS unique_cities;

-- Collect with ordering (use WITH + ORDER BY first)
MATCH (e:Employee)
WITH e ORDER BY e.hire_date
RETURN collect(e.name) AS employees_by_seniority;
```

### Collect Complex Values

```gql
-- Collect maps
MATCH (p:Person)
RETURN collect({name: p.name, age: p.age}) AS people;

-- Collect nodes
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN p.name, collect(friend) AS friends;

-- Collect relationships
MATCH (a)-[r:KNOWS]->(b)
RETURN collect(r) AS all_friendships;
```

## STDEV and STDEVP

Compute standard deviation.

### Syntax

```gql
stdev(expression)   -- Sample standard deviation
stdevp(expression)  -- Population standard deviation
```

### Examples

```gql
-- Sample standard deviation
MATCH (p:Product)
RETURN stdev(p.price) AS price_stdev;

-- Population standard deviation
MATCH (s:Score)
RETURN stdevp(s.value) AS score_stdevp;

-- With grouping
MATCH (e:Employee)
RETURN e.department,
       avg(e.salary) AS mean,
       stdev(e.salary) AS std_dev;
```

## Implicit Grouping

Non-aggregated columns in RETURN become group keys (like SQL GROUP BY).

### How It Works

```gql
-- city is the grouping key
MATCH (p:Person)
RETURN p.city, count(p) AS count;

-- Multiple grouping keys
MATCH (e:Employee)
RETURN e.department, e.role, count(e) AS count;
```

### Explicit GROUP BY (Optional)

GQL supports explicit GROUP BY for clarity:

```gql
MATCH (p:Person)
RETURN p.city, count(p) AS population
GROUP BY p.city
ORDER BY population DESC;
```

## WITH for Multi-Stage Aggregation

Use WITH to perform aggregations in stages.

### Two-Stage Aggregation

```gql
-- First aggregate per product, then per category
MATCH (p:Product)<-[:CONTAINS]-(o:Order)
WITH p, count(o) AS sales
WITH p.category AS category,
     count(p) AS product_count,
     sum(sales) AS total_sales
RETURN category, product_count, total_sales
ORDER BY total_sales DESC;
```

### Filter Aggregated Results

```gql
-- HAVING equivalent
MATCH (c:Customer)-[:PURCHASED]->(p:Product)
WITH c, count(p) AS purchase_count
WHERE purchase_count >= 5
RETURN c.name, purchase_count;
```

### Aggregate Then Match

```gql
-- Find top customers, then get their orders
MATCH (c:Customer)-[:PURCHASED]->(p)
WITH c, count(p) AS purchases
ORDER BY purchases DESC
LIMIT 10
MATCH (c)-[:PLACED]->(o:Order)
RETURN c.name, purchases, collect(o.id) AS order_ids;
```

## Aggregation with CASE

Conditional aggregation using CASE expressions.

### Conditional Count

```gql
MATCH (o:Order)
RETURN
    count(CASE WHEN o.status = 'completed' THEN 1 END) AS completed,
    count(CASE WHEN o.status = 'pending' THEN 1 END) AS pending,
    count(CASE WHEN o.status = 'cancelled' THEN 1 END) AS cancelled;
```

### Conditional Sum

```gql
MATCH (t:Transaction)
RETURN
    sum(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END) AS credits,
    sum(CASE WHEN t.type = 'debit' THEN t.amount ELSE 0 END) AS debits;
```

## NULL Handling in Aggregations

### General Rules

- `count(*)` counts all rows, including those with NULL values
- `count(expr)` counts rows where expr is not NULL
- `sum`, `avg`, `min`, `max` ignore NULL values
- If all values are NULL, numeric aggregations return NULL
- `collect` includes NULL values in the list

### Examples

```gql
-- Demonstrate NULL handling
MATCH (p:Person)
RETURN
    count(*) AS total_rows,
    count(p.email) AS has_email,
    avg(p.salary) AS avg_salary;  -- Ignores NULL salaries
```

## DISTINCT in Aggregations

Use DISTINCT to aggregate only unique values.

```gql
-- Count unique values
MATCH (o:Order)
RETURN count(DISTINCT o.customer_id) AS unique_customers;

-- Sum distinct (unusual but valid)
MATCH (t:Transaction)
RETURN sum(DISTINCT t.fee) AS unique_fee_sum;

-- Collect distinct
MATCH (p:Person)
RETURN collect(DISTINCT p.city) AS cities;
```

## Aggregation Over Paths

Aggregate values from variable-length paths.

### Using REDUCE

```gql
-- Sum values along path
MATCH path = (a)-[rels:TRANSFER*1..5]->(b)
RETURN a.name, b.name,
       reduce(total = 0, r IN rels | total + r.amount) AS path_sum;
```

### Aggregate Path Properties

```gql
-- Path with relationship aggregation
MATCH path = (start)-[r:ROUTE*]->(end)
RETURN start.name, end.name,
       length(path) AS hops,
       reduce(dist = 0, rel IN r | dist + rel.distance) AS total_distance;
```

## Performance Considerations

### Efficient Aggregation

1. **Filter before aggregating**
   ```gql
   -- Good: Filter first
   MATCH (o:Order)
   WHERE o.date > date('2026-01-01')
   RETURN o.category, count(o);

   -- Less efficient: Aggregate then filter
   MATCH (o:Order)
   WITH o.category AS cat, count(o) AS cnt
   WHERE cnt > 100
   RETURN cat, cnt;
   ```

2. **Use indexes for grouping keys**
   ```gql
   -- Create index on grouping column
   CREATE INDEX order_category ON Order(category);

   MATCH (o:Order)
   RETURN o.category, count(o);
   ```

3. **Limit result set**
   ```gql
   -- Get top N
   MATCH (p:Product)<-[:PURCHASED]-(c:Customer)
   RETURN p.name, count(c) AS purchases
   ORDER BY purchases DESC
   LIMIT 10;
   ```

### Memory Usage

Large aggregations can consume significant memory:

```gql
-- collect() stores all values in memory
MATCH (n:Node)
RETURN collect(n.data);  -- May be large!

-- Consider pagination instead
MATCH (n:Node)
RETURN n.data
LIMIT 1000;
```

## Common Aggregation Patterns

### Top N by Count

```gql
MATCH (p:Product)<-[:PURCHASED]-(c:Customer)
RETURN p.name, count(c) AS sales
ORDER BY sales DESC
LIMIT 10;
```

### Percentile (Approximate)

```gql
-- Get median (50th percentile)
MATCH (p:Product)
WITH p ORDER BY p.price
WITH collect(p.price) AS prices
RETURN prices[size(prices)/2] AS median;
```

### Running Totals (with collect)

```gql
MATCH (o:Order)
WITH o ORDER BY o.date
WITH collect({date: o.date, amount: o.amount}) AS orders
UNWIND range(0, size(orders)-1) AS i
RETURN orders[i].date,
       reduce(sum = 0, j IN range(0, i) | sum + orders[j].amount) AS running_total;
```

### Pivot-Style Results

```gql
MATCH (s:Sale)
RETURN s.product,
       sum(CASE WHEN s.quarter = 'Q1' THEN s.amount ELSE 0 END) AS Q1,
       sum(CASE WHEN s.quarter = 'Q2' THEN s.amount ELSE 0 END) AS Q2,
       sum(CASE WHEN s.quarter = 'Q3' THEN s.amount ELSE 0 END) AS Q3,
       sum(CASE WHEN s.quarter = 'Q4' THEN s.amount ELSE 0 END) AS Q4;
```

### Histogram/Buckets

```gql
MATCH (p:Person)
RETURN
    CASE
        WHEN p.age < 20 THEN '0-19'
        WHEN p.age < 40 THEN '20-39'
        WHEN p.age < 60 THEN '40-59'
        ELSE '60+'
    END AS age_group,
    count(p) AS count
ORDER BY age_group;
```

## Aggregation Function Reference

| Function | Description | NULL Handling |
|----------|-------------|---------------|
| `count(*)` | Count all rows | Includes NULLs |
| `count(expr)` | Count non-NULL values | Ignores NULLs |
| `sum(expr)` | Sum of values | Ignores NULLs |
| `avg(expr)` | Average of values | Ignores NULLs |
| `min(expr)` | Minimum value | Ignores NULLs |
| `max(expr)` | Maximum value | Ignores NULLs |
| `collect(expr)` | Collect into list | Includes NULLs |
| `stdev(expr)` | Sample std dev | Ignores NULLs |
| `stdevp(expr)` | Population std dev | Ignores NULLs |

## Related Documentation

- **[GQL Quick Reference](/docs/quick-reference/)** - Quick syntax lookup
- **[Pattern Matching](/docs/gql-reference/pattern-matching/)** - Pattern syntax
- **[GQL Tutorial](/docs/gql-tutorial/)** - Learn GQL step by step
- **[Query Performance Tuning](/docs/query/performance-tuning/)** - Optimization
- **[Real-Time Analytics](/docs/analytics/real-time-analytics/)** - Analytics patterns

---

**Last Updated:** January 28, 2026
**Geode Version:** v0.18.0+
**GQL Compliance:** ISO/IEC 39075:2024
