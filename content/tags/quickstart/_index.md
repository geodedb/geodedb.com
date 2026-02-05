---
title: "Quickstart Resources"
description: "Quickstart resources for Geode graph database. Fast-track guides, essential commands, and rapid deployment instructions for immediate productivity."
keywords:
  - quickstart
  - fast start
  - rapid guide
  - quick reference
  - instant setup
  - speed guide
  - express start
  - fast track Geode
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/quickstart/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Quickstart Resources

Quickstart resources provide the fastest path to productivity with Geode graph database. Skip lengthy explanations and jump straight into working code, essential commands, and production-ready patterns.

## 60-Second Installation

```bash
# Docker (fastest)
docker run -d -p 3141:3141 --name geode geodedb/geode:latest

# Or build from source
git clone https://github.com/codeprosorg/geode && cd geode && make build && ./zig-out/bin/geode serve
```

## 30-Second First Query

```bash
# Install Python client
pip install geode-client

# Run first query
python3 << 'PY'
import asyncio
from geode_client import Client

async def quick():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        await conn.execute("CREATE (p:Person {name: 'Alice'})")
        page, _ = await conn.query("MATCH (p:Person) RETURN p.name AS name")
        print([row["name"].as_string for row in page.rows])

asyncio.run(quick())
PY
```

## Essential GQL Cheatsheet

### CRUD Operations

```gql
-- CREATE
CREATE (p:Person {name: 'Alice', age: 30})

-- READ
MATCH (p:Person {name: 'Alice'}) RETURN p

-- UPDATE
MATCH (p:Person {name: 'Alice'}) SET p.age = 31

-- DELETE
MATCH (p:Person {name: 'Alice'}) DETACH DELETE p
```

### Relationships

```gql
-- Create relationship
MATCH (a:Person {name: 'Alice'})
MATCH (b:Person {name: 'Bob'})
CREATE (a)-[:KNOWS {since: 2020}]->(b)

-- Query relationship
MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN a.name, b.name

-- Delete relationship
MATCH (a:Person)-[r:KNOWS]->(b:Person)
WHERE a.name = 'Alice' AND b.name = 'Bob'
DELETE r
```

### Patterns

```gql
-- Friends of friends
MATCH (me)-[:KNOWS]->(friend)-[:KNOWS]->(fof)
WHERE me.name = 'Alice' AND NOT (me)-[:KNOWS]->(fof)
RETURN DISTINCT fof.name

-- Variable length (1 to 3 hops)
MATCH (a:Person)-[:KNOWS*1..3]->(b:Person)
RETURN a.name, b.name, length(path)

-- Optional match
MATCH (u:User)
OPTIONAL MATCH (u)-[:HAS_AVATAR]->(img:Image)
RETURN u.name, img.url
```

## Language Quick References

### Python Quickstart

```python
from geode_client import Client
import asyncio

async def main():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Transaction
        await conn.begin()
        try:
            await conn.execute("CREATE (p:Person {name: $n})", {"n": "Alice"})
            await conn.commit()
        except Exception:
            await conn.rollback()
            raise

        # Query with parameters
        result, _ = await conn.query(
            "MATCH (p:Person {name: $name}) RETURN p",
            {"name": "Alice"}
        )

        # Stream results
        for row in result.rows:
            print(row["p"])

asyncio.run(main())
```

### Go Quickstart

```go
import (
    "database/sql"
    _ "geodedb.com/geode"
)

func main() {
    db, _ := sql.Open("geode", "quic://localhost:3141")
    defer db.Close()

    // Execute with parameters
    db.Exec("CREATE (p:Person {name: $name})",
        sql.Named("name", "Alice"))

    // Query
    rows, _ := db.Query("MATCH (p:Person) RETURN p.name")
    defer rows.Close()

    for rows.Next() {
        var name string
        rows.Scan(&name)
    }

    // Transaction
    tx, _ := db.Begin()
    tx.Exec("CREATE (p:Person {name: 'Bob'})")
    tx.Commit()
}
```

### Rust Quickstart

