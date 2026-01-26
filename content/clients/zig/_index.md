---
title: "Zig Client"
description: "Official Zig client library for Geode"
weight: 4
tags: ["zig", "client", "native", "performance"]
categories: ["clients", "documentation"]
keywords:
  - Geode Zig client
  - Zig SDK
  - GQL driver
  - graph database Zig
---

<!-- CANARY: REQ=REQ-ZIG-CLIENT-002; FEATURE="ZigClientV2"; ASPECT=QUICTransport; STATUS=TESTED; OWNER=clients; UPDATED=2026-01-15 -->

# Zig Client Library

The official Zig client for Geode provides a native, high-performance interface with zero dependencies (except the Zig standard library). Features compile-time safety, manual memory management, and excellent cross-platform support.

## Installation

Add to your `build.zig.zon`:

```zig
.dependencies = .{
    .geode_client = .{
        .url = "https://gitlab.com/devnw/codepros/geode/geode-client-zig/archive/v0.1.0.tar.gz",
        .hash = "1220...",
    },
},
```

**Requirements**: Zig 0.13.0+

## Quick Start

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Connect to Geode
    var client = try geode.Client.init(allocator, "localhost", 3141);
    defer client.deinit();

    // Execute query
    var result = try client.query("MATCH (p:Person) RETURN p.name, p.age", .{});
    defer result.deinit();

    // Process results
    while (try result.next()) |row| {
        defer row.deinit();

        const name = try row.getString("p.name");
        const age = try row.getInt("p.age");

        std.debug.print("Name: {s}, Age: {d}\n", .{ name, age });
    }
}
```

## Connection Configuration

### Basic Connection

```zig
const geode = @import("geode_client");

// Simple connection
var client = try geode.Client.init(allocator, "localhost", 3141);
defer client.deinit();

// With configuration
var config = geode.Config{
    .host = "localhost",
    .port = 3141,
    .username = "user",
    .password = "pass",
    .timeout_ms = 30000,
};

var client = try geode.Client.initWithConfig(allocator, config);
defer client.deinit();
```

### TLS Configuration

```zig
var tls_config = geode.TlsConfig{
    .ca_file = "/path/to/ca.pem",
    .cert_file = "/path/to/cert.pem",
    .key_file = "/path/to/key.pem",
    .verify_server = true,
};

var config = geode.Config{
    .host = "localhost",
    .port = 3141,
    .tls = tls_config,
};

var client = try geode.Client.initWithConfig(allocator, config);
defer client.deinit();
```

### Connection Pool

```zig
const PoolConfig = geode.PoolConfig{
    .min_connections = 2,
    .max_connections = 10,
    .connection_timeout_ms = 30000,
    .idle_timeout_ms = 300000,
};

var pool = try geode.Pool.init(allocator, "localhost", 3141, PoolConfig);
defer pool.deinit();

// Get connection from pool
var client = try pool.acquire();
defer pool.release(client);

var result = try client.query("MATCH (n) RETURN count(n)", .{});
defer result.deinit();
```

## Query Execution

### Basic Queries

```zig
// Simple query
var result = try client.query("MATCH (n:Person) RETURN n LIMIT 10", .{});
defer result.deinit();

// Query with parameters
var result = try client.query(
    "MATCH (p:Person {name: $name}) RETURN p",
    .{ .name = "Alice" }
);
defer result.deinit();

// Multiple parameters
var result = try client.query(
    "MATCH (p:Person) WHERE p.age >= $min AND p.age <= $max RETURN p",
    .{ .min = 25, .max = 40 }
);
defer result.deinit();
```

### Result Processing

```zig
// Iterate over results
var result = try client.query("MATCH (p:Person) RETURN p.name, p.age", .{});
defer result.deinit();

while (try result.next()) |row| {
    defer row.deinit();

    const name = try row.getString("p.name");
    const age = try row.getInt("p.age");

    std.debug.print("{s}: {d}\n", .{ name, age });
}

// Get single result
var result = try client.query("MATCH (p:Person {id: $id}) RETURN p", .{ .id = 123 });
defer result.deinit();

if (try result.next()) |row| {
    defer row.deinit();
    // Process row
}

// Count results
var count: usize = 0;
while (try result.next()) |row| {
    defer row.deinit();
    count += 1;
}
```

## Memory Management

Zig requires explicit memory management. Always use `defer` to clean up resources:

```zig
// Client cleanup
var client = try geode.Client.init(allocator, "localhost", 3141);
defer client.deinit();

// Result cleanup
var result = try client.query("MATCH (n) RETURN n", .{});
defer result.deinit();

// Row cleanup
while (try result.next()) |row| {
    defer row.deinit(); // Important!

    // Process row
}

// Transaction cleanup
var tx = try client.begin();
defer tx.deinit();

// Or use errdefer for error handling
var tx = try client.begin();
errdefer tx.deinit();

