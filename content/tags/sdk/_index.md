---
title: "Software Development Kits (SDKs)"
description: "Comprehensive guide to Geode SDKs including client libraries for Go, Python, Rust, and Zig with installation, configuration, API reference, and code examples for graph database development."
keywords:
  - SDK
  - software development kit
  - client SDK
  - development tools
  - API client
  - library
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/sdk/"
    noindex: false
---

# Software Development Kits (SDKs)

Geode provides production-ready SDKs for Go, Python, Rust, and Zig, enabling developers to integrate graph database capabilities into applications with minimal setup. Each SDK is designed to leverage language-specific features while maintaining consistent behavior across platforms through adherence to the ISO/IEC 39075:2024 GQL standard.

## Overview

Geode's SDKs provide:

- **Native Language Integration**: Idiomatic APIs for each language
- **Type Safety**: Strong typing where supported (Go, Rust, Zig)
- **Async Support**: Native async/await in Python and Rust
- **Connection Pooling**: Built-in connection management for performance
- **Transaction Management**: Full ACID transaction support with savepoints
- **Error Handling**: Language-appropriate error types with ISO error codes
- **Performance**: Optimized for high throughput (1,000-10,000+ queries/second)

## SDK Comparison Matrix

| Feature | Go | Python | Rust | Zig |
|---------|----|----|------|-----|
| **Installation** | `go get` | `pip install` | `cargo add` | `zig fetch` |
| **Async Support** | Context-aware | async/await | tokio | Event loop |
| **Type Safety** | Strong | Type hints | Strong | Strong |
| **Connection Pool** | database/sql | aioquic | Quinn | Custom |
| **Transaction Support** | ✓ | ✓ | ✓ | ✓ |
| **Prepared Statements** | ✓ | ✓ | ✓ | ✓ |
| **Query Builder** | Planned | ✓ | ✓ | Planned |
| **Performance** | 5K qps | 1K qps | 10K qps | 8K qps |

## Go SDK

### Installation

```bash
go get go.codepros.org/geode
```

### Quick Start

```go
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "go.codepros.org/geode"
)

func main() {
    // Open connection (implements database/sql)
    db, err := sql.Open("geode", "geode://localhost:3141/graph")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Configure connection pool
    db.SetMaxOpenConns(100)
    db.SetMaxIdleConns(10)

    // Execute query
    rows, err := db.Query(`
        MATCH (p:Person)-[:KNOWS]->(friend:Person)
        WHERE p.name = $name
        RETURN friend.name, friend.age
    `, "Alice")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    // Iterate results
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

### Features

- **database/sql Interface**: Drop-in replacement for SQL databases
- **Connection Pooling**: Automatic connection lifecycle management
- **Prepared Statements**: Query compilation and caching
- **Context Support**: Timeout and cancellation with context.Context
- **Transaction Support**: Full ACID transactions with savepoints

### Documentation

Full Go SDK documentation: [Go Client Guide](/docs/clients/go/)

## Python SDK

### Installation

```bash
pip install geode-client
```

### Quick Start

```python
import asyncio
from geode_client import GeodeClient

async def main():
    # Create client with connection pool
    async with GeodeClient("localhost:3141") as client:
        # Execute query
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
            await tx.execute("""
                CREATE (p:Person {name: $name, age: $age})
            """, {"name": "Bob", "age": 30})
            await tx.commit()

asyncio.run(main())
```

### Features

- **Async/Await**: Native asyncio integration
- **Connection Pooling**: Configurable pool (1000+ qps)
- **Query Builder**: Type-safe query construction
- **Row-Level Security**: Built-in RLS policy management
- **Type System**: Comprehensive value type support

### Documentation

Full Python SDK documentation: [Python Client Guide](/docs/clients/python/)

## Rust SDK

### Installation

Add to `Cargo.toml`:

```toml
[dependencies]
geode-client = "0.18"
tokio = { version = "1", features = ["full"] }
```

### Quick Start

```rust
use geode_client::{Client, Error};
use tokio;

