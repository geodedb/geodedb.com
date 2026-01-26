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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

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
import asyncio
from geode_client import Client, GeodeConnectionError

async def query_with_failover(hosts, query):
    """Try hosts in order until a primary responds."""
    for host in hosts:
        try:
            client = Client(host=host, port=3141)
            async with client.connection() as conn:
                result, _ = await conn.query(query)
                return result.rows
        except GeodeConnectionError:
            await asyncio.sleep(0.2)
            continue
    raise GeodeConnectionError("All primaries unavailable")
```

## Load Balancing

### Read-Write Splitting

Route reads to replicas for horizontal scaling:

```python
from geode_client import Client

primary = Client(host="node1", port=3141)
replica = Client(host="node2", port=3141)

# Write to primary
async with primary.connection() as conn:
    await conn.execute("CREATE (n:Node {id: $id})", {"id": 1})

# Read from replica
async with replica.connection() as conn:
    result, _ = await conn.query("MATCH (n:Node) RETURN COUNT(n) AS total")
    count = result.rows[0]["total"] if result.rows else 0
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

## Advanced High Availability Patterns

### Multi-Region Deployments

Deploy across geographic regions for global availability:

```yaml
global_deployment:
  regions:
    us-east-1:
      nodes: 3
      role: primary
      write_priority: 1
    eu-west-1:
      nodes: 3
      role: secondary
      write_priority: 2
      replication_lag_max: 100ms
    ap-southeast-1:
      nodes: 2
      role: read_replica
      replication_mode: async
  
  routing:
    strategy: geographic_proximity
    failover_policy: automatic
    health_check_interval: 5s
```

### Active-Active Clusters

Multi-master configuration for write scalability:

```bash
# Configure active-active cluster
geode cluster configure --topology active-active \
  --nodes node1:3141,node2:3141,node3:3141 \
  --conflict-resolution last-write-wins \
  --quorum-size 2

# Enable cross-region writes
geode cluster set-region us-east-1 --writable true
geode cluster set-region eu-west-1 --writable true

# Monitor cross-region replication lag
geode cluster monitor --metric replication_lag
```

### Read Replica Scaling

Scale reads horizontally with read replicas:

```python
from geode_client import Client, ReplicaSelector

# Configure connection pool with replicas
client = Client(
    primary="primary.geode.local:3141",
    replicas=[
        "replica1.geode.local:3141",
        "replica2.geode.local:3141",
        "replica3.geode.local:3141"
    ],
    replica_selector=ReplicaSelector.ROUND_ROBIN,
    max_replication_lag=100  # ms
)

# Writes always go to primary
await client.execute("""
    CREATE (u:User {id: $id, name: $name})
""", {"id": 123, "name": "Alice"})

# Reads load-balanced across replicas
result, _ = await client.query("""
    MATCH (u:User) RETURN COUNT(u)
""")
```

## Fault Tolerance Strategies

### Graceful Degradation

Continue operating with reduced functionality during failures:

```python
async def fetch_user_with_degradation(user_id):
    try:
        # Try primary data source
        result, _ = await client.query("""
            MATCH (u:User {id: $id})
            RETURN u
        """, {"id": user_id})
        return result.rows[0] if result.rows else None
    except PrimaryUnavailable:
        try:
            # Fall back to cache
            return await cache.get(f"user:{user_id}")
        except CacheMiss:
            # Minimal degraded response
            return {"id": user_id, "name": "User", "degraded": True}
```

### Circuit Breaker Pattern

Protect system from cascading failures:

```python
from circuitbreaker import CircuitBreaker, CircuitBreakerError

@CircuitBreaker(
    failure_threshold=5,
    recovery_timeout=30,
    expected_exception=DatabaseError
)
async def query_with_circuit_breaker(query, params):
    """Execute query with circuit breaker protection"""
    result, _ = await client.query(query, params)
    return result

# Usage
try:
    result = await query_with_circuit_breaker(
        "MATCH (u:User) RETURN u", {}
    )
except CircuitBreakerError:
    # Circuit open - use cached data or degraded mode
    result = await fallback_data_source()
```

### Bulkhead Isolation

Isolate components to prevent total failure:

```python
import asyncio
from asyncio import Semaphore

class BulkheadPool:
    def __init__(self, max_concurrent=100):
        self.read_semaphore = Semaphore(max_concurrent // 2)
        self.write_semaphore = Semaphore(max_concurrent // 2)
    
    async def execute_read(self, query):
        async with self.read_semaphore:
            result, _ = await client.query(query)
            return result
    
    async def execute_write(self, query):
        async with self.write_semaphore:
            await client.execute(query)

# Reads and writes isolated - write failures don't block reads
pool = BulkheadPool()
read_result = await pool.execute_read("MATCH (n) RETURN n LIMIT 10")
```

## Monitoring and Alerting

### Health Check Implementation

Comprehensive health monitoring:

```python
from dataclasses import dataclass
from enum import Enum

class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

@dataclass
class HealthCheck:
    status: HealthStatus
    checks: dict
    timestamp: datetime

async def comprehensive_health_check(client):
    """Perform comprehensive health check"""
    checks = {}
    
    # Database connectivity
    try:
        await client.execute("MATCH (n) RETURN n LIMIT 1")
        checks['database'] = {'status': 'pass', 'latency_ms': 5}
    except Exception as e:
        checks['database'] = {'status': 'fail', 'error': str(e)}
    
    # Replication lag
    try:
        lag, _ = await client.query("""
            SELECT MAX(replication_lag_ms) as max_lag
            FROM system.replication_status
        """)
        lag_ms = lag.rows[0]['max_lag'] if lag.rows else 0
        checks['replication'] = {
            'status': 'pass' if lag_ms < 100 else 'warn',
            'lag_ms': lag_ms
        }
    except Exception as e:
        checks['replication'] = {'status': 'fail', 'error': str(e)}
    
    # Disk space
    disk_usage = await get_disk_usage()
    checks['disk'] = {
        'status': 'pass' if disk_usage < 80 else 'warn',
        'usage_percent': disk_usage
    }
    
    # Overall status
    if any(c['status'] == 'fail' for c in checks.values()):
        status = HealthStatus.UNHEALTHY
    elif any(c['status'] == 'warn' for c in checks.values()):
        status = HealthStatus.DEGRADED
    else:
        status = HealthStatus.HEALTHY
    
    return HealthCheck(status, checks, datetime.now())
```

### Prometheus Metrics

Export HA metrics for monitoring:

```python
from prometheus_client import Gauge, Counter, Histogram

# Replication metrics
replication_lag = Gauge('geode_replication_lag_seconds', 'Replication lag', ['node'])
failover_count = Counter('geode_failover_total', 'Total failovers')
node_health = Gauge('geode_node_health', 'Node health status', ['node'])

# Update metrics
async def update_ha_metrics(client):
    # Replication lag
    replicas, _ = await client.query("""
        SELECT node_id, replication_lag_ms
        FROM system.replication_status
    """)
    for replica in replicas.rows:
        replication_lag.labels(node=replica['node_id']).set(
            replica['replication_lag_ms'] / 1000.0
        )
    
    # Node health
    nodes, _ = await client.query("SELECT * FROM system.cluster_nodes")
    for node in nodes.rows:
        node_health.labels(node=node['node_id']).set(
            1 if node['status'] == 'healthy' else 0
        )
```

## Disaster Recovery Procedures

### Automated Failover Testing

Chaos engineering for HA validation:

```bash
#!/bin/bash
# failover-test.sh - Automated failover testing

echo "=== Starting Failover Test ==="

# 1. Baseline health check
echo "Checking baseline health..."
geode cluster health

# 2. Simulate primary failure
echo "Simulating primary node failure..."
PRIMARY_NODE=$(geode cluster primary)
geode cluster kill-node $PRIMARY_NODE

# 3. Wait for failover
echo "Waiting for automatic failover..."
timeout=30
while [ $timeout -gt 0 ]; do
    NEW_PRIMARY=$(geode cluster primary)
    if [ "$NEW_PRIMARY" != "$PRIMARY_NODE" ]; then
        echo "Failover completed to $NEW_PRIMARY"
        break
    fi
    sleep 1
    ((timeout--))
done

# 4. Verify cluster health
echo "Verifying post-failover health..."
geode cluster health

# 5. Check data consistency
echo "Checking data consistency..."
geode cluster verify-data

# 6. Restore original primary
echo "Restoring original primary..."
geode cluster start-node $PRIMARY_NODE
geode cluster wait-sync $PRIMARY_NODE

echo "=== Failover Test Complete ==="
```

