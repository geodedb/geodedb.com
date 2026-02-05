---
title: "Quick Start Guide"
slug: "quick-start"
description: "Get started with Geode in 5 minutes"
weight: 1
tags: ["quickstart", "tutorial", "beginner"]
categories: ["guides", "getting-started"]
keywords:
  - Geode quick start
  - graph database tutorial
  - GQL basics
  - install Geode
  - getting started
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Quick Start Guide

Get up and running with Geode in just 5 minutes. This guide walks you through installation, creating your first graph, and running basic queries.

## Prerequisites

- Docker installed (recommended) OR
- Go 1.24.0+ (for building from source)

## Step 1: Start Geode

### Using Docker (Recommended)

```bash
docker run -d \
  --name geode \
  -p 3141:3141 \
  -v geode-data:/var/lib/geode \
  geodedb/geode:latest serve --listen 0.0.0.0:3141
```

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  geode:
    image: geodedb/geode:latest
    ports:
      - "3141:3141"
    volumes:
      - geode-data:/var/lib/geode
    environment:
      - GEODE_LOG_LEVEL=info
    command: ["serve", "--listen", "0.0.0.0:3141"]

volumes:
  geode-data:
```

Start:

```bash
docker-compose up -d
```

### From Source

```bash
git clone https://gitlab.com/devnw/codepros/geode/geode
cd geode
make build
./zig-out/bin/geode serve --listen 0.0.0.0:3141
```

## Step 2: Install Client

Choose your preferred language:

{{< tabs >}}
{{< tab "Go" >}}
```bash
go get geodedb.com/geode
```
{{< /tab >}}
{{< tab "Python" >}}
```bash
pip install geode-client
```
{{< /tab >}}
{{< tab "Rust" >}}
```toml
# Add to Cargo.toml
[dependencies]
geode-client = "0.1"
tokio = { version = "1", features = ["full"] }
```
{{< /tab >}}
{{< tab "Node.js" >}}
```bash
npm install @geodedb/client
```
{{< /tab >}}
{{< tab "Zig" >}}
```bash
# Add to build.zig.zon dependencies
.geode_client = .{
    .url = "https://gitlab.com/devnw/codepros/geode/geode-client-zig/-/archive/main/geode-client-zig-main.tar.gz",
},
```
{{< /tab >}}
{{< /tabs >}}

### CLI Tool

```bash
# Debian/Ubuntu
curl -fsSL https://apt.geodedb.com/geode.gpg | sudo gpg --dearmor -o /usr/share/keyrings/geode-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/geode-archive-keyring.gpg] https://apt.geodedb.com stable main" | sudo tee /etc/apt/sources.list.d/geode.list
sudo apt update && sudo apt install geode

# Or via Docker
docker exec -it geode geode shell
```

## Step 3: Verify Connection

```bash
geode ping localhost:3141
```

Expected output:
```
Connected to Geode v0.1.0
Latency: 2ms
```

## Step 4: Create Your First Graph

Let's create a simple social network. First, here's the GQL:

```gql
// Create people
CREATE (:Person {name: "Alice", age: 30, city: "New York"})
CREATE (:Person {name: "Bob", age: 25, city: "San Francisco"})
CREATE (:Person {name: "Charlie", age: 35, city: "Seattle"})

// Create relationships
MATCH (alice:Person {name: "Alice"})
MATCH (bob:Person {name: "Bob"})
CREATE (alice)-[:KNOWS {since: 2020}]->(bob)

MATCH (bob:Person {name: "Bob"})
MATCH (charlie:Person {name: "Charlie"})
CREATE (bob)-[:KNOWS {since: 2019}]->(charlie)
```

### Using Client Libraries

{{< tabs >}}
{{< tab "Go" >}}
```go
package main

import (
    "context"
    "database/sql"
    "log"
    _ "geodedb.com/geode"
)

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()

    // Create people
    _, err = db.ExecContext(ctx, `CREATE (:Person {name: ?, age: ?, city: ?})`,
        "Alice", 30, "New York")
    if err != nil {
        log.Fatal(err)
    }

    _, err = db.ExecContext(ctx, `CREATE (:Person {name: ?, age: ?, city: ?})`,
        "Bob", 25, "San Francisco")
    if err != nil {
        log.Fatal(err)
    }

    // Create relationship
    _, err = db.ExecContext(ctx, `
        MATCH (a:Person {name: ?}), (b:Person {name: ?})
        CREATE (a)-[:KNOWS {since: ?}]->(b)
    `, "Alice", "Bob", 2020)
    if err != nil {
        log.Fatal(err)
    }

    log.Println("Graph created!")
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import asyncio
from geode_client import Client

