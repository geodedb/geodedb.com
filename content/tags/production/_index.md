---
title: "Production Deployment"
description: "Production deployment guide for Geode graph database. High-availability architecture, monitoring, backup strategies, security hardening, and operational best practices."
keywords:
  - production deployment
  - enterprise deployment
  - high availability
  - production-ready
  - operational excellence
  - deployment strategy
  - production environment
  - enterprise graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/production/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Production Deployment

Deploy Geode graph database to production environments with confidence. This comprehensive guide covers high-availability architecture, monitoring strategies, backup procedures, security hardening, and operational excellence for running Geode at scale.

## Production Readiness

Geode is battle-tested for demanding production workloads:

**Proven Reliability**:
- 97.4% test coverage (1644/1688 tests passing)
- 100% GQL compliance (70/70 ISO tests)
- ACID-compliant transactions
- Production deployments handling high query volumes

**Enterprise Features**:
- Row-level security for multi-tenant architectures
- Full transactional consistency with savepoints
- TLS 1.3 encryption for all connections
- Comprehensive audit logging

**Performance at Scale**:
- Transaction throughput: read-only up to 100,000 txn/sec; read-write 10,000-50,000 txn/sec; write-heavy 5,000-20,000 txn/sec
- Concurrent connections: 10,000+ supported
- Point lookup latency: <1ms (typically 100-500us); short path 1-5ms

## Architecture Patterns

### Single-Node Deployment

**Use Cases**:
- Development and testing environments
- Low-traffic production workloads
- Applications requiring ACID guarantees without replication complexity
- Budget-constrained deployments

**Configuration**:
```yaml
# geode.yaml
server:
  listen: 0.0.0.0:3141
  max_connections: 1000

  tls:
    cert_file: /etc/geode/tls/server.crt
    key_file: /etc/geode/tls/server.key
    client_ca: /etc/geode/tls/ca.crt

storage:
  data_dir: /var/lib/geode/data
  wal_dir: /var/lib/geode/wal
  checkpoint_interval: 300s

logging:
  level: info
  output: /var/log/geode/server.log
  format: json

performance:
  query_timeout: 60s
  transaction_timeout: 300s
  max_query_memory: 2GB
  worker_threads: 8
```

**Deployment**:
```bash
# SystemD service
cat > /etc/systemd/system/geode.service <<EOF
[Unit]
Description=Geode Graph Database
After=network.target

[Service]
Type=simple
User=geode
Group=geode
ExecStart=/usr/local/bin/geode serve --config /etc/geode/geode.yaml
Restart=on-failure
RestartSec=5s
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable geode
systemctl start geode
```

### High-Availability Cluster

**Use Cases**:
- Business-critical applications requiring 99.99% uptime
- High-traffic workloads (throughput depends on workload and server limits)
- Geographic distribution for disaster recovery
- Applications with strict RTO/RPO requirements

**Architecture**:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Leader    │────▶│  Follower 1 │     │  Follower 2 │
│  (Write)    │     │   (Read)    │     │   (Read)    │
└──────┬──────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       │                    │                    │
       └────────────────────┴────────────────────┘
                   Raft Consensus
```

**Configuration (Leader)**:
```yaml
server:
  listen: 0.0.0.0:3141
  cluster:
    enabled: true
    node_id: leader-1
    peers:
      - follower-1.internal:3141
      - follower-2.internal:3141
    election_timeout: 300ms
    heartbeat_interval: 100ms

replication:
  mode: synchronous  # or asynchronous for performance
  min_replicas: 1    # Wait for 1 replica before committing
```

**Configuration (Follower)**:
```yaml
server:
  listen: 0.0.0.0:3141
  cluster:
    enabled: true
    node_id: follower-1
    leader: leader-1.internal:3141
    peers:
      - leader-1.internal:3141
      - follower-2.internal:3141

replication:
  mode: asynchronous
  catch_up_batch_size: 1000
