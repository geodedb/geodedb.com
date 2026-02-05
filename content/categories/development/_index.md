---
title: "Category: Development & Developer Tools"
description: "Comprehensive development resources for building applications with Geode including SDKs, APIs, CLI tools, LSP integration, and best practices."
keywords:
  - development
  - developer tools
  - SDK
  - API
  - CLI
  - LSP
  - developer experience
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/development/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

The **Development & Developer Tools** category encompasses comprehensive resources for building applications with Geode graph database. From initial setup through production deployment, these resources cover the complete development lifecycle with practical guides, API references, and tooling documentation.

## Introduction

Modern database development requires more than just query capabilities—developers need rich tooling, intuitive APIs, and streamlined workflows. Geode provides a complete development ecosystem designed for productivity and ease of use. The REPL shell enables interactive query development with syntax highlighting and auto-completion. Client libraries for Go, Python, Rust, Node.js, and Zig offer idiomatic APIs for each language. LSP integration brings IDE features like error checking and go-to-definition to any editor. CLI tools automate common tasks from schema management to deployment.

This category documents the full development experience, from writing your first query in the REPL to building production applications with client libraries. Whether you're prototyping a new feature, debugging a complex query, or optimizing application performance, these resources provide the knowledge and tools you need. Topics span programming language integrations, development workflows, testing strategies, debugging techniques, and operational best practices.

## What You'll Find

### Development Tools

**Interactive Shell (REPL)**
- Interactive query development with immediate feedback
- Syntax highlighting and auto-completion
- Multi-line editing for complex queries
- Transaction management and session persistence
- Query profiling and execution plan analysis
- Meta-commands for database introspection
- History search and command recall
- Result formatting and export

**CLI Tools**
- Database server management (`geode serve`)
- Interactive shell access (`geode shell`)
- Schema management and migrations
- Backup and restore operations
- Performance monitoring and diagnostics
- Configuration management
- Deployment automation
- Testing and validation tools

**Language Server Protocol (LSP)**
- IDE integration for VS Code, Vim, Emacs, and others
- Real-time syntax validation and error checking
- Context-aware auto-completion
- Hover documentation and tooltips
- Go-to-definition navigation
- Find references and symbols
- Code formatting and refactoring
- Schema-aware suggestions

### Client Libraries

**Official SDKs**
- **Go Client**: `database/sql` driver with connection pooling
- **Python Client**: Async client with aioquic and connection pooling
- **Rust Client**: Tokio-based high-performance client
- **Zig Client**: Native Zig implementation with vendored QUIC

**Common Features**
- QUIC + TLS 1.3 transport protocol
- Connection pooling and management
- Prepared statement support
- Transaction management with savepoints
- Streaming result sets for large queries
- Parametrized queries for SQL injection prevention
- Error handling with GQL status codes
- Type-safe value marshaling

### API and Protocol

**GQL Query API**
- ISO/IEC 39075:2024 compliant query language
- Pattern matching with ASCII-art syntax
- CRUD operations (INSERT, UPDATE, DELETE)
- Aggregations and subqueries
- Path queries and graph algorithms
- Transaction control (BEGIN, COMMIT, ROLLBACK)
- Prepared statements and parameter binding

**Wire Protocol**
- Protobuf wire protocol over QUIC (default) or gRPC
- Multiplexed streams for concurrent queries
- Request types: `HelloRequest`, `ExecuteRequest`, `PullRequest`, `BeginRequest`, `CommitRequest`
- Response type: `ExecutionResponse` (payloads: `SchemaDefinition`, `DataPage`, `Error`, `ExplainPayload`, `ProfilePayload`)
- Streaming results with flow control
- Connection migration support
- 0-RTT resumption for low latency

### Development Workflows

**Local Development**
- Quick start with Docker or binary installation
- REPL-driven query development
- Schema design and iteration
- Test data generation and seeding
- Local debugging with profiling tools
- Integration testing with testcontainers

**CI/CD Integration**
- Automated testing in CI pipelines
- Schema migration automation
- Performance regression testing
- Deployment to staging and production
- Rollback strategies and blue-green deployments
- Monitoring and observability integration

**Debugging and Profiling**
- EXPLAIN for query execution plans
- PROFILE for performance analysis
- Query tracing and logging
- Connection debugging
- Performance bottleneck identification
- Memory and CPU profiling

## Use Cases with Code Examples

### Rapid Prototyping with REPL

