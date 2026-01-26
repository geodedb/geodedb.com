---
title: "Rust Client"
description: "Official Rust client library for Geode"
weight: 3
tags: ["rust", "client", "tokio", "async"]
categories: ["clients", "documentation"]
keywords:
  - Geode Rust client
  - Rust SDK
  - GQL driver
  - graph database Rust
---

<!-- CANARY: REQ=REQ-CLIENT-INTEGRATION-001; FEATURE="RustClientIntegration"; ASPECT=QUICTransport; STATUS=TESTED; OWNER=clients; UPDATED=2026-01-15 -->

# Rust Client Library

The official Rust client for Geode provides a high-performance, type-safe interface built on tokio and quinn for QUIC communication. Features zero-cost abstractions, compile-time type checking, and excellent async support.

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
geode-client = "0.1"
tokio = { version = "1.0", features = ["full"] }
```

**Requirements**: Rust 1.75+

## Quick Start

```rust
use geode_client::{Client, Result};

#[tokio::main]
async fn main() -> Result<()> {
    // Connect to Geode
    let client = Client::connect("localhost:3141").await?;

    // Execute query
    let mut result = client
        .query("MATCH (p:Person) RETURN p.name, p.age")
        .await?;

    // Process results
    while let Some(row) = result.next().await? {
        let name: String = row.get("p.name")?;
        let age: i64 = row.get("p.age")?;
        println!("Name: {}, Age: {}", name, age);
    }

    Ok(())
}
```

## Connection Configuration

### Basic Connection

```rust
use geode_client::{Client, Config};

// Simple connection
let client = Client::connect("localhost:3141").await?;

// With configuration
let config = Config::builder()
    .host("localhost")
    .port(3141)
    .username("user")
    .password("pass")
    .timeout(Duration::from_secs(30))
    .build()?;

let client = Client::connect_with_config(config).await?;
```

### TLS Configuration

```rust
use geode_client::{Client, Config, TlsConfig};

let tls = TlsConfig::builder()
    .ca_file("/path/to/ca.pem")
    .cert_file("/path/to/cert.pem")
    .key_file("/path/to/key.pem")
    .verify_server(true)
    .build()?;

let config = Config::builder()
    .host("localhost")
    .port(3141)
    .tls(tls)
    .build()?;

let client = Client::connect_with_config(config).await?;
```

### Connection Pool

```rust
use geode_client::{Pool, PoolConfig};

// Create connection pool
let pool = Pool::builder()
    .host("localhost")
    .port(3141)
    .min_connections(2)
    .max_connections(10)
    .connection_timeout(Duration::from_secs(30))
    .idle_timeout(Duration::from_secs(300))
    .build()
    .await?;

// Get connection from pool
let client = pool.get().await?;
let result = client.query("MATCH (n) RETURN count(n)").await?;
```

## Query Execution

### Basic Queries

```rust
// Simple query
let result = client.query("MATCH (n:Person) RETURN n LIMIT 10").await?;

// Query with parameters
let result = client
    .query("MATCH (p:Person {name: $name}) RETURN p")
    .param("name", "Alice")
    .await?;

// Multiple parameters
let result = client
    .query("MATCH (p:Person) WHERE p.age >= $min AND p.age <= $max RETURN p")
    .param("min", 25)
    .param("max", 40)
    .await?;
```

### Typed Results

```rust
use serde::Deserialize;

#[derive(Deserialize)]
struct Person {
    name: String,
    age: i64,
}

let mut result = client
    .query("MATCH (p:Person) RETURN p.name, p.age")
    .await?;

while let Some(row) = result.next().await? {
    let person: Person = row.deserialize()?;
    println!("{}: {}", person.name, person.age);
}
```

### Result Processing

```rust
// Iterate over results
let mut result = client.query("MATCH (p:Person) RETURN p").await?;
while let Some(row) = result.next().await? {
    let person: Node = row.get("p")?;
    println!("{:?}", person);
}

// Collect all results
let rows: Vec<Row> = result.collect().await?;

// Get single result
let row = result.single().await?;

// Check if results exist
if let Some(row) = result.next().await? {
    // Process first row
}
```

## Transactions

### Basic Transaction

```rust
let tx = client.begin().await?;

tx.execute(
    "CREATE (:Person {name: $name, age: $age})",
    &[("name", &"Alice"), ("age", &30)]
).await?;

tx.execute(
    "CREATE (:Person {name: $name, age: $age})",
    &[("name", &"Bob"), ("age", &25)]
).await?;

