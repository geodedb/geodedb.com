---
title: "Recommendation Systems"
description: "Build personalized recommendation engines using collaborative filtering, graph embeddings, and vector similarity search with Geode"
url: /docs/use-cases/recommendations/
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
-- Find users similar to current user and their recommendations
MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
WITH similar, COUNT(item) AS common_purchases
ORDER BY common_purchases DESC LIMIT 10
MATCH (similar)-[:PURCHASED]->(recommended:Item)
WHERE NOT EXISTS { MATCH (me:User {id: $user_id})-[:PURCHASED]->(recommended) }
WITH recommended, COUNT(similar) AS recommendation_strength
RETURN recommended.name, recommendation_strength
ORDER BY recommendation_strength DESC LIMIT 20;
```

{{< tabs >}}
{{< tab "Go" >}}

```go
func getCollaborativeRecommendations(ctx context.Context, db *sql.DB, userID string) ([]Recommendation, error) {
    rows, err := db.QueryContext(ctx, `
        MATCH (me:User {id: ?})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
        WITH similar, COUNT(item) AS common ORDER BY common DESC LIMIT 10
        MATCH (similar)-[:PURCHASED]->(rec:Item)
        WHERE NOT EXISTS { MATCH (me:User {id: ?})-[:PURCHASED]->(rec) }
        WITH rec, COUNT(similar) AS strength
        RETURN rec.name, rec.category, strength
        ORDER BY strength DESC LIMIT 20
    `, userID, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var recs []Recommendation
    for rows.Next() {
        var r Recommendation
        rows.Scan(&r.Name, &r.Category, &r.Score)
        recs = append(recs, r)
    }
    return recs, nil
}
```

{{< /tab >}}
{{< tab "Python" >}}

```python
async def get_collaborative_recommendations(conn, user_id: str, limit: int = 20):
    page, _ = await conn.query("""
        MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
        WITH similar, COUNT(item) AS common ORDER BY common DESC LIMIT 10
        MATCH (similar)-[:PURCHASED]->(rec:Item)
        WHERE NOT EXISTS { MATCH (me:User {id: $user_id})-[:PURCHASED]->(rec) }
        WITH rec, COUNT(similar) AS strength
        RETURN rec.name, rec.category, strength
        ORDER BY strength DESC LIMIT $limit
    """, {"user_id": user_id, "limit": limit})

    return [
        {"name": row["rec.name"].as_string, "strength": row["strength"].as_int}
        for row in page.rows
    ]
```

{{< /tab >}}
{{< tab "Rust" >}}

```rust
async fn get_collaborative_recommendations(conn: &mut Connection, user_id: &str) -> Result<Vec<Recommendation>> {
    let params = [("user_id", Value::string(user_id))].into();
    let (page, _) = conn.query_with_params(r#"
        MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
        WITH similar, COUNT(item) AS common ORDER BY common DESC LIMIT 10
        MATCH (similar)-[:PURCHASED]->(rec:Item)
        WHERE NOT EXISTS { MATCH (me:User {id: $user_id})-[:PURCHASED]->(rec) }
        WITH rec, COUNT(similar) AS strength
        RETURN rec.name, rec.category, strength ORDER BY strength DESC LIMIT 20
    "#, &params).await?;

    Ok(page.rows.iter().map(|row| Recommendation {
        name: row.get("rec.name").unwrap().as_string().unwrap(),
        category: row.get("rec.category").unwrap().as_string().unwrap(),
        score: row.get("strength").unwrap().as_int().unwrap() as f64,
    }).collect())
}
```

{{< /tab >}}
{{< tab "Node.js" >}}

```typescript
async function getCollaborativeRecommendations(userId: string, limit = 20) {
    const rows = await client.queryAll(`
        MATCH (me:User {id: $userId})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
        WITH similar, COUNT(item) AS common ORDER BY common DESC LIMIT 10
        MATCH (similar)-[:PURCHASED]->(rec:Item)
        WHERE NOT EXISTS { MATCH (me:User {id: $userId})-[:PURCHASED]->(rec) }
        WITH rec, COUNT(similar) AS strength
        RETURN rec.name, rec.category, strength ORDER BY strength DESC LIMIT $limit
    `, { params: { userId, limit } });

    return rows.map(row => ({
        name: row.get('rec.name')?.asString,
        category: row.get('rec.category')?.asString,
        strength: row.get('strength')?.asNumber
    }));
}
```

{{< /tab >}}
{{< tab "Zig" >}}

```zig
fn getCollaborativeRecommendations(client: *GeodeClient, allocator: std.mem.Allocator, user_id: []const u8) ![]Recommendation {
    // Build params JSON object
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("user_id", .{ .string = user_id });

    const query =
        \\MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
        \\WITH similar, COUNT(item) AS common ORDER BY common DESC LIMIT 10
        \\MATCH (similar)-[:PURCHASED]->(rec:Item)
        \\WHERE NOT EXISTS { MATCH (me:User {id: $user_id})-[:PURCHASED]->(rec) }
        \\WITH rec, COUNT(similar) AS strength
        \\RETURN rec.name, strength ORDER BY strength DESC LIMIT 20
    ;

    try client.sendRunGql(1, query, .{ .object = params });
    const schema = try client.receiveMessage(30000);
    allocator.free(schema);

    try client.sendPull(1, 1000);
    const result = try client.receiveMessage(30000);
    defer allocator.free(result);
    return parseRecommendations(allocator, result);
}
```

{{< /tab >}}
{{< /tabs >}}

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
-- Find items similar to the user's recent purchases.
-- Geode has no vector-averaging function, so instead of building a single
-- preference vector, score each candidate by its mean cosine distance to the
-- recently purchased items.
MATCH (me:User {id: $user_id})-[p:PURCHASED]->(item:Item)
WHERE p.timestamp > timestamp() - interval('P30D')  -- Last 30 days
MATCH (recommended:Item)
WHERE NOT EXISTS {
  MATCH (me)-[:PURCHASED]->(recommended)
}
WITH
  recommended,
  avg(distance(recommended.embedding, item.embedding, 'cosine')) AS distance
WHERE distance < 0.5
RETURN
  recommended.name,
  recommended.category,
  distance
ORDER BY distance ASC  -- cosine distance: lower = more similar
LIMIT 20;
```

If you need a true centroid ("user preference vector"), compute it in the
client from the embeddings returned by a `MATCH`, then pass it back as a query
parameter (`$user_embedding`) built with `vectorf32(...)`.

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
  AVG(distance(purchased.embedding, recommended.embedding, 'cosine')) AS avg_distance

-- Weighted final score (invert the distance so higher = better)
WITH recommended,
  (collab_score * 0.5) + (social_score * 0.3) + ((1 - avg_distance) * 0.2) AS final_score
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
