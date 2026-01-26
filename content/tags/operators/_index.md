---
title: "GQL Operators"
description: "Master GQL operators in Geode: comparison, logical, arithmetic, string, list, and path operators for expressive graph queries and data manipulation."
keywords:
  - GQL operators
  - comparison operators
  - logical operators
  - arithmetic operators
  - string operators
  - list operators
  - path operators
  - query operators
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/operators/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Operators are the building blocks of GQL expressions, enabling you to compare values, perform calculations, manipulate strings and lists, and construct complex query logic. Geode implements the complete ISO/IEC 39075:2024 operator specification.

## What are GQL Operators?

GQL operators are symbols and keywords that perform operations on values, properties, and expressions. They enable you to:

- **Compare**: Test equality, inequality, and ordering relationships
- **Combine**: Build complex logical conditions with AND, OR, NOT
- **Calculate**: Perform arithmetic computations on numeric properties
- **Manipulate**: Transform strings, lists, and other data structures
- **Navigate**: Work with paths and relationships in graph traversals

## Comparison Operators

### Equality Operators

```gql
// Equal to
MATCH (u:User) WHERE u.age = 30 RETURN u

// Not equal to
MATCH (u:User) WHERE u.status <> 'inactive' RETURN u
MATCH (u:User) WHERE u.status != 'inactive' RETURN u  // Alternative syntax

// IS NULL / IS NOT NULL
MATCH (u:User) WHERE u.email IS NULL RETURN u
MATCH (u:User) WHERE u.phone IS NOT NULL RETURN u
```

### Ordering Operators

```gql
// Less than
MATCH (p:Product) WHERE p.price < 100 RETURN p

// Less than or equal
MATCH (p:Product) WHERE p.price <= 99.99 RETURN p

// Greater than
MATCH (u:User) WHERE u.age > 21 RETURN u

// Greater than or equal
MATCH (u:User) WHERE u.age >= 18 RETURN u
```

### Range Comparisons

```gql
// BETWEEN (inclusive)
MATCH (p:Product) WHERE p.price BETWEEN 50 AND 150 RETURN p

// Equivalent to
MATCH (p:Product) WHERE p.price >= 50 AND p.price <= 150 RETURN p
```

### Pattern Matching

```gql
// IN operator (set membership)
MATCH (u:User) WHERE u.role IN ['admin', 'moderator'] RETURN u

// String pattern matching
MATCH (u:User) WHERE u.email LIKE '%@example.com' RETURN u

// Case-insensitive pattern matching
MATCH (u:User) WHERE u.name ILIKE 'alice%' RETURN u

// Regular expressions
MATCH (p:Product) WHERE p.sku =~ '^PROD-[0-9]{4}$' RETURN p
```

## Logical Operators

### Boolean Logic

```gql
// AND (conjunction)
MATCH (u:User)
WHERE u.age >= 18 AND u.verified = true
RETURN u

// OR (disjunction)
MATCH (u:User)
WHERE u.role = 'admin' OR u.role = 'moderator'
RETURN u

// NOT (negation)
MATCH (u:User)
WHERE NOT u.suspended
RETURN u

// XOR (exclusive or)
MATCH (u:User)
WHERE (u.has_email XOR u.has_phone)  // One but not both
RETURN u
```

### Complex Conditions

```gql
// Combining logical operators (precedence: NOT > AND > OR)
MATCH (p:Product)
WHERE (p.category = 'Electronics' AND p.in_stock = true)
   OR (p.category = 'Books' AND p.price < 20)
RETURN p

// Parentheses for explicit precedence
MATCH (u:User)
WHERE u.verified = true
  AND (u.age >= 18 OR u.parent_approved = true)
RETURN u
```

## Arithmetic Operators

### Basic Arithmetic

```gql
// Addition
MATCH (p:Product)
RETURN p.name, p.price + p.tax AS total_price

// Subtraction
MATCH (p:Product)
RETURN p.name, p.retail_price - p.wholesale_price AS margin

// Multiplication
MATCH (i:Item)
RETURN i.name, i.price * i.quantity AS subtotal

// Division
MATCH (u:User)
RETURN u.name, u.total_spent / u.order_count AS avg_order_value

// Modulo (remainder)
MATCH (n:Number)
WHERE n.value % 2 = 0  // Even numbers
RETURN n
```

### Numeric Functions with Operators

```gql
// Exponentiation
RETURN 2 ^ 10 AS result  // 1024

// Negation
MATCH (t:Transaction)
RETURN t.id, -t.amount AS reversal

// Absolute value with expression
MATCH (a:Account)
RETURN a.id, ABS(a.balance - a.target) AS difference
```

## String Operators

### Concatenation

```gql
// String concatenation with +
MATCH (u:User)
RETURN u.first_name + ' ' + u.last_name AS full_name

// Concatenation with ||
MATCH (u:User)
RETURN u.first_name || ' ' || u.last_name AS full_name
```

### String Comparison

