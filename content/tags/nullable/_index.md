---
title: "Nullable Fields & NULL Handling"
description: "Understanding and managing optional properties and NULL values in Geode graph database with proper three-valued logic"
keywords: ["nullable", "NULL", "optional fields", "missing data", "NULL handling", "optional properties", "three-valued logic", "IS NULL", "COALESCE", "NULLIF", "NULL semantics"]
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Nullable Fields & NULL Handling

Nullable fields in Geode allow properties to contain NULL values, representing missing, unknown, or inapplicable data. Understanding NULL semantics is critical for correct graph queries, data modeling, and application logic. Geode implements three-valued logic according to the GQL standard, where expressions can evaluate to TRUE, FALSE, or NULL.

## Understanding NULL in Graph Databases

NULL is not a value—it represents the absence of a value. In graph databases, NULL has specific semantic meanings:

- **Missing Information**: Data not yet collected (e.g., middle name)
- **Inapplicable Data**: Property doesn't apply (e.g., retirement date for active employees)
- **Unknown Values**: Information exists but is unknown (e.g., exact birth date)
- **Optional Relationships**: Edge properties that may not exist

Unlike relational databases where NULL handling is often an afterthought, graph databases require explicit modeling of optionality because NULL values affect traversals, aggregations, and pattern matching.

## Defining Nullable vs NOT NULL Properties

By default in Geode, all properties are nullable unless explicitly declared as NOT NULL. This default-nullable behavior requires careful consideration during schema design.

### Explicit Nullability

```gql
-- Best practice: explicitly declare nullability intent
CREATE NODE TYPE Person (
    id STRING NOT NULL,                 -- Required: primary identifier
    name STRING NOT NULL,               -- Required: every person has a name
    middle_name STRING NULL,            -- Explicitly nullable (optional)
    nickname STRING,                    -- Implicitly nullable
    email STRING NOT NULL,              -- Required for communication
    phone STRING NULL,                  -- Optional contact method
    date_of_birth DATE,                 -- May be unknown
    date_of_death DATE                  -- NULL for living persons
);

-- Edge with required and optional properties
CREATE EDGE TYPE WORKS_FOR (
    start_date DATE NOT NULL,           -- Employment must have start date
    end_date DATE,                      -- NULL = currently employed
    position STRING NOT NULL,
    salary DECIMAL,                     -- May be confidential/unknown
    department STRING NOT NULL
);
```

### NOT NULL Constraints

NOT NULL constraints ensure data completeness for critical properties:

```gql
CREATE NODE TYPE Product (
    sku STRING NOT NULL,                -- Must have identifier
    name STRING NOT NULL,               -- Must be named
    price DECIMAL NOT NULL,             -- Must have price
    description TEXT,                   -- Optional
    manufacturer STRING,                -- May be unknown
    discontinued_date DATE              -- NULL = still active
);
```

Using NOT NULL with defaults provides sensible fallbacks:

```gql
CREATE NODE TYPE User (
    id STRING NOT NULL DEFAULT gen_random_uuid(),
    email STRING NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status STRING NOT NULL DEFAULT 'active',
    last_login TIMESTAMP,               -- NULL until first login
    preferences JSONB NOT NULL DEFAULT '{}'::JSONB  -- Empty but not NULL
);
```

## NULL in GQL Queries

### Testing for NULL Values

The only correct way to test for NULL is using `IS NULL` or `IS NOT NULL`:

```gql
-- Find people without middle names
MATCH (p:Person)
WHERE p.middle_name IS NULL
RETURN p.name;

-- Find people with known phone numbers
MATCH (p:Person)
WHERE p.phone IS NOT NULL
RETURN p.name, p.phone;

-- Find current employees (no end_date)
MATCH (p:Person)-[e:WORKS_FOR]->(c:Company)
WHERE e.end_date IS NULL
RETURN p.name, c.name, e.start_date;
```

**Common mistake**: Using equality operators with NULL:

```gql
-- WRONG: This will NEVER match anything, even NULL values
MATCH (p:Person)
WHERE p.middle_name = NULL  -- Always evaluates to NULL (unknown), never TRUE
RETURN p;

-- WRONG: This also doesn't work as expected
MATCH (p:Person)
WHERE p.middle_name != NULL  -- Also always NULL
RETURN p;
```

Why? In three-valued logic, `NULL = NULL` is NULL (unknown), not TRUE. You can't compare unknown to unknown.

### COALESCE: Providing Fallback Values

COALESCE returns the first non-NULL value from a list of expressions:

```gql
-- Use nickname if available, otherwise use formal name
MATCH (p:Person)
RETURN
    p.name,
    COALESCE(p.nickname, p.name) AS display_name;

-- Multi-level fallback
MATCH (p:Person)
RETURN
    COALESCE(p.mobile_phone, p.home_phone, p.work_phone, 'No phone') AS contact_number;

-- Default to zero for calculations
MATCH (p:Product)
RETURN
    p.name,
    p.base_price,
    COALESCE(p.discount_amount, 0) AS discount,
    p.base_price - COALESCE(p.discount_amount, 0) AS final_price;
```

