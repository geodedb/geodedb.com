---
title: "High Availability"
description: "Configure Geode for continuous operation with automatic failover, replica management, load balancing, and fault tolerance strategies for mission-critical graph database deployments."
keywords:
  - high availability
  - HA configuration
  - fault tolerance
  - automatic failover
  - replica management
  - load balancing
  - uptime
  - redundancy
  - disaster recovery
  - zero downtime
  - SLA
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/high-availability/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# High Availability in Geode

High availability (HA) ensures that Geode remains operational despite hardware failures, network issues, or planned maintenance. For mission-critical applications, downtime translates directly to lost revenue, damaged reputation, and user frustration. Geode provides comprehensive HA capabilities including automatic failover, data replication, and self-healing clusters.

This guide covers HA architecture, configuration, monitoring, and best practices for achieving enterprise-grade availability with Geode deployments.

## Understanding High Availability

### Availability Metrics

**Uptime Percentage**: The percentage of time the system is operational

| Availability | Downtime/Year | Downtime/Month | Downtime/Week |
|-------------|---------------|----------------|---------------|
| 99% (two 9s) | 3.65 days | 7.3 hours | 1.68 hours |
| 99.9% (three 9s) | 8.76 hours | 43.8 minutes | 10.1 minutes |
| 99.99% (four 9s) | 52.6 minutes | 4.38 minutes | 1.01 minutes |
| 99.999% (five 9s) | 5.26 minutes | 26.3 seconds | 6.05 seconds |

**Recovery Objectives**:

- **RTO (Recovery Time Objective)**: Maximum acceptable downtime
- **RPO (Recovery Point Objective)**: Maximum acceptable data loss

Geode's HA features target 99.99%+ availability with near-zero RPO for synchronous replication.

### HA Components

A highly available Geode deployment requires:

1. **Redundant Nodes**: Multiple instances to survive failures
2. **Data Replication**: Copies of data across nodes
3. **Automatic Failover**: Seamless transition when nodes fail
4. **Health Monitoring**: Detection of failures and degradation
5. **Load Balancing**: Distribution of traffic across healthy nodes

## HA Architecture Patterns

### Active-Passive (Primary-Standby)

One primary node handles all traffic; standby nodes remain synchronized for failover:

```
                    ┌─────────────┐
    Clients ───────>│   Primary   │
                    │   (Active)  │
                    └──────┬──────┘
                           │ Replication
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Standby1 │ │ Standby2 │ │ Standby3 │
        │(Passive) │ │(Passive) │ │(Passive) │
        └──────────┘ └──────────┘ └──────────┘
```

**Configuration**:

```toml
# geode.toml - Primary node
[cluster]
mode = "replicated"
role = "primary"

[replication]
mode = "sync"
factor = 3
standby_nodes = [
  "standby1.geode.internal:7687",
  "standby2.geode.internal:7687",
  "standby3.geode.internal:7687"
]

[failover]
enabled = true
promotion_strategy = "automatic"
min_sync_replicas = 1
```

**Advantages**: Simple, strong consistency
**Disadvantages**: Standby resources underutilized

### Active-Active (Multi-Primary)

Multiple nodes handle traffic simultaneously with synchronization:

```
                    ┌──────────────────────────────┐
                    │        Load Balancer         │
                    └──────────────┬───────────────┘
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
        ┌──────────┐         ┌──────────┐         ┌──────────┐
        │  Node 1  │◄───────►│  Node 2  │◄───────►│  Node 3  │
        │ (Active) │  Sync   │ (Active) │  Sync   │ (Active) │
        └──────────┘         └──────────┘         └──────────┘
```

**Configuration**:

```toml
# geode.toml - Active node
[cluster]
mode = "distributed"
role = "data"

[cluster.nodes]
seeds = [
  "node1.geode.internal:7687",
  "node2.geode.internal:7687",
  "node3.geode.internal:7687"
]

[replication]
mode = "sync"
factor = 3
read_preference = "nearest"
write_concern = "majority"
```

