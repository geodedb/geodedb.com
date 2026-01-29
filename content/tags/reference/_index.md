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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

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
from geode_client import Client
import asyncio

# Basic connection
client = Client(host="localhost", port=3141)
async with client.connection() as conn:
    result, _ = await conn.query("MATCH (n:User) RETURN n LIMIT 10")

# With authentication
client = Client(
    'localhost:3141',
    username='admin',
    password='password',
    tls_verify=True,
    ca_cert='/path/to/ca.crt'
)

# Connection pool
client = Client(
    'localhost:3141',
    pool_size=20,
    pool_timeout=30
)
```

### Query Execution

```python
# Simple query
result, _ = await client.query("MATCH (u:User) RETURN u.name")
for row in result.rows:
    print(row['u.name'])

# Parameterized query
result, _ = await client.query(
    "MATCH (u:User {id: $id}) RETURN u",
    {"id": 123}
)

# Prepared statement
stmt = await client.prepare("MATCH (u:User {id: $id}) RETURN u")
result, _ = await stmt.execute({"id": 123})

# Batch execution
queries = [
    ("CREATE (:User {id: $id, name: $name})", {"id": 1, "name": "Alice"}),
    ("CREATE (:User {id: $id, name: $name})", {"id": 2, "name": "Bob"}),
]
for query, params in queries:
    await client.execute(query, params)
```

### Transaction API

```python
# Explicit transactions
async with client.connection() as tx:
    await tx.begin()
    await tx.execute("CREATE (:User {id: 1})")
    await tx.execute("CREATE (:User {id: 2})")
    await tx.commit()

# Transaction with savepoints
async with client.connection() as tx:
    await tx.begin()
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
    _ "geodedb.com/geode"
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
use geode_client::{Client, Error, Value};
use std::collections::HashMap;

// Connect
let client = Client::from_dsn("localhost:3141")?;
let mut conn = client.connect().await?;

// Query execution
let (page, _) = conn.query("MATCH (u:User) RETURN u.name").await?;
for row in &page.rows {
    let name = row.get("u.name").unwrap().as_string()?;
    println!("{}", name);
}

// Parameterized query
let mut params = HashMap::new();
params.insert("id".to_string(), Value::int(123));
let _ = conn
    .query_with_params("MATCH (u:User {id: $id}) RETURN u", &params)
    .await?;

// Transaction
conn.begin().await?;
let _ = conn.query("CREATE (:User {id: 1})").await?;
let _ = conn.query("CREATE (:User {id: 2})").await?;
conn.commit().await?;
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
- [Go Client](/tags/go/) - Go client documentation
- [Rust Client](/tags/rust/) - Rust client documentation
- [Protocol](/tags/protocol/) - Wire protocol specification

This reference provides the complete API surface for building applications with Geode, from GQL queries to client library integration and protocol-level communication.

## Comprehensive GQL Functions Reference

### String Functions

```gql
-- String manipulation
RETURN upper('hello');              -- 'HELLO'
RETURN lower('WORLD');              -- 'world'
RETURN substring('Geode', 0, 3);    -- 'Geo'
RETURN trim('  text  ');            -- 'text'
RETURN replace('foo bar', 'bar', 'baz');  -- 'foo baz'
RETURN split('a,b,c', ',');         -- ['a', 'b', 'c']
RETURN concat('Hello', ' ', 'World');  -- 'Hello World'
RETURN length('Geode');             -- 5
RETURN reverse('abc');              -- 'cba'
```

### Numeric Functions

```gql
-- Math operations
RETURN abs(-42);                    -- 42
RETURN ceil(3.14);                  -- 4
RETURN floor(3.99);                 -- 3
RETURN round(3.567, 2);             -- 3.57
RETURN sqrt(16);                    -- 4.0
RETURN pow(2, 8);                   -- 256
RETURN log(100);                    -- 4.605 (natural log)
RETURN log10(1000);                 -- 3.0
RETURN exp(1);                      -- 2.718
RETURN sin(0);                      -- 0.0
RETURN cos(0);                      -- 1.0
RETURN rand();                      -- Random float [0.0, 1.0)
```

### Date/Time Functions

```gql
-- Current timestamp
RETURN now();                       -- Current timestamp
RETURN date();                      -- Current date
RETURN time();                      -- Current time

-- Date construction
RETURN datetime('2024-01-15T10:30:00Z');
RETURN date({year: 2024, month: 1, day: 15});
RETURN time({hour: 14, minute: 30, second: 0});

-- Date arithmetic
RETURN datetime() + duration({days: 7});        -- One week from now
RETURN datetime() - duration({hours: 24});      -- Yesterday
RETURN duration.between(date('2024-01-01'), date('2024-12-31'));

-- Date extraction
RETURN year(datetime());            -- 2024
RETURN month(datetime());           -- 1
RETURN day(datetime());             -- 15
RETURN hour(datetime());            -- 14
RETURN minute(datetime());          -- 30
RETURN second(datetime());          -- 0
RETURN dayOfWeek(datetime());       -- 1-7 (Monday=1)
```

### Aggregation Functions

