---
title: "Software Updates & Releases"
description: "Stay current with Geode database updates, releases, and version management. Learn about upgrade paths, compatibility, release cycles, and best practices for keeping your graph database deployment up-to-date."
keywords:
  - software updates
  - database releases
  - version management
  - upgrade paths
  - Geode
  - graph database
  - semantic versioning
  - compatibility
  - release notes
  - database updates
  - update strategies
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/updates/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Keeping your Geode database deployment current ensures you benefit from the latest features, performance improvements, security patches, and bug fixes. Geode follows semantic versioning and provides clear upgrade paths with comprehensive release documentation.

## Release Cycle and Versioning

Geode uses semantic versioning (SemVer) to communicate the nature and impact of changes across releases.

### Semantic Versioning Schema

Geode version numbers follow the format `MAJOR.MINOR.PATCH`:

- **MAJOR** (e.g., 1.0.0 → 2.0.0): Breaking changes requiring migration
- **MINOR** (e.g., 0.2.15 → 0.3.0): New features, backward compatible
- **PATCH** (e.g., 0.2.14 → 0.2.15): Bug fixes, security patches

**Current Version:** **GEODE_TAG** (Current stable release, **GEODE_RELEASE_DATE_LONG**)

### Release Types

**Production Releases**

- Full feature set with comprehensive testing
- 97.4% test coverage (1644/1688 tests passing)
- 100% GQL compliance (see conformance profile)
- Suitable for enterprise production environments

**Release Candidates (RC)**

- Feature-complete pre-release versions
- Beta testing phase for community validation
- Typically released 2-4 weeks before production release

**Patch Releases**

- Critical bug fixes and security updates
- Released as needed, typically within 1-2 weeks of issue discovery
- Minimal risk, recommended for immediate deployment

### Release Frequency

- **Minor releases:** Quarterly (approximately every 3 months)
- **Patch releases:** As needed for critical issues
- **Major releases:** Annually or when significant architectural changes are introduced

## Checking Current Version

Verify your installed Geode version using the CLI:

```bash
./geode --version
# Output: Geode __GEODE_TAG__ (__GEODE_RELEASE_DATE__)

# Check detailed build information
./geode version --verbose
# Output:
# Geode Graph Database
# Version: __GEODE_VERSION__
# Build Date: __GEODE_RELEASE_DATE__
# Git Commit: <release-sha>
# GQL Standard: ISO/IEC 39075:2024
# Zig Version: 0.1.0
```

Check version from client libraries:

**Go:**

```go
import "geodedb.com/geode"

version := geode.Version()
fmt.Printf("Client version: %s\n", version)
```

**Python:**

```python
import geode_client
print(f"Client version: {geode_client.__version__}")
```

**Rust:**

```rust
use geode_client;
println!("Client version: {}", geode_client::VERSION);
```

## Update Strategies

Choose an update strategy that balances risk mitigation with access to new capabilities.

### Conservative Strategy

Recommended for critical production environments:

1. Wait 2-4 weeks after minor release announcement
2. Review release notes and breaking changes
3. Test in staging environment
4. Monitor community feedback
5. Deploy to production during maintenance window

**Advantages:**

- Minimizes exposure to undiscovered issues
- Community identifies edge cases first
- More time for internal testing

**Update frequency:** Quarterly for minor releases, immediate for critical patches

### Balanced Strategy

Recommended for most production environments:

1. Update to patch releases within 1 week
2. Update to minor releases within 2 weeks
3. Test in staging before production deployment
4. Follow documented upgrade procedures

**Advantages:**

- Access to new features relatively quickly
- Reduced accumulation of technical debt
- Security patches applied promptly

**Update frequency:** Monthly review cycle with selective updates

### Aggressive Strategy

Recommended for development environments and early adopters:

1. Update to latest release within days
2. Participate in release candidate testing
3. Provide community feedback
4. Accept higher risk for access to cutting-edge features

**Advantages:**

- Immediate access to new capabilities
- Contribute to community testing
- Influence future development

**Update frequency:** Continuous updates as releases become available

## Upgrade Procedures

