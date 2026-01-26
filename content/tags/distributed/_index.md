---
title: "Distributed Systems"
description: "Distributed computing concepts, consistency models, and cluster management in Geode's architecture"
keywords: ["distributed systems", "distributed computing", "CAP theorem", "consistency models", "distributed transactions", "consensus algorithms", "replication", "partitioning", "fault tolerance"]
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Distributed Systems

Distributed systems enable Geode to scale horizontally across multiple machines, providing high availability, fault tolerance, and improved performance. Understanding distributed systems concepts is essential for building reliable, scalable graph database deployments.

## Fundamental Concepts

### CAP Theorem

The CAP theorem states that distributed systems can guarantee only two of three properties:

**Consistency** - All nodes see the same data at the same time
**Availability** - Every request receives a response (success or failure)
**Partition Tolerance** - System continues operating despite network partitions

Geode prioritizes **Consistency** and **Partition Tolerance** (CP), ensuring data integrity even during network splits.

### Consistency Models

Geode supports multiple consistency levels:

**Strong Consistency** - All reads return the most recent write
**Sequential Consistency** - Operations appear in some sequential order
**Causal Consistency** - Related operations maintain their order
**Eventual Consistency** - All replicas converge eventually

```gql
-- Specify consistency level for a query
SET CONSISTENCY LEVEL STRONG;

MATCH (u:User {id: 'user123'})
RETURN u.balance;
```

### Partition Tolerance

Geode handles network partitions gracefully:

- Detect partition through heartbeat failures
- Elect leader in majority partition
- Reject writes in minority partition
- Reconcile state when partition heals

## Distributed Architecture

### Cluster Topology

Geode clusters consist of multiple node types:

**Leader Nodes** - Coordinate writes and maintain consistency
**Follower Nodes** - Replicate data and serve reads
**Observer Nodes** - Non-voting replicas for read scaling

```bash
# Configure cluster topology
geode cluster init \
  --leaders 3 \
  --followers 6 \
  --observers 3 \
  --replication-factor 3
```

### Node Discovery

Nodes discover each other through multiple mechanisms:

**Static Configuration** - Pre-configured seed nodes
**DNS-Based Discovery** - SRV records for dynamic discovery
**Cloud Provider Integration** - Auto-discovery in cloud environments

```yaml
cluster:
  discovery:
    mode: dns
    service: _geode._tcp.cluster.local
    refresh_interval: 30s
```

### Communication Patterns

Geode uses efficient communication patterns:

**Request-Response** - Synchronous client-server communication
**Publish-Subscribe** - Asynchronous event distribution
**Gossip Protocol** - Eventual consistency for metadata
**Broadcast** - Cluster-wide notifications

## Data Distribution

### Sharding Strategies

Geode distributes data across nodes using various strategies:

**Hash-Based Sharding** - Consistent hashing for even distribution
**Range-Based Sharding** - Partition by key ranges
**Graph-Aware Sharding** - Co-locate connected components

```gql
-- Configure sharding strategy
CREATE GRAPH social SHARD BY HASH(User.id) SHARDS 16;

-- Query executes across relevant shards
MATCH (u:User {id: 'user123'})-[:FRIEND]->(f)
RETURN u, f;
```

### Consistent Hashing

Consistent hashing minimizes data movement during cluster changes:

```
Hash Ring:
- Each node assigned multiple virtual nodes
- Keys hashed to ring position
- Key stored on first clockwise node
- Virtual nodes balance load
```

When nodes join or leave:
- Only keys between affected nodes move
- Minimal disruption to cluster
- Automatic rebalancing

### Data Locality

Optimize performance through data locality:

**Co-location** - Store related data together
**Rack Awareness** - Replicas span physical racks
**Zone Awareness** - Replicas span availability zones

```gql
-- Configure locality preferences
CREATE GRAPH TYPE social (
    User LABEL (id STRING),
    Post LABEL (author_id STRING)
) COLOCATE ON User.id = Post.author_id;
```

## Replication

### Replication Models

Geode supports multiple replication approaches:

**Synchronous Replication** - Writes block until replicated
**Asynchronous Replication** - Writes return immediately
**Semi-Synchronous** - Wait for one replica, async for others

```gql
-- Configure replication for a graph
ALTER GRAPH social SET REPLICATION (
    mode: synchronous,
    factor: 3,
    min_acks: 2
);
```

### Leader Election

Geode uses Raft consensus for leader election:

1. Follower starts election after timeout
2. Candidate requests votes from peers
3. Node with majority votes becomes leader
4. Leader sends heartbeats to maintain authority

Election ensures single leader per partition.

### Read Replicas

Distribute read load across replicas:

```gql
-- Direct read to nearest replica
SET READ PREFERENCE NEAREST;

MATCH (u:User)
WHERE u.created > NOW() - INTERVAL '1 day'
RETURN COUNT(u);
```

Read preferences:
- **Primary** - Always read from leader
- **Nearest** - Read from geographically closest replica
- **Any** - Read from any replica (eventual consistency)

## Distributed Transactions

### Two-Phase Commit (2PC)

Geode uses 2PC for distributed transactions:

**Phase 1 - Prepare**
- Coordinator asks participants to prepare
- Participants vote yes (prepared) or no (abort)
- Participants write prepare record to log

**Phase 2 - Commit**
- If all voted yes, coordinator commits
- If any voted no, coordinator aborts
- Participants apply decision and acknowledge

```gql
-- Distributed transaction across shards
BEGIN TRANSACTION;

INSERT (u:User {id: 'user123', name: 'Alice'});
INSERT (p:Post {id: 'post456', author_id: 'user123'});

COMMIT;
```

### Transaction Coordinators

Distributed transactions require coordination:

- Client connects to coordinator node
- Coordinator determines participating shards
- Coordinator manages 2PC protocol
- Coordinator handles failures and retries

### Distributed Deadlock Detection

Detect deadlocks across nodes:

**Wait-For Graph** - Track transaction dependencies
**Timeout-Based** - Abort transactions exceeding timeout
**Victim Selection** - Choose transaction to abort

Geode uses timeout-based detection with configurable limits.

## Consensus Algorithms

### Raft Consensus

Geode implements Raft for distributed consensus:

**Leader Election** - Elect single leader per term
**Log Replication** - Replicate operations to followers
**Safety** - Ensure consistency across replicas

Raft guarantees:
- Election safety: at most one leader per term
- Leader append-only: leaders never overwrite logs
- Log matching: identical logs up to same index
- Leader completeness: committed entries present in future leaders
- State machine safety: same log index → same command

### Quorum Reads and Writes

Ensure consistency through quorums:

**Write Quorum** - W nodes must acknowledge write
**Read Quorum** - R nodes must participate in read
**Requirement** - W + R > N ensures overlap

```gql
-- Configure quorum settings
ALTER GRAPH social SET QUORUM (
    write: 2,
    read: 2,
    nodes: 3
);
```

## Fault Tolerance

### Failure Detection

Detect node failures through multiple mechanisms:

**Heartbeat Protocol** - Periodic health checks
**Timeout Detection** - Missing heartbeats indicate failure
**Suspicion System** - Gradual failure detection

```yaml
cluster:
  failure_detection:
    heartbeat_interval: 1s
    timeout: 5s
    suspicion_threshold: 3
```

### Failure Recovery

Recover from various failure scenarios:

**Node Failure** - Promote replica to leader, rebalance
**Network Partition** - Operate in majority partition
**Data Corruption** - Restore from replicas or backups

### Split-Brain Prevention

Prevent split-brain scenarios:

- Require quorum for writes
- Fence minority partitions
- Use generation numbers for leadership
- Implement witness nodes for even-sized clusters

## Performance Optimization

### Latency Reduction

Minimize latency in distributed operations:

**Local Reads** - Route reads to local replicas
**Speculative Execution** - Issue redundant requests
**Batching** - Combine multiple operations
**Pipelining** - Send requests before receiving responses

### Throughput Maximization

