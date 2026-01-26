---
title: "Database Tools & Utilities"
description: "Comprehensive guide to Geode database tools and utilities. Learn about administration tools, monitoring utilities, data migration tools, and operational utilities for enterprise database management."
keywords:
  - database tools
  - admin tools
  - monitoring utilities
  - migration tools
  - backup tools
  - data import
  - database utilities
  - Geode
  - graph database
  - database administration
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/tools/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Effective database operations require a robust suite of tools for administration, monitoring, data management, and troubleshooting. Geode provides comprehensive database tools and utilities that enable database administrators, DevOps engineers, and developers to manage graph database instances efficiently at enterprise scale.

From backup and recovery to performance monitoring, schema validation to data migration, Geode's database tools cover the full spectrum of operational needs. This guide explores the essential tools, their usage patterns, and best practices for maintaining healthy, high-performance graph database deployments.

## Database Administration Tools

**Server Administration**:

The core administrative tools manage server lifecycle, configuration, and health:

```bash
# Server lifecycle management
geode serve           # Start database server
geode shutdown        # Graceful shutdown
geode restart         # Restart with updated config
geode status          # Health check and status

# Configuration management
geode config show     # Display current configuration
geode config set key=value  # Update configuration
geode config reload   # Reload configuration without restart

# User and permission management
geode user create --username admin --password-file pass.txt
geode user grant --username dev --role read_only
geode user revoke --username dev --role write
geode user list       # List all users
```

**Database Initialization**:

```bash
# Create new database instance
geode init --path /var/lib/geode --graph production

# Initialize with specific configuration
geode init --path /var/lib/geode \
           --graph production \
           --config /etc/geode/config.yaml

# Validate existing database
geode validate --path /var/lib/geode
```

## Backup and Recovery Tools

Geode provides comprehensive backup and restore capabilities with support for full, incremental, and point-in-time recovery:

**Full Backups**:

```bash
# Create full backup
geode backup create --output /backups/full-$(date +%Y%m%d).tar.gz

# Create backup with compression
geode backup create --output /backups/backup.tar.gz --compress gzip

# Create backup with encryption
geode backup create \
  --output /backups/backup.tar.gz.enc \
  --encrypt \
  --key-file /etc/geode/backup.key

# Verify backup integrity
geode backup verify --input /backups/full-20240124.tar.gz
```

**Incremental Backups**:

```bash
# Create incremental backup since specific date
geode backup create \
  --output /backups/incremental-$(date +%Y%m%d).tar.gz \
  --incremental \
  --since 2024-01-20

# Create incremental backup since last full backup
geode backup create \
  --output /backups/incremental.tar.gz \
  --incremental \
  --since-last-full
```

**Restore Operations**:

```bash
# Restore from full backup
geode restore --input /backups/full-20240124.tar.gz --path /var/lib/geode

# Restore with point-in-time recovery
geode restore \
  --input /backups/full-20240124.tar.gz \
  --path /var/lib/geode \
  --until "2024-01-24 15:30:00"

# Restore to alternate location
geode restore \
  --input /backups/full-20240124.tar.gz \
  --path /var/lib/geode-restored

# Decrypt and restore
geode restore \
  --input /backups/backup.tar.gz.enc \
  --path /var/lib/geode \
  --decrypt \
  --key-file /etc/geode/backup.key
```

**Automated Backup Scheduling**:

```bash
# cron job for daily backups
0 2 * * * geode backup create --output /backups/daily-$(date +\%Y\%m\%d).tar.gz

# Weekly full backup + daily incrementals
0 2 * * 0 geode backup create --output /backups/full-$(date +\%Y\%m\%d).tar.gz
0 2 * * 1-6 geode backup create --output /backups/inc-$(date +\%Y\%m\%d).tar.gz --incremental
```

## Data Import and Export Tools

**Import Utilities**:

Geode supports multiple import formats for migrating data from external sources:

```bash
# Import from JSON
geode import --format json --input data.json

# Import from CSV with schema
geode import csv \
  --nodes users.csv \
  --relationships follows.csv \
  --schema schema.yaml

# Import from GraphML
geode import --format graphml --input graph.xml

# Bulk load from directory
geode bulk-load --input /data/import/ --workers 8 --batch-size 10000

# Import with transaction batching
geode import csv \
  --nodes products.csv \
  --batch-size 5000 \
  --commit-interval 10000
```

**CSV Import Configuration**:

```yaml
# schema.yaml
nodes:
  - label: User
    file: users.csv
    id_column: user_id
    properties:
      name: string
      email: string
      created_at: timestamp

relationships:
  - type: FOLLOWS
    file: follows.csv
    from_column: follower_id
    to_column: followee_id
    properties:
      since: timestamp
```

**Export Utilities**:

```bash
# Export to JSON
geode export --format json --output graph.json

# Export specific labels
geode export \
  --format json \
  --output users.json \
  --labels User,Account

# Export to CSV
geode export csv \
  --nodes users.csv \
  --relationships follows.csv

# Export to GraphML
geode export --format graphml --output graph.xml

# Export query results
geode export \
  --format json \
  --output recent_users.json \
  --query "MATCH (u:User) WHERE u.created_at > '2024-01-01' RETURN u"
```

## Schema Management Tools

**Schema Inspection**:

```bash
# Display current schema
geode schema show

# Export schema definition
geode schema export --output schema.gql

# Show schema statistics
geode schema stats

# Validate schema integrity
geode schema validate
```

**Schema Documentation**:

```bash
# Generate schema documentation
geode schema docs --output /docs/schema/

# Generate entity-relationship diagrams
geode schema diagram --output schema.png --format png

# Generate interactive HTML documentation
geode schema docs --format html --output /docs/
```

