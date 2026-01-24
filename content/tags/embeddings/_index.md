---
title: "Vector Embeddings"
description: "Store, query, and search vector embeddings in Geode for machine learning and AI applications. Learn about vector indexing, similarity search, and integration with ML workflows."
keywords:
  - embeddings
  - vector embeddings
  - vector search
  - machine learning
  - AI
  - similarity search
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/embeddings/"
    noindex: false
---

Vector embeddings are dense numerical representations of data that enable semantic similarity search, recommendation systems, and machine learning applications in Geode. This tag covers storing, indexing, and querying high-dimensional vectors alongside your graph data.

## What Are Vector Embeddings?

Vector embeddings transform complex data (text, images, user behaviors) into fixed-size numerical arrays that capture semantic relationships. In Geode, embeddings are stored as native property types and indexed using specialized vector indexes for efficient similarity search.

### Key Characteristics

**Dimensionality**: Embeddings typically range from 128 to 1536 dimensions, depending on the model used (e.g., OpenAI ada-002: 1536d, sentence-transformers: 384d).

**Similarity Metrics**: Geode supports multiple distance functions for comparing vectors:
- Cosine similarity (default for normalized vectors)
- Euclidean distance (L2)
- Inner product (dot product)
- Manhattan distance (L1)

**Storage Efficiency**: Vectors are stored in compressed binary format, reducing memory footprint by up to 75% compared to JSON arrays.

## Storing Vector Embeddings in Geode

### Node Properties

Store embeddings as node properties for entity representations:

```gql
// Create product nodes with embeddings
INSERT (p:Product {
  product_id: 'prod_123',
  name: 'Wireless Headphones',
  description: 'Premium noise-canceling headphones',
  embedding: [0.234, -0.567, 0.891, ...],  // 384-dimensional vector
  embedding_model: 'sentence-transformers/all-MiniLM-L6-v2'
});

// Create document nodes with text embeddings
INSERT (d:Document {
  doc_id: 'doc_456',
  title: 'Graph Database Architecture',
  content: '...',
  text_embedding: [0.123, 0.456, ...],  // 1536-dimensional vector
  embedding_model: 'text-embedding-ada-002'
});
```

### Relationship Properties

Embeddings can also represent relationship semantics:

```gql
// Create relationships with interaction embeddings
MATCH (u:User {user_id: 'user_123'})
MATCH (p:Product {product_id: 'prod_456'})
INSERT (u)-[i:INTERACTED {
  timestamp: datetime('2025-01-24T10:30:00'),
  interaction_type: 'purchase',
  context_embedding: [0.345, -0.678, ...]
}]->(p);
```

## Vector Indexing Strategies

### HNSW Index for Fast Similarity Search

Geode uses Hierarchical Navigable Small World (HNSW) graphs for approximate nearest neighbor (ANN) search:

```gql
// Create HNSW index on product embeddings
CREATE VECTOR INDEX product_embedding_idx
ON :Product(embedding)
USING HNSW
WITH (
  dimensions = 384,
  metric = 'cosine',
  m = 16,              // Number of bi-directional links per node
  ef_construction = 200 // Size of dynamic candidate list during construction
);

// Create index for document text embeddings
CREATE VECTOR INDEX document_text_idx
ON :Document(text_embedding)
USING HNSW
WITH (
  dimensions = 1536,
  metric = 'cosine',
  m = 32,
  ef_construction = 400
);
```

### Index Configuration

**m (max connections)**: Controls index size and search quality. Higher values (16-48) improve recall but increase memory usage.

**ef_construction**: Affects build time and index quality. Values of 100-800 balance construction speed with search accuracy.

**ef_search**: Query-time parameter controlling search accuracy. Set dynamically based on precision requirements.

## Similarity Search Queries

### K-Nearest Neighbors Search

Find the most similar items to a query vector:

```gql
// Find 10 most similar products
MATCH (p:Product)
WHERE p.embedding IS NOT NULL
WITH p, vector.similarity(p.embedding, $query_embedding, 'cosine') AS score
ORDER BY score DESC
LIMIT 10
RETURN p.product_id, p.name, score;

// Find similar documents with threshold
MATCH (d:Document)
WHERE d.text_embedding IS NOT NULL
WITH d, vector.similarity(d.text_embedding, $query_vector, 'cosine') AS similarity
WHERE similarity > 0.8  // Only return highly similar documents
ORDER BY similarity DESC
LIMIT 20
RETURN d.doc_id, d.title, similarity;
```

