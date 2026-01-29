---
title: "Prepared Statements - Parameterized Queries"
description: "Use prepared statements in Geode for secure parameterized queries, preventing SQL injection and improving query performance through plan caching."
keywords:
  - prepared statements
  - parameterized queries
  - SQL injection prevention
  - query caching
  - security
  - performance
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/prepared-statements/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Prepared Statements in Geode

Prepared statements (parameterized queries) are essential for secure and efficient database operations. They separate query structure from data, preventing injection attacks and enabling query plan caching for better performance.

## Why Use Prepared Statements?

**Security**: Parameters are never interpreted as GQL code, eliminating injection vulnerabilities.

**Performance**: Query plans are cached and reused, avoiding repeated parsing and optimization.

**Correctness**: Proper type handling for all data types including strings with special characters.

## Basic Usage

**Python client**:
```python
from geode_client import Client

async def find_user(user_id: int):
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Parameters passed separately from query
        result, _ = await conn.query("""
            MATCH (u:User {id: $user_id})
            RETURN u.name, u.email
        """, {'user_id': user_id})  # Safe parameterization
        return result
```

**Go client**:
```go
import (
    "database/sql"
    _ "geodedb.com/geode"
)

func findUser(db *sql.DB, userID int) (*User, error) {
    row := db.QueryRow(
        "MATCH (u:User {id: $1}) RETURN u.name, u.email",
        userID,  // Parameter binding
    )

    var name, email string
    err := row.Scan(&name, &email)
    return &User{Name: name, Email: email}, err
}
```

**Rust client**:
```rust
use geode_client::{Client, params};

async fn find_user(client: &Client, user_id: i64) -> Result<User, Error> {
    let result = client.query(
        "MATCH (u:User {id: $user_id}) RETURN u.name, u.email",
        Some(params!{"user_id" => user_id})  // Type-safe parameters
    ).await?;

    // Process result...
    Ok(user)
}
```

## Injection Prevention

**Vulnerable code (NEVER DO THIS)**:
```python
# DANGEROUS: String concatenation allows injection
user_input = "'; DELETE (n); MATCH (x"
query = f"MATCH (u:User {{name: '{user_input}'}}) RETURN u"
await conn.query(query)  # Injection attack!
```

**Safe code**:
```python
# SAFE: Parameters are never interpreted as GQL
user_input = "'; DELETE (n); MATCH (x"
await conn.query(
    "MATCH (u:User {name: $name}) RETURN u",
    {'name': user_input}  # Treated as literal string value
)
```

## Parameter Types

Geode supports parameters for all GQL data types:

```python
# Various parameter types
await conn.query("""
    CREATE (n:Node {
        string_val: $str,
        int_val: $num,
        float_val: $decimal,
        bool_val: $flag,
        list_val: $items,
        map_val: $metadata,
        null_val: $empty
    })
""", {
    'str': 'hello',
    'num': 42,
    'decimal': 3.14,
    'flag': True,
    'items': [1, 2, 3],
    'metadata': {'key': 'value'},
    'empty': None
})
```

## Batch Operations with Parameters

Use UNWIND with parameter lists for efficient batch operations:

```python
users = [
    {'name': 'Alice', 'email': 'alice@example.com'},
    {'name': 'Bob', 'email': 'bob@example.com'},
]

await conn.query("""
    UNWIND $users AS user
    CREATE (u:User {name: user.name, email: user.email})
""", {'users': users})
```

## Performance Benefits

Prepared statements enable query plan caching:

1. First execution: Parse query, optimize, cache plan
2. Subsequent executions: Reuse cached plan with new parameters

For frequently executed queries, this eliminates parsing overhead entirely.

## Best Practices

**Always use parameters**: Never concatenate user input into queries.

**Use meaningful parameter names**: `$user_id` is clearer than `$1` or `$p`.

**Validate at application level**: Parameters prevent injection but don't validate business logic.

**Batch with UNWIND**: For multiple similar operations, use UNWIND with a parameter list instead of multiple queries.

## Related Topics

- [Security](/tags/security/)
- [Performance](/tags/performance/)
- [Query Optimization](/tags/query-optimization/)
- [GQL Reference](/tags/gql-reference/)
- [Client Libraries](/docs/client-libraries/)
