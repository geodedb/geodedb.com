---
title: "Anomaly Detection"
description: "Detect fraudulent transactions, suspicious patterns, and outliers in graph data using Geode's real-time analytics and graph algorithms. Learn statistical methods, pattern-based detection, and behavioral analysis."
keywords:
  - anomaly detection
  - fraud detection
  - outlier detection
  - pattern recognition
  - behavioral analysis
  - security
  - risk management
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/anomaly-detection/"
    noindex: false
---

Anomaly detection identifies unusual patterns, outliers, and suspicious behaviors in graph data. Geode's native graph model excels at detecting relationship-based anomalies, structural outliers, and behavioral deviations that would be difficult to spot in traditional databases.

## What Is Graph-Based Anomaly Detection?

Graph-based anomaly detection leverages the structure and relationships in your data to identify entities or patterns that deviate from normal behavior. Unlike statistical methods that analyze individual attributes, graph-based approaches examine connectivity patterns, community membership, and relationship dynamics.

### Types of Anomalies

**Point Anomalies**: Individual nodes or edges with unusual properties (e.g., account with abnormally high transaction volume).

**Contextual Anomalies**: Entities that are anomalous in a specific context but not globally (e.g., large transaction from a normally low-activity account).

**Collective Anomalies**: Groups of entities that together form an unusual pattern (e.g., circular money transfer ring).

## Statistical Anomaly Detection

### Threshold-Based Detection

Identify outliers using statistical thresholds:

```gql
// Detect accounts with unusually high transaction counts
MATCH (a:Account)-[t:TRANSACTION]->()
WITH a, COUNT(t) AS tx_count
WITH AVG(tx_count) AS avg_count, STDDEV(tx_count) AS stddev_count
MATCH (suspicious:Account)-[t2:TRANSACTION]->()
WITH suspicious, COUNT(t2) AS account_tx_count, avg_count, stddev_count
WHERE account_tx_count > avg_count + (3 * stddev_count)  // 3 sigma rule
RETURN suspicious.account_id,
       account_tx_count,
       avg_count,
       stddev_count,
       (account_tx_count - avg_count) / stddev_count AS z_score
ORDER BY z_score DESC;
```

### Distribution Analysis

Detect outliers based on value distributions:

```gql
// Find transactions with unusual amounts
WITH [100, 500, 1000] AS percentiles
MATCH (t:Transaction)
WITH t,
     percentile_cont(t.amount, 0.25) AS q1,
     percentile_cont(t.amount, 0.75) AS q3,
     percentile_cont(t.amount, 0.50) AS median
WITH t, q1, q3, median,
     q3 - q1 AS iqr  // Interquartile range
WHERE t.amount < q1 - (1.5 * iqr)  // Lower outliers
   OR t.amount > q3 + (1.5 * iqr)  // Upper outliers
RETURN t.transaction_id,
       t.amount,
       median,
       iqr,
       CASE
         WHEN t.amount > q3 + (1.5 * iqr) THEN 'high_outlier'
         ELSE 'low_outlier'
       END AS anomaly_type;
```

## Pattern-Based Detection

### Unusual Relationship Patterns

Detect suspicious connectivity patterns:

```gql
// Find accounts with circular transaction patterns
MATCH path = (a:Account)-[:TRANSACTION*2..5]->(a)
WHERE ALL(r IN relationships(path) WHERE r.timestamp > datetime().minusDays(7))
WITH a, path,
     LENGTH(path) AS cycle_length,
     REDUCE(sum = 0, r IN relationships(path) | sum + r.amount) AS total_amount
WHERE total_amount > 10000  // Significant amount in cycle
RETURN a.account_id,
       cycle_length,
       total_amount,
       [n IN nodes(path) | n.account_id] AS cycle_accounts
ORDER BY total_amount DESC;

// Detect rapid-fire transactions (possible automation)
MATCH (a:Account)-[t:TRANSACTION]->(b:Account)
WITH a, b, COLLECT(t) AS transactions
WHERE SIZE(transactions) >= 5
WITH a, b, transactions,
     transactions[0].timestamp AS first_tx,
     transactions[-1].timestamp AS last_tx
WITH a, b, SIZE(transactions) AS tx_count,
     duration.between(first_tx, last_tx).seconds AS time_span_seconds
WHERE time_span_seconds < 60  // 5+ transactions in under 1 minute
RETURN a.account_id AS from_account,
       b.account_id AS to_account,
       tx_count,
       time_span_seconds,
       tx_count / time_span_seconds AS tx_per_second;
```

### Structural Anomalies

Identify unusual graph structures:

```gql
// Find isolated cliques (potential fraud rings)
MATCH (n:Account)-[r1:TRANSACTION]-(m:Account)
WHERE r1.timestamp > datetime().minusDays(30)
WITH n, COLLECT(DISTINCT m) AS neighbors
WHERE SIZE(neighbors) >= 5  // Minimum clique size

// Check if neighbors form a complete subgraph
WITH n, neighbors
WHERE ALL(
  n1 IN neighbors WHERE
  ALL(
    n2 IN neighbors WHERE
    n1 = n2 OR EXISTS((n1)-[:TRANSACTION]-(n2))
  )
)
WITH n, neighbors, SIZE(neighbors) AS clique_size

// Check if clique is isolated from the rest of the graph
MATCH (member:Account)
WHERE member IN neighbors
OPTIONAL MATCH (member)-[:TRANSACTION]-(outside:Account)
WHERE NOT outside IN neighbors
WITH n, neighbors, clique_size, COUNT(DISTINCT outside) AS external_connections
WHERE external_connections < clique_size * 0.1  // < 10% external connections
RETURN n.account_id,
       [m IN neighbors | m.account_id] AS ring_members,
       clique_size,
       external_connections;
```

## Behavioral Analysis

### Deviation from Normal Behavior

Detect changes in user behavior patterns:

```gql
// Compare recent activity to historical baseline
MATCH (u:User)-[recent:TRANSACTION]->(merchant:Merchant)
WHERE recent.timestamp > datetime().minusDays(7)
WITH u, merchant.category AS category, COUNT(recent) AS recent_count

// Get historical average for this user and category
MATCH (u)-[historical:TRANSACTION]->(:Merchant {category: category})
WHERE historical.timestamp BETWEEN datetime().minusDays(90) AND datetime().minusDays(7)
WITH u, category, recent_count,
     COUNT(historical) / 12.0 AS weekly_avg  // 90 days = ~12 weeks
WHERE recent_count > weekly_avg * 3  // 3x normal activity
RETURN u.user_id,
       category,
       recent_count,
       weekly_avg,
       recent_count / weekly_avg AS activity_ratio
ORDER BY activity_ratio DESC;
```

### Velocity Checks

Detect impossible or suspicious transaction sequences:

```gql
// Detect geographically impossible transactions
MATCH (a:Account)-[t1:TRANSACTION]->(m1:Merchant)
MATCH (a)-[t2:TRANSACTION]->(m2:Merchant)
WHERE t1.timestamp < t2.timestamp
  AND duration.between(t1.timestamp, t2.timestamp).minutes < 60
  AND m1.merchant_id <> m2.merchant_id

// Calculate distance between merchant locations
WITH a, t1, t2, m1, m2,
     point.distance(
       point({latitude: m1.latitude, longitude: m1.longitude}),
       point({latitude: m2.latitude, longitude: m2.longitude})
     ) / 1000.0 AS distance_km,
     duration.between(t1.timestamp, t2.timestamp).minutes AS time_minutes
WITH a, t1, t2, m1, m2, distance_km, time_minutes,
     distance_km / (time_minutes / 60.0) AS required_speed_kmh
WHERE required_speed_kmh > 800  // Faster than airplane
RETURN a.account_id,
       t1.transaction_id AS first_tx,
       t2.transaction_id AS second_tx,
       m1.city AS first_location,
       m2.city AS second_location,
       distance_km,
       time_minutes,
       required_speed_kmh;
```

## Network-Based Detection

### Community Outliers

Identify entities that don't fit their community:

```gql
// Find users with unusual connections for their community
MATCH (u:User)-[:BELONGS_TO]->(c:Community)
MATCH (u)-[:CONNECTED_TO]-(neighbor:User)

// Calculate within-community vs. outside-community connections
WITH u, c,
     COUNT(DISTINCT CASE WHEN (neighbor)-[:BELONGS_TO]->(c) THEN neighbor END) AS internal_connections,
     COUNT(DISTINCT CASE WHEN NOT (neighbor)-[:BELONGS_TO]->(c) THEN neighbor END) AS external_connections
WITH u, c, internal_connections, external_connections,
     external_connections * 1.0 / (internal_connections + external_connections) AS external_ratio

// Compare to community average
WITH c, AVG(external_ratio) AS avg_external_ratio, STDDEV(external_ratio) AS stddev_external
MATCH (outlier:User)-[:BELONGS_TO]->(c)
MATCH (outlier)-[:CONNECTED_TO]-(n:User)
WITH outlier, c,
     COUNT(DISTINCT CASE WHEN (n)-[:BELONGS_TO]->(c) THEN n END) AS user_internal,
     COUNT(DISTINCT CASE WHEN NOT (n)-[:BELONGS_TO]->(c) THEN n END) AS user_external,
     avg_external_ratio, stddev_external
WITH outlier, c,
     user_external * 1.0 / (user_internal + user_external) AS user_external_ratio,
     avg_external_ratio, stddev_external
WHERE user_external_ratio > avg_external_ratio + (2 * stddev_external)
RETURN outlier.user_id,
       user_external_ratio,
       avg_external_ratio,
       (user_external_ratio - avg_external_ratio) / stddev_external AS z_score;
```

