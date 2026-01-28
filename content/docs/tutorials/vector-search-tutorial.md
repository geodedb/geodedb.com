---
title: "Vector Similarity Search Tutorial"
description: "Learn vector similarity search with Geode: generate embeddings, create HNSW indexes, and find semantically similar items with cosine and L2 distance"
keywords: ["vector search", "embeddings", "HNSW", "similarity search", "semantic search", "cosine distance", "L2 distance", "vector index", "neural search", "machine learning"]
weight: 50
slug: "vector-search-tutorial"
url: "/docs/tutorials/vector-search-tutorial/"
canonical: "https://geodedb.com/docs/tutorials/vector-search-tutorial/"
---

<!-- CANARY: REQ=REQ-HNSW-INDEX-OPTIMIZER-INTEGRATION-001; FEATURE="HNSW IndexOptimizer Integration"; ASPECT=ProductionIntegration; STATUS=TESTED; OWNER=vector; UPDATED=2025-10-05 -->

# Vector Similarity Search Tutorial

Learn to implement semantic search using vector embeddings and HNSW indexing in this hands-on 25-minute tutorial.

## Prerequisites

- Completed [MATCH Basics Tutorial](/docs/tutorials/match-basics/)
- Python 3.9+ with pip installed
- Geode server running (`geode serve`)
- Basic understanding of embeddings (helpful but not required)

## Tutorial Overview

**Time**: 25 minutes
**Difficulty**: Intermediate
**Topics**: Vector embeddings, HNSW indexing, similarity metrics, semantic search

By the end of this tutorial, you'll be able to:
- Generate vector embeddings from text
- Store vectors in Geode
- Create HNSW indexes for fast similarity search
- Find semantically similar items
- Optimize vector search performance

## What are Vector Embeddings?

Vector embeddings convert data (text, images, audio) into numerical arrays that capture semantic meaning. Similar items have vectors that are close in vector space.

**Example**:
```
"cat" → [0.2, 0.8, 0.1, ...]
"dog" → [0.3, 0.7, 0.2, ...]  (close to "cat")
"car" → [0.9, 0.1, 0.8, ...]  (far from "cat")
```

## Step 1: Setup Environment

### Install Dependencies

```bash
# Install Python client and embedding library
pip install geode-client sentence-transformers

# Or if using requirements file
cat > requirements.txt <<EOF
geode-client>=0.1.0
sentence-transformers>=2.2.0
numpy>=1.21.0
EOF

pip install -r requirements.txt
```

### Import Libraries

<!-- CANARY: REQ=REQ-CLIENT-PY-001; FEATURE="PythonClientConnection"; ASPECT=HelloHandshake; STATUS=IMPL; OWNER=clients; UPDATED=2025-02-14 -->

```python
import asyncio
from geode_client import Client
from sentence_transformers import SentenceTransformer
import numpy as np

# Create client (use an async connection for queries)
client = Client(host="localhost", port=3141)

# Load embedding model (downloads on first use, ~80MB)
model = SentenceTransformer('all-MiniLM-L6-v2')
```

All Python steps below assume you are inside an async context, for example:

```python
async def main():
    async with client.connection() as conn:
        # Run the steps below with await conn.execute(...) / await conn.query(...)
        ...

asyncio.run(main())
```

### Verify Setup

```python
# Test embedding generation
text = "Hello, world!"
embedding = model.encode(text)

print(f"Text: {text}")
print(f"Embedding shape: {embedding.shape}")
print(f"Embedding (first 5 dims): {embedding[:5]}")

# Expected output:
# Text: Hello, world!
# Embedding shape: (384,)
# Embedding (first 5 dims): [0.123, -0.456, 0.789, ...]
```

## Step 2: Create Sample Dataset

### Create Movie Database

