---
title: "User-Defined Functions (UDFs)"
description: "Extend Geode's GQL capabilities with user-defined functions. Learn to create scalar functions, aggregation functions, and stored procedures for custom business logic, data transformations, and advanced analytics."
keywords:
  - custom functions
  - UDF
  - user-defined functions
  - stored procedures
  - function development
  - extensibility
  - scalar functions
  - aggregation functions
  - Geode
  - GQL
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/custom-functions/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# User-Defined Functions in Geode

{{< callout type="warning" >}}
**Not available yet.** The GQL grammar has no `CREATE FUNCTION`,
`CREATE AGGREGATE FUNCTION` or `CREATE PROCEDURE` statement, and the procedure
registry dispatches only the built-in `db.`, `dbms.`, `algo.`, `audit.`, `tde.`,
`cdc.` and `geode.*` families — user-supplied functions cannot be registered or
called. Nothing on this page executes against a running server today; it
documents the intended surface. Until it lands, put custom logic in your
application and pass the results in as parameters. The built-in function surface
is listed by `SHOW FUNCTIONS` and documented in the
[function reference](/docs/gql-reference/functions/).
{{< /callout >}}

User-defined functions (UDFs) extend Geode's built-in GQL capabilities with custom logic tailored to your application's needs. Whether you need specialized data transformations, complex business rules, or domain-specific calculations, UDFs enable you to encapsulate reusable logic that executes directly within the database engine.

Geode supports several types of custom functions: scalar functions that operate on individual values, aggregation functions that process sets of values, and stored procedures for complex multi-step operations.

## Function Types Overview

### Scalar Functions

Scalar functions take one or more input values and return a single value. They can be used anywhere expressions are allowed.

```gql
-- Using a custom scalar function
MATCH (u:User)
RETURN u.name,
       normalize_phone(u.phone) AS phone,
       calculate_age(u.birth_date) AS age;
```

### Aggregation Functions

Aggregation functions process multiple input values and return a single aggregated result.

```gql
-- Using a custom aggregation function
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
RETURN c.name,
       weighted_average(p.rating, p.review_count) AS avg_rating;
```

### Stored Procedures

Stored procedures encapsulate complex multi-statement logic that may modify data.

```gql
-- Calling a stored procedure
CALL calculate_user_scores();

-- Procedure with parameters and return values
CALL find_influencers($min_followers, $category)
YIELD user_id, influence_score;
```

## Creating Scalar Functions

### Basic Scalar Function

Define a function that normalizes phone numbers:

```gql
-- Create a scalar function
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Use the function
MATCH (c:Contact)
RETURN c.name, normalize_phone(c.phone) AS formatted_phone;
```

### Function with Multiple Parameters

Calculate distance between geographic coordinates:

```gql
-- Haversine distance function
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Find locations within radius
MATCH (store:Store)
WHERE haversine_distance($user_lat, $user_lon, store.latitude, store.longitude) < 10
RETURN store.name, store.address
ORDER BY haversine_distance($user_lat, $user_lon, store.latitude, store.longitude);
```

### Function with Default Parameters

```gql
-- Function with default values
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Usage with defaults
SELECT toString(99.99) /* no format_*(); format in the client */;                    -- '$99.99'
SELECT toString(99.99) /* no format_*(); format in the client */;            -- '99.99'
SELECT toString(1234.567) /* no format_*(); format in the client */;       -- '$1235'
```

### Function with Complex Logic

Calculate credit score tier:

```gql
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Use in queries
MATCH (c:Customer)
RETURN c.name,
       c.credit_score,
       credit_tier(c.credit_score) AS tier;

-- Use in filtering
MATCH (c:Customer)
WHERE credit_tier(c.credit_score) IN ['Excellent', 'Very Good']
RETURN c.name, c.credit_limit;
```

## Creating Aggregation Functions

### Custom Average with Null Handling

```gql
-- Weighted average that handles nulls
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Usage
MATCH (p:Product)
RETURN weighted_avg(p.rating, p.review_count) AS weighted_rating;

-- Group by category
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
RETURN c.name,
       weighted_avg(p.rating, p.review_count) AS category_rating
ORDER BY category_rating DESC;
```

### Percentile Calculation

```gql
-- Percentile aggregation function
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Calculate median (50th percentile)
MATCH (e:Employee)
RETURN collect(e.salary) /* percentile_cont/_disc parse but are never computed; sort client-side */ AS median_salary;

-- Multiple percentiles
MATCH (o:Order)
RETURN collect(o.total) /* percentile_cont/_disc parse but are never computed; sort client-side */ AS p25,
       collect(o.total) /* percentile_cont/_disc parse but are never computed; sort client-side */ AS median,
       collect(o.total) /* percentile_cont/_disc parse but are never computed; sort client-side */ AS p75,
       collect(o.total) /* percentile_cont/_disc parse but are never computed; sort client-side */ AS p90;
```

