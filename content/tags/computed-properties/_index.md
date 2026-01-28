---
title: "Computed Properties - Dynamic Calculated Fields in Geode"
description: "Comprehensive guide to computed properties in Geode graph database: dynamically calculated node and edge properties derived from formulas, expressions, aggregations, and relationships. Always current, type-safe, indexable derived values."
keywords:
  - computed properties
  - derived properties
  - calculated fields
  - virtual columns
  - dynamic properties
  - formulas
  - expressions
  - graph calculations
  - property derivation
  - aggregated properties
  - type-safe computation
  - indexed properties
  - relationship aggregation
  - conditional logic
  - CASE expressions
  - formula-based properties
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Computed Properties

Computed properties are node or edge properties whose values are automatically calculated from other data through formulas and expressions. Unlike stored properties that persist static values, computed properties derive their values dynamically from base properties, relationships, or aggregations, ensuring they always reflect the current state of your graph. Computed properties are type-safe, indexable, and eliminate data redundancy while maintaining query performance.

## Computed Property Fundamentals

### What are Computed Properties?

Computed properties are dynamically calculated:

**Formula-Based** - Derived from expressions
**Always Current** - Automatically recalculated
**Type-Safe** - Strongly typed results
**Indexed** - Can be indexed for queries

### Use Cases

- **Derived Values** - Full name from first/last
- **Calculations** - Age from birthdate
- **Aggregations** - Total from line items
- **Transformations** - Uppercase email

## Defining Computed Properties

### Simple Computations

```gql
-- Property type with computed fields
CREATE PROPERTY TYPE Person (
    first_name STRING,
    last_name STRING,
    birthdate DATE,
    
    -- Computed properties
    full_name STRING COMPUTED AS (first_name || ' ' || last_name),
    age INTEGER COMPUTED AS (YEAR(CURRENT_DATE) - YEAR(birthdate)),
    initials STRING COMPUTED AS (
        SUBSTRING(first_name, 1, 1) || SUBSTRING(last_name, 1, 1)
    )
);
```

### Aggregations

Compute from relationships:

```gql
CREATE PROPERTY TYPE User (
    id STRING,
    name STRING,
    
    -- Count relationships
    friend_count INTEGER COMPUTED AS (
        SELECT COUNT(*) FROM MATCH (this)-[:FRIEND]->(:Person)
    ),
    
    -- Sum values
    total_spent DECIMAL COMPUTED AS (
        SELECT SUM(amount) FROM MATCH (this)-[:PLACED]->(o:Order)
    )
);
```

### Conditional Logic

Use CASE expressions:

```gql
CREATE PROPERTY TYPE Account (
    balance DECIMAL,
    credit_score INTEGER,
    
    -- Account status
    status STRING COMPUTED AS (
        CASE
            WHEN balance < 0 THEN 'overdrawn'
            WHEN balance < 100 THEN 'low_balance'
            WHEN balance < 10000 THEN 'standard'
            ELSE 'premium'
        END
    ),
    
    -- Credit tier
    credit_tier STRING COMPUTED AS (
        CASE
            WHEN credit_score >= 800 THEN 'excellent'
            WHEN credit_score >= 700 THEN 'good'
            WHEN credit_score >= 600 THEN 'fair'
            ELSE 'poor'
        END
    )
);
```

## Querying Computed Properties

### Filtering

Use in WHERE clauses:

```gql
-- Find users by computed property
MATCH (u:User)
WHERE u.age >= 18 AND u.friend_count > 50
RETURN u.name, u.age, u.friend_count;

-- Filter by account status
MATCH (a:Account)
WHERE a.status = 'premium'
RETURN a.balance, a.credit_tier;
```

### Sorting

Order by computed values:

```gql
-- Sort by computed property
MATCH (u:User)
RETURN u.name, u.total_spent
ORDER BY u.total_spent DESC
LIMIT 10;
```

### Indexing

Create indexes on computed properties:

```gql
-- Index computed property for fast lookup
CREATE INDEX idx_user_age ON Person(age);
CREATE INDEX idx_account_status ON Account(status);
```

## Performance Considerations

### Computation Cost

Be mindful of expensive computations:

```gql
-- Expensive (recalculated every access)
total_friends INTEGER COMPUTED AS (
    SELECT COUNT(*) FROM MATCH (this)-[:FRIEND*1..3]->(:Person)
);

-- Better (simpler calculation)
direct_friends INTEGER COMPUTED AS (
    SELECT COUNT(*) FROM MATCH (this)-[:FRIEND]->(:Person)
);
```

## Real-World Applications

### E-Commerce Applications

```gql
CREATE PROPERTY TYPE Product (
    base_price DECIMAL,
    cost DECIMAL,
    tax_rate DECIMAL,
    discount_percentage DECIMAL,

    -- Computed pricing
    discount_amount DECIMAL COMPUTED AS (base_price * discount_percentage / 100),
    price_after_discount DECIMAL COMPUTED AS (base_price - discount_amount),
    tax_amount DECIMAL COMPUTED AS (price_after_discount * tax_rate),
    final_price DECIMAL COMPUTED AS (price_after_discount + tax_amount),

    -- Computed metrics
    profit_margin DECIMAL COMPUTED AS ((price_after_discount - cost) / price_after_discount * 100),
    is_profitable BOOLEAN COMPUTED AS (profit_margin > 0)
);

CREATE PROPERTY TYPE Order (
    created_at TIMESTAMP,
    subtotal DECIMAL,
    shipping_fee DECIMAL,

    -- Order age
    days_since_order INTEGER COMPUTED AS (
        DATEDIFF(DAY, created_at, NOW())
    ),

    -- Order status
    is_recent BOOLEAN COMPUTED AS (days_since_order <= 7),
    is_stale BOOLEAN COMPUTED AS (days_since_order > 90),

    -- Order totals
    total DECIMAL COMPUTED AS (subtotal + shipping_fee),

    -- Item count from relationships
    item_count INTEGER COMPUTED AS (
        SELECT COUNT(*) FROM MATCH (this)-[:CONTAINS]->(item:OrderItem)
    )
);
```

### Social Network Applications

```gql
CREATE PROPERTY TYPE User (
    first_name STRING,
    last_name STRING,
    birthdate DATE,
    join_date TIMESTAMP,

    -- Profile display
    full_name STRING COMPUTED AS (first_name || ' ' || last_name),
    display_name STRING COMPUTED AS (
        COALESCE(NULLIF(full_name, ''), 'Anonymous User')
    ),

    -- Age calculation
    age INTEGER COMPUTED AS (
        DATEDIFF(YEAR, birthdate, CURRENT_DATE)
    ),
    is_adult BOOLEAN COMPUTED AS (age >= 18),
    age_group STRING COMPUTED AS (
        CASE
            WHEN age < 18 THEN 'minor'
            WHEN age < 25 THEN 'young_adult'
            WHEN age < 40 THEN 'adult'
            WHEN age < 60 THEN 'middle_aged'
            ELSE 'senior'
        END
    ),

    -- Account tenure
    membership_days INTEGER COMPUTED AS (
        DATEDIFF(DAY, join_date, NOW())
    ),
    membership_years DECIMAL COMPUTED AS (membership_days / 365.25),

    -- Social metrics from relationships
    follower_count INTEGER COMPUTED AS (
        SELECT COUNT(*) FROM MATCH (this)<-[:FOLLOWS]-(follower:User)
    ),
    following_count INTEGER COMPUTED AS (
        SELECT COUNT(*) FROM MATCH (this)-[:FOLLOWS]->(following:User)
    ),
    friend_count INTEGER COMPUTED AS (
        SELECT COUNT(*) FROM MATCH (this)-[:FRIEND]-(friend:User)
    ),

    -- Engagement metrics
    post_count INTEGER COMPUTED AS (
        SELECT COUNT(*) FROM MATCH (this)-[:POSTED]->(post:Post)
    ),
    engagement_score DECIMAL COMPUTED AS (
        (follower_count * 2.0 + post_count + friend_count) /
        NULLIF(membership_days, 0)
    ),

    -- User tier
    user_tier STRING COMPUTED AS (
        CASE
            WHEN follower_count >= 10000 THEN 'influencer'
            WHEN follower_count >= 1000 THEN 'power_user'
            WHEN follower_count >= 100 THEN 'active'
            ELSE 'casual'
        END
    )
);
```

