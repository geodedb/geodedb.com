---
title: "Introduction to Geode"
description: "Getting started with Geode graph database. Learn what Geode is, why use a graph database, key features, architecture overview, installation, first queries, and how to get started building graph applications with GQL."
keywords:
  - introduction
  - getting started
  - Geode overview
  - graph database introduction
  - GQL tutorial
  - quick start
  - Geode
  - graph database
  - ISO GQL
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/introduction/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Introduction to Geode

Welcome to Geode, an enterprise-ready graph database that implements the ISO/IEC 39075:2024 Graph Query Language (GQL) standard. This guide introduces you to graph databases, explains why Geode is different, and helps you get started building your first graph applications.

## What is Geode?

Geode is a modern graph database designed for production workloads that require:

- **Standards Compliance**: Full implementation of ISO/IEC 39075:2024 GQL
- **ACID Guarantees**: Complete transaction safety with distributed support
- **Enterprise Features**: Row-level security, audit logging, backup/restore
- **High Performance**: QUIC transport, parallel query execution, efficient storage
- **Polyglot Support**: Client libraries for Go, Python, Rust, Zig, and more

### Key Characteristics

**Production Ready**:
- 97.4% test coverage (1644/1688 tests passing)
- 100% GQL compliance (70/70 ISO tests)
- Active development with rigorous governance

**Modern Architecture**:
- Written in Zig for memory safety and performance
- QUIC + TLS 1.3 for secure, efficient communication
- Native graph storage with index-free adjacency

**Developer Friendly**:
- Standard GQL query language
- Comprehensive client libraries
- Clear documentation and examples
- Active community support

## Why Graph Databases?

Traditional relational databases store data in tables with rows and columns, requiring expensive JOIN operations to connect related data. Graph databases store relationships as first-class citizens, making connected data queries natural and efficient.

### When Relationships Matter

**Social Networks**:
```gql
-- Find friends of friends in 2 hops
MATCH (me:User {name: 'Alice'})-[:FRIEND]->(f1)-[:FRIEND]->(f2)
WHERE f2 <> me AND NOT EXISTS { MATCH (me)-[:FRIEND]->(f2) }
RETURN f2.name AS suggestion
LIMIT 10;
```

In a relational database, this requires multiple self-joins that become slower with each hop. In Geode, traversing relationships is constant-time regardless of depth.

**Recommendation Engines**:
```gql
-- Find products similar users bought
MATCH (me:User {id: $user_id})-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(similar:User)
MATCH (similar)-[:PURCHASED]->(rec:Product)
WHERE NOT EXISTS { MATCH (me)-[:PURCHASED]->(rec) }
RETURN rec.name, count(similar) AS score
ORDER BY score DESC
LIMIT 20;
```

**Fraud Detection**:
```gql
-- Detect circular transaction patterns
MATCH path = (a:Account)-[:TRANSFER*3..5]->(a)
WHERE all(r IN relationships(path) WHERE r.amount > 10000)
  AND all(r IN relationships(path) WHERE r.timestamp >= CURRENT_DATE - DURATION 'P7D')
RETURN path, reduce(sum = 0, r IN relationships(path) | sum + r.amount) AS total;
```

## Why Geode?

### Standards-Based

Geode implements the **ISO/IEC 39075:2024 GQL standard**, the international standard for graph query languages (like SQL is for relational databases).

**Benefits**:
- **No Vendor Lock-In**: Standard language works across compliant databases
- **Future-Proof**: International standards evolve through consensus
- **Familiar Syntax**: If you know SQL or Cypher, GQL will feel natural
- **Interoperability**: Tools and skills transfer across GQL databases

### Full ACID Compliance

Unlike many NoSQL databases, Geode provides complete ACID guarantees:

```gql
BEGIN TRANSACTION;

-- All operations succeed or all fail
INSERT (sender:Account {id: 'a1', balance: 1000});
INSERT (receiver:Account {id: 'a2', balance: 500});

MATCH (s:Account {id: 'a1'}), (r:Account {id: 'a2'})
SET s.balance = s.balance - 100,
    r.balance = r.balance + 100;

INSERT (s)-[:TRANSFERRED {amount: 100, timestamp: CURRENT_TIMESTAMP}]->(r);

COMMIT;
```

