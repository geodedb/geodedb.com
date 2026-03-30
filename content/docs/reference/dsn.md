---
title: "DSN (Data Source Name) Specification"
description: "Official DSN format for connecting to Geode over QUIC or gRPC, including authentication, graph binding, and TLS options"
summary: "Defines the official Geode DSN format, supported schemes, graph path binding, parameters, and examples for all client libraries."
url: /docs/reference/dsn/
weight: 12
keywords:
  - geode dsn
  - connection string
  - quic dsn
  - grpc dsn
  - graph binding
  - client connection
  - transport scheme
  - authentication
  - tls options
tags:
  - reference
  - client-libraries
  - networking
  - dsn
categories:
  - reference
  - configuration
  - networking
params:
  seo:
    description: "Official Geode DSN format for QUIC and gRPC connections, including graph binding, TLS, and timeout parameters."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-03-25 -->

# Geode DSN (Data Source Name) Specification

**Version**: 1.1.0
**Status**: Official Specification
**Last Updated**: 2026-03-25

This document defines the official DSN (Data Source Name) format for Geode client libraries. All client implementations MUST conform to this specification.

## Overview

A DSN (Data Source Name) is a connection string that specifies how to connect to a Geode database server. It encodes the transport protocol, server address, authentication credentials, graph target, and connection options in a single URL-like string.

## DSN Format

```text
<scheme>://[<username>:<password>@]<host>[:<port>][/<graph>][?<parameters>]
```

### Alternative Formats

For convenience, these alternative formats are also supported:

```text
# Scheme-less (defaults to quic://)
<host>:<port>[/<graph>][?<parameters>]
<host>[/<graph>][?<parameters>]
```

## Supported Schemes

| Scheme | Transport | Default Port | TLS | Description |
|--------|-----------|--------------|-----|-------------|
| `quic://` | QUIC | 3141 | Required | Recommended. High-performance UDP-based transport with built-in TLS 1.3 |
| `grpc://` | gRPC | 50051 | Optional | Standard gRPC over HTTP/2 |
| (none) | QUIC | 3141 | Required | Scheme-less defaults to QUIC transport |

## Host Specification

### IPv4 Addresses

```text
quic://192.168.1.100:3141
quic://127.0.0.1:3141
```

### IPv6 Addresses

IPv6 addresses MUST be enclosed in square brackets:

```text
quic://[::1]:3141
grpc://[2001:db8::1]:50051
quic://[fe80::1%eth0]:3141
```

### Hostnames

```text
quic://localhost:3141
quic://geode.example.com:3141
```

## Graph Specification

The graph name is an optional path component in the DSN. When present, the session is bound to the named graph at connection time, before any queries are executed.

### Graph Binding Behavior

| Scenario | Result |
|----------|--------|
| Graph exists | Session bound; `USE GRAPH` rejected for session lifetime |
| Graph not exists + Admin/ReadWrite role | Auto-created, session bound |
| Graph not exists + ReadOnly/User role | `HELLO` fails with permission error |
| Graph not exists + auth disabled | Auto-created, session bound |
| No graph in DSN | Normal behavior; `USE GRAPH` allowed |

### Graph Isolation

When a session is bound to a graph via DSN, issuing `USE GRAPH` returns SQLSTATE `42000` (syntax error or access rule violation). The bound graph cannot be changed for the lifetime of the connection. Clients MUST NOT attempt `USE GRAPH` after establishing a graph-bound session.

### Examples with Graph Path

```text
# Bind to graph "social" on connect
quic://localhost:3141/social

# Bind to graph with authentication
quic://admin:secret@geode.example.com:3141/social

# Bind to graph with parameters
quic://localhost:3141/analytics?page_size=500

# Bind to graph via gRPC
grpc://localhost:50051/my-graph
```

## Authentication

### URL-Embedded Credentials

Credentials can be embedded in the URL using standard HTTP basic auth format:

```text
quic://username:password@localhost:3141
```

Special characters in credentials MUST be percent-encoded:

- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `%` → `%25`
- space → `%20` or `+`

Example with special characters:

```text
quic://user%40domain:p%40ss%3Dword@localhost:3141
```

### Query Parameter Credentials

Credentials can also be specified via query parameters:

```text
quic://localhost:3141?username=admin&password=secret
```

**Aliases**:

- `username`, `user` → authentication username
- `password`, `pass` → authentication password

## Query Parameters

### Standard Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page_size` | integer | 1000 | Results page size (1-100,000) |
| `hello_name` | string | varies | Client name sent in HELLO handshake |
| `hello_ver` | string | varies | Client version sent in HELLO handshake |
| `conformance` | string | `min` | GQL conformance level (`min`, `full`) |
| `graph` | string | - | Reserved alternate graph parameter. The path format is primary. |

