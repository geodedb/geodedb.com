---
title: "Aggregation Functions in GQL"
description: "Master GQL aggregation functions including COUNT, SUM, AVG, MIN, MAX, and COLLECT for computing summaries, statistical analysis, and data transformation in Geode graph database."
keywords:
  - aggregation
  - COUNT
  - SUM
  - AVG
  - MIN
  - MAX
  - COLLECT
  - GQL
  - Geode
  - aggregate functions
  - graph analytics
  - data summarization
  - grouping
  - statistical functions
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/aggregation/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Aggregation Functions in GQL

Aggregation functions are essential tools for analyzing and summarizing graph data in Geode. They allow you to compute statistical values, count occurrences, collect items into lists, and derive meaningful insights from your graph queries. Geode implements the full set of aggregation functions defined in the ISO/IEC 39075:2024 GQL standard.

## Introduction to Aggregation

Aggregation functions operate on sets of values and return a single computed result. In graph databases, aggregations are particularly powerful because they can summarize data across complex relationship patterns, enabling analytics that would be difficult or impossible with traditional relational approaches.

**Key characteristics of GQL aggregations**:

- **Implicit Grouping**: When aggregation functions are used with non-aggregated expressions, GQL automatically groups by the non-aggregated values
- **NULL Handling**: Most aggregation functions ignore NULL values (except COUNT(*))
- **Type Safety**: Functions enforce appropriate input types and return predictable result types
- **Performance**: Geode optimizes aggregation operations to minimize memory usage and maximize throughput

## Core Aggregation Functions

### COUNT: Counting Elements

The COUNT function is the most commonly used aggregation, counting the number of rows or non-NULL values.

**Basic Syntax**:
```gql
-- Count all matched rows
COUNT(*)

-- Count non-NULL values
COUNT(expression)

-- Count distinct values
COUNT(DISTINCT expression)
```

**Example: Counting Nodes and Relationships**:
```gql
-- Count all users in the database
MATCH (u:User)
RETURN COUNT(*) AS total_users;

-- Count users with email addresses
MATCH (u:User)
RETURN COUNT(u.email) AS users_with_email;

-- Count unique countries
MATCH (u:User)
RETURN COUNT(DISTINCT u.country) AS unique_countries;
```

**Example: Counting Relationships**:
```gql
-- Count followers per user
MATCH (u:User)<-[:FOLLOWS]-(follower)
RETURN u.name, COUNT(follower) AS follower_count
ORDER BY follower_count DESC
LIMIT 10;

-- Count mutual connections
MATCH (a:User {name: 'Alice'})-[:FRIEND]-(mutual)-[:FRIEND]-(b:User {name: 'Bob'})
RETURN COUNT(DISTINCT mutual) AS mutual_friends;
```

**Example: Conditional Counting**:
```gql
-- Count with conditions using CASE
MATCH (p:Product)
RETURN
    COUNT(*) AS total_products,
    COUNT(CASE WHEN p.price > 100 THEN 1 END) AS premium_products,
    COUNT(CASE WHEN p.in_stock THEN 1 END) AS available_products;
```

### SUM: Calculating Totals

The SUM function calculates the total of numeric values.

**Basic Syntax**:
```gql
SUM(numeric_expression)
SUM(DISTINCT numeric_expression)
```

**Example: Summing Values**:
```gql
-- Calculate total revenue
MATCH (o:Order)-[:CONTAINS]->(i:OrderItem)
RETURN SUM(i.quantity * i.price) AS total_revenue;

-- Sum by category
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
RETURN c.name, SUM(p.price) AS category_value
ORDER BY category_value DESC;
```

**Example: Summing with Grouping**:
```gql
-- Monthly sales totals
MATCH (o:Order)
WHERE o.date >= date('2025-01-01') AND o.date < date('2026-01-01')
RETURN
    o.date.year AS year,
    o.date.month AS month,
    SUM(o.total) AS monthly_revenue
ORDER BY year, month;
```

**Example: Running Totals with WITH**:
```gql
-- Calculate customer lifetime value
MATCH (c:Customer)-[:PLACED]->(o:Order)
WITH c, SUM(o.total) AS lifetime_value
WHERE lifetime_value > 1000
RETURN c.name, lifetime_value
ORDER BY lifetime_value DESC;
```

### AVG: Computing Averages

The AVG function calculates the arithmetic mean of numeric values.

**Basic Syntax**:
```gql
AVG(numeric_expression)
AVG(DISTINCT numeric_expression)
```

