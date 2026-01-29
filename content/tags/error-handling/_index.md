---
title: "Error Handling Patterns"
description: "Master error handling in Geode with GQL error codes, client library exceptions, retry strategies, transaction error recovery, and debugging techniques. Build robust graph database applications."
keywords:
  - error handling
  - error codes
  - exceptions
  - GQL errors
  - troubleshooting
  - retry logic
  - transaction errors
  - debugging
  - ISO status codes
  - Geode
  - GQL
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/error-handling/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Error Handling in Geode

Robust error handling is essential for building reliable applications with Geode. This guide covers the GQL error system, client library exception handling, retry strategies, and best practices for graceful error recovery.

Geode implements ISO/IEC 39075:2024 compliant error codes, providing standardized error classification across all client libraries. Understanding these errors enables you to build applications that handle failures gracefully and provide meaningful feedback to users.

## GQL Error Code System

Geode uses a hierarchical error code system based on the ISO/IEC 39075:2024 standard.

### Error Code Structure

Error codes follow the format: `GQLXX-YYZZZ`

- `GQL` - Prefix indicating GQL standard error
- `XX` - Error category (00-99)
- `YY` - Error subcategory
- `ZZZ` - Specific error code

### Common Error Categories

| Category | Code Range | Description |
|----------|------------|-------------|
| Syntax | GQL00-* | Query parsing and syntax errors |
| Semantic | GQL01-* | Query semantic validation errors |
| Constraint | GQL02-* | Schema and constraint violations |
| Transaction | GQL03-* | Transaction-related errors |
| Security | GQL04-* | Authentication and authorization errors |
| Resource | GQL05-* | Resource limits and availability |
| Data | GQL06-* | Data type and format errors |
| Internal | GQL07-* | Internal server errors |

## Error Response Format

```json
{
  "error": {
    "code": "GQL02-00001",
    "message": "Constraint violation: unique constraint on User(email) violated",
    "details": {
      "constraint": "user_email_unique",
      "label": "User",
      "property": "email",
      "value": "alice@example.com"
    },
    "position": {
      "line": 3,
      "column": 1
    }
  }
}
```

## Common Error Types

### Syntax Errors

Occur when a query cannot be parsed.

```gql
-- Error: GQL00-00001 - Unexpected token
MTCH (n:User) RETURN n;
-- 'MTCH' is not a valid keyword

-- Error: GQL00-00010 - Missing clause
MATCH (n:User);
-- Missing RETURN clause

-- Error: GQL00-00020 - Invalid pattern
MATCH (a)-[r]-(b) RETURN r;
-- Undirected relationships must specify type or use --
```

### Semantic Errors

Occur when a query is syntactically valid but semantically incorrect.

```gql
-- Error: GQL01-00001 - Undefined variable
MATCH (n:User)
RETURN m.name;
-- Variable 'm' is not defined

-- Error: GQL01-00010 - Type mismatch
MATCH (n:User)
WHERE n.age = 'thirty';
-- Cannot compare integer to string

-- Error: GQL01-00020 - Invalid aggregation
MATCH (n:User)
RETURN n.name, COUNT(n);
-- Non-aggregated column 'n.name' without GROUP BY
```

### Constraint Violations

Occur when data modifications violate schema constraints.

```gql
-- Error: GQL02-00001 - Unique constraint violation
CREATE (u:User {email: 'existing@example.com'});
-- Email already exists

-- Error: GQL02-00010 - NOT NULL violation
CREATE (u:User {email: null});
-- email cannot be null

-- Error: GQL02-00020 - Check constraint violation
CREATE (u:User {age: -5});
-- age must be non-negative
```

### Transaction Errors

Occur during transaction processing.

```gql
-- Error: GQL03-00001 - Serialization failure
-- Concurrent transaction modified the same data
MATCH (account:Account {id: 'acc_001'})
SET account.balance = account.balance - 100;

-- Error: GQL03-00010 - Deadlock detected
-- Two transactions waiting on each other

-- Error: GQL03-00020 - Transaction timeout
-- Transaction exceeded maximum duration
```

### Security Errors

Occur during authentication or authorization checks.

```gql
-- Error: GQL04-00001 - Authentication failed
-- Invalid credentials

-- Error: GQL04-00010 - Authorization denied
MATCH (n:ConfidentialData)
RETURN n;
-- User does not have access to ConfidentialData

-- Error: GQL04-00020 - Session expired
-- Authentication token has expired
```

