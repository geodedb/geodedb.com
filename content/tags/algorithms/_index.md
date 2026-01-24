---
title: "Graph Algorithms"
description: "Explore graph algorithms in Geode: pathfinding, centrality, community detection, and more. Solve complex network problems with GQL-native implementations."
keywords:
  - graph algorithms
  - pathfinding
  - shortest path
  - centrality
  - community detection
  - PageRank
  - betweenness
  - clustering
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/algorithms/"
    noindex: false
---

Graph algorithms are specialized computational methods designed to analyze and extract insights from graph-structured data. Geode provides both built-in GQL capabilities and extensibility for implementing advanced graph algorithms on your connected data.

## What are Graph Algorithms?

Graph algorithms solve problems inherent to network structures by leveraging the relationships between entities. Unlike traditional table-based computations, graph algorithms excel at:

- **Pathfinding**: Discovering routes and connections between nodes
- **Centrality Analysis**: Identifying influential or important nodes
- **Community Detection**: Finding clusters of related entities
- **Similarity Computation**: Measuring how closely nodes are related
- **Network Flow**: Optimizing resource distribution through networks

These algorithms power applications ranging from social network analysis to logistics optimization, fraud detection, and recommendation systems.

## Algorithm Categories

### Pathfinding Algorithms

#### Shortest Path

Find the shortest path between two nodes:

```gql
// Simple shortest path
MATCH path = SHORTEST (a:Person {name: 'Alice'})-[:KNOWS*]->(b:Person {name: 'Bob'})
RETURN path

// Weighted shortest path with relationship properties
MATCH path = SHORTEST (a:City {name: 'NYC'})-[r:ROAD*]-(b:City {name: 'SF'})
WHERE ALL(rel IN r WHERE rel.distance IS NOT NULL)
RETURN path, REDUCE(total = 0, rel IN r | total + rel.distance) AS total_distance
```

#### All Paths

Enumerate all paths between nodes:

```gql
// Find all paths up to length 5
MATCH path = (start:Node {id: 1})-[*1..5]->(end:Node {id: 100})
RETURN path, LENGTH(path) AS path_length
ORDER BY path_length
```

#### A* Search

Implement heuristic pathfinding with property-based weighting:

```gql
// Weighted path with heuristic
MATCH path = (start:Location)-[r:CONNECTED*]-(goal:Location)
WHERE start.name = 'Start' AND goal.name = 'Goal'
WITH path,
     REDUCE(cost = 0, rel IN r | cost + rel.weight) AS total_cost,
     LENGTH(path) AS hops
ORDER BY total_cost + hops * 10  // A* heuristic: cost + estimated remaining
LIMIT 1
RETURN path, total_cost
```

### Centrality Algorithms

#### Degree Centrality

Count incoming and outgoing relationships:

```gql
// Out-degree centrality (influence)
MATCH (u:User)-[r:FOLLOWS]->()
RETURN u.name, COUNT(r) AS followers
ORDER BY followers DESC
LIMIT 10

// In-degree centrality (popularity)
MATCH (u:User)<-[r:FOLLOWS]-()
RETURN u.name, COUNT(r) AS following
ORDER BY following DESC
LIMIT 10
```

#### Betweenness Centrality

Identify nodes that frequently lie on shortest paths:

```gql
// Nodes that bridge communities
MATCH path = SHORTEST (a:Person)-[:KNOWS*]-(b:Person)
WHERE a.id < b.id  // Avoid duplicates
WITH NODES(path) AS nodes
UNWIND nodes AS node
WITH node, COUNT(*) AS times_on_shortest_path
WHERE times_on_shortest_path > 1
RETURN node.name, times_on_shortest_path
ORDER BY times_on_shortest_path DESC
LIMIT 10
```

#### PageRank

Iterative algorithm for ranking node importance:

```python
# Python implementation using Geode client
from geode_client import GeodeClient

async def pagerank(client, damping=0.85, iterations=20):
    # Initialize PageRank scores
    await client.query("""
        MATCH (n:Page)
        SET n.pagerank = 1.0
    """)

    for i in range(iterations):
        # Update PageRank scores
        result = await client.query("""
            MATCH (source:Page)-[:LINKS]->(target:Page)
            WITH target, source, COUNT(*) AS out_degree
            MATCH (source)-[:LINKS]->()
            WITH target, SUM(source.pagerank / out_degree) AS rank_sum
            SET target.new_pagerank = $damping * rank_sum + (1 - $damping)
            RETURN AVG(ABS(target.new_pagerank - target.pagerank)) AS delta
        """, {"damping": damping})

        # Commit new scores
        await client.query("MATCH (n:Page) SET n.pagerank = n.new_pagerank")

        if result[0]['delta'] < 0.0001:
            break

    return await client.query("""
        MATCH (n:Page)
        RETURN n.url, n.pagerank
        ORDER BY n.pagerank DESC
        LIMIT 20
    """)
```

### Community Detection

#### Label Propagation

Detect communities by propagating labels:

```gql
// Initialize labels
MATCH (n:User)
SET n.community = n.id

// Propagate (repeat multiple times)
MATCH (n:User)-[:KNOWS]-(neighbor:User)
WITH n, neighbor.community AS neighbor_label, COUNT(*) AS frequency
ORDER BY n, frequency DESC
WITH n, COLLECT(neighbor_label)[0] AS most_common
SET n.community = most_common
```

#### Connected Components

Find disconnected subgraphs:

```gql
// Identify weakly connected components
MATCH path = (n:Node)-[*]-(m:Node)
WITH n, COLLECT(DISTINCT m.id) AS component
RETURN MIN(component) AS component_id, COUNT(*) AS size
ORDER BY size DESC
```

#### Triangle Counting

Count triangles for clustering coefficient:

```gql
// Find triangles in social network
MATCH (a:User)-[:KNOWS]->(b:User)-[:KNOWS]->(c:User)-[:KNOWS]->(a)
WHERE a.id < b.id AND b.id < c.id  // Avoid duplicates
RETURN COUNT(*) AS triangle_count

// Clustering coefficient per node
MATCH (u:User)-[:KNOWS]-(neighbor:User)
WITH u, COLLECT(DISTINCT neighbor) AS neighbors, COUNT(DISTINCT neighbor) AS degree
WHERE degree > 1
UNWIND neighbors AS n1
UNWIND neighbors AS n2
WITH u, n1, n2, degree
WHERE n1.id < n2.id
MATCH (n1)-[r:KNOWS]-(n2)
WITH u, COUNT(r) AS actual_triangles, degree * (degree - 1) / 2 AS possible_triangles
RETURN u.name, actual_triangles * 1.0 / possible_triangles AS clustering_coefficient
ORDER BY clustering_coefficient DESC
```

### Similarity Algorithms

#### Jaccard Similarity

Compute similarity based on common neighbors:

```gql
// Find similar users by common interests
MATCH (u1:User {id: 123})-[:LIKES]->(item:Item)<-[:LIKES]-(u2:User)
WHERE u1.id <> u2.id
WITH u1, u2, COUNT(DISTINCT item) AS common_interests
MATCH (u1)-[:LIKES]->(item1:Item)
WITH u1, u2, common_interests, COUNT(DISTINCT item1) AS u1_interests
MATCH (u2)-[:LIKES]->(item2:Item)
WITH u1, u2, common_interests, u1_interests, COUNT(DISTINCT item2) AS u2_interests
WITH u1, u2,
     common_interests * 1.0 / (u1_interests + u2_interests - common_interests) AS jaccard
WHERE jaccard > 0.3
RETURN u2.name, jaccard
ORDER BY jaccard DESC
LIMIT 10
```

#### Cosine Similarity

Measure similarity using property vectors:

```python
# Python implementation with embeddings
async def cosine_similarity(client, user_id, limit=10):
    result = await client.query("""
        MATCH (u1:User {id: $user_id})
        MATCH (u2:User) WHERE u2.id <> $user_id
        WITH u1, u2,
             REDUCE(dot = 0.0, i IN RANGE(0, SIZE(u1.embedding) - 1) |
                    dot + u1.embedding[i] * u2.embedding[i]) AS dot_product,
             SQRT(REDUCE(norm1 = 0.0, val IN u1.embedding | norm1 + val * val)) AS norm1,
             SQRT(REDUCE(norm2 = 0.0, val IN u2.embedding | norm2 + val * val)) AS norm2
        WITH u2, dot_product / (norm1 * norm2) AS similarity
        WHERE similarity > 0.5
        RETURN u2.name, similarity
        ORDER BY similarity DESC
        LIMIT $limit
    """, {"user_id": user_id, "limit": limit})
    return result
```

## Advanced Algorithm Patterns

### Iterative Algorithms

Many graph algorithms require multiple passes:

```go
// Go implementation: iterative belief propagation
func beliefPropagation(db *sql.DB, iterations int) error {
    for i := 0; i < iterations; i++ {
        _, err := db.Exec(`
            MATCH (n:Node)-[r:EDGE]-(m:Node)
            WITH n, AVG(m.belief) AS avg_belief
            SET n.new_belief = 0.5 * n.prior + 0.5 * avg_belief
        `)
        if err != nil {
            return err
        }

        _, err = db.Exec(`MATCH (n:Node) SET n.belief = n.new_belief`)
        if err != nil {
            return err
        }
    }
    return nil
}
```

### Recursive Algorithms

Depth-first search and traversals:

```gql
// Recursive category hierarchy traversal
MATCH path = (root:Category {name: 'Electronics'})-[:SUBCATEGORY*]->(leaf:Category)
WHERE NOT EXISTS { MATCH (leaf)-[:SUBCATEGORY]->() }
RETURN leaf.name, LENGTH(path) AS depth
ORDER BY depth DESC
```

### Parallel Algorithm Execution

Execute independent computations in parallel:

```rust
// Rust: parallel centrality computation
use tokio::task::JoinSet;

async fn parallel_centrality(client: &GeodeClient, node_ids: Vec<i64>) -> Result<Vec<f64>> {
    let mut tasks = JoinSet::new();

    for node_id in node_ids {
        let client = client.clone();
        tasks.spawn(async move {
            let result = client.query(&format!(
                "MATCH (n {{id: {}}})-[r]->() RETURN COUNT(r) AS degree",
                node_id
            )).await?;
            Ok::<_, Error>(result[0]["degree"].as_f64().unwrap_or(0.0))
        });
    }

    let mut centralities = Vec::new();
    while let Some(result) = tasks.join_next().await {
        centralities.push(result??);
    }
    Ok(centralities)
}
```

## Performance Optimization

### Algorithm Complexity

Be aware of computational complexity:

- **Shortest Path (unweighted)**: O(V + E) with BFS
- **Shortest Path (weighted)**: O(E + V log V) with Dijkstra
- **PageRank**: O(iterations × E)
- **Triangle Counting**: O(E^1.5) worst case
- **Label Propagation**: O(iterations × E)

### Optimization Techniques

1. **Limit Traversal Depth**: Use path length limits to avoid expensive deep traversals
2. **Filter Early**: Apply WHERE clauses before expensive operations
3. **Use Indexes**: Index properties used in algorithm filters
4. **Batch Processing**: Process large graphs in chunks
5. **Materialize Results**: Store computed metrics as properties for reuse

```gql
// Optimize by limiting depth and filtering early
MATCH path = (start:User {id: $id})-[:KNOWS*1..4]-(end:User)
WHERE end.active = true  // Filter early
WITH path, LENGTH(path) AS depth
WHERE depth <= 3  // Limit depth
RETURN end.name, depth
ORDER BY depth
LIMIT 100
```

## Algorithm Libraries

### Custom Algorithm Implementation

Extend Geode with custom algorithms:

```python
class GraphAlgorithms:
    def __init__(self, client):
        self.client = client

    async def detect_cycles(self, start_node_id):
        """Detect cycles using depth-first search"""
        visited = set()
        stack = set()
        cycles = []

        async def dfs(node_id, path):
            if node_id in stack:
                cycles.append(path + [node_id])
                return
            if node_id in visited:
                return

            visited.add(node_id)
            stack.add(node_id)

            result = await self.client.query("""
                MATCH (n {id: $id})-[:EDGE]->(m)
                RETURN m.id AS next_id
            """, {"id": node_id})

            for row in result:
                await dfs(row['next_id'], path + [node_id])

            stack.remove(node_id)

        await dfs(start_node_id, [])
        return cycles
```

## Real-World Applications

### Social Network Analysis

```gql
// Identify influencers
MATCH (u:User)
OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower:User)
WITH u, COUNT(follower) AS followers
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)<-[:LIKED]-(liker:User)
WITH u, followers, COUNT(DISTINCT liker) AS total_likes
RETURN u.name, followers, total_likes, (followers + total_likes * 0.5) AS influence_score
ORDER BY influence_score DESC
LIMIT 20
```

### Fraud Detection

```gql
// Detect suspicious transaction rings
MATCH path = (a:Account)-[:TRANSFERRED*3..6]->(a)
WHERE ALL(r IN relationships(path) WHERE r.amount > 10000)
WITH path, REDUCE(total = 0, r IN relationships(path) | total + r.amount) AS ring_total
WHERE ring_total > 100000
RETURN path, ring_total
ORDER BY ring_total DESC
```

### Recommendation Systems

```gql
// Collaborative filtering recommendations
MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(similar:User)
WHERE similar.id <> $user_id
WITH similar, COUNT(p) AS common_purchases
ORDER BY common_purchases DESC
LIMIT 10
MATCH (similar)-[:PURCHASED]->(recommendation:Product)
WHERE NOT EXISTS {
    MATCH (u:User {id: $user_id})-[:PURCHASED]->(recommendation)
}
WITH recommendation, COUNT(similar) AS recommender_count
RETURN recommendation.name, recommender_count
ORDER BY recommender_count DESC
LIMIT 5
```

## Best Practices

1. **Understand Complexity**: Profile algorithms with realistic data before production deployment
2. **Set Limits**: Always bound path lengths and iteration counts
3. **Use Sampling**: For large graphs, sample subgraphs for approximate results
4. **Cache Results**: Materialize frequently computed metrics as node properties
5. **Monitor Performance**: Track algorithm execution time and resource usage
6. **Parallelize When Possible**: Leverage concurrent execution for independent computations
7. **Validate Results**: Test algorithms on known datasets with expected outcomes

## Common Pitfalls

1. **Unbounded Traversals**: Not limiting path depth can cause exponential explosion
2. **Dense Node Performance**: Algorithms on hub nodes (millions of relationships) can be slow
3. **Ignoring Direction**: Forgetting to consider relationship direction in directed graphs
4. **Memory Constraints**: Large intermediate results can exceed available memory
5. **Algorithm Mismatch**: Using wrong algorithm for the problem (e.g., shortest path when all paths needed)

## Related Topics

- **Graph Modeling**: Design schemas optimized for algorithmic analysis
- **Query Optimization**: Tune GQL queries for algorithm performance
- **Indexing**: Create indexes to accelerate algorithm execution
- **Performance Tuning**: Optimize database configuration for graph algorithms
- **GQL Functions**: Use built-in functions in algorithm implementations

## Further Reading

- [Pathfinding Queries](/tags/queries/) - Path pattern matching in GQL
- [Performance Optimization](/tags/performance/) - Optimize algorithm execution
- [Graph Modeling](/tags/modeling/) - Design graphs for efficient algorithms
- [GQL Reference](/tags/gql-reference/) - Complete language documentation
- [Client Libraries](/tags/client-libraries/) - Implement algorithms in Python, Go, Rust, Zig

Graph algorithms unlock the analytical power of connected data. Start with simple pathfinding and centrality computations, then progress to advanced community detection and machine learning integration as your graph expertise grows.
