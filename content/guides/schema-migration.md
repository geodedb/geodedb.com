---
title: "Schema Migration Guide"
slug: "schema-migration"
description: "Plan and execute schema migrations in Geode with zero downtime strategies"
weight: 13
tags: ["migration", "schema", "versioning", "deployment", "operations"]
categories: ["guides", "operations"]
keywords:
  - schema migration
  - database migration
  - zero downtime
  - rolling migration
  - graph schema evolution
  - version tracking
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Schema Migration Guide

Schema migrations are an inevitable part of evolving applications. This guide covers strategies for migrating Geode schemas safely, including zero-downtime approaches, rollback strategies, and version tracking.

## Overview

Unlike rigid relational databases, graph databases offer flexibility in schema evolution. Geode supports:

- **Additive Changes**: Adding new labels, properties, and relationship types
- **Transformative Changes**: Renaming, restructuring, and data transformations
- **Subtractive Changes**: Removing deprecated schema elements

## Planning Migrations

### Migration Checklist

Before any migration:

1. **Document current schema** - Export schema definitions
2. **Identify affected queries** - Find all queries using changed elements
3. **Estimate data volume** - Calculate migration time
4. **Plan rollback** - Define recovery steps
5. **Schedule maintenance window** (if needed)
6. **Test in staging** - Verify migration on production-like data
7. **Communicate with stakeholders** - Inform affected teams

### Migration Types

| Change Type | Risk Level | Downtime Required |
|------------|-----------|-------------------|
| Add new label | Low | No |
| Add new property | Low | No |
| Add new relationship type | Low | No |
| Add index | Low | No |
| Add constraint | Medium | Possible |
| Rename property | Medium | Possible |
| Rename label | High | Possible |
| Remove property | Medium | No |
| Change data type | High | Possible |
| Restructure relationships | High | Possible |

## Adding New Schema Elements

### Adding New Node Labels

The simplest migration - just start using the new label:

```gql
// Create nodes with new label
CREATE (:Organization {
  name: "Acme Corp",
  created_at: timestamp()
})

// Add index for new label
CREATE INDEX org_name ON :Organization(name)
```

{{< tabs >}}
{{< tab "Go" >}}
```go
// Migration: Add Organization label
func migrateAddOrganization(ctx context.Context, db *sql.DB) error {
    // Create index first
    _, err := db.ExecContext(ctx, `
        CREATE INDEX org_name ON :Organization(name)
    `)
    if err != nil {
        return fmt.Errorf("failed to create index: %w", err)
    }

    log.Println("Migration complete: Added Organization label")
    return nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async def migrate_add_organization(conn):
    """Migration: Add Organization label"""
    # Create index for new label
    await conn.execute(
        "CREATE INDEX org_name ON :Organization(name)"
    )
    print("Migration complete: Added Organization label")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
async fn migrate_add_organization(conn: &mut Connection) -> Result<(), Box<dyn std::error::Error>> {
    // Create index for new label
    conn.query("CREATE INDEX org_name ON :Organization(name)").await?;

    println!("Migration complete: Added Organization label");
    Ok(())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
async function migrateAddOrganization(client: Client): Promise<void> {
    // Create index for new label
    await client.exec('CREATE INDEX org_name ON :Organization(name)');

    console.log('Migration complete: Added Organization label');
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
fn migrateAddOrganization(client: *GeodeClient, allocator: std.mem.Allocator) !void {
    // Create index for new label
    try client.sendRunGql(1,
        "CREATE INDEX org_name ON :Organization(name)",
        null);
    _ = try client.receiveMessage(30000);

    std.debug.print("Migration complete: Added Organization label\n", .{});
}
```
{{< /tab >}}
{{< /tabs >}}

### Adding New Properties

Add properties to existing nodes with default values:

```gql
// Add property to all existing users
MATCH (u:User)
WHERE u.preferences IS NULL
SET u.preferences = {}

// Add property with computed default
MATCH (u:User)
WHERE u.display_name IS NULL
SET u.display_name = u.first_name + ' ' + u.last_name
```

**Batch processing for large datasets**:

```gql
// Process in batches to avoid memory issues
MATCH (u:User)
WHERE u.preferences IS NULL
WITH u LIMIT 10000
SET u.preferences = {}
RETURN count(u) AS updated
```