```python
# Sample movies with descriptions
movies = [
    {
        "id": "mov_1",
        "title": "The Matrix",
        "description": "A computer hacker learns about the true nature of reality and his role in the war against its controllers.",
        "genre": "Sci-Fi"
    },
    {
        "id": "mov_2",
        "title": "Inception",
        "description": "A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea.",
        "genre": "Sci-Fi"
    },
    {
        "id": "mov_3",
        "title": "The Shawshank Redemption",
        "description": "Two imprisoned men bond over years, finding solace and eventual redemption through acts of common decency.",
        "genre": "Drama"
    },
    {
        "id": "mov_4",
        "title": "The Dark Knight",
        "description": "Batman faces the Joker, a criminal mastermind who wants to plunge Gotham City into anarchy.",
        "genre": "Action"
    },
    {
        "id": "mov_5",
        "title": "Interstellar",
        "description": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        "genre": "Sci-Fi"
    },
    {
        "id": "mov_6",
        "title": "Forrest Gump",
        "description": "The presidencies of Kennedy and Johnson unfold through the perspective of an Alabama man with an IQ of 75.",
        "genre": "Drama"
    }
]

# Generate embeddings
print("Generating embeddings...")
for movie in movies:
    # Create embedding from title + description
    text = f"{movie['title']}. {movie['description']}"
    movie['embedding'] = model.encode(text).tolist()
    print(f"✓ {movie['title']}")
```

### Load into Geode

```python
# Create graph
await conn.execute("CREATE GRAPH MovieSearch; USE MovieSearch;")

# Insert movies with embeddings
for movie in movies:
    await conn.execute("""
        CREATE (:Movie {
            id: $id,
            title: $title,
            description: $description,
            genre: $genre,
            embedding: $embedding
        })
    """, movie)

print(f"\n✓ Loaded {len(movies)} movies into Geode")
```

## Step 3: Create HNSW Index

### Understanding HNSW

**HNSW** (Hierarchical Navigable Small World) is a graph-based algorithm for approximate nearest neighbor search:

- **Hierarchical**: Multi-layer graph structure
- **Navigable**: Efficiently finds approximate neighbors
- **Small World**: Short paths between any two points
- **Performance**: O(log n) search time

### Create Vector Index

```gql
-- Create HNSW index on embedding field
CREATE INDEX movie_embedding_idx ON Movie(embedding) USING vector;
```

In Python:

```python
# Create vector index
await conn.execute("""
    CREATE INDEX movie_embedding_idx ON Movie(embedding) USING vector
""")

print("✓ Created HNSW vector index")
```

### Index Parameters (Optional)

```python
# Advanced: Configure HNSW parameters
await conn.execute("""
    CREATE INDEX movie_embedding_advanced_idx ON Movie(embedding) USING vector
    WITH {
        m: 16,              -- Max connections per layer (default: 16)
        ef_construction: 200, -- Size of dynamic candidate list (default: 200)
        ef_search: 100       -- Search-time candidate list size (default: 100)
    }
""")
```

**Parameters**:
- `m`: Higher = better recall, more memory (typical: 12-48)
- `ef_construction`: Higher = better index quality, slower build (typical: 100-400)
- `ef_search`: Higher = better accuracy, slower search (typical: 50-200)

## Step 4: Similarity Search

### Find Similar Movies

```python
# Query: "space exploration adventure"
query_text = "space exploration adventure"
query_embedding = model.encode(query_text).tolist()

# Find similar movies using cosine distance
page, _ = await conn.query("""
    MATCH (m:Movie)
    WHERE vector_distance_cosine(m.embedding, $query_vec) < 0.5
    RETURN m.title,
           m.description,
           vector_distance_cosine(m.embedding, $query_vec) AS distance
    ORDER BY distance ASC
    LIMIT 5
""", {'query_vec': query_embedding})

print(f"\nQuery: '{query_text}'")
print("\nMost similar movies:")
for i, row in enumerate(page.rows, 1):
    title = row["m.title"].raw_value
    distance = row["distance"].raw_value
    description = row["m.description"].raw_value
    print(f"{i}. {title} (distance: {distance:.3f})")
    print(f"   {description[:80]}...")
```

**Expected output**:
```
Query: 'space exploration adventure'

Most similar movies:
1. Interstellar (distance: 0.156)
   A team of explorers travel through a wormhole in space in an attempt to ensure...
2. The Matrix (distance: 0.312)
   A computer hacker learns about the true nature of reality and his role in the...
3. Inception (distance: 0.389)
   A thief who steals corporate secrets through dream-sharing technology is given...
```

### Understanding Distance Metrics

#### Cosine Distance

```python
# Cosine distance: 1 - cosine_similarity
# Range: [0, 2], where 0 = identical, 2 = opposite
# Best for: Text embeddings (direction matters more than magnitude)

page, _ = await conn.query("""
    MATCH (m:Movie)
    RETURN m.title,
           vector_distance_cosine(m.embedding, $query_vec) AS cosine_dist
    ORDER BY cosine_dist ASC
    LIMIT 5
""", {'query_vec': query_embedding})
```

