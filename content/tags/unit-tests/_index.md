---
title: "Unit Testing"
description: "Learn about unit testing strategies for Geode including test frameworks, mocking patterns, test coverage, and best practices for database testing."
keywords:
  - unit testing
  - test frameworks
  - test coverage
  - TDD
  - testing best practices
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/unit-tests/"
    noindex: false
---

# Unit Testing in Geode

Unit testing is fundamental to Geode's development methodology, ensuring code correctness, preventing regressions, and enabling confident refactoring. Geode maintains 97.4% test coverage with 1,644 passing tests out of 1,688 total tests.

## Geode's Testing Philosophy

Geode follows evidence-based development with CANARY markers tracking all implementations. The testing strategy emphasizes:

**No Mocks for Database Logic**: Tests run against real Geode server instances, not mocks. This ensures tests validate actual behavior rather than simulated responses.

**Comprehensive Coverage**: Every feature implementation must include corresponding tests. The GeodeTestLab suite provides comprehensive validation.

**Fast Feedback**: Unit tests complete in 2-3 minutes, providing rapid developer feedback.

**ISO Compliance**: 100% compliance with ISO/IEC 39075:2024 GQL standard (70/70 tests passing).

## Unit Test Structure in Geode

### Server Tests (Zig)

Geode's server is implemented in Zig with built-in test framework:

```zig
// geode/src/parser/lexer_test.zig
const std = @import("std");
const testing = std.testing;
const Lexer = @import("lexer.zig").Lexer;

test "lexer tokenizes simple GQL query" {
    const allocator = testing.allocator;
    const input = "MATCH (n:User) RETURN n";
    
    var lexer = try Lexer.init(allocator, input);
    defer lexer.deinit();
    
    const tokens = try lexer.tokenize();
    defer allocator.free(tokens);
    
    try testing.expectEqual(@as(usize, 7), tokens.len);
    try testing.expectEqual(Token.Type.MATCH, tokens[0].type);
    try testing.expectEqual(Token.Type.LPAREN, tokens[1].type);
    try testing.expectEqualStrings("n", tokens[2].value);
}

test "lexer handles Unicode identifiers" {
    const allocator = testing.allocator;
    const input = "MATCH (user:用户) RETURN user.名前";
    
    var lexer = try Lexer.init(allocator, input);
    defer lexer.deinit();
    
    const tokens = try lexer.tokenize();
    defer allocator.free(tokens);
    
    // Verify Unicode support
    try testing.expectEqualStrings("用户", tokens[3].value);
    try testing.expectEqualStrings("名前", tokens[8].value);
}

test "lexer error handling - unterminated string" {
    const allocator = testing.allocator;
    const input = "MATCH (n) WHERE n.name = 'unterminated";
    
    var lexer = try Lexer.init(allocator, input);
    defer lexer.deinit();
    
    const result = lexer.tokenize();
    try testing.expectError(error.UnterminatedString, result);
}
```

**Run Tests**:

```bash
cd geode

# Run all tests
zig build test

# Run specific test file
zig build test -Dtest-filter="lexer_test"

# Run with coverage
zig build test -Dcoverage=true
```

### Query Planner Tests

```zig
// geode/src/planner/query_planner_test.zig
const QueryPlanner = @import("query_planner.zig").QueryPlanner;

test "planner chooses index for equality filter" {
    const allocator = testing.allocator;
    var db = try TestDatabase.init(allocator);
    defer db.deinit();
    
    // Create index
    try db.exec("CREATE INDEX user_email ON User(email)");
    
    // Parse query
    const query = "MATCH (u:User {email: $email}) RETURN u";
    var planner = try QueryPlanner.init(allocator, &db);
    defer planner.deinit();
    
    const plan = try planner.plan(query);
    defer plan.deinit();
    
    // Verify planner chose index seek
    try testing.expect(plan.operations[0].type == .IndexSeek);
    try testing.expectEqualStrings("user_email", plan.operations[0].index_name);
}

test "planner avoids cartesian product" {
    const allocator = testing.allocator;
    var db = try TestDatabase.init(allocator);
    defer db.deinit();
    
    // Query that could create cartesian product
    const query = "MATCH (a:User), (b:Product) WHERE a.pref = b.cat RETURN a, b";
    var planner = try QueryPlanner.init(allocator, &db);
    defer planner.deinit();
    
    const plan = try planner.plan(query);
    defer plan.deinit();
    
    // Verify planner adds relationship or index to avoid cartesian product
    try testing.expect(!plan.hasCartesianProduct());
}
```

