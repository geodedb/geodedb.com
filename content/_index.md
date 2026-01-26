+++
title = "Geode - Enterprise Graph Database"
description = "Production-ready graph database implementing ISO/IEC 39075:2024 GQL standard"
keywords = [
  "Geode",
  "graph database",
  "GQL",
  "ISO 39075",
  "vector search",
  "full-text search",
  "graph analytics",
]
+++

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

## 100% ISO GQL Compliance

Geode achieves **100% compliance** with ISO/IEC 39075:2024 GQL standard:
- All 70 official conformance tests passing
- Complete pattern matching syntax
- Full aggregation support
- Set operations (UNION, INTERSECT, EXCEPT)

## Enterprise-Grade Security

- **Authentication**: RBAC/ABAC with MFA support
- **Encryption**: TDE with <1% overhead, FLE with searchable encryption
- **Audit**: Comprehensive compliance tracking
- **RLS**: Enhanced row-level security with policy evaluation

## High Performance

- **Query Performance**: 10,000-50,000 read-write transactions/sec
- **Vector Search**: <50ns per distance calculation (8D L2)
- **Storage**: 13.18x I/O improvement
- **Scalability Targets**: 100M+ nodes, 1B+ edges in load-test models

## Client Libraries

Geode provides official client libraries for multiple programming languages:

- [**Go**](/clients/go/) - `database/sql` driver with full prepared statement support
- [**Python**](/clients/python/) - Async client with connection pooling
- [**Rust**](/clients/rust/) - High-performance tokio-based client
- [**Zig**](/clients/zig/) - Native Zig implementation

All clients communicate via QUIC+TLS using the JSON line protocol.

## Getting Started

```bash
# Install via Nix
nix run github:codeprosorg/geode -- serve

# Or build from source
git clone https://github.com/codeprosorg/geode
cd geode
make build
./zig-out/bin/geode serve
```

See the [Getting Started Guide](/docs/getting-started/) for full installation instructions.

## Documentation

- [**Installation**](/docs/installation/) - Install and configure Geode
- [**GQL Tutorial**](/docs/gql-tutorial/) - Learn the query language
- [**Architecture**](/docs/architecture/) - System design and internals
- [**API Reference**](/docs/api-reference/) - Complete API documentation

## Editor Support

- [**Neovim**](/plugins/neovim/) - Full LSP integration
- [**Vim**](/plugins/vim/) - Syntax highlighting
- [**VSCode**](/plugins/vscode/) - Complete IDE support
- [**Claude Code**](/plugins/claude/) - AI-assisted development
