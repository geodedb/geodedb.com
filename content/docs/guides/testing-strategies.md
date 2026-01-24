---
title: "Testing Strategies"
description: "Comprehensive guide to testing strategies in Geode including unit testing, integration testing, regression testing, module testing, performance benchmarking, and CI/CD integration."
keywords: ["testing", "unit tests", "integration tests", "regression tests", "geodetestlab", "test coverage", "CI/CD", "benchmarking", "fuzz testing", "module testing"]
weight: 70
slug: "testing-strategies"
canonical: "https://geodedb.com/docs/guides/testing-strategies/"
---

Geode maintains comprehensive test coverage across multiple testing frameworks ensuring production readiness with 97.4% integration test pass rate (1644/1688 tests) and 100% unit test pass rate (393/393 tests). This guide covers all testing strategies, frameworks, and best practices for developing robust graph database applications.

## Test Coverage Overview

### Current Test Status

**Integration Tests (geodetestlab)**:
- **Pass Rate**: 97.4% (1644/1688 tests passing)
- **Total Tests**: 1688 comprehensive integration scenarios
- **Skipped Tests**: ~120 (intentionally skipped due to documented limitations)
- **Coverage**: Authentication, user management, query execution, CLI commands

**Unit Tests (Zig)**:
- **Pass Rate**: 100% (393/393 tests passing)
- **Coverage**: All core modules with comprehensive test blocks
- **CANARY Integration**: 1,735 governance markers tracking 2,190+ requirements

**GQL Compliance**:
- **ISO/IEC 39075:2024**: 100% compliant (70/70 tests passing)
- **Standard Conformance**: Full ISO GQL standard compliance

## Testing Frameworks

### 1. Zig Unit Tests

Native Zig unit testing framework for component-level testing:

```zig
const std = @import("std");
const testing = std.testing;

test "basic query parsing" {
    // Setup
    const allocator = std.testing.allocator;
    const parser = @import("../src/gql/parser.zig");

    // Execute
    const result = try parser.parse(allocator, "RETURN 1 AS x");
    defer result.deinit(allocator);

    // Verify
    try testing.expectEqual(1, result.program.statements.len);
}
```

**Run Unit Tests**:
```bash
# All unit tests
make test

# Specific module
zig test src/gql/parser.zig

# With verbose output
zig test src/gql/parser.zig --test-verbose
```

**Coverage Areas**:
- Parser and lexer validation
- Query planner logic
- Storage engine operations
- Index implementations
- Security and authentication
- Transaction management

### 2. geodetestlab Integration Tests

Python-based YAML specification framework for end-to-end testing:

```yaml
# geodetestlab/specs/basic_queries.yml
name: "basic-query-tests"
tests:
  - name: "simple-return"
    args: ["query", "RETURN 1 AS x"]
    expect:
      exit_code: 0
      stdout_json_assert:
        - path: "result.rows[0].x"
          equals: 1
```

**Run Integration Tests**:
```bash
# All geodetestlab tests
python3 scripts/test/extended_test_runner.py

# Specific spec file
python3 scripts/test/extended_test_runner.py --specs geodetestlab/specs/basic_queries.yml

# With verbose output
python3 scripts/test/extended_test_runner.py --verbose
```

**Variable Substitution**:
- `${server}` → `127.0.0.1:3141`
- `${server:host}` → `127.0.0.1`
- `${server:port}` → `3141`
- `${secret:api_token}` → Test token
- `${secret:user_password}` → Test password

**Test Specification Format**:
```yaml
name: "feature-tests"
tests:
  - name: "test-case"
    args: ["command", "--flag", "value"]
    expect:
      exit_code: 0
      stdout_contains: ["Success"]
      stderr_contains: []
      stdout_regex: ["Result.*complete"]
      stdout_json_assert:
        - path: "status"
          equals: "00000"
```

### 3. Shell-Based Regression Tests

Bash scripts for comprehensive regression testing:

