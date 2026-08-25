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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

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
     similarity(target.embedding, candidate.embedding) AS similarity
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
from geode_client import Client
import numpy as np

async def extract_ml_features(client, user_ids):
    result, _ = await client.query("""
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

## Advanced ML Patterns

### Link Prediction

Predict future relationships using graph features:

```gql
-- Extract features for link prediction
MATCH (a:User {id: $user_a}), (b:User {id: $user_b})
WITH a, b,
     SIZE([(a)-[:FOLLOWS]->() | 1]) AS a_out_degree,
     SIZE([()<-[:FOLLOWS]-(a) | 1]) AS a_in_degree,
     SIZE([(b)-[:FOLLOWS]->() | 1]) AS b_out_degree,
     SIZE([()<-[:FOLLOWS]-(b) | 1]) AS b_in_degree

// Common neighbors (Jaccard similarity)
MATCH (a)-[:FOLLOWS]->(common)<-[:FOLLOWS]-(b)
WITH a, b, a_out_degree, a_in_degree, b_out_degree, b_in_degree,
     COUNT(DISTINCT common) AS common_neighbors

// Adamic-Adar index
MATCH (a)-[:FOLLOWS]->(common)<-[:FOLLOWS]-(b)
WITH a, b, common_neighbors,
     SUM(1.0 / log(SIZE([(common)-[:FOLLOWS]->() | 1]))) AS adamic_adar

// Preferential attachment
WITH a, b, common_neighbors, adamic_adar,
     a_out_degree * b_out_degree AS preferential_attachment

RETURN a.id, b.id,
       common_neighbors,
       adamic_adar,
       preferential_attachment,
       a_out_degree, a_in_degree,
       b_out_degree, b_in_degree;
```

### Node Classification

Extract features for node classification tasks:

```gql
-- Features for user classification (churn prediction)
MATCH (user:User {id: $user_id})

// Activity features
WITH user,
     SIZE([(user)-[:ACTION]->() | 1]) AS total_actions,
     SIZE([
         (user)-[a:ACTION]->()
         WHERE a.timestamp > CURRENT_TIMESTAMP - INTERVAL '30' DAY
         | 1
     ]) AS recent_actions

// Social features
MATCH (user)-[:FOLLOWS]->(friend)
WITH user, total_actions, recent_actions,
     COUNT(friend) AS friend_count,
     AVG(friend.activity_score) AS avg_friend_activity

// Content features
MATCH (user)-[:POSTED]->(post:Post)
WITH user, total_actions, recent_actions, friend_count, avg_friend_activity,
     AVG(post.like_count) AS avg_post_likes,
     AVG(LENGTH(post.content)) AS avg_post_length

// Temporal features
MATCH (user)-[action:ACTION]->()
WITH user, total_actions, recent_actions, friend_count, avg_friend_activity,
     avg_post_likes, avg_post_length,
     MAX(action.timestamp) AS last_action_time

WITH user,
     total_actions,
     recent_actions,
     recent_actions * 1.0 / NULLIF(total_actions, 0) AS activity_trend,
     friend_count,
     avg_friend_activity,
     avg_post_likes,
     avg_post_length,
     DURATION.BETWEEN(last_action_time, CURRENT_TIMESTAMP).days AS days_since_last_action

RETURN user.id,
       total_actions,
       recent_actions,
       activity_trend,
       friend_count,
       avg_friend_activity,
       avg_post_likes,
       avg_post_length,
       days_since_last_action;
```

### Graph Convolutional Networks (GCN) Support

Implement GCN layer operations in Geode:

```python
import numpy as np
from geode_client import Client

class GraphConvolutionalLayer:
    """Simple GCN layer implementation using Geode"""

    def __init__(self, client, input_dim, output_dim):
        self.client = client
        self.input_dim = input_dim
        self.output_dim = output_dim
        self.weights = np.random.randn(input_dim, output_dim) * 0.01

    async def forward(self, node_ids):
        """
        Perform one GCN layer forward pass:
        H' = σ(D^(-1/2) A D^(-1/2) H W)
        """
        # Fetch node features and neighbor information
        result, _ = await self.client.query("""
            UNWIND $node_ids AS node_id
            MATCH (n:Node {id: node_id})
            OPTIONAL MATCH (n)-[:EDGE]-(neighbor:Node)
            WITH n,
                 n.features AS features,
                 COLLECT(DISTINCT neighbor.id) AS neighbors,
                 COUNT(DISTINCT neighbor) + 1 AS degree
            RETURN n.id, features, neighbors, degree
        """, {"node_ids": node_ids})

        # Aggregate neighbor features (message passing)
        aggregated_features = {}

        for row in result.rows:
            node_id = row['n.id']
            features = np.array(row['features'])
            neighbors = row['neighbors']
            degree = row['degree']

            # Self-loop
            aggregated = features / np.sqrt(degree)

            # Add neighbor contributions
            if neighbors:
                neighbor_result, _ = await self.client.query("""
                    UNWIND $neighbor_ids AS nid
                    MATCH (n:Node {id: nid})
                    OPTIONAL MATCH (n)-[:EDGE]-()
                    WITH n, COUNT(*) + 1 AS neighbor_degree
                    RETURN n.id, n.features, neighbor_degree
                """, {"neighbor_ids": neighbors})

                for neighbor_row in neighbor_result.rows:
                    neighbor_features = np.array(neighbor_row['n.features'])
                    neighbor_degree = neighbor_row['neighbor_degree']

                    # Normalized aggregation
                    aggregated += neighbor_features / (
                        np.sqrt(degree) * np.sqrt(neighbor_degree)
                    )

            # Apply learned weights
            aggregated_features[node_id] = aggregated @ self.weights

        # Apply activation function (ReLU)
        for node_id in aggregated_features:
            aggregated_features[node_id] = np.maximum(0, aggregated_features[node_id])

        return aggregated_features

    async def update_node_embeddings(self, aggregated_features):
        """Store computed embeddings back to Geode"""
        await self.client.execute("""
            UNWIND $updates AS update
            MATCH (n:Node {id: update.node_id})
            SET n.embedding = update.embedding,
                n.embedding_updated = CURRENT_TIMESTAMP
        """, {
            "updates": [
                {"node_id": nid, "embedding": features.tolist()}
                for nid, features in aggregated_features.items()
            ]
        })
```

### Training Data Sampling

Efficiently sample training data from graph:

```python
async def sample_training_data(client, batch_size=1000):
    """
    Sample balanced training batches for node classification
    """
    # Get class distribution
    class_counts, _ = await client.query("""
        MATCH (n:Node)
        WHERE n.label IS NOT NULL
        RETURN n.label, COUNT(*) AS count
    """)

    # Calculate sampling probabilities for balanced batches
    total = sum(row['count'] for row in class_counts.rows)
    class_weights = {
        row['n.label']: total / (len(class_counts.rows) * row['count'])
        for row in class_counts.rows
    }

    # Sample with stratification
    samples_per_class = batch_size // len(class_weights)

    training_nodes = []
    for label, weight in class_weights.items():
        samples, _ = await client.query("""
            MATCH (n:Node {label: $label})
            WITH n, RAND() AS random
            ORDER BY random
            LIMIT $limit
            RETURN n.id, n.features, n.label
        """, {"label": label, "limit": samples_per_class})

        training_nodes.extend(samples.rows)

    return training_nodes
```

### Graph Attention Networks (GAT) Implementation

Implement attention mechanisms for graph learning:

```python
async def compute_attention_weights(client, node_id):
    """
    Compute attention weights for neighbors using learned attention mechanism
    """
    result, _ = await client.query("""
        MATCH (center:Node {id: $node_id})
        MATCH (center)-[e:EDGE]-(neighbor:Node)
        RETURN center.embedding AS center_emb,
               neighbor.id AS neighbor_id,
               neighbor.embedding AS neighbor_emb,
               e.features AS edge_features
    """, {"node_id": node_id})

    center_embedding = np.array(result.rows[0]['center_emb'])

    attention_weights = {}
    for row in result.rows:
        neighbor_id = row['neighbor_id']
        neighbor_emb = np.array(row['neighbor_emb'])
        edge_features = np.array(row['edge_features']) if row['edge_features'] else np.zeros(8)

        # Concatenate embeddings and edge features
        concat = np.concatenate([center_embedding, neighbor_emb, edge_features])

        # Compute attention score (learned attention parameters)
        attention_score = np.dot(concat, attention_params)  # attention_params learned during training

        attention_weights[neighbor_id] = attention_score

    # Softmax normalization
    exp_scores = {nid: np.exp(score) for nid, score in attention_weights.items()}
    sum_exp = sum(exp_scores.values())
    normalized_weights = {nid: score / sum_exp for nid, score in exp_scores.items()}

    # Store attention weights for visualization/analysis
    await client.execute("""
        UNWIND $weights AS w
        MATCH (center:Node {id: $center_id})-[e:EDGE]-(neighbor:Node {id: w.neighbor_id})
        SET e.attention_weight = w.weight
    """, {
        "center_id": node_id,
        "weights": [
            {"neighbor_id": nid, "weight": weight}
            for nid, weight in normalized_weights.items()
        ]
    })

    return normalized_weights
```

### Online Learning and Model Updates

Incrementally update models with new data:

```python
class IncrementalGraphModel:
    """Online learning model that updates with new graph data"""

    async def partial_fit(self, client, new_nodes, new_edges):
        """Update model with new nodes and edges"""

        # Extract features for new nodes
        new_features = await self.extract_features(client, new_nodes)

        # Update embedding for new nodes
        new_embeddings = self.model.transform(new_features)

        # Store embeddings
        await client.execute("""
            UNWIND $embeddings AS emb
            MATCH (n:Node {id: emb.node_id})
            SET n.embedding = emb.vector,
                n.embedding_model_version = $version
        """, {
            "embeddings": [
                {"node_id": nid, "vector": emb.tolist()}
                for nid, emb in zip(new_nodes, new_embeddings)
            ],
            "version": self.model_version
        })

        # Incrementally update neighbor embeddings (for propagation models)
        affected_neighbors, _ = await client.query("""
            UNWIND $new_nodes AS node_id
            MATCH (new:Node {id: node_id})-[:EDGE]-(neighbor:Node)
            RETURN DISTINCT neighbor.id
        """, {"new_nodes": new_nodes})

        neighbor_ids = [row['neighbor.id'] for row in affected_neighbors.rows]

        # Re-compute embeddings for affected neighbors
        await self.recompute_embeddings(client, neighbor_ids)

    async def recompute_embeddings(self, client, node_ids):
        """Re-compute embeddings for nodes affected by graph changes"""
        for node_id in node_ids:
            features = await self.extract_node_features(client, node_id)
            embedding = self.model.transform([features])[0]

            await client.execute("""
                MATCH (n:Node {id: $node_id})
                SET n.embedding = $embedding,
                    n.embedding_updated = CURRENT_TIMESTAMP
            """, {"node_id": node_id, "embedding": embedding.tolist()})
```

### Model Monitoring and Drift Detection

Track model performance over time:

```python
async def monitor_model_drift(client, model_id, prediction_window_days=30):
    """
    Detect model drift by comparing prediction distribution
    over time
    """
    # Get recent predictions
    recent_predictions, _ = await client.query("""
        MATCH (n:Node)-[p:PREDICTION]->()
        WHERE p.model_id = $model_id
          AND p.timestamp > CURRENT_TIMESTAMP - INTERVAL '$days' DAY
        RETURN p.predicted_class,
               p.confidence,
               p.timestamp
        ORDER BY p.timestamp
    """, {"model_id": model_id, "days": prediction_window_days})

    # Split into time windows
    window_size = prediction_window_days // 7  # Weekly windows

    distributions = []
    for week in range(7):
        start = week * window_size
        end = (week + 1) * window_size

        week_preds = [
            row for row in recent_predictions.rows
            if start <= (CURRENT_TIMESTAMP - row['p.timestamp']).days < end
        ]

        # Calculate distribution
        class_dist = {}
        for pred in week_preds:
            cls = pred['p.predicted_class']
            class_dist[cls] = class_dist.get(cls, 0) + 1

        distributions.append(class_dist)

    # Detect drift using KL divergence
    drift_score = calculate_kl_divergence(distributions[0], distributions[-1])

    if drift_score > 0.1:  # Threshold
        print(f"WARNING: Model drift detected for {model_id}")
        print(f"KL divergence: {drift_score:.4f}")
        return True

    return False
```

### Feature Store Integration

Use Geode as a feature store for ML pipelines:

```python
class GeodeFeatureStore:
    """Feature store backed by Geode graph database"""

    def __init__(self, client):
        self.client = client

    async def register_feature(self, feature_name, feature_query, entity_type):
        """Register a feature definition"""
        await self.client.execute("""
            CREATE (f:Feature {
                name: $name,
                query: $query,
                entity_type: $entity_type,
                registered_at: CURRENT_TIMESTAMP
            })
        """, {
            "name": feature_name,
            "query": feature_query,
            "entity_type": entity_type
        })

    async def compute_features(self, feature_names, entity_ids):
        """Compute features for given entities"""
        features = {}

        for feature_name in feature_names:
            # Get feature definition
            definition, _ = await self.client.query("""
                MATCH (f:Feature {name: $name})
                RETURN f.query, f.entity_type
            """, {"name": feature_name})

            query_template = definition.rows[0]['f.query']

            # Execute feature query for each entity
            results, _ = await self.client.query(
                query_template,
                {"entity_ids": entity_ids}
            )

            features[feature_name] = {
                row['entity_id']: row['feature_value']
                for row in results.rows
            }

        # Transpose to entity-centric format
        entity_features = {}
        for entity_id in entity_ids:
            entity_features[entity_id] = {
                fname: features[fname].get(entity_id)
                for fname in feature_names
            }

        return entity_features

    async def materialize_features(self, feature_names, entity_type):
        """Pre-compute and cache features.

        Feature queries are stored as text on :Feature nodes, but the server
        cannot execute a string it read from the graph — there is no
        dynamic-query procedure (`apoc.cypher.run` is a Neo4j APOC procedure and
        has no Geode equivalent). Read the query text first, then send it as a
        statement of its own.
        """
        for feature_name in feature_names:
            # Property names cannot be parameterised, so the name is
            # interpolated below — allow only safe identifiers.
            if not feature_name.isidentifier():
                raise ValueError(f"unsafe feature name: {feature_name!r}")

            definition, _ = await self.client.query(
                "MATCH (f:Feature {name: $name}) RETURN f.query AS query",
                {"name": feature_name},
            )
            if not definition.rows:
                continue

            feature_query = definition.rows[0]["query"]

            # The stored text is expected to yield (entity_id, feature_value)
            values, _ = await self.client.query(
                feature_query, {"entity_type": entity_type}
            )

            for row in values.rows:
                await self.client.execute(
                    f"MATCH (entity) WHERE id(entity) = $id "
                    f"SET entity.{feature_name} = $value",
                    {"id": row["entity_id"], "value": row["feature_value"]},
                )
```

## Production ML Workflows

### Complete Training Pipeline

```python
async def train_graph_model(client, model_config):
    """End-to-end graph ML training pipeline"""

    # 1. Feature extraction
    print("Extracting features...")
    features = await extract_graph_features(
        client,
        node_label="User",
        feature_config=model_config['features']
    )

    # 2. Train/test split
    from sklearn.model_selection import train_test_split
    X = [f['features'] for f in features]
    y = [f['label'] for f in features]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    # 3. Train model
    print("Training model...")
    model = train_xgboost(X_train, y_train, model_config['params'])

    # 4. Evaluate
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    print(f"Test accuracy: {accuracy:.4f}")

    # 5. Store model and predictions
    print("Storing model...")
    await store_model(client, model, model_config, accuracy)

    # 6. Generate predictions for all nodes
    print("Generating predictions...")
    all_predictions = model.predict(X)
    await store_predictions(client, features, all_predictions)

    return model, accuracy
```

### A/B Testing ML Models

```python
async def ab_test_models(client, model_a_id, model_b_id, traffic_split=0.5):
    """A/B test two different models"""

    async def serve_prediction(user_id):
        # Assign user to variant
        user_hash = hash(user_id) % 100
        model_id = model_a_id if user_hash < traffic_split * 100 else model_b_id

        # Get prediction from assigned model
        result, _ = await client.query("""
            MATCH (user:User {id: $user_id})
            MATCH (model:MLModel {id: $model_id})
            // Get features and apply model
            WITH user, model,
                 extract_features(user) AS features
            RETURN model.predict(features) AS prediction
        """, {"user_id": user_id, "model_id": model_id})

        prediction = result.rows[0]['prediction']

        # Log for analysis
        await client.execute("""
            CREATE (e:ExperimentEvent {
                user_id: $user_id,
                model_id: $model_id,
                prediction: $prediction,
                timestamp: CURRENT_TIMESTAMP
            })
        """, {
            "user_id": user_id,
            "model_id": model_id,
            "prediction": prediction
        })

        return prediction

    return serve_prediction
```

## Related Topics

- **[Embeddings](/tags/embeddings/)**: Vector storage and similarity search
- **[Vector Search](/tags/vector-search/)**: HNSW-based embedding retrieval
- **[Analytics](/tags/analytics/)**: Feature engineering patterns
- **[Graph Algorithms](/tags/graph-algorithms/)**: Graph algorithm implementations
- **[Python Client](/tags/python/)**: Python integration patterns
- **[Real-Time Analytics](/tags/real-time-analytics/)**: Real-time data processing

## Further Reading

- **Graph Algorithms**: `/docs/analytics/graph-algorithms/`
- **Real-Time Analytics**: `/docs/analytics/real-time-analytics/`
- **Python Client**: `/docs/client-libraries/python-client/`
- **Vector Search Tutorial**: `/docs/tutorials/vector-search-tutorial/`
