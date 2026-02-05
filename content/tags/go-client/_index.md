---
title: "Tag: Go Client Library"
description: "Production-ready Go client for Geode with database/sql driver support, connection pooling, prepared statements, and idiomatic Go patterns for graph database operations."
keywords:
  - Go client
  - Golang
  - database/sql
  - geode-client-go
  - Go SDK
  - Geode
  - Go driver
  - QUIC
  - connection pooling
  - prepared statements
  - transactions
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/go-client/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

The Geode Go client library (`geode-client-go`) provides a production-ready, idiomatic Go interface for connecting to Geode graph databases. Built on Go's standard `database/sql` interface, it integrates seamlessly with existing Go applications and tooling while leveraging QUIC+TLS 1.3 for secure, high-performance communication.

The Go client is designed for developers who want familiar Go patterns combined with full access to Geode's GQL capabilities. Whether you are building microservices, data pipelines, or analytical applications, the Go client provides the reliability and performance characteristics expected in production environments.

## Key Features

**database/sql Driver**: The Go client implements Go's standard `database/sql` driver interface, allowing you to use familiar patterns and integrate with existing database tooling, ORMs, and middleware.

**QUIC + TLS 1.3**: All connections use QUIC transport with mandatory TLS 1.3 encryption, providing low-latency connections with strong security guarantees.

**Connection Pooling**: Built-in connection pooling through `database/sql` handles connection lifecycle, reuse, and health checking automatically.

**Prepared Statements**: Pre-compile frequently used queries to reduce parsing overhead and improve performance.

**Transaction Support**: Full ACID transaction support with explicit BEGIN, COMMIT, and ROLLBACK control.

**Rich Error Types**: Detailed error information with ISO/IEC 39075 GQL status codes for precise error handling.

**Context Cancellation**: Full support for Go's context package, enabling timeouts and cancellation.

## Installation

Install the Go client using the standard Go module system:

```bash
go get geodedb.com/geode
```

The client requires Go 1.24.0 or later.

### Verifying Installation

After installation, verify the module:

```bash
go list -m geodedb.com/geode
# Should output: geodedb.com/geode v0.x.x
```

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
    db, err := sql.Open("geode", "localhost:3141?ca=/path/to/ca.crt")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Configure connection pool
    db.SetMaxOpenConns(10)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(time.Hour)
    db.SetConnMaxIdleTime(10 * time.Minute)

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // Verify connection
    if err := db.PingContext(ctx); err != nil {
        log.Fatal("Failed to connect:", err)
    }

    log.Println("Connected to Geode!")
}
```

### Executing Queries

```go
func queryPeople(ctx context.Context, db *sql.DB) error {
    // Execute a query
    rows, err := db.QueryContext(ctx, `
        MATCH (p:Person)
        RETURN p.name AS name, p.age AS age
        ORDER BY p.name
        LIMIT 10
    `)
    if err != nil {
        return err
    }
    defer rows.Close()

    // Iterate through results
    for rows.Next() {
        var name string
        var age int
        if err := rows.Scan(&name, &age); err != nil {
            return err
        }
        log.Printf("Person: %s, Age: %d", name, age)
    }

    return rows.Err()
}
```

### Parameterized Queries

Use parameterized queries to prevent injection attacks and improve performance:

```go
func findPerson(ctx context.Context, db *sql.DB, name string) error {
    // Use ? for positional parameters
    rows, err := db.QueryContext(ctx, `
        MATCH (p:Person {name: ?})
        RETURN p.name, p.age, p.email
    `, name)
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var name, email string
        var age int
        if err := rows.Scan(&name, &age, &email); err != nil {
            return err
        }
        log.Printf("Found: %s (%d) - %s", name, age, email)
    }

    return rows.Err()
}

