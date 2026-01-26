---
title: "Wire Protocol Specification"
description: "Complete Geode wire protocol specification with QUIC transport, binary messages, streaming, federation, and client-server communication details."
summary: "Understand Geode's QUIC-based wire protocol including message formats, binary protocol, frame structure, pagination, and federation result protocols."
slug: "wire-protocol"
url: "/docs/architecture/wire-protocol/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 550
keywords: ["wire protocol", "QUIC", "binary protocol", "message format", "client-server", "network protocol", "streaming"]
tags: ["architecture", "protocol", "networking", "specification"]
categories: ["Architecture"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/architecture/wire-protocol/"
    noindex: false
---

<!-- CANARY: REQ=REQ-ENGINE-005; FEATURE="Engine"; ASPECT=CostBasedOptimizer; STATUS=TESTED; OWNER=engine; UPDATED=2026-01-15 -->

## Overview

Geode uses a QUIC-based binary protocol for client-server communication. This document specifies message formats, frame structures, pagination semantics, and federation protocols.

### Key Features

- **QUIC+TLS Only**: No TCP fallback, mandatory encryption
- **JSON Line Protocol**: One JSON object per line, newline-delimited
- **Streaming Results**: Paginated result sets with flow control
- **Status Codes**: ISO/IEC 39075 GQL status classes
- **Federation Support**: Distributed query result merging

## Transport Layer

### QUIC+TLS Requirements

**Mandatory**:
- QUIC protocol (RFC 9000)
- TLS 1.3 encryption
- Mutual authentication (optional but recommended)
- 0-RTT resumption supported

**Default Port**: 3141 (standard), 8443 (alternative)

**Connection Properties**:
- Multiplexed streams
- Built-in flow control
- Native encryption
- Connection migration

### Client Handshake

**1. HELLO Message**:
```json
{
  "type": "HELLO",
  "client_name": "geode-client-go",
  "client_version": "0.18.0",
  "protocol_version": 1,
  "capabilities": ["streaming", "pagination", "transactions"]
}
```

**2. Server Response**:
```json
{
  "type": "HELLO_ACK",
  "server_version": "0.18.0",
  "protocol_version": 1,
  "capabilities": ["streaming", "pagination", "transactions", "federation"]
}
```

## Client Messages

### RUN_GQL

Execute GQL query or statement.

```json
{
  "type": "RUN_GQL",
  "query": "MATCH (n:Person) WHERE n.age > $age RETURN n.name",
  "parameters": {
    "age": 25
  },
  "mode": "NORMAL"
}
```

**Fields**:
- `type`: "RUN_GQL" (required)
- `query`: GQL statement (required)
- `parameters`: Named parameters (optional)
- `mode`: "NORMAL", "EXPLAIN", or "PROFILE" (optional, default: "NORMAL")

**Modes**:
- **NORMAL**: Execute and return results
- **EXPLAIN**: Return logical query plan (no execution)
- **PROFILE**: Execute with performance metrics

### PULL

Request next page of results.

```json
{
  "type": "PULL",
  "page_size": 1000
}
```

**Fields**:
- `type`: "PULL" (required)
- `page_size`: Rows to fetch (optional, default: 1000)

**Constraints**:
- `page_size=0`: Use default (1000)
- Maximum: 10,000 rows per page
- `PULL` after `final:true`: Returns ERROR (NoResult)

### Transaction Control

**BEGIN**:
```json
{
  "type": "BEGIN",
  "isolation_level": "SERIALIZABLE"
}
```

**COMMIT**:
```json
{
  "type": "COMMIT"
}
```

**ROLLBACK**:
```json
{
  "type": "ROLLBACK"
}
```

**Isolation Levels**:
- READ_UNCOMMITTED
- READ_COMMITTED
- REPEATABLE_READ
- SNAPSHOT
- SERIALIZABLE
- STRICT_SERIALIZABLE

### PING

Keep-alive heartbeat.

```json
{
  "type": "PING"
}
```

**Response**:
```json
{
  "type": "PONG",
  "server_time": 1706112615123
}
```

## Server Responses

### SCHEMA

Query result schema (sent first).

```json
{
  "type": "SCHEMA",
  "status_class": "00000",
  "columns": [
    {"name": "n.name", "type": "STRING"},
    {"name": "n.age", "type": "INTEGER"}
  ]
}
```

**Fields**:
- `type`: "SCHEMA"
- `status_class`: GQL status code
- `columns`: Array of column descriptors

### BINDINGS

Result rows (paginated).

```json
{
  "type": "BINDINGS",
  "status_class": "00000",
  "ordered": true,
  "order_keys": ["n.age"],
  "rows": [
    ["Alice", 30],
    ["Bob", 28],
    ["Carol", 32]
  ],
  "final": false
}
```

**Fields**:
- `type`: "BINDINGS"
- `status_class`: GQL status code
- `ordered`: Boolean (result set ordered?)
- `order_keys`: Array of sort columns (if ordered)
- `rows`: Array of row arrays
- `final`: Boolean (last page?)

**Pagination Flow**:
```plaintext
Client: RUN_GQL
Server: SCHEMA
Client: PULL (page_size=1000)
Server: BINDINGS (final=false, 1000 rows)
Client: PULL (page_size=1000)
Server: BINDINGS (final=true, 500 rows)
Client: PULL
Server: ERROR (NoResult)
```

### EXPLAIN

Logical query plan.

```json
{
  "type": "EXPLAIN",
  "status_class": "00000",
  "result": {
    "logical": [
      {"op": "NodeScan", "label": "Person"},
      {"op": "Filter", "condition": "age > 25"},
      {"op": "Project", "columns": ["name"]}
    ],
    "properties": {
      "ordered": false,
      "estimated_cost": 45.2,
      "estimated_rows": 120
    }
  }
}
```

**Properties**:
- `logical`: Array of operator descriptors
- `properties`: Query characteristics and estimates

### PROFILE

Performance metrics.

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
      "peak_bytes": 115200
    }
  }
}
```

**Metrics**:
- `op`: Operator name
- `input_rows`: Rows consumed
- `rows`: Rows produced
- `time_ns`: Wall clock duration (nanoseconds)
- `bytes_alloc`: Allocated memory (bytes)

### ERROR

Error response.

```json
{
  "type": "ERROR",
  "status_class": "22000",
  "message": "Invalid query syntax",
  "details": {
    "line": 1,
    "column": 12,
    "expected": "WHERE",
    "found": "WEAR"
  }
}
```

**Status Classes** (ISO GQL):
- `00000`: Success
- `02000`: Warning
- `22000`: Data exception
- `42000`: Syntax error
- `23000`: Constraint violation

## Status Codes

### GQL Status Classes

| Code | Category | Description |
|------|----------|-------------|
| 00000 | Success | Operation completed successfully |
| 02000 | Warning | Completed with warnings |
| 22000 | Data | Data exception (type mismatch, overflow) |
| 23000 | Integrity | Constraint violation |
| 42000 | Syntax | Query syntax error |
| 08000 | Connection | Connection exception |
| 25000 | Transaction | Invalid transaction state |

### Additional Statuses

**Diagnostics Field**:
```json
{
  "status_class": "02000",
  "additional_statuses": ["US001"],
  "flagger_findings": ["U:US001/enforced"]
}
```

**Usage Flags**:
- `I:*`: Implementation-defined behavior
- `U:*`: Unspecified/dependent behavior
- `US001`: Unordered pagination warning

## Pagination Semantics

### Result Materialization

**Current Behavior**: Full materialization, then paging

```plaintext
1. Query executes completely
2. Results stored in memory
3. PULL requests fetch pages from stored results
4. final=true on last page
```

**Future**: Streaming execution with lazy materialization

### Flow Control

**Client**:
```plaintext
1. Send RUN_GQL
2. Wait for SCHEMA
3. Send PULL (request page)
4. Receive BINDINGS
5. Process rows
6. If final=false, GOTO 3
7. Done
```

**Server**:
```plaintext
1. Receive RUN_GQL
2. Parse query
3. Send SCHEMA
4. Wait for PULL
5. Send BINDINGS (up to page_size rows)
6. Set final=true if last page
7. If not final, GOTO 4
8. Subsequent PULL returns ERROR
```

### Ordering Guarantees

**ordered=true**:
- Rows returned in deterministic order
- order_keys specifies sort columns
- Order preserved across pages

**ordered=false**:
- No ordering guarantee
- order_keys omitted
- May return different order on retry

## Federation Protocol

### Result Line Protocol

**Use Case**: Distributed query coordination

**Format**: Newline-delimited JSON

**Result Message**:
```json
{
  "rows": [
    {"col1": 1, "col2": "Alice"},
    {"col3": 2, "col2": "Bob"}
  ],
  "schema": [
    {"name": "col1", "type": "INTEGER"},
    {"name": "col2", "type": "STRING"}
  ],
  "ordered": true,
  "order_keys": ["col1"],
  "exec_ms": 0.42
}
```

**Fields**:
- `rows`: Result rows from remote shard
- `schema`: Column descriptors (may be empty if coordinator has schema)
- `ordered`: Ordering flag
- `order_keys`: Sort columns (if ordered)
- `exec_ms`: Remote execution time (milliseconds)

### Ordered Merge

**Coordinator Behavior**:
```plaintext
1. Receive results from N shards
2. Check ordered flag for each
3. If all ordered=true and order_keys match:
   a. Perform k-way merge (binary heap)
   b. Return ordered=true result
