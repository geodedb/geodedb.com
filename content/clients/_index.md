---
title: "Client Libraries"
description: "Official client libraries for Geode Graph Database"
weight: 2
tags:
  - clients
  - sdk
  - api
categories:
  - client-libraries
  - integration
---

# Client Libraries

Geode provides official client libraries for multiple programming languages. All clients communicate via QUIC+TLS using the JSON line protocol.

## Available Clients

- [**Go**](/clients/go/) - `database/sql` driver with full prepared statement support
- [**Python**](/clients/python/) - Async client with connection pooling (aioquic)
- [**Rust**](/clients/rust/) - High-performance tokio-based client
- [**Zig**](/clients/zig/) - Native Zig implementation

## Common Features

All client libraries provide:

- **Connection Pooling** - Efficient connection management
- **Transaction Support** - Full ACID transaction support with savepoints
- **Prepared Statements** - Parameterized query execution
- **Type Safety** - Language-specific type mappings
- **Error Handling** - Rich error types with ISO GQL status codes
- **Async Support** - Non-blocking operations (where applicable)

## Protocol

All clients use:

- **Transport**: QUIC + TLS 1.3 (no TCP fallback)
- **Wire Format**: JSON line protocol
- **Default Port**: 3141 (or 8443)

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

| Client | Avg Latency | Max Throughput | Features |
|--------|-------------|----------------|----------|
| Go | 2-3ms | 1,000+ qps | connection pooling, stdlib integration |
| Python | 2-3ms | 1,000+ qps | async/await, type hints |
| Rust | 1-2ms | 10,000+ qps | zero-cost abstractions, tokio |
| Zig | 1-2ms | 10,000+ qps | native performance |

## Quick Start

### Go

```bash
go get go.codepros.org/geode
```

```go
import "database/sql"
import _ "go.codepros.org/geode"

db, err := sql.Open("geode", "geode://localhost:3141")
```

### Python

```bash
pip install geode-client
```

```python
from geode_client import GeodeClient

async with GeodeClient("localhost", 3141) as client:
    result = await client.query("MATCH (n) RETURN n")
```

### Rust

```bash
cargo add geode-client
```

```rust
use geode_client::Client;

let client = Client::connect("localhost:3141").await?;
```

### Zig

```zig
const geode = @import("geode_client");

var client = try geode.Client.init(allocator, "localhost", 3141);
defer client.deinit();
```

## Next Steps

- Choose your language and follow the detailed guide
- Review the [Protocol Specification](/docs/protocol/)
- Check out [Example Applications](/docs/examples/)
