---
title: "Uniqueness Constraints - Ensuring Unique Property Values"
description: "Complete guide to uniqueness constraints in Geode graph database: ensuring unique property values, preventing duplicates, primary keys, composite unique constraints, unique indexes, violation handling, and upsert patterns for data integrity."
keywords:
  - unique constraint
  - uniqueness
  - unique index
  - primary key
  - duplicate prevention
  - unique values
  - data integrity
  - constraint violation
  - upsert pattern
  - MERGE statement
  - composite unique
  - unique validation
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Uniqueness Constraints

Uniqueness constraints ensure that property values are unique across all nodes or edges of a given type, preventing duplicates and maintaining data integrity. They enable efficient lookups, support primary key semantics, and automatically create indexes for fast unique value checking.

## Understanding Uniqueness Constraints

### What are Uniqueness Constraints?

Uniqueness constraints enforce data integrity:

**Duplicate Prevention** - Reject INSERT/UPDATE creating duplicate values
**Automatic Indexing** - Create unique indexes for fast lookups
**Primary Key Support** - Identify nodes/edges uniquely
**Referential Integrity** - Enable foreign key relationships
**Query Optimization** - Optimizer knows values are unique

### Benefits

- **Data Quality**: Prevent accidental duplicates
- **Performance**: Fast unique value lookups via indexes
- **Consistency**: Guarantee system-wide uniqueness
- **Simplicity**: Declarative constraint vs application logic
- **Concurrency**: Database-level uniqueness checking

## Defining Unique Constraints

### Single Column Uniqueness

```gql
-- Property type with unique constraint
CREATE PROPERTY TYPE Person (
    id STRING PRIMARY KEY,
    email STRING UNIQUE,
    ssn STRING UNIQUE,
    username STRING UNIQUE,
    name STRING,
    age INTEGER
);

-- Add unique constraint to existing type
ALTER PROPERTY TYPE Person
ADD CONSTRAINT unique_email UNIQUE (email);

-- Named constraint
ALTER PROPERTY TYPE Product
ADD CONSTRAINT uk_product_sku UNIQUE (sku);
```

### Composite Unique Constraints

Multiple columns must be unique together:

```gql
-- Composite uniqueness
CREATE PROPERTY TYPE Booking (
    id STRING PRIMARY KEY,
    room_id STRING,
    date DATE,
    guest_id STRING,

    -- Room can only be booked once per date
    UNIQUE (room_id, date)
);

-- Multiple composite constraints
CREATE PROPERTY TYPE OrderItem (
    order_id STRING,
    product_id STRING,
    line_number INTEGER,

    UNIQUE (order_id, product_id),  -- Same product only once per order
    UNIQUE (order_id, line_number)   -- Unique line numbers per order
);

-- Add composite constraint
ALTER PROPERTY TYPE Enrollment
ADD CONSTRAINT uk_student_course UNIQUE (student_id, course_id, semester);
```

### Partial Unique Constraints

Uniqueness with conditions:

```gql
-- Unique only for active records
CREATE PROPERTY TYPE User (
    id STRING PRIMARY KEY,
    email STRING,
    status STRING,

    UNIQUE (email) WHERE status = 'active'
);

-- Unique non-NULL values only
CREATE PROPERTY TYPE Employee (
    id STRING PRIMARY KEY,
    email STRING,
    work_email STRING,

    UNIQUE (work_email) WHERE work_email IS NOT NULL
);
```

## Primary Keys

### Single Column Primary Key

```gql
CREATE PROPERTY TYPE Person (
    id STRING PRIMARY KEY,
    name STRING,
    email STRING
);

-- Equivalent to:
CREATE PROPERTY TYPE Person (
    id STRING UNIQUE NOT NULL,
    name STRING,
    email STRING
);
```

### Composite Primary Key

```gql
-- Natural composite key
CREATE PROPERTY TYPE OrderItem (
    order_id STRING,
    product_id STRING,
    quantity INTEGER,
    price DECIMAL,

    PRIMARY KEY (order_id, product_id)
);

-- Multi-column primary key
CREATE PROPERTY TYPE TimeSeriesData (
    sensor_id STRING,
    timestamp TIMESTAMP,
    metric_name STRING,
    value DECIMAL,

    PRIMARY KEY (sensor_id, timestamp, metric_name)
);
```

### Auto-Generated Keys

