---
title: "API Reference and CLI Manual"
description: "Command-line reference for `geode` (with geoded/geodec compatibility) and the full Geode GQL surface: keywords, functions, types, procedures, and operational commands"
url: /docs/reference/cli-and-api/
weight: 10
tags:
  - api-reference
  - cli
  - reference
  - gql-reference
categories:
  - reference
keywords:
  - geodec
  - geoded
  - gql shell
  - GQL functions
  - procedures
---

<!-- CANARY: REQ=REQ-CLI-SUBPROCESS-ELIMINATION-001; FEATURE="CLI Subprocess Elimination"; ASPECT=UnifiedBinary; STATUS=TESTED; OWNER=cli; UPDATED=2026-01-15 -->

# API Reference and CLI Manual

Complete reference for Geode CLI commands and GQL language surface.

## CLI Overview

Geode ships a unified `geode` binary. Compatibility symlinks (`geoded`, `geodec`) are provided for legacy workflows.

| Command | Purpose | Usage |
|---------|---------|-------|
| `geode serve` | Server daemon | `geode serve --listen 0.0.0.0:3141` |
| `geode query` | Client CLI | `geode query "MATCH (n) RETURN n" --server 127.0.0.1:3141` |
| `geode shell` / `gql` | Interactive REPL | `geode shell` |

## Server Commands (`geode serve`)

### Start Server

```bash
# Default (localhost:3141)
geode serve

# Custom listen address
geode serve --listen 0.0.0.0:3141

# With configuration file
geode serve --config /etc/geode/geode.yaml

# With TLS certificates
geode serve \
  --cert /etc/geode/certs/server-cert.pem \
  --key /etc/geode/certs/server-key.pem

# With data directory
geode serve --data-dir /var/lib/geode
```

### Server Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--listen <addr>` | Listen address (host:port) | `127.0.0.1:3141` |
| `--config <file>` | Configuration file path | - |
| `--data-dir <dir>` | Data directory | `./geode-data` |
| `--cert <file>` | TLS certificate path | Auto-generated |
| `--key <file>` | TLS key path | Auto-generated |
| `--version` | Show version | - |
| `--help` | Show help | - |

## Client Commands (`geode query`)

### Execute Query

```bash
# Single query
geode query "RETURN 1 AS x" --server 127.0.0.1:3141

# Query from file
geode query -f query.gql --server 127.0.0.1:3141

# With output format
geode query --format json "MATCH (n) RETURN n LIMIT 10" --server 127.0.0.1:3141
geode query --format txt "MATCH (n) RETURN n LIMIT 10" --server 127.0.0.1:3141

# Show execution time
geode query --timing "MATCH (p:Person) RETURN p.name" --server 127.0.0.1:3141

# Connect to remote server
geode query "MATCH (n) RETURN n" --server geode.example.com:3141
```

### Client Flags

| Flag | Description | Default |
|------|-------------|---------|
| `-f, --file <path>` | Read query from file | - |
| `--format <fmt>` | Output format (txt\|json) | `txt` |
| `--timing` | Show execution time | `false` |
| `--timeout <seconds>` | Query timeout in seconds (increased from 10s to accommodate QUIC handshake latency in Docker/CI environments) | `30` |
| `--server <addr:port>` | Server address | `127.0.0.1:3141` |
| `--help` | Show help | - |

## Interactive Shell (`geode shell`)

### Start REPL

```bash
# Start shell
geode shell

# Or alternative entrypoint
gql
```

### Meta Commands

From `REPL_USAGE.md`:

| Command | Description | Example |
|---------|-------------|---------|
| `\connect <uri>` | Connect to server | `\connect quic://localhost:3141` |
| `\begin` | Start transaction | `\begin` |
| `\commit` | Commit transaction | `\commit` |
| `\rollback` | Rollback transaction | `\rollback` |
| `\format <fmt>` | Set output format | `\format json` |
| `\timing on\|off` | Toggle execution timing | `\timing on` |
| `\help` | Show help | `\help` |
| `\quit` | Exit shell | `\quit` |

### Shell Example Session

```gql
-- Connect
\connect quic://localhost:3141

-- Set format
\format json

-- Enable timing
\timing on

-- Run query
MATCH (p:Person) RETURN p.name;

-- Start transaction
\begin

CREATE (:Person {name: "Alice", age: 30});

-- Commit
\commit

-- Exit
\quit
```

## Admin and Ops Commands

### Backup

```bash
# Local backup
geode backup --output /backups/geode-$(date +%Y%m%d).tar.gz

# S3 backup
geode backup --dest s3://my-bucket/backups/geode-$(date +%Y%m%d).tar.gz

# With credentials
AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
geode backup --dest s3://my-bucket/backups/backup.tar.gz
```

### Restore

```bash
# Restore from local
geode restore \
  --input /backups/geode-20240115.tar.gz \
  --data-dir /var/lib/geode

# Restore from S3
geode restore \
  --source s3://my-bucket/backups/geode-20240115.tar.gz \
  --data-dir /var/lib/geode

# Point-in-time recovery
geode restore \
  --source s3://my-bucket/backups/geode-20240115.tar.gz \
  --wal-dir /var/lib/geode/wal \
  --until "2024-01-15T14:30:00Z"
```

## GQL Language Reference

