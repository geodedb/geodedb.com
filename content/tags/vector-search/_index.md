---
title: "Vector Similarity Search"
description: "Explore Geode documentation tagged with vector-search. Learn about vector-search features, best practices, and implementation details."
keywords:
  - vector-search
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/vector-search/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Vector Similarity Search in Geode

Vector similarity search is a powerful feature in Geode that enables efficient nearest-neighbor queries over high-dimensional vector embeddings stored directly in graph properties. This capability is essential for modern machine learning applications including semantic search, recommendation systems, image similarity, and retrieval-augmented generation (RAG) workloads.

## Introduction to Vector Search

Vector search addresses the challenge of finding similar items in high-dimensional space. Instead of exact matching, vector search uses distance metrics (cosine similarity, Euclidean distance, dot product) to find the k-nearest neighbors to a query vector. This technology powers applications like:

- **Semantic Search**: Finding documents or content with similar meaning, not just matching keywords
- **Recommendation Engines**: Identifying items similar to user preferences
- **Image and Video Search**: Finding visually similar media by comparing embedding vectors
- **Anomaly Detection**: Identifying outliers by measuring distance from normal patterns
- **Question Answering**: Retrieving relevant context for large language models (LLMs)

Traditional exact nearest-neighbor search has O(n) complexity, making it impractical for large datasets. Geode uses Hierarchical Navigable Small World (HNSW) graphs to achieve approximate nearest-neighbor (ANN) search with logarithmic complexity.

## Geode's Vector Search Implementation

Geode implements vector search as native graph capabilities through several components:

### HNSW Index Integration

HNSW indexes are stored alongside graph data, allowing seamless integration of vector search with graph traversals. Properties containing vector data can be indexed using:

```gql
CREATE INDEX product_embeddings
ON Product(embedding) USING vector
WITH (metric = 'cosine');
```

**Parameters explained**:

- `metric`: Distance function the index is built for. One of `l2` (default),
  `euclidean`, `cosine`, `dot`, `dot_product`, `inner_product`.

`metric` is the only supported parameter. Vector dimensionality is inferred
from the indexed data, and the HNSW graph parameters (`m`, `ef_construction`,
`ef_search`) are not currently tunable — they use engine-managed defaults and
are reserved for a future release.

### Native GQL Vector Functions

Geode extends GQL with vector search functions that integrate naturally with pattern matching:

```gql
MATCH (p:Product)
WHERE similarity(p.embedding, $query_vector, 'cosine') > 0.8
RETURN p.name, p.description
ORDER BY similarity(p.embedding, $query_vector, 'cosine') DESC
LIMIT 10;
```

### Hybrid Search: Combining Graph and Vector Queries

Geode's unique advantage is combining graph topology with vector similarity:

```gql
-- Find similar products in the same category
MATCH (category:Category {name: 'Electronics'})-[:CONTAINS]->(p:Product)
WITH p, similarity(p.embedding, $query_vector, 'cosine') AS similarity
WHERE similarity > 0.75
RETURN p.name, similarity
ORDER BY similarity DESC
LIMIT 5;
```

```gql
-- Collaborative filtering with vector search
MATCH (user:User {id: $user_id})-[:PURCHASED]->(past:Product)
WITH collect(past.embedding) AS user_history
MATCH (candidate:Product)
WHERE NOT (user)-[:PURCHASED]->(candidate)
WITH candidate, avg([emb IN user_history |
  similarity(candidate.embedding, emb, 'cosine')]) AS avg_similarity
WHERE avg_similarity > 0.7
RETURN candidate.name, avg_similarity
ORDER BY avg_similarity DESC
LIMIT 10;
```

## Use Cases and Code Examples

### Use Case 1: Semantic Document Search

Store document embeddings generated from sentence transformers or OpenAI models:

```python
from geode_client import Client
import asyncio

async def create_document_index():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Create schema with vector index
        await conn.execute("""
            CREATE VECTOR INDEX doc_embeddings
            ON Document(embedding)
            WITH (metric = 'cosine');
        """)

        # Insert documents with embeddings
        await conn.execute("""
            CREATE (d:Document {
                title: 'Introduction to Graph Databases',
                content: 'Graph databases model data as nodes and relationships...',
                embedding: $embedding
            })
        """, {"embedding": generate_embedding("Graph databases model...")})

async def semantic_search(query_text):
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        query_embedding = generate_embedding(query_text)

        result, _ = await conn.query("""
            MATCH (d:Document)
            WITH d, similarity(d.embedding, $query_emb, 'cosine') AS score
            WHERE score > 0.6
            RETURN d.title, d.content, score
            ORDER BY score DESC
            LIMIT 5
        """, {"query_emb": query_embedding})

        for row in result.rows:
            print(f"{row['score']:.3f} - {row['title']}")
```