**Advantages**: Better resource utilization, horizontal scaling
**Disadvantages**: More complex, potential for conflicts

### Geode Recommended: Raft-Based Clustering

Geode uses Raft consensus for leader election and strong consistency:

```
                    ┌──────────────────────────────┐
                    │        Load Balancer         │
                    └──────────────┬───────────────┘
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
        ┌──────────┐         ┌──────────┐         ┌──────────┐
        │  Node 1  │         │  Node 2  │         │  Node 3  │
        │ (Leader) │────────►│(Follower)│         │(Follower)│
        │  Writes  │         │  Reads   │         │  Reads   │
        └──────────┘         └──────────┘         └──────────┘
              │                    ▲                    ▲
              └────────────────────┴────────────────────┘
                          Log Replication
```

**Configuration**:

```toml
[cluster]
mode = "distributed"
consensus = "raft"

[cluster.raft]
election_timeout_ms = 1500
heartbeat_interval_ms = 150
snapshot_threshold = 10000

[cluster.nodes]
# Odd number for majority consensus
count = 3  # or 5 for higher fault tolerance
```

## Configuring High Availability

### Minimum HA Cluster (3 Nodes)

A three-node cluster tolerates one node failure:

```toml
# geode.toml - Node 1
[server]
node_id = "node1"
listen = "0.0.0.0:3141"

[cluster]
mode = "distributed"
name = "production"

[cluster.nodes]
seeds = [
  "node1.geode.internal:7687",
  "node2.geode.internal:7687",
  "node3.geode.internal:7687"
]

[replication]
factor = 3
mode = "sync"
ack_timeout_ms = 5000

[failover]
enabled = true
detection_interval_ms = 1000
failure_threshold = 3
promotion_delay_ms = 2000
```

### Enhanced HA Cluster (5 Nodes)

A five-node cluster tolerates two simultaneous node failures:

```toml
# geode.toml - 5-node cluster
[cluster]
mode = "distributed"
name = "production-ha"

[cluster.nodes]
seeds = [
  "node1.geode.internal:7687",
  "node2.geode.internal:7687",
  "node3.geode.internal:7687",
  "node4.geode.internal:7687",
  "node5.geode.internal:7687"
]

# With 5 nodes, can lose 2 and maintain majority (3)
[replication]
factor = 3
mode = "sync"

[cluster.placement]
# Spread across availability zones
strategy = "zone-aware"
zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
min_zones_for_write = 2
```

### Geographic Distribution

Deploy across data centers for disaster resilience:

```toml
# Multi-region configuration
[cluster]
mode = "geo-distributed"

[cluster.regions]
primary = "us-east"
secondary = ["us-west", "eu-west"]

[cluster.region.us-east]
nodes = ["node1-east", "node2-east", "node3-east"]
priority = 1

[cluster.region.us-west]
nodes = ["node1-west", "node2-west", "node3-west"]
priority = 2
replication_mode = "async"
max_lag_ms = 1000

[cluster.region.eu-west]
nodes = ["node1-eu", "node2-eu", "node3-eu"]
priority = 3
replication_mode = "async"
max_lag_ms = 5000
```

## Automatic Failover

### Failure Detection

Geode detects failures through multiple mechanisms:

**Heartbeat Monitoring**:

```toml
[health.heartbeat]
interval_ms = 100
timeout_ms = 500
failure_count = 3  # 3 missed = failure
```

**TCP Connection Health**:

```toml
[health.connection]
keepalive_interval_ms = 10000
keepalive_probes = 3
keepalive_timeout_ms = 5000
```

**Application-Level Health Checks**:

```toml
[health.checks]
enabled = true
interval_ms = 5000

[health.checks.storage]
type = "write_test"
timeout_ms = 1000

[health.checks.memory]
type = "threshold"
max_used_percent = 90

[health.checks.disk]
type = "threshold"
min_free_percent = 10
```

