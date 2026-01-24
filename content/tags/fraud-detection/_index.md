---
title: "Fraud Detection"
description: "Build fraud detection systems with Geode graph database. Detect fraud rings, money laundering, identity theft, and suspicious patterns using GQL graph queries and real-time anomaly detection."
keywords:
  - fraud detection
  - fraud prevention
  - anomaly detection
  - fraud rings
  - money laundering
  - identity theft
  - transaction monitoring
  - risk scoring
  - Geode
  - GQL
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/fraud-detection/"
    noindex: false
---

# Fraud Detection with Geode

Fraud detection leverages graph relationships to uncover hidden connections between accounts, devices, transactions, and identities that traditional systems miss. Geode's native graph processing excels at identifying fraud rings, money laundering networks, identity theft patterns, and coordinated attacks in real-time.

## Why Graphs for Fraud Detection

Fraudsters operate through networks of relationships that are invisible in relational databases but obvious in graphs. A single suspicious account becomes a fraud ring when you discover it shares devices, IP addresses, payment methods, and phone numbers with dozens of other accounts.

### Core Concepts

**First-Party Fraud**: Individuals committing fraud directly (identity theft, application fraud, synthetic identities).

**Third-Party Fraud**: Organized fraud rings coordinating attacks across multiple accounts and identities.

**Fraud Rings**: Networks of connected fraudulent accounts identified through shared attributes and behavioral patterns.

**Velocity Checks**: Detecting anomalous rates of activity (rapid account creation, transaction bursts, geographic impossibility).

## Detecting Fraud Rings

Fraud rings are groups of accounts controlled by the same entity or organization, often sharing common attributes.

### Shared Device Detection

```gql
-- Find accounts sharing devices (potential fraud ring)
MATCH (device:Device)<-[:USES]-(account1:Account),
      (device)<-[:USES]-(account2:Account)
WHERE account1 <> account2
  AND account1.created_date > CURRENT_DATE - INTERVAL '30' DAY
  AND account2.created_date > CURRENT_DATE - INTERVAL '30' DAY
WITH device,
     COLLECT(DISTINCT account1) + COLLECT(DISTINCT account2) AS accounts
WHERE SIZE(accounts) >= 5
RETURN device.fingerprint AS device_id,
       SIZE(accounts) AS account_count,
       [a IN accounts | a.email][..10] AS sample_accounts,
       MAX([a IN accounts | a.created_date]) AS most_recent_account
ORDER BY account_count DESC;
```

### Multi-Hop Fraud Network

```gql
-- Expand fraud network through multiple relationship types
MATCH (seed:Account {flagged: true})
MATCH path = (seed)-[:USES|SHARES_IP|SAME_PHONE|PAYMENT_METHOD*1..3]-(connected:Account)
WHERE ALL(rel IN RELATIONSHIPS(path) WHERE TYPE(rel) IN ['USES', 'SHARES_IP', 'SAME_PHONE', 'PAYMENT_METHOD'])
WITH connected,
     COUNT(DISTINCT seed) AS flagged_connections,
     COLLECT(DISTINCT TYPE(RELATIONSHIPS(path)[0])) AS connection_types
WHERE flagged_connections >= 2
RETURN connected.id AS suspicious_account,
       connected.email AS email,
       flagged_connections AS risk_score,
       connection_types AS shared_attributes
ORDER BY risk_score DESC;
```

### Synthetic Identity Detection

```gql
-- Detect synthetic identities (fabricated personas)
MATCH (account:Account)
WHERE account.created_date > CURRENT_DATE - INTERVAL '90' DAY
WITH account,
     COUNT { (account)-[:USES]->(device:Device) } AS device_count,
     COUNT { (account)-[:FROM_IP]->(ip:IPAddress) } AS ip_count,
     COUNT { (account)-[:HAS_PHONE]->(:Phone) } AS phone_count,
     COUNT { (account)-[:PAYMENT_METHOD]->(:CreditCard) } AS card_count
WHERE device_count > 10
   OR ip_count > 20
   OR phone_count > 3
   OR card_count > 5
MATCH (account)-[:SHARES_ATTRIBUTE]-(other:Account)
WHERE other.created_date > CURRENT_DATE - INTERVAL '90' DAY
WITH account,
     COUNT(DISTINCT other) AS linked_accounts,
     device_count,
     ip_count
WHERE linked_accounts > 15
RETURN account.id,
       account.email,
       linked_accounts,
       device_count,
       ip_count,
       (linked_accounts * 10 + device_count * 5 + ip_count * 2) AS synthetic_score
ORDER BY synthetic_score DESC;
```

## Transaction Pattern Analysis

### Rapid Fire Transactions

