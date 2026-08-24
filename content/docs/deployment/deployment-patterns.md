---
title: "Deployment Patterns"
description: "Production deployment strategies for Geode including single-node, distributed, and cloud deployment patterns with Docker Compose, Kubernetes, and infrastructure stack integration"
url: /docs/deployment/deployment-patterns/
keywords: ["deployment", "production", "docker", "kubernetes", "distributed", "cloud", "single-node", "high availability", "scaling"]
weight: 10
slug: "deployment-patterns"
canonical: "https://geodedb.com/docs/deployment/deployment-patterns"
---

<!-- CANARY: REQ=REQ-SERVER-STARTUP-INTEGRATION-001; FEATURE="Server Startup Integration Tests"; ASPECT=EndToEndServerTesting; STATUS=TESTED; OWNER=server; UPDATED=2025-10-05 -->

# Deployment Patterns

Geode offers flexible deployment patterns to match your infrastructure requirements, from single-node development environments to distributed production clusters with full observability stacks.

## Overview

Geode supports multiple deployment architectures:

- **Single-Node Deployment** - Simple setup for development, testing, or low-traffic production
- **Distributed Deployment** - Multi-node clusters with sharding and federation for high availability
- **Cloud Deployment** - Container orchestration with Kubernetes or Docker Swarm
- **GPU-Accelerated Deployment** - Hardware acceleration for vector operations and graph analytics
- **Infrastructure Stack** - Complete observability with monitoring, logging, and backup systems

This guide covers production-ready deployment patterns with best practices for security, performance, and reliability.

## Quick Start

### Prerequisites

**System Requirements**:

- Docker 20.10+ and Docker Compose 1.29+
- 8GB RAM minimum (16GB recommended for production)
- 50GB disk space for data and backups
- NVIDIA GPU with drivers + nvidia-docker2 (GPU deployment only)

**Network Requirements**:

- Port 3141 (standard) or 8443 (alternative) for Geode QUIC+TLS
- Firewall rules configured for inter-node communication (distributed)
- Valid TLS certificates (self-signed for development, CA-signed for production)

### Basic Setup

```bash
# Clone repository and setup deployment
git clone https://github.com/codeprosorg/geode
cd geode/deployment

# Run setup script (generates certificates, passwords, .env)
./scripts/setup-deployment.sh

# Review and customize environment variables
vi .env

# Add local DNS entries (development only)
echo "127.0.0.1 geode.local grafana.geode.local prometheus.geode.local minio.geode.local vault.geode.local" | sudo tee -a /etc/hosts
```

### Start Services

**Standard Deployment**:

```bash
# Start full stack (Geode + infrastructure)
docker-compose up -d

# Verify all services running
docker-compose ps

# Check Geode logs
docker-compose logs -f geode
```

**GPU-Accelerated Deployment**:

```bash
# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

# Verify GPU availability
docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi

# Start GPU stack
docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

### Verify Installation

```bash
# Test Geode connectivity
docker-compose exec geode geode query "RETURN 1 AS health" --server 127.0.0.1:8443

# Access web interfaces
# Grafana: https://grafana.geode.local (admin / check .env)
# Prometheus: https://prometheus.geode.local
# MinIO Console: https://minio.geode.local
# Vault UI: https://vault.geode.local
```

## Single-Node Deployment

### Architecture

Single-node deployment runs Geode with a complete infrastructure stack on one machine:

```
┌──────────────────────────────────────────────────────┐
│                  Host Machine                        │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Geode      │  │    Vault     │  │   Redis    │ │
│  │ Graph DB     │  │  Secrets     │  │   Cache    │ │
│  │ (port 8443)  │  │ Management   │  │            │ │
│  └──────┬───────┘  └──────────────┘  └────────────┘ │
│         │                                            │
│  ┌──────▼──────────────────────────────────────────┐ │
│  │              Nginx Reverse Proxy                │ │
│  │         (TLS termination, routing)              │ │
│  └──────┬──────────────────────────────────────────┘ │
│         │                                            │
│  ┌──────▼───────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Prometheus   │  │   Grafana    │  │   MinIO    │ │
│  │  Metrics     │  │ Dashboards   │  │  Backups   │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │    Loki      │  │   Promtail   │                 │
│  │ Log Storage  │  │ Log Collect  │                 │
│  └──────────────┘  └──────────────┘                 │
└──────────────────────────────────────────────────────┘
```

### Configuration

**Environment Variables** (`.env` file):

```bash
# Geode Configuration
GEODE_LOG_LEVEL=info                # Log level: debug, info, warn, error
GEODE_DATA_DIR=/data                # Data directory path
GEODE_LISTEN_ADDR=0.0.0.0:8443      # Listen address
GEODE_MAX_CONNECTIONS=1000          # Maximum concurrent connections
GEODE_QUERY_TIMEOUT=30s             # Query execution timeout

# Security
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=<generated-secure-token>
REDIS_PASSWORD=<generated-secure-password>

