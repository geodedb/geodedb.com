---
title: "Tag: database/sql Driver Interface"
description: "Standard database/sql driver interface for Geode enabling seamless Go integration with connection pooling, prepared statements, transactions, and idiomatic Go patterns."
keywords:
  - SQL driver
  - database/sql
  - driver interface
  - standard interface
  - Go client
  - Go driver
  - Geode
  - connection pooling
  - prepared statements
  - transactions
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/sql-driver/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

The Geode Go client implements Go's standard `database/sql` driver interface, providing a familiar and idiomatic way to interact with Geode graph databases. This standard interface enables seamless integration with existing Go applications, ORMs, migration tools, and database middleware.

By implementing the `database/sql` interface, Geode becomes accessible to any Go application using standard database patterns, while still providing full access to GQL's graph query capabilities.

## Why database/sql?

The `database/sql` package is Go's standard abstraction for SQL-like databases, providing:

**Standardized API**: Applications can switch between databases with minimal code changes.

**Built-in Connection Pooling**: Automatic connection lifecycle management, health checking, and pool sizing.

**Prepared Statement Caching**: Efficient query execution with automatic statement preparation.

**Transaction Support**: Standard BEGIN, COMMIT, ROLLBACK semantics.

**Context Integration**: Full support for cancellation and timeouts via `context.Context`.

**Ecosystem Compatibility**: Works with ORMs, migration tools, and monitoring solutions.

## Installation and Registration

```go
import (
    "database/sql"

    _ "geodedb.com/geode" // Register the driver
)

func main() {
    // The driver is now registered as "geode"
    db, err := sql.Open("geode", "localhost:3141?ca=/path/to/ca.crt")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()
}
```

The blank import (`_`) registers the Geode driver with the `database/sql` package under the name "geode".

## Connection String (DSN) Format

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
| `insecure_tls_skip_verify` | Skip TLS verification | false |

### Connection Examples

```go
// Simple connection with TLS
db, _ := sql.Open("geode", "geode.example.com:3141")

// With custom CA certificate
db, _ := sql.Open("geode", "geode.example.com:3141?ca=/etc/geode/ca.crt")

// Mutual TLS (mTLS)
db, _ := sql.Open("geode", "geode.example.com:3141?ca=/etc/geode/ca.crt&cert=/etc/geode/client.crt&key=/etc/geode/client.key")

// Development mode (skip TLS verification)
db, _ := sql.Open("geode", "localhost:3141?insecure_tls_skip_verify=true")

// URL format
db, _ := sql.Open("geode", "quic://localhost:3141?page_size=500")
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GEODE_HOST` | Default host |
| `GEODE_PORT` | Default port |
| `GEODE_TLS_CA` | Default CA certificate path |

## Connection Pooling

The `database/sql` package provides built-in connection pooling:

```go
func configurePool(db *sql.DB) {
    // Maximum number of open connections to the database
    db.SetMaxOpenConns(25)

    // Maximum number of idle connections in the pool
    db.SetMaxIdleConns(10)

    // Maximum amount of time a connection may be reused
    db.SetConnMaxLifetime(5 * time.Minute)

    // Maximum amount of time a connection may be idle before being closed
    db.SetConnMaxIdleTime(1 * time.Minute)
}
```

### Pool Sizing Guidelines

| Workload | MaxOpenConns | MaxIdleConns | ConnMaxLifetime |
|----------|--------------|--------------|-----------------|
| Light (< 100 req/s) | 10 | 5 | 10 minutes |
| Medium (100-1000 req/s) | 25 | 10 | 5 minutes |
| Heavy (> 1000 req/s) | 50 | 25 | 2 minutes |

### Monitoring Pool Statistics

```go
func monitorPool(db *sql.DB) {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        stats := db.Stats()
        log.Printf("Pool Stats:")
        log.Printf("  Open connections: %d", stats.OpenConnections)
        log.Printf("  In use: %d", stats.InUse)
        log.Printf("  Idle: %d", stats.Idle)
        log.Printf("  Wait count: %d", stats.WaitCount)
        log.Printf("  Wait duration: %v", stats.WaitDuration)
        log.Printf("  Max idle closed: %d", stats.MaxIdleClosed)
        log.Printf("  Max idle time closed: %d", stats.MaxIdleTimeClosed)
        log.Printf("  Max lifetime closed: %d", stats.MaxLifetimeClosed)
    }
}
```

