---
title: "API Reference Documentation"
description: "Complete API reference for Geode graph database: client libraries (Python, Go, Rust, Zig), connection management, query execution, and integration patterns."
keywords:
  - API reference
  - client libraries
  - Python client
  - Go client
  - Rust client
  - Zig client
  - database API
  - query API
  - connection management
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/api-reference/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Geode provides comprehensive client libraries for Python, Go, Rust, and Zig, all implementing consistent APIs for connecting to Geode servers, executing GQL queries, and managing transactions. This reference covers all client library APIs and integration patterns.

## Client Library Overview

### Supported Languages

- **Python**: Async client with aioquic (Python 3.9+)
- **Go**: database/sql driver implementation (Go 1.24+)
- **Rust**: Tokio-based async client (Rust 1.70+)
- **Zig**: Native client with vendored QUIC (Zig 0.15.1+)

All clients communicate via QUIC+TLS on port 3141 using JSON line protocol.

### Common Capabilities

- Connection pooling and management
- Parameterized query execution
- Transaction support (BEGIN, COMMIT, ROLLBACK, SAVEPOINT)
- Prepared statements
- Row-level security (RLS) policy management
- Error handling with GQL status codes
- Async/await patterns (where applicable)

## Python Client API

### Installation

```bash
pip install geode-client
# or
pip install -r requirements.txt
```

### Connection Management

```python
from geode_client import Client
import asyncio

# Context manager (recommended)
async def example():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        result, _ = await conn.query("MATCH (n) RETURN COUNT(n) AS count")
        for row in result.rows:
            print(row['count'])

# Manual connection
async def manual_example():
    client = Client("localhost:3141")
    await client.connect()
    try:
        result, _ = await conn.query("MATCH (n) RETURN n LIMIT 10")
        for row in result.rows:
            print(row)
    finally:
        await client.close()

# Connection pool configuration
client = Client(
    "localhost:3141",
    max_connections=100,
    connection_timeout=30,
    verify_tls=True,
    ca_file="/path/to/ca.pem"
)
```

### Query Execution

```python
# Simple query
result, _ = await client.query("MATCH (u:User) RETURN u.name")
for row in result.rows:
    print(row['name'])

# Parameterized query (named parameters)
result, _ = await client.query("""
    MATCH (u:User)
    WHERE u.age >= $min_age AND u.verified = $verified
    RETURN u.name, u.age
""", {
    "min_age": 18,
    "verified": True
})

# Parameterized query (positional parameters)
result, _ = await client.query("""
    MATCH (u:User)
    WHERE u.age >= $1 AND u.verified = $2
    RETURN u.name, u.age
""", [18, True])

# Execute with no results (INSERT, UPDATE, DELETE)
affected, _ = await client.query("""
    CREATE (u:User {
        name: $name,
        email: $email,
        created_at: CURRENT_TIMESTAMP
    })
""", {"name": "Alice", "email": "alice@example.com"})
print(f"Created {len(affected.rows)} nodes")
```

### Transaction Management

```python
# Transaction context manager
async with client.connection() as conn:
    await conn.begin()
    try:
        await conn.execute("CREATE (u:User {name: $name})", {"name": "Alice"})
        await conn.execute("CREATE (u:User {name: $name})", {"name": "Bob"})
        await conn.commit()
    except Exception:
        await conn.rollback()
        raise

# Manual transaction control
conn = await client.connect()
try:
    await conn.begin()
    await conn.execute("CREATE (u:User {name: 'Alice'})")
    await conn.execute("CREATE (u:User {name: 'Bob'})")
    await conn.commit()
except Exception:
    await conn.rollback()
    raise
finally:
    await conn.close()

# Savepoints
async with client.connection() as tx:
    await tx.begin()
    await tx.execute("CREATE (u:User {name: 'Alice'})")

    sp = await tx.savepoint("before_bob")
    try:
        await tx.execute("CREATE (u:User {name: 'Bob', invalid: ???})")
    except:
        await tx.rollback_to(sp)  # Rollback to savepoint

    await tx.execute("CREATE (u:User {name: 'Charlie'})")
    await tx.commit()
    # Commits Alice and Charlie, Bob rolled back
```

### Prepared Statements

```python
# Prepare statement
stmt = await conn.prepare("""
    MATCH (u:User {id: $user_id})
    RETURN u.name, u.email
""")

# Execute multiple times with different parameters
for user_id in [1, 2, 3, 4, 5]:
    result, _ = await stmt.execute({"user_id": user_id})
    for row in result.rows:
        print(f"{row['name']}: {row['email']}")

# Close statement
await stmt.close()
```

### Error Handling

