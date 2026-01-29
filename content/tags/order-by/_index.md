---
title: "ORDER BY Clause - Sorting Query Results"
description: "Use ORDER BY in GQL to sort query results by node properties, relationship attributes, or computed values in ascending or descending order."
keywords:
  - ORDER BY
  - sorting
  - GQL
  - query results
  - ascending
  - descending
  - result ordering
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/order-by/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# ORDER BY Clause in Geode

The ORDER BY clause sorts query results by one or more expressions. Proper use of ORDER BY enables efficient pagination, top-N queries, and organized result presentation.

## Basic Syntax

```gql
MATCH (user:User)
RETURN user.name, user.created_at
ORDER BY user.created_at DESC;
```

**Ascending (default)**:
```gql
MATCH (product:Product)
RETURN product.name, product.price
ORDER BY product.price;  -- ASC is implicit
```

**Descending**:
```gql
MATCH (post:Post)
RETURN post.title, post.views
ORDER BY post.views DESC;
```

## Multiple Sort Keys

Sort by multiple columns with precedence:

```gql
MATCH (employee:Employee)
RETURN employee.department, employee.name, employee.salary
ORDER BY employee.department ASC, employee.salary DESC;
```

This sorts first by department alphabetically, then within each department by salary from highest to lowest.

## Sorting by Computed Values

Order by expressions, not just properties:

```gql
MATCH (order:Order)-[:CONTAINS]->(item:Item)
WITH order, sum(item.price * item.quantity) AS total
RETURN order.id, total
ORDER BY total DESC;
```

## NULL Handling

By default, NULL values sort last in ascending order and first in descending order. GQL provides explicit control:

```gql
-- NULLs first
MATCH (user:User)
RETURN user.name, user.last_login
ORDER BY user.last_login ASC NULLS FIRST;

-- NULLs last
MATCH (user:User)
RETURN user.name, user.last_login
ORDER BY user.last_login DESC NULLS LAST;
```

## ORDER BY with LIMIT

Combine ORDER BY with LIMIT for efficient top-N queries:

```gql
-- Top 10 highest-rated products
MATCH (product:Product)
RETURN product.name, product.rating
ORDER BY product.rating DESC
LIMIT 10;
```

## Pagination Pattern

Use ORDER BY with SKIP and LIMIT for pagination:

```gql
-- Page 3 of results (20 items per page)
MATCH (article:Article)
RETURN article.title, article.published_at
ORDER BY article.published_at DESC
SKIP 40
LIMIT 20;
```

## Performance Considerations

**Index-backed sorting**: Create indexes on frequently sorted properties:
```gql
CREATE INDEX user_created_idx FOR (u:User) ON (u.created_at);
```

**Avoid sorting large result sets**: Use WHERE clauses to filter before sorting.

**Consider query-time sorting vs. application sorting**: For small result sets, application-level sorting may be more flexible.

## Related Topics

- [Query Optimization](/tags/query-optimization/)
- [LIMIT and SKIP](/tags/query/)
- [Indexes](/tags/indexes/)
- [Pattern Matching](/tags/pattern-matching/)
- [Performance](/tags/performance/)
