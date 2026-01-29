---
title: "Distributed Architecture Deep Dive"
description: "Comprehensive guide to Geode's distributed query coordination, federation, sharding, load balancing, and fault tolerance for enterprise-scale graph databases."
url: /docs/architecture/distributed-architecture/
keywords: ["distributed architecture", "query coordination", "federation", "sharding", "load balancing", "fault tolerance", "QUIC", "multi-shard queries", "distributed transactions", "cluster management"]
weight: 10
slug: "distributed-architecture"
canonical: "https://geodedb.com/docs/architecture/distributed-architecture/"
---

<!-- CANARY: REQ=REQ-DISTRIBUTED-001; FEATURE="Distributed Query Federation"; ASPECT=ModuleStructure; STATUS=TESTED; OWNER=distributed; UPDATED=2026-01-15 -->

Geode's distributed architecture enables enterprise-scale graph database deployments with transparent query coordination across multiple shards and nodes. This guide provides comprehensive coverage of the distributed query system, federation capabilities, sharding strategies, fault tolerance mechanisms, and performance optimization techniques.

## Overview

The distributed architecture implements a **scatter-gather** query model with sophisticated optimization, connection pooling, and result merging strategies. The system is designed for both OLTP (online transaction processing) and OLAP (online analytical processing) workloads with minimal network overhead and intelligent load distribution.

### Key Capabilities

- **Multi-Shard Execution**: Query distribution across up to 32 shards
- **Federation Support**: Transparent cross-cluster query execution
- **Intelligent Load Balancing**: Dynamic shard assignment and connection pooling
- **Fault Tolerance**: Automatic failover with retry mechanisms
- **Query Optimization**: Cost-based planning with distributed awareness
- **Result Merging**: Five strategies for efficient result aggregation
- **Connection Pooling**: Efficient connection reuse with health monitoring

## Architecture Components

### 1. Enhanced Query Coordinator

The Query Coordinator orchestrates distributed query execution with comprehensive optimization:

```zig
const coordinator = QueryCoordinator.init(allocator);
defer coordinator.deinit();

// Execute distributed query across shards
const result = try coordinator.executeDistributedQuery(
    "MATCH (p:Person) WHERE p.age > $min_age RETURN p.name, p.age",
    params,
    QueryOptions{
        .consistency_level = .eventual,
        .use_cache = true,
        .cache_ttl_ms = 300000,
        .timeout_ms = 30000,
    }
);
defer allocator.free(result.rows);
```

**Core Features**:
- Query analysis and shard targeting
- Advanced optimization with cost-based planning
- Five result merging strategies (union all, union distinct, merge sorted, hash aggregate, top-K)
- Query caching with configurable TTL
- Comprehensive metrics collection

### 2. Query Transport Layer

Manages reliable communication between coordinator and shard nodes using QUIC protocol:

```zig
var transport = QueryTransport.init(allocator);
defer transport.deinit();

// Configure transport settings
transport.timeout_ms = 45000;      // 45 second timeout
transport.retry_attempts = 5;      // 5 retry attempts

// Execute remote query with automatic retry
const response = try transport.executeRemoteQuery(
    node_id,
    query_text,
    params
);
defer allocator.free(response);
```

**Capabilities**:
- QUIC-based communication for low latency
- Connection pooling with automatic cleanup
- Exponential backoff retry logic
- Health monitoring and failover
- TLS encryption for secure transport

### 3. Connection Pool Management

Efficient connection reuse across distributed operations:

```zig
var pool = ConnectionPool.init(allocator, 20);  // 20 max connections
defer pool.deinit();

// Get connection with automatic creation
const connection = try pool.getConnection(node_id);

// Execute query on connection
const result = try connection.executeQuery(query, params);

// Return to pool (automatic via defer)
defer pool.releaseConnection(connection);
```

**Features**:
- Dynamic connection lifecycle management
- Health monitoring with automatic reconnection
- Connection timeout detection (10s heartbeat default)
- Configurable pool size (default: 20 connections)
- Thread-safe operation

## Query Distribution Model

### Scatter-Gather Execution

The coordinator analyzes queries to determine shard distribution strategy:

```gql
-- Single-shard query (fast path)
MATCH (p:Person {id: '12345'}) RETURN p;

-- Multi-shard query (scatter-gather)
MATCH (p:Person) WHERE p.age > 30 RETURN p.name, p.age;

-- Aggregation across shards (optimized merge)
MATCH (p:Person) RETURN COUNT(p) AS total;
```

**Execution Flow**:

1. **Query Analysis**: Parse query to identify shard requirements
2. **Shard Selection**: Determine target shards based on predicates
3. **Query Fragmentation**: Rewrite query for each shard context
4. **Parallel Execution**: Execute fragments concurrently
5. **Result Merging**: Combine results using appropriate strategy
6. **Response Assembly**: Return unified result to client

### Query Fragmentation

Queries are automatically rewritten for distributed execution:

```zig
// Original query
const original = "MATCH (p:Person) WHERE p.age > 30 RETURN p.name ORDER BY p.age LIMIT 10";

// Fragmented for shard execution
const fragments = try coordinator.fragmentQuery(original, shard_count);
// Each fragment: "MATCH (p:Person) WHERE p.age > 30 RETURN p.name, p.age ORDER BY p.age LIMIT 10"

// Coordinator merges top-K results from each shard
const final_result = try coordinator.topKResults(fragments, 10);
```

## Result Merging Strategies

The coordinator implements five specialized merge strategies optimized for different query patterns:

### 1. Union All (No Deduplication)

Fastest merge strategy, concatenates results without removing duplicates:

```zig
const result = try coordinator.unionAllResults(shard_results);
defer allocator.free(result.rows);
```

**Use Cases**:
- Read-only queries without DISTINCT clause
- Aggregations where duplicates don't affect results
- High-throughput scenarios prioritizing speed

**Performance**: O(n) - linear with total result size

### 2. Union Distinct (Deduplication)

Removes duplicate rows across shard results:

```zig
const result = try coordinator.unionDistinctResults(shard_results);
defer allocator.free(result.rows);
```

**Use Cases**:
- Queries with DISTINCT clause
- Identity-based queries requiring unique results
- Cross-shard uniqueness guarantees

**Performance**: O(n log n) - hash-based deduplication

### 3. Merge Sorted (Order Preservation)

Merges pre-sorted shard results maintaining global sort order:

```zig
const result = try coordinator.mergeSortedResults(
    shard_results,
    QueryOptions{ .limit = 100, .offset = 20 }
);
defer allocator.free(result.rows);
```

**Use Cases**:
- Queries with ORDER BY clause
- Pagination with LIMIT/OFFSET
- Top-K queries requiring global ordering

**Performance**: O(n log k) - k-way merge with heap

### 4. Hash Aggregate (Grouping)

Combines aggregation results using hash-based grouping:

```zig
const result = try coordinator.hashAggregateResults(
    shard_results,
    QueryOptions{ .limit = 50, .offset = 10 }
);
defer allocator.free(result.rows);
```

**Use Cases**:
- GROUP BY queries
- Distributed aggregations (COUNT, SUM, AVG, MIN, MAX)
- Summary statistics across shards

**Performance**: O(n) - single-pass hash aggregation

### 5. Top-K Optimization

Specialized merge for queries with ORDER BY + LIMIT:

```zig
const result = try coordinator.topKResults(shard_results, 100);
defer allocator.free(result.rows);
```

**Use Cases**:
- Leaderboard queries
- Recent items queries
- Ranking and scoring scenarios

**Performance**: O(k log k) - only processes top-K from each shard

## Sharding Strategies

### Hash-Based Sharding

Default sharding strategy using consistent hashing for predictable distribution:

```zig
// Node is assigned to shard based on hash of ID
const shard_id = hashShardId(node_id, total_shards);

// Query targeting specific shard
const result = try coordinator.executeOnShard(
    shard_id,
    "MATCH (p:Person {id: $id}) RETURN p",
    params
);
```

**Characteristics**:
- Deterministic shard assignment
- Uniform distribution across shards
- Fast single-shard lookups
- Efficient for key-based queries

### Range-Based Sharding

Partition data by value ranges (e.g., timestamps, IDs):

