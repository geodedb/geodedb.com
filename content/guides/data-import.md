---
title: "Data Import Guide"
slug: "data-import"
description: "Comprehensive guide to importing data into Geode from various sources"
weight: 30
tags: ["import", "csv", "json", "migration", "bulk-loading", "etl"]
categories: ["guides", "data-management"]
keywords:
  - data import
  - CSV import
  - JSON import
  - bulk loading
  - data migration
  - ETL
  - Geode import
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Data Import Guide

This guide covers comprehensive strategies for importing data into Geode from various sources including CSV files, JSON/JSONL, SQL databases, and more. Learn best practices for bulk loading, data validation, and transaction management.

## Overview

Geode supports multiple import methods:

| Method | Best For | Performance |
|--------|----------|-------------|
| CSV Import | Tabular data, migrations | High |
| JSON/JSONL Import | Complex structures, APIs | High |
| SQL Migration | Relational database migrations | Medium |
| Streaming Import | Large datasets, real-time | Very High |
| Batch Insert | Programmatic imports | High |

## Importing from CSV Files

### Basic CSV Import

CSV files are ideal for importing nodes with consistent properties.

**Example CSV file (`users.csv`)**:
```csv
id,name,email,age,city
1,Alice,alice@example.com,30,New York
2,Bob,bob@example.com,25,San Francisco
3,Charlie,charlie@example.com,35,Seattle
```

**GQL Import**:
```gql
LOAD CSV WITH HEADERS FROM 'file:///users.csv' AS row
CREATE (:User {
  id: toInteger(row.id),
  name: row.name,
  email: row.email,
  age: toInteger(row.age),
  city: row.city
})
```

### Multi-Language CSV Import Examples

