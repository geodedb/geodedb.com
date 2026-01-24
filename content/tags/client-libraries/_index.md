---
title: "Client Libraries"
description: "Production-ready Geode client libraries for Go, Python, Rust, and Zig with connection pooling, transaction support, type safety, and high performance for graph database integration."
keywords:
  - client libraries
  - SDK
  - database drivers
  - API clients
  - programming language support
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/client-libraries/"
    noindex: false
---

# Client Libraries

Geode provides production-ready client libraries for Go, Python, Rust, and Zig, each optimized for their respective language ecosystems while maintaining consistent behavior through the ISO/IEC 39075:2024 GQL standard. All clients communicate via QUIC+TLS for high performance and security.

## Available Client Libraries

### Go Client - database/sql Driver

The Go client implements the standard `database/sql` interface for seamless integration:

```go
import (
    "database/sql"
    _ "go.codepros.org/geode"
)

db, err := sql.Open("geode", "geode://localhost:3141/graph")
defer db.Close()

rows, err := db.Query("MATCH (n:User) RETURN n LIMIT 10")
```

**Features**: Connection pooling, prepared statements, context support, transaction management

**Performance**: 5,000+ queries/second

**Documentation**: [Go Client Guide](/docs/clients/go/)

### Python Client - Async/Await

Async-first Python client with type-safe interfaces:

```python
from geode_client import GeodeClient

async with GeodeClient("localhost:3141") as client:
    result = await client.execute("MATCH (n:User) RETURN n LIMIT 10")
    for row in result:
        print(row)
```

**Features**: asyncio integration, connection pooling, query builders, RLS support

**Performance**: 1,000+ queries/second

**Documentation**: [Python Client Guide](/docs/clients/python/)

### Rust Client - Zero-Cost Abstractions

High-performance Rust client with tokio:

```rust
use geode_client::Client;

let client = Client::connect("localhost:3141").await?;
let results = client.execute(
    "MATCH (n:User) RETURN n LIMIT 10",
    &[]
).await?;
```

**Features**: Compile-time type safety, tokio integration, serde support

**Performance**: 10,000+ queries/second

**Documentation**: [Rust Client Guide](/docs/clients/rust/)

### Zig Client - Systems Programming

Low-level Zig client with memory safety:

```zig
var client = try geode.Client.connect(allocator, "localhost:3141");
defer client.deinit();

var result = try client.execute(
    "MATCH (n:User) RETURN n LIMIT 10",
    params
);
```

**Features**: Memory safety, comptime features, vendored QUIC

**Performance**: 8,000+ queries/second

**Documentation**: [Zig Client Guide](/docs/clients/zig/)

## Common Features

All client libraries provide:

- **QUIC+TLS Communication**: High-performance, encrypted transport
- **Connection Pooling**: Configurable connection management
- **Transaction Support**: Full ACID transactions with savepoints
- **Prepared Statements**: Query compilation and caching
- **Error Handling**: ISO-compliant error codes with language-appropriate types
- **Parameter Binding**: Safe, type-checked parameter substitution
- **Streaming Results**: Memory-efficient large result set handling

## Related Topics

- [SDK](/tags/sdk/) - Software Development Kits
- [API Development](/tags/api/) - API integration
- [Integration](/tags/integration/) - System integration patterns

## Further Reading

- [Client Library Comparison](/docs/clients/comparison/)
- [Installation Guides](/docs/getting-started/installation/)
- [Examples](/docs/examples/)
