---
title: "Quick Start Guide"
description: "Rapid-start guide for Geode graph database - from zero to production-ready in minutes. Covers instant installation, first queries, essential GQL commands, client library setup, common patterns, performance tips, and troubleshooting for Python, Go, Rust, and Zig developers."
keywords:
  - quick start
  - Geode quick guide
  - fast setup
  - 10-minute guide
  - rapid deployment
  - instant start
  - quick installation
  - fast track
  - getting started fast
  - rapid onboarding
  - instant database
  - quick deployment
  - fast graph database
  - immediate start
  - express setup
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/quick-start/"
    noindex: false
    og_type: "article"
    og_image: "https://geodedb.com/images/quick-start-guide.png"
    article:
      published_time: "2025-01-24T10:00:00Z"
      modified_time: "2025-01-24T10:00:00Z"
      section: "Getting Started"
      tags: ["quick-start", "tutorial", "installation", "beginner-guide"]
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Quick Start Guide

Get Geode graph database running and execute your first queries in under 10 minutes. This streamlined guide delivers exactly what you need to move from installation to production-ready queries, with copy-paste examples for Python, Go, Rust, and Zig developers.

## Why Choose Geode? (30 seconds)

Before we dive into installation, understand what makes Geode the right choice for your graph data needs.

**Standards-Based**: Geode implements ISO/IEC 39075:2024 GQL standard, ensuring your queries are portable and future-proof. Learn GQL once, use it across compliant graph databases.

**Production-Ready**: With 97.4% test coverage, 100% GQL compliance, and battle-tested client libraries, Geode handles production workloads from day one. No "beta" disclaimers or experimental warnings.

**High Performance**: QUIC-based transport with TLS 1.3 supports high-throughput workloads with workload-dependent performance. Server baselines are read-only up to 100,000 txn/sec, read-write 10,000-50,000 txn/sec, and write-heavy 5,000-20,000 txn/sec.

**Enterprise Security**: Row-level security, field-level encryption, transparent data encryption, and comprehensive audit logging meet compliance requirements for regulated industries.

**Developer-Friendly**: Natural graph query language, comprehensive documentation, and client libraries in your preferred language make Geode easy to adopt and maintain.

Now let's get you up and running.

## Install Geode (2 minutes)

### Option 1: Build from Source

```bash
git clone https://github.com/codeprosorg/geode
cd geode
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

## Real-World Quick Start Patterns

### Social Network (5 minutes)

Build a basic social network:

```python
async def build_social_network():
    async with GeodeClient("localhost:3141") as client:
        # Create users
        await client.execute("""
            CREATE (alice:User {id: 'u1', name: 'Alice', age: 30})
            CREATE (bob:User {id: 'u2', name: 'Bob', age: 25})
            CREATE (carol:User {id: 'u3', name: 'Carol', age: 28})
            CREATE (dave:User {id: 'u4', name: 'Dave', age: 32})
        """)

        # Create friendships
        await client.execute("""
            MATCH (alice:User {id: 'u1'})
            MATCH (bob:User {id: 'u2'})
            MATCH (carol:User {id: 'u3'})
            MATCH (dave:User {id: 'u4'})
            CREATE (alice)-[:KNOWS {since: '2020-01-15'}]->(bob)
            CREATE (bob)-[:KNOWS {since: '2021-03-20'}]->(carol)
            CREATE (carol)-[:KNOWS {since: '2019-11-10'}]->(dave)
            CREATE (alice)-[:KNOWS {since: '2022-06-05'}]->(dave)
        """)

        # Find friends of friends
        result = await client.execute("""
            MATCH (me:User {id: 'u1'})-[:KNOWS*2]->(fof:User)
            WHERE NOT (me)-[:KNOWS]->(fof)
            RETURN DISTINCT fof.name AS friend_suggestion
        """)

        async for row in result:
            print(f"Suggested friend: {row['friend_suggestion']}")
