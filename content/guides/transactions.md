---
title: "Transaction Management Guide"
slug: "transactions"
description: "Comprehensive guide to managing transactions in Geode including ACID guarantees, isolation levels, savepoints, and concurrency control"
weight: 42
tags: ["transactions", "acid", "isolation", "concurrency", "savepoints"]
categories: ["guides", "development"]
keywords:
  - Geode transactions
  - graph database transactions
  - ACID guarantees
  - transaction isolation
  - savepoints
  - deadlock prevention
  - optimistic concurrency
  - pessimistic locking
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Transaction Management Guide

Transactions are fundamental to maintaining data integrity in Geode. This guide covers ACID guarantees, isolation levels, transaction patterns, and best practices for building reliable applications.

## Understanding ACID Guarantees

Geode provides full ACID compliance for all transactions.

### Atomicity

**All or nothing**: Either all operations in a transaction succeed, or none do.

```gql
BEGIN

-- These operations are atomic
CREATE (:Account {id: 1, balance: 1000})
CREATE (:Account {id: 2, balance: 500})

MATCH (a:Account {id: 1}), (b:Account {id: 2})
CREATE (a)-[:TRANSFER {amount: 100, timestamp: timestamp()}]->(b)

MATCH (a:Account {id: 1}) SET a.balance = a.balance - 100
MATCH (b:Account {id: 2}) SET b.balance = b.balance + 100

COMMIT
-- If any operation fails, all changes are rolled back
```

### Consistency

**Valid state transitions**: Transactions move the database from one valid state to another.

```gql
-- Constraints ensure consistency
CREATE CONSTRAINT account_balance_positive ON :Account(balance) ASSERT balance >= 0

-- This transaction will fail if it would make balance negative
BEGIN
MATCH (a:Account {id: 1}) SET a.balance = a.balance - 2000
COMMIT
-- Fails: constraint violation, transaction rolled back
```

### Isolation

**Concurrent transactions don't interfere**: Each transaction sees a consistent view of data.

```gql
-- Transaction 1                    -- Transaction 2
BEGIN                               BEGIN
MATCH (a:Account {id: 1})           MATCH (a:Account {id: 1})
-- sees balance = 1000              -- also sees balance = 1000
SET a.balance = 900                 SET a.balance = 800
COMMIT                              COMMIT
                                    -- One transaction will be serialized
                                    -- No lost updates
```

### Durability

**Committed data persists**: Once committed, data survives system failures.

```gql
BEGIN
CREATE (:ImportantData {value: "critical"})
COMMIT
-- Data is written to disk before commit returns
-- Survives power loss, crashes, etc.
```

## Transaction Isolation Levels

Geode supports multiple isolation levels to balance consistency and performance.

### Available Isolation Levels

| Level | Dirty Reads | Non-repeatable Reads | Phantom Reads | Description |
|-------|-------------|---------------------|---------------|-------------|
| READ UNCOMMITTED | Yes | Yes | Yes | Lowest isolation, highest performance |
| READ COMMITTED | No | Yes | Yes | Default level, sees committed data only |
| REPEATABLE READ | No | No | Yes | Consistent reads within transaction |
| SERIALIZABLE | No | No | No | Highest isolation, transactions appear sequential |

### Setting Isolation Level

{{< tabs >}}
{{< tab "Go" >}}

```go
package main

import (
    "context"
    "database/sql"
    "log"

    _ "geodedb.com/geode"
)

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()

    // Start transaction with specific isolation level
    tx, err := db.BeginTx(ctx, &sql.TxOptions{
        Isolation: sql.LevelSerializable,
    })
    if err != nil {
        log.Fatal(err)
    }

    // Execute operations
    _, err = tx.ExecContext(ctx, `
        MATCH (a:Account {id: ?}) SET a.balance = a.balance - ?
    `, 1, 100)
    if err != nil {
        tx.Rollback()
        log.Fatal(err)
    }

    _, err = tx.ExecContext(ctx, `
        MATCH (a:Account {id: ?}) SET a.balance = a.balance + ?
    `, 2, 100)
    if err != nil {
        tx.Rollback()
        log.Fatal(err)
    }

    if err := tx.Commit(); err != nil {
        log.Fatal(err)
    }

    log.Println("Transfer completed successfully")
}

// Different isolation levels for different use cases
func readOnlyQuery(db *sql.DB) {
    ctx := context.Background()

    // Read committed is sufficient for read-only queries
    tx, _ := db.BeginTx(ctx, &sql.TxOptions{
        Isolation: sql.LevelReadCommitted,
        ReadOnly:  true,
    })
    defer tx.Rollback()

    rows, _ := tx.QueryContext(ctx, "MATCH (n) RETURN count(n)")
    defer rows.Close()
    // Process results
}

func criticalFinancialOperation(db *sql.DB) {
    ctx := context.Background()

    // Serializable for critical operations
    tx, _ := db.BeginTx(ctx, &sql.TxOptions{
        Isolation: sql.LevelSerializable,
    })
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
        }
    }()

    // Critical operations here
    tx.Commit()
}
```

{{< /tab >}}
{{< tab "Python" >}}

```python
import asyncio
from enum import Enum
from geode_client import Client, IsolationLevel

class TransactionIsolation(Enum):
    READ_UNCOMMITTED = "read_uncommitted"
    READ_COMMITTED = "read_committed"
    REPEATABLE_READ = "repeatable_read"
    SERIALIZABLE = "serializable"


async def transfer_funds(
    client: Client,
    from_account: int,
    to_account: int,
    amount: float,
    isolation: TransactionIsolation = TransactionIsolation.SERIALIZABLE
) -> None:
    """Transfer funds between accounts with specified isolation level."""
    async with client.connection() as conn:
        # Begin transaction with isolation level
        await conn.begin(isolation_level=isolation.value)

        try:
            # Debit source account
            await conn.execute("""
                MATCH (a:Account {id: $id})
                SET a.balance = a.balance - $amount
            """, {"id": from_account, "amount": amount})

            # Credit destination account
            await conn.execute("""
                MATCH (a:Account {id: $id})
                SET a.balance = a.balance + $amount
            """, {"id": to_account, "amount": amount})

            await conn.commit()
            print("Transfer completed successfully")

        except Exception as e:
            await conn.rollback()
            print(f"Transfer failed: {e}")
            raise


async def read_only_query(client: Client) -> int:
    """Execute read-only query with appropriate isolation."""
    async with client.connection() as conn:
        # Read committed is sufficient for read-only
        await conn.begin(
            isolation_level="read_committed",
            read_only=True
        )

        try:
            result, _ = await conn.query("MATCH (n) RETURN count(n) as count")
            count = result.rows[0]["count"].as_int if result.rows else 0
            await conn.commit()
            return count
        except Exception:
            await conn.rollback()
            raise


async def critical_operation(client: Client) -> None:
    """Execute critical operation with serializable isolation."""
    async with client.connection() as conn:
        await conn.begin(isolation_level="serializable")

        try:
            # Check preconditions
            result, _ = await conn.query("""
                MATCH (a:Account {id: 1})
                RETURN a.balance as balance
            """)

            balance = result.rows[0]["balance"].as_float if result.rows else 0

            if balance < 100:
                raise ValueError("Insufficient funds")

            # Perform critical update
            await conn.execute("""
                MATCH (a:Account {id: 1})
                SET a.balance = a.balance - 100
            """)

            await conn.commit()

        except Exception as e:
            await conn.rollback()
            raise


async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)

    # Different isolation for different operations
    await transfer_funds(
        client, 1, 2, 100.0,
        isolation=TransactionIsolation.SERIALIZABLE
    )

    count = await read_only_query(client)
    print(f"Total nodes: {count}")


if __name__ == "__main__":
    asyncio.run(main())
```

{{< /tab >}}
{{< tab "Rust" >}}

```rust
use geode_client::{Client, Connection, IsolationLevel, TransactionOptions, Value};
use std::collections::HashMap;

async fn transfer_funds(
    conn: &mut Connection,
    from_account: i64,
    to_account: i64,
    amount: f64,
    isolation: IsolationLevel,
) -> Result<(), Box<dyn std::error::Error>> {
    // Begin transaction with specified isolation level
    let options = TransactionOptions {
        isolation_level: isolation,
        read_only: false,
    };
    conn.begin_with_options(options).await?;

    // Debit source account
    let mut params = HashMap::new();
    params.insert("id".to_string(), Value::int(from_account));
    params.insert("amount".to_string(), Value::float(amount));

    match conn.query_with_params(
        "MATCH (a:Account {id: $id}) SET a.balance = a.balance - $amount",
        &params
    ).await {
        Ok(_) => {}
        Err(e) => {
            conn.rollback().await?;
            return Err(e.into());
        }
    }

    // Credit destination account
    params.insert("id".to_string(), Value::int(to_account));

    match conn.query_with_params(
        "MATCH (a:Account {id: $id}) SET a.balance = a.balance + $amount",
        &params
    ).await {
        Ok(_) => {
            conn.commit().await?;
            println!("Transfer completed successfully");
            Ok(())
        }
        Err(e) => {
            conn.rollback().await?;
            Err(e.into())
        }
    }
}

async fn read_only_query(conn: &mut Connection) -> Result<i64, Box<dyn std::error::Error>> {
    // Read committed is sufficient for read-only
    let options = TransactionOptions {
        isolation_level: IsolationLevel::ReadCommitted,
        read_only: true,
    };
    conn.begin_with_options(options).await?;

    let (page, _) = conn.query("MATCH (n) RETURN count(n) as count").await?;
    let count = page.rows.first()
        .and_then(|row| row.get("count"))
        .and_then(|v| v.as_int().ok())
        .unwrap_or(0);

    conn.commit().await?;
    Ok(count)
}

async fn critical_operation(conn: &mut Connection) -> Result<(), Box<dyn std::error::Error>> {
    // Serializable for critical operations
    let options = TransactionOptions {
        isolation_level: IsolationLevel::Serializable,
        read_only: false,
    };
    conn.begin_with_options(options).await?;

    // Check preconditions
    let (page, _) = conn.query(
        "MATCH (a:Account {id: 1}) RETURN a.balance as balance"
    ).await?;

    let balance = page.rows.first()
        .and_then(|row| row.get("balance"))
        .and_then(|v| v.as_float().ok())
        .unwrap_or(0.0);

    if balance < 100.0 {
        conn.rollback().await?;
        return Err("Insufficient funds".into());
    }

    // Perform critical update
    match conn.query(
        "MATCH (a:Account {id: 1}) SET a.balance = a.balance - 100"
    ).await {
        Ok(_) => {
            conn.commit().await?;
            Ok(())
        }
        Err(e) => {
            conn.rollback().await?;
            Err(e.into())
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    // Transfer with serializable isolation
    transfer_funds(&mut conn, 1, 2, 100.0, IsolationLevel::Serializable).await?;

    // Read-only query
    let count = read_only_query(&mut conn).await?;
    println!("Total nodes: {}", count);

    Ok(())
}
```

