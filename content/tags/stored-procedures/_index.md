---
title: "Stored Procedures - Server-Side GQL Programs"
description: "Comprehensive guide to stored procedures in Geode: reusable server-side GQL programs encapsulating complex database logic. Includes parameter handling, transaction management, control flow, error handling, security, versioning, and performance optimization."
keywords:
  - stored procedures
  - database procedures
  - server-side logic
  - GQL procedures
  - functions
  - subroutines
  - callable procedures
  - parameterized queries
  - transaction control
  - procedural logic
  - code reuse
  - business logic
  - database automation
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Stored Procedures

Stored procedures are reusable, server-side programs written in GQL that encapsulate complex database logic within the database engine. They enable code reuse across applications, improve performance by reducing network roundtrips, enhance security through controlled data access, simplify maintenance by centralizing business logic, and provide transactional consistency for multi-step operations.

## Stored Procedure Fundamentals

### What are Stored Procedures?

Stored procedures are named GQL programs that:

**Execute Server-Side** - Run within the database
**Accept Parameters** - Parameterized for reuse
**Return Results** - Tables, scalars, or status codes
**Encapsulate Logic** - Hide complexity from clients

### Benefits

- **Performance** - Reduced network roundtrips
- **Reusability** - Write once, call many times
- **Security** - Control data access
- **Maintainability** - Centralize business logic
- **Consistency** - Ensure uniform data operations

## Creating Stored Procedures

### Basic Syntax

```gql
-- Simple procedure
CREATE PROCEDURE get_user_by_id(user_id STRING)
RETURNS TABLE (
    id STRING,
    name STRING,
    email STRING
)
LANGUAGE GQL
AS $$
BEGIN
    RETURN QUERY
    MATCH (u:User {id: user_id})
    RETURN u.id, u.name, u.email;
END;
$$;

-- Call procedure
CALL get_user_by_id('user123');
```

### Parameters

Support multiple parameter types:

```gql
CREATE PROCEDURE search_users(
    min_age INTEGER,
    max_age INTEGER DEFAULT 100,
    name_pattern STRING DEFAULT '%'
)
RETURNS TABLE (id STRING, name STRING, age INTEGER)
LANGUAGE GQL
AS $$
BEGIN
    RETURN QUERY
    MATCH (u:User)
    WHERE u.age >= min_age
      AND u.age <= max_age
      AND u.name LIKE name_pattern
    RETURN u.id, u.name, u.age
    ORDER BY u.name;
END;
$$;

-- Call with all parameters
CALL search_users(18, 30, 'A%');

-- Call with defaults
CALL search_users(21);
```

## Complex Procedures

### Transaction Management

Control transactions:

```gql
CREATE PROCEDURE transfer_funds(
    from_account STRING,
    to_account STRING,
    amount DECIMAL
)
RETURNS BOOLEAN
LANGUAGE GQL
AS $$
DECLARE
    from_balance DECIMAL;
BEGIN
    -- Start transaction
    BEGIN TRANSACTION;
    
    -- Check balance
    SELECT balance INTO from_balance
    FROM Account
    WHERE id = from_account
    FOR UPDATE;
    
    IF from_balance < amount THEN
        ROLLBACK;
        RETURN FALSE;
    END IF;
    
    -- Debit source
    UPDATE Account
    SET balance = balance - amount
    WHERE id = from_account;
    
    -- Credit destination
    UPDATE Account
    SET balance = balance + amount
    WHERE id = to_account;
    
    COMMIT;
    RETURN TRUE;
END;
$$;
```

### Control Flow

Use conditionals and loops:

```gql
CREATE PROCEDURE calculate_bonus(employee_id STRING)
RETURNS DECIMAL
LANGUAGE GQL
AS $$
DECLARE
    salary DECIMAL;
    years_employed INTEGER;
    bonus DECIMAL;
BEGIN
    -- Get employee data
    SELECT e.salary, e.years_employed
    INTO salary, years_employed
    FROM Employee e
    WHERE e.id = employee_id;
    
    -- Calculate base bonus
    bonus := salary * 0.1;
    
    -- Apply multipliers
    IF years_employed >= 10 THEN
        bonus := bonus * 1.5;
    ELSIF years_employed >= 5 THEN
        bonus := bonus * 1.25;
    END IF;
    
    RETURN bonus;
END;
$$;
```

