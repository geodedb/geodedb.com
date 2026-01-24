---
title: "Tutorials"
description: "Hands-on tutorials for learning Geode covering MATCH patterns, REPL usage, transactions, indexing, and graph algorithms"
summary: "Step-by-step tutorials covering GQL basics, REPL features, transaction patterns, index optimization, vector search, and graph algorithms with practical examples."
weight: 20
keywords:
  - tutorials
  - learning
  - hands-on
  - MATCH patterns
  - REPL tutorial
  - transaction tutorial
  - indexing tutorial
  - vector search
  - graph algorithms
tags:
  - tutorials
  - learning
  - getting-started
  - hands-on
categories:
  - tutorials
  - getting-started
toc: true
params:
  seo:
    keywords: "geode tutorials, graph database tutorial, GQL tutorial, REPL tutorial, transaction patterns, vector search, graph algorithms"
    description: "Hands-on tutorials for learning Geode with step-by-step guides covering queries, transactions, indexing, and graph algorithms"
---

# Tutorials

Learn Geode through hands-on, step-by-step tutorials covering everything from basic queries to advanced graph algorithms. Each tutorial builds practical skills with real-world examples.

## Overview

These tutorials are designed for learning by doing. Whether you're new to graph databases or an experienced developer, these guides provide structured, progressive learning paths from basics to advanced topics.

Each tutorial includes complete working examples, expected outputs, and exercises to reinforce learning. Follow tutorials sequentially for a comprehensive learning path, or jump to specific topics as needed.

## Learning Paths

### Beginner Path

1. **[REPL Basics](repl-basics/)** - Get comfortable with the interactive shell
2. **[MATCH Basics](match-basics/)** - Learn fundamental graph queries
3. **[Tutorial Overview](overview/)** - Understand the tutorial structure

### Intermediate Path

4. **[Transaction Patterns](transaction-patterns-tutorial/)** - Master ACID transactions
5. **[Indexing Tutorial](indexing-tutorial/)** - Optimize query performance
6. **[Index Optimization](index-optimization/)** - Advanced index strategies

### Advanced Path

7. **[Vector Search](vector-search-tutorial/)** - Implement similarity search
8. **[Graph Algorithms](graph-algorithms-tutorial/)** - Apply graph algorithms

## Topics in This Section

- **[Tutorial Overview](overview/)** - Introduction to the tutorial series with learning objectives and prerequisites
- **[REPL Basics](repl-basics/)** - Interactive shell fundamentals including commands, query execution, and meta commands
- **[MATCH Basics](match-basics/)** - Core pattern matching concepts with node patterns, relationship patterns, and filtering
- **[Transaction Patterns](transaction-patterns-tutorial/)** - ACID transactions with BEGIN/COMMIT/ROLLBACK, savepoints, and error handling
- **[Indexing Tutorial](indexing-tutorial/)** - Index creation and usage covering all six index types
- **[Index Optimization](index-optimization/)** - Advanced index optimization including EXPLAIN analysis and performance tuning
- **[Vector Search Tutorial](vector-search-tutorial/)** - Similarity search with HNSW indexes, embeddings, and K-NN queries
- **[Graph Algorithms Tutorial](graph-algorithms-tutorial/)** - Practical guide to PageRank, community detection, shortest paths, and centrality

## Tutorial Format

Each tutorial follows a consistent structure:

### 1. Learning Objectives

What you'll learn and prerequisites:

```
Objectives:
- Understand pattern matching syntax
- Write basic MATCH queries
- Filter results with WHERE

Prerequisites:
- Geode installed and running
- Basic SQL knowledge helpful but not required
```

### 2. Concepts

Core concepts explained with examples:

```gql
-- Node pattern
(variable:Label {property: value})

-- Explanation: Matches nodes with Label and property
```

### 3. Hands-On Exercises

Practice with working examples:

```gql
-- Exercise 1: Find all people
MATCH (p:Person)
RETURN p.name;

-- Expected output:
┌─────────┐
│ p.name  │
├─────────┤
│ Alice   │
│ Bob     │
│ Charlie │
└─────────┘
```

### 4. Common Pitfalls

Learn from common mistakes:

```gql
-- Wrong: Missing variable
MATCH (:Person)
RETURN name;  -- Error: name not bound

-- Right: Use variable
MATCH (p:Person)
RETURN p.name;
```

### 5. Next Steps

Suggested follow-up learning:

```
Next: Learn about relationship patterns in [MATCH Basics](match-basics/)
```

## Quick Start Tutorial

### Set Up Sample Data

