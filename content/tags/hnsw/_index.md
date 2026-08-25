---
title: "Tag: Hierarchical Navigable Small World (HNSW)"
description: "Explore Geode documentation tagged with hnsw. Learn about hnsw features, best practices, and implementation details."
keywords:
  - hnsw
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/hnsw/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Documentation tagged with **Hierarchical Navigable Small World (HNSW)** in the Geode graph database. HNSW is an algorithm for approximate nearest neighbor (ANN) search in high-dimensional vector spaces, enabling efficient vector similarity search for machine learning applications.

## Introduction to HNSW

Hierarchical Navigable Small World (HNSW) is a graph-based algorithm for approximate nearest neighbor search that has become the industry standard for vector similarity search. Developed by Yury Malkov and Dmitry Yashunin in 2016, HNSW builds a multi-layer proximity graph that enables logarithmic search complexity while maintaining high recall.

The algorithm solves a critical problem in modern AI applications: how to efficiently search through millions or billions of high-dimensional vectors (embeddings) to find the most similar items. Traditional exact search has O(N) complexity—you must compare against every vector. HNSW achieves sub-linear search time through a clever graph structure.

HNSW is used in:

- **Semantic search**: Find documents similar to a query embedding
- **Recommendation systems**: Discover similar products, content, or users
- **Image search**: Find visually similar images
- **Anomaly detection**: Identify outliers in embedding space
- **Retrieval-Augmented Generation (RAG)**: Find relevant context for LLMs

Geode's HNSW implementation integrates vector search seamlessly with graph queries, enabling powerful combined operations like "find similar products purchased by friends of this user."

## Core HNSW Concepts

### Navigable Small World Graphs

HNSW builds on the concept of "small world" networks—graphs where most nodes can be reached from any other node in a small number of hops, despite the network's large size. Examples include social networks (six degrees of separation) and the World Wide Web.

A navigable small world graph adds long-range connections that enable efficient greedy search:

```
Layer 2:  A -------- B
          |          |
Layer 1:  A -- C -- B -- D
          |    |    |    |
Layer 0:  A-C-E-B-D-F-G-H  (all nodes)
```

Search starts at the top layer (sparse, long-range connections) and descends to lower layers (dense, short-range connections), refining the result at each level.

### Hierarchical Construction

HNSW uses a hierarchical structure with multiple layers:

- **Layer 0**: Contains all vectors with dense connections to nearby neighbors
- **Layer 1+**: Contain progressively fewer vectors, selected probabilistically
- **Top layer**: Has very few nodes, enabling fast initial navigation

Each node's maximum layer is chosen randomly using an exponentially decaying probability:

```
P(layer = l) = (1/M)^l

Where M is typically 4-6, giving:
- 100% of nodes at layer 0
- ~20% of nodes at layer 1
- ~4% of nodes at layer 2
- ~0.8% of nodes at layer 3
```

This creates a logarithmic search structure similar to skip lists.

### Greedy Search Algorithm

HNSW search is beautifully simple:

1. **Start at entry point**: Begin at a random node in the top layer
2. **Greedy local search**: Move to the neighbor closest to the query
3. **Repeat until local minimum**: Stop when no neighbor is closer
4. **Descend layer**: Drop to the next layer, continue search
5. **Return results**: At layer 0, return k nearest neighbors

This achieves O(log N) complexity in practice.

### Construction Algorithm

Building an HNSW index:

1. **For each vector to insert**:
   - Choose maximum layer l randomly
   - Find nearest neighbors using greedy search
   - Connect to M nearest neighbors at each layer
   - Use Mmax connections at layer 0 for higher accuracy
   - Prune connections to maintain navigability

The construction is online—you can add vectors incrementally without rebuilding the entire index.

## How HNSW Works in Geode

### Vector Properties

Store embeddings as node properties:

```gql
-- Create node with embedding
INSERT (:Document {
  id: 'doc-123',
  title: 'Introduction to Graph Databases',
  content: '...',
  embedding: [0.23, -0.45, 0.67, ..., 0.12]  -- 768-dimensional vector
});
```

### Creating HNSW Indexes

Build an HNSW index on vector properties:

```gql
-- Create HNSW index for semantic search
CREATE VECTOR INDEX document_embeddings
FOR (d:Document)
ON (d.embedding)
WITH (metric = 'cosine');
```

Parameters:

- **metric**: Distance metric the index is built for. One of `l2` (default),
  `euclidean`, `cosine`, `dot`, `dot_product`, `inner_product`.

