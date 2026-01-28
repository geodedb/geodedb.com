---
title: "Overview"
description: "Introduction to Geode graph database with ISO/IEC 39075:2024 GQL compliance and enterprise-ready features"
summary: "Comprehensive overview of Geode, an enterprise-ready graph database implementing the ISO/IEC 39075:2024 Graph Query Language (GQL) standard with production-grade features."
weight: 5
keywords:
  - geode overview
  - graph database
  - GQL
  - ISO 39075
  - introduction
  - getting started
  - enterprise database
tags:
  - overview
  - introduction
  - getting-started
  - features
categories:
  - getting-started
  - overview
toc: true
params:
  seo:
    keywords: "geode graph database, GQL database, ISO 39075, enterprise graph database, property graph database"
    description: "Introduction to Geode, an enterprise-ready graph database with 100% ISO/IEC 39075:2024 GQL compliance and production-grade features"
---

<!-- CANARY: REQ=REQ-GQL-001; FEATURE="BasicQuery"; ASPECT=Testing; STATUS=TESTED; OWNER=test; UPDATED=2025-10-02 -->

# Overview

Geode is an enterprise-ready graph database implementing the ISO/IEC 39075:2024 Graph Query Language (GQL) standard. Designed for production workloads, Geode combines standards compliance, high performance, and comprehensive security features.

## What is Geode?

Geode is a property graph database that stores data as nodes, relationships, and properties. Unlike traditional relational databases optimized for tabular data, Geode excels at representing and querying highly connected data where relationships between entities are as important as the entities themselves.

Built from the ground up in Zig for performance and memory safety, Geode is designed for high-throughput workloads. The modern QUIC+TLS transport ensures secure, low-latency communication with connection migration support.

## Key Features

### Standards Compliance

- **100% GQL Compliance**: All 70 ISO/IEC 39075:2024 conformance tests passing
- **Standards-Based**: No vendor-specific query language extensions required
- **Future-Proof**: Built on internationally recognized standards

### Enterprise Security

- **Transparent Data Encryption (TDE)**: AES-256-GCM encryption at rest
- **Field-Level Encryption (FLE)**: Searchable encryption for sensitive data
- **Row-Level Security (RLS)**: Fine-grained access control with policy evaluation
- **Comprehensive Audit Logging**: Full compliance trail for GDPR, SOX, HIPAA, PCI-DSS
- **MFA Support**: Multi-factor authentication with TOTP
- **KMS Integration**: HashiCorp Vault for key management

### Optimized Architecture

- **Memory-Mapped I/O**: Efficient storage with page-level caching
- **SIMD Optimization**: Vectorized operations for supported workloads
- **Six Index Types**: B-tree, Hash, HNSW, R-tree, Full-text, Patricia Trie

### Advanced Features

- **Distributed Deployment**: Up to 32 shards with Raft consensus
- **Machine Learning**: Node2Vec, GraphSAGE, DeepWalk embeddings
- **Real-time Analytics**: Streaming pattern detection with ML anomaly detection
- **Vector Search**: Approximate K-NN with HNSW indexes
- **Geospatial**: R-tree indexing with Haversine distance
- **Full-Text Search**: BM25 ranking with stemming

### Production Ready

- **97.4% Test Coverage**: 1,644/1,688 tests passing
- **ACID Transactions**: Full transactional guarantees with MVCC
- **6 Isolation Levels**: Read Uncommitted to Linearizable
- **WAL for Durability**: Point-in-time recovery support
- **Evidence-Based Development**: 1,735 CANARY markers tracking 2,190+ requirements

## Topics in This Section

- **[Introduction](/docs/overview/introduction/)** - Detailed introduction to Geode including architecture overview, feature highlights, and comparison with other graph databases

## Why Choose Geode?

### Standards-Based

Geode implements the ISO/IEC 39075:2024 GQL standard, ensuring your queries and data models are portable and future-proof. No vendor lock-in with proprietary query languages.

### Enterprise-Grade Security

From encryption at rest (TDE) to fine-grained access control (RLS), Geode provides the security features enterprises require. Comprehensive audit logging supports compliance with major regulations.

### Optimized for Graph Workloads

Memory-mapped I/O, SIMD optimization, and six specialized index types are designed for efficient graph traversal and query execution.

### Modern Architecture

Built with modern technologies: Zig for performance and safety, QUIC for efficient networking, MVCC for high concurrency, and Raft for distributed consensus.

### Developer Friendly

- **LSP Support**: IDE integration for any editor
- **Interactive REPL**: Powerful shell for query development
- **Client Libraries**: Go, Python, Rust, Node.js, and Zig with idiomatic APIs
- **Comprehensive Documentation**: 40+ guides and references