```gql
-- Create a social network
CREATE GRAPH SocialNetwork;
USE SocialNetwork;

-- Create people
CREATE (:Person {name: "Alice", age: 30, city: "Seattle"});
CREATE (:Person {name: "Bob", age: 25, city: "Portland"});
CREATE (:Person {name: "Charlie", age: 35, city: "Seattle"});

-- Create relationships
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS {since: 2020}]->(b);

MATCH (b:Person {name: "Bob"}), (c:Person {name: "Charlie"})
CREATE (b)-[:KNOWS {since: 2021}]->(c);

MATCH (a:Person {name: "Alice"}), (c:Person {name: "Charlie"})
CREATE (a)-[:KNOWS {since: 2019}]->(c);
```

### Basic Queries

```gql
-- Query 1: Find all people
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY p.age;

-- Query 2: Find Alice's friends
MATCH (alice:Person {name: "Alice"})-[:KNOWS]->(friend)
RETURN friend.name;

-- Query 3: Find people in Seattle
MATCH (p:Person)
WHERE p.city = "Seattle"
RETURN p.name;

-- Query 4: Count relationships
MATCH ()-[k:KNOWS]->()
RETURN count(k) AS friendship_count;
```

### Using the REPL

```bash
# Start interactive shell
geode shell

# Enable timing
\timing on

# Run query
MATCH (p:Person) RETURN p.name;

# Check execution time
-- Query executed in 0.523ms

# Exit
\quit
```

## Tutorial Highlights

### REPL Basics Tutorial

Master the interactive shell:

- **Meta Commands**: `\help`, `\connect`, `\timing`, `\format`
- **Query Execution**: Single-line and multi-line queries
- **Output Formats**: Text tables and JSON
- **Transaction Control**: `\begin`, `\commit`, `\rollback`
- **History**: Command history and search

**See**: [REPL Basics](repl-basics/)

### MATCH Basics Tutorial

Learn pattern matching:

- **Node Patterns**: `(n:Label {property: value})`
- **Relationship Patterns**: `-[:TYPE]->`, `<-[:TYPE]-`, `-[:TYPE]-`
- **Path Patterns**: `(a)-[:KNOWS*1..3]->(b)`
- **Filtering**: WHERE clauses with complex conditions
- **Aggregation**: COUNT, SUM, AVG, MIN, MAX

**See**: [MATCH Basics](match-basics/)

### Transaction Patterns Tutorial

Master ACID transactions:

- **Basic Transactions**: BEGIN, COMMIT, ROLLBACK
- **Isolation Levels**: Read Committed to Serializable
- **Savepoints**: Partial rollback within transaction
- **Error Handling**: Retry logic for serialization errors
- **Patterns**: Optimistic concurrency, pessimistic locking

**See**: [Transaction Patterns](transaction-patterns-tutorial/)

### Indexing Tutorial

Optimize query performance:

- **Index Types**: B-tree, Hash, HNSW, R-tree, Full-text, Patricia Trie
- **Index Creation**: CREATE INDEX syntax for each type
- **Index Usage**: EXPLAIN to verify index selection
- **Performance**: Before/after index benchmarks
- **Maintenance**: Index statistics and rebuilding

**See**: [Indexing Tutorial](indexing-tutorial/)

### Index Optimization Tutorial

Advanced index strategies:

- **EXPLAIN Analysis**: Understand query plans
- **PROFILE Analysis**: Measure actual performance
- **Composite Indexes**: Multi-column indexes
- **Partial Indexes**: Filtered indexes for subsets
- **Index Selection**: When to use each index type

**See**: [Index Optimization](index-optimization/)

### Vector Search Tutorial

Implement similarity search:

- **HNSW Indexes**: High-performance approximate search
- **Embeddings**: Generate and store vector embeddings
- **K-NN Queries**: Find similar items
- **Distance Metrics**: L2, cosine, dot product
- **Hybrid Search**: Combine vector and keyword search

**See**: [Vector Search Tutorial](vector-search-tutorial/)

### Graph Algorithms Tutorial

Apply graph algorithms:

- **PageRank**: Identify important nodes
- **Community Detection**: Find clusters
- **Shortest Paths**: Dijkstra and A* algorithms
- **Centrality**: Betweenness, closeness, degree
- **Practical Examples**: Social networks, recommendations

**See**: [Graph Algorithms Tutorial](graph-algorithms-tutorial/)

## Sample Datasets

### Social Network

```gql
-- Create sample social network (10 people)
CREATE (:Person {name: "Alice", age: 30, interests: ["hiking", "reading"]});
CREATE (:Person {name: "Bob", age: 25, interests: ["gaming", "cooking"]});
CREATE (:Person {name: "Charlie", age: 35, interests: ["hiking", "photography"]});
-- ... 7 more people

-- Create friendships
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS {since: 2020}]->(b);
-- ... more relationships
```

