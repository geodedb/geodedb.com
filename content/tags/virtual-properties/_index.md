---
title: "Virtual Properties"
description: "On-demand calculated properties that don't require storage in Geode graph database"
keywords: ["virtual properties", "transient properties", "calculated attributes", "on-the-fly computation", "derived attributes", "runtime properties"]
weight: 10
---

# Virtual Properties

Virtual properties are calculated on-demand and never stored in the database. They provide computed values without consuming storage, making them ideal for transient calculations and derived data that changes frequently.

## Virtual Properties Overview

### What are Virtual Properties?

Virtual properties are:

**Not Stored** - Calculated at query time
**Always Fresh** - Reflect current data
**No Storage Cost** - No disk space required
**Flexible** - Easy to modify

### Virtual vs Computed vs Stored

| Aspect | Stored | Computed | Virtual |
|--------|--------|----------|---------|
| Storage | Yes | Sometimes | No |
| Calculation | Never | On write/read | On read |
| Performance | Fastest read | Medium | Slowest read |
| Freshness | May be stale | Always current | Always current |
| Disk Usage | High | Medium | None |

## Defining Virtual Properties

### Basic Virtual Properties

```gql
-- Define virtual properties
CREATE PROPERTY TYPE Person (
    first_name STRING,
    last_name STRING,
    birth_date DATE,
    
    -- Virtual properties (calculated on access)
    VIRTUAL full_name STRING AS (first_name || ' ' || last_name),
    VIRTUAL age INTEGER AS (YEAR(CURRENT_DATE) - YEAR(birth_date)),
    VIRTUAL is_adult BOOLEAN AS (age >= 18)
);
```

### Relationship-Based

Calculate from graph structure:

```gql
CREATE PROPERTY TYPE User (
    id STRING,
    name STRING,
    
    VIRTUAL follower_ids LIST<STRING> AS (
        SELECT u.id FROM MATCH (this)<-[:FOLLOWS]-(u:User)
    ),
    
    VIRTUAL following_ids LIST<STRING> AS (
        SELECT u.id FROM MATCH (this)-[:FOLLOWS]->(u:User)
    ),
    
    VIRTUAL follower_ratio DECIMAL AS (
        CAST(SIZE(follower_ids) AS DECIMAL) / NULLIF(SIZE(following_ids), 0)
    )
);
```

## Use Cases

### Display Formatting

Format data for presentation:

```gql
CREATE PROPERTY TYPE Contact (
    phone STRING,
    email STRING,
    
    VIRTUAL formatted_phone STRING AS (
        REGEX_REPLACE(phone, '(\\d{3})(\\d{3})(\\d{4})', '($1) $2-$3')
    ),
    
    VIRTUAL email_domain STRING AS (
        SUBSTRING(email FROM POSITION('@' IN email) + 1)
    )
);
```

### Data Enrichment

Add context to entities:

```gql
CREATE PROPERTY TYPE Order (
    created_at TIMESTAMP,
    total DECIMAL,
    status STRING,
    
    VIRTUAL days_since_order INTEGER AS (
        EXTRACT(DAY FROM (NOW() - created_at))
    ),
    
    VIRTUAL order_category STRING AS (
        CASE
            WHEN total < 50 THEN 'small'
            WHEN total < 500 THEN 'medium'
            ELSE 'large'
        END
    ),
    
    VIRTUAL is_recent BOOLEAN AS (days_since_order <= 7),
    VIRTUAL is_pending BOOLEAN AS (status IN ('pending', 'processing'))
);
```

## Querying Virtual Properties

### Selecting

Include in query results:

```gql
MATCH (p:Person)
RETURN p.name, p.age, p.full_name, p.is_adult;
```

### Filtering

Use in WHERE clauses:

```gql
MATCH (p:Person)
WHERE p.age >= 21 AND p.is_adult
RETURN p.name;

MATCH (o:Order)
WHERE o.is_recent AND o.order_category = 'large'
RETURN o.id, o.total;
```

## Best Practices

### When to Use Virtual Properties
- Formatting and presentation logic
- Simple derived calculations
- Frequently changing logic
- Data that's rarely queried
- No need for indexing

### When NOT to Use
- Complex expensive calculations
- Properties queried in WHERE clauses frequently
- Need for indexes
- Bulk operations
- Aggregations across many records

### Design Tips
- Keep calculations lightweight
- Avoid nested subqueries
- Consider caching for expensive virtuals
- Document calculation logic
- Test with realistic data volumes

## Related Topics

- [Computed Properties](/tags/computed-properties) - Stored computed values
- [Materialized Views](/tags/materialized-views) - Cached query results
- [Performance](/tags/performance) - Query optimization

## Learn More

- [Virtual Columns in Databases](https://oracle-base.com/articles/11g/virtual-columns-11gr1)
- [Calculated Fields](https://docs.microsoft.com/en-us/power-bi/transform-model/desktop-calculated-columns)
