---
title: "Testing and Quality Assurance"
description: "Comprehensive testing guide for Geode including unit testing, integration testing, performance testing, GQL query testing, test harness usage, and quality assurance best practices."
keywords:
  - testing
  - quality assurance
  - unit tests
  - integration tests
  - performance testing
  - test coverage
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/testing/"
    noindex: false
---

Testing documentation for Geode covers unit testing, integration testing, performance benchmarking, and quality assurance practices. Learn how to test applications built on Geode, validate queries, and ensure production readiness with comprehensive test coverage.

## Testing Philosophy

Geode achieves 97.4% test coverage (1,644/1,688 tests passing) through rigorous testing at multiple levels. The project follows evidence-based development with CANARY governance markers linking requirements to test evidence, ensuring every feature is properly validated.

## Unit Testing

### Testing Geode Applications

**Python application tests**:

```python
import pytest
import geode_client

@pytest.fixture
async def client():
    """Shared Geode client for tests."""
    client = await geode_client.connect("localhost:3141")
    yield client
    await client.close()

@pytest.fixture
async def test_db(client):
    """Clean database for each test."""
    # Setup: Create test data
    await client.execute("""
        CREATE (u1:User {id: 1, name: 'Alice'})
        CREATE (u2:User {id: 2, name: 'Bob'})
        CREATE (u1)-[:FRIENDS_WITH]->(u2)
    """)

    yield client

    # Teardown: Clean up
    await client.execute("MATCH (n) DETACH DELETE n")

@pytest.mark.asyncio
async def test_find_friends(test_db):
    """Test friend recommendation query."""
    result = await test_db.execute("""
        MATCH (me:User {name: 'Alice'})-[:FRIENDS_WITH]->(friend)
        RETURN friend.name
    """)

    assert len(result) == 1
    assert result[0]["friend.name"] == "Bob"

@pytest.mark.asyncio
async def test_transaction_rollback(client):
    """Test transaction rollback behavior."""
    try:
        async with client.transaction() as tx:
            await tx.execute("CREATE (u:User {id: 999})")
            # Simulate error
            raise ValueError("Test error")
    except ValueError:
        pass

    # Verify rollback
    result = await client.execute("MATCH (u:User {id: 999}) RETURN u")
    assert len(result) == 0
```

**Go application tests**:

```go
package myapp_test

import (
    "context"
    "testing"

    "go.codepros.org/geode"
)

func setupTestDB(t *testing.T) *geode.DB {
    db, err := geode.Connect(context.Background(), "localhost:3141")
    if err != nil {
        t.Fatalf("Failed to connect: %v", err)
    }

    // Clean database
    _, err = db.Exec(context.Background(), "MATCH (n) DETACH DELETE n")
    if err != nil {
        t.Fatalf("Failed to clean database: %v", err)
    }

    return db
}

func TestFindFriends(t *testing.T) {
    db := setupTestDB(t)
    defer db.Close()

    ctx := context.Background()

    // Setup test data
    _, err := db.Exec(ctx, `
        CREATE (u1:User {id: 1, name: 'Alice'})
        CREATE (u2:User {id: 2, name: 'Bob'})
        CREATE (u1)-[:FRIENDS_WITH]->(u2)
    `)
    if err != nil {
        t.Fatalf("Failed to create test data: %v", err)
    }

    // Test query
    rows, err := db.Query(ctx, `
        MATCH (me:User {name: 'Alice'})-[:FRIENDS_WITH]->(friend)
        RETURN friend.name
    `)
    if err != nil {
        t.Fatalf("Query failed: %v", err)
    }
    defer rows.Close()

    var count int
    for rows.Next() {
        var name string
        if err := rows.Scan(&name); err != nil {
            t.Fatalf("Scan failed: %v", err)
        }
        if name != "Bob" {
            t.Errorf("Expected 'Bob', got '%s'", name)
        }
        count++
    }

    if count != 1 {
        t.Errorf("Expected 1 result, got %d", count)
    }
}
```

### Query Testing

Test GQL queries in isolation:

```python
@pytest.mark.parametrize("query,expected_count", [
    ("MATCH (n:User) RETURN n", 2),
    ("MATCH (n:User {name: 'Alice'}) RETURN n", 1),
    ("MATCH ()-[r:FRIENDS_WITH]->() RETURN r", 1),
])
@pytest.mark.asyncio
async def test_basic_queries(test_db, query, expected_count):
    """Test basic query patterns."""
    result = await test_db.execute(query)
    assert len(result) == expected_count
```

