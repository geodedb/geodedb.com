---
title: "Integration Testing"
description: "Learn about integration testing for Geode including cross-client tests, end-to-end scenarios, test harness usage, and multi-component validation strategies."
keywords:
  - integration testing
  - end-to-end testing
  - test harness
  - cross-client testing
  - system testing
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/integration-tests/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Integration Testing in Geode

Integration testing validates that Geode components work together correctly, from client libraries through the server to storage layers. Geode's test harness provides comprehensive cross-client validation ensuring all polyglot clients behave consistently.

## Geode Test Harness

The `geode-test-harness` validates all client libraries against a live Geode server:

```bash
cd geode-test-harness

# Setup test environment
make setup

# Run all client tests
make test-all

# Generate HTML report
make test-all-html

# Test specific client
make test-go
make test-python
make test-rust
make test-zig
```

## Test Categories

### 1. Basic Operations

```python
# geode-test-harness/tests/test_basic.py
import pytest

@pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
async def test_ping(client):
    """Verify client can ping server"""
    result = await run_client_test(client, "ping")
    assert result.success

@pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
async def test_simple_query(client):
    """Execute simple MATCH query"""
    result = await run_client_test(client, "query", 
        query="MATCH (n) RETURN count(n)")
    assert result.success
    assert 'count(n)' in result.columns
```

### 2. CRUD Operations

```python
@pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
async def test_node_create(client):
    """Create node and verify"""
    result = await run_client_test(client, "execute", 
        query="CREATE (u:User {name: 'Alice', age: 30}) RETURN u")
    assert result.success
    assert result.rows_affected == 1

@pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
async def test_relationship_create(client):
    """Create relationship between nodes"""
    await run_client_test(client, "execute",
        query="CREATE (a:User {name: 'Alice'})-[:KNOWS]->(b:User {name: 'Bob'})")
    
    result = await run_client_test(client, "query",
        query="MATCH (a:User)-[r:KNOWS]->(b:User) RETURN count(r)")
    assert result.bindings[0]['count(r)'] == 1
```

### 3. Transaction Tests

```python
@pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
async def test_transaction_commit(client):
    """Test transaction commit"""
    result = await run_client_test(client, "transaction", operations=[
        {"type": "begin"},
        {"type": "execute", "query": "CREATE (u:User {name: 'TX Test'})"},
        {"type": "commit"}
    ])
    assert result.success
    
    # Verify committed
    verify = await run_client_test(client, "query",
        query="MATCH (u:User {name: 'TX Test'}) RETURN count(u)")
    assert verify.bindings[0]['count(u)'] == 1

@pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
async def test_transaction_rollback(client):
    """Test transaction rollback"""
    result = await run_client_test(client, "transaction", operations=[
        {"type": "begin"},
        {"type": "execute", "query": "CREATE (u:User {name: 'Rollback Test'})"},
        {"type": "rollback"}
    ])
    assert result.success
    
    # Verify rolled back
    verify = await run_client_test(client, "query",
        query="MATCH (u:User {name: 'Rollback Test'}) RETURN count(u)")
    assert verify.bindings[0]['count(u)'] == 0
```

### 4. Concurrent Access

```python
@pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
async def test_concurrent_queries(client):
    """Test concurrent query execution"""
    import asyncio
    
    async def run_query(i):
        return await run_client_test(client, "query",
            query=f"MATCH (n) WHERE n.id = {i} RETURN n")
    
    # Run 100 concurrent queries
    results = await asyncio.gather(*[run_query(i) for i in range(100)])
    
    # All should succeed
    assert all(r.success for r in results)
```

## End-to-End Scenarios

### Multi-Client Workflow

```python
async def test_multi_client_workflow():
    """Test workflow across different clients"""
    
    # Go client creates data
    await run_client_test("go", "execute",
        query="CREATE (p:Product {id: 1, name: 'Widget', price: 19.99})")
    
    # Python client queries data
    result = await run_client_test("python", "query",
        query="MATCH (p:Product {id: 1}) RETURN p.name, p.price")
    assert result.bindings[0]['p.name'] == 'Widget'
    
    # Rust client updates data
    await run_client_test("rust", "execute",
        query="MATCH (p:Product {id: 1}) SET p.price = 24.99")
    
    # Zig client verifies update
    result = await run_client_test("zig", "query",
        query="MATCH (p:Product {id: 1}) RETURN p.price")
    assert result.bindings[0]['p.price'] == 24.99
```

### Data Type Compatibility

