---
title: "WITH Clause in GQL"
description: "Master the GQL WITH clause for query chaining, intermediate results, variable scoping, aggregation piping, and multi-stage query construction in Geode graph database."
keywords:
  - WITH
  - query chaining
  - intermediate results
  - variable scoping
  - GQL
  - Geode
  - query pipeline
  - subquery
  - aggregation
  - result transformation
  - query composition
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/with/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# WITH Clause in GQL

The WITH clause is a powerful query composition tool that enables you to chain query parts, pass intermediate results between stages, control variable scope, and build complex multi-step queries. It acts as a pipeline connector, allowing you to transform, filter, and aggregate data as it flows through your query. Geode implements the WITH clause according to the ISO/IEC 39075:2024 GQL standard.

## Introduction to WITH

Think of WITH as a combination of RETURN and a new query start. It defines what variables pass to the next part of the query while filtering out everything else. This enables sophisticated query patterns that would otherwise require multiple separate queries.

**Key characteristics of WITH**:

- **Variable Scoping**: Only explicitly named variables pass through
- **Intermediate Processing**: Transform data between query stages
- **Aggregation Boundary**: Perform aggregations mid-query
- **Filter After Aggregation**: Apply WHERE to aggregated results
- **Query Composition**: Build complex queries from simpler parts

## Basic WITH Usage

### Passing Variables

Control which variables continue to the next query part.

```gql
-- Pass specific variables
MATCH (p:Person)-[:FRIEND]->(friend:Person)
WITH p, friend
MATCH (friend)-[:LIKES]->(movie:Movie)
RETURN p.name, friend.name, movie.title;

-- Filter out intermediate variables
MATCH (a:Author)-[:WROTE]->(b:Book)-[:PUBLISHED_BY]->(pub:Publisher)
WITH a, b  -- pub is not passed
RETURN a.name, b.title;
```

### Variable Aliasing

Rename variables during the transition.

```gql
-- Rename for clarity
MATCH (u:User)
WITH u AS customer
MATCH (customer)-[:PURCHASED]->(p:Product)
RETURN customer.name, p.name;

-- Rename properties
MATCH (p:Person)
WITH p.name AS person_name, p.age AS person_age
WHERE person_age > 21
RETURN person_name, person_age;
```

### Expression Computation

Compute values in the WITH clause.

```gql
-- Calculate intermediate values
MATCH (p:Product)
WITH p, p.price * 1.1 AS price_with_tax
RETURN p.name, p.price, price_with_tax;

-- Complex expressions
MATCH (u:User)-[:POSTED]->(post:Post)
WITH u, count(post) AS post_count, sum(post.likes) AS total_likes
WITH u, post_count, total_likes,
     CASE WHEN post_count > 0 THEN total_likes / post_count ELSE 0 END AS avg_likes
RETURN u.name, post_count, avg_likes;
```

## Aggregation with WITH

### Basic Aggregation

Perform aggregations and continue processing.

```gql
-- Count and continue
MATCH (c:Customer)-[:PURCHASED]->(p:Product)
WITH c, count(p) AS purchase_count
WHERE purchase_count > 5
RETURN c.name, purchase_count
ORDER BY purchase_count DESC;

-- Multiple aggregations
MATCH (d:Department)<-[:WORKS_IN]-(e:Employee)
WITH d,
     count(e) AS employee_count,
     avg(e.salary) AS avg_salary,
     sum(e.salary) AS total_salary
RETURN d.name, employee_count, avg_salary, total_salary;
```

### Aggregation Pipeline

Chain multiple aggregation stages.

```gql
-- Two-stage aggregation
MATCH (c:Category)-[:CONTAINS]->(p:Product)<-[:PURCHASED]-(customer:Customer)
WITH c, p, count(customer) AS times_purchased
WITH c, sum(times_purchased) AS category_sales, count(p) AS product_count
RETURN c.name, category_sales, product_count
ORDER BY category_sales DESC;

-- Aggregate of aggregates
MATCH (u:User)-[:POSTED]->(post:Post)
WITH u, count(post) AS posts_per_user
WITH avg(posts_per_user) AS avg_posts, max(posts_per_user) AS max_posts
RETURN avg_posts, max_posts;
```

### Grouping with WITH

Implicit grouping based on non-aggregated variables.

```gql
-- Group by multiple fields
MATCH (s:Sale)
WITH s.year AS year, s.quarter AS quarter, sum(s.amount) AS quarterly_sales
RETURN year, quarter, quarterly_sales
ORDER BY year, quarter;

-- Group and filter
MATCH (author:Author)-[:WROTE]->(book:Book)
WITH author, count(book) AS book_count
WHERE book_count >= 3
RETURN author.name AS prolific_author, book_count;
```