{{< tabs >}}
{{< tab "Go" >}}
```go
package main

import (
    "context"
    "database/sql"
    "encoding/csv"
    "log"
    "os"
    "strconv"

    _ "geodedb.com/geode"
)

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()

    // Open CSV file
    file, err := os.Open("users.csv")
    if err != nil {
        log.Fatal(err)
    }
    defer file.Close()

    reader := csv.NewReader(file)

    // Skip header
    _, err = reader.Read()
    if err != nil {
        log.Fatal(err)
    }

    // Begin transaction for bulk import
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        log.Fatal(err)
    }

    // Prepare statement for reuse
    stmt, err := tx.PrepareContext(ctx,
        `CREATE (:User {id: ?, name: ?, email: ?, age: ?, city: ?})`)
    if err != nil {
        tx.Rollback()
        log.Fatal(err)
    }
    defer stmt.Close()

    // Import rows
    rowCount := 0
    for {
        record, err := reader.Read()
        if err != nil {
            break // EOF or error
        }

        id, _ := strconv.Atoi(record[0])
        age, _ := strconv.Atoi(record[3])

        _, err = stmt.ExecContext(ctx, id, record[1], record[2], age, record[4])
        if err != nil {
            tx.Rollback()
            log.Fatalf("Error importing row %d: %v", rowCount, err)
        }
        rowCount++
    }

    err = tx.Commit()
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Successfully imported %d users", rowCount)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import asyncio
import csv
from geode_client import Client

async def import_csv(filename: str):
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        # Begin transaction for bulk import
        await conn.begin()

        try:
            with open(filename, 'r') as file:
                reader = csv.DictReader(file)
                row_count = 0

                for row in reader:
                    await conn.execute(
                        """CREATE (:User {
                            id: $id,
                            name: $name,
                            email: $email,
                            age: $age,
                            city: $city
                        })""",
                        {
                            "id": int(row['id']),
                            "name": row['name'],
                            "email": row['email'],
                            "age": int(row['age']),
                            "city": row['city']
                        }
                    )
                    row_count += 1

                    # Commit in batches for large files
                    if row_count % 1000 == 0:
                        await conn.commit()
                        await conn.begin()
                        print(f"Imported {row_count} rows...")

            await conn.commit()
            print(f"Successfully imported {row_count} users")

        except Exception as e:
            await conn.rollback()
            raise e

asyncio.run(import_csv("users.csv"))
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::{Client, Value};
use std::collections::HashMap;
use std::error::Error;
use std::fs::File;
use csv::ReaderBuilder;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    // Begin transaction
    conn.begin().await?;

    // Open CSV file
    let file = File::open("users.csv")?;
    let mut reader = ReaderBuilder::new()
        .has_headers(true)
        .from_reader(file);

    let mut row_count = 0;

    for result in reader.records() {
        let record = result?;

        let mut params = HashMap::new();
        params.insert("id".to_string(), Value::int(record[0].parse::<i64>()?));
        params.insert("name".to_string(), Value::string(&record[1]));
        params.insert("email".to_string(), Value::string(&record[2]));
        params.insert("age".to_string(), Value::int(record[3].parse::<i64>()?));
        params.insert("city".to_string(), Value::string(&record[4]));

        conn.query_with_params(
            r#"CREATE (:User {
                id: $id,
                name: $name,
                email: $email,
                age: $age,
                city: $city
            })"#,
            &params
        ).await?;

        row_count += 1;

        // Commit in batches
        if row_count % 1000 == 0 {
            conn.commit().await?;
            conn.begin().await?;
            println!("Imported {} rows...", row_count);
        }
    }

    conn.commit().await?;
    println!("Successfully imported {} users", row_count);

    Ok(())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { createClient } from '@geodedb/client';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

async function importCSV(filename: string) {
    const client = await createClient('quic://localhost:3141');

    const fileContent = readFileSync(filename, 'utf-8');
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });

    await client.beginTransaction();

    try {
        let rowCount = 0;

        for (const row of records) {
            await client.exec(
                `CREATE (:User {
                    id: $id,
                    name: $name,
                    email: $email,
                    age: $age,
                    city: $city
                })`,
                {
                    params: {
                        id: parseInt(row.id),
                        name: row.name,
                        email: row.email,
                        age: parseInt(row.age),
                        city: row.city
                    }
                }
            );
            rowCount++;

            // Commit in batches
            if (rowCount % 1000 === 0) {
                await client.commit();
                await client.beginTransaction();
                console.log(`Imported ${rowCount} rows...`);
            }
        }

        await client.commit();
        console.log(`Successfully imported ${rowCount} users`);

    } catch (error) {
        await client.rollback();
        throw error;
    } finally {
        await client.close();
    }
}

importCSV('users.csv');
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.sendHello("csv-import", "1.0.0");
    _ = try client.receiveMessage(30000);

    // Begin transaction
    try client.sendBegin();
    _ = try client.receiveMessage(30000);

    // Read CSV file
    const file = try std.fs.cwd().openFile("users.csv", .{});
    defer file.close();

    var buf_reader = std.io.bufferedReader(file.reader());
    var reader = buf_reader.reader();

    // Skip header line
    _ = try reader.readUntilDelimiterAlloc(allocator, '\n', 4096);

    var row_count: usize = 0;
    var line_buf: [4096]u8 = undefined;

    while (try reader.readUntilDelimiterOrEof(&line_buf, '\n')) |line| {
        var iter = std.mem.splitScalar(u8, line, ',');

        const id = iter.next() orelse continue;
        const name = iter.next() orelse continue;
        const email = iter.next() orelse continue;
        const age = iter.next() orelse continue;
        const city = iter.next() orelse continue;

        var params = std.json.ObjectMap.init(allocator);
        defer params.deinit();

        try params.put("id", .{ .integer = try std.fmt.parseInt(i64, id, 10) });
        try params.put("name", .{ .string = name });
        try params.put("email", .{ .string = email });
        try params.put("age", .{ .integer = try std.fmt.parseInt(i64, age, 10) });
        try params.put("city", .{ .string = city });

        try client.sendRunGql(row_count + 1,
            \\CREATE (:User {
            \\  id: $id,
            \\  name: $name,
            \\  email: $email,
            \\  age: $age,
            \\  city: $city
            \\})
        , .{ .object = params });
        _ = try client.receiveMessage(30000);

        row_count += 1;
    }

    // Commit transaction
    try client.sendCommit();
    _ = try client.receiveMessage(30000);

    std.debug.print("Successfully imported {} users\n", .{row_count});
}
```
{{< /tab >}}
{{< /tabs >}}

### Importing Relationships from CSV

**Example relationships CSV (`friendships.csv`)**:
```csv
from_id,to_id,since,strength
1,2,2020-01-15,0.8
2,3,2019-06-20,0.9
1,3,2021-03-10,0.5
```

**GQL Import**:
```gql
LOAD CSV WITH HEADERS FROM 'file:///friendships.csv' AS row
MATCH (from:User {id: toInteger(row.from_id)})
MATCH (to:User {id: toInteger(row.to_id)})
CREATE (from)-[:KNOWS {
  since: date(row.since),
  strength: toFloat(row.strength)
}]->(to)
```

### Handling CSV Edge Cases

**Null Values**:
```gql
LOAD CSV WITH HEADERS FROM 'file:///users.csv' AS row
CREATE (:User {
  id: toInteger(row.id),
  name: row.name,
  email: CASE WHEN row.email = '' THEN null ELSE row.email END,
  age: CASE WHEN row.age = '' THEN null ELSE toInteger(row.age) END
})
```

**Multiple Labels**:
```gql
LOAD CSV WITH HEADERS FROM 'file:///entities.csv' AS row
CREATE (n)
SET n:User
SET n += {id: toInteger(row.id), name: row.name}
WITH n, row
CALL {
  WITH n, row
  WHERE row.is_admin = 'true'
  SET n:Admin
}
```

