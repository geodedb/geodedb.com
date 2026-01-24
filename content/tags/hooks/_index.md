---
title: "Database Hooks & Triggers"
description: "Automatic execution of custom logic in response to database events using hooks and triggers in Geode"
keywords: ["database hooks", "triggers", "event triggers", "before trigger", "after trigger", "database automation", "lifecycle hooks", "callback functions"]
weight: 10
---

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

## Learn More

- [Database Triggers (PostgreSQL)](https://www.postgresql.org/docs/current/triggers.html)
- [Trigger Design Patterns](https://use-the-index-luke.com/sql/dml/insert)
