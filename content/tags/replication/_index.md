---
title: "Data Replication"
description: "Comprehensive guide to data replication in Geode, covering synchronous and asynchronous replication, master-slave topologies, multi-master replication, and replication strategies for high-availability graph databases."
keywords:
  - data replication
  - database replication
  - synchronous replication
  - asynchronous replication
  - master-slave
  - multi-master
  - replication lag
  - Geode replication
  - high availability
  - data redundancy
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/replication/"
    noindex: false
---

# Data Replication

Data replication is the process of maintaining multiple copies of data across different nodes in a distributed graph database system. Geode provides enterprise-grade replication capabilities that ensure data availability, fault tolerance, and geographic distribution while maintaining consistency guarantees. This comprehensive guide explores replication architectures, synchronization strategies, configuration options, and operational best practices for production deployments.

## Understanding Data Replication

Replication creates redundant copies of graph data across multiple database nodes, providing several critical benefits:

- **High Availability**: If one node fails, other replicas continue serving requests
- **Fault Tolerance**: Data survives hardware failures and network partitions
- **Read Scalability**: Distribute read queries across multiple replicas
- **Geographic Distribution**: Place data closer to users for lower latency
- **Disaster Recovery**: Maintain copies in different data centers or regions

For graph databases, replication must handle both nodes and relationships while preserving graph structure and maintaining referential integrity across replicas.

## Replication Topologies

### Master-Slave Replication

Master-slave (primary-replica) is the most common replication topology where one node accepts writes and propagates changes to read-only replicas:

```yaml
replication:
  topology: "master_slave"

  master:
    # Primary node configuration
    node_id: "master1"
    listen: "0.0.0.0:3141"

    # Replica management
    replicas:
      - id: "replica1"
        address: "replica1.example.com:3141"
        sync_mode: "async"

      - id: "replica2"
        address: "replica2.example.com:3141"
        sync_mode: "async"

      - id: "replica3"
        address: "replica3.example.com:3141"
        sync_mode: "sync"

    # Replication settings
    replication_factor: 3
    min_sync_replicas: 1
```

**Advantages**:
- Simple to understand and operate
- Consistent write path through single master
- Read scaling through multiple replicas
- Clear failure modes

**Disadvantages**:
- Single point of failure for writes
- Limited write scalability
- Master can become bottleneck

**Use Cases**:
- Read-heavy workloads
- Applications requiring strong consistency
- Traditional OLTP systems

### Multi-Master Replication

Multi-master replication allows writes on any node, with changes propagated to all other masters:

```yaml
replication:
  topology: "multi_master"

  cluster:
    nodes:
      - id: "master1"
        address: "master1.example.com:3141"
        region: "us-east"

      - id: "master2"
        address: "master2.example.com:3141"
        region: "us-west"

      - id: "master3"
        address: "master3.example.com:3141"
        region: "eu-west"

  # Conflict resolution
  conflict_resolution:
    strategy: "last_write_wins"
    timestamp_source: "hybrid_logical_clock"

  # Replication mode
  replication_mode: "asynchronous"
```

**Advantages**:
- No single point of failure
- Write scalability across multiple nodes
- Geographic distribution of write capacity
- Lower write latency for distributed users

**Disadvantages**:
- Complex conflict resolution
- Eventual consistency challenges
- More complex failure scenarios

**Use Cases**:
- Globally distributed applications
- High write throughput requirements
- Multi-region deployments

### Chain Replication

Chain replication organizes replicas in a linear chain for efficient propagation:

```yaml
replication:
  topology: "chain"

  chain:
    # Head node receives writes
    head: "node1.example.com:3141"

    # Chain members
    members:
      - "node2.example.com:3141"
      - "node3.example.com:3141"

    # Tail node confirms commits
    tail: "node4.example.com:3141"

  # Chain configuration
  chain_replication:
    # Acknowledge after tail confirms
    ack_mode: "tail"

    # Propagation timeout
    propagation_timeout_ms: 1000
```

**Advantages**:
- Strong consistency guarantees
- Efficient bandwidth usage
- Simple failure recovery

**Disadvantages**:
- Higher latency for acknowledgments
- Chain length limits scalability
- Head node can become bottleneck

**Use Cases**:
- Strong consistency requirements
- Linear data flow patterns
- Storage systems requiring durability

## Synchronization Strategies

### Synchronous Replication

Synchronous replication waits for replicas to acknowledge writes before returning success:

```yaml
replication:
  synchronous:
    # Require acknowledgment from replicas
    enabled: true

    # Wait for N replicas
    required_acks: 2

    # Acknowledgment timeout
    timeout_ms: 5000

    # Fail if timeout exceeded
    on_timeout: "fail"

    # Durability guarantees
    durability:
      fsync: true
      write_ahead_log: true
```

**Transaction Example**:

```gql
-- Synchronous write with guaranteed replication
BEGIN TRANSACTION WITH DURABILITY LEVEL SYNCHRONOUS;

CREATE (u:User {
  id: $user_id,
  name: $name,
  email: $email,
  created: current_timestamp()
});

-- This commit waits for replica acknowledgments
COMMIT;
```