## Filtering with WITH

### WHERE After WITH

Apply conditions to computed values.

```gql
-- Filter on aggregated result
MATCH (p:Product)<-[:REVIEWED]-(r:Review)
WITH p, avg(r.rating) AS avg_rating, count(r) AS review_count
WHERE avg_rating >= 4.0 AND review_count >= 10
RETURN p.name, avg_rating, review_count;

-- Filter on expression
MATCH (e:Employee)
WITH e, e.salary / 12 AS monthly_salary
WHERE monthly_salary > 5000
RETURN e.name, monthly_salary;
```

### Combining WITH and WHERE

Build progressive filters.

```gql
-- Multi-stage filtering
MATCH (u:User)
WHERE u.active = true                    -- Initial filter
WITH u
WHERE u.verified = true                  -- Second filter
MATCH (u)-[:POSTED]->(p:Post)
WITH u, count(p) AS posts
WHERE posts > 10                         -- Filter on aggregation
RETURN u.name, posts;
```

## Ordering and Pagination

### ORDER BY with WITH

Sort intermediate results.

```gql
-- Sort before limiting
MATCH (p:Product)
WITH p
ORDER BY p.price DESC
LIMIT 10
RETURN p.name, p.price AS top_10_expensive;

-- Sort aggregated results
MATCH (a:Artist)-[:CREATED]->(art:Artwork)
WITH a, count(art) AS artwork_count
ORDER BY artwork_count DESC
LIMIT 5
RETURN a.name, artwork_count;
```

### LIMIT and SKIP

Paginate intermediate results.

```gql
-- Get top N before joining
MATCH (u:User)
WITH u
ORDER BY u.followers DESC
LIMIT 100
MATCH (u)-[:POSTED]->(p:Post)
RETURN u.name, collect(p.title) AS recent_posts;

-- Skip for pagination
MATCH (p:Product)
WITH p
ORDER BY p.created_at DESC
SKIP $offset
LIMIT $limit
RETURN p.name, p.price;
```

### Subquery-like Patterns

Use WITH to create subquery effects.

```gql
-- Top per category
MATCH (c:Category)
WITH c
MATCH (c)-[:CONTAINS]->(p:Product)
WITH c, p
ORDER BY p.price DESC
WITH c, collect(p)[0..3] AS top_products
RETURN c.name, [prod IN top_products | prod.name] AS top_3_products;
```

## Query Composition

### Sequential MATCH Patterns

Connect multiple MATCH operations.

```gql
-- Chain MATCH operations
MATCH (u:User {name: 'Alice'})
WITH u
MATCH (u)-[:FRIEND]->(friend)
WITH u, friend
MATCH (friend)-[:PURCHASED]->(p:Product)
RETURN u.name, friend.name, collect(p.name) AS friend_purchases;

-- Optional chain
MATCH (c:Customer {id: $customer_id})
WITH c
OPTIONAL MATCH (c)-[:PURCHASED]->(p:Product)
WITH c, collect(p) AS purchases
OPTIONAL MATCH (c)-[:WISHLISTED]->(w:Product)
RETURN c.name, purchases, collect(w) AS wishlist;
```

### Branching Queries

Create different paths through the query.

```gql
-- Conditional path
MATCH (u:User {id: $user_id})
WITH u, u.subscription_type AS sub_type
MATCH (u)-[:HAS_ACCESS]->(content:Content)
WHERE CASE sub_type
    WHEN 'premium' THEN true
    WHEN 'basic' THEN content.tier = 'basic'
    ELSE content.tier = 'free'
END
RETURN content.title;
```

### Subquery Simulation

Simulate subqueries with WITH.

```gql
-- Find users with above-average activity
MATCH (u:User)-[:PERFORMED]->(a:Action)
WITH avg(count(a)) AS avg_actions

MATCH (u:User)-[:PERFORMED]->(a:Action)
WITH u, count(a) AS action_count, avg_actions
WHERE action_count > avg_actions
RETURN u.name, action_count;

-- Correct version with proper scoping
MATCH (u:User)-[:PERFORMED]->(a:Action)
WITH u, count(a) AS user_actions
WITH avg(user_actions) AS avg_actions
MATCH (u:User)-[:PERFORMED]->(a:Action)
WITH u, count(a) AS action_count, avg_actions
WHERE action_count > avg_actions
RETURN u.name, action_count;
```

## COLLECT and UNWIND Patterns

### COLLECT with WITH

Aggregate into lists for further processing.