```gql
-- Query automatically routed to relevant shards
MATCH (e:Event)
WHERE e.timestamp >= date('2025-01-01')
  AND e.timestamp < date('2025-02-01')
RETURN e;
```

**Characteristics**:
- Preserves data locality
- Efficient for range queries
- Supports time-series workloads
- Risk of uneven distribution (hot shards)

### Graph Partitioning

Advanced partitioning minimizing cross-shard edges:

```gql
-- Co-locate connected nodes when possible
MATCH (u:User)-[:FOLLOWS]->(friend:User)
WHERE u.id = $user_id
RETURN friend;
```

**Characteristics**:
- Minimizes network I/O for traversals
- Optimizes for graph locality
- Reduces cross-shard joins
- Requires offline partitioning computation

## Federation and Cross-Cluster Queries

### Federation Setup

Configure federation to query across multiple Geode clusters:

```zig
// Register federated nodes
try coordinator.registerFederatedNode(FederatedNode{
    .node_id = 1,
    .address = "cluster1.example.com",
    .port = 3141,
    .is_primary = true,
});

try coordinator.registerFederatedNode(FederatedNode{
    .node_id = 2,
    .address = "cluster2.example.com",
    .port = 3141,
    .is_primary = false,
});
```

### Cross-Cluster Queries

Execute queries transparently across federated clusters:

```gql
-- Query spans both clusters
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.region = 'US' AND p.category = 'Electronics'
RETURN u.name, p.name, p.price;
```

**Coordinator handles**:
- Automatic cluster routing based on data locality
- Network topology awareness
- Cross-cluster join optimization
- Result aggregation from multiple clusters

### Streaming Federated Results

For large result sets, use streaming to reduce memory pressure:

```zig
// Callback for processing result chunks
fn handleResultChunk(chunk: ResultChunk) !void {
    for (chunk.rows) |row| {
        std.debug.print("Received row: {}\n", .{row});
    }

    if (chunk.is_final) {
        std.debug.print("Query completed\n", .{});
    }
}

// Execute streaming query
try transport.streamRemoteQuery(
    node_id,
    federated_query,
    handleResultChunk
);
```

## Load Balancing and Fault Tolerance

### Dynamic Load Balancing

The coordinator monitors shard load and distributes queries accordingly:

```zig
// Coordinator tracks shard statistics
const shard_stats = coordinator.getShardStatistics();

// Automatic routing to least-loaded shard for read-only queries
const result = try coordinator.executeWithLoadBalancing(
    "MATCH (p:Person) RETURN COUNT(p)",
    params,
    QueryOptions{ .read_preference = .least_loaded }
);
```

**Load Balancing Strategies**:
- **Round-robin**: Distribute evenly across all shards
- **Least-loaded**: Route to shard with lowest active query count
- **Latency-based**: Prefer shards with lowest response times
- **Locality-aware**: Route to geographically closest shard

### Automatic Failover

Connection failures trigger automatic retry with exponential backoff:

```zig
// Automatic retry with exponential backoff
var attempts: u32 = 0;
while (attempts < transport.retry_attempts) : (attempts += 1) {
    connection.send(data) catch |err| {
        if (attempts == transport.retry_attempts - 1) return err;

        // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
        const delay_ms = @as(u64, 100) << @intCast(attempts);
        std.time.sleep(delay_ms * std.time.ns_per_ms);
        continue;
    };

    break;  // Success
}
```

**Fault Tolerance Features**:
- Connection pool health monitoring
- Automatic reconnection on failure
- Exponential backoff retry (configurable attempts)
- Partial failure handling (return available results)
- Query timeout protection

### Partial Failure Handling

Gracefully handle scenarios where some shards fail:

```zig
const partial_results = coordinator.executeBatchQueries(node_queries) catch |err| switch (err) {
    error.PartialFailure => {
        // Some shards succeeded, others failed
        std.log.warn("Partial query failure - some shards unavailable");
        return partial_results;  // Return available data
    },
    else => return err,
};
```

## Performance Characteristics

### Query Execution Performance

Empirical performance data across different shard configurations:

| Operation Type | Single Node | 2 Shards | 4 Shards | 8 Shards | Scaling |
|---------------|-------------|----------|----------|----------|---------|
| Simple MATCH | 10ms | 15ms | 20ms | 30ms | Sub-linear |
| Ordered Query (ORDER BY) | 50ms | 75ms | 100ms | 150ms | Linear |
| Aggregation (COUNT, SUM) | 100ms | 60ms | 40ms | 30ms | Super-linear |
| Top-K (LIMIT) | 80ms | 50ms | 35ms | 25ms | Super-linear |

**Key Insights**:
- **Aggregations benefit most** from sharding (super-linear speedup)
- **Simple queries** have moderate overhead (sub-linear scaling)
- **Ordered queries** scale linearly with coordination cost
- **Top-K queries** show excellent scaling with distributed execution

### Memory Usage

Coordinator and transport layer memory characteristics:

- **Query Coordinator**: ~1-5MB base memory + ~100KB per active query
- **Connection Pool**: ~50KB per active connection
- **Query Cache**: ~10MB default (configurable via `GEODE_QUERY_CACHE_MAX_ENTRIES`)
- **Result Merging**: Memory scales with result set size and merge complexity

### Network Overhead

Network I/O characteristics for distributed queries:

- **Query Distribution**: ~1-5KB per shard (query + metadata)
- **Result Collection**: Variable based on result size
- **QUIC Connection Overhead**: ~2KB per connection
- **Retry Overhead**: 2-3x base overhead for failed operations

## Configuration

### Coordinator Configuration

Configure query coordinator behavior:

```zig
// Configure coordinator
coordinator.configure(CoordinatorConfig{
    .cache_enabled = true,
    .max_parallel_queries = 10,
});

// Set default query options
const default_options = QueryOptions{
    .consistency_level = .eventual,
    .use_cache = true,
    .cache_ttl_ms = 300000,  // 5 minutes
    .timeout_ms = 30000,     // 30 seconds
};
```

### Environment Variables

Configure distributed system via environment variables:

```bash
# Cluster configuration
export GEODE_CLUSTER_NAME=production-cluster
export GEODE_NODE_ID=1
export GEODE_MAX_SHARDS=16

# Performance tuning
export GEODE_QUERY_TIMEOUT_MS=30000
export GEODE_MAX_PARALLEL_QUERIES=10
export GEODE_CONNECTION_POOL_SIZE=20

# Caching
export GEODE_QUERY_CACHE_ENABLED=true
export GEODE_QUERY_CACHE_TTL_MS=300000
export GEODE_QUERY_CACHE_MAX_ENTRIES=1000

# Network settings
export GEODE_RETRY_ATTEMPTS=3
export GEODE_CONNECTION_TIMEOUT_MS=5000
export GEODE_HEARTBEAT_INTERVAL_MS=10000
```

### Server Configuration (YAML)

Configure distributed settings in server configuration file:

```yaml
cluster:
  name: production-cluster
  node_id: 1
  max_shards: 16

coordinator:
  cache_enabled: true
  max_parallel_queries: 10
  query_timeout_ms: 30000

transport:
  connection_pool_size: 20
  retry_attempts: 3
  connection_timeout_ms: 5000
  heartbeat_interval_ms: 10000

cache:
  enabled: true
  ttl_ms: 300000
  max_entries: 1000
```

## Monitoring and Metrics

### Coordinator Metrics

Comprehensive metrics for query coordination performance:

```zig
// Get coordinator metrics
const metrics = coordinator.getMetrics();

// Example metrics structure:
{
  "coordinator": {
    "total_queries": 15420,
    "total_time_ms": 1245000,
    "average_time_ms": 80.7,
    "cache_hit_ratio": 0.73,
    "shard_queries": 61680,
    "average_shards_per_query": 4.0,
    "merge_time_ms": 89000,
    "average_merge_time_ms": 5.8
  },
  "transport": {
    "active_connections": 8,
    "total_connections": 12,
    "failed_connections": 2,
    "retry_count": 45,
    "timeout_count": 3
  }
}
```

**Key Metrics**:
- **total_queries**: Total distributed queries executed
- **cache_hit_ratio**: Percentage of queries served from cache
- **average_shards_per_query**: Average number of shards queried
- **average_merge_time_ms**: Average time spent merging results
- **retry_count**: Number of connection retries
- **timeout_count**: Number of query timeouts