### Transaction Tests

```zig
// geode/src/storage/transaction_test.zig
test "transaction ACID properties" {
    const allocator = testing.allocator;
    var db = try TestDatabase.init(allocator);
    defer db.deinit();
    
    // Test Atomicity
    {
        var tx = try db.beginTransaction();
        errdefer tx.rollback();
        
        try tx.exec("CREATE (u:User {name: 'Alice'})");
        try tx.exec("CREATE (u:User {name: 'Bob'})");
        
        // Simulate error
        const result = tx.exec("INVALID QUERY");
        try testing.expectError(error.ParseError, result);
        
        // Rollback
        try tx.rollback();
        
        // Verify no data written
        const count = try db.exec("MATCH (u:User) RETURN count(u)");
        try testing.expectEqual(@as(i64, 0), count);
    }
    
    // Test Isolation
    {
        var tx1 = try db.beginTransaction();
        defer tx1.rollback();
        
        var tx2 = try db.beginTransaction();
        defer tx2.rollback();
        
        // TX1 writes
        try tx1.exec("CREATE (u:User {name: 'Charlie'})");
        
        // TX2 should not see TX1's changes
        const count = try tx2.exec("MATCH (u:User) RETURN count(u)");
        try testing.expectEqual(@as(i64, 0), count);
    }
}
```

### Client Library Tests

**Go Client Tests**:

```go
// geode-client-go/client_test.go
package geode

import (
    "context"
    "database/sql"
    "testing"
)

func TestBasicQuery(t *testing.T) {
    db, err := sql.Open("geode", "geode://localhost:3141/testdb")
    if err != nil {
        t.Fatal(err)
    }
    defer db.Close()
    
    // Execute query
    rows, err := db.Query("MATCH (n) RETURN count(n) AS cnt")
    if err != nil {
        t.Fatal(err)
    }
    defer rows.Close()
    
    var count int64
    if rows.Next() {
        if err := rows.Scan(&count); err != nil {
            t.Fatal(err)
        }
    }
    
    if count < 0 {
        t.Errorf("Expected non-negative count, got %d", count)
    }
}

func TestPreparedStatement(t *testing.T) {
    db, err := sql.Open("geode", "geode://localhost:3141/testdb")
    if err != nil {
        t.Fatal(err)
    }
    defer db.Close()
    
    // Prepare statement
    stmt, err := db.Prepare("MATCH (u:User {email: $1}) RETURN u.name")
    if err != nil {
        t.Fatal(err)
    }
    defer stmt.Close()
    
    // Execute with parameter
    var name string
    err = stmt.QueryRow("alice@example.com").Scan(&name)
    if err != nil && err != sql.ErrNoRows {
        t.Fatal(err)
    }
}

func TestTransaction(t *testing.T) {
    db, err := sql.Open("geode", "geode://localhost:3141/testdb")
    if err != nil {
        t.Fatal(err)
    }
    defer db.Close()
    
    tx, err := db.Begin()
    if err != nil {
        t.Fatal(err)
    }
    
    // Execute in transaction
    _, err = tx.Exec("CREATE (u:User {name: 'Test User'})")
    if err != nil {
        tx.Rollback()
        t.Fatal(err)
    }
    
    // Commit
    if err := tx.Commit(); err != nil {
        t.Fatal(err)
    }
    
    // Verify data persisted
    var count int
    err = db.QueryRow("MATCH (u:User {name: 'Test User'}) RETURN count(u)").Scan(&count)
    if err != nil {
        t.Fatal(err)
    }
    if count != 1 {
        t.Errorf("Expected 1 user, got %d", count)
    }
}
```

**Python Client Tests**:

```python
# geode-client-python/tests/test_client.py
import pytest
from geode_client import GeodeClient

@pytest.mark.asyncio
async def test_basic_query():
    async with GeodeClient("localhost", 3141) as client:
        result = await client.execute("MATCH (n) RETURN count(n) AS cnt")
        assert len(result.bindings) == 1
        assert result.bindings[0]['cnt'] >= 0

@pytest.mark.asyncio
async def test_parameterized_query():
    async with GeodeClient("localhost", 3141) as client:
        result = await client.execute(
            "MATCH (u:User {email: $email}) RETURN u.name",
            {"email": "alice@example.com"}
        )
        # Should not raise exception

@pytest.mark.asyncio
async def test_transaction():
    async with GeodeClient("localhost", 3141) as client:
        async with client.transaction() as tx:
            await tx.execute("CREATE (u:User {name: 'Test'})")
            await tx.execute("CREATE (u:User {name: 'Test2'})")
            # Auto-commits on exit
        
        # Verify committed
        result = await client.execute(
            "MATCH (u:User) WHERE u.name STARTS WITH 'Test' RETURN count(u)"
        )
        assert result.bindings[0]['count(u)'] == 2

@pytest.mark.asyncio
async def test_transaction_rollback():
    async with GeodeClient("localhost", 3141) as client:
        try:
            async with client.transaction() as tx:
                await tx.execute("CREATE (u:User {name: 'Rollback Test'})")
                raise Exception("Simulated error")
        except:
            pass
        
        # Verify rolled back
        result = await client.execute(
            "MATCH (u:User {name: 'Rollback Test'}) RETURN count(u)"
        )
        assert result.bindings[0]['count(u)'] == 0
```

## Test Coverage

Geode tracks test coverage meticulously:

```bash
# Generate coverage report
cd geode
zig build test -Dcoverage=true

# View coverage
zig build coverage-report

# Geode Coverage Stats:
# - Overall: 97.4% (1644/1688 tests passing)
# - Core modules: 95%+
# - Security code: 100%
# - GQL parser: 95%+
```

**Coverage Requirements**:

```python
# scripts/check-coverage.py
def check_coverage_requirements(coverage_data):
    requirements = {
        'overall': 90.0,
        'core': 95.0,
        'security': 100.0,
        'parser': 95.0,
    }
    
    for module, threshold in requirements.items():
        actual = coverage_data.get_module_coverage(module)
        if actual < threshold:
            print(f"FAILED: {module} coverage {actual}% < {threshold}%")
            return False
    
    return True
```

## Best Practices

### 1. Test Naming Convention

```zig
// Use descriptive test names
test "parser correctly handles nested parentheses" { }
test "transaction isolation prevents dirty reads" { }
test "index seek optimization for equality filters" { }
```

### 2. Arrange-Act-Assert Pattern

```zig
test "user creation with valid data" {
    // Arrange
    const allocator = testing.allocator;
    var db = try TestDatabase.init(allocator);
    defer db.deinit();
    
    // Act
    const result = try db.exec(
        "CREATE (u:User {name: 'Alice', email: 'alice@example.com'}) RETURN u"
    );
    
    // Assert
    try testing.expectEqual(@as(usize, 1), result.len);
    try testing.expectEqualStrings("Alice", result[0].get("name"));
}
```

### 3. Test Data Management

```zig
const TestDatabase = struct {
    db: *Database,
    allocator: std.mem.Allocator,
    
    pub fn init(allocator: std.mem.Allocator) !TestDatabase {
        // Create temporary database
        var db = try Database.initTemp(allocator);
        return TestDatabase{ .db = db, .allocator = allocator };
    }
    
    pub fn deinit(self: *TestDatabase) void {
        self.db.deinit();
    }
};
```

### 4. Parallel Test Execution

```bash
# Run tests in parallel (8 shards)
zig build test -Dparallel=8

# Results: 8-minute suite runs in 1-2 minutes
```

## Advanced Testing Techniques

### Property-Based Testing

```zig
// Property-based testing for parser
const testing = std.testing;
const fuzzing = @import("fuzzing");

test "parser handles all valid GQL syntax" {
    const allocator = testing.allocator;

    // Generate random valid GQL queries
    var generator = fuzzing.GqlGenerator.init(allocator);
    defer generator.deinit();

    var i: usize = 0;
    while (i < 1000) : (i += 1) {
        const query = try generator.generate_valid_query();
        defer allocator.free(query);

        var parser = try Parser.init(allocator, query);
        defer parser.deinit();

        // Should not crash or error on valid input
        const ast = parser.parse() catch |err| {
            std.debug.print("Failed on query: {s}\n", .{query});
            return err;
        };
        defer ast.deinit();
    }
}

test "lexer rejects all invalid input" {
    const allocator = testing.allocator;

    const invalid_inputs = [_][]const u8{
        "MATCH (u:User {unterminated string",
        "MATCH () ) ((",
        "RETURN 12.34.56",  // Invalid number
        "MATCH $$$$$",  // Invalid parameter
    };

    for (invalid_inputs) |input| {
        var lexer = try Lexer.init(allocator, input);
        defer lexer.deinit();

        const result = lexer.tokenize();
        try testing.expectError(error.ParseError, result);
    }
}
```

