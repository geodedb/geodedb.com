---
title: "RETURN Clause in GQL"
description: "Master the GQL RETURN clause for specifying query output, projections, aliasing, ordering, and result formatting in Geode graph database."
keywords:
  - RETURN
  - query results
  - projections
  - GQL
  - output
  - Geode
  - aliases
  - ORDER BY
  - LIMIT
  - SKIP
  - DISTINCT
  - result formatting
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/return/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# RETURN Clause in GQL

The RETURN clause specifies what data your GQL query produces as output. It defines which variables, properties, expressions, and aggregations appear in the result set. Understanding RETURN is essential for crafting effective queries that deliver precisely the data your application needs. Geode implements the RETURN clause according to the ISO/IEC 39075:2024 GQL standard.

## Introduction to RETURN

Every read query in GQL must end with a RETURN clause (or use a writing clause like CREATE). The RETURN clause acts as the projection layer, determining which columns appear in your result and how they are formatted.

**Key characteristics of RETURN**:

- **Projection**: Select specific properties or entire elements
- **Aliasing**: Rename columns with AS for clarity
- **Expressions**: Return computed values and transformations
- **Ordering**: Control result order with ORDER BY
- **Pagination**: Limit results with SKIP and LIMIT
- **Deduplication**: Remove duplicates with DISTINCT
- **Aggregation**: Combine with aggregation functions

## Basic RETURN Syntax

### Returning Nodes and Relationships

Return complete graph elements with all their properties.

```gql
-- Return all properties of matched nodes
MATCH (p:Person)
RETURN p;

-- Return relationship
MATCH (a:Person)-[r:KNOWS]->(b:Person)
RETURN r;

-- Return multiple elements
MATCH (a:Person)-[r:KNOWS]->(b:Person)
RETURN a, r, b;
```

### Returning Specific Properties

Select individual properties instead of entire nodes.

```gql
-- Return single property
MATCH (p:Person)
RETURN p.name;

-- Return multiple properties
MATCH (p:Person)
RETURN p.name, p.age, p.email;

-- Return properties from multiple nodes
MATCH (a:Person)-[:FRIEND]->(b:Person)
RETURN a.name, b.name;
```

### Using Aliases

Rename columns for clarity and to resolve naming conflicts.

```gql
-- Simple alias
MATCH (p:Person)
RETURN p.name AS person_name;

-- Descriptive aliases
MATCH (e:Employee)-[:WORKS_IN]->(d:Department)
RETURN
    e.name AS employee_name,
    e.title AS job_title,
    d.name AS department_name;

-- Resolve naming conflicts
MATCH (a:Person)-[:FRIEND]->(b:Person)
RETURN a.name AS person, b.name AS friend;
```

## Expressions in RETURN

### Mathematical Expressions

Perform calculations in the RETURN clause.

```gql
-- Basic arithmetic
MATCH (p:Product)
RETURN
    p.name,
    p.price,
    p.price * 1.1 AS price_with_tax,
    p.price * p.quantity AS total_value;

-- Using mathematical functions
MATCH (p:Point)
RETURN
    p.name,
    sqrt(p.x * p.x + p.y * p.y) AS distance_from_origin,
    round(p.value, 2) AS rounded_value;
```

### String Operations

Manipulate string values.

```gql
-- String concatenation
MATCH (p:Person)
RETURN p.firstName + ' ' + p.lastName AS full_name;

-- String functions
MATCH (p:Person)
RETURN
    toUpper(p.name) AS name_upper,
    toLower(p.email) AS email_lower,
    substring(p.bio, 0, 100) AS bio_preview;

-- String formatting
MATCH (u:User)
RETURN
    u.name,
    'User: ' + u.name + ' (' + u.email + ')' AS formatted;
```

### Conditional Expressions

Use CASE for conditional logic.