```gql
-- UUID primary key
CREATE PROPERTY TYPE User (
    id STRING PRIMARY KEY DEFAULT uuid(),
    username STRING UNIQUE,
    email STRING UNIQUE
);

-- Auto-incrementing integer
CREATE PROPERTY TYPE Product (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    name STRING,
    sku STRING UNIQUE
);
```

## Unique Indexes

### Creating Unique Indexes

```gql
-- Unique index on single column
CREATE UNIQUE INDEX idx_person_email ON Person(email);

-- Unique index on multiple columns
CREATE UNIQUE INDEX idx_booking_room_date ON Booking(room_id, date);

-- Partial unique index
CREATE UNIQUE INDEX idx_active_user_email
ON User(email)
WHERE status = 'active';

-- Case-insensitive unique index
CREATE UNIQUE INDEX idx_user_username
ON User(LOWER(username));
```

### Index Benefits

```gql
-- Fast unique lookups
MATCH (u:User {email: $email})
RETURN u;
-- Uses unique index, O(log n) lookup

-- Constraint violation check during insert
CREATE (u:User {email: 'existing@example.com'});
-- Instant check via unique index, no table scan
```

## Handling Constraint Violations

### Detecting Violations

```python
from geode_client import Client, UniqueViolationError

async def create_user(email, name):
    try:
        client = Client(host="localhost", port=3141)
        async with client.connection() as conn:
            result, _ = await conn.query("""
                CREATE (u:User {
                    email: $email,
                    name: $name
                })
                RETURN u.id
            """, {"email": email, "name": name})

            return result.rows[0]['u.id']

    except UniqueViolationError as e:
        print(f"Email {email} already exists")
        print(f"Constraint: {e.constraint_name}")
        print(f"Column: {e.column_name}")
        raise

    except Exception as e:
        print(f"Unexpected error: {e}")
        raise
```

```go
// Go error handling
_, err := db.Exec(`
    CREATE (u:User {email: $1, name: $2})
`, email, name)

if err != nil {
    if isUniqueViolation(err) {
        return fmt.Errorf("email %s already exists", email)
    }
    return err
}

func isUniqueViolation(err error) bool {
    var geodeErr *geode.Error
    if errors.As(err, &geodeErr) {
        return geodeErr.Code == "23505"  // Unique violation SQL code
    }
    return false
}
```

### Error Messages

```
UniqueViolationError: duplicate key value violates unique constraint "uk_person_email"
  Detail: Key (email)=(alice@example.com) already exists.
  Constraint: uk_person_email
  Table: Person
  Column: email
```

## Upsert Patterns

### MERGE Statement

```gql
-- Insert or update based on unique key
MERGE (u:User {email: $email})
ON CREATE SET
    u.name = $name,
    u.created_at = NOW(),
    u.status = 'active'
ON MATCH SET
    u.name = $name,
    u.updated_at = NOW();

-- Composite key merge
MERGE (b:Booking {room_id: $room_id, date: $date})
ON CREATE SET
    b.guest_id = $guest_id,
    b.status = 'confirmed',
    b.created_at = NOW()
ON MATCH SET
    b.status = 'modified',
    b.updated_at = NOW();
```

### INSERT ... ON CONFLICT

```gql
-- PostgreSQL-style upsert
INSERT INTO Person (id, email, name)
VALUES ($id, $email, $name)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = NOW();

-- Do nothing on conflict
INSERT INTO Product (sku, name, price)
VALUES ($sku, $name, $price)
ON CONFLICT (sku) DO NOTHING;
```

### Application-Level Upsert

```python
async def upsert_user(email, name):
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Try insert first
        try:
            result, _ = await conn.query("""
                CREATE (u:User {email: $email, name: $name})
                RETURN u.id AS id, 'created' AS action
            """, {"email": email, "name": name})

            return result.rows[0]

        except UniqueViolationError:
            # Update existing
            result, _ = await conn.query("""
                MATCH (u:User {email: $email})
                SET u.name = $name, u.updated_at = NOW()
                RETURN u.id AS id, 'updated' AS action
            """, {"email": email, "name": name})

            return result.rows[0]
```

## Managing Constraints

### Listing Constraints

```gql
-- Show all constraints
SELECT
    constraint_name,
    table_name,
    column_names,
    constraint_type
FROM system.constraints
WHERE constraint_type = 'UNIQUE'
ORDER BY table_name, constraint_name;

-- Constraints for specific table
SELECT * FROM system.constraints
WHERE table_name = 'Person'
AND constraint_type IN ('UNIQUE', 'PRIMARY KEY');
```