### Resource Errors

Occur when system resources are exhausted.

```gql
-- Error: GQL05-00001 - Connection limit exceeded
-- Maximum connections reached

-- Error: GQL05-00010 - Memory limit exceeded
-- Query requires too much memory

-- Error: GQL05-00020 - Query timeout
-- Query exceeded maximum execution time
```

## Client Library Error Handling

### Python Client

```python
from geode_client import Client
from geode_client.exceptions import (
    GeodeError,
    SyntaxError,
    SemanticError,
    ConstraintViolation,
    TransactionError,
    SerializationError,
    AuthenticationError,
    AuthorizationError,
    ConnectionError,
    TimeoutError,
)

async def handle_errors():
    client = Client(host="localhost", port=3141)

    try:
        async with client.connection() as conn:
            result, _ = await conn.query("""
                MATCH (u:User {id: $id})
                RETURN u.name, u.email
            """, {'id': 'user_001'})

            for row in result.rows:
                print(row)

    except SyntaxError as e:
        print(f"Query syntax error at line {e.line}, column {e.column}")
        print(f"Message: {e.message}")

    except SemanticError as e:
        print(f"Semantic error: {e.message}")
        print(f"Error code: {e.code}")

    except ConstraintViolation as e:
        print(f"Constraint violation: {e.constraint_name}")
        print(f"Details: {e.details}")

    except SerializationError as e:
        print("Transaction conflict - retry recommended")
        # Implement retry logic

    except TransactionError as e:
        print(f"Transaction failed: {e.message}")
        # Transaction has been rolled back

    except AuthenticationError as e:
        print("Authentication failed - check credentials")

    except AuthorizationError as e:
        print(f"Access denied: {e.message}")

    except ConnectionError as e:
        print(f"Connection failed: {e.message}")
        # Consider retry with backoff

    except TimeoutError as e:
        print(f"Operation timed out after {e.timeout_ms}ms")

    except GeodeError as e:
        # Catch-all for other Geode errors
        print(f"Geode error [{e.code}]: {e.message}")


async def error_recovery_pattern():
    """Demonstrate error recovery with retry logic."""
    client = Client(host="localhost", port=3141)

    max_retries = 3
    base_delay = 0.1  # 100ms

    for attempt in range(max_retries):
        try:
            async with client.connection() as conn:
                await conn.begin()
                try:
                    await conn.execute("""
                        MATCH (account:Account {id: $id})
                        SET account.balance = account.balance - $amount
                    """, {'id': 'acc_001', 'amount': 100})

                    await conn.commit()
                    return True  # Success

                except Exception:
                    await conn.rollback()
                    raise

        except SerializationError:
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)  # Exponential backoff
                await asyncio.sleep(delay)
                continue
            raise

        except (ConnectionError, TimeoutError):
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                await asyncio.sleep(delay)
                continue
            raise

    return False
```

### Go Client

