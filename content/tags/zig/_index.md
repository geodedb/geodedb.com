---
title: "Zig Client"
description: "Geode Zig client with compile-time memory safety, high performance, comptime features, and vendored QUIC implementation for systems programming."
keywords:
  - Zig
  - Zig client
  - systems programming
  - memory safety
  - comptime
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/zig/"
    noindex: false
---

# Zig Client

The Geode Zig client provides compile-time memory safety, high performance (8,000+ queries/second), and low-level control for systems programming. With comptime features and a vendored QUIC implementation, it requires no external dependencies.

## Installation

Add to `build.zig.zon`:

```zig
.dependencies = .{
    .geode_client = .{
        .url = "https://github.com/geodedb/geode-client-zig/archive/v0.18.0.tar.gz",
        .hash = "...",
    },
}
```

Requirements: Zig 0.15.1+

## Quick Start

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = try geode.Client.connect(allocator, "localhost:3141");
    defer client.deinit();

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

    while (try result.next()) |row| {
        const name = try row.getString("friend.name");
        const age = try row.getInt("friend.age");
        std.debug.print("{s} is {d} years old\n", .{ name, age });
    }
}
```

## Key Features

- **Memory Safety**: Compile-time memory management
- **Performance**: 8,000+ queries/second
- **Comptime**: Compile-time query validation
- **Vendored QUIC**: No external dependencies
- **Cross-Platform**: Linux, macOS, Windows

## Related Topics

- [Client Libraries](/tags/client-libraries/)
- [SDK](/tags/sdk/)

## Documentation

Full guide: [Zig Client Documentation](/docs/clients/zig/)
