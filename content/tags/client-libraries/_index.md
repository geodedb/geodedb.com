---
title: "Client Libraries - Official Geode SDKs for Go, Python, Rust, Zig, and Node.js"
description: "Comprehensive guide to Geode client libraries. Compare features across Go, Python, Rust, Zig, and Node.js SDKs with QUIC + TLS 1.3 transport, connection pooling, and GQL support."
keywords:
  - client libraries
  - Geode SDK
  - Go client
  - Python client
  - Rust client
  - Zig client
  - Node.js client
  - TypeScript client
  - QUIC TLS
  - GQL driver
  - database driver
  - connection pooling
  - prepared statements
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/client-libraries/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Geode Client Libraries

Geode provides official client libraries for Go, Python, Rust, Zig, and Node.js/TypeScript. Each client uses the same QUIC + TLS 1.3 wire protocol while exposing language-idiomatic APIs for developers.

## Introduction

Geode client libraries are designed with common principles:

- **Secure by Default**: All connections use QUIC with TLS 1.3 encryption
- **High Performance**: Native async support and connection pooling
- **Type Safety**: Strong typing appropriate to each language
- **GQL Standard**: Full ISO/IEC 39075:2024 GQL compliance
- **Consistent Protocol**: JSON line protocol over QUIC streams

### Choosing a Client Library

| Language | Best For | Key Features |
|----------|----------|--------------|
| **Go** | Microservices, APIs | `database/sql` driver, prepared statements |
| **Python** | Data science, ML, scripting | Async/await, query builders, RLS support |
| **Rust** | High-performance systems | Zero-cost abstractions, tokio integration |
| **Zig** | Systems programming, embedded | Low overhead, vendored QUIC |
| **Node.js** | Web applications, APIs | TypeScript support, async patterns |

## Go Client Library

The Go client implements the standard `database/sql` interface, making it familiar to Go developers and compatible with existing database tooling.

### Installation

```bash
go get geodedb.com/geode
```

### Quick Start

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"

    _ "geodedb.com/geode"
)

func main() {
    // Open connection using standard database/sql
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Execute GQL queries
    rows, err := db.QueryContext(context.Background(),
        "MATCH (p:Person) WHERE p.age > $1 RETURN p.name, p.age",
        25,
    )
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
        fmt.Printf("%s is %d years old\n", name, age)
    }
}
```

### Connection String Options

```go
// Full DSN with all options
dsn := "localhost:3141?" +
    "page_size=1000&" +
    "hello_name=myapp&" +
    "hello_ver=1.0.0&" +
    "conformance=strict&" +
    "ca=/path/to/ca.crt&" +
    "cert=/path/to/client.crt&" +
    "key=/path/to/client.key&" +
    "insecure=false"

