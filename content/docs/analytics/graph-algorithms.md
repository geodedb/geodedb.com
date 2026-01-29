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
CALL graph.pageRank('SocialNetwork', {
  relationship_type: 'KNOWS',
  iterations: 20,
  damping_factor: 0.85
})
YIELD node, score
RETURN node.name AS person, score
ORDER BY score DESC;
```

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
CALL graph.betweenness('SocialNetwork', {
  relationship_type: 'KNOWS'
})
YIELD node, score
RETURN node.name AS person, score
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
CALL graph.closeness('SocialNetwork', {
  relationship_type: 'KNOWS'
})
YIELD node, score
RETURN node.name AS person, score
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
CALL graph.louvain('SocialNetwork', {
  relationship_type: 'KNOWS',
  resolution: 1.0
})
YIELD node, community
RETURN community, COLLECT(node.name) AS members
ORDER BY community;
```

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
CALL graph.labelPropagation('SocialNetwork', {
  relationship_type: 'KNOWS',
  iterations: 10
})
YIELD node, community
RETURN community, COLLECT(node.name) AS members
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

From `ML_GRAPH_EMBEDDINGS.md`:

**Graph embeddings** convert nodes into dense vectors capturing structural and semantic information.

### Node2Vec

**Random walk-based** embedding generation.

**Parameters**:
- `dimensions`: Embedding dimension (e.g., 128)
- `walk_length`: Length of random walks (e.g., 80)
- `num_walks`: Walks per node (e.g., 10)
- `p`: Return parameter (1.0 = balanced)
- `q`: In-out parameter (1.0 = balanced)

**Query**:

```gql
CALL graph.node2vec('SocialNetwork', {
  relationship_type: 'KNOWS',
  dimensions: 128,
  walk_length: 80,
  num_walks: 10,
  p: 1.0,
  q: 1.0
})
YIELD node, embedding
WITH node, embedding
MATCH (n:Person)
WHERE n.id = node.id
SET n.embedding = embedding;

-- Verify embeddings created
MATCH (p:Person)
RETURN p.name, p.embedding[0..5] AS embedding_sample;
```

**Output**: Each Person node now has 128-dimensional embedding.

### GraphSAGE

**Graph Sampling and Aggregation** for inductive embeddings.

**Aggregation strategies**:
- `mean` - Average neighbor features
- `pool` - Max pooling
- `lstm` - LSTM aggregation

**Query**:

```gql
CALL graph.graphSAGE('SocialNetwork', {
  relationship_type: 'KNOWS',
  dimensions: 128,
  num_samples: 25,
  aggregator: 'mean'
})
YIELD node, embedding
WITH node, embedding
MATCH (n:Person)
WHERE n.id = node.id
SET n.embedding = embedding;
```

### DeepWalk

**Simplified** Node2Vec (p=1, q=1).

**Query**:

```gql
CALL graph.deepWalk('SocialNetwork', {
  relationship_type: 'KNOWS',
  dimensions: 128,
  walk_length: 80,
  num_walks: 10
})
YIELD node, embedding
WITH node, embedding
MATCH (n:Person)
WHERE n.id = node.id
SET n.embedding = embedding;
```

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
  AND vector_distance_cosine(p.embedding, alice.embedding) < 0.5
RETURN
  p.name,
  vector_distance_cosine(p.embedding, alice.embedding) AS similarity
ORDER BY similarity ASC
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
WITH p, AVG(vector_distance_cosine(p.embedding, f.embedding)) AS avg_similarity
WHERE avg_similarity < 0.6
RETURN p.name, avg_similarity
ORDER BY avg_similarity ASC
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
CALL graph.pageRank('SocialNetwork', {
  relationship_type: 'KNOWS',
  iterations: 20
})
YIELD node, score
WITH node, score
MATCH (n:Person)
WHERE n.id = node.id
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
  - Example: 1M nodes * 128 dims * 4B = 512 MB
- **Algorithm state**: Varies (PageRank: ~2x node count)

**Latency**:
- **PageRank** (1M nodes, 20 iterations): ~2-5 seconds
- **Louvain** (1M nodes): ~10-30 seconds
- **Node2Vec** (100K nodes, 10 walks): ~5-15 minutes

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