## Importing from JSON/JSONL

### Basic JSON Import

**Example JSON file (`users.json`)**:
```json
[
  {"id": 1, "name": "Alice", "email": "alice@example.com", "tags": ["developer", "python"]},
  {"id": 2, "name": "Bob", "email": "bob@example.com", "tags": ["designer", "ui"]},
  {"id": 3, "name": "Charlie", "email": "charlie@example.com", "tags": ["manager"]}
]
```

### Multi-Language JSON Import Examples

{{< tabs >}}
{{< tab "Go" >}}
```go
package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "log"
    "os"

    _ "geodedb.com/geode"
)

type User struct {
    ID    int      `json:"id"`
    Name  string   `json:"name"`
    Email string   `json:"email"`
    Tags  []string `json:"tags"`
}

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()

    // Read JSON file
    data, err := os.ReadFile("users.json")
    if err != nil {
        log.Fatal(err)
    }

    var users []User
    if err := json.Unmarshal(data, &users); err != nil {
        log.Fatal(err)
    }

    // Begin transaction
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        log.Fatal(err)
    }

    for _, user := range users {
        tagsJSON, _ := json.Marshal(user.Tags)

        _, err = tx.ExecContext(ctx,
            `CREATE (:User {id: ?, name: ?, email: ?, tags: ?})`,
            user.ID, user.Name, user.Email, string(tagsJSON))
        if err != nil {
            tx.Rollback()
            log.Fatalf("Error importing user %d: %v", user.ID, err)
        }
    }

    if err := tx.Commit(); err != nil {
        log.Fatal(err)
    }

    log.Printf("Successfully imported %d users", len(users))
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import asyncio
import json
from geode_client import Client

async def import_json(filename: str):
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        await conn.begin()

        try:
            with open(filename, 'r') as file:
                users = json.load(file)

            for user in users:
                await conn.execute(
                    """CREATE (:User {
                        id: $id,
                        name: $name,
                        email: $email,
                        tags: $tags
                    })""",
                    {
                        "id": user['id'],
                        "name": user['name'],
                        "email": user['email'],
                        "tags": user['tags']  # Lists are supported
                    }
                )

            await conn.commit()
            print(f"Successfully imported {len(users)} users")

        except Exception as e:
            await conn.rollback()
            raise e

asyncio.run(import_json("users.json"))
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::{Client, Value};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;

#[derive(Debug, Deserialize, Serialize)]
struct User {
    id: i64,
    name: String,
    email: String,
    tags: Vec<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    // Read JSON file
    let content = fs::read_to_string("users.json")?;
    let users: Vec<User> = serde_json::from_str(&content)?;

    conn.begin().await?;

    for user in &users {
        let tags: Vec<Value> = user.tags.iter()
            .map(|t| Value::string(t))
            .collect();

        let mut params = HashMap::new();
        params.insert("id".to_string(), Value::int(user.id));
        params.insert("name".to_string(), Value::string(&user.name));
        params.insert("email".to_string(), Value::string(&user.email));
        params.insert("tags".to_string(), Value::list(tags));

        conn.query_with_params(
            r#"CREATE (:User {
                id: $id,
                name: $name,
                email: $email,
                tags: $tags
            })"#,
            &params
        ).await?;
    }

    conn.commit().await?;
    println!("Successfully imported {} users", users.len());

    Ok(())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { createClient } from '@geodedb/client';
import { readFileSync } from 'fs';

interface User {
    id: number;
    name: string;
    email: string;
    tags: string[];
}

async function importJSON(filename: string) {
    const client = await createClient('quic://localhost:3141');

    const content = readFileSync(filename, 'utf-8');
    const users: User[] = JSON.parse(content);

    await client.beginTransaction();

    try {
        for (const user of users) {
            await client.exec(
                `CREATE (:User {
                    id: $id,
                    name: $name,
                    email: $email,
                    tags: $tags
                })`,
                {
                    params: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        tags: user.tags
                    }
                }
            );
        }

        await client.commit();
        console.log(`Successfully imported ${users.length} users`);

    } catch (error) {
        await client.rollback();
        throw error;
    } finally {
        await client.close();
    }
}

importJSON('users.json');
```
{{< /tab >}}
{{< /tabs >}}

### JSONL (JSON Lines) Import

JSONL is ideal for streaming large datasets where each line is a valid JSON object.

**Example JSONL file (`events.jsonl`)**:
```jsonl
{"type": "user_created", "user_id": 1, "timestamp": "2024-01-15T10:30:00Z", "data": {"name": "Alice"}}
{"type": "user_login", "user_id": 1, "timestamp": "2024-01-15T11:00:00Z", "data": {"ip": "192.168.1.1"}}
{"type": "user_purchase", "user_id": 1, "timestamp": "2024-01-15T12:30:00Z", "data": {"amount": 99.99}}
```

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
import json
from geode_client import Client

