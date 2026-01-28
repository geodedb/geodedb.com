---
title: "Wire Protocol"
description: "Complete wire protocol specification for Geode client-server communication including QUIC transport, message formats, and pagination"
summary: "Technical specification of Geode's QUIC-based wire protocol covering message types, JSON line format, transaction control, and streaming results."
weight: 80
keywords:
  - wire protocol
  - QUIC protocol
  - client protocol
  - JSON line protocol
  - message format
  - network protocol
  - Geode protocol
tags:
  - protocol
  - architecture
  - networking
  - specification
categories:
  - architecture
  - reference
toc: true
params:
  seo:
    keywords: "wire protocol, QUIC, JSON line protocol, Geode client protocol, message format"
    description: "Complete wire protocol specification for Geode client-server communication"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Wire Protocol Specification

This document specifies the wire protocol used for communication between Geode clients and servers. The protocol uses QUIC transport with JSON line message format.

## Overview

### Protocol Characteristics

| Property | Value |
|----------|-------|
| **Transport** | QUIC (RFC 9000) |
| **Encryption** | TLS 1.3 (mandatory) |
| **Message Format** | JSON Lines (newline-delimited JSON) |
| **Default Port** | 3141 (standard), 8443 (alternative) |
| **Protocol Version** | 1 |

### Key Features

- **Mandatory Encryption**: All connections use TLS 1.3
- **Multiplexed Streams**: Multiple queries over single connection
- **Streaming Results**: Paginated result sets with flow control
- **0-RTT Resumption**: Fast connection establishment
- **Connection Migration**: Seamless network changes

## Transport Layer

### QUIC Connection

Geode uses QUIC exclusively - there is no TCP fallback. QUIC provides:

- Built-in encryption (TLS 1.3)
- Connection multiplexing
- Stream-level flow control
- Connection migration
- Reduced latency (0-RTT)

### Connection Establishment

```plaintext
Client                              Server
   |                                   |
   |-------- QUIC Handshake ---------->|
   |<------- TLS 1.3 Negotiation ------|
   |                                   |
   |-------- HELLO Message ----------->|
   |<------- HELLO_ACK ----------------|
   |                                   |
   |         Connection Ready          |
```

### TLS Configuration

**Required**:
- TLS 1.3 only (no TLS 1.2 fallback)
- Server certificate verification
- SNI (Server Name Indication)

**Recommended**:
- Mutual TLS (mTLS) for client authentication
- OCSP stapling for revocation checking

```bash
# Generate server certificate
openssl req -x509 -nodes -days 365 \
  -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
  -keyout server.key -out server.crt \
  -subj "/CN=geode.example.com"

# Start server with TLS
geode serve \
  --cert server.crt \
  --key server.key \
  --listen 0.0.0.0:3141
```

## Message Format

### JSON Lines Protocol

All messages are newline-delimited JSON objects (JSON Lines format):

```plaintext
{"type": "MESSAGE_TYPE", ...fields...}\n
{"type": "MESSAGE_TYPE", ...fields...}\n
```

**Rules**:
- One JSON object per line
- Lines terminated with LF (`\n`)
- Maximum line size: 16 MiB
- UTF-8 encoding required

### Message Structure

Every message contains a `type` field:

```json
{
  "type": "MESSAGE_TYPE",
  "field1": "value1",
  "field2": 123
}
```

## Client Messages

### HELLO

Initiates connection handshake.

