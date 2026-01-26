---
title: "Multi-Datacenter Deployment and Replication"
description: "Complete guide for deploying Geode across multiple datacenters with high availability, disaster recovery, and cross-region replication patterns"
keywords: ["multi-datacenter", "replication", "high availability", "disaster recovery", "federation", "cross-region", "failover", "CDC", "active-active", "active-passive"]
weight: 90
slug: "multi-datacenter"
canonical: "https://geodedb.com/docs/guides/multi-datacenter/"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Multi-Datacenter Deployment and Replication

Deploy Geode across multiple datacenters for high availability, disaster recovery, and global data distribution.

## Overview

Geode supports several multi-datacenter deployment patterns:

1. **Federation** - Distributed query coordination across shards
2. **CDC Replication** - Change Data Capture for asynchronous replication
3. **Active-Active** - Multiple writeable datacenters
4. **Active-Passive** - Primary datacenter with standby replicas
5. **Disaster Recovery** - Backup datacenter for failover

### Key Features

- **High Availability (HA)**: Automatic failover and redundancy
- **Geographic Distribution**: Deploy close to users for low latency
- **Disaster Recovery**: Survive datacenter failures
- **Horizontal Scaling**: Distribute workload across regions
- **Consistency Models**: Eventual, quorum, or strong consistency

## Architecture Patterns

### Pattern 1: Federation (Query Distribution)

**Use Case**: Horizontal scaling within or across datacenters

Federation distributes queries across multiple shards without data replication. Each shard contains a subset of data.

```
┌─────────────────────────────────────────────────┐
│             Query Coordinator                   │
│          (Distributed Query Engine)             │
└──────┬──────────┬──────────┬──────────┬─────────┘
       │          │          │          │
    ┌──▼──┐    ┌──▼──┐    ┌──▼──┐    ┌──▼──┐
    │Shard│    │Shard│    │Shard│    │Shard│
    │  1  │    │  2  │    │  3  │    │  4  │
    └─────┘    └─────┘    └─────┘    └─────┘
   DC-East    DC-East    DC-West    DC-West
```

**Characteristics**:
- Data partitioned across shards
- Queries distributed and results merged
- No replication (each record exists once)
- Best for read-heavy workloads

**Configuration**:
```yaml
federation:
  enabled: true
  coordinator: true
  shards:
    - id: 'shard1-east'
      endpoint: 'shard1.us-east.internal:3141'
      weight: 1.0
      datacenter: 'us-east-1'
    - id: 'shard2-east'
      endpoint: 'shard2.us-east.internal:3141'
      weight: 1.0
      datacenter: 'us-east-1'
    - id: 'shard3-west'
      endpoint: 'shard3.us-west.internal:3141'
      weight: 1.0
      datacenter: 'us-west-2'
    - id: 'shard4-west'
      endpoint: 'shard4.us-west.internal:3141'
      weight: 1.0
      datacenter: 'us-west-2'

  query:
    timeout: '30s'
    max_concurrent: 100
    retry_attempts: 3
    retry_delay: '1s'
```

### Pattern 2: Active-Passive (Disaster Recovery)

**Use Case**: Production + disaster recovery standby

Primary datacenter handles all traffic. Secondary datacenter replicates via CDC for failover.

```
┌──────────────────────┐          ┌──────────────────────┐
│   Primary DC         │          │   Secondary DC       │
│   (Active)           │          │   (Passive/Standby)  │
│                      │          │                      │
│  ┌────────────┐      │   CDC    │  ┌────────────┐      │
│  │   Geode    ├──────┼─────────►│  │   Geode    │      │
│  │  Primary   │      │  Stream  │  │  Replica   │      │
│  └────────────┘      │          │  └────────────┘      │
│                      │          │                      │
│  Writes + Reads      │          │  Reads Only          │
└──────────────────────┘          └──────────────────────┘
      us-east-1                         us-west-2
```

**Characteristics**:
- One writable primary datacenter
- Asynchronous replication to standby
- Manual or automatic failover
- Best for disaster recovery