#### L2 Distance (Euclidean)

```python
# L2 distance: sqrt(sum((a-b)^2))
# Range: [0, ∞], where 0 = identical
# Best for: When magnitude matters (e.g., image embeddings)

page, _ = await conn.query("""
    MATCH (m:Movie)
    RETURN m.title,
           vector_distance_l2(m.embedding, $query_vec) AS l2_dist
    ORDER BY l2_dist ASC
    LIMIT 5
""", {'query_vec': query_embedding})
```

#### Inner Product

```python
# Inner product: sum(a * b)
# Range: [-∞, ∞], where higher = more similar
# Best for: When embeddings are normalized

page, _ = await conn.query("""
    MATCH (m:Movie)
    RETURN m.title,
           vector_inner_product(m.embedding, $query_vec) AS similarity
    ORDER BY similarity DESC
    LIMIT 5
""", {'query_vec': query_embedding})
```

## Step 5: Hybrid Search

### Combine Vector and Keyword Search

```python
# Hybrid search: Vector similarity + keyword filter
query_text = "mind-bending reality"
query_embedding = model.encode(query_text).tolist()

page, _ = await conn.query("""
    MATCH (m:Movie)
    WHERE m.genre = 'Sci-Fi'
      AND vector_distance_cosine(m.embedding, $query_vec) < 0.6
    RETURN m.title,
           m.genre,
           vector_distance_cosine(m.embedding, $query_vec) AS distance
    ORDER BY distance ASC
""", {'query_vec': query_embedding})

print(f"\nQuery: '{query_text}' (Genre: Sci-Fi)")
for row in page.rows:
    title = row["m.title"].raw_value
    distance = row["distance"].raw_value
    print(f"• {title} (distance: {distance:.3f})")
```

### Weighted Combination

```python
# Combine vector similarity with rating score
page, _ = await conn.query("""
    MATCH (m:Movie)
    WITH m,
         vector_distance_cosine(m.embedding, $query_vec) AS vec_dist,
         m.rating AS rating
    RETURN m.title,
           vec_dist,
           rating,
           (vec_dist * 0.7 + (1 - rating/10) * 0.3) AS combined_score
    ORDER BY combined_score ASC
    LIMIT 5
""", {'query_vec': query_embedding})
```

## Step 6: Advanced Patterns

### Batch Similarity Search

```python
# Find similar items for multiple queries at once
queries = [
    "space adventure",
    "prison drama",
    "superhero action"
]

for query_text in queries:
    query_emb = model.encode(query_text).tolist()

    page, _ = await conn.query("""
        MATCH (m:Movie)
        RETURN m.title,
               vector_distance_cosine(m.embedding, $query_vec) AS distance
        ORDER BY distance ASC
        LIMIT 3
    """, {'query_vec': query_emb})

    print(f"\nQuery: '{query_text}'")
    for row in page.rows:
        title = row["m.title"].raw_value
        distance = row["distance"].raw_value
        print(f"  • {title} ({distance:.3f})")
```

### Find Items Similar to an Existing Item

```python
# "More like this" - Find movies similar to The Matrix
page, _ = await conn.query("""
    MATCH (ref:Movie {title: 'The Matrix'})
    MATCH (similar:Movie)
    WHERE similar <> ref
      AND vector_distance_cosine(similar.embedding, ref.embedding) < 0.4
    RETURN similar.title,
           vector_distance_cosine(similar.embedding, ref.embedding) AS distance
    ORDER BY distance ASC
    LIMIT 5
""")

print("\nMovies similar to 'The Matrix':")
for row in page.rows:
    title = row["similar.title"].raw_value
    distance = row["distance"].raw_value
    print(f"• {title} (distance: {distance:.3f})")
```

### Clustering Similar Items

```python
# Use K-means clustering (external library)
from sklearn.cluster import KMeans

# Get all embeddings
page, _ = await conn.query("""
    MATCH (m:Movie)
    RETURN m.id, m.title, m.embedding
""")

embeddings = np.array([row["m.embedding"].raw_value for row in page.rows])
movie_ids = [row["m.id"].raw_value for row in page.rows]
titles = [row["m.title"].raw_value for row in page.rows]

# Cluster into 2 groups
kmeans = KMeans(n_clusters=2, random_state=42)
clusters = kmeans.fit_predict(embeddings)

# Store cluster assignments
for movie_id, cluster in zip(movie_ids, clusters):
    await conn.execute("""
        MATCH (m:Movie {id: $id})
        SET m.cluster = $cluster
    """, {'id': movie_id, 'cluster': int(cluster)})

# View clusters
for cluster_id in range(2):
    print(f"\nCluster {cluster_id}:")
    cluster_titles = [t for t, c in zip(titles, clusters) if c == cluster_id]
    for title in cluster_titles:
        print(f"  • {title}")
```

