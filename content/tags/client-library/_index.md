---
title: "Client Library Development"
description: "Building and integrating Geode client libraries with QUIC+TLS protocol support, connection pooling, query builders, and transaction management."
keywords:
  - Geode client library
  - GQL SDK
  - graph database client
  - QUIC TLS protocol
  - client development
  - database driver
  - connection pooling
  - query builder
  - transaction management
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/client-library/"
    title: "Geode Client Library Development - SDK Guide"
    description: "Guide to building and using Geode client libraries with QUIC+TLS, connection pooling, and transaction support."
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Client Library Development

Geode provides official client libraries for multiple languages, all built on the QUIC+TLS protocol for secure, high-performance connectivity. This page covers client library architecture, development patterns, and integration guidelines.

## Official Client Libraries

| Language | Package | Protocol | Async Model |
|----------|---------|----------|-------------|
| **Go** | `geodedb.com/geode` | QUIC | Goroutines |
| **Python** | `geode-client` | QUIC | asyncio |
| **Rust** | `geode-client` | QUIC | tokio |
| **Zig** | `geode-client-zig` | QUIC | Native |
| **Node.js** | `@geode/client` | QUIC | Promises |

## Wire Protocol

All Geode clients communicate using a JSON line protocol over QUIC+TLS:

### Message Types

**Client → Server**:
```json
{"type": "HELLO", "version": 1, "client": "go/1.0.0"}
{"type": "RUN_GQL", "query": "MATCH (n) RETURN n", "params": {}}
{"type": "PULL", "n": 1000}
{"type": "BEGIN", "isolation": "serializable"}
{"type": "COMMIT"}
{"type": "ROLLBACK"}
{"type": "PING"}
```

**Server → Client**:
```json
{"type": "SCHEMA", "columns": ["n"], "types": ["node"]}
{"type": "BINDINGS", "data": [{"n": {"id": 1, "labels": ["User"]}}]}
{"type": "SUCCESS", "stats": {"nodes_created": 0}}
{"type": "ERROR", "code": "42000", "message": "Syntax error"}
```

### Connection Lifecycle

```
Client                          Server
  |                               |
  |------ HELLO ----------------->|
  |<----- SUCCESS ----------------|
  |                               |
  |------ RUN_GQL --------------->|
  |<----- SCHEMA -----------------|
  |------ PULL ------------------>|
  |<----- BINDINGS ---------------|
  |<----- SUCCESS ----------------|
  |                               |
  |------ PING ------------------>|
  |<----- PONG -------------------|
```

## Client Architecture

### Core Components

Every Geode client library implements these components:

```
┌─────────────────────────────────────────────┐
│              Application Code               │
├─────────────────────────────────────────────┤
│              Query Builder                  │
│         (Fluent API for GQL)               │
├─────────────────────────────────────────────┤
│           Connection Pool                   │
│    (Connection lifecycle management)        │
├─────────────────────────────────────────────┤
│              Connection                     │
│     (Single QUIC stream wrapper)           │
├─────────────────────────────────────────────┤
│            Wire Protocol                    │
│    (JSON serialization/parsing)            │
├─────────────────────────────────────────────┤
│              QUIC + TLS                     │
│      (Transport encryption)                │
└─────────────────────────────────────────────┘
```

### Connection Pool Design

```python
class ConnectionPool:
    """Connection pool architecture pattern"""

    def __init__(self, config):
        self.min_connections = config.min_connections  # Warm pool
        self.max_connections = config.max_connections  # Hard limit
        self.max_idle_time = config.max_idle_time      # Reap idle
        self.health_check_interval = config.health_check

        self._available = Queue()  # Ready connections
        self._in_use = Set()       # Active connections
        self._lock = Lock()

    async def acquire(self, timeout=None):
        """Get connection from pool"""
        # Try available pool first
        # Create new if under max
        # Wait with timeout if at max
        pass

    async def release(self, conn):
        """Return connection to pool"""
        # Validate connection health
        # Return to available or close
        pass
```

### Query Builder Pattern