`metric` is the only supported parameter. Vector dimensionality is inferred
from the indexed data, and the HNSW graph parameters (`m`, `ef_construction`,
`ef_search`) are not currently tunable — they use engine-managed defaults and
are reserved for a future release.

### Vector Similarity Search

Query similar vectors:

```gql
-- Find 10 most similar documents to a query embedding
MATCH (d:Document)
WHERE similarity(d.embedding, $query_embedding) > 0.7
RETURN d.title, d.id, similarity(d.embedding, $query_embedding) AS similarity
ORDER BY similarity DESC
LIMIT 10;

-- Or use the k-nearest-neighbour function, which returns the ids of the k
-- closest elements for a vector property
WITH vector_knn('embedding', $query_embedding, 10, 'cosine') AS ids
MATCH (d:Document)
WHERE id(d) IN ids
RETURN d.title, similarity(d.embedding, $query_embedding) AS similarity
ORDER BY similarity DESC;
```

There is no `CALL vector.search(...)` procedure: vector search is expressed with
the vector functions (`similarity()`, `distance()`, `vector_knn()`) inside a
normal `MATCH`.

### Combining Vector and Graph Queries

The real power: integrate vector search with graph traversal:

```gql
-- Find similar products purchased by friends
MATCH (me:User {id: $userId})-[:FRIEND]->(friend:User)
     -[:PURCHASED]->(product:Product)
WHERE similarity(product.embedding, $query_embedding) > 0.8
RETURN DISTINCT product.name,
       similarity(product.embedding, $query_embedding) AS similarity,
       COUNT(DISTINCT friend) AS friend_count
ORDER BY similarity DESC, friend_count DESC
LIMIT 10;

-- Semantic search with metadata filtering
MATCH (doc:Document)
WHERE doc.category = 'technical'
  AND doc.publish_date > date('2024-01-01')
  AND similarity(doc.embedding, $query_embedding) > 0.75
RETURN doc.title, doc.author, similarity(doc.embedding, $query_embedding) AS score
ORDER BY score DESC
LIMIT 20;
```

## Use Cases

### Semantic Search

Find documents by meaning, not just keywords:

```gql
-- Traditional keyword search: misses synonyms, context
MATCH (d:Document)
WHERE d.content CONTAINS 'database'
RETURN d.title;

-- Semantic search: understands meaning
-- $query_embedding is the embedding of "systems for storing data"
WITH vector_knn('embedding', $query_embedding, 10, 'cosine') AS ids
MATCH (d:Document)
WHERE id(d) IN ids
RETURN d.title;
-- Returns documents about databases, even without keyword "database"
```

### Recommendation Systems

Discover similar items:

```gql
-- Content-based recommendations
MATCH (item:Product {id: $productId})
MATCH (similar_product:Product)
WHERE similar_product.id <> $productId
  AND similar_product.in_stock = true
WITH similar_product,
     similarity(similar_product.embedding, item.embedding) AS similarity
WHERE similarity > 0.7
RETURN similar_product.name, similarity
ORDER BY similarity DESC
LIMIT 10;
```

### Retrieval-Augmented Generation (RAG)

Find relevant context for LLM prompts:

```gql
-- Retrieve relevant context for RAG
WITH vector_knn('embedding', $question_embedding, 5, 'cosine') AS ids
MATCH (doc:Document)
WHERE id(doc) IN ids
RETURN doc.content AS context,
       similarity(doc.embedding, $question_embedding) AS similarity
ORDER BY similarity DESC;
```

Pass the returned context to your LLM to ground responses in your knowledge base.

### Anomaly Detection

Identify outliers in embedding space:

```gql
-- Find anomalous user behavior: users whose behaviour embedding is far from
-- every other user's is an outlier
MATCH (u:User)
MATCH (other:User)
WHERE id(other) <> id(u)
WITH u, avg(similarity(u.behavior_embedding, other.behavior_embedding)) AS avg_similarity
WHERE avg_similarity < 0.5  -- Low similarity to the population = anomaly
RETURN u.id, u.name, avg_similarity
ORDER BY avg_similarity ASC;
```

### Image Search

Find visually similar images:

```gql
-- Image similarity using CLIP embeddings
MATCH (img:Image)
WHERE similarity(img.clip_embedding, $query_image_embedding) > 0.85
RETURN img.url, img.caption, similarity(img.clip_embedding, $query_image_embedding) AS similarity
ORDER BY similarity DESC
LIMIT 20;
```

