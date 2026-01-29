---
title: "WHERE Clause in GQL"
description: "Master the GQL WHERE clause for filtering query results with conditions, predicates, boolean logic, and pattern expressions in Geode graph database."
keywords:
  - WHERE
  - filtering
  - conditions
  - predicates
  - GQL
  - Geode
  - boolean expressions
  - comparison operators
  - pattern predicates
  - query filtering
  - null handling
  - string matching
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/where/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# WHERE Clause in GQL

The WHERE clause filters graph elements based on conditions and predicates. It is one of the most frequently used clauses in GQL, allowing you to narrow down matched patterns to only those that meet specific criteria. Mastering WHERE is essential for writing efficient, precise queries. Geode implements the WHERE clause according to the ISO/IEC 39075:2024 GQL standard.

## Introduction to WHERE

The WHERE clause evaluates conditions against each potential result from a MATCH or other clause, including only rows where the condition evaluates to TRUE. It supports a rich set of comparison operators, boolean logic, pattern predicates, and functions.

**Key characteristics of WHERE**:

- **Boolean Evaluation**: Conditions must evaluate to TRUE for inclusion
- **Short-Circuit Evaluation**: AND/OR operations stop early when result is determined
- **NULL Handling**: NULL comparisons have special three-valued logic semantics
- **Pattern Predicates**: Check for existence of patterns
- **Index Usage**: Properly written WHERE clauses can utilize indexes

## Basic Comparisons

### Equality and Inequality

Compare values for equality.

```gql
-- Equality
MATCH (p:Person)
WHERE p.name = 'Alice'
RETURN p;

-- Inequality
MATCH (p:Product)
WHERE p.category <> 'Electronics'
RETURN p.name;

-- Not equal (alternative syntax)
MATCH (p:Product)
WHERE p.status != 'discontinued'
RETURN p;
```

### Numeric Comparisons

Compare numeric values.

```gql
-- Greater than
MATCH (p:Product)
WHERE p.price > 100
RETURN p.name, p.price;

-- Less than or equal
MATCH (e:Employee)
WHERE e.age <= 30
RETURN e.name;

-- Range comparison
MATCH (p:Product)
WHERE p.price >= 50 AND p.price <= 200
RETURN p.name, p.price;

-- Chained comparison
MATCH (p:Product)
WHERE 50 <= p.price <= 200
RETURN p.name, p.price;
```

### String Comparisons

Compare string values lexicographically.

```gql
-- Alphabetical comparison
MATCH (p:Person)
WHERE p.lastName >= 'M'
RETURN p.lastName;

-- Case-sensitive equality
MATCH (u:User)
WHERE u.username = 'alice'  -- Won't match 'Alice'
RETURN u;

-- Case-insensitive comparison
MATCH (u:User)
WHERE toLower(u.username) = toLower($search)
RETURN u;
```

## Boolean Logic

### AND Operator

Combine conditions that must all be true.

```gql
-- Simple AND
MATCH (p:Product)
WHERE p.price < 100 AND p.inStock = true
RETURN p.name;

-- Multiple AND conditions
MATCH (e:Employee)
WHERE e.department = 'Engineering'
AND e.level >= 3
AND e.active = true
RETURN e.name, e.title;
```

### OR Operator

Match when any condition is true.

```gql
-- Simple OR
MATCH (p:Person)
WHERE p.city = 'New York' OR p.city = 'Los Angeles'
RETURN p.name, p.city;

-- Multiple OR
MATCH (p:Product)
WHERE p.category = 'Electronics'
OR p.category = 'Computers'
OR p.category = 'Phones'
RETURN p.name;

-- Equivalent using IN
MATCH (p:Product)
WHERE p.category IN ['Electronics', 'Computers', 'Phones']
RETURN p.name;
```

### NOT Operator

Negate conditions.

```gql
-- Simple NOT
MATCH (p:Product)
WHERE NOT p.discontinued
RETURN p.name;

-- NOT with complex expression
MATCH (u:User)
WHERE NOT (u.role = 'admin' OR u.role = 'moderator')
RETURN u.name;

-- NOT IN
MATCH (p:Product)
WHERE NOT p.category IN ['Discontinued', 'Archive']
RETURN p.name;
```

