---
title: "Machine Learning Integration"
description: "Integrate machine learning with Geode graph database. Use graph features for ML training, store embeddings, implement GNNs, and deploy graph-powered ML models with GQL."
keywords:
  - machine learning
  - ML integration
  - graph neural networks
  - GNN
  - feature engineering
  - graph embeddings
  - model deployment
  - Geode
  - GQL
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/machine-learning/"
    noindex: false
---

# Machine Learning Integration with Geode

Geode serves as a powerful foundation for machine learning workflows, providing graph-based feature engineering, embedding storage, and deployment infrastructure for graph neural networks (GNNs) and ML models that leverage network structure.

## Graph Data for Machine Learning

Graphs naturally encode relational information that traditional machine learning struggles to capture from flat tables. Geode enables extraction of topological features, generation of graph embeddings, and serving of ML predictions at scale.

### Why Graphs for ML

**Rich Feature Space**: Graph topology provides features like degree centrality, clustering coefficients, and PageRank that capture network position.

**Relational Learning**: Graph neural networks learn representations that incorporate both node attributes and network structure.

**Feature Engineering**: Extract complex patterns (motifs, communities, paths) as features for traditional ML models.

**Model Deployment**: Store trained models and serve predictions using graph context for real-time inference.

## Graph Feature Extraction

### Topological Features

```gql
-- Extract node-level features for ML training
MATCH (n:User)
WITH n,
     COUNT { (n)-[:FOLLOWS]->() } AS out_degree,
     COUNT { (n)<-[:FOLLOWS]-() } AS in_degree,
     COUNT { (n)-[:FOLLOWS]->()-[:FOLLOWS]->(n) } AS reciprocal_connections
WITH n, out_degree, in_degree, reciprocal_connections,
     CASE WHEN out_degree > 0
          THEN reciprocal_connections * 1.0 / out_degree
          ELSE 0 END AS reciprocity_rate
MATCH (n)-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(fof:User)
WHERE NOT EXISTS { (n)-[:FOLLOWS]->(fof) } AND n <> fof
WITH n, out_degree, in_degree, reciprocity_rate,
     COUNT(DISTINCT fof) AS potential_connections
RETURN n.id AS user_id,
       out_degree,
       in_degree,
       reciprocity_rate,
       potential_connections,
       out_degree * 1.0 / (in_degree + 1) AS influence_ratio
ORDER BY n.id;
```

### Community-Based Features

```gql
-- Extract community membership as features
MATCH (n:User)
WITH n,
     n.community_id AS community
MATCH (n)-[:FOLLOWS]->(neighbor:User)
WITH n,
     community,
     COUNT(CASE WHEN neighbor.community_id = community THEN 1 END) AS internal_connections,
     COUNT(CASE WHEN neighbor.community_id <> community THEN 1 END) AS external_connections
RETURN n.id,
       community,
       internal_connections,
       external_connections,
       internal_connections * 1.0 / (internal_connections + external_connections + 1) AS homophily_score;
```

### Temporal Features

```gql
-- Extract temporal interaction patterns
MATCH (user:User)-[action:PURCHASED]->(product:Product)
WHERE action.timestamp > CURRENT_TIMESTAMP - INTERVAL '90' DAY
WITH user,
     COUNT(action) AS total_purchases,
     SUM(action.amount) AS total_spent,
     AVG(action.amount) AS avg_purchase,
     STDDEV(action.amount) AS purchase_variance,
     COUNT(DISTINCT DATE(action.timestamp)) AS active_days
RETURN user.id,
       total_purchases,
       total_spent,
       avg_purchase,
       purchase_variance,
       active_days,
       total_purchases * 1.0 / active_days AS purchase_frequency;
```

## Storing and Managing Embeddings

### Embedding Storage

```gql
-- Store pre-computed node embeddings
MATCH (user:User {id: $user_id})
SET user.embedding = $embedding_vector,
    user.embedding_model = 'node2vec-v1',
    user.embedding_timestamp = CURRENT_TIMESTAMP;

-- Store edge embeddings
MATCH (a:Node {id: $node_a})-[r:RELATED]->(b:Node {id: $node_b})
SET r.embedding = $edge_embedding,
    r.embedding_dim = 128;
```

