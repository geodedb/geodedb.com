---
title: "Data Quality Management"
description: "Comprehensive data quality strategies for Geode including validation, profiling, cleansing, monitoring, and governance"
keywords: ["data quality", "data validation", "data cleansing", "data accuracy", "data integrity", "quality assurance", "data governance", "data profiling", "quality metrics", "data monitoring"]
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Data Quality Management

Data quality management in Geode encompasses the processes, techniques, and tools that ensure your graph database contains accurate, complete, consistent, and timely data. High-quality data is essential for reliable analytics, trustworthy decision-making, and operational efficiency. Poor data quality leads to incorrect insights, failed transactions, and loss of user trust.

## The Six Dimensions of Data Quality

Understanding these six fundamental dimensions helps frame your quality management strategy:

### 1. Accuracy

Accuracy measures whether data correctly represents the real-world entities and relationships it describes. Inaccurate data leads to wrong conclusions and faulty business decisions.

**Examples**:
- Person's age matches their birth date
- Product prices reflect current market rates
- Addresses correspond to real locations

**Validation**:
```gql
-- Verify age matches birth date
MATCH (p:Person)
WHERE p.age IS NOT NULL
  AND p.date_of_birth IS NOT NULL
  AND p.age != EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))
RETURN p.id, p.age, p.date_of_birth, 'age mismatch' AS issue;
```

### 2. Completeness

Completeness measures whether all required data is present. Missing critical data prevents proper graph traversals and analytics.

**Examples**:
- All customers have email addresses
- Products have prices and SKUs
- Employees have hire dates

**Validation**:
```gql
-- Find incomplete records
MATCH (p:Person)
WHERE p.email IS NULL
   OR p.name IS NULL
   OR p.created_at IS NULL
RETURN p.id, 'missing required fields' AS issue;

-- Completeness percentage
MATCH (p:Person)
RETURN
    COUNT(*) AS total,
    COUNT(p.phone) AS with_phone,
    ROUND(COUNT(p.phone) * 100.0 / COUNT(*), 2) AS phone_completeness_pct;
```

### 3. Consistency

Consistency ensures data is uniform across the system and doesn't contradict itself. Inconsistent data creates confusion and unreliable queries.

**Examples**:
- Same email format across all records
- Consistent date formats
- Matching foreign key references

**Validation**:
```gql
-- Check for date inconsistencies
MATCH (o:Order)
WHERE o.shipped_date < o.created_date
   OR o.delivered_date < o.shipped_date
RETURN o.id, o.created_date, o.shipped_date, o.delivered_date, 'date sequence error' AS issue;

-- Find orphaned relationships
MATCH (e)-[r:WORKS_FOR]->(c:Company)
WHERE NOT EXISTS((e:Employee))
RETURN e, r, c, 'orphaned relationship' AS issue;
```

### 4. Timeliness

Timeliness measures whether data is up-to-date and available when needed. Stale data leads to decisions based on outdated information.

**Examples**:
- Inventory levels updated in real-time
- User profiles reflect recent changes
- Analytics dashboards show current data

**Validation**:
```gql
-- Find stale records (not updated in 30 days)
MATCH (p:Product)
WHERE p.updated_at < (NOW() - INTERVAL '30 days')
RETURN p.sku, p.name, p.updated_at, 'stale data' AS issue;
```

### 5. Validity

Validity ensures data conforms to defined formats, ranges, and business rules. Invalid data fails to meet schema constraints.

**Examples**:
- Email addresses match email format
- Ages within reasonable range (0-150)
- Dates are valid calendar dates

**Validation**:
```gql
-- Find invalid formats
MATCH (p:Person)
WHERE p.email IS NOT NULL
  AND NOT (p.email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
RETURN p.id, p.email, 'invalid email format' AS issue;

-- Find out-of-range values
MATCH (p:Person)
WHERE p.age < 0 OR p.age > 150
RETURN p.id, p.age, 'age out of range' AS issue;
```

### 6. Uniqueness

Uniqueness ensures no duplicate records exist that should be unique. Duplicates skew analytics and create confusion.

