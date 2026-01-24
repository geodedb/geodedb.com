---
title: "Debugging and Troubleshooting"
description: "Comprehensive debugging guide for Geode including query debugging, connection issues, performance problems, error diagnosis, logging, tracing, and troubleshooting techniques."
keywords:
  - debugging
  - troubleshooting
  - error diagnosis
  - query debugging
  - logging
  - tracing
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/debugging/"
    noindex: false
---

Debugging and troubleshooting documentation for Geode covering query debugging, connection issues, performance problems, error diagnosis, logging configuration, distributed tracing, and systematic troubleshooting approaches.

## Query Debugging

### Using EXPLAIN

Understand query execution without running it:

```gql
EXPLAIN
MATCH (u:User {email: $email})-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN p.name, p.price
ORDER BY p.price DESC
```

Output shows:
- Execution plan operators
- Index usage
- Estimated cardinalities
- Join strategies

### Using PROFILE

Measure actual query performance:

```gql
PROFILE
MATCH (u:User)-[:FOLLOWS*2..3]->(recommendation:User)
WHERE NOT EXISTS {MATCH (u)-[:FOLLOWS]->(recommendation)}
RETURN recommendation.name, COUNT(*) AS score
ORDER BY score DESC
LIMIT 10
```

Profile provides:
- Actual execution times per operator
- Actual vs. estimated row counts
- Memory usage
- Cache hits/misses

### Debugging Slow Queries

Step-by-step approach:

```python
import geode_client

async def debug_slow_query(client, query, params=None):
    """Debug slow query execution."""

    # Step 1: Profile the query
    profiled = await client.execute(f"PROFILE {query}", params)
    print("=== Profile Results ===")
    print_profile(profiled)

    # Step 2: Check for full table scans
    explained = await client.execute(f"EXPLAIN {query}", params)
    if has_full_scan(explained):
        print("WARNING: Query contains full table scan")
        print("Consider adding index on scanned properties")

    # Step 3: Verify index usage
    indexes = await client.execute("SHOW INDEXES")
    print("=== Available Indexes ===")
    for idx in indexes:
        print(f"  {idx['name']}: {idx['columns']}")

    # Step 4: Check statistics freshness
    stats = await client.execute("SELECT * FROM system.statistics")
    if is_stale(stats):
        print("WARNING: Statistics may be outdated")
        print("Run: ANALYZE")
```

### Common Query Issues

**Issue: Unexpected results count**

```python
# Check what's actually matching
result = await client.execute("""
    MATCH (u:User)
    WHERE u.email = $email
    RETURN COUNT(*) AS user_count
""", {"email": "alice@example.com"})

print(f"Found {result[0]['user_count']} users")  # Expected 1, got 0

# Debug: Check exact data
all_users = await client.execute("MATCH (u:User) RETURN u.email")
print("All emails:", [u["u.email"] for u in all_users])

# Common issues:
# - Email case sensitivity: use lower() function
# - Whitespace: use trim()
# - Wrong parameter name
```

**Issue: Empty result set**

```gql
-- Original query returns nothing
MATCH (a:User {name: 'Alice'})-[:KNOWS]->(b:User)
RETURN b.name

-- Debug step 1: Check if Alice exists
MATCH (a:User)
WHERE a.name = 'Alice'
RETURN a

-- Debug step 2: Check if relationships exist
MATCH (a:User {name: 'Alice'})-[r]-()
RETURN type(r), count(r)

-- Debug step 3: Check relationship direction
MATCH (a:User {name: 'Alice'})<-[:KNOWS]-(b:User)
RETURN b.name  -- Try reverse direction
```

## Connection Debugging

### Connection Issues

**Cannot connect to server**:

```python
import geode_client
import logging

logging.basicConfig(level=logging.DEBUG)

try:
    client = await geode_client.connect(
        "localhost:3141",
        timeout=5.0
    )
except ConnectionError as e:
    print(f"Connection failed: {e}")

    # Check:
    # 1. Is server running? `ps aux | grep geode`
    # 2. Is port correct? Default is 3141
    # 3. Firewall blocking? `telnet localhost 3141`
    # 4. TLS certificate issues?
```

**TLS/Certificate errors**:

```python
# Disable certificate verification (dev only!)
client = await geode_client.connect(
    "localhost:3141",
    tls=True,
    verify_cert=False  # NEVER use in production
)

# Or provide correct certificate
client = await geode_client.connect(
    "localhost:3141",
    tls=True,
    ca_cert="/path/to/ca.pem"
)
```

**Connection timeouts**:

```python
# Increase timeout
client = await geode_client.connect(
    "localhost:3141",
    timeout=60.0  # 60 seconds
)

# Enable keep-alive
client = await geode_client.connect(
    "localhost:3141",
    keep_alive=True,
    keep_alive_interval=30.0
)
```

### Authentication Issues

```python
try:
    client = await geode_client.connect(
        "localhost:3141",
        username="alice",
        password="wrong_password"
    )
except AuthenticationError as e:
    print(f"Authentication failed: {e}")

    # Check:
    # 1. Username correct?
    # 2. Password correct?
    # 3. User exists in Geode?
    # 4. Check server logs for auth failures
```

## Performance Debugging

### Identifying Bottlenecks

**Monitor query execution**:

```gql
-- View slow queries
SELECT
    query_id,
    query_text,
    execution_time_ms,
    rows_returned
FROM system.query_log
WHERE execution_time_ms > 1000
ORDER BY execution_time_ms DESC
LIMIT 20
```

