---
title: "Category: Releases and Changelog"
description: "Geode release notes, changelogs, version history, upgrade guides, breaking changes, and deprecation notices for all versions."
keywords:
  - releases
  - changelog
  - version history
  - upgrade guide
  - breaking changes
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/releases/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

The **Releases and Changelog** category documents the evolution of Geode across all versions, including release notes, new features, bug fixes, breaking changes, and upgrade guidance. Stay informed about the latest improvements and plan your upgrade strategy effectively.

## Current Stable Release

**Geode v0.18.0** (January 2026) - Production Ready

This is the current stable release with 100% ISO/IEC 39075:2024 GQL compliance, 97.4% test coverage (1644/1688 tests passing), and comprehensive enterprise features. Version 0.18.0 represents production-ready status with proven reliability, performance, and security.

**Status**: Recommended for production deployments

**Key Highlights**:
- Full ISO GQL standard compliance (70/70 tests passing)
- ACID transactions with Serializable Snapshot Isolation
- 1,735 CANARY governance markers tracking 2,190+ requirements
- Enterprise security features (TDE, FLE, RLS, audit logging)
- Advanced analytics (vector search, full-text search, graph algorithms)
- Polyglot client libraries (Go, Python, Rust, Zig)

## Version History

### v0.18.0 - Production Ready (January 2026)

**Major Features**:
- 100% ISO/IEC 39075:2024 GQL compliance achieved
- Full ACID transaction support with SSI isolation
- QUIC transport protocol with TLS 1.3 mandatory encryption
- Vector search with HNSW indexing for embeddings
- Full-text search with BM25 ranking and Unicode normalization
- Row-Level Security (RLS) with policy-based access control
- Transparent Data Encryption (TDE) for data at rest
- Field-Level Encryption (FLE) with application-managed keys
- Comprehensive audit logging for compliance
- Production-ready client libraries for Go, Python, Rust, and Zig

**Performance Improvements**:
- Query optimizer with cost-based planning
- Advanced index types (B-tree, HNSW, full-text)
- Connection pooling in all client libraries
- Prepared statement caching
- MVCC for high-concurrency workloads
- Transaction throughput baselines: read-only up to 100,000 txn/sec; read-write 10,000-50,000 txn/sec; write-heavy 5,000-20,000 txn/sec

**Developer Experience**:
- Interactive GQL shell with syntax highlighting
- EXPLAIN and PROFILE commands for query analysis
- Comprehensive error messages with ISO status codes
- Detailed documentation with 40+ technical guides
- IDE plugins for VSCode, Vim, Neovim, and Claude

**Testing and Quality**:
- 97.4% test coverage (1644/1688 tests passing)
- Cross-client test harness validating all implementations
- Evidence-based development with CANARY markers
- Extensive integration testing
- Production-validated reliability

**Known Issues**:
- Minor edge cases in 44 tests under active development
- Performance optimization ongoing for very large graphs (>100M nodes)
- Distributed mode in experimental phase

**Upgrade Notes**:
- First production-ready release
- No breaking changes from v0.17.x
- Recommended to upgrade all client libraries to latest versions

### v0.17.0 - Pre-Production (December 2025)

**Major Features**:
- Near-complete GQL compliance (68/70 tests passing)
- Transaction savepoint support
- Advanced pattern matching optimizations
- Query plan caching
- Metrics export to Prometheus

**Breaking Changes**:
- Changed default port from 8443 to 3141
- Updated client protocol version (requires client library updates)
- Modified configuration file format (see migration guide)

**Deprecations**:
- Legacy TCP transport (use QUIC instead)
- `--experimental-features` flag (all features now stable)

**Bug Fixes**:
- Fixed memory leak in long-running transactions
- Corrected edge case in variable-length path matching
- Improved error messages for constraint violations
- Resolved race condition in concurrent index updates

**Upgrade Notes**:
- Update client libraries to v0.17.0+
- Migrate configuration files to new YAML format
- Update firewall rules for port 3141
- Test queries using variable-length paths (behavior refined)

