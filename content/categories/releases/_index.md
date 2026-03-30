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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-03-30 -->

The **Releases and Changelog** category documents the evolution of Geode across all versions, including release notes, new features, bug fixes, breaking changes, and upgrade guidance.

## Current Stable Release

**Geode **GEODE_TAG**** (**GEODE_RELEASE_DATE_LONG**) - Current Stable

This is the current stable release line for the docs site. It includes the current storage and transport release train through the fixes shipped in `__GEODE_TAG__`.

**Status**: Recommended for production deployments

**Key Highlights**:

- 100% GQL compliance (see conformance profile)
- DSN graph binding and graph-bound session isolation
- graph-storage engine integration and per-graph storage evolution
- enterprise security hardening across QUIC, gRPC, MFA, API keys, and TDE
- QUIC multiplexing and major latency / throughput improvements
- polyglot client libraries (Go, Python, Rust, Node.js, Zig)

## Release History

### v0.2.12 - v0.2.15 (March 27-29, 2026)

- gRPC parity fixes for RLS, auth rate limiting, CDC, and backup lock behavior
- QUIC stream multiplexing and dedicated poll-thread architecture
- CTE execution wired into the query engine
- DOT output fixes and cross-compilation hardening for 32-bit ARM
- full-suite validation on the March 2026 release train

### v0.2.0 - v0.2.11 (March 26-27, 2026)

- DSN graph binding and HELLO-time graph resolution
- graph-storage engine integration with adapter bridge
- TLS/CA certificate auto-detection and local trust-path improvements
- security hardening for MFA, `--graph`, KMS token comparisons, metrics binding, and password handling

### v0.1.11 - v0.1.39 (February 27-March 25, 2026)

- auth graph storage, HMAC integrity verification, and offline auth maintenance commands
- QUIC/TLS handshake, DNS, and shell keepalive fixes
- per-graph storage isolation and backup/restore changes
- `ORDER BY` large-result crash fix
- DSN graph binding groundwork culminating in `v0.1.39`

### v0.1.3 - Production Ready (January 2026)

- original production-ready milestone
- GQL compliance baseline
- enterprise security, analytics, and operational documentation baseline

## What Changed Most Since February 2026

1. **Connection semantics**: DSNs can now bind a session to a graph during the HELLO handshake.
2. **Storage internals**: Geode moved from monolithic persistence toward per-graph and graph-storage-backed layouts.
3. **Transport behavior**: QUIC now includes multiplexing, improved polling, and better retry/handshake behavior.
4. **Security posture**: gRPC parity, auth rate limiting, password-handling fixes, and stronger TLS/CA handling all landed in March.

## Upgrade Guidance

- Read the [Changelog](/docs/reference/changelog/) before any `v0.1.x` to `v0.2.x` upgrade.
- Validate DSN handling if your clients now use graph-bound sessions.
- Back up before moving across the March 2026 storage release train.
- If you need the persistence and pager-encryption fixes that landed after `__GEODE_TAG__`, follow `main` or wait for the next patch tag.