```gql
-- Simple CASE
MATCH (p:Product)
RETURN
    p.name,
    p.price,
    CASE
        WHEN p.price < 10 THEN 'Budget'
        WHEN p.price < 50 THEN 'Standard'
        WHEN p.price < 100 THEN 'Premium'
        ELSE 'Luxury'
    END AS price_tier;

-- CASE with equality
MATCH (o:Order)
RETURN
    o.id,
    CASE o.status
        WHEN 'pending' THEN 'Awaiting Processing'
        WHEN 'shipped' THEN 'On the Way'
        WHEN 'delivered' THEN 'Complete'
        ELSE 'Unknown'
    END AS status_display;

-- Conditional with NULL handling
MATCH (u:User)
RETURN
    u.name,
    COALESCE(u.nickname, u.name) AS display_name,
    CASE WHEN u.verified IS NULL THEN false ELSE u.verified END AS is_verified;
```

### Date and Time Expressions

Work with temporal values.

```gql
-- Date calculations
MATCH (e:Event)
RETURN
    e.name,
    e.start_date,
    e.end_date,
    (e.end_date - e.start_date).days AS duration_days;

-- Date formatting
MATCH (u:User)
RETURN
    u.name,
    u.created_at,
    u.created_at.year AS join_year,
    u.created_at.month AS join_month;

-- Relative dates
MATCH (p:Post)
WHERE p.created_at > datetime() - duration('P7D')
RETURN p.title, p.created_at AS posted_at;
```

## Structuring Results

### Returning Maps

Create structured objects in results.

```gql
-- Return a map
MATCH (p:Person)-[:LIVES_IN]->(c:City)
RETURN {
    name: p.name,
    age: p.age,
    city: c.name,
    country: c.country
} AS person_info;

-- Nested maps
MATCH (e:Employee)-[:WORKS_IN]->(d:Department)-[:PART_OF]->(c:Company)
RETURN {
    employee: {name: e.name, title: e.title},
    organization: {department: d.name, company: c.name}
} AS employment_details;
```

### Returning Lists

Construct lists in the result.

```gql
-- Simple list
MATCH (p:Person)
RETURN [p.name, p.email, p.phone] AS contact_info;

-- List from properties
MATCH (p:Product)
RETURN p.name, [p.color, p.size, p.material] AS attributes;

-- List comprehension
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name, [p.name] AS product_names;
```

### Returning Paths

Return complete traversal paths.

```gql
-- Return entire path
MATCH path = (a:Person)-[:KNOWS*1..3]->(b:Person)
WHERE a.name = 'Alice' AND b.name = 'Diana'
RETURN path;

-- Path components
MATCH path = shortestPath((a:City)-[:CONNECTED*]-(b:City))
WHERE a.name = 'NYC' AND b.name = 'LA'
RETURN
    path,
    length(path) AS hops,
    [n IN nodes(path) | n.name] AS cities,
    [r IN relationships(path) | r.distance] AS distances;
```

## Ordering Results

### ORDER BY Basics

Sort results by one or more columns.

```gql
-- Ascending order (default)
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.price;

-- Descending order
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.price DESC;

-- Multiple sort keys
MATCH (e:Employee)
RETURN e.department, e.name, e.salary
ORDER BY e.department ASC, e.salary DESC;
```

### ORDER BY Expressions

Sort by computed values.

```gql
-- Sort by expression
MATCH (p:Product)
RETURN p.name, p.price, p.quantity
ORDER BY p.price * p.quantity DESC;

-- Sort by alias
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name, count(p) AS purchase_count
ORDER BY purchase_count DESC;

-- Sort by string function
MATCH (p:Person)
RETURN p.name
ORDER BY toLower(p.name);
```

### NULL Handling in ORDER BY

Control how NULL values sort.

```gql
-- NULLs sort last in ascending order by default
MATCH (p:Product)
RETURN p.name, p.discount
ORDER BY p.discount;

-- Handle NULLs explicitly
MATCH (p:Product)
RETURN p.name, COALESCE(p.discount, 0) AS discount
ORDER BY discount;
```

## Pagination

### LIMIT

Restrict the number of results returned.

