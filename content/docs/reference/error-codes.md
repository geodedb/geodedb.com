---
title: "Error Codes Reference"
description: "Complete reference for Geode error codes, GQLSTATUS codes, and troubleshooting guidance following ISO/IEC SQL standards"
keywords: ["error codes", "GQLSTATUS", "status codes", "error handling", "troubleshooting", "ISO SQL", "debugging", "error messages"]
weight: 50
slug: "error-codes"
canonical: "https://geodedb.com/docs/reference/error-codes/"
---

Geode follows ISO/IEC SQL error code standards for consistent error reporting across all client libraries and interfaces. This reference provides complete documentation of all error codes, their meanings, and resolution strategies.

## Error Code Format

Geode uses two types of error codes:

1. **GQLSTATUS Codes**: 5-character SQL-standard status codes (e.g., `00000`, `42000`)
2. **Internal Error Codes**: Descriptive error names (e.g., `ERR_OOM`, `ERR_FLOAT_NAN`)

### Error Response Structure

All error responses follow this JSON format:

```json
{
  "status_class": "42000",
  "status": "42001",
  "message": "Undefined table: NonExistentTable",
  "details": {
    "table_name": "NonExistentTable",
    "suggestion": "Check table name spelling or create the table first"
  }
}
```

## GQLSTATUS Codes

### Success Codes

| Code | Class | Description | Action Required |
|------|-------|-------------|-----------------|
| `00000` | Success | Query executed successfully | None |
| `01000` | Warning | Warning (with successful completion) | Review warning message |
| `02000` | No Data | Query returned no rows | None (expected in some cases) |

**Example**:
```gql
-- Returns 00000 on success
CREATE (p:Person {name: 'Alice'});

-- Returns 02000 if no matches
MATCH (p:Person {name: 'NonExistent'}) RETURN p;
```

### Client Errors (Class 0A)

| Code | Description | Common Causes | Resolution |
|------|-------------|---------------|------------|
| `0A000` | Feature not supported | Unsupported GQL feature or operation | Check GQL compliance documentation |
| `0A001` | Transaction already active | BEGIN called while transaction active | COMMIT or ROLLBACK current transaction first |
| `0A002` | No active transaction | COMMIT/ROLLBACK without BEGIN | Start transaction with BEGIN before committing |

**Examples**:
```gql
-- 0A001: Transaction already active
BEGIN TRANSACTION;
BEGIN TRANSACTION;  -- ERROR

-- 0A002: No active transaction
COMMIT;  -- ERROR (no transaction started)

-- Correct usage
BEGIN TRANSACTION;
CREATE (p:Person {name: 'Bob'});
COMMIT;
```

### Data Exception (Class 22)

| Code | Description | Common Causes | Resolution |
|------|-------------|---------------|------------|
| `22000` | Data exception | General data error | See specific code |
| `22001` | String data, right truncation | String exceeds maximum length | Reduce string length or increase limit |
| `22002` | Null value, no indicator | NULL in non-nullable context | Provide non-null value |
| `22003` | Numeric value out of range | Number too large/small for type | Use appropriate numeric type |
| `22004` | Null value not allowed | NULL where NOT NULL constraint exists | Provide non-null value |
| `22005` | Error in assignment | Type mismatch in assignment | Check type compatibility |
| `22007` | Invalid datetime format | Malformed date/time string | Use ISO 8601 format |
| `22008` | Datetime field overflow | Date/time value out of valid range | Check date/time bounds |
| `22012` | Division by zero | Arithmetic division by zero | Add zero check before division |
| `22015` | Interval field overflow | Interval exceeds maximum | Use smaller interval |
| `22018` | Invalid character value | Invalid encoding or character | Check string encoding (UTF-8) |
| `22019` | Invalid escape character | Bad escape sequence in string | Use valid escape sequences |
| `22021` | Character not in repertoire | Character not supported in encoding | Use supported UTF-8 characters |
| `22023` | Invalid parameter value | Function parameter invalid | Check parameter constraints |
| `22025` | Invalid escape sequence | Bad regex or LIKE escape | Fix escape sequence |
| `22027` | Trim error | Invalid TRIM specification | Check TRIM syntax |

**Examples**:
```gql
-- 22001: String truncation
CREATE (p:Person {name: Char('VeryLongNameThatExceedsLimit', 10)});
-- ERROR: String 'VeryLongNameThatExceedsLimit' exceeds Char(10) limit

-- 22003: Numeric out of range
RETURN SmallInt(100000);  -- ERROR: Value exceeds i16 range

-- 22007: Invalid datetime
RETURN Date('invalid-date');  -- ERROR

-- 22012: Division by zero
RETURN 10 / 0;  -- ERROR

-- Correct usage
RETURN 10 / CASE WHEN $divisor = 0 THEN 1 ELSE $divisor END;
```