Increase system throughput:

**Parallel Processing** - Execute operations concurrently
**Read Replicas** - Distribute read load
**Write Batching** - Amortize coordination overhead
**Caching** - Reduce database queries

### Network Optimization

Optimize network usage:

**Compression** - Reduce data transfer size
**Connection Pooling** - Reuse connections
**Multiplexing** - Share connections (QUIC)
**Locality** - Minimize cross-datacenter traffic

## Monitoring and Observability

### Cluster Metrics

Monitor cluster health and performance:

```gql
-- Query cluster status
SELECT node_id, status, lag, last_heartbeat
FROM SYSTEM.cluster_nodes
WHERE status != 'healthy';
```

Key metrics:
- Replication lag
- Node health status
- Network latency between nodes
- Disk usage per node
- Query distribution across shards

### Distributed Tracing

Trace requests across cluster:

**Trace ID** - Unique identifier per request
**Span Context** - Propagated across nodes
**Causal Relationships** - Parent-child spans

Distributed tracing reveals:
- Request path through cluster
- Per-node latency breakdown
- Cross-shard coordination overhead

## Best Practices

### Cluster Sizing

Design clusters appropriately:

- Odd number of nodes for quorum (3, 5, 7)
- Minimum 3 nodes for production
- Consider failure domains (racks, zones)
- Plan for growth and traffic spikes

### Data Placement

Optimize data distribution:

- Co-locate frequently accessed data
- Balance load across nodes
- Consider access patterns in sharding
- Use graph-aware partitioning

### Consistency vs. Availability

Choose appropriate tradeoffs:

**Strong Consistency When:**
- Financial transactions
- Inventory management
- User authentication

**Eventual Consistency When:**
- Social feeds
- View counts
- Analytics data

### Testing Distributed Systems

Test for distributed scenarios:

**Chaos Engineering** - Inject failures deliberately
**Network Simulation** - Test partition handling
**Load Testing** - Verify scalability claims
**Consistency Validation** - Verify guarantees

## Common Challenges

### Clock Synchronization

Distributed systems face clock skew:

- Use NTP for time synchronization
- Employ logical clocks (Lamport, vector clocks)
- Design for clock drift tolerance
- Use hybrid logical clocks

### Consensus Overhead

Consensus protocols add latency:

- Batch operations when possible
- Use async replication for non-critical data
- Cache frequently accessed data
- Consider multi-Raft for partitioning

### Network Partitions

Handle partitions gracefully:

- Design for partition tolerance
- Implement partition healing
- Monitor partition frequency
- Test partition scenarios

## Related Topics

- [Architecture](/tags/architecture) - System architecture patterns
- [Replication](/tags/replication) - Data replication strategies
- [Scalability](/tags/scalability) - Horizontal scaling approaches
- [High Availability](/tags/availability/) - Availability patterns

## Production Deployment Patterns

### Multi-Region Deployment

Deploy Geode across geographic regions:

```yaml
# Global cluster configuration
cluster:
  regions:
    - name: us-east
      nodes: 3
      role: primary
      replication: sync
    - name: eu-west
      nodes: 3
      role: secondary
      replication: async
    - name: ap-south
      nodes: 2
      role: observer
      replication: async
```

**Benefits**:
- Low latency for global users
- Disaster recovery across regions
- Compliance with data residency requirements

**Challenges**:
- Cross-region network latency (50-200ms)
- Consistency vs. availability tradeoffs
- Complex failover scenarios

### Active-Active Configuration

Run multiple active clusters:

```yaml
cluster:
  mode: active-active
  conflict_resolution: last_write_wins
  nodes:
    cluster_a:
      - node1.us-east.example.com
      - node2.us-east.example.com
      - node3.us-east.example.com
    cluster_b:
      - node1.eu-west.example.com
      - node2.eu-west.example.com
      - node3.eu-west.example.com
```

Both clusters accept writes independently, with conflict resolution handling divergent updates.

### Zero-Downtime Upgrades

Rolling upgrade strategy:

1. Upgrade observers first (read-only impact)
2. Upgrade followers one at a time
3. Fail over leader to upgraded follower
4. Upgrade old leader last

```bash
# Upgrade script
for node in observer1 observer2; do
  geode admin upgrade $node --version 0.19.0
done

for node in follower1 follower2; do
  geode admin upgrade $node --version 0.19.0
  geode admin wait-for-sync $node
done

geode admin failover leader1 --to follower1
geode admin upgrade leader1 --version 0.19.0
```

## Advanced Consensus Patterns

### Multi-Raft for Scalability

Partition data across multiple Raft groups:

```
Raft Group 1 (Shards 0-15)    Raft Group 2 (Shards 16-31)
  Leader: Node A                 Leader: Node B
  Followers: B, C                Followers: A, C

Raft Group 3 (Shards 32-47)    Raft Group 4 (Shards 48-63)
  Leader: Node C                 Leader: Node A
  Followers: A, B                Followers: B, C
```

This distributes leadership and write load across nodes.

### Read-Your-Writes Consistency

Ensure clients see their own writes:

```python
from geode_client import Client

client = Client(host="localhost", port=3141)

async with client.connection() as conn:
    # Write operation returns LSN
    lsn = await conn.execute("""
        CREATE (u:User {id: 123, name: 'Alice'})
    """)

    # Read from replica with LSN requirement
    result, _ = await conn.query("""
        MATCH (u:User {id: 123}) RETURN u
    """, read_lsn=lsn)  # Waits until replica reaches this LSN
```

### Bounded Staleness

Allow reads to be slightly stale for performance:

```gql
-- Allow reads up to 5 seconds stale
SET READ STALENESS 5 seconds;

MATCH (u:User)
WHERE u.active = true
RETURN COUNT(u);
-- May read from stale replica for better performance
```

## Conflict Resolution Strategies

### Last-Write-Wins (LWW)

Use timestamps to resolve conflicts:

```gql
-- Update with timestamp
MATCH (u:User {id: 123})
SET u.name = 'Alice',
    u.updated_at = NOW();

-- On conflict, keep latest timestamp
MERGE ON (u:User {id: 123})
  ON MATCH SET u.name = CASE
    WHEN $timestamp > u.updated_at THEN $new_name
    ELSE u.name
  END
```

### Application-Level Resolution

Expose conflicts to application:

```python
try:
    await client.execute("""
        MATCH (u:User {id: 123, version: $expected_version})
        SET u.balance = $new_balance,
            u.version = $expected_version + 1
    """, {
        "expected_version": current_version,
        "new_balance": new_balance
    })
except ConflictError as e:
    # Application decides how to resolve
    resolved = await resolve_balance_conflict(e.conflicting_versions)
    await retry_with_resolved(resolved)
```

### CRDTs for Automatic Resolution

Use Conflict-Free Replicated Data Types:

```gql
-- Counter CRDT (increment-only)
MATCH (page:Page {id: 'home'})
SET page.view_count = page.view_count + 1;  -- Commutative, always merges correctly

-- Set CRDT (add/remove elements)
MATCH (u:User {id: 123})
SET u.tags = u.tags + ['verified'];  -- Set union
```

## Network Topology Optimization

### Rack-Aware Placement

Spread replicas across physical racks:

```yaml
cluster:
  topology:
    rack_awareness: true
    failure_domains:
      - rack: rack-1
        nodes: [node1, node2]
      - rack: rack-2
        nodes: [node3, node4]
      - rack: rack-3
        nodes: [node5, node6]

  replication:
    strategy: rack_aware
    min_racks: 2  # Each replica set spans at least 2 racks
```

### Zone-Aware Replication

Distribute across availability zones:

```gql
ALTER GRAPH social SET REPLICATION (
    zones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
    replicas_per_zone: 1,
    leader_preference: 'us-east-1a'
);
```

Ensures cluster survives zone failures.

### Latency-Optimized Routing

Route queries to nearest replica:

```python
# Client automatically selects low-latency replica
client = Client(
    nodes=[
        'node1.us-east.example.com:3141',
        'node2.eu-west.example.com:3141',
        'node3.ap-south.example.com:3141'
    ],
    routing_strategy='latency',  # Measure and route to fastest
    latency_probe_interval=60    # Re-probe every 60 seconds
)
```

## Disaster Recovery Procedures

### Backup Cluster Configuration

```bash
# Backup cluster state
geode admin backup \
  --include-config \
  --include-wal \
  --output /backups/cluster-state-$(date +%Y%m%d).tar.gz

# Backup includes:
# - Node configurations
# - Cluster topology
# - Replication settings
# - WAL files for point-in-time recovery
```

### Restore from Backup

```bash
# Restore cluster
geode admin restore \
  --from /backups/cluster-state-20260124.tar.gz \
  --target-cluster new-cluster \
  --verify-integrity

# Steps performed:
# 1. Validate backup integrity
# 2. Restore data files
# 3. Replay WAL to consistent state
# 4. Rebuild cluster topology
# 5. Verify replication
```

### Failover Scenarios

**Leader Failure**:
1. Followers detect missing heartbeats (5s timeout)
2. Election timer expires (random 150-300ms)
3. Candidate requests votes
4. New leader elected with majority votes
5. Clients automatically reconnect to new leader

**Majority Partition Failure**:
1. Minority partition cannot elect leader
2. Minority rejects all writes
3. Majority partition continues operating
4. When partition heals, minority syncs from majority

**Full Cluster Failure**:
1. Restore from backup or cold storage
2. Replay WAL to latest state
3. Verify data integrity
4. Resume operation

## Security in Distributed Systems

### TLS Mutual Authentication

Encrypt and authenticate inter-node communication:

```yaml
cluster:
  security:
    tls:
      enabled: true
      mutual_auth: true
      cert: /etc/geode/certs/node.crt
      key: /etc/geode/certs/node.key
      ca_cert: /etc/geode/certs/ca.crt
      verify_hostname: true
```

### Network Segmentation

Isolate cluster communication:

```yaml
cluster:
  network:
    # Client traffic
    client_interface: 0.0.0.0:3141
    client_subnet: 10.0.0.0/24

    # Inter-node traffic (separate network)
    cluster_interface: 192.168.0.10:7000
    cluster_subnet: 192.168.0.0/16
```

### Encryption at Rest

Encrypt data files and WAL:

```yaml
storage:
  encryption:
    enabled: true
    algorithm: AES-256-GCM
    key_source: kms://aws-kms/key-id
    rotate_keys: true
    rotation_period: 90d
```

## Capacity Planning

### Sizing Clusters

**Small Cluster** (Development/Testing):
- 3 nodes
- 4 cores, 16GB RAM per node
- 500GB SSD per node
- Throughput: ~10,000 queries/sec

**Medium Cluster** (Production):
- 5-7 nodes
- 16 cores, 64GB RAM per node
- 2TB NVMe SSD per node
- Throughput: ~100,000 queries/sec

**Large Cluster** (Enterprise):
- 9+ nodes across 3 regions
- 32 cores, 256GB RAM per node
- 10TB NVMe SSD per node
- Throughput: ~1,000,000 queries/sec

### Growth Planning

Monitor cluster utilization:

```gql
SELECT
    node_id,
    cpu_utilization,
    memory_utilization,
    disk_utilization,
    query_latency_p99
FROM SYSTEM.cluster_metrics
WHERE timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp;
```

Add nodes when:
- CPU > 70% sustained
- Memory > 80% sustained
- Disk > 75% utilized
- P99 latency exceeds SLO

## Learn More

- [Designing Data-Intensive Applications](https://dataintensive.net/)
- [Distributed Systems for Practitioners](https://distributed-systems.github.io/)
- [The Raft Consensus Algorithm](https://raft.github.io/)
- [Consistency Models](https://jepsen.io/consistency)
- [Google Spanner Paper](https://research.google/pubs/pub39966/)
- [Amazon DynamoDB Architecture](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
