---
title: "API and Interfaces"
description: "Complete guide to Geode's APIs including client libraries, protocol specification, language bindings, REST endpoints, and programmatic database access patterns."
keywords:
  - api
  - client library
  - protocol
  - REST API
  - language bindings
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/api/"
    noindex: false
---

# API and Interfaces

Geode provides multiple API interfaces for programmatic database access, from native client libraries in Go, Python, Rust, and Zig, to low-level protocol access and HTTP endpoints. All APIs are designed around the ISO/IEC 39075:2024 GQL standard, ensuring consistency across languages and platforms.

## Introduction to Geode APIs

Geode's API architecture prioritizes developer experience, performance, and standards compliance. The system provides multiple access methods tailored to different use cases: native client libraries for optimal performance, database/sql driver for Go applications, HTTP/REST endpoints for cross-platform access, and direct QUIC protocol access for custom implementations.

All APIs communicate via the same underlying JSON line protocol over QUIC+TLS, ensuring consistent behavior regardless of language or platform. The protocol is fully documented and versioned, enabling third-party client implementations.

## Client Libraries

### Go Client

The Go client implements the standard `database/sql` interface for seamless integration with Go applications:

```go
import (
    "database/sql"
    "fmt"
    _ "go.codepros.org/geode"
)

// Open database connection
db, err := sql.Open("geode", "geode://localhost:3141/graph")
if err != nil {
    return err
}
defer db.Close()

// Execute GQL query
rows, err := db.Query(`
    MATCH (p:Person)-[:KNOWS]->(friend:Person)
    WHERE p.name = $name
    RETURN friend.name, friend.age
`, "Alice")
if err != nil {
    return err
}
defer rows.Close()

// Iterate results
for rows.Next() {
    var name string
    var age int
    if err := rows.Scan(&name, &age); err != nil {
        return err
    }
    fmt.Printf("%s is %d years old\n", name, age)
}

// Prepared statements
stmt, err := db.Prepare(`
    CREATE (p:Person {name: $name, age: $age})
    RETURN p
`)
defer stmt.Close()

_, err = stmt.Exec("Bob", 30)
```

The Go client provides connection pooling, prepared statement caching, transaction support with savepoints, context-aware cancellation, and full integration with database/sql ecosystem.

### Python Client

The Python client is async-first with type-safe interfaces:

```python
from geode_client import GeodeClient
import asyncio

async def main():
    # Create client with connection pool
    async with GeodeClient("localhost:3141") as client:
        # Execute query with parameters
        result = await client.execute("""
            MATCH (p:Person)-[:KNOWS]->(friend:Person)
            WHERE p.name = $name
            RETURN friend.name AS name, friend.age AS age
        """, {"name": "Alice"})

        # Access results
        for row in result:
            print(f"{row['name']} is {row['age']} years old")

        # Transactions
        async with client.transaction() as tx:
            await tx.execute("""
                CREATE (p:Person {name: $name, age: $age})
            """, {"name": "Charlie", "age": 35})

            # Savepoint
            await tx.savepoint("before_update")

            await tx.execute("""
                MATCH (p:Person {name: $name})
                SET p.age = $age
            """, {"name": "Charlie", "age": 36})

            # Can rollback to savepoint if needed
            # await tx.rollback_to("before_update")

            await tx.commit()

        # Query builder
        from geode_client import QueryBuilder

        query = (QueryBuilder()
            .match("(p:Person)")
            .where("p.age > $min_age")
            .return_("p.name", "p.age")
            .order_by("p.age DESC")
            .limit(10))

        result = await client.execute(query, {"min_age": 25})

asyncio.run(main())
```

Features include async/await with asyncio, connection pooling (1000+ queries/second), type-safe query builders, row-level security support, and comprehensive error handling.

### Rust Client

The Rust client provides zero-cost abstractions with tokio:

```rust
use geode_client::{Client, Error};
use tokio;

#[tokio::main]
async fn main() -> Result<(), Error> {
    // Connect to Geode
    let client = Client::connect("localhost:3141").await?;

    // Execute query with parameters
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

    // Transactions
    let mut tx = client.transaction().await?;

    tx.execute(
        "CREATE (p:Person {name: $name, age: $age})",
        &[("name", "David"), ("age", 40i64)]
    ).await?;

    tx.commit().await?;

    // Type-safe query builder
    use geode_client::query::*;

    let query = Query::new()
        .match_pattern("(p:Person)")
        .where_clause("p.age > $min_age")
        .return_fields(&["p.name", "p.age"])
        .order_by("p.age", Order::Desc)
        .limit(10);

    let results = client.execute_query(&query, &[("min_age", 25i64)]).await?;

    Ok(())
}
```

The Rust client offers high performance (10,000+ queries/second), compile-time type safety, zero-cost abstractions, tokio integration, and connection pooling.

### Zig Client

The Zig client provides low-level control with safety:

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
        .{ .name = "Eve", .age = 28 }
    );

    try tx.commit();
}
```

## Protocol Specification

### JSON Line Protocol

Geode uses a JSON line protocol where each message is a single JSON object terminated by a newline:

```json
# Client sends HELLO
{"type": "HELLO", "version": "1.0", "client": "geode-client-python/0.18.0"}

# Server responds
{"type": "HELLO_ACK", "server_version": "0.18.0", "session_id": "sess_abc123"}

# Client executes query
{"type": "RUN_GQL", "query": "MATCH (n:User) RETURN n LIMIT 10", "params": {}}

# Server sends schema
{"type": "SCHEMA", "fields": [{"name": "n", "type": "NODE"}]}

# Server sends results
{"type": "BINDINGS", "values": [[{"labels": ["User"], "properties": {"id": 1, "name": "Alice"}}]]}
{"type": "BINDINGS", "values": [[{"labels": ["User"], "properties": {"id": 2, "name": "Bob"}}]]}

# Server signals completion
{"type": "SUCCESS", "metadata": {"rows_returned": 2, "execution_time_ms": 5}}
```

### Message Types

Client messages:
- `HELLO` - Initiate connection handshake
- `RUN_GQL` - Execute GQL query with parameters
- `PULL` - Request more result rows
- `BEGIN` - Start transaction
- `COMMIT` - Commit transaction
- `ROLLBACK` - Rollback transaction
- `PING` - Keep-alive heartbeat

Server responses:
- `HELLO_ACK` - Acknowledge connection
- `SCHEMA` - Result set schema information
- `BINDINGS` - Result rows
- `SUCCESS` - Query completed successfully
- `ERROR` - Error occurred with details
- `EXPLAIN` - Query execution plan
- `PROFILE` - Performance profiling data

### Error Handling

Errors follow ISO/IEC 39075:2024 status codes:

```json
{
  "type": "ERROR",
  "code": "22012",
  "category": "DATA_EXCEPTION",
  "message": "Division by zero",
  "details": {
    "query": "RETURN 10 / 0",
    "position": {"line": 1, "column": 11}
  }
}
```

Common error categories:
- `00000` - Success
- `22xxx` - Data exception
- `23xxx` - Constraint violation
- `42xxx` - Syntax error
- `40xxx` - Transaction error
- `08xxx` - Connection error

## HTTP/REST API

### REST Endpoints

For environments where QUIC is unavailable, Geode provides HTTP endpoints:

```bash
# Execute query
curl -X POST https://geode.example.com/api/v1/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token_abc123" \
  -d '{
    "query": "MATCH (n:User) RETURN n LIMIT 10",
    "parameters": {}
  }'

# Response
{
  "schema": {
    "fields": [{"name": "n", "type": "NODE"}]
  },
  "data": [
    {"n": {"labels": ["User"], "properties": {"id": 1, "name": "Alice"}}},
    {"n": {"labels": ["User"], "properties": {"id": 2, "name": "Bob"}}}
  ],
  "metadata": {
    "rows_returned": 2,
    "execution_time_ms": 5
  }
}
```

Available endpoints:
- `POST /api/v1/query` - Execute GQL query
- `POST /api/v1/transaction/begin` - Start transaction
- `POST /api/v1/transaction/{id}/commit` - Commit transaction
- `POST /api/v1/transaction/{id}/rollback` - Rollback transaction
- `GET /api/v1/health` - Health check
- `GET /api/v1/metrics` - Prometheus metrics

### Authentication

HTTP API supports multiple authentication methods:

```bash
# Bearer token
curl -H "Authorization: Bearer token_abc123" \
  https://geode.example.com/api/v1/query

