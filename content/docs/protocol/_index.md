---
title: "Wire Protocol"
description: "Complete wire protocol specification for Geode client-server communication including QUIC/gRPC transport, Protobuf messages, and pagination"
summary: "Technical specification of Geode's QUIC/gRPC wire protocol covering Protobuf message types, transaction control, and streaming results."
weight: 80
keywords:
  - wire protocol
  - QUIC protocol
  - gRPC protocol
  - client protocol
  - Protobuf wire protocol
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
    keywords: "wire protocol, QUIC, gRPC, Protobuf wire protocol, Geode client protocol, message format"
    description: "Complete wire protocol specification for Geode client-server communication"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-02-05 -->

# Wire Protocol Specification

This document specifies the wire protocol used for communication between Geode clients and servers. The protocol uses **length-prefixed Protobuf messages** over QUIC (default) or gRPC.

## Overview

### Protocol Characteristics

| Property | Value |
|----------|-------|
| **Transport** | QUIC (RFC 9000), optional gRPC (HTTP/2) |
| **Encryption** | TLS 1.3 (mandatory for QUIC) |
| **Message Format** | Protobuf (length-prefixed) |
| **Default Port** | 3141 (standard), 8443 (alternative) |
| **Protocol Version** | 1 |

### Key Features

- **Mandatory Encryption**: QUIC always uses TLS 1.3
- **Multiplexed Streams**: Multiple queries over a single connection
- **Streaming Results**: Paginated result sets with flow control
- **0-RTT Resumption**: Fast QUIC connection establishment
- **Connection Migration**: Seamless network changes

## Transport Layer

### QUIC Connection

Geode uses QUIC by default (with optional gRPC). There is no TCP fallback for the QUIC transport. QUIC provides:

- Built-in encryption (TLS 1.3)
- Connection multiplexing
- Stream-level flow control
- Connection migration
- Reduced latency (0-RTT)

**ALPN**: QUIC uses `geode/1` as the negotiated ALPN protocol.

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

## Message Format

### Protobuf Framing

All client/server messages are Protobuf messages defined in `src/proto/geode.proto`. Over QUIC, messages are **length-prefixed** to support streaming and multiplexed message boundaries. Over gRPC, the same Protobuf schema is used via standard gRPC framing.

**Top-level wrappers**:
- `ClientPacket` → `QuicClientMessage`
- `ServerPacket` → `QuicServerMessage`

## Client Messages

### HELLO (`HelloRequest`)

Initiates connection handshake and authentication.

Key fields:
- `username`, `password`
- `tenant_id` (optional)
- `client_name`, `client_version`
- `wanted_conformance`

### RUN_GQL (`ExecuteRequest`)

Executes a GQL query or statement.

Key fields:
- `session_id`
- `query`
- `params` (repeated `Param { name, value }`)

### PULL (`PullRequest`)

Requests the next page of results.

Key fields:
- `request_id`
- `page_size`
- `session_id` (required for gRPC; ignored for QUIC)

### Transaction Control

- `BeginRequest`
- `CommitRequest`
- `RollbackRequest`
- `SavepointRequest`
- `RollbackToRequest`

## Server Responses

All responses are encoded in `ExecutionResponse` with a `status` object and a typed payload:

- `SchemaDefinition` (column names/types)
- `DataPage` (rows + ordering metadata)
- `Error` (code/message)
- `ExplainPayload`
- `ProfilePayload`
- `ExecutionMetrics` (parse/plan/execute timings)

### Status and Diagnostics

Every response carries a `Status` object:

- `status_class` (ISO/IEC 39075 codes; e.g., `00000` success)
- `status_subclass` (optional)
- `additional_statuses` (e.g., `US001`, `ExecutionGuardTrip`)
- `flagger_findings` (implementation-defined or dependent behaviors)

## Pagination

Results are paginated via `PULL` requests and `DataPage` payloads.

- `page_size=0` defaults to 1000
- `final=true` marks the last page
- A `PULL` after `final=true` returns `NoResult`
- `ordered` and `order_keys` indicate ordering guarantees

**Policy**: LIMIT/OFFSET without `ORDER BY` is rejected with diagnostic `US001`.

## Explain & Profile

`ExplainPayload` and `ProfilePayload` are delivered via `ExecutionResponse` and are additive across releases. Clients should ignore unknown fields for forward compatibility.

## Stability & Compatibility

- Wire changes are additive within a major version
- Removals or incompatible renames require a major bump
- Clients should be tolerant of unknown fields

## Related Documentation

- [DSN Specification](/docs/reference/dsn/)
- [CLI and API Reference](/docs/reference/cli-and-api/)
- [GQL Conformance Profile](/docs/gql/conformance-profile/)
