---
title: "Schema Constraints"
description: "Enforcing data integrity rules and constraints in Geode graph schemas"
keywords: ["constraints", "schema constraints", "integrity constraints", "NOT NULL", "CHECK", "FOREIGN KEY", "data integrity"]
weight: 10
---

# Schema Constraints

Schema constraints enforce rules that ensure data integrity and consistency. Geode supports various constraint types to maintain database quality.

## Constraint Types

### NOT NULL Constraints

```gql
CREATE PROPERTY TYPE Person (
    id STRING NOT NULL,
    name STRING NOT NULL,
    email STRING NOT NULL,
    phone STRING  -- nullable
);
```

### UNIQUE Constraints

```gql
CREATE PROPERTY TYPE Person (
    id STRING PRIMARY KEY,
    email STRING UNIQUE,
    ssn STRING UNIQUE
);
```

### CHECK Constraints

```gql
CREATE PROPERTY TYPE Person (
    age INTEGER CHECK (age >= 0 AND age <= 150),
    email STRING CHECK (email LIKE '%@%.%'),
    salary DECIMAL CHECK (salary >= 0)
);
```

### FOREIGN KEY Constraints

```gql
CREATE EDGE TYPE WORKS_FOR (
    employee_id STRING REFERENCES Person(id),
    company_id STRING REFERENCES Company(id),
    since DATE NOT NULL
);
```

## Complex Constraints

### Multi-Column Constraints

```gql
CREATE TABLE Booking (
    id STRING PRIMARY KEY,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    CONSTRAINT valid_dates CHECK (check_out > check_in)
);
```

### Conditional Constraints

```gql
CREATE PROPERTY TYPE Employee (
    id STRING PRIMARY KEY,
    type STRING CHECK (type IN ('full_time', 'part_time', 'contractor')),
    salary DECIMAL,
    hourly_rate DECIMAL,
    CONSTRAINT salary_or_rate CHECK (
        (type = 'full_time' AND salary IS NOT NULL AND hourly_rate IS NULL)
        OR
        (type != 'full_time' AND salary IS NULL AND hourly_rate IS NOT NULL)
    )
);
```

## Managing Constraints

### Adding Constraints

```gql
ALTER PROPERTY TYPE Person
ADD CONSTRAINT check_adult CHECK (age >= 18);
```

### Removing Constraints

```gql
ALTER PROPERTY TYPE Person
DROP CONSTRAINT check_adult;
```

### Disabling Constraints

```gql
ALTER TABLE Person DISABLE CONSTRAINT check_email;
-- Perform bulk operation
ALTER TABLE Person ENABLE CONSTRAINT check_email;
```

## Constraint Violations

### Error Handling

```python
try:
    await client.execute(
        "INSERT (p:Person {email: $email, age: $age})",
        {"email": "invalid", "age": -5}
    )
except ConstraintViolationError as e:
    print(f"Constraint violated: {e.constraint}")
    print(f"Field: {e.field}")
    print(f"Value: {e.value}")
```

## Best Practices

- Define constraints early
- Use NOT NULL for required fields
- Add CHECK constraints for business rules
- Index UNIQUE constraints
- Document constraint purposes

## Related Topics

- [Validation](/tags/validation) - Data validation
- [Unique](/tags/unique) - Uniqueness constraints
- [Nullable](/tags/nullable) - Nullable fields
