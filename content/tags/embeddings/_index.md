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
