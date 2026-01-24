---
title: "Client Libraries"
description: "Production-ready Geode client libraries for Go, Python, Rust, and Zig with connection pooling, transaction support, type safety, high performance, and comprehensive ISO/IEC 39075:2024 GQL compliance for graph database integration."
keywords:
  - client libraries
  - SDK
  - database drivers
  - API clients
  - programming language support
  - Geode client
  - graph database client
  - QUIC client
  - GQL client library
  - multi-language support
  - database integration
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/client-libraries/"
    noindex: false
---

# Client Libraries

Geode provides production-ready client libraries for Go, Python, Rust, and Zig, each optimized for their respective language ecosystems while maintaining consistent behavior through the ISO/IEC 39075:2024 GQL standard. All clients communicate via QUIC+TLS for high performance and security, providing developers with native, idiomatic interfaces for integrating graph database capabilities into their applications.

## Overview

The Geode client library ecosystem is designed with three core principles:

1. **Language-Native**: Each client library follows the conventions and idioms of its target language, providing a natural developer experience
2. **Consistent Behavior**: All clients implement the same ISO/IEC 39075:2024 GQL standard, ensuring portable queries across languages
3. **High Performance**: Built on QUIC+TLS protocol for low-latency, high-throughput communication with automatic encryption

Whether you're building microservices in Go, data pipelines in Python, high-performance systems in Rust, or embedded applications in Zig, Geode provides a client library optimized for your use case.

## Available Client Libraries

### Go Client - database/sql Driver

The Go client implements the standard `database/sql` interface, making it a drop-in replacement for SQL databases and enabling seamless integration with the broader Go ecosystem.

#### Quick Start

```go
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "go.codepros.org/geode"
)

func main() {
    db, err := sql.Open("geode", "geode://localhost:3141/graph")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Configure connection pool
    db.SetMaxOpenConns(100)
    db.SetMaxIdleConns(10)

    // Execute query with parameters
    rows, err := db.Query(`
        MATCH (p:Person)-[:KNOWS]->(friend:Person)
        WHERE p.name = $name
        RETURN friend.name, friend.age
    `, "Alice")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    for rows.Next() {
        var name string
        var age int
        if err := rows.Scan(&name, &age); err != nil {
            log.Fatal(err)
        }
        fmt.Printf("%s is %d years old\n", name, age)
    }
}
```

#### Key Features

- **database/sql Compatibility**: Works with any library expecting `*sql.DB`
- **Connection Pooling**: Automatic connection lifecycle management with configurable pool sizes
- **Prepared Statements**: Query compilation and caching for improved performance
- **Context Support**: Full context.Context integration for timeouts and cancellation
- **Transaction Management**: ACID transactions with Begin/Commit/Rollback
- **Error Handling**: Go-idiomatic error types with ISO error code mapping

#### Performance: 5,000+ queries/second

#### Installation

```bash
go get go.codepros.org/geode
```

**Requirements**: Go 1.24.0+

**Documentation**: [Go Client Guide](/docs/clients/go/)

### Python Client - Async/Await

The Python client is an async-first library designed for modern Python applications using asyncio, providing type-safe interfaces and high-level abstractions.

#### Quick Start

```python
import asyncio
from geode_client import GeodeClient

async def main():
    async with GeodeClient("localhost:3141") as client:
        # Execute query with parameters
        result = await client.execute("""
            MATCH (p:Person)-[:KNOWS]->(friend:Person)
            WHERE p.name = $name
            RETURN friend.name AS name, friend.age AS age
        """, {"name": "Alice"})

        # Process results
        for row in result:
            print(f"{row['name']} is {row['age']} years old")

        # Transaction support
        async with client.transaction() as tx:
            await tx.execute(
                "CREATE (p:Person {name: $name, age: $age})",
                {"name": "Bob", "age": 30}
            )
            await tx.commit()

asyncio.run(main())
```

#### Key Features

- **Async/Await**: Native asyncio integration for non-blocking I/O
- **Connection Pooling**: High-performance pool supporting 1,000+ queries/second
- **Query Builder**: Type-safe query construction with fluent API
- **Row-Level Security**: Built-in RLS policy management
- **Streaming Results**: Memory-efficient streaming for large result sets
- **Type Safety**: Comprehensive type hints for improved IDE support

#### Performance: 1,000+ queries/second with connection pooling

#### Installation

```bash
pip install geode-client
```

**Requirements**: Python 3.9+

**Documentation**: [Python Client Guide](/docs/clients/python/)

### Rust Client - Zero-Cost Abstractions

The Rust client provides compile-time type safety, zero-cost abstractions, and exceptional performance for systems programming and high-throughput applications.

#### Quick Start