{{< /tab >}}
{{< tab "Node.js" >}}

```typescript
import { createClient, GeodeClient, IsolationLevel } from '@geodedb/client';

enum TransactionIsolation {
    READ_UNCOMMITTED = 'read_uncommitted',
    READ_COMMITTED = 'read_committed',
    REPEATABLE_READ = 'repeatable_read',
    SERIALIZABLE = 'serializable',
}

async function transferFunds(
    client: GeodeClient,
    fromAccount: number,
    toAccount: number,
    amount: number,
    isolation: TransactionIsolation = TransactionIsolation.SERIALIZABLE
): Promise<void> {
    await client.withTransaction(
        async (tx) => {
            // Debit source account
            await tx.exec(
                'MATCH (a:Account {id: $id}) SET a.balance = a.balance - $amount',
                { params: { id: fromAccount, amount } }
            );

            // Credit destination account
            await tx.exec(
                'MATCH (a:Account {id: $id}) SET a.balance = a.balance + $amount',
                { params: { id: toAccount, amount } }
            );
        },
        { isolationLevel: isolation }
    );

    console.log('Transfer completed successfully');
}

async function readOnlyQuery(client: GeodeClient): Promise<number> {
    let count = 0;

    await client.withTransaction(
        async (tx) => {
            const rows = await tx.queryAll('MATCH (n) RETURN count(n) as count');
            count = rows[0]?.get('count')?.asNumber || 0;
        },
        {
            isolationLevel: TransactionIsolation.READ_COMMITTED,
            readOnly: true,
        }
    );

    return count;
}

async function criticalOperation(client: GeodeClient): Promise<void> {
    await client.withTransaction(
        async (tx) => {
            // Check preconditions
            const rows = await tx.queryAll(
                'MATCH (a:Account {id: 1}) RETURN a.balance as balance'
            );

            const balance = rows[0]?.get('balance')?.asNumber || 0;

            if (balance < 100) {
                throw new Error('Insufficient funds');
            }

            // Perform critical update
            await tx.exec(
                'MATCH (a:Account {id: 1}) SET a.balance = a.balance - 100'
            );
        },
        { isolationLevel: TransactionIsolation.SERIALIZABLE }
    );
}

async function main() {
    const client = await createClient('quic://localhost:3141');

    try {
        // Transfer with serializable isolation
        await transferFunds(client, 1, 2, 100, TransactionIsolation.SERIALIZABLE);

        // Read-only query
        const count = await readOnlyQuery(client);
        console.log(`Total nodes: ${count}`);

        // Critical operation
        await criticalOperation(client);
    } finally {
        await client.close();
    }
}

main().catch(console.error);
```

{{< /tab >}}
{{< tab "Zig" >}}

```zig
const std = @import("std");
const geode = @import("geode_client");

pub const IsolationLevel = enum {
    read_uncommitted,
    read_committed,
    repeatable_read,
    serializable,

    pub fn toString(self: IsolationLevel) []const u8 {
        return switch (self) {
            .read_uncommitted => "READ UNCOMMITTED",
            .read_committed => "READ COMMITTED",
            .repeatable_read => "REPEATABLE READ",
            .serializable => "SERIALIZABLE",
        };
    }
};

pub fn transferFunds(
    client: *geode.GeodeClient,
    from_account: i64,
    to_account: i64,
    amount: f64,
    isolation: IsolationLevel,
) !void {
    // Begin transaction with isolation level
    const begin_query = try std.fmt.allocPrint(
        client.allocator,
        "BEGIN ISOLATION LEVEL {s}",
        .{isolation.toString()},
    );
    defer client.allocator.free(begin_query);

    try client.sendRunGql(1, begin_query, null);
    _ = try client.receiveMessage(30000);

    // Debit source account
    var params = std.json.ObjectMap.init(client.allocator);
    defer params.deinit();
    try params.put("id", .{ .integer = from_account });
    try params.put("amount", .{ .float = amount });

    client.sendRunGql(2,
        "MATCH (a:Account {id: $id}) SET a.balance = a.balance - $amount",
        .{ .object = params }) catch |e| {
        try client.sendRollback();
        _ = try client.receiveMessage(30000);
        return e;
    };
    _ = try client.receiveMessage(30000);

    // Credit destination account
    params.clearRetainingCapacity();
    try params.put("id", .{ .integer = to_account });
    try params.put("amount", .{ .float = amount });

    client.sendRunGql(3,
        "MATCH (a:Account {id: $id}) SET a.balance = a.balance + $amount",
        .{ .object = params }) catch |e| {
        try client.sendRollback();
        _ = try client.receiveMessage(30000);
        return e;
    };
    _ = try client.receiveMessage(30000);

    // Commit
    try client.sendCommit();
    _ = try client.receiveMessage(30000);

    std.debug.print("Transfer completed successfully\n", .{});
}

pub fn readOnlyQuery(client: *geode.GeodeClient) !i64 {
    // Read committed is sufficient for read-only
    try client.sendRunGql(1, "BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY", null);
    _ = try client.receiveMessage(30000);

    try client.sendRunGql(2, "MATCH (n) RETURN count(n) as count", null);
    _ = try client.receiveMessage(30000);

    try client.sendPull(2, 1000);
    const result = try client.receiveMessage(30000);
    defer client.allocator.free(result);

    try client.sendCommit();
    _ = try client.receiveMessage(30000);

    // Parse count from result (simplified)
    // In practice, parse JSON to extract count value
    return 0;
}

pub fn criticalOperation(client: *geode.GeodeClient) !void {
    // Serializable for critical operations
    try client.sendRunGql(1, "BEGIN ISOLATION LEVEL SERIALIZABLE", null);
    _ = try client.receiveMessage(30000);

    // Check preconditions
    try client.sendRunGql(2,
        "MATCH (a:Account {id: 1}) RETURN a.balance as balance",
        null);
    _ = try client.receiveMessage(30000);

    try client.sendPull(2, 1000);
    const balance_result = try client.receiveMessage(30000);
    defer client.allocator.free(balance_result);

    // Parse and check balance (simplified)
    // In practice, parse JSON and check balance >= 100

    // Perform critical update
    client.sendRunGql(3,
        "MATCH (a:Account {id: 1}) SET a.balance = a.balance - 100",
        null) catch |e| {
        try client.sendRollback();
        _ = try client.receiveMessage(30000);
        return e;
    };
    _ = try client.receiveMessage(30000);

    try client.sendCommit();
    _ = try client.receiveMessage(30000);
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.sendHello("app", "1.0.0");
    _ = try client.receiveMessage(30000);

    // Transfer with serializable isolation
    try transferFunds(&client, 1, 2, 100.0, .serializable);

    // Read-only query
    const count = try readOnlyQuery(&client);
    std.debug.print("Total nodes: {d}\n", .{count});

    // Critical operation
    try criticalOperation(&client);
}
```

{{< /tab >}}
{{< /tabs >}}

## Starting and Committing Transactions

### Basic Transaction Flow

{{< tabs >}}
{{< tab "Go" >}}

```go
func basicTransaction(db *sql.DB) error {
    ctx := context.Background()

    // Begin transaction
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }

    // Ensure cleanup on panic
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
            panic(r)
        }
    }()

    // Execute operations
    _, err = tx.ExecContext(ctx, "CREATE (:Person {name: ?})", "Alice")
    if err != nil {
        tx.Rollback()
        return fmt.Errorf("failed to create person: %w", err)
    }

    _, err = tx.ExecContext(ctx, "CREATE (:Person {name: ?})", "Bob")
    if err != nil {
        tx.Rollback()
        return fmt.Errorf("failed to create person: %w", err)
    }

    // Commit transaction
    if err := tx.Commit(); err != nil {
        return fmt.Errorf("failed to commit: %w", err)
    }

    return nil
}

// Helper function for transaction execution
func withTransaction(db *sql.DB, fn func(tx *sql.Tx) error) error {
    ctx := context.Background()

    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }

    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
            panic(r)
        }
    }()

    if err := fn(tx); err != nil {
        tx.Rollback()
        return err
    }

    return tx.Commit()
}

// Usage
func main() {
    db, _ := sql.Open("geode", "localhost:3141")
    defer db.Close()

    err := withTransaction(db, func(tx *sql.Tx) error {
        ctx := context.Background()
        _, err := tx.ExecContext(ctx, "CREATE (:Person {name: ?})", "Alice")
        return err
    })

    if err != nil {
        log.Fatal(err)
    }
}
```

{{< /tab >}}
{{< tab "Python" >}}

```python
async def basic_transaction(client: Client) -> None:
    """Basic transaction with explicit begin/commit."""
    async with client.connection() as conn:
        # Begin transaction
        await conn.begin()

        try:
            # Execute operations
            await conn.execute(
                "CREATE (:Person {name: $name})",
                {"name": "Alice"}
            )

            await conn.execute(
                "CREATE (:Person {name: $name})",
                {"name": "Bob"}
            )

            # Commit transaction
            await conn.commit()
            print("Transaction committed successfully")

        except Exception as e:
            # Rollback on error
            await conn.rollback()
            print(f"Transaction rolled back: {e}")
            raise


# Context manager for automatic transaction handling
class TransactionContext:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        await self.conn.begin()
        return self.conn

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            await self.conn.rollback()
            return False
        await self.conn.commit()
        return True


async def with_transaction(client: Client, operations) -> None:
    """Execute operations within a transaction context."""
    async with client.connection() as conn:
        async with TransactionContext(conn):
            await operations(conn)


# Usage
async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)

    async def create_people(conn):
        await conn.execute(
            "CREATE (:Person {name: $name})",
            {"name": "Alice"}
        )
        await conn.execute(
            "CREATE (:Person {name: $name})",
            {"name": "Bob"}
        )

    await with_transaction(client, create_people)
```