### Complex Boolean Expressions

Combine operators with parentheses.

```gql
-- Grouped conditions
MATCH (p:Product)
WHERE (p.category = 'Electronics' OR p.category = 'Computers')
AND p.price < 500
AND p.rating > 4.0
RETURN p.name, p.price;

-- Nested logic
MATCH (e:Employee)
WHERE e.active = true
AND (
    (e.department = 'Engineering' AND e.level >= 3)
    OR (e.department = 'Management' AND e.level >= 2)
)
RETURN e.name, e.department, e.level;
```

## Collection Operators

### IN Operator

Check membership in a list.

```gql
-- Simple IN
MATCH (p:Person)
WHERE p.country IN ['USA', 'Canada', 'Mexico']
RETURN p.name, p.country;

-- IN with parameter
MATCH (p:Product)
WHERE p.id IN $product_ids
RETURN p;

-- IN with property list
MATCH (p:Product)
WHERE 'sale' IN p.tags
RETURN p.name;
```

### List Predicates

Work with list properties.

```gql
-- Check if list contains value
MATCH (p:Post)
WHERE 'technology' IN p.tags
RETURN p.title;

-- Check list size
MATCH (p:Post)
WHERE size(p.tags) > 3
RETURN p.title;

-- ANY predicate
MATCH (p:Product)
WHERE ANY(tag IN p.tags WHERE tag STARTS WITH 'premium')
RETURN p.name;

-- ALL predicate
MATCH (p:Product)
WHERE ALL(score IN p.reviews WHERE score >= 4)
RETURN p.name;

-- NONE predicate
MATCH (p:Product)
WHERE NONE(tag IN p.tags WHERE tag = 'discontinued')
RETURN p.name;
```

## String Predicates

### STARTS WITH

Match string prefixes.

```gql
-- Simple prefix match
MATCH (p:Person)
WHERE p.name STARTS WITH 'Al'
RETURN p.name;

-- With parameter
MATCH (p:Product)
WHERE p.sku STARTS WITH $prefix
RETURN p;

-- Case-insensitive prefix
MATCH (u:User)
WHERE toLower(u.email) STARTS WITH 'admin'
RETURN u;
```

### ENDS WITH

Match string suffixes.

```gql
-- Simple suffix match
MATCH (u:User)
WHERE u.email ENDS WITH '@company.com'
RETURN u.name, u.email;

-- File extension
MATCH (f:File)
WHERE f.name ENDS WITH '.pdf'
RETURN f.name;
```

### CONTAINS

Match substrings.

```gql
-- Simple contains
MATCH (p:Product)
WHERE p.description CONTAINS 'wireless'
RETURN p.name;

-- Search in text
MATCH (a:Article)
WHERE a.content CONTAINS $search_term
RETURN a.title;
```

### Regular Expressions

Pattern matching with regex.

```gql
-- Simple regex
MATCH (u:User)
WHERE u.email =~ '.*@gmail\\.com$'
RETURN u.email;

-- Case-insensitive regex
MATCH (p:Product)
WHERE p.name =~ '(?i).*phone.*'
RETURN p.name;

-- Complex pattern
MATCH (p:Person)
WHERE p.phone =~ '^\\+1-[0-9]{3}-[0-9]{3}-[0-9]{4}$'
RETURN p.name, p.phone;

-- NOT regex
MATCH (u:User)
WHERE NOT u.email =~ '.*@test\\.com$'
RETURN u.email;
```

## NULL Handling

### IS NULL

Check for missing values.

```gql
-- Find nodes with missing property
MATCH (u:User)
WHERE u.phone IS NULL
RETURN u.name, u.email;

-- Optional relationship check
MATCH (p:Person)
OPTIONAL MATCH (p)-[:EMPLOYED_BY]->(c:Company)
WHERE c IS NULL
RETURN p.name AS unemployed_person;
```

### IS NOT NULL

Check for existing values.

```gql
-- Find nodes with property present
MATCH (u:User)
WHERE u.verified_at IS NOT NULL
RETURN u.name, u.verified_at;

-- Multiple null checks
MATCH (p:Profile)
WHERE p.bio IS NOT NULL AND p.avatar IS NOT NULL
RETURN p;
```

