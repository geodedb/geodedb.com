---
title: "Temporal Data and Time-Series"
description: "Master temporal data handling in Geode with date/time types, duration calculations, time-series patterns, temporal queries, and historical data modeling. Learn GQL temporal functions and time-based analytics."
keywords:
  - temporal
  - datetime
  - timestamp
  - duration
  - time-series
  - temporal queries
  - date functions
  - time functions
  - historical data
  - bi-temporal
  - Geode
  - GQL
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/temporal/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Temporal Data and Time-Series in Geode

Temporal data management is essential for tracking when events occur, how entities change over time, and analyzing time-based patterns. Geode provides comprehensive support for temporal data types, functions, and query patterns aligned with the ISO/IEC 39075:2024 GQL standard.

Whether you are building audit systems, tracking user activity, analyzing time-series data, or implementing bi-temporal data models, Geode offers the primitives and query capabilities to handle temporal requirements effectively.

## Temporal Data Types

Geode supports the following temporal types:

### DATE

Represents a calendar date without time information.

```gql
-- Create nodes with DATE properties
CREATE (event:Event {
    id: 'evt_001',
    name: 'Product Launch',
    event_date: DATE '2025-03-15'
});

-- Date from components
CREATE (holiday:Holiday {
    name: 'Independence Day',
    date: date(2025, 7, 4)
});

-- Current date
CREATE (log:AuditLog {
    action: 'USER_CREATED',
    log_date: current_date()
});
```

### TIME

Represents time of day without date information.

```gql
-- Store time values
CREATE (schedule:Schedule {
    store_id: 'store_001',
    opens_at: TIME '09:00:00',
    closes_at: TIME '21:00:00'
});

-- Time with timezone
CREATE (meeting:Meeting {
    title: 'Team Standup',
    scheduled_time: TIME '10:30:00-05:00'  -- EST
});

-- Current time
CREATE (entry:TimeEntry {
    clock_in: current_time()
});
```

### DATETIME / TIMESTAMP

Represents a specific point in time with date, time, and optional timezone.

```gql
-- Full datetime with timezone
CREATE (order:Order {
    id: 'order_001',
    placed_at: datetime('2025-01-15T14:30:00Z'),
    status: 'pending'
});

-- Datetime from components
CREATE (appointment:Appointment {
    datetime: datetime(2025, 6, 15, 10, 30, 0)
});

-- Current timestamp
CREATE (session:Session {
    user_id: 'user_001',
    started_at: datetime(),
    last_activity: datetime()
});

-- Parse from ISO 8601 string
MATCH (o:Order {id: 'order_001'})
SET o.shipped_at = datetime('2025-01-16T09:00:00-08:00');
```

### DURATION

Represents a time span or interval.

```gql
-- Duration literals
CREATE (subscription:Subscription {
    plan: 'annual',
    duration: DURATION 'P1Y',  -- 1 year
    created_at: datetime()
});

-- Duration components
-- P = period, T = time separator
-- Y=years, M=months, D=days, H=hours, M=minutes, S=seconds
CREATE (trial:Trial {
    name: 'Free Trial',
    length: DURATION 'P14D'  -- 14 days
});

CREATE (timeout:Config {
    name: 'session_timeout',
    value: DURATION 'PT30M'  -- 30 minutes
});

-- Duration arithmetic
MATCH (s:Subscription {plan: 'annual'})
SET s.expires_at = s.created_at + s.duration;
```

## Temporal Functions

### Date/Time Component Extraction

```gql
-- Extract components from datetime
MATCH (o:Order)
RETURN o.id,
       year(o.placed_at) AS order_year,
       month(o.placed_at) AS order_month,
       day(o.placed_at) AS order_day,
       hour(o.placed_at) AS order_hour,
       minute(o.placed_at) AS order_minute,
       second(o.placed_at) AS order_second;

-- Day of week (1=Monday, 7=Sunday)
MATCH (e:Event)
RETURN e.name,
       dayOfWeek(e.event_date) AS weekday,
       dayOfYear(e.event_date) AS day_of_year;

-- Week and quarter
MATCH (s:Sale)
RETURN week(s.sale_date) AS week_number,
       quarter(s.sale_date) AS quarter;
```

