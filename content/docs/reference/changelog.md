---
title: "Changelog"
description: "Complete version history and release notes for Geode graph database with breaking changes, new features, and migration guides"
url: /docs/reference/changelog/
keywords: ["changelog", "release notes", "version history", "updates", "migration", "breaking changes", "new features", "bug fixes", "deprecations"]
weight: 60
slug: "changelog"
canonical: "https://geodedb.com/docs/reference/changelog/"
---

<!-- CANARY: REQ=REQ-API-DOCS-002; FEATURE="APIDocumentation"; ASPECT=BuildTarget; STATUS=EXEMPT; OWNER=tooling; UPDATED=2026-01-03 -->

# Changelog

Complete version history and release notes for Geode graph database.

## Current Status (January 2026)

**Version**: v0.1.3+ (Production Ready)

Geode has achieved **production-ready status** with comprehensive compliance and testing:

- ✅ **97.4% Test Coverage** (1644/1688 tests passing)
- ✅ **100% GQL Compliance** (70/70 ISO/IEC 39075:2024 official tests)
- ✅ **1,735 CANARY Markers** tracking 2,190+ requirements (81.4% tested)
- ✅ **Enterprise Features** complete (TDE, audit, vector search, cloud backup, enhanced RLS)
- ✅ **All Development Phases** complete (Phases 2-7)

## Version History

### [v0.1.3] - Production Ready Release (January 2026)

**Status**: Production Ready - All major features complete

This release marks Geode's transition to production-ready status with comprehensive enterprise features and 100% GQL compliance.

#### All Major Features Completed (October-December 2025)

**Enterprise & Security**:
- Enhanced Row-Level Security (RLS) with policy evaluation and optimization
- Advanced user authentication (RBAC/ABAC with MFA support)
- KMS provider system for enterprise key management
- Audit logging with JSON format and rotation
- Transparent Data Encryption (TDE) with AES-256-GCM

**Advanced Query & Optimization**:
- Cost-based query optimizer with statistics integration
- Distributed query coordination with federation-aware optimization
- Materialized views with 3 refresh strategies (immediate, deferred, manual)
- Query rewriting for automatic materialized view usage
- IndexOptimizer with logarithmic cost scaling

**Machine Learning & Analytics**:
- ML graph embeddings (Node2Vec, GraphSAGE, DeepWalk)
- Real-time analytics with streaming pattern detection
- Anomaly detection and trend analysis
- Time-series integration with in-memory optimization
- Vector operations with HNSW indexing and 6 distance metrics

**Storage & Performance**:
- S3 cloud backup with Digital Ocean Spaces integration
- Memory-mapped operations for efficient I/O
- Enhanced transaction isolation (SSI, phantom read prevention)
- WAL replay for incremental backup recovery
- Page cache optimization for read-heavy workloads

**Architecture & Infrastructure**:
- Unified CLI architecture (eliminated subprocess spawning)
- REPL QUIC integration with real-time interactive shell
- Complete ISO/IEC 39075:2024 compliance (70/70 tests)
- SIMD acceleration for vector operations
- Support for up to 65,535 vector dimensions

#### Completed Development Phases

All 7 TODO.md phases completed (~13,554+ lines of production code):

1. **Phase 2: Parser Extensions** - Map literals, deep nesting (8+ levels)
2. **Phase 3: Set Operations** - UNION/INTERSECT/EXCEPT (22/22 tests passing)
3. **Phase 4: Transaction Isolation** - Phantom read prevention, SSI, 6 isolation levels
4. **Phase 5: Distributed Coordination** - 10,451 lines of distributed systems code
5. **Phase 6: Materialized Views** - 3 refresh strategies with dependency tracking
6. **Phase 7: Graph Algorithms** - 20-90% performance improvements

#### Breaking Changes

**CLI Architecture**:
- **REMOVED**: `geodec` and `geoded` binaries (unified into single `geode` binary)
- **MIGRATION**: Replace all `geodec`/`geoded` calls with `geode` subcommands
  ```bash
  # Old
  geodec query "MATCH (n) RETURN n"

  # New
  geode query "MATCH (n) RETURN n"
  ```

**Server-Only Mode**:
- All CLI operations now require connection to QUIC server
- No standalone execution mode
- **MIGRATION**: Ensure `geode serve` is running before CLI commands

**Test Infrastructure**:
- Removed mock data and simulations from test harness
- All tests now execute against real server implementation
- **IMPACT**: Test execution requires running server instance

#### New Features

**Query Language**:
- Map literal syntax: `{key: value, nested: {a: 1}}`
- Deep nesting support (8+ levels validated)
- Reserved keywords as parameter names (`$count`, `$name`, etc.)
- `IF NOT EXISTS` support in parameter clauses
- Time-series value access: `timeseries.value()` GQL function

