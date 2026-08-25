---
title: "Distributed Systems"
description: "Learn about Geode's distributed architecture, consensus protocols, multi-node coordination, data sharding, and distributed query execution for scalable graph database deployments."
keywords:
  - distributed systems
  - distributed database
  - consensus protocols
  - Raft consensus
  - multi-node coordination
  - distributed queries
  - data sharding
  - cluster coordination
  - fault tolerance
  - network partitions
  - CAP theorem
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/distributed-systems/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Distributed Systems in Geode

Distributed systems enable Geode to scale beyond the limits of a single machine while maintaining consistency, availability, and fault tolerance. Geode implements a sophisticated distributed architecture designed specifically for graph workloads, where data locality and relationship traversal efficiency are paramount.

This guide covers Geode's distributed architecture, consensus mechanisms, cluster coordination, and strategies for building resilient, scalable graph database deployments.

## Introduction to Distributed Graph Databases

Traditional relational databases can be distributed by sharding rows across nodes, but graph databases face unique challenges:

**Relationship Locality**: Graph traversals cross node boundaries, requiring efficient cross-shard communication

**Hotspot Prevention**: Popular nodes (celebrities, viral content) can create load imbalances

**Consistency Across Edges**: Relationships connecting nodes on different shards must remain consistent

**Variable Query Patterns**: Graph queries follow unpredictable paths unlike tabular scans

Geode addresses these challenges through intelligent data placement, distributed query planning, and optimized cross-shard communication.

## Geode Cluster Architecture

### Cluster Components

A Geode cluster consists of multiple node types working together:

**Leader Node**: Coordinates cluster state and manages consensus

- Handles schema changes and DDL operations
- Coordinates distributed transactions
- Manages cluster membership
- Performs global query planning

**Data Nodes**: Store and serve graph data

- Host data partitions (shards)
- Execute local query operations
- Participate in consensus for writes
- Maintain local indexes

**Query Coordinators**: Route and aggregate queries

- Parse and plan distributed queries
- Coordinate cross-shard operations
- Aggregate results from multiple nodes
- Handle client connections

```toml
# geode.toml - Cluster configuration
[cluster]
name = "production-cluster"
mode = "distributed"  # standalone, distributed, or replicated

[cluster.nodes]
# Initial cluster members for discovery
seeds = [
  "node1.geode.internal:7687",
  "node2.geode.internal:7687",
  "node3.geode.internal:7687"
]

[cluster.node]
id = "node1"
role = "data"  # leader, data, or coordinator
data_dir = "/var/lib/geode/data"

[cluster.consensus]
protocol = "raft"
election_timeout_ms = 1500
heartbeat_interval_ms = 150
```

### Cluster Formation

When starting a Geode cluster, nodes discover each other and elect a leader:

```bash
# Start first node (will become leader if cluster is new)
./geode serve --cluster-mode distributed \
  --node-id node1 \
  --cluster-seeds node1:7687,node2:7687,node3:7687 \
  --listen 0.0.0.0:3141 \
  --cluster-listen 0.0.0.0:7687

# Start additional nodes
./geode serve --cluster-mode distributed \
  --node-id node2 \
  --cluster-seeds node1:7687,node2:7687,node3:7687 \
  --listen 0.0.0.0:3141 \
  --cluster-listen 0.0.0.0:7687
```

**Formation Process**:

1. Nodes connect to seed addresses
2. Cluster state is synchronized
3. Leader election occurs via Raft
4. Data partitions are assigned
5. Cluster becomes operational

## Consensus and Coordination

### Raft Consensus Protocol

Geode uses the Raft consensus protocol for leader election and log replication:

**Leader Election**: When the current leader fails or is unreachable, remaining nodes elect a new leader through voting. A node needs majority votes to become leader.

**Log Replication**: All writes are first logged by the leader, then replicated to followers. A write is committed only after a majority of nodes have persisted it.

**Membership Changes**: Adding or removing nodes is handled through joint consensus to ensure safety during transitions.

```gql
-- View cluster consensus status
SHOW CLUSTER STATUS;

-- Check replication lag
SHOW CLUSTER STATUS;
```

**Consensus Configuration**:

```toml
[cluster.consensus]
protocol = "raft"

# Election timeout (follower becomes candidate)
election_timeout_ms = 1500

# Heartbeat interval (leader to followers)
heartbeat_interval_ms = 150

# Maximum entries per append
max_append_entries = 1000

# Snapshot threshold (log entries before snapshot)
snapshot_threshold = 10000
```

### Distributed Transactions

Geode supports distributed ACID transactions using two-phase commit:

```gql
-- Distributed transaction spanning multiple shards
BEGIN;

-- Creates on shard-1 (user nodes)
CREATE (u:User {id: 'user-123', name: 'Alice'});

-- Creates on shard-2 (product nodes)
CREATE (p:Product {id: 'prod-456', name: 'Widget'});

-- Relationship spans both shards
MATCH (u:User {id: 'user-123'}), (p:Product {id: 'prod-456'})
CREATE (u)-[:PURCHASED {date: datetime()}]->(p);

COMMIT;
```

**Transaction Flow**:

1. **Prepare Phase**: Coordinator asks all involved shards to prepare
2. **Vote**: Each shard votes commit or abort
3. **Commit Phase**: If all vote commit, coordinator broadcasts commit
4. **Completion**: All shards apply changes and release locks

**Transaction Configuration**:

```toml
[transactions.distributed]
enabled = true
timeout_ms = 30000
max_retries = 3
retry_delay_ms = 100

# Two-phase commit settings
prepare_timeout_ms = 10000
commit_timeout_ms = 10000
```

## Data Sharding Strategies

### Hash-Based Sharding

Distribute data based on property hash values:

```gql
-- Configure hash-based sharding
CREATE GRAPH TYPE social_network (
    User LABEL (
        id STRING PRIMARY KEY,
        name STRING,
        email STRING
    ),
    Post LABEL (
        id STRING PRIMARY KEY,
        content STRING,
        created_at DATETIME
    )
) SHARD BY HASH(User.id, Post.id) SHARDS 16;
```

**Advantages**:

- Even data distribution
- Predictable shard location
- Simple implementation

**Disadvantages**:

- Range queries span all shards
- No locality for related data

### Range-Based Sharding

Partition data by property ranges:

```gql
-- Range-based sharding for time-series data
CREATE GRAPH TYPE event_log (
    Event LABEL (
        id STRING PRIMARY KEY,
        timestamp DATETIME,
        type STRING,
        data JSON
    )
) SHARD BY RANGE(Event.timestamp) (
    PARTITION p2024q1 VALUES LESS THAN ('2024-04-01'),
    PARTITION p2024q2 VALUES LESS THAN ('2024-07-01'),
    PARTITION p2024q3 VALUES LESS THAN ('2024-10-01'),
    PARTITION p2024q4 VALUES LESS THAN ('2025-01-01'),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

**Advantages**:

- Efficient range queries
- Time-based data lifecycle management
- Partition pruning for queries

**Disadvantages**:

- Potential hotspots on recent partitions
- Requires partition management

### Graph-Aware Sharding

Colocate connected nodes to minimize cross-shard traversals:

```gql
-- Colocate users with their content
CREATE GRAPH TYPE content_graph (
    User LABEL (
        id STRING PRIMARY KEY,
        tenant_id STRING
    ),
    Post LABEL (
        id STRING PRIMARY KEY,
        author_id STRING
    )
) SHARD BY COLOCATE(User.tenant_id, Post.author_id) SHARDS 8;
```

**Advantages**:

- Minimal cross-shard traversals
- Better query performance
- Reduced network overhead

**Disadvantages**:

- Requires careful data modeling
- May cause uneven distribution

### Monitoring Shard Distribution

```gql
-- Check shard balance
SHOW CLUSTER STATUS;

-- Identify cross-shard relationships
-- There is no distribution catalog; aggregate it with a MATCH:
-- MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS n ORDER BY n DESC
```

## Distributed Query Execution

### Query Planning

The query coordinator analyzes queries and generates distributed execution plans:

```gql
-- Distributed query
EXPLAIN
MATCH (u:User {country: 'USA'})-[:FOLLOWS]->(friend:User)-[:POSTED]->(p:Post)
WHERE p.created_at > datetime() - duration('P7D')
RETURN u.name, friend.name, p.title
LIMIT 100;
```

**Execution Plan**:

```
DistributedQueryPlan:
  1. ScatterGather: Filter User nodes (country = 'USA')
     - Shards: [1, 3, 5, 7, 9, 11, 13, 15] (based on hash distribution)
  2. LocalExpand: (User)-[:FOLLOWS]->(friend)
     - Colocated: 78%, Cross-shard: 22%
  3. RemoteFetch: Fetch cross-shard friends
     - Estimated remote calls: 2,340
  4. LocalExpand: (friend)-[:POSTED]->(Post)
  5. Filter: p.created_at > threshold
  6. Gather: Aggregate results at coordinator
  7. Limit: 100
