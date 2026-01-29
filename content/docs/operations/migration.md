---
title: "Migration Guide"
description: "Comprehensive migration guide for moving data to Geode from other databases, between environments, and across versions"
url: /docs/operations/migration/
weight: 50
tags:
  - operations
  - migration
  - data-import
  - neo4j
  - database-migration
categories:
  - operations
keywords:
  - migration
  - data import
  - Neo4j migration
  - database migration
  - ETL
  - data transfer
  - bulk import
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Migration Guide

This guide covers migrating data to Geode from other graph databases, relational databases, and between Geode environments.

## Overview

Geode supports multiple migration scenarios:

| Source | Method | Complexity | Downtime |
|--------|--------|------------|----------|
| Neo4j | Export/Import | Medium | Minutes-hours |
| JanusGraph | Gremlin export | Medium | Minutes-hours |
| PostgreSQL | ETL pipeline | Medium | Varies |
| MongoDB | ETL pipeline | Medium | Varies |
| CSV/JSON | Bulk import | Low | Minutes |
| Another Geode | Replication/Backup | Low | Zero-minutes |

## Migration from Neo4j

### Compatibility Overview

Neo4j uses Cypher; Geode uses ISO GQL. Most basic Cypher is compatible:

| Cypher Feature | GQL Support | Notes |
|----------------|-------------|-------|
| MATCH patterns | Full | Identical syntax |
| CREATE nodes | Full | Identical syntax |
| CREATE relationships | Full | Identical syntax |
| WHERE clauses | Full | Identical syntax |
| RETURN | Full | Identical syntax |
| MERGE | Partial | Use INSERT...ON CONFLICT |
| APOC procedures | None | Use built-in functions |
| FOREACH | Partial | Standard loops |

### Export from Neo4j

**Method 1: CSV Export**

```cypher
// Export nodes to CSV
CALL apoc.export.csv.query(
    "MATCH (n) RETURN n.id, labels(n)[0] AS label, properties(n) AS props",
    "nodes.csv",
    {}
);

// Export relationships to CSV
CALL apoc.export.csv.query(
    "MATCH (a)-[r]->(b) RETURN id(a) AS source, id(b) AS target, type(r) AS type, properties(r) AS props",
    "relationships.csv",
    {}
);
```

**Method 2: JSON Export**

```cypher
// Export entire database to JSON
CALL apoc.export.json.all("export.json", {useTypes: true});
```

**Method 3: Cypher Export**

```cypher
// Generate Cypher statements
CALL apoc.export.cypher.all("export.cypher", {
    format: "cypher-shell",
    useOptimizations: {type: "UNWIND_BATCH", unwindBatchSize: 1000}
});
```

### Import to Geode

**From CSV**:

```bash
#!/bin/bash
# import-neo4j-csv.sh

# Import nodes
geode import csv \
  --file nodes.csv \
  --format auto \
  --batch-size 1000 \
  --mapping '{"id": "id", "label": "_label", "props": "_properties"}'

# Import relationships
geode import csv \
  --file relationships.csv \
  --format auto \
  --batch-size 1000 \
  --relationship-mode true \
  --mapping '{"source": "_source", "target": "_target", "type": "_type", "props": "_properties"}'
```

**From JSON**:

```bash
geode import json \
  --file export.json \
  --format neo4j \
  --batch-size 1000
```

**From Cypher (with conversion)**:

```bash
# Convert Cypher to GQL (if needed)
geode migrate cypher-to-gql \
  --input export.cypher \
  --output import.gql

# Execute import
geode execute-file --file import.gql --batch-size 100
```

### Query Migration

Convert common Cypher patterns to GQL:

```cypher
// Neo4j: MERGE (create if not exists)
MERGE (p:Person {email: 'alice@example.com'})
ON CREATE SET p.name = 'Alice', p.created = datetime()
ON MATCH SET p.updated = datetime()

// Geode GQL equivalent
INSERT (:Person {email: 'alice@example.com', name: 'Alice', created: datetime()})
ON CONFLICT (email) DO UPDATE SET updated = datetime()
```

```cypher
// Neo4j: APOC functions
CALL apoc.create.uuid() YIELD uuid

// Geode GQL equivalent
SELECT gen_random_uuid() AS uuid
```