async def import_jsonl(filename: str):
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        await conn.begin()

        try:
            row_count = 0

            with open(filename, 'r') as file:
                for line in file:
                    if line.strip():
                        event = json.loads(line)

                        await conn.execute(
                            """CREATE (:Event {
                                type: $type,
                                user_id: $user_id,
                                timestamp: $timestamp,
                                data: $data
                            })""",
                            {
                                "type": event['type'],
                                "user_id": event['user_id'],
                                "timestamp": event['timestamp'],
                                "data": json.dumps(event['data'])
                            }
                        )
                        row_count += 1

                        # Commit in batches
                        if row_count % 5000 == 0:
                            await conn.commit()
                            await conn.begin()
                            print(f"Imported {row_count} events...")

            await conn.commit()
            print(f"Successfully imported {row_count} events")

        except Exception as e:
            await conn.rollback()
            raise e

asyncio.run(import_jsonl("events.jsonl"))
```
{{< /tab >}}
{{< tab "Go" >}}
```go
package main

import (
    "bufio"
    "context"
    "database/sql"
    "encoding/json"
    "log"
    "os"

    _ "geodedb.com/geode"
)

type Event struct {
    Type      string                 `json:"type"`
    UserID    int                    `json:"user_id"`
    Timestamp string                 `json:"timestamp"`
    Data      map[string]interface{} `json:"data"`
}

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()

    file, err := os.Open("events.jsonl")
    if err != nil {
        log.Fatal(err)
    }
    defer file.Close()

    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        log.Fatal(err)
    }

    scanner := bufio.NewScanner(file)
    rowCount := 0

    for scanner.Scan() {
        var event Event
        if err := json.Unmarshal(scanner.Bytes(), &event); err != nil {
            log.Printf("Skipping invalid JSON: %v", err)
            continue
        }

        dataJSON, _ := json.Marshal(event.Data)

        _, err = tx.ExecContext(ctx,
            `CREATE (:Event {type: ?, user_id: ?, timestamp: ?, data: ?})`,
            event.Type, event.UserID, event.Timestamp, string(dataJSON))
        if err != nil {
            log.Printf("Error importing event: %v", err)
            continue
        }

        rowCount++
        if rowCount%5000 == 0 {
            tx.Commit()
            tx, _ = db.BeginTx(ctx, nil)
            log.Printf("Imported %d events...", rowCount)
        }
    }

    tx.Commit()
    log.Printf("Successfully imported %d events", rowCount)
}
```
{{< /tab >}}
{{< /tabs >}}

## Migrating from SQL Databases

### PostgreSQL Migration

**Step 1: Export from PostgreSQL**
```bash
# Export users table
psql -d mydb -c "COPY users TO '/tmp/users.csv' WITH CSV HEADER"

# Export relationships via join
psql -d mydb -c "COPY (SELECT * FROM friendships) TO '/tmp/friendships.csv' WITH CSV HEADER"
```

**Step 2: Import to Geode**
```gql
// Import users
LOAD CSV WITH HEADERS FROM 'file:///tmp/users.csv' AS row
CREATE (:User {
  id: toInteger(row.id),
  name: row.name,
  email: row.email,
  created_at: datetime(row.created_at)
})

