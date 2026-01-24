---
title: "Zig Client"
description: "Production-ready Geode Zig client with compile-time memory safety, 8,000+ qps performance, comptime query validation, vendored QUIC implementation, and zero external dependencies for systems programming and embedded applications."
keywords:
  - Zig
  - Zig client
  - systems programming
  - memory safety
  - comptime
  - embedded database
  - Zig QUIC
  - low-level client
  - performance client
  - zero dependencies
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/zig/"
    noindex: false
---

# Zig Client

The Geode Zig client provides compile-time memory safety, exceptional performance (8,000+ queries/second), and low-level control for systems programming, embedded applications, and performance-critical use cases. With comptime features for query validation and a vendored QUIC implementation, it requires zero external dependencies while delivering production-ready reliability.

## Overview

The Zig client is designed for developers who need:

- **Compile-Time Guarantees**: Memory safety, resource management, and query validation at compile time
- **Minimal Dependencies**: Vendored QUIC implementation eliminates external library requirements
- **Maximum Control**: Fine-grained control over memory allocation and resource lifecycle
- **Cross-Platform**: Native support for Linux, macOS, and Windows without platform-specific code
- **Embedded Systems**: Small binary size and predictable resource usage for embedded applications
- **High Performance**: Zero-cost abstractions with 8,000+ queries/second throughput

## Installation

### Using Zig Package Manager

Add to your `build.zig.zon`:

```zig
.{
    .name = "my-project",
    .version = "0.1.0",
    .dependencies = .{
        .geode_client = .{
            .url = "https://github.com/geodedb/geode-client-zig/archive/v0.18.0.tar.gz",
            .hash = "1220abcd...", // Replace with actual hash
        },
    },
}
```

Update your `build.zig`:

```zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const geode_dep = b.dependency("geode_client", .{
        .target = target,
        .optimize = optimize,
    });

    const exe = b.addExecutable(.{
        .name = "my-app",
        .root_source_file = .{ .path = "src/main.zig" },
        .target = target,
        .optimize = optimize,
    });

    exe.addModule("geode_client", geode_dep.module("geode_client"));

    b.installArtifact(exe);
}
```

### Requirements

- **Zig Version**: 0.15.1 or later
- **Operating System**: Linux, macOS, or Windows
- **Architecture**: x86_64, aarch64, or other Zig-supported architectures

## Quick Start