tx.commit().await?;
```

### Transaction with Error Handling

```rust
let tx = client.begin().await?;

let result = async {
    tx.execute("CREATE (:Person {name: 'Alice'})").await?;
    tx.execute("CREATE (:Person {name: 'Bob'})").await?;
    tx.commit().await?;
    Ok::<(), geode_client::Error>(())
}.await;

match result {
    Ok(_) => println!("Transaction committed"),
    Err(e) => {
        tx.rollback().await?;
        eprintln!("Transaction rolled back: {}", e);
    }
}
```

### Savepoints

```rust
let tx = client.begin().await?;

tx.execute("CREATE (:Person {name: 'Alice'})").await?;

// Create savepoint
let sp = tx.savepoint("sp1").await?;

let result = async {
    tx.execute("CREATE (:Person {name: 'Bob'})").await?;
    tx.execute("CREATE (:Invalid)").await?; // This might fail
    Ok::<(), geode_client::Error>(())
}.await;

if result.is_err() {
    sp.rollback().await?; // Roll back to savepoint
}

tx.commit().await?;
```

## Type System

### Type Mapping

| GQL Type | Rust Type |
|----------|-----------|
| INTEGER | i64 |
| FLOAT | f64 |
| STRING | String |
| BOOLEAN | bool |
| NULL | Option<T> |
| LIST | Vec<T> |
| MAP | HashMap<String, Value> |
| NODE | Node |
| RELATIONSHIP | Relationship |
| PATH | Path |

### Working with Nodes

```rust
use geode_client::Node;

let mut result = client.query("MATCH (p:Person) RETURN p").await?;
while let Some(row) = result.next().await? {
    let person: Node = row.get("p")?;

    // Access properties
    let name: String = person.get("name")?;
    let age: i64 = person.get("age")?;

    // Access labels
    println!("Labels: {:?}", person.labels());

    // Access element ID
    println!("ID: {}", person.element_id());

    // Get all properties
    for (key, value) in person.properties() {
        println!("{}: {:?}", key, value);
    }
}
```

### Working with Relationships

```rust
use geode_client::Relationship;

let mut result = client
    .query("MATCH (:Person)-[r:KNOWS]->(:Person) RETURN r")
    .await?;

while let Some(row) = result.next().await? {
    let rel: Relationship = row.get("r")?;

    println!("Type: {}", rel.rel_type());
    println!("Properties: {:?}", rel.properties());
    println!("Start: {}", rel.start_node_id());
    println!("End: {}", rel.end_node_id());
}
```

### Working with Paths

```rust
use geode_client::Path;

let mut result = client
    .query("MATCH p = (:Person)-[:KNOWS*1..3]->(:Person) RETURN p LIMIT 1")
    .await?;

if let Some(row) = result.next().await? {
    let path: Path = row.get("p")?;

    println!("Length: {}", path.len());

    for node in path.nodes() {
        println!("Node: {:?}", node);
    }

    for rel in path.relationships() {
        println!("Relationship: {:?}", rel);
    }
}
```

### Custom Types with Serde

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct Person {
    name: String,
    age: i64,
    email: Option<String>,
}

// Deserialize from query results
let mut result = client
    .query("MATCH (p:Person) RETURN p.name, p.age, p.email")
    .await?;

while let Some(row) = result.next().await? {
    let person: Person = row.deserialize()?;
    println!("{:?}", person);
}

// Serialize for query parameters
let person = Person {
    name: "Alice".to_string(),
    age: 30,
    email: Some("alice@example.com".to_string()),
};

client
    .query("CREATE (:Person {name: $name, age: $age, email: $email})")
    .param("name", &person.name)
    .param("age", &person.age)
    .param("email", &person.email)
    .await?;
```

## Error Handling

```rust
use geode_client::{Error, ErrorKind};

match client.query("MATCH (p:Invalid) RETURN p").await {
    Ok(result) => {
        // Process results
    }
    Err(Error::Syntax { message, line, column }) => {
        eprintln!("Syntax error at {}:{}: {}", line, column, message);
    }
    Err(Error::Constraint { message, .. }) => {
        eprintln!("Constraint violation: {}", message);
    }
    Err(Error::Connection { message }) => {
        eprintln!("Connection error: {}", message);
    }
    Err(e) => {
        eprintln!("Error: {}", e);
    }
}
```

### Error Types

