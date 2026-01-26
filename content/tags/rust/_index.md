---
title: "Rust Client Library - tokio + Quinn QUIC for Geode"
description: "Geode Rust client with Quinn QUIC transport, tokio async support, prepared statements, query builders, and typed values."
keywords:
  - Rust client
  - tokio
  - Quinn QUIC
  - geode-client
  - Rust graph database
  - GQL driver
params:
  seo:
    canonical: "https://geodedb.com/tags/rust/"
    noindex: false
---

<!-- CANARY: REQ=REQ-CLIENT-RUST-001; FEATURE="RustClientConnection"; ASPECT=HelloHandshake; STATUS=IMPL; OWNER=clients; UPDATED=2025-02-14 -->

# Rust Client Library

The Geode Rust client uses Quinn over QUIC and tokio for async execution. It provides typed values, prepared statements, query builders, and a basic connection pool.

## Quick Start

```rust
use geode_client::Client;

let client = Client::new("localhost", 3141);
let mut conn = client.connect().await?;
let (page, _) = conn.query("RETURN 1 AS ok").await?;
```

## Related Links

- [Rust Client Docs](/docs/client-libraries/rust-client/)
- [Client Libraries Overview](/docs/client-libraries/)