```rust
use geode_client::{Client, Result, Value};
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<()> {
    let client = Client::new("localhost", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    // Execute with params
    let mut params = HashMap::new();
    params.insert("name".to_string(), Value::string("Alice"));
    conn.query_with_params(
        "CREATE (p:Person {name: $name})",
        &params
    ).await?;

    // Read results
    let (page, _) = conn.query("MATCH (p:Person) RETURN p.name AS name").await?;
    for row in &page.rows {
        let name = row.get("name").unwrap().as_string()?;
        println!("{}", name);
    }

    // Transaction
    conn.begin().await?;
    conn.query("CREATE (p:Person {name: 'Bob'})").await?;
    conn.commit().await?;

    Ok(())
}
```

## Common Use Cases

### Social Network

```gql
-- Find mutual friends
MATCH (me:Person {id: $myId})-[:FRIENDS]-(friend)-[:FRIENDS]-(other)
WHERE (me)-[:FRIENDS]-(other) AND me <> other
RETURN friend.name, other.name

-- Suggested connections (friends of friends)
MATCH (me:Person {id: $myId})-[:FRIENDS*2]-(suggested)
WHERE NOT (me)-[:FRIENDS]-(suggested) AND me <> suggested
RETURN DISTINCT suggested.name, suggested.id
LIMIT 10
```

### E-Commerce

```gql
-- Product recommendations
MATCH (me:User {id: $userId})-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(other:User)-[:PURCHASED]->(rec:Product)
WHERE NOT (me)-[:PURCHASED]->(rec)
RETURN rec.name, COUNT(*) as relevance
ORDER BY relevance DESC
LIMIT 5

-- Category browsing
MATCH (c:Category {name: $category})<-[:IN_CATEGORY]-(p:Product)
WHERE p.in_stock = true
RETURN p.name, p.price
ORDER BY p.price
```

### Knowledge Graph

```gql
-- Find related concepts
MATCH (concept:Concept {name: $name})-[:RELATED_TO*1..2]-(related)
RETURN DISTINCT related.name, related.description

-- Hierarchical navigation
MATCH (parent:Category {name: $name})<-[:SUBCATEGORY_OF*]-(child)
RETURN child.name, length(path) as depth
ORDER BY depth, child.name
```

## Quick Configuration

### Connection Pooling

```python
# Python - automatic pooling
from geode_client import ConnectionPool

pool = ConnectionPool(host="localhost", port=3141, min_size=10, max_size=100)
```

```go
// Go - manual configuration
db.SetMaxOpenConns(100)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(time.Hour)
```

```rust
// Rust - builder pattern
use geode_client::ConnectionPool;

let pool = ConnectionPool::new("localhost", 3141, 100);
```

### Error Handling

```python
# Python
try:
    async with client.connection() as conn:
        await conn.query(query)
except QueryError as exc:
    if "SERIALIZATION" in str(exc):
        # Retry logic
    else:
        # Log and fail
```

```go
// Go
if err == sql.ErrNoRows {
    // Not found
} else if geodeErr, ok := err.(*geode.Error); ok {
    if geodeErr.IsRetryable() {
        // Retry
    }
}
```

```rust
// Rust
match conn.query_with_params(query, &params).await {
    Ok((_page, _)) => { /* success */ }
    Err(err) if err.is_retryable() => { /* retry */ }
    Err(e) => { /* other error */ }
}
```

## Performance Quick Wins

### 1. Create Indexes

```gql
-- Index frequently queried properties
CREATE INDEX ON Person(email)
CREATE INDEX ON Product(name)
CREATE INDEX ON User(id)
```

### 2. Profile Queries

```gql
-- See execution plan
PROFILE MATCH (p:Person {name: 'Alice'}) RETURN p

-- Identify bottlenecks
EXPLAIN MATCH (a:Person)-[:KNOWS*3]->(b) RETURN count(*)
```

### 3. Batch Operations

