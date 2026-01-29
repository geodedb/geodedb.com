---
title: "Tokio Runtime - Async Rust for Geode"
description: "Use Geode's Rust client with the Tokio async runtime for high-performance, non-blocking database operations in Rust applications."
keywords:
  - Tokio
  - async Rust
  - Rust runtime
  - async await
  - concurrency
  - Rust client
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/tokio/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Tokio Runtime with Geode

The Geode Rust client is built on Tokio, the leading async runtime for Rust. This integration enables high-performance, non-blocking database operations that scale efficiently with your application's concurrency needs.

## Getting Started

Add the Geode client to your `Cargo.toml`:

```toml
[dependencies]
geode-client = "0.18"
tokio = { version = "1", features = ["full"] }
```

**Basic usage**:
```rust
use geode_client::Client;
use tokio;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to Geode (async)
    let client = Client::connect("localhost:3141").await?;

    // Execute query (non-blocking)
    let result = client.query(
        "MATCH (u:User) RETURN u.name, u.email",
        None
    ).await?;

    for row in result.rows() {
        let name: String = row.get("name")?;
        println!("User: {}", name);
    }

    Ok(())
}
```

## Tokio Runtime Configuration

**Multi-threaded runtime** (default with `#[tokio::main]`):
```rust
#[tokio::main]
async fn main() {
    // Uses all available CPU cores
}
```

**Custom runtime configuration**:
```rust
use tokio::runtime::Builder;

fn main() {
    let runtime = Builder::new_multi_thread()
        .worker_threads(4)           // Limit worker threads
        .enable_all()
        .build()
        .unwrap();

    runtime.block_on(async {
        let client = Client::connect("localhost:3141").await.unwrap();
        // ... use client
    });
}
```

## Concurrent Operations

**Spawning tasks**:
```rust
use tokio::task;

async fn process_users(client: &Client, user_ids: Vec<i64>) {
    let handles: Vec<_> = user_ids.into_iter()
        .map(|id| {
            let client = client.clone();
            task::spawn(async move {
                client.query(
                    "MATCH (u:User {id: $id}) RETURN u",
                    Some(params!{"id" => id})
                ).await
            })
        })
        .collect();

    for handle in handles {
        match handle.await {
            Ok(Ok(result)) => println!("Got result: {:?}", result),
            Ok(Err(e)) => eprintln!("Query error: {}", e),
            Err(e) => eprintln!("Task error: {}", e),
        }
    }
}
```

**Using JoinSet for managed concurrency**:
```rust
use tokio::task::JoinSet;

async fn batch_queries(client: &Client, queries: Vec<String>) -> Vec<QueryResult> {
    let mut set = JoinSet::new();

    for query in queries {
        let client = client.clone();
        set.spawn(async move {
            client.query(&query, None).await
        });
    }

    let mut results = Vec::new();
    while let Some(res) = set.join_next().await {
        if let Ok(Ok(result)) = res {
            results.push(result);
        }
    }
    results
}
```

## Best Practices

**Don't block the runtime**: Use `spawn_blocking` for CPU-intensive work:
```rust
let heavy_result = tokio::task::spawn_blocking(|| {
    // CPU-intensive computation
    compute_expensive_thing()
}).await?;
```

**Use timeouts**: Prevent hung operations:
```rust
use tokio::time::{timeout, Duration};

let result = timeout(
    Duration::from_secs(30),
    client.query("MATCH (n) RETURN n", None)
).await??;
```

**Graceful shutdown**:
```rust
use tokio::signal;

#[tokio::main]
async fn main() {
    let client = Client::connect("localhost:3141").await.unwrap();

    // Handle shutdown signal
    tokio::select! {
        _ = signal::ctrl_c() => {
            println!("Shutting down...");
        }
        _ = run_application(&client) => {}
    }

    // Clean up
    client.close().await;
}
```

## Related Topics

- [Rust Client](/tags/rust/)
- [Async Programming](/tags/async/)
- [Connection Pooling](/tags/connection-pooling/)
- [Performance](/tags/performance/)
- [Concurrency](/tags/concurrency/)
