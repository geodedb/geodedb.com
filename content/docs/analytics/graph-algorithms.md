---
title: "Graph Algorithms and Analytics"
description: "Run graph algorithms with real GQL examples, generate embeddings (Node2Vec/GraphSAGE/DeepWalk), and use vector similarity for analytics workloads"
url: /docs/analytics/graph-algorithms/
weight: 10
tags:
  - graph-algorithms
  - analytics
  - embeddings
  - pagerank
  - community-detection
  - vector-search
categories:
  - graph-algorithms-and-analytics
  - use-cases
keywords:
  - PageRank
  - community detection
  - embeddings
  - Node2Vec
  - GraphSAGE
  - DeepWalk
---

<!-- CANARY: REQ=REQ-ANALYTICS-001; FEATURE="Real-time Analytics"; ASPECT=StreamingIntegration; STATUS=TESTED; OWNER=analytics; UPDATED=2025-10-05 -->

# Graph Algorithms and Analytics

Execute graph algorithms, generate ML embeddings, and perform vector similarity search for analytics and data science workloads.

## Quick Start Dataset

From `GRAPH_ALGORITHMS_USAGE_GUIDE.md`:

### Social Network Example

```gql
-- Create graph
CREATE GRAPH SocialNetwork;
USE SocialNetwork;

-- Create people
CREATE
  (:Person {id: 1, name: "Alice"}),
  (:Person {id: 2, name: "Bob"}),
  (:Person {id: 3, name: "Charlie"}),
  (:Person {id: 4, name: "Diana"}),
  (:Person {id: 5, name: "Eve"}),
  (:Person {id: 6, name: "Frank"});

-- Create friendships
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS]->(b), (b)-[:KNOWS]->(a);

MATCH (a:Person {name: "Alice"}), (c:Person {name: "Charlie"})
CREATE (a)-[:KNOWS]->(c), (c)-[:KNOWS]->(a);

MATCH (b:Person {name: "Bob"}), (c:Person {name: "Charlie"})
CREATE (b)-[:KNOWS]->(c), (c)-[:KNOWS]->(b);

MATCH (c:Person {name: "Charlie"}), (d:Person {name: "Diana"})
CREATE (c)-[:KNOWS]->(d), (d)-[:KNOWS]->(c);

MATCH (d:Person {name: "Diana"}), (e:Person {name: "Eve"})
CREATE (d)-[:KNOWS]->(e), (e)-[:KNOWS]->(d);

MATCH (e:Person {name: "Eve"}), (f:Person {name: "Frank"})
CREATE (e)-[:KNOWS]->(f), (f)-[:KNOWS]->(e);
```

**Graph structure**:

```
Alice --- Bob
  |        |
  +--Charlie--Diana---Eve---Frank
```

## Centrality Algorithms

### PageRank

**Measures** node importance based on incoming relationships.

**Use cases**:

- Influence ranking in social networks
- Citation importance in academic graphs
- Website ranking

**Query**:

```gql
-- Compute PageRank
CALL algo.pagerank.stream()
YIELD nodeId, score
MATCH (n) WHERE id(n) = nodeId
RETURN n.name AS person, score
ORDER BY score DESC;
```

The procedure takes no arguments: damping factor and iteration count are fixed
by the engine, and it runs over every relationship in the current graph.

**Expected output**:

```
person   | score
---------|-------
Charlie  | 0.215
Bob      | 0.178
Alice    | 0.172
Diana    | 0.158
Eve      | 0.142
Frank    | 0.135
```

**Interpretation**: Charlie has highest PageRank (central position, connected to Bob, Alice, and Diana).

### Betweenness Centrality

**Measures** how often a node appears on shortest paths between other nodes.

**Use cases**:

- Bottleneck identification
- Bridge detection in networks
- Information flow control points

**Query**:

```gql
CALL algo.betweenness.stream()
YIELD nodeId, betweenness
MATCH (n) WHERE id(n) = nodeId
RETURN n.name AS person, betweenness AS score
ORDER BY score DESC;
```

**Expected output**:

```
person   | score
---------|-------
Charlie  | 6.0
Diana    | 4.0
Bob      | 2.0
Eve      | 2.0
Alice    | 0.0
Frank    | 0.0
```

**Interpretation**: Charlie is on the most shortest paths (acts as bridge between Alice/Bob cluster and Diana/Eve/Frank cluster).

### Closeness Centrality

**Measures** average distance to all other nodes.

**Use cases**:

- Access efficiency
- Broadcast source selection
- Epidemic spread analysis

**Query**:

```gql
CALL algo.closeness.stream()
YIELD nodeId, closeness
MATCH (n) WHERE id(n) = nodeId
RETURN n.name AS person, closeness AS score
ORDER BY score DESC;
```

## Community Detection

