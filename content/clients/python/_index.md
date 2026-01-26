---
title: "Python Client"
description: "Official async Python client for Geode graph database with QUIC + TLS 1.3"
weight: 2
tags: ["python", "client", "async", "aioquic", "gql", "quic", "tls"]
categories: ["clients", "documentation"]
keywords:
  - Geode Python client
  - Python GQL driver
  - async QUIC client
  - graph database Python SDK
  - ISO 39075 GQL
  - connection pooling
series:
  - client-libraries
---

<!-- CANARY: REQ=REQ-CLIENT-PY-001; FEATURE="PythonClientConnection"; ASPECT=HelloHandshake; STATUS=IMPL; OWNER=clients; UPDATED=2025-02-14 -->

# Python Client Library

The official Python client for Geode provides an async/await API built on aioquic for QUIC + TLS 1.3 transport. Use the `Client` factory to create `Connection` instances, or use `ConnectionPool` for concurrent workloads.

## Installation

```bash
pip install geode-client
```

**Requirements**: Python 3.11+

## Quick Start

```python
import asyncio
from geode_client import Client

async def main():
    client = Client(host="localhost", port=3141)

    async with client.connection() as conn:
        page, _ = await conn.query(
            "MATCH (p:Person) RETURN p.name AS name, p.age AS age"
        )

        for row in page.rows:
            print(f"{row['name'].as_string}: {row['age'].as_int}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Connection Configuration

### Client and Connection

`Client` is a factory; `Connection` is the async context manager that runs queries.

```python
from geode_client import Client

client = Client(
    host="localhost",
    port=3141,
    page_size=1000,
    hello_name="geode-python",
    hello_ver="0.1.0",
    conformance="min",
    ca_cert="/path/to/ca.pem",
    client_cert="/path/to/client.crt",
    client_key="/path/to/client.key",
    skip_verify=False,
    server_name="geode.internal",
)

async with client.connection() as conn:
    page, _ = await conn.query("RETURN 1 AS ok")
```

### URL Helper

Use `open_database` with `quic://` URLs when you prefer a single string.

```python
from geode_client import open_database

client = open_database("quic://localhost:3141?skip_verify=true&page_size=500")

async with client.connection() as conn:
    page, _ = await conn.query("RETURN 1 AS ok")
```

### Connection Pool

```python
from geode_client import ConnectionPool

pool = ConnectionPool(
    host="localhost",
    port=3141,
    min_size=2,
    max_size=10,
    timeout=30.0,
    page_size=1000,
    skip_verify=True,
)

async with pool:
    async with pool.acquire() as conn:
        page, _ = await conn.query("MATCH (n) RETURN count(n) AS count")
        print(page.rows[0]["count"].as_int)
```

## Query Execution

### Basic Queries

```python
page, _ = await conn.query("MATCH (n:Person) RETURN n LIMIT 10")

page, _ = await conn.query(
    "MATCH (p:Person {name: $name}) RETURN p",
    params={"name": "Alice"},
)
```

### Pagination

```python
page, pager = await conn.query("MATCH (p:Person) RETURN p", page_size=100)

for row in page.rows:
    print(row["p"].as_object)

async for next_page in pager():
    for row in next_page.rows:
        print(row["p"].as_object)
```

## Transactions

The Python client exposes explicit transaction methods on `Connection`.

```python
await conn.begin()
try:
    await conn.execute(
        "CREATE (:Person {name: $name, age: $age})",
        params={"name": "Alice", "age": 30},
    )
    await conn.execute(
        "CREATE (:Person {name: $name, age: $age})",
        params={"name": "Bob", "age": 25},
    )
    await conn.commit()
except Exception:
    await conn.rollback()
    raise
```

### Savepoints

```python
await conn.begin()
try:
    await conn.execute("CREATE (:Person {name: 'Alice'})")
    sp = await conn.savepoint("before_risky_op")

    try:
        await conn.execute("CREATE (:Invalid)")
    except Exception:
        await conn.rollback_to(sp)

    await conn.commit()
except Exception:
    await conn.rollback()
    raise
```

## Prepared Statements

```python
stmt = await conn.prepare("MATCH (p:Person {name: $name}) RETURN p")

async with stmt:
    page, _ = await stmt.execute({"name": "Alice"})
    page2, _ = await stmt.execute({"name": "Bob"})
```

## Query Builder

```python
from geode_client import QueryBuilder

query, params = (
    QueryBuilder()
    .match("(p:Person)")
    .where("p.age >= $min_age")
    .return_("p.name AS name", "p.age AS age")
    .order_by("p.age DESC")
    .limit(10)
    .with_param("min_age", 21)
    .build()
)

page, _ = await conn.query(query, params=params)
```

## EXPLAIN and PROFILE

```python
plan = await conn.explain("MATCH (p:Person) RETURN p")
profile = await conn.profile("MATCH (p:Person) RETURN p")
```

## Authentication Helpers

Use `AuthClient` for RBAC and RLS operations.

```python
from geode_client import AuthClient

async with client.connection() as conn:
    auth = AuthClient(conn)
    session = await auth.login("admin", "secret")
    print(session.token)
```

## Type Mapping

Results are returned as `Value` objects with typed accessors.

```python
from geode_client import Value

page, _ = await conn.query("RETURN 42 AS answer")
value: Value = page.rows[0]["answer"]
print(value.as_int)
```

| GQL Type | Python Value | Notes |
|----------|--------------|-------|
| INT | `Value` | `value.as_int` |
| DECIMAL / FLOAT | `Value` | `value.as_decimal` |
| STRING | `Value` | `value.as_string` |
| BOOL | `Value` | `value.as_bool` |
| LIST | `Value` | `value.as_array` |
| MAP | `Value` | `value.as_object` |
| NODE | `Value` | Returned as object map |
| EDGE | `Value` | Returned as object map |
| PATH | `Value` | Returned as object map |

## Repository

- GitLab: [devnw/codepros/geode/geode-client-python](https://gitlab.com/devnw/codepros/geode/geode-client-python)
- PyPI: [geode-client](https://pypi.org/project/geode-client/)
