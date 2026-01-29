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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Getting Started with Geode

Welcome to Geode, an enterprise-ready graph database implementing the ISO/IEC 39075:2024 GQL standard. This guide helps you install Geode, execute your first queries, and understand fundamental graph database concepts within 30 minutes.

## What is Geode?

Geode is a production-ready graph database that stores data as nodes (entities) and relationships (connections) rather than tables and rows. This natural representation of connected data makes Geode ideal for social networks, recommendation engines, knowledge graphs, fraud detection, and any domain where relationships are as important as the entities themselves.

### Why Choose Geode?

**Standards-Based**: Geode implements the ISO/IEC 39075:2024 Graph Query Language (GQL) standard, ensuring your queries remain portable and future-proof as the graph ecosystem evolves.

**Production-Ready**: With 97.4% test coverage, 100% GQL compliance, and comprehensive client libraries in Python, Go, Rust, and Zig, Geode is battle-tested for demanding production workloads.

**Modern Architecture**: QUIC-based transport with TLS 1.3 encryption, memory-mapped I/O, and six specialized index types.

**ACID Transactions**: Full transactional consistency ensures your data integrity is never compromised, with support for savepoints and isolated concurrent access.

**Row-Level Security**: Fine-grained access control at the database level eliminates complex application-layer authorization logic, simplifying multi-tenant architectures.

## Installation

### Prerequisites

- **Zig 0.1.0+** (for server compilation)
- **Git** (for cloning the repository)
- **Linux, macOS, or Windows** (with WSL2 for Windows users)

### Quick Installation

```bash
# Clone the repository
git clone https://github.com/codeprosorg/geode
cd geode

# Build the server (debug mode)
make build

# Or build optimized release version
make release

# Start the server
geode serve --listen 0.0.0.0:3141
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
geode shell

# Should display:
# Geode Shell v0.1.3
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
from geode_client import Client

async def first_graph():
    # Connect to Geode
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Create people
        await conn.execute("""
            CREATE (alice:Person {name: 'Alice', age: 30})
            CREATE (bob:Person {name: 'Bob', age: 25})
            CREATE (carol:Person {name: 'Carol', age: 28})
        """)

        # Create friendships
        await conn.execute("""
            MATCH (alice:Person {name: 'Alice'})
            MATCH (bob:Person {name: 'Bob'})
            MATCH (carol:Person {name: 'Carol'})
            CREATE (alice)-[:KNOWS {since: 2020}]->(bob)
            CREATE (bob)-[:KNOWS {since: 2021}]->(carol)
        """)

        # Query: Find Alice's friends
        result, _ = await conn.query("""
            MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend)
            RETURN friend.name, friend.age
        """)

        for row in result.rows:
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
    _ "geodedb.com/geode"
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
use geode_client::{Client, Result, Value};
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<()> {
    // Connect to Geode
    let client = Client::new("localhost", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    // Create a node
    let mut params = HashMap::new();
    params.insert("name".to_string(), Value::string("Alice"));
    params.insert("age".to_string(), Value::int(30));
    conn.query_with_params(
        "CREATE (p:Person {name: $name, age: $age})",
        &params,
    ).await?;

    // Query nodes
    let (page, _) = conn.query("MATCH (p:Person) RETURN p.name AS name, p.age AS age").await?;
    for row in &page.rows {
        let name = row.get("name").unwrap().as_string()?;
        let age = row.get("age").unwrap().as_int()?;
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
async with client.connection() as conn:
    await conn.begin()
    try:
        # Create order
        await conn.execute(
            """
            CREATE (o:Order {id: $order_id, total: $total})
            """,
            {"order_id": "order123", "total": 59.98},
        )

        # Link to user
        await conn.execute(
            """
            MATCH (u:User {id: $user_id})
            MATCH (o:Order {id: $order_id})
            CREATE (u)-[:PLACED]->(o)
            """,
            {"user_id": "user123", "order_id": "order123"},
        )

        await conn.commit()
    except Exception:
        await conn.rollback()
        raise
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

## Advanced Getting Started Topics

### Working with Indexes for Performance

Indexes dramatically improve query performance by enabling fast lookups instead of full scans:

```gql
-- Create single-property index
CREATE INDEX ON Person(email);

-- Create composite index
CREATE INDEX ON Transaction(user_id, timestamp);

-- Create unique constraint (automatically creates index)
CREATE UNIQUE CONSTRAINT ON Person(ssn);

-- View existing indexes
SHOW INDEXES;