db, err := sql.Open("geode", dsn)
```

| Option | Description | Default |
|--------|-------------|---------|
| `page_size` | Results per page | 1000 |
| `hello_name` | Client application name | "geode-go" |
| `hello_ver` | Client version string | library version |
| `conformance` | GQL conformance level | "strict" |
| `ca` | CA certificate path | system CAs |
| `cert` | Client certificate path | none |
| `key` | Client private key path | none |
| `insecure` | Skip TLS verification | false |

### Transactions

```go
func transferFunds(db *sql.DB, from, to string, amount float64) error {
    tx, err := db.BeginTx(context.Background(), nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Debit source account
    _, err = tx.ExecContext(context.Background(), `
        MATCH (a:Account {id: $1})
        SET a.balance = a.balance - $2
    `, from, amount)
    if err != nil {
        return err
    }

    // Credit destination account
    _, err = tx.ExecContext(context.Background(), `
        MATCH (a:Account {id: $1})
        SET a.balance = a.balance + $2
    `, to, amount)
    if err != nil {
        return err
    }

    return tx.Commit()
}
```

### Prepared Statements

```go
// Prepare once, execute many times
stmt, err := db.PrepareContext(context.Background(),
    "MATCH (p:Product {category: $1}) RETURN p.name, p.price LIMIT $2")
if err != nil {
    log.Fatal(err)
}
defer stmt.Close()

// Execute with different parameters
categories := []string{"Electronics", "Books", "Clothing"}
for _, cat := range categories {
    rows, err := stmt.QueryContext(context.Background(), cat, 10)
    if err != nil {
        log.Fatal(err)
    }
    // Process rows...
    rows.Close()
}
```

## Python Client Library

The Python client is async-first, built on aioquic for high-performance QUIC transport with full asyncio integration.

### Installation

```bash
pip install geode-client
```

### Quick Start

```python
import asyncio
from geode_client import Client

async def main():
    client = Client(host="localhost", port=3141)

    async with client.connection() as conn:
        # Simple query
        page, _ = await conn.query(
            "MATCH (p:Person) RETURN p.name AS name, p.age AS age"
        )

        for row in page.rows:
            print(f"{row['name'].as_string}: {row['age'].as_int}")

asyncio.run(main())
```

### Connection Pooling

```python
from geode_client import Client, ConnectionPool

async def with_pool():
    # Create pool with configuration
    pool = ConnectionPool(
        host="localhost",
        port=3141,
        min_connections=5,
        max_connections=20,
        connection_timeout=30.0
    )

    await pool.initialize()

    try:
        # Acquire connection from pool
        async with pool.connection() as conn:
            result, _ = await conn.query("MATCH (n) RETURN count(n) AS total")
            print(f"Total nodes: {result.rows[0]['total'].as_int}")
    finally:
        await pool.close()
```

### Parameterized Queries

```python
async def find_users(conn, min_age: int, city: str):
    result, schema = await conn.query(
        """
        MATCH (u:User)-[:LIVES_IN]->(c:City {name: $city})
        WHERE u.age >= $min_age
        RETURN u.name AS name, u.email AS email, u.age AS age
        ORDER BY u.age DESC
        """,
        {"min_age": min_age, "city": city}
    )

    return [
        {
            "name": row['name'].as_string,
            "email": row['email'].as_string,
            "age": row['age'].as_int
        }
        for row in result.rows
    ]
```

### Transactions with Savepoints

```python
async def complex_operation(conn):
    async with conn.transaction() as tx:
        # Create user
        await tx.execute("""
            CREATE (u:User {user_id: $id, name: $name, email: $email})
        """, {"id": "user_123", "name": "Alice", "email": "alice@example.com"})

        # Create savepoint before risky operation
        savepoint = await tx.savepoint("before_preferences")

        try:
            # This might fail
            await tx.execute("""
                MATCH (u:User {user_id: $id})
                CREATE (u)-[:PREFERS]->(:Category {name: $category})
            """, {"id": "user_123", "category": "InvalidCategory"})
        except Exception:
            # Rollback to savepoint, continue transaction
            await tx.rollback_to(savepoint)
            # Use default category instead
            await tx.execute("""
                MATCH (u:User {user_id: $id})
                CREATE (u)-[:PREFERS]->(:Category {name: 'General'})
            """, {"id": "user_123"})

        # Transaction commits successfully
```

### Query Builders

```python
from geode_client.query import QueryBuilder, PatternBuilder

# Build queries programmatically
query = (QueryBuilder()
    .match(PatternBuilder()
        .node("u", "User")
        .rel("r", "FOLLOWS", direction="out")
        .node("f", "User")
        .build())
    .where("u.user_id = $user_id")
    .return_("f.name AS friend_name", "r.since AS followed_since")
    .order_by("r.since DESC")
    .limit(10)
    .build())

result, _ = await conn.query(query, {"user_id": "user_456"})
```

## Rust Client Library

The Rust client uses Quinn for QUIC transport and tokio for async execution, providing zero-cost abstractions and high performance.

### Installation

```toml
[dependencies]
geode-client = "0.18"
tokio = { version = "1", features = ["full"] }
```

### Quick Start

```rust
use geode_client::{Client, Config};
use tokio;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = Config::new("localhost", 3141);
    let client = Client::new(config)?;

    let mut conn = client.connect().await?;

    // Execute query
    let (page, schema) = conn.query(
        "MATCH (p:Person) RETURN p.name AS name, p.age AS age"
    ).await?;

    for row in page.rows {
        let name: String = row.get("name")?;
        let age: i64 = row.get("age")?;
        println!("{}: {} years old", name, age);
    }

    Ok(())
}
```

### Typed Value Extraction

```rust
use geode_client::Value;

