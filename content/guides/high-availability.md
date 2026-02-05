---
title: "High Availability Guide"
slug: "high-availability"
description: "Configure Geode for high availability with replication, failover, and disaster recovery"
weight: 51
tags: ["high-availability", "replication", "failover", "clustering", "disaster-recovery"]
categories: ["guides", "deployment"]
keywords:
  - Geode high availability
  - graph database replication
  - failover configuration
  - disaster recovery
  - load balancing
  - geographic distribution
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# High Availability Guide

This guide covers configuring Geode for high availability (HA), including replication, automatic failover, load balancing, and disaster recovery strategies.

## HA Architecture Overview

### Architecture Patterns

Geode supports multiple HA deployment patterns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Single Region HA                          │
│                                                              │
│    ┌─────────┐      ┌─────────┐      ┌─────────┐            │
│    │ Primary │─────▶│ Replica │─────▶│ Replica │            │
│    │  (RW)   │      │  (RO)   │      │  (RO)   │            │
│    └─────────┘      └─────────┘      └─────────┘            │
│         │                                                    │
│         ▼                                                    │
│    ┌─────────────────────────────────────────────┐          │
│    │              Load Balancer                   │          │
│    └─────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Multi-Region HA                            │
│                                                              │
│  Region A              Region B              Region C        │
│  ┌─────────┐          ┌─────────┐          ┌─────────┐      │
│  │ Primary │◀────────▶│ Replica │◀────────▶│ Replica │      │
│  │  (RW)   │   sync   │  (RO)   │   sync   │  (RO)   │      │
│  └─────────┘          └─────────┘          └─────────┘      │
│       │                    │                    │            │
│       ▼                    ▼                    ▼            │
│  ┌─────────┐          ┌─────────┐          ┌─────────┐      │
│  │ Clients │          │ Clients │          │ Clients │      │
│  └─────────┘          └─────────┘          └─────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### HA Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Single Primary** | One read-write primary, multiple read-only replicas | Most production deployments |
| **Multi-Primary** | Multiple read-write nodes with conflict resolution | Global write availability |
| **Active-Passive** | Hot standby for failover | Simpler HA requirements |

### Consistency Levels

| Level | Description | Latency | Durability |
|-------|-------------|---------|------------|
| **Strong** | All replicas acknowledge | Higher | Highest |
| **Quorum** | Majority acknowledges | Medium | High |
| **Eventual** | Primary acknowledges | Lowest | Medium |

## Replication Setup

### Cluster Configuration

Create `/etc/geode/cluster.yaml`:

```yaml
cluster:
  name: "geode-production"

  # Node identity
  node:
    id: "node-1"  # Unique per node
    address: "192.168.1.10:3141"
    zone: "us-east-1a"

  # Cluster membership
  discovery:
    method: "static"  # static, dns, kubernetes
    seeds:
      - "192.168.1.10:3141"
      - "192.168.1.11:3141"
      - "192.168.1.12:3141"

  # Replication settings
  replication:
    enabled: true
    factor: 3  # Number of copies
    consistency: "quorum"  # strong, quorum, eventual

  # Leader election
  election:
    timeout: 10s
    heartbeat: 1s
```

### Primary Node Configuration

```yaml
# /etc/geode/geode.yaml on primary
server:
  listen: "0.0.0.0:3141"
  role: "primary"

cluster:
  name: "geode-production"
  node:
    id: "primary-1"
    address: "192.168.1.10:3141"

replication:
  mode: "sync"  # sync or async

  # Sync replication settings
  sync:
    min_replicas: 2  # Minimum replicas for commit
    timeout: 5s

  # Async replication settings
  async:
    batch_size: 1000
    flush_interval: 100ms
    max_lag: 10s
```

### Replica Node Configuration

```yaml
# /etc/geode/geode.yaml on replica
server:
  listen: "0.0.0.0:3141"
  role: "replica"

cluster:
  name: "geode-production"
  node:
    id: "replica-1"
    address: "192.168.1.11:3141"

replication:
  primary:
    address: "192.168.1.10:3141"

  # Replica behavior
  read_only: true
  catch_up:
    enabled: true
    batch_size: 10000
```

### Starting a Cluster

**Node 1 (Initial Primary)**:
```bash
geode serve --config /etc/geode/geode.yaml --cluster-init
```

**Nodes 2 & 3 (Join as Replicas)**:
```bash
geode serve --config /etc/geode/geode.yaml --join 192.168.1.10:3141
```

### Verifying Cluster Status