```gql
-- Detect suspiciously rapid transaction sequences
MATCH (account:Account)-[t:TRANSACTION]->(merchant:Merchant)
WHERE t.timestamp > CURRENT_TIMESTAMP - INTERVAL '1' HOUR
WITH account,
     COUNT(t) AS transaction_count,
     SUM(t.amount) AS total_amount,
     COLLECT(t.timestamp) AS timestamps
WHERE transaction_count > 20
WITH account,
     transaction_count,
     total_amount,
     timestamps,
     [i IN RANGE(1, SIZE(timestamps) - 1) |
      DURATION.BETWEEN(timestamps[i-1], timestamps[i]).seconds] AS intervals
WHERE ANY(interval IN intervals WHERE interval < 5)
RETURN account.id,
       transaction_count,
       total_amount,
       MIN(intervals) AS min_seconds_between,
       'RAPID_FIRE' AS fraud_type;
```

### Geographic Impossibility

```gql
-- Detect transactions from impossible geographic locations
MATCH (account:Account)-[t1:TRANSACTION]->(m1:Merchant),
      (account)-[t2:TRANSACTION]->(m2:Merchant)
WHERE t2.timestamp > t1.timestamp
  AND t2.timestamp < t1.timestamp + INTERVAL '2' HOUR
  AND m1.location <> m2.location
WITH account,
     t1,
     t2,
     m1.location AS loc1,
     m2.location AS loc2,
     DURATION.BETWEEN(t1.timestamp, t2.timestamp).minutes AS time_diff,
     DISTANCE(m1.coordinates, m2.coordinates) AS distance_km
WHERE distance_km > 500
  AND distance_km / time_diff > 200  -- Speed > 200 km/h
RETURN account.id,
       t1.timestamp AS first_transaction,
       t2.timestamp AS second_transaction,
       loc1,
       loc2,
       distance_km,
       distance_km / time_diff AS implied_speed,
       'GEOGRAPHIC_IMPOSSIBILITY' AS fraud_indicator;
```

### Money Laundering Patterns

```gql
-- Detect layering patterns (rapid movement through accounts)
MATCH path = (origin:Account)-[:TRANSFER*3..6]->(destination:Account)
WHERE origin <> destination
  AND ALL(rel IN RELATIONSHIPS(path)
          WHERE rel.timestamp > CURRENT_TIMESTAMP - INTERVAL '24' HOUR)
WITH origin,
     destination,
     path,
     [rel IN RELATIONSHIPS(path) | rel.amount] AS amounts,
     LENGTH(path) AS hops
WHERE ALL(amount IN amounts WHERE amount > 1000)
  AND hops >= 3
  AND REDUCE(total = 0, amount IN amounts | total + amount) > 10000
RETURN origin.id AS source_account,
       destination.id AS final_account,
       hops,
       REDUCE(total = 0, amount IN amounts | total + amount) AS total_transferred,
       [n IN NODES(path)[1..-1] | n.id] AS intermediary_accounts,
       'LAYERING' AS pattern_type
ORDER BY total_transferred DESC;
```

## Real-Time Fraud Scoring

### Composite Risk Score

```gql
-- Calculate real-time fraud risk score
MATCH (account:Account {id: $account_id})

// Device sharing risk
WITH account,
     COUNT { (account)-[:USES]->(d:Device)<-[:USES]-(:Account {flagged: true}) } AS flagged_device_connections

// IP sharing risk
WITH account, flagged_device_connections,
     COUNT { (account)-[:FROM_IP]->(ip:IPAddress)<-[:FROM_IP]-(:Account {flagged: true}) } AS flagged_ip_connections

// Velocity risk
WITH account, flagged_device_connections, flagged_ip_connections,
     COUNT {
         (account)-[t:TRANSACTION]->()
         WHERE t.timestamp > CURRENT_TIMESTAMP - INTERVAL '1' HOUR
     } AS recent_transactions

// Account age risk
WITH account, flagged_device_connections, flagged_ip_connections, recent_transactions,
     DURATION.BETWEEN(account.created_date, CURRENT_DATE).days AS account_age_days

// Network size risk
WITH account, flagged_device_connections, flagged_ip_connections,
     recent_transactions, account_age_days,
     COUNT { (account)-[:SHARES_ATTRIBUTE]-() } AS network_size

RETURN account.id,
       account.email,
       flagged_device_connections * 20 AS device_risk,
       flagged_ip_connections * 15 AS ip_risk,
       CASE
           WHEN recent_transactions > 50 THEN 50
           WHEN recent_transactions > 20 THEN 30
           WHEN recent_transactions > 10 THEN 15
           ELSE 0
       END AS velocity_risk,
       CASE
           WHEN account_age_days < 7 THEN 25
           WHEN account_age_days < 30 THEN 15
           WHEN account_age_days < 90 THEN 5
           ELSE 0
       END AS new_account_risk,
       CASE
           WHEN network_size > 100 THEN 30
           WHEN network_size > 50 THEN 20
           WHEN network_size > 20 THEN 10
           ELSE 0
       END AS network_risk,
       (flagged_device_connections * 20 +
        flagged_ip_connections * 15 +
        velocity_risk +
        new_account_risk +
        network_risk) AS total_fraud_score;
```

