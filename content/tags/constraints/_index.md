---
title: "Schema Constraints"
description: "Enforcing data integrity rules and constraints in Geode graph schemas using GQL standard constraint types"
keywords: ["constraints", "schema constraints", "integrity constraints", "NOT NULL", "CHECK", "FOREIGN KEY", "UNIQUE", "PRIMARY KEY", "data integrity", "GQL constraints", "graph constraints"]
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Schema Constraints

Schema constraints are declarative rules that enforce data integrity and consistency in your Geode graph database. By defining constraints at the schema level, you ensure that invalid data never enters the system, maintaining high quality across all nodes, edges, and properties. Geode implements constraints according to the ISO/IEC 39075:2024 GQL standard while optimizing enforcement at the graph storage layer.

## Understanding Constraints in Graph Context

Unlike relational databases where constraints apply to tables and columns, Geode enforces constraints on node types, edge types, and their properties. This graph-native approach ensures that your property graph maintains structural and semantic integrity while preserving the flexibility that makes graph databases powerful.

Constraints in Geode serve multiple purposes:

- **Data Integrity**: Prevent invalid data from entering the system
- **Business Logic**: Encode domain rules directly in the schema
- **Performance**: Enable query optimizer to make assumptions about data
- **Documentation**: Schema constraints self-document data requirements
- **Client Safety**: Provide early error detection before complex transactions

## Core Constraint Types

### NOT NULL Constraints

NOT NULL constraints ensure that required properties always have values, preventing incomplete data from degrading graph quality. In graph databases, missing property values can break traversal logic and analytical queries.

```gql
-- Define required properties for Person nodes
CREATE NODE TYPE Person (
    id STRING NOT NULL,
    name STRING NOT NULL,
    email STRING NOT NULL,
    phone STRING,              -- Optional field, nullable by default
    middle_name STRING,        -- Explicitly nullable
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Edge type with required relationship metadata
CREATE EDGE TYPE WORKS_FOR (
    start_date DATE NOT NULL,
    end_date DATE,             -- NULL means current employment
    position STRING NOT NULL,
    department STRING NOT NULL
);
```

When inserting nodes without required values, Geode immediately rejects the operation:

```python
# Python client - constraint violation
from geode_client import Client, ConstraintViolationError

client = Client(host="localhost", port=3141)

async with client.connection() as conn:
    try:
        # Missing required 'name' field
        await conn.execute(
            "INSERT (p:Person {email: $email})",
            {"email": "alice@example.com"}
        )
    except ConstraintViolationError as e:
        print(f"Missing required field: {e.field}")
        # Output: Missing required field: name
```

### UNIQUE Constraints

UNIQUE constraints prevent duplicate values across nodes or edges of the same type. Geode automatically creates indexes for UNIQUE columns to provide O(1) duplicate checking and fast lookups.

```gql
-- Single-column uniqueness
CREATE NODE TYPE Person (
    id STRING PRIMARY KEY,           -- Implicitly UNIQUE and NOT NULL
    email STRING UNIQUE NOT NULL,    -- Business key uniqueness
    ssn STRING UNIQUE,               -- Nullable but unique when present
    username STRING UNIQUE NOT NULL
);

-- Multi-column uniqueness (composite keys)
CREATE NODE TYPE Employee (
    employee_id STRING NOT NULL,
    department STRING NOT NULL,
    badge_number STRING NOT NULL,
    CONSTRAINT unique_dept_badge UNIQUE (department, badge_number)
);

-- Edge uniqueness prevents duplicate relationships
CREATE EDGE TYPE FOLLOWS (
    followed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_follow UNIQUE (FROM, TO)
);
```

Application-level usage:

```go
// Go client - checking uniqueness before insert
package main

import (
    "context"
    "fmt"
    "geodedb.com/geode"
)

func createUser(ctx context.Context, db *geode.DB, email string) error {
    // UNIQUE constraint enforced automatically
    _, err := db.ExecContext(ctx,
        "INSERT (u:Person {email: $1, name: $2})",
        email, "Alice Smith")

    if geode.IsConstraintViolation(err) {
        return fmt.Errorf("email already exists: %s", email)
    }
    return err
}
```

### CHECK Constraints

CHECK constraints enforce business rules using boolean expressions. These constraints validate property values against complex conditions, encoding domain logic directly in the schema.