```python
class QueryBuilder:
    """Fluent query builder pattern"""

    def __init__(self):
        self._clauses = []
        self._params = {}

    def match(self, pattern: str) -> 'QueryBuilder':
        self._clauses.append(f"MATCH {pattern}")
        return self

    def where(self, condition: str) -> 'QueryBuilder':
        self._clauses.append(f"WHERE {condition}")
        return self

    def with_param(self, name: str, value: Any) -> 'QueryBuilder':
        self._params[name] = value
        return self

    def return_(self, *expressions: str) -> 'QueryBuilder':
        self._clauses.append(f"RETURN {', '.join(expressions)}")
        return self

    def build(self) -> Tuple[str, Dict]:
        return '\n'.join(self._clauses), self._params

# Usage
query, params = (QueryBuilder()
    .match("(u:User {id: $id})")
    .with_param("id", user_id)
    .return_("u.name", "u.email")
    .build())
```

## Implementing a Client

### Step 1: QUIC Connection

```rust
// Rust example using Quinn
use quinn::{ClientConfig, Endpoint};

pub struct GeodeConnection {
    endpoint: Endpoint,
    connection: quinn::Connection,
}

impl GeodeConnection {
    pub async fn connect(addr: &str, tls_config: ClientConfig) -> Result<Self> {
        let endpoint = Endpoint::client("0.0.0.0:0".parse()?)?;
        let connection = endpoint.connect_with(tls_config, addr, "geode")?.await?;

        Ok(Self { endpoint, connection })
    }
}
```

### Step 2: Wire Protocol

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(tag = "type")]
enum ClientMessage {
    HELLO { version: u32, client: String },
    RUN_GQL { query: String, params: HashMap<String, Value> },
    PULL { n: i64 },
    BEGIN { isolation: Option<String> },
    COMMIT,
    ROLLBACK,
    PING,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum ServerMessage {
    SUCCESS { stats: Option<QueryStats> },
    SCHEMA { columns: Vec<String>, types: Vec<String> },
    BINDINGS { data: Vec<HashMap<String, Value>> },
    ERROR { code: String, message: String },
    PONG,
}
```

### Step 3: Connection Pool

```rust
use tokio::sync::{Semaphore, Mutex};

pub struct ConnectionPool {
    config: PoolConfig,
    available: Mutex<Vec<GeodeConnection>>,
    semaphore: Semaphore,
}

impl ConnectionPool {
    pub async fn acquire(&self) -> Result<PooledConnection> {
        let permit = self.semaphore.acquire().await?;

        let conn = {
            let mut available = self.available.lock().await;
            available.pop()
        };

        let conn = match conn {
            Some(c) => c,
            None => GeodeConnection::connect(&self.config.dsn).await?,
        };

        Ok(PooledConnection { conn, permit, pool: self })
    }
}
```

### Step 4: Transaction Support

```rust
pub struct Transaction<'a> {
    conn: &'a mut GeodeConnection,
    active: bool,
}

impl<'a> Transaction<'a> {
    pub async fn begin(conn: &'a mut GeodeConnection) -> Result<Self> {
        conn.send(ClientMessage::BEGIN { isolation: None }).await?;
        conn.expect_success().await?;
        Ok(Self { conn, active: true })
    }

    pub async fn commit(mut self) -> Result<()> {
        self.conn.send(ClientMessage::COMMIT).await?;
        self.conn.expect_success().await?;
        self.active = false;
        Ok(())
    }

    pub async fn rollback(mut self) -> Result<()> {
        self.conn.send(ClientMessage::ROLLBACK).await?;
        self.conn.expect_success().await?;
        self.active = false;
        Ok(())
    }
}

impl Drop for Transaction<'_> {
    fn drop(&mut self) {
        if self.active {
            // Automatic rollback on drop
            // (spawn rollback task)
        }
    }
}
```

## Error Handling

### GQL Error Codes

```python
class GqlError(Exception):
    """Base GQL error with ISO status code"""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        self.category = code[:2]  # First two digits

    @property
    def is_retryable(self) -> bool:
        """Transient errors that may succeed on retry"""
        return self.category in ('08', '40', '57')

