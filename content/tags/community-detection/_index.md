---
title: "Community Detection"
description: "Detect communities and clusters in graphs using Geode's GQL implementation. Learn label propagation, modularity optimization, and connected components algorithms for social network analysis and graph clustering."
keywords:
  - community detection
  - graph clustering
  - label propagation
  - modularity
  - connected components
  - Louvain algorithm
  - social network analysis
  - Geode
  - GQL
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/community-detection/"
    noindex: false
---

# Community Detection in Geode

Community detection identifies groups of densely connected nodes within a graph, revealing organizational structure, social circles, functional modules, and natural clusters. Geode provides native GQL support for implementing various community detection algorithms efficiently at scale.

## Understanding Community Detection

Communities are subgraphs where nodes have more connections within the group than to nodes outside it. Detecting these structures helps understand graph organization, identify influential groups, and optimize resource allocation.

### Core Concepts

**Modularity**: A metric measuring the quality of a community partition, comparing actual intra-community edges to expected edges in a random graph.

**Label Propagation**: An iterative algorithm where nodes adopt the most common label among their neighbors, causing communities to emerge naturally.

**Connected Components**: The simplest form of community detection, identifying completely disconnected subgraphs.

**Overlapping Communities**: Some algorithms allow nodes to belong to multiple communities simultaneously, reflecting real-world complexity.

## Label Propagation Algorithm

Label propagation is a fast, simple community detection method that works well for large graphs.

### Basic Implementation

```gql
-- Initialize each node with unique label
MATCH (n:User)
SET n.community = ID(n);

-- Iterative label propagation
MATCH (n:User)-[:KNOWS]-(neighbor:User)
WITH n, neighbor.community AS label, COUNT(*) AS frequency
ORDER BY frequency DESC
WITH n, COLLECT(label)[0] AS most_common_label
SET n.community_new = most_common_label;

-- Update labels
MATCH (n:User)
SET n.community = n.community_new
REMOVE n.community_new;

-- Find community sizes
MATCH (n:User)
RETURN n.community AS community_id,
       COUNT(n) AS size,
       COLLECT(n.id)[..10] AS sample_members
ORDER BY size DESC;
```

### Weighted Label Propagation

```gql
-- Propagate labels weighted by edge strength
MATCH (n:User)-[r:INTERACTS_WITH]-(neighbor:User)
WITH n,
     neighbor.community AS label,
     SUM(r.weight) AS total_weight
ORDER BY total_weight DESC
WITH n, COLLECT(label)[0] AS strongest_label
SET n.community = strongest_label;
```

### Synchronized vs Asynchronous Updates

```gql
-- Synchronized update (process all nodes simultaneously)
MATCH (n:User)-[:KNOWS]-(neighbor:User)
WITH n, neighbor.community AS label, COUNT(*) AS freq
ORDER BY freq DESC
WITH n, COLLECT(label)[0] AS new_label
CALL {
    WITH n, new_label
    SET n.community_new = new_label
} IN TRANSACTIONS OF 10000 ROWS;

MATCH (n:User)
SET n.community = n.community_new
REMOVE n.community_new;
```

## Connected Components

Connected components identify completely separate subgraphs with no paths between them.

### Finding Connected Components

```gql
-- Initialize component IDs
MATCH (n:Node)
SET n.component = ID(n);

-- Propagate minimum ID within each component
MATCH (n:Node)-[:CONNECTED]-(neighbor:Node)
WHERE neighbor.component < n.component
SET n.component = neighbor.component;

-- Repeat until stable (typically log(N) iterations)
-- Then analyze components
MATCH (n:Node)
RETURN n.component AS component_id,
       COUNT(n) AS size,
       COLLECT(n.name) AS members
ORDER BY size DESC;
```

### Strongly Connected Components

