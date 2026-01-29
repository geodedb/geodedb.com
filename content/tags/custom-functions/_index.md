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
CREATE FUNCTION normalize_phone(phone STRING) RETURNS STRING
LANGUAGE GQL
AS $$
  -- Remove all non-digit characters
  WITH regexp_replace(phone, '[^0-9]', '') AS digits
  RETURN CASE
    WHEN length(digits) = 10 THEN
      '(' + substring(digits, 0, 3) + ') ' +
      substring(digits, 3, 3) + '-' +
      substring(digits, 6, 4)
    WHEN length(digits) = 11 AND substring(digits, 0, 1) = '1' THEN
      '+1 (' + substring(digits, 1, 3) + ') ' +
      substring(digits, 4, 3) + '-' +
      substring(digits, 7, 4)
    ELSE phone
  END
$$;

-- Use the function
MATCH (c:Contact)
RETURN c.name, normalize_phone(c.phone) AS formatted_phone;
```

### Function with Multiple Parameters

Calculate distance between geographic coordinates:

```gql
-- Haversine distance function
CREATE FUNCTION haversine_distance(
  lat1 FLOAT,
  lon1 FLOAT,
  lat2 FLOAT,
  lon2 FLOAT
) RETURNS FLOAT
LANGUAGE GQL
AS $$
  WITH 6371.0 AS earth_radius_km,  -- Earth's radius
       radians(lat1) AS lat1_rad,
       radians(lat2) AS lat2_rad,
       radians(lat2 - lat1) AS delta_lat,
       radians(lon2 - lon1) AS delta_lon
  WITH earth_radius_km, lat1_rad, lat2_rad, delta_lat, delta_lon,
       sin(delta_lat / 2) * sin(delta_lat / 2) +
       cos(lat1_rad) * cos(lat2_rad) *
       sin(delta_lon / 2) * sin(delta_lon / 2) AS a
  WITH earth_radius_km, 2 * atan2(sqrt(a), sqrt(1 - a)) AS c
  RETURN earth_radius_km * c
$$;

-- Find locations within radius
MATCH (store:Store)
WHERE haversine_distance($user_lat, $user_lon, store.latitude, store.longitude) < 10
RETURN store.name, store.address
ORDER BY haversine_distance($user_lat, $user_lon, store.latitude, store.longitude);
```

### Function with Default Parameters

```gql
-- Function with default values
CREATE FUNCTION format_currency(
  amount FLOAT,
  currency STRING DEFAULT 'USD',
  decimals INT DEFAULT 2
) RETURNS STRING
LANGUAGE GQL
AS $$
  WITH CASE currency
    WHEN 'USD' THEN '$'
    WHEN 'EUR' THEN '\u20AC'
    WHEN 'GBP' THEN '\u00A3'
    WHEN 'JPY' THEN '\u00A5'
    ELSE currency + ' '
  END AS symbol
  RETURN symbol + round(amount, decimals)
$$;

-- Usage with defaults
SELECT format_currency(99.99);                    -- '$99.99'
SELECT format_currency(99.99, 'EUR');            -- '99.99'
SELECT format_currency(1234.567, 'USD', 0);       -- '$1235'
```

### Function with Complex Logic

Calculate credit score tier:

```gql
CREATE FUNCTION credit_tier(score INT) RETURNS STRING
LANGUAGE GQL
AS $$
  RETURN CASE
    WHEN score >= 800 THEN 'Excellent'
    WHEN score >= 740 THEN 'Very Good'
    WHEN score >= 670 THEN 'Good'
    WHEN score >= 580 THEN 'Fair'
    WHEN score >= 300 THEN 'Poor'
    ELSE 'Invalid'
  END
$$;

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
CREATE AGGREGATE FUNCTION weighted_avg(
  value FLOAT,
  weight FLOAT
) RETURNS FLOAT
STATE (sum FLOAT, weight_sum FLOAT)
INIT $$
  SET sum = 0.0, weight_sum = 0.0
$$
ACCUMULATE $$
  IF value IS NOT NULL AND weight IS NOT NULL THEN
    SET sum = sum + (value * weight),
        weight_sum = weight_sum + weight
  END IF
