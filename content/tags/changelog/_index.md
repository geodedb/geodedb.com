---
title: "Version Changelog & Release History"
description: "Complete changelog and release history for Geode graph database. Track feature additions, bug fixes, performance improvements, breaking changes, and migration guides across all versions."
keywords:
  - changelog
  - release history
  - version history
  - release notes
  - feature changes
  - bug fixes
  - breaking changes
  - migration guide
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/changelog/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Understanding what changes between versions is critical for maintaining stable, secure, and performant graph database deployments. Geode maintains a comprehensive changelog documenting every feature addition, bug fix, performance improvement, and breaking change across all releases. This transparency enables informed upgrade decisions and smooth migration paths.

As an enterprise-ready graph database aligned with the ISO/IEC 39075:2024 100% GQL compliance, Geode follows semantic versioning (MAJOR.MINOR.PATCH) and maintains backward compatibility within major versions. This guide explains how to track changes, understand release cycles, and plan upgrades effectively.

## Understanding the Changelog

Geode's changelog follows the "Keep a Changelog" format with entries organized by version and categorized by change type:

**Change Categories**:

- **Added**: New features and capabilities
- **Changed**: Modifications to existing functionality
- **Deprecated**: Features marked for removal in future versions
- **Removed**: Features removed in this version
- **Fixed**: Bug fixes and corrections
- **Security**: Security improvements and vulnerability patches
- **Performance**: Performance optimizations and improvements

## Current Version: **GEODE_TAG** (Current Stable Release)

**Status**: Current stable release (**GEODE_RELEASE_MONTH_YEAR**)
**Released**: **GEODE_RELEASE_DATE_LONG**

### Highlights

- 100% GQL compliance (see conformance profile)
- `__GEODE_TAG__` release cut validated with 619/619 unit tests
- Current mainline GAP analysis tracking 3847 passed, 70 failed, 35 skipped
- Enterprise-ready with full ACID transactions
- QUIC + TLS 1.3 protocol support
- Multi-language client libraries (Go, Python, Rust, Zig)

### Added in v0.2.15

**Core Features**:

- Common table expressions (CTEs) in the stable release line
- DOT output fixes for graph visualization workflows
- DSN graph binding and graph-scoped session behavior
- Per-graph storage and graph-storage integration across the March release train
- Current auth CLI flows for login, init, reseal, and verify

**Performance Enhancements**:

- QUIC stream multiplexing for better concurrency
- Poll-loop reductions and accepted-connection wait improvements
- Storage engine fixes for graph mappings, free-space bitmap rebuilds, and adapter label dictionaries
- Large-result stability carried forward from the `v0.1.x` line

**Client Libraries**:

- Go client rolling stable module
- Python async client v0.3.19
- Rust client v0.1.1-alpha.8
- Zig client v0.1.0

**Tooling**:

- Interactive GQL shell with syntax highlighting
- EXPLAIN and PROFILE query analysis
- Backup and restore utilities
- Data import/export tools (JSON, CSV, GraphML)
- Prometheus metrics integration

### Changed in v0.2.15

- `v0.2.x` became the active stable line for the docs and release process
- Release notes now distinguish the tagged stable release from unreleased `main` fixes
- Auth, storage, and upgrade guidance now reflect the March 2026 release train
- TDE wiring and post-tag storage fixes are tracked separately as unreleased `main` work

### Fixed in v0.2.15

- UUIDv7 generation on 32-bit ARM
- CTE execution stability issues found during the March release train
- DOT export correctness for current graph visualization examples
- Storage edge-slot translation and UUID truncation issues addressed on `main` after the tag

## Release Cycles and Versioning

**Semantic Versioning**:

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes, incompatible API changes
MINOR: New features, backward-compatible additions
PATCH: Bug fixes, backward-compatible corrections
```

**Release Schedule**:

- **Major Releases**: Annual (breaking changes, major features)
- **Minor Releases**: Quarterly (new features, enhancements)
- **Patch Releases**: As needed (bug fixes, security patches)
- **Security Updates**: Immediate (critical vulnerabilities)

## Breaking Changes Policy

Geode maintains backward compatibility within major versions. Breaking changes are:

1. **Announced in Advance**: Deprecated features marked at least one minor version before removal
2. **Documented Thoroughly**: Migration guides provided for all breaking changes
3. **Limited to Majors**: Breaking changes only in major version releases
4. **Minimized**: Breaking changes avoided unless absolutely necessary

**Example Breaking Change Process**:

```
v1.5.0: Feature marked as deprecated
v1.6.0: Deprecation warning in logs
v1.7.0: Migration guide published
v2.0.0: Feature removed
```

## Viewing the Changelog

**GitHub Repository**:

```bash
# View full changelog
https://github.com/codeprosorg/geode/blob/main/CHANGELOG.md

# View changes between versions
git log v0.2.14..v0.2.15 --oneline

# View release notes
https://github.com/codeprosorg/geode/releases
```

**Built-in Command**:

```bash
# Display changelog for current version
geode changelog