### Hybrid Search (Vector + Graph)

Combine vector similarity with graph traversal:

```gql
// Find similar products in the same category
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category {name: 'Electronics'})
WHERE p.embedding IS NOT NULL
WITH p, vector.similarity(p.embedding, $query_embedding, 'cosine') AS score
WHERE score > 0.7
ORDER BY score DESC
LIMIT 10
RETURN p.product_id, p.name, score;

// Find similar documents with related tags
MATCH (d:Document)-[:HAS_TAG]->(t:Tag)
WHERE d.text_embedding IS NOT NULL
  AND t.name IN ['machine-learning', 'databases', 'performance']
WITH d, vector.similarity(d.text_embedding, $query_vector, 'cosine') AS similarity
ORDER BY similarity DESC
LIMIT 15
RETURN d.doc_id, d.title, COLLECT(t.name) AS tags, similarity;
```

## Machine Learning Integration

### Generating Embeddings

Geode integrates with external embedding models:

```python
# Python example: Generate and store embeddings
from geode_client import Client
from sentence_transformers import SentenceTransformer

client = Client("geodedb://localhost:3141")
model = SentenceTransformer('all-MiniLM-L6-v2')

# Generate embedding for product description
description = "Premium wireless headphones with noise canceling"
embedding = model.encode(description).tolist()

# Store in Geode
query = """
INSERT (p:Product {
  product_id: $product_id,
  name: $name,
  description: $description,
  embedding: $embedding,
  embedding_model: 'all-MiniLM-L6-v2'
})
"""
client.execute(query, {
    'product_id': 'prod_789',
    'name': 'Wireless Headphones',
    'description': description,
    'embedding': embedding
})
```

### Batch Embedding Updates

Efficiently update embeddings for multiple entities:

```gql
// Update embeddings for products without them
MATCH (p:Product)
WHERE p.embedding IS NULL
  AND p.description IS NOT NULL
WITH p
LIMIT 1000
SET p.needs_embedding = true
RETURN p.product_id, p.description;

// After generating embeddings externally, update in batch
UNWIND $products AS product_data
MATCH (p:Product {product_id: product_data.product_id})
SET p.embedding = product_data.embedding,
    p.embedding_updated_at = datetime(),
    p.needs_embedding = false;
```

## Real-World Use Cases

### Recommendation Systems

Build semantic product recommendations:

```gql
// Find products similar to user's purchase history
MATCH (u:User {user_id: $user_id})-[:PURCHASED]->(bought:Product)
WITH u, AVG(bought.embedding) AS avg_embedding  // Aggregate user preferences
MATCH (candidate:Product)
WHERE NOT (u)-[:PURCHASED]->(candidate)
  AND candidate.embedding IS NOT NULL
WITH candidate, vector.similarity(candidate.embedding, avg_embedding, 'cosine') AS score
WHERE score > 0.75
ORDER BY score DESC
LIMIT 20
RETURN candidate.product_id, candidate.name, score;
```

### Semantic Document Search

Enable natural language document retrieval:

```gql
// Search documents by semantic meaning
WITH $query_text AS query
MATCH (d:Document)
WHERE d.text_embedding IS NOT NULL
WITH d, vector.similarity(d.text_embedding, $query_embedding, 'cosine') AS relevance
WHERE relevance > 0.6
ORDER BY relevance DESC, d.view_count DESC
LIMIT 25
RETURN d.doc_id, d.title, d.summary, relevance;
```

### Duplicate Detection

Identify near-duplicate content using embeddings:

```gql
// Find potential duplicate products
MATCH (p1:Product)
WHERE p1.embedding IS NOT NULL
MATCH (p2:Product)
WHERE p2.embedding IS NOT NULL
  AND p1.product_id < p2.product_id  // Avoid comparing same pair twice
WITH p1, p2, vector.similarity(p1.embedding, p2.embedding, 'cosine') AS similarity
WHERE similarity > 0.95  // Very high similarity threshold
RETURN p1.product_id, p1.name,
       p2.product_id, p2.name,
       similarity
ORDER BY similarity DESC;
```

