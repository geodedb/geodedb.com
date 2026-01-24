---
title: "API Reference"
description: "Complete Geode API reference: GQL syntax, client library APIs, REST endpoints, protocol specification, and comprehensive developer documentation."
keywords:
  - API reference
  - Geode API
  - client libraries
  - GQL reference
  - protocol documentation
  - developer documentation
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/reference/"
    noindex: false
---

Comprehensive API reference documentation for Geode covering GQL language syntax, client library interfaces, wire protocol specification, and all developer-facing APIs.

## GQL Language Reference

### Query Syntax

Pattern matching and data retrieval:

```gql
// Basic pattern matching
MATCH (variable:Label {property: value})
WHERE condition
RETURN expression

// Multi-pattern matching
MATCH (a:User)-[r:KNOWS]->(b:User)
WHERE a.age > 25 AND b.verified = true
RETURN a.name, r.since, b.name

// Variable-length paths
MATCH path = (start)-[:KNOWS*1..3]->(end)
WHERE start.name = 'Alice'
RETURN path, LENGTH(path)

// Optional patterns
MATCH (u:User)
OPTIONAL MATCH (u)-[:HAS_PROFILE]->(p:Profile)
RETURN u.name, p.bio
```

### Data Modification

Create, update, and delete operations:

```gql
// CREATE - insert new nodes/relationships
CREATE (n:Label {property: value})
CREATE (a)-[r:TYPE {property: value}]->(b)

// SET - update properties
MATCH (n:User {id: 123})
SET n.name = 'New Name',
    n.updated_at = NOW()

// DELETE - remove nodes/relationships
MATCH (n:User {id: 123})
DELETE n

// DETACH DELETE - remove node and all relationships
MATCH (n:User {id: 123})
DETACH DELETE n

// MERGE - upsert operation
MERGE (u:User {email: 'alice@example.com'})
ON CREATE SET u.created_at = NOW()
ON MATCH SET u.last_seen = NOW()
```

### Schema Operations

Indexes, constraints, and schema management:

```gql
// CREATE INDEX
CREATE INDEX FOR (n:Label) ON (n.property)
CREATE INDEX index_name FOR (n:Label) ON (n.prop1, n.prop2)

// CREATE CONSTRAINT
CREATE CONSTRAINT ON (n:Label) ASSERT n.property IS UNIQUE
CREATE CONSTRAINT ON (n:Label) ASSERT EXISTS(n.property)

// DROP INDEX/CONSTRAINT
DROP INDEX index_name
DROP CONSTRAINT constraint_name

// SHOW INDEXES/CONSTRAINTS
SHOW INDEXES
SHOW CONSTRAINTS
```

## Python Client API

### Connection Management

```python
from geode_client import GeodeClient
import asyncio

# Basic connection
async with GeodeClient('localhost:3141') as client:
    result = await client.query("MATCH (n:User) RETURN n LIMIT 10")

# With authentication
client = GeodeClient(
    'localhost:3141',
    username='admin',
    password='password',
    tls_verify=True,
    ca_cert='/path/to/ca.crt'
)

# Connection pool
client = GeodeClient(
    'localhost:3141',
    pool_size=20,
    pool_timeout=30
)
```

### Query Execution

```python
# Simple query
result = await client.query("MATCH (u:User) RETURN u.name")
for row in result:
    print(row['u.name'])

# Parameterized query
result = await client.query(
    "MATCH (u:User {id: $id}) RETURN u",
    {"id": 123}
)

# Prepared statement
stmt = await client.prepare("MATCH (u:User {id: $id}) RETURN u")
result = await stmt.execute({"id": 123})

# Batch execution
queries = [
    ("CREATE (:User {id: $id, name: $name})", {"id": 1, "name": "Alice"}),
    ("CREATE (:User {id: $id, name: $name})", {"id": 2, "name": "Bob"}),
]
await client.execute_batch(queries)
```

### Transaction API

```python
# Explicit transactions
async with client.transaction() as tx:
    await tx.execute("CREATE (:User {id: 1})")
    await tx.execute("CREATE (:User {id: 2})")
    await tx.commit()

# Transaction with savepoints
async with client.transaction() as tx:
    await tx.execute("CREATE (:User {id: 1})")
    sp = await tx.savepoint('sp1')
    await tx.execute("CREATE (:User {id: 2})")
    await tx.rollback_to(sp)
    await tx.commit()  # Only user 1 committed
```

## Go Client API

### Database/SQL Interface

```go
import (
    "database/sql"
    _ "go.codepros.org/geode"
)

// Open connection
db, err := sql.Open("geode", "geode://localhost:3141?sslmode=disable")
defer db.Close()

// Query execution
rows, err := db.Query("MATCH (u:User) WHERE u.age > $1 RETURN u.name, u.age", 25)
defer rows.Close()

for rows.Next() {
    var name string
    var age int
    err := rows.Scan(&name, &age)
    fmt.Printf("%s: %d\n", name, age)
}

// Prepared statements
stmt, err := db.Prepare("MATCH (u:User {id: $1}) RETURN u")
defer stmt.Close()

rows, err = stmt.Query(123)
```

### Transaction Handling

```go
// Begin transaction
tx, err := db.Begin()
defer tx.Rollback() // Rollback if not committed

// Execute in transaction
_, err = tx.Exec("CREATE (:User {id: $1, name: $2})", 1, "Alice")
_, err = tx.Exec("CREATE (:User {id: $1, name: $2})", 2, "Bob")

// Commit
err = tx.Commit()
```