### Use Case 2: Product Recommendations with Knowledge Graph

Combine product similarity with graph relationships:

```gql
-- Find products similar to items in cart, considering brand preferences
MATCH (user:User {id: $user_id})-[:PREFERS]->(brand:Brand)
MATCH (brand)-[:MANUFACTURES]->(product:Product)
MATCH (cart_item:Product {id: $cart_item_id})
WITH product, cart_item,
     similarity(product.embedding, cart_item.embedding, 'cosine') AS similarity
WHERE similarity > 0.7 AND product.id <> cart_item.id
RETURN product.name, product.price, similarity
ORDER BY similarity DESC
LIMIT 5;
```

### Use Case 3: Image Similarity Search

Use image embeddings from models like CLIP or ResNet:

```python
async def find_similar_images(image_path, limit=10):
    embedding = image_encoder.encode(image_path)  # Generate embedding

    client = Client(host="localhost", port=3141)

    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (img:Image)
            WITH img, distance(img.embedding, $query_emb, 'euclidean') AS distance
            WHERE distance < 0.5
            RETURN img.url, img.tags, distance
            ORDER BY distance ASC
            LIMIT $limit
        """, {"query_emb": embedding, "limit": limit})

        return result.bindings
```

## Best Practices

### Choosing Index Parameters

**Dimensions**: Match your embedding model exactly:

- Sentence transformers: 384, 768, 1024
- OpenAI ada-002: 1536
- CLIP: 512 or 768
- Custom models: verify output shape

**Metric selection**:

- **Cosine**: Best for normalized embeddings (most common)
- **Euclidean**: When magnitude matters
- **Dot product**: For sparse vectors or specific models

**HNSW tuning**:

- The graph parameters (`m`, `ef_construction`, `ef_search`) are not currently
  tunable and are reserved for a future release
- Tune recall and latency with the distance threshold, `LIMIT` and pre-filtering

### Embedding Generation

**Consistency is critical**:

```python
# WRONG: Different models or preprocessing
doc_embedding = model_v1.encode(text)
query_embedding = model_v2.encode(query)  # Won't match!

# RIGHT: Same model and preprocessing
def generate_embedding(text):
    normalized = text.lower().strip()
    return sentence_transformer.encode(normalized)
```

**Batch processing for efficiency**:

```python
async def index_documents_batch(documents, batch_size=100):
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            embeddings = model.encode([d.text for d in batch])

            for doc, emb in zip(batch, embeddings):
                await conn.execute("""
                    CREATE (d:Document {
                        id: $id,
                        text: $text,
                        embedding: $emb
                    })
                """, {"id": doc.id, "text": doc.text, "emb": emb.tolist()})
```

### Query Optimization

**Use appropriate similarity thresholds**:

```gql
-- Too restrictive: May return no results
WHERE similarity(n.emb, $query, 'cosine') > 0.95

-- Too permissive: Returns irrelevant results
WHERE similarity(n.emb, $query, 'cosine') > 0.3

-- Just right: Adjust based on your data
WHERE similarity(n.emb, $query, 'cosine') > 0.7
```

**Limit result sets**:

```gql
-- HNSW is optimized for top-k queries
MATCH (d:Document)
WITH d, similarity(d.embedding, $query, 'cosine') AS score
ORDER BY score DESC
LIMIT 20  -- HNSW explores only as needed
```

## Performance Considerations

### Indexing Performance

**Build time scales with dataset size**:

- 100K vectors: ~1-2 minutes
- 1M vectors: ~15-30 minutes
- 10M vectors: ~3-5 hours

**Memory requirements**:

- Base: `num_vectors * dimensions * 4 bytes` (float32)
- HNSW overhead: `num_vectors * m * 16 * 4 bytes`
- Example: 1M vectors × 768D × 16M = ~50GB RAM

**Incremental indexing**:

```gql
-- Create index first
CREATE INDEX CONCURRENTLY product_embeddings
ON Product(embedding) USING vector
WITH (metric = 'cosine');

-- Insert nodes normally; index updates incrementally
CREATE (p:Product {name: 'New Item', embedding: $emb});
```