# Error categories
# 02xxx - No data
# 08xxx - Connection exception (retryable)
# 22xxx - Data exception
# 23xxx - Constraint violation
# 40xxx - Transaction rollback (retryable)
# 42xxx - Syntax error
# 57xxx - Resource limit (retryable)
```

### Retry Logic

```python
async def execute_with_retry(
    pool: ConnectionPool,
    query: str,
    params: dict,
    max_retries: int = 3
) -> Result:
    """Execute query with automatic retry for transient errors"""

    last_error = None

    for attempt in range(max_retries):
        try:
            async with pool.acquire() as conn:
                return await conn.execute(query, params)

        except GqlError as e:
            last_error = e
            if not e.is_retryable:
                raise

            # Exponential backoff
            await asyncio.sleep(0.1 * (2 ** attempt))

        except ConnectionError as e:
            last_error = e
            await asyncio.sleep(0.1 * (2 ** attempt))

    raise last_error
```

## Testing Clients

### Unit Tests

```python
import pytest
from unittest.mock import AsyncMock

@pytest.fixture
def mock_connection():
    conn = AsyncMock()
    conn.execute.return_value = Result(
        columns=['name'],
        rows=[{'name': 'Alice'}]
    )
    return conn

async def test_query_builder(mock_connection):
    builder = QueryBuilder(mock_connection)

    result = await (builder
        .match("(u:User)")
        .where("u.active = true")
        .return_("u.name")
        .execute())

    assert result.rows[0]['name'] == 'Alice'
    mock_connection.execute.assert_called_once()
```

### Integration Tests

```python
import pytest
from testcontainers.geode import GeodeContainer

@pytest.fixture(scope="module")
async def geode():
    """Start Geode container for integration tests"""
    with GeodeContainer() as container:
        yield container.get_connection_url()

async def test_real_query(geode):
    pool = ConnectionPool(geode)

    async with pool.acquire() as conn:
        # Create test data
        await conn.execute(
            "CREATE (u:User {name: $name})",
            {"name": "Test User"}
        )

        # Query it back
        result = await conn.execute(
            "MATCH (u:User {name: $name}) RETURN u.name",
            {"name": "Test User"}
        )

        assert result.rows[0]['u.name'] == 'Test User'
```

## Performance Optimization

### Connection Reuse

```python
# Configure pool for workload
pool = ConnectionPool(
    dsn="geode://localhost:3141/mydb",
    min_connections=5,      # Keep warm
    max_connections=50,     # Scale limit
    max_idle_time=300,      # 5 minutes
    connection_timeout=5,   # Fast fail
)

# Reuse connections
async def handler(request):
    async with pool.acquire() as conn:
        # Connection returned to pool after use
        return await conn.execute(query, params)
```

### Prepared Statements

```go
// Go example - prepare once, execute many
stmt, err := db.Prepare("MATCH (u:User {id: $1}) RETURN u")
if err != nil {
    log.Fatal(err)
}
defer stmt.Close()

// Execute prepared statement
for _, id := range userIDs {
    rows, err := stmt.Query(id)
    // Process rows...
}
```

### Batch Operations

```python
# Batch inserts for better throughput
async def batch_insert(conn, users):
    await conn.execute("""
        UNWIND $users AS user
        CREATE (u:User {
            id: user.id,
            name: user.name,
            email: user.email
        })
    """, {"users": users})

# Insert 1000 users in single round-trip
await batch_insert(conn, user_list)
```

## Related Topics

- [Client Libraries Overview](/tags/client-libraries/)
- [Go Client](/tags/go-client/)
- [Python Client](/tags/python-client/)
- [Rust Client](/tags/rust-client/)
- [Zig Client](/tags/zig-client/)
- [SQL Driver](/tags/sql-driver/)
- [Connection Pooling](/tags/connections/)
- [Wire Protocol](/docs/architecture/wire-protocol/)

## Further Reading

- [Client Libraries Documentation](/docs/client-libraries/)
- [Wire Protocol Specification](/docs/protocol/)
- [Connection Configuration](/docs/configuration/)
- [Error Handling Guide](/guides/error-handling/)
- [Performance Tuning](/guides/query-performance/)
