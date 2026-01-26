---
title: "PageRank Algorithm"
description: "Implement PageRank graph algorithm in Geode using GQL. Learn to measure node importance, compute centrality scores, and analyze influence networks with iterative PageRank calculations."
keywords:
  - pagerank
  - graph algorithms
  - centrality
  - node importance
  - link analysis
  - Geode
  - GQL
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/pagerank/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# PageRank Algorithm in Geode

PageRank is a graph algorithm that measures the importance of nodes based on their incoming connections and the importance of connecting nodes. Originally developed by Google to rank web pages, PageRank is now widely used for influence analysis, recommendation systems, and network centrality calculations.

Geode provides native support for implementing PageRank through GQL queries, enabling efficient importance scoring across large graph datasets.

## Understanding PageRank

PageRank assigns each node a numerical score representing its importance. The algorithm operates on the principle that important nodes receive links from other important nodes, creating a recursive definition of importance.

### Core Concepts

**Importance Propagation**: Nodes distribute their importance scores to their outgoing neighbors, weighted by the number of outgoing edges.

**Damping Factor**: A probability (typically 0.85) that represents the likelihood of continuing to follow links versus randomly jumping to any node.

**Iterative Convergence**: PageRank calculations iterate until scores stabilize within a tolerance threshold, typically after 10-50 iterations.

**Initial Distribution**: All nodes start with equal importance scores, usually 1/N where N is the total number of nodes.

## Basic PageRank Implementation

### Computing PageRank Scores

```gql
-- Create a temporary property to store PageRank scores
MATCH (n:Page)
SET n.pagerank = 1.0 / COUNT(*)
RETURN n.id AS page, n.pagerank AS initial_score;

-- Iterative PageRank update (run multiple times)
MATCH (source:Page)-[r:LINKS_TO]->(target:Page)
WITH target,
     SUM(source.pagerank / COUNT { (source)-[:LINKS_TO]->() }) AS incoming_rank
SET target.pagerank_new = 0.15 + 0.85 * incoming_rank
RETURN target.id AS page, target.pagerank_new AS updated_score;

-- Copy new scores to current scores
MATCH (n:Page)
SET n.pagerank = n.pagerank_new
REMOVE n.pagerank_new;
```

### Finding Top-Ranked Nodes

```gql
-- Get nodes with highest PageRank scores
MATCH (n:Page)
WHERE n.pagerank IS NOT NULL
RETURN n.id AS page,
       n.title AS title,
       n.pagerank AS importance_score
ORDER BY n.pagerank DESC
LIMIT 20;
```

## Advanced PageRank Patterns

### Personalized PageRank

Personalized PageRank biases the random jump probability toward specific nodes, useful for recommendations.

```gql
-- Personalized PageRank from a seed node
MATCH (seed:User {id: 'user123'})
MATCH (n:Item)
SET n.ppr = CASE
    WHEN n = seed THEN 1.0
    ELSE 0.0
END;

-- Iterative update with personalization
MATCH (source:Item)-[r:RELATES_TO]->(target:Item)
WITH target,
     SUM(source.ppr / COUNT { (source)-[:RELATES_TO]->() }) AS incoming_ppr,
     0.15 * CASE WHEN target IN [(seed:User {id: 'user123'})-[:LIKES]->() | seed]
                 THEN 1.0 ELSE 0.0 END AS personalization
SET target.ppr_new = personalization + 0.85 * incoming_ppr;
```

### Topic-Sensitive PageRank

Compute PageRank scores specific to different topics or categories.

```gql
-- PageRank within a topic
MATCH (n:Article)
WHERE n.category = 'technology'
SET n.topic_rank = 1.0 / COUNT {
    MATCH (m:Article) WHERE m.category = 'technology'
};

-- Iterate within topic boundaries
MATCH (source:Article)-[:CITES]->(target:Article)
WHERE source.category = 'technology'
  AND target.category = 'technology'
WITH target,
     SUM(source.topic_rank / COUNT {
         (source)-[:CITES]->(:Article {category: 'technology'})
     }) AS topic_incoming
SET target.topic_rank_new = 0.15 + 0.85 * topic_incoming;
```