# Basic authentication
curl -u username:password \
  https://geode.example.com/api/v1/query

# API key
curl -H "X-API-Key: key_abc123" \
  https://geode.example.com/api/v1/query
```

## Advanced API Patterns

### Connection Pooling

Implement efficient connection pooling:

```python
from geode_client import ConnectionPool

# Create pool
pool = ConnectionPool(
    url="localhost:3141",
    min_connections=10,
    max_connections=100,
    max_idle_time=300,
    connection_timeout=10
)

# Acquire connection
async with pool.acquire() as client:
    result = await client.execute("MATCH (n) RETURN COUNT(n)")

# Pool automatically manages connections
```

### Batch Operations

Execute multiple queries efficiently:

```python
async with client.transaction() as tx:
    # Batch create nodes
    for i in range(1000):
        await tx.execute("""
            CREATE (p:Person {
                id: $id,
                name: $name,
                created: $timestamp
            })
        """, {
            "id": i,
            "name": f"Person{i}",
            "timestamp": datetime.now()
        })

    await tx.commit()
```

### Streaming Large Results

Stream large result sets efficiently:

```python
# Stream results without loading all into memory
async for row in client.stream("""
    MATCH (n:Person)
    RETURN n
"""):
    process_row(row)
    # Each row is processed as it arrives
```

### Prepared Statements

Use prepared statements for repeated queries:

```go
// Prepare statement once
stmt, err := db.Prepare(`
    MATCH (p:Person {id: $id})
    RETURN p.name, p.age
`)
defer stmt.Close()

// Execute many times
for id := 1; id <= 1000; id++ {
    var name string
    var age int
    err := stmt.QueryRow(id).Scan(&name, &age)
    // Process result
}
```

## Best Practices

1. **Connection Pooling**: Always use connection pools in production applications
2. **Parameterization**: Use parameterized queries to prevent injection attacks
3. **Error Handling**: Handle errors with proper retry logic and fallback strategies
4. **Timeouts**: Set appropriate timeouts for all operations
5. **Transactions**: Use transactions for multi-statement operations requiring atomicity
6. **Resource Cleanup**: Always close connections, statements, and result sets
7. **Monitoring**: Monitor API usage, latency, and error rates
8. **Versioning**: Pin client library versions for production stability

## Troubleshooting

### Connection Issues

```python
from geode_client import GeodeClient, ConnectionError

try:
    client = GeodeClient("localhost:3141", connect_timeout=5)
except ConnectionError as e:
    print(f"Connection failed: {e}")
    # Implement retry logic or fallback
```

### Query Performance

```python
# Use EXPLAIN to diagnose slow queries
result = await client.execute("""
    EXPLAIN
    MATCH (p:Person)-[:KNOWS*1..3]->(friend)
    WHERE p.name = $name
    RETURN friend.name
""", {"name": "Alice"})

print(result.execution_plan)
```

### Memory Management

```go
// Properly close resources to prevent leaks
rows, err := db.Query("MATCH (n) RETURN n")
if err != nil {
    return err
}
defer rows.Close()  // Critical for freeing resources

for rows.Next() {
    // Process rows
}

if err := rows.Err(); err != nil {
    return err
}
```

## Related Topics

- [Client Libraries](/tags/client-library/) - Detailed client library documentation
- [Protocol](/tags/protocol/) - QUIC protocol and wire format
- [Authentication](/tags/authentication/) - Authentication methods
- [Performance](/tags/performance/) - API performance optimization
- [Examples](/tags/examples/) - API usage examples

## Further Reading

- [Go Client Documentation](/docs/clients/go/) - Complete Go client guide
- [Python Client Documentation](/docs/clients/python/) - Python client reference
- [Rust Client Documentation](/docs/clients/rust/) - Rust client guide
- [Protocol Specification](/docs/protocol/) - Wire protocol details
- [REST API Reference](/docs/api/rest/) - HTTP API documentation
