---
title: "Client Libraries"
description: "Official client libraries for Geode Graph Database"
weight: 2
tags:
  - clients
  - sdk
  - api
categories:
keywords:
  - Geode clients
  - graph database drivers
  - GQL SDKs
  - client libraries
  - API clients
  - client-libraries
  - integration
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Client Libraries

Geode provides official client libraries for multiple programming languages. All clients communicate via QUIC+TLS using the JSON line protocol.

## Available Clients

- [**Go**](/clients/go/) - `database/sql` driver with QUIC + TLS
- [**Python**](/clients/python/) - Async QUIC client with pooling helpers
- [**Rust**](/clients/rust/) - tokio + Quinn client for high-throughput workloads
- [**Node.js**](/clients/nodejs/) - TypeScript-first client with pooling
- [**Zig**](/clients/zig/) - Low-level QUIC client for native integration

## Common Features

All client libraries share the same wire protocol but expose different levels of convenience. Core protocol features are consistent; higher-level helpers vary by language.

Common capabilities:

- **QUIC + TLS 1.3 transport** for secure low-latency sessions
- **GQL execution** via `RUN_GQL` + `PULL`
- **Transaction messages** via `BEGIN`, `COMMIT`, `ROLLBACK`
- **Error codes** aligned with ISO/IEC 39075 status classes

## Protocol

All clients use:

- **Transport**: QUIC + TLS 1.3 (no TCP fallback)
- **Wire Format**: JSON line protocol
- **Default Port**: 3141 (configurable per deployment)

### Message Types

**Client Messages**:
- `HELLO` - Connection handshake
- `RUN_GQL` - Execute GQL query
- `PULL` - Fetch result rows
- `BEGIN` / `COMMIT` / `ROLLBACK` - Transaction control
- `PING` - Keep-alive

**Server Responses**:
- `SCHEMA` - Query schema information
- `BINDINGS` - Result rows
- `ERROR` - Error details with ISO codes
- `EXPLAIN` - Query execution plan
- `PROFILE` - Performance metrics

## Performance Comparison

Client-side latency and throughput are workload-dependent and vary by runtime, network conditions, and server limits.

| Client | Latency | Throughput | Features |
|--------|---------|------------|----------|
| Go | Workload-dependent | Workload-dependent | database/sql integration |
| Python | Workload-dependent | Workload-dependent | async/await, pooling |
| Rust | Workload-dependent | Workload-dependent | tokio + Quinn |
| Node.js | Workload-dependent | Workload-dependent | TypeScript, pooling |
| Zig | Workload-dependent | Workload-dependent | low-level protocol access |

## Quick Start

### Go

```bash
go get go.codepros.org/geode
```

```go
import (
    "database/sql"

    _ "go.codepros.org/geode"
)

db, err := sql.Open("geode", "localhost:3141")
```

### Python

```bash
pip install geode-client
```

```python
from geode_client import Client

client = Client(host="localhost", port=3141)
async with client.connection() as conn:
    page, _ = await conn.query("MATCH (n) RETURN n")
```

### Rust

```bash
cargo add geode-client
```

```rust
use geode_client::Client;

let client = Client::new("localhost", 3141);
let mut conn = client.connect().await?;
```

### Zig

```zig
const geode = @import("geode_client");

var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
defer client.deinit();
```

### Node.js

```bash
npm install @geode/client
```

```ts
import { createClient } from '@geode/client';

const client = await createClient('geode://localhost:3141');
const rows = await client.queryAll('RETURN 1 AS ok');
```

## Next Steps

- Choose your language and follow the detailed guide
- Review the [Protocol Specification](/docs/protocol/)
- Check out [Example Applications](/docs/examples/)
