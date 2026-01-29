---
title: "Tag: Zig Native Client"
description: "Production-ready Zig client for Geode with native QUIC protocol support, fluent query builders, connection pooling, and low-level system integration for maximum performance."
keywords:
  - Zig client
  - geode-client-zig
  - Zig SDK
  - native client
  - Geode
  - QUIC
  - low-level
  - systems programming
  - connection pooling
  - query builders
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/zig-client/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

The Geode Zig client library (`geode-client-zig`) provides a production-ready, native Zig interface for connecting to Geode graph databases. Built with Zig's focus on performance and correctness, it offers low-level QUIC protocol access while maintaining ergonomic APIs through fluent query builders and comprehensive type support.

The Zig client is designed for systems programmers and performance-critical applications where memory safety, predictable performance, and minimal runtime overhead are essential. With native QUIC+TLS 1.3 transport and zero-copy optimizations where possible, it delivers sub-millisecond query latency.

## Key Features

**QUIC + TLS 1.3**: Native QUIC transport with mandatory TLS 1.3 for secure, high-performance connections.

**Full GQL Type System**: 15+ value types including temporal and graph types with type-safe accessors.

**Fluent Query Builders**: Type-safe query construction with `QueryBuilder`, `PatternBuilder`, and `PredicateBuilder`.

**Connection Pooling**: Configurable pooling with health checks and automatic connection management.

**ISO GQL Status Codes**: Standardized error handling with proper status code categorization.

**DSN Parsing**: Flexible connection configuration through Data Source Name strings.

**Input Validation**: Robust security with comprehensive input validation utilities.

**Memory Safety**: Proper allocation/deallocation with `errdefer` and `defer` patterns.

## Requirements

- Zig 0.15.1 or later
- OpenSSL (for TLS support on Linux)
- Running Geode server

## Installation

Add to your `build.zig.zon`:

```zig
.dependencies = .{
    .geode_client = .{
        .url = "https://gitlab.com/devnw/geode/geode-client-zig/-/archive/main/geode-client-zig-main.tar.gz",
        // Add hash after first build attempt
    },
},
```

Then in `build.zig`:

```zig
const geode_client = b.dependency("geode_client", .{
    .target = target,
    .optimize = optimize,
});
exe.root_module.addImport("geode_client", geode_client.module("geode_client"));
```

## Quick Start

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Create client
    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    // Connect
    try client.connect();
    try client.openStream();

    // Send handshake
    try client.sendHello("my-app", "1.0.0");
    const response = try client.receiveMessage(30000);
    defer allocator.free(response);

    // Execute query
    try client.sendQuery("MATCH (n:Person) RETURN n.name, n.age");
    const result = try client.receiveMessage(30000);
    defer allocator.free(result);

    std.debug.print("Result: {s}\n", .{result});
}
```

## Configuration

### Config Structure

Configuration for client connections:

```zig
const Config = @import("config").Config;

var cfg = Config.init();
_ = cfg.withHost("localhost");
_ = cfg.withPort(3141);
_ = cfg.withCredentials("admin", "secret");
_ = cfg.withInsecure(true);
_ = cfg.withPageSize(500);
_ = cfg.withTimeout(60000);
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | `[]const u8` | `"localhost"` | Server hostname |
| `port` | `u16` | `3141` | Server port |
| `username` | `?[]const u8` | `null` | Authentication username |
| `password` | `?[]const u8` | `null` | Authentication password |
| `insecure` | `bool` | `false` | Skip TLS verification |
| `page_size` | `u32` | `1000` | Result pagination size |
| `timeout_ms` | `u32` | `30000` | Connection timeout (ms) |

### DSN Parsing

Parse connection strings in various formats:

```zig
const parseDSN = @import("config").parseDSN;

// URL format with credentials
const cfg1 = try parseDSN(allocator, "geode://admin:secret@localhost:3141?insecure=true");
defer cfg1.deinit(allocator);

// Simple format
const cfg2 = try parseDSN(allocator, "localhost:8443");
defer cfg2.deinit(allocator);

// With query parameters
const cfg3 = try parseDSN(allocator, "db.example.com:3141?page_size=500&timeout=60000");
defer cfg3.deinit(allocator);
```

### Supported Query Parameters

| Parameter | Aliases | Description |
|-----------|---------|-------------|
| `insecure` | `insecure_skip_verify` | Skip TLS verification |
| `page_size` | `pageSize` | Result page size |
| `timeout` | `timeout_ms` | Connection timeout |
| `username` | `user` | Authentication username |
| `password` | `pass` | Authentication password |

## Value Types

The `Value` type supports all GQL value types:

```zig
const Value = @import("types").Value;

// Primitive types
const null_val = Value.initNull();
const bool_val = Value.initBool(true);
const int_val = Value.initInt(42);
const float_val = Value.initFloat(3.14159);
const str_val = Value.initString("hello");
const bytes_val = Value.initBytes(&[_]u8{0x01, 0x02, 0x03});

// Temporal types
const date = Value.initDate(2025, 1, 24);
const time = Value.initTime(14, 30, 45);
const timestamp = Value.initTimestamp(date.date, time.time);

// Collections
const arr = Value.initArray(&[_]Value{ int_val, str_val });

// Type checking
if (int_val.isInt()) {
    const i = try int_val.asInt();
    std.debug.print("Integer value: {}\n", .{i});
}

// JSON conversion
const json = try value.toJson(allocator);
defer json.deinit();
const back = Value.fromJson(json.value);
```

### Supported Types

| Type | Constructor | Accessor | Description |
|------|-------------|----------|-------------|
| `null` | `initNull()` | `isNull()` | Null value |
| `boolean` | `initBool(bool)` | `asBool()` | Boolean |
| `integer` | `initInt(i64)` | `asInt()` | 64-bit integer |
| `float` | `initFloat(f64)` | `asFloat()` | 64-bit float |
| `string` | `initString([]const u8)` | `asString()` | UTF-8 string |
| `bytes` | `initBytes([]const u8)` | `asBytes()` | Binary data |
| `array` | `initArray([]Value)` | `asArray()` | Array of values |
| `object` | - | `asObject()` | Key-value map |
| `date` | `initDate(year, month, day)` | `asDate()` | Date |
| `time` | `initTime(hour, min, sec)` | `asTime()` | Time |
| `timestamp` | `initTimestamp(date, time)` | `asTimestamp()` | Date + time |
| `duration` | `initDuration(days, secs)` | `asDuration()` | Duration |
| `node` | - | `asNode()` | Graph node |
| `relationship` | - | `asRelationship()` | Graph edge |
| `path` | - | `asPath()` | Graph path |

## Query Builder

Build GQL queries programmatically with type safety:

```zig
const QueryBuilder = @import("query_builder").QueryBuilder;

var qb = QueryBuilder.init(allocator);
defer qb.deinit();

_ = try qb.match("(p:Person)");
_ = try qb.where("p.age >= $minAge");
_ = try qb.ret("p.name, p.age");
_ = try qb.orderBy("p.name");
_ = try qb.limit(10);
_ = try qb.param("minAge", Value.initInt(21));

const query = try qb.build();
defer allocator.free(query);
// Result: "MATCH (p:Person) WHERE p.age >= $minAge RETURN p.name, p.age ORDER BY p.name LIMIT 10"
```

### Available Clauses

| Method | Description |
|--------|-------------|
| `match(pattern)` | MATCH clause |
| `optionalMatch(pattern)` | OPTIONAL MATCH clause |
| `where(condition)` | WHERE clause |
| `with(expressions)` | WITH clause |
| `ret(expressions)` | RETURN clause |
| `orderBy(expressions)` | ORDER BY clause |
| `skip(n)` | SKIP clause |
| `limit(n)` | LIMIT clause |
| `create(pattern)` | CREATE clause |
| `merge(pattern)` | MERGE clause |
| `delete(expressions)` | DELETE clause |
| `detachDelete(expressions)` | DETACH DELETE clause |
| `set(assignments)` | SET clause |
| `remove(items)` | REMOVE clause |
| `raw(clause)` | Raw GQL clause |
| `param(name, value)` | Add parameter |

## Pattern Builder

Build graph patterns for MATCH clauses:

```zig
const PatternBuilder = @import("query_builder").PatternBuilder;

var pb = PatternBuilder.init(allocator);
defer pb.deinit();

_ = try pb.nodeLabel("a", "Person");
_ = try pb.edgeRight("KNOWS");
_ = try pb.nodeLabel("b", "Person");

const pattern = try pb.build();
defer allocator.free(pattern);
// Result: "(a:Person)-[:KNOWS]->(b:Person)"
```

### Pattern Methods

| Method | Description | Example |
|--------|-------------|---------|
| `nodeVar(name)` | Node with variable | `(n)` |
| `nodeLabel(var, label)` | Node with label | `(n:Person)` |
| `edgeRight(type)` | Outgoing edge | `-[:KNOWS]->` |
| `edgeLeft(type)` | Incoming edge | `<-[:KNOWS]-` |
| `relRight(var, type, props)` | Outgoing with var | `-[r:KNOWS]->` |
| `relLeft(var, type, props)` | Incoming with var | `<-[r:KNOWS]-` |
| `relUndirected(var, type, props)` | Undirected edge | `-[:CONNECTED]-` |