{{< /tab >}}
{{< tab "Rust" >}}

```rust
async fn basic_transaction(conn: &mut Connection) -> Result<(), Error> {
    // Begin transaction
    conn.begin().await?;

    // Execute operations
    let result = async {
        let mut params = HashMap::new();
        params.insert("name".to_string(), Value::string("Alice"));
        conn.query_with_params(
            "CREATE (:Person {name: $name})",
            &params
        ).await?;

        params.insert("name".to_string(), Value::string("Bob"));
        conn.query_with_params(
            "CREATE (:Person {name: $name})",
            &params
        ).await?;

        Ok::<(), Error>(())
    }.await;

    match result {
        Ok(_) => {
            conn.commit().await?;
            println!("Transaction committed successfully");
            Ok(())
        }
        Err(e) => {
            conn.rollback().await?;
            println!("Transaction rolled back: {}", e);
            Err(e)
        }
    }
}

// Helper function for transaction execution
async fn with_transaction<F, Fut, T>(
    conn: &mut Connection,
    operations: F
) -> Result<T, Error>
where
    F: FnOnce(&mut Connection) -> Fut,
    Fut: std::future::Future<Output = Result<T, Error>>,
{
    conn.begin().await?;

    match operations(conn).await {
        Ok(result) => {
            conn.commit().await?;
            Ok(result)
        }
        Err(e) => {
            let _ = conn.rollback().await;
            Err(e)
        }
    }
}

// Usage
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    with_transaction(&mut conn, |conn| async move {
        let mut params = HashMap::new();
        params.insert("name".to_string(), Value::string("Alice"));
        conn.query_with_params(
            "CREATE (:Person {name: $name})",
            &params
        ).await?;
        Ok(())
    }).await?;

    Ok(())
}
```

{{< /tab >}}
{{< tab "Node.js" >}}

```typescript
async function basicTransaction(client: GeodeClient): Promise<void> {
    // Using withTransaction helper
    await client.withTransaction(async (tx) => {
        // Execute operations
        await tx.exec(
            'CREATE (:Person {name: $name})',
            { params: { name: 'Alice' } }
        );

        await tx.exec(
            'CREATE (:Person {name: $name})',
            { params: { name: 'Bob' } }
        );

        // Transaction auto-commits on success
    });

    console.log('Transaction committed successfully');
}

// Manual transaction control
async function manualTransaction(client: GeodeClient): Promise<void> {
    const conn = await client.getConnection();

    try {
        await conn.begin();

        await conn.exec(
            'CREATE (:Person {name: $name})',
            { params: { name: 'Alice' } }
        );

        await conn.exec(
            'CREATE (:Person {name: $name})',
            { params: { name: 'Bob' } }
        );

        await conn.commit();
        console.log('Transaction committed successfully');

    } catch (error) {
        await conn.rollback();
        console.error('Transaction rolled back:', error);
        throw error;

    } finally {
        conn.release();
    }
}

// Helper function
async function withTransaction<T>(
    client: GeodeClient,
    operations: (tx: Transaction) => Promise<T>
): Promise<T> {
    return client.withTransaction(operations);
}

// Usage
async function main() {
    const client = await createClient('quic://localhost:3141');

    try {
        await withTransaction(client, async (tx) => {
            await tx.exec(
                'CREATE (:Person {name: $name})',
                { params: { name: 'Alice' } }
            );
        });
    } finally {
        await client.close();
    }
}
```

{{< /tab >}}
{{< tab "Zig" >}}

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn basicTransaction(client: *geode.GeodeClient) !void {
    // Begin transaction
    try client.sendBegin();
    _ = try client.receiveMessage(30000);

    // Execute operations
    var params = std.json.ObjectMap.init(client.allocator);
    defer params.deinit();

    // Create Alice
    try params.put("name", .{ .string = "Alice" });

    client.sendRunGql(1, "CREATE (:Person {name: $name})", .{ .object = params }) catch |e| {
        try client.sendRollback();
        _ = try client.receiveMessage(30000);
        return e;
    };
    _ = try client.receiveMessage(30000);

    // Create Bob
    params.clearRetainingCapacity();
    try params.put("name", .{ .string = "Bob" });

    client.sendRunGql(2, "CREATE (:Person {name: $name})", .{ .object = params }) catch |e| {
        try client.sendRollback();
        _ = try client.receiveMessage(30000);
        return e;
    };
    _ = try client.receiveMessage(30000);

    // Commit transaction
    try client.sendCommit();
    _ = try client.receiveMessage(30000);

    std.debug.print("Transaction committed successfully\n", .{});
}

// Helper for transaction execution
pub fn withTransaction(
    client: *geode.GeodeClient,
    comptime operations: fn (*geode.GeodeClient) anyerror!void,
) !void {
    try client.sendBegin();
    _ = try client.receiveMessage(30000);

    operations(client) catch |e| {
        try client.sendRollback();
        _ = try client.receiveMessage(30000);
        return e;
    };

    try client.sendCommit();
    _ = try client.receiveMessage(30000);
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.sendHello("app", "1.0.0");
    _ = try client.receiveMessage(30000);

    try withTransaction(&client, struct {
        fn op(c: *geode.GeodeClient) !void {
            try c.sendRunGql(1, "CREATE (:Person {name: 'Alice'})", null);
            _ = try c.receiveMessage(30000);
        }
    }.op);
}
```

{{< /tab >}}
{{< /tabs >}}

## Rollback and Savepoints

Savepoints allow partial rollback within a transaction.

### Using Savepoints

{{< tabs >}}
{{< tab "Go" >}}

```go
func transactionWithSavepoints(db *sql.DB) error {
    ctx := context.Background()

    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Create first person
    _, err = tx.ExecContext(ctx, "CREATE (:Person {name: ?})", "Alice")
    if err != nil {
        return err
    }

    // Create savepoint
    _, err = tx.ExecContext(ctx, "SAVEPOINT sp1")
    if err != nil {
        return err
    }

    // Try to create second person (might fail)
    _, err = tx.ExecContext(ctx, "CREATE (:Person {name: ?})", "Bob")
    if err != nil {
        // Rollback to savepoint, keeping Alice
        _, rollbackErr := tx.ExecContext(ctx, "ROLLBACK TO SAVEPOINT sp1")
        if rollbackErr != nil {
            return rollbackErr
        }
        log.Printf("Rolled back to savepoint: %v", err)
    }

    // Create third person
    _, err = tx.ExecContext(ctx, "CREATE (:Person {name: ?})", "Charlie")
    if err != nil {
        return err
    }

    return tx.Commit()
}

// Nested savepoints
func nestedSavepoints(db *sql.DB) error {
    ctx := context.Background()

    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Level 1: Create order
    _, _ = tx.ExecContext(ctx, "CREATE (:Order {id: 1})")
    _, _ = tx.ExecContext(ctx, "SAVEPOINT order_items")

    // Level 2: Add items
    _, _ = tx.ExecContext(ctx, "CREATE (:Item {orderId: 1, product: 'Widget'})")
    _, _ = tx.ExecContext(ctx, "SAVEPOINT item_inventory")

    // Level 3: Update inventory
    _, err = tx.ExecContext(ctx, "MATCH (i:Inventory {product: 'Widget'}) SET i.count = i.count - 1")
    if err != nil {
        // Rollback inventory update, keep items
        tx.ExecContext(ctx, "ROLLBACK TO SAVEPOINT item_inventory")
    }

    // Release savepoint (optional cleanup)
    tx.ExecContext(ctx, "RELEASE SAVEPOINT order_items")

    return tx.Commit()
}
```

{{< /tab >}}
{{< tab "Python" >}}

```python
async def transaction_with_savepoints(client: Client) -> None:
    """Use savepoints for partial rollback."""
    async with client.connection() as conn:
        await conn.begin()

        try:
            # Create first person
            await conn.execute(
                "CREATE (:Person {name: $name})",
                {"name": "Alice"}
            )

            # Create savepoint
            await conn.savepoint("sp1")

            try:
                # Try to create second person (might fail)
                await conn.execute(
                    "CREATE (:Person {name: $name})",
                    {"name": "Bob"}
                )
            except Exception as e:
                # Rollback to savepoint, keeping Alice
                await conn.rollback_to_savepoint("sp1")
                print(f"Rolled back to savepoint: {e}")

            # Create third person
            await conn.execute(
                "CREATE (:Person {name: $name})",
                {"name": "Charlie"}
            )

            await conn.commit()

        except Exception as e:
            await conn.rollback()
            raise


async def nested_savepoints(client: Client) -> None:
    """Use nested savepoints for complex transactions."""
    async with client.connection() as conn:
        await conn.begin()

        try:
            # Level 1: Create order
            await conn.execute("CREATE (:Order {id: 1})")
            await conn.savepoint("order_items")

            # Level 2: Add items
            await conn.execute(
                "CREATE (:Item {orderId: 1, product: $product})",
                {"product": "Widget"}
            )
            await conn.savepoint("item_inventory")

            try:
                # Level 3: Update inventory
                await conn.execute("""
                    MATCH (i:Inventory {product: $product})
                    SET i.count = i.count - 1
                """, {"product": "Widget"})
            except Exception:
                # Rollback inventory update, keep items
                await conn.rollback_to_savepoint("item_inventory")
                print("Inventory update failed, items preserved")

            # Release savepoint (optional cleanup)
            await conn.release_savepoint("order_items")

            await conn.commit()

        except Exception:
            await conn.rollback()
            raise


