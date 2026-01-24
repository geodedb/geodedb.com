---
title: "Getting Started with Geode"
description: "Get started with Geode graph database quickly. Installation guides, first queries, basic concepts, and initial setup for Python, Go, Rust, and Zig clients."
keywords:
  - getting started
  - Geode installation
  - first steps
  - quick setup
  - beginner guide
  - initial configuration
  - database setup
  - first query
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/getting-started/"
    noindex: false
---

# Getting Started with Geode

Welcome to Geode, an enterprise-ready graph database implementing the ISO/IEC 39075:2024 GQL standard. This guide helps you install Geode, execute your first queries, and understand fundamental graph database concepts within 30 minutes.

## What is Geode?

Geode is a production-ready graph database that stores data as nodes (entities) and relationships (connections) rather than tables and rows. This natural representation of connected data makes Geode ideal for social networks, recommendation engines, knowledge graphs, fraud detection, and any domain where relationships are as important as the entities themselves.

### Why Choose Geode?

**Standards-Based**: Geode implements the ISO/IEC 39075:2024 Graph Query Language (GQL) standard, ensuring your queries remain portable and future-proof as the graph ecosystem evolves.

**Production-Ready**: With 97.4% test coverage, 100% GQL compliance, and comprehensive client libraries in Python, Go, Rust, and Zig, Geode is battle-tested for demanding production workloads.

**Performance**: QUIC-based transport with TLS 1.3 encryption delivers high throughput—1,000+ queries/second in Python, 10,000+ in Rust—while maintaining security.

**ACID Transactions**: Full transactional consistency ensures your data integrity is never compromised, with support for savepoints and isolated concurrent access.

**Row-Level Security**: Fine-grained access control at the database level eliminates complex application-layer authorization logic, simplifying multi-tenant architectures.

## Installation

### Prerequisites

- **Zig 0.15.1+** (for server compilation)
- **Git** (for cloning the repository)
- **Linux, macOS, or Windows** (with WSL2 for Windows users)

### Quick Installation

```bash
# Clone the repository
git clone https://gitlab.com/devnw/codepros/geode.git
cd geode/geode

# Build the server (debug mode)
make build

# Or build optimized release version
make release

# Start the server
./zig-out/bin/geode serve --listen 0.0.0.0:3141
```

The server is now running on port 3141, ready to accept connections.

### Docker Installation

For containerized deployments:

```bash
# Pull the official image
docker pull geodedb/geode:latest

# Run the server
docker run -p 3141:3141 -v geode-data:/data geodedb/geode:latest

# With persistent storage
docker run -d \
  --name geode \
  -p 3141:3141 \
  -v $(pwd)/data:/data \
  geodedb/geode:latest serve
```

### Verifying Installation

Check that Geode is running:

```bash
# Using the built-in shell
./zig-out/bin/geode shell

# Should display:
# Geode Shell v0.18.0
# Connected to localhost:3141
# Type 'help' for available commands
```

## Your First Graph

Let's create a simple social network to understand graph fundamentals.

### Connecting with Python

Install the Python client:

```bash
pip install geode-client
```

Create your first nodes and relationships:

```python
import asyncio
from geode_client import GeodeClient

async def first_graph():
    # Connect to Geode
    async with GeodeClient("localhost:3141") as client:
        # Create people
        await client.execute("""
            CREATE (alice:Person {name: 'Alice', age: 30})
            CREATE (bob:Person {name: 'Bob', age: 25})
            CREATE (carol:Person {name: 'Carol', age: 28})
        """)

        # Create friendships
        await client.execute("""
            MATCH (alice:Person {name: 'Alice'})
            MATCH (bob:Person {name: 'Bob'})
            MATCH (carol:Person {name: 'Carol'})
            CREATE (alice)-[:KNOWS {since: 2020}]->(bob)
            CREATE (bob)-[:KNOWS {since: 2021}]->(carol)
        """)

        # Query: Find Alice's friends
        result = await client.execute("""
            MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend)
            RETURN friend.name, friend.age
        """)

        async for row in result:
            print(f"Alice knows {row['friend.name']}, age {row['friend.age']}")

asyncio.run(first_graph())
```

### Connecting with Go

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    _ "go.codepros.org/geode"
)

func main() {
    db, err := sql.Open("geode", "geode://localhost:3141")
    if err != nil {
        panic(err)
    }
    defer db.Close()

    // Create a person
    _, err = db.Exec(`
        CREATE (p:Person {name: $name, age: $age})
    `, sql.Named("name", "Alice"), sql.Named("age", 30))

    // Query people
    rows, err := db.Query("MATCH (p:Person) RETURN p.name, p.age")
    defer rows.Close()

    for rows.Next() {
        var name string
        var age int
        rows.Scan(&name, &age)
        fmt.Printf("%s is %d years old\n", name, age)
    }
}
```

### Connecting with Rust

```rust
use geode_client::{Client, params};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to Geode
    let client = Client::connect("localhost:3141").await?;

    // Create a node
    client.execute(
        "CREATE (p:Person {name: $name, age: $age})",
        params! {
            "name" => "Alice",
            "age" => 30
        }
    ).await?;

    // Query nodes
    let mut results = client.execute(
        "MATCH (p:Person) RETURN p.name, p.age",
        params! {}
    ).stream().await?;

    while let Some(row) = results.next().await {
        let name: String = row.get("p.name")?;
        let age: i64 = row.get("p.age")?;
        println!("{} is {} years old", name, age);
    }

    Ok(())
}
```

## Understanding Graph Concepts

### Nodes

Nodes represent entities—people, products, locations, events. Each node can have:

- **Labels**: Categories like `Person`, `Product`, `Location`
- **Properties**: Attributes like `{name: 'Alice', age: 30}`
- **Unique ID**: Automatically assigned by Geode

```gql
CREATE (alice:Person {name: 'Alice', email: 'alice@example.com'})
```

### Relationships

Relationships connect nodes and can have:

- **Type**: Describes the connection like `KNOWS`, `PURCHASED`, `LOCATED_IN`
- **Direction**: From source to target (though queries can traverse either way)
- **Properties**: Metadata like `{since: 2020, strength: 0.9}`

```gql
MATCH (alice:Person {name: 'Alice'})
MATCH (bob:Person {name: 'Bob'})
CREATE (alice)-[:KNOWS {since: 2020}]->(bob)
```

### Patterns

GQL queries express graph patterns declaratively. The database finds all matches:

```gql
-- Find friends of friends
MATCH (me:Person {name: 'Alice'})-[:KNOWS]->(friend)-[:KNOWS]->(fof)
RETURN DISTINCT fof.name

