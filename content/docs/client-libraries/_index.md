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

Geode provides official client libraries for multiple programming languages. All clients speak the same **Protobuf wire protocol** over QUIC (default) or gRPC, while higher-level APIs vary by language.

## Available Libraries

- **Go** - `database/sql` driver (`geodedb.com/geode`) - [Go client docs](/docs/client-libraries/go-client/)
- **Python** - Async client (`geode-client`) - [Python client docs](/docs/client-libraries/python-client/)
- **Rust** - tokio-based client (`geode-client`) - [Rust client docs](/docs/client-libraries/rust-client/)
- **Node.js** - TypeScript-first client (`@geodedb/client`) - [Node.js client docs](/docs/client-libraries/nodejs-client/)
- **Zig** - Low-level QUIC/gRPC client - [Zig client docs](/docs/client-libraries/zig-client/)

## Quick Start

### Go

```bash
go get geodedb.com/geode
```

```go
import (
    "database/sql"

    _ "geodedb.com/geode"
)

db, err := sql.Open("geode", "quic://localhost:3141")
```

### Python

```bash
pip install geode-client
```

```python
from geode_client import open_database

client = open_database("quic://localhost:3141")
async with client.connection() as conn:
    page, _ = await conn.query("RETURN 1 AS ok")
```

### Rust

```bash
cargo add geode-client
```

```rust
use geode_client::Client;

let client = Client::from_dsn("quic://localhost:3141")?;
let mut conn = client.connect().await?;
```

### Node.js

```bash
npm install @geodedb/client
```

```ts
import { createClient } from '@geodedb/client';

const client = await createClient('quic://localhost:3141');
const rows = await client.queryAll('RETURN 1 AS ok');
```

### Zig

```zig
const geode = @import("geode_client");

var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
```

## Protocol Consistency

All clients speak the same Protobuf message set (`Hello`, `Execute`, `Pull`, `Begin`, `Commit`, `Rollback`) and surface ISO/IEC 39075 status classes in errors. Connection pooling and query builders are provided where available.

## Choosing a Client

- **Go**: `database/sql` integration with standard pooling and prepared statements.
- **Python**: Async workflows, connection pooling, and gRPC/QUIC support.
- **Rust**: tokio-based performance with typed values and DSN parsing.
- **Node.js**: TypeScript-first API with pooling, query builders, and batching.
- **Zig**: Low-level QUIC/gRPC access for native integrations.

## Next Steps

- Review the [client comparison](/docs/client-libraries/client-comparison/)
- Jump to the language-specific API guides above
