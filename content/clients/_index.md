---
title: "Client Libraries"
description: "Official client libraries for Geode Graph Database"
weight: 2
layout: docs
tags:
  - clients
  - sdk
  - api
categories:
keywords:
  - Geode clients
  - graph database drivers
  - GQL SDKs
  - client libraries
  - API clients
  - client-libraries
  - integration
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Geode provides official client libraries for multiple programming languages. All clients communicate via **QUIC + TLS 1.3** using the **Protobuf wire protocol** and implement the ISO/IEC 39075:2024 GQL standard.

## Common Features

All client libraries share the same wire protocol but expose different levels of convenience:

- **QUIC + TLS 1.3 transport** for secure low-latency sessions
- **GQL execution** via `RUN_GQL` + `PULL`
- **Transaction support** via `BEGIN`, `COMMIT`, `ROLLBACK`
- **Error codes** aligned with ISO/IEC 39075 status classes
- **Connection pooling** (where applicable)
- **Prepared statements** for query optimization

## Protocol Details

All clients use:
- **Transport**: QUIC + TLS 1.3 (no TCP fallback)
- **Wire Format**: Protobuf wire protocol
- **Default Port**: 3141 (configurable per deployment)

For detailed protocol information, see the [Protocol Specification](/docs/protocol/).