{{< tabs >}}
{{< tab "Go" >}}
```go
func migrateAddPreferences(ctx context.Context, db *sql.DB) error {
    batchSize := 10000
    totalUpdated := 0

    for {
        result, err := db.ExecContext(ctx, `
            MATCH (u:User)
            WHERE u.preferences IS NULL
            WITH u LIMIT ?
            SET u.preferences = {}
            RETURN count(u) AS updated
        `, batchSize)
        if err != nil {
            return err
        }

        rowsAffected, _ := result.RowsAffected()
        if rowsAffected == 0 {
            break
        }
        totalUpdated += int(rowsAffected)
        log.Printf("Updated %d users...", totalUpdated)
    }

    log.Printf("Migration complete: Added preferences to %d users", totalUpdated)
    return nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async def migrate_add_preferences(conn):
    """Add preferences property to all users"""
    batch_size = 10000
    total_updated = 0

    while True:
        page, _ = await conn.query("""
            MATCH (u:User)
            WHERE u.preferences IS NULL
            WITH u LIMIT $batch
            SET u.preferences = {}
            RETURN count(u) AS updated
        """, {"batch": batch_size})

        updated = page.rows[0]["updated"].as_int if page.rows else 0
        if updated == 0:
            break

        total_updated += updated
        print(f"Updated {total_updated} users...")

    print(f"Migration complete: Added preferences to {total_updated} users")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
async fn migrate_add_preferences(conn: &mut Connection) -> Result<(), Box<dyn std::error::Error>> {
    let batch_size = 10000;
    let mut total_updated = 0;

    loop {
        let mut params = HashMap::new();
        params.insert("batch".to_string(), Value::int(batch_size));

        let (page, _) = conn.query_with_params(r#"
            MATCH (u:User)
            WHERE u.preferences IS NULL
            WITH u LIMIT $batch
            SET u.preferences = {}
            RETURN count(u) AS updated
        "#, &params).await?;

        let updated = page.rows.first()
            .and_then(|r| r.get("updated"))
            .map(|v| v.as_int().unwrap_or(0))
            .unwrap_or(0);

        if updated == 0 {
            break;
        }

        total_updated += updated;
        println!("Updated {} users...", total_updated);
    }

    println!("Migration complete: Added preferences to {} users", total_updated);
    Ok(())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
async function migrateAddPreferences(client: Client): Promise<void> {
    const batchSize = 10000;
    let totalUpdated = 0;

    while (true) {
        const rows = await client.queryAll(`
            MATCH (u:User)
            WHERE u.preferences IS NULL
            WITH u LIMIT $batch
            SET u.preferences = {}
            RETURN count(u) AS updated
        `, { params: { batch: batchSize } });

        const updated = rows[0]?.get('updated')?.asNumber ?? 0;
        if (updated === 0) break;

        totalUpdated += updated;
        console.log(`Updated ${totalUpdated} users...`);
    }

    console.log(`Migration complete: Added preferences to ${totalUpdated} users`);
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
fn migrateAddPreferences(client: *GeodeClient, allocator: std.mem.Allocator) !void {
    const batch_size = 10000;
    var total_updated: i64 = 0;

    while (true) {
        var params = std.json.ObjectMap.init(allocator);
        defer params.deinit();
        try params.put("batch", .{ .integer = batch_size });

        try client.sendRunGql(1,
            \\MATCH (u:User)
            \\WHERE u.preferences IS NULL
            \\WITH u LIMIT $batch
            \\SET u.preferences = {}
            \\RETURN count(u) AS updated
        , .{ .object = params });
        _ = try client.receiveMessage(30000);

        try client.sendPull(1, 1);
        const result = try client.receiveMessage(30000);
        defer allocator.free(result);

        // Parse result to get updated count
        const updated = parseUpdatedCount(result);
        if (updated == 0) break;

        total_updated += updated;
        std.debug.print("Updated {} users...\n", .{total_updated});
    }

    std.debug.print("Migration complete: Added preferences to {} users\n", .{total_updated});
}
```
{{< /tab >}}
{{< /tabs >}}

### Adding New Relationship Types

Create new relationships between existing nodes:

```gql
// Create MANAGES relationship from existing org structure
MATCH (manager:User)-[:SUPERVISES]->(employee:User)
CREATE (manager)-[:MANAGES]->(employee)

// Create relationships with computed properties
MATCH (u:User)-[p:PURCHASED]->(product:Product)
WITH u, product, sum(p.quantity) AS total_qty
CREATE (u)-[:BOUGHT_TOTAL {quantity: total_qty}]->(product)
```

## Renaming Schema Elements

### Renaming Properties

**Strategy 1: Copy and Remove (Zero Downtime)**

```gql
// Step 1: Copy to new property name
MATCH (u:User)
WHERE u.username IS NOT NULL AND u.handle IS NULL
SET u.handle = u.username

// Step 2: Update application code to use new property name
// (Deploy application changes)

// Step 3: Remove old property (after deployment verified)
MATCH (u:User)
REMOVE u.username
```