### Keywords

From `API_REFERENCE_GENERATED.md`, key GQL keywords:

**Query Keywords**:

- `MATCH` - Pattern matching
- `WHERE` - Filter predicates
- `RETURN` - Projection
- `WITH` - Pipeline chaining
- `ORDER BY` - Sorting
- `LIMIT` - Limit results
- `OFFSET` - Skip results
- `DISTINCT` - Remove duplicates

**Write Keywords**:

- `CREATE` - Create nodes/relationships
- `DELETE` - Delete nodes/relationships
- `DETACH DELETE` - Delete node and relationships
- `SET` - Update properties
- `MERGE` - Upsert pattern
- `ON CREATE` - Merge onCreate clause
- `ON MATCH` - Merge onMatch clause

**Transaction Keywords**:

- `START TRANSACTION` - Begin transaction
- `COMMIT` - Commit changes
- `ROLLBACK` - Rollback changes
- `SAVEPOINT` - Create savepoint (extension)
- `ROLLBACK TO SAVEPOINT` - Partial rollback (extension)

**Set Operations**:

- `UNION` - Combine results (remove duplicates)
- `UNION ALL` - Combine results (keep duplicates)
- `INTERSECT` - Common results
- `EXCEPT` - Set difference

**Graph Operations**:

- `CREATE GRAPH` - Create graph
- `USE` - Select graph
- `DROP GRAPH` - Delete graph

### Built-in Functions

#### Aggregation Functions

| Function | Description | Example |
|----------|-------------|---------|
| `COUNT()` | Count rows | `RETURN COUNT(p)` |
| `SUM()` | Sum values | `RETURN SUM(p.age)` |
| `AVG()` | Average values | `RETURN AVG(p.age)` |
| `MIN()` | Minimum value | `RETURN MIN(p.age)` |
| `MAX()` | Maximum value | `RETURN MAX(p.age)` |

#### String Functions

| Function | Description | Example |
|----------|-------------|---------|
| `upper()` | Uppercase | `RETURN upper("hello")` → `"HELLO"` |
| `lower()` | Lowercase | `RETURN lower("HELLO")` → `"hello"` |
| `substring()` | Extract substring | `RETURN substring("hello", 0, 3)` → `"hel"` |
| `length()` | String length | `RETURN length("hello")` → `5` |

#### Temporal Functions

| Function | Description | Example |
|----------|-------------|---------|
| `timestamp()` | Current timestamp | `RETURN timestamp()` |
| `date()` | Create date | `RETURN date('2024-01-15')` |
| `time()` | Create time | `RETURN time('14:30:00')` |

#### Type Conversion

| Function | Description | Example |
|----------|-------------|---------|
| `toInteger()` | Convert to integer | `RETURN toInteger("42")` → `42` |
| `toFloat()` | Convert to float | `RETURN toFloat("3.14")` → `3.14` |
| `toString()` | Convert to string | `RETURN toString(42)` → `"42"` |
| `toBoolean()` | Convert to boolean | `RETURN toBoolean("true")` → `true` |

#### Vector Functions

| Function | Description | Example |
|----------|-------------|---------|
| `vector_distance_l2()` | Euclidean distance | `RETURN vector_distance_l2($a, $b)` |
| `vector_distance_cosine()` | Cosine distance | `RETURN vector_distance_cosine($a, $b)` |
| `vector_distance_dot()` | Dot product | `RETURN vector_distance_dot($a, $b)` |

### Data Types

From `TYPES_AND_FUNCTIONS.md`:

**Core Types**:

- `Null` - Null value
- `Boolean` - true/false
- `Integer` - Signed integer (Int8/16/32/64)
- `Float` - Floating point (Float32/64)
- `String` - UTF-8 text
- `Decimal` - Arbitrary precision decimal

**Advanced Types**:

- `Date` - Calendar date
- `Time` - Time of day
- `Timestamp` - Date + time with timezone
- `Interval` - Duration
- `JSON` / `JSONB` - JSON data
- `Bytea` - Binary data
- `VectorF32` / `VectorI32` - Vector embeddings
- `LatLon` / `GeoPoint` - Geographic coordinates
- `IpAddr` / `Subnet` / `MacAddr` - Network addresses
- `UUID` - Universally unique identifier
- `Hash` - Cryptographic hash

See [Data Model and Types](/docs/model/data-model-and-types) for details.

### Procedures

From `API_REFERENCE_GENERATED.md`:

**Graph Algorithms**:

- `graph.pageRank()` - PageRank centrality
- `graph.betweenness()` - Betweenness centrality
- `graph.closeness()` - Closeness centrality
- `graph.louvain()` - Community detection
- `graph.labelPropagation()` - Label propagation
- `graph.node2vec()` - Node2Vec embeddings
- `graph.graphSAGE()` - GraphSAGE embeddings
- `graph.deepWalk()` - DeepWalk embeddings

See [Graph Algorithms](/docs/analytics/graph-algorithms) for usage.

## Next Steps

- [GQL Guide](/docs/gql/guide) - Query language tutorial
- [Data Model and Types](/docs/model/data-model-and-types) - Type system
- [Graph Algorithms](/docs/analytics/graph-algorithms) - Algorithm reference
- [Deployment Guide](/docs/ops/deployment) - Operational commands