**Examples**:
- No duplicate email addresses
- Unique product SKUs
- Single canonical record per entity

**Validation**:
```gql
-- Find duplicate emails
MATCH (p:Person)
WITH p.email AS email, COLLECT(p) AS persons
WHERE SIZE(persons) > 1
RETURN email, SIZE(persons) AS duplicate_count, 'duplicate email' AS issue;
```

## Data Profiling

Data profiling analyzes your database to understand patterns, distributions, and anomalies. Regular profiling helps identify quality issues before they impact operations.

### Statistical Profiling

```gql
-- Comprehensive data profile for Person nodes
MATCH (p:Person)
RETURN
    COUNT(*) AS total_persons,
    COUNT(p.email) AS emails_present,
    COUNT(p.phone) AS phones_present,
    COUNT(DISTINCT p.country) AS distinct_countries,
    MIN(p.age) AS min_age,
    MAX(p.age) AS max_age,
    AVG(p.age) AS avg_age,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.age) AS median_age;
```

### Distribution Analysis

```python
# Python - analyze age distribution
from geode_client import Client
import matplotlib.pyplot as plt

async def profile_age_distribution(client: Client):
    result, _ = await client.query("""
        MATCH (p:Person)
        WHERE p.age IS NOT NULL
        RETURN
            CASE
                WHEN p.age < 18 THEN 'Under 18'
                WHEN p.age < 30 THEN '18-29'
                WHEN p.age < 50 THEN '30-49'
                WHEN p.age < 65 THEN '50-64'
                ELSE '65+'
            END AS age_range,
            COUNT(*) AS count
        ORDER BY age_range
    """)

    age_ranges = [row['age_range'] for row in result.bindings]
    counts = [row['count'] for row in result.bindings]

    # Visualize distribution
    plt.bar(age_ranges, counts)
    plt.title('Age Distribution')
    plt.xlabel('Age Range')
    plt.ylabel('Count')
    plt.savefig('age_distribution.png')

    # Calculate percentages
    total = sum(counts)
    for age_range, count in zip(age_ranges, counts):
        pct = (count / total) * 100
        print(f"{age_range}: {count} ({pct:.1f}%)")
```

### Outlier Detection

```gql
-- Find statistical outliers (values beyond 3 standard deviations)
WITH stats AS (
    MATCH (p:Product)
    RETURN
        AVG(p.price) AS mean_price,
        STDDEV(p.price) AS stddev_price
)
MATCH (p:Product), (s:stats)
WHERE p.price < (s.mean_price - 3 * s.stddev_price)
   OR p.price > (s.mean_price + 3 * s.stddev_price)
RETURN p.sku, p.name, p.price, s.mean_price, 'price outlier' AS issue;
```

## Data Cleansing Strategies

Data cleansing removes or corrects invalid, duplicate, or inconsistent data.

### Deduplication

```gql
-- Find and merge duplicate person records by email
MATCH (p1:Person), (p2:Person)
WHERE p1.email = p2.email
  AND p1.id < p2.id  -- Prevent self-matches and duplicate pairs
WITH p1, p2
MATCH (p2)-[r]->(other)
CREATE (p1)-[r2:SAME_TYPE(r)]->(other)
SET r2 = properties(r)
DELETE r
WITH p1, p2
DELETE p2;
```

Python script for safe deduplication:

```python
# Python - deduplicate with manual review
async def find_duplicates(client: Client):
    """Find potential duplicate persons based on email."""
    result, _ = await tx.query("""
        MATCH (p:Person)
        WITH p.email AS email, COLLECT(p) AS persons
        WHERE SIZE(persons) > 1
        RETURN
            email,
            [person IN persons | {
                id: person.id,
                name: person.name,
                created_at: person.created_at
            }] AS duplicates
    """)

    return result.bindings


async def merge_persons(client: Client, keep_id: str, merge_id: str):
    """Merge two person records, keeping the first."""
    async with client.connection() as tx:
        await tx.begin()
        # Transfer relationships
        await tx.execute("""
            MATCH (keep:Person {id: $keep_id})
            MATCH (merge:Person {id: $merge_id})
            MATCH (merge)-[r]->(other)
            WHERE NOT EXISTS((keep)-[:SAME_TYPE(r)]->(other))
            CREATE (keep)-[r2:SAME_TYPE(r)]->(other)
            SET r2 = properties(r)
            DELETE r
        """, {"keep_id": keep_id, "merge_id": merge_id})

        # Delete duplicate
        await tx.execute(
            "MATCH (p:Person {id: $merge_id}) DELETE p",
            {"merge_id": merge_id}
        )

        await tx.commit()
```