### Parameterized Tests

```python
# geode-client-python/tests/test_parameterized.py
import pytest

@pytest.mark.parametrize("value,expected_type", [
    (42, "integer"),
    (3.14, "float"),
    ("hello", "string"),
    (True, "boolean"),
    (None, "null"),
    ([1, 2, 3], "list"),
    ({"key": "value"}, "map"),
])
async def test_data_type_handling(client, value, expected_type):
    """Test all data types are handled correctly"""
    result = await client.execute(
        "CREATE (n:Test {value: $value}) RETURN n.value, type(n.value)",
        {"value": value}
    )

    assert result.bindings[0]['type(n.value)'] == expected_type

@pytest.mark.parametrize("query,should_error", [
    ("MATCH (n) RETURN n", False),
    ("INVALID SYNTAX", True),
    ("MATCH (n WHERE n.id = 1", True),  # Missing parenthesis
    ("RETURN 1 + 'string'", True),  # Type mismatch
])
async def test_query_validation(client, query, should_error):
    """Test query validation"""
    if should_error:
        with pytest.raises(Exception):
            await client.execute(query)
    else:
        result = await client.execute(query)
        assert result is not None
```

### Performance Tests

```zig
// Benchmark tests
const std = @import("std");
const testing = std.testing;

test "query execution performance benchmark" {
    const allocator = testing.allocator;
    var db = try TestDatabase.init(allocator);
    defer db.deinit();

    // Create test data
    var i: usize = 0;
    while (i < 10000) : (i += 1) {
        try db.exec("CREATE (u:User {id: $id, name: 'User $id'})",
                    .{.id = i});
    }

    // Benchmark query
    const iterations = 1000;
    const start = std.time.nanoTimestamp();

    var j: usize = 0;
    while (j < iterations) : (j += 1) {
        const result = try db.exec("MATCH (u:User {id: 5000}) RETURN u");
        result.deinit();
    }

    const end = std.time.nanoTimestamp();
    const duration_ms = @intCast(u64, end - start) / 1_000_000;
    const qps = iterations * 1000 / duration_ms;

    std.debug.print("Query performance: {} QPS\n", .{qps});

    // Assert minimum performance
    try testing.expect(qps >= 100);  // At least 100 QPS
}
```

### Mutation Testing

```python
# mutation_test.py
"""
Mutation testing verifies test quality by intentionally breaking code
"""

def run_mutation_tests():
    mutations = [
        ("==", "!="),  # Flip equality
        (">", ">="),   # Change boundary
        ("and", "or"), # Flip logic
        ("true", "false"),
    ]

    results = []
    for original, mutated in mutations:
        # Apply mutation
        apply_mutation(original, mutated)

        # Run tests
        test_result = run_tests()

        if test_result.all_passed:
            # Mutation survived - tests didn't catch the bug!
            results.append({
                'mutation': f"{original} -> {mutated}",
                'survived': True,
                'weakness': 'Tests do not cover this logic'
            })
        else:
            # Mutation caught - tests are working
            results.append({
                'mutation': f"{original} -> {mutated}",
                'survived': False
            })

        # Revert mutation
        revert_mutation()

    return results
```

### Snapshot Testing

```rust
// geode-client-rust/tests/snapshot_tests.rs
use insta::assert_snapshot;

#[test]
fn test_query_plan_snapshot() {
    let client = GeodeClient::new("localhost:3141").unwrap();

    let plan = client.explain(
        "MATCH (u:User)-[:KNOWS]->(friend) WHERE u.country = 'USA' RETURN friend.name"
    ).unwrap();

    // Compare against saved snapshot
    assert_snapshot!(format!("{:#?}", plan));
}

#[test]
fn test_error_message_snapshot() {
    let client = GeodeClient::new("localhost:3141").unwrap();

    let error = client.execute("INVALID SYNTAX").unwrap_err();

    // Ensure error messages stay consistent
    assert_snapshot!(error.to_string());
}
```