### Failover Process

When a node failure is detected:

1. **Detection**: Health check fails or heartbeat timeout
2. **Verification**: Confirm failure from multiple observers
3. **Leader Election**: Raft elects new leader if needed
4. **Promotion**: Replicas promoted to primary for affected shards
5. **Client Redirect**: Clients automatically reconnect
6. **Recovery**: System rebalances when node returns

```gql
-- Monitor failover events
-- Yields event_id, timestamp, category, action, outcome.
CALL audit.get_recent_events(100);
```

### Failover Configuration

```toml
[failover]
enabled = true

# Detection settings
detection_method = "consensus"  # heartbeat, consensus, or both
min_observers = 2

# Timing
detection_timeout_ms = 3000
promotion_delay_ms = 1000
client_redirect_timeout_ms = 5000

# Behavior
auto_promote = true
prefer_sync_replica = true
block_writes_during_failover = false

# Recovery
auto_rejoin = true
rejoin_as = "replica"  # replica or standby
catch_up_mode = "streaming"
```

### Client Failover Handling

**Python Client**:

```python
from geode_client import Client, FailoverConfig

# Configure client for HA
client = Client(
    hosts=[
        "node1.geode.internal:3141",
        "node2.geode.internal:3141",
        "node3.geode.internal:3141"
    ],
    failover=FailoverConfig(
        enabled=True,
        retry_attempts=3,
        retry_delay_ms=100,
        circuit_breaker_threshold=5
    )
)

async def resilient_query():
    async with client.connection() as conn:
        try:
            # Automatic retry on failover
            result, _ = await conn.query(
                "MATCH (u:User {id: $id}) RETURN u",
                {"id": "user-123"}
            )
            return result.rows
        except FailoverInProgressError:
            # Wait for failover to complete
            await asyncio.sleep(1)
            return await resilient_query()
```

**Go Client**:

```go
import (
    "database/sql"
    "geodedb.com/geode"
)

func main() {
    // Connection string with multiple hosts
    dsn := "quic://node1:3141,node2:3141,node3:3141?failover=true"

    db, err := sql.Open("geode", dsn)
    if err != nil {
        log.Fatal(err)
    }

    // Configure connection pool for HA
    db.SetMaxOpenConns(50)
    db.SetMaxIdleConns(10)
    db.SetConnMaxLifetime(5 * time.Minute)

    // Queries automatically retry on failover
    rows, err := db.Query("MATCH (u:User) RETURN u.name")
}
```

## Load Balancing

### Internal Load Balancing

Geode's query coordinators distribute load across data nodes:

```toml
[load_balancing]
enabled = true
algorithm = "least_connections"  # round_robin, least_connections, weighted

[load_balancing.weights]
# Higher weight = more traffic
node1 = 100
node2 = 100
node3 = 50  # Smaller instance

[load_balancing.health]
# Remove unhealthy nodes from rotation
check_interval_ms = 5000
unhealthy_threshold = 3
healthy_threshold = 2
```

### External Load Balancer Configuration

**HAProxy Example**:

```haproxy
frontend geode_frontend
    bind *:3141
    mode tcp
    default_backend geode_backend

backend geode_backend
    mode tcp
    balance leastconn
    option tcp-check

    server node1 node1.geode.internal:3141 check inter 1s fall 3 rise 2
    server node2 node2.geode.internal:3141 check inter 1s fall 3 rise 2
    server node3 node3.geode.internal:3141 check inter 1s fall 3 rise 2
```

**Kubernetes Service**:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: geode-lb
spec:
  type: LoadBalancer
  ports:
    - port: 3141
      targetPort: 3141
      protocol: TCP
  selector:
    app: geode
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
```

### Read/Write Splitting

Route reads to replicas, writes to primary:

```toml
[routing]
write_to = "primary"
read_from = "nearest"  # primary, replica, or nearest