```python
async def test_data_type_roundtrip():
    """Verify data types work across all clients"""
    test_data = {
        "null_value": None,
        "int_value": 42,
        "float_value": 3.14159,
        "string_value": "Hello, Geode!",
        "bool_value": True,
        "list_value": [1, 2, 3, 4, 5],
        "map_value": {"key": "value", "nested": {"a": 1}}
    }
    
    # Create with Go client
    await run_client_test("go", "execute",
        query="CREATE (n:Test $props)",
        params={"props": test_data})
    
    # Verify with each client
    for client in ["go", "python", "rust", "zig"]:
        result = await run_client_test(client, "query",
            query="MATCH (n:Test) RETURN n")
        
        node = result.bindings[0]['n']
        assert node['int_value'] == 42
        assert abs(node['float_value'] - 3.14159) < 0.0001
        assert node['string_value'] == "Hello, Geode!"
        assert node['list_value'] == [1, 2, 3, 4, 5]
```

## Performance Testing

```python
async def test_throughput():
    """Measure queries per second for each client"""
    import time
    
    for client in ["go", "python", "rust", "zig"]:
        start = time.time()
        query_count = 1000
        
        for i in range(query_count):
            await run_client_test(client, "query",
                query="MATCH (n) RETURN count(n)")
        
        duration = time.time() - start
        qps = query_count / duration
        
        print(f"{client}: {qps:.2f} QPS")

        # Verify minimum performance
        baseline_qps = 0  # Set based on your benchmark baseline
        assert qps >= baseline_qps, (
            f"{client}: {qps:.2f} QPS below baseline {baseline_qps}"
        )
```

## Error Handling Tests

```python
@pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
async def test_parse_error(client):
    """Verify parse errors handled correctly"""
    result = await run_client_test(client, "query",
        query="INVALID QUERY SYNTAX",
        expect_error=True)
    
    assert not result.success
    assert "ParseError" in result.error_type

@pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
async def test_connection_error(client):
    """Verify connection errors handled"""
    result = await run_client_test(client, "connect",
        host="nonexistent.host",
        port=9999,
        expect_error=True)
    
    assert not result.success
    assert "ConnectionError" in result.error_type
```

## Test Reporting

```python
# Generate comprehensive test report
def generate_test_report(results):
    report = {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total_tests": len(results),
            "passed": sum(1 for r in results if r.success),
            "failed": sum(1 for r in results if not r.success),
            "duration_seconds": sum(r.duration for r in results)
        },
        "by_client": {}
    }
    
    for client in ["go", "python", "rust", "zig"]:
        client_results = [r for r in results if r.client == client]
        report["by_client"][client] = {
            "total": len(client_results),
            "passed": sum(1 for r in client_results if r.success),
            "failed": sum(1 for r in client_results if not r.success),
            "avg_duration_ms": sum(r.duration for r in client_results) / len(client_results) * 1000
        }
    
    return report
```

## Continuous Integration Setup

### GitHub Actions Integration

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      geode:
        image: geode:latest
        ports:
          - 3141:3141
        options: >-
          --health-cmd "geode ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    strategy:
      matrix:
        client: [go, python, rust, zig]

    steps:
      - uses: actions/checkout@v3

      - name: Setup ${{ matrix.client }}
        run: |
          cd geode-test-harness
          make setup-${{ matrix.client }}

      - name: Run Integration Tests
        run: |
          cd geode-test-harness
          make test-${{ matrix.client }}

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results-${{ matrix.client }}
          path: geode-test-harness/reports/${{ matrix.client }}/
```

### Docker Compose Test Environment

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  geode:
    image: geode:latest
    ports:
      - "3141:3141"
    environment:
      - GEODE_LOG_LEVEL=debug
      - GEODE_MAX_CONNECTIONS=1000
    healthcheck:
      test: ["CMD", "geode", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  test-runner:
    build:
      context: ./geode-test-harness
      dockerfile: Dockerfile.test
    depends_on:
      geode:
        condition: service_healthy
    environment:
      - GEODE_HOST=geode
      - GEODE_PORT=3141
    volumes:
      - ./geode-test-harness:/app
      - ./test-results:/app/reports
```

## Advanced Testing Patterns

### Schema Validation Tests

```python
async def test_schema_consistency():
    """Verify schema is consistent across all operations"""

    # Create schema
    await run_client_test("python", "execute", query="""
        CREATE (u:User {id: 'test1', name: 'Test User', age: 25})
    """)

    # Verify schema from all clients
    for client in ["go", "python", "rust", "zig"]:
        result = await run_client_test(client, "query",
            query="MATCH (u:User {id: 'test1'}) RETURN u.name, u.age")

        assert result.bindings[0]['u.name'] == 'Test User'
        assert result.bindings[0]['u.age'] == 25
```

### Stress Testing

