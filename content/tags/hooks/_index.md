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
CREATE TRIGGER audit_new_users
AFTER INSERT ON Person
FOR EACH ROW
EXECUTE GQL
  INSERT (a:AuditLog {
    action: 'user_created',
    user_id: NEW.id,
    timestamp: NOW(),
    details: NEW.properties
  });
```

### Before Update Trigger

Validate or modify data before update:

```gql
-- Prevent negative balance
CREATE TRIGGER check_balance
BEFORE UPDATE ON Account
FOR EACH ROW
WHEN (NEW.balance < 0)
EXECUTE GQL
  SIGNAL 'Insufficient funds';

-- Auto-update modification time
CREATE TRIGGER update_modified_time
BEFORE UPDATE ON Person
FOR EACH ROW
EXECUTE GQL
  SET NEW.modified_at = NOW();
```

### After Delete Trigger

Cascade operations after deletion:

```gql
-- Archive deleted users
CREATE TRIGGER archive_deleted_users
AFTER DELETE ON Person
FOR EACH ROW
EXECUTE GQL
  INSERT (a:ArchivedPerson {
    original_id: OLD.id,
    data: OLD.properties,
    deleted_at: NOW(),
    deleted_by: CURRENT_USER()
  });

-- Clean up orphaned data
CREATE TRIGGER cleanup_user_data
AFTER DELETE ON Person
FOR EACH ROW
EXECUTE GQL
  DELETE FROM Post WHERE author_id = OLD.id;
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
CREATE TRIGGER validate_age
BEFORE INSERT OR UPDATE ON Person
FOR EACH ROW
WHEN (NEW.age < 0 OR NEW.age > 150)
EXECUTE GQL
  SIGNAL 'Invalid age value';

-- Email uniqueness
CREATE TRIGGER ensure_unique_email
BEFORE INSERT ON Person
FOR EACH ROW
WHEN EXISTS (SELECT 1 FROM Person WHERE email = NEW.email)
EXECUTE GQL
  SIGNAL 'Email already in use';

-- Required fields
CREATE TRIGGER check_required_fields
BEFORE INSERT ON Person
FOR EACH ROW
WHEN (NEW.name IS NULL OR NEW.email IS NULL)
EXECUTE GQL
  SIGNAL 'Required fields missing';
```

### Computed Properties

Auto-calculate derived values:

```gql
-- Full name from first and last
CREATE TRIGGER compute_full_name
BEFORE INSERT OR UPDATE ON Person
FOR EACH ROW
EXECUTE GQL
  SET NEW.full_name = NEW.first_name || ' ' || NEW.last_name;

-- Age from birthdate
CREATE TRIGGER compute_age
BEFORE INSERT OR UPDATE ON Person
FOR EACH ROW
EXECUTE GQL
  SET NEW.age = YEAR(NOW()) - YEAR(NEW.birthdate);

-- Order total
CREATE TRIGGER compute_order_total
BEFORE INSERT OR UPDATE ON Order
FOR EACH ROW
EXECUTE GQL
  SET NEW.total = (
    SELECT SUM(quantity * price)
    FROM OrderItem
    WHERE order_id = NEW.id
  );
```

### Audit Logging

Track all data changes:

```gql
-- Comprehensive audit trail
CREATE TRIGGER audit_all_changes
AFTER INSERT OR UPDATE OR DELETE ON Person
FOR EACH ROW
EXECUTE GQL
  INSERT (log:AuditLog {
    table_name: 'Person',
    operation: CASE
      WHEN INSERTING THEN 'INSERT'
      WHEN UPDATING THEN 'UPDATE'
      WHEN DELETING THEN 'DELETE'
    END,
    record_id: COALESCE(NEW.id, OLD.id),
    old_value: OLD.properties,
    new_value: NEW.properties,
    changed_by: CURRENT_USER(),
    changed_at: NOW(),
    ip_address: CURRENT_IP()
  });
```

## Advanced Patterns

### Conditional Triggers

Execute only when conditions met:

```gql
-- Only trigger for significant changes
CREATE TRIGGER notify_major_update
AFTER UPDATE ON Account
FOR EACH ROW
WHEN (ABS(NEW.balance - OLD.balance) > 10000)
EXECUTE GQL
  INSERT (n:Notification {
    type: 'large_transaction',
    account_id: NEW.id,
    old_balance: OLD.balance,
    new_balance: NEW.balance,
    difference: NEW.balance - OLD.balance,
    timestamp: NOW()
  });

-- Status-based triggers
CREATE TRIGGER handle_order_completion
AFTER UPDATE ON Order
FOR EACH ROW
WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
EXECUTE GQL
  INSERT (e:Event {type: 'order_completed', order_id: NEW.id});
  UPDATE Customer SET total_orders = total_orders + 1
    WHERE id = NEW.customer_id;
