---
title: "Data Migration"
description: "Complete guide to migrating data to Geode from other databases, upgrading between Geode versions, and transforming data models with zero downtime."
keywords:
  - migration
  - data migration
  - database migration
  - version upgrade
  - schema migration
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/migration/"
    noindex: false
---

# Data Migration

Data migration is the process of transferring data from one database system to another, upgrading between database versions, or transforming data models to meet evolving requirements. Geode provides comprehensive migration tools and strategies that minimize downtime, ensure data integrity, and maintain performance during transition periods.

## Introduction to Geode Migration

Geode's migration capabilities address three primary scenarios: migrating from other database systems (relational, document, or graph databases), upgrading between Geode versions, and transforming graph models and schemas within Geode.

The migration framework emphasizes zero-downtime migrations for production systems, automatic validation and data integrity checking, reversible migrations with rollback capabilities, and incremental migration support for large datasets.

Geode's GQL compliance and property graph model provide natural migration paths from other graph databases, while the flexible schema design simplifies migrations from relational and NoSQL systems.

## Migration from Other Databases

### Relational Database Migration

Migrating from relational databases to Geode's graph model requires thoughtful transformation of table relationships into graph edges.

```python
# Example: PostgreSQL to Geode migration
from geode_client import GeodeClient
import psycopg2

# Connect to source database
pg_conn = psycopg2.connect("dbname=myapp user=postgres")
pg_cursor = pg_conn.cursor()

# Connect to Geode
geode = GeodeClient("localhost:3141")

# Migrate users table to User nodes
pg_cursor.execute("SELECT id, name, email, created_at FROM users")
for user_id, name, email, created_at in pg_cursor:
    geode.execute("""
        CREATE (u:User {
            id: $id,
            name: $name,
            email: $email,
            createdAt: $created_at
        })
    """, {"id": user_id, "name": name, "email": email, "created_at": created_at})

# Migrate foreign key relationships to edges
pg_cursor.execute("""
    SELECT user_id, order_id, order_date, total
    FROM orders
""")
for user_id, order_id, order_date, total in pg_cursor:
    geode.execute("""
        MATCH (u:User {id: $user_id})
        CREATE (o:Order {
            id: $order_id,
            orderDate: $order_date,
            total: $total
        })
        CREATE (u)-[:PLACED]->(o)
    """, {"user_id": user_id, "order_id": order_id,
          "order_date": order_date, "total": total})
```

Key considerations for relational migrations include mapping primary keys to node identifiers, converting foreign keys to relationship edges, denormalizing join tables into direct relationships, and preserving data types and constraints.

### Document Database Migration

Migrating from document databases like MongoDB leverages Geode's JSON property support:

```javascript
// MongoDB to Geode migration example
const { MongoClient } = require('mongodb');
const { GeodeClient } = require('geode-client');

async function migrateFromMongoDB() {
  const mongo = await MongoClient.connect('mongodb://localhost:27017');
  const db = mongo.db('myapp');
  const geode = new GeodeClient('localhost:3141');

  // Migrate documents to nodes with nested properties
  const users = await db.collection('users').find({}).toArray();

  for (const user of users) {
    await geode.execute(`
      CREATE (u:User {
        id: $id,
        profile: $profile,
        preferences: $preferences,
        metadata: $metadata
      })
    `, {
      id: user._id.toString(),
      profile: user.profile,
      preferences: user.preferences,
      metadata: user.metadata
    });
  }

  // Extract relationships from embedded references
  for (const user of users) {
    if (user.friendIds) {
      for (const friendId of user.friendIds) {
        await geode.execute(`
          MATCH (u1:User {id: $userId})
          MATCH (u2:User {id: $friendId})
          CREATE (u1)-[:FRIEND]->(u2)
        `, {
          userId: user._id.toString(),
          friendId: friendId.toString()
        });
      }
    }
  }
}
```

### Other Graph Database Migration

Migrating from other graph databases to Geode typically involves exporting to standard formats and importing with GQL:

