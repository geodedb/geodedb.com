---
title: "Go Client"
description: "Geode Go client implementing database/sql interface with connection pooling, prepared statements, transaction support, and context-aware operations for Go applications."
keywords:
  - Go
  - Golang
  - database/sql
  - Go client
  - Go SDK
  - database driver
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/go/"
    noindex: false
---

# Go Client

The Geode Go client implements the standard `database/sql` interface, providing seamless integration with Go applications and the broader Go database ecosystem. It offers connection pooling, prepared statements, transaction support, and context-aware operations for production deployments.

## Installation

```bash
go get go.codepros.org/geode
```

Requirements: Go 1.24.0+

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
    db, err := sql.Open("geode", "geode://localhost:3141/graph")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Configure connection pool
    db.SetMaxOpenConns(100)
    db.SetMaxIdleConns(10)

    rows, err := db.Query(`
        MATCH (p:Person)-[:KNOWS]->(friend:Person)
        WHERE p.name = $name
        RETURN friend.name, friend.age
    `, "Alice")
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
}
```

## Key Features

### database/sql Interface

Drop-in replacement for SQL databases:

```go
// Works with any code expecting database/sql
func QueryUsers(db *sql.DB) ([]User, error) {
    rows, err := db.Query("MATCH (u:User) RETURN u.id, u.name")
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
```

### Connection Pooling

Automatic connection lifecycle management:

```go
db.SetMaxOpenConns(100)        // Maximum concurrent connections
db.SetMaxIdleConns(10)         // Idle connections in pool
db.SetConnMaxLifetime(time.Hour) // Connection lifetime
db.SetConnMaxIdleTime(30 * time.Minute) // Idle time before close
```

### Prepared Statements

Query compilation and caching:

```go
stmt, err := db.Prepare(`
    MATCH (p:Person {id: $id})
    RETURN p.name, p.age
`)
defer stmt.Close()

for id := 1; id <= 1000; id++ {
    var name string
    var age int
    err := stmt.QueryRow(id).Scan(&name, &age)
    if err == sql.ErrNoRows {
        continue
    }
    // Process result
}
```

### Context Support

Timeout and cancellation with context:

```go
import "context"

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

rows, err := db.QueryContext(ctx, "MATCH (n:Node) RETURN n")
```

### Transaction Support

Full ACID transactions:

```go
tx, err := db.Begin()
if err != nil {
    return err
}
defer tx.Rollback() // Safe to call even after commit

_, err = tx.Exec("CREATE (n:Node {id: $id})", 1)
if err != nil {
    return err
}

_, err = tx.Exec("CREATE (m:Node {id: $id})", 2)
if err != nil {
    return err
}

return tx.Commit()
```

### Error Handling

Language-appropriate error types:

```go
import "go.codepros.org/geode/errors"

if err != nil {
    if errors.IsSyntaxError(err) {
        log.Printf("Query syntax error: %v", err)
    } else if errors.IsConstraintViolation(err) {
        log.Printf("Constraint violation: %v", err)
    } else {
        log.Printf("Unexpected error: %v", err)
    }
}
```

## Production Patterns

### Service Integration

```go
type UserService struct {
    db *sql.DB
}

func NewUserService(dsn string) (*UserService, error) {
    db, err := sql.Open("geode", dsn)
    if err != nil {
        return nil, err
    }

    db.SetMaxOpenConns(100)
    db.SetMaxIdleConns(10)

    return &UserService{db: db}, nil
}

func (s *UserService) GetUser(ctx context.Context, id int) (*User, error) {
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

func (s *UserService) Close() error {
    return s.db.Close()
}
```

### Testing

```go
func TestUserService(t *testing.T) {
    db, err := sql.Open("geode", os.Getenv("GEODE_TEST_URL"))
    require.NoError(t, err)
    defer db.Close()

    // Clean up test data
    _, err = db.Exec("MATCH (n:TestNode) DELETE n")
    require.NoError(t, err)

    // Test
    _, err = db.Exec("CREATE (n:TestNode {id: $id})", 1)
    require.NoError(t, err)

    var count int
    err = db.QueryRow("MATCH (n:TestNode) RETURN COUNT(n)").Scan(&count)
    require.NoError(t, err)
    assert.Equal(t, 1, count)
}
```

## Performance: 5,000+ queries/second

## Related Topics

- [Client Libraries](/tags/client-libraries/)
- [SDK](/tags/sdk/)
- [API Development](/tags/api/)

## Documentation

Full guide: [Go Client Documentation](/docs/clients/go/)