```bash
# Check cluster membership
geode cluster status

# Output:
# Cluster: geode-production
# State: healthy
#
# Nodes:
# ┌──────────┬─────────────────┬─────────┬────────┬──────────┐
# │ ID       │ Address         │ Role    │ State  │ Lag      │
# ├──────────┼─────────────────┼─────────┼────────┼──────────┤
# │ primary-1│ 192.168.1.10    │ primary │ online │ -        │
# │ replica-1│ 192.168.1.11    │ replica │ online │ 0ms      │
# │ replica-2│ 192.168.1.12    │ replica │ online │ 2ms      │
# └──────────┴─────────────────┴─────────┴────────┴──────────┘
```

### Replication Monitoring

```bash
# Check replication lag
geode cluster lag

# Check replication health
geode cluster health --verbose

# View replication stream
geode cluster stream --follow
```

## Failover Configuration

### Automatic Failover

```yaml
failover:
  enabled: true

  # Detection settings
  detection:
    heartbeat_interval: 1s
    failure_threshold: 3
    timeout: 5s

  # Election settings
  election:
    algorithm: "raft"
    quorum: 2  # (n/2) + 1

  # Promotion settings
  promotion:
    auto: true
    priority_zones:
      - "us-east-1a"
      - "us-east-1b"
      - "us-east-1c"

  # Recovery settings
  recovery:
    rejoin_as: "replica"
    catch_up_timeout: 300s
```

### Failover Priority

Configure node priority for leader election:

```yaml
cluster:
  node:
    id: "node-1"
    priority: 100  # Higher = more likely to be primary

    # Exclude from primary election
    # priority: 0
```

### Manual Failover

```bash
# Promote a specific replica to primary
geode cluster failover --promote replica-1

# Demote current primary
geode cluster demote primary-1

# Force failover (emergency)
geode cluster failover --force
```

### Failover Events

```bash
# View failover history
geode cluster events --type failover

# Output:
# ┌─────────────────────┬──────────┬──────────┬───────────────────────┐
# │ Timestamp           │ Old      │ New      │ Reason                │
# ├─────────────────────┼──────────┼──────────┼───────────────────────┤
# │ 2026-01-28 10:23:45 │ primary-1│ replica-1│ node_failure          │
# │ 2026-01-28 10:24:30 │ -        │ primary-1│ node_recovered        │
# │ 2026-01-28 14:00:00 │ primary-1│ replica-2│ manual_failover       │
# └─────────────────────┴──────────┴──────────┴───────────────────────┘
```

### Client Failover Handling

**Go Client**:
```go
import (
    "database/sql"
    "time"
    _ "geodedb.com/geode"
)

func main() {
    // Configure with multiple endpoints
    db, err := sql.Open("geode", "quic://primary:3141,replica1:3141,replica2:3141")
    if err != nil {
        log.Fatal(err)
    }

    // Configure connection pool for HA
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(5 * time.Minute)
    db.SetConnMaxIdleTime(1 * time.Minute)
}
```

**Python Client**:
```python
from geode_client import Client, LoadBalancer

# Configure with multiple endpoints
client = Client(
    endpoints=[
        "primary.geode.local:3141",
        "replica1.geode.local:3141",
        "replica2.geode.local:3141",
    ],
    load_balancer=LoadBalancer.ROUND_ROBIN,
    failover=True,
    retry_attempts=3,
    retry_delay=1.0,
)

async with client.connection() as conn:
    # Automatically retries on connection failure
    result = await conn.query("MATCH (n) RETURN count(n)")
```

**Rust Client**:
```rust
use geode_client::{Client, LoadBalancing, RetryPolicy};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::builder()
        .endpoints(vec![
            "primary.geode.local:3141",
            "replica1.geode.local:3141",
            "replica2.geode.local:3141",
        ])
        .load_balancing(LoadBalancing::RoundRobin)
        .retry_policy(RetryPolicy::exponential(3, Duration::from_secs(1)))
        .build()?;

    let conn = client.connect().await?;
    // ...

    Ok(())
}
```

## Load Balancing

### Client-Side Load Balancing

```yaml
# Client configuration
client:
  load_balancing:
    strategy: "round_robin"  # round_robin, least_connections, random

    # Health checking
    health_check:
      enabled: true
      interval: 5s
      timeout: 2s

    # Routing preferences
    routing:
      # Route reads to replicas
      read_preference: "replica"
      # Route writes to primary
      write_preference: "primary"
```

### HAProxy Configuration

