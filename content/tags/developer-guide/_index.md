---
title: "Developer Guide"
description: "Complete developer guide for Geode graph database. API reference, query syntax, client libraries, best practices, and comprehensive technical documentation."
keywords:
  - developer guide
  - API reference
  - technical documentation
  - programming guide
  - developer docs
  - API documentation
  - technical reference
  - development manual
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/developer-guide/"
    noindex: false
---

# Developer Guide

The complete technical reference for developing applications with Geode graph database. This guide covers API documentation, query syntax, client libraries, architectural patterns, and production best practices for building scalable graph applications.

## Architecture Overview

Geode is built on modern, production-ready foundations:

**Core Technology**:
- Written in Zig for performance and safety
- QUIC transport with TLS 1.3 encryption
- JSON line protocol for client-server communication
- ACID-compliant transaction engine
- ISO/IEC 39075:2024 GQL standard compliance

**Key Components**:
- Query Parser & Optimizer
- Storage Engine with MVCC
- Transaction Manager
- Security & Authorization Layer
- Client Protocol Handler

**Performance Characteristics**:
- Python client: 1,000+ queries/second
- Rust client: 10,000+ queries/second
- Transaction latency: < 10ms (local)
- Concurrent connections: 10,000+

## Query Language Reference

### GQL Syntax Overview

Graph Query Language (GQL) is a declarative language for querying property graphs. Unlike SQL's table-oriented model, GQL thinks in terms of graph patterns.

### MATCH Clause

Find patterns in the graph:

```gql
-- Basic node match
MATCH (p:Person)
RETURN p

-- Match with property filter
MATCH (p:Person {name: 'Alice'})
RETURN p

-- Match relationship
MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN a.name, b.name

-- Multi-hop traversal
MATCH (a:Person)-[:KNOWS*2]->(b:Person)
RETURN a.name, b.name

-- Variable-length with bounds
MATCH (a)-[:KNOWS*1..3]->(b)
RETURN a, b

-- Undirected matching
MATCH (a)-[:KNOWS]-(b)  -- Either direction
RETURN a, b
```

### CREATE Clause

Insert nodes and relationships:

```gql
-- Create single node
CREATE (p:Person {name: 'Alice', age: 30})

-- Create multiple nodes
CREATE (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})

-- Create with relationship
CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})

-- Create relationship between existing nodes
MATCH (a:Person {name: 'Alice'})
MATCH (b:Person {name: 'Bob'})
CREATE (a)-[:KNOWS {since: 2020}]->(b)
```

### SET Clause

Update properties:

```gql
-- Set single property
MATCH (p:Person {name: 'Alice'})
SET p.age = 31

-- Set multiple properties
MATCH (p:Person {name: 'Alice'})
SET p.age = 31, p.city = 'NYC', p.updated_at = timestamp()

-- Add new properties
MATCH (p:Person {name: 'Alice'})
SET p += {email: 'alice@example.com', verified: true}
```

### DELETE Clause

Remove nodes and relationships:

```gql
-- Delete relationship
MATCH (a:Person)-[r:KNOWS]->(b:Person)
WHERE a.name = 'Alice' AND b.name = 'Bob'
DELETE r

-- Delete node (must have no relationships)
MATCH (p:Person {name: 'Alice'})
DELETE p

-- Delete node and all relationships
MATCH (p:Person {name: 'Alice'})
DETACH DELETE p
```

### WHERE Clause

Filter results:

```gql
-- Property comparison
MATCH (p:Person)
WHERE p.age > 25
RETURN p

-- Multiple conditions
MATCH (p:Person)
WHERE p.age > 25 AND p.city = 'NYC'
RETURN p

-- IN operator
MATCH (p:Person)
WHERE p.name IN ['Alice', 'Bob', 'Carol']
RETURN p

-- Pattern predicate
MATCH (p:Person)
WHERE EXISTS { MATCH (p)-[:KNOWS]->(:Person {city: 'NYC'}) }
RETURN p

-- Null checks
MATCH (p:Person)
WHERE p.email IS NOT NULL
RETURN p
```

### Aggregation

Compute aggregate values:

```gql
-- Count
MATCH (p:Person)
RETURN COUNT(p)

-- Count distinct
MATCH (p:Person)
RETURN COUNT(DISTINCT p.city)

-- Sum, Average
MATCH (o:Order)
RETURN SUM(o.total), AVG(o.total)

-- Min, Max
MATCH (p:Product)
RETURN MIN(p.price), MAX(p.price)

-- Group by
MATCH (p:Person)
RETURN p.city, COUNT(p) as residents
ORDER BY residents DESC

-- Collect into list
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN p.name, COLLECT(friend.name) as friends
```

### Subqueries

Compose complex queries:

```gql
-- Existential subquery
MATCH (p:Person)
WHERE EXISTS {
    MATCH (p)-[:KNOWS]->(:Person {city: 'NYC'})
}
RETURN p

-- Scalar subquery
MATCH (p:Person)
RETURN p.name, (
    MATCH (p)-[:KNOWS]->(friend)
    RETURN COUNT(friend)
) as friend_count

-- WITH clause for chaining
MATCH (p:Person)
WITH p, SIZE((p)-[:KNOWS]->()) as friend_count
WHERE friend_count > 5
RETURN p.name, friend_count
```

### OPTIONAL MATCH

Handle nullable patterns:

```gql
-- Optional relationship
MATCH (u:User)
OPTIONAL MATCH (u)-[:HAS_AVATAR]->(img:Image)
RETURN u.name, img.url

-- Multiple optional patterns
MATCH (u:User)
OPTIONAL MATCH (u)-[:HAS_AVATAR]->(img:Image)
OPTIONAL MATCH (u)-[:HAS_PROFILE]->(prof:Profile)
RETURN u.name, img.url, prof.bio
```

## Client Libraries

### Python Client

**Installation**:
```bash
pip install geode-client
```

**Basic Usage**:
```python
import asyncio
from geode_client import GeodeClient

async def main():
    async with GeodeClient("localhost:3141") as client:
        # Execute query
        result = await client.execute(
            "MATCH (p:Person {name: $name}) RETURN p",
            name="Alice"
        )

        # Iterate results
        async for row in result:
            print(row['p'])

        # Transactions
        async with client.transaction() as tx:
            await tx.execute("CREATE (p:Person {name: $name})", name="Bob")
            await tx.execute("CREATE (p:Person {name: $name})", name="Carol")

asyncio.run(main())
```

**Connection Pooling**:
```python
client = GeodeClient("localhost:3141", pool_size=100, pool_timeout=30)
```

**Error Handling**:
```python
from geode_client import QueryError, TransactionConflictError

try:
    await client.execute(query)
except TransactionConflictError:
    # Retry logic
    pass
except QueryError as e:
    # Handle other errors
    if e.is_syntax_error:
        logger.error(f"Syntax error: {e}")
```

### Go Client

**Installation**:
```bash
go get go.codepros.org/geode
```

**Basic Usage**:
```go
import (
    "database/sql"
    _ "go.codepros.org/geode"
)

func main() {
    db, err := sql.Open("geode", "geode://localhost:3141")
    if err != nil {
        panic(err)
    }
    defer db.Close()

    // Query
    rows, err := db.Query("MATCH (p:Person {name: $name}) RETURN p",
        sql.Named("name", "Alice"))
    defer rows.Close()

    // Transaction
    tx, _ := db.Begin()
    tx.Exec("CREATE (p:Person {name: $name})", sql.Named("name", "Bob"))
    tx.Commit()
}
```

**Connection Pool Configuration**:
```go
db.SetMaxOpenConns(100)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(time.Hour)
```

### Rust Client

**Installation**:
```toml
[dependencies]
geode-client = "0.18"
tokio = { version = "1", features = ["full"] }
```

**Basic Usage**:
```rust
use geode_client::{Client, params};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::connect("localhost:3141").await?;

    // Query with parameters
    let mut results = client.execute(
        "MATCH (p:Person {name: $name}) RETURN p",
        params! { "name" => "Alice" }
    ).stream().await?;

    while let Some(row) = results.next().await {
        println!("{:?}", row.get::<String>("p.name")?);
    }

    // Transaction
    let tx = client.begin().await?;
    tx.execute("CREATE (p:Person {name: $name})", params! { "name" => "Bob" }).await?;
    tx.commit().await?;

    Ok(())
}
```

### Zig Client

**Usage** (client is vendored in geode-client-zig/):

```zig
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = try geode.Client.connect(allocator, "localhost", 3141);
    defer client.disconnect();

    // Execute query
    const result = try client.execute("MATCH (p:Person) RETURN p.name", .{});
    defer result.deinit();

    // Process results
    while (try result.next()) |row| {
        const name = try row.get("p.name");
        std.debug.print("Name: {s}\n", .{name});
    }
}
```

## API Reference

### Connection Management

**Python**:
```python
client = GeodeClient(
    address="localhost:3141",
    tls_verify=True,
    pool_size=100,
    pool_timeout=30,
    query_timeout=60
)
```

**Go**:
```go
db, err := sql.Open("geode", "geode://user:pass@localhost:3141?tls=true")
```

**Rust**:
```rust
let client = Client::builder()
    .address("localhost:3141")
    .pool_size(100)
    .connect_timeout(Duration::from_secs(30))
    .connect()
    .await?;
```

### Transaction API

