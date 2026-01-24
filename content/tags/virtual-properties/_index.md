---
title: "Virtual Properties - On-Demand Calculated Attributes"
description: "Complete guide to virtual properties in Geode: non-stored, on-demand calculated properties that provide fresh computed values without storage overhead. Perfect for transient calculations, formatting, and frequently-changing derived data."
keywords:
  - virtual properties
  - transient properties
  - calculated attributes
  - on-the-fly computation
  - derived attributes
  - runtime properties
  - non-stored properties
  - dynamic calculation
  - zero storage
  - computed on read
  - property calculation
  - formatting logic
  - presentation layer
weight: 10
---

# Virtual Properties

Virtual properties are calculated on-demand at query time and never persisted to storage. They provide dynamically computed values derived from stored properties, relationships, or external data sources without consuming disk space. Ideal for transient calculations, display formatting, and derived data that changes frequently or is rarely queried.

## Understanding Virtual Properties

### What are Virtual Properties?

Virtual properties offer zero-storage computation:

**Never Stored** - Calculated only when accessed, no disk persistence
**Always Fresh** - Reflect current state of underlying data
**Zero Storage Cost** - No disk space or memory overhead
**Flexible** - Easy to modify without data migration
**Query-Time Evaluation** - Computed during SELECT execution

### Virtual vs Computed vs Stored Properties

| Aspect | Stored Property | Computed Property | Virtual Property |
|--------|----------------|-------------------|------------------|
| Storage | Full persistence | Sometimes cached | Never stored |
| Calculation | Never | On write or read | Always on read |
| Read Performance | Fastest | Medium | Slowest |
| Write Performance | Fastest | Slower (compute) | N/A (no writes) |
| Data Freshness | May be stale | Always current | Always current |
| Disk Usage | High | Medium | Zero |
| Indexable | Yes | Yes | No |
| Use Case | Core data | Frequently queried | Rarely queried |

### When to Use Virtual Properties

**Ideal For**:
- Display formatting (phone numbers, dates, names)
- Simple arithmetic transformations
- Frequently changing business logic
- Properties queried infrequently
- Transient derived values
- Presentation layer logic

**Avoid When**:
- Need to filter/sort by the property frequently
- Complex expensive computations
- Aggregations across many nodes
- Need indexes for performance
- Value used in WHERE clauses often

## Defining Virtual Properties

### Basic Virtual Properties

```gql
CREATE PROPERTY TYPE Person (
    first_name STRING,
    last_name STRING,
    birth_date DATE,
    email STRING,

    -- Virtual properties for display
    VIRTUAL full_name STRING AS (
        first_name || ' ' || last_name
    ),

    VIRTUAL display_name STRING AS (
        CASE
            WHEN first_name IS NOT NULL AND last_name IS NOT NULL
                THEN first_name || ' ' || last_name
            WHEN first_name IS NOT NULL
                THEN first_name
            WHEN last_name IS NOT NULL
                THEN last_name
            ELSE 'Anonymous'
        END
    ),

    VIRTUAL initials STRING AS (
        UPPER(SUBSTRING(first_name, 1, 1) || SUBSTRING(last_name, 1, 1))
    ),

    -- Age calculation (always current)
    VIRTUAL age INTEGER AS (
        DATEDIFF(YEAR, birth_date, CURRENT_DATE)
    ),

    VIRTUAL is_adult BOOLEAN AS (
        age >= 18
    ),

    -- Email domain extraction
    VIRTUAL email_domain STRING AS (
        SUBSTRING(email FROM POSITION('@' IN email) + 1)
    ),

    VIRTUAL email_username STRING AS (
        SUBSTRING(email FROM 1 FOR POSITION('@' IN email) - 1)
    )
);
```

### Formatting Virtual Properties

