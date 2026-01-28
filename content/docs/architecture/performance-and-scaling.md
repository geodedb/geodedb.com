---
title: "Performance and Scalability"
description: "Understand Geode's performance architecture (storage, planner, indexes) and how distributed query coordination scales across shards over QUIC+TLS"
weight: 20
tags:
  - performance
  - scaling
  - distributed
  - architecture
categories:
  - performance-and-scaling
  - architecture
keywords:
  - graph database performance
  - distributed graph database
  - QUIC
  - HNSW SIMD
---

<!-- CANARY: REQ=REQ-PERF-PHASE1-001; FEATURE="PerfPhase1"; ASPECT=Optimization; STATUS=TESTED; OWNER=performance; UPDATED=2026-01-16 -->

# Performance and Scalability

Learn how Geode achieves high performance through optimized storage, query planning, indexing, and distributed coordination.

## Performance Pillars

### 1. Storage: Memory-Mapped I/O

From `SERVER_FEATURES.md`:

**Memory-mapped I/O** provides efficient storage access:

- **Direct memory access**: Pages mapped directly into process address space
- **OS page cache**: Leverage kernel page cache for hot data
- **Zero-copy reads**: No buffer copying between kernel and user space
- **Write coalescing**: Batch writes to reduce fsync() calls

### 2. Query: Cost-Based Optimizer (CBO)

**CBO selects optimal execution plans** based on:

- **Statistics**: Row counts, cardinality, value distributions
- **Index availability**: Which indexes exist and selectivity
- **Join cost estimation**: Relationship fanout estimates

**Example**:

```gql
EXPLAIN
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.age > 25
RETURN p.name, friend.name;
```

**Plan**:
```
Project [p.name, friend.name]
  Expand [(p)-[:KNOWS]->(friend)]
    Filter [p.age > 25]
      IndexScan [Person.age] (uses: person_age_idx)
```

**Without index**:
```
Project [p.name, friend.name]
  Expand [(p)-[:KNOWS]->(friend)]
    Filter [p.age > 25]
      SeqScan [Person]  -- Slow!
```

### 3. Indexing: IndexOptimizer

From `SERVER_FEATURES.md`:

**IndexOptimizer** selects best index for each predicate:

- **Predicate analysis**: Identify filterable predicates
- **Index applicability**: Match predicates to available indexes
- **Selectivity estimation**: Estimate fraction of rows matched
- **Cost comparison**: Compare index scan vs sequential scan

**Specialized index implementations**:

| Index Type | Implementation | Complexity |
|------------|----------------|------------|
| **B-tree** | Optimized B+ tree | O(log N) |
| **Hash** | Chained hash table | O(1) |
| **Full-text** | Inverted index + BM25 | Varies by query |
| **HNSW (vector)** | SIMD-accelerated ANN | O(log N) |
| **R-tree (spatial)** | Hilbert curve ordering | O(log N) |
| **Patricia trie** | IP prefix matching | O(k) where k = prefix length |

### 4. HNSW SIMD Acceleration

From `SERVER_FEATURES.md`:

**Vector similarity** with SIMD:

- **AVX2/AVX-512 instructions**: Vectorized distance calculations
- **Batch processing**: Compute multiple distances in parallel
- **Multi-core scaling**: Parallel query execution

### 5. BM25 Full-Text Optimization

From `BM25_INDEX_OPTIMIZER_INTEGRATION.md`:

**BM25 ranking** integrated with optimizer:

- **Index-aware planning**: Use full-text index when `ORDER BY bm25_score()`
- **Early termination**: Stop after top-K results
- **Parallel scoring**: Multi-threaded relevance computation

## Distributed Scaling Model

From `DISTRIBUTED_QUERY_COORDINATION.md`:

### Architecture

```
┌─────────────────┐
│  Client Query   │
└────────┬────────┘
         │
┌────────▼────────┐
│  Coordinator    │  -- Query planning and result merging
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    │         │        │        │
┌───▼───┐ ┌──▼───┐ ┌──▼───┐ ┌──▼───┐
│Shard 1│ │Shard2│ │Shard3│ │Shard4│  -- Data partitions
└───────┘ └──────┘ └──────┘ └──────┘
```

### Distributed Query Execution

1. **Client** sends GQL query to **coordinator**
2. **Coordinator** parses query and determines which shards to query
3. **Parallel execution** on all relevant shards
4. **Result merging** with deterministic ordering
5. **Return** merged result to client

**Example**:

```gql
-- Federated query
EXPLAIN FEDERATION
MATCH (p:Person {city: "NYC"})-[:KNOWS]->(friend)
RETURN p.name, friend.name;
```

**Execution plan**:
```
Merge [ORDER BY p.name]
  │
  ├─ Query Shard 1: MATCH (p:Person {city: "NYC"})-[:KNOWS]->(f) RETURN p.name, f.name
  ├─ Query Shard 2: MATCH (p:Person {city: "NYC"})-[:KNOWS]->(f) RETURN p.name, f.name
  ├─ Query Shard 3: MATCH (p:Person {city: "NYC"})-[:KNOWS]->(f) RETURN p.name, f.name
  └─ Query Shard 4: MATCH (p:Person {city: "NYC"})-[:KNOWS]->(f) RETURN p.name, f.name
```

