---
title: "Python Client Library - Async Graph Database Integration"
description: "Production-ready Geode Python client with async/await support, connection pooling (1000+ queries/sec), query builders, transaction management, Row-Level Security, savepoints, and FastAPI integration for modern Python applications."
keywords:
  - Python client
  - asyncio
  - Python SDK
  - geode-client
  - async database
  - Python graph database
  - aioquic
  - connection pooling
  - FastAPI integration
  - async/await
  - type-safe queries
  - transaction management
  - Row-Level Security
  - savepoints
  - Python 3.9
  - QUIC protocol
  - Geode database
  - graph queries
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/python/"
    noindex: false
---

# Python Client Library

The Geode Python client is a production-ready, async-first library engineered for modern Python applications leveraging asyncio. Built on aioquic for high-performance QUIC protocol support, it delivers 1,000+ queries per second with connection pooling, type-safe query builders, comprehensive transaction management including savepoints, and full integration with Geode's advanced features like Row-Level Security policies.

## Why Choose the Python Client?

**Async-First Architecture**: Native asyncio integration ensures non-blocking I/O for concurrent operations without threading complexity. Perfect for high-throughput web applications, data pipelines, and microservices.

**Production-Ready Performance**: Optimized connection pooling achieves 1,000+ queries per second, with automatic connection lifecycle management, health checks, and graceful degradation under load.

**Type Safety**: Type-safe query builders and parameter handling prevent common errors at development time, while comprehensive error types with ISO status codes enable precise exception handling.

**Framework Integration**: Seamless integration with FastAPI, Django Channels, AIOHTTP, and other async frameworks through connection pooling and dependency injection patterns.

**Advanced Database Features**: Full support for transactions with savepoints, Row-Level Security policy management, streaming results for large datasets, and prepared statements for query optimization.

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

## Advanced Features

### Streaming Results

Memory-efficient processing of large result sets:

```python
# Stream millions of rows without loading all into memory
async for row in client.stream("MATCH (n:Person) RETURN n LIMIT 1000000"):
    await process_person(row)
    # Each row processed immediately as it arrives
    # Low memory footprint even with huge datasets
```

### Query Builder Patterns

Construct complex queries programmatically:

```python
from geode_client import QueryBuilder, PatternBuilder

# Build complex match patterns
pattern = (PatternBuilder()
    .node("p", "Person")
    .edge("KNOWS")
    .node("friend", "Person")
    .where("friend.age > $min_age")
    .build())

# Construct full query
query = (QueryBuilder()
    .match(pattern)
    .where("p.name = $name")
    .return_("friend.name AS name", "friend.age AS age", "friend.city AS city")
    .order_by("friend.age DESC")
    .limit(10)
    .build())

result = await client.execute(query, {"name": "Alice", "min_age": 25})
```

### Savepoint Management

Fine-grained transaction control:

```python
async with client.transaction() as tx:
    # Create initial data
    await tx.execute("CREATE (u:User {name: $name})", {"name": "Alice"})

    # Create savepoint before risky operations
    await tx.savepoint("before_complex_update")

    try:
        # Complex multi-step operation
        await tx.execute("MATCH (u:User {name: $name}) SET u.score = u.score + $delta",
                        {"name": "Alice", "delta": 100})
        await tx.execute("CREATE (u:User {name: $name})-[:EARNED]->(a:Achievement)",
                        {"name": "Alice"})
    except Exception as e:
        # Rollback only the complex operation, keep initial data
        await tx.rollback_to("before_complex_update")
        logger.warning(f"Complex operation failed: {e}")

    # Commit transaction (with or without savepoint rollback)
    await tx.commit()
```

### Row-Level Security Integration

Automatic policy enforcement:

```python
# Set RLS context for current connection
await client.set_rls_context({
    "user_id": 12345,
    "role": "manager",
    "department_id": 42,
    "clearance_level": 3
})

# All queries automatically filtered by RLS policies
result = await client.execute("""
    MATCH (d:Document)
    RETURN d.title, d.classification
""")
# Only returns documents user 12345 is authorized to see

# Clear RLS context
await client.clear_rls_context()
```

### Prepared Statements

Optimize frequently-executed queries:

```python
# Prepare statement once
stmt = await client.prepare("""
    MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)
    WHERE p.category = $category
    RETURN p.name, p.price
    ORDER BY p.price DESC
    LIMIT $limit
""")

# Execute many times with different parameters
for user_id in user_ids:
    result = await stmt.execute({
        "user_id": user_id,
        "category": "Electronics",
        "limit": 10
    })
    process_results(result)

# Clean up
await stmt.close()
```