Geode supports both in-place upgrades and blue-green deployment strategies.

### In-Place Upgrade

For single-instance deployments or small clusters:

```bash
# 1. Backup current database
./geode backup --output /backup/geode-$(date +%Y%m%d).db

# 2. Stop Geode server gracefully
./geode shutdown --wait

# 3. Replace binary
mv geode geode.old
wget https://geodedb.com/releases/geode-__GEODE_TAG__-linux-amd64
mv geode-__GEODE_TAG__-linux-amd64 geode
chmod +x geode

# 4. Run migration (if needed)
./geode migrate --check
./geode migrate --apply

# 5. Start server
./geode serve --listen 0.0.0.0:3141

# 6. Verify version
./geode --version
```

### Blue-Green Deployment

For high-availability clusters with zero downtime:

```bash
# 1. Deploy new version to green environment
docker run -d --name geode-green \
  -v /data/geode:/data \
  -p 3142:3141 \
  geodedb/geode:__GEODE_VERSION__

# 2. Verify green environment health
curl http://localhost:3142/health
# {"status": "healthy", "version": "__GEODE_VERSION__"}

# 3. Run smoke tests against green
./test-harness --target localhost:3142 --suite smoke

# 4. Switch traffic from blue to green (load balancer)
# Update load balancer configuration

# 5. Monitor green environment
# Watch logs, metrics, error rates

# 6. Decommission blue after stability confirmed
docker stop geode-blue
docker rm geode-blue
```

### Rolling Upgrade for Clusters

For distributed deployments maintaining quorum:

```bash
# Upgrade one node at a time
for node in node1 node2 node3; do
  # Drain node
  ssh $node "./geode admin drain --wait"

  # Stop node
  ssh $node "systemctl stop geode"

  # Replace binary
  scp geode-__GEODE_TAG__ $node:/usr/local/bin/geode

  # Migrate (if needed)
  ssh $node "./geode migrate --apply"

  # Start node
  ssh $node "systemctl start geode"

  # Wait for node to rejoin cluster
  ssh $node "./geode admin wait-ready --timeout 120s"

  # Verify version
  ssh $node "./geode --version"

  # Proceed to next node
done
```

## Database Migrations

Geode handles schema migrations automatically for most updates.

### Migration Process

Check if migration is required:

```bash
./geode migrate --check
# Output:
# Migration required: YES
# Current schema version: 17
# Target schema version: 18
# Estimated duration: ~30 seconds
# Backup recommended: YES
```

Preview migration steps:

```bash
./geode migrate --dry-run
# Output:
# Migration plan for v0.2.14 → v0.2.15:
# 1. Validate graph metadata and name-to-UUID mappings
# 2. Rebuild storage free-space bookkeeping if required
# 3. Refresh query and catalog statistics
# 4. Re-open graph stores and verify restart behavior
# No data loss expected
```

Apply migration:

```bash
./geode migrate --apply
# Output:
# [1/4] Adding vector_embeddings table... done (2s)
# [2/4] Creating property index... done (15s)
# [3/4] Updating statistics... done (5s)
# [4/4] Rebuilding label indexes... done (8s)
# Migration completed successfully in 30s
```

### Rollback Capability

Geode supports rollback for most migrations:

```bash
# Check if rollback is available
./geode migrate --rollback --check
# Output: Rollback available: YES (safe)

# Execute rollback
./geode migrate --rollback
# Output: Rolled back to schema version 17
```

**Note:** Some migrations involving data transformations may not support rollback. Always backup before migrating.

## Compatibility Matrix

Understand compatibility between server and client library versions.

### Server-Client Compatibility

| Server Version | Go Client | Python Client | Rust Client | Zig Client |
|----------------|-----------|---------------|-------------|------------|
| v0.2.15       | rolling  | 0.3.19       | 0.1.1-alpha.8 | 0.1.0 |
| v0.1.28-v0.1.39 | rolling | 0.3.19+    | 0.1.1-alpha.8+ | 0.1.0+ |
| v0.1.3-v0.1.27 | validate in staging | 0.3.x | 0.1.x | 0.1.x |

**General Rule:** Match minor versions between server and clients for guaranteed compatibility.