```rust
pub enum Error {
    Syntax { message: String, line: usize, column: usize },
    Constraint { message: String, details: Option<String> },
    Authentication { message: String },
    Authorization { message: String },
    Transaction { message: String },
    Connection { message: String },
    Timeout { message: String },
    Protocol { message: String },
    Serialization { message: String },
}
```

## Advanced Features

### Query Builder

```rust
use geode_client::QueryBuilder;

let query = QueryBuilder::new()
    .match_pattern("(p:Person)")
    .where_clause("p.age > $age")
    .return_clause("p.name, p.age")
    .order_by("p.age DESC")
    .limit(10)
    .build();

let mut result = client
    .query(&query)
    .param("age", 25)
    .await?;
```

### Prepared Statements

```rust
// Prepare statement
let stmt = client
    .prepare("MATCH (p:Person {name: $name}) RETURN p")
    .await?;

// Execute with different parameters
let result1 = stmt.query().param("name", "Alice").await?;
let result2 = stmt.query().param("name", "Bob").await?;

// Statements are automatically cleaned up when dropped
```

### Batch Operations

```rust
let tx = client.begin().await?;

for i in 0..100 {
    tx.execute(
        "CREATE (:Person {name: $name})",
        &[("name", &format!("Person{}", i))]
    ).await?;
}

tx.commit().await?;
```

### Query Profiling

```rust
let mut result = client
    .query("MATCH (p:Person) RETURN p")
    .profile(true)
    .await?;

// Access profiling information
if let Some(profile) = result.profile() {
    println!("Execution time: {:?}", profile.execution_time);
    println!("Rows scanned: {}", profile.rows_scanned);
}
```

### Streaming Results

```rust
use futures::StreamExt;

let mut stream = client
    .query("MATCH (p:Person) RETURN p")
    .stream()
    .await?;

while let Some(result) = stream.next().await {
    match result {
        Ok(row) => {
            let person: Node = row.get("p")?;
            println!("{:?}", person);
        }
        Err(e) => eprintln!("Error: {}", e),
    }
}
```

## Testing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_person() {
        let client = Client::connect("localhost:3141").await.unwrap();

        let tx = client.begin().await.unwrap();
        tx.execute(
            "CREATE (:Person {name: 'Test', age: 25})"
        ).await.unwrap();
        tx.commit().await.unwrap();

        let mut result = client
            .query("MATCH (p:Person {name: 'Test'}) RETURN p.age")
            .await
            .unwrap();

        let row = result.next().await.unwrap().unwrap();
        let age: i64 = row.get("p.age").unwrap();
        assert_eq!(age, 25);
    }
}
```

### Integration Tests with Testcontainers

```rust
use testcontainers::{clients, images::generic::GenericImage};

#[tokio::test]
async fn test_with_container() {
    let docker = clients::Cli::default();
    let geode = GenericImage::new("geode", "latest")
        .with_exposed_port(3141)
        .with_wait_for(testcontainers::core::WaitFor::message_on_stdout("Server started"));

    let node = docker.run(geode);
    let port = node.get_host_port_ipv4(3141);

    let client = Client::connect(&format!("localhost:{}", port))
        .await
        .unwrap();

    // Run tests...
}
```

## Performance Tips

1. **Use Connection Pools** - Reuse connections for better performance
2. **Batch Operations** - Use transactions for multiple operations
3. **Zero-Copy Deserialization** - Use `get()` methods instead of full deserialization
4. **Streaming** - Use `stream()` for large result sets
5. **Prepared Statements** - Reuse prepared statements for repeated queries
6. **Compile-Time Checks** - Leverage Rust's type system for safety

## Async Runtime

The client works with any tokio-compatible runtime:

```rust
// With tokio
#[tokio::main]
async fn main() {
    // ...
}

// With async-std
#[async_std::main]
async fn main() {
    // ...
}

// With custom runtime
let runtime = tokio::runtime::Runtime::new().unwrap();
runtime.block_on(async {
    // ...
});
```

## Examples

See the [examples directory](https://gitlab.com/devnw/codepros/geode/geode-client-rust/tree/main/examples) for complete examples:

- Basic CRUD operations
- Transaction management
- Connection pooling
- Error handling
- Type conversions
- Async patterns
- Integration testing
- Query building

## Repository

- GitLab: [devnw/codepros/geode/geode-client-rust](https://gitlab.com/devnw/codepros/geode/geode-client-rust)
- Crates.io: [geode-client](https://crates.io/crates/geode-client)
- Documentation: [docs.rs/geode-client](https://docs.rs/geode-client)
