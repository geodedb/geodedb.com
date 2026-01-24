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

## Advanced Migration Patterns

### Zero-Downtime Migration Strategy

Deploy changes without service interruption:

```python
from geode_client import GeodeClient
import asyncio

class ZeroDowntimeMigration:
    """Manage migrations with zero downtime using dual-write pattern."""

    def __init__(self, old_db, new_db):
        self.old_db = old_db
        self.new_db = new_db
        self.migration_complete = False

    async def phase1_dual_write(self):
        """Phase 1: Write to both old and new systems."""
        print("Phase 1: Starting dual-write mode")

        # All new writes go to both systems
        async def write_user(user_data):
            # Write to old system
            await self.old_db.execute("""
                INSERT INTO users_table VALUES ($id, $name, $email)
            """, user_data)

            # Write to new system (Geode)
            await self.new_db.execute("""
                CREATE (u:User {
                    id: $id,
                    name: $name,
                    email: $email,
                    migrated_at: datetime()
                })
            """, user_data)

        return write_user

    async def phase2_backfill(self, batch_size=1000):
        """Phase 2: Backfill historical data."""
        print("Phase 2: Backfilling historical data")

        offset = 0
        while True:
            # Read batch from old system
            old_users = await self.old_db.fetch(f"""
                SELECT id, name, email, created_at
                FROM users_table
                ORDER BY id
                LIMIT {batch_size} OFFSET {offset}
            """)

            if not old_users:
                break

            # Write to new system
            async with self.new_db.transaction():
                await self.new_db.execute("""
                    UNWIND $users AS user
                    MERGE (u:User {id: user.id})
                    ON CREATE SET
                        u.name = user.name,
                        u.email = user.email,
                        u.created_at = user.created_at,
                        u.backfilled = true
                """, {'users': old_users})

            offset += batch_size
            print(f"Backfilled {offset} users")

    async def phase3_verify(self):
        """Phase 3: Verify data consistency."""
        print("Phase 3: Verifying data consistency")

        # Count records
        old_count = await self.old_db.fetch_val("SELECT COUNT(*) FROM users_table")
        new_count = await self.new_db.execute("MATCH (u:User) RETURN count(u) AS count")
        new_count = (await new_count.fetch_one())['count']

        if old_count != new_count:
            raise MigrationError(f"Count mismatch: {old_count} vs {new_count}")

        # Sample verification
        sample_ids = await self.old_db.fetch("SELECT id FROM users_table ORDER BY RANDOM() LIMIT 1000")

        for sample in sample_ids:
            old_user = await self.old_db.fetch_one(f"SELECT * FROM users_table WHERE id = {sample['id']}")
            new_user = await self.new_db.execute("MATCH (u:User {id: $id}) RETURN u", {'id': sample['id']})
            new_user = await new_user.fetch_one()

            if not new_user or old_user['name'] != new_user['u']['name']:
                raise MigrationError(f"Data mismatch for user {sample['id']}")

        print("Verification complete")

    async def phase4_cutover(self):
        """Phase 4: Switch reads to new system."""
        print("Phase 4: Cutting over reads to new system")
        self.migration_complete = True

# Usage
async def run_zero_downtime_migration():
    old_postgres = PostgresClient("old-db:5432")
    new_geode = GeodeClient("new-geode:3141")

    migration = ZeroDowntimeMigration(old_postgres, new_geode)

    # Run migration phases
    await migration.phase1_dual_write()
    await migration.phase2_backfill(batch_size=10000)
    await migration.phase3_verify()
    await migration.phase4_cutover()

    print("Migration complete!")

asyncio.run(run_zero_downtime_migration())
```

### Schema Transformation Patterns

Transform relational schema to graph model:

```python
class RelationalToGraphTransformer:
    """Transform relational database schema to graph model."""

    def __init__(self, source_db, target_graph):
        self.source = source_db
        self.target = target_graph

    async def migrate_entities(self, table_name, label):
        """Migrate table rows to graph nodes."""
        print(f"Migrating {table_name} → :{label}")

        # Read table schema
        columns = await self.source.get_columns(table_name)

        # Migrate data in batches
        offset = 0
        batch_size = 5000

        while True:
            rows = await self.source.fetch(f"""
                SELECT * FROM {table_name}
                ORDER BY id
                LIMIT {batch_size} OFFSET {offset}
            """)

            if not rows:
                break

            # Transform and insert
            nodes = [
                {col: row[col] for col in columns}
                for row in rows
            ]

            await self.target.execute(f"""
                UNWIND $nodes AS node
                CREATE (n:{label})
                SET n = node
            """, {'nodes': nodes})

            offset += batch_size
            print(f"  Migrated {offset} {label} nodes")

    async def migrate_foreign_keys(self, fk_constraint):
        """Transform foreign keys to relationships."""
        table = fk_constraint['table']
        ref_table = fk_constraint['referenced_table']
        fk_column = fk_constraint['column']
        ref_column = fk_constraint['referenced_column']

        rel_type = self.infer_relationship_type(table, ref_table)

        print(f"Creating {rel_type} relationships: {table} → {ref_table}")

        await self.target.execute(f"""
            MATCH (a:{table.title()})
            MATCH (b:{ref_table.title()} {{id: a.{fk_column}}})
            CREATE (a)-[:{rel_type}]->(b)
        """)

    def infer_relationship_type(self, from_table, to_table):
        """Infer relationship type from table names."""
        # Simple heuristic - customize for your schema
        return f"HAS_{to_table.upper()}"

    async def migrate_join_tables(self, join_table):
        """Transform many-to-many join tables to relationships."""
        left_col = join_table['left_column']
        right_col = join_table['right_column']
        left_entity = join_table['left_entity']
        right_entity = join_table['right_entity']

        rel_type = f"{left_entity}_TO_{right_entity}".upper()

        print(f"Migrating join table {join_table['name']} → {rel_type}")

        rows = await self.source.fetch(f"""
            SELECT * FROM {join_table['name']}
        """)

        for row in rows:
            await self.target.execute(f"""
                MATCH (a:{left_entity} {{id: $left_id}})
                MATCH (b:{right_entity} {{id: $right_id}})
                CREATE (a)-[r:{rel_type}]->(b)
                SET r = $properties
            """, {
                'left_id': row[left_col],
                'right_id': row[right_col],
                'properties': {k: v for k, v in row.items() if k not in [left_col, right_col]}
            })

# Example usage
async def migrate_ecommerce_schema():
    transformer = RelationalToGraphTransformer(postgres, geode)

    # Migrate entities
    await transformer.migrate_entities('users', 'User')
    await transformer.migrate_entities('products', 'Product')
    await transformer.migrate_entities('orders', 'Order')

    # Migrate foreign keys
    await transformer.migrate_foreign_keys({
        'table': 'orders',
        'referenced_table': 'users',
        'column': 'user_id',
        'referenced_column': 'id'
    })

    # Migrate join tables
    await transformer.migrate_join_tables({
        'name': 'order_items',
        'left_column': 'order_id',
        'right_column': 'product_id',
        'left_entity': 'Order',
        'right_entity': 'Product'
    })
```

### Data Quality Validation

Comprehensive validation during migration:

```python
class MigrationValidator:
    """Validate data quality during and after migration."""

    def __init__(self, source_db, target_graph):
        self.source = source_db
        self.target = target_graph
        self.issues = []

    async def validate_counts(self, table_name, label):
        """Verify row/node counts match."""
        source_count = await self.source.fetch_val(f"SELECT COUNT(*) FROM {table_name}")

        result = await self.target.execute(f"MATCH (n:{label}) RETURN count(n) AS count")
        target_count = (await result.fetch_one())['count']

        if source_count != target_count:
            self.issues.append({
                'type': 'count_mismatch',
                'entity': label,
                'source': source_count,
                'target': target_count
            })

        return source_count == target_count

    async def validate_referential_integrity(self):
        """Check for orphaned relationships."""
        result = await self.target.execute("""
            MATCH ()-[r]->()
            WHERE NOT EXISTS {
                MATCH (start)-[r]->(end)
                WHERE id(start) IS NOT NULL AND id(end) IS NOT NULL
            }
            RETURN count(r) AS orphaned_relationships
        """)

        orphaned = (await result.fetch_one())['orphaned_relationships']

        if orphaned > 0:
            self.issues.append({
                'type': 'orphaned_relationships',
                'count': orphaned
            })

        return orphaned == 0

    async def validate_data_types(self, label, property_name, expected_type):
        """Verify property data types."""
        result = await self.target.execute(f"""
            MATCH (n:{label})
            WHERE n.{property_name} IS NOT NULL
            WITH n.{property_name} AS value, valueType(n.{property_name}) AS actual_type
            WHERE actual_type <> $expected_type
            RETURN count(*) AS type_mismatches
        """, {'expected_type': expected_type})

        mismatches = (await result.fetch_one())['type_mismatches']

        if mismatches > 0:
            self.issues.append({
                'type': 'data_type_mismatch',
                'entity': label,
                'property': property_name,
                'count': mismatches
            })

        return mismatches == 0

    async def validate_unique_constraints(self, label, property_name):
        """Check for duplicate values in unique properties."""
        result = await self.target.execute(f"""
            MATCH (n:{label})
            WITH n.{property_name} AS value, count(n) AS occurrences
            WHERE occurrences > 1
            RETURN count(*) AS duplicates
        """)

        duplicates = (await result.fetch_one())['duplicates']

        if duplicates > 0:
            self.issues.append({
                'type': 'unique_constraint_violation',
                'entity': label,
                'property': property_name,
                'count': duplicates
            })

        return duplicates == 0

    def generate_report(self):
        """Generate validation report."""
        if not self.issues:
            return "✓ All validations passed"

        report = "Migration Validation Issues:\n"
        for issue in self.issues:
            report += f"\n• {issue['type']}:\n"
            for key, value in issue.items():
                if key != 'type':
                    report += f"  - {key}: {value}\n"

        return report
```

### Incremental Migration with Change Data Capture