**Schema Migrations**:

```bash
# Create migration file
geode migration create --name add_user_indexes

# Apply pending migrations
geode migration apply

# Rollback last migration
geode migration rollback

# Show migration status
geode migration status
```

## Monitoring and Diagnostics Tools

**Health Checks**:

```bash
# Comprehensive health check
geode health check

# Check specific subsystems
geode health check --storage
geode health check --network
geode health check --memory

# JSON output for monitoring systems
geode health check --format json
```

**Performance Monitoring**:

```bash
# Display current metrics
geode metrics show

# Export metrics to Prometheus format
geode metrics export --format prometheus --output /var/lib/prometheus/geode.prom

# Monitor query performance
geode monitor queries --min-duration 1000ms

# Monitor slow queries in real-time
geode monitor slow-queries --threshold 5s
```

**Diagnostic Reports**:

```bash
# Generate diagnostic bundle
geode diagnostics collect --output /tmp/geode-diagnostics.tar.gz

# Include system information
geode diagnostics collect \
  --output diagnostics.tar.gz \
  --include-logs \
  --include-config \
  --include-stats

# Analyze diagnostic bundle
geode diagnostics analyze --input diagnostics.tar.gz
```

## Index Management Tools

**Index Operations**:

```bash
# List all indexes
geode index list

# Show index statistics
geode index stats

# Rebuild index
geode index rebuild --name user_email_idx

# Rebuild all indexes
geode index rebuild --all

# Analyze index usage
geode index analyze --output index_report.html
```

**Index Optimization**:

```bash
# Identify missing indexes
geode index suggest --query-log /var/log/geode/queries.log

# Find unused indexes
geode index unused --days 30

# Optimize index storage
geode index optimize --name product_search_idx
```

## Maintenance Tools

**Database Maintenance**:

```bash
# Vacuum deleted records
geode vacuum

# Compact storage files
geode compact --aggressive

# Analyze and update statistics
geode analyze

# Rebuild internal structures
geode rebuild --verify
```

**Data Integrity**:

```bash
# Check database consistency
geode check --full

# Verify referential integrity
geode check --relationships

# Repair detected issues
geode repair --auto
```

## Query Analysis Tools

**Query Profiling**:

```bash
# Analyze query performance
geode query analyze --input slow_queries.log

# Generate query execution plan
geode query explain --query "MATCH (n)-[r]->(m) RETURN n, r, m"

# Profile specific query
geode query profile --query-file complex_query.gql
```

**Query Optimization**:

```bash
# Suggest query optimizations
geode query optimize --input query.gql

# Analyze query patterns
geode query patterns --log /var/log/geode/queries.log --days 7
```

## Connection Management Tools

**Connection Monitoring**:

```bash
# List active connections
geode connections list

# Show connection details
geode connections show --id <connection-id>

# Terminate connection
geode connections kill --id <connection-id>

# Monitor connection pool
geode connections pool-stats
```

## Migration Tools

**Data Migration**:

```bash
# Migrate from Neo4j
geode migrate from-neo4j \
  --source bolt://localhost:7687 \
  --username neo4j \
  --password-file neo4j_pass.txt

# Migrate from PostgreSQL with foreign data wrapper
geode migrate from-postgres \
  --connection "postgresql://localhost/mydb" \
  --mapping migration_mapping.yaml

# Migrate with transformation
geode migrate \
  --source data.json \
  --transform transform_rules.js \
  --output migrated_data.json
```

## Replication and Clustering Tools

**Cluster Management**:

```bash
# Initialize cluster
geode cluster init --nodes 3 --quorum 2

# Add node to cluster
geode cluster add-node --host new-node.example.com

# Remove node from cluster
geode cluster remove-node --id node-2

# Show cluster status
geode cluster status

# Rebalance data across nodes
geode cluster rebalance
```

**Replication Control**:

```bash
# Setup replication
geode replication setup \
  --primary primary.example.com \
  --replica replica.example.com

# Monitor replication lag
geode replication status

# Promote replica to primary
geode replication promote --node replica-1
```

## Best Practices

1. **Automate Backups**: Schedule regular automated backups with retention policies. Test restore procedures regularly.

2. **Monitor Continuously**: Use monitoring tools to track health metrics, performance trends, and resource utilization.

3. **Document Operations**: Maintain runbooks documenting tool usage, configurations, and troubleshooting procedures.

4. **Use Configuration Files**: Store tool configurations in version-controlled files rather than command-line flags.

5. **Test in Staging**: Validate tool operations in staging environments before running in production.

6. **Audit Tool Access**: Log all administrative tool usage for security and compliance auditing.

7. **Capacity Planning**: Use diagnostic and monitoring tools to inform capacity planning decisions.

## Troubleshooting

**Common Issues**:

- **Backup Failures**: Check disk space, permissions, and network connectivity for remote backups
- **Import Errors**: Validate input file format, check schema compatibility, review error logs
- **Slow Exports**: Consider filtering data, increasing batch sizes, or using parallel workers
- **Migration Issues**: Verify source database connectivity, check transformation rules, review mapping configuration

**Diagnostic Commands**:

```bash
# Check logs
geode logs tail --lines 100 --level error

# Verify system requirements
geode system-check

# Test connectivity
geode ping --host primary.example.com:3141
```

## Related Topics

- Development Tooling and DevOps Integration
- CLI Reference and Commands
- Backup and Recovery Strategies
- Monitoring and Observability
- Database Administration
- Performance Tuning
- Migration and Integration

## Further Reading

- Database Administration Guide
- Backup and Recovery Best Practices
- Import/Export Format Specifications
- Schema Management Documentation
- Monitoring and Alerting Setup
- Disaster Recovery Planning