```gql
-- Basic aggregations
MATCH (u:User)
RETURN
    count(u) AS total_users,
    count(DISTINCT u.city) AS unique_cities,
    sum(u.age) AS total_age,
    avg(u.age) AS average_age,
    min(u.age) AS youngest,
    max(u.age) AS oldest,
    stdev(u.age) AS age_std_dev,
    percentile_cont(u.age, 0.5) AS median_age,
    percentile_cont(u.age, 0.95) AS p95_age;

-- Collection aggregations
MATCH (u:User)
RETURN
    collect(u.name) AS all_names,
    collect(DISTINCT u.city) AS all_cities;
```

### List Functions

```gql
-- List operations
RETURN size([1, 2, 3, 4, 5]);                   -- 5
RETURN head([1, 2, 3]);                         -- 1
RETURN last([1, 2, 3]);                         -- 3
RETURN tail([1, 2, 3]);                         -- [2, 3]
RETURN [x IN [1, 2, 3, 4, 5] WHERE x > 2];     -- [3, 4, 5]
RETURN [x IN [1, 2, 3] | x * 2];               -- [2, 4, 6]
RETURN reduce(s = 0, x IN [1, 2, 3] | s + x);  -- 6
RETURN range(0, 10, 2);                         -- [0, 2, 4, 6, 8, 10]
```

### Graph Functions

```gql
-- Node and relationship functions
MATCH (n:User)
RETURN
    id(n) AS node_id,
    labels(n) AS node_labels,
    keys(n) AS property_keys,
    properties(n) AS all_properties;

MATCH (a)-[r]->(b)
RETURN
    id(r) AS relationship_id,
    type(r) AS relationship_type,
    startNode(r) AS start,
    endNode(r) AS end;

-- Path functions
MATCH path = (a:User)-[:KNOWS*1..3]->(b:User)
RETURN
    length(path) AS path_length,
    nodes(path) AS path_nodes,
    relationships(path) AS path_relationships;
```

### Type Checking and Coercion

```gql
-- Type checking
RETURN toBoolean('true');           -- true
RETURN toFloat('3.14');             -- 3.14
RETURN toInteger('42');             -- 42
RETURN toString(123);               -- '123'

-- Type predicates
WITH value
RETURN
    value IS NULL AS is_null,
    value IS NOT NULL AS is_not_null;
```

## Advanced Query Patterns

### Common Table Expressions (WITH)

```gql
-- Multi-stage query with WITH
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH u, count(p) AS purchase_count
WHERE purchase_count > 5

MATCH (u)-[:LIVES_IN]->(c:City)
WITH u, purchase_count, c
ORDER BY purchase_count DESC
LIMIT 100

MATCH (u)-[:FRIEND]->(f:User)
WHERE (f)-[:LIVES_IN]->(c)
RETURN u.name, purchase_count, c.name, count(f) AS local_friends
ORDER BY local_friends DESC;
```

### Conditional Logic (CASE)

```gql
MATCH (u:User)
RETURN u.name,
    CASE
        WHEN u.age < 18 THEN 'minor'
        WHEN u.age < 65 THEN 'adult'
        ELSE 'senior'
    END AS age_category,
    CASE u.subscription_tier
        WHEN 'free' THEN 0
        WHEN 'premium' THEN 9.99
        WHEN 'enterprise' THEN 99.99
        ELSE 0
    END AS monthly_cost;
```

### Window Functions

```gql
-- Ranking and partitioning
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN
    u.name,
    p.category,
    p.price,
    row_number() OVER (PARTITION BY p.category ORDER BY p.price DESC) AS category_rank,
    rank() OVER (ORDER BY p.price DESC) AS overall_rank,
    percent_rank() OVER (PARTITION BY p.category ORDER BY p.price) AS price_percentile;
```

### Recursive Queries

```gql
-- Recursive traversal (organizational hierarchy)
MATCH path = (emp:Employee {id: $employee_id})-[:REPORTS_TO*0..]->(mgr:Employee)
RETURN emp.name AS employee,
       [n IN nodes(path) | n.name] AS reporting_chain,
       length(path) AS levels_up;

-- Fixed-depth recursion
MATCH (start:Category {name: 'Electronics'})-[:SUBCATEGORY*3]->(end:Category)
RETURN end.name AS subcategory_3_levels_down;
```

## Client Library Advanced Features

### Python Client: Streaming Results

```python
from geode_client import Client

client = Client(host="localhost", port=3141)

async with client.connection() as conn:
    # Stream large result sets
    async for batch in client.query_stream("""
        MATCH (u:User)
        RETURN u.id, u.name, u.email
    """, batch_size=1000):
        # Process batch of 1000 rows
        await process_users(batch)
        # Memory efficient for millions of rows
```

### Python Client: Query Builders

```python
from geode_client import QueryBuilder

# Programmatic query construction
qb = QueryBuilder()
query = (qb
    .match("(u:User)")
    .where("u.age > $min_age")
    .where("u.city = $city")
    .return_("u.name", "u.age")
    .order_by("u.age DESC")
    .limit(10)
    .build())

result, _ = await client.query(query, {"min_age": 25, "city": "Seattle"})
```