fn process_results(page: Page) -> Result<Vec<Person>, Error> {
    page.rows.iter().map(|row| {
        Ok(Person {
            id: row.get::<String>("id")?,
            name: row.get::<String>("name")?,
            age: row.get::<i64>("age")?,
            email: row.get::<Option<String>>("email")?,  // Nullable
            tags: row.get::<Vec<String>>("tags")?,       // List
            metadata: row.get::<HashMap<String, Value>>("meta")?, // Map
        })
    }).collect()
}
```

### Connection Pooling

```rust
use geode_client::{Pool, PoolConfig};

async fn with_pool() -> Result<(), Error> {
    let pool_config = PoolConfig {
        min_connections: 5,
        max_connections: 50,
        connection_timeout: Duration::from_secs(30),
        idle_timeout: Duration::from_secs(300),
    };

    let pool = Pool::new("localhost", 3141, pool_config).await?;

    // Acquire connection from pool
    let conn = pool.get().await?;

    let (page, _) = conn.query("MATCH (n) RETURN count(n) AS c").await?;
    println!("Count: {}", page.rows[0].get::<i64>("c")?);

    // Connection returned to pool when dropped
    Ok(())
}
```

### Query Builder

```rust
use geode_client::query::{Query, Pattern};

let query = Query::new()
    .match_pattern(
        Pattern::node("p", "Product")
            .with_property("category", &category)
    )
    .where_clause("p.price < $max_price")
    .return_fields(&["p.name", "p.price"])
    .order_by("p.price ASC")
    .limit(20)
    .build();

