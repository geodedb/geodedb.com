---
title: "Tag: Scaling"
description: "Scale Geode for enterprise workloads. Learn horizontal and vertical scaling strategies, replication patterns, sharding techniques, capacity planning, and production scaling best practices for high-availability graph databases."
keywords:
  - scaling
  - Geode scalability
  - horizontal scaling
  - vertical scaling
  - database scaling
  - replication
  - sharding
  - load balancing
  - high availability
  - capacity planning
  - performance scaling
  - distributed databases
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/scaling/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Documentation tagged with **scaling** in the Geode graph database. This comprehensive collection covers scaling strategies, capacity planning, replication patterns, sharding techniques, and best practices for building highly scalable graph database deployments that handle enterprise workloads.

## Overview

Scaling is essential for growing graph applications that need to handle increasing data volumes, higher query throughput, or greater concurrent user loads. Geode provides multiple scaling strategies to meet different performance and availability requirements, from simple vertical scaling to complex distributed architectures.

Scaling dimensions:

- **Data Volume**: Growing graph size (nodes and edges)
- **Query Throughput**: Increasing queries per second
- **Concurrent Users**: More simultaneous connections
- **Geographic Distribution**: Multi-region deployments
- **High Availability**: Redundancy and fault tolerance

## Scaling Strategies

### Vertical Scaling

Scale up by adding resources to a single server:

**When to Use**:

- Data fits on a single machine (size depends on hardware and indexing)
- Simple operational requirements
- Cost-effective for small to medium workloads
- No application changes needed

**Implementation**:

```yaml
# Before: Small instance
# - 4 vCPUs
# - 16 GB RAM
# - 500 GB SSD
# Performance: workload dependent (benchmark-specific)

# After: Large instance
# - 32 vCPUs
# - 256 GB RAM
# - 2 TB NVMe SSD
# Performance: workload dependent (benchmark-specific)
```

**Configuration for Vertical Scaling**:

```yaml
# geode.yaml - Optimized for large single server
server:
  worker_threads: 32  # Match vCPU count
  max_connections: 2000

performance:
  index_cache_size: 128GB  # 50% of RAM
  query_cache_size: 50000
  worker_pool_size: 64

storage:
  buffer_pool_size: 64GB
  checkpoint_interval: 15m
```

**Benefits**:

- Simple architecture
- No data partitioning complexity
- ACID guarantees preserved
- Lower operational overhead

**Limitations**:

- Single point of failure
- Limited by hardware maximum
- Expensive at large scale
- Downtime for upgrades

### Horizontal Scaling (Read Replicas)

Add read-only replicas to distribute query load:

**Architecture**:

```
┌─────────────┐
│   Primary   │ ← Writes
│   (Master)  │
└──────┬──────┘
       │
       │ Replication
       │
   ┌───┴────┬────────┬────────┐
   │        │        │        │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│Rep 1│ │Rep 2│ │Rep 3│ │Rep 4│ ← Reads
└─────┘ └─────┘ └─────┘ └─────┘
```

**Setup**:

```bash
# Start primary node
geode serve \
  --listen 0.0.0.0:3141 \
  --data-dir /data/primary \
  --role primary

# Start read replicas
geode serve \
  --listen 0.0.0.0:3141 \
  --data-dir /data/replica1 \
  --role replica \
  --primary-host primary.example.com:3141

geode serve \
  --listen 0.0.0.0:3141 \
  --data-dir /data/replica2 \
  --role replica \
  --primary-host primary.example.com:3141
```

**Application Configuration**:

```go
// Go client with read replicas
import "geodedb.com/geode"

// Configure connection pool with read replicas
config := &geode.Config{
    Primary: "primary.example.com:3141",
    Replicas: []string{
        "replica1.example.com:3141",
        "replica2.example.com:3141",
        "replica3.example.com:3141",
    },
    ReadPreference: geode.ReadPreferenceReplica,
}

db, err := geode.Connect(config)

// Writes go to primary
db.Exec("CREATE (u:User {name: 'Alice'})")

// Reads load-balanced across replicas
db.Query("MATCH (u:User) RETURN u")
```

**Benefits**:

- Increase read throughput linearly
- High availability (replicas can failover)
- Geographic distribution
- Read-heavy workloads scale well

**Limitations**:

- Write throughput limited by primary
- Replication lag (eventual consistency)
- Storage duplication
- Complexity increases with replica count