### Financial Applications

```gql
CREATE PROPERTY TYPE Account (
    balance DECIMAL,
    credit_limit DECIMAL,
    interest_rate DECIMAL,
    monthly_fee DECIMAL,
    minimum_balance DECIMAL,
    opened_date DATE,

    -- Available funds
    available_credit DECIMAL COMPUTED AS (credit_limit - balance),
    credit_utilization DECIMAL COMPUTED AS (
        balance / NULLIF(credit_limit, 0) * 100
    ),

    -- Account status
    is_overdrawn BOOLEAN COMPUTED AS (balance < 0),
    is_below_minimum BOOLEAN COMPUTED AS (balance < minimum_balance),

    -- Account health
    health_score INTEGER COMPUTED AS (
        CASE
            WHEN balance >= credit_limit * 0.8 THEN 100
            WHEN balance >= credit_limit * 0.5 THEN 80
            WHEN balance >= 0 THEN 60
            WHEN balance >= credit_limit * -0.2 THEN 40
            ELSE 20
        END
    ),

    -- Account age
    account_age_months INTEGER COMPUTED AS (
        DATEDIFF(MONTH, opened_date, CURRENT_DATE)
    ),

    -- Interest calculations
    monthly_interest DECIMAL COMPUTED AS (balance * interest_rate / 12 / 100),
    annual_interest DECIMAL COMPUTED AS (balance * interest_rate / 100),

    -- Transaction metrics
    total_transactions INTEGER COMPUTED AS (
        SELECT COUNT(*) FROM MATCH (this)-[:HAS_TRANSACTION]->(t:Transaction)
    ),
    total_deposits DECIMAL COMPUTED AS (
        SELECT COALESCE(SUM(amount), 0)
        FROM MATCH (this)-[:HAS_TRANSACTION]->(t:Transaction)
        WHERE t.type = 'deposit'
    ),
    total_withdrawals DECIMAL COMPUTED AS (
        SELECT COALESCE(SUM(amount), 0)
        FROM MATCH (this)-[:HAS_TRANSACTION]->(t:Transaction)
        WHERE t.type = 'withdrawal'
    )
);
```

### Healthcare Applications

