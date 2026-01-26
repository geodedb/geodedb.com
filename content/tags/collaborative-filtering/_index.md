---
title: "Collaborative Filtering"
description: "Master collaborative filtering in Geode: user-based CF, item-based CF, matrix factorization, hybrid methods, and neural collaborative filtering. Production-scale recommendation systems with cold-start handling and real-time personalization."
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
  - recommendation systems
  - similarity metrics
  - rating prediction
  - implicit feedback
  - explicit feedback
  - cold start problem
  - nearest neighbors
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/collaborative-filtering/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Collaborative Filtering in Geode

Collaborative filtering (CF) is a recommendation technique that leverages user behavior patterns and item similarities to predict preferences. Unlike content-based approaches that require item metadata, CF discovers patterns purely from user-item interactions. Geode's native graph structure makes it ideal for implementing both user-based and item-based collaborative filtering at scale, handling billions of ratings with sub-second query latency.

This guide covers classical CF algorithms, advanced techniques like matrix factorization and neural collaborative filtering, production optimizations, and strategies for handling sparse data and cold-start problems.

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

## Mathematical Foundations

### Similarity Metrics

**Cosine Similarity**: Measures angle between rating vectors (range: -1 to 1)
```
sim(u, v) = (r_u · r_v) / (||r_u|| × ||r_v||)
          = Σ(r_ui × r_vi) / sqrt(Σr_ui²) × sqrt(Σr_vi²)
```

**Pearson Correlation**: Accounts for rating scale differences (range: -1 to 1)
```
sim(u, v) = Σ((r_ui - r̄_u) × (r_vi - r̄_v)) / (σ_u × σ_v)
```

**Jaccard Similarity**: For binary implicit feedback (range: 0 to 1)
```
sim(A, B) = |A ∩ B| / |A ∪ B|
```

**Adjusted Cosine**: Normalizes for user rating bias
```
sim(i, j) = Σ_u((r_ui - r̄_u) × (r_uj - r̄_u)) / sqrt(Σ(r_ui - r̄_u)²) × sqrt(Σ(r_uj - r̄_u)²)
```

### Rating Prediction

**User-Based Prediction**:
```
pred(u, i) = r̄_u + (Σ_v∈N(u) sim(u,v) × (r_vi - r̄_v)) / Σ_v∈N(u) |sim(u,v)|
```

**Item-Based Prediction**:
```
pred(u, i) = (Σ_j∈R(u) sim(i,j) × r_uj) / Σ_j∈R(u) |sim(i,j)|
```

Where:
- N(u) = k-nearest neighbors of user u
- R(u) = items rated by user u
- r̄_u = average rating by user u

## Advanced Collaborative Filtering Techniques

### Singular Value Decomposition (SVD)

Decompose rating matrix into latent factors:

```gql
-- Store SVD factors computed externally (Python sklearn)
MATCH (u:User {user_id: $user_id})
SET u.latent_factors = $user_factors;  // Array of 20-100 floats

MATCH (i:Item {item_id: $item_id})
SET i.latent_factors = $item_factors;

-- Predict rating as dot product
MATCH (u:User {user_id: $user_id})
MATCH (i:Item {item_id: $item_id})
WHERE NOT EXISTS((u)-[:RATED]->(i))
WITH u, i,
     REDUCE(sum = 0, idx IN range(0, size(u.latent_factors) - 1) |
         sum + u.latent_factors[idx] * i.latent_factors[idx]
     ) AS predicted_rating
WHERE predicted_rating > 3.5  // Filter low predictions
RETURN i.item_id,
       i.title,
       predicted_rating
ORDER BY predicted_rating DESC
LIMIT 20;
```

**Complexity**: O(k × (m + n)) where k = latent dimensions, m = users, n = items
**Accuracy**: Typically 5-10% improvement over k-NN methods

### Alternating Least Squares (ALS)

Optimize latent factors iteratively:

```python
# External computation with Spark MLlib or custom implementation
from geode_client import Client
import numpy as np

async def compute_als_factors(client, rank=50, iterations=10, lambda_reg=0.1):
    # Initialize random factors
    user_factors = np.random.rand(num_users, rank)
    item_factors = np.random.rand(num_items, rank)

    for iteration in range(iterations):
        # Fix item factors, solve for user factors
        for u in range(num_users):
            user_ratings, _ = await client.query("""
                MATCH (u:User {user_id: $uid})-[r:RATED]->(i:Item)
                RETURN i.item_idx AS item_idx, r.rating AS rating
            """, {"uid": u})

            # Solve: (X^T X + λI)^-1 X^T r
            X = item_factors[user_ratings['item_idx']]
            r = user_ratings['rating']
            user_factors[u] = np.linalg.solve(
                X.T @ X + lambda_reg * np.eye(rank),
                X.T @ r
            )

        # Fix user factors, solve for item factors (similar)
        # ... item update step ...

    # Store computed factors in Geode
    for u, factors in enumerate(user_factors):
        await client.execute("""
            MATCH (user:User {user_id: $uid})
            SET user.latent_factors = $factors
        """, {"uid": u, "factors": factors.tolist()})
```

**Advantages**: Handles implicit feedback, scales to billions of ratings, parallelizable
**Use case**: Large-scale production systems (Netflix, Spotify)

### Neural Collaborative Filtering (NCF)

Use deep learning to learn user-item interactions:

```gql
-- Store neural network embeddings
MATCH (u:User {user_id: $user_id})
SET u.user_embedding = $user_embedding;  // Dense NN embedding

MATCH (i:Item {item_id: $item_id})
SET i.item_embedding = $item_embedding;

-- Query with learned similarity function
MATCH (u:User {user_id: $user_id})
MATCH (candidate:Item)
WHERE NOT EXISTS((u)-[:RATED|PURCHASED]->(candidate))
WITH u, candidate,
     vector.similarity(u.user_embedding, candidate.item_embedding, 'cosine') AS neural_score
WHERE neural_score > 0.7
RETURN candidate.item_id,
       candidate.title,
       neural_score
ORDER BY neural_score DESC
LIMIT 15;
```

**Architecture**: User/Item embeddings → Concatenate → MLP → Sigmoid output
**Training**: Binary cross-entropy loss on positive (rated) vs negative (unrated) samples

## Handling Implicit Feedback

Most real-world data is implicit (clicks, views, plays) rather than explicit (ratings):

```gql
-- Weight implicit signals by confidence
MATCH (u:User {user_id: $user_id})-[interaction]->(i:Item)
WITH u, i,
     CASE type(interaction)
         WHEN 'VIEWED' THEN 0.5
         WHEN 'CLICKED' THEN 0.7
         WHEN 'ADDED_TO_CART' THEN 0.9
         WHEN 'PURCHASED' THEN 1.0
     END AS confidence_weight,
     COALESCE(interaction.count, 1) AS frequency
WITH u, i, confidence_weight * log(1 + frequency) AS implicit_rating

// Find similar users weighted by implicit ratings
MATCH (u)-[r1]->(common:Item)<-[r2]-(similar:User)
WITH similar,
     SUM(r1.implicit_rating * r2.implicit_rating) /
     (SQRT(SUM(r1.implicit_rating ^ 2)) * SQRT(SUM(r2.implicit_rating ^ 2)))
     AS similarity
WHERE similarity > 0.6
ORDER BY similarity DESC
LIMIT 50

// Get recommendations from similar users
MATCH (similar)-[r3]->(recommendation:Item)
WHERE NOT EXISTS((u)-[]->(recommendation))
WITH recommendation,
     SUM(r3.implicit_rating * similarity) / SUM(similarity) AS score
RETURN recommendation.item_id,
       recommendation.title,
       score
ORDER BY score DESC
LIMIT 20;
```

## Advanced Similarity Computation

### Significance Weighting

Downweight similarities based on few common items:

