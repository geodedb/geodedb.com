---
title: "Development Guide"
description: "Comprehensive development guide for Geode graph database including setup, local development, testing, debugging, client library integration, API usage, development workflows, and contributing to Geode."
keywords:
  - development
  - developer guide
  - local development
  - testing
  - debugging
  - client libraries
  - API
  - development workflow
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/development/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Development Guide

This comprehensive guide covers everything developers need to build applications with Geode, from initial setup through testing, debugging, and deployment. Whether you're building web applications, microservices, or data pipelines, this guide provides the foundation for successful Geode integration.

## Getting Started

### Prerequisites

**System Requirements**:

- Linux, macOS, or Windows (WSL2)
- 4GB RAM minimum (8GB+ recommended)
- 2GB free disk space
- Modern compiler toolchain

**For Server Development**:

- Zig 0.1.0+ (for building from source)
- Git

**For Client Development**:

- Go 1.24+ (for Go client)
- Python 3.9+ (for Python client)
- Rust 1.70+ (for Rust client)
- Node.js 18+ (if building JavaScript client)

### Installation

**Option 1: Docker (Fastest)**:

```bash
# Pull and run Geode
docker pull geodedb/geode:latest
docker run -d -p 3141:3141 --name geode geodedb/geode:latest

# Verify
docker logs geode
```

**Option 2: Build from Source**:

```bash
# Clone repository
git clone https://github.com/codeprosorg/geode
cd geode

# Build
make build

# Run server
./zig-out/bin/geode serve --listen 127.0.0.1:3141

# In another terminal
./zig-out/bin/geode shell
```

**Option 3: Package Manager** (coming soon):

```bash
# Homebrew (macOS/Linux)
brew install geodedb/geode/geode

# APT (Debian/Ubuntu)
sudo apt install geode

# Snap (Linux)
sudo snap install geode
```

## Development Environment Setup

### Local Development Server

Create a development configuration:

```yaml
# config/dev.yaml
server:
  listen: "127.0.0.1:3141"
  log_level: "debug"

storage:
  data_dir: "./data/dev"
  wal_dir: "./data/wal"

# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS

performance:
  query_timeout: 30s
  max_connections: 100
```

Start server:

```bash
./geode serve --config config/dev.yaml
```

### Database Shell

The interactive shell is essential for development:

```bash
# Connect to local server
./geode shell

# Or specify remote server
./geode shell --host geode.example.com:3141
```

Shell commands:

```gql
-- Execute queries
MATCH (p:Person) RETURN p.name LIMIT 10;

-- Show schema
SHOW LABELS;
SHOW INDEXES;

-- Measure timing
.timer on
MATCH (p:Person)-[:KNOWS*2..3]->(friend) RETURN count(friend);

-- Export results
.output results.json
MATCH (p:Person) RETURN p;

-- Help
.help
```

## Client Library Integration

### Go Client

**Installation**:

```bash
go get geodedb.com/geode
```