```bash
# Export from Neo4j to CSV
cypher-shell "MATCH (n:User) RETURN n.id, n.name, n.email" --format plain > users.csv

# Import to Geode using bulk loader
geode import csv \
  --input=users.csv \
  --node-label=User \
  --id-column=0 \
  --property-columns=1,2 \
  --property-names=name,email

# Export relationships
cypher-shell "MATCH (a:User)-[r:FOLLOWS]->(b:User)
  RETURN a.id, b.id, r.since" --format plain > follows.csv

# Import relationships
geode import csv \
  --input=follows.csv \
  --relationship-type=FOLLOWS \
  --start-id-column=0 \
  --end-id-column=1 \
  --property-columns=2 \
  --property-names=since
```

## Version Upgrade Migration

### In-Place Upgrades

Geode supports in-place upgrades between minor versions:

```bash
# Check current version
geode version

# Backup before upgrade
geode backup create --type=full --output=/backups/pre-upgrade-$(date +%Y%m%d).tar.gz

# Stop the database
geode stop

# Upgrade binaries
sudo apt-get update
sudo apt-get install geode=0.18.0

# Run migration scripts
geode migrate --from=0.17.0 --to=0.18.0 --dry-run=true
geode migrate --from=0.17.0 --to=0.18.0

# Start with new version
geode start

# Verify upgrade
geode verify --full-scan=true
```

### Zero-Downtime Upgrades

For production systems, use rolling upgrades with replication:

```bash
# Setup: 3-node cluster running 0.17.0

# Step 1: Upgrade standby node 1
ssh node1
geode stop
apt-get install geode=0.18.0
geode start
# Wait for replication catch-up

# Step 2: Upgrade standby node 2
ssh node2
geode stop
apt-get install geode=0.18.0
geode start
# Wait for replication catch-up

# Step 3: Failover to node1, upgrade primary
geode cluster failover --new-primary=node1
ssh primary
geode stop
apt-get install geode=0.18.0
geode start

# Step 4: Rebalance cluster
geode cluster rebalance
```

### Major Version Migrations

Major version upgrades may require data format changes:

```bash
# Export data from old version
geode export --format=gql --output=/exports/database-v0.17.gql

# Install new version
sudo apt-get install geode=1.0.0

# Initialize new database
geode init --data-dir=/var/lib/geode-v1

# Import data with transformations
geode import gql \
  --input=/exports/database-v0.17.gql \
  --transform-script=/etc/geode/migrate-v0-to-v1.js \
  --validate=true

# Verify migration
geode verify --full-scan=true
geode query --execute="SELECT COUNT(*) FROM graph_nodes" --format=table
```

## Schema Evolution

### Adding Node Labels and Properties

Evolve your graph schema without downtime:

```gql
-- Add new property to existing nodes
MATCH (u:User)
SET u.lastLoginAt = datetime('2026-01-24T00:00:00Z')
WHERE u.lastLoginAt IS NULL;

-- Add new label to existing nodes
MATCH (u:User)
WHERE u.role = 'premium'
SET u:PremiumUser;

-- Create index for new property
CREATE INDEX ON :User(lastLoginAt);
```

### Relationship Type Evolution

Transform relationship types with migration scripts:

```gql
-- Migrate old relationship type to new one
MATCH (a:User)-[old:FRIEND]-(b:User)
CREATE (a)-[new:CONNECTED {
  since: old.since,
  strength: 1.0,
  migratedFrom: 'FRIEND'
}]-(b)
DELETE old;

-- Add properties to existing relationships
MATCH ()-[r:FOLLOWS]->()
SET r.notificationsEnabled = true
WHERE r.notificationsEnabled IS NULL;
```

### Property Type Transformations

Change property types with validation:

```gql
-- Migrate string dates to temporal types
MATCH (e:Event)
WHERE e.eventDate IS NOT NULL
  AND type(e.eventDate) = 'STRING'
SET e.eventDate = datetime(e.eventDate),
    e._migrated = true;

-- Verify migration
MATCH (e:Event)
WHERE e._migrated = true
RETURN COUNT(e) AS migrated_count;

-- Cleanup migration marker
MATCH (e:Event {_migrated: true})
REMOVE e._migrated;
```

