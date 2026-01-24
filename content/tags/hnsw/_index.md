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

Documentation tagged with **Hierarchical Navigable Small World (HNSW)** in the Geode graph database. HNSW is a state-of-the-art algorithm for approximate nearest neighbor (ANN) search in high-dimensional vector spaces, enabling fast and accurate vector similarity search for machine learning applications.

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
OPTIONS {
  dimensions: 768,          -- Embedding dimensionality
  similarity: 'cosine',     -- cosine, euclidean, or dot_product
  m: 16,                    -- Connections per layer
  ef_construction: 200,     -- Build-time search depth
  ef_search: 100            -- Query-time search depth
};
```

Parameters:
- **dimensions**: Vector dimensionality (e.g., 768 for BERT, 1536 for OpenAI)
- **similarity**: Distance metric (cosine, euclidean, dot product)
- **m**: Number of bi-directional connections per node (trade-off: higher = better accuracy but more memory)
- **ef_construction**: Size of candidate set during construction (higher = better quality graph)
- **ef_search**: Size of candidate set during search (higher = better recall but slower)

### Vector Similarity Search

Query similar vectors:

```gql
-- Find 10 most similar documents to a query embedding
MATCH (d:Document)
WHERE vector_similarity(d.embedding, $query_embedding) > 0.7
RETURN d.title, d.id, vector_similarity(d.embedding, $query_embedding) AS similarity
ORDER BY similarity DESC
LIMIT 10;

-- Or use dedicated function
CALL vector.search({
  index: 'document_embeddings',
  query: $query_embedding,
  k: 10,
  ef: 150  -- Override default ef_search for this query
})
YIELD node, similarity
RETURN node.title, similarity;
```

### Combining Vector and Graph Queries

The real power: integrate vector search with graph traversal:

```gql
-- Find similar products purchased by friends
MATCH (me:User {id: $userId})-[:FRIEND]->(friend:User)
     -[:PURCHASED]->(product:Product)
WHERE vector_similarity(product.embedding, $query_embedding) > 0.8
RETURN DISTINCT product.name,
       vector_similarity(product.embedding, $query_embedding) AS similarity,
       COUNT(DISTINCT friend) AS friend_count
ORDER BY similarity DESC, friend_count DESC
LIMIT 10;

-- Semantic search with metadata filtering
MATCH (doc:Document)
WHERE doc.category = 'technical'
  AND doc.publish_date > date('2024-01-01')
  AND vector_similarity(doc.embedding, $query_embedding) > 0.75
RETURN doc.title, doc.author, vector_similarity(doc.embedding, $query_embedding) AS score
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
CALL vector.search({
  index: 'document_embeddings',
  query: $query_embedding,  -- Embedding of "systems for storing data"
  k: 10
})
YIELD node
RETURN node.title;
-- Returns documents about databases, even without keyword "database"
```

### Recommendation Systems

Discover similar items:

```gql
-- Content-based recommendations
MATCH (item:Product {id: $productId})
CALL vector.search({
  index: 'product_embeddings',
  query: item.embedding,
  k: 50
})
YIELD node AS similar_product, similarity
WHERE similar_product.id <> $productId
  AND similar_product.in_stock = true
