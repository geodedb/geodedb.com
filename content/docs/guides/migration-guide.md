---
title: "Migration Guide"
description: "Complete guide for migrating data to Geode, upgrading between versions, migrating from other graph databases, backup and restore procedures, and zero-downtime migration strategies."
url: /docs/guides/migration-guide/
keywords: ["migration", "upgrade", "backup", "restore", "data import", "version upgrade", "zero downtime", "Neo4j migration", "cloud backup", "S3 backup", "point-in-time recovery"]
weight: 60
slug: "migration-guide"
canonical: "https://geodedb.com/docs/guides/migration-guide/"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

This comprehensive guide covers all aspects of migrating to and within Geode: version upgrades, data migration from other databases, backup and restore procedures, zero-downtime strategies, and best practices for production environments.

## Overview

Geode provides multiple migration paths depending on your source system and requirements:

- **Version Upgrades**: Migrate between Geode versions with backward compatibility
- **Database Migrations**: Move data from Neo4j, JanusGraph, or other graph databases
- **Backup & Restore**: Use S3-compatible cloud storage for disaster recovery
- **Zero-Downtime Migrations**: Maintain service availability during upgrades
- **Schema Evolution**: Safely modify schemas in production systems

## Version Upgrade Guide

### Current Version Status

**Geode v0.1.3** (January 2026) - Production Ready
- 100% GQL compliance (ISO/IEC 39075:2024)
- 97.4% Test Pass Rate (1644/1688 tests)
- All 7 development phases complete

### Pre-Upgrade Checklist

Before upgrading any Geode instance, complete this checklist:

```bash
# 1. Check current version
geode --version

# 2. Create full backup
geode backup --dest s3://my-bucket/backups --mode full

# 3. Verify backup integrity
geode backup --dest s3://my-bucket/backups --list

# 4. Document current configuration
cp /etc/geode/geode.yaml /etc/geode/geode.yaml.backup
env | grep GEODE_ > geode-env.backup

# 5. Test queries in new version (staging environment first)
geode query "MATCH (n) RETURN count(n)"

# 6. Review release notes for breaking changes
# Check: https://geodedb.com/docs/release-notes/
```

### In-Place Upgrade Procedure

Upgrade existing Geode installation without data migration:

```bash
# 1. Stop current server gracefully
systemctl stop geode
# Or: pkill -TERM geode

# 2. Backup data directory
tar -czf /backup/geode-data-$(date +%Y%m%d).tar.gz /var/lib/geode/data

# 3. Install new version (build from source)
git clone https://github.com/codeprosorg/geode /tmp/geode-upgrade
cd /tmp/geode-upgrade
make build
install -m 0755 ./zig-out/bin/geode /usr/local/bin/geode

# 4. Verify new version
geode --version

# 5. Start server with existing data
systemctl start geode

# 6. Verify server health
geode query "RETURN 1 AS health_check"

# 7. Monitor logs for errors
journalctl -u geode -f
```

### Rolling Upgrade (Distributed Clusters)

Upgrade cluster nodes with zero downtime:

```bash
# Build new version locally (run once)
git clone https://github.com/codeprosorg/geode /tmp/geode-upgrade
cd /tmp/geode-upgrade
make build
GEODE_BIN=/tmp/geode-upgrade/zig-out/bin/geode

# 1. Upgrade secondary nodes first (one at a time)
for node in node2 node3 node4; do
    echo "Upgrading $node..."

    # Stop node
    ssh $node "systemctl stop geode"

    # Install new version
    scp "$GEODE_BIN" "$node:/usr/local/bin/geode"

    # Start node
    ssh $node "systemctl start geode"

    # Verify health
    ssh $node "geode query 'RETURN 1 AS health'"

    # Wait for node to stabilize
    sleep 30
done

# 2. Upgrade primary node last
ssh node1 "systemctl stop geode"
scp "$GEODE_BIN" "node1:/usr/local/bin/geode"
ssh node1 "systemctl start geode"

# 3. Verify cluster health
geode query "MATCH (n) RETURN count(n)"
```

### Configuration Migration

Migrate configuration between versions:

```yaml
# Old configuration (v0.1.x)
server:
  listen: '0.0.0.0:3141'
  data_dir: '/var/lib/geode'

# New configuration (v0.1.x) - backward compatible
server:
  listen: '0.0.0.0:3141'
  data_dir: '/var/lib/geode'
  max_connections: 50000  # New option

tls:
  cert: '/etc/letsencrypt/live/geode.example.com/fullchain.pem'
  key: '/etc/letsencrypt/live/geode.example.com/privkey.pem'
  auto_generate: false  # New: secure-by-default

security:
  auth_enabled: true  # New: enabled-by-default (was optional)

storage:
  page_size: 8192
  cache_size: '1GB'
  tde_enabled: true  # New: transparent data encryption
```

