---
title: "Go Client"
description: "Official Go database/sql driver for Geode graph database over QUIC + TLS 1.3"
weight: 1
tags:
  - go
  - golang
  - client
  - database-sql
  - quic
  - tls
categories:
keywords:
  - Geode Go client
  - Go database/sql driver
  - ISO GQL driver
  - graph database Go driver
  - QUIC TLS client
  - client-libraries
  - go
series:
  - client-libraries
---

# Go Client Library

The official Go client for Geode provides a `database/sql` driver implementation with full support for prepared statements, transactions, and connection pooling.

## Installation

```bash
go get go.codepros.org/geode
```

**Requirements**: Go 1.24.0+

## Quick Start

```go
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "go.codepros.org/geode"
)

func main() {
    // Open connection
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Test connection
    if err := db.Ping(); err != nil {
        log.Fatal(err)
    }

    // Execute query
    rows, err := db.Query("MATCH (p:Person) RETURN p.name, p.age")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    // Process results
    for rows.Next() {
        var name string
        var age int
        if err := rows.Scan(&name, &age); err != nil {
            log.Fatal(err)
        }
        fmt.Printf("Name: %s, Age: %d\n", name, age)
    }
}
```

## Connection String

```
geode://host:port?options
host:port?options
host:port
host
```

**Options**:
- `page_size` - Results page size (default: 1000)
- `hello_name` - Client name sent in HELLO (default: `geode-go`)
- `hello_ver` - Client version sent in HELLO (default: `0.1`)
- `conformance` - GQL conformance level (default: `min`)
- `ca` - Path to CA certificate
- `cert` - Path to client certificate (mTLS)
- `key` - Path to client key (mTLS)
- `insecure` - Skip TLS verification (testing only)

**Environment Variables**:
- `GEODE_HOST` - Default host if DSN is empty
- `GEODE_PORT` - Default port if not specified
- `GEODE_TLS_CA` - Default CA certificate path

**Examples**:
```go
// Basic connection
db, err := sql.Open("geode", "geode://localhost:3141")

// With TLS verification
db, err := sql.Open("geode", "localhost:3141?ca=/path/to/ca.crt")

// With mTLS
db, err := sql.Open("geode", "localhost:3141?ca=/path/to/ca.crt&cert=/path/to/client.crt&key=/path/to/client.key")

// With paging options
db, err := sql.Open("geode", "localhost:3141?page_size=5000&conformance=full")
```

## Prepared Statements

```go
// Prepare statement
stmt, err := db.Prepare("MATCH (p:Person {name: ?}) RETURN p")
if err != nil {
    log.Fatal(err)
}
defer stmt.Close()

// Execute with parameters
rows, err := stmt.Query("Alice")
if err != nil {
    log.Fatal(err)
}
defer rows.Close()

// Or use QueryRow for single result
var age int
err = stmt.QueryRow("Bob").Scan(&age)
```

## Transactions

```go
// Begin transaction
tx, err := db.Begin()
if err != nil {
    log.Fatal(err)
}

// Execute statements
_, err = tx.Exec("CREATE (:Person {name: ?, age: ?})", "Alice", 30)
if err != nil {
    tx.Rollback()
    log.Fatal(err)
}

_, err = tx.Exec("CREATE (:Person {name: ?, age: ?})", "Bob", 25)
if err != nil {
    tx.Rollback()
    log.Fatal(err)
}

// Commit
if err := tx.Commit(); err != nil {
    log.Fatal(err)
}
```

## Connection Pooling

```go
// Configure connection pool
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(5)
db.SetConnMaxLifetime(5 * time.Minute)
db.SetConnMaxIdleTime(1 * time.Minute)
```

## Error Handling

The Go client provides rich error types with ISO GQL status codes:

```go
import "errors"

rows, err := db.Query("MATCH (p:Invalid) RETURN p")
if err != nil {
    var geodeErr *geode.DriverError
    if errors.As(err, &geodeErr) {
        fmt.Printf("Code: %s\n", geodeErr.Code)
        fmt.Printf("Message: %s\n", geodeErr.Message)
        fmt.Printf("Status Class: %s\n", geodeErr.StatusClass())
    }
    log.Fatal(err)
}
```

## Type Mapping

| GQL Type | Go Type |
|----------|---------|
| INTEGER | int64 |
| FLOAT | float64 |
| STRING | string |
| BOOLEAN | bool |
| NULL | nil |
| LIST | []interface{} |
| MAP | map[string]interface{} |
| NODE | map[string]any |
| EDGE | map[string]any |
| PATH | map[string]any |

## Unicode Utilities

The Go driver includes Unicode helpers used by the protocol framing layer:

```go
utf16 := geode.Utf8ToUtf16("Hello 🌍")
utf8 := geode.Utf16ToUtf8(utf16)
safe := geode.Wtf8Lossy([]byte{0x61, 0x80, 0x62})
```

<!-- CANARY: REQ=REQ-GQL-UNICODE-012; FEATURE="UTF-8 -> UTF-16 Conversion"; ASPECT=ClientWrapperGo; STATUS=IMPL; TEST=TestCANARY_ClientGo_Utf8Utf16RoundTrip; OWNER=clients; UPDATED=2025-09-27 -->
<!-- CANARY: REQ=REQ-GQL-UNICODE-013; FEATURE="UTF-16 -> UTF-8 Conversion"; ASPECT=ClientWrapperGo; STATUS=IMPL; TEST=TestCANARY_ClientGo_Utf8Utf16RoundTrip; OWNER=clients; UPDATED=2025-09-27 -->
<!-- CANARY: REQ=REQ-GQL-UNICODE-014; FEATURE="WTF-8 Lossy Decode"; ASPECT=ClientWrapperGo; STATUS=IMPL; TEST=TestCANARY_ClientGo_Wtf8Lossy; OWNER=clients; UPDATED=2025-09-27 -->

## Testing

The client includes support for testcontainers-go:

```go
func TestWithGeode(t *testing.T) {
    // Start Geode container
    ctx := context.Background()
    container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: testcontainers.ContainerRequest{
            Image: "geode:latest",
            ExposedPorts: []string{"3141/udp"},
            WaitingFor: wait.ForLog("Server started"),
        },
        Started: true,
    })
    if err != nil {
        t.Fatal(err)
    }
    defer container.Terminate(ctx)

    // Get connection string
    host, _ := container.Host(ctx)
    port, _ := container.MappedPort(ctx, "3141")

    db, err := sql.Open("geode", fmt.Sprintf("geode://%s:%s", host, port.Port()))
    if err != nil {
        t.Fatal(err)
    }
    defer db.Close()

    // Run tests...
}
```

## Performance Tips

1. **Use connection pooling** - Configure `SetMaxOpenConns` appropriately
2. **Prepared statements** - Reuse prepared statements for repeated queries
3. **Batch operations** - Use transactions for multiple operations
4. **Context timeouts** - Use `QueryContext` with timeouts
5. **Close resources** - Always defer `Close()` on rows, statements, and connections

## Examples

See the [examples directory](https://gitlab.com/devnw/codepros/geode/geode-client-go/tree/main/examples) for complete examples:

- Basic CRUD operations
- Transaction management
- Connection pooling
- Error handling
- Type conversions

## Repository

- GitLab: [devnw/codepros/geode/geode-client-go](https://gitlab.com/devnw/codepros/geode/geode-client-go)
- Module: `go.codepros.org/geode`