## Incremental Migration Strategies

### Batch Processing

Process large migrations in manageable batches:

```python
from geode_client import GeodeClient

def migrate_in_batches(batch_size=10000):
    geode = GeodeClient("localhost:3141")
    offset = 0

    while True:
        # Process batch
        result = geode.execute(f"""
            MATCH (u:User)
            WHERE u.migrated IS NULL
            WITH u
            LIMIT {batch_size}
            SET u.newField = transform(u.oldField),
                u.migrated = true
            RETURN COUNT(u) AS processed
        """)

        processed = result[0]['processed']
        offset += processed

        print(f"Migrated {offset} nodes...")

        if processed < batch_size:
            break

    # Cleanup migration marker
    geode.execute("""
        MATCH (u:User {migrated: true})
        REMOVE u.migrated
    """)
```

### Parallel Migration

Leverage multiple connections for faster migrations:

```python
from concurrent.futures import ThreadPoolExecutor
from geode_client import GeodeClient

def migrate_partition(start_id, end_id):
    geode = GeodeClient("localhost:3141")
    geode.execute("""
        MATCH (u:User)
        WHERE u.id >= $start_id AND u.id < $end_id
        SET u.newField = transform(u.oldField)
    """, {"start_id": start_id, "end_id": end_id})

# Partition data by ID ranges
partitions = [
    (0, 1000000),
    (1000000, 2000000),
    (2000000, 3000000),
    (3000000, 4000000)
]

# Migrate partitions in parallel
with ThreadPoolExecutor(max_workers=4) as executor:
    executor.map(lambda p: migrate_partition(*p), partitions)
```

## Data Validation and Verification

### Pre-Migration Validation

Validate source data before migration:

```python
def validate_source_data(source_conn):
    """Validate data integrity before migration"""
    issues = []

    # Check for NULL primary keys
    cursor = source_conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users WHERE id IS NULL")
    if cursor.fetchone()[0] > 0:
        issues.append("Found NULL primary keys in users table")

    # Check for orphaned foreign keys
    cursor.execute("""
        SELECT COUNT(*) FROM orders o
        WHERE NOT EXISTS (
            SELECT 1 FROM users u WHERE u.id = o.user_id
        )
    """)
    if cursor.fetchone()[0] > 0:
        issues.append("Found orphaned foreign keys in orders table")

    # Check for duplicate keys
    cursor.execute("""
        SELECT email, COUNT(*)
        FROM users
        GROUP BY email
        HAVING COUNT(*) > 1
    """)
    duplicates = cursor.fetchall()
    if duplicates:
        issues.append(f"Found {len(duplicates)} duplicate emails")

    return issues
```

### Post-Migration Verification

Verify migrated data integrity:

```gql
-- Count verification
SELECT
  COUNT(DISTINCT n.id) AS unique_ids,
  COUNT(*) AS total_nodes
FROM (MATCH (n:User) RETURN n);

-- Relationship integrity
MATCH (a:User)-[r:FOLLOWS]->(b:User)
WHERE a.id IS NULL OR b.id IS NULL
RETURN COUNT(r) AS invalid_relationships;

-- Property type verification
MATCH (u:User)
WHERE type(u.createdAt) <> 'DATETIME'
RETURN COUNT(u) AS invalid_timestamps;

-- Cross-check with source counts
MATCH (u:User)
RETURN
  COUNT(u) AS geode_user_count,
  -- Should match source database count
  'Expected: 1,234,567' AS source_user_count;
```

## Migration Tools and Utilities

### Geode Migration CLI

Geode provides built-in migration commands:

```bash
# Generate migration plan
geode migrate plan \
  --source=postgresql://localhost/myapp \
  --output=/tmp/migration-plan.json

# Preview migration
geode migrate preview \
  --plan=/tmp/migration-plan.json \
  --sample-size=1000

# Execute migration
geode migrate execute \
  --plan=/tmp/migration-plan.json \
  --parallel-workers=4 \
  --batch-size=10000 \
  --validate=true

# Monitor migration progress
geode migrate status --migration-id=abc123
```