```

### E-Commerce Recommendations (5 minutes)

```python
async def build_recommendation_engine():
    async with GeodeClient("localhost:3141") as client:
        # Create products and purchases
        await client.execute("""
            CREATE (u1:User {id: 'user1', name: 'Alice'})
            CREATE (u2:User {id: 'user2', name: 'Bob'})
            CREATE (u3:User {id: 'user3', name: 'Carol'})

            CREATE (p1:Product {id: 'prod1', name: 'Laptop', price: 999})
            CREATE (p2:Product {id: 'prod2', name: 'Mouse', price: 29})
            CREATE (p3:Product {id: 'prod3', name: 'Keyboard', price: 79})
            CREATE (p4:Product {id: 'prod4', name: 'Monitor', price: 299})

            CREATE (u1)-[:PURCHASED]->(p1)
            CREATE (u1)-[:PURCHASED]->(p2)
            CREATE (u2)-[:PURCHASED]->(p1)
            CREATE (u2)-[:PURCHASED]->(p3)
            CREATE (u3)-[:PURCHASED]->(p2)
            CREATE (u3)-[:PURCHASED]->(p3)
        """)

        # Get recommendations for Alice
        result = await client.execute("""
            MATCH (me:User {id: 'user1'})-[:PURCHASED]->(p:Product)
                  <-[:PURCHASED]-(other:User)-[:PURCHASED]->(rec:Product)
            WHERE NOT (me)-[:PURCHASED]->(rec)
            RETURN rec.name, rec.price, COUNT(*) as score
            ORDER BY score DESC, rec.price ASC
            LIMIT 3
        """)

        print("Recommended products:")
        async for row in result:
            print(f"  {row['rec.name']} (${row['rec.price']}) - Score: {row['score']}")
```

### Knowledge Graph (5 minutes)

```python
async def build_knowledge_graph():
    async with GeodeClient("localhost:3141") as client:
        # Create concepts and relationships
        await client.execute("""
            CREATE (db:Concept {id: 'c1', name: 'Database'})
            CREATE (graph:Concept {id: 'c2', name: 'Graph Database'})
            CREATE (geode:Concept {id: 'c3', name: 'Geode'})
            CREATE (gql:Concept {id: 'c4', name: 'GQL'})
            CREATE (query:Concept {id: 'c5', name: 'Query Language'})

            CREATE (graph)-[:IS_A]->(db)
            CREATE (geode)-[:IS_A]->(graph)
            CREATE (geode)-[:IMPLEMENTS]->(gql)
            CREATE (gql)-[:IS_A]->(query)
        """)

        # Find all ancestors of Geode
        result = await client.execute("""
            MATCH path = (geode:Concept {id: 'c3'})-[:IS_A*]->(ancestor:Concept)
            RETURN ancestor.name, length(path) as distance
            ORDER BY distance
        """)

        print("Geode is a:")
        async for row in result:
            print(f"  {'  ' * row['distance']}{row['ancestor.name']}")
```

## Performance Tuning Quick Wins

### Create Indexes (1 minute)

Dramatically improve query performance:

```gql
-- Index frequently queried properties
CREATE INDEX ON User(email);
CREATE INDEX ON Product(sku);
CREATE INDEX ON Transaction(timestamp);

-- Verify index usage
PROFILE MATCH (u:User {email: 'alice@example.com'}) RETURN u;
```

Index creation typically improves lookup queries by 10-100x.

### Use Connection Pooling (Already enabled!)

All official Geode clients use connection pooling automatically. No configuration needed for basic usage.

### Batch Operations (2 minutes)

Process multiple operations efficiently:

```python
# Instead of individual inserts
for user in users:
    await client.execute("CREATE (:User {name: $name})", name=user['name'])

# Use batch operations
await client.execute_batch([
    ("CREATE (:User {name: $name})", {"name": user['name']})
    for user in users
])
```

Batching reduces network roundtrips and improves throughput by 5-10x.

## Quick Troubleshooting Guide

**Can't Connect to Server**:
```bash
# Check if server is running
ps aux | grep geode

# Check port
netstat -tulpn | grep 3141

# Test connectivity
telnet localhost 3141
```

**Slow Queries**:
```gql
-- Profile the query to see execution plan
PROFILE MATCH (p:Person) WHERE p.age > 25 RETURN p.name

-- Check if indexes exist
SHOW INDEXES;

