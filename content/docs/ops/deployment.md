---
title: "Deployment and Integration Guide"
description: "Deploy Geode with Docker Compose or Kubernetes, configure Vault/MinIO/Prometheus/Grafana, set up S3 backups and CDC/webhooks, and integrate client libraries"
url: /docs/ops/deployment/
weight: 10
tags:
  - deployment
  - docker
  - kubernetes
  - production
  - backup
  - cdc
categories:
  - deployment-and-devops
keywords:
  - deploy geode
  - docker compose
  - vault kms
  - s3 backup
  - cdc
---

<!-- CANARY: REQ=REQ-SERVER-STARTUP-INTEGRATION-001; FEATURE="Server Startup Integration Tests"; ASPECT=EndToEndServerTesting; STATUS=TESTED; OWNER=server; UPDATED=2025-10-05 -->

# Deployment and Integration Guide

Production deployment patterns, infrastructure stacks, backup strategies, and client integration for Geode.

## Deployment Modes

### Single Node

**Best for**:
- Development and testing
- Small-scale production (<100K nodes)
- Proof-of-concept

**Quickstart**:

```bash
# Build and run
cd geode
make build
geode serve --listen 0.0.0.0:3141
```

**Systemd service** (Linux):

```bash
# Create service file
sudo tee /etc/systemd/system/geode.service > /dev/null <<EOF
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

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable geode
sudo systemctl start geode
```

### Distributed Cluster

**Best for**:
- High availability
- Large-scale datasets (>1M nodes)
- Federated query coordination

**Architecture**:
- Multiple Geode instances (shards)
- Distributed query coordinator
- Shared KMS (Vault) for encryption keys
- Centralized monitoring (Prometheus/Grafana)

**Docker Compose**:

```bash
cd geode

# Distributed cluster (3 nodes)
make docker-up-distributed
```

**See**: [Distributed Query Coordination](/docs/architecture/distributed-architecture/) for topology details.

### Containerized Production Stack

From `deployment/DEPLOYMENT.md`:

**Full production stack** includes:
- **Geode**: Graph database instances
- **Vault**: KMS for TDE/FLE keys
- **MinIO**: S3-compatible object storage for backups
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards and alerting
- **Loki + Promtail**: Log aggregation
- **Nginx**: Reverse proxy with TLS termination
- **Redis**: Session store (optional)

**Start stack**:

```bash
cd geode/docs/deployment

# Start all services
docker-compose up -d

# Verify services
docker-compose ps
```

**Service endpoints**:
- Geode: `https://localhost:3141` (QUIC+TLS)
- Grafana: `http://localhost:3000` (admin/admin)
- Prometheus: `http://localhost:9090`
- Vault: `http://localhost:8200`
- MinIO: `http://localhost:9000` (minioadmin/minioadmin)

### Kubernetes (Helm)

Deploy Geode to Kubernetes with Helm for production clusters.

```bash
# Add Helm repository
helm repo add geode https://charts.geodedb.com
helm repo update

# Install
helm install geode geode/geode \
  --set replicaCount=3 \
  --set tde.enabled=true \
  --set tde.provider=vault \
  --set vault.address=https://vault.default.svc:8200

# Verify deployment
kubectl get pods -l app=geode
```

## Configuration

From `USAGE.md`:

### YAML Configuration

**Example** (`/etc/geode/geode.yaml`):

```yaml
server:
  listen: '0.0.0.0:3141'
  data_dir: '/var/lib/geode'

tls:
  cert: '/etc/geode/certs/server-cert.pem'
  key: '/etc/geode/certs/server-key.pem'

storage:
  page_size: 8192
  page_cache_size: '1GB'

security:
  # Authentication
  password_policy:
    min_length: 16
    expiration_days: 90

  # TDE
  tde:
    enabled: true
    provider: vault
    vault:
      address: 'https://vault.example.com:8200'
      token_file: '/run/secrets/vault-token'
      key_path: 'secret/geode/tde-key'

  # Audit logging
  audit:
    enabled: true
    log_path: '/var/log/geode/audit.jsonl'
    syslog:
      enabled: true
      address: 'syslog.example.com:514'
      format: 'CEF'

logging:
  level: 'info'  # debug/info/warn/error
  format: 'json'  # text/json

monitoring:
  metrics:
    enabled: true
    listen: '127.0.0.1:8080'
  health:
    enabled: true
```