```gql
-- Collect then process
MATCH (u:User)-[:FRIEND]->(friend:User)
WITH u, collect(friend) AS friends
WITH u, friends, size(friends) AS friend_count
WHERE friend_count > 10
RETURN u.name, friend_count;

-- Collect maps
MATCH (o:Order)-[:CONTAINS]->(i:OrderItem)-[:OF_PRODUCT]->(p:Product)
WITH o, collect({product: p.name, qty: i.quantity, price: i.price}) AS items
RETURN o.id, items, null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS order_total;
```

### UNWIND with WITH

Expand collections for further matching.

```gql
-- Unwind and process
MATCH (u:User)
WHERE u.interests IS NOT NULL
WITH u, u.interests AS interests
UNWIND interests AS interest
MATCH (p:Product)
WHERE interest IN p.tags
RETURN u.name, collect(DISTINCT p.name) AS recommended_products;

-- Create from list
WITH ['Alice', 'Bob', 'Charlie'] AS names
UNWIND names AS name
CREATE (p:Person {name: name})
RETURN p;
```

## Variable Scoping

### Scope Isolation

WITH creates a scope boundary.

```gql
-- Variables before WITH are not accessible after
MATCH (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person)
WITH b  -- Only b passes through
MATCH (b)-[:LIKES]->(m:Movie)
-- a is NOT accessible here
RETURN b.name, m.title;
```

### Preserving Variables

Explicitly pass variables you need later.

```gql
-- Pass all needed variables
MATCH (u:User)-[:ORDERED]->(o:Order)
WITH u, o, o.date AS order_date  -- Preserve what you need
WHERE order_date > date('2025-01-01')
MATCH (o)-[:CONTAINS]->(p:Product)
RETURN u.name, order_date, collect(p.name);

-- Using * to pass all (if supported)
MATCH (a:Person)-[r:KNOWS]->(b:Person)
WITH *, type(r) AS rel_type
RETURN a.name, rel_type, b.name;
```

### Introducing New Variables

Add computed variables to scope.

```gql
-- Add calculated values
MATCH (p:Product)
WITH p,
     p.price AS base_price,
     p.price * 0.1 AS tax,
     p.price * 1.1 AS total_price
RETURN p.name, base_price, tax, total_price;

-- Add constants
MATCH (s:Sale)
WITH s, 0.15 AS tax_rate, date() AS today
WITH s, s.amount * tax_rate AS tax, today
RETURN s.id, s.amount, tax;
```

## Advanced Patterns

### Recursive-like Queries

Build iterative processing patterns.

```gql
-- Expand levels iteratively
MATCH (start:Person {name: 'Alice'})
WITH start, [start] AS level0
MATCH (l0)-[:KNOWS]->(l1:Person)
WHERE l0 IN level0 AND NOT l1 IN level0
WITH start, level0, collect(DISTINCT l1) AS level1
MATCH (l1)-[:KNOWS]->(l2:Person)
WHERE l1 IN level1 AND NOT l2 IN level0 + level1
WITH start, level0, level1, collect(DISTINCT l2) AS level2
RETURN
    size(level0) AS degree_0,
    size(level1) AS degree_1,
    size(level2) AS degree_2;
```

### Data Transformation Pipeline

Transform data through multiple stages.

```gql
-- ETL-like transformation
MATCH (raw:RawData)
WITH raw,
     trim(raw.name) AS clean_name,
     toInteger(raw.amount) AS numeric_amount,
     date(raw.date_string) AS parsed_date

WITH clean_name AS name,
     CASE WHEN numeric_amount < 0 THEN 0 ELSE numeric_amount END AS amount,
     parsed_date AS date
WHERE name IS NOT NULL AND date IS NOT NULL

CREATE (clean:CleanData {
    name: name,
    amount: amount,
    date: date,
    imported_at: datetime()
});
```

### Set Operations Simulation

Simulate set operations with WITH.

```gql
-- Intersection: Users who purchased both products
MATCH (u:User)-[:PURCHASED]->(p1:Product {name: 'Widget'})
WITH collect(u) AS widget_buyers
MATCH (u:User)-[:PURCHASED]->(p2:Product {name: 'Gadget'})
WHERE u IN widget_buyers
RETURN u.name AS bought_both;

-- Difference: Widget buyers who didn't buy Gadget
MATCH (u:User)-[:PURCHASED]->(p1:Product {name: 'Widget'})
WITH collect(u) AS widget_buyers
MATCH (u:User)-[:PURCHASED]->(p2:Product {name: 'Gadget'})
WITH widget_buyers, collect(u) AS gadget_buyers
UNWIND widget_buyers AS buyer
WHERE NOT buyer IN gadget_buyers
RETURN buyer.name AS widget_only;
```