async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)
    async with client.connection() as conn:
        # Create people
        await conn.execute(
            "CREATE (:Person {name: $name, age: $age, city: $city})",
            {"name": "Alice", "age": 30, "city": "New York"}
        )
        await conn.execute(
            "CREATE (:Person {name: $name, age: $age, city: $city})",
            {"name": "Bob", "age": 25, "city": "San Francisco"}
        )

        # Create relationship
        await conn.execute("""
            MATCH (a:Person {name: $from}), (b:Person {name: $to})
            CREATE (a)-[:KNOWS {since: $since}]->(b)
        """, {"from": "Alice", "to": "Bob", "since": 2020})

        print("Graph created!")

asyncio.run(main())
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::{Client, Value};
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    // Create people
    let mut params = HashMap::new();
    params.insert("name".to_string(), Value::string("Alice"));
    params.insert("age".to_string(), Value::int(30));
    params.insert("city".to_string(), Value::string("New York"));
    conn.query_with_params(
        "CREATE (:Person {name: $name, age: $age, city: $city})",
        &params
    ).await?;

    params.insert("name".to_string(), Value::string("Bob"));
    params.insert("age".to_string(), Value::int(25));
    params.insert("city".to_string(), Value::string("San Francisco"));
    conn.query_with_params(
        "CREATE (:Person {name: $name, age: $age, city: $city})",
        &params
    ).await?;

    // Create relationship
    let mut rel_params = HashMap::new();
    rel_params.insert("from".to_string(), Value::string("Alice"));
    rel_params.insert("to".to_string(), Value::string("Bob"));
    rel_params.insert("since".to_string(), Value::int(2020));
    conn.query_with_params(r#"
        MATCH (a:Person {name: $from}), (b:Person {name: $to})
        CREATE (a)-[:KNOWS {since: $since}]->(b)
    "#, &rel_params).await?;

    println!("Graph created!");
    Ok(())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { createClient } from '@geodedb/client';

async function main() {
    const client = await createClient('quic://localhost:3141');

    // Create people
    await client.exec(
        'CREATE (:Person {name: $name, age: $age, city: $city})',
        { params: { name: 'Alice', age: 30, city: 'New York' } }
    );
    await client.exec(
        'CREATE (:Person {name: $name, age: $age, city: $city})',
        { params: { name: 'Bob', age: 25, city: 'San Francisco' } }
    );

    // Create relationship
    await client.exec(`
        MATCH (a:Person {name: $from}), (b:Person {name: $to})
        CREATE (a)-[:KNOWS {since: $since}]->(b)
    `, { params: { from: 'Alice', to: 'Bob', since: 2020 } });

    console.log('Graph created!');
    await client.close();
}

main();
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.sendHello("quickstart", "1.0.0");
    _ = try client.receiveMessage(30000);

    // Create people with parameterized queries
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("name", .{ .string = "Alice" });
    try params.put("age", .{ .integer = 30 });
    try params.put("city", .{ .string = "New York" });

    try client.sendRunGql(1, "CREATE (:Person {name: $name, age: $age, city: $city})",
        .{ .object = params });
    _ = try client.receiveMessage(30000);

    params.clearRetainingCapacity();
    try params.put("name", .{ .string = "Bob" });
    try params.put("age", .{ .integer = 25 });
    try params.put("city", .{ .string = "San Francisco" });

    try client.sendRunGql(2, "CREATE (:Person {name: $name, age: $age, city: $city})",
        .{ .object = params });
    _ = try client.receiveMessage(30000);

    // Create relationship
    params.clearRetainingCapacity();
    try params.put("from", .{ .string = "Alice" });
    try params.put("to", .{ .string = "Bob" });
    try params.put("since", .{ .integer = 2020 });

    try client.sendRunGql(3,
        \\MATCH (a:Person {name: $from}), (b:Person {name: $to})
        \\CREATE (a)-[:KNOWS {since: $since}]->(b)
    , .{ .object = params });
    _ = try client.receiveMessage(30000);

    std.debug.print("Graph created!\n", .{});
}
```
{{< /tab >}}
{{< /tabs >}}

### Using CLI

```bash
geode shell
geode> CREATE (:Person {name: 'Alice', age: 30, city: 'New York'})
geode> CREATE (:Person {name: 'Bob', age: 25, city: 'San Francisco'})
geode> MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'}) CREATE (a)-[:KNOWS {since: 2020}]->(b)
```

## Step 5: Query Your Data

### Find All People

```gql
MATCH (p:Person)
RETURN p.name, p.age, p.city
ORDER BY p.age
```

{{< tabs >}}
{{< tab "Go" >}}
```go
rows, err := db.QueryContext(ctx, `
    MATCH (p:Person)
    RETURN p.name, p.age, p.city
    ORDER BY p.age
`)
if err != nil {
    log.Fatal(err)
}
defer rows.Close()

