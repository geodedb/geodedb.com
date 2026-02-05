---
title: "GQL Standards Compliance"
description: "Geode's ISO/IEC 39075:2024 100% GQL compliance with scope, diagnostics, and standards-aligned behaviors."
keywords:
  - GQL compliance
  - ISO compliance
  - GQL standards
  - ISO/IEC 39075:2024
  - standards conformance
  - GQL certification
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/gql-compliance/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Geode publishes an ISO/IEC 39075:2024 GQL conformance profile documenting implementation-defined behaviors. This tag collects documentation that explains the supported scope, diagnostics, and standards-aligned behaviors.

## Conformance Summary

- **Standard**: ISO/IEC 39075:2024 (GQL)
- **Profile**: ISO/IEC 39075:2024 compliance (see conformance profile)
- **Scope Highlights**:
  - MATCH and OPTIONAL MATCH with bounded expansions
  - ORDER BY with deterministic ordering and pagination policies
  - LIMIT/OFFSET rules (unordered pagination rejected per US001)
  - Set operations (UNION, INTERSECT, EXCEPT)
- **Diagnostics**: US001, IllegalOrderKey, null ordering policy
- **Transport Parity**: QUIC and gRPC parity for profile scope

## Related Documentation

- [GQL Conformance Profile](/docs/gql/conformance-profile/) - Authoritative scope and diagnostics
- [GQL Guide](/docs/gql/guide/) - Executable examples for MATCH patterns
- [GQL Reference](/docs/gql-reference/) - Language reference and syntax
- [Status Codes](/docs/reference/status-codes/) - ISO GQL status codes and handling