## Django Integration

Integrate with Django Channels for WebSocket support:

```python
# consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
from geode_client import GeodeClient
import json

class GraphConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.client = None

    async def connect(self):
        await self.accept()
        self.client = GeodeClient("localhost:3141")
        await self.client.connect()

    async def disconnect(self, close_code):
        if self.client:
            await self.client.close()

    async def receive(self, text_data):
        data = json.loads(text_data)
        query = data.get('query')
        params = data.get('parameters', {})

        try:
            result = await self.client.execute(query, params)
            await self.send(text_data=json.dumps({
                'status': 'success',
                'data': [dict(row) for row in result]
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'status': 'error',
                'message': str(e)
            }))
```

## AIOHTTP Integration

Build REST APIs with AIOHTTP:

```python
from aiohttp import web
from geode_client import ConnectionPool

# Initialize connection pool
geode_pool = None

async def init_app():
    global geode_pool
    geode_pool = ConnectionPool(
        url="localhost:3141",
        min_connections=10,
        max_connections=100
    )

async def cleanup_app():
    await geode_pool.close()

async def get_user(request):
    user_id = request.match_info['user_id']

    async with geode_pool.acquire() as client:
        result = await client.execute(
            "MATCH (u:User {id: $id}) RETURN u",
            {"id": user_id}
        )

        if not result:
            return web.json_response({'error': 'User not found'}, status=404)

        user = dict(result[0])
        return web.json_response(user)

async def create_user(request):
    data = await request.json()

    async with geode_pool.acquire() as client:
        async with client.transaction() as tx:
            result = await tx.execute(
                "CREATE (u:User {name: $name, email: $email}) RETURN u.id",
                {"name": data['name'], "email": data['email']}
            )
            await tx.commit()

            user_id = result[0]['u.id']
            return web.json_response({'id': user_id}, status=201)

app = web.Application()
app.on_startup.append(init_app)
app.on_cleanup.append(cleanup_app)
app.router.add_get('/users/{user_id}', get_user)
app.router.add_post('/users', create_user)

web.run_app(app, port=8080)
```

## Testing Strategies

### Unit Testing with Mocks

```python
import pytest
from unittest.mock import AsyncMock, patch
from myapp.services import UserService

@pytest.mark.asyncio
async def test_get_user():
    # Mock GeodeClient
    mock_client = AsyncMock()
    mock_client.execute.return_value = [
        {'u.id': '123', 'u.name': 'Alice', 'u.email': 'alice@example.com'}
    ]

    with patch('myapp.services.GeodeClient', return_value=mock_client):
        service = UserService()
        user = await service.get_user('123')

        assert user['name'] == 'Alice'
        assert user['email'] == 'alice@example.com'
        mock_client.execute.assert_called_once()
```

### Integration Testing with Test Containers

```python
import pytest
from testcontainers.core.container import DockerContainer
from geode_client import GeodeClient

@pytest.fixture(scope="session")
async def geode_container():
    # Start Geode in Docker container
    container = DockerContainer("geodedb/geode:0.18.0")
    container.with_exposed_ports(3141)
    container.start()

    host = container.get_container_host_ip()
    port = container.get_exposed_port(3141)

    yield f"{host}:{port}"

    container.stop()

@pytest.mark.asyncio
async def test_crud_operations(geode_container):
    async with GeodeClient(geode_container) as client:
        # Create
        result = await client.execute(
            "CREATE (u:User {name: $name}) RETURN u.id",
            {"name": "Test User"}
        )
        user_id = result[0]['u.id']

        # Read
        result = await client.execute(
            "MATCH (u:User {id: $id}) RETURN u.name",
            {"id": user_id}
        )
        assert result[0]['u.name'] == "Test User"

        # Update
        await client.execute(
            "MATCH (u:User {id: $id}) SET u.name = $new_name",
            {"id": user_id, "new_name": "Updated User"}
        )

        # Delete
        await client.execute(
            "MATCH (u:User {id: $id}) DELETE u",
            {"id": user_id}
        )
```

## Performance Optimization

### Connection Pool Tuning

```python
# Configure pool for your workload
pool = ConnectionPool(
    url="localhost:3141",
    min_connections=10,      # Keep warm connections ready
    max_connections=100,     # Limit concurrent connections
    max_idle_time=300,       # Close idle connections after 5 minutes
    connection_timeout=10,   # Fail fast on connection issues
    query_timeout=30,        # Prevent long-running queries
    retry_attempts=3,        # Retry transient failures
    retry_delay=1.0          # Wait between retries
)
```

