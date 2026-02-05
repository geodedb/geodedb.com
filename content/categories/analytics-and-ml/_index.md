---
title: "Category: Analytics And Ml"
description: "Comprehensive analytics-and-ml documentation for Geode graph database including guides, tutorials, and reference materials."
keywords:
  - analytics-and-ml
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/analytics-and-ml/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Graph analytics and machine learning represent one of the most powerful applications of graph database technology. Geode provides a comprehensive platform for advanced analytics, combining native graph algorithms, vector embeddings, full-text search, and seamless integration with modern ML frameworks. This enables organizations to extract insights from connected data, build recommendation systems, detect anomalies, identify communities, and power intelligent applications.

Geode's analytics capabilities leverage its graph structure to efficiently compute metrics that would require complex joins in relational databases. Built-in algorithms for centrality, community detection, pathfinding, and similarity analysis run directly on Geode's storage engine with optimizations for graph traversal. Vector search with HNSW indexing enables semantic similarity queries for AI/ML workloads, while BM25 full-text search powers content discovery and ranking.

The platform's ISO/IEC 39075:2024 compliance ensures that analytics queries use standard syntax, while ACID transactions guarantee data consistency even when updating analytical models. This category explores how to leverage Geode for graph analytics, integrate with ML pipelines, and build intelligent data-driven applications.

## Graph Analytics Fundamentals

### Understanding Graph Metrics

Graph analytics operate on the relationships between entities, revealing patterns invisible to traditional analytics:

- **Centrality** measures identify influential nodes (PageRank, betweenness, closeness)
- **Community detection** reveals natural groupings and clusters
- **Path analysis** finds optimal routes and connection patterns
- **Similarity metrics** identify related entities based on neighborhood structure
- **Degree distributions** characterize network topology

Unlike table scans or index lookups, graph algorithms traverse relationships directly, often providing O(E) complexity where E is the number of edges in the subgraph of interest.

### Native Graph Algorithm Support

Geode implements graph algorithms as native operations optimized for its storage engine:

```gql
// PageRank for influence analysis
MATCH (n:WebPage)
WITH graph.algorithms.pagerank(n, {
  iterations: 20,
  dampingFactor: 0.85,
  tolerance: 0.0001
}) AS rank
RETURN n.url, rank
ORDER BY rank DESC
LIMIT 100

// Community detection with Louvain algorithm
CALL graph.algorithms.louvain('social_network', {
  relationshipTypes: ['FRIEND', 'COLLEAGUE'],
  includeIntermediateCommunities: true
})
YIELD nodeId, communityId, modularity
RETURN communityId, COUNT(*) AS members, AVG(modularity) AS cohesion
ORDER BY members DESC

// Betweenness centrality for bridge detection
MATCH (n:Person)
WITH graph.algorithms.betweenness_centrality(n) AS centrality
WHERE centrality > 100
RETURN n.name, centrality
ORDER BY centrality DESC
```

These algorithms run in-process without data export, maintaining ACID guarantees and security policies.

## Machine Learning Integration

### Vector Embeddings and Semantic Search

Geode's HNSW (Hierarchical Navigable Small World) index enables approximate nearest neighbor search for vector embeddings, supporting ML workloads:

```python
from geode_client import Client
import numpy as np

client = Client(host="localhost", port=3141)

async with client.connection() as conn:
    # Store embeddings from your ML model
    embedding = model.encode("Graph databases for analytics")

    await conn.execute("""
        CREATE (:Article {
            title: $title,
            content: $content,
            embedding: $embedding
        })
    """, {
        'title': 'Graph Analytics Guide',
        'content': 'Full article text...',
        'embedding': embedding.tolist()  # 384-dim vector
    })

    # Semantic similarity search
    query_embedding = model.encode("machine learning with graphs")

    results = await conn.execute("""
        MATCH (a:Article)
        WITH a, vector_similarity(a.embedding, $query_vector) AS similarity
        WHERE similarity > 0.75
        RETURN a.title, a.content, similarity
        ORDER BY similarity DESC
        LIMIT 10
    """, {'query_vector': query_embedding.tolist()})
```

Vector search enables:
- **Semantic search**: Find conceptually similar content
- **Recommendations**: Suggest items based on embedding similarity
- **Anomaly detection**: Identify outliers in vector space
- **Clustering**: Group similar entities using vector distance