try tx.execute("CREATE (:Person {name: 'Alice'})", .{});
try tx.commit();
tx.deinit();
```

## Transactions

### Basic Transaction

```zig
var tx = try client.begin();
defer tx.deinit();

try tx.execute(
    "CREATE (:Person {name: $name, age: $age})",
    .{ .name = "Alice", .age = 30 }
);

try tx.execute(
    "CREATE (:Person {name: $name, age: $age})",
    .{ .name = "Bob", .age = 25 }
);

try tx.commit();
```

### Transaction with Error Handling

```zig
var tx = try client.begin();
errdefer {
    tx.rollback() catch {};
    tx.deinit();
}

try tx.execute("CREATE (:Person {name: 'Alice'})", .{});
try tx.execute("CREATE (:Person {name: 'Bob'})", .{});

try tx.commit();
tx.deinit();
```

### Savepoints

```zig
var tx = try client.begin();
defer tx.deinit();

try tx.execute("CREATE (:Person {name: 'Alice'})", .{});

// Create savepoint
const sp = try tx.savepoint("sp1");

tx.execute("CREATE (:Person {name: 'Bob'})", .{}) catch |err| {
    try sp.rollback();
    // Continue with transaction
};

try tx.commit();
```

## Type System

### Type Mapping

| GQL Type | Zig Type |
|----------|----------|
| INTEGER | i64 |
| FLOAT | f64 |
| STRING | []const u8 |
| BOOLEAN | bool |
| NULL | ?T |
| LIST | []Value |
| MAP | StringHashMap(Value) |
| NODE | Node |
| RELATIONSHIP | Relationship |
| PATH | Path |

### Working with Values

```zig
const Value = geode.Value;

// Get typed values from row
const name = try row.getString("p.name");
const age = try row.getInt("p.age");
const score = try row.getFloat("p.score");
const active = try row.getBool("p.active");

// Handle nullable values
const email = try row.getOptionalString("p.email");
if (email) |e| {
    std.debug.print("Email: {s}\n", .{e});
}

// Get raw value
const value = try row.get("p.age");
switch (value) {
    .integer => |i| std.debug.print("Integer: {d}\n", .{i}),
    .float => |f| std.debug.print("Float: {d}\n", .{f}),
    .string => |s| std.debug.print("String: {s}\n", .{s}),
    .boolean => |b| std.debug.print("Boolean: {}\n", .{b}),
    .null => std.debug.print("Null\n", .{}),
    .list => |l| {
        for (l) |item| {
            // Process item
        }
    },
    .map => |m| {
        var it = m.iterator();
        while (it.next()) |entry| {
            std.debug.print("{s}: {any}\n", .{ entry.key_ptr.*, entry.value_ptr.* });
        }
    },
    .node => |n| std.debug.print("Node: {any}\n", .{n}),
    .relationship => |r| std.debug.print("Relationship: {any}\n", .{r}),
    .path => |p| std.debug.print("Path: {any}\n", .{p}),
}
```

### Working with Nodes

```zig
const Node = geode.Node;

var result = try client.query("MATCH (p:Person) RETURN p", .{});
defer result.deinit();

while (try result.next()) |row| {
    defer row.deinit();

    const person = try row.getNode("p");

    // Access properties
    const name = try person.getString("name");
    const age = try person.getInt("age");

    // Access labels
    for (person.labels) |label| {
        std.debug.print("Label: {s}\n", .{label});
    }

    // Access element ID
    std.debug.print("ID: {d}\n", .{person.element_id});

    // Iterate properties
    var it = person.properties.iterator();
    while (it.next()) |entry| {
        std.debug.print("{s}: {any}\n", .{ entry.key_ptr.*, entry.value_ptr.* });
    }
}
```

### Working with Relationships

```zig
const Relationship = geode.Relationship;

var result = try client.query("MATCH (:Person)-[r:KNOWS]->(:Person) RETURN r", .{});
defer result.deinit();

while (try result.next()) |row| {
    defer row.deinit();

    const rel = try row.getRelationship("r");

    std.debug.print("Type: {s}\n", .{rel.type});
    std.debug.print("Start: {d}\n", .{rel.start_node_id});
    std.debug.print("End: {d}\n", .{rel.end_node_id});

    // Access properties
    var it = rel.properties.iterator();
    while (it.next()) |entry| {
        std.debug.print("{s}: {any}\n", .{ entry.key_ptr.*, entry.value_ptr.* });
    }
}
```

### Working with Paths

```zig
const Path = geode.Path;

var result = try client.query(
    "MATCH p = (:Person)-[:KNOWS*1..3]->(:Person) RETURN p LIMIT 1",
    .{}
);
defer result.deinit();

if (try result.next()) |row| {
    defer row.deinit();

    const path = try row.getPath("p");

    std.debug.print("Length: {d}\n", .{path.nodes.len});

    for (path.nodes) |node| {
        std.debug.print("Node: {any}\n", .{node});
    }

    for (path.relationships) |rel| {
        std.debug.print("Relationship: {any}\n", .{rel});
    }
}
```

## Error Handling

```zig
const GeodeError = geode.Error;

