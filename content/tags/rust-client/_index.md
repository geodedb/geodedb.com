---
title: "Tag: Rust Tokio Client"
description: "High-performance async Rust client for Geode with tokio runtime, Quinn QUIC transport, zero-cost abstractions, and type-safe query execution for graph database operations."
keywords:
  - Rust client
  - tokio
  - Quinn
  - geode-client-rust
  - Rust SDK
  - Geode
  - async Rust
  - connection pooling
  - zero-cost abstractions
  - type safety
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/rust-client/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

The Geode Rust client library (`geode-client-rust`) provides a high-performance, type-safe async interface for connecting to Geode graph databases. Built on tokio with Quinn for QUIC transport, it delivers exceptional throughput with zero-cost abstractions while leveraging Rust's strong type system to catch errors at compile time.

The Rust client is designed for performance-critical applications, high-throughput data processing, and systems where reliability and efficiency are paramount. With support for 10,000+ queries per second and sub-millisecond latency, it is ideal for demanding production workloads.

## Key Features

**Fully Async with Tokio**: Native tokio runtime integration for efficient async operations.

**Quinn QUIC Transport**: High-performance QUIC implementation with TLS 1.3 using the quinn library.

**Type-Safe Query Builders**: Compile-time checked query construction with fluent builder APIs.

**Zero-Cost Abstractions**: Minimal runtime overhead from Rust's type system and ownership model.

**Connection Pooling**: Built-in pooling supporting 10,000+ queries per second.

**Rich Type System**: Full GQL type support with Decimal, temporal types, and type-safe accessors.

**Comprehensive Error Handling**: Result-based error handling with retry support.

## Installation