```python
async def test_connection_pool_under_load():
    """Test connection pool handles high concurrent load"""
    import asyncio

    async def concurrent_queries(client, n=100):
        tasks = []
        for i in range(n):
            task = run_client_test(client, "query",
                query=f"MATCH (n) WHERE n.id = {i} RETURN n")
            tasks.append(task)

        results = await asyncio.gather(*tasks)
        return results

    for client in ["go", "python", "rust", "zig"]:
        start = time.time()
        results = await concurrent_queries(client, n=500)
        duration = time.time() - start

        # All queries should succeed
        assert all(r.success for r in results)

        # Should complete in reasonable time
        assert duration < 30  # 30 seconds for 500 queries

        print(f"{client}: {500/duration:.2f} QPS")
```

### Data Consistency Tests

```python
async def test_transaction_isolation():
    """Verify transaction isolation between clients"""

    # Client 1 starts transaction
    tx1_id = await run_client_test("python", "transaction_begin")

    # Client 1 creates data
    await run_client_test("python", "execute",
        transaction_id=tx1_id,
        query="CREATE (u:User {id: 'iso_test', name: 'Isolated'})")

    # Client 2 should NOT see uncommitted data
    result = await run_client_test("go", "query",
        query="MATCH (u:User {id: 'iso_test'}) RETURN count(u)")
    assert result.bindings[0]['count(u)'] == 0

    # Client 1 commits
    await run_client_test("python", "transaction_commit",
        transaction_id=tx1_id)

    # Now Client 2 should see data
    result = await run_client_test("go", "query",
        query="MATCH (u:User {id: 'iso_test'}) RETURN count(u)")
    assert result.bindings[0]['count(u)'] == 1
```

### Binary Data Handling

```python
async def test_binary_data_roundtrip():
    """Test binary data handling across clients"""
    import base64

    # Create binary data
    binary_data = bytes([i % 256 for i in range(1000)])
    encoded = base64.b64encode(binary_data).decode('utf-8')

    # Store via Python client
    await run_client_test("python", "execute",
        query="CREATE (b:Binary {id: 'test', data: $data})",
        params={"data": encoded})

    # Retrieve via each client
    for client in ["go", "python", "rust", "zig"]:
        result = await run_client_test(client, "query",
            query="MATCH (b:Binary {id: 'test'}) RETURN b.data")

        retrieved = base64.b64decode(result.bindings[0]['b.data'])
        assert retrieved == binary_data
```

### Time Zone Handling

```python
async def test_timezone_consistency():
    """Verify timestamp handling across timezones"""
    from datetime import datetime, timezone

    # Create timestamp in UTC
    now_utc = datetime.now(timezone.utc)

    # Store via Go client
    await run_client_test("go", "execute",
        query="CREATE (e:Event {id: 'tz_test', occurred_at: $timestamp})",
        params={"timestamp": now_utc.isoformat()})

    # Verify all clients read same timestamp
    for client in ["go", "python", "rust", "zig"]:
        result = await run_client_test(client, "query",
            query="MATCH (e:Event {id: 'tz_test'}) RETURN e.occurred_at")

        timestamp = parse_iso8601(result.bindings[0]['e.occurred_at'])

        # Should match within 1 second (allowing for clock skew)
        assert abs((timestamp - now_utc).total_seconds()) < 1
```

## Test Organization

### Test Categorization

```python
# tests/test_categories.py
import pytest

class TestBasicOperations:
    """Basic CRUD operations"""

    @pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
    async def test_ping(self, client):
        """Basic connectivity"""
        pass

    @pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
    async def test_create_node(self, client):
        """Create single node"""
        pass

class TestComplexQueries:
    """Complex graph patterns"""

    @pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
    async def test_multi_hop_traversal(self, client):
        """Multi-hop graph traversal"""
        pass

class TestTransactions:
    """Transaction behavior"""

    @pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
    async def test_commit(self, client):
        """Transaction commit"""
        pass

class TestPerformance:
    """Performance and scalability"""

    @pytest.mark.parametrize("client", ["go", "python", "rust", "zig"])
    @pytest.mark.slow
    async def test_bulk_insert(self, client):
        """Bulk data insertion"""
        pass
```

### Fixtures and Helpers

