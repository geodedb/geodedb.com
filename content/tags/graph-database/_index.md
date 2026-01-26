---
title: "Graph Database Fundamentals"
description: "Complete guide to graph database concepts, architecture, and theory. Learn about nodes, relationships, property graphs, graph models, query languages, when to use graph databases, and how they differ from relational, document, and other NoSQL databases."
keywords:
  - graph database
  - graph theory
  - nodes and relationships
  - property graph
  - graph model
  - database architecture
  - NoSQL
  - Geode
  - GQL
  - database comparison
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/graph-database/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Graph Database Fundamentals

Graph databases represent a fundamental shift in how we model and query connected data. Unlike traditional relational databases that use tables and joins, graph databases store data as nodes (entities) and relationships (connections), making them naturally suited for highly connected datasets where relationships are as important as the data itself.

## What is a Graph Database?

A graph database is a database management system that uses graph structures with nodes, relationships, and properties to represent and store data. The graph relates the data items in the store to a collection of nodes and edges, where edges represent the relationships between nodes.

### Core Components

1. **Nodes**: Represent entities (people, products, locations, etc.)
2. **Relationships**: Connect nodes and represent how entities relate
3. **Properties**: Key-value pairs attached to nodes and relationships
4. **Labels**: Categorize nodes into groups (optional, implementation-specific)

```gql
-- Node example: Person with properties
(p:Person {
  id: 'user123',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  age: 32
})

-- Relationship example: connecting two nodes
(alice:Person)-[r:KNOWS {since: DATE '2020-05-15', context: 'college'}]->(bob:Person)
```

## Graph Theory Background

Graph databases are based on mathematical graph theory, which has been studied for centuries.

### Mathematical Definition

A graph G is defined as G = (V, E) where:
- V is a set of vertices (nodes)
- E is a set of edges (relationships)

In property graphs (like Geode), we extend this to:
- Each vertex has properties: v = {label, {k₁: v₁, k₂: v₂, ...}}
- Each edge has type and properties: e = {type, {k₁: v₁, k₂: v₂, ...}}

### Graph Types

**Directed vs. Undirected**

- **Directed**: Relationships have direction (A→B is different from B→A)
- **Undirected**: Relationships are bidirectional

Most graph databases, including Geode, use directed graphs where relationships have explicit direction.

```gql
-- Directed relationship
(alice:Person)-[:FOLLOWS]->(bob:Person)
-- Alice follows Bob, but Bob doesn't necessarily follow Alice

-- To query bidirectionally
MATCH (a:Person)-[:FOLLOWS]-(b:Person)
WHERE a.name = 'Alice'
-- Finds relationships in both directions
```

**Weighted vs. Unweighted**

- **Weighted**: Relationships have numeric weights (distances, costs, strengths)
- **Unweighted**: All relationships are equal

```gql
-- Weighted graph: social network with interaction strength
(user1)-[:INTERACTS {weight: 0.85, interactions: 47}]->(user2)
```

**Cyclic vs. Acyclic**

- **Cyclic**: Contains cycles (paths that loop back)
- **Acyclic**: No cycles (directed acyclic graphs - DAGs)

```gql
-- DAG example: task dependencies (no circular dependencies allowed)
(task1:Task)-[:DEPENDS_ON]->(task2:Task)-[:DEPENDS_ON]->(task3:Task)

-- Cyclic example: social network (mutual follows create cycles)
(alice)-[:FOLLOWS]->(bob)-[:FOLLOWS]->(charlie)-[:FOLLOWS]->(alice)
```

## Property Graph Model

Geode implements the **property graph model**, the most popular graph database model (used by Neo4j, Neptune, TigerGraph, and others).

### Key Characteristics

1. **Nodes and Relationships are First-Class Citizens**: Both can have properties
2. **Multi-Relational**: Multiple relationship types between same nodes
3. **Schema-Optional**: Can be schema-free, schema-enforced, or hybrid
4. **Type System**: Rich data types (strings, numbers, dates, lists, maps)

### Example: Social Network