### v0.16.0 - Beta (November 2025)

**Major Features**:
- Initial vector search implementation
- Full-text search with BM25
- Row-Level Security policies
- Transparent Data Encryption
- Field-Level Encryption

**Performance Improvements**:
- 3x faster query execution for graph traversals
- 50% reduction in memory usage for large result sets
- Improved index selectivity estimation

**Breaking Changes**:
- Removed deprecated `CYPHER` compatibility mode
- Changed transaction isolation default to SERIALIZABLE
- Updated authentication protocol

**Upgrade Notes**:
- Backup databases before upgrading
- Review application code for removed compatibility features
- Update authentication credentials if using custom auth

### v0.15.0 - Alpha (October 2025)

**Major Features**:
- Initial GQL implementation
- ACID transactions with MVCC
- QUIC transport protocol
- Basic indexing support
- Go and Python client libraries

**Breaking Changes**:
- Complete rewrite from previous versions
- New query language (GQL replaces proprietary syntax)
- New wire protocol (QUIC replaces TCP)

**Upgrade Notes**:
- Cannot upgrade from v0.14.x or earlier
- Fresh installation required
- Migrate data using export/import tools

## Versioning Policy

Geode follows **Semantic Versioning** (SemVer):

**Major version** (x.0.0): Breaking changes, major architectural changes, or significant feature additions that may require application updates.

**Minor version** (0.x.0): New features, enhancements, and improvements that maintain backward compatibility with the same major version.

**Patch version** (0.0.x): Bug fixes, security patches, and performance improvements that don't add new features or break compatibility.

**Pre-release identifiers**: Alpha, beta, and release candidate builds use suffixes like `-alpha.1`, `-beta.2`, `-rc.1`.

## Release Schedule

Geode maintains a predictable release cadence:

- **Major releases**: As needed for significant changes (typically annually)
- **Minor releases**: Quarterly (every 3 months)
- **Patch releases**: As needed for critical bugs and security issues
- **Security patches**: Expedited releases within 48 hours for critical vulnerabilities

## Breaking Changes Policy

Breaking changes are minimized and clearly documented:

1. **Advance notice**: Breaking changes announced at least one minor version in advance
2. **Deprecation warnings**: Features marked deprecated before removal
3. **Migration guides**: Detailed upgrade instructions provided
4. **Backward compatibility**: Maintained within major versions when possible
5. **Upgrade tooling**: Automated migration tools for data and configuration

## Deprecation Process

Features follow a structured deprecation process:

1. **Announcement**: Feature marked as deprecated with timeline for removal
2. **Warning period**: Deprecation warnings emitted during usage (minimum one minor version)
3. **Alternative provided**: Replacement functionality available before deprecation
4. **Documentation updated**: Migration guides published
5. **Removal**: Feature removed in next major version

## Long-Term Support (LTS)

**Current LTS**: v0.18.x (January 2026 - January 2028)

LTS releases receive:
- **Security patches**: Critical vulnerabilities backported
- **Bug fixes**: Major bugs fixed and backported
- **Support duration**: 24 months from release
- **No new features**: Focus on stability and reliability

## Upgrade Guides

### Upgrading from v0.17.x to v0.18.x

**Prerequisites**:
- Zig 0.15.1 or later for building from source
- Client library updates to v0.18.0+
- Review breaking changes list

**Steps**:

```bash
# 1. Backup existing data
./geode backup --output /backup/geode-backup-$(date +%Y%m%d).tar.gz

# 2. Stop server gracefully
./geode shutdown --graceful

# 3. Build or install new version
git pull
make build

# 4. Update configuration (if needed)
# Review geode.yaml for new options

# 5. Start new version
./zig-out/bin/geode serve

# 6. Verify version
./geode version

# 7. Test connectivity
./geode shell -c "MATCH (n) RETURN count(n) LIMIT 1"

# 8. Update client applications
# Update dependencies in go.mod, requirements.txt, Cargo.toml, etc.
```

