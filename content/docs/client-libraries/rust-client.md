---
title: "Rust Client"
description: "Complete guide to the Geode Rust async client library with type-safe API"
weight: 30

keywords:
  - Geode Rust client
  - Rust SDK
  - GQL driver
  - graph database Rust
  - client library
---

<!-- CANARY: REQ=REQ-CLIENT-INTEGRATION-001; FEATURE="RustClientIntegration"; ASPECT=QUICTransport; STATUS=TESTED; OWNER=clients; UPDATED=2026-01-15 -->

# Geode Rust Client Library

A high-performance, type-safe async Rust client library for Geode graph database with full QUIC+TLS support.

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
geode-client = "0.1"

# For async runtime
tokio = { version = "1", features = ["full"] }
```

## Requirements

- Rust 1.70+
- quinn >= 0.10 (QUIC support)
- tokio runtime
- Running Geode server with QUIC enabled

## Features

- ✅ **Fully async** - Tokio-based with type safety
- ✅ **QUIC + TLS 1.3** - Modern, secure transport
- ✅ **Query builders** - Programmatic query construction
- ✅ **Connection pooling** - Concurrent workload support
- ✅ **Type-safe API** - Rust's strong type system
- ✅ **Zero-cost abstractions** - Minimal overhead
- ✅ **Rich type system** - Decimal, temporal, advanced types

## Quick Start

### Basic QUIC Connection

```rust
use geode_client::{Client, Result};

#[tokio::main]
async fn main() -> Result<()> {
    // Create QUIC client (skip TLS verification for development)
    let client = Client::new("127.0.0.1", 3141)
        .skip_verify(true)
        .page_size(1000);

    // Connect via QUIC
    let conn = client.connect().await?;
    println!("Connected to Geode via QUIC!");

    // Execute query
    let page = conn.query("RETURN 1 AS x, 'Hello QUIC' AS greeting", None).await?;

    for row in &page.rows {
        let x = row.get("x").unwrap().as_int()?;
        let greeting = row.get("greeting").unwrap().as_string()?;
        println!("x={}, greeting={}", x, greeting);
    }

    // Close connection
    conn.close().await?;

    Ok(())
}
```

## Querying

### Query with Parameters

```rust
use std::collections::HashMap;

let mut params = HashMap::new();
params.insert("name".to_string(), serde_json::json!("Alice"));
params.insert("age".to_string(), serde_json::json!(30));

let page = conn.query(
    "MATCH (p:Person {name: $name}) RETURN p.age AS age",
    Some(params)
).await?;
```

### Using Query Builder

```rust
use geode_client::QueryBuilder;

let (query, params) = QueryBuilder::new()
    .match_pattern("(p:Person {name: $name})-[:KNOWS]->(friend:Person)")
    .where_clause("friend.age > 25")
    .return_(&["friend.name AS name", "friend.age AS age"])
    .order_by(&["friend.age DESC"])
    .limit(10)
    .with_param("name", "Alice")
    .build();

let page = conn.query(&query, Some(params)).await?;
```

### Pattern Builder

```rust
use geode_client::{PatternBuilder, EdgeDirection};

let pattern = PatternBuilder::new()
    .node("a", "Person")
    .node_props(HashMap::from([
        ("name".to_string(), "$person1".to_string())
    ]))
    .edge("knows", "KNOWS", EdgeDirection::Undirected)
    .variable_length(1, 6)
    .node("b", "Person")
    .node_props(HashMap::from([
        ("name".to_string(), "$person2".to_string())
    ]))
    .build();
```

## Transactions

### Basic Transactions

```rust
conn.begin().await?;

match conn.query("CREATE (p:Person {name: $name})", params).await {
    Ok(_) => conn.commit().await?,
    Err(e) => {
        conn.rollback().await?;
        return Err(e);
    }
}
```

### Savepoints (Partial Rollback)

```rust
conn.begin().await?;

// Create initial data
conn.query("CREATE (p:Person {name: 'Alice', age: 30})", None).await?;

// Create a savepoint
let sp = conn.savepoint("before_update").await?;

// Make changes
conn.query("MATCH (p:Person {name: 'Alice'}) SET p.age = 40", None).await?;

// Rollback to savepoint (undoes the age change)
conn.rollback_to(&sp).await?;

// Alice's age is still 30
conn.commit().await?;
```

## Connection Pooling

```rust
use geode_client::ConnectionPool;

// Create connection pool
let pool = ConnectionPool::new("127.0.0.1", 3141, 10)
    .skip_verify(true)
    .page_size(1000);

// Acquire connection from pool
let conn = pool.acquire().await?;
let page = conn.query("RETURN 1", None).await?;

// Connection automatically returns to pool when dropped
println!("Pool size: {}", pool.size().await);
```

## Configuration

The client uses a builder pattern for configuration:

```rust
let client = Client::new("127.0.0.1", 3141)  // host and port
    .skip_verify(true)                        // Skip TLS verification (development only)
    .page_size(1000)                          // Results page size
    .client_name("my-app")                    // Client name for server logs
    .client_version("1.0.0")                  // Client version
    .conformance("min");                      // GQL conformance level
```

### Configuration Options

- `skip_verify(bool)` - Skip TLS certificate verification (default: false, **insecure**)
- `page_size(usize)` - Results page size (default: 1000)
- `client_name(String)` - Client name sent to server (default: "geode-rust")
- `client_version(String)` - Client version (default: "0.1.0")
- `conformance(String)` - GQL conformance level (default: "min")

## Type System

### Accessing Typed Values

```rust
use geode_client::Value;

let value = row.get("count").unwrap();