```gql
CREATE PROPERTY TYPE Contact (
    phone STRING,                     -- Stored as "1234567890"
    address_line1 STRING,
    address_line2 STRING,
    city STRING,
    state STRING,
    zip STRING,
    country STRING,

    -- Phone number formatting
    VIRTUAL formatted_phone STRING AS (
        CASE
            WHEN LENGTH(phone) = 10 THEN
                '(' || SUBSTRING(phone, 1, 3) || ') ' ||
                SUBSTRING(phone, 4, 3) || '-' ||
                SUBSTRING(phone, 7, 4)
            WHEN LENGTH(phone) = 11 THEN
                '+' || SUBSTRING(phone, 1, 1) || ' (' ||
                SUBSTRING(phone, 2, 3) || ') ' ||
                SUBSTRING(phone, 5, 3) || '-' ||
                SUBSTRING(phone, 8, 4)
            ELSE phone
        END
    ),

    -- Full address formatting
    VIRTUAL full_address STRING AS (
        address_line1 ||
        CASE WHEN address_line2 IS NOT NULL
            THEN ', ' || address_line2
            ELSE ''
        END ||
        ', ' || city || ', ' || state || ' ' || zip ||
        CASE WHEN country IS NOT NULL AND country <> 'USA'
            THEN ', ' || country
            ELSE ''
        END
    ),

    -- Short address for display
    VIRTUAL short_address STRING AS (
        city || ', ' || state
    )
);
```

### Relationship-Based Virtual Properties

```gql
CREATE PROPERTY TYPE User (
    id STRING,
    name STRING,
    created_at TIMESTAMP,

    -- Relationship counts (calculated on access)
    VIRTUAL follower_count INTEGER AS (
        SELECT COUNT(*)
        FROM MATCH (this)<-[:FOLLOWS]-(follower:User)
    ),

    VIRTUAL following_count INTEGER AS (
        SELECT COUNT(*)
        FROM MATCH (this)-[:FOLLOWS]->(following:User)
    ),

    VIRTUAL friend_count INTEGER AS (
        SELECT COUNT(*)
        FROM MATCH (this)-[:FRIEND]-(friend:User)
    ),

    VIRTUAL post_count INTEGER AS (
        SELECT COUNT(*)
        FROM MATCH (this)-[:POSTED]->(post:Post)
    ),

    -- Derived metrics
    VIRTUAL follower_ratio DECIMAL AS (
        CAST(follower_count AS DECIMAL) /
        NULLIF(following_count, 0)
    ),

    VIRTUAL engagement_rate DECIMAL AS (
        CAST(follower_count + post_count * 10 AS DECIMAL) /
        NULLIF(DATEDIFF(DAY, created_at, NOW()), 0)
    ),

    -- List properties
    VIRTUAL follower_ids LIST<STRING> AS (
        SELECT u.id
        FROM MATCH (this)<-[:FOLLOWS]-(u:User)
        ORDER BY u.name
    ),

    VIRTUAL following_ids LIST<STRING> AS (
        SELECT u.id
        FROM MATCH (this)-[:FOLLOWS]->(u:User)
        ORDER BY u.name
    ),

    -- Boolean checks
    VIRTUAL has_followers BOOLEAN AS (follower_count > 0),
    VIRTUAL is_following_anyone BOOLEAN AS (following_count > 0),
    VIRTUAL is_active BOOLEAN AS (
        post_count > 0 AND
        DATEDIFF(DAY, created_at, NOW()) > 30
    )
);
```

### Time-Based Virtual Properties

```gql
CREATE PROPERTY TYPE Order (
    id STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    status STRING,
    total DECIMAL,

    -- Time since events
    VIRTUAL days_since_created INTEGER AS (
        DATEDIFF(DAY, created_at, NOW())
    ),

    VIRTUAL hours_since_updated INTEGER AS (
        DATEDIFF(HOUR, updated_at, NOW())
    ),

    -- Time periods
    VIRTUAL is_recent BOOLEAN AS (days_since_created <= 7),
    VIRTUAL is_this_month BOOLEAN AS (
        MONTH(created_at) = MONTH(NOW()) AND
        YEAR(created_at) = YEAR(NOW())
    ),

    -- Processing times
    VIRTUAL processing_time_hours INTEGER AS (
        CASE
            WHEN shipped_at IS NOT NULL
                THEN DATEDIFF(HOUR, created_at, shipped_at)
            ELSE NULL
        END
    ),

    VIRTUAL delivery_time_hours INTEGER AS (
        CASE
            WHEN delivered_at IS NOT NULL AND shipped_at IS NOT NULL
                THEN DATEDIFF(HOUR, shipped_at, delivered_at)
            ELSE NULL
        END
    ),

    VIRTUAL total_time_hours INTEGER AS (
        CASE
            WHEN delivered_at IS NOT NULL
                THEN DATEDIFF(HOUR, created_at, delivered_at)
            ELSE NULL
        END
    ),

    -- Order age category
    VIRTUAL age_category STRING AS (
        CASE
            WHEN days_since_created <= 1 THEN 'today'
            WHEN days_since_created <= 7 THEN 'this_week'
            WHEN days_since_created <= 30 THEN 'this_month'
            WHEN days_since_created <= 90 THEN 'recent'
            WHEN days_since_created <= 365 THEN 'this_year'
            ELSE 'old'
        END
    ),

    -- Status checks
    VIRTUAL is_pending BOOLEAN AS (status IN ('pending', 'processing')),
    VIRTUAL is_completed BOOLEAN AS (status = 'delivered'),
    VIRTUAL is_overdue BOOLEAN AS (
        status IN ('pending', 'processing') AND
        days_since_created > 7
    ),

    -- Price categorization
    VIRTUAL price_tier STRING AS (
        CASE
            WHEN total < 25 THEN 'budget'
            WHEN total < 100 THEN 'standard'
            WHEN total < 500 THEN 'premium'
            ELSE 'luxury'
        END
    )
);
```