**Testing**:
- Run smoke tests against production data copy
- Verify query performance hasn't regressed
- Test client library compatibility
- Validate security configuration

**Rollback**:
If issues arise, rollback to previous version:

```bash
# Stop server
./geode shutdown

# Restore backup
./geode restore --input /backup/geode-backup-20250115.tar.gz

# Start previous version
./zig-out/bin/geode-v0.17.0 serve
```

### Migration from Other Graph Databases

Guides available for migrating from:
- Neo4j (Cypher to GQL migration)
- Amazon Neptune
- Azure Cosmos DB (Gremlin to GQL)
- JanusGraph
- ArangoDB

See dedicated migration guides for step-by-step instructions.

## Release Artifacts

Each release provides:

**Source Code**:
- GitLab repository tags
- Source tarball

**Binaries**:
- Linux (x86_64, ARM64)
- macOS (x86_64, ARM64)
- Windows (x86_64)

**Container Images**:
- Docker Hub: `codepros/geode:v0.18.0`
- Alpine-based minimal image
- Debian-based full image

**Client Libraries**:
- Go module: `go.codepros.org/geode@v0.18.0`
- Python package: `pip install geode-client==0.18.0`
- Rust crate: `geode-client = "0.18.0"`
- Zig package

**Documentation**:
- Online documentation at geodedb.com
- PDF reference manual
- Man pages

**Checksums and Signatures**:
- SHA256 checksums for all artifacts
- GPG signatures for verification

## Security Advisories

Security issues are disclosed through:
- GitLab security advisories
- Mailing list notifications
- Documentation website announcements

**Reporting vulnerabilities**: security@codepros.org

**Response timeline**:
- Acknowledgment within 24 hours
- Initial assessment within 48 hours
- Patch release for critical issues within 7 days

## Roadmap

Upcoming features planned for future releases:

**v0.19.0 (Q2 2026)**:
- Distributed graph storage and query execution
- Horizontal scaling with automatic sharding
- Read replicas for load distribution
- Improved query optimizer with machine learning

**v0.20.0 (Q3 2026)**:
- Native graph algorithms library
- Geospatial indexing and queries
- Time-series graph optimizations
- Enhanced monitoring and observability

**v1.0.0 (Q4 2026)**:
- Stability milestone
- Long-term API compatibility guarantee
- Enterprise certification
- Extended LTS support

## Related Topics

- [Changelog](/tags/changelog/) - Detailed change listings
- [Upgrade Guides](/docs/operations/upgrades/) - Version-specific migration instructions
- [Breaking Changes](/docs/releases/breaking-changes/) - Compatibility information
- [Deprecations](/docs/releases/deprecations/) - Features being phased out
- [Versioning](/tags/versions/) - Version numbering scheme

## Detailed Version Comparison

### Feature Matrix Across Versions

| Feature | v0.15.0 | v0.16.0 | v0.17.0 | v0.18.0 |
|---------|---------|---------|---------|---------|
| GQL Compliance | 45% | 68% | 97% | 100% |
| Vector Search | - | Beta | Stable | Stable |
| Full-Text Search | - | Beta | Stable | Stable |
| Row-Level Security | - | Alpha | Beta | Stable |
| CDC Streams | - | - | Beta | Stable |
| Distributed Mode | - | - | - | Experimental |
| ACID Transactions | ✓ | ✓ | ✓ | ✓ |
| MVCC | ✓ | ✓ | ✓ | ✓ |
| QUIC Transport | ✓ | ✓ | ✓ | ✓ |
| TLS 1.3 | ✓ | ✓ | ✓ | ✓ |

### Performance Improvements Timeline

**v0.18.0 Performance Gains** (compared to v0.17.0):
- Pattern matching: 25% faster
- Index scans: 40% faster
- Aggregations: 30% faster
- Transaction commits: 15% faster
- Memory usage: 20% reduction

**v0.17.0 Performance Gains** (compared to v0.16.0):
- Graph traversals: 50% faster
- Query planning: 35% faster
- Concurrent queries: 2x throughput

