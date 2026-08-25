---
title: "Query Optimization"
description: "Query performance tuning, indexing strategies, EXPLAIN/PROFILE analysis, and materialized views for Geode"
summary: "Optimize query performance with comprehensive guides covering indexing strategies, EXPLAIN/PROFILE analysis, full-text search, materialized views, and performance tuning techniques."
weight: 40
keywords:
  - query optimization
  - performance tuning
  - indexing
  - EXPLAIN
  - PROFILE
  - query plan
  - materialized views
  - full-text search
tags:
  - query-optimization
  - performance
  - indexing
  - tuning
categories:
  - query-optimization
  - performance
toc: true
params:
  seo:
    keywords: "query optimization, performance tuning, indexing, EXPLAIN, PROFILE, query plan, materialized views"
    description: "Optimize Geode query performance with indexing strategies, EXPLAIN/PROFILE analysis, and materialized views"
---

<!-- CANARY: REQ=REQ-GQL-024; FEATURE="Conformance Flagger"; ASPECT=ImplDefinedCollationAndNullOrdering; STATUS=TESTED; OWNER=engine; UPDATED=2025-09-21 -->

# Query Optimization

Master query optimization techniques to achieve maximum performance from Geode. This section covers indexing strategies, query analysis with EXPLAIN/PROFILE, materialized views, and performance tuning best practices.

## Overview

Query performance is critical for production applications. Geode provides powerful optimization tools including a cost-based optimizer (CBO), six index types, EXPLAIN/PROFILE analysis, and materialized views. Understanding these tools and applying optimization techniques can improve query performance by orders of magnitude.

The query optimizer automatically selects optimal execution plans based on statistics, but understanding index selection, query patterns, and execution plans enables you to design schemas and write queries that maximize performance. Whether you're optimizing a slow query or designing for performance from the start, this section provides the knowledge you need.

## Key Optimization Strategies

### Index Selection

Choose the right index type for your access patterns:

- **B-tree**: Range queries, sorting, ordered traversal
- **Hash**: Exact match lookups with O(1) average case
- **HNSW**: Vector similarity search (K-NN)
- **R-tree**: Geospatial queries (bounding box, radius)
- **Full-text**: Text search with BM25 ranking
- **Patricia Trie**: IP prefix matching (CIDR)

### Query Analysis

Use EXPLAIN and PROFILE to understand query execution:

- **EXPLAIN**: Shows query plan without execution
- **PROFILE**: Executes query and shows timing for each step
- **Statistics**: Review cardinality estimates and index selection

### Materialized Views

Cache expensive query results for fast repeated access:

- **Immediate Refresh**: Updates on data changes
- **Deferred Refresh**: Batch updates on schedule
- **On-Demand Refresh**: Manual refresh control

### Query Patterns

Write queries that leverage indexes and minimize work:

- Start patterns with selective filters
- Use indexes for joins and lookups
- Avoid unnecessary traversals
- Leverage prepared statements

## Topics in This Section

- **[EXPLAIN and PROFILE](/docs/query/explain-profile/)** - Understand query execution plans, analyze performance bottlenecks, and interpret optimizer decisions
- **[Indexing and Optimization](/docs/query/indexing-and-optimization/)** - Complete indexing guide covering all six index types, creation strategies, and optimization techniques
- **[Performance Tuning](/docs/query/performance-tuning/)** - Query performance tuning best practices including query rewriting, schema optimization, and system tuning
- **[Full-Text Search](/docs/query/full-text-search/)** - Full-text search capabilities with BM25 ranking, tokenization, stemming, and search optimization
- **[Materialized Views](/docs/query/materialized-views/)** - Materialized view patterns including creation, refresh strategies, and query rewriting

## Query Performance Basics

### Using EXPLAIN

Analyze query plans before execution:

```gql
-- Show query plan
EXPLAIN
MATCH (p:Person)-[:KNOWS]->(friend:Person)
WHERE p.age > 30
RETURN p.name, friend.name;
```

Output shows:

- Execution plan steps
- Index selection
- Estimated cardinality
- Join strategies

### Using PROFILE

Execute and measure query performance:

```gql
-- Execute with timing
PROFILE
MATCH (p:Person)-[:KNOWS]->(friend:Person)
WHERE p.age > 30
RETURN p.name, friend.name;
```

Output includes:

- All EXPLAIN information
- Actual execution time per step
- Rows processed at each stage
- Cache hit ratios

See [EXPLAIN and PROFILE](/docs/query/explain-profile/) for detailed usage.

## Index Optimization

### Creating Indexes

```gql
-- B-tree index for range queries
CREATE INDEX person_age_btree ON :Person(age);

-- Hash index for exact lookups
CREATE INDEX person_email_hash ON :Person(email) USING HASH;

-- HNSW index for vector search
CREATE INDEX product_embedding_hnsw
ON :Product(embedding)
USING HNSW WITH (metric = 'cosine');

-- Full-text index
CREATE INDEX article_content_fulltext
ON :Article(content)
USING FULLTEXT;
```

### Index Selection Guidelines

**Use B-tree** when:

- Range queries (age > 30, created_at BETWEEN ...)
- Sorting (ORDER BY)
- Prefix matching (name STARTS WITH 'A')

**Use Hash** when:

- Exact equality (`email = 'alice@example.com'`)
- High cardinality unique columns
- No range or sorting requirements

**Use HNSW** when:

- Vector similarity search
- Approximate K-NN queries
- Embedding-based retrieval

**Use R-tree** when:

- Geospatial queries
- Bounding box searches
- Radius searches

**Use Full-text** when:

- Text search queries
- Relevance ranking needed
- Natural language queries

**Use Patricia Trie** when:

- IP address queries
- CIDR prefix matching
- Longest Prefix Match (LPM)

See [Indexing and Optimization](/docs/query/indexing-and-optimization/) for comprehensive guidance.

## Query Tuning Techniques

### 1. Start with Selective Filters

```gql
-- Good: Start with selective filter
MATCH (p:Person {email: 'alice@example.com'})-[:KNOWS]->(friend)
RETURN friend.name;

-- Bad: Scan all people first
MATCH (p:Person)-[:KNOWS]->(friend:Person {email: 'alice@example.com'})
RETURN p.name;
```

### 2. Use Indexes for Joins

```gql
-- Ensure both sides of join have indexes
CREATE INDEX person_id ON :Person(id);
CREATE INDEX order_customer_id ON :Order(customer_id);

-- Query leverages both indexes
MATCH (p:Person {id: 123})<-[:PLACED_BY]-(o:Order)
RETURN o.order_id, o.total;
```

### 3. Limit Early

```gql
-- Good: LIMIT early reduces work
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name
ORDER BY p.age DESC
LIMIT 10;

-- Better: Use WITH to limit before expensive operations
MATCH (p:Person)
WHERE p.age > 30
WITH p
ORDER BY p.age DESC
LIMIT 10
MATCH (p)-[:KNOWS]->(friend)
RETURN p.name, collect(friend.name) AS friends;
```

### 4. Avoid Cartesian Products

```gql
-- Bad: Cartesian product (all people × all orders)
MATCH (p:Person), (o:Order)
WHERE p.id = o.customer_id
RETURN p.name, o.order_id;

-- Good: Use relationship pattern
MATCH (p:Person)<-[:PLACED_BY]-(o:Order)
RETURN p.name, o.order_id;
```

### 5. Use Prepared Statements

```gql
-- Prepared statement (parsed once, executed many times)
PREPARE find_person AS
MATCH (p:Person {email: $email})
RETURN p.name, p.age;

-- Execute with parameters
EXECUTE find_person(email='alice@example.com');
```

See [Performance Tuning](/docs/query/performance-tuning/) for advanced techniques.

## Materialized Views

Cache expensive query results:

```gql
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;

-- Query automatically uses materialized view
MATCH (p:Product)<-[:PURCHASED]-(o:Order)
RETURN p.product_id, p.name, count(*) AS purchase_count
ORDER BY purchase_count DESC
LIMIT 100;
```

Refresh strategies:

- **IMMEDIATE**: Updates on data changes (real-time)
- **DEFERRED**: Batch updates on schedule (periodic)
- **ON DEMAND**: Manual refresh (controlled)