### Basic Query Execution

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Connect to Geode server
    var client = try geode.Client.connect(allocator, "localhost:3141");
    defer client.deinit();

    // Execute query with parameters
    const query =
        \\MATCH (p:Person)-[:KNOWS]->(friend:Person)
        \\WHERE p.name = $name
        \\RETURN friend.name, friend.age
    ;

    var params = geode.Params.init(allocator);
    defer params.deinit();
    try params.put("name", .{ .string = "Alice" });

    var result = try client.execute(query, params);
    defer result.deinit();

    // Process results
    while (try result.next()) |row| {
        const name = try row.getString("friend.name");
        const age = try row.getInt("friend.age");
        std.debug.print("{s} is {d} years old\n", .{ name, age });
    }
}
```

### Connection with TLS Configuration

```zig
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Advanced connection with TLS settings
    var config = geode.Config{
        .address = "localhost:3141",
        .tls = .{
            .ca_cert_path = "/path/to/ca.pem",
            .client_cert_path = "/path/to/client.pem",
            .client_key_path = "/path/to/client-key.pem",
            .verify_server = true,
        },
        .timeout_ms = 30000,
        .max_retries = 3,
    };

    var client = try geode.Client.connectWithConfig(allocator, config);
    defer client.deinit();
}
```

## Key Features

### Compile-Time Memory Safety

Zig's ownership model ensures memory safety without runtime overhead:

```zig
pub fn queryUsers(allocator: std.mem.Allocator, client: *geode.Client) ![]User {
    const query = "MATCH (u:User) RETURN u.id, u.name, u.email";

    var result = try client.execute(query, null);
    defer result.deinit(); // Compiler ensures cleanup

    var users = std.ArrayList(User).init(allocator);
    errdefer users.deinit(); // Cleanup on error

    while (try result.next()) |row| {
        const user = User{
            .id = try row.getInt("u.id"),
            .name = try row.getString("u.name"),
            .email = try row.getString("u.email"),
        };
        try users.append(user);
    }

    return users.toOwnedSlice();
}
```

### Transaction Support

Full ACID transaction support with resource management:

```zig
pub fn createUserWithProfile(
    allocator: std.mem.Allocator,
    client: *geode.Client,
    username: []const u8,
    email: []const u8
) !i64 {
    var tx = try client.transaction();
    errdefer tx.rollback() catch {}; // Auto-rollback on error
    defer tx.deinit();

    // Create user node
    var create_user_params = geode.Params.init(allocator);
    defer create_user_params.deinit();
    try create_user_params.put("username", .{ .string = username });
    try create_user_params.put("email", .{ .string = email });

    var user_result = try tx.execute(
        \\CREATE (u:User {
        \\  username: $username,
        \\  email: $email,
        \\  createdAt: datetime()
        \\})
        \\RETURN u.id
        ,
        create_user_params
    );
    defer user_result.deinit();

    const row = (try user_result.next()) orelse return error.NoUserCreated;
    const user_id = try row.getInt("u.id");

    // Create profile node
    var create_profile_params = geode.Params.init(allocator);
    defer create_profile_params.deinit();
    try create_profile_params.put("user_id", .{ .int = user_id });

    _ = try tx.execute(
        \\MATCH (u:User {id: $user_id})
        \\CREATE (p:Profile {createdAt: datetime()})
        \\CREATE (u)-[:HAS_PROFILE]->(p)
        ,
        create_profile_params
    );

    try tx.commit();
    return user_id;
}
```

### Comptime Query Validation

Validate query syntax at compile time:

```zig
const Query = struct {
    const GET_USER = comptime geode.validateQuery(
        \\MATCH (u:User {id: $id})
        \\RETURN u.id, u.name, u.email
    );

    const CREATE_USER = comptime geode.validateQuery(
        \\CREATE (u:User {
        \\  name: $name,
        \\  email: $email,
        \\  createdAt: datetime()
        \\})
        \\RETURN u.id
    );
};

pub fn getUser(client: *geode.Client, id: i64) !?User {
    var params = geode.Params.init(client.allocator);
    defer params.deinit();
    try params.put("id", .{ .int = id });

    // Query already validated at compile time
    var result = try client.execute(Query.GET_USER, params);
    defer result.deinit();

    const row = (try result.next()) orelse return null;
    return User{
        .id = try row.getInt("u.id"),
        .name = try row.getString("u.name"),
        .email = try row.getString("u.email"),
    };
}
```

### Connection Pooling

Manage multiple connections efficiently:

```zig
const ConnectionPool = struct {
    allocator: std.mem.Allocator,
    connections: std.ArrayList(*geode.Client),
    available: std.ArrayList(bool),
    mutex: std.Thread.Mutex,
    max_connections: usize,

    pub fn init(allocator: std.mem.Allocator, address: []const u8, max_connections: usize) !*ConnectionPool {
        var pool = try allocator.create(ConnectionPool);
        pool.* = .{
            .allocator = allocator,
            .connections = std.ArrayList(*geode.Client).init(allocator),
            .available = std.ArrayList(bool).init(allocator),
            .mutex = std.Thread.Mutex{},
            .max_connections = max_connections,
        };

        // Pre-create connections
        var i: usize = 0;
        while (i < max_connections) : (i += 1) {
            var client = try allocator.create(geode.Client);
            client.* = try geode.Client.connect(allocator, address);
            try pool.connections.append(client);
            try pool.available.append(true);
        }

        return pool;
    }

    pub fn acquire(self: *ConnectionPool) !*geode.Client {
        self.mutex.lock();
        defer self.mutex.unlock();

        for (self.available.items, 0..) |available, i| {
            if (available) {
                self.available.items[i] = false;
                return self.connections.items[i];
            }
        }

        return error.NoAvailableConnection;
    }

    pub fn release(self: *ConnectionPool, client: *geode.Client) void {
        self.mutex.lock();
        defer self.mutex.unlock();

        for (self.connections.items, 0..) |conn, i| {
            if (conn == client) {
                self.available.items[i] = true;
                return;
            }
        }
    }

    pub fn deinit(self: *ConnectionPool) void {
        for (self.connections.items) |client| {
            client.deinit();
            self.allocator.destroy(client);
        }
        self.connections.deinit();
        self.available.deinit();
        self.allocator.destroy(self);
    }
};
```

### Error Handling

Comprehensive error types with ISO compliance:

```zig
const GeodeError = error{
    ConnectionFailed,
    AuthenticationFailed,
    SyntaxError,
    ConstraintViolation,
    TransactionFailed,
    TimeoutExceeded,
    NetworkError,
    InvalidParameter,
    QueryCompilationFailed,
};