// Named parameters
func findPersonNamed(ctx context.Context, db *sql.DB, name string, minAge int) error {
    rows, err := db.QueryContext(ctx, `
        MATCH (p:Person {name: $name})
        WHERE p.age >= $minAge
        RETURN p.name, p.age
    `, sql.Named("name", name), sql.Named("minAge", minAge))
    if err != nil {
        return err
    }
    defer rows.Close()
    // Process results...
    return rows.Err()
}
```

## DSN (Data Source Name) Format

The connection string supports multiple formats:

```
quic://host:port?options
host:port?options
host:port
host
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
| `insecure_tls_skip_verify` | Skip TLS verification (testing only) | false |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GEODE_HOST` | Default host |
| `GEODE_PORT` | Default port |
| `GEODE_TLS_CA` | Default CA certificate path |

### Connection Examples

```go
// Simple connection (TLS with system CA)
db, _ := sql.Open("geode", "geode.example.com:3141")

// With custom CA certificate
db, _ := sql.Open("geode", "geode.example.com:3141?ca=/etc/geode/ca.crt")

// With mutual TLS (mTLS)
db, _ := sql.Open("geode", "geode.example.com:3141?ca=/etc/geode/ca.crt&cert=/etc/geode/client.crt&key=/etc/geode/client.key")

// Development mode (skip TLS verification)
db, _ := sql.Open("geode", "localhost:3141?insecure_tls_skip_verify=true")

// Using URL format
db, _ := sql.Open("geode", "quic://user:pass@localhost:3141?page_size=500")
```

## Transaction Management

The Go client supports full ACID transactions:

```go
func transferFunds(ctx context.Context, db *sql.DB, from, to string, amount float64) error {
    // Start transaction
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }

    // Debit from source account
    _, err = tx.ExecContext(ctx, `
        MATCH (a:Account {id: ?})
        WHERE a.balance >= ?
        SET a.balance = a.balance - ?
    `, from, amount, amount)
    if err != nil {
        tx.Rollback()
        return err
    }

    // Credit to destination account
    _, err = tx.ExecContext(ctx, `
        MATCH (a:Account {id: ?})
        SET a.balance = a.balance + ?
    `, to, amount)
    if err != nil {
        tx.Rollback()
        return err
    }

    // Commit transaction
    return tx.Commit()
}
```

### Transaction Options

```go
// Read-only transaction
tx, err := db.BeginTx(ctx, &sql.TxOptions{
    ReadOnly: true,
})

// With isolation level (if supported)
tx, err := db.BeginTx(ctx, &sql.TxOptions{
    Isolation: sql.LevelSerializable,
})
```

## Prepared Statements

Use prepared statements for frequently executed queries:

```go
func batchLookup(ctx context.Context, db *sql.DB, ids []string) error {
    // Prepare statement once
    stmt, err := db.PrepareContext(ctx, `
        MATCH (p:Person {id: ?})
        RETURN p.name, p.age
    `)
    if err != nil {
        return err
    }
    defer stmt.Close()

    // Execute multiple times
    for _, id := range ids {
        rows, err := stmt.QueryContext(ctx, id)
        if err != nil {
            return err
        }

        for rows.Next() {
            var name string
            var age int
            if err := rows.Scan(&name, &age); err != nil {
                rows.Close()
                return err
            }
            log.Printf("ID %s: %s (%d)", id, name, age)
        }
        rows.Close()
    }

    return nil
}
```

## Connection Pooling

The `database/sql` package provides built-in connection pooling:

```go
func configurePool(db *sql.DB) {
    // Maximum number of open connections
    db.SetMaxOpenConns(25)

    // Maximum number of idle connections
    db.SetMaxIdleConns(10)

    // Maximum lifetime of a connection
    db.SetConnMaxLifetime(5 * time.Minute)

    // Maximum idle time before closing
    db.SetConnMaxIdleTime(1 * time.Minute)
}
```

### Pool Monitoring

```go
func monitorPool(db *sql.DB) {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        stats := db.Stats()
        log.Printf("Pool Stats: Open=%d, InUse=%d, Idle=%d, WaitCount=%d, WaitDuration=%v",
            stats.OpenConnections,
            stats.InUse,
            stats.Idle,
            stats.WaitCount,
            stats.WaitDuration,
        )
    }
}
```

## Error Handling

The Go client provides rich error types:

```go
import "geodedb.com/geode"

