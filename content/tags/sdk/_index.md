---
title: "Software Development Kits (SDKs)"
description: "Comprehensive guide to Geode SDKs including client libraries for Go, Python, Node.js, Rust, and Zig with installation, configuration, API reference, and code examples for graph database development."
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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Software Development Kits (SDKs)

Geode provides production-ready SDKs for Go, Python, Node.js, Rust, and Zig, enabling developers to integrate graph database capabilities into applications with minimal setup. Each SDK is designed to leverage language-specific features while maintaining consistent behavior across platforms through adherence to the ISO/IEC 39075:2024 GQL standard.

## Overview

Geode's SDKs provide:

- **Native Language Integration**: Idiomatic APIs for each language
- **Type Safety**: Strong typing where supported (Go, Rust, Zig)
- **Async Support**: Native async/await in Python and Rust
- **Connection Pooling**: Built-in connection management for performance
- **Transaction Management**: Full ACID transaction support with savepoints
- **Error Handling**: Language-appropriate error types with ISO error codes
- **Performance**: Optimized for high-throughput workloads (runtime and workload dependent)

## SDK Comparison Matrix

| Feature | Go | Python | Node.js | Rust | Zig |
|---------|----|----|------|------|-----|
| **Installation** | `go get` | `pip install` | `npm install` | `cargo add` | `zig fetch` |
| **Async Support** | Context-aware | async/await | async/await | tokio | Event loop |
| **Type Safety** | Strong | Type hints | TypeScript types | Strong | Strong |
| **Connection Pool** | database/sql | ConnectionPool | Built-in pooling | Quinn | Custom |
| **Transaction Support** | ✓ | ✓ | ✓ | ✓ | Manual |
| **Prepared Statements** | ✓ | ✓ | ✓ | ✓ | Manual |
| **Query Builder** | Planned | ✓ | ✓ | ✓ | Planned |
| **Performance** | Workload-dependent | Workload-dependent | Workload-dependent | Workload-dependent | Workload-dependent |

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

Full Go SDK documentation: [Go Client Guide](/docs/client-libraries/go-client/)

## Python SDK

### Installation

```bash
pip install geode-client
```

### Quick Start

```python
import asyncio
from geode_client import Client

async def main():
    # Create client with connection pool
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Execute query
        result, _ = await conn.query("""
            MATCH (p:Person)-[:KNOWS]->(friend:Person)
            WHERE p.name = $name
            RETURN friend.name AS name, friend.age AS age
        """, {"name": "Alice"})

        # Process results
        for row in result.rows:
            print(f"{row['name'].as_string} is {row['age'].as_int} years old")

        # Transaction support
        await conn.begin()
        try:
            await conn.execute(
                """
                CREATE (p:Person {name: $name, age: $age})
                """,
                {"name": "Bob", "age": 30},
            )
            await conn.commit()
        except Exception:
            await conn.rollback()
            raise

asyncio.run(main())
```

### Features

- **Async/Await**: Native asyncio integration
- **Connection Pooling**: Configurable pool to reduce connection overhead (throughput depends on workload)
- **Query Builder**: Type-safe query construction
- **Row-Level Security**: Built-in RLS policy management
- **Type System**: Comprehensive value type support

### Documentation

