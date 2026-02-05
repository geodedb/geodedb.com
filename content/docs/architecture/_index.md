---
title: "Architecture"
description: "Geode system architecture, storage engine design, and distributed systems overview"
weight: 60

keywords:
  - Geode architecture
  - graph database architecture
  - distributed graph database
  - query engine
  - storage engine
---

<!-- CANARY: REQ=REQ-ENGINE-005; FEATURE="Engine"; ASPECT=CostBasedOptimizer; STATUS=TESTED; OWNER=engine; UPDATED=2026-01-15 -->

# Geode Architecture

Geode is an enterprise-ready graph database built with a modular, high-performance architecture designed for scalability, reliability, and compliance.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Entry Points                           │
│  ┌────────────┐                       ┌─────────────┐       │
│  │   Server   │                       │     CLI     │       │
│  │ (QUIC+TLS) │                       │   (Shell)   │       │
│  └─────┬──────┘                       └──────┬──────┘       │
│        │                                     │              │
│        └─────────────┬──────────────────────┘              │
│                      │                                      │
└──────────────────────┼──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   ┌─────────┐   ┌──────────┐   ┌─────────┐
   │   GQL   │   │Execution │   │  Eval   │
   │ Parser  │   │  Engine  │◄──┤ Engine  │
   └────┬────┘   └─────┬────┘   └─────────┘
        │              │
        └──────────────┴──────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   ┌─────────┐   ┌──────────┐   ┌─────────┐
   │ Planner │   │ Storage  │   │Security │
   │   CBO   │   │  Engine  │   │(Audit,  │
   └─────────┘   └─────┬────┘   │ TDE,RLS)│
                       │        └─────────┘
                       ▼
                 ┌──────────┐
                 │   WAL    │
                 │  Index   │
                 │   Txn    │
                 └──────────┘