**Basic Usage**:

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
    // Connect
    db, err := sql.Open("geode", "quic://localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Ping to verify connection
    if err := db.PingContext(context.Background()); err != nil {
        log.Fatal(err)
    }

    // Execute query
    rows, err := db.QueryContext(
        context.Background(),
        "MATCH (p:Person) WHERE p.age > $age RETURN p.name, p.city",
        sql.Named("age", 30),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    // Process results
    for rows.Next() {
        var name, city string
        if err := rows.Scan(&name, &city); err != nil {
            log.Fatal(err)
        }
        fmt.Printf("%s from %s\n", name, city)
    }
}
```

**Advanced Features**:

```go
// Transactions
tx, err := db.BeginTx(context.Background(), nil)
if err != nil {
    return err
}
defer tx.Rollback()

_, err = tx.ExecContext(ctx, "INSERT (u:User {name: $name})", sql.Named("name", "Alice"))
if err != nil {
    return err
}

if err := tx.Commit(); err != nil {
    return err
}

// Prepared statements
stmt, err := db.PrepareContext(ctx, "MATCH (p:Person {id: $id}) RETURN p.name")
defer stmt.Close()

for _, id := range userIDs {
    var name string
    err := stmt.QueryRowContext(ctx, sql.Named("id", id)).Scan(&name)
    // ...
}
```

### Python Client

**Installation**:

```bash
pip install geode-client
```

**Basic Usage**:

```python
import asyncio
from geode_client import Client

async def main():
    # Connect
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Execute query
        result, _ = await conn.query(
            "MATCH (p:Person) WHERE p.age > $age RETURN p.name, p.city",
            parameters={"age": 30}
        )

        # Process results
        for row in result.rows:
            print(f"{row['p.name']} from {row['p.city']}")

asyncio.run(main())
```

**Advanced Features**:

```python
# Transactions
async with client.connection() as tx:
    await tx.begin()
    await tx.execute(
        "INSERT (u:User {name: $name})",
        {"name": "Alice"}
    )
    await tx.execute(
        "INSERT (u:User {name: $name})",
        {"name": "Bob"}
    )
    await tx.commit()

# Connection pooling
client = Client(
    "localhost:3141",
    pool_size=20,
    max_overflow=10
)

# Query builder
from geode_client import QueryBuilder

query = (
    QueryBuilder()
    .match("(p:Person)")
    .where("p.age > $age")
    .return_("p.name", "p.city")
    .order_by("p.name")
    .limit(10)
)

result, _ = await tx.query(query.build(), {"age": 30})
```

### Rust Client

**Installation**:

```toml
[dependencies]
geode-client = "0.1"
tokio = { version = "1", features = ["full"] }
```

**Basic Usage**:

```rust
use geode_client::{Client, Error, Value};
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<(), Error> {
    // Connect
    let client = Client::from_dsn("localhost:3141")?;
    let mut conn = client.connect().await?;

    // Execute query
    let mut params = HashMap::new();
    params.insert("age".to_string(), Value::int(30));
    let (page, _) = conn
        .query_with_params(
            "MATCH (p:Person) WHERE p.age > $age RETURN p.name, p.city",
            &params,
        )
        .await?;

    // Process results
    for row in &page.rows {
        println!(
            \"{} from {}\",
            row.get(\"p.name\").unwrap().as_string()?,
            row.get(\"p.city\").unwrap().as_string()?
        );
    }

    Ok(())
}
```

**Advanced Features**:

```rust
// Transactions
use geode_client::Value;
use std::collections::HashMap;

let mut conn = client.connect().await?;
conn.begin().await?;
let mut params = HashMap::new();
params.insert("name".to_string(), Value::string("Alice"));
conn.query_with_params("CREATE (u:User {name: $name})", &params).await?;
conn.commit().await?;

// Concurrent queries
use futures::future::join_all;

let queries: Vec<_> = user_ids.iter().map(|id| {
    client.query(
        "MATCH (u:User {id: $id}) RETURN u.name",
        &[("id", id.into())]
    )
}).collect();

let results = join_all(queries).await;
```

## Development Workflows

### Local Development Loop

```bash
# 1. Start Geode in one terminal
./geode serve --config config/dev.yaml

# 2. Run application in another terminal
# Go
go run main.go

# Python
python app.py

# Rust
cargo run

# 3. Use shell for ad-hoc queries
./geode shell
```

### Hot Reload (for application code)

**Go with Air**:

```yaml
# .air.toml
[build]
  cmd = "go build -o ./tmp/main ."
  bin = "tmp/main"
  include_ext = ["go"]
  exclude_dir = ["tmp", "vendor"]
```

**Python with watchdog**:

```python
# run_dev.py
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess

class ChangeHandler(FileSystemEventHandler):
    def on_modified(self, event):
        subprocess.run(["python", "app.py"])

observer = Observer()
observer.schedule(ChangeHandler(), path='.', recursive=True)
observer.start()
```

### Testing Strategy

**Unit Tests** (test queries in isolation):

```python
import pytest
from geode_client import Client

@pytest.fixture
async def client():
    client = Client("localhost:3141")
    async with client.connection() as c:
        yield c

@pytest.mark.asyncio
async def test_create_user(client):
    # Setup
    await c.query("DELETE (u:User {email: 'test@example.com'})")

    # Execute
    await c.query(
        "INSERT (u:User {email: $email, name: $name})",
        {"email": "test@example.com", "name": "Test User"}
    )

    # Verify
    result, _ = await c.query(
        "MATCH (u:User {email: $email}) RETURN u.name",
        {"email": "test@example.com"}
    )
    rows = [row for row in result.rows]
    assert len(rows) == 1
    assert rows[0]['u.name'] == "Test User"
```

**Integration Tests** (test complete workflows):

```python
@pytest.mark.integration
async def test_order_creation_workflow(client):
    # Create test data
    await tx.query(
        "INSERT (u:User {id: 'test_user', name: 'Test'})"
    )
    await tx.query(
        "INSERT (p:Product {id: 'test_prod', price: 99.99})"
    )

    # Execute workflow
    async with client.connection() as tx:
        await tx.begin()
        await tx.execute(
            "INSERT (o:Order {id: 'test_order', total: 99.99})"
        )
        await tx.execute(
            "MATCH (u:User {id: 'test_user'}), (o:Order {id: 'test_order'}) "
            "INSERT (u)-[:PLACED]->(o)"
        )
        await tx.commit()

    # Verify
    result, _ = await tx.query(
        "MATCH (u:User {id: 'test_user'})-[:PLACED]->(o:Order) "
        "RETURN o.id, o.total"
    )
    rows = [row for row in result.rows]
    assert len(rows) == 1
    assert rows[0]['o.total'] == 99.99
```

**Load Tests** (test performance):

```python
import asyncio
from time import time

async def load_test(client, num_queries=1000):
    start = time()

    tasks = [
        client.query("MATCH (p:Person) RETURN p.name LIMIT 1")
        for _ in range(num_queries)
    ]

    results = await asyncio.gather(*tasks)

    duration = time() - start
    qps = num_queries / duration

    print(f"Executed {num_queries} queries in {duration:.2f}s ({qps:.0f} QPS)")
```

## Debugging

### Enable Debug Logging

**Server-side**:

```yaml
# config/dev.yaml
server:
  log_level: "debug"
```

**Client-side** (Python):

```python
import logging

logging.basicConfig(level=logging.DEBUG)

# Client will log all queries
client = Client("localhost:3141")
```

### Profile Queries

```gql
-- Profile query execution
PROFILE
MATCH (p:Person)-[:KNOWS*2..3]->(friend)
WHERE p.city = 'San Francisco'
RETURN friend.name;
```

Analyze output:

- Execution plan
- Operator costs
- Index usage
- Rows processed

### Monitor Server Metrics

```bash
# Check server logs
tail -f /var/log/geode/server.log

# Monitor resource usage
docker stats geode

# Or with native installation
top -p $(pidof geode)
```

### Common Issues

**Connection refused**:

```bash
# Check server is running
ps aux | grep geode

# Check port is open
netstat -an | grep 3141

# Check firewall
sudo ufw status
```

**Slow queries**:

```gql
-- Check for missing indexes
PROFILE
MATCH (p:Person {email: $email}) RETURN p;

-- If no index used, create one
CREATE INDEX person_email ON Person(email);
```

**Out of memory**:

```yaml
# Increase memory limit (config/dev.yaml)
performance:
  max_memory: "4GB"
  query_memory_limit: "512MB"
```

## Sample Application

Here's a complete example - a social network API:

```python
# app.py
from fastapi import FastAPI, HTTPException
from geode_client import Client
from pydantic import BaseModel

app = FastAPI()
client = Client("localhost:3141", pool_size=20)

class User(BaseModel):
    id: str
    name: str
    email: str

class Post(BaseModel):
    id: str
    user_id: str
    content: str

@app.post("/users")
async def create_user(user: User):
    try:
        await client.query(
            "INSERT (u:User {id: $id, name: $name, email: $email})",
            {"id": user.id, "name": user.name, "email": user.email}
        )
        return {"status": "created", "user": user}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users/{user_id}/friends")
async def get_friends(user_id: str):
    result, _ = await client.query(
        "MATCH (u:User {id: $id})-[:FRIENDS_WITH]->(friend:User) "
        "RETURN friend.id, friend.name",
        {"id": user_id}
    )

    friends = [
        {"id": row['friend.id'], "name": row['friend.name']}
        for row in result.rows
    ]
    return {"friends": friends}

@app.get("/users/{user_id}/recommendations")
async def get_friend_recommendations(user_id: str):
    result, _ = await client.query(
        "MATCH (u:User {id: $id})-[:FRIENDS_WITH]->(f1)-[:FRIENDS_WITH]->(f2) "
        "WHERE f2 <> u AND NOT EXISTS { MATCH (u)-[:FRIENDS_WITH]->(f2) } "
        "RETURN f2.id, f2.name, count(f1) AS mutual_friends "
        "ORDER BY mutual_friends DESC "
        "LIMIT 10",
        {"id": user_id}
    )

    recommendations = [
        {
            "id": row['f2.id'],
            "name": row['f2.name'],
            "mutual_friends": row['mutual_friends']
        }
        for row in result.rows
    ]
    return {"recommendations": recommendations}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

Run:

```bash
# Install dependencies
pip install fastapi uvicorn geode-client

# Run application
python app.py
```

Test:

```bash
# Create users
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{"id": "u1", "name": "Alice", "email": "alice@example.com"}'

# Get friend recommendations
curl http://localhost:8000/users/u1/recommendations
```

## Contributing to Geode

### Development Setup

```bash
# Fork and clone
git clone https://gitlab.com/YOUR_USERNAME/geode.git
cd geode

# Build
make build

# Run tests
make test

# Run comprehensive test suite
make geodetestlab-comprehensive
```

### Code Style

Follow existing patterns:

- Zig: Standard Zig formatting (`zig fmt`)
- Go: `gofmt` and `golint`
- Python: `black` and `pylint`
- Rust: `rustfmt` and `clippy`

### Submitting Changes

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "feat: Add new feature"

# Push
git push origin feature/my-feature

# Create merge request on GitLab
```

## Resources

### Documentation

- API Reference: <https://geodedb.com/docs/api/>
- GQL Syntax: <https://geodedb.com/docs/gql/>
- Client Libraries: <https://geodedb.com/docs/clients/>

### Community

- Forum: <https://forum.geodedb.com>
- Chat: <https://discord.gg/geodedb>
- Issue Tracker: <https://gitlab.com/devnw/codepros/geode/issues>

### Examples

- Sample Applications: <https://github.com/geodedb/examples>
- Client Examples: Each client repo includes examples/
- Tutorial Series: <https://geodedb.com/tutorials/>

## Conclusion

This guide provides the foundation for developing applications with Geode. Key takeaways:

1. **Setup**: Docker for quick start, build from source for development
2. **Client Libraries**: Choose Go, Python, Rust, or Zig based on your stack
3. **Testing**: Comprehensive unit, integration, and load tests
4. **Debugging**: Use PROFILE, logs, and metrics to diagnose issues
5. **Best Practices**: Connection pooling, parameterized queries, proper error handling

Explore the documentation for advanced topics, optimization techniques, and deployment strategies. Happy coding!
