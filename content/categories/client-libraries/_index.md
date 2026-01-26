---
title: "Category: Client Libraries"
description: "Comprehensive Client Libraries documentation for Geode graph database including guides, tutorials, and reference materials."
keywords:
  - Client Libraries
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/client-libraries/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Geode's client libraries provide idiomatic, production-ready interfaces for connecting to and interacting with Geode graph database from multiple programming languages. Each client library is designed to feel native to its language ecosystem while providing consistent access to Geode's features including GQL query execution, transaction management, connection pooling, prepared statements, and streaming result sets.

The client library ecosystem includes official support for Go, Python, Rust, and Zig, with each implementation optimized for its language's concurrency model and performance characteristics. All clients communicate via QUIC+TLS using the JSON line protocol, ensuring low latency, efficient multiplexing, and strong security. Whether you're building high-throughput microservices in Go, data science workflows in Python, performance-critical systems in Rust, or systems programming in Zig, there's a client library designed for your needs.

This category provides comprehensive documentation for each client library, including installation, usage patterns, best practices, performance tuning, and migration guides. Examples demonstrate real-world patterns from simple queries to complex transaction management and streaming operations.

## Available Client Libraries

### Go Client Library

**Module**: `go.codepros.org/geode`
**Go Version**: 1.24.0+
**Key Features**: database/sql driver, prepared statements, connection pooling

The Go client implements the standard `database/sql` interface, making it familiar to Go developers and compatible with existing database tooling. It provides both the standard interface and an extended API for graph-specific operations.

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"

    _ "go.codepros.org/geode"
)

func main() {
    // Connect using database/sql
    db, err := sql.Open("geode", "geode://localhost:3141/mydb")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Configure connection pool
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(300)

    // Execute GQL query
    rows, err := db.QueryContext(context.Background(), `
        MATCH (u:User)-[:FRIEND]->(f:User)
        WHERE u.city = $1
        RETURN f.name, f.email
    `, "San Francisco")
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
        fmt.Printf("%s <%s>\n", name, email)
    }
}
```

**Transaction Support**:

```go
// Begin transaction
tx, err := db.Begin()
if err != nil {
    log.Fatal(err)
}

// Execute multiple operations
_, err = tx.Exec("CREATE (:User {name: $1, email: $2})", "Alice", "alice@example.com")
if err != nil {
    tx.Rollback()
    return err
}

_, err = tx.Exec("MATCH (u:User {email: $1}) SET u.verified = true", "alice@example.com")
if err != nil {
    tx.Rollback()
    return err
}

// Commit transaction
if err = tx.Commit(); err != nil {
    log.Fatal(err)
}
```

**Prepared Statements**:

```go
// Prepare statement for reuse
stmt, err := db.Prepare(`
    MATCH (u:User {id: $1})-[:POSTED]->(p:Post)
    RETURN p.title, p.content, p.created_at
    ORDER BY p.created_at DESC
    LIMIT $2
`)
if err != nil {
    log.Fatal(err)
}
defer stmt.Close()

// Execute with different parameters
for _, userID := range userIDs {
    rows, err := stmt.Query(userID, 10)
    if err != nil {
        log.Printf("Query failed for user %d: %v", userID, err)
        continue
    }
    processRows(rows)
    rows.Close()
}
```

### Python Client Library

**Package**: `geode-client`
**Python Version**: 3.9+
**Key Features**: Async/await, connection pooling, type-safe values

The Python client is fully asynchronous using `asyncio` and `aioquic`, designed for high-performance concurrent workloads. It provides pythonic APIs with type hints and comprehensive async context managers.

```python
from geode_client import GeodeClient
import asyncio

async def main():
    # Connect with context manager
    async with GeodeClient("localhost:3141") as client:
        # Execute query
        result = await client.execute("""
            MATCH (u:User)-[:FRIEND]->(f:User)
            WHERE u.city = $city
            RETURN f.name, f.email
        """, {'city': 'San Francisco'})

        # Process results
        async for row in result:
            print(f"{row['f.name']} <{row['f.email']}>")