#[tokio::main]
async fn main() -> Result<(), Error> {
    // Connect to Geode
    let client = Client::connect("localhost:3141").await?;

    // Execute query
    let results = client.execute(
        "MATCH (p:Person)-[:KNOWS]->(friend:Person)
         WHERE p.name = $name
         RETURN friend.name, friend.age",
        &[("name", "Alice")]
    ).await?;

    // Process results
    for row in results {
        let name: String = row.get("friend.name")?;
        let age: i64 = row.get("friend.age")?;
        println!("{} is {} years old", name, age);
    }

    // Transaction
    let mut tx = client.transaction().await?;
    tx.execute(
        "CREATE (p:Person {name: $name, age: $age})",
        &[("name", "Bob"), ("age", 30i64)]
    ).await?;
    tx.commit().await?;

    Ok(())
}
```

### Features

- **Zero-Cost Abstractions**: Compile-time optimization
- **Tokio Integration**: Native async runtime
- **Type Safety**: Compile-time type checking
- **High Performance**: 10,000+ queries/second
- **Serde Integration**: Automatic serialization/deserialization

### Documentation

Full Rust SDK documentation: [Rust Client Guide](/docs/clients/rust/)

## Zig SDK

### Installation

Add to `build.zig.zon`:

```zig
.dependencies = .{
    .geode_client = .{
        .url = "https://gitlab.com/devnw/codepros/geode/geode-client-zig/archive/v0.18.0.tar.gz",
        .hash = "...",
    },
}
```

### Quick Start

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Connect to Geode
    var client = try geode.Client.connect(allocator, "localhost:3141");
    defer client.deinit();

    // Execute query
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

    // Process results
    while (try result.next()) |row| {
        const name = try row.getString("friend.name");
        const age = try row.getInt("friend.age");
        std.debug.print("{s} is {d} years old\n", .{ name, age });
    }

    // Transaction
    var tx = try client.transaction();
    defer tx.deinit();

    try tx.execute(
        "CREATE (p:Person {name: $name, age: $age})",
        .{ .name = "Bob", .age = 30 }
    );

    try tx.commit();
}
```

### Features

- **Memory Safety**: Compile-time memory management
- **Performance**: 8,000+ queries/second
- **Comptime Features**: Compile-time query validation
- **Vendored QUIC**: No external dependencies
- **Cross-Platform**: Linux, macOS, Windows support

### Documentation

Full Zig SDK documentation: [Zig Client Guide](/docs/clients/zig/)

## Common SDK Patterns

### Connection Management

**Go**:
```go
db, err := sql.Open("geode", "geode://localhost:3141/graph")
db.SetMaxOpenConns(100)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(time.Hour)
```

**Python**:
```python
from geode_client import ConnectionPool

pool = ConnectionPool(
    url="localhost:3141",
    min_connections=10,
    max_connections=100,
    max_idle_time=300
)
```

**Rust**:
```rust
let client = Client::builder()
    .url("localhost:3141")
    .max_connections(100)
    .connect()
    .await?;
```

### Error Handling

**Go**:
```go
import "go.codepros.org/geode/errors"

if err != nil {
    if errors.IsSyntaxError(err) {
        log.Printf("Query syntax error: %v", err)
    } else if errors.IsConstraintViolation(err) {
        log.Printf("Constraint violation: %v", err)
    } else {
        log.Printf("Unexpected error: %v", err)
    }
}
```

**Python**:
```python
from geode_client import GeodeClient, SyntaxError, ConstraintViolation

try:
    result = await client.execute(query)
except SyntaxError as e:
    print(f"Query syntax error: {e}")
except ConstraintViolation as e:
    print(f"Constraint violation: {e}")
```

**Rust**:
```rust
use geode_client::Error;

match client.execute(query, params).await {
    Ok(results) => process_results(results),
    Err(Error::SyntaxError(msg)) => eprintln!("Syntax error: {}", msg),
    Err(Error::ConstraintViolation(msg)) => eprintln!("Constraint: {}", msg),
    Err(e) => eprintln!("Error: {}", e),
}
```

### Transaction Patterns

All SDKs support ACID transactions:

**Go**:
```go
tx, err := db.Begin()
defer tx.Rollback() // Safe to call even after commit

_, err = tx.Exec("CREATE (n:Node {id: $id})", 1)
_, err = tx.Exec("CREATE (m:Node {id: $id})", 2)

err = tx.Commit()
```