```bash
#!/bin/bash
# tests/limit_skip_regression_test.sh
set -e

# Setup
./setup_test_env.sh

# Test: LIMIT and SKIP
result=$(./geode query "MATCH (n:Person) RETURN n.name ORDER BY n.name LIMIT 10 SKIP 5")

# Verify
if [ $(echo "$result" | jq '.result.rows | length') -ne 10 ]; then
    echo "FAIL: Expected 10 rows"
    exit 1
fi

echo "PASS: LIMIT/SKIP regression test"
```

**Regression Test Suites**:
- `comprehensive_regression_test.sh`: 34 scenarios
- `limit_skip_regression_test.sh`: 23 scenarios
- `property_ordering_regression_test.sh`: 10 scenarios
- `count_aggregation_regression_test.sh`: 8 scenarios

**Run Regression Tests**:
```bash
# All regression tests
./tests/comprehensive_regression_test.sh
./tests/limit_skip_regression_test.sh
./tests/property_ordering_regression_test.sh
./tests/count_aggregation_regression_test.sh

# Or use make target
make regression-test
```

### 4. Module Testing Framework

Isolated module testing with dependency injection:

```zig
const framework = @import("module_test_framework.zig");

test "schema_manager with dependency injection" {
    // Test allocator for leak detection
    var test_alloc = framework.TestAllocator.init();
    defer test_alloc.deinit() catch unreachable;
    const allocator = test_alloc.allocator();

    // Create dependency container
    var deps = framework.DependencyContainer(void).init(allocator);
    defer deps.deinit();

    // Register mock filesystem
    var mock_fs = framework.MockFileSystem.init(allocator);
    defer mock_fs.deinit();
    try deps.register("filesystem", @ptrCast(&mock_fs));

    // Test module with injected dependencies
    const schema = @import("../src/schema/schema_manager.zig");
    var manager = try schema.SchemaManager.init(allocator, "/tmp/test");
    defer manager.deinit();

    // Verify operations
    try manager.createSchema("test_schema");
    try testing.expect(manager.schemaExists("test_schema"));
}
```

**Mock I/O Interfaces**:

**MockFileSystem**:
```zig
var mock_fs = framework.MockFileSystem.init(allocator);
defer mock_fs.deinit();

// Mock file operations
try mock_fs.writeFile("/path/to/file", "content");
const content = try mock_fs.readFile("/path/to/file");

// Verify operations
try framework.Assertions.expectCallCount(1, mock_fs.write_calls, "writeFile");
```

**MockNetwork**:
```zig
var mock_net = framework.MockNetwork.init(allocator);
defer mock_net.deinit();

// Queue received message
try mock_net.queueReceive("HELLO{\"client\":\"test\"}");

// Process message
const request = try mock_net.receive();

// Send response
try mock_net.send("OK{\"status\":\"connected\"}");

// Verify
try framework.Assertions.expectCallCount(1, mock_net.send_calls, "send");
```

**MockStorage**:
```zig
var mock_storage = framework.MockStorage.init(allocator);
defer mock_storage.deinit();

// Mock storage operations
try mock_storage.write("node:1", "{\"id\":1,\"label\":\"Person\"}");
const data = try mock_storage.read("node:1");
try mock_storage.delete("node:1");

// Verify call counts
try framework.Assertions.expectCallCount(1, mock_storage.write_calls, "write");
try framework.Assertions.expectCallCount(1, mock_storage.read_calls, "read");
try framework.Assertions.expectCallCount(1, mock_storage.delete_calls, "delete");
```

### 5. Fuzz Testing

Deterministic fuzz testing for parser, planner, and storage:

```bash
# Run fuzz tests
make fuzz

# Fuzz specific component
zig test fuzz/parser_fuzz.zig

# With custom seed for reproducibility
FUZZ_SEED=12345 make fuzz
```