### Weighted PageRank

Incorporate edge weights to reflect varying importance of connections.

```gql
-- Weighted PageRank calculation
MATCH (source:Page)-[r:LINKS_TO]->(target:Page)
WITH target,
     SUM(r.weight * source.pagerank /
         SUM { (source)-[rel:LINKS_TO]->() | rel.weight }
     ) AS weighted_incoming
SET target.pagerank_new = 0.15 + 0.85 * weighted_incoming;
```

## Practical Applications

### Web Page Ranking

```gql
-- Rank web pages by link importance
MATCH (page:WebPage)
SET page.pagerank = 1.0 / COUNT { MATCH (p:WebPage) };

-- Execute 20 iterations
MATCH (source:WebPage)-[:LINKS_TO]->(target:WebPage)
WITH target,
     SUM(source.pagerank / COUNT { (source)-[:LINKS_TO]->() }) AS rank_sum
SET target.pagerank_new = 0.15 + 0.85 * rank_sum;

MATCH (n:WebPage)
SET n.pagerank = n.pagerank_new
REMOVE n.pagerank_new;

-- Get top pages
MATCH (page:WebPage)
RETURN page.url, page.title, page.pagerank
ORDER BY page.pagerank DESC
LIMIT 50;
```

### Social Network Influence

```gql
-- Identify influential users
MATCH (user:User)
SET user.influence = 1.0 / COUNT { MATCH (u:User) };

-- Propagate influence through follower relationships
MATCH (follower:User)-[:FOLLOWS]->(influencer:User)
WITH influencer,
     SUM(follower.influence / COUNT { (follower)-[:FOLLOWS]->() }) AS follower_influence
SET influencer.influence_new = 0.15 + 0.85 * follower_influence;

-- Top influencers
MATCH (user:User)
RETURN user.username,
       user.followers_count,
       user.influence AS influence_score
ORDER BY user.influence DESC
LIMIT 25;
```

### Citation Network Analysis

```gql
-- Rank academic papers by citation importance
MATCH (paper:Paper)
SET paper.citation_rank = 1.0 / COUNT { MATCH (p:Paper) };

-- Iterate based on citations
MATCH (citing:Paper)-[:CITES]->(cited:Paper)
WITH cited,
     SUM(citing.citation_rank / COUNT { (citing)-[:CITES]->() }) AS citation_score
SET cited.citation_rank_new = 0.15 + 0.85 * citation_score;

-- Most influential papers
MATCH (paper:Paper)
RETURN paper.title,
       paper.year,
       COUNT { (paper)<-[:CITES]-() } AS citation_count,
       paper.citation_rank AS impact_score
ORDER BY paper.citation_rank DESC;
```

## Performance Optimization

### Efficient Iteration Strategy

```gql
-- Batch processing for large graphs
MATCH (n:Node)
WITH COUNT(n) AS total_nodes
MATCH (n:Node)
CALL {
    WITH n, total_nodes
    SET n.pagerank = 1.0 / total_nodes
} IN TRANSACTIONS OF 10000 ROWS;

-- Parallel iteration updates
MATCH (source)-[r:CONNECTED_TO]->(target)
WITH target,
     SUM(source.pagerank / source.out_degree) AS incoming_rank
CALL {
    WITH target, incoming_rank
    SET target.pagerank_new = 0.15 + 0.85 * incoming_rank
} IN TRANSACTIONS OF 10000 ROWS;
```

### Convergence Detection

```gql
-- Check convergence between iterations
MATCH (n:Node)
WITH SUM(ABS(n.pagerank - n.pagerank_new)) AS total_change,
     COUNT(n) AS node_count
RETURN total_change / node_count AS average_change,
       CASE
           WHEN total_change / node_count < 0.0001 THEN 'CONVERGED'
           ELSE 'CONTINUE'
       END AS status;
```

