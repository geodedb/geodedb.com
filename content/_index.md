---
title: "Geode - Enterprise Graph Database"
description: "Production-ready graph database implementing ISO/IEC 39075:2024 GQL standard with 97.4% test coverage and enterprise features."
---

# Welcome to Geode

Geode is an **enterprise-ready graph database** implementing the **ISO/IEC 39075:2024 Graph Query Language (GQL)** standard. Built in Zig for performance and reliability.

## Key Features

- **100% ISO GQL Compliance** - 70/70 official test suite passing
- **97.4% Test Coverage** - 1,644/1,688 tests passing
- **Enterprise Features** - ACID transactions, encryption, audit logging
- **Vector Search** - HNSW indexing with 6 distance metrics
- **ML Embeddings** - Node2Vec, GraphSAGE, DeepWalk
- **Real-time Analytics** - Streaming pattern detection
- **Production Ready** - v0.18.0+ with comprehensive testing

## Quick Start

```bash
# Install with Nix (recommended)
nix run github:codeprosorg/geode

# Or download binary
wget https://github.com/codeprosorg/geode/releases/latest/download/geode-linux-amd64
chmod +x geode-linux-amd64
./geode-linux-amd64 serve
```

## Client Libraries

Geode provides official client libraries for multiple languages:

- [**Go**](/clients/go/) - `database/sql` driver with connection pooling
- [**Python**](/clients/python/) - Async client with aioquic
- [**Rust**](/clients/rust/) - High-performance tokio-based client
- [**Zig**](/clients/zig/) - Native Zig implementation

## Editor Integration

- [**Neovim**](/plugins/neovim/) - LSP, syntax highlighting, query execution
- [**Vim**](/plugins/vim/) - Syntax highlighting and basic integration
- [**VSCode**](/plugins/vscode/) - Full IDE support
- [**Claude Code**](/plugins/claude/) - AI-assisted development

## Documentation

- [Getting Started](/docs/getting-started/) - Your first steps with Geode
- [Installation Guide](/docs/installation/) - Detailed installation instructions
- [API Reference](/docs/api-reference/) - Complete API documentation
- [Architecture](/docs/architecture/) - System design and internals

## Performance

- **Query Latency**: <1ms for indexed operations
- **Throughput**: 10,000+ queries/second with connection pooling
- **Storage**: 13.18x I/O improvement with memory-mapped operations
- **Security**: <2% overhead for encryption and audit logging

## License

Apache License 2.0 - Copyright 2024-2025 CodePros

## Community

- [GitLab Repository](https://gitlab.com/devnw/codepros/geode)
- [GitHub Mirror](https://github.com/codeprosorg)
- [Issue Tracker](https://gitlab.com/devnw/codepros/geode/issues)