[routing.read_preference]
# Prefer local replica, fall back to primary
strategy = "nearest"
max_staleness_ms = 100
```

**Client-Side Routing**:

```python
from geode_client import Client, ReadPreference

client = Client(hosts=["node1:3141", "node2:3141", "node3:3141"])

async def read_user(user_id):
    async with client.connection(read_preference=ReadPreference.NEAREST) as conn:
        result, _ = await conn.query(
            "MATCH (u:User {id: $id}) RETURN u",
            {"id": user_id}
        )
        return result.rows

async def update_user(user_id, name):
    async with client.connection(read_preference=ReadPreference.PRIMARY) as conn:
        await conn.execute(
            "MATCH (u:User {id: $id}) SET u.name = $name",
            {"id": user_id, "name": name}
        )
```

## Monitoring High Availability

### Key HA Metrics

```bash
# Prometheus metrics for HA monitoring
curl http://node1:9090/metrics | grep -E "geode_cluster|geode_replication|geode_failover"

# Example output
geode_cluster_nodes_total{status="healthy"} 3
geode_cluster_nodes_total{status="unhealthy"} 0
geode_cluster_leader_node{node="node1"} 1
geode_replication_lag_seconds{shard="1",replica="node2"} 0.005
geode_replication_lag_seconds{shard="1",replica="node3"} 0.008
geode_failover_events_total{type="automatic"} 2
geode_failover_duration_seconds_sum 3.45
```

### Health Check Endpoints

```bash
# Liveness probe - is the process running?
curl http://node1:9090/health/live
# Response: {"status": "ok", "uptime_seconds": 86400}

# Readiness probe - can it serve traffic?
curl http://node1:9090/health/ready
# Response: {"status": "ready", "role": "leader", "replicas_synced": 2}

# Cluster health - overall cluster status
curl http://node1:9090/health/cluster
# Response: {
#   "status": "healthy",
#   "nodes": {"total": 3, "healthy": 3, "unhealthy": 0},
#   "replication": {"in_sync": true, "max_lag_ms": 12}
# }
```

### Alerting Rules

```yaml
# Prometheus alerting rules for HA
groups:
  - name: geode_ha_alerts
    rules:
      - alert: GeodeNodeDown
        expr: geode_cluster_nodes_total{status="unhealthy"} > 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Geode cluster has unhealthy nodes"
          description: "{{ $value }} nodes are unhealthy"

      - alert: GeodeReplicationLagHigh
        expr: geode_replication_lag_seconds > 1
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High replication lag detected"
          description: "Replication lag is {{ $value }}s"

      - alert: GeodeNoQuorum
        expr: geode_cluster_nodes_total{status="healthy"} < 2
        for: 10s
        labels:
          severity: critical
        annotations:
          summary: "Geode cluster lost quorum"
          description: "Only {{ $value }} healthy nodes remain"

      - alert: GeodeFailoverFrequent
        expr: rate(geode_failover_events_total[1h]) > 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Frequent failovers detected"
          description: "{{ $value }} failovers in the last hour"

      - alert: GeodeLeaderElectionStuck
        expr: geode_cluster_leader_election_in_progress == 1
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Leader election taking too long"
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Geode High Availability",
    "panels": [
      {
        "title": "Cluster Health",
        "type": "stat",
        "targets": [{
          "expr": "geode_cluster_nodes_total{status='healthy'}"
        }]
      },
      {
        "title": "Replication Lag",
        "type": "graph",
        "targets": [{
          "expr": "geode_replication_lag_seconds",
          "legendFormat": "{{shard}} -> {{replica}}"
        }]
      },
      {
        "title": "Failover Events",
        "type": "graph",
        "targets": [{
          "expr": "rate(geode_failover_events_total[5m])",
          "legendFormat": "Failovers/min"
        }]
      },
      {
        "title": "Node Roles",
        "type": "table",
        "targets": [{
          "expr": "geode_cluster_node_role"
        }]
      }
    ]
  }
}
```

## Testing High Availability

### Chaos Engineering

Verify HA behavior by intentionally causing failures:

```bash
# Kill a node and verify automatic failover
docker stop geode-node2