```python
from geode_client import (
    GeodeError,
    GeodeConnectionError,
    QueryError,
    AuthError
)

try:
    result, _ = await client.query("MATCH (u:User) WHERE u.invalid_syntax")
except QueryError as e:
    print(f"Query error: {e}")
except GeodeConnectionError as e:
    print(f"Connection failed: {e}")
except AuthError as e:
    print(f"Auth failed: {e}")
except GeodeError as e:
    print(f"Geode error: {e}")
```

### Row-Level Security (RLS)

```python
# Set session context for RLS
async with client.connection() as conn:
    await conn.execute("SET app.user_id = $user_id", {"user_id": 123})

    # Query with RLS enforced
    result, _ = await conn.query("""
        MATCH (u:User)-[:POSTED]->(p:Post)
        RETURN p.title
    """)
    # Only returns posts accessible under policy

    # Clear RLS policy
    await conn.execute("SET app.user_id = NULL")
```

## Go Client API

### Installation

```bash
go get geodedb.com/geode
```

### Connection Management

```go
import (
    "database/sql"
    _ "geodedb.com/geode"
)

// Open connection
db, err := sql.Open("geode", "geode://localhost:3141")
if err != nil {
    log.Fatal(err)
}
defer db.Close()

// Configure connection pool
db.SetMaxOpenConns(100)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(time.Hour)

// Test connection
if err := db.Ping(); err != nil {
    log.Fatal("Cannot connect:", err)
}

// Connection string options
// geode://host:port?tls=true&ca_file=/path/to/ca.pem&timeout=30s
db, err := sql.Open("geode", "geode://localhost:3141?tls=true&timeout=30s")
```

### Query Execution

```go
// Query with rows
rows, err := db.Query(`
    MATCH (u:User)
    WHERE u.age >= $1 AND u.verified = $2
    RETURN u.name, u.age
`, 18, true)
if err != nil {
    log.Fatal(err)
}
defer rows.Close()

for rows.Next() {
    var name string
    var age int
    if err := rows.Scan(&name, &age); err != nil {
        log.Fatal(err)
    }
    fmt.Printf("%s: %d\n", name, age)
}
if err := rows.Err(); err != nil {
    log.Fatal(err)
}

// Single row query
var name string
var email string
err = db.QueryRow(`
    MATCH (u:User {id: $1})
    RETURN u.name, u.email
`, 123).Scan(&name, &email)
if err == sql.ErrNoRows {
    fmt.Println("User not found")
} else if err != nil {
    log.Fatal(err)
}

// Execute (no result rows)
result, err := db.Exec(`
    CREATE (u:User {
        name: $1,
        email: $2,
        created_at: CURRENT_TIMESTAMP
    })
`, "Alice", "alice@example.com")
if err != nil {
    log.Fatal(err)
}
affected, _ := result.RowsAffected()
fmt.Printf("Created %d nodes\n", affected)
```

### Transaction Management

```go
// Begin transaction
tx, err := db.Begin()
if err != nil {
    log.Fatal(err)
}

// Execute within transaction
_, err = tx.Exec("CREATE (u:User {name: $1})", "Alice")
if err != nil {
    tx.Rollback()
    log.Fatal(err)
}

_, err = tx.Exec("CREATE (u:User {name: $1})", "Bob")
if err != nil {
    tx.Rollback()
    log.Fatal(err)
}

// Commit transaction
if err = tx.Commit(); err != nil {
    log.Fatal(err)
}

// Transaction with defer pattern
tx, err := db.Begin()
if err != nil {
    return err
}
defer func() {
    if p := recover(); p != nil {
        tx.Rollback()
        panic(p)
    } else if err != nil {
        tx.Rollback()
    } else {
        err = tx.Commit()
    }
}()

_, err = tx.Exec("CREATE (u:User {name: 'Alice'})")
// ... more operations
```

### Prepared Statements

```go
// Prepare statement
stmt, err := db.Prepare(`
    MATCH (u:User {id: $1})
    RETURN u.name, u.email
`)
if err != nil {
    log.Fatal(err)
}
defer stmt.Close()

// Execute multiple times
for _, id := range []int64{1, 2, 3, 4, 5} {
    var name, email string
    err = stmt.QueryRow(id).Scan(&name, &email)
    if err != nil {
        log.Println(err)
        continue
    }
    fmt.Printf("%s: %s\n", name, email)
}
```

### Error Handling

```go
import "geodedb.com/geode/geoderr"

rows, err := db.Query("MATCH (u:User) WHERE invalid")
if err != nil {
    if geodeErr, ok := err.(*geoderr.Error); ok {
        fmt.Printf("Geode error: %s\n", geodeErr.Message)
        fmt.Printf("Status code: %s\n", geodeErr.StatusCode)
    } else {
        log.Fatal("Other error:", err)
    }
}
```

## Rust Client API

### Installation