```

### Kubernetes Deployment

**StatefulSet Configuration**:
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: geode
  namespace: production
spec:
  serviceName: geode
  replicas: 3
  selector:
    matchLabels:
      app: geode
  template:
    metadata:
      labels:
        app: geode
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - geode
              topologyKey: kubernetes.io/hostname

      containers:
      - name: geode
        image: geodedb/geode:0.18.0
        ports:
        - containerPort: 3141
          name: client
        - containerPort: 3142
          name: cluster

        env:
        - name: GEODE_NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: GEODE_CLUSTER_ENABLED
          value: "true"

        resources:
          requests:
            cpu: 2000m
            memory: 4Gi
          limits:
            cpu: 4000m
            memory: 8Gi

        volumeMounts:
        - name: data
          mountPath: /var/lib/geode
        - name: config
          mountPath: /etc/geode

        livenessProbe:
          exec:
            command: ["/usr/local/bin/geode", "health"]
          initialDelaySeconds: 30
          periodSeconds: 10

        readinessProbe:
          exec:
            command: ["/usr/local/bin/geode", "ready"]
          initialDelaySeconds: 5
          periodSeconds: 5

  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

**Headless Service**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: geode
  namespace: production
spec:
  clusterIP: None
  selector:
    app: geode
  ports:
  - port: 3141
    name: client
  - port: 3142
    name: cluster
```

**Load Balancer for Reads**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: geode-read
  namespace: production
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
spec:
  type: LoadBalancer
  selector:
    app: geode
    role: follower  # Only route reads to followers
  ports:
  - port: 3141
    targetPort: 3141
```

## Security Hardening

### TLS Configuration

**Generate Certificates**:
```bash
# Certificate Authority
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=Geode CA"

# Server Certificate
openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=geode.example.com"

# Sign with CA
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 365 \
  -sha256 -extfile <(printf "subjectAltName=DNS:geode.example.com,DNS:*.geode.internal")
```

**Server Configuration**:
```yaml
server:
  tls:
    cert_file: /etc/geode/tls/server.crt
    key_file: /etc/geode/tls/server.key
    client_ca: /etc/geode/tls/ca.crt
    min_version: "1.3"
    require_client_cert: true  # mTLS
```

**Client Configuration**:
```python
client = Client(
    "geode.example.com:3141",
    tls_verify=True,
    tls_cert="/path/to/client.crt",
    tls_key="/path/to/client.key",
    tls_ca="/path/to/ca.crt"
)
```

### Authentication & Authorization

**User Management**:
```gql
-- Create admin user
CREATE USER admin WITH PASSWORD 'strong_password_here' ROLE administrator;

-- Create read-only user
CREATE USER analyst WITH PASSWORD 'another_password' ROLE reader;

-- Create application user with specific permissions
CREATE USER app_user WITH PASSWORD 'app_password' ROLE writer;
GRANT SELECT, INSERT, UPDATE ON GRAPH social_network TO app_user;
```

**Row-Level Security**:
```gql
-- Multi-tenant isolation policy
CREATE POLICY tenant_isolation ON User
FOR ALL
USING (user.organization_id = current_user_organization_id());

-- Data classification policy
CREATE POLICY sensitive_data ON Document
FOR SELECT
USING (
  document.classification = 'public'
  OR document.classification = 'internal' AND current_user_role() IN ('employee', 'admin')
  OR document.owner_id = current_user_id()
);
```

### Network Security

**Firewall Rules**:
```bash
# Allow only application servers to connect
iptables -A INPUT -p tcp --dport 3141 -s 10.0.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 3141 -j DROP