### E-Commerce

```gql
-- Products and categories
CREATE (:Product {sku: "WIDGET-001", name: "Widget", price: 29.99});
CREATE (:Category {name: "Widgets"});

-- Customers and orders
CREATE (:Customer {id: 1, name: "Alice", email: "alice@example.com"});
CREATE (:Order {order_id: "ORD-001", total: 59.98, status: "shipped"});

-- Relationships
MATCH (p:Product {sku: "WIDGET-001"}), (c:Category {name: "Widgets"})
CREATE (p)-[:IN_CATEGORY]->(c);
```

### Knowledge Graph

```gql
-- Entities
CREATE (:Person {name: "Alan Turing", born: 1912, died: 1954});
CREATE (:Concept {name: "Computer Science"});
CREATE (:Institution {name: "University of Cambridge"});

-- Relationships
MATCH (p:Person {name: "Alan Turing"}), (c:Concept {name: "Computer Science"})
CREATE (p)-[:CONTRIBUTED_TO]->(c);
```

## Exercise Solutions

Each tutorial includes exercises with solutions:

### Example Exercise

**Exercise**: Find people who have at least 2 friends.

**Solution**:
```gql
MATCH (p:Person)-[:KNOWS]->(friend)
WITH p, count(friend) AS friend_count
WHERE friend_count >= 2
RETURN p.name, friend_count
ORDER BY friend_count DESC;
```

**Explanation**:
- MATCH finds all friendships
- WITH aggregates friends per person
- WHERE filters for 2+ friends
- RETURN shows results

## Best Practices Learned

Throughout tutorials, you'll learn:

### Query Writing

- Start with selective filters
- Use LIMIT to prevent runaway queries
- Return only needed properties
- Use parameters instead of literals

### Performance

- Create indexes for frequent queries
- Use EXPLAIN before optimizing
- Profile production queries
- Monitor query patterns

### Data Modeling

- Model relationships explicitly
- Use labels for categorization
- Choose appropriate property types
- Denormalize for performance

### Transactions

- Keep transactions short
- Handle errors gracefully
- Use appropriate isolation level
- Implement retry logic

## Common Patterns

### Find Friends of Friends

```gql
MATCH (me:Person {name: "Alice"})-[:KNOWS*2]->(fof)
WHERE fof <> me
RETURN DISTINCT fof.name;
```

### Recommendation Engine

```gql
MATCH (me:Person {name: "Alice"})-[:LIKES]->(item)<-[:LIKES]-(other)
MATCH (other)-[:LIKES]->(recommendation)
WHERE NOT (me)-[:LIKES]->(recommendation)
RETURN recommendation.name, count(*) AS score
ORDER BY score DESC
LIMIT 10;
```

### Shortest Path

```gql
MATCH path = shortestPath(
  (a:Person {name: "Alice"})-[*]-(b:Person {name: "Bob"})
)
RETURN path, length(path) AS hops;
```

## Troubleshooting Tips

### Query Not Returning Results

1. Verify data exists: `MATCH (n) RETURN count(n);`
2. Check labels: `MATCH (n) RETURN DISTINCT labels(n);`
3. Simplify pattern: Remove constraints one by one
4. Use EXPLAIN: Verify query plan

### Slow Queries

1. Check for indexes: `SHOW INDEXES;`
2. Use PROFILE: Identify bottlenecks
3. Create missing indexes
4. Limit result size

### Transaction Errors

1. Check isolation level
2. Implement retry logic
3. Reduce transaction scope
4. Check for deadlocks

## Learn More

After completing tutorials:

- **[GQL Guide](/docs/gql/guide/)** - Complete language reference
- **[Data Model](/docs/model/data-model-and-types/)** - Graph modeling in depth
- **[Query Optimization](/docs/query/performance-tuning/)** - Advanced optimization
- **[Use Cases](/docs/use-cases/)** - Real-world applications
- **[API Reference](/docs/reference/api-reference-complete/)** - Complete API documentation

## Next Steps

Start your learning journey:

1. **[Begin with REPL Basics](repl-basics/)** - Get comfortable with the shell
2. **[Learn MATCH Patterns](match-basics/)** - Master graph queries
3. **[Practice Transactions](transaction-patterns-tutorial/)** - Ensure data consistency
4. **[Optimize with Indexes](indexing-tutorial/)** - Improve performance
5. **[Explore Advanced Topics](graph-algorithms-tutorial/)** - Apply algorithms

## Contributing Tutorials

Have a tutorial idea? Contributions welcome!

See [Contributing Guide](/docs/contribute/) for how to submit new tutorials or improvements.
