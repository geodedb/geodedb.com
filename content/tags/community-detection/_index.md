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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

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
from geode_client import Client

async def detect_communities(client, max_iterations=20):
    # Initialize labels
    await client.execute("""
        MATCH (n:User)
        SET n.community = ID(n)
    """)

    # Iterative label propagation
    for iteration in range(max_iterations):
        result, _ = await client.query("""
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
    communities, _ = await client.query("""
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

## Multi-Level Community Detection

### Hierarchical Leiden Algorithm

Improved version of Louvain with guaranteed well-connected communities:

```gql
-- Phase 1: Local moving with refinement
MATCH (n:Node)
SET n.community = ID(n);

// Move nodes to improve modularity
MATCH (n:Node)-[:CONNECTED]-(neighbor:Node)
WITH n, neighbor.community AS comm, COUNT(*) AS edge_count
ORDER BY edge_count DESC
WITH n, COLLECT(comm)[0] AS best_community
SET n.community = best_community;

-- Phase 2: Refinement (merge poorly connected nodes)
MATCH (n:Node)
WHERE n.community IS NOT NULL
CALL {
    WITH n
    MATCH (n)-[:CONNECTED]-(internal:Node {community: n.community})
    WITH n, COUNT(internal) AS internal_degree
    MATCH (n)-[:CONNECTED]-(external:Node)
    WHERE external.community <> n.community
    WITH n, internal_degree, COUNT(external) AS external_degree
    WHERE internal_degree < external_degree
    SET n.needs_refinement = true
} IN TRANSACTIONS;

-- Phase 3: Aggregate graph
MATCH (n:Node)
WITH n.community AS comm_id,
     COLLECT(n) AS members,
     SUM(SIZE((n)-[:CONNECTED]-())) AS total_degree
CREATE (super:SuperNode {
    id: comm_id,
    size: SIZE(members),
    total_degree: total_degree
});

MATCH (n1:Node)-[r:CONNECTED]-(n2:Node)
WHERE n1.community <> n2.community
WITH n1.community AS c1, n2.community AS c2, COUNT(r) AS weight
MATCH (s1:SuperNode {id: c1}), (s2:SuperNode {id: c2})
CREATE (s1)-[:CONNECTED {weight: weight}]->(s2);
```

**Improvements over Louvain**:

- Guarantees connectivity within communities
- Better quality on large graphs
- Faster convergence

### Overlapping Community Detection (SLPA)

Speaker-Listener Label Propagation Algorithm allows nodes in multiple communities:

```gql
-- Initialize: Each node remembers labels it hears
MATCH (n:Node)
SET n.memory = [ID(n)];

-- Iterations: Listen, speak, update
MATCH (n:Node)-[:CONNECTED]-(neighbor:Node)
WITH n, neighbor.memory AS neighbor_labels
WITH n, null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS label_counts
WITH n, label_counts,
     [label IN keys(label_counts) ORDER BY label_counts[label] DESC][0] AS most_heard
SET n.memory = n.memory + [most_heard];

-- Post-processing: Extract communities
MATCH (n:Node)
WITH n, null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS label_frequency
WITH n, [label IN keys(label_frequency)
         WHERE label_frequency[label] > SIZE(n.memory) * 0.2] AS communities
SET n.communities = communities;

-- Query overlapping memberships
MATCH (n:Node)
WHERE SIZE(n.communities) > 1
RETURN n.id,
       n.communities,
       SIZE(n.communities) AS community_count
ORDER BY community_count DESC;
```

**Use cases**: Social networks (people in multiple friend groups), protein complexes, topic categorization

## Advanced Quality Metrics

### Modularity Calculation

Measure community quality:

```gql
-- Compute modularity Q
MATCH ()-[r:CONNECTED]-()
WITH COUNT(r) / 2.0 AS m

MATCH (n:Node)
WITH m, n.community AS comm,
     SUM(SIZE((n)-[:CONNECTED]-())) AS k_sum

MATCH (n1:Node)-[r:CONNECTED]-(n2:Node)
WHERE n1.community = n2.community
WITH m, comm, k_sum, COUNT(r) / 2.0 AS e_in

RETURN SUM(e_in / m - (k_sum / (2 * m)) ^ 2) AS modularity;
```

**Modularity Q**:

- Q > 0.3: Significant community structure
- Q > 0.7: Strong communities
- Q ≈ 0: Random structure

### Conductance (Community Separability)

Measure how well-separated communities are:

```gql
-- Conductance: ratio of external to total edges
MATCH (n:Node {community: $community_id})
WITH COLLECT(n) AS community_nodes

MATCH (internal:Node)-[r_internal:CONNECTED]-(other:Node)
WHERE internal IN community_nodes AND other IN community_nodes
WITH community_nodes, COUNT(r_internal) AS internal_edges

MATCH (boundary:Node)-[r_boundary:CONNECTED]-(external:Node)
WHERE boundary IN community_nodes AND NOT external IN community_nodes
WITH internal_edges, COUNT(r_boundary) AS boundary_edges

RETURN boundary_edges * 1.0 / (internal_edges + boundary_edges) AS conductance;
```

**Conductance φ**:

- φ < 0.2: Well-separated community
- φ > 0.5: Poorly defined boundary

### Clustering Coefficient Distribution

Analyze local vs global structure:

```gql
-- Local clustering coefficient
MATCH (n:Node)-[:CONNECTED]-(neighbor:Node)
WITH n, COLLECT(DISTINCT neighbor) AS neighbors,
     SIZE((n)-[:CONNECTED]-()) AS degree
WHERE degree >= 2

UNWIND neighbors AS n1
UNWIND neighbors AS n2
MATCH (n1)-[r:CONNECTED]-(n2)
WHERE n1 < n2
WITH n, degree, COUNT(DISTINCT r) AS connected_pairs
RETURN n.id,
       connected_pairs * 2.0 / (degree * (degree - 1)) AS clustering_coefficient,
       degree;

-- Average clustering by community
MATCH (n:Node)
WITH n.community AS comm,
     AVG(n.clustering_coefficient) AS avg_clustering,
     COUNT(n) AS size
RETURN comm, avg_clustering, size
ORDER BY avg_clustering DESC;
```

## Real-World Applications

### Social Network Analysis

Detect friend groups and influential communities:

```gql
-- Identify cohesive friend groups
MATCH (u:User)
SET u.friend_group = ID(u);

MATCH (u:User)-[f:FRIENDS_WITH]-(friend:User)
WITH u, friend.friend_group AS group, COUNT(*) AS mutual_connections
ORDER BY mutual_connections DESC
WITH u, COLLECT(group)[0] AS primary_group
SET u.friend_group = primary_group;

-- Find community influencers
MATCH (influencer:User)
WITH influencer.friend_group AS group,
     influencer,
     SIZE((influencer)-[:FRIENDS_WITH]-(:User {friend_group: group})) AS internal_connections,
     SIZE((influencer)-[:FRIENDS_WITH]-(:User)) AS total_connections
WHERE internal_connections * 1.0 / total_connections > 0.7
MATCH (influencer)<-[:FOLLOWS]-(follower:User)
WHERE follower.friend_group = group
WITH group, influencer,
     COUNT(follower) AS group_followers
ORDER BY group_followers DESC
RETURN group,
       influencer.username,
       group_followers,
       'Community Influencer' AS role;
```

### Customer Segmentation

Group customers by purchase behavior:

```gql
-- Product-based customer clustering
MATCH (c:Customer)-[:PURCHASED]->(p:Product)
WITH c, COLLECT(p.category) AS purchase_categories
SET c.category_vector = purchase_categories;

MATCH (c1:Customer)-[:PURCHASED]->(common:Product)<-[:PURCHASED]-(c2:Customer)
WHERE ID(c1) < ID(c2)
WITH c1, c2, COUNT(DISTINCT common) AS common_purchases
WHERE common_purchases >= 5
MERGE (c1)-[:SIMILAR_CUSTOMER {similarity: common_purchases}]-(c2);

-- Label propagation for segments
MATCH (c:Customer)
SET c.segment = ID(c);

MATCH (c:Customer)-[s:SIMILAR_CUSTOMER]-(other:Customer)
WITH c, other.segment AS segment, SUM(s.similarity) AS total_similarity
ORDER BY total_similarity DESC
WITH c, COLLECT(segment)[0] AS dominant_segment
SET c.segment = dominant_segment;

-- Analyze segment characteristics
MATCH (c:Customer)
WITH c.segment AS segment,
     AVG(c.lifetime_value) AS avg_ltv,
     AVG(c.purchase_frequency) AS avg_frequency,
     COUNT(c) AS segment_size
RETURN segment, avg_ltv, avg_frequency, segment_size
ORDER BY avg_ltv DESC;
```

### Network Infrastructure Analysis

Detect network clusters and failure domains:

```gql
-- Identify network zones
MATCH (node:NetworkNode)
SET node.zone = ID(node);

MATCH (n1:NetworkNode)-[link:CONNECTED]-(n2:NetworkNode)
WHERE link.latency_ms < 10  // Low latency = same zone
WITH n1, n2.zone AS candidate_zone, COUNT(*) AS connections
ORDER BY connections DESC
WITH n1, COLLECT(candidate_zone)[0] AS primary_zone
SET n1.zone = primary_zone;

-- Find critical inter-zone links
MATCH (n1:NetworkNode)-[link:CONNECTED]-(n2:NetworkNode)
WHERE n1.zone <> n2.zone
WITH n1.zone AS zone1, n2.zone AS zone2,
     COUNT(link) AS interconnect_count,
     MIN(link.bandwidth_gbps) AS min_bandwidth
WHERE interconnect_count < 3  // Potential bottleneck
RETURN zone1, zone2, interconnect_count, min_bandwidth,
       'CRITICAL_LINK' AS alert_level;
```

## Performance Tuning

### Algorithm Complexity Analysis

**Label Propagation**:

- Time: O(k × E) where k = iterations (typically 10-50)
- Space: O(V) for label storage
- Parallelizable: Yes (synchronous updates)

**Louvain Method**:

- Time: O(V × log V) expected
- Space: O(V + E)
- Levels: Typically 3-5 for real networks

**Connected Components**:

- Time: O(V + E) with Union-Find
- Space: O(V)
- Parallelizable: Yes (with caution)

### Large-Scale Optimization

```gql
-- Distributed label propagation
MATCH (n:Node)
WITH n, ID(n) % $num_partitions AS partition
CALL {
    WITH n, partition
    MATCH (n)-[:CONNECTED]-(neighbor:Node)
    WITH n, neighbor.community AS label, COUNT(*) AS freq
    ORDER BY freq DESC
    LIMIT 1
    SET n.community_new = label
} IN TRANSACTIONS OF 100000 ROWS
PER PARTITION (partition);

-- Approximate community detection for billion-node graphs
WITH 0.01 AS sample_rate  // Sample 1% of nodes
MATCH (n:Node)
WHERE rand() < sample_rate
SET n.sampled = true;

// Detect communities on sample
MATCH (s:Node {sampled: true})-[:CONNECTED*1..2]-(neighbor:Node {sampled: true})
// Run standard algorithm on sample...

// Propagate to full graph
MATCH (full:Node)
WHERE full.sampled IS NULL
MATCH (full)-[:CONNECTED]-(sampled:Node {sampled: true})
WITH full, sampled.community AS comm, COUNT(*) AS connections
ORDER BY connections DESC
LIMIT 1
SET full.community = comm;
```

## Validation and Quality Assurance

### Ground Truth Comparison

```gql
-- Compare detected communities to known structure
MATCH (n:Node)
WHERE n.true_community IS NOT NULL
  AND n.detected_community IS NOT NULL
WITH n.true_community AS true_comm,
     n.detected_community AS detected_comm,
     COUNT(n) AS overlap
WITH true_comm, detected_comm,
     MAX(overlap) AS max_overlap
WITH SUM(max_overlap) AS total_correct,
     COUNT { MATCH (n:Node) } AS total_nodes
RETURN total_correct * 1.0 / total_nodes AS accuracy;

-- Adjusted Rand Index (ARI)
// Measures agreement between two partitions
// ARI = 1: Perfect agreement
// ARI = 0: Random agreement
// ARI < 0: Less than random
```

### Stability Analysis

```gql
-- Test community stability across algorithm runs
MATCH (n:Node)
SET n.run1_community = n.community;

// Re-run algorithm with slight perturbation...

MATCH (n:Node)
WITH COUNT(CASE WHEN n.run1_community = n.run2_community THEN 1 END) AS stable,
     COUNT(n) AS total
RETURN stable * 100.0 / total AS stability_percent;
```

## Related Topics

- **Graph Algorithms**: See graph-algorithms tag for algorithm implementations
- **PageRank**: Use pagerank for node importance within communities
- **Pattern Matching**: Check patterns tag for community traversal queries
- **Analytics**: Explore analytics tag for community analysis techniques
- **Clustering**: Explore clustering techniques and quality metrics
- **Network Analysis**: Social network analysis and influence detection
- **Graph Partitioning**: Balanced graph cuts and partitioning algorithms

## Further Reading

- **Community Detection Algorithms**: Comparative Analysis and Benchmarks
- **Modularity Optimization**: Theory and Practice
- **Overlapping Communities**: Detection and Interpretation
- **Hierarchical Clustering**: Multi-Scale Community Structure
- **Large-Scale Community Detection**: Distributed and Streaming Algorithms
- **Quality Metrics**: Modularity, Conductance, and NMI
- **Applications**: Social Networks, Biology, and Infrastructure

Browse the tagged content below to discover documentation, tutorials, and guides for implementing community detection in your Geode applications.
