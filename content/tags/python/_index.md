---
title: "Python Client"
description: "Geode Python client library with async/await support, connection pooling, query builders, transaction management, and Row-Level Security integration for Python applications."
keywords:
  - Python
  - Python client
  - asyncio
  - Python SDK
  - geode-client
  - async database
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/python/"
    noindex: false
---

# Python Client

The Geode Python client is an async-first library designed for modern Python applications using asyncio. It provides type-safe interfaces, connection pooling, query builders, and comprehensive support for Geode's advanced features including Row-Level Security and savepoints.

## Installation

```bash
pip install geode-client
```

Requirements: Python 3.9+

## Quick Start

```python
import asyncio
from geode_client import GeodeClient

async def main():
    async with GeodeClient("localhost:3141") as client:
        # Execute query
        result = await client.execute("""
            MATCH (p:Person)-[:KNOWS]->(friend:Person)
            WHERE p.name = $name
            RETURN friend.name AS name, friend.age AS age
        """, {"name": "Alice"})

        # Process results
        for row in result:
            print(f"{row['name']} is {row['age']} years old")

asyncio.run(main())
```

## Key Features

### Async/Await Support

Native asyncio integration for non-blocking I/O:

```python
async with GeodeClient("localhost:3141") as client:
    # Multiple concurrent queries
    results = await asyncio.gather(
        client.execute("MATCH (n:User) RETURN COUNT(n)"),
        client.execute("MATCH (n:Product) RETURN COUNT(n)"),
        client.execute("MATCH (n:Order) RETURN COUNT(n)")
    )
```

### Connection Pooling

High-performance connection pool (1000+ queries/second):

```python
from geode_client import ConnectionPool

pool = ConnectionPool(
    url="localhost:3141",
    min_connections=10,
    max_connections=100,
    max_idle_time=300
)

async with pool.acquire() as client:
    result = await client.execute("MATCH (n) RETURN COUNT(n)")
```

### Query Builder

Type-safe query construction:

```python
from geode_client import QueryBuilder

query = (QueryBuilder()
    .match("(p:Person)")
    .where("p.age > $min_age")
    .return_("p.name", "p.age")
    .order_by("p.age DESC")
    .limit(10))

result = await client.execute(query, {"min_age": 25})
```

### Transaction Support

Full ACID transactions with savepoints:

```python
async with client.transaction() as tx:
    await tx.execute("CREATE (p:Person {name: $name})", {"name": "Bob"})

    # Create savepoint
    await tx.savepoint("before_update")

    await tx.execute("MATCH (p:Person {name: $name}) SET p.age = $age",
                     {"name": "Bob", "age": 30})

    # Rollback to savepoint if needed
    # await tx.rollback_to("before_update")

    await tx.commit()
```

### Row-Level Security

Built-in RLS policy management:

```python
# Set RLS context
await client.set_rls_context({"user_id": 123, "role": "user"})

# Queries respect RLS policies
result = await client.execute("MATCH (n:Document) RETURN n")
```

### Streaming Results

Memory-efficient streaming for large result sets:

```python
async for row in client.stream("MATCH (n:Person) RETURN n"):
    process_row(row)
    # Each row processed as it arrives
```

## FastAPI Integration

```python
from fastapi import FastAPI, Depends
from geode_client import ConnectionPool

app = FastAPI()
geode_pool = None

@app.on_event("startup")
async def startup():
    global geode_pool
    geode_pool = ConnectionPool(
        url="localhost:3141",
        min_connections=10,
        max_connections=100
    )

@app.on_event("shutdown")
async def shutdown():
    await geode_pool.close()

async def get_client():
    async with geode_pool.acquire() as client:
        yield client

@app.get("/users/{user_id}")
async def get_user(user_id: int, client = Depends(get_client)):
    result = await client.execute(
        "MATCH (u:User {id: $id}) RETURN u",
        {"id": user_id}
    )
    return result[0] if result else None
```

## Error Handling

```python
from geode_client import (
    GeodeClient,
    SyntaxError,
    ConstraintViolation,
    ConnectionError
)

try:
    result = await client.execute(query, params)
except SyntaxError as e:
    print(f"Query syntax error: {e.message}")
except ConstraintViolation as e:
    print(f"Constraint violation: {e.message}")
except ConnectionError as e:
    print(f"Connection failed: {e.message}")
```

## Performance: 1,000+ queries/second with connection pooling

## Related Topics

- [Client Libraries](/tags/client-libraries/)
- [SDK](/tags/sdk/)
- [API Development](/tags/api/)

## Documentation

Full guide: [Python Client Documentation](/docs/clients/python/)