```go
package main

import (
    "context"
    "database/sql"
    "errors"
    "log"
    "time"

    "geodedb.com/geode"
    geode_errors "geodedb.com/geode/errors"
)

func handleErrors(ctx context.Context, db *sql.DB) {
    _, err := db.ExecContext(ctx, `
        MATCH (u:User {id: $1})
        SET u.name = $2
    `, "user_001", "Alice")

    if err == nil {
        return
    }

    // Check specific error types
    var geodeErr *geode_errors.GeodeError
    if errors.As(err, &geodeErr) {
        switch geodeErr.Category() {
        case geode_errors.CategorySyntax:
            log.Printf("Syntax error at line %d: %s", geodeErr.Line(), geodeErr.Message())

        case geode_errors.CategorySemantic:
            log.Printf("Semantic error: %s", geodeErr.Message())

        case geode_errors.CategoryConstraint:
            log.Printf("Constraint violation: %s", geodeErr.Details()["constraint"])

        case geode_errors.CategoryTransaction:
            if geodeErr.Code() == "GQL03-00001" {
                log.Println("Serialization conflict - retry recommended")
            } else {
                log.Printf("Transaction error: %s", geodeErr.Message())
            }

        case geode_errors.CategorySecurity:
            log.Printf("Security error: %s", geodeErr.Message())

        case geode_errors.CategoryResource:
            log.Printf("Resource error: %s", geodeErr.Message())

        default:
            log.Printf("Geode error [%s]: %s", geodeErr.Code(), geodeErr.Message())
        }
        return
    }

    // Check for connection errors
    if errors.Is(err, sql.ErrConnDone) {
        log.Println("Connection closed")
        return
    }

    // Unknown error
    log.Printf("Unexpected error: %v", err)
}

func executeWithRetry(ctx context.Context, db *sql.DB, query string, args ...interface{}) error {
    maxRetries := 3
    baseDelay := 100 * time.Millisecond

    for attempt := 0; attempt < maxRetries; attempt++ {
        _, err := db.ExecContext(ctx, query, args...)
        if err == nil {
            return nil
        }

        var geodeErr *geode_errors.GeodeError
        if errors.As(err, &geodeErr) {
            // Retry on serialization conflicts
            if geodeErr.Code() == "GQL03-00001" {
                if attempt < maxRetries-1 {
                    delay := baseDelay * time.Duration(1<<attempt)
                    time.Sleep(delay)
                    continue
                }
            }

            // Retry on transient errors
            if geodeErr.IsTransient() {
                if attempt < maxRetries-1 {
                    delay := baseDelay * time.Duration(1<<attempt)
                    time.Sleep(delay)
                    continue
                }
            }
        }

        return err
    }

    return errors.New("max retries exceeded")
}

func transactionWithErrorHandling(ctx context.Context, db *sql.DB) error {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }

    // Ensure rollback on panic
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
            panic(r)
        }
    }()

    // Execute operations
    _, err = tx.ExecContext(ctx, `
        MATCH (account:Account {id: $1})
        WHERE account.balance >= $2
        SET account.balance = account.balance - $2
    `, "acc_001", 100)

    if err != nil {
        tx.Rollback()
        return fmt.Errorf("debit failed: %w", err)
    }

    _, err = tx.ExecContext(ctx, `
        MATCH (account:Account {id: $1})
        SET account.balance = account.balance + $2
    `, "acc_002", 100)

    if err != nil {
        tx.Rollback()
        return fmt.Errorf("credit failed: %w", err)
    }

    // Commit
    if err = tx.Commit(); err != nil {
        return fmt.Errorf("commit failed: %w", err)
    }

    return nil
}
```

### Rust Client

```rust
use geode_client::{Client, Value, Error, ErrorKind};
use std::time::Duration;
use tokio::time::sleep;

async fn handle_errors(client: &Client) -> Result<(), Box<dyn std::error::Error>> {
    let result = client.query(
        "MATCH (u:User {id: $id}) RETURN u.name",
        &[("id", Value::String("user_001".into()))],
    ).await;

    match result {
        Ok(rows) => {
            for row in rows.rows() {
                println!("Name: {:?}", row.get::<String>("u.name")?);
            }
        }
        Err(Error { kind, code, message, details, .. }) => {
            match kind {
                ErrorKind::Syntax => {
                    eprintln!("Syntax error: {}", message);
                    if let Some(line) = details.get("line") {
                        eprintln!("At line: {}", line);
                    }
                }
                ErrorKind::Semantic => {
                    eprintln!("Semantic error [{}]: {}", code, message);
                }
                ErrorKind::Constraint => {
                    eprintln!("Constraint violation: {}", message);
                    if let Some(constraint) = details.get("constraint") {
                        eprintln!("Constraint: {}", constraint);
                    }
                }
                ErrorKind::Transaction => {
                    if code == "GQL03-00001" {
                        eprintln!("Serialization conflict - consider retry");
                    } else {
                        eprintln!("Transaction error: {}", message);
                    }
                }
                ErrorKind::Security => {
                    eprintln!("Security error: {}", message);
                }
                ErrorKind::Resource => {
                    eprintln!("Resource error: {}", message);
                }
                ErrorKind::Connection => {
                    eprintln!("Connection error: {}", message);
                }
                ErrorKind::Timeout => {
                    eprintln!("Operation timed out");
                }
                _ => {
                    eprintln!("Error [{}]: {}", code, message);
                }
            }
        }
    }

    Ok(())
}

async fn execute_with_retry<F, T>(
    mut operation: F,
    max_retries: u32,
) -> Result<T, Error>
where
    F: FnMut() -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<T, Error>> + Send>>,
{
    let base_delay = Duration::from_millis(100);

    for attempt in 0..max_retries {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(e) => {
                let should_retry = matches!(
                    e.kind,
                    ErrorKind::Transaction | ErrorKind::Connection | ErrorKind::Timeout
                ) && e.is_transient();

                if should_retry && attempt < max_retries - 1 {
                    let delay = base_delay * 2u32.pow(attempt);
                    sleep(delay).await;
                    continue;
                }

                return Err(e);
            }
        }
    }

    unreachable!()
}

// Transaction with error handling
async fn transfer_funds(
    client: &Client,
    from_account: &str,
    to_account: &str,
    amount: f64,
) -> Result<(), Error> {
    let mut tx = client.begin_transaction().await?;

    // Debit source account
    let result = tx.execute(
        r#"
        MATCH (account:Account {id: $id})
        WHERE account.balance >= $amount
        SET account.balance = account.balance - $amount
        RETURN account.balance AS new_balance
        "#,
        &[
            ("id", Value::String(from_account.into())),
            ("amount", Value::Float(amount)),
        ],
    ).await;

    match result {
        Ok(rows) if rows.is_empty() => {
            tx.rollback().await?;
            return Err(Error::new(
                ErrorKind::Constraint,
                "GQL02-00100",
                "Insufficient funds or account not found",
            ));
        }
        Err(e) => {
            tx.rollback().await?;
            return Err(e);
        }
        Ok(_) => {}
    }

    // Credit destination account
    if let Err(e) = tx.execute(
        r#"
        MATCH (account:Account {id: $id})
        SET account.balance = account.balance + $amount
        "#,
        &[
            ("id", Value::String(to_account.into())),
            ("amount", Value::Float(amount)),
        ],
    ).await {
        tx.rollback().await?;
        return Err(e);
    }

    // Commit
    tx.commit().await?;

    Ok(())
}
```

