---
title: "Python Client"
description: "Official Python client library for Geode"
weight: 2
tags: ["python", "client", "async", "aioquic"]
categories: ["clients", "documentation"]
---

# Python Client Library

The official Python client for Geode provides an async/await interface built on aioquic for high-performance QUIC communication. Supports connection pooling, type hints, and full transaction management.

## Installation

```bash
pip install geode-client
```

**Requirements**: Python 3.11+

## Quick Start

```python
import asyncio
from geode_client import GeodeClient

async def main():
    # Create client instance
    async with GeodeClient("localhost", 3141) as client:
        # Execute query
        result = await client.query(
            "MATCH (p:Person) RETURN p.name, p.age"
        )

        # Process results
        async for row in result:
            print(f"Name: {row['p.name']}, Age: {row['p.age']}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Connection Configuration

### Basic Connection

```python
from geode_client import GeodeClient

# Simple connection
client = GeodeClient("localhost", 3141)

# With authentication
client = GeodeClient(
    "localhost",
    3141,
    username="user",
    password="pass"
)

# With TLS configuration
client = GeodeClient(
    "localhost",
    3141,
    tls_verify=True,
    tls_ca_file="/path/to/ca.pem"
)
```

### Connection Pool

```python
from geode_client import ConnectionPool

# Create connection pool
pool = ConnectionPool(
    host="localhost",
    port=3141,
    min_size=2,
    max_size=10,
    connection_timeout=30.0,
    idle_timeout=300.0
)

async with pool.acquire() as client:
    result = await client.query("MATCH (n) RETURN count(n)")
```

## Query Execution

### Basic Queries

```python
# Simple query
result = await client.query("MATCH (n:Person) RETURN n LIMIT 10")

# Query with parameters
result = await client.query(
    "MATCH (p:Person {name: $name}) RETURN p",
    params={"name": "Alice"}
)

# Multiple parameters
result = await client.query(
    "MATCH (p:Person) WHERE p.age >= $min_age AND p.age <= $max_age RETURN p",
    params={"min_age": 25, "max_age": 40}
)
```

### Result Processing

```python
# Iterate over results
result = await client.query("MATCH (p:Person) RETURN p.name, p.age")
async for row in result:
    name = row["p.name"]
    age = row["p.age"]
    print(f"{name}: {age}")

# Fetch all results
result = await client.query("MATCH (p:Person) RETURN p")
rows = await result.fetch_all()
for row in rows:
    print(row)

# Fetch one result
result = await client.query("MATCH (p:Person {id: $id}) RETURN p", params={"id": 123})
row = await result.fetch_one()
if row:
    print(row["p"])
```

## Transactions

### Basic Transaction

```python
async with client.transaction() as tx:
    # Execute multiple statements
    await tx.execute(
        "CREATE (:Person {name: $name, age: $age})",
        params={"name": "Alice", "age": 30}
    )

    await tx.execute(
        "CREATE (:Person {name: $name, age: $age})",
        params={"name": "Bob", "age": 25}
    )

    # Transaction commits automatically on successful exit
    # Or rolls back on exception
```

### Manual Transaction Control

```python
tx = await client.begin_transaction()
try:
    await tx.execute("CREATE (:Person {name: 'Alice'})")
    await tx.execute("CREATE (:Person {name: 'Bob'})")
    await tx.commit()
except Exception as e:
    await tx.rollback()
    raise
```

### Savepoints

```python
async with client.transaction() as tx:
    await tx.execute("CREATE (:Person {name: 'Alice'})")

    # Create savepoint
    sp = await tx.savepoint("sp1")

    try:
        await tx.execute("CREATE (:Person {name: 'Bob'})")
        # This might fail
        await tx.execute("CREATE (:Invalid)")
    except Exception:
        # Roll back to savepoint
        await sp.rollback()

    # Alice is still created, Bob is not
```

## Type Mapping

The Python client automatically converts between GQL and Python types:

| GQL Type | Python Type |
|----------|-------------|
| INTEGER | int |
| FLOAT | float |
| STRING | str |
| BOOLEAN | bool |
| NULL | None |
| LIST | list |
| MAP | dict |
| NODE | Node |
| RELATIONSHIP | Relationship |
| PATH | Path |

### Working with Nodes

```python
from geode_client import Node

result = await client.query("MATCH (p:Person) RETURN p")
async for row in result:
    person: Node = row["p"]

    # Access properties
    print(person["name"])
    print(person.properties["age"])

    # Access labels
    print(person.labels)  # ["Person"]

    # Access element ID
    print(person.element_id)
```

### Working with Relationships

```python
from geode_client import Relationship

result = await client.query("MATCH (:Person)-[r:KNOWS]->(:Person) RETURN r")
async for row in result:
    rel: Relationship = row["r"]

    print(rel.type)  # "KNOWS"
    print(rel.properties)
    print(rel.start_node_id)
    print(rel.end_node_id)
```

### Working with Paths

```python
from geode_client import Path

result = await client.query(
    "MATCH p = (:Person)-[:KNOWS*1..3]->(:Person) RETURN p LIMIT 1"
)
async for row in result:
    path: Path = row["p"]

    print(f"Path length: {len(path)}")
    print(f"Nodes: {path.nodes}")
    print(f"Relationships: {path.relationships}")