# Savepoint context manager
class SavepointContext:
    def __init__(self, conn, name: str):
        self.conn = conn
        self.name = name
        self.released = False

    async def __aenter__(self):
        await self.conn.savepoint(self.name)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            await self.conn.rollback_to_savepoint(self.name)
            return True  # Suppress exception
        if not self.released:
            await self.conn.release_savepoint(self.name)
        return False

    async def release(self):
        await self.conn.release_savepoint(self.name)
        self.released = True


# Usage
async def with_savepoint_context(client: Client) -> None:
    async with client.connection() as conn:
        await conn.begin()

        await conn.execute("CREATE (:Person {name: 'Alice'})")

        async with SavepointContext(conn, "sp1"):
            await conn.execute("CREATE (:Person {name: 'Bob'})")
            # If this fails, rollback to sp1 automatically

        await conn.commit()
```

{{< /tab >}}
{{< tab "Rust" >}}

```rust
async fn transaction_with_savepoints(conn: &mut Connection) -> Result<(), Error> {
    conn.begin().await?;

    // Create first person
    let mut params = HashMap::new();
    params.insert("name".to_string(), Value::string("Alice"));
    conn.query_with_params("CREATE (:Person {name: $name})", &params).await?;

    // Create savepoint
    conn.savepoint("sp1").await?;

    // Try to create second person (might fail)
    params.insert("name".to_string(), Value::string("Bob"));
    if let Err(e) = conn.query_with_params(
        "CREATE (:Person {name: $name})",
        &params
    ).await {
        // Rollback to savepoint, keeping Alice
        conn.rollback_to_savepoint("sp1").await?;
        println!("Rolled back to savepoint: {}", e);
    }

    // Create third person
    params.insert("name".to_string(), Value::string("Charlie"));
    conn.query_with_params("CREATE (:Person {name: $name})", &params).await?;

    conn.commit().await?;
    Ok(())
}

async fn nested_savepoints(conn: &mut Connection) -> Result<(), Error> {
    conn.begin().await?;

    // Level 1: Create order
    conn.query("CREATE (:Order {id: 1})").await?;
    conn.savepoint("order_items").await?;

    // Level 2: Add items
    let mut params = HashMap::new();
    params.insert("product".to_string(), Value::string("Widget"));
    conn.query_with_params(
        "CREATE (:Item {orderId: 1, product: $product})",
        &params
    ).await?;
    conn.savepoint("item_inventory").await?;

    // Level 3: Update inventory
    if let Err(_) = conn.query_with_params(
        "MATCH (i:Inventory {product: $product}) SET i.count = i.count - 1",
        &params
    ).await {
        // Rollback inventory update, keep items
        conn.rollback_to_savepoint("item_inventory").await?;
        println!("Inventory update failed, items preserved");
    }

    // Release savepoint (optional cleanup)
    conn.release_savepoint("order_items").await?;

    conn.commit().await?;
    Ok(())
}

// Helper struct for savepoint scope
struct SavepointGuard<'a> {
    conn: &'a mut Connection,
    name: String,
    released: bool,
}

impl<'a> SavepointGuard<'a> {
    async fn new(conn: &'a mut Connection, name: &str) -> Result<Self, Error> {
        conn.savepoint(name).await?;
        Ok(Self {
            conn,
            name: name.to_string(),
            released: false,
        })
    }

    async fn release(&mut self) -> Result<(), Error> {
        self.conn.release_savepoint(&self.name).await?;
        self.released = true;
        Ok(())
    }

    async fn rollback(&mut self) -> Result<(), Error> {
        self.conn.rollback_to_savepoint(&self.name).await?;
        self.released = true;
        Ok(())
    }
}

impl<'a> Drop for SavepointGuard<'a> {
    fn drop(&mut self) {
        if !self.released {
            // In async context, we can't await here
            // Consider using explicit release/rollback
        }
    }
}
```

{{< /tab >}}
{{< tab "Node.js" >}}

```typescript
async function transactionWithSavepoints(client: GeodeClient): Promise<void> {
    await client.withTransaction(async (tx) => {
        // Create first person
        await tx.exec('CREATE (:Person {name: $name})', { params: { name: 'Alice' } });

        // Create savepoint
        await tx.savepoint('sp1');

        try {
            // Try to create second person (might fail)
            await tx.exec('CREATE (:Person {name: $name})', { params: { name: 'Bob' } });
        } catch (error) {
            // Rollback to savepoint, keeping Alice
            await tx.rollbackToSavepoint('sp1');
            console.log('Rolled back to savepoint:', error);
        }

        // Create third person
        await tx.exec('CREATE (:Person {name: $name})', { params: { name: 'Charlie' } });
    });
}

async function nestedSavepoints(client: GeodeClient): Promise<void> {
    await client.withTransaction(async (tx) => {
        // Level 1: Create order
        await tx.exec('CREATE (:Order {id: 1})');
        await tx.savepoint('order_items');

        // Level 2: Add items
        await tx.exec(
            'CREATE (:Item {orderId: 1, product: $product})',
            { params: { product: 'Widget' } }
        );
        await tx.savepoint('item_inventory');

        try {
            // Level 3: Update inventory
            await tx.exec(
                'MATCH (i:Inventory {product: $product}) SET i.count = i.count - 1',
                { params: { product: 'Widget' } }
            );
        } catch (error) {
            // Rollback inventory update, keep items
            await tx.rollbackToSavepoint('item_inventory');
            console.log('Inventory update failed, items preserved');
        }

        // Release savepoint (optional cleanup)
        await tx.releaseSavepoint('order_items');
    });
}

// Helper class for savepoint scope
class SavepointScope {
    private released = false;

    constructor(
        private tx: Transaction,
        private name: string
    ) {}

    static async create(tx: Transaction, name: string): Promise<SavepointScope> {
        await tx.savepoint(name);
        return new SavepointScope(tx, name);
    }

    async release(): Promise<void> {
        if (!this.released) {
            await this.tx.releaseSavepoint(this.name);
            this.released = true;
        }
    }

    async rollback(): Promise<void> {
        if (!this.released) {
            await this.tx.rollbackToSavepoint(this.name);
            this.released = true;
        }
    }
}

// Usage
async function withSavepointScope(client: GeodeClient): Promise<void> {
    await client.withTransaction(async (tx) => {
        await tx.exec('CREATE (:Person {name: $name})', { params: { name: 'Alice' } });

        const scope = await SavepointScope.create(tx, 'sp1');
        try {
            await tx.exec('CREATE (:Person {name: $name})', { params: { name: 'Bob' } });
            await scope.release();
        } catch (error) {
            await scope.rollback();
        }
    });
}
```

{{< /tab >}}
{{< tab "Zig" >}}

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn transactionWithSavepoints(client: *geode.GeodeClient) !void {
    try client.sendBegin();
    _ = try client.receiveMessage(30000);

    // Create first person
    var params = std.json.ObjectMap.init(client.allocator);
    defer params.deinit();
    try params.put("name", .{ .string = "Alice" });

    try client.sendRunGql(1, "CREATE (:Person {name: $name})", .{ .object = params });
    _ = try client.receiveMessage(30000);

    // Create savepoint
    try client.sendRunGql(2, "SAVEPOINT sp1", null);
    _ = try client.receiveMessage(30000);

    // Try to create second person (might fail)
    params.clearRetainingCapacity();
    try params.put("name", .{ .string = "Bob" });

    client.sendRunGql(3, "CREATE (:Person {name: $name})", .{ .object = params }) catch |e| {
        // Rollback to savepoint, keeping Alice
        try client.sendRunGql(4, "ROLLBACK TO SAVEPOINT sp1", null);
        _ = try client.receiveMessage(30000);
        std.debug.print("Rolled back to savepoint: {any}\n", .{e});
    };

    // Create third person
    params.clearRetainingCapacity();
    try params.put("name", .{ .string = "Charlie" });

    try client.sendRunGql(5, "CREATE (:Person {name: $name})", .{ .object = params });
    _ = try client.receiveMessage(30000);

    try client.sendCommit();
    _ = try client.receiveMessage(30000);
}

pub fn nestedSavepoints(client: *geode.GeodeClient) !void {
    try client.sendBegin();
    _ = try client.receiveMessage(30000);

    // Level 1: Create order
    try client.sendRunGql(1, "CREATE (:Order {id: 1})", null);
    _ = try client.receiveMessage(30000);

    try client.sendRunGql(2, "SAVEPOINT order_items", null);
    _ = try client.receiveMessage(30000);

    // Level 2: Add items
    var params = std.json.ObjectMap.init(client.allocator);
    defer params.deinit();
    try params.put("product", .{ .string = "Widget" });

    try client.sendRunGql(3,
        "CREATE (:Item {orderId: 1, product: $product})",
        .{ .object = params });
    _ = try client.receiveMessage(30000);

    try client.sendRunGql(4, "SAVEPOINT item_inventory", null);
    _ = try client.receiveMessage(30000);

    // Level 3: Update inventory
    client.sendRunGql(5,
        "MATCH (i:Inventory {product: $product}) SET i.count = i.count - 1",
        .{ .object = params }) catch |_| {
        // Rollback inventory update, keep items
        try client.sendRunGql(6, "ROLLBACK TO SAVEPOINT item_inventory", null);
        _ = try client.receiveMessage(30000);
        std.debug.print("Inventory update failed, items preserved\n", .{});
    };

    // Release savepoint
    try client.sendRunGql(7, "RELEASE SAVEPOINT order_items", null);
    _ = try client.receiveMessage(30000);

    try client.sendCommit();
    _ = try client.receiveMessage(30000);
}
```

{{< /tab >}}
{{< /tabs >}}

## Optimistic vs Pessimistic Concurrency

### Optimistic Concurrency Control

Assumes conflicts are rare. Check for conflicts at commit time.

{{< tabs >}}
{{< tab "Go" >}}

