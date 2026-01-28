---
title: "Fraud Detection Guide"
slug: "fraud-detection"
description: "Detect fraudulent patterns and anomalies using Geode's graph analysis capabilities"
weight: 63
tags: ["fraud-detection", "anomaly-detection", "risk-scoring", "compliance", "security"]
categories: ["guides", "use-cases"]
keywords:
  - fraud detection
  - anomaly detection
  - graph patterns
  - risk scoring
  - financial fraud
  - Geode fraud analysis
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Fraud Detection Guide

This guide demonstrates how to use Geode for fraud detection. You'll learn to model fraud-relevant data, identify suspicious patterns, score risk in real-time, and build investigation workflows.

## Overview

Graph databases excel at fraud detection because fraudulent activity often involves hidden relationships and patterns that are difficult to detect in traditional databases:

- **Account networks** - Fraudsters share devices, addresses, or payment methods
- **Transaction rings** - Money laundering through circular transactions
- **Identity fraud** - Multiple identities with shared attributes
- **Collusion patterns** - Coordinated fraudulent behavior

Geode's graph traversal capabilities make it easy to uncover these patterns in real-time.

## Data Model

### Core Entities

```gql
// User accounts
(:Account {
  id: STRING,
  email: STRING,
  phone: STRING,
  created_at: TIMESTAMP,
  status: STRING,          // "active", "suspended", "flagged"
  risk_score: FLOAT,
  last_activity: TIMESTAMP,
  verification_level: STRING
})

// Personal identity information
(:Identity {
  id: STRING,
  ssn_hash: STRING,        // Hashed SSN
  name: STRING,
  date_of_birth: DATE,
  address_hash: STRING
})

// Devices used for access
(:Device {
  id: STRING,
  fingerprint: STRING,
  device_type: STRING,
  os: STRING,
  browser: STRING,
  first_seen: TIMESTAMP,
  last_seen: TIMESTAMP,
  risk_score: FLOAT
})

// IP Addresses
(:IPAddress {
  ip: STRING,
  asn: STRING,
  country: STRING,
  city: STRING,
  is_proxy: BOOLEAN,
  is_vpn: BOOLEAN,
  is_tor: BOOLEAN,
  risk_score: FLOAT
})

// Payment methods
(:PaymentMethod {
  id: STRING,
  type: STRING,            // "credit_card", "bank_account", "crypto"
  last_four: STRING,
  bin: STRING,             // Bank identification number
  issuer: STRING,
  country: STRING,
  created_at: TIMESTAMP,
  risk_score: FLOAT
})

// Transactions
(:Transaction {
  id: STRING,
  amount: FLOAT,
  currency: STRING,
  type: STRING,            // "purchase", "transfer", "withdrawal"
  status: STRING,          // "pending", "completed", "failed", "flagged"
  timestamp: TIMESTAMP,
  risk_score: FLOAT,
  fraud_flags: LIST<STRING>
})

// Merchants
(:Merchant {
  id: STRING,
  name: STRING,
  category: STRING,
  risk_category: STRING,
  country: STRING
})

// Fraud cases
(:FraudCase {
  id: STRING,
  type: STRING,
  status: STRING,          // "open", "investigating", "confirmed", "closed"
  created_at: TIMESTAMP,
  resolved_at: TIMESTAMP,
  amount_at_risk: FLOAT,
  investigator: STRING
})
```

### Relationship Types

```gql
// Account relationships
(:Account)-[:HAS_IDENTITY]->(:Identity)
(:Account)-[:USES_DEVICE {first_used: TIMESTAMP, last_used: TIMESTAMP, count: INTEGER}]->(:Device)
(:Account)-[:LOGGED_IN_FROM {timestamp: TIMESTAMP}]->(:IPAddress)
(:Account)-[:HAS_PAYMENT_METHOD {added_at: TIMESTAMP}]->(:PaymentMethod)
(:Account)-[:REFERRED_BY]->(:Account)

// Transaction relationships
(:Account)-[:INITIATED {timestamp: TIMESTAMP}]->(:Transaction)
(:Transaction)-[:PAID_TO]->(:Account)
(:Transaction)-[:USED {timestamp: TIMESTAMP}]->(:PaymentMethod)
(:Transaction)-[:FROM_IP]->(:IPAddress)
(:Transaction)-[:FROM_DEVICE]->(:Device)
(:Transaction)-[:AT]->(:Merchant)

// Fraud relationships
(:Account)-[:FLAGGED_IN]->(:FraudCase)
(:Transaction)-[:FLAGGED_IN]->(:FraudCase)
(:FraudCase)-[:RELATED_TO]->(:FraudCase)
```

### Schema Setup

```gql
// Constraints
CREATE CONSTRAINT account_id_unique ON :Account(id) ASSERT UNIQUE
CREATE CONSTRAINT account_email_unique ON :Account(email) ASSERT UNIQUE
CREATE CONSTRAINT device_id_unique ON :Device(id) ASSERT UNIQUE
CREATE CONSTRAINT device_fingerprint_unique ON :Device(fingerprint) ASSERT UNIQUE
CREATE CONSTRAINT transaction_id_unique ON :Transaction(id) ASSERT UNIQUE
CREATE CONSTRAINT payment_method_id_unique ON :PaymentMethod(id) ASSERT UNIQUE

// Indexes for fraud queries
CREATE INDEX account_risk ON :Account(risk_score)
CREATE INDEX account_status ON :Account(status)
CREATE INDEX device_risk ON :Device(risk_score)
CREATE INDEX device_fingerprint ON :Device(fingerprint)
CREATE INDEX ip_address ON :IPAddress(ip)
CREATE INDEX transaction_timestamp ON :Transaction(timestamp)
CREATE INDEX transaction_risk ON :Transaction(risk_score)
CREATE INDEX identity_ssn ON :Identity(ssn_hash)
```

## Fraud Graph Patterns

### Pattern 1: Shared Device Network

Multiple accounts using the same device is a strong fraud indicator.

```gql
// Find accounts sharing devices
MATCH (device:Device)<-[:USES_DEVICE]-(account:Account)
WITH device, collect(account) AS accounts, count(account) AS account_count
WHERE account_count > 1
RETURN
  device.fingerprint AS device,
  device.device_type AS type,
  account_count,
  [a IN accounts | a.email] AS accounts,
  [a IN accounts | a.risk_score] AS risk_scores
ORDER BY account_count DESC
LIMIT 20
```

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

type SharedDeviceAlert struct {
    DeviceFingerprint string
    DeviceType        string
    AccountCount      int
    Accounts          []string
    RiskScores        []float64
}

