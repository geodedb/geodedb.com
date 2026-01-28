---
title: "Reference"
description: "Complete API reference, CLI documentation, error codes, operators, and technical specifications for Geode"
summary: "Comprehensive reference documentation including complete API reference, CLI commands, error codes, status codes, operators, type conversion, and Unicode support."
weight: 95
keywords:
  - reference
  - API reference
  - CLI reference
  - error codes
  - operators
  - status codes
  - type conversion
  - documentation
tags:
  - reference
  - api
  - cli
  - documentation
categories:
  - reference
  - documentation
toc: true
params:
  seo:
    keywords: "geode API reference, CLI reference, error codes, operators, status codes, type conversion, technical reference"
    description: "Complete technical reference for Geode including API, CLI, error codes, operators, and type conversion specifications"
---

<!-- CANARY: REQ=REQ-API-DOCS-002; FEATURE="APIDocumentation"; ASPECT=BuildTarget; STATUS=EXEMPT; OWNER=tooling; UPDATED=2026-01-03 -->

# Reference

Comprehensive technical reference documentation for Geode covering all APIs, commands, error codes, operators, and specifications.

## Overview

This section provides detailed reference material for developers, operators, and administrators working with Geode. Unlike guides that focus on how-to instructions, reference documentation provides exhaustive, structured information about every command, function, operator, and error code.

Use this section when you need precise details about specific functionality, error messages, or command syntax. All reference material is organized for quick lookup and includes complete specifications.

## Topics in This Section

- **[Complete API Reference](/docs/reference/api-reference-complete/)** - Comprehensive API documentation covering all functions, methods, and interfaces
- **[CLI and API](/docs/reference/cli-and-api/)** - Command-line interface reference including all CLI commands and options
- **[Data Types](/docs/reference/types/)** - All 50+ data types with constructors and storage characteristics
- **[Index Types](/docs/reference/indexes/)** - B-tree, Hash, Full-text, Spatial, Vector, and specialized indexes
- **[Statistics and Metrics](/docs/reference/statistics/)** - Query statistics, storage metrics, and Prometheus integration
- **[Error Codes](/docs/reference/error-codes/)** - Complete error code reference with descriptions and resolution steps
- **[Status Codes](/docs/reference/status-codes/)** - GQL status codes following ISO/IEC 39075:2024 standard
- **[Operators](/docs/reference/operators/)** - All supported operators including comparison, arithmetic, logical, and pattern operators
- **[Type Conversion](/docs/reference/type-conversion/)** - Type conversion rules, coercion, and promotion specifications
- **[Unicode Support](/docs/reference/unicode-support/)** - Unicode normalization, collation, and string handling
- **[Changelog](/docs/reference/changelog/)** - Version history with detailed changes, features, and bug fixes

## Quick Reference

### Common Functions

**Aggregation Functions**:
```gql
COUNT(*), COUNT(expr)
SUM(expr), AVG(expr)
MIN(expr), MAX(expr)
```

**String Functions**:
```gql
lower(str), upper(str)
substring(str, start, length)
trim(str), ltrim(str), rtrim(str)
```

**Temporal Functions**:
```gql
now(), timestamp()
date('2024-01-01')
duration({days: 7})
```

**Spatial Functions**:
```gql
distance(point1, point2)
point({latitude: 47.6, longitude: -122.3})
```

See [API Reference](/docs/reference/api-reference-complete/) for complete function list.

### Common Operators

**Comparison**:
```gql
=, <>, <, <=, >, >=
IS NULL, IS NOT NULL
IN, NOT IN
```

**Arithmetic**:
```gql
+, -, *, /, %
```

**Logical**:
```gql
AND, OR, NOT, XOR
```

**Pattern**:
```gql
STARTS WITH, ENDS WITH, CONTAINS
=~  -- Regular expression match
```

See [Operators](/docs/reference/operators/) for complete reference.

### CLI Commands

**Server Management**:
```bash
geode serve              # Start server
geode shell              # Interactive shell
geode --version          # Show version
```

**Client Operations**:
```bash
geode query "query"      # Execute query
geode query -f file.gql  # Execute file
geode query --format json "RETURN 1"  # JSON output
```