```gql
-- Simple range checks
CREATE NODE TYPE Person (
    age INTEGER CHECK (age >= 0 AND age <= 150),
    salary DECIMAL CHECK (salary >= 0),
    email STRING CHECK (email LIKE '%@%.%')
);

-- Pattern validation
CREATE NODE TYPE Product (
    sku STRING CHECK (sku ~ '^[A-Z]{3}-[0-9]{6}$'),  -- Format: ABC-123456
    price DECIMAL CHECK (price > 0),
    discount_pct DECIMAL CHECK (discount_pct >= 0 AND discount_pct <= 100)
);

-- Enumeration constraints
CREATE NODE TYPE Order (
    status STRING CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    priority STRING CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Multi-property constraints
CREATE NODE TYPE Booking (
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests INTEGER CHECK (guests > 0 AND guests <= 10),
    CONSTRAINT valid_date_range CHECK (check_out > check_in),
    CONSTRAINT min_stay CHECK (check_out >= check_in + INTERVAL '1 day')
);

-- Conditional constraints based on other properties
CREATE NODE TYPE Employee (
    type STRING CHECK (type IN ('full_time', 'part_time', 'contractor')),
    salary DECIMAL,
    hourly_rate DECIMAL,
    benefits_eligible BOOLEAN,
    CONSTRAINT compensation_model CHECK (
        (type = 'full_time' AND salary IS NOT NULL AND hourly_rate IS NULL)
        OR
        (type IN ('part_time', 'contractor') AND salary IS NULL AND hourly_rate IS NOT NULL)
    ),
    CONSTRAINT benefits_rule CHECK (
        type = 'full_time' OR benefits_eligible = false
    )
);
```

Geode evaluates CHECK constraints on every INSERT and UPDATE operation, providing immediate feedback:

```rust
// Rust client - handling CHECK constraint violations
use geode_client::{Client, Error, ErrorKind};

async fn create_product(client: &Client, sku: &str, price: f64) -> Result<(), Error> {
    let result = client.execute(
        "INSERT (p:Product {sku: $sku, price: $price})",
        &[("sku", sku), ("price", &price)]
    ).await;

    match result {
        Err(Error { kind: ErrorKind::ConstraintViolation, .. }) => {
            eprintln!("Invalid product data: SKU format or price constraint failed");
            Err(Error::validation_failed("Product validation failed"))
        }
        other => other
    }
}
```

### FOREIGN KEY Constraints (Referential Integrity)

Foreign key constraints ensure that relationships reference existing nodes, maintaining referential integrity across the graph. Geode enforces these constraints by validating that referenced nodes exist before creating edges.

```gql
-- Edge type with foreign key constraints
CREATE EDGE TYPE WORKS_FOR (
    employee_id STRING REFERENCES Person(id),
    company_id STRING REFERENCES Company(id),
    start_date DATE NOT NULL
);

-- Cascade options for deletions
CREATE EDGE TYPE MANAGES (
    manager_id STRING REFERENCES Employee(id) ON DELETE CASCADE,
    team_id STRING REFERENCES Team(id) ON DELETE SET NULL
);

-- Self-referential constraints
CREATE EDGE TYPE REPORTS_TO (
    from_id STRING REFERENCES Employee(id),
    to_id STRING REFERENCES Employee(id),
    CONSTRAINT no_self_reporting CHECK (from_id != to_id)
);
```

## Complex Constraint Patterns

### Cross-Property Validation

```gql
-- Price consistency across currencies
CREATE NODE TYPE Product (
    base_price_usd DECIMAL NOT NULL CHECK (base_price_usd > 0),
    price_eur DECIMAL,
    price_gbp DECIMAL,
    CONSTRAINT currency_consistency CHECK (
        (price_eur IS NULL AND price_gbp IS NULL)
        OR (price_eur > 0 AND price_gbp > 0)
    )
);

-- Temporal validity
CREATE NODE TYPE Contract (
    signed_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    expiry_date DATE,
    CONSTRAINT chronological_order CHECK (
        effective_date >= signed_date
        AND (expiry_date IS NULL OR expiry_date > effective_date)
    )
);
```

### Graph-Specific Constraints

```gql
-- Degree constraints on relationships
CREATE NODE TYPE Person (
    max_connections INTEGER DEFAULT 5000,
    CONSTRAINT connection_limit CHECK (
        (SELECT COUNT(*) FROM MATCH (this)-[:FOLLOWS]->() ) <= max_connections
    )
);

-- Path length constraints
CREATE EDGE TYPE REFERENCES (
    depth INTEGER CHECK (depth >= 0 AND depth < 10),
    CONSTRAINT no_cycles CHECK (
        NOT EXISTS(
            MATCH (a)-[:REFERENCES*1..10]->(b)-[:REFERENCES]->(a)
            WHERE a = FROM_NODE
        )
    )
);
```

## Managing Constraints Dynamically

### Adding Constraints to Existing Types

```gql
-- Add new constraint to existing node type
ALTER NODE TYPE Person
ADD CONSTRAINT check_adult CHECK (age >= 18);

-- Add uniqueness constraint
ALTER NODE TYPE Person
ADD CONSTRAINT unique_phone UNIQUE (phone);

-- Add multi-column constraint
ALTER NODE TYPE Employee
ADD CONSTRAINT unique_dept_position UNIQUE (department, position_id);
```

