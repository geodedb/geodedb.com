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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-03-30 -->

# Releases

Complete version history, release notes, and upgrade guides for all Geode releases.

## Overview

This section documents the current stable release, the active development line, and the major release series that landed after the docs site was last synchronized in February 2026.

## Current Release

### __GEODE_TAG__ (Current Stable)

__Release Date__: __GEODE_RELEASE_DATE_LONG__
__Status__: Stable patch release

__Key Highlights__:

- fixes UUIDv7 generation for 32-bit ARM targets
- includes the March 28 CTE execution and DOT output fixes
- confirms `619/619` unit tests passing on the release line
- continues the `v0.2.x` storage, QUIC, and security work started earlier in March

See [Changelog](/docs/reference/changelog/) for complete details.

## Development Branch

### main (unreleased)

The `main` branch can move ahead of `__GEODE_TAG__`. Recent follow-up areas have included:

- engine-backed persistence only (legacy `graph_store.dat` removed)
- graph name-to-UUID persistence fixes
- free-space bitmap rebuild-on-open
- post-open reload of graph state into memory
- pager-level TDE page encryption wiring
- lower-idle-CPU QUIC accept/poll behavior
- current open-gap documentation for `GAP-0270` through `GAP-0272`

## Release Schedule

Geode follows a predictable release schedule:

- __Major Releases__: Architectural changes and storage-format shifts
- __Minor Releases__: New features and transport/security expansions
- __Patch Releases__: Bug fixes, security hardening, and release validation

## Version History

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

1. __Read Release Notes__: Review changes, especially storage and transport changes
2. __Test in Staging__: Upgrade a staging environment first
3. __Backup Data__: Create a full backup before upgrading
4. __Check Compatibility__: Verify client library, DSN, and certificate usage
5. __Review storage format changes__: `v0.1.28+` introduced per-graph storage; `main` after `v0.2.15` removes the legacy monolithic path entirely

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

### Compatibility

| Server Version | Go Client | Python Client | Rust Client | Zig Client |
|----------------|-----------|---------------|-------------|------------|
| v0.2.x | rolling | 0.3.19+ | 0.1.1-alpha.8+ | 0.1.0+ |
| v0.1.39 | rolling | 0.3.19+ | 0.1.1-alpha.8+ | 0.1.0+ |

## Breaking-Change Themes

- `v0.2.x` introduces graph-bound DSNs and stronger graph/session isolation semantics
- March 2026 storage work moved from monolithic persistence toward per-graph and graph-storage-backed layouts
- auth and security tooling now include offline graph-backed integrity workflows in addition to online login/session flows

## Related Documentation

- [Changelog](/docs/reference/changelog/)
- [Upgrade Procedures](/docs/operations/upgrades/)
- [DSN Specification](/docs/reference/dsn/)