**Administration**:
```bash
geode backup             # Create backup
geode restore            # Restore backup
geode validate           # Validate data
```

See [CLI and API](/docs/reference/cli-and-api/) for complete CLI reference.

## Error Code Categories

### Client Errors (4xxxx)

Errors caused by client requests:

- **40001**: Syntax error in query
- **40002**: Semantic error (invalid operation)
- **40003**: Parameter mismatch
- **40004**: Constraint violation

### Server Errors (5xxxx)

Errors caused by server issues:

- **50001**: Internal server error
- **50002**: Storage error
- **50003**: Network error
- **50004**: Resource exhausted

### Security Errors (6xxxx)

Authentication and authorization errors:

- **60001**: Authentication failed
- **60002**: Authorization denied
- **60003**: Session expired
- **60004**: Invalid credentials

See [Error Codes](/docs/reference/error-codes/) for complete list with resolution steps.

## Status Codes (ISO GQL)

GQL status codes following ISO/IEC 39075:2024:

- **00000**: Successful completion
- **01xxx**: Warning conditions
- **02xxx**: No data (query returned empty)
- **22xxx**: Data exception
- **23xxx**: Integrity constraint violation
- **42xxx**: Syntax error or access violation

See [Status Codes](/docs/reference/status-codes/) for ISO compliance details.

## Type System Reference

### Core Types

```
NULL
BOOLEAN
INTEGER
FLOAT
STRING
BYTES
```

### Temporal Types

```
DATE
TIME
TIMESTAMP
ZONED_DATETIME
DURATION
INTERVAL
```

### Collection Types

```
LIST<T>
MAP<K, V>
SET<T>
```

### Advanced Types

```
VECTOR<T>
POINT
POLYGON
UUID
JSON
BIGDECIMAL
MONEY
CIDR
```

See [Type Conversion](/docs/reference/type-conversion/) for conversion rules.

## Unicode Support

Geode provides comprehensive Unicode support:

- **Normalization**: NFD, NFC, NFKD, NFKC
- **Collation**: Locale-aware string comparison
- **Case Folding**: Unicode case-insensitive comparison
- **Grapheme Clusters**: Proper string length and indexing

See [Unicode Support](/docs/reference/unicode-support/) for details.

## Version Information

Current version: **v0.18.0** (Production Ready)

Key metrics:
- **Test Coverage**: 97.4% (1,644/1,688 tests passing)
- **GQL Compliance**: 100% (70/70 ISO tests)
- **CANARY Markers**: 1,735 tracking 2,190+ requirements

See [Changelog](/docs/reference/changelog/) for version history.

## API Categories

### Query Execution API

Execute GQL queries programmatically:

```go
// Go client example
result, err := client.Query(ctx, "MATCH (n) RETURN n LIMIT 10")
```

```python
# Python client example
from geode_client import Client

client = Client(host="localhost", port=3141)
async with client.connection() as conn:
    page, _ = await conn.query("MATCH (n) RETURN n LIMIT 10")
    for row in page.rows:
        print(row)
```

### Transaction API

Manage transactions:

```go
tx, err := db.BeginTx(ctx, nil)
if err != nil {
    return err
}
defer tx.Rollback()

_, err = tx.ExecContext(ctx, "CREATE (:Person {name: 'Alice'})")
if err != nil {
    return err
}
return tx.Commit()
```

### Schema API

Manage indexes and constraints:

```gql
-- Index management
CREATE INDEX person_email ON :Person(email);
DROP INDEX person_email;

-- Constraint management
CREATE CONSTRAINT person_email_unique
FOR (p:Person)
REQUIRE p.email IS UNIQUE;
```

### Security API

Authentication and authorization:

```python
from geode_client import AuthClient, Client

client = Client(host="localhost", port=3141)
async with client.connection() as conn:
    auth = AuthClient(conn)
    session = await auth.login("admin", "secret")
    print(session.token)
```

See [API Reference](/docs/reference/api-reference-complete/) for complete API documentation.

## Command-Line Interface

### Server Commands

