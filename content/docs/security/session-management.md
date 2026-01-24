---
title: "Session Management Guide"
description: "Complete guide to Geode session management including session parameters, connection pooling, timeout configuration, lifecycle management, and best practices."
summary: "Comprehensive guide covering session parameters (GRAPH, VALUE, BINDING TABLE), connection pooling, timeouts, session state persistence, and advanced session management patterns."
slug: "session-management"
url: "/docs/security/session-management/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 50
keywords: ["session management", "connection pooling", "session parameters", "session state", "connection timeout", "session lifecycle", "GQL session"]
tags: ["security", "sessions", "connections", "configuration"]
categories: ["Security"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/security/session-management/"
    noindex: false
---

## Overview

Geode provides comprehensive session management features for maintaining stateful connections to the database. Sessions enable parameter storage, transaction management, connection pooling, and timeout configuration.

### What You'll Learn

- How to use session parameters (GRAPH, VALUE, BINDING TABLE)
- Connection pooling configuration and best practices
- Session lifecycle and timeout management
- Session state persistence and restoration
- Advanced session patterns for multi-tenant applications

### Prerequisites

- Geode installed (see [Installation Guide](/docs/get-started/install/))
- Basic understanding of database sessions
- Familiarity with GQL query syntax

## Session Parameters

Session parameters allow you to store named values that persist across queries within a session. Geode supports three types of session parameters according to ISO/IEC 39075:2024.

### 1. Graph Parameters

Graph parameters store references to graphs for use in graph pattern queries.

**Syntax**:
```gql
SESSION SET GRAPH [$param_name] = <graph_expression> [IF NOT EXISTS]
```

**Examples**:
```gql
-- Set current graph as parameter
SESSION SET GRAPH $my_graph = CURRENT_GRAPH

-- Set specific graph
SESSION SET GRAPH $social = social_network

-- Conditional set (only if doesn't exist)
SESSION SET GRAPH IF NOT EXISTS $default_graph = main_graph

-- Reference graph parameter in queries (planned feature)
USE GRAPH $my_graph
MATCH (n:Person) RETURN n
```

**Use Cases**:
- Multi-graph applications
- Dynamic graph selection
- Graph isolation for testing
- Multi-tenant graph separation

### 2. Value Parameters

Value parameters store scalar values (integers, strings, booleans, etc.) for use in queries.

**Syntax**:
```gql
SESSION SET VALUE [$param_name] = <expression> [IF NOT EXISTS]
```

**Examples**:
```gql
-- Set integer value
SESSION SET VALUE $counter = 42

-- Set string value
SESSION SET VALUE $username = 'alice'

-- Set boolean value
SESSION SET VALUE $enabled = true

-- Set computed value
SESSION SET VALUE $max_age = 18 * 5  -- 90

-- Conditional set
SESSION SET VALUE IF NOT EXISTS $default_limit = 100
```

**Using in Queries**:
```gql
-- Set parameter
SESSION SET VALUE $min_age = 25

-- Use in query
MATCH (p:Person)
WHERE p.age >= $min_age
RETURN p.name, p.age
ORDER BY p.age DESC
```

**Use Cases**:
- Query parameterization
- Default value configuration
- User preferences
- Application state

### 3. Binding Table Parameters

Binding table parameters store references to binding tables (result sets) for use in queries.

**Syntax**:
```gql
SESSION SET [BINDING] TABLE [$param_name] = <binding_table_ref> [IF NOT EXISTS]
```

**Examples**:
```gql
-- Set binding table
SESSION SET BINDING TABLE $my_table = user_bindings

-- Shorthand syntax (BINDING is optional)
SESSION SET TABLE $results = query_results

-- Store query results
SESSION SET TABLE $active_users = (
  MATCH (u:User)
  WHERE u.active = true
  RETURN u.id, u.name
)

-- Reference in subsequent queries
MATCH (u:User)
WHERE u.id IN $active_users.id
RETURN u
```

**Use Cases**:
- Temporary result storage
- Query composition
- Performance optimization (avoiding repeated queries)
- Complex multi-step analytics

## Session Reset

The `SESSION RESET` command clears session state, including parameters.

**Syntax**:
```gql
SESSION RESET [ALL] PARAMETERS      -- Reset all parameters
SESSION RESET PARAMETERS             -- Same as ALL PARAMETERS
SESSION RESET PARAMETER $name        -- Reset specific parameter
SESSION RESET GRAPH                  -- Reset current graph
SESSION RESET TIME ZONE              -- Reset time zone
SESSION RESET                        -- Reset all session state
```

**Examples**:
```gql
-- Reset all parameters
SESSION RESET ALL PARAMETERS

-- Reset specific parameter
SESSION SET VALUE $temp = 123
SESSION RESET PARAMETER $temp

-- Reset graph setting
SESSION SET GRAPH $g = my_graph
SESSION RESET GRAPH

-- Reset time zone
SESSION SET TIME ZONE 'America/New_York'
SESSION RESET TIME ZONE

-- Reset everything
SESSION RESET
```

**What Gets Reset**:
- All session parameters (GRAPH, VALUE, TABLE)
- Current graph selection
- Time zone setting
- Transaction state (if applicable)
- Custom session variables

## Connection Pooling

### Client-Side Pooling

All Geode clients support connection pooling for optimal resource utilization and performance.

#### Go Client Pooling

```go
import "go.codepros.org/geode"

// Create connection pool
pool, err := geode.NewConnectionPool(&geode.PoolConfig{
    Address:         "localhost:3141",
    MinConnections:  5,
    MaxConnections:  50,
    IdleTimeout:     time.Minute * 10,
    ConnectTimeout:  time.Second * 30,
    MaxLifetime:     time.Hour,
})
if err != nil {
    log.Fatal(err)
}
defer pool.Close()

// Execute queries (automatically uses pooled connections)
result, err := pool.Query(ctx, "MATCH (n:Person) RETURN n LIMIT 10")
```

**Configuration**:
- `MinConnections`: Minimum pool size (default: 5)
- `MaxConnections`: Maximum pool size (default: 100)
- `IdleTimeout`: Close idle connections after this duration
- `ConnectTimeout`: Connection establishment timeout
- `MaxLifetime`: Maximum connection lifetime

#### Python Client Pooling

```python
from geode_client import ConnectionPool

# Create connection pool (async)
pool = await ConnectionPool.create(
    host='localhost',
    port=3141,
    min_connections=5,
    max_connections=50,
    idle_timeout=600,  # 10 minutes
    max_lifetime=3600,  # 1 hour
)

# Execute queries (async)
async with pool.acquire() as conn:
    result = await conn.query("MATCH (n:Person) RETURN n LIMIT 10")

# Cleanup
await pool.close()
```

**Performance**: 1000+ queries/second with connection reuse

#### Rust Client Pooling

```rust
use geode_client::{ConnectionPool, PoolConfig};

// Create connection pool
let pool = ConnectionPool::new(PoolConfig {
    address: "localhost:3141".to_string(),
    min_connections: 10,
    max_connections: 100,
    idle_timeout: Duration::from_secs(600),
    connect_timeout: Duration::from_secs(30),
    max_lifetime: Duration::from_secs(3600),
}).await?;

// Execute queries
let result = pool.query("MATCH (n:Person) RETURN n LIMIT 10").await?;
```

**Performance**: 10,000+ queries/second with tokio runtime

#### Zig Client Pooling

```zig
const geode = @import("geode_client");

// Create connection pool
var pool = try geode.ConnectionPool.init(allocator, .{
    .address = "localhost:3141",
    .min_connections = 5,
    .max_connections = 50,
    .idle_timeout_ms = 600_000,  // 10 minutes
    .max_lifetime_ms = 3_600_000, // 1 hour
});
defer pool.deinit();

// Execute queries
const result = try pool.query("MATCH (n:Person) RETURN n LIMIT 10");
defer result.deinit();
```

### Server-Side Configuration

Configure server-side connection limits:

```yaml
# geode.yaml
network:
  max_connections: 5000
  connection_timeout: 60s
  idle_timeout: 300s

performance:
  worker_threads: 16
  max_concurrent_queries: 1000
```

**Command-Line**:
```bash
geode serve \
  --max-connections 5000 \
  --connection-timeout 60s \
  --idle-timeout 300s \
  --worker-threads 16
```

**Environment Variables**:
```bash
export GEODE_MAX_CONNECTIONS=5000
export GEODE_CONNECTION_TIMEOUT=60s
export GEODE_IDLE_TIMEOUT=300s
```

## Timeout Configuration

### Connection Timeout

Time limit for establishing a connection:

```yaml
# Server configuration
network:
  connection_timeout: 30s
```

**Client Configuration**:
```go
// Go
config := &geode.Config{
    ConnectTimeout: 30 * time.Second,
}
```

```python
# Python
config = ConnectionConfig(
    connect_timeout=30.0,
)
```

### Query Timeout

Time limit for query execution:

```yaml
# Server configuration
performance:
  query_timeout: 300s  # 5 minutes
  default_timeout: 60s # Default for queries without explicit timeout
```

**Client-Side Timeout**:
```go
// Go: Context-based timeout
ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
defer cancel()

result, err := conn.Query(ctx, "MATCH (n) RETURN count(n)")
```

```python
# Python: asyncio timeout
result = await asyncio.wait_for(
    conn.query("MATCH (n) RETURN count(n)"),
    timeout=60.0
)
```

### Idle Timeout

Close connections idle for this duration:

```yaml
# Server configuration
network:
  idle_timeout: 600s  # 10 minutes
```

**Behavior**:
- Server monitors idle connections
- Connections inactive for `idle_timeout` are closed
- Client pools automatically reconnect as needed
- Prevents resource exhaustion from abandoned connections

### Transaction Timeout

Time limit for transaction duration:

```yaml
# Server configuration
transactions:
  timeout: 3600s  # 1 hour
  idle_timeout: 300s  # 5 minutes
```

**Example**:
```gql
-- Begin transaction
BEGIN TRANSACTION

-- Long-running operations
MATCH (n:Person) SET n.processed = true

-- Must complete within transaction_timeout
COMMIT
```

## Session Lifecycle

### Session Creation

Sessions are created automatically on first connection:

```go
// Go: Connect creates session
conn, err := geode.Connect("localhost:3141")
// Session ID assigned automatically
```

**Session ID Format**: UUID v4 (e.g., `550e8400-e29b-41d4-a716-446655440000`)

### Session State

Each session maintains:

1. **Parameters**: User-defined variables ($param_name)
2. **Transaction State**: Active transaction (if any)
3. **Current Graph**: Selected graph context
4. **Time Zone**: Session time zone setting
5. **Connection Metadata**: Client info, connection time

### Session Persistence

Session state persists until:
- Explicit `SESSION RESET` command
- Connection closed
- Session timeout (server-side)
- Server restart (sessions not persisted across restarts)

### Session Cleanup

**Graceful Cleanup**:
```go
// Go: Explicit cleanup
defer conn.Close()
```

```python
# Python: Context manager
async with pool.acquire() as conn:
    # Session automatically cleaned up on exit
    pass
```

**Server-Side Cleanup**:
- Idle sessions cleaned up after `idle_timeout`
- Abandoned transactions rolled back after `transaction_timeout`
- Resources released (memory, file handles)

## Advanced Session Patterns

### Multi-Tenant Sessions

Isolate tenants using session parameters:

```gql
-- Set tenant context
SESSION SET VALUE $tenant_id = 'acme-corp'

-- Automatically filter by tenant
MATCH (n:Customer)
WHERE n.tenant_id = $tenant_id
RETURN n
```

**Enforcement with Row-Level Security**:
```gql
-- Policy automatically applied
CREATE POLICY tenant_isolation FOR Customer
USING (tenant_id = session_parameter('tenant_id'))
```

### Session-Based Caching

Cache query results in session:

```gql
-- First query: expensive computation
SESSION SET TABLE $recent_orders = (
  MATCH (o:Order)
  WHERE o.timestamp > datetime() - duration('P7D')
  RETURN o.id, o.customer_id, o.total
)

-- Subsequent queries: use cached results
MATCH (c:Customer)
WHERE c.id IN $recent_orders.customer_id
RETURN c.name, sum($recent_orders.total) AS total_spent
```

### Session State Snapshots

Save and restore session state:

```gql
-- Save current state
SESSION SET VALUE $saved_graph = CURRENT_GRAPH
SESSION SET VALUE $saved_tz = CURRENT_TIMEZONE

-- Make temporary changes
USE GRAPH temp_graph
SET TIME ZONE 'UTC'

-- Restore state
USE GRAPH $saved_graph
SET TIME ZONE $saved_tz
```

### Stateful Workflows

Implement multi-step workflows:

```gql
-- Step 1: Initialize workflow
SESSION SET VALUE $workflow_id = uuid()
SESSION SET VALUE $step = 1

-- Step 2: Process data
MATCH (n:RawData)
WHERE n.workflow_id = $workflow_id
CREATE (p:ProcessedData {
  id: uuid(),
  workflow_id: $workflow_id,
  step: $step,
  data: n.data
})
SESSION SET VALUE $step = $step + 1

-- Step 3: Validate
MATCH (p:ProcessedData)
WHERE p.workflow_id = $workflow_id AND p.step = $step - 1
-- Validation logic...

-- Step 4: Finalize
SESSION RESET PARAMETERS
```

## Session Security

### Parameter Validation

Always validate session parameters:

```gql
-- ❌ Unsafe: No validation
SESSION SET VALUE $user_input = $raw_input

-- ✅ Safe: Validate before setting
SESSION SET VALUE $validated_age =
  CASE
    WHEN $user_input >= 0 AND $user_input <= 150
    THEN $user_input
    ELSE NULL
  END
```

### Session Hijacking Prevention

**Server-Side Protection**:
- TLS 1.3 required (encrypted transport)
- Session IDs cryptographically random
- Session binding to client IP (optional)
- Session timeout enforcement

**Client-Side Best Practices**:
```go
// Go: Secure configuration
config := &geode.Config{
    TLS: true,
    VerifyCertificate: true,
    SessionTimeout: 3600, // 1 hour
}
```

### Sensitive Data Handling

Avoid storing sensitive data in session parameters:

```gql
-- ❌ Unsafe: Password in session
SESSION SET VALUE $password = 'secret123'

-- ✅ Safe: Use secure parameter passing
MATCH (u:User)
WHERE u.username = $username
  AND verify_password(u.password_hash, $password)
RETURN u
-- $password passed via prepared statement, not stored
```

## Monitoring and Debugging

### Session Inspection

Query current session state:

```gql
-- Show current session parameters
SHOW SESSION PARAMETERS

-- Show current graph
SHOW CURRENT_GRAPH

-- Show time zone
SHOW TIME ZONE

-- Show session info
SHOW SESSION INFO
```

### Session Metrics

Monitor session activity (server-side):

```bash
# Prometheus metrics endpoint
curl http://localhost:9090/metrics | grep session

# Example metrics:
# geode_active_sessions{} 42
# geode_session_create_total{} 1234
# geode_session_timeout_total{} 5
# geode_avg_session_duration_seconds{} 180.5
```

### Session Logging

Enable session debugging:

```yaml
# geode.yaml
logging:
  level: debug
  modules:
    session: trace
```

**Log Output**:
```
[SESSION] Created session: 550e8400-e29b-41d4-a716-446655440000
[SESSION] Set parameter: $username = 'alice'
[SESSION] Transaction started
[SESSION] Transaction committed
[SESSION] Idle timeout: closing session
```

## Troubleshooting

### Connection Pool Exhaustion

**Symptom**: "Connection pool exhausted" error

**Solutions**:
1. Increase `max_connections`:
   ```go
   config.MaxConnections = 200
   ```

2. Decrease `idle_timeout` to reclaim connections faster:
   ```go
   config.IdleTimeout = 5 * time.Minute
   ```

3. Check for connection leaks:
   ```go
   // Always close connections
   defer conn.Close()
   ```

### Session Timeout

**Symptom**: "Session expired" or "Session not found" error

**Solutions**:
1. Increase session timeout:
   ```yaml
   network:
     idle_timeout: 1800s  # 30 minutes
   ```

2. Use keep-alive queries:
   ```go
   ticker := time.NewTicker(5 * time.Minute)
   go func() {
       for range ticker.C {
           conn.Query(ctx, "RETURN 1")  // Keep-alive
       }
   }()
   ```

3. Re-establish connection on timeout:
   ```go
   if err == geode.ErrSessionExpired {
       conn, err = geode.Connect(address)
   }
   ```

### Parameter Not Found

**Symptom**: "Parameter $name not found" error

**Solutions**:
1. Set parameter before use:
   ```gql
   SESSION SET VALUE $name = 'Alice'
   MATCH (n:Person) WHERE n.name = $name RETURN n
   ```

2. Use `IF NOT EXISTS` for default values:
   ```gql
   SESSION SET VALUE IF NOT EXISTS $limit = 100
   ```

3. Check parameter scope (session-local):
   ```gql
   -- Different sessions have different parameters
   SESSION RESET PARAMETERS  -- Clears all
   ```

## Best Practices

### Connection Lifecycle

1. **Use connection pooling** for multi-user applications
2. **Always close connections** explicitly (defer in Go, context managers in Python)
3. **Set appropriate timeouts** based on workload
4. **Monitor pool metrics** (active connections, wait time, etc.)

### Parameter Management

1. **Name parameters clearly**: `$user_id` not `$x`
2. **Validate inputs** before setting parameters
3. **Use IF NOT EXISTS** for default values
4. **Reset parameters** after workflows complete
5. **Document parameter contracts** for team consistency

### Performance Optimization

1. **Reuse connections** via pooling (10-100x faster than creating new connections)
2. **Batch queries** when possible to reduce round-trips
3. **Use prepared statements** for repeated queries
4. **Set realistic timeouts** (too short = failures, too long = resource waste)
5. **Monitor session duration** and optimize long-running sessions

### Security Hardening

1. **Always use TLS** for production
2. **Validate all session parameters** from user input
3. **Implement session timeout** to limit exposure
4. **Audit session creation/destruction** for compliance
5. **Use row-level security** with session parameters for multi-tenancy

## Next Steps

**Explore More**:
- [Transaction Management](/docs/transactions/overview/) - ACID transactions
- [Connection Pooling](/docs/client-libraries/) - Client-specific pooling
- [Security Overview](/docs/security/overview/) - Authentication and authorization

**Related Topics**:
- [Row-Level Security](/docs/security/overview/#row-level-security) - Policy-based access control
- [Monitoring](/docs/ops/observability/) - Session metrics and monitoring
- [Performance Tuning](/docs/query/performance-tuning/) - Optimize query and session performance

**Client Libraries**:
- [Go Client](/docs/client-libraries/go-client/) - Go connection pooling
- [Python Client](/docs/client-libraries/python-client/) - Python async pooling
- [Rust Client](/docs/client-libraries/rust-client/) - Rust tokio pooling

---

**ISO Standard**: ISO/IEC 39075:2024 §15.3-15.4
**Session Types**: GRAPH, VALUE, BINDING TABLE parameters
**Pooling**: All 4 client libraries (Go, Python, Rust, Zig)
**Status**: Production-ready