```gql
-- Create users
INSERT (alice:Person {name: 'Alice', city: 'San Francisco', joined: DATE '2024-01-15'});
INSERT (bob:Person {name: 'Bob', city: 'New York', joined: DATE '2024-02-20'});
INSERT (charlie:Person {name: 'Charlie', city: 'Austin', joined: DATE '2024-03-10'});

-- Create relationships
INSERT (alice)-[:FOLLOWS {since: CURRENT_DATE}]->(bob);
INSERT (bob)-[:FOLLOWS {since: CURRENT_DATE}]->(charlie);
INSERT (charlie)-[:FOLLOWS {since: CURRENT_DATE}]->(alice);

-- Create content
INSERT (post:Post {title: 'Graph Databases 101', created: CURRENT_TIMESTAMP});
INSERT (alice)-[:AUTHORED]->(post);
INSERT (bob)-[:LIKED {timestamp: CURRENT_TIMESTAMP}]->(post);

-- Query the graph
MATCH (author:Person)-[:AUTHORED]->(post:Post)<-[:LIKED]-(liker:Person)
RETURN author.name, post.title, collect(liker.name) AS likers;
```

## When to Use Graph Databases

### Ideal Use Cases

**1. Social Networks**

- Friend connections, followers, recommendations
- Natural graph structure with nodes (users) and relationships (connections)

```gql
-- Find friends of friends who like similar content
MATCH (me:User {id: $user_id})-[:FRIEND]->(friend)-[:FRIEND]->(fof:User)
WHERE NOT EXISTS { MATCH (me)-[:FRIEND]->(fof) }
  AND fof <> me
MATCH (me)-[:LIKES]->(interest:Interest)<-[:LIKES]-(fof)
RETURN fof.name, count(interest) AS common_interests
ORDER BY common_interests DESC
LIMIT 10;
```

**2. Recommendation Engines**

- Collaborative filtering, content recommendations, personalization

```gql
-- Recommend products based on similar users
MATCH (u1:User {id: $user_id})-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(u2:User)
MATCH (u2)-[:PURCHASED]->(rec:Product)
WHERE NOT EXISTS { MATCH (u1)-[:PURCHASED]->(rec) }
RETURN rec.name, count(u2) AS recommendation_strength
ORDER BY recommendation_strength DESC
LIMIT 20;
```

**3. Fraud Detection**

- Pattern matching for suspicious behavior, money laundering detection

```gql
-- Detect circular transaction patterns (potential money laundering)
MATCH path = (a:Account)-[:TRANSFER*3..5]->(a)
WHERE all(r IN relationships(path) WHERE r.amount > 10000)
  AND all(r IN relationships(path) WHERE r.timestamp >= CURRENT_DATE - DURATION 'P7D')
RETURN path, reduce(total = 0, r IN relationships(path) | total + r.amount) AS total_amount
ORDER BY total_amount DESC;
```

**4. Knowledge Graphs**

- Semantic networks, ontologies, Wikipedia-style interconnected knowledge

```gql
-- Explore knowledge graph connections
MATCH (entity:Entity {name: 'Albert Einstein'})
      -[r1:RELATED_TO]->(related)
      -[r2:RELATED_TO]->(further)
RETURN entity.name, type(r1), related.name, type(r2), further.name
LIMIT 100;
```

**5. Network and Infrastructure Management**

- IT systems, telecommunications, power grids, logistics networks

```gql
-- Find impact of server failure
MATCH (failed:Server {id: 'srv-42'})<-[:DEPENDS_ON*]-(affected:Service)
RETURN affected.name, affected.criticality, affected.users_affected
ORDER BY affected.criticality DESC;
```

**6. Access Control and Authorization**

- Role hierarchies, permission inheritance, complex authorization rules

```gql
-- Check if user has permission (direct or inherited)
MATCH path = (u:User {id: $user_id})-[:HAS_ROLE*]->(r:Role)-[:HAS_PERMISSION]->(p:Permission)
WHERE p.action = $action AND p.resource = $resource
RETURN count(path) > 0 AS has_permission;
```

### When NOT to Use Graph Databases

**1. Simple Tabular Data**

If your data has few relationships and mostly consists of independent records, relational databases are simpler and more efficient.

**2. High-Volume Transactional Systems**

For pure OLTP with simple queries (e.g., account balance lookups), traditional RDBMS may be faster.

**3. Large Binary Objects**

Graph databases are not optimized for storing large files, videos, or images. Use object storage (S3) and store references in the graph.

**4. Pure Aggregations Without Relationships**