```cypher
// Neo4j: FOREACH
MATCH (p:Person)
FOREACH (i IN range(1, 10) | CREATE (p)-[:HAS_ITEM]->(:Item {num: i}))

// Geode GQL equivalent
MATCH (p:Person)
UNWIND range(1, 10) AS i
CREATE (p)-[:HAS_ITEM]->(:Item {num: i})
```

## Migration from JanusGraph

### Export from JanusGraph

```groovy
// Export using Gremlin
g.V().valueMap(true).toList().collect { v ->
    [id: v[T.id], label: v[T.label], properties: v.findAll { k, _ -> k != T.id && k != T.label }]
}.toJson()

g.E().valueMap(true).toList().collect { e ->
    [id: e[T.id], label: e[T.label], source: e[Direction.OUT].id(), target: e[Direction.IN].id(), properties: e.findAll { k, _ -> !(k in [T.id, T.label, Direction.OUT, Direction.IN]) }]
}.toJson()
```

### Convert Gremlin to GQL

| Gremlin | GQL |
|---------|-----|
| `g.addV('Person').property('name', 'Alice')` | `CREATE (:Person {name: 'Alice'})` |
| `g.V().hasLabel('Person')` | `MATCH (p:Person) RETURN p` |
| `g.V().has('name', 'Alice')` | `MATCH (p {name: 'Alice'}) RETURN p` |
| `g.V().outE('KNOWS').inV()` | `MATCH (a)-[:KNOWS]->(b) RETURN b` |
| `g.V().both('KNOWS')` | `MATCH (a)-[:KNOWS]-(b) RETURN b` |
| `g.V().out('KNOWS').out('KNOWS')` | `MATCH (a)-[:KNOWS*2]->(b) RETURN b` |

### Import Script

```bash
#!/bin/bash
# import-janusgraph.sh

# Convert Gremlin JSON export to GQL
python3 << 'EOF'
import json

# Load JanusGraph export
with open('vertices.json') as f:
    vertices = json.load(f)

with open('edges.json') as f:
    edges = json.load(f)

# Generate GQL statements
with open('import.gql', 'w') as out:
    # Create nodes
    for v in vertices:
        props = ', '.join(f"{k}: {json.dumps(v['properties'].get(k, [None])[0])}"
                          for k in v['properties'] if v['properties'][k])
        out.write(f"CREATE (:{v['label']} {{{props}}});\n")

    # Create relationships
    for e in edges:
        props = ', '.join(f"{k}: {json.dumps(v)}"
                          for k, v in e.get('properties', {}).items())
        out.write(f"MATCH (a), (b) WHERE id(a) = {e['source']} AND id(b) = {e['target']} "
                  f"CREATE (a)-[:{e['label']} {{{props}}}]->(b);\n")
EOF

# Execute import
geode execute-file --file import.gql
```

## Migration from Relational Databases

### PostgreSQL to Geode

**Schema Mapping**:

```
PostgreSQL Table          ->  Geode Node Label
PostgreSQL Row            ->  Geode Node
PostgreSQL Column         ->  Geode Property
PostgreSQL Foreign Key    ->  Geode Relationship
PostgreSQL Join Table     ->  Geode Relationship with properties
```

**Export from PostgreSQL**:

```sql
-- Export users
COPY (
    SELECT id, name, email, created_at
    FROM users
) TO '/tmp/users.csv' WITH CSV HEADER;

-- Export relationships (friendship)
COPY (
    SELECT user_id AS source, friend_id AS target, created_at
    FROM friendships
) TO '/tmp/friendships.csv' WITH CSV HEADER;
```

**Import to Geode**:

```bash
# Import users as Person nodes
geode import csv \
  --file users.csv \
  --label Person \
  --id-column id \
  --batch-size 1000

# Import friendships as KNOWS relationships
geode import csv \
  --file friendships.csv \
  --relationship KNOWS \
  --source-label Person \
  --source-id source \
  --target-label Person \
  --target-id target \
  --batch-size 1000
```

### MySQL to Geode

```bash
# Export from MySQL
mysql -u user -p database -e "
    SELECT id, name, email FROM users
" | tail -n +2 > users.tsv

# Import to Geode
geode import csv \
  --file users.tsv \
  --delimiter '\t' \
  --label User \
  --id-column id
```