### Batch Embedding Updates

```gql
-- Update embeddings for multiple nodes
UNWIND $embeddings AS emb
MATCH (n:Node {id: emb.node_id})
SET n.embedding = emb.vector,
    n.updated = CURRENT_TIMESTAMP
CALL {
    WITH n
    // Optionally update downstream computations
} IN TRANSACTIONS OF 1000 ROWS;
```

### Embedding-Based Similarity

```gql
-- Find similar nodes using embedding similarity
MATCH (target:Product {id: $product_id})
MATCH (candidate:Product)
WHERE candidate <> target
  AND candidate.embedding IS NOT NULL
WITH candidate,
     COSINE_SIMILARITY(target.embedding, candidate.embedding) AS similarity
WHERE similarity > 0.75
RETURN candidate.id,
       candidate.name,
       similarity
ORDER BY similarity DESC
LIMIT 20;
```

## Graph Neural Network Support

### Neighborhood Aggregation

```gql
-- Aggregate neighbor features (GNN-style)
MATCH (node:User {id: $user_id})
MATCH (node)-[:FOLLOWS]->(neighbor:User)
WITH node,
     COLLECT(neighbor.feature_vector) AS neighbor_features
RETURN node.id,
       node.feature_vector AS node_features,
       AVG([f IN neighbor_features | f]) AS aggregated_neighbor_features,
       MAX([f IN neighbor_features | f]) AS max_neighbor_features;
```

### Multi-Hop Aggregation

```gql
-- 2-hop neighborhood aggregation
MATCH (node:User {id: $user_id})
MATCH (node)-[:FOLLOWS*1..2]->(neighbor:User)
WITH node,
     neighbor,
     LENGTH((node)-[:FOLLOWS*]->(neighbor)) AS distance
WITH node,
     distance,
     COLLECT(neighbor.embedding) AS embeddings_at_distance
RETURN node.id,
       AVG([e IN embeddings_at_distance WHERE distance = 1 | e]) AS first_hop_agg,
       AVG([e IN embeddings_at_distance WHERE distance = 2 | e]) AS second_hop_agg;
```

### Attention Mechanisms

```gql
-- Weighted neighbor aggregation (attention-like)
MATCH (node:User {id: $user_id})-[r:INTERACTS_WITH]->(neighbor:User)
WITH node,
     neighbor,
     r.weight AS attention_weight,
     neighbor.features AS neighbor_features
WITH node,
     SUM(attention_weight * neighbor_features) AS weighted_aggregation,
     SUM(attention_weight) AS total_weight
RETURN node.id,
       weighted_aggregation / total_weight AS attended_features;
```

## Model Deployment and Inference

### Storing Trained Models

```gql
-- Store model metadata and parameters
CREATE (model:MLModel {
    id: 'user_churn_v2',
    type: 'XGBoost',
    version: '2.0',
    features: ['degree', 'activity_rate', 'avg_session_time'],
    accuracy: 0.89,
    trained_date: CURRENT_TIMESTAMP,
    model_path: 's3://models/user_churn_v2.pkl'
});

-- Link model to feature definitions
MATCH (model:MLModel {id: 'user_churn_v2'})
CREATE (model)-[:USES_FEATURE]->(feature:Feature {
    name: 'user_degree',
    query: 'MATCH (u:User) RETURN COUNT { (u)-[:FOLLOWS]->() } AS degree',
    type: 'integer'
});
```

### Real-Time Prediction Serving

```gql
-- Extract features and serve prediction
MATCH (user:User {id: $user_id})
WITH user,
     COUNT { (user)-[:FOLLOWS]->() } AS degree,
     COUNT {
         (user)-[action:ACTION]->()
         WHERE action.timestamp > CURRENT_TIMESTAMP - INTERVAL '30' DAY
     } AS recent_activity,
     AVG([s IN [(user)-[session:SESSION]->() | session.duration]]) AS avg_session_time
// Features extracted, would call external model in application layer
RETURN user.id,
       degree,
       recent_activity,
       avg_session_time;
```

### Batch Prediction Storage