## Rust Client API

### Async Client

```rust
use geode_client::{GeodeClient, Error};

// Connect
let client = GeodeClient::connect("localhost:3141").await?;

// Query execution
let result = client.query("MATCH (u:User) RETURN u.name").await?;
for row in result.rows {
    let name: String = row.get("u.name")?;
    println!("{}", name);
}

// Parameterized query
let result = client.query_params(
    "MATCH (u:User {id: $id}) RETURN u",
    &[("id", &123i64)]
).await?;

// Transaction
let mut tx = client.begin().await?;
tx.execute("CREATE (:User {id: 1})").await?;
tx.execute("CREATE (:User {id: 2})").await?;
tx.commit().await?;
```

## Wire Protocol Reference

### JSON Line Protocol

Each message is a JSON object followed by newline:

```json
// Client HELLO message
{"type":"HELLO","version":"1.0","auth":{"username":"admin","password":"secret"}}

// Server SCHEMA response
{"type":"SCHEMA","fields":[{"name":"u.name","type":"STRING"},{"name":"u.age","type":"INTEGER"}]}

// Client RUN_GQL message
{"type":"RUN_GQL","query":"MATCH (u:User) RETURN u.name, u.age","params":{}}

// Server BINDINGS response
{"type":"BINDINGS","data":[{"u.name":"Alice","u.age":30}]}
{"type":"BINDINGS","data":[{"u.name":"Bob","u.age":25}]}
{"type":"SUCCESS","summary":{"rows":2,"time_ms":15}}

// Server ERROR response
{"type":"ERROR","code":"42000","message":"Syntax error: unexpected token","position":12}
```

### Message Types

**Client Messages**:
- `HELLO` - Connection handshake
- `RUN_GQL` - Execute GQL query
- `PULL` - Fetch results (streaming)
- `BEGIN` - Start transaction
- `COMMIT` - Commit transaction
- `ROLLBACK` - Rollback transaction
- `PING` - Keep-alive

**Server Messages**:
- `SCHEMA` - Query result schema
- `BINDINGS` - Result rows
- `SUCCESS` - Operation completed
- `ERROR` - Error with ISO code
- `EXPLAIN` - Query execution plan
- `PROFILE` - Performance metrics

## Error Codes

ISO SQL/GQL standard error codes:

| Code | Category | Description |
|------|----------|-------------|
| 00000 | Success | No error |
| 02000 | No Data | Query returned no results |
| 21000 | Cardinality | Too many/few rows |
| 22000 | Data Exception | Invalid data value |
| 23000 | Constraint | Constraint violation |
| 42000 | Syntax Error | Invalid GQL syntax |
| 42S01 | Object Exists | Object already exists |
| 42S02 | Object Not Found | Object does not exist |
| 40001 | Transaction | Serialization failure |
| 08000 | Connection | Connection error |

## REST API (Experimental)

HTTP interface for query execution:

```bash
# Execute query
curl -X POST http://localhost:3141/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "MATCH (u:User) RETURN u.name LIMIT 10",
    "params": {}
  }'

# Response
{
  "schema": [{"name": "u.name", "type": "STRING"}],
  "data": [
    {"u.name": "Alice"},
    {"u.name": "Bob"}
  ],
  "summary": {"rows": 2, "time_ms": 12}
}

# Health check
curl http://localhost:3141/health

# Metrics
curl http://localhost:3141/metrics
```

## Configuration Reference

Server configuration options:

```bash
geode serve \
  --listen 0.0.0.0:3141 \
  --data-dir /var/lib/geode \
  --wal-dir /var/lib/geode/wal \
  --log-level info \
  --max-connections 1000 \
  --query-timeout 30000 \
  --tls-cert /path/to/cert.pem \
  --tls-key /path/to/key.pem \
  --auth-enabled \
  --replication-mode primary
```

## Performance Tuning

Configuration parameters for optimization:

```gql
// Query timeout
SET query_timeout = 30000;

// Memory limits
SET max_memory_per_query = '1GB';
SET shared_buffer_size = '4GB';

// Connection pooling
SET max_connections = 1000;
SET connection_timeout = 10000;

// Cache settings
SET query_cache_size = '512MB';
SET index_cache_size = '2GB';
```

## Best Practices

1. **Use Prepared Statements**: For repeated queries with different parameters
2. **Batch Operations**: Group multiple writes into transactions
3. **Connection Pooling**: Reuse connections for better performance
4. **Error Handling**: Always check error codes and handle appropriately
5. **Parameter Binding**: Never concatenate user input into queries
6. **Index Usage**: Create indexes for frequently queried properties
7. **Limit Results**: Always use LIMIT for exploratory queries

## Related Topics

- **GQL Syntax**: Complete language syntax guide
- **Client Libraries**: Language-specific guides
- **Protocol Specification**: Detailed wire protocol
- **Error Handling**: Error codes and handling
- **Performance**: Query optimization

## Further Reading

- [GQL Reference](/tags/gql-reference/) - Complete GQL documentation
- [Python Client](/tags/python/) - Python-specific API details
- [Go Client](/tags/golang/) - Go client documentation
- [Rust Client](/tags/rust/) - Rust client documentation
- [Protocol](/tags/protocol/) - Wire protocol specification

This reference provides the complete API surface for building applications with Geode, from GQL queries to client library integration and protocol-level communication.