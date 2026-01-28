---
title: "Getting Started"
description: "Quick start guide for Geode Graph Database"
weight: 1
tags:
  - tutorial
  - getting-started
  - quickstart
categories:
keywords:
  - Geode getting started
  - graph database quick start
  - install Geode
  - GQL basics
  - setup guide
  - documentation
  - guides
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Getting Started with Geode

This guide will help you get started with Geode in under 5 minutes.

## Installation

### Install by Operating System

{{< tabs >}}
{{< tab "Linux (Debian/Ubuntu)" >}}
```bash
# Add GPG signing key
curl -fsSL https://apt.geodedb.com/geode.gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/geode-archive-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/geode-archive-keyring.gpg] https://apt.geodedb.com stable main" | \
  sudo tee /etc/apt/sources.list.d/geode.list

# Install
sudo apt update
sudo apt install geode
```
{{< /tab >}}
{{< tab "Linux (RHEL/Fedora)" >}}
```bash
curl -L -o geode.rpm https://gitlab.com/devnw/codepros/geode/geode/-/releases/latest/download/geode-linux-x86_64.rpm
sudo rpm -i geode.rpm
```
{{< /tab >}}
{{< tab "Linux (Generic)" >}}
```bash
curl -L -o geode-linux-amd64 https://gitlab.com/devnw/codepros/geode/geode/-/releases/latest/download/geode-linux-amd64
chmod +x geode-linux-amd64
sudo install -m 0755 geode-linux-amd64 /usr/local/bin/geode
```
{{< /tab >}}
{{< tab "macOS" >}}
```bash
# Install via Homebrew (recommended)
brew tap geodedb/geode
brew install geode
```
{{< /tab >}}
{{< tab "Windows (WSL)" >}}
```bash
# PowerShell
wsl --install -d Ubuntu

# Inside Ubuntu (WSL)
# Add GPG signing key
curl -fsSL https://apt.geodedb.com/geode.gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/geode-archive-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/geode-archive-keyring.gpg] https://apt.geodedb.com stable main" | \
  sudo tee /etc/apt/sources.list.d/geode.list

# Install
sudo apt update
sudo apt install geode
```
{{< /tab >}}
{{< /tabs >}}

### Build from Source (Optional)

```bash
# Requires Zig 0.15.1+
git clone https://github.com/codeprosorg/geode
cd geode
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
import (
    "database/sql"

    _ "geodedb.com/geode"
)

db, err := sql.Open("geode", "localhost:3141")
if err != nil {
    log.Fatal(err)
}
defer db.Close()

rows, err := db.Query("MATCH (p:Person) RETURN p.name")
```

### Python

```python
from geode_client import Client

client = Client(host="localhost", port=3141)
async with client.connection() as conn:
    page, _ = await conn.query("MATCH (p:Person) RETURN p.name AS name")
    for row in page.rows:
        print(row["name"].as_string)
```

### Rust

```rust
use geode_client::Client;

let client = Client::new("localhost", 3141);
let mut conn = client.connect().await?;
let (page, _) = conn.query("MATCH (p:Person) RETURN p.name AS name").await?;
```

## Next Steps

- [Installation Guide](/docs/installation/) - Detailed installation options
- [Configuration](/docs/configuration/) - Configure your instance
- [GQL Tutorial](/docs/gql-tutorial/) - Learn the query language
- [Client Libraries](/clients/) - Language-specific guides
