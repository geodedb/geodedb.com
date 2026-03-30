---
title: "Release Notes & Versioning Strategy"
description: "Comprehensive guide to Geode release management, versioning strategy, and release notes. Learn about release cycles, version numbering, upgrade paths, and production deployment strategies."
keywords:
  - release notes
  - versioning
  - semantic versioning
  - release management
  - upgrade strategy
  - deployment
  - version numbers
  - Geode
  - graph database
  - release cycle
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/releases/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Effective release management ensures database stability, predictable upgrade paths, and clear communication of changes. Geode follows industry-standard semantic versioning combined with rigorous testing and transparent release processes to deliver reliable, enterprise-grade graph database releases.

As an ISO/IEC 39075:2024 GQL-compliant graph database, Geode's release strategy balances innovation with stability, providing regular feature updates while maintaining backward compatibility and production reliability. This guide explains Geode's versioning strategy, release cycles, and best practices for managing upgrades.

## Semantic Versioning

Geode uses semantic versioning (SemVer) for all releases:

```text
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]

Examples:
0.2.15         - Stable release
1.0.0           - Major version
1.2.3-beta.1    - Pre-release
1.2.3+20240124  - Build metadata
```

**Version Components**:

**MAJOR** (Breaking Changes):

- Incompatible API changes
- Protocol breaking changes
- Removal of deprecated features
- Major architectural changes
- Migration required

**MINOR** (New Features):

- New features (backward-compatible)
- New APIs (backward-compatible)
- Performance improvements
- Enhancements to existing features
- No breaking changes

**PATCH** (Bug Fixes):

- Bug fixes (backward-compatible)
- Security patches
- Documentation corrections
- Minor performance tweaks
- No new features

## Current Release: **GEODE_TAG**

**Release Date**: **GEODE_RELEASE_DATE_LONG**
**Status**: Current stable release
**Support Level**: Full Support

### Key Features

**Enterprise Readiness**:

- 100% GQL compliance (see conformance profile)
- `__GEODE_TAG__` release cut validated with 619/619 unit tests
- Current mainline GAP analysis tracking 3847 passed, 70 failed, 35 skipped
- Full ACID transaction support
- Row-Level Security (RLS), API keys, MFA, and mTLS support

**Architecture**:

- DSN graph binding with graph-scoped sessions
- Per-graph storage and graph-storage integration
- Memory-mapped I/O with page-level caching
- Cost-based query optimization
- CTE execution and DOT output support

**Protocol**:

- QUIC + TLS 1.3 (mandatory)
- QUIC stream multiplexing in the `v0.2.x` line
- Default port: 3141
- Bidirectional streaming support

**Client Libraries**:

- Go client rolling stable module
- Python client v0.3.19
- Rust client v0.1.1-alpha.8
- Zig client v0.1.0

### Upgrade into v0.2.x

**Breaking Changes**:

1. Storage layout changed significantly across the March 2026 `v0.1.x` to `v0.2.x` transition.
2. DSN graph binding now controls the default graph in more surfaces.
3. Auth tooling and graph-storage behavior should be revalidated in staging before rollout.

**Migration Steps**:

```bash
# 1. Backup existing database
geode backup create --output pre-__GEODE_TAG__-backup.tar.gz

# 2. Stop v0.1.x server
geode shutdown

# 3. Install __GEODE_TAG__
curl -sSL https://install.geodedb.com | sh

# 4. Update configuration
# Change port from 8443 to 3141
# Remove TCP protocol settings

# 5. Start __GEODE_TAG__ server
geode serve --config /etc/geode/config.yaml

# 6. Update client libraries
go get -u geodedb.com/geode@__GEODE_TAG__
pip install --upgrade geode-client==0.3.19
cargo update -p geode-client --precise 0.1.1-alpha.8
```

## Release Channels

Geode provides multiple release channels for different use cases:

**Stable** (Recommended for Production):

- Fully tested and validated
- Long-term support
- Security updates guaranteed
- Example: **GEODE_TAG**

**Beta** (Early Access):

- Feature-complete but undergoing final testing
- Preview upcoming features
- Not recommended for production
- Example: v0.2.16-rc.1

**Alpha** (Experimental):

- Early development builds
- APIs may change
- For testing only
- Example: v0.2.16-alpha.1

**Nightly** (Development):

- Daily builds from main branch
- Bleeding edge features
- Unstable, for development only
- Example: vX.Y.Z-dev+YYYYMMDD

## Release Schedule

**Major Releases** (Annually):

- January of each year
- Breaking changes allowed
- 12-month support window
- Migration guides provided

**Minor Releases** (Quarterly):

- January, April, July, October
- New features and enhancements
- Backward-compatible
- No migration required

**Patch Releases** (As Needed):

- Released as bugs are discovered and fixed
- Typically within 1-2 weeks of bug report
- Security patches released immediately

**Long-Term Support (LTS)**:

- Every major version receives LTS status
- 24 months of security updates
- 12 months of feature updates
- Example: v1.0.0 LTS supported until January 2028

## Download and Installation

**Linux Packages**:

```bash
# Debian/Ubuntu (APT repository - recommended for automatic updates)
curl -fsSL https://apt.geodedb.com/geode.gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/geode-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/geode-archive-keyring.gpg] https://apt.geodedb.com stable main" | \
  sudo tee /etc/apt/sources.list.d/geode.list
sudo apt update
sudo apt install geode

# RHEL/Fedora
curl -L -o geode.rpm https://gitlab.com/devnw/codepros/geode/geode/-/releases/latest/download/geode-linux-x86_64.rpm
sudo rpm -i geode.rpm
```

**macOS (Homebrew)**:

```bash
# Install via Homebrew (recommended)
brew install geodedb/geode/geode
```

**From Source**:

```bash
git clone https://github.com/codeprosorg/geode
cd geode
git checkout __GEODE_TAG__
make build
./zig-out/bin/geode serve --listen 0.0.0.0:3141
```

**Docker**:

```bash
# Latest stable release
docker pull geodedb/geode:latest
docker pull geodedb/geode:0.2

# Specific version
docker pull geodedb/geode:__GEODE_VERSION__

# Run container
docker run -p 3141:3141 geodedb/geode:__GEODE_VERSION__
```

Additional package managers are not currently published; use release artifacts, Docker, or build from source.

## Release Testing Process

Before any release, Geode undergoes comprehensive testing:

**Test Suite**:

1. Unit tests (`__GEODE_TAG__` release cut: 619/619 passing)
2. Integration tests (cross-client validation)
3. GQL compliance tests (see conformance profile)
4. Performance benchmarks
5. Concurrency stress tests
6. Memory leak detection
7. Security scanning

**Validation Criteria**:

- All unit tests passing
- Zero critical bugs
- Performance benchmarks within 5% of baseline
- Security scan clean
- Documentation complete
- Migration guide reviewed

## Support Policy

**Current Versions**:

- v0.2.x: Full support (current stable feature line)
- v0.1.28-v0.1.39: Upgrade-planned support for existing March 2026 deployments
- v0.1.3-v0.1.27: Legacy line; upgrade with backup and restore validation

**Support Levels**:

**Full Support**:

- Latest major version
- New features and enhancements
- Bug fixes and security patches
- Duration: 12 months from release

**Maintenance Mode**:

- Previous major version
- Critical bug fixes only
- Security patches
- Duration: 12 months after full support

**End of Life (EOL)**:

- No updates or patches
- Upgrade to supported version recommended

## Release Notes Format

Each release includes detailed release notes:

```markdown
# Geode v0.2.15

**Release Date**: March 29, 2026
**Status**: Current stable release

## Highlights
- 100% GQL compliance
- QUIC stream multiplexing and poll-loop improvements
- CTE execution and DOT output support
- Current auth and graph-storage fixes in the stable line

## Added
- Feature 1: Description
- Feature 2: Description

## Changed
- Change 1: Description and rationale
- Change 2: Migration steps if needed

## Fixed
- Bug 1: Description
- Bug 2: Impact and resolution

## Security
- CVE-2024-XXXX: Description and severity

## Performance
- Improvement 1: Benchmark results
- Improvement 2: Impact measurement

## Deprecated
- Feature: Timeline for removal

## Breaking Changes
- Change: Migration guide link
```

## Roadmap and Future Releases

**v0.1.4** (Planned: April 2026):

- Enhanced vector search capabilities
- Graph algorithms library
- Query result caching
- Additional client language support

**v0.2.0** (Planned: July 2026):

- Distributed query execution
- Sharding and partitioning
- Advanced analytics functions
- Time-travel queries

**v1.0.0** (Planned: January 2027):

- First LTS major version
- API stability guarantee
- Enterprise support packages
- Certification program

## Upgrade Best Practices

**Pre-Upgrade Checklist**:

1. Review release notes and breaking changes
2. Check compatibility matrix for client libraries
3. Backup database and configuration
4. Test upgrade in staging environment
5. Plan maintenance window
6. Prepare rollback plan

**Upgrade Execution**:

1. Announce maintenance window to users
2. Create backup immediately before upgrade
3. Stop application traffic
4. Perform database upgrade
5. Verify server startup and health checks
6. Run smoke tests
7. Resume application traffic
8. Monitor metrics and logs

**Post-Upgrade Validation**:

1. Verify all services started correctly
2. Run integration test suite
3. Check query performance benchmarks
4. Review error logs
5. Validate client connections
6. Monitor resource utilization

## Rollback Procedures

If upgrade fails, execute rollback:

```bash
# 1. Stop failed __GEODE_TAG__ server
geode shutdown

# 2. Restore previous stable binary
sudo dpkg -i geode-0.2.14.deb

# 3. Restore database from backup
geode restore --input pre-__GEODE_TAG__-backup.tar.gz

# 4. Restore configuration
cp /etc/geode/config.yaml.backup /etc/geode/config.yaml

# 5. Start v0.1.x server
geode serve

# 6. Verify functionality
geode status
geode query "MATCH (n) RETURN COUNT(n);"
```

## Related Topics

- Version Changelog and Release History
- Version Management
- Migration Guides
- Upgrade Procedures
- Compatibility Matrix
- Support Policy
- Security Advisories

## Further Reading

- Semantic Versioning Specification
- Release Management Best Practices
- Database Upgrade Strategies
- Zero-Downtime Deployment
- Continuous Delivery for Databases
- Version Compatibility Testing
- Production Deployment Guide