Estimated Cost: 12,450
```

### Query Routing Strategies

**Scatter-Gather**: Send query to all relevant shards, aggregate results

```gql
-- Scatter-gather for aggregation
MATCH (p:Product)
RETURN p.category, COUNT(*) as count, AVG(p.price) as avg_price
GROUP BY p.category;
-- Runs on all shards, coordinator aggregates
```

**Directed Query**: Route to specific shard based on filter

```gql
-- Directed query with shard key
MATCH (u:User {id: 'user-123'})
RETURN u;
-- Routes directly to shard containing user-123
```

**Broadcast Query**: Send to all shards for global operations

```gql
-- Broadcast for schema operations
CREATE INDEX user_email ON User(email);
-- Applied on all shards
```

### Cross-Shard Traversals

When traversals cross shard boundaries, Geode optimizes communication:

```python
from geode_client import Client

async def efficient_traversal():
    """Geode automatically optimizes cross-shard traversals"""
    client = Client(host="coordinator.geode.internal", port=3141)
    async with client.connection() as conn:
        # Geode batches remote fetches for efficiency
        result, _ = await conn.query("""
            MATCH (u:User {id: $id})-[:FOLLOWS*1..3]->(friend)
            RETURN DISTINCT friend.id, friend.name
        """, {"id": "user-123"})

        return result.rows
```

**Optimization Techniques**:

- **Batch Remote Fetches**: Collect all needed remote node IDs, fetch in batches
- **Prefetch Hints**: Predict likely traversal paths, prefetch data
- **Query Caching**: Cache frequently traversed paths
- **Bloom Filters**: Quickly determine if node exists on shard

## Fault Tolerance and Recovery

### Handling Node Failures

Geode automatically detects and recovers from node failures:

**Failure Detection**:

```toml
[cluster.health]
# Failure detection settings
heartbeat_interval_ms = 100
heartbeat_timeout_ms = 1000
failure_detection_threshold = 3  # Missed heartbeats before suspected
```

**Automatic Failover**:

1. Failure detected via missed heartbeats
2. Leader marks node as unavailable
3. Replicas promoted to primary for affected shards
4. Clients automatically redirect to new primaries
5. Rebalancing triggered when replacement node joins

```gql
-- Monitor node health
SHOW CLUSTER STATUS;

-- View failover history
SHOW CLUSTER STATUS;
```

### Network Partition Handling

Geode handles network partitions following the Raft protocol:

**Majority Partition**: Continues operating, elects new leader if needed
**Minority Partition**: Becomes read-only, rejects writes

```toml
[cluster.partition]
# Partition handling strategy
strategy = "majority"  # majority, all, or custom

# Read behavior during partition
allow_stale_reads = false
stale_read_timeout_ms = 5000

# Write behavior
require_majority_ack = true
```

### Data Replication

Configure replication for durability and availability:

```toml
[replication]
# Number of replicas per shard
factor = 3

# Synchronous vs asynchronous
mode = "sync"  # sync or async

# Replica placement
placement = "rack-aware"  # spread replicas across racks

# Read preference
read_preference = "primary"  # primary, secondary, or nearest
```

```gql
-- Check replication status
SHOW CLUSTER STATUS;
```

## Monitoring Distributed Operations

### Cluster Metrics

Key metrics for monitoring distributed Geode deployments:

```bash
# Prometheus metrics endpoint. Opt-in: start the server with
# GEODE_METRICS_PORT=9090 (env only, there is no CLI flag). It is a
# separate listener, not the QUIC client port 3141.
curl http://coordinator:9090/metrics

