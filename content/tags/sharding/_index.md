---
title: "Data Sharding"
description: "Comprehensive guide to data sharding in Geode, covering shard key selection, horizontal sharding strategies, shard management, and techniques for distributing graph data across multiple database instances."
keywords:
  - data sharding
  - shard key
  - horizontal sharding
  - shard management
  - distributed data
  - graph sharding
  - Geode sharding
  - shard rebalancing
  - shard distribution
  - multi-shard queries
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/sharding/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Data Sharding

Data sharding is a horizontal partitioning technique that distributes data across multiple independent database instances (shards) to achieve massive scale. While partitioning divides data within a cluster, sharding creates completely separate database instances that can operate independently. Geode provides sophisticated sharding capabilities that enable organizations to scale graph databases to billions of nodes and petabytes of data while maintaining query performance and operational simplicity.

## Understanding Data Sharding

Sharding involves splitting a large dataset into smaller, more manageable pieces called shards. Each shard is a fully functional database instance that stores a subset of the total data. Unlike replication, where each node contains all data, sharding distributes unique data subsets across shards.

**Key Characteristics**:
- Each shard contains unique data (no overlap by default)
- Shards can operate independently for single-shard operations
- Cross-shard operations require coordination
- Horizontal scaling achieved by adding more shards

For graph databases, sharding must carefully consider graph structure to minimize cross-shard relationships that impact query performance.

## Sharding vs. Partitioning

While often used interchangeably, sharding and partitioning have subtle differences:

**Partitioning**:
- Logical division within a cluster
- Partitions share cluster-wide metadata
- Typically managed automatically
- Transparent to applications

**Sharding**:
- Physical division into separate instances
- Each shard is independent database
- Requires explicit shard routing
- May require application awareness

Geode supports both approaches and can combine them for optimal scalability.

## Shard Key Selection

The shard key determines how data is distributed across shards. Choosing the right shard key is critical for performance and scalability.

### Shard Key Criteria

**Cardinality**: High cardinality ensures even distribution.

```yaml
sharding:
  shard_key:
    # Good: High cardinality
    property: "user_id"  # UUID or unique ID

    # Poor: Low cardinality
    # property: "country"  # Limited values
```

**Query Patterns**: Align with common access patterns.

```yaml
sharding:
  shard_key:
    # For user-centric queries
    property: "user_id"

    # For time-series data
    # property: "timestamp"
    # strategy: "range"
```

**Data Distribution**: Ensure balanced shard sizes.

```yaml
sharding:
  shard_key:
    property: "user_id"

    # Monitor distribution
    monitoring:
      track_distribution: true
      alert_imbalance_threshold: 0.3  # 30%
```

### Common Shard Key Strategies

#### Hash-Based Sharding

Use hash function for uniform distribution:

```yaml
sharding:
  strategy: "hash"

  hash:
    # Hash algorithm
    algorithm: "murmur3"

    # Shard key
    shard_key:
      node_property: "id"

    # Number of shards
    shard_count: 16

    # Consistent hashing for elasticity
    consistent_hashing:
      enabled: true
      virtual_shards: 256
```

**Hash Function**:
```
shard_id = hash(shard_key) % shard_count
```

**Advantages**:
- Uniform distribution
- Simple and predictable
- No hotspots

**Disadvantages**:
- Range queries require all shards
- Resharding requires data movement
- Cannot leverage data locality

#### Range-Based Sharding

Partition by value ranges:

```yaml
sharding:
  strategy: "range"

  range:
    shard_key:
      node_property: "created_at"

    # Define shard boundaries
    shards:
      - id: "shard_2024_q1"
        min: "2024-01-01"
        max: "2024-03-31"

      - id: "shard_2024_q2"
        min: "2024-04-01"
        max: "2024-06-30"

      - id: "shard_2024_q3"
        min: "2024-07-01"
        max: "2024-09-30"

      - id: "shard_2024_q4"
        min: "2024-10-01"
        max: "2024-12-31"
```

**Advantages**:
- Efficient range queries
- Natural for time-series data
- Predictable data placement

**Disadvantages**:
- Risk of hotspots
- Requires range boundary management
- May need rebalancing

#### Geography-Based Sharding

Distribute by geographic location:

```yaml
sharding:
  strategy: "geographic"

  geographic:
    shard_key:
      node_property: "region"

    # Define geographic shards
    shards:
      - id: "shard_us_east"
        regions: ["us-east-1", "us-east-2"]

      - id: "shard_us_west"
        regions: ["us-west-1", "us-west-2"]

      - id: "shard_eu"
        regions: ["eu-west-1", "eu-central-1"]

      - id: "shard_apac"
        regions: ["ap-southeast-1", "ap-northeast-1"]

    # Locality optimization
    locality:
      prefer_local_shard: true
      cross_region_latency_penalty: 100  # ms
```

**Advantages**:
- Data locality for users
- Compliance with data residency
- Reduced latency

**Disadvantages**:
- Uneven distribution by population
- Complex cross-region queries
- Regulatory complexity

#### Entity-Based Sharding

Shard by entity type or tenant:

```yaml
sharding:
  strategy: "entity"

  entity:
    # Shard by tenant for multi-tenancy
    shard_key:
      node_property: "tenant_id"

    # Dynamic shard assignment
    assignment:
      strategy: "tenant_size_aware"

      # Large tenants get dedicated shards
      dedicated_shard_threshold: 1000000  # nodes

      # Small tenants share shards
      shared_shard_capacity: 10000000  # nodes
```

**Advantages**:
- Natural isolation boundaries
- Easy compliance and backup
- Predictable per-entity performance

**Disadvantages**:
- Potential imbalance
- Difficult cross-entity queries
- Shard proliferation

## Shard Configuration

### Basic Sharding Setup

Configure sharding for a Geode deployment:

```yaml
# geode-shard-config.yaml
sharding:
  enabled: true

  # Sharding strategy
  strategy: "hash"
  shard_count: 16

  # Shard key configuration
  shard_key:
    node_property: "user_id"
    hash_algorithm: "murmur3"

  # Shard metadata
  metadata_store:
    type: "distributed"
    replication_factor: 3

  # Shard instances
  shards:
    - id: "shard_0"
      address: "shard0.example.com:3141"
      weight: 100

    - id: "shard_1"
      address: "shard1.example.com:3141"
      weight: 100

    # ... (shards 2-14)

    - id: "shard_15"
      address: "shard15.example.com:3141"
      weight: 100
```

### Shard Router Configuration

Configure routing layer for query distribution:

```yaml
# geode-router-config.yaml
router:
  enabled: true

  # Router nodes
  instances:
    - address: "router1.example.com:3141"
    - address: "router2.example.com:3141"
    - address: "router3.example.com:3141"

  # Routing strategy
  routing:
    # Cache shard metadata
    metadata_cache:
      enabled: true
      ttl_seconds: 300
      size_mb: 256

    # Connection pooling to shards
    connection_pool:
      size_per_shard: 50
      max_size: 1000

    # Query routing
    query_routing:
      # Single-shard optimization
      detect_single_shard: true

      # Cross-shard parallelism
      cross_shard_parallelism: 8

      # Timeout settings
      shard_timeout_ms: 30000
      total_timeout_ms: 60000
```

## Shard Operations

### Creating Shards

Initialize new shards:

```bash
# Create new shard
geode shard create \
  --shard-id=shard_16 \
  --address=shard16.example.com:3141 \
  --shard-key-property=user_id \
  --hash-range=0x0000-0x0FFF

# Initialize shard database
geode shard init \
  --shard-id=shard_16 \
  --storage-path=/var/lib/geode/shard_16

# Register shard with router
geode shard register \
  --shard-id=shard_16 \
  --router=router1.example.com:3141
```

### Shard Management

Monitor and manage shards:

```bash
# List all shards
geode shard list

# View shard status
geode shard status --shard-id=shard_0

# Check shard distribution
geode shard distribution --show-imbalance

# View shard metadata
geode shard metadata --shard-id=shard_0

# Health check all shards
geode shard health-check --all
```

### Shard Rebalancing

Rebalance data across shards:

```bash
# Analyze shard balance
geode shard analyze-balance \
  --output=balance-report.json

# Create rebalancing plan
geode shard rebalance-plan \
  --target-imbalance=0.1 \
  --output=rebalance-plan.json

# Execute rebalancing
geode shard rebalance \
  --plan=rebalance-plan.json \
  --max-data-movement=500GB \
  --bandwidth-limit=1Gbps \
  --verify=true

# Monitor rebalancing progress
geode shard rebalance-status
```