### Pre-Computing Out-Degrees

```gql
-- Cache out-degree counts for performance
MATCH (n:Node)
SET n.out_degree = COUNT { (n)-->() };

-- Use cached degrees in PageRank
MATCH (source)-[r]->(target)
WITH target,
     SUM(source.pagerank / source.out_degree) AS rank_contribution
SET target.pagerank_new = 0.15 + 0.85 * rank_contribution;
```

## Best Practices

### Algorithm Configuration

**Iteration Count**: Run 20-50 iterations for most graphs; monitor convergence to determine optimal count.

**Damping Factor**: Use 0.85 as default; adjust to 0.80-0.90 based on graph characteristics and convergence behavior.

**Convergence Threshold**: Set tolerance to 0.0001 for production systems; tighten to 0.00001 for research applications.

**Initial Values**: Start with uniform distribution (1/N) to ensure consistent results across runs.

### Memory Management

**Incremental Updates**: Process PageRank in batches for graphs with millions of nodes.

**Property Cleanup**: Remove temporary properties (pagerank_new) after iteration completion to reduce memory usage.

**Transaction Batching**: Use IN TRANSACTIONS for large-scale updates to maintain database responsiveness.

### Validation Techniques

```gql
-- Verify PageRank sum equals 1.0
MATCH (n:Node)
RETURN SUM(n.pagerank) AS total_rank,
       ABS(1.0 - SUM(n.pagerank)) AS deviation;

-- Check for dangling nodes (no outgoing edges)
MATCH (n:Node)
WHERE NOT EXISTS { (n)-->() }
RETURN COUNT(n) AS dangling_nodes;
```

## Common Patterns

### Recommendation Systems

```gql
-- Recommend items based on personalized PageRank
MATCH (user:User {id: 'user123'})-[:PURCHASED]->(seed:Product)
MATCH (item:Product)
SET item.recommendation_score = CASE
    WHEN item IN [seed] THEN 1.0
    ELSE 0.0
END;

-- Propagate scores through product relationships
MATCH (source:Product)-[:SIMILAR_TO]->(target:Product)
WITH target,
     SUM(source.recommendation_score / COUNT { (source)-[:SIMILAR_TO]->() }) AS score
SET target.recommendation_score_new = 0.15 + 0.85 * score;

-- Top recommendations
MATCH (rec:Product)
WHERE NOT EXISTS { (:User {id: 'user123'})-[:PURCHASED]->(rec) }
RETURN rec.name, rec.recommendation_score
ORDER BY rec.recommendation_score DESC
LIMIT 10;
```

### Knowledge Graph Importance

```gql
-- Rank entities in knowledge graph
MATCH (entity:Entity)
SET entity.importance = 1.0 / COUNT { MATCH (e:Entity) };

MATCH (source:Entity)-[:RELATED_TO]->(target:Entity)
WITH target,
     SUM(source.importance / COUNT { (source)-[:RELATED_TO]->() }) AS importance_sum
SET target.importance_new = 0.15 + 0.85 * importance_sum;
```

## Troubleshooting

### Slow Convergence

**Issue**: PageRank scores don't stabilize after many iterations.

**Solution**: Check for graph structure issues (disconnected components, large cycles). Increase damping factor to 0.90 or implement teleportation to all nodes.

```gql
-- Detect disconnected components
MATCH (n:Node)
WHERE NOT EXISTS { (n)--() }
RETURN COUNT(n) AS isolated_nodes;
```

### Rank Sinks

**Issue**: PageRank accumulates in nodes with no outgoing edges.

**Solution**: Redistribute dangling node rank equally to all nodes.