func FindSharedDevices(ctx context.Context, db *sql.DB, minAccounts int) ([]SharedDeviceAlert, error) {
    rows, err := db.QueryContext(ctx, `
        MATCH (device:Device)<-[:USES_DEVICE]-(account:Account)
        WITH device, collect(account) AS accounts, count(account) AS account_count
        WHERE account_count > ?
        RETURN
            device.fingerprint AS device_fingerprint,
            device.device_type AS device_type,
            account_count,
            [a IN accounts | a.email] AS account_emails,
            [a IN accounts | a.risk_score] AS risk_scores
        ORDER BY account_count DESC
        LIMIT 100
    `, minAccounts)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var alerts []SharedDeviceAlert
    for rows.Next() {
        var alert SharedDeviceAlert
        err := rows.Scan(
            &alert.DeviceFingerprint,
            &alert.DeviceType,
            &alert.AccountCount,
            &alert.Accounts,
            &alert.RiskScores,
        )
        if err != nil {
            return nil, err
        }
        alerts = append(alerts, alert)
    }

    return alerts, nil
}

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()
    alerts, err := FindSharedDevices(ctx, db, 2)
    if err != nil {
        log.Fatal(err)
    }

    for _, alert := range alerts {
        log.Printf("Device %s shared by %d accounts: %v",
            alert.DeviceFingerprint, alert.AccountCount, alert.Accounts)
    }
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import asyncio
from dataclasses import dataclass
from typing import List
from geode_client import Client

@dataclass
class SharedDeviceAlert:
    device_fingerprint: str
    device_type: str
    account_count: int
    accounts: List[str]
    risk_scores: List[float]