### Embedding Generation Patterns

Integrate with popular embedding models:

```python
# Using sentence-transformers
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

async def store_with_embeddings(client, documents):
    for doc in documents:
        embedding = model.encode(doc['text'])

        await client.execute("""
            CREATE (:Document {
                id: $id,
                text: $text,
                embedding: $embedding,
                created_at: datetime()
            })
        """, {
            'id': doc['id'],
            'text': doc['text'],
            'embedding': embedding.tolist()
        })

# Using OpenAI embeddings
import openai

async def create_with_openai_embeddings(client, text):
    response = openai.Embedding.create(
        model="text-embedding-ada-002",
        input=text
    )
    embedding = response['data'][0]['embedding']

    await client.execute("""
        CREATE (:Content {
            text: $text,
            embedding: $embedding
        })
    """, {'text': text, 'embedding': embedding})
```

### Hybrid Search: Combining Text and Semantic

Combine BM25 full-text search with vector similarity for powerful hybrid search:

```gql
// Hybrid search with weighted score fusion
MATCH (doc:Document)
WHERE text_search(doc.content, $keywords)
WITH doc,
  bm25_score(doc.content, $keywords) AS text_score,
  vector_similarity(doc.embedding, $query_vector) AS semantic_score
WITH doc,
  text_score,
  semantic_score,
  (0.6 * text_score + 0.4 * semantic_score) AS combined_score
WHERE combined_score > 0.5
RETURN doc.title, doc.summary, combined_score
ORDER BY combined_score DESC
LIMIT 20
```

This approach combines keyword matching with semantic understanding, capturing both exact terms and conceptual relevance.

## Recommendation Systems

### Collaborative Filtering

Graph structure naturally represents user-item interactions for recommendation engines:

```gql
// Item-based collaborative filtering
MATCH (user:User {id: $user_id})-[:PURCHASED]->(p:Product)
MATCH (p)<-[:PURCHASED]-(other:User)-[:PURCHASED]->(rec:Product)
WHERE NOT (user)-[:PURCHASED]->(rec)
WITH rec, COUNT(DISTINCT other) AS overlap,
     COUNT(DISTINCT p) AS user_products
WITH rec, overlap, user_products,
     (overlap * 1.0 / user_products) AS jaccard_similarity
WHERE jaccard_similarity > 0.3
RETURN rec.name, rec.category, jaccard_similarity
ORDER BY jaccard_similarity DESC
LIMIT 10

// User-based collaborative filtering with weighted similarity
MATCH (user:User {id: $user_id})-[r1:RATED]->(p:Product)<-[r2:RATED]-(similar:User)
WITH user, similar,
     COUNT(p) AS common_products,
     SUM(ABS(r1.rating - r2.rating)) AS rating_diff
WITH similar,
     common_products,
     common_products / (1.0 + rating_diff) AS similarity_score
ORDER BY similarity_score DESC
LIMIT 20
MATCH (similar)-[r:RATED]->(rec:Product)
WHERE NOT (user)-[:RATED]->(rec)
  AND r.rating >= 4.0
RETURN rec.name,
       AVG(r.rating) AS avg_rating,
       COUNT(*) AS recommendation_strength
ORDER BY recommendation_strength DESC, avg_rating DESC
LIMIT 10
```

### Content-Based Recommendations

Combine graph relationships with vector similarity:

```gql
// Content-based recommendations using embeddings and graph features
MATCH (user:User {id: $user_id})-[:LIKED]->(item:Item)
WITH COLLECT(item.embedding) AS liked_embeddings,
     COLLECT(item.category) AS preferred_categories

// Create user preference vector (centroid)
WITH reduce(sum = [0.0] * 384, emb IN liked_embeddings |
       vector_add(sum, emb)) AS user_vector,
     preferred_categories

MATCH (candidate:Item)
WHERE candidate.category IN preferred_categories
  AND NOT (user)-[:LIKED|DISLIKED]->(candidate)
WITH candidate,
     vector_similarity(user_vector, candidate.embedding) AS content_similarity
WHERE content_similarity > 0.7
RETURN candidate.title, candidate.category, content_similarity
ORDER BY content_similarity DESC
LIMIT 15
```

## Anomaly Detection

### Graph-Based Anomaly Detection

Detect unusual patterns using graph structure:

```gql
// Detect anomalous transaction patterns
MATCH (account:Account)-[t:TRANSACTION]->(recipient:Account)
WITH account,
     COUNT(t) AS tx_count,
     AVG(t.amount) AS avg_amount,
     STDDEV(t.amount) AS stddev_amount,
     COLLECT(DISTINCT recipient.country) AS countries
WHERE tx_count > 10
WITH account, tx_count, avg_amount, stddev_amount, countries,
     SIZE(countries) AS country_count

// Flag accounts with unusual patterns
MATCH (account)-[t:TRANSACTION]->(r:Account)
WHERE t.amount > (avg_amount + 3 * stddev_amount)  // Outlier detection
   OR country_count > 10  // Unusual geographic spread
   OR tx_count > 100  // High transaction volume
RETURN account.id,
       tx_count,
       country_count,
       t.amount AS suspicious_amount,
       avg_amount + 3 * stddev_amount AS threshold,
       'outlier_detection' AS reason
```

### Community-Based Anomaly Detection

Identify entities that don't fit their community:

```gql
// Detect nodes with unusual community membership
CALL graph.algorithms.louvain('transaction_network')
YIELD nodeId, communityId

MATCH (n) WHERE id(n) = nodeId
WITH n, communityId,
     SIZE((n)--()) AS degree,
     SIZE((n)--(m) WHERE m.communityId = communityId) AS internal_degree
WITH n, communityId,
     internal_degree * 1.0 / degree AS community_affinity
WHERE community_affinity < 0.3  // Weak community membership
RETURN n.id, communityId, community_affinity
ORDER BY community_affinity ASC
```

## Fraud Detection

### Pattern Matching for Fraud

Graph patterns reveal complex fraud schemes:

```gql
// Detect circular payment patterns (potential money laundering)
MATCH path = (a:Account)-[:TRANSFER*3..5]->(a)
WHERE ALL(r IN relationships(path) WHERE r.amount > 10000)
  AND reduce(total = 0, r IN relationships(path) | total + r.amount) > 50000
WITH path,
     nodes(path) AS accounts,
     reduce(total = 0, r IN relationships(path) | total + r.amount) AS cycle_amount
RETURN accounts,
       cycle_amount,
       LENGTH(path) AS cycle_length,
       'circular_transfer' AS fraud_type

// Detect identity fraud through shared attributes
MATCH (a1:Account), (a2:Account)
WHERE id(a1) < id(a2)
  AND a1.phone = a2.phone
  AND a1.address = a2.address
  AND a1.email <> a2.email
WITH a1, a2,
     SIZE((a1)-[:TRANSACTION]->()) AS a1_tx,
     SIZE((a2)-[:TRANSACTION]->()) AS a2_tx
WHERE a1_tx > 0 AND a2_tx > 0
RETURN a1.id, a2.id,
       a1.phone AS shared_phone,
       a1.address AS shared_address,
       'identity_fraud_suspect' AS fraud_type
```

## Time-Series Analysis on Graphs

### Temporal Pattern Analysis

Combine graph structure with temporal queries:

```gql
// Analyze user behavior over time
MATCH (u:User {id: $user_id})-[a:ACTION]->(entity)
WHERE a.timestamp >= datetime() - duration('P30D')
WITH u,
     DATE(a.timestamp) AS day,
     a.action_type AS action,
     COUNT(*) AS action_count
WITH u, day,
     COLLECT({action: action, count: action_count}) AS daily_actions
RETURN day, daily_actions
ORDER BY day ASC

// Detect trend changes
MATCH (product:Product)<-[sale:SOLD]-(order:Order)
WHERE sale.timestamp >= datetime() - duration('P90D')
WITH product,
     DATE(sale.timestamp) AS week,
     COUNT(*) AS weekly_sales
ORDER BY product, week
WITH product,
     COLLECT(weekly_sales) AS sales_series
WITH product, sales_series,
     sales_series[-4..] AS recent_sales,
     sales_series[0..4] AS early_sales
WHERE AVG(recent_sales) > 1.5 * AVG(early_sales)
RETURN product.name,
       AVG(early_sales) AS avg_early_sales,
       AVG(recent_sales) AS avg_recent_sales,
       (AVG(recent_sales) - AVG(early_sales)) / AVG(early_sales) AS growth_rate
ORDER BY growth_rate DESC
```