```gql
-- Jaccard with significance weighting
MATCH (i1:Item {item_id: $item_id})<-[r1:RATED]-(u:User)-[r2:RATED]->(i2:Item)
WHERE i1 <> i2
WITH i1, i2,
     COUNT(u) AS common_users,
     COLLECT({user: u, r1: r1.rating, r2: r2.rating}) AS rating_pairs
WITH i1, i2, common_users, rating_pairs,
     SUM([pair IN rating_pairs | pair.r1 * pair.r2]) /
     (SQRT(SUM([pair IN rating_pairs | pair.r1 ^ 2])) *
      SQRT(SUM([pair IN rating_pairs | pair.r2 ^ 2])))
     AS raw_similarity
WITH i1, i2, common_users, raw_similarity,
     common_users * 1.0 / (common_users + 25) AS significance
WITH i1, i2,
     raw_similarity * significance AS adjusted_similarity
WHERE adjusted_similarity > 0.3
RETURN i2.item_id,
       i2.title,
       adjusted_similarity,
       common_users
ORDER BY adjusted_similarity DESC;
```

**Effect**: Reduces false positives from items with few co-raters

### Context-Aware Similarity

Incorporate contextual factors:

```gql
-- Time-aware similarity (recent users weighted more)
MATCH (target:User {user_id: $target_user_id})-[r1:RATED]->(i:Item)
MATCH (other:User)-[r2:RATED]->(i)
WHERE target <> other
WITH target, other,
     SUM(r1.rating * r2.rating *
         EXP(-duration.between(r1.timestamp, datetime()).days / 90.0)
     ) AS time_weighted_similarity,
     COUNT(i) AS common_items
WHERE common_items >= 5
RETURN other.user_id,
       time_weighted_similarity,
       common_items
ORDER BY time_weighted_similarity DESC
LIMIT 100;

-- Session-aware recommendations
MATCH (u:User {user_id: $user_id})-[:IN_SESSION {session_id: $session_id}]->(recent:Item)
WITH u, COLLECT(recent) AS session_items
MATCH (candidate:Item)
WHERE NOT candidate IN session_items
  AND NOT EXISTS((u)-[:RATED|PURCHASED]->(candidate))
WITH candidate,
     AVG([item IN session_items |
         (SELECT similarity FROM (candidate)-[s:SIMILAR_TO]-(item) RETURN s.similarity)
     ]) AS session_relevance
WHERE session_relevance > 0.6
RETURN candidate.item_id,
       candidate.title,
       session_relevance
ORDER BY session_relevance DESC
LIMIT 10;
```

## Production Performance Optimization

### Materialized Similarity Graphs

Precompute and store similarities as relationships:

```gql
-- Compute item-item similarities offline (daily batch job)
MATCH (i1:Item)<-[r1:RATED]-(u:User)-[r2:RATED]->(i2:Item)
WHERE i1.item_id < i2.item_id  // Avoid duplicates
WITH i1, i2,
     COUNT(u) AS common_users,
     SUM(r1.rating * r2.rating) /
     (SQRT(SUM(r1.rating ^ 2)) * SQRT(SUM(r2.rating ^ 2)))
     AS similarity
WHERE common_users >= 10 AND similarity > 0.3
MERGE (i1)-[s:SIMILAR_TO]-(i2)
SET s.similarity = similarity,
    s.common_users = common_users,
    s.computed_at = datetime();

-- Create index for fast lookups
CREATE INDEX similar_items_idx ON :SIMILAR_TO(similarity);

-- Lightning-fast online recommendations
MATCH (u:User {user_id: $user_id})-[r:RATED]->(liked:Item)
WHERE r.rating >= 4.0
MATCH (liked)-[s:SIMILAR_TO]-(candidate:Item)
WHERE NOT EXISTS((u)-[:RATED|PURCHASED]->(candidate))
  AND s.similarity > 0.5
WITH candidate,
     SUM(r.rating * s.similarity) / SUM(s.similarity) AS predicted_rating,
     COUNT(DISTINCT liked) AS based_on_items,
     MAX(s.similarity) AS max_similarity
RETURN candidate.item_id,
       candidate.title,
       predicted_rating,
       based_on_items,
       max_similarity
ORDER BY predicted_rating DESC, based_on_items DESC
LIMIT 20;
```

**Latency**: Sub-millisecond recommendations for precomputed graphs

### Approximate Nearest Neighbors

Use locality-sensitive hashing for large-scale user similarity:

```gql
-- Generate LSH signatures for users
MATCH (u:User)
WITH u, u.user_id AS uid
MATCH (u)-[r:RATED]->(i:Item)
WITH u, COLLECT(i.item_id ORDER BY i.item_id) AS rated_items
WITH u,
     [band IN range(0, 9) |
         hash([item IN rated_items WHERE item % 10 = band])
     ] AS lsh_signature
SET u.lsh_signature = lsh_signature;

-- Find similar users using LSH
MATCH (target:User {user_id: $user_id})
MATCH (candidate:User)
WHERE candidate <> target
  AND SIZE([i IN range(0, 9) WHERE
           target.lsh_signature[i] = candidate.lsh_signature[i]]) >= 7
WITH candidate,
     SIZE([i IN range(0, 9) WHERE
           target.lsh_signature[i] = candidate.lsh_signature[i]]) AS band_matches
RETURN candidate.user_id,
       band_matches
ORDER BY band_matches DESC
LIMIT 100;
```

**Speedup**: 100-1000× faster than exact k-NN for millions of users

### Recommendation Caching

Cache recommendations for active users:

```gql
-- Nightly batch: Generate recommendations for all active users
MATCH (u:User)
WHERE u.last_active > datetime().minusDays(30)
CALL {
    WITH u
    // Run full recommendation pipeline
    MATCH (u)-[r:RATED]->(liked:Item)-[s:SIMILAR_TO]-(candidate:Item)
    WHERE NOT EXISTS((u)-[:RATED]->(candidate))
      AND r.rating >= 4.0
    WITH candidate,
         SUM(r.rating * s.similarity) / SUM(s.similarity) AS score
    ORDER BY score DESC
    LIMIT 100
    RETURN COLLECT({item_id: candidate.item_id, score: score}) AS recommendations
}
SET u.cached_recommendations = recommendations,
    u.recommendations_cached_at = datetime()
RETURN COUNT(u) AS users_cached;

-- Online: Serve from cache with freshness filtering
MATCH (u:User {user_id: $user_id})
WITH u,
     CASE WHEN u.recommendations_cached_at > datetime().minusHours(24)
          THEN u.cached_recommendations
          ELSE null
     END AS cached_recs
WHERE cached_recs IS NOT NULL
UNWIND cached_recs AS rec
MATCH (i:Item {item_id: rec.item_id})
WHERE i.in_stock = true  // Apply real-time filters
RETURN i.item_id,
       i.title,
       rec.score AS recommendation_score
ORDER BY rec.score DESC
LIMIT 10;
```

**Cache hit rate**: 80-90% for active users
**Latency**: <1ms for cached results

## Real-World Case Studies

### E-Commerce (Amazon-Style)

```gql
-- "Customers who bought this also bought"
MATCH (target:Product {product_id: $product_id})<-[:PURCHASED]-(buyer:User)
       -[:PURCHASED]->(recommendation:Product)
WHERE recommendation <> target
WITH recommendation,
     COUNT(DISTINCT buyer) AS co_purchase_count,
     COUNT(DISTINCT buyer) * 1.0 / COUNT { (target)<-[:PURCHASED]-() } AS lift
WHERE co_purchase_count >= 5 AND lift > 0.1
RETURN recommendation.product_id,
       recommendation.name,
       recommendation.price,
       co_purchase_count,
       lift
ORDER BY lift DESC, co_purchase_count DESC
LIMIT 10;

-- "Based on your browsing history"
MATCH (u:User {user_id: $user_id})-[v:VIEWED]->(viewed:Product)
WHERE v.timestamp > datetime().minusDays(7)
WITH u, viewed
ORDER BY v.timestamp DESC
LIMIT 20
MATCH (viewed)-[s:SIMILAR_TO]-(candidate:Product)
WHERE NOT EXISTS((u)-[:PURCHASED|IN_CART]->(candidate))
WITH candidate,
     AVG(s.similarity) AS avg_similarity,
     COUNT(DISTINCT viewed) AS matching_views
WHERE avg_similarity > 0.6
RETURN candidate.product_id,
       candidate.name,
       candidate.price,
       avg_similarity,
       matching_views
ORDER BY matching_views DESC, avg_similarity DESC
LIMIT 15;
```