### Batch Operations

```python
# Inefficient: Individual inserts
for user in users:
    await client.execute("CREATE (u:User {name: $name})", {"name": user.name})

# Efficient: Batched in transaction
async with client.transaction() as tx:
    for user in users:
        await tx.execute("CREATE (u:User {name: $name})", {"name": user.name})
    await tx.commit()

# Most efficient: Bulk import
await client.bulk_import("User", [
    {"name": user.name, "email": user.email}
    for user in users
])
```

### Query Result Caching

```python
from functools import lru_cache
from datetime import datetime, timedelta

class CachedGeodeClient:
    def __init__(self, client):
        self.client = client
        self.cache = {}

    async def execute_cached(self, query, params, ttl_seconds=60):
        cache_key = (query, str(sorted(params.items())))

        if cache_key in self.cache:
            result, timestamp = self.cache[cache_key]
            if datetime.now() - timestamp < timedelta(seconds=ttl_seconds):
                return result

        result = await self.client.execute(query, params)
        self.cache[cache_key] = (result, datetime.now())
        return result
```

## Troubleshooting

### Connection Issues

```python
from geode_client import ConnectionError, TimeoutError
import asyncio

async def robust_connect(url, max_retries=3):
    for attempt in range(max_retries):
        try:
            client = GeodeClient(url)
            await client.connect()
            return client
        except ConnectionError as e:
            if attempt == max_retries - 1:
                raise
            wait_time = 2 ** attempt  # Exponential backoff
            logger.warning(f"Connection failed (attempt {attempt+1}/{max_retries}): {e}")
            await asyncio.sleep(wait_time)
```

### Query Debugging

```python
# Enable query logging
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('geode_client')
logger.setLevel(logging.DEBUG)

# Use EXPLAIN to analyze queries
result = await client.explain("""
    MATCH (u:User)-[:PURCHASED]->(p:Product)
    WHERE u.age > 25
    RETURN p.name, COUNT(*) as purchases
    ORDER BY purchases DESC
""")
print(result.execution_plan)
print(f"Estimated cost: {result.estimated_cost}")
```

### Memory Management

```python
# Use streaming for large datasets to avoid memory issues
async def process_large_dataset():
    processed = 0
    batch_size = 1000

    async for row in client.stream("MATCH (n:Product) RETURN n"):
        await process_row(row)
        processed += 1

        # Periodic progress updates
        if processed % batch_size == 0:
            logger.info(f"Processed {processed} rows")
```

## Security Best Practices

```python
# Use parameterized queries to prevent injection
# NEVER do this:
user_input = "Alice' OR '1'='1"
query = f"MATCH (u:User {{name: '{user_input}'}}) RETURN u"  # VULNERABLE!

# ALWAYS do this:
await client.execute(
    "MATCH (u:User {name: $name}) RETURN u",
    {"name": user_input}  # Safe - properly escaped
)

# Implement timeout policies
client = GeodeClient("localhost:3141", query_timeout=30)

# Use TLS in production
client = GeodeClient(
    "geode.production.com:3141",
    tls_verify=True,
    tls_ca_cert="/path/to/ca.crt"
)

# Rotate credentials regularly
await client.authenticate(username, password)
```

## Performance Benchmarks

**Connection Pooling**: 1,000+ queries/second with min_connections=10, max_connections=100

**Query Latency**: p50=5ms, p95=15ms, p99=30ms for simple MATCH queries on warm cache

**Transaction Throughput**: 500+ transactions/second with ACID guarantees

**Streaming Performance**: Processes 10,000+ rows/second with constant memory footprint

**Batch Import**: Loads 100,000 nodes in under 10 seconds with transaction batching

## Related Topics

- [Client Libraries](/tags/client-libraries/) - Overview of all Geode client libraries
- [SDK](/tags/sdk/) - Software development kit resources
- [API Development](/tags/api/) - Building APIs with Geode
- [Transactions](/tags/transactions/) - Transaction management and ACID guarantees
- [Connection Pooling](/tags/connection-pooling/) - Connection pool configuration
- [Async Programming](/tags/async/) - Asynchronous programming patterns

## Documentation

- [Python Client Documentation](/docs/clients/python/) - Complete API reference
- [Installation Guide](/docs/clients/python/installation/) - Setup and configuration
- [Tutorial](/docs/clients/python/tutorial/) - Step-by-step learning guide
- [Examples Repository](https://github.com/geodedb/python-examples) - Real-world code samples
- [API Reference](/docs/clients/python/api/) - Complete method documentation