### Authentication Parameters

| Parameter | Aliases | Type | Description |
|-----------|---------|------|-------------|
| `username` | `user` | string | Authentication username |
| `password` | `pass` | string | Authentication password |

### TLS Parameters

| Parameter | Aliases | Type | Default | Description |
|-----------|---------|------|---------|-------------|
| `tls` | - | boolean | true | Enable/disable TLS (gRPC only, QUIC always uses TLS) |
| `insecure_tls_skip_verify` | - | boolean | false | Skip TLS certificate verification (testing only) |
| `ca` | `ca_cert` | string | - | Path to CA certificate file |
| `cert` | `client_cert` | string | - | Path to client certificate file (for mTLS) |
| `key` | `client_key` | string | - | Path to client private key file (for mTLS) |
| `server_name` | - | string | - | SNI server name for TLS |

### Timeout Parameters

| Parameter | Aliases | Type | Default | Description |
|-----------|---------|------|---------|-------------|
| `connect_timeout` | `timeout` | integer | 30 | Connection timeout in seconds |
| `timeout_ms` | - | integer | 30000 | Connection timeout in milliseconds |

When both `connect_timeout` and `timeout_ms` are specified, `timeout_ms` takes precedence.

### Boolean Parameter Values

Boolean parameters accept:

- **true**: `true`, `1`, `yes`, `on`
- **false**: `false`, `0`, `no`, `off`

## Examples

### Basic Connection

```text
quic://localhost:3141
grpc://localhost:50051
localhost:3141
```

### With Authentication

```text
quic://admin:secret@localhost:3141
quic://localhost:3141?username=admin&password=secret
```

### With Options

```text
quic://localhost:3141?page_size=500&hello_name=my-app
grpc://localhost:50051?tls=0&insecure_tls_skip_verify=true
```

### With Graph Binding

```text
quic://localhost:3141/social
quic://admin:secret@geode.example.com:3141/analytics?page_size=500
grpc://localhost:50051/my-graph?ca=/path/to/ca.crt&cert=/path/to/client.crt&key=/path/to/client.key
quic://admin:secret@[2001:db8::1]:3141/social
```

## Protocol Changes

This section documents the protocol-level fields added to support graph-bound sessions.

### HelloRequest (field 7)

```text
field 7: graph  optional string
```

When the DSN includes a graph path component, the client MUST populate `HelloRequest.graph` with the graph name. The server processes this field during the HELLO handshake before the session is fully established.

### HelloResponse (field 6)

```text
field 6: graph  optional string
```

The server echoes the bound graph name in `HelloResponse.graph` on success. If graph binding fails, the server returns a HELLO error response instead.

### Auto-Create Semantics

When `HelloRequest.graph` names a graph that does not exist, the server applies the following rules:

1. If the authenticated user has `Admin` or `ReadWrite` role, the server creates the graph and binds the session to it.
2. If the authenticated user has `ReadOnly` or `User` role, the HELLO fails with a permission error.
3. If authentication is disabled, the server creates the graph and binds the session to it.

## Environment Variables

Implementations MAY support the following environment variables as fallback defaults:

| Variable | Description |
|----------|-------------|
| `GEODE_HOST` | Default host if DSN is empty |
| `GEODE_PORT` | Default port if not specified |
| `GEODE_TLS_CA` | Default CA certificate path |
| `GEODE_USERNAME` | Default username |
| `GEODE_PASSWORD` | Default password |
| `GEODE_TRANSPORT` | Default transport (`quic` or `grpc`) |
| `GEODE_GRAPH` | Default graph name if not specified in DSN |

## Error Handling

Implementations MUST return an error for:

- unsupported schemes such as `http://`, `https://`, or `tcp://`
- missing host when a scheme is present
- invalid port numbers outside `1-65535`
- invalid IPv6 address syntax

## Client Implementation Reference

| Client | File | Function | Graph Support |
|--------|------|----------|---------------|
| Go | `config.go` | `ParseDSN()` | path component → `Config.Graph` |
| Rust | `src/dsn.rs` | `Dsn::parse()` | path component → `Dsn.graph` |
| Python | `geode_client/transport.py` | `parse_dsn()` | path component → `DsnConfig.graph` |
| Zig | `src/config.zig` | `parseDSN()`, `parseDSNStrict()` | path component → `Config.graph` |
| Node.js | `src/config.ts` | `parseDSN()` | path component → `DsnConfig.graph` |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-05 | Initial specification |
| 1.1.0 | 2026-03-25 | Add graph path support, graph-bound sessions, and auto-create semantics |