## Real-World Use Cases

### E-Commerce Product Display

```gql
CREATE PROPERTY TYPE Product (
    name STRING,
    base_price DECIMAL,
    discount_percentage DECIMAL,
    cost DECIMAL,
    stock_quantity INTEGER,
    category STRING,
    brand STRING,

    -- Pricing display
    VIRTUAL discount_amount DECIMAL AS (
        base_price * discount_percentage / 100
    ),

    VIRTUAL sale_price DECIMAL AS (
        base_price - discount_amount
    ),

    VIRTUAL formatted_price STRING AS (
        '$' || CAST(ROUND(sale_price, 2) AS STRING)
    ),

    VIRTUAL savings_display STRING AS (
        CASE
            WHEN discount_percentage > 0
                THEN 'Save $' || CAST(ROUND(discount_amount, 2) AS STRING) ||
                     ' (' || CAST(discount_percentage AS STRING) || '% off)'
            ELSE NULL
        END
    ),

    -- Stock status
    VIRTUAL in_stock BOOLEAN AS (stock_quantity > 0),

    VIRTUAL stock_status STRING AS (
        CASE
            WHEN stock_quantity = 0 THEN 'Out of Stock'
            WHEN stock_quantity < 5 THEN 'Only ' || CAST(stock_quantity AS STRING) || ' left!'
            WHEN stock_quantity < 20 THEN 'Low Stock'
            ELSE 'In Stock'
        END
    ),

    VIRTUAL stock_badge_color STRING AS (
        CASE
            WHEN stock_quantity = 0 THEN 'red'
            WHEN stock_quantity < 5 THEN 'orange'
            WHEN stock_quantity < 20 THEN 'yellow'
            ELSE 'green'
        END
    ),

    -- Profit metrics (for internal use)
    VIRTUAL profit_per_unit DECIMAL AS (sale_price - cost),
    VIRTUAL profit_margin_percent DECIMAL AS (
        (sale_price - cost) / NULLIF(sale_price, 0) * 100
    ),

    -- Review aggregation
    VIRTUAL avg_rating DECIMAL AS (
        SELECT AVG(r.rating)
        FROM MATCH (this)<-[:REVIEWS]-(r:Review)
    ),

    VIRTUAL review_count INTEGER AS (
        SELECT COUNT(*)
        FROM MATCH (this)<-[:REVIEWS]-(r:Review)
    ),

    VIRTUAL rating_display STRING AS (
        CASE
            WHEN review_count = 0 THEN 'No reviews yet'
            ELSE CAST(ROUND(avg_rating, 1) AS STRING) || '/5 (' ||
                 CAST(review_count AS STRING) || ' reviews)'
        END
    ),

    -- SEO-friendly slug
    VIRTUAL url_slug STRING AS (
        LOWER(REPLACE(REPLACE(name, ' ', '-'), '''', ''))
    )
);
```

### User Profile Display

