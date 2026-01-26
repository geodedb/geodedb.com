---
title: "Introduction and Key Features"
description: "Production-ready graph database with ISO GQL compliance, ACID transactions, vector/spatial/full-text indexing, enterprise security, and distributed query coordination"
weight: 10
tags:
  - overview
  - introduction
  - iso-gql
  - gql-compliance
categories:
  - graph-databases-101
  - getting-started
keywords:
  - GQL
  - ISO 39075
  - graph database
  - MVCC
  - SSI
  - HNSW
  - BM25
  - QUIC
---

<!-- CANARY: REQ=REQ-GQL-001; FEATURE="BasicQuery"; ASPECT=Testing; STATUS=TESTED; OWNER=test; UPDATED=2025-10-02 -->

# Introduction to Geode

Geode is an enterprise-ready graph database implementing the **ISO/IEC 39075:2024 Graph Query Language (GQL)** standard. Built with Zig for performance and reliability, Geode provides QUIC+TLS transport, ACID transactions, and comprehensive enterprise security features.

## What Geode Is

Geode is a production-ready graph database that combines:

- **100% ISO/IEC 39075:2024 GQL compliance** (70/70 official tests passing)
- **Enterprise-grade security** with authentication, encryption (TDE/FLE), and audit logging
- **QUIC+TLS transport** for modern, secure, multiplexed connections
- **Built with Zig** for memory safety and performance
- **Distributed query coordination** supporting federated execution across shards

## Core Differentiators

### Standards Compliance (GQL)

Geode achieves **100% compliance** with the ISO/IEC 39075:2024 GQL standard:

- ✅ Complete pattern matching syntax (`MATCH`, variable-length paths)
- ✅ Full aggregation support (COUNT, SUM, AVG, MIN, MAX, GROUP BY)
- ✅ Set operations (UNION, INTERSECT, EXCEPT)
- ✅ All 70 official ISO conformance tests passing
- ✅ Path helper functions (`length()`, `nodes()`, `relationships()`)

**Why it matters**: Standards compliance ensures your queries are portable and future-proof, with clear semantics defined by the ISO specification.

### Transaction Integrity

**MVCC (Multi-Version Concurrency Control) + SSI (Serializable Snapshot Isolation)**:

- True ACID semantics with serializable isolation
- Optimistic concurrency control with conflict detection
- Write-Ahead Log (WAL) for point-in-time recovery
- Storage-level checksumming for data integrity
- Session persistence across queries

**Why it matters**: Your graph data maintains consistency even under high concurrency, with the strongest isolation guarantees available.

### Index Breadth

Geode provides specialized indexing for diverse workloads:

- **B-tree indexes**: Range queries and sorting
- **Hash indexes**: Fast equality lookups
- **Full-text search**: BM25 ranking with tokenization
- **Spatial indexes**: R-tree for geographic queries (LatLon, GeoPoint)
- **Vector similarity**: HNSW (Hierarchical Navigable Small World) with SIMD acceleration
- **Specialized indexes**: JSON path indexing, Patricia trie for network addresses, interval trees

**Cost-Based Optimizer (CBO)** and **IndexOptimizer** automatically select the best index for each query based on statistics and cardinality estimates.

**Why it matters**: No matter your query pattern—text search, geospatial, vector similarity, or graph traversal—Geode has a specialized index to accelerate it.

### Security Stack

Enterprise security features built-in, not bolted-on:

- **Authentication**: RBAC/ABAC with Argon2id password hashing, MFA support
- **Enhanced Row-Level Security (RLS)**: Policy-based access control (SELECT/INSERT/UPDATE/DELETE policies)
- **Transparent Data Encryption (TDE)**: Disk and WAL encryption with <1% overhead
- **Field-Level Encryption (FLE)**: Selective encryption with blind indexes for searchable encrypted data
- **Audit Logging**: Tamper-evident logs with hash chaining, cryptographic signatures, and tracing IDs
- **KMS Integration**: Multiple provider support (Vault, AWS KMS, environment-based)