### Horizontal Scaling (Sharding)

Partition data across multiple nodes:

**Sharding Strategies**:

**1. Label-Based Sharding**:

```yaml
# Partition by node type
sharding:
  strategy: label
  shards:
    - name: shard1
      labels: [User, Profile]
      servers: [shard1.example.com:3141]

    - name: shard2
      labels: [Product, Category]
      servers: [shard2.example.com:3141]

    - name: shard3
      labels: [Order, Payment]
      servers: [shard3.example.com:3141]
```

**2. Hash-Based Sharding**:

```yaml
# Partition by ID hash
sharding:
  strategy: hash
  shards: 8
  key_property: id
  servers:
    - shard1.example.com:3141
    - shard2.example.com:3141
    - shard3.example.com:3141
    - shard4.example.com:3141
    - shard5.example.com:3141
    - shard6.example.com:3141
    - shard7.example.com:3141
    - shard8.example.com:3141
```

**3. Range-Based Sharding**:

```yaml
# Partition by property ranges
sharding:
  strategy: range
  key_property: created_at
  shards:
    - name: historical
      range: [null, 2023-01-01]
      servers: [historical.example.com:3141]

    - name: recent
      range: [2023-01-01, 2025-01-01]
      servers: [recent.example.com:3141]

    - name: current
      range: [2025-01-01, null]
      servers: [current.example.com:3141]
```

**Cross-Shard Queries**:

```gql
// Query spanning multiple shards
// Coordinator routes to all shards and merges results
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.region = 'West'
RETURN u.name, p.name
ORDER BY u.created_at DESC
LIMIT 100;

// Execution:
// 1. Parse query at coordinator
// 2. Send sub-queries to relevant shards
// 3. Merge results at coordinator
// 4. Apply ORDER BY and LIMIT
// 5. Return to client
```

**Benefits**:

- Scale beyond single machine limits
- Distribute both reads and writes
- Handle massive datasets (billions of nodes)
- Geographic data locality

**Limitations**:

- Complex operationally
- Cross-shard queries slower
- Rebalancing data is expensive
- Transaction guarantees limited across shards

## Replication Patterns

### Synchronous Replication

Writes replicated before acknowledging to client:

**Configuration**:

```yaml
replication:
  mode: synchronous
  min_replicas: 2  # Wait for 2 replicas
  timeout: 5s      # Max wait time

# Guarantees:
# - No data loss on primary failure
# - Consistent reads from any replica
# - Higher write latency (+5-20ms)
```

**Use Cases**:

- Financial transactions
- Critical business data
- Compliance requirements
- Zero data loss tolerance

### Asynchronous Replication

Writes acknowledged immediately, replicated in background:

**Configuration**:

```yaml
replication:
  mode: asynchronous
  replication_lag_target: 100ms
  catch_up_priority: high

# Characteristics:
# - Low write latency
# - Possible replication lag
# - Rare data loss on failure
# - Higher throughput
```

**Use Cases**:

- Read-heavy workloads
- Social networks
- Content management
- Analytics

### Multi-Master Replication

Multiple writable nodes with conflict resolution:

**Configuration**:

```yaml
replication:
  mode: multi-master
  conflict_resolution: last-write-wins
  topology: mesh

# Features:
# - Write to any node
# - Automatic conflict resolution
# - Geographic distribution
# - Complex edge cases
```

## Load Balancing

### Query Router

Distribute queries across servers:

**HAProxy Configuration**:

```haproxy
# /etc/haproxy/haproxy.cfg
frontend geode_frontend
    bind *:3141
    mode tcp
    default_backend geode_replicas

backend geode_replicas
    mode tcp
    balance leastconn
    option tcp-check

    # Health check
    tcp-check connect
    tcp-check send-binary 48454c4c4f0a  # HELLO
    tcp-check expect binary 4f4b0a        # OK

    # Server pool
    server replica1 replica1.example.com:3141 check
    server replica2 replica2.example.com:3141 check
    server replica3 replica3.example.com:3141 check
    server replica4 replica4.example.com:3141 check
```

**NGINX Stream Configuration**:

```nginx
# /etc/nginx/nginx.conf
stream {
    upstream geode_cluster {
        least_conn;
        server replica1.example.com:3141 max_fails=3 fail_timeout=30s;
        server replica2.example.com:3141 max_fails=3 fail_timeout=30s;
        server replica3.example.com:3141 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 3141;
        proxy_pass geode_cluster;
        proxy_connect_timeout 5s;
    }
}
```

