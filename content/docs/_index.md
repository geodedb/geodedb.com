---
title: "Documentation"
description: "Complete documentation for Geode graph database with 100% GQL compliance"
weight: 1

keywords:
  - Geode documentation
  - graph database docs
  - GQL reference
  - Geode guides
  - API reference
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Geode Documentation

Welcome to the complete documentation for Geode, an enterprise-ready graph database with ISO/IEC 39075:2024 compliance.

## Quick Links

### Getting Started

- **[Installation](/guides/installation/)** - Install Geode from source or Docker
- **[Getting Started](/docs/getting-started/)** - First steps with Geode

### Core Documentation

- **[GQL Reference](/docs/gql-reference/)** - Complete query language reference with pattern matching, aggregations, and set operations
- **[Data Model and Types](/docs/model/data-model-and-types/)** - 50+ specialized types including vectors, geographic, network, and cryptographic
- **[API Reference](/docs/api-reference/)** - Functions, operators, and system procedures
- **[Configuration](/docs/configuration/)** - Complete server and client configuration reference

### Architecture and Performance

- **[Architecture](/docs/architecture/)** - System architecture, storage engine, and distributed systems
- **[Performance](/docs/performance/)** - Query optimization, configuration tuning, and hardware recommendations

### Client Libraries

- **[Client Libraries](/docs/client-libraries/)** - Official libraries for Go, Python, Rust, Node.js, and Zig
  - [Go Client](/docs/client-libraries/go-client/) - Production-ready database/sql driver
  - [Python Client](/docs/client-libraries/python-client/) - Async Python with type hints
  - [Rust Client](/docs/client-libraries/rust-client/) - High-performance type-safe client

### Tools and Interfaces

- **[Geode UI](/docs/geode-ui/)** - Web and desktop console with a GQL editor, interactive graph visualization, schema explorer, and admin/ops tooling

### New Query Capabilities

- **[Time-Series](/docs/query/timeseries/)** - Native `geode.ts.*` GQL surface for append-friendly time-series data
- **[Full-Text Search](/docs/query/full-text-search/)** - Durable, BM25-ranked search via `CREATE INDEX ... USING fulltext` and `CALL geode.fts.search(...)`
- **[Observability](/docs/ops/observability/)** - First-party OpenTelemetry (OTLP) metrics and traces

## Key Features

### 100% GQL compliance

Geode maintains 100% ISO/IEC 39075:2024 GQL compliance:

- ✅ Deterministic ordering and pagination policies
- ✅ MATCH pattern matching with bounded expansions and OPTIONAL MATCH
- ✅ Full aggregation support
- ✅ Set operations (UNION, INTERSECT, EXCEPT)
- ✅ See the [conformance profile](/docs/gql/conformance-profile/) for scope and diagnostics

### Enterprise-Grade Security

- Authentication: RBAC/ABAC with MFA support
- Encryption: TDE and FLE with searchable encryption
- Audit: Comprehensive compliance tracking
- RLS: Enhanced row-level security with policy evaluation

### Optimized Architecture

- Memory-mapped I/O for efficient storage access
- SIMD-accelerated vector distance calculations
- Six specialized index types for different workloads
- Distributed deployment with up to 32 shards

### Advanced Data Types

Over 50 specialized types including:

- Vectors (VectorF32/VectorI32) with SIMD acceleration
- Geographic (LatLon, GeoPoint) with R-tree indexing
- Network (IpAddr, Subnet) with Patricia trie indexing
- Cryptographic (Hash, UUID) with constant-time operations

## Test Coverage

- **Integration tests**: 97.4% pass rate (1,644/1,688 tests)
- **Unit tests**: 100% pass rate (393/393 tests)
- **GQL conformance profile**: see conformance profile
- **CANARY markers**: 1,735 markers tracking 2,190+ requirements

## Community and Support

- **Documentation**: [https://geodedb.com/docs](https://geodedb.com/docs)
- **GitHub**: [https://github.com/codeprosorg/geode](https://github.com/codeprosorg/geode)
- **Discord**: Community chat and support
- **Email**: [email protected]