-- Variable-length paths (1 to 3 hops)
MATCH (me:Person {name: 'Alice'})-[:KNOWS*1..3]->(connected)
RETURN connected.name
```

## Basic Operations

### Creating Data

```gql
-- Create a single node
CREATE (p:Product {id: 'prod123', name: 'Widget', price: 29.99})

-- Create multiple nodes
CREATE (u:User {id: 'user1', name: 'Alice'})
CREATE (u2:User {id: 'user2', name: 'Bob'})

-- Create nodes with relationship
CREATE (alice:User {name: 'Alice'})
       -[:PURCHASED {at: '2025-01-24T10:00:00Z'}]->
       (widget:Product {name: 'Widget', price: 29.99})
```

### Reading Data

```gql
-- Find all products
MATCH (p:Product)
RETURN p.name, p.price

-- Find with conditions
MATCH (p:Product)
WHERE p.price < 50.00
RETURN p.name, p.price
ORDER BY p.price DESC

-- Pattern matching with relationships
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name, p.name
```

### Updating Data

```gql
-- Update properties
MATCH (u:User {id: 'user123'})
SET u.last_login = '2025-01-24T15:30:00Z'

-- Add new properties
MATCH (p:Product {id: 'prod123'})
SET p.discount = 0.15, p.on_sale = true
```

### Deleting Data

```gql
-- Delete a node (must have no relationships)
MATCH (u:User {id: 'user123'})
DELETE u

-- Delete node and its relationships
MATCH (u:User {id: 'user123'})
DETACH DELETE u

-- Delete specific relationships
MATCH (u:User)-[r:PURCHASED]->(p:Product {id: 'prod123'})
DELETE r
```

## Using Transactions

Group operations for consistency:

```python
# Python: Atomic multi-step operation
async with client.transaction() as tx:
    # Create order
    await tx.execute("""
        CREATE (o:Order {id: $order_id, total: $total})
    """, order_id="order123", total=59.98)

    # Link to user
    await tx.execute("""
        MATCH (u:User {id: $user_id})
        MATCH (o:Order {id: $order_id})
        CREATE (u)-[:PLACED]->(o)
    """, user_id="user123", order_id="order123")

    # Both operations commit or both roll back
```

## Common Beginner Patterns

### Social Network Query

```gql
-- Find mutual friends
MATCH (me:Person {name: 'Alice'})-[:KNOWS]->(friend)
      -[:KNOWS]->(other:Person)
WHERE (me)-[:KNOWS]->(other)
RETURN friend.name, other.name
```

### Recommendation Query

```gql
-- Recommend products based on similar purchases
MATCH (me:User {id: 'user123'})-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(other:User)-[:PURCHASED]->(rec:Product)
WHERE NOT EXISTS {
    MATCH (me)-[:PURCHASED]->(rec)
}
RETURN rec.name, COUNT(*) as recommendations
ORDER BY recommendations DESC
LIMIT 5
```

### Path Finding

```gql
-- Find shortest path between two people
MATCH path = shortestPath(
    (a:Person {name: 'Alice'})-[:KNOWS*]-(b:Person {name: 'Zoe'})
)
RETURN length(path) as degrees, [n IN nodes(path) | n.name] as path
```

## Next Steps

Now that you've installed Geode and created your first graph, explore:

**Tutorials**: Step-by-step guides for specific features like transactions, security policies, and performance optimization.

**Examples**: Copy-paste ready code snippets for common operations across all supported languages.

**Developer Guide**: Complete API reference, query syntax documentation, and architectural patterns.

**Client Documentation**: Language-specific integration guides for Python, Go, Rust, and Zig.

## Common Beginner Questions

**Q: How do I choose between nodes and relationships?**
A: Entities become nodes (users, products). Connections become relationships (purchased, knows). If it has independent existence, it's probably a node.

**Q: Should I create indexes?**
A: Yes, for properties you frequently filter on. Start without indexes, profile queries, then add indexes where needed.

**Q: How do transactions affect performance?**
A: Transactions add slight overhead but ensure consistency. Keep them short and focused for best performance.

**Q: Can I query in both directions?**
A: Yes! Relationships have direction but queries can traverse either way. Use `-[:KNOWS]-` for undirected matching.

## Related Topics

- **Quick Start**: Condensed getting started guide
- **Tutorials**: In-depth learning paths
- **Examples**: Working code samples
- **Installation**: Detailed setup instructions
- **Client Libraries**: Language-specific integration guides
