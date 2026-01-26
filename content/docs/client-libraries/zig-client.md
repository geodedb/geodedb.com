---
title: "Zig Client Library Guide"
description: "Complete guide to using the Geode Zig client library for graph database operations with QUIC transport, type-safe queries, and native Zig integration."
summary: "Learn how to integrate Geode graph database into Zig applications with native QUIC transport, type-safe operations, and idiomatic Zig patterns."
slug: "zig-client"
url: "/docs/client-libraries/zig-client/"
aliases: []
date: "2026-01-23"
lastmod: "2026-01-23"
draft: false
weight: 40
keywords: ["zig client library", "geode zig", "zig graph database", "zig database driver", "QUIC zig", "zig type safety"]
tags: ["zig", "client-library", "quic", "graph-database"]
categories: ["Client Libraries", "Zig"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/client-libraries/zig-client/"
    noindex: false
---

<!-- CANARY: REQ=REQ-ZIG-CLIENT-002; FEATURE="ZigClientV2"; ASPECT=QUICTransport; STATUS=TESTED; OWNER=clients; UPDATED=2026-01-15 -->

## Overview

The Geode Zig client library provides native, type-safe access to Geode graph database from Zig applications. It uses vendor/quic for QUIC transport and provides idiomatic Zig interfaces for graph operations.

**Key Features:**
- **Native QUIC Transport** - Direct QUIC integration with vendor/quic
- **Type-Safe Operations** - Compile-time safety for graph operations
- **Zero-Cost Abstractions** - Performance comparable to direct network calls
- **Allocator Support** - Full control over memory allocation
- **Production Ready** - Ready for basic operations; validate QUIC interoperability in your environment

**Quick Links:**
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Connection Management](#connection-management)
- [Query Execution](#query-execution)
- [Transactions](#transactions)
- [Type System](#type-system)

---

## Installation

### Requirements

- **Zig Version**: 0.15.1 or later
- **Geode Server**: v0.18.0+ running with QUIC enabled
- **TLS Certificates**: For secure connections

### Adding Dependency

**Method 1: Git Submodule** (Recommended)
```bash
# Add as submodule
git submodule add https://gitlab.com/devnw/codepros/geode/geode-client-zig.git deps/geode-client

# Update submodules
git submodule update --init --recursive
```

**Method 2: Manual Download**
```bash
# Download and extract
curl -L https://gitlab.com/devnw/codepros/geode/geode-client-zig/-/archive/main/geode-client-zig-main.tar.gz | tar xz
mv geode-client-zig-main deps/geode-client
```

### Build Configuration

**build.zig**:
```zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // Add Geode client module
    const geode_client = b.addModule("geode_client", .{
        .root_source_file = .{ .path = "deps/geode-client/geode_client.zig" },
    });

    // Your executable
    const exe = b.addExecutable(.{
        .name = "myapp",
        .root_source_file = .{ .path = "src/main.zig" },
        .target = target,
        .optimize = optimize,
    });

    // Link Geode client
    exe.root_module.addImport("geode_client", geode_client);

    b.installArtifact(exe);
}
```

### Build and Test

```bash
# Build your project
zig build

# Run tests
zig build test

# Run with specific optimization
zig build -Doptimize=ReleaseSafe
```

---

## Quick Start

### Basic Example

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Create client
    var client = geode.GeodeClient.init(
        allocator,
        "127.0.0.1",  // host
        3141,         // port
        true          // insecure (dev only)
    );
    defer client.deinit();

    // Connect to server
    try client.connect();

    // Open stream
    try client.openStream();

    // Send HELLO handshake
    try client.sendHello("myapp", "1.0.0");

    // Receive response
    const hello_response = try client.receiveMessage();
    defer allocator.free(hello_response);

    std.debug.print("Connected: {s}\n", .{hello_response});

    // Execute query
    try client.sendRunGql("req-1", "RETURN 1 AS x", null);
    try client.sendPull("req-1", 100);

    const result = try client.receiveMessage();
    defer allocator.free(result);

    std.debug.print("Result: {s}\n", .{result});
}
```

---

## Connection Management

### Client Configuration

```zig
const geode = @import("geode_client");

pub fn createClient(allocator: std.mem.Allocator) !geode.GeodeClient {
    return geode.GeodeClient.init(
        allocator,
        "geode.example.com",  // host
        3141,                 // port
        false                 // insecure (use TLS)
    );
}
```

### Connection Lifecycle

```zig
pub fn connectExample(allocator: std.mem.Allocator) !void {
    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();  // Always cleanup

    // 1. Connect to server (establish QUIC connection)
    try client.connect();

    // 2. Open bidirectional stream
    try client.openStream();

    // 3. Send HELLO handshake
    try client.sendHello("myapp", "1.0.0");

    // 4. Receive HELLO response
    const hello_resp = try client.receiveMessage();
    defer allocator.free(hello_resp);

    // Parse response to verify connection
    const parsed = try std.json.parseFromSlice(
        std.json.Value,
        allocator,
        hello_resp,
        .{}
    );
    defer parsed.deinit();

    if (parsed.value.object.get("type")) |type_val| {
        if (std.mem.eql(u8, type_val.string, "SCHEMA")) {
            std.debug.print("✓ Connected successfully\n", .{});
        }
    }

    // 5. Perform operations...

    // Cleanup happens automatically via defer
}
```

### Error Handling

```zig
pub fn robustConnect(allocator: std.mem.Allocator) !geode.GeodeClient {
    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    errdefer client.deinit();  // Cleanup on error

    // Connect with retry logic
    var attempts: usize = 0;
    const max_attempts = 3;

    while (attempts < max_attempts) : (attempts += 1) {
        client.connect() catch |err| {
            if (attempts == max_attempts - 1) return err;
            std.debug.print("Connection attempt {} failed, retrying...\n", .{attempts + 1});
            std.time.sleep(1 * std.time.ns_per_s);
            continue;
        };
        break;
    }

    // Open stream
    try client.openStream();

    // Send handshake
    try client.sendHello("myapp", "1.0.0");

    // Verify handshake response
    const response = try client.receiveMessage();
    defer allocator.free(response);

    return client;
}
```

---

## Query Execution

### Simple Queries

```zig
pub fn executeSimpleQuery(client: *geode.GeodeClient, allocator: std.mem.Allocator) !void {
    const request_id = "req-001";

    // Send query
    try client.sendRunGql(request_id, "RETURN 1 AS x, 2 AS y", null);

    // Pull results
    try client.sendPull(request_id, 100);

    // Receive response
    const response = try client.receiveMessage();
    defer allocator.free(response);

    std.debug.print("Response: {s}\n", .{response});
}
```

### Parameterized Queries

```zig
pub fn parameterizedQuery(client: *geode.GeodeClient, allocator: std.mem.Allocator) !void {
    // Create parameters
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();

    try params.put("name", .{ .string = "Alice" });
    try params.put("min_age", .{ .integer = 25 });

    const params_value = std.json.Value{ .object = params };

    // Execute query with parameters
    const query = "MATCH (p:Person) WHERE p.name = $name AND p.age >= $min_age RETURN p";
    try client.sendRunGql("req-002", query, params_value);
    try client.sendPull("req-002", 100);

    const response = try client.receiveMessage();
    defer allocator.free(response);

    std.debug.print("Results: {s}\n", .{response});
}
```

### Pattern Matching

```zig
pub fn patternMatch(client: *geode.GeodeClient, allocator: std.mem.Allocator) !void {
    const query =
        \\MATCH (p:Person)-[:WORKS_AT]->(c:Company)
        \\WHERE p.age > 30
        \\RETURN p.name AS person, c.name AS company
    ;

    try client.sendRunGql("req-003", query, null);
    try client.sendPull("req-003", 100);

    const response = try client.receiveMessage();
    defer allocator.free(response);

    // Parse response
    const parsed = try std.json.parseFromSlice(
        std.json.Value,
        allocator,
        response,
        .{}
    );
    defer parsed.deinit();

    if (parsed.value.object.get("type")) |type_val| {
        if (std.mem.eql(u8, type_val.string, "BINDINGS")) {
            if (parsed.value.object.get("rows")) |rows| {
                std.debug.print("Found {} results\n", .{rows.array.items.len});
            }
        }
    }
}
```

### Processing Results

```zig
pub fn processResults(allocator: std.mem.Allocator, response: []const u8) !void {
    const parsed = try std.json.parseFromSlice(
        std.json.Value,
        allocator,
        response,
        .{}
    );
    defer parsed.deinit();

    const root = parsed.value.object;

    // Check message type
    if (root.get("type")) |type_val| {
        const msg_type = type_val.string;

        if (std.mem.eql(u8, msg_type, "BINDINGS")) {
            // Process result rows
            if (root.get("rows")) |rows_val| {
                for (rows_val.array.items) |row| {
                    const row_obj = row.object;

                    // Access columns
                    if (row_obj.get("name")) |name_val| {
                        std.debug.print("Name: {s}\n", .{name_val.string});
                    }
                    if (row_obj.get("age")) |age_val| {
                        std.debug.print("Age: {}\n", .{age_val.integer});
                    }
                }
            }
        } else if (std.mem.eql(u8, msg_type, "ERROR")) {
            // Handle error
            if (root.get("message")) |msg_val| {
                std.debug.print("Error: {s}\n", .{msg_val.string});
            }
        }
    }
}
```

---

## Transactions

### Basic Transaction

```zig
pub fn basicTransaction(client: *geode.GeodeClient, allocator: std.mem.Allocator) !void {
    // Begin transaction
    try client.sendBegin();
    const begin_resp = try client.receiveMessage();
    defer allocator.free(begin_resp);

    // Execute operations in transaction
    try client.sendRunGql("req-004", "CREATE (p:Person {name: 'Alice', age: 30})", null);
    try client.sendPull("req-004", 10);
    _ = try client.receiveMessage();

    try client.sendRunGql("req-005", "CREATE (p:Person {name: 'Bob', age: 25})", null);
    try client.sendPull("req-005", 10);
    _ = try client.receiveMessage();

    // Commit transaction
    try client.sendCommit();
    const commit_resp = try client.receiveMessage();
    defer allocator.free(commit_resp);

    std.debug.print("Transaction committed\n", .{});
}
```

### Transaction with Rollback

```zig
pub fn transactionWithRollback(client: *geode.GeodeClient, allocator: std.mem.Allocator) !void {
    // Begin transaction
    try client.sendBegin();
    _ = try client.receiveMessage();

    errdefer {
        // Rollback on error
        client.sendRollback() catch {};
        _ = client.receiveMessage() catch {};
    }

    // Try to create nodes
    try client.sendRunGql("req-006", "CREATE (p:Person {name: 'Charlie'})", null);
    try client.sendPull("req-006", 10);

    const result = try client.receiveMessage();
    defer allocator.free(result);

    // Check for errors in result
    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, result, .{});
    defer parsed.deinit();

    if (parsed.value.object.get("type")) |type_val| {
        if (std.mem.eql(u8, type_val.string, "ERROR")) {
            // Rollback on error
            std.debug.print("Error detected, rolling back\n", .{});
            try client.sendRollback();
            _ = try client.receiveMessage();
            return error.TransactionFailed;
        }
    }

    // Success - commit
    try client.sendCommit();
    _ = try client.receiveMessage();
}
```

---

## Type System

### Zig Value Types

The client uses a discriminated union for type-safe value handling:

```zig
pub const Value = union(enum) {
    null: void,
    boolean: bool,
    int: i64,
    float: f64,
    string: []const u8,
    decimal: Decimal,
    array: []Value,
    object: std.StringHashMap(Value),

    pub const Decimal = struct {
        value: []const u8,  // String representation
        scale: u8,          // Number of decimal places
    };
};
```

### Working with Values

```zig
pub fn valueExamples(allocator: std.mem.Allocator) !void {
    // Create values
    const int_val = Value{ .int = 42 };
    const str_val = Value{ .string = "Hello" };
    const bool_val = Value{ .boolean = true };
    const null_val = Value{ .null = {} };

    // Decimal value
    const dec_val = Value{ .decimal = .{
        .value = "123.45",
        .scale = 2,
    }};

    // Array value
    const arr_items = try allocator.alloc(Value, 3);
    arr_items[0] = .{ .int = 1 };
    arr_items[1] = .{ .int = 2 };
    arr_items[2] = .{ .int = 3 };
    const arr_val = Value{ .array = arr_items };

    // Object value
    var obj = std.StringHashMap(Value).init(allocator);
    try obj.put("name", .{ .string = "Alice" });
    try obj.put("age", .{ .int = 30 });
    const obj_val = Value{ .object = obj };

    // Use values...
}
```

### Type Checking

```zig
pub fn typeCheck(value: Value) void {
    switch (value) {
        .null => std.debug.print("Null value\n", .{}),
        .boolean => |b| std.debug.print("Boolean: {}\n", .{b}),
        .int => |i| std.debug.print("Integer: {}\n", .{i}),
        .float => |f| std.debug.print("Float: {d}\n", .{f}),
        .string => |s| std.debug.print("String: {s}\n", .{s}),
        .decimal => |d| std.debug.print("Decimal: {s} (scale: {})\n", .{d.value, d.scale}),
        .array => |arr| std.debug.print("Array with {} items\n", .{arr.len}),
        .object => |obj| std.debug.print("Object with {} fields\n", .{obj.count()}),
    }
}
```

---

## Memory Management

### Allocator Patterns

```zig
pub fn allocatorExample() !void {
    // Use GeneralPurposeAllocator for most applications
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer {
        const leaked = gpa.deinit();
        if (leaked == .leak) {
            std.debug.print("Memory leak detected!\n", .{});
        }
    }
    const allocator = gpa.allocator();

    // Use arena for temporary allocations
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();
    const arena_allocator = arena.allocator();

    // All allocations in arena are freed together
    const temp_data = try arena_allocator.alloc(u8, 1024);
    _ = temp_data;
}
```

### Cleanup Best Practices

```zig
pub fn cleanupExample(allocator: std.mem.Allocator) !void {
    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();  // Always cleanup

    // For allocations that might fail
    const buffer = try allocator.alloc(u8, 1024);
    errdefer allocator.free(buffer);  // Free on error

    // Normal cleanup
    defer allocator.free(buffer);

    // Use buffer...
}
```

---

## Complete Example Application

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    std.debug.print("=== Geode Zig Client Example ===\n\n", .{});

    // 1. Connect
    var client = geode.GeodeClient.init(allocator, "127.0.0.1", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.openStream();
    try client.sendHello("example-app", "1.0.0");

    const hello_resp = try client.receiveMessage();
    defer allocator.free(hello_resp);

    std.debug.print("1. Connected to Geode\n", .{});

    // 2. Create nodes in transaction
    try client.sendBegin();
    _ = try client.receiveMessage();

    std.debug.print("2. Transaction started\n", .{});

    // Create Alice
    const create_alice =
        \\CREATE (p:Person {name: 'Alice', age: 30, email: 'alice@example.com'})
    ;
    try client.sendRunGql("req-1", create_alice, null);
    try client.sendPull("req-1", 10);
    _ = try client.receiveMessage();

    // Create Bob
    const create_bob =
        \\CREATE (p:Person {name: 'Bob', age: 25, email: 'bob@example.com'})
    ;
    try client.sendRunGql("req-2", create_bob, null);
    try client.sendPull("req-2", 10);
    _ = try client.receiveMessage();

    // Create relationship
    const create_rel =
        \\MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
        \\CREATE (a)-[:KNOWS {since: 2020}]->(b)
    ;
    try client.sendRunGql("req-3", create_rel, null);
    try client.sendPull("req-3", 10);
    _ = try client.receiveMessage();

    // Commit
    try client.sendCommit();
    _ = try client.receiveMessage();

    std.debug.print("3. Created nodes and relationships\n", .{});

    // 3. Query data
    const query =
        \\MATCH (p:Person)-[:KNOWS]->(friend:Person)
        \\RETURN p.name AS person, friend.name AS friend
    ;
    try client.sendRunGql("req-4", query, null);
    try client.sendPull("req-4", 100);

    const results = try client.receiveMessage();
    defer allocator.free(results);

    std.debug.print("4. Query results:\n{s}\n", .{results});

    std.debug.print("\n=== Example complete ===\n", .{});
}
```

---

## Performance Tips

### Connection Pooling

For multi-threaded applications, create a connection pool:

```zig
pub const ConnectionPool = struct {
    allocator: std.mem.Allocator,
    connections: std.ArrayList(*geode.GeodeClient),
    mutex: std.Thread.Mutex,

    pub fn init(allocator: std.mem.Allocator, size: usize) !ConnectionPool {
        var pool = ConnectionPool{
            .allocator = allocator,
            .connections = std.ArrayList(*geode.GeodeClient).init(allocator),
            .mutex = .{},
        };

        // Pre-create connections
        var i: usize = 0;
        while (i < size) : (i += 1) {
            const client_ptr = try allocator.create(geode.GeodeClient);
            client_ptr.* = geode.GeodeClient.init(allocator, "localhost", 3141, true);
            try client_ptr.connect();
            try client_ptr.openStream();
            try pool.connections.append(client_ptr);
        }

        return pool;
    }

    pub fn acquire(self: *ConnectionPool) !*geode.GeodeClient {
        self.mutex.lock();
        defer self.mutex.unlock();

        if (self.connections.items.len > 0) {
            return self.connections.pop();
        }

        return error.NoConnectionsAvailable;
    }

    pub fn release(self: *ConnectionPool, client: *geode.GeodeClient) !void {
        self.mutex.lock();
        defer self.mutex.unlock();

        try self.connections.append(client);
    }

    pub fn deinit(self: *ConnectionPool) void {
        for (self.connections.items) |client| {
            client.deinit();
            self.allocator.destroy(client);
        }
        self.connections.deinit();
    }
};
```

### Batch Operations

```zig
pub fn batchCreate(client: *geode.GeodeClient, allocator: std.mem.Allocator) !void {
    // Use single query for multiple creates
    const batch_query =
        \\CREATE (p1:Person {name: 'Person1', age: 30}),
        \\       (p2:Person {name: 'Person2', age: 25}),
        \\       (p3:Person {name: 'Person3', age: 35})
    ;

    try client.sendRunGql("req-batch", batch_query, null);
    try client.sendPull("req-batch", 100);

    const result = try client.receiveMessage();
    defer allocator.free(result);
}
```

---

## Error Handling

### Common Errors

```zig
pub fn handleErrors(client: *geode.GeodeClient, allocator: std.mem.Allocator) void {
    client.connect() catch |err| switch (err) {
        error.ConnectionRefused => {
            std.debug.print("Server not running\n", .{});
            return;
        },
        error.ReceiveTimeout => {
            std.debug.print("Connection timeout\n", .{});
            return;
        },
        else => {
            std.debug.print("Connection error: {}\n", .{err});
            return;
        },
    };
}
```

---

## Debugging

### Enable Verbose Logging

```zig
pub fn debugExample() !void {
    // Set log level
    std.log.info("Starting Geode client", .{});

    // Log queries
    const query = "MATCH (n) RETURN n LIMIT 10";
    std.log.debug("Executing query: {s}", .{query});
}
```

---

## Next Steps

- [Go Client](/docs/client-libraries/go-client/) - Go client library
- [Python Client](/docs/client-libraries/python-client/) - Python async client
- [Rust Client](/docs/client-libraries/rust-client/) - Rust tokio client
- [GQL Guide](/docs/gql/guide/) - Query language reference
- [Troubleshooting](/docs/guides/troubleshooting/) - Common issues