# Verify cluster continues operating
curl http://node1:9090/health/cluster

# Verify queries still work
./geode shell --host node1:3141 -c "MATCH (n) RETURN count(n)"

# Restart node and verify rejoin
docker start geode-node2

# Verify node rejoined and synced
curl http://node1:9090/health/cluster
```

**Automated HA Test Script**:

```python
import asyncio
import subprocess
from geode_client import Client

async def test_failover():
    client = Client(hosts=["node1:3141", "node2:3141", "node3:3141"])

    # Verify initial state
    async with client.connection() as conn:
        result, _ = await conn.query("MATCH (n) RETURN count(n) as cnt")
        initial_count = result.rows[0]['cnt']
        print(f"Initial node count: {initial_count}")

    # Kill a node
    print("Stopping node2...")
    subprocess.run(["docker", "stop", "geode-node2"])

    # Wait for failover
    await asyncio.sleep(5)

    # Verify cluster still works
    async with client.connection() as conn:
        result, _ = await conn.query("MATCH (n) RETURN count(n) as cnt")
        assert result.rows[0]['cnt'] == initial_count
        print("Cluster operational after failover")

    # Restart node
    print("Restarting node2...")
    subprocess.run(["docker", "start", "geode-node2"])

    # Wait for rejoin
    await asyncio.sleep(10)

    # Verify full recovery
    async with client.connection() as conn:
        result, _ = await conn.query(
            "SHOW CLUSTER STATUS WHERE status = 'healthy'"
        )
        assert len(result.rows) == 3
        print("Full cluster recovered")

asyncio.run(test_failover())
```

### Disaster Recovery Drills

Regularly test full recovery procedures:

1. **Simulate complete cluster failure**
2. **Restore from backup**
3. **Verify data integrity**
4. **Measure RTO and RPO**
5. **Document and improve procedures**

## Best Practices

### Deployment

1. **Use odd number of nodes**: 3, 5, or 7 for clean majority
2. **Spread across failure domains**: Different racks, AZs, or regions
3. **Size for N+1 capacity**: Each node handles (total load / N-1)
4. **Use dedicated networks**: Separate client and replication traffic

### Configuration

1. **Enable synchronous replication**: For zero RPO
2. **Configure appropriate timeouts**: Balance detection speed vs false positives
3. **Set conservative health thresholds**: Avoid unnecessary failovers
4. **Test failover regularly**: Verify HA actually works

### Operations

1. **Monitor replication lag**: Alert before it becomes critical
2. **Perform rolling upgrades**: One node at a time
3. **Maintain runbooks**: Document recovery procedures
4. **Practice disaster recovery**: Regular drills

### Client Applications

1. **Configure connection pools**: Multiple connections for resilience
2. **Implement retry logic**: Handle transient failures
3. **Use circuit breakers**: Prevent cascade failures
4. **Handle failover gracefully**: Inform users of temporary issues

## Related Topics

- [Distributed Systems](/tags/distributed-systems/) - Distributed architecture fundamentals
- [Recovery](/tags/recovery/) - Backup and disaster recovery
- [Clustering](/tags/clustering/) - Cluster setup and management
- [Deployment](/tags/deployment/) - Production deployment patterns
- [Monitoring](/tags/monitoring/) - Observability and alerting
- [Replication](/tags/replication/) - Data replication strategies

## Further Reading

- High Availability Architecture Guide
- Failover Testing Procedures
- Disaster Recovery Planning
- SLA Management Guide
- Chaos Engineering Handbook
- Production Operations Checklist