### Integrity Constraint Violation (Class 23)

| Code | Description | Common Causes | Resolution |
|------|-------------|---------------|------------|
| `23000` | Integrity constraint violation | General constraint violation | See specific code |
| `23001` | Restrict violation | Foreign key constraint prevents delete | Delete dependent records first |
| `23502` | Not null violation | NULL value in NOT NULL column | Provide non-null value |
| `23503` | Foreign key violation | Referenced record doesn't exist | Create referenced record first |
| `23505` | Unique violation | Duplicate value in unique index | Use unique value |
| `23514` | Check constraint violation | Value fails CHECK constraint | Provide valid value |

**Examples**:
```gql
-- 23502: Not null violation
CREATE (p:Person {age: null});  -- ERROR if age has NOT NULL constraint

-- 23505: Unique violation
CREATE (p1:Person {email: '[email protected]'});
CREATE (p2:Person {email: '[email protected]'});  -- ERROR if email is UNIQUE

-- 23503: Foreign key violation
CREATE (o:Order {customer_id: 999});  -- ERROR if customer 999 doesn't exist
```

### Syntax Error or Access Violation (Class 42)

| Code | Description | Common Causes | Resolution |
|------|-------------|---------------|------------|
| `42000` | Syntax error or access rule violation | General syntax error | Check GQL syntax |
| `42001` | Undefined object | Table, column, or function not found | Verify object names |
| `42002` | Duplicate object | Object already exists | Use IF NOT EXISTS or drop first |
| `42601` | Syntax error | Malformed GQL query | Fix query syntax |
| `42602` | Invalid name | Reserved keyword or invalid identifier | Use quotes for identifiers |
| `42611` | Invalid column definition | Bad column specification | Check column syntax |
| `42701` | Duplicate column | Column specified multiple times | Remove duplicate |
| `42703` | Undefined column | Column doesn't exist | Check column name |
| `42704` | Undefined object | Referenced object not found | Create object or fix reference |
| `42710` | Duplicate object | Object name collision | Use unique name |
| `42712` | Duplicate alias | Alias used multiple times | Use unique aliases |
| `42723` | Duplicate function | Function already defined | Drop function or use different name |
| `42883` | Undefined function | Function not found | Check function name and arguments |
| `42939` | Reserved name | Using reserved keyword | Quote identifier or use different name |
| `42P01` | Undefined table | Table doesn't exist | Create table first |
| `42P02` | Undefined parameter | Parameter not provided | Supply parameter value |
| `42P07` | Duplicate table | Table already exists | Use IF NOT EXISTS or different name |

**Examples**:
```gql
-- 42001: Undefined object
MATCH (n:NonExistentLabel) RETURN n;
-- ERROR: Label 'NonExistentLabel' not found

-- 42002: Duplicate object
CREATE INDEX person_email ON Person(email);
CREATE INDEX person_email ON Person(email);  -- ERROR

-- 42601: Syntax error
MATCH (n) RETURN n WHERE n.age > 30;  -- ERROR: WHERE after RETURN

-- 42P01: Undefined table
MATCH (n:Person) WHERE n.age > 30 RETURN n;
-- ERROR if Person label doesn't exist

-- Correct: Use IF NOT EXISTS
CREATE INDEX IF NOT EXISTS person_email ON Person(email);
```

### Insufficient Resources (Class 53)

| Code | Description | Common Causes | Resolution |
|------|-------------|---------------|------------|
| `53000` | Insufficient resources | General resource issue | Increase resources or optimize query |
| `53100` | Disk full | Out of disk space | Free disk space |
| `53200` | Out of memory | Insufficient RAM | Increase memory or reduce query complexity |
| `53300` | Too many connections | Connection pool exhausted | Close unused connections or increase pool size |
| `53400` | Configuration limit exceeded | Limit setting reached | Adjust configuration limits |

**Examples**:
```gql
-- 53200: Out of memory
MATCH (n)-[r*]-(m)  -- ERROR: Unbounded path may exhaust memory
RETURN n, m;

-- Correct: Limit path length
MATCH (n)-[r*1..5]-(m)
WHERE n.id = 123
RETURN n, m
LIMIT 100;
```

### System Error (Class 58)

| Code | Description | Common Causes | Resolution |
|------|-------------|---------------|------------|
| `58000` | System error | General I/O error | Check system logs |
| `58030` | I/O error | Disk read/write failure | Check disk health |
| `58P01` | Undefined file | File not found | Verify file path |
| `58P02` | Duplicate file | File already exists | Delete file or use different path |

### Internal Error (Class XX)

