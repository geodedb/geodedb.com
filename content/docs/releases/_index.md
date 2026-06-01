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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-06-01 -->

# Releases

Complete version history, release notes, and upgrade guides for all Geode releases.

## Overview

This section documents the current stable release, the active development line, and the major release series that landed since the docs site was last synchronized. The `v0.3` through `v0.6` series — released between April and June 2026 — added native time-series, BM25 full-text search, and OpenTelemetry instrumentation, alongside continued transport, storage, and security hardening.

{{< callout type="tip" >}}
The version shown across this site is resolved automatically from the **latest release tag** in GitLab at build time. For the authoritative, per-tag release notes, browse the [Geode tags on GitLab](https://gitlab.com/devnw/codepros/geode/geode/-/tags).
{{< /callout >}}

## Current Release

### **GEODE_TAG** (Current Stable)

**Release Date**: **GEODE_RELEASE_DATE_LONG**
**Status**: Stable release

**Key Highlights**:

- First `v0.6.x` release to clear the full `test-harness-integration` suite and reach the apt deploy chain
- Release-pipeline hardening: tag-version stamping, build-toolchain fixes, and bounded QUIC workers
- Carries the full `v0.3`–`v0.6` feature surface: native [time-series](/docs/query/timeseries/), [full-text search](/docs/query/full-text-search/), and [OpenTelemetry instrumentation](/docs/ops/observability/)
- Ships as Debian packages through the official apt repository and as `geodedb/geode:__GEODE_VERSION__` container images

See the [Changelog](/docs/reference/changelog/) for complete details.

## Development Branch

### main (unreleased)

The `main` branch can move ahead of `__GEODE_TAG__` with fixes and features that have not yet been cut into a tagged release. Track in-flight work on the [GitLab project](https://gitlab.com/devnw/codepros/geode/geode).

## Release Schedule

Geode follows a predictable release cadence:

- **Major Releases**: Architectural changes and storage-format shifts
- **Minor Releases**: New features and transport/security expansions
- **Patch Releases**: Bug fixes, security hardening, and release validation

## Version History

{{< callout type="note" >}}
The list below summarizes the major series. For the complete, authoritative per-version history, see the [GitLab tags](https://gitlab.com/devnw/codepros/geode/geode/-/tags).
{{< /callout >}}

### v0.6.0 – **GEODE_TAG** (May 25 – **GEODE_RELEASE_DATE_LONG**)

- Release-pipeline and CI hardening across the `v0.6.x` patch line
- `__GEODE_TAG__` is the first `v0.6.x` release to clear the full integration test harness and reach the apt deploy chain
- Stabilization of the time-series and full-text-search GQL surfaces introduced earlier in the line

### v0.5.0 (April 29, 2026)

- OpenTelemetry instrumentation surface — native OTLP metrics and traces (see [Observability](/docs/ops/observability/))

### v0.4.0 (April 27, 2026)

- Feature and hardening release in the `v0.3`–`v0.5` development line

### v0.3.0 (April 12, 2026)

- First release of the `v0.3` series, continuing the storage, transport, and GQL work that followed the `v0.2` line

### Major capabilities added since the last docs sync

- **Native time-series** — the `geode.ts.*` GQL procedure surface for append-friendly `(ts, value)` series ([docs](/docs/query/timeseries/))
- **Full-text search** — durable, BM25-ranked fulltext indexes via `CREATE INDEX ... USING fulltext` and `CALL geode.fts.search(...)` ([docs](/docs/query/full-text-search/))
- **OpenTelemetry** — first-party OTLP metrics and `geode.query.execute` traces ([docs](/docs/ops/observability/))

### v0.2.12 - v0.2.15 (March 27-29, 2026)

- gRPC parity fixes for RLS, auth rate limiting, CDC, and backup lock behavior
- QUIC stream multiplexing and major poll-loop/accept-loop performance work
- CTE execution, DOT output fixes, and cross-compilation hardening for 32-bit ARM
- full-suite and unit-test hardening across the new storage path

### v0.2.0 - v0.2.11 (March 26-27, 2026)

- DSN graph binding and HELLO-time graph resolution
- graph-storage engine integration with adapter bridge
- TLS/CA certificate handling improvements and local CA auto-detection
- security hardening for MFA, `--graph`, KMS tokens, metrics binding, and password handling

### v0.1.11 - v0.1.39 (February 27-March 25, 2026)

- auth graph storage, HMAC integrity verification, and offline auth maintenance commands
- QUIC/TLS handshake, DNS, and shell keepalive fixes
- per-graph storage isolation and backup/restore changes
- `ORDER BY` large-result crash fix
- DSN graph binding groundwork culminating in `v0.1.39`

### v0.1.3 (January 2026)

- original production-ready release
- GQL compliance milestone
- enterprise security, analytics, and operational baseline

## Upgrading Geode

### Before Upgrading

1. **Read Release Notes**: Review changes, especially storage and transport changes
2. **Test in Staging**: Upgrade a staging environment first
3. **Backup Data**: Create a full backup before upgrading
4. **Check Compatibility**: Verify client library, DSN, and certificate usage
5. **Review storage format changes**: `v0.1.28+` introduced per-graph storage; later releases removed the legacy monolithic path entirely

### Example Docker Upgrade

```bash
# 1. Backup
docker exec geode geode backup --output /backups/pre-upgrade.tar.gz

# 2. Pull new image
docker pull geodedb/geode:__GEODE_VERSION__

# 3. Stop container
docker stop geode

# 4. Start new container (data persists in volume)
docker run -d \
  -p 3141:3141 \
  -v geode-data:/var/lib/geode \
  --name geode \
  geodedb/geode:__GEODE_VERSION__
```

### Recommended Client Versions

Always pair the current server with the latest client library releases:

| Client | Recommended Version |
|--------|---------------------|
| Go | {{< version "clients.go" >}} |
| Python | {{< version "clients.python" >}} |
| Rust | {{< version "clients.rust" >}} |
| Zig | {{< version "clients.zig" >}} |
| Node.js | {{< version "clients.nodejs" >}} |

See [Client Libraries](/docs/client-libraries/) for installation and compatibility details.

## Related Documentation

- [Changelog](/docs/reference/changelog/)
- [Upgrade Procedures](/docs/operations/upgrades/)
- [DSN Specification](/docs/reference/dsn/)
- [Geode UI](/docs/geode-ui/)