```

### Multi-Table Triggers

Affect multiple tables:

```gql
-- Cascade inventory update
CREATE TRIGGER update_inventory
AFTER INSERT ON OrderItem
FOR EACH ROW
EXECUTE GQL
  UPDATE Product
  SET stock_quantity = stock_quantity - NEW.quantity,
      last_ordered = NOW()
  WHERE id = NEW.product_id;
  
  INSERT (h:InventoryHistory {
    product_id: NEW.product_id,
    change: -NEW.quantity,
    reason: 'order_placed',
    order_id: NEW.order_id,
    timestamp: NOW()
  });
```

### Recursive Triggers

Triggers that may trigger themselves:

```gql
-- Set recursion limit
SET max_trigger_recursion = 10;

-- Hierarchical update
CREATE TRIGGER propagate_category_update
AFTER UPDATE ON Category
FOR EACH ROW
EXECUTE GQL
  UPDATE Category
  SET parent_updated_at = NEW.updated_at
  WHERE parent_id = NEW.id;
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
SELECT trigger_name, table_name, event, timing, enabled
FROM SYSTEM.triggers;

-- Get trigger definition
SELECT trigger_name, definition
FROM SYSTEM.triggers
WHERE trigger_name = 'audit_new_users';
```

## Performance Considerations

### Trigger Overhead

Minimize impact on write performance:

```gql
-- Batch audit logging instead of per-row
CREATE TRIGGER batch_audit
AFTER INSERT ON Person
FOR EACH STATEMENT
EXECUTE GQL
  INSERT INTO audit_log
  SELECT 'INSERT', NEW.id, NEW.properties, NOW()
  FROM NEW;
```

### Async Triggers

Defer non-critical work:

```gql
-- Queue for async processing
CREATE TRIGGER queue_email
AFTER INSERT ON Person
FOR EACH ROW
EXECUTE GQL
  INSERT INTO email_queue (
    type: 'welcome',
    recipient: NEW.email,
    data: NEW.properties,
    queued_at: NOW()
  );
```

### Trigger Ordering

Control execution order:

```gql
-- Explicit ordering
CREATE TRIGGER validate_first
BEFORE INSERT ON Person
ORDER 1
EXECUTE GQL ...;

CREATE TRIGGER audit_second
BEFORE INSERT ON Person
ORDER 2
EXECUTE GQL ...;
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
CREATE TRIGGER enforce_tenancy
BEFORE INSERT ON Person, Company, Product
FOR EACH ROW
EXECUTE GQL
  SET NEW.tenant_id = CURRENT_TENANT_ID(),
      NEW.created_by = CURRENT_USER();

-- Prevent cross-tenant access
CREATE TRIGGER validate_tenant_access
BEFORE UPDATE OR DELETE ON Person, Company, Product
FOR EACH ROW
WHEN (OLD.tenant_id != CURRENT_TENANT_ID())
EXECUTE GQL
  SIGNAL 'Access denied: cross-tenant operation not allowed';
```

### Data Retention Policy

Automatically archive or delete old data:

```gql
-- Archive records older than 7 years
CREATE TRIGGER enforce_retention_policy
AFTER UPDATE ON Event
FOR EACH ROW
WHEN (NEW.timestamp < datetime().minusYears(7))
EXECUTE GQL
  -- Move to archive
  CREATE (a:ArchivedEvent {
    original_id: NEW.id,
    data: NEW.properties,
    archived_at: datetime()
  })
  IN GRAPH archive_db;

  -- Delete from active
  DELETE NEW;

-- Schedule periodic retention checks
CREATE SCHEDULED TRIGGER retention_cleanup
EVERY '1 day'
EXECUTE GQL
  MATCH (e:Event)
  WHERE e.timestamp < datetime().minusYears(7)
  WITH e LIMIT 1000
  DELETE e;
```

### Bi-Directional Relationship Sync

Maintain symmetric relationships:

```gql
-- When A friends B, also create B friends A
CREATE TRIGGER bidirectional_friendship
AFTER INSERT ON [:FRIEND]
FOR EACH RELATIONSHIP
WHEN NOT EXISTS {
  MATCH (target)-[:FRIEND]->(source)
  WHERE source = startNode(NEW)
    AND target = endNode(NEW)
}
EXECUTE GQL
  MATCH (a), (b)
  WHERE id(a) = id(startNode(NEW))
    AND id(b) = id(endNode(NEW))
  CREATE (b)-[:FRIEND {
    created_at: NEW.created_at,
    bidirectional: true
  }]->(a);

-- When A unfriends B, also remove B friends A
CREATE TRIGGER bidirectional_unfriend
AFTER DELETE ON [:FRIEND]
FOR EACH RELATIONSHIP
EXECUTE GQL
  MATCH (target)-[r:FRIEND]->(source)
  WHERE source = startNode(OLD)
    AND target = endNode(OLD)
  DELETE r;
