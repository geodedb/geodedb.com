---
title: "Tutorials and Examples"
slug: "overview"
url: "/docs/tutorials/overview/"
description: "Step-by-step tutorials for Geode: MATCH basics, indexing and EXPLAIN/PROFILE, graph algorithms, embeddings, and backup/restore workflows"
weight: 10
tags:
  - tutorials
  - examples
  - learning
categories:
  - tutorials
keywords:
  - geode tutorial
  - graph database tutorial
  - MATCH tutorial
  - HNSW tutorial
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Tutorials and Examples

Hands-on learning paths with executable examples and expected outputs.

## Getting Started Tutorials

### 1. MATCH Basics (10 minutes)

Learn fundamental pattern matching:

**Create sample data**:

```gql
CREATE GRAPH SocialNetwork;
USE SocialNetwork;

CREATE
  (:Person {name: "Alice", age: 30}),
  (:Person {name: "Bob", age: 25}),
  (:Person {name: "Charlie", age: 35});

MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS {since: 2020}]->(b);
```

**Basic queries**:

```gql
-- Match all people
MATCH (p:Person)
RETURN p.name, p.age;

-- Match with predicate
MATCH (p:Person)
WHERE p.age > 26
RETURN p.name;

-- Match relationship
MATCH (a:Person)-[k:KNOWS]->(b:Person)
RETURN a.name, b.name, k.since;
```

**Expected output**:

```
name     | age
---------|----
Alice    | 30
Bob      | 25
Charlie  | 35
```

See [GQL Guide](/docs/gql/guide) for complete syntax.

### 2. Indexing and Query Optimization (15 minutes)

Learn to create indexes and use EXPLAIN/PROFILE:

**Step 1: Identify slow query**

```gql
PROFILE
MATCH (p:Person)
WHERE p.age > 25
RETURN p.name;
```

Output shows `SeqScan` (sequential scan) → slow for large datasets.

**Step 2: Create index**

```gql
CREATE INDEX person_age_idx ON Person(age) USING btree;
```

**Step 3: Verify index usage**

```gql
EXPLAIN
MATCH (p:Person)
WHERE p.age > 25
RETURN p.name;
```

Now shows `IndexScan [person_age_idx]` → fast!

**Step 4: Compare performance**

```gql
PROFILE
MATCH (p:Person)
WHERE p.age > 25
RETURN p.name;
```

See execution time improvement with indexes.

See [Indexing and Optimization](/docs/query/indexing-and-optimization) for details.

### 3. Graph Algorithms Quickstart (20 minutes)

Run PageRank on social network:

**Setup**:

```gql
-- Use social network from Tutorial 1
USE SocialNetwork;

-- Add more connections
MATCH (b:Person {name: "Bob"}), (c:Person {name: "Charlie"})
CREATE (b)-[:KNOWS]->(c);
```

**Run PageRank**:

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
---------|-------
Bob      | 0.385
Charlie  | 0.315
Alice    | 0.300
```

Bob has highest PageRank (receives 2 connections).

See [Graph Algorithms](/docs/analytics/graph-algorithms) for more algorithms.

### 4. Vector Similarity Search (25 minutes)

Generate embeddings and find similar items:

**Create item graph**:

```gql
CREATE GRAPH ProductCatalog;
USE ProductCatalog;

CREATE
  (:Product {id: 1, name: "Laptop"}),
  (:Product {id: 2, name: "Mouse"}),
  (:Product {id: 3, name: "Keyboard"}),
  (:Product {id: 4, name: "Monitor"});

-- Co-purchase relationships
MATCH (laptop:Product {name: "Laptop"}), (mouse:Product {name: "Mouse"})
CREATE (laptop)-[:CO_PURCHASED]->(mouse);