**Data Types**:
- VectorF32: Single-precision floating-point vectors with SIMD
- VectorI32: Integer vectors for discrete data
- Network types: IPv4/IPv6, CIDR, MAC (<1μs parsing)
- Geographic types: Point, LineString, Polygon with R-tree indexing
- Cryptographic types: Hash, digital signatures, encryption keys
- Temporal types: DateTime with timezone, intervals, duration arithmetic

**Indexing**:
- HNSW index for vector similarity search
- R-tree spatial index for geographic queries
- BM25 full-text search index
- Bloom filter index for membership testing
- Composite indexes with multi-column support
- Automatic index selection via cost-based optimizer

**Backup & Recovery**:
- Full and incremental backup modes
- S3-compatible cloud storage support
- AES-256-GCM encryption for backup files
- Point-in-time recovery (PITR)
- Automated backup scheduling with cron
- WAL replay for incremental recovery

**Monitoring & Observability**:
- Prometheus metrics endpoint (port 9090)
- Health check endpoints (/health, /ready, /live)
- Structured JSON logging
- Component-specific log levels
- Audit log rotation and compression
- Query performance profiling

#### Architecture Improvements

- **I/O**: Memory-mapped operations for efficient storage access
- **Vector Distance**: SIMD-accelerated distance calculations
- **Graph Algorithms**: Optimized implementations across major algorithms
- **Index Lookups**: Logarithmic scaling with cost-based selection
- **Cache Hit Rate**: Optimized page cache for read-heavy workloads
- **Connection Pooling**: Workload-dependent throughput

#### Bug Fixes

- Fixed stdin handling in test runner (critical issue resolved October 2025)
- Fixed multi-statement execution in CLI (session management workflows)
- Fixed backup compression to use real ZStandard (not shim implementation)
- Fixed graph centrality unused headers (deferred advanced metrics to future release)
- Fixed reserved keyword handling as parameter names
- Fixed `IF NOT EXISTS` clause support in various contexts

#### Security

**Encryption**:
- TDE for data at rest with AES-256-GCM
- TLS 1.3 for all network connections
- Backup encryption with `GEODE_TDE_KEY` support
- Key rotation support via KMS providers

**Authentication & Authorization**:
- Multi-factor authentication (TOTP)
- Certificate-based authentication (mTLS)
- Password policies (length, complexity, expiration)
- Enhanced RLS with policy expression compilation
- RBAC/ABAC with fine-grained permissions

#### Deprecations

None. This is a major release with no deprecations.

#### Migration Guide

**From Pre-v0.1.3 Versions**:

1. **Update CLI Usage**:
   ```bash
   # Replace geodec/geoded with unified geode binary
   which geodec && echo "Remove geodec from PATH"
   which geoded && echo "Remove geoded from PATH"

   # Use new unified binary
   ./zig-out/bin/geode --version
   ```

2. **Start Server First**:
   ```bash
   # All CLI operations require server
   geode serve --listen 0.0.0.0:3141

   # Then in another terminal
   geode shell
   geode query "RETURN 1"
   ```

3. **Update Backup Scripts**:
   ```bash
   # Old (may have used shim compression)
   geode backup --dest /backups/

   # New (real ZStandard compression)
   geode backup --dest s3://bucket/prefix --compression gzip
   ```

4. **Enable TDE for Backups**:
   ```bash
   # Set encryption key
   export GEODE_TDE_KEY='your-256-bit-hex-key'

   # Backups now automatically encrypted
   geode backup --dest s3://bucket/
   ```

5. **Update Configuration Files**:
   ```yaml
   # Add new security settings
   security:
     enable_tde: true
     enable_audit: true
     auth:
       enabled: true
       mfa:
         enabled: true
   ```

---

### [v0.1.2] - Grey Cardinal Compliance (October 2025)

**Focus**: Gap closure and compliance improvements

#### Added

- **Backup Encryption**: Implemented AES-256-GCM encryption for backup files (GAP-005)
  - Requires `GEODE_TDE_KEY` environment variable
  - Automatic encryption/decryption on backup/restore

- **Time-Series Integration**: Added `timeseries.value()` GQL function (GAP-004)
  - Access in-memory time-series data directly from queries
  - Optimized for high-frequency data access

- **WAL Replay**: Implemented WAL replay logic for incremental backup recovery (GAP-002)
  - Point-in-time recovery support
  - Automatic consistency validation

- **Benchmarks**: Added time-series benchmarks (`src/benchmarks/bench_timeseries.zig`) (GAP-006)
  - Performance regression testing
  - Automated benchmark execution

#### Fixed

