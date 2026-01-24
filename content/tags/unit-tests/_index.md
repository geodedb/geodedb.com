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

## Related Topics

- **[Integration Tests](/tags/integration-tests/)**: Integration testing strategies
- **[CI/CD](/tags/ci-cd/)**: Continuous integration
- **[Continuous Integration](/tags/continuous-integration/)**: Build automation
- **[Deployment](/tags/deployment/)**: Deployment strategies

## Further Reading

- **Testing Guide**: `/docs/development/testing-guide/`
- **Test Coverage**: `/docs/development/test-coverage/`
- **GeodeTestLab**: `/docs/development/geodetestlab/`
- **CANARY Markers**: `/docs/development/canary-markers/`