**Configuration**:
```yaml
# Primary datacenter (us-east-1)
cdc:
  enabled: true
  sinks:
    - type: 'kafka'
      config:
        brokers: 'kafka.us-east.internal:9092'
        topic: 'geode-changes'
        compression: 'zstd'
        acks: 'all'

  retention_period_ms: 604800000  # 7 days
  batch_size: 1000
  flush_interval_ms: 1000

# Secondary datacenter (us-west-2) - CDC consumer
cdc_consumer:
  enabled: true
  source:
    type: 'kafka'
    brokers: 'kafka.us-east.internal:9092'
    topic: 'geode-changes'
    group_id: 'geode-replica-us-west'

  apply_mode: 'async'
  batch_size: 1000
  conflict_resolution: 'source_wins'
```

### Pattern 3: Active-Active (Multi-Master)

**Use Case**: Multiple writable datacenters for global distribution

Both datacenters accept writes. Bidirectional CDC keeps them synchronized.

```
┌──────────────────────┐          ┌──────────────────────┐
│   Datacenter 1       │◄────────►│   Datacenter 2       │
│   (Active)           │   CDC    │   (Active)           │
│                      │   Sync   │                      │
│  ┌────────────┐      │          │  ┌────────────┐      │
│  │   Geode    │◄─────┼─────────►│  │   Geode    │      │
│  │  Primary   │      │          │  │  Primary   │      │
│  └────────────┘      │          │  └────────────┘      │
│                      │          │                      │
│  Writes + Reads      │          │  Writes + Reads      │
└──────────────────────┘          └──────────────────────┘
      us-east-1                         eu-west-1
```

**Characteristics**:
- Both datacenters accept writes
- Bidirectional asynchronous replication
- Conflict resolution required
- Best for global low-latency writes

**Configuration**:
```yaml
# Datacenter 1 (us-east-1)
cdc:
  enabled: true
  sinks:
    - type: 'kafka'
      config:
        brokers: 'kafka-global.internal:9092'
        topic: 'geode-changes-dc1'

cdc_consumer:
  enabled: true
  source:
    type: 'kafka'
    brokers: 'kafka-global.internal:9092'
    topic: 'geode-changes-dc2'  # Consume from DC2

  conflict_resolution: 'last_write_wins'  # or 'custom'

# Datacenter 2 (eu-west-1)
cdc:
  enabled: true
  sinks:
    - type: 'kafka'
      config:
        brokers: 'kafka-global.internal:9092'
        topic: 'geode-changes-dc2'

cdc_consumer:
  enabled: true
  source:
    type: 'kafka'
    brokers: 'kafka-global.internal:9092'
    topic: 'geode-changes-dc1'  # Consume from DC1

  conflict_resolution: 'last_write_wins'
```

### Pattern 4: Hybrid (Federation + Replication)

**Use Case**: Regional sharding with local replication

Combine federation for query distribution with replication for high availability.

```
Region: US-EAST                    Region: US-WEST
┌──────────────────┐               ┌──────────────────┐
│  Coordinator     │◄─────────────►│  Coordinator     │
│                  │   Federation  │                  │
│  ┌────┐  ┌────┐ │               │  ┌────┐  ┌────┐ │
│  │Shd1│  │Rep1│ │               │  │Shd2│  │Rep2│ │
│  └────┘  └────┘ │               │  └────┘  └────┘ │
│     ▲       ▲    │               │     ▲       ▲    │
│     └───CDC─┘    │               │     └───CDC─┘    │
└──────────────────┘               └──────────────────┘
```

**Characteristics**:
- Data partitioned by region (sharding)
- Local replication for HA within region
- Cross-region federation for global queries
- Best for global scale + high availability

## Deployment Guide

### Prerequisites

- **Network**: Cross-datacenter connectivity (VPN or dedicated links)
- **Latency**: <100ms between datacenters (recommended)
- **Bandwidth**: 100 Mbps+ for CDC replication
- **Storage**: Sufficient capacity for replication lag
- **Monitoring**: Cross-datacenter monitoring setup

### Step 1: Network Setup

#### Configure Cross-Datacenter Connectivity

```bash
# Example: WireGuard VPN between datacenters
# On DC1 (us-east-1)
wg genkey | tee dc1-private.key | wg pubkey > dc1-public.key

# /etc/wireguard/wg0.conf
[Interface]
Address = 10.0.1.1/24
PrivateKey = <dc1-private-key>
ListenPort = 51820

[Peer]
PublicKey = <dc2-public-key>
Endpoint = dc2-public-ip:51820
AllowedIPs = 10.0.2.0/24
PersistentKeepalive = 25

# Start WireGuard
wg-quick up wg0
```