```gql
-- Handle dangling nodes
MATCH (dangling:Node)
WHERE NOT EXISTS { (dangling)-->() }
WITH SUM(dangling.pagerank) / COUNT { MATCH (n:Node) } AS dangling_contribution
MATCH (n:Node)
SET n.pagerank_adjustment = dangling_contribution;
```

### Memory Pressure

**Issue**: PageRank computation exceeds available memory.

**Solution**: Process in batches and use disk-backed temporary storage.

```gql
-- Batch processing pattern
MATCH (n:Node)
WHERE ID(n) % 10 = 0  -- Process 10% at a time
WITH n
CALL { ... PageRank update logic ... };
```

## Integration Examples

### Python Client

```python
from geode_client import Client

async def compute_pagerank(client, iterations=20, damping=0.85):
    # Initialize PageRank
    await client.execute("""
        MATCH (n:Page)
        SET n.pagerank = 1.0 / COUNT { MATCH (p:Page) }
    """)

    # Iterate
    for i in range(iterations):
        result, _ = await client.query(f"""
            MATCH (s)-[:LINKS_TO]->(t)
            WITH t, SUM(s.pagerank / COUNT {{ (s)-[:LINKS_TO]->() }}) AS rank
            SET t.pr_new = {1-damping} + {damping} * rank
            WITH SUM(ABS(t.pagerank - t.pr_new)) AS change
            RETURN change
        """)

        await client.execute("MATCH (n) SET n.pagerank = n.pr_new REMOVE n.pr_new")

        if result.rows[0][0] < 0.0001:
            print(f"Converged after {i+1} iterations")
            break

    # Get top results
    top_pages, _ = await client.query("""
        MATCH (n:Page)
        RETURN n.id, n.pagerank
        ORDER BY n.pagerank DESC
        LIMIT 20
    """)

    return top_pages.rows
```

### Rust Client

```rust
use geode_client::Client;

async fn pagerank_analysis(client: &Client) -> Result<Vec<(String, f64)>> {
    // Initialize
    client.execute("MATCH (n:Page) SET n.pr = 1.0 / COUNT { MATCH (p:Page) }").await?;

    // Iterate until convergence
    for iteration in 0..50 {
        let result = client.execute(
            "MATCH (s)-[:LINKS_TO]->(t) \
             WITH t, SUM(s.pr / COUNT { (s)-[:LINKS_TO]->() }) AS r \
             SET t.pr_new = 0.15 + 0.85 * r \
             RETURN SUM(ABS(t.pr - t.pr_new)) AS change"
        ).await?;

        client.execute("MATCH (n) SET n.pr = n.pr_new REMOVE n.pr_new").await?;

        if let Some(change) = result.get_float(0, 0)? {
            if change < 0.0001 {
                println!("Converged at iteration {}", iteration);
                break;
            }
        }
    }

    // Extract results
    let results = client.execute(
        "MATCH (n:Page) RETURN n.id, n.pr ORDER BY n.pr DESC LIMIT 20"
    ).await?;

    Ok(results.into_iter()
        .map(|row| (row.get_string(0).unwrap(), row.get_float(1).unwrap()))
        .collect())
}
```

## Related Topics

- **Graph Algorithms**: See graph-algorithms tag for comprehensive algorithm coverage
- **Community Detection**: Use community-detection for clustering and group identification
- **Centrality Measures**: Explore patterns tag for betweenness and closeness centrality
- **Performance Tuning**: Check optimization and performance tags for query optimization strategies

## Advanced PageRank Variants

### Weighted PageRank with Damping

```gql
-- Edge-weighted PageRank
MATCH (n:Page)
SET n.pagerank = 1.0 / COUNT { MATCH (p:Page) };

MATCH (source:Page)-[link:LINKS_TO]->(target:Page)
WITH target,
     SUM(link.weight * source.pagerank /
         SUM { (source)-[l:LINKS_TO]->() | l.weight })
     AS weighted_contribution
SET target.pagerank_new = 0.15 + 0.85 * weighted_contribution;
```

### Topic-Sensitive PageRank (Personalization)

