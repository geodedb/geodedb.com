---
title: "Go Client"
description: "Production-ready Geode Go client implementing database/sql interface with connection pooling, prepared statements, context-aware operations, transaction support, and high-throughput performance for Go applications."
keywords:
  - Go
  - Golang
  - database/sql
  - Go client
  - Go SDK
  - database driver
  - Go database
  - connection pooling
  - prepared statements
  - context support
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/go/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Go Client

The Geode Go client implements the standard `database/sql` interface, providing seamless integration with Go applications and the broader Go database ecosystem. It offers connection pooling, prepared statements, transaction support, and context-aware operations for production deployments.

## Overview

The Go client is designed to feel natural for Go developers while providing access to Geode's powerful graph capabilities:

- **database/sql Compatibility**: Drop-in replacement for SQL databases with familiar `*sql.DB` interface
- **Ecosystem Integration**: Works with any Go library or framework expecting `database/sql`
- **Connection Pooling**: Automatic connection lifecycle management with configurable pool parameters
- **Context Integration**: First-class context.Context support for timeouts, deadlines, and cancellation
- **Type Safety**: Strong typing with Go's type system
- **Production Ready**: Supports standard `database/sql` workflows with QUIC transport

## Installation

```bash
go get go.codepros.org/geode
```

### Requirements

- **Go Version**: 1.24.0 or later
- **Operating System**: Linux, macOS, Windows
- **Architecture**: amd64, arm64

## Quick Start

### Basic Connection and Query

```go
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "go.codepros.org/geode"
)

func main() {
    // Open connection using database/sql
    db, err := sql.Open("geode", "geode://localhost:3141/graph")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Configure connection pool
    db.SetMaxOpenConns(100)
    db.SetMaxIdleConns(10)
    db.SetConnMaxLifetime(time.Hour)

    // Execute query with parameters
    rows, err := db.Query(`
        MATCH (p:Person)-[:KNOWS]->(friend:Person)
        WHERE p.name = $name
        RETURN friend.name, friend.age
    `, "Alice")
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
        fmt.Printf("%s is %d years old\n", name, age)
    }

    // Check for errors after iteration
    if err := rows.Err(); err != nil {
        log.Fatal(err)
    }
}
```

### Connection String Format

```
geode://[user[:password]@]host[:port][/graph][?param1=value1&...]
```

**Examples**:
```go
// Basic connection
"geode://localhost:3141/graph"

// With authentication
"geode://admin:password@localhost:3141/graph"

// With TLS and connection parameters
"geode://localhost:3141/graph?tls=true&pool_size=50&timeout=30s"
```

## Key Features

### database/sql Interface

Drop-in replacement for SQL databases with full `database/sql` compatibility:

```go
// Works with any code expecting *sql.DB
func QueryUsers(db *sql.DB) ([]User, error) {
    rows, err := db.Query(`
        MATCH (u:User)
        WHERE u.active = true
        RETURN u.id, u.name, u.email
        ORDER BY u.name
    `)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Name, &u.Email); err != nil {
            return nil, err
        }
        users = append(users, u)
    }

    return users, rows.Err()
}

// Single-row queries
func GetUser(db *sql.DB, id int64) (*User, error) {
    var u User
    err := db.QueryRow(`
        MATCH (u:User {id: $id})
        RETURN u.id, u.name, u.email
    `, id).Scan(&u.ID, &u.Name, &u.Email)

    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    return &u, nil
}

// Exec for write operations
func CreateUser(db *sql.DB, name, email string) (int64, error) {
    result, err := db.Exec(`
        CREATE (u:User {
            name: $name,
            email: $email,
            createdAt: datetime()
        })
    `, name, email)
    if err != nil {
        return 0, err
    }

    return result.LastInsertId()
}
```

### Connection Pooling

Automatic connection lifecycle management with fine-grained control:

```go
import (
    "database/sql"
    "time"
)

func ConfigurePool(db *sql.DB) {
    // Maximum number of open connections
    db.SetMaxOpenConns(100)

    // Maximum number of idle connections in pool
    db.SetMaxIdleConns(10)

    // Maximum lifetime of a connection
    db.SetConnMaxLifetime(time.Hour)

    // Maximum time a connection can be idle
    db.SetConnMaxIdleTime(30 * time.Minute)
}

// Monitor pool stats
func MonitorPool(db *sql.DB) {
    stats := db.Stats()
    log.Printf("Pool Stats: Open=%d InUse=%d Idle=%d",
        stats.OpenConnections,
        stats.InUse,
        stats.Idle)
}
```

### Prepared Statements

Query compilation and caching for improved performance (2-3x faster for repeated queries):

```go
func BatchLookup(db *sql.DB, ids []int64) ([]User, error) {
    // Prepare statement once
    stmt, err := db.Prepare(`
        MATCH (u:User {id: $id})
        RETURN u.id, u.name, u.email
    `)
    if err != nil {
        return nil, err
    }
    defer stmt.Close()

    var users []User
    for _, id := range ids {
        var u User
        err := stmt.QueryRow(id).Scan(&u.ID, &u.Name, &u.Email)
        if err == sql.ErrNoRows {
            continue
        }
        if err != nil {
            return nil, err
        }
        users = append(users, u)
    }

    return users, nil
}

// Named prepared statements for complex queries
func PrepareQueries(db *sql.DB) (*Queries, error) {
    getUserStmt, err := db.Prepare(`
        MATCH (u:User {id: $id}) RETURN u.id, u.name, u.email
    `)
    if err != nil {
        return nil, err
    }

    getFriendsStmt, err := db.Prepare(`
        MATCH (u:User {id: $id})-[:KNOWS]->(friend:User)
        RETURN friend.id, friend.name
    `)
    if err != nil {
        getUserStmt.Close()
        return nil, err
    }

    return &Queries{
        GetUser:     getUserStmt,
        GetFriends:  getFriendsStmt,
    }, nil
}
```

### Context Support

Full context.Context integration for timeouts, deadlines, and cancellation:

```go
import (
    "context"
    "database/sql"
    "time"
)

func QueryWithTimeout(db *sql.DB, timeout time.Duration) ([]User, error) {
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel()

    rows, err := db.QueryContext(ctx, `
        MATCH (u:User)-[:KNOWS*1..3]->(friend:User)
        RETURN DISTINCT friend.id, friend.name
    `)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Name); err != nil {
            return nil, err
        }
        users = append(users, u)
    }

    return users, rows.Err()
}

// Cancellable operations
func CancellableQuery(ctx context.Context, db *sql.DB) error {
    rows, err := db.QueryContext(ctx, "MATCH (n) RETURN n")
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        // Check for cancellation
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
        }

        // Process row...
    }

    return rows.Err()
}

// Request-scoped queries (web handlers)
func HandleUserRequest(w http.ResponseWriter, r *http.Request) {
    // Use request context for automatic cancellation
    ctx := r.Context()

    var u User
    err := db.QueryRowContext(ctx,
        "MATCH (u:User {id: $id}) RETURN u.id, u.name",
        getUserID(r),
    ).Scan(&u.ID, &u.Name)

    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(u)
}
```

### Transaction Support

Full ACID transactions with savepoints and isolation levels:

```go
func TransferFriendship(db *sql.DB, fromID, toID, newFriendID int64) error {
    tx, err := db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback() // Safe to call even after commit

    // Remove existing friendship
    _, err = tx.Exec(`
        MATCH (from:User {id: $from})-[r:KNOWS]->(to:User {id: $to})
        DELETE r
    `, fromID, toID)
    if err != nil {
        return err
    }

    // Create new friendship
    _, err = tx.Exec(`
        MATCH (from:User {id: $from}), (new:User {id: $new})
        CREATE (from)-[:KNOWS {createdAt: datetime()}]->(new)
    `, fromID, newFriendID)
    if err != nil {
        return err
    }

    return tx.Commit()
}

// Context-aware transactions
func TransactionWithContext(ctx context.Context, db *sql.DB) error {
    tx, err := db.BeginTx(ctx, &sql.TxOptions{
        Isolation: sql.LevelSerializable,
        ReadOnly:  false,
    })
    if err != nil {
        return err
    }
    defer tx.Rollback()

    _, err = tx.ExecContext(ctx, "CREATE (n:Node {id: $id})", 1)
    if err != nil {
        return err
    }

    return tx.Commit()
}

// Savepoint support (via driver-specific features)
func ComplexTransaction(db *sql.DB) error {
    tx, err := db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Create user
    _, err = tx.Exec("CREATE (u:User {name: $name})", "Alice")
    if err != nil {
        return err
    }

    // Savepoint before risky operation
    _, err = tx.Exec("SAVEPOINT before_relationship")
    if err != nil {
        return err
    }

    // Try to create relationship
    _, err = tx.Exec("MATCH (u:User {name: $name}) CREATE (u)-[:KNOWS]->(u)", "Alice")
    if err != nil {
        // Rollback to savepoint
        _, _ = tx.Exec("ROLLBACK TO SAVEPOINT before_relationship")
        log.Println("Self-relationship failed, continuing without it")
    }

    return tx.Commit()
}
```

### Error Handling

Language-appropriate error types with ISO error code mapping:

```go
import (
    "database/sql"
    "errors"
    "go.codepros.org/geode/geodeerr"
)

func HandleQueryError(err error) {
    if err == nil {
        return
    }

    // Standard database/sql errors
    if errors.Is(err, sql.ErrNoRows) {
        log.Println("No results found")
        return
    }
    if errors.Is(err, sql.ErrConnDone) {
        log.Println("Connection closed")
        return
    }

    // Geode-specific errors
    var geodeErr *geodeerr.Error
    if errors.As(err, &geodeErr) {
        switch geodeErr.Code {
        case geodeerr.SyntaxError:
            log.Printf("Query syntax error: %s", geodeErr.Message)
        case geodeerr.ConstraintViolation:
            log.Printf("Constraint violation: %s", geodeErr.Message)
        case geodeerr.ConnectionFailed:
            log.Printf("Connection failed: %s", geodeErr.Message)
        case geodeerr.AuthenticationFailed:
            log.Printf("Authentication failed: %s", geodeErr.Message)
        default:
            log.Printf("Geode error %s: %s", geodeErr.Code, geodeErr.Message)
        }
        return
    }

    log.Printf("Unexpected error: %v", err)
}

// Retryable error detection
func IsRetryable(err error) bool {
    var geodeErr *geodeerr.Error
    if errors.As(err, &geodeErr) {
        switch geodeErr.Code {
        case geodeerr.NetworkError,
             geodeerr.TimeoutExceeded,
             geodeerr.ConnectionFailed:
            return true
        }
    }
    return false
}
```

## Production Patterns

### Service Layer

```go
type UserService struct {
    db *sql.DB
}

func NewUserService(dsn string) (*UserService, error) {
    db, err := sql.Open("geode", dsn)
    if err != nil {
        return nil, err
    }

    // Configure pool
    db.SetMaxOpenConns(100)
    db.SetMaxIdleConns(10)
    db.SetConnMaxLifetime(time.Hour)

    // Test connection
    if err := db.Ping(); err != nil {
        return nil, err
    }

    return &UserService{db: db}, nil
}

func (s *UserService) GetUser(ctx context.Context, id int64) (*User, error) {
    var u User
    err := s.db.QueryRowContext(ctx,
        "MATCH (u:User {id: $id}) RETURN u.id, u.name, u.email",
        id,
    ).Scan(&u.ID, &u.Name, &u.Email)

    if err == sql.ErrNoRows {
        return nil, nil
    }
    return &u, err
}

func (s *UserService) CreateUser(ctx context.Context, name, email string) (*User, error) {
    var u User
    err := s.db.QueryRowContext(ctx, `
        CREATE (u:User {
            name: $name,
            email: $email,
            createdAt: datetime()
        })
        RETURN u.id, u.name, u.email
    `, name, email).Scan(&u.ID, &u.Name, &u.Email)

    return &u, err
}

func (s *UserService) GetFriends(ctx context.Context, userID int64) ([]User, error) {
    rows, err := s.db.QueryContext(ctx, `
        MATCH (u:User {id: $id})-[:KNOWS]->(friend:User)
        RETURN friend.id, friend.name, friend.email
        ORDER BY friend.name
    `, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var friends []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Name, &u.Email); err != nil {
            return nil, err
        }
        friends = append(friends, u)
    }

    return friends, rows.Err()
}

func (s *UserService) Close() error {
    return s.db.Close()
}
```