### Behavioral Anomaly Detection

```gql
-- Detect deviations from normal behavior patterns
MATCH (account:Account {id: $account_id})

// Calculate historical baseline
WITH account,
     AVG([t IN [(account)-[trans:TRANSACTION]->() WHERE
                trans.timestamp > CURRENT_TIMESTAMP - INTERVAL '90' DAY
                AND trans.timestamp < CURRENT_TIMESTAMP - INTERVAL '7' DAY
                | trans.amount]]) AS avg_historical_amount,
     STDEV([t IN [(account)-[trans:TRANSACTION]->() WHERE
                  trans.timestamp > CURRENT_TIMESTAMP - INTERVAL '90' DAY
                  AND trans.timestamp < CURRENT_TIMESTAMP - INTERVAL '7' DAY
                  | trans.amount]]) AS stddev_historical_amount

// Compare recent transactions
MATCH (account)-[recent:TRANSACTION]->()
WHERE recent.timestamp > CURRENT_TIMESTAMP - INTERVAL '1' DAY
WITH account,
     avg_historical_amount,
     stddev_historical_amount,
     COLLECT(recent.amount) AS recent_amounts
WHERE SIZE(recent_amounts) > 0

WITH account,
     avg_historical_amount,
     stddev_historical_amount,
     recent_amounts,
     [amount IN recent_amounts WHERE
      ABS(amount - avg_historical_amount) > 3 * stddev_historical_amount
     ] AS anomalous_amounts

WHERE SIZE(anomalous_amounts) > 0

RETURN account.id,
       avg_historical_amount,
       anomalous_amounts,
       SIZE(anomalous_amounts) AS anomaly_count,
       'BEHAVIORAL_ANOMALY' AS alert_type;
```

## Application Fraud Prevention

### Account Takeover Detection

```gql
-- Detect potential account takeovers
MATCH (account:Account)-[login:LOGIN]->(device:Device)
WHERE login.timestamp > CURRENT_TIMESTAMP - INTERVAL '7' DAY
WITH account,
     COLLECT(DISTINCT device.fingerprint) AS recent_devices,
     COUNT { (account)-[:LOGIN {successful: true}]->() WHERE
             login.timestamp > CURRENT_TIMESTAMP - INTERVAL '90' DAY
             AND login.timestamp < CURRENT_TIMESTAMP - INTERVAL '7' DAY
     } AS historical_logins,
     COUNT { (account)-[:LOGIN {successful: true}]->() WHERE
             login.timestamp > CURRENT_TIMESTAMP - INTERVAL '7' DAY
     } AS recent_logins

// Check for new devices with high activity
WITH account, recent_devices, historical_logins, recent_logins
WHERE recent_logins > historical_logins * 3
   OR SIZE(recent_devices) > 5

MATCH (account)-[:LOGIN]->(new_device:Device)
WHERE NOT EXISTS {
    (account)-[:LOGIN]->new_device)
    WHERE login.timestamp < CURRENT_TIMESTAMP - INTERVAL '7' DAY
}
WITH account,
     COUNT(DISTINCT new_device) AS new_device_count,
     recent_logins

WHERE new_device_count >= 3

RETURN account.id,
       account.email,
       new_device_count,
       recent_logins,
       'ACCOUNT_TAKEOVER_SUSPECTED' AS alert;
```

### Duplicate Account Detection

```gql
-- Find duplicate or related accounts
MATCH (a1:Account), (a2:Account)
WHERE ID(a1) < ID(a2)
  AND (
      a1.email = a2.email
      OR a1.phone = a2.phone
      OR LEVENSHTEIN(a1.name, a2.name) < 3
      OR a1.ssn_last4 = a2.ssn_last4
  )
WITH a1, a2,
     COUNT { (a1)-[:USES]->(:Device)<-[:USES]-(a2) } AS shared_devices,
     COUNT { (a1)-[:FROM_IP]->(:IPAddress)<-[:FROM_IP]-(a2) } AS shared_ips

WHERE shared_devices > 0 OR shared_ips > 0

RETURN a1.id AS account1,
       a2.id AS account2,
       a1.email AS email1,
       a2.email AS email2,
       shared_devices,
       shared_ips,
       'DUPLICATE_ACCOUNT' AS fraud_type;
```