#### Verify Connectivity

```bash
# From DC1, ping DC2
ping -c 5 10.0.2.1

# Test latency
ping -c 100 10.0.2.1 | tail -1

# Test bandwidth
iperf3 -s  # On DC2
iperf3 -c 10.0.2.1 -t 30  # On DC1
```

### Step 2: Deploy Federation (Query Distribution)

#### Deploy Coordinator Node

```bash
# On coordinator node (DC1)
cat > /etc/geode/geode.yaml <<EOF
server:
  listen: '0.0.0.0:3141'
  data_dir: '/var/lib/geode/coordinator'

federation:
  enabled: true
  coordinator: true
  shards:
    - id: 'shard1-dc1'
      endpoint: 'geode-shard1.dc1.internal:3141'
      weight: 1.0
      datacenter: 'us-east-1'
    - id: 'shard2-dc1'
      endpoint: 'geode-shard2.dc1.internal:3141'
      weight: 1.0
      datacenter: 'us-east-1'
    - id: 'shard1-dc2'
      endpoint: 'geode-shard1.dc2.internal:3141'
      weight: 1.0
      datacenter: 'us-west-2'
    - id: 'shard2-dc2'
      endpoint: 'geode-shard2.dc2.internal:3141'
      weight: 1.0
      datacenter: 'us-west-2'

  query:
    timeout: '30s'
    max_concurrent: 100
    retry_attempts: 3

logging:
  level: 'info'
  format: 'json'
EOF

# Start coordinator
geode serve --config /etc/geode/geode.yaml
```

#### Deploy Shard Nodes

```bash
# On each shard node
cat > /etc/geode/geode.yaml <<EOF
server:
  listen: '0.0.0.0:3141'
  data_dir: '/var/lib/geode/shard1'

federation:
  enabled: true
  coordinator: false  # This is a shard, not coordinator

storage:
  page_cache_size: '8GB'
  wal_sync_interval: '100ms'

logging:
  level: 'info'
  format: 'json'
EOF

# Start shard
geode serve --config /etc/geode/geode.yaml
```

#### Verify Federation

```gql
-- Connect to coordinator
geode shell --server geode-coordinator.dc1.internal:3141

-- Run distributed query
MATCH (n:Person)
WHERE n.age > 30
RETURN count(n);

-- Check query distribution
EXPLAIN
MATCH (n:Person)
WHERE n.age > 30
RETURN count(n);
-- Should show shards involved in query
```

### Step 3: Deploy CDC Replication

#### Setup Kafka for CDC Stream

```bash
# Deploy Kafka cluster (cross-datacenter accessible)
# kafka-dc1.internal, kafka-dc2.internal

# Create CDC topic
kafka-topics --create \
  --bootstrap-server kafka-dc1.internal:9092 \
  --topic geode-cdc-events \
  --partitions 12 \
  --replication-factor 3 \
  --config retention.ms=604800000  # 7 days
```

#### Configure Primary for CDC

```yaml
# Primary datacenter (us-east-1)
# /etc/geode/geode.yaml
cdc:
  enabled: true
  sinks:
    - type: 'kafka'
      config:
        brokers: 'kafka-dc1.internal:9092,kafka-dc2.internal:9092'
        topic: 'geode-cdc-events'
        compression: 'zstd'
        batch_size: 16384
        linger_ms: 100
        acks: 'all'

  retention_period_ms: 604800000  # 7 days
  batch_size: 1000
  flush_interval_ms: 1000

  # Adaptive batching for high throughput
  adaptive_flush: true
  min_batch_size: 256
  max_batch_size: 32000

  # Backpressure management
  adaptive_backpressure: true
  backpressure_high_pct: 0.85
  backpressure_low_pct: 0.30

  # Filtering (optional)
  include_before_image: true
  include_metadata: true
```

#### Configure Replica for CDC Consumption

```yaml
# Replica datacenter (us-west-2)
# /etc/geode/geode.yaml
cdc_consumer:
  enabled: true
  source:
    type: 'kafka'
    brokers: 'kafka-dc1.internal:9092,kafka-dc2.internal:9092'
    topic: 'geode-cdc-events'
    group_id: 'geode-replica-dc2'
    auto_offset_reset: 'earliest'  # or 'latest' for new data only

  apply_mode: 'async'
  batch_size: 1000
  workers: 4  # Parallel consumers

  # Conflict resolution
  conflict_resolution: 'source_wins'  # or 'timestamp', 'custom'

  # Resume on failure
  checkpoint_interval_ms: 5000
```