**Fuzz Test Components**:
- **Parser Fuzzing**: Random GQL queries with deterministic seeds
- **Planner Fuzzing**: Query plan variations
- **Storage Fuzzing**: Random data patterns

**Example Fuzz Test**:
```zig
test "fuzz parser with random queries" {
    const allocator = std.testing.allocator;
    const parser = @import("../src/gql/parser.zig");

    var prng = std.rand.DefaultPrng.init(12345);
    const random = prng.random();

    var i: u32 = 0;
    while (i < 1000) : (i += 1) {
        const query = try generateRandomQuery(allocator, random);
        defer allocator.free(query);

        // Should not crash (may fail to parse)
        const result = parser.parse(allocator, query) catch continue;
        defer result.deinit(allocator);
    }
}
```

### 6. Performance Benchmarking

Automated performance regression testing:

```bash
# Run benchmarks
make bench

# Specific benchmark
zig test benchmark/query_performance.zig

# Compare with baseline
make bench-compare
```

**Benchmark Example**:
```zig
test "benchmark: simple query performance" {
    const allocator = std.testing.allocator;

    const start = std.time.nanoTimestamp();

    var i: u32 = 0;
    while (i < 10000) : (i += 1) {
        const result = try executeQuery(allocator, "RETURN 1 AS x");
        defer result.deinit(allocator);
    }

    const end = std.time.nanoTimestamp();
    const duration_ms = @divTrunc(end - start, std.time.ns_per_ms);

    std.debug.print("10,000 queries in {} ms ({} queries/sec)\n", .{
        duration_ms,
        @divTrunc(10000 * 1000, duration_ms),
    });

    // Assert performance threshold
    try testing.expect(duration_ms < 5000);  // < 5 seconds
}
```

**Tracked Metrics**:
- Query execution time
- Index lookup performance
- Transaction throughput
- Memory allocation patterns
- Network I/O latency

## Dataset Integration Testing

Test with realistic datasets for production scenarios:

```bash
# Load test datasets
make load-dataset

# Run dataset integration tests
make dataset-integration-test
```

**Available Datasets**:

**Social Network**:
- 10,000+ users with profiles
- 50,000+ posts and comments
- 25,000+ groups and events
- 100,000+ relationships (FOLLOWS, LIKES, MEMBER_OF)

**IoT Network**:
- 25,000+ devices (sensors, gateways, controllers)
- 100,000+ telemetry readings
- Device hierarchies and connectivity

**Financial Network**:
- 50,000 accounts (users, merchants, banks)
- 250,000 transactions
- Fraud detection patterns

**Geographic Data**:
- 100 cities with coordinates
- 25,000 points of interest (restaurants, shops, landmarks)
- Spatial relationships

**Dataset Test Example**:
```gql
-- Query social network dataset
MATCH (u:User)-[:FOLLOWS]->(friend:User)
WHERE u.id = 123
RETURN friend.name, friend.follower_count
ORDER BY friend.follower_count DESC
LIMIT 10;

-- Expected: 10 most popular friends of user 123
-- Verify: Result count, ordering, data integrity
```

## CANARY System Integration

Link tests to requirements for governance tracking:

```zig
// CANARY: REQ=REQ-GQL-001; FEATURE="BasicQuery"; ASPECT=Testing; STATUS=TESTED; TEST=TestBasicQuery; OWNER=test; UPDATED=2025-10-02
test "TestCANARY_REQ_GQL_001_BasicQuery" {
    const allocator = std.testing.allocator;
    const parser = @import("../src/gql/parser.zig");

    const result = try parser.parse(allocator, "RETURN 1 AS x");
    defer result.deinit(allocator);

    try testing.expectEqual(1, result.program.statements.len);
}
```

**CANARY Status Values**:
- `TESTED`: Automated test coverage
- `BENCHED`: Performance benchmark exists
- `IMPL`: Implementation complete
- `EXEMPT`: Explicitly excluded from testing

