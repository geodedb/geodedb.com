---
title: "Session Management"
description: "Complete guide to session management in Geode. Learn about session lifecycle, state management, timeout configuration, concurrent sessions, and best practices for scalable graph database applications."
keywords:
  - session management
  - session lifecycle
  - session state
  - session timeout
  - concurrent sessions
  - session security
  - connection sessions
  - Geode
  - graph database
  - stateful connections
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/sessions/"
    noindex: false
    title: "Session Management - Geode Graph Database"
    description: "Manage database sessions in Geode effectively. Configure session timeouts, handle state, manage concurrent sessions, and implement best practices for enterprise applications."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Session management in Geode provides stateful connections between clients and the database server, maintaining context for authentication, transactions, temporary data, and user preferences. Proper session management is essential for security, resource efficiency, and application scalability.

## Session Fundamentals

A session in Geode represents a stateful connection between a client and the server, maintaining:

- **Authentication Context**: User identity and permissions
- **Transaction State**: Active transactions and savepoints
- **Session Variables**: User-defined configuration and state
- **Temporary Objects**: Session-scoped temporary tables and data
- **Query History**: Recently executed queries for caching
- **Connection Metadata**: Client information and connection details

### Session Lifecycle

1. **Connection**: Client establishes QUIC connection to server
2. **Authentication**: Client authenticates with credentials
3. **Session Creation**: Server creates session with unique identifier
4. **Active Usage**: Client executes queries, manages transactions
5. **Idle Period**: Session remains open but inactive
6. **Termination**: Session closed gracefully or by timeout

## Creating and Managing Sessions

### Client-Side Session Management

**Python Client**

```python
from geode_client import Client

client = Client(host="geode.example.com", port=3141, skip_verify=True)

async with client.connection() as conn:
    # Session parameters use the ISO GQL SESSION SET VALUE form.
    # `SET SESSION <name> = ...` with a bare identifier is not valid GQL.
    await conn.execute("SESSION SET VALUE $tenant_id = 'tenant_123'")

    # Start transaction within the session
    await conn.begin()
    try:
        await conn.execute("CREATE (:Person {name: 'Bob'})")
        await conn.commit()
    except Exception:
        await conn.rollback()
        raise

    # Session variables persist for the connection lifetime
    result, _ = await conn.query("RETURN $tenant_id AS tenant_id")
    tenant_id = result.rows[0]["tenant_id"].as_string
```

**Go Client**

```go
import (
    "context"
    "database/sql"
    "log"

    _ "geodedb.com/geode"
)

db, err := sql.Open("geode", "quic://geode.example.com:3141")
if err != nil {
    log.Fatal(err)
}
defer db.Close()

// Set session variables
_, err = db.ExecContext(context.Background(), "SESSION SET VALUE $tenant_id = 'tenant_123'")

// Execute queries in session context
rows, err := db.QueryContext(
    context.Background(),
    "MATCH (p:Person) WHERE p.tenant_id = $tenant_id RETURN p",
)
```

**Rust Client**

```rust
use geode_client::Client;

let client = Client::new("geode.example.com", 3141).skip_verify(true);
let mut conn = client.connect().await?;

conn.query("SESSION SET VALUE $tenant_id = 'tenant_123'").await?;
let (page, _) = conn
    .query("MATCH (p:Person) WHERE p.tenant_id = $tenant_id RETURN p")
    .await?;
```

### Server-Side Session Configuration

```bash
# Configure session behavior
geode serve --session-timeout=1800 \
  --session-max-idle=900 \
  --session-max-lifetime=86400 \
  --persistent-sessions=true \
  --session-storage=redis
```

Configuration file:

```yaml
sessions:
  timeout: 1800  # 30 minutes
  max_idle: 900   # 15 minutes
  max_lifetime: 86400  # 24 hours
  max_per_user: 5
  persistent: true

  storage:
    backend: "redis"
    redis:
      url: "redis://redis.example.com:6379/0"
      password_file: "/etc/geode/secrets/redis-password.txt"
      tls: true
      pool_size: 100
```

## Session Variables

Store session-specific configuration and state:

### Setting Session Variables

```gql
-- Set session variables
SET SESSION tenant_id = 'tenant_123';
SET SESSION language = 'en-US';
SET SESSION timezone = 'America/New_York';
SET SESSION isolation_level = 'SNAPSHOT';
SET SESSION query_timeout = 300;

-- Set multiple variables
SET SESSION {
  tenant_id: 'tenant_123',
  department: 'Engineering',
  role: 'Developer'
};
```

### Reading Session Variables

```gql
-- Get specific variable
RETURN current_session_var('tenant_id');

-- Get all session variables
SHOW SESSION VARIABLES;

-- Use in queries
MATCH (p:Person)
WHERE p.tenant_id = current_session_var('tenant_id')
RETURN p;
```