var result = client.query("MATCH (p:Invalid) RETURN p", .{}) catch |err| {
    switch (err) {
        error.SyntaxError => {
            std.debug.print("Syntax error in query\n", .{});
        },
        error.ConstraintViolation => {
            std.debug.print("Constraint violation\n", .{});
        },
        error.ConnectionFailed => {
            std.debug.print("Connection failed\n", .{});
        },
        error.Timeout => {
            std.debug.print("Query timeout\n", .{});
        },
        else => {
            std.debug.print("Error: {}\n", .{err});
        },
    }
    return err;
};
defer result.deinit();
```

### Error Types

```zig
pub const Error = error{
    SyntaxError,
    ConstraintViolation,
    AuthenticationFailed,
    AuthorizationFailed,
    TransactionFailed,
    ConnectionFailed,
    Timeout,
    ProtocolError,
    OutOfMemory,
    InvalidValue,
};
```

## Advanced Features

### Prepared Statements

```zig
// Prepare statement
var stmt = try client.prepare("MATCH (p:Person {name: $name}) RETURN p");
defer stmt.deinit();

// Execute with different parameters
var result1 = try stmt.execute(.{ .name = "Alice" });
defer result1.deinit();

var result2 = try stmt.execute(.{ .name = "Bob" });
defer result2.deinit();
```

### Batch Operations

```zig
var tx = try client.begin();
defer tx.deinit();

var i: usize = 0;
while (i < 100) : (i += 1) {
    const name = try std.fmt.allocPrint(allocator, "Person{d}", .{i});
    defer allocator.free(name);

    try tx.execute(
        "CREATE (:Person {name: $name})",
        .{ .name = name }
    );
}

try tx.commit();
```

### Custom Types

```zig
const Person = struct {
    name: []const u8,
    age: i64,
    email: ?[]const u8,

    pub fn fromRow(row: *const geode.Row) !Person {
        return Person{
            .name = try row.getString("name"),
            .age = try row.getInt("age"),
            .email = try row.getOptionalString("email"),
        };
    }
};

var result = try client.query("MATCH (p:Person) RETURN p.name, p.age, p.email", .{});
defer result.deinit();

while (try result.next()) |row| {
    defer row.deinit();

    const person = try Person.fromRow(&row);
    std.debug.print("{s}: {d}\n", .{ person.name, person.age });
}
```

## Comptime Features

Zig's comptime capabilities enable zero-cost abstractions:

```zig
fn queryAndPrint(comptime T: type, client: *geode.Client, query: []const u8, params: anytype) !void {
    var result = try client.query(query, params);
    defer result.deinit();

    while (try result.next()) |row| {
        defer row.deinit();

        const value = try T.fromRow(&row);
        std.debug.print("{any}\n", .{value});
    }
}

// Usage
try queryAndPrint(Person, &client, "MATCH (p:Person) RETURN p.name, p.age", .{});
```

## Testing

### Unit Tests

```zig
const std = @import("std");
const testing = std.testing;
const geode = @import("geode_client");

test "create person" {
    var client = try geode.Client.init(testing.allocator, "localhost", 3141);
    defer client.deinit();

    var tx = try client.begin();
    defer tx.deinit();

    try tx.execute(
        "CREATE (:Person {name: 'Test', age: 25})",
        .{}
    );
    try tx.commit();

    var result = try client.query(
        "MATCH (p:Person {name: 'Test'}) RETURN p.age",
        .{}
    );
    defer result.deinit();

    const row = (try result.next()).?;
    defer row.deinit();

    const age = try row.getInt("p.age");
    try testing.expectEqual(@as(i64, 25), age);
}
```

## Performance Tips

1. **Memory Management** - Use arena allocators for short-lived allocations
2. **Batch Operations** - Use transactions for multiple operations
3. **Comptime** - Leverage comptime for zero-cost abstractions
4. **Connection Pooling** - Reuse connections for better performance
5. **Prepared Statements** - Reuse prepared statements for repeated queries

## Cross-Platform Support

The Zig client works on all platforms supported by Zig:

- Linux (x86_64, aarch64, riscv64)
- macOS (x86_64, aarch64)
- Windows (x86_64, aarch64)
- FreeBSD, NetBSD, OpenBSD
- WebAssembly (wasm32, wasm64)

## Examples

See the [examples directory](https://gitlab.com/devnw/codepros/geode/geode-client-zig/tree/main/examples) for complete examples:

- Basic CRUD operations
- Transaction management
- Connection pooling
- Error handling
- Type conversions
- Memory management
- Comptime patterns

## Repository

- GitLab: [devnw/codepros/geode/geode-client-zig](https://gitlab.com/devnw/codepros/geode/geode-client-zig)
- Documentation: [docs.geodedb.com/clients/zig](https://docs.geodedb.com/clients/zig)