func handleError(err error) {
    if err == nil {
        return
    }

    var derr *geode.DriverError
    if errors.As(err, &derr) {
        log.Printf("Geode Error - Code: %s, Message: %s", derr.Code, derr.Message)

        // Check if error is retryable
        if derr.IsRetryable() {
            log.Println("Error is retryable")
        }

        // Handle specific error codes
        switch derr.Code {
        case "42000": // Syntax error
            log.Println("Query syntax error")
        case "28000": // Authentication failure
            log.Println("Authentication failed")
        case "40001": // Serialization failure
            log.Println("Transaction conflict - retry")
        }
    } else {
        log.Printf("Generic error: %v", err)
    }
}
```

### Retry Logic

```go
func executeWithRetry(ctx context.Context, db *sql.DB, query string, args ...interface{}) error {
    maxRetries := 3
    baseDelay := 100 * time.Millisecond

    for attempt := 0; attempt < maxRetries; attempt++ {
        _, err := db.ExecContext(ctx, query, args...)
        if err == nil {
            return nil
        }

        var derr *geode.DriverError
        if errors.As(err, &derr) && derr.IsRetryable() {
            delay := baseDelay * time.Duration(1<<attempt)
            log.Printf("Retrying in %v (attempt %d/%d)", delay, attempt+1, maxRetries)
            time.Sleep(delay)
            continue
        }

        return err
    }

    return fmt.Errorf("max retries exceeded")
}
```

## Graph Operations

### Creating Nodes and Relationships

```go
func createSocialGraph(ctx context.Context, db *sql.DB) error {
    // Create nodes
    _, err := db.ExecContext(ctx, `
        CREATE (alice:Person {name: 'Alice', age: 30})
        CREATE (bob:Person {name: 'Bob', age: 25})
        CREATE (alice)-[:FRIENDS_WITH {since: 2020}]->(bob)
    `)
    return err
}

// Create with parameters
func createPerson(ctx context.Context, db *sql.DB, name string, age int) error {
    _, err := db.ExecContext(ctx, `
        CREATE (p:Person {name: ?, age: ?, created_at: datetime()})
    `, name, age)
    return err
}
```

### Traversing Relationships

```go
func findFriendsOfFriends(ctx context.Context, db *sql.DB, personName string) error {
    rows, err := db.QueryContext(ctx, `
        MATCH (p:Person {name: ?})-[:FRIENDS_WITH*2..3]-(fof:Person)
        WHERE fof.name <> ?
        RETURN DISTINCT fof.name AS name, fof.age AS age
        ORDER BY fof.name
    `, personName, personName)
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var name string
        var age int
        if err := rows.Scan(&name, &age); err != nil {
            return err
        }
        log.Printf("Friend of friend: %s (%d)", name, age)
    }

    return rows.Err()
}
```

### Aggregations

```go
func getStatistics(ctx context.Context, db *sql.DB) error {
    row := db.QueryRowContext(ctx, `
        MATCH (p:Person)
        RETURN
            count(p) AS total,
            avg(p.age) AS avg_age,
            min(p.age) AS min_age,
            max(p.age) AS max_age
    `)

    var total int
    var avgAge, minAge, maxAge float64
    if err := row.Scan(&total, &avgAge, &minAge, &maxAge); err != nil {
        return err
    }

    log.Printf("Total: %d, Avg Age: %.1f, Range: %.0f-%.0f",
        total, avgAge, minAge, maxAge)
    return nil
}
```

## QUIC Performance Tuning

The Go client uses [quic-go](https://github.com/quic-go/quic-go) for QUIC transport. For optimal throughput on high-bandwidth connections, configure the following system-level optimizations.

### UDP Buffer Sizes

Increase the maximum UDP buffer size to ~7MB for high-throughput transfers:

**Linux:**

```bash
sudo sysctl -w net.core.rmem_max=7340032
sudo sysctl -w net.core.wmem_max=7340032

