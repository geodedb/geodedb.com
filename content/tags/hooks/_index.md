---
title: "Database Hooks & Triggers"
description: "Automatic execution of custom logic in response to database events using hooks and triggers in Geode"
keywords: ["database hooks", "triggers", "event triggers", "before trigger", "after trigger", "database automation", "lifecycle hooks", "callback functions"]
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Database Hooks & Triggers

Database hooks and triggers are mechanisms that automatically execute custom logic in response to specific database events. Geode's hooks and triggers enable reactive data management, constraint enforcement, and workflow automation without requiring application-level code.

## Trigger Fundamentals

### What are Triggers?

Triggers are stored procedures that execute automatically when specific events occur:

**BEFORE Triggers** - Execute before the operation
**AFTER Triggers** - Execute after the operation
**INSTEAD OF Triggers** - Replace the original operation

### Trigger Events

Triggers respond to DML operations:

- **INSERT** - New nodes or edges created
- **UPDATE** - Properties modified  
- **DELETE** - Nodes or edges removed

## Creating Triggers

### Basic Trigger Syntax

```gql
-- After insert trigger
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

### Before Update Trigger

Validate or modify data before update:

```gql
-- Prevent negative balance
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- Auto-update modification time
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

### After Delete Trigger

Cascade operations after deletion:

```gql
-- Archive deleted users
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- Clean up orphaned data
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
  DELETE FROM Comment WHERE author_id = OLD.id;
```

## Hook Types

### Lifecycle Hooks

Execute at specific points in entity lifecycle:

```gql
-- Before creation
CREATE HOOK before_create_person
BEFORE INSERT ON Person
EXECUTE FUNCTION validate_user_data(NEW);

-- After creation
CREATE HOOK after_create_person
AFTER INSERT ON Person
EXECUTE FUNCTION send_welcome_email(NEW.email);

-- Before update
CREATE HOOK before_update_person
BEFORE UPDATE ON Person
EXECUTE FUNCTION validate_changes(OLD, NEW);

-- After update
CREATE HOOK after_update_person
AFTER UPDATE ON Person
EXECUTE FUNCTION notify_profile_change(NEW);
```

### Validation Hooks

Enforce business rules:

```gql
-- Age validation
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- Email uniqueness
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- Required fields
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

### Computed Properties

Auto-calculate derived values:

```gql
-- Full name from first and last
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- Age from birthdate
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- Order total
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

### Audit Logging

Track all data changes:

```gql
-- Comprehensive audit trail
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

## Advanced Patterns

### Conditional Triggers

Execute only when conditions met:

```gql
-- Only trigger for significant changes
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- Status-based triggers
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
  UPDATE Customer SET total_orders = total_orders + 1
    WHERE id = NEW.customer_id;
```

### Multi-Table Triggers

Affect multiple tables:

```gql
-- Cascade inventory update
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

  INSERT (h:InventoryHistory {
    product_id: NEW.product_id,
    change: -NEW.quantity,
    reason: 'order_placed',
    order_id: NEW.order_id,
    timestamp: datetime()
  });
```

### Recursive Triggers

Triggers that may trigger themselves:

```gql
-- Set recursion limit
SET max_trigger_recursion = 10;

-- Hierarchical update
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

## Trigger Management

### Enabling/Disabling Triggers

Control trigger execution:

```gql
-- Disable trigger
ALTER TRIGGER audit_new_users DISABLE;

-- Enable trigger
ALTER TRIGGER audit_new_users ENABLE;

-- Disable all triggers on table
ALTER TABLE Person DISABLE ALL TRIGGERS;

-- Enable all triggers on table
ALTER TABLE Person ENABLE ALL TRIGGERS;
```

### Dropping Triggers

Remove triggers:

```gql
-- Drop specific trigger
DROP TRIGGER IF EXISTS audit_new_users;

-- Drop all triggers on table
DROP ALL TRIGGERS ON Person;
```

### Trigger Inspection

Query trigger metadata:

```gql
-- List all triggers
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.-- Get trigger definition
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

## Performance Considerations

### Trigger Overhead

Minimize impact on write performance:

```gql
-- Batch audit logging instead of per-row
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

### Async Triggers

Defer non-critical work:

```gql
-- Queue for async processing
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

### Trigger Ordering

Control execution order:

```gql
-- Explicit ordering
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

## Best Practices

### Trigger Design

- Keep triggers simple and focused
- Avoid complex business logic
- Document trigger purpose
- Test thoroughly
- Monitor performance impact

### Error Handling

- Use SIGNAL for validation errors
- Provide meaningful error messages
- Log errors for debugging
- Consider compensation logic

### Security

- Validate all inputs
- Check permissions
- Prevent SQL injection
- Audit trigger execution
- Limit trigger recursion

## Related Topics

- [Events](/tags/events) - Event-driven architecture
- [Validation](/tags/validation) - Data validation
- [Constraints](/tags/constraints) - Schema constraints

## Real-World Hook Implementations

### Multi-Tenancy Enforcement

Automatically add tenant context to all data:

```gql
-- Inject tenant_id on all creates
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- Prevent cross-tenant access
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

### Data Retention Policy

Automatically archive or delete old data:

```gql
-- Archive records older than 7 years
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

  -- Delete from active
  DELETE NEW;

