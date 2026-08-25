---
title: "Graph Analytics Algorithms"
description: "Implement graph analytics in Geode with centrality measures, community detection, path analysis, similarity algorithms, and network metrics. Learn PageRank, betweenness centrality, clustering coefficients, and more."
keywords:
  - graph analytics
  - graph algorithms
  - centrality
  - PageRank
  - community detection
  - network analysis
  - betweenness centrality
  - clustering coefficient
  - shortest path
  - graph metrics
  - Geode
  - GQL
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/graph-analytics/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Graph Analytics Algorithms in Geode

Graph analytics enables you to extract insights from the structure and patterns of connected data. Unlike traditional analytics that focus on individual records, graph analytics leverages relationships to uncover hidden patterns, identify influential nodes, detect communities, and measure network properties.

Geode provides powerful graph traversal capabilities through GQL, enabling implementation of classic graph algorithms directly in your queries. This guide covers centrality measures, community detection, path analysis, similarity metrics, and practical applications.

## Centrality Algorithms

Centrality algorithms identify the most important or influential nodes in a graph based on their position and connections.

### Degree Centrality

The simplest centrality measure counts the number of connections a node has.

```gql
-- Calculate in-degree (incoming connections)
MATCH (n:User)
OPTIONAL MATCH (n)<-[r:FOLLOWS]-()
WITH n, COUNT(r) AS in_degree
RETURN n.name, in_degree
ORDER BY in_degree DESC
LIMIT 20;

-- Calculate out-degree (outgoing connections)
MATCH (n:User)
OPTIONAL MATCH (n)-[r:FOLLOWS]->()
WITH n, COUNT(r) AS out_degree
RETURN n.name, out_degree
ORDER BY out_degree DESC;

-- Total degree (both directions)
MATCH (n:User)
OPTIONAL MATCH (n)-[r:FOLLOWS]-()
WITH n, COUNT(r) AS total_degree
RETURN n.name, total_degree
ORDER BY total_degree DESC;

-- Store degree centrality on nodes
MATCH (n:User)
SET n.in_degree = COUNT { (n)<-[:FOLLOWS]-() },
    n.out_degree = COUNT { (n)-[:FOLLOWS]->() };
```

### PageRank

PageRank measures node importance based on the quality and quantity of incoming links.

```gql
-- Initialize PageRank scores
MATCH (n:Page)
WITH COUNT(n) AS total_nodes
MATCH (n:Page)
SET n.pagerank = 1.0 / total_nodes;

-- Iterative PageRank calculation (run 20+ times)
MATCH (source:Page)-[:LINKS_TO]->(target:Page)
WITH target,
     SUM(source.pagerank / COUNT { (source)-[:LINKS_TO]->() }) AS rank_contribution
SET target.pagerank_new = 0.15 + 0.85 * rank_contribution;

-- Apply updates
MATCH (n:Page)
SET n.pagerank = COALESCE(n.pagerank_new, 0.15),
    n.pagerank_new = null;

-- Get top-ranked pages
MATCH (p:Page)
RETURN p.url, p.title, p.pagerank
ORDER BY p.pagerank DESC
LIMIT 25;
```

### Betweenness Centrality

Betweenness centrality measures how often a node lies on the shortest path between other nodes.

```gql
-- Simplified betweenness (for small graphs)
-- Count paths through each node
MATCH (source:Person), (target:Person)
WHERE source <> target
MATCH path = shortestPath((source)-[:KNOWS*..10]->(target))
UNWIND nodes(path) AS intermediate
WHERE intermediate <> source AND intermediate <> target
WITH intermediate, COUNT(*) AS path_count
RETURN intermediate.name,
       path_count AS betweenness_score
ORDER BY betweenness_score DESC;

-- Approximate betweenness using sampling
MATCH (sample:Person)
WHERE rand() < 0.1  -- Sample 10% of nodes
WITH COLLECT(sample) AS sources
UNWIND sources AS source
MATCH (target:Person)
WHERE source <> target AND rand() < 0.1
MATCH path = shortestPath((source)-[:KNOWS*..6]->(target))
UNWIND nodes(path) AS intermediate
WHERE intermediate <> source AND intermediate <> target
WITH intermediate, COUNT(*) AS sampled_paths
RETURN intermediate.name,
       sampled_paths * 100 AS estimated_betweenness  -- Scale up
ORDER BY estimated_betweenness DESC
LIMIT 20;
```