For time-series data or analytics without relationship traversal, specialized databases (InfluxDB, ClickHouse) may be better.

## Graph Database Architecture

### Storage Strategies

**1. Native Graph Storage**

Stores graph structure using adjacency lists or similar graph-native formats (Geode, Neo4j).

Advantages:
- Optimized for traversals
- Index-free adjacency (no joins needed)
- High performance for graph queries

**2. Non-Native Storage**

Uses relational or document storage underneath with graph abstraction layer.

Advantages:
- Leverages existing database infrastructure
- Familiar backup/recovery tools

Disadvantages:
- Slower traversals (requires joins)
- Limited scalability for deep queries

### Query Processing

**Graph Traversal Algorithms**

1. **Breadth-First Search (BFS)**: Explore neighbors level by level
2. **Depth-First Search (DFS)**: Explore deeply before backtracking
3. **Bidirectional Search**: Search from both endpoints simultaneously

```gql
-- BFS implicitly used for shortest path
MATCH path = SHORTEST (a:Person)-[:KNOWS*]-(b:Person)
WHERE a.name = 'Alice' AND b.name = 'Bob'
RETURN path;
```

**Index Usage**

Graph databases use indexes for:
- Finding starting nodes (e.g., by property value)
- Filtering during traversal
- Accelerating aggregations

```gql
-- Index scan to find starting node
CREATE INDEX person_name ON Person(name);

-- Query uses index to find 'Alice', then traverses
MATCH (a:Person {name: 'Alice'})-[:KNOWS*2..3]->(friend)
RETURN friend.name;
```

## Graph Query Languages

### GQL (Graph Query Language)

ISO/IEC 39075:2024 standard implemented by Geode.

**Advantages**:
- International standard (like SQL for relational)
- Vendor-neutral
- Modern design (learned from SQL, Cypher, SPARQL)
- Pattern matching syntax
- Strong typing

```gql
-- GQL syntax
MATCH (a:Person)-[r:KNOWS]->(b:Person)
WHERE a.age > 30
RETURN a.name, b.name, r.since;
```

### Cypher

Neo4j's proprietary language (influenced GQL).

```cypher
-- Cypher syntax (very similar to GQL)
MATCH (a:Person)-[r:KNOWS]->(b:Person)
WHERE a.age > 30
RETURN a.name, b.name, r.since
```

### Gremlin

Apache TinkerPop's imperative traversal language.

```groovy
// Gremlin syntax (procedural)
g.V().hasLabel('Person')
  .has('age', gt(30))
  .outE('KNOWS')
  .inV()
  .path()
```

### SPARQL

W3C standard for RDF/semantic graphs.

```sparql
# SPARQL syntax (for RDF triples)
SELECT ?aName ?bName ?since
WHERE {
  ?a rdf:type :Person .
  ?a :knows ?b .
  ?a :age ?age .
  ?a :name ?aName .
  ?b :name ?bName .
  FILTER (?age > 30)
}
```

## Comparison with Other Database Types

### vs. Relational Databases (SQL)

| Aspect | Graph DB | Relational DB |
|--------|----------|---------------|
| **Model** | Nodes and relationships | Tables and foreign keys |
| **Relationships** | First-class citizens | Represented by joins |
| **Schema** | Flexible (optional) | Rigid (required) |
| **Joins** | Index-free adjacency | Expensive JOIN operations |
| **Use Case** | Connected data queries | Structured tabular data |
| **Performance** | Fast multi-hop traversals | Slow for deep joins |

**Example: Find friends of friends**

```gql
-- Graph DB: natural and fast
MATCH (me:Person {name: 'Alice'})-[:FRIEND]->(friend)-[:FRIEND]->(fof)
WHERE fof <> me
RETURN fof.name;
```

```sql
-- Relational: requires self-joins
SELECT f2.name
FROM persons me
JOIN friendships f1 ON me.id = f1.person1_id
JOIN persons friend ON f1.person2_id = friend.id
JOIN friendships f2 ON friend.id = f2.person1_id
JOIN persons fof ON f2.person2_id = fof.id
WHERE me.name = 'Alice' AND fof.id <> me.id;
```

### vs. Document Databases (MongoDB, etc.)