**Check resource usage**:

```gql
-- Cache hit rates
SELECT * FROM system.cache_statistics

-- Active connections
SELECT COUNT(*) FROM system.sessions WHERE active = true

-- Lock contention
SELECT * FROM system.locks WHERE waiting = true
```

### Memory Issues

**Out of memory errors**:

```python
# Reduce result set size
result = await client.execute("""
    MATCH (n:Node)
    RETURN n
    LIMIT 10000  -- Add limit
""")

# Use pagination
offset = 0
page_size = 1000
while True:
    page = await client.execute("""
        MATCH (n:Node)
        RETURN n
        ORDER BY n.id
        SKIP $offset
        LIMIT $page_size
    """, {"offset": offset, "page_size": page_size})

    if not page:
        break

    process_page(page)
    offset += page_size
```

**Check server memory**:

```bash
# Server status
./geode status

# System memory
free -h

# Geode process memory
ps aux | grep geode
```

## Error Diagnosis

### Understanding Error Messages

**Syntax errors**:

```
Error: Syntax error at line 2, column 15
  MATCH (u:User)
  WERE u.name = 'Alice'
  ^~~~
Expected: WHERE
```

Fix: Correct typo (`WERE` → `WHERE`)

**Constraint violations**:

```
Error: Constraint violation: Unique constraint violated
  Index: user_email_unique
  Value: 'alice@example.com' already exists
```

Fix: Check for existing data before INSERT, or use MERGE

**Transaction conflicts**:

```
Error: Transaction aborted due to serialization failure
  Conflicting transaction: txn_456
  Retry recommended
```

Fix: Implement retry logic with exponential backoff

### Error Handling Patterns

**Python error handling**:

```python
from geode_client import (
    GeodeError,
    SyntaxError,
    ConstraintViolationError,
    TransactionConflictError
)

async def execute_with_retry(client, query, params=None, max_retries=3):
    """Execute query with automatic retry on conflicts."""
    for attempt in range(max_retries):
        try:
            return await client.execute(query, params)
        except TransactionConflictError:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
        except SyntaxError as e:
            # Don't retry syntax errors
            logging.error(f"Syntax error: {e}")
            raise
        except ConstraintViolationError as e:
            # Handle constraint violations
            logging.warning(f"Constraint violation: {e}")
            raise
```

## Logging and Monitoring

### Client-Side Logging

**Python logging**:

```python
import logging

# Enable debug logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Geode client logs all operations
client = await geode_client.connect("localhost:3141")

# Custom logging
logger = logging.getLogger("myapp")
logger.info("Executing user query")
result = await client.execute("MATCH (u:User) RETURN count(u)")
logger.info(f"Found {result[0]['count(u)']} users")
```

**Go logging**:

```go
import (
    "log"
    "go.codepros.org/geode"
)

// Enable debug logging
geode.SetLogLevel(geode.LogLevelDebug)

// Execute with logging
log.Println("Connecting to Geode")
db, err := geode.Connect(ctx, "localhost:3141")
if err != nil {
    log.Fatalf("Connection failed: %v", err)
}
```

### Server-Side Logging

**Configure log level**:

```bash
# Start server with debug logging
./geode serve --log-level debug

# Or in config
# geode.yaml
logging:
  level: debug
  file: /var/log/geode/geode.log
  rotate: true
  max_size: 100MB
  max_files: 10
```

**Log categories**:
- `query`: Query execution
- `transaction`: Transaction lifecycle
- `storage`: Storage operations
- `network`: Network communication
- `auth`: Authentication/authorization

### Distributed Tracing

**Enable tracing with OpenTelemetry**:

```python
from opentelemetry import trace
from opentelemetry.instrumentation.geode import GeodeInstrumentor

# Initialize tracing
tracer_provider = trace.TracerProvider()
trace.set_tracer_provider(tracer_provider)

# Instrument Geode client
GeodeInstrumentor().instrument()

# Queries automatically traced
async with tracer.start_as_current_span("user_query"):
    result = await client.execute("MATCH (u:User) RETURN u")
```

## Troubleshooting Checklist

### Before Filing Bug Report

1. **Reproduce the issue**: Can you consistently trigger it?
2. **Check version**: `./geode version` - Is it the latest?
3. **Review logs**: Server and client logs for errors
4. **Isolate the problem**: Minimal reproducible example
5. **Check documentation**: Is this expected behavior?
6. **Search existing issues**: Has someone reported this?

### Information to Include

- Geode version
- Client library version
- Operating system
- Query that triggers the issue
- Error message (full stack trace)
- Relevant log excerpts
- Steps to reproduce

## Related Topics

- [Testing](/tags/testing/) - Testing strategies
- [Performance](/categories/performance-and-scaling/) - Performance optimization
- [Monitoring](/tags/monitoring/) - Production monitoring
- [Logging](/docs/operations/logging/) - Log management
- [Troubleshooting](/tags/troubleshooting/) - Common issues

## Further Reading

- [EXPLAIN Reference](/docs/gql-reference/explain/) - Query plan analysis
- [PROFILE Reference](/docs/gql-reference/profile/) - Performance profiling
- [Error Codes](/docs/reference/errors/) - Error code reference
- [Logging Guide](/docs/operations/logging/) - Comprehensive logging setup
- [Performance Tuning](/docs/performance/) - Optimization techniques
