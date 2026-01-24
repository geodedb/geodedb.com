---
title: "High Availability"
description: "Comprehensive guide to Geode high availability including replication, failover, cluster configuration, automatic recovery, and zero-downtime deployments for production systems."
keywords:
  - high availability
  - HA
  - failover
  - uptime
  - reliability
  - fault tolerance
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/availability/"
    noindex: false
---

# High Availability

Geode implements comprehensive high availability features to ensure continuous operation even in the face of hardware failures, network partitions, or maintenance activities. The system achieves 99.99% uptime through automatic failover, multi-node replication, and zero-downtime deployments.

## Architecture Overview

Geode's high availability architecture includes:

- **Multi-Node Replication**: Synchronous and asynchronous replication modes
- **Automatic Failover**: Sub-second detection and promotion of standby nodes
- **Quorum-Based Consensus**: Raft consensus for cluster coordination
- **Split-Brain Prevention**: Network partition detection and resolution
- **Load Balancing**: Intelligent query routing across read replicas
- **Zero-Downtime Upgrades**: Rolling updates without service interruption

## Cluster Configuration

### Three-Node Cluster (Production Minimum)

```yaml
# Primary node
node1:
  role: primary
  listen: 0.0.0.0:3141
  cluster_peers:
    - node2:3141
    - node3:3141
  replication_mode: synchronous
  quorum_size: 2

# Standby nodes
node2:
  role: standby
  listen: 0.0.0.0:3141
  cluster_peers:
    - node1:3141
    - node3:3141
  replication_mode: synchronous

node3:
  role: standby
  listen: 0.0.0.0:3141
  cluster_peers:
    - node1:3141
    - node2:3141
  replication_mode: synchronous
```

### Five-Node Cluster (High Availability)

For maximum availability across multiple failure domains:

```yaml
cluster:
  nodes: 5
  quorum_size: 3
  replication_factor: 3
  sync_replicas: 2
  async_replicas: 2
  availability_zones:
    - us-east-1a
    - us-east-1b
    - us-east-1c
```

## Replication Modes

### Synchronous Replication

Ensures zero data loss but higher latency:

```gql
-- Enable synchronous replication
SET CLUSTER REPLICATION MODE synchronous;
SET CLUSTER QUORUM SIZE 2;

-- All writes wait for quorum acknowledgment
CREATE (n:CriticalData {value: $value})
-- Returns only after 2 nodes confirm
```

**Use Cases**: Financial transactions, critical data, regulatory compliance

**Latency Impact**: +2-5ms per write operation

### Asynchronous Replication

Lower latency with eventual consistency:

```gql
SET CLUSTER REPLICATION MODE asynchronous;

-- Writes return immediately after primary acknowledges
CREATE (n:LogEntry {timestamp: datetime()})
-- Replicas sync in background
```

**Use Cases**: Log data, analytics, high-throughput workloads

**Latency Impact**: No additional latency

### Semi-Synchronous Replication

Balance between durability and performance:

```gql
SET CLUSTER REPLICATION MODE semi_synchronous;
SET CLUSTER SYNC REPLICAS 1;

-- Primary + 1 replica must acknowledge
-- Additional replicas async
CREATE (n:UserData {id: $id})
```

## Automatic Failover

### Detection

Geode detects primary failure through:

- **Heartbeat Monitoring**: 100ms heartbeat interval
- **Health Checks**: Active query execution validation
- **Network Partition Detection**: Quorum-based split-brain prevention

### Promotion Process

When primary fails:

1. **Detection** (100-500ms): Standby nodes detect missing heartbeats
2. **Election** (100-300ms): Raft consensus elects new primary
3. **Promotion** (50-100ms): New primary begins accepting writes
4. **Notification** (immediate): Clients redirected to new primary

**Total Failover Time**: < 1 second

### Client Behavior

Clients automatically retry with new primary:

```python
from geode_client import GeodeClient

async with GeodeClient(
    urls=["node1:3141", "node2:3141", "node3:3141"],
    failover_timeout=5000,  # 5 seconds
    retry_attempts=3
) as client:
    # Automatic failover on primary failure
    result = await client.execute("MATCH (n) RETURN n")
```

## Load Balancing

### Read-Write Splitting

Route reads to replicas for horizontal scaling:

```python
from geode_client import GeodeClient, RoutingPolicy

client = GeodeClient(
    primary_url="node1:3141",
    replica_urls=["node2:3141", "node3:3141"],
    routing_policy=RoutingPolicy.READ_REPLICAS
)

# Write to primary
await client.execute("CREATE (n:Node {id: $id})", {"id": 1})

# Read from replicas
result = await client.execute(
    "MATCH (n:Node) RETURN COUNT(n)",
    read_preference="replica"
)
```

### Load Balancing Strategies

**Round Robin**:
```gql
SET SESSION READ PREFERENCE round_robin;
```

**Least Connections**:
```gql
SET SESSION READ PREFERENCE least_connections;
```

**Geographic Proximity**:
```gql
SET SESSION READ PREFERENCE nearest;
```

## Zero-Downtime Deployments

### Rolling Updates

Update cluster nodes one at a time:

```bash
# Update node 3 (standby)
kubectl set image statefulset/geode geode=geodedb/geode:0.19.0 --index=2
# Wait for health check
kubectl wait --for=condition=ready pod/geode-2

# Update node 2 (standby)
kubectl set image statefulset/geode geode=geodedb/geode:0.19.0 --index=1
kubectl wait --for=condition=ready pod/geode-1

# Trigger primary failover to updated node
geode cluster failover --target=node2

# Update node 1 (now standby)
kubectl set image statefulset/geode geode=geodedb/geode:0.19.0 --index=0
kubectl wait --for=condition=ready pod/geode-0
```

### Schema Migrations

Online schema changes without downtime:

```gql
-- Add property with online migration
ALTER GRAPH ADD PROPERTY User.verified BOOLEAN DEFAULT false
  WITH MIGRATION STRATEGY online;

-- Rebuild index without locking
CREATE INDEX ON :User(email) WITH MODE online;
```

## Monitoring High Availability

### Health Checks

```bash
# Check cluster status
curl https://geode.example.com/api/v1/cluster/status

{
  "cluster_id": "cluster_abc123",
  "nodes": [
    {
      "id": "node1",
      "role": "primary",
      "status": "healthy",
      "replication_lag": 0
    },
    {
      "id": "node2",
      "role": "standby",
      "status": "healthy",
      "replication_lag": 5
    },
    {
      "id": "node3",
      "role": "standby",
      "status": "healthy",
      "replication_lag": 3
    }
  ],
  "quorum_status": "healthy"
}
```

### Metrics

Monitor critical HA metrics:

```promql
# Replication lag
geode_replication_lag_seconds{node="node2"}

# Failover events
rate(geode_failover_total[1h])

# Node health
geode_node_health{node="node1"}

# Quorum status
geode_quorum_healthy
```

## Disaster Recovery

### Backup Strategy

```bash
# Continuous archiving to S3
geode backup configure \
  --mode continuous \
  --destination s3://backups/geode \
  --retention 30d

# Point-in-time recovery
geode restore \
  --from s3://backups/geode \
  --timestamp "2025-01-24T15:30:00Z"
```

### Geographic Distribution

Deploy across multiple regions:

```yaml
regions:
  us-east-1:
    nodes: 3
    role: primary_cluster
  us-west-2:
    nodes: 3
    role: disaster_recovery
    replication_mode: async
```

## Best Practices

1. **Minimum 3 Nodes**: Always deploy at least 3 nodes for quorum
2. **Odd Number of Nodes**: Use 3, 5, or 7 nodes to prevent split votes
3. **Geographic Distribution**: Spread nodes across availability zones
4. **Monitor Replication Lag**: Alert on lag > 100ms for sync replicas
5. **Test Failover**: Regularly test failover procedures
6. **Backup Validation**: Test restore procedures monthly
7. **Capacity Planning**: Maintain 30% headroom for failover scenarios

## Related Topics

- [Clustering](/tags/clustering/) - Cluster setup and management
- [Replication](/tags/replication/) - Data replication strategies
- [Distributed](/tags/distributed/) - Distributed systems architecture
- [Monitoring](/tags/monitoring/) - Observability and metrics

## Further Reading

- [High Availability Guide](/docs/operations/high-availability/)
- [Cluster Configuration](/docs/configuration/cluster/)
- [Failover Procedures](/docs/operations/failover/)
- [Disaster Recovery](/docs/operations/disaster-recovery/)