### Closeness Centrality

Closeness centrality measures how close a node is to all other nodes in the network.

```gql
-- Calculate average shortest path length from each node
MATCH (n:Person)
MATCH (other:Person)
WHERE n <> other
MATCH path = shortestPath((n)-[:KNOWS*..10]->(other))
WITH n, AVG(length(path)) AS avg_distance
SET n.closeness = 1.0 / avg_distance;

-- Query closeness rankings
MATCH (p:Person)
WHERE p.closeness IS NOT NULL
RETURN p.name, p.closeness
ORDER BY p.closeness DESC
LIMIT 20;

-- Harmonic closeness (handles disconnected graphs)
MATCH (n:Person)
MATCH (other:Person)
WHERE n <> other
OPTIONAL MATCH path = shortestPath((n)-[:KNOWS*..10]->(other))
WITH n,
     SUM(CASE WHEN path IS NOT NULL
              THEN 1.0 / length(path)
              ELSE 0 END) AS harmonic_sum
SET n.harmonic_closeness = harmonic_sum;
```

### Eigenvector Centrality

Eigenvector centrality considers both the number of connections and the importance of connected nodes.

```gql
-- Initialize scores
MATCH (n:User)
SET n.eigenvector = 1.0;

-- Iterative calculation (run until convergence)
MATCH (n:User)<-[:FOLLOWS]-(neighbor:User)
WITH n, SUM(neighbor.eigenvector) AS neighbor_sum
SET n.eigenvector_new = neighbor_sum;

-- Normalize
MATCH (n:User)
WITH SQRT(SUM(n.eigenvector_new * n.eigenvector_new)) AS norm
MATCH (n:User)
SET n.eigenvector = n.eigenvector_new / norm,
    n.eigenvector_new = null;

-- Top nodes by eigenvector centrality
MATCH (u:User)
RETURN u.name, u.eigenvector
ORDER BY u.eigenvector DESC
LIMIT 20;
```

## Community Detection

Community detection algorithms identify groups of densely connected nodes.

### Label Propagation

Nodes adopt the most common label among their neighbors.

```gql
-- Initialize with unique community IDs
MATCH (n:User)
SET n.community = id(n);

-- Propagate labels (run until stable)
MATCH (n:User)-[:KNOWS]-(neighbor:User)
WITH n, neighbor.community AS neighbor_community
WITH n, neighbor_community, COUNT(*) AS frequency
ORDER BY n, frequency DESC
WITH n, COLLECT(neighbor_community)[0] AS dominant_community
SET n.community_new = dominant_community;

-- Apply updates
MATCH (n:User)
SET n.community = n.community_new,
    n.community_new = null;

-- View communities
MATCH (n:User)
RETURN n.community AS community_id,
       COUNT(n) AS member_count,
       COLLECT(n.name) AS members
ORDER BY member_count DESC;
```

### Louvain Modularity

Optimizes modularity by moving nodes between communities.

```gql
-- Initialize: each node in its own community
MATCH (n:User)
SET n.community = id(n);

-- Calculate initial modularity contribution
MATCH (n:User)
WITH n,
     COUNT { (n)-[:KNOWS]-() } AS degree
SET n.degree = degree;

-- Phase 1: Local moving (simplified)
MATCH (n:User)-[:KNOWS]-(neighbor:User)
WHERE n.community <> neighbor.community
WITH n, neighbor.community AS neighbor_comm,
     COUNT(*) AS edges_to_comm
ORDER BY edges_to_comm DESC
WITH n, COLLECT(neighbor_comm)[0] AS best_community
WHERE edges_to_comm > 0
SET n.community = best_community;

-- Count communities and sizes
MATCH (n:User)
RETURN n.community AS community,
       COUNT(n) AS size
ORDER BY size DESC;
```

### Triangle Counting and Clustering Coefficient

Measures how interconnected a node's neighbors are.