**Generate CANARY Report**:
```bash
# Update governance status
make status-generate

# View status breakdown
cat docs/status.csv
```

**Current CANARY Status**:
- **Total Markers**: 1,735 tracking 2,190+ requirements
- **TESTED**: 81.4%
- **BENCHED**: 6.0%
- **IMPL**: 7.7%
- **EXEMPT**: 5.7%

## CI/CD Integration

### GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - benchmark
  - governance

build:
  stage: build
  script:
    - make build

test-unit:
  stage: test
  script:
    - make test
    - make geodetestlab-comprehensive

benchmark:
  stage: benchmark
  script:
    - make bench
    - make bench-compare

governance-check:
  stage: governance
  script:
    - make status-generate
    - diff docs/status.csv /tmp/status_check.csv
```

**Run CI Locally**:
```bash
# Full CI pipeline
make ci

# Individual stages
make build
make test
make bench
make status-generate
```

### Docker Testing

```bash
# Run tests in Docker
make docker-test

# Full CI pipeline in Docker
make docker-ci

# Docker compose testing
make docker-up-singleton
make docker-test
make docker-down
```

### Nix Testing

```bash
# Validate Nix configurations
nix flake check

# Run tests in Nix environment
nix develop -c make test

# Full verification
nix develop -c make verify-all
```

## Test Development Guidelines

### Writing Unit Tests

**Follow Test Structure**:
```zig
test "component: specific behavior" {
    // 1. Setup
    const allocator = std.testing.allocator;

    // 2. Execute
    const result = try functionUnderTest(allocator, input);
    defer result.deinit(allocator);

    // 3. Verify
    try testing.expectEqual(expected, result.value);
    try testing.expect(result.is_valid);

    // 4. Cleanup (via defer)
}
```

**Naming Conventions**:
- `test "module_name: behavior description"`
- `test "TestCANARY_REQ_ID_FeatureName"` (for CANARY-tracked tests)

**Best Practices**:
- Use `std.testing.allocator` for automatic leak detection
- Always `defer` cleanup operations
- Test both success and error paths
- Verify edge cases and boundary conditions

### Writing Integration Tests

**YAML Specification**:
```yaml
name: "feature-integration-tests"
setup:
  - args: ["user", "create", "test_user", "--password", "test123"]
    expect:
      exit_code: 0

tests:
  - name: "feature-basic-operation"
    args: ["command", "--option", "value"]
    expect:
      exit_code: 0
      stdout_contains: ["Success"]
      stdout_json_assert:
        - path: "result.status"
          equals: "completed"

teardown:
  - args: ["user", "delete", "test_user"]
    expect:
      exit_code: 0
```

**JSON Assertions**:
```yaml
stdout_json_assert:
  # Check value equality
  - path: "result.count"
    equals: 5

  # Check type
  - path: "result.items"
    type: "array"

  # Check array length
  - path: "result.items"
    array_length: 3

  # Check nested path
  - path: "result.user.roles[0]"
    equals: "admin"
```

### Writing Regression Tests

**Shell Script Template**:
```bash
#!/bin/bash
set -e

# Metadata
TEST_NAME="feature_regression_test"
DESCRIPTION="Test for regression in specific feature"

# Setup
source ./tests/common.sh
setup_test_env

# Test cases
echo "Test 1: Basic functionality"
result=$(./geode query "RETURN 1 AS x")
assert_equals "1" "$(echo "$result" | jq -r '.result.rows[0].x')"

echo "Test 2: Edge case"
result=$(./geode query "RETURN null AS x")
assert_null "$(echo "$result" | jq -r '.result.rows[0].x')"

# Cleanup
cleanup_test_env

echo "PASS: $TEST_NAME"
```

**Common Functions**:
```bash
# tests/common.sh
assert_equals() {
    if [ "$1" != "$2" ]; then
        echo "FAIL: Expected '$1', got '$2'"
        exit 1
    fi
}