```toml
# Cargo.toml
[dependencies]
geode-client = "0.18"
tokio = { version = "1", features = ["full"] }
```

### Connection Management

```rust
use geode_client::{Client, ConnectionPool};

#[tokio::main]
async fn main() -> geode_client::Result<()> {
    // Simple connection
    let client = Client::new("localhost", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    // Connection pool management
    let pool = ConnectionPool::new("localhost", 3141, 100).skip_verify(true);
    let mut pooled = pool.acquire().await?;
    let (_page, _) = pooled.query("RETURN 1").await?;

    Ok(())
}
```

### Query Execution

```rust
use geode_client::Value;
use std::collections::HashMap;

let mut conn = client.connect().await?;

// Simple query
let (page, _) = conn.query(
    "MATCH (u:User) RETURN u.name, u.age"
).await?;

for row in &page.rows {
    let name = row.get("name").unwrap().as_string()?;
    let age = row.get("age").unwrap().as_int()?;
    println!("{}: {}", name, age);
}

// Parameterized query (named)
let mut params = HashMap::new();
params.insert("min_age".to_string(), Value::int(18));
params.insert("verified".to_string(), Value::bool(true));
let (_page, _) = conn.query_with_params(
    "MATCH (u:User) WHERE u.age >= $min_age AND u.verified = $verified RETURN u.name, u.age",
    &params,
).await?;

// Execute (no results)
let mut create_params = HashMap::new();
create_params.insert("name".to_string(), Value::string("Alice"));
create_params.insert("email".to_string(), Value::string("alice@example.com"));
let (created, _) = conn.query_with_params(
    "CREATE (u:User {name: $name, email: $email, created_at: CURRENT_TIMESTAMP})",
    &create_params,
).await?;
println!("Created {} nodes", created.rows.len());
```

### Transaction Management

```rust
use geode_client::Value;
use std::collections::HashMap;

let mut conn = client.connect().await?;

// Transaction
conn.begin().await?;
let mut params = HashMap::new();
params.insert("name".to_string(), Value::string("Alice"));
conn.query_with_params("CREATE (u:User {name: $name})", &params).await?;
params.insert("name".to_string(), Value::string("Bob"));
conn.query_with_params("CREATE (u:User {name: $name})", &params).await?;
conn.commit().await?;

// Transaction with error handling
conn.begin().await?;
let result = async {
    conn.query("CREATE (u:User {name: 'Alice'})").await?;
    conn.query("CREATE (u:User {name: 'Bob'})").await?;
    Ok::<(), geode_client::Error>(())
}.await;

match result {
    Ok(_) => conn.commit().await?,
    Err(e) => {
        conn.rollback().await?;
        return Err(e);
    }
}

// Savepoint
conn.begin().await?;
conn.query("CREATE (u:User {name: 'Alice'})").await?;

let sp = conn.savepoint("before_bob")?;
match conn.query("CREATE (u:User {invalid: ???})").await {
    Ok(_) => {},
    Err(_) => {
        conn.rollback_to(&sp).await?;
    }
}

conn.commit().await?;
```

### Prepared Statements

```rust
use geode_client::Value;
use std::collections::HashMap;

let mut conn = client.connect().await?;
let stmt = conn.prepare(
    "MATCH (u:User {id: $id}) RETURN u.name, u.email"
)?;

// Execute multiple times
for id in [1, 2, 3, 4, 5] {
    let mut params = HashMap::new();
    params.insert("id".to_string(), Value::int(id));
    let (page, _) = stmt.execute(&mut conn, &params).await?;
    for row in &page.rows {
        let name = row.get("name").unwrap().as_string()?;
        let email = row.get("email").unwrap().as_string()?;
        println!("{}: {}", name, email);
    }
}
```

### Error Handling

```rust
use geode_client::{Error, ErrorKind};

match client.query("MATCH (u:User) WHERE invalid", &[]).await {
    Ok(result) => { /* handle result */ },
    Err(Error::Query(e)) => {
        eprintln!("Query error: {}", e.message);
        eprintln!("Status: {}", e.status_code);
    },
    Err(Error::Connection(e)) => {
        eprintln!("Connection error: {}", e);
    },
    Err(e) => {
        eprintln!("Other error: {}", e);
    }
}
```

## Zig Client API

### Integration

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Connect
    var client = try geode.Client.connect(allocator, "localhost", 3141);
    defer client.deinit();

    // Query
    const result = try client.query("MATCH (n:User) RETURN n.name LIMIT 10", .{});
    defer result.deinit();

    while (try result.next()) |row| {
        const name = row.get("name").?;
        std.debug.print("Name: {s}\n", .{name.string});
    }
}
```

## Common Integration Patterns

### Connection Pooling

```python
# Python: Built-in connection pool
client = Client("localhost:3141", max_connections=100)