## Test Infrastructure

### Continuous Integration Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Zig
        uses: goto-bus-stop/setup-zig@v2
        with:
          version: 0.15.1

      - name: Run Geode unit tests
        run: |
          cd geode
          zig build test --summary all

      - name: Generate coverage report
        run: |
          cd geode
          zig build test -Dcoverage=true
          zig build coverage-report

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./geode/coverage/lcov.info

  client-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        client: [go, python, rust, zig]

    steps:
      - uses: actions/checkout@v3

      - name: Run ${{ matrix.client }} tests
        run: |
          cd geode-client-${{ matrix.client }}
          make test

  integration-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, client-tests]

    steps:
      - uses: actions/checkout@v3

      - name: Start Geode server
        run: |
          cd geode
          zig build
          ./zig-out/bin/geode serve &
          sleep 5

      - name: Run integration tests
        run: |
          cd geode-test-harness
          make test-all
```

### Test Fixture Management

```python
# conftest.py - Shared test fixtures
import pytest
import asyncio
from geode_client import GeodeClient

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def geode_server():
    """Start Geode server for testing"""
    import subprocess
    process = subprocess.Popen(
        ["./zig-out/bin/geode", "serve", "--test-mode"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # Wait for server to be ready
    await asyncio.sleep(2)

    yield process

    # Cleanup
    process.terminate()
    process.wait(timeout=10)

@pytest.fixture
async def client(geode_server):
    """Provide test client"""
    async with GeodeClient("localhost", 3141) as c:
        yield c

@pytest.fixture
async def clean_db(client):
    """Clean database before each test"""
    await client.execute("MATCH (n) DETACH DELETE n")
    yield
    await client.execute("MATCH (n) DETACH DELETE n")

@pytest.fixture
def sample_graph():
    """Sample graph data"""
    return {
        "nodes": [
            {"id": 1, "label": "User", "name": "Alice"},
            {"id": 2, "label": "User", "name": "Bob"},
        ],
        "edges": [
            {"from": 1, "to": 2, "type": "KNOWS"},
        ]
    }
```

## Test Quality Metrics

### Coverage Analysis

```python
# coverage_analyzer.py
class CoverageAnalyzer:
    def analyze_coverage(self, coverage_file):
        """Analyze test coverage and identify gaps"""
        with open(coverage_file) as f:
            coverage_data = json.load(f)

        critical_paths = self.identify_critical_paths()
        uncovered_critical = []

        for path in critical_paths:
            if coverage_data.get(path, {}).get('coverage', 0) < 100:
                uncovered_critical.append({
                    'path': path,
                    'coverage': coverage_data.get(path, {}).get('coverage', 0),
                    'priority': 'high'
                })

        return {
            'overall_coverage': coverage_data['summary']['coverage'],
            'critical_gaps': uncovered_critical,
            'recommendations': self.generate_recommendations(uncovered_critical)
        }

    def identify_critical_paths(self):
        """Identify critical code paths that must be tested"""
        return [
            'src/parser/parser.zig',
            'src/storage/transaction.zig',
            'src/security/auth.zig',
            'src/query/executor.zig',
        ]
```

## Related Topics

- **[Integration Tests](/tags/integration-tests/)**: Integration testing strategies
- **[CI/CD](/tags/ci-cd/)**: Continuous integration
- **[Continuous Integration](/tags/continuous-integration/)**: Build automation
- **[Deployment](/tags/deployment/)**: Deployment strategies
- **[Testing](/tags/testing/)**: General testing practices
- **[Code Quality](/tags/code-quality/)**: Code quality standards
- **[TDD](/tags/tdd/)**: Test-driven development

## Further Reading

- **Testing Guide**: `/docs/development/testing-guide/`
- **Test Coverage**: `/docs/development/test-coverage/`
- **GeodeTestLab**: `/docs/development/geodetestlab/`
- **CANARY Markers**: `/docs/development/canary-markers/`
- **Test Patterns**: `/docs/development/test-patterns/`
- **Property-Based Testing**: `/docs/development/property-based-testing/`