```

### Denormalization Maintenance

Keep denormalized data in sync:

```gql
-- Update user's post count when posts created/deleted
CREATE TRIGGER maintain_post_count
AFTER INSERT OR DELETE ON Post
FOR EACH ROW
EXECUTE GQL
  MATCH (u:User {id: COALESCE(NEW.author_id, OLD.author_id)})
  WITH u, CASE
    WHEN INSERTING THEN 1
    WHEN DELETING THEN -1
  END AS delta
  SET u.post_count = u.post_count + delta,
      u.last_post_at = CASE
        WHEN INSERTING THEN datetime()
        ELSE u.last_post_at
      END;

-- Maintain aggregated statistics
CREATE TRIGGER update_category_stats
AFTER INSERT OR UPDATE OR DELETE ON Product
FOR EACH ROW
EXECUTE GQL
  MATCH (c:Category {id: COALESCE(NEW.category_id, OLD.category_id)})
  WITH c,
       COUNT{(c)<-[:IN_CATEGORY]-(p:Product)} AS product_count,
       AVG{(c)<-[:IN_CATEGORY]-(p:Product) | p.price} AS avg_price
  SET c.product_count = product_count,
      c.average_price = avg_price,
      c.last_updated = datetime();
```

### Soft Delete Implementation

Mark records as deleted instead of removing them:

```gql
-- Intercept deletes and convert to soft delete
CREATE TRIGGER soft_delete_user
INSTEAD OF DELETE ON Person
FOR EACH ROW
EXECUTE GQL
  MATCH (p:Person)
  WHERE id(p) = id(OLD)
  SET p.deleted_at = datetime(),
      p.deleted_by = CURRENT_USER(),
      p.status = 'deleted'
  REMOVE p:Active
  SET p:Deleted;

-- Hide soft-deleted records from normal queries
CREATE VIEW ActivePersons AS
  MATCH (p:Person)
  WHERE p.deleted_at IS NULL
  RETURN p;
```

## Hook Performance Optimization

### Conditional Execution

Minimize trigger overhead:

```gql
-- Only execute for significant changes
CREATE TRIGGER notify_price_change
AFTER UPDATE ON Product
FOR EACH ROW
WHEN (ABS(NEW.price - OLD.price) / OLD.price > 0.1)  -- >10% change
EXECUTE GQL
  CREATE (n:PriceChangeNotification {
    product_id: NEW.id,
    old_price: OLD.price,
    new_price: NEW.price,
    change_percent: (NEW.price - OLD.price) / OLD.price * 100,
    timestamp: datetime()
  });
```

### Batching Hook Actions

Process multiple rows efficiently:

```gql
-- Per-statement trigger (not per-row)
CREATE TRIGGER batch_audit_inserts
AFTER INSERT ON User
FOR EACH STATEMENT
EXECUTE GQL
  -- NEW represents all inserted rows
  WITH NEW
  UNWIND NEW AS user
  CREATE (a:AuditLog {
    action: 'user_created',
    user_ids: [u IN NEW | u.id],
    count: SIZE(NEW),
    timestamp: datetime()
  });
```

### Async Hook Execution

Defer non-critical work:

```gql
-- Queue for async processing
CREATE TRIGGER queue_welcome_email
AFTER INSERT ON User
FOR EACH ROW
EXECUTE GQL
  CREATE (job:AsyncJob {
    type: 'send_welcome_email',
    user_id: NEW.id,
    user_email: NEW.email,
    queued_at: datetime(),
    status: 'pending'
  });

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
SELECT trigger_name,
       execution_time_ms,
       status,
       error_message
FROM SYSTEM.trigger_execution_log
WHERE timestamp > datetime().minusMinutes(5)
ORDER BY timestamp DESC;
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
-- Create trigger
CREATE TRIGGER compute_full_name
BEFORE INSERT OR UPDATE ON Person
FOR EACH ROW
EXECUTE GQL
  SET NEW.full_name = NEW.first_name || ' ' || NEW.last_name;

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
CREATE TRIGGER audit_new_users_v2
AFTER INSERT ON Person
FOR EACH ROW
EXECUTE GQL
  INSERT (a:AuditLog {
    version: 2,  -- Track trigger version
    action: 'user_created',
    user_id: NEW.id,
    timestamp: NOW(),
    details: NEW.properties,
    ip_address: CURRENT_IP(),  -- New field in v2
    user_agent: CURRENT_USER_AGENT()  -- New field in v2
  });
```

## Learn More

- [Database Triggers (PostgreSQL)](https://www.postgresql.org/docs/current/triggers.html)
- [Trigger Design Patterns](https://use-the-index-luke.com/sql/dml/insert)
- [Oracle Triggers Documentation](https://docs.oracle.com/en/database/oracle/oracle-database/19/lnpls/plsql-triggers.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Database Automation Best Practices](https://www.postgresql.org/docs/current/plpgsql-trigger.html)
