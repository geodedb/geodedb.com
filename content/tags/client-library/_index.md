---
title: "Client Library Overview"
description: "Explore Geode's polyglot client libraries for Go, Python, Rust, and Zig. Learn about connection management, query execution, transaction handling, and best practices for building graph-powered applications."
keywords:
  - client libraries
  - Go client
  - Python client
  - Rust client
  - Zig client
  - Geode
  - graph database
  - QUIC protocol
  - database drivers
  - polyglot support
  - API clients
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/client-library/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Geode provides production-ready client libraries for Go, Python, Rust, and Zig, enabling developers to build graph-powered applications in their preferred language. All clients communicate via QUIC+TLS on port 3141 using a standardized JSON line protocol, ensuring consistent behavior across platforms while leveraging language-specific idioms and patterns.

## Client Library Architecture

All Geode client libraries share a common architecture while providing idiomatic interfaces for each language.

### Shared Design Principles

**Protocol Consistency**
- JSON line protocol for all messages
- QUIC+TLS 1.3 for transport security
- Standardized error codes aligned with ISO GQL

**Connection Management**
- Automatic connection pooling
- Configurable pool sizes
- Health check monitoring
- Graceful shutdown handling

**Query Execution**
- Parameterized query support
- Result streaming for large datasets
- Prepared statement caching
- Transaction management with savepoints

**Error Handling**
- Rich error types with context
- ISO/IEC 39075:2024 status codes
- Query position information for syntax errors
- Connection failure retry logic

## Go Client Library

The Go client integrates with the standard `database/sql` package, enabling use of familiar patterns and existing tooling.

### Installation

```bash
go get go.codepros.org/geode
```

### Quick Start

```go
package main

import (
    "database/sql"
    "log"

    _ "go.codepros.org/geode"
)

func main() {
    // Open connection
    db, err := sql.Open("geode", "geode://localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Configure connection pool
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(time.Hour)

    // Execute query
    rows, err := db.Query(`
        MATCH (p:Person)-[:KNOWS]->(friend:Person)
        WHERE p.name = ?
        RETURN friend.name, friend.email
    `, "Alice")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    // Process results
    for rows.Next() {
        var name, email string
        if err := rows.Scan(&name, &email); err != nil {
            log.Fatal(err)
        }
        fmt.Printf("%s: %s\n", name, email)
    }
}
```

### Connection String Format

```
geode://[username:password@]host:port[?options]
```

**Options:**
- `max_conns` - Maximum pool size (default: 25)
- `idle_conns` - Idle connection count (default: 5)
- `conn_lifetime` - Connection lifetime (default: 1h)
- `tls_verify` - Verify TLS certificates (default: true)

### Transaction Support

```go
// Begin transaction
tx, err := db.Begin()
if err != nil {
    log.Fatal(err)
}

// Execute queries
if _, err := tx.Exec(`CREATE (:User {name: ?})`, "Bob"); err != nil {
    tx.Rollback()
    log.Fatal(err)
}

if _, err := tx.Exec(`CREATE (:User {name: ?})`, "Carol"); err != nil {
    tx.Rollback()
    log.Fatal(err)
}

// Commit
if err := tx.Commit(); err != nil {
    log.Fatal(err)
}
```

### Prepared Statements

```go
// Prepare statement
stmt, err := db.Prepare(`
    MATCH (u:User {email: ?})-[:PURCHASED]->(p:Product)
    RETURN p.name, p.price
`)
if err != nil {
    log.Fatal(err)
}
defer stmt.Close()

// Execute multiple times
emails := []string{"alice@example.com", "bob@example.com"}
for _, email := range emails {
    rows, err := stmt.Query(email)
    if err != nil {
        log.Fatal(err)
    }
    processRows(rows)
    rows.Close()
}
```

### Performance Characteristics

- Throughput: Workload-dependent (see server baselines)
- Connection overhead: ~1ms per new connection
- Query latency: <5ms for simple queries
- Memory: ~5KB per idle connection

## Python Client Library

The Python client provides full async/await support with asyncio integration for high-performance concurrent operations.

### Installation

```bash
pip install geode-client
```

### Quick Start

```python
import asyncio
from geode_client import GeodeClient

async def main():
    # Create client with connection pool
    async with GeodeClient("localhost", 3141, pool_size=50) as client:
        # Execute query
        results = await client.execute_gql("""
            MATCH (p:Person)-[:KNOWS]->(friend:Person)
            WHERE p.name = $name
            RETURN friend.name AS name, friend.email AS email
        """, {"name": "Alice"})

        # Process results
        for row in results:
            print(f"{row['name']}: {row['email']}")

if __name__ == "__main__":
    asyncio.run(main())
```

### Connection Configuration

```python
client = GeodeClient(
    host="localhost",
    port=3141,
    pool_size=50,            # Maximum connections
    pool_timeout=30.0,       # Connection acquisition timeout
    verify_tls=True,         # Verify TLS certificates
    username="admin",        # Optional authentication
    password="secret"
)
```

### Transaction Management