### Date/Time Arithmetic

```gql
-- Add duration to datetime
MATCH (s:Subscription)
SET s.renewal_date = s.start_date + DURATION 'P1Y';

-- Subtract duration
MATCH (u:User)
WHERE u.last_login < datetime() - DURATION 'P30D'
SET u.status = 'inactive';

-- Difference between dates (returns duration)
MATCH (o:Order)
WHERE o.delivered_at IS NOT NULL
RETURN o.id,
       o.delivered_at - o.placed_at AS delivery_time;

-- Add specific time units
MATCH (t:Task)
SET t.due_date = t.created_at + DURATION 'P7D';  -- 7 days later
```

### Truncation and Rounding

```gql
-- Truncate to start of period
MATCH (e:Event)
RETURN e.name,
       date_trunc('month', e.event_date) AS month_start,
       date_trunc('year', e.event_date) AS year_start,
       date_trunc('week', e.event_date) AS week_start;

-- Truncate datetime
MATCH (l:LoginEvent)
RETURN date_trunc('hour', l.timestamp) AS hour,
       COUNT(*) AS login_count
ORDER BY hour;

-- Round to nearest interval
MATCH (m:Measurement)
RETURN date_trunc('minute', m.recorded_at) AS minute,
       AVG(m.value) AS avg_value
ORDER BY minute;
```

### Formatting and Parsing

```gql
-- Format datetime as string
MATCH (o:Order)
RETURN o.id,
       format_datetime(o.placed_at, 'YYYY-MM-DD') AS date_str,
       format_datetime(o.placed_at, 'YYYY-MM-DD HH:mm:ss') AS full_str;

-- Parse string to datetime
MATCH (import:ImportRecord)
SET import.parsed_date = parse_datetime(import.date_string, 'MM/DD/YYYY');
```

## Time-Based Query Patterns

### Range Queries

```gql
-- Events within date range
MATCH (e:Event)
WHERE e.event_date >= DATE '2025-01-01'
  AND e.event_date < DATE '2025-04-01'
RETURN e.name, e.event_date
ORDER BY e.event_date;

-- Orders in last 30 days
MATCH (o:Order)
WHERE o.placed_at >= datetime() - DURATION 'P30D'
RETURN o.id, o.total, o.placed_at;

-- Activity within time window
MATCH (s:Session)
WHERE s.started_at >= datetime() - DURATION 'PT1H'
RETURN COUNT(s) AS active_sessions;
```

### Time-Based Aggregations

```gql
-- Daily order totals
MATCH (o:Order)
WHERE o.placed_at >= datetime() - DURATION 'P7D'
RETURN date(o.placed_at) AS order_date,
       COUNT(o) AS order_count,
       SUM(o.total) AS daily_revenue
ORDER BY order_date;

-- Hourly traffic analysis
MATCH (v:PageView)
WHERE v.timestamp >= datetime() - DURATION 'P1D'
RETURN date_trunc('hour', v.timestamp) AS hour,
       COUNT(v) AS views
ORDER BY hour;

-- Monthly user signups
MATCH (u:User)
WHERE u.created_at >= datetime() - DURATION 'P1Y'
RETURN year(u.created_at) AS year,
       month(u.created_at) AS month,
       COUNT(u) AS new_users
ORDER BY year, month;

-- Weekly active users
MATCH (u:User)-[:PERFORMED]->(a:Activity)
WHERE a.timestamp >= datetime() - DURATION 'P7D'
RETURN COUNT(DISTINCT u) AS weekly_active_users;
```

### Period Comparisons