## Calling Procedures

### From GQL

```gql
-- Simple call
CALL get_user_by_id('user123');

-- With results
SELECT * FROM get_user_by_id('user123');
```

### From Client Libraries

Python:

```python
# Call procedure
result = await client.call_procedure(
    'search_users',
    min_age=18,
    max_age=30
)

for row in result.rows:
    print(row['name'], row['age'])
```

Go:

```go
// Call procedure
rows, err := db.Query("CALL search_users($1, $2)", 18, 30)
if err != nil {
    log.Fatal(err)
}
defer rows.Close()

for rows.Next() {
    var id, name string
    var age int
    rows.Scan(&id, &name, &age)
    fmt.Printf("%s: %d\n", name, age)
}
```

## Advanced Patterns

### Dynamic Query Construction

```gql
CREATE PROCEDURE search_entities(
    entity_type STRING,
    filter_conditions MAP<STRING, ANY>,
    sort_field STRING DEFAULT 'name',
    limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (entity MAP<STRING, ANY>)
LANGUAGE GQL
AS $$
DECLARE
    query STRING;
    where_clause STRING := '';
BEGIN
    -- Build WHERE clause dynamically
    FOR key, value IN filter_conditions LOOP
        IF where_clause <> '' THEN
            where_clause := where_clause || ' AND ';
        END IF;
        where_clause := where_clause || key || ' = $' || key;
    END LOOP;

    -- Construct dynamic query
    query := 'MATCH (n:' || entity_type || ') ';
    IF where_clause <> '' THEN
        query := query || 'WHERE ' || where_clause || ' ';
    END IF;
    query := query || 'RETURN n AS entity ORDER BY n.' || sort_field || ' LIMIT ' || limit_count;

    -- Execute dynamic query
    RETURN QUERY EXECUTE query USING filter_conditions;
END;
$$;
```

### Batch Processing

```gql
CREATE PROCEDURE batch_update_prices(
    price_adjustments MAP<STRING, DECIMAL>
)
RETURNS TABLE (
    product_id STRING,
    old_price DECIMAL,
    new_price DECIMAL
)
LANGUAGE GQL
AS $$
DECLARE
    pid STRING;
    adjustment DECIMAL;
    batch_size INTEGER := 100;
    processed INTEGER := 0;
BEGIN
    FOR pid, adjustment IN price_adjustments LOOP
        UPDATE Product
        SET price = price * adjustment,
            updated_at = NOW()
        WHERE id = pid
        RETURNING id AS product_id,
                  price / adjustment AS old_price,
                  price AS new_price;

        processed := processed + 1;

        -- Commit in batches
        IF processed % batch_size = 0 THEN
            COMMIT;
            BEGIN;
        END IF;
    END LOOP;

    COMMIT;
END;
$$;
```

### Recursive Procedures

```gql
CREATE PROCEDURE calculate_org_hierarchy(root_id STRING, max_depth INTEGER DEFAULT 10)
RETURNS TABLE (
    node_id STRING,
    node_name STRING,
    level INTEGER,
    path STRING
)
LANGUAGE GQL
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE hierarchy AS (
        -- Base case
        SELECT
            e.id AS node_id,
            e.name AS node_name,
            0 AS level,
            CAST(e.id AS STRING) AS path
        FROM Employee e
        WHERE e.id = root_id

        UNION ALL

        -- Recursive case
        SELECT
            e.id,
            e.name,
            h.level + 1,
            h.path || '/' || e.id
        FROM Employee e
        JOIN hierarchy h ON e.manager_id = h.node_id
        WHERE h.level < max_depth
    )
    SELECT * FROM hierarchy
    ORDER BY level, node_name;
END;
$$;
```

## Versioning and Migration

### Version Management