### Mode (Most Frequent Value)

```gql
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Find most common category
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
RETURN mode(c.name) AS most_common_category;
```

### String Aggregation

```gql
-- Concatenate strings with separator
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Usage
MATCH (o:Order)-[:CONTAINS]->(p:Product)
RETURN o.id,
       string_agg(p.name, ', ') AS products;

-- Custom separator
MATCH (u:User)-[:HAS_SKILL]->(s:Skill)
RETURN u.name,
       string_agg(s.name, ' | ') AS skills;
```

## Creating Stored Procedures

### Basic Procedure

```gql
-- Procedure to archive old orders
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

  -- Return count of archived orders
  MATCH (a:ArchivedOrder)
  WHERE a.archived_at IS NULL
  SET a.archived_at = datetime()
  RETURN COUNT(a) AS archived_count;
$$;

-- Call the procedure
CALL archive_old_orders(DATE '2024-01-01');
```

### Procedure with YIELD

```gql
-- Procedure that yields multiple result sets
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Use with YIELD
CALL find_influencers(1000, 'Technology')
YIELD user_id, username, influence_score
WHERE influence_score > 100
RETURN user_id, username, influence_score;
```

### Procedure for Data Maintenance

```gql
-- Cleanup procedure for expired sessions
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.  -- Delete associated data
  UNWIND expired_sessions AS session
  OPTIONAL MATCH (session)-[:HAS_CACHE]->(cache)
  DELETE cache

  -- Delete sessions
  WITH expired_sessions
  UNWIND expired_sessions AS session
  DELETE session

  -- Return statistics
  RETURN SIZE(expired_sessions) AS deleted_count,
         0.0 AS freed_mb;  -- Placeholder for actual size calculation
$$;

-- Schedule cleanup
CALL cleanup_expired_sessions()
YIELD deleted_count
RETURN deleted_count;
```

### Transaction Control in Procedures

```gql
-- Procedure with explicit transaction handling
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.
  END IF;

  -- Check source account balance
  MATCH (source:Account {id: from_account_id})
  IF source IS NULL THEN
    RETURN false, 'Source account not found';
  END IF;

  IF source.balance < amount THEN
    RETURN false, 'Insufficient funds';
  END IF;

  -- Check destination account
  MATCH (dest:Account {id: to_account_id})
  IF dest IS NULL THEN
    RETURN false, 'Destination account not found';
  END IF;

  -- Perform transfer
  SET source.balance = source.balance - amount;
  SET dest.balance = dest.balance + amount;

  -- Create transaction record
  CREATE (t:Transaction {
    id: uuid_v4(),
    from_account: from_account_id,
    to_account: to_account_id,
    amount: amount,
    timestamp: datetime()
  });

  RETURN true, 'Transfer completed successfully';
$$;

-- Use the procedure
CALL transfer_funds('ACC-001', 'ACC-002', 500.00)
YIELD success, message
RETURN success, message;
```

## Function Management

### Listing Functions

```gql
-- List all custom functions
SHOW FUNCTIONS;

-- List functions by type
SHOW FUNCTIONS WHERE type = 'SCALAR';
SHOW FUNCTIONS WHERE type = 'AGGREGATE';

-- Get function definition
SHOW FUNCTION normalize_phone;
```

### Modifying Functions

```gql
-- Replace existing function (CREATE OR REPLACE)
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Drop function
DROP FUNCTION normalize_phone;

-- Drop if exists
DROP FUNCTION IF EXISTS normalize_phone;
```

### Function Permissions

```gql
-- Grant execute permission
GRANT EXECUTE ON FUNCTION normalize_phone TO role_analyst;

-- Revoke permission
REVOKE EXECUTE ON FUNCTION transfer_funds FROM role_user;

-- Set function as SECURITY DEFINER (runs with creator's permissions)
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.
```

## Advanced Patterns

### Recursive Functions

```gql
-- Calculate factorial
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Fibonacci (with memoization consideration)
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.
```

### Functions with Graph Traversal

```gql
-- Calculate shortest path length
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Check if nodes are connected
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Usage
MATCH (u1:User), (u2:User)
WHERE u1 <> u2
RETURN u1.name, u2.name,
       path_length(u1.id, u2.id) AS degrees_of_separation
ORDER BY degrees_of_separation
LIMIT 20;
```

### Domain-Specific Functions

```gql
-- E-commerce: Calculate shipping cost
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Finance: Calculate compound interest
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Healthcare: Calculate BMI
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.
```

## Client Integration Examples

### Python Client

