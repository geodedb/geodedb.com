---
title: "Tag: Python Async Client"
description: "Modern async Python client for Geode with asyncio support, connection pooling, query builders, and GQL conformance profile support for high-performance graph database operations."
keywords:
  - Python client
  - asyncio
  - geode-client-python
  - Python SDK
  - aioquic
  - Geode
  - async await
  - connection pooling
  - query builders
  - type hints
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/python-client/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

The Geode Python client library (`geode-client-python`) provides a modern, fully async Python interface for connecting to Geode graph databases. Built on asyncio with aioquic for QUIC transport, it delivers high-performance concurrent operations while maintaining Pythonic idioms and comprehensive type hints for excellent IDE support.

The Python client is designed for developers building data pipelines, web applications, and analytical tools who need reliable async database access. With features like connection pooling, query builders, and Row-Level Security (RLS) support, it provides enterprise-grade capabilities for production deployments.

## Key Features

**Fully Async**: Built from the ground up with asyncio and `async/await` patterns for non-blocking operations.

**QUIC + TLS 1.3**: Secure, high-performance networking using aioquic with mandatory TLS 1.3.

**Full GQL Support**: 98.6% ISO/IEC 39075:2024 compliance for comprehensive GQL query capabilities.

**Query Builders**: Programmatic query construction with `QueryBuilder`, `PatternBuilder`, and `PredicateBuilder`.

**Connection Pooling**: High-throughput concurrent workloads with 1000+ queries per second capability.

**Rich Type System**: Full type hints with support for Decimal, temporal types, and complex GQL types.

**Authentication & RLS**: Complete authentication with RBAC and Row-Level Security policy management.

## Installation

Install the Python client using pip:

```bash
# Install from source
cd geode-client-python
pip install .

# Or install in editable mode for development
pip install -e ".[dev]"

# Install with all optional dependencies
pip install -e ".[dev,integration,benchmark,property]"
```

### Requirements

- Python 3.9 or later
- aioquic >= 0.9.0
- Running Geode server with QUIC enabled

## Quick Start

### Basic Connection

```python
import asyncio
from geode_client import Client

async def main():
    # Create client
    client = Client(host="127.0.0.1", port=3141, skip_verify=True)

    # Execute query
    async with client.connection() as conn:
        page, _ = await conn.query("RETURN 1 AS x, 'Hello' AS greeting")

        for row in page.rows:
            x = row["x"].as_int
            greeting = row["greeting"].as_string
            print(f"x={x}, greeting={greeting}")

asyncio.run(main())
```

### Using URL Connection

```python
from geode_client import open_database

async def main():
    # Open database with URL
    client = open_database("quic://localhost:3141?insecure_tls_skip_verify=true")

    async with client.connection() as conn:
        page, _ = await conn.query("MATCH (n) RETURN n LIMIT 10")
        print(f"Found {len(page.rows)} nodes")

asyncio.run(main())
```

### Parameterized Queries

```python
async def find_person(client, name: str):
    async with client.connection() as conn:
        query = "MATCH (p:Person {name: $name}) RETURN p.age AS age"
        params = {"name": name}

        page, _ = await conn.query(query, params)
        if page.rows:
            age = page.rows[0]["age"].as_int
            print(f"{name} is {age} years old")

asyncio.run(find_person(client, "Alice"))
```

## Connection Configuration

### Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `host` | str | `"127.0.0.1"` | Server hostname or IP address |
| `port` | int | `3141` | Server port number |
| `page_size` | int | `1000` | Results page size (1-100,000) |
| `hello_name` | str | `"geode-python"` | Client identification name |
| `hello_ver` | str | `"0.1.0"` | Client version string |
| `conformance` | str | `"min"` | GQL conformance level (`"min"` or `"full"`) |
| `ca_cert` | str | `None` | Path to CA certificate for server verification |
| `client_cert` | str | `None` | Path to client certificate for mTLS |
| `client_key` | str | `None` | Path to client private key for mTLS |
| `skip_verify` | bool | `False` | Skip TLS certificate verification (insecure) |
| `server_name` | str | hostname | SNI server name for TLS |

### URL Format

```
quic://host:port?param=value&param2=value2
```

### Connection Examples