**Characteristics**:
- **Latency**: Higher due to network round-trips
- **Consistency**: Strong consistency guarantees
- **Availability**: Lower (requires replica acknowledgment)
- **Durability**: Maximum (data on multiple nodes before confirmation)

### Asynchronous Replication

Asynchronous replication returns success immediately and propagates changes in the background:

```yaml
replication:
  asynchronous:
    enabled: true

    # Background replication
    background:
      # Replication workers
      worker_threads: 4

      # Batch size for efficiency
      batch_size: 100

      # Maximum batch delay
      max_delay_ms: 100

    # Replication lag monitoring
    lag_monitoring:
      enabled: true
      warn_threshold_ms: 1000
      critical_threshold_ms: 5000
```

**Characteristics**:
- **Latency**: Low (immediate return)
- **Consistency**: Eventual consistency
- **Availability**: High (no dependency on replicas)
- **Durability**: Lower (potential data loss if primary fails)

### Semi-Synchronous Replication

Semi-synchronous replication waits for at least one replica while allowing others to lag:

```yaml
replication:
  semi_synchronous:
    enabled: true

    # Wait for at least one replica
    min_sync_replicas: 1

    # Timeout for synchronous replica
    sync_timeout_ms: 1000

    # Fall back to async if timeout
    fallback_mode: "asynchronous"

    # Promote async replicas if needed
    auto_promote: true
```

**Characteristics**:
- Balance between performance and durability
- Guarantees at least one replica has data
- Better availability than fully synchronous
- Lower latency than fully synchronous

## Replication Configuration

### Basic Replication Setup

Configure a master with two replicas:

```yaml
# master-config.yaml
replication:
  enabled: true
  role: "master"

  # Replication settings
  replication_factor: 3
  sync_mode: "semi_synchronous"
  min_sync_replicas: 1

  # Write-ahead log for replication
  wal:
    enabled: true
    directory: "/var/lib/geode/wal"
    max_size_gb: 10
    retention_hours: 24

  # Replica configuration
  replicas:
    - name: "replica1"
      address: "replica1.example.com:3141"
      sync_mode: "sync"

    - name: "replica2"
      address: "replica2.example.com:3141"
      sync_mode: "async"

  # Replication monitoring
  monitoring:
    lag_threshold_ms: 1000
    health_check_interval_ms: 5000
```

### Replica Configuration

```yaml
# replica-config.yaml
replication:
  enabled: true
  role: "replica"

  # Master connection
  master:
    address: "master.example.com:3141"
    connection:
      retry_interval_ms: 1000
      max_retries: 10
      timeout_ms: 30000

  # Replica settings
  replica:
    # Read-only mode
    read_only: true

    # Apply replication stream
    apply_lag_target_ms: 100

    # Buffer for replication data
    buffer_size_mb: 256

  # Failover configuration
  failover:
    # Enable automatic promotion
    auto_promote: true

    # Promotion criteria
    criteria:
      max_lag_ms: 5000
      min_uptime_seconds: 300
```

## Replication Operations

### Setting Up Replication

Initialize replication on a running system:

```bash
# Configure master node
geode replication init-master \
  --listen=0.0.0.0:3141 \
  --wal-dir=/var/lib/geode/wal \
  --replication-factor=3

# Add replica
geode replication add-replica \
  --name=replica1 \
  --address=replica1.example.com:3141 \
  --sync-mode=async

# Start replica and connect to master
geode replication init-replica \
  --master=master.example.com:3141 \
  --replica-id=replica1
```

### Managing Replicas

Monitor and manage replication:

```bash
# View replication status
geode replication status

# Check replication lag
geode replication lag --all

# Pause replication on replica
geode replication pause --replica=replica1

# Resume replication
geode replication resume --replica=replica1

# Rebuild replica from snapshot
geode replication rebuild \
  --replica=replica1 \
  --snapshot=latest

# Remove replica
geode replication remove-replica \
  --name=replica1 \
  --force
```

### Failover and Promotion

Handle master failures:

```bash
# Manual failover to replica
geode replication promote \
  --replica=replica1 \
  --force

# List promotion candidates
geode replication promotion-candidates

# Configure automatic failover
geode replication configure-failover \
  --auto-promote=true \
  --max-lag=5000ms \
  --timeout=30s
```

## Replication Monitoring

### Replication Metrics

Track replication health and performance:

```yaml
monitoring:
  replication:
    enabled: true

    metrics:
      # Replication lag in milliseconds
      - name: "replication_lag_ms"
        type: "gauge"
        labels: ["replica_id"]

      # Bytes replicated per second
      - name: "replication_throughput_bytes"
        type: "gauge"
        labels: ["replica_id"]

      # Replication operations
      - name: "replication_ops_total"
        type: "counter"
        labels: ["replica_id", "operation"]

      # Replication errors
      - name: "replication_errors_total"
        type: "counter"
        labels: ["replica_id", "error_type"]

    # Export to Prometheus
    prometheus:
      enabled: true
      port: 9090
```

Key metrics:

- `geode_replication_lag_ms`: Time lag between master and replica
- `geode_replication_throughput_bytes_per_sec`: Replication data rate
- `geode_replication_queue_size`: Pending replication operations
- `geode_replication_connected_replicas`: Number of connected replicas
- `geode_replication_lag_seconds_p99`: 99th percentile lag

### Diagnostic Queries

```gql
-- Check replication status
CALL dbms.replication.status()
YIELD replica_id, lag_ms, state, last_transaction;

-- View replication topology
CALL dbms.replication.topology()
YIELD role, node_id, replicas;

-- Get replication statistics
CALL dbms.replication.stats()
YIELD bytes_replicated, ops_per_second, avg_lag_ms;
```

## Advanced Replication Features

### Selective Replication

Replicate only specific graph elements:

```yaml
replication:
  selective:
    enabled: true

    # Replicate specific labels
    labels:
      include: ["User", "Product", "Order"]
      exclude: ["TempData", "SessionInfo"]

    # Replicate by property
    filters:
      - label: "User"
        property: "region"
        values: ["US", "EU"]

      - label: "Order"
        property: "status"
        values: ["completed", "shipped"]
```

### Cascading Replication

Create replication hierarchies:

```yaml
replication:
  cascading:
    enabled: true

    # Tier 1: Primary to regional masters
    tier1:
      - replica: "us_master"
        cascade: true

      - replica: "eu_master"
        cascade: true

    # Tier 2: Regional masters to local replicas
    tier2:
      us_master:
        replicas: ["us_replica1", "us_replica2"]

      eu_master:
        replicas: ["eu_replica1", "eu_replica2"]
```

### Point-in-Time Recovery

Replay replication stream to specific point in time:

```bash
# Create PITR snapshot
geode replication snapshot \
  --name=before_migration \
  --timestamp="2024-01-24T10:00:00Z"

# Restore to point in time
geode replication restore \
  --snapshot=before_migration \
  --target-replica=recovery_node

# List available snapshots
geode replication snapshots --list
```

## Best Practices

### Replication Strategy Selection

1. **Synchronous Replication**: Critical data requiring zero data loss (financial transactions, audit logs)

2. **Asynchronous Replication**: High-throughput workloads where eventual consistency is acceptable (analytics, caching)

3. **Semi-Synchronous**: Balanced approach for most production workloads

4. **Multi-Master**: Globally distributed applications with regional write requirements

### Configuration Guidelines

- **Replication Factor**: Use 3 replicas for production (tolerates 1-2 node failures)
- **Minimum Sync Replicas**: Set to 1 for semi-synchronous replication
- **Lag Thresholds**: Alert at 1 second lag, escalate at 5 seconds
- **WAL Retention**: Keep 24-48 hours for recovery scenarios
- **Network Bandwidth**: Provision 2-3x peak write throughput for replication

### Operational Best Practices

- Monitor replication lag continuously
- Test failover procedures regularly
- Use geographically distributed replicas for disaster recovery
- Automate replica promotion for high availability
- Document replication topology and dependencies
- Implement gradual rollout for replication configuration changes

## Troubleshooting

### Common Replication Issues

**High Replication Lag**: Replicas falling behind master.

*Solution*: Increase network bandwidth, optimize replica hardware, reduce write load, or add more replica workers.

**Replication Broken**: Replica disconnected from master.

*Solution*: Check network connectivity, verify credentials, examine WAL availability, consider rebuilding replica.

**Replication Conflicts**: Multi-master conflicts requiring resolution.

*Solution*: Review conflict resolution strategy, analyze conflicting transactions, implement application-level conflict handling.

**Disk Space**: WAL consuming too much disk space.

*Solution*: Reduce WAL retention, increase replica synchronization frequency, add disk capacity.

### Diagnostic Commands

```bash
# Check replication connectivity
geode replication ping --all

# Analyze replication lag
geode replication analyze-lag \
  --window=1h \
  --show-peaks

# Verify replication consistency
geode replication verify-consistency \
  --replica=replica1 \
  --sample-rate=0.01

# Export replication logs
geode replication export-logs \
  --replica=replica1 \
  --output=replication-logs.json

# Test failover procedure
geode replication test-failover \
  --dry-run \
  --target-replica=replica1
```

## Related Topics

- [Clustering](/tags/clustering/) - Database clustering and multi-node deployment
- [Consistency](/tags/consistency/) - Data consistency models
- [High Availability](/tags/high-availability/) - Building resilient systems
- [Disaster Recovery](/tags/disaster-recovery/) - Backup and recovery strategies
- [Scalability](/tags/scalability/) - Horizontal scaling approaches
- [Distributed](/tags/distributed/) - Distributed systems architecture

## Further Reading

- [Replication Architecture Guide](/docs/architecture/replication/)
- [Failover and High Availability](/docs/operations/failover/)
- [Replication Performance Tuning](/docs/performance/replication/)
- [Multi-Region Deployment](/docs/deployment/multi-region/)
- [Replication Best Practices](/docs/guides/replication-best-practices/)
- [Disaster Recovery Planning](/docs/operations/disaster-recovery/)
