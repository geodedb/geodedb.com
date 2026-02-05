---
title: "Releases"
description: "Geode version history, release notes, changelog, and upgrade guides for all releases"
summary: "Complete release history for Geode including version notes, feature additions, bug fixes, breaking changes, and upgrade guides."
weight: 100
keywords:
  - releases
  - changelog
  - version history
  - release notes
  - upgrade guide
  - migration
tags:
  - releases
  - changelog
  - versions
  - updates
categories:
  - releases
  - reference
toc: true
params:
  seo:
    keywords: "geode releases, changelog, version history, release notes, upgrade guide, migration"
    description: "Complete Geode release history with detailed changelogs, upgrade guides, and migration instructions"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Releases

Complete version history, release notes, and upgrade guides for all Geode releases.

## Overview

This section documents all Geode releases including new features, bug fixes, performance improvements, breaking changes, and upgrade instructions. Each release follows semantic versioning (MAJOR.MINOR.PATCH) with clear documentation of changes.

Stay current with Geode development by reviewing release notes before upgrading. All releases are tested with comprehensive test suites (97.4% pass rate) and maintain 100% GQL compliance.

## Current Release

### v0.1.3 (Production Ready)

**Release Date**: January 2026

**Status**: Production Ready

**Key Highlights**:
- 97.4% test coverage (1,644/1,688 tests passing)
- 100% GQL compliance (see conformance profile)
- 1,735 CANARY markers tracking 2,190+ requirements

**Major Features**:
- Complete ISO/IEC 39075:2024 GQL implementation
- Six index types (B-tree, Hash, HNSW, R-tree, Full-text, Patricia Trie)
- Transparent Data Encryption (TDE) with AES-256-GCM
- Row-Level Security (RLS) with policy evaluation
- Distributed deployment with Raft consensus
- Machine learning graph embeddings (Node2Vec, GraphSAGE, DeepWalk)
- Real-time analytics with streaming pattern detection
- QUIC+TLS transport with connection migration

See [Changelog](/docs/reference/changelog/) for complete details.

## Release Schedule

Geode follows a predictable release schedule:

- **Major Releases**: Every 6-12 months (breaking changes)
- **Minor Releases**: Every 1-2 months (new features, backward compatible)
- **Patch Releases**: As needed (bug fixes, security patches)

## Version History

### v0.1.x Series (Current)

**v0.1.3** (January 2026)
- Production ready milestone
- 100% GQL compliance
- Enterprise security features
- Distributed deployment support

### v0.1.x Series

**v0.1.2** (December 2025)
- Advanced analytics features
- ML graph embeddings
- Materialized views
- Enhanced security

### v0.1.x Series

**v0.1.1** (November 2025)
- Full-text search with BM25
- Vector search with HNSW
- Geospatial indexing
- Performance optimizations

### v0.15.x Series

**v0.1.0** (October 2025)
- Six index types
- Query optimizer improvements
- Memory-mapped I/O
- SIMD optimizations

### Earlier Releases

See [Changelog](/docs/reference/changelog/) for complete version history.

## Release Categories

### Feature Releases

Introduce new functionality:
- New GQL features
- Additional index types
- Advanced security capabilities
- Performance enhancements

### Security Releases

Address security vulnerabilities:
- CVE patches
- Security hardening
- Authentication improvements
- Encryption enhancements

### Bug Fix Releases

Resolve defects:
- Query execution bugs
- Storage issues
- Memory leaks
- Edge case handling

### Performance Releases

Optimize performance:
- Query optimizer improvements
- Index optimizations
- Memory efficiency
- Network throughput

## Upgrading Geode

### Before Upgrading

1. **Read Release Notes**: Review changes, especially breaking changes
2. **Test in Staging**: Upgrade staging environment first
3. **Backup Data**: Create full backup before upgrading
4. **Check Compatibility**: Verify client library compatibility
5. **Plan Downtime**: Schedule maintenance window if needed

### Upgrade Process

#### Standalone Deployment

```bash
# 1. Backup data
geode backup --output /backups/pre-upgrade-backup.tar.gz

# 2. Stop server
systemctl stop geode

# 3. Upgrade binary
# From source:
cd geode && git pull && make release
# From Docker:
docker pull geodedb/geode:latest

# 4. Start server
systemctl start geode

# 5. Verify
geode --version
geode shell
RETURN 1 AS x;  -- Test query
```

#### Distributed Deployment

```bash
# Rolling upgrade (no downtime)
# Upgrade one shard at a time

# For each shard:
# 1. Remove from load balancer
# 2. Drain connections
# 3. Upgrade shard
# 4. Verify health
# 5. Add back to load balancer
# 6. Wait for replication to catch up
# 7. Proceed to next shard
```

#### Docker Deployment

