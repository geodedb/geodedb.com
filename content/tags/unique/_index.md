---
title: "Uniqueness Constraints"
description: "Ensuring unique values for properties in Geode graph database"
keywords: ["unique constraint", "uniqueness", "unique index", "primary key", "duplicate prevention", "unique values"]
weight: 10
---

# Uniqueness Constraints

Uniqueness constraints ensure that property values are unique across all nodes or edges of a given type, preventing duplicates and enabling efficient lookups.

## Unique Constraints

### Single Column

```gql
CREATE PROPERTY TYPE Person (
    id STRING PRIMARY KEY,
    email STRING UNIQUE,
    ssn STRING UNIQUE
);
```

### Composite Unique

```gql
CREATE PROPERTY TYPE Booking (
    room_id STRING,
    date DATE,
    UNIQUE (room_id, date)
);
```

## Primary Keys

```gql
CREATE PROPERTY TYPE Person (
    id STRING PRIMARY KEY,
    email STRING UNIQUE
);

-- Composite primary key
CREATE PROPERTY TYPE OrderItem (
    order_id STRING,
    product_id STRING,
    PRIMARY KEY (order_id, product_id)
);
```

## Unique Indexes

```gql
-- Create unique index
CREATE UNIQUE INDEX idx_person_email ON Person(email);

-- Multi-column unique index
CREATE UNIQUE INDEX idx_booking ON Booking(room_id, date);
```

## Handling Violations

```python
try:
    await client.execute(
        "INSERT (p:Person {email: $email})",
        {"email": "duplicate@example.com"}
    )
except UniqueViolationError as e:
    print(f"Email already exists: {e.value}")
    # Handle duplicate
```

## Upsert Pattern

```gql
-- Insert or update
MERGE (p:Person {email: $email})
ON CREATE SET p.name = $name, p.created_at = NOW()
ON MATCH SET p.name = $name, p.updated_at = NOW();
```

## Best Practices

- Use UNIQUE for natural keys
- Create indexes on unique columns
- Handle violations gracefully
- Use composite keys when appropriate
- Document uniqueness requirements

## Related Topics

- [Constraints](/tags/constraints) - Schema constraints
- [Indexes](/tags/indexes) - Database indexes
- [Primary Keys](/tags/primary-keys) - Primary keys
