---
title: "Data Integrity & Consistency"
description: "Complete guide to data integrity and consistency in Geode. Learn about ACID transactions, constraints, validation, checksums, and best practices for maintaining data quality in graph databases."
keywords:
  - data integrity
  - data consistency
  - ACID
  - constraints
  - validation
  - referential integrity
  - checksums
  - data quality
  - Geode
  - graph database
  - database reliability
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/data-integrity/"
    noindex: false
    title: "Data Integrity & Consistency - Geode Graph Database"
    description: "Ensure data integrity in Geode with ACID transactions, schema constraints, validation rules, and consistency checks. Maintain high-quality, reliable graph data."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Data integrity and consistency are fundamental to reliable database systems. Geode provides comprehensive mechanisms to ensure your graph data remains accurate, valid, and consistent through ACID transactions, schema constraints, validation rules, and automated integrity checks.

## Data Integrity Fundamentals

Data integrity ensures that data is:
- **Accurate**: Data correctly represents real-world entities
- **Valid**: Data conforms to defined rules and constraints
- **Consistent**: Data is coherent across the database
- **Complete**: Required data is present and not missing
- **Unique**: Duplicate data is prevented where necessary

Geode enforces data integrity through multiple layers:
1. **Transaction guarantees**: ACID properties ensure consistent state
2. **Schema constraints**: Rules enforced at the database level
3. **Validation rules**: Custom business logic validation
4. **Referential integrity**: Relationship consistency enforcement
5. **Checksums**: Cryptographic verification of data authenticity

## ACID Guarantees

Geode provides full ACID (Atomicity, Consistency, Isolation, Durability) compliance:

### Atomicity

All operations in a transaction complete successfully or none do:

```gql
-- Transfer funds between accounts
BEGIN;

MATCH (from:Account {id: $from_id})
WHERE from.balance >= $amount
SET from.balance = from.balance - $amount;

MATCH (to:Account {id: $to_id})
SET to.balance = to.balance + $amount;

-- If either operation fails, entire transaction rolls back
COMMIT;
```

### Consistency

Database transitions from one valid state to another:

```gql
-- Constraint ensures valid state
CREATE CONSTRAINT positive_balance
  ON (a:Account)
  ASSERT a.balance >= 0;

-- Transaction that violates constraint fails
BEGIN;
MATCH (a:Account {id: $account_id})
SET a.balance = -100;  -- Fails: violates positive_balance constraint
COMMIT;
```

### Isolation

Concurrent transactions don't interfere with each other:

```gql
-- Transaction 1
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;
MATCH (p:Product {sku: $sku})
WHERE p.inventory > 0
SET p.inventory = p.inventory - 1;
COMMIT;

-- Transaction 2 (concurrent)
-- Waits for Transaction 1 to complete
-- Ensures no double-booking of inventory
```

### Durability

Committed changes survive system failures:

```bash
# Enable write-ahead logging for durability
geode serve --wal-enabled=true \
  --wal-sync-mode=fsync \
  --wal-flush-interval=100ms

# After crash, recover from WAL
geode recover --wal-directory=/var/lib/geode/wal
```

## Schema Constraints

Define and enforce data quality rules at the schema level:

### Uniqueness Constraints

```gql
-- Ensure email addresses are unique
CREATE CONSTRAINT unique_email
  ON (u:User)
  ASSERT u.email IS UNIQUE;

-- Ensure compound uniqueness
CREATE CONSTRAINT unique_person_name
  ON (p:Person)
  ASSERT (p.first_name, p.last_name, p.birth_date) IS UNIQUE;

-- Attempt to insert duplicate fails
CREATE (:User {email: 'alice@example.com'});
CREATE (:User {email: 'alice@example.com'});  -- Error: Constraint violation
```

### Existence Constraints

```gql
-- Ensure required properties exist
CREATE CONSTRAINT required_user_fields
  ON (u:User)
  ASSERT u.email IS NOT NULL
    AND u.created_at IS NOT NULL
    AND u.status IS NOT NULL;

-- Insertion without required field fails
CREATE (:User {name: 'Bob'});  -- Error: Missing required property 'email'
```

### Property Type Constraints

```gql
-- Ensure property types
CREATE CONSTRAINT email_format
  ON (u:User)
  ASSERT u.email MATCHES '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';

CREATE CONSTRAINT age_range
  ON (p:Person)
  ASSERT p.age >= 0 AND p.age <= 150;

CREATE CONSTRAINT positive_price
  ON (p:Product)
  ASSERT p.price > 0;
```

### Relationship Constraints

```gql
-- Ensure relationship cardinality
CREATE CONSTRAINT one_manager
  ON ()-[r:REPORTS_TO]->()
  ASSERT count {(person)-[:REPORTS_TO]->()} <= 1;

-- Ensure relationship endpoints
CREATE CONSTRAINT valid_employment
  ON ()-[r:EMPLOYED_BY]->()
  ASSERT start_node(r):Person AND end_node(r):Company;

-- Ensure bidirectional relationships
CREATE CONSTRAINT symmetric_friendship
  ON ()-[r:FRIENDS_WITH]->()
  ASSERT EXISTS {
    MATCH (a)-[r:FRIENDS_WITH]->(b)
    MATCH (b)-[:FRIENDS_WITH]->(a)
  };
```