### Bridge Detection

Find accounts that bridge normally disconnected communities (potential money mules):

```gql
// Detect bridge nodes connecting separate clusters
MATCH (bridge:Account)-[:TRANSACTION]-(neighbor:Account)
WITH bridge, COLLECT(DISTINCT neighbor) AS neighbors
WHERE SIZE(neighbors) >= 10

// Check if neighbors are disconnected from each other
WITH bridge, neighbors
WHERE NOT ANY(
  n1 IN neighbors[0..SIZE(neighbors)-1] WHERE
  ANY(
    n2 IN neighbors[1..] WHERE
    n1 <> n2 AND EXISTS((n1)-[:TRANSACTION*1..2]-(n2))
  )
)
RETURN bridge.account_id,
       SIZE(neighbors) AS connected_clusters,
       [n IN neighbors | n.account_id] AS cluster_representatives;
```

## Time-Series Anomaly Detection

### Change Point Detection

Identify sudden changes in activity patterns:

```gql
// Detect sudden spikes in transaction volume
MATCH (a:Account)-[t:TRANSACTION]->()
WITH a,
     date.truncate('day', t.timestamp) AS day,
     COUNT(t) AS daily_count,
     SUM(t.amount) AS daily_amount
ORDER BY a, day

// Calculate moving average and detect deviations
WITH a, day, daily_count, daily_amount,
     AVG(daily_count) OVER (
       PARTITION BY a
       ORDER BY day
       ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
     ) AS avg_count_7d,
     STDDEV(daily_count) OVER (
       PARTITION BY a
       ORDER BY day
       ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
     ) AS stddev_count_7d
WHERE daily_count > avg_count_7d + (3 * stddev_count_7d)
RETURN a.account_id,
       day,
       daily_count,
       avg_count_7d,
       (daily_count - avg_count_7d) / NULLIF(stddev_count_7d, 0) AS z_score
ORDER BY z_score DESC;
```

### Seasonal Anomalies

Detect unusual patterns accounting for seasonality:

```gql
// Compare current week to same week in previous periods
WITH datetime() AS now
MATCH (u:User)-[t:TRANSACTION]->()
WHERE t.timestamp > now.minusDays(7)
WITH u, COUNT(t) AS this_week_count

// Get counts from same week in previous months
MATCH (u)-[historical:TRANSACTION]->()
WHERE historical.timestamp.weekOfYear = datetime().weekOfYear
  AND historical.timestamp.year < datetime().year
WITH u, this_week_count,
     AVG(COUNT(historical)) AS historical_avg,
     STDDEV(COUNT(historical)) AS historical_stddev
WHERE this_week_count > historical_avg + (2 * historical_stddev)
RETURN u.user_id,
       this_week_count,
       historical_avg,
       (this_week_count - historical_avg) / historical_stddev AS z_score;
```

## Real-Time Anomaly Scoring

### Composite Anomaly Score

Combine multiple signals into a risk score:

```gql
// Calculate multi-factor anomaly score for transaction
MATCH (a:Account)-[t:TRANSACTION {transaction_id: $tx_id}]->(m:Merchant)

// Factor 1: Transaction amount vs. account history
MATCH (a)-[hist:TRANSACTION]->()
WHERE hist.timestamp > datetime().minusDays(30)
WITH a, t, m,
     AVG(hist.amount) AS avg_amount,
     STDDEV(hist.amount) AS stddev_amount,
     COUNT(hist) AS tx_count
WITH a, t, m, tx_count,
     CASE
       WHEN tx_count < 5 THEN 0.5  // New account penalty
       WHEN stddev_amount = 0 THEN 0
       ELSE LEAST(ABS(t.amount - avg_amount) / stddev_amount / 3.0, 1.0)
     END AS amount_score

// Factor 2: Merchant category vs. user history
MATCH (a)-[:TRANSACTION]->(:Merchant {category: m.category})
WITH a, t, m, amount_score, COUNT(*) AS category_familiarity
WITH a, t, m, amount_score,
     CASE
       WHEN category_familiarity = 0 THEN 0.8  // Never used this category
       WHEN category_familiarity < 3 THEN 0.4  // Rarely used
       ELSE 0.0
     END AS category_score

// Factor 3: Time of day
WITH a, t, m, amount_score, category_score,
     CASE
       WHEN t.timestamp.hour BETWEEN 2 AND 5 THEN 0.6  // Late night
       WHEN t.timestamp.hour BETWEEN 9 AND 21 THEN 0.0  // Normal hours
       ELSE 0.3
     END AS time_score

// Factor 4: Velocity (transactions in last hour)
MATCH (a)-[recent:TRANSACTION]->()
WHERE recent.timestamp > t.timestamp.minusHours(1)
WITH a, t, m, amount_score, category_score, time_score,
     COUNT(recent) AS recent_tx_count,
     CASE
       WHEN COUNT(recent) > 10 THEN 1.0
       WHEN COUNT(recent) > 5 THEN 0.7
       WHEN COUNT(recent) > 3 THEN 0.4
       ELSE 0.0
     END AS velocity_score

// Combine scores with weights
WITH t,
     (amount_score * 0.4 +
      category_score * 0.25 +
      time_score * 0.15 +
      velocity_score * 0.2) AS composite_score
RETURN t.transaction_id,
       composite_score,
       CASE
         WHEN composite_score > 0.8 THEN 'CRITICAL'
         WHEN composite_score > 0.6 THEN 'HIGH'
         WHEN composite_score > 0.4 THEN 'MEDIUM'
         ELSE 'LOW'
       END AS risk_level;
```