See [Materialized Views](/docs/query/materialized-views/) for details.

## Full-Text Search

Optimize text search queries:

```gql
-- Create full-text index
CREATE INDEX article_fulltext ON :Article(title, content) USING FULLTEXT;

-- Text search with ranking
MATCH (a:Article)
WHERE a.content CONTAINS 'graph database'
RETURN a.title, score(a) AS relevance
ORDER BY relevance DESC
LIMIT 10;
```

Features:

- BM25 ranking algorithm
- Tokenization with stop words
- Stemming support
- Multi-field search

See [Full-Text Search](/docs/query/full-text-search/) for comprehensive coverage.

## Performance Monitoring

Track query performance over time:

```gql
-- Enable query timing
\timing on

-- View slow query log
-- There is no query-statistics table, slow-query log or plan cache to
-- query. Measure a specific statement with EXPLAIN / PROFILE, and scrape
-- aggregate counters from the Prometheus endpoint (GEODE_METRICS_PORT).
```

Monitor metrics:

- Query latency (p50, p95, p99)
- Query throughput (QPS)
- Error rates
- Cache hit ratios

See [Observability](/docs/ops/observability/) for monitoring setup.

## Best Practices

### Schema Design

- Create indexes for frequent query patterns
- Use unique constraints to prevent duplicates
- Consider denormalization for performance-critical paths
- Model relationships for primary query patterns

### Query Writing

- Start patterns with selective filters
- Use parameters instead of literals
- Avoid SELECT * patterns (return only needed properties)
- Use LIMIT to prevent runaway queries

### Index Management

- Create indexes for high-cardinality columns
- Drop unused indexes (overhead on writes)
- Monitor index usage statistics
- Rebuild indexes periodically

### Testing

- Profile queries before deploying to production
- Test with realistic data volumes
- Benchmark critical query paths
- Monitor performance regressions

## Troubleshooting Slow Queries

### Step 1: Identify Slow Queries

```bash
# Check slow query log
grep "slow query" /var/log/geode/geode.log

# Or query system tables
-- no slow-query log; use EXPLAIN / PROFILE and the Prometheus endpoint ORDER BY execution_time DESC;
```

### Step 2: Analyze with PROFILE

```gql
PROFILE <your slow query>;
```

Look for:

- Steps with high execution time
- Large row counts (potential full scans)
- Missing index usage
- Expensive joins

### Step 3: Review Index Coverage

```gql
-- Check available indexes
SHOW INDEXES;

-- Check index usage
-- SHOW INDEXES lists name, type, label and properties. Geode keeps no
-- per-index usage counters, scan tallies or health scores.
SHOW INDEXES;
```

### Step 4: Optimize

Based on PROFILE analysis:

- Add missing indexes
- Rewrite query to use indexes
- Break complex query into steps
- Consider materialized views

See [Troubleshooting Guide](/docs/guides/troubleshooting/) for more scenarios.

## Learn More

- [Architecture: Query Planning](/docs/architecture/#query-processing-pipeline) - How the query planner works
- [GQL Guide](/docs/gql/guide/) - Query language reference
- [Schema Design](/docs/guides/schema-design/) - Schema optimization patterns
- [Performance Benchmarking](/docs/guides/performance-benchmarking/) - Benchmark methodology

## Advanced Topics

- [Graph Algorithms](/docs/analytics/graph-algorithms/) - Optimize algorithm execution
- [Real-time Analytics](/docs/analytics/real-time-analytics/) - Streaming query optimization
- [Vector Search Tutorial](/docs/tutorials/vector-search-tutorial/) - Optimize vector queries
- [Index Optimization Tutorial](/docs/tutorials/index-optimization/) - Hands-on index tuning

## Next Steps

1. **[Learn EXPLAIN/PROFILE](/docs/query/explain-profile/)** - Master query analysis
2. **[Create Indexes](/docs/query/indexing-and-optimization/)** - Optimize your schema
3. **[Tune Queries](/docs/query/performance-tuning/)** - Apply optimization techniques
4. **[Use Materialized Views](/docs/query/materialized-views/)** - Cache expensive queries
5. **[Monitor Performance](/docs/ops/observability/)** - Track query metrics