- **Backup Compression**: Fixed shim implementation to use real ZStandard compression (GAP-001)
  - Replaced placeholder with actual zstd library integration
  - Improved compression ratios (typically 60-70%)

- **Graph Centrality**: Cleaned up unused headers (GAP-003)
  - Deferred advanced centrality metrics to v0.18
  - Improved compilation times

#### Security

- **TDE**: Transparent Data Encryption for backups
  - AES-256-GCM with authenticated encryption
  - Compatible with all backup destinations

#### Optimizations

- Backup compression with zstd
- Time-series queries with in-memory optimization
- WAL replay for efficient incremental recovery

---

## Version Support

### Supported Versions

| Version | Status | Support End | GQL Compliance | Test Coverage |
|---------|--------|-------------|----------------|---------------|
| v0.1.x | Production Ready | Active | 100% (70/70) | 97.4% |
| v0.1.x | Maintenance | June 2026 | 100% (70/70) | 95%+ |

### Upgrade Policy

- **Major versions** (e.g., v0.x to v1.x): May contain breaking changes
- **Minor versions** (e.g., v0.17 to v0.18): Backward compatible with migration guides
- **Patch versions** (e.g., v0.1.3 to v0.1.3): Backward compatible, drop-in replacements

## Release Schedule

Geode follows semantic versioning (SemVer):

- **Major releases**: Breaking changes, major new features
- **Minor releases**: New features, performance improvements, no breaking changes
- **Patch releases**: Bug fixes, security updates, no new features

Typical release cadence:
- **Minor releases**: Every 2-3 months
- **Patch releases**: As needed for critical fixes
- **Security updates**: Within 48 hours of vulnerability disclosure

## Staying Updated

### Subscribe to Updates

- **GitHub Releases**: Watch the repository for release notifications
- **Mailing List**: Subscribe to geode-announce@codepros.org
- **RSS Feed**: https://geodedb.com/docs/changelog/feed.xml
- **Changelog RSS**: /docs/releases/index.xml

### Testing Pre-Release Versions

```bash
# Download pre-release builds
git clone https://github.com/codeprosorg/geode
cd geode
git checkout develop

# Build from source
make build

# Run comprehensive tests
make geodetestlab-comprehensive
```

## Breaking Changes Summary

### v0.1.3 Breaking Changes

**CLI Architecture**:
- Removed `geodec` and `geoded` binaries
- All operations require running server

**Migration Required**: Yes
**Estimated Migration Time**: 15-30 minutes
**Backwards Compatibility**: None (clean break from v0.1.x architecture)

## Feature Timeline

### January 2026 (v0.1.3+)
- ✅ Production-ready status achieved
- ✅ 97.4% test coverage (1644/1688 tests)
- ✅ All 7 development phases complete
- ✅ Enterprise features complete

### October-December 2025 (v0.1.3 development)
- Enhanced RLS with policy optimization
- ML graph embeddings (Node2Vec, GraphSAGE, DeepWalk)
- Real-time analytics with streaming detection
- Unified CLI architecture
- REPL QUIC integration

### October 2025 (v0.1.2)
- Backup encryption (AES-256-GCM)
- Time-series integration
- WAL replay logic
- Real ZStandard compression

## Documentation Updates

Each release includes documentation updates in:

- **API Reference**: New functions and operators
- **Configuration Guide**: New settings and options
- **Migration Guides**: Upgrade instructions and breaking changes
- **Examples**: Updated code samples for new features
- **Performance Tuning**: New optimization recommendations

## Known Issues

See [Known Test Issues](/docs/guides/troubleshooting/#known-issues) for current test failures and workarounds.

**Current**: 44 test failures out of 1688 total (97.4% pass rate)

Most failures are non-critical edge cases or known limitations documented in issue tracker.

## Next Steps

- **Getting Started**: [Installation Guide](/docs/get-started/)
- **Configuration**: [Server Configuration](/docs/configuration/server-configuration/)
- **Migration**: [Upgrade Guide](/docs/guides/migration-guide/)
- **API Changes**: [API Reference](/docs/api-reference/)
- **Performance**: [Performance Tuning](/docs/performance/)

## Version Archive

Full version history available at:
- **GitHub Tags**: https://github.com/codeprosorg/geode/tags
- **GitHub Releases**: https://github.com/codeprosorg/geode/releases
- **Documentation Archive**: https://geodedb.com/docs/archive/

## Feedback

Report issues or request features:
- **Issue Tracker**: https://gitlab.com/devnw/codepros/geode/-/issues
- **Discussions**: https://gitlab.com/devnw/codepros/geode/-/issues
- **Email**: support@codepros.org

---

**License**: Apache License 2.0
**Copyright**: 2024-2025 CodePros
**Last Updated**: January 2026