### Enterprise Security

**Row-Level Security (RLS)**:
```gql
-- Define access policy
CREATE POLICY user_data_isolation ON User
  USING (id = current_user_id());

-- Automatically enforced on all queries
MATCH (u:User) RETURN u.name;  -- Only returns current user
```

**Audit Logging**:
All data modifications are automatically logged for compliance and forensics.

**TLS 1.3 Encryption**:
All client connections use modern encryption by default.

### High Performance

**QUIC Transport**:
Geode uses QUIC (the protocol behind HTTP/3) for:
- Reduced latency (0-RTT connection resumption)
- Better performance over unreliable networks
- Built-in encryption
- Multiplexed streams

**Parallel Query Execution**:
Complex analytical queries automatically parallelize across CPU cores.

**Native Graph Storage**:
Index-free adjacency means traversing relationships is O(1) regardless of graph size.

## Architecture Overview

### Components

```
┌─────────────┐
│   Client    │  (Go, Python, Rust, Zig)
└──────┬──────┘
       │ QUIC + TLS 1.3
       │ Port 3141
┌──────▼──────────────────────────┐
│     Geode Server                │
│  ┌───────────────────────────┐  │
│  │  Query Engine             │  │
│  │  - Parser (GQL)           │  │
│  │  - Optimizer              │  │
│  │  - Executor               │  │
│  └───────────┬───────────────┘  │
│              │                  │
│  ┌───────────▼───────────────┐  │
│  │  Storage Engine           │  │
│  │  - Native graph storage   │  │
│  │  - Indexes                │  │
│  │  - Transaction log        │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Data Model

Geode implements the **property graph model**:

- **Nodes**: Entities with labels and properties
- **Relationships**: Directed edges with type and properties
- **Properties**: Key-value pairs on nodes and relationships
- **Labels**: Categorize nodes (e.g., Person, Product, Company)

```gql
-- Node with label and properties
(alice:Person {
  id: 'u123',
  name: 'Alice',
  age: 30
})

-- Relationship with type and properties
(alice)-[:KNOWS {since: DATE '2020-01-15', context: 'work'}]->(bob:Person)
```

## Installation and Setup

### Prerequisites

- Linux, macOS, or Windows (WSL)
- 2GB RAM minimum (4GB+ recommended)
- 100MB disk space

### Quick Start with Docker

```bash
# Pull and run Geode
docker pull geodedb/geode:latest
docker run -p 3141:3141 geodedb/geode:latest

# Connect from another terminal
docker exec -it <container_id> geode shell
```

### Build from Source

```bash
# Clone repository
git clone https://github.com/codeprosorg/geode
cd geode

# Build (requires Zig 0.15.1+)
make build

# Run server
geode serve --listen 0.0.0.0:3141

# Connect via shell (in another terminal)
geode shell
```

### Verify Installation

```bash
# Check version
geode --version

# Test connection
geode shell
```

In the shell:
```gql
-- Test query
RETURN 'Hello, Geode!' AS message;
```

## Your First Graph

### 1. Create Nodes

```gql
-- Create people
INSERT (alice:Person {name: 'Alice', age: 30, city: 'San Francisco'});
INSERT (bob:Person {name: 'Bob', age: 28, city: 'New York'});
INSERT (charlie:Person {name: 'Charlie', age: 35, city: 'Austin'});
```

### 2. Create Relationships

```gql
-- Connect people
INSERT (alice:Person {name: 'Alice'})-[:KNOWS {since: DATE '2020-01-15'}]->
       (bob:Person {name: 'Bob'});

INSERT (bob)-[:KNOWS {since: DATE '2021-03-20'}]->
       (charlie:Person {name: 'Charlie'});

INSERT (charlie)-[:KNOWS {since: DATE '2019-11-10'}]->
       (alice);