### Data Standardization

```gql
-- Standardize email addresses (lowercase, trimmed)
MATCH (p:Person)
WHERE p.email IS NOT NULL
SET p.email = LOWER(TRIM(p.email));

-- Standardize phone numbers (remove formatting)
MATCH (p:Person)
WHERE p.phone IS NOT NULL
SET p.phone = REGEXP_REPLACE(p.phone, '[^0-9+]', '', 'g');

-- Standardize country codes
MATCH (p:Person)
WHERE p.country IS NOT NULL
SET p.country = UPPER(TRIM(p.country))
WHERE LENGTH(p.country) = 2;  -- ISO 3166-1 alpha-2
```

### Fixing NULL vs Empty String

```gql
-- Convert empty strings to NULL for consistency
MATCH (p:Person)
WHERE p.middle_name = ''
   OR p.phone = ''
   OR p.bio = ''
SET p.middle_name = CASE WHEN p.middle_name = '' THEN NULL ELSE p.middle_name END,
    p.phone = CASE WHEN p.phone = '' THEN NULL ELSE p.phone END,
    p.bio = CASE WHEN p.bio = '' THEN NULL ELSE p.bio END;
```

## Quality Monitoring and Metrics

Continuous monitoring ensures data quality doesn't degrade over time.

### Quality Dashboard

```gql
-- Comprehensive data quality metrics
WITH person_metrics AS (
    MATCH (p:Person)
    RETURN
        COUNT(*) AS total,
        COUNT(p.email) AS has_email,
        COUNT(p.phone) AS has_phone,
        SUM(CASE WHEN p.age < 0 OR p.age > 150 THEN 1 ELSE 0 END) AS invalid_age,
        SUM(CASE WHEN p.email !~ '^[^@]+@[^@]+\.[^@]+$' THEN 1 ELSE 0 END) AS invalid_email
)
SELECT
    'Completeness: Email' AS metric,
    ROUND(100.0 * has_email / total, 2) AS score
FROM person_metrics
UNION ALL
SELECT
    'Completeness: Phone',
    ROUND(100.0 * has_phone / total, 2)
FROM person_metrics
UNION ALL
SELECT
    'Validity: Age',
    ROUND(100.0 * (total - invalid_age) / total, 2)
FROM person_metrics
UNION ALL
SELECT
    'Validity: Email',
    ROUND(100.0 * (has_email - invalid_email) / has_email, 2)
FROM person_metrics;
```

### Automated Quality Checks