| Aspect | Graph DB | Document DB |
|--------|----------|-------------|
| **Relationships** | Explicit and navigable | Embedded or referenced |
| **Queries** | Pattern matching | Key-value or document lookup |
| **Consistency** | ACID (Geode) | Eventual (most) |
| **Use Case** | Relationship-heavy | Document-centric |

**Document DB Limitation**: Relationships require application-level joins or denormalization.

### vs. Key-Value Stores (Redis, DynamoDB)

| Aspect | Graph DB | Key-Value Store |
|--------|----------|-----------------|
| **Data Model** | Complex graph | Simple key-value pairs |
| **Query Power** | Rich pattern matching | Get by key only |
| **Relationships** | First-class | Not supported |
| **Performance** | Fast traversals | Fastest single-key lookup |

### vs. Other Graph Databases

**Geode vs. Neo4j**

- **Standards**: Geode uses GQL (ISO standard); Neo4j uses Cypher (proprietary)
- **Architecture**: Both native graph storage
- **ACID**: Both full ACID
- **Licensing**: Geode open-source Apache 2.0; Neo4j dual-licensed (GPL/commercial)

**Geode vs. Amazon Neptune**

- **Deployment**: Geode on-premise or any cloud; Neptune AWS-only
- **Query Language**: Geode GQL; Neptune Gremlin/SPARQL
- **Cost**: Geode open-source; Neptune pay-per-instance

**Geode vs. TigerGraph**

- **Language**: GQL vs. GSQL
- **Performance**: Both high-performance; different optimization strategies
- **ACID**: Geode full ACID; TigerGraph eventual consistency in distributed mode

## ACID Properties in Graph Databases

Geode implements full ACID compliance:

- **Atomicity**: Transactions are all-or-nothing
- **Consistency**: Data integrity constraints are enforced
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed data persists across failures

```gql
-- ACID transaction example
BEGIN TRANSACTION;

INSERT (u:User {id: 'u123', balance: 1000});
INSERT (u2:User {id: 'u456', balance: 500});

-- Transfer money atomically
MATCH (sender:User {id: 'u123'}), (receiver:User {id: 'u456'})
SET sender.balance = sender.balance - 100
SET receiver.balance = receiver.balance + 100;

COMMIT;
-- Either both updates happen, or neither does
```

## Getting Started with Graph Databases

### 1. Model Your Domain

Identify entities (nodes) and relationships:

- **Entities**: What are the "things" in your system?
- **Relationships**: How do these things connect?
- **Properties**: What attributes describe entities and relationships?

### 2. Install Geode

```bash
# Download and start Geode
cd geode
make build
geode serve --listen 0.0.0.0:3141
```

### 3. Create Your First Graph

```gql
-- Define your schema (optional in Geode)
INSERT (alice:Person {name: 'Alice', age: 30});
INSERT (bob:Person {name: 'Bob', age: 28});
INSERT (alice)-[:KNOWS {since: DATE '2020-01-01'}]->(bob);
```

### 4. Query Your Graph

```gql
-- Find Alice's friends
MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend)
RETURN friend.name, friend.age;
```

### 5. Explore and Iterate

Try different queries, add more data, experiment with patterns:

```gql
-- More complex pattern
MATCH (p:Person)-[:KNOWS]->(friend)-[:KNOWS]->(fof)
WHERE p.name = 'Alice' AND fof <> p
RETURN fof.name, count(*) AS connections
ORDER BY connections DESC;
```

## Best Practices

1. **Model Relationships Explicitly**: Don't hide relationships in properties
2. **Use Meaningful Relationship Types**: `KNOWS` is better than `RELATED_TO`
3. **Index Frequently Queried Properties**: Speed up node lookups
4. **Avoid Dense Nodes**: Nodes with millions of relationships can slow queries
5. **Use Parameterized Queries**: Enable query plan caching
6. **Monitor Query Performance**: Profile slow queries with PROFILE command

## Conclusion

Graph databases represent a paradigm shift from traditional relational databases, offering natural modeling and efficient querying of connected data. Geode's implementation of the ISO/IEC 39075:2024 GQL standard provides enterprise-grade graph capabilities with ACID guarantees, making it suitable for production workloads ranging from social networks to fraud detection to knowledge graphs.

Explore the documentation below to dive deeper into specific aspects of graph database theory, architecture, and practical implementation with Geode.
