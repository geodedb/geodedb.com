---
title: "Data Export Guide"
slug: "data-export"
description: "Comprehensive guide to exporting data from Geode to various formats"
weight: 31
tags: ["export", "csv", "json", "backup", "analytics", "etl"]
categories: ["guides", "data-management"]
keywords:
  - data export
  - CSV export
  - JSON export
  - analytics
  - data pipeline
  - ETL
  - Geode export
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Data Export Guide

This guide covers comprehensive strategies for exporting data from Geode to various formats including CSV, JSON/JSONL, and streaming exports for analytics pipelines. Learn how to perform selective exports, incremental exports, and handle large datasets efficiently.

## Overview

Geode supports multiple export methods:

| Method | Best For | Output Format |
|--------|----------|---------------|
| CSV Export | Spreadsheets, BI tools | Tabular data |
| JSON Export | APIs, web applications | Structured data |
| JSONL Export | Streaming, log processing | Line-delimited JSON |
| Streaming Export | Large datasets | Continuous stream |
| Incremental Export | Change tracking | Delta updates |

## Exporting to CSV

### Basic CSV Export

Export all nodes of a specific label to CSV format.

**GQL Query**:
```gql
MATCH (u:User)
RETURN u.id, u.name, u.email, u.age, u.city
ORDER BY u.id
```

### Multi-Language CSV Export Examples

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

    // Query data
    rows, err := db.QueryContext(ctx, `
        MATCH (u:User)
        RETURN u.id, u.name, u.email, u.age, u.city
        ORDER BY u.id
    `)
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    // Create CSV file
    file, err := os.Create("users_export.csv")
    if err != nil {
        log.Fatal(err)
    }
    defer file.Close()

    writer := csv.NewWriter(file)
    defer writer.Flush()

    // Write header
    writer.Write([]string{"id", "name", "email", "age", "city"})

    // Write rows
    rowCount := 0
    for rows.Next() {
        var id, age int
        var name, email, city string

        if err := rows.Scan(&id, &name, &email, &age, &city); err != nil {
            log.Printf("Error scanning row: %v", err)
            continue
        }

        writer.Write([]string{
            strconv.Itoa(id),
            name,
            email,
            strconv.Itoa(age),
            city,
        })
        rowCount++
    }

    log.Printf("Exported %d users to users_export.csv", rowCount)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import asyncio
import csv
from geode_client import Client

async def export_to_csv(filename: str):
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        # Query all users
        page, has_more = await conn.query("""
            MATCH (u:User)
            RETURN u.id, u.name, u.email, u.age, u.city
            ORDER BY u.id
        """)

        with open(filename, 'w', newline='') as file:
            writer = csv.writer(file)

            # Write header
            writer.writerow(['id', 'name', 'email', 'age', 'city'])

            # Write first page
            for row in page.rows:
                writer.writerow([
                    row['u.id'].as_int,
                    row['u.name'].as_string,
                    row['u.email'].as_string,
                    row['u.age'].as_int,
                    row['u.city'].as_string
                ])

            # Fetch remaining pages
            while has_more:
                page, has_more = await conn.pull()
                for row in page.rows:
                    writer.writerow([
                        row['u.id'].as_int,
                        row['u.name'].as_string,
                        row['u.email'].as_string,
                        row['u.age'].as_int,
                        row['u.city'].as_string
                    ])

        print(f"Exported to {filename}")