**Python**:
```python
async with client.transaction() as tx:
    await tx.execute("CREATE (n:Node {id: $id})", {"id": 1})
    await tx.execute("CREATE (m:Node {id: $id})", {"id": 2})
    await tx.commit()  # Auto-commits if no exception
```

**Rust**:
```rust
let mut tx = client.transaction().await?;
tx.execute("CREATE (n:Node {id: $id})", &[("id", 1i64)]).await?;
tx.execute("CREATE (m:Node {id: $id})", &[("id", 2i64)]).await?;
tx.commit().await?;
```

### Prepared Statements

**Go**:
```go
stmt, err := db.Prepare("MATCH (n:Node {id: $id}) RETURN n")
defer stmt.Close()

for id := 1; id <= 100; id++ {
    var node Node
    err := stmt.QueryRow(id).Scan(&node)
}
```

**Python**:
```python
stmt = await client.prepare(
    "MATCH (n:Node {id: $id}) RETURN n"
)

for i in range(100):
    result = await stmt.execute({"id": i})
```

## Performance Best Practices

1. **Use Connection Pools**: Always configure appropriate pool sizes
2. **Prepare Statements**: Prepare frequently-used queries
3. **Batch Operations**: Group multiple operations in transactions
4. **Async Where Available**: Use async SDKs (Python, Rust) for I/O-bound workloads
5. **Limit Result Sets**: Use LIMIT clause to avoid large result transfers
6. **Index Usage**: Ensure queries use appropriate indexes

## Testing with SDKs

### Go Testing

```go
func TestGeodeIntegration(t *testing.T) {
    db, err := sql.Open("geode", os.Getenv("GEODE_URL"))
    require.NoError(t, err)
    defer db.Close()

    // Clean up test data
    _, err = db.Exec("MATCH (n:TestNode) DELETE n")
    require.NoError(t, err)

    // Test query
    _, err = db.Exec("CREATE (n:TestNode {id: $id})", 1)
    require.NoError(t, err)

    var count int
    err = db.QueryRow("MATCH (n:TestNode) RETURN COUNT(n)").Scan(&count)
    require.NoError(t, err)
    assert.Equal(t, 1, count)
}
```

### Python Testing

```python
import pytest
from geode_client import GeodeClient

@pytest.fixture
async def client():
    async with GeodeClient("localhost:3141") as c:
        # Clean up test data
        await c.execute("MATCH (n:TestNode) DELETE n")
        yield c

@pytest.mark.asyncio
async def test_create_node(client):
    await client.execute(
        "CREATE (n:TestNode {id: $id})",
        {"id": 1}
    )

    result = await client.execute(
        "MATCH (n:TestNode) RETURN COUNT(n) AS count"
    )

    assert result[0]['count'] == 1
```

## Migration Guides

### From Neo4j Driver

**Neo4j (Python)**:
```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver("bolt://localhost:7687")
with driver.session() as session:
    result = session.run(
        "MATCH (p:Person {name: $name}) RETURN p",
        name="Alice"
    )
```

**Geode (Python)**:
```python
from geode_client import GeodeClient

async with GeodeClient("localhost:3141") as client:
    result = await client.execute(
        "MATCH (p:Person {name: $name}) RETURN p",
        {"name": "Alice"}
    )
```

### From SQL

**SQL (Go)**:
```go
rows, err := db.Query("SELECT * FROM users WHERE name = ?", "Alice")
```

**GQL (Go with Geode)**:
```go
rows, err := db.Query("MATCH (u:User {name: $name}) RETURN u", "Alice")
```

## Related Topics

- [Client Libraries](/tags/client-libraries/) - Detailed client documentation
- [API Development](/tags/api/) - API integration patterns
- [Integration](/tags/integration/) - System integration guide
- [GQL Syntax](/tags/gql-syntax/) - Query language reference
- [Examples](/tags/examples/) - Code examples and patterns

## Further Reading

- [Go SDK Documentation](/docs/clients/go/) - Complete Go guide
- [Python SDK Documentation](/docs/clients/python/) - Python reference
- [Rust SDK Documentation](/docs/clients/rust/) - Rust guide
- [Zig SDK Documentation](/docs/clients/zig/) - Zig reference
- [SDK Examples](/docs/examples/sdk/) - Real-world examples