```go
// Optimistic concurrency with version checking
func updateWithOptimisticLocking(db *sql.DB, personID int, newName string) error {
    ctx := context.Background()

    for attempts := 0; attempts < 3; attempts++ {
        tx, err := db.BeginTx(ctx, nil)
        if err != nil {
            return err
        }

        // Read current version
        var currentVersion int
        err = tx.QueryRowContext(ctx, `
            MATCH (p:Person {id: ?})
            RETURN p.version
        `, personID).Scan(&currentVersion)
        if err != nil {
            tx.Rollback()
            return err
        }

        // Update with version check
        result, err := tx.ExecContext(ctx, `
            MATCH (p:Person {id: ?, version: ?})
            SET p.name = ?, p.version = p.version + 1
        `, personID, currentVersion, newName)
        if err != nil {
            tx.Rollback()
            return err
        }

        rowsAffected, _ := result.RowsAffected()
        if rowsAffected == 0 {
            tx.Rollback()
            // Concurrent modification detected, retry
            log.Printf("Optimistic lock conflict, attempt %d", attempts+1)
            time.Sleep(time.Duration(rand.Intn(100)) * time.Millisecond)
            continue
        }

        if err := tx.Commit(); err != nil {
            return err
        }
        return nil
    }

    return errors.New("failed after max retry attempts")
}

// Using timestamps instead of version numbers
func updateWithTimestamp(db *sql.DB, personID int, newName string) error {
    ctx := context.Background()

    var lastModified time.Time
    err := db.QueryRowContext(ctx, `
        MATCH (p:Person {id: ?})
        RETURN p.modified_at
    `, personID).Scan(&lastModified)
    if err != nil {
        return err
    }

    result, err := db.ExecContext(ctx, `
        MATCH (p:Person {id: ?})
        WHERE p.modified_at = ?
        SET p.name = ?, p.modified_at = timestamp()
    `, personID, lastModified, newName)
    if err != nil {
        return err
    }

    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        return errors.New("concurrent modification detected")
    }

    return nil
}
```

{{< /tab >}}
{{< tab "Python" >}}

```python
import random
import asyncio
from datetime import datetime

async def update_with_optimistic_locking(
    client: Client,
    person_id: int,
    new_name: str,
    max_attempts: int = 3
) -> None:
    """Update with optimistic concurrency control."""
    for attempt in range(max_attempts):
        async with client.connection() as conn:
            await conn.begin()

            try:
                # Read current version
                result, _ = await conn.query("""
                    MATCH (p:Person {id: $id})
                    RETURN p.version as version
                """, {"id": person_id})

                if not result.rows:
                    await conn.rollback()
                    raise ValueError(f"Person {person_id} not found")

                current_version = result.rows[0]["version"].as_int

                # Update with version check
                await conn.execute("""
                    MATCH (p:Person {id: $id, version: $version})
                    SET p.name = $name, p.version = p.version + 1
                """, {
                    "id": person_id,
                    "version": current_version,
                    "name": new_name
                })

                # Verify update succeeded
                check_result, _ = await conn.query("""
                    MATCH (p:Person {id: $id})
                    RETURN p.version as version
                """, {"id": person_id})

                new_version = check_result.rows[0]["version"].as_int

                if new_version != current_version + 1:
                    await conn.rollback()
                    print(f"Optimistic lock conflict, attempt {attempt + 1}")
                    await asyncio.sleep(random.uniform(0.01, 0.1))
                    continue

                await conn.commit()
                return

            except Exception as e:
                await conn.rollback()
                raise

    raise Exception("Failed after max retry attempts")


async def update_with_timestamp(
    client: Client,
    person_id: int,
    new_name: str
) -> None:
    """Update with timestamp-based optimistic locking."""
    async with client.connection() as conn:
        # Read current timestamp
        result, _ = await conn.query("""
            MATCH (p:Person {id: $id})
            RETURN p.modified_at as modified_at
        """, {"id": person_id})

        if not result.rows:
            raise ValueError(f"Person {person_id} not found")

        last_modified = result.rows[0]["modified_at"].as_timestamp

        # Update with timestamp check
        await conn.execute("""
            MATCH (p:Person {id: $id})
            WHERE p.modified_at = $modified_at
            SET p.name = $name, p.modified_at = timestamp()
        """, {
            "id": person_id,
            "modified_at": last_modified,
            "name": new_name
        })

        # Verify update
        check_result, _ = await conn.query("""
            MATCH (p:Person {id: $id})
            RETURN p.modified_at as modified_at
        """, {"id": person_id})

        if check_result.rows[0]["modified_at"].as_timestamp == last_modified:
            raise Exception("Concurrent modification detected")
```

{{< /tab >}}
{{< tab "Rust" >}}

```rust
async fn update_with_optimistic_locking(
    conn: &mut Connection,
    person_id: i64,
    new_name: &str,
    max_attempts: u32,
) -> Result<(), Box<dyn std::error::Error>> {
    let mut rng = rand::thread_rng();

    for attempt in 0..max_attempts {
        conn.begin().await?;

        // Read current version
        let mut params = HashMap::new();
        params.insert("id".to_string(), Value::int(person_id));

        let (page, _) = conn.query_with_params(
            "MATCH (p:Person {id: $id}) RETURN p.version as version",
            &params
        ).await?;

        let current_version = page.rows.first()
            .and_then(|row| row.get("version"))
            .and_then(|v| v.as_int().ok())
            .ok_or("Person not found")?;

        // Update with version check
        params.insert("version".to_string(), Value::int(current_version));
        params.insert("name".to_string(), Value::string(new_name));

        conn.query_with_params(
            "MATCH (p:Person {id: $id, version: $version}) SET p.name = $name, p.version = p.version + 1",
            &params
        ).await?;

        // Verify update succeeded
        let (check_page, _) = conn.query_with_params(
            "MATCH (p:Person {id: $id}) RETURN p.version as version",
            &params
        ).await?;

        let new_version = check_page.rows.first()
            .and_then(|row| row.get("version"))
            .and_then(|v| v.as_int().ok())
            .unwrap_or(0);

        if new_version != current_version + 1 {
            conn.rollback().await?;
            println!("Optimistic lock conflict, attempt {}", attempt + 1);
            sleep(Duration::from_millis(rng.gen_range(10..100))).await;
            continue;
        }

        conn.commit().await?;
        return Ok(());
    }

    Err("Failed after max retry attempts".into())
}
```

{{< /tab >}}
{{< tab "Node.js" >}}

```typescript
async function updateWithOptimisticLocking(
    client: GeodeClient,
    personId: number,
    newName: string,
    maxAttempts: number = 3
): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            await client.withTransaction(async (tx) => {
                // Read current version
                const rows = await tx.queryAll(
                    'MATCH (p:Person {id: $id}) RETURN p.version as version',
                    { params: { id: personId } }
                );

                if (rows.length === 0) {
                    throw new Error(`Person ${personId} not found`);
                }

                const currentVersion = rows[0].get('version')?.asNumber || 0;

                // Update with version check
                await tx.exec(`
                    MATCH (p:Person {id: $id, version: $version})
                    SET p.name = $name, p.version = p.version + 1
                `, {
                    params: { id: personId, version: currentVersion, name: newName }
                });

                // Verify update succeeded
                const checkRows = await tx.queryAll(
                    'MATCH (p:Person {id: $id}) RETURN p.version as version',
                    { params: { id: personId } }
                );

                const newVersion = checkRows[0]?.get('version')?.asNumber || 0;

                if (newVersion !== currentVersion + 1) {
                    throw new OptimisticLockError('Concurrent modification detected');
                }
            });

            return; // Success

        } catch (error) {
            if (error instanceof OptimisticLockError && attempt < maxAttempts - 1) {
                console.log(`Optimistic lock conflict, attempt ${attempt + 1}`);
                await new Promise(resolve =>
                    setTimeout(resolve, Math.random() * 100)
                );
                continue;
            }
            throw error;
        }
    }

    throw new Error('Failed after max retry attempts');
}

class OptimisticLockError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OptimisticLockError';
    }
}
```

{{< /tab >}}
{{< tab "Zig" >}}

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn updateWithOptimisticLocking(
    client: *geode.GeodeClient,
    person_id: i64,
    new_name: []const u8,
    max_attempts: u32,
) !void {
    var prng = std.rand.DefaultPrng.init(@intCast(std.time.timestamp()));
    const random = prng.random();

    var attempt: u32 = 0;
    while (attempt < max_attempts) : (attempt += 1) {
        try client.sendBegin();
        _ = try client.receiveMessage(30000);

        // Read current version
        var params = std.json.ObjectMap.init(client.allocator);
        defer params.deinit();
        try params.put("id", .{ .integer = person_id });

        try client.sendRunGql(1,
            "MATCH (p:Person {id: $id}) RETURN p.version as version",
            .{ .object = params });
        _ = try client.receiveMessage(30000);

        try client.sendPull(1, 1000);
        const version_result = try client.receiveMessage(30000);
        defer client.allocator.free(version_result);

        // Parse current_version from result (simplified)
        const current_version: i64 = 1; // Would parse from JSON

        // Update with version check
        params.clearRetainingCapacity();
        try params.put("id", .{ .integer = person_id });
        try params.put("version", .{ .integer = current_version });
        try params.put("name", .{ .string = new_name });

        client.sendRunGql(2,
            \\MATCH (p:Person {id: $id, version: $version})
            \\SET p.name = $name, p.version = p.version + 1
        , .{ .object = params }) catch |e| {
            try client.sendRollback();
            _ = try client.receiveMessage(30000);
            return e;
        };
        _ = try client.receiveMessage(30000);

        // Verify update succeeded (simplified - would check actual result)
        const update_succeeded = true;

        if (!update_succeeded) {
            try client.sendRollback();
            _ = try client.receiveMessage(30000);
            std.debug.print("Optimistic lock conflict, attempt {d}\n", .{attempt + 1});
            const delay_ms = random.intRangeAtMost(u64, 10, 100);
            std.time.sleep(delay_ms * std.time.ns_per_ms);
            continue;
        }

        try client.sendCommit();
        _ = try client.receiveMessage(30000);
        return;
    }

    return error.MaxRetriesExceeded;
}
```

{{< /tab >}}
{{< /tabs >}}

### Pessimistic Concurrency Control

Acquire locks before reading. Prevents conflicts at the cost of reduced concurrency.

{{< tabs >}}
{{< tab "Go" >}}

```go
// Pessimistic locking with SELECT FOR UPDATE
func updateWithPessimisticLocking(db *sql.DB, personID int, newName string) error {
    ctx := context.Background()

    tx, err := db.BeginTx(ctx, &sql.TxOptions{
        Isolation: sql.LevelSerializable,
    })
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Lock the row for update
    var currentName string
    err = tx.QueryRowContext(ctx, `
        MATCH (p:Person {id: ?})
        SET p._lock = true
        RETURN p.name
    `, personID).Scan(&currentName)
    if err != nil {
        return err
    }

    // Perform update (row is locked)
    _, err = tx.ExecContext(ctx, `
        MATCH (p:Person {id: ?})
        SET p.name = ?
        REMOVE p._lock
    `, personID, newName)
    if err != nil {
        return err
    }

    return tx.Commit()
}