{{< tabs >}}
{{< tab "Go" >}}
```go
// Phase 1: Add new property (run before deployment)
func migrateRenamePropertyPhase1(ctx context.Context, db *sql.DB) error {
    batchSize := 10000
    for {
        result, err := db.ExecContext(ctx, `
            MATCH (u:User)
            WHERE u.username IS NOT NULL AND u.handle IS NULL
            WITH u LIMIT ?
            SET u.handle = u.username
            RETURN count(u)
        `, batchSize)
        if err != nil {
            return err
        }
        if rowsAffected, _ := result.RowsAffected(); rowsAffected == 0 {
            break
        }
    }
    log.Println("Phase 1 complete: handle property populated")
    return nil
}

// Phase 2: Remove old property (run after deployment verified)
func migrateRenamePropertyPhase2(ctx context.Context, db *sql.DB) error {
    batchSize := 10000
    for {
        result, err := db.ExecContext(ctx, `
            MATCH (u:User)
            WHERE u.username IS NOT NULL
            WITH u LIMIT ?
            REMOVE u.username
            RETURN count(u)
        `, batchSize)
        if err != nil {
            return err
        }
        if rowsAffected, _ := result.RowsAffected(); rowsAffected == 0 {
            break
        }
    }
    log.Println("Phase 2 complete: username property removed")
    return nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async def migrate_rename_property_phase1(conn):
    """Phase 1: Copy username to handle (run before deployment)"""
    batch_size = 10000
    while True:
        page, _ = await conn.query("""
            MATCH (u:User)
            WHERE u.username IS NOT NULL AND u.handle IS NULL
            WITH u LIMIT $batch
            SET u.handle = u.username
            RETURN count(u) AS updated
        """, {"batch": batch_size})

        if page.rows[0]["updated"].as_int == 0:
            break

    print("Phase 1 complete: handle property populated")


async def migrate_rename_property_phase2(conn):
    """Phase 2: Remove username (run after deployment verified)"""
    batch_size = 10000
    while True:
        page, _ = await conn.query("""
            MATCH (u:User)
            WHERE u.username IS NOT NULL
            WITH u LIMIT $batch
            REMOVE u.username
            RETURN count(u) AS updated
        """, {"batch": batch_size})

        if page.rows[0]["updated"].as_int == 0:
            break

    print("Phase 2 complete: username property removed")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
/// Phase 1: Copy username to handle (run before deployment)
async fn migrate_rename_property_phase1(conn: &mut Connection) -> Result<(), Box<dyn std::error::Error>> {
    let batch_size = 10000;
    loop {
        let mut params = HashMap::new();
        params.insert("batch".to_string(), Value::int(batch_size));

        let (page, _) = conn.query_with_params(r#"
            MATCH (u:User)
            WHERE u.username IS NOT NULL AND u.handle IS NULL
            WITH u LIMIT $batch
            SET u.handle = u.username
            RETURN count(u) AS updated
        "#, &params).await?;

        if page.rows.first().and_then(|r| r.get("updated")).map(|v| v.as_int().unwrap_or(0)).unwrap_or(0) == 0 {
            break;
        }
    }
    println!("Phase 1 complete: handle property populated");
    Ok(())
}

/// Phase 2: Remove username (run after deployment verified)
async fn migrate_rename_property_phase2(conn: &mut Connection) -> Result<(), Box<dyn std::error::Error>> {
    let batch_size = 10000;
    loop {
        let mut params = HashMap::new();
        params.insert("batch".to_string(), Value::int(batch_size));

        let (page, _) = conn.query_with_params(r#"
            MATCH (u:User)
            WHERE u.username IS NOT NULL
            WITH u LIMIT $batch
            REMOVE u.username
            RETURN count(u) AS updated
        "#, &params).await?;

        if page.rows.first().and_then(|r| r.get("updated")).map(|v| v.as_int().unwrap_or(0)).unwrap_or(0) == 0 {
            break;
        }
    }
    println!("Phase 2 complete: username property removed");
    Ok(())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// Phase 1: Copy username to handle (run before deployment)
async function migrateRenamePropertyPhase1(client: Client): Promise<void> {
    const batchSize = 10000;
    while (true) {
        const rows = await client.queryAll(`
            MATCH (u:User)
            WHERE u.username IS NOT NULL AND u.handle IS NULL
            WITH u LIMIT $batch
            SET u.handle = u.username
            RETURN count(u) AS updated
        `, { params: { batch: batchSize } });

        if ((rows[0]?.get('updated')?.asNumber ?? 0) === 0) break;
    }
    console.log('Phase 1 complete: handle property populated');
}

// Phase 2: Remove username (run after deployment verified)
async function migrateRenamePropertyPhase2(client: Client): Promise<void> {
    const batchSize = 10000;
    while (true) {
        const rows = await client.queryAll(`
            MATCH (u:User)
            WHERE u.username IS NOT NULL
            WITH u LIMIT $batch
            REMOVE u.username
            RETURN count(u) AS updated
        `, { params: { batch: batchSize } });

        if ((rows[0]?.get('updated')?.asNumber ?? 0) === 0) break;
    }
    console.log('Phase 2 complete: username property removed');
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
/// Phase 1: Copy username to handle (run before deployment)
fn migrateRenamePropertyPhase1(client: *GeodeClient, allocator: std.mem.Allocator) !void {
    const batch_size = 10000;

    while (true) {
        var params = std.json.ObjectMap.init(allocator);
        defer params.deinit();
        try params.put("batch", .{ .integer = batch_size });

        try client.sendRunGql(1,
            \\MATCH (u:User)
            \\WHERE u.username IS NOT NULL AND u.handle IS NULL
            \\WITH u LIMIT $batch
            \\SET u.handle = u.username
            \\RETURN count(u) AS updated
        , .{ .object = params });
        _ = try client.receiveMessage(30000);

        try client.sendPull(1, 1);
        const result = try client.receiveMessage(30000);
        defer allocator.free(result);

        if (parseUpdatedCount(result) == 0) break;
    }

    std.debug.print("Phase 1 complete: handle property populated\n", .{});
}

/// Phase 2: Remove username (run after deployment verified)
fn migrateRenamePropertyPhase2(client: *GeodeClient, allocator: std.mem.Allocator) !void {
    const batch_size = 10000;

    while (true) {
        var params = std.json.ObjectMap.init(allocator);
        defer params.deinit();
        try params.put("batch", .{ .integer = batch_size });

        try client.sendRunGql(1,
            \\MATCH (u:User)
            \\WHERE u.username IS NOT NULL
            \\WITH u LIMIT $batch
            \\REMOVE u.username
            \\RETURN count(u) AS updated
        , .{ .object = params });
        _ = try client.receiveMessage(30000);

        try client.sendPull(1, 1);
        const result = try client.receiveMessage(30000);
        defer allocator.free(result);

        if (parseUpdatedCount(result) == 0) break;
    }

    std.debug.print("Phase 2 complete: username property removed\n", .{});
}
```
{{< /tab >}}
{{< /tabs >}}

