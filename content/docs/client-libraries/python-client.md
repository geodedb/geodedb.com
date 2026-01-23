---
title: "Python Client"
description: "Complete guide to the Geode Python async client library with full type hints"
weight: 20
---

# Geode Python Client Library

A modern, fully async Python client library for Geode graph database with complete type hints and QUIC+TLS support.

## Installation

```bash
# Install from source
pip install geode-client

# Or install in editable mode for development
pip install -e ".[dev]"
```

## Requirements

- Python 3.9+
- aioquic >= 0.9.0
- Running Geode server with QUIC enabled

## Features

- ✅ **Fully async** - asyncio and type hints throughout
- ✅ **QUIC + TLS 1.3** - Modern, secure transport
- ✅ **Query builders** - Programmatic query construction
- ✅ **Connection pooling** - Concurrent workload support
- ✅ **Authentication** - RBAC and RLS support
- ✅ **Rich type system** - Decimal, temporal, advanced types
- ✅ **Full type hints** - Excellent IDE support

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
    client = open_database("quic://localhost:3141?skip_verify=true")

    async with client.connection() as conn:
        page, _ = await conn.query("MATCH (n) RETURN n LIMIT 10")
        print(f"Found {len(page.rows)} nodes")

asyncio.run(main())
```

## Querying

### Parameterized Queries

```python
async with client.connection() as conn:
    query = "MATCH (p:Person {name: $name}) RETURN p.age AS age"
    params = {"name": "Alice"}

    page, _ = await conn.query(query, params)
    age = page.rows[0]["age"].as_int
    print(f"Alice is {age} years old")
```

### Query Builder

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

page, _ = await conn.query(query_text, params)
```

### Pattern Builder

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
```

### Predicate Builder

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
```

## Transactions

### Basic Transactions

```python
async with client.connection() as conn:
    await conn.begin()
    try:
        await conn.execute(
            "CREATE (p:Person {name: $name, age: $age})",
            {"name": "Bob", "age": 30}
        )
        await conn.commit()
        print("Transaction committed")
    except Exception as e:
        await conn.rollback()
        print(f"Transaction rolled back: {e}")
```

### Savepoints (Partial Rollback)

```python
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

## Connection Pooling

```python
from geode_client import ConnectionPool

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
```

## Authentication

### Login and User Management

```python
from geode_client import AuthClient

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

```python
from geode_client import RLSPolicy

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

policy = await auth.create_rls_policy(policy)
print(f"Created policy: {policy.name} (ID: {policy.id})")
```

## Type System

### Accessing Typed Values

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
```

### Type Constructors

```python
from geode_client import types

# Create typed values
person = {
    "name": types.Text("Alice"),
    "age": types.Int(30),
    "email": types.Varchar("alice@example.com", 255),
    "joined": types.Timestamp("2024-01-15 10:30:00"),
    "salary": types.Decimal(75000.50, 2)
}
```

## Pagination

```python
async with client.connection() as conn:
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

## Connection Options

### URL Format

```
quic://host:port?param=value&param2=value2
```

### Available Parameters

- `page_size` - Results page size (default: 1000)
- `hello_name` - Client name (default: "geode-python")
- `hello_ver` - Client version (default: "0.1.0")
- `conformance` - GQL conformance level (default: "min")
- `ca_cert` - CA certificate path for server verification
- `client_cert` - Client certificate path for mTLS
- `client_key` - Client key path for mTLS
- `skip_verify` - Skip TLS verification (default: false, **insecure**)
- `server_name` - SNI server name (default: hostname)

### TLS Configuration

```python
# Development (skip verification)
client = Client(host="localhost", port=3141, skip_verify=True)

# Production with CA certificate
client = Client(
    host="geode.example.com",
    port=3141,
    ca_cert="/path/to/ca.crt"
)

# Mutual TLS
client = Client(
    host="geode.example.com",
    port=3141,
    ca_cert="/path/to/ca.crt",
    client_cert="/path/to/client.crt",
    client_key="/path/to/client.key",
    server_name="geode.example.com"
)
```

## Error Handling

```python
from geode_client import GeodeError, ConnectionError, QueryError, AuthError

try:
    page, _ = await conn.query("INVALID SYNTAX")
except QueryError as e:
    print(f"Query failed: {e}")
except ConnectionError as e:
    print(f"Connection failed: {e}")
except AuthError as e:
    print(f"Auth failed: {e}")
except GeodeError as e:
    print(f"Geode error: {e}")
```

## Testing

### Running Tests

```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=geode_client

# Run specific test
pytest tests/test_connection.py::test_basic_query
```

### Code Quality

```bash
# Format code
black geode_client/

# Type checking
mypy geode_client/

# Linting
ruff check geode_client/
```

## Examples

### Social Network Query

```python
async with client.connection() as conn:
    query = """
        MATCH (person:Person {name: $name})-[:KNOWS*1..2]->(friend:Person)
        WHERE friend <> person
        RETURN DISTINCT friend.name AS name, friend.age AS age
        ORDER BY friend.age DESC
        LIMIT 10
    """
    params = {"name": "Alice"}

    page, _ = await conn.query(query, params)

    for row in page.rows:
        name = row["name"].as_string
        age = row["age"].as_int
        print(f"{name} (age {age})")
```

### Aggregation Query

```python
async with client.connection() as conn:
    query = """
        MATCH (p:Person)
        RETURN p.city AS city, count(*) AS population
        GROUP BY p.city
        ORDER BY population DESC
        LIMIT 5
    """

    page, _ = await conn.query(query)

    for row in page.rows:
        city = row["city"].as_string
        population = row["population"].as_int
        print(f"{city}: {population} people")
```

### Batch Insert

```python
async with client.connection() as conn:
    await conn.begin()

    people = [
        {"name": "Alice", "age": 30},
        {"name": "Bob", "age": 25},
        {"name": "Charlie", "age": 35},
    ]

    for person in people:
        await conn.execute(
            "CREATE (p:Person {name: $name, age: $age})",
            person
        )

    await conn.commit()
```

## Performance

The QUIC client provides:

- **Low latency**: ~2-3ms per query (localhost)
- **High throughput**: 1000+ queries/second with connection pooling
- **Efficient**: Zero-copy where possible, minimal allocations
- **Concurrent**: Full async support for parallel queries

### Performance Tips

1. **Use connection pooling** for concurrent workloads
2. **Batch operations** in transactions
3. **Reuse query builders** for similar queries
4. **Use pagination** for large result sets
5. **Monitor connection pool** metrics

## Troubleshooting

### Connection Refused

Ensure Geode server is running with QUIC enabled:

```bash
./geode serve --listen 0.0.0.0:3141
```

### TLS Verification Errors

For development, skip verification:

```python
client = Client(host="localhost", port=3141, skip_verify=True)
```

For production, provide CA certificate:

```python
client = Client(host="server", port=3141, ca_cert="/path/to/ca.crt")
```

### Import Errors

Ensure aioquic is installed:

```bash
pip install aioquic
```

## Next Steps

- [GQL Reference](../../gql-reference/) - Query language guide
- [Type System](../../data-types/) - Data types reference
- [Authentication](../../features/authentication/) - Security features
- [Performance Tuning](../../performance/) - Optimize performance