## Query Execution

### QueryContext and QueryRowContext

```go
// Multiple rows
func queryPeople(ctx context.Context, db *sql.DB) error {
    rows, err := db.QueryContext(ctx, `
        MATCH (p:Person)
        RETURN p.name AS name, p.age AS age
        ORDER BY p.name
        LIMIT 100
    `)
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
        fmt.Printf("Name: %s, Age: %d\n", name, age)
    }

    return rows.Err()
}

// Single row
func findPerson(ctx context.Context, db *sql.DB, id int) (*Person, error) {
    row := db.QueryRowContext(ctx, `
        MATCH (p:Person {id: ?})
        RETURN p.name, p.age, p.email
    `, id)

    var p Person
    err := row.Scan(&p.Name, &p.Age, &p.Email)
    if err == sql.ErrNoRows {
        return nil, nil // Not found
    }
    if err != nil {
        return nil, err
    }
    return &p, nil
}
```

### ExecContext

For queries that don't return rows:

```go
func createPerson(ctx context.Context, db *sql.DB, name string, age int) error {
    result, err := db.ExecContext(ctx, `
        CREATE (p:Person {name: ?, age: ?, created_at: datetime()})
    `, name, age)
    if err != nil {
        return err
    }

    // Note: RowsAffected may not be supported by all operations
    affected, err := result.RowsAffected()
    if err == nil {
        log.Printf("Created %d nodes", affected)
    }

    return nil
}
```

## Parameterized Queries

### Positional Parameters

```go
// Use ? for positional parameters
rows, err := db.QueryContext(ctx, `
    MATCH (p:Person {name: ?})
    WHERE p.age >= ?
    RETURN p.name, p.age
`, "Alice", 25)
```

### Named Parameters

```go
// Use sql.Named for named parameters
rows, err := db.QueryContext(ctx, `
    MATCH (p:Person {name: $name})
    WHERE p.age >= $minAge
    RETURN p.name, p.age
`, sql.Named("name", "Alice"), sql.Named("minAge", 25))
```

### Parameter Types

The driver automatically converts Go types to GQL types:

| Go Type | GQL Type |
|---------|----------|
| `bool` | BOOLEAN |
| `int`, `int64` | INTEGER |
| `float64` | FLOAT |
| `string` | STRING |
| `[]byte` | BYTES |
| `time.Time` | TIMESTAMP |
| `nil` | NULL |
| `[]interface{}` | LIST |
| `map[string]interface{}` | MAP |

## Prepared Statements

Prepared statements improve performance for frequently executed queries:

```go
func batchLookup(ctx context.Context, db *sql.DB, ids []int) error {
    // Prepare once
    stmt, err := db.PrepareContext(ctx, `
        MATCH (p:Person {id: ?})
        RETURN p.name, p.age, p.email
    `)
    if err != nil {
        return err
    }
    defer stmt.Close()

    // Execute many times
    for _, id := range ids {
        rows, err := stmt.QueryContext(ctx, id)
        if err != nil {
            return err
        }

        for rows.Next() {
            var name, email string
            var age int
            if err := rows.Scan(&name, &age, &email); err != nil {
                rows.Close()
                return err
            }
            fmt.Printf("%d: %s (%d) - %s\n", id, name, age, email)
        }
        rows.Close()
    }

    return nil
}
```

### Statement Lifetime

```go
// Application-scoped prepared statements
type PersonRepository struct {
    db         *sql.DB
    findByID   *sql.Stmt
    findByName *sql.Stmt
}

func NewPersonRepository(ctx context.Context, db *sql.DB) (*PersonRepository, error) {
    findByID, err := db.PrepareContext(ctx, `
        MATCH (p:Person {id: ?}) RETURN p.name, p.age
    `)
    if err != nil {
        return nil, err
    }

    findByName, err := db.PrepareContext(ctx, `
        MATCH (p:Person {name: ?}) RETURN p.id, p.age
    `)
    if err != nil {
        findByID.Close()
        return nil, err
    }

    return &PersonRepository{
        db:         db,
        findByID:   findByID,
        findByName: findByName,
    }, nil
}

func (r *PersonRepository) Close() {
    r.findByID.Close()
    r.findByName.Close()
}
```