```gql
-- Count triangles involving each node
MATCH (a:User)-[:KNOWS]->(b:User)-[:KNOWS]->(c:User)-[:KNOWS]->(a)
WHERE id(a) < id(b) AND id(b) < id(c)
RETURN a.name, COUNT(*) AS triangle_count
ORDER BY triangle_count DESC;

-- Calculate local clustering coefficient
MATCH (n:User)
WITH n, COUNT { (n)-[:KNOWS]-() } AS degree
WHERE degree >= 2
MATCH (n)-[:KNOWS]-(neighbor1:User)
MATCH (n)-[:KNOWS]-(neighbor2:User)
WHERE id(neighbor1) < id(neighbor2)
OPTIONAL MATCH (neighbor1)-[conn:KNOWS]-(neighbor2)
WITH n, degree, COUNT(conn) AS connected_neighbors
WITH n, degree,
     connected_neighbors * 2.0 / (degree * (degree - 1)) AS clustering_coef
SET n.clustering_coefficient = clustering_coef;

-- Global clustering coefficient
MATCH (a:User)-[:KNOWS]->(b:User)-[:KNOWS]->(c:User)
WHERE a <> c
WITH COUNT(*) AS paths_of_2
MATCH (a:User)-[:KNOWS]->(b:User)-[:KNOWS]->(c:User)-[:KNOWS]->(a)
WHERE id(a) < id(b) AND id(b) < id(c)
WITH paths_of_2, COUNT(*) * 6 AS triangles
RETURN triangles * 1.0 / paths_of_2 AS global_clustering;
```

## Path Analysis

### Shortest Path

Find the shortest path between nodes.

```gql
-- Single shortest path
MATCH path = shortestPath(
    (start:User {name: 'Alice'})-[:KNOWS*..10]->(end:User {name: 'Bob'})
)
RETURN [n IN nodes(path) | n.name] AS path,
       length(path) AS distance;

-- All shortest paths (same length)
MATCH path = allShortestPaths(
    (start:User {name: 'Alice'})-[:KNOWS*..10]->(end:User {name: 'Bob'})
)
RETURN [n IN nodes(path) | n.name] AS path;

-- Weighted shortest path
MATCH path = shortestPath(
    (start:City {name: 'Austin'})-[:ROAD*..20]->(end:City {name: 'Seattle'})
)
WITH path, null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS total_distance
RETURN [n IN nodes(path) | n.name] AS route,
       total_distance
ORDER BY total_distance
LIMIT 1;
```

### Path Finding with Constraints

```gql
-- Find paths avoiding certain nodes
MATCH path = (start:User {name: 'Alice'})-[:KNOWS*2..5]->(end:User {name: 'Charlie'})
WHERE NONE(n IN nodes(path) WHERE n.name = 'Eve')
RETURN [n IN nodes(path) | n.name] AS path
LIMIT 10;

-- Find paths through specific intermediate nodes
MATCH (start:User {name: 'Alice'})
MATCH (waypoint:User {name: 'Bob'})
MATCH (end:User {name: 'Charlie'})
MATCH path1 = shortestPath((start)-[:KNOWS*..5]->(waypoint))
MATCH path2 = shortestPath((waypoint)-[:KNOWS*..5]->(end))
RETURN [n IN nodes(path1) | n.name] + [n IN nodes(path2)[1..] | n.name] AS full_path;

-- Find paths with property constraints
MATCH path = (start:User {name: 'Alice'})-[:KNOWS*2..4]->(end:User)
WHERE ALL(r IN relationships(path) WHERE r.trust_level > 0.5)
RETURN end.name, length(path) AS distance;
```

### K-Hop Neighbors

```gql
-- Find all users within k hops
MATCH (start:User {name: 'Alice'})-[:KNOWS*1..3]->(neighbor:User)
WHERE neighbor <> start
RETURN DISTINCT neighbor.name,
       MIN(length(path)) AS min_distance;

-- Count neighbors at each distance
MATCH (start:User {name: 'Alice'})
UNWIND range(1, 5) AS distance
OPTIONAL MATCH path = (start)-[:KNOWS*]->(neighbor)
WHERE length(path) = distance AND neighbor <> start
WITH distance, COUNT(DISTINCT neighbor) AS neighbors_at_distance
RETURN distance, neighbors_at_distance;
```

## Similarity Metrics

### Jaccard Similarity

Measures overlap between neighborhoods.

