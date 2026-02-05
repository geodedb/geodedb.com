---
title: "GQL Conformance Profile"
description: "ISO/IEC 39075:2024 GQL conformance profile for Geode documenting implementation-defined ordering, pagination, and diagnostics."
summary: "Conformance profile for Geode's ISO/IEC 39075:2024 compliance, deterministic ordering, pagination policies, diagnostics, and safety guards."
slug: "conformance-profile"
url: "/docs/gql/conformance-profile/"
date: 2026-02-05
lastmod: 2026-02-05
draft: false
weight: 30
keywords: ["GQL conformance", "ISO GQL", "GQL compliance", "ISO 39075", "conformance profile", "pagination policy", "US001"]
tags: ["GQL", "standards", "compliance", "ISO"]
categories: ["GQL"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/gql/conformance-profile/"
    noindex: false
---

<!-- CANARY: REQ=REQ-GQL-024; FEATURE="Conformance Profile Ledger"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_024_ImplDefinedCollationAndNullOrdering; OWNER=docs; UPDATED=2025-09-24 -->

# GQL Conformance Profile

This document captures implementation-defined behaviors and diagnostics relevant to ordering, pagination, and query execution. Geode maintains full ISO/IEC 39075:2024 GQL compliance; the profile explains how those requirements are met in practice.

## Supported (highlights)

The highlights below are non-exhaustive and focus on areas with implementation-defined behavior or additional policy constraints.

- MATCH with:
  - Node label and single property equality predicate (baseline)
  - Single-hop expand and bounded path expansion
  - OPTIONAL MATCH (null-preserving) semantics
- ORDER BY over RETURN items for MATCH result bindings, with deterministic comparator and JSON lexicographic tiebreak.
- LIMIT/OFFSET slicing post-ordering.
- Set operations: UNION/INTERSECT/EXCEPT (existing engine path).
- Data modification statements (CREATE/INSERT/UPDATE/DELETE/MERGE).
- Schema and type system behaviors (labels, property types, constraints, indexes).
- Functions and aggregations (scalar and aggregate semantics).
- Transaction semantics with ACID guarantees and MVCC isolation.

### Deterministic Transport Parity Evidence (Curated Datasets)

- Curated varlen determinism dataset (`data/varlen_determinism`) exercises equal-length path expansions to validate whole-row JSON lex tie-break and UA005/UA006 ordering consistency.
- Transport parity (QUIC vs gRPC) verified for: simple RETURN ordering, set operations DISTINCT, projection slices, ORDER/LIMIT/OFFSET pagination, MATCH variable-length expansions, diagnostics (US001, IllegalOrderKey), CASE 3VL null semantics, and nulls-last ordering.

// CANARY: REQ=REQ-GQL-018; FEATURE="Transport Parity VarLen Dataset Rows"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_018_TransportParity_VarLenDatasetRows; OWNER=engine; UPDATED=2025-09-24
// CANARY: REQ=REQ-GQL-091; FEATURE="Client Server Arg Passthrough"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_091_ClientServerArgPassthrough; OWNER=client; UPDATED=2025-09-24

// CANARY: REQ=REQ-GQL-017; FEATURE="Transport Parity Simple RETURN"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_017_TransportParity_ReturnOrdered; OWNER=engine; UPDATED=2025-09-24
// CANARY: REQ=REQ-GQL-017; FEATURE="Transport Parity SetOp DISTINCT"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_017_TransportParity_SetOpDistinct; OWNER=engine; UPDATED=2025-09-24
// CANARY: REQ=REQ-GQL-017; FEATURE="Transport Parity Projection Rows"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_017_TransportParity_ProjectionRows; OWNER=engine; UPDATED=2025-09-24
// CANARY: REQ=REQ-GQL-017; FEATURE="Transport Parity ORDER/LIMIT/OFFSET Rows"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_017_TransportParity_OrderPaginationRows; OWNER=engine; UPDATED=2025-09-24
// CANARY: REQ=REQ-GQL-017; FEATURE="Transport Parity MATCH VarLen Rows"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_017_TransportParity_MatchVarLenRows; OWNER=engine; UPDATED=2025-09-24

// CANARY: REQ=REQ-GQL-017; FEATURE="VarLen Path Determinism UA005/UA006"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_017_VarLenDeterminism_QUIC; OWNER=engine; UPDATED=2025-09-24
// CANARY: REQ=REQ-GQL-017; FEATURE="VarLen Path Determinism UA005/UA006"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_017_VarLenDeterminism_GRPC; OWNER=engine; UPDATED=2025-09-24
// CANARY: REQ=REQ-GQL-017; FEATURE="Transport Parity Diagnostics US001"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_017_TransportParity_US001; OWNER=engine; UPDATED=2025-09-24

## Policies and Diagnostics

- US001 (unordered pagination): LIMIT/OFFSET without explicit ORDER is rejected. Anchor: 16.18–16.19.
- IllegalOrderKey (policy): ORDER BY keys restricted to identifiers by default. Anchor: 14.10.
  // CANARY: REQ=REQ-GQL-017; FEATURE="Transport Parity Diagnostics IllegalOrderKey"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_017_TransportParity_IllegalOrderKey; OWNER=engine; UPDATED=2025-09-24
  // CANARY: REQ=REQ-GQL-017; FEATURE="Transport Parity CASE 3VL"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_017_TransportParity_Case3VL; OWNER=engine; UPDATED=2025-09-24
- Null ordering policy: implementation-defined default; see Requirements — binary collation, nulls-last policy (flagger exposed).
  // CANARY: REQ=REQ-GQL-024; FEATURE="Nulls-Last Ordering Parity"; ASPECT=Docs; STATUS=TESTED; TEST=TestCANARY_REQ_GQL_024_TransportParity_NullsLastOrder; OWNER=engine; UPDATED=2025-09-24
- UA005/UA006 (bounded path tie-break determinism): Shorter paths preferred; ties broken deterministically by bound IDs and JSON-lex row key. Transport-parity enforced by tests.

## Safety Guards (Execution Limits)

The engine enforces protective upper bounds during MATCH evaluation to prevent excessive memory or time consumption. These are implementation-defined and surfaced via diagnostics (ExecutionGuardTrip) when tripped; partial results MAY be returned (truncated) per STEAL/NO-FORCE policy while maintaining deterministic ordering of emitted rows.

- Default `max_results`: 100,000 (bindings)
- Default `max_frontier`: 100,000 (active frontier nodes / partial paths in BFS)
- Default `max_hops_limit`: 64
- Diagnostic code: `ExecutionGuardTrip`
- Policy: Guard trip preserves already produced bindings and sets deterministic ordering

// CANARY: REQ=REQ-GQL-017; FEATURE="MatchSafetyGuardsPolicy"; ASPECT=Docs; STATUS=TESTED; TEST=geodetestlab/specs/gql_pattern_matching_comprehensive.yml; TEST=TestCANARY_REQ_GQL_017_MatchGuardTrips; OWNER=engine; UPDATED=2025-09-25
// CANARY: REQ=REQ-GQL-017; FEATURE="MatchFrontierGuard"; ASPECT=Docs; STATUS=TESTED; TEST=geodetestlab/specs/gql_pattern_matching_comprehensive.yml; TEST=TestCANARY_REQ_GQL_017_MatchGuardTrips; OWNER=engine; UPDATED=2025-09-25
// CANARY: REQ=REQ-GQL-017; FEATURE="MatchResultGuard"; ASPECT=Docs; STATUS=TESTED; TEST=geodetestlab/specs/gql_pattern_matching_comprehensive.yml; TEST=TestCANARY_REQ_GQL_017_MatchGuardTrips; OWNER=engine; UPDATED=2025-09-25

## Flagger

- I:IllegalOrderKeyPolicy=ident-only
- U:US001=enforced
- U:OrderTiebreak=LexJSON
- U:PathTieBreak=UA005/UA006

## Implementation-defined

- Default collation: binary; Unicode collation optional.
- Null ordering policy: default nulls-last; nulls-first via env override.

## Wire Mapping: ExecutionGuardTrip Additional Status

// CANARY: REQ=REQ-GQL-017; FEATURE="MatchGuardStatusWireMapping"; ASPECT=Docs; STATUS=TESTED; TEST=geodetestlab/specs/gql_pattern_matching_comprehensive.yml; TEST=TestCANARY_REQ_GQL_017_MatchGuardStatusWireMapping; OWNER=engine; UPDATED=2025-09-24
When a safety guard trips during MATCH evaluation (result/frontier/hops), the server emits primary success frames with `status_class` `00000` and includes `ExecutionGuardTrip` inside the `additional_statuses` array of the `SchemaDefinition` frame and (for redundancy) the first `DataPage` frame. This indicates a partial result truncation event without elevating to an error-class status. Clients SHOULD surface a warning and MAY retry with adjusted guard thresholds. No change to exit codes (remain 0).

### Environment Overrides (Test / Diagnostics)

Guard threshold overrides (test/support use only):

- CLI (preferred for determinism):
  - `geode serve --match-max-results <N>` lowers the `max_results` guard at process start.
  - `geode serve --match-max-frontier <N>` lowers the `max_frontier` guard at process start.
- Environment (legacy/fallback): `GEODE_MATCH_MAX_RESULTS` and `GEODE_MATCH_MAX_FRONTIER` may still be set; if both CLI and env are provided, the CLI flags win.

Production deployments SHOULD leave these unset (defaults: 100,000). Frames emitted under overridden thresholds still carry the additional status for transparency.