```python
async def transfer_funds(client, from_user, to_user, amount):
    async with client.transaction() as tx:
        # Debit from source
        await tx.execute("""
            MATCH (u:User {id: $user_id})
            SET u.balance = u.balance - $amount
        """, {"user_id": from_user, "amount": amount})

        # Create savepoint
        await tx.savepoint("before_credit")

        try:
            # Credit to destination
            await tx.execute("""
                MATCH (u:User {id: $user_id})
                SET u.balance = u.balance + $amount
            """, {"user_id": to_user, "amount": amount})
        except Exception as e:
            # Rollback to savepoint
            await tx.rollback_to_savepoint("before_credit")
            raise

        # Commit transaction
        await tx.commit()
```

### Concurrent Queries

```python
async def fetch_user_data(client, user_id):
    # Execute queries concurrently
    profile_task = client.execute_gql(
        "MATCH (u:User {id: $id}) RETURN u",
        {"id": user_id}
    )

    friends_task = client.execute_gql(
        "MATCH (u:User {id: $id})-[:FRIENDS_WITH]->(f) RETURN f",
        {"id": user_id}
    )

    purchases_task = client.execute_gql(
        "MATCH (u:User {id: $id})-[:PURCHASED]->(p) RETURN p",
        {"id": user_id}
    )

    # Await all results
    profile, friends, purchases = await asyncio.gather(
        profile_task,
        friends_task,
        purchases_task
    )

    return {
        "profile": profile,
        "friends": friends,
        "purchases": purchases
    }
```

### Error Handling

```python
from geode_client import GeodeError, GeodeSyntaxError, GeodeConnectionError

try:
    await client.execute_gql("INVALID QUERY")
except GeodeSyntaxError as e:
    print(f"Syntax error at position {e.position}: {e.message}")
except GeodeConnectionError as e:
    print(f"Connection failed: {e.message}")
except GeodeError as e:
    print(f"Error code {e.code}: {e.message}")
```

### Performance Characteristics

- Throughput: Workload-dependent (see server baselines)
- Connection pooling: 50+ concurrent connections
- Query latency: <10ms for simple queries
- Memory: ~10KB per connection

## Rust Client Library

The Rust client provides zero-cost abstractions with compile-time safety and tokio runtime integration.

### Installation

Add to `Cargo.toml`:

```toml
[dependencies]
geode-client = "0.18"
tokio = { version = "1", features = ["full"] }
```

### Quick Start

```rust
use geode_client::{GeodeClient, GeodeValue};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create client
    let client = GeodeClient::new("localhost", 3141).await?;

    // Execute query
    let results = client
        .query(r#"
            MATCH (p:Person)-[:KNOWS]->(friend:Person)
            WHERE p.name = $name
            RETURN friend.name, friend.email
        "#)
        .bind("name", GeodeValue::String("Alice".to_string()))
        .execute()
        .await?;

    // Process results
    for row in results {
        let name: String = row.get("friend.name")?;
        let email: String = row.get("friend.email")?;
        println!("{}: {}", name, email);
    }

    Ok(())
}
```

### Connection Pool Configuration

```rust
let client = GeodeClient::builder()
    .host("localhost")
    .port(3141)
    .pool_size(100)
    .connection_timeout(Duration::from_secs(10))
    .idle_timeout(Duration::from_secs(300))
    .verify_tls(true)
    .build()
    .await?;
```

### Type-Safe Query Builders

```rust
use geode_client::query::Query;

let results = client
    .query("MATCH (p:Product) WHERE p.price < $max RETURN p")
    .bind("max", GeodeValue::Float(100.0))
    .limit(10)
    .execute()
    .await?;
```

### Transaction Support

```rust
use geode_client::Transaction;

let mut tx = client.transaction().await?;

tx.execute(
    "CREATE (:User {id: $id, name: $name})",
    &[
        ("id", GeodeValue::String("user123".into())),
        ("name", GeodeValue::String("Alice".into())),
    ]
).await?;

tx.execute(
    "CREATE (:User {id: $id, name: $name})",
    &[
        ("id", GeodeValue::String("user456".into())),
        ("name", GeodeValue::String("Bob".into())),
    ]
).await?;

tx.commit().await?;
```

### Performance Characteristics

- Throughput: Workload-dependent (see server baselines)
- Zero-copy deserialization where possible
- Query latency: <3ms for simple queries
- Memory: ~3KB per idle connection

## Zig Client Library

The Zig client provides a production-ready interface for Zig applications with manual memory management.

### Installation

Add to `build.zig.zon`:

```zig
.dependencies = .{
    .geode_client = .{
        .url = "https://geodedb.com/zig/geode-client-0.18.0.tar.gz",
    },
},
```