// Import relationships
LOAD CSV WITH HEADERS FROM 'file:///tmp/friendships.csv' AS row
MATCH (u1:User {id: toInteger(row.user_id)})
MATCH (u2:User {id: toInteger(row.friend_id)})
CREATE (u1)-[:KNOWS {since: date(row.since)}]->(u2)
```

### MySQL Migration

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
import mysql.connector
from geode_client import Client

async def migrate_from_mysql():
    # Connect to MySQL
    mysql_conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="password",
        database="myapp"
    )
    cursor = mysql_conn.cursor(dictionary=True)

    # Connect to Geode
    geode_client = Client(host="localhost", port=3141, skip_verify=True)

    async with geode_client.connection() as conn:
        await conn.begin()

        try:
            # Migrate users
            cursor.execute("SELECT * FROM users")
            users = cursor.fetchall()

            for user in users:
                await conn.execute(
                    """CREATE (:User {
                        id: $id,
                        name: $name,
                        email: $email,
                        created_at: $created_at
                    })""",
                    {
                        "id": user['id'],
                        "name": user['name'],
                        "email": user['email'],
                        "created_at": str(user['created_at'])
                    }
                )

            print(f"Migrated {len(users)} users")

            # Migrate relationships
            cursor.execute("""
                SELECT user_id, friend_id, created_at
                FROM friendships
            """)
            friendships = cursor.fetchall()

            for f in friendships:
                await conn.execute(
                    """MATCH (u1:User {id: $user_id})
                       MATCH (u2:User {id: $friend_id})
                       CREATE (u1)-[:KNOWS {since: $since}]->(u2)""",
                    {
                        "user_id": f['user_id'],
                        "friend_id": f['friend_id'],
                        "since": str(f['created_at'])
                    }
                )

            print(f"Migrated {len(friendships)} relationships")

            await conn.commit()

        except Exception as e:
            await conn.rollback()
            raise e
        finally:
            cursor.close()
            mysql_conn.close()

asyncio.run(migrate_from_mysql())
```
{{< /tab >}}
{{< tab "Go" >}}
```go
package main

import (
    "context"
    "database/sql"
    "log"

    _ "geodedb.com/geode"
    _ "github.com/go-sql-driver/mysql"
)

func main() {
    // Connect to MySQL
    mysqlDB, err := sql.Open("mysql", "root:password@tcp(localhost:3306)/myapp")
    if err != nil {
        log.Fatal(err)
    }
    defer mysqlDB.Close()

    // Connect to Geode
    geodeDB, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer geodeDB.Close()

    ctx := context.Background()

    // Begin Geode transaction
    tx, err := geodeDB.BeginTx(ctx, nil)
    if err != nil {
        log.Fatal(err)
    }

    // Migrate users
    rows, err := mysqlDB.QueryContext(ctx, "SELECT id, name, email, created_at FROM users")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    userCount := 0
    for rows.Next() {
        var id int
        var name, email, createdAt string
        rows.Scan(&id, &name, &email, &createdAt)

        _, err = tx.ExecContext(ctx,
            `CREATE (:User {id: ?, name: ?, email: ?, created_at: ?})`,
            id, name, email, createdAt)
        if err != nil {
            tx.Rollback()
            log.Fatalf("Error migrating user %d: %v", id, err)
        }
        userCount++
    }

    log.Printf("Migrated %d users", userCount)

    // Migrate relationships
    rows, err = mysqlDB.QueryContext(ctx,
        "SELECT user_id, friend_id, created_at FROM friendships")
    if err != nil {
        tx.Rollback()
        log.Fatal(err)
    }
    defer rows.Close()

    relCount := 0
    for rows.Next() {
        var userID, friendID int
        var since string
        rows.Scan(&userID, &friendID, &since)

        _, err = tx.ExecContext(ctx, `
            MATCH (u1:User {id: ?})
            MATCH (u2:User {id: ?})
            CREATE (u1)-[:KNOWS {since: ?}]->(u2)
        `, userID, friendID, since)
        if err != nil {
            log.Printf("Warning: Failed to create relationship %d->%d: %v", userID, friendID, err)
            continue
        }
        relCount++
    }

    log.Printf("Migrated %d relationships", relCount)

    if err := tx.Commit(); err != nil {
        log.Fatal(err)
    }

    log.Println("Migration complete!")
}
```
{{< /tab >}}
{{< /tabs >}}

### Schema Mapping Guidelines

| SQL Concept | Graph Equivalent |
|-------------|------------------|
| Table | Node Label |
| Row | Node |
| Primary Key | Node property (id) |
| Foreign Key | Relationship |
| Join Table | Relationship with properties |
| Column | Property |
| Index | Index on property |

## Bulk Loading Strategies

### Batch Size Optimization

For optimal import performance, tune your batch sizes based on your data:

| Data Type | Recommended Batch Size | Commit Frequency |
|-----------|------------------------|------------------|
| Small nodes (<1KB) | 5,000-10,000 | Every 10,000 |
| Medium nodes (1-10KB) | 1,000-5,000 | Every 5,000 |
| Large nodes (>10KB) | 100-500 | Every 500 |
| Relationships | 10,000-50,000 | Every 50,000 |

### Parallel Import

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
import csv
from geode_client import Client

