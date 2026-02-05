---
title: "Category: Getting Started"
description: "Begin your Geode journey with installation guides, quick start tutorials, and foundational concepts for graph database development."
keywords:
  - getting started
  - Geode
  - graph database
  - installation
  - quick start
  - tutorial
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/getting-started/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

The **Getting Started** category provides everything you need to begin working with Geode graph database. From installation and configuration to writing your first queries, these guides help you go from zero to productive in minutes.

## Introduction to Getting Started

Starting with a new database system can be daunting, but Geode makes it straightforward. Whether you're completely new to graph databases or migrating from another system, these getting started guides provide a smooth onboarding experience with clear, actionable steps.

This category covers the fundamentals: installing Geode, understanding core concepts, writing your first queries, and building simple applications. Each guide builds progressively, ensuring you have a solid foundation before moving to advanced topics. All examples are tested and production-ready.

## Quick Start: 5 Minutes to Your First Graph

### Installation

**Using Docker** (fastest method):
```bash
# Pull the latest Geode image
docker pull codepros/geode:latest

# Run Geode server
docker run -p 3141:3141 codepros/geode:latest

# Access the shell
docker exec -it <container_id> geode shell
```

**Building from Source** (requires Zig 0.1.0+):
```bash
# Clone repository
git clone https://github.com/codeprosorg/geode
cd geode

# Build
make build

# Run
./zig-out/bin/geode serve
```

### Your First Query

Open the Geode shell:
```bash
geode shell
```

Create your first graph:
```gql
-- Create nodes
CREATE (alice:Person {name: 'Alice', age: 30});
CREATE (bob:Person {name: 'Bob', age: 35});

-- Create relationship
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
CREATE (a)-[:KNOWS {since: 2020}]->(b);

-- Query the graph
MATCH (p:Person)-[k:KNOWS]->(f:Person)
RETURN p.name, k.since, f.name;
```

**Output**:
```
| p.name | k.since | f.name |
|--------|---------|--------|
| Alice  | 2020    | Bob    |
```

Congratulations! You've created and queried your first graph.

## Understanding Core Concepts

### What is a Graph Database?

A graph database stores data as **nodes** (entities) and **relationships** (connections):

- **Nodes**: Represent entities like people, products, or locations
- **Relationships**: Connect nodes with typed, directed connections
- **Properties**: Key-value pairs stored on both nodes and relationships
- **Labels**: Categories or types for nodes

**Example**:
```gql
-- Node with label and properties
(alice:Person {name: 'Alice', email: 'alice@example.com'})

-- Relationship with type and properties
-[:KNOWS {since: 2020, strength: 'strong'}]->
```

### Graph vs. Relational Databases

**Relational Database** (SQL):
```sql
-- Three tables with foreign keys
SELECT p1.name, p2.name
FROM persons p1
JOIN friendships f ON p1.id = f.person1_id
JOIN persons p2 ON f.person2_id = p2.id;
```

**Graph Database** (GQL):
```gql
-- Natural pattern matching
MATCH (p1:Person)-[:FRIENDS_WITH]->(p2:Person)
RETURN p1.name, p2.name;
```

Graphs excel at:
- **Relationship queries**: Finding connections is natural and fast
- **Variable-depth traversals**: "Friends of friends" queries scale linearly
- **Pattern matching**: Complex patterns expressed simply
- **Schema flexibility**: Evolve your model without migrations

### The Property Graph Model

Geode implements the property graph model defined in ISO/IEC 39075:2024:

```gql
-- Node: (label {properties})
(person:Person {
    name: 'Alice',
    age: 30,
    email: 'alice@example.com'
})

-- Relationship: -[type {properties}]->
-[:WORKS_AT {
    since: 2020,
    position: 'Engineer'
}]->

-- Complete pattern
(alice:Person {name: 'Alice'})
  -[:WORKS_AT {since: 2020, position: 'Engineer'}]->
(acme:Company {name: 'Acme Corp'})
```

## Step-by-Step Tutorial

### Step 1: Set Up Your Environment

**Server Configuration** (`geode.toml`):
```toml
[server]
listen = "0.0.0.0:3141"
max_connections = 1000

[storage]
data_dir = "./data"
wal_dir = "./wal"

[security]
auth_enabled = false  # Disable for local development
```

**Start the server**:
```bash
geode serve --config geode.toml
```

**Verify it's running**:
```bash
# Should return PONG
geode ping
```

### Step 2: Connect with a Client

**Python**:
```python
import asyncio
from geode_client import Client

async def main():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        result, _ = await conn.query("RETURN 'Hello, Geode!' as message")
        for row in result.rows:
            print(row["message"])

asyncio.run(main())
```

**Go**:
```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"

    _ "geodedb.com/geode/driver"
)

func main() {
    db, err := sql.Open("geode", "quic://localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    var message string
    err = db.QueryRowContext(context.Background(),
        "RETURN 'Hello, Geode!' as message").Scan(&message)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println(message)
}
```

### Step 3: Build a Simple Social Network