Install from [crates.io](https://crates.io/crates/geode-client):

```bash
cargo add geode-client tokio --features tokio/full
```

Or add to your `Cargo.toml`:

```toml
[dependencies]
geode-client = "0.1.1-alpha.8"
tokio = { version = "1", features = ["full"] }
```

### Requirements

- Rust 1.70 or later
- quinn >= 0.10 (QUIC support)
- tokio runtime
- Running Geode server with QUIC enabled

## Quick Start

### Basic Connection

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

### Query with Parameters

```rust
use std::collections::HashMap;

async fn find_person(conn: &Connection, name: &str) -> Result<()> {
    let mut params = HashMap::new();
    params.insert("name".to_string(), serde_json::json!(name));

    let page = conn.query(
        "MATCH (p:Person {name: $name}) RETURN p.age AS age",
        Some(params)
    ).await?;

    if let Some(row) = page.rows.first() {
        let age = row.get("age").unwrap().as_int()?;
        println!("{} is {} years old", name, age);
    }

    Ok(())
}
```

## Connection Configuration

The client uses a builder pattern for configuration:

```rust
let client = Client::new("127.0.0.1", 3141)  // host and port
    .skip_verify(true)                        // Skip TLS verification (development only)
    .page_size(1000)                          // Results page size
    .client_name("my-app")                    // Client name for server logs
    .client_version("1.0.0")                  // Client version
    .conformance("min")                       // GQL conformance level
    .username("admin")                        // Authentication username
    .password("secret");                      // Authentication password
```

### DSN Connection String

Create a client from a DSN (Data Source Name) string:

```rust
use geode_client::Client;

// Simple DSN
let client = Client::from_dsn("localhost:3141").unwrap();

// With options
let client = Client::from_dsn("localhost:3141?insecure=true&page_size=500").unwrap();

// URL format with authentication
let client = Client::from_dsn("geode://admin:secret@localhost:3141?insecure=true").unwrap();
```

### DSN Options

| Option | Aliases | Default | Description |
|--------|---------|---------|-------------|
| `page_size` | | 1000 | Results page size |
| `hello_name` | | "geode-rust-quinn" | Client name |
| `hello_ver` | | "0.1.0" | Client version |
| `conformance` | | "min" | GQL conformance level |
| `insecure` | | false | Skip TLS verification |
| `username` | `user` | | Authentication username |
| `password` | `pass` | | Authentication password |

### Configuration Options

| Method | Default | Description |
|--------|---------|-------------|
| `skip_verify(bool)` | false | Skip TLS certificate verification (insecure) |
| `page_size(usize)` | 1000 | Results page size |
| `client_name(String)` | "geode-rust" | Client name sent to server |
| `client_version(String)` | "0.1.0" | Client version |
| `conformance(String)` | "min" | GQL conformance level |
| `username(String)` | | Authentication username (optional) |
| `password(String)` | | Authentication password (optional) |

## Query Builders

### QueryBuilder

Build queries programmatically with type safety:

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

### PatternBuilder

Build graph patterns:

```rust
use geode_client::{PatternBuilder, EdgeDirection};

let pattern = PatternBuilder::new()
    .node("a", "Person")
    .edge("knows", "KNOWS", EdgeDirection::Undirected)
    .node("b", "Person")
    .build();

// Result: (a:Person)-[knows:KNOWS]-(b:Person)
```

### Available QueryBuilder Methods

| Method | Description |
|--------|-------------|
| `match_pattern(pattern)` | MATCH clause |
| `optional_match(pattern)` | OPTIONAL MATCH clause |
| `where_clause(condition)` | WHERE clause |
| `with(expressions)` | WITH clause |
| `return_(expressions)` | RETURN clause |
| `order_by(expressions)` | ORDER BY clause |
| `skip(n)` | SKIP clause |
| `limit(n)` | LIMIT clause |
| `create(pattern)` | CREATE clause |
| `merge(pattern)` | MERGE clause |
| `delete(expressions)` | DELETE clause |
| `set(assignments)` | SET clause |
| `with_param(name, value)` | Add parameter |

## Transaction Management

### Basic Transactions

```rust
async fn transfer_funds(
    conn: &mut Connection,
    from: &str,
    to: &str,
    amount: f64
) -> Result<()> {
    conn.begin().await?;

    let mut params = HashMap::new();
    params.insert("from".to_string(), serde_json::json!(from));
    params.insert("to".to_string(), serde_json::json!(to));
    params.insert("amount".to_string(), serde_json::json!(amount));

    // Debit from source
    match conn.query(r#"
        MATCH (a:Account {id: $from})
        WHERE a.balance >= $amount
        SET a.balance = a.balance - $amount
    "#, Some(params.clone())).await {
        Ok(_) => {}
        Err(e) => {
            conn.rollback().await?;
            return Err(e);
        }
    }

    // Credit to destination
    match conn.query(r#"
        MATCH (a:Account {id: $to})
        SET a.balance = a.balance + $amount
    "#, Some(params)).await {
        Ok(_) => conn.commit().await,
        Err(e) => {
            conn.rollback().await?;
            Err(e)
        }
    }
}
```

### Savepoints (Partial Rollback)

```rust
async fn complex_operation(conn: &mut Connection) -> Result<()> {
    conn.begin().await?;

    // Create initial data
    conn.query("CREATE (p:Person {name: 'Alice', age: 30})", None).await?;

    // Create a savepoint
    let sp = conn.savepoint("before_update")?;

    // Make changes
    conn.query("MATCH (p:Person {name: 'Alice'}) SET p.age = 40", None).await?;

    // Rollback to savepoint (undoes the age change)
    conn.rollback_to(&sp).await?;

    // Alice's age is still 30
    conn.commit().await?;

    Ok(())
}
```

## Connection Pooling

Use connection pooling for high-throughput workloads:

```rust
use geode_client::ConnectionPool;

#[tokio::main]
async fn main() -> Result<()> {
    // Create connection pool
    let pool = ConnectionPool::new("127.0.0.1", 3141, 10)
        .skip_verify(true)
        .page_size(1000);

    // Acquire connection from pool
    let conn = pool.acquire().await?;
    let page = conn.query("RETURN 1", None).await?;

    // Connection automatically returns to pool when dropped
    println!("Pool size: {}", pool.size().await);

    Ok(())
}
```

### Concurrent Queries

```rust
use tokio::task::JoinSet;

async fn concurrent_queries(pool: &ConnectionPool) -> Result<()> {
    let mut set = JoinSet::new();

    for i in 0..100 {
        let pool = pool.clone();
        set.spawn(async move {
            let conn = pool.acquire().await?;
            let mut params = HashMap::new();
            params.insert("id".to_string(), serde_json::json!(i));
            conn.query("MATCH (p:Person {id: $id}) RETURN p", Some(params)).await
        });
    }

    while let Some(result) = set.join_next().await {
        let page = result??;
        // Process result...
    }

    Ok(())
}
```

## Prepared Statements

```rust
use geode_client::PreparedStatement;

async fn batch_lookup(conn: &mut Connection, ids: &[i64]) -> Result<()> {
    // Create a prepared statement
    let stmt = conn.prepare("MATCH (p:Person {id: $id}) RETURN p.name, p.age")?;

    // Execute multiple times with different parameters
    for id in ids {
        let mut params = HashMap::new();
        params.insert("id".to_string(), Value::int(*id));
        let (page, _) = stmt.execute(conn, &params).await?;
        // Process results...
    }

    Ok(())
}
```

## Query Explain and Profile

```rust
// Get the execution plan without running the query
let plan = conn.explain("MATCH (p:Person)-[:KNOWS]->(f) RETURN f").await?;
println!("Estimated rows: {}", plan.estimated_rows);
for op in &plan.operations {
    println!("  {} - {}", op.op_type, op.description);
}

// Execute with profiling to get actual timing
let profile = conn.profile("MATCH (p:Person) RETURN p LIMIT 100").await?;
println!("Execution time: {:.2}ms", profile.execution_time_ms);
println!("Actual rows: {}", profile.actual_rows);
```

## Batch Queries

```rust
// Execute multiple queries efficiently
let results = conn.batch(&[
    ("MATCH (n:Person) RETURN count(n)", None),
    ("MATCH (n:Company) RETURN count(n)", None),
    ("MATCH ()-[r:WORKS_AT]->() RETURN count(r)", None),
]).await?;

for (i, page) in results.iter().enumerate() {
    println!("Query {}: {} rows", i + 1, page.rows.len());
}
```

## Type System

The client provides a rich type system supporting all GQL data types:

```rust
use geode_client::{Value, ValueKind};

let value = row.get("count").unwrap();

// Type-safe access with Result
let int_val = value.as_int()?;
let str_val = value.as_string()?;
let bool_val = value.as_bool()?;
let decimal_val = value.as_decimal()?;
let array_val = value.as_array()?;
let object_val = value.as_object()?;
let date_val = value.as_date()?;
let timestamp_val = value.as_timestamp()?;

// Check value kind
match value.kind {
    ValueKind::Null => println!("null value"),
    ValueKind::Int => println!("integer: {}", value.as_int()?),
    ValueKind::String => println!("string: {}", value.as_string()?),
    _ => println!("other type"),
}

// Create values programmatically
let int_value = Value::int(42);
let str_value = Value::string("hello");
let bool_value = Value::bool(true);
let array_value = Value::array(vec![Value::int(1), Value::int(2)]);
```

### Supported Types

| Type | Rust Type | Description |
|------|-----------|-------------|
| `Null` | `()` | SQL NULL |
| `Int` | `i64` | 64-bit integer |
| `Bool` | `bool` | Boolean |
| `String` | `String` | UTF-8 string |
| `Decimal` | `rust_decimal::Decimal` | Arbitrary precision decimal |
| `Array` | `Vec<Value>` | Ordered collection |
| `Object` | `HashMap<String, Value>` | Key-value map |
| `Date` | `chrono::NaiveDate` | Calendar date |
| `Timestamp` | `chrono::DateTime<Utc>` | Date and time |
| `Bytea` | `Vec<u8>` | Binary data |

## Error Handling

The client provides comprehensive error types with retry support:

```rust
use geode_client::{Error, Result};
use std::time::Duration;

async fn query_with_retry(
    conn: &mut Connection,
    query: &str
) -> Result<Page> {
    let mut attempts = 0;
    loop {
        match conn.query(query, None).await {
            Ok((page, _)) => return Ok(page),
            Err(e) if e.is_retryable() && attempts < 3 => {
                attempts += 1;
                tokio::time::sleep(Duration::from_millis(100 * attempts)).await;
                continue;
            }
            Err(e) => return Err(e),
        }
    }
}
```

### Error Types

| Error | Retryable | Description |
|-------|-----------|-------------|
| `Connection` | Yes | Network/QUIC connection issues |
| `Query` | Conditional | Query errors (40001, 40P01, 40502 are retryable) |
| `Timeout` | Yes | Operation timed out |
| `Pool` | Yes | Connection pool exhausted |
| `Auth` | No | Authentication failure |
| `Tls` | No | TLS/certificate errors |
| `Validation` | No | Input validation failure |
| `Type` | No | Type conversion errors |

### Input Validation

```rust
use geode_client::validate;

// Validate queries before sending
validate::query("MATCH (n) RETURN n")?;

// Validate parameter names
validate::param_name("user_id")?;

// Validate connection parameters
validate::hostname("geode.example.com")?;
validate::port(3141)?;
validate::page_size(1000)?;
```

## Performance

The QUIC client provides:

- **Low latency**: ~1-2ms per query (localhost)
- **High throughput**: 10,000+ queries/second with connection pooling
- **Zero-cost abstractions**: Minimal overhead from Rust's type system
- **Concurrent**: Full async support for parallel queries

### QUIC System Optimizations

For optimal throughput, configure UDP buffer sizes at the OS level.

**Linux:**

```bash
sudo sysctl -w net.core.rmem_max=7340032
sudo sysctl -w net.core.wmem_max=7340032

# Persist across reboots
echo "net.core.rmem_max=7340032" | sudo tee -a /etc/sysctl.d/99-geode-quic.conf
echo "net.core.wmem_max=7340032" | sudo tee -a /etc/sysctl.d/99-geode-quic.conf
```

**BSD/macOS:**

```bash
sudo sysctl -w kern.ipc.maxsockbuf=8441037
```

**GSO (Generic Segmentation Offload)**: Automatically enabled on Linux 4.18+ by quinn. Batches UDP packets to reduce syscall overhead.

**Path MTU Discovery (DPLPMTUD)**: Enabled by default in quinn, probes for optimal packet sizes.

## Testing

```bash
# Build
cargo build
cargo build --release

# Run tests
cargo test                           # Unit tests (274 tests)
cargo test --test proptest           # Property-based tests (28 tests)
cargo test --features integration    # Integration tests (requires server)

# Run benchmarks
cargo bench                          # All benchmarks (59 benchmarks)
cargo bench -- "query"               # Filter by name

# Run fuzzing (requires nightly)
cargo +nightly fuzz run fuzz_value_from_json

# Code quality
cargo fmt                            # Format code
cargo clippy                         # Lint (0 warnings)
cargo doc --open                     # Generate documentation

# Run examples
cargo run --example basic
cargo run --example advanced
cargo run --example transactions
```

### Test Categories

| Test Type | Count | Command |
|-----------|-------|---------|
| Unit tests | 274 | `cargo test` |
| Property tests | 28 | `cargo test --test proptest` |
| Integration tests | 36 | `cargo test --features integration` |
| Benchmarks | 59 | `cargo bench` |
| Fuzz targets | 4 | `cargo +nightly fuzz run <target>` |

## Best Practices

### Connection Management

```rust
// Good: Reuse connection pool across application
static POOL: OnceCell<ConnectionPool> = OnceCell::new();

async fn get_pool() -> &'static ConnectionPool {
    POOL.get_or_init(|| {
        ConnectionPool::new("localhost", 3141, 20)
            .skip_verify(true)
    })
}

// Good: Use connection from pool
async fn query() -> Result<()> {
    let conn = get_pool().acquire().await?;
    // Connection returns to pool when dropped
    Ok(())
}
```

### Error Handling

```rust
// Good: Use ? operator with proper error propagation
async fn safe_query(conn: &Connection) -> Result<Vec<String>> {
    let page = conn.query("MATCH (p:Person) RETURN p.name", None).await?;

    page.rows.iter()
        .map(|row| row.get("name").unwrap().as_string())
        .collect()
}

// Good: Handle retryable errors
async fn resilient_query(conn: &Connection) -> Result<Page> {
    for attempt in 1..=3 {
        match conn.query("...", None).await {
            Ok((page, _)) => return Ok(page),
            Err(e) if e.is_retryable() => {
                eprintln!("Attempt {} failed, retrying...", attempt);
                tokio::time::sleep(Duration::from_millis(100)).await;
            }
            Err(e) => return Err(e),
        }
    }
    Err(Error::MaxRetriesExceeded)
}
```

## Related Topics

- [Rust](/tags/rust/)
- [Client Libraries](/tags/client-libraries/)
- [QUIC Protocol](/tags/quic/)
- [Tokio](/tags/tokio/)
- [Connection Pooling](/tags/connection-pooling/)
- [Transactions](/tags/transactions/)
- [Performance](/tags/performance/)

## Further Reading

- [Tokio Documentation](https://tokio.rs/)
- [Quinn QUIC Library](https://github.com/quinn-rs/quinn)
- [ISO/IEC 39075:2024 GQL Standard](https://www.iso.org/standard/76120.html)
- [Rust Client on crates.io](https://crates.io/crates/geode-client)
- [Rust Client Repository](https://gitlab.com/devnw/codepros/geode/geode-client-rust)
- [Geode Documentation](/docs/)