```gql
-- Compare current period to previous
WITH datetime() AS now,
     datetime() - DURATION 'P7D' AS week_ago,
     datetime() - DURATION 'P14D' AS two_weeks_ago

MATCH (o:Order)
WHERE o.placed_at >= two_weeks_ago

WITH now, week_ago, two_weeks_ago,
     SUM(CASE WHEN o.placed_at >= week_ago THEN o.total ELSE 0 END) AS current_week,
     SUM(CASE WHEN o.placed_at < week_ago THEN o.total ELSE 0 END) AS previous_week

RETURN current_week,
       previous_week,
       (current_week - previous_week) / previous_week * 100 AS percent_change;

-- Year-over-year comparison
MATCH (s:Sale)
WHERE year(s.sale_date) IN [2024, 2025]
  AND month(s.sale_date) = 1
RETURN year(s.sale_date) AS year,
       SUM(s.amount) AS january_sales
ORDER BY year;
```

## Temporal Data Modeling Patterns

### Event Timestamps

Track when events occur with immutable timestamps:

```gql
-- Audit trail pattern
CREATE (al:AuditLog {
    id: randomUUID(),
    entity_type: 'User',
    entity_id: $user_id,
    action: 'UPDATE',
    changes: $change_json,
    performed_by: $actor_id,
    performed_at: datetime()
});

-- Query audit history
MATCH (al:AuditLog {entity_type: 'User', entity_id: $user_id})
RETURN al.action, al.changes, al.performed_by, al.performed_at
ORDER BY al.performed_at DESC
LIMIT 50;
```

### Temporal Relationships

Add time bounds to relationships:

```gql
-- Employment with date range
CREATE (person)-[:EMPLOYED_AT {
    role: 'Software Engineer',
    start_date: DATE '2022-03-15',
    end_date: null  -- Current position
}]->(company);

-- Query current employment
MATCH (p:Person)-[e:EMPLOYED_AT]->(c:Company)
WHERE e.end_date IS NULL
  OR e.end_date > current_date()
RETURN p.name, c.name, e.role, e.start_date;

-- Query employment at specific date
MATCH (p:Person)-[e:EMPLOYED_AT]->(c:Company)
WHERE e.start_date <= $target_date
  AND (e.end_date IS NULL OR e.end_date >= $target_date)
RETURN p.name, c.name, e.role;

-- Employment history
MATCH (p:Person {id: $person_id})-[e:EMPLOYED_AT]->(c:Company)
RETURN c.name, e.role, e.start_date, e.end_date
ORDER BY e.start_date DESC;
```

### Bi-Temporal Modeling

Track both valid time (when true in reality) and transaction time (when recorded):

```gql
-- Bi-temporal price record
CREATE (price:PriceRecord {
    product_id: 'prod_001',
    amount: 29.99,

    -- Valid time: when this price is/was effective
    valid_from: DATE '2025-01-01',
    valid_to: DATE '2025-06-30',

    -- Transaction time: when recorded in system
    recorded_at: datetime(),
    superseded_at: null  -- Current record
});

-- Query current price (valid now, current record)
MATCH (pr:PriceRecord {product_id: $product_id})
WHERE pr.valid_from <= current_date()
  AND (pr.valid_to IS NULL OR pr.valid_to > current_date())
  AND pr.superseded_at IS NULL
RETURN pr.amount AS current_price;

-- Query price at past point in time
MATCH (pr:PriceRecord {product_id: $product_id})
WHERE pr.valid_from <= $query_date
  AND (pr.valid_to IS NULL OR pr.valid_to > $query_date)
  AND pr.recorded_at <= $as_of_time
  AND (pr.superseded_at IS NULL OR pr.superseded_at > $as_of_time)
RETURN pr.amount AS price_at_time;

-- Update price (create new record, supersede old)
MATCH (old:PriceRecord {product_id: $product_id})
WHERE old.superseded_at IS NULL
SET old.superseded_at = datetime();

CREATE (new:PriceRecord {
    product_id: $product_id,
    amount: $new_price,
    valid_from: $effective_date,
    valid_to: null,
    recorded_at: datetime(),
    superseded_at: null
});
```

