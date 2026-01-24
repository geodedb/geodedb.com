---
title: "Nullable Fields"
description: "Handling optional and NULL values in Geode graph database properties"
keywords: ["nullable", "NULL", "optional fields", "missing data", "NULL handling", "optional properties"]
weight: 10
---

# Nullable Fields

Nullable fields allow properties to have NULL values, representing missing or unknown data. Proper NULL handling is essential for data integrity and query correctness.

## Defining Nullable Fields

### Explicit NULL

```gql
CREATE PROPERTY TYPE Person (
    id STRING NOT NULL,
    name STRING NOT NULL,
    middle_name STRING NULL,  -- Explicitly nullable
    nickname STRING           -- Implicitly nullable
);
```

### NOT NULL

```gql
CREATE PROPERTY TYPE Person (
    id STRING NOT NULL,
    email STRING NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## NULL Handling in Queries

### Checking for NULL

```gql
-- Find records with NULL
MATCH (p:Person)
WHERE p.middle_name IS NULL
RETURN p.name;

-- Find records without NULL
MATCH (p:Person)
WHERE p.middle_name IS NOT NULL
RETURN p.name, p.middle_name;
```

### COALESCE

```gql
MATCH (p:Person)
RETURN
    p.name,
    COALESCE(p.nickname, p.name) AS display_name,
    COALESCE(p.age, 0) AS age;
```

### NULLIF

```gql
MATCH (p:Person)
RETURN
    p.name,
    NULLIF(p.middle_name, '') AS middle_name;
```

## NULL in Comparisons

```gql
-- NULL != NULL
MATCH (p:Person)
WHERE p.middle_name = NULL  -- Wrong! Always false
RETURN p;

-- Correct way
MATCH (p:Person)
WHERE p.middle_name IS NULL
RETURN p;
```

## Default Values

```gql
CREATE PROPERTY TYPE Person (
    id STRING NOT NULL,
    name STRING NOT NULL,
    status STRING DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Best Practices

- Use NOT NULL for required fields
- Provide DEFAULT values when appropriate
- Document NULL semantics
- Use COALESCE for display values
- Test NULL handling in queries

## Related Topics

- [Defaults](/tags/defaults) - Default values
- [Constraints](/tags/constraints) - Schema constraints
- [Validation](/tags/validation) - Data validation