pub fn executeWithRetry(
    client: *geode.Client,
    query: []const u8,
    params: ?geode.Params,
    max_retries: u32
) !geode.Result {
    var retries: u32 = 0;
    var backoff_ms: u64 = 100;

    while (retries < max_retries) : (retries += 1) {
        const result = client.execute(query, params) catch |err| {
            switch (err) {
                error.NetworkError, error.TimeoutExceeded => {
                    // Retry with exponential backoff
                    std.time.sleep(backoff_ms * std.time.ns_per_ms);
                    backoff_ms *= 2;
                    continue;
                },
                error.SyntaxError => {
                    // Don't retry syntax errors
                    std.debug.print("Query syntax error: {s}\n", .{query});
                    return err;
                },
                else => return err,
            }
        };

        return result;
    }

    return error.MaxRetriesExceeded;
}
```

### Prepared Statements

Query preparation for improved performance:

```zig
pub const PreparedStatement = struct {
    client: *geode.Client,
    query: []const u8,
    compiled_id: u64,

    pub fn init(client: *geode.Client, query: []const u8) !PreparedStatement {
        const compiled_id = try client.prepare(query);
        return PreparedStatement{
            .client = client,
            .query = query,
            .compiled_id = compiled_id,
        };
    }

    pub fn execute(self: *PreparedStatement, params: ?geode.Params) !geode.Result {
        return try self.client.executePrepared(self.compiled_id, params);
    }

    pub fn deinit(self: *PreparedStatement) void {
        self.client.unprepare(self.compiled_id) catch {};
    }
};

