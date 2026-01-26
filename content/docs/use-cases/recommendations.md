---
title: "Recommendation Systems"
description: "Build personalized recommendation engines using collaborative filtering, graph embeddings, and vector similarity search with Geode"
weight: 30
tags:
  - recommendations
  - collaborative-filtering
  - embeddings
  - vector-search
  - use-case
categories:
  - use-cases
  - graph-algorithms-and-analytics
keywords:
  - recommendation engine
  - collaborative filtering
  - graph embeddings
  - vector similarity
  - personalization
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Recommendation Systems

Build scalable, real-time recommendation engines using graph traversal, ML embeddings, and vector similarity search.

## Problem Statement

Recommendation systems predict user preferences based on:
- **Collaborative filtering**: Users with similar tastes like similar items
- **Content-based**: Items with similar features are recommended
- **Graph-based**: Relationships reveal preferences (friends' likes, purchase patterns)

Graph databases excel at traversing relationships and computing similarity.

## Graph Model

```gql
CREATE GRAPH RecommendationEngine;
USE RecommendationEngine;

-- Nodes
(:User {
  id: UUID,
  name: String,
  demographics: JSONB,
  embedding: VectorF32  -- User behavior embedding
})

(:Item {
  id: UUID,
  name: String,
  category: String,
  price: Decimal,
  features: JSONB,
  embedding: VectorF32  -- Item feature embedding
})

(:Category {
  name: String
})

-- Relationships
(:User)-[:VIEWED {timestamp: Timestamp}]->(:Item)
(:User)-[:PURCHASED {timestamp: Timestamp, rating: Int}]->(:Item)
(:User)-[:RATED {score: Float, timestamp: Timestamp}]->(:Item)
(:User)-[:FOLLOWS]->(:User)
(:Item)-[:IN_CATEGORY]->(:Category)
(:Item)-[:SIMILAR_TO {score: Float}]->(:Item)
```

## Recommendation Strategies

### 1. Collaborative Filtering (User-User)

Recommend items liked by similar users:

```gql
-- Find users similar to current user
MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
WITH similar, COUNT(item) AS common_purchases
ORDER BY common_purchases DESC
LIMIT 10

-- Get items purchased by similar users but not by me
MATCH (similar)-[:PURCHASED]->(recommended:Item)
WHERE NOT EXISTS {
  MATCH (me:User {id: $user_id})-[:PURCHASED]->(recommended)
}
WITH recommended, COUNT(similar) AS recommendation_strength
RETURN recommended.name, recommendation_strength
ORDER BY recommendation_strength DESC
LIMIT 20;
```

### 2. Collaborative Filtering (Item-Item)

Recommend items similar to user's purchases:

```gql
-- Find items similar to what user has purchased
MATCH (me:User {id: $user_id})-[:PURCHASED]->(purchased:Item)
MATCH (purchased)<-[:PURCHASED]-(other:User)-[:PURCHASED]->(recommended:Item)
WHERE NOT EXISTS {
  MATCH (me)-[:PURCHASED]->(recommended)
}
WITH recommended, COUNT(DISTINCT other) AS co_purchase_count
RETURN recommended.name, co_purchase_count
ORDER BY co_purchase_count DESC
LIMIT 20;
```

### 3. Social Recommendations

Recommend based on what friends like:

```gql
-- Items purchased by friends
MATCH (me:User {id: $user_id})-[:FOLLOWS]->(friend:User)-[:PURCHASED]->(item:Item)
WHERE NOT EXISTS {
  MATCH (me)-[:PURCHASED]->(item)
}
WITH item, COLLECT(friend.name) AS friends_who_bought, COUNT(friend) AS friend_count
RETURN item.name, friends_who_bought, friend_count
ORDER BY friend_count DESC
LIMIT 20;
```

### 4. Content-Based (Category Preferences)

Recommend items in categories the user likes:

```gql
-- Find user's preferred categories
MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)-[:IN_CATEGORY]->(cat:Category)
WITH cat, COUNT(item) AS purchase_count
ORDER BY purchase_count DESC
LIMIT 3

-- Recommend popular items in preferred categories
MATCH (cat)<-[:IN_CATEGORY]-(recommended:Item)
WHERE NOT EXISTS {
  MATCH (me:User {id: $user_id})-[:PURCHASED]->(recommended)
}
WITH recommended, COUNT {MATCH (:User)-[:PURCHASED]->(recommended)} AS popularity
RETURN recommended.name, recommended.category, popularity
ORDER BY popularity DESC
LIMIT 20;
```

## Embedding-Based Recommendations

### Generate Item Embeddings

Use Node2Vec to create item embeddings based on co-purchase patterns:

```gql
-- Generate item embeddings
CALL graph.node2vec('RecommendationEngine', {
  relationship_type: 'PURCHASED',
  dimensions: 128,
  walk_length: 80,
  num_walks: 10,
  p: 1.0,
  q: 1.0
})
YIELD node, embedding
WITH node, embedding
MATCH (item:Item)
WHERE item.id = node.id
SET item.embedding = embedding;
```

### Create Vector Index

```gql
CREATE INDEX item_embedding_idx ON Item(embedding) USING vector;
```

### Similarity-Based Recommendations

```gql
-- Find items similar to user's recent purchases
MATCH (me:User {id: $user_id})-[p:PURCHASED]->(item:Item)
WHERE p.timestamp > timestamp() - interval('P30D')  -- Last 30 days
WITH COLLECT(item.embedding) AS recent_embeddings

-- Compute average embedding (user preference vector)
WITH [e IN recent_embeddings | e] AS embeddings
CALL vector.average(embeddings) YIELD result AS user_embedding

-- Find similar items
MATCH (recommended:Item)
WHERE NOT EXISTS {
  MATCH (me:User {id: $user_id})-[:PURCHASED]->(recommended)
}
  AND vector_distance_cosine(recommended.embedding, user_embedding) < 0.5
RETURN
  recommended.name,
  recommended.category,
  vector_distance_cosine(recommended.embedding, user_embedding) AS similarity
ORDER BY similarity ASC
LIMIT 20;
```

## Hybrid Recommendation System

Combine multiple strategies with weighted scoring:

```gql
-- Collaborative filtering score
MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)-[:PURCHASED]->(recommended:Item)
WHERE NOT EXISTS {
  MATCH (me)-[:PURCHASED]->(recommended)
}
WITH recommended, COUNT(DISTINCT similar) AS collab_score

-- Social score
OPTIONAL MATCH (me:User {id: $user_id})-[:FOLLOWS]->(friend:User)-[:PURCHASED]->(recommended)
WITH recommended, collab_score, COUNT(DISTINCT friend) AS social_score

-- Similarity score (requires embeddings)
OPTIONAL MATCH (me)-[:PURCHASED]->(purchased:Item)
WITH recommended, collab_score, social_score,
  AVG(vector_distance_cosine(purchased.embedding, recommended.embedding)) AS avg_similarity

-- Weighted final score
WITH recommended,
  (collab_score * 0.5) + (social_score * 0.3) + ((1 - avg_similarity) * 0.2) AS final_score
RETURN recommended.name, final_score
ORDER BY final_score DESC
LIMIT 20;
```

## Real-Time Recommendations

### Update Embeddings on New Purchases

Use CDC to trigger embedding updates:

```yaml
# cdc-config.yaml
cdc:
  enabled: true
  webhooks:
    - url: "https://recommendation-service.example.com/update-embeddings"
      events: ["edge.created"]
      filter: "type = 'PURCHASED'"
```

### Incremental Embedding Updates

Instead of full recomputation, update embeddings incrementally:

```python
# Pseudo-code for webhook handler
async def on_purchase(event):
    user_id = event['edge']['from_node']
    item_id = event['edge']['to_node']

    # Fetch current embeddings
    user_emb = await get_user_embedding(user_id)
    item_emb = await get_item_embedding(item_id)

    # Update user embedding (weighted average with new item)
    alpha = 0.1  # Learning rate
    new_user_emb = (1 - alpha) * user_emb + alpha * item_emb

    # Persist updated embedding
    await update_user_embedding(user_id, new_user_emb)
```

## Performance Optimization

### Index Strategy

```gql
-- Index for user lookups
CREATE INDEX user_id_idx ON User(id) USING hash;

-- Index for temporal queries
CREATE INDEX purchase_timestamp_idx ON PURCHASED(timestamp) USING btree;

-- Vector index for similarity
CREATE INDEX item_embedding_idx ON Item(embedding) USING vector;
CREATE INDEX user_embedding_idx ON User(embedding) USING vector;

-- Category index
CREATE INDEX item_category_idx ON Item(category) USING btree;
```

### Materialized Recommendations

Pre-compute recommendations for active users:

```gql
-- Batch job (run nightly)
MATCH (user:User)
WHERE EXISTS {MATCH (user)-[:PURCHASED]->(:Item)}

-- Compute top 50 recommendations
CALL recommend.hybrid(user.id, {limit: 50}) YIELD item, score

-- Store in user property
WITH user, COLLECT({item_id: item.id, score: score}) AS recommendations
SET user.cached_recommendations = recommendations::jsonb;

-- Real-time query uses cache
MATCH (user:User {id: $user_id})
RETURN user.cached_recommendations;
```

## Evaluation Metrics

### Precision and Recall

```gql
-- Precision@K: % of recommended items that user purchased
MATCH (user:User {id: $user_id})
WITH user, user.cached_recommendations AS recommendations
MATCH (user)-[:PURCHASED]->(purchased:Item)
WHERE purchased.id IN [r IN recommendations | r.item_id][0..20]  -- Top 20
WITH COUNT(purchased) AS hits, 20 AS k
RETURN hits / k AS precision_at_20;
```

### Click-Through Rate (CTR)

Track recommendation clicks via CDC:

```yaml
cdc:
  webhooks:
    - url: "https://analytics.example.com/track-click"
      events: ["edge.created"]
      filter: "type = 'VIEWED'"
```

## Complete Example

```gql
-- Seed data
CREATE
  (:User {id: gen_random_uuid(), name: "Alice"}),
  (:User {id: gen_random_uuid(), name: "Bob"}),
  (:User {id: gen_random_uuid(), name: "Charlie"});

CREATE
  (:Item {id: gen_random_uuid(), name: "Laptop", category: "Electronics"}),
  (:Item {id: gen_random_uuid(), name: "Mouse", category: "Electronics"}),
  (:Item {id: gen_random_uuid(), name: "Desk Chair", category: "Furniture"}),
  (:Item {id: gen_random_uuid(), name: "Monitor", category: "Electronics"});

-- Alice and Bob purchase Laptop
MATCH (alice:User {name: "Alice"}), (laptop:Item {name: "Laptop"})
CREATE (alice)-[:PURCHASED {timestamp: timestamp()}]->(laptop);

MATCH (bob:User {name: "Bob"}), (laptop:Item {name: "Laptop"})
CREATE (bob)-[:PURCHASED {timestamp: timestamp()}]->(laptop);

-- Bob also purchases Mouse
MATCH (bob:User {name: "Bob"}), (mouse:Item {name: "Mouse"})
CREATE (bob)-[:PURCHASED {timestamp: timestamp()}]->(mouse);

-- Recommend Mouse to Alice (collaborative filtering)
MATCH (alice:User {name: "Alice"})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)-[:PURCHASED]->(recommended:Item)
WHERE NOT EXISTS {
  MATCH (alice)-[:PURCHASED]->(recommended)
}
WITH recommended, COUNT(similar) AS score
RETURN recommended.name, score
ORDER BY score DESC;
-- Returns: Mouse (score: 1)
```

## Next Steps

- [Graph Algorithms](/docs/analytics/graph-algorithms) - Embedding generation
- [Indexing and Optimization](/docs/query/indexing-and-optimization) - Vector indexes
- [Real-Time Analytics](/docs/analytics/real-time-analytics/) - CDC integration
- [Data Model and Types](/docs/model/data-model-and-types) - Vector types
