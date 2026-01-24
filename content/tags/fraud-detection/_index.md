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

## Advanced Fraud Detection Patterns

### Money Laundering Detection (Layering & Integration)

Detect complex money laundering schemes:

```gql
-- Detect smurfing (structuring to avoid reporting thresholds)
MATCH (a:Account)-[t:TRANSACTION]->()
WHERE t.timestamp > datetime().minusDays(7)
  AND t.amount BETWEEN 9000 AND 9999  // Just below $10k reporting threshold
WITH a,
     COUNT(t) AS near_threshold_count,
     SUM(t.amount) AS total_amount,
     COUNT(DISTINCT date.truncate('day', t.timestamp)) AS days_active
WHERE near_threshold_count >= 5
  AND total_amount > 40000
RETURN a.account_id,
       near_threshold_count,
       total_amount,
       days_active,
       'STRUCTURING' AS fraud_pattern;

-- Fan-out / Fan-in patterns (integration phase)
MATCH (origin:Account)-[t1:TRANSFER]->(layer1:Account)
      -[t2:TRANSFER]->(layer2:Account)
WHERE t1.timestamp > datetime().minusDays(3)
  AND t2.timestamp > t1.timestamp
  AND t2.timestamp < t1.timestamp + duration('PT2H')
WITH origin, layer2, COUNT(DISTINCT layer1) AS intermediaries
WHERE intermediaries >= 3
MATCH (layer2)-[t3:TRANSFER]->(destination:Account)
WHERE t3.timestamp > datetime().minusDays(3)
WITH origin, destination,
     COUNT(DISTINCT layer2) AS layering_nodes,
     SUM(t3.amount) AS final_amount
WHERE layering_nodes >= 2 AND final_amount > 50000
RETURN origin.account_id AS source,
       destination.account_id AS sink,
       layering_nodes,
       final_amount,
       'LAYERING_NETWORK' AS fraud_type;
```

### Identity Verification Fraud

Detect fake identities and account takeovers:

```gql
-- Synthetic identity detection
MATCH (a:Account)
WHERE a.created_date > datetime().minusDays(180)
WITH a,
     COUNT { (a)-[:HAS_PHONE]->(:Phone) } AS phone_count,
     COUNT { (a)-[:HAS_EMAIL]->(:Email) } AS email_count,
     COUNT { (a)-[:USES]->(:Device) } AS device_count,
     COUNT { (a)-[:FROM_IP]->(:IPAddress) } AS ip_count,
     SIZE((a)-[:SHARES_SSN]->()) AS ssn_matches
WHERE phone_count > 3
   OR device_count > 15
   OR ip_count > 25
   OR ssn_matches > 5
WITH a, phone_count, device_count, ip_count, ssn_matches,
     phone_count * 2 + device_count * 3 + ip_count + ssn_matches * 10 AS synthetic_score
WHERE synthetic_score > 30
RETURN a.account_id,
       a.name,
       phone_count,
       device_count,
       ip_count,
       ssn_matches,
       synthetic_score
ORDER BY synthetic_score DESC;

-- Account takeover detection
MATCH (a:Account)-[login:LOGIN]->(device:Device)
WHERE login.timestamp > datetime().minusDays(30)
WITH a,
     COLLECT(DISTINCT device.fingerprint) AS recent_devices,
     COUNT { (a)-[:LOGIN]->() WHERE login.timestamp < datetime().minusDays(30) } AS historical_logins
WITH a, recent_devices,
     SIZE([d IN recent_devices WHERE NOT EXISTS {
         (a)-[:LOGIN]->(:Device {fingerprint: d})
         WHERE login.timestamp < datetime().minusDays(30)
     }]) AS new_device_count
WHERE new_device_count >= 3
MATCH (a)-[recent_login:LOGIN]->(:Device)
WHERE recent_login.timestamp > datetime().minusDays(7)
  AND recent_login.failed_attempts > 3
WITH a, new_device_count, COUNT(recent_login) AS failed_login_attempts
WHERE failed_login_attempts > 10
RETURN a.account_id,
       new_device_count,
       failed_login_attempts,
       'ACCOUNT_TAKEOVER_SUSPECTED' AS alert;
```

### Card-Not-Present (CNP) Fraud

Detect online payment fraud:

```gql
-- Card testing patterns (small transactions before large purchase)
MATCH (card:CreditCard)<-[t:TRANSACTION]-(merchant:Merchant)
WHERE t.timestamp > datetime().minusHours(24)
WITH card,
     COUNT(t) AS tx_count,
     [t IN COLLECT(t) ORDER BY t.timestamp | t.amount] AS amounts
WITH card, tx_count, amounts,
     [a IN amounts WHERE a < 5.0] AS small_amounts,
     [a IN amounts WHERE a > 500.0] AS large_amounts
WHERE SIZE(small_amounts) >= 5
  AND SIZE(large_amounts) >= 1
  AND amounts[-1] > 500  // Latest transaction is large
RETURN card.card_number_last4,
       tx_count,
       SIZE(small_amounts) AS test_transactions,
       amounts[-1] AS large_purchase_amount,
       'CARD_TESTING' AS fraud_indicator;

-- Cross-border fraud velocity
MATCH (card:CreditCard)<-[t:TRANSACTION]-(merchant:Merchant)
WHERE t.timestamp > datetime().minusDays(7)
WITH card, merchant.country AS country, COUNT(t) AS tx_in_country
WITH card, COUNT(DISTINCT country) AS countries_used, SUM(tx_in_country) AS total_tx
WHERE countries_used >= 5 AND total_tx >= 10
MATCH (card)<-[recent:TRANSACTION]-(m:Merchant)
WHERE recent.timestamp > datetime().minusHours(12)
WITH card, countries_used,
     COLLECT(DISTINCT m.country) AS recent_countries
WHERE SIZE(recent_countries) >= 3
RETURN card.card_number_last4,
       countries_used,
       recent_countries,
       'GEOGRAPHIC_VELOCITY' AS fraud_type;
```

## Machine Learning-Based Fraud Detection

### Feature Engineering for ML Models

```gql
-- Extract fraud detection features
MATCH (a:Account)
OPTIONAL MATCH (a)-[t:TRANSACTION]->()
WHERE t.timestamp > datetime().minusDays(90)
WITH a,
     COUNT(t) AS tx_count_90d,
     AVG(t.amount) AS avg_tx_amount,
     STDDEV(t.amount) AS stddev_tx_amount,
     MAX(t.amount) AS max_tx_amount,
     COUNT(DISTINCT date.truncate('day', t.timestamp)) AS active_days,
     COUNT(DISTINCT t.merchant_id) AS unique_merchants
WITH a, tx_count_90d, avg_tx_amount, stddev_tx_amount, max_tx_amount, active_days, unique_merchants,
     SIZE((a)-[:USES]->(:Device)) AS device_count,
     SIZE((a)-[:FROM_IP]->(:IPAddress)) AS ip_count
OPTIONAL MATCH (a)-[:TRANSACTED_WITH]-(other:Account {flagged: true})
WITH a, tx_count_90d, avg_tx_amount, stddev_tx_amount, max_tx_amount,
     active_days, unique_merchants, device_count, ip_count,
     COUNT(DISTINCT other) AS flagged_connections
RETURN a.account_id,
       tx_count_90d,
       avg_tx_amount,
       stddev_tx_amount,
       max_tx_amount,
       active_days,
       unique_merchants,
       device_count,
       ip_count,
       flagged_connections,
       tx_count_90d * 1.0 / NULLIF(active_days, 0) AS tx_per_active_day,
       max_tx_amount / NULLIF(avg_tx_amount, 0) AS amount_volatility,
       flagged_connections * 100.0 / NULLIF(device_count + ip_count, 0) AS network_risk_ratio;
```

### Graph Neural Network (GNN) Fraud Detection

```gql
-- Store GNN embeddings computed externally
MATCH (a:Account {account_id: $account_id})
SET a.gnn_embedding = $embedding_vector;

-- Query using learned representations
MATCH (suspicious:Account)
WHERE suspicious.gnn_fraud_score > 0.8  // Score from external GNN model
MATCH (suspicious)-[:TRANSACTED_WITH*1..2]-(connected:Account)
WITH connected,
     AVG(suspicious.gnn_fraud_score) AS avg_neighbor_fraud_score,
     COUNT(DISTINCT suspicious) AS suspicious_connections
WHERE avg_neighbor_fraud_score > 0.6
  AND suspicious_connections >= 3
RETURN connected.account_id,
       avg_neighbor_fraud_score,
       suspicious_connections,
       'GUILT_BY_ASSOCIATION' AS detection_method;
```

## Rule-Based Expert Systems

