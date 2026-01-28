---
title: "Deployment and Operations"
description: "Comprehensive deployment guide for Geode including production setup, Docker containers, Kubernetes orchestration, cloud deployments, configuration management, and operational best practices."
keywords:
  - deployment
  - production
  - Docker
  - Kubernetes
  - operations
  - DevOps
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/deployment/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Deployment documentation for Geode covers production setup, containerization, orchestration, cloud deployments, and operational best practices. From single-node installations to distributed multi-region deployments, this guide helps you deploy Geode reliably and securely.

## Deployment Options

### Bare Metal / Virtual Machine

Traditional deployment on dedicated hardware or VMs:

**Advantages**:
- Maximum performance control
- Predictable resource allocation
- No containerization overhead
- Direct hardware access

**Installation**:

```bash
# Build from source
git clone https://github.com/codeprosorg/geode
cd geode
make build

# Create data directory
sudo mkdir -p /var/lib/geode
sudo chown geode:geode /var/lib/geode

# Create configuration
sudo nano /etc/geode/geode.yaml
```

**Configuration** (`/etc/geode/geode.yaml`):

```yaml
server:
  listen: "0.0.0.0:3141"
  max_connections: 1000

storage:
  data_dir: "/var/lib/geode"
  wal_dir: "/var/lib/geode/wal"

cache:
  index_cache_size: "2GB"
  data_cache_size: "8GB"

security:
  tls:
    enabled: true
    cert: "/etc/geode/tls/cert.pem"
    key: "/etc/geode/tls/key.pem"

metrics:
  enabled: true
  port: 9090
```

**Systemd service** (`/etc/systemd/system/geode.service`):

```ini
[Unit]
Description=Geode Graph Database
After=network.target

[Service]
Type=simple
User=geode
Group=geode
ExecStart=/usr/local/bin/geode serve --config /etc/geode/geode.yaml
Restart=on-failure
RestartSec=10s
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable geode
sudo systemctl start geode
sudo systemctl status geode
```

### Docker Container

Containerized deployment with Docker:

**Pull official image**:

```bash
docker pull codepros/geode:v0.18.0
```

**Run container**:

```bash
docker run -d \
  --name geode \
  -p 3141:3141 \
  -p 9090:9090 \
  -v /var/lib/geode:/var/lib/geode \
  -v /etc/geode:/etc/geode:ro \
  --restart unless-stopped \
  codepros/geode:v0.18.0
```

**Docker Compose** (`docker-compose.yml`):

```yaml
version: '3.8'

services:
  geode:
    image: codepros/geode:v0.18.0
    container_name: geode
    ports:
      - "3141:3141"
      - "9090:9090"
    volumes:
      - geode-data:/var/lib/geode
      - ./geode.yaml:/etc/geode/geode.yaml:ro
      - ./tls:/etc/geode/tls:ro
    environment:
      - GEODE_LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "/usr/local/bin/geode", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  geode-data:
    driver: local
```

Start with:

```bash
docker-compose up -d
docker-compose logs -f geode
```

### Kubernetes Deployment

Production-grade Kubernetes deployment:

**Namespace** (`namespace.yaml`):

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: geode
```

**ConfigMap** (`configmap.yaml`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: geode-config
  namespace: geode
data:
  geode.yaml: |
    server:
      listen: "0.0.0.0:3141"
      max_connections: 2000
    storage:
      data_dir: "/var/lib/geode"
    cache:
      index_cache_size: "4GB"
      data_cache_size: "16GB"
    metrics:
      enabled: true
      port: 9090
```

**StatefulSet** (`statefulset.yaml`):

```yaml
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
        image: codepros/geode:v0.18.0
        ports:
        - containerPort: 3141
          name: client
        - containerPort: 9090
          name: metrics
        volumeMounts:
        - name: data
          mountPath: /var/lib/geode
        - name: config
          mountPath: /etc/geode
          readOnly: true
        resources:
          requests:
            memory: "24Gi"
            cpu: "4"
          limits:
            memory: "32Gi"
            cpu: "8"
        livenessProbe:
          exec:
            command: ["/usr/local/bin/geode", "ping"]
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["/usr/local/bin/geode", "ready"]
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: geode-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Ti
```

**Service** (`service.yaml`):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: geode
  namespace: geode
spec:
  selector:
    app: geode
  ports:
  - name: client
    port: 3141
    targetPort: 3141
  - name: metrics
    port: 9090
    targetPort: 9090
  clusterIP: None  # Headless service for StatefulSet
---
apiVersion: v1
kind: Service
metadata:
  name: geode-client
  namespace: geode
spec:
  type: LoadBalancer
  selector:
    app: geode
  ports:
  - name: client
    port: 3141
    targetPort: 3141
```

Deploy:

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f statefulset.yaml
kubectl apply -f service.yaml

# Check status
kubectl -n geode get pods
kubectl -n geode get svc
kubectl -n geode logs geode-0 -f
```

### Cloud Deployments

#### AWS (Amazon Web Services)

**EC2 deployment**:

```bash
# Launch EC2 instance (Ubuntu 22.04, t3.xlarge)
# Install Geode (build from source)
git clone https://github.com/codeprosorg/geode
cd geode
make build
sudo cp ./zig-out/bin/geode /usr/local/bin/geode

# Use EBS for data persistence
sudo mkfs.ext4 /dev/nvme1n1
sudo mkdir /var/lib/geode
sudo mount /dev/nvme1n1 /var/lib/geode
```

**EKS (Elastic Kubernetes Service)**:

Use Kubernetes manifests above with EKS-specific storage classes:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: geode-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iopsPerGB: "50"
  throughput: "1000"
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
```

#### Google Cloud Platform

**GCE deployment**: Similar to AWS EC2

**GKE (Google Kubernetes Engine)**:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: geode-storage
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd
volumeBindingMode: WaitForFirstConsumer
```

#### Microsoft Azure

**Azure VMs**: Similar to AWS EC2

**AKS (Azure Kubernetes Service)**:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: geode-storage
provisioner: disk.csi.azure.com
parameters:
  storageaccounttype: Premium_LRS
  kind: Managed
```

## Production Configuration

### Hardware Requirements

**Minimum production specs**:
- CPU: 4 cores
- RAM: 16GB
- Storage: 100GB SSD
- Network: 1Gbps

**Recommended production specs**:
- CPU: 16+ cores
- RAM: 64GB+
- Storage: 1TB+ NVMe SSD
- Network: 10Gbps

### Operating System Tuning

**Linux kernel parameters** (`/etc/sysctl.conf`):

```ini
# Network tuning
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 8192
net.core.netdev_max_backlog = 16384

# File descriptors
fs.file-max = 2097152

# Memory
vm.swappiness = 1
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
```

Apply:

```bash
sudo sysctl -p
```

**File descriptor limits** (`/etc/security/limits.conf`):

```
geode soft nofile 65536
geode hard nofile 65536
geode soft nproc 4096
geode hard nproc 4096
```

### Security Hardening

**TLS certificates**:

```bash
# Generate self-signed cert (dev/test only)
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout /etc/geode/tls/key.pem \
  -out /etc/geode/tls/cert.pem \
  -days 365 \
  -subj "/CN=geode.example.com"

# Production: Use Let's Encrypt or internal CA
certbot certonly --standalone -d geode.example.com
```

**Firewall**:

```bash
# UFW (Ubuntu)
sudo ufw allow 3141/tcp  # Geode client port
sudo ufw allow 9090/tcp  # Metrics (internal only)
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 3141 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 9090 -s 10.0.0.0/8 -j ACCEPT
```

## Monitoring and Observability

### Prometheus Integration

**Prometheus config** (`prometheus.yml`):

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['localhost:9090']
```

### Grafana Dashboards

Import pre-built Geode dashboard:

```bash
# Download dashboard
wget https://geodedb.com/grafana/dashboard.json

# Import to Grafana
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @dashboard.json
```

### Log Management

**Centralized logging**:

```yaml
# Fluentd configuration
<source>
  @type tail
  path /var/log/geode/geode.log
  tag geode.server
  format json
</source>

<match geode.**>
  @type elasticsearch
  host elasticsearch.example.com
  port 9200
  logstash_format true
</match>
```

## Backup and Disaster Recovery

### Backup Strategy

```bash
# Create backup
./geode backup --output /backup/geode-$(date +%Y%m%d-%H%M%S).tar.gz

# Automated daily backups
cat > /etc/cron.daily/geode-backup <<'EOF'
#!/bin/bash
/usr/local/bin/geode backup --output /backup/geode-$(date +%Y%m%d).tar.gz
find /backup -name "geode-*.tar.gz" -mtime +30 -delete
EOF
chmod +x /etc/cron.daily/geode-backup
```

### Restore Procedure

```bash
# Stop Geode
sudo systemctl stop geode

# Restore backup
./geode restore --input /backup/geode-20260124.tar.gz

# Start Geode
sudo systemctl start geode
```

## Best Practices

1. **Use persistent storage**: Never store data on ephemeral disks
2. **Enable TLS**: Always encrypt client-server communication
3. **Monitor continuously**: Set up alerts for critical metrics
4. **Backup regularly**: Automated daily backups with offsite replication
5. **Resource isolation**: Dedicated nodes for production workloads
6. **Network security**: Firewall rules limiting access
7. **Update strategy**: Plan for zero-downtime updates
8. **Capacity planning**: Monitor growth and scale proactively
9. **Disaster recovery**: Test restore procedures regularly
10. **Documentation**: Maintain runbooks for common operations

## Related Topics

- [Containers](/tags/containers/) - Container deployment
- [Kubernetes](/tags/kubernetes/) - Orchestration
- [Monitoring](/tags/monitoring/) - Observability
- [Backup](/tags/backup/) - Data protection
- [Configuration](/tags/configuration/) - Server configuration

## Further Reading

- [Installation from Source](/docs/installation/from-source/) - Building and installing
- [Docker Deployment](/docs/ops/docker-deployment/) - Container deployment guide
- [Deployment Patterns](/docs/deployment/deployment-patterns/) - Production deployment strategies