## Machine Learning Integration

### Feature Engineering

Extract graph features for ML models:

```gql
// Extract node features for anomaly detection model
MATCH (a:Account)
OPTIONAL MATCH (a)-[out:TRANSACTION]->()
OPTIONAL MATCH (a)<-[in:TRANSACTION]-()
WITH a,
     COUNT(DISTINCT out) AS out_degree,
     COUNT(DISTINCT in) AS in_degree,
     AVG(out.amount) AS avg_out_amount,
     AVG(in.amount) AS avg_in_amount,
     STDDEV(out.amount) AS stddev_out_amount,
     MAX(out.amount) AS max_out_amount,
     duration.between(MIN(out.timestamp), MAX(out.timestamp)).days AS account_age_days

// Calculate network features
OPTIONAL MATCH (a)-[:TRANSACTION*2]-(indirect:Account)
WITH a, out_degree, in_degree, avg_out_amount, avg_in_amount,
     stddev_out_amount, max_out_amount, account_age_days,
     COUNT(DISTINCT indirect) AS two_hop_neighbors

RETURN a.account_id,
       out_degree,
       in_degree,
       out_degree + in_degree AS total_degree,
       avg_out_amount,
       avg_in_amount,
       stddev_out_amount,
       max_out_amount,
       account_age_days,
       two_hop_neighbors,
       two_hop_neighbors * 1.0 / NULLIF(out_degree + in_degree, 0) AS network_expansion;
```

### Label Propagation for Anomaly Detection

Propagate known fraud labels through the graph:

```gql
// Initialize known fraudulent accounts
MATCH (fraud:Account {is_fraud: true})
SET fraud.fraud_score = 1.0;

// Propagate fraud score to connected accounts
MATCH (fraud:Account {is_fraud: true})-[:TRANSACTION]-(neighbor:Account)
WHERE neighbor.is_fraud IS NULL
WITH neighbor,
     AVG(fraud.fraud_score) AS avg_neighbor_score,
     COUNT(fraud) AS fraud_neighbor_count
SET neighbor.fraud_score = avg_neighbor_score * 0.7,  // Decay factor
    neighbor.fraud_neighbor_count = fraud_neighbor_count;

// Flag high-risk accounts
MATCH (suspicious:Account)
WHERE suspicious.fraud_score > 0.5
  AND suspicious.is_fraud IS NULL
RETURN suspicious.account_id,
       suspicious.fraud_score,
       suspicious.fraud_neighbor_count
ORDER BY suspicious.fraud_score DESC;
```

## Best Practices

1. **Combine Multiple Signals**: Use both statistical and graph-based features for robust detection
2. **Set Context-Aware Thresholds**: Different rules for different account types, regions, or time periods
3. **Handle False Positives**: Implement feedback loops to reduce false alarms over time
4. **Monitor Model Drift**: Regularly retrain models as normal behavior patterns evolve
5. **Real-Time Processing**: Flag high-risk transactions immediately for review
6. **Explainability**: Provide clear reasons why something was flagged as anomalous
7. **Incremental Updates**: Update anomaly scores as new data arrives
8. **Historical Analysis**: Backtest detection rules on labeled historical data
9. **Multi-Layer Defense**: Use both rule-based and ML-based approaches
10. **Privacy-Preserving**: Aggregate patterns without exposing individual behaviors

## Integration with Geode Features

Anomaly detection leverages:

- **Graph Algorithms**: PageRank, community detection, centrality measures
- **Real-Time Analytics**: Stream processing for immediate threat detection
- **Vector Embeddings**: Learn behavioral embeddings for similarity-based detection
- **Temporal Queries**: Analyze time-series patterns and trends
- **Row-Level Security**: Control access to sensitive anomaly detection results

Browse the tagged content below to discover documentation, tutorials, and guides for implementing anomaly detection in your Geode applications.
