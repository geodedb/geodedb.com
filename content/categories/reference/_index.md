---
title: "Category: API and Technical Reference"
description: "Comprehensive API and technical reference documentation for Geode including GQL syntax, functions, data types, client library APIs, configuration parameters, and system tables."
keywords:
  - API reference
  - technical reference
  - GQL syntax
  - functions
  - data types
  - configuration
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/reference/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

The **API and Technical Reference** category provides authoritative, detailed documentation on every aspect of Geode's interfaces, syntax, and configuration. This is your go-to resource for precise specifications, function signatures, parameter details, and technical specifications.

## GQL Language Reference

### Syntax Overview

Geode implements ISO/IEC 39075:2024 Graph Query Language aligned to the full GQL conformance profile. The GQL syntax includes:

**Data Manipulation Language (DML)**:

- `MATCH` - Pattern matching to find graph elements
- `CREATE` - Create new nodes and relationships
- `SET` - Update properties and labels
- `REMOVE` - Delete properties and labels
- `DELETE` - Remove nodes and relationships
- `MERGE` - Match or create pattern
- `RETURN` - Specify result projection
- `WITH` - Pipeline query parts

**Data Definition Language (DDL)**:

- `CREATE INDEX` - Create property indexes
- `DROP INDEX` - Remove indexes
- `CREATE CONSTRAINT` - Define data constraints
- `DROP CONSTRAINT` - Remove constraints
- `ANALYZE` - Update statistics

**Transaction Control**:

- `BEGIN` - Start transaction
- `COMMIT` - Commit transaction
- `ROLLBACK` - Abort transaction
- `SAVEPOINT` - Create savepoint
- `RELEASE` - Release savepoint

**Query Analysis**:

- `EXPLAIN` - Show execution plan
- `PROFILE` - Execute with performance metrics

### Pattern Syntax

**Node Patterns**:

```gql
()                              -- Anonymous node
(n)                             -- Node bound to variable n
(n:Label)                       -- Node with label
(n:Label1:Label2)              -- Node with multiple labels
(n {prop: value})              -- Node with properties
(n:Label {prop: value})        -- Combined
```

**Relationship Patterns**:

```gql
-[r]->                         -- Directed relationship
-[r]-                          -- Undirected relationship
<-[r]-                         -- Directed (opposite direction)
-[r:TYPE]->                    -- Relationship with type
-[r:TYPE1|TYPE2]->             -- Multiple types (OR)
-[r:TYPE {prop: value}]->      -- With properties
-[r:TYPE*]->                   -- Variable length (any)
-[r:TYPE*1..5]->               -- Variable length (bounded)
-[r:TYPE*..3]->                -- Up to 3 hops
-[r:TYPE*2..]->                -- At least 2 hops
```

**Path Patterns**:

```gql
path = (a)-[*]->(b)            -- Bind entire path
SHORTEST (a)-[*]->(b)          -- Shortest path
ALL SHORTEST (a)-[*]->(b)      -- All shortest paths
```

### Data Types

**Primitive Types**:

- `BOOLEAN` - true/false values
- `INTEGER` - 64-bit signed integers (-2^63 to 2^63-1)
- `FLOAT` - 64-bit IEEE 754 floating point
- `STRING` - UTF-8 encoded text
- `NULL` - Absence of value

**Temporal Types**:

- `DATE` - Calendar date (YYYY-MM-DD)
- `TIME` - Time of day with timezone
- `TIMESTAMP` - Date and time with timezone
- `DURATION` - Time interval (ISO 8601 format)

**Structured Types**:

- `LIST` - Ordered collection: `[1, 2, 3]`
- `MAP` - Key-value pairs: `{name: 'Alice', age: 30}`

**Graph Types**:

- `NODE` - Graph node
- `RELATIONSHIP` - Graph edge
- `PATH` - Sequence of nodes and relationships

**Spatial Types** (extension):

- `POINT` - Geographic or Cartesian coordinate

**Vector Types** (extension):

- `VECTOR` - Fixed-dimension numeric array for embeddings

### Built-in Functions

**Scalar Functions**:

```gql
-- String functions
lower(string) -> string
upper(string) -> string
substring(string, start, length) -> string
trim(string) -> string
replace(string, search, replacement) -> string
length(string) -> integer
starts_with(string, prefix) -> boolean
ends_with(string, suffix) -> boolean
contains(string, substring) -> boolean

-- Numeric functions
abs(number) -> number
ceil(number) -> integer
floor(number) -> integer
round(number, precision) -> number
sqrt(number) -> float
power(base, exponent) -> number
log(number) -> float
exp(number) -> float
sin(number), cos(number), tan(number) -> float

-- Temporal functions
current_date() -> date
current_time() -> time
current_timestamp() -> timestamp
date(year, month, day) -> date
timestamp(string) -> timestamp
duration(string) -> duration
```

