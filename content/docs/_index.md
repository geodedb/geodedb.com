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

Welcome to the complete documentation for Geode, an enterprise-ready graph database with 100% ISO/IEC 39075:2024 GQL compliance.

## Quick Links

### Getting Started

- **[Installation](installation/)** - Install Geode from source or Docker
  - [From Source](installation/from-source/) - Build with Zig compiler
- **[Getting Started](getting-started/)** - First steps with Geode
- **[Quick Start Guide](getting-started/quickstart/)** - 5-minute introduction

### Core Documentation

- **[GQL Reference](gql-reference/)** - Complete query language reference with pattern matching, aggregations, and set operations
- **[Data Types](data-types/)** - 50+ specialized types including vectors, geographic, network, and cryptographic
- **[API Reference](api-reference/)** - Functions, operators, and system procedures
- **[Configuration](configuration/)** - Complete server and client configuration reference

### Architecture and Performance

- **[Architecture](architecture/)** - System architecture, storage engine, and distributed systems
- **[Performance Tuning](performance/)** - Query optimization, configuration tuning, and hardware recommendations

### Client Libraries

- **[Client Libraries](client-libraries/)** - Official libraries for Go, Python, Rust, and Zig
  - [Go Client](client-libraries/go-client/) - Production-ready database/sql driver
  - [Python Client](client-libraries/python-client/) - Async Python with type hints
  - [Rust Client](client-libraries/rust-client/) - High-performance type-safe client

## Key Features

### 100% GQL Compliance

Geode achieves **100% compliance** with ISO/IEC 39075:2024:
- ✅ All 70 official conformance tests passing
- ✅ Complete pattern matching syntax
- ✅ Full aggregation support
- ✅ Set operations (UNION, INTERSECT, EXCEPT)

### Enterprise-Grade Security

- Authentication: RBAC/ABAC with MFA support
- Encryption: TDE with <1% overhead, FLE with searchable encryption
- Audit: Comprehensive compliance tracking
- RLS: Enhanced row-level security with policy evaluation

### High Performance

- Transaction throughput (workload-dependent): read-only up to 100,000 txn/sec; read-write 10,000-50,000 txn/sec; write-heavy 5,000-20,000 txn/sec
- Vector Search: <50ns per distance calculation (8D L2)
- Storage: 13.18x I/O improvement with memory-mapped I/O
- Scalability targets: 100M+ nodes, 1B+ edges in load-test models

### Advanced Data Types

Over 50 specialized types including:
- Vectors (VectorF32/VectorI32) with SIMD acceleration
- Geographic (LatLon, GeoPoint) with R-tree indexing
- Network (IpAddr, Subnet) with Patricia trie indexing
- Cryptographic (Hash, UUID) with constant-time operations

## Test Coverage

- **Integration tests**: 97.4% pass rate (1,644/1,688 tests)
- **Unit tests**: 100% pass rate (393/393 tests)
- **GQL compliance**: 100% (70/70 ISO tests)
- **CANARY markers**: 1,735 markers tracking 2,190+ requirements

## Community and Support

- **Documentation**: [https://geodedb.com/docs](https://geodedb.com/docs)
- **GitHub**: [https://github.com/codeprosorg/geode](https://github.com/codeprosorg/geode)
- **Discord**: Community chat and support
- **Email**: [email protected]