let (page, _) = conn.query_with_params(
    &query,
    params! {
        "max_price" => 100.0
    }
).await?;
```

## Zig Client Library

The Zig client provides low-level control with vendored QUIC implementation, ideal for systems programming and embedded applications.

### Installation

Add to your `build.zig.zon`:

```zig
.dependencies = .{
    .geode_client = .{
        .url = "https://github.com/geodedb/geode-client-zig/archive/v0.1.3.tar.gz",
        .hash = "...",
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

    // Connect to Geode
    var client = try geode.Client.init(allocator, "localhost", 3141);
    defer client.deinit();

    // Execute query
    const result = try client.query(
        "MATCH (p:Person) RETURN p.name AS name, p.age AS age",
        &.{},
    );
    defer result.deinit();

    // Process results
    for (result.rows) |row| {
        const name = row.getString("name") orelse continue;
        const age = row.getInt("age") orelse continue;
        std.debug.print("{s}: {d} years old\n", .{ name, age });
    }
}
```

### Parameterized Queries

```zig
const params = .{
    .min_age = @as(i64, 21),
    .city = "San Francisco",
};

const result = try client.query(
    \\MATCH (u:User)-[:LIVES_IN]->(c:City {name: $city})
    \\WHERE u.age >= $min_age
    \\RETURN u.name AS name, u.age AS age
, params);
defer result.deinit();
```

### Transaction Support

```zig
// Begin transaction
var tx = try client.beginTransaction();
errdefer tx.rollback() catch {};

// Execute operations
try tx.execute(
    "CREATE (u:User {id: $id, name: $name})",
    .{ .id = "user_001", .name = "Bob" },
);

try tx.execute(
    "MATCH (u:User {id: $id}) CREATE (u)-[:OWNS]->(:Account {balance: 0})",
    .{ .id = "user_001" },
);

// Commit transaction
try tx.commit();
```

## Node.js / TypeScript Client

The Node.js client provides full TypeScript support with async patterns familiar to JavaScript developers.

### Installation

```bash
npm install @geodedb/client
# or
yarn add @geodedb/client
```

### Quick Start (TypeScript)

```typescript
import { Client, Connection } from '@geodedb/client';

async function main() {
    const client = new Client({
        host: 'localhost',
        port: 3141,
    });

    const conn = await client.connect();

    try {
        const { rows, schema } = await conn.query<{
            name: string;
            age: number;
        }>('MATCH (p:Person) RETURN p.name AS name, p.age AS age');

        for (const row of rows) {
            console.log(`${row.name}: ${row.age} years old`);
        }
    } finally {
        await conn.close();
    }
}

main().catch(console.error);
```

### Type-Safe Queries

```typescript
// Define result types
interface UserNode {
    userId: string;
    name: string;
    email: string;
    createdAt: Date;
}

interface FollowRelation {
    since: Date;
    strength: number;
}

// Query with type inference
const result = await conn.query<{
    user: UserNode;
    follows: UserNode;
    rel: FollowRelation;
}>(`
    MATCH (u:User {userId: $userId})-[r:FOLLOWS]->(f:User)
    RETURN u AS user, f AS follows, r AS rel
`, { userId: 'user_123' });

// TypeScript knows the types
for (const { user, follows, rel } of result.rows) {
    console.log(`${user.name} follows ${follows.name} since ${rel.since}`);
}
```

### Connection Pool

```typescript
import { Pool } from '@geodedb/client';

const pool = new Pool({
    host: 'localhost',
    port: 3141,
    minConnections: 5,
    maxConnections: 20,
    idleTimeout: 60000,
});

// Use pool
async function queryWithPool() {
    const conn = await pool.acquire();
    try {
        const result = await conn.query('MATCH (n) RETURN count(n) AS total');
        return result.rows[0].total;
    } finally {
        pool.release(conn);
    }
}
```

## Wire Protocol Overview

All Geode clients use the same JSON line protocol over QUIC streams:

### Message Types

| Client Message | Description |
|---------------|-------------|
| `HELLO` | Connection handshake with client info |
| `RUN_GQL` | Execute GQL query |
| `PULL` | Fetch result rows |
| `BEGIN` | Start transaction |
| `COMMIT` | Commit transaction |
| `ROLLBACK` | Rollback transaction |
| `PING` | Keep-alive |

| Server Response | Description |
|----------------|-------------|
| `SCHEMA` | Query result schema |
| `BINDINGS` | Result rows |
| `ERROR` | Error with ISO status code |
| `EXPLAIN` | Query execution plan |
| `PROFILE` | Performance metrics |

### Connection Security

All connections require TLS 1.3:

```python
# Custom TLS configuration (Python example)
client = Client(
    host="localhost",
    port=3141,
    tls_config=TLSConfig(
        ca_cert="/path/to/ca.crt",
        client_cert="/path/to/client.crt",
        client_key="/path/to/client.key",
        verify_hostname=True
    )
)
```

## Related Topics

- **[Go Client](/tags/go/)**: Detailed Go client documentation
- **[Python Client](/tags/python/)**: Python async client guide
- **[Rust Client](/tags/rust/)**: Rust client with tokio
- **[Zig Client](/tags/zig/)**: Zig systems programming client
- **[JavaScript](/tags/javascript/)**: Node.js client usage
- **[TypeScript](/tags/typescript/)**: TypeScript type definitions
- **[Protocol](/tags/protocol/)**: Wire protocol specification
- **[Security](/tags/security/)**: TLS and authentication

## Further Reading

- **Client Comparison Guide**: Feature matrix across all clients
- **Connection Pooling Best Practices**: Optimize connection management
- **Error Handling**: Working with GQL error codes
- **Performance Tuning**: Maximizing client throughput
- **Migration Guides**: Moving from other graph databases

Browse the tagged content below for comprehensive client library documentation, tutorials, and examples.