### NULL in Comparisons

Understanding three-valued logic.

```gql
-- NULL comparisons return NULL, not FALSE
MATCH (p:Product)
WHERE p.discount > 0  -- Excludes NULL discounts
RETURN p.name;

-- Explicit NULL handling
MATCH (p:Product)
WHERE COALESCE(p.discount, 0) > 0
RETURN p.name;

-- Handle NULL in OR
MATCH (p:Product)
WHERE p.discount > 0 OR p.discount IS NULL
RETURN p.name;
```

## Pattern Predicates

### Existence Checks

Check if patterns exist.

```gql
-- Has relationship
MATCH (p:Person)
WHERE (p)-[:WORKS_FOR]->(:Company)
RETURN p.name;

-- Relationship with conditions
MATCH (p:Person)
WHERE (p)-[:FRIEND {close: true}]->(:Person)
RETURN p.name;

-- No relationship exists
MATCH (p:Person)
WHERE NOT (p)-[:BLOCKED]->(:Person)
RETURN p.name;
```

### Pattern with Properties

Filter based on related elements.

```gql
-- Check related node properties
MATCH (p:Person)
WHERE (p)-[:LIVES_IN]->(:City {country: 'USA'})
RETURN p.name;

-- Multiple pattern conditions
MATCH (u:User)
WHERE (u)-[:PURCHASED]->(:Product {category: 'Premium'})
AND NOT (u)-[:FLAGGED]->()
RETURN u.name;
```

### EXISTS Subquery

Complex existence checks with subqueries.

```gql
-- EXISTS subquery
MATCH (p:Person)
WHERE EXISTS {
    MATCH (p)-[:AUTHORED]->(post:Post)
    WHERE post.views > 1000
}
RETURN p.name AS popular_author;

-- Negative EXISTS
MATCH (c:Customer)
WHERE NOT EXISTS {
    MATCH (c)-[:PURCHASED]->(p:Product)
    WHERE p.category = 'Luxury'
}
RETURN c.name AS non_luxury_customer;
```

## Numeric Functions

### Mathematical Comparisons

Use functions in comparisons.

```gql
-- Absolute value
MATCH (a:Account)
WHERE abs(a.balance) > 1000
RETURN a.id;

-- Rounding
MATCH (p:Product)
WHERE round(p.price) = 100
RETURN p.name;

-- Math functions
MATCH (p:Point)
WHERE sqrt(p.x * p.x + p.y * p.y) < 10
RETURN p;
```

### Aggregation in WHERE (via WITH)

Filter on aggregated values.

```gql
-- Filter after aggregation
MATCH (c:Customer)-[:PURCHASED]->(p:Product)
WITH c, count(p) AS purchase_count
WHERE purchase_count > 10
RETURN c.name, purchase_count;

-- Multiple aggregation filters
MATCH (u:User)-[:POSTED]->(post:Post)
WITH u, count(post) AS posts, avg(post.likes) AS avg_likes
WHERE posts >= 5 AND avg_likes > 100
RETURN u.name, posts, avg_likes;
```

## Date and Time Comparisons

### Date Comparisons

Filter by date values.

```gql
-- After date
MATCH (e:Event)
WHERE e.date > date('2025-01-01')
RETURN e.name, e.date;

-- Date range
MATCH (o:Order)
WHERE o.created_at >= date('2025-01-01')
AND o.created_at < date('2025-02-01')
RETURN o;

-- Current date comparison
MATCH (s:Subscription)
WHERE s.expires_at < date()
RETURN s AS expired_subscription;
```

### DateTime Comparisons

Work with timestamps.

```gql
-- Recent records
MATCH (l:LogEntry)
WHERE l.timestamp > datetime() - duration('PT1H')
RETURN l;

-- Time window
MATCH (s:Session)
WHERE s.started_at >= datetime('2025-01-15T00:00:00')
AND s.started_at < datetime('2025-01-16T00:00:00')
RETURN s;
```

### Duration Calculations

Filter by time differences.