```rust
use geode_client::{Client, Error};
use tokio;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let client = Client::connect("localhost:3141").await?;

    // Execute query with type-safe parameters
    let results = client.execute(
        "MATCH (p:Person)-[:KNOWS]->(friend:Person)
         WHERE p.name = $name
         RETURN friend.name, friend.age",
        &[("name", "Alice")]
    ).await?;

    for row in results {
        let name: String = row.get("friend.name")?;
        let age: i64 = row.get("friend.age")?;
        println!("{} is {} years old", name, age);
    }

    // Transaction support
    let mut tx = client.transaction().await?;
    tx.execute(
        "CREATE (p:Person {name: $name, age: $age})",
        &[("name", "Bob"), ("age", 30i64)]
    ).await?;
    tx.commit().await?;

    Ok(())
}
```

#### Key Features

- **Zero-Cost Abstractions**: Compile-time optimization with no runtime overhead
- **Type Safety**: Compile-time type checking prevents runtime errors
- **Tokio Integration**: Native async runtime support with excellent concurrency
- **Serde Integration**: Automatic serialization/deserialization
- **Quinn QUIC**: High-performance QUIC implementation
- **Memory Safety**: Rust's ownership model prevents memory errors

#### Performance: 10,000+ queries/second

#### Installation

Add to `Cargo.toml`:

```toml
[dependencies]
geode-client = "0.18"
tokio = { version = "1", features = ["full"] }
```

**Requirements**: Rust 1.70+

**Documentation**: [Rust Client Guide](/docs/clients/rust/)

### Zig Client - Systems Programming

The Zig client offers compile-time memory safety, high performance, and low-level control for embedded systems and performance-critical applications.

#### Quick Start

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = try geode.Client.connect(allocator, "localhost:3141");
    defer client.deinit();

    const query =
        \\MATCH (p:Person)-[:KNOWS]->(friend:Person)
        \\WHERE p.name = $name
        \\RETURN friend.name, friend.age
    ;

    var params = geode.Params.init(allocator);
    defer params.deinit();
    try params.put("name", .{ .string = "Alice" });

    var result = try client.execute(query, params);
    defer result.deinit();

    while (try result.next()) |row| {
        const name = try row.getString("friend.name");
        const age = try row.getInt("friend.age");
        std.debug.print("{s} is {d} years old\n", .{ name, age });
    }

    // Transaction support
    var tx = try client.transaction();
    defer tx.deinit();

    try tx.execute(
        "CREATE (p:Person {name: $name, age: $age})",
        .{ .name = "Bob", .age = 30 }
    );

    try tx.commit();
}
```

#### Key Features

- **Memory Safety**: Compile-time memory management prevents leaks
- **Comptime Features**: Compile-time query validation and optimization
- **Vendored QUIC**: No external dependencies for maximum portability
- **Cross-Platform**: Linux, macOS, Windows support
- **Low-Level Control**: Fine-grained control over allocations and resources
- **Performance**: 8,000+ queries/second with minimal overhead

#### Performance: 8,000+ queries/second

#### Installation

Add to `build.zig.zon`:

```zig
.dependencies = .{
    .geode_client = .{
        .url = "https://github.com/geodedb/geode-client-zig/archive/v0.18.0.tar.gz",
        .hash = "...",
    },
}
```

**Requirements**: Zig 0.15.1+

**Documentation**: [Zig Client Guide](/docs/clients/zig/)

## Common Features

All Geode client libraries provide a consistent set of core features:

### QUIC+TLS Communication

All clients use QUIC over TLS 1.3 for encrypted, high-performance communication:

- **Low Latency**: Reduced connection establishment time compared to TCP+TLS
- **Multiplexing**: Multiple concurrent queries on a single connection
- **Automatic Encryption**: TLS 1.3 by default, no plaintext communication
- **Connection Migration**: Seamless handling of network changes

### Connection Pooling

Configurable connection management for optimal performance:

- **Pool Size Control**: Set minimum and maximum connection limits
- **Automatic Scaling**: Connections created on demand, released when idle
- **Health Checks**: Automatic detection and replacement of failed connections
- **Timeout Management**: Configurable idle timeout and connection lifetime

### Transaction Support

Full ACID transaction support with advanced features:

- **Isolation Levels**: READ_COMMITTED, REPEATABLE_READ, SERIALIZABLE
- **Savepoints**: Named savepoints for partial rollback
- **Automatic Rollback**: Failed transactions automatically rolled back
- **Nested Transactions**: Support for nested transaction scopes

### Prepared Statements

Query compilation and caching for improved performance:

- **Query Compilation**: Queries parsed and compiled once
- **Parameter Binding**: Safe parameter substitution prevents injection
- **Cache Management**: Automatic caching of compiled queries
- **Performance Gains**: 2-3x faster for repeated queries

### Error Handling

ISO/IEC 39075:2024 compliant error codes with language-appropriate types:

- **Syntax Errors**: Detailed parse error messages with line/column info
- **Constraint Violations**: Clear indication of which constraint failed
- **Connection Errors**: Network and connectivity error details
- **Transaction Errors**: Deadlock detection and resolution guidance

### Parameter Binding

Type-safe parameter substitution across all clients:

```go
// Go
db.Query("MATCH (n:User {id: $id}) RETURN n", 123)
```

```python
# Python
await client.execute("MATCH (n:User {id: $id}) RETURN n", {"id": 123})
```

```rust
// Rust
client.execute("MATCH (n:User {id: $id}) RETURN n", &[("id", 123i64)]).await?
```

```zig
// Zig
try client.execute("MATCH (n:User {id: $id}) RETURN n", .{ .id = 123 })
```

### Streaming Results

Memory-efficient handling of large result sets:

- **Lazy Loading**: Results fetched incrementally, not all at once
- **Backpressure**: Client controls fetch rate to prevent memory overflow
- **Cancellation**: Stop fetching results at any time
- **Resource Management**: Automatic cleanup of incomplete result sets

## Migration from Other Databases

### From Neo4j

Geode clients provide similar interfaces to Neo4j drivers:

**Neo4j Python Driver**:
```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver("bolt://localhost:7687")
with driver.session() as session:
    result = session.run("MATCH (n:Person) RETURN n")