```gql
-- Get first 10 results
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.price DESC
LIMIT 10;

-- Top N pattern
MATCH (u:User)<-[:FOLLOWS]-(follower)
RETURN u.name, count(follower) AS followers
ORDER BY followers DESC
LIMIT 5;
```

### SKIP

Skip a number of results for pagination.

```gql
-- Skip first 20, get next 10
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.name
SKIP 20
LIMIT 10;

-- Page 3 (0-indexed pages of 25)
MATCH (p:Post)
RETURN p.title, p.created_at
ORDER BY p.created_at DESC
SKIP 50  -- Page 2 * 25
LIMIT 25;
```

### Pagination with Parameters

Dynamic pagination using parameters.

```gql
-- Parameterized pagination
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.price
SKIP $offset
LIMIT $limit;

-- In application code:
-- offset = (page_number - 1) * page_size
-- limit = page_size
```

## DISTINCT Results

### Basic DISTINCT

Remove duplicate rows from results.

```gql
-- Distinct values
MATCH (p:Person)-[:LIVES_IN]->(c:City)
RETURN DISTINCT c.name;

-- Distinct combinations
MATCH (p:Person)-[:WORKS_IN]->(d:Department)
RETURN DISTINCT d.name, d.location;
```

### DISTINCT with Expressions

Deduplicate based on computed values.

```gql
-- Distinct computed values
MATCH (p:Product)
RETURN DISTINCT
    CASE
        WHEN p.price < 50 THEN 'Low'
        WHEN p.price < 100 THEN 'Medium'
        ELSE 'High'
    END AS price_range;

-- Distinct after transformation
MATCH (p:Person)
RETURN DISTINCT toLower(p.email) AS email;
```

## Aggregation with RETURN

### Aggregation Functions

Use aggregation functions in RETURN.

```gql
-- Count
MATCH (p:Product)
RETURN count(p) AS total_products;

-- Multiple aggregations
MATCH (o:Order)
RETURN
    count(o) AS order_count,
    sum(o.total) AS total_revenue,
    avg(o.total) AS average_order,
    min(o.total) AS smallest_order,
    max(o.total) AS largest_order;
```

### Grouping with Aggregation

Non-aggregated columns create implicit groups.

```gql
-- Group by category
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
RETURN
    c.name AS category,
    count(p) AS product_count,
    avg(p.price) AS avg_price
ORDER BY product_count DESC;

-- Multiple grouping columns
MATCH (s:Sale)
RETURN
    s.year,
    s.month,
    s.region,
    sum(s.amount) AS total_sales
ORDER BY s.year, s.month, s.region;
```

### COLLECT Aggregation

Gather values into a list.

```gql
-- Collect names
MATCH (u:User)-[:MEMBER_OF]->(g:Group)
RETURN g.name, collect(u.name) AS members;

-- Collect with distinct
MATCH (p:Person)-[:TAGGED]->(t:Tag)
RETURN p.name, collect(DISTINCT t.name) AS unique_tags;

-- Collect maps
MATCH (c:Customer)-[:PLACED]->(o:Order)
RETURN c.name, collect({
    order_id: o.id,
    total: o.total,
    date: o.date
}) AS orders;
```

## Advanced RETURN Patterns

### Returning Element IDs

Get internal identifiers for elements.

```gql
-- Element ID function
MATCH (p:Person)
RETURN id(p) AS id, p.name;

-- For relationships
MATCH (a)-[r:KNOWS]->(b)
RETURN id(r) AS rel_id, a.name, b.name;
```

### Returning Labels and Types

Inspect element metadata.

```gql
-- Get node labels
MATCH (n)
WHERE n.name = $name
RETURN n.name, labels(n) AS node_labels;

-- Get relationship type
MATCH (a)-[r]->(b)
WHERE a.name = $name
RETURN a.name, type(r) AS relationship_type, b.name;
```

### Subqueries in RETURN

Use subqueries for complex projections.