### Go Client: Context and Timeouts

```go
import (
    "context"
    "time"
    "geodedb.com/geode"
)

// Query with timeout
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

rows, err := db.QueryContext(ctx, `
    MATCH (u:User)-[:PURCHASED]->(p:Product)
    WHERE p.category = $1
    RETURN u.name, count(p) AS purchases
    ORDER BY purchases DESC
    LIMIT 100
`, "Electronics")

if err == context.DeadlineExceeded {
    // Query timed out
}
```

### Go Client: Bulk Insert

```go
// Efficient bulk insert with prepared statement
stmt, err := db.Prepare("CREATE (:User {id: $1, name: $2, email: $3})")
defer stmt.Close()

tx, err := db.Begin()
defer tx.Rollback()

for _, user := range users {
    _, err = tx.Stmt(stmt).Exec(user.ID, user.Name, user.Email)
    if err != nil {
        return err
    }
}

err = tx.Commit()  // Commit all inserts atomically
```

### Rust Client: Type-Safe Query Results

```rust
use geode_client::Client;

let client = Client::from_dsn("localhost:3141")?;
let mut conn = client.connect().await?;

// Type-safe result access
let (page, _) = conn
    .query("MATCH (u:User) WHERE u.active = true RETURN u.id, u.name, u.email, u.age")
    .await?;

for row in &page.rows {
    let id = row.get("u.id").unwrap().as_int()?;
    let name = row.get("u.name").unwrap().as_string()?;
    let email = row.get("u.email").unwrap().as_string()?;
    println!("{}: {} ({})", id, name, email);
}
```

## Protocol Deep Dive

### Connection Handshake

```json
// Client sends HELLO
{
  "type": "HELLO",
  "version": "1.0",
  "client": "geode-python/0.1.3",
  "auth": {
    "method": "basic",
    "username": "admin",
    "password": "secret"
  },
  "capabilities": {
    "streaming": true,
    "prepared_statements": true,
    "transactions": true
  }
}

// Server responds with welcome
{
  "type": "WELCOME",
  "version": "1.0",
  "server": "geode/0.1.3",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "capabilities": {
    "max_query_size": 1048576,
    "supported_isolation_levels": ["READ_COMMITTED", "REPEATABLE_READ", "SERIALIZABLE"]
  }
}
```

### Query Execution Flow

```json
// Client sends query
{
  "type": "RUN_GQL",
  "query": "MATCH (u:User {id: $id}) RETURN u.name, u.email",
  "params": {"id": 123},
  "options": {
    "timeout_ms": 30000,
    "include_stats": true
  }
}

// Server sends schema
{
  "type": "SCHEMA",
  "fields": [
    {"name": "u.name", "type": "STRING", "nullable": false},
    {"name": "u.email", "type": "STRING", "nullable": true}
  ]
}

// Server streams results
{
  "type": "BINDINGS",
  "data": [
    {"u.name": "Alice", "u.email": "alice@example.com"}
  ]
}

// Server sends success
{
  "type": "SUCCESS",
  "summary": {
    "rows": 1,
    "time_ms": 2.5,
    "nodes_scanned": 1,
    "index_hits": 1
  }
}
```

### Transaction Protocol

```json
// BEGIN
{"type": "BEGIN", "isolation_level": "SERIALIZABLE"}
{"type": "SUCCESS", "transaction_id": "tx-98765"}

// RUN_GQL (within transaction)
{"type": "RUN_GQL", "transaction_id": "tx-98765", "query": "CREATE (:User {name: 'Bob'})"}
{"type": "SUCCESS", "summary": {"nodes_created": 1}}

// COMMIT
{"type": "COMMIT", "transaction_id": "tx-98765"}
{"type": "SUCCESS", "summary": {"committed": true}}
```

## Performance Tuning Reference

### Query Hints

```gql
-- Force index usage
MATCH (u:User)
USING INDEX u:User(email)
WHERE u.email = 'alice@example.com'
RETURN u;

-- Disable index (force scan)
MATCH (u:User)
WITHOUT INDEX
WHERE u.age > 30
RETURN u;

-- Join hint
MATCH (u:User), (p:Product)
WHERE u.id = p.user_id
USING JOIN ON u.id = p.user_id
RETURN u, p;
```

### Query Plan Analysis

```gql
EXPLAIN
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.city = 'Seattle' AND p.price > 100
RETURN u.name, p.name;

-- Returns execution plan:
-- IndexScan (User.city = 'Seattle')
--   -> Expand ([:PURCHASED])
--     -> Filter (Product.price > 100)
--       -> Return
```

### Configuration Parameters

```gql
-- Set session parameters
SET query_timeout = 60000;              -- 60 second timeout
SET max_memory_per_query = '2GB';       -- Memory limit
SET enable_parallel_scan = true;        -- Parallel execution
SET work_mem = '256MB';                 -- Sort/hash memory

-- View current settings
SHOW ALL;
SHOW query_timeout;
```

This reference provides the complete API surface for building applications with Geode, from GQL queries to client library integration and protocol-level communication.