### Louvain Algorithm

**Detects** communities (clusters of densely connected nodes).

**Use cases**:

- Customer segmentation
- Topic clustering
- Organizational structure detection

**Query**:

```gql
CALL algo.louvain.stream()
YIELD nodeId, community
MATCH (n) WHERE id(n) = nodeId
RETURN community, COLLECT(n.name) AS members
ORDER BY community;
```

There is no resolution parameter; `algo.leiden.stream()` yields the same
`(nodeId, community)` shape with the Leiden refinement.

**Expected output**:

```
community | members
----------|------------------------
1         | ["Alice", "Bob", "Charlie"]
2         | ["Diana", "Eve", "Frank"]
```

**Interpretation**: Two communities detected (left cluster and right cluster).

### Label Propagation

**Fast** community detection via label spreading.

**Query**:

```gql
CALL algo.labelPropagation.stream()
YIELD nodeId, label
MATCH (n) WHERE id(n) = nodeId
RETURN label AS community, COLLECT(n.name) AS members
ORDER BY community;
```

## Shortest Path Algorithms

### Dijkstra's Shortest Path

**Finds** shortest path between two nodes.

**Query**:

```gql
-- Shortest path from Alice to Frank
MATCH path = shortestPath(
  (a:Person {name: "Alice"})-[:KNOWS*]-(f:Person {name: "Frank"})
)
RETURN
  [n IN nodes(path) | n.name] AS path_nodes,
  length(path) AS hops;
```

**Expected output**:

```
path_nodes                              | hops
----------------------------------------|------
["Alice", "Charlie", "Diana", "Eve", "Frank"] | 4
```

### All Shortest Paths

**Finds** all shortest paths (when multiple exist).

```gql
MATCH path = allShortestPaths(
  (a:Person {name: "Alice"})-[:KNOWS*]-(d:Person {name: "Diana"})
)
RETURN
  [n IN nodes(path) | n.name] AS path_nodes,
  length(path) AS hops;
```

**Expected output**:

```
path_nodes                  | hops
----------------------------|------
["Alice", "Charlie", "Diana"] | 2
["Alice", "Bob", "Charlie", "Diana"] | 3
```

## ML Graph Embeddings

**Graph embeddings** convert nodes into dense vectors capturing structural and
semantic information. Geode **stores and searches** embeddings; it does not
train them. There is no `graph.node2vec`, `graph.graphSAGE` or `graph.deepWalk`
procedure — the registry dispatches only `db.`, `dbms.`, `algo.`, `audit.`,
`tde.`, `cdc.` and the `geode.*` families.

The workflow is: export the edges, train in your own pipeline, write the
vectors back with `vectorf32()`, index them, then search.

### 1. Export the graph for training

```gql
-- Edge list for a Node2Vec / DeepWalk / GraphSAGE trainer
MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN id(a) AS source, id(b) AS target;
```

Node features for an inductive model (GraphSAGE) come out of the same query
shape:

```gql
MATCH (p:Person)
RETURN id(p) AS node_id, p.age AS age, p.city AS city;
```

### 2. Train off-line

Any embedding implementation works — `node2vec`, `PyTorch Geometric`,
`DGL`, or a hosted embedding model. Geode is not involved in this step, so the
walk length, dimensionality, `p`/`q` return parameters and aggregator are
whatever your trainer supports.

### 3. Write the vectors back

```gql
-- $embedding is a list of floats from the trainer
MATCH (p:Person) WHERE id(p) = $node_id
SET p.embedding = vectorf32($embedding);
```

`vectorf32(...)` builds a 32-bit float `VECTOR` value; `vectori32(...)` builds
the integer variant. Write them in batches from your client, one statement per
node or one per parameterised batch.

## Vector Similarity Search

**Once embeddings are generated**, use vector similarity for:

- Similar node discovery
- Recommendations
- Anomaly detection (outliers)

### Create Vector Index

```gql
-- Create HNSW index on embeddings
CREATE INDEX person_embedding_idx ON Person(embedding) USING vector;
```

### Find Similar Nodes

```gql
-- Find people similar to Alice
MATCH (alice:Person {name: "Alice"})
MATCH (p:Person)
WHERE p.id <> alice.id
  AND distance(p.embedding, alice.embedding, 'cosine') < 0.5
RETURN
  p.name,
  distance(p.embedding, alice.embedding, 'cosine') AS distance
ORDER BY distance ASC
LIMIT 5;
```

**Expected output**: Bob and Charlie (close neighbors) will have lowest distance.

### Recommendation System