```gql
-- Store prediction results
UNWIND $predictions AS pred
MATCH (user:User {id: pred.user_id})
SET user.churn_probability = pred.probability,
    user.churn_predicted_at = CURRENT_TIMESTAMP,
    user.churn_model_version = 'v2.0'
CALL {
    WITH user, pred
    // Optionally trigger actions based on prediction
    WITH user WHERE pred.probability > 0.7
    CREATE (alert:Alert {
        type: 'HIGH_CHURN_RISK',
        user_id: user.id,
        probability: pred.probability,
        created: CURRENT_TIMESTAMP
    })
} IN TRANSACTIONS OF 1000 ROWS;
```

## Graph Sampling for Training

### Random Walk Sampling

```gql
-- Generate random walk samples for training
MATCH path = (start:User {id: $start_user})-[:FOLLOWS*5]-(end:User)
WHERE ALL(step IN RELATIONSHIPS(path) WHERE RAND() > 0.5)
WITH NODES(path) AS walk_nodes
RETURN [n IN walk_nodes | n.id] AS random_walk;
```

### Subgraph Sampling

```gql
-- Sample subgraph around seed nodes
MATCH (seed:User)
WHERE seed.id IN $seed_ids
MATCH (seed)-[:FOLLOWS*1..2]-(neighbor:User)
WITH COLLECT(DISTINCT seed) + COLLECT(DISTINCT neighbor) AS sampled_nodes
UNWIND sampled_nodes AS node
MATCH (node)-[r:FOLLOWS]-(other)
WHERE other IN sampled_nodes
RETURN node.id,
       other.id,
       TYPE(r) AS relationship_type,
       node.features AS node_features;
```

### Stratified Sampling

```gql
-- Sample balanced training set
MATCH (positive:User {churned: true})
WITH COLLECT(positive)[..1000] AS positive_samples
MATCH (negative:User {churned: false})
WITH positive_samples,
     COLLECT(negative)[..1000] AS negative_samples
UNWIND (positive_samples + negative_samples) AS sample
RETURN sample.id,
       sample.churned AS label,
       sample.features AS features;
```

## Feature Engineering Patterns

### Graph Motif Counting

```gql
-- Count triangle participation (motif feature)
MATCH (user:User {id: $user_id})-[:FOLLOWS]->(friend1:User)-[:FOLLOWS]->(friend2:User)
WHERE EXISTS { (user)-[:FOLLOWS]->(friend2) }
RETURN user.id,
       COUNT(DISTINCT friend1) AS triangle_count;
```

### Path-Based Features

```gql
-- Extract path length distributions
MATCH (user1:User {id: $user_id})
MATCH path = SHORTEST_PATH((user1)-[:FOLLOWS*]-(user2:User))
WHERE user2.category = 'influencer'
WITH user1,
     [len IN [LENGTH(path)] | len] AS path_lengths
RETURN user1.id,
       MIN(path_lengths) AS min_distance_to_influencer,
       AVG(path_lengths) AS avg_distance_to_influencer,
       COUNT(path_lengths) AS influencer_connections;
```

### Temporal Graph Features

```gql
-- Extract temporal evolution features
MATCH (user:User {id: $user_id})-[action:ACTION]->()
WITH user,
     [a IN COLLECT(action) ORDER BY a.timestamp | a.timestamp] AS timestamps
WITH user,
     [i IN RANGE(1, SIZE(timestamps) - 1) |
      DURATION.BETWEEN(timestamps[i-1], timestamps[i]).days] AS inter_event_times
RETURN user.id,
       AVG(inter_event_times) AS avg_inter_event_days,
       STDDEV(inter_event_times) AS inter_event_variance,
       SIZE(timestamps) AS total_events;
```

## Best Practices

### Feature Engineering

**Domain Knowledge**: Combine graph topology with domain-specific features for best results.

**Feature Scaling**: Normalize degree-based features as graphs grow to maintain consistent model behavior.

**Temporal Consistency**: Use time windows that match your prediction horizon (30-day features for 30-day churn prediction).

**Feature Updates**: Refresh features periodically; cache frequently-used features for performance.

### Embedding Management

**Version Control**: Track embedding model versions and retrain schedules to ensure reproducibility.