# Display changelog for specific version
geode changelog --version v0.2.15

# Display all changes since version
geode changelog --since v0.1.0

# Display only security fixes
geode changelog --category security
```

**Web Documentation**:

Visit /docs/reference/changelog/ for interactive changelog with:

- Filterable change categories
- Version comparison
- Migration guide links
- Affected API documentation

## Migration Guides

Each major and significant minor release includes a migration guide:

**Upgrade from v0.1.x to v0.1.x**:

1. **Backup Existing Database**:

   ```bash
   geode backup create --output pre-upgrade-backup.tar.gz
   ```

2. **Review Breaking Changes**:
   - Protocol changed to QUIC-only (no TCP fallback)
   - Default port changed from 8443 to 3141
   - Wire format is now Protobuf wire protocol exclusively

3. **Update Client Libraries**:

   ```bash
   # Go
   go get -u geodedb.com/geode@v1.0.0

   # Python
   pip install --upgrade geode-client==1.0.0

   # Rust
   cargo update geode-client
   ```

4. **Update Configuration**:

   ```yaml
   # config.yaml
   server:
     listen: "0.0.0.0:3141"  # Changed from 8443
     protocol: "quic"        # TCP removed
   ```

5. **Test in Staging**:
   - Deploy to staging environment
   - Run integration test suite
   - Validate performance benchmarks

6. **Deploy to Production**:
   - Schedule maintenance window
   - Perform rolling upgrade for clusters
   - Monitor metrics and logs

## Version Compatibility Matrix

**Server Compatibility**:

| Server Version | Go Client | Python Client | Rust Client | Zig Client |
|----------------|-----------|---------------|-------------|------------|
| v0.1.x        | v1.0.x    | v1.0.x        | v1.0.x      | v1.0.x     |
| v0.1.x        | v0.9.x    | v0.9.x        | v0.9.x      | v0.9.x     |
| v0.1.x        | v0.8.x    | v0.8.x        | v0.8.x      | v0.8.x     |

**Protocol Compatibility**:

| Version | Protocol | Wire Format | TLS Version |
|---------|----------|-------------|-------------|
| v0.1.x | QUIC     | JSON Line   | TLS 1.3     |
| v0.1.x | QUIC/TCP | Binary/JSON | TLS 1.2+    |
| v0.1.x | TCP      | Binary      | TLS 1.2+    |

## Security Advisories

Security vulnerabilities are tracked separately and disclosed responsibly:

**Reporting Security Issues**:

```
Email: security@codepros.org
PGP Key: https://geodedb.com/security/pgp-key.asc
Response Time: 48 hours
```

**Security Update Process**:

1. Issue reported privately to security team
2. Vulnerability assessed and patch developed
3. Security advisory published (CVE assigned if applicable)
4. Patch released with security tag (e.g., v0.2.15-security)
5. Users notified via security mailing list

**Current Security Status**: No known vulnerabilities in the tagged stable release (as of `__GEODE_TAG__`)

## Deprecation Notices

**Currently Deprecated** (removal planned for v1.0.0):

None currently. The stable `__GEODE_TAG__` feature set is the supported baseline in the docs.

**Previously Deprecated and Removed**:

- v0.1.2: TCP protocol support (removed before the current `v0.2.x` line)
- v0.1.1: Legacy JSON line protocol (removed in v0.1.2; Protobuf required)
- v0.1.0: Legacy authentication API (removed in v0.1.1)

## Changelog Best Practices

**For Users**:

1. **Subscribe to Notifications**: Watch the GitHub repository for release announcements
2. **Review Before Upgrading**: Always read the changelog before upgrading
3. **Test Upgrades**: Use staging environments to validate changes
4. **Plan Migrations**: Allow time for migration when breaking changes are introduced
5. **Track Dependencies**: Ensure client libraries match server versions

**For Contributors**:

1. **Update Changelog**: Add entries for all significant changes
2. **Categorize Correctly**: Use appropriate change categories
3. **Provide Context**: Explain why changes were made, not just what changed
4. **Link Issues**: Reference GitHub issues and pull requests
5. **Document Migrations**: Include migration steps for breaking changes

## Automated Changelog Tools

**Generate Changelog from Git**:

```bash
# Generate changelog since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline --no-merges

# Generate formatted changelog
conventional-changelog -p angular -i CHANGELOG.md -s
```

**CI/CD Integration**:

```yaml
# .github/workflows/release.yml
- name: Generate Changelog
  run: |
    npx conventional-changelog-cli -p angular -i CHANGELOG.md -s
    git add CHANGELOG.md
    git commit -m "docs: Update changelog for release"
```

## Related Topics

- Release Notes and Versioning
- Version Management
- Migration Guides
- Security Advisories
- Upgrade Procedures
- Compatibility Matrix
- Breaking Changes Policy

## Further Reading

- Semantic Versioning Specification
- Keep a Changelog Format
- Release Management Best Practices
- Database Upgrade Strategies
- Security Disclosure Policy
- Dependency Management
- Version Compatibility Testing
