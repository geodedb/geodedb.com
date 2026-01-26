---
title: "Recommendation Systems"
description: "Build recommendation engines with Geode graph database. Implement collaborative filtering, content-based recommendations, and personalized suggestions using GQL graph traversals and similarity algorithms."
keywords:
  - recommendations
  - recommendation engine
  - collaborative filtering
  - content-based filtering
  - personalization
  - similarity
  - graph traversal
  - Geode
  - GQL
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/recommendations/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Recommendation Systems in Geode

Recommendation systems leverage graph relationships to suggest relevant items, connections, and content based on user behavior, preferences, and network patterns. Geode's native graph traversal capabilities enable sophisticated recommendation algorithms that consider multi-hop relationships and complex similarity metrics.

## Understanding Graph-Based Recommendations

Graph databases excel at recommendations because they naturally model the relationships between users, items, and attributes that drive recommendation quality. Instead of computing recommendations from flat tables, you traverse the graph to discover relevant connections.

### Core Recommendation Types

**Collaborative Filtering**: Recommend items based on similar users' behavior ("users like you also liked...").

**Content-Based Filtering**: Recommend items similar to those a user previously liked based on item attributes.

**Hybrid Approaches**: Combine collaborative and content-based methods for better accuracy and coverage.

**Social Recommendations**: Leverage social network connections to recommend items friends engaged with.

## Collaborative Filtering

Collaborative filtering finds users with similar tastes and recommends items those similar users enjoyed.

### User-Based Collaborative Filtering

```gql
-- Find similar users and their preferences
MATCH (target_user:User {id: $user_id})-[:RATED]->(item:Product)<-[:RATED]-(similar_user:User)
WHERE target_user <> similar_user
WITH similar_user,
     COUNT(DISTINCT item) AS common_items,
     COLLECT(DISTINCT item) AS shared_products
WHERE common_items >= 3
MATCH (similar_user)-[r:RATED]->(recommendation:Product)
WHERE NOT EXISTS { (target_user)-[:RATED]->(recommendation) }
  AND r.rating >= 4
RETURN recommendation.id AS product_id,
       recommendation.name AS product_name,
       COUNT(DISTINCT similar_user) AS recommended_by,
       AVG(r.rating) AS avg_rating,
       common_items
ORDER BY recommended_by DESC, avg_rating DESC
LIMIT 20;
```

### Item-Based Collaborative Filtering

```gql
-- Recommend items similar to those user already likes
MATCH (user:User {id: $user_id})-[r:RATED]->(liked:Product)
WHERE r.rating >= 4
MATCH (liked)<-[:RATED]-(other_user:User)-[:RATED]->(recommendation:Product)
WHERE NOT EXISTS { (user)-[:RATED]->(recommendation) }
WITH recommendation,
     COUNT(DISTINCT other_user) AS co_occurrence,
     AVG(CASE WHEN r2.rating IS NOT NULL THEN r2.rating ELSE 0 END) AS avg_rating
ORDER BY co_occurrence DESC, avg_rating DESC
RETURN recommendation.id,
       recommendation.name,
       recommendation.category,
       co_occurrence AS similarity_score,
       avg_rating
LIMIT 20;
```

### Weighted Similarity Scoring

```gql
-- Calculate Jaccard similarity between users
MATCH (user1:User {id: $user_id})-[:RATED]->(item:Product)<-[:RATED]-(user2:User)
WITH user1,
     user2,
     COUNT(DISTINCT item) AS intersection
MATCH (user1)-[:RATED]->(item1:Product)
WITH user1, user2, intersection, COUNT(DISTINCT item1) AS user1_items
MATCH (user2)-[:RATED]->(item2:Product)
WITH user1,
     user2,
     intersection,
     user1_items,
     COUNT(DISTINCT item2) AS user2_items,
     (user1_items + user2_items - intersection) AS union_count
WITH user2,
     intersection * 1.0 / union_count AS jaccard_similarity
WHERE jaccard_similarity > 0.2
MATCH (user2)-[r:RATED]->(rec:Product)
WHERE NOT EXISTS { (user1)-[:RATED]->(rec) }
  AND r.rating >= 4
RETURN rec.id,
       rec.name,
       jaccard_similarity,
       COUNT(*) AS recommendation_count
ORDER BY jaccard_similarity DESC, recommendation_count DESC;
```

## Content-Based Recommendations