## Use Cases

Geode excels at use cases requiring complex relationship queries:

### Social Networks

Model users, posts, followers, and interactions. Query friend networks, detect communities, and generate recommendations with natural graph patterns.

**See**: [Social Networks Use Case](/docs/use-cases/social-networks/)

### Fraud Detection

Identify suspicious transaction patterns, detect fraud rings, and analyze behavioral anomalies in financial networks.

**See**: [Fraud Detection Use Case](/docs/use-cases/fraud-detection/)

### Knowledge Graphs

Build enterprise knowledge graphs connecting people, documents, projects, and concepts. Enable semantic search and knowledge discovery.

**See**: [Knowledge Graphs Use Case](/docs/use-cases/knowledge-graphs/)

### Recommendation Engines

Generate personalized recommendations based on user behavior, product relationships, and collaborative filtering patterns.

**See**: [Recommendations Use Case](/docs/use-cases/recommendations/)

### Supply Chain

Track products, suppliers, logistics, and dependencies across complex supply networks. Analyze impact of disruptions and optimize routing.

**See**: [Supply Chain Use Case](/docs/use-cases/supply-chain/)

## Architecture Highlights

### Query Pipeline

```
GQL Parser → Planner (CBO) → Execution Engine → Storage Engine
```

- **Parser**: 100% ISO/IEC 39075:2024 compliant
- **Planner**: Cost-based optimization with statistics
- **Execution**: Optimized for graph traversal patterns
- **Storage**: Memory-mapped I/O with WAL

### Storage Engine

- **Page Manager**: 8KB pages with LRU cache
- **WAL**: Segment-based with checkpointing
- **Indexes**: Six types for different access patterns
- **MVCC**: Serializable Snapshot Isolation

### Network Layer

- **QUIC Transport**: Modern protocol with multiplexing
- **TLS 1.3**: Mandatory encryption
- **JSON Line Protocol**: Simple, extensible wire format
- **Connection Migration**: Support for mobile clients

See [Architecture](/docs/architecture/) for complete details.

## Quality Metrics

### Test Coverage

- **97.4% Integration Test Pass Rate**: 1,644/1,688 tests
- **100% Unit Test Pass Rate**: 393/393 tests
- **100% GQL Compliance**: 70/70 ISO tests
- **1,735 CANARY Markers**: Tracking 2,190+ requirements

### Status Breakdown

- **81.4% TESTED**: Full test coverage with evidence
- **6.0% BENCHED**: Performance benchmarks
- **7.7% EXEMPT**: Documentation and metadata
- **5.7% IMPL**: Implementation without tests

## Quick Start

Get started with Geode in minutes:

```bash
# Install (choose one method)
# Linux binary (example)
curl -L -o geode-linux-amd64 https://gitlab.com/devnw/codepros/geode/geode/-/releases/latest/download/geode-linux-amd64
sudo install -m 0755 geode-linux-amd64 /usr/local/bin/geode

# Docker
docker pull geodedb/geode:latest

# From source
git clone https://github.com/codeprosorg/geode
cd geode
make build

# Start server
geode serve --listen 0.0.0.0:3141

# Connect with shell
geode shell

# Run first query
RETURN 1 AS x;
```

See [Installation Guide](/docs/get-started/) for detailed instructions.

## Community and Support

### Documentation

- **[GQL Guide](/docs/gql/guide/)**: Complete query language reference
- **[Architecture](/docs/architecture/)**: System design and internals
- **[API Reference](/docs/reference/api-reference-complete/)**: Complete API documentation
- **[Tutorials](/docs/tutorials/)**: Hands-on learning resources

### Contributing

Geode is open source and welcomes contributions. See [Contributing Guide](/docs/contribute/) for how to get involved.

### License

Geode is licensed under the Apache License 2.0.

## Learn More

- **[Introduction](/docs/overview/introduction/)** - Detailed introduction and feature overview
- **[Installation Guide](/docs/get-started/)** - Get Geode running
- **[GQL Guide](/docs/gql/guide/)** - Learn the query language
- **[Data Model](/docs/model/data-model-and-types/)** - Understand property graphs
- **[Use Cases](/docs/use-cases/)** - Real-world applications

## Next Steps

1. **[Install Geode](/docs/get-started/)** - Get the database running
2. **[Learn GQL](/docs/gql/guide/)** - Master the query language
3. **[Explore Tutorials](/docs/tutorials/)** - Hands-on learning
4. **[Build Applications](/docs/client-libraries/)** - Connect from your code
5. **[Deploy to Production](/docs/ops/deployment/)** - Go live