### Time-Series Data

Model time-series measurements:

```gql
-- Sensor readings
CREATE (reading:SensorReading {
    sensor_id: 'sensor_001',
    timestamp: datetime(),
    temperature: 23.5,
    humidity: 45.2,
    pressure: 1013.25
});

-- Link readings to sensor
MATCH (s:Sensor {id: 'sensor_001'})
CREATE (r:SensorReading {
    timestamp: datetime(),
    temperature: $temp,
    humidity: $humidity
})
CREATE (s)-[:RECORDED]->(r);

-- Query time-series data
MATCH (s:Sensor {id: $sensor_id})-[:RECORDED]->(r:SensorReading)
WHERE r.timestamp >= datetime() - DURATION 'PT24H'
RETURN r.timestamp, r.temperature, r.humidity
ORDER BY r.timestamp;

-- Downsampled aggregation (hourly averages)
MATCH (s:Sensor {id: $sensor_id})-[:RECORDED]->(r:SensorReading)
WHERE r.timestamp >= datetime() - DURATION 'P7D'
RETURN date_trunc('hour', r.timestamp) AS hour,
       AVG(r.temperature) AS avg_temp,
       MIN(r.temperature) AS min_temp,
       MAX(r.temperature) AS max_temp,
       COUNT(r) AS sample_count
ORDER BY hour;
```

### Event Sourcing

Store events with timestamps for complete history:

```gql
-- Create domain events
CREATE (evt:OrderEvent {
    order_id: 'order_001',
    event_type: 'ORDER_PLACED',
    timestamp: datetime(),
    data: $event_data,
    sequence: 1
});

-- Append new event
MATCH (prev:OrderEvent {order_id: $order_id})
WHERE NOT EXISTS { (prev)-[:FOLLOWED_BY]->() }
CREATE (new:OrderEvent {
    order_id: $order_id,
    event_type: $event_type,
    timestamp: datetime(),
    data: $data,
    sequence: prev.sequence + 1
})
CREATE (prev)-[:FOLLOWED_BY]->(new);

-- Replay events in order
MATCH (e:OrderEvent {order_id: $order_id})
RETURN e.event_type, e.timestamp, e.data
ORDER BY e.sequence;

-- Get latest event
MATCH (e:OrderEvent {order_id: $order_id})
WHERE NOT EXISTS { (e)-[:FOLLOWED_BY]->() }
RETURN e.event_type AS current_status, e.timestamp;
```

## Timezone Handling

### Working with Timezones

```gql
-- Store with explicit timezone
CREATE (meeting:Meeting {
    title: 'Global Standup',
    scheduled_at: datetime('2025-03-15T10:00:00-05:00')  -- EST
});

-- Convert timezone
MATCH (m:Meeting {title: 'Global Standup'})
RETURN m.title,
       m.scheduled_at AS est_time,
       m.scheduled_at AT TIME ZONE 'UTC' AS utc_time,
       m.scheduled_at AT TIME ZONE 'America/Los_Angeles' AS pst_time;

-- Store as UTC, display in local
CREATE (event:Event {
    name: 'Product Launch',
    utc_time: datetime('2025-06-01T18:00:00Z')
});

MATCH (e:Event {name: 'Product Launch'})
RETURN e.name,
       e.utc_time AT TIME ZONE $user_timezone AS local_time;
```

### Best Practices for Timezones

```gql
-- RECOMMENDED: Store all times in UTC
CREATE (order:Order {
    id: $id,
    placed_at: datetime()  -- Server time should be UTC
});

-- Convert to user's timezone for display
MATCH (o:Order {id: $id})
RETURN o.placed_at AT TIME ZONE $display_timezone AS display_time;

-- For date-specific queries, be aware of timezone boundaries
MATCH (o:Order)
WHERE date(o.placed_at AT TIME ZONE $user_tz) = $target_date
RETURN o.id;
```