## Best Practices

### Graph Model Design

**Entity Resolution**: Create nodes for shared attributes (devices, IPs, phones, payment methods) to make connections explicit and queryable.

**Temporal Properties**: Store timestamps on all relationships to enable time-based analysis and velocity checks.

**Fraud Flags**: Add boolean flags and timestamps when accounts/transactions are flagged for efficient filtering in subsequent queries.

**Attribute Hashing**: Hash sensitive identifiers (SSN, credit cards) while preserving ability to detect matches.

### Performance Optimization

```gql
-- Index high-cardinality lookup fields
CREATE INDEX account_email_idx FOR (a:Account) ON (a.email);
CREATE INDEX device_fingerprint_idx FOR (d:Device) ON (d.fingerprint);
CREATE INDEX transaction_timestamp_idx FOR ()-[t:TRANSACTION]-() ON (t.timestamp);

-- Use query hints for large fraud ring detection
MATCH (device:Device)<-[:USES]-(account:Account)
USING INDEX account:Account(created_date)
WHERE account.created_date > CURRENT_DATE - INTERVAL '30' DAY
WITH device, COLLECT(account) AS accounts
WHERE SIZE(accounts) >= 5
RETURN device, accounts;
```

### Real-Time Detection

**Stream Processing**: Process transactions as they occur, computing fraud scores before authorization.

**Incremental Updates**: Update fraud scores incrementally rather than recomputing entire graphs.

**Caching**: Cache frequently accessed fraud indicators (device reputations, IP risk scores).

**Threshold Tuning**: Adjust fraud score thresholds based on false positive rates and business impact.

## Integration Examples

### Python Client - Real-Time Scoring

```python
from geode_client import GeodeClient

async def check_transaction_fraud(client, account_id, amount, device_id, ip_address):
    result = await client.execute("""
        MATCH (account:Account {id: $account_id})
        OPTIONAL MATCH (account)-[:USES]->(device:Device {id: $device_id})
        OPTIONAL MATCH (account)-[:FROM_IP]->(ip:IPAddress {address: $ip_address})

        WITH account,
             device,
             ip,
             COUNT { (device)<-[:USES]-(:Account {flagged: true}) } AS device_risk,
             COUNT { (ip)<-[:FROM_IP]-(:Account {flagged: true}) } AS ip_risk,
             COUNT {
                 (account)-[t:TRANSACTION]->()
                 WHERE t.timestamp > CURRENT_TIMESTAMP - INTERVAL '1' HOUR
             } AS recent_txn_count

        RETURN device_risk * 20 +
               ip_risk * 15 +
               CASE WHEN recent_txn_count > 10 THEN 30 ELSE 0 END +
               CASE WHEN $amount > account.avg_transaction * 5 THEN 25 ELSE 0 END
               AS fraud_score
    """, {
        'account_id': account_id,
        'device_id': device_id,
        'ip_address': ip_address,
        'amount': amount
    })

    fraud_score = result.rows[0][0]

    if fraud_score > 70:
        return {'decision': 'BLOCK', 'score': fraud_score}
    elif fraud_score > 40:
        return {'decision': 'REVIEW', 'score': fraud_score}
    else:
        return {'decision': 'APPROVE', 'score': fraud_score}
```

### Rust Client - Fraud Ring Detection

```rust
use geode_client::Client;

async fn detect_fraud_ring(client: &Client, min_accounts: i32) -> Result<Vec<FraudRing>> {
    let results = client.execute(
        "MATCH (device:Device)<-[:USES]-(account:Account) \
         WHERE account.created_date > CURRENT_DATE - INTERVAL '30' DAY \
         WITH device, COLLECT(account) AS accounts \
         WHERE SIZE(accounts) >= $min_accounts \
         RETURN device.fingerprint AS device_id, \
                SIZE(accounts) AS account_count, \
                [a IN accounts | a.email] AS emails",
        &[("min_accounts", min_accounts.into())]
    ).await?;

    let mut fraud_rings = Vec::new();
    for row in results.rows() {
        fraud_rings.push(FraudRing {
            device_id: row.get_string(0)?,
            account_count: row.get_int(1)? as usize,
            emails: row.get_string_list(2)?,
        });
    }

    Ok(fraud_rings)
}
```

## Related Topics

- **Anomaly Detection**: See anomaly-detection tag for general anomaly detection patterns
- **Pattern Matching**: Check patterns tag for complex graph pattern queries
- **Real-Time Analytics**: Explore real-time-analytics for streaming fraud detection
- **Security**: Review security tag for authentication and access control integration