## Best Practices

### Choosing HNSW Parameters

Balance accuracy, speed, and memory:

The HNSW graph parameters (`m`, `ef_construction`, `ef_search`) are managed by
the engine and are not currently exposed as index options. Tune the accuracy,
speed and memory trade-off with the levers you do control:

**metric**: Match the index metric to the function your queries use, otherwise
the index cannot serve the query.

**Query shape**: Pre-filter on labels and properties to shrink the candidate
set, and keep `LIMIT` as small as the application allows.

**Recall**: Loosen the distance threshold and raise `LIMIT`, then re-rank in
the query when you need more relevant results.

**Memory**: Use smaller embeddings (384 dims instead of 768) and index only the
properties you actually search.

### Embedding Generation

Use high-quality embeddings:

1. **Choose appropriate model**:
   - Text: BERT, RoBERTa, sentence-transformers, OpenAI text-embedding-3
   - Images: CLIP, ResNet, EfficientNet
   - Multimodal: CLIP, ALIGN

2. **Normalize embeddings**: For cosine similarity, normalize to unit length

   ```python
   embedding = model.encode(text)
   embedding = embedding / np.linalg.norm(embedding)
   ```

3. **Use consistent dimensions**: All vectors in an index must have same dimensionality

### Index Maintenance

**Incremental updates**: Add vectors as needed

```gql
-- Add new document to existing index
INSERT (:Document {
  id: 'new-doc',
  title: 'New Article',
  embedding: [...]  -- Automatically added to index
});
```

**Rebuild for better quality**: Periodically rebuild for optimal graph structure

```gql
-- Rebuild index
DROP INDEX document_embeddings;
CREATE VECTOR INDEX document_embeddings FOR (d:Document) ON (d.embedding)
WITH (metric = 'cosine');
```

### Query Optimization

**Pre-filter when possible**:

```gql
-- Efficient: Filter before vector search
MATCH (d:Document)
WHERE d.category = 'science'
  AND d.year > 2020
  AND similarity(d.embedding, $query) > 0.8
RETURN d;

-- Less efficient: score every document, then post-filter
MATCH (d:Document)
WITH d, similarity(d.embedding, $query) AS score
WHERE d.category = 'science'  -- Post-filter
RETURN d, score;
```

**Size `k` for the accuracy you need**:

```gql
-- High-recall search: retrieve more candidates, then re-rank
WITH vector_knn('embedding', $q, 100, 'cosine') AS ids
MATCH (d:Document)
WHERE id(d) IN ids
RETURN d, similarity(d.embedding, $q) AS score
ORDER BY score DESC
LIMIT 10;

-- Fast search (may miss some results)
WITH vector_knn('embedding', $q, 10, 'cosine') AS ids
MATCH (d:Document)
WHERE id(d) IN ids
RETURN d;
```

## Performance Characteristics

### Time Complexity

- **Construction**: O(N log N) expected
- **Search**: O(log N) expected
- **Insertion**: O(log N) expected
- **Deletion**: O(log N) expected

### Memory Usage

```
Memory = N * (dimensions * 4 bytes + M * 8 bytes per layer)

Example (1M vectors, 768 dims, engine default M=16):
= 1M * (768 * 4 + 16 * 8 * 2.5 layers)
= 1M * (3,072 + 320)
= 3.4 GB
```

`M` here is the internal HNSW graph degree. It is fixed by the engine and is
not a user-settable index option.

### Performance Benchmarks

Typical performance (10k vectors, 10-NN):

- **Latency**: 1-5ms at ~90% recall
- **Recall@10**: ~90% (parameter dependent)
- **Notes**: Performance varies with result set size, vector dimensions, and hardware

## Monitoring and Troubleshooting

### Index Statistics

There is no `vector.index.*` procedure namespace. Index metadata is exposed
through the standard introspection procedure:

```gql
-- List indexes (name, type, label, properties)
CALL db.indexes();
```

### Query Performance

```gql
-- Profile a vector query
PROFILE
WITH vector_knn('embedding', $q, 10, 'cosine') AS ids
MATCH (d:Document)
WHERE id(d) IN ids
RETURN d, similarity(d.embedding, $q) AS similarity;
```

### Common Issues

**Low recall**: Loosen the distance threshold, raise `LIMIT`/`k` and re-rank

**High latency**: Lower `LIMIT`/`k` or optimize pre-filtering