assert_null() {
    if [ "$1" != "null" ]; then
        echo "FAIL: Expected null, got '$1'"
        exit 1
    fi
}

setup_test_env() {
    # Create temporary data directory
    export TEST_DATA_DIR=$(mktemp -d)
    # Start test server
    ./geode serve --data-dir "$TEST_DATA_DIR" --listen 127.0.0.1:3141 &
    SERVER_PID=$!
    sleep 2
}

cleanup_test_env() {
    # Stop server
    kill $SERVER_PID
    # Remove temporary data
    rm -rf "$TEST_DATA_DIR"
}
```

## Best Practices

### Test Isolation

Ensure tests don't interfere with each other:

```bash
# Use isolated data directories for each test
export GEODE_DATA_DIR=/tmp/test-$RANDOM

# Clean up after tests
cleanup() {
    rm -rf "$GEODE_DATA_DIR"
}
trap cleanup EXIT
```

### Memory Leak Detection

Use `std.testing.allocator` for automatic leak detection:

```zig
test "no memory leaks" {
    const allocator = std.testing.allocator;

    const data = try allocator.alloc(u8, 1024);
    defer allocator.free(data);  // Will fail test if missing

    // Use data
}
```

### Error Path Testing

Test error conditions explicitly:

```zig
test "error handling: invalid input" {
    const allocator = std.testing.allocator;

    // Should return error
    try testing.expectError(
        error.InvalidInput,
        functionUnderTest(allocator, invalid_input)
    );
}
```

### Performance Assertions

Assert performance thresholds in benchmarks:

```zig
test "benchmark: query performance threshold" {
    const start = std.time.nanoTimestamp();

    // Execute operation
    _ = try executeQuery(allocator, "RETURN 1 AS x");

    const end = std.time.nanoTimestamp();
    const duration_us = @divTrunc(end - start, std.time.ns_per_us);

    // Assert < 1ms
    try testing.expect(duration_us < 1000);
}
```

## Debugging Failed Tests

### Enable Verbose Output

```bash
# Verbose geodetestlab tests
python3 scripts/test/extended_test_runner.py --verbose

# Verbose Zig tests
zig test src/module.zig --test-verbose

# Debug CLI commands
GEODE_DEBUG=1 ./geode command
```

### Check Server Logs

```bash
# JSON logging for structured output
./geode serve --log_json

# Capture server stderr
./geode serve 2> server_errors.log
```

### Isolated Test Execution

```bash
# Run single geodetestlab test
python3 scripts/test/extended_test_runner.py --specs geodetestlab/specs/file.yml --test specific-test-name

# Run single Zig test
zig test src/module.zig --test-filter "test name"
```

## Related Documentation

- **[Server Configuration](/docs/configuration/server-configuration/)** - Configure test environments
- **[Troubleshooting Guide](/docs/guides/troubleshooting/)** - Debug test failures
- **[Query Performance Tuning](/docs/query/performance-tuning/)** - Optimize test performance
- **[Advanced Transaction Patterns](/docs/transactions/advanced-patterns/)** - Test transaction scenarios

## Summary

Geode provides comprehensive testing infrastructure:

- **Unit Tests**: 100% pass rate (393/393) with Zig framework
- **Integration Tests**: 97.4% pass rate (1644/1688) with geodetestlab
- **Regression Tests**: 75+ scenarios across 4 test suites
- **Module Testing**: Dependency injection and mock I/O interfaces
- **Fuzz Testing**: Deterministic fuzzing for parser, planner, storage
- **Performance Benchmarking**: Automated regression detection
- **CI/CD Integration**: GitLab CI, Docker, Nix
- **CANARY Tracking**: 1,735 governance markers tracking 2,190+ requirements

Use appropriate testing strategies based on component type: unit tests for isolated logic, integration tests for end-to-end scenarios, regression tests for bug prevention, and benchmarks for performance validation. Maintain test isolation, check for memory leaks, and test error paths explicitly.