```gql
CREATE PROPERTY TYPE Patient (
    first_name STRING,
    last_name STRING,
    date_of_birth DATE,
    height_cm DECIMAL,
    weight_kg DECIMAL,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,

    -- Patient identification
    full_name STRING COMPUTED AS (first_name || ' ' || last_name),

    -- Age and demographics
    age INTEGER COMPUTED AS (
        DATEDIFF(YEAR, date_of_birth, CURRENT_DATE)
    ),
    age_category STRING COMPUTED AS (
        CASE
            WHEN age < 2 THEN 'infant'
            WHEN age < 13 THEN 'child'
            WHEN age < 20 THEN 'adolescent'
            WHEN age < 65 THEN 'adult'
            ELSE 'senior'
        END
    ),

    -- Body Mass Index (BMI)
    height_m DECIMAL COMPUTED AS (height_cm / 100),
    bmi DECIMAL COMPUTED AS (
        weight_kg / (height_m * height_m)
    ),
    bmi_category STRING COMPUTED AS (
        CASE
            WHEN bmi < 18.5 THEN 'underweight'
            WHEN bmi < 25 THEN 'normal'
            WHEN bmi < 30 THEN 'overweight'
            ELSE 'obese'
        END
    ),

    -- Blood pressure category
    bp_category STRING COMPUTED AS (
        CASE
            WHEN blood_pressure_systolic < 120 AND blood_pressure_diastolic < 80
                THEN 'normal'
            WHEN blood_pressure_systolic < 130 AND blood_pressure_diastolic < 80
                THEN 'elevated'
            WHEN blood_pressure_systolic < 140 OR blood_pressure_diastolic < 90
                THEN 'stage_1_hypertension'
            ELSE 'stage_2_hypertension'
        END
    ),

    -- Health indicators
    has_risk_factors BOOLEAN COMPUTED AS (
        bmi >= 30 OR blood_pressure_systolic >= 130 OR age >= 65
    ),

    -- Visit metrics
    total_visits INTEGER COMPUTED AS (
        SELECT COUNT(*) FROM MATCH (this)-[:HAD_VISIT]->(v:Visit)
    ),
    last_visit_days_ago INTEGER COMPUTED AS (
        SELECT MIN(DATEDIFF(DAY, v.date, NOW()))
        FROM MATCH (this)-[:HAD_VISIT]->(v:Visit)
    ),
    needs_checkup BOOLEAN COMPUTED AS (
        last_visit_days_ago IS NULL OR last_visit_days_ago > 365
    )
);
```

## Advanced Computation Patterns

### Multi-Level Aggregations

```gql
CREATE PROPERTY TYPE Team (
    name STRING,
    budget DECIMAL,

    -- Direct metrics
    member_count INTEGER COMPUTED AS (
        SELECT COUNT(*) FROM MATCH (this)-[:HAS_MEMBER]->(u:User)
    ),

    -- Project metrics
    active_projects INTEGER COMPUTED AS (
        SELECT COUNT(*)
        FROM MATCH (this)-[:OWNS]->(p:Project)
        WHERE p.status = 'active'
    ),

    -- Nested aggregation: total tasks across all projects
    total_tasks INTEGER COMPUTED AS (
        SELECT COUNT(*)
        FROM MATCH (this)-[:OWNS]->(p:Project)-[:HAS_TASK]->(t:Task)
    ),

    -- Average completion rate
    avg_completion_rate DECIMAL COMPUTED AS (
        SELECT AVG(
            CAST(COUNT(completed_tasks) AS DECIMAL) /
            NULLIF(COUNT(all_tasks), 0) * 100
        )
        FROM MATCH (this)-[:OWNS]->(p:Project)
        OPTIONAL MATCH (p)-[:HAS_TASK]->(all_tasks:Task)
        OPTIONAL MATCH (p)-[:HAS_TASK]->(completed_tasks:Task)
        WHERE completed_tasks.status = 'completed'
    ),

    -- Budget utilization
    total_spent DECIMAL COMPUTED AS (
        SELECT COALESCE(SUM(p.spent), 0)
        FROM MATCH (this)-[:OWNS]->(p:Project)
    ),
    budget_utilization DECIMAL COMPUTED AS (
        total_spent / NULLIF(budget, 0) * 100
    ),
    is_over_budget BOOLEAN COMPUTED AS (budget_utilization > 100)
);
```

### Time-Series Computations