## Step 7: Performance Optimization

### Index Tuning

```python
# Profile query performance
page, _ = await conn.query("""
    PROFILE
    MATCH (m:Movie)
    WHERE vector_distance_cosine(m.embedding, $query_vec) < 0.5
    RETURN m.title, vector_distance_cosine(m.embedding, $query_vec) AS dist
    ORDER BY dist ASC
    LIMIT 10
""", {'query_vec': query_embedding})

# Check if index is used
# Look for "IndexScan [movie_embedding_idx]" in profile output
```

### Adjust HNSW Parameters

```python
# Rebuild index with different parameters for better recall
await conn.execute("DROP INDEX movie_embedding_idx")

await conn.execute("""
    CREATE INDEX movie_embedding_idx ON Movie(embedding) USING vector
    WITH {
        m: 32,              -- More connections = better recall
        ef_construction: 400, -- Higher quality index
        ef_search: 200       -- More thorough search
    }
""")

# Trade-off: Better accuracy, but slower search and more memory
```

### Limit Search Space

```python
# Pre-filter with fast index before vector search
page, _ = await conn.query("""
    MATCH (m:Movie)
    WHERE m.genre = 'Sci-Fi'  -- Fast index lookup first
      AND vector_distance_cosine(m.embedding, $query_vec) < 0.5
    RETURN m.title
    ORDER BY vector_distance_cosine(m.embedding, $query_vec) ASC
    LIMIT 10
""", {'query_vec': query_embedding})
```

## Step 8: Production Best Practices

### Normalize Embeddings

```python
# Normalize vectors for consistent comparisons
def normalize_embedding(embedding):
    """L2 normalization"""
    norm = np.linalg.norm(embedding)
    return (embedding / norm).tolist() if norm > 0 else embedding.tolist()

# Use normalized embeddings
text = "example text"
embedding = model.encode(text)
normalized_emb = normalize_embedding(embedding)

await conn.execute("""
    CREATE (:Item {
        text: $text,
        embedding: $embedding
    })
""", {'text': text, 'embedding': normalized_emb})
```

### Handle Missing Embeddings

```python
# Gracefully handle items without embeddings
page, _ = await conn.query("""
    MATCH (m:Movie)
    WHERE m.embedding IS NOT NULL
      AND vector_distance_cosine(m.embedding, $query_vec) < 0.5
    RETURN m.title
    ORDER BY vector_distance_cosine(m.embedding, $query_vec) ASC
""", {'query_vec': query_embedding})
```

### Batch Embedding Generation

```python
# Generate embeddings in batches for efficiency
def batch_generate_embeddings(texts, batch_size=32):
    """Generate embeddings in batches"""
    embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_embeddings = model.encode(batch)
        embeddings.extend(batch_embeddings)
    return embeddings

# Use for large datasets
texts = [f"{m['title']}. {m['description']}" for m in movies]
embeddings = batch_generate_embeddings(texts, batch_size=32)

for movie, embedding in zip(movies, embeddings):
    movie['embedding'] = embedding.tolist()
```

## Complete Example: Product Recommendations