asyncio.run(main())
```

**Connection Pooling**:

```python
from geode_client import ConnectionPool

# Create connection pool
pool = ConnectionPool(
    host='localhost',
    port=3141,
    min_size=5,
    max_size=20,
    max_idle_time=300  # 5 minutes
)

async def query_with_pool():
    async with pool.acquire() as client:
        result = await client.execute("""
            MATCH (n:Node)
            RETURN COUNT(n) AS count
        """)
        return (await result.single())['count']

# Pool automatically manages connections
counts = await asyncio.gather(*[query_with_pool() for _ in range(100)])
```

**Transaction Management**:

```python
async def create_user_with_posts(client, user_data, posts):
    async with client.transaction() as tx:
        # Create user
        user_result = await tx.execute("""
            CREATE (u:User {name: $name, email: $email})
            RETURN id(u) AS user_id
        """, user_data)
        user_id = (await user_result.single())['user_id']

        # Create posts
        await tx.execute("""
            UNWIND $posts AS post
            MATCH (u:User) WHERE id(u) = $user_id
            CREATE (u)-[:POSTED]->(p:Post {
                title: post.title,
                content: post.content,
                created_at: datetime()
            })
        """, {'user_id': user_id, 'posts': posts})

        # Commit transaction
        await tx.commit()
```

**Prepared Statements**:

```python
async def batch_user_lookup(client, user_ids):
    # Prepare statement
    async with client.prepare("""
        MATCH (u:User {id: $user_id})-[:FRIEND]->(f:User)
        RETURN f.name, f.email
    """) as stmt:
        # Execute with different parameters
        results = []
        for user_id in user_ids:
            result = await stmt.execute(user_id=user_id)
            friends = [row async for row in result]
            results.append(friends)

        return results
```

### Rust Client Library

**Crate**: `geode-client`
**Rust Version**: 1.70+
**Key Features**: Tokio async, quinn QUIC, zero-cost abstractions

The Rust client leverages tokio for async I/O and quinn for QUIC support, providing maximum performance with type safety. It's designed for high-throughput, low-latency applications.

```rust
use geode_client::{Client, Error};
use tokio;

#[tokio::main]
async fn main() -> Result<(), Error> {
    // Connect to Geode
    let client = Client::connect("localhost:3141").await?;

    // Execute query
    let mut result = client.execute(
        "MATCH (u:User)-[:FRIEND]->(f:User) WHERE u.city = $city RETURN f.name, f.email",
        &[("city", "San Francisco")]
    ).await?;

    // Process results
    while let Some(row) = result.next().await? {
        let name: String = row.get("f.name")?;
        let email: String = row.get("f.email")?;
        println!("{} <{}>", name, email);
    }

    Ok(())
}
```

**Transaction Support**:

```rust
use geode_client::Transaction;

async fn create_user_transaction(client: &Client) -> Result<(), Error> {
    // Begin transaction
    let mut tx = client.begin().await?;

    // Execute operations
    tx.execute(
        "CREATE (:User {name: $name, email: $email})",
        &[("name", "Alice"), ("email", "alice@example.com")]
    ).await?;

    tx.execute(
        "MATCH (u:User {email: $email}) SET u.verified = true",
        &[("email", "alice@example.com")]
    ).await?;

    // Commit
    tx.commit().await?;

    Ok(())
}
```

**Connection Pooling**:

```rust
use geode_client::ConnectionPool;