### Streaming Media (Netflix-Style)

```gql
-- Collaborative filtering for video recommendations
MATCH (u:User {user_id: $user_id})-[w:WATCHED]->(video:Video)
WHERE w.completion_rate > 0.7  // Only count videos mostly watched
WITH u, AVG(w.rating) AS user_avg_rating,
     COLLECT({video: video, rating: w.rating}) AS user_history

// Find similar users
MATCH (other:User)-[w2:WATCHED]->(common:Video)
WHERE common IN [h.video FOR h IN user_history]
  AND other <> u
WITH u, user_avg_rating, other,
     SUM([h IN user_history WHERE h.video = common | h.rating * w2.rating]) /
     (SQRT(SUM([h IN user_history WHERE h.video = common | h.rating ^ 2])) *
      SQRT(SUM([w2 IN (other)-[:WATCHED]->() | w2.rating ^ 2])))
     AS similarity
WHERE similarity > 0.6
ORDER BY similarity DESC
LIMIT 50

// Get unwatched videos from similar users
MATCH (other)-[w3:WATCHED]->(recommendation:Video)
WHERE NOT EXISTS((u)-[:WATCHED]->(recommendation))
  AND w3.completion_rate > 0.8
WITH recommendation,
     SUM((w3.rating - user_avg_rating) * similarity) / SUM(ABS(similarity)) AS predicted_rating,
     COUNT(DISTINCT other) AS recommended_by
WHERE predicted_rating > 3.5
RETURN recommendation.title,
       recommendation.genre,
       recommendation.duration_minutes,
       predicted_rating,
       recommended_by
ORDER BY predicted_rating DESC, recommended_by DESC
LIMIT 20;
```

### Music Streaming (Spotify-Style)

```gql
-- Discover Weekly-style recommendations
MATCH (u:User {user_id: $user_id})-[l:LISTENED {timestamp > datetime().minusDays(30)}]->(track:Track)
WITH u, track, SUM(l.play_count) AS total_plays
ORDER BY total_plays DESC
LIMIT 50
WITH u, COLLECT(track) AS favorite_tracks

// Find users with similar taste
MATCH (other:User)-[:LISTENED]->(common:Track)
WHERE common IN favorite_tracks AND other <> u
WITH u, favorite_tracks, other,
     COUNT(DISTINCT common) AS common_tracks
WHERE common_tracks >= 10
ORDER BY common_tracks DESC
LIMIT 200

// Get their recent favorites not in your library
MATCH (other)-[l2:LISTENED]->(discovery:Track)
WHERE NOT discovery IN favorite_tracks
  AND NOT EXISTS((u)-[:LISTENED]->(discovery))
  AND l2.timestamp > datetime().minusDays(30)
WITH discovery,
     COUNT(DISTINCT other) AS listeners,
     SUM(l2.play_count) AS total_plays
WHERE listeners >= 5
RETURN discovery.title,
       discovery.artist,
       discovery.genre,
       listeners,
       total_plays
ORDER BY listeners DESC, total_plays DESC
LIMIT 30;
```

## Evaluation Metrics

### Offline Evaluation

