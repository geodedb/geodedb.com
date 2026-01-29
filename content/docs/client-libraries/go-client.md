---
title: "Go Client"
description: "Complete guide to the Geode Go client library with database/sql integration"
url: /docs/client-libraries/go-client/
weight: 10

keywords:
  - Geode Go client
  - Go SDK
  - GQL driver
  - graph database Go
  - client library
---

<!-- CANARY: REQ=REQ-GQL-UNICODE-012; FEATURE="UTF-8 -> UTF-16 Conversion"; ASPECT=ClientWrapperGo; STATUS=IMPL; TEST=TestCANARY_ClientGo_Utf8Utf16RoundTrip; OWNER=clients; UPDATED=2025-09-27 -->
<!-- CANARY: REQ=REQ-GQL-UNICODE-013; FEATURE="UTF-16 -> UTF-8 Conversion"; ASPECT=ClientWrapperGo; STATUS=IMPL; TEST=TestCANARY_ClientGo_Utf8Utf16RoundTrip; OWNER=clients; UPDATED=2025-09-27 -->
<!-- CANARY: REQ=REQ-GQL-UNICODE-014; FEATURE="WTF-8 Lossy Decode"; ASPECT=ClientWrapperGo; STATUS=IMPL; TEST=TestCANARY_ClientGo_Wtf8Lossy; OWNER=clients; UPDATED=2025-09-27 -->

# Geode Go Client Library

A production-ready Go `database/sql` driver for the Geode graph database with full QUIC+TLS support.

## Installation

```bash
go get geodedb.com/geode
```

## Features

- ✅ **Full `database/sql` driver** - Standard Go database interface
- ✅ **QUIC + TLS 1.3** - Modern, secure transport
- ✅ **Connection pooling** - Built into `database/sql`
- ✅ **Prepared statements** - Query parameter support
- ✅ **Transaction support** - ACID transactions with savepoints
- ✅ **Context cancellation** - Graceful query cancellation
- ✅ **Rich error types** - ISO/IEC 39075 status codes
- ✅ **Unicode utilities** - UTF-8/UTF-16 conversion helpers

## Quick Start

### Basic Connection

```go
package main

import (
    "context"
    "database/sql"
    "log"
    "time"

    _ "geodedb.com/geode"
)

func main() {
    // Connect to Geode server
    db, err := sql.Open("geode", "localhost:3141?insecure=true")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Configure connection pool
    db.SetMaxOpenConns(10)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(5 * time.Minute)

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // Execute a query
    rows, err := db.QueryContext(ctx, "MATCH (n:Person) RETURN n.name LIMIT 10")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    for rows.Next() {
        var name string
        if err := rows.Scan(&name); err != nil {
            log.Fatal(err)
        }
        log.Println(name)
    }

    if err := rows.Err(); err != nil {
        log.Fatal(err)
    }
}
```

## DSN Format

The Data Source Name (DSN) supports multiple formats:

```
geode://host:port?options
host:port?options
host:port
host
```

### DSN Examples

```go
// Development (skip TLS verification)
db, _ := sql.Open("geode", "localhost:3141?insecure=true")

// Production with CA certificate
db, _ := sql.Open("geode", "localhost:3141?ca=/path/to/ca.crt")

// Mutual TLS (mTLS)
db, _ := sql.Open("geode", "localhost:3141?ca=/path/to/ca.crt&cert=/path/to/client.crt&key=/path/to/client.key")

// Custom page size
db, _ := sql.Open("geode", "localhost:3141?page_size=5000")

```

### DSN Options

| Option | Description | Default |
|--------|-------------|---------|
| `page_size` | Results page size | 1000 |
| `hello_name` | Client name for HELLO | geode-go |
| `hello_ver` | Client version for HELLO | 0.1 |
| `conformance` | GQL conformance level | min |
| `ca` | Path to CA certificate | |
| `cert` | Path to client certificate (mTLS) | |
| `key` | Path to client key (mTLS) | |
| `insecure` | Skip TLS verification (testing only) | false |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GEODE_HOST` | Default host |
| `GEODE_PORT` | Default port |
| `GEODE_TLS_CA` | Default CA certificate path |

## Querying

### Simple Queries

```go
ctx := context.Background()

// Execute query returning rows
rows, err := db.QueryContext(ctx, "MATCH (n:Person) RETURN n.name, n.age")
if err != nil {
    log.Fatal(err)
}
defer rows.Close()

for rows.Next() {
    var name string
    var age int
    if err := rows.Scan(&name, &age); err != nil {
        log.Fatal(err)
    }
    fmt.Printf("%s is %d years old\n", name, age)
}
```

### Parameterized Queries

```go
// Using ? placeholders
rows, err := db.QueryContext(ctx,
    "MATCH (p:Person {name: ?}) RETURN p.age",
    "Alice")