**v0.16.0 Performance Gains** (compared to v0.15.0):
- Pattern matching: 3x faster
- Memory footprint: 50% smaller
- Index creation: 4x faster

## Migration Strategies

### Zero-Downtime Upgrade Pattern

```bash
#!/bin/bash
# Blue-Green deployment for zero-downtime upgrade

# Deploy new version alongside old
docker run -d --name geode-green codepros/geode:v0.18.0

# Replicate data from blue to green
geode replicate --source geode-blue:3141 --target geode-green:3141

# Verify green instance
geode verify --host geode-green:3141

# Switch load balancer to green
kubectl set image deployment/geode geode=codepros/geode:v0.18.0

# Monitor for issues
kubectl rollout status deployment/geode

# If successful, remove blue
docker stop geode-blue
docker rm geode-blue
```

### Data Migration Scripts

```python
async def migrate_v017_to_v018():
    """Migrate data from v0.17.0 to v0.18.0."""
    # Connect to old and new instances
    old_client = await geode_client.connect("old-server:3141")
    new_client = await geode_client.connect("new-server:3141")

    try:
        # Export from old version
        export_result = await old_client.execute("""
            MATCH (n)
            OPTIONAL MATCH (n)-[r]->(m)
            RETURN n, r, m
        """)

        # Import to new version
        async for row in export_result:
            # Transform data if needed for new schema
            node_data = transform_node(row['n'])
            await new_client.execute("""
                CREATE (n) SET n = $props
            """, {"props": node_data})

            if row['r']:
                rel_data = transform_relationship(row['r'])
                await new_client.execute("""
                    MATCH (n {id: $from}), (m {id: $to})
                    CREATE (n)-[r:TYPE]->(m)
                    SET r = $props
                """, {
                    "from": row['n']['id'],
                    "to": row['m']['id'],
                    "props": rel_data
                })

    finally:
        await old_client.close()
        await new_client.close()
```

### Client Library Compatibility

| Server Version | Go Client | Python Client | Rust Client | Zig Client |
|----------------|-----------|---------------|-------------|------------|
| v0.18.0 | v0.18.x | v0.18.x | v0.18.x | v0.18.x |
| v0.17.0 | v0.17.x-v0.18.x | v0.17.x-v0.18.x | v0.17.x | v0.17.x |
| v0.16.0 | v0.16.x | v0.16.x | v0.16.x | - |

## Known Issues and Workarounds

### v0.18.0 Known Issues

**Issue #1**: Performance degradation with >100M nodes in distributed mode
- **Workaround**: Use sharding key optimization
- **Fix planned**: v0.19.0
- **Severity**: Medium

**Issue #2**: Vector index creation slow for high dimensions (>512)
- **Workaround**: Use lower dimensions or batch index creation
- **Fix planned**: v0.18.1
- **Severity**: Low

**Issue #3**: CDC stream lag under high write load
- **Workaround**: Increase WAL buffer size
- **Fix planned**: v0.18.1
- **Severity**: Medium

## Version Support Status

| Version | Release Date | End of Support | Status |
|---------|--------------|----------------|---------|
| v0.18.x | Jan 2026 | Jan 2028 | LTS (Current) |
| v0.17.x | Dec 2025 | Jun 2026 | Maintenance |
| v0.16.x | Nov 2025 | Mar 2026 | Security Only |
| v0.15.x | Oct 2025 | Jan 2026 | EOL Soon |
| v0.14.x and earlier | - | - | EOL |

## Further Reading

- [Installation Guide](/docs/installation/) - Installing specific versions
- [Deployment](/docs/deployment/) - Production deployment strategies
- [Backup and Restore](/docs/operations/backup/) - Data protection
- [Migration Guide](/docs/operations/migration/) - Moving from other databases
- [Support Policy](/docs/releases/support-policy/) - Support timelines and commitments
- [Migration Tools](/docs/tools/migration/) - Automated migration utilities
- [Beta Program](/docs/community/beta-testing/) - Early access program
- [Release Calendar](/docs/releases/calendar/) - Upcoming release schedule
