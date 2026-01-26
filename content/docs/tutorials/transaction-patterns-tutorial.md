---
title: "Transaction Patterns Tutorial"
description: "Master ACID transactions in Geode: isolation levels, savepoints, deadlock handling, and practical transaction patterns for data consistency"
keywords: ["transactions", "ACID", "savepoints", "isolation levels", "MVCC", "SSI", "serializable", "deadlock", "consistency", "rollback"]
weight: 60
slug: "transaction-patterns-tutorial"
canonical: "https://geodedb.com/docs/tutorials/transaction-patterns-tutorial/"
---

<!-- CANARY: REQ=REQ-TXN-ISOLATION-003; FEATURE="Serializable Snapshot Isolation"; ASPECT=SerializableSSI; STATUS=TESTED; OWNER=txn; UPDATED=2025-10-05 -->

# Transaction Patterns Tutorial

Master ACID transactions and isolation levels in Geode in this hands-on 30-minute tutorial.

## Prerequisites

- Completed [MATCH Basics Tutorial](/docs/tutorials/match-basics/)
- Geode server running (`geode serve`)
- Access to Geode shell (`geode shell`)
- Understanding of basic SQL transactions (helpful but not required)

## Tutorial Overview

**Time**: 30 minutes
**Difficulty**: Intermediate
**Topics**: ACID properties, isolation levels, savepoints, deadlock handling

By the end of this tutorial, you'll be able to:
- Use transactions for data consistency
- Choose appropriate isolation levels
- Handle concurrent updates safely
- Use savepoints for partial rollback
- Debug and resolve deadlocks
- Implement common transaction patterns

## What are Transactions?

Transactions group multiple operations into a single atomic unit. Either all operations succeed (commit) or none do (rollback), ensuring data consistency.

### ACID Properties

- **Atomicity**: All or nothing - operations complete fully or not at all
- **Consistency**: Data remains valid before and after transaction
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed data survives crashes

## Step 1: Basic Transactions

### Start, Commit, Rollback

```gql
-- Start a transaction
START TRANSACTION;

-- Create data
CREATE (:Account {id: 1, name: 'Alice', balance: 1000});
CREATE (:Account {id: 2, name: 'Bob', balance: 500});

-- Commit to make changes permanent
COMMIT;
```

**Verify**:
```gql
MATCH (a:Account)
RETURN a.name, a.balance;
```

**Expected output**:
```
name  | balance
------|--------
Alice | 1000
Bob   | 500
```

### Rollback on Error

```gql
-- Start transaction
START TRANSACTION;

-- Create node
CREATE (:Account {id: 3, name: 'Carol', balance: 750});

-- Decide to cancel
ROLLBACK;

-- Verify Carol was NOT created
MATCH (a:Account {name: 'Carol'})
RETURN a;
-- Returns 0 rows
```

### What You Learned

- `START TRANSACTION` begins a transaction
- `COMMIT` makes changes permanent
- `ROLLBACK` discards all changes
- Changes are invisible to other connections until commit

## Step 2: Money Transfer Pattern

### Atomic Transfer

```gql
-- Transfer $100 from Alice to Bob
START TRANSACTION;

-- Debit sender
MATCH (alice:Account {name: 'Alice'})
SET alice.balance = alice.balance - 100;

-- Credit receiver
MATCH (bob:Account {name: 'Bob'})
SET bob.balance = bob.balance + 100;

-- Both updates happen or neither does
COMMIT;

-- Verify
MATCH (a:Account)
RETURN a.name, a.balance
ORDER BY a.name;
```

**Expected output**:
```
name  | balance
------|--------
Alice | 900
Bob   | 600
```

### With Validation

```gql
-- Transfer with insufficient funds check
START TRANSACTION;

-- Check sender balance
MATCH (alice:Account {name: 'Alice'})
WHERE alice.balance >= 200
SET alice.balance = alice.balance - 200;

-- If no rows matched, balance was insufficient
-- Transaction still continues but with no changes

-- Credit receiver
MATCH (bob:Account {name: 'Bob'})
SET bob.balance = bob.balance + 200;

COMMIT;
```

### Error Handling Pattern