```gql
-- For directed graphs, find strongly connected components
MATCH path = (start:Node)-[:DIRECTED_EDGE*]->(end:Node)
WHERE start = end
  AND LENGTH(path) > 0
WITH DISTINCT [node IN NODES(path) | ID(node)] AS component_nodes
RETURN component_nodes,
       SIZE(component_nodes) AS component_size
ORDER BY component_size DESC;
```

## Modularity-Based Detection

Modularity optimization finds communities that maximize the modularity metric.

### Computing Modularity

```gql
-- Calculate modularity for current community assignment
MATCH (n:Node)
WITH COUNT(n) AS total_nodes
MATCH (n:Node)-[r:CONNECTED]-(m:Node)
WITH total_nodes,
     COUNT(r) / 2.0 AS total_edges,
     COLLECT({
         node: n,
         degree: COUNT { (n)-[:CONNECTED]-() },
         community: n.community
     }) AS node_data
WITH total_nodes, total_edges, node_data
MATCH (n:Node)-[:CONNECTED]-(m:Node)
WHERE n.community = m.community
WITH total_edges,
     node_data,
     COUNT(*) / 2.0 AS intra_community_edges,
     SUM([nd IN node_data WHERE nd.community = n.community | nd.degree][0]) AS community_degree_sum
RETURN (intra_community_edges / total_edges) -
       POWER(community_degree_sum / (2.0 * total_edges), 2) AS modularity;
```

### Greedy Modularity Optimization

```gql
-- Iteratively move nodes to communities that maximize modularity gain
MATCH (n:Node)
SET n.community = ID(n);

-- For each node, try moving to neighbor communities
MATCH (n:Node)-[:CONNECTED]-(neighbor:Node)
WHERE n.community <> neighbor.community
WITH n,
     neighbor.community AS candidate_community,
     COUNT(*) AS edge_count
ORDER BY edge_count DESC
WITH n, COLLECT(candidate_community)[0] AS best_community
WHERE best_community IS NOT NULL
SET n.community = best_community;

-- Repeat until modularity stops improving
```

## Louvain Algorithm

The Louvain method is a hierarchical community detection algorithm that optimizes modularity.

### Phase 1: Local Optimization

```gql
-- Initialize communities
MATCH (n:Node)
SET n.community = ID(n);

-- Local optimization: move nodes to maximize modularity gain
MATCH (n:Node)
CALL {
    WITH n
    MATCH (n)-[r:CONNECTED]-(neighbor:Node)
    WITH neighbor.community AS comm,
         SUM(r.weight) AS edge_weight,
         COUNT { (neighbor)-[:CONNECTED]-(:Node {community: neighbor.community}) } AS comm_edges
    RETURN comm,
           edge_weight - (comm_edges * COUNT { (n)-[:CONNECTED]-() } / (2.0 * COUNT { MATCH ()-[:CONNECTED]-() })) AS modularity_gain
    ORDER BY modularity_gain DESC
    LIMIT 1
}
SET n.community = comm;
```

### Phase 2: Graph Aggregation

```gql
-- Create super-nodes from communities
MATCH (n:Node)
WITH n.community AS comm_id,
     COLLECT(n) AS members,
     SUM(COUNT { (n)-[:CONNECTED]-() }) AS total_degree
CREATE (super:SuperNode {
    id: comm_id,
    member_count: SIZE(members),
    total_degree: total_degree
});

-- Create edges between super-nodes
MATCH (n:Node)-[r:CONNECTED]-(m:Node)
WHERE n.community <> m.community
WITH n.community AS comm1,
     m.community AS comm2,
     SUM(r.weight) AS total_weight
MATCH (s1:SuperNode {id: comm1}),
      (s2:SuperNode {id: comm2})
CREATE (s1)-[:CONNECTED {weight: total_weight}]->(s2);
```

## Practical Applications

### Social Network Clustering