```bash
# Start interactive shell
geode shell

# Explore existing data
geode> MATCH (n) RETURN DISTINCT labels(n), count(*);

# Test query patterns
geode> MATCH (p:Person)-[:KNOWS]->(f:Person)
       WHERE p.age > 30
       RETURN p.name, collect(f.name) AS friends;

# Profile for performance
geode> \profile MATCH (p:Person)-[:KNOWS*2]-(friend)
                WHERE p.name = 'Alice'
                RETURN DISTINCT friend.name;

# Save successful queries
geode> \save queries/social_network.gql
```

### Building Applications with Client Libraries

**Python Example**
```python
import geode_client
import asyncio

async def get_user_recommendations(user_id: int, limit: int = 10):
    """Get product recommendations for a user."""
    client = geode_client.open_database('quic://localhost:3141')
    async with client.connection() as conn:
        query = """
            MATCH (user:User {id: $user_id})-[:PURCHASED]->(product:Product)
                 <-[:PURCHASED]-(similar:User)-[:PURCHASED]->(rec:Product)
            WHERE NOT EXISTS {
                MATCH (user)-[:PURCHASED]->(rec)
            }
            RETURN rec.name AS product,
                   rec.price AS price,
                   COUNT(similar) AS score
            ORDER BY score DESC, rec.rating DESC
            LIMIT $limit
        """

        result, _ = await conn.query(query, {
            'user_id': user_id,
            'limit': limit
        })

        recommendations = []
        for row in result.rows:
            recommendations.append({
                'product': row['product'],
                'price': row['price'],
                'score': row['score']
            })

        return recommendations

# Use in application
recommendations = asyncio.run(get_user_recommendations(12345))
for rec in recommendations:
    print(f"{rec['product']}: ${rec['price']} (score: {rec['score']})")
```

**Go Example**
```go
package main

import (
    "context"
    "database/sql"
    "log"

    _ "geodedb.com/geode"
)

type Product struct {
    Name  string
    Price float64
    Score int
}

func GetRecommendations(userID int, limit int) ([]Product, error) {
    db, err := sql.Open("geode", "quic://localhost:3141")
    if err != nil {
        return nil, err
    }
    defer db.Close()

    query := `
        MATCH (user:User {id: $1})-[:PURCHASED]->(product:Product)
             <-[:PURCHASED]-(similar:User)-[:PURCHASED]->(rec:Product)
        WHERE NOT EXISTS {
            MATCH (user)-[:PURCHASED]->(rec)
        }
        RETURN rec.name, rec.price, COUNT(similar) AS score
        ORDER BY score DESC, rec.rating DESC
        LIMIT $2
    `

    rows, err := db.QueryContext(context.Background(), query, userID, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var products []Product
    for rows.Next() {
        var p Product
        if err := rows.Scan(&p.Name, &p.Price, &p.Score); err != nil {
            return nil, err
        }
        products = append(products, p)
    }

    return products, rows.Err()
}

func main() {
    recommendations, err := GetRecommendations(12345, 10)
    if err != nil {
        log.Fatal(err)
    }

    for _, rec := range recommendations {
        log.Printf("%s: $%.2f (score: %d)", rec.Name, rec.Price, rec.Score)
    }
}
```

### IDE Integration with LSP

**VS Code Configuration**
```json
{
  "gql.server.host": "localhost",
  "gql.server.port": 3141,
  "gql.validation.enabled": true,
  "gql.completion.autoComplete": true,
  "gql.format.enable": true,
  "gql.hover.documentation": true,
  "editor.formatOnSave": true,
  "files.associations": {
    "*.gql": "gql"
  }
}
```

**Query Development with LSP**
```gql
-- Full IDE support: auto-completion, error checking, go-to-definition
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
WHERE p.age > $minAge
  AND c.industry = $industry
RETURN p.name AS employee,
       c.name AS company,
       p.salary AS salary
ORDER BY p.salary DESC
LIMIT $limit
```

### Automated Testing

**Python Testing Example**
```python
import pytest
import geode_client

@pytest.fixture
async def db():
    """Provide test database connection."""
    client = geode_client.open_database('quic://localhost:3141')
    async with client.connection() as conn:
        # Setup: Create test data
        await conn.execute("""
            INSERT (:Person {id: 1, name: 'Alice', age: 30}),
                   (:Person {id: 2, name: 'Bob', age: 25}),
                   (:Person {id: 1})-[:KNOWS]->(:Person {id: 2})
        """)

        yield conn

        # Teardown: Clean up test data
        await conn.execute("MATCH (n:Person) DELETE n")

@pytest.mark.asyncio
async def test_friend_recommendation(db):
    """Test friend recommendation query."""
    result, _ = await db.query("""
        MATCH (p:Person {id: 1})-[:KNOWS]->()-[:KNOWS]->(foaf:Person)
        WHERE NOT EXISTS {
            MATCH (p)-[:KNOWS]->(foaf)
        }
        RETURN foaf.name AS recommended_friend
    """)

    friends = [row['recommended_friend'] for row in result.rows]
    assert len(friends) > 0
```