### Quick Start

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Create client
    var client = try geode.Client.init(allocator, "localhost", 3141);
    defer client.deinit();

    // Execute query
    const query =
        \\MATCH (p:Person)-[:KNOWS]->(friend:Person)
        \\WHERE p.name = $name
        \\RETURN friend.name, friend.email
    ;

    var results = try client.execute(query, .{
        .name = "Alice",
    });
    defer results.deinit();

    // Process results
    while (try results.next()) |row| {
        const name = try row.getString("friend.name");
        const email = try row.getString("friend.email");
        std.debug.print("{s}: {s}\n", .{ name, email });
    }
}
```

### Memory Management

```zig
// Allocator is passed explicitly
var client = try geode.Client.init(allocator, "localhost", 3141);
defer client.deinit();  // Clean up resources

var results = try client.execute(query, params);
defer results.deinit();  // Free result memory
```

### Performance Characteristics

- Throughput: Workload-dependent (see server baselines)
- Explicit memory management
- Query latency: <4ms for simple queries
- Memory: ~2KB per idle connection

## Cross-Client Compatibility

All client libraries support the same feature set with consistent behavior.

### Feature Parity Matrix

| Feature | Go | Python | Rust | Zig |
|---------|----|----|------|-----|
| Connection pooling | ✓ | ✓ | ✓ | ✓ |
| Parameterized queries | ✓ | ✓ | ✓ | ✓ |
| Transactions | ✓ | ✓ | ✓ | ✓ |
| Savepoints | ✓ | ✓ | ✓ | ✓ |
| Prepared statements | ✓ | ✓ | ✓ | ✓ |
| Streaming results | ✓ | ✓ | ✓ | ✓ |
| TLS/QUIC | ✓ | ✓ | ✓ | ✓ |
| Error handling | ✓ | ✓ | ✓ | ✓ |

### Protocol Compatibility

All clients use the same wire protocol:

```json
// Query request
{"type": "RUN_GQL", "query": "MATCH (n) RETURN n", "params": {}}

// Query response
{"type": "SCHEMA", "fields": ["n"]}
{"type": "BINDINGS", "values": [{"id": 1, "labels": ["Person"]}]}
```

## Testing Client Libraries

The cross-client test harness validates consistent behavior.

### Running Tests

```bash
cd geode-test-harness

# Test all clients
make test-all

# Test specific client
make test-go
make test-python
make test-rust
make test-zig

# Generate HTML reports
make test-all-html
```

### Test Coverage

The test harness validates:

- Basic operations (CRUD, queries)
- Transaction handling
- Concurrent access
- Error conditions
- Data type support
- Connection management
- Performance characteristics

## Best Practices

### Connection Pooling

Configure pools based on workload:

```go
// Go: Web application with moderate concurrency
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(5)

// Python: High-throughput async application
client = GeodeClient("localhost", 3141, pool_size=100)

// Rust: Microservice with variable load
GeodeClient::builder().pool_size(50).build()
```

### Error Handling

Handle errors appropriately for each language:

**Go:**
```go
if err != nil {
    switch e := err.(type) {
    case *geode.SyntaxError:
        log.Printf("Syntax error at %d: %s", e.Position, e.Message)
    case *geode.ConnectionError:
        log.Printf("Connection failed: %s", e.Message)
    default:
        log.Printf("Error: %s", err)
    }
}
```

**Python:**
```python
try:
    await client.execute_gql(query)
except GeodeSyntaxError as e:
    logger.error(f"Syntax error: {e.message}")
except GeodeError as e:
    logger.error(f"Database error: {e.code} - {e.message}")
```

**Rust:**
```rust
match client.query(query).execute().await {
    Ok(results) => process_results(results),
    Err(GeodeError::Syntax { position, message }) => {
        eprintln!("Syntax error at {}: {}", position, message);
    }
    Err(e) => eprintln!("Error: {}", e),
}
```

### Parameterized Queries

Always use parameters to prevent injection:

```go
// Good - parameterized
db.Query("MATCH (u:User {email: ?}) RETURN u", email)

// Bad - string concatenation
db.Query(fmt.Sprintf("MATCH (u:User {email: '%s'}) RETURN u", email))
```

### Resource Cleanup

Ensure proper resource cleanup:

**Go:**
```go
defer db.Close()
defer rows.Close()
defer stmt.Close()
```

**Python:**
```python
async with GeodeClient(...) as client:
    # Automatic cleanup on context exit
    pass
```

**Rust:**
```rust
// RAII handles cleanup automatically
let client = GeodeClient::new(...).await?;
// Dropped when out of scope
```

**Zig:**
```zig
var client = try geode.Client.init(...);
defer client.deinit();  // Explicit cleanup
```

## Choosing a Client Library

Select based on your project requirements:

**Go Client**
- Integrates with existing Go applications
- Standard `database/sql` compatibility
- Excellent for web services and APIs
- Strong concurrency support

**Python Client**
- Full async/await support
- Ideal for data science and ML pipelines
- Rich ecosystem integration
- Rapid prototyping

**Rust Client**
- Maximum performance and type safety
- Zero-cost abstractions
- Best for systems programming
- Compile-time guarantees

**Zig Client**
- Explicit memory control
- Minimal runtime overhead
- Low-level systems integration
- Excellent for embedded systems

All clients provide production-ready implementations with comprehensive documentation, examples, and community support. Choose based on your team's expertise and application requirements.