-- Schedule periodic retention checks
CREATE SCHEDULED TRIGGER retention_cleanup
EVERY '1 day'
EXECUTE GQL
  MATCH (e:Event)
  WHERE e.timestamp < datetime() - duration('P7Y')
  WITH e LIMIT 1000
  DELETE e;
```

### Bi-Directional Relationship Sync

Maintain symmetric relationships:

```gql
-- When A friends B, also create B friends A
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- When A unfriends B, also remove B friends A
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

### Denormalization Maintenance

Keep denormalized data in sync:

```gql
-- Update user's post count when posts created/deleted
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- Maintain aggregated statistics
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

### Soft Delete Implementation

Mark records as deleted instead of removing them:

```gql
-- Intercept deletes and convert to soft delete
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- Hide soft-deleted records from normal queries
-- Geode has no views (no CREATE VIEW). Save the query text in your
-- application, or precompute the result onto nodes.
```

## Hook Performance Optimization

### Conditional Execution

Minimize trigger overhead:

```gql
-- Only execute for significant changes
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

### Batching Hook Actions

Process multiple rows efficiently:

```gql
-- Per-statement trigger (not per-row)
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

### Async Hook Execution

Defer non-critical work:

```gql
-- Queue for async processing
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- Background worker processes jobs
-- (separate process, no blocking on insert)
```

## Hook Testing Strategies

### Unit Testing Hooks

Test trigger logic in isolation:

```python
import pytest
from geode_client import Client

@pytest.fixture
async def client():
    client = await Client.connect("localhost:3141")
    yield client
    await client.close()

@pytest.mark.asyncio
async def test_audit_trigger(client):
    """Test audit log trigger creates entries"""
    # Insert user (triggers audit hook)
    await client.execute("""
        CREATE (:User {id: 123, name: 'Test User', email: 'test@example.com'})
    """)

    # Verify audit log created
    result, _ = await client.query("""
        MATCH (a:AuditLog)
        WHERE a.action = 'user_created'
          AND a.record_id = 123
        RETURN a
    """)

    assert len(result.bindings) == 1
    audit = result.bindings[0]['a']
    assert audit['action'] == 'user_created'
    assert 'test@example.com' in audit['details']

@pytest.mark.asyncio
async def test_validation_trigger(client):
    """Test validation trigger rejects invalid data"""
    with pytest.raises(Exception, match="Invalid age value"):
        await client.execute("""
            CREATE (:Person {id: 456, name: 'Invalid', age: -5})
        """)

    # Verify no record created
    result, _ = await client.query("""
        MATCH (p:Person {id: 456}) RETURN p
    """)
    assert len(result.bindings) == 0
```

### Integration Testing

Test hooks with full workflows:

```python
@pytest.mark.asyncio
async def test_bidirectional_friendship(client):
    """Test bidirectional friendship trigger"""
    # Create users
    await client.execute("""
        CREATE (:User {id: 1, name: 'Alice'})
        CREATE (:User {id: 2, name: 'Bob'})
    """)

    # Create friendship (triggers bidirectional hook)
    await client.execute("""
        MATCH (a:User {id: 1}), (b:User {id: 2})
        CREATE (a)-[:FRIEND {created_at: datetime()}]->(b)
    """)

    # Verify both directions exist
    result, _ = await client.query("""
        MATCH (a:User {id: 1})-[:FRIEND]->(b:User {id: 2}),
              (b)-[:FRIEND]->(a)
        RETURN a.name, b.name
    """)

    assert len(result.bindings) == 1
```

## Debugging Hooks

### Trigger Execution Log

Track trigger executions:

```gql
-- Enable trigger logging
SET trigger_logging = true;

-- Execute operation
CREATE (:User {id: 789, name: 'Debug User'});

-- View trigger log
-- Geode has no trigger system and no execution log.
```

### Trigger Profiling

Identify slow triggers:

```gql
-- Profile trigger execution
PROFILE TRIGGER audit_new_users;

-- Returns:
-- Trigger: audit_new_users
-- Execution time: 2.5ms
-- Breakdown:
--   Pattern matching: 0.3ms
--   Property access: 0.1ms
--   Insert operation: 2.1ms
```

## Migration Strategies

### Adding Hooks to Existing Data

Apply triggers to historical data:

```gql
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.

-- Backfill existing data
MATCH (p:Person)
WHERE p.full_name IS NULL
WITH p LIMIT 1000
SET p.full_name = p.first_name || ' ' || p.last_name;
-- Repeat until all records updated
```

### Versioning Hooks

Manage hook changes over time:

```gql
-- Drop old trigger
DROP TRIGGER IF EXISTS audit_new_users_v1;

-- Create new version
-- Geode has no trigger system (no CREATE TRIGGER). React to changes with
-- a CDC subscription on the client, or write the derived value in the same
-- transaction as the change.
```

## Learn More

- [Database Triggers (PostgreSQL)](https://www.postgresql.org/docs/current/triggers.html)
- [Trigger Design Patterns](https://use-the-index-luke.com/sql/dml/insert)
- [Oracle Triggers Documentation](https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/plsql-triggers.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Database Automation Best Practices](https://www.postgresql.org/docs/current/plpgsql-trigger.html)