**Example: Basic Averages**:
```gql
-- Average product price
MATCH (p:Product)
RETURN AVG(p.price) AS average_price;

-- Average rating per product
MATCH (p:Product)<-[r:RATED]-(u:User)
RETURN p.name, AVG(r.score) AS avg_rating, COUNT(r) AS review_count
ORDER BY avg_rating DESC;
```

**Example: Weighted Averages**:
```gql
-- Weighted average rating (by number of helpful votes)
MATCH (p:Product)<-[r:REVIEWED]-(u:User)
WITH p, SUM(r.rating * r.helpful_votes) AS weighted_sum, SUM(r.helpful_votes) AS total_votes
WHERE total_votes > 0
RETURN p.name, weighted_sum / total_votes AS weighted_avg_rating
ORDER BY weighted_avg_rating DESC;
```

**Example: Comparing to Average**:
```gql
-- Find products priced above average
MATCH (p:Product)
WITH AVG(p.price) AS avg_price
MATCH (p:Product)
WHERE p.price > avg_price
RETURN p.name, p.price, avg_price
ORDER BY p.price DESC;
```

### MIN and MAX: Finding Extremes

MIN and MAX functions find the smallest and largest values respectively.

**Basic Syntax**:
```gql
MIN(expression)
MAX(expression)
```

**Example: Finding Extreme Values**:
```gql
-- Price range
MATCH (p:Product)
RETURN MIN(p.price) AS lowest_price, MAX(p.price) AS highest_price;

-- Date ranges
MATCH (e:Event)
RETURN MIN(e.date) AS first_event, MAX(e.date) AS last_event;
```

**Example: Min/Max with Grouping**:
```gql
-- Price range by category
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
RETURN
    c.name,
    MIN(p.price) AS min_price,
    MAX(p.price) AS max_price,
    MAX(p.price) - MIN(p.price) AS price_spread
ORDER BY price_spread DESC;
```

**Example: Finding Records with Min/Max Values**:
```gql
-- Find the most expensive product
MATCH (p:Product)
WITH MAX(p.price) AS max_price
MATCH (p:Product)
WHERE p.price = max_price
RETURN p.name, p.price;

-- More efficient using ORDER BY
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.price DESC
LIMIT 1;
```

### COLLECT: Building Lists

The COLLECT function aggregates values into a list, preserving individual elements.

**Basic Syntax**:
```gql
COLLECT(expression)
COLLECT(DISTINCT expression)
```

**Example: Collecting Related Entities**:
```gql
-- Collect all products purchased by a user
MATCH (u:User {name: 'Alice'})-[:PURCHASED]->(p:Product)
RETURN u.name, COLLECT(p.name) AS purchased_products;

-- Collect with distinct
MATCH (u:User)-[:PURCHASED]->(p:Product)-[:IN_CATEGORY]->(c:Category)
RETURN u.name, COLLECT(DISTINCT c.name) AS categories_shopped;
```

**Example: Collecting Complex Structures**:
```gql
-- Collect maps of product details
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name, COLLECT({
    name: p.name,
    price: p.price,
    category: p.category
}) AS purchase_details;
```

**Example: Using COLLECT with Other Aggregations**:
```gql
-- Summary with collected details
MATCH (c:Customer)-[:PLACED]->(o:Order)-[:CONTAINS]->(p:Product)
RETURN
    c.name,
    COUNT(DISTINCT o) AS order_count,
    SUM(o.total) AS total_spent,
    COLLECT(DISTINCT p.name) AS products_purchased;
```

## Advanced Aggregation Patterns

### Aggregation with WITH Clause

The WITH clause enables multi-stage aggregations and filtering on aggregated results.

```gql
-- Find users with above-average purchase counts
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH u, COUNT(p) AS purchase_count
WITH AVG(purchase_count) AS avg_purchases
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH u, COUNT(p) AS purchase_count, avg_purchases
WHERE purchase_count > avg_purchases
RETURN u.name, purchase_count, avg_purchases
ORDER BY purchase_count DESC;
```

### Nested Aggregations

Combine aggregations across different grouping levels.

```gql
-- Average order size per customer, then average across all customers
MATCH (c:Customer)-[:PLACED]->(o:Order)
WITH c, AVG(o.item_count) AS avg_order_size
RETURN AVG(avg_order_size) AS overall_avg_order_size;
```

### Conditional Aggregation

Use CASE expressions within aggregations for conditional calculations.

```gql
-- Segment analysis
MATCH (c:Customer)-[:PLACED]->(o:Order)
RETURN
    SUM(CASE WHEN o.total < 50 THEN 1 ELSE 0 END) AS small_orders,
    SUM(CASE WHEN o.total >= 50 AND o.total < 200 THEN 1 ELSE 0 END) AS medium_orders,
    SUM(CASE WHEN o.total >= 200 THEN 1 ELSE 0 END) AS large_orders,
    AVG(CASE WHEN c.is_premium THEN o.total END) AS avg_premium_order,
    AVG(CASE WHEN NOT c.is_premium THEN o.total END) AS avg_standard_order;
```