### Query Performance

**Typical latency** (10k vectors, 10-NN):

- Single vector search: 1-5ms at ~90% recall
- Combined graph + vector: workload-dependent (varies by traversal and filters)
- Batch queries: throughput depends on workload and hardware

**Tuning runtime accuracy**: search-effort settings are not exposed. Control
the accuracy/latency trade-off with the result set size instead:

```gql
MATCH (d:Document)
WITH d, similarity(d.embedding, $query, 'cosine') AS score
ORDER BY score DESC
LIMIT 10;
```

### Scaling Vector Search

**Horizontal scaling**:

- Partition large datasets by category or domain
- Use graph structure to route queries to relevant partitions
- Combine results from distributed searches

**Caching strategies**:

```python
# Cache frequently queried embeddings
embedding_cache = {}

async def cached_search(query_text):
    cache_key = hash(query_text)
    if cache_key not in embedding_cache:
        embedding_cache[cache_key] = generate_embedding(query_text)

    return await search_by_vector(embedding_cache[cache_key])
```

## Troubleshooting

### Poor Search Quality

**Problem**: Results aren't relevant
**Solutions**:

1. Verify embedding model consistency
2. Check vector normalization (cosine requires normalized vectors)
3. Adjust similarity threshold
4. Retrain or upgrade embedding model

**Problem**: Slow query performance
**Solutions**:

1. Increase `m` parameter (rebuild index)
2. Add filters before vector search to reduce candidate set
3. Use EXPLAIN to identify bottlenecks
4. Consider partitioning large datasets

**Problem**: High memory usage
**Solutions**:

1. Reduce `m` parameter (less accuracy, less memory)
2. Use lower-dimensional embeddings if possible
3. Partition data across multiple nodes
4. Use dimensionality reduction (PCA, UMAP)

### Index Maintenance

**Monitoring index health**:

```gql
SHOW INDEXES WHERE name = 'product_embeddings';
-- Returns: size, num_vectors, build_status
```

**Rebuilding indexes**:

```gql
-- If the index becomes corrupted or the metric needs changing
DROP INDEX product_embeddings;
CREATE INDEX product_embeddings ON Product(embedding) USING vector
WITH (metric = 'cosine');
```

## Related Topics

- **[HNSW](/tags/hnsw/)**: Deep dive into Hierarchical Navigable Small World algorithm
- **[Machine Learning](/tags/machine-learning/)**: ML integration patterns with Geode
- **[Embeddings](/tags/embeddings/)**: Best practices for generating and storing embeddings
- **[Performance](/tags/performance/)**: General performance optimization techniques
- **[Indexing](/tags/indexing/)**: Overview of all index types in Geode
- **[Recommendations](/tags/recommendations/)**: Building recommendation systems

## Further Reading

- **HNSW Paper**: "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs" (Malkov & Yashunin, 2018)
- **Sentence Transformers**: <https://www.sbert.net/> - Popular embedding models
- **OpenAI Embeddings**: <https://platform.openai.com/docs/guides/embeddings>
- **Geode Vector Search Guide**: `/docs/advanced-features/vector-search/`
- **Performance Tuning**: `/docs/performance/vector-optimization/`

## Advanced Vector Search Techniques

### Hybrid Dense-Sparse Search

Combine vector similarity with keyword matching:

```gql
-- Hybrid search: HNSW + BM25
-- NOTE: geode.fts.search takes string literals only; a $parameter
-- is rejected. Interpolate the term client-side before sending.
CALL geode.fts.search('document_content', '<search terms>')
YIELD node, score
MATCH (d:Document) WHERE id(d) = node
  AND similarity(d.embedding, $vector_query, 'cosine') > 0.6
WITH d,
     score AS bm25_score,
     similarity(d.embedding, $vector_query) AS vector_score
RETURN d.doc_id,
       d.title,
       bm25_score,
       vector_score,
       0.5 * bm25_score + 0.5 * vector_score AS hybrid_score
ORDER BY hybrid_score DESC
LIMIT 20;
```

### Multi-Vector Search

Search across multiple embedding spaces:

```gql
-- Search using both content and title embeddings
MATCH (d:Document)
WITH d,
     similarity(d.content_embedding, $content_query_emb, 'cosine') AS content_sim,
     similarity(d.title_embedding, $title_query_emb, 'cosine') AS title_sim
WITH d,
     0.7 * content_sim + 0.3 * title_sim AS combined_similarity
WHERE combined_similarity > 0.75
RETURN d.doc_id, d.title, combined_similarity
ORDER BY combined_similarity DESC;
```