```python
from geode_client import Client

async def use_custom_functions():
    client = Client(host="localhost", port=3141)

    async with client.connection() as conn:
        # Create a custom function
        await conn.execute("""
            CREATE OR REPLACE FUNCTION format_name(first STRING, last STRING)
            RETURNS STRING
            LANGUAGE GQL
            AS $$
              RETURN upper(substring(first, 0, 1)) + '. ' + last
            $$
        """)

        # Use the function in queries
        result, _ = await conn.query("""
            MATCH (e:Employee)
            RETURN format_name(e.first_name, e.last_name) AS display_name,
                   e.department
            ORDER BY e.last_name
        """)

        for row in result.rows:
            print(f"{row['display_name']} - {row['department']}")

        # Call a stored procedure
        result, _ = await conn.query("""
            CALL find_influencers($min_followers, $category)
            YIELD user_id, username, influence_score
            WHERE influence_score > $min_score
            RETURN user_id, username, influence_score
        """, {
            'min_followers': 1000,
            'category': 'Technology',
            'min_score': 50
        })

        for row in result.rows:
            print(f"Influencer: {row['username']} (score: {row['influence_score']:.2f})")
```

### Go Client

```go
package main

import (
    "context"
    "database/sql"
    "log"

    _ "geodedb.com/geode"
)

func useCustomFunctions(ctx context.Context, db *sql.DB) error {
    // Create function
    _, err := db.ExecContext(ctx, `
        CREATE OR REPLACE FUNCTION days_until(target_date DATE)
        RETURNS INT
        LANGUAGE GQL
        AS $$
          RETURN date_diff('day', current_date(), target_date)
        $$
    `)
    if err != nil {
        return err
    }

    // Use in query
    rows, err := db.QueryContext(ctx, `
        MATCH (e:Event)
        WHERE e.event_date > current_date()
        RETURN e.name,
               e.event_date,
               days_until(e.event_date) AS days_away
        ORDER BY days_away
    `)
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var name string
        var eventDate string
        var daysAway int
        rows.Scan(&name, &eventDate, &daysAway)
        log.Printf("%s on %s (%d days away)", name, eventDate, daysAway)
    }

    return nil
}
```

### Rust Client

```rust
use geode_client::{Client, Value};

async fn use_custom_functions(client: &Client) -> Result<(), Box<dyn std::error::Error>> {
    // Create custom aggregation function
    client.execute(
        r#"
        CREATE OR REPLACE AGGREGATE FUNCTION geometric_mean(value FLOAT)
        RETURNS FLOAT
        STATE (product FLOAT, count INT)
        INIT $$
          SET product = 1.0, count = 0
        $$
        ACCUMULATE $$
          IF value IS NOT NULL AND value > 0 THEN
            SET product = product * value,
                count = count + 1
          END IF
        $$
        FINALIZE $$
          RETURN CASE
            WHEN count > 0 THEN power(product, 1.0 / count)
            ELSE NULL
          END
        $$
        "#,
        &[],
    ).await?;

    // Use the function
    let results = client.query(
        r#"
        MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
        RETURN c.name,
               geometric_mean(p.rating) AS geo_mean_rating,
               AVG(p.rating) AS arithmetic_mean
        ORDER BY geo_mean_rating DESC
        "#,
        &[],
    ).await?;

    for row in results.rows() {
        println!(
            "{}: geometric={:.2}, arithmetic={:.2}",
            row.get::<String>("c.name")?,
            row.get::<f64>("geo_mean_rating")?,
            row.get::<f64>("arithmetic_mean")?
        );
    }

    Ok(())
}
```

## Best Practices

### Function Design

- Keep functions focused on a single task
- Use descriptive parameter names
- Provide sensible default values
- Document expected input/output formats
- Handle null values explicitly

### Performance Considerations

- Avoid expensive operations in frequently-called functions
- Use indexes for graph traversals within functions
- Consider caching for deterministic functions
- Profile function performance with EXPLAIN/PROFILE

### Security

- Validate all input parameters
- Use SECURITY DEFINER carefully
- Limit function permissions appropriately
- Avoid SQL injection in dynamic queries

### Testing

- Test with edge cases (nulls, empty strings, extreme values)
- Verify error handling
- Test with realistic data volumes
- Include performance benchmarks

## Related Topics

- [Functions](/tags/functions/) - Built-in GQL functions
- [Stored Procedures](/tags/stored-procedures/) - Procedure documentation
- [GQL Reference](/tags/gql-reference/) - GQL syntax reference
- [Advanced](/tags/advanced/) - Advanced features
- [Performance](/tags/performance/) - Performance optimization
- [Security](/tags/security/) - Security best practices

## Further Reading

- ISO/IEC 39075:2024 User-Defined Functions
- GQL Function Development Guide
- Performance Optimization for UDFs
- Geode Extension Architecture
- Custom Function Security Considerations

Browse tagged content for complete user-defined function documentation and examples.
