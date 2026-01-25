---
title: "Getting Started"
description: "Quick start guide for Geode Graph Database"
weight: 1
tags:
  - tutorial
  - getting-started
  - quickstart
categories:
  - documentation
  - guides
---

# Getting Started with Geode

This guide will help you get started with Geode in under 5 minutes.

## Installation

### Using Nix (Recommended)

```bash
nix run gitlab:devnw/codepros/geode/geode
```

### Download Binary

```bash
# Linux AMD64
wget https://gitlab.com/devnw/codepros/geode/geode/releases/latest/download/geode-linux-amd64
chmod +x geode-linux-amd64
./geode-linux-amd64 --version

# macOS ARM64
wget https://gitlab.com/devnw/codepros/geode/geode/releases/latest/download/geode-darwin-arm64
chmod +x geode-darwin-arm64
./geode-darwin-arm64 --version
```

### Build from Source

```bash
# Requires Zig 0.15.1+
git clone https://gitlab.com/devnw/codepros/geode.git
cd geode/geode
make build
./zig-out/bin/geode --version
```

## Start the Server

```bash
# Default port 3141
./geode serve

# Custom port
./geode serve --listen 0.0.0.0:8443
```

## Interactive Shell

```bash
./geode shell
```

This opens an interactive REPL where you can execute GQL queries:

```gql
-- Create a graph
CREATE GRAPH SocialNetwork;
USE SocialNetwork;

-- Create nodes
CREATE (:Person {name: "Alice", age: 30});
CREATE (:Person {name: "Bob", age: 25});

-- Create relationships
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS]->(b);

-- Query
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN p.name, friend.name;
```

## Using Client Libraries

### Go

```go
import "go.codepros.org/geode"

db, err := sql.Open("geode", "geode://localhost:3141")
if err != nil {
    log.Fatal(err)
}
defer db.Close()

rows, err := db.Query("MATCH (p:Person) RETURN p.name")
```

### Python

```python
from geode_client import GeodeClient

async with GeodeClient("localhost", 3141) as client:
    result = await client.query("MATCH (p:Person) RETURN p.name")
    async for row in result:
        print(row["p.name"])
```

### Rust

```rust
use geode_client::Client;

let client = Client::connect("localhost:3141").await?;
let result = client.query("MATCH (p:Person) RETURN p.name").await?;
```

## Next Steps

- [Installation Guide](/docs/installation/) - Detailed installation options
- [Configuration](/docs/configuration/) - Configure your instance
- [GQL Tutorial](/docs/gql-tutorial/) - Learn the query language
- [Client Libraries](/clients/) - Language-specific guides
