---
title: "Zig Client"
description: "Official Zig client for Geode graph database with low-level QUIC access"
weight: 4
tags: ["zig", "client", "native", "performance", "quic", "gql"]
categories: ["clients", "documentation"]
keywords:
  - Geode Zig client
  - Zig QUIC client
  - graph database Zig SDK
  - GQL protocol
  - QUIC TLS 1.3
series:
  - client-libraries
---

<!-- CANARY: REQ=REQ-ZIG-CLIENT-002; FEATURE="Zig Client v2"; ASPECT=QuicPackageClient; STATUS=IMPL; OWNER=clients; UPDATED=2026-01-24 -->

# Zig Client Library

The Zig client provides a low-level QUIC interface for Geode using the `quic` package. It exposes `GeodeClient` for connection management and protocol messages, plus a helper `executeQuery` function for simple use cases.

## Installation

Add to your `build.zig.zon`:

```zig
.dependencies = .{
    .geode_client = .{
        .url = "https://gitlab.com/devnw/codepros/geode/geode-client-zig/-/archive/main/geode-client-zig-main.tar.gz",
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

**Requirements**: Zig 0.15.1+ and OpenSSL (Linux)

## Quick Start

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.openStream();

    try client.sendHello("geode-zig", "2.0.0");
    const hello = try client.receiveMessage(2000);
    defer allocator.free(hello);

    const request_id: u64 = 1;
    try client.sendRunGql(request_id, "MATCH (n) RETURN n", null);
    const schema = try client.receiveMessage(3000);
    defer allocator.free(schema);

    try client.sendPull(request_id, 1000);
    const bindings = try client.receiveMessage(3000);
    defer allocator.free(bindings);

    std.debug.print("{s}\n", .{bindings});
}
```

## Helper Query API

`executeQuery` runs a query and returns parsed JSON results.

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    const result = try geode.executeQuery(
        allocator,
        "localhost",
        3141,
        "RETURN 1 AS ok",
        null,
        true,
    );
    defer result.deinit();

    std.debug.print("{any}\n", .{result.value});
}
```

## Transactions

Use protocol messages directly:

```zig
try client.sendBegin();
try client.sendRunGql(2, "CREATE (:Person {name: 'Alice'})", null);
_ = try client.receiveMessage(3000);
try client.sendCommit();
```

## Notes

- The Zig client is intentionally low-level; it exposes the wire protocol primitives.
- For advanced utilities (query builders, pooling, config parsing), integrate the `src/` modules from the repository into your build and wrap `GeodeClient` with higher-level helpers.

## Repository

- GitLab: [devnw/codepros/geode/geode-client-zig](https://gitlab.com/devnw/codepros/geode/geode-client-zig)