```python
# Simple connection (development)
client = Client(host="localhost", port=3141, skip_verify=True)

# Production with TLS
client = Client(
    host="geode.example.com",
    port=3141,
    ca_cert="/path/to/ca.crt",
    server_name="geode.example.com"
)

# Mutual TLS (mTLS)
client = Client(
    host="geode.example.com",
    port=3141,
    ca_cert="/path/to/ca.crt",
    client_cert="/path/to/client.crt",
    client_key="/path/to/client.key",
    server_name="geode.example.com"
)

# URL-based configuration
client = open_database("quic://geode.example.com:3141?ca_cert=/path/to/ca.crt")
```

## Transaction Management

### Basic Transactions

```python
async def transfer_funds(client, from_account: str, to_account: str, amount: float):
    async with client.connection() as conn:
        await conn.begin()
        try:
            # Debit from source
            await conn.execute("""
                MATCH (a:Account {id: $from_id})
                WHERE a.balance >= $amount
                SET a.balance = a.balance - $amount
            """, {"from_id": from_account, "amount": amount})

            # Credit to destination
            await conn.execute("""
                MATCH (a:Account {id: $to_id})
                SET a.balance = a.balance + $amount
            """, {"to_id": to_account, "amount": amount})

            await conn.commit()
            print("Transaction committed")
        except Exception as e:
            await conn.rollback()
            print(f"Transaction rolled back: {e}")
            raise
```

### Savepoints (Partial Rollback)

Savepoints enable partial rollback within a transaction:

```python
async def complex_operation(client):
    async with client.connection() as conn:
        await conn.begin()

        # Create initial data
        await conn.execute("CREATE (p:Person {name: 'Alice', age: 30})")

        # Create a savepoint
        sp = await conn.savepoint("before_update")

        # Make changes
        await conn.execute("MATCH (p:Person {name: 'Alice'}) SET p.age = 40")

        # Rollback to savepoint (undoes the age change)
        await conn.rollback_to(sp)

        # Alice's age is still 30
        await conn.commit()
```

## Query Builders

### QueryBuilder

Build GQL queries programmatically with type safety:

```python
from geode_client import QueryBuilder

query_text, params = (
    QueryBuilder()
    .match("(p:Person {name: $name})-[:KNOWS]->(friend:Person)")
    .where("friend.age > 25")
    .return_("friend.name AS name", "friend.age AS age")
    .order_by("friend.age DESC")
    .limit(10)
    .with_param("name", "Alice")
    .build()
)

async with client.connection() as conn:
    page, _ = await conn.query(query_text, params)
    for row in page.rows:
        print(f"{row['name'].as_string}: {row['age'].as_int}")
```

### PatternBuilder

Build graph patterns for MATCH clauses:

```python
from geode_client import PatternBuilder, EdgeDirection

pattern = (
    PatternBuilder()
    .node("a", "Person", {"name": "$person1"})
    .edge("knows", "KNOWS", EdgeDirection.UNDIRECTED)
    .variable_length(1, 6)
    .node("b", "Person", {"name": "$person2"})
    .build()
)
# Result: (a:Person {name: $person1})-[knows:KNOWS*1..6]-(b:Person {name: $person2})

query = f"MATCH {pattern} RETURN a, b"
```

### PredicateBuilder

Build WHERE clause conditions:

```python
from geode_client import PredicateBuilder

predicate = (
    PredicateBuilder()
    .greater_than("p.age", "25")
    .is_not_null("p.email")
    .in_("p.role", ["admin", "user"])
    .build_and()
)
# Result: p.age > 25 AND p.email IS NOT NULL AND p.role IN ['admin', 'user']

query = f"MATCH (p:Person) WHERE {predicate} RETURN p"
```

## Connection Pooling

Use connection pooling for high-throughput concurrent workloads:

```python
from geode_client import ConnectionPool

async def main():
    # Create pool
    pool = ConnectionPool(
        host="localhost",
        port=3141,
        min_size=2,
        max_size=10,
        skip_verify=True
    )

    async with pool:
        # Acquire connection from pool
        async with pool.acquire() as conn:
            page, _ = await conn.query("RETURN 1")

        # Pool automatically manages connection lifecycle
        print(f"Pool size: {pool.size}, available: {pool.available}")

asyncio.run(main())
```

### Pool Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `min_size` | int | `1` | Minimum connections to maintain |
| `max_size` | int | `10` | Maximum connections allowed |
| `timeout` | float | `30.0` | Connection acquisition timeout (seconds) |

### Concurrent Queries

