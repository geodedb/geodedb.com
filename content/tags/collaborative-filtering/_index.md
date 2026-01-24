---
title: "Collaborative Filtering"
description: "Implement user-based and item-based collaborative filtering recommendation systems using Geode's graph capabilities. Learn matrix factorization, similarity computation, and scalable recommendation patterns."
keywords:
  - collaborative filtering
  - recommendations
  - similarity
  - user-based filtering
  - item-based filtering
  - matrix factorization
  - personalization
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/collaborative-filtering/"
    noindex: false
---

Collaborative filtering is a recommendation technique that leverages user behavior patterns and item similarities to predict preferences. Geode's native graph structure makes it ideal for implementing both user-based and item-based collaborative filtering at scale.

## What Is Collaborative Filtering?

Collaborative filtering (CF) recommends items by finding patterns in user-item interactions. Unlike content-based filtering, CF doesn't require item metadata—it relies purely on behavioral signals like ratings, purchases, views, or clicks.

### Types of Collaborative Filtering

**User-Based CF**: Recommends items liked by similar users ("users like you also liked...").

**Item-Based CF**: Recommends items similar to those the user already likes ("people who liked this also liked...").

**Hybrid Approaches**: Combine both methods for better coverage and accuracy.

## Graph Model for Collaborative Filtering

### Schema Design

Model users, items, and interactions as a bipartite graph:

```gql
// Create users
INSERT (u:User {
  user_id: 'user_123',
  name: 'Alice',
  joined_at: datetime('2024-01-15T10:00:00')
});

// Create items (products, movies, articles, etc.)
INSERT (i:Item {
  item_id: 'item_456',
  title: 'Wireless Headphones',
  category: 'Electronics',
  price: 199.99
});

// Create interaction relationships
MATCH (u:User {user_id: 'user_123'})
MATCH (i:Item {item_id: 'item_456'})
INSERT (u)-[r:RATED {
  rating: 4.5,
  timestamp: datetime('2025-01-20T14:30:00'),
  implicit: false  // Explicit rating vs. implicit signal
}]->(i);

// Implicit feedback (views, clicks, purchases)
INSERT (u)-[p:PURCHASED {
  quantity: 1,
  timestamp: datetime('2025-01-22T09:15:00'),
  price_paid: 179.99
}]->(i);
```

### Interaction Types

Store different signal strengths for various interaction types:

```gql
// Weighted interactions for better recommendations
INSERT (u:User {user_id: 'user_789'})
INSERT (i:Item {item_id: 'item_101'})
INSERT (u)-[v:VIEWED {
  count: 3,
  total_time_seconds: 145,
  last_viewed: datetime(),
  weight: 0.5  // Lower weight for views
}]->(i);

INSERT (u)-[c:CLICKED {
  timestamp: datetime(),
  weight: 0.7
}]->(i);

INSERT (u)-[p:PURCHASED {
  timestamp: datetime(),
  weight: 1.0  // Highest weight for purchases
}]->(i);
```

## User-Based Collaborative Filtering

### Finding Similar Users

Calculate user similarity based on shared interactions:

```gql
// Find users similar to target user
MATCH (target:User {user_id: $target_user_id})-[r1:RATED]->(i:Item)
MATCH (other:User)-[r2:RATED]->(i)
WHERE target <> other
WITH target, other,
     COUNT(i) AS common_items,
     SUM(r1.rating * r2.rating) AS dot_product,
     SQRT(SUM(r1.rating * r1.rating)) AS target_norm,
     SQRT(SUM(r2.rating * r2.rating)) AS other_norm
WHERE common_items >= 3  // Minimum overlap threshold
WITH target, other, common_items,
     dot_product / (target_norm * other_norm) AS cosine_similarity
WHERE cosine_similarity > 0.5
ORDER BY cosine_similarity DESC
LIMIT 20
RETURN other.user_id, other.name, cosine_similarity, common_items;
```

### User-Based Recommendations

Generate recommendations from similar users:

```gql
// Recommend items liked by similar users
MATCH (target:User {user_id: $target_user_id})-[r1:RATED]->(i1:Item)
MATCH (similar:User)-[r2:RATED]->(i1)
WHERE target <> similar
WITH target, similar,
     COUNT(i1) AS common_items,
     SUM(r1.rating * r2.rating) /
     (SQRT(SUM(r1.rating * r1.rating)) * SQRT(SUM(r2.rating * r2.rating)))
     AS similarity
WHERE common_items >= 3 AND similarity > 0.5

// Find items rated highly by similar users
MATCH (similar)-[r3:RATED]->(candidate:Item)
WHERE NOT (target)-[:RATED|PURCHASED]->(candidate)  // Exclude already interacted items
WITH candidate,
     SUM(r3.rating * similarity) / SUM(similarity) AS predicted_rating,
     COUNT(similar) AS num_similar_users
WHERE num_similar_users >= 2  // Require multiple similar users
ORDER BY predicted_rating DESC
LIMIT 10
RETURN candidate.item_id, candidate.title, predicted_rating, num_similar_users;
```

## Item-Based Collaborative Filtering

### Computing Item Similarity

Calculate item similarity based on user co-interactions:

```gql
// Compute similarity between items
MATCH (i1:Item {item_id: $item_id})<-[r1:RATED]-(u:User)
MATCH (u)-[r2:RATED]->(i2:Item)
WHERE i1 <> i2
WITH i1, i2,
     COUNT(u) AS common_users,
     SUM(r1.rating * r2.rating) AS dot_product,
     SQRT(SUM(r1.rating * r1.rating)) AS i1_norm,
     SQRT(SUM(r2.rating * r2.rating)) AS i2_norm
WHERE common_users >= 5  // Minimum co-occurrence threshold
WITH i1, i2, common_users,
     dot_product / (i1_norm * i2_norm) AS cosine_similarity
WHERE cosine_similarity > 0.3
ORDER BY cosine_similarity DESC
LIMIT 50
RETURN i2.item_id, i2.title, cosine_similarity, common_users;
```

### Precomputing Similarity Relationships

Store item similarities as relationships for fast lookups:

```gql
// Create SIMILAR_TO relationships between items
MATCH (i1:Item)<-[r1:RATED]-(u:User)-[r2:RATED]->(i2:Item)
WHERE i1.item_id < i2.item_id  // Avoid duplicates
WITH i1, i2,
     COUNT(u) AS common_users,
     SUM(r1.rating * r2.rating) /
     (SQRT(SUM(r1.rating * r1.rating)) * SQRT(SUM(r2.rating * r2.rating)))
     AS similarity
WHERE common_users >= 5 AND similarity > 0.3
MERGE (i1)-[s:SIMILAR_TO]-(i2)
SET s.similarity = similarity,
    s.common_users = common_users,
    s.computed_at = datetime();

// Create index for fast similarity lookups
CREATE INDEX item_similarity_idx ON :SIMILAR_TO(similarity);
```

### Item-Based Recommendations

Generate recommendations using precomputed similarities:

```gql
// Recommend similar items to user's liked items
MATCH (u:User {user_id: $user_id})-[r:RATED]->(liked:Item)
WHERE r.rating >= 4.0  // Only consider highly-rated items

// Find similar items
MATCH (liked)-[s:SIMILAR_TO]-(candidate:Item)
WHERE NOT (u)-[:RATED|PURCHASED]->(candidate)

// Weight by user's rating and item similarity
WITH candidate,
     SUM(r.rating * s.similarity) / SUM(s.similarity) AS score,
     COUNT(liked) AS based_on_items,
     AVG(s.similarity) AS avg_similarity
ORDER BY score DESC, avg_similarity DESC
LIMIT 15
RETURN candidate.item_id, candidate.title, score, based_on_items, avg_similarity;
```

## Advanced Techniques

### Matrix Factorization

Store latent factors for users and items:

```gql
// Store user latent factors (from external SVD/ALS computation)
MATCH (u:User {user_id: $user_id})
SET u.latent_factors = $factors;  // Array of 20-100 dimensions

// Store item latent factors
MATCH (i:Item {item_id: $item_id})
SET i.latent_factors = $factors;

// Predict rating using dot product of latent factors
MATCH (u:User {user_id: $user_id})
MATCH (i:Item {item_id: $item_id})
WHERE NOT (u)-[:RATED]->(i)
WITH u, i,
     vector.dot_product(u.latent_factors, i.latent_factors) AS predicted_rating
RETURN i.item_id, i.title, predicted_rating
ORDER BY predicted_rating DESC
LIMIT 10;
```