### Renaming Labels

Label renaming is complex because labels are fundamental to node identity:

```gql
// Step 1: Add new label to existing nodes
MATCH (c:Customer)
SET c:Client

// Step 2: Update application code
// (Deploy changes)

// Step 3: Remove old label
MATCH (c:Customer)
REMOVE c:Customer
```

**With indexes and constraints**:

```gql
// Step 1: Create new indexes/constraints for new label
CREATE INDEX client_email ON :Client(email)
CREATE CONSTRAINT client_id_unique ON :Client(id) ASSERT UNIQUE

// Step 2: Add new label
MATCH (c:Customer)
SET c:Client

// Step 3: Deploy application changes

// Step 4: Remove old label and indexes
MATCH (c:Customer)
REMOVE c:Customer

DROP INDEX customer_email
DROP CONSTRAINT customer_id_unique
```

### Renaming Relationship Types

Relationship types cannot be renamed in place. Create new and delete old:

```gql
// Step 1: Create new relationships
MATCH (a:User)-[old:FRIEND_OF]->(b:User)
CREATE (a)-[:FRIENDS_WITH {since: old.since}]->(b)

// Step 2: Deploy application changes

// Step 3: Delete old relationships
MATCH ()-[r:FRIEND_OF]->()
DELETE r
```

## Data Transformations

### Splitting Properties

Transform a single property into multiple:

```gql
// Split full_name into first_name and last_name
MATCH (u:User)
WHERE u.full_name IS NOT NULL
  AND u.first_name IS NULL
SET u.first_name = split(u.full_name, ' ')[0],
    u.last_name = split(u.full_name, ' ')[-1]
```

### Merging Properties

Combine multiple properties:

```gql
// Merge address components into full_address
MATCH (u:User)
WHERE u.full_address IS NULL
SET u.full_address = u.street + ', ' + u.city + ', ' + u.state + ' ' + u.zip
```

### Restructuring Data

Transform embedded data to relationships:

```gql
// Before: User has embedded addresses array
// After: Address nodes with relationships

// Extract addresses to nodes
MATCH (u:User)
WHERE u.addresses IS NOT NULL
UNWIND u.addresses AS addr
CREATE (a:Address {
  street: addr.street,
  city: addr.city,
  state: addr.state,
  zip: addr.zip,
  type: addr.type
})
CREATE (u)-[:HAS_ADDRESS]->(a)

// Remove embedded array
MATCH (u:User)
REMOVE u.addresses
```

### Changing Data Types

Convert property types:

```gql
// String to integer
MATCH (p:Product)
SET p.price_cents = toInteger(p.price * 100)

// Integer to string
MATCH (o:Order)
SET o.order_number_str = toString(o.order_number)

// String to date
MATCH (e:Event)
SET e.event_date = date(e.date_string)
```

## Rolling Migrations (Zero Downtime)

### Expand-Contract Pattern

The safest approach for production systems:

**Phase 1: Expand**
- Add new schema elements
- Deploy code that writes to both old and new
- Backfill new elements from old

**Phase 2: Migrate**
- Deploy code that reads from new elements
- Verify everything works

**Phase 3: Contract**
- Deploy code that only uses new elements
- Remove old schema elements

```
Timeline:
[Old only] -> [Old + New] -> [New primary] -> [New only]
              Expand         Migrate         Contract
```

### Example: Renaming with Zero Downtime

**Day 1 - Expand**:
```python
# Application code writes both properties
async def update_user_email(conn, user_id, email):
    await conn.execute("""
        MATCH (u:User {id: $id})
        SET u.email = $email,
            u.email_address = $email  // New name
    """, {"id": user_id, "email": email})

# Migration: Backfill new property
async def backfill_email_address(conn):
    await conn.execute("""
        MATCH (u:User)
        WHERE u.email IS NOT NULL AND u.email_address IS NULL
        SET u.email_address = u.email
    """)
```

**Day 2 - Migrate**:
```python
# Application reads from new property
async def get_user_email(conn, user_id):
    page, _ = await conn.query("""
        MATCH (u:User {id: $id})
        RETURN coalesce(u.email_address, u.email) AS email
    """, {"id": user_id})
    return page.rows[0]["email"].as_string
```

**Day 3 - Contract**:
```python
# Application only uses new property
async def get_user_email(conn, user_id):
    page, _ = await conn.query("""
        MATCH (u:User {id: $id})
        RETURN u.email_address AS email
    """, {"id": user_id})
    return page.rows[0]["email"].as_string

# Migration: Remove old property
async def remove_old_email(conn):
    await conn.execute("""
        MATCH (u:User)
        WHERE u.email IS NOT NULL
        REMOVE u.email
    """)
```

## Rollback Strategies

### Preventive Measures

1. **Always backup before migration**:
```bash
geode backup create --name "pre-migration-$(date +%Y%m%d)"
```

2. **Use transactions for atomic changes**:
```gql
BEGIN
// Multiple related changes
SET ...
CREATE ...
DELETE ...
COMMIT
```

3. **Version your migrations**:
```gql
// Track applied migrations
CREATE (:Migration {
  version: "2026.01.15.001",
  name: "add_preferences_property",
  applied_at: timestamp(),
  applied_by: "deploy-script"
})
```

### Rollback Procedures

**For additive changes** (low risk):
```gql
// Simply remove the added elements
DROP INDEX new_index
MATCH (n) WHERE n.new_property IS NOT NULL REMOVE n.new_property
```

**For transformative changes** (keep old data):
```gql
// Restore from preserved properties
MATCH (u:User)
WHERE u._old_email IS NOT NULL
SET u.email = u._old_email
REMOVE u._old_email
```

**For complex rollbacks** (restore from backup):
```bash
# Stop application
geode backup restore --name "pre-migration-20260115"
# Restart application with old code
```

### Rollback Migration Script