-- Query using index
PROFILE MATCH (p:Person {email: 'alice@example.com'}) RETURN p;
```

Without indexes, `MATCH (p:Person {email: 'alice@example.com'})` scans every Person node. With an index, Geode jumps directly to matching nodes—significantly faster for large datasets.

### Transaction Patterns for Data Consistency

Transactions ensure atomic, consistent operations:

```python
# Python transaction example
async def transfer_funds(from_account, to_account, amount):
    async with client.connection() as conn:
        await conn.begin()
        try:
            # Read balances
            result, _ = await conn.query(
                """
                MATCH (from:Account {id: $from_id})
                MATCH (to:Account {id: $to_id})
                RETURN from.balance AS from_balance, to.balance AS to_balance
                """,
                {"from_id": from_account, "to_id": to_account},
            )

            row = result.rows[0] if result.rows else None

            if row and row["from_balance"].as_int < amount:
                raise ValueError("Insufficient funds")

            # Update balances atomically
            await conn.execute(
                """
                MATCH (from:Account {id: $from_id})
                SET from.balance = from.balance - $amount
                """,
                {"from_id": from_account, "amount": amount},
            )

            await conn.execute(
                """
                MATCH (to:Account {id: $to_id})
                SET to.balance = to.balance + $amount
                """,
                {"to_id": to_account, "amount": amount},
            )

            await conn.commit()
        except Exception:
            await conn.rollback()
            raise
```

Transactions prevent race conditions, partial updates, and data inconsistencies.

### Connection Pool Configuration

Pooling is explicit in Python and Rust, built into `database/sql` for Go, and enabled by default in Node.js. Tune pools for your workload:

```python
# Python - explicit pool configuration
client = Client(
    "localhost:3141",
    pool_size=50,  # Maximum concurrent connections
    pool_timeout=30,  # Seconds to wait for available connection
    max_overflow=10,  # Allow temporary connections beyond pool_size
    pool_recycle=3600  # Recycle connections after 1 hour
)
```

```go
// Go - database/sql automatically pools
db, err := sql.Open("geode", "geode://localhost:3141")
db.SetMaxOpenConns(50)
db.SetMaxIdleConns(10)
```

```rust
// Rust - configure pool size
use geode_client::ConnectionPool;

let pool = ConnectionPool::new("localhost", 3141, 50);
```

Proper pool configuration prevents connection exhaustion and improves throughput.

### Error Handling Patterns

Handle Geode errors gracefully:

```python
from geode_client import QueryError

async def safe_insert(client, data):
    max_retries = 3
    for attempt in range(max_retries):
        async with client.connection() as conn:
            try:
                await conn.execute(
                    "CREATE (:User {id: $id, email: $email})",
                    data,
                )
                return True
            except QueryError as exc:
                # Constraint violation - don't retry
                if "CONSTRAINT" in str(exc):
                    logger.error(f"Duplicate user: {exc}")
                    return False
                # Retryable failures
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    continue
                raise
```

Appropriate error handling makes your application resilient to transient failures.

### Monitoring Query Performance

Profile queries to understand execution:

```gql
-- Profile shows execution plan and timing
PROFILE
MATCH (p:Person)-[:KNOWS*2..3]->(friend)
WHERE p.age > 25
RETURN friend.name, COUNT(*) as mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10;
```

Output shows:
- Execution steps (scans, lookups, filters, sorts)
- Rows processed at each step
- Time spent in each operation
- Index usage

Use profiling to identify slow operations and add appropriate indexes.

### Data Modeling Best Practices

Effective graph modeling makes queries natural and efficient:

**Favor Relationships Over Properties**: Instead of storing related IDs as properties, use relationships:

```gql
-- Bad: Store related IDs as properties
CREATE (:Order {id: 'o1', user_id: 'u1', product_ids: ['p1', 'p2', 'p3']})

-- Good: Use relationships
CREATE (user:User {id: 'u1'})
CREATE (order:Order {id: 'o1'})
CREATE (p1:Product {id: 'p1'})
CREATE (p2:Product {id: 'p2'})
CREATE (p3:Product {id: 'p3'})
CREATE (user)-[:PLACED]->(order)
CREATE (order)-[:CONTAINS]->(p1)
CREATE (order)-[:CONTAINS]->(p2)
CREATE (order)-[:CONTAINS]->(p3)
```

Relationships make queries simpler and enable graph traversal.

**Use Appropriate Labels**: Labels categorize nodes for efficient filtering:

```gql
-- Good: Specific labels
CREATE (:Admin {name: 'Alice'})
CREATE (:Customer {name: 'Bob'})

-- Better: Multiple labels for inheritance
CREATE (:User:Admin {name: 'Alice'})
CREATE (:User:Customer {name: 'Bob'})

-- Query specific type
MATCH (admin:Admin) RETURN admin.name

-- Query all users
MATCH (user:User) RETURN user.name
```

**Model Time-Series Data Appropriately**: For timestamped events, consider bucketing:

```gql
-- Create time buckets
CREATE (:TimeBucket {date: '2026-01-24'})
       -[:CONTAINS]->(:Event {timestamp: '2026-01-24T10:30:00Z'})