**Create users**:
```gql
CREATE (alice:User {
    id: 'user1',
    name: 'Alice Anderson',
    email: 'alice@example.com',
    joined: datetime('2024-01-15')
});

CREATE (bob:User {
    id: 'user2',
    name: 'Bob Brown',
    email: 'bob@example.com',
    joined: datetime('2024-02-20')
});

CREATE (charlie:User {
    id: 'user3',
    name: 'Charlie Chen',
    email: 'charlie@example.com',
    joined: datetime('2024-03-10')
});
```

**Create friendships**:
```gql
MATCH (a:User {id: 'user1'}), (b:User {id: 'user2'})
CREATE (a)-[:FRIENDS_WITH {since: datetime('2024-03-01')}]->(b);

MATCH (b:User {id: 'user2'}), (c:User {id: 'user3'})
CREATE (b)-[:FRIENDS_WITH {since: datetime('2024-03-15')}]->(c);
```

**Query friends**:
```gql
MATCH (u:User {id: 'user1'})-[:FRIENDS_WITH]->(friend)
RETURN friend.name, friend.email;
```

**Find friends of friends**:
```gql
MATCH (u:User {id: 'user1'})-[:FRIENDS_WITH*1..2]->(connection)
WHERE connection.id <> 'user1'
RETURN DISTINCT connection.name;
```

### Step 4: Add Posts and Interactions

**Create posts**:
```gql
MATCH (u:User {id: 'user1'})
CREATE (u)-[:POSTED]->(p:Post {
    id: 'post1',
    content: 'Hello from Geode!',
    timestamp: datetime('2024-03-15T10:30:00'),
    likes: 0
});
```

**Like a post**:
```gql
MATCH (u:User {id: 'user2'}), (p:Post {id: 'post1'})
CREATE (u)-[:LIKES {timestamp: datetime()}]->(p)
SET p.likes = p.likes + 1;
```

**Build a news feed**:
```gql
MATCH (u:User {id: 'user2'})-[:FRIENDS_WITH]->(friend)-[:POSTED]->(post)
RETURN friend.name, post.content, post.timestamp, post.likes
ORDER BY post.timestamp DESC
LIMIT 10;
```

### Step 5: Add Indexes for Performance

```gql
-- Unique constraint on email
CREATE CONSTRAINT unique_email ON :User(email);

-- Index on frequently queried fields
CREATE INDEX user_name ON :User(name);
CREATE INDEX post_timestamp ON :Post(timestamp);

-- Verify indexes
SHOW INDEXES;
```

## Essential GQL Patterns

### Creating Data

```gql
-- Single node
CREATE (n:Label {property: 'value'});

-- Multiple nodes
CREATE (n1:Label1), (n2:Label2);

-- Node and relationship in one statement
CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'});

-- Using MERGE for upsert
MERGE (p:Person {email: 'alice@example.com'})
ON CREATE SET p.name = 'Alice', p.created = datetime()
ON MATCH SET p.last_seen = datetime();
```

### Querying Data

```gql
-- Match all nodes with a label
MATCH (p:Person)
RETURN p;

-- Match with properties
MATCH (p:Person {name: 'Alice'})
RETURN p;

-- Match with WHERE clause
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name, p.age;

-- Match relationships
MATCH (p:Person)-[r:KNOWS]->(f:Person)
RETURN p.name, type(r), f.name;

-- Variable-length paths
MATCH (p:Person)-[:KNOWS*1..3]->(connection)
RETURN DISTINCT connection.name;
```

### Updating Data

```gql
-- Set properties
MATCH (p:Person {name: 'Alice'})
SET p.age = 31, p.updated = datetime();

-- Remove properties
MATCH (p:Person {name: 'Alice'})
REMOVE p.age;

-- Add labels
MATCH (p:Person {name: 'Alice'})
SET p:VIP;
```

### Deleting Data

```gql
-- Delete relationships
MATCH (p:Person {name: 'Alice'})-[r:KNOWS]->()
DELETE r;

-- Delete nodes (must delete relationships first)
MATCH (p:Person {name: 'Alice'})
DELETE p;

-- Delete node and all relationships
MATCH (p:Person {name: 'Alice'})
DETACH DELETE p;

-- Delete all data (careful!)
MATCH (n)
DETACH DELETE n;
```

## Working with Parameters

Parameterized queries are safer and more efficient:

**Python**:
```python
result, _ = await client.query("""
    MATCH (p:Person {name: $name})
    RETURN p
""", {"name": "Alice"})
```

**Go**:
```go
rows, err := db.QueryContext(ctx,
    "MATCH (p:Person {name: $1}) RETURN p", "Alice")
```

**In GQL Shell** (less common):
```gql
-- Parameters set via shell command
:param name => 'Alice'
MATCH (p:Person {name: $name}) RETURN p;
```

## Common Beginner Mistakes

### Mistake 1: Not Using Indexes

```gql
-- Slow: Full graph scan
MATCH (p:Person {email: 'alice@example.com'})
RETURN p;

-- Fast: Create index first
CREATE INDEX person_email ON :Person(email);
MATCH (p:Person {email: 'alice@example.com'})
RETURN p;
```

