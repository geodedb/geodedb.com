---
title: "Rust Client"
description: "Complete guide to the Geode Rust client library with tokio + Quinn QUIC support"
weight: 30
keywords:
  - Geode Rust client
  - Rust SDK
  - GQL driver
  - graph database Rust
  - QUIC TLS client
---

<!-- CANARY: REQ=REQ-CLIENT-RUST-001; FEATURE="RustClientConnection"; ASPECT=HelloHandshake; STATUS=IMPL; OWNER=clients; UPDATED=2025-02-14 -->

# Geode Rust Client Library

The Rust client provides an async tokio interface with Quinn QUIC transport, typed values, prepared statements, and connection pooling.

## Installation

```bash
cargo add geode-client
```

## Quick Start

```rust
use geode_client::Client;

#[tokio::main]
async fn main() -> geode_client::Result<()> {
    let client = Client::new("localhost", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    let (page, _) = conn.query("MATCH (p:Person) RETURN p.name AS name").await?;
    for row in page.rows {
        let name = row.get("name").unwrap().as_string()?;
        println!("{}", name);
    }

    conn.close()?;
    Ok(())
}
```

## DSN Parsing

```rust
use geode_client::Client;

let client = Client::from_dsn("localhost:3141")?;
let client = Client::from_dsn("localhost:3141?insecure=true&page_size=500")?;
let client = Client::from_dsn("geode://admin:secret@localhost:3141?insecure=true")?;
```

Supported options: `page_size`, `hello_name`, `hello_ver`, `conformance`, `insecure`, `username`, `password`.

## Queries

```rust
let (page, _) = conn.query("RETURN 1 AS ok").await?;
let value = page.rows[0].get("ok").unwrap().as_int()?;
println!("{}", value);
```

### Parameter Binding

```rust
use geode_client::Value;
use std::collections::HashMap;

let mut params = HashMap::new();
params.insert("name".to_string(), Value::string("Alice"));

let (page, _) = conn.query_with_params(
    "MATCH (p:Person {name: $name}) RETURN p",
    &params,
).await?;
```

## Transactions

```rust
conn.begin().await?;
conn.query("CREATE (:Person {name: 'Alice'})").await?;
conn.commit().await?;
```

### Savepoints

```rust
let sp = conn.savepoint("before_risky_op")?;
if let Err(_) = conn.query("CREATE (:Invalid)").await {
    conn.rollback_to(&sp).await?;
}
```

## Prepared Statements

```rust
use geode_client::{PreparedStatement, Value};
use std::collections::HashMap;

let stmt = conn.prepare("MATCH (p:Person {id: $id}) RETURN p")?;

let mut params = HashMap::new();
params.insert("id".to_string(), Value::int(42));

let (page, _) = stmt.execute(&mut conn, &params).await?;
```

## Query Builder

```rust
use geode_client::{QueryBuilder, Value};
use std::collections::HashMap;

let (query, params_json) = QueryBuilder::new()
    .match_pattern("(p:Person)")
    .where_clause("p.age >= $min_age")
    .return_(&["p.name AS name", "p.age AS age"])
    .with_param("min_age", 21)
    .build();

let params: HashMap<String, Value> = params_json
    .into_iter()
    .map(|(k, v)| (k, Value::from_json(v)))
    .collect();

let (page, _) = conn.query_with_params(&query, &params).await?;
```

## Connection Pool

```rust
use geode_client::ConnectionPool;

let pool = ConnectionPool::new("localhost", 3141, 10).skip_verify(true);
let mut conn = pool.acquire().await?;
let (page, _) = conn.query("RETURN 1 AS ok").await?;
```

## Explain and Profile

```rust
let plan = conn.explain("MATCH (p:Person) RETURN p").await?;
let profile = conn.profile("MATCH (p:Person) RETURN p").await?;
```

## Repository

- GitLab: [devnw/codepros/geode/geode-client-rust](https://gitlab.com/devnw/codepros/geode/geode-client-rust)
- Crates.io: [geode-client](https://crates.io/crates/geode-client)
- Docs.rs: [geode-client](https://docs.rs/geode-client)