```

### 3. Query the Graph

**Simple match**:
```gql
-- Find all people
MATCH (p:Person)
RETURN p.name, p.age, p.city;
```

**Traversal**:
```gql
-- Find Alice's friends
MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend)
RETURN friend.name, friend.city;
```

**Multi-hop**:
```gql
-- Find friends of friends
MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend)-[:KNOWS]->(fof)
WHERE fof <> alice
RETURN fof.name AS friend_of_friend;
```

**With filtering**:
```gql
-- Find friends over 30
MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend)
WHERE friend.age > 30
RETURN friend.name, friend.age
ORDER BY friend.age DESC;
```

### 4. Update Data

```gql
-- Update properties
MATCH (p:Person {name: 'Alice'})
SET p.age = 31, p.last_updated = CURRENT_TIMESTAMP;

-- Add relationship
MATCH (alice:Person {name: 'Alice'}), (charlie:Person {name: 'Charlie'})
INSERT (alice)-[:WORKS_WITH {department: 'Engineering'}]->(charlie);
```

### 5. Delete Data

```gql
-- Delete relationship
MATCH (alice:Person {name: 'Alice'})-[r:WORKS_WITH]->(charlie:Person {name: 'Charlie'})
DELETE r;

-- Delete node (must delete relationships first)
MATCH (p:Person {name: 'Charlie'})-[r]-()
DELETE r;

MATCH (p:Person {name: 'Charlie'})
DELETE p;
```

## Core GQL Concepts

### Pattern Matching

GQL uses visual patterns to describe graph structures:

```gql
-- Node pattern
(variable:Label {property: 'value'})

-- Relationship pattern
(a)-[:TYPE {prop: value}]->(b)

-- Variable-length path
(a)-[:TYPE*1..5]->(b)

-- Complete query
MATCH (a:Person)-[:KNOWS*2..3]->(b:Person)
WHERE a.city = 'San Francisco'
RETURN b.name, b.city;
```

### Clauses

**MATCH**: Find patterns in the graph
```gql
MATCH (p:Person {city: 'Austin'})
RETURN p.name;
```

**INSERT**: Create nodes and relationships
```gql
INSERT (p:Person {name: 'Dave', age: 40});
```

**SET**: Update properties
```gql
MATCH (p:Person {name: 'Dave'})
SET p.verified = true;
```

**DELETE**: Remove nodes or relationships
```gql
MATCH (p:Person {name: 'Dave'})
DELETE p;
```

**WHERE**: Filter results
```gql
MATCH (p:Person)
WHERE p.age >= 30 AND p.city = 'San Francisco'
RETURN p.name;
```

**RETURN**: Specify output
```gql
MATCH (p:Person)
RETURN p.name AS name, p.age AS age
ORDER BY age DESC
LIMIT 10;
```

### Aggregations

```gql
-- Count nodes
MATCH (p:Person)
RETURN count(p) AS total_people;

-- Group and aggregate
MATCH (p:Person)
RETURN p.city, count(p) AS people_count, avg(p.age) AS avg_age
GROUP BY p.city
ORDER BY people_count DESC;
```

### Parameters

Use parameters for safe, reusable queries:

```gql
-- Query with parameter
MATCH (p:Person {name: $person_name})
RETURN p.age, p.city;
```

From client libraries:
```go
// Go
result, err := conn.Query("MATCH (p:Person {name: $name}) RETURN p.age",
    map[string]interface{}{"name": "Alice"})
```

```python
# Python
result, _ = await conn.query(
    "MATCH (p:Person {name: $name}) RETURN p.age",
    parameters={"name": "Alice"}
)
```

## Client Libraries

### Go

```bash
go get go.codepros.org/geode
```

```go
package main

import (
    "context"
    "fmt"
    "log"
    "go.codepros.org/geode"
)

func main() {
    conn, err := geode.Connect(context.Background(), "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    result, err := conn.Query(
        "MATCH (p:Person {name: $name}) RETURN p.age, p.city",
        map[string]interface{}{"name": "Alice"},
    )
    if err != nil {
        log.Fatal(err)
    }

    for result.Next() {
        var age int
        var city string
        result.Scan(&age, &city)
        fmt.Printf("Age: %d, City: %s\n", age, city)
    }
}
```

### Python

```bash
pip install geode-client
```

```python
import asyncio
from geode_client import Client