### Resetting Session Variables

```gql
-- Reset specific variable
RESET SESSION tenant_id;

-- Reset all variables
RESET SESSION ALL;
```

### Session Variable Scope

Session variables are accessible to:

- All queries in the session
- All transactions in the session
- Row-Level Security policies
- User-defined functions called within the session

## Session Timeout Management

### Idle Timeout

Sessions terminated after period of inactivity:

```yaml
sessions:
  max_idle: 900  # Terminate after 15 minutes of inactivity

  idle_timeout_warning:
    enabled: true
    warning_seconds: 60  # Warn client 60 seconds before timeout
```

Client receives warning before timeout:

```python
import asyncio

async with client.connection() as conn:
    while True:
        await conn.query("RETURN 1 AS ok")
        await asyncio.sleep(300)
```

### Absolute Timeout

Maximum session lifetime regardless of activity:

```yaml
sessions:
  max_lifetime: 86400  # 24 hours maximum
  enforce_max_lifetime: true
```

### Keep-Alive

Prevent timeout with periodic ping:

```python
# Application-level keep-alive (periodic query)
import asyncio

client = Client(host="geode.example.com", port=3141, skip_verify=True)
async with client.connection() as conn:
    while True:
        await conn.query("RETURN 1 AS ok")
        await asyncio.sleep(300)
```

Manual ping:

```gql
-- Send explicit ping
PING;
-- Response: PONG
```

## Concurrent Session Management

### Maximum Sessions Per User

```yaml
sessions:
  max_per_user: 5
  exceed_policy: "terminate_oldest"  # terminate_oldest, deny_new, allow_all
```

When limit exceeded:

- **terminate_oldest**: Oldest session automatically closed
- **deny_new**: New session creation denied
- **allow_all**: No limit enforced (not recommended)

### Session Prioritization

```gql
-- Create high-priority session
SET SESSION priority = 'high';

-- Low-priority sessions may be terminated first under resource pressure
```

### Viewing Active Sessions

```bash
# List all active sessions
geode sessions list

# Example output:
# Session ID          | User              | Connected      | Last Active | Queries
# sess_abc123        | alice@example.com | 2h 15m ago     | 5m ago      | 1,234
# sess_def456        | bob@example.com   | 45m ago        | 45m ago     | 67
# sess_ghi789        | carol@example.com | 10m ago        | 2m ago      | 345

# Filter sessions
geode sessions list --user=alice@example.com
geode sessions list --idle-longer-than=30m
```

### Terminating Sessions

```bash
# Terminate specific session
geode sessions kill --session-id=sess_abc123

# Terminate all sessions for user
geode sessions kill --user=alice@example.com

# Terminate idle sessions
geode sessions cleanup --idle-timeout=1800

# Graceful termination with warning
geode sessions kill --session-id=sess_abc123 --graceful --warning-seconds=60
```

## Session Persistence

### Persistent Sessions

Sessions survive server restarts:

```yaml
sessions:
  persistent: true
  storage:
    backend: "redis"  # redis, postgresql, file

    redis:
      url: "redis://redis.example.com:6379/0"
      password_file: "/etc/geode/secrets/redis-password.txt"
      key_prefix: "geode:session:"
      ttl: 86400

    # Alternative: PostgreSQL
    # postgresql:
    #   connection: "postgresql://geode:password@db.example.com/sessions"
    #   table: "geode_sessions"

    # Alternative: File-based (development only)
    # file:
    #   directory: "/var/lib/geode/sessions"
```

Client reconnection after server restart:

```python
# Client automatically reconnects to existing session
client = Client(
    host='geode.example.com',
    session_id='sess_abc123',  # Reuse existing session
    auto_reconnect=True
)
```

## Transaction Sessions

### Session-Scoped Transactions

```gql
-- Begin transaction in session
BEGIN;

-- Transaction state maintained in session
CREATE (:Person {name: 'Alice'});

-- Connection can be lost and restored
-- Transaction state persists in session

-- Complete transaction
COMMIT;
```

### Savepoints

```gql
BEGIN;

CREATE (:Person {name: 'Bob'});

-- Create savepoint
SAVEPOINT after_bob;

CREATE (:Person {name: 'Carol'});

-- Rollback to savepoint
ROLLBACK TO SAVEPOINT after_bob;

-- Bob exists, Carol does not
COMMIT;
```

## Temporary Objects

### Session-Scoped Temporary Data

```gql
-- Create temporary table for session
CREATE TEMPORARY TABLE session_data (
  key STRING,
  value STRING
);

-- Insert data visible only in this session
INSERT INTO session_data VALUES ('temp_key', 'temp_value');

-- Query temporary data
SELECT * FROM session_data;

-- Temporary table automatically dropped when session ends
```