### HTTP Handler Integration

```go
import (
    "encoding/json"
    "net/http"
    "strconv"
)

type Handler struct {
    service *UserService
}

func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
    idStr := r.URL.Query().Get("id")
    id, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        http.Error(w, "Invalid ID", http.StatusBadRequest)
        return
    }

    user, err := h.service.GetUser(r.Context(), id)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    if user == nil {
        http.Error(w, "User not found", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Name  string `json:"name"`
        Email string `json:"email"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    user, err := h.service.CreateUser(r.Context(), req.Name, req.Email)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(user)
}
```

### Testing

```go
import (
    "database/sql"
    "os"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestUserService(t *testing.T) {
    db, err := sql.Open("geode", os.Getenv("GEODE_TEST_URL"))
    require.NoError(t, err)
    defer db.Close()

    // Clean up test data
    _, err = db.Exec("MATCH (n:TestNode) DELETE n")
    require.NoError(t, err)

    t.Run("CreateUser", func(t *testing.T) {
        result, err := db.Exec(`
            CREATE (u:TestNode {name: $name, email: $email})
        `, "Alice", "alice@example.com")
        require.NoError(t, err)

        rowsAffected, err := result.RowsAffected()
        require.NoError(t, err)
        assert.Equal(t, int64(1), rowsAffected)
    })

    t.Run("QueryUser", func(t *testing.T) {
        var name, email string
        err := db.QueryRow(`
            MATCH (u:TestNode {name: $name})
            RETURN u.name, u.email
        `, "Alice").Scan(&name, &email)
        require.NoError(t, err)
        assert.Equal(t, "Alice", name)
        assert.Equal(t, "alice@example.com", email)
    })

    t.Run("Transaction", func(t *testing.T) {
        tx, err := db.Begin()
        require.NoError(t, err)
        defer tx.Rollback()

        _, err = tx.Exec("CREATE (n:TestNode {id: $id})", 100)
        require.NoError(t, err)

        var count int
        err = tx.QueryRow("MATCH (n:TestNode {id: $id}) RETURN COUNT(n)", 100).Scan(&count)
        require.NoError(t, err)
        assert.Equal(t, 1, count)

        require.NoError(t, tx.Commit())
    })
}
```

## Performance and Throughput

Performance is workload-dependent and influenced by network conditions, server limits, and query patterns. The Go client minimizes overhead and integrates with `database/sql` for predictable behavior.

- **Connection pooling**: Reduces connection setup overhead for higher throughput
- **Prepared statements**: Reuse query plans for repeated operations
- **Transactions**: Batch related operations to amortize latency
- **Server baselines**: Read-only up to 100,000 txn/sec; read-write 10,000-50,000 txn/sec; write-heavy 5,000-20,000 txn/sec

## Related Topics

- [Client Libraries](/tags/client-libraries/) - All client libraries
- [SDK](/tags/sdk/) - Software Development Kits
- [API Development](/tags/api/) - API integration
- [Testing](/tags/testing/) - Testing strategies

## Documentation

Full guide: [Go Client Documentation](/docs/clients/go/)