**Aggregation Functions**:

```gql
count(expression) -> integer
sum(expression) -> number
avg(expression) -> float
min(expression) -> any
max(expression) -> any
collect(expression) -> list
count{pattern} -> integer       -- Count matching patterns
```

**List Functions**:

```gql
size(list) -> integer
head(list) -> any              -- First element
last(list) -> any              -- Last element
tail(list) -> list             -- All but first
reverse(list) -> list
range(start, end, step) -> list
```

**Path Functions**:

```gql
length(path) -> integer        -- Number of relationships
nodes(path) -> list<node>      -- All nodes in path
relationships(path) -> list<relationship>
```

**Predicate Functions**:

```gql
exists(pattern) -> boolean
all(var IN list WHERE predicate) -> boolean
any(var IN list WHERE predicate) -> boolean
none(var IN list WHERE predicate) -> boolean
single(var IN list WHERE predicate) -> boolean
```

**Type Functions**:

```gql
type(relationship) -> string   -- Relationship type
labels(node) -> list<string>   -- Node labels
properties(element) -> map     -- All properties
keys(element) -> list<string>  -- Property names
```

## Client Library APIs

### Python API Reference

```python
import geode_client

# Connection
async def connect(
    host: str,
    port: int = 3141,
    *,
    username: str | None = None,
    password: str | None = None,
    tls: bool = True,
    verify_cert: bool = True,
    timeout: float = 30.0
) -> Connection

# Connection methods
class Connection:
    async def execute(
        self,
        query: str,
        parameters: dict[str, Any] | None = None,
        *,
        timeout: float | None = None
    ) -> ResultSet

    async def prepare(
        self,
        query: str
    ) -> PreparedStatement

    async def transaction(
        self,
        *,
        isolation: IsolationLevel = IsolationLevel.SERIALIZABLE
    ) -> Transaction

    async def close() -> None

# Transaction methods
class Transaction:
    async def execute(
        self,
        query: str,
        parameters: dict[str, Any] | None = None
    ) -> ResultSet

    async def commit() -> None
    async def rollback() -> None
    async def savepoint(name: str) -> Savepoint
```

### Go API Reference

```go
package geode

// Connect to Geode server
func Connect(ctx context.Context, dsn string) (*DB, error)

// DB represents a connection pool
type DB struct {
    // Query executes a query with optional parameters
    func (db *DB) Query(ctx context.Context, query string, args ...any) (*Rows, error)

    // Exec executes a query without returning rows
    func (db *DB) Exec(ctx context.Context, query string, args ...any) (Result, error)

    // Begin starts a new transaction
    func (db *DB) Begin(ctx context.Context) (*Tx, error)

    // Prepare creates a prepared statement
    func (db *DB) Prepare(ctx context.Context, query string) (*Stmt, error)

    // Close closes all connections
    func (db *DB) Close() error
}

// Tx represents a transaction
type Tx struct {
    func (tx *Tx) Query(ctx context.Context, query string, args ...any) (*Rows, error)
    func (tx *Tx) Exec(ctx context.Context, query string, args ...any) (Result, error)
    func (tx *Tx) Commit() error
    func (tx *Tx) Rollback() error
}
```

### Rust API Reference

```rust
// Connection
pub async fn connect(config: ConnectionConfig) -> Result<Connection>

impl Connection {
    // Execute query
    pub async fn execute(
        &self,
        query: &str,
        params: &[(&str, Value)]
    ) -> Result<ResultSet>

    // Prepare statement
    pub async fn prepare(&self, query: &str) -> Result<PreparedStatement>

    // Begin transaction
    pub async fn transaction(&self) -> Result<Transaction>
}

impl Transaction {
    pub async fn execute(
        &self,
        query: &str,
        params: &[(&str, Value)]
    ) -> Result<ResultSet>

    pub async fn commit(self) -> Result<()>
    pub async fn rollback(self) -> Result<()>
    pub async fn savepoint(&self, name: &str) -> Result<Savepoint>
}
```

## Configuration Reference

### Server Configuration