# Cluster communication
iptables -A INPUT -p tcp --dport 3142 -s 10.0.2.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 3142 -j DROP
```

**VPC Configuration** (AWS):
```terraform
resource "aws_security_group" "geode" {
  name        = "geode-production"
  description = "Geode database security group"
  vpc_id      = aws_vpc.main.id

  # Client connections from application tier
  ingress {
    from_port   = 3141
    to_port     = 3141
    protocol    = "tcp"
    security_groups = [aws_security_group.app_tier.id]
  }

  # Cluster communication
  ingress {
    from_port   = 3142
    to_port     = 3142
    protocol    = "tcp"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

## Monitoring & Alerting

### Metrics Collection

**Prometheus Configuration**:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['geode-1:9090', 'geode-2:9090', 'geode-3:9090']
    metrics_path: /metrics
    scrape_interval: 15s
```

**Key Metrics**:
```python
# Expose metrics endpoint (Python client application)
from prometheus_client import Counter, Histogram, Gauge, start_http_server

query_duration = Histogram('geode_query_duration_seconds', 'Query execution time')
query_counter = Counter('geode_queries_total', 'Total queries executed', ['status'])
connection_pool = Gauge('geode_connection_pool_active', 'Active connections')
transaction_duration = Histogram('geode_transaction_duration_seconds', 'Transaction time')

@query_duration.time()
async def execute_query(client, query):
    try:
        result, _ = await client.query(query)
        query_counter.labels(status='success').inc()
        return result
    except Exception as e:
        query_counter.labels(status='error').inc()
        raise
```

**Grafana Dashboard**:
```json
{
  "dashboard": {
    "title": "Geode Production Monitoring",
    "panels": [
      {
        "title": "Query Latency (p95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))"
        }]
      },
      {
        "title": "Queries Per Second",
        "targets": [{
          "expr": "rate(geode_queries_total[1m])"
        }]
      },
      {
        "title": "Error Rate",
        "targets": [{
          "expr": "rate(geode_queries_total{status='error'}[5m]) / rate(geode_queries_total[5m])"
        }]
      },
      {
        "title": "Connection Pool Utilization",
        "targets": [{
          "expr": "geode_connection_pool_active / geode_connection_pool_max * 100"
        }]
      }
    ]
  }
}
```

### Alerting Rules

```yaml
# alerting_rules.yml
groups:
  - name: geode_alerts
    interval: 30s
    rules:
      - alert: HighQueryLatency
        expr: histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High query latency detected"
          description: "p95 query latency is {{ $value }}s (threshold: 1s)"

      - alert: HighErrorRate
        expr: rate(geode_queries_total{status="error"}[5m]) / rate(geode_queries_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"

      - alert: ConnectionPoolExhaustion
        expr: geode_connection_pool_active / geode_connection_pool_max > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Connection pool nearly exhausted"
          description: "Pool utilization is {{ $value | humanizePercentage }}"

      - alert: ReplicationLag
        expr: geode_replication_lag_seconds > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Replication lag detected"
          description: "Follower is {{ $value }}s behind leader"

      - alert: NodeDown
        expr: up{job="geode"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Geode node is down"
          description: "Node {{ $labels.instance }} has been down for > 1m"
```

## Backup & Disaster Recovery

### Backup Strategy

**Full Backups**:
```bash
#!/bin/bash
# daily_backup.sh

BACKUP_DIR="/backups/geode"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/geode_full_$DATE.tar.gz"

# Trigger consistent snapshot
./geode backup create --output "$BACKUP_FILE" --compress

# Upload to S3
aws s3 cp "$BACKUP_FILE" "s3://backups/geode/full/" --storage-class STANDARD_IA

# Retain only last 7 days locally
find "$BACKUP_DIR" -name "geode_full_*.tar.gz" -mtime +7 -delete

# Verify backup
./geode backup verify --file "$BACKUP_FILE"
```

**Incremental Backups**:
```bash
#!/bin/bash
# hourly_incremental.sh

BACKUP_DIR="/backups/geode/incremental"
DATE=$(date +%Y%m%d_%H%M%S)

# Archive WAL segments since last backup
./geode wal-archive \
  --since-checkpoint \
  --output "$BACKUP_DIR/wal_$DATE.tar.gz"

aws s3 cp "$BACKUP_DIR/wal_$DATE.tar.gz" "s3://backups/geode/wal/"
```

### Recovery Procedures

**Full Restore**:
```bash
# Stop Geode
systemctl stop geode

# Clear existing data
rm -rf /var/lib/geode/data/*
rm -rf /var/lib/geode/wal/*

# Restore from backup
./geode restore \
  --input "/backups/geode/geode_full_20250124.tar.gz" \
  --data-dir /var/lib/geode/data

# Start Geode
systemctl start geode

# Verify data integrity
./geode verify --data-dir /var/lib/geode/data
```

**Point-in-Time Recovery (PITR)**:
```bash
# Restore base backup
./geode restore --input /backups/geode/geode_full_20250124.tar.gz

# Replay WAL to specific timestamp
./geode wal-replay \
  --wal-archive /backups/geode/wal/ \
  --target-time "2025-01-24T15:30:00Z" \
  --data-dir /var/lib/geode/data
```

## Capacity Planning

### Sizing Guidelines

**Memory Requirements**:
- Base: 2GB for Geode process
- Working set: 50-70% of total graph size for hot data
- Query cache: 10-20% of memory
- Connection overhead: 10MB per 1000 connections

**Example**:
- 10GB graph, 1000 connections, 10% query cache
- Memory needed: 2 + (10 * 0.6) + (10 * 0.1) + (1 * 10/1000) = ~9GB
- Recommended: 16GB for headroom

**Storage Requirements**:
- Data: 1.2-1.5x raw data size (compression + overhead)
- WAL: 20-30% of data size for write-heavy workloads
- Snapshots: Full data size per backup
- Indexes: 10-30% of data size depending on indexed properties

**CPU Requirements**:
- Query parsing and planning scale with query complexity and concurrency
- Transaction processing scales with write mix and index maintenance
- Replication overhead depends on follower count and network latency
- Benchmark your workload; Geode scales linearly up to 64 cores

### Load Testing

```python
# load_test.py using locust
from locust import User, task, between
from geode_client import Client
import asyncio

class GeodeUser(User):
    wait_time = between(0.1, 0.5)

    def on_start(self):
        self.client = Client("geode.example.com:3141")

    @task(10)  # 10x weight
    def read_query(self):
        asyncio.run(self.client.execute(
            "MATCH (p:Person {id: $id}) RETURN p",
            id=random.randint(1, 100000)
        ))

    @task(1)  # 1x weight (writes less frequent)
    def write_query(self):
        asyncio.run(self.client.execute(
            "CREATE (p:Person {id: $id, name: $name})",
            id=random.randint(100001, 200000),
            name=f"User_{random.randint(1, 10000)}"
        ))
```

Run load test:
```bash
locust -f load_test.py --host geode.example.com --users 1000 --spawn-rate 10 --run-time 1h
```

## Operational Runbooks

### Runbook: High CPU Usage

**Symptoms**: CPU > 80% for 5+ minutes

**Investigation**:
1. Check active queries: `SELECT * FROM system.queries WHERE duration > 10s`
2. Profile slow queries: Use PROFILE command
3. Check connection count: Monitor active_connections metric
4. Review recent schema changes

**Resolution**:
- Kill long-running queries: `KILL QUERY 'query-id'`
- Add missing indexes
- Scale horizontally (add replicas)
- Increase CPU allocation

### Runbook: Replication Lag

**Symptoms**: Follower > 10s behind leader

**Investigation**:
1. Check network latency between nodes
2. Review follower logs for errors
3. Check disk I/O on follower
4. Verify follower isn't overloaded with read queries

**Resolution**:
- Increase replication batch size
- Switch to asynchronous replication
- Add dedicated read replicas
- Upgrade network bandwidth

### Runbook: Connection Pool Exhaustion

**Symptoms**: Connection timeouts, pool at 100%

**Investigation**:
1. Check for connection leaks in application
2. Review connection lifecycle management
3. Analyze query patterns (long-running queries?)

**Resolution**:
- Increase pool size
- Reduce query timeout
- Fix application connection leaks
- Implement connection retry logic

## Production Checklist

### Pre-Launch

- [ ] TLS certificates configured and tested
- [ ] Authentication and authorization policies defined
- [ ] Firewall rules implemented
- [ ] Backup strategy configured and tested
- [ ] Monitoring and alerting operational
- [ ] Load testing completed
- [ ] Disaster recovery procedures documented
- [ ] On-call rotation established
- [ ] Capacity planning reviewed
- [ ] Security audit completed

### Post-Launch

- [ ] Monitor key metrics daily for first week
- [ ] Review logs for errors and warnings
- [ ] Validate backup integrity weekly
- [ ] Test disaster recovery procedures monthly
- [ ] Review and update capacity projections
- [ ] Conduct performance tuning based on real workload
- [ ] Update documentation with operational learnings
- [ ] Train operations team on runbooks

## Related Topics

- **Operations**: Day-to-day operational procedures
- **Monitoring**: Metrics, logging, and observability
- **Performance Tuning**: Optimization techniques
- **Security**: Authentication, authorization, encryption
- **DevOps**: Automation and infrastructure as code
