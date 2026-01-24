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

# Quickstart Resources

Quickstart resources provide the fastest path to productivity with Geode graph database. Skip lengthy explanations and jump straight into working code, essential commands, and production-ready patterns.

## 60-Second Installation

```bash
# Docker (fastest)
docker run -d -p 3141:3141 --name geode geodedb/geode:latest

# Or build from source
git clone https://gitlab.com/devnw/codepros/geode.git && cd geode/geode && make build && ./zig-out/bin/geode serve
```

## 30-Second First Query

```bash
# Install Python client
pip install geode-client

# Run first query
python3 << 'PY'
import asyncio
from geode_client import GeodeClient

async def quick():
    async with GeodeClient("localhost:3141") as client:
        await client.execute("CREATE (p:Person {name: 'Alice'})")
        result = await client.execute("MATCH (p:Person) RETURN p.name")
        print([row async for row in result])

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
from geode_client import GeodeClient
import asyncio

async def main():
    async with GeodeClient("localhost:3141") as client:
        # Transaction
        async with client.transaction() as tx:
            await tx.execute("CREATE (p:Person {name: $n})", n="Alice")

        # Query with parameters
        result = await client.execute(
            "MATCH (p:Person {name: $name}) RETURN p",
            name="Alice"
        )

        # Stream results
        async for row in result:
            print(row['p'])

asyncio.run(main())
```

### Go Quickstart

```go
import (
    "database/sql"
    _ "go.codepros.org/geode"
)

func main() {
    db, _ := sql.Open("geode", "geode://localhost:3141")
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
use geode_client::{Client, params};

#[tokio::main]
async fn main() {
    let client = Client::connect("localhost:3141").await.unwrap();

    // Execute with params
    client.execute(
        "CREATE (p:Person {name: $name})",
        params! { "name" => "Alice" }
    ).await.unwrap();

    // Stream results
    let mut stream = client.execute(
        "MATCH (p:Person) RETURN p.name",
        params! {}
    ).stream().await.unwrap();

    while let Some(row) = stream.next().await {
        let name: String = row.get("p.name").unwrap();
        println!("{}", name);
    }

    // Transaction
    let tx = client.begin().await.unwrap();
    tx.execute("CREATE (p:Person {name: 'Bob'})", params! {}).await.unwrap();
    tx.commit().await.unwrap();
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
client = GeodeClient("localhost:3141", pool_size=100)
```

```go
// Go - manual configuration
db.SetMaxOpenConns(100)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(time.Hour)
```

```rust
// Rust - builder pattern
let client = Client::builder()
    .address("localhost:3141")
    .pool_size(100)
    .connect()
    .await?;
```

### Error Handling

```python
# Python
try:
    await client.execute(query)
except QueryError as e:
    if e.is_retryable:
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
match client.execute(query, params).await {
    Ok(result) => { /* success */ }
    Err(geode_client::Error::TransactionConflict) => { /* retry */ }
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
await client.execute("""
    UNWIND $users AS user
    CREATE (p:Person {name: user.name, email: user.email})
""", users=[
    {"name": "Alice", "email": "alice@example.com"},
    {"name": "Bob", "email": "bob@example.com"},
])
```

### 4. Use Transactions

```python
# Group related operations
async with client.transaction() as tx:
    await tx.execute("CREATE (o:Order {id: $id})", id=order_id)
    for item in items:
        await tx.execute("CREATE (o)-[:CONTAINS]->(p:Product {id: $pid})",
                        pid=item.product_id)
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
        await client.execute("MATCH (n) RETURN count(n) LIMIT 1")
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
