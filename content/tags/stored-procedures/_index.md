---
title: "Stored Procedures"
description: "Reusable, server-side GQL procedures for encapsulating complex database logic in Geode"
keywords: ["stored procedures", "database procedures", "server-side logic", "GQL procedures", "functions", "subroutines", "callable procedures"]
weight: 10
---

# Stored Procedures

Stored procedures are reusable, server-side programs written in GQL that encapsulate complex database logic. They enable code reuse, improve performance, enhance security, and simplify application development.

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

async for row in result:
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

## Best Practices

### Design Principles
- Single responsibility per procedure
- Clear, descriptive names
- Comprehensive error handling
- Document parameters and return values
- Version stored procedures

### Performance
- Use appropriate indexes
- Minimize network roundtrips
- Batch operations when possible
- Monitor execution times

### Security
- Validate all inputs
- Use parameterized queries
- Implement authorization checks
- Audit procedure execution
- Follow least privilege principle

## Related Topics

- [Functions](/tags/functions) - User-defined functions
- [Triggers](/tags/triggers) - Automatic procedures
- [Transactions](/tags/transactions) - Transaction management

## Learn More

- [Stored Procedures (PostgreSQL)](https://www.postgresql.org/docs/current/sql-createprocedure.html)
- [T-SQL Stored Procedures](https://docs.microsoft.com/en-us/sql/relational-databases/stored-procedures/stored-procedures-database-engine)
