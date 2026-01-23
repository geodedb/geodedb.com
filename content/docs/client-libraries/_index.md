---
title: "Client Libraries"
description: "Official client libraries for Go, Python, Rust, and Zig with QUIC+TLS support"
weight: 50
---

# Client Libraries

Geode provides official client libraries for multiple programming languages, all implementing the same QUIC+TLS protocol for high-performance, secure communication with the Geode server.

## Available Libraries

### Go Client (Production Ready)

Full `database/sql` driver implementation with connection pooling and transaction support.

- **Package**: `go.codepros.org/geode`
- **Status**: Production Ready
- **Features**: Complete `database/sql` interface, prepared statements, context support
- **Performance**: High throughput with connection pooling

[Go Client Documentation →](go-client/)

### Python Client (Async)

Modern async Python client with full type hints and asyncio support.

- **Package**: `geode-client`
- **Status**: Production Ready
- **Features**: Fully async with type hints, connection pooling, query builders
- **Performance**: 1000+ queries/second with pooling

[Python Client Documentation →](python-client/)

### Rust Client (High Performance)

Type-safe async Rust client with zero-cost abstractions.

- **Package**: `geode-client`
- **Status**: Production Ready
- **Features**: Tokio-based async, type-safe API, connection pooling
- **Performance**: 10,000+ queries/second

[Rust Client Documentation →](rust-client/)

### Zig Client (Native)

Native Zig client library (coming soon).

- **Status**: In Development
- **Features**: Zero allocations, comptime type safety
- **Performance**: Maximum performance with minimal overhead

## Quick Start

### Go

```bash
go get go.codepros.org/geode
```

```go
package main

import (
    "database/sql"
    _ "go.codepros.org/geode"
)

func main() {
    db, _ := sql.Open("geode", "localhost:3141?insecure=true")
    defer db.Close()

    rows, _ := db.Query("MATCH (n:Person) RETURN n.name LIMIT 10")
    defer rows.Close()

    for rows.Next() {
        var name string
        rows.Scan(&name)
        println(name)
    }
}
```

### Python

```bash
pip install geode-client
```

```python
import asyncio
from geode_client import Client

async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        page, _ = await conn.query("MATCH (n:Person) RETURN n.name LIMIT 10")

        for row in page.rows:
            name = row["name"].as_string
            print(name)

asyncio.run(main())
```

### Rust

```bash
cargo add geode-client
cargo add tokio --features full
```

```rust
use geode_client::{Client, Result};

#[tokio::main]
async fn main() -> Result<()> {
    let client = Client::new("localhost", 3141)
        .skip_verify(true);

    let conn = client.connect().await?;
    let page = conn.query("MATCH (n:Person) RETURN n.name LIMIT 10", None).await?;

    for row in &page.rows {
        let name = row.get("name").unwrap().as_string()?;
        println!("{}", name);
    }

    Ok(())
}
```

## Common Features

All client libraries share these core features:

### QUIC+TLS Transport

- Modern, multiplexed protocol
- TLS 1.3 encryption mandatory
- Low latency connections
- Connection migration support

### Authentication

```go
// Go
db, _ := sql.Open("geode", "user:password@localhost:3141")
```

```python
# Python
client = Client(host="localhost", port=3141, username="user", password="password")
```

```rust
// Rust
let client = Client::new("localhost", 3141)
    .auth("user", "password");
```

### Transactions

```go
// Go
tx, _ := db.Begin()
tx.Exec("CREATE (n:Person {name: 'Alice'})")
tx.Commit()
```

```python
# Python
async with conn:
    await conn.begin()
    await conn.execute("CREATE (n:Person {name: 'Alice'})")
    await conn.commit()
```

```rust
// Rust
conn.begin()?;
conn.query("CREATE (n:Person {name: 'Alice'})", None)?;
conn.commit()?;
```

### Parameterized Queries

```go
// Go
rows, _ := db.Query("MATCH (n:Person {name: ?}) RETURN n", "Alice")
```

```python
# Python
page, _ = await conn.query(
    "MATCH (n:Person {name: $name}) RETURN n",
    {"name": "Alice"}
)
```

```rust
// Rust
let mut params = HashMap::new();
params.insert("name".to_string(), json!("Alice"));
let page = conn.query("MATCH (n:Person {name: $name}) RETURN n", Some(params)).await?;
```

### Connection Pooling

```go
// Go - built into database/sql
db.SetMaxOpenConns(100)
db.SetMaxIdleConns(25)
```