**Out of memory**: Use smaller embeddings or partition data

**Slow indexing**: Batch inserts and rebuild the index once after a bulk load

## Related Topics

- [Vector Search](/tags/vector-search/) - General vector search capabilities
- [Machine Learning](/tags/machine-learning/) - ML integration
- [Embeddings](/tags/embeddings/) - Working with embeddings
- [Semantic Search](/tags/search/) - Semantic search applications
- [Recommendation Systems](/tags/recommendations/) - Building recommenders
- [BM25 Ranking](/tags/bm25/) - Traditional text search ranking

## Further Reading

- [Vector Search](/tags/vector-search/) - Complete vector search documentation
- [Embeddings](/tags/embeddings/) - Working with embeddings
- [Performance](/docs/performance/) - Performance optimization
- [AI Integration](/tags/ai/) - AI and machine learning integration
- [Original HNSW Paper](https://arxiv.org/abs/1603.09320) - Academic paper

Geode's HNSW implementation brings vector similarity search to graph databases, enabling AI applications that combine semantic understanding with graph relationships.

## Advanced HNSW Implementation Details

### Layer Assignment Probability

HNSW layers are assigned using exponential decay:

```
P(layer = l) = (1/M)^l

For M = 4:
- Layer 0: 100% of nodes
- Layer 1: 25% of nodes
- Layer 2: 6.25% of nodes
- Layer 3: 1.56% of nodes
```

### Connection Strategy

Each node maintains:

- **M connections** at layers > 0
- **2M connections** at layer 0 (base layer for higher recall)

**Heuristic selection**: Choose neighbors that maximize navigability:

```
score(candidate) = distance(query, candidate) - distance(query, current_best)
```

## Query Optimization Strategies

### Adaptive Candidate Sizing

Dynamically adjust search effort with `k`:

```gql
-- High-stakes query: retrieve a deep candidate set and re-rank
WITH vector_knn('embedding', $query, 100, 'cosine') AS ids
MATCH (d:Document)
WHERE id(d) IN ids
RETURN d, similarity(d.embedding, $query) AS similarity
ORDER BY similarity DESC
LIMIT 10;

-- Batch processing: optimize throughput
WITH vector_knn('embedding', $query, 10, 'cosine') AS ids
MATCH (p:Product)
WHERE id(p) IN ids
RETURN p;
```

### Early Termination

The HNSW search-effort parameter (`ef_search`) is not exposed. Widen the
candidate set with `k` instead, and stop as soon as the top score is good
enough:

```python
async def adaptive_vector_search(client, query_emb, min_confidence=0.95):
    for k in [10, 32, 64, 128, 256]:
        results, _ = await client.query("""
            WITH vector_knn('embedding', $query, $k, 'cosine') AS ids
            MATCH (d:Document)
            WHERE id(d) IN ids
            RETURN d, similarity(d.embedding, $query) AS similarity
            ORDER BY similarity DESC
        """, {"query": query_emb, "k": k})

        top_score = results.rows[0]['similarity']
        if top_score >= min_confidence:
            return results.rows  # Early termination

    return results.rows  # Max effort reached
```

## Index Construction Strategies

### Bulk Loading Optimization

Build index from sorted data:

```gql
-- Sort nodes by degree (high-degree nodes first)
MATCH (n:Node)
WITH n, SIZE((n)-[:RELATED]-()) AS degree
ORDER BY degree DESC

-- Insert in batches
CALL {
    WITH n
    SET n.embedding = $computed_embedding
} IN TRANSACTIONS OF 10000 ROWS;

-- Rebuild index after bulk load
DROP INDEX embeddings_idx;
CREATE VECTOR INDEX embeddings_idx FOR (n:Node) ON (n.embedding)
WITH (metric = 'cosine');
```

### Incremental Index Maintenance

```gql
-- Track index quality metric
MATCH (stats:IndexStats {index_name: 'embeddings_idx'})
WITH stats.inserts_since_rebuild AS inserts,
     stats.total_vectors AS total
WITH inserts * 1.0 / total AS insert_ratio
WHERE insert_ratio > 0.1  // 10% growth

-- There is no index-rebuild procedure: drop and recreate the index instead
DROP INDEX embeddings_idx;
CREATE VECTOR INDEX embeddings_idx FOR (n:Node) ON (n.embedding)
WITH (metric = 'cosine');
```

## Distance Metrics Deep Dive

### Cosine Similarity

Best for normalized vectors:

```
cosine(u, v) = (u · v) / (||u|| × ||v||)
             = Σ(ui × vi) / sqrt(Σui²) × sqrt(Σvi²)

Range: [-1, 1]
- 1: Identical direction
- 0: Orthogonal
- -1: Opposite direction
```

**Optimization**: Pre-normalize vectors to unit length, then use dot product:

Geode has no vector-normalization function, so normalize in the client before
writing the property and before binding the query vector:

```gql
-- Vectors are stored already normalized (unit length)
MATCH (n:Node {id: $id})
SET n.embedding = $normalized_embedding;

-- Use dot product (equivalent to cosine for normalized vectors)
MATCH (n:Node)
RETURN n.id, vector_dot(n.embedding, $normalized_query) AS score
ORDER BY score DESC
LIMIT 10;
```

### Euclidean Distance (L2)

Measures absolute distance:

```
euclidean(u, v) = sqrt(Σ(ui - vi)²)

Properties:
- Sensitive to magnitude
- Triangle inequality holds
- Metric space properties
```

### Manhattan Distance (L1)

Sum of absolute differences:

```
manhattan(u, v) = Σ|ui - vi|

Use cases:
- Sparse vectors
- Grid-based distances
- Outlier-robust similarity
```

## Production Deployment Patterns

### Multi-Index Strategy

Separate indexes for different embedding types:

```gql
-- Text embeddings (768d, BERT)
CREATE VECTOR INDEX text_embeddings FOR (d:Document) ON (d.text_embedding)
WITH (metric = 'cosine');

-- Image embeddings (512d, CLIP)
CREATE VECTOR INDEX image_embeddings FOR (p:Product) ON (p.image_embedding)
WITH (metric = 'cosine');

-- User embeddings (128d, custom)
CREATE VECTOR INDEX user_embeddings FOR (u:User) ON (u.behavior_embedding)
WITH (metric = 'euclidean');

-- Query the property backed by the appropriate index
WITH vector_knn('text_embedding', $text_query, 10, 'cosine') AS ids
MATCH (d:Document)
WHERE id(d) IN ids
RETURN d;
```

### Backup and Recovery

Vector indexes have no dedicated export/import/verify procedures — they are
covered by the regular database backup and are rebuilt from the stored vectors:

```gql
-- Inspect the indexes that exist
CALL db.indexes();

-- Recreate an index after restoring data
DROP INDEX embeddings_idx;
CREATE VECTOR INDEX embeddings_idx FOR (n:Node) ON (n.embedding)
WITH (metric = 'cosine');
```

## Benchmarking and Performance

### Recall Measurement

```python
async def measure_recall(client, test_queries, ground_truth, k=10):
    recalls = []

    for query_emb, true_neighbors in zip(test_queries, ground_truth):
        # HNSW approximate search
        results, _ = await client.query("""
            WITH vector_knn('embedding', $query, $k, 'cosine') AS ids
            MATCH (n:TestVector)
            WHERE id(n) IN ids
            RETURN n.id AS id
        """, {"query": query_emb, "k": k})

        retrieved = {row['id'] for row in results.rows}
        relevant = set(true_neighbors[:k])

        recall = len(retrieved & relevant) / k
        recalls.append(recall)

    return np.mean(recalls)

# Typical results with engine-managed graph parameters:
# k=10:  recall@10 ≈ 0.93, latency ≈ 2ms
# k=50:  recall@10 ≈ 0.97, latency ≈ 5ms
# k=200: recall@10 ≈ 0.99, latency ≈ 15ms
```

### Throughput vs Latency Trade-offs

```python
# Latency-optimized (single query)
config_latency = {
    "k": 10,
    "batch_size": 1
}
# Latency and recall depend on dataset, dimensions, and result set size

# Throughput-optimized (batch queries)
config_throughput = {
    "k": 50,
    "batch_size": 100
}
# Throughput and recall depend on dataset, dimensions, and hardware
```

## Further Reading

- **HNSW Original Paper**: Malkov & Yashunin (2016) - Efficient and Robust ANN Search
- **Graph-Based ANN**: NSW, HNSW, NSG, and DiskANN Algorithms
- **Distance Metrics**: Cosine, Euclidean, Inner Product, and Custom Metrics
- **Index Tuning**: Choosing the Right Metric and Query Shape
- **Production Systems**: Scaling to Billions of Vectors

Browse tagged content for comprehensive HNSW and vector search documentation.
