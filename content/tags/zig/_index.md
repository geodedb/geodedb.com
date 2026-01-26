---
title: "Zig Client Library - Low-Level QUIC for Geode"
description: "Geode Zig client for native integrations with low-level QUIC protocol control and direct message handling."
keywords:
  - Zig client
  - Geode Zig SDK
  - QUIC protocol
  - graph database Zig
  - GQL client
params:
  seo:
    canonical: "https://geodedb.com/tags/zig/"
    noindex: false
---

<!-- CANARY: REQ=REQ-ZIG-CLIENT-002; FEATURE="Zig Client v2"; ASPECT=QuicPackageClient; STATUS=IMPL; OWNER=clients; UPDATED=2026-01-24 -->

# Zig Client Library

The Zig client exposes low-level QUIC primitives for Geode. It is ideal for systems that need direct control over protocol messages.

## Quick Start

```zig
const std = @import("std");
const geode = @import("geode_client");

var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
try client.connect();
```

## Related Links

- [Zig Client Docs](/docs/client-libraries/zig-client/)
- [Client Libraries Overview](/docs/client-libraries/)