asyncio.run(export_to_csv("users_export.csv"))
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::Client;
use std::fs::File;
use std::io::Write;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    // Query data
    let (page, _) = conn.query(r#"
        MATCH (u:User)
        RETURN u.id, u.name, u.email, u.age, u.city
        ORDER BY u.id
    "#).await?;

    // Create CSV file
    let mut file = File::create("users_export.csv")?;

    // Write header
    writeln!(file, "id,name,email,age,city")?;

    // Write rows
    let mut count = 0;
    for row in &page.rows {
        let id = row.get("u.id").unwrap().as_int()?;
        let name = row.get("u.name").unwrap().as_string()?;
        let email = row.get("u.email").unwrap().as_string()?;
        let age = row.get("u.age").unwrap().as_int()?;
        let city = row.get("u.city").unwrap().as_string()?;

        // Escape CSV fields properly
        writeln!(file, "{},\"{}\",\"{}\",{},\"{}\"",
            id,
            name.replace("\"", "\"\""),
            email.replace("\"", "\"\""),
            age,
            city.replace("\"", "\"\"")
        )?;
        count += 1;
    }

    println!("Exported {} users to users_export.csv", count);
    Ok(())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { createClient } from '@geodedb/client';
import { createWriteStream } from 'fs';

async function exportToCSV(filename: string) {
    const client = await createClient('geode://localhost:3141');

    const writeStream = createWriteStream(filename);

    // Write header
    writeStream.write('id,name,email,age,city\n');

    // Query and stream results
    const rows = await client.queryAll(`
        MATCH (u:User)
        RETURN u.id, u.name, u.email, u.age, u.city
        ORDER BY u.id
    `);

    let count = 0;
    for (const row of rows) {
        const id = row.get('u.id')?.asNumber;
        const name = row.get('u.name')?.asString?.replace(/"/g, '""');
        const email = row.get('u.email')?.asString?.replace(/"/g, '""');
        const age = row.get('u.age')?.asNumber;
        const city = row.get('u.city')?.asString?.replace(/"/g, '""');

        writeStream.write(`${id},"${name}","${email}",${age},"${city}"\n`);
        count++;
    }

    writeStream.end();
    console.log(`Exported ${count} users to ${filename}`);

    await client.close();
}

exportToCSV('users_export.csv');
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
    try client.sendHello("csv-export", "1.0.0");
    _ = try client.receiveMessage(30000);

    // Query data
    try client.sendRunGql(1,
        \\MATCH (u:User)
        \\RETURN u.id, u.name, u.email, u.age, u.city
        \\ORDER BY u.id
    , null);
    _ = try client.receiveMessage(30000);

    // Pull results
    try client.sendPull(1, 10000);
    const result = try client.receiveMessage(30000);
    defer allocator.free(result);

    // Create output file
    const file = try std.fs.cwd().createFile("users_export.csv", .{});
    defer file.close();

    // Write header
    try file.writeAll("id,name,email,age,city\n");

    // Parse JSON result and write CSV rows
    const parsed = try std.json.parseFromSlice(std.json.Value, allocator, result, .{});
    defer parsed.deinit();

    if (parsed.value.object.get("rows")) |rows| {
        for (rows.array.items) |row| {
            // Extract fields and write CSV line
            const id = row.object.get("u.id").?.integer;
            const name = row.object.get("u.name").?.string;
            const email = row.object.get("u.email").?.string;
            const age = row.object.get("u.age").?.integer;
            const city = row.object.get("u.city").?.string;

            var buf: [1024]u8 = undefined;
            const line = try std.fmt.bufPrint(&buf, "{d},\"{s}\",\"{s}\",{d},\"{s}\"\n", .{
                id, name, email, age, city,
            });
            try file.writeAll(line);
        }
    }

    std.debug.print("Export complete\n", .{});
}
```
{{< /tab >}}
{{< /tabs >}}

### Exporting Relationships to CSV

Export relationships with their properties:

```gql
MATCH (u1:User)-[r:KNOWS]->(u2:User)
RETURN u1.id AS from_id,
       u2.id AS to_id,
       r.since AS since,
       r.strength AS strength
ORDER BY u1.id, u2.id
```

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
import csv
from geode_client import Client

async def export_relationships():
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        page, _ = await conn.query("""
            MATCH (u1:User)-[r:KNOWS]->(u2:User)
            RETURN u1.id AS from_id,
                   u2.id AS to_id,
                   r.since AS since,
                   r.strength AS strength
            ORDER BY u1.id, u2.id
        """)

        with open('relationships_export.csv', 'w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(['from_id', 'to_id', 'since', 'strength'])

            for row in page.rows:
                writer.writerow([
                    row['from_id'].as_int,
                    row['to_id'].as_int,
                    row['since'].as_string if row['since'] else '',
                    row['strength'].as_float if row['strength'] else ''
                ])

        print(f"Exported {len(page.rows)} relationships")

asyncio.run(export_relationships())
```
{{< /tab >}}
{{< /tabs >}}

## Exporting to JSON/JSONL

### Full JSON Export

Export data as a complete JSON document:

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
    Age   int      `json:"age"`
    City  string   `json:"city"`
    Tags  []string `json:"tags,omitempty"`
}

type ExportData struct {
    ExportedAt string `json:"exported_at"`
    Count      int    `json:"count"`
    Users      []User `json:"users"`
}

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()

    rows, err := db.QueryContext(ctx, `
        MATCH (u:User)
        RETURN u.id, u.name, u.email, u.age, u.city, u.tags
        ORDER BY u.id
    `)
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    var users []User
    for rows.Next() {
        var u User
        var tagsJSON string

        if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Age, &u.City, &tagsJSON); err != nil {
            continue
        }

        if tagsJSON != "" {
            json.Unmarshal([]byte(tagsJSON), &u.Tags)
        }

        users = append(users, u)
    }

    export := ExportData{
        ExportedAt: "2026-01-28T10:00:00Z",
        Count:      len(users),
        Users:      users,
    }

    file, _ := os.Create("users_export.json")
    defer file.Close()

    encoder := json.NewEncoder(file)
    encoder.SetIndent("", "  ")
    encoder.Encode(export)

    log.Printf("Exported %d users to users_export.json", len(users))
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import asyncio
import json
from datetime import datetime
from geode_client import Client

async def export_to_json(filename: str):
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        page, _ = await conn.query("""
            MATCH (u:User)
            RETURN u.id, u.name, u.email, u.age, u.city, u.tags
            ORDER BY u.id
        """)

        users = []
        for row in page.rows:
            user = {
                "id": row['u.id'].as_int,
                "name": row['u.name'].as_string,
                "email": row['u.email'].as_string,
                "age": row['u.age'].as_int,
                "city": row['u.city'].as_string,
            }

            # Handle optional tags
            if row.get('u.tags'):
                user["tags"] = row['u.tags'].as_list

            users.append(user)

        export_data = {
            "exported_at": datetime.utcnow().isoformat() + "Z",
            "count": len(users),
            "users": users
        }

        with open(filename, 'w') as f:
            json.dump(export_data, f, indent=2)

        print(f"Exported {len(users)} users to {filename}")

asyncio.run(export_to_json("users_export.json"))
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::Client;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;
use chrono::Utc;

#[derive(Serialize)]
struct User {
    id: i64,
    name: String,
    email: String,
    age: i64,
    city: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tags: Vec<String>,
}

#[derive(Serialize)]
struct ExportData {
    exported_at: String,
    count: usize,
    users: Vec<User>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    let (page, _) = conn.query(r#"
        MATCH (u:User)
        RETURN u.id, u.name, u.email, u.age, u.city, u.tags
        ORDER BY u.id
    "#).await?;

    let mut users = Vec::new();
    for row in &page.rows {
        let tags: Vec<String> = row.get("u.tags")
            .map(|v| v.as_list().unwrap_or_default()
                .iter()
                .map(|t| t.as_string().unwrap_or_default())
                .collect())
            .unwrap_or_default();

        users.push(User {
            id: row.get("u.id").unwrap().as_int()?,
            name: row.get("u.name").unwrap().as_string()?,
            email: row.get("u.email").unwrap().as_string()?,
            age: row.get("u.age").unwrap().as_int()?,
            city: row.get("u.city").unwrap().as_string()?,
            tags,
        });
    }

    let export = ExportData {
        exported_at: Utc::now().to_rfc3339(),
        count: users.len(),
        users,
    };

    let mut file = File::create("users_export.json")?;
    let json = serde_json::to_string_pretty(&export)?;
    file.write_all(json.as_bytes())?;

    println!("Exported {} users", export.count);
    Ok(())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { createClient } from '@geodedb/client';
import { writeFileSync } from 'fs';

interface User {
    id: number;
    name: string;
    email: string;
    age: number;
    city: string;
    tags?: string[];
}

interface ExportData {
    exported_at: string;
    count: number;
    users: User[];
}

async function exportToJSON(filename: string) {
    const client = await createClient('geode://localhost:3141');

    const rows = await client.queryAll(`
        MATCH (u:User)
        RETURN u.id, u.name, u.email, u.age, u.city, u.tags
        ORDER BY u.id
    `);

    const users: User[] = [];
    for (const row of rows) {
        const user: User = {
            id: row.get('u.id')?.asNumber!,
            name: row.get('u.name')?.asString!,
            email: row.get('u.email')?.asString!,
            age: row.get('u.age')?.asNumber!,
            city: row.get('u.city')?.asString!,
        };

        const tags = row.get('u.tags')?.asList;
        if (tags && tags.length > 0) {
            user.tags = tags;
        }

        users.push(user);
    }

    const exportData: ExportData = {
        exported_at: new Date().toISOString(),
        count: users.length,
        users,
    };

    writeFileSync(filename, JSON.stringify(exportData, null, 2));
    console.log(`Exported ${users.length} users to ${filename}`);

    await client.close();
}

exportToJSON('users_export.json');
```
{{< /tab >}}
{{< /tabs >}}

### JSONL Export (Streaming)

JSONL format is ideal for streaming large datasets:

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
import json
from geode_client import Client

async def export_to_jsonl(filename: str, batch_size: int = 1000):
    """Export data to JSONL format with streaming."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        total_exported = 0

        with open(filename, 'w') as file:
            # Query with pagination
            page, has_more = await conn.query(
                """
                MATCH (u:User)
                RETURN u.id, u.name, u.email, u.age, u.city
                ORDER BY u.id
                """,
                fetch_size=batch_size
            )

            while True:
                # Write current page
                for row in page.rows:
                    record = {
                        "id": row['u.id'].as_int,
                        "name": row['u.name'].as_string,
                        "email": row['u.email'].as_string,
                        "age": row['u.age'].as_int,
                        "city": row['u.city'].as_string
                    }
                    file.write(json.dumps(record) + '\n')
                    total_exported += 1

                if not has_more:
                    break

                # Fetch next page
                page, has_more = await conn.pull(batch_size)

                if total_exported % 10000 == 0:
                    print(f"Exported {total_exported} records...")

        print(f"Total exported: {total_exported} records to {filename}")

asyncio.run(export_to_jsonl("users_export.jsonl"))
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

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()

    rows, err := db.QueryContext(ctx, `
        MATCH (u:User)
        RETURN u.id, u.name, u.email, u.age, u.city
        ORDER BY u.id
    `)
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    file, _ := os.Create("users_export.jsonl")
    defer file.Close()

    writer := bufio.NewWriter(file)
    defer writer.Flush()

    count := 0
    for rows.Next() {
        var id, age int
        var name, email, city string

        rows.Scan(&id, &name, &email, &age, &city)

        record := map[string]interface{}{
            "id":    id,
            "name":  name,
            "email": email,
            "age":   age,
            "city":  city,
        }

        jsonLine, _ := json.Marshal(record)
        writer.Write(jsonLine)
        writer.WriteString("\n")
        count++

        if count%10000 == 0 {
            writer.Flush()
            log.Printf("Exported %d records...", count)
        }
    }

    log.Printf("Total exported: %d records", count)
}
```
{{< /tab >}}
{{< /tabs >}}

## Selective Exports with Queries

### Filtering by Properties

```gql
// Export users from a specific city
MATCH (u:User)
WHERE u.city = "New York"
RETURN u.id, u.name, u.email

// Export users within age range
MATCH (u:User)
WHERE u.age >= 25 AND u.age <= 35
RETURN u.id, u.name, u.age

// Export users with specific tags
MATCH (u:User)
WHERE "developer" IN u.tags
RETURN u.id, u.name, u.tags
```

### Exporting Graph Subsets

```gql
// Export users and their immediate friends
MATCH (u:User)-[:KNOWS]->(friend:User)
WHERE u.city = "San Francisco"
RETURN u.id AS user_id,
       u.name AS user_name,
       collect(friend.name) AS friends

// Export 2-hop network
MATCH path = (u:User {name: "Alice"})-[:KNOWS*1..2]->(connected:User)
RETURN DISTINCT connected.id, connected.name, length(path) AS distance
```

### Complex Filtering Example

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
import json
from geode_client import Client
from datetime import datetime, timedelta

async def export_active_users(days: int = 30):
    """Export users active in the last N days."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

    async with client.connection() as conn:
        page, _ = await conn.query(
            """
            MATCH (u:User)
            WHERE u.last_active > $cutoff
            RETURN u.id, u.name, u.email, u.last_active
            ORDER BY u.last_active DESC
            """,
            {"cutoff": cutoff_date}
        )

        users = []
        for row in page.rows:
            users.append({
                "id": row['u.id'].as_int,
                "name": row['u.name'].as_string,
                "email": row['u.email'].as_string,
                "last_active": row['u.last_active'].as_string
            })

        with open(f"active_users_{days}d.json", 'w') as f:
            json.dump({
                "exported_at": datetime.utcnow().isoformat(),
                "filter": f"active in last {days} days",
                "count": len(users),
                "users": users
            }, f, indent=2)

        print(f"Exported {len(users)} active users")

asyncio.run(export_active_users(30))
```
{{< /tab >}}
{{< /tabs >}}

## Incremental Exports

### Timestamp-Based Incremental Export

Track changes using timestamp columns:

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
import json
from datetime import datetime
from geode_client import Client

class IncrementalExporter:
    def __init__(self, state_file: str = "export_state.json"):
        self.state_file = state_file
        self.state = self._load_state()

    def _load_state(self) -> dict:
        try:
            with open(self.state_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"last_export": "1970-01-01T00:00:00Z"}

    def _save_state(self):
        with open(self.state_file, 'w') as f:
            json.dump(self.state, f)

    async def export_changes(self, output_file: str):
        """Export records changed since last export."""
        client = Client(host="localhost", port=3141, skip_verify=True)

        async with client.connection() as conn:
            page, _ = await conn.query(
                """
                MATCH (u:User)
                WHERE u.updated_at > $since
                RETURN u.id, u.name, u.email, u.updated_at
                ORDER BY u.updated_at
                """,
                {"since": self.state["last_export"]}
            )

            if not page.rows:
                print("No changes since last export")
                return

            changes = []
            latest_timestamp = self.state["last_export"]

            for row in page.rows:
                updated_at = row['u.updated_at'].as_string

                changes.append({
                    "id": row['u.id'].as_int,
                    "name": row['u.name'].as_string,
                    "email": row['u.email'].as_string,
                    "updated_at": updated_at
                })

                if updated_at > latest_timestamp:
                    latest_timestamp = updated_at

            # Write changes
            with open(output_file, 'w') as f:
                json.dump({
                    "export_type": "incremental",
                    "since": self.state["last_export"],
                    "until": latest_timestamp,
                    "count": len(changes),
                    "changes": changes
                }, f, indent=2)

            # Update state
            self.state["last_export"] = latest_timestamp
            self._save_state()

            print(f"Exported {len(changes)} changed records")

async def main():
    exporter = IncrementalExporter()
    await exporter.export_changes("incremental_export.json")

asyncio.run(main())
```
{{< /tab >}}
{{< tab "Go" >}}
```go
package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "log"
    "os"
    "time"

    _ "geodedb.com/geode"
)

type ExportState struct {
    LastExport string `json:"last_export"`
}

type Change struct {
    ID        int    `json:"id"`
    Name      string `json:"name"`
    Email     string `json:"email"`
    UpdatedAt string `json:"updated_at"`
}

func loadState(filename string) ExportState {
    data, err := os.ReadFile(filename)
    if err != nil {
        return ExportState{LastExport: "1970-01-01T00:00:00Z"}
    }
    var state ExportState
    json.Unmarshal(data, &state)
    return state
}

func saveState(filename string, state ExportState) {
    data, _ := json.Marshal(state)
    os.WriteFile(filename, data, 0644)
}

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()
    state := loadState("export_state.json")

    rows, err := db.QueryContext(ctx, `
        MATCH (u:User)
        WHERE u.updated_at > ?
        RETURN u.id, u.name, u.email, u.updated_at
        ORDER BY u.updated_at
    `, state.LastExport)
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    var changes []Change
    var latestTimestamp string = state.LastExport

    for rows.Next() {
        var c Change
        rows.Scan(&c.ID, &c.Name, &c.Email, &c.UpdatedAt)
        changes = append(changes, c)

        if c.UpdatedAt > latestTimestamp {
            latestTimestamp = c.UpdatedAt
        }
    }

    if len(changes) == 0 {
        log.Println("No changes since last export")
        return
    }

    export := map[string]interface{}{
        "export_type": "incremental",
        "since":       state.LastExport,
        "until":       latestTimestamp,
        "count":       len(changes),
        "changes":     changes,
    }

    file, _ := os.Create("incremental_export.json")
    defer file.Close()
    json.NewEncoder(file).Encode(export)

    state.LastExport = latestTimestamp
    saveState("export_state.json", state)

    log.Printf("Exported %d changed records", len(changes))
}
```
{{< /tab >}}
{{< /tabs >}}

### Change Data Capture Pattern

```python
import asyncio
import json
from datetime import datetime
from geode_client import Client

async def capture_changes():
    """Capture and export changes with operation type."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        # Query change log (assuming you have a change tracking mechanism)
        page, _ = await conn.query("""
            MATCH (c:ChangeLog)
            WHERE c.timestamp > $since
            RETURN c.operation, c.entity_type, c.entity_id,
                   c.old_values, c.new_values, c.timestamp
            ORDER BY c.timestamp
        """, {"since": "2026-01-27T00:00:00Z"})

        changes = []
        for row in page.rows:
            changes.append({
                "operation": row['c.operation'].as_string,  # CREATE, UPDATE, DELETE
                "entity_type": row['c.entity_type'].as_string,
                "entity_id": row['c.entity_id'].as_int,
                "old_values": json.loads(row['c.old_values'].as_string) if row['c.old_values'] else None,
                "new_values": json.loads(row['c.new_values'].as_string) if row['c.new_values'] else None,
                "timestamp": row['c.timestamp'].as_string
            })

        with open('cdc_export.jsonl', 'w') as f:
            for change in changes:
                f.write(json.dumps(change) + '\n')

        print(f"Captured {len(changes)} changes")

asyncio.run(capture_changes())
```

## Streaming Large Datasets

### Paginated Export

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
import json
from geode_client import Client

async def stream_export(output_file: str, page_size: int = 10000):
    """Stream large dataset export with pagination."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        total_exported = 0
        offset = 0

        with open(output_file, 'w') as f:
            while True:
                page, _ = await conn.query(
                    """
                    MATCH (u:User)
                    RETURN u.id, u.name, u.email, u.age
                    ORDER BY u.id
                    SKIP $offset
                    LIMIT $limit
                    """,
                    {"offset": offset, "limit": page_size}
                )

                if not page.rows:
                    break

                for row in page.rows:
                    record = {
                        "id": row['u.id'].as_int,
                        "name": row['u.name'].as_string,
                        "email": row['u.email'].as_string,
                        "age": row['u.age'].as_int
                    }
                    f.write(json.dumps(record) + '\n')

                total_exported += len(page.rows)
                offset += page_size

                print(f"Exported {total_exported} records...")

                # Break if we got fewer records than page size
                if len(page.rows) < page_size:
                    break

        print(f"Stream export complete: {total_exported} total records")

asyncio.run(stream_export("large_export.jsonl"))
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

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()

    file, _ := os.Create("large_export.jsonl")
    defer file.Close()
    writer := bufio.NewWriter(file)
    defer writer.Flush()

    pageSize := 10000
    offset := 0
    totalExported := 0

    for {
        rows, err := db.QueryContext(ctx, `
            MATCH (u:User)
            RETURN u.id, u.name, u.email, u.age
            ORDER BY u.id
            SKIP ?
            LIMIT ?
        `, offset, pageSize)
        if err != nil {
            log.Fatal(err)
        }

        count := 0
        for rows.Next() {
            var id, age int
            var name, email string
            rows.Scan(&id, &name, &email, &age)

            record := map[string]interface{}{
                "id":    id,
                "name":  name,
                "email": email,
                "age":   age,
            }

            jsonLine, _ := json.Marshal(record)
            writer.Write(jsonLine)
            writer.WriteString("\n")
            count++
        }
        rows.Close()

        totalExported += count
        log.Printf("Exported %d records...", totalExported)

        if count < pageSize {
            break
        }
        offset += pageSize
    }

    log.Printf("Stream export complete: %d total records", totalExported)
}
```
{{< /tab >}}
{{< /tabs >}}

### Cursor-Based Export

For very large datasets, use cursor-based pagination:

```python
import asyncio
import json
from geode_client import Client

async def cursor_export(output_file: str, batch_size: int = 10000):
    """Export using cursor-based pagination for better performance."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        last_id = 0
        total = 0

        with open(output_file, 'w') as f:
            while True:
                page, _ = await conn.query(
                    """
                    MATCH (u:User)
                    WHERE u.id > $last_id
                    RETURN u.id, u.name, u.email
                    ORDER BY u.id
                    LIMIT $limit
                    """,
                    {"last_id": last_id, "limit": batch_size}
                )

                if not page.rows:
                    break

                for row in page.rows:
                    record = {
                        "id": row['u.id'].as_int,
                        "name": row['u.name'].as_string,
                        "email": row['u.email'].as_string
                    }
                    f.write(json.dumps(record) + '\n')
                    last_id = record['id']

                total += len(page.rows)
                print(f"Exported {total} records (last_id: {last_id})")

        print(f"Export complete: {total} records")

asyncio.run(cursor_export("cursor_export.jsonl"))
```

## Export for Analytics Pipelines

### Apache Parquet Export

For analytics workloads, export to Parquet format:

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
import pyarrow as pa
import pyarrow.parquet as pq
from geode_client import Client

async def export_to_parquet(output_file: str):
    """Export data to Apache Parquet format for analytics."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        page, _ = await conn.query("""
            MATCH (u:User)
            RETURN u.id, u.name, u.email, u.age, u.city, u.created_at
            ORDER BY u.id
        """)

        # Collect data
        ids = []
        names = []
        emails = []
        ages = []
        cities = []
        created_ats = []

        for row in page.rows:
            ids.append(row['u.id'].as_int)
            names.append(row['u.name'].as_string)
            emails.append(row['u.email'].as_string)
            ages.append(row['u.age'].as_int)
            cities.append(row['u.city'].as_string)
            created_ats.append(row['u.created_at'].as_string)

        # Create PyArrow table
        table = pa.table({
            'id': pa.array(ids, type=pa.int64()),
            'name': pa.array(names, type=pa.string()),
            'email': pa.array(emails, type=pa.string()),
            'age': pa.array(ages, type=pa.int32()),
            'city': pa.array(cities, type=pa.string()),
            'created_at': pa.array(created_ats, type=pa.string())
        })

        # Write to Parquet
        pq.write_table(table, output_file, compression='snappy')

        print(f"Exported {len(ids)} records to {output_file}")

asyncio.run(export_to_parquet("users.parquet"))
```
{{< /tab >}}
{{< /tabs >}}

### Data Lake Export

Export data partitioned by date for data lake ingestion:

```python
import asyncio
import json
import os
from datetime import datetime, timedelta
from geode_client import Client

async def export_partitioned(base_path: str, start_date: str, end_date: str):
    """Export data partitioned by date for data lake."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)
    current = start

    async with client.connection() as conn:
        while current <= end:
            date_str = current.strftime("%Y-%m-%d")
            next_date = current + timedelta(days=1)

            page, _ = await conn.query(
                """
                MATCH (e:Event)
                WHERE e.timestamp >= $start AND e.timestamp < $end
                RETURN e.id, e.type, e.user_id, e.timestamp, e.data
                ORDER BY e.timestamp
                """,
                {
                    "start": current.isoformat(),
                    "end": next_date.isoformat()
                }
            )

            if page.rows:
                # Create partition directory
                partition_path = os.path.join(
                    base_path,
                    f"year={current.year}",
                    f"month={current.month:02d}",
                    f"day={current.day:02d}"
                )
                os.makedirs(partition_path, exist_ok=True)

                # Write data
                output_file = os.path.join(partition_path, "events.jsonl")
                with open(output_file, 'w') as f:
                    for row in page.rows:
                        record = {
                            "id": row['e.id'].as_int,
                            "type": row['e.type'].as_string,
                            "user_id": row['e.user_id'].as_int,
                            "timestamp": row['e.timestamp'].as_string,
                            "data": row['e.data'].as_string
                        }
                        f.write(json.dumps(record) + '\n')

                print(f"Exported {len(page.rows)} events for {date_str}")

            current = next_date

asyncio.run(export_partitioned(
    "/data/events",
    "2026-01-01",
    "2026-01-28"
))
```

### Streaming to Message Queue

```python
import asyncio
import json
from geode_client import Client
# from kafka import KafkaProducer  # Uncomment for actual Kafka usage

async def export_to_kafka(topic: str):
    """Stream export to Kafka for real-time analytics."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    # producer = KafkaProducer(
    #     bootstrap_servers=['localhost:9092'],
    #     value_serializer=lambda v: json.dumps(v).encode('utf-8')
    # )

    async with client.connection() as conn:
        page, has_more = await conn.query(
            """
            MATCH (u:User)
            RETURN u.id, u.name, u.email, u.updated_at
            ORDER BY u.updated_at DESC
            """,
            fetch_size=1000
        )

        total = 0
        while True:
            for row in page.rows:
                message = {
                    "id": row['u.id'].as_int,
                    "name": row['u.name'].as_string,
                    "email": row['u.email'].as_string,
                    "updated_at": row['u.updated_at'].as_string
                }

                # producer.send(topic, value=message, key=str(message['id']).encode())
                print(f"Would send to Kafka: {message}")  # Demo output
                total += 1

            if not has_more:
                break

            page, has_more = await conn.pull(1000)

        # producer.flush()
        print(f"Streamed {total} records to Kafka topic '{topic}'")

asyncio.run(export_to_kafka("user-updates"))
```

## Export Utilities

### Export Progress Tracking

```python
import asyncio
import json
import time
from geode_client import Client

class ExportProgress:
    def __init__(self, total_estimate: int = None):
        self.total_estimate = total_estimate
        self.exported = 0
        self.start_time = time.time()

    def update(self, count: int):
        self.exported += count
        elapsed = time.time() - self.start_time
        rate = self.exported / elapsed if elapsed > 0 else 0

        if self.total_estimate:
            pct = (self.exported / self.total_estimate) * 100
            eta = (self.total_estimate - self.exported) / rate if rate > 0 else 0
            print(f"\rExported: {self.exported:,} / {self.total_estimate:,} "
                  f"({pct:.1f}%) | Rate: {rate:.0f}/s | ETA: {eta:.0f}s", end='')
        else:
            print(f"\rExported: {self.exported:,} | Rate: {rate:.0f}/s", end='')

    def finish(self):
        elapsed = time.time() - self.start_time
        rate = self.exported / elapsed if elapsed > 0 else 0
        print(f"\nExport complete: {self.exported:,} records in {elapsed:.1f}s ({rate:.0f}/s)")

async def export_with_progress(output_file: str):
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        # Get total count estimate
        count_result, _ = await conn.query("MATCH (u:User) RETURN count(u) AS total")
        total = count_result.rows[0]['total'].as_int if count_result.rows else None

        progress = ExportProgress(total)

        with open(output_file, 'w') as f:
            page, has_more = await conn.query(
                "MATCH (u:User) RETURN u.id, u.name, u.email ORDER BY u.id",
                fetch_size=5000
            )

            while True:
                for row in page.rows:
                    f.write(json.dumps({
                        "id": row['u.id'].as_int,
                        "name": row['u.name'].as_string,
                        "email": row['u.email'].as_string
                    }) + '\n')

                progress.update(len(page.rows))

                if not has_more:
                    break

                page, has_more = await conn.pull(5000)

        progress.finish()

asyncio.run(export_with_progress("export_with_progress.jsonl"))
```

### Export Validation

```python
import asyncio
import json
from geode_client import Client

async def validate_export(export_file: str):
    """Validate exported data against source."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    # Read export file
    exported_ids = set()
    with open(export_file, 'r') as f:
        for line in f:
            record = json.loads(line)
            exported_ids.add(record['id'])

    print(f"Exported records: {len(exported_ids)}")

    # Compare with source
    async with client.connection() as conn:
        page, _ = await conn.query("MATCH (u:User) RETURN u.id")

        source_ids = {row['u.id'].as_int for row in page.rows}

        print(f"Source records: {len(source_ids)}")

        missing = source_ids - exported_ids
        extra = exported_ids - source_ids

        if missing:
            print(f"Missing from export: {len(missing)} records")
            print(f"  Sample: {list(missing)[:10]}")

        if extra:
            print(f"Extra in export: {len(extra)} records")
            print(f"  Sample: {list(extra)[:10]}")

        if not missing and not extra:
            print("Validation passed: Export matches source")

asyncio.run(validate_export("users_export.jsonl"))
```

## Next Steps

- [Data Import Guide](/guides/data-import/) - Import data into Geode
- [Backup and Restore Guide](/guides/backup-restore/) - Protect your data
- [Performance Guide](/docs/performance/) - Optimize query performance
- [Graph Modeling Guide](/guides/graph-modeling/) - Design effective schemas

## Resources

- [GQL Reference](/docs/gql-reference/)
- [Client Libraries](/clients/)
- [API Reference](/docs/api-reference/)
- [Community Forum](https://forum.geodedb.com)

---

**Questions?** Discuss data export strategies in our [forum](https://forum.geodedb.com).