#[tokio::main]
async fn main() -> Result<(), Error> {
    // Create connection pool
    let pool = ConnectionPool::builder()
        .max_connections(20)
        .min_connections(5)
        .connect("localhost:3141")
        .await?;

    // Use connections from pool
    let handles: Vec<_> = (0..100)
        .map(|_| {
            let pool = pool.clone();
            tokio::spawn(async move {
                let client = pool.acquire().await?;
                client.execute("MATCH (n:Node) RETURN COUNT(n)", &[]).await
            })
        })
        .collect();

    // Wait for all queries
    for handle in handles {
        handle.await??;
    }

    Ok(())
}
```

### Zig Client Library

**Build**: Zig 0.15.1+
**Key Features**: Native async, vendored QUIC, zero dependencies

The Zig client is a self-contained implementation with vendored QUIC support, designed for systems programming and embedded use cases.

```zig
const std = @import("std");
const geode = @import("geode");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Connect to Geode
    var client = try geode.Client.connect(allocator, "localhost", 3141);
    defer client.deinit();

    // Execute query
    const query =
        \\MATCH (u:User)-[:FRIEND]->(f:User)
        \\WHERE u.city = $city
        \\RETURN f.name, f.email
    ;

    var result = try client.execute(query, .{
        .city = "San Francisco",
    });
    defer result.deinit();

    // Process results
    while (try result.next()) |row| {
        const name = row.get("f.name").?.string;
        const email = row.get("f.email").?.string;
        std.debug.print("{s} <{s}>\n", .{ name, email });
    }
}
```

## Common Features Across Clients

### QUIC Transport

All clients use QUIC+TLS for transport, providing:
- **Multiplexing**: Multiple concurrent queries on one connection
- **Low latency**: 0-RTT connection resumption
- **Built-in encryption**: TLS 1.3 mandatory
- **Connection migration**: Seamless network changes

### JSON Line Protocol

Clients communicate using a simple JSON line protocol:

```json
// Client request
{"type":"RUN_GQL","query":"MATCH (n:User) RETURN n.name","params":{}}

// Server response
{"type":"SCHEMA","fields":[{"name":"n.name","type":"STRING"}]}
{"type":"BINDINGS","values":["Alice"]}
{"type":"BINDINGS","values":["Bob"]}
{"type":"SUCCESS","has_more":false}
```

This protocol is:
- **Simple**: Easy to debug and implement
- **Efficient**: Compact JSON encoding
- **Streaming**: Results stream as they're produced
- **Extensible**: New message types for features

### Error Handling

All clients provide rich error types mapped from ISO GQL status codes:

```python
# Python
from geode_client import GeodeError, SyntaxError, ConstraintViolation

try:
    await client.execute("INVALID GQL")
except SyntaxError as e:
    print(f"Query syntax error: {e.message}")
except ConstraintViolation as e:
    print(f"Constraint violated: {e.constraint_name}")
except GeodeError as e:
    print(f"Database error: {e}")
```

```go
// Go
import "go.codepros.org/geode/errors"

_, err := db.Query("INVALID GQL")
if err != nil {
    if errors.IsSyntaxError(err) {
        log.Printf("Syntax error: %v", err)
    } else if errors.IsConstraintViolation(err) {
        log.Printf("Constraint violation: %v", err)
    } else {
        log.Printf("Database error: %v", err)
    }
}
```

### Prepared Statements

All clients support prepared statements for query plan caching:

1. Client sends query to server
2. Server parses and optimizes query, caches plan
3. Server returns statement ID
4. Client can execute repeatedly with different parameters
5. Server reuses cached plan

Benefits:
- **Performance**: Eliminate parse/optimize overhead
- **Security**: Prevent injection attacks
- **Resource usage**: Reduced server CPU

## Best Practices

### Connection Management

**Use connection pooling** for concurrent workloads:

```python
# Good: Connection pool
pool = ConnectionPool(min_size=5, max_size=20)

async def handler(request):
    async with pool.acquire() as client:
        return await client.execute(request.query)

# Avoid: Creating connections per request
async def bad_handler(request):
    async with GeodeClient("localhost:3141") as client:  # Expensive!
        return await client.execute(request.query)