```gql
CREATE PROPERTY TYPE Sensor (
    id STRING,
    location STRING,

    -- Latest reading
    latest_reading DECIMAL COMPUTED AS (
        SELECT r.value
        FROM MATCH (this)-[:RECORDED]->(r:Reading)
        ORDER BY r.timestamp DESC
        LIMIT 1
    ),

    -- Time-based aggregations
    readings_last_hour INTEGER COMPUTED AS (
        SELECT COUNT(*)
        FROM MATCH (this)-[:RECORDED]->(r:Reading)
        WHERE r.timestamp > NOW() - INTERVAL '1 hour'
    ),

    avg_last_hour DECIMAL COMPUTED AS (
        SELECT AVG(r.value)
        FROM MATCH (this)-[:RECORDED]->(r:Reading)
        WHERE r.timestamp > NOW() - INTERVAL '1 hour'
    ),

    max_last_24h DECIMAL COMPUTED AS (
        SELECT MAX(r.value)
        FROM MATCH (this)-[:RECORDED]->(r:Reading)
        WHERE r.timestamp > NOW() - INTERVAL '24 hours'
    ),

    min_last_24h DECIMAL COMPUTED AS (
        SELECT MIN(r.value)
        FROM MATCH (this)-[:RECORDED]->(r:Reading)
        WHERE r.timestamp > NOW() - INTERVAL '24 hours'
    ),

    -- Trend detection
    trend STRING COMPUTED AS (
        CASE
            WHEN avg_last_hour > max_last_24h * 0.9 THEN 'rising'
            WHEN avg_last_hour < min_last_24h * 1.1 THEN 'falling'
            ELSE 'stable'
        END
    ),

    -- Alert conditions
    is_anomalous BOOLEAN COMPUTED AS (
        latest_reading > avg_last_hour * 2 OR
        latest_reading < avg_last_hour * 0.5
    )
);
```

### Graph Topology Computations

```gql
CREATE PROPERTY TYPE Node (
    id STRING,
    name STRING,

    -- Degree computations
    out_degree INTEGER COMPUTED AS (
        SELECT COUNT(*) FROM MATCH (this)-[]->(n)
    ),
    in_degree INTEGER COMPUTED AS (
        SELECT COUNT(*) FROM MATCH (this)<-[]-(n)
    ),
    total_degree INTEGER COMPUTED AS (out_degree + in_degree),

    -- Neighborhood metrics
    neighbors INTEGER COMPUTED AS (
        SELECT COUNT(DISTINCT n) FROM MATCH (this)-[]-(n)
    ),

    second_order_neighbors INTEGER COMPUTED AS (
        SELECT COUNT(DISTINCT n2)
        FROM MATCH (this)-[]-(n1)-[]-(n2)
        WHERE n2 <> this
    ),

    -- Centrality indicators
    is_hub BOOLEAN COMPUTED AS (out_degree > 10),
    is_authority BOOLEAN COMPUTED AS (in_degree > 10),
    is_bridge BOOLEAN COMPUTED AS (
        total_degree = 2 AND
        out_degree = 1 AND
        in_degree = 1
    ),

    -- Clustering metrics
    triangle_count INTEGER COMPUTED AS (
        SELECT COUNT(*)
        FROM MATCH (this)-[]-(n1)-[]-(n2)-[]-(this)
        WHERE n1 < n2  -- Avoid counting same triangle multiple times
    ),

    clustering_coefficient DECIMAL COMPUTED AS (
        CASE
            WHEN neighbors <= 1 THEN 0
            ELSE CAST(triangle_count AS DECIMAL) /
                 (neighbors * (neighbors - 1) / 2)
        END
    )
);
```

## Performance Optimization Strategies

### Indexing Computed Properties

```gql
-- Index frequently queried computed properties
CREATE INDEX idx_user_age ON User(age);
CREATE INDEX idx_user_tier ON User(user_tier);
CREATE INDEX idx_account_health ON Account(health_score);
CREATE INDEX idx_product_profitable ON Product(is_profitable);

-- Composite indexes on computed + stored properties
CREATE INDEX idx_user_age_country ON User(age, country);
CREATE INDEX idx_order_recent_total ON Order(is_recent, total);
```

### Caching Computed Values

```gql
-- For expensive computations, consider materializing
CREATE MATERIALIZED VIEW user_engagement_cache AS
SELECT
    u.id,
    u.full_name,
    u.follower_count,
    u.engagement_score,
    u.user_tier
FROM User u
WITH REFRESH SCHEDULE '0 */6 * * *';  -- Refresh every 6 hours
```