```gql
// Starts with
MATCH (u:User)
WHERE u.email STARTS WITH 'admin'
RETURN u

// Ends with
MATCH (f:File)
WHERE f.name ENDS WITH '.pdf'
RETURN f

// Contains
MATCH (p:Product)
WHERE p.description CONTAINS 'wireless'
RETURN p
```

## List Operators

### List Access

```gql
// Index access (zero-based)
MATCH (u:User)
RETURN u.tags[0] AS first_tag

// Negative indexing (from end)
MATCH (u:User)
RETURN u.tags[-1] AS last_tag

// Range slicing [start..end]
MATCH (u:User)
RETURN u.tags[1..3] AS middle_tags

// Open-ended slicing
MATCH (u:User)
RETURN u.tags[2..] AS tail,    // From index 2 to end
       u.tags[..2] AS head      // From start to index 2 (exclusive)
```

### List Operations

```gql
// List concatenation
MATCH (u:User)
RETURN u.interests + ['reading', 'travel'] AS expanded_interests

// IN operator (membership test)
MATCH (u:User)
WHERE 'admin' IN u.roles
RETURN u

// ALL predicate
MATCH (u:User)
WHERE ALL(tag IN u.tags WHERE LENGTH(tag) > 2)
RETURN u

// ANY predicate
MATCH (p:Product)
WHERE ANY(review IN p.reviews WHERE review.rating >= 4)
RETURN p

// NONE predicate
MATCH (u:User)
WHERE NONE(email IN u.emails WHERE email ENDS WITH '@spam.com')
RETURN u

// SINGLE predicate (exactly one match)
MATCH (u:User)
WHERE SINGLE(role IN u.roles WHERE role = 'admin')
RETURN u
```

## Path Operators

### Path Construction

```gql
// Path variable
MATCH path = (a:User)-[:KNOWS*1..3]->(b:User)
RETURN path

// Path length
MATCH path = (a)-[:KNOWS*]->(b)
WHERE LENGTH(path) <= 3
RETURN path
```

### Path Functions

```gql
// Extract nodes from path
MATCH path = (a:User)-[:KNOWS*]->(b:User)
RETURN NODES(path) AS users_in_path

// Extract relationships from path
MATCH path = (a:User)-[r:KNOWS*]->(b:User)
RETURN RELATIONSHIPS(path) AS connections

// Path predicates
MATCH path = (a:User)-[:KNOWS*]->(b:User)
WHERE ALL(node IN NODES(path) WHERE node.active = true)
RETURN path
```

## Null Handling Operators

### Null Comparison

```gql
// IS NULL
MATCH (u:User)
WHERE u.deleted_at IS NULL  // Active users
RETURN u

// IS NOT NULL
MATCH (u:User)
WHERE u.email IS NOT NULL
RETURN u

// COALESCE (return first non-null)
MATCH (u:User)
RETURN u.nickname COALESCE u.username COALESCE 'Anonymous' AS display_name
```

### Null-Safe Operations

```gql
// Null-safe property access
MATCH (u:User)
RETURN u.profile?.bio  // Returns null if profile is null

// Null coalescing with default
MATCH (p:Product)
RETURN p.name, p.discount ?? 0.0 AS discount_rate
```

## Type Operators

### Type Checking

```gql
// INSTANCEOF (type checking)
MATCH (n)
WHERE n INSTANCEOF User
RETURN n

// Label checking
MATCH (n)
WHERE n:User OR n:Admin
RETURN n

// Property existence
MATCH (n)
WHERE EXISTS { (n)-[:HAS_PROPERTY]->() }
RETURN n
```

## Set Operators

### Set Operations on Results

```gql
// UNION (combine results, remove duplicates)
MATCH (u:User) RETURN u.email
UNION
MATCH (a:Admin) RETURN a.email

// UNION ALL (combine results, keep duplicates)
MATCH (u:User) RETURN u.email
UNION ALL
MATCH (a:Admin) RETURN a.email

// INTERSECT (common elements)
MATCH (u:User) RETURN u.email
INTERSECT
MATCH (a:Admin) RETURN a.email

// EXCEPT (difference)
MATCH (u:User) RETURN u.email
EXCEPT
MATCH (b:Banned) RETURN b.email
```

## Operator Precedence

From highest to lowest precedence:

1. **Property access**: `.`, `?.`
2. **Unary operators**: `+`, `-`, `NOT`
3. **Exponentiation**: `^`
4. **Multiplicative**: `*`, `/`, `%`
5. **Additive**: `+`, `-`
6. **Comparison**: `=`, `<>`, `<`, `>`, `<=`, `>=`, `IN`, `LIKE`, `=~`
7. **NOT**
8. **AND**
9. **XOR**
10. **OR**

```gql
// Example with precedence
MATCH (p:Product)
WHERE p.price * 1.1 > 100 AND p.in_stock = true OR p.preorder = true
// Evaluates as: ((p.price * 1.1) > 100 AND p.in_stock = true) OR p.preorder = true

// Use parentheses for clarity
MATCH (p:Product)
WHERE (p.price * 1.1 > 100) AND (p.in_stock = true OR p.preorder = true)
```

