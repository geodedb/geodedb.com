---
title: "Graph Algorithms Tutorial"
description: "Step-by-step tutorial for using graph algorithms in Geode: PageRank, shortest paths, community detection, centrality measures, and practical applications"
keywords: ["graph algorithms", "PageRank", "shortest path", "community detection", "centrality", "Dijkstra", "Louvain", "betweenness centrality", "graph analytics"]
weight: 40
slug: "graph-algorithms-tutorial"
url: "/docs/tutorials/graph-algorithms-tutorial/"
canonical: "https://geodedb.com/docs/tutorials/graph-algorithms-tutorial/"
---

<!-- CANARY: REQ=REQ-CENTRALITY-001; FEATURE="Centrality"; ASPECT=PageRank; STATUS=TESTED; OWNER=engine; UPDATED=2026-01-15 -->

# Graph Algorithms Tutorial

Learn to run powerful graph algorithms on your data in this hands-on 20-minute tutorial.

## Prerequisites

- Completed [MATCH Basics Tutorial](/docs/tutorials/match-basics/)
- Geode server running (`geode serve`)
- Access to Geode shell (`geode shell`)
- Understanding of basic graph concepts (nodes, relationships)

## Tutorial Overview

**Time**: 20 minutes
**Difficulty**: Intermediate
**Topics**: PageRank, shortest paths, community detection, centrality measures

By the end of this tutorial, you'll be able to:

- Run PageRank to find influential nodes
- Find shortest paths between nodes
- Detect communities with Louvain algorithm
- Calculate centrality measures
- Apply algorithms to real-world problems

## Step 1: Create Social Network

Create a realistic social network for algorithm demonstrations:

```gql
CREATE GRAPH SocialNetwork;
USE SocialNetwork;

-- Create people
CREATE
  (:Person {name: "Alice", id: 1}),
  (:Person {name: "Bob", id: 2}),
  (:Person {name: "Charlie", id: 3}),
  (:Person {name: "David", id: 4}),
  (:Person {name: "Emma", id: 5}),
  (:Person {name: "Frank", id: 6}),
  (:Person {name: "Grace", id: 7}),
  (:Person {name: "Henry", id: 8});

-- Create social connections
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS]->(b);

MATCH (a:Person {name: "Alice"}), (c:Person {name: "Charlie"})
CREATE (a)-[:KNOWS]->(c);

MATCH (b:Person {name: "Bob"}), (c:Person {name: "Charlie"})
CREATE (b)-[:KNOWS]->(c);

MATCH (b:Person {name: "Bob"}), (d:Person {name: "David"})
CREATE (b)-[:KNOWS]->(d);

MATCH (c:Person {name: "Charlie"}), (d:Person {name: "David"})
CREATE (c)-[:KNOWS]->(d);

MATCH (d:Person {name: "David"}), (e:Person {name: "Emma"})
CREATE (d)-[:KNOWS]->(e);

MATCH (e:Person {name: "Emma"}), (f:Person {name: "Frank"})
CREATE (e)-[:KNOWS]->(f);

MATCH (e:Person {name: "Emma"}), (g:Person {name: "Grace"})
CREATE (e)-[:KNOWS]->(g);

MATCH (f:Person {name: "Frank"}), (g:Person {name: "Grace"})
CREATE (f)-[:KNOWS]->(g);

MATCH (g:Person {name: "Grace"}), (h:Person {name: "Henry"})
CREATE (g)-[:KNOWS]->(h);
```

**Expected output**:

```
Created 8 nodes
Created 10 relationships
```

### Network Structure

The network has two loosely connected communities:

- **Community 1**: Alice, Bob, Charlie, David
- **Community 2**: Emma, Frank, Grace, Henry
- **Bridge**: David-Emma connection links the communities

### What You Learned

- Graph algorithms work on connected networks
- Community structure affects algorithm results
- Real networks often have multiple communities

## Step 2: PageRank - Find Influential Nodes

Run PageRank to identify the most connected/influential people:

```gql
CALL algo.pagerank.stream()
YIELD nodeId, score
MATCH (n) WHERE id(n) = nodeId
RETURN n.name AS person, score
ORDER BY score DESC;
```

**Expected output**:

```
person   | score
---------|--------
David    | 0.185
Emma     | 0.165
Bob      | 0.142
Charlie  | 0.138
Grace    | 0.125
Frank    | 0.095
Alice    | 0.090
Henry    | 0.060
```

### Understanding PageRank

**Algorithm**: Iteratively distributes influence through the network

**Score Meaning**:

- Higher score = more influential/central
- Score sums to 1.0 across all nodes
- Considers both direct and indirect connections

**Parameters**: none. `algo.pagerank.stream()` takes no effective arguments —
damping factor and iteration count are fixed by the engine, and it runs over
every relationship in the current graph rather than a named projection or a
single relationship type. Restrict the *output* instead, by filtering the
`MATCH` that resolves `nodeId`.

**Yields**: `nodeId: INTEGER`, `score: FLOAT`

### Why David and Emma Score Highest

- **David**: Bridge node connecting two communities (receives from both)
- **Emma**: High degree (3 connections) + central position
- **Alice**: Only 2 outgoing connections, peripheral position
- **Henry**: Dead-end node (only 1 connection)

### What You Learned

- PageRank identifies important nodes
- Bridge nodes score highly (connect communities)
- High degree ≠ always highest PageRank
- Position in network matters more than degree alone

## Step 3: Shortest Path - Find Connections

Find the shortest path between two people:

```gql
MATCH path = shortestPath(
  (a:Person {name: "Alice"})-[:KNOWS*]-(h:Person {name: "Henry"})
)
RETURN [n IN nodes(path) | n.name] AS path_names,
       length(path) AS hops;
```

**Expected output**:

```
path_names                                      | hops
------------------------------------------------|-----
["Alice", "Bob", "David", "Emma", "Grace", "Henry"] | 5
```

### Path Explanation

Alice → Bob → David → Emma → Grace → Henry

- 5 hops (relationships) to connect
- Shortest possible path through the network
- Goes through the David-Emma bridge

### Alternative Path Query

Find all shortest paths:

```gql
MATCH path = allShortestPaths(
  (a:Person {name: "Alice"})-[:KNOWS*]-(h:Person {name: "Henry"})
)
RETURN [n IN nodes(path) | n.name] AS path_names,
       length(path) AS hops;
```

May return multiple paths if there are ties.

### What You Learned

- `shortestPath()` finds minimal hop count
- `*` indicates variable-length path
- `nodes(path)` extracts nodes from path object
- `length(path)` counts relationships (hops)

## Step 4: Weighted Shortest Path (Dijkstra)

Add weights and find cheapest path:

```gql
-- Add interaction frequency weights
MATCH (a:Person {name: "Alice"})-[r:KNOWS]->(b:Person {name: "Bob"})
SET r.frequency = 10;

MATCH (a:Person {name: "Alice"})-[r:KNOWS]->(c:Person {name: "Charlie"})
SET r.frequency = 5;

MATCH (b:Person {name: "Bob"})-[r:KNOWS]->(c:Person {name: "Charlie"})
SET r.frequency = 8;

MATCH (b:Person {name: "Bob"})-[r:KNOWS]->(d:Person {name: "David"})
SET r.frequency = 3;

MATCH (c:Person {name: "Charlie"})-[r:KNOWS]->(d:Person {name: "David"})
SET r.frequency = 7;

-- Set remaining weights
MATCH ()-[r:KNOWS]->()
WHERE NOT EXISTS(r.frequency)
SET r.frequency = 5;

-- Look up the endpoint ids
MATCH (a:Person {name: "Alice"}) RETURN id(a) AS alice_id;
MATCH (h:Person {name: "Henry"}) RETURN id(h) AS henry_id;

-- Cheapest path by total frequency (substitute the ids you just read)
CALL algo.dijkstra.stream(1, 8, 'frequency')
YIELD path, cost
RETURN path, cost AS total_frequency;
```

**Expected output**:

```
path                | total_frequency
--------------------|----------------
[1, 2, 4, 5, 7, 8]  | 26.00
```

`algo.dijkstra.stream(startId, endId, weightProperty)` takes node **ids**, not
patterns, and yields `path` as a `LIST` of node ids plus a `cost`. Resolve the
ids back to nodes when you want names:

```gql
CALL algo.dijkstra.stream(1, 8, 'frequency')
YIELD path, cost
UNWIND path AS hop_id
MATCH (n) WHERE id(n) = hop_id
RETURN collect(n.name) AS path_names, cost;
```