```gql
CREATE PROPERTY TYPE UserProfile (
    user_id STRING,
    username STRING,
    first_name STRING,
    last_name STRING,
    bio TEXT,
    location STRING,
    website_url STRING,
    twitter_handle STRING,
    joined_date TIMESTAMP,
    last_active_at TIMESTAMP,
    profile_image_url STRING,
    cover_image_url STRING,

    -- Display name logic
    VIRTUAL display_name STRING AS (
        COALESCE(
            NULLIF(first_name || ' ' || last_name, ' '),
            username,
            'User' || user_id
        )
    ),

    -- Membership duration
    VIRTUAL member_since STRING AS (
        CASE
            WHEN DATEDIFF(DAY, joined_date, NOW()) < 30
                THEN 'Joined ' || CAST(DATEDIFF(DAY, joined_date, NOW()) AS STRING) || ' days ago'
            WHEN DATEDIFF(MONTH, joined_date, NOW()) < 12
                THEN 'Member for ' || CAST(DATEDIFF(MONTH, joined_date, NOW()) AS STRING) || ' months'
            ELSE 'Member for ' || CAST(DATEDIFF(YEAR, joined_date, NOW()) AS STRING) || ' years'
        END
    ),

    -- Activity status
    VIRTUAL activity_status STRING AS (
        CASE
            WHEN DATEDIFF(MINUTE, last_active_at, NOW()) < 5 THEN 'Online'
            WHEN DATEDIFF(HOUR, last_active_at, NOW()) < 1 THEN 'Active recently'
            WHEN DATEDIFF(DAY, last_active_at, NOW()) < 1 THEN 'Active today'
            WHEN DATEDIFF(DAY, last_active_at, NOW()) < 7 THEN 'Active this week'
            ELSE 'Inactive'
        END
    ),

    VIRTUAL status_badge_color STRING AS (
        CASE
            WHEN DATEDIFF(MINUTE, last_active_at, NOW()) < 5 THEN 'green'
            WHEN DATEDIFF(HOUR, last_active_at, NOW()) < 1 THEN 'yellow'
            ELSE 'gray'
        END
    ),

    -- Social links
    VIRTUAL twitter_url STRING AS (
        CASE
            WHEN twitter_handle IS NOT NULL
                THEN 'https://twitter.com/' || twitter_handle
            ELSE NULL
        END
    ),

    VIRTUAL profile_url STRING AS (
        '/users/' || username
    ),

    -- Profile completeness
    VIRTUAL profile_completeness INTEGER AS (
        (CASE WHEN first_name IS NOT NULL THEN 10 ELSE 0 END) +
        (CASE WHEN last_name IS NOT NULL THEN 10 ELSE 0 END) +
        (CASE WHEN bio IS NOT NULL THEN 20 ELSE 0 END) +
        (CASE WHEN location IS NOT NULL THEN 10 ELSE 0 END) +
        (CASE WHEN website_url IS NOT NULL THEN 10 ELSE 0 END) +
        (CASE WHEN profile_image_url IS NOT NULL THEN 20 ELSE 0 END) +
        (CASE WHEN cover_image_url IS NOT NULL THEN 20 ELSE 0 END)
    ),

    VIRTUAL profile_complete BOOLEAN AS (profile_completeness >= 80),

    -- Truncated bio for previews
    VIRTUAL bio_preview STRING AS (
        CASE
            WHEN LENGTH(bio) <= 100 THEN bio
            ELSE SUBSTRING(bio, 1, 97) || '...'
        END
    )
);
```

### Financial Account Summary

