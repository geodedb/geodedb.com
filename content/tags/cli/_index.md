---
title: "Command-Line Interface"
description: "Complete guide to the Geode CLI including server management, interactive shell, query execution, administration commands, scripting, and automation workflows."
keywords:
  - cli
  - command line
  - shell
  - REPL
  - terminal
  - geode shell
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/cli/"
    noindex: false
---

# Command-Line Interface

The Geode command-line interface (CLI) provides comprehensive tools for database administration, interactive query execution, server management, and automation. The CLI is the primary interface for operators, developers, and administrators working with Geode databases.

## Introduction to Geode CLI

The Geode CLI is a unified tool that combines server management, an interactive GQL shell (REPL), administrative commands, backup and recovery operations, and monitoring and diagnostics. Built with the same Zig codebase as the server, the CLI provides native performance and direct access to all database features.

The CLI follows Unix philosophy with composable commands, pipe-friendly output, consistent exit codes, and comprehensive help documentation. All commands support both interactive and scripted usage.

## Installation and Setup

### Basic Installation

```bash
# Install from package manager (Debian/Ubuntu)
sudo apt-get update
sudo apt-get install geode

# Install from package manager (macOS)
brew install geode

# Verify installation
geode version

# Show help
geode --help
geode help
```

### Configuration

Configure CLI defaults:

```bash
# Set default connection
geode config set connection.default=localhost:3141

# Set output format
geode config set output.format=table  # table, json, csv

# Set editor for query editing
geode config set editor=$EDITOR

# View configuration
geode config list

# Configuration file location: ~/.config/geode/config.toml
```

## Interactive Shell

### Starting the Shell

The interactive shell provides a REPL (Read-Eval-Print Loop) for GQL queries:

```bash
# Start interactive shell
geode shell

# Connect to specific server
geode shell --connect geode.example.com:3141

# Connect with authentication
geode shell --connect localhost:3141 --user admin --password

# Start with specific database
geode shell --database mydb
```

Shell session example:

```
Geode Shell v0.18.0
Connected to localhost:3141
Database: graph
Type \help for help, \quit to exit

geode> MATCH (n:User) RETURN n.name, n.age LIMIT 5;
+------------+--------+
| n.name     | n.age  |
+------------+--------+
| Alice      | 30     |
| Bob        | 25     |
| Charlie    | 35     |
| David      | 28     |
| Eve        | 32     |
+------------+--------+
5 rows (12 ms)

geode> \timing on
Timing enabled.

geode> MATCH (n:User) RETURN COUNT(n);
+-----------+
| COUNT(n)  |
+-----------+
| 1000000   |
+-----------+
1 row (145 ms)
```

### Shell Commands

Meta-commands (starting with backslash) control shell behavior:

```bash
# Help and documentation
\help                    # Show all commands
\help CREATE             # Help for specific GQL command
\?                       # Alias for \help

# Connection management
\connect localhost:3141  # Connect to database
\disconnect              # Disconnect
\reconnect               # Reconnect to current database

# Query execution
\e                       # Edit query in external editor
\g                       # Execute current query (same as ;)
\timing on|off           # Show/hide query execution time
\watch 5                 # Re-execute query every 5 seconds

# Output formatting
\format table            # Table format (default)
\format json             # JSON output
\format csv              # CSV output
\format yaml             # YAML output
\expanded on|off         # Toggle expanded/vertical output
\pset border 2           # Set table border style (0-2)

# Transaction control
\begin                   # Begin transaction
\commit                  # Commit transaction
\rollback                # Rollback transaction
\savepoint name          # Create savepoint

# Schema exploration
\dn                      # List node labels
\dr                      # List relationship types
\di                      # List indexes
\dt                      # List all types
\d User                  # Describe User label

# Query history
\history                 # Show command history
\! <command>             # Execute shell command
\set VAR value           # Set shell variable
\echo message            # Print message

# File operations
\i filename.gql          # Execute queries from file
\o output.txt            # Write output to file
\o                       # Stop writing to file

# Quit
\q                       # Quit shell
\quit                    # Quit shell (alias)
exit                     # Exit shell
```

### Multi-line Queries

The shell supports multi-line query editing:

```sql
geode> MATCH (p:Person)-[:KNOWS]->(friend:Person)
    -> WHERE p.name = 'Alice'
    -> RETURN friend.name, friend.age
    -> ORDER BY friend.age DESC;

+---------------+-------------+
| friend.name   | friend.age  |
+---------------+-------------+
| Bob           | 35          |
| Charlie       | 32          |
| David         | 28          |
+---------------+-------------+
3 rows (8 ms)
```

## Server Management

### Starting and Stopping

```bash
# Start server
geode serve --listen 0.0.0.0:3141

# Start with configuration file
geode serve --config /etc/geode/geode.conf

# Start as daemon
geode serve --daemon --pid-file /var/run/geode.pid

# Stop server
geode stop

# Stop with specific PID file
geode stop --pid-file /var/run/geode.pid

# Restart server
geode restart

# Reload configuration (without restart)
geode reload
```

### Server Status

```bash
# Check server status
geode status

# Detailed status with metrics
geode status --verbose

# Output as JSON
geode status --format json

# Monitor server in real-time
geode status --watch 1  # Update every second
```

## Query Execution

### Non-Interactive Queries

Execute queries from command line:

```bash
# Execute single query
geode query "MATCH (n:User) RETURN COUNT(n)"

# Execute with output format
geode query "MATCH (n:User) RETURN n.name, n.age LIMIT 10" --format table

# Execute with parameters
geode query "MATCH (n:User {id: \$id}) RETURN n" \
  --param id=123 \
  --format json

# Read query from file
geode query --file queries/user-report.gql

# Read from stdin
cat query.gql | geode query

# Output to file
geode query "MATCH (n) RETURN n" --output results.csv --format csv
```

### Batch Query Execution

Execute multiple queries from files:

```bash
# Execute all queries in file
geode batch --file migrations/schema-v2.gql

# Execute with transaction
geode batch --file migrations/data-migration.gql --transaction

# Execute directory of files
geode batch --directory migrations/ --pattern "*.gql" --order=name

# Parallel execution (independent queries)
geode batch --directory queries/ --parallel=4

# Continue on errors
geode batch --file queries.gql --continue-on-error \
  --error-log /tmp/errors.log
```

## Administration Commands

### User Management

```bash
# Create user
geode admin user create --username alice --password --role admin

# List users
geode admin user list

# Change password
geode admin user password --username alice

# Grant role
geode admin user grant --username alice --role read_write

# Revoke role
geode admin user revoke --username alice --role admin

# Delete user
geode admin user delete --username alice
```

### Database Management

```bash
# Create database
geode admin database create --name testdb

# List databases
geode admin database list

# Describe database
geode admin database describe --name testdb

# Drop database
geode admin database drop --name testdb --confirm

# Database statistics
geode admin database stats --name graph
```

### Index Management

```bash
# Create index
geode admin index create --label User --property email

# List indexes
geode admin index list

# Describe index
geode admin index describe --name idx_user_email

# Rebuild index
geode admin index rebuild --name idx_user_email

# Drop index
geode admin index drop --name idx_user_email
```

## Backup and Recovery

### Backup Operations

```bash
# Create full backup
geode backup create --type full --output /backups/geode-full.tar.gz

# Create incremental backup
geode backup create --type incremental \
  --base /backups/geode-full.tar.gz \
  --output /backups/geode-incr-$(date +%Y%m%d).tar.gz

# List backups
geode backup list --directory /backups

# Verify backup
geode backup verify /backups/geode-full.tar.gz

# Schedule automatic backups
geode backup schedule --type full --cron "0 2 * * *" \
  --output /backups/daily/geode-%Y%m%d.tar.gz
```

### Recovery Operations

```bash
# Restore from backup
geode restore --backup /backups/geode-full.tar.gz \
  --target /var/lib/geode

# Point-in-time recovery
geode recover \
  --backup /backups/geode-full.tar.gz \
  --wal-archive /wal-archive \
  --target-time "2026-01-24 14:30:00"

# Verify restored database
geode verify --data-dir /var/lib/geode --full-scan
```

## Monitoring and Diagnostics

### Performance Monitoring

```bash
# Show current metrics
geode metrics

# Continuous monitoring
geode metrics --watch 1

# Specific metric groups
geode metrics --group queries,connections,performance

# Export metrics for Prometheus
geode metrics --format prometheus > /var/lib/prometheus/geode.prom
```