### Optimizing Aggregation Queries

```gql
-- Avoid deep nested aggregations in computed properties
-- Instead, use incremental counters updated via triggers

CREATE PROPERTY TYPE Team (
    name STRING,
    member_count_cache INTEGER DEFAULT 0,  -- Cached value

    -- Trigger to update cache
    AFTER INSERT RELATIONSHIP [:HAS_MEMBER] AS (
        UPDATE this SET member_count_cache = member_count_cache + 1
    ),
    AFTER DELETE RELATIONSHIP [:HAS_MEMBER] AS (
        UPDATE this SET member_count_cache = member_count_cache - 1
    )
);
```

## Best Practices

### Design Guidelines

1. **Keep Formulas Simple**: Complex calculations impact query performance
   - Prefer simple arithmetic over nested subqueries
   - Limit relationship traversal depth to 1-2 hops
   - Use materialized views for complex aggregations

2. **Document Complex Calculations**: Add comments explaining business logic
   ```gql
   -- Customer lifetime value: total purchases adjusted for returns
   -- and weighted by recency (last 90 days = 1.5x multiplier)
   lifetime_value DECIMAL COMPUTED AS (...)
   ```

3. **Choose Appropriate Data Types**: Match types to computation results
   - Use DECIMAL for financial calculations
   - Use INTEGER for counts and IDs
   - Use BOOLEAN for flags and conditions

4. **Consider Materialization**: Cache expensive computations
   - If computed property takes >100ms to calculate
   - If queried frequently (>1000 times/day)
   - If result changes infrequently

5. **Use Defensive Programming**: Handle NULL and edge cases
   ```gql
   safe_ratio DECIMAL COMPUTED AS (
       CAST(numerator AS DECIMAL) / NULLIF(denominator, 0)
   )
   ```

### Testing Guidelines

1. **Unit Test Formulas**: Verify calculations with known inputs
2. **Test Edge Cases**: NULL values, zero division, negative numbers
3. **Performance Test**: Benchmark with realistic data volumes
4. **Validate Types**: Ensure computed types match declarations
5. **Test Index Usage**: Verify indexes on computed properties work

### Monitoring and Maintenance

```gql
-- Query to identify slow computed properties
SELECT
    property_name,
    avg_computation_time_ms,
    call_count,
    total_time_ms
FROM system.computed_property_stats
WHERE avg_computation_time_ms > 50
ORDER BY total_time_ms DESC
LIMIT 20;
```

## Common Pitfalls to Avoid

1. **Circular Dependencies**: Don't reference computed properties that depend on each other
2. **Deep Relationship Traversal**: Limit MATCH depth in computed properties
3. **Missing NULL Handling**: Always handle potential NULL values
4. **Type Mismatches**: Ensure expression types match property types
5. **Expensive Aggregations**: Avoid COUNT(*) on large relationship sets

## Related Topics

- [Virtual Properties](/tags/virtual-properties/) - On-demand non-stored calculations
- [Materialized Views](/tags/materialized-views/) - Cached pre-computed results
- [Indexes](/tags/indexes/) - Indexing strategies for computed properties
- [Types](/tags/types/) - Property type definitions
- [Aggregation](/tags/aggregation/) - Aggregation functions and patterns
- [Performance](/tags/performance/) - Query optimization techniques

## Further Reading

- [ISO/IEC 39075:2024 GQL Standard](https://www.iso.org/standard/76120.html) - Official GQL specification
- [Computed Columns in SQL](https://docs.microsoft.com/en-us/sql/relational-databases/tables/specify-computed-columns-in-a-table) - SQL Server reference
- [Generated Columns (PostgreSQL)](https://www.postgresql.org/docs/current/ddl-generated-columns.html) - PostgreSQL documentation
- [Derived Attributes](https://neo4j.com/docs/cypher-manual/current/functions/scalar/#functions-coalesce) - Graph database patterns