Python client example:

```python
# Python - COALESCE in queries
from geode_client import Client

client = Client(host="localhost", port=3141)

async with client.connection() as conn:
    # Get user display names with fallback logic
    result, _ = await conn.query("""
        MATCH (u:User)
        RETURN
            u.id,
            COALESCE(u.display_name, u.username, u.email) AS name,
            COALESCE(u.avatar_url, '/default-avatar.png') AS avatar
        ORDER BY name
    """)

    for row in result.bindings:
        print(f"{row['name']} - Avatar: {row['avatar']}")
```

### NULLIF: Converting Values to NULL

NULLIF returns NULL if two expressions are equal, otherwise returns the first expression. Useful for treating specific values as NULL:

```gql
-- Treat empty strings as NULL
MATCH (p:Person)
RETURN
    p.name,
    NULLIF(p.middle_name, '') AS middle_name,
    NULLIF(p.phone, 'N/A') AS phone;

-- Treat zero as NULL for optional numeric fields
MATCH (p:Product)
RETURN
    p.name,
    NULLIF(p.discount_pct, 0) AS discount;
```

Combined with COALESCE:

```gql
-- Normalize empty strings to NULL, then provide default
MATCH (p:Person)
RETURN
    COALESCE(NULLIF(p.bio, ''), 'No bio provided') AS bio;
```

## NULL in Comparisons and Three-Valued Logic

Geode implements three-valued logic (TRUE, FALSE, NULL) for all boolean expressions. Understanding this is crucial for correct query behavior.

### Comparison Truth Table

| Expression | p.age IS NULL | p.age IS NOT NULL |
|------------|---------------|-------------------|
| `p.age = 25` | NULL | TRUE or FALSE |
| `p.age > 18` | NULL | TRUE or FALSE |
| `p.age IS NULL` | TRUE | FALSE |

```gql
-- Three-valued logic in action
MATCH (p:Person)
WHERE p.age > 18  -- Excludes NULL ages (NULL > 18 = NULL, not TRUE)
RETURN p.name;

-- Include people with unknown age
MATCH (p:Person)
WHERE p.age > 18 OR p.age IS NULL
RETURN p.name, COALESCE(p.age, 'Unknown') AS age;
```

### NULL Propagation in Expressions

NULL propagates through most expressions:

```gql
MATCH (p:Person)
RETURN
    p.name,
    p.age,
    p.age + 5,                    -- NULL if age is NULL
    p.age * 1.1,                  -- NULL if age is NULL
    p.age > 18,                   -- NULL if age is NULL
    p.first_name || ' ' || p.middle_name || ' ' || p.last_name
                                  -- NULL if any part is NULL
;
```

Safe string concatenation:

```gql
MATCH (p:Person)
RETURN
    -- Handles NULL middle names
    p.first_name || ' ' || COALESCE(p.middle_name || ' ', '') || p.last_name AS full_name;
```

## NULL in Aggregations

Aggregate functions (except COUNT(*)) ignore NULL values:

```gql
-- These ignore NULL values
MATCH (p:Person)
RETURN
    COUNT(*) AS total_people,              -- Counts all nodes
    COUNT(p.age) AS people_with_age,       -- Counts non-NULL ages
    AVG(p.age) AS average_age,             -- Average of non-NULL ages
    MIN(p.age) AS youngest,                -- Minimum non-NULL age
    MAX(p.age) AS oldest;                  -- Maximum non-NULL age

-- Count NULL values explicitly
MATCH (p:Person)
RETURN
    COUNT(*) AS total,
    COUNT(p.phone) AS with_phone,
    COUNT(*) - COUNT(p.phone) AS without_phone;
```

Go client example:

```go
// Go client - handling NULL in aggregations
package main

import (
    "context"
    "database/sql"
    "fmt"
    "geodedb.com/geode"
)

func analyzeUserData(ctx context.Context, db *geode.DB) error {
    var total, withAge, avgAge sql.NullFloat64

    err := db.QueryRowContext(ctx, `
        MATCH (u:User)
        RETURN
            COUNT(*) AS total,
            COUNT(u.age) AS with_age,
            AVG(u.age) AS avg_age
    `).Scan(&total, &withAge, &avgAge)

    if err != nil {
        return err
    }

    fmt.Printf("Total users: %.0f\n", total.Float64)
    fmt.Printf("Users with age: %.0f\n", withAge.Float64)

    if avgAge.Valid {
        fmt.Printf("Average age: %.1f\n", avgAge.Float64)
    } else {
        fmt.Println("Average age: No data")
    }

    return nil
}
```

## NULL in Sorting

NULL values require explicit handling in ORDER BY clauses:

```gql
-- NULL values sort last by default (in ascending order)
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY p.age ASC;

-- NULL values first
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY p.age ASC NULLS FIRST;

-- NULL values last
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY p.age DESC NULLS LAST;

-- Use COALESCE to control NULL sorting
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY COALESCE(p.age, 999) ASC;  -- Treat NULL as 999
```