#### Verify CDC Replication

```bash
# On primary
geode shell --server geode-primary.dc1.internal:3141
```

```gql
-- Create test data
CREATE GRAPH TestReplication;
USE TestReplication;
CREATE (:Person {name: "Alice", timestamp: timestamp()});
```

```bash
# Wait 5-10 seconds for replication

# On replica
geode shell --server geode-replica.dc2.internal:3141
```

```gql
USE TestReplication;
MATCH (p:Person {name: "Alice"})
RETURN p.name, p.timestamp;
-- Should return Alice with timestamp
```

### Step 4: Configure High Availability

#### Enable Cluster Heartbeats

```yaml
# On all nodes
cluster:
  heartbeat_interval: '5s'
  election_timeout: '30s'
  replication_factor: 3  # Number of replicas

  # Consistency settings
  consistency_level: 'quorum'  # or 'eventual', 'strong'
  read_preference: 'primary_preferred'  # or 'primary', 'secondary', 'nearest'
```

#### Deploy Load Balancer

```nginx
# HAProxy configuration for Geode
# /etc/haproxy/haproxy.cfg

global
    daemon
    maxconn 10000

defaults
    mode tcp
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    balance roundrobin

frontend geode_frontend
    bind *:3141
    default_backend geode_coordinators

backend geode_coordinators
    # Health checks
    option tcp-check

    # Coordinators in DC1
    server coord1-dc1 geode-coord1.dc1.internal:3141 check inter 2000 rise 2 fall 3
    server coord2-dc1 geode-coord2.dc1.internal:3141 check inter 2000 rise 2 fall 3

    # Coordinators in DC2 (backup)
    server coord1-dc2 geode-coord1.dc2.internal:3141 check inter 2000 rise 2 fall 3 backup
```

#### Test Failover

```bash
# Simulate primary coordinator failure
ssh geode-coord1.dc1.internal "systemctl stop geode"

# Verify failover (should connect to coord2)
geode shell --server geode-lb.internal:3141
```

```gql
RETURN 1 AS health_check;
-- Should succeed via backup coordinator
```

```bash
# Restore primary
ssh geode-coord1.dc1.internal "systemctl start geode"
```

## Disaster Recovery Procedures

### Scenario 1: Primary Datacenter Failure

#### Automatic Failover (Active-Passive)

```bash
# 1. Detect primary failure
curl -f https://geode-primary.dc1.internal:3141/health || echo "Primary down"

# 2. Promote replica to primary
ssh geode-replica.dc2.internal

# Stop CDC consumer
systemctl stop geode-cdc-consumer

# Reconfigure as primary
cat > /etc/geode/geode.yaml <<EOF
server:
  listen: '0.0.0.0:3141'

# Enable CDC producer (was consumer)
cdc:
  enabled: true
  sinks:
    - type: 'kafka'
      config:
        brokers: 'kafka-dc2.internal:9092'
        topic: 'geode-cdc-events'
EOF

# Restart as primary
systemctl restart geode

# 3. Update DNS/load balancer
# Point geode.example.com -> geode-replica.dc2.internal

# 4. Verify new primary
geode shell --server geode-replica.dc2.internal:3141
```

```gql
CREATE (:FailoverTest {timestamp: timestamp()});
-- Should succeed
```

#### Restore Primary Datacenter

```bash
# 1. Restore primary infrastructure
# Network, power, hardware, etc.

# 2. Restore from backup
geode restore \
  --source s3://geode-backups/latest \
  --data-dir /var/lib/geode

# 3. Catch up with CDC
# Reconfigure as replica (reverse roles)
cat > /etc/geode/geode.yaml <<EOF
cdc_consumer:
  enabled: true
  source:
    type: 'kafka'
    topic: 'geode-cdc-events'
    auto_offset_reset: 'latest'  # Only new changes
EOF

systemctl start geode

# 4. Verify replication lag
geode-admin replication-status
# Wait for lag: 0

# 5. Failback (reverse roles again)
# Promote DC1 to primary, demote DC2 to replica
```