```gql
-- Version 1
CREATE OR REPLACE PROCEDURE calculate_discount_v1(
    customer_id STRING,
    order_total DECIMAL
)
RETURNS DECIMAL
AS $$
BEGIN
    RETURN order_total * 0.1;  -- Simple 10% discount
END;
$$;

-- Version 2: Enhanced logic
CREATE OR REPLACE PROCEDURE calculate_discount_v2(
    customer_id STRING,
    order_total DECIMAL
)
RETURNS DECIMAL
AS $$
DECLARE
    customer_tier STRING;
    discount_rate DECIMAL;
BEGIN
    -- Get customer tier
    SELECT tier INTO customer_tier
    FROM Customer
    WHERE id = customer_id;

    -- Tiered discounts
    discount_rate := CASE customer_tier
        WHEN 'platinum' THEN 0.20
        WHEN 'gold' THEN 0.15
        WHEN 'silver' THEN 0.10
        ELSE 0.05
    END;

    RETURN order_total * discount_rate;
END;
$$;

-- Create alias for current version
CREATE OR REPLACE PROCEDURE calculate_discount(
    customer_id STRING,
    order_total DECIMAL
)
RETURNS DECIMAL
AS $$
BEGIN
    RETURN calculate_discount_v2(customer_id, order_total);
END;
$$;
```

### Deprecation Strategy

```gql
CREATE PROCEDURE old_procedure(param STRING)
AS $$
BEGIN
    -- Log deprecation warning
    RAISE WARNING 'Procedure old_procedure is deprecated. Use new_procedure instead.';

    -- Forward to new implementation
    RETURN new_procedure(param);
END;
$$;
```

## Monitoring and Debugging

### Execution Logging

```gql
CREATE PROCEDURE process_order_with_logging(order_id STRING)
RETURNS BOOLEAN
AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    rows_affected INTEGER;
BEGIN
    start_time := NOW();

    -- Log procedure start
    INSERT INTO procedure_log (
        procedure_name,
        parameters,
        start_time,
        status
    ) VALUES (
        'process_order_with_logging',
        json_build_object('order_id', order_id),
        start_time,
        'running'
    );

    -- Main logic
    UPDATE Order SET status = 'processing' WHERE id = order_id;
    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    -- Process order steps...

    end_time := NOW();

    -- Log completion
    UPDATE procedure_log
    SET end_time = end_time,
        duration_ms = EXTRACT(MILLISECONDS FROM (end_time - start_time)),
        rows_affected = rows_affected,
        status = 'completed'
    WHERE procedure_name = 'process_order_with_logging'
      AND start_time = start_time;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        UPDATE procedure_log
        SET end_time = NOW(),
            status = 'failed',
            error_message = SQLERRM
        WHERE procedure_name = 'process_order_with_logging'
          AND start_time = start_time;

        RAISE;
END;
$$;
```

### Performance Profiling

```gql
-- Query procedure statistics
SELECT
    procedure_name,
    call_count,
    total_time_ms,
    avg_time_ms,
    min_time_ms,
    max_time_ms,
    last_called
FROM system.procedure_stats
WHERE procedure_name LIKE 'process_%'
ORDER BY total_time_ms DESC;

-- Identify slow procedures
SELECT
    procedure_name,
    avg_time_ms,
    call_count
FROM system.procedure_stats
WHERE avg_time_ms > 1000  -- Slower than 1 second
ORDER BY avg_time_ms DESC;
```

## Testing Stored Procedures

### Unit Testing

```gql
-- Test procedure
CREATE PROCEDURE test_calculate_discount()
RETURNS BOOLEAN
AS $$
DECLARE
    result DECIMAL;
    expected DECIMAL;
BEGIN
    -- Test case 1: Regular customer
    result := calculate_discount('cust_123', 100.00);
    expected := 10.00;

    IF result <> expected THEN
        RAISE EXCEPTION 'Test failed: Expected %, got %', expected, result;
    END IF;

    -- Test case 2: Platinum customer
    result := calculate_discount('cust_platinum', 100.00);
    expected := 20.00;

    IF result <> expected THEN
        RAISE EXCEPTION 'Test failed: Expected %, got %', expected, result;
    END IF;

    -- All tests passed
    RETURN TRUE;
END;
$$;

-- Run tests
CALL test_calculate_discount();
```

### Integration Testing

```python
# Python integration tests
import pytest
from geode_client import Client

@pytest.mark.asyncio
async def test_process_order_procedure():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Setup test data
        await conn.execute("""
            CREATE (o:Order {
                id: 'test_order_1',
                status: 'pending',
                total: 150.00
            })
        """)

        # Call procedure
        result, _ = await conn.query("CALL process_order('test_order_1')")

        # Verify results
        order = await conn.execute("""
            MATCH (o:Order {id: 'test_order_1'})
            RETURN o.status, o.processed_at
        """)

        assert order[0]['o.status'] == 'completed'
        assert order[0]['o.processed_at'] is not None

        # Cleanup
        await conn.execute("MATCH (o:Order {id: 'test_order_1'}) DELETE o")
```