```gql
CREATE PROPERTY TYPE Account (
    account_number STRING,
    account_type STRING,
    balance DECIMAL,
    currency STRING,
    interest_rate DECIMAL,
    opened_date DATE,
    status STRING,

    -- Display formatting
    VIRTUAL masked_account_number STRING AS (
        '****' || SUBSTRING(account_number, LENGTH(account_number) - 3, 4)
    ),

    VIRTUAL formatted_balance STRING AS (
        CASE currency
            WHEN 'USD' THEN '$' || CAST(ROUND(balance, 2) AS STRING)
            WHEN 'EUR' THEN '€' || CAST(ROUND(balance, 2) AS STRING)
            WHEN 'GBP' THEN '£' || CAST(ROUND(balance, 2) AS STRING)
            ELSE CAST(ROUND(balance, 2) AS STRING) || ' ' || currency
        END
    ),

    -- Account age
    VIRTUAL account_age_years DECIMAL AS (
        DATEDIFF(DAY, opened_date, CURRENT_DATE) / 365.25
    ),

    VIRTUAL account_age_display STRING AS (
        CASE
            WHEN DATEDIFF(DAY, opened_date, CURRENT_DATE) < 30
                THEN CAST(DATEDIFF(DAY, opened_date, CURRENT_DATE) AS STRING) || ' days old'
            WHEN DATEDIFF(MONTH, opened_date, CURRENT_DATE) < 12
                THEN CAST(DATEDIFF(MONTH, opened_date, CURRENT_DATE) AS STRING) || ' months old'
            ELSE CAST(FLOOR(account_age_years) AS STRING) || ' years old'
        END
    ),

    -- Interest calculations
    VIRTUAL monthly_interest DECIMAL AS (
        balance * interest_rate / 12 / 100
    ),

    VIRTUAL annual_interest DECIMAL AS (
        balance * interest_rate / 100
    ),

    VIRTUAL interest_display STRING AS (
        CAST(interest_rate AS STRING) || '% APY'
    ),

    -- Balance status
    VIRTUAL balance_status STRING AS (
        CASE
            WHEN balance < 0 THEN 'Overdrawn'
            WHEN balance = 0 THEN 'Zero Balance'
            WHEN balance < 100 THEN 'Low Balance'
            WHEN balance < 10000 THEN 'Normal'
            ELSE 'High Balance'
        END
    ),

    VIRTUAL balance_badge_color STRING AS (
        CASE
            WHEN balance < 0 THEN 'red'
            WHEN balance < 100 THEN 'orange'
            ELSE 'green'
        END
    ),

    -- Account status
    VIRTUAL is_active BOOLEAN AS (status = 'active'),
    VIRTUAL is_frozen BOOLEAN AS (status = 'frozen'),

    VIRTUAL status_display STRING AS (
        CASE status
            WHEN 'active' THEN 'Active'
            WHEN 'frozen' THEN 'Temporarily Frozen'
            WHEN 'closed' THEN 'Closed'
            WHEN 'pending' THEN 'Pending Activation'
            ELSE INITCAP(status)
        END
    )
);
```

## Querying Virtual Properties

### Selection and Filtering

```gql
-- Select virtual properties
MATCH (p:Person)
RETURN
    p.first_name,
    p.last_name,
    p.full_name,           -- Virtual property
    p.age,                 -- Virtual property
    p.email_domain;        -- Virtual property

-- Filter using virtual properties
MATCH (p:Person)
WHERE p.age >= 21 AND p.is_adult = true
RETURN p.display_name, p.age;

-- Sort by virtual property
MATCH (u:User)
RETURN u.name, u.follower_ratio
ORDER BY u.follower_ratio DESC
LIMIT 10;
```

### Conditional Logic with Virtual Properties

```gql
-- Use virtual properties in CASE expressions
MATCH (o:Order)
RETURN
    o.id,
    o.total,
    o.age_category,
    CASE o.price_tier
        WHEN 'luxury' THEN 'Premium Shipping'
        WHEN 'premium' THEN 'Express Shipping'
        ELSE 'Standard Shipping'
    END AS recommended_shipping;

-- Complex filtering
MATCH (p:Product)
WHERE p.in_stock = true
  AND p.profit_margin_percent > 20
  AND p.avg_rating >= 4.0
RETURN
    p.name,
    p.formatted_price,
    p.stock_status,
    p.rating_display;
```

## Performance Considerations

### Optimization Strategies

```gql
-- AVOID: Expensive aggregation in virtual property used in WHERE
MATCH (u:User)
WHERE u.follower_count > 1000  -- Slow if follower_count is virtual
RETURN u.name;

-- BETTER: Use computed property or index
CREATE INDEX idx_user_follower_count ON User(follower_count);

-- AVOID: Deep relationship traversal in virtual property
VIRTUAL friends_of_friends_count INTEGER AS (
    SELECT COUNT(DISTINCT fof)
    FROM MATCH (this)-[:FRIEND]-()-[:FRIEND]-(fof)
);  -- Too expensive!

-- BETTER: Limit depth or materialize
VIRTUAL direct_friends_count INTEGER AS (
    SELECT COUNT(*)
    FROM MATCH (this)-[:FRIEND]-(f)
);  -- Much faster
```

### Caching Virtual Property Results