## Best Practices

### Development Workflow

1. **REPL-First Development**: Use REPL for query prototyping
2. **Version Control**: Track queries and schema in Git
3. **Schema Migrations**: Use versioned migration scripts
4. **Environment Parity**: Keep dev/staging/prod schemas aligned
5. **Code Reviews**: Review GQL queries like application code

### API Usage

1. **Connection Pooling**: Reuse connections for better performance
2. **Prepared Statements**: Use parameterized queries for security
3. **Error Handling**: Catch and handle GQL-specific errors
4. **Transaction Boundaries**: Keep transactions short and focused
5. **Result Streaming**: Stream large result sets to conserve memory

### Testing Strategy

1. **Unit Tests**: Test query logic with test data
2. **Integration Tests**: Test against real database
3. **Performance Tests**: Benchmark critical queries
4. **Schema Tests**: Validate schema integrity
5. **Regression Tests**: Prevent performance regressions

### Debugging Techniques

1. **EXPLAIN Queries**: Understand execution plans
2. **PROFILE Queries**: Measure actual performance
3. **Logging**: Enable query logging in development
4. **Tracing**: Use distributed tracing for debugging
5. **Monitoring**: Watch query metrics in production

## Related Categories

- [Tutorials](/categories/tutorials/) - Step-by-step learning guides
- [Query Language](/categories/query-language/) - GQL reference and examples
- [Client Libraries](/categories/client-libraries/) - SDK documentation
- [Reference](/categories/reference/) - API and protocol reference
- [Best Practices](/categories/best-practices/) - Development guidelines

## Related Tags

- [REPL](/tags/repl/) - Interactive shell
- [CLI](/tags/cli/) - Command-line tools
- [LSP](/tags/lsp/) - Language Server Protocol
- [API](/tags/api/) - API documentation
- [GQL](/tags/gql/) - Graph Query Language
- [Tools](/tags/tools/) - Development tooling
- [Debugging](/tags/debugging/) - Debugging techniques
- [Testing](/tags/testing/) - Testing strategies

## Advanced Development Patterns

### Connection Pool Management

```python
import geode_client
from contextlib import asynccontextmanager

class DatabasePool:
    """Production-ready connection pool."""

    def __init__(self, url, min_size=5, max_size=20):
        self.url = url
        self.min_size = min_size
        self.max_size = max_size
        self._pool = None

    async def initialize(self):
        """Initialize connection pool."""
        self._pool = await geode_client.create_pool(
            self.url,
            min_size=self.min_size,
            max_size=self.max_size,
            timeout=30,
            idle_timeout=300
        )

    @asynccontextmanager
    async def acquire(self):
        """Acquire connection from pool."""
        async with self._pool.acquire() as conn:
            try:
                yield conn
            except Exception as e:
                # Log error with context
                logger.error(f"Database error: {e}", exc_info=True)
                raise

    async def close(self):
        """Close all pool connections."""
        await self._pool.close()

# Usage
pool = DatabasePool("quic://localhost:3141")
await pool.initialize()

async with pool.acquire() as conn:
    result, _ = await conn.query("MATCH (n) RETURN count(n)")
```

### Query Builder Pattern

```python
class GQLQueryBuilder:
    """Fluent API for building GQL queries."""

    def __init__(self):
        self.match_clauses = []
        self.where_conditions = []
        self.return_expressions = []
        self.order_by = []
        self.limit_value = None
        self.params = {}

    def match(self, pattern, **kwargs):
        """Add MATCH clause."""
        self.match_clauses.append(pattern)
        self.params.update(kwargs)
        return self

    def where(self, condition):
        """Add WHERE condition."""
        self.where_conditions.append(condition)
        return self

    def return_(self, *expressions):
        """Add RETURN expressions."""
        self.return_expressions.extend(expressions)
        return self

    def order_by_desc(self, field):
        """Add ORDER BY DESC."""
        self.order_by.append(f"{field} DESC")
        return self

    def limit(self, count):
        """Add LIMIT."""
        self.limit_value = count
        return self

    def build(self):
        """Build final query string."""
        parts = []

        # MATCH
        for clause in self.match_clauses:
            parts.append(f"MATCH {clause}")

        # WHERE
        if self.where_conditions:
            parts.append("WHERE " + " AND ".join(self.where_conditions))

        # RETURN
        if self.return_expressions:
            parts.append("RETURN " + ", ".join(self.return_expressions))

        # ORDER BY
        if self.order_by:
            parts.append("ORDER BY " + ", ".join(self.order_by))

        # LIMIT
        if self.limit_value:
            parts.append(f"LIMIT {self.limit_value}")

        return "\n".join(parts)

# Usage
query = (GQLQueryBuilder()
    .match("(u:User)-[:POSTED]->(p:Post)", user_id=123)
    .where("u.id = $user_id")
    .where("p.created > $min_date")
    .return_("p.title", "p.created")
    .order_by_desc("p.created")
    .limit(10)
    .build())

print(query)
# Output:
# MATCH (u:User)-[:POSTED]->(p:Post)
# WHERE u.id = $user_id AND p.created > $min_date
# RETURN p.title, p.created
# ORDER BY p.created DESC
# LIMIT 10
```

