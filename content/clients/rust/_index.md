---
title: "Rust Client"
description: "Official Rust client for Geode graph database with Quinn QUIC transport and async tokio support"
weight: 3
tags: ["rust", "client", "tokio", "quic", "gql", "async"]
categories: ["clients", "documentation"]
keywords:
  - Geode Rust client
  - Rust GQL driver
  - QUIC TLS client
  - graph database Rust SDK
  - tokio async
series:
  - client-libraries
---

<!-- CANARY: REQ=REQ-CLIENT-RUST-001; FEATURE="RustClientConnection"; ASPECT=HelloHandshake; STATUS=IMPL; OWNER=clients; UPDATED=2025-02-14 -->

# Rust Client Library

The official Rust client for Geode provides a high-performance QUIC implementation built on Quinn and tokio. Use `Client` to create a `Connection`, and `ConnectionPool` for concurrent workloads.

## Installation

```bash
cargo add geode-client
```

**Requirements**: Rust 1.75+ and tokio runtime

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

## DSN Support

`Client::from_dsn` parses common DSN formats:

```rust
use geode_client::Client;

let client = Client::from_dsn("localhost:3141")?;
let client = Client::from_dsn("localhost:3141?insecure_tls_skip_verify=true&page_size=500")?;
let client = Client::from_dsn("quic://admin:secret@localhost:3141?insecure_tls_skip_verify=true")?;
```

Supported options: `page_size`, `hello_name`, `hello_ver`, `conformance`, `insecure_tls_skip_verify`, `username`, `password`.

## Connection Configuration

```rust
use geode_client::Client;

let client = Client::new("localhost", 3141)
    .skip_verify(true)
    .page_size(2000)
    .client_name("my-app")
    .client_version("0.1.0")
    .conformance("full")
    .username("admin")
    .password("secret");
```

## Queries

```rust
let (page, _) = conn.query("MATCH (n) RETURN n").await?;
for row in page.rows {
    let obj = row.get("n").unwrap().as_object()?;
    println!("{:?}", obj);
}
```

## Transactions

```rust
conn.begin().await?;

let (page, _) = conn.query("CREATE (:Person {name: 'Alice'})").await?;
let _ = page;

conn.commit().await?;
```

Savepoints use standard GQL commands and helper types:

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

## EXPLAIN and PROFILE

```rust
let plan = conn.explain("MATCH (p:Person) RETURN p").await?;
let profile = conn.profile("MATCH (p:Person) RETURN p").await?;
```

## Connection Pool

```rust
use geode_client::ConnectionPool;

let pool = ConnectionPool::new("localhost", 3141, 10).skip_verify(true);
let mut conn = pool.acquire().await?;
let (page, _) = conn.query("RETURN 1 AS ok").await?;
```

## Type Mapping

Results are returned as `Value` objects.

```rust
use geode_client::Value;

let (page, _) = conn.query("RETURN 42 AS answer").await?;
let value: &Value = page.rows[0].get("answer").unwrap();
println!("{}", value.as_int()?);
```

| GQL Type | Rust Value | Notes |
|----------|------------|-------|
| INT | `Value` | `as_int()` |
| DECIMAL | `Value` | `as_decimal()` |
| STRING | `Value` | `as_string()` |
| BOOL | `Value` | `as_bool()` |
| LIST | `Value` | `as_array()` |
| MAP | `Value` | `as_object()` |
| NODE | `Value` | Returned as object map |
| EDGE | `Value` | Returned as object map |
| PATH | `Value` | Returned as object map |

## Repository

- GitLab: [devnw/codepros/geode/geode-client-rust](https://gitlab.com/devnw/codepros/geode/geode-client-rust)
- Crates.io: [geode-client](https://crates.io/crates/geode-client)
- Docs.rs: [geode-client](https://docs.rs/geode-client)