### Configurable Fraud Rules Engine

```gql
-- Define fraud rules as data
CREATE (rule:FraudRule {
    rule_id: 'RULE_001',
    name: 'High Velocity Small Transactions',
    condition: 'tx_count > 20 AND max_amount < 100 AND time_window_hours < 1',
    score: 0.7,
    action: 'BLOCK',
    enabled: true
});

CREATE (rule:FraudRule {
    rule_id: 'RULE_002',
    name: 'Geographic Impossibility',
    condition: 'distance_km > 500 AND time_diff_minutes < 60',
    score: 0.9,
    action: 'BLOCK',
    enabled: true
});

-- Execute rules engine
MATCH (tx:Transaction {transaction_id: $tx_id})
MATCH (rule:FraudRule {enabled: true})
CALL fraud.evaluate_rule(tx, rule)
YIELD matched, score
WHERE matched = true
WITH tx, SUM(score) AS total_fraud_score,
     COLLECT(rule.name) AS triggered_rules
WITH tx, total_fraud_score, triggered_rules,
     CASE
         WHEN total_fraud_score > 0.9 THEN 'BLOCK'
         WHEN total_fraud_score > 0.6 THEN 'REVIEW'
         WHEN total_fraud_score > 0.3 THEN 'FLAG'
         ELSE 'APPROVE'
     END AS decision
RETURN tx.transaction_id,
       decision,
       total_fraud_score,
       triggered_rules;
```

## Production Deployment Patterns

### Real-Time Fraud Scoring Pipeline

```gql
-- Inline transaction scoring (< 50ms latency requirement)
MATCH (tx:PendingTransaction {transaction_id: $tx_id})
MATCH (account:Account {account_id: tx.account_id})

// Parallel risk checks
CALL {
    WITH account
    // Check 1: Account velocity
    MATCH (account)-[recent:TRANSACTION]->()
    WHERE recent.timestamp > datetime().minusHours(1)
    WITH COUNT(recent) AS recent_count
    RETURN CASE WHEN recent_count > 10 THEN 0.3 ELSE 0.0 END AS velocity_risk
}
CALL {
    WITH account
    // Check 2: Device reputation
    MATCH (account)-[:USES]->(device:Device)
    WITH device.reputation_score AS device_rep
    RETURN CASE WHEN device_rep < 0.5 THEN 0.4 ELSE 0.0 END AS device_risk
}
CALL {
    WITH account, tx
    // Check 3: Amount anomaly
    MATCH (account)-[hist:TRANSACTION]->()
    WHERE hist.timestamp > datetime().minusDays(30)
    WITH AVG(hist.amount) AS avg_amount, STDDEV(hist.amount) AS stddev_amount
    WITH ABS(tx.amount - avg_amount) / NULLIF(stddev_amount, 0) AS z_score
    RETURN CASE WHEN z_score > 3 THEN 0.3 ELSE 0.0 END AS amount_risk
}

WITH tx,
     velocity_risk + device_risk + amount_risk AS fraud_score
SET tx.fraud_score = fraud_score,
    tx.decision = CASE
        WHEN fraud_score > 0.8 THEN 'BLOCK'
        WHEN fraud_score > 0.5 THEN 'REVIEW'
        ELSE 'APPROVE'
    END,
    tx.scored_at = datetime()
RETURN tx.transaction_id, tx.decision, tx.fraud_score;
```

### Batch Fraud Sweep (Daily/Weekly)

```gql
-- Comprehensive fraud analysis for all accounts
MATCH (a:Account)
WHERE a.last_fraud_check < datetime().minusDays(1)
CALL {
    WITH a
    // Run full suite of checks
    CALL fraud.check_network_anomalies(a) YIELD network_score
    CALL fraud.check_behavioral_patterns(a) YIELD behavior_score
    CALL fraud.check_transaction_patterns(a) YIELD transaction_score
    
    WITH network_score + behavior_score + transaction_score AS total_score
    WHERE total_score > 0.6
    
    SET a.fraud_risk_score = total_score,
        a.last_fraud_check = datetime(),
        a.requires_review = true
    
    RETURN a.account_id, total_score
} IN TRANSACTIONS OF 10000 ROWS

RETURN COUNT(*) AS accounts_flagged;
```

### Feedback Loop and Model Retraining