### Temporary Graphs

```gql
-- Create temporary graph for analysis
CREATE TEMPORARY GRAPH analysis_graph;

-- Load data into temporary graph
INSERT INTO analysis_graph
  MATCH (p:Person)-[:KNOWS]->(f:Person)
  RETURN p, f;

-- Analyze in temporary graph
USE GRAPH analysis_graph;
MATCH (p:Person)
RETURN count(p);

-- Temporary graph automatically removed when session ends
```

## Session Security

### Session Token Security

```python
# Sessions use secure tokens
client = Client(
    host='geode.example.com',
    username='alice@example.com',
    password='SecurePassword'
)

# Server returns session token
# Token format: sess_<cryptographically_secure_random_string>
# Token entropy: 256 bits
# Token rotation: Automatic on sensitive operations
```

### Session Hijacking Prevention

```yaml
sessions:
  security:
    # Bind session to IP address
    bind_to_ip: true

    # Bind session to client certificate
    bind_to_certificate: true

    # Require periodic re-authentication
    reauth_interval: 3600  # Re-auth every hour

    # Detect suspicious session activity
    anomaly_detection: true
    terminate_on_anomaly: true
```

### Session Audit Logging

```yaml
audit:
  sessions:
    log_creation: true
    log_termination: true
    log_timeout: true
    log_variable_changes: true
    log_authentication: true
```

Example audit log:

```json
{
  "event": "session_created",
  "session_id": "sess_abc123",
  "user": "alice@example.com",
  "ip_address": "192.168.1.100",
  "timestamp": "2026-01-24T10:15:32.123Z",
  "client_info": {
    "user_agent": "geode-client-python/0.3.19",
    "platform": "linux"
  }
}
```

## Session Monitoring

### Session Metrics

```bash
# View session statistics
geode stats --component=sessions

# Example output:
# Active Sessions: 1,247
# Peak Sessions (24h): 2,456
# Average Session Duration: 45m 32s
# Sessions Terminated by Timeout: 234
# Average Queries per Session: 127
# Session Pool Utilization: 62%
```

### Session Alerts

```yaml
# NOTE: `monitoring:` is not a configuration-file section — it is ignored.
# The Prometheus listener is opt-in and env-only:
#   GEODE_METRICS_PORT=9090   (serves /metrics and /health)
#   GEODE_METRICS_BIND=127.0.0.1

      - name: "session_timeout_spike"
        condition: "timeout_rate > 100/minute"
        severity: "critical"

      - name: "long_running_session"
        condition: "session_duration > 86400"
        severity: "info"
```

## Best Practices

1. **Use Connection Pooling**: Pool sessions at application layer for efficiency
2. **Set Appropriate Timeouts**: Balance security with user experience
3. **Clean Up Sessions**: Explicitly close sessions when done
4. **Use Session Variables Wisely**: Store only necessary context, not large data
5. **Enable Persistence for Critical Applications**: Prevent data loss on server restart
6. **Monitor Session Metrics**: Track session usage patterns and anomalies
7. **Implement Graceful Degradation**: Handle session timeout gracefully in application
8. **Secure Session Tokens**: Never expose session tokens in logs or URLs
9. **Limit Concurrent Sessions**: Prevent resource exhaustion from single user
10. **Regular Cleanup**: Remove orphaned sessions periodically

## Troubleshooting

### Session Timeout Issues

```bash
# Check session timeout settings
geode config show sessions.timeout

# View sessions by age
geode sessions list --sort-by=age --limit=10

# Identify frequent timeout users
geode sessions analyze --metric=timeouts --group-by=user
```

### Session Leaks

```bash
# Find long-running sessions
geode sessions list --min-duration=24h

# Find sessions with no recent activity
geode sessions list --idle-longer-than=1h

# Force cleanup
geode sessions cleanup --force --dry-run
geode sessions cleanup --force
```

### Session Performance

```bash
# Profile session overhead
geode profile --component=sessions --duration=60s

# Identify slow session operations
geode sessions analyze --metric=query-latency
```

## Related Topics

- [Connections](/tags/connections/) - Connection management and pooling
- [Authentication](/docs/security/authentication/) - User authentication and identity
- [Transactions](/tags/transactions/) - Transaction management within sessions
- [Configuration](/tags/configuration/) - Session configuration options
- [Audit Logging](/tags/audit-logging/) - Session activity auditing
- [Security](/docs/security/) - Session security best practices
- [Monitoring](/docs/operations/monitoring/) - Monitoring session health
- [Client Libraries](/docs/client-libraries/) - Language-specific session management