### Protocol Compatibility

Geode's Protobuf wire protocol maintains backward compatibility within major versions:

- **Wire Protocol:** v1.x compatible across all v0.x releases
- **QUIC/TLS:** TLS 1.3 required (consistent across versions)
- **Message Types:** Additive only (new types added, old types maintained)

### GQL Standard Compliance

Geode tracks GQL standard evolution:

- **v0.2.15:** Stable 100% ISO/IEC 39075:2024 compliance with CTE and DOT fixes
- **v0.2.14:** CTE execution and DOT support landed in the release train
- **v0.2.12-v0.2.13:** security hardening, per-graph storage, and QUIC stream multiplexing

Queries written for v0.1.1+ remain valid in newer versions unless they rely on deprecated features.

## Release Notes and Changelogs

Each release includes comprehensive documentation of changes.

### Release Notes Contents

Release notes for each version include:

1. **Breaking Changes:** Required migration steps, deprecated feature removal
2. **New Features:** Major capabilities, API additions
3. **Enhancements:** Performance improvements, usability updates
4. **Bug Fixes:** Issues resolved with reference numbers
5. **Security Updates:** CVEs addressed, security improvements
6. **Deprecations:** Features marked for future removal with migration guidance

### Example Release Note (v0.2.15)

```markdown
## Geode v0.2.15 - March 2026

### Breaking Changes
- None

### New Features
- CTE execution in the stable release line
- DOT graph output fixes
- 32-bit ARM UUIDv7 fix
- Current release-line docs and upgrade guidance

### Enhancements
- QUIC stream multiplexing for better concurrency
- Poll-loop tuning for accepted-connection handling
- Storage fixes for graph metadata and adapter label dictionaries
- Release process now distinguishes stable `v0.2.15` from unreleased `main` fixes

### Bug Fixes
- Fixed 32-bit ARM UUIDv7 generation
- Corrected DOT output regressions carried through the March release train
- Stabilized graph-storage restart behavior in post-tag `main` work

### Security Updates
- Continued QUIC library maintenance and accepted-connection handling updates
- Documentation now reflects current auth, API key, and mTLS support

### Deprecations
- None in the tagged `__GEODE_TAG__` release; see unreleased `main` notes for open follow-up work
```

### Accessing Release Notes

Release notes are available through multiple channels:

- **Website:** <https://geodedb.com/releases/>
- **GitHub:** <https://github.com/geodedb/geode/releases>
- **CLI:** `./geode release-notes --version __GEODE_VERSION__`
- **API:** `curl https://geodedb.com/api/v1/releases/__GEODE_VERSION__`

## Update Notifications

Stay informed about new releases through multiple channels.

### RSS Feed

Subscribe to release announcements:

```bash
https://geodedb.com/releases/feed.xml
```

### Email Notifications

Register for email alerts:

```bash
curl -X POST https://geodedb.com/api/v1/notify/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "topics": ["releases", "security"]}'
```

### Automated Update Checking

Configure Geode to check for updates:

```bash
# Enable update checking
./geode config set update_check.enabled true
./geode config set update_check.frequency daily

# Check for updates manually
./geode check-update
# Output:
# Current version: v0.2.14
# Latest version: __GEODE_TAG__
# Update available: YES
# Release notes: https://gitlab.com/devnw/codepros/geode/geode/-/releases/__GEODE_TAG__
```

### Security Advisories

Critical security updates are announced via:

- Security mailing list (<security@geodedb.com>)
- GitHub Security Advisories
- CVE database entries
- In-product security alerts

## Testing Updates

Validate updates thoroughly before production deployment.

### Staging Environment Testing

Create a staging environment mirroring production:

```bash
# Clone production data to staging
./geode backup --output /backup/prod.db
./geode restore --input /backup/prod.db --target staging:3141

# Deploy new version to staging
ssh staging "docker pull geodedb/geode:__GEODE_VERSION__"
ssh staging "docker-compose up -d"

# Run test suite
./test-harness --target staging:3141 --suite full
```

### Regression Testing

Automated regression test suite:

```bash
cd geode-test-harness

# Run comprehensive test suite
make test-all-html

# Check specific regression tests
pytest tests/regression/ -v --html=report.html
```

### Performance Testing

Benchmark performance before and after updates:

```bash
# Baseline before update
./geode benchmark --suite standard --output baseline.json

# After update
./geode benchmark --suite standard --output updated.json

# Compare results
./geode benchmark --compare baseline.json updated.json
# Output:
# Query performance: +12% faster
# Memory usage: -8% reduction
# Throughput: +15% increase
```

## Client Library Updates

Keep client libraries synchronized with server versions.

### Updating Go Client

```bash
# Update to specific version
go get geodedb.com/geode@__GEODE_TAG__

# Update to latest
go get -u geodedb.com/geode

# Verify version
go list -m geodedb.com/geode
```

### Updating Python Client

```bash
# Update to specific version
pip install geode-client==0.3.19

# Update to latest
pip install --upgrade geode-client

# Verify version
pip show geode-client
```

### Updating Rust Client

```bash
# Update Cargo.toml
[dependencies]
geode-client = "0.1.1-alpha.8"

# Update dependencies
cargo update

# Verify version
cargo tree | grep geode-client
```

### Updating Zig Client

```bash
# Update build.zig.zon
.dependencies.geode_client.url = "https://geodedb.com/zig/geode-client-0.1.0.tar.gz"

# Fetch updated dependency
zig build --fetch

# Verify version
zig build version
```

## Best Practices for Updates

### Always Backup Before Updating

```bash
# Create timestamped backup
./geode backup --output /backup/geode-$(date +%Y%m%d-%H%M%S).db

# Verify backup integrity
./geode backup --verify /backup/geode-20260124-143000.db
```

### Review Breaking Changes

Read release notes carefully, focusing on breaking changes section:

```bash
# Display breaking changes only
./geode release-notes --version __GEODE_VERSION__ --filter breaking
```

### Test in Non-Production First

Never update production directly:

1. Test in development environment
2. Validate in staging environment
3. Deploy to production during maintenance window

### Monitor After Updates

Increase monitoring for 24-48 hours after updates:

- Query performance metrics
- Error rates and types
- Memory and CPU utilization
- Connection pool statistics
- Transaction success rates

### Document Update Process

Maintain runbook for updates:

```markdown
## Geode Update Runbook

### Pre-Update Checklist
- [ ] Review release notes
- [ ] Create backup
- [ ] Notify team of maintenance window
- [ ] Prepare rollback plan

### Update Steps
1. Stop application traffic
2. Backup database
3. Deploy new version
4. Run migrations
5. Verify health checks
6. Resume traffic
7. Monitor metrics

### Rollback Steps
1. Stop new version
2. Restore from backup
3. Start previous version
4. Verify functionality
```

## Deprecation Policy

Geode follows a clear deprecation timeline to maintain stability while evolving features.

### Deprecation Process

1. **Announcement:** Feature marked as deprecated in release notes
2. **Warning Period:** Feature remains functional but logs warnings (2+ minor versions)
3. **Removal:** Feature removed in major version increment

### Migration Support

Deprecated features include migration guidance:

```bash
# Check for deprecated feature usage
./geode audit --check-deprecated
# Output:
# WARNING: Using deprecated transaction API
# Affected queries: 12
# Migration guide: https://geodedb.com/migration/transaction-api
# Removal planned: v0.2.0
```

## Community and Support

Engage with the Geode community for update assistance.

### Update Assistance Channels

- **Documentation:** /docs/releases/
- **Community Forum:** <https://community.geodedb.com>
- **GitHub Issues:** <https://github.com/geodedb/geode/issues>
- **Discord:** <https://discord.gg/geodedb>
- **Enterprise Support:** <support@geodedb.com>

### Contributing to Updates

Participate in the development process:

- Test release candidates and provide feedback
- Report bugs discovered in new versions
- Suggest features for future releases
- Contribute pull requests for fixes and enhancements

Keeping Geode updated ensures your graph database deployment benefits from continuous improvements in performance, security, and functionality while maintaining compatibility with the evolving GQL standard.
