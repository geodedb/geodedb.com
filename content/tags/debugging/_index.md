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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

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
    profiled, _ = await client.query(f"PROFILE {query}", params)
    print("=== Profile Results ===")
    print_profile(profiled)

    # Step 2: Check for full table scans
    explained, _ = await client.query(f"EXPLAIN {query}", params)
    if has_full_scan(explained):
        print("WARNING: Query contains full table scan")
        print("Consider adding index on scanned properties")

    # Step 3: Verify index usage
    indexes, _ = await client.query("SHOW INDEXES")
    print("=== Available Indexes ===")
    for idx in indexes:
        print(f"  {idx['name']}: {idx['columns']}")

    # Step 4: Check statistics freshness
    stats, _ = await client.query("SELECT * FROM system.statistics")
    if is_stale(stats):
        print("WARNING: Statistics may be outdated")
        print("Run: ANALYZE")
```

### Common Query Issues

**Issue: Unexpected results count**

```python
# Check what's actually matching
result, _ = await client.query("""
    MATCH (u:User)
    WHERE u.email = $email
    RETURN COUNT(*) AS user_count
""", {"email": "alice@example.com"})

print(f"Found {result.rows[0]['user_count']} users")  # Expected 1, got 0

# Debug: Check exact data
all_users, _ = await client.query("MATCH (u:User) RETURN u.email")
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
import asyncio

logging.basicConfig(level=logging.DEBUG)

async def check_connection():
    try:
        client = geode_client.open_database("geode://localhost:3141")
        async with client.connection() as conn:
            await asyncio.wait_for(conn.query("RETURN 1 AS ok"), timeout=5.0)
        return "success"
    except geode_client.GeodeConnectionError as e:
        return f"failed: {e}"

# Check:
# 1. Is server running? `ps aux | grep geode`
# 2. Is port correct? Default is 3141
# 3. Firewall blocking? `telnet localhost 3141`
# 4. TLS certificate issues?
```

**TLS/Certificate errors**:

```python
# Disable certificate verification (dev only!)
client = geode_client.Client(
    host="localhost",
    port=3141,
    skip_verify=True  # NEVER use in production
)

# Or provide a trusted CA certificate
client = geode_client.Client(
    host="localhost",
    port=3141,
    ca_cert="/path/to/ca.pem"
)
```

**Connection timeouts**:

```python
# Increase timeout with asyncio wait_for
client = geode_client.open_database("geode://localhost:3141")
async with client.connection() as conn:
    await asyncio.wait_for(conn.query("RETURN 1 AS ok"), timeout=60.0)
```

### Authentication Issues

```python
try:
    client = geode_client.open_database("geode://localhost:3141")
    async with client.connection() as conn:
        auth = geode_client.AuthClient(conn)
        await auth.login("alice", "wrong_password")
except geode_client.AuthError as e:
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
result, _ = await client.query("""
    MATCH (n:Node)
    RETURN n
    LIMIT 10000  -- Add limit
""")