```gql
-- Age calculation
MATCH (e:Event)
WHERE duration.between(e.created_at, datetime()).days > 30
RETURN e.name AS old_event;

-- Activity window
MATCH (u:User)
WHERE u.last_login > datetime() - duration('P7D')
RETURN u.name AS active_user;
```

## Performance Optimization

### Index-Friendly WHERE Clauses

Write conditions that use indexes effectively.

```gql
-- Good: Equality on indexed property
MATCH (u:User)
WHERE u.email = $email  -- Uses index
RETURN u;

-- Good: Prefix search on indexed property
MATCH (u:User)
WHERE u.email STARTS WITH 'admin'  -- Uses index
RETURN u;

-- Less efficient: Function on indexed property
MATCH (u:User)
WHERE toLower(u.email) = $email  -- May not use index
RETURN u;
```

### Order of Conditions

Place most selective conditions first.

```gql
-- More efficient: Specific condition first
MATCH (p:Product)
WHERE p.sku = $sku  -- Highly selective
AND p.active = true  -- Less selective
RETURN p;

-- Index hints (if supported)
MATCH (p:Product)
WHERE p.category = 'Electronics'
USING INDEX p:Product(category)
RETURN p;
```

### Avoiding Full Scans

Write conditions that enable index usage.

```gql
-- Good: Uses index
MATCH (p:Person {country: 'USA'})
WHERE p.age > 21
RETURN p;

-- Avoid if possible: No index advantage
MATCH (p:Person)
WHERE p.bio CONTAINS 'engineer'  -- Full text search needed
RETURN p;
-- Better: Use full-text index
MATCH (p:Person)
WHERE text_search(p.bio, 'engineer')
RETURN p;
```

## Best Practices

### Readability

1. **Use Parentheses for Clarity**: Make operator precedence explicit
```gql
WHERE (a AND b) OR (c AND d)  -- Clear
WHERE a AND b OR c AND d      -- Ambiguous to readers
```

2. **Break Complex Conditions**: Use multiple lines
```gql
WHERE p.active = true
AND p.verified = true
AND (p.role = 'admin' OR p.role = 'moderator')
AND p.created_at > $since
```

3. **Use Meaningful Comparisons**: Be explicit about intent
```gql
-- Clear intent
WHERE p.inventory > 0
-- Instead of
WHERE p.inventory  -- Truthy check
```

### Common Patterns

1. **Optional with Default**: Handle missing values
```gql
WHERE COALESCE(p.discount, 0) >= $min_discount
```

2. **Safe Navigation**: Check existence before accessing
```gql
WHERE p.settings IS NOT NULL AND p.settings.notifications = true
```

3. **Range Queries**: Use consistent ordering
```gql
WHERE $min <= p.price AND p.price <= $max
```

### Avoiding Pitfalls

1. **NULL Awareness**: Remember NULL != FALSE
```gql
-- This excludes NULLs
WHERE p.active = true

-- This includes NULLs
WHERE p.active = true OR p.active IS NULL
```

2. **Type Mismatches**: Ensure compatible types
```gql
-- String vs number comparison
WHERE p.price > 100  -- Good
WHERE p.price > '100'  -- Type mismatch risk
```

3. **Case Sensitivity**: Be explicit about case handling
```gql
-- Explicit case handling
WHERE toLower(u.email) = toLower($email)
```

## Related Topics

- **[MATCH Clause](/tags/match/)**: Pattern matching before filtering
- **[WITH Clause](/tags/with/)**: Intermediate filtering
- **[RETURN Clause](/tags/return/)**: Output after filtering
- **[Operators](/tags/operators/)**: Comparison and logical operators
- **[GQL Reference](/tags/gql-reference/)**: Complete GQL language reference
- **[Query Optimization](/tags/query-optimization/)**: Performance tuning
- **[Indexing](/tags/indexing/)**: Index usage for filtering

## Further Reading

- **GQL Tutorial - Filtering Data**: `/docs/gql-tutorial/filtering-data/`
- **Query Patterns Guide**: `/docs/guides/query-patterns/`
- **Performance Optimization**: `/docs/performance/query-optimization/`
- **Index Guide**: `/docs/reference/indexes/`
- **Functions Reference**: `/docs/gql-reference/functions/`