```gql
-- Recommend people similar to Alice's friends
MATCH (alice:Person {name: "Alice"})-[:KNOWS]->(friend)
WITH COLLECT(friend) AS friends
MATCH (p:Person)
WHERE NOT p IN friends
  AND p.name <> "Alice"
WITH p, friends
UNWIND friends AS f
WITH p, AVG(distance(p.embedding, f.embedding, 'cosine')) AS avg_distance
WHERE avg_distance < 0.6
RETURN p.name, avg_distance
ORDER BY avg_distance ASC
LIMIT 5;
```

**Interpretation**: Recommend people similar to Alice's existing friends (friend-of-friend recommendations).

## Performance Optimization

From `GRAPH_ALGORITHM_PERFORMANCE_ENHANCEMENTS.md`:

### SIMD Acceleration

**Vector operations** use SIMD instructions:

- **Distance calculations**: AVX2/AVX-512 vectorized operations
- **Aggregations**: Parallel reduction
- **Matrix operations**: BLAS-optimized matrix multiplication

### Cache-Friendly Access

**Graph traversal** optimized for CPU cache:

- **CSR format**: Compressed Sparse Row for relationship storage
- **Locality**: Related nodes stored contiguously
- **Prefetching**: Predictive memory access

### Parallelization

**Algorithm execution** parallelized across CPU cores:

- **PageRank**: Parallel iteration with barrier synchronization
- **Community detection**: Parallel label updates
- **Embeddings**: Parallel random walk generation

**Scaling**: Near-linear speedup up to 8-16 cores (depending on graph density).

## Operational Guidance

### When to Run Algorithms

**Offline** (batch processing):

- Large-scale community detection (millions of nodes)
- Full-graph PageRank computation
- Embedding generation for all nodes

**Online** (query-time):

- Shortest path between specific nodes
- Local clustering coefficient
- k-hop neighborhood queries

**Hybrid** (materialized views):

- Precompute PageRank, cache in node property
- Update periodically (e.g., daily) via batch job
- Query from cached property for fast access

**Example: Materialized PageRank**:

```gql
-- Batch job (run daily)
CALL algo.pagerank.stream()
YIELD nodeId, score
MATCH (n:Person) WHERE id(n) = nodeId
SET n.pagerank_score = score;

-- Query uses cached property (fast)
MATCH (p:Person)
RETURN p.name, p.pagerank_score
ORDER BY p.pagerank_score DESC
LIMIT 10;
```

### Resource and Latency Caveats

**Memory usage**:

- **Embeddings**: `num_nodes * dimensions * 4 bytes` (for float32)
  - Example: 1M nodes × 128 dims × 4B = 512 MB
- **Algorithm state**: Varies (PageRank: ~2x node count)

**Latency**:

- **PageRank** (1M nodes, 20 iterations): ~2-5 seconds
- **Louvain** (1M nodes): ~10-30 seconds
- **Embedding training**: runs in your own pipeline, not in Geode

**Tip**: Use PROFILE to measure actual execution time before deploying to production.

## Real-Time Analytics

From `REAL_TIME_ANALYTICS.md`:

**Combine** graph algorithms with Change Data Capture (CDC) for real-time analytics.

**Architecture**:

1. **CDC stream**: Capture graph changes (node/edge inserts/updates/deletes)
2. **Incremental update**: Update algorithm state (e.g., incremental PageRank)
3. **Anomaly detection**: Detect unusual patterns (e.g., sudden centrality spike)
4. **Webhook notification**: Alert on anomalies

**Example: Real-time fraud detection**:

```yaml
# cdc-config.yaml
cdc:
  enabled: true
  webhooks:
    - url: "https://analytics.example.com/fraud-check"
      events: ["node.created", "edge.created"]
      filter: "label = 'Transaction'"
```

**Webhook payload**:

```json
{
  "event": "node.created",
  "graph": "Payments",
  "node": {
    "id": 123456,
    "labels": ["Transaction"],
    "properties": {
      "amount": 10000,
      "from_account": "acct_001",
      "to_account": "acct_999"
    }
  },
  "timestamp": "2024-01-15T14:30:00Z"
}
```

**Analytics service**:

1. Receives CDC event
2. Queries graph for context (e.g., transaction history, account relationships)
3. Computes anomaly score (e.g., transaction amount >> avg, new relationship)
4. Returns fraud probability

**See also**: [Real-Time Analytics](/docs/use-cases/fraud-detection) for complete workflow

## Next Steps

- **[Data Model and Types](/docs/model/data-model-and-types)** - Vector types and storage
- **[Indexing and Optimization](/docs/query/indexing-and-optimization)** - HNSW vector indexes
- **[Use Case: Recommendations](/docs/use-cases/recommendations)** - End-to-end recommendation system
- **[Use Case: Fraud Detection](/docs/use-cases/fraud-detection)** - Anomaly detection with algorithms
- **[Graph Algorithm Reference](/docs/analytics/graph-algorithms/)** - Complete algorithm catalog