### Backup Verification

Ensure backups are restorable:

```python
async def verify_backup(backup_path):
    """Verify backup integrity and restorability"""
    
    # 1. Check backup files exist
    backup_files = list_backup_files(backup_path)
    assert len(backup_files) > 0, "No backup files found"
    
    # 2. Verify checksums
    for file in backup_files:
        expected_checksum = read_checksum_file(f"{file}.sha256")
        actual_checksum = compute_sha256(file)
        assert expected_checksum == actual_checksum, f"Checksum mismatch: {file}"
    
    # 3. Test restore to temporary location
    temp_db = create_temp_database()
    await restore_backup(backup_path, temp_db)
    
    # 4. Verify data integrity
    client = Client(temp_db)
    async with client.connection() as client:
        # Check node count
        result, _ = await client.query("MATCH (n) RETURN COUNT(n) as count")
        assert result.rows[0]['count'] > 0, "No nodes in restored database"
        
        # Check sample data
        user, _ = await client.query("MATCH (u:User) RETURN u LIMIT 1")
        assert len(user) > 0, "No users in restored database"
    
    # 5. Cleanup
    cleanup_temp_database(temp_db)
    
    print(f"Backup verification successful: {backup_path}")
```

## Performance Under High Availability

### Load Balancing Algorithms

Intelligent client-side load balancing:

```python
class SmartLoadBalancer:
    def __init__(self, replicas):
        self.replicas = replicas
        self.stats = {r: {'latency': 0, 'errors': 0} for r in replicas}
    
    def select_replica(self):
        """Select replica based on latency and error rate"""
        scores = {}
        for replica, stats in self.stats.items():
            # Lower latency and fewer errors = higher score
            latency_score = 1.0 / (stats['latency'] + 1)
            error_penalty = 0.5 ** stats['errors']
            scores[replica] = latency_score * error_penalty
        
        return max(scores, key=scores.get)
    
    async def execute_on_best_replica(self, query):
        replica = self.select_replica()
        
        start = time.time()
        try:
            result = await self.execute_on(replica, query)
            latency = time.time() - start
            
            # Update stats with exponential moving average
            self.stats[replica]['latency'] = (
                0.7 * self.stats[replica]['latency'] + 0.3 * latency
            )
            self.stats[replica]['errors'] = max(0, self.stats[replica]['errors'] - 1)
            
            return result
        except Exception as e:
            self.stats[replica]['errors'] += 1
            raise
```

### Connection Pooling for HA

Maintain healthy connection pools:

```python
from geode_client import ConnectionPool

pool = ConnectionPool(
    nodes=[
        "node1:3141",
        "node2:3141",
        "node3:3141"
    ],
    min_connections=5,
    max_connections=50,
    connection_timeout=5.0,
    idle_timeout=300.0,
    health_check_interval=30.0,
    max_retries=3,
    retry_backoff=lambda attempt: 2 ** attempt
)

# Automatic connection management
async with pool.acquire() as conn:
    result, _ = await conn.query("MATCH (u:User) RETURN u")
```

## Best Practices Summary

1. **Deploy Minimum 3 Nodes**: Enables quorum-based decisions
2. **Use Odd Node Counts**: Prevents split-brain scenarios (3, 5, 7)
3. **Geographic Distribution**: Spread across availability zones
4. **Monitor Replication Lag**: Alert on lag > 100ms for sync replicas
5. **Test Failover Regularly**: Monthly chaos engineering exercises
6. **Validate Backups**: Weekly restore tests
7. **Capacity Planning**: Maintain 30% headroom for failover
8. **Document Procedures**: Runbooks for all failure scenarios
9. **Automate Everything**: No manual steps in critical path
10. **Measure and Improve**: Track MTTR and MTBF metrics

Browse the tagged content below to discover comprehensive high availability documentation, deployment patterns, and production best practices for Geode.