## Performance Optimization

### Index Tuning

Optimize HNSW parameters for your workload:

```gql
// High-precision search (slower, more accurate)
SET vector_index.ef_search = 400;

// Fast search (faster, slightly lower recall)
SET vector_index.ef_search = 100;

// Check index statistics
SHOW VECTOR INDEX product_embedding_idx STATISTICS;
```

### Embedding Dimension Reduction

Reduce storage and improve search speed:

```python
# Use PCA or other dimensionality reduction
from sklearn.decomposition import PCA

# Reduce 1536d embeddings to 384d
pca = PCA(n_components=384)
reduced_embeddings = pca.fit_transform(original_embeddings)

# Store reduced embeddings
for product_id, embedding in zip(product_ids, reduced_embeddings):
    client.execute("""
        MATCH (p:Product {product_id: $product_id})
        SET p.embedding_reduced = $embedding
    """, {'product_id': product_id, 'embedding': embedding.tolist()})
```

### Query Optimization

Use indexes and limit result sets:

```gql
// Pre-filter candidates before vector search
MATCH (p:Product)
WHERE p.price < 1000  // Filter by price first
  AND p.in_stock = true
  AND p.embedding IS NOT NULL
WITH p, vector.similarity(p.embedding, $query_embedding, 'cosine') AS score
WHERE score > 0.7
ORDER BY score DESC
LIMIT 10
RETURN p;
```

## Best Practices

1. **Normalize Embeddings**: Store unit-normalized vectors for cosine similarity to improve performance
2. **Version Embedding Models**: Track which model generated each embedding to handle model updates
3. **Incremental Updates**: Update embeddings only when source data changes significantly
4. **Monitor Index Quality**: Regularly check HNSW index recall and rebuild if degraded
5. **Batch Operations**: Generate and insert embeddings in batches for better throughput
6. **Hybrid Approaches**: Combine vector search with graph traversal for better relevance
7. **Cache Query Embeddings**: Reuse query embeddings across multiple searches
8. **Set Similarity Thresholds**: Use WHERE clauses to filter low-quality matches

## Integration with Graph Features

Embeddings complement Geode's graph capabilities:

- **Graph Context**: Use embeddings to initialize node representations for graph neural networks
- **Link Prediction**: Combine structural and semantic features for relationship prediction
- **Community Detection**: Use embedding similarity to identify semantic clusters
- **Path Ranking**: Score graph paths by semantic relevance using node embeddings

Browse the tagged content below to discover documentation, tutorials, and guides for implementing vector embeddings in your Geode applications.

## Advanced Embedding Techniques

### Contextual Embeddings

Use transformer models for context-aware representations:

```gql
-- Store contextualized embeddings (BERT, GPT)
MATCH (doc:Document {doc_id: $doc_id})
SET doc.bert_embedding = $bert_vector,  // [CLS] token embedding
    doc.sentence_embeddings = $sentence_vectors;  // Per-sentence embeddings

-- Query with semantic similarity
MATCH (d:Document)
WHERE vector.similarity(d.bert_embedding, $query_embedding, 'cosine') > 0.75
RETURN d.title, d.content, vector.similarity(d.bert_embedding, $query_embedding) AS score
ORDER BY score DESC;
```

### Multi-Modal Embeddings

Combine text, image, and other modalities:

```gql
-- Store CLIP embeddings (text + image)
MATCH (product:Product {product_id: $product_id})
SET product.text_embedding = $text_embedding,
    product.image_embedding = $image_embedding,
    product.combined_embedding = vector.concatenate($text_embedding, $image_embedding);

-- Multi-modal search
MATCH (p:Product)
WITH p,
     vector.similarity(p.text_embedding, $text_query_emb, 'cosine') AS text_sim,
     vector.similarity(p.image_embedding, $image_query_emb, 'cosine') AS image_sim
WITH p, 0.6 * text_sim + 0.4 * image_sim AS combined_score
WHERE combined_score > 0.7
RETURN p.name, p.description, combined_score
ORDER BY combined_score DESC;
```

## Graph Embeddings

### Node2Vec and DeepWalk

Learn structural embeddings:

```gql
-- Store Node2Vec embeddings (computed externally)
MATCH (n:Node {node_id: $node_id})
SET n.node2vec_embedding = $embedding;

-- Find structurally similar nodes
MATCH (target:Node {node_id: $target_id})
MATCH (candidate:Node)
WHERE candidate <> target
  AND vector.similarity(candidate.node2vec_embedding, target.node2vec_embedding, 'cosine') > 0.8
RETURN candidate.node_id,
       vector.similarity(candidate.node2vec_embedding, target.node2vec_embedding) AS structural_similarity
ORDER BY structural_similarity DESC
LIMIT 20;
```

### Graph Neural Network (GNN) Embeddings

```gql
-- Store GNN node embeddings
MATCH (entity:Entity {entity_id: $entity_id})
SET entity.gnn_embedding = $gnn_vector;

-- Link prediction using learned embeddings
MATCH (a:Entity {entity_id: $entity_a})
MATCH (b:Entity {entity_id: $entity_b})
WHERE NOT EXISTS((a)-[:RELATED]-(b))
WITH a, b,
     vector.similarity(a.gnn_embedding, b.gnn_embedding, 'cosine') AS link_probability
WHERE link_probability > 0.85
RETURN b.entity_id, link_probability
ORDER BY link_probability DESC;
```

## Embedding Quality and Evaluation

### Embedding Normalization

```python
# Normalize embeddings to unit vectors
import numpy as np
from geode_client import GeodeClient

async def normalize_embeddings(client):
    # Fetch embeddings
    result = await client.execute("""
        MATCH (d:Document)
        WHERE d.embedding IS NOT NULL
        RETURN d.doc_id AS id, d.embedding AS embedding
    """)
    
    for row in result.rows:
        doc_id, embedding = row['id'], np.array(row['embedding'])
        normalized = embedding / np.linalg.norm(embedding)
        
        # Update with normalized version
        await client.execute("""
            MATCH (d:Document {doc_id: $id})
            SET d.embedding = $normalized_embedding
        """, {"id": doc_id, "normalized_embedding": normalized.tolist()})
```

### Dimensionality Reduction

```python
# Reduce embedding dimensions with PCA
from sklearn.decomposition import PCA

# Load high-dim embeddings
embeddings_1536d = load_embeddings()  # OpenAI ada-002

# Reduce to 384 dimensions
pca = PCA(n_components=384)
embeddings_384d = pca.fit_transform(embeddings_1536d)

# Explained variance: typically > 95%
print(f"Explained variance: {pca.explained_variance_ratio_.sum():.2%}")

# Store reduced embeddings
for doc_id, embedding in zip(doc_ids, embeddings_384d):
    await client.execute("""
        MATCH (d:Document {doc_id: $id})
        SET d.embedding_reduced = $embedding
    """, {"id": doc_id, "embedding": embedding.tolist()})
```

## Production Patterns

### Embedding Generation Pipeline

```python
async def embedding_pipeline(client, batch_size=100):
    # Find documents needing embeddings
    docs = await client.execute("""
        MATCH (d:Document)
        WHERE d.embedding IS NULL AND d.content IS NOT NULL
        RETURN d.doc_id AS id, d.content AS text
        LIMIT $batch_size
    """, {"batch_size": batch_size})
    
    # Batch embed
    texts = [row['text'] for row in docs.rows]
    embeddings = sentence_transformer.encode(texts, batch_size=32)
    
    # Store in Geode
    for doc, embedding in zip(docs.rows, embeddings):
        await client.execute("""
            MATCH (d:Document {doc_id: $id})
            SET d.embedding = $embedding,
                d.embedding_model = 'all-MiniLM-L6-v2',
                d.embedding_generated_at = datetime()
        """, {"id": doc['id'], "embedding": embedding.tolist()})
```

## Further Reading

- **Embedding Models**: BERT, RoBERTa, Sentence Transformers, OpenAI
- **Graph Embeddings**: Node2Vec, DeepWalk, GraphSAGE, GCN
- **Multi-Modal Embeddings**: CLIP, ALIGN, ImageBind
- **Evaluation**: Embedding Quality Metrics and Benchmarks

Browse tagged content for comprehensive embedding documentation.
