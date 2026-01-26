---
title: "Go Client"
description: "Official Go client library for Geode"
weight: 1
tags:
  - go
  - golang
  - client
  - database-sql
categories:
keywords:
  - Geode Go client
  - Go SDK
  - GQL driver
  - graph database Go
  - client-libraries
  - go
series:
  - client-libraries
---

<!-- CANARY: REQ=REQ-CLIENT-INTEGRATION-001; FEATURE="RustClientIntegration"; ASPECT=QUICTransport; STATUS=TESTED; OWNER=clients; UPDATED=2026-01-15 -->

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
    db, err := sql.Open("geode", "geode://localhost:3141")
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
geode://[user:password@]host:port[/database][?param1=value1&param2=value2]
```

**Parameters**:
- `timeout` - Connection timeout (default: 30s)
- `max_pool_size` - Maximum connection pool size (default: 10)
- `tls_verify` - Verify TLS certificate (default: true)

**Examples**:
```go
// Basic connection
db, err := sql.Open("geode", "geode://localhost:3141")

// With authentication
db, err := sql.Open("geode", "geode://user:pass@localhost:3141")

// With parameters
db, err := sql.Open("geode", "geode://localhost:3141?timeout=60s&max_pool_size=20")
```

## Prepared Statements

```go
// Prepare statement
stmt, err := db.Prepare("MATCH (p:Person {name: $1}) RETURN p")
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
_, err = tx.Exec("CREATE (:Person {name: $1, age: $2})", "Alice", 30)
if err != nil {
    tx.Rollback()
    log.Fatal(err)
}

_, err = tx.Exec("CREATE (:Person {name: $1, age: $2})", "Bob", 25)
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
rows, err := db.Query("MATCH (p:Invalid) RETURN p")
if err != nil {
    if geodeErr, ok := err.(*geode.Error); ok {
        fmt.Printf("Code: %s\n", geodeErr.Code)
        fmt.Printf("Message: %s\n", geodeErr.Message)
        fmt.Printf("Details: %v\n", geodeErr.Details)
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
| NODE | geode.Node |
| RELATIONSHIP | geode.Relationship |
| PATH | geode.Path |

## Testing

The client includes support for testcontainers-go:

```go
func TestWithGeode(t *testing.T) {
    // Start Geode container
    ctx := context.Background()
    container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: testcontainers.ContainerRequest{
            Image: "geode:latest",
            ExposedPorts: []string{"3141/tcp"},
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