## Feature Engineering

### Graph Features for ML Models

Extract graph-based features for training ML models:

```python
from geode_client import Client
import pandas as pd

async def extract_node_features(client, node_label):
    """Extract graph features for ML training."""

    features, _ = await client.query(f"""
        MATCH (n:{node_label})
        WITH n,
             SIZE((n)--()) AS degree,
             SIZE((n)-->()) AS out_degree,
             SIZE((n)<--()) AS in_degree,
             graph.algorithms.pagerank(n) AS pagerank,
             graph.algorithms.clustering_coefficient(n) AS clustering,
             graph.algorithms.closeness_centrality(n) AS closeness
        RETURN
            id(n) AS node_id,
            degree,
            out_degree,
            in_degree,
            pagerank,
            clustering,
            closeness
    """)

    return pd.DataFrame([dict(r) for r in features])

# Use features in scikit-learn
from sklearn.ensemble import RandomForestClassifier

async def train_node_classifier(client):
    # Extract features
    df = await extract_node_features(client, 'User')

    # Get labels (assuming they exist)
    labels, _ = await client.query("""
        MATCH (n:User)
        RETURN id(n) AS node_id, n.is_fraudulent AS label
    """)
    label_df = pd.DataFrame([dict(r) for r in labels])

    # Merge and train
    training_data = df.merge(label_df, on='node_id')
    X = training_data.drop(['node_id', 'label'], axis=1)
    y = training_data['label']

    model = RandomForestClassifier(n_estimators=100)
    model.fit(X, y)

    return model
```

## Performance Optimization for Analytics

### Batch Processing

For large-scale analytics, use batch processing:

```gql
// Process in batches using SKIP and LIMIT
WITH 1000 AS batch_size, 0 AS offset
MATCH (n:User)
SKIP offset LIMIT batch_size
WITH n, graph.algorithms.pagerank(n) AS rank
SET n.pagerank = rank
RETURN COUNT(*) AS processed

// Parallel batch processing (multiple sessions)
// Session 1: Process users 0-999
// Session 2: Process users 1000-1999
// etc.
```

### Index Optimization

Create indexes for analytical queries:

```gql
// Create indexes for common analytical patterns
CREATE INDEX user_activity_idx ON :User(last_active_date, registration_date)
CREATE INDEX transaction_time_idx ON :Transaction(timestamp, amount)
CREATE INDEX product_category_idx ON :Product(category, price)

// Use indexes in analytical queries
MATCH (u:User)
WHERE u.last_active_date >= datetime() - duration('P30D')
  AND u.registration_date <= datetime() - duration('P365D')
RETURN COUNT(*) AS retained_users
```

## Best Practices

### Choosing the Right Approach

- **Use native graph algorithms** for standard metrics (PageRank, community detection)
- **Use vector search** for semantic similarity and ML integration
- **Use BM25** for keyword-based content search
- **Combine approaches** for hybrid analytics (graph + ML + search)

### Data Pipeline Integration

Integrate Geode with your ML pipeline:

1. **Feature Store Pattern**: Store engineered features in Geode for real-time serving
2. **Online/Offline Consistency**: Use same queries for batch training and online inference
3. **Incremental Updates**: Use CDC to update ML models when graph changes
4. **A/B Testing**: Use graph partitioning for controlled experiments

### Scalability Considerations

- **Limit traversal depth** in production queries (use explicit depth limits)
- **Use property indexes** to filter before traversal
- **Cache frequently computed metrics** (PageRank, centrality)
- **Consider distributed mode** for graphs with billions of edges
- **Monitor query performance** with EXPLAIN and PROFILE

## Further Reading

- [Graph Algorithms](/tags/graph-algorithms/) - Built-in algorithm reference
- [Vector Search](/tags/vector-search/) - HNSW and embeddings
- [BM25 Full-Text Search](/tags/bm25/) - Text ranking and search
- [Performance Optimization](/categories/performance/) - Query tuning
- [Fraud Detection Patterns](/tags/fraud-detection/) - Graph-based fraud detection
- [Anomaly Detection](/tags/anomaly-detection/) - Unusual pattern detection
- [Community Detection](/tags/community-detection/) - Clustering algorithms
- [Recommendation Systems](/tags/collaborative-filtering/) - Recommendation patterns