```gql
-- Existential subquery
MATCH (p:Person)
RETURN
    p.name,
    EXISTS { MATCH (p)-[:MANAGES]->(:Person) } AS is_manager;

-- Count subquery
MATCH (d:Department)
RETURN
    d.name,
    COUNT { MATCH (d)<-[:WORKS_IN]-(e:Employee) } AS employee_count;
```

### UNION of Results

Combine results from multiple queries.

```gql
-- Union of different queries
MATCH (e:Employee)
WHERE e.salary > 100000
RETURN e.name AS person, 'High Earner' AS category
UNION
MATCH (m:Manager)
RETURN m.name AS person, 'Manager' AS category;

-- Union all (keep duplicates)
MATCH (a:Person {name: 'Alice'})-[:FRIEND]->(f)
RETURN f.name
UNION ALL
MATCH (b:Person {name: 'Bob'})-[:FRIEND]->(f)
RETURN f.name;
```

## Best Practices

### Performance Optimization

1. **Return Only What You Need**: Avoid returning entire nodes when only properties are needed

```gql
-- Good: Return specific properties
MATCH (p:Person)
RETURN p.name, p.email;

-- Avoid: Returning entire node with many properties
MATCH (p:Person)
RETURN p;  -- May include large unused properties
```

2. **Apply LIMIT Early**: When you only need a subset

```gql
-- Good: Limit before expensive operations
MATCH (p:Product)
WITH p
ORDER BY p.created_at DESC
LIMIT 10
RETURN p.name, p.price;
```

3. **Use Aliases for Clarity**: Make results self-documenting

```gql
RETURN
    u.name AS user_name,
    count(o) AS total_orders,
    sum(o.total) AS lifetime_value;
```

### Result Formatting

1. **Consistent Naming**: Use consistent alias conventions

```gql
-- snake_case for database-like results
RETURN p.name AS product_name, p.price AS unit_price;

-- camelCase for API responses
RETURN p.name AS productName, p.price AS unitPrice;
```

2. **Handle NULLs**: Use COALESCE for default values

```gql
RETURN
    p.name,
    COALESCE(p.description, 'No description') AS description,
    COALESCE(p.discount, 0) AS discount;
```

3. **Format for Consumption**: Structure results for your application

```gql
-- API-friendly format
RETURN {
    id: id(p),
    name: p.name,
    price: p.price,
    metadata: {
        created: p.created_at,
        updated: p.updated_at
    }
} AS product;
```

## Common Patterns

### Existence Check

Check if data exists.

```gql
-- Return boolean for existence
MATCH (u:User {email: $email})
RETURN count(u) > 0 AS user_exists;
```

### Summary Statistics

Compute multiple statistics.

```gql
MATCH (o:Order)
RETURN {
    total_orders: count(o),
    total_revenue: sum(o.total),
    average_order: avg(o.total),
    min_order: min(o.total),
    max_order: max(o.total)
} AS order_statistics;
```

### Hierarchical Results

Return nested structures.

```gql
MATCH (c:Category)-[:CONTAINS]->(p:Product)
RETURN {
    category: c.name,
    products: collect({
        name: p.name,
        price: p.price
    })
} AS catalog;
```

## Related Topics

- **[WHERE Clause](/tags/where/)**: Filtering before RETURN
- **[WITH Clause](/tags/with/)**: Intermediate projections
- **[Aggregation](/tags/aggregation/)**: Aggregation functions
- **[ORDER BY](/tags/order-by/)**: Sorting results
- **[MATCH Clause](/tags/match/)**: Pattern matching
- **[GQL Reference](/tags/gql-reference/)**: Complete GQL language reference

## Further Reading

- **GQL Tutorial - Querying Data**: `/docs/gql-tutorial/querying-data/`
- **Query Patterns Cookbook**: `/docs/guides/query-patterns/`
- **Performance Guide**: `/docs/performance/query-optimization/`
- **Functions Reference**: `/docs/gql-reference/functions/`
- **GQL Specification**: `/docs/gql-reference/specification/`