{{< tabs >}}
{{< tab "Go" >}}
```go
type Migration struct {
    Version   string
    Name      string
    Up        func(ctx context.Context, db *sql.DB) error
    Down      func(ctx context.Context, db *sql.DB) error
}

func (m *Migration) Rollback(ctx context.Context, db *sql.DB) error {
    // Check if migration was applied
    var count int
    err := db.QueryRowContext(ctx, `
        MATCH (m:Migration {version: ?})
        RETURN count(m)
    `, m.Version).Scan(&count)
    if err != nil || count == 0 {
        return fmt.Errorf("migration %s not found", m.Version)
    }

    // Execute rollback
    if err := m.Down(ctx, db); err != nil {
        return fmt.Errorf("rollback failed: %w", err)
    }

    // Remove migration record
    _, err = db.ExecContext(ctx, `
        MATCH (m:Migration {version: ?})
        DELETE m
    `, m.Version)
    if err != nil {
        return fmt.Errorf("failed to remove migration record: %w", err)
    }

    log.Printf("Rolled back migration: %s", m.Name)
    return nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
from dataclasses import dataclass
from typing import Callable, Awaitable

@dataclass
class Migration:
    version: str
    name: str
    up: Callable[[Connection], Awaitable[None]]
    down: Callable[[Connection], Awaitable[None]]

    async def rollback(self, conn) -> None:
        # Check if migration was applied
        page, _ = await conn.query(
            "MATCH (m:Migration {version: $v}) RETURN count(m) AS c",
            {"v": self.version}
        )
        if page.rows[0]["c"].as_int == 0:
            raise ValueError(f"Migration {self.version} not found")

        # Execute rollback
        await self.down(conn)

        # Remove migration record
        await conn.execute(
            "MATCH (m:Migration {version: $v}) DELETE m",
            {"v": self.version}
        )

        print(f"Rolled back migration: {self.name}")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use std::future::Future;
use std::pin::Pin;

struct Migration {
    version: String,
    name: String,
    up: Box<dyn Fn(&mut Connection) -> Pin<Box<dyn Future<Output = Result<(), Box<dyn std::error::Error>>>>>>,
    down: Box<dyn Fn(&mut Connection) -> Pin<Box<dyn Future<Output = Result<(), Box<dyn std::error::Error>>>>>>,
}

impl Migration {
    async fn rollback(&self, conn: &mut Connection) -> Result<(), Box<dyn std::error::Error>> {
        // Check if migration was applied
        let mut params = HashMap::new();
        params.insert("v".to_string(), Value::string(&self.version));
        let (page, _) = conn.query_with_params(
            "MATCH (m:Migration {version: $v}) RETURN count(m) AS c",
            &params
        ).await?;

        if page.rows.first().and_then(|r| r.get("c")).map(|v| v.as_int().unwrap_or(0)).unwrap_or(0) == 0 {
            return Err(format!("Migration {} not found", self.version).into());
        }

        // Execute rollback
        (self.down)(conn).await?;

        // Remove migration record
        conn.query_with_params(
            "MATCH (m:Migration {version: $v}) DELETE m",
            &params
        ).await?;

        println!("Rolled back migration: {}", self.name);
        Ok(())
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
interface Migration {
    version: string;
    name: string;
    up: (client: Client) => Promise<void>;
    down: (client: Client) => Promise<void>;
}

async function rollbackMigration(client: Client, migration: Migration): Promise<void> {
    // Check if migration was applied
    const rows = await client.queryAll(
        'MATCH (m:Migration {version: $v}) RETURN count(m) AS c',
        { params: { v: migration.version } }
    );

    if ((rows[0]?.get('c')?.asNumber ?? 0) === 0) {
        throw new Error(`Migration ${migration.version} not found`);
    }

    // Execute rollback
    await migration.down(client);

    // Remove migration record
    await client.exec(
        'MATCH (m:Migration {version: $v}) DELETE m',
        { params: { v: migration.version } }
    );

    console.log(`Rolled back migration: ${migration.name}`);
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const Migration = struct {
    version: []const u8,
    name: []const u8,
    up: *const fn (*GeodeClient, std.mem.Allocator) anyerror!void,
    down: *const fn (*GeodeClient, std.mem.Allocator) anyerror!void,

    pub fn rollback(self: Migration, client: *GeodeClient, allocator: std.mem.Allocator) !void {
        // Check if migration was applied
        var params = std.json.ObjectMap.init(allocator);
        defer params.deinit();
        try params.put("v", .{ .string = self.version });

        try client.sendRunGql(1,
            "MATCH (m:Migration {version: $v}) RETURN count(m) AS c",
            .{ .object = params });
        _ = try client.receiveMessage(30000);

        try client.sendPull(1, 1);
        const result = try client.receiveMessage(30000);
        defer allocator.free(result);

        if (parseCount(result) == 0) {
            return error.MigrationNotFound;
        }

        // Execute rollback
        try self.down(client, allocator);

        // Remove migration record
        try client.sendRunGql(2,
            "MATCH (m:Migration {version: $v}) DELETE m",
            .{ .object = params });
        _ = try client.receiveMessage(30000);

        std.debug.print("Rolled back migration: {s}\n", .{self.name});
    }
};
```
{{< /tab >}}
{{< /tabs >}}

## Version Tracking

### Migration Table Schema

Track all migrations with a dedicated node label:

```gql
// Create migration tracking
CREATE (:Migration {
  version: "2026.01.15.001",
  name: "add_user_preferences",
  description: "Add preferences JSON property to User nodes",
  applied_at: timestamp(),
  applied_by: "deploy-bot",
  duration_ms: 45230,
  status: "completed"
})
```

### Migration Runner