```gql
-- Jaccard similarity between two users
MATCH (u1:User {name: 'Alice'})-[:KNOWS]->(friend1:User)
MATCH (u2:User {name: 'Bob'})-[:KNOWS]->(friend2:User)
WITH u1, u2,
     COLLECT(DISTINCT friend1) AS friends1,
     COLLECT(DISTINCT friend2) AS friends2
WITH u1, u2,
     SIZE([f IN friends1 WHERE f IN friends2]) AS intersection,
     SIZE(friends1) + SIZE(friends2) AS union_size
RETURN u1.name, u2.name,
       intersection * 1.0 / (union_size - intersection) AS jaccard_similarity;

-- Find similar users to a given user
MATCH (target:User {name: 'Alice'})-[:KNOWS]->(target_friend:User)
WITH target, COLLECT(DISTINCT target_friend) AS target_friends
MATCH (other:User)-[:KNOWS]->(other_friend:User)
WHERE other <> target
WITH target, target_friends, other, COLLECT(DISTINCT other_friend) AS other_friends
WITH target, other,
     SIZE([f IN target_friends WHERE f IN other_friends]) AS shared,
     SIZE(target_friends) AS t_size,
     SIZE(other_friends) AS o_size
WHERE shared > 0
RETURN other.name,
       shared * 1.0 / (t_size + o_size - shared) AS similarity
ORDER BY similarity DESC
LIMIT 10;
```

### Cosine Similarity

For weighted relationships or feature vectors.

```gql
-- Cosine similarity based on common interests
MATCH (u1:User {name: 'Alice'})-[r1:INTERESTED_IN]->(topic:Topic)
MATCH (u2:User {name: 'Bob'})-[r2:INTERESTED_IN]->(topic)
WITH u1, u2,
     SUM(r1.weight * r2.weight) AS dot_product
MATCH (u1)-[r:INTERESTED_IN]->()
WITH u1, u2, dot_product, SQRT(SUM(r.weight * r.weight)) AS norm1
MATCH (u2)-[r:INTERESTED_IN]->()
WITH u1, u2, dot_product, norm1, SQRT(SUM(r.weight * r.weight)) AS norm2
RETURN u1.name, u2.name,
       dot_product / (norm1 * norm2) AS cosine_similarity;
```

### Adamic-Adar Index

Weights common neighbors by their rarity.

```gql
-- Adamic-Adar similarity
MATCH (u1:User {name: 'Alice'})-[:KNOWS]->(common:User)<-[:KNOWS]-(u2:User {name: 'Bob'})
WITH u1, u2, common, COUNT { (common)-[:KNOWS]-() } AS common_degree
WHERE common_degree > 1
RETURN u1.name, u2.name,
       SUM(1.0 / log(common_degree)) AS adamic_adar_score;

-- Link prediction using Adamic-Adar
MATCH (u:User {name: 'Alice'})-[:KNOWS]->(common:User)<-[:KNOWS]-(candidate:User)
WHERE NOT (u)-[:KNOWS]-(candidate)
  AND u <> candidate
WITH u, candidate, common, COUNT { (common)-[:KNOWS]-() } AS common_degree
WHERE common_degree > 1
WITH u, candidate, SUM(1.0 / log(common_degree)) AS score
RETURN candidate.name, score
ORDER BY score DESC
LIMIT 10;
```

## Network Metrics

### Graph Density

```gql
-- Calculate graph density
MATCH (n:User)
WITH COUNT(n) AS node_count
MATCH ()-[r:KNOWS]->()
WITH node_count, COUNT(r) AS edge_count
RETURN edge_count * 1.0 / (node_count * (node_count - 1)) AS density;

-- Density for undirected interpretation
MATCH (n:User)
WITH COUNT(n) AS node_count
MATCH ()-[r:KNOWS]-()
WITH node_count, COUNT(r) / 2 AS edge_count
RETURN edge_count * 2.0 / (node_count * (node_count - 1)) AS undirected_density;
```

### Diameter and Radius

```gql
-- Approximate diameter (longest shortest path)
MATCH (n:User)
WHERE rand() < 0.1  -- Sample nodes
WITH COLLECT(n) AS samples
UNWIND samples AS source
UNWIND samples AS target
WHERE source <> target
MATCH path = shortestPath((source)-[:KNOWS*..20]->(target))
WITH MAX(length(path)) AS diameter
RETURN diameter;

-- Eccentricity of specific node
MATCH (center:User {name: 'Alice'})
MATCH (other:User)
WHERE center <> other
MATCH path = shortestPath((center)-[:KNOWS*..20]->(other))
WITH MAX(length(path)) AS eccentricity
RETURN eccentricity;
```

### Connected Components

