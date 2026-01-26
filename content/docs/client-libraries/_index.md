---
title: "Client Libraries"
description: "Official Geode client libraries for Go, Python, Rust, Node.js, and Zig with QUIC + TLS support"
weight: 50
keywords:
  - Geode client libraries
  - GQL SDKs
  - graph database drivers
  - Go Python Rust Node.js Zig
  - QUIC TLS clients
---

# Client Libraries

Geode provides official client libraries for multiple programming languages. All clients use the same QUIC + TLS 1.3 protocol and JSON line framing, while higher-level APIs vary by language.

## Available Libraries

- **Go** - `database/sql` driver (`go.codepros.org/geode`) - [Go client docs](go-client/)
- **Python** - Async client (`geode-client`) - [Python client docs](python-client/)
- **Rust** - tokio + Quinn client (`geode-client`) - [Rust client docs](rust-client/)
- **Node.js** - TypeScript-first client (`@geode/client`) - [Node.js client docs](nodejs-client/)
- **Zig** - Low-level QUIC client - [Zig client docs](zig-client/)

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
    page, _ = await conn.query("RETURN 1 AS ok")
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

### Node.js

```bash
npm install @geode/client
```

```ts
import { createClient } from '@geode/client';

const client = await createClient('geode://localhost:3141');
const rows = await client.queryAll('RETURN 1 AS ok');
```

### Zig

```zig
const geode = @import("geode_client");

var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
```

## Protocol Consistency

All clients speak the same protocol messages (`HELLO`, `RUN_GQL`, `PULL`, `BEGIN`, `COMMIT`, `ROLLBACK`) and surface ISO/IEC 39075 status classes in errors. Connection pooling and query builders are provided where available.

## Choosing a Client

- **Go**: `database/sql` integration with standard pooling and prepared statements.
- **Python**: Async workflows, connection pooling, and query builder helpers.
- **Rust**: tokio-based performance with typed values and DSN parsing.
- **Node.js**: TypeScript-first API with pooling, query builders, and batching.
- **Zig**: Low-level QUIC access for native integrations.

## Next Steps

- Review the [client comparison](client-comparison/)
- Jump to the language-specific API guides above