### Scenario 2: Network Partition (Split Brain)

#### Detection

```bash
# Monitor cluster health
geode-admin cluster-status

# Output if partitioned:
# DC1: 2 nodes connected
# DC2: 2 nodes connected
# ERROR: Split brain detected (quorum lost)
```

#### Resolution

```bash
# 1. Identify which partition has quorum
# DC1: 2 nodes, DC2: 2 nodes (tie)

# 2. Manual intervention: choose primary
# Shut down DC2 nodes temporarily
ssh geode-coord1.dc2.internal "systemctl stop geode"
ssh geode-coord2.dc2.internal "systemctl stop geode"

# 3. DC1 forms quorum
# Verify writes work
geode shell --server geode-coord1.dc1.internal:3141
```

```gql
CREATE (:SplitBrainTest {resolved: true});
```

```bash
# 4. Restore DC2 as replicas
# Restore data from DC1
geode-admin sync-replica \
  --source geode-coord1.dc1.internal:3141 \
  --target geode-coord1.dc2.internal:3141

# Start DC2 nodes
systemctl start geode

# 5. Re-enable replication
systemctl start geode-cdc-consumer
```

## Monitoring and Observability

### Key Metrics

#### Replication Lag

```promql
# Prometheus query
geode_cdc_replication_lag_seconds{datacenter="dc2"}

# Alert if lag > 60 seconds
geode_cdc_replication_lag_seconds > 60
```

#### CDC Throughput

```promql
# Events per second
rate(geode_cdc_events_total[5m])

# Bytes per second
rate(geode_cdc_bytes_total[5m])
```

#### Federation Query Performance

```promql
# Cross-datacenter query latency
histogram_quantile(0.99, geode_federation_query_duration_seconds)

# Shard availability
geode_federation_shard_available{shard="shard1-dc2"}
```

### Monitoring Dashboard

```bash
# Import Grafana dashboard
curl -X POST \
  -H "Content-Type: application/json" \
  -d @multi-dc-dashboard.json \
  http://grafana.internal:3000/api/dashboards/db
```

**Dashboard Panels**:
- Replication lag per datacenter
- CDC event throughput
- Cross-datacenter network latency
- Shard health status
- Conflict resolution rate
- Query distribution across shards

### Alerting Rules

```yaml
# Prometheus alerts
groups:
  - name: multi_datacenter
    rules:
      - alert: HighReplicationLag
        expr: geode_cdc_replication_lag_seconds > 60
        for: 5m
        annotations:
          summary: "CDC replication lag exceeds 60s"

      - alert: DatacenterUnavailable
        expr: up{job="geode", datacenter="dc2"} == 0
        for: 2m
        annotations:
          summary: "Datacenter DC2 is unavailable"

      - alert: SplitBrainDetected
        expr: |
          count(geode_cluster_quorum{status="active"}) > 1
        annotations:
          summary: "Multiple quorums detected (split brain)"
```

## Conflict Resolution

### Conflict Types

1. **Write-Write Conflicts**: Same entity modified in both datacenters
2. **Delete-Write Conflicts**: Entity deleted in DC1, modified in DC2
3. **Schema Conflicts**: Schema changes in both datacenters

### Resolution Strategies

#### Last-Write-Wins (Timestamp-Based)

```yaml
cdc_consumer:
  conflict_resolution: 'last_write_wins'
  timestamp_field: '_last_modified'
```

**Pros**: Simple, deterministic
**Cons**: May lose updates

#### Source-Wins (Primary Takes Precedence)

```yaml
cdc_consumer:
  conflict_resolution: 'source_wins'
```

**Pros**: Consistent with primary
**Cons**: Replica writes lost

#### Custom Resolution

```zig
// Custom conflict handler
pub fn resolveConflict(
    local: ChangeEvent,
    remote: ChangeEvent,
) !ResolvedEvent {
    // Business logic
    if (local.entity_type == .node) {
        // Merge properties
        return try mergeNodeProperties(local, remote);
    }

    // Default: last-write-wins
    return if (local.timestamp > remote.timestamp) local else remote;
}
```

```yaml
cdc_consumer:
  conflict_resolution: 'custom'
  conflict_handler: '/etc/geode/conflict_handler.so'
```

## Performance Tuning

### Network Optimization