```gql
-- Collect feedback from fraud analysts
MATCH (tx:Transaction {flagged: true})
MATCH (review:FraudReview {transaction_id: tx.transaction_id})
WHERE review.analyst_decision IS NOT NULL
WITH tx,
     review.analyst_decision AS true_label,  // 'FRAUD' or 'LEGITIMATE'
     tx.fraud_score AS predicted_score
WITH COLLECT({
    transaction_id: tx.transaction_id,
    features: tx.features,
    predicted_score: predicted_score,
    true_label: true_label
}) AS training_data
// Export for model retraining
RETURN training_data;

-- Track model performance metrics
WITH [review IN fraud_reviews WHERE review.created_at > datetime().minusDays(30)] AS reviews
WITH SIZE([r IN reviews WHERE r.predicted = 'FRAUD' AND r.actual = 'FRAUD']) AS true_positives,
     SIZE([r IN reviews WHERE r.predicted = 'FRAUD' AND r.actual = 'LEGITIMATE']) AS false_positives,
     SIZE([r IN reviews WHERE r.predicted = 'LEGITIMATE' AND r.actual = 'FRAUD']) AS false_negatives,
     SIZE([r IN reviews WHERE r.predicted = 'LEGITIMATE' AND r.actual = 'LEGITIMATE']) AS true_negatives
RETURN true_positives * 1.0 / (true_positives + false_positives) AS precision,
       true_positives * 1.0 / (true_positives + false_negatives) AS recall,
       2 * precision * recall / (precision + recall) AS f1_score;
```

## Compliance and Regulatory Requirements

### AML/KYC Transaction Monitoring

```gql
-- Monitor for suspicious activity reports (SARs)
MATCH (a:Account)-[t:TRANSACTION]->()
WHERE t.timestamp > datetime().minusDays(30)
WITH a,
     SUM(CASE WHEN t.amount >= 10000 THEN 1 ELSE 0 END) AS large_tx_count,
     SUM(CASE WHEN t.amount BETWEEN 9000 AND 9999 THEN 1 ELSE 0 END) AS structuring_count,
     COUNT(DISTINCT t.destination_country) AS international_countries,
     SUM(t.amount) AS total_volume
WHERE large_tx_count >= 5
   OR structuring_count >= 3
   OR international_countries >= 10
   OR total_volume >= 100000
WITH a, large_tx_count, structuring_count, international_countries, total_volume,
     CASE
         WHEN structuring_count >= 3 THEN 'STRUCTURING'
         WHEN large_tx_count >= 10 THEN 'HIGH_VOLUME'
         WHEN international_countries >= 15 THEN 'INTERNATIONAL_SUSPICIOUS'
         ELSE 'REVIEW_REQUIRED'
     END AS sar_reason
CREATE (sar:SuspiciousActivityReport {
    sar_id: uuid(),
    account_id: a.account_id,
    reason: sar_reason,
    large_tx_count: large_tx_count,
    structuring_count: structuring_count,
    international_countries: international_countries,
    total_volume: total_volume,
    created_at: datetime(),
    status: 'PENDING_REVIEW'
});
```

## Best Practices

1. **Multi-Layered Defense**: Combine rule-based, statistical, and ML approaches
2. **Real-Time + Batch**: Inline scoring for authorization, deep analysis offline
3. **Low Latency**: Target < 50ms for real-time fraud checks
4. **Explainability**: Always provide reason codes for fraud decisions
5. **Feedback Loops**: Collect analyst decisions to improve models
6. **False Positive Management**: Balance security with user experience
7. **Privacy**: Anonymize data in analytics, log access to sensitive information
8. **Monitoring**: Track precision, recall, F1-score, and false positive rates
9. **Adaptive Thresholds**: Adjust sensitivity based on risk appetite and trends
10. **Cross-Channel**: Detect fraud across web, mobile, API, and physical channels

## Further Reading

- **Fraud Detection**: Graph-Based Approaches for Financial Crime
- **Money Laundering Detection**: Layering, Structuring, and Integration Patterns
- **Machine Learning for Fraud**: GNNs, Autoencoders, and Ensemble Methods
- **Real-Time Scoring**: Low-Latency Architectures and Optimization
- **AML/KYC Compliance**: Regulatory Requirements and Implementation
- **Identity Fraud**: Synthetic Identities and Account Takeover Detection
- **Payment Fraud**: Card-Not-Present, Card Testing, and Authorization Fraud

Browse the tagged content below for comprehensive fraud detection documentation and case studies.