### Modifying Constraints

```gql
-- Remove outdated constraint
ALTER NODE TYPE Person
DROP CONSTRAINT check_adult;

-- Replace constraint with updated rule
ALTER NODE TYPE Person
DROP CONSTRAINT email_format;

ALTER NODE TYPE Person
ADD CONSTRAINT email_format_v2 CHECK (
    email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
);
```

### Bulk Operations with Constraint Suspension

For large data migrations, temporarily disable constraints:

```python
# Python - bulk load with constraint management
async def bulk_migrate_users(client, user_data):
    async with client.connection() as tx:
        await tx.begin()
        # Disable constraints for bulk operation
        await tx.execute("ALTER NODE TYPE Person DISABLE CONSTRAINTS")

        try:
            # Bulk insert
            for batch in chunked(user_data, 1000):
                await tx.execute("""
                    UNWIND $batch AS row
                    CREATE (p:Person {
                        id: row.id,
                        email: row.email,
                        age: row.age
                    })
                """, {"batch": batch})

            # Re-enable and validate
            await tx.execute("ALTER NODE TYPE Person ENABLE CONSTRAINTS")

            # Check for violations
            violations, _ = await tx.query("""
                MATCH (p:Person)
                WHERE p.age < 0 OR p.age > 150 OR p.email NOT LIKE '%@%.%'
                RETURN p.id, p.email, p.age
            """)

            if violations.rows:
                raise ValueError(f"Found {len(violations)} constraint violations")

            await tx.commit()
        except Exception:
            await tx.rollback()
            raise
```

## Constraint Violation Handling

### Error Responses

Geode provides detailed error information when constraints fail:

```json
{
  "type": "ERROR",
  "code": "22001",
  "message": "CHECK constraint violation",
  "constraint": "check_adult",
  "field": "age",
  "value": 15,
  "query": "INSERT (p:Person {name: 'Bob', age: 15})"
}
```

### Client-Side Error Handling

```go
// Go - comprehensive constraint error handling
type ConstraintError struct {
    Constraint string
    Field      string
    Value      interface{}
    Message    string
}

func (e *ConstraintError) Error() string {
    return fmt.Sprintf("constraint %s violated on field %s: %s",
        e.Constraint, e.Field, e.Message)
}

func parseConstraintError(err error) *ConstraintError {
    if dbErr, ok := err.(*geode.Error); ok && dbErr.Code == "22001" {
        return &ConstraintError{
            Constraint: dbErr.Constraint,
            Field:      dbErr.Field,
            Value:      dbErr.Value,
            Message:    dbErr.Message,
        }
    }
    return nil
}
```

## Performance Considerations

Constraints impact write performance but improve overall system reliability:

- **NOT NULL**: Minimal overhead, checked in memory
- **UNIQUE**: O(log n) index lookup per insert
- **CHECK**: Expression evaluation overhead, typically microseconds
- **FOREIGN KEY**: Node existence check, index lookup

To optimize constraint checking:

1. **Index UNIQUE Columns**: Geode auto-indexes, but verify with EXPLAIN
2. **Simple CHECK Expressions**: Avoid subqueries in CHECK constraints
3. **Batch Operations**: Use transactions to amortize constraint checking
4. **Deferred Constraints**: Validate at transaction commit for complex rules

## Best Practices

1. **Define Constraints Early**: Add constraints during schema design, not as afterthoughts
2. **Document Business Rules**: Use meaningful constraint names that explain the rule
3. **Test Constraint Violations**: Write tests that verify constraints properly reject invalid data
4. **Prefer Schema Constraints**: Choose schema-level constraints over application validation when possible
5. **Use Appropriate Types**: Match constraint type to data requirement (NOT NULL vs DEFAULT)
6. **Version Constraints**: Track constraint changes in migration scripts
7. **Monitor Violations**: Log constraint failures to detect data quality issues
8. **Balance Strictness**: Too many constraints can hinder legitimate operations

## Troubleshooting

**Constraint preventing legitimate inserts**: Review CHECK expressions for edge cases

**Performance degradation on writes**: Analyze constraint evaluation with EXPLAIN PROFILE

**Cascade failures on deletes**: Review ON DELETE policies for foreign keys

**Bulk load failures**: Consider temporarily disabling constraints for validated migration

## Related Topics

- [Validation](/tags/validation) - Application-level data validation patterns
- [Data Quality](/tags/data-quality) - Comprehensive data quality management
- [Nullable](/tags/nullable) - NULL handling and optional fields
- [Defaults](/tags/defaults) - Default property values
- [Indexes](/tags/indexes) - Index management for constraint enforcement
- [Transactions](/tags/transactions) - Constraint checking in transactional context