4. Else:
   a. Concatenate results (unordered)
   b. Return ordered=false
```

**Example**:
```plaintext
Shard 1: [1, 3, 5] (ordered=true, order_keys=["id"])
Shard 2: [2, 4, 6] (ordered=true, order_keys=["id"])
Merged: [1, 2, 3, 4, 5, 6] (ordered=true)
```

**Mismatch**:
```plaintext
Shard 1: ordered=true, order_keys=["id"]
Shard 2: ordered=true, order_keys=["name"]
Result: ordered=false (key mismatch)
Flag: U:FederationOrderMismatch
```

## Raft Internal Protocol

**Use Case**: Cluster coordination (internal)

**Transport**: QUIC newline-delimited JSON

**Frame Format**:
```json
{
  "term": 12,
  "from": "node-a",
  "kind": "append_entries",
  "payload": {
    "term": 12,
    "leader_id": "node-a",
    "prev_log_index": 100,
    "prev_log_term": 11,
    "leader_commit": 95,
    "entries": [
      {"term": 12, "index": 101, "cmd": "write"}
    ]
  }
}
```

**Frame Kinds**:
- `request_vote`: Leader election
- `append_entries`: Log replication
- `append_resp`: Append response
- `install_snapshot`: Snapshot transfer
- `install_snapshot_resp`: Snapshot response

**Framing Rules**:
- One JSON object per line (LF-terminated)
- Maximum line size: 256 KiB
- Unknown `kind` ignored (forward compatibility)

## Best Practices

### Client Implementation

**Connection Management**:
```go
// Use connection pooling
pool := NewConnectionPool(maxConns=10)
conn := pool.Get()
defer pool.Put(conn)
```

**Pagination**:
```go
// Always handle final flag
for {
    bindings := conn.Pull(pageSize=1000)
    processRows(bindings.Rows)
    if bindings.Final {
        break
    }
}
```

**Error Handling**:
```go
// Check status class
if resp.StatusClass != "00000" {
    return fmt.Errorf("Query failed: %s", resp.Message)
}
```

### Server Implementation

**Flow Control**:
```zig
// Bounded page size
const max_page_size = 10_000;
const page_size = @min(request.page_size, max_page_size);
```

**Memory Management**:
```zig
// Release results after final page
if (page.final) {
    result_set.deinit();
}
```

## Troubleshooting

### Common Issues

**Issue**: Connection timeout

**Solution**:
```bash
# Increase QUIC idle timeout
geode serve --quic-idle-timeout 60s