// Multiple parameters
rows, err := db.QueryContext(ctx,
    "MATCH (p:Person) WHERE p.age > ? AND p.city = ? RETURN p",
    30, "Seattle")
```

### Executing Non-Query Statements

```go
// Create node
result, err := db.ExecContext(ctx,
    "CREATE (p:Person {name: ?, age: ?})",
    "Bob", 25)
if err != nil {
    log.Fatal(err)
}

rowsAffected, _ := result.RowsAffected()
fmt.Printf("Created %d node(s)\n", rowsAffected)
```

### Query with Timeout

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

rows, err := db.QueryContext(ctx, "MATCH (n) RETURN n LIMIT 1000000")
if err != nil {
    if ctx.Err() == context.DeadlineExceeded {
        log.Println("Query timed out")
    }
    log.Fatal(err)
}
```

## Prepared Statements

Prepared statements improve performance for frequently executed queries:

```go
// Prepare statement
stmt, err := db.PrepareContext(ctx, "MATCH (n:Person {name: ?}) RETURN n.age")
if err != nil {
    log.Fatal(err)
}
defer stmt.Close()

// Execute multiple times
for _, name := range []string{"Alice", "Bob", "Charlie"} {
    var age int
    err := stmt.QueryRowContext(ctx, name).Scan(&age)
    if err != nil {
        log.Printf("No age found for %s\n", name)
        continue
    }
    fmt.Printf("%s is %d years old\n", name, age)
}
```

## Transactions

### Basic Transactions

```go
// Begin transaction
tx, err := db.BeginTx(ctx, nil)
if err != nil {
    log.Fatal(err)
}

// Execute operations
_, err = tx.ExecContext(ctx, "CREATE (n:Person {name: 'Alice', age: 30})")
if err != nil {
    tx.Rollback()
    log.Fatal(err)
}

_, err = tx.ExecContext(ctx, "CREATE (n:Person {name: 'Bob', age: 25})")
if err != nil {
    tx.Rollback()
    log.Fatal(err)
}

// Commit transaction
if err := tx.Commit(); err != nil {
    log.Fatal(err)
}
```

### Transaction Isolation Levels

```go
import "database/sql"

// Serializable isolation
tx, err := db.BeginTx(ctx, &sql.TxOptions{
    Isolation: sql.LevelSerializable,
    ReadOnly:  false,
})

// Read-only transaction
tx, err := db.BeginTx(ctx, &sql.TxOptions{
    ReadOnly: true,
})
```

### Savepoints

```go
tx, _ := db.BeginTx(ctx, nil)

// Create initial data
tx.ExecContext(ctx, "CREATE (n:Person {name: 'Alice', age: 30})")

// Create savepoint
_, err := tx.ExecContext(ctx, "SAVEPOINT before_update")

// Make changes
tx.ExecContext(ctx, "MATCH (n:Person {name: 'Alice'}) SET n.age = 40")

// Rollback to savepoint
_, err = tx.ExecContext(ctx, "ROLLBACK TO before_update")

// Alice's age is still 30
tx.Commit()
```

## Error Handling

The driver provides rich error types with diagnostic information:

```go
import (
    "errors"
    "geodedb.com/geode"
)

rows, err := db.QueryContext(ctx, "INVALID QUERY")
if err != nil {
    var derr *geode.DriverError
    if errors.As(err, &derr) {
        log.Printf("Code: %s", derr.Code)
        log.Printf("Message: %s", derr.Message)
        log.Printf("Diagnostic: %s", derr.Diagnostic)

        if derr.IsRetryable() {
            log.Println("Error is retryable")
        }
    }
}
```

### Error Types

- **DriverError** - Server errors with ISO/IEC 39075 status codes
- **TransportError** - Network/QUIC failures
- **ConfigError** - DSN parsing errors
- **SecurityError** - TLS/validation failures
- **StateError** - Invalid connection state transitions

### Common Error Codes

| Code | Description |
|------|-------------|
| `00000` | Success |
| `42000` | Syntax error |
| `42001` | Undefined object |
| `42002` | Duplicate object |
| `22000` | Data exception |
| `23000` | Integrity constraint violation |

## Connection Pooling

Configure the connection pool for optimal performance:

```go
// Maximum open connections
db.SetMaxOpenConns(100)

// Maximum idle connections
db.SetMaxIdleConns(25)

// Maximum connection lifetime
db.SetConnMaxLifetime(5 * time.Minute)

// Maximum idle time
db.SetConnMaxIdleTime(1 * time.Minute)
```