Content-based filtering recommends items with similar attributes to those the user liked.

### Attribute Similarity

```gql
-- Recommend products with similar attributes
MATCH (user:User {id: $user_id})-[r:PURCHASED]->(purchased:Product)
WHERE r.timestamp > CURRENT_TIMESTAMP - INTERVAL '90' DAY
MATCH (purchased)-[:HAS_CATEGORY]->(category:Category)<-[:HAS_CATEGORY]-(similar:Product)
WHERE NOT EXISTS { (user)-[:PURCHASED]->(similar) }
WITH similar,
     COUNT(DISTINCT category) AS shared_categories,
     COLLECT(DISTINCT category.name) AS categories
MATCH (similar)-[:HAS_TAG]->(tag:Tag)
WHERE EXISTS {
    MATCH (user)-[:PURCHASED]->(:Product)-[:HAS_TAG]->(tag)
}
WITH similar,
     shared_categories,
     COUNT(DISTINCT tag) AS shared_tags
RETURN similar.id,
       similar.name,
       shared_categories,
       shared_tags,
       (shared_categories * 2 + shared_tags) AS similarity_score
ORDER BY similarity_score DESC
LIMIT 20;
```

### Vector Similarity

```gql
-- Use embeddings for content similarity
MATCH (user:User {id: $user_id})-[:LIKED]->(item:Item)
WITH AVG([i IN COLLECT(item) | i.embedding]) AS user_profile_vector
MATCH (candidate:Item)
WHERE NOT EXISTS { (user)-[:LIKED]->(candidate) }
WITH candidate,
     COSINE_SIMILARITY(user_profile_vector, candidate.embedding) AS similarity
WHERE similarity > 0.7
RETURN candidate.id,
       candidate.title,
       similarity
ORDER BY similarity DESC
LIMIT 20;
```

## Social Recommendations

Leverage social network connections for recommendations.

### Friend-Based Recommendations

```gql
-- Recommend items friends engaged with
MATCH (user:User {id: $user_id})-[:FOLLOWS]->(friend:User)-[interaction:LIKED|PURCHASED]->(item:Product)
WHERE NOT EXISTS { (user)-[:LIKED|PURCHASED]->(item) }
  AND interaction.timestamp > CURRENT_TIMESTAMP - INTERVAL '30' DAY
WITH item,
     COUNT(DISTINCT friend) AS friend_count,
     COLLECT(DISTINCT friend.name)[..5] AS engaging_friends,
     MAX(interaction.timestamp) AS most_recent
RETURN item.id,
       item.name,
       friend_count,
       engaging_friends,
       most_recent
ORDER BY friend_count DESC, most_recent DESC
LIMIT 20;
```

### Influencer Recommendations

```gql
-- Weight recommendations by friend influence
MATCH (user:User {id: $user_id})-[:FOLLOWS]->(friend:User)
WITH friend,
     COUNT { (friend)<-[:FOLLOWS]-() } AS follower_count,
     COUNT { (user)-[:FOLLOWS]->() } AS user_following_count
WITH friend,
     LOG(1 + follower_count) / LOG(1 + user_following_count) AS influence_weight
MATCH (friend)-[r:RATED]->(item:Product)
WHERE NOT EXISTS { (user)-[:RATED]->(item) }
  AND r.rating >= 4
WITH item,
     SUM(r.rating * influence_weight) AS weighted_score,
     COUNT(DISTINCT friend) AS recommendation_count
RETURN item.id,
       item.name,
       weighted_score,
       recommendation_count
ORDER BY weighted_score DESC
LIMIT 20;
```

## Context-Aware Recommendations

Incorporate contextual signals like time, location, and session behavior.

### Session-Based Recommendations

```gql
-- Recommend based on current session behavior
MATCH (user:User {id: $user_id})-[view:VIEWED]->(recent:Product)
WHERE view.timestamp > CURRENT_TIMESTAMP - INTERVAL '1' HOUR
WITH COLLECT(DISTINCT recent) AS session_items
MATCH (session_item:Product)<-[:VIEWED]-(other:User)-[:PURCHASED]->(next:Product)
WHERE session_item IN session_items
  AND NOT EXISTS { (user)-[:PURCHASED]->(next) }
WITH next,
     COUNT(*) AS co_view_purchase_count,
     AVG(CASE WHEN r.rating IS NOT NULL THEN r.rating ELSE 0 END) AS avg_rating
RETURN next.id,
       next.name,
       co_view_purchase_count AS relevance_score,
       avg_rating
ORDER BY relevance_score DESC, avg_rating DESC
LIMIT 10;
```