```gql
-- Precision@K: Fraction of recommended items that are relevant
MATCH (u:User)
CALL {
    WITH u
    // Get ground truth (held-out test set)
    MATCH (u)-[r:RATED_TEST]->(relevant:Item)
    WHERE r.rating >= 4.0
    WITH u, COLLECT(relevant.item_id) AS relevant_items

    // Get recommendations
    MATCH (u)-[r2:RATED_TRAIN]->(liked:Item)-[s:SIMILAR_TO]-(rec:Item)
    WHERE r2.rating >= 4.0
    WITH relevant_items, rec
    ORDER BY s.similarity DESC
    LIMIT 10
    WITH relevant_items, COLLECT(rec.item_id) AS recommended_items

    // Compute precision
    WITH SIZE([item IN recommended_items WHERE item IN relevant_items]) AS hits,
         SIZE(recommended_items) AS k
    RETURN hits * 1.0 / k AS precision_at_10
}
RETURN AVG(precision_at_10) AS mean_precision_at_10;

-- Recall@K: Fraction of relevant items that are recommended
// Similar query, compute: hits / size(relevant_items)

-- NDCG (Normalized Discounted Cumulative Gain)
// Accounts for position in ranking
MATCH (u:User)-[r_test:RATED_TEST]->(relevant:Item)
WITH u, COLLECT({item: relevant, rating: r_test.rating}) AS test_items

CALL {
    WITH u
    // Get ranked recommendations
    MATCH (u)-[r:RATED_TRAIN]->(liked:Item)-[s:SIMILAR_TO]-(rec:Item)
    WHERE r.rating >= 4.0
    WITH rec, SUM(r.rating * s.similarity) / SUM(s.similarity) AS score
    ORDER BY score DESC
    LIMIT 20
    RETURN COLLECT({item: rec, rank: row_number()}) AS recommendations
}

WITH test_items, recommendations,
     REDUCE(dcg = 0.0, i IN range(0, size(recommendations) - 1) |
         dcg + CASE WHEN recommendations[i].item IN [t.item FOR t IN test_items]
                   THEN test_items[recommendations[i].item].rating / log(2 + i)
                   ELSE 0.0 END
     ) AS dcg,
     REDUCE(idcg = 0.0, i IN range(0, size(test_items) - 1) |
         idcg + test_items[i].rating / log(2 + i)
     ) AS idcg

RETURN dcg / idcg AS ndcg;
```

### Online A/B Testing

```gql
-- Track recommendation impressions and clicks
INSERT (e:RecommendationEvent {
    event_id: uuid(),
    user_id: $user_id,
    session_id: $session_id,
    algorithm: 'item_based_cf_v2',  // Variant being tested
    recommended_items: $item_ids,
    timestamp: datetime()
});

// Track engagement
MATCH (e:RecommendationEvent {event_id: $event_id})
MATCH (u:User {user_id: e.user_id})
MATCH (i:Item {item_id: $clicked_item_id})
WHERE i.item_id IN e.recommended_items
INSERT (e)-[c:CLICKED {
    position: indexOf(e.recommended_items, i.item_id),
    timestamp: datetime()
}]->(i);

// Compute CTR by algorithm variant
MATCH (e:RecommendationEvent)
WHERE e.timestamp > datetime().minusDays(7)
WITH e.algorithm AS algorithm,
     COUNT(e) AS impressions,
     COUNT { (e)-[:CLICKED]->() } AS clicks
RETURN algorithm,
       impressions,
       clicks,
       clicks * 100.0 / impressions AS ctr_percent,
       CASE WHEN algorithm = 'control' THEN null
            ELSE (clicks * 100.0 / impressions -
                  (SELECT ctr FROM ... WHERE algorithm = 'control')) /
                  (SELECT ctr FROM ... WHERE algorithm = 'control')
       END AS lift_vs_control
ORDER BY ctr_percent DESC;
```

## Integration with Other Geode Features

Collaborative filtering integrates seamlessly with:

- **Vector Embeddings**: Combine CF with learned item embeddings for hybrid recommendations
- **Graph Algorithms**: Use PageRank or community detection to identify influential items
- **Real-Time Analytics**: Stream new interactions and update recommendations dynamically
- **Row-Level Security**: Filter recommendations based on user permissions and access controls
- **BM25 Search**: Hybrid recommendations combining keyword search with CF
- **HNSW Vector Search**: Fast approximate nearest neighbor search for user/item embeddings

## Further Reading

- **Collaborative Filtering**: The Netflix Prize and Beyond
- **Matrix Factorization Techniques**: SVD, ALS, and Non-Negative Matrix Factorization
- **Neural Collaborative Filtering**: Deep Learning for Recommender Systems
- **Implicit Feedback**: Handling Click and View Data
- **Cold Start Problem**: Strategies and Solutions
- **Evaluation Metrics**: Precision, Recall, NDCG, and MAP
- **Production Recommendations**: Scaling to Billions of Users

Browse the tagged content below to discover documentation, tutorials, and guides for implementing collaborative filtering in your Geode applications.