**Guidelines**:
- Read-heavy: Higher `MaxOpenConns` (100-200)
- Write-heavy: Lower `MaxOpenConns` (10-50)
- Mixed: Medium `MaxOpenConns` (50-100)

## Unicode Utilities

Helper functions for Unicode conversion:

```go
import "geodedb.com/geode"

// UTF-8 to UTF-16
utf16 := geode.Utf8ToUtf16("Hello 🌍")

// UTF-16 to UTF-8
utf8 := geode.Utf16ToUtf8(utf16)

// WTF-8 lossy decode (replaces invalid sequences with U+FFFD)
safe := geode.Wtf8Lossy([]byte{0x61, 0x80, 0x62})
```

## Testing

### Unit Tests (No Server Required)

```bash
go test -v -short ./...
```

### Integration Tests with Docker

```bash
# Automatic Docker integration tests
go test -v -tags=integration ./...

# With custom Geode image
GEODE_IMAGE="myregistry/geode:tag" go test -v -tags=integration ./...
```

### Integration Tests with Manual Server

```bash
# Start Geode server
./geode serve --listen 0.0.0.0:3141

# Run tests
GEODE_TEST_DSN="localhost:3141?insecure=true" go test -v ./...
```

### Benchmarks

```bash
# Unit benchmarks (no server required)
go test -bench=. -benchmem ./...

# Docker-based benchmarks
go test -tags=integration -bench=BenchmarkDocker -benchmem ./...
```

### Fuzzing

```bash
# Fuzz DSN parsing
go test -fuzz=FuzzParseDSN -fuzztime=30s

# Fuzz protocol frame parsing
go test -fuzz=FuzzParseFrame -fuzztime=30s
```

## Examples

### Social Network Query

```go
rows, err := db.QueryContext(ctx, `
    MATCH (person:Person {name: ?})-[:KNOWS*1..2]->(friend:Person)
    WHERE friend <> person
    RETURN DISTINCT friend.name AS name, friend.age AS age
    ORDER BY friend.age DESC
    LIMIT 10
`, "Alice")

for rows.Next() {
    var name string
    var age int
    rows.Scan(&name, &age)
    fmt.Printf("%s (age %d)\n", name, age)
}
```

### Aggregation Query

```go
rows, err := db.QueryContext(ctx, `
    MATCH (p:Person)
    RETURN p.city AS city, count(*) AS population
    GROUP BY p.city
    ORDER BY population DESC
    LIMIT 5
`)

for rows.Next() {
    var city string
    var population int
    rows.Scan(&city, &population)
    fmt.Printf("%s: %d people\n", city, population)
}
```

### Batch Insert

```go
tx, _ := db.BeginTx(ctx, nil)

stmt, _ := tx.PrepareContext(ctx, "CREATE (p:Person {name: ?, age: ?})")
defer stmt.Close()

people := []struct{ name string; age int }{
    {"Alice", 30},
    {"Bob", 25},
    {"Charlie", 35},
}

for _, p := range people {
    _, err := stmt.ExecContext(ctx, p.name, p.age)
    if err != nil {
        tx.Rollback()
        log.Fatal(err)
    }
}

tx.Commit()
```

## Performance Tips

1. **Use connection pooling** with appropriate limits
2. **Reuse prepared statements** for repeated queries
3. **Batch operations** in transactions
4. **Use context timeouts** to prevent hanging queries
5. **Close rows/statements** to prevent resource leaks
6. **Monitor pool metrics** with `db.Stats()`

## Troubleshooting

### Connection Refused

Ensure Geode server is running:
```bash
./geode serve --listen 0.0.0.0:3141
```

### TLS Verification Errors

For development, skip verification:
```go
db, _ := sql.Open("geode", "localhost:3141?insecure=true")
```

For production, provide CA certificate:
```go
db, _ := sql.Open("geode", "localhost:3141?ca=/path/to/ca.crt")
```

### Connection Pool Exhaustion

Monitor pool stats:
```go
stats := db.Stats()
fmt.Printf("Open: %d, Idle: %d, InUse: %d\n",
    stats.OpenConnections,
    stats.Idle,
    stats.InUse)
```

Increase pool size if needed:
```go
db.SetMaxOpenConns(200)
```

## Next Steps

- [GQL Reference](/docs/gql-reference/) - Query language guide
- [Transaction Patterns](/docs/transactions/advanced-patterns/) - Advanced transaction features
- [Error Codes](/docs/reference/error-codes/) - Complete error reference
- [Performance Tuning](/docs/query/performance-tuning/) - Optimize performance
