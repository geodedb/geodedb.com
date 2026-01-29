---
title: "Type Safety - Strongly Typed Client APIs"
description: "Leverage type-safe APIs in Geode client libraries for compile-time error detection, better IDE support, and more reliable database code."
keywords:
  - type safety
  - strongly typed
  - compile-time checks
  - API design
  - client libraries
  - error prevention
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/type-safety/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Type Safety in Geode Clients

Geode's client libraries emphasize type safety to catch errors at compile time rather than runtime. Strong typing improves code reliability, enables better IDE support, and makes refactoring safer.

## Rust Client Type Safety

The Rust client leverages Rust's type system for maximum safety:

```rust
use geode_client::{Client, Value, params};

async fn typed_query(client: &Client) -> Result<(), Error> {
    let result = client.query(
        "MATCH (u:User {id: $id}) RETURN u.name, u.age",
        Some(params!{"id" => 123_i64})  // Type enforced
    ).await?;

    for row in result.rows() {
        // Explicit type extraction with error handling
        let name: String = row.get("name")?;
        let age: i64 = row.get("age")?;

        // Type mismatch would return Err, not panic
        println!("{} is {} years old", name, age);
    }

    Ok(())
}
```

**Compile-time parameter validation**:
```rust
// The params! macro ensures type correctness
let params = params!{
    "string" => "hello",
    "number" => 42_i64,
    "float" => 3.14_f64,
    "boolean" => true,
    "list" => vec![1, 2, 3],
};
```

## Go Client Type Safety

The Go client uses the standard `database/sql` interface with type-safe scanning:

```go
type User struct {
    ID    int64
    Name  string
    Email string
}

func getUser(db *sql.DB, id int64) (*User, error) {
    row := db.QueryRow(
        "MATCH (u:User {id: $1}) RETURN u.id, u.name, u.email",
        id,  // Type checked at compile time
    )

    var user User
    // Scan enforces type matching
    err := row.Scan(&user.ID, &user.Name, &user.Email)
    if err != nil {
        return nil, err
    }
    return &user, nil
}
```

## Python Client Type Safety

Python uses type hints and runtime validation:

```python
from geode_client import Client, Value
from typing import Optional

async def get_user(client: Client, user_id: int) -> Optional[dict]:
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (u:User {id: $user_id})
            RETURN u.name, u.age
        """, {'user_id': user_id})

        if not result.rows:
            return None

        row = result.rows[0]
        # Value objects provide type-safe extraction
        return {
            'name': row['name'].as_string(),
            'age': row['age'].as_int(),
        }
```

**Value type system**:
```python
# Geode Value objects wrap results with type information
value = row['field']

# Type-safe extraction methods
string_val: str = value.as_string()
int_val: int = value.as_int()
float_val: float = value.as_float()
bool_val: bool = value.as_bool()
list_val: list = value.as_list()
map_val: dict = value.as_map()

# Check type before extraction
if value.is_string():
    process_string(value.as_string())
```

## Query Builder Type Safety

Type-safe query builders prevent syntax errors:

```rust
use geode_client::query::QueryBuilder;

let query = QueryBuilder::new()
    .match_node("u", "User")
    .where_eq("u.status", "active")
    .return_fields(&["u.name", "u.email"])
    .order_by("u.created_at", Order::Desc)
    .limit(10)
    .build();  // Validated at build time
```

## Benefits of Type Safety

**Compile-time error detection**: Catch type mismatches before deployment.

**IDE support**: Autocomplete, inline documentation, and error highlighting.

**Refactoring confidence**: Type system catches breaking changes.

**Self-documenting code**: Types serve as inline documentation.

**Fewer runtime errors**: Eliminate entire classes of bugs.

## Best Practices

**Use explicit types**: Don't rely on inference for important values.

**Handle extraction errors**: Type conversion can fail; handle errors gracefully.

**Leverage query builders**: They provide compile-time syntax validation.

**Define domain types**: Map database results to strongly-typed domain objects.

## Related Topics

- [Rust Client](/tags/rust/)
- [Go Client](/tags/go/)
- [Python Client](/tags/python/)
- [Client Libraries](/docs/client-libraries/)
- [Error Handling](/tags/error-handling/)