### Time-Aware Recommendations

```gql
-- Recommend seasonally relevant items
MATCH (user:User {id: $user_id})-[:PURCHASED]->(past:Product)
WHERE EXTRACT(MONTH FROM past.purchase_timestamp) = EXTRACT(MONTH FROM CURRENT_TIMESTAMP)
WITH COLLECT(DISTINCT past.category) AS seasonal_categories
MATCH (rec:Product)
WHERE rec.category IN seasonal_categories
  AND NOT EXISTS { (user)-[:PURCHASED]->(rec) }
  AND rec.in_stock = true
WITH rec,
     COUNT {
         (other:User)-[p:PURCHASED]->(rec)
         WHERE EXTRACT(MONTH FROM p.timestamp) = EXTRACT(MONTH FROM CURRENT_TIMESTAMP)
     } AS seasonal_popularity
RETURN rec.id,
       rec.name,
       rec.category,
       seasonal_popularity
ORDER BY seasonal_popularity DESC
LIMIT 20;
```

## Personalized PageRank for Recommendations

Use personalized PageRank to find items relevant to a user's interests.

### Computing Personalized Recommendations

```gql
-- Initialize personalized PageRank from user's interests
MATCH (user:User {id: $user_id})-[:INTERESTED_IN]->(seed:Topic)
MATCH (item:Item)-[:TAGGED_WITH]->(topic:Topic)
SET item.ppr = CASE
    WHEN topic IN [seed] THEN 1.0 / COUNT { (user)-[:INTERESTED_IN]->() }
    ELSE 0.0
END;

-- Propagate scores through item relationships
MATCH (source:Item)-[r:RELATED_TO]->(target:Item)
WITH target,
     SUM(source.ppr / COUNT { (source)-[:RELATED_TO]->() }) AS incoming_score
SET target.ppr_new = 0.15 * target.ppr + 0.85 * incoming_score;

-- Get top recommendations
MATCH (item:Item)
WHERE item.ppr_new > 0.01
  AND NOT EXISTS { (user:User {id: $user_id})-[:VIEWED|PURCHASED]->(item) }
RETURN item.id,
       item.title,
       item.ppr_new AS relevance_score
ORDER BY relevance_score DESC
LIMIT 20;
```

## Diversity and Serendipity

Balance relevance with diversity to avoid filter bubbles.

### Category Diversification

```gql
-- Ensure recommendations span multiple categories
MATCH (user:User {id: $user_id})
CALL {
    MATCH (user)-[:RATED]->(item:Product)
    WHERE item.rating >= 4
    MATCH (item)-[:IN_CATEGORY]->(cat:Category)<-[:IN_CATEGORY]-(rec:Product)
    WHERE NOT EXISTS { (user)-[:RATED]->(rec) }
    RETURN rec, cat.name AS category, COUNT(*) AS score
    ORDER BY score DESC
    LIMIT 100
}
WITH category, COLLECT(rec)[..2] AS items_per_category
UNWIND items_per_category AS item
RETURN item.id, item.name, category
LIMIT 20;
```

### Serendipitous Recommendations

```gql
-- Include some unexpected but potentially interesting items
MATCH (user:User {id: $user_id})-[:PURCHASED]->(item:Product)
WITH user, COLLECT(DISTINCT item.category) AS user_categories
MATCH (unexpected:Product)
WHERE NOT unexpected.category IN user_categories
  AND NOT EXISTS { (user)-[:PURCHASED|VIEWED]->(unexpected) }
  AND unexpected.rating >= 4.0
WITH unexpected,
     RAND() AS randomness,
     unexpected.rating AS quality
RETURN unexpected.id,
       unexpected.name,
       unexpected.category,
       (quality * 0.7 + randomness * 0.3) AS discovery_score
ORDER BY discovery_score DESC
LIMIT 5;
```

## Performance Optimization

### Materialized Similarity