```python
# Python client - Handle transaction errors
from geode_client import GeodeClient, GeodeError

client = GeodeClient("localhost:3141")

def transfer_money(from_account, to_account, amount):
    """Transfer money with error handling"""
    try:
        # Start transaction
        client.execute("START TRANSACTION")

        # Check balance
        result = client.execute("""
            MATCH (from:Account {name: $from})
            WHERE from.balance >= $amount
            RETURN from.balance
        """, {'from': from_account, 'amount': amount})

        if not result:
            raise ValueError(f"Insufficient funds in {from_account}")

        # Debit sender
        client.execute("""
            MATCH (from:Account {name: $from})
            SET from.balance = from.balance - $amount
        """, {'from': from_account, 'amount': amount})

        # Credit receiver
        client.execute("""
            MATCH (to:Account {name: $to})
            SET to.balance = to.balance + $amount
        """, {'to': to_account, 'amount': amount})

        # Commit
        client.execute("COMMIT")
        print(f"✓ Transferred ${amount} from {from_account} to {to_account}")

    except (GeodeError, ValueError) as e:
        # Rollback on error
        client.execute("ROLLBACK")
        print(f"✗ Transfer failed: {e}")
        raise

# Usage
transfer_money('Alice', 'Bob', 100)
```

## Step 3: Savepoints (Partial Rollback)

### Create Savepoints

```gql
START TRANSACTION;

-- Create first account
CREATE (:Account {id: 4, name: 'David', balance: 1500});
SAVEPOINT sp1;

-- Create second account
CREATE (:Account {id: 5, name: 'Emma', balance: 2000});
SAVEPOINT sp2;

-- Create third account
CREATE (:Account {id: 6, name: 'Frank', balance: 500});

-- Rollback to sp2 (Frank not created)
ROLLBACK TO SAVEPOINT sp2;

-- Rollback to sp1 (Emma also not created)
ROLLBACK TO SAVEPOINT sp1;

-- Commit (only David created)
COMMIT;

-- Verify
MATCH (a:Account)
WHERE a.id IN [4, 5, 6]
RETURN a.name;
```

**Expected output**:
```
name
------
David
```

### Multi-Step Operation

```gql
START TRANSACTION;

-- Step 1: Create user
CREATE (:User {id: 'u1', name: 'John Doe', email: 'john@example.com'});
SAVEPOINT user_created;

-- Step 2: Create preferences
CREATE (:Preferences {user_id: 'u1', theme: 'dark', notifications: true});
SAVEPOINT prefs_created;

-- Step 3: Create profile (fails validation)
CREATE (:Profile {user_id: 'u1', bio: 'This bio is way too long and exceeds the 280 character limit...'});

-- Oops, bio too long - rollback profile only
ROLLBACK TO SAVEPOINT prefs_created;

-- Create valid profile
CREATE (:Profile {user_id: 'u1', bio: 'Software developer'});

-- Commit all
COMMIT;
```

### What You Learned

- `SAVEPOINT name` creates a checkpoint
- `ROLLBACK TO SAVEPOINT name` undoes to that point
- Earlier savepoints remain valid
- Useful for complex multi-step operations

## Step 4: Isolation Levels

### Read Committed (Default)

```gql
-- Transaction 1
START TRANSACTION WITH ISOLATION LEVEL READ COMMITTED;
MATCH (a:Account {name: 'Alice'})
RETURN a.balance;  -- Returns 900

-- (Transaction 2 commits change: balance = 800)

MATCH (a:Account {name: 'Alice'})
RETURN a.balance;  -- Returns 800 (sees committed change)

COMMIT;
```

**Behavior**: Sees other transactions' committed changes during execution.

### Repeatable Read

```gql
-- Transaction 1
START TRANSACTION WITH ISOLATION LEVEL REPEATABLE READ;
MATCH (a:Account {name: 'Alice'})
RETURN a.balance;  -- Returns 900

-- (Transaction 2 commits change: balance = 800)

MATCH (a:Account {name: 'Alice'})
RETURN a.balance;  -- Still returns 900 (repeatable read)

COMMIT;
```

**Behavior**: Sees consistent snapshot throughout transaction.

### Serializable

```gql
-- Transaction 1
START TRANSACTION WITH ISOLATION LEVEL SERIALIZABLE;

-- Read accounts in range
MATCH (a:Account)
WHERE a.balance > 500
RETURN count(a);  -- Returns 2

-- (Transaction 2 tries to insert Account with balance=600)
-- Blocked until Transaction 1 completes (prevents phantom reads)

COMMIT;
```

**Behavior**: Prevents phantom reads, full serializability.

