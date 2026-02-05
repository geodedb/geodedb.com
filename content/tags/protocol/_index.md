---
title: "Wire Protocol & Communication"
description: "Understand Geode's wire protocol and communication layer. Learn about QUIC+TLS transport, Protobuf messages, connection management, and how to implement custom clients."
keywords:
  - wire protocol
  - QUIC protocol
  - gRPC protocol
  - TLS 1.3
  - Protobuf wire protocol
  - network communication
  - Geode
  - graph database
  - client-server protocol
  - message format
  - binary protocol
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/protocol/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-02-05 -->

Geode uses a modern, efficient wire protocol built on QUIC+TLS 1.3 (default) with **Protobuf messages**. gRPC is supported for compatibility and uses the same Protobuf schema.

## Transport Layer

### QUIC Protocol

Geode uses QUIC for transport by default.

**Advantages over TCP:**
- Reduced connection establishment latency (0-RTT)
- Built-in multiplexing (no head-of-line blocking)
- Connection migration (survives network changes)
- Improved congestion control

**Port:** 3141 (standard) or 8443 (alternative)

**ALPN:** `geode/1`

### TLS 1.3 Security

All QUIC connections are encrypted using TLS 1.3.

```bash
# Start Geode with TLS
./geode serve \
  --cert /etc/geode/certs/server-cert.pem \
  --key /etc/geode/certs/server-key.pem \
  --listen 0.0.0.0:3141
```

## Message Format

### Protobuf Messages

Messages are defined in `src/proto/geode.proto` and framed as length-prefixed Protobuf messages over QUIC (or gRPC framing).

**Client Messages**:
- `HelloRequest`
- `ExecuteRequest`
- `PullRequest`
- `BeginRequest` / `CommitRequest` / `RollbackRequest`
- `PingRequest`

**Server Responses**:
- `ExecutionResponse` (payloads: `SchemaDefinition`, `DataPage`, `Error`, `ExplainPayload`, `ProfilePayload`)

## Related Documentation

- [Wire Protocol Overview](/docs/protocol/)
- [DSN Specification](/docs/reference/dsn/)
- [Client Libraries](/docs/client-libraries/)