## Best Practices

### Performance Considerations

1. **Reduce Data Early**: Filter and limit early in the pipeline

```gql
-- Good: Filter early
MATCH (u:User)
WHERE u.active = true
WITH u
LIMIT 100
MATCH (u)-[:POSTED]->(p:Post)
RETURN u.name, collect(p.title);

-- Avoid: Process all then limit
MATCH (u:User)-[:POSTED]->(p:Post)
WITH u, collect(p.title) AS posts
LIMIT 100
RETURN u.name, posts;
```

2. **Aggregate Appropriately**: Don't over-aggregate

```gql
-- Good: Aggregate what you need
MATCH (u:User)-[:ORDERED]->(o:Order)
WITH u, count(o) AS orders
WHERE orders > 5
RETURN u.name;

-- Avoid: Collecting unnecessarily
MATCH (u:User)-[:ORDERED]->(o:Order)
WITH u, collect(o) AS all_orders
WHERE size(all_orders) > 5
RETURN u.name;
```

3. **Minimize Variables**: Pass only needed variables

```gql
-- Good: Minimal scope
MATCH (a)-[r]->(b)-[s]->(c)
WITH b, c  -- Only pass what's needed
MATCH (c)-[:LINKS]->(d)
RETURN b.name, c.name, d.name;
```

### Readability

1. **Use Meaningful Names**: Clear variable names improve maintainability

```gql
MATCH (c:Customer)-[:PLACED]->(o:Order)
WITH c AS customer, count(o) AS total_orders, sum(o.amount) AS lifetime_value
WHERE lifetime_value > 1000
RETURN customer.name, total_orders, lifetime_value;
```

2. **Document Complex Pipelines**: Add comments for clarity

```gql
-- Step 1: Get active users
MATCH (u:User)
WHERE u.last_active > datetime() - duration('P30D')
WITH u

-- Step 2: Calculate engagement metrics
MATCH (u)-[:POSTED]->(p:Post)
WITH u, count(p) AS posts, sum(p.likes) AS total_likes

-- Step 3: Filter high performers
WHERE posts >= 5 AND total_likes >= 100
RETURN u.name, posts, total_likes;
```

3. **Break Into Stages**: Use WITH to create logical stages

```gql
-- Find, filter, aggregate, return
MATCH (p:Product)
WITH p
WHERE p.active = true

WITH p
ORDER BY p.sales DESC
LIMIT 100

WITH p, p.price * p.sales AS revenue

RETURN p.name, p.sales, revenue
ORDER BY revenue DESC;
```

## Common Patterns

### Top N per Group

```gql
MATCH (c:Category)-[:CONTAINS]->(p:Product)
WITH c, p
ORDER BY p.rating DESC
WITH c, collect(p)[0..5] AS top_products
RETURN c.name, [p IN top_products | p.name] AS best_in_category;
```

### Running Totals

```gql
MATCH (t:Transaction)
WHERE t.account_id = $account_id
WITH t
ORDER BY t.date
WITH collect(t) AS transactions
UNWIND range(0, size(transactions)-1) AS i
WITH transactions[i] AS t, transactions[0..i+1] AS running
RETURN t.date, t.amount, null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS balance;
```

### Pivot-like Transformation

```gql
MATCH (s:Sale)
WITH s.product AS product,
     sum(CASE WHEN s.year = 2023 THEN s.amount ELSE 0 END) AS sales_2023,
     sum(CASE WHEN s.year = 2024 THEN s.amount ELSE 0 END) AS sales_2024,
     sum(CASE WHEN s.year = 2025 THEN s.amount ELSE 0 END) AS sales_2025
RETURN product, sales_2023, sales_2024, sales_2025;
```

## Related Topics

- **[RETURN Clause](/tags/return/)**: Final output projection
- **[WHERE Clause](/tags/where/)**: Filtering conditions
- **[Aggregation](/tags/aggregation/)**: Aggregation functions
- **[MATCH Clause](/tags/match/)**: Pattern matching
- **[UNWIND](/tags/unwind/)**: List expansion
- **[GQL Reference](/tags/gql-reference/)**: Complete GQL language reference
- **[Query Optimization](/tags/query-optimization/)**: Performance tuning

## Further Reading

- **GQL Tutorial - Query Composition**: `/docs/gql-tutorial/query-composition/`
- **Advanced Query Patterns**: `/docs/guides/advanced-patterns/`
- **Performance Guide**: `/docs/performance/query-optimization/`
- **Subqueries Guide**: `/docs/gql-reference/subqueries/`
- **GQL Specification**: `/docs/gql-reference/specification/`