### Time Decay

Weight recent interactions more heavily:

```gql
// Time-weighted recommendations
MATCH (target:User {user_id: $target_user_id})-[r1:RATED]->(i1:Item)
MATCH (similar:User)-[r2:RATED]->(i1)
WHERE target <> similar

// Compute recency weight (exponential decay)
WITH target, similar, r1, r2, i1,
     EXP(-duration.between(r1.timestamp, datetime()).days / 30.0) AS recency_weight
WITH target, similar,
     SUM(r1.rating * r2.rating * recency_weight) /
     SUM(recency_weight) AS weighted_similarity
WHERE weighted_similarity > 0.5

MATCH (similar)-[r3:RATED]->(candidate:Item)
WHERE NOT (target)-[:RATED|PURCHASED]->(candidate)
WITH candidate,
     EXP(-duration.between(r3.timestamp, datetime()).days / 30.0) AS item_recency,
     SUM(r3.rating * weighted_similarity * item_recency) /
     SUM(weighted_similarity * item_recency) AS predicted_rating
ORDER BY predicted_rating DESC
LIMIT 10
RETURN candidate.item_id, candidate.title, predicted_rating;
```

### Diversity and Serendipity

Avoid filter bubbles by diversifying recommendations:

```gql
// Diversified recommendations across categories
MATCH (u:User {user_id: $user_id})-[r:RATED]->(liked:Item)
MATCH (liked)-[s:SIMILAR_TO]-(candidate:Item)
WHERE NOT (u)-[:RATED|PURCHASED]->(candidate)
WITH candidate,
     SUM(r.rating * s.similarity) / SUM(s.similarity) AS score,
     candidate.category AS category
ORDER BY score DESC

// Select top items from diverse categories
WITH category, COLLECT({item: candidate, score: score})[0..2] AS top_per_category
UNWIND top_per_category AS item_data
WITH item_data.item AS item, item_data.score AS score
ORDER BY score DESC
LIMIT 10
RETURN item.item_id, item.title, item.category, score;
```

## Performance Optimization

### Materialized Views

Precompute recommendations for common queries:

```gql
// Create daily recommendation cache
MATCH (u:User)
CALL {
  WITH u
  MATCH (u)-[r:RATED]->(liked:Item)-[s:SIMILAR_TO]-(candidate:Item)
  WHERE NOT (u)-[:RATED|PURCHASED]->(candidate)
  WITH candidate, SUM(r.rating * s.similarity) / SUM(s.similarity) AS score
  ORDER BY score DESC
  LIMIT 20
  RETURN COLLECT({item_id: candidate.item_id, score: score}) AS recommendations
}
SET u.cached_recommendations = recommendations,
    u.recommendations_updated_at = datetime();
```

### Incremental Updates

Update similarities incrementally when new interactions arrive:

```gql
// Update item similarities after new rating
MATCH (u:User {user_id: $user_id})-[new_rating:RATED]->(i1:Item)
WHERE new_rating.timestamp > datetime().minusHours(1)  // Recent rating

// Find items co-rated by this user
MATCH (u)-[other_rating:RATED]->(i2:Item)
WHERE i1 <> i2

// Update or create similarity relationship
MERGE (i1)-[s:SIMILAR_TO]-(i2)
ON CREATE SET s.needs_recompute = true
ON MATCH SET s.needs_recompute = true;

// Batch recompute flagged similarities
MATCH (i1)-[s:SIMILAR_TO]-(i2)
WHERE s.needs_recompute = true
WITH i1, i2
MATCH (i1)<-[r1:RATED]-(u:User)-[r2:RATED]->(i2)
WITH i1, i2, s,
     SUM(r1.rating * r2.rating) /
     (SQRT(SUM(r1.rating * r1.rating)) * SQRT(SUM(r2.rating * r2.rating)))
     AS new_similarity
SET s.similarity = new_similarity,
    s.needs_recompute = false,
    s.updated_at = datetime();
```

## Handling Sparse Data

### Cold Start Problem

Address new users/items with hybrid approaches:

```gql
// Recommend popular items to new users
MATCH (u:User {user_id: $new_user_id})
WHERE NOT (u)-[:RATED]->()  // No ratings yet
MATCH (i:Item)<-[r:RATED]-()
WITH i, COUNT(r) AS rating_count, AVG(r.rating) AS avg_rating
WHERE rating_count >= 20  // Minimum ratings threshold
ORDER BY rating_count * avg_rating DESC
LIMIT 10
RETURN i.item_id, i.title, rating_count, avg_rating;

// For new items, use content-based filtering initially
MATCH (new_item:Item {item_id: $new_item_id})
WHERE NOT ()-[:RATED]->(new_item)
MATCH (similar:Item)
WHERE similar.category = new_item.category
  AND similar <> new_item
MATCH ()-[r:RATED]->(similar)
WITH similar, COUNT(r) AS rating_count, AVG(r.rating) AS avg_rating
ORDER BY rating_count * avg_rating DESC
LIMIT 5
RETURN similar.item_id, similar.title;
```

### Confidence Weighting

Account for rating count when computing similarities:

```gql
// Weighted similarity with confidence
MATCH (i1:Item)<-[r1:RATED]-(u:User)-[r2:RATED]->(i2:Item)
WHERE i1.item_id < i2.item_id
WITH i1, i2,
     COUNT(u) AS common_users,
     SUM(r1.rating * r2.rating) /
     (SQRT(SUM(r1.rating * r1.rating)) * SQRT(SUM(r2.rating * r2.rating)))
     AS raw_similarity
WITH i1, i2, common_users, raw_similarity,
     common_users / (common_users + 25.0) AS confidence  // Shrinkage factor
WITH i1, i2,
     raw_similarity * confidence AS adjusted_similarity,
     common_users
WHERE adjusted_similarity > 0.3
RETURN i1.item_id, i2.item_id, adjusted_similarity, common_users;
```

## Evaluation Metrics

### A/B Testing Framework

Track recommendation performance:

```gql
// Record recommendation impressions
INSERT (e:RecommendationEvent {
  event_id: uuid(),
  user_id: $user_id,
  session_id: $session_id,
  algorithm: 'item_based_cf',  // Track which algorithm
  recommended_items: $item_ids,
  timestamp: datetime()
});

// Track clicks and conversions
MATCH (e:RecommendationEvent {event_id: $event_id})
MATCH (u:User {user_id: e.user_id})
MATCH (i:Item {item_id: $clicked_item_id})
INSERT (u)-[c:CLICKED_RECOMMENDATION {
  event_id: e.event_id,
  position: $position,  // Position in recommendation list
  timestamp: datetime()
}]->(i);

// Compute click-through rate by algorithm
MATCH (e:RecommendationEvent)
WHERE e.timestamp > datetime().minusDays(7)
WITH e.algorithm AS algorithm,
     COUNT(e) AS impressions,
     SIZE([id IN e.recommended_items WHERE (e)-[:CLICKED_RECOMMENDATION]->(:Item {item_id: id})]) AS clicks
RETURN algorithm,
       impressions,
       clicks,
       clicks * 100.0 / impressions AS ctr;
```

## Best Practices

1. **Start Simple**: Begin with item-based CF, which is often more stable than user-based
2. **Precompute Similarities**: Store item-item similarities as relationships for fast lookups
3. **Set Thresholds**: Require minimum overlap (e.g., 5 common users) for reliable similarities
4. **Handle Popularity Bias**: Downweight very popular items to surface long-tail recommendations
5. **Combine Signals**: Weight explicit ratings higher than implicit signals (views, clicks)
6. **Add Time Decay**: Recent interactions are often more relevant than old ones
7. **Diversify Results**: Mix similarity-based and popularity-based recommendations
8. **Monitor Metrics**: Track CTR, conversion rate, and user engagement continuously
9. **Update Incrementally**: Recompute similarities periodically or on significant changes
10. **Use Hybrid Approaches**: Combine collaborative filtering with content-based and graph-based methods

## Integration with Other Geode Features

Collaborative filtering integrates seamlessly with:

- **Vector Embeddings**: Combine CF with learned item embeddings for hybrid recommendations
- **Graph Algorithms**: Use PageRank or community detection to identify influential items
- **Real-Time Analytics**: Stream new interactions and update recommendations dynamically
- **Row-Level Security**: Filter recommendations based on user permissions and access controls

Browse the tagged content below to discover documentation, tutorials, and guides for implementing collaborative filtering in your Geode applications.