| Code | Description | Common Causes | Resolution |
|------|-------------|---------------|------------|
| `XX000` | Internal error | Database bug | Report to developers with reproduction steps |
| `XX001` | Data corrupted | Storage corruption | Restore from backup |
| `XX002` | Index corrupted | Index integrity violation | Rebuild index |

## Internal Error Codes

### Memory Errors

| Error Code | Description | Context | Resolution |
|------------|-------------|---------|------------|
| `ERR_OOM` | Out of memory | Memory allocation failed | Reduce query complexity or increase system memory |
| `ERR_ALLOCATION_FAILED` | Memory allocation error | Allocator returned error | Check system resources |

**Example**:
```gql
-- ERR_OOM: Large aggregation without limits
MATCH (n)-[r*]-(m)
RETURN collect(n) AS all_nodes;  -- May cause OOM

-- Solution: Add limits
MATCH (n)-[r*1..3]-(m)
WHERE n.id = 123
RETURN collect(n) AS nearby_nodes
LIMIT 1000;
```

### Type Errors

| Error Code | Description | Context | Resolution |
|------------|-------------|---------|------------|
| `ERR_FLOAT_NAN` | Invalid float (NaN or Inf) | Float arithmetic produced NaN/Inf | Check for division by zero or invalid operations |
| `ERR_CHAR_LEN` | String exceeds length limit | String longer than declared Char(n) | Reduce string length or use Varchar/Text |
| `ERR_DEC_DIV_ZERO` | Decimal division by zero | Division by zero in Decimal arithmetic | Add zero check |
| `ERR_IP_PARSE` | Invalid IP address | Malformed IP address string | Use valid IPv4/IPv6 format |
| `ERR_JSON_PARSE` | Invalid JSON | Malformed JSON string | Fix JSON syntax |
| `ERR_RANGE_BOUNDS` | Invalid range bounds | Range start > end or invalid inclusive/exclusive | Fix range bounds |

**Examples**:
```gql
-- ERR_FLOAT_NAN
RETURN sqrt(-1);  -- ERROR: NaN not allowed

-- ERR_CHAR_LEN
CREATE (p:Person {code: Char('TOOLONG', 5)});  -- ERROR

-- ERR_IP_PARSE
RETURN IpAddr('999.999.999.999');  -- ERROR

-- ERR_JSON_PARSE
RETURN Json('{invalid json}');  -- ERROR

-- Correct usage
RETURN IpAddr('192.168.1.1');
RETURN Json('{"valid": "json"}');
```

### Index Errors

| Error Code | Description | Context | Resolution |
|------------|-------------|---------|------------|
| `ERR_INDEX_CORRUPTION` | Index structure corrupted | Index integrity check failed | Rebuild index |
| `ERR_INDEX_FULL` | Index size limit exceeded | Index too large | Partition data or increase limits |

### Network Errors

| Error Code | Description | Context | Resolution |
|------------|-------------|---------|------------|
| `ERR_CONNECTION_FAILED` | Connection failure | Cannot connect to server | Check network and server status |
| `ERR_TIMEOUT` | Operation timeout | Query or connection timed out | Increase timeout or optimize query |
| `ERR_PROTOCOL_ERROR` | Protocol violation | Invalid message format | Update client library |

### Transaction Errors

| Error Code | Description | Context | Resolution |
|------------|-------------|---------|------------|
| `ERR_TRANSACTION_CONFLICT` | Transaction conflict | Concurrent modification conflict | Retry transaction |
| `ERR_DEADLOCK` | Deadlock detected | Circular lock dependency | Retry transaction |
| `ERR_SERIALIZATION_FAILURE` | Serialization failure | SSI conflict in SERIALIZABLE isolation | Retry transaction |

**Example**:
```gql
-- ERR_TRANSACTION_CONFLICT
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE SNAPSHOT;
-- ... operations ...
COMMIT;  -- May fail with conflict, retry needed

-- Retry logic (pseudocode)
max_retries = 3
for attempt in range(max_retries):
    try:
        execute_transaction()
        break
    except ERR_TRANSACTION_CONFLICT:
        if attempt == max_retries - 1:
            raise
        sleep(exponential_backoff(attempt))
```

## Error Handling Best Practices

### Check for Common Errors

```python
# Python client example
from geode_client import GeodeClient, GeodeError

async with GeodeClient("localhost", 3141) as client:
    try:
        result = await client.query("MATCH (p:Person) RETURN p")
    except GeodeError as e:
        if e.status_class == "42P01":
            print("Table doesn't exist - creating it")
            await client.query("CREATE (:Person {name: 'Alice'})")
        elif e.status_class == "53200":
            print("Out of memory - reducing query complexity")
            result = await client.query("MATCH (p:Person) RETURN p LIMIT 100")
        else:
            raise
```