// Relying on the engine's own write locks.
//
// There is no lock-acquisition procedure (`geode.locks.*` is not a Geode
// namespace). A mutating statement inside a transaction takes the engine's
// write lock for the duration of that transaction, so the MATCH...SET below is
// already serialised against other writers of the same account.
func updateWithExplicitLock(db *sql.DB, accountID int, amount float64) error {
    ctx := context.Background()

    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // The write lock is taken here and held until commit/rollback
    _, err = tx.ExecContext(ctx, `
        MATCH (a:Account {id: ?})
        SET a.balance = a.balance + ?
    `, accountID, amount)
    if err != nil {
        return err
    }

    return tx.Commit()
}
```

{{< /tab >}}
{{< tab "Python" >}}

```python
async def update_with_pessimistic_locking(
    client: Client,
    person_id: int,
    new_name: str
) -> None:
    """Update with pessimistic locking."""
    async with client.connection() as conn:
        await conn.begin(isolation_level="serializable")

        try:
            # Lock the row for update
            result, _ = await conn.query("""
                MATCH (p:Person {id: $id})
                SET p._lock = true
                RETURN p.name as name
            """, {"id": person_id})

            if not result.rows:
                raise ValueError(f"Person {person_id} not found")

            # Perform update (row is locked)
            await conn.execute("""
                MATCH (p:Person {id: $id})
                SET p.name = $name
                REMOVE p._lock
            """, {"id": person_id, "name": new_name})

            await conn.commit()

        except Exception:
            await conn.rollback()
            raise


async def update_with_explicit_lock(
    client: Client,
    account_id: int,
    amount: float
) -> None:
    """Update under the engine's own write lock.

    There is no lock-acquisition procedure (`geode.locks.*` does not exist).
    The write lock is taken by the mutating statement and released at commit
    or rollback.
    """
    async with client.connection() as conn:
        await conn.begin()

        try:
            await conn.execute("""
                MATCH (a:Account {id: $id})
                SET a.balance = a.balance + $amount
            """, {"id": account_id, "amount": amount})

            await conn.commit()

        except Exception:
            await conn.rollback()
            raise


# Usage: order the writes deterministically to prevent deadlocks
async def transfer_with_locks(
    client: Client,
    from_account: int,
    to_account: int,
    amount: float
) -> None:
    async with client.connection() as conn:
        await conn.begin()

        # Touch accounts in a consistent order in every transaction
        first, second = sorted([from_account, to_account])
        deltas = {from_account: -amount, to_account: amount}

        try:
            for account_id in (first, second):
                await conn.execute("""
                    MATCH (a:Account {id: $id})
                    SET a.balance = a.balance + $amount
                """, {"id": account_id, "amount": deltas[account_id]})

            await conn.commit()

        except Exception:
            await conn.rollback()
            raise
```

{{< /tab >}}
{{< tab "Rust" >}}

```rust
async fn update_with_pessimistic_locking(
    conn: &mut Connection,
    person_id: i64,
    new_name: &str,
) -> Result<(), Error> {
    // Start with serializable isolation
    let options = TransactionOptions {
        isolation_level: IsolationLevel::Serializable,
        read_only: false,
    };
    conn.begin_with_options(options).await?;

    // Lock the row for update
    let mut params = HashMap::new();
    params.insert("id".to_string(), Value::int(person_id));

    let (page, _) = conn.query_with_params(
        "MATCH (p:Person {id: $id}) SET p._lock = true RETURN p.name as name",
        &params
    ).await?;

    if page.rows.is_empty() {
        conn.rollback().await?;
        return Err(Error::new("Person not found"));
    }

    // Perform update (row is locked)
    params.insert("name".to_string(), Value::string(new_name));

    conn.query_with_params(
        "MATCH (p:Person {id: $id}) SET p.name = $name REMOVE p._lock",
        &params
    ).await?;

    conn.commit().await?;
    Ok(())
}

// No lock-acquisition procedure exists (`geode.locks.*` is not a Geode
// namespace); the mutating statement takes the engine's write lock and holds
// it until commit or rollback.
async fn update_with_explicit_lock(
    conn: &mut Connection,
    account_id: i64,
    amount: f64,
) -> Result<(), Error> {
    conn.begin().await?;

    let mut params = HashMap::new();
    params.insert("id".to_string(), Value::int(account_id));
    params.insert("amount".to_string(), Value::float(amount));

    conn.query_with_params(
        "MATCH (a:Account {id: $id}) SET a.balance = a.balance + $amount",
        &params
    ).await?;

    conn.commit().await?;
    Ok(())
}
```

{{< /tab >}}
{{< tab "Node.js" >}}

```typescript
async function updateWithPessimisticLocking(
    client: GeodeClient,
    personId: number,
    newName: string
): Promise<void> {
    await client.withTransaction(
        async (tx) => {
            // Lock the row for update
            const rows = await tx.queryAll(
                'MATCH (p:Person {id: $id}) SET p._lock = true RETURN p.name as name',
                { params: { id: personId } }
            );

            if (rows.length === 0) {
                throw new Error(`Person ${personId} not found`);
            }

            // Perform update (row is locked)
            await tx.exec(
                'MATCH (p:Person {id: $id}) SET p.name = $name REMOVE p._lock',
                { params: { id: personId, name: newName } }
            );
        },
        { isolationLevel: 'serializable' }
    );
}

async function updateWithExplicitLock(
    client: GeodeClient,
    accountId: number,
    amount: number
): Promise<void> {
    await client.withTransaction(async (tx) => {
        // No lock-acquisition procedure exists (`geode.locks.*` is not a Geode
        // namespace). The mutating statement takes the engine's write lock and
        // holds it until the transaction commits or rolls back.
        await tx.exec(
            'MATCH (a:Account {id: $id}) SET a.balance = a.balance + $amount',
            { params: { id: accountId, amount } }
        );
    });
}
```

{{< /tab >}}
{{< tab "Zig" >}}

```zig
pub fn updateWithPessimisticLocking(
    client: *geode.GeodeClient,
    person_id: i64,
    new_name: []const u8,
) !void {
    // Start with serializable isolation
    try client.sendRunGql(1, "BEGIN ISOLATION LEVEL SERIALIZABLE", null);
    _ = try client.receiveMessage(30000);

    var params = std.json.ObjectMap.init(client.allocator);
    defer params.deinit();
    try params.put("id", .{ .integer = person_id });

    // Lock the row for update
    client.sendRunGql(2,
        "MATCH (p:Person {id: $id}) SET p._lock = true RETURN p.name as name",
        .{ .object = params }) catch |e| {
        try client.sendRollback();
        _ = try client.receiveMessage(30000);
        return e;
    };
    _ = try client.receiveMessage(30000);

    // Perform update (row is locked)
    params.clearRetainingCapacity();
    try params.put("id", .{ .integer = person_id });
    try params.put("name", .{ .string = new_name });

    client.sendRunGql(3,
        "MATCH (p:Person {id: $id}) SET p.name = $name REMOVE p._lock",
        .{ .object = params }) catch |e| {
        try client.sendRollback();
        _ = try client.receiveMessage(30000);
        return e;
    };
    _ = try client.receiveMessage(30000);

    try client.sendCommit();
    _ = try client.receiveMessage(30000);
}
```

{{< /tab >}}
{{< /tabs >}}

## Deadlock Detection and Prevention

### Deadlock Prevention Strategies

1. **Lock ordering**: Always acquire locks in a consistent order
2. **Timeout-based**: Use lock timeouts to break deadlocks
3. **Deadlock detection**: Let the database detect and resolve deadlocks

{{< tabs >}}
{{< tab "Go" >}}

```go
// Lock ordering to prevent deadlocks
func transferWithLockOrdering(db *sql.DB, fromID, toID int, amount float64) error {
    ctx := context.Background()

    // Always lock in ascending ID order
    firstID, secondID := fromID, toID
    if fromID > toID {
        firstID, secondID = toID, fromID
    }

    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Lock first account
    _, err = tx.ExecContext(ctx, `
        MATCH (a:Account {id: ?})
        SET a._lock = true
    `, firstID)
    if err != nil {
        return err
    }

    // Lock second account
    _, err = tx.ExecContext(ctx, `
        MATCH (a:Account {id: ?})
        SET a._lock = true
    `, secondID)
    if err != nil {
        return err
    }

    // Perform transfer
    _, err = tx.ExecContext(ctx, `
        MATCH (from:Account {id: ?}), (to:Account {id: ?})
        SET from.balance = from.balance - ?, to.balance = to.balance + ?
    `, fromID, toID, amount, amount)
    if err != nil {
        return err
    }

    // Remove locks
    _, _ = tx.ExecContext(ctx, `
        MATCH (a:Account) WHERE a.id IN [?, ?]
        REMOVE a._lock
    `, firstID, secondID)

    return tx.Commit()
}