```gql
-- Find weakly connected components
MATCH (n:User)
SET n.component = id(n);

-- Propagate minimum ID (repeat until stable)
MATCH (n:User)-[:KNOWS]-(neighbor:User)
WITH n, MIN(neighbor.component) AS min_neighbor_component
WHERE min_neighbor_component < n.component
SET n.component = min_neighbor_component;

-- Count components
MATCH (n:User)
RETURN n.component AS component,
       COUNT(n) AS size
ORDER BY size DESC;

-- Find nodes in largest component
MATCH (n:User)
WITH n.component AS comp, COUNT(n) AS size
ORDER BY size DESC
LIMIT 1
MATCH (member:User {component: comp})
RETURN member.name;
```

## Practical Applications

### Fraud Detection

```gql
-- Identify suspicious transaction clusters
MATCH (a:Account)-[t:TRANSFERRED]->(b:Account)
WHERE t.amount > 10000
  AND t.timestamp >= datetime() - DURATION 'P7D'
WITH a, b, SUM(t.amount) AS total_transferred
WHERE total_transferred > 50000
MATCH path = (a)-[:TRANSFERRED*1..3]->(c:Account)
WITH COLLECT(DISTINCT a) + COLLECT(DISTINCT b) + COLLECT(DISTINCT c) AS suspects
UNWIND suspects AS suspect
RETURN DISTINCT suspect.account_number,
       suspect.holder_name,
       COUNT { (suspect)-[:TRANSFERRED]-() } AS transaction_count;

-- Ring detection
MATCH path = (a:Account)-[:TRANSFERRED*3..6]->(a)
WHERE ALL(t IN relationships(path) WHERE t.amount > 5000)
RETURN [n IN nodes(path) | n.account_number] AS ring,
       null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS ring_volume;
```

### Recommendation Engine

```gql
-- Collaborative filtering: users who liked similar items
MATCH (target:User {id: $user_id})-[:LIKED]->(item:Product)
MATCH (similar:User)-[:LIKED]->(item)
WHERE similar <> target
WITH similar, COUNT(item) AS shared_likes
ORDER BY shared_likes DESC
LIMIT 50
MATCH (similar)-[:LIKED]->(rec:Product)
WHERE NOT (target)-[:LIKED]->(rec)
RETURN rec.name, rec.id,
       COUNT(similar) AS recommenders,
       AVG(similar.shared_likes) AS avg_similarity
ORDER BY recommenders DESC, avg_similarity DESC
LIMIT 20;

-- Content-based with graph structure
MATCH (target:User {id: $user_id})-[:LIKED]->(liked:Product)
MATCH (liked)-[:IN_CATEGORY]->(cat:Category)
MATCH (rec:Product)-[:IN_CATEGORY]->(cat)
WHERE NOT (target)-[:LIKED]->(rec)
RETURN rec.name,
       COUNT(DISTINCT cat) AS category_matches,
       COLLECT(DISTINCT cat.name) AS matching_categories
ORDER BY category_matches DESC
LIMIT 20;
```

### Influence Analysis

```gql
-- Find influencers in network
MATCH (u:User)
WITH u,
     COUNT { (u)<-[:FOLLOWS]-() } AS followers,
     COUNT { (u)-[:FOLLOWS]->() } AS following
WHERE followers > 0
WITH u, followers, following,
     followers * 1.0 / (following + 1) AS influence_ratio
WHERE influence_ratio > 5
RETURN u.name, followers, following, influence_ratio
ORDER BY followers DESC
LIMIT 50;

-- Measure reach (followers of followers)
MATCH (influencer:User {name: $name})<-[:FOLLOWS]-(follower:User)
OPTIONAL MATCH (follower)<-[:FOLLOWS]-(fof:User)
WITH influencer,
     COUNT(DISTINCT follower) AS direct_reach,
     COUNT(DISTINCT fof) AS indirect_reach
RETURN influencer.name,
       direct_reach,
       indirect_reach,
       direct_reach + indirect_reach AS total_reach;
```

### Supply Chain Analysis