-- Query recent events efficiently
MATCH (bucket:TimeBucket)-[:CONTAINS]->(event:Event)
WHERE bucket.date >= '2026-01-20'
  AND event.timestamp > '2026-01-23T00:00:00Z'
RETURN event
```

Bucketing prevents unlimited graph expansion and improves query performance.

### Security Basics for Production

Secure your Geode deployment from the start:

**Enable TLS**: Always use encryption for client-server communication:

```bash
# Generate self-signed certificate for testing
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Start server with TLS
geode serve --tls-cert cert.pem --tls-key key.pem
```

**Use Authentication**: Require credentials for database access:

```gql
-- Create users with limited privileges
CREATE USER analyst PASSWORD 'secure_password_here';
GRANT SELECT ON GRAPH analytics TO analyst;

-- Create admin user
CREATE USER admin PASSWORD 'very_secure_password';
GRANT ALL ON GRAPH * TO admin;
```

**Implement Row-Level Security**: Restrict data access by user:

```gql
-- Multi-tenant data isolation
CREATE POLICY tenant_isolation ON :Document
FOR ALL
TO analyst
USING (tenant_id = current_user_property('tenant_id'));
```

**Enable Audit Logging**: Track all database operations:

```yaml
# geode.yaml
audit:
  enabled: true
  log_queries: true
  log_auth_events: true
  output: /var/log/geode/audit.log
```

### Common Mistakes to Avoid

**Unbounded Pattern Matching**: Always limit variable-length paths:

```gql
-- Dangerous: Could traverse entire graph
MATCH path = (a:Person)-[:KNOWS*]->(b:Person)
RETURN path

-- Safe: Bounded depth
MATCH path = (a:Person)-[:KNOWS*1..5]->(b:Person)
RETURN path
```

**N+1 Query Pattern**: Fetch related data in single query:

```python
# Bad: N+1 queries
async with client.connection() as conn:
    users_page, _ = await conn.query("MATCH (u:User) RETURN u.id AS id")
    for user in users_page.rows:
        # Separate query for each user's orders
        orders_page, _ = await conn.query(
            "MATCH (:User {id: $id})-[:PLACED]->(o:Order) RETURN o",
            {"id": user["id"].as_string},
        )

# Good: Single query
result, _ = await conn.query(
    """
    MATCH (u:User)-[:PLACED]->(o:Order)
    RETURN u.id AS id, COLLECT(o) AS orders
    """
)
```

**Forgetting to Parameterize**: Always use parameters to prevent injection:

```python
# Dangerous: SQL injection equivalent
user_email = request.form['email']
query = f"MATCH (u:User {{email: '{user_email}'}}) RETURN u"  # DON'T!

# Safe: Parameterized
result, _ = await client.query(
    "MATCH (u:User {email: $email}) RETURN u",
    email=request.form['email']
)
```

### Scaling from Development to Production

**Development** (single instance):
```bash
geode serve --data /tmp/geode-dev
```

**Staging** (HA setup):
```yaml
# docker-compose.yml
services:
  geode-1:
    image: codepros/geode:v0.1.3
    volumes:
      - geode-data-1:/var/lib/geode

  geode-2:
    image: codepros/geode:v0.1.3
    volumes:
      - geode-data-2:/var/lib/geode

  geode-3:
    image: codepros/geode:v0.1.3
    volumes:
      - geode-data-3:/var/lib/geode
```

**Production** (cloud-native):
- Deploy to Kubernetes with StatefulSets
- Configure persistent volumes for data
- Set up automated backups to S3/GCS
- Enable monitoring with Prometheus
- Configure auto-scaling based on load
- Implement disaster recovery procedures

### Learning Path Recommendations

**Week 1**: Master basic CRUD operations, understand nodes and relationships, practice pattern matching

**Week 2**: Learn transactions, implement error handling, understand connection pooling

**Week 3**: Optimize with indexes, profile queries, model your domain effectively

**Week 4**: Implement security features, set up monitoring, configure backups

**Month 2**: Advanced patterns (aggregations, path finding, recommendations), performance tuning, high availability

**Month 3**: Production deployment, disaster recovery, compliance requirements

## Beyond Getting Started

You now understand Geode fundamentals. Continue your journey:

- **[Query Optimization](/tags/query-optimization/)**: Complex pattern matching and optimization
- **[Performance Tuning](/tags/performance/)**: Maximize throughput and minimize latency
- **[Security](/tags/security/)**: Enterprise security features
- **[Production Deployment](/tags/deployment/)**: High availability architectures
- **[Monitoring](/tags/monitoring/)**: Observability and alerting

Welcome to the Geode community. Happy graph building!
