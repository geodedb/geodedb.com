---
title: "Default Values"
description: "Setting default property values for nodes and edges in Geode graph database using static, dynamic, and computed defaults"
keywords: ["default values", "DEFAULT", "default constraint", "auto-populate", "column defaults", "initial values", "NOW()", "UUID", "computed defaults", "GQL defaults"]
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Default Values

Default values in Geode automatically populate node and edge properties when they are not explicitly provided during INSERT operations. By leveraging defaults, you reduce boilerplate code in applications, enforce consistent initial states, and encode business logic directly in the schema. Geode supports static defaults, dynamic function-based defaults, and computed defaults that reference other properties.

## Why Use Default Values

Default values serve several critical purposes in graph database design:

- **Reduce Application Complexity**: Move initialization logic from application code to the database
- **Ensure Consistency**: Guarantee that properties have predictable initial values
- **Auto-Generate Identifiers**: Automatically create UUIDs, timestamps, and sequential IDs
- **Enforce Business Rules**: Set appropriate initial states based on domain requirements
- **Simplify APIs**: Allow client code to omit optional properties
- **Improve Data Quality**: Prevent NULL values in properties that should have sensible defaults

## Static Default Values

Static defaults assign fixed literal values when properties are omitted. These are the simplest and most common type of default.

```gql
-- Node type with static defaults
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: DEFAULT, NOT NULL — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE PersonType AS {
  id STRING,
  name STRING,
  status STRING,  -- All new users start as active
  role STRING,  -- Default role is regular user
  verified BOOLEAN,  -- Email not verified initially
  notifications_enabled BOOLEAN,
  theme STRING
};

-- Edge type with static metadata defaults
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: DEFAULT, NOT NULL — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE FOLLOWSType AS {
  followed_at TIMESTAMP,
  notification_enabled BOOLEAN,
  relationship_type STRING  -- vs 'close_friend', 'muted'
};

-- Product with pricing defaults
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: DEFAULT, NOT NULL — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE ProductType AS {
  sku STRING,
  name STRING,
  price DECIMAL,
  tax_rate DECIMAL,  -- 8% sales tax
  discount_pct DECIMAL,  -- No discount by default
  in_stock BOOLEAN
};
```

Using nodes with static defaults:

```python
# Python client - defaults applied automatically
from geode_client import Client

client = Client(host="localhost", port=3141)

async with client.connection() as conn:
    # Only provide required fields, defaults fill in the rest
    result, _ = await conn.query(
        "INSERT (p:Person {id: $id, name: $name}) RETURN p",
        {"id": "user-001", "name": "Alice"}
    )

    user = result.bindings[0]["p"]
    assert user["status"] == "active"
    assert user["role"] == "user"
    assert user["verified"] == False
    assert user["notifications_enabled"] == True
```

## Dynamic Function-Based Defaults

Dynamic defaults use built-in functions to generate values at insertion time. These are essential for timestamps, UUIDs, and user context.

```gql
-- Auto-generate identifiers and timestamps
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: DEFAULT, NOT NULL — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE PersonType AS {
  id STRING,  -- Random UUID v4
  name STRING,
  created_at TIMESTAMP,  -- Current timestamp
  updated_at TIMESTAMP,
  created_by STRING  -- Authenticated user
};

-- Sequential order numbers
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: DEFAULT — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE OrderType AS {
  id STRING,
  order_number STRING,  -- Custom sequence function
  placed_at TIMESTAMP,
  status STRING
};

-- Date-based defaults
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: DEFAULT — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE EventType AS {
  id STRING,
  event_date DATE,
  created_at TIMESTAMP,
  expires_at TIMESTAMP
};
```

### Common Default Functions

Geode provides several built-in functions for dynamic defaults:

| Function | Returns | Description |
|----------|---------|-------------|
| `uuid_v4()` | STRING | Random UUID v4 (preferred) |
| `uuid_generate_v4()` | STRING | Alternative UUID generator |
| `NOW()` | TIMESTAMP | Current timestamp with timezone |
| `CURRENT_TIMESTAMP()` | TIMESTAMP | Alias for NOW() |
| `CURRENT_DATE()` | DATE | Current date without time |
| `CURRENT_TIME()` | TIME | Current time without date |
| `CURRENT_USER()` | STRING | Authenticated user identifier |
| `CURRENT_DATABASE()` | STRING | Database name |

Example with multiple dynamic defaults:

```go
// Go client - dynamic defaults in action
package main

import (
    "context"
    "fmt"
    "geodedb.com/geode"
)

func createEvent(ctx context.Context, db *geode.DB, name string) error {
    // Only provide name, all other fields use defaults
    result, err := db.QueryContext(ctx,
        "INSERT (e:Event {name: $1}) RETURN e",
        name)
    if err != nil {
        return err
    }

    var event struct {
        ID        string
        Name      string
        EventDate string
        CreatedAt string
        ExpiresAt string
    }

    if result.Next() {
        if err := result.Scan(&event); err != nil {
            return err
        }
    }

    fmt.Printf("Created event with auto-generated ID: %s\n", event.ID)
    fmt.Printf("Event date: %s, Expires: %s\n", event.EventDate, event.ExpiresAt)
    return nil
}
```

## Expression-Based Defaults

Expression defaults use GQL expressions to compute values based on literal values, functions, or other properties in the same node.

```gql
-- Computed string expressions
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: DEFAULT, NOT NULL — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE OrderType AS {
  id STRING,
  sequence_number INTEGER,
  order_number STRING,
  -- Generates: 'ORD-1', 'ORD-2', etc. Zero-padding has no built-in
  -- (there is no LPAD function), so pad in the client if you need it.
  created_at TIMESTAMP,
  year STRING,
  month STRING
};

-- Computed numeric expressions
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: DEFAULT, NOT NULL — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE ProductType AS {
  base_price DECIMAL,
  tax_rate DECIMAL,
  shipping_cost DECIMAL,
  total_price DECIMAL
};

-- Conditional expressions with CASE
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: DEFAULT, NOT NULL — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE UserType AS {
  user_type STRING,  -- 'premium', 'standard', 'trial'
  max_uploads INTEGER,
  storage_gb INTEGER
};
```

Rust client example:

```rust
// Rust client - inserting with computed defaults
use geode_client::{Client, Value};
use std::collections::HashMap;

async fn create_product(client: &Client, base_price: f64) -> Result<(), geode_client::Error> {
    let mut params = HashMap::new();
    params.insert("base_price", Value::Float(base_price));

    // tax_rate, shipping_cost, and total_price all computed via defaults
    let result = client.execute(
        "INSERT (p:Product {base_price: $base_price}) RETURN p",
        &params
    ).await?;

    if let Some(row) = result.bindings.first() {
        let product = &row["p"];
        println!("Created product with computed total: {:?}", product["total_price"]);
    }

    Ok(())
}
```

## Update Defaults (ON UPDATE)

Some properties should be automatically updated whenever a node is modified. Geode supports ON UPDATE defaults for this use case.

```gql
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: DEFAULT, NOT NULL — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE PersonType AS {
  id STRING,
  name STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,  -- Auto-update on modification
  modified_by STRING
};

-- Usage
INSERT (p:Person {id: 'user-001', name: 'Alice'});
-- created_at: 2026-01-24 10:00:00, updated_at: 2026-01-24 10:00:00

UPDATE Person SET name = 'Alice Smith' WHERE id = 'user-001';
-- created_at: 2026-01-24 10:00:00, updated_at: 2026-01-24 11:30:00 (auto-updated)
```

## Managing Defaults After Schema Creation

Defaults can be added, modified, or removed after node or edge types are defined.

### Adding Defaults

```gql
-- Add default to existing property
-- Geode has no ALTER LABEL / ALTER GRAPH / property DEFAULT DDL. Labels and
-- properties are schema-free: write the new property with SET, supplying the
-- default yourself.
MATCH (u:User) WHERE u.verified IS NULL SET u.verified = false;

-- Add new property with default
-- Geode has no ALTER LABEL / ALTER GRAPH / property DEFAULT DDL. Labels and
-- properties are schema-free: write the new property with SET, supplying the
-- default yourself.
MATCH (u:User) WHERE u.verified IS NULL SET u.verified = false;
```

### Changing Defaults

```gql
-- Update default value
-- Geode has no ALTER LABEL / ALTER GRAPH / property DEFAULT DDL. Labels and
-- properties are schema-free: write the new property with SET, supplying the
-- default yourself.
MATCH (u:User) WHERE u.verified IS NULL SET u.verified = false;  -- Was 100

-- Change default function
-- Geode has no ALTER LABEL / ALTER GRAPH / property DEFAULT DDL. Labels and
-- properties are schema-free: write the new property with SET, supplying the
-- default yourself.
MATCH (u:User) WHERE u.verified IS NULL SET u.verified = false;  -- Was 1 hour
```

### Removing Defaults

```gql
-- Remove default, making property truly optional
-- Geode has no ALTER LABEL / ALTER GRAPH / property DEFAULT DDL. Labels and
-- properties are schema-free: write the new property with SET, supplying the
-- default yourself.
MATCH (u:User) WHERE u.verified IS NULL SET u.verified = false;

-- Now inserts without 'theme' will have NULL instead of 'light'
```