## Performance Optimization

### Indexing Temporal Properties

```gql
-- Index frequently queried temporal columns
CREATE INDEX idx_order_placed ON Order(placed_at);
CREATE INDEX idx_event_date ON Event(event_date);
CREATE INDEX idx_session_started ON Session(started_at);

-- Composite index for entity + time queries
CREATE INDEX idx_user_activity ON Activity(user_id, timestamp);

-- Use indexes in range queries
MATCH (o:Order)
WHERE o.placed_at >= $start_date AND o.placed_at < $end_date
RETURN o.id, o.total;  -- Uses idx_order_placed
```

### Partitioning Strategies

```gql
-- Add partition key to temporal data
CREATE (log:AuditLog {
    entity_id: $id,
    action: $action,
    timestamp: datetime(),
    partition_key: format_datetime(datetime(), 'YYYY-MM')  -- Monthly
});

-- Query within partition
MATCH (log:AuditLog {partition_key: '2025-01'})
WHERE log.entity_id = $entity_id
RETURN log.action, log.timestamp;
```

### Retention and Archival

```gql
-- Archive old data
MATCH (log:AuditLog)
WHERE log.timestamp < datetime() - DURATION 'P1Y'
SET log:ArchivedAuditLog
REMOVE log:AuditLog;

-- Delete truly old data
MATCH (log:ArchivedAuditLog)
WHERE log.timestamp < datetime() - DURATION 'P7Y'
DELETE log;

-- Aggregate before archiving
MATCH (reading:SensorReading)
WHERE reading.timestamp < datetime() - DURATION 'P30D'
WITH date(reading.timestamp) AS day,
     reading.sensor_id AS sensor,
     AVG(reading.value) AS avg_value,
     MIN(reading.value) AS min_value,
     MAX(reading.value) AS max_value,
     COUNT(reading) AS sample_count
CREATE (summary:DailySensorSummary {
    sensor_id: sensor,
    date: day,
    avg_value: avg_value,
    min_value: min_value,
    max_value: max_value,
    sample_count: sample_count
})
WITH reading
DELETE reading;
```

## Client Library Examples

### Python Client

```python
from geode_client import Client
from datetime import datetime, timedelta, date

async def temporal_operations():
    client = Client(host="localhost", port=3141)

    async with client.connection() as conn:
        # Create event with timestamp
        await conn.execute("""
            CREATE (e:Event {
                id: $id,
                name: $name,
                event_date: $event_date,
                created_at: datetime()
            })
        """, {
            'id': 'evt_001',
            'name': 'Conference',
            'event_date': date(2025, 6, 15)
        })

        # Query events in date range
        start_date = date(2025, 6, 1)
        end_date = date(2025, 6, 30)

        result, _ = await conn.query("""
            MATCH (e:Event)
            WHERE e.event_date >= $start AND e.event_date <= $end
            RETURN e.name, e.event_date
            ORDER BY e.event_date
        """, {'start': start_date, 'end': end_date})

        for row in result.rows:
            print(f"Event: {row['e.name']} on {row['e.event_date']}")

        # Time-based aggregation
        result, _ = await conn.query("""
            MATCH (o:Order)
            WHERE o.placed_at >= datetime() - DURATION 'P30D'
            RETURN date(o.placed_at) AS order_date,
                   SUM(o.total) AS daily_total
            ORDER BY order_date
        """)

        for row in result.rows:
            print(f"{row['order_date']}: ${row['daily_total']:.2f}")
```

### Go Client