## Retry Strategies

### Exponential Backoff

```python
import asyncio
import random

async def retry_with_exponential_backoff(
    operation,
    max_retries=5,
    base_delay=0.1,
    max_delay=30.0,
    jitter=True
):
    """
    Retry an operation with exponential backoff.

    Args:
        operation: Async function to retry
        max_retries: Maximum number of attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay cap
        jitter: Add randomness to prevent thundering herd
    """
    last_exception = None

    for attempt in range(max_retries):
        try:
            return await operation()

        except SerializationError as e:
            last_exception = e
            # Always retry serialization conflicts

        except (ConnectionError, TimeoutError) as e:
            last_exception = e
            # Retry transient errors

        except GeodeError as e:
            if not e.is_transient:
                raise  # Don't retry non-transient errors
            last_exception = e

        if attempt < max_retries - 1:
            delay = min(base_delay * (2 ** attempt), max_delay)
            if jitter:
                delay = delay * (0.5 + random.random())
            await asyncio.sleep(delay)

    raise last_exception
```

### Circuit Breaker Pattern

```python
import time
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered

class CircuitBreaker:
    def __init__(
        self,
        failure_threshold=5,
        recovery_timeout=30,
        half_open_max_calls=3
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        self.half_open_calls = 0

    async def execute(self, operation):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0
            else:
                raise CircuitBreakerOpen("Circuit breaker is open")

        if self.state == CircuitState.HALF_OPEN:
            if self.half_open_calls >= self.half_open_max_calls:
                raise CircuitBreakerOpen("Circuit breaker half-open limit reached")
            self.half_open_calls += 1

        try:
            result = await operation()
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
        self.failure_count = 0

    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN


# Usage
circuit_breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=30)

async def query_with_circuit_breaker(client, query, params):
    async def operation():
        return await client.query(query, params)

    return await circuit_breaker.execute(operation)
```

## Error Logging and Monitoring

### Structured Error Logging

```python
import logging
import json

class GeodeErrorLogger:
    def __init__(self, logger_name="geode"):
        self.logger = logging.getLogger(logger_name)

    def log_error(self, error, context=None):
        """Log error with structured data."""
        log_data = {
            "error_code": error.code,
            "error_category": error.category,
            "message": error.message,
            "details": error.details,
        }

        if context:
            log_data["context"] = context

        if hasattr(error, 'query'):
            log_data["query"] = error.query[:500]  # Truncate long queries

        if error.is_transient:
            self.logger.warning(
                "Transient Geode error",
                extra={"geode_error": log_data}
            )
        else:
            self.logger.error(
                "Geode error",
                extra={"geode_error": log_data}
            )


# Usage
error_logger = GeodeErrorLogger()

try:
    result = await client.query(query, params)
except GeodeError as e:
    error_logger.log_error(e, context={
        "operation": "user_lookup",
        "user_id": user_id
    })
    raise
```