# Use pagination
offset = 0
page_size = 1000
while True:
    page, _ = await client.query("""
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
from geode_client import GeodeError, QueryError

async def execute_with_retry(client, query, params=None, max_retries=3):
    """Execute query with automatic retry on conflicts."""
    for attempt in range(max_retries):
        try:
            page, _ = await client.query(query, params)
            return page
        except QueryError as exc:
            message = str(exc).lower()
            if "40502" in message:
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue
            if "syntax" in message:
                logging.error(f"Syntax error: {exc}")
                raise
            logging.warning(f"Query failed: {exc}")
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
client = geode_client.open_database("localhost:3141")
# Custom logging
logger = logging.getLogger("myapp")
logger.info("Executing user query")
result, _ = await client.query("MATCH (u:User) RETURN count(u)")
logger.info(f"Found {result.rows[0]['count(u)']} users")
```

**Go logging**:

```go
import (
    "log"
    "geodedb.com/geode"
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
    result, _ = await client.query("MATCH (u:User) RETURN u")
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

- [Monitoring](/tags/monitoring/) - Production monitoring
- [Profiling](/tags/profiling/) - Performance profiling

## Further Reading

- [Explain and Profile](/docs/query/explain-profile/) - Query plan analysis and profiling
- [Error Codes](/docs/reference/error-codes/) - Error code reference
- [Performance Tuning](/docs/query/performance-tuning/) - Optimization techniques
- [Troubleshooting Guide](/docs/guides/troubleshooting/) - Common issues and solutions

## Advanced Debugging Techniques

### Query Performance Debugging

Systematic performance analysis:

```python
class QueryDebugger:
    def __init__(self, client):
        self.client = client
    
    async def analyze_query(self, query, params=None):
        """Comprehensive query analysis"""
        report = {}
        
        # 1. Get explain plan
        explain, _ = await self.client.query(f"EXPLAIN {query}", params)
        report['explain'] = self.parse_explain(explain)
        
        # 2. Profile execution
        profile, _ = await self.client.query(f"PROFILE {query}", params)
        report['profile'] = self.parse_profile(profile)
        
        # 3. Check index usage
        indexes, _ = await self.client.query("SHOW INDEXES")
        report['indexes_used'] = self.find_used_indexes(explain, indexes)
        report['indexes_missing'] = self.suggest_indexes(explain, indexes)
        
        # 4. Analyze cardinality
        report['cardinality'] = await self.analyze_cardinality(query, params)
        
        # 5. Check for anti-patterns
        report['anti_patterns'] = self.detect_anti_patterns(query)
        
        return report
    
    def detect_anti_patterns(self, query):
        """Detect common query anti-patterns"""
        issues = []
        
        # Cartesian product
        if 'MATCH' in query and query.count('MATCH') > 1 and 'WHERE' not in query:
            issues.append({
                'type': 'cartesian_product',
                'severity': 'high',
                'message': 'Multiple MATCH clauses without WHERE may cause cartesian product'
            })
        
        # Unbounded variable-length path
        if re.search(r'\[\*\]', query):
            issues.append({
                'type': 'unbounded_path',
                'severity': 'critical',
                'message': 'Unbounded variable-length path can cause performance issues'
            })
        
        # Missing LIMIT
        if 'RETURN' in query and 'LIMIT' not in query:
            issues.append({
                'type': 'missing_limit',
                'severity': 'medium',
                'message': 'Query without LIMIT may return unbounded results'
            })
        
        return issues
    
    async def analyze_cardinality(self, query, params):
        """Analyze result set cardinality"""
        # Extract pattern from query
        pattern = self.extract_pattern(query)
        
        # Estimate cardinality
        estimate, _ = await self.client.query(f"""
            EXPLAIN {query}
        """, params)
        
        return {
            'estimated_rows': estimate.get('estimated_rows'),
            'pattern_selectivity': estimate.get('selectivity')
        }
```

### Connection Debugging

Diagnose connection issues:

```python
import asyncio
import logging
import time
import geode_client

async def debug_connection(url, timeout=10):
    """Debug connection issues."""
    results = {}
    client = geode_client.open_database(url)

    # 1. Test basic connectivity
    try:
        async with client.connection() as conn:
            await asyncio.wait_for(conn.query("RETURN 1 AS ok"), timeout=timeout)
        results['connectivity'] = 'success'
    except asyncio.TimeoutError:
        results['connectivity'] = 'timeout'
        results['error'] = f'Connection timeout after {timeout}s'
        return results
    except Exception as e:
        results['connectivity'] = 'failed'
        results['error'] = str(e)
        return results

    # 2. Test query execution
    try:
        async with client.connection() as conn:
            await conn.query("MATCH (n) RETURN n LIMIT 1")
        results['query_execution'] = 'success'
    except Exception as e:
        results['query_execution'] = 'failed'
        results['query_error'] = str(e)

    # 3. Measure latency
    latencies = []
    async with client.connection() as conn:
        for _ in range(10):
            start = time.time()
            await conn.query("RETURN 1 AS ok")
            latencies.append((time.time() - start) * 1000)

    results['latency'] = {
        'min': min(latencies),
        'max': max(latencies),
        'avg': sum(latencies) / len(latencies),
        'p95': sorted(latencies)[int(len(latencies) * 0.95)]
    }

    return results
```

### Transaction Debugging

Debug transaction issues:

```python
class TransactionDebugger:
    def __init__(self, client):
        self.client = client
        self.logger = logging.getLogger(__name__)
    
    async def debug_transaction(self, operation):
        """Debug transaction execution with detailed logging."""
        async with self.client.connection() as conn:
            await conn.begin()
            try:
                self.logger.info("Transaction started")
                result = await operation(conn)
                await conn.commit()
                self.logger.info("Transaction committed")
                return result
            except Exception as exc:
                self.logger.error(f"Transaction failed: {exc}")
                await conn.rollback()
                raise
```

### Memory Profiling

Track memory usage:

```python
import tracemalloc
import psutil

class MemoryProfiler:
    def __init__(self):
        self.snapshots = []
    
    async def profile_query(self, client, query, params=None):
        """Profile memory usage during query execution"""
        # Start tracing
        tracemalloc.start()
        process = psutil.Process()
        
        # Initial snapshot
        mem_before = process.memory_info().rss / 1024 / 1024  # MB
        snapshot_before = tracemalloc.take_snapshot()
        
        # Execute query
        result, _ = await client.query(query, params)
        
        # Final snapshot
        mem_after = process.memory_info().rss / 1024 / 1024  # MB
        snapshot_after = tracemalloc.take_snapshot()
        
        # Calculate differences
        top_stats = snapshot_after.compare_to(snapshot_before, 'lineno')
        
        # Stop tracing
        tracemalloc.stop()
        
        return {
            'memory_used_mb': mem_after - mem_before,
            'top_allocations': [
                {
                    'file': stat.traceback.format()[0],
                    'size_mb': stat.size_diff / 1024 / 1024
                }
                for stat in top_stats[:10]
            ],
            'result_size': len(result.rows)
        }
```

### Distributed Tracing

End-to-end request tracing:

```python
from opentelemetry import trace
from opentelemetry.instrumentation.geode import GeodeInstrumentor

# Initialize tracing
tracer = trace.get_tracer(__name__)
GeodeInstrumentor().instrument()

async def traced_operation(client):
    """Operation with distributed tracing"""
    with tracer.start_as_current_span("user_registration") as span:
        span.set_attribute("user.email", "alice@example.com")
        
        # Database operation is automatically traced
        result, _ = await client.query("""
            CREATE (u:User {
                name: $name,
                email: $email
            })
            RETURN u.id
        """, {"name": "Alice", "email": "alice@example.com"})
        
        span.set_attribute("user.id", result.rows[0]['u.id'])
        
        # Additional span for email sending
        with tracer.start_as_current_span("send_welcome_email"):
            await send_email(result.rows[0]['u.id'])
        
        return result
```

### Error Analysis

Systematic error diagnosis:

```python
class ErrorAnalyzer:
    def __init__(self):
        self.error_patterns = {
            'UniqueConstraintViolation': self.handle_unique_violation,
            'SerializationFailure': self.handle_serialization_failure,
            'SyntaxError': self.handle_syntax_error,
            'ConnectionError': self.handle_connection_error
        }
    
    async def analyze_error(self, error, context):
        """Analyze and provide remediation for errors"""
        error_type = type(error).__name__
        
        if error_type in self.error_patterns:
            handler = self.error_patterns[error_type]
            return await handler(error, context)
        
        return {
            'type': 'unknown',
            'message': str(error),
            'suggestion': 'Check server logs for details'
        }
    
    async def handle_unique_violation(self, error, context):
        """Handle unique constraint violations"""
        # Extract violated constraint
        constraint = error.constraint_name
        value = error.violated_value
        
        return {
            'type': 'UniqueConstraintViolation',
            'constraint': constraint,
            'value': value,
            'suggestion': f'Value "{value}" already exists. Use MERGE instead of CREATE, or change the value.',
            'query_fix': f'MERGE (n:Node {{key: $value}}) ON CREATE SET n.created_at = datetime()'
        }
    
    async def handle_serialization_failure(self, error, context):
        """Handle serialization failures"""
        return {
            'type': 'SerializationFailure',
            'message': 'Transaction aborted due to concurrent modification',
            'suggestion': 'Implement retry logic with exponential backoff',
            'code_example': '''
@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1))
async def operation():
    async with client.connection() as tx:
        await tx.begin()
        # Your operation here
        pass
            '''
        }
```

Browse the tagged content below to discover comprehensive debugging guides, troubleshooting techniques, and diagnostic tools for Geode applications.