```python
# Python - automated quality monitoring
from dataclasses import dataclass
from typing import List
import asyncio

@dataclass
class QualityCheck:
    name: str
    query: str
    threshold: float  # Acceptable quality score (0-100)
    critical: bool = False

class QualityMonitor:
    def __init__(self, client: Client):
        self.client = client
        self.checks = [
            QualityCheck(
                "Email Completeness",
                "MATCH (p:Person) RETURN COUNT(p.email) * 100.0 / COUNT(*) AS score",
                threshold=95.0,
                critical=True
            ),
            QualityCheck(
                "Valid Email Format",
                """MATCH (p:Person)
                   WHERE p.email IS NOT NULL
                   RETURN SUM(CASE WHEN p.email ~ '^[^@]+@[^@]+\.[^@]+$' THEN 1 ELSE 0 END)
                          * 100.0 / COUNT(*) AS score""",
                threshold=99.0,
                critical=True
            ),
            QualityCheck(
                "Age Validity",
                """MATCH (p:Person)
                   WHERE p.age IS NOT NULL
                   RETURN SUM(CASE WHEN p.age >= 0 AND p.age <= 150 THEN 1 ELSE 0 END)
                          * 100.0 / COUNT(*) AS score""",
                threshold=99.5
            ),
        ]

    async def run_check(self, check: QualityCheck) -> dict:
        result = await self.conn.execute(check.query)
        score = result.bindings[0]['score']
        passed = score >= check.threshold

        return {
            "name": check.name,
            "score": score,
            "threshold": check.threshold,
            "passed": passed,
            "critical": check.critical
        }

    async def run_all_checks(self) -> dict:
        results = await asyncio.gather(*[
            self.run_check(check) for check in self.checks
        ])

        failed_critical = [r for r in results if not r['passed'] and r['critical']]

        return {
            "timestamp": datetime.now().isoformat(),
            "checks": results,
            "overall_passed": len(failed_critical) == 0,
            "failed_critical_count": len(failed_critical)
        }

# Usage
async def main():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        monitor = QualityMonitor(client)
        report = await monitor.run_all_checks()

        print(f"Quality Report - {report['timestamp']}")
        print(f"Overall Status: {'PASS' if report['overall_passed'] else 'FAIL'}")

        for check in report['checks']:
            status = '✓' if check['passed'] else '✗'
            critical = ' [CRITICAL]' if check['critical'] else ''
            print(f"{status} {check['name']}: {check['score']:.2f}% "
                  f"(threshold: {check['threshold']}%){critical}")
```

## Data Governance

Establish policies and procedures for maintaining data quality.

### Quality Rules Documentation

```python
# Define quality rules as code
QUALITY_RULES = {
    "person_email": {
        "description": "Every person must have a valid email address",
        "check": "p.email IS NOT NULL AND p.email ~ '^[^@]+@[^@]+\\.[^@]+$'",
        "severity": "critical",
        "owner": "data-team@company.com"
    },
    "order_total": {
        "description": "Order total must match sum of line items",
        "check": "o.total = (MATCH (o)-[:HAS_ITEM]->(i) RETURN SUM(i.price * i.quantity))",
        "severity": "high",
        "owner": "finance-team@company.com"
    },
}
```

### Audit Trail

```gql
-- Track data quality issues over time
CREATE NODE TYPE DataQualityIssue (
    id STRING DEFAULT gen_random_uuid(),
    issue_type STRING NOT NULL,
    severity STRING CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    entity_type STRING NOT NULL,
    entity_id STRING NOT NULL,
    description TEXT NOT NULL,
    resolution TEXT
);

-- Log quality issue
INSERT (issue:DataQualityIssue {
    issue_type: 'invalid_email',
    severity: 'high',
    entity_type: 'Person',
    entity_id: 'person-123',
    description: 'Email format validation failed'
});
```

## Best Practices

1. **Define Quality Standards Early**: Establish quality metrics during schema design
2. **Automate Quality Checks**: Run validation on every data import and update
3. **Profile Regularly**: Schedule weekly or daily data profiling jobs
4. **Track Metrics Over Time**: Monitor quality trends to detect degradation
5. **Document Quality Rules**: Maintain a catalog of what constitutes "quality"
6. **Assign Ownership**: Each data domain should have a quality owner
7. **Prevent at Source**: Validate data at input rather than fixing later
8. **Clean Incrementally**: Don't wait for major cleansing projects
9. **Version Quality Rules**: Track changes to quality definitions
10. **Alert on Critical Issues**: Notify stakeholders when quality drops below thresholds

## Common Quality Anti-Patterns

**Accepting "good enough" data**: Quality degrades exponentially over time

**Manual cleansing**: Doesn't scale, introduces human error

**Ignoring outliers**: Outliers often indicate deeper quality issues

**No monitoring**: Quality issues go unnoticed until crisis

**Fixing symptoms not causes**: Cleanse source data, not just database

## Related Topics

- [Validation](/tags/validation) - Data validation techniques
- [Constraints](/tags/constraints) - Schema constraint enforcement
- [ETL](/tags/etl) - Data integration quality
- [Monitoring](/tags/monitoring) - System monitoring
- [Data Governance](/tags/data-governance) - Governance policies
- [Testing](/tags/testing) - Quality testing strategies