$$
FINALIZE $$
  RETURN CASE
    WHEN weight_sum > 0 THEN sum / weight_sum
    ELSE NULL
  END
$$;

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
CREATE AGGREGATE FUNCTION percentile(
  value FLOAT,
  percentile FLOAT
) RETURNS FLOAT
STATE (values LIST<FLOAT>)
INIT $$
  SET values = []
$$
ACCUMULATE $$
  IF value IS NOT NULL THEN
    SET values = values + [value]
  END IF
$$
FINALIZE $$
  WITH size(values) AS n
  WHERE n > 0
  WITH values, percentile * (n - 1) AS idx
  WITH values, floor(idx) AS lower_idx, ceil(idx) AS upper_idx, idx - floor(idx) AS frac
  -- Sort values
  WITH [v IN values ORDER BY v] AS sorted, lower_idx, upper_idx, frac
  RETURN CASE
    WHEN lower_idx = upper_idx THEN sorted[lower_idx]
    ELSE sorted[lower_idx] * (1 - frac) + sorted[upper_idx] * frac
  END
$$;

-- Calculate median (50th percentile)
MATCH (e:Employee)
RETURN percentile(e.salary, 0.5) AS median_salary;

-- Multiple percentiles
MATCH (o:Order)
RETURN percentile(o.total, 0.25) AS p25,
       percentile(o.total, 0.50) AS median,
       percentile(o.total, 0.75) AS p75,
       percentile(o.total, 0.90) AS p90;
```

### Mode (Most Frequent Value)

```gql
CREATE AGGREGATE FUNCTION mode(value ANY) RETURNS ANY
STATE (counts MAP<ANY, INT>)
INIT $$
  SET counts = {}
$$
ACCUMULATE $$
  IF value IS NOT NULL THEN
    SET counts[value] = COALESCE(counts[value], 0) + 1
  END IF
$$
FINALIZE $$
  WITH [entry IN counts | entry] AS entries
  UNWIND entries AS entry
  WITH entry
  ORDER BY entry.value DESC
  LIMIT 1
  RETURN entry.key
$$;

-- Find most common category
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
RETURN mode(c.name) AS most_common_category;
```

### String Aggregation

```gql
-- Concatenate strings with separator
CREATE AGGREGATE FUNCTION string_agg(
  value STRING,
  separator STRING DEFAULT ', '
) RETURNS STRING
STATE (values LIST<STRING>)
INIT $$
  SET values = []
$$
ACCUMULATE $$
  IF value IS NOT NULL THEN
    SET values = values + [value]
  END IF
$$
FINALIZE $$
  RETURN reduce(result = '', i IN range(0, size(values) - 1) |
    result + CASE WHEN i = 0 THEN '' ELSE separator END + values[i]
  )
$$;

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
CREATE PROCEDURE archive_old_orders(cutoff_date DATE)
LANGUAGE GQL
AS $$
  -- Move old orders to archive
  MATCH (o:Order)
  WHERE o.order_date < cutoff_date
    AND o.status = 'completed'
  SET o:ArchivedOrder
  REMOVE o:Order;

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
CREATE PROCEDURE find_influencers(
  min_followers INT,
  category STRING DEFAULT NULL
)
RETURNS (user_id STRING, username STRING, followers INT, influence_score FLOAT)
LANGUAGE GQL
AS $$
  MATCH (u:User)
  WHERE u.followers_count >= min_followers
  OPTIONAL MATCH (u)-[:POSTS_IN]->(c:Category)
  WHERE category IS NULL OR c.name = category
  WITH u,
       u.followers_count AS followers,
       u.followers_count * 1.0 / (u.following_count + 1) AS ratio
  WHERE category IS NULL OR c IS NOT NULL
  RETURN u.id AS user_id,
         u.username AS username,
         followers,
         ratio * log(followers + 1) AS influence_score
  ORDER BY influence_score DESC
$$;