### Weighted vs Unweighted

**Unweighted**: Counts hops (5 hops Alice→Henry)
**Weighted**: Sums `frequency` along the path and minimises it

Dijkstra always **minimises** the weight sum; there is no maximise mode. To
prefer strong ties, store an inverse weight (for example
`SET r.cost = 1.0 / r.frequency`) and minimise that instead. A different path
may be optimal once weights are considered.

### What You Learned

- Dijkstra's algorithm finds weighted shortest paths
- Can minimize or maximize weights
- Useful for travel time, cost, strength, etc.
- Weights model real-world connection quality

## Step 5: Community Detection (Louvain)

Discover communities in the network:

```gql
CALL algo.louvain.stream()
YIELD nodeId, community
MATCH (n) WHERE id(n) = nodeId
RETURN community, collect(n.name) AS members, count(*) AS size
ORDER BY size DESC;
```

**Expected output**:

```
community | members                           | size
----------|-----------------------------------|-----
1         | ["David", "Emma", "Frank", "Grace", "Henry"] | 5
0         | ["Alice", "Bob", "Charlie"]      | 3
```

### Community Detection Explained

**Louvain Algorithm**:

- Optimizes modularity (within-community vs between-community connections)
- Iteratively merges communities for better modularity
- Automatically determines number of communities
- Takes no arguments: no iteration cap or relationship-type filter is accepted

`algo.leiden.stream()` yields the same `(nodeId, community)` shape using the
Leiden refinement, and `algo.labelPropagation.stream()` yields
`(nodeId, label)` for a faster, less stable partition.

**Interpretation**:

- Community 1: Larger, more interconnected group
- Community 0: Smaller, peripheral group
- David acts as bridge between communities

### Visualize Community Assignment

```gql
-- Persist community assignments
CALL algo.louvain.stream()
YIELD nodeId, community
MATCH (p:Person) WHERE id(p) = nodeId
SET p.community = community;

-- Query by community
MATCH (p:Person)
RETURN p.community, collect(p.name) AS members
ORDER BY p.community;
```

### What You Learned

- Louvain detects natural groupings
- No need to specify number of communities
- Community IDs are arbitrary (0, 1, 2, ...)
- Useful for understanding network structure

## Step 6: Betweenness Centrality

Find nodes that bridge communities:

```gql
CALL algo.betweenness.stream()
YIELD nodeId, betweenness
MATCH (n) WHERE id(n) = nodeId
RETURN n.name AS person, betweenness AS score
ORDER BY score DESC
LIMIT 5;
```

**Expected output**:

```
person  | score
--------|-------
David   | 0.428
Emma    | 0.357
Bob     | 0.214
Grace   | 0.142
Charlie | 0.071
```

### Betweenness Centrality Explained

**Definition**: Fraction of shortest paths passing through a node

**High Betweenness**:

- Node lies on many shortest paths
- Removing it would disconnect the network
- Bridge between communities

**David's High Score**:

- Only path between Alice-Emma passes through David
- Critical for information flow between communities

### Closeness Centrality

How quickly can a node reach all others:

```gql
CALL algo.closeness.stream()
YIELD nodeId, closeness
MATCH (n) WHERE id(n) = nodeId
RETURN n.name AS person, closeness AS score
ORDER BY score DESC
LIMIT 5;
```

**Expected output**:

```
person  | score
--------|-------
David   | 0.636
Emma    | 0.583
Bob     | 0.538
Charlie | 0.538
Grace   | 0.538
```

**Interpretation**: David can reach all nodes in fewest average hops.

### What You Learned

- Betweenness: control over information flow
- Closeness: speed of reaching others
- Different centrality measures highlight different roles
- Critical for identifying key players

## Step 7: Degree Centrality

Simple but effective measure:

```gql
MATCH (p:Person)
OPTIONAL MATCH (p)-[r:KNOWS]-()
RETURN p.name AS person,
       count(r) AS degree
ORDER BY degree DESC;
```

**Expected output**:

```
person   | degree
---------|-------
Emma     | 3
David    | 3
Bob      | 3
Charlie  | 3
Grace    | 3
Frank    | 2
Alice    | 2
Henry    | 1
```

### Degree Types

**Total Degree**: All connections (undirected)

```gql
count( (p)-[:KNOWS]-() )
```