### MongoDB to Geode

```bash
# Export from MongoDB
mongoexport --db mydb --collection users --out users.json --jsonArray

# Import to Geode
geode import json \
  --file users.json \
  --label User \
  --id-field _id
```

## Bulk Import

### CSV Import

```bash
# Basic CSV import
geode import csv \
  --file data.csv \
  --label Person \
  --batch-size 1000

# Advanced options
geode import csv \
  --file data.csv \
  --label Person \
  --id-column uuid \
  --skip-header true \
  --delimiter ',' \
  --quote '"' \
  --escape '\\' \
  --null-value 'NULL' \
  --batch-size 5000 \
  --parallel 4 \
  --on-error skip \
  --log-errors /var/log/geode/import-errors.log
```

### JSON Import

```bash
# JSON array import
geode import json \
  --file data.json \
  --label Person \
  --batch-size 1000

# JSONL (JSON Lines) import
geode import json \
  --file data.jsonl \
  --format jsonl \
  --label Person \
  --batch-size 1000
```

### GQL Script Import

```bash
# Execute GQL file
geode execute-file \
  --file import.gql \
  --batch-size 100 \
  --continue-on-error true
```

## Environment Migration

### Development to Production

```bash
#!/bin/bash
# migrate-dev-to-prod.sh

DEV_HOST="geode-dev.internal"
PROD_HOST="geode-prod.internal"
BACKUP_BUCKET="s3://geode-backups"

echo "=== Migrating Dev to Prod ==="

# 1. Create backup from dev
echo "Creating backup from dev..."
geode backup \
  --host "$DEV_HOST" \
  --dest "$BACKUP_BUCKET/dev-export-$(date +%Y%m%d)" \
  --mode full

# 2. Optionally sanitize data
echo "Sanitizing data..."
# Remove test data, mask PII, etc.

# 3. Restore to prod (in maintenance window)
echo "Restoring to prod..."
geode restore \
  --host "$PROD_HOST" \
  --source "$BACKUP_BUCKET/dev-export-$(date +%Y%m%d)" \
  --backup-id latest

echo "=== Migration Complete ==="
```

### Cross-Region Migration

```bash
#!/bin/bash
# cross-region-migration.sh

SOURCE_REGION="us-east-1"
TARGET_REGION="eu-west-1"
SOURCE_HOST="geode.us-east.example.com"
TARGET_HOST="geode.eu-west.example.com"

echo "=== Cross-Region Migration ==="

# 1. Set up replication
echo "Setting up replication..."
geode admin replicate \
  --source "$SOURCE_HOST" \
  --target "$TARGET_HOST" \
  --mode async

# 2. Wait for sync
echo "Waiting for initial sync..."
while true; do
    LAG=$(geode admin replication-lag --target "$TARGET_HOST")
    echo "Replication lag: $LAG bytes"
    [ "$LAG" -lt 1000 ] && break
    sleep 30
done

# 3. Stop writes to source
echo "Stopping writes to source..."
geode admin read-only --host "$SOURCE_HOST"

# 4. Final sync
echo "Final synchronization..."
sleep 60

# 5. Promote target
echo "Promoting target..."
geode admin promote --host "$TARGET_HOST"

# 6. Update DNS
echo "Update DNS to point to $TARGET_HOST"

echo "=== Migration Complete ==="
```

## Data Validation

### Pre-Migration Validation

```gql
-- Count nodes by label
MATCH (n)
RETURN labels(n)[0] AS label, count(n) AS count
ORDER BY label;

-- Count relationships by type
MATCH ()-[r]->()
RETURN type(r) AS type, count(r) AS count
ORDER BY type;

-- Check for orphaned relationships
MATCH (a)-[r]->(b)
WHERE a IS NULL OR b IS NULL
RETURN count(r) AS orphaned;

-- Find duplicates
MATCH (p:Person)
WITH p.email AS email, count(*) AS count
WHERE count > 1
RETURN email, count;
```

### Post-Migration Validation

