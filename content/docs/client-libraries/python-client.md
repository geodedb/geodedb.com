---
title: "Python Client"
description: "Complete guide to the Geode Python async client library with QUIC + TLS support"
weight: 20
keywords:
  - Geode Python client
  - Python SDK
  - GQL driver
  - graph database Python
  - async QUIC client
---

<!-- CANARY: REQ=REQ-CLIENT-PY-001; FEATURE="PythonClientConnection"; ASPECT=HelloHandshake; STATUS=IMPL; OWNER=clients; UPDATED=2025-02-14 -->

# Geode Python Client Library

A modern async Python client for Geode graph database with QUIC + TLS 1.3 transport, query builders, and connection pooling.

## Installation

```bash
pip install geode-client
```

## Requirements

- Python 3.9+
- aioquic >= 0.9.0
- Geode server with QUIC enabled

## Quick Start

```python
import asyncio
from geode_client import Client

async def main():
    client = Client(host="127.0.0.1", port=3141, skip_verify=True)

    async with client.connection() as conn:
        page, _ = await conn.query("RETURN 1 AS x, 'Hello' AS greeting")

        for row in page.rows:
            x = row["x"].as_int
            greeting = row["greeting"].as_string
            print(f"x={x}, greeting={greeting}")

asyncio.run(main())
```

## URL Connection Helper

```python
from geode_client import open_database

client = open_database("quic://localhost:3141?skip_verify=true")

async with client.connection() as conn:
    page, _ = await conn.query("MATCH (n) RETURN n LIMIT 10")
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
```

## Transactions

```python
async with client.connection() as conn:
    await conn.begin()
    try:
        await conn.execute(
            "CREATE (p:Person {name: $name, age: $age})",
            {"name": "Bob", "age": 30}
        )
        await conn.commit()
    except Exception:
        await conn.rollback()
        raise
```

### Savepoints

```python
async with client.connection() as conn:
    await conn.begin()

    await conn.execute("CREATE (p:Person {name: 'Alice', age: 30})")

    sp = await conn.savepoint("before_update")
    await conn.execute("MATCH (p:Person {name: 'Alice'}) SET p.age = 40")

    await conn.rollback_to(sp)
    await conn.commit()
```

## Prepared Statements

```python
stmt = await conn.prepare("MATCH (p:Person {name: $name}) RETURN p")

async with stmt:
    page, _ = await stmt.execute({"name": "Alice"})
```

## Connection Pooling

```python
from geode_client import ConnectionPool

pool = ConnectionPool(
    host="localhost",
    port=3141,
    min_size=2,
    max_size=10,
    timeout=30.0,
    page_size=1000,
)

async with pool:
    async with pool.acquire() as conn:
        page, _ = await conn.query("MATCH (n) RETURN count(n) AS count")
        print(page.rows[0]["count"].as_int)
```

## Authentication

```python
from geode_client import AuthClient

async with client.connection() as conn:
    auth = AuthClient(conn)
    session = await auth.login("admin", "secret")
    print(session.token)
```

## Type System

Geode values are returned as `Value` objects.

```python
from geode_client import Value

page, _ = await conn.query("RETURN 42 AS answer")
value: Value = page.rows[0]["answer"]
print(value.as_int)
```

## Repository

- GitLab: [devnw/codepros/geode/geode-client-python](https://gitlab.com/devnw/codepros/geode/geode-client-python)
- PyPI: [geode-client](https://pypi.org/project/geode-client/)
