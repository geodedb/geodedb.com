---
title: "Async Programming - Non-blocking Database Operations"
description: "Leverage async programming patterns with Geode clients for high-concurrency, non-blocking database operations in Python, Rust, and other languages."
keywords:
  - async
  - asynchronous
  - non-blocking
  - concurrency
  - asyncio
  - tokio
  - await
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/async/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Async Programming with Geode

Geode's client libraries embrace async programming patterns for high-concurrency applications. Non-blocking I/O allows your application to handle thousands of concurrent database operations efficiently without dedicating a thread to each request.

## Why Async Matters

Traditional blocking I/O ties up a thread while waiting for database responses. With async programming:
- A single thread can manage many concurrent operations
- Memory usage scales better (no thread-per-request overhead)
- Latency-sensitive applications respond faster
- Resource utilization improves dramatically

## Python Async Client

The Python client is built on asyncio and aioquic for fully async operation:

```python
import asyncio
from geode_client import Client

async def main():
    client = Client(host="localhost", port=3141)

    async with client.connection() as conn:
        # Non-blocking query execution
        result, _ = await conn.query("""
            MATCH (u:User)-[:FOLLOWS]->(f:User)
            WHERE u.id = $id
            RETURN f.name
        """, {'id': 123})

        for row in result.rows:
            print(row['name'])

# Run with asyncio
asyncio.run(main())
```

**Concurrent queries**:
```python
async def concurrent_queries(user_ids):
    client = Client(host="localhost", port=3141)

    async with client.connection() as conn:
        # Execute multiple queries concurrently
        tasks = [
            conn.query("MATCH (u:User {id: $id}) RETURN u", {'id': uid})
            for uid in user_ids
        ]

        results = await asyncio.gather(*tasks)
        return results
```

## Rust Async Client (Tokio)

The Rust client integrates with the Tokio async runtime:

```rust
use geode_client::Client;
use tokio;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::connect("localhost:3141").await?;

    // Async query execution
    let result = client.query(
        "MATCH (n:Node) RETURN n.name",
        None
    ).await?;

    for row in result.rows() {
        println!("{}", row.get::<String>("name")?);
    }

    Ok(())
}
```

**Spawning concurrent tasks**:
```rust
use tokio::task::JoinSet;

async fn concurrent_queries(client: &Client, ids: Vec<i64>) -> Vec<QueryResult> {
    let mut tasks = JoinSet::new();

    for id in ids {
        let client = client.clone();
        tasks.spawn(async move {
            client.query(
                "MATCH (n:Node {id: $id}) RETURN n",
                Some(params!{"id" => id})
            ).await
        });
    }

    let mut results = Vec::new();
    while let Some(result) = tasks.join_next().await {
        if let Ok(Ok(r)) = result {
            results.push(r);
        }
    }
    results
}
```

## Best Practices

**Don't block the async runtime**: Avoid CPU-intensive or blocking operations in async code. Use `spawn_blocking` for compute-heavy work.

**Use connection pooling**: Combine async with connection pooling for maximum throughput.

**Handle errors properly**: Use proper error handling patterns for async code.

**Batch when possible**: Group related operations to reduce round-trips.

```python
# Good: Batch operations
async with conn.begin():
    await conn.execute("""
        UNWIND $items AS item
        CREATE (n:Node {id: item.id, data: item.data})
    """, {'items': items})
    await conn.commit()

# Avoid: Sequential operations in a loop
for item in items:  # Inefficient!
    await conn.execute("CREATE (n:Node {id: $id})", {'id': item['id']})
```

## Related Topics

- [Tokio Runtime](/tags/tokio/)
- [Python Client](/tags/python/)
- [Rust Client](/tags/rust/)
- [Connection Pooling](/tags/connection-pooling/)
- [Performance](/tags/performance/)