async def import_batch(batch: list, batch_num: int):
    """Import a single batch of records."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        await conn.begin()

        try:
            for row in batch:
                await conn.execute(
                    """CREATE (:User {
                        id: $id,
                        name: $name,
                        email: $email
                    })""",
                    row
                )

            await conn.commit()
            print(f"Batch {batch_num} complete ({len(batch)} records)")
            return len(batch)

        except Exception as e:
            await conn.rollback()
            print(f"Batch {batch_num} failed: {e}")
            return 0

async def parallel_import(filename: str, batch_size: int = 5000, workers: int = 4):
    """Import CSV using parallel workers."""

    # Read all records
    with open(filename, 'r') as f:
        reader = csv.DictReader(f)
        records = [
            {"id": int(r['id']), "name": r['name'], "email": r['email']}
            for r in reader
        ]

    # Split into batches
    batches = [
        records[i:i + batch_size]
        for i in range(0, len(records), batch_size)
    ]

    print(f"Processing {len(records)} records in {len(batches)} batches with {workers} workers")

    # Process batches with limited concurrency
    semaphore = asyncio.Semaphore(workers)

    async def limited_import(batch, batch_num):
        async with semaphore:
            return await import_batch(batch, batch_num)

    tasks = [
        limited_import(batch, i)
        for i, batch in enumerate(batches)
    ]

    results = await asyncio.gather(*tasks)
    total = sum(results)

    print(f"Successfully imported {total} of {len(records)} records")

asyncio.run(parallel_import("large_users.csv", batch_size=5000, workers=4))
```
{{< /tab >}}
{{< tab "Go" >}}
```go
package main

import (
    "context"
    "database/sql"
    "encoding/csv"
    "log"
    "os"
    "strconv"
    "sync"
    "sync/atomic"

    _ "geodedb.com/geode"
)

type Record struct {
    ID    int
    Name  string
    Email string
}

func importBatch(ctx context.Context, db *sql.DB, batch []Record, batchNum int, total *int64) {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        log.Printf("Batch %d: Failed to begin transaction: %v", batchNum, err)
        return
    }

    for _, r := range batch {
        _, err := tx.ExecContext(ctx,
            `CREATE (:User {id: ?, name: ?, email: ?})`,
            r.ID, r.Name, r.Email)
        if err != nil {
            tx.Rollback()
            log.Printf("Batch %d: Failed: %v", batchNum, err)
            return
        }
    }

    if err := tx.Commit(); err != nil {
        log.Printf("Batch %d: Commit failed: %v", batchNum, err)
        return
    }

    atomic.AddInt64(total, int64(len(batch)))
    log.Printf("Batch %d complete (%d records)", batchNum, len(batch))
}

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Increase connection pool for parallel imports
    db.SetMaxOpenConns(10)

    ctx := context.Background()

    // Read CSV
    file, _ := os.Open("large_users.csv")
    defer file.Close()
    reader := csv.NewReader(file)
    reader.Read() // Skip header

    var records []Record
    for {
        row, err := reader.Read()
        if err != nil {
            break
        }
        id, _ := strconv.Atoi(row[0])
        records = append(records, Record{ID: id, Name: row[1], Email: row[2]})
    }

    // Split into batches
    batchSize := 5000
    workers := 4
    var batches [][]Record

    for i := 0; i < len(records); i += batchSize {
        end := i + batchSize
        if end > len(records) {
            end = len(records)
        }
        batches = append(batches, records[i:end])
    }

    log.Printf("Processing %d records in %d batches with %d workers",
        len(records), len(batches), workers)

    // Process with worker pool
    var wg sync.WaitGroup
    sem := make(chan struct{}, workers)
    var total int64

    for i, batch := range batches {
        wg.Add(1)
        sem <- struct{}{}

        go func(b []Record, num int) {
            defer wg.Done()
            defer func() { <-sem }()
            importBatch(ctx, db, b, num, &total)
        }(batch, i)
    }

    wg.Wait()
    log.Printf("Successfully imported %d of %d records", total, len(records))
}
```
{{< /tab >}}
{{< /tabs >}}

### Disabling Indexes During Import

For very large imports, temporarily disable indexes:

```gql
// Drop indexes before import
DROP INDEX user_email
DROP INDEX user_name

// Perform bulk import
LOAD CSV WITH HEADERS FROM 'file:///large_users.csv' AS row
CREATE (:User {id: toInteger(row.id), name: row.name, email: row.email})

// Recreate indexes after import
CREATE INDEX user_email ON :User(email)
CREATE INDEX user_name ON :User(name)
```

## Handling Large Datasets

### Streaming Import

For datasets that don't fit in memory, use streaming:

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
from geode_client import Client

async def stream_import(filename: str, chunk_size: int = 10000):
    """Stream import large files without loading into memory."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        total_imported = 0

        with open(filename, 'r') as f:
            # Skip header
            header = f.readline().strip().split(',')

            chunk = []
            for line in f:
                values = line.strip().split(',')
                record = dict(zip(header, values))
                chunk.append(record)

                if len(chunk) >= chunk_size:
                    await conn.begin()

                    for row in chunk:
                        await conn.execute(
                            """CREATE (:User {
                                id: $id,
                                name: $name,
                                email: $email
                            })""",
                            {
                                "id": int(row['id']),
                                "name": row['name'],
                                "email": row['email']
                            }
                        )

                    await conn.commit()
                    total_imported += len(chunk)
                    print(f"Imported {total_imported} records...")
                    chunk = []

            # Import remaining records
            if chunk:
                await conn.begin()
                for row in chunk:
                    await conn.execute(
                        """CREATE (:User {
                            id: $id,
                            name: $name,
                            email: $email
                        })""",
                        {
                            "id": int(row['id']),
                            "name": row['name'],
                            "email": row['email']
                        }
                    )
                await conn.commit()
                total_imported += len(chunk)

        print(f"Total imported: {total_imported} records")