RETURN similar_product.name, similarity
ORDER BY similarity DESC
LIMIT 10;
```

### Retrieval-Augmented Generation (RAG)

Find relevant context for LLM prompts:

```gql
-- Retrieve relevant context for RAG
CALL vector.search({
  index: 'knowledge_base',
  query: $question_embedding,
  k: 5
})
YIELD node AS doc, similarity
RETURN doc.content AS context, similarity
ORDER BY similarity DESC;
```

Pass the returned context to your LLM to ground responses in your knowledge base.

### Anomaly Detection

Identify outliers in embedding space:

```gql
-- Find anomalous user behavior
MATCH (u:User)
WITH u, u.behavior_embedding AS embedding
CALL vector.search({
  index: 'user_behavior',
  query: embedding,
  k: 10
})
YIELD node, similarity
WITH u, AVG(similarity) AS avg_similarity
WHERE avg_similarity < 0.5  -- Low similarity to nearest neighbors = anomaly
RETURN u.id, u.name, avg_similarity
ORDER BY avg_similarity ASC;
```

### Image Search

Find visually similar images:

```gql
-- Image similarity using CLIP embeddings
MATCH (img:Image)
WHERE vector_similarity(img.clip_embedding, $query_image_embedding) > 0.85
RETURN img.url, img.caption, vector_similarity(img.clip_embedding, $query_image_embedding) AS similarity
ORDER BY similarity DESC
LIMIT 20;
```

## Best Practices

### Choosing HNSW Parameters

Balance accuracy, speed, and memory:

**M (connections per layer)**:
- Low (4-8): Faster search, lower memory, lower recall
- Medium (12-24): Balanced (recommended for most cases)
- High (32-64): Better recall, more memory, slightly slower

**ef_construction**:
- Low (50-100): Faster index build, lower quality graph
- Medium (100-200): Balanced (recommended)
- High (400-800): Slower build, higher quality graph

**ef_search**:
- Low (10-50): Faster search, lower recall
- Medium (50-150): Balanced
- High (200-500): Better recall, slower search
- Can be adjusted per-query based on accuracy requirements

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
-- Rebuild index with new parameters
DROP INDEX document_embeddings;
CREATE VECTOR INDEX document_embeddings FOR (d:Document) ON (d.embedding)
OPTIONS {m: 20, ef_construction: 300};
```

### Query Optimization

**Pre-filter when possible**:
```gql
-- Efficient: Filter before vector search
MATCH (d:Document)
WHERE d.category = 'science'
  AND d.year > 2020
  AND vector_similarity(d.embedding, $query) > 0.8
RETURN d;

-- Less efficient: Vector search then filter
CALL vector.search({...})
YIELD node
WHERE node.category = 'science'  -- Post-filter
RETURN node;
```

**Adjust ef_search for accuracy needs**:
```gql
-- High-recall search (slower)
CALL vector.search({index: '...', query: $q, k: 10, ef: 500})
YIELD node, similarity;

-- Fast search (may miss some results)
CALL vector.search({index: '...', query: $q, k: 10, ef: 50})
YIELD node, similarity;
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

Example (1M vectors, 768 dims, M=16):
= 1M * (768 * 4 + 16 * 8 * 2.5 layers)
= 1M * (3,072 + 320)
= 3.4 GB
```

### Throughput Benchmarks

Typical performance (1M vectors, 768 dimensions):

- **QPS (queries per second)**: 1,000-10,000 depending on ef_search
- **Recall@10**: 95-99% depending on parameters
- **Latency p99**: 1-10ms depending on ef_search

## Monitoring and Troubleshooting

### Index Statistics

```gql
-- Check index statistics
CALL vector.index.stats('document_embeddings')
YIELD vectors, memory_mb, avg_connections, max_layer
RETURN vectors, memory_mb, avg_connections, max_layer;
```

### Query Performance

```gql
-- Profile vector query
PROFILE CALL vector.search({index: '...', query: $q, k: 10})
YIELD node, similarity
RETURN node, similarity;
```

### Common Issues

**Low recall**: Increase ef_search or rebuild with higher M/ef_construction

**High latency**: Decrease ef_search or optimize pre-filtering

**Out of memory**: Reduce M, use smaller embeddings, or partition data

**Slow indexing**: Reduce ef_construction or batch inserts

## Related Topics

- [Vector Search](/tags/vector-search/) - General vector search capabilities
- [Machine Learning](/tags/machine-learning/) - ML integration
- [Embeddings](/tags/embeddings/) - Working with embeddings
- [Semantic Search](/tags/search/) - Semantic search applications
- [Recommendation Systems](/tags/recommendations/) - Building recommenders
- [BM25 Ranking](/tags/bm25/) - Traditional text search ranking

## Further Reading

- [Vector Search Guide](/docs/vector-search/) - Complete vector search documentation
- [Embeddings Tutorial](/docs/embeddings-tutorial/) - Working with embeddings
- [Performance Tuning](/docs/performance-tuning/) - HNSW optimization
- [RAG with Geode](/docs/rag-tutorial/) - Retrieval-Augmented Generation
- [Original HNSW Paper](https://arxiv.org/abs/1603.09320) - Academic paper

Geode's HNSW implementation brings state-of-the-art vector similarity search to graph databases, enabling powerful AI applications that combine semantic understanding with graph relationships.