```bash
#!/bin/bash
# validate-migration.sh

SOURCE_HOST="$1"
TARGET_HOST="$2"

echo "=== Migration Validation ==="

# Compare node counts
echo "Comparing node counts..."
SOURCE_NODES=$(geode query "MATCH (n) RETURN count(n)" --host "$SOURCE_HOST" --format json | jq -r '.rows[0]["count(n)"]')
TARGET_NODES=$(geode query "MATCH (n) RETURN count(n)" --host "$TARGET_HOST" --format json | jq -r '.rows[0]["count(n)"]')

echo "Source nodes: $SOURCE_NODES"
echo "Target nodes: $TARGET_NODES"

if [ "$SOURCE_NODES" != "$TARGET_NODES" ]; then
    echo "WARNING: Node count mismatch!"
fi

# Compare relationship counts
echo "Comparing relationship counts..."
SOURCE_RELS=$(geode query "MATCH ()-[r]->() RETURN count(r)" --host "$SOURCE_HOST" --format json | jq -r '.rows[0]["count(r)"]')
TARGET_RELS=$(geode query "MATCH ()-[r]->() RETURN count(r)" --host "$TARGET_HOST" --format json | jq -r '.rows[0]["count(r)"]')

echo "Source relationships: $SOURCE_RELS"
echo "Target relationships: $TARGET_RELS"

if [ "$SOURCE_RELS" != "$TARGET_RELS" ]; then
    echo "WARNING: Relationship count mismatch!"
fi

# Spot check specific records
echo "Spot checking records..."
geode query "MATCH (p:Person {email: 'alice@example.com'}) RETURN p" --host "$TARGET_HOST"

echo "=== Validation Complete ==="
```

## Performance Optimization

### Bulk Loading Best Practices

1. **Disable constraints during import**:
```gql
-- Temporarily disable constraints
ALTER DATABASE DISABLE CONSTRAINTS;

-- Import data
-- ...

-- Re-enable constraints
ALTER DATABASE ENABLE CONSTRAINTS;
```

2. **Use transactions for batching**:
```gql
BEGIN TRANSACTION;
CREATE (:Person {id: 1, name: 'Alice'});
CREATE (:Person {id: 2, name: 'Bob'});
-- ... up to 1000 per transaction
COMMIT;
```

3. **Create indexes after import**:
```gql
-- Import data first
-- Then create indexes
CREATE INDEX person_email ON Person(email);
CREATE INDEX person_name ON Person(name);
```

4. **Use parallel imports**:
```bash
# Split file and import in parallel
split -l 100000 large-file.csv chunk-
ls chunk-* | parallel -j 4 'geode import csv --file {}'
```

### Memory Optimization

```bash
# For large imports, increase memory
export GEODE_MAX_MEMORY=16GB
export GEODE_IMPORT_BUFFER_SIZE=1GB

# Use streaming import for very large files
geode import csv \
  --file huge-file.csv \
  --streaming true \
  --batch-size 1000
```

## Troubleshooting

### Import Fails with OOM

```bash
# Reduce batch size
geode import csv --batch-size 100

# Use streaming mode
geode import csv --streaming true

# Increase memory
export GEODE_MAX_MEMORY=32GB
```

### Duplicate Key Errors

```bash
# Skip duplicates
geode import csv --on-duplicate skip

# Update duplicates
geode import csv --on-duplicate update

# Fail on duplicates (default)
geode import csv --on-duplicate fail
```

### Character Encoding Issues

```bash
# Specify encoding
geode import csv --encoding utf-8

# Convert file first
iconv -f ISO-8859-1 -t UTF-8 input.csv > input-utf8.csv
```

### Slow Import Performance

```bash
# Check index status (indexes slow down writes)
geode admin index-status

# Temporarily drop indexes
geode query "DROP INDEX person_email"

# Import data
geode import csv --file data.csv

# Recreate indexes
geode query "CREATE INDEX person_email ON Person(email)"
```

## Related Documentation

- **[Backup Procedures](/docs/operations/backup/)** - Backup-based migration
- **[Upgrade Procedures](/docs/operations/upgrades/)** - Version migration
- **[Disaster Recovery](/docs/operations/disaster-recovery/)** - DR migration
- **[Schema Design](/docs/guides/schema-design/)** - Schema planning
- **[Migration Guide (Detailed)](/docs/guides/migration-guide/)** - Extended migration guide