## Query-Time Optimizations

### Pre-Filtering vs Post-Filtering

```gql
-- Efficient: Pre-filter then vector search
MATCH (d:Document)
WHERE d.category = 'technical'
  AND d.publish_date > date('2024-01-01')
  AND d.language = 'en'
WITH d
WHERE similarity(d.embedding, $query, 'cosine') > 0.7
RETURN d
ORDER BY similarity(d.embedding, $query) DESC
LIMIT 10;

-- Less efficient: retrieve a large candidate set, then filter
WITH vector_knn('embedding', $query, 1000, 'cosine') AS ids
MATCH (d:Document)
WHERE id(d) IN ids
  AND d.category = 'technical'  // Post-filter loses HNSW efficiency
RETURN d
LIMIT 10;
```

`vector_knn(property, query_vector, k, metric)` (alias `knn`) returns the ids of
the `k` nearest elements for a vector property. There is no `CALL vector.search`
procedure — vector search is always expressed with the vector functions.

### Cascaded Search

Fast approximate search followed by reranking:

```gql
-- Stage 1: Fast approximate retrieval (top 100 candidate ids)
WITH vector_knn('embedding', $query_embedding, 100, 'cosine') AS ids
MATCH (candidate:Product)
WHERE id(candidate) IN ids

-- Stage 2: Precise reranking (top 20) on a higher-quality embedding
WITH candidate,
     similarity(candidate.high_quality_embedding, $query_embedding, 'cosine') AS precise_score
ORDER BY precise_score DESC
LIMIT 20
RETURN candidate, precise_score;
```

## Approximate Nearest Neighbors (ANN) Tuning

### HNSW Parameter Impact

The HNSW graph parameters (`m`, `ef_construction`, `ef_search`) are managed by
the engine and are not exposed as index options, so index memory and build
quality are fixed. Memory scales with the number of vectors and their
dimensionality: roughly `N * dimensions * 4 bytes` for the vectors themselves,
plus the graph overhead (~40MB per million vectors at 768 dimensions).

### Dynamic Candidate Sizing

```gql
-- Adjust the retrieved candidate set based on query importance
WITH vector_knn('embedding', $query,
                CASE WHEN $user_tier = 'premium' THEN 100 ELSE 10 END,
                'cosine') AS ids
MATCH (d:Document)
WHERE id(d) IN ids
RETURN d, similarity(d.embedding, $query) AS similarity
ORDER BY similarity DESC;
```

## Quantization and Compression

### Scalar Quantization

Reduce memory by 4x with minimal accuracy loss:

```python
# Quantize float32 to int8
def quantize_embeddings(embeddings):
    # Find min/max for normalization
    min_val, max_val = embeddings.min(), embeddings.max()

    # Scale to [0, 255]
    quantized = ((embeddings - min_val) / (max_val - min_val) * 255).astype(np.uint8)

    return quantized, min_val, max_val

# Store quantized embeddings
await client.execute("""
    MATCH (d:Document {doc_id: $id})
    SET d.embedding_quantized = $quantized,
        d.quantization_min = $min_val,
        d.quantization_max = $max_val
""", {"id": doc_id, "quantized": quantized.tolist(),
      "min_val": min_val, "max_val": max_val})
```

### Product Quantization (PQ)

Compress 1536d to ~96 bytes:

```python
# Use Faiss for product quantization
import faiss

# Train PQ codec
d = 1536  # Original dimension
m = 48    # Number of subquantizers
nbits = 8 # Bits per code

pq = faiss.IndexPQ(d, m, nbits)
pq.train(training_embeddings)

# Encode embeddings
codes = pq.sa_encode(embeddings)

# Store compressed codes
await client.execute("""
    MATCH (d:Document {doc_id: $id})
    SET d.embedding_pq = $codes
""", {"id": doc_id, "codes": codes.tolist()})
```

## Further Reading

- **Vector Search**: HNSW, LSH, and IVF Algorithms
- **Hybrid Search**: Combining Dense and Sparse Retrieval
- **Quantization**: Scalar, Product, and Binary Quantization
- **Performance**: Benchmarking and Optimization Techniques

Browse tagged content for comprehensive vector search documentation.