```python
async def concurrent_queries(pool):
    """Execute multiple queries concurrently."""
    async def fetch_data(i: int):
        async with pool.acquire() as conn:
            page, _ = await conn.query(
                "MATCH (p:Person {id: $id}) RETURN p",
                {"id": i}
            )
            return page.rows

    # Execute 100 concurrent queries
    tasks = [fetch_data(i) for i in range(100)]
    results = await asyncio.gather(*tasks)

    print(f"Fetched {len(results)} results concurrently")
```

## Authentication and Authorization

### Basic Authentication

```python
from geode_client import AuthClient

async def authenticate(client):
    async with client.connection() as conn:
        auth = AuthClient(conn)

        # Login
        session = await auth.login("username", "password")
        print(f"Token: {session.token}")
        print(f"Roles: {session.roles}")

        # Create user
        user = await auth.create_user(
            username="newuser",
            email="user@example.com",
            password="secure123",
            roles=["user"]
        )
        print(f"Created user: {user.username}")

        # Check permission
        has_perm = await auth.check_permission(
            user_id=user.id,
            resource="data",
            action="read"
        )
        print(f"Has read permission: {has_perm}")

        # Logout
        await auth.logout(session.token)
```

### Row-Level Security (RLS)

Configure fine-grained access control with RLS policies:

```python
from geode_client import RLSPolicy

async def setup_rls(auth):
    policy = RLSPolicy(
        name="user_data_policy",
        table="user_data",
        graph="main",
        operation="SELECT",
        permissive=True,
        roles=[1, 2],
        using_expression="owner_id = current_user_id()",
        enabled=True,
        audit_level="READ"
    )

    created = await auth.create_rls_policy(policy)
    print(f"Created policy: {created.name} (ID: {created.id})")

    # List policies
    policies = await auth.list_rls_policies()
    for p in policies:
        print(f"Policy: {p.name}, Operation: {p.operation}")
```

## Type System

The client supports all GQL types with proper Python mappings:

```python
# Access typed values
row = page.rows[0]

# Basic types
int_val = row["count"].as_int
str_val = row["name"].as_string
bool_val = row["active"].as_bool
decimal_val = row["price"].as_decimal

# Temporal types
date_val = row["birthdate"].as_date
timestamp_val = row["created_at"].as_datetime

# Complex types
array_val = row["tags"].as_array
object_val = row["metadata"].as_object
bytes_val = row["data"].as_bytes
range_val = row["period"].as_range

# Raw value access
raw = row["field"].raw_value
```

## Pagination

Handle large result sets with pagination:

```python
async def paginated_query(conn):
    query = "MATCH (n:Person) RETURN n.name ORDER BY n.name"

    # Get first page
    page, pager = await conn.query(query, page_size=100)

    # Process first page
    for row in page.rows:
        process(row)

    # Get more pages
    async for next_page in pager():
        for row in next_page.rows:
            process(row)
```

## Error Handling

The client provides specific exceptions for different error types:

```python
from geode_client import GeodeError, ConnectionError, QueryError, AuthError

async def safe_query(conn, query: str):
    try:
        page, _ = await conn.query(query)
        return page
    except QueryError as e:
        print(f"Query failed: {e}")
    except ConnectionError as e:
        print(f"Connection failed: {e}")
    except AuthError as e:
        print(f"Auth failed: {e}")
    except GeodeError as e:
        print(f"Geode error: {e}")
```

### Retry Logic

```python
import random

async def execute_with_retry(conn, query: str, max_attempts: int = 3):
    for attempt in range(max_attempts):
        try:
            page, _ = await conn.query(query)
            return page
        except QueryError as e:
            if "serialization" in str(e).lower() and attempt < max_attempts - 1:
                delay = random.uniform(0.01, 0.1) * (2 ** attempt)
                await asyncio.sleep(delay)
                continue
            raise
```

## Input Validation

The client includes an input validation module:

```python
from geode_client import validate, ValidationError

try:
    # Validate query string
    query = validate.query(user_input)

    # Validate connection parameters
    host = validate.hostname(host_input)
    port = validate.port(port_input)
    page = validate.page_size(page_input)

    # Validate identifiers
    label = validate.label(label_input)
    prop = validate.property_name(prop_input)
except ValidationError as e:
    print(f"Invalid input: {e}")
```

### Available Validators