## Predicate Builder

Build WHERE conditions:

```zig
const PredicateBuilder = @import("query_builder").PredicateBuilder;

var pb = PredicateBuilder.init(allocator);
defer pb.deinit();

_ = try pb.gt("n.age", "minAge");
_ = try pb.andOp();
_ = try pb.isNotNull("n.email");
_ = try pb.orOp();
_ = try pb.contains("n.name", "searchTerm");

const predicate = try pb.build();
defer allocator.free(predicate);
// Result: "n.age > $minAge AND n.email IS NOT NULL OR n.name CONTAINS $searchTerm"
```

### Predicate Methods

| Method | Description | Example |
|--------|-------------|---------|
| `eq(prop, param)` | Equals | `n.x = $param` |
| `neq(prop, param)` | Not equals | `n.x <> $param` |
| `lt(prop, param)` | Less than | `n.x < $param` |
| `lte(prop, param)` | Less or equal | `n.x <= $param` |
| `gt(prop, param)` | Greater than | `n.x > $param` |
| `gte(prop, param)` | Greater or equal | `n.x >= $param` |
| `isNull(prop)` | Is null | `n.x IS NULL` |
| `isNotNull(prop)` | Is not null | `n.x IS NOT NULL` |
| `contains(prop, param)` | Contains string | `n.x CONTAINS $param` |
| `startsWith(prop, param)` | Starts with | `n.x STARTS WITH $param` |
| `endsWith(prop, param)` | Ends with | `n.x ENDS WITH $param` |
| `in(prop, param)` | In list | `n.x IN $param` |
| `andOp()` | AND operator | `AND` |
| `orOp()` | OR operator | `OR` |
| `raw(text)` | Raw predicate | Custom text |

## Connection Pool

Manage connection pools for high-throughput workloads:

```zig
const Pool = @import("pool").Pool;
const PoolConfig = @import("pool").PoolConfig;

var pool_cfg = PoolConfig.init();
_ = pool_cfg.withMinSize(5);
_ = pool_cfg.withMaxSize(20);
_ = pool_cfg.withAcquireTimeout(30000);
_ = pool_cfg.withIdleTimeout(300000);

var pool = Pool(ConnectionType).init(allocator, client_config, pool_cfg);
defer pool.deinit();

// Acquire connection
const conn = try pool.acquire();
defer pool.release(conn);

// Use connection...

// Get statistics
const stats = pool.getStats();
std.debug.print("Active: {}, Idle: {}\n", .{
    stats.active_connections,
    stats.idle_connections,
});
```

### Pool Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `min_size` | `u32` | `1` | Minimum pool size |
| `max_size` | `u32` | `10` | Maximum pool size |
| `acquire_timeout_ms` | `u32` | `30000` | Timeout for acquiring connection |
| `idle_timeout_ms` | `u32` | `300000` | Idle connection timeout |
| `health_check_interval_ms` | `u32` | `30000` | Health check interval |

## Input Validation

Validate user input for security:

```zig
const validate = @import("validate");

// Validate query string
try validate.query("MATCH (n) RETURN n");

// Validate parameter name
try validate.paramName("myParam");

// Validate hostname
try validate.hostname("db.example.com");

// Validate port
try validate.port(3141);

// Validate page size (1-100,000)
try validate.pageSize(500);

// Check IP addresses
const is_v4 = validate.ipv4("192.168.1.1");
const is_v6 = validate.isIpv6("::1");

// Sanitize input (removes control characters)
const clean = try validate.sanitize(allocator, "input\x00with\x01control\x02chars");
defer allocator.free(clean);
```

### Validation Errors

| Error | Description |
|-------|-------------|
| `QueryEmpty` | Query string is empty |
| `QueryTooLong` | Query exceeds 1MB limit |
| `QueryContainsNull` | Query contains null bytes |
| `ParamNameEmpty` | Parameter name is empty |
| `ParamNameInvalid` | Invalid parameter name format |
| `ParamNameTooLong` | Parameter name exceeds 256 chars |
| `HostnameEmpty` | Hostname is empty |
| `HostnameInvalid` | Invalid hostname characters |
| `HostnameTooLong` | Hostname exceeds 253 chars |
| `PortOutOfRange` | Port not in 1-65535 range |
| `PageSizeOutOfRange` | Page size not in 1-100,000 range |

## Error Handling

The client uses ISO GQL status codes:

```zig
const GeodeError = @import("error").GeodeError;

// Create errors
const conn_err = GeodeError.connection("connection refused");
const syntax_err = GeodeError.syntax("unexpected token at position 42");
const query_err = GeodeError.query("invalid property access", "22003");

// Check error properties
if (err.isRetryable()) {
    // Retry the operation
}

// Get status category
const category = err.statusCategory();
switch (category) {
    .connection => {
        // Handle connection error
    },
    .syntax_error => {
        // Handle syntax error
    },
    .data_exception => {
        // Handle data error
    },
    .transaction => {
        // Handle transaction error
    },
    else => {
        // Handle other errors
    },
}

// Get formatted message
std.debug.print("Error: {s}\n", .{err.message});
std.debug.print("Code: {s}\n", .{err.status_code});
```

### Status Code Categories

| Code Range | Category | Description |
|------------|----------|-------------|
| `00xxx` | Success | Operation succeeded |
| `08xxx` | Connection | Connection errors |
| `22xxx` | Data | Data exceptions |
| `25xxx` | Transaction | Transaction state errors |
| `28xxx` | Authorization | Auth errors |
| `42xxx` | Syntax | Query syntax errors |

## Wire Protocol

The client uses JSON line protocol over QUIC:

**Client Messages:**

- `HELLO` - Connection handshake
- `RUN_GQL` - Execute GQL query
- `PULL` - Fetch results
- `BEGIN`/`COMMIT`/`ROLLBACK` - Transaction control
- `PING` - Keep-alive

**Server Responses:**

- `HELLO_ACK` - Handshake acknowledgment
- `SCHEMA` - Query schema
- `BINDINGS` - Result rows
- `ERROR` - Error details
- `SUCCESS` - Operation success

## Performance

The client is optimized for high performance:

- **Connection establishment**: ~2ms with connection pooling
- **Query execution**: <1ms for simple queries
- **Value serialization**: Nanosecond-level JSON conversion
- **Memory efficiency**: Zero-copy where possible

### QUIC System Optimizations

For optimal throughput, configure UDP buffer sizes at the OS level.

**Linux:**

```bash
sudo sysctl -w net.core.rmem_max=7340032
sudo sysctl -w net.core.wmem_max=7340032

# Persist across reboots
echo "net.core.rmem_max=7340032" | sudo tee -a /etc/sysctl.d/99-geode-quic.conf
echo "net.core.wmem_max=7340032" | sudo tee -a /etc/sysctl.d/99-geode-quic.conf
```

**BSD/macOS:**

```bash
sudo sysctl -w kern.ipc.maxsockbuf=8441037
```

**GSO (Generic Segmentation Offload)**: Available on Linux 4.18+, batches UDP packets to reduce syscall overhead.

**Path MTU Discovery (DPLPMTUD)**: Enabled by default, probes for optimal packet sizes.

## Building and Testing

```bash
# Build debug version
make build

# Build release version
make release

# Clean build artifacts
make clean

# Run unit tests
make test

# Run integration tests (requires Geode server)
make test-integration

# Run integration tests with Docker
make test-integration-docker

# Run property-based/fuzz tests
make test-fuzz

# Run benchmarks
make bench

# Run full CI pipeline
make ci

# Format code
make fmt
```

## Best Practices

### Memory Management

```zig
// Good: Use defer for cleanup
var qb = QueryBuilder.init(allocator);
defer qb.deinit();

// Good: Use errdefer for cleanup on error paths
const result = allocator.alloc(u8, size) catch |err| {
    return err;
};
errdefer allocator.free(result);
```

### Error Handling

```zig
// Good: Handle errors explicitly
const value = try client.sendQuery(query);
defer allocator.free(value);

// Good: Check retryable errors
if (err.isRetryable()) {
    // Implement retry logic with backoff
}
```

### Resource Cleanup

```zig
// Good: Always pair init with deinit
var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
defer client.deinit();

// Good: Free allocations
const response = try client.receiveMessage(30000);
defer allocator.free(response);
```

## Related Topics

- [Zig](/tags/zig/)
- [Client Libraries](/tags/client-libraries/)
- [QUIC Protocol](/tags/quic/)
- [Systems Programming](/tags/systems/)
- [Connection Pooling](/tags/connection-pooling/)
- [Performance](/tags/performance/)
- [Tutorials](/tags/tutorials/)

## Further Reading

- [Zig Documentation](https://ziglang.org/documentation/)
- [QUIC Protocol RFC 9000](https://www.rfc-editor.org/rfc/rfc9000.html)
- [ISO/IEC 39075:2024 GQL Standard](https://www.iso.org/standard/76120.html)
- [Zig Client Repository](https://gitlab.com/devnw/geode/geode-client-zig)
- [Geode Documentation](/docs/)