### Mistake 2: Cartesian Products

```gql
-- Bad: Cartesian product (N×M complexity)
MATCH (p:Person), (c:Company)
WHERE p.company_id = c.id
RETURN p.name, c.name;

-- Good: Use relationships
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN p.name, c.name;
```

### Mistake 3: Not Deleting Relationships

```gql
-- Error: Cannot delete node with relationships
MATCH (p:Person {name: 'Alice'})
DELETE p;  -- Fails if Alice has relationships

-- Correct: Delete relationships first
MATCH (p:Person {name: 'Alice'})
DETACH DELETE p;  -- Deletes node and all relationships
```

### Mistake 4: Ignoring Transactions

```python
# Bad: No transaction for multi-step operation
await tx.execute("CREATE (p:Person {id: 'user1'})")
await tx.execute("CREATE (p:Person {id: 'user2'})")
# If second fails, first is still committed

# Good: Use transaction
async with client.connection() as tx:
    await tx.begin()
    await tx.execute("CREATE (p:Person {id: 'user1'})")
    await tx.execute("CREATE (p:Person {id: 'user2'})")
    await tx.commit()  # Both or neither
```

## Next Steps

### Learn More About GQL

- **Pattern Matching**: Advanced query patterns
- **Aggregations**: GROUP BY, COUNT, SUM, AVG
- **Subqueries**: Nested queries and EXISTS
- **Functions**: String, math, datetime, list functions

### Explore Features

- **Indexes**: Unique constraints, composite indexes, vector indexes
- **Transactions**: ACID guarantees, isolation levels
- **Security**: Authentication, authorization, row-level security
- **Full-Text Search**: BM25 ranking and text analysis
- **Vector Search**: Semantic search with embeddings

### Build Applications

- **REST APIs**: Integrate Geode with web frameworks
- **Real-Time Apps**: WebSocket streaming and change data capture
- **Analytics**: Graph algorithms and machine learning
- **Microservices**: Distributed system patterns

## Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/codeprosorg/geode
cd geode

# 2. Build
make build

# 3. Run tests
make test

# 4. Start development server
geode serve --dev

# 5. Open shell in another terminal
geode shell
```

### Configuration for Development

```toml
[server]
listen = "127.0.0.1:3141"
log_level = "debug"

[storage]
data_dir = "./dev-data"
wal_dir = "./dev-wal"

[security]
auth_enabled = false  # Easier for local dev

[development]
auto_reload = true
query_logging = true
```

### Using Docker Compose

```yaml
version: '3.8'
services:
  geode:
    image: codepros/geode:latest
    ports:
      - "3141:3141"
    volumes:
      - ./data:/var/lib/geode/data
      - ./config:/etc/geode
    environment:
      - GEODE_LOG_LEVEL=debug
```

## Troubleshooting Common Issues

### Server Won't Start

**Issue**: "Address already in use"
**Solution**: Check if another process is using port 3141
```bash
lsof -i :3141
kill <pid>  # If found
```

### Connection Refused

**Issue**: Client can't connect to server
**Solution**:
1. Verify server is running: `geode ping`
2. Check firewall allows port 3141
3. Verify connection string matches server address

### Query Returns No Results

**Issue**: Expected data not returned
**Solution**:
1. Verify data exists: `MATCH (n) RETURN count(n);`
2. Check label spelling: Labels are case-sensitive
3. Use EXPLAIN to see execution plan

### Performance Issues

**Issue**: Queries running slowly
**Solution**:
1. Add indexes on frequently queried properties
2. Use EXPLAIN PROFILE to identify bottlenecks
3. Avoid Cartesian products
4. Use specific labels in MATCH patterns

## Resources for Learning

### Official Documentation

- **API Reference**: Complete client library documentation
- **GQL Language Guide**: Comprehensive syntax reference
- **Architecture Docs**: How Geode works internally
- **Examples**: Sample applications and code snippets

### Interactive Learning

- **Geode Shell**: Interactive REPL for experimentation
- **Tutorials**: Step-by-step guided projects
- **Sandbox**: Try Geode online without installation
- **Video Courses**: Visual learning resources

### Community

- **GitHub Discussions**: Ask questions and share experiences
- **Discord Channel**: Real-time chat with other users
- **Stack Overflow**: Tagged questions and answers
- **Blog**: Technical articles and best practices

## Related Topics

- **Examples**: Practical code samples and applications
- **Query Language**: Deep dive into GQL syntax
- **Client Libraries**: Language-specific integration guides
- **Best Practices**: Production deployment recommendations
- **Performance**: Optimization and tuning strategies

## Further Reading

- **Graph Database Fundamentals**: Core concepts and theory
- **GQL vs. Cypher**: Comparing graph query languages
- **Migration Guides**: Moving from other databases
- **Architecture Overview**: Understanding Geode's design
- **Advanced Features**: Vector search, full-text, and more

---

Getting started with Geode is straightforward: install the server, run your first queries, and build from there. The combination of ISO-standard GQL, comprehensive client libraries, and production-ready features makes Geode an excellent choice for graph database applications of any scale.