### Isolation Level Comparison

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Performance |
|-------|------------|---------------------|--------------|-------------|
| Read Uncommitted | ❌ Possible | ❌ Possible | ❌ Possible | Fastest |
| Read Committed | ✅ Prevented | ❌ Possible | ❌ Possible | Fast |
| Repeatable Read | ✅ Prevented | ✅ Prevented | ❌ Possible | Medium |
| Serializable | ✅ Prevented | ✅ Prevented | ✅ Prevented | Slowest |

### Choosing Isolation Level

```python
# Python client - Set isolation level
def transfer_with_isolation(from_acc, to_acc, amount, isolation='READ COMMITTED'):
    """Transfer with specific isolation level"""

    client.execute(f"START TRANSACTION WITH ISOLATION LEVEL {isolation}")

    try:
        # Check balance (with chosen isolation)
        result = client.execute("""
            MATCH (from:Account {name: $from})
            RETURN from.balance
        """, {'from': from_acc})

        if result[0]['from.balance'] < amount:
            raise ValueError("Insufficient funds")

        # Perform transfer
        client.execute("""
            MATCH (from:Account {name: $from})
            SET from.balance = from.balance - $amount
        """, {'from': from_acc, 'amount': amount})

        client.execute("""
            MATCH (to:Account {name: $to})
            SET to.balance = to.balance + $amount
        """, {'to': to_acc, 'amount': amount})

        client.execute("COMMIT")

    except Exception as e:
        client.execute("ROLLBACK")
        raise

# Use serializable for critical operations
transfer_with_isolation('Alice', 'Bob', 100, isolation='SERIALIZABLE')
```

## Step 5: Concurrent Updates

### Lost Update Problem

```gql
-- Transaction 1 (T1)
START TRANSACTION;
MATCH (a:Account {name: 'Alice'})
SET a.balance = a.balance + 100;  -- Reads 900, sets 1000

-- Transaction 2 (T2) - runs concurrently
START TRANSACTION;
MATCH (a:Account {name: 'Alice'})
SET a.balance = a.balance + 50;   -- Reads 900, sets 950

-- T1 commits: balance = 1000
COMMIT;  -- (T1)

-- T2 commits: balance = 950 (overwrites T1's update!)
COMMIT;  -- (T2)

-- Lost update! Should be 1050
```

### Solution: Use SERIALIZABLE

```gql
-- Transaction 1
START TRANSACTION WITH ISOLATION LEVEL SERIALIZABLE;
MATCH (a:Account {name: 'Alice'})
SET a.balance = a.balance + 100;
COMMIT;

-- Transaction 2 (blocks until T1 commits)
START TRANSACTION WITH ISOLATION LEVEL SERIALIZABLE;
MATCH (a:Account {name: 'Alice'})
SET a.balance = a.balance + 50;  -- Reads committed value from T1
COMMIT;

-- Correct: balance updated by both transactions
```

### Optimistic Locking Pattern

```gql
-- Read with version
MATCH (a:Account {name: 'Alice'})
RETURN a.balance, a.version;

-- Update with version check
START TRANSACTION;
MATCH (a:Account {name: 'Alice'})
WHERE a.version = $expected_version
SET a.balance = a.balance + 100,
    a.version = a.version + 1;
COMMIT;

-- If no rows updated, version changed (concurrent update detected)
```

## Step 6: Deadlock Handling

### Deadlock Scenario

```gql
-- Transaction 1
START TRANSACTION;
MATCH (alice:Account {name: 'Alice'})
SET alice.balance = alice.balance - 50;

-- Transaction 2 (concurrent)
START TRANSACTION;
MATCH (bob:Account {name: 'Bob'})
SET bob.balance = bob.balance - 50;

-- Transaction 1 (waits for Bob)
MATCH (bob:Account {name: 'Bob'})
SET bob.balance = bob.balance + 50;

-- Transaction 2 (waits for Alice) - DEADLOCK!
MATCH (alice:Account {name: 'Alice'})
SET alice.balance = alice.balance + 50;

-- One transaction aborted automatically
```

### Deadlock Prevention - Lock Ordering

```gql
-- Always acquire locks in consistent order (e.g., alphabetically)

-- Transaction 1
START TRANSACTION;
-- Lock Alice first, then Bob (alphabetical order)
MATCH (alice:Account {name: 'Alice'})
SET alice.balance = alice.balance - 50;

MATCH (bob:Account {name: 'Bob'})
SET bob.balance = bob.balance + 50;
COMMIT;

-- Transaction 2
START TRANSACTION;
-- Also lock Alice first, then Bob (same order!)
MATCH (alice:Account {name: 'Alice'})
SET alice.balance = alice.balance + 25;

MATCH (bob:Account {name: 'Bob'})
SET bob.balance = bob.balance - 25;
COMMIT;

-- No deadlock - consistent lock ordering
```