```json
{
  "type": "HELLO",
  "client_name": "geode-client-go",
  "client_version": "0.18.0",
  "protocol_version": 1,
  "capabilities": ["streaming", "pagination", "transactions"],
  "auth": {
    "method": "password",
    "username": "admin",
    "password": "secret"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | "HELLO" |
| `client_name` | string | Yes | Client library name |
| `client_version` | string | Yes | Client version |
| `protocol_version` | integer | Yes | Protocol version (1) |
| `capabilities` | array | No | Supported features |
| `auth` | object | No | Authentication credentials |

### RUN_GQL

Executes a GQL query or statement.

```json
{
  "type": "RUN_GQL",
  "query": "MATCH (n:Person) WHERE n.age > $min_age RETURN n.name",
  "parameters": {
    "min_age": 25
  },
  "mode": "NORMAL",
  "timeout_ms": 30000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | "RUN_GQL" |
| `query` | string | Yes | GQL query string |
| `parameters` | object | No | Query parameters |
| `mode` | string | No | "NORMAL", "EXPLAIN", "PROFILE" |
| `timeout_ms` | integer | No | Query timeout in milliseconds |

**Execution Modes**:
- **NORMAL**: Execute query and return results
- **EXPLAIN**: Return execution plan (no execution)
- **PROFILE**: Execute with performance metrics

### PULL

Requests next page of results.

```json
{
  "type": "PULL",
  "page_size": 1000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | "PULL" |
| `page_size` | integer | No | Rows to fetch (default: 1000, max: 10000) |

### BEGIN

Starts a transaction.

```json
{
  "type": "BEGIN",
  "isolation_level": "SERIALIZABLE",
  "access_mode": "READ_WRITE",
  "timeout_ms": 60000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | "BEGIN" |
| `isolation_level` | string | No | Isolation level |
| `access_mode` | string | No | "READ_ONLY" or "READ_WRITE" |
| `timeout_ms` | integer | No | Transaction timeout |

**Isolation Levels**:
- `READ_UNCOMMITTED`
- `READ_COMMITTED`
- `REPEATABLE_READ`
- `SNAPSHOT`
- `SERIALIZABLE` (default)
- `STRICT_SERIALIZABLE`

### COMMIT

Commits the current transaction.

```json
{
  "type": "COMMIT"
}
```

### ROLLBACK

Rolls back the current transaction.

```json
{
  "type": "ROLLBACK",
  "savepoint": "sp1"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | "ROLLBACK" |
| `savepoint` | string | No | Rollback to savepoint (optional) |

### SAVEPOINT

Creates a transaction savepoint.

```json
{
  "type": "SAVEPOINT",
  "name": "sp1"
}
```

### PING

Keep-alive heartbeat.

```json
{
  "type": "PING"
}
```

### CLOSE

Closes the connection gracefully.

```json
{
  "type": "CLOSE"
}
```

## Server Messages

### HELLO_ACK

Acknowledges connection establishment.

```json
{
  "type": "HELLO_ACK",
  "server_version": "0.18.0",
  "protocol_version": 1,
  "capabilities": ["streaming", "pagination", "transactions", "federation"],
  "session_id": "sess_abc123"
}
```

### SCHEMA

Describes query result structure (sent before BINDINGS).

```json
{
  "type": "SCHEMA",
  "status_class": "00000",
  "columns": [
    {"name": "n.name", "type": "STRING"},
    {"name": "n.age", "type": "INTEGER"},
    {"name": "n.created", "type": "DATETIME"}
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | "SCHEMA" |
| `status_class` | string | GQL status code |
| `columns` | array | Column descriptors |

**Column Descriptor**:

```json
{
  "name": "column_name",
  "type": "DATA_TYPE"
}
```

**Data Types**: `NULL`, `BOOLEAN`, `INTEGER`, `FLOAT`, `STRING`, `BYTES`, `DATE`, `TIME`, `DATETIME`, `DURATION`, `LIST`, `MAP`, `NODE`, `RELATIONSHIP`, `PATH`

### BINDINGS

Result rows (paginated).

```json
{
  "type": "BINDINGS",
  "status_class": "00000",
  "ordered": true,
  "order_keys": ["n.age"],
  "rows": [
    ["Alice", 30, "2026-01-15T10:30:00Z"],
    ["Bob", 28, "2026-01-16T14:20:00Z"],
    ["Carol", 35, "2026-01-17T09:15:00Z"]
  ],
  "final": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | "BINDINGS" |
| `status_class` | string | GQL status code |
| `ordered` | boolean | Results are ordered |
| `order_keys` | array | Sort columns (if ordered) |
| `rows` | array | Array of row arrays |
| `final` | boolean | Last page of results |

### EXPLAIN

Execution plan (for mode=EXPLAIN).

```json
{
  "type": "EXPLAIN",
  "status_class": "00000",
  "result": {
    "logical": [
      {"op": "NodeScan", "label": "Person"},
      {"op": "Filter", "condition": "age > 25"},
      {"op": "Project", "columns": ["name", "age"]}
    ],
    "properties": {
      "ordered": false,
      "estimated_cost": 45.2,
      "estimated_rows": 120
    }
  }
}
```

### PROFILE

Performance metrics (for mode=PROFILE).

```json
{
  "type": "PROFILE",
  "status_class": "00000",
  "result": {
    "ops": [
      {
        "op": "NodeScan",
        "id": 0,
        "input_rows": 0,
        "rows": 1000,
        "time_ns": 1250000,
        "bytes_alloc": 102400
      },
      {
        "op": "Filter",
        "id": 1,
        "input_rows": 1000,
        "rows": 120,
        "time_ns": 85000,
        "bytes_alloc": 12800
      }
    ],
    "totals": {
      "time_ns": 1335000,
      "rows_returned": 120,
      "peak_bytes": 115200
    }
  }
}
```

### SUCCESS

Confirms successful operation (for statements without results).

```json
{
  "type": "SUCCESS",
  "status_class": "00000",
  "stats": {
    "nodes_created": 1,
    "relationships_created": 0,
    "properties_set": 3
  }
}
```

### ERROR

Error response.

```json
{
  "type": "ERROR",
  "status_class": "42000",
  "message": "Syntax error: unexpected token 'SELCT', expected 'SELECT' or 'MATCH'",
  "details": {
    "line": 1,
    "column": 1,
    "expected": ["SELECT", "MATCH"],
    "found": "SELCT"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | "ERROR" |
| `status_class` | string | GQL status code |
| `message` | string | Human-readable error |
| `details` | object | Additional error context |

### PONG

Response to PING.

```json
{
  "type": "PONG",
  "server_time": 1706450000000
}
```

## Status Codes

Geode uses ISO/IEC 39075 GQL status codes:

| Code | Class | Description |
|------|-------|-------------|
| `00000` | Success | Operation completed successfully |
| `02000` | Warning | Completed with warnings |
| `08000` | Connection | Connection exception |
| `22000` | Data | Data exception (type mismatch, overflow) |
| `23000` | Integrity | Constraint violation |
| `25000` | Transaction | Invalid transaction state |
| `42000` | Syntax | Query syntax error |

### Additional Status Information

```json
{
  "status_class": "02000",
  "additional_statuses": ["US001"],
  "flagger_findings": ["U:US001/enforced"]
}
```

## Query Flow

### Simple Query

```plaintext
Client                              Server
   |                                   |
   |-------- RUN_GQL ---------------->|
   |                                   |
   |<------- SCHEMA ------------------|
   |                                   |
   |-------- PULL ------------------->|
   |<------- BINDINGS (final=true) ---|
   |                                   |
```

### Paginated Results

```plaintext
Client                              Server
   |                                   |
   |-------- RUN_GQL ---------------->|
   |                                   |
   |<------- SCHEMA ------------------|
   |                                   |
   |-------- PULL (1000) ------------>|
   |<------- BINDINGS (final=false) --|
   |                                   |
   |-------- PULL (1000) ------------>|
   |<------- BINDINGS (final=false) --|
   |                                   |
   |-------- PULL (1000) ------------>|
   |<------- BINDINGS (final=true) ---|
   |                                   |
```

### Transaction Flow

```plaintext
Client                              Server
   |                                   |
   |-------- BEGIN ------------------>|
   |<------- SUCCESS -----------------|
   |                                   |
   |-------- RUN_GQL (CREATE) ------->|
   |<------- SUCCESS -----------------|
   |                                   |
   |-------- RUN_GQL (MATCH) -------->|
   |<------- SCHEMA ------------------|
   |-------- PULL ------------------->|
   |<------- BINDINGS ----------------|
   |                                   |
   |-------- COMMIT ----------------->|
   |<------- SUCCESS -----------------|
   |                                   |
```

### Error Handling

```plaintext
Client                              Server
   |                                   |
   |-------- RUN_GQL (invalid) ------>|
   |                                   |
   |<------- ERROR (42000) -----------|
   |                                   |
```

## Client Implementation Guide

### Connection Lifecycle

```go
// Pseudocode for client implementation

// 1. Establish QUIC connection
conn := quic.Dial(server, tlsConfig)

// 2. Send HELLO
send(conn, {"type": "HELLO", "client_name": "my-client", ...})

// 3. Wait for HELLO_ACK
ack := receive(conn)
if ack.type != "HELLO_ACK" {
    return error("handshake failed")
}

// 4. Ready to send queries
```

### Query Execution

```go
// Execute query and collect all results
func query(conn, gql, params) ([]Row, error) {
    // Send query
    send(conn, {
        "type": "RUN_GQL",
        "query": gql,
        "parameters": params
    })

    // Get schema
    schema := receive(conn)
    if schema.type == "ERROR" {
        return nil, schema.message
    }

    // Collect results
    var rows []Row
    for {
        send(conn, {"type": "PULL", "page_size": 1000})

        bindings := receive(conn)
        rows = append(rows, bindings.rows...)

        if bindings.final {
            break
        }
    }

    return rows, nil
}
```

### Error Handling

```go
// Handle protocol errors
func handleResponse(msg Message) error {
    if msg.type == "ERROR" {
        switch msg.status_class {
        case "42000":
            return SyntaxError{msg.message}
        case "22000":
            return DataError{msg.message}
        case "23000":
            return ConstraintError{msg.message}
        case "25000":
            return TransactionError{msg.message}
        default:
            return GenericError{msg.message}
        }
    }
    return nil
}
```

### Connection Pooling

```go
// Pool connections for performance
type Pool struct {
    connections chan *Connection
    maxSize     int
}

func (p *Pool) Get() *Connection {
    select {
    case conn := <-p.connections:
        return conn
    default:
        return newConnection()
    }
}

func (p *Pool) Put(conn *Connection) {
    select {
    case p.connections <- conn:
    default:
        conn.Close()
    }
}
```

## Server Implementation Notes

### Message Processing

```zig
// Server message handler (pseudocode)
fn handleMessage(client: *Client, msg: Message) !void {
    switch (msg.type) {
        .HELLO => try handleHello(client, msg),
        .RUN_GQL => try handleQuery(client, msg),
        .PULL => try handlePull(client, msg),
        .BEGIN => try handleBegin(client, msg),
        .COMMIT => try handleCommit(client, msg),
        .ROLLBACK => try handleRollback(client, msg),
        .PING => try sendPong(client),
        .CLOSE => try handleClose(client),
    }
}
```

### Flow Control

Server should implement back-pressure:

- Limit concurrent queries per connection
- Respect PULL page_size (max 10,000)
- Release result memory after final page

## Security Considerations

### Authentication

Support multiple authentication methods:

```json
// Password authentication
{
  "auth": {
    "method": "password",
    "username": "admin",
    "password": "secret"
  }
}

// Token authentication
{
  "auth": {
    "method": "token",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}

// Certificate authentication (mTLS)
{
  "auth": {
    "method": "certificate"
  }
}
```

### Rate Limiting

Implement server-side rate limiting:

- Maximum queries per second per connection
- Maximum concurrent connections per client
- Query timeout enforcement

## Related Documentation

- **[Wire Protocol Architecture](/docs/architecture/wire-protocol/)** - Detailed architecture
- **[Client Libraries](/docs/client-libraries/)** - Language-specific clients
- **[Security Overview](/docs/security/overview/)** - Security configuration
- **[Error Codes](/docs/reference/error-codes/)** - Complete error reference

---

**Protocol Version:** 1
**Last Updated:** January 28, 2026
**Status:** Production Ready
**Transport:** QUIC + TLS 1.3 Only
