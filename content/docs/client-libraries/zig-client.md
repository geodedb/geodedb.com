---
title: "Zig Client"
description: "Guide to the Geode Zig client for low-level QUIC protocol access"
url: /docs/client-libraries/zig-client/
weight: 40
keywords:
  - Geode Zig client
  - Zig QUIC client
  - graph database Zig SDK
  - GQL protocol
  - QUIC TLS 1.3
---

<!-- CANARY: REQ=REQ-ZIG-CLIENT-002; FEATURE="Zig Client v2"; ASPECT=QuicPackageClient; STATUS=IMPL; OWNER=clients; UPDATED=2026-01-24 -->

# Geode Zig Client Library

The Zig client exposes low-level QUIC primitives for the Geode protocol. It is designed for native integrations and performance-sensitive systems that want direct protocol control.

## Installation

Add to your `build.zig.zon`:

```zig
.dependencies = .{
    .geode_client = .{
        .url = "https://gitlab.com/devnw/codepros/geode/geode-client-zig/-/archive/main/geode-client-zig-main.tar.gz",
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

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.openStream();

    try client.sendHello("geode-zig", "2.0.0");
    const hello = try client.receiveMessage(2000);
    defer allocator.free(hello);

    const request_id: u64 = 1;
    try client.sendRunGql(request_id, "RETURN 1 AS ok", null);
    _ = try client.receiveMessage(3000);

    try client.sendPull(request_id, 1000);
    const bindings = try client.receiveMessage(3000);
    defer allocator.free(bindings);

    std.debug.print("{s}\n", .{bindings});
}
```

## Helper Query API

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
        "MATCH (n) RETURN count(n) AS count",
        null,
        true,
    );
    defer result.deinit();

    std.debug.print("{any}\n", .{result.value});
}
```

## Transactions

```zig
try client.sendBegin();
try client.sendRunGql(2, "CREATE (:Person {name: 'Alice'})", null);
_ = try client.receiveMessage(3000);
try client.sendCommit();
```

## Notes

- The Zig client exposes protocol primitives rather than high-level query APIs.
- For pooling, validation, and query builders, reuse the `src/` modules in the repository and wrap `GeodeClient` with higher-level helpers.

## Repository

- GitLab: [devnw/codepros/geode/geode-client-zig](https://gitlab.com/devnw/codepros/geode/geode-client-zig)