```gql
-- Detect friend groups in social network
MATCH (user:User)
SET user.friend_group = ID(user);

-- Propagate group labels
MATCH (u:User)-[:FRIENDS_WITH]-(friend:User)
WITH u, friend.friend_group AS group, COUNT(*) AS mutual_friends
ORDER BY mutual_friends DESC
WITH u, COLLECT(group)[0] AS primary_group
SET u.friend_group = primary_group;

-- Analyze groups
MATCH (u:User)
WITH u.friend_group AS group_id,
     COUNT(u) AS size,
     AVG(COUNT { (u)-[:FRIENDS_WITH]-() }) AS avg_connections
RETURN group_id, size, avg_connections
ORDER BY size DESC;
```

### Product Categorization

```gql
-- Discover product categories from purchase patterns
MATCH (p:Product)
SET p.category_cluster = ID(p);

-- Products purchased together form categories
MATCH (p1:Product)<-[:PURCHASED]-(c:Customer)-[:PURCHASED]->(p2:Product)
WHERE ID(p1) < ID(p2)
WITH p1, p2, COUNT(c) AS co_purchases
WHERE co_purchases > 5
MERGE (p1)-[:RELATED {strength: co_purchases}]-(p2);

-- Apply label propagation
MATCH (p:Product)-[r:RELATED]-(other:Product)
WITH p, other.category_cluster AS cluster, SUM(r.strength) AS total_strength
ORDER BY total_strength DESC
WITH p, COLLECT(cluster)[0] AS strongest_cluster
SET p.category_cluster = strongest_cluster;
```

### Knowledge Graph Clustering

```gql
-- Cluster entities by semantic relationships
MATCH (e:Entity)
SET e.topic_cluster = ID(e);

MATCH (e1:Entity)-[:RELATED_TO]-(e2:Entity)
WITH e1, e2.topic_cluster AS cluster, COUNT(*) AS relations
ORDER BY relations DESC
WITH e1, COLLECT(cluster)[0] AS primary_cluster
SET e1.topic_cluster = primary_cluster;

-- Identify cluster topics
MATCH (e:Entity)
WHERE e.topic_cluster IS NOT NULL
WITH e.topic_cluster AS cluster_id,
     COLLECT(e.type) AS entity_types
RETURN cluster_id,
       SIZE(entity_types) AS cluster_size,
       [type IN entity_types | type][..5] AS sample_types;
```

## Performance Optimization

### Batch Processing

```gql
-- Process large graphs in batches
MATCH (n:Node)
WHERE ID(n) % 100 < 10  -- Process 10% at a time
WITH n
CALL {
    WITH n
    MATCH (n)-[:CONNECTED]-(neighbor:Node)
    WITH n, neighbor.community AS label, COUNT(*) AS freq
    ORDER BY freq DESC LIMIT 1
    SET n.community_temp = label
} IN TRANSACTIONS OF 10000 ROWS;
```

### Convergence Detection

```gql
-- Check if communities have stabilized
MATCH (n:Node)
WITH SUM(CASE WHEN n.community = n.community_old THEN 0 ELSE 1 END) AS changes,
     COUNT(n) AS total
RETURN changes,
       total,
       (changes * 100.0 / total) AS change_percentage,
       CASE
           WHEN changes * 100.0 / total < 1.0 THEN 'CONVERGED'
           ELSE 'CONTINUE'
       END AS status;
```

### Parallel Community Assignment

```gql
-- Assign communities in parallel for independent subgraphs
MATCH (n:Node)
WHERE n.partition = 'A'  -- Process partition A
WITH n
CALL {
    WITH n
    -- Community detection logic for partition A
} IN TRANSACTIONS;

MATCH (n:Node)
WHERE n.partition = 'B'  -- Process partition B in parallel
WITH n
CALL {
    WITH n
    -- Community detection logic for partition B
} IN TRANSACTIONS;
```

## Best Practices

### Algorithm Selection

**Label Propagation**: Use for large graphs (millions of nodes) when speed is critical and approximate results are acceptable.