# Check firewall allows UDP port 3141
sudo ufw allow 3141/udp
```

---

**Issue**: "NoResult" error on PULL

**Cause**: PULL sent after final=true

**Solution**:
```go
// Check final flag
if bindings.Final {
    return results  // Don't send another PULL
}
```

---

**Issue**: Result ordering inconsistent

**Check**:
```json
// Verify ordered flag
{
  "ordered": true,  // Check this
  "order_keys": ["id"]
}
```

**Solution**: Use ORDER BY in query to guarantee ordering

## References

### Standards

- **RFC 9000**: QUIC Transport Protocol
- **ISO/IEC 39075:2024**: GQL Status Codes
- **RFC 8446**: TLS 1.3

### Documentation

- **Binary Protocol**: `docs/BINARY_PROTOCOL.md`
- **Federation**: `docs/DISTRIBUTED_QUERY_COORDINATION.md`
- **Client Libraries**: `docs/clients/`

### Code Location

- **Server**: `src/transport/` (QUIC transport)
- **Protocol**: `src/protocol/` (Message codecs)
- **Federation**: `src/federation/` (Result merging)

## Next Steps

**For Client Developers**:
- [Go Client](/docs/client-libraries/go-client/) - Client implementation example
- [Python Client](/docs/client-libraries/python-client/) - Async client patterns
- [Rust Client](/docs/client-libraries/rust-client/) - High-performance client

**For Server Developers**:
- [Distributed Architecture](/docs/architecture/distributed-architecture/) - Federation design
- [Transaction Management](/docs/transactions/overview/) - Transaction protocol
- [Performance Tuning](/docs/query/performance-tuning/) - Query optimization

---

**Document Version**: 1.0
**Last Updated**: January 24, 2026
**Status**: Production Ready
**Protocol Version**: 1
**Transport**: QUIC+TLS 1.3 Only