async def main():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        result, _ = await conn.query(
            "MATCH (p:Person {name: $name}) RETURN p.age, p.city",
            parameters={"name": "Alice"}
        )

        for row in result.rows:
            print(f"Age: {row['p.age']}, City: {row['p.city']}")

asyncio.run(main())
```

### Rust

```toml
[dependencies]
geode-client = "0.1"
```

```rust
use geode_client::{Client, Value};
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::from_dsn("localhost:3141")?;
    let mut conn = client.connect().await?;

    let mut params = HashMap::new();
    params.insert("name".to_string(), Value::string("Alice"));
    let (page, _) = conn
        .query_with_params(
            "MATCH (p:Person {name: $name}) RETURN p.age, p.city",
            &params,
        )
        .await?;

    for row in &page.rows {
        let age = row.get("p.age").unwrap().as_int()?;
        let city = row.get("p.city").unwrap().as_string()?;
        println!("Age: {}, City: {}", age, city);
    }

    Ok(())
}
```

## Next Steps

### Learn More

- **GQL Tutorial**: Deep dive into query language features
- **Data Modeling**: Best practices for graph schema design
- **Client SDKs**: Language-specific guides
- **Performance Tuning**: Optimization techniques
- **Security**: RLS policies, authentication, encryption

### Example Applications

- **Social Network**: Friend recommendations, news feed
- **E-commerce**: Product recommendations, fraud detection
- **Knowledge Graph**: Semantic search, relationship discovery
- **Network Analysis**: Infrastructure dependencies, impact analysis

### Resources

- **Documentation**: Complete API reference and guides
- **Examples**: Sample applications and datasets
- **Community**: Forum, Slack, issue tracker
- **Support**: Commercial support options

## Common Patterns

### Application Setup

```gql
-- Create indexes for common queries
CREATE INDEX person_name ON Person(name);
CREATE INDEX person_email ON Person(email);

-- Set up RLS if needed
CREATE POLICY user_isolation ON User
  USING (id = current_user_id());
```

### Batch Loading

```gql
-- Use UNWIND for bulk inserts
UNWIND $users AS user_data
INSERT (u:User {
  id: user_data.id,
  name: user_data.name,
  email: user_data.email
});
```

### Transactions

```gql
BEGIN TRANSACTION;

-- Multiple related operations
INSERT (order:Order {id: 'o123', total: 99.99});
MATCH (user:User {id: 'u456'})
INSERT (user)-[:PLACED]->(order);

COMMIT;
```

## Troubleshooting

### Connection Issues

```bash
# Check server is running
ps aux | grep geode

# Check port is listening
netstat -an | grep 3141

# Test connection
geode shell
```

### Query Performance

```gql
-- Profile slow queries
PROFILE
MATCH (p:Person)-[:KNOWS*2..4]->(friend)
WHERE p.city = 'San Francisco'
RETURN friend.name;

-- Check indexes
SHOW INDEXES;
```

### Common Errors

**"Node not found"**: Use INSERT to create, not MATCH
```gql
-- Wrong
MATCH (p:Person {name: 'Alice'})  -- Error if doesn't exist

-- Right
INSERT (p:Person {name: 'Alice'});
```

**"Relationship requires both nodes"**: Create nodes first
```gql
-- Create nodes
INSERT (alice:Person {name: 'Alice'});
INSERT (bob:Person {name: 'Bob'});

-- Then relationship
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
INSERT (a)-[:KNOWS]->(b);
```

## Conclusion

Geode brings standards-based graph database capabilities with enterprise features, ACID guarantees, and high performance. Whether building social networks, recommendation engines, fraud detection systems, or knowledge graphs, Geode provides the foundation for production-ready graph applications.

Start exploring the documentation below to master GQL queries, graph modeling, client integration, and advanced features. Welcome to the Geode community!