```gql
-- In application code, cache virtual property results
-- Python example:
from functools import lru_cache
from datetime import datetime, timedelta

class User:
    @property
    @lru_cache(maxsize=128)
    def follower_count(self):
        # Virtual property result cached for 5 minutes
        return self._calculate_follower_count()

# Go example:
type User struct {
    followerCountCache int
    followerCountExpiry time.Time
}

func (u *User) FollowerCount() int {
    if time.Now().Before(u.followerCountExpiry) {
        return u.followerCountCache
    }
    count := u.calculateFollowerCount()
    u.followerCountCache = count
    u.followerCountExpiry = time.Now().Add(5 * time.Minute)
    return count
}
```

## Best Practices

### Design Guidelines

1. **Keep Calculations Simple**: Virtual properties should be fast (<10ms)
2. **Avoid Deep Traversals**: Limit relationship traversal to 1-2 hops
3. **Use for Display Logic**: Perfect for formatting, not complex business rules
4. **Handle NULL Values**: Always use COALESCE or CASE for NULL safety
5. **Document Purpose**: Explain why property is virtual vs computed/stored

### When to Convert to Computed/Stored

**Convert to Computed Property If**:
- Queried frequently (>1000 times/day)
- Used in WHERE clauses often
- Need to create index on the property
- Calculation time > 50ms

**Convert to Stored Property If**:
- Value rarely changes
- Need guaranteed consistent reads
- Complex expensive calculation
- Historical values matter

### Testing Virtual Properties

```gql
-- Test virtual property logic
SELECT
    u.first_name,
    u.last_name,
    u.full_name,
    -- Verify calculation manually
    u.first_name || ' ' || u.last_name AS expected_full_name
FROM User u
WHERE u.full_name <> (u.first_name || ' ' || u.last_name)
LIMIT 10;  -- Should return 0 rows if logic is correct
```

## Common Patterns

### Default Value Pattern

```gql
VIRTUAL display_value STRING AS (
    COALESCE(NULLIF(custom_value, ''), default_value, 'N/A')
)
```

### Conditional Display Pattern

```gql
VIRTUAL status_display STRING AS (
    CASE
        WHEN condition1 THEN 'Display Text 1'
        WHEN condition2 THEN 'Display Text 2'
        ELSE 'Default Display'
    END
)
```

### Aggregation Pattern

```gql
VIRTUAL count_related INTEGER AS (
    SELECT COUNT(*)
    FROM MATCH (this)-[:RELATED]->(related)
)
```

### Formatting Pattern

```gql
VIRTUAL formatted_value STRING AS (
    prefix || ' ' || CAST(numeric_value AS STRING) || ' ' || suffix
)
```

## Troubleshooting

### Slow Query Performance

```gql
-- Use EXPLAIN to identify slow virtual properties
EXPLAIN ANALYZE
SELECT u.name, u.virtual_property
FROM User u
WHERE u.another_virtual_property > 100;

-- Profile query execution
PROFILE
SELECT * FROM User LIMIT 100;
-- Check time spent evaluating virtual properties
```

### NULL Handling Issues

```gql
-- Problem: NULL concatenation returns NULL
VIRTUAL full_address STRING AS (
    street || ', ' || city || ', ' || state
);  -- Returns NULL if any field is NULL

-- Solution: Use COALESCE
VIRTUAL full_address STRING AS (
    COALESCE(street, '') ||
    CASE WHEN city IS NOT NULL THEN ', ' || city ELSE '' END ||
    CASE WHEN state IS NOT NULL THEN ', ' || state ELSE '' END
);
```

## Related Topics

- [Computed Properties](/tags/computed-properties/) - Stored calculated properties
- [Materialized Views](/tags/materialized-views/) - Cached query results
- [Property Types](/tags/property-types/) - Property type definitions
- [Performance](/tags/performance/) - Query optimization
- [Formatting](/tags/formatting/) - Data formatting patterns

## Further Reading

- [Virtual Columns (Oracle)](https://oracle-base.com/articles/11g/virtual-columns-11gr1) - Oracle documentation
- [Generated Columns (MySQL)](https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html) - MySQL reference
- [Computed Columns (SQL Server)](https://docs.microsoft.com/en-us/sql/relational-databases/tables/specify-computed-columns-in-a-table) - SQL Server guide