# Key distributed metrics
geode_cluster_nodes_total{status="healthy"} 5
geode_cluster_nodes_total{status="unhealthy"} 0
geode_cluster_leader_elections_total 3
geode_cluster_replication_lag_seconds{shard="1"} 0.012
geode_distributed_queries_total{type="scatter_gather"} 45823
geode_cross_shard_bytes_total 1847293847
```

**Grafana Dashboard Queries**:

```yaml
# Cluster health panel
- title: "Cluster Health"
  targets:
    - expr: 'geode_cluster_nodes_total{status="healthy"}'
      legendFormat: "Healthy Nodes"

# Replication lag panel
- title: "Replication Lag"
  targets:
    - expr: 'histogram_quantile(0.99, rate(geode_cluster_replication_lag_seconds_bucket[5m]))'
      legendFormat: "p99 Lag"

# Cross-shard traffic panel
- title: "Cross-Shard Traffic"
  targets:
    - expr: 'rate(geode_cross_shard_bytes_total[5m])'
      legendFormat: "Bytes/sec"
```

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: geode_cluster
    rules:
      - alert: ClusterNodeDown
        expr: geode_cluster_nodes_total{status="unhealthy"} > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Geode cluster node is unhealthy"

      - alert: HighReplicationLag
        expr: geode_cluster_replication_lag_seconds > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Replication lag exceeds 5 seconds"

      - alert: FrequentLeaderElections
        expr: rate(geode_cluster_leader_elections_total[1h]) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Frequent leader elections detected"
```

## Configuration Best Practices

### Network Configuration

```toml
[cluster.network]
# Separate client and cluster traffic
client_port = 3141
cluster_port = 7687

# Timeouts
connect_timeout_ms = 5000
request_timeout_ms = 30000

# Keep-alive
keepalive_interval_ms = 10000
keepalive_timeout_ms = 30000

# TLS for inter-node communication
tls_enabled = true
tls_cert_file = "/etc/geode/cluster.crt"
tls_key_file = "/etc/geode/cluster.key"
tls_ca_file = "/etc/geode/ca.crt"
```

### Resource Limits

```toml
[cluster.resources]
# Per-node limits
max_concurrent_queries = 1000
max_transaction_size_mb = 100
max_cross_shard_batch_size = 10000

# Memory allocation
node_memory_limit_gb = 32
query_memory_limit_gb = 8
replication_buffer_mb = 512
```

### Deployment Topology

**Three-Node Cluster** (Minimum for HA):

```
Node 1: Leader + Data (Shard 1-5 primary, 11-16 replica)
Node 2: Data (Shard 6-10 primary, 1-5 replica)
Node 3: Data (Shard 11-16 primary, 6-10 replica)
```

**Five-Node Cluster** (Better fault tolerance):

```
Node 1: Leader + Coordinator
Node 2-5: Data nodes (4 shards primary each, 2 replicas)
```

**Production Cluster** (Dedicated roles):

```
Coordinators: 2 nodes (active-passive)
Data Nodes: 6+ nodes (3 replicas per shard)
Load Balancer: External LB for client traffic
```

## Best Practices

### Data Modeling for Distribution

1. **Choose shard keys carefully**: Select properties with even distribution
2. **Colocate related data**: Keep frequently traversed relationships local
3. **Avoid hotspots**: Distribute high-traffic nodes across shards
4. **Plan for growth**: Choose sharding strategy that scales

### Query Optimization

1. **Filter on shard key first**: Enables directed queries
2. **Limit traversal depth**: Deep traversals amplify cross-shard calls
3. **Use aggregation pushdown**: Aggregate locally before gathering
4. **Cache hot traversals**: Use application-level caching for popular paths

### Operations

1. **Monitor replication lag**: Keep lag under SLA thresholds
2. **Test failover regularly**: Verify automatic recovery works
3. **Plan capacity**: Add nodes before reaching limits
4. **Rolling upgrades**: Upgrade one node at a time

## Related Topics

- [High Availability](/tags/high-availability/) - Configuring HA deployments
- [Clustering](/tags/clustering/) - Cluster setup and management
- [Recovery](/tags/recovery/) - Disaster recovery procedures
- [Scaling](/tags/scaling/) - Horizontal and vertical scaling
- [Performance](/tags/performance/) - Distributed query optimization
- [Deployment](/tags/deployment/) - Production deployment patterns

## Further Reading

- Distributed Systems Architecture Guide
- Raft Consensus Protocol Overview
- Sharding Strategy Selection Guide
- Cross-Shard Query Optimization
- Network Partition Handling
- Cluster Operations Runbook