### Querying Default Definitions

```gql
-- There is no SHOW CREATE NODE TYPE, and no per-label default catalog:
-- labels are schema-free and defaults are supplied by the writer.

-- List all properties with defaults
-- db.propertyKeys() lists property names; Geode stores no per-property
-- type or cardinality metadata.
CALL db.propertyKeys();
```

## Default Value Overrides

Explicitly provided values always override defaults:

```python
# Python - explicit values override defaults
client = Client(host="localhost", port=3141)
async with client.connection() as conn:
    # Uses defaults
    result1 = await conn.execute(
        "INSERT (p:Person {name: 'Alice'}) RETURN p",
        {}
    )
    # p.status = 'active', p.role = 'user'

    # Overrides defaults
    result2 = await conn.execute(
        "INSERT (p:Person {name: 'Bob', status: 'suspended', role: 'admin'}) RETURN p",
        {}
    )
    # p.status = 'suspended', p.role = 'admin'

    # Partial override
    result3 = await conn.execute(
        "INSERT (p:Person {name: 'Carol', status: 'pending'}) RETURN p",
        {}
    )
    # p.status = 'pending', p.role = 'user' (default)
```

## Advanced Patterns

### Multi-Tier Defaults

```gql
-- Cascade defaults based on parent values
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: DEFAULT, NOT NULL — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE SubscriptionType AS {
  tier STRING,
  price DECIMAL,
  max_users INTEGER,
  support_level STRING
};
```

### Temporal Defaults with Business Logic

```gql
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: DEFAULT, NOT NULL — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE ContractType AS {
  signed_date DATE,
  effective_date DATE,
  term_months INTEGER,
  renewal_date DATE,
  next_review DATE
};
```

### Audit Trail Defaults

```gql
-- Geode has no CREATE NODE TYPE / CREATE EDGE TYPE: labels are
-- schema-free. The only typed DDL is CREATE GRAPH TYPE, whose field
-- list is `name TYPE [PRIMARY KEY] [@annotations]` in braces.
-- Not supported in a field definition: DEFAULT — enforce with CREATE CONSTRAINT or at write time.
CREATE GRAPH TYPE AuditedEntityType AS {
  id STRING,
  created_at TIMESTAMP,
  created_by STRING,
  created_from_ip STRING,
  updated_at TIMESTAMP,
  updated_by STRING,
  version INTEGER
};
```

## Performance Considerations

- **Static Defaults**: Zero overhead, resolved at parse time
- **Function Defaults**: Microsecond overhead per call (NOW(), UUID generation)
- **Expression Defaults**: Depends on expression complexity
- **Computed Defaults**: May require property ordering in schema

## Best Practices

1. **Use Defaults for Optional Fields**: Every nullable field should consider if a default makes sense
2. **Prefer Static Over Dynamic**: Use static defaults when values don't change per-insert
3. **Document Default Behavior**: Comment why specific defaults were chosen
4. **Test Default Application**: Verify defaults in unit tests
5. **Version Defaults**: Track default changes in migration scripts
6. **Avoid Expensive Computations**: Don't use complex subqueries in defaults
7. **Set Sensible Defaults**: Choose values that work for 80%+ of cases
8. **Use ON UPDATE Sparingly**: Only for audit fields and timestamps

## Common Patterns

**User Account Initialization**:

```gql
status: 'pending' → requires email verification
verified: false → must confirm email
role: 'user' → standard permissions
created_at: datetime() → track registration time
```

**Order Management**:

```gql
status: 'draft' → orders start as drafts
placed_at: NULL → set when order confirmed
total: 0.0 → computed from line items
```

**Content Creation**:

```gql
published: false → draft by default
created_at: datetime() → auto-timestamp
author: CURRENT_USER() → track creator
```

## Troubleshooting

**Default not applied**: Check if property was explicitly set to NULL

**Expression error**: Verify referenced properties exist and are defined before the defaulted property

**Wrong timestamp**: Ensure timezone configuration matches expectations

**UUID collisions**: Use `uuid_v4()` instead of custom generation

## Related Topics

- [Constraints](/tags/constraints) - NOT NULL and CHECK constraints that work with defaults
- [Nullable](/tags/nullable) - Understanding NULL vs default value behavior
- [Validation](/tags/validation) - Validating default values meet business rules
- [Schemas](/tags/schema/) - Schema design with default values
- [Migrations](/tags/migration/) - Adding defaults in schema migrations