pub fn batchInsert(client: *geode.Client, users: []const User) !void {
    var stmt = try PreparedStatement.init(client,
        \\CREATE (u:User {
        \\  name: $name,
        \\  email: $email,
        \\  age: $age
        \\})
    );
    defer stmt.deinit();

    for (users) |user| {
        var params = geode.Params.init(client.allocator);
        defer params.deinit();
        try params.put("name", .{ .string = user.name });
        try params.put("email", .{ .string = user.email });
        try params.put("age", .{ .int = user.age });

        var result = try stmt.execute(params);
        result.deinit();
    }
}
```

### Streaming Large Result Sets

Memory-efficient streaming for large datasets:

```zig
pub fn streamUsers(
    client: *geode.Client,
    writer: anytype
) !void {
    const query = "MATCH (u:User) RETURN u.id, u.name, u.email";

    var result = try client.executeStreaming(query, null);
    defer result.deinit();

    // Process results in streaming fashion
    var count: usize = 0;
    while (try result.next()) |row| {
        const id = try row.getInt("u.id");
        const name = try row.getString("u.name");
        const email = try row.getString("u.email");

        try writer.print("{},{s},{s}\n", .{ id, name, email });
        count += 1;

        // Memory is automatically freed after each row
    }

    std.debug.print("Streamed {d} users\n", .{count});
}
```

## Performance: 8,000+ queries/second

Benchmarks on commodity hardware (4-core CPU, 16GB RAM):

- **Simple Queries**: 10,000+ qps
- **Complex Traversals**: 8,000+ qps
- **Bulk Inserts**: 15,000+ rows/second
- **Transaction Throughput**: 5,000+ transactions/second

### Performance Optimization Tips

1. **Use Prepared Statements**: 2-3x faster for repeated queries
2. **Batch Operations**: Group multiple operations in transactions
3. **Stream Large Results**: Avoid loading entire result sets into memory
4. **Connection Pooling**: Reuse connections for better throughput
5. **Allocator Selection**: Use ArenaAllocator for short-lived allocations

## Production Patterns

### Service Layer

```zig
pub const UserService = struct {
    allocator: std.mem.Allocator,
    pool: *ConnectionPool,

    pub fn init(allocator: std.mem.Allocator, address: []const u8) !*UserService {
        var service = try allocator.create(UserService);
        service.* = .{
            .allocator = allocator,
            .pool = try ConnectionPool.init(allocator, address, 10),
        };
        return service;
    }

    pub fn getUser(self: *UserService, id: i64) !?User {
        const client = try self.pool.acquire();
        defer self.pool.release(client);

        var params = geode.Params.init(self.allocator);
        defer params.deinit();
        try params.put("id", .{ .int = id });

        var result = try client.execute(
            "MATCH (u:User {id: $id}) RETURN u.id, u.name, u.email",
            params
        );
        defer result.deinit();

        const row = (try result.next()) orelse return null;
        return User{
            .id = try row.getInt("u.id"),
            .name = try row.getString("u.name"),
            .email = try row.getString("u.email"),
        };
    }

    pub fn createUser(self: *UserService, name: []const u8, email: []const u8) !i64 {
        const client = try self.pool.acquire();
        defer self.pool.release(client);

        var params = geode.Params.init(self.allocator);
        defer params.deinit();
        try params.put("name", .{ .string = name });
        try params.put("email", .{ .string = email });

        var result = try client.execute(
            \\CREATE (u:User {
            \\  name: $name,
            \\  email: $email,
            \\  createdAt: datetime()
            \\})
            \\RETURN u.id
            ,
            params
        );
        defer result.deinit();

        const row = (try result.next()) orelse return error.NoUserCreated;
        return try row.getInt("u.id");
    }

    pub fn deinit(self: *UserService) void {
        self.pool.deinit();
        self.allocator.destroy(self);
    }
};
```

### Testing

```zig
const std = @import("std");
const testing = std.testing;
const geode = @import("geode_client");

test "create and retrieve user" {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = try geode.Client.connect(allocator, "localhost:3141");
    defer client.deinit();

    // Clean up test data
    _ = try client.execute("MATCH (u:TestUser) DELETE u", null);

    // Create user
    var create_params = geode.Params.init(allocator);
    defer create_params.deinit();
    try create_params.put("name", .{ .string = "Test User" });

    var create_result = try client.execute(
        "CREATE (u:TestUser {name: $name}) RETURN u.id",
        create_params
    );
    defer create_result.deinit();

    const create_row = (try create_result.next()).?;
    const user_id = try create_row.getInt("u.id");

    // Retrieve user
    var get_params = geode.Params.init(allocator);
    defer get_params.deinit();
    try get_params.put("id", .{ .int = user_id });

    var get_result = try client.execute(
        "MATCH (u:TestUser {id: $id}) RETURN u.name",
        get_params
    );
    defer get_result.deinit();

    const get_row = (try get_result.next()).?;
    const name = try get_row.getString("u.name");

    try testing.expectEqualStrings("Test User", name);
}
```

## Cross-Platform Support

The Zig client works identically across platforms:

- **Linux**: Native support with vendored QUIC
- **macOS**: Full compatibility with Apple Silicon and Intel
- **Windows**: Complete Windows support without WSL
- **Embedded**: Suitable for embedded Linux systems

## Related Topics

- [Client Libraries](/tags/client-libraries/) - Overview of all clients
- [SDK](/tags/sdk/) - Software Development Kits
- [Performance](/tags/performance/) - Performance optimization
- [Systems Programming](/tags/systems-programming/) - Low-level integration

## Documentation

Full guide: [Zig Client Documentation](/docs/clients/zig/)
