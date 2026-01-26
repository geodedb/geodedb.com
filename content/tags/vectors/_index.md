---
title: "Vector Operations & Embeddings"
description: "Learn about vector operations and embedding support in Geode graph database. Discover how to implement similarity search, semantic queries, and AI-powered graph applications using vector embeddings."
keywords:
  - vector embeddings
  - similarity search
  - semantic search
  - vector operations
  - Geode
  - graph database
  - AI integration
  - machine learning
  - vector database
  - embedding storage
  - cosine similarity
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/vectors/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Vector embeddings enable powerful semantic search and similarity matching capabilities in graph databases. Geode supports storing and querying high-dimensional vector embeddings alongside graph data, enabling AI-powered applications that combine relationship traversal with semantic similarity.

## Vector Embedding Fundamentals

Vector embeddings are numerical representations of data (text, images, or other content) in high-dimensional space where semantic similarity corresponds to geometric proximity.

### Use Cases for Vector Embeddings

**Semantic Search**
Find content based on meaning rather than exact keyword matches:

```gql
-- Store document with embedding
CREATE (:Document {
  id: 'doc123',
  title: 'Introduction to Graph Databases',
  content: 'Graph databases excel at modeling...',
  embedding: [0.23, -0.45, 0.67, ...] -- 384-dimensional vector
})

-- Find similar documents using cosine similarity
MATCH (d:Document)
WHERE d.id <> $query_doc_id
WITH d, cosine_similarity(d.embedding, $query_embedding) as similarity
WHERE similarity > 0.75
RETURN d.title, d.content, similarity
ORDER BY similarity DESC
LIMIT 10
```

**Recommendation Systems**
Combine collaborative filtering with content similarity:

```gql
-- Recommend based on semantic similarity and graph relationships
MATCH (user:User {id: $user_id})-[:LIKED]->(item:Product)
WITH avg(item.embedding) as user_preference_vector

MATCH (candidate:Product)
WHERE NOT (user)-[:LIKED|:PURCHASED]->(candidate)
WITH candidate,
     cosine_similarity(candidate.embedding, user_preference_vector) as content_sim,
     size((candidate)<-[:LIKED]-(:User)-[:LIKED]->(item)) as collab_score
RETURN candidate.name,
       content_sim,
       collab_score,
       (content_sim * 0.6 + collab_score * 0.4) as combined_score
ORDER BY combined_score DESC
LIMIT 10
```

**Question Answering**
Match questions to relevant knowledge base articles:

```gql
-- Store FAQ with question embedding
CREATE (:FAQ {
  question: 'How do I create an index in Geode?',
  answer: 'Use CREATE INDEX command...',
  question_embedding: [...] -- Vector from embedding model
})

-- Find best matching FAQ
MATCH (faq:FAQ)
WITH faq, cosine_similarity(faq.question_embedding, $user_question_embedding) as score
WHERE score > 0.7
RETURN faq.question, faq.answer, score
ORDER BY score DESC
LIMIT 1
```

## Storing Vector Embeddings

Geode stores vectors as property arrays on nodes and relationships.

### Embedding Models

Common embedding models and their dimensions:

**Text Embeddings:**
- `sentence-transformers/all-MiniLM-L6-v2`: 384 dimensions
- `text-embedding-ada-002` (OpenAI): 1536 dimensions
- `bert-base-uncased`: 768 dimensions

**Image Embeddings:**
- `CLIP`: 512 dimensions
- `ResNet-50`: 2048 dimensions

**Code Embeddings:**
- `codebert-base`: 768 dimensions

### Embedding Generation

Generate embeddings using external models before storing:

**Python Example with SentenceTransformers:**
```python
from sentence_transformers import SentenceTransformer
from geode_client import Client

model = SentenceTransformer('all-MiniLM-L6-v2')

async def store_document_with_embedding(client, doc_id, title, content):
    # Generate embedding
    embedding = model.encode(content).tolist()

    # Store in Geode
    async with client.connection() as conn:
        await conn.execute("""
            CREATE (:Document {
                id: $id,
                title: $title,
                content: $content,
                embedding: $embedding
            })
        """, {
            "id": doc_id,
            "title": title,
            "content": content,
            "embedding": embedding
        })
```

