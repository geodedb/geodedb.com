---
title: "ISO GQL Status Codes Reference"
description: "Complete reference for ISO GQL status codes and error handling in Geode, including error categories, handling strategies, and troubleshooting guide"
keywords: ["status codes", "error handling", "ISO GQL", "GQLSTATUS", "error codes", "troubleshooting"]
weight: 50
slug: "status-codes"
canonical: "https://geodedb.com/docs/reference/status-codes"
---

# ISO GQL Status Codes Reference

Geode implements the complete ISO/IEC 39075:2024 GQL status code system (GQLSTATUS) for standardized error reporting and handling across all client libraries and protocols.

## Status Code Format

### GQLSTATUS Structure

All GQL status codes follow the five-character format defined by the ISO standard:

\`\`\`
GQLXX
\`\`\`

Where:
- **GQL** = Fixed prefix identifying GQL status codes
- **XX** = Two-character code indicating category and specific condition

### Status Code Categories

\`\`\`
00 - Success
01 - Warning
02 - No Data
21 - Cardinality Violation
22 - Data Exception
23 - Integrity Constraint Violation
24 - Invalid Transaction State
25 - Invalid Transaction Termination
27 - Transaction Rollback
28 - Invalid Authorization Specification
2E - Invalid Connection
42 - Syntax Error or Access Rule Violation
\`\`\`

## Success Codes

### GQL00 - Successful Completion

**Code**: \`GQL00\`
**Category**: Success
**Meaning**: Query or operation completed successfully with no errors or warnings

**Example**:
\`\`\`gql
MATCH (p:Person {id: 1}) RETURN p.name
\`\`\`

**Response**:
\`\`\`json
{
  "status": "GQL00",
  "message": "Successful completion",
  "rows": [{"name": "Alice"}]
}
\`\`\`

**Handling**: No action required, proceed with result processing.

## Warning Codes

### GQL01 - Warning

**Code**: \`GQL01\`
**Subcodes**: Multiple warning conditions

**Common Warnings**:

#### GQL01001 - Cursor Operation Conflict
**Meaning**: Cursor operation conflict with concurrent modification

**Example Scenario**:
\`\`\`gql
-- Transaction 1
START TRANSACTION
DECLARE cursor1 CURSOR FOR MATCH (p:Person) RETURN p
OPEN cursor1

-- Transaction 2 modifies data
CREATE (p:Person {name: 'NewPerson'})

-- Transaction 1 continues
FETCH NEXT FROM cursor1  -- Warning: GQL01001
\`\`\`

**Handling**:
- Re-execute query if data consistency is critical
- Accept warning if cursor data can be stale
- Consider higher isolation level for transaction

#### GQL01002 - Disconnect Error
**Meaning**: Disconnect error occurred but operation completed

**Handling**:
- Verify operation completion
- Re-establish connection for subsequent operations
- Check connection pool health

## No Data Codes

### GQL02 - No Data

**Code**: \`GQL02\`
**Meaning**: Query executed successfully but returned no rows

**Example**:
\`\`\`gql
MATCH (p:Person {email: 'nonexistent@example.com'}) RETURN p
\`\`\`

**Response**:
\`\`\`json
{
  "status": "GQL02",
  "message": "No data found",
  "rows": []
}
\`\`\`

**Handling**:
- Not an error condition
- Check query predicates if data was expected
- Differentiate from GQL00 (success with data)

### GQL02001 - No Additional Data

**Meaning**: No additional result sets available

**Example Scenario**:
\`\`\`gql
-- After consuming all result pages
FETCH NEXT FROM cursor1  -- GQL02001
\`\`\`

**Handling**:
- Normal end-of-results indicator
- Close cursor or complete pagination

## Data Exception Codes

### GQL22 - Data Exception

**Category**: Data validation and type errors

#### GQL22001 - String Data Right Truncation
**Meaning**: String value truncated to fit field length

**Example**:
\`\`\`gql
CREATE (p:Person {name: 'VeryLongNameThatExceedsLimit...'})
-- If name field has max length of 50 characters
\`\`\`

**Handling**:
- Validate input length before insertion
- Increase field size if legitimate use case
- Truncate data explicitly in application

#### GQL22003 - Numeric Value Out of Range
**Meaning**: Numeric value exceeds data type bounds

**Example**:
\`\`\`gql
CREATE (p:Product {quantity: 9999999999999999})
-- If quantity is INT32
\`\`\`

**Handling**:
\`\`\`go
// Go example
if quantity > math.MaxInt32 {
    return fmt.Errorf("quantity exceeds maximum: %d", math.MaxInt32)
}
\`\`\`

#### GQL22007 - Invalid Datetime Format
**Meaning**: Datetime string doesn't match expected format

**Example**:
\`\`\`gql
CREATE (e:Event {timestamp: '2024-13-45T25:99:99'})  -- Invalid
\`\`\`

**Valid Formats**:
\`\`\`gql
-- ISO 8601 formats
'2024-01-15'                    -- Date
'14:30:00'                      -- Time
'2024-01-15T14:30:00'          -- DateTime
'2024-01-15T14:30:00Z'         -- DateTime with UTC
'2024-01-15T14:30:00-05:00'    -- DateTime with timezone
\`\`\`

**Handling**:
- Validate datetime strings before insertion
- Use ISO 8601 format consistently
- Consider using datetime functions

#### GQL22008 - Datetime Field Overflow
**Meaning**: Datetime calculation resulted in overflow

**Example**:
\`\`\`gql
RETURN datetime('2024-01-01') + duration('P99999Y')
\`\`\`

**Handling**:
- Validate duration values before arithmetic
- Check result bounds after calculations

#### GQL22012 - Division by Zero
**Meaning**: Attempted division or modulo by zero

**Example**:
\`\`\`gql
MATCH (p:Product)
RETURN p.price, p.price / p.quantity AS unit_price
-- If quantity = 0
\`\`\`

**Handling**:
\`\`\`gql
-- Add guard clause
MATCH (p:Product)
WHERE p.quantity > 0
RETURN p.price, p.price / p.quantity AS unit_price
\`\`\`

\`\`\`python
# Python example
unit_price = price / quantity if quantity != 0 else None
\`\`\`

#### GQL22018 - Invalid Character Value for Cast
**Meaning**: String cannot be cast to target type

**Example**:
\`\`\`gql
RETURN toInteger('not_a_number')  -- GQL22018
\`\`\`

**Handling**:
\`\`\`gql
-- Validate before casting
RETURN CASE
    WHEN value =~ '^[0-9]+$' THEN toInteger(value)
    ELSE NULL
END
\`\`\`

#### GQL22023 - Invalid Parameter Value
**Meaning**: Parameter value invalid for operation

**Example**:
\`\`\`gql
MATCH (p:Person)
WHERE p.age > $age  -- $age = 'twenty' (string instead of number)
RETURN p
\`\`\`

**Handling**:
- Type-check parameters before query execution
- Use strongly-typed parameter binding
- Validate input at application boundary

## Integrity Constraint Violations

### GQL23 - Integrity Constraint Violation

#### GQL23000 - Integrity Constraint Violation (General)
**Meaning**: Unspecified integrity constraint violated

**Example**:
\`\`\`gql
CREATE (p:Person {id: 1, email: 'alice@example.com'})
CREATE (p:Person {id: 1, email: 'bob@example.com'})
-- If id has UNIQUE constraint
\`\`\`

**Handling**:
- Check constraint definitions
- Validate data before insertion
- Handle duplicate key scenarios

#### GQL23001 - Restrict Violation
**Meaning**: Foreign key constraint prevents deletion

**Example**:
\`\`\`gql
-- Person has relationships to Orders
DELETE (p:Person {id: 1})
-- GQL23001 if ON DELETE RESTRICT is enforced
\`\`\`

**Handling**:
\`\`\`gql
-- Use DETACH DELETE to remove relationships
DETACH DELETE (p:Person {id: 1})

-- Or delete relationships first
MATCH (p:Person {id: 1})-[r]-()
DELETE r, p
\`\`\`

#### GQL23505 - Unique Violation
**Meaning**: Unique constraint violated

**Example**:
\`\`\`gql
CREATE (u:User {email: 'alice@example.com'})
CREATE (u:User {email: 'alice@example.com'})  -- GQL23505
\`\`\`

**Handling**:
\`\`\`gql
-- Use MERGE for upsert semantics
MERGE (u:User {email: 'alice@example.com'})
ON CREATE SET u.created = datetime()
ON MATCH SET u.accessed = datetime()
\`\`\`

\`\`\`python
# Python error handling
from geode_client.exceptions import ConstraintViolationError

try:
    await conn.execute(
        "CREATE (u:User {email: $email})",
        {"email": email}
    )
except ConstraintViolationError as e:
    if e.status_code == "GQL23505":
        # Handle duplicate email
        logger.warning(f"Email already exists: {email}")
\`\`\`

#### GQL23514 - Check Constraint Violation
**Meaning**: CHECK constraint condition not satisfied

**Example**:
\`\`\`gql
-- Assuming CHECK constraint: age >= 0 AND age <= 150
CREATE (p:Person {name: 'Alice', age: 200})  -- GQL23514
\`\`\`

**Handling**:
- Validate data against constraint rules before insertion
- Review constraint definitions for reasonableness
- Provide clear error messages to users

## Transaction State Errors

### GQL24 - Invalid Transaction State

#### GQL24000 - Invalid Transaction State (General)
**Meaning**: Operation not valid in current transaction state

**Example**:
\`\`\`gql
COMMIT  -- No active transaction
\`\`\`

**Handling**:
- Track transaction state in application
- Always pair BEGIN with COMMIT/ROLLBACK
- Use transaction context managers

\`\`\`python
# Python - Safe transaction handling
async with db.transaction() as tx:
    await tx.execute("CREATE (p:Person {name: 'Alice'})")
    # Automatic commit on success, rollback on exception
\`\`\`

#### GQL25000 - Invalid Transaction Termination
**Meaning**: Cannot commit or rollback in current state

**Example**:
\`\`\`gql
START TRANSACTION
-- Connection lost
COMMIT  -- GQL25000
\`\`\`

**Handling**:
- Implement connection retry logic
- Re-establish transaction after connection recovery
- Use savepoints for partial rollback

### GQL27 - Transaction Rollback

#### GQL27000 - Transaction Rollback (General)
**Meaning**: Transaction rolled back due to error or deadlock

**Example**:
\`\`\`gql
START TRANSACTION
CREATE (p:Person {id: 1})
-- Deadlock detected with concurrent transaction
-- GQL27000 - Transaction rolled back
\`\`\`

**Handling**:
\`\`\`python
# Python - Retry on deadlock
max_retries = 3
for attempt in range(max_retries):
    try:
        async with db.transaction() as tx:
            await tx.execute(query, params)
        break  # Success
    except TransactionRollbackError as e:
        if "deadlock" in str(e).lower() and attempt < max_retries - 1:
            await asyncio.sleep(0.1 * (2 ** attempt))  # Exponential backoff
        else:
            raise
\`\`\`

## Syntax and Access Errors

### GQL42 - Syntax Error or Access Rule Violation

#### GQL42000 - Syntax Error or Access Violation (General)
**Meaning**: Query syntax error or insufficient privileges

**Example**:
\`\`\`gql
MATCH (p:Person WHERE p.age > 25 RETURN p  -- Missing )
\`\`\`

**Handling**:
- Validate query syntax before execution
- Use query builder libraries to prevent syntax errors
- Check error message for specific syntax issue

#### GQL42501 - Insufficient Privilege
**Meaning**: User lacks required permissions

**Example**:
\`\`\`gql
-- User without CREATE permission
CREATE (p:Person {name: 'Alice'})  -- GQL42501
\`\`\`

**Handling**:
\`\`\`python
from geode_client.exceptions import InsufficientPrivilegeError

try:
    await conn.execute("CREATE (p:Person {name: 'Alice'})")
except InsufficientPrivilegeError as e:
    logger.error(f"Permission denied: {e.message}")
    # Request access or use different credentials
\`\`\`

#### GQL42601 - Invalid Grant Operation
**Meaning**: Cannot grant specified privilege

**Example**:
\`\`\`gql
GRANT CREATE ON GRAPH production TO user1
-- If current user cannot grant this privilege
\`\`\`

#### GQL42704 - Undefined Database Object
**Meaning**: Referenced object does not exist

**Example**:
\`\`\`gql
USE GRAPH nonexistent_graph  -- GQL42704
\`\`\`

**Handling**:
- Verify database object names before use
- Create objects if they don't exist
- Handle missing objects gracefully

## Connection Errors

### GQL2E - Invalid Connection

#### GQL2E000 - Connection Exception (General)
**Meaning**: Connection-level error occurred

**Example Scenarios**:
- Network timeout
- Connection pool exhausted
- Server unreachable

**Handling**:
\`\`\`go
// Go - Connection retry with backoff
func connectWithRetry(url string, maxRetries int) (*gql.DB, error) {
    var db *gql.DB
    var err error

    for i := 0; i < maxRetries; i++ {
        db, err = gql.Open(url)
        if err == nil {
            return db, nil
        }

        if errors.IsConnectionError(err) {
            backoff := time.Duration(100*math.Pow(2, float64(i))) * time.Millisecond
            time.Sleep(backoff)
            continue
        }

        return nil, err  // Non-retryable error
    }

    return nil, fmt.Errorf("failed after %d retries: %w", maxRetries, err)
}
\`\`\`

#### GQL2E001 - Connection Does Not Exist
**Meaning**: Connection closed or never established

**Handling**:
- Check connection status before operations
- Implement connection health checks
- Use connection pooling for reliability

\`\`\`python
# Python - Connection health check
async def ensure_connection(db):
    try:
        async with db.connection() as conn:
            await conn.ping()
    except ConnectionError:
        # Re-establish connection
        await db.reconnect()
\`\`\`

## Error Handling Best Practices

### 1. Categorize Errors by Severity

\`\`\`python
from geode_client.exceptions import GeodeError

def handle_error(e: GeodeError):
    if e.status_code.startswith("GQL00"):
        # Success - no handling needed
        pass
    elif e.status_code.startswith("GQL01"):
        # Warning - log and continue
        logger.warning(f"Warning: {e.message}")
    elif e.status_code.startswith("GQL02"):
        # No data - expected condition
        return []
    elif e.status_code.startswith("GQL22"):
        # Data exception - validation error
        logger.error(f"Invalid data: {e.message}")
        raise ValueError(e.message)
    elif e.status_code.startswith("GQL23"):
        # Constraint violation
        logger.error(f"Constraint violated: {e.message}")
        raise IntegrityError(e.message)
    elif e.status_code.startswith("GQL27"):
        # Transaction rollback - retry
        logger.info(f"Transaction rolled back: {e.message}")
        return "RETRY"
    elif e.status_code.startswith("GQL42"):
        # Syntax or permission error
        logger.error(f"Query error: {e.message}")
        raise SyntaxError(e.message)
    else:
        # Unknown error
        logger.exception(f"Unexpected error: {e.message}")
        raise
\`\`\`

### 2. Implement Retry Logic for Transient Errors

\`\`\`go
// Go - Retry wrapper
func executeWithRetry(ctx context.Context, db *gql.DB, query string, params map[string]interface{}, maxRetries int) (*gql.Page, error) {
    var page *gql.Page
    var err error

    for attempt := 0; attempt < maxRetries; attempt++ {
        conn, err := db.Connect(ctx)
        if err != nil {
            if errors.IsConnectionError(err) && attempt < maxRetries-1 {
                backoff := time.Duration(100 * math.Pow(2, float64(attempt))) * time.Millisecond
                time.Sleep(backoff)
                continue
            }
            return nil, err
        }
        defer conn.Close()

        page, _, err = conn.Query(ctx, query, params, 100)
        if err == nil {
            return page, nil
        }

        if errors.IsTransactionRollback(err) && attempt < maxRetries-1 {
            backoff := time.Duration(50 * math.Pow(2, float64(attempt))) * time.Millisecond
            time.Sleep(backoff)
            continue
        }

        return nil, err
    }

    return nil, fmt.Errorf("failed after %d attempts: %w", maxRetries, err)
}
\`\`\`

### 3. Log Errors with Context

\`\`\`python
import logging
import json

logger = logging.getLogger(__name__)

async def execute_query_with_logging(conn, query, params):
    try:
        result = await conn.query(query, params)
        return result
    except GeodeError as e:
        logger.error(
            "Query execution failed",
            extra={
                "status_code": e.status_code,
                "message": e.message,
                "query": query,
                "params": json.dumps(params),
                "stack_trace": str(e)
            }
        )
        raise
\`\`\`

### 4. Validate Input Before Execution

\`\`\`rust
use geode_client::{Client, Value};

fn validate_person(name: &str, age: i32, email: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Name cannot be empty".to_string());
    }
    if age < 0 || age > 150 {
        return Err(format!("Invalid age: {}", age));
    }
    if !email.contains('@') {
        return Err(format!("Invalid email: {}", email));
    }
    Ok(())
}

async fn create_person(
    client: &Client,
    name: &str,
    age: i32,
    email: &str
) -> Result<(), Box<dyn std::error::Error>> {
    // Validate before execution
    validate_person(name, age, email)?;

    let mut conn = client.connect().await?;
    conn.execute(
        "CREATE (p:Person {name: $name, age: $age, email: $email})",
        vec![
            ("name", Value::from(name)),
            ("age", Value::from(age)),
            ("email", Value::from(email)),
        ]
    ).await?;

    Ok(())
}
\`\`\`

## Status Code Quick Reference

### By Category

| Category | Code Range | Description |
|----------|------------|-------------|
| Success | GQL00 | Successful completion |
| Warning | GQL01 | Warning conditions |
| No Data | GQL02 | No data found |
| Data Exception | GQL22 | Data validation errors |
| Constraint Violation | GQL23 | Integrity constraints |
| Transaction State | GQL24 | Invalid transaction state |
| Transaction Termination | GQL25 | Cannot commit/rollback |
| Rollback | GQL27 | Transaction rolled back |
| Syntax/Access | GQL42 | Syntax or permission errors |
| Connection | GQL2E | Connection errors |

### Common Codes

| Code | Meaning | Action |
|------|---------|--------|
| GQL00 | Success | Continue processing |
| GQL01 | Warning | Log and continue |
| GQL02 | No data | Handle empty result |
| GQL22003 | Numeric overflow | Validate input range |
| GQL22007 | Invalid datetime | Check format |
| GQL22012 | Division by zero | Add guard clause |
| GQL23505 | Unique violation | Use MERGE or handle duplicate |
| GQL27000 | Deadlock | Retry with backoff |
| GQL42000 | Syntax error | Fix query syntax |
| GQL42501 | Insufficient privilege | Check permissions |
| GQL2E000 | Connection error | Retry connection |

## Troubleshooting Guide

### Connection Issues

**Problem**: GQL2E000 - Connection Exception

**Diagnostic Steps**:
1. Verify server is running: \`geode status\`
2. Check network connectivity: \`ping geode-server\`
3. Verify QUIC port (3141) is accessible
4. Check connection pool status
5. Review server logs for errors

**Solutions**:
- Restart Geode server
- Check firewall rules for UDP port 3141
- Increase connection pool size
- Implement connection retry logic

### Query Performance

**Problem**: Slow queries or timeouts

**Diagnostic Steps**:
1. Use EXPLAIN to analyze query plan
2. Check index usage
3. Review query complexity
4. Monitor server resources

**Solutions**:
\`\`\`gql
-- Add appropriate indexes
CREATE INDEX ON :Person(email)

-- Optimize query with LIMIT
MATCH (p:Person)
WHERE p.age > 25
RETURN p.name, p.email
ORDER BY p.name
LIMIT 100  -- Add limit for large result sets

-- Use PROFILE to measure performance
PROFILE MATCH (p:Person)-[:KNOWS]->(f)
RETURN p.name, count(f) AS friend_count
\`\`\`

### Transaction Deadlocks

**Problem**: GQL27000 - Transaction Rollback (Deadlock)

**Prevention**:
- Access resources in consistent order
- Keep transactions short
- Use appropriate isolation levels
- Implement retry logic with exponential backoff

**Example**:
\`\`\`python
async def transfer_with_retry(from_id, to_id, amount, max_retries=3):
    for attempt in range(max_retries):
        try:
            async with db.transaction(isolation_level=IsolationLevel.SERIALIZABLE) as tx:
                # Access accounts in consistent order (by ID)
                if from_id < to_id:
                    from_acct = await tx.query(
                        "MATCH (a:Account {id: $id}) RETURN a",
                        {"id": from_id}
                    )
                    to_acct = await tx.query(
                        "MATCH (a:Account {id: $id}) RETURN a",
                        {"id": to_id}
                    )
                else:
                    to_acct = await tx.query(
                        "MATCH (a:Account {id: $id}) RETURN a",
                        {"id": to_id}
                    )
                    from_acct = await tx.query(
                        "MATCH (a:Account {id: $id}) RETURN a",
                        {"id": from_id}
                    )

                # Perform transfer
                await tx.execute(
                    "MATCH (a:Account {id: $id}) SET a.balance = a.balance - $amount",
                    {"id": from_id, "amount": amount}
                )
                await tx.execute(
                    "MATCH (a:Account {id: $id}) SET a.balance = a.balance + $amount",
                    {"id": to_id, "amount": amount}
                )

            return  # Success
        except TransactionRollbackError as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(0.1 * (2 ** attempt))
            else:
                raise
\`\`\`

### Data Validation Errors

**Problem**: GQL22* - Data Exception

**Prevention**:
- Validate all inputs before database operations
- Use type-safe parameter binding
- Define appropriate constraints
- Implement application-level validation

**Example Validation Framework**:
\`\`\`python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class PersonCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=0, le=150)
    email: EmailStr
    birth_date: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Alice Smith",
                "age": 30,
                "email": "alice@example.com",
                "birth_date": "1994-01-15T00:00:00Z"
            }
        }

async def create_person(person: PersonCreate):
    # Pydantic validation happens automatically
    # Safe to execute query with validated data
    async with db.connection() as conn:
        await conn.execute(
            """
            CREATE (p:Person {
                name: $name,
                age: $age,
                email: $email,
                birth_date: $birth_date
            })
            """,
            person.dict()
        )
\`\`\`

## Client Library Integration

### Go Client

\`\`\`go
import (
    "github.com/codeprosorg/geode-client-go/errors"
)

// Error type checking
if errors.IsConstraintViolation(err) {
    // Handle constraint violation
}
if errors.IsConnectionError(err) {
    // Handle connection error
}

// Status code access
if gqlErr, ok := err.(errors.GQLError); ok {
    statusCode := gqlErr.StatusCode()  // e.g., "GQL23505"
    message := gqlErr.Message()
}
\`\`\`

### Python Client

\`\`\`python
from geode_client.exceptions import (
    GeodeError,
    ConstraintViolationError,
    ConnectionError,
    TransactionRollbackError
)

try:
    await conn.execute(query, params)
except ConstraintViolationError as e:
    print(f"Constraint violation: {e.status_code} - {e.message}")
except TransactionRollbackError as e:
    print(f"Transaction rolled back: {e.status_code}")
except ConnectionError as e:
    print(f"Connection error: {e.status_code}")
except GeodeError as e:
    print(f"Geode error: {e.status_code} - {e.message}")
\`\`\`

### Rust Client

\`\`\`rust
use geode_client::{Error, ErrorKind};

match conn.execute(query, params).await {
    Ok(_) => println!("Success"),
    Err(Error::ConstraintViolation { code, message }) => {
        eprintln!("Constraint violation {}: {}", code, message);
    }
    Err(Error::Connection(msg)) => {
        eprintln!("Connection error: {}", msg);
    }
    Err(Error::TransactionRollback { code }) => {
        eprintln!("Transaction rolled back: {}", code);
    }
    Err(e) => eprintln!("Error: {:?}", e),
}
\`\`\`

## Next Steps

1. **Implement Error Handling** - Add proper error handling to all database operations
2. **Add Retry Logic** - Implement retries for transient errors (deadlocks, connection issues)
3. **Validate Inputs** - Validate all data before database operations
4. **Monitor Errors** - Track error rates and types in production
5. **Review Logs** - Regularly review error logs for patterns
6. **Test Error Scenarios** - Include error cases in test suite

**Related Documentation**:
- [Transaction Patterns](/docs/transactions/advanced-patterns)
- [Client Error Handling](/docs/client-libraries/client-comparison#error-handling-strategies)
- [Troubleshooting Guide](/docs/guides/troubleshooting)
- [GQL Compliance](/docs/gql/conformance-profile)

---

*Last Updated: January 2026*
*Based on: ISO/IEC 39075:2024 GQL Standard*
*Status: Production-ready - 100% GQL compliance*
