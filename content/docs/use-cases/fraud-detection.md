---
title: "Fraud and Anomaly Detection"
description: "Detect fraudulent transactions using graph patterns, ML embeddings, real-time CDC analytics, and Row-Level Security for compliance"
url: /docs/use-cases/fraud-detection/
weight: 20
tags:
  - fraud-detection
  - anomaly-detection
  - use-case
  - real-time-analytics
  - cdc
categories:
  - use-cases
  - graph-algorithms-and-analytics
keywords:
  - fraud detection graph database
  - anomaly detection
  - transaction monitoring
  - CDC
  - real-time analytics
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Fraud and Anomaly Detection

Build a real-time fraud detection system using graph patterns, machine learning embeddings, and change data capture (CDC).

## Problem Statement

Financial fraud is a graph problem:

- **Transaction rings**: Multiple accounts transferring funds in circles
- **Velocity anomalies**: Unusual transaction patterns (frequency, amount, location)
- **Network effects**: Compromised accounts infecting connected accounts
- **Synthetic identities**: Fabricated identities with suspicious relationship patterns

Traditional rule-based systems miss complex patterns. Graph databases excel at detecting these relationships.

## Graph Model

### Schema

```gql
-- Create graph
CREATE GRAPH PaymentNetwork;
USE PaymentNetwork;

-- Nodes
(:Account {
  id: UUID,
  holder_name: String,
  email: String,
  created_at: Timestamp,
  risk_score: Float,
  embedding: VectorF32  -- For ML-based similarity
})

(:Transaction {
  id: UUID,
  amount: Decimal,
  timestamp: Timestamp,
  status: String,  -- 'pending', 'completed', 'flagged', 'blocked'
  merchant_category: String,
  location: LatLon
})

(:Device {
  id: UUID,
  fingerprint: String,
  ip_addr: IpAddr,
  first_seen: Timestamp
})

-- Relationships
(:Account)-[:SENT {timestamp: Timestamp}]->(:Transaction)
(:Transaction)-[:RECEIVED_BY]->(:Account)
(:Account)-[:USED_DEVICE {first_used: Timestamp}]->(:Device)
(:Account)-[:SHARES_INFO {info_type: String}]->(:Account)  -- email, phone, address
```

### Example Data

```gql
-- Create accounts
CREATE
  (:Account {id: gen_random_uuid(), holder_name: "Alice Smith", email: "[email protected]", created_at: timestamp(), risk_score: 0.1}),
  (:Account {id: gen_random_uuid(), holder_name: "Bob Jones", email: "[email protected]", created_at: timestamp(), risk_score: 0.2}),
  (:Account {id: gen_random_uuid(), holder_name: "Charlie Wilson", email: "[email protected]", created_at: timestamp(), risk_score: 0.8});

-- Create transactions
MATCH (alice:Account {holder_name: "Alice Smith"}), (bob:Account {holder_name: "Bob Jones"})
CREATE (tx:Transaction {id: gen_random_uuid(), amount: decimal('1000.00'), timestamp: timestamp(), status: 'completed', merchant_category: 'retail'})
CREATE (alice)-[:SENT {timestamp: timestamp()}]->(tx)-[:RECEIVED_BY]->(bob);

-- Shared device (suspicious)
MATCH (alice:Account {holder_name: "Alice Smith"}), (charlie:Account {holder_name: "Charlie Wilson"})
CREATE (dev:Device {id: gen_random_uuid(), fingerprint: "abc123", ip_addr: '192.168.1.100'::ipaddr})
CREATE (alice)-[:USED_DEVICE {first_used: timestamp()}]->(dev)
CREATE (charlie)-[:USED_DEVICE {first_used: timestamp()}]->(dev);
```

## Detection Patterns

### 1. Transaction Ring Detection

Circular money flows indicating wash trading or money laundering:

```gql
-- Find transaction cycles (A -> B -> C -> A)
MATCH path = (a:Account)-[:SENT]->(:Transaction)-[:RECEIVED_BY]->(b:Account)-[:SENT]->(:Transaction)-[:RECEIVED_BY]->(c:Account)-[:SENT]->(:Transaction)-[:RECEIVED_BY]->(a)
WHERE length(path) = 6  -- 3 transactions
RETURN
  a.holder_name AS account1,
  b.holder_name AS account2,
  c.holder_name AS account3,
  length(path) AS cycle_length;
```