### Environment Variable Overrides

```bash
# Override config with env vars
export GEODE_DATA_DIR=/custom/data
export GEODE_LISTEN=0.0.0.0:8443
export GEODE_TDE_KEY="0123456789abcdef..."

./geode serve --config /etc/geode/geode.yaml
```

**Priority**: Environment variables > YAML config > defaults

## Backups

From `USAGE.md` and `API_REFERENCE.md`:

### Local Backup

```bash
# Create backup
./geode backup \
  --output /backups/geode-$(date +%Y%m%d).tar.gz

# Restore backup
./geode restore \
  --input /backups/geode-20240115.tar.gz \
  --data-dir /var/lib/geode
```

### S3 Backup

**Configuration**:

```bash
# Set S3 credentials
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"
```

**Backup to S3**:

```bash
# Backup
./geode backup \
  --dest s3://my-bucket/geode-backups/geode-$(date +%Y%m%d).tar.gz

# Restore from S3
./geode restore \
  --source s3://my-bucket/geode-backups/geode-20240115.tar.gz \
  --data-dir /var/lib/geode
```

**Automated backups** (cron):

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /usr/local/bin/geode backup --dest s3://my-bucket/geode-backups/geode-$(date +\%Y\%m\%d).tar.gz
```

### Point-in-Time Recovery

**Restore to specific timestamp** using WAL replay:

```bash
./geode restore \
  --source s3://my-bucket/geode-backups/geode-20240115.tar.gz \
  --wal-dir /var/lib/geode/wal \
  --until "2024-01-15T14:30:00Z"
```

**Use cases**:
- Recover from accidental deletion
- Audit historical state
- Clone database at specific point

## Change Data Capture (CDC)

From `USAGE.md`:

**CDC** captures graph changes and sends webhooks for real-time integration.

### CDC Configuration

**Example** (`cdc-config.yaml`):

```yaml
cdc:
  enabled: true

  # Webhook endpoints
  webhooks:
    - url: "https://analytics.example.com/webhook"
      events:
        - node.created
        - node.updated
        - node.deleted
        - edge.created
        - edge.deleted
      filter: "graph = 'SocialNetwork'"
      retry:
        max_attempts: 3
        backoff: exponential

    - url: "https://ml.example.com/embedding-update"
      events:
        - node.created
        - node.updated
      filter: "label = 'Document'"

  # Event log retention
  retention:
    days: 30
    max_size: "10GB"
```

### Webhook Payload Format

**Node created**:

```json
{
  "event": "node.created",
  "timestamp": "2024-01-15T14:30:00.123Z",
  "graph": "SocialNetwork",
  "node": {
    "id": 123456,
    "labels": ["Person"],
    "properties": {
      "name": "Alice",
      "age": 30,
      "email": "[email protected]"
    }
  },
  "trace_id": "7c9e8d6f-5b4a-3c2d-1e0f-9a8b7c6d5e4f"
}
```

**Edge created**:

```json
{
  "event": "edge.created",
  "timestamp": "2024-01-15T14:30:05.456Z",
  "graph": "SocialNetwork",
  "edge": {
    "id": 789012,
    "type": "KNOWS",
    "from_node": 123456,
    "to_node": 654321,
    "properties": {
      "since": 2020
    }
  },
  "trace_id": "8d7f9e0a-6c5b-4d3e-2f1a-0b9c8d7e6f5a"
}
```

### Use Cases

- **Real-time analytics**: Update dashboards on graph changes
- **ML pipeline**: Re-train embeddings when nodes/edges added
- **Audit trail**: Log all changes to external system
- **Cache invalidation**: Clear application caches on data change
- **Fraud detection**: Trigger anomaly detection on new transactions

**See**: [Real-Time Analytics](/docs/analytics/real-time-analytics/) for complete CDC workflow

## Client Integration

From `clients/README.md`:

### Go Client

**Installation**:

```bash
go get geodedb.com/geode
```

**Usage**:

```go
import (
    "database/sql"
    _ "geodedb.com/geode"
)