async def find_shared_devices(
    client,
    min_accounts: int = 2
) -> List[SharedDeviceAlert]:
    """Find devices shared by multiple accounts."""
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (device:Device)<-[:USES_DEVICE]-(account:Account)
            WITH device, collect(account) AS accounts, count(account) AS account_count
            WHERE account_count > $min_accounts
            RETURN
                device.fingerprint AS device_fingerprint,
                device.device_type AS device_type,
                account_count,
                [a IN accounts | a.email] AS account_emails,
                [a IN accounts | a.risk_score] AS risk_scores
            ORDER BY account_count DESC
            LIMIT 100
        """, {"min_accounts": min_accounts})

        return [
            SharedDeviceAlert(
                device_fingerprint=row['device_fingerprint'].as_string,
                device_type=row['device_type'].as_string,
                account_count=row['account_count'].as_int,
                accounts=row['account_emails'].as_list,
                risk_scores=row['risk_scores'].as_list
            )
            for row in result.rows
        ]

async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)
    alerts = await find_shared_devices(client, min_accounts=2)

    for alert in alerts:
        print(f"Device {alert.device_fingerprint} shared by {alert.account_count} accounts:")
        for account in alert.accounts:
            print(f"  - {account}")

asyncio.run(main())
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::{Client, Value};
use std::collections::HashMap;

#[derive(Debug)]
struct SharedDeviceAlert {
    device_fingerprint: String,
    device_type: String,
    account_count: i64,
    accounts: Vec<String>,
    risk_scores: Vec<f64>,
}

async fn find_shared_devices(
    conn: &mut geode_client::Connection,
    min_accounts: i64,
) -> Result<Vec<SharedDeviceAlert>, Box<dyn std::error::Error>> {
    let mut params = HashMap::new();
    params.insert("min_accounts".to_string(), Value::int(min_accounts));

    let (page, _) = conn.query_with_params(r#"
        MATCH (device:Device)<-[:USES_DEVICE]-(account:Account)
        WITH device, collect(account) AS accounts, count(account) AS account_count
        WHERE account_count > $min_accounts
        RETURN
            device.fingerprint AS device_fingerprint,
            device.device_type AS device_type,
            account_count,
            [a IN accounts | a.email] AS account_emails,
            [a IN accounts | a.risk_score] AS risk_scores
        ORDER BY account_count DESC
        LIMIT 100
    "#, &params).await?;

    let mut alerts = Vec::new();
    for row in &page.rows {
        alerts.push(SharedDeviceAlert {
            device_fingerprint: row.get("device_fingerprint").unwrap().as_string()?,
            device_type: row.get("device_type").unwrap().as_string()?,
            account_count: row.get("account_count").unwrap().as_int()?,
            accounts: row.get("account_emails").unwrap().as_string_list()?,
            risk_scores: row.get("risk_scores").unwrap().as_float_list()?,
        });
    }

    Ok(alerts)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    let alerts = find_shared_devices(&mut conn, 2).await?;

    for alert in alerts {
        println!("Device {} shared by {} accounts: {:?}",
            alert.device_fingerprint, alert.account_count, alert.accounts);
    }

    Ok(())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { createClient, Client } from '@geodedb/client';

interface SharedDeviceAlert {
  deviceFingerprint: string;
  deviceType: string;
  accountCount: number;
  accounts: string[];
  riskScores: number[];
}

async function findSharedDevices(
  client: Client,
  minAccounts: number = 2
): Promise<SharedDeviceAlert[]> {
  const rows = await client.queryAll(`
    MATCH (device:Device)<-[:USES_DEVICE]-(account:Account)
    WITH device, collect(account) AS accounts, count(account) AS account_count
    WHERE account_count > $min_accounts
    RETURN
      device.fingerprint AS device_fingerprint,
      device.device_type AS device_type,
      account_count,
      [a IN accounts | a.email] AS account_emails,
      [a IN accounts | a.risk_score] AS risk_scores
    ORDER BY account_count DESC
    LIMIT 100
  `, { params: { min_accounts: minAccounts } });

  return rows.map(row => ({
    deviceFingerprint: row.get('device_fingerprint')?.asString ?? '',
    deviceType: row.get('device_type')?.asString ?? '',
    accountCount: row.get('account_count')?.asNumber ?? 0,
    accounts: row.get('account_emails')?.asList?.map(v => v.asString ?? '') ?? [],
    riskScores: row.get('risk_scores')?.asList?.map(v => v.asNumber ?? 0) ?? [],
  }));
}

async function main() {
  const client = await createClient('geode://localhost:3141');

  const alerts = await findSharedDevices(client, 2);

  for (const alert of alerts) {
    console.log(`Device ${alert.deviceFingerprint} shared by ${alert.accountCount} accounts:`);
    alert.accounts.forEach(account => console.log(`  - ${account}`));
  }

  await client.close();
}

main();
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const geode = @import("geode_client");

const SharedDeviceAlert = struct {
    device_fingerprint: []const u8,
    device_type: []const u8,
    account_count: i64,
    accounts: std.ArrayList([]const u8),
    risk_scores: std.ArrayList(f64),
};

pub fn findSharedDevices(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
    min_accounts: i64,
) !std.ArrayList(SharedDeviceAlert) {
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("min_accounts", .{ .integer = min_accounts });

    try client.sendRunGql(1,
        \\MATCH (device:Device)<-[:USES_DEVICE]-(account:Account)
        \\WITH device, collect(account) AS accounts, count(account) AS account_count
        \\WHERE account_count > $min_accounts
        \\RETURN
        \\    device.fingerprint AS device_fingerprint,
        \\    device.device_type AS device_type,
        \\    account_count,
        \\    [a IN accounts | a.email] AS account_emails,
        \\    [a IN accounts | a.risk_score] AS risk_scores
        \\ORDER BY account_count DESC
        \\LIMIT 100
    , .{ .object = params });

    _ = try client.receiveMessage(30000);
    try client.sendPull(1, 1000);
    const result = try client.receiveMessage(30000);
    defer allocator.free(result);

    var alerts = std.ArrayList(SharedDeviceAlert).init(allocator);
    // Parse result and populate alerts
    return alerts;
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.sendHello("fraud-detection", "1.0.0");
    _ = try client.receiveMessage(30000);

    const alerts = try findSharedDevices(&client, allocator, 2);
    defer alerts.deinit();

    for (alerts.items) |alert| {
        std.debug.print("Device {s} shared by {d} accounts\n", .{
            alert.device_fingerprint,
            alert.account_count,
        });
    }
}
```
{{< /tab >}}
{{< /tabs >}}

### Pattern 2: Transaction Rings

Circular transaction patterns often indicate money laundering.

```gql
// Find circular transaction patterns (money laundering rings)
MATCH ring = (start:Account)-[:INITIATED]->(:Transaction)-[:PAID_TO]->
             (a2:Account)-[:INITIATED]->(:Transaction)-[:PAID_TO]->
             (a3:Account)-[:INITIATED]->(:Transaction)-[:PAID_TO]->(start)
WHERE start <> a2 AND start <> a3 AND a2 <> a3
RETURN
  [n IN nodes(ring) WHERE n:Account | n.email] AS ring_accounts,
  [n IN nodes(ring) WHERE n:Transaction | n.amount] AS amounts,
  [n IN nodes(ring) WHERE n:Transaction | n.timestamp] AS timestamps
LIMIT 20
```

### Pattern 3: Velocity Patterns

Unusual activity spikes indicate potential fraud.

```gql
// Find accounts with unusual transaction velocity
MATCH (account:Account)-[:INITIATED]->(tx:Transaction)
WHERE tx.timestamp > timestamp() - duration('PT1H')
WITH account, count(tx) AS tx_count, sum(tx.amount) AS total_amount
WHERE tx_count > 10 OR total_amount > 10000

// Compare to historical average
OPTIONAL MATCH (account)-[:INITIATED]->(historical:Transaction)
WHERE historical.timestamp > timestamp() - duration('P30D')
  AND historical.timestamp < timestamp() - duration('PT1H')
WITH account, tx_count, total_amount,
     count(historical) / 720.0 AS avg_hourly_count,  // 720 hours in 30 days
     sum(historical.amount) / 720.0 AS avg_hourly_amount

WHERE tx_count > avg_hourly_count * 5
   OR total_amount > avg_hourly_amount * 5
RETURN
  account.email,
  tx_count AS recent_transactions,
  total_amount AS recent_amount,
  avg_hourly_count AS typical_hourly_count,
  avg_hourly_amount AS typical_hourly_amount,
  tx_count / avg_hourly_count AS velocity_multiplier
ORDER BY velocity_multiplier DESC
```

{{< tabs >}}
{{< tab "Go" >}}
```go
type VelocityAlert struct {
    AccountEmail       string
    RecentTxCount      int
    RecentAmount       float64
    TypicalHourlyCount float64
    TypicalHourlyAmount float64
    VelocityMultiplier float64
}

func FindVelocityAnomalies(ctx context.Context, db *sql.DB) ([]VelocityAlert, error) {
    rows, err := db.QueryContext(ctx, `
        MATCH (account:Account)-[:INITIATED]->(tx:Transaction)
        WHERE tx.timestamp > timestamp() - duration('PT1H')
        WITH account, count(tx) AS tx_count, sum(tx.amount) AS total_amount
        WHERE tx_count > 10 OR total_amount > 10000

        OPTIONAL MATCH (account)-[:INITIATED]->(historical:Transaction)
        WHERE historical.timestamp > timestamp() - duration('P30D')
          AND historical.timestamp < timestamp() - duration('PT1H')
        WITH account, tx_count, total_amount,
             count(historical) / 720.0 AS avg_hourly_count,
             sum(historical.amount) / 720.0 AS avg_hourly_amount

        WHERE tx_count > avg_hourly_count * 5
           OR total_amount > avg_hourly_amount * 5
        RETURN
            account.email AS email,
            tx_count AS recent_transactions,
            total_amount AS recent_amount,
            avg_hourly_count AS typical_count,
            avg_hourly_amount AS typical_amount,
            CASE WHEN avg_hourly_count > 0
                 THEN tx_count / avg_hourly_count
                 ELSE 999 END AS velocity_multiplier
        ORDER BY velocity_multiplier DESC
        LIMIT 50
    `)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var alerts []VelocityAlert
    for rows.Next() {
        var alert VelocityAlert
        err := rows.Scan(
            &alert.AccountEmail,
            &alert.RecentTxCount,
            &alert.RecentAmount,
            &alert.TypicalHourlyCount,
            &alert.TypicalHourlyAmount,
            &alert.VelocityMultiplier,
        )
        if err != nil {
            return nil, err
        }
        alerts = append(alerts, alert)
    }

    return alerts, nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
@dataclass
class VelocityAlert:
    account_email: str
    recent_tx_count: int
    recent_amount: float
    typical_hourly_count: float
    typical_hourly_amount: float
    velocity_multiplier: float

async def find_velocity_anomalies(client) -> List[VelocityAlert]:
    """Find accounts with unusual transaction velocity."""
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (account:Account)-[:INITIATED]->(tx:Transaction)
            WHERE tx.timestamp > timestamp() - duration('PT1H')
            WITH account, count(tx) AS tx_count, sum(tx.amount) AS total_amount
            WHERE tx_count > 10 OR total_amount > 10000

            OPTIONAL MATCH (account)-[:INITIATED]->(historical:Transaction)
            WHERE historical.timestamp > timestamp() - duration('P30D')
              AND historical.timestamp < timestamp() - duration('PT1H')
            WITH account, tx_count, total_amount,
                 count(historical) / 720.0 AS avg_hourly_count,
                 sum(historical.amount) / 720.0 AS avg_hourly_amount

            WHERE tx_count > avg_hourly_count * 5
               OR total_amount > avg_hourly_amount * 5
            RETURN
                account.email AS email,
                tx_count AS recent_transactions,
                total_amount AS recent_amount,
                avg_hourly_count AS typical_count,
                avg_hourly_amount AS typical_amount,
                CASE WHEN avg_hourly_count > 0
                     THEN tx_count / avg_hourly_count
                     ELSE 999 END AS velocity_multiplier
            ORDER BY velocity_multiplier DESC
            LIMIT 50
        """)

        return [
            VelocityAlert(
                account_email=row['email'].as_string,
                recent_tx_count=row['recent_transactions'].as_int,
                recent_amount=row['recent_amount'].as_float,
                typical_hourly_count=row['typical_count'].as_float,
                typical_hourly_amount=row['typical_amount'].as_float,
                velocity_multiplier=row['velocity_multiplier'].as_float
            )
            for row in result.rows
        ]
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
#[derive(Debug)]
struct VelocityAlert {
    account_email: String,
    recent_tx_count: i64,
    recent_amount: f64,
    typical_hourly_count: f64,
    typical_hourly_amount: f64,
    velocity_multiplier: f64,
}