**Breaking Changes (v0.1.x → v0.1.x)**:
- Authentication now **enabled by default** (was optional)
- TLS auto-generation **disabled by default** (use proper certificates)
- Hardcoded credentials removed (use environment variables)

## Migrating from Other Graph Databases

### Neo4j to Geode Migration

Migrate data from Neo4j to Geode using export/import strategy:

#### Step 1: Export from Neo4j

```cypher
// Export Neo4j data to CSV
CALL apoc.export.csv.all("neo4j-export.csv", {});

// Or use neo4j-admin dump
neo4j-admin database dump neo4j --to=/backups/neo4j.dump
```

#### Step 2: Convert Cypher to GQL

Neo4j uses Cypher; Geode uses ISO GQL (mostly compatible):

```gql
-- Neo4j Cypher (mostly compatible)
CREATE (alice:Person {name: 'Alice', age: 30})
CREATE (bob:Person {name: 'Bob', age: 25})
CREATE (alice)-[:KNOWS {since: 2020}]->(bob)

-- Geode GQL (identical syntax for basic operations)
CREATE (alice:Person {name: 'Alice', age: 30})
CREATE (bob:Person {name: 'Bob', age: 25})
CREATE (alice)-[:KNOWS {since: 2020}]->(bob)

-- Key differences:
-- 1. Neo4j MERGE → Geode INSERT ... ON CONFLICT
-- 2. Neo4j FOREACH → Geode supports standard loops
-- 3. Neo4j apoc functions → Geode built-in GQL functions
```

#### Step 3: Import to Geode

Create import script for bulk loading:

```bash
#!/bin/bash
# import-neo4j-data.sh

# Start Geode server
geode serve --listen 0.0.0.0:3141 &
GEODE_PID=$!

# Wait for server to start
sleep 5

# Import nodes
while IFS=',' read -r id name age; do
    geode query "CREATE (p:Person {id: $id, name: '$name', age: $age})"
done < nodes.csv

# Import relationships
while IFS=',' read -r from_id to_id since; do
    geode query "
        MATCH (a:Person {id: $from_id}), (b:Person {id: $to_id})
        CREATE (a)-[:KNOWS {since: $since}]->(b)
    "
done < relationships.csv

# Stop server
kill $GEODE_PID
```

#### Step 4: Verify Migration

```gql
-- Compare counts
MATCH (n) RETURN count(n) AS node_count;
MATCH ()-[r]->() RETURN count(r) AS relationship_count;

-- Verify specific patterns
MATCH (p:Person)-[:KNOWS]->(friend:Person)
RETURN p.name, count(friend) AS friend_count
ORDER BY friend_count DESC
LIMIT 10;
```

### JanusGraph to Geode Migration

JanusGraph uses Gremlin; convert to GQL:

```groovy
// JanusGraph Gremlin
g.addV('Person').property('name', 'Alice').property('age', 30)

// Geode GQL equivalent
CREATE (p:Person {name: 'Alice', age: 30})
```

**Gremlin to GQL Mapping**:

| Gremlin | GQL |
|---------|-----|
| `g.addV('Person')` | `CREATE (p:Person {...})` |
| `g.V().hasLabel('Person')` | `MATCH (p:Person) RETURN p` |
| `g.V().has('name', 'Alice')` | `MATCH (p {name: 'Alice'}) RETURN p` |
| `g.V().outE('KNOWS').inV()` | `MATCH (a)-[:KNOWS]->(b) RETURN b` |
| `g.V().count()` | `MATCH (n) RETURN count(n)` |

### TigerGraph to Geode Migration

Export TigerGraph data using GSQL:

```sql
-- TigerGraph GSQL export
USE GRAPH MyGraph
CREATE QUERY export_data() FOR GRAPH MyGraph {
  PRINT nodes TO "/tmp/nodes.csv";
  PRINT edges TO "/tmp/edges.csv";
}
INSTALL QUERY export_data
RUN QUERY export_data()

-- Then import to Geode using similar CSV import strategy
```

## Backup and Restore

### S3 Cloud Backup

Geode supports S3-compatible cloud storage for backups:

```bash
# Configure S3 credentials
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1

# Full backup
geode backup \
  --dest s3://my-bucket/geode-backups \
  --mode full \
  --compression gzip

# Output:
# Backup ID: 1738012345
# Size: 2.3 GB (compressed)
# Duration: 45s

# Incremental backup (delta from last full backup)
geode backup \
  --dest s3://my-bucket/geode-backups \
  --mode incremental \
  --parent 1738012345

# List all backups
geode backup --dest s3://my-bucket/geode-backups --list

# Output:
# Backup ID       Type          Size      Timestamp
# 1738012345      full          2.3 GB    2026-01-23 10:00:00
# 1738013456      incremental   156 MB    2026-01-23 11:00:00
# 1738014567      incremental   89 MB     2026-01-23 12:00:00
```

### Digital Ocean Spaces Backup

Digital Ocean Spaces is S3-compatible:

```bash
# Configure Digital Ocean credentials
export AWS_ACCESS_KEY_ID=your-do-spaces-key
export AWS_SECRET_ACCESS_KEY=your-do-spaces-secret
export AWS_ENDPOINT_URL=https://nyc3.digitaloceanspaces.com

# Backup to Digital Ocean Spaces
geode backup \
  --dest s3://my-space/geode-backups \
  --mode full \
  --compression gzip
```

### Point-in-Time Recovery (PITR)

Restore database to specific point in time:

```bash
# Restore to specific backup
geode restore \
  --source s3://my-bucket/geode-backups \
  --backup-id 1738012345 \
  --target /var/lib/geode/data

# Point-in-time recovery (arbitrary timestamp)
geode restore \
  --source s3://my-bucket/geode-backups \
  --backup-id 1738012345 \
  --target /var/lib/geode/data \
  --pitr-timestamp "2026-01-23 10:30:00"

# Process:
# 1. Restore base backup (full backup 1738012345)
# 2. Apply WAL segments up to specified timestamp
# 3. Stop at exact recovery point
```

### Automated Backup Strategy

Set up automated backups with cron:

```bash
#!/bin/bash
# /usr/local/bin/geode-backup.sh

# Configuration
BUCKET="s3://my-bucket/geode-backups"
RETENTION_DAYS=30

# Full backup on Sunday
if [ $(date +%u) -eq 7 ]; then
    BACKUP_ID=$(geode backup --dest $BUCKET --mode full --compression gzip | grep "Backup ID" | awk '{print $3}')
    echo $BACKUP_ID > /var/lib/geode/last-full-backup
else
    # Incremental backup on weekdays
    PARENT=$(cat /var/lib/geode/last-full-backup)
    geode backup --dest $BUCKET --mode incremental --parent $PARENT --compression gzip
fi

# Delete backups older than retention period
geode backup --dest $BUCKET --prune --older-than-days $RETENTION_DAYS

# Add to crontab
# 0 2 * * * /usr/local/bin/geode-backup.sh >> /var/log/geode-backup.log 2>&1
```

## Zero-Downtime Migration Strategies

### Blue-Green Deployment

Maintain two identical environments for zero-downtime upgrades:

```bash
# Setup:
# - Blue environment: production (v0.1.x)
# - Green environment: staging (v0.1.x)

# Step 1: Replicate data to green environment
geode backup --dest s3://my-bucket/migration --mode full --source blue
geode restore --source s3://my-bucket/migration --target green

# Step 2: Enable continuous replication (CDC)
# Configure CDC webhook from blue to green
cat > cdc-config.yaml <<EOF
webhooks:
  - name: green-replica
    endpoint: https://green.example.com/cdc
    retry:
      max_attempts: 5
      base_delay_ms: 100
EOF

# Step 3: Monitor replication lag
watch 'geode query "MATCH (n) RETURN count(n)" --host blue'
watch 'geode query "MATCH (n) RETURN count(n)" --host green'

# Step 4: Switch traffic to green (update DNS/load balancer)
# AWS Route53 weighted routing
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://switch-to-green.json

# Step 5: Monitor green environment
# If issues: switch back to blue (instant rollback)
# If stable: decommission blue environment
```

### Read Replica Migration

Use read replicas to minimize downtime:

```bash
# Build new version locally (run once)
git clone https://github.com/codeprosorg/geode /tmp/geode-upgrade
cd /tmp/geode-upgrade
make build
GEODE_BIN=/tmp/geode-upgrade/zig-out/bin/geode

# Step 1: Create read replica
geode replica create \
  --primary geode-primary.example.com:3141 \
  --replica geode-replica.example.com:3141

# Step 2: Upgrade replica to new version
ssh geode-replica "systemctl stop geode"
scp "$GEODE_BIN" "geode-replica:/usr/local/bin/geode"
ssh geode-replica "systemctl start geode"

# Step 3: Test read queries on replica
geode query "MATCH (n) RETURN count(n)" --host geode-replica.example.com

# Step 4: Promote replica to primary
geode replica promote --host geode-replica.example.com:3141

# Step 5: Upgrade old primary (now secondary)
ssh geode-primary "systemctl stop geode"
scp "$GEODE_BIN" "geode-primary:/usr/local/bin/geode"
ssh geode-primary "systemctl start geode"
```

### Shadow Traffic Migration

Replicate production traffic to new version for validation:

```bash
# Use HAProxy to mirror traffic to both environments

# /etc/haproxy/haproxy.cfg
frontend geode_frontend
    bind *:3141
    default_backend geode_primary

backend geode_primary
    server primary geode-v17.example.com:3141 check

    # Mirror traffic to new version (no client impact)
    server shadow geode-v18.example.com:3141 check backup

# Monitor shadow environment for errors
tail -f /var/log/geode-v18/error.log

# Compare query performance
diff <(geode query "EXPLAIN MATCH (n) RETURN n" --host v17) \
     <(geode query "EXPLAIN MATCH (n) RETURN n" --host v18)
```

## Schema Evolution

### Adding New Properties

Add properties to existing nodes without downtime:

```gql
-- Add optional property (backward compatible)
MATCH (p:Person)
SET p.email = null;  -- Initialize with null

-- Backfill property values
MATCH (p:Person)
WHERE p.email IS NULL
SET p.email = p.name + '@example.com';  -- Example backfill logic

-- Add constraint after backfilling
CREATE CONSTRAINT person_email_unique ON (p:Person) ASSERT p.email IS UNIQUE;
```

### Adding New Labels

Add labels to existing nodes:

```gql
-- Add secondary label to nodes
MATCH (p:Person)
WHERE p.age >= 18
SET p:Adult;

-- Query with new label
MATCH (a:Adult)
RETURN a.name, a.age;
```

### Modifying Relationships

Transform relationship structures safely:

```gql
-- Old structure: (Person)-[:FRIEND]->(Person)
-- New structure: (Person)-[:KNOWS {type: 'friend'}]->(Person)

-- Migration query (idempotent)
MATCH (a:Person)-[old:FRIEND]->(b:Person)
WHERE NOT EXISTS((a)-[:KNOWS]->(b))
CREATE (a)-[new:KNOWS {type: 'friend', since: old.since}]->(b);

-- Verify migration
MATCH (a)-[:KNOWS]->(b)
RETURN count(*) AS new_count;

MATCH (a)-[:FRIEND]->(b)
RETURN count(*) AS old_count;  -- Should match new_count

-- Remove old relationships after verification
MATCH (a)-[old:FRIEND]->(b)
DELETE old;
```

### Adding Indexes

Create indexes on existing data without blocking writes:

```gql
-- Create index (non-blocking in Geode)
CREATE INDEX person_email ON Person(email);

-- Verify index usage
EXPLAIN MATCH (p:Person) WHERE p.email = '[email protected]' RETURN p;

-- Output should show "Index Scan" instead of "Sequential Scan"
```

## Data Validation

### Pre-Migration Validation

Validate source data before migration:

```gql
-- Check for orphaned relationships
MATCH (a)-[r]->(b)
WHERE a IS NULL OR b IS NULL
RETURN count(r) AS orphaned_relationships;

-- Check for duplicate nodes (by business key)
MATCH (p:Person)
WITH p.email AS email, count(*) AS count
WHERE count > 1
RETURN email, count;

-- Check for invalid property values
MATCH (p:Person)
WHERE p.age IS NULL OR p.age < 0 OR p.age > 150
RETURN p.id, p.age;
```

### Post-Migration Validation

Verify data integrity after migration:

```gql
-- Compare node counts
MATCH (n)
RETURN labels(n) AS label, count(n) AS count
ORDER BY label;

-- Compare relationship counts
MATCH ()-[r]->()
RETURN type(r) AS relationship_type, count(r) AS count
ORDER BY relationship_type;

-- Verify critical queries return expected results
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.name = 'Alice'
RETURN friend.name
ORDER BY friend.name;

-- Check index integrity
SHOW INDEXES;
```

## Performance Optimization During Migration

### Bulk Loading Best Practices

Optimize bulk data imports:

```bash
#!/bin/bash
# Bulk import with batching

BATCH_SIZE=1000
TOTAL_ROWS=$(wc -l < nodes.csv)

# Disable constraints temporarily for faster imports
geode query "ALTER DATABASE DISABLE CONSTRAINTS"

# Import in batches
for ((i=0; i<$TOTAL_ROWS; i+=$BATCH_SIZE)); do
    echo "Processing batch $((i/$BATCH_SIZE + 1))..."

    tail -n +$((i+1)) nodes.csv | head -n $BATCH_SIZE | while IFS=',' read -r id name age; do
        echo "CREATE (p:Person {id: $id, name: '$name', age: $age})"
    done | geode query --batch

    # Progress reporting
    echo "Imported $((i+$BATCH_SIZE)) of $TOTAL_ROWS rows"
done

# Re-enable constraints
geode query "ALTER DATABASE ENABLE CONSTRAINTS"

# Rebuild indexes
geode query "REINDEX DATABASE"
```

### Transaction Batching

Use transactions for consistent bulk operations:

```gql
-- Import in transactions (batch of 1000 nodes)
BEGIN TRANSACTION;

CREATE (p1:Person {id: 1, name: 'Alice', age: 30});
CREATE (p2:Person {id: 2, name: 'Bob', age: 25});
-- ... 998 more nodes ...
CREATE (p1000:Person {id: 1000, name: 'Charlie', age: 35});

COMMIT;
```

### Parallel Import

Parallelize imports for faster migration:

```bash
#!/bin/bash
# Parallel import using GNU parallel

# Split CSV into chunks
split -l 10000 nodes.csv chunk-

# Import chunks in parallel (4 workers)
ls chunk-* | parallel -j 4 '
    cat {} | while IFS="," read -r id name age; do
        geode query "CREATE (p:Person {id: $id, name: \"$name\", age: $age})"
    done
'

# Cleanup
rm chunk-*
```

## Troubleshooting Common Migration Issues

### Issue: Backup Timeout

**Symptom**: Backup fails with timeout error

```bash
# Increase backup timeout
export GEODE_BACKUP_TIMEOUT_MS=600000  # 10 minutes

# Use incremental backups for large datasets
geode backup --dest s3://bucket/backups --mode incremental --parent <last-full-backup-id>
```

### Issue: Restore Corruption

**Symptom**: Restore completes but data is corrupted

```bash
# Verify backup integrity before restore
geode backup --dest s3://bucket/backups --verify --backup-id 1738012345

# If corrupted, try previous backup
geode backup --dest s3://bucket/backups --list
geode restore --source s3://bucket/backups --backup-id <previous-backup-id> --target /var/lib/geode/data
```

### Issue: Out of Memory During Import

**Symptom**: Server crashes with OOM during bulk import

```bash
# Increase server memory allocation
export GEODE_MAX_MEMORY=16GB

# Reduce batch size
BATCH_SIZE=500  # Instead of 1000

# Use streaming import (process one record at a time)
while IFS=',' read -r id name age; do
    geode query "CREATE (p:Person {id: $id, name: '$name', age: $age})"
done < nodes.csv
```

### Issue: Index Build Timeout

**Symptom**: Index creation times out on large datasets

```gql
-- Create index with timeout configuration
CREATE INDEX person_email ON Person(email)
WITH (build_timeout_ms = 600000);  -- 10 minutes

-- Monitor index build progress
SHOW INDEX BUILD STATUS;
```

## Related Documentation

- **[Server Configuration](/docs/configuration/server-configuration/)** - Complete configuration reference
- **[Troubleshooting Guide](/docs/guides/troubleshooting/)** - Common issues and solutions
- **[Performance Tuning](/docs/query/performance-tuning/)** - Optimize query performance
- **[Schema Design Guide](/docs/guides/schema-design/)** - Best practices for schema modeling

## Summary

Geode provides comprehensive migration capabilities:

- **Version Upgrades**: In-place and rolling upgrade procedures with backward compatibility
- **Database Migrations**: Convert from Neo4j, JanusGraph, TigerGraph to Geode GQL
- **Backup & Restore**: S3-compatible cloud backup with point-in-time recovery
- **Zero-Downtime Strategies**: Blue-green deployment, read replica migration, shadow traffic
- **Schema Evolution**: Safe schema modifications without downtime
- **Bulk Loading**: Optimized import strategies for large datasets

Always test migrations in staging environments before production deployment. Use incremental backups for efficiency and verify data integrity after migration.