```bash
geode serve [OPTIONS]

Options:
  --listen <ADDR>              Listen address [default: 127.0.0.1:3141]
  --data-dir <PATH>            Data directory [default: ./data]             WAL directory [default: <data-dir>/wal]
  --log-level <LEVEL>          Log level: error|warn|info|debug|trace
  --max-connections <N>        Maximum concurrent connections [default: 1000]
  --query-timeout <DURATION>   Default query timeout [default: 30s]
  --tls-cert <PATH>            TLS certificate file
  --tls-key <PATH>             TLS private key file
  --index-cache-size <SIZE>    Index cache size [default: 1GB]
  --data-cache-size <SIZE>     Data cache size [default: 4GB]
  --checkpoint-interval <DUR>  Checkpoint interval [default: 5m]
  --metrics-port <PORT>        Prometheus metrics port [default: 9090]
  --enable-audit-log           Enable audit logging
  --audit-log-path <PATH>      Audit log file path
```

### Environment Variables

```bash
GEODE_DATA_DIR=/var/lib/geode
GEODE_LOG_LEVEL=info
GEODE_MAX_CONNECTIONS=2000
GEODE_TLS_CERT=/etc/geode/tls/cert.pem
GEODE_TLS_KEY=/etc/geode/tls/key.pem
GEODE_INDEX_CACHE_SIZE=2GB
GEODE_DATA_CACHE_SIZE=8GB
```

### Configuration File

```yaml
# geode.yaml
server:
  listen: "0.0.0.0:3141"
  max_connections: 1000
  query_timeout: 30s

storage:
  data_dir: "/var/lib/geode"
  wal_dir: "/var/lib/geode/wal"

cache:
  index_cache_size: "2GB"
  data_cache_size: "8GB"
  query_plan_cache_size: "256MB"

# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS

performance:
  checkpoint_interval: "5m"
  max_wal_size: "1GB"
  worker_threads: 0  # 0 = number of CPUs

metrics:
  enabled: true
  port: 9090
  path: "/metrics"
```

## System Tables and Metadata

### System Catalog

```gql
-- View all indexes
-- SHOW INDEXES lists name, type, label and properties. Geode keeps no
-- per-index usage counters, scan tallies or health scores.
SHOW INDEXES;

-- View index statistics
-- SHOW INDEXES lists name, type, label and properties. Geode keeps no
-- per-index usage counters, scan tallies or health scores.
SHOW INDEXES;

-- View query log
-- Yields event_id, timestamp, category, action, outcome.
CALL audit.get_recent_events(100);

-- View cache statistics
-- Yields node_count, edge_count, label_count, format_version, page_size,
-- wal_lsn, last_checkpoint_lsn, free_pages_* , *_consistent,
-- label_index_entries and total_errors for the graph.
CALL geode.storage.stats();

-- View active sessions
-- Geode exposes no session catalog.

-- View transaction status
-- Geode exposes no transaction catalog: running transactions cannot be
-- listed, inspected or cancelled from GQL.
```

## Error Codes

Geode uses ISO-standard GQL error codes:

- `00000` - Success
- `22000` - Data exception
- `23000` - Integrity constraint violation
- `42000` - Syntax error or access violation
- `40000` - Transaction rollback
- `40001` - Serialization failure
- `42P01` - Undefined table/label
- `42703` - Undefined property

## Best Practices for API Usage

1. **Use prepared statements**: For queries executed repeatedly with different parameters
2. **Enable connection pooling**: Reuse connections for better performance
3. **Handle errors appropriately**: Implement retry logic for transient failures
4. **Use async APIs**: Take advantage of concurrent query execution
5. **Close resources**: Always close connections and transactions
6. **Monitor performance**: Track query execution times and cache hit rates
7. **Leverage type safety**: Use strongly-typed client library features
8. **Document parameter types**: Ensure parameter values match expected GQL types

## Related Topics

- [GQL Syntax](/tags/gql-syntax/) - Query language syntax details
- [Client Libraries](/docs/client-libraries/) - Language-specific SDKs
- [Configuration](/docs/configuration/) - Server setup and tuning
- [Data Types](/docs/data-types/) - Type system details
- [Functions](/tags/functions/) - Built-in function reference
- [API Documentation](/tags/api-reference/) - Additional API details

## Further Reading

- [ISO GQL Specification](/tags/iso-gql/) - Official standard
- [Protocol Specification](/tags/protocol/) - Wire protocol details
- [Type System](/docs/reference/types/) - Complete type documentation
- [Error Handling](/guides/error-handling/) - Error management patterns
- [Performance Tuning](/docs/performance/) - Optimization techniques