// Type-safe access
let int_val = value.as_int()?;
let str_val = value.as_string()?;
let bool_val = value.as_bool()?;
let decimal_val = value.as_decimal()?;
let array_val = value.as_array()?;
let object_val = value.as_object()?;
```

### Value Types

```rust
pub enum Value {
    Null,
    Bool(bool),
    Int(i64),
    Float(f64),
    String(String),
    Decimal(Decimal),
    DateTime(DateTime<Utc>),
    Date(NaiveDate),
    Time(NaiveTime),
    Array(Vec<Value>),
    Object(HashMap<String, Value>),
    Bytes(Vec<u8>),
    // ... more types
}
```

## Error Handling

```rust
use geode_client::{Error, ErrorKind};

match conn.query("INVALID QUERY", None).await {
    Ok(page) => { /* process results */ },
    Err(Error::Query(msg)) => println!("Query error: {}", msg),
    Err(Error::Connection(msg)) => println!("Connection error: {}", msg),
    Err(Error::Transport(msg)) => println!("Transport error: {}", msg),
    Err(e) => println!("Other error: {:?}", e),
}
```

### Error Types

```rust
pub enum Error {
    Query(String),           // Query execution errors
    Connection(String),      // Connection errors
    Transport(String),       // Network transport errors
    Timeout(String),         // Operation timeout
    Parse(String),          // Response parsing errors
    Type(String),           // Type conversion errors
    State(String),          // Invalid state transition
}
```

## TLS Configuration

### Development (Skip Verification)

```rust
let client = Client::new("localhost", 3141)
    .skip_verify(true);
```

### Production (With Certificates)

```rust
// Certificate verification enabled by default
let client = Client::new("geode.example.com", 3141);
```

### Custom CA Certificate

```rust
let client = Client::new("geode.example.com", 3141)
    .ca_cert("/path/to/ca.crt");
```

### Mutual TLS (mTLS)

```rust
let client = Client::new("geode.example.com", 3141)
    .ca_cert("/path/to/ca.crt")
    .client_cert("/path/to/client.crt")
    .client_key("/path/to/client.key");
```

## Testing

### Running Tests

```bash
# Build
cargo build

# Run tests
cargo test

# Run with logging
RUST_LOG=debug cargo test

# Run specific test
cargo test test_basic_query

# Run benchmarks
cargo bench
```

### Code Quality

```bash
# Format code
cargo fmt

# Lint
cargo clippy

# Check types
cargo check

# Documentation
cargo doc --open
```

## Examples

The client includes comprehensive examples:

```bash
# Basic connection and queries
cargo run --example basic

# Advanced features and patterns
cargo run --example advanced

# Transaction management with savepoints
cargo run --example transactions

# Connection pooling
cargo run --example pooling
```

### Social Network Query

```rust
let query = r#"
    MATCH (person:Person {name: $name})-[:KNOWS*1..2]->(friend:Person)
    WHERE friend <> person
    RETURN DISTINCT friend.name AS name, friend.age AS age
    ORDER BY friend.age DESC
    LIMIT 10
"#;

let mut params = HashMap::new();
params.insert("name".to_string(), json!("Alice"));

let page = conn.query(query, Some(params)).await?;

for row in &page.rows {
    let name = row.get("name").unwrap().as_string()?;
    let age = row.get("age").unwrap().as_int()?;
    println!("{} (age {})", name, age);
}
```

### Aggregation Query

```rust
let query = r#"
    MATCH (p:Person)
    RETURN p.city AS city, count(*) AS population
    GROUP BY p.city
    ORDER BY population DESC
    LIMIT 5
"#;

let page = conn.query(query, None).await?;

for row in &page.rows {
    let city = row.get("city").unwrap().as_string()?;
    let population = row.get("population").unwrap().as_int()?;
    println!("{}: {} people", city, population);
}
```

### Batch Insert

```rust
conn.begin().await?;

let people = vec![
    ("Alice", 30),
    ("Bob", 25),
    ("Charlie", 35),
];

for (name, age) in people {
    let mut params = HashMap::new();
    params.insert("name".to_string(), json!(name));
    params.insert("age".to_string(), json!(age));

    conn.query(
        "CREATE (p:Person {name: $name, age: $age})",
        Some(params)
    ).await?;
}

conn.commit().await?;
```

## Performance

The QUIC client provides:

- **Low latency**: ~1-2ms per query (localhost)
- **High throughput**: Depends on workload and pool sizing
- **Zero-cost abstractions**: Minimal overhead from Rust's type system
- **Concurrent**: Full async support for parallel queries

### Performance Tips

1. **Use connection pooling** for concurrent workloads
2. **Batch operations** in transactions
3. **Reuse query builders** for similar queries
4. **Use `&str` instead of `String`** where possible to avoid allocations
5. **Profile with `cargo flamegraph`** to identify bottlenecks

### Benchmarks

```bash
# Run benchmarks
cargo bench

# Generate flamegraph
cargo install flamegraph
cargo flamegraph --bench query_benchmark
```

## Troubleshooting

### Connection Refused

Ensure Geode server is running with QUIC enabled:

```bash
./geode serve --listen 0.0.0.0:3141
```

### TLS Verification Errors

For development, skip verification:

```rust
let client = Client::new("localhost", 3141).skip_verify(true);
```

For production, ensure proper TLS certificates are configured on the server.

### Compilation Errors

Ensure you have the latest stable Rust:

```bash
rustup update stable
```

## Next Steps

- [GQL Reference](../../gql-reference/) - Query language guide
- [Type System](../../data-types/) - Data types reference
- [Transaction Management](../../features/transactions/) - Advanced transactions
- [Performance Tuning](../../performance/) - Optimize performance