```

**Close connections properly**:

```rust
// Good: Explicit cleanup
{
    let client = Client::connect("localhost:3141").await?;
    let result = client.execute(query, params).await?;
    // client dropped here, connection closed
}

// Or use connection pooling
let pool = ConnectionPool::builder().connect("localhost:3141").await?;
```

### Error Handling

**Handle specific error types**:

```go
result, err := db.ExecContext(ctx, query, params...)
if err != nil {
    switch {
    case errors.IsDeadlock(err):
        // Retry transaction
        return retryTransaction()
    case errors.IsConstraintViolation(err):
        // Return user-friendly error
        return fmt.Errorf("duplicate entry")
    default:
        // Log and return generic error
        log.Printf("Query failed: %v", err)
        return err
    }
}
```

### Transaction Management

**Keep transactions short**:

```python
# Good: Short, focused transaction
async with client.transaction() as tx:
    await tx.execute("CREATE (:User {name: $name})", {'name': 'Alice'})
    await tx.commit()

# Avoid: Long-running transaction
async with client.transaction() as tx:
    for user in thousands_of_users:  # Don't do this!
        await tx.execute("CREATE (:User {name: $name})", user)
        await asyncio.sleep(0.1)  # Never sleep in a transaction!
    await tx.commit()
```

**Use batch operations** instead:

```python
# Better: Batch insert
async with client.transaction() as tx:
    await tx.execute("""
        UNWIND $users AS user
        CREATE (:User {name: user.name, email: user.email})
    """, {'users': thousands_of_users})
    await tx.commit()
```

### Performance Optimization

**Use prepared statements** for repeated queries:

```rust
// Prepare once
let stmt = client.prepare(
    "MATCH (u:User {id: $id}) RETURN u.name, u.email"
).await?;

// Execute many times
for id in user_ids {
    let result = stmt.execute(&[("id", id)]).await?;
    process_result(result).await?;
}
```

**Stream large result sets**:

```go
// Stream results, don't load all into memory
rows, err := db.Query("MATCH (n:Node) RETURN n")
defer rows.Close()

for rows.Next() {
    var node Node
    rows.Scan(&node)
    processNode(node)  // Process one at a time
}
```

## Migration Guides

### From Neo4j Driver

```python
# Neo4j
from neo4j import GraphDatabase

driver = GraphDatabase.driver("bolt://localhost:7687")
with driver.session() as session:
    result = session.run("MATCH (n:User) RETURN n.name")
    for record in result:
        print(record["n.name"])

# Geode equivalent
from geode_client import GeodeClient

async with GeodeClient("localhost:3141") as client:
    result = await client.execute("MATCH (n:User) RETURN n.name")
    async for row in result:
        print(row["n.name"])
```

Key differences:
- Geode uses QUIC (port 3141) instead of Bolt (port 7687)
- Geode client is async-first
- GQL syntax instead of Cypher

### From SQL Database

```python
# SQL with psycopg2
import psycopg2

conn = psycopg2.connect("postgresql://localhost/mydb")
cur = conn.cursor()
cur.execute("SELECT name, email FROM users WHERE city = %s", ("San Francisco",))
rows = cur.fetchall()

# Geode equivalent
async with GeodeClient("localhost:3141") as client:
    result = await client.execute("""
        MATCH (u:User)
        WHERE u.city = $city
        RETURN u.name, u.email
    """, {'city': 'San Francisco'})
    rows = [row async for row in result]
```

## Further Reading

- [Go Client Examples](/tags/client-library/) - Go-specific patterns
- [Python Client Guide](/tags/client-library/) - Python async patterns
- [Rust Client Documentation](/tags/client-library/) - Rust performance tips
- [Connection Management](/tags/connections/) - Pooling and lifecycle
- [Transaction Patterns](/tags/transactions/) - Transaction best practices
- [QUIC Protocol](/tags/quic/) - Transport layer details
- [JSON Line Protocol](/tags/protocol/) - Wire format specification