asyncio.run(stream_import("huge_dataset.csv"))
```
{{< /tab >}}
{{< /tabs >}}

### Memory-Efficient Processing

```python
import asyncio
import mmap
from geode_client import Client

async def mmap_import(filename: str):
    """Memory-mapped file import for very large files."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        with open(filename, 'rb') as f:
            # Memory-map the file
            mm = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)

            # Skip header
            mm.readline()

            batch = []
            batch_size = 5000
            total = 0

            while True:
                line = mm.readline()
                if not line:
                    break

                parts = line.decode('utf-8').strip().split(',')
                if len(parts) >= 3:
                    batch.append({
                        "id": int(parts[0]),
                        "name": parts[1],
                        "email": parts[2]
                    })

                if len(batch) >= batch_size:
                    await conn.begin()
                    for row in batch:
                        await conn.execute(
                            "CREATE (:User {id: $id, name: $name, email: $email})",
                            row
                        )
                    await conn.commit()
                    total += len(batch)
                    print(f"Imported {total} records...")
                    batch = []

            # Final batch
            if batch:
                await conn.begin()
                for row in batch:
                    await conn.execute(
                        "CREATE (:User {id: $id, name: $name, email: $email})",
                        row
                    )
                await conn.commit()
                total += len(batch)

            mm.close()

        print(f"Total imported: {total} records")

asyncio.run(mmap_import("huge_dataset.csv"))
```

## Data Validation During Import

### Schema Validation

```python
import asyncio
from geode_client import Client
from typing import Optional

class ValidationError(Exception):
    pass

def validate_user(row: dict) -> Optional[str]:
    """Validate a user record."""
    errors = []

    # Required fields
    if not row.get('name'):
        errors.append("name is required")

    if not row.get('email'):
        errors.append("email is required")
    elif '@' not in row['email']:
        errors.append("email is invalid")

    # Type validation
    try:
        int(row.get('id', 0))
    except ValueError:
        errors.append("id must be an integer")

    try:
        age = int(row.get('age', 0))
        if age < 0 or age > 150:
            errors.append("age must be between 0 and 150")
    except ValueError:
        errors.append("age must be an integer")

    return "; ".join(errors) if errors else None

async def validated_import(filename: str):
    """Import with validation."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    valid_count = 0
    invalid_count = 0
    errors_log = []

    async with client.connection() as conn:
        await conn.begin()

        try:
            import csv
            with open(filename, 'r') as f:
                reader = csv.DictReader(f)

                for line_num, row in enumerate(reader, start=2):
                    error = validate_user(row)

                    if error:
                        invalid_count += 1
                        errors_log.append(f"Line {line_num}: {error}")
                        continue

                    await conn.execute(
                        """CREATE (:User {
                            id: $id,
                            name: $name,
                            email: $email,
                            age: $age
                        })""",
                        {
                            "id": int(row['id']),
                            "name": row['name'],
                            "email": row['email'],
                            "age": int(row.get('age', 0))
                        }
                    )
                    valid_count += 1

            await conn.commit()

        except Exception as e:
            await conn.rollback()
            raise e

    print(f"Import complete: {valid_count} valid, {invalid_count} invalid")

    if errors_log:
        with open('import_errors.log', 'w') as f:
            f.write('\n'.join(errors_log))
        print(f"Errors written to import_errors.log")

asyncio.run(validated_import("users.csv"))
```

### Deduplication

```gql
// Check for existing records before import
LOAD CSV WITH HEADERS FROM 'file:///users.csv' AS row
OPTIONAL MATCH (existing:User {email: row.email})
WITH row, existing
WHERE existing IS NULL
CREATE (:User {
  id: toInteger(row.id),
  name: row.name,
  email: row.email
})
```

### Using MERGE for Upserts

```gql
// Create or update records
LOAD CSV WITH HEADERS FROM 'file:///users.csv' AS row
MERGE (u:User {id: toInteger(row.id)})
SET u.name = row.name,
    u.email = row.email,
    u.updated_at = timestamp()
