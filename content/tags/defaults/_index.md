---
title: "Default Values"
description: "Setting default property values for nodes and edges in Geode graph database"
keywords: ["default values", "DEFAULT", "default constraint", "auto-populate", "column defaults", "initial values"]
weight: 10
---

# Default Values

Default values automatically populate properties when new nodes or edges are created without explicit values, ensuring consistency and reducing application logic.

## Defining Defaults

### Static Defaults

```gql
CREATE PROPERTY TYPE Person (
    id STRING NOT NULL,
    name STRING NOT NULL,
    status STRING DEFAULT 'active',
    role STRING DEFAULT 'user',
    verified BOOLEAN DEFAULT false
);
```

### Dynamic Defaults

```gql
CREATE PROPERTY TYPE Person (
    id STRING DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Expression Defaults

```gql
CREATE PROPERTY TYPE Order (
    id STRING DEFAULT uuid_generate_v4(),
    order_number STRING DEFAULT ('ORD-' || LPAD(nextval('order_seq')::TEXT, 8, '0')),
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days')
);
```

## Using Defaults

### INSERT with Defaults

```gql
-- Uses default values
INSERT (p:Person {name: 'Alice'});
-- Results in: {name: 'Alice', status: 'active', verified: false, created_at: NOW()}

-- Override defaults
INSERT (p:Person {name: 'Bob', status: 'pending'});
-- Results in: {name: 'Bob', status: 'pending', verified: false, created_at: NOW()}
```

### UPDATE Defaults

```gql
CREATE PROPERTY TYPE Person (
    updated_at TIMESTAMP DEFAULT NOW() ON UPDATE
);

-- Auto-updates timestamp
UPDATE Person SET name = 'Alice Smith' WHERE id = '123';
```

## Computed Defaults

### Based on Other Columns

```gql
CREATE PROPERTY TYPE Product (
    base_price DECIMAL NOT NULL,
    tax_rate DECIMAL DEFAULT 0.08,
    final_price DECIMAL DEFAULT (base_price * (1 + tax_rate))
);
```

### Conditional Defaults

```gql
CREATE PROPERTY TYPE User (
    type STRING NOT NULL,
    max_uploads INTEGER DEFAULT CASE
        WHEN type = 'premium' THEN 1000
        WHEN type = 'standard' THEN 100
        ELSE 10
    END
);
```

## Managing Defaults

### Adding Defaults

```gql
ALTER PROPERTY TYPE Person
ALTER COLUMN status SET DEFAULT 'active';
```

### Removing Defaults

```gql
ALTER PROPERTY TYPE Person
ALTER COLUMN status DROP DEFAULT;
```

### Changing Defaults

```gql
ALTER PROPERTY TYPE Person
ALTER COLUMN max_connections SET DEFAULT 10;
```

## Default Functions

### Common Functions

```gql
uuid_generate_v4()     -- Generate UUID
NOW()                   -- Current timestamp
CURRENT_USER()          -- Current user
CURRENT_DATE()          -- Current date
gen_random_uuid()       -- Random UUID
```

## Best Practices

- Use defaults for optional fields
- Set sensible default values
- Document default behavior
- Use functions for dynamic values
- Test default behavior

## Related Topics

- [Constraints](/tags/constraints) - Schema constraints
- [Nullable](/tags/nullable) - Nullable fields
- [Validation](/tags/validation) - Data validation