**Python**:
```python
async with client.transaction() as tx:
    await tx.execute(query1)

    sp = await tx.savepoint("checkpoint")
    try:
        await tx.execute(query2)
    except:
        await tx.rollback_to(sp)

    await tx.execute(query3)
```

**Go**:
```go
tx, _ := db.Begin()
tx.Exec(query1)
tx.Exec(query2)
tx.Commit()  // or tx.Rollback()
```

**Rust**:
```rust
let tx = client.begin().await?;
tx.execute(query1, params).await?;
tx.execute(query2, params).await?;
tx.commit().await?;
```

### Result Handling

**Python**:
```python
result = await client.execute(query)

# Get first row
row = await result.first()

# Iterate all rows
async for row in result:
    value = row['column_name']

# Get all rows as list
rows = await result.collect()
```

**Go**:
```go
rows, _ := db.Query(query)
defer rows.Close()

for rows.Next() {
    var name string
    var age int
    rows.Scan(&name, &age)
}
```

**Rust**:
```rust
let mut stream = client.execute(query, params).stream().await?;

while let Some(row) = stream.next().await {
    let name: String = row.get("name")?;
    let age: i64 = row.get("age")?;
}
```

## Best Practices

### Query Optimization

**Use Parameters**:
```python
# Good: Prepared statement, safe from injection
result = await client.execute(
    "MATCH (p:Person {name: $name}) RETURN p",
    name=user_input
)

# Bad: String concatenation, vulnerable
query = f"MATCH (p:Person {{name: '{user_input}'}}) RETURN p"
```

**Create Indexes**:
```gql
CREATE INDEX ON Person(email)
CREATE INDEX ON Product(name)
```

**Profile Queries**:
```gql
PROFILE MATCH (a:Person)-[:KNOWS*2]->(b)
WHERE a.city = 'NYC'
RETURN b.name
```

### Transaction Management

**Keep Transactions Short**:
```python
# Good: focused transaction
async with client.transaction() as tx:
    await tx.execute("CREATE (p:Person {name: 'Alice'})")

# Bad: long-running transaction holding locks
async with client.transaction() as tx:
    for item in huge_list:  # Don't do this
        await tx.execute(f"CREATE (p:Person {{name: '{item}'}})")
```

**Use Savepoints for Complex Operations**:
```python
async with client.transaction() as tx:
    await tx.execute(critical_operation)

    sp = await tx.savepoint("optional_part")
    try:
        await tx.execute(optional_operation)
    except:
        await tx.rollback_to(sp)  # Keep critical_operation
```

### Error Handling

**Implement Retry Logic**:
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10)
)
async def execute_with_retry(client, query):
    return await client.execute(query)
```

**Handle Specific Errors**:
```python
try:
    await client.execute(query)
except TransactionConflictError:
    # Retry this one
    pass
except QuerySyntaxError:
    # Don't retry syntax errors
    logger.error("Invalid query syntax")
    raise
```

## Production Deployment

### Configuration

**Server Configuration**:
```yaml
server:
  listen: 0.0.0.0:3141
  max_connections: 10000
  tls:
    cert_file: /etc/geode/server.crt
    key_file: /etc/geode/server.key

storage:
  data_dir: /var/lib/geode
  wal_dir: /var/lib/geode/wal

performance:
  query_timeout: 60s
  transaction_timeout: 300s
  max_query_memory: 1GB
```

**Client Configuration**:
```python
client = GeodeClient(
    address="geode.example.com:3141",
    tls_verify=True,
    pool_size=100,
    connect_timeout=30,
    query_timeout=60
)
```

### Monitoring

**Key Metrics**:
- Query latency (p50, p95, p99)
- Transaction throughput
- Connection pool utilization
- Error rates
- Memory usage

**Health Checks**:
```python
@app.get("/health")
async def health():
    try:
        await client.execute("MATCH (n) RETURN count(n) LIMIT 1")
        return {"status": "healthy"}
    except:
        return {"status": "unhealthy"}, 503
```

### Backup & Recovery

**Backup Strategy**:
```bash
# Snapshot backup
./geode backup --output /backups/geode-$(date +%Y%m%d).tar.gz

# Continuous WAL archiving
./geode wal-archive --destination s3://backups/wal/
```

**Recovery**:
```bash
# Restore from snapshot
./geode restore --input /backups/geode-20250124.tar.gz

# Point-in-time recovery
./geode restore --snapshot /backups/base.tar.gz --wal /backups/wal/ --target-time 2025-01-24T15:30:00Z
```

## Related Topics

- **Tutorials**: Step-by-step learning guides
- **Examples**: Working code samples
- **API Reference**: Complete function documentation
- **Performance Guide**: Optimization techniques
- **Security Guide**: Authentication and authorization