```bash
# Start server
geode serve [OPTIONS]
  --listen <address>       # Listen address (default: 127.0.0.1:3141)
  --data-dir <path>        # Data directory
  --cert <path>            # TLS certificate
  --key <path>             # TLS key
  --config <path>          # Configuration file

# Interactive shell
geode shell [OPTIONS]
  --connect <uri>          # Server URI
  --format <txt|json>      # Output format
  --file <path>            # Execute script
```

### Client Commands

```bash
# Execute query
geode query [OPTIONS] <query>
  -f, --file <path>        # Execute from file
  --format <txt|json>      # Output format
  --params <json>          # Query parameters

# Examples
geode query "RETURN 1 AS x"
geode query -f queries.gql --format json
geode query "MATCH (n) WHERE n.id = \$id RETURN n" --params '{"id": 123}'
```

See [CLI and API](/docs/reference/cli-and-api/) for complete command reference.

## Configuration Reference

Key configuration options:

```yaml
server:
  listen: '0.0.0.0:3141'
  data_dir: '/var/lib/geode'

tls:
  cert: '/etc/geode/certs/server-cert.pem'
  key: '/etc/geode/certs/server-key.pem'

storage:
  page_size: 8192
  page_cache_size: '16GB'

query:
  max_concurrent_queries: 1000
  query_timeout: 30s

security:
  tde:
    enabled: true
    key_hex: '<32-byte-hex-key>'

logging:
  level: 'info'
  format: 'json'
```

See [Configuration Reference](/docs/configuration/) for all options.

## Protocol Specification

### JSON Line Protocol

Geode uses JSON line protocol (one JSON object per line):

**Client Messages**:
```json
{"type": "HELLO", "version": "1.0"}
{"type": "RUN_GQL", "query": "MATCH (n) RETURN n"}
{"type": "PULL", "n": 100}
{"type": "BEGIN"}
{"type": "COMMIT"}
```

**Server Responses**:
```json
{"type": "SCHEMA", "fields": ["n"]}
{"type": "BINDINGS", "data": [{"n": {...}}]}
{"type": "ERROR", "code": "40001", "message": "Syntax error"}
```

### Message Types

**Client**:
- HELLO: Connection handshake
- RUN_GQL: Execute query
- PULL: Fetch results
- BEGIN/COMMIT/ROLLBACK: Transaction control
- PING: Keep-alive

**Server**:
- SCHEMA: Result schema
- BINDINGS: Result rows
- ERROR: Error details
- EXPLAIN: Query plan
- PROFILE: Performance metrics

## Performance Characteristics

Reference performance metrics:

**Query Performance**:
- Point lookup: <1ms (typically 100-500us)
- Short path (1-2 hops): 1-5ms
- Multi-hop path (3-5 hops): 10-100ms
- Large aggregation (1M rows): 100-500ms

**Architecture**:
- Vector similarity: HNSW indexes with SIMD acceleration
- Storage: Memory-mapped I/O with page-level caching
- Indexes: Six specialized index types for different workloads

**Scalability**:
- Distributed deployment with up to 32 shards
- Connection pooling for concurrent clients

See [Performance Benchmarking](/docs/guides/performance-benchmarking/) for methodology.

## Standards Compliance

### ISO/IEC 39075:2024 (GQL)

- ✅ Complete pattern matching syntax
- ✅ All aggregation functions
- ✅ Set operations (UNION, INTERSECT, EXCEPT)
- ✅ Transaction semantics
- ✅ Error handling with standard codes
- ✅ 100% conformance (70/70 tests)

### Other Standards

- **QUIC**: RFC 9000
- **TLS 1.3**: RFC 8446
- **JSON**: RFC 8259
- **UUID**: RFC 4122
- **IPv6**: RFC 4291
- **CIDR**: RFC 4632

## Learn More

- [GQL Guide](/docs/gql/guide/) - Query language guide
- [Data Types](/docs/data-types/) - Type system reference
- [Architecture](/docs/architecture/) - System architecture
- [Client Libraries](/docs/client-libraries/) - Language-specific APIs
- [Troubleshooting](/docs/guides/troubleshooting/) - Error resolution

## Contributing to Documentation

Found an error or want to improve the reference docs?

See [Contributing Guide](/docs/contribute/) for how to submit improvements.