## Referential Integrity

Ensure relationships reference valid entities:

### Foreign Key Constraints

```gql
-- Ensure order references valid customer
CREATE CONSTRAINT valid_customer_reference
  ON (o:Order)
  ASSERT EXISTS {
    MATCH (o)-[:ORDERED_BY]->(c:Customer)
  };

-- Prevent orphaned orders
-- Deletion of customer fails if orders exist
MATCH (c:Customer {id: $customer_id})
DELETE c;  -- Error if orders reference this customer
```

### Cascade Operations

```gql
-- Delete customer and all related orders
MATCH (c:Customer {id: $customer_id})
OPTIONAL MATCH (c)<-[:ORDERED_BY]-(o:Order)
DELETE c, o;

-- Update with cascade
MATCH (c:Customer {id: $old_id})
SET c.id = $new_id
WITH c
MATCH (c)<-[r:ORDERED_BY]-(o:Order)
-- Relationships automatically updated
RETURN count(o) AS updated_orders;
```

### Preventing Dangling References

```gql
-- Before delete, check for references
MATCH (p:Product {id: $product_id})
WHERE NOT EXISTS {
  MATCH (p)<-[:CONTAINS]-(order:Order)
  WHERE order.status IN ['pending', 'processing']
}
DELETE p;

-- If active references exist, deletion blocked
```

## Validation Rules

Implement custom validation logic:

### Pre-Insert Validation

```gql
-- Validate before insertion
CREATE FUNCTION validate_user(props MAP)
RETURNS BOOLEAN
AS $$
  RETURN props.email IS NOT NULL
    AND props.email MATCHES '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    AND props.age >= 18
    AND props.agreed_to_terms = true
$$;

-- Use in constraint
CREATE CONSTRAINT valid_user
  ON (u:User)
  ASSERT validate_user(properties(u));
```

### Cross-Field Validation

```gql
-- Ensure date ranges are valid
CREATE CONSTRAINT valid_date_range
  ON (e:Event)
  ASSERT e.end_date >= e.start_date;

-- Ensure conditional fields
CREATE CONSTRAINT conditional_fields
  ON (o:Order)
  ASSERT (o.status = 'shipped' AND o.tracking_number IS NOT NULL)
      OR (o.status != 'shipped');
```

### Business Rule Validation

```gql
-- Ensure inventory is sufficient for order
CREATE CONSTRAINT sufficient_inventory
  ON ()-[r:CONTAINS]->()
  ASSERT {
    MATCH (order)-[r:CONTAINS {quantity: qty}]->(product:Product)
    WHERE product.inventory >= qty
    RETURN true
  };
```

## Data Consistency Checks

### Consistency Verification

```bash
# Run consistency check
geode check-consistency --full \
  --report=/var/log/geode/consistency-report.json

# Example output:
# Checking node integrity... OK (1,234,567 nodes)
# Checking relationship integrity... OK (3,456,789 relationships)
# Checking constraint violations... FOUND 3 violations
# Checking orphaned relationships... OK
# Checking index consistency... OK
```

### Automated Consistency Checks

```bash
# Enable periodic consistency checks
geode serve --consistency-check-enabled=true \
  --consistency-check-interval=daily \
  --consistency-check-time=03:00

# Alert on inconsistencies
geode serve --consistency-alert=true \
  --alert-channel=email,pagerduty
```

### Manual Verification Queries

```gql
-- Find nodes missing required properties
MATCH (u:User)
WHERE u.email IS NULL
   OR u.created_at IS NULL
RETURN count(u) AS invalid_users;

-- Find orphaned relationships
MATCH ()-[r:ORDERED_BY]->()
WHERE NOT EXISTS {
  MATCH (o:Order)-[r]->(c:Customer)
}
RETURN count(r) AS orphaned_orders;

-- Find duplicate data
MATCH (u1:User), (u2:User)
WHERE u1.email = u2.email
  AND id(u1) < id(u2)
RETURN u1.email, count(*) AS duplicates;

-- Verify relationship integrity
MATCH (p:Person)-[r:WORKS_AT]->(c:Company)
WHERE NOT EXISTS {(c:Company)}
RETURN count(r) AS invalid_employment_relationships;
```

## Checksums and Verification

### Data Checksums

```bash
# Enable data checksums
geode serve --data-checksums=enabled \
  --checksum-algorithm=sha256 \
  --verify-checksums-on-read=true

# Verify data integrity
geode verify-checksums --path=/var/lib/geode/data \
  --report=checksum-report.json
```

### Write Verification

```bash
# Enable write verification
geode serve --verify-writes=true \
  --write-verification-level=full

# Reads data back after write to confirm
```

## Transaction Integrity

### Savepoints

Create savepoints for partial rollback:

```gql
BEGIN;

-- First operation
CREATE (p:Person {name: 'Alice', email: 'alice@example.com'});

-- Create savepoint
SAVEPOINT after_person_creation;

-- Second operation
CREATE (c:Company {name: 'Acme Corp'});
CREATE (p)-[:WORKS_AT]->(c);

-- Error occurs, rollback to savepoint
ROLLBACK TO SAVEPOINT after_person_creation;

-- Person still exists, company and relationship removed
COMMIT;
```

### Transaction Validation

```gql
-- Validate entire transaction before commit
BEGIN;

-- Multiple operations
CREATE (p:Person {name: 'Bob'});
CREATE (c:Company {name: 'TechCo'});
CREATE (p)-[:WORKS_AT]->(c);

-- Validate constraints before commit
CALL validate_transaction();

-- Only commits if all constraints satisfied
COMMIT;
```

## Error Handling

### Constraint Violation Handling

```python
from geode_client import Client, ConstraintViolationError

client = Client('geode.example.com')

try:
    await client.run("""
        CREATE (:User {email: 'alice@example.com'})
    """)
except ConstraintViolationError as e:
    print(f"Constraint violation: {e.constraint_name}")
    print(f"Details: {e.message}")
    # Handle duplicate email gracefully
```

### Transaction Conflict Resolution

```python
max_retries = 3
retry_count = 0

while retry_count < max_retries:
    try:
        async with client.connection() as txn:
            await txn.begin()
            # Read current value
            result = await txn.run("""
                MATCH (p:Product {sku: $sku})
                RETURN p.inventory, p.version
            """, sku=sku)

            inventory, version = result.rows[0]

            # Update with optimistic locking
            await txn.run("""
                MATCH (p:Product {sku: $sku})
                WHERE p.version = $version
                SET p.inventory = $new_inventory,
                    p.version = $version + 1
            """, sku=sku, version=version, new_inventory=inventory - 1)

            await txn.commit()
            break

    except ConflictError:
        retry_count += 1
        if retry_count >= max_retries:
            raise
        await asyncio.sleep(0.1 * (2 ** retry_count))  # Exponential backoff
```

## Best Practices

1. **Define Constraints Early**: Establish constraints during schema design, not after data is loaded
2. **Use ACID Transactions**: Wrap related operations in transactions for consistency
3. **Validate Input**: Validate data at application layer before database insertion
4. **Regular Consistency Checks**: Run automated consistency checks periodically
5. **Monitor Constraint Violations**: Alert on constraint violations to detect data quality issues
6. **Use Appropriate Isolation**: Choose isolation level based on consistency requirements
7. **Implement Retry Logic**: Handle transient errors with exponential backoff
8. **Test Constraints**: Thoroughly test constraints before production deployment
9. **Document Data Rules**: Maintain clear documentation of all data integrity rules
10. **Backup Before Changes**: Always backup before making schema or constraint changes

## Monitoring Data Integrity

### Integrity Metrics

```bash
# Monitor integrity metrics
geode stats --component=integrity \
  --metrics=constraint_violations,checksum_errors,transaction_rollbacks

# Example output:
# Metric                    | Value | Trend
# --------------------------|-------|-------
# Constraint Violations     | 12    | ↓
# Checksum Errors           | 0     | →
# Transaction Rollbacks     | 145   | ↑
# Orphaned Relationships    | 3     | ↓
# Duplicate Nodes           | 0     | →
```

### Audit Integrity Events

```bash
# Enable integrity event logging
geode serve --audit-integrity-events=true \
  --log-constraint-violations=true \
  --log-data-corruption=true
```

## Recovery from Integrity Issues

### Constraint Violation Cleanup

```gql
-- Find and fix constraint violations
MATCH (u:User)
WHERE u.email IS NULL
SET u.email = 'unknown-' + toString(id(u)) + '@example.com';

-- Remove duplicates
MATCH (u1:User), (u2:User)
WHERE u1.email = u2.email
  AND id(u1) < id(u2)
DELETE u2;
```

### Orphaned Data Cleanup

```gql
-- Remove orphaned relationships
MATCH ()-[r:ORDERED_BY]->()
WHERE NOT EXISTS {
  MATCH (o:Order)-[r]->(c:Customer)
}
DELETE r;
```

### Data Repair

```bash
# Repair corrupted data
geode repair --checksum-errors \
  --orphaned-relationships \
  --constraint-violations \
  --dry-run

# Apply repairs
geode repair --apply
```

## Related Topics

- [Transactions](/tags/transactions/) - ACID transaction management
- [Isolation](/tags/isolation/) - Transaction isolation levels
- [Compliance](/tags/compliance/) - Regulatory compliance and data integrity
- [Data Governance](/tags/governance/) - Data quality and governance
- [Audit Logging](/tags/audit-logging/) - Tracking data modifications
- [Schema Management](/docs/schema/) - Schema design and constraints
- [Error Handling](/docs/development/error-handling/) - Handling integrity errors
- [Backup and Recovery](/docs/operations/backup/) - Data protection and recovery