**Why it matters**: Meet compliance requirements (GDPR, HIPAA, PCI) with battle-tested security controls, not custom implementations.

### Distributed Query Coordination

Execute queries across federated graphs and sharded datasets:

- **Federated execution**: Coordinate queries across multiple Geode instances
- **Result merging**: Combine results from distributed shards with deterministic ordering
- **EXPLAIN FEDERATION**: Visualize distributed query plans

**Why it matters**: Scale beyond a single node while maintaining GQL query semantics and transactional integrity.

## Feature Highlights

### If you care about...

**Vector similarity search** → Geode supports HNSW vector indexing with SIMD-accelerated distance calculations (<50ns per 8D L2 distance).

**Full-text ranking** → BM25 integration provides relevance scoring with optimizer awareness for efficient query planning.

**Graph algorithms** → Built-in support for centrality (PageRank, betweenness), community detection, shortest paths, and ML embeddings (Node2Vec, GraphSAGE, DeepWalk).

**Spatial queries** → Geographic types (LatLon, GeoPoint) with R-tree indexing for location-based queries.

**Data types** → 50+ specialized types including vectors (VectorF32/VectorI32), timestamps with timezone support, JSON/JSONB, binary data (Bytea), network addresses (IpAddr, Subnet), cryptographic hashes, and UUIDs.

**Performance** → Memory-mapped I/O (13.18x improvement over traditional I/O), cost-based query optimization, and SIMD acceleration for hot paths.

**Compliance and governance** → 1,735 CANARY governance markers tracking 2,190+ requirements with evidence-based development methodology.

## Architecture at a Glance

Geode's architecture is designed for performance and reliability:

- **Storage Engine**: Memory-mapped I/O with page-level checksums
- **Query Engine**: Cost-based optimizer with index-aware rewriting
- **Transaction Manager**: MVCC with write-ahead logging
- **Security Layer**: Policy-driven RLS evaluation with encryption
- **Transport**: QUIC+TLS for secure, multiplexed connections (no TCP fallback)

For architectural details, see the [Architecture](/docs/architecture/) pages.

## When to Choose Geode

Geode is ideal for:

- **OLTP graph workloads** requiring strong isolation and ACID guarantees
- **Compliance-driven environments** needing audit trails, encryption, and policy controls
- **Hybrid workloads** combining graph traversal with vector similarity or full-text search
- **Standards-based applications** leveraging portable GQL queries
- **Distributed systems** requiring federated query coordination

Geode may not be the best fit for:

- Simple key-value workloads (consider Redis or similar)
- Pure analytics workloads without transactional requirements (consider graph analytics engines)
- Extremely high-write scenarios requiring eventual consistency (Geode prioritizes consistency over availability)

## Production Readiness

**Current Status**: Production Ready (v0.18.0+)

- **Test Coverage**: 97.4% pass rate (1,644/1,688 integration tests)
- **Unit Tests**: 100% pass rate (393/393 tests)
- **GQL Compliance**: 100% (70/70 ISO tests)
- **Governance**: 1,735 CANARY markers tracking requirements with evidence

**Performance Metrics**:
- 10,000-50,000 read-write transactions/sec (throughput range)
- <50ns per distance calculation (8D L2 vector similarity)
- 13.18x I/O improvement with memory-mapped storage
- Load-test targets up to 100M+ nodes and 1B+ edges

## Next Steps

Ready to get started?

- **[Installation & Quick Start](/docs/get-started/)** - Get Geode running in minutes
- **[GQL Guide](/docs/gql/guide)** - Learn the query language with executable examples
- **[Data Model and Types](/docs/model/data-model-and-types)** - Understand the property graph model
- **[Security Guide](/docs/security/overview)** - Configure authentication and encryption

Explore use cases:

- **[Use Case Guides](/docs/use-cases/overview)** - Real-world domain modeling patterns

Join the community:

- **GitHub**: [https://github.com/codeprosorg/geode](https://github.com/codeprosorg/geode)
- **Documentation**: [https://geodedb.com/docs](https://geodedb.com/docs)
- **Discord**: Community chat and support