### Retry Logic

```python
# Python client - Retry on deadlock
import time
from geode_client import GeodeError

def transfer_with_retry(from_acc, to_acc, amount, max_retries=3):
    """Transfer with deadlock retry logic"""

    for attempt in range(max_retries):
        try:
            client.execute("START TRANSACTION")

            # Sort accounts to ensure consistent lock order
            accounts = sorted([from_acc, to_acc])

            # Acquire locks in consistent order
            for account in accounts:
                client.execute("""
                    MATCH (a:Account {name: $name})
                    RETURN a.balance
                """, {'name': account})

            # Perform transfer
            client.execute("""
                MATCH (from:Account {name: $from})
                SET from.balance = from.balance - $amount
            """, {'from': from_acc, 'amount': amount})

            client.execute("""
                MATCH (to:Account {name: $to})
                SET to.balance = to.balance + $amount
            """, {'to': to_acc, 'amount': amount})

            client.execute("COMMIT")
            return  # Success

        except GeodeError as e:
            client.execute("ROLLBACK")

            if 'deadlock' in str(e).lower():
                if attempt < max_retries - 1:
                    # Exponential backoff
                    wait_time = (2 ** attempt) * 0.1
                    time.sleep(wait_time)
                    print(f"Deadlock detected, retrying (attempt {attempt + 2})...")
                    continue

            raise  # Re-raise if not deadlock or max retries exceeded

# Usage
transfer_with_retry('Alice', 'Bob', 100)
```

## Step 7: Common Transaction Patterns

### Batch Insert with Rollback

```gql
START TRANSACTION;

-- Insert batch
UNWIND range(1, 1000) AS i
CREATE (:Product {id: i, name: 'Product ' + i, price: i * 10});

-- Verify count
MATCH (p:Product)
WITH count(p) AS product_count
WHERE product_count < 1000
CALL {
    ROLLBACK;
    RETURN 'Rolled back - insufficient products' AS status
}

-- Otherwise commit
COMMIT;
```

### Audit Trail Pattern

```gql
START TRANSACTION;

-- Make change
MATCH (a:Account {name: 'Alice'})
SET a.balance = a.balance - 500;

-- Record audit log
CREATE (:AuditLog {
    timestamp: timestamp(),
    account: 'Alice',
    operation: 'withdrawal',
    amount: 500,
    new_balance: a.balance
});

COMMIT;
```

### Cascading Deletes

```gql
START TRANSACTION;

-- Delete user
MATCH (u:User {id: 'u1'})
DELETE u;

-- Delete related data
MATCH (pref:Preferences {user_id: 'u1'})
DELETE pref;

MATCH (prof:Profile {user_id: 'u1'})
DELETE prof;

MATCH (post:Post)-[:AUTHORED_BY]->(:User {id: 'u1'})
DETACH DELETE post;

COMMIT;
```

### Conditional Update

```gql
START TRANSACTION;

-- Update if condition met
MATCH (a:Account {name: 'Alice'})
WHERE a.balance >= 1000
SET a.status = 'premium',
    a.discount_rate = 0.1;

-- Create notification if updated
MATCH (a:Account {name: 'Alice'})
WHERE a.status = 'premium'
CREATE (:Notification {
    user: a.name,
    message: 'Congratulations! You are now a premium member',
    timestamp: timestamp()
});

COMMIT;
```

## Step 8: Performance Considerations

### Keep Transactions Short

```gql
-- Bad: Long-running transaction
START TRANSACTION;

MATCH (p:Product)
WHERE p.category = 'Electronics'
WITH collect(p) AS products
-- Processing takes 30 seconds...
UNWIND products AS p
SET p.processed = true;

COMMIT;
-- Holds locks for 30+ seconds!

-- Good: Shorter transactions
MATCH (p:Product)
WHERE p.category = 'Electronics'
RETURN collect(p.id) AS product_ids;

-- Process in application layer

-- Quick update transaction
START TRANSACTION;
UNWIND $product_ids AS id
MATCH (p:Product {id: id})
SET p.processed = true;
COMMIT;
```

### Batch Operations