```

## Error Handling

```python
from geode_client import GeodeError, SyntaxError, ConstraintError

try:
    result = await client.query("MATCH (p:Invalid) RETURN p")
except SyntaxError as e:
    print(f"Syntax error: {e.message}")
    print(f"Position: {e.line}:{e.column}")
except ConstraintError as e:
    print(f"Constraint violation: {e.message}")
except GeodeError as e:
    print(f"Geode error [{e.code}]: {e.message}")
    print(f"Details: {e.details}")
```

### Error Types

The client provides specific exception types for different error categories:

- `SyntaxError` - GQL syntax errors
- `ConstraintError` - Constraint violations
- `AuthenticationError` - Authentication failures
- `AuthorizationError` - Permission denied
- `TransactionError` - Transaction failures
- `ConnectionError` - Network errors
- `TimeoutError` - Operation timeouts

## Advanced Features

### Query Timeout

```python
# Set timeout for individual query
result = await client.query(
    "MATCH (n) RETURN n",
    timeout=5.0  # 5 seconds
)

# Set default timeout for client
client = GeodeClient("localhost", 3141, default_timeout=10.0)
```

### Batch Operations

```python
# Execute multiple queries efficiently
queries = [
    ("CREATE (:Person {name: $name})", {"name": f"Person{i}"})
    for i in range(100)
]

async with client.transaction() as tx:
    for query, params in queries:
        await tx.execute(query, params=params)
```

### Prepared Statements

```python
# Prepare statement for reuse
stmt = await client.prepare("MATCH (p:Person {name: $name}) RETURN p")

# Execute with different parameters
result1 = await stmt.execute(params={"name": "Alice"})
result2 = await stmt.execute(params={"name": "Bob"})

# Clean up
await stmt.close()
```

### Query Profiling

```python
# Get query execution profile
result = await client.query(
    "MATCH (p:Person) RETURN p",
    profile=True
)

# Access profiling information
print(result.profile)
```

### Schema Introspection

```python
# Get node labels
labels = await client.get_labels()
print(labels)

# Get relationship types
types = await client.get_relationship_types()
print(types)

# Get property keys
keys = await client.get_property_keys()
print(keys)
```

## Testing

### Using pytest-asyncio

```python
import pytest
from geode_client import GeodeClient

@pytest.fixture
async def geode_client():
    client = GeodeClient("localhost", 3141)
    yield client
    await client.close()

@pytest.mark.asyncio
async def test_create_person(geode_client):
    async with geode_client.transaction() as tx:
        await tx.execute(
            "CREATE (:Person {name: 'Test', age: 25})"
        )

    result = await geode_client.query(
        "MATCH (p:Person {name: 'Test'}) RETURN p.age"
    )
    row = await result.fetch_one()
    assert row["p.age"] == 25
```

### Test Containers

```python
import pytest
from testcontainers.core.container import DockerContainer

@pytest.fixture(scope="session")
async def geode_container():
    container = DockerContainer("geode:latest")
    container.with_exposed_ports(3141)
    container.start()

    yield container

    container.stop()

@pytest.fixture
async def geode_client(geode_container):
    port = geode_container.get_exposed_port(3141)
    client = GeodeClient("localhost", int(port))
    yield client
    await client.close()
```

## Performance Tips

1. **Use Connection Pools** - Reuse connections for better performance
2. **Batch Operations** - Use transactions for multiple operations
3. **Async/Await** - Leverage async for concurrent queries
4. **Prepared Statements** - Reuse prepared statements for repeated queries
5. **Result Streaming** - Use async iteration instead of fetch_all() for large results
6. **Parameter Binding** - Always use parameters instead of string formatting

## Type Hints

The client provides full type hint support:

```python
from typing import AsyncIterator
from geode_client import GeodeClient, Node, Relationship, Result

async def get_people(client: GeodeClient) -> AsyncIterator[Node]:
    result: Result = await client.query("MATCH (p:Person) RETURN p")
    async for row in result:
        yield row["p"]

async def create_friendship(
    client: GeodeClient,
    person1: str,
    person2: str
) -> Relationship:
    result = await client.query(
        """
        MATCH (p1:Person {name: $name1})
        MATCH (p2:Person {name: $name2})
        CREATE (p1)-[r:KNOWS]->(p2)
        RETURN r
        """,
        params={"name1": person1, "name2": person2}
    )
    row = await result.fetch_one()
    return row["r"]
```

## Examples

See the [examples directory](https://gitlab.com/devnw/codepros/geode/geode-client-python/tree/main/examples) for complete examples:

- Basic CRUD operations
- Transaction management
- Connection pooling
- Error handling
- Type conversions
- Async patterns
- Integration testing

## Repository

- GitLab: [devnw/codepros/geode/geode-client-python](https://gitlab.com/devnw/codepros/geode/geode-client-python)
- PyPI: [geode-client](https://pypi.org/project/geode-client/)
- Documentation: [docs.geodedb.com/clients/python](https://docs.geodedb.com/clients/python)