{{< tabs >}}
{{< tab "Go" >}}
```go
type MigrationRunner struct {
    db         *sql.DB
    migrations []Migration
}

func (r *MigrationRunner) GetAppliedMigrations(ctx context.Context) ([]string, error) {
    rows, err := r.db.QueryContext(ctx, `
        MATCH (m:Migration {status: "completed"})
        RETURN m.version
        ORDER BY m.version
    `)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var versions []string
    for rows.Next() {
        var v string
        rows.Scan(&v)
        versions = append(versions, v)
    }
    return versions, nil
}

func (r *MigrationRunner) Run(ctx context.Context) error {
    applied, err := r.GetAppliedMigrations(ctx)
    if err != nil {
        return err
    }
    appliedSet := make(map[string]bool)
    for _, v := range applied {
        appliedSet[v] = true
    }

    for _, m := range r.migrations {
        if appliedSet[m.Version] {
            log.Printf("Skipping already applied: %s", m.Name)
            continue
        }

        log.Printf("Running migration: %s", m.Name)
        start := time.Now()

        if err := m.Up(ctx, r.db); err != nil {
            return fmt.Errorf("migration %s failed: %w", m.Version, err)
        }

        duration := time.Since(start).Milliseconds()
        _, err := r.db.ExecContext(ctx, `
            CREATE (:Migration {
                version: ?,
                name: ?,
                applied_at: timestamp(),
                duration_ms: ?,
                status: "completed"
            })
        `, m.Version, m.Name, duration)
        if err != nil {
            return fmt.Errorf("failed to record migration: %w", err)
        }

        log.Printf("Completed %s in %dms", m.Name, duration)
    }

    return nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import time
from dataclasses import dataclass, field
from typing import List

@dataclass
class MigrationRunner:
    migrations: List[Migration] = field(default_factory=list)

    async def get_applied_migrations(self, conn) -> set:
        page, _ = await conn.query("""
            MATCH (m:Migration {status: "completed"})
            RETURN m.version
        """)
        return {row["m.version"].as_string for row in page.rows}

    async def run(self, conn) -> None:
        applied = await self.get_applied_migrations(conn)

        for migration in self.migrations:
            if migration.version in applied:
                print(f"Skipping already applied: {migration.name}")
                continue

            print(f"Running migration: {migration.name}")
            start = time.time()

            try:
                await migration.up(conn)
            except Exception as e:
                raise RuntimeError(f"Migration {migration.version} failed: {e}")

            duration_ms = int((time.time() - start) * 1000)
            await conn.execute("""
                CREATE (:Migration {
                    version: $version,
                    name: $name,
                    applied_at: timestamp(),
                    duration_ms: $duration,
                    status: "completed"
                })
            """, {
                "version": migration.version,
                "name": migration.name,
                "duration": duration_ms
            })

            print(f"Completed {migration.name} in {duration_ms}ms")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use std::collections::HashSet;
use std::time::Instant;

struct MigrationRunner {
    migrations: Vec<Migration>,
}

impl MigrationRunner {
    async fn get_applied_migrations(&self, conn: &mut Connection) -> Result<HashSet<String>, Box<dyn std::error::Error>> {
        let (page, _) = conn.query(r#"
            MATCH (m:Migration {status: "completed"})
            RETURN m.version
        "#).await?;

        let mut applied = HashSet::new();
        for row in &page.rows {
            if let Some(v) = row.get("m.version") {
                applied.insert(v.as_string()?.to_string());
            }
        }
        Ok(applied)
    }

    async fn run(&self, conn: &mut Connection) -> Result<(), Box<dyn std::error::Error>> {
        let applied = self.get_applied_migrations(conn).await?;

        for migration in &self.migrations {
            if applied.contains(&migration.version) {
                println!("Skipping already applied: {}", migration.name);
                continue;
            }

            println!("Running migration: {}", migration.name);
            let start = Instant::now();

            (migration.up)(conn).await?;

            let duration_ms = start.elapsed().as_millis() as i64;
            let mut params = HashMap::new();
            params.insert("version".to_string(), Value::string(&migration.version));
            params.insert("name".to_string(), Value::string(&migration.name));
            params.insert("duration".to_string(), Value::int(duration_ms));

            conn.query_with_params(r#"
                CREATE (:Migration {
                    version: $version,
                    name: $name,
                    applied_at: timestamp(),
                    duration_ms: $duration,
                    status: "completed"
                })
            "#, &params).await?;

            println!("Completed {} in {}ms", migration.name, duration_ms);
        }

        Ok(())
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
class MigrationRunner {
    private migrations: Migration[] = [];

    addMigration(migration: Migration): void {
        this.migrations.push(migration);
    }

    async getAppliedMigrations(client: Client): Promise<Set<string>> {
        const rows = await client.queryAll(`
            MATCH (m:Migration {status: "completed"})
            RETURN m.version
        `);
        return new Set(rows.map(r => r.get('m.version')?.asString ?? ''));
    }

    async run(client: Client): Promise<void> {
        const applied = await this.getAppliedMigrations(client);

        for (const migration of this.migrations) {
            if (applied.has(migration.version)) {
                console.log(`Skipping already applied: ${migration.name}`);
                continue;
            }

            console.log(`Running migration: ${migration.name}`);
            const start = Date.now();

            try {
                await migration.up(client);
            } catch (error) {
                throw new Error(`Migration ${migration.version} failed: ${error}`);
            }

            const durationMs = Date.now() - start;
            await client.exec(`
                CREATE (:Migration {
                    version: $version,
                    name: $name,
                    applied_at: timestamp(),
                    duration_ms: $duration,
                    status: "completed"
                })
            `, {
                params: {
                    version: migration.version,
                    name: migration.name,
                    duration: durationMs
                }
            });

            console.log(`Completed ${migration.name} in ${durationMs}ms`);
        }
    }
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const MigrationRunner = struct {
    migrations: []const Migration,
    allocator: std.mem.Allocator,

    pub fn getAppliedMigrations(self: *MigrationRunner, client: *GeodeClient) !std.StringHashMap(void) {
        try client.sendRunGql(1,
            \\MATCH (m:Migration {status: "completed"})
            \\RETURN m.version
        , null);
        _ = try client.receiveMessage(30000);

        try client.sendPull(1, 1000);
        const result = try client.receiveMessage(30000);
        defer self.allocator.free(result);

        var applied = std.StringHashMap(void).init(self.allocator);
        // Parse result and populate applied set
        return applied;
    }

    pub fn run(self: *MigrationRunner, client: *GeodeClient) !void {
        var applied = try self.getAppliedMigrations(client);
        defer applied.deinit();

        for (self.migrations) |migration| {
            if (applied.contains(migration.version)) {
                std.debug.print("Skipping already applied: {s}\n", .{migration.name});
                continue;
            }

            std.debug.print("Running migration: {s}\n", .{migration.name});
            const start = std.time.milliTimestamp();

            try migration.up(client, self.allocator);

            const duration_ms = std.time.milliTimestamp() - start;

            var params = std.json.ObjectMap.init(self.allocator);
            defer params.deinit();
            try params.put("version", .{ .string = migration.version });
            try params.put("name", .{ .string = migration.name });
            try params.put("duration", .{ .integer = duration_ms });

            try client.sendRunGql(2,
                \\CREATE (:Migration {
                \\    version: $version,
                \\    name: $name,
                \\    applied_at: timestamp(),
                \\    duration_ms: $duration,
                \\    status: "completed"
                \\})
            , .{ .object = params });
            _ = try client.receiveMessage(30000);

            std.debug.print("Completed {s} in {}ms\n", .{ migration.name, duration_ms });
        }
    }
};
```
{{< /tab >}}
{{< /tabs >}}

