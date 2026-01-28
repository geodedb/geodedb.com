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
CREATE NODE TYPE Person (
    id STRING NOT NULL,
    name STRING NOT NULL,
    status STRING DEFAULT 'active',      -- All new users start as active
    role STRING DEFAULT 'user',           -- Default role is regular user
    verified BOOLEAN DEFAULT false,       -- Email not verified initially
    notifications_enabled BOOLEAN DEFAULT true,
    theme STRING DEFAULT 'light'
);

-- Edge type with static metadata defaults
CREATE EDGE TYPE FOLLOWS (
    followed_at TIMESTAMP NOT NULL,
    notification_enabled BOOLEAN DEFAULT true,
    relationship_type STRING DEFAULT 'standard'  -- vs 'close_friend', 'muted'
);

-- Product with pricing defaults
CREATE NODE TYPE Product (
    sku STRING NOT NULL,
    name STRING NOT NULL,
    price DECIMAL NOT NULL,
    tax_rate DECIMAL DEFAULT 0.08,       -- 8% sales tax
    discount_pct DECIMAL DEFAULT 0.0,    -- No discount by default
    in_stock BOOLEAN DEFAULT true
);
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
CREATE NODE TYPE Person (
    id STRING DEFAULT gen_random_uuid(),          -- Random UUID v4
    name STRING NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),           -- Current timestamp
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by STRING DEFAULT CURRENT_USER()      -- Authenticated user
);

-- Sequential order numbers
CREATE NODE TYPE Order (
    id STRING DEFAULT gen_random_uuid(),
    order_number STRING DEFAULT next_order_id(),  -- Custom sequence function
    placed_at TIMESTAMP DEFAULT NOW(),
    status STRING DEFAULT 'pending'
);

-- Date-based defaults
CREATE NODE TYPE Event (
    id STRING DEFAULT gen_random_uuid(),
    event_date DATE DEFAULT CURRENT_DATE(),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days')
);
```

### Common Default Functions

Geode provides several built-in functions for dynamic defaults:

| Function | Returns | Description |
|----------|---------|-------------|
| `gen_random_uuid()` | STRING | Random UUID v4 (preferred) |
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
CREATE NODE TYPE Order (
    id STRING DEFAULT gen_random_uuid(),
    sequence_number INTEGER NOT NULL,
    order_number STRING DEFAULT ('ORD-' || LPAD(sequence_number::TEXT, 8, '0')),
    -- Generates: 'ORD-00000001', 'ORD-00000002', etc.

    created_at TIMESTAMP DEFAULT NOW(),
    year STRING DEFAULT EXTRACT(YEAR FROM created_at)::TEXT,
    month STRING DEFAULT EXTRACT(MONTH FROM created_at)::TEXT
);

-- Computed numeric expressions
CREATE NODE TYPE Product (
    base_price DECIMAL NOT NULL,
    tax_rate DECIMAL DEFAULT 0.08,
    shipping_cost DECIMAL DEFAULT 5.99,
    total_price DECIMAL DEFAULT (base_price * (1 + tax_rate) + shipping_cost)
);

-- Conditional expressions with CASE
CREATE NODE TYPE User (
    user_type STRING NOT NULL,  -- 'premium', 'standard', 'trial'
    max_uploads INTEGER DEFAULT CASE
        WHEN user_type = 'premium' THEN 10000
        WHEN user_type = 'standard' THEN 1000
        WHEN user_type = 'trial' THEN 50
        ELSE 10
    END,
    storage_gb INTEGER DEFAULT CASE
        WHEN user_type = 'premium' THEN 1000
        WHEN user_type = 'standard' THEN 100
        ELSE 10
    END
);
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
CREATE NODE TYPE Person (
    id STRING NOT NULL,
    name STRING NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW() ON UPDATE,  -- Auto-update on modification
    modified_by STRING DEFAULT CURRENT_USER() ON UPDATE
);

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
ALTER NODE TYPE Person
ALTER PROPERTY status SET DEFAULT 'active';

-- Add new property with default
ALTER NODE TYPE Person
ADD PROPERTY last_login TIMESTAMP DEFAULT NOW();
```

### Changing Defaults

```gql
-- Update default value
ALTER NODE TYPE User
ALTER PROPERTY max_connections SET DEFAULT 1000;  -- Was 100

-- Change default function
ALTER NODE TYPE Session
ALTER PROPERTY expires_at SET DEFAULT (NOW() + INTERVAL '24 hours');  -- Was 1 hour
```

### Removing Defaults

```gql
-- Remove default, making property truly optional
ALTER NODE TYPE Person
ALTER PROPERTY theme DROP DEFAULT;

-- Now inserts without 'theme' will have NULL instead of 'light'
```

### Querying Default Definitions

```gql
-- View defaults for a node type
SHOW CREATE NODE TYPE Person;

-- List all properties with defaults
SELECT property_name, default_value
FROM SYSTEM.PROPERTY_METADATA
WHERE node_type = 'Person' AND default_value IS NOT NULL;
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
CREATE NODE TYPE Subscription (
    tier STRING NOT NULL CHECK (tier IN ('free', 'basic', 'premium', 'enterprise')),
    price DECIMAL DEFAULT CASE tier
        WHEN 'free' THEN 0
        WHEN 'basic' THEN 9.99
        WHEN 'premium' THEN 29.99
        WHEN 'enterprise' THEN 99.99
    END,
    max_users INTEGER DEFAULT CASE tier
        WHEN 'free' THEN 1
        WHEN 'basic' THEN 5
        WHEN 'premium' THEN 50
        ELSE 1000
    END,
    support_level STRING DEFAULT CASE tier
        WHEN 'enterprise' THEN 'priority'
        WHEN 'premium' THEN 'standard'
        ELSE 'community'
    END
);
```

### Temporal Defaults with Business Logic

```gql
CREATE NODE TYPE Contract (
    signed_date DATE NOT NULL DEFAULT CURRENT_DATE(),
    effective_date DATE DEFAULT CURRENT_DATE(),
    term_months INTEGER DEFAULT 12,
    renewal_date DATE DEFAULT (effective_date + (term_months || ' months')::INTERVAL),
    next_review DATE DEFAULT (effective_date + INTERVAL '6 months')
);
```

### Audit Trail Defaults

```gql
CREATE NODE TYPE AuditedEntity (
    id STRING DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by STRING DEFAULT CURRENT_USER(),
    created_from_ip STRING DEFAULT CLIENT_IP(),
    updated_at TIMESTAMP DEFAULT NOW() ON UPDATE,
    updated_by STRING DEFAULT CURRENT_USER() ON UPDATE,
    version INTEGER DEFAULT 1
);
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
created_at: NOW() → track registration time
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
created_at: NOW() → auto-timestamp
author: CURRENT_USER() → track creator
```

## Troubleshooting

**Default not applied**: Check if property was explicitly set to NULL

**Expression error**: Verify referenced properties exist and are defined before the defaulted property

**Wrong timestamp**: Ensure timezone configuration matches expectations

**UUID collisions**: Use `gen_random_uuid()` instead of custom generation

## Related Topics

- [Constraints](/tags/constraints) - NOT NULL and CHECK constraints that work with defaults
- [Nullable](/tags/nullable) - Understanding NULL vs default value behavior
- [Validation](/tags/validation) - Validating default values meet business rules
- [Schemas](/tags/schema/) - Schema design with default values
- [Migrations](/tags/migration/) - Adding defaults in schema migrations