```go
package main

import (
    "context"
    "database/sql"
    "log"
    "time"

    _ "geodedb.com/geode"
)

func temporalQueries(ctx context.Context, db *sql.DB) error {
    // Insert with timestamp
    _, err := db.ExecContext(ctx, `
        CREATE (log:AuditLog {
            action: $1,
            entity_id: $2,
            timestamp: datetime($3),
            user_id: $4
        })
    `, "UPDATE", "user_123", time.Now().UTC().Format(time.RFC3339), "admin")
    if err != nil {
        return err
    }

    // Query recent activity
    cutoff := time.Now().Add(-24 * time.Hour)
    rows, err := db.QueryContext(ctx, `
        MATCH (log:AuditLog)
        WHERE log.timestamp >= datetime($1)
        RETURN log.action, log.entity_id, log.timestamp
        ORDER BY log.timestamp DESC
    `, cutoff.Format(time.RFC3339))
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var action, entityID string
        var timestamp time.Time
        rows.Scan(&action, &entityID, &timestamp)
        log.Printf("%s: %s at %v", action, entityID, timestamp)
    }

    return nil
}
```

### Rust Client

```rust
use geode_client::{Client, Value};
use chrono::{Utc, Duration, NaiveDate};

async fn temporal_analytics(client: &Client) -> Result<(), Box<dyn std::error::Error>> {
    // Create time-series data
    let now = Utc::now();
    client.execute(
        r#"
        CREATE (r:Reading {
            sensor_id: $sensor_id,
            timestamp: datetime($timestamp),
            value: $value
        })
        "#,
        &[
            ("sensor_id", Value::String("temp_001".into())),
            ("timestamp", Value::String(now.to_rfc3339())),
            ("value", Value::Float(23.5)),
        ],
    ).await?;

    // Query hourly averages for past week
    let week_ago = (now - Duration::days(7)).to_rfc3339();
    let results = client.query(
        r#"
        MATCH (r:Reading {sensor_id: $sensor_id})
        WHERE r.timestamp >= datetime($since)
        RETURN date_trunc('hour', r.timestamp) AS hour,
               AVG(r.value) AS avg_value,
               COUNT(r) AS samples
        ORDER BY hour
        "#,
        &[
            ("sensor_id", Value::String("temp_001".into())),
            ("since", Value::String(week_ago)),
        ],
    ).await?;

    for row in results.rows() {
        println!(
            "Hour: {:?}, Avg: {:.2}, Samples: {}",
            row.get::<String>("hour")?,
            row.get::<f64>("avg_value")?,
            row.get::<i64>("samples")?
        );
    }

    Ok(())
}
```

## Best Practices

### Timestamp Conventions

- Store all timestamps in UTC
- Use datetime() for current timestamp (returns UTC)
- Convert to local timezone only for display
- Include timezone in datetime literals when not UTC

### Data Modeling

- Add created_at/updated_at to all entities
- Use immutable timestamps for audit events
- Consider bi-temporal for regulated domains
- Partition time-series data by time period

### Query Optimization

- Index temporal properties used in WHERE clauses
- Use date_trunc for aggregations to leverage indexes
- Limit time ranges in queries
- Consider pre-aggregating historical data

### Retention

- Define retention policies early
- Archive before delete for compliance
- Aggregate old data to summaries
- Monitor storage growth

## Related Topics

- [Functions](/tags/functions/) - Built-in GQL functions
- [Types](/tags/types/) - Geode data types
- [Query Optimization](/tags/query-optimization/) - Query performance
- [Aggregations](/tags/aggregation/) - Aggregation functions
- [Data Modeling](/tags/data-modeling/) - Schema design patterns
- [Analytics](/tags/analytics/) - Analytical queries

## Further Reading

- ISO/IEC 39075:2024 - Temporal Data Types
- Time-Series Data Best Practices
- Bi-Temporal Data Modeling Guide
- Geode Performance Tuning for Temporal Queries
- Data Retention and Archival Strategies

Browse tagged content for complete temporal data documentation and examples.