```haproxy
# /etc/haproxy/haproxy.cfg

global
    maxconn 10000
    log stdout format raw local0

defaults
    mode tcp
    timeout connect 5s
    timeout client 60s
    timeout server 60s

    # Health checking
    option tcp-check

frontend geode_frontend
    bind *:3141
    default_backend geode_primary

    # Route based on connection flags (if supported)
    # use_backend geode_replicas if { src -f /etc/haproxy/read_clients.txt }

backend geode_primary
    balance first

    # Primary node
    server primary 192.168.1.10:3141 check

    # Fallback to replicas if primary fails
    server replica1 192.168.1.11:3141 check backup
    server replica2 192.168.1.12:3141 check backup

backend geode_replicas
    balance roundrobin

    # All nodes can handle reads
    server primary 192.168.1.10:3141 check
    server replica1 192.168.1.11:3141 check
    server replica2 192.168.1.12:3141 check
```

### NGINX Configuration (UDP Load Balancing)

```nginx
# /etc/nginx/nginx.conf

stream {
    upstream geode_cluster {
        # Health checks
        zone geode_cluster 64k;

        # Servers
        server 192.168.1.10:3141 weight=5;
        server 192.168.1.11:3141 weight=1;
        server 192.168.1.12:3141 weight=1;

        # Load balancing method
        least_conn;
    }

    server {
        listen 3141 udp;
        proxy_pass geode_cluster;
        proxy_timeout 60s;
        proxy_responses 1;

        # Enable proxy protocol for client IP preservation
        # proxy_protocol on;
    }
}
```

### Kubernetes Service Load Balancing

```yaml
apiVersion: v1
kind: Service
metadata:
  name: geode-lb
  namespace: geode
  annotations:
    # AWS NLB
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
    - name: quic
      port: 3141
      protocol: UDP
      targetPort: 3141
  selector:
    app: geode
```

## Connection Pooling

### Server-Side Connection Pooling

```yaml
server:
  connections:
    max: 10000
    per_client: 100

    # Connection lifecycle
    idle_timeout: 300s
    max_lifetime: 3600s

    # Queue settings
    queue_size: 1000
    queue_timeout: 30s
```

### Client-Side Connection Pooling

**Go**:
```go
db, _ := sql.Open("geode", "quic://localhost:3141")

// Pool configuration
db.SetMaxOpenConns(100)        // Max connections
db.SetMaxIdleConns(25)         // Idle connections
db.SetConnMaxLifetime(time.Hour)   // Max connection age
db.SetConnMaxIdleTime(10 * time.Minute)  // Max idle time
```

**Python**:
```python
from geode_client import Client, ConnectionPool

pool = ConnectionPool(
    endpoints=["localhost:3141"],
    min_size=5,
    max_size=50,
    max_idle_time=300,
    max_lifetime=3600,
)

client = Client(pool=pool)

# Get connection from pool
async with client.connection() as conn:
    await conn.query("MATCH (n) RETURN n LIMIT 10")
# Connection returned to pool
```

**Rust**:
```rust
use geode_client::{Client, PoolConfig};

let config = PoolConfig {
    min_connections: 5,
    max_connections: 50,
    connection_timeout: Duration::from_secs(30),
    idle_timeout: Duration::from_secs(300),
    max_lifetime: Duration::from_secs(3600),
};

let client = Client::with_pool("localhost:3141", config).await?;
```

### PgBouncer-Style Pooling

For very high connection counts, use external connection pooling:

```yaml
# /etc/geode-pooler/config.yaml
listen:
  address: "0.0.0.0:3142"

upstream:
  address: "geode:3141"

pool:
  mode: "transaction"  # session, transaction, statement
  size: 100
  reserve: 20

  # Per-user limits
  max_client_connections: 1000
  default_pool_size: 20
  min_pool_size: 5

  # Connection handling
  server_idle_timeout: 600s
  server_lifetime: 3600s
  client_idle_timeout: 0  # No timeout

  # Query handling
  query_timeout: 120s
  query_wait_timeout: 30s
```

## Disaster Recovery

### Backup Strategy

```yaml
backup:
  enabled: true

  # Full backup schedule
  full:
    schedule: "0 2 * * 0"  # Weekly Sunday 2 AM
    retention: 4  # Keep 4 full backups

  # Incremental backup schedule
  incremental:
    schedule: "0 2 * * 1-6"  # Daily except Sunday
    retention: 7  # Keep 7 days

  # Storage location
  storage:
    type: "s3"
    bucket: "geode-backups"
    prefix: "production/"
    region: "us-east-1"

  # Encryption
  encryption:
    enabled: true
    key_file: "/etc/geode/backup-key"
```

### Point-in-Time Recovery

```yaml
wal:
  enabled: true

  # WAL archiving
  archive:
    enabled: true
    command: "s3 cp %p s3://geode-backups/wal/%f"
    timeout: 60s

  # Retention
  retention:
    min_segments: 100
    max_size: 10GB
```