### Client-Side Load Balancing

Application manages distribution:

```go
// Go client with built-in load balancing
config := &geode.Config{
    Servers: []string{
        "replica1.example.com:3141",
        "replica2.example.com:3141",
        "replica3.example.com:3141",
    },
    LoadBalancer: geode.RoundRobin,
    HealthCheckInterval: 30 * time.Second,
}

client, err := geode.Connect(config)
// Automatically distributes queries
```

## Capacity Planning

### Growth Modeling

Project resource needs (numbers below are illustrative; calibrate with your benchmarks):

```python
# capacity_planner.py
import math

def estimate_resources(
    nodes_count,
    edges_count,
    avg_node_properties=10,
    avg_edge_properties=3,
    qps_target=10000,
    replication_factor=3
):
    # Storage calculation
    node_storage_mb = (nodes_count * avg_node_properties * 50) / 1_000_000
    edge_storage_mb = (edges_count * avg_edge_properties * 40) / 1_000_000
    index_storage_mb = (node_storage_mb + edge_storage_mb) * 0.3

    total_storage_gb = (
        (node_storage_mb + edge_storage_mb + index_storage_mb) *
        replication_factor / 1000
    )

    # Memory calculation (working set = 20% of data + index cache)
    working_set_gb = total_storage_gb * 0.2
    index_cache_gb = index_storage_mb / 1000
    required_memory_gb = working_set_gb + index_cache_gb + 16  # OS overhead

    # CPU calculation (example heuristic: 1 core per 500 QPS)
    required_cores = math.ceil(qps_target / 500)

    # Server count (assuming 32-core, 256GB servers)
    servers_needed = max(
        math.ceil(total_storage_gb / (2000 / replication_factor)),  # Storage
        math.ceil(required_memory_gb / 200),  # Memory
        math.ceil(required_cores / 28)  # CPU (leave headroom)
    )

    return {
        "total_storage_gb": total_storage_gb,
        "required_memory_gb": required_memory_gb,
        "required_cores": required_cores,
        "servers_needed": servers_needed,
    }

# Example: 100M nodes, 500M edges, 10k QPS
resources = estimate_resources(
    nodes_count=100_000_000,
    edges_count=500_000_000,
    qps_target=10_000
)

print(f"Storage: {resources['total_storage_gb']:.0f} GB")
print(f"Memory: {resources['required_memory_gb']:.0f} GB")
print(f"Cores: {resources['required_cores']}")
print(f"Servers: {resources['servers_needed']}")
```

### Monitoring for Scale

Track scaling indicators:

```yaml
# Prometheus alerts for scaling triggers
groups:
  - name: scaling_alerts
    rules:
      # CPU saturation
      - alert: HighCPUUsage
        expr: avg(cpu_usage_percent) > 70
        for: 15m
        annotations:
          summary: "Consider adding CPU capacity"

      # Memory pressure
      - alert: HighMemoryUsage
        expr: memory_usage_percent > 80
        for: 10m
        annotations:
          summary: "Add more RAM or replicas"

      # Storage growth
      - alert: StorageGrowth
        expr: rate(storage_bytes_used[7d]) > 0
        annotations:
          summary: "Storage growing, plan expansion"

      # Query latency
      - alert: HighQueryLatency
        expr: p99_query_duration_ms > 500
        for: 15m
        annotations:
          summary: "Query performance degrading"

      # Connection saturation
      - alert: ConnectionPoolExhaustion
        expr: (active_connections / max_connections) > 0.8
        for: 5m
        annotations:
          summary: "Near connection limit"
```

## High Availability

### Failover Configuration

Automatic primary failover:

```yaml
# geode-ha.yaml
high_availability:
  enabled: true
  election_timeout: 10s
  heartbeat_interval: 2s
  min_quorum: 2

cluster:
  nodes:
    - host: node1.example.com
      port: 3141
      priority: 100  # Preferred primary

    - host: node2.example.com
      port: 3141
      priority: 90

    - host: node3.example.com
      port: 3141
      priority: 80

  # Automatic failover on primary failure
  # - Quorum elects new primary (highest priority)
  # - Clients redirect to new primary
  # - Old primary rejoins as replica
```

### Health Checks