## Transaction Management

### Basic Transactions

```go
func transferFunds(ctx context.Context, db *sql.DB, from, to string, amount float64) error {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }

    // Debit
    _, err = tx.ExecContext(ctx, `
        MATCH (a:Account {id: ?})
        WHERE a.balance >= ?
        SET a.balance = a.balance - ?
    `, from, amount, amount)
    if err != nil {
        tx.Rollback()
        return err
    }

    // Credit
    _, err = tx.ExecContext(ctx, `
        MATCH (a:Account {id: ?})
        SET a.balance = a.balance + ?
    `, to, amount)
    if err != nil {
        tx.Rollback()
        return err
    }

    return tx.Commit()
}
```

### Transaction Options

```go
// Read-only transaction
tx, err := db.BeginTx(ctx, &sql.TxOptions{
    ReadOnly: true,
})

// With isolation level
tx, err := db.BeginTx(ctx, &sql.TxOptions{
    Isolation: sql.LevelSerializable,
})
```

### Transaction Helper Pattern

```go
func withTransaction(ctx context.Context, db *sql.DB, fn func(*sql.Tx) error) error {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }

    defer func() {
        if p := recover(); p != nil {
            tx.Rollback()
            panic(p)
        }
    }()

    if err := fn(tx); err != nil {
        tx.Rollback()
        return err
    }

    return tx.Commit()
}

// Usage
err := withTransaction(ctx, db, func(tx *sql.Tx) error {
    _, err := tx.ExecContext(ctx, "CREATE (n:Node {name: ?})", name)
    return err
})
```

## Context and Cancellation

### Timeouts

```go
func queryWithTimeout(db *sql.DB) error {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    rows, err := db.QueryContext(ctx, "MATCH (n) RETURN n LIMIT 1000")
    if err != nil {
        if ctx.Err() == context.DeadlineExceeded {
            return fmt.Errorf("query timed out")
        }
        return err
    }
    defer rows.Close()
    // Process rows...
    return nil
}
```

### Cancellation

```go
func cancelableQuery(ctx context.Context, db *sql.DB) error {
    // Query will be cancelled if ctx is cancelled
    rows, err := db.QueryContext(ctx, "MATCH (n) RETURN n")
    if err != nil {
        if ctx.Err() == context.Canceled {
            return fmt.Errorf("query cancelled")
        }
        return err
    }
    defer rows.Close()
    // Process rows...
    return nil
}
```

## Error Handling

### Driver-Specific Errors

```go
import "geodedb.com/geode"

func handleError(err error) {
    if err == nil {
        return
    }

    var derr *geode.DriverError
    if errors.As(err, &derr) {
        log.Printf("Geode Error - Code: %s, Message: %s", derr.Code, derr.Message)

        // Check if retryable
        if derr.IsRetryable() {
            log.Println("This error is retryable")
        }

        // Handle specific error codes
        switch derr.Code {
        case "42000": // Syntax error
            log.Println("GQL syntax error")
        case "28000": // Authentication failure
            log.Println("Authentication failed")
        case "40001": // Serialization failure
            log.Println("Transaction conflict - retry recommended")
        case "08000": // Connection error
            log.Println("Connection error")
        }
    } else {
        log.Printf("Generic error: %v", err)
    }
}
```

### Retry Pattern

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
            select {
            case <-ctx.Done():
                return ctx.Err()
            case <-time.After(delay):
                continue
            }
        }

        return err
    }

    return fmt.Errorf("max retries exceeded")
}
```

## Scanning Complex Types

### Null Handling

```go
func queryWithNulls(ctx context.Context, db *sql.DB) error {
    rows, err := db.QueryContext(ctx, `
        MATCH (p:Person)
        RETURN p.name, p.nickname, p.age
    `)
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var name string
        var nickname sql.NullString
        var age sql.NullInt64

        if err := rows.Scan(&name, &nickname, &age); err != nil {
            return err
        }

        if nickname.Valid {
            fmt.Printf("%s (aka %s)", name, nickname.String)
        } else {
            fmt.Printf("%s", name)
        }

        if age.Valid {
            fmt.Printf(", age %d\n", age.Int64)
        } else {
            fmt.Printf(", age unknown\n")
        }
    }

    return rows.Err()
}
```

### Custom Scanner

```go
type JSONMap map[string]interface{}

