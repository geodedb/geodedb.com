---
title: "Getting Started"
weight: 3
---

## Quick Start

Get up and running with Geode in minutes:

### Installation

```bash
# Build from source (requires Zig 0.15.1+)
git clone https://gitlab.com/devnw/codepros/geode.git
cd geode/geode
make build

# Start the server
./zig-out/bin/geode serve
```

### First Query

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

[Full Getting Started Guide →](/docs/getting-started/)