// Deadlock retry with exponential backoff
func executeWithDeadlockRetry(db *sql.DB, maxRetries int, fn func(*sql.Tx) error) error {
    for attempt := 1; attempt <= maxRetries; attempt++ {
        tx, err := db.BeginTx(context.Background(), nil)
        if err != nil {
            return err
        }

        err = fn(tx)
        if err != nil {
            tx.Rollback()

            // Check for deadlock
            var geodeErr *geode.Error
            if errors.As(err, &geodeErr) && geodeErr.Code == "GQL-05003" {
                log.Printf("Deadlock detected, attempt %d/%d", attempt, maxRetries)
                time.Sleep(time.Duration(rand.Intn(100)*attempt) * time.Millisecond)
                continue
            }
            return err
        }

        if err := tx.Commit(); err != nil {
            return err
        }
        return nil
    }

    return errors.New("max deadlock retries exceeded")
}
```

{{< /tab >}}
{{< tab "Python" >}}

```python
async def transfer_with_lock_ordering(
    client: Client,
    from_id: int,
    to_id: int,
    amount: float
) -> None:
    """Transfer with consistent lock ordering to prevent deadlocks."""
    # Always lock in ascending ID order
    first_id, second_id = sorted([from_id, to_id])

    async with client.connection() as conn:
        await conn.begin()

        try:
            # Lock first account
            await conn.execute("""
                MATCH (a:Account {id: $id})
                SET a._lock = true
            """, {"id": first_id})

            # Lock second account
            await conn.execute("""
                MATCH (a:Account {id: $id})
                SET a._lock = true
            """, {"id": second_id})

            # Perform transfer
            await conn.execute("""
                MATCH (from:Account {id: $from_id}), (to:Account {id: $to_id})
                SET from.balance = from.balance - $amount,
                    to.balance = to.balance + $amount
            """, {"from_id": from_id, "to_id": to_id, "amount": amount})

            # Remove locks
            await conn.execute("""
                MATCH (a:Account) WHERE a.id IN [$first, $second]
                REMOVE a._lock
            """, {"first": first_id, "second": second_id})

            await conn.commit()

        except Exception:
            await conn.rollback()
            raise


async def execute_with_deadlock_retry(
    client: Client,
    max_retries: int,
    operation: Callable[[Any], Awaitable[None]]
) -> None:
    """Execute with automatic deadlock retry."""
    for attempt in range(1, max_retries + 1):
        async with client.connection() as conn:
            await conn.begin()

            try:
                await operation(conn)
                await conn.commit()
                return

            except GeodeError as e:
                await conn.rollback()

                if e.code == "GQL-05003":  # Deadlock
                    print(f"Deadlock detected, attempt {attempt}/{max_retries}")
                    await asyncio.sleep(random.uniform(0.01, 0.1) * attempt)
                    continue

                raise

    raise Exception("Max deadlock retries exceeded")


# Usage
async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)

    await execute_with_deadlock_retry(client, 3, async def inner(conn):
        await conn.execute("MATCH (a:Account {id: 1}) SET a.balance = a.balance - 100")
        await conn.execute("MATCH (a:Account {id: 2}) SET a.balance = a.balance + 100")
    )
```

{{< /tab >}}
{{< tab "Rust" >}}

```rust
async fn transfer_with_lock_ordering(
    conn: &mut Connection,
    from_id: i64,
    to_id: i64,
    amount: f64,
) -> Result<(), Error> {
    // Always lock in ascending ID order
    let (first_id, second_id) = if from_id < to_id {
        (from_id, to_id)
    } else {
        (to_id, from_id)
    };

    conn.begin().await?;

    // Lock first account
    let mut params = HashMap::new();
    params.insert("id".to_string(), Value::int(first_id));
    conn.query_with_params(
        "MATCH (a:Account {id: $id}) SET a._lock = true",
        &params
    ).await?;

    // Lock second account
    params.insert("id".to_string(), Value::int(second_id));
    conn.query_with_params(
        "MATCH (a:Account {id: $id}) SET a._lock = true",
        &params
    ).await?;

    // Perform transfer
    params.insert("from_id".to_string(), Value::int(from_id));
    params.insert("to_id".to_string(), Value::int(to_id));
    params.insert("amount".to_string(), Value::float(amount));
    conn.query_with_params(r#"
        MATCH (from:Account {id: $from_id}), (to:Account {id: $to_id})
        SET from.balance = from.balance - $amount,
            to.balance = to.balance + $amount
    "#, &params).await?;

    // Remove locks
    params.insert("first".to_string(), Value::int(first_id));
    params.insert("second".to_string(), Value::int(second_id));
    conn.query_with_params(
        "MATCH (a:Account) WHERE a.id IN [$first, $second] REMOVE a._lock",
        &params
    ).await?;

    conn.commit().await?;
    Ok(())
}

async fn execute_with_deadlock_retry<F, Fut>(
    conn: &mut Connection,
    max_retries: u32,
    operation: F,
) -> Result<(), Error>
where
    F: Fn(&mut Connection) -> Fut,
    Fut: std::future::Future<Output = Result<(), Error>>,
{
    let mut rng = rand::thread_rng();

    for attempt in 1..=max_retries {
        conn.begin().await?;

        match operation(conn).await {
            Ok(_) => {
                conn.commit().await?;
                return Ok(());
            }
            Err(e) if e.code() == Some(ErrorCode::DeadlockDetected) => {
                conn.rollback().await?;
                println!("Deadlock detected, attempt {}/{}", attempt, max_retries);
                let delay = Duration::from_millis(rng.gen_range(10..100) * attempt as u64);
                sleep(delay).await;
            }
            Err(e) => {
                conn.rollback().await?;
                return Err(e);
            }
        }
    }

    Err(Error::new("Max deadlock retries exceeded"))
}
```

{{< /tab >}}
{{< tab "Node.js" >}}

```typescript
async function transferWithLockOrdering(
    client: GeodeClient,
    fromId: number,
    toId: number,
    amount: number
): Promise<void> {
    // Always lock in ascending ID order
    const [firstId, secondId] = [fromId, toId].sort((a, b) => a - b);

    await client.withTransaction(async (tx) => {
        // Lock first account
        await tx.exec(
            'MATCH (a:Account {id: $id}) SET a._lock = true',
            { params: { id: firstId } }
        );

        // Lock second account
        await tx.exec(
            'MATCH (a:Account {id: $id}) SET a._lock = true',
            { params: { id: secondId } }
        );

        // Perform transfer
        await tx.exec(`
            MATCH (from:Account {id: $fromId}), (to:Account {id: $toId})
            SET from.balance = from.balance - $amount,
                to.balance = to.balance + $amount
        `, { params: { fromId, toId, amount } });

        // Remove locks
        await tx.exec(
            'MATCH (a:Account) WHERE a.id IN [$first, $second] REMOVE a._lock',
            { params: { first: firstId, second: secondId } }
        );
    });
}

async function executeWithDeadlockRetry<T>(
    client: GeodeClient,
    maxRetries: number,
    operation: (tx: Transaction) => Promise<T>
): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await client.withTransaction(operation);
        } catch (error) {
            if (error instanceof GeodeError && error.code === 'GQL-05003') {
                console.log(`Deadlock detected, attempt ${attempt}/${maxRetries}`);
                await new Promise(resolve =>
                    setTimeout(resolve, Math.random() * 100 * attempt)
                );
                continue;
            }
            throw error;
        }
    }

    throw new Error('Max deadlock retries exceeded');
}
```

{{< /tab >}}
{{< tab "Zig" >}}

```zig
pub fn transferWithLockOrdering(
    client: *geode.GeodeClient,
    from_id: i64,
    to_id: i64,
    amount: f64,
) !void {
    // Always lock in ascending ID order
    const first_id = @min(from_id, to_id);
    const second_id = @max(from_id, to_id);

    try client.sendBegin();
    _ = try client.receiveMessage(30000);

    var params = std.json.ObjectMap.init(client.allocator);
    defer params.deinit();

    // Lock first account
    try params.put("id", .{ .integer = first_id });
    try client.sendRunGql(1,
        "MATCH (a:Account {id: $id}) SET a._lock = true",
        .{ .object = params });
    _ = try client.receiveMessage(30000);

    // Lock second account
    params.clearRetainingCapacity();
    try params.put("id", .{ .integer = second_id });
    try client.sendRunGql(2,
        "MATCH (a:Account {id: $id}) SET a._lock = true",
        .{ .object = params });
    _ = try client.receiveMessage(30000);

    // Perform transfer
    params.clearRetainingCapacity();
    try params.put("from_id", .{ .integer = from_id });
    try params.put("to_id", .{ .integer = to_id });
    try params.put("amount", .{ .float = amount });
    try client.sendRunGql(3,
        \\MATCH (from:Account {id: $from_id}), (to:Account {id: $to_id})
        \\SET from.balance = from.balance - $amount,
        \\    to.balance = to.balance + $amount
    , .{ .object = params });
    _ = try client.receiveMessage(30000);

    // Remove locks
    params.clearRetainingCapacity();
    try params.put("first", .{ .integer = first_id });
    try params.put("second", .{ .integer = second_id });
    try client.sendRunGql(4,
        "MATCH (a:Account) WHERE a.id IN [$first, $second] REMOVE a._lock",
        .{ .object = params });
    _ = try client.receiveMessage(30000);

    try client.sendCommit();
    _ = try client.receiveMessage(30000);
}
```

{{< /tab >}}
{{< /tabs >}}

## Long-Running Transactions

Handle transactions that may take a long time to complete.

### Best Practices

1. **Break into smaller transactions**: Process data in batches
2. **Use progress tracking**: Allow resumption after failure
3. **Set appropriate timeouts**: Prevent resource exhaustion
4. **Monitor transaction duration**: Alert on long-running transactions

{{< tabs >}}
{{< tab "Go" >}}

```go
// Batch processing with progress tracking
func processBatch(db *sql.DB, batchSize int) error {
    ctx := context.Background()

    // Get last processed ID
    var lastProcessedID int
    _ = db.QueryRowContext(ctx, `
        MATCH (p:Progress {name: 'migration'})
        RETURN p.last_id
    `).Scan(&lastProcessedID)

    for {
        tx, err := db.BeginTx(ctx, nil)
        if err != nil {
            return err
        }

        // Process batch
        rows, err := tx.QueryContext(ctx, `
            MATCH (n:OldData)
            WHERE n.id > ?
            WITH n ORDER BY n.id LIMIT ?
            SET n:ProcessedData
            RETURN max(n.id) as max_id, count(n) as processed
        `, lastProcessedID, batchSize)
        if err != nil {
            tx.Rollback()
            return err
        }

        var maxID, processed int
        if rows.Next() {
            rows.Scan(&maxID, &processed)
        }
        rows.Close()

        if processed == 0 {
            tx.Rollback()
            break // No more data
        }

        // Update progress
        _, err = tx.ExecContext(ctx, `
            MERGE (p:Progress {name: 'migration'})
            SET p.last_id = ?, p.updated_at = timestamp()
        `, maxID)
        if err != nil {
            tx.Rollback()
            return err
        }

        if err := tx.Commit(); err != nil {
            return err
        }

        lastProcessedID = maxID
        log.Printf("Processed %d records, last ID: %d", processed, maxID)
    }

    return nil
}