**Out-Degree**: Outgoing only

```gql
count( (p)-[:KNOWS]->() )
```

**In-Degree**: Incoming only

```gql
count( (p)<-[:KNOWS]-() )
```

### What You Learned

- Degree = number of connections
- Simple but informative metric
- High degree ≠ high betweenness or closeness
- Useful baseline for comparison

## Step 8: Triangle Counting

Count triangles (three nodes all connected):

```gql
CALL algo.triangleCount()
YIELD triangleCount
RETURN triangleCount;
```

**Expected output**:

```
triangleCount
-------------
3
```

`algo.triangleCount()` (alias `algo.triangleCounting()`) reports one
graph-wide total, not a per-node breakdown. For the per-node view use the
local clustering coefficient below, or count triangles yourself:

```gql
MATCH (p:Person)-[:KNOWS]-(b)-[:KNOWS]-(c)-[:KNOWS]-(p)
WHERE id(b) < id(c)
RETURN p.name AS person, count(*) AS triangles
ORDER BY triangles DESC;
```

### Understanding Triangles

**Triangle**: Three nodes A, B, C where A-B, B-C, and C-A all exist

**Examples in network**:

- Alice-Bob-Charlie: Triangle (all three connected)
- Bob-Charlie-David: Triangle
- Emma-Frank-Grace: Triangle

**Significance**:

- Measure of clustering/cohesion
- High triangle count = tight-knit group
- Zero triangles = peripheral or bridging position

### Clustering Coefficient

Related metric: fraction of possible triangles that exist

```gql
-- Per-node coefficient
CALL algo.localClustering()
YIELD nodeId, coefficient
MATCH (n) WHERE id(n) = nodeId
RETURN n.name AS person, coefficient
ORDER BY coefficient DESC;

-- Whole-graph coefficient
CALL algo.globalClustering()
YIELD coefficient
RETURN coefficient;
```

### What You Learned

- Triangles indicate cohesive groups
- Clustering coefficient measures local density
- High clustering = strongly connected neighborhood
- Useful for understanding local structure

## Step 9: Connected Components

Find disconnected subgraphs:

```gql
CALL algo.unionFind.stream()
YIELD nodeId, setId
MATCH (n) WHERE id(n) = nodeId
RETURN setId AS component, collect(n.name) AS members, count(*) AS size
ORDER BY size DESC;
```

**Expected output**:

```
component | members                                                | size
----------|--------------------------------------------------------|-----
0         | ["Alice", "Bob", "Charlie", "David", "Emma", "Frank", "Grace", "Henry"] | 8
```

`algo.unionFind.stream()` gives weakly connected components. For strongly
connected components (direction-aware) use `algo.scc.stream()`, which yields
`(nodeId, componentId)`.

### Interpretation

- **One component**: Entire network is connected
- **Multiple components**: Isolated subgraphs

### Test with Disconnected Network

```gql
-- Add isolated nodes
CREATE (:Person {name: "Isolated1", id: 9});
CREATE (:Person {name: "Isolated2", id: 10});
CREATE (i1:Person {id: 9})-[:KNOWS]->(i2:Person {id: 10});

-- Re-run connected components
CALL algo.unionFind.stream()
YIELD nodeId, setId
MATCH (n) WHERE id(n) = nodeId
RETURN setId AS component, collect(n.name) AS members, count(*) AS size
ORDER BY size DESC;
```

**Expected output**:

```
component | members                           | size
----------|-----------------------------------|-----
0         | ["Alice", "Bob", ..., "Henry"]   | 8
1         | ["Isolated1", "Isolated2"]       | 2
```

### What You Learned

- Connected components find isolated subgraphs
- Useful for detecting network fragmentation
- Each component gets unique ID
- Can identify main network vs satellites

## Step 10: Practical Application - Recommendation System

Use algorithms to build recommendations:

```gql
-- Find recommended friends for Alice
-- (friends of friends, not already connected)
MATCH (alice:Person {name: "Alice"})-[:KNOWS*2]-(fof:Person)
WHERE NOT EXISTS((alice)-[:KNOWS]-(fof))
  AND fof <> alice
WITH fof, count(*) AS mutual_friends
RETURN fof.name AS recommendation,
       mutual_friends
ORDER BY mutual_friends DESC
LIMIT 3;
```

**Expected output**:

```
recommendation | mutual_friends
---------------|---------------
David          | 2
```

### Enhanced Recommendations with PageRank

```gql
-- Weight recommendations by influence
CALL algo.pagerank.stream()
YIELD nodeId, score
MATCH (alice:Person {name: "Alice"})-[:KNOWS*2]-(fof:Person)
WHERE NOT EXISTS((alice)-[:KNOWS]-(fof))
  AND fof <> alice
  AND id(fof) = nodeId
WITH fof, count(*) AS mutual_friends, score
RETURN fof.name AS recommendation,
       mutual_friends,
       round(score * 1000) / 1000 AS influence_score
ORDER BY mutual_friends DESC, influence_score DESC
LIMIT 5;
```

### What You Learned

- Graph algorithms power recommendation engines
- Combine multiple algorithms for better results
- Mutual friends + PageRank = weighted recommendations
- Real-world applications of graph analytics

## Complete Example: Citation Network Analysis

Analyze academic paper citations:

```gql
CREATE GRAPH CitationNetwork;
USE CitationNetwork;

-- Create papers
CREATE
  (:Paper {title: "Graph Theory Basics", year: 2010, id: 1}),
  (:Paper {title: "Advanced Graph Algorithms", year: 2015, id: 2}),
  (:Paper {title: "Network Science", year: 2018, id: 3}),
  (:Paper {title: "Community Detection", year: 2020, id: 4}),
  (:Paper {title: "PageRank Survey", year: 2021, id: 5});

-- Create citations (older papers cited by newer)
MATCH (old:Paper {id: 1}), (new:Paper {id: 2})
CREATE (new)-[:CITES]->(old);

MATCH (old:Paper {id: 1}), (new:Paper {id: 3})
CREATE (new)-[:CITES]->(old);

MATCH (old:Paper {id: 2}), (new:Paper {id: 3})
CREATE (new)-[:CITES]->(old);

MATCH (old:Paper {id: 2}), (new:Paper {id: 4})
CREATE (new)-[:CITES]->(old);

MATCH (old:Paper {id: 3}), (new:Paper {id: 4})
CREATE (new)-[:CITES]->(old);

MATCH (old:Paper {id: 1}), (new:Paper {id: 5})
CREATE (new)-[:CITES]->(old);

MATCH (old:Paper {id: 2}), (new:Paper {id: 5})
CREATE (new)-[:CITES]->(old);

-- Find most influential papers (cited by many + cited by influential)
CALL algo.pagerank.stream()
YIELD nodeId, score
MATCH (p:Paper) WHERE id(p) = nodeId
RETURN p.title AS paper, p.year AS year, score
ORDER BY score DESC;
```

**Expected output**:

```
paper                        | year | score
-----------------------------|------|-------
Graph Theory Basics          | 2010 | 0.285
Advanced Graph Algorithms    | 2015 | 0.238
Network Science              | 2018 | 0.195
Community Detection          | 2020 | 0.142
PageRank Survey              | 2021 | 0.140
```

**Insight**: "Graph Theory Basics" (2010) is most influential (cited by many papers, including influential ones).

### What You Learned

- PageRank models citation influence
- Older papers often have higher scores (more citations)
- Algorithms reveal hidden patterns
- Domain-specific interpretations matter

## Algorithm Selection Guide

### Choose PageRank when

- Finding influential/important nodes
- Ranking nodes by connectivity
- Building recommendation systems
- Citation analysis, web page ranking

### Choose Shortest Path when

- Finding connections between nodes
- Route planning, navigation
- Understanding network distances
- Six degrees of separation analysis

### Choose Community Detection when

- Discovering natural groupings
- Understanding network structure
- Market segmentation
- Fraud ring detection

### Choose Centrality Measures when

- Identifying key players
- Finding bottlenecks (betweenness)
- Measuring reachability (closeness)
- Detecting influencers (degree)

### Choose Triangle Counting when

- Measuring cohesion
- Detecting tightly-knit groups
- Understanding local clustering
- Spam/fake account detection

## Performance Tips

### For Large Graphs (millions of nodes)

1. **Keep analytical data in its own graph**: the `algo.*` procedures traverse
   every relationship in the current graph and accept no relationship-type or
   projection argument, so `CREATE GRAPH` + `USE` is the only way to narrow the
   input set.