```gql
-- Pre-compute item similarities
MATCH (item1:Product)<-[:PURCHASED]-(user:User)-[:PURCHASED]->(item2:Product)
WHERE ID(item1) < ID(item2)
WITH item1,
     item2,
     COUNT(DISTINCT user) AS co_purchases
WHERE co_purchases >= 5
MERGE (item1)-[sim:SIMILAR_TO]-(item2)
SET sim.score = co_purchases,
    sim.updated = CURRENT_TIMESTAMP;

-- Use pre-computed similarities
MATCH (user:User {id: $user_id})-[:PURCHASED]->(item:Product)-[sim:SIMILAR_TO]-(rec:Product)
WHERE NOT EXISTS { (user)-[:PURCHASED]->(rec) }
RETURN rec.id, rec.name, MAX(sim.score) AS similarity
ORDER BY similarity DESC
LIMIT 20;
```

### Caching User Profiles

```gql
-- Cache user preference profiles
MATCH (user:User {id: $user_id})-[r:RATED]->(item:Product)-[:HAS_TAG]->(tag:Tag)
WHERE r.rating >= 4
WITH user, tag, COUNT(*) AS tag_frequency
MERGE (user)-[pref:PREFERS]->(tag)
SET pref.score = tag_frequency,
    pref.updated = CURRENT_TIMESTAMP;

-- Use cached profiles for fast recommendations
MATCH (user:User {id: $user_id})-[pref:PREFERS]->(tag:Tag)<-[:HAS_TAG]-(rec:Product)
WHERE NOT EXISTS { (user)-[:RATED]->(rec) }
RETURN rec.id,
       rec.name,
       SUM(pref.score) AS match_score
ORDER BY match_score DESC
LIMIT 20;
```

## Best Practices

### Model Design

**Explicit vs Implicit Feedback**: Track both explicit ratings and implicit signals (views, clicks, time spent).

**Temporal Decay**: Weight recent interactions more heavily than old ones.

**Negative Signals**: Consider dislikes, skips, and returns as negative feedback.

**Cold Start**: Have fallback strategies for new users (popular items) and new items (content-based).

### Quality Metrics

**Precision**: Measure how many recommendations were actually relevant.

**Coverage**: Ensure recommendations span the full catalog, not just popular items.

**Diversity**: Track category and attribute diversity in recommendation sets.

**Serendipity**: Measure user engagement with unexpected recommendations.

## Integration Examples

### Python Client

```python
from geode_client import Client

async def get_recommendations(client, user_id, limit=20):
    # Collaborative filtering recommendations
    result, _ = await client.query("""
        MATCH (user:User {id: $user_id})-[:RATED]->(item:Product)<-[:RATED]-(similar:User)
        WHERE user <> similar
        WITH similar, COUNT(DISTINCT item) AS common_items
        WHERE common_items >= 3
        MATCH (similar)-[r:RATED]->(rec:Product)
        WHERE NOT EXISTS { (user)-[:RATED]->(rec) }
          AND r.rating >= 4
        RETURN rec.id AS product_id,
               rec.name AS product_name,
               COUNT(DISTINCT similar) AS score,
               AVG(r.rating) AS avg_rating
        ORDER BY score DESC, avg_rating DESC
        LIMIT $limit
    """, {'user_id': user_id, 'limit': limit})

    return [
        {
            'product_id': row[0],
            'name': row[1],
            'score': row[2],
            'rating': row[3]
        }
        for row in result.rows
    ]
```

### Rust Client

```rust
use geode_client::Client;

async fn recommend_items(client: &Client, user_id: &str, limit: i32) -> Result<Vec<Recommendation>> {
    let results = client.execute(
        "MATCH (user:User {id: $user_id})-[:LIKED]->(item:Item) \
         MATCH (item)<-[:LIKED]-(other:User)-[:LIKED]->(rec:Item) \
         WHERE NOT EXISTS { (user)-[:LIKED]->(rec) } \
         RETURN rec.id, rec.title, COUNT(*) AS score \
         ORDER BY score DESC LIMIT $limit",
        &[("user_id", user_id.into()), ("limit", limit.into())]
    ).await?;

    Ok(results.into_iter()
        .map(|row| Recommendation {
            item_id: row.get_string(0).unwrap(),
            title: row.get_string(1).unwrap(),
            score: row.get_int(2).unwrap(),
        })
        .collect())
}
```

## Related Topics

- **Collaborative Filtering**: See collaborative-filtering tag for detailed filtering techniques
- **Vector Search**: Check vector-search for embedding-based recommendations
- **PageRank**: Use pagerank for personalized recommendation scoring
- **Analytics**: Explore analytics tag for recommendation quality metrics