### Custom ETL Scripts

Build custom ETL (Extract, Transform, Load) pipelines:

```python
from geode_client import GeodeClient
import logging

class GeodeMigrator:
    def __init__(self, source_conn, geode_url):
        self.source = source_conn
        self.geode = GeodeClient(geode_url)
        self.logger = logging.getLogger(__name__)

    def extract(self, query):
        """Extract data from source"""
        cursor = self.source.cursor()
        cursor.execute(query)
        return cursor.fetchall()

    def transform(self, rows, transform_fn):
        """Transform data for Geode"""
        return [transform_fn(row) for row in rows]

    def load(self, gql_template, data_batch):
        """Load data into Geode"""
        try:
            self.geode.begin()
            for item in data_batch:
                self.geode.execute(gql_template, item)
            self.geode.commit()
            return True
        except Exception as e:
            self.logger.error(f"Load failed: {e}")
            self.geode.rollback()
            return False

    def migrate_table(self, extract_query, transform_fn, load_template, batch_size=1000):
        """Complete ETL for a table"""
        rows = self.extract(extract_query)
        transformed = self.transform(rows, transform_fn)

        for i in range(0, len(transformed), batch_size):
            batch = transformed[i:i+batch_size]
            success = self.load(load_template, batch)
            self.logger.info(f"Processed batch {i//batch_size + 1}: {len(batch)} records")
```

## Best Practices

1. **Planning**: Create detailed migration plans including data mapping, validation rules, and rollback procedures
2. **Backup**: Always backup data before migration and verify backup integrity
3. **Validation**: Validate source data quality before migration and verify target data after migration
4. **Testing**: Test migration on a subset of data and perform complete dry runs in staging
5. **Monitoring**: Monitor migration progress, performance metrics, and error rates
6. **Incremental**: Use incremental migration for large datasets to minimize risk
7. **Rollback**: Plan and test rollback procedures before production migration
8. **Documentation**: Document all transformation logic, assumptions, and decisions

## Troubleshooting

### Common Migration Issues

```bash
# Out of memory errors
geode migrate execute \
  --plan=migration.json \
  --batch-size=1000 \
  --memory-limit=4GB

# Slow migration performance
geode migrate execute \
  --plan=migration.json \
  --parallel-workers=8 \
  --disable-indexes=true  # Re-create after migration

# Data type conversion errors
geode migrate execute \
  --plan=migration.json \
  --strict-types=false \
  --error-log=/tmp/migration-errors.log

# Constraint violations
geode migrate execute \
  --plan=migration.json \
  --skip-invalid-rows=true \
  --validation-errors=/tmp/validation-errors.csv
```

### Migration Rollback

```bash
# Rollback to pre-migration state
geode stop
geode restore --backup=/backups/pre-migration.tar.gz
geode start

# Partial rollback
geode migrate rollback \
  --migration-id=abc123 \
  --checkpoint=batch-500

# Verify rollback
geode verify --full-scan=true
```

## Related Topics

- [Backup and Recovery](/tags/backup/) - Backup strategies for safe migrations
- [Schema Design](/tags/schema/) - Designing schemas for migration
- [Data Model](/tags/data-model/) - Understanding Geode's data model
- [Performance](/tags/performance/) - Optimizing migration performance
- [Import/Export](/tags/data-integrity/) - Bulk data import and export

## Further Reading

- [Migration Guide](/docs/administration/migration/) - Comprehensive migration documentation
- [ETL Best Practices](/docs/guides/etl-patterns/) - ETL design patterns
- [Version Upgrade Guide](/docs/administration/upgrades/) - Version upgrade procedures
- [Data Validation](/docs/administration/data-validation/) - Data quality checks
- [Migration Case Studies](/docs/case-studies/migrations/) - Real-world migration examples