### Adding Shards (Resharding)

Scale out by adding new shards:

```bash
# Plan resharding from 16 to 32 shards
geode shard reshard-plan \
  --current-shards=16 \
  --target-shards=32 \
  --strategy=split \
  --output=reshard-plan.json

# Preview data movement
geode shard reshard-preview \
  --plan=reshard-plan.json

# Execute resharding
geode shard reshard \
  --plan=reshard-plan.json \
  --online=true \
  --verification=true

# The process:
# 1. Create new shards
# 2. Split existing shard ranges
# 3. Migrate data to new shards
# 4. Update routing metadata
# 5. Verify data consistency
# 6. Switch traffic to new configuration
```

## Query Routing

### Single-Shard Queries

Queries that access single shard are most efficient:

```gql
-- Query with shard key (routes to single shard)
MATCH (u:User {id: $user_id})-[:POSTED]->(p:Post)
WHERE u.id = $user_id
RETURN p.content, p.created
ORDER BY p.created DESC
LIMIT 20;

-- Shard routing: shard_id = hash(user_id) % shard_count
-- Executes on single shard only
```

### Cross-Shard Queries

Queries spanning multiple shards require coordination:

```gql
-- Cross-shard query (fan-out to all shards)
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE p.created > '2024-01-01'
RETURN u.name, p.content, p.created
ORDER BY p.created DESC
LIMIT 100;

-- Execution:
-- 1. Router broadcasts query to all shards
-- 2. Each shard executes local query
-- 3. Router merges and sorts results
-- 4. Returns top 100 results
```

### Shard-Aware Query Optimization

Optimize queries for sharded environment:

```gql
-- Poor: No shard key (requires all shards)
MATCH (u:User)
WHERE u.email = $email
RETURN u;

-- Better: Include shard key hint
MATCH (u:User)
WHERE u.id = $user_id AND u.email = $email
RETURN u;

-- Best: Query by shard key
MATCH (u:User {id: $user_id})
RETURN u;

-- Multi-shard with batching
UNWIND $user_ids AS user_id
MATCH (u:User {id: user_id})
RETURN u;
-- Router batches by shard for efficiency
```

## Cross-Shard Operations

### Distributed Transactions

Handle transactions spanning multiple shards:

```yaml
sharding:
  distributed_transactions:
    # Two-phase commit
    protocol: "2pc"

    # Coordinator configuration
    coordinator:
      timeout_ms: 30000
      retry_attempts: 3

    # Participant configuration
    participant:
      prepare_timeout_ms: 10000
      commit_timeout_ms: 5000
```

```gql
-- Multi-shard transaction
BEGIN TRANSACTION;

-- Update on shard 1
MATCH (u1:User {id: $user1_id})
SET u1.balance = u1.balance - $amount;

-- Update on shard 2
MATCH (u2:User {id: $user2_id})
SET u2.balance = u2.balance + $amount;

-- Coordinator ensures both commit or both rollback
COMMIT;
```

### Cross-Shard Relationships

Handle relationships spanning shards:

```yaml
sharding:
  cross_shard_relationships:
    # Strategy for cross-shard edges
    strategy: "reference"

    # Reference mode: Store edge reference
    reference:
      # Store relationship metadata
      metadata_store: "source_shard"

      # Lazy loading for cross-shard navigation
      lazy_loading: true

      # Cache cross-shard relationships
      cache:
        enabled: true
        size_mb: 1024
        ttl_seconds: 600
```

```gql
-- Cross-shard relationship traversal
MATCH (u1:User {id: $user_id})-[:FOLLOWS]->(u2:User)
RETURN u2.name;

-- Execution:
-- 1. Find u1 on local shard
-- 2. Identify cross-shard relationships
-- 3. Fetch u2 from remote shard
-- 4. Return results
```

## Monitoring and Observability

### Shard Metrics

Track shard health and performance:

```yaml
monitoring:
  shard_metrics:
    enabled: true

    metrics:
      # Per-shard metrics
      - name: "shard_size_bytes"
        type: "gauge"
        labels: ["shard_id"]

      - name: "shard_node_count"
        type: "gauge"
        labels: ["shard_id"]

      - name: "shard_query_rate"
        type: "gauge"
        labels: ["shard_id"]

      - name: "shard_latency_p95_ms"
        type: "gauge"
        labels: ["shard_id"]

      # Cross-shard metrics
      - name: "cross_shard_queries_total"
        type: "counter"

      - name: "cross_shard_latency_ms"
        type: "histogram"

      # Shard balance metrics
      - name: "shard_imbalance_ratio"
        type: "gauge"
```

Key metrics to monitor:

- `geode_shard_size_variance`: Data distribution balance
- `geode_shard_query_imbalance`: Query distribution skew
- `geode_cross_shard_query_ratio`: Percentage of cross-shard queries
- `geode_shard_rebalance_progress`: Resharding progress
- `geode_shard_availability`: Per-shard uptime

### Diagnostic Commands

```bash
# Analyze shard statistics
geode shard stats \
  --shard-id=all \
  --metrics=size,queries,latency

# Identify hot shards
geode shard hot-shards \
  --threshold-qps=10000

# View cross-shard query patterns
geode shard cross-shard-analysis \
  --window=1h

# Check shard connectivity
geode shard connectivity-test \
  --all-pairs

# Export shard configuration
geode shard export-config \
  --output=shard-config.yaml
```

## Best Practices

### Shard Key Selection

1. **Choose High Cardinality**: Ensure many unique values for even distribution

2. **Align with Access Patterns**: Shard by most common query filter

3. **Avoid Hotspots**: Don't use sequential keys or time-based keys for writes

4. **Consider Growth**: Choose key that scales with data growth

5. **Test Distribution**: Simulate with production-like data before deployment

### Operational Best Practices

- Start with conservative shard count (8-16 shards)
- Plan resharding strategy before initial deployment
- Monitor shard balance continuously
- Implement automated shard health checks
- Document shard topology and routing logic
- Test cross-shard query performance
- Maintain shard homogeneity (same hardware)

### Performance Optimization

- Minimize cross-shard queries through smart shard key selection
- Use read replicas per shard for read scaling
- Implement query result caching at router layer
- Batch multi-shard operations when possible
- Co-locate related data on same shard
- Use connection pooling between router and shards

## Troubleshooting

### Common Sharding Issues

**Unbalanced Shards**: Some shards much larger than others.

*Solution*: Analyze shard key distribution, consider hash-based sharding, trigger rebalancing.

**High Cross-Shard Query Rate**: Too many queries spanning shards.

*Solution*: Review shard key choice, optimize query patterns, add shard key hints to queries.

**Shard Hotspots**: One shard receiving disproportionate traffic.

*Solution*: Identify hot keys, split hot shard, use read replicas for hot shard.

**Resharding Downtime**: Service interruption during shard addition.

*Solution*: Use online resharding, implement gradual cutover, maintain dual-write during transition.

### Diagnostic Queries

```gql
-- Check shard distribution for key
CALL dbms.shard.route('user_id', $user_id)
YIELD shard_id;

-- View shard statistics
CALL dbms.shard.stats()
YIELD shard_id, size_bytes, node_count, query_rate;

-- Analyze cross-shard relationships
CALL dbms.shard.cross_shard_edges()
YIELD count, percentage;

-- Find queries requiring multiple shards
CALL dbms.shard.multi_shard_queries()
YIELD query_text, shard_count, frequency;
```

## Related Topics

- [Partitioning](/tags/partitioning/) - Graph partitioning strategies
- [Clustering](/tags/clustering/) - Database clustering configuration
- [Scalability](/tags/scalability/) - Horizontal scaling approaches
- [Replication](/tags/replication/) - Data replication strategies
- [Distributed](/tags/distributed/) - Distributed systems architecture
- [Performance](/tags/performance/) - Query performance optimization

## Further Reading

- [Distributed Architecture](/docs/architecture/distributed-architecture/) - Distributed systems design
- [Performance and Scaling](/docs/architecture/performance-and-scaling/) - Scaling strategies
- [Schema Design Guide](/docs/guides/schema-design/) - Data modeling best practices