### Recovery Procedures

**Full Recovery**:
```bash
# Stop Geode
sudo systemctl stop geode

# Restore from backup
geode restore \
  --source s3://geode-backups/production/full-2026-01-28.backup \
  --target /var/lib/geode

# Start Geode
sudo systemctl start geode
```

**Point-in-Time Recovery**:
```bash
# Restore to specific point in time
geode restore \
  --source s3://geode-backups/production/full-2026-01-28.backup \
  --wal-source s3://geode-backups/wal/ \
  --target-time "2026-01-28 14:30:00" \
  --target /var/lib/geode
```

### Cross-Region Replication

```yaml
# Primary region (us-east-1)
replication:
  cross_region:
    enabled: true
    mode: "async"

    targets:
      - name: "us-west-2"
        address: "geode-replica.us-west-2.example.com:3141"
        priority: 1

      - name: "eu-west-1"
        address: "geode-replica.eu-west-1.example.com:3141"
        priority: 2

    # Async settings
    batch_size: 5000
    flush_interval: 1s
    max_lag: 60s
```

### Disaster Recovery Runbook

1. **Detection**:
   ```bash
   # Check primary region health
   geode cluster status --region us-east-1

   # Check cross-region replication lag
   geode cluster lag --cross-region
   ```

2. **Assessment**:
   ```bash
   # Determine data loss window
   geode cluster last-transaction --region us-west-2
   ```

3. **Failover**:
   ```bash
   # Promote DR region to primary
   geode cluster promote --region us-west-2

   # Update DNS
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z123456 \
     --change-batch file://dns-failover.json
   ```

4. **Verification**:
   ```bash
   # Verify new primary
   geode cluster status

   # Test connectivity
   geode ping geode.example.com:3141
   ```

5. **Recovery**:
   ```bash
   # When original region recovers, sync data
   geode cluster sync --from us-west-2 --to us-east-1

   # Failback (optional)
   geode cluster failback --to us-east-1
   ```

## Geographic Distribution

### Multi-Region Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Global Load Balancer                     │
│                   (Route53, CloudFlare, etc.)                │
└─────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    US-EAST-1    │  │    EU-WEST-1    │  │   AP-SOUTH-1    │
│                 │  │                 │  │                 │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │  Primary  │◀─┼──┼─▶│  Replica  │◀─┼──┼─▶│  Replica  │  │
│  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │
│       │         │  │       │         │  │       │         │
│       ▼         │  │       ▼         │  │       ▼         │
│  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │  Replica  │  │  │  │  Replica  │  │  │  │  Replica  │  │
│  └───────────┘  │  │  └───────────┘  │  │  └───────────┘  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Region Configuration

```yaml
# Primary region (us-east-1)
cluster:
  name: "geode-global"
  region: "us-east-1"

  node:
    id: "us-east-1-primary"
    role: "primary"

  regions:
    - name: "us-east-1"
      is_primary: true
      nodes:
        - "192.168.1.10:3141"
        - "192.168.1.11:3141"

    - name: "eu-west-1"
      is_primary: false
      nodes:
        - "10.0.1.10:3141"
        - "10.0.1.11:3141"

    - name: "ap-south-1"
      is_primary: false
      nodes:
        - "172.16.1.10:3141"
        - "172.16.1.11:3141"
```

### Read Routing

```yaml
routing:
  # Route reads to nearest region
  read:
    strategy: "nearest"
    fallback: "primary"

  # Route writes to primary
  write:
    strategy: "primary"

  # Latency-based routing
  latency:
    measurement_interval: 30s
    threshold_ms: 50
```

### Conflict Resolution (Multi-Primary)

```yaml
multi_primary:
  enabled: true

  conflict_resolution:
    strategy: "last_write_wins"  # last_write_wins, merge, custom

    # Custom resolution function
    # custom_handler: "conflict_handler.wasm"

  # Vector clock for causality
  causality:
    enabled: true
    clock_type: "vector"
```

## Monitoring HA Clusters

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `geode_cluster_size` | Number of nodes | < 3 |
| `geode_replication_lag_ms` | Replication lag | > 1000ms |
| `geode_leader_changes` | Leader elections | > 2/hour |
| `geode_split_brain_detected` | Split brain events | > 0 |
| `geode_quorum_lost` | Quorum lost events | > 0 |

### Prometheus Metrics

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'geode-cluster'
    static_configs:
      - targets:
          - 'node1:9090'
          - 'node2:9090'
          - 'node3:9090'
    relabel_configs:
      - source_labels: [__address__]
        target_label: node
