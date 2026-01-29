---
title: "Connection Pooling - Efficient Resource Management"
description: "Optimize Geode client performance with connection pooling for reduced latency, efficient resource utilization, and high-throughput applications."
keywords:
  - connection pooling
  - resource management
  - performance
  - client optimization
  - connection reuse
  - throughput
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/connection-pooling/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Connection Pooling in Geode

Connection pooling is essential for high-performance Geode applications. By reusing established connections instead of creating new ones for each request, pooling dramatically reduces latency and improves throughput.

## Why Connection Pooling Matters

Establishing a new Geode connection involves:
- QUIC handshake (TLS 1.3 negotiation)
- Protocol initialization (HELLO message exchange)
- Authentication (if enabled)

This overhead, while small per connection, becomes significant at scale. Connection pooling amortizes this cost across many requests.

## Python Client Pooling

```python
from geode_client import ConnectionPool

# Create pool with configuration
pool = ConnectionPool(
    host="localhost",
    port=3141,
    min_connections=5,      # Minimum idle connections
    max_connections=50,     # Maximum total connections
    connection_timeout=30.0, # Timeout for acquiring connection
    idle_timeout=300.0      # Close idle connections after 5 minutes
)

async def query_with_pool():
    # Acquire connection from pool
    async with pool.acquire() as conn:
        result, _ = await conn.query("""
            MATCH (u:User {id: $id})
            RETURN u.name
        """, {'id': 123})
        return result

# Pool manages connection lifecycle automatically
```

## Go Client Pooling

The Go client uses `database/sql` which provides built-in connection pooling:

```go
import (
    "database/sql"
    _ "geodedb.com/geode"
)

// Open creates a pool, not a single connection
db, err := sql.Open("geode", "localhost:3141")
if err != nil {
    log.Fatal(err)
}

// Configure pool settings
db.SetMaxOpenConns(50)        // Maximum connections
db.SetMaxIdleConns(10)        // Maximum idle connections
db.SetConnMaxLifetime(5 * time.Minute)
db.SetConnMaxIdleTime(1 * time.Minute)

// Queries automatically use pooled connections
rows, err := db.QueryContext(ctx, "MATCH (u:User) RETURN u.name")
```

## Rust Client Pooling

```rust
use geode_client::{Client, PoolConfig};

// Configure connection pool
let config = PoolConfig {
    min_connections: 5,
    max_connections: 50,
    connection_timeout: Duration::from_secs(30),
    idle_timeout: Duration::from_secs(300),
};

let client = Client::builder()
    .host("localhost")
    .port(3141)
    .pool_config(config)
    .build()
    .await?;

// Connections managed automatically
let result = client.query("MATCH (n:Node) RETURN count(n)").await?;
```

## Pool Sizing Guidelines

**Minimum connections**: Set based on baseline load. Having connections ready reduces latency for initial requests after idle periods.

**Maximum connections**: Consider:
- Server capacity (check Geode server configuration)
- Application concurrency requirements
- Memory overhead per connection
- Network limits

**Rule of thumb**: Start with `max_connections = (number of cores * 2) + disk spindles` for the database server, adjusted for your workload.

## Monitoring Pool Health

Track these metrics:
- Active connections vs. pool size
- Connection wait time
- Connection creation rate
- Connection errors

```python
# Python pool statistics
stats = pool.stats()
print(f"Active: {stats.active}")
print(f"Idle: {stats.idle}")
print(f"Waiting: {stats.waiting}")
```

## Best Practices

**Size appropriately**: Oversized pools waste resources; undersized pools cause contention.

**Handle exhaustion gracefully**: Set appropriate timeouts and handle pool exhaustion errors.

**Release connections promptly**: Don't hold connections during long-running application logic.

**Use connection health checks**: Configure pools to validate connections before use.

## Related Topics

- [Performance](/tags/performance/)
- [Go Client](/tags/go/)
- [Python Client](/tags/python/)
- [Rust Client](/tags/rust/)
- [Async Programming](/tags/async/)
