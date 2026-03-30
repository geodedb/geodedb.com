---
title: "Changelog"
description: "Complete version history and release notes for Geode graph database with breaking changes, new features, and migration guides"
url: /docs/reference/changelog/
keywords: ["changelog", "release notes", "version history", "updates", "migration", "breaking changes", "new features", "bug fixes", "deprecations"]
weight: 60
slug: "changelog"
canonical: "https://geodedb.com/docs/reference/changelog/"
---

<!-- CANARY: REQ=REQ-API-DOCS-002; FEATURE="APIDocumentation"; ASPECT=BuildTarget; STATUS=EXEMPT; OWNER=tooling; UPDATED=2026-03-30 -->

# Changelog

Complete version history and release notes for Geode graph database.

## Current Status (__GEODE_RELEASE_MONTH_YEAR__)

__Current stable release__: `__GEODE_TAG__`
__Current development branch__: `main` (unreleased)

The docs site was last synchronized with Geode changes on February 13, 2026. Since then, `../geode` has added 316 commits across storage-engine migration, DSN graph binding, graph-storage integration, QUIC transport work, security hardening, gRPC parity, CTE execution, and ARM32 compatibility.

__Current quality snapshot__:

- `619/619` unit tests passing on the `__GEODE_TAG__` release line
- Full geodetestlab audit on 2026-03-29: `3847 passed`, `70 failed`, `35 skipped` (`3952` total)
- `70/70` GQL conformance profile tests still tracked as passing
- Three currently documented open gaps on `main`:
  - `GAP-0270`: CLI auth commands still operate on local storage instead of delegating to a running server
  - `GAP-0271`: FLE role parsing must reject semicolon-delimited role injection
  - `GAP-0272`: `geode query -` can fail silently on one bulk `MERGE` stdin batch

## Recent Mainline Work

These changes reflect unreleased follow-up work observed on `main` during the March 2026 sync window.

### Storage reliability and restart correctness

- Removed legacy `graph_store.dat` persistence on `main`; engine-backed persistence is now the only path
- Persisted graph name-to-UUID mappings so restarts reopen the correct on-disk graph directories
- Rebuilt free-space bitmaps on open so previously written pages remain visible after restart
- Reloaded in-memory node/edge state after catalog open so engine-backed graphs repopulate correctly
- Persisted adapter label dictionaries alongside graph checkpoints
- Fixed UUID truncation and UUID-to-slot translation errors that affected restart correctness

### Encryption and QUIC follow-ups

- Wired pager-level TDE page encryption into graph-storage read/write paths
- Upgraded the QUIC dependency and switched accept handling to condition-variable waiting
- Reduced QUIC idle polling frequency to lower background CPU usage

### Audit updates

- Published the latest full-suite audit results and the three remaining open gaps (`GAP-0270` through `GAP-0272`)

## Stable Releases

### [v0.2.15] - 2026-03-29

__Status__: Stable patch release

__Highlights__:

- Fixed UUIDv7 generation on 32-bit ARM by replacing unsupported 64-bit atomics with mutex-protected state
- Carried forward the CTE execution and DOT output fixes from `v0.2.14`
- Confirmed all cross-compile targets and `619/619` unit tests passing on the release line

### [v0.2.14] - 2026-03-28

__Status__: Stable patch release

__Highlights__:

- Wired `WITH RECURSIVE` / CTE execution into the query engine
- Fixed DOT graph output regressions
- Corrected test-harness false positives that rejected valid GQL query text
- Improved full-suite results to `3692/3926` passing on the tagged release

### [v0.2.13] - 2026-03-27

__Status__: Stable feature/performance release

__Highlights__:

- Added server-side QUIC stream multiplexing
- Added a dedicated poll thread and improved accept-loop behavior
- Updated vendored QUIC code for ACK-race, handshake-lock, and bytes-in-flight fixes
- Increased measured single-client load throughput from roughly `19 QPS` to `247 QPS`

### [v0.2.12] - 2026-03-27

__Status__: Stable hardening release

__Highlights__:

- Wired RLS filtering, auth rate limiting, and CDC locking into the gRPC transport
- Populated per-graph `.store` files during persistence and shutdown checkpointing
- Removed admin password leakage from structured logs
- Added SSRF validation for webhook URLs
- Improved large-graph persistence behavior by streaming non-TDE loads and reducing TDE finalization memory pressure
- Tagged full-suite result: `3891 passed`, `0 failed`, `35 skipped` (`3926` total)

### [v0.2.0 - v0.2.11] - 2026-03-26 through 2026-03-27

__Series summary__:

- Added DSN graph binding with HELLO-time graph resolution and session isolation
- Integrated the graph-storage engine behind the existing execution engine
- Added per-graph checkpoint hooks, storage flush fixes, and graph-routing safety work
- Hardened TLS and certificate handling, including local CA auto-detection and system-readable cert paths
- Closed multiple security gaps:
  - cryptographic randomness for MFA secrets
  - `--graph` validation to prevent injection
  - QUIC auth rate limiting
  - constant-time token comparisons
  - metrics bound to localhost by default
- Fixed DISTINCT collision verification and several adjacency-index performance issues

### [v0.1.11 - v0.1.39] - 2026-02-27 through 2026-03-25

__Series summary__:

- Introduced graph-backed authentication storage with HMAC integrity verification and offline `auth init|reseal|verify` workflows
- Added API key, MFA, and auth graph persistence improvements
- Fixed DNS resolution, hostname handling, and QUIC handshake regressions
- Added QUIC keepalive and concurrency fixes for the shell and clients
- Added per-graph storage isolation, automatic migration away from monolithic storage, and updated backup/restore flows
- Fixed large-result `ORDER BY` crashes (`GAP-0257`)
- Added DSN graph binding, graph-bound session enforcement, and server-side graph auto-create semantics

### [v0.1.3] - Production Ready Release (January 2026)

`v0.1.3` remains the original production-ready milestone that first brought the docs site into parity: GQL compliance, enterprise security, backup/recovery, analytics, and the first stable operational baseline.

## Release Line Summary

| Series | Window | Primary Changes |
|--------|--------|-----------------|
| `v0.2.15` | 2026-03-29 | ARM32 UUIDv7 fix, CTE execution, DOT output |
| `v0.2.12-v0.2.14` | 2026-03-27 to 2026-03-28 | gRPC parity, QUIC multiplexing, CTE execution, test-harness fixes |
| `v0.2.0-v0.2.11` | 2026-03-26 to 2026-03-27 | DSN graph binding, graph-storage integration, security hardening |
| `v0.1.11-v0.1.39` | 2026-02-27 to 2026-03-25 | auth graph storage, TLS/QUIC fixes, per-graph storage, large-result stability |
| `v0.1.3` | 2026-01 | original production-ready milestone |

## Upgrade Notes

### Recommended reading before upgrading

- Read the [`DSN` specification](/docs/reference/dsn/) if you use connection strings or graph-bound sessions
- Read the [`Upgrade Procedures`](/docs/operations/upgrades/) page before moving from `v0.1.x` into `v0.2.x`
- Review the security pages if you depend on auth automation, API keys, or FLE access controls
- If you need the post-`v0.2.15` storage and pager-encryption fixes, track `main` or wait for the next patch tag rather than assuming they are part of `v0.2.15`

## References

- [Releases](/docs/releases/)
- [Upgrade Procedures](/docs/operations/upgrades/)
- [DSN Specification](/docs/reference/dsn/)
- [Testing Guide](/docs/development/testing-guide/)