```

### Grafana Dashboard Panels

```json
{
  "panels": [
    {
      "title": "Cluster Health",
      "type": "stat",
      "targets": [
        {
          "expr": "sum(geode_cluster_node_healthy)",
          "legendFormat": "Healthy Nodes"
        }
      ]
    },
    {
      "title": "Replication Lag",
      "type": "timeseries",
      "targets": [
        {
          "expr": "geode_replication_lag_ms",
          "legendFormat": "{{node}}"
        }
      ]
    },
    {
      "title": "Leader Elections",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(geode_leader_elections_total[5m])",
          "legendFormat": "Elections/min"
        }
      ]
    }
  ]
}
```

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: geode-ha
    rules:
      - alert: GeodeClusterDegraded
        expr: sum(geode_cluster_node_healthy) < 3
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Geode cluster has fewer than 3 healthy nodes"

      - alert: GeodeReplicationLagHigh
        expr: geode_replication_lag_ms > 5000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Replication lag exceeds 5 seconds"

      - alert: GeodeLeaderFlapping
        expr: increase(geode_leader_elections_total[10m]) > 5
        labels:
          severity: warning
        annotations:
          summary: "Frequent leader elections detected"

      - alert: GeodeSplitBrain
        expr: geode_split_brain_detected > 0
        labels:
          severity: critical
        annotations:
          summary: "Split brain condition detected"
```

### Health Check Script

```bash
#!/bin/bash
# /usr/local/bin/check-geode-cluster

set -e

# Check cluster size
CLUSTER_SIZE=$(geode cluster status --format json | jq '.nodes | length')
if [ "$CLUSTER_SIZE" -lt 3 ]; then
    echo "CRITICAL: Cluster size is $CLUSTER_SIZE (expected >= 3)"
    exit 2
fi

# Check replication lag
MAX_LAG=$(geode cluster lag --format json | jq '[.nodes[].lag_ms] | max')
if [ "$MAX_LAG" -gt 5000 ]; then
    echo "WARNING: Max replication lag is ${MAX_LAG}ms"
    exit 1
fi

# Check for split brain
PRIMARIES=$(geode cluster status --format json | jq '[.nodes[] | select(.role=="primary")] | length')
if [ "$PRIMARIES" -gt 1 ]; then
    echo "CRITICAL: Multiple primaries detected (split brain)"
    exit 2
fi

echo "OK: Cluster healthy with $CLUSTER_SIZE nodes, max lag ${MAX_LAG}ms"
exit 0
```

## Testing HA

### Chaos Engineering

```bash
# Kill primary node
geode cluster kill-node primary-1

# Network partition simulation
iptables -A INPUT -s 192.168.1.11 -j DROP

# Slow network
tc qdisc add dev eth0 root netem delay 500ms

# Disk I/O pressure
stress-ng --io 4 --timeout 60s
```

### Failover Testing

```bash
# Automated failover test
geode cluster test failover --duration 5m

# Output:
# Failover Test Results
# =====================
# Scenarios tested: 5
# Passed: 5
# Failed: 0
#
# Details:
# - Primary failure: PASSED (failover in 3.2s)
# - Network partition: PASSED (failover in 4.1s)
# - Disk full: PASSED (failover in 2.8s)
# - Memory pressure: PASSED (no failover needed)
# - Graceful shutdown: PASSED (failover in 1.5s)
```

### Load Testing During Failover

```bash
# Start load test
geode bench --rate 10000 --duration 10m &

# Trigger failover mid-test
sleep 300
geode cluster failover --promote replica-1

# Observe error rate and latency impact
```

## Best Practices

### Do's

1. **Use odd number of nodes** (3, 5, 7) for quorum
2. **Spread across availability zones**
3. **Monitor replication lag continuously**
4. **Test failover regularly**
5. **Automate recovery procedures**
6. **Keep backups in multiple regions**

### Don'ts

1. **Don't use 2-node clusters** (no quorum on failure)
2. **Don't ignore replication lag alerts**
3. **Don't skip failover testing**
4. **Don't use synchronous replication across regions** (too slow)
5. **Don't rely solely on automatic failover** (test manual too)

## Next Steps

- [Production Deployment](/guides/production-deployment/) - Deploy to production
- [Monitoring Guide](/guides/monitoring/) - Set up monitoring and alerting
- [Backup and Restore](/guides/backup-restore/) - Protect your data
- [Performance Tuning](/docs/performance/) - Optimize cluster performance

---

**Questions?** Contact us at [support@geodedb.com](mailto:support@geodedb.com) or visit our [community forum](https://forum.geodedb.com).