func (j *JSONMap) Scan(src interface{}) error {
    switch v := src.(type) {
    case []byte:
        return json.Unmarshal(v, j)
    case string:
        return json.Unmarshal([]byte(v), j)
    case nil:
        *j = nil
        return nil
    default:
        return fmt.Errorf("cannot scan %T into JSONMap", src)
    }
}

// Usage
var metadata JSONMap
err := row.Scan(&metadata)
```

## Best Practices

### Connection Lifecycle

```go
// Good: Single *sql.DB for the application
var db *sql.DB

func init() {
    var err error
    db, err = sql.Open("geode", os.Getenv("GEODE_DSN"))
    if err != nil {
        log.Fatal(err)
    }
    configurePool(db)
}

// Bad: Creating new *sql.DB per request
func badHandler(w http.ResponseWriter, r *http.Request) {
    db, _ := sql.Open("geode", "localhost:3141") // Don't do this!
    defer db.Close()
    // ...
}
```

### Row Iteration

```go
// Good: Always close rows and check errors
rows, err := db.QueryContext(ctx, query)
if err != nil {
    return err
}
defer rows.Close()

for rows.Next() {
    // ...
}

// Check for iteration errors
if err := rows.Err(); err != nil {
    return err
}
```

### Context Usage

```go
// Good: Always use Context methods
rows, err := db.QueryContext(ctx, query)
result, err := db.ExecContext(ctx, query)
stmt, err := db.PrepareContext(ctx, query)
tx, err := db.BeginTx(ctx, opts)

// Avoid: Non-context methods
rows, err := db.Query(query)    // No timeout/cancellation
result, err := db.Exec(query)   // No timeout/cancellation
```

## Integration Examples

### HTTP Handler

```go
func getPerson(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
        defer cancel()

        id := r.URL.Query().Get("id")

        row := db.QueryRowContext(ctx, `
            MATCH (p:Person {id: ?})
            RETURN p.name, p.age
        `, id)

        var name string
        var age int
        if err := row.Scan(&name, &age); err != nil {
            if err == sql.ErrNoRows {
                http.Error(w, "Not found", http.StatusNotFound)
                return
            }
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        json.NewEncoder(w).Encode(map[string]interface{}{
            "name": name,
            "age":  age,
        })
    }
}
```

### Health Check

```go
func healthCheck(db *sql.DB) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        ctx, cancel := context.WithTimeout(r.Context(), 1*time.Second)
        defer cancel()

        if err := db.PingContext(ctx); err != nil {
            w.WriteHeader(http.StatusServiceUnavailable)
            json.NewEncoder(w).Encode(map[string]string{
                "status": "unhealthy",
                "error":  err.Error(),
            })
            return
        }

        stats := db.Stats()
        json.NewEncoder(w).Encode(map[string]interface{}{
            "status":      "healthy",
            "connections": stats.OpenConnections,
            "in_use":      stats.InUse,
            "idle":        stats.Idle,
        })
    }
}
```

## Related Topics

- [Go Client](/tags/go-client/)
- [Client Libraries](/tags/client-libraries/)
- [Connection Pooling](/tags/connection-pooling/)
- [Transactions](/tags/transactions/)
- [Prepared Statements](/tags/prepared-statements/)
- [Protocol](/tags/protocol/)
- [Tutorials](/tags/tutorials/)

## Further Reading

- [Go database/sql Documentation](https://pkg.go.dev/database/sql)
- [Go database/sql Tutorial](https://go.dev/doc/tutorial/database-access)
- [SQL Drivers Wiki](https://github.com/golang/go/wiki/SQLDrivers)
- [Go Client Repository](https://gitlab.com/devnw/codepros/geode/geode-client-go)
- [Geode Documentation](/docs/)