## Application-Level NULL Handling

### Rust Client with Option Types

```rust
// Rust client - type-safe NULL handling with Option<T>
use geode_client::{Client, Value};
use std::collections::HashMap;

#[derive(Debug)]
struct Person {
    id: String,
    name: String,
    middle_name: Option<String>,  // NULL maps to None
    age: Option<i32>,
    phone: Option<String>,
}

async fn get_person(client: &Client, id: &str) -> Result<Person, geode_client::Error> {
    let mut params = HashMap::new();
    params.insert("id", Value::String(id.to_string()));

    let result = client.execute(
        "MATCH (p:Person {id: $id}) RETURN p.id, p.name, p.middle_name, p.age, p.phone",
        &params
    ).await?;

    let row = result.bindings.first().ok_or(geode_client::Error::NotFound)?;

    Ok(Person {
        id: row["p.id"].as_str().unwrap().to_string(),
        name: row["p.name"].as_str().unwrap().to_string(),
        middle_name: row["p.middle_name"].as_str().map(String::from),  // NULL → None
        age: row["p.age"].as_i64().map(|i| i as i32),
        phone: row["p.phone"].as_str().map(String::from),
    })
}

fn format_full_name(person: &Person) -> String {
    match &person.middle_name {
        Some(middle) => format!("{} {} {}", person.name, middle, person.name),
        None => person.name.clone(),
    }
}
```

### Python Client with None

```python
# Python - NULL handling with None
from typing import Optional
from dataclasses import dataclass
from geode_client import Client

@dataclass
class User:
    id: str
    email: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    last_login: Optional[str] = None

async def create_user(client: Client, email: str, phone: Optional[str] = None):
    """Create user with optional phone number."""
    params = {"email": email}

    if phone is not None:
        params["phone"] = phone
        query = "INSERT (u:User {email: $email, phone: $phone}) RETURN u"
    else:
        query = "INSERT (u:User {email: $email}) RETURN u"

    result, _ = await client.query(query, params)
    return result.bindings[0]["u"]

async def get_contact_info(client: Client, user_id: str) -> str:
    """Get contact info with NULL-safe formatting."""
    result, _ = await client.query(
        "MATCH (u:User {id: $id}) RETURN u.email, u.phone",
        {"id": user_id}
    )

    row = result.bindings[0]
    email = row["u.email"]
    phone = row.get("u.phone")  # May be None

    if phone:
        return f"{email} (Phone: {phone})"
    else:
        return f"{email} (No phone)"
```

## Best Practices for NULL Handling

1. **Explicit Nullability**: Always declare whether properties can be NULL in schema
2. **NOT NULL by Default for Key Properties**: IDs, timestamps, required business fields
3. **Use COALESCE for Display**: Provide fallback values in user-facing queries
4. **Document NULL Semantics**: Explain what NULL means for each nullable property
5. **Test NULL Cases**: Write tests for NULL value handling in queries
6. **Avoid NULL in Calculations**: Use COALESCE to provide numeric defaults
7. **Prefer DEFAULT over NULL**: When sensible defaults exist, use them
8. **Type-Safe Clients**: Use Option<T> (Rust), Optional (Python), sql.NullString (Go)

## Common Anti-Patterns

**Anti-pattern**: Using empty strings instead of NULL
```gql
-- BAD: Empty string is not NULL
UPDATE Person SET middle_name = '' WHERE id = '123';  -- Use NULL instead

-- GOOD: NULL represents absence of middle name
UPDATE Person SET middle_name = NULL WHERE id = '123';
```

**Anti-pattern**: Comparing with NULL using `=`
```gql
-- BAD: Never TRUE, always NULL
WHERE p.middle_name = NULL

-- GOOD: Use IS NULL
WHERE p.middle_name IS NULL
```

**Anti-pattern**: Ignoring NULL in business logic
```python
# BAD: age might be None, causing TypeError
def is_adult(person):
    return person.age >= 18

# GOOD: Handle NULL explicitly
def is_adult(person):
    return person.age is not None and person.age >= 18
```

## Troubleshooting

**Query returns no results despite data existing**: Check for NULL comparisons using `=` instead of `IS NULL`

**Aggregations showing unexpected results**: Remember that COUNT, SUM, AVG ignore NULL values

**String concatenation producing NULL**: Use COALESCE to handle NULL components

**Type errors in application**: Ensure client code handles NULL with appropriate types (Option, Optional, Nullable)

## Related Topics

- [Defaults](/tags/defaults) - Default values as alternative to NULL
- [Constraints](/tags/constraints) - NOT NULL constraints and schema rules
- [Validation](/tags/validation) - Validating optional vs required data
- [Data Quality](/tags/data-quality) - Managing data completeness
- [Schemas](/tags/schema/) - Schema design with nullability
- [GQL](/tags/gql) - GQL standard three-valued logic semantics