### Metrics Collection

```python
from prometheus_client import Counter, Histogram

# Error counters
geode_errors = Counter(
    'geode_errors_total',
    'Total Geode errors',
    ['error_category', 'error_code']
)

geode_retries = Counter(
    'geode_retries_total',
    'Total retry attempts',
    ['operation', 'outcome']
)

query_duration = Histogram(
    'geode_query_duration_seconds',
    'Query execution time',
    ['operation'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0]
)

async def monitored_query(client, query, params, operation_name="query"):
    """Execute query with metrics collection."""
    start = time.time()

    try:
        result = await client.query(query, params)
        query_duration.labels(operation=operation_name).observe(time.time() - start)
        return result

    except GeodeError as e:
        geode_errors.labels(
            error_category=e.category,
            error_code=e.code
        ).inc()
        raise
```

## Debugging Techniques

### Query Analysis

```gql
-- Use EXPLAIN to understand query execution
EXPLAIN
MATCH (u:User {email: $email})-[:PURCHASED]->(p:Product)
RETURN p.name, p.price;

-- Use PROFILE for actual execution statistics
PROFILE
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.created_at > datetime() - DURATION 'P30D'
RETURN u.name, COUNT(p) AS purchase_count;
```

### Connection Diagnostics

```python
async def diagnose_connection(client):
    """Run connection diagnostics."""
    diagnostics = {}

    # Test basic connectivity
    try:
        await client.ping()
        diagnostics["connectivity"] = "OK"
    except Exception as e:
        diagnostics["connectivity"] = f"FAILED: {e}"

    # Test authentication
    try:
        result, _ = await client.query("RETURN 1 AS test")
        diagnostics["authentication"] = "OK"
    except AuthenticationError as e:
        diagnostics["authentication"] = f"FAILED: {e}"

    # Test query execution
    try:
        result, _ = await client.query("MATCH (n) RETURN COUNT(n) LIMIT 1")
        diagnostics["query_execution"] = "OK"
    except Exception as e:
        diagnostics["query_execution"] = f"FAILED: {e}"

    return diagnostics
```

## Best Practices

### Error Handling Principles

1. **Catch specific exceptions**: Handle different error types appropriately
2. **Implement retry logic**: Retry transient errors with backoff
3. **Fail fast on permanent errors**: Don't retry non-transient failures
4. **Log contextual information**: Include query, parameters, timing
5. **Monitor error rates**: Track errors for alerting and analysis

### Transaction Error Recovery

1. **Always use try/finally for rollback**: Ensure cleanup on failure
2. **Implement savepoints**: Enable partial rollback for complex transactions
3. **Handle serialization conflicts**: Retry with exponential backoff
4. **Set appropriate timeouts**: Prevent resource exhaustion

### User-Facing Error Messages

```python
def get_user_friendly_message(error):
    """Convert technical errors to user-friendly messages."""
    messages = {
        "GQL02-00001": "This record already exists. Please try a different value.",
        "GQL02-00010": "Required information is missing. Please fill in all required fields.",
        "GQL03-00001": "Your request conflicted with another. Please try again.",
        "GQL04-00001": "Login failed. Please check your credentials.",
        "GQL04-00010": "You don't have permission to perform this action.",
        "GQL05-00020": "The operation took too long. Please try a simpler request.",
    }

    return messages.get(error.code, "An unexpected error occurred. Please try again later.")
```

## Related Topics

- [Troubleshooting](/tags/troubleshooting/) - Debugging guide
- [Client Libraries](/tags/client-libraries/) - Client documentation
- [Transactions](/tags/transactions/) - Transaction management
- [Logging](/tags/logging/) - Logging configuration
- [Monitoring](/tags/monitoring/) - Metrics and alerting
- [Security](/tags/security/) - Authentication and authorization

## Further Reading

- ISO/IEC 39075:2024 Error Code Specification
- Geode Error Reference Documentation
- Resilient Application Design Patterns
- Distributed Systems Error Handling
- Observability and Error Tracking Best Practices

Browse tagged content for complete error handling documentation and examples.