```gql
-- Critical path in supply network
MATCH path = (supplier:Supplier)-[:SUPPLIES*]->(manufacturer:Manufacturer)
WHERE supplier.product = 'Microchip'
  AND manufacturer.name = 'AutoCorp'
WITH path, null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS total_lead_time
RETURN [n IN nodes(path) | n.name] AS supply_chain,
       total_lead_time
ORDER BY total_lead_time;

-- Identify bottlenecks (high betweenness in supply graph)
MATCH (n:Supplier)
SET n.supply_betweenness = 0;

MATCH (source:Supplier), (target:Manufacturer)
MATCH path = shortestPath((source)-[:SUPPLIES*..10]->(target))
UNWIND nodes(path) AS intermediate
WHERE intermediate:Supplier
WITH intermediate, COUNT(*) AS path_count
SET intermediate.supply_betweenness = intermediate.supply_betweenness + path_count;

MATCH (s:Supplier)
RETURN s.name, s.supply_betweenness
ORDER BY s.supply_betweenness DESC
LIMIT 10;
```

## Client Library Examples

### Python Client

```python
from geode_client import Client

async def run_analytics():
    client = Client(host="localhost", port=3141)

    async with client.connection() as conn:
        # Calculate PageRank
        await conn.execute("""
            MATCH (n:Page)
            SET n.pagerank = 1.0 / COUNT { MATCH (p:Page) }
        """)

        # Run 20 iterations
        for i in range(20):
            await conn.execute("""
                MATCH (source:Page)-[:LINKS_TO]->(target:Page)
                WITH target, SUM(source.pagerank / COUNT { (source)-[:LINKS_TO]->() }) AS contribution
                SET target.pagerank_new = 0.15 + 0.85 * contribution
            """)

            await conn.execute("""
                MATCH (n:Page)
                SET n.pagerank = COALESCE(n.pagerank_new, 0.15),
                    n.pagerank_new = null
            """)

        # Get results
        result, _ = await conn.query("""
            MATCH (p:Page)
            RETURN p.url, p.pagerank
            ORDER BY p.pagerank DESC
            LIMIT 20
        """)

        for row in result.rows:
            print(f"{row['p.url']}: {row['p.pagerank']:.4f}")
```

### Rust Client

```rust
use geode_client::{Client, Value};

async fn community_detection(client: &Client) -> Result<(), Box<dyn std::error::Error>> {
    // Initialize communities
    client.execute(
        "MATCH (n:User) SET n.community = id(n)",
        &[],
    ).await?;

    // Run label propagation
    for iteration in 0..10 {
        let changes = client.query(
            r#"
            MATCH (n:User)-[:KNOWS]-(neighbor:User)
            WITH n, neighbor.community AS nc, COUNT(*) AS freq
            ORDER BY n, freq DESC
            WITH n, COLLECT(nc)[0] AS best_community
            WHERE n.community <> best_community
            SET n.community = best_community
            RETURN COUNT(n) AS changes_made
            "#,
            &[],
        ).await?;

        let change_count: i64 = changes.rows()[0].get("changes_made")?;
        println!("Iteration {}: {} changes", iteration, change_count);

        if change_count == 0 {
            break;
        }
    }

    // Get community sizes
    let communities = client.query(
        r#"
        MATCH (n:User)
        RETURN n.community AS community, COUNT(n) AS size
        ORDER BY size DESC
        "#,
        &[],
    ).await?;

    for row in communities.rows() {
        println!("Community {}: {} members",
            row.get::<i64>("community")?,
            row.get::<i64>("size")?
        );
    }

    Ok(())
}
```

## Best Practices

### Performance Optimization

- Index properties used in WHERE clauses
- Use bounded path lengths (`*1..5` instead of `*`)
- Sample large graphs for approximate algorithms
- Pre-compute and store centrality scores
- Use batch updates for iterative algorithms

### Algorithm Selection

- Degree centrality: Simple importance measure
- PageRank: Link-based importance
- Betweenness: Bridge/broker identification
- Closeness: Rapid information spread
- Community detection: Group identification

### Scalability

- For large graphs, use approximate algorithms
- Consider incremental updates instead of full recomputation
- Partition graph for parallel processing
- Cache intermediate results

## Related Topics

- [PageRank](/tags/pagerank/) - PageRank algorithm details
- [Community Detection](/tags/community-detection/) - Clustering algorithms
- [Graph Algorithms](/tags/algorithms/) - General graph algorithms
- [Performance](/tags/performance/) - Query optimization
- [Analytics](/tags/analytics/) - Analytical capabilities
- [Patterns](/tags/patterns/) - Query patterns

## Further Reading

- Graph Algorithm Theory and Applications
- Network Analysis with Graph Databases
- Scalable Graph Analytics
- Centrality Measures Comparison
- Community Detection Algorithms

Browse tagged content for complete graph analytics documentation and examples.