**Connected Components**: Apply when looking for completely disconnected subgraphs or network islands.

**Modularity Optimization**: Choose for high-quality communities when computation time is less critical.

**Louvain Method**: Best for hierarchical community structure and balanced speed/quality tradeoff.

### Parameter Tuning

**Iteration Limit**: Set maximum iterations (typically 10-50) to prevent infinite loops in label propagation.

**Weight Thresholds**: Filter weak edges before community detection to improve result quality and performance.

**Resolution Parameter**: Adjust modularity resolution to control community granularity (higher values create smaller communities).

### Quality Validation

```gql
-- Measure community quality metrics
MATCH (n:Node)
WITH n.community AS comm,
     COUNT(n) AS size,
     SUM(COUNT { (n)-[:CONNECTED]-(:Node {community: comm}) }) AS internal_edges,
     SUM(COUNT { (n)-[:CONNECTED]-(:Node) WHERE NOT :Node {community: comm} }) AS external_edges
RETURN comm,
       size,
       internal_edges,
       external_edges,
       internal_edges * 1.0 / (internal_edges + external_edges) AS density_ratio
ORDER BY density_ratio DESC;
```

## Integration Examples

### Python Client

```python
from geode_client import GeodeClient

async def detect_communities(client, max_iterations=20):
    # Initialize labels
    await client.execute("""
        MATCH (n:User)
        SET n.community = ID(n)
    """)

    # Iterative label propagation
    for iteration in range(max_iterations):
        result = await client.execute("""
            MATCH (n:User)-[:KNOWS]-(neighbor:User)
            WITH n, neighbor.community AS label, COUNT(*) AS freq
            ORDER BY freq DESC
            WITH n, COLLECT(label)[0] AS new_label
            SET n.community_new = new_label
            WITH SUM(CASE WHEN n.community = n.community_new THEN 0 ELSE 1 END) AS changes
            RETURN changes
        """)

        await client.execute("MATCH (n:User) SET n.community = n.community_new REMOVE n.community_new")

        changes = result.rows[0][0]
        if changes == 0:
            print(f"Converged after {iteration + 1} iterations")
            break

    # Get community statistics
    communities = await client.execute("""
        MATCH (n:User)
        RETURN n.community AS id,
               COUNT(n) AS size,
               COLLECT(n.username)[..10] AS sample_members
        ORDER BY size DESC
    """)

    return communities.rows
```

### Rust Client

```rust
use geode_client::Client;

async fn label_propagation(client: &Client, iterations: usize) -> Result<Vec<Community>> {
    // Initialize
    client.execute("MATCH (n:User) SET n.community = ID(n)").await?;

    // Propagate labels
    for i in 0..iterations {
        let changes = client.execute(
            "MATCH (n:User)-[:KNOWS]-(neighbor:User) \
             WITH n, neighbor.community AS label, COUNT(*) AS freq \
             ORDER BY freq DESC \
             WITH n, COLLECT(label)[0] AS new_label \
             SET n.community_new = new_label \
             WITH SUM(CASE WHEN n.community = n.community_new THEN 0 ELSE 1 END) AS changes \
             RETURN changes"
        ).await?;

        client.execute("MATCH (n:User) SET n.community = n.community_new REMOVE n.community_new").await?;

        if changes.get_int(0, 0)? == 0 {
            println!("Converged at iteration {}", i);
            break;
        }
    }

    // Extract communities
    let results = client.execute(
        "MATCH (n:User) \
         RETURN n.community, COUNT(n) AS size \
         ORDER BY size DESC"
    ).await?;

    Ok(results.into_communities())
}
```

## Related Topics

- **Graph Algorithms**: See graph-algorithms tag for algorithm implementations
- **PageRank**: Use pagerank for node importance within communities
- **Pattern Matching**: Check patterns tag for community traversal queries
- **Analytics**: Explore analytics tag for community analysis techniques