### Repository Pattern

```python
from abc import ABC, abstractmethod
from typing import Optional, List

class Repository(ABC):
    """Base repository interface."""

    @abstractmethod
    async def find_by_id(self, id: int):
        pass

    @abstractmethod
    async def find_all(self) -> List:
        pass

    @abstractmethod
    async def save(self, entity):
        pass

    @abstractmethod
    async def delete(self, id: int):
        pass

class UserRepository(Repository):
    """User-specific repository implementation."""

    def __init__(self, pool):
        self.pool = pool

    async def find_by_id(self, user_id: int) -> Optional[dict]:
        """Find user by ID."""
        async with self.pool.acquire() as conn:
            result, _ = await conn.query("""
                MATCH (u:User {id: $id})
                RETURN u.id AS id,
                       u.name AS name,
                       u.email AS email,
                       u.created AS created
            """, {"id": user_id})

            return result.rows[0] if result.rows else None

    async def find_by_email(self, email: str) -> Optional[dict]:
        """Find user by email."""
        async with self.pool.acquire() as conn:
            result, _ = await conn.query("""
                MATCH (u:User {email: $email})
                RETURN u.id AS id, u.name AS name, u.email AS email
            """, {"email": email})

            return result.rows[0] if result.rows else None

    async def find_all(self) -> List[dict]:
        """Get all users."""
        async with self.pool.acquire() as conn:
            result, _ = await conn.query("""
                MATCH (u:User)
                RETURN u.id AS id, u.name AS name, u.email AS email
                ORDER BY u.created DESC
            """)

            return [row for row in result.rows]

    async def save(self, user: dict):
        """Create or update user."""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                MERGE (u:User {email: $email})
                SET u.name = $name,
                    u.updated = current_timestamp()
                ON CREATE SET u.created = current_timestamp()
            """, user)

    async def delete(self, user_id: int):
        """Delete user."""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                MATCH (u:User {id: $id})
                DETACH DELETE u
            """, {"id": user_id})

# Usage
user_repo = UserRepository(pool)
user = await user_repo.find_by_email("alice@example.com")
```

### Error Handling Strategies

```python
from enum import Enum
from typing import Optional
import logging

class GeodeErrorCode(Enum):
    """GQL error codes."""
    CONSTRAINT_VIOLATION = "22000"
    QUERY_TIMEOUT = "57014"
    SERIALIZATION_FAILURE = "40001"
    DEADLOCK = "40P01"

class RetryableError(Exception):
    """Error that should trigger retry."""
    pass

class PermanentError(Exception):
    """Error that should not be retried."""
    pass

async def execute_with_retry(func, max_retries=3, backoff_factor=2):
    """Execute function with exponential backoff retry."""
    for attempt in range(max_retries):
        try:
            return await func()
        except geode_client.QueryError as e:
            error_code = e.code

            # Check if error is retryable
            if error_code in [GeodeErrorCode.SERIALIZATION_FAILURE.value,
                             GeodeErrorCode.DEADLOCK.value]:
                if attempt < max_retries - 1:
                    wait_time = backoff_factor ** attempt
                    logging.warning(f"Retrying after {wait_time}s due to: {e}")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    raise RetryableError(f"Max retries exceeded: {e}")
            else:
                # Permanent error, don't retry
                raise PermanentError(f"Permanent error: {e}")

# Usage
async def transfer_money(from_id, to_id, amount):
    async with pool.acquire() as conn:
        async with conn.connection() as tx:
            await tx.begin()
            await tx.execute("""
                MATCH (from:Account {id: $from_id})
                SET from.balance = from.balance - $amount
            """, {"from_id": from_id, "amount": amount})

            await tx.execute("""
                MATCH (to:Account {id: $to_id})
                SET to.balance = to.balance + $amount
            """, {"to_id": to_id, "amount": amount})

            await tx.commit()

# Execute with retry
await execute_with_retry(lambda: transfer_money(1, 2, 100.0))
```