# Storage & Backup
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=geode-minio-admin
S3_SECRET_KEY=<generated-secure-password>
S3_BUCKET=geode-backups
S3_REGION=us-east-1

# Monitoring
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=<generated-secure-password>
GF_SERVER_DOMAIN=grafana.geode.local
GF_SERVER_ROOT_URL=https://grafana.geode.local

# Resource Limits
GEODE_MEMORY_LIMIT=8G
GEODE_CPU_LIMIT=4.0
```

### Docker Compose Configuration

**Basic `docker-compose.yml` excerpt**:

```yaml
version: '3.9'

services:
  geode:
    image: geode:latest
    container_name: geode
    restart: unless-stopped
    ports:
      - "8443:8443"
    environment:
      - GEODE_LOG_LEVEL=${GEODE_LOG_LEVEL}
      - GEODE_DATA_DIR=${GEODE_DATA_DIR}
      - VAULT_ADDR=${VAULT_ADDR}
      - VAULT_TOKEN=${VAULT_TOKEN}
      - S3_ENDPOINT=${S3_ENDPOINT}
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
    volumes:
      - geode-data:/data
      - ./certs:/certs:ro
    networks:
      - geode-network
    deploy:
      resources:
        limits:
          cpus: '${GEODE_CPU_LIMIT}'
          memory: ${GEODE_MEMORY_LIMIT}
        reservations:
          cpus: '2.0'
          memory: 4G
    healthcheck:
      test: ["CMD", "geode", "query", "RETURN 1", "--server", "127.0.0.1:8443"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  vault:
    image: hashicorp/vault:latest
    container_name: geode-vault
    restart: unless-stopped
    environment:
      - VAULT_DEV_ROOT_TOKEN_ID=${VAULT_TOKEN}
    cap_add:
      - IPC_LOCK
    volumes:
      - vault-data:/vault/data
      - vault-logs:/vault/logs
    networks:
      - geode-network

  redis:
    image: redis:7-alpine
    container_name: geode-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - geode-network

volumes:
  geode-data:
  vault-data:
  vault-logs:
  redis-data:

networks:
  geode-network:
    driver: bridge
```

### Vault Initialization

**First-time setup** (production):

```bash
# Initialize Vault (save unseal keys and root token securely!)
docker-compose exec vault vault operator init

# Unseal Vault (required after every restart)
docker-compose exec vault vault operator unseal <unseal-key-1>
docker-compose exec vault vault operator unseal <unseal-key-2>
docker-compose exec vault vault operator unseal <unseal-key-3>

# Login with root token
docker-compose exec vault vault login

# Enable KV secrets engine
docker-compose exec vault vault secrets enable -path=geode kv-v2

# Store encryption keys
docker-compose exec vault vault kv put geode/encryption \
  master_key="$(openssl rand -base64 32)" \
  data_key="$(openssl rand -base64 32)"

# Create policy for Geode
cat <<EOF | docker-compose exec -T vault vault policy write geode-policy -
path "geode/*" {
  capabilities = ["read", "list"]
}
EOF

# Create token for Geode (update .env with this token)
docker-compose exec vault vault token create -policy=geode-policy
```

**Development setup** (auto-unseal):

For development, Vault runs in dev mode with auto-unseal. Update `.env`:

```bash
VAULT_DEV_MODE=true
VAULT_TOKEN=dev-only-token
```

### Resource Management

**Setting Resource Limits**:

```yaml
# docker-compose.yml
services:
  geode:
    deploy:
      resources:
        limits:
          cpus: '4.0'      # Maximum 4 CPU cores
          memory: 8G       # Maximum 8GB RAM
        reservations:
          cpus: '2.0'      # Reserve 2 CPU cores
          memory: 4G       # Reserve 4GB RAM
```

**Monitoring Resource Usage**:

```bash
# Real-time container stats
docker stats

# Geode-specific stats
docker stats geode

# Check disk usage
docker system df
docker volume ls
du -sh /var/lib/docker/volumes/geode_geode-data
```

### Backup and Recovery

**Automated Backups to MinIO/S3**:

```bash
# Configure backup schedule (cron)
docker-compose exec geode geode backup --dest s3://geode-backups/scheduled-$(date +%Y%m%d-%H%M%S)

# List backups
docker-compose exec minio mc ls local/geode-backups

# Restore from backup
docker-compose stop geode
docker-compose exec geode geode restore --source s3://geode-backups/backup-20260124-120000
docker-compose start geode
```

**Volume Backups** (full data directory):

```bash
# Backup volume to tar.gz
docker run --rm \
  -v geode_geode-data:/data:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/geode-data-$(date +%Y%m%d).tar.gz -C /data .

# Restore volume from tar.gz
docker-compose stop geode
docker run --rm \
  -v geode_geode-data:/data \
  -v $(pwd)/backups:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/geode-data-20260124.tar.gz -C /data"
docker-compose start geode
```

### Use Cases

**Development & Testing**:

- Local development with hot reloading
- Integration testing with realistic infrastructure
- Feature validation before production

**Small Production Deployments**:

- Startups and small teams (< 10,000 queries/day)
- Internal tools and dashboards
- Proof of concept and prototypes

**Edge Computing**:

- On-premises installations with limited resources
- IoT gateway aggregation
- Offline-capable applications

## Distributed Deployment

### Architecture

Distributed deployment provides high availability, horizontal scaling, and data sharding:

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                        │
│              (Nginx / HAProxy / Cloud LB)               │
└────────────┬─────────────┬──────────────┬───────────────┘
             │             │              │
    ┌────────▼────┐  ┌─────▼──────┐  ┌───▼──────────┐
    │  Geode      │  │  Geode     │  │   Geode      │
    │  Node 1     │  │  Node 2    │  │   Node 3     │
    │ (Shard A)   │  │ (Shard B)  │  │  (Shard C)   │
    └────────┬────┘  └─────┬──────┘  └───┬──────────┘
             │             │              │
             └─────────────┴──────────────┘
                          │
                 ┌────────▼─────────┐
                 │  Raft Consensus  │
                 │  Cluster State   │
                 └──────────────────┘
                          │
             ┌────────────┴──────────────┐
             │                           │
    ┌────────▼────────┐      ┌──────────▼────────┐
    │  Shared Storage │      │  Shared Vault     │
    │  (MinIO / S3)   │      │  (Multi-node)     │
    └─────────────────┘      └───────────────────┘
```

### Multi-Node Configuration

**Node 1** (`docker-compose.node1.yml`):

```yaml
version: '3.9'

services:
  geode-node1:
    image: geode:latest
    container_name: geode-node1
    hostname: geode-node1
    environment:
      - GEODE_NODE_ID=1
      - GEODE_CLUSTER_MODE=true
      - GEODE_RAFT_PEERS=geode-node1:9000,geode-node2:9000,geode-node3:9000
      - GEODE_SHARD_ID=A
      - GEODE_LISTEN_ADDR=0.0.0.0:8443
      - GEODE_RAFT_ADDR=0.0.0.0:9000
    ports:
      - "8443:8443"
      - "9000:9000"
    volumes:
      - geode-node1-data:/data
    networks:
      - geode-cluster

volumes:
  geode-node1-data:

networks:
  geode-cluster:
    driver: overlay
    attachable: true
```

**Node 2 & 3** - Similar configuration with different node IDs and shard assignments.

### Sharding Strategy

**Consistent Hashing**:

```bash
# Configure sharding in Geode
geode admin configure-sharding \
  --strategy consistent-hash \
  --replicas 3 \
  --rebalance-threshold 0.1

# Assign shards to nodes
geode admin assign-shard --node geode-node1 --shard A
geode admin assign-shard --node geode-node2 --shard B
geode admin assign-shard --node geode-node3 --shard C
```

**Range-Based Sharding**:

```gql
-- Create sharded graph
CREATE GRAPH social_network
  PARTITION BY RANGE (user_id)
  (
    SHARD shard_a VALUES LESS THAN (1000000),
    SHARD shard_b VALUES LESS THAN (2000000),
    SHARD shard_c VALUES LESS THAN (MAXVALUE)
  );
```

### Federation

**Cross-Cluster Queries**:

```gql
-- Configure federation
USE GRAPH social_network;
CREATE FEDERATION global_social
  WITH CLUSTERS (
    'us-west' AT 'geode-us-west.example.com:8443',
    'eu-central' AT 'geode-eu.example.com:8443',
    'ap-southeast' AT 'geode-ap.example.com:8443'
  );

-- Query across federated clusters
USE FEDERATION global_social;
MATCH (user:Person)-[:FRIENDS_WITH]->(friend:Person)
WHERE user.region = 'us-west' AND friend.region = 'eu-central'
RETURN user.name, friend.name;
```

### Consensus and Coordination

**Raft Configuration**:

```bash
# Initialize Raft cluster
geode admin raft-init \
  --node-id 1 \
  --peers geode-node1:9000,geode-node2:9000,geode-node3:9000

# Check cluster status
geode admin raft-status

# Example output:
# Node ID: 1
# Role: Leader
# Term: 5
# Commit Index: 1234
# Peers: [geode-node2:Follower, geode-node3:Follower]
```

### Load Balancing

**Nginx Configuration** (`nginx-lb.conf`):

```nginx
upstream geode_cluster {
    least_conn;
    server geode-node1:8443 max_fails=3 fail_timeout=30s;
    server geode-node2:8443 max_fails=3 fail_timeout=30s;
    server geode-node3:8443 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name geode.example.com;

    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
    ssl_protocols TLSv1.3;

    location / {
        proxy_pass https://geode_cluster;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # QUIC support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint
    location /health {
        proxy_pass https://geode_cluster;
        access_log off;
    }
}
```

### Failover and High Availability

**Automatic Failover**:

```bash
# Configure automatic failover
geode admin configure-ha \
  --min-replicas 2 \
  --auto-promote true \
  --failover-timeout 30s

# Manual failover (if needed)
geode admin promote-node --node geode-node2
```

**Health Checks**:

```yaml
# docker-compose.yml healthcheck
healthcheck:
  test: ["CMD", "geode", "query", "RETURN 1", "--server", "127.0.0.1:8443"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 30s
```

### Scaling Operations

**Horizontal Scaling** (add nodes):

```bash
# Scale up cluster
docker-compose up -d --scale geode=5

# Rebalance shards
geode admin rebalance-shards --strategy least-loaded

# Verify distribution
geode admin shard-distribution
```

**Vertical Scaling** (increase resources):

```yaml
# Update resource limits
services:
  geode:
    deploy:
      resources:
        limits:
          cpus: '8.0'
          memory: 16G
        reservations:
          cpus: '4.0'
          memory: 8G
```

## Cloud Deployment

### Kubernetes Deployment

**Namespace and ConfigMap**:

```yaml
# geode-namespace.yml
apiVersion: v1
kind: Namespace
metadata:
  name: geode

---
# geode-config.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: geode-config
  namespace: geode
data:
  GEODE_LOG_LEVEL: "info"
  GEODE_DATA_DIR: "/data"
  GEODE_CLUSTER_MODE: "true"
```

**StatefulSet for Geode**:

```yaml
# geode-statefulset.yml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: geode
  namespace: geode
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
      containers:
      - name: geode
        image: geode:latest
        ports:
        - containerPort: 8443
          name: quic
        - containerPort: 9000
          name: raft
        env:
        - name: GEODE_NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: GEODE_CLUSTER_MODE
          value: "true"
        - name: GEODE_RAFT_PEERS
          value: "geode-0.geode:9000,geode-1.geode:9000,geode-2.geode:9000"
        envFrom:
        - configMapRef:
            name: geode-config
        - secretRef:
            name: geode-secrets
        volumeMounts:
        - name: data
          mountPath: /data
        - name: certs
          mountPath: /certs
          readOnly: true
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
          limits:
            memory: "8Gi"
            cpu: "4000m"
        livenessProbe:
          exec:
            command:
            - geode
            - query
            - "RETURN 1"
            - --server
            - 127.0.0.1:8443
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - geode
            - query
            - "RETURN 1"
            - --server
            - 127.0.0.1:8443
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: certs
        secret:
          secretName: geode-tls-certs
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

**Service and Ingress**:

```yaml
# geode-service.yml
apiVersion: v1
kind: Service
metadata:
  name: geode
  namespace: geode
spec:
  clusterIP: None
  selector:
    app: geode
  ports:
  - port: 8443
    name: quic
  - port: 9000
    name: raft

---
apiVersion: v1
kind: Service
metadata:
  name: geode-lb
  namespace: geode
spec:
  type: LoadBalancer
  selector:
    app: geode
  ports:
  - port: 8443
    targetPort: 8443
    name: quic

---
# geode-ingress.yml (if using HTTP/3 ingress)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: geode-ingress
  namespace: geode
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
spec:
  ingressClassName: nginx
  rules:
  - host: geode.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: geode-lb
            port:
              number: 8443
  tls:
  - hosts:
    - geode.example.com
    secretName: geode-tls-certs
```

**Secrets Management**:

```bash
# Create TLS secret
kubectl create secret tls geode-tls-certs \
  --cert=server.crt \
  --key=server.key \
  --namespace=geode

# Create application secrets
kubectl create secret generic geode-secrets \
  --from-literal=VAULT_TOKEN=<vault-token> \
  --from-literal=S3_ACCESS_KEY=<s3-key> \
  --from-literal=S3_SECRET_KEY=<s3-secret> \
  --namespace=geode
```

**Deploy to Kubernetes**:

```bash
# Apply configurations
kubectl apply -f geode-namespace.yml
kubectl apply -f geode-config.yml
kubectl apply -f geode-statefulset.yml
kubectl apply -f geode-service.yml
kubectl apply -f geode-ingress.yml

# Verify deployment
kubectl get pods -n geode
kubectl get svc -n geode
kubectl logs -f geode-0 -n geode

# Scale cluster
kubectl scale statefulset geode --replicas=5 -n geode
```

### Cloud Provider Specifics

**AWS Deployment**:

```yaml
# Use EBS for storage
storageClassName: gp3-encrypted

# Use Application Load Balancer
service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"

# Use S3 for backups
S3_ENDPOINT: https://s3.us-west-2.amazonaws.com
S3_BUCKET: geode-backups-production
```

**Google Cloud Platform**:

```yaml
# Use Persistent Disk
storageClassName: pd-ssd

# Use Cloud Load Balancer
cloud.google.com/load-balancer-type: "Internal"

# Use Cloud Storage for backups
S3_ENDPOINT: https://storage.googleapis.com
S3_BUCKET: geode-backups-gcp
```

**Azure Deployment**:

```yaml
# Use Premium SSD
storageClassName: managed-premium

# Use Azure Load Balancer
service.beta.kubernetes.io/azure-load-balancer-internal: "true"

# Use Blob Storage for backups
S3_ENDPOINT: https://geodebackups.blob.core.windows.net
S3_BUCKET: geode-backups
```

**Digital Ocean**:

```yaml
# Use DO Block Storage
storageClassName: do-block-storage

# Use DO Load Balancer
service.beta.kubernetes.io/do-loadbalancer-protocol: "tcp"

# Use DO Spaces for backups
S3_ENDPOINT: https://nyc3.digitaloceanspaces.com
S3_BUCKET: geode-backups
S3_REGION: nyc3
```

## GPU-Accelerated Deployment

### GPU Architecture

```
┌────────────────────────────────────────────┐
│           Geode Container                  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  Query Engine                        │  │
│  │  ├─ Parser                           │  │
│  │  ├─ Planner                          │  │
│  │  └─ Executor                         │  │
│  └────────────┬─────────────────────────┘  │
│               │                            │
│  ┌────────────▼─────────────────────────┐  │
│  │  GPU Acceleration Layer              │  │
│  │  ├─ Vector Operations (HNSW)         │  │
│  │  ├─ Graph Analytics (PageRank)       │  │
│  │  └─ ML Embeddings (Node2Vec)         │  │
│  └────────────┬─────────────────────────┘  │
│               │                            │
│  ┌────────────▼─────────────────────────┐  │
│  │  NVIDIA Runtime (CUDA/Vulkan)        │  │
│  └────────────┬─────────────────────────┘  │
└───────────────┼──────────────────────────┘
                │
    ┌───────────▼───────────┐
    │   NVIDIA GPU          │
    │   (Tesla/A100/RTX)    │
    └───────────────────────┘
```

### GPU Configuration

**Docker Compose with GPU**:

```yaml
# docker-compose.gpu.yml
version: '3.9'

services:
  geode-gpu:
    image: geode:latest-gpu
    container_name: geode-gpu
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=compute,utility
      - GEODE_GPU_ENABLED=true
      - GEODE_GPU_DEVICE=0
      - GEODE_GPU_MEMORY_FRACTION=0.8
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  dcgm-exporter:
    image: nvcr.io/nvidia/k8s/dcgm-exporter:3.1.3-3.1.4-ubuntu22.04
    container_name: dcgm-exporter
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
    ports:
      - "9400:9400"
    cap_add:
      - SYS_ADMIN
```

**Kubernetes GPU Deployment**:

```yaml
# geode-gpu-statefulset.yml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: geode-gpu
  namespace: geode
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: geode
        image: geode:latest-gpu
        resources:
          limits:
            nvidia.com/gpu: 1  # Request 1 GPU per pod
        env:
        - name: GEODE_GPU_ENABLED
          value: "true"
      nodeSelector:
        accelerator: nvidia-tesla-v100  # Target GPU nodes
```

### GPU Optimization

**Vector Search with GPU**:

```gql
-- Enable GPU acceleration for vector operations
SET SESSION gpu_acceleration = true;

-- Create HNSW index with GPU support
CREATE INDEX user_embeddings_gpu ON Person(embedding)
  USING HNSW
  WITH (metric = 'euclidean');

-- GPU-accelerated vector search
MATCH (user:Person)
WHERE vector_distance(user.embedding, $query_embedding) < 0.5
RETURN user.name, user.embedding
ORDER BY vector_distance(user.embedding, $query_embedding) ASC
LIMIT 100;
```

**Graph Analytics with GPU**:

```gql
-- GPU-accelerated PageRank
CALL graph.pageRank($graph_name, {
  iterations: 20,
  dampingFactor: 0.85,
  gpu_enabled: true
}) YIELD nodeId, score
RETURN nodeId, score
ORDER BY score DESC
LIMIT 10;
```

### GPU Monitoring

**Prometheus Metrics** (from DCGM exporter):

```promql
# GPU utilization
DCGM_FI_DEV_GPU_UTIL

# GPU memory usage
DCGM_FI_DEV_FB_USED / DCGM_FI_DEV_FB_FREE

# GPU temperature
DCGM_FI_DEV_GPU_TEMP

# GPU power draw
DCGM_FI_DEV_POWER_USAGE
```

**Grafana Dashboard**:

- GPU utilization over time
- Memory allocation per query
- Temperature and throttling events
- Power consumption trends

## Infrastructure Stack

### Monitoring with Prometheus & Grafana

**Prometheus Configuration** (`prometheus.yml`):

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['geode:9090']
    metrics_path: '/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'dcgm-exporter'
    static_configs:
      - targets: ['dcgm-exporter:9400']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - '/etc/prometheus/alerts/*.yml'
```

**Alert Rules** (`alerts/geode.yml`):

```yaml
groups:
  - name: geode_alerts
    interval: 30s
    rules:
      - alert: GeodeHighMemoryUsage
        expr: geode_memory_usage_percent > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Geode high memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value }}%"

      - alert: GeodeDown
        expr: up{job="geode"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Geode is down on {{ $labels.instance }}"
          description: "Geode database is not responding"

      - alert: HighQueryLatency
        expr: geode_query_duration_seconds{quantile="0.99"} > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High query latency detected"
          description: "P99 query latency is {{ $value }}s"

      - alert: TooManyConnections
        expr: geode_active_connections > 900
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Too many active connections"
          description: "Active connections: {{ $value }}"
```

**Grafana Dashboards**:

Pre-configured dashboards available in `config/grafana/dashboards/`:

1. **Geode Overview**
   - Query throughput (queries/second)
   - Query latency (P50, P95, P99)
   - Active connections
   - Memory and CPU usage
   - Cache hit rate

2. **Storage Metrics**
   - Disk I/O (read/write ops)
   - WAL write throughput
   - Index size and growth
   - Page cache efficiency

3. **GPU Metrics** (GPU deployment only)
   - GPU utilization per card
   - Memory allocation
   - Temperature and power
   - Kernel execution time

4. **System Health**
   - Node availability
   - Raft consensus state
   - Replication lag
   - Backup status

### Logging with Loki & Promtail

**Promtail Configuration** (`promtail-config.yml`):

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: geode
    static_configs:
      - targets:
          - localhost
        labels:
          job: geode
          __path__: /var/log/geode/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            timestamp: timestamp
            message: message
            query: query
      - labels:
          level:
      - timestamp:
          source: timestamp
          format: RFC3339
```

**Loki Configuration** (`loki-config.yml`):

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 15m
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h  # 30 days
```

### Backup with MinIO

**MinIO Configuration**:

```bash
# Access MinIO container
docker-compose exec minio sh

# Configure mc (MinIO client)
mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD

# Create buckets
mc mb local/geode-backups
mc mb local/geode-wal-archive

# Set retention policy (30 days)
mc retention set --default GOVERNANCE 30d local/geode-backups

# Enable versioning
mc version enable local/geode-backups
```

**Lifecycle Policy** (automatic cleanup):

```json
{
  "Rules": [
    {
      "Expiration": {
        "Days": 30
      },
      "ID": "DeleteOldBackups",
      "Filter": {
        "Prefix": "daily/"
      },
      "Status": "Enabled"
    },
    {
      "Expiration": {
        "Days": 90
      },
      "ID": "DeleteOldWeeklyBackups",
      "Filter": {
        "Prefix": "weekly/"
      },
      "Status": "Enabled"
    },
    {
      "Transition": {
        "Days": 7,
        "StorageClass": "GLACIER"
      },
      "ID": "ArchiveToGlacier",
      "Filter": {
        "Prefix": "daily/"
      },
      "Status": "Enabled"
    }
  ]
}
```

**Apply lifecycle policy**:

```bash
cat lifecycle.json | docker-compose exec -T minio sh -c "mc ilm import local/geode-backups"
```

### Nginx Reverse Proxy

**Nginx Configuration** (`nginx.conf`):

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=geode_limit:10m rate=100r/s;
    limit_conn_zone $binary_remote_addr zone=geode_conn:10m;

    # Include virtual hosts
    include /etc/nginx/conf.d/*.conf;
}

stream {
    # QUIC passthrough for Geode
    upstream geode_quic {
        server geode:8443;
    }

    server {
        listen 8443 udp;
        proxy_pass geode_quic;
        proxy_timeout 30s;
    }
}
```

**Virtual Host Configuration** (`conf.d/geode.conf`):

```nginx
# Geode
server {
    listen 443 ssl http2;
    server_name geode.local;

    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;

    location / {
        proxy_pass https://geode:8443;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        limit_req zone=geode_limit burst=20 nodelay;
        limit_conn geode_conn 10;
    }
}

# Grafana
server {
    listen 443 ssl http2;
    server_name grafana.geode.local;

    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;

    location / {
        proxy_pass http://grafana:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Prometheus
server {
    listen 443 ssl http2;
    server_name prometheus.geode.local;

    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;

    location / {
        proxy_pass http://prometheus:9090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Security Best Practices

### TLS Certificates

**Production Certificates** (Let's Encrypt):

```bash
# Install certbot
apt-get install certbot

# Obtain certificate
certbot certonly --standalone \
  -d geode.example.com \
  --email admin@example.com \
  --agree-tos

# Copy certificates
cp /etc/letsencrypt/live/geode.example.com/fullchain.pem certs/server.crt
cp /etc/letsencrypt/live/geode.example.com/privkey.pem certs/server.key

# Set permissions
chmod 600 certs/server.key
chmod 644 certs/server.crt

# Restart services
docker-compose restart geode nginx
```

**Auto-renewal**:

```bash
# Add cron job for renewal
cat <<EOF | sudo tee /etc/cron.d/certbot
0 3 * * * root certbot renew --quiet --post-hook "docker-compose -f /path/to/docker-compose.yml restart geode nginx"
EOF
```

### Firewall Configuration

**UFW (Ubuntu)**:

```bash
# Allow SSH
ufw allow 22/tcp

# Allow Geode QUIC
ufw allow 8443/udp
ufw allow 8443/tcp

# Allow HTTPS (Nginx)
ufw allow 443/tcp

# Allow Raft (internal cluster only)
ufw allow from 10.0.0.0/8 to any port 9000

# Enable firewall
ufw enable
```

**iptables**:

```bash
# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow Geode QUIC
iptables -A INPUT -p udp --dport 8443 -j ACCEPT
iptables -A INPUT -p tcp --dport 8443 -j ACCEPT

# Allow HTTPS
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow Raft (internal network only)
iptables -A INPUT -s 10.0.0.0/8 -p tcp --dport 9000 -j ACCEPT

# Drop everything else
iptables -A INPUT -j DROP

# Save rules
iptables-save > /etc/iptables/rules.v4
```

### Network Segmentation

**Docker Networks**:

```yaml
# docker-compose.yml
networks:
  geode-frontend:
    driver: bridge
  geode-backend:
    driver: bridge
    internal: true  # No external access

services:
  geode:
    networks:
      - geode-frontend
      - geode-backend

  vault:
    networks:
      - geode-backend  # Only internal access

  nginx:
    networks:
      - geode-frontend  # Only frontend access
```

### Secrets Management

**Best Practices**:

1. **Never commit secrets to version control**
2. **Use Vault for production secrets**
3. **Rotate credentials regularly** (90 days)
4. **Use strong random passwords** (32+ characters)
5. **Enable MFA for admin access**
6. **Audit secret access** (Vault audit logs)

**Automated Rotation**:

```bash
# Rotate database encryption keys
geode admin rotate-encryption-key \
  --old-key-id vault:geode/encryption/master_key \
  --new-key-id vault:geode/encryption/master_key_v2

# Rotate service tokens
docker-compose exec vault vault token renew -increment=720h
```

## Troubleshooting

### Common Issues

**Geode Won't Start**:

```bash
# Check logs
docker-compose logs geode

# Verify certificates
ls -l certs/
openssl x509 -in certs/server.crt -text -noout

# Test connectivity to dependencies
docker-compose exec geode ping vault
docker-compose exec geode nc -zv minio 9000
docker-compose exec geode nc -zv redis 6379
```

**High Memory Usage**:

```bash
# Check container stats
docker stats geode

# Verify memory limits
docker inspect geode | grep -A 10 Memory

# Adjust limits if needed
# Edit docker-compose.yml and restart
docker-compose up -d geode
```

**Vault Sealed**:

```bash
# Check Vault status
docker-compose exec vault vault status

# Unseal Vault
docker-compose exec vault vault operator unseal <unseal-key-1>
docker-compose exec vault vault operator unseal <unseal-key-2>
docker-compose exec vault vault operator unseal <unseal-key-3>

# Enable auto-unseal (AWS KMS, GCP KMS, Azure Key Vault)
```

**MinIO Access Denied**:

```bash
# Verify credentials in .env
cat .env | grep S3_

# Test MinIO access
docker-compose exec minio mc alias set test \
  http://localhost:9000 \
  $MINIO_ROOT_USER \
  $MINIO_ROOT_PASSWORD

# List buckets
docker-compose exec minio mc ls test/
```

**GPU Not Detected**:

```bash
# Verify NVIDIA runtime
docker run --rm --gpus all nvidia/cuda:12.3.0-base-ubuntu22.04 nvidia-smi

# Check Docker daemon configuration
cat /etc/docker/daemon.json

# Should contain:
# {
#   "runtimes": {
#     "nvidia": {
#       "path": "nvidia-container-runtime",
#       "runtimeArgs": []
#     }
#   },
#   "default-runtime": "nvidia"
# }

# Restart Docker
sudo systemctl restart docker
```

**Cluster Split-Brain**:

```bash
# Check Raft status on all nodes
geode admin raft-status --node geode-node1
geode admin raft-status --node geode-node2
geode admin raft-status --node geode-node3

# Force leader election
geode admin raft-force-election --node geode-node1

# Reset Raft state (DANGEROUS - data loss possible)
geode admin raft-reset --force
```

### Performance Issues

**Slow Queries**:

```bash
# Enable query logging
docker-compose exec geode geode admin set-log-level --query-log debug

# Analyze slow queries
docker-compose logs geode | grep "slow_query"

# Use EXPLAIN to analyze query plan
geode query "EXPLAIN MATCH (n:Person) RETURN n" --server geode:8443
```

**High Latency**:

```bash
# Check network latency
docker-compose exec geode ping -c 10 geode-node2

# Verify QUIC performance
geode admin network-diagnostics --peer geode-node2:8443

# Monitor metrics
curl http://localhost:9090/api/v1/query?query=geode_query_duration_seconds
```

**Disk I/O Bottleneck**:

```bash
# Check disk performance
docker-compose exec geode iostat -x 1 10

# Enable I/O optimizations
geode admin configure-io \
  --async-io true \
  --io-threads 8 \
  --read-ahead 128k

# Consider upgrading to faster storage (NVMe SSD)
```

### Health Checks

**System Health**:

```bash
# Check all services
docker-compose ps

# Verify Geode health
curl -k https://geode.local/health

# Check cluster health
geode admin cluster-health

# Example output:
# Cluster: healthy
# Nodes: 3/3 online
# Shards: 3/3 balanced
# Replication: current
```

**Database Integrity**:

```bash
# Run integrity check
geode admin check-integrity

# Vacuum database
geode admin vacuum

# Analyze statistics
geode admin analyze

# Reindex (if needed)
geode admin reindex
```

## Maintenance

### Regular Maintenance Tasks

**Daily**:

- Monitor metrics and alerts
- Review error logs
- Check backup completion
- Verify cluster health

**Weekly**:

- Review slow query logs
- Analyze storage growth
- Update statistics
- Rotate logs

**Monthly**:

- Vacuum database
- Update Docker images
- Review and update secrets
- Test disaster recovery

**Quarterly**:

- Security audit
- Performance benchmarks
- Capacity planning review
- Update TLS certificates (if needed)

### Update Procedure

```bash
# Pull latest images
docker-compose pull

# Backup current state
geode backup --dest s3://geode-backups/pre-update-$(date +%Y%m%d)

# Stop services
docker-compose stop geode

# Recreate containers
docker-compose up -d geode

# Verify health
docker-compose logs -f geode
geode query "RETURN 1" --server geode:8443

# Clean up old images
docker image prune -a
```

### Log Rotation

**Configure logrotate**:

```bash
# /etc/logrotate.d/geode
/var/lib/docker/volumes/geode_logs/_data/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        docker-compose exec geode kill -USR1 1
    endscript
}
```

### Cleanup

```bash
# Remove old backups (30+ days)
docker-compose exec minio mc find local/geode-backups --older-than 30d --exec "mc rm {}"

# Clean up old Docker volumes
docker volume prune

# Clean up old logs
find /var/log/geode -name "*.log" -mtime +30 -delete

# Clean WAL archives (after backup)
geode admin clean-wal-archive --before $(date -d "7 days ago" +%Y%m%d)
```

## Production Checklist

Before going to production, verify:

- [ ] **Security**
  - [ ] Production TLS certificates installed
  - [ ] All default passwords changed
  - [ ] Firewall rules configured
  - [ ] Vault initialized and unsealed
  - [ ] Secrets rotation policy in place
  - [ ] Audit logging enabled
  - [ ] Network encryption between services

- [ ] **High Availability**
  - [ ] Minimum 3 nodes for distributed deployment
  - [ ] Raft consensus configured
  - [ ] Load balancer with health checks
  - [ ] Automatic failover tested
  - [ ] Replication lag monitoring

- [ ] **Backup & Recovery**
  - [ ] Automated backups scheduled
  - [ ] Backup retention policy configured
  - [ ] Restore procedure tested
  - [ ] Disaster recovery plan documented
  - [ ] Off-site backup storage

- [ ] **Monitoring**
  - [ ] Prometheus scraping Geode metrics
  - [ ] Grafana dashboards configured
  - [ ] Alerting rules defined
  - [ ] On-call rotation established
  - [ ] Runbook for common issues

- [ ] **Performance**
  - [ ] Load testing completed
  - [ ] Resource limits configured
  - [ ] Query optimization reviewed
  - [ ] Index strategy validated
  - [ ] Scaling plan defined

- [ ] **Operations**
  - [ ] Maintenance windows scheduled
  - [ ] Update procedure documented
  - [ ] Team trained on operations
  - [ ] Support escalation path defined
  - [ ] SLA/SLO targets documented

## Next Steps

After successful deployment:

1. **Configure Monitoring** - Set up dashboards and alerts in Grafana
2. **Test Backups** - Verify backup and restore procedures
3. **Optimize Queries** - Use EXPLAIN and PROFILE to tune performance
4. **Review Security** - Conduct security audit and penetration testing
5. **Document Operations** - Create runbooks for common operational tasks
6. **Train Team** - Ensure operations team is familiar with Geode deployment

**Related Documentation**:

- [Performance Tuning Guide](/docs/tutorials/index-optimization) - Query optimization with EXPLAIN
- [Security Configuration](/docs/security/overview/) - Advanced security features
- [Monitoring Setup](/docs/ops/observability/) - Metrics and alerting
- [Backup Strategies](/docs/guides/backup-automation/) - Backup and recovery procedures
- [Client Libraries](/docs/client-libraries/client-comparison) - Client configuration for production

---

*Last Updated: January 2026*
*Geode Version: **GEODE_VERSION**+*
*Status: Production Ready*
