---
title: "GQL Operators Reference"
description: "Complete reference for all GQL operators in Geode including arithmetic, logical, comparison, string, and advanced operators with precedence rules and examples."
summary: "Comprehensive operator reference covering all GQL operators, operator precedence, type compatibility, and practical examples for graph query development."
slug: "operators"
url: "/docs/reference/operators/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 20
keywords: ["GQL operators", "operator precedence", "arithmetic operators", "logical operators", "comparison operators", "string operators", "graph query operators"]
tags: ["reference", "operators", "gql-syntax"]
categories: ["Reference"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/reference/operators/"
    noindex: false
---

<!-- CANARY: REQ=REQ-API-DOCS-002; FEATURE="APIDocumentation"; ASPECT=BuildTarget; STATUS=EXEMPT; OWNER=tooling; UPDATED=2026-01-03 -->

## Overview

Geode implements a complete set of operators as defined in the ISO/IEC 39075:2024 GQL standard. This reference covers all supported operators, their precedence rules, type compatibility, and practical usage examples.

### Operator Categories

1. **[Arithmetic Operators](#arithmetic-operators)** - Mathematical operations (+, -, *, /, %)
2. **[Comparison Operators](#comparison-operators)** - Value comparisons (=, <>, <, >, <=, >=)
3. **[Logical Operators](#logical-operators)** - Boolean logic (AND, OR, NOT)
4. **[String Operators](#string-operators)** - Text operations (||, STARTS WITH, ENDS WITH, CONTAINS, =~)
5. **[Unary Operators](#unary-operators)** - Single operand operations (+, -, NOT)
6. **[Postfix Operators](#postfix-operators)** - Property access, array indexing (., [], ())
7. **[Set Operators](#set-operators)** - Membership tests (IN, IS NULL)

---

## Operator Precedence

Operators are evaluated in the following order (highest to lowest precedence):

| Precedence | Operators | Associativity | Example |
|------------|-----------|---------------|---------|
| **1 (Highest)** | `.` (member access), `[index]` (array index), `()` (function call) | Left-to-right | `labels(n)[0]` |
| **2** | `+` (unary plus), `-` (unary minus), `NOT` | Right-to-left | `-5`, `NOT true` |
| **3** | `*`, `/`, `%` | Left-to-right | `10 * 2 / 5` |
| **4** | `+`, `-` | Left-to-right | `10 + 5 - 3` |
| **5** | `\|\|` (string concatenation) | Left-to-right | `'Hello' \|\| ' ' \|\| 'World'` |
| **6** | `<`, `<=`, `>`, `>=`, `=`, `<>` | Left-to-right | `age > 18` |
| **7** | `IS NULL`, `IS NOT NULL`, `IN` | Left-to-right | `x IS NULL` |
| **8** | `AND` | Left-to-right | `a AND b` |
| **9 (Lowest)** | `OR` | Left-to-right | `a OR b` |

### Precedence Examples

```gql
-- Without parentheses
RETURN 10 + 2 * 5 AS result;  -- Returns: 20 (multiplication first)

-- With parentheses to override precedence
RETURN (10 + 2) * 5 AS result;  -- Returns: 60

-- Complex expression
RETURN 10 + labels(n)[0].length * 2 % 3 AS result
-- Evaluation order:
-- 1. labels(n) - function call
-- 2. [0] - array index
-- 3. .length - member access
-- 4. * 2 - multiplication
-- 5. % 3 - modulo
-- 6. 10 + - addition
```

---

## Arithmetic Operators

Arithmetic operators perform mathematical operations on numeric values.

### Addition (`+`)

**Syntax:** `operand1 + operand2`

**Description:** Adds two numeric values.

**Examples:**
```gql
RETURN 5 + 3 AS sum;                    -- Returns: 8
RETURN 10.5 + 2.3 AS decimal_sum;       -- Returns: 12.8
RETURN -5 + 10 AS negative_sum;         -- Returns: 5

-- In queries
MATCH (p:Person)
RETURN p.name, p.age + 1 AS next_year_age;
```

**Type Compatibility:**
- `INTEGER + INTEGER` → `INTEGER`
- `REAL + REAL` → `REAL`
- `INTEGER + REAL` → `REAL` (automatic type promotion)

### Subtraction (`-`)

**Syntax:** `operand1 - operand2`

**Description:** Subtracts the second value from the first.

**Examples:**
```gql
RETURN 10 - 3 AS difference;            -- Returns: 7
RETURN 5.5 - 2.2 AS decimal_diff;       -- Returns: 3.3
RETURN 0 - 5 AS negative;               -- Returns: -5

-- Calculate age difference
MATCH (p1:Person), (p2:Person)
WHERE p1.name = 'Alice' AND p2.name = 'Bob'
RETURN abs(p1.age - p2.age) AS age_difference;
```

### Multiplication (`*`)

**Syntax:** `operand1 * operand2`

**Description:** Multiplies two numeric values.

**Examples:**
```gql
RETURN 5 * 3 AS product;                -- Returns: 15
RETURN 2.5 * 4 AS decimal_product;      -- Returns: 10.0

-- Calculate total price
MATCH (item:Item)
RETURN item.name, item.quantity * item.price AS total_cost;
```

### Division (`/`)

**Syntax:** `operand1 / operand2`

**Description:** Divides the first value by the second.

**Examples:**
```gql
RETURN 10 / 2 AS quotient;              -- Returns: 5
RETURN 7 / 2 AS integer_div;            -- Returns: 3 (integer division)
RETURN 7.0 / 2 AS real_div;             -- Returns: 3.5 (real division)

-- Calculate average
MATCH (p:Person)
RETURN sum(p.age) / count(p) AS average_age;
```

**Error Handling:**
- Division by zero: Returns `EvalError.DivisionByZero` at runtime

### Modulo (`%`)

**Syntax:** `dividend % divisor`

**Description:** Computes the remainder of integer division.

**Examples:**
```gql
RETURN 17 % 5 AS remainder;             -- Returns: 2
RETURN 20 % 4 AS even_check;            -- Returns: 0 (evenly divisible)
RETURN -17 % 5 AS negative_dividend;    -- Returns: -2
RETURN 17 % -5 AS negative_divisor;     -- Returns: 2

-- Find even numbers
MATCH (n:Number)
WHERE n.value % 2 = 0
RETURN n.value AS even_numbers;

-- Combined with other operators
RETURN 10 + 17 % 5 AS result;           -- Returns: 12 (precedence: 10 + (17 % 5))
```

**Type Compatibility:**
- Requires integer operands
- Non-integer operands: Returns `EvalError.TypeMismatch`

**Implementation:** Uses Zig's `@rem` builtin for optimal performance (O(1)).

---

## Unary Operators

Unary operators operate on a single operand.

### Unary Plus (`+`)

**Syntax:** `+expression`

**Description:** Returns the operand unchanged. Used for symmetry with unary minus.

**Examples:**
```gql
RETURN +42 AS positive;                 -- Returns: 42
RETURN +3.14 AS positive_decimal;       -- Returns: 3.14
RETURN + +42 AS double_unary;           -- Returns: 42

-- Mixed with unary minus
RETURN +-42 AS result;                  -- Returns: -42 (parsed as +(−42))
RETURN -+42 AS result;                  -- Returns: -42 (parsed as −(+42))
```

**Type Support:**
- Integers: Returns value unchanged
- Decimals: Returns value unchanged
- Other types: Returns `EvalError.TypeMismatch`

**Implementation:** Zero-cost at evaluation (returns value unchanged).

### Unary Minus (`-`)

**Syntax:** `-expression`

**Description:** Negates a numeric value.

**Examples:**
```gql
RETURN -42 AS negative;                 -- Returns: -42
RETURN -(-5) AS double_negative;        -- Returns: 5

MATCH (p:Person)
RETURN p.name, -p.debt AS credit;
```

### Logical NOT

**Syntax:** `NOT expression`

**Description:** Negates a boolean value.

**Examples:**
```gql
RETURN NOT true AS result;              -- Returns: false
RETURN NOT false AS result;             -- Returns: true
RETURN NOT NOT true AS double_not;      -- Returns: true

MATCH (p:Person)
WHERE NOT p.active
RETURN p.name;
```

---

## Comparison Operators

Comparison operators compare two values and return a boolean result.

### Equality (`=`)

**Syntax:** `operand1 = operand2`

**Description:** Tests if two values are equal.

**Examples:**
```gql
RETURN 5 = 5 AS result;                 -- Returns: true
RETURN 'hello' = 'hello' AS string_eq;  -- Returns: true
RETURN 5 = 10 AS not_equal;             -- Returns: false

MATCH (p:Person)
WHERE p.age = 30
RETURN p.name;
```

### Inequality (`<>`)

**Syntax:** `operand1 <> operand2`

**Description:** Tests if two values are not equal.

**Examples:**
```gql
RETURN 5 <> 10 AS result;               -- Returns: true
RETURN 'hello' <> 'world' AS string_ne; -- Returns: true
RETURN 5 <> 5 AS same_value;            -- Returns: false

MATCH (p:Person)
WHERE p.status <> 'inactive'
RETURN p.name;
```

### Less Than (`<`)

**Syntax:** `operand1 < operand2`

**Description:** Tests if the first value is less than the second.

**Examples:**
```gql
RETURN 5 < 10 AS result;                -- Returns: true
RETURN 10 < 5 AS reverse;               -- Returns: false
RETURN 5 < 5 AS equal;                  -- Returns: false

MATCH (p:Person)
WHERE p.age < 18
RETURN p.name AS minors;
```

### Less Than or Equal (`<=`)

**Syntax:** `operand1 <= operand2`

**Description:** Tests if the first value is less than or equal to the second.

**Examples:**
```gql
RETURN 5 <= 10 AS result;               -- Returns: true
RETURN 5 <= 5 AS equal;                 -- Returns: true

MATCH (p:Person)
WHERE p.age <= 65
RETURN p.name;
```

### Greater Than (`>`)

**Syntax:** `operand1 > operand2`

**Description:** Tests if the first value is greater than the second.

**Examples:**
```gql
RETURN 10 > 5 AS result;                -- Returns: true
RETURN 5 > 10 AS reverse;               -- Returns: false

MATCH (p:Person)
WHERE p.salary > 50000
RETURN p.name AS high_earners;
```

### Greater Than or Equal (`>=`)

**Syntax:** `operand1 >= operand2`

**Description:** Tests if the first value is greater than or equal to the second.

**Examples:**
```gql
RETURN 10 >= 5 AS result;               -- Returns: true
RETURN 5 >= 5 AS equal;                 -- Returns: true

MATCH (p:Person)
WHERE p.age >= 18
RETURN p.name AS adults;
```

---

## Logical Operators

Logical operators combine boolean expressions.

### AND

**Syntax:** `expression1 AND expression2`

**Description:** Returns true if both expressions are true.

**Truth Table:**

| A | B | A AND B |
|---|---|---------|
| true | true | true |
| true | false | false |
| false | true | false |
| false | false | false |

**Examples:**
```gql
RETURN true AND true AS result;         -- Returns: true
RETURN true AND false AS result;        -- Returns: false

MATCH (p:Person)
WHERE p.age > 18 AND p.active = true
RETURN p.name;

-- Multiple AND conditions
MATCH (p:Person)
WHERE p.age > 25 AND p.age < 65 AND p.department = 'Engineering'
RETURN p.name;
```

### OR

**Syntax:** `expression1 OR expression2`

**Description:** Returns true if at least one expression is true.

**Truth Table:**

| A | B | A OR B |
|---|---|--------|
| true | true | true |
| true | false | true |
| false | true | true |
| false | false | false |

**Examples:**
```gql
RETURN true OR false AS result;         -- Returns: true
RETURN false OR false AS result;        -- Returns: false

MATCH (p:Person)
WHERE p.department = 'Engineering' OR p.department = 'Sales'
RETURN p.name;

-- Combined with AND
MATCH (p:Person)
WHERE (p.age > 30 OR p.salary > 60000) AND p.active = true
RETURN p.name;
```

---

## String Operators

String operators perform text operations.

### Concatenation (`||`)

**Syntax:** `string1 || string2`

**Description:** Concatenates two strings.

**Examples:**
```gql
RETURN 'Hello' || ' ' || 'World' AS greeting;  -- Returns: 'Hello World'
RETURN 'Mr. ' || 'Smith' AS title;             -- Returns: 'Mr. Smith'

MATCH (p:Person)
RETURN p.first_name || ' ' || p.last_name AS full_name;
```

### STARTS WITH

**Syntax:** `string STARTS WITH prefix`

**Description:** Tests if a string starts with a given prefix.

**Examples:**
```gql
RETURN 'hello' STARTS WITH 'he' AS result;     -- Returns: true
RETURN 'world' STARTS WITH 'he' AS result;     -- Returns: false

MATCH (p:Person)
WHERE p.email STARTS WITH 'admin@'
RETURN p.name AS admins;
```

### ENDS WITH

**Syntax:** `string ENDS WITH suffix`

**Description:** Tests if a string ends with a given suffix.

**Examples:**
```gql
RETURN 'hello' ENDS WITH 'lo' AS result;       -- Returns: true
RETURN 'world' ENDS WITH 'ld' AS result;       -- Returns: true

MATCH (p:Person)
WHERE p.email ENDS WITH '@company.com'
RETURN p.name AS company_employees;
```

### CONTAINS

**Syntax:** `string CONTAINS substring`

**Description:** Tests if a string contains a substring.

**Examples:**
```gql
RETURN 'hello world' CONTAINS 'lo wo' AS result;  -- Returns: true
RETURN 'hello world' CONTAINS 'xyz' AS result;    -- Returns: false

MATCH (p:Person)
WHERE p.bio CONTAINS 'engineer'
RETURN p.name;
```

### Pattern Matching (`=~`)

**Syntax:** `text =~ 'pattern'`

**Description:** Tests if text matches a regular expression pattern.

**Examples:**
```gql
RETURN 'hello123' =~ '[a-z]+[0-9]+' AS result;  -- Returns: true
RETURN 'test@example.com' =~ '.*@.*\\.com' AS email_check;

MATCH (p:Person)
WHERE p.email =~ '.*@(gmail|yahoo)\\.com'
RETURN p.name AS personal_email_users;
```

---

## Postfix Operators

Postfix operators operate on the right side of an operand.

### Member Access (`.`)

**Syntax:** `object.property`

**Description:** Accesses a property of a node, relationship, or map.

**Examples:**
```gql
MATCH (p:Person) RETURN p.name, p.age;

MATCH (p:Person)-[r:KNOWS]->(f:Person)
RETURN p.name, r.since, f.name;

-- Nested property access
RETURN {person: {name: 'Alice', age: 30}}.person.name AS result;  -- Returns: 'Alice'
```

### Array Index Access (`[index]`)

**Syntax:** `array_expression[index_expression]`

**Description:** Accesses an element from a list/array by its zero-based index.

**Examples:**
```gql
RETURN [1, 2, 3][0] AS first;                  -- Returns: 1
RETURN [1, 2, 3][2] AS third;                  -- Returns: 3

-- Function result indexing
MATCH (n)
RETURN labels(n)[0] AS primary_label;

-- Chained indexing
RETURN [[1, 2], [3, 4]][0][1] AS result;       -- Returns: 2

-- Dynamic index expression
RETURN [10, 20, 30][1 + 1] AS result;          -- Returns: 30

-- Combined with other operators
RETURN [10, 20, 30][17 % 3] AS result;         -- Returns: 30 (17 % 3 = 2)

-- Property access on indexed element
MATCH (n:Person)
RETURN n.friends[0].name AS best_friend;
```

**Behavior:**
- **Out of bounds:** Returns `null` (no error)
- **Negative indices:** Returns `null` (does not wrap around)
- **Non-list target:** Returns `null`
- **Non-integer index:** Returns `EvalError.TypeMismatch`

**Implementation:** O(1) access with bounds checking.

### Function Call (`()`)

**Syntax:** `function_name(arg1, arg2, ...)`

**Description:** Calls a built-in or user-defined function.

**Examples:**
```gql
RETURN count(*) AS total;
RETURN length('hello') AS string_length;      -- Returns: 5
RETURN upper('hello') AS uppercase;           -- Returns: 'HELLO'

MATCH (p:Person)
RETURN sum(p.age) AS total_age, avg(p.age) AS average_age;
```

---

## Set Operators

Set operators test membership and null values.

### IN

**Syntax:** `value IN [list]`

**Description:** Tests if a value exists in a list.

**Examples:**
```gql
RETURN 1 IN [1, 2, 3] AS result;               -- Returns: true
RETURN 5 IN [1, 2, 3] AS result;               -- Returns: false
RETURN 'apple' IN ['banana', 'apple', 'orange'] AS result;  -- Returns: true

MATCH (p:Person)
WHERE p.department IN ['Engineering', 'Sales', 'Marketing']
RETURN p.name;
```

### IS NULL

**Syntax:** `value IS NULL`

**Description:** Tests if a value is null.

**Examples:**
```gql
RETURN null IS NULL AS result;                 -- Returns: true
RETURN 5 IS NULL AS result;                    -- Returns: false

MATCH (p:Person)
WHERE p.middle_name IS NULL
RETURN p.name AS no_middle_name;
```

### IS NOT NULL

**Syntax:** `value IS NOT NULL`

**Description:** Tests if a value is not null.

**Examples:**
```gql
RETURN 5 IS NOT NULL AS result;                -- Returns: true
RETURN null IS NOT NULL AS result;             -- Returns: false

MATCH (p:Person)
WHERE p.email IS NOT NULL
RETURN p.name, p.email;
```

---

## Type Conversion and Compatibility

### Automatic Type Promotion

Geode automatically promotes types in arithmetic operations:

```gql
-- INTEGER + REAL → REAL
RETURN 5 + 2.5 AS result;       -- Returns: 7.5 (REAL)

-- INTEGER / INTEGER → INTEGER (if evenly divisible)
RETURN 10 / 2 AS result;        -- Returns: 5 (INTEGER)

-- INTEGER / REAL → REAL
RETURN 10 / 2.0 AS result;      -- Returns: 5.0 (REAL)
```

### Type Compatibility Matrix

| Operator | INTEGER | REAL | STRING | BOOLEAN | NULL |
|----------|---------|------|--------|---------|------|
| `+`, `-`, `*`, `/`, `%` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `=`, `<>`, `<`, `>`, `<=`, `>=` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `AND`, `OR`, `NOT` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `\|\|` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `STARTS WITH`, `ENDS WITH`, `CONTAINS` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `IN` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `IS NULL`, `IS NOT NULL` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Common Patterns

### Pattern 1: Range Checks

```gql
-- Age between 18 and 65 (inclusive)
MATCH (p:Person)
WHERE p.age >= 18 AND p.age <= 65
RETURN p.name;
```

### Pattern 2: String Filtering

```gql
-- Find company emails
MATCH (p:Person)
WHERE p.email ENDS WITH '@company.com'
  AND p.email STARTS WITH 'admin'
RETURN p.name;
```

### Pattern 3: Null Handling

```gql
-- Find people with optional middle names
MATCH (p:Person)
RETURN p.first_name,
       CASE WHEN p.middle_name IS NOT NULL
            THEN p.first_name || ' ' || p.middle_name || ' ' || p.last_name
            ELSE p.first_name || ' ' || p.last_name
       END AS full_name;
```

### Pattern 4: List Membership

```gql
-- Find people in specific departments
MATCH (p:Person)
WHERE p.department IN ['Engineering', 'Sales']
  AND p.level IN ['Senior', 'Lead', 'Principal']
RETURN p.name, p.department, p.level;
```

---

## Error Handling

### Division by Zero

```gql
-- Will raise EvalError.DivisionByZero
RETURN 10 / 0 AS result;

-- Safe division with CASE
RETURN CASE WHEN count(p) > 0 THEN sum(p.value) / count(p) ELSE 0 END AS avg;
```

### Type Mismatch

```gql
-- Will raise EvalError.TypeMismatch
RETURN 'hello' + 5 AS result;

-- Correct: Convert types first
RETURN 'hello' || toString(5) AS result;  -- Returns: 'hello5'
```

### Null Propagation

```gql
-- Nulls propagate through most operators
RETURN null + 5 AS result;              -- Returns: null
RETURN null = 5 AS result;              -- Returns: null (three-valued logic)

-- Use IS NULL for explicit null checks
RETURN null IS NULL AS result;          -- Returns: true
```

---

## Performance Considerations

### Operator Efficiency

| Operator Type | Typical Performance | Notes |
|---------------|---------------------|-------|
| Arithmetic | O(1) | Fast integer/float operations |
| Comparison | O(1) | Efficient for primitives, O(n) for strings |
| Logical | O(1) | Short-circuit evaluation (AND/OR) |
| String | O(n) | Length-dependent for CONTAINS, STARTS WITH, etc. |
| Array Index | O(1) | Constant-time array access |
| Member Access | O(1) | Hash-based property lookup |

### Optimization Tips

**1. Use indexes for equality checks:**
```gql
-- Fast with index on :Person(email)
MATCH (p:Person) WHERE p.email = 'user@example.com' RETURN p;
```

**2. Avoid expensive string operations in tight loops:**
```gql
-- Inefficient: String concatenation in every row
MATCH (p:Person)
RETURN p.first_name || ' ' || p.last_name AS full_name;

-- Better: Precompute or use database function if available
```

**3. Use short-circuit evaluation:**
```gql
-- AND short-circuits on first false
MATCH (p:Person)
WHERE p.active = false AND expensive_function(p)  -- expensive_function not called if inactive
RETURN p;
```

---

## Quick Reference Card

### Operator Symbols

| Symbol | Name | Example | Result |
|--------|------|---------|--------|
| `+` | Addition | `5 + 3` | `8` |
| `-` | Subtraction | `10 - 3` | `7` |
| `*` | Multiplication | `5 * 3` | `15` |
| `/` | Division | `10 / 2` | `5` |
| `%` | Modulo | `17 % 5` | `2` |
| `=` | Equality | `5 = 5` | `true` |
| `<>` | Inequality | `5 <> 10` | `true` |
| `<` | Less than | `5 < 10` | `true` |
| `>` | Greater than | `10 > 5` | `true` |
| `<=` | Less or equal | `5 <= 5` | `true` |
| `>=` | Greater or equal | `10 >= 5` | `true` |
| `AND` | Logical AND | `true AND false` | `false` |
| `OR` | Logical OR | `true OR false` | `true` |
| `NOT` | Logical NOT | `NOT true` | `false` |
| `\|\|` | Concatenation | `'a' \|\| 'b'` | `'ab'` |
| `.` | Member access | `p.name` | Property value |
| `[]` | Array index | `[1,2,3][0]` | `1` |
| `IN` | Membership | `1 IN [1,2]` | `true` |
| `IS NULL` | Null check | `null IS NULL` | `true` |

---

## Practice Exercises

### Exercise 1: Operator Precedence

**Question:** What does this expression return?

```gql
RETURN 10 + 2 * 5 % 3 AS result;
```

**Answer:** `10` (Evaluation: `10 + ((2 * 5) % 3)` = `10 + 0` = `10`)

### Exercise 2: String Operations

**Task:** Write a query to find people with Gmail or Yahoo email addresses.

**Solution:**
```gql
MATCH (p:Person)
WHERE p.email =~ '.*@(gmail|yahoo)\\.com'
RETURN p.name, p.email;
```

### Exercise 3: Array Indexing

**Task:** Get the second friend's name for each person.

**Solution:**
```gql
MATCH (p:Person)
WHERE size(p.friends) >= 2
RETURN p.name, p.friends[1].name AS second_friend;
```

---

## Next Steps

- **[Type Conversion Reference](/docs/reference/type-conversion/)** - Type casting and conversion functions
- **[GQL Functions](/docs/reference/api-reference-complete/)** - Built-in function reference
- **[Query Optimization](/docs/query/performance-tuning/)** - Optimize operator usage
- **[GQL Guide](/docs/gql/guide/)** - Complete GQL syntax guide

---

## Related Documentation

- [GQL Compliance](/docs/gql/conformance-profile/) - ISO/IEC 39075:2024 standard adherence
- [EXPLAIN and PROFILE](/docs/query/explain-profile/) - Analyze operator execution
- [Data Types Reference](/docs/data-types/) - Complete type system
- [Advanced GQL Patterns](/docs/gql/advanced-patterns/) - Complex query patterns

---

**Last Updated:** January 24, 2026
**Geode Version:** v0.18.0+
**ISO GQL Compliance:** 100% (70/70 tests passing)