```python
# Python - ConnectionPool
pool = ConnectionPool(host="localhost", port=3141, min_size=2, max_size=10)
async with pool.acquire() as conn:
    page, _ = await conn.query("RETURN 1")
```

```rust
// Rust - ConnectionPool
let pool = ConnectionPool::new("localhost", 3141, 100);
let conn = pool.acquire().await?;
```

## Protocol Details

All clients implement the Geode wire protocol:

### Connection Handshake

```
Client → Server: HELLO
{
  "type": "HELLO",
  "name": "client-name",
  "version": "1.0",
  "conformance": "min",
  "tenant_id": "optional-tenant"
}

Server → Client: SCHEMA
{
  "type": "SCHEMA",
  "fields": [...]
}
```

### Query Execution

```
Client → Server: RUN_GQL
{
  "type": "RUN_GQL",
  "query": "MATCH (n) RETURN n LIMIT 10",
  "params": {}
}

Server → Client: BINDINGS (multiple)
{
  "type": "BINDINGS",
  "rows": [...]
}

Client → Server: PULL
{
  "type": "PULL",
  "n": 1000
}
```

## Error Handling

All clients provide rich error types:

### Go

```go
import "go.codepros.org/geode"

rows, err := db.Query("INVALID QUERY")
if err != nil {
    var derr *geode.DriverError
    if errors.As(err, &derr) {
        log.Printf("Code: %s, Message: %s", derr.Code, derr.Message)
        if derr.IsRetryable() {
            // Retry the operation
        }
    }
}
```

### Python

```python
from geode_client import GeodeError, ConnectionError, QueryError

try:
    page, _ = await conn.query("INVALID SYNTAX")
except QueryError as e:
    print(f"Query failed: {e}")
except ConnectionError as e:
    print(f"Connection failed: {e}")
```

### Rust

```rust
use geode_client::{Error, ErrorKind};

match conn.query("INVALID QUERY", None).await {
    Ok(page) => { /* ... */ },
    Err(Error::Query(msg)) => println!("Query error: {}", msg),
    Err(Error::Connection(msg)) => println!("Connection error: {}", msg),
    Err(e) => println!("Other error: {}", e),
}
```

## Performance Comparison

| Language | Queries/sec | Latency (p50) | Latency (p99) | Memory |
|----------|-------------|---------------|---------------|--------|
| **Rust** | 10,000+ | 1-2ms | 5ms | Low |
| **Go** | 8,000+ | 2-3ms | 8ms | Low |
| **Python** | 1,000+ | 2-3ms | 10ms | Medium |

*Benchmarks run on local connections with 100 concurrent workers*

## TLS Configuration

### Development (Skip Verification)

```go
// Go
db, _ := sql.Open("geode", "localhost:3141?insecure=true")
```

```python
# Python
client = Client(host="localhost", port=3141, skip_verify=True)
```

```rust
// Rust
let client = Client::new("localhost", 3141).skip_verify(true);
```

### Production (With Certificates)

```go
// Go
db, _ := sql.Open("geode", "localhost:3141?ca=/path/to/ca.crt")
```

```python
# Python
client = Client(
    host="geode.example.com",
    port=3141,
    ca_cert="/path/to/ca.crt"
)
```

```rust
// Rust (certificate verification enabled by default)
let client = Client::new("geode.example.com", 3141);
```

### Mutual TLS (mTLS)

```go
// Go
db, _ := sql.Open("geode", "localhost:3141?ca=/path/to/ca.crt&cert=/path/to/client.crt&key=/path/to/client.key")
```

```python
# Python
client = Client(
    host="geode.example.com",
    port=3141,
    ca_cert="/path/to/ca.crt",
    client_cert="/path/to/client.crt",
    client_key="/path/to/client.key"
)
```

## Testing

All clients include comprehensive test suites:

```bash
# Go
go test -v -tags=integration ./...

# Python
pytest --cov=geode_client

# Rust
cargo test
```

## Contributing

Contributions to client libraries are welcome! Each library follows language-specific conventions:

- **Go**: Follow Go standard library patterns
- **Python**: PEP 8, type hints, async-first
- **Rust**: Idiomatic Rust, zero-cost abstractions

## Support

- **Documentation**: See language-specific guides
- **Issues**: [GitHub Issues](https://github.com/devnw/geode/issues)
- **Discord**: [Community Chat](https://discord.gg/geode)
- **Email**: [email protected]

## Next Steps

- [Go Client Guide](go-client/) - Complete Go documentation
- [Python Client Guide](python-client/) - Python async patterns
- [Rust Client Guide](rust-client/) - High-performance Rust
- [Protocol Reference](../api-reference/protocol/) - Wire protocol details