## Best Practices

### Design Principles

1. **Single Responsibility**: Each procedure does one thing well
2. **Clear Naming**: Use descriptive verb-noun names (calculate_discount, process_order)
3. **Parameter Validation**: Validate all inputs at procedure start
4. **Error Handling**: Comprehensive exception handling with meaningful messages
5. **Documentation**: Document parameters, return values, and business logic
6. **Version Control**: Version procedures and maintain backwards compatibility
7. **Idempotency**: Design procedures to be safely re-executed

### Performance Guidelines

- **Minimize Locks**: Keep transactions short
- **Use Indexes**: Ensure queries within procedures use indexes
- **Batch Operations**: Process multiple items in single transaction
- **Avoid Cursors**: Use set-based operations when possible
- **Cache Results**: Store expensive calculations in temp tables
- **Monitor Metrics**: Track execution time and resource usage

### Security Best Practices

```gql
CREATE PROCEDURE secure_update_salary(
    employee_id STRING,
    new_salary DECIMAL,
    updater_id STRING
)
RETURNS BOOLEAN
AS $$
DECLARE
    updater_role STRING;
BEGIN
    -- Authorization check
    SELECT role INTO updater_role
    FROM User
    WHERE id = updater_id;

    IF updater_role NOT IN ('admin', 'hr_manager') THEN
        RAISE EXCEPTION 'Unauthorized: Only admins and HR managers can update salaries';
    END IF;

    -- Input validation
    IF new_salary < 0 OR new_salary > 1000000 THEN
        RAISE EXCEPTION 'Invalid salary: Must be between 0 and 1,000,000';
    END IF;

    -- Audit logging
    INSERT INTO audit_log (
        action,
        table_name,
        record_id,
        performed_by,
        timestamp
    ) VALUES (
        'UPDATE_SALARY',
        'Employee',
        employee_id,
        updater_id,
        NOW()
    );

    -- Perform update
    UPDATE Employee
    SET salary = new_salary,
        updated_at = NOW(),
        updated_by = updater_id
    WHERE id = employee_id;

    RETURN TRUE;
END;
$$;
```

## Troubleshooting

### Common Issues

**Problem**: Procedure is slow
```gql
-- Solution: Profile and optimize
EXPLAIN ANALYZE CALL my_procedure('param');

-- Check for missing indexes
SELECT * FROM system.procedure_stats
WHERE procedure_name = 'my_procedure';
```

**Problem**: Deadlocks in concurrent execution
```gql
-- Solution: Use explicit lock ordering
CREATE PROCEDURE safe_transfer(from_id STRING, to_id STRING, amount DECIMAL)
AS $$
DECLARE
    first_id STRING;
    second_id STRING;
BEGIN
    -- Always lock in same order to prevent deadlock
    first_id := LEAST(from_id, to_id);
    second_id := GREATEST(from_id, to_id);

    -- Lock accounts in deterministic order
    SELECT * FROM Account WHERE id = first_id FOR UPDATE;
    SELECT * FROM Account WHERE id = second_id FOR UPDATE;

    -- Perform transfer
    -- ...
END;
$$;
```

## Related Topics

- [Functions](/tags/functions/) - User-defined functions
- [Triggers](/tags/triggers/) - Event-driven procedures
- [Transactions](/tags/transactions/) - Transaction management
- [Security](/tags/security/) - Access control and authorization
- [Performance](/tags/performance/) - Query optimization

## Further Reading

- [PostgreSQL Stored Procedures](https://www.postgresql.org/docs/current/sql-createprocedure.html) - PostgreSQL documentation
- [T-SQL Procedures](https://docs.microsoft.com/en-us/sql/relational-databases/stored-procedures/stored-procedures-database-engine) - SQL Server guide
- [PL/SQL Procedures](https://docs.oracle.com/en/database/oracle/oracle-database/21/lnpls/CREATE-PROCEDURE-statement.html) - Oracle documentation
