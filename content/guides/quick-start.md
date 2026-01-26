---
title: "Quick Start Guide"
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
  geode:latest
```

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  geode:
    image: geode:latest
    ports:
      - "3141:3141"
    volumes:
      - geode-data:/var/lib/geode
    environment:
      - GEODE_LOG_LEVEL=info

volumes:
  geode-data:
```

Start:

```bash
docker-compose up -d
```

### From Source

```bash
git clone https://github.com/codeprosorg/geode
cd geode
make build
./bin/geode server
```

## Step 2: Install Client

Choose your preferred language:

### Go

```bash
go get go.codepros.org/geode
```

### Python

```bash
pip install geode-client
```

### Rust

```bash
cargo add geode-client
```

### CLI Tool

```bash
# Build from source
git clone https://github.com/codeprosorg/geode
cd geode
make build
sudo cp ./zig-out/bin/geode /usr/local/bin/geode
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

Let's create a simple social network:

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

### Using CLI

```bash
geode exec -h localhost:3141 -q "CREATE (:Person {name: 'Alice', age: 30})"
```

### Using Go

```go
package main

import (
    "database/sql"
    "log"
    _ "go.codepros.org/geode"
)

func main() {
    db, err := sql.Open("geode", "geode://localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    _, err = db.Exec(`
        CREATE (:Person {name: $1, age: $2})
    `, "Alice", 30)
    if err != nil {
        log.Fatal(err)
    }

    log.Println("Person created!")
}
```

### Using Python

```python
import asyncio
from geode_client import GeodeClient

async def main():
    async with GeodeClient("localhost", 3141) as client:
        await client.query(
            "CREATE (:Person {name: $name, age: $age})",
            params={"name": "Alice", "age": 30}
        )
        print("Person created!")

asyncio.run(main())
```

## Step 5: Query Your Data

### Find All People

```gql
MATCH (p:Person)
RETURN p.name, p.age, p.city
ORDER BY p.age
```

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
4. **Build an Application**: See [Example Applications](/docs/examples/)
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
- [Example Queries](/docs/examples/)
- [Community Forum](https://forum.geodedb.com)

## Get Help

- [Documentation](https://docs.geodedb.com)
- [GitLab Issues](https://gitlab.com/devnw/codepros/geode/geode/-/issues)
- [Community Chat](https://chat.geodedb.com)
- [Email Support](mailto:support@geodedb.com)
