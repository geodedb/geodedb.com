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
| `geode query` | One-shot query execution | `geode query --dsn quic://localhost:3141/social "RETURN 1 AS x"` |
| `geode shell` / `gql` | Interactive REPL | `geode shell --server 127.0.0.1:3141` |
| `geode auth` | Login, session, and offline auth integrity workflows | `geode auth login -U geode --save-session` |
| `geode user` / `role` / `policy` | Local auth-store admin commands | `geode user create alice alice@example.com --password 'secret'` |
| `geode grant` / `revoke` | Permission changes | `geode grant read:users --to alice` |
| `geode apikey` | API key management | `geode apikey create --user alice --name prod-app --scope query:execute` |
| `geode backup` / `restore` / `migrate` | Data operations | `geode backup --output /backups/geode.tar.gz` |
| `geode lsp` / `mcp` | Tooling integrations | `geode mcp` |

> **Current limitation (main, 2026-03-30)**
>
> `geode user`, `role`, `policy`, `grant`, `revoke`, `apikey`, and CLI MFA flows still operate on the **local auth store** instead of delegating to a running server. Use them for on-host/offline administration until `GAP-0270` is closed.

## Server Commands (`geode serve`)

### Start Server

```bash
# Default (0.0.0.0:3141)
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
| `--data-dir <path>` | Data directory | `./data` |
| `--listen <addr:port>` | Listen address | `0.0.0.0:3141` |
| `--cert <path>` | TLS certificate path | auto-generated if missing |
| `--key <path>` | TLS private key path | auto-generated if missing |
| `--log-level <level>` | `debug\|info\|warn\|error` | `info` |
| `--idle-timeout <ms>` | QUIC idle timeout | `300000` |
| `--persist-interval <ms>` | Background persistence interval | `100` |
| `--help` | Show help | - |

## Client Commands (`geode query`)

### Execute Query

```bash
# Single query
geode query "RETURN 1 AS x" --server 127.0.0.1:3141

# Query from file
geode query -f query.gql --server 127.0.0.1:3141

# Query from stdin
echo "RETURN 1 AS x" | geode query -

# With output format
geode query --format json "MATCH (n) RETURN n LIMIT 10" --server 127.0.0.1:3141
geode query --format table "MATCH (n) RETURN n LIMIT 10" --server 127.0.0.1:3141
geode query --format csv "MATCH (n) RETURN n LIMIT 10" --server 127.0.0.1:3141
geode query --format dot "MATCH (a)-[r]->(b) RETURN a, r, b" | dot -Tpng -o graph.png

# Show execution time
geode query --timeout 5 --retry 3 "MATCH (p:Person) RETURN p.name" --server 127.0.0.1:3141

# Connect with a DSN and bind to a graph
geode query --dsn quic://geode:secret@geode.example.com:3141/social "MATCH (n) RETURN count(n)"
```

### Client Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--dsn <dsn>` | Connection DSN | - |
| `-f, --file <path>` | Read query from file | - |
| `-g, --graph <name>` | Graph name (prepends `USE GRAPH`) | - |
| `--format <fmt>` | Output format (`json\|table\|csv\|dot`) | `json` |
| `--page-size <n>` | Results page size | `1000` |
| `--timeout <seconds>` | Connection timeout in seconds | `30` |
| `--retry <count>` | Retry attempts on failure | `0` |
| `--server <addr:port>` | Server address | `127.0.0.1:3141` |
| `--grpc` | Use gRPC instead of QUIC | `false` |
| `--insecure-tls-skip-verify` | Skip TLS verification | `false` |
| `--ca-cert <path>` | CA certificate for server verification | - |
| `--client-cert <path>` | Client certificate for mTLS | - |
| `--client-key <path>` | Client private key for mTLS | - |
| `-U, --user <username>` | Authenticate as user | - |
| `-P, --password [pass]` | Password (prompts if omitted) | - |
| `--no-saved-session` | Do not auto-load saved credentials | `false` |
| `--help` | Show help | - |

### DSN Notes

- `quic://` is still the default and recommended transport
- `grpc://` uses port `50051` by default
- DSNs can now bind a session to a graph at connect time: `quic://host:3141/graph`
- Graph-bound sessions reject `USE GRAPH` for the lifetime of that connection
- DSN credentials override `-U` / `-P`

## Interactive Shell (`geode shell`)

### Start REPL

```bash
# Start shell
geode shell

# Or alternative entrypoint
gql

# Start shell with DSN graph binding
geode shell --dsn quic://geode:secret@localhost:3141/social
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
\connect quic://localhost:3141/social

-- Set format
\format json

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

## Authentication Commands (`geode auth`)

```bash
# Login and save a reusable session
geode auth login -U geode --save-session

# View or clear saved credentials
geode auth token
geode auth logout

# Offline auth-store integrity operations
geode auth init --data-dir /var/lib/geode
geode auth reseal --data-dir /var/lib/geode
geode auth verify --data-dir /var/lib/geode
```

### `geode auth` Command Set

| Command | Purpose |
|---------|---------|
| `login` | Authenticate and optionally save session credentials |
| `logout` | Clear saved credentials |
| `token` | Print saved credentials JSON |
| `init` | Bootstrap admin user into the local auth graph (offline) |
| `reseal` | Recompute HMAC chain for the local auth graph (offline) |
| `verify` | Check HMAC chain integrity for the local auth graph (offline) |

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