### Query Analysis

```bash
# Explain query
geode query "EXPLAIN MATCH (n:User) RETURN n" --format yaml

# Profile query
geode query "PROFILE MATCH (n:User) RETURN n" --format json

# Analyze slow queries
geode admin slow-queries --min-duration 1000  # Queries >1 second

# Query statistics
geode admin query-stats --top 10  # Top 10 queries by execution time
```

### System Diagnostics

```bash
# Health check
geode admin health

# Connection diagnostics
geode admin connections list
geode admin connections show --id conn-123

# Resource usage
geode admin resources

# Logs
geode logs --tail 100
geode logs --level error --since "1 hour ago"
geode logs --follow  # Continuous log streaming
```

## Scripting and Automation

### Shell Scripting

Integrate Geode CLI in shell scripts:

```bash
#!/bin/bash

# Check if server is running
if ! geode status --quiet; then
    echo "Geode is not running"
    exit 1
fi

# Execute query and capture output
RESULT=$(geode query "MATCH (n:User) RETURN COUNT(n)" --format json)
COUNT=$(echo "$RESULT" | jq -r '.data[0]["COUNT(n)"]')

echo "Total users: $COUNT"

# Conditional execution
if [ "$COUNT" -gt 1000000 ]; then
    echo "Running maintenance..."
    geode admin vacuum --analyze
fi

# Exit codes
# 0 = success
# 1 = error
# 2 = connection failed
```

### CSV Import/Export

```bash
# Export to CSV
geode query "MATCH (n:User) RETURN n.id, n.name, n.email" \
  --format csv \
  --output users.csv

# Import from CSV
geode import csv \
  --input users.csv \
  --node-label User \
  --id-column 0 \
  --property-columns 1,2 \
  --property-names name,email
```

### JSON Processing

```bash
# Query with JSON output for processing
geode query "MATCH (n:User) RETURN n" --format json | \
  jq '.data[].n.properties | {id, name, email}'

# Combine with other tools
geode query "MATCH (n:User) RETURN n.email" --format json | \
  jq -r '.data[].["n.email"]' | \
  mail -s "User emails" admin@example.com
```

## Best Practices

1. **Configuration**: Use configuration files for repeated connection settings
2. **Scripting**: Use `--format json` for scripting and automation
3. **Error Handling**: Check exit codes in scripts for proper error handling
4. **Parameters**: Always use parameterized queries to prevent injection
5. **Transactions**: Use transactions for multi-query operations requiring atomicity
6. **Logging**: Enable logging for troubleshooting and auditing
7. **Aliases**: Create shell aliases for frequently used commands
8. **Documentation**: Document automation scripts and scheduled tasks

## Troubleshooting

### Connection Issues

```bash
# Test connectivity
geode admin ping --host localhost:3141

# Verbose connection diagnostics
geode shell --connect localhost:3141 --verbose

# Check logs
geode logs --filter connection --level debug
```

### Performance Issues

```bash
# Profile slow query
geode query "PROFILE MATCH (n)-[r*1..5]-(m) RETURN COUNT(*)" \
  --format yaml

# Check server resources
geode admin resources --watch 1

# Analyze query plan
geode query "EXPLAIN MATCH (n:User) WHERE n.email = 'test@example.com' RETURN n"
```

### Data Issues

```bash
# Verify database integrity
geode verify --full-scan

# Check for corrupted indexes
geode admin index verify --all

# Repair database
geode admin repair --backup-first --verify-after
```

## Related Topics

- [REPL](/tags/repl/) - Interactive shell features
- [Server Configuration](/tags/server/) - Server management
- [Backup](/tags/backup/) - Backup and recovery
- [Monitoring](/tags/monitoring/) - Monitoring and metrics
- [Scripting](/tags/automation/) - Automation workflows

## Further Reading

- [CLI Reference](/docs/cli/) - Complete command reference
- [Shell Guide](/docs/cli/shell/) - Interactive shell documentation
- [Scripting Guide](/docs/guides/automation/) - Automation patterns
- [Administration Guide](/docs/administration/) - Database administration
- [Query Optimization](/docs/performance/query-optimization/) - Performance tuning