MATCH (laptop:Product {name: "Laptop"}), (monitor:Product {name: "Monitor"})
CREATE (laptop)-[:CO_PURCHASED]->(monitor);
```

**Generate embeddings**:

Geode stores and searches embeddings but does not train them — there is no
`graph.node2vec` procedure. Export the co-purchase edges, train in your own
pipeline, then write the vectors back:

```gql
-- Export the edge list for the trainer
MATCH (a:Product)-[:CO_PURCHASED]->(b:Product)
RETURN id(a) AS source, id(b) AS target;

-- Write a client-computed embedding back onto the product
MATCH (p:Product) WHERE id(p) = $node_id
SET p.embedding = vectorf32($embedding);
```

**Create vector index**:

```gql
CREATE INDEX product_embedding_idx ON Product(embedding) USING vector;
```

**Find similar products**:

```gql
MATCH (laptop:Product {name: "Laptop"})
MATCH (similar:Product)
WHERE similar.id <> laptop.id
  AND distance(similar.embedding, laptop.embedding, 'cosine') < 0.5
RETURN similar.name, distance(similar.embedding, laptop.embedding, 'cosine') AS distance
ORDER BY distance ASC;
```

**Expected output**:
Mouse and Monitor (co-purchased with Laptop) have low distance.

See [Data Model and Types](/docs/model/data-model-and-types) for vector types.

### 5. Backup and Restore Workflow (10 minutes)

Protect your data with backups:

**Local backup**:

```bash
# Create backup
./geode backup --output /backups/social-network-$(date +%Y%m%d).tar.gz

# Verify backup
ls -lh /backups/
```

**S3 backup** (requires AWS credentials):

```bash
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."

# Backup to S3
./geode backup --dest s3://my-bucket/geode-backups/backup-$(date +%Y%m%d).tar.gz
```

**Restore**:

```bash
# Restore from local backup
./geode restore \
  --input /backups/social-network-20240115.tar.gz \
  --data-dir /var/lib/geode

# Restore from S3
./geode restore \
  --source s3://my-bucket/geode-backups/backup-20240115.tar.gz \
  --data-dir /var/lib/geode
```

See [Deployment Guide](/docs/ops/deployment#backups) for automation.

## Advanced Tutorials

### Transaction Isolation with Savepoints

Learn MVCC and SSI with practical examples:

```gql
START TRANSACTION;

CREATE (:Account {id: 1, balance: 1000});
SAVEPOINT sp1;

CREATE (:Account {id: 2, balance: 500});
SAVEPOINT sp2;

-- Transfer $100
MATCH (a1:Account {id: 1})
SET a1.balance = a1.balance - 100;

MATCH (a2:Account {id: 2})
SET a2.balance = a2.balance + 100;

-- Verify
MATCH (a:Account)
RETURN a.id, a.balance;

COMMIT;
```

See [Transactions Overview](/docs/transactions/overview) for ACID semantics.

### Full-Text Search with BM25 Ranking

Build a document search engine:

```gql
CREATE GRAPH DocumentSearch;
USE DocumentSearch;

CREATE
  (:Document {id: 1, title: "Graph Databases Explained", content: "Graph databases store data as nodes and relationships..."}),
  (:Document {id: 2, title: "Introduction to GQL", content: "GQL is the ISO standard query language for graph databases..."});

-- Create full-text index
CREATE INDEX doc_content_idx ON Document(content) USING fulltext;

-- Search with BM25 ranking
MATCH (d:Document)
CALL geode.fts.search('document_content', 'graph database')
YIELD node, score
MATCH (d:Document) WHERE id(d) = node
RETURN d.title, score AS relevance
ORDER BY relevance DESC;
```

See [Indexing and Optimization](/docs/query/indexing-and-optimization) for BM25 details.

## Next Steps

- [GQL Guide](/docs/gql/guide) - Complete language reference
- [Graph Algorithms](/docs/analytics/graph-algorithms) - Algorithm catalog
- [Use Case Guides](/docs/use-cases/overview) - Domain-specific patterns
- [API Reference](/docs/reference/cli-and-api) - CLI and functions