## Performance Monitoring

### Query Performance Tracking

```python
import time
from functools import wraps
import prometheus_client

# Prometheus metrics
query_duration = prometheus_client.Histogram(
    'geode_query_duration_seconds',
    'Query execution time',
    ['query_type']
)

query_counter = prometheus_client.Counter(
    'geode_queries_total',
    'Total queries executed',
    ['query_type', 'status']
)

def track_query_performance(query_type: str):
    """Decorator to track query performance."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            status = 'success'

            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                status = 'error'
                raise
            finally:
                duration = time.perf_counter() - start_time
                query_duration.labels(query_type=query_type).observe(duration)
                query_counter.labels(query_type=query_type, status=status).inc()

        return wrapper
    return decorator

# Usage
@track_query_performance('user_lookup')
async def find_user(email: str):
    async with pool.acquire() as conn:
        return await conn.execute("""
            MATCH (u:User {email: $email})
            RETURN u
        """, {"email": email})
```

### Slow Query Logging

```python
class SlowQueryLogger:
    """Log queries exceeding threshold."""

    def __init__(self, threshold_ms=1000):
        self.threshold_ms = threshold_ms

    async def execute(self, conn, query, params=None):
        """Execute query with timing."""
        start = time.perf_counter()
        try:
            result, _ = await conn.query(query, params)
            return result
        finally:
            duration_ms = (time.perf_counter() - start) * 1000

            if duration_ms > self.threshold_ms:
                logging.warning(
                    f"Slow query ({duration_ms:.2f}ms): {query[:100]}...",
                    extra={
                        'duration_ms': duration_ms,
                        'query': query,
                        'params': params
                    }
                )

# Usage
logger = SlowQueryLogger(threshold_ms=500)
async with pool.acquire() as conn:
    result, _ = await logger.query(conn, "MATCH (n) RETURN count(n)")
```

## Code Generation and Scaffolding

### Schema-to-Code Generator

```python
def generate_model_class(label: str, properties: dict):
    """Generate Python dataclass from graph schema."""
    lines = [
        "from dataclasses import dataclass",
        "from datetime import datetime",
        "from typing import Optional",
        "",
        "@dataclass",
        f"class {label}:"
    ]

    for prop_name, prop_type in properties.items():
        python_type = {
            'string': 'str',
            'integer': 'int',
            'float': 'float',
            'boolean': 'bool',
            'datetime': 'datetime'
        }.get(prop_type, 'str')

        lines.append(f"    {prop_name}: Optional[{python_type}] = None")

    return "\n".join(lines)

# Generate from schema
schema = {
    'User': {
        'id': 'integer',
        'name': 'string',
        'email': 'string',
        'created': 'datetime'
    }
}

for label, properties in schema.items():
    code = generate_model_class(label, properties)
    print(code)
```

## Continuous Integration Examples

### GitHub Actions Workflow

```yaml
name: Geode Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      geode:
        image: codepros/geode:latest
        ports:
          - 3141:3141
        options: >-
          --health-cmd "geode ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio

      - name: Wait for Geode
        run: |
          timeout 30 sh -c 'until geode ping; do sleep 1; done'

      - name: Run tests
        env:
          GEODE_URL: quic://localhost:3141
        run: pytest tests/

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Docker Compose for Development

```yaml
version: '3.8'

services:
  geode:
    image: codepros/geode:v0.1.3
    ports:
      - "3141:3141"
    volumes:
      - geode-data:/var/lib/geode
    environment:
      - GEODE_LOG_LEVEL=debug
    healthcheck:
      test: ["CMD", "geode", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    depends_on:
      - prometheus

volumes:
  geode-data:
```

## Further Reading

- [Getting Started Guide](/docs/getting-started/) - Initial setup and first queries
- [Client Library Documentation](/docs/client-libraries/) - SDK references
- [REPL Basics Tutorial](/docs/tutorials/repl-basics/) - Interactive shell documentation
- [LSP Guide](/docs/development/lsp-guide/) - IDE integration
- [API Reference](/docs/api-reference/) - Complete API documentation
- [Testing Guide](/docs/development/testing-guide/) - Coding and testing guidelines
- [Observability](/docs/ops/observability/) - Monitoring and observability setup