# Go: Standard database/sql pooling
db.SetMaxOpenConns(100)
db.SetMaxIdleConns(10)

# Rust: Custom pool
let pool = Pool::new("localhost:3141", 100).await?;
```

### Retry Logic

```python
# Python with exponential backoff
import asyncio

async def query_with_retry(client, query, params, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await client.query(query, params)
        except ConnectionError:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

```go
// Go with retry
func queryWithRetry(db *sql.DB, query string, args ...interface{}) (*sql.Rows, error) {
    maxRetries := 3
    for i := 0; i < maxRetries; i++ {
        rows, err := db.Query(query, args...)
        if err == nil {
            return rows, nil
        }
        if i < maxRetries-1 {
            time.Sleep(time.Duration(1<<uint(i)) * time.Second)
        }
    }
    return nil, fmt.Errorf("query failed after %d retries", maxRetries)
}
```

### Batch Operations

```python
# Python batch insert
async with client.connection() as tx:
    await tx.begin()
    for i in range(1000):
        await tx.execute("""
            CREATE (u:User {
                id: $id,
                name: $name,
                created_at: CURRENT_TIMESTAMP
            })
        """, {"id": i, "name": f"User{i}"})
```

```go
// Go batch insert
tx, _ := db.Begin()
stmt, _ := tx.Prepare("CREATE (u:User {id: $1, name: $2})")
for i := 0; i < 1000; i++ {
    _, err := stmt.Exec(i, fmt.Sprintf("User%d", i))
    if err != nil {
        tx.Rollback()
        return err
    }
}
stmt.Close()
tx.Commit()
```

### Stream Processing

```python
# Python async streaming
async def process_large_result():
    result, _ = await client.query("MATCH (n:User) RETURN n")
    for row in result.rows:
        await process_user(row)
        # Memory efficient: only one row in memory at a time
```

```rust
// Rust streaming
let result = client.query("MATCH (n:User) RETURN n", &[]).await?;
for row in result.rows() {
    process_user(&row)?;
    // Stream-based iteration
}
```

## Best Practices

1. **Use Connection Pooling**: Configure appropriate pool sizes for your workload
2. **Parameterize Queries**: Always use parameters to prevent injection attacks
3. **Handle Errors**: Implement proper error handling and retry logic
4. **Transaction Management**: Use context managers or defer patterns for safety
5. **Close Resources**: Always close connections, statements, and result sets
6. **Streaming**: Use streaming for large result sets to manage memory
7. **Monitoring**: Track connection pool metrics and query performance
8. **TLS**: Enable TLS for production deployments

## Performance Tips

### Connection Reuse

```python
# Good: Reuse client connection
client = Client(host="localhost", port=3141)
async with client.connection() as conn:
    for i in range(100):
        await conn.query("MATCH (n:User {id: $id}) RETURN n", {"id": i})

# Avoid: Creating new connection per query
for i in range(100):
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        await conn.query("MATCH (n:User {id: $id}) RETURN n", {"id": i})
```

### Prepared Statements

```go
// Good: Prepare once, execute many
stmt, _ := db.Prepare("MATCH (u:User {id: $1}) RETURN u")
defer stmt.Close()
for _, id := range ids {
    stmt.QueryRow(id).Scan(&result)
}

// Avoid: Preparing repeatedly
for _, id := range ids {
    stmt, _ := db.Prepare("MATCH (u:User {id: $1}) RETURN u")
    stmt.QueryRow(id).Scan(&result)
    stmt.Close()
}
```

### Batch Transactions

```python
# Good: Single transaction for batch
async with client.connection() as tx:
    await tx.begin()
    for item in items:
        await tx.execute("CREATE (n:Node {data: $data})", {"data": item})

# Avoid: Transaction per operation
for item in items:
    async with client.connection() as tx:
        await tx.begin()
        await tx.execute("CREATE (n:Node {data: $data})", {"data": item})
```

## Related Topics

- **Query Language**: GQL query syntax
- **Transactions**: Transaction management
- **Security**: Authentication and authorization
- **Performance**: Query optimization
- **Deployment**: Production deployment

## Further Reading

- [Python Client](/docs/client-libraries/python-client/) - Complete Python API documentation
- [Go Client](/docs/client-libraries/go-client/) - Complete Go API documentation
- [Rust Client](/docs/client-libraries/rust-client/) - Complete Rust API documentation
- [Node.js Client](/docs/client-libraries/nodejs-client/) - Complete Node.js API documentation
- [Zig Client](/docs/client-libraries/zig-client/) - Complete Zig API documentation
- [Query Language](/tags/query-language/) - GQL syntax reference

Geode's client libraries provide consistent, production-ready APIs across multiple languages, enabling seamless integration with your application stack while maintaining high performance and reliability.