| Function | Purpose | Example Valid Input |
|----------|---------|---------------------|
| `validate.query()` | Query strings | `"RETURN 1"` |
| `validate.param_name()` | Parameter names | `"user_id"` |
| `validate.hostname()` | Hosts/IPs | `"localhost"`, `"192.168.1.1"` |
| `validate.port()` | Port numbers | `3141` (1-65535) |
| `validate.page_size()` | Page sizes | `1000` (1-100,000) |
| `validate.identifier()` | GQL identifiers | `"node_name"` |
| `validate.label()` | Node/edge labels | `"Person"` |
| `validate.timeout()` | Timeout values | `30.0` (seconds) |

## Performance Optimization

### Connection Reuse

```python
# Good: Reuse pattern with different parameters
pattern = QueryBuilder().match("(n:Person)").where("n.id = $id").return_("n")
for i in range(100):
    query, params = pattern.with_param("id", i).build()
    # Execute query...
```

### Concurrent Execution

```python
# Good: Use connection pool for concurrent queries
async with ConnectionPool(min_size=5, max_size=20) as pool:
    tasks = [fetch_data(pool, i) for i in range(100)]
    await asyncio.gather(*tasks)
```

### QUIC System Optimizations

For optimal QUIC throughput, configure UDP buffer sizes at the OS level.

**Linux:**

```bash
sudo sysctl -w net.core.rmem_max=7340032
sudo sysctl -w net.core.wmem_max=7340032

# Persist across reboots
echo "net.core.rmem_max=7340032" | sudo tee -a /etc/sysctl.d/99-geode-quic.conf
echo "net.core.wmem_max=7340032" | sudo tee -a /etc/sysctl.d/99-geode-quic.conf
```

**BSD/macOS:**

```bash
sudo sysctl -w kern.ipc.maxsockbuf=8441037
```

## Testing

```bash
# Run all unit tests (377 tests)
pytest tests/unit/

# Run with coverage report
pytest tests/unit/ --cov=geode_client --cov-report=term-missing

# Run specific test module
pytest tests/unit/test_types.py -v

# Run integration tests (requires Docker, 119 tests)
pytest tests/integration/ -m integration

# Run property-based tests (50 tests)
pytest tests/property/ -v

# Run benchmarks (154 benchmarks)
pytest benchmarks/ --benchmark-only

# Code quality
ruff check geode_client/
ruff format geode_client/
mypy geode_client/
```

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Connection establishment | ~50-100ms | QUIC handshake + TLS |
| Query latency | ~2-3ms | Localhost, simple queries |
| Throughput | 1000+ q/s | With connection pooling |
| Result parsing | ~1ms/1000 rows | JSON decoding |

## API Reference

### Core Classes

| Class | Description |
|-------|-------------|
| `Client` | Factory for creating connections. Use `Client.from_url()` for URL config. |
| `Connection` | Async context manager for database operations. |
| `Page` | Query result container with columns and rows. |
| `Value` | Typed value container with accessors (`as_int`, `as_string`, etc.) |
| `QueryBuilder` | Fluent interface for building GQL queries. |
| `PatternBuilder` | Builder for graph patterns (nodes, edges). |
| `PredicateBuilder` | Builder for WHERE clause predicates. |
| `ConnectionPool` | Connection pool for concurrent workloads. |
| `AuthClient` | Authentication and authorization operations. |

### Exceptions

| Exception | Description |
|-----------|-------------|
| `GeodeError` | Base exception for all Geode errors |
| `GeodeConnectionError` | Connection establishment failures |
| `QueryError` | Query execution failures |
| `AuthError` | Authentication/authorization failures |
| `ValidationError` | Input validation failures |

## Related Topics

- [Python](/tags/python/)
- [Client Libraries](/tags/client-libraries/)
- [QUIC Protocol](/tags/quic/)
- [Connection Pooling](/tags/connection-pooling/)
- [Async Patterns](/tags/async/)
- [Transactions](/tags/transactions/)
- [Tutorials](/tags/tutorials/)

## Further Reading

- [asyncio Documentation](https://docs.python.org/3/library/asyncio.html)
- [aioquic Library](https://github.com/aiortc/aioquic)
- [ISO/IEC 39075:2024 GQL Standard](https://www.iso.org/standard/76120.html)
- [Python Client Repository](https://gitlab.com/devnw/codepros/geode/geode-client-python)
- [Geode Documentation](/docs/)