async fn find_velocity_anomalies(
    conn: &mut geode_client::Connection,
) -> Result<Vec<VelocityAlert>, Box<dyn std::error::Error>> {
    let (page, _) = conn.query(r#"
        MATCH (account:Account)-[:INITIATED]->(tx:Transaction)
        WHERE tx.timestamp > timestamp() - duration('PT1H')
        WITH account, count(tx) AS tx_count, sum(tx.amount) AS total_amount
        WHERE tx_count > 10 OR total_amount > 10000

        OPTIONAL MATCH (account)-[:INITIATED]->(historical:Transaction)
        WHERE historical.timestamp > timestamp() - duration('P30D')
          AND historical.timestamp < timestamp() - duration('PT1H')
        WITH account, tx_count, total_amount,
             count(historical) / 720.0 AS avg_hourly_count,
             sum(historical.amount) / 720.0 AS avg_hourly_amount

        WHERE tx_count > avg_hourly_count * 5
           OR total_amount > avg_hourly_amount * 5
        RETURN
            account.email AS email,
            tx_count AS recent_transactions,
            total_amount AS recent_amount,
            avg_hourly_count AS typical_count,
            avg_hourly_amount AS typical_amount,
            CASE WHEN avg_hourly_count > 0
                 THEN tx_count / avg_hourly_count
                 ELSE 999 END AS velocity_multiplier
        ORDER BY velocity_multiplier DESC
        LIMIT 50
    "#).await?;

    let mut alerts = Vec::new();
    for row in &page.rows {
        alerts.push(VelocityAlert {
            account_email: row.get("email").unwrap().as_string()?,
            recent_tx_count: row.get("recent_transactions").unwrap().as_int()?,
            recent_amount: row.get("recent_amount").unwrap().as_float()?,
            typical_hourly_count: row.get("typical_count").unwrap().as_float()?,
            typical_hourly_amount: row.get("typical_amount").unwrap().as_float()?,
            velocity_multiplier: row.get("velocity_multiplier").unwrap().as_float()?,
        });
    }

    Ok(alerts)
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
interface VelocityAlert {
  accountEmail: string;
  recentTxCount: number;
  recentAmount: number;
  typicalHourlyCount: number;
  typicalHourlyAmount: number;
  velocityMultiplier: number;
}

async function findVelocityAnomalies(client: Client): Promise<VelocityAlert[]> {
  const rows = await client.queryAll(`
    MATCH (account:Account)-[:INITIATED]->(tx:Transaction)
    WHERE tx.timestamp > timestamp() - duration('PT1H')
    WITH account, count(tx) AS tx_count, sum(tx.amount) AS total_amount
    WHERE tx_count > 10 OR total_amount > 10000

    OPTIONAL MATCH (account)-[:INITIATED]->(historical:Transaction)
    WHERE historical.timestamp > timestamp() - duration('P30D')
      AND historical.timestamp < timestamp() - duration('PT1H')
    WITH account, tx_count, total_amount,
         count(historical) / 720.0 AS avg_hourly_count,
         sum(historical.amount) / 720.0 AS avg_hourly_amount

    WHERE tx_count > avg_hourly_count * 5
       OR total_amount > avg_hourly_amount * 5
    RETURN
      account.email AS email,
      tx_count AS recent_transactions,
      total_amount AS recent_amount,
      avg_hourly_count AS typical_count,
      avg_hourly_amount AS typical_amount,
      CASE WHEN avg_hourly_count > 0
           THEN tx_count / avg_hourly_count
           ELSE 999 END AS velocity_multiplier
    ORDER BY velocity_multiplier DESC
    LIMIT 50
  `);

  return rows.map(row => ({
    accountEmail: row.get('email')?.asString ?? '',
    recentTxCount: row.get('recent_transactions')?.asNumber ?? 0,
    recentAmount: row.get('recent_amount')?.asNumber ?? 0,
    typicalHourlyCount: row.get('typical_count')?.asNumber ?? 0,
    typicalHourlyAmount: row.get('typical_amount')?.asNumber ?? 0,
    velocityMultiplier: row.get('velocity_multiplier')?.asNumber ?? 0,
  }));
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const VelocityAlert = struct {
    account_email: []const u8,
    recent_tx_count: i64,
    recent_amount: f64,
    typical_hourly_count: f64,
    typical_hourly_amount: f64,
    velocity_multiplier: f64,
};

pub fn findVelocityAnomalies(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
) !std.ArrayList(VelocityAlert) {
    try client.sendRunGql(1,
        \\MATCH (account:Account)-[:INITIATED]->(tx:Transaction)
        \\WHERE tx.timestamp > timestamp() - duration('PT1H')
        \\WITH account, count(tx) AS tx_count, sum(tx.amount) AS total_amount
        \\WHERE tx_count > 10 OR total_amount > 10000
        \\OPTIONAL MATCH (account)-[:INITIATED]->(historical:Transaction)
        \\WHERE historical.timestamp > timestamp() - duration('P30D')
        \\  AND historical.timestamp < timestamp() - duration('PT1H')
        \\WITH account, tx_count, total_amount,
        \\     count(historical) / 720.0 AS avg_hourly_count,
        \\     sum(historical.amount) / 720.0 AS avg_hourly_amount
        \\WHERE tx_count > avg_hourly_count * 5
        \\   OR total_amount > avg_hourly_amount * 5
        \\RETURN
        \\    account.email AS email,
        \\    tx_count AS recent_transactions,
        \\    total_amount AS recent_amount,
        \\    avg_hourly_count AS typical_count,
        \\    avg_hourly_amount AS typical_amount,
        \\    CASE WHEN avg_hourly_count > 0
        \\         THEN tx_count / avg_hourly_count
        \\         ELSE 999 END AS velocity_multiplier
        \\ORDER BY velocity_multiplier DESC
        \\LIMIT 50
    , null);

    _ = try client.receiveMessage(30000);
    try client.sendPull(1, 1000);
    const result = try client.receiveMessage(30000);
    defer allocator.free(result);

    var alerts = std.ArrayList(VelocityAlert).init(allocator);
    return alerts;
}
```
{{< /tab >}}
{{< /tabs >}}

### Pattern 4: Identity Fraud

Multiple accounts sharing identity attributes.

```gql
// Find accounts sharing identity information
MATCH (a1:Account)-[:HAS_IDENTITY]->(i1:Identity)
MATCH (a2:Account)-[:HAS_IDENTITY]->(i2:Identity)
WHERE a1 <> a2
  AND (i1.ssn_hash = i2.ssn_hash
       OR i1.address_hash = i2.address_hash
       OR (i1.name = i2.name AND i1.date_of_birth = i2.date_of_birth))
RETURN
  a1.email AS account1,
  a2.email AS account2,
  i1.name AS name1,
  i2.name AS name2,
  CASE
    WHEN i1.ssn_hash = i2.ssn_hash THEN 'SSN'
    WHEN i1.address_hash = i2.address_hash THEN 'Address'
    ELSE 'Name+DOB'
  END AS match_type
```

### Pattern 5: Cross-Border Suspicious Activity

```gql
// Find suspicious cross-border transactions
MATCH (sender:Account)-[:INITIATED]->(tx:Transaction)-[:PAID_TO]->(receiver:Account)
MATCH (tx)-[:FROM_IP]->(ip:IPAddress)
MATCH (tx)-[:USED]->(pm:PaymentMethod)
WHERE ip.country <> pm.country
   OR (ip.is_vpn = true OR ip.is_tor = true)
WITH sender, receiver, tx, ip, pm,
     CASE
       WHEN ip.is_tor = true THEN 50
       WHEN ip.is_vpn = true THEN 30
       WHEN ip.country <> pm.country THEN 20
       ELSE 0
     END AS risk_points

WHERE risk_points > 0
RETURN
  sender.email AS sender,
  receiver.email AS receiver,
  tx.amount AS amount,
  ip.country AS ip_country,
  pm.country AS payment_country,
  ip.is_vpn AS is_vpn,
  ip.is_tor AS is_tor,
  risk_points
ORDER BY risk_points DESC, tx.amount DESC
```

## Real-Time Fraud Scoring

### Transaction Risk Score

```gql
// Calculate real-time risk score for a transaction
MATCH (account:Account {id: $account_id})

// Factor 1: Account risk (0-25 points)
WITH account,
     account.risk_score * 25 AS account_risk

// Factor 2: Device risk (0-25 points)
OPTIONAL MATCH (account)-[:USES_DEVICE]->(device:Device {id: $device_id})
WITH account, account_risk,
     COALESCE(device.risk_score * 25, 25) AS device_risk  // Unknown device = max risk

// Factor 3: IP risk (0-25 points)
OPTIONAL MATCH (ip:IPAddress {ip: $ip_address})
WITH account, account_risk, device_risk,
     CASE
       WHEN ip IS NULL THEN 15  // Unknown IP
       WHEN ip.is_tor = true THEN 25
       WHEN ip.is_vpn = true THEN 20
       WHEN ip.is_proxy = true THEN 15
       ELSE ip.risk_score * 25
     END AS ip_risk

// Factor 4: Transaction pattern risk (0-25 points)
OPTIONAL MATCH (account)-[:INITIATED]->(recent:Transaction)
WHERE recent.timestamp > timestamp() - duration('PT1H')
WITH account, account_risk, device_risk, ip_risk,
     count(recent) AS recent_count,
     sum(recent.amount) AS recent_total
WITH account_risk, device_risk, ip_risk,
     CASE
       WHEN recent_count > 20 THEN 25
       WHEN recent_count > 10 THEN 15
       WHEN recent_total > 10000 THEN 20
       WHEN recent_total > 5000 THEN 10
       ELSE 0
     END AS pattern_risk

// Calculate total risk score (0-100)
RETURN
  account_risk + device_risk + ip_risk + pattern_risk AS total_risk,
  account_risk,
  device_risk,
  ip_risk,
  pattern_risk
```

{{< tabs >}}
{{< tab "Go" >}}
```go
type RiskScore struct {
    TotalRisk    float64
    AccountRisk  float64
    DeviceRisk   float64
    IPRisk       float64
    PatternRisk  float64
}

func CalculateTransactionRisk(
    ctx context.Context,
    db *sql.DB,
    accountID, deviceID, ipAddress string,
    amount float64,
) (*RiskScore, error) {
    row := db.QueryRowContext(ctx, `
        MATCH (account:Account {id: ?})

        WITH account,
             account.risk_score * 25 AS account_risk

        OPTIONAL MATCH (account)-[:USES_DEVICE]->(device:Device {id: ?})
        WITH account, account_risk,
             COALESCE(device.risk_score * 25, 25) AS device_risk

        OPTIONAL MATCH (ip:IPAddress {ip: ?})
        WITH account, account_risk, device_risk,
             CASE
               WHEN ip IS NULL THEN 15
               WHEN ip.is_tor = true THEN 25
               WHEN ip.is_vpn = true THEN 20
               WHEN ip.is_proxy = true THEN 15
               ELSE ip.risk_score * 25
             END AS ip_risk

        OPTIONAL MATCH (account)-[:INITIATED]->(recent:Transaction)
        WHERE recent.timestamp > timestamp() - duration('PT1H')
        WITH account, account_risk, device_risk, ip_risk,
             count(recent) AS recent_count,
             sum(recent.amount) AS recent_total
        WITH account_risk, device_risk, ip_risk,
             CASE
               WHEN recent_count > 20 THEN 25
               WHEN recent_count > 10 THEN 15
               WHEN recent_total > 10000 THEN 20
               WHEN recent_total > 5000 THEN 10
               ELSE 0
             END AS pattern_risk

        RETURN
            account_risk + device_risk + ip_risk + pattern_risk AS total_risk,
            account_risk,
            device_risk,
            ip_risk,
            pattern_risk
    `, accountID, deviceID, ipAddress)

    var score RiskScore
    err := row.Scan(
        &score.TotalRisk,
        &score.AccountRisk,
        &score.DeviceRisk,
        &score.IPRisk,
        &score.PatternRisk,
    )
    if err != nil {
        return nil, err
    }

    return &score, nil
}

// Decision based on risk score
func ShouldBlockTransaction(score *RiskScore, amount float64) (bool, string) {
    if score.TotalRisk >= 80 {
        return true, "High risk score"
    }
    if score.TotalRisk >= 50 && amount >= 1000 {
        return true, "Elevated risk with high amount"
    }
    return false, ""
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
@dataclass
class RiskScore:
    total_risk: float
    account_risk: float
    device_risk: float
    ip_risk: float
    pattern_risk: float

async def calculate_transaction_risk(
    client,
    account_id: str,
    device_id: str,
    ip_address: str,
    amount: float
) -> RiskScore:
    """Calculate real-time risk score for a transaction."""
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (account:Account {id: $account_id})

            WITH account,
                 account.risk_score * 25 AS account_risk

            OPTIONAL MATCH (account)-[:USES_DEVICE]->(device:Device {id: $device_id})
            WITH account, account_risk,
                 COALESCE(device.risk_score * 25, 25) AS device_risk

            OPTIONAL MATCH (ip:IPAddress {ip: $ip_address})
            WITH account, account_risk, device_risk,
                 CASE
                   WHEN ip IS NULL THEN 15
                   WHEN ip.is_tor = true THEN 25
                   WHEN ip.is_vpn = true THEN 20
                   WHEN ip.is_proxy = true THEN 15
                   ELSE ip.risk_score * 25
                 END AS ip_risk

            OPTIONAL MATCH (account)-[:INITIATED]->(recent:Transaction)
            WHERE recent.timestamp > timestamp() - duration('PT1H')
            WITH account, account_risk, device_risk, ip_risk,
                 count(recent) AS recent_count,
                 sum(recent.amount) AS recent_total
            WITH account_risk, device_risk, ip_risk,
                 CASE
                   WHEN recent_count > 20 THEN 25
                   WHEN recent_count > 10 THEN 15
                   WHEN recent_total > 10000 THEN 20
                   WHEN recent_total > 5000 THEN 10
                   ELSE 0
                 END AS pattern_risk

            RETURN
                account_risk + device_risk + ip_risk + pattern_risk AS total_risk,
                account_risk,
                device_risk,
                ip_risk,
                pattern_risk
        """, {
            "account_id": account_id,
            "device_id": device_id,
            "ip_address": ip_address
        })

        if not result.rows:
            return RiskScore(100, 25, 25, 25, 25)  # Max risk for unknown account

        row = result.rows[0]
        return RiskScore(
            total_risk=row['total_risk'].as_float,
            account_risk=row['account_risk'].as_float,
            device_risk=row['device_risk'].as_float,
            ip_risk=row['ip_risk'].as_float,
            pattern_risk=row['pattern_risk'].as_float
        )

def should_block_transaction(score: RiskScore, amount: float) -> tuple[bool, str]:
    """Determine if transaction should be blocked based on risk."""
    if score.total_risk >= 80:
        return True, "High risk score"
    if score.total_risk >= 50 and amount >= 1000:
        return True, "Elevated risk with high amount"
    if score.total_risk >= 60 and score.device_risk >= 20:
        return True, "Risky device"
    return False, ""

async def process_transaction(
    client,
    account_id: str,
    device_id: str,
    ip_address: str,
    amount: float
) -> dict:
    """Process transaction with fraud scoring."""
    score = await calculate_transaction_risk(
        client, account_id, device_id, ip_address, amount
    )

    should_block, reason = should_block_transaction(score, amount)

    return {
        "approved": not should_block,
        "risk_score": score.total_risk,
        "reason": reason if should_block else None,
        "breakdown": {
            "account": score.account_risk,
            "device": score.device_risk,
            "ip": score.ip_risk,
            "pattern": score.pattern_risk
        }
    }
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
#[derive(Debug)]
struct RiskScore {
    total_risk: f64,
    account_risk: f64,
    device_risk: f64,
    ip_risk: f64,
    pattern_risk: f64,
}

async fn calculate_transaction_risk(
    conn: &mut geode_client::Connection,
    account_id: &str,
    device_id: &str,
    ip_address: &str,
) -> Result<RiskScore, Box<dyn std::error::Error>> {
    let mut params = HashMap::new();
    params.insert("account_id".to_string(), Value::string(account_id));
    params.insert("device_id".to_string(), Value::string(device_id));
    params.insert("ip_address".to_string(), Value::string(ip_address));

    let (page, _) = conn.query_with_params(r#"
        MATCH (account:Account {id: $account_id})
        WITH account, account.risk_score * 25 AS account_risk

        OPTIONAL MATCH (account)-[:USES_DEVICE]->(device:Device {id: $device_id})
        WITH account, account_risk,
             COALESCE(device.risk_score * 25, 25) AS device_risk

        OPTIONAL MATCH (ip:IPAddress {ip: $ip_address})
        WITH account, account_risk, device_risk,
             CASE
               WHEN ip IS NULL THEN 15
               WHEN ip.is_tor = true THEN 25
               WHEN ip.is_vpn = true THEN 20
               ELSE ip.risk_score * 25
             END AS ip_risk

        OPTIONAL MATCH (account)-[:INITIATED]->(recent:Transaction)
        WHERE recent.timestamp > timestamp() - duration('PT1H')
        WITH account_risk, device_risk, ip_risk,
             count(recent) AS recent_count,
             sum(recent.amount) AS recent_total
        WITH account_risk, device_risk, ip_risk,
             CASE
               WHEN recent_count > 20 THEN 25
               WHEN recent_count > 10 THEN 15
               WHEN recent_total > 10000 THEN 20
               ELSE 0
             END AS pattern_risk

        RETURN
            account_risk + device_risk + ip_risk + pattern_risk AS total_risk,
            account_risk, device_risk, ip_risk, pattern_risk
    "#, &params).await?;

    if let Some(row) = page.rows.first() {
        Ok(RiskScore {
            total_risk: row.get("total_risk").unwrap().as_float()?,
            account_risk: row.get("account_risk").unwrap().as_float()?,
            device_risk: row.get("device_risk").unwrap().as_float()?,
            ip_risk: row.get("ip_risk").unwrap().as_float()?,
            pattern_risk: row.get("pattern_risk").unwrap().as_float()?,
        })
    } else {
        Ok(RiskScore {
            total_risk: 100.0,
            account_risk: 25.0,
            device_risk: 25.0,
            ip_risk: 25.0,
            pattern_risk: 25.0,
        })
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
interface RiskScore {
  totalRisk: number;
  accountRisk: number;
  deviceRisk: number;
  ipRisk: number;
  patternRisk: number;
}

async function calculateTransactionRisk(
  client: Client,
  accountId: string,
  deviceId: string,
  ipAddress: string
): Promise<RiskScore> {
  const rows = await client.queryAll(`
    MATCH (account:Account {id: $account_id})
    WITH account, account.risk_score * 25 AS account_risk

    OPTIONAL MATCH (account)-[:USES_DEVICE]->(device:Device {id: $device_id})
    WITH account, account_risk,
         COALESCE(device.risk_score * 25, 25) AS device_risk

    OPTIONAL MATCH (ip:IPAddress {ip: $ip_address})
    WITH account, account_risk, device_risk,
         CASE
           WHEN ip IS NULL THEN 15
           WHEN ip.is_tor = true THEN 25
           WHEN ip.is_vpn = true THEN 20
           ELSE ip.risk_score * 25
         END AS ip_risk

    OPTIONAL MATCH (account)-[:INITIATED]->(recent:Transaction)
    WHERE recent.timestamp > timestamp() - duration('PT1H')
    WITH account_risk, device_risk, ip_risk,
         count(recent) AS recent_count
    WITH account_risk, device_risk, ip_risk,
         CASE WHEN recent_count > 20 THEN 25 ELSE 0 END AS pattern_risk

    RETURN
      account_risk + device_risk + ip_risk + pattern_risk AS total_risk,
      account_risk, device_risk, ip_risk, pattern_risk
  `, { params: { account_id: accountId, device_id: deviceId, ip_address: ipAddress } });

  if (rows.length === 0) {
    return { totalRisk: 100, accountRisk: 25, deviceRisk: 25, ipRisk: 25, patternRisk: 25 };
  }

  const row = rows[0];
  return {
    totalRisk: row.get('total_risk')?.asNumber ?? 100,
    accountRisk: row.get('account_risk')?.asNumber ?? 25,
    deviceRisk: row.get('device_risk')?.asNumber ?? 25,
    ipRisk: row.get('ip_risk')?.asNumber ?? 25,
    patternRisk: row.get('pattern_risk')?.asNumber ?? 25,
  };
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const RiskScore = struct {
    total_risk: f64,
    account_risk: f64,
    device_risk: f64,
    ip_risk: f64,
    pattern_risk: f64,
};

pub fn calculateTransactionRisk(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
    account_id: []const u8,
    device_id: []const u8,
    ip_address: []const u8,
) !RiskScore {
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("account_id", .{ .string = account_id });
    try params.put("device_id", .{ .string = device_id });
    try params.put("ip_address", .{ .string = ip_address });

    try client.sendRunGql(1,
        \\MATCH (account:Account {id: $account_id})
        \\WITH account, account.risk_score * 25 AS account_risk
        \\OPTIONAL MATCH (account)-[:USES_DEVICE]->(device:Device {id: $device_id})
        \\WITH account, account_risk,
        \\     COALESCE(device.risk_score * 25, 25) AS device_risk
        \\OPTIONAL MATCH (ip:IPAddress {ip: $ip_address})
        \\WITH account, account_risk, device_risk,
        \\     CASE WHEN ip IS NULL THEN 15
        \\          WHEN ip.is_tor = true THEN 25
        \\          ELSE ip.risk_score * 25 END AS ip_risk
        \\OPTIONAL MATCH (account)-[:INITIATED]->(recent:Transaction)
        \\WHERE recent.timestamp > timestamp() - duration('PT1H')
        \\WITH account_risk, device_risk, ip_risk, count(recent) AS recent_count
        \\WITH account_risk, device_risk, ip_risk,
        \\     CASE WHEN recent_count > 20 THEN 25 ELSE 0 END AS pattern_risk
        \\RETURN account_risk + device_risk + ip_risk + pattern_risk AS total_risk,
        \\       account_risk, device_risk, ip_risk, pattern_risk
    , .{ .object = params });

    _ = try client.receiveMessage(30000);
    try client.sendPull(1, 1);
    const result = try client.receiveMessage(30000);
    defer allocator.free(result);

    // Parse and return risk score
    return RiskScore{
        .total_risk = 0,
        .account_risk = 0,
        .device_risk = 0,
        .ip_risk = 0,
        .pattern_risk = 0,
    };
}
```
{{< /tab >}}
{{< /tabs >}}

## Investigation Workflows

### Create Fraud Case

```gql
// Create a new fraud case
CREATE (case:FraudCase {
  id: $case_id,
  type: $fraud_type,
  status: 'open',
  created_at: timestamp(),
  amount_at_risk: $amount,
  investigator: $investigator
})

// Link flagged accounts and transactions
WITH case
UNWIND $account_ids AS account_id
MATCH (account:Account {id: account_id})
CREATE (account)-[:FLAGGED_IN]->(case)

WITH case
UNWIND $transaction_ids AS tx_id
MATCH (tx:Transaction {id: tx_id})
CREATE (tx)-[:FLAGGED_IN]->(case)

RETURN case
```

### Investigate Account Network

```gql
// Get full network for investigation
MATCH (account:Account {id: $account_id})

// Get connected accounts via shared attributes
OPTIONAL MATCH (account)-[:USES_DEVICE]->(:Device)<-[:USES_DEVICE]-(device_linked:Account)
OPTIONAL MATCH (account)-[:HAS_PAYMENT_METHOD]->(:PaymentMethod)<-[:HAS_PAYMENT_METHOD]-(payment_linked:Account)
OPTIONAL MATCH (account)-[:HAS_IDENTITY]->(:Identity)<-[:HAS_IDENTITY]-(identity_linked:Account)
OPTIONAL MATCH (account)-[:LOGGED_IN_FROM]->(:IPAddress)<-[:LOGGED_IN_FROM]-(ip_linked:Account)

WITH account,
     collect(DISTINCT device_linked) AS device_linked_accounts,
     collect(DISTINCT payment_linked) AS payment_linked_accounts,
     collect(DISTINCT identity_linked) AS identity_linked_accounts,
     collect(DISTINCT ip_linked) AS ip_linked_accounts

// Get transactions
OPTIONAL MATCH (account)-[:INITIATED]->(sent:Transaction)-[:PAID_TO]->(recipient:Account)
OPTIONAL MATCH (sender:Account)-[:INITIATED]->(received:Transaction)-[:PAID_TO]->(account)

RETURN {
  account: account,
  device_linked: [a IN device_linked_accounts | {id: a.id, email: a.email, risk: a.risk_score}],
  payment_linked: [a IN payment_linked_accounts | {id: a.id, email: a.email, risk: a.risk_score}],
  identity_linked: [a IN identity_linked_accounts | {id: a.id, email: a.email, risk: a.risk_score}],
  ip_linked: [a IN ip_linked_accounts | {id: a.id, email: a.email, risk: a.risk_score}],
  sent_to: collect(DISTINCT {recipient: recipient.email, amount: sent.amount, timestamp: sent.timestamp}),
  received_from: collect(DISTINCT {sender: sender.email, amount: received.amount, timestamp: received.timestamp})
} AS investigation_data
```

### Timeline Analysis

```gql
// Build activity timeline for investigation
MATCH (account:Account {id: $account_id})

// Get all activities
OPTIONAL MATCH (account)-[tx_rel:INITIATED]->(tx:Transaction)
OPTIONAL MATCH (account)-[login_rel:LOGGED_IN_FROM]->(ip:IPAddress)
OPTIONAL MATCH (account)-[device_rel:USES_DEVICE]->(device:Device)

WITH account, collect({
  type: 'transaction',
  timestamp: tx.timestamp,
  details: {amount: tx.amount, status: tx.status, risk: tx.risk_score}
}) AS tx_events

UNION ALL

MATCH (account:Account {id: $account_id})-[r:LOGGED_IN_FROM]->(ip:IPAddress)
RETURN {
  type: 'login',
  timestamp: r.timestamp,
  details: {ip: ip.ip, country: ip.country, is_vpn: ip.is_vpn}
}

ORDER BY timestamp DESC
LIMIT 100
```

## Alert Generation

### Real-Time Alert Rules

```gql
// Rule 1: High-risk transaction
MATCH (account:Account)-[:INITIATED]->(tx:Transaction)
WHERE tx.timestamp > timestamp() - duration('PT5M')
  AND tx.risk_score > 80
  AND tx.status = 'pending'
CREATE (alert:Alert {
  id: randomUUID(),
  type: 'high_risk_transaction',
  severity: 'critical',
  account_id: account.id,
  transaction_id: tx.id,
  risk_score: tx.risk_score,
  amount: tx.amount,
  created_at: timestamp()
})
RETURN alert

// Rule 2: New device with high-value transaction
MATCH (account:Account)-[:USES_DEVICE]->(device:Device)
WHERE device.first_seen > timestamp() - duration('PT24H')
MATCH (account)-[:INITIATED]->(tx:Transaction)
WHERE tx.timestamp > timestamp() - duration('PT1H')
  AND tx.amount > 5000
CREATE (alert:Alert {
  id: randomUUID(),
  type: 'new_device_high_value',
  severity: 'high',
  account_id: account.id,
  device_id: device.id,
  transaction_id: tx.id,
  amount: tx.amount,
  created_at: timestamp()
})
RETURN alert

// Rule 3: Velocity spike
MATCH (account:Account)-[:INITIATED]->(tx:Transaction)
WHERE tx.timestamp > timestamp() - duration('PT1H')
WITH account, count(tx) AS tx_count, sum(tx.amount) AS total_amount
WHERE tx_count > 20 OR total_amount > 50000
CREATE (alert:Alert {
  id: randomUUID(),
  type: 'velocity_spike',
  severity: 'high',
  account_id: account.id,
  transaction_count: tx_count,
  total_amount: total_amount,
  created_at: timestamp()
})
RETURN alert
```

## Compliance Considerations

### Audit Trail

```gql
// Log all fraud-related actions
CREATE (audit:AuditLog {
  id: $audit_id,
  action: $action,           // "flag_account", "block_transaction", etc.
  actor: $actor,             // Who performed the action
  target_type: $target_type, // "account", "transaction"
  target_id: $target_id,
  reason: $reason,
  timestamp: timestamp(),
  metadata: $metadata
})

// Link to relevant entities
WITH audit
MATCH (target) WHERE target.id = $target_id
CREATE (audit)-[:ACTED_ON]->(target)
```

### Regulatory Reporting

```gql
// Generate SAR (Suspicious Activity Report) data
MATCH (case:FraudCase {id: $case_id})
MATCH (account:Account)-[:FLAGGED_IN]->(case)
OPTIONAL MATCH (account)-[:HAS_IDENTITY]->(identity:Identity)
OPTIONAL MATCH (tx:Transaction)-[:FLAGGED_IN]->(case)

WITH case, account, identity, collect(tx) AS transactions
RETURN {
  case_id: case.id,
  case_type: case.type,
  created_at: case.created_at,
  accounts: collect({
    id: account.id,
    email: account.email,
    name: identity.name,
    risk_score: account.risk_score
  }),
  transactions: [t IN transactions | {
    id: t.id,
    amount: t.amount,
    currency: t.currency,
    timestamp: t.timestamp,
    risk_score: t.risk_score
  }],
  total_amount_at_risk: sum([t IN transactions | t.amount])
} AS sar_data
```

### Data Retention

```gql
// Archive old fraud data (compliance with retention policies)
MATCH (case:FraudCase)
WHERE case.status = 'closed'
  AND case.resolved_at < timestamp() - duration('P7Y')

// Archive before deletion
CREATE (archive:ArchivedCase {
  original_id: case.id,
  type: case.type,
  amount_at_risk: case.amount_at_risk,
  created_at: case.created_at,
  resolved_at: case.resolved_at,
  archived_at: timestamp()
})

// Delete original
DETACH DELETE case
```

## Performance Optimization

### Indexing for Fraud Queries

```gql
// Essential indexes
CREATE INDEX account_status ON :Account(status)
CREATE INDEX account_risk ON :Account(risk_score)
CREATE INDEX device_fingerprint ON :Device(fingerprint)
CREATE INDEX ip_address ON :IPAddress(ip)
CREATE INDEX transaction_timestamp ON :Transaction(timestamp)
CREATE INDEX transaction_status ON :Transaction(status)

// Composite indexes for common queries
CREATE INDEX transaction_timestamp_risk ON :Transaction(timestamp, risk_score)
CREATE INDEX account_status_risk ON :Account(status, risk_score)
```

### Batch Processing

```gql
// Batch update risk scores
CALL {
  MATCH (account:Account)
  WHERE account.last_risk_update < timestamp() - duration('PT1H')
     OR account.last_risk_update IS NULL

  // Calculate new risk score
  OPTIONAL MATCH (account)-[:FLAGGED_IN]->(:FraudCase {status: 'confirmed'})
  WITH account, count(*) AS fraud_cases

  OPTIONAL MATCH (account)-[:USES_DEVICE]->(device:Device)
  WHERE device.risk_score > 0.5
  WITH account, fraud_cases, count(device) AS risky_devices

  SET account.risk_score = CASE
    WHEN fraud_cases > 0 THEN 1.0
    WHEN risky_devices > 2 THEN 0.8
    WHEN risky_devices > 0 THEN 0.5
    ELSE account.risk_score
  END,
  account.last_risk_update = timestamp()

  RETURN count(account) AS updated
}
```

## Monitoring Dashboard

### Key Metrics

```gql
// Fraud detection metrics
MATCH (tx:Transaction)
WHERE tx.timestamp > timestamp() - duration('P1D')
WITH count(tx) AS total_transactions,
     count(CASE WHEN tx.status = 'flagged' THEN 1 END) AS flagged_transactions,
     sum(tx.amount) AS total_volume,
     sum(CASE WHEN tx.status = 'flagged' THEN tx.amount END) AS flagged_volume

MATCH (case:FraudCase)
WHERE case.created_at > timestamp() - duration('P1D')
WITH total_transactions, flagged_transactions, total_volume, flagged_volume,
     count(case) AS new_cases,
     sum(case.amount_at_risk) AS amount_at_risk

MATCH (alert:Alert)
WHERE alert.created_at > timestamp() - duration('P1D')
WITH total_transactions, flagged_transactions, total_volume, flagged_volume,
     new_cases, amount_at_risk,
     count(alert) AS total_alerts,
     count(CASE WHEN alert.severity = 'critical' THEN 1 END) AS critical_alerts

RETURN {
  total_transactions: total_transactions,
  flagged_transactions: flagged_transactions,
  flag_rate: toFloat(flagged_transactions) / total_transactions,
  total_volume: total_volume,
  flagged_volume: flagged_volume,
  new_cases: new_cases,
  amount_at_risk: amount_at_risk,
  total_alerts: total_alerts,
  critical_alerts: critical_alerts
} AS daily_metrics
```

## Next Steps

- [Knowledge Graph Guide](/guides/knowledge-graph/) - Entity resolution for fraud
- [Social Network Guide](/guides/social-network/) - Network analysis techniques
- [Query Performance Guide](/guides/query-performance/) - Optimize fraud queries
- [Security Guide](/docs/security/) - Secure your fraud data

## Resources

- [GQL Reference](/docs/gql-reference/)
- [Graph Modeling Guide](/guides/graph-modeling/)
- [FATF Recommendations](https://www.fatf-gafi.org/recommendations.html)
- [Example Applications](https://gitlab.com/devnw/codepros/geode/examples)

---

**Questions?** Join our [community forum](https://forum.geodedb.com) to discuss fraud detection strategies.