### Optimization Techniques

**Predicate pushdown**:
```gql
-- Coordinator pushes filter to shards (reduce network transfer)
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.city = "NYC"
RETURN p.name, friend.name;

-- Each shard executes:
MATCH (p:Person {city: "NYC"})-[:KNOWS]->(friend)
RETURN p.name, friend.name;
-- Not: MATCH (p:Person)-[:KNOWS]->(friend) then filter
```

**Parallel execution**:
- All shard queries run **concurrently**
- **Barrier synchronization**: Wait for all shards to complete
- **Streaming results**: Return rows as they arrive (for large result sets)

**Deterministic ordering**:
- Shards return results in **local order**
- Coordinator **merges** with global ordering (e.g., `ORDER BY p.name`)
- **Consistent pagination** across queries

## Transport: QUIC+TLS

**QUIC** provides modern, efficient transport:

- **Multiplexing**: Multiple queries over single connection (no head-of-line blocking)
- **0-RTT handshake**: Resume connections instantly
- **Built-in encryption**: TLS 1.3 integrated
- **UDP-based**: Lower latency than TCP

**Performance** vs TCP:
- **Connection setup**: 0-RTT (vs 1-3 RTT for TCP+TLS)
- **Head-of-line blocking**: None (vs significant for TCP)
- **Packet loss recovery**: Independent streams (vs entire connection blocked)

**No TCP fallback**: Geode requires QUIC (ensure UDP port open).

## Scaling Guidelines

### Single-Node Sizing

**Recommended single-node sizing**:
- **Memory**: 64GB+ (for large datasets with in-memory cache)
- **CPU**: 8+ cores (for parallel query execution)
- **Storage**: NVMe SSD (for memory-mapped I/O)

### Distributed Cluster

- **Shards**: Up to 32 shards with automatic coordination
- **Vector search**: HNSW with SIMD-optimized distance calculations

**Shard count guidance**:
- **Small datasets**: Single node
- **Medium datasets**: 2-4 shards
- **Large datasets**: 8-16 shards

## How to Benchmark

### Query Benchmarking

```bash
# Use PROFILE to measure actual performance
./geode query "PROFILE MATCH (p:Person)-[:KNOWS]->(friend) RETURN p.name, friend.name"

# Extract metrics
# - Execution time
# - Rows scanned
# - Index usage
# - Cache hit ratio
```

### Load Testing

```bash
# Generate realistic workload
# 1000 concurrent users, 10,000 queries each
./geode-loadtest \
  --users 1000 \
  --queries 10000 \
  --query-file workload.gql

# Monitor metrics
watch -n 1 'curl -s http://localhost:8080/metrics | grep geode_query_duration'
```

### Scaling Tests

```bash
# Test distributed query performance
# Run same query on 1, 2, 4, 8 shards
for shards in 1 2 4 8; do
  echo "Testing with $shards shards"
  ./geode-distributed-test --shards $shards --query-file workload.gql
done

# Compare throughput scaling
# Expected: near-linear up to 4-8 shards
```

## Performance Tuning Checklist

### 1. Index All Predicates

```gql
-- Before: Sequential scan
MATCH (p:Person) WHERE p.email = "[email protected]" RETURN p;

-- After: Hash index
CREATE INDEX person_email_idx ON Person(email) USING hash;
MATCH (p:Person) WHERE p.email = "[email protected]" RETURN p;
-- Uses index for fast lookup
```

### 2. Use Appropriate Index Type

```gql
-- Range queries: B-tree
CREATE INDEX person_age_idx ON Person(age) USING btree;

-- Equality: Hash
CREATE INDEX person_id_idx ON Person(id) USING hash;

-- Text search: Full-text
CREATE INDEX doc_content_idx ON Document(content) USING fulltext;

-- Vector similarity: HNSW
CREATE INDEX item_embedding_idx ON Item(embedding) USING vector;
```

### 3. Tune Page Cache

```yaml
# geode.yaml
storage:
  page_cache_size: '4GB'  -- Increase for larger datasets
```

**Guidance**:
- **Small datasets** (<1GB): 1GB cache
- **Medium datasets** (1-10GB): 2-4GB cache
- **Large datasets** (>10GB): 8-16GB cache

### 4. Monitor Cache Hit Ratio

```bash
# Check cache efficiency
curl http://localhost:8080/metrics | grep geode_storage_cache_hit_ratio

# Target: >80% for hot queries
# If low: Increase page_cache_size
```

### 5. Limit Result Sets

```gql
-- Bad: Return all results
MATCH (p:Person) RETURN p;

-- Good: Paginate
MATCH (p:Person)
RETURN p
ORDER BY p.name
LIMIT 100;
```

## Next Steps

- [Indexing and Optimization](/docs/query/indexing-and-optimization) - Index creation and usage
- [Deployment Guide](/docs/ops/deployment) - Distributed cluster setup
- [Monitoring and Telemetry](/docs/ops/observability) - Performance metrics
- [GQL Guide](/docs/gql/guide) - Query optimization patterns