### Aggregation Over Paths

Aggregate values along traversed paths.

```gql
-- Sum weights along shortest paths
MATCH path = shortestPath((a:City {name: 'NYC'})-[:CONNECTED_TO*]-(b:City {name: 'LA'}))
WITH path, [r IN relationships(path) | r.distance] AS distances
RETURN
    [n IN nodes(path) | n.name] AS route,
    REDUCE(total = 0, d IN distances | total + d) AS total_distance;
```

### Grouping Sets

Perform aggregations at multiple grouping levels simultaneously.

```gql
-- Multi-level summary
MATCH (s:Sale)-[:OF_PRODUCT]->(p:Product)-[:IN_CATEGORY]->(c:Category)
WITH c.name AS category, p.name AS product, SUM(s.amount) AS sales
RETURN category, product, sales
UNION ALL
MATCH (s:Sale)-[:OF_PRODUCT]->(p:Product)-[:IN_CATEGORY]->(c:Category)
WITH c.name AS category, SUM(s.amount) AS sales
RETURN category, NULL AS product, sales
UNION ALL
MATCH (s:Sale)
RETURN NULL AS category, NULL AS product, SUM(s.amount) AS sales;
```

## Best Practices

### Performance Optimization

1. **Filter Before Aggregating**: Apply WHERE clauses before aggregation to reduce the data set
```gql
-- Good: Filter first
MATCH (o:Order)
WHERE o.date >= date('2025-01-01')
RETURN COUNT(*) AS recent_orders;

-- Avoid: Aggregating then filtering (when possible)
```

2. **Use Indexes for Grouping Keys**: Ensure properties used in implicit grouping are indexed
```gql
CREATE INDEX category_name ON Category(name);

MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
RETURN c.name, COUNT(p);  -- Uses index for grouping
```

3. **Limit COLLECT Size**: When collecting large datasets, consider limiting results
```gql
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH u, COLLECT(p.name)[0..10] AS recent_products
RETURN u.name, recent_products;
```

4. **Avoid Redundant Aggregations**: Compute aggregations once and reuse with WITH
```gql
-- Good: Compute once
MATCH (p:Product)
WITH AVG(p.price) AS avg, STDEV(p.price) AS stddev
MATCH (p:Product)
WHERE p.price > avg + 2 * stddev
RETURN p.name AS outlier;
```

### NULL Handling

1. **COUNT(*) vs COUNT(expression)**: Use COUNT(*) to count rows including NULLs
```gql
-- Count all users
MATCH (u:User)
RETURN COUNT(*) AS all_users, COUNT(u.email) AS users_with_email;
```

2. **COALESCE for Default Values**: Handle NULLs in calculations
```gql
MATCH (p:Product)
RETURN AVG(COALESCE(p.discount, 0)) AS avg_discount;
```

### Readability and Maintenance

1. **Use Meaningful Aliases**: Name aggregated columns descriptively
```gql
RETURN
    COUNT(*) AS total_transactions,
    SUM(amount) AS gross_revenue,
    AVG(amount) AS average_transaction_value;
```

2. **Break Complex Aggregations into Steps**: Use WITH for clarity
```gql
-- Multi-step aggregation
MATCH (c:Customer)-[:PLACED]->(o:Order)
WITH c, COUNT(o) AS order_count, SUM(o.total) AS total_spent
WITH c, order_count, total_spent, total_spent / order_count AS avg_order_value
WHERE avg_order_value > 100
RETURN c.name, order_count, total_spent, avg_order_value;
```

## Related Topics

- **[GQL Reference](/tags/gql-reference/)**: Complete GQL language reference
- **[WITH Clause](/tags/with/)**: Query chaining and intermediate results
- **[RETURN Clause](/tags/return/)**: Specifying query output
- **[WHERE Clause](/tags/where/)**: Filtering results
- **[Query Optimization](/tags/query-optimization/)**: Performance tuning
- **[Analytics](/tags/analytics/)**: Graph analytics and algorithms
- **[Functions](/tags/functions/)**: GQL built-in functions

## Further Reading

- **Aggregation Tutorial**: `/docs/gql-tutorial/aggregations/`
- **Analytics Guide**: `/docs/analytics/overview/`
- **Query Performance**: `/docs/performance/query-optimization/`
- **GQL Specification**: `/docs/gql-reference/specification/`
- **Functions Reference**: `/docs/gql-reference/functions/`
