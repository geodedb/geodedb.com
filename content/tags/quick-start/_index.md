---
title: "Quick Start Guide"
description: "Quick start guide for Geode graph database. Get up and running in 10 minutes with installation, first queries, and basic GQL commands."
keywords:
  - quick start
  - Geode quick guide
  - fast setup
  - 10-minute guide
  - rapid deployment
  - instant start
  - quick installation
  - fast track
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/quick-start/"
    noindex: false
---

# Quick Start Guide

Get Geode graph database running in 10 minutes. This condensed guide covers installation, first queries, and essential commands to start building graph applications immediately.

## Install Geode (2 minutes)

### Option 1: Build from Source

```bash
git clone https://gitlab.com/devnw/codepros/geode.git
cd geode/geode
make build
./zig-out/bin/geode serve --listen 0.0.0.0:3141
```

### Option 2: Docker

```bash
docker run -p 3141:3141 geodedb/geode:latest
```

Server is now running on port 3141.

## Install Client Library (1 minute)

Choose your language:

```bash
# Python
pip install geode-client

# Go
go get go.codepros.org/geode

# Rust
cargo add geode-client

# Zig (use vendored client in repo)
```

## First Queries (5 minutes)

### Python Quick Start

```python
import asyncio
from geode_client import GeodeClient

async def main():
    async with GeodeClient("localhost:3141") as client:
        # Create nodes
        await client.execute("""
            CREATE (alice:Person {name: 'Alice', age: 30})
            CREATE (bob:Person {name: 'Bob', age: 25})
            CREATE (alice)-[:KNOWS]->(bob)
        """)

        # Query
        result = await client.execute("""
            MATCH (a:Person)-[:KNOWS]->(b:Person)
            RETURN a.name, b.name
        """)

        async for row in result:
            print(f"{row['a.name']} knows {row['b.name']}")

asyncio.run(main())
```

### Go Quick Start

```go
package main

import (
    "database/sql"
    "fmt"
    _ "go.codepros.org/geode"
)

func main() {
    db, _ := sql.Open("geode", "geode://localhost:3141")
    defer db.Close()

    // Create
    db.Exec(`CREATE (p:Person {name: $name})`, sql.Named("name", "Alice"))

    // Query
    rows, _ := db.Query("MATCH (p:Person) RETURN p.name")
    defer rows.Close()

    for rows.Next() {
        var name string
        rows.Scan(&name)
        fmt.Println(name)
    }
}
```

### Rust Quick Start

```rust
use geode_client::{Client, params};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::connect("localhost:3141").await?;

    client.execute(
        "CREATE (p:Person {name: $name})",
        params! { "name" => "Alice" }
    ).await?;

    let mut results = client.execute(
        "MATCH (p:Person) RETURN p.name",
        params! {}
    ).stream().await?;

    while let Some(row) = results.next().await {
        println!("{}", row.get::<String>("p.name")?);
    }

    Ok(())
}
```

## Essential GQL Commands

### Create

```gql
-- Create single node
CREATE (p:Person {name: 'Alice', age: 30})

-- Create with relationship
CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})
```

### Read

```gql
-- Match all
MATCH (p:Person) RETURN p

-- Match with filter
MATCH (p:Person) WHERE p.age > 25 RETURN p.name

-- Match relationships
MATCH (a:Person)-[:KNOWS]->(b:Person) RETURN a.name, b.name
```

### Update

```gql
-- Set properties
MATCH (p:Person {name: 'Alice'})
SET p.age = 31, p.city = 'NYC'
```

### Delete

```gql
-- Delete node and relationships
MATCH (p:Person {name: 'Alice'})
DETACH DELETE p
```

## Common Patterns

### Friends of Friends

```gql
MATCH (me:Person {name: 'Alice'})-[:KNOWS*2]->(friend)
WHERE NOT (me)-[:KNOWS]->(friend)
RETURN DISTINCT friend.name
```

### Recommendations

```gql
MATCH (me:User)-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(other)-[:PURCHASED]->(rec)
WHERE NOT (me)-[:PURCHASED]->(rec)
RETURN rec.name, COUNT(*) as score
ORDER BY score DESC
LIMIT 5
```

### Shortest Path

```gql
MATCH path = shortestPath((a:Person {name: 'Alice'})
                          -[:KNOWS*]-(b:Person {name: 'Zoe'}))
RETURN length(path)
```

## Using Transactions

```python
async with client.transaction() as tx:
    await tx.execute("CREATE (p:Person {name: 'Alice'})")
    await tx.execute("CREATE (p:Person {name: 'Bob'})")
    # Both commit together or both roll back
```

## Next Steps (2 minutes)

**Interactive Shell**: Test queries instantly
```bash
./zig-out/bin/geode shell
```

**Profile Queries**: Understand performance
```gql
PROFILE MATCH (p:Person) RETURN p
```

**Create Index**: Speed up queries
```gql
CREATE INDEX ON Person(name)
```

**Use Transactions**: Ensure consistency
```python
async with client.transaction() as tx:
    # multiple operations
```

## Key Concepts

**Nodes**: Entities (Person, Product, Location)
**Relationships**: Connections (KNOWS, PURCHASED, LOCATED_IN)
**Properties**: Attributes ({name: 'Alice', age: 30})
**Labels**: Node categories (Person, User, Admin)
**Patterns**: Query structures (a)-[:KNOWS]->(b)

## Common Gotchas

1. **Always parameterize queries** to prevent injection
   ```python
   # Bad: query = f"MATCH (p {{name: '{name}'}})"
   # Good: query = "MATCH (p {name: $name})", name=name
   ```

2. **DETACH DELETE removes relationships** automatically
   ```gql
   DETACH DELETE p  -- Safe, removes relationships too
   DELETE p         -- Error if p has relationships
   ```

3. **Relationship direction matters** in creation, flexible in queries
   ```gql
   CREATE (a)-[:KNOWS]->(b)  -- Directed
   MATCH (a)-[:KNOWS]-(b)    -- Query either direction
   ```

4. **Variable-length paths need bounds**
   ```gql
   -[:KNOWS*1..5]->  -- Good: bounded
   -[:KNOWS*]->      -- Risky: unbounded
   ```

## Help Resources

**Documentation**: Full guides and API reference at geodedb.com
**Examples**: Working code in /examples directory
**Community**: Questions and discussions on GitHub
**Interactive Shell**: Built-in help with `help` command

## Performance Tips

- Create indexes for frequently queried properties
- Use PROFILE to understand query execution
- Keep transactions short and focused
- Use connection pooling (automatic in clients)
- Parameterize queries for prepared statement caching

## Production Checklist

- [ ] Enable TLS certificates for encryption
- [ ] Configure connection pool sizes
- [ ] Set up monitoring and alerts
- [ ] Implement backup strategy
- [ ] Create indexes for common queries
- [ ] Test transaction retry logic
- [ ] Configure row-level security policies
- [ ] Set up health check endpoints

You now have Geode running and know the essential commands. Explore tutorials for deeper learning or jump into building your application.

## Related Topics

- **Getting Started**: Detailed beginner guide
- **Tutorials**: Step-by-step learning paths
- **Examples**: Code samples in all languages
- **Installation**: Complete setup instructions
- **Developer Guide**: Full API documentation