## Advanced Operator Patterns

### Conditional Expressions

```gql
// CASE expressions
MATCH (u:User)
RETURN u.name,
  CASE
    WHEN u.age < 18 THEN 'minor'
    WHEN u.age < 65 THEN 'adult'
    ELSE 'senior'
  END AS age_group

// Simple CASE (match against value)
MATCH (o:Order)
RETURN o.id,
  CASE o.status
    WHEN 'pending' THEN 'Processing'
    WHEN 'shipped' THEN 'In Transit'
    WHEN 'delivered' THEN 'Complete'
    ELSE 'Unknown'
  END AS status_display
```

### Aggregation with Operators

```gql
// Operators in aggregations
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name,
       COUNT(p) AS total_purchases,
       SUM(p.price * p.quantity) AS total_spent,
       AVG(p.price) AS avg_product_price
```

### Subquery Operators

```gql
// EXISTS subquery
MATCH (u:User)
WHERE EXISTS {
  MATCH (u)-[:PURCHASED]->(p:Product)
  WHERE p.price > 1000
}
RETURN u.name

// NOT EXISTS
MATCH (u:User)
WHERE NOT EXISTS {
  MATCH (u)-[:LOGGED_IN]->()
  WHERE timestamp() - u.last_login < 86400000
}
RETURN u AS inactive_users
```

## Performance Considerations

### Indexed Operators

Operators that can use indexes for performance:

```gql
// Equality on indexed property (fast)
MATCH (u:User) WHERE u.id = 123 RETURN u

// Range query on indexed property (fast with B-tree index)
MATCH (p:Product) WHERE p.price BETWEEN 50 AND 150 RETURN p

// Pattern matching (may use index)
MATCH (u:User) WHERE u.email LIKE 'admin%' RETURN u

// IN with small lists (can use index)
MATCH (u:User) WHERE u.id IN [1, 2, 3, 4, 5] RETURN u
```

### Operator Optimization

```gql
// Avoid: expensive operations in loops
MATCH (u:User)-[:FRIEND*1..5]-(f:User)
WHERE LENGTH(u.bio) > 100  // Computed for every traversal step

// Better: filter early
MATCH (u:User) WHERE LENGTH(u.bio) > 100
MATCH (u)-[:FRIEND*1..5]-(f:User)
RETURN f
```

## Common Patterns

### Safe Navigation

```gql
// Avoid null pointer errors
MATCH (u:User)
RETURN u.profile?.address?.city ?? 'Unknown' AS city
```

### Multi-Condition Filters

```gql
// Complex filtering
MATCH (p:Product)
WHERE p.price BETWEEN 50 AND 500
  AND p.in_stock = true
  AND p.category IN ['Electronics', 'Computers']
  AND p.rating >= 4.0
  AND p.name =~ '.*laptop.*'i
RETURN p
ORDER BY p.price
```

### Dynamic Property Access

```gql
// Property name from variable
MATCH (u:User)
WITH u, 'email' AS prop_name
RETURN u[prop_name] AS email_value
```

## Best Practices

1. **Use Parentheses**: Make operator precedence explicit with parentheses
2. **Index-Friendly Operators**: Structure queries to leverage indexes (=, <, >, BETWEEN)
3. **Early Filtering**: Apply filters with indexed properties before expensive operations
4. **Null Safety**: Always handle potential nulls with IS NULL, COALESCE, or ??
5. **Type Consistency**: Ensure operands are compatible types (avoid comparing strings to numbers)
6. **Avoid Redundancy**: Don't repeat complex expressions; use WITH to assign to variables
7. **Test Precedence**: Verify complex logical expressions with representative data

## Common Mistakes

1. **Null Comparison with =**: Use `IS NULL` not `= NULL`
2. **Case Sensitivity**: Remember `LIKE` is case-sensitive; use `ILIKE` for case-insensitive
3. **Integer Division**: `5 / 2` returns `2`, use `5.0 / 2` for decimal result
4. **OR Precedence**: `AND` binds tighter than `OR`; use parentheses
5. **Empty String vs Null**: `''` is not the same as `NULL`

## Related Topics

- **GQL Functions**: Built-in functions complementing operators
- **Data Types**: Understanding type compatibility for operators
- **Query Optimization**: Optimize operator usage for performance
- **Indexing**: Create indexes for operator-based filtering
- **GQL Syntax**: Complete language syntax reference

## Further Reading

- [GQL Functions](/tags/functions/) - Built-in functions and expressions
- [Data Types](/tags/types/) - Type system and compatibility
- [GQL Reference](/tags/gql-reference/) - Complete language documentation
- [Query Performance](/tags/performance/) - Optimize operator usage
- [Indexing](/tags/indexing/) - Index strategies for operator queries

Master operators to write expressive, performant GQL queries that unlock the full power of graph data analysis in Geode.