```

**Geode Python Client**:
```python
from geode_client import GeodeClient

async with GeodeClient("localhost:3141") as client:
    result = await client.execute("MATCH (n:Person) RETURN n")
```

### From SQL Databases

For Go applications, Geode's `database/sql` compatibility makes migration straightforward:

**PostgreSQL**:
```go
db, _ := sql.Open("postgres", "postgres://localhost/mydb")
rows, _ := db.Query("SELECT * FROM users WHERE name = $1", "Alice")
```

**Geode**:
```go
db, _ := sql.Open("geode", "geode://localhost:3141/graph")
rows, _ := db.Query("MATCH (u:User {name: $name}) RETURN u", "Alice")
```

## Cross-Client Test Harness

All client libraries are validated against a comprehensive test harness ensuring consistent behavior:

- **1,644 passing tests** across all clients
- **97.4% test coverage** for core functionality
- **70/70 ISO GQL compliance tests** passing
- **Cross-language validation** ensures portability

Test categories include:
- Basic operations (PING, queries, parameters)
- CRUD operations (nodes and relationships)
- Transaction management
- Aggregations (COUNT, SUM, AVG, MIN, MAX)
- Error handling
- Concurrent access
- Data types (null, lists, maps)

## Performance Comparison

| Client | Queries/Second | Latency (p50) | Latency (p99) | Memory Overhead |
|--------|----------------|---------------|---------------|-----------------|
| Rust   | 10,000+        | 0.5ms         | 2ms           | Low             |
| Zig    | 8,000+         | 0.6ms         | 2.5ms         | Very Low        |
| Go     | 5,000+         | 1ms           | 4ms           | Medium          |
| Python | 1,000+         | 2ms           | 8ms           | Higher          |

*Benchmarks performed on commodity hardware (4-core CPU, 16GB RAM) with local Geode instance.*

## Best Practices

### Connection Management

1. **Use Connection Pools**: Always configure appropriate pool sizes for your workload
2. **Set Timeouts**: Configure connection and query timeouts to prevent resource exhaustion
3. **Handle Errors**: Implement retry logic with exponential backoff for transient failures
4. **Monitor Health**: Regularly check connection pool health and metrics

### Query Optimization

1. **Use Prepared Statements**: Prepare frequently-executed queries
2. **Parameterize Queries**: Never concatenate user input into queries
3. **Limit Results**: Use LIMIT clause to control result set sizes
4. **Index Usage**: Ensure queries use appropriate indexes (check with EXPLAIN)

### Transaction Management

1. **Keep Transactions Short**: Minimize transaction duration to reduce lock contention
2. **Use Savepoints**: Implement savepoints for complex multi-step operations
3. **Handle Deadlocks**: Implement retry logic for deadlock errors
4. **Auto-Commit Sparingly**: Use explicit transactions for multi-statement operations

### Error Handling

1. **Distinguish Error Types**: Handle syntax errors differently from connection errors
2. **Log Context**: Include query text and parameters in error logs (sanitized)
3. **Retry Transient Errors**: Implement exponential backoff for network errors
4. **User-Friendly Messages**: Translate technical errors to user-appropriate messages

## Related Topics

- [SDK](/tags/sdk/) - Software Development Kits overview
- [API Development](/tags/api/) - API integration patterns
- [Integration](/tags/integration/) - System integration guide
- [Protocol](/tags/protocol/) - QUIC protocol details
- [Performance](/tags/performance/) - Performance optimization

## Further Reading

- [Client Library Comparison](/docs/clients/comparison/) - Detailed feature comparison
- [Installation Guides](/docs/getting-started/installation/) - Step-by-step installation
- [Examples](/docs/examples/) - Real-world code examples
- [API Reference](/docs/api/) - Complete API documentation
- [Migration Guide](/docs/migration/) - Migrating from other databases