-- Use with YIELD
CALL find_influencers(1000, 'Technology')
YIELD user_id, username, influence_score
WHERE influence_score > 100
RETURN user_id, username, influence_score;
```

### Procedure for Data Maintenance

```gql
-- Cleanup procedure for expired sessions
CREATE PROCEDURE cleanup_expired_sessions()
RETURNS (deleted_count INT, freed_mb FLOAT)
LANGUAGE GQL
AS $$
  -- Find expired sessions
  MATCH (s:Session)
  WHERE s.expires_at < datetime()
  WITH COLLECT(s) AS expired_sessions

  -- Delete associated data
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
CREATE PROCEDURE transfer_funds(
  from_account_id STRING,
  to_account_id STRING,
  amount FLOAT
)
RETURNS (success BOOLEAN, message STRING)
LANGUAGE GQL
AS $$
  -- Validate amount
  IF amount <= 0 THEN
    RETURN false, 'Amount must be positive';
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
    id: randomUUID(),
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
CREATE OR REPLACE FUNCTION normalize_phone(phone STRING) RETURNS STRING
LANGUAGE GQL
AS $$
  -- Updated implementation
  WITH regexp_replace(phone, '[^0-9+]', '') AS cleaned
  RETURN CASE
    WHEN length(cleaned) = 10 THEN '+1' + cleaned
    ELSE cleaned
  END
$$;

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
CREATE FUNCTION admin_task()
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE GQL
AS $$
  -- Runs with elevated permissions
  RETURN true
$$;
```

## Advanced Patterns

### Recursive Functions

```gql
-- Calculate factorial
CREATE FUNCTION factorial(n INT) RETURNS INT
LANGUAGE GQL
AS $$
  RETURN CASE
    WHEN n <= 1 THEN 1
    ELSE n * factorial(n - 1)
  END
$$;

-- Fibonacci (with memoization consideration)
CREATE FUNCTION fibonacci(n INT) RETURNS INT
LANGUAGE GQL
AS $$
  RETURN CASE
    WHEN n <= 0 THEN 0
    WHEN n = 1 THEN 1
    ELSE fibonacci(n - 1) + fibonacci(n - 2)
  END
$$;
```

### Functions with Graph Traversal

```gql
-- Calculate shortest path length
CREATE FUNCTION path_length(from_id STRING, to_id STRING, max_hops INT DEFAULT 10)
RETURNS INT
LANGUAGE GQL
AS $$
  MATCH path = shortestPath(
    (a {id: from_id})-[*..max_hops]->(b {id: to_id})
  )
  RETURN COALESCE(length(path), -1)
$$;

-- Check if nodes are connected
CREATE FUNCTION is_connected(from_id STRING, to_id STRING) RETURNS BOOLEAN
LANGUAGE GQL
AS $$
  RETURN EXISTS {
    MATCH (a {id: from_id})-[*..20]-(b {id: to_id})
  }
$$;

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
CREATE FUNCTION calculate_shipping(
  weight FLOAT,
  distance FLOAT,
  expedited BOOLEAN DEFAULT false
) RETURNS FLOAT
LANGUAGE GQL
AS $$
  WITH 0.50 AS base_per_lb,
       0.01 AS base_per_mile,
       1.5 AS expedited_multiplier
  WITH weight * base_per_lb + distance * base_per_mile AS base_cost
  RETURN CASE
    WHEN expedited THEN base_cost * expedited_multiplier
    ELSE base_cost
  END
$$;

-- Finance: Calculate compound interest
CREATE FUNCTION compound_interest(
  principal FLOAT,
  rate FLOAT,
  periods INT,
  compounds_per_period INT DEFAULT 12
) RETURNS FLOAT
LANGUAGE GQL
AS $$
  RETURN principal * power(
    1 + rate / compounds_per_period,
    compounds_per_period * periods
  )
$$;

-- Healthcare: Calculate BMI
CREATE FUNCTION calculate_bmi(
  weight_kg FLOAT,
  height_cm FLOAT
) RETURNS FLOAT
LANGUAGE GQL
AS $$
  WITH height_cm / 100.0 AS height_m
  RETURN round(weight_kg / (height_m * height_m), 1)
$$;
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