Full Python SDK documentation: [Python Client Guide](/docs/client-libraries/python-client/)

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
use geode_client::{Client, Result, Value};
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<()> {
    // Connect to Geode
    let client = Client::new("localhost", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    // Execute query
    let mut params = HashMap::new();
    params.insert("name".to_string(), Value::string("Alice"));
    let (results, _) = conn.query_with_params(
        "MATCH (p:Person)-[:KNOWS]->(friend:Person)\n         WHERE p.name = $name\n         RETURN friend.name AS name, friend.age AS age",
        &params,
    ).await?;

    // Process results
    for row in &results.rows {
        let name = row.get("name").unwrap().as_string()?;
        let age = row.get("age").unwrap().as_int()?;
        println!("{} is {} years old", name, age);
    }

    // Transaction
    conn.begin().await?;
    let mut create_params = HashMap::new();
    create_params.insert("name".to_string(), Value::string("Bob"));
    create_params.insert("age".to_string(), Value::int(30));
    conn.query_with_params(
        "CREATE (p:Person {name: $name, age: $age})",
        &create_params,
    ).await?;
    conn.commit().await?;

    Ok(())
}
```

### Features

- **Zero-Cost Abstractions**: Compile-time optimization
- **Tokio Integration**: Native async runtime
- **Type Safety**: Compile-time type checking
- **High Performance**: Designed for high-throughput workloads (see server throughput baselines)
- **Serde Integration**: Automatic serialization/deserialization

### Documentation

Full Rust SDK documentation: [Rust Client Guide](/docs/client-libraries/rust-client/)

## Node.js SDK

### Installation

```bash
npm install @geode/client
```

### Quick Start

```ts
import { createClient } from '@geode/client';

const client = await createClient('geode://localhost:3141');
const rows = await client.queryAll(
  'MATCH (p:Person) RETURN p.name AS name, p.age AS age'
);
console.log(rows);
await client.close();
```

### Features

- **TypeScript-first API** with strong typing
- **Connection pooling** enabled by default
- **Streaming queries** via async iterators
- **Transactions** with `withTransaction` and savepoints

### Documentation

Full Node.js SDK documentation: [Node.js Client Guide](/docs/client-libraries/nodejs-client/)

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

<!-- CANARY: REQ=REQ-ZIG-CLIENT-001; FEATURE="Zig Client"; ASPECT=VendorQuicIntegration; STATUS=IMPL; OWNER=clients; UPDATED=2025-12-22 -->
```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.openStream();

    try client.sendHello("docs-sdk", "1.0.0");
    const hello = try client.receiveMessage(30000);
    defer allocator.free(hello);

    try client.sendQuery(
        "MATCH (p:Person)-[:KNOWS]->(friend:Person) "
        "WHERE p.name = 'Alice' "
        "RETURN friend.name, friend.age"
    );
    const result = try client.receiveMessage(30000);
    defer allocator.free(result);

    std.debug.print("Result: {s}\\n", .{result});
}
```

### Features

- **Memory Safety**: Compile-time memory management
- **Performance**: Workload-dependent throughput with low client overhead
- **Comptime Features**: Compile-time query validation
- **Vendored QUIC**: No external dependencies
- **Cross-Platform**: Linux, macOS, Windows support

### Documentation

Full Zig SDK documentation: [Zig Client Guide](/docs/client-libraries/zig-client/)

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
from geode_client import Client, SyntaxError, ConstraintViolation

try:
    result, _ = await client.query(query)
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
async with client.connection() as conn:
    await conn.begin()
    try:
        await conn.execute("CREATE (n:Node {id: $id})", {"id": 1})
        await conn.execute("CREATE (m:Node {id: $id})", {"id": 2})
        await conn.commit()
    except Exception:
        await conn.rollback()
        raise
```

**Rust**:
```rust
use geode_client::Value;
use std::collections::HashMap;

let mut conn = client.connect().await?;
conn.begin().await?;

let mut params = HashMap::new();
params.insert("id".to_string(), Value::int(1));
conn.query_with_params("CREATE (n:Node {id: $id})", &params).await?;

params.insert("id".to_string(), Value::int(2));
conn.query_with_params("CREATE (m:Node {id: $id})", &params).await?;

conn.commit().await?;
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
stmt = await conn.prepare(
    "MATCH (n:Node {id: $id}) RETURN n"
)

for i in range(100):
    result, _ = await stmt.execute({"id": i})
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
from geode_client import Client

@pytest.fixture
async def client():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Clean up test data
        await conn.execute("MATCH (n:TestNode) DELETE n")
        yield conn

@pytest.mark.asyncio
async def test_create_node(client):
    await client.execute(
        "CREATE (n:TestNode {id: $id})",
        {"id": 1}
    )

    result, _ = await client.query(
        "MATCH (n:TestNode) RETURN COUNT(n) AS count"
    )

    assert result.rows[0]['count'] == 1
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
from geode_client import Client

client = Client(host="localhost", port=3141)

async with client.connection() as conn:
    result, _ = await conn.query(
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

- [Go SDK Documentation](/docs/client-libraries/go-client/) - Complete Go guide
- [Python SDK Documentation](/docs/client-libraries/python-client/) - Python reference
- [Rust SDK Documentation](/docs/client-libraries/rust-client/) - Rust guide
- [Node.js SDK Documentation](/docs/client-libraries/nodejs-client/) - Node.js guide
- [Zig SDK Documentation](/docs/client-libraries/zig-client/) - Zig reference
- [SDK Examples](/docs/examples/sdk/) - Real-world examples