### Version Naming Conventions

Use consistent version formats:

```
YYYY.MM.DD.NNN
2026.01.15.001  - First migration on Jan 15, 2026
2026.01.15.002  - Second migration on Jan 15, 2026
2026.01.16.001  - First migration on Jan 16, 2026
```

Or semantic versioning:

```
v1.0.0_add_user_label
v1.1.0_add_preferences
v1.2.0_rename_email
v2.0.0_restructure_addresses
```

## Best Practices

### 1. Always Test Migrations

```bash
# Create staging environment
geode backup restore --name production --target staging

# Run migration on staging
./migrate --env staging

# Verify results
geode shell --env staging
> MATCH (n) RETURN labels(n), count(n)
```

### 2. Use Batching for Large Updates

Never update millions of nodes in a single transaction:

```gql
// Bad: May timeout or run out of memory
MATCH (u:User) SET u.new_prop = "value"

// Good: Batch processing
MATCH (u:User)
WHERE u.new_prop IS NULL
WITH u LIMIT 10000
SET u.new_prop = "value"
```

### 3. Preserve Data During Transitions

Keep old data until new code is verified:

```gql
// Preserve before transforming
MATCH (u:User)
SET u._old_email = u.email
SET u.email = lower(u.email)
```

### 4. Document Every Migration

```python
# migrations/2026_01_15_001_add_preferences.py
"""
Migration: Add preferences property to User nodes

Purpose:
    Enable user preference storage for personalization features

Changes:
    - Adds `preferences` JSON property to all User nodes
    - Default value: {}

Rollback:
    MATCH (u:User) REMOVE u.preferences

Dependencies:
    - None

Estimated Duration: ~5 minutes for 1M users
"""
```

### 5. Monitor Migration Progress

```gql
// Check migration progress
MATCH (u:User)
RETURN
    count(CASE WHEN u.new_prop IS NOT NULL THEN 1 END) AS migrated,
    count(CASE WHEN u.new_prop IS NULL THEN 1 END) AS pending,
    count(u) AS total
```

## Conclusion

Successful schema migrations require:

- **Planning**: Document changes, estimate impact
- **Safety**: Use expand-contract for zero downtime
- **Tracking**: Version and record all migrations
- **Testing**: Validate in staging before production
- **Rollback**: Always have a recovery plan

Key takeaways:
- Additive changes are safe and reversible
- Use multi-phase migrations for renames
- Batch large updates to avoid timeouts
- Track migrations with version nodes
- Test thoroughly before production

## Resources

- [Graph Modeling Guide](/guides/graph-modeling/)
- [Constraints and Indexes Guide](/guides/constraints-indexes/)
- [Backup and Restore Guide](/guides/backup-restore/)
- [Production Deployment](/guides/production-deployment/)

---

**Questions?** Discuss migration strategies in our [forum](https://forum.geodedb.com).