Monitor node health:

```bash
# Kubernetes readiness probe
livenessProbe:
  exec:
    command:
    - geode
    - health
    - --check
    - readiness
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  exec:
    command:
    - geode
    - health
    - --check
    - liveness
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

## Best Practices

### Start Simple, Scale Gradually

**Phase 1: Single Server** (initial deployments):

```yaml
deployment: single-server
resources:
  cpu: 8 cores
  memory: 64 GB
  storage: 500 GB SSD
performance: workload-dependent (benchmark-specific)
```

**Phase 2: Vertical Scaling** (single-node scale-up):

```yaml
deployment: single-server
resources:
  cpu: 32 cores
  memory: 256 GB
  storage: 2 TB NVMe
performance: workload-dependent (benchmark-specific)
```

**Phase 3: Read Replicas** (read-heavy workloads):

```yaml
deployment: primary + replicas
topology:
  primary: 1
  replicas: 3-5
resources_per_server:
  cpu: 16 cores
  memory: 128 GB
  storage: 2 TB NVMe
performance: workload-dependent (benchmark-specific)
```

**Phase 4: Sharding** (distributed datasets):

```yaml
deployment: sharded-cluster
topology:
  shards: 4-8
  replicas_per_shard: 3
resources_per_server:
  cpu: 32 cores
  memory: 256 GB
  storage: 4 TB NVMe
performance: workload-dependent (benchmark-specific)
```

### Data Locality

Keep related data together:

```gql
-- Good: Related entities on same shard
-- User and their posts on same shard (by user_id hash)

-- Query runs on single shard:
MATCH (u:User {user_id: '12345'})-[:POSTS]->(p:Post)
RETURN p
ORDER BY p.created_at DESC
LIMIT 20;

-- Bad: User and posts on different shards
-- Requires cross-shard query (slower)
```

### Monitor Replication Lag

Track replica freshness:

```gql
-- Check replication status
SELECT
  replica_name,
  last_update_time,
  lag_seconds,
  lag_bytes
FROM system.replication_status
ORDER BY lag_seconds DESC;

-- Alert on excessive lag
-- If lag_seconds > 60, investigate
```

### Connection Pooling

Right-size connection pools:

```python
# Connection pool sizing formula
max_connections_per_client = (
    server_max_connections /
    number_of_application_instances
)

# Example:
# - Server max: 1000 connections
# - Application instances: 20
# - Per-client max: 50 connections

client = Client(
    host="geode.example.com",
    port=3141,
    max_connections=50,
    min_connections=5
)
```

## Troubleshooting

### Hot Spots

**Issue**: One shard overloaded while others idle.

**Diagnosis**:

```gql
-- Check shard load distribution
SELECT
  shard_name,
  query_count,
  avg_cpu_percent,
  storage_gb
FROM system.shard_stats
ORDER BY query_count DESC;
```

**Solutions**:

```yaml
# 1. Rebalance sharding key
sharding:
  key_property: user_id  # High cardinality
  # Not: region  # Low cardinality causes hot spots

# 2. Split hot shard
# If shard_3 is overloaded, split into shard_3a and shard_3b

# 3. Add caching layer
# Cache hot queries at application level
```

### Replication Lag

**Issue**: Replicas falling behind primary.

**Solutions**:

```yaml
# 1. Increase replication threads
replication:
  parallel_workers: 8  # Default: 4

# 2. Increase network bandwidth
# Use 10GbE between primary and replicas

# 3. Reduce write load on primary
# - Batch writes
# - Use async replication for non-critical data
```

## Integration with Geode

Scaling integrates with Geode features:

- **Monitoring**: Track scaling metrics via Prometheus
- **Transactions**: ACID within shard, eventual across shards
- **Security**: RLS policies enforced on all nodes
- **Backup**: Coordinated backups across cluster
- **Upgrades**: Rolling upgrades with zero downtime

## Related Topics

- **High Availability**: Failover and redundancy strategies
- **Replication**: Data replication patterns
- **Performance**: Query performance optimization
- **Monitoring**: Production monitoring and alerting
- **Deployment**: Production deployment patterns
- **Cloud**: Cloud-specific scaling strategies

---

Browse the tagged content below to discover comprehensive guides, tutorials, and best practices for scaling Geode. Learn how to build highly scalable graph database deployments that handle enterprise workloads with high availability and optimal performance.