```python
# tests/conftest.py
import pytest
from geode_test_harness import GeodeTestClient

@pytest.fixture(scope="session")
async def geode_server():
    """Start Geode server for tests"""
    server = await start_geode_server()
    yield server
    await server.stop()

@pytest.fixture
async def clean_database(geode_server):
    """Clean database before each test"""
    await geode_server.execute("MATCH (n) DETACH DELETE n")
    yield
    # Cleanup after test
    await geode_server.execute("MATCH (n) DETACH DELETE n")

@pytest.fixture
def sample_graph_data():
    """Sample graph data for tests"""
    return {
        "nodes": [
            {"id": 1, "label": "User", "name": "Alice"},
            {"id": 2, "label": "User", "name": "Bob"},
            {"id": 3, "label": "Product", "name": "Widget"}
        ],
        "relationships": [
            {"from": 1, "to": 2, "type": "KNOWS"},
            {"from": 1, "to": 3, "type": "PURCHASED"}
        ]
    }

async def load_sample_data(client, data):
    """Helper to load sample data"""
    for node in data["nodes"]:
        await client.execute(
            f"CREATE (n:{node['label']} {{id: $id, name: $name}})",
            node
        )

    for rel in data["relationships"]:
        await client.execute(
            f"MATCH (a {{id: $from}}), (b {{id: $to}}) CREATE (a)-[:{rel['type']}]->(b)",
            rel
        )
```

## Test Reporting

### Custom Test Reporter

```python
# test_reporter.py
class IntegrationTestReporter:
    """Generate comprehensive test reports"""

    def __init__(self):
        self.results = []

    def record_result(self, client, test_name, result):
        """Record individual test result"""
        self.results.append({
            'client': client,
            'test': test_name,
            'status': 'passed' if result.success else 'failed',
            'duration_ms': result.duration * 1000,
            'error': result.error if hasattr(result, 'error') else None
        })

    def generate_html_report(self, output_file):
        """Generate HTML test report"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Geode Integration Test Report</title>
            <style>
                .passed {{ color: green; }}
                .failed {{ color: red; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; }}
            </style>
        </head>
        <body>
            <h1>Integration Test Results</h1>
            <p>Generated: {datetime.now()}</p>

            <h2>Summary</h2>
            <table>
                <tr>
                    <th>Client</th>
                    <th>Total</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Pass Rate</th>
                </tr>
        """

        for client in ["go", "python", "rust", "zig"]:
            client_results = [r for r in self.results if r['client'] == client]
            total = len(client_results)
            passed = sum(1 for r in client_results if r['status'] == 'passed')
            failed = total - passed
            pass_rate = (passed / total * 100) if total > 0 else 0

            html += f"""
                <tr>
                    <td>{client}</td>
                    <td>{total}</td>
                    <td class="passed">{passed}</td>
                    <td class="failed">{failed}</td>
                    <td>{pass_rate:.1f}%</td>
                </tr>
            """

        html += """
            </table>

            <h2>Detailed Results</h2>
            <table>
                <tr>
                    <th>Client</th>
                    <th>Test</th>
                    <th>Status</th>
                    <th>Duration (ms)</th>
                    <th>Error</th>
                </tr>
        """

        for result in self.results:
            status_class = result['status']
            html += f"""
                <tr>
                    <td>{result['client']}</td>
                    <td>{result['test']}</td>
                    <td class="{status_class}">{result['status']}</td>
                    <td>{result['duration_ms']:.2f}</td>
                    <td>{result['error'] or ''}</td>
                </tr>
            """

        html += """
            </table>
        </body>
        </html>
        """

        with open(output_file, 'w') as f:
            f.write(html)
```

### Performance Comparison Report

```python
def generate_performance_comparison(results):
    """Compare performance across clients"""

    performance_data = {}

    for result in results:
        test_name = result['test']
        if test_name not in performance_data:
            performance_data[test_name] = {}

        client = result['client']
        duration = result['duration_ms']

        if client not in performance_data[test_name]:
            performance_data[test_name][client] = []

        performance_data[test_name][client].append(duration)

    # Generate comparison chart data
    comparison = []
    for test_name, client_data in performance_data.items():
        test_comparison = {'test': test_name}

        for client, durations in client_data.items():
            avg_duration = sum(durations) / len(durations)
            test_comparison[client] = avg_duration

        comparison.append(test_comparison)

    return comparison
```

## Related Topics

- **[Unit Tests](/tags/unit-tests/)**: Unit testing strategies
- **[CI/CD](/tags/ci-cd/)**: Continuous integration
- **[Deployment](/tags/deployment/)**: Deployment strategies
- **[Containers](/tags/containers/)**: Container-based testing
- **[Testing](/tags/testing/)**: General testing practices
- **[Quality Assurance](/tags/quality-assurance/)**: QA processes

## Further Reading

- **Integration Testing Guide**: `/docs/development/integration-testing/`
- **Test Harness Documentation**: `/docs/development/test-harness/`
- **Cross-Client Compatibility**: `/docs/clients/compatibility/`
- **CI/CD Best Practices**: `/docs/development/ci-cd-practices/`
- **Performance Testing**: `/docs/testing/performance-testing/`