```python
# Python client - Batch updates
def batch_update(product_ids, batch_size=100):
    """Update products in batches"""

    for i in range(0, len(product_ids), batch_size):
        batch = product_ids[i:i + batch_size]

        client.execute("START TRANSACTION")

        try:
            client.execute("""
                UNWIND $ids AS id
                MATCH (p:Product {id: id})
                SET p.processed = true
            """, {'ids': batch})

            client.execute("COMMIT")

        except Exception as e:
            client.execute("ROLLBACK")
            raise

# Process 10,000 products in batches of 100
batch_update(product_ids, batch_size=100)
```

## Complete Example: E-Commerce Order Processing

```gql
START TRANSACTION WITH ISOLATION LEVEL SERIALIZABLE;

-- Create order
CREATE (order:Order {
    id: 'ord_12345',
    customer: 'Alice',
    total: 0,
    status: 'pending',
    created: timestamp()
});
SAVEPOINT order_created;

-- Add order items
UNWIND [
    {product_id: 'p1', quantity: 2, price: 50},
    {product_id: 'p2', quantity: 1, price: 100}
] AS item
MATCH (order:Order {id: 'ord_12345'})
MATCH (product:Product {id: item.product_id})
WHERE product.stock >= item.quantity
CREATE (order)-[:CONTAINS {
    quantity: item.quantity,
    price: item.price
}]->(product)
SET product.stock = product.stock - item.quantity;
SAVEPOINT items_added;

-- Check all items added
MATCH (order:Order {id: 'ord_12345'})-[c:CONTAINS]->()
WITH order, sum(c.quantity * c.price) AS calculated_total
WHERE calculated_total > 0
SET order.total = calculated_total,
    order.status = 'confirmed';

-- Create shipment
MATCH (order:Order {id: 'ord_12345'})
WHERE order.status = 'confirmed'
CREATE (:Shipment {
    order_id: order.id,
    status: 'preparing',
    created: timestamp()
});

COMMIT;

-- Verify
MATCH (order:Order {id: 'ord_12345'})
OPTIONAL MATCH (order)-[c:CONTAINS]->(product:Product)
OPTIONAL MATCH (ship:Shipment {order_id: order.id})
RETURN order.status,
       order.total,
       collect({product: product.name, quantity: c.quantity}) AS items,
       ship.status AS shipment_status;
```

## Troubleshooting

### Transaction Already Active

**Problem**: Error when starting transaction

**Solution**:
```gql
-- Rollback previous transaction
ROLLBACK;

-- Then start new one
START TRANSACTION;
```

### No Active Transaction

**Problem**: COMMIT or ROLLBACK without START TRANSACTION

**Solution**:
```gql
-- Always start transaction first
START TRANSACTION;
-- ... operations ...
COMMIT;
```

### Deadlock Detected

**Problem**: Transactions waiting on each other

**Solutions**:
- Use consistent lock ordering
- Implement retry logic with exponential backoff
- Keep transactions short
- Consider lower isolation level

## Next Steps

- [Advanced Transaction Patterns](/docs/transactions/advanced-patterns/) - Complex transaction scenarios
- [Performance Tuning](/docs/performance/) - Optimize transaction performance
- [Real-Time Analytics](/docs/analytics/real-time-analytics/) - Streaming with transactions
- [GQL Guide](/docs/gql/guide/) - Complete transaction syntax

## Quick Reference

### Transaction Commands

```gql
-- Start transaction
START TRANSACTION;
START TRANSACTION WITH ISOLATION LEVEL SERIALIZABLE;

-- Savepoints
SAVEPOINT savepoint_name;
ROLLBACK TO SAVEPOINT savepoint_name;
RELEASE SAVEPOINT savepoint_name;

-- Commit/Rollback
COMMIT;
ROLLBACK;
```

### Isolation Levels

```gql
READ UNCOMMITTED   -- Lowest isolation, highest concurrency
READ COMMITTED     -- Default, prevents dirty reads
REPEATABLE READ    -- Prevents non-repeatable reads
SERIALIZABLE       -- Highest isolation, lowest concurrency
```

### Best Practices

- ✅ Keep transactions short
- ✅ Use appropriate isolation level
- ✅ Handle deadlocks with retry logic
- ✅ Use savepoints for complex operations
- ✅ Always commit or rollback
- ❌ Don't hold transactions during user input
- ❌ Don't perform expensive operations in transactions
- ❌ Don't ignore deadlock errors

---

**Tutorial Complete!** You now understand ACID transactions and isolation levels in Geode.

**Next**: [Graph Algorithms Tutorial](/docs/tutorials/graph-algorithms-tutorial/)
