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
        assert qps > 100  # At least 100 QPS
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

## Related Topics

- **[Unit Tests](/tags/unit-tests/)**: Unit testing strategies
- **[CI/CD](/tags/ci-cd/)**: Continuous integration
- **[Deployment](/tags/deployment/)**: Deployment strategies
- **[Containers](/tags/containers/)**: Container-based testing

## Further Reading

- **Integration Testing Guide**: `/docs/development/integration-testing/`
- **Test Harness Documentation**: `/docs/development/test-harness/`
- **Cross-Client Compatibility**: `/docs/clients/compatibility/`