# Persist across reboots
echo "net.core.rmem_max=7340032" | sudo tee -a /etc/sysctl.d/99-geode-quic.conf
echo "net.core.wmem_max=7340032" | sudo tee -a /etc/sysctl.d/99-geode-quic.conf
```

**BSD/macOS:**

```bash
sudo sysctl -w kern.ipc.maxsockbuf=8441037
```

### Generic Segmentation Offload (GSO)

GSO batches UDP packets to reduce syscall overhead. It is automatically enabled on Linux 4.18+.

- **No configuration required** - enabled automatically
- **To disable** (not recommended): Set `QUIC_GO_DISABLE_GSO=true` environment variable

### Path MTU Discovery (DPLPMTUD)

DPLPMTUD probes for optimal MTU size, reducing per-packet overhead. It is enabled by default.

## Testing

```bash
# Unit tests (no server required)
go test -v -short ./...

# Integration tests with manual server
GEODE_TEST_DSN="localhost:3141?insecure_tls_skip_verify=true" go test -v ./...

# Docker-based integration tests (recommended)
go test -v -tags=integration ./...

# Docker integration tests with custom image
GEODE_IMAGE="myregistry/geode:tag" go test -v -tags=integration ./...

# Unit benchmarks
go test -bench=. -benchmem ./...

# Fuzzing
go test -fuzz=FuzzParseDSN -fuzztime=30s
```

## Utility Functions

### Unicode Conversion

```go
import "geodedb.com/geode"

// UTF-8 to UTF-16
utf16 := geode.Utf8ToUtf16("Hello World")

// UTF-16 to UTF-8
utf8 := geode.Utf16ToUtf8(utf16)

// WTF-8 lossy decode (replaces invalid sequences with U+FFFD)
safe := geode.Wtf8Lossy([]byte{0x61, 0x80, 0x62})
```

## Best Practices

### Connection Management

```go
// Good: Use a single *sql.DB for the entire application
var db *sql.DB

func init() {
    var err error
    db, err = sql.Open("geode", os.Getenv("GEODE_DSN"))
    if err != nil {
        log.Fatal(err)
    }
    configurePool(db)
}

// Good: Use context with timeout
func query(ctx context.Context) error {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    rows, err := db.QueryContext(ctx, "MATCH (n) RETURN n LIMIT 10")
    // ...
}

// Bad: Don't create new connections for each request
func badQuery() error {
    db, _ := sql.Open("geode", "localhost:3141")  // Creates new pool!
    defer db.Close()
    // ...
}
```

### Resource Cleanup

```go
// Good: Always close rows
rows, err := db.QueryContext(ctx, query)
if err != nil {
    return err
}
defer rows.Close()

// Good: Check rows.Err() after iteration
for rows.Next() {
    // ...
}
if err := rows.Err(); err != nil {
    return err
}
```

### Batch Operations

```go
func batchInsert(ctx context.Context, db *sql.DB, people []Person) error {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }

    stmt, err := tx.PrepareContext(ctx, `
        CREATE (p:Person {name: ?, age: ?})
    `)
    if err != nil {
        tx.Rollback()
        return err
    }
    defer stmt.Close()

    for _, p := range people {
        if _, err := stmt.ExecContext(ctx, p.Name, p.Age); err != nil {
            tx.Rollback()
            return err
        }
    }

    return tx.Commit()
}
```

## Related Topics

- [SQL Driver Interface](/tags/sql-driver/)
- [Client Libraries](/tags/client-libraries/)
- [QUIC Protocol](/tags/quic/)
- [Go Programming](/tags/go/)
- [Connection Pooling](/tags/connection-pooling/)
- [Transactions](/tags/transactions/)
- [Performance Tuning](/tags/performance/)

## Further Reading

- [Go database/sql Documentation](https://pkg.go.dev/database/sql)
- [QUIC Protocol RFC 9000](https://www.rfc-editor.org/rfc/rfc9000.html)
- [ISO/IEC 39075:2024 GQL Standard](https://www.iso.org/standard/76120.html)
- [Go Client Repository](https://gitlab.com/devnw/codepros/geode/geode-client-go)
- [Geode Documentation](/docs/)