```python
# Insert multiple nodes in one query
async with client.connection() as conn:
    await conn.execute(
        """
        UNWIND $users AS user
        CREATE (p:Person {name: user.name, email: user.email})
        """,
        {
            "users": [
                {"name": "Alice", "email": "alice@example.com"},
                {"name": "Bob", "email": "bob@example.com"},
            ]
        },
    )
```

### 4. Use Transactions

```python
# Group related operations
async with client.connection() as conn:
    await conn.begin()
    try:
        await conn.execute("CREATE (o:Order {id: $id})", {"id": order_id})
        for item in items:
            await conn.execute(
                "CREATE (o)-[:CONTAINS]->(p:Product {id: $pid})",
                {"pid": item.product_id},
            )
        await conn.commit()
    except Exception:
        await conn.rollback()
        raise
```

## Production Quickstart

### Docker Compose

```yaml
version: '3.8'
services:
  geode:
    image: geodedb/geode:latest
    ports:
      - "3141:3141"
    volumes:
      - geode-data:/data
    environment:
      - GEODE_LISTEN=0.0.0.0:3141
      - GEODE_LOG_LEVEL=info
    restart: unless-stopped

volumes:
  geode-data:
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: geode
spec:
  replicas: 3
  selector:
    matchLabels:
      app: geode
  template:
    metadata:
      labels:
        app: geode
    spec:
      containers:
      - name: geode
        image: geodedb/geode:latest
        ports:
        - containerPort: 3141
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: geode-pvc
```

### Health Check

```python
# Python health check endpoint
@app.get("/health")
async def health():
    try:
        async with client.connection() as conn:
            await conn.query("RETURN 1 AS ok")
        return {"status": "healthy"}
    except:
        return {"status": "unhealthy"}, 503
```

## Troubleshooting Quick Reference

### Connection Issues

```bash
# Test connectivity
telnet localhost 3141

# Check if server is running
ps aux | grep geode

# View server logs
./geode serve --log-level debug
```

### Query Issues

```gql
-- Check if data exists
MATCH (n) RETURN count(n)

-- Verify relationship direction
MATCH (a)-[r]->(b) RETURN type(r), count(*)

-- Find duplicate nodes
MATCH (n:Person)
WITH n.email as email, collect(n) as nodes
WHERE size(nodes) > 1
RETURN email, size(nodes)
```

### Performance Issues

```gql
-- Find slow queries with PROFILE
PROFILE MATCH (a)-[:KNOWS*]->(b) RETURN count(*)

-- Check for missing indexes
SHOW INDEXES

-- Identify Cartesian products
MATCH (a:Person), (b:Product)  -- BAD: no relationship
RETURN count(*)
```

## Quick Reference Card

### Query Clauses

- `MATCH` - Find patterns
- `CREATE` - Insert data
- `SET` - Update properties
- `DELETE` - Remove data
- `RETURN` - Output results
- `WHERE` - Filter results
- `ORDER BY` - Sort results
- `LIMIT` - Restrict count
- `WITH` - Chain queries
- `OPTIONAL MATCH` - Nullable patterns

### Aggregation Functions

- `COUNT(*)` - Count rows
- `SUM(expr)` - Sum values
- `AVG(expr)` - Average values
- `MIN(expr)` - Minimum value
- `MAX(expr)` - Maximum value
- `COLLECT(expr)` - Gather into list

### Path Functions

- `shortestPath()` - Find shortest path
- `allShortestPaths()` - All shortest paths
- `length(path)` - Path length
- `nodes(path)` - Nodes in path
- `relationships(path)` - Edges in path

## Next Steps

Now that you're up and running:

- **Build Your Schema**: Design your graph model
- **Load Data**: Import existing datasets
- **Optimize Queries**: Profile and add indexes
- **Implement Security**: Configure authentication and RLS
- **Monitor Performance**: Set up metrics and alerts
- **Plan Scaling**: Configure replication and backups

## Related Topics

- **Getting Started**: Detailed beginner guide with explanations
- **Examples**: More code samples across all features
- **Tutorials**: Step-by-step learning paths
- **Quick Start**: Another fast-track guide
- **Developer Guide**: Complete API reference