Test query parameterization:

```python
@pytest.mark.asyncio
async def test_parameterized_query(test_db):
    """Test query with parameters."""
    result = await test_db.execute(
        "MATCH (u:User {name: $name}) RETURN u.id AS id",
        {"name": "Alice"}
    )

    assert len(result) == 1
    assert result[0]["id"] == 1
```

## Integration Testing

### Test Harness

Geode provides a cross-client test harness validating all client libraries:

```bash
cd geode-test-harness

# Setup dependencies
make setup

# Run tests for specific client
make test-python
make test-go
make test-rust
make test-zig

# Run all tests with reports
make test-all
make test-all-html  # Generate HTML reports
```

Test categories:
- **Basic operations**: Ping, simple queries, parameters
- **CRUD**: Node and relationship creation, updates, deletion
- **Transactions**: ACID guarantees, rollback, savepoints
- **Aggregations**: COUNT, SUM, AVG, MIN, MAX
- **Advanced**: Patterns, variable-length paths, subqueries
- **Concurrency**: Parallel queries, transaction conflicts
- **Data types**: Null handling, lists, maps, temporal types

### End-to-End Testing

Test complete application workflows:

```python
@pytest.mark.asyncio
async def test_user_registration_workflow(client):
    """Test complete user registration and login workflow."""

    # Step 1: Register user
    await client.execute("""
        CREATE (u:User {
            id: $id,
            email: $email,
            password_hash: $password_hash,
            created: current_timestamp()
        })
    """, {
        "id": 123,
        "email": "alice@example.com",
        "password_hash": hash_password("password123")
    })

    # Step 2: Verify user exists
    result = await client.execute("""
        MATCH (u:User {email: $email})
        RETURN u.id, u.email
    """, {"email": "alice@example.com"})

    assert len(result) == 1
    assert result[0]["u.id"] == 123

    # Step 3: Create user session
    async with client.transaction() as tx:
        await tx.execute("""
            MATCH (u:User {id: $user_id})
            CREATE (s:Session {
                id: $session_id,
                user_id: $user_id,
                created: current_timestamp(),
                expires: current_timestamp() + INTERVAL '24' HOUR
            })
            CREATE (u)-[:HAS_SESSION]->(s)
        """, {
            "user_id": 123,
            "session_id": "sess_abc123"
        })
        await tx.commit()

    # Step 4: Verify session created
    result = await client.execute("""
        MATCH (u:User {id: $user_id})-[:HAS_SESSION]->(s:Session)
        WHERE s.expires > current_timestamp()
        RETURN s.id
    """, {"user_id": 123})

    assert len(result) == 1
    assert result[0]["s.id"] == "sess_abc123"
```

## Performance Testing

### Benchmarking Queries

Measure query performance:

```python
import time
import statistics

async def benchmark_query(client, query, params=None, iterations=100):
    """Benchmark query execution time."""
    times = []

    for _ in range(iterations):
        start = time.perf_counter()
        await client.execute(query, params)
        end = time.perf_counter()
        times.append((end - start) * 1000)  # Convert to ms

    return {
        "mean": statistics.mean(times),
        "median": statistics.median(times),
        "stdev": statistics.stdev(times),
        "min": min(times),
        "max": max(times),
        "p95": statistics.quantiles(times, n=20)[18],  # 95th percentile
        "p99": statistics.quantiles(times, n=100)[98],  # 99th percentile
    }

@pytest.mark.asyncio
async def test_query_performance(test_db):
    """Test query performance meets SLA."""
    stats = await benchmark_query(
        test_db,
        "MATCH (u:User {id: $id}) RETURN u",
        {"id": 1}
    )

    # Assert performance SLAs
    assert stats["p95"] < 10.0, f"P95 latency {stats['p95']}ms exceeds 10ms SLA"
    assert stats["p99"] < 50.0, f"P99 latency {stats['p99']}ms exceeds 50ms SLA"
```

### Load Testing

Test system under load:

```python
import asyncio

async def load_test(client, concurrent_queries=100, duration_seconds=60):
    """Run load test with concurrent queries."""

    async def worker(worker_id):
        """Worker executing queries."""
        queries_executed = 0
        errors = 0
        start_time = time.time()

        while time.time() - start_time < duration_seconds:
            try:
                await client.execute(
                    "MATCH (u:User {id: $id}) RETURN u",
                    {"id": worker_id % 1000}
                )
                queries_executed += 1
            except Exception as e:
                errors += 1

        return {
            "worker_id": worker_id,
            "queries": queries_executed,
            "errors": errors
        }

    # Run workers concurrently
    tasks = [worker(i) for i in range(concurrent_queries)]
    results = await asyncio.gather(*tasks)

    # Aggregate results
    total_queries = sum(r["queries"] for r in results)
    total_errors = sum(r["errors"] for r in results)
    qps = total_queries / duration_seconds

    return {
        "total_queries": total_queries,
        "total_errors": total_errors,
        "error_rate": total_errors / total_queries if total_queries > 0 else 0,
        "queries_per_second": qps
    }

@pytest.mark.asyncio
async def test_load_performance(client):
    """Test system under load."""
    results = await load_test(client, concurrent_queries=50, duration_seconds=30)

    assert results["error_rate"] < 0.01, f"Error rate {results['error_rate']} exceeds 1%"
    assert results["queries_per_second"] > 1000, f"QPS {results['queries_per_second']} below 1000"
```

## Testing Best Practices

### Isolation

Ensure test isolation:

```python
@pytest.fixture(scope="function")
async def isolated_db(client):
    """Create isolated test database."""
    # Each test gets clean state
    await client.execute("MATCH (n) DETACH DELETE n")
    yield client
    await client.execute("MATCH (n) DETACH DELETE n")
```

### Determinism

Make tests deterministic:

```python
# Bad: Non-deterministic due to timestamp
await client.execute("""
    CREATE (u:User {created: current_timestamp()})
""")

# Good: Use fixed timestamps in tests
await client.execute("""
    CREATE (u:User {created: timestamp('2026-01-24T10:00:00Z')})
""")
```

### Test Data Management

Manage test data effectively:

```python
class TestDataFactory:
    """Factory for creating test data."""

    @staticmethod
    async def create_user(client, **kwargs):
        """Create test user with defaults."""
        defaults = {
            "id": 1,
            "name": "Test User",
            "email": "test@example.com"
        }
        user_data = {**defaults, **kwargs}

        await client.execute("""
            CREATE (u:User {
                id: $id,
                name: $name,
                email: $email
            })
        """, user_data)

        return user_data

@pytest.mark.asyncio
async def test_with_factory(client):
    """Test using data factory."""
    user = await TestDataFactory.create_user(
        client,
        id=123,
        name="Alice"
    )

    result = await client.execute(
        "MATCH (u:User {id: $id}) RETURN u.name",
        {"id": user["id"]}
    )

    assert result[0]["u.name"] == "Alice"
```

## Continuous Integration

### GitHub Actions

```yaml
name: Tests

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
          --health-cmd "/usr/local/bin/geode ping"
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
          pip install pytest pytest-asyncio pytest-cov

      - name: Run tests
        run: |
          pytest --cov=myapp --cov-report=xml tests/

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### GitLab CI

```yaml
test:
  image: python:3.11
  services:
    - name: codepros/geode:latest
      alias: geode
  variables:
    GEODE_HOST: geode
    GEODE_PORT: 3141
  before_script:
    - pip install -r requirements.txt pytest pytest-cov
  script:
    - pytest --cov=myapp tests/
  coverage: '/TOTAL.*\s+(\d+%)$/'
```

## Related Topics

- [Debugging](/tags/debugging/) - Troubleshooting techniques
- [Performance](/categories/performance-and-scaling/) - Performance testing
- [Development](/categories/development/) - Development workflow
- [Quality Assurance](/tags/best-practices/) - QA practices
- [CI/CD](/tags/devops/) - Continuous integration

## Further Reading

- [Test Harness Documentation](/docs/development/test-harness/) - Cross-client testing
- [Performance Benchmarking](/docs/performance/benchmarking/) - Benchmark methodology
- [Contributing Guide](/docs/contribute/) - Contributing tests
- [CANARY Markers](/docs/development/canary/) - Evidence-based testing