```yaml
# Increase batch sizes for cross-datacenter CDC
cdc:
  batch_size: 32000  # Up from 1000
  flush_interval_ms: 5000  # Buffer longer

  # Enable compression
  sinks:
    - type: 'kafka'
      config:
        compression: 'zstd'  # Best compression ratio
```

### Replication Throughput

```yaml
# Parallel CDC consumers
cdc_consumer:
  workers: 8  # Match number of cores
  batch_size: 5000
  prefetch_count: 50  # Kafka prefetch
```

### Query Routing

```yaml
# Prefer local shards for reads
federation:
  query:
    locality_preference: true  # Route to nearest datacenter
    shard_affinity: true  # Sticky routing for related queries
```

## Best Practices

### Do's

✅ **Monitor replication lag** - Alert if lag exceeds threshold
✅ **Test failover regularly** - Quarterly DR drills
✅ **Use compression** - Reduce cross-datacenter bandwidth
✅ **Implement idempotency** - Handle duplicate events
✅ **Plan for split-brain** - Clear resolution procedures
✅ **Document runbooks** - Failover and recovery steps
✅ **Version CDC schema** - Handle schema evolution

### Don'ts

❌ **Don't ignore conflicts** - Silent data loss
❌ **Don't skip backups** - CDC isn't backup
❌ **Don't overload network** - Saturating cross-DC links
❌ **Don't assume synchronous** - CDC is async
❌ **Don't forget monitoring** - Blind to issues
❌ **Don't hard-code IPs** - Use service discovery
❌ **Don't skip testing** - Fail during real disaster

## Troubleshooting

### Replication Lag Increasing

**Symptoms**: `geode_cdc_replication_lag_seconds` growing

**Causes**:
1. Network congestion
2. Kafka throughput insufficient
3. Consumer too slow

**Solutions**:
```bash
# Check network bandwidth
iperf3 -c kafka.dc2.internal

# Increase Kafka partitions
kafka-topics --alter --partitions 24 --topic geode-cdc-events

# Add CDC consumer workers
# In geode.yaml
cdc_consumer:
  workers: 16  # Increase parallelism
```

### Split Brain Scenario

**Symptoms**: Multiple nodes claim to be primary

**Solutions**:
```bash
# 1. Identify nodes in each partition
geode-admin cluster-status --all

# 2. Choose primary partition (larger or DC1)
# 3. Shut down minority partition
for node in dc2-nodes; do
  ssh $node "systemctl stop geode"
done

# 4. Resync minority from primary
geode-admin resync-cluster \
  --source dc1 \
  --targets dc2-nodes
```

### CDC Events Lost

**Symptoms**: Missing data in replica

**Causes**:
1. Kafka retention expired
2. Consumer offset reset
3. Network partition during write

**Solutions**:
```bash
# Check Kafka retention
kafka-topics --describe --topic geode-cdc-events

# Restore from backup + replay CDC
geode restore --source s3://backups/last-full
geode-admin replay-cdc \
  --from-timestamp "2024-01-20T00:00:00Z" \
  --to-timestamp "now"
```

## Next Steps

- [Backup Automation](/docs/guides/backup-automation/) - Automated backup strategies
- [Server Configuration](/docs/configuration/server-configuration/) - Federation config details
- [Distributed Architecture](/docs/architecture/distributed-architecture/) - Architecture deep dive
- [Monitoring](/docs/ops/observability/) - Comprehensive monitoring setup
- [Performance Tuning](/docs/performance/) - Optimize multi-DC performance

## Reference

### Configuration Files

- [Federation Config](#step-2-deploy-federation-query-distribution)
- [CDC Config](#step-3-deploy-cdc-replication)
- [HA Config](#step-4-configure-high-availability)

### CLI Commands

```bash
# Cluster management
geode-admin cluster-status
geode-admin shard-add --id shard3 --endpoint host:3141
geode-admin shard-remove --id shard1

# CDC management
geode-admin cdc-status
geode-admin cdc-reset-offset --topic geode-cdc-events
geode-admin replay-cdc --from-timestamp <ts>

# Replication management
geode-admin replication-status
geode-admin resync-replica --source <primary> --target <replica>
geode-admin promote-replica --node <node-id>
```

---

**License**: Apache License 2.0
**Copyright**: 2024-2025 CodePros
**Last Updated**: January 2026