### Health Monitoring

Monitor connection pool health:

```zig
// Connection health monitoring
for (pool.connections) |connection| {
    if (!connection.isHealthy()) {
        std.log.warn("Unhealthy connection to node {d}", .{connection.node_id});

        // Automatic recovery handled by connection pool
        // Manual intervention: pool.removeConnection(connection.node_id);
    }
}
```

**Health Indicators**:
- Connection heartbeat responses (10s default interval)
- Query timeout rates
- Retry attempt frequency
- Network error patterns

### Performance Profiling

Use PROFILE to analyze distributed query execution:

```gql
PROFILE MATCH (p:Person) WHERE p.age > 30 RETURN p.name, p.age;
```

**Profile Output**:
```
Query Plan:
├─ Distributed Coordinator (30ms total)
│  ├─ Query Analysis (2ms)
│  ├─ Shard Selection (1ms, 4 shards targeted)
│  ├─ Parallel Execution (20ms)
│  │  ├─ Shard 1: 18ms (245 rows)
│  │  ├─ Shard 2: 20ms (312 rows)
│  │  ├─ Shard 3: 19ms (289 rows)
│  │  └─ Shard 4: 17ms (198 rows)
│  └─ Result Merging (7ms, union all strategy, 1044 rows)
└─ Total: 30ms, 1044 rows returned
```

## Distributed Transactions

### Two-Phase Commit (2PC)

Coordinate transactions across multiple shards:

```zig
// Begin distributed transaction
const distributed_txn = try txn_coordinator.beginDistributedTransaction(
    participating_nodes,
    isolation_level
);

// Execute queries within transaction
const result = try coordinator.executeDistributedQuery(
    query,
    params,
    QueryOptions{ .transaction_id = distributed_txn.id }
);

// Two-phase commit across shards
try txn_coordinator.commitDistributedTransaction(distributed_txn);
```

**2PC Protocol**:
1. **Prepare Phase**: Coordinator sends PREPARE to all participants
2. **Vote Collection**: Wait for YES/NO votes from participants
3. **Commit/Abort**: Send COMMIT (all YES) or ABORT (any NO)
4. **Acknowledgment**: Wait for final ACKs from participants

### Distributed Transaction Isolation

Support for distributed MVCC with Serializable Snapshot Isolation (SSI):

```gql
-- Begin distributed transaction with SSI
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Multi-shard write operations
CREATE (u:User {id: '12345', name: 'Alice', shard: 1});
CREATE (p:Product {id: '67890', name: 'Laptop', shard: 2});
CREATE (u)-[:PURCHASED]->(p);

COMMIT;
```

**Isolation Guarantees**:
- Snapshot isolation across all shards
- Distributed deadlock detection
- Phantom read prevention via predicate locking
- Cross-shard consistency validation

## Security in Distributed Queries

### Authentication and Authorization

Distributed queries inherit authentication context:

```zig
// Authenticate distributed query
const auth_context = try security.authenticateDistributedQuery(
    user_credentials,
    target_nodes
);

// Execute with security context
const result = try coordinator.executeDistributedQueryWithAuth(
    query,
    params,
    auth_context
);
```

**Security Features**:
- TLS encryption for all inter-node communication
- Authentication propagation to all shards
- Row-Level Security (RLS) policy enforcement on each shard
- Audit logging for distributed operations

### Network Security

All distributed communication uses QUIC with TLS 1.3:

```bash
# Configure TLS for cluster communication
export GEODE_CLUSTER_TLS_CERT=/path/to/cluster-cert.pem
export GEODE_CLUSTER_TLS_KEY=/path/to/cluster-key.pem
export GEODE_CLUSTER_TLS_CA=/path/to/ca-cert.pem
```

**Security Guarantees**:
- End-to-end encryption
- Mutual TLS authentication
- Certificate validation
- Perfect forward secrecy

## Best Practices

### Query Design for Distribution

Optimize queries for distributed execution:

```gql
-- ❌ Bad: No shard targeting (full scan)
MATCH (p:Person) RETURN p;

-- ✅ Good: Predicate enables shard targeting
MATCH (p:Person {id: $user_id}) RETURN p;

-- ✅ Good: Range predicates for shard pruning
MATCH (e:Event)
WHERE e.timestamp >= $start AND e.timestamp < $end
RETURN e;
```

### Pagination Strategies

Use efficient pagination for distributed queries:

```gql
-- ❌ Bad: Large offset requires processing all skipped rows
MATCH (p:Person)
RETURN p.name
ORDER BY p.name
LIMIT 10 OFFSET 10000;

-- ✅ Good: Cursor-based pagination (stateful)
MATCH (p:Person)
WHERE p.name > $last_seen_name
RETURN p.name
ORDER BY p.name
LIMIT 10;
```

### Connection Pool Tuning

Size connection pool based on workload:

```bash
# Low-concurrency workload (10-20 connections)
export GEODE_CONNECTION_POOL_SIZE=15

# High-concurrency workload (50-100 connections)
export GEODE_CONNECTION_POOL_SIZE=75

# Monitor pool utilization
# - If pool is frequently exhausted: increase size
# - If most connections idle: decrease size
```

### Cache Configuration

Tune query cache based on query patterns:

```bash
# Read-heavy workload with repeated queries
export GEODE_QUERY_CACHE_ENABLED=true
export GEODE_QUERY_CACHE_TTL_MS=600000  # 10 minutes
export GEODE_QUERY_CACHE_MAX_ENTRIES=5000

# Write-heavy workload with unique queries
export GEODE_QUERY_CACHE_ENABLED=false

# Mixed workload
export GEODE_QUERY_CACHE_ENABLED=true
export GEODE_QUERY_CACHE_TTL_MS=60000   # 1 minute
export GEODE_QUERY_CACHE_MAX_ENTRIES=1000
```

## Troubleshooting

### Query Timeout Issues

**Symptom**: Queries failing with timeout errors

```bash
# Increase query timeout
export GEODE_QUERY_TIMEOUT_MS=60000  # 60 seconds

# Increase connection timeout
export GEODE_CONNECTION_TIMEOUT_MS=10000  # 10 seconds

# Enable retry with more attempts
export GEODE_RETRY_ATTEMPTS=5
```

### Partial Failure Scenarios

**Symptom**: Some shards unavailable, partial results returned

```gql
-- Check coordinator metrics for failed connections
-- Review transport layer errors in logs

-- Temporary mitigation: reduce shard count
export GEODE_MAX_SHARDS=8  # Reduce from 16

-- Long-term fix: investigate shard failures
-- Check network connectivity, shard health, resource limits
```

### High Network Overhead

**Symptom**: Excessive network traffic, slow query performance

```bash
# Enable query result compression (future enhancement)
# Reduce result set size with projections

# Optimize queries to minimize cross-shard operations
# Use shard-aware queries when possible
```

### Connection Pool Exhaustion

**Symptom**: "No available connections" errors

```bash
# Increase connection pool size
export GEODE_CONNECTION_POOL_SIZE=50

# Monitor active connections
# Review query patterns for connection leaks
# Check for long-running transactions holding connections
```

## Related Documentation

- **[Query Performance Tuning](/docs/query/performance-tuning/)** - Optimize distributed query performance
- **[Server Configuration](/docs/configuration/server-configuration/)** - Complete server configuration reference
- **[Advanced Transaction Patterns](/docs/transactions/advanced-patterns/)** - Distributed transaction strategies
- **[Troubleshooting Guide](/docs/guides/troubleshooting/)** - Common distributed system issues

## Summary

Geode's distributed architecture provides enterprise-grade scalability with:

- **Transparent Distribution**: Query coordination across up to 32 shards
- **Intelligent Optimization**: Cost-based planning with distributed awareness
- **Fault Tolerance**: Automatic failover and retry mechanisms
- **Performance**: Super-linear speedup for aggregations and top-K queries
- **Security**: TLS-encrypted communication with authentication propagation
- **Flexibility**: Multiple sharding strategies and merge algorithms

The system is production-ready with comprehensive monitoring, configurable behavior, and extensive testing (97.4% test pass rate). Use EXPLAIN and PROFILE commands to analyze distributed query execution and optimize performance for your specific workload.
