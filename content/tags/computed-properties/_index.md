---
title: "Computed Properties"
description: "Dynamically calculated node and edge properties derived from other data in Geode"
keywords: ["computed properties", "derived properties", "calculated fields", "virtual columns", "dynamic properties", "formulas", "expressions"]
weight: 10
---

# Computed Properties

Computed properties are node or edge properties whose values are automatically calculated from other data. Unlike stored properties, computed properties are derived using formulas or expressions, ensuring they always reflect current data.

## Computed Property Fundamentals

### What are Computed Properties?

Computed properties are dynamically calculated:

**Formula-Based** - Derived from expressions
**Always Current** - Automatically recalculated
**Type-Safe** - Strongly typed results
**Indexed** - Can be indexed for queries

### Use Cases

- **Derived Values** - Full name from first/last
- **Calculations** - Age from birthdate
- **Aggregations** - Total from line items
- **Transformations** - Uppercase email

## Defining Computed Properties

### Simple Computations

```gql
-- Property type with computed fields
CREATE PROPERTY TYPE Person (
    first_name STRING,
    last_name STRING,
    birthdate DATE,
    
    -- Computed properties
    full_name STRING COMPUTED AS (first_name || ' ' || last_name),
    age INTEGER COMPUTED AS (YEAR(CURRENT_DATE) - YEAR(birthdate)),
    initials STRING COMPUTED AS (
        SUBSTRING(first_name, 1, 1) || SUBSTRING(last_name, 1, 1)
    )
);
```

### Aggregations

Compute from relationships:

```gql
CREATE PROPERTY TYPE User (
    id STRING,
    name STRING,
    
    -- Count relationships
    friend_count INTEGER COMPUTED AS (
        SELECT COUNT(*) FROM MATCH (this)-[:FRIEND]->(:Person)
    ),
    
    -- Sum values
    total_spent DECIMAL COMPUTED AS (
        SELECT SUM(amount) FROM MATCH (this)-[:PLACED]->(o:Order)
    )
);
```

### Conditional Logic

Use CASE expressions:

```gql
CREATE PROPERTY TYPE Account (
    balance DECIMAL,
    credit_score INTEGER,
    
    -- Account status
    status STRING COMPUTED AS (
        CASE
            WHEN balance < 0 THEN 'overdrawn'
            WHEN balance < 100 THEN 'low_balance'
            WHEN balance < 10000 THEN 'standard'
            ELSE 'premium'
        END
    ),
    
    -- Credit tier
    credit_tier STRING COMPUTED AS (
        CASE
            WHEN credit_score >= 800 THEN 'excellent'
            WHEN credit_score >= 700 THEN 'good'
            WHEN credit_score >= 600 THEN 'fair'
            ELSE 'poor'
        END
    )
);
```

## Querying Computed Properties

### Filtering

Use in WHERE clauses:

```gql
-- Find users by computed property
MATCH (u:User)
WHERE u.age >= 18 AND u.friend_count > 50
RETURN u.name, u.age, u.friend_count;

-- Filter by account status
MATCH (a:Account)
WHERE a.status = 'premium'
RETURN a.balance, a.credit_tier;
```

### Sorting

Order by computed values:

```gql
-- Sort by computed property
MATCH (u:User)
RETURN u.name, u.total_spent
ORDER BY u.total_spent DESC
LIMIT 10;
```

### Indexing

Create indexes on computed properties:

```gql
-- Index computed property for fast lookup
CREATE INDEX idx_user_age ON Person(age);
CREATE INDEX idx_account_status ON Account(status);
```

## Performance Considerations

### Computation Cost

Be mindful of expensive computations:

```gql
-- Expensive (recalculated every access)
total_friends INTEGER COMPUTED AS (
    SELECT COUNT(*) FROM MATCH (this)-[:FRIEND*1..3]->(:Person)
);

-- Better (simpler calculation)
direct_friends INTEGER COMPUTED AS (
    SELECT COUNT(*) FROM MATCH (this)-[:FRIEND]->(:Person)
);
```

## Best Practices

### Design Guidelines
- Keep formulas simple
- Document complex calculations
- Avoid expensive aggregations
- Consider materialization for complex computations
- Use appropriate data types

### Testing
- Verify formulas with test data
- Check edge cases (null, zero, negative)
- Test performance with realistic data volumes
- Validate type conversions

## Related Topics

- [Virtual Properties](/tags/virtual-properties) - On-demand calculations
- [Materialized Views](/tags/materialized-views) - Cached computations
- [Indexes](/tags/indexes) - Indexing strategies

## Learn More

- [Computed Columns](https://docs.microsoft.com/en-us/sql/relational-databases/tables/specify-computed-columns-in-a-table)
- [Generated Columns (PostgreSQL)](https://www.postgresql.org/docs/current/ddl-generated-columns.html)
