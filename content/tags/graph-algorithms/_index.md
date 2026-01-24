---
title: "Tag: Graph Algorithms & Analytics"
description: "Explore Geode documentation tagged with graph-algorithms. Learn about graph-algorithms features, best practices, and implementation details."
keywords:
  - graph-algorithms
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/graph-algorithms/"
    noindex: false
---

Graph algorithms unlock powerful analytical capabilities in Geode, enabling you to extract insights from connected data that would be impossible with traditional relational queries. From finding shortest paths and detecting communities to ranking influential nodes and identifying anomalies, graph algorithms are essential tools for modern data science and analytics.

Geode provides optimized implementations of classic and advanced graph algorithms, all accessible through GQL queries. These algorithms leverage Geode's native graph storage and parallel processing capabilities to deliver high performance even on massive graphs with billions of nodes and relationships.

This comprehensive guide explores essential graph algorithms, their use cases, implementation patterns, and optimization strategies for production deployments.

## Pathfinding Algorithms

**Shortest Path (Dijkstra)**:

```gql
-- Find shortest path between two nodes
MATCH path = shortestPath(
  (start:Location {name: 'New York'})-[:ROUTE*]-(end:Location {name: 'Los Angeles'})
)
RETURN path, length(path) as hops;

-- Weighted shortest path
MATCH path = shortestPath(
  (start:Location {name: 'New York'})-[r:ROUTE*]-(end:Location {name: 'Los Angeles'})
)
RETURN path, reduce(dist = 0, rel in relationships(path) | dist + rel.distance) as total_distance;
```

**All Shortest Paths**:

```gql
-- Find all shortest paths (when multiple exist)
MATCH paths = allShortestPaths(
  (a:Person {id: 123})-[:KNOWS*]-(b:Person {id: 456})
)
RETURN paths, length(paths) as path_length;
```

**K-Shortest Paths**:

```gql
-- Find top K shortest paths
MATCH path = (start:City {name: 'Boston'})-[:CONNECTED*1..10]-(end:City {name: 'Seattle'})
WITH path, reduce(cost = 0, r in relationships(path) | cost + r.weight) as total_cost
ORDER BY total_cost
LIMIT 5
RETURN path, total_cost;
```

## Centrality Algorithms

**Degree Centrality**:

```gql
-- Calculate in-degree (followers)
MATCH (u:User)
OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower:User)
RETURN u.name, count(follower) as in_degree
ORDER BY in_degree DESC
LIMIT 10;

-- Out-degree (following)
MATCH (u:User)
OPTIONAL MATCH (u)-[:FOLLOWS]->(following:User)
RETURN u.name, count(following) as out_degree
ORDER BY out_degree DESC;

-- Total degree
MATCH (u:User)
OPTIONAL MATCH (u)-[:KNOWS]-(connected:User)
RETURN u.name, count(DISTINCT connected) as degree
ORDER BY degree DESC;
```

**Betweenness Centrality** (nodes on shortest paths):

```gql
-- Simplified betweenness calculation
MATCH (n:Person)
MATCH path = shortestPath((a:Person)-[:KNOWS*]-(b:Person))
WHERE n IN nodes(path) AND a <> n AND b <> n
WITH n, count(path) as paths_through
RETURN n.name, paths_through
ORDER BY paths_through DESC
LIMIT 10;
```

**Closeness Centrality** (average distance to others):

```gql
-- Measure how close a node is to all others
MATCH (u:User {id: 123})
MATCH path = shortestPath((u)-[:KNOWS*]-(other:User))
WHERE other <> u
WITH u, avg(length(path)) as avg_distance
RETURN u.name, 1.0 / avg_distance as closeness_centrality;
```

## PageRank and Influence

**Basic PageRank Implementation**:

```gql
-- Simplified PageRank-style scoring
MATCH (u:User)<-[:FOLLOWS]-(follower:User)
WITH u, count(follower) as direct_followers
MATCH (follower)<-[:FOLLOWS]-(indirect:User)
RETURN
  u.name,
  direct_followers,
  count(DISTINCT indirect) as indirect_reach,
  direct_followers * 1.0 + count(DISTINCT indirect) * 0.15 as influence_score
ORDER BY influence_score DESC;
```

**Weighted Influence**:

```gql
-- Account for follower quality
MATCH (u:User)<-[f:FOLLOWS]-(follower:User)
OPTIONAL MATCH (follower)<-[:FOLLOWS]-(follower_of_follower:User)
WITH u, follower, count(follower_of_follower) as follower_influence
RETURN
  u.name,
  sum(follower_influence) as weighted_influence
ORDER BY weighted_influence DESC;
```

## Community Detection

**Connected Components**:

```gql
-- Find connected components
MATCH (start:User {id: 123})-[:KNOWS*]-(connected:User)
RETURN collect(DISTINCT connected.id) as community_members,
       count(DISTINCT connected) as community_size;
```

**Triangle Counting** (clustered communities):