```bash
# 1. Backup
docker exec geode geode backup --output /backups/pre-upgrade.tar.gz

# 2. Pull new image
docker pull geodedb/geode:v0.1.3

# 3. Stop container
docker stop geode

# 4. Start new container (data persists in volume)
docker run -d \
  -p 3141:3141 \
  -v geode-data:/var/lib/geode \
  --name geode \
  geodedb/geode:v0.1.3

# 5. Verify
docker logs geode
```

### Breaking Changes

Review breaking changes before upgrading:

**v0.1.3 Breaking Changes**:
- None (first production release)

**Future Breaking Changes**:
- Will be clearly documented in release notes
- Major version increments signal breaking changes
- Migration guides provided

## Compatibility

### Client Library Compatibility

| Server Version | Go Client | Python Client | Rust Client | Zig Client |
|----------------|-----------|---------------|-------------|------------|
| v0.1.x        | v0.1.x   | v0.1.x       | v0.1.x     | v0.1.x    |
| v0.1.x        | v0.1.x   | v0.1.x       | v0.1.x     | v0.1.x    |

**Recommendation**: Keep client library version synchronized with server version.

### Protocol Compatibility

- **JSON Line Protocol**: Backward compatible within major version
- **QUIC Transport**: Version negotiation supported
- **TLS**: TLS 1.3 required (no backward compatibility with TLS 1.2)

### Data Format Compatibility

- **Storage Format**: Backward compatible within major version
- **WAL Format**: Backward compatible within major version
- **Index Format**: May require rebuild on major version upgrade

## Deprecation Policy

Features are deprecated before removal:

1. **Deprecation Announced**: Feature marked deprecated in release notes
2. **Deprecation Period**: Minimum 6 months (2 minor releases)
3. **Migration Path**: Alternative documented
4. **Removal**: Feature removed in next major version

**Currently Deprecated**: None

## Support Policy

### Long-Term Support (LTS)

- **LTS Releases**: Every 12 months
- **Support Duration**: 18 months from release
- **Security Patches**: Throughout support period
- **Bug Fixes**: Critical bugs only after 12 months

**Current LTS**: v0.1.x (until June 2027)

### Standard Releases

- **Support Duration**: Until next release + 2 months
- **Security Patches**: Throughout support period
- **Bug Fixes**: Throughout support period

## Getting Updates

### Notification Channels

Stay informed about new releases:

- **GitLab Releases**: Watch repository for release notifications
- **Changelog**: Review [Changelog](/docs/reference/changelog/) regularly
- **Security Advisories**: Subscribe to security notifications
- **Release Notes**: RSS feed for release announcements

### Version Check

Check your current version:

```bash
# Server version
geode --version

# Client library version (example: Go)
go list -m geodedb.com/geode
```

## Rollback Procedures

If upgrade fails:

### Standalone Deployment

```bash
# 1. Stop new version
systemctl stop geode

# 2. Restore binary
cp /backups/geode-old /usr/local/bin/geode

# 3. Restore data (if needed)
geode restore --input /backups/pre-upgrade-backup.tar.gz

# 4. Start server
systemctl start geode
```

### Docker Deployment

```bash
# 1. Stop new container
docker stop geode && docker rm geode

# 2. Start old version
docker run -d \
  -p 3141:3141 \
  -v geode-data:/var/lib/geode \
  --name geode \
  geodedb/geode:v0.1.2
```

### Distributed Deployment

```bash
# Rollback shards in reverse order
# Follow same rolling upgrade process but with old version
```

## Testing Upgrades

Before production upgrade:

1. **Staging Environment**: Test upgrade in staging first
2. **Load Testing**: Run performance tests after upgrade
3. **Integration Testing**: Verify client integrations
4. **Monitoring**: Check metrics for anomalies
5. **Rollback Plan**: Document rollback procedures

## Release Artifacts

Each release includes:

- **Source Code**: GitLab repository tag
- **Binaries**: Pre-compiled for common platforms
- **Docker Images**: On Docker Hub
- **Client Libraries**: Language-specific packages
- **Documentation**: Updated docs for release version

## Learn More

- [Changelog](/docs/reference/changelog/) - Detailed version history
- [Installation Guide](/docs/get-started/) - Install specific versions
- [Migration Guide](/docs/guides/migration-guide/) - Migrate between versions
- [Backup Automation](/docs/guides/backup-automation/) - Backup before upgrading
- [Troubleshooting](/docs/guides/troubleshooting/) - Resolve upgrade issues

## Contributing

Help improve Geode:

- **Report Bugs**: File issues on GitLab
- **Request Features**: Propose new features
- **Submit Patches**: Contribute code improvements
- **Improve Docs**: Update documentation

See [Contributing Guide](/docs/contribute/) for how to get involved.