**Go Example with OpenAI:**
```go
import (
    "context"
    openai "github.com/sashabaranov/go-openai"
    "go.codepros.org/geode"
)

func storeProductWithEmbedding(ctx context.Context, db *sql.DB, product Product) error {
    client := openai.NewClient(apiKey)

    // Generate embedding
    resp, err := client.CreateEmbeddings(ctx, openai.EmbeddingRequest{
        Model: openai.AdaEmbeddingV2,
        Input: []string{product.Description},
    })
    if err != nil {
        return err
    }

    embedding := resp.Data[0].Embedding

    // Store in Geode
    _, err = db.ExecContext(ctx, `
        CREATE (:Product {
            id: $1,
            name: $2,
            description: $3,
            embedding: $4
        })
    `, product.ID, product.Name, product.Description, embedding)

    return err
}
```

## Vector Similarity Functions

Geode provides built-in functions for computing vector similarity.

### Cosine Similarity

Measures angle between vectors (range: -1 to 1):

```gql
-- Find similar products
MATCH (p:Product)
WITH p, cosine_similarity(p.embedding, $query_embedding) as similarity
WHERE similarity > 0.8
RETURN p.name, similarity
ORDER BY similarity DESC
```

**Properties:**
- Range: -1 (opposite) to 1 (identical)
- Normalized by vector magnitude
- Best for normalized embeddings

### Euclidean Distance

Measures geometric distance between vectors:

```gql
MATCH (p:Product)
WITH p, euclidean_distance(p.embedding, $query_embedding) as distance
WHERE distance < 10.0
RETURN p.name, distance
ORDER BY distance ASC
```

**Properties:**
- Range: 0 (identical) to infinity
- Sensitive to vector magnitude
- Useful for absolute distance metrics

### Dot Product

Computes inner product of vectors:

```gql
MATCH (p:Product)
WITH p, dot_product(p.embedding, $query_embedding) as score
WHERE score > 0.5
RETURN p.name, score
ORDER BY score DESC
```

**Properties:**
- Range: unbounded
- Faster computation than cosine similarity
- Best when embeddings are pre-normalized

## Hybrid Graph-Vector Queries

Combine graph traversal with vector similarity for powerful queries.

### Multi-Hop Similarity Search

Find similar content through relationship paths:

```gql
-- Find related papers via citation network with semantic similarity
MATCH (start:Paper {id: $paper_id})-[:CITES*1..3]->(related:Paper)
WITH related,
     length(path) as citation_distance,
     cosine_similarity(related.embedding, start.embedding) as semantic_similarity
WHERE semantic_similarity > 0.6
RETURN related.title,
       citation_distance,
       semantic_similarity,
       (1.0 / citation_distance) * semantic_similarity as combined_score
ORDER BY combined_score DESC
LIMIT 10
```

### Relationship-Aware Recommendations

Use graph structure to filter similarity candidates:

```gql
-- Recommend users with similar interests who share connections
MATCH (user:User {id: $user_id})-[:FRIENDS_WITH*1..2]->(connection:User)
WHERE connection <> user
WITH connection,
     cosine_similarity(connection.interest_embedding, user.interest_embedding) as similarity
WHERE similarity > 0.7
  AND NOT (user)-[:FRIENDS_WITH]->(connection)
RETURN connection.name,
       similarity,
       size((user)-[:FRIENDS_WITH*1..2]-(connection)) as mutual_connections
ORDER BY similarity DESC, mutual_connections DESC
LIMIT 20
```

### Semantic Community Detection

Identify clusters based on semantic similarity:

```gql
-- Find users with similar interests forming communities
MATCH (u1:User)-[:INTERESTED_IN]->(topic:Topic)
MATCH (u2:User)-[:INTERESTED_IN]->(topic)
WHERE u1.id < u2.id
WITH u1, u2, cosine_similarity(u1.profile_embedding, u2.profile_embedding) as similarity
WHERE similarity > 0.75
CREATE (u1)-[:SIMILAR_TO {score: similarity}]->(u2)
CREATE (u2)-[:SIMILAR_TO {score: similarity}]->(u1)

-- Detect communities using connected components
MATCH (user:User)-[:SIMILAR_TO*]-(community_member:User)
RETURN collect(DISTINCT community_member.id) as community
```

## Vector Indexing and Performance

Optimize vector similarity search through indexing strategies.

### Approximate Nearest Neighbor (ANN) Indexes

For large-scale vector search, use ANN indexes:

```gql
-- Create HNSW index for fast similarity search
CREATE VECTOR INDEX product_embedding_idx
ON Product(embedding)
USING HNSW
WITH {
  dimensions: 384,
  distance_metric: 'cosine',
  m: 16,              -- Number of connections per layer
  ef_construction: 200 -- Size of dynamic candidate list
}
```

**Index Types:**

**HNSW (Hierarchical Navigable Small World)**
- Fast approximate search
- Good recall/performance trade-off
- Memory intensive

**IVF (Inverted File Index)**
- Partitions vector space into clusters
- Lower memory footprint
- Configurable speed/accuracy trade-off

### Query Performance Tuning

Optimize vector queries for performance:

```gql
-- Use index hints for vector search
MATCH (p:Product)
USING INDEX product_embedding_idx
WITH p, cosine_similarity(p.embedding, $query_embedding) as similarity
WHERE similarity > 0.8
RETURN p.name, similarity
ORDER BY similarity DESC
LIMIT 10
```

**Performance Tips:**
- Pre-normalize embeddings when using cosine similarity
- Use appropriate similarity thresholds to limit candidates
- Consider approximate search for large datasets (>100K vectors)
- Batch vector operations when possible

### Memory Considerations

Vector storage requirements:

| Dimension | Data Type | Memory per Vector |
|-----------|-----------|-------------------|
| 384       | float32   | 1.5 KB            |
| 768       | float32   | 3 KB              |
| 1536      | float32   | 6 KB              |

For 1M documents with 384-dim embeddings: ~1.5 GB vector storage.

## Embedding Update Strategies

Handle embedding updates as content changes.

### Incremental Updates

Update embeddings when content changes:

```python
async def update_document_embedding(client, doc_id, new_content):
    # Generate new embedding
    new_embedding = model.encode(new_content).tolist()

    # Update in transaction
    async with client.connection() as conn:
        await conn.begin()
        try:
            await conn.execute("""
                MATCH (d:Document {id: $doc_id})
                SET d.content = $content,
                    d.embedding = $embedding,
                    d.updated_at = current_timestamp()
            """, {
                "doc_id": doc_id,
                "content": new_content,
                "embedding": new_embedding
            })
            await conn.commit()
        except Exception:
            await conn.rollback()
            raise
```

### Batch Reindexing

Regenerate all embeddings when upgrading models:

```python
async def reindex_all_documents(client, batch_size=100):
    # Fetch documents without embeddings or old model
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (d:Document)
            WHERE d.embedding IS NULL
               OR d.embedding_model <> $current_model
            RETURN d.id, d.content
        """, {"current_model": "all-MiniLM-L6-v2"})
        docs = [
            {"id": row["d.id"].raw_value, "content": row["d.content"].raw_value}
            for row in result.rows
        ]

    # Process in batches
    for i in range(0, len(docs), batch_size):
        batch = docs[i:i+batch_size]

        # Generate embeddings
        contents = [doc['content'] for doc in batch]
        embeddings = model.encode(contents).tolist()

        # Update in transaction
        async with client.connection() as conn:
            await conn.begin()
            try:
                for doc, embedding in zip(batch, embeddings):
                    await conn.execute("""
                        MATCH (d:Document {id: $doc_id})
                        SET d.embedding = $embedding,
                            d.embedding_model = $model
                    """, {
                        "doc_id": doc['id'],
                        "embedding": embedding,
                        "model": "all-MiniLM-L6-v2"
                    })
                await conn.commit()
            except Exception:
                await conn.rollback()
                raise
```