for rows.Next() {
    var name, city string
    var age int
    rows.Scan(&name, &age, &city)
    fmt.Printf("%s, %d, %s\n", name, age, city)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async with client.connection() as conn:
    page, _ = await conn.query("""
        MATCH (p:Person)
        RETURN p.name, p.age, p.city
        ORDER BY p.age
    """)
    for row in page.rows:
        print(f"{row['p.name'].as_string}, {row['p.age'].as_int}, {row['p.city'].as_string}")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
let (page, _) = conn.query(r#"
    MATCH (p:Person)
    RETURN p.name, p.age, p.city
    ORDER BY p.age
"#).await?;

for row in &page.rows {
    let name = row.get("p.name").unwrap().as_string()?;
    let age = row.get("p.age").unwrap().as_int()?;
    let city = row.get("p.city").unwrap().as_string()?;
    println!("{}, {}, {}", name, age, city);
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
const rows = await client.queryAll(`
    MATCH (p:Person)
    RETURN p.name, p.age, p.city
    ORDER BY p.age
`);

for (const row of rows) {
    console.log(`${row.get('p.name')?.asString}, ${row.get('p.age')?.asNumber}, ${row.get('p.city')?.asString}`);
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
try client.sendRunGql(1,
    \\MATCH (p:Person)
    \\RETURN p.name, p.age, p.city
    \\ORDER BY p.age
, null);
const schema = try client.receiveMessage(30000);
defer allocator.free(schema);

// Pull results
try client.sendPull(1, 1000);
const result = try client.receiveMessage(30000);
defer allocator.free(result);

// Parse JSON response and iterate rows
std.debug.print("Result: {s}\n", .{result});
```
{{< /tab >}}
{{< /tabs >}}

Expected output:
```
| p.name   | p.age | p.city         |
|----------|-------|----------------|
| Bob      | 25    | San Francisco  |
| Alice    | 30    | New York       |
| Charlie  | 35    | Seattle        |
```

### Find Friends

```gql
MATCH (p:Person)-[:KNOWS]->(friend:Person)
RETURN p.name AS person, friend.name AS friend
```

{{< tabs >}}
{{< tab "Go" >}}
```go
rows, _ := db.QueryContext(ctx, `
    MATCH (p:Person)-[:KNOWS]->(friend:Person)
    RETURN p.name AS person, friend.name AS friend
`)
defer rows.Close()

for rows.Next() {
    var person, friend string
    rows.Scan(&person, &friend)
    fmt.Printf("%s knows %s\n", person, friend)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
page, _ = await conn.query("""
    MATCH (p:Person)-[:KNOWS]->(friend:Person)
    RETURN p.name AS person, friend.name AS friend
""")
for row in page.rows:
    print(f"{row['person'].as_string} knows {row['friend'].as_string}")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
let (page, _) = conn.query(r#"
    MATCH (p:Person)-[:KNOWS]->(friend:Person)
    RETURN p.name AS person, friend.name AS friend
"#).await?;

for row in &page.rows {
    println!("{} knows {}",
        row.get("person").unwrap().as_string()?,
        row.get("friend").unwrap().as_string()?);
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
const rows = await client.queryAll(`
    MATCH (p:Person)-[:KNOWS]->(friend:Person)
    RETURN p.name AS person, friend.name AS friend
`);
for (const row of rows) {
    console.log(`${row.get('person')?.asString} knows ${row.get('friend')?.asString}`);
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
try client.sendRunGql(1,
    \\MATCH (p:Person)-[:KNOWS]->(friend:Person)
    \\RETURN p.name AS person, friend.name AS friend
, null);
const schema = try client.receiveMessage(30000);
defer allocator.free(schema);

try client.sendPull(1, 1000);
const result = try client.receiveMessage(30000);
defer allocator.free(result);
std.debug.print("Result: {s}\n", .{result});
```
{{< /tab >}}
{{< /tabs >}}

Expected output:
```
| person  | friend  |
|---------|---------|
| Alice   | Bob     |
| Bob     | Charlie |
```

### Find Friends of Friends

```gql
MATCH (p:Person {name: "Alice"})-[:KNOWS*2..2]->(fof:Person)
RETURN DISTINCT fof.name AS friend_of_friend
```

Expected output:
```
| friend_of_friend |
|------------------|
| Charlie          |
```

### Count by City

```gql
MATCH (p:Person)
RETURN p.city, count(p) AS population
ORDER BY population DESC
```

Expected output:
```
| p.city        | population |
|---------------|------------|
| New York      | 1          |
| San Francisco | 1          |
| Seattle       | 1          |
```

## Step 6: Use Transactions

```gql
BEGIN

// Create a person
CREATE (:Person {name: "David", age: 28})

// Create relationship
MATCH (david:Person {name: "David"})
MATCH (alice:Person {name: "Alice"})
CREATE (david)-[:KNOWS]->(alice)

COMMIT
```

{{< tabs >}}
{{< tab "Go" >}}
```go
tx, err := db.BeginTx(ctx, nil)
if err != nil {
    log.Fatal(err)
}

// Create a person
_, err = tx.ExecContext(ctx, `CREATE (:Person {name: ?, age: ?})`, "David", 28)
if err != nil {
    tx.Rollback()
    log.Fatal(err)
}

// Create relationship
_, err = tx.ExecContext(ctx, `
    MATCH (d:Person {name: ?}), (a:Person {name: ?})
    CREATE (d)-[:KNOWS]->(a)
`, "David", "Alice")
if err != nil {
    tx.Rollback()
    log.Fatal(err)
}

err = tx.Commit()
if err != nil {
    log.Fatal(err)
}
log.Println("Transaction committed!")
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async with client.connection() as conn:
    await conn.begin()
    try:
        # Create a person
        await conn.execute(
            "CREATE (:Person {name: $name, age: $age})",
            {"name": "David", "age": 28}
        )

        # Create relationship
        await conn.execute("""
            MATCH (d:Person {name: $david}), (a:Person {name: $alice})
            CREATE (d)-[:KNOWS]->(a)
        """, {"david": "David", "alice": "Alice"})

        await conn.commit()
        print("Transaction committed!")
    except Exception as e:
        await conn.rollback()
        raise e
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
conn.begin().await?;

// Create a person
let mut params = HashMap::new();
params.insert("name".to_string(), Value::string("David"));
params.insert("age".to_string(), Value::int(28));
conn.query_with_params("CREATE (:Person {name: $name, age: $age})", &params).await?;

// Create relationship
let mut rel_params = HashMap::new();
rel_params.insert("david".to_string(), Value::string("David"));
rel_params.insert("alice".to_string(), Value::string("Alice"));
match conn.query_with_params(r#"
    MATCH (d:Person {name: $david}), (a:Person {name: $alice})
    CREATE (d)-[:KNOWS]->(a)
"#, &rel_params).await {
    Ok(_) => {
        conn.commit().await?;
        println!("Transaction committed!");
    }
    Err(e) => {
        conn.rollback().await?;
        return Err(e.into());
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
await client.withTransaction(async (tx) => {
    // Create a person
    await tx.exec(
        'CREATE (:Person {name: $name, age: $age})',
        { params: { name: 'David', age: 28 } }
    );

    // Create relationship
    await tx.exec(`
        MATCH (d:Person {name: $david}), (a:Person {name: $alice})
        CREATE (d)-[:KNOWS]->(a)
    `, { params: { david: 'David', alice: 'Alice' } });

    // Auto-commits on success
});
console.log('Transaction committed!');
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// Begin transaction
try client.sendBegin();
_ = try client.receiveMessage(30000);

// Create a person with params
var params = std.json.ObjectMap.init(allocator);
defer params.deinit();
try params.put("name", .{ .string = "David" });
try params.put("age", .{ .integer = 28 });

try client.sendRunGql(1, "CREATE (:Person {name: $name, age: $age})",
    .{ .object = params });
_ = try client.receiveMessage(30000);

// Create relationship with params
params.clearRetainingCapacity();
try params.put("david", .{ .string = "David" });
try params.put("alice", .{ .string = "Alice" });

try client.sendRunGql(2,
    \\MATCH (d:Person {name: $david}), (a:Person {name: $alice})
    \\CREATE (d)-[:KNOWS]->(a)
, .{ .object = params });
_ = try client.receiveMessage(30000);

// Commit
try client.sendCommit();
_ = try client.receiveMessage(30000);

std.debug.print("Transaction committed!\n", .{});
```
{{< /tab >}}
{{< /tabs >}}

## Step 7: Create Indexes

Improve query performance with indexes:

```gql
// Create index on Person.name
CREATE INDEX person_name ON :Person(name)

// Create index on Person.age
CREATE INDEX person_age ON :Person(age)

// Verify indexes
SHOW INDEXES
```

## Step 8: Add Constraints

Ensure data integrity:

```gql
// Ensure Person.name is unique
CREATE CONSTRAINT person_name_unique ON :Person(name) ASSERT UNIQUE

// Ensure Person.age exists
CREATE CONSTRAINT person_age_exists ON :Person(age) ASSERT EXISTS
```

## Common Operations

### Update Properties

```gql
MATCH (p:Person {name: "Alice"})
SET p.age = 31, p.updated_at = timestamp()
```

### Delete Relationships

```gql
MATCH (p:Person {name: "Alice"})-[r:KNOWS]->()
DELETE r
```

### Delete Nodes

```gql
MATCH (p:Person {name: "Alice"})
DELETE p
```

### Delete Everything

```gql
MATCH (n)
DETACH DELETE n
```

## Interactive CLI

Use the interactive CLI for exploration:

```bash
geode cli -h localhost:3141
```

Example session:
```
geode> MATCH (n) RETURN count(n)
| count(n) |
|----------|
| 3        |

geode> MATCH (p:Person) RETURN p.name
| p.name   |
|----------|
| Alice    |
| Bob      |
| Charlie  |

geode> \help
Available commands:
  \help     - Show this help
  \exit     - Exit the CLI
  \clear    - Clear screen
  \schema   - Show schema
  \indexes  - Show indexes

geode> \exit
Goodbye!
```

## Next Steps

Now that you have Geode running:

1. **Learn GQL**: Read the [GQL Reference](/docs/gql-reference/) to master the query language
2. **Design Your Schema**: Follow the [Graph Modeling Guide](/guides/graph-modeling/)
3. **Optimize Performance**: Check out [Query Optimization](/guides/query-performance/)
4. **Build an Application**: See [Example Applications](/docs/tutorials/)
5. **Deploy to Production**: Review [Production Deployment](/guides/production-deployment/)

## Troubleshooting

### Connection Refused

```bash
# Check if Geode is running
docker ps | grep geode

# Check logs
docker logs geode

# Restart
docker restart geode
```

### Port Already in Use

```bash
# Use different port
docker run -d -p 3142:3141 geode:latest

# Then connect
geode ping localhost:3142
```

### Query Errors

```bash
# Enable verbose logging
geode exec -v -q "MATCH (n) RETURN n"

# Check query syntax
geode check query.gql
```

## Resources

- [Full Documentation](/docs/)
- [GQL Reference](/docs/gql-reference/)
- [Client Libraries](/clients/)
- [Use Cases](/docs/use-cases/)
- [Community Forum](https://forum.geodedb.com)

## Get Help

- [Documentation](https://docs.geodedb.com)
- [GitLab Issues](https://gitlab.com/devnw/codepros/geode/geode/-/issues)
- [Community Chat](https://chat.geodedb.com)
- [Email Support](mailto:support@geodedb.com)