**Dimension Consistency**: Maintain consistent embedding dimensions across all nodes for downstream tasks.

**Null Handling**: Define behavior for nodes without embeddings (use default vectors or exclude from calculations).

**Storage Optimization**: Consider storing embeddings in external vector databases for large-scale deployments.

### Model Integration

**Feature Extraction Performance**: Pre-compute and cache expensive graph features rather than computing on every prediction.

**Batch Predictions**: Process predictions in batches during off-peak hours for efficiency.

**Model Monitoring**: Track prediction distributions and feature drift over time.

**A/B Testing**: Store multiple model versions to enable controlled rollout and comparison.

## Integration Examples

### Python Client - Feature Extraction

```python
from geode_client import GeodeClient
import numpy as np

async def extract_ml_features(client, user_ids):
    result = await client.execute("""
        UNWIND $user_ids AS uid
        MATCH (u:User {id: uid})
        WITH u,
             COUNT { (u)-[:FOLLOWS]->() } AS out_degree,
             COUNT { (u)<-[:FOLLOWS]-() } AS in_degree,
             COUNT {
                 (u)-[action:ACTION]->()
                 WHERE action.timestamp > CURRENT_TIMESTAMP - INTERVAL '30' DAY
             } AS recent_activity
        MATCH (u)-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(fof:User)
        WHERE NOT EXISTS { (u)-[:FOLLOWS]->(fof) } AND u <> fof
        WITH u, out_degree, in_degree, recent_activity,
             COUNT(DISTINCT fof) AS potential_connections
        RETURN u.id,
               out_degree,
               in_degree,
               recent_activity,
               potential_connections,
               out_degree * 1.0 / (in_degree + 1) AS influence_ratio
    """, {'user_ids': user_ids})

    features = []
    for row in result.rows:
        features.append({
            'user_id': row[0],
            'out_degree': row[1],
            'in_degree': row[2],
            'recent_activity': row[3],
            'potential_connections': row[4],
            'influence_ratio': row[5]
        })

    return features

async def store_embeddings(client, embeddings_dict):
    await client.execute("""
        UNWIND $embeddings AS emb
        MATCH (u:User {id: emb.user_id})
        SET u.embedding = emb.vector,
            u.embedding_updated = CURRENT_TIMESTAMP
    """, {
        'embeddings': [
            {'user_id': uid, 'vector': vec.tolist()}
            for uid, vec in embeddings_dict.items()
        ]
    })
```

### Rust Client - Prediction Serving

```rust
use geode_client::Client;

async fn serve_predictions(client: &Client, predictions: Vec<Prediction>) -> Result<()> {
    let pred_data: Vec<_> = predictions.iter()
        .map(|p| {
            json!({
                "user_id": p.user_id,
                "probability": p.churn_probability,
                "model_version": "v2.0"
            })
        })
        .collect();

    client.execute(
        "UNWIND $predictions AS pred \
         MATCH (u:User {id: pred.user_id}) \
         SET u.churn_probability = pred.probability, \
             u.churn_predicted_at = CURRENT_TIMESTAMP, \
             u.churn_model_version = pred.model_version",
        &[("predictions", pred_data.into())]
    ).await?;

    Ok(())
}

async fn get_inference_features(client: &Client, user_id: &str) -> Result<Features> {
    let result = client.execute(
        "MATCH (u:User {id: $user_id}) \
         WITH u, \
              COUNT { (u)-[:FOLLOWS]->() } AS degree, \
              COUNT { (u)-[a:ACTION]->() WHERE a.timestamp > CURRENT_TIMESTAMP - INTERVAL '30' DAY } AS activity \
         RETURN degree, activity, u.embedding",
        &[("user_id", user_id.into())]
    ).await?;

    Ok(Features {
        degree: result.get_int(0, 0)?,
        recent_activity: result.get_int(0, 1)?,
        embedding: result.get_float_list(0, 2)?,
    })
}
```

## Related Topics

- **Embeddings**: See embeddings tag for vector storage and similarity search
- **Vector Search**: Check vector-search for HNSW-based embedding retrieval
- **Analytics**: Explore analytics tag for feature engineering patterns
- **PageRank**: Use pagerank for importance-based features