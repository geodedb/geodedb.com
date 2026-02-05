---
title: "Wire Protocol Specification"
description: "Complete Geode wire protocol specification with QUIC/gRPC transport, Protobuf messages, streaming, federation, and client-server communication details."
summary: "Understand Geode's QUIC/gRPC wire protocol including Protobuf message formats, pagination semantics, status diagnostics, and federation result handling."
slug: "wire-protocol"
url: "/docs/architecture/wire-protocol/"
date: 2026-02-05
lastmod: 2026-02-05
draft: false
weight: 550
keywords: ["wire protocol", "QUIC", "gRPC", "Protobuf", "message format", "client-server", "network protocol", "streaming"]
tags: ["architecture", "protocol", "networking", "specification"]
categories: ["Architecture"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/architecture/wire-protocol/"
    noindex: false
---

<!-- CANARY: REQ=REQ-ENGINE-005; FEATURE="Engine"; ASPECT=CostBasedOptimizer; STATUS=TESTED; OWNER=engine; UPDATED=2026-02-05 -->

## Overview

Geode uses a **Protobuf-based wire protocol** over QUIC (default) or gRPC for client-server communication. This document covers message formats, pagination semantics, status diagnostics, and federation result handling.

### Key Features

- **QUIC + TLS 1.3**: Mandatory encryption for QUIC
- **Protobuf Messages**: Length-prefixed framing for QUIC; gRPC framing for gRPC
- **Streaming Results**: Paginated result sets with flow control
- **Status Codes**: ISO/IEC 39075 GQL status classes + diagnostics
- **Federation Support**: Coordinator merge of remote results

## Transport Layer

### QUIC Requirements

- QUIC protocol (RFC 9000)
- TLS 1.3 encryption
- ALPN: `geode/1`
- Multiplexed streams + flow control

**Default Port**: 3141 (standard), 8443 (alternative)

### gRPC (Optional)

gRPC is supported for compatibility; it uses the same Protobuf schema and runs over HTTP/2.

## Message Schema

The full schema is defined in `src/proto/geode.proto`.

**Top-level wrappers**:
- `ClientPacket` → `QuicClientMessage`
- `ServerPacket` → `QuicServerMessage`

### Core Requests

- `HelloRequest`: authentication + client identity
- `ExecuteRequest`: GQL query + parameters
- `PullRequest`: page retrieval
- `BeginRequest` / `CommitRequest` / `RollbackRequest`
- `SavepointRequest` / `RollbackToRequest`

### Core Responses

`ExecutionResponse` wraps all responses with `status` + payload:

- `SchemaDefinition`
- `DataPage`
- `Error`
- `ExplainPayload`
- `ProfilePayload`
- `ExecutionMetrics`

## Pagination Semantics

- `page_size=0` defaults to 1000
- `final=true` marks the last page
- After `final=true`, a new `PULL` returns `NoResult`
- `ordered` + `order_keys` signal ordering guarantees

**Policy**: LIMIT/OFFSET without ORDER BY is rejected with diagnostic `US001`.

## Status & Diagnostics

Each response includes a `Status` object:

- `status_class` (ISO/IEC 39075 class)
- `status_subclass` (optional)
- `additional_statuses` (e.g., `US001`, `ExecutionGuardTrip`)
- `flagger_findings` (implementation-defined or dependent behaviors)

## Explain & Profile

Explain/Profile payloads are additive across releases. Clients should ignore unknown fields to remain forward-compatible.

## Federation Result Handling (Internal)

Federated query execution returns one JSON line per remote shard/sub-query (internal protocol). The coordinator merges results and preserves ordering when all contributors are ordered. This result line protocol is **internal/experimental** and may change.

## Related Documentation

- [Wire Protocol Overview](/docs/protocol/)
- [DSN Specification](/docs/reference/dsn/)
- [CLI and API Reference](/docs/reference/cli-and-api/)