```

## Core Components

### Query Processing Pipeline

**1. GQL Parser** (`src/gql/`)
- **ISO/IEC 39075:2024 Compliance**: see conformance profile
- Lexer with complete token support
- Recursive descent parser
- AST generation
- **Performance**: Optimized parsing pipeline

**2. Query Planner** (`src/planner/`)
- Cost-based optimization (CBO)
- Statistics-driven index selection
- Join order optimization
- Adaptive query planning
- **IndexOptimizer**: Automatic index selection with logarithmic cost scaling

**3. Execution Engine** (`src/execution/`)
- Pattern matching with backtracking
- Path evaluation (variable-length paths)
- Aggregation and grouping
- Set operations (UNION, INTERSECT, EXCEPT)
- **Performance**: Optimized for graph traversal patterns

**4. Expression Evaluator** (`src/eval.zig`)
- Type promotion and coercion
- Built-in function dispatch
- NULL propagation semantics
- **SIMD Optimization**: Vectorized operations for supported workloads

### Storage Engine

**Page Manager** (`src/storage/`)
- Memory-mapped I/O with page-level caching
- 8KB page size (configurable)
- LRU cache with eviction
- Lock-free read paths where possible

**Write-Ahead Log (WAL)** (`src/wal/`)
- Durability guarantees
- Point-in-time recovery
- Segment-based storage
- Automatic checkpoint management

**Transaction Management** (`src/txn/`)
- MVCC (Multi-Version Concurrency Control)
- Serializable Snapshot Isolation (SSI)
- Phantom read prevention
- 6 isolation levels: Read Uncommitted, Read Committed, Repeatable Read, Snapshot, Serializable, Linearizable

### Index System

**Six Index Types** (`src/index/`):

1. **B-tree** - Range queries, sorting
   - O(log N) operations
   - Bulk loading optimization

2. **Hash** - Exact match lookups
   - O(1) average case
   - Collision handling via chaining

3. **HNSW** (Vector index)
   - Approximate K-NN search
   - O(log N) search complexity
   - 6 distance metrics: L2, cosine, dot product, Manhattan, Hamming, Jaccard

4. **R-tree** (Spatial index)
   - Geographic queries
   - Bounding box search
   - Radius search with Haversine distance

5. **Full-text** (BM25)
   - Tokenization and ranking
   - Stop word removal
   - Stemming support

6. **Patricia Trie** (CIDR index)
   - IP prefix matching
   - Longest Prefix Match (LPM)
   - O(prefix_bits) lookup

### Security Layer

**Authentication & Authorization** (`src/security/`)
- RBAC (Role-Based Access Control)
- ABAC (Attribute-Based Access Control)
- Enhanced RLS (Row-Level Security) with policy evaluation
- MFA support
- Session management

**Data Protection**:
- TDE (Transparent Data Encryption): AES-256-GCM encryption
- Field-Level Encryption (FLE) with searchable encryption
- KMS integration (HashiCorp Vault)
- Audit logging with compliance tracking

**Constraints** (`src/schema/catalog.zig`):
- UNIQUE constraints
- NOT NULL constraints
- NODE KEY constraints (combined uniqueness + existence)
- Catalog persistence across restarts

### Distributed Architecture

**Federation** (`src/distributed/`)
- Multi-shard support (up to 32 shards)
- Cross-shard query coordination
- Load balancing with health checks
- Fault tolerance with automatic failover

**Raft Consensus** (`src/distributed/raft_consensus.zig`)
- Leader election
- Log replication
- Membership changes
- Snapshot management

### Network Layer

**QUIC Transport** (`src/transport/`)
- Modern protocol with multiplexing
- TLS 1.3 mandatory
- Connection migration support
- Low latency transport

**Protocol** (`src/protocol.zig`)
- Protobuf wire protocol
- Message types: `HelloRequest`, `ExecuteRequest`, `PullRequest`, `BeginRequest`, `CommitRequest`, `RollbackRequest`, `PingRequest`
- Response type: `ExecutionResponse` (payloads: `SchemaDefinition`, `DataPage`, `Error`, `ExplainPayload`, `ProfilePayload`)
- Multi-tenancy support with tenant_id in HELLO message

### Advanced Features

**ML Graph Embeddings** (`src/ml/`)
- Node2Vec algorithm
- GraphSAGE implementation
- DeepWalk support
- Integration with HNSW indexes

**Real-time Analytics** (`src/analytics/`)
- Streaming pattern detection
- Anomaly detection with ML
- CDC (Change Data Capture) integration
- Backpressure handling

**Materialized Views** (`src/query/`)
- Three refresh strategies: immediate, deferred, on-demand
- Query rewriting for automatic use
- Dependency tracking
- Incremental refresh support

## File Organization

### Codebase Statistics

- **Total LOC**: 173,048 lines of Zig code
- **Source Files**: 436 files
- **Test Files**: 843 test files
- **Test/Source Ratio**: 1.9:1
- **Modules**: 50 top-level directories

### Module Structure

```
src/
├── server/          # Server implementation
├── cli/             # CLI implementation
├── gql/             # GQL parser
├── execution/       # Query execution
├── eval.zig         # Expression evaluation
├── planner/         # Query planning
├── storage/         # Storage engine
├── security/        # Security features
├── distributed/     # Federation & Raft
├── index/           # Index implementations
├── ml/              # Machine learning
├── analytics/       # Real-time analytics
├── types/           # Advanced data types
└── ...              # 40+ more modules
```

## Architecture Characteristics

### Query Processing

- **Point lookups**: Optimized via hash indexes
- **Path traversal**: Efficient multi-hop pattern matching
- **Vector search**: SIMD-accelerated distance calculations
- **Indexed lookups**: Optimized via B-tree and hash indexes

### Scalability

- **Concurrent connections**: Connection pooling supported
- **Shards**: Up to 32 shards with distributed coordination

## Quality Metrics

### Test Coverage

- **Integration tests**: 97.4% pass rate (1,644/1,688 tests)
- **Unit tests**: 100% pass rate (393/393 tests)
- **GQL conformance profile**: see conformance profile
- **CANARY markers**: 1,735 markers tracking 2,190+ requirements

### Status Breakdown

- **TESTED**: 81.4% - Full test coverage
- **BENCHED**: 6.0% - Performance benchmarks
- **EXEMPT**: 7.7% - Documentation/metadata
- **IMPL**: 5.7% - Implementation without tests

## Design Principles

### Modularity

- Clear module boundaries
- Dependency injection for testability
- Interface-based design
- Zero circular dependencies (resolved)

### Performance

- SIMD vectorization where applicable
- Memory-mapped I/O for storage
- Lock-free algorithms for hot paths
- Adaptive query optimization

### Reliability

- ACID transaction guarantees
- WAL for durability
- Crash recovery
- Comprehensive error handling

### Security

- Security-first design
- Encryption at rest and in transit
- Fine-grained access control
- Comprehensive audit logging

### Compliance

- ISO/IEC 39075:2024 (GQL standard)
- GDPR compliance features
- SOX/HIPAA/PCI-DSS support
- Evidence-based development with CANARY markers

## Deployment Architecture

### Standalone Mode

```
┌─────────────────┐
│  Geode Server   │
│   (QUIC:3141)   │
│                 │
│  ┌───────────┐  │
│  │  Storage  │  │
│  │    WAL    │  │
│  │  Indexes  │  │
│  └───────────┘  │
└─────────────────┘
```

### Distributed Mode

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Geode Shard 1   │  │ Geode Shard 2   │  │ Geode Shard 3   │
│  (QUIC:3141)    │  │  (QUIC:3142)    │  │  (QUIC:3143)    │
│                 │  │                 │  │                 │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │  Storage  │  │  │  │  Storage  │  │  │  │  Storage  │  │
│  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                     │
         └────────────────────┼─────────────────────┘
                              │
                     ┌────────▼────────┐
                     │   Coordinator   │
                     │  (Federation)   │
                     └─────────────────┘
```

## Next Steps

- [Storage Engine Details](/docs/architecture/storage-engine/) - Deep dive into storage
- [Query Optimization](/docs/architecture/query-optimization/) - CBO and index selection
- [Distributed Systems](/docs/architecture/distributed-systems/) - Federation and Raft
- [Security Architecture](/docs/architecture/security-architecture/) - Security features
