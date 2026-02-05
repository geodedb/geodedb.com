---
title: "DSN (Data Source Name) Specification"
description: "Official DSN format for connecting to Geode over QUIC or gRPC, including authentication and TLS options"
summary: "Defines the official Geode DSN format, supported schemes, parameters, and examples for all client libraries."
url: /docs/reference/dsn/
weight: 12
keywords:
  - geode dsn
  - connection string
  - quic dsn
  - grpc dsn
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
    description: "Official Geode DSN format for QUIC and gRPC connections, including authentication, TLS, and timeout parameters."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-02-05 -->

# Geode DSN (Data Source Name) Specification

**Version**: 1.0.0  \
**Status**: Official Specification  \
**Last Updated**: 2026-02-05

This document defines the official DSN (Data Source Name) format for Geode client libraries. All client implementations MUST conform to this specification.

## Overview

A DSN (Data Source Name) is a connection string that specifies how to connect to a Geode database server. It encodes the transport protocol, server address, authentication credentials, and connection options in a single URL-like string.

## DSN Format

```
<scheme>://[<username>:<password>@]<host>[:<port>][?<parameters>]
```

### Alternative Formats

For convenience, these alternative formats are also supported:

```
# Scheme-less (defaults to quic://)
<host>:<port>[?<parameters>]
<host>[?<parameters>]
```

## Supported Schemes

| Scheme | Transport | Default Port | TLS | Description |
|--------|-----------|--------------|-----|-------------|
| `quic://` | QUIC | 3141 | Required | **Recommended.** High-performance UDP-based transport with built-in TLS 1.3 |
| `grpc://` | gRPC | 50051 | Optional | Standard gRPC over HTTP/2 |
| (none) | QUIC | 3141 | Required | Scheme-less defaults to QUIC transport |

**Note**: Use `quic://` as the default transport for optimal performance.

## Host Specification

### IPv4 Addresses

```
quic://192.168.1.100:3141
quic://127.0.0.1:3141
```

### IPv6 Addresses

IPv6 addresses MUST be enclosed in square brackets:

```
quic://[::1]:3141
grpc://[2001:db8::1]:50051
quic://[fe80::1%eth0]:3141
```

### Hostnames

```
quic://localhost:3141
quic://geode.example.com:3141
```

## Authentication

### URL-Embedded Credentials

Credentials can be embedded in the URL using standard HTTP basic auth format:

```
quic://username:password@localhost:3141
```

Special characters in credentials MUST be percent-encoded:
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `%` → `%25`
- Space → `%20` or `+`

Example with special characters:
```
quic://user%40domain:p%40ss%3Dword@localhost:3141
```

### Query Parameter Credentials

Credentials can also be specified via query parameters:

```
quic://localhost:3141?username=admin&password=secret
```

**Aliases**:
- `username`, `user` → Authentication username
- `password`, `pass` → Authentication password

## Query Parameters

### Standard Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page_size` | integer | 1000 | Results page size (1-100,000) |
| `hello_name` | string | varies | Client name sent in HELLO handshake |
| `hello_ver` | string | varies | Client version sent in HELLO handshake |
| `conformance` | string | "min" | GQL conformance level ("min", "full") |

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

**Important**: The DSN specification uses **only** `insecure_tls_skip_verify` for TLS verification bypass. Do not use legacy aliases in new configurations.

### Timeout Parameters

| Parameter | Aliases | Type | Default | Description |
|-----------|---------|------|---------|-------------|
| `connect_timeout` | `timeout` | integer | 30 | Connection timeout in seconds |
| `timeout_ms` | - | integer | 30000 | Connection timeout in milliseconds |

**Note**: When both `connect_timeout` (seconds) and `timeout_ms` (milliseconds) are specified, `timeout_ms` takes precedence.

### Boolean Parameter Values

Boolean parameters accept:
- **True**: `true`, `1`, `yes`, `on`
- **False**: `false`, `0`, `no`, `off`

## Examples

### Basic Connection

```
# QUIC transport (recommended)
quic://localhost:3141

# gRPC transport
grpc://localhost:50051

# Scheme-less (defaults to QUIC)
localhost:3141
```

### With Authentication

```
quic://admin:secret@localhost:3141
quic://localhost:3141?username=admin&password=secret
```

### With Options

```
quic://localhost:3141?page_size=500&hello_name=my-app
grpc://localhost:50051?tls=0&insecure_tls_skip_verify=true
```

### Full Examples

```
# QUIC with all options
quic://admin:secret@geode.example.com:3141?page_size=500&hello_name=my-app&hello_ver=1.0.0&conformance=min

# gRPC with mTLS
grpc://localhost:50051?ca=/path/to/ca.crt&cert=/path/to/client.crt&key=/path/to/client.key

# IPv6 with authentication
quic://admin:secret@[2001:db8::1]:3141?insecure_tls_skip_verify=true

# Development/testing
grpc://localhost:50051?tls=0
```

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