```python
# E-commerce product recommendation system

# Sample products
products = [
    {"id": "p1", "name": "Wireless Headphones", "desc": "Premium noise-cancelling wireless headphones with 30-hour battery", "price": 299},
    {"id": "p2", "name": "Bluetooth Speaker", "desc": "Portable waterproof Bluetooth speaker with deep bass", "price": 89},
    {"id": "p3", "name": "Smart Watch", "desc": "Fitness tracking smartwatch with heart rate monitor and GPS", "price": 399},
    {"id": "p4", "name": "Running Shoes", "desc": "Lightweight running shoes with advanced cushioning technology", "price": 120},
    {"id": "p5", "name": "Fitness Tracker", "desc": "Activity tracker with sleep monitoring and step counting", "price": 79},
]

# Generate and store embeddings
await conn.execute("CREATE GRAPH ProductRecommendations; USE ProductRecommendations;")

for product in products:
    text = f"{product['name']}. {product['desc']}"
    embedding = model.encode(text).tolist()

    await conn.execute("""
        CREATE (:Product {
            id: $id,
            name: $name,
            description: $desc,
            price: $price,
            embedding: $embedding
        })
    """, {**product, 'embedding': embedding})

# Create index
await conn.execute("CREATE INDEX product_emb_idx ON Product(embedding) USING vector")

# User query: "fitness gadget for running"
query = "fitness gadget for running"
query_emb = model.encode(query).tolist()

page, _ = await conn.query("""
    MATCH (p:Product)
    WHERE vector_distance_cosine(p.embedding, $query_vec) < 0.7
    RETURN p.name,
           p.price,
           vector_distance_cosine(p.embedding, $query_vec) AS relevance
    ORDER BY relevance ASC
    LIMIT 3
""", {'query_vec': query_emb})

print(f"\nRecommendations for: '{query}'")
for i, row in enumerate(page.rows, 1):
    name = row["p.name"].raw_value
    price = row["p.price"].raw_value
    relevance = row["relevance"].raw_value
    print(f"{i}. {name} - ${price} (score: {1-relevance:.2f})")

# Expected output:
# Recommendations for: 'fitness gadget for running'
# 1. Fitness Tracker - $79 (score: 0.85)
# 2. Smart Watch - $399 (score: 0.78)
# 3. Running Shoes - $120 (score: 0.72)
```

## Troubleshooting

### Index Not Being Used

**Problem**: Queries slow despite having vector index

**Solutions**:
```python
# 1. Verify index exists
await conn.query("SHOW INDEXES ON Movie")

# 2. Check index is ready
# (Index builds asynchronously)

# 3. Use EXPLAIN to verify
await conn.query("""
    EXPLAIN
    MATCH (m:Movie)
    WHERE vector_distance_cosine(m.embedding, $vec) < 0.5
    RETURN m
""", {'vec': query_embedding})
# Look for "IndexScan [movie_embedding_idx]"
```

### Out of Memory

**Problem**: Large embeddings cause memory issues

**Solutions**:
- Use smaller embedding models (384 dims vs 768 dims)
- Reduce `ef_construction` and `m` parameters
- Index only frequently searched items
- Use dimensionality reduction (PCA)

### Poor Recall

**Problem**: Missing relevant results

**Solutions**:
```python
# Increase ef_search parameter
await conn.execute("""
    CREATE INDEX better_recall_idx ON Movie(embedding) USING vector
    WITH {ef_search: 300}  -- Higher = better recall
""")

# Increase distance threshold
page, _ = await conn.query("""
    MATCH (m:Movie)
    WHERE vector_distance_cosine(m.embedding, $query_vec) < 0.8  -- More lenient
    RETURN m.title
""", {'query_vec': query_embedding})
```

## Next Steps

- [Real-Time Analytics](/docs/analytics/real-time-analytics/) - Stream embeddings with CDC
- [Graph Algorithms](/docs/analytics/graph-algorithms/) - Combine vector search with graph traversal
- [Performance Tuning](/docs/performance/) - Optimize large-scale vector search
- [Data Types Reference](/docs/data-types/) - VectorF32 and VectorI32 types

## Quick Reference

### Distance Functions

```gql
-- Cosine distance (0-2, lower = more similar)
vector_distance_cosine(vec1, vec2)

-- L2 distance (Euclidean)
vector_distance_l2(vec1, vec2)

-- Inner product (higher = more similar)
vector_inner_product(vec1, vec2)

-- Manhattan distance (L1)
vector_distance_l1(vec1, vec2)
```

### Index Commands

```gql
-- Create vector index
CREATE INDEX idx_name ON Label(property) USING vector;

-- Create with parameters
CREATE INDEX idx_name ON Label(property) USING vector
WITH {m: 16, ef_construction: 200, ef_search: 100};

-- Drop index
DROP INDEX idx_name;

-- Show indexes
SHOW INDEXES ON Label;
```

### Python Helpers

```python
# Normalize vector
def normalize(vec):
    return vec / np.linalg.norm(vec)

# Cosine similarity
def cosine_sim(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# L2 distance
def l2_dist(a, b):
    return np.linalg.norm(a - b)
```

---

**Tutorial Complete!** You now understand vector similarity search in Geode.

**Next**: [Transaction Patterns Tutorial](/docs/tutorials/transaction-patterns-tutorial/)