```python
class CDCMigration:
    """Migrate data incrementally using change data capture."""

    def __init__(self, source_db, target_graph):
        self.source = source_db
        self.target = target_graph
        self.last_sync_timestamp = None

    async def capture_changes(self, since_timestamp=None):
        """Capture changes from source database."""
        timestamp = since_timestamp or self.last_sync_timestamp or '1970-01-01'

        changes = await self.source.fetch("""
            SELECT table_name, operation, record_id, new_data, changed_at
            FROM change_log
            WHERE changed_at > $timestamp
            ORDER BY changed_at
        """, {'timestamp': timestamp})

        return changes

    async def apply_changes(self, changes):
        """Apply changes to target graph database."""
        for change in changes:
            table = change['table_name']
            operation = change['operation']
            data = change['new_data']

            if operation == 'INSERT' or operation == 'UPDATE':
                await self.target.execute(f"""
                    MERGE (n:{table.title()} {{id: $id}})
                    SET n = $data,
                        n.synced_at = datetime()
                """, {'id': change['record_id'], 'data': data})

            elif operation == 'DELETE':
                await self.target.execute(f"""
                    MATCH (n:{table.title()} {{id: $id}})
                    DETACH DELETE n
                """, {'id': change['record_id']})

        if changes:
            self.last_sync_timestamp = changes[-1]['changed_at']

    async def continuous_sync(self, interval_seconds=60):
        """Continuously sync changes."""
        print("Starting continuous sync...")

        while True:
            try:
                changes = await self.capture_changes()
                if changes:
                    await self.apply_changes(changes)
                    print(f"Synced {len(changes)} changes")

                await asyncio.sleep(interval_seconds)

            except Exception as e:
                print(f"Sync error: {e}")
                await asyncio.sleep(interval_seconds)
```

### Migration Rollback Strategy

```python
class MigrationRollback:
    """Provide rollback capability for failed migrations."""

    def __init__(self, target_graph):
        self.target = target_graph
        self.migration_id = None
        self.checkpoints = []

    async def create_checkpoint(self, name):
        """Create a recovery checkpoint."""
        checkpoint = {
            'name': name,
            'timestamp': datetime.now(),
            'node_count': await self.get_node_count(),
            'relationship_count': await self.get_relationship_count()
        }

        self.checkpoints.append(checkpoint)
        print(f"Checkpoint created: {name}")

        return checkpoint

    async def get_node_count(self):
        """Get current node count."""
        result = await self.target.execute("MATCH (n) RETURN count(n) AS count")
        return (await result.fetch_one())['count']

    async def get_relationship_count(self):
        """Get current relationship count."""
        result = await self.target.execute("MATCH ()-[r]->() RETURN count(r) AS count")
        return (await result.fetch_one())['count']

    async def rollback_to_checkpoint(self, checkpoint_name):
        """Rollback to a specific checkpoint."""
        checkpoint = next((c for c in self.checkpoints if c['name'] == checkpoint_name), None)

        if not checkpoint:
            raise ValueError(f"Checkpoint not found: {checkpoint_name}")

        print(f"Rolling back to checkpoint: {checkpoint_name}")

        # Delete nodes created after checkpoint
        await self.target.execute("""
            MATCH (n)
            WHERE n.migrated_at > $checkpoint_time
            DETACH DELETE n
        """, {'checkpoint_time': checkpoint['timestamp']})

        print("Rollback complete")

## Performance Optimization

### Parallel Migration Processing

```python
class ParallelMigrator:
    """Migrate data using parallel workers."""

    def __init__(self, source_db, target_graph, num_workers=4):
        self.source = source_db
        self.target = target_graph
        self.num_workers = num_workers

    async def migrate_table_parallel(self, table_name, label):
        """Migrate table using parallel workers."""
        # Get total row count
        total_rows = await self.source.fetch_val(f"SELECT COUNT(*) FROM {table_name}")

        chunk_size = total_rows // self.num_workers + 1

        # Create worker tasks
        tasks = []
        for worker_id in range(self.num_workers):
            offset = worker_id * chunk_size
            task = self.migrate_chunk(table_name, label, offset, chunk_size, worker_id)
            tasks.append(task)

        # Execute in parallel
        results = await asyncio.gather(*tasks)

        total_migrated = sum(results)
        print(f"Migrated {total_migrated} rows from {table_name}")

    async def migrate_chunk(self, table_name, label, offset, limit, worker_id):
        """Migrate a chunk of data (worker task)."""
        rows = await self.source.fetch(f"""
            SELECT * FROM {table_name}
            ORDER BY id
            LIMIT {limit} OFFSET {offset}
        """)

        if not rows:
            return 0

        # Create connection for this worker
        worker_client = GeodeClient("localhost", 3141)

        try:
            async with worker_client.transaction():
                await worker_client.execute(f"""
                    UNWIND $rows AS row
                    CREATE (n:{label})
                    SET n = row
                """, {'rows': rows})

            print(f"Worker {worker_id}: Migrated {len(rows)} rows")
            return len(rows)

        finally:
            await worker_client.close()
```

## Learn More

- [Database Migration Best Practices](https://www.liquibase.org/best-practices.html)
- [Zero-Downtime Migrations](https://stripe.com/blog/online-migrations)