```gql
-- Count triangles (A knows B, B knows C, C knows A)
MATCH (a:User)-[:KNOWS]->(b:User)-[:KNOWS]->(c:User)-[:KNOWS]->(a)
RETURN count(*) / 3 as triangle_count;

-- Local clustering coefficient
MATCH (u:User {id: 123})-[:KNOWS]-(neighbor:User)
WITH u, collect(DISTINCT neighbor) as neighbors, count(DISTINCT neighbor) as degree
UNWIND neighbors as n1
UNWIND neighbors as n2
MATCH (n1)-[r:KNOWS]-(n2)
WHERE n1 <> n2
WITH u, degree, count(DISTINCT r) as connected_pairs
RETURN u.name,
       degree,
       connected_pairs * 2.0 / (degree * (degree - 1)) as clustering_coefficient;
```

**Label Propagation** (community discovery):

```gql
-- Simplified label propagation
MATCH (u:User)-[:KNOWS]-(neighbor:User)
WITH u, neighbor.community_id as neighbor_community, count(*) as freq
ORDER BY freq DESC
LIMIT 1
SET u.community_id = neighbor_community
RETURN u.name, u.community_id;
```

## Similarity and Recommendations

**Jaccard Similarity** (common connections):

```gql
-- Find similar users by shared connections
MATCH (u1:User {id: 123})-[:FOLLOWS]->(common:User)<-[:FOLLOWS]-(u2:User)
WHERE u1 <> u2
WITH u1, u2, count(DISTINCT common) as common_count
MATCH (u1)-[:FOLLOWS]->(u1_following:User)
MATCH (u2)-[:FOLLOWS]->(u2_following:User)
WITH u1, u2, common_count,
     count(DISTINCT u1_following) as u1_total,
     count(DISTINCT u2_following) as u2_total
RETURN u2.name,
       common_count * 1.0 / (u1_total + u2_total - common_count) as jaccard_similarity
ORDER BY jaccard_similarity DESC
LIMIT 10;
```

**Collaborative Filtering**:

```gql
-- Recommend products based on similar users' purchases
MATCH (u:User {id: 123})-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(similar:User)
WHERE similar <> u
WITH similar, count(DISTINCT p) as common_purchases
ORDER BY common_purchases DESC
LIMIT 50
MATCH (similar)-[:PURCHASED]->(recommendation:Product)
WHERE NOT EXISTS {(u)-[:PURCHASED]->(recommendation)}
RETURN recommendation.name,
       count(*) as recommendation_score
ORDER BY recommendation_score DESC
LIMIT 10;
```

**Cosine Similarity** (vector-based):

```gql
-- Compare users by behavior vectors
MATCH (u1:User {id: 123})-[r1:RATED]->(item:Product)<-[r2:RATED]-(u2:User)
WHERE u1 <> u2
WITH u1, u2,
     sum(r1.rating * r2.rating) as dot_product,
     sqrt(sum(r1.rating * r1.rating)) as u1_magnitude,
     sqrt(sum(r2.rating * r2.rating)) as u2_magnitude
RETURN u2.name,
       dot_product / (u1_magnitude * u2_magnitude) as cosine_similarity
ORDER BY cosine_similarity DESC;
```

## Graph Traversal Algorithms

**Breadth-First Search (BFS)**:

```gql
-- Explore network level by level
MATCH path = (start:User {id: 123})-[:KNOWS*1..4]-(connected:User)
RETURN connected.name, length(path) as distance
ORDER BY distance, connected.name;
```

**Depth-First Search (DFS)**:

```gql
-- Deep exploration of paths
MATCH path = (start:User {id: 123})-[:FOLLOWS*1..5]->(reached:User)
RETURN DISTINCT reached.name, length(path) as depth
ORDER BY depth DESC, reached.name;
```

**Cycle Detection**:

```gql
-- Find cycles in the graph
MATCH path = (n:Node)-[:CONNECTS*]->(n)
WHERE length(path) > 1
RETURN path, length(path) as cycle_length
ORDER BY cycle_length
LIMIT 10;
```

## Flow and Optimization

**Maximum Flow** (network capacity):

```gql
-- Simplified max flow calculation
MATCH path = (source:Node {id: 'A'})-[r:PIPE*]->(sink:Node {id: 'B'})
WITH path, reduce(flow = 999999, rel in relationships(path) |
  CASE WHEN rel.capacity < flow THEN rel.capacity ELSE flow END
) as path_capacity
RETURN path, path_capacity
ORDER BY path_capacity DESC;
```

**Minimum Spanning Tree**:

```gql
-- Connect all nodes with minimum total edge weight
MATCH (n:Location)
WITH collect(n) as nodes
MATCH path = (a:Location)-[r:ROAD]-(b:Location)
WHERE a IN nodes AND b IN nodes
RETURN path, r.distance as weight
ORDER BY weight;
```

## Anomaly Detection