### Dropping Constraints

```gql
-- Drop unique constraint
ALTER PROPERTY TYPE Person
DROP CONSTRAINT unique_email;

-- Drop primary key
ALTER PROPERTY TYPE Product
DROP PRIMARY KEY;

-- Drop named constraint
ALTER PROPERTY TYPE Booking
DROP CONSTRAINT uk_room_date;
```

### Temporarily Disabling

```gql
-- Disable for bulk import
ALTER PROPERTY TYPE Person
DISABLE CONSTRAINT unique_email;

-- Bulk import
LOAD CSV FROM 'users.csv' ...

-- Re-enable and validate
ALTER PROPERTY TYPE Person
ENABLE CONSTRAINT unique_email;
```

## Performance Considerations

### Index Selectivity

```gql
-- High selectivity (good for unique index)
CREATE UNIQUE INDEX idx_user_email ON User(email);
-- Each email is unique, perfect for index

-- Low selectivity (bad for unique index)
CREATE INDEX idx_user_status ON User(status);
-- Status has few values, not unique
```

### Constraint Checking Cost

```python
# Unique constraint check happens on every insert/update
# Cost: O(log n) with unique index

# Without unique constraint, application must query:
result, _ = await client.query(
    "MATCH (u:User {email: $email}) RETURN COUNT(u)",
    {"email": email}
)
if result.rows[0]['COUNT(u)'] > 0:
    raise ValueError("Email already exists")
# Cost: O(log n) + application round-trip
# Less efficient than database constraint
```

## Best Practices

### Constraint Design

1. **Use PRIMARY KEY for Identity**: Natural or surrogate key
2. **UNIQUE for Natural Keys**: Email, username, SSN, etc.
3. **Composite for Relationships**: (user_id, friend_id) pairs
4. **Name Constraints**: Explicit names for better error messages
5. **Add Indexes**: Unique constraints automatically indexed

### Application Patterns

```python
# Good: Let database enforce uniqueness
async def create_user(email, name):
    try:
        result, _ = await client.query(
            "CREATE (u:User {email: $email, name: $name})",
            {"email": email, "name": name}
        )
        return result
    except UniqueViolationError:
        return None  # Handle duplicate

# Bad: Check-then-insert (race condition)
async def create_user_bad(email, name):
    # Race condition between check and insert!
    existing, _ = await client.query(
        "MATCH (u:User {email: $email}) RETURN u",
        {"email": email}
    )
    if existing:
        return None

    result, _ = await client.query(
        "CREATE (u:User {email: $email, name: $name})",
        {"email": email, "name": name}
    )
    return result
```

### Error Handling

```python
# Provide user-friendly messages
try:
    await create_user(email, name)
except UniqueViolationError as e:
    if e.column_name == 'email':
        raise ValueError(f"Email {email} is already registered")
    elif e.column_name == 'username':
        raise ValueError(f"Username is already taken")
    else:
        raise ValueError("Duplicate value detected")
```

## Troubleshooting

### Finding Duplicates

```gql
-- Find duplicate emails before adding constraint
SELECT email, COUNT(*) AS count
FROM Person
GROUP BY email
HAVING COUNT(*) > 1;

-- Find all duplicates with details
SELECT p1.id, p1.email, p1.name
FROM Person p1
JOIN Person p2 ON p1.email = p2.email
WHERE p1.id < p2.id
ORDER BY p1.email;
```

### Resolving Duplicates

```gql
-- Keep first, delete duplicates
DELETE FROM Person p1
WHERE EXISTS (
    SELECT 1 FROM Person p2
    WHERE p1.email = p2.email
    AND p2.id < p1.id
);

-- Merge duplicates
MATCH (p1:Person), (p2:Person)
WHERE p1.email = p2.email AND p1.id < p2.id
// Merge logic...
DELETE p2;
```

## Related Topics

- [Constraints](/tags/constraints/) - All constraint types
- [Indexes](/tags/indexes/) - Index optimization
- [Data Integrity](/tags/data-integrity/) - Data quality

## Further Reading

- [PostgreSQL Unique Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) - PostgreSQL documentation
- [Database Constraints](https://en.wikipedia.org/wiki/Unique_key) - Wikipedia overview
