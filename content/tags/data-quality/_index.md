---
title: "Data Quality Management"
description: "Ensuring data accuracy, completeness, and consistency in Geode graph database"
keywords: ["data quality", "data validation", "data cleansing", "data accuracy", "data integrity", "quality assurance", "data governance"]
weight: 10
---

# Data Quality Management

Data quality management ensures data is accurate, complete, consistent, and reliable. Geode provides tools and patterns for maintaining high data quality throughout the data lifecycle.

## Quality Dimensions

### Accuracy
Data correctly represents reality

### Completeness
All required data is present

### Consistency
Data is uniform across the system

### Timeliness
Data is up-to-date

### Validity
Data conforms to defined formats

## Quality Rules

### Validation Rules

```gql
CREATE QUALITY RULE valid_email
FOR Person.email
CHECK email LIKE '%@%.%';

CREATE QUALITY RULE positive_age
FOR Person.age
CHECK age >= 0 AND age <= 150;
```

### Completeness Checks

```gql
SELECT COUNT(*) AS missing_emails
FROM Person
WHERE email IS NULL OR email = '';
```

### Consistency Validation

```gql
-- Check for inconsistent dates
SELECT *
FROM Order
WHERE shipped_date < created_date;
```

## Data Profiling

```gql
-- Profile data distribution
SELECT
    age_range,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM (
    SELECT
        CASE
            WHEN age < 18 THEN 'Under 18'
            WHEN age < 30 THEN '18-29'
            WHEN age < 50 THEN '30-49'
            ELSE '50+'
        END AS age_range
    FROM Person
) subquery
GROUP BY age_range;
```

## Data Cleansing

### Remove Duplicates

```gql
DELETE FROM Person p1
WHERE EXISTS (
    SELECT 1 FROM Person p2
    WHERE p1.email = p2.email AND p1.id > p2.id
);
```

### Standardize Data

```gql
UPDATE Person
SET email = LOWER(TRIM(email)),
    phone = REGEXP_REPLACE(phone, '[^0-9]', '');
```

## Monitoring

```gql
-- Quality metrics dashboard
SELECT
    'total_records' AS metric,
    COUNT(*) AS value
FROM Person
UNION ALL
SELECT 'missing_emails', COUNT(*)
FROM Person WHERE email IS NULL
UNION ALL
SELECT 'invalid_ages', COUNT(*)
FROM Person WHERE age < 0 OR age > 150;
```

## Best Practices

- Define quality rules early
- Automate validation
- Profile data regularly
- Track quality metrics
- Document data standards

## Related Topics

- [Validation](/tags/validation) - Data validation
- [Constraints](/tags/constraints) - Schema constraints