2. **Budget for full runs**: iteration counts are fixed by the engine and
   cannot be lowered per call, so treat each invocation as a full pass.

3. **Sample large graphs**:

   ```gql
   -- Work on subgraph first
   MATCH (n:Person)
   WHERE rand() < 0.1  -- 10% sample
   ...
   ```

4. **Create indexes**:

   ```gql
   CREATE INDEX person_id_idx ON Person(id) USING hash;
   ```

5. **Persist results**:

   ```gql
   -- Store PageRank scores for reuse
   CALL algo.pagerank.stream()
   YIELD nodeId, score
   MATCH (p:Person) WHERE id(p) = nodeId
   SET p.pagerank = score;
   ```

## Practice Exercises

### Exercise 1: Influence Analysis

```gql
-- Calculate multiple centrality measures for each person
-- Combine PageRank, degree, betweenness, and closeness
-- Find person who ranks highest across all measures
```

### Exercise 2: Community Comparison

```gql
-- Run Louvain community detection
-- For each community, calculate:
--   - Average PageRank
--   - Average degree
--   - Number of triangles
-- Which community is most cohesive?
```

### Exercise 3: Path Analysis

```gql
-- Find all paths between Alice and Henry
-- Filter paths by length (3-5 hops)
-- Calculate total frequency (sum of relationship weights)
-- Return top 3 paths by frequency
```

## Solutions

<details>
<summary>Exercise 1 Solution</summary>

Each `algo.*` procedure streams its own result set, so run them one at a time
and stage the scores on the nodes before combining:

```gql
-- 1. Stage each measure as a property
CALL algo.pagerank.stream()
YIELD nodeId, score
MATCH (p:Person) WHERE id(p) = nodeId
SET p.pagerank = score;

CALL algo.betweenness.stream()
YIELD nodeId, betweenness
MATCH (p:Person) WHERE id(p) = nodeId
SET p.betweenness = betweenness;

CALL algo.closeness.stream()
YIELD nodeId, closeness
MATCH (p:Person) WHERE id(p) = nodeId
SET p.closeness = closeness;

CALL algo.degree.stream()
YIELD nodeId, degree
MATCH (p:Person) WHERE id(p) = nodeId
SET p.degree = degree;

-- 2. Combine and rank
MATCH (p:Person)
RETURN p.name,
       p.pagerank,
       p.degree,
       p.betweenness,
       p.closeness,
       (p.pagerank + p.degree / 10.0 + p.betweenness + p.closeness) / 4 AS avg_rank
ORDER BY avg_rank DESC;
```

</details>

## Next Steps

Continue your graph analytics journey:

1. **[Vector Search Tutorial](/docs/tutorials/vector-search-tutorial/)** - ML embeddings and similarity search
2. **[Graph Algorithms Guide](/docs/analytics/graph-algorithms/)** - Complete algorithm catalog
3. **[Performance Tuning](/docs/performance/)** - Optimize algorithm execution
4. **[Use Case Guides](/docs/use-cases/overview/)** - Domain-specific applications

## Quick Reference

### Algorithm Calls

```gql
-- PageRank
CALL algo.pagerank.stream() YIELD nodeId, score

-- Shortest Path
MATCH path = shortestPath((a)-[:TYPE*]-(b))

-- Dijkstra (weighted; node ids, not patterns)
CALL algo.dijkstra.stream(startId, endId, 'weight') YIELD path, cost

-- Community Detection
CALL algo.louvain.stream() YIELD nodeId, community

-- Betweenness Centrality
CALL algo.betweenness.stream() YIELD nodeId, betweenness

-- Closeness Centrality
CALL algo.closeness.stream() YIELD nodeId, closeness

-- Degree Centrality
CALL algo.degree.stream() YIELD nodeId, degree

-- Triangle Counting (graph-wide total)
CALL algo.triangleCount() YIELD triangleCount

-- Connected Components (weakly connected)
CALL algo.unionFind.stream() YIELD nodeId, setId
```

Every `algo.*` procedure runs over the whole current graph and takes no tuning
parameters; resolve `nodeId` with `MATCH (n) WHERE id(n) = nodeId`.

---

**Tutorial Complete!** You now understand graph algorithms and their applications in Geode.

**Next**: [Vector Search Tutorial](/docs/tutorials/vector-search-tutorial/)