-- Create missing indexes
CREATE INDEX ON Person(age);
```

**Memory Issues**:
```bash
# Check Geode memory usage
docker stats geode  # If using Docker

# Or
ps aux | grep geode

# Increase if needed in geode.yaml:
max_memory: 16GB
```

**Authentication Errors**:
```python
# Ensure you're using correct credentials
client = GeodeClient("localhost:3141", username="admin", password="password")

# Or with token
client = GeodeClient("localhost:3141", token="your-api-token")
```

## Production Readiness Checklist (5 minutes)

Before deploying to production, ensure you've covered these basics:

- [ ] **Enable TLS**: Configure certificates for encrypted connections
- [ ] **Set Up Backups**: Schedule automated daily backups
- [ ] **Configure Monitoring**: Set up Prometheus metrics export
- [ ] **Create Indexes**: Index frequently queried properties
- [ ] **Set Resource Limits**: Configure max memory and connections
- [ ] **Enable Audit Logging**: Track all database operations
- [ ] **Test Failover**: Verify backup restore procedures
- [ ] **Document Queries**: Keep a query library for your team
- [ ] **Set Up Alerts**: Configure alerts for high CPU/memory/latency
- [ ] **Load Test**: Verify performance under expected load

## What's Next?

You've successfully installed Geode, executed queries, and learned the fundamentals. Here's your roadmap for continued learning:

**Immediate Next Steps** (Today):
- Read the [Getting Started Guide](/tags/getting-started/) for deeper understanding
- Explore [Example Code](/tags/examples/) in your preferred language
- Try the [Interactive Shell](/tags/shell/) for ad-hoc queries

**This Week**:
- Learn [Transaction Management](/tags/transactions/) for ACID guarantees
- Understand [Security Features](/tags/authentication/) for production deployment
- Practice [Performance Optimization](/tags/performance/) techniques

**This Month**:
- Master [Advanced GQL Patterns](/tags/advanced-queries/) for complex queries
- Implement [Row-Level Security](/tags/row-level-security/) for multi-tenancy
- Set Up [High Availability](/tags/high-availability/) for production resilience

## Quick Reference Card

```gql
-- Create
CREATE (:Label {property: 'value'})
CREATE (:Person {name: 'Alice', age: 30})
CREATE (a)-[:RELATIONSHIP]->(b)

-- Read
MATCH (n:Label) RETURN n
MATCH (a)-[:REL]->(b) RETURN a, b
MATCH (n) WHERE n.property = 'value' RETURN n

-- Update
MATCH (n) SET n.property = 'new_value'
MATCH (n) SET n.prop1 = 'a', n.prop2 = 'b'

-- Delete
MATCH (n) DELETE n  -- Error if has relationships
MATCH (n) DETACH DELETE n  -- Safe, removes relationships

-- Aggregation
MATCH (n:Label) RETURN COUNT(n)
MATCH (n:Person) RETURN AVG(n.age)
MATCH (n) RETURN n.category, COUNT(n) GROUP BY n.category

-- Path Finding
MATCH path = shortestPath((a)-[*]-(b)) RETURN path
MATCH (a)-[:KNOWS*1..3]->(b) RETURN b
```

## Community and Support

**Questions?** The Geode community is here to help:
- **Documentation**: geodedb.com/docs
- **GitHub Issues**: github.com/geodedb/geode/issues
- **Discord Chat**: discord.gg/geode
- **Stack Overflow**: Tag questions with `geode-db`

**Found a Bug?** Report it on GitHub with:
- Geode version (`geode version`)
- Query that caused the issue
- Expected vs actual behavior
- Error messages and logs

You're now ready to build production graph applications with Geode. Happy coding!

## Related Topics

- **[Getting Started](/tags/getting-started/)**: Detailed beginner guide
- **[Tutorials](/tags/tutorials/)**: Step-by-step learning paths
- **[Examples](/tags/examples/)**: Code samples in all languages
- **[Installation](/tags/installation/)**: Complete setup instructions
- **[Developer Guide](/tags/developer-guide/)**: Full API documentation
- **[Client Libraries](/tags/client-library/)**: Language-specific guides
- **[Performance](/tags/performance/)**: Optimization techniques
- **[Security](/tags/security/)**: Production security practices