**Unusual Pattern Detection**:

```gql
-- Find users with anomalous behavior
MATCH (u:User)
OPTIONAL MATCH (u)-[:PURCHASED]->(p:Product)
WITH u, count(p) as purchase_count,
     avg(p.price) as avg_spend
WITH avg(purchase_count) as avg_purchases,
     stddev(purchase_count) as stddev_purchases,
     avg(avg_spend) as global_avg_spend,
     stddev(avg_spend) as stddev_spend
MATCH (u:User)
OPTIONAL MATCH (u)-[:PURCHASED]->(p:Product)
WITH u, count(p) as user_purchases, avg(p.price) as user_avg_spend,
     avg_purchases, stddev_purchases, global_avg_spend, stddev_spend
WHERE abs(user_purchases - avg_purchases) > 3 * stddev_purchases
   OR abs(user_avg_spend - global_avg_spend) > 3 * stddev_spend
RETURN u.name, user_purchases, user_avg_spend;
```

**Fraud Ring Detection**:

```gql
-- Identify tightly connected suspicious accounts
MATCH (suspect:Account {flagged: true})-[:TRANSACTED_WITH*1..2]-(connected:Account)
WITH suspect, collect(DISTINCT connected) as ring_members
WHERE size(ring_members) > 5
MATCH (m1:Account)-[:TRANSACTED_WITH]-(m2:Account)
WHERE m1 IN ring_members AND m2 IN ring_members
RETURN suspect.id, ring_members, count(*) as internal_transactions
ORDER BY internal_transactions DESC;
```

## Graph Metrics and Statistics

**Diameter** (longest shortest path):

```gql
-- Calculate graph diameter
MATCH path = shortestPath((a:Node)-[*]-(b:Node))
WHERE a < b
RETURN max(length(path)) as diameter;
```

**Density** (edge to node ratio):

```gql
-- Calculate graph density
MATCH (n:Node)
WITH count(n) as node_count
MATCH ()-[r:EDGE]-()
RETURN count(r) * 1.0 / (node_count * (node_count - 1)) as density;
```

**Degree Distribution**:

```gql
-- Analyze degree distribution
MATCH (n:Node)
OPTIONAL MATCH (n)-[r]-(m:Node)
WITH n, count(r) as degree
RETURN degree, count(n) as node_count
ORDER BY degree;
```

## Performance Optimization for Algorithms

**Limit Traversal Depth**:

```gql
-- Always bound variable-length patterns
MATCH path = (a)-[*1..6]-(b)  -- Good: bounded
-- MATCH path = (a)-[*]-(b)   -- Bad: unbounded
RETURN path;
```

**Use Early Filtering**:

```gql
-- Filter before expensive traversals
MATCH (start:User)
WHERE start.active = true  -- Filter first
  AND start.country = 'US'
MATCH path = (start)-[:KNOWS*1..3]-(connected:User)
RETURN path;
```

**Leverage Indexes**:

```gql
-- Start with indexed lookups
CREATE INDEX user_id ON :User(id);

MATCH (u:User {id: 123})  -- Uses index
MATCH path = (u)-[:FOLLOWS*1..4]->(reached:User)
RETURN path;
```

**Parallel Processing**:

```gql
-- Break large computations into batches
MATCH (u:User)
WHERE u.id >= 0 AND u.id < 1000  -- Batch 1
WITH u
MATCH (u)-[:KNOWS]-(friend:User)
RETURN u.id, count(friend) as degree;
```

## Use Cases by Industry

**Social Networks**: Influence ranking, friend recommendations, community detection

**Fraud Detection**: Ring identification, anomaly detection, pattern analysis

**Supply Chain**: Shortest paths, bottleneck identification, flow optimization

**Recommendation Engines**: Collaborative filtering, similarity scoring, personalization

**Network Security**: Intrusion path analysis, vulnerability assessment, access patterns

**Biology**: Protein interaction analysis, pathway discovery, disease networks

## Best Practices

1. **Always bound variable-length paths** to prevent explosions
2. **Use appropriate indexes** for algorithm starting points
3. **Consider graph density** when choosing algorithms
4. **Profile algorithm performance** on representative data
5. **Implement incremental updates** for frequently computed metrics
6. **Cache results** for expensive computations
7. **Use sampling** for approximate results on huge graphs
8. **Parallelize** independent computations across nodes
9. **Monitor memory usage** for large traversals
10. **Validate results** on known test cases

## Related Topics

- [Query Patterns](/tags/patterns/)
- [Performance Optimization](/tags/performance/)
- [PageRank Algorithm](/tags/pagerank/)
- [Community Detection](/tags/community-detection/)
- [Pattern Matching](/tags/pattern-matching/)
- [Analytics and ML](/tags/analytics/)

## Further Reading

- Graph Algorithms: Practical Examples
- Network Analysis with GQL
- Scalable Graph Processing
- Machine Learning on Graphs
- Social Network Analysis Techniques