```gql
-- Bias random jumps toward topic nodes
MATCH (topic:Topic {name: $topic_name})<-[:BELONGS_TO]-(seed:Page)
WITH COLLECT(seed) AS topic_pages
MATCH (n:Page)
SET n.personalized_pr = CASE
    WHEN n IN topic_pages THEN 1.0 / SIZE(topic_pages)
    ELSE 0.0
END;

-- Iterate with personalization vector
MATCH (source:Page)-[:LINKS_TO]->(target:Page)
WITH target,
     SUM(source.personalized_pr / COUNT { (source)-[:LINKS_TO]->() }) AS propagated,
     target.personalized_pr AS teleport
SET target.pr_new = 0.15 * teleport + 0.85 * propagated;
```

## Large-Scale PageRank Optimization

### Block Striped PageRank

Partition for parallel computation:

```gql
-- Partition nodes into blocks
MATCH (n:Page)
SET n.block_id = ID(n) % $num_blocks;

-- Process blocks in parallel
MATCH (source:Page {block_id: $block})-[:LINKS_TO]->(target:Page)
WITH target, SUM(source.pagerank / source.out_degree) AS contribution
SET target.pagerank_delta = contribution
CALL IN TRANSACTIONS OF 100000 ROWS;

-- Aggregate deltas
MATCH (n:Page)
SET n.pagerank = 0.15 + 0.85 * n.pagerank_delta,
    n.pagerank_delta = null;
```

### Incremental PageRank

Update only affected subgraph:

```gql
-- After adding edge (u, v), identify affected nodes
MATCH (u:Page {id: $new_source}), (v:Page {id: $new_target})
CREATE (u)-[:LINKS_TO]->(v);

-- Mark affected region (forward reachable from v)
MATCH (v:Page {id: $new_target})-[:LINKS_TO*0..3]->(affected:Page)
SET affected.needs_update = true;

-- Incremental update (only marked nodes)
MATCH (source:Page)-[:LINKS_TO]->(target:Page)
WHERE target.needs_update = true
WITH target, SUM(source.pagerank / source.out_degree) AS new_contrib
SET target.pagerank = 0.15 + 0.85 * new_contrib,
    target.needs_update = false;
```

## Practical Applications

### Search Engine Ranking

```gql
-- Combine PageRank with content relevance
MATCH (page:Page)
WHERE page.content CONTAINS $query
WITH page,
     page.pagerank AS authority_score,
     // TF-IDF score from full-text index
     text_score(page, $query) AS relevance_score
RETURN page.url,
       page.title,
       authority_score,
       relevance_score,
       0.7 * relevance_score + 0.3 * authority_score AS combined_score
ORDER BY combined_score DESC
LIMIT 20;
```

### Influence Propagation in Social Networks

```gql
-- Find influential nodes for viral marketing
MATCH (user:User)
SET user.influence = 1.0 / COUNT { MATCH (u:User) };

-- Propagate through follower graph
MATCH (follower:User)-[:FOLLOWS]->(leader:User)
WITH leader, SUM(follower.influence / follower.following_count) AS follower_influence
SET leader.influence_new = 0.15 + 0.85 * follower_influence;

-- Select top influencers for campaign
MATCH (influencer:User)
WHERE influencer.influence > $threshold
RETURN influencer.username,
       influencer.influence,
       COUNT { (influencer)<-[:FOLLOWS]-() } AS followers,
       influencer.influence * COUNT { (influencer)<-[:FOLLOWS]-() } AS reach_score
ORDER BY reach_score DESC
LIMIT 100;
```

## Further Reading

- **PageRank**: The Original Algorithm and Modern Variants
- **Personalized PageRank**: Topic-Sensitive and Query-Dependent Ranking
- **Scalable PageRank**: Distributed and Incremental Computation
- **Link Analysis**: HITS, TrustRank, and Other Algorithms

Browse tagged content for complete PageRank documentation.
