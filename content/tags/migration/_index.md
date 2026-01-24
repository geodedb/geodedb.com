---
title: "Data Migration"
description: "Strategies and tools for migrating data to and between Geode graph databases"
keywords: ["data migration", "database migration", "ETL", "data transfer", "migration tools", "schema migration", "data conversion", "import export"]
weight: 10
---

# Data Migration

Data migration is the process of transferring data from one system to another, often involving format transformation, schema mapping, and data quality validation. Geode provides comprehensive tools and strategies for smooth, reliable data migrations.

## Migration Strategies

### Big Bang Migration

Move all data at once:

**Pros:**
- Simple and straightforward
- Immediate cutover
- No sync period

**Cons:**
- Higher risk
- Longer downtime
- Difficult rollback

```bash
# Stop old system
# Export all data
geode export --source legacy_db --output data.json

# Import to Geode
geode import --input data.json --graph production

# Start new system
```

### Incremental Migration

Migrate data in phases:

**Pros:**
- Lower risk
- Phased validation
- Easier rollback

**Cons:**
- More complex
- Requires sync
- Longer timeline

```bash
# Phase 1: Users
geode import --input users.json --graph production

# Phase 2: Relationships
geode import --input relationships.json --graph production

# Phase 3: Activity data
geode import --input activities.json --graph production
```

### Parallel Run

Run old and new systems simultaneously:

**Pros:**
- Lowest risk
- Validate in production
- Gradual transition

**Cons:**
- Most complex
- Highest cost
- Sync overhead

## Schema Migration

### Schema Versioning

Track schema changes:

```gql
-- Create schema version table
CREATE TABLE schema_versions (
    version INTEGER PRIMARY KEY,
    description STRING,
    applied_at TIMESTAMP,
    applied_by STRING
);

-- Record migration
INSERT INTO schema_versions VALUES (
    1,
    'Initial schema',
    NOW(),
    CURRENT_USER()
);
```

### Schema Evolution

Handle breaking changes:

```gql
-- Add new property
ALTER PROPERTY TYPE Person
ADD COLUMN middle_name STRING;

-- Populate from existing data
UPDATE Person
SET middle_name = SPLIT_PART(full_name, ' ', 2)
WHERE full_name LIKE '% % %';

-- Remove old property
ALTER PROPERTY TYPE Person
DROP COLUMN full_name;
```

## Data Transformation

### Type Conversion

Convert data types:

```gql
-- String to date
UPDATE Person
SET birth_date = TO_DATE(birth_date_string, 'YYYY-MM-DD')
WHERE birth_date IS NULL;

-- JSON to structured
UPDATE Event
SET metadata_parsed = JSON_PARSE(metadata_string);
```

### Data Cleansing

Clean and normalize data:

```gql
-- Trim whitespace
UPDATE Person
SET email = TRIM(LOWER(email));

-- Standardize phone numbers
UPDATE Contact
SET phone = REGEXP_REPLACE(phone, '[^0-9]', '');

-- Remove duplicates
DELETE FROM Person p1
WHERE EXISTS (
    SELECT 1 FROM Person p2
    WHERE p1.email = p2.email
      AND p1.id > p2.id
);
```

## Migration Tools

### Geode CLI

Command-line migration tools:

```bash
# Export from SQL database
geode export \
  --source postgresql://localhost/mydb \
  --output backup.json \
  --format json

# Import to Geode
geode import \
  --input backup.json \
  --graph production \
  --batch-size 1000 \
  --parallel 4

# Verify migration
geode validate \
  --graph production \
  --check-constraints \
  --check-references
```

### Python Migration Script

Custom migration logic:

```python
from geode_client import GeodeClient
import asyncio

async def migrate_users(source_conn, geode_client):
    """Migrate users from SQL to Geode"""
    # Extract from source
    users = await source_conn.fetch("SELECT * FROM users")
    
    batch = []
    for user in users:
        # Transform
        node = {
            "labels": ["User"],
            "properties": {
                "id": user['id'],
                "name": user['name'],
                "email": user['email'].lower(),
                "created_at": user['created_at'].isoformat()
            }
        }
        
        batch.append(node)
        
        # Load in batches
        if len(batch) >= 1000:
            await geode_client.create_nodes_batch(batch)
            batch = []
    
    # Load remaining
    if batch:
        await geode_client.create_nodes_batch(batch)

async def main():
    source = await connect_source()
    geode = GeodeClient("localhost", 3141)
    
    await migrate_users(source, geode)
    await migrate_relationships(source, geode)
    await validate_migration(source, geode)

asyncio.run(main())
```

## Validation

### Data Quality Checks

Verify migration completeness:

```gql
-- Count comparison
SELECT 'source' AS system, COUNT(*) AS user_count
FROM source_users
UNION ALL
SELECT 'target' AS system, COUNT(*) AS user_count
FROM Person;

-- Sample verification
SELECT *
FROM Person p
WHERE NOT EXISTS (
    SELECT 1 FROM source_users s
    WHERE s.id = p.id
);
```

### Referential Integrity

Validate relationships:

```gql
-- Check for orphaned edges
SELECT e.*
FROM FRIEND e
WHERE NOT EXISTS (
    SELECT 1 FROM Person p WHERE p.id = e.from_id
)
OR NOT EXISTS (
    SELECT 1 FROM Person p WHERE p.id = e.to_id
);
```

## Best Practices

### Planning
- Document current state
- Define success criteria
- Create rollback plan
- Test on copy first
- Schedule during low-traffic

### Execution
- Use transactions
- Batch operations
- Monitor progress
- Validate continuously
- Keep audit trail

### Post-Migration
- Verify data quality
- Update documentation
- Monitor performance
- Gather feedback
- Archive old data

## Related Topics

- [Import](/tags/import) - Data import operations
- [Export](/tags/export) - Data export operations
- [ETL](/tags/etl) - Extract Transform Load pipelines

## Learn More

- [Database Migration Best Practices](https://www.liquibase.org/best-practices.html)
- [Zero-Downtime Migrations](https://stripe.com/blog/online-migrations)