### 2. Velocity Anomaly Detection

Accounts with unusual transaction frequency or amounts:

```gql
-- High-velocity accounts (>10 transactions in 1 hour)
MATCH (a:Account)-[:SENT]->(tx:Transaction)
WHERE tx.timestamp > timestamp() - interval('PT1H')
WITH a, COUNT(tx) AS tx_count, SUM(tx.amount) AS total_amount
WHERE tx_count > 10
RETURN a.holder_name, tx_count, total_amount
ORDER BY tx_count DESC;

-- Large transaction anomaly (>3 standard deviations)
MATCH (a:Account)-[:SENT]->(tx:Transaction)
WITH AVG(tx.amount) AS avg_amount, STDDEV(tx.amount) AS stddev_amount
MATCH (a:Account)-[:SENT]->(tx:Transaction)
WHERE tx.amount > avg_amount + (3 * stddev_amount)
RETURN a.holder_name, tx.amount, avg_amount, stddev_amount;
```

### 3. Shared Device/IP Detection

Multiple accounts using the same device or IP address:

```gql
-- Find accounts sharing devices
MATCH (a1:Account)-[:USED_DEVICE]->(d:Device)<-[:USED_DEVICE]-(a2:Account)
WHERE a1.id < a2.id  -- Avoid duplicates
RETURN
  d.fingerprint,
  d.ip_addr,
  COLLECT(a1.holder_name) AS account1,
  COLLECT(a2.holder_name) AS account2;
```

### 4. Network Centrality (Mule Accounts)

Accounts acting as hubs (receiving/sending to many accounts):

```gql
-- Compute betweenness centrality to find mule accounts
CALL algo.betweenness.stream()
YIELD nodeId, betweenness
MATCH (a:Account) WHERE id(a) = nodeId AND betweenness > 10.0
RETURN a.holder_name, a.risk_score, betweenness
ORDER BY betweenness DESC;
```

## ML-Based Anomaly Detection

### Generate Embeddings

Use Node2Vec to create account embeddings capturing behavioral patterns:

Embeddings are trained outside the database — there is no `graph.node2vec`
procedure. Export the transfer graph, train with Node2Vec (or any other model),
then write the vectors back as `VECTOR` properties:

```gql
-- Export the payment edges for the trainer
MATCH (a:Account)-[:SENT]->(b:Account)
RETURN id(a) AS source, id(b) AS target;

-- Write a client-computed embedding back onto the account
MATCH (a:Account) WHERE id(a) = $node_id
SET a.embedding = vectorf32($embedding);
```

### Detect Anomalies with Vector Similarity

Find accounts with unusual behavior (outliers):

```gql
-- For each account, find nearest neighbors
MATCH (a:Account)
MATCH (neighbor:Account)
WHERE neighbor.id <> a.id
  AND distance(a.embedding, neighbor.embedding, 'cosine') < 0.8
WITH a, COUNT(neighbor) AS neighbor_count
WHERE neighbor_count < 3  -- Fewer than 3 similar accounts = anomaly
RETURN a.holder_name, a.risk_score, neighbor_count
ORDER BY neighbor_count ASC;
```

## Real-Time Fraud Detection

From `REAL_TIME_ANALYTICS.md`:

### CDC Configuration

Capture transaction events and trigger real-time analysis:

```yaml
# cdc-config.yaml
cdc:
  enabled: true
  webhooks:
    - url: "https://fraud-detection.example.com/webhook"
      events:
        - node.created
        - edge.created
      filter: "label = 'Transaction' OR type = 'SENT'"
      retry:
        max_attempts: 3
        backoff: exponential
```

### Webhook Processing

**Webhook receives transaction event**:

```json
{
  "event": "node.created",
  "graph": "PaymentNetwork",
  "node": {
    "id": 123456,
    "labels": ["Transaction"],
    "properties": {
      "amount": "5000.00",
      "timestamp": "2024-01-15T14:30:00Z",
      "merchant_category": "wire_transfer"
    }
  },
  "trace_id": "7c9e8d6f-5b4a-3c2d-1e0f-9a8b7c6d5e4f"
}
```

**Fraud detection service**:

```python
# Pseudo-code
async def process_transaction(event):
    tx_id = event['node']['id']
    amount = Decimal(event['node']['properties']['amount'])

    # Query graph for context
    sender = await get_sender_account(tx_id)
    receiver = await get_receiver_account(tx_id)

    # Compute risk score
    risk_score = 0.0

    # Check velocity
    recent_tx_count = await count_recent_transactions(sender.id, hours=1)
    if recent_tx_count > 10:
        risk_score += 0.3

    # Check amount anomaly
    avg_amount = await get_avg_transaction_amount(sender.id)
    if amount > avg_amount * 3:
        risk_score += 0.4

    # Check for transaction ring
    in_ring = await is_part_of_ring(sender.id, receiver.id)
    if in_ring:
        risk_score += 0.5

    # Flag if high risk
    if risk_score > 0.7:
        await flag_transaction(tx_id, risk_score)
        await send_alert(sender, receiver, risk_score)

    return risk_score
```

## Row-Level Security for Multi-Tenant Isolation

From `ADVANCED_SECURITY_FEATURES_OCTOBER_2025.md`:

Financial institutions need tenant isolation:

```gql
-- Create RLS policy: users only see their organization's data
CREATE POLICY org_isolation ON Account
FOR SELECT
USING (organization_id = current_user_org_id());

CREATE POLICY org_isolation_tx ON Transaction
FOR SELECT
USING (
  EXISTS (
    MATCH (a:Account)-[:SENT|RECEIVED_BY]->(tx:Transaction)
    WHERE tx.id = this.id AND a.organization_id = current_user_org_id()
  )
);
```

**Benefit**: Analysts at Bank A cannot see Bank B's data, even with direct database access.

## Audit Logging for Compliance

From `AUDIT_LOGGING.md`:

Track all fraud investigations for regulatory compliance:

```yaml
security:
  audit:
    enabled: true
    log_path: "/var/log/geode/fraud-audit.jsonl"
    syslog:
      enabled: true
      address: "siem.example.com:514"
      format: "CEF"
```

**Audit log entry**:

```json
{
  "timestamp": "2024-01-15T14:30:00.123Z",
  "event_type": "query_executed",
  "user": "fraud_analyst_alice",
  "graph": "PaymentNetwork",
  "execution_time_ms": 45.2,
  "rows_returned": 3,
  "trace_id": "...",
  "prev_log_hash": "...",
  "signature": "..."
}
```

## Performance Optimization

### Index Strategy

```gql
-- Index frequently queried properties
CREATE INDEX account_risk_score_idx ON Account(risk_score) USING btree;
CREATE INDEX tx_timestamp_idx ON Transaction(timestamp) USING btree;
CREATE INDEX tx_amount_idx ON Transaction(amount) USING btree;

-- Vector index for similarity queries
CREATE INDEX account_embedding_idx ON Account(embedding) USING vector;

-- Spatial index for location-based fraud
CREATE INDEX tx_location_idx ON Transaction(location) USING spatial;
```

### Materialized Risk Scores

Pre-compute risk scores for fast lookups:

```gql
-- Batch job (run hourly)
MATCH (a:Account)
WITH a,
  -- Compute risk factors
  COUNT {MATCH (a)-[:SENT]->(:Transaction) WHERE timestamp > timestamp() - interval('P1D')} AS daily_tx_count,
  AVG {MATCH (a)-[:SENT]->(tx:Transaction) RETURN tx.amount} AS avg_tx_amount
SET a.risk_score = CASE
  WHEN daily_tx_count > 50 THEN 0.8
  WHEN avg_tx_amount > 10000 THEN 0.6
  ELSE 0.2
END;

-- Queries use cached risk_score
MATCH (a:Account)
WHERE a.risk_score > 0.7
RETURN a.holder_name, a.risk_score
ORDER BY a.risk_score DESC;
```

## Complete Workflow

1. **Ingest transactions** via application or bulk load
2. **CDC triggers** webhook to fraud detection service
3. **Service queries graph** for context (velocity, rings, centrality)
4. **ML model scores** transaction using embeddings
5. **High-risk transactions** flagged automatically
6. **Analysts investigate** using GQL queries
7. **Audit logs** capture all investigations for compliance

## Next Steps

- [Real-Time Analytics](/docs/analytics/real-time-analytics/) - CDC and streaming integration
- [Graph Algorithms](/docs/analytics/graph-algorithms) - Centrality and embeddings
- [Security Guide](/docs/security/overview) - RLS and audit logging
- [Indexing and Optimization](/docs/query/indexing-and-optimization) - Performance tuning