## Real-World Applications

### Semantic Code Search

Search codebases by functionality rather than syntax:

```gql
-- Store code snippets with embeddings
CREATE (:CodeSnippet {
  id: 'snippet123',
  language: 'python',
  code: 'def calculate_similarity(vec1, vec2): return cosine(vec1, vec2)',
  description: 'Calculate cosine similarity between two vectors',
  embedding: [...] -- Generated from code + description
})

-- Search by natural language query
MATCH (snippet:CodeSnippet)
WHERE snippet.language = $language
WITH snippet, cosine_similarity(snippet.embedding, $query_embedding) as relevance
WHERE relevance > 0.7
RETURN snippet.code, snippet.description, relevance
ORDER BY relevance DESC
LIMIT 5
```

### Multi-Modal Search

Combine text and image embeddings:

```gql
-- Store product with text and image embeddings
CREATE (:Product {
  id: 'prod456',
  name: 'Red Running Shoes',
  description: 'Lightweight athletic footwear...',
  text_embedding: [...],  -- From description
  image_embedding: [...]  -- From product images
})

-- Search using text or image query
MATCH (p:Product)
WITH p,
     cosine_similarity(p.text_embedding, $text_query_embedding) as text_sim,
     cosine_similarity(p.image_embedding, $image_query_embedding) as image_sim
WITH p,
     CASE WHEN $query_type = 'text' THEN text_sim
          WHEN $query_type = 'image' THEN image_sim
          ELSE (text_sim + image_sim) / 2
     END as similarity
WHERE similarity > 0.75
RETURN p.name, similarity
ORDER BY similarity DESC
```

### Conversational AI Context

Maintain conversation context using embeddings:

```gql
-- Store conversation turns with embeddings
CREATE (turn:ConversationTurn {
  id: 'turn123',
  user_id: 'user456',
  message: 'How do I optimize graph queries?',
  embedding: [...],
  timestamp: current_timestamp()
})

-- Find relevant context for current query
MATCH (turn:ConversationTurn)
WHERE turn.user_id = $user_id
  AND turn.timestamp > current_timestamp() - duration('PT1H')
WITH turn, cosine_similarity(turn.embedding, $current_query_embedding) as relevance
WHERE relevance > 0.6
RETURN turn.message, turn.response, relevance
ORDER BY relevance DESC, turn.timestamp DESC
LIMIT 5
```

## Best Practices

### Choose Appropriate Embedding Models

Select models based on requirements:

- **Speed-critical applications:** Use smaller models (384-dim)
- **High-accuracy needs:** Use larger models (768-1536-dim)
- **Multi-lingual:** Use models trained on multiple languages
- **Domain-specific:** Fine-tune models on domain data

### Normalize Embeddings

Pre-normalize embeddings for cosine similarity:

```python
def normalize_embedding(embedding):
    norm = np.linalg.norm(embedding)
    return (embedding / norm).tolist()

embedding = model.encode(text)
normalized = normalize_embedding(embedding)
```

### Set Appropriate Similarity Thresholds

Tune thresholds based on precision/recall requirements:

- **High precision:** threshold > 0.85 (fewer, more relevant results)
- **High recall:** threshold > 0.65 (more results, some less relevant)
- **Balanced:** threshold > 0.75

### Monitor Embedding Quality

Track embedding quality metrics:

- Average similarity scores
- Precision/recall for known test cases
- User engagement with recommended content
- A/B test different embedding models

## Future Enhancements

Geode's vector capabilities continue to evolve:

- Native ANN index support (HNSW, IVF-PQ)
- Quantized embedding storage for reduced memory
- GPU-accelerated similarity computation
- Multi-vector queries (combine multiple embeddings)
- Embedding versioning and A/B testing

Vector embeddings combined with Geode's graph capabilities enable powerful AI-enhanced applications that leverage both semantic similarity and relationship structure for superior results.