```

## Transaction Management for Imports

### Savepoints for Partial Rollback

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
from geode_client import Client

async def import_with_savepoints():
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        await conn.begin()

        try:
            # Import users
            await conn.execute("CREATE (:User {id: 1, name: 'Alice'})")
            await conn.execute("CREATE (:User {id: 2, name: 'Bob'})")

            # Create savepoint before relationships
            await conn.savepoint("before_relationships")

            try:
                # Try to create relationships
                await conn.execute("""
                    MATCH (a:User {id: 1}), (b:User {id: 2})
                    CREATE (a)-[:KNOWS]->(b)
                """)

                # This might fail
                await conn.execute("""
                    MATCH (a:User {id: 1}), (b:User {id: 999})
                    CREATE (a)-[:KNOWS]->(b)
                """)

            except Exception as e:
                # Rollback only relationships, keep users
                print(f"Relationship error: {e}")
                await conn.rollback_to_savepoint("before_relationships")
                print("Rolled back to savepoint")

            # Commit what we have (users)
            await conn.commit()
            print("Users imported successfully")

        except Exception as e:
            await conn.rollback()
            raise e

asyncio.run(import_with_savepoints())
```
{{< /tab >}}
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

    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        log.Fatal(err)
    }

    // Import users
    tx.ExecContext(ctx, `CREATE (:User {id: 1, name: 'Alice'})`)
    tx.ExecContext(ctx, `CREATE (:User {id: 2, name: 'Bob'})`)

    // Create savepoint
    tx.ExecContext(ctx, "SAVEPOINT before_relationships")

    // Try to create relationships
    _, err = tx.ExecContext(ctx, `
        MATCH (a:User {id: 1}), (b:User {id: 2})
        CREATE (a)-[:KNOWS]->(b)
    `)
    if err != nil {
        log.Printf("Relationship error: %v", err)
        tx.ExecContext(ctx, "ROLLBACK TO SAVEPOINT before_relationships")
        log.Println("Rolled back to savepoint")
    }

    // Commit what we have
    if err := tx.Commit(); err != nil {
        log.Fatal(err)
    }

    log.Println("Import complete")
}
```
{{< /tab >}}
{{< /tabs >}}

### Error Recovery

```python
import asyncio
import json
from geode_client import Client

async def resilient_import(filename: str):
    """Import with error recovery and resume capability."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    # Track progress
    progress_file = f"{filename}.progress"
    try:
        with open(progress_file, 'r') as f:
            progress = json.load(f)
    except FileNotFoundError:
        progress = {"last_successful_id": 0, "failed_ids": []}

    async with client.connection() as conn:
        import csv
        with open(filename, 'r') as f:
            reader = csv.DictReader(f)

            for row in reader:
                row_id = int(row['id'])

                # Skip already imported
                if row_id <= progress['last_successful_id']:
                    continue

                # Skip known failures (for retry later)
                if row_id in progress['failed_ids']:
                    continue

                try:
                    await conn.begin()
                    await conn.execute(
                        "CREATE (:User {id: $id, name: $name, email: $email})",
                        {"id": row_id, "name": row['name'], "email": row['email']}
                    )
                    await conn.commit()

                    progress['last_successful_id'] = row_id

                except Exception as e:
                    await conn.rollback()
                    progress['failed_ids'].append(row_id)
                    print(f"Failed to import row {row_id}: {e}")

                # Save progress periodically
                if row_id % 1000 == 0:
                    with open(progress_file, 'w') as pf:
                        json.dump(progress, pf)

    # Final progress save
    with open(progress_file, 'w') as pf:
        json.dump(progress, pf)

    print(f"Import complete. Last ID: {progress['last_successful_id']}")
    print(f"Failed IDs: {len(progress['failed_ids'])}")

asyncio.run(resilient_import("users.csv"))
```

## Performance Tuning

### Import Performance Checklist

1. **Disable constraints during bulk import**
2. **Use batch transactions (5000-10000 records)**
3. **Parallel import with multiple connections**
4. **Drop and recreate indexes after import**
5. **Use prepared statements for repeated queries**
6. **Monitor memory and adjust batch sizes**

### Benchmarking Import Speed

```python
import asyncio
import time
from geode_client import Client

async def benchmark_import(record_count: int, batch_size: int):
    """Benchmark import performance."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        start_time = time.time()

        for batch_start in range(0, record_count, batch_size):
            await conn.begin()

            for i in range(batch_start, min(batch_start + batch_size, record_count)):
                await conn.execute(
                    "CREATE (:User {id: $id, name: $name})",
                    {"id": i, "name": f"User_{i}"}
                )

            await conn.commit()

        elapsed = time.time() - start_time
        rate = record_count / elapsed

        print(f"Imported {record_count} records in {elapsed:.2f}s")
        print(f"Rate: {rate:.0f} records/second")
        print(f"Batch size: {batch_size}")

# Test different batch sizes
asyncio.run(benchmark_import(10000, 1000))
asyncio.run(benchmark_import(10000, 5000))
asyncio.run(benchmark_import(10000, 10000))
```

## Next Steps

- [Data Export Guide](/guides/data-export/) - Export your data
- [Backup and Restore Guide](/guides/backup-restore/) - Protect your data
- [Performance Guide](/docs/performance/) - Optimize query performance
- [Graph Modeling Guide](/guides/graph-modeling/) - Design effective schemas

## Resources

- [GQL Reference](/docs/gql-reference/)
- [Client Libraries](/clients/)
- [API Reference](/docs/api-reference/)
- [Community Forum](https://forum.geodedb.com)

---

**Questions?** Discuss data import strategies in our [forum](https://forum.geodedb.com).