### Retry Transient Errors

```go
// Go client example
import "go.codepros.org/geode"

func executeWithRetry(db *sql.DB, query string, maxRetries int) error {
    for i := 0; i < maxRetries; i++ {
        _, err := db.Exec(query)
        if err == nil {
            return nil
        }

        // Check if error is retryable
        if isRetryable(err) {
            time.Sleep(time.Duration(i*100) * time.Millisecond)
            continue
        }

        return err
    }
    return fmt.Errorf("max retries exceeded")
}

func isRetryable(err error) bool {
    // Transaction conflicts, deadlocks, timeouts
    statusCode := extractStatusCode(err)
    return statusCode == "ERR_TRANSACTION_CONFLICT" ||
           statusCode == "ERR_DEADLOCK" ||
           statusCode == "ERR_TIMEOUT"
}
```

### Validate Input Data

```rust
// Rust client example
use geode_client::{Client, Result};

async fn create_person(client: &Client, name: &str, age: i32) -> Result<()> {
    // Validate before sending to database
    if name.is_empty() {
        return Err(Error::ValidationError("Name cannot be empty"));
    }

    if age < 0 || age > 150 {
        return Err(Error::ValidationError("Age must be 0-150"));
    }

    let query = format!("CREATE (p:Person {{name: '{}', age: {}}})", name, age);
    client.execute(&query).await?;

    Ok(())
}
```

### Log Errors for Debugging

```gql
-- Enable detailed error logging
-- Set in server configuration
logging:
  level: 'debug'
  include_stack_traces: true
  error_details: true
```

## Common Error Scenarios

### Scenario 1: Undefined Label

**Error**: `42001 - Undefined object: Label 'Person' not found`

**Cause**: Querying non-existent label

**Solution**:
```gql
-- Check if label exists
SHOW LABELS;

-- Create label by inserting node
CREATE (:Person {name: 'Alice'});

-- Then retry query
MATCH (p:Person) RETURN p;
```

### Scenario 2: Unique Constraint Violation

**Error**: `23505 - Unique violation: email '[email protected]' already exists`

**Cause**: Duplicate value in unique index

**Solution**:
```gql
-- Option 1: Use different value
CREATE (p:Person {email: '[email protected]'});

-- Option 2: Update existing record
MATCH (p:Person {email: '[email protected]'})
SET p.updated_at = timestamp();

-- Option 3: Use MERGE to update or insert
MERGE (p:Person {email: '[email protected]'})
ON CREATE SET p.created_at = timestamp()
ON MATCH SET p.updated_at = timestamp();
```

### Scenario 3: Transaction Conflict

**Error**: `ERR_TRANSACTION_CONFLICT - Concurrent modification detected`

**Cause**: Two transactions modifying same data

**Solution**:
```python
# Implement retry with exponential backoff
import time

def execute_with_retry(query, max_retries=3):
    for attempt in range(max_retries):
        try:
            client.execute("BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE SNAPSHOT")
            client.execute(query)
            client.execute("COMMIT")
            return
        except TransactionConflict:
            if attempt == max_retries - 1:
                raise
            time.sleep(0.1 * (2 ** attempt))  # Exponential backoff
```

### Scenario 4: Query Timeout

**Error**: `ERR_TIMEOUT - Query exceeded timeout (30000ms)`

**Cause**: Query too complex or slow

**Solution**:
```gql
-- Original (slow)
MATCH (n)-[r*]-(m)
RETURN n, m;

-- Optimized
MATCH (n)-[r*1..3]-(m)
WHERE n.id = 123
RETURN n, m
LIMIT 100;

-- Or increase timeout
-- Client configuration:
-- timeout_ms: 60000
```

## Related Documentation

- **[Troubleshooting Guide](/docs/guides/troubleshooting/)** - Common issues and solutions
- **[Query Performance Tuning](/docs/query/performance-tuning/)** - Optimize queries to avoid errors
- **[Advanced Transaction Patterns](/docs/transactions/advanced-patterns/)** - Handle transaction errors
- **[API Reference](/docs/api-reference/)** - Complete function and error documentation

## Summary

Geode provides comprehensive error reporting with:

- **GQLSTATUS Codes**: ISO/IEC SQL-standard 5-character codes for interoperability
- **Internal Error Codes**: Descriptive error names for specific conditions
- **Detailed Messages**: Clear explanations and resolution guidance
- **Structured Errors**: JSON format with context and suggestions

Use error codes to:
1. **Identify issues** - Understand what went wrong
2. **Handle gracefully** - Implement retry logic for transient errors
3. **Validate input** - Prevent errors before they occur
4. **Debug efficiently** - Use error context to locate root causes

Always check error codes and implement appropriate error handling in production applications.