// Transaction timeout
func executeWithTimeout(db *sql.DB, timeout time.Duration) error {
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel()

    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Long-running operation
    _, err = tx.ExecContext(ctx, `
        MATCH (n:Data)
        SET n.processed = true
    `)
    if err != nil {
        if ctx.Err() == context.DeadlineExceeded {
            return errors.New("transaction timeout exceeded")
        }
        return err
    }

    return tx.Commit()
}
```

{{< /tab >}}
{{< tab "Python" >}}

```python
async def process_batch(
    client: Client,
    batch_size: int = 1000
) -> None:
    """Process data in batches with progress tracking."""
    # Get last processed ID
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (p:Progress {name: 'migration'})
            RETURN p.last_id as last_id
        """)
        last_processed_id = (
            result.rows[0]["last_id"].as_int
            if result.rows else 0
        )

    while True:
        async with client.connection() as conn:
            await conn.begin()

            try:
                # Process batch
                result, _ = await conn.query("""
                    MATCH (n:OldData)
                    WHERE n.id > $last_id
                    WITH n ORDER BY n.id LIMIT $batch_size
                    SET n:ProcessedData
                    RETURN max(n.id) as max_id, count(n) as processed
                """, {"last_id": last_processed_id, "batch_size": batch_size})

                if not result.rows:
                    await conn.rollback()
                    break

                max_id = result.rows[0]["max_id"].as_int
                processed = result.rows[0]["processed"].as_int

                if processed == 0:
                    await conn.rollback()
                    break

                # Update progress
                await conn.execute("""
                    MERGE (p:Progress {name: 'migration'})
                    SET p.last_id = $max_id, p.updated_at = timestamp()
                """, {"max_id": max_id})

                await conn.commit()
                last_processed_id = max_id
                print(f"Processed {processed} records, last ID: {max_id}")

            except Exception:
                await conn.rollback()
                raise


async def execute_with_timeout(
    client: Client,
    timeout_seconds: float
) -> None:
    """Execute with timeout."""
    async with client.connection() as conn:
        await conn.begin()

        try:
            # Set query timeout
            await asyncio.wait_for(
                conn.execute("""
                    MATCH (n:Data)
                    SET n.processed = true
                """),
                timeout=timeout_seconds
            )
            await conn.commit()

        except asyncio.TimeoutError:
            await conn.rollback()
            raise TimeoutError("Transaction timeout exceeded")

        except Exception:
            await conn.rollback()
            raise
```

{{< /tab >}}
{{< tab "Rust" >}}

```rust
async fn process_batch(
    conn: &mut Connection,
    batch_size: i64,
) -> Result<(), Error> {
    // Get last processed ID
    let (page, _) = conn.query(
        "MATCH (p:Progress {name: 'migration'}) RETURN p.last_id as last_id"
    ).await?;

    let mut last_processed_id = page.rows.first()
        .and_then(|row| row.get("last_id"))
        .and_then(|v| v.as_int().ok())
        .unwrap_or(0);

    loop {
        conn.begin().await?;

        let mut params = HashMap::new();
        params.insert("last_id".to_string(), Value::int(last_processed_id));
        params.insert("batch_size".to_string(), Value::int(batch_size));

        let (page, _) = conn.query_with_params(r#"
            MATCH (n:OldData)
            WHERE n.id > $last_id
            WITH n ORDER BY n.id LIMIT $batch_size
            SET n:ProcessedData
            RETURN max(n.id) as max_id, count(n) as processed
        "#, &params).await?;

        let max_id = page.rows.first()
            .and_then(|row| row.get("max_id"))
            .and_then(|v| v.as_int().ok())
            .unwrap_or(0);

        let processed = page.rows.first()
            .and_then(|row| row.get("processed"))
            .and_then(|v| v.as_int().ok())
            .unwrap_or(0);

        if processed == 0 {
            conn.rollback().await?;
            break;
        }

        // Update progress
        params.insert("max_id".to_string(), Value::int(max_id));
        conn.query_with_params(r#"
            MERGE (p:Progress {name: 'migration'})
            SET p.last_id = $max_id, p.updated_at = timestamp()
        "#, &params).await?;

        conn.commit().await?;
        last_processed_id = max_id;
        println!("Processed {} records, last ID: {}", processed, max_id);
    }

    Ok(())
}

async fn execute_with_timeout(
    conn: &mut Connection,
    timeout: Duration,
) -> Result<(), Error> {
    conn.begin().await?;

    match tokio::time::timeout(timeout, async {
        conn.query("MATCH (n:Data) SET n.processed = true").await
    }).await {
        Ok(result) => {
            result?;
            conn.commit().await?;
            Ok(())
        }
        Err(_) => {
            conn.rollback().await?;
            Err(Error::new("Transaction timeout exceeded"))
        }
    }
}
```

{{< /tab >}}
{{< tab "Node.js" >}}

```typescript
async function processBatch(
    client: GeodeClient,
    batchSize: number = 1000
): Promise<void> {
    // Get last processed ID
    let lastProcessedId = 0;
    const initRows = await client.queryAll(
        'MATCH (p:Progress {name: \'migration\'}) RETURN p.last_id as last_id'
    );
    if (initRows.length > 0) {
        lastProcessedId = initRows[0].get('last_id')?.asNumber || 0;
    }

    while (true) {
        await client.withTransaction(async (tx) => {
            // Process batch
            const rows = await tx.queryAll(`
                MATCH (n:OldData)
                WHERE n.id > $lastId
                WITH n ORDER BY n.id LIMIT $batchSize
                SET n:ProcessedData
                RETURN max(n.id) as maxId, count(n) as processed
            `, { params: { lastId: lastProcessedId, batchSize } });

            if (rows.length === 0) {
                throw new BatchComplete();
            }

            const maxId = rows[0].get('maxId')?.asNumber || 0;
            const processed = rows[0].get('processed')?.asNumber || 0;

            if (processed === 0) {
                throw new BatchComplete();
            }

            // Update progress
            await tx.exec(`
                MERGE (p:Progress {name: 'migration'})
                SET p.last_id = $maxId, p.updated_at = timestamp()
            `, { params: { maxId } });

            lastProcessedId = maxId;
            console.log(`Processed ${processed} records, last ID: ${maxId}`);
        });
    }
}

class BatchComplete extends Error {
    constructor() {
        super('Batch processing complete');
        this.name = 'BatchComplete';
    }
}

async function executeWithTimeout(
    client: GeodeClient,
    timeoutMs: number
): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        await client.withTransaction(async (tx) => {
            await tx.exec('MATCH (n:Data) SET n.processed = true', {
                signal: controller.signal
            });
        });
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error('Transaction timeout exceeded');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
```

{{< /tab >}}
{{< tab "Zig" >}}

```zig
pub fn processBatch(
    client: *geode.GeodeClient,
    batch_size: i64,
) !void {
    // Get last processed ID
    try client.sendRunGql(1,
        "MATCH (p:Progress {name: 'migration'}) RETURN p.last_id as last_id",
        null);
    _ = try client.receiveMessage(30000);

    try client.sendPull(1, 1000);
    const init_result = try client.receiveMessage(30000);
    defer client.allocator.free(init_result);

    var last_processed_id: i64 = 0; // Would parse from init_result

    while (true) {
        try client.sendBegin();
        _ = try client.receiveMessage(30000);

        var params = std.json.ObjectMap.init(client.allocator);
        defer params.deinit();
        try params.put("last_id", .{ .integer = last_processed_id });
        try params.put("batch_size", .{ .integer = batch_size });

        try client.sendRunGql(2,
            \\MATCH (n:OldData)
            \\WHERE n.id > $last_id
            \\WITH n ORDER BY n.id LIMIT $batch_size
            \\SET n:ProcessedData
            \\RETURN max(n.id) as max_id, count(n) as processed
        , .{ .object = params });
        _ = try client.receiveMessage(30000);

        try client.sendPull(2, 1000);
        const batch_result = try client.receiveMessage(30000);
        defer client.allocator.free(batch_result);

        // Parse max_id and processed from result (simplified)
        const max_id: i64 = 0;
        const processed: i64 = 0;

        if (processed == 0) {
            try client.sendRollback();
            _ = try client.receiveMessage(30000);
            break;
        }

        // Update progress
        params.clearRetainingCapacity();
        try params.put("max_id", .{ .integer = max_id });

        try client.sendRunGql(3,
            \\MERGE (p:Progress {name: 'migration'})
            \\SET p.last_id = $max_id, p.updated_at = timestamp()
        , .{ .object = params });
        _ = try client.receiveMessage(30000);

        try client.sendCommit();
        _ = try client.receiveMessage(30000);

        last_processed_id = max_id;
        std.debug.print("Processed {d} records, last ID: {d}\n", .{ processed, max_id });
    }
}
```

{{< /tab >}}
{{< /tabs >}}

## Best Practices Summary

### Do

- Use appropriate isolation levels for your use case
- Implement retry logic for transient errors (deadlocks, serialization failures)
- Use savepoints for partial rollback in complex transactions
- Acquire locks in consistent order to prevent deadlocks
- Break long-running operations into smaller batches
- Set appropriate timeouts
- Log transaction boundaries and durations

### Avoid

- Holding transactions open longer than necessary
- Mixing read-only and write operations without purpose
- Using higher isolation levels than needed
- Ignoring deadlock detection
- Creating very large transactions

## Resources

- [Error Handling Guide](/guides/error-handling/)
- [Testing Strategies Guide](/guides/testing/)
- [Performance Guide](/docs/performance/)
- [GQL Reference](/docs/gql-reference/)

---

**Questions?** Discuss transaction management in our [forum](https://forum.geodedb.com).