func main() {
    db, err := sql.Open("geode", "quic://localhost:3141?tls=true")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    rows, err := db.Query("MATCH (p:Person) RETURN p.name, p.age")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    for rows.Next() {
        var name string
        var age int
        if err := rows.Scan(&name, &age); err != nil {
            log.Fatal(err)
        }
        fmt.Printf("%s: %d\n", name, age)
    }
}
```

**Features**:
- `database/sql` driver
- Prepared statements
- Transaction support
- Connection pooling

**See**: [Go Client Guide](/docs/client-libraries/go-client)

### Python Client

**Installation**:

```bash
pip install geode-client
```

**Usage**:

```python
from geode_client import Client

client = Client(host="localhost", port=3141)
async with client.connection() as conn:
    page, _ = await conn.query(
        "MATCH (p:Person) WHERE p.age > $age RETURN p.name AS name",
        params={"age": 25},
    )
    for row in page.rows:
        print(row["name"].as_string)
```

**Features**:
- Async/await with aioquic
- Connection pooling
- Query builders
- RLS policy management

**See**: [Python Client Guide](/docs/client-libraries/python-client)

### Rust Client

**Installation** (`Cargo.toml`):

```toml
[dependencies]
geode-client = "0.1.0"
```

**Usage**:

```rust
use geode_client::{Client, Value};
use std::collections::HashMap;

#[tokio::main]
async fn main() -> geode_client::Result<()> {
    let client = Client::new("localhost", 3141);
    let mut conn = client.connect().await?;

    let mut params = HashMap::new();
    params.insert("age".to_string(), Value::int(25));

    let (page, _) = conn.query_with_params(
        "MATCH (p:Person) WHERE p.age > $age RETURN p.name AS name",
        &params,
    )
    .await?;

    for row in page.rows {
        let name = row.get("name").unwrap().as_string()?;
        println!("{}", name);
    }

    Ok(())
}
```

**Features**:
- Tokio async runtime
- Type-safe query builders
- Zero-cost abstractions
- Connection pooling (workload-dependent throughput)

**See**: [Rust Client Guide](/docs/client-libraries/rust-client)

### Zig Client

**Usage**:

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.openStream();
    try client.sendHello("geode-zig", "2.0.0");
    _ = try client.receiveMessage(2000);

    const request_id: u64 = 1;
    try client.sendRunGql(request_id, "MATCH (p:Person) RETURN p.name", null);
    _ = try client.receiveMessage(3000);
    try client.sendPull(request_id, 1000);
    _ = try client.receiveMessage(3000);
}
```

**See**: [Zig Client Guide](/docs/client-libraries/zig-client)

## Production Stack Reference

From `deployment/DEPLOYMENT.md`, full services:

### Services Overview

| Service | Purpose | Port | Dependencies |
|---------|---------|------|--------------|
| **Geode** | Graph database | 3141 (QUIC) | Vault (optional) |
| **Vault** | KMS for TDE/FLE | 8200 | - |
| **MinIO** | S3-compatible storage | 9000 | - |
| **Prometheus** | Metrics collection | 9090 | Geode |
| **Grafana** | Dashboards | 3000 | Prometheus |
| **Loki** | Log aggregation | 3100 | - |
| **Promtail** | Log shipping | - | Loki |
| **Nginx** | Reverse proxy | 443 | Geode |
| **Redis** | Session store | 6379 | - |

### Docker Compose Configuration

From `deployment/DEPLOYMENT.md`:

**Start services**:

```bash
docker-compose up -d
```

**View logs**:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f geode
```

**Scale Geode instances**:

```bash
docker-compose up -d --scale geode=3
```

## Next Steps

- **[Configuration Reference](/docs/configuration)** - Complete config options
- **[Monitoring and Telemetry](/docs/ops/observability)** - Metrics and logging
- **[Security Guide](/docs/security/overview)** - TLS, TDE, FLE, audit logging
- **[Client Libraries](/docs/client-libraries)** - Language-specific guides
