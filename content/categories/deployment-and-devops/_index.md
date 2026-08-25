---
title: "Category: Deployment and DevOps"
description: "Comprehensive deployment and DevOps documentation for Geode graph database including guides, tutorials, and reference materials."
keywords:
  - deployment-and-devops
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/deployment-and-devops/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Deployment and DevOps practices for Geode encompass everything needed to run the database reliably in production, from initial installation and configuration through monitoring, scaling, backup, disaster recovery, and continuous operation. This category provides comprehensive guidance for deploying Geode across various environments including bare metal, virtual machines, containers, Kubernetes, and cloud platforms, while maintaining high availability, security, and performance.

Modern DevOps practices for Geode include infrastructure as code using tools like Terraform and Ansible, container orchestration with Docker and Kubernetes, automated monitoring with Prometheus and Grafana, continuous deployment pipelines, and comprehensive backup strategies. Whether running a single-node development instance or a globally distributed production cluster, proper deployment and operational practices ensure reliability and scalability.

This category explores deployment architectures, provides step-by-step setup guides for various platforms, explains monitoring and alerting strategies, covers backup and recovery procedures, and shares best practices learned from production deployments. Understanding these operational aspects is essential for maintaining a healthy, performant Geode deployment.

## Deployment Options

### Build From Source

Compile and install the Geode binary locally:

```bash
git clone https://github.com/codeprosorg/geode
cd geode
make build

# Run server
./zig-out/bin/geode serve --listen 0.0.0.0:3141 --data-dir /var/lib/geode
```

### Docker Deployment

Run Geode in Docker containers:

```dockerfile
# Dockerfile
FROM alpine:latest

COPY geode /usr/local/bin/
COPY config.yaml /etc/geode/

EXPOSE 3141
VOLUME /var/lib/geode

ENTRYPOINT ["geode"]
CMD ["serve", "--config", "/etc/geode/config.yaml"]
```

```bash
# Build image
docker build -t geode:__GEODE_VERSION__ .

# Run container
docker run -d \
  --name geode \
  -p 3141:3141 \
  -v geode-data:/var/lib/geode \
  -v $(pwd)/config.yaml:/etc/geode/config.yaml:ro \
  geode:__GEODE_VERSION__
```

### Kubernetes Deployment

Deploy Geode on Kubernetes:

```yaml
# geode-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: geode
  namespace: database
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
        image: geode:__GEODE_VERSION__
        ports:
        - containerPort: 3141
          name: quic
        - containerPort: 9090
          name: metrics
        env:
        - name: GEODE_SERVER_LISTEN
          value: "0.0.0.0:3141"
        - name: GEODE_STORAGE_DATA_DIR
          value: "/data"
        volumeMounts:
        - name: data
          mountPath: /data
        - name: config
          mountPath: /etc/geode
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          exec:
            command:
            - geode
            - health
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - geode
            - ready
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
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: geode
  namespace: database
spec:
  clusterIP: None
  selector:
    app: geode
  ports:
  - port: 3141
    name: quic
  - port: 9090
    name: metrics
```

Deploy to Kubernetes:

```bash
# Create namespace
kubectl create namespace database

# Create ConfigMap
kubectl create configmap geode-config \
  --from-file=config.yaml \
  -n database

# Deploy
kubectl apply -f geode-deployment.yaml

# Check status
kubectl get pods -n database
kubectl logs -f geode-0 -n database
```

### Cloud Deployments

**AWS EC2**:

```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type r6i.2xlarge \
  --key-name my-key \
  --security-groups geode-sg \
  --block-device-mappings '[
    {
      "DeviceName": "/dev/sda1",
      "Ebs": {
        "VolumeSize": 500,
        "VolumeType": "gp3",
        "Iops": 16000
      }
    }
  ]'

# Install and run Geode
ssh -i my-key.pem ec2-user@instance-ip
sudo yum install -y geode
sudo systemctl enable geode
sudo systemctl start geode
```

**GCP Compute Engine**:

```bash
# Create instance
gcloud compute instances create geode-instance \
  --machine-type=n2-highmem-4 \
  --boot-disk-size=500GB \
  --boot-disk-type=pd-ssd \
  --zone=us-west1-a

# SSH and install
gcloud compute ssh geode-instance
sudo apt-get update
sudo apt-get install -y geode
```

**Azure VM**:

```bash
# Create VM
az vm create \
  --resource-group geode-rg \
  --name geode-vm \
  --image UbuntuLTS \
  --size Standard_E4s_v3 \
  --data-disk-sizes-gb 500

# Install Geode
az vm extension set \
  --resource-group geode-rg \
  --vm-name geode-vm \
  --name customScript \
  --publisher Microsoft.Azure.Extensions \
  --settings '{"fileUris": ["https://install.geodedb.com/install.sh"],"commandToExecute": "./install.sh"}'
```

## Configuration Management

### Infrastructure as Code with Terraform

```hcl
# terraform/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-west-2"
}

resource "aws_instance" "geode" {
  count         = 3
  ami           = var.geode_ami
  instance_type = "r6i.2xlarge"

  vpc_security_group_ids = [aws_security_group.geode.id]
  subnet_id             = aws_subnet.private[count.index].id

  root_block_device {
    volume_size = 500
    volume_type = "gp3"
    iops        = 16000
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    node_id     = count.index + 1
    cluster_peers = join(",", [
      for i in range(3) : "${aws_instance.geode[i].private_ip}:3141"
      if i != count.index
    ])
  })

  tags = {
    Name = "geode-${count.index + 1}"
    Role = "database"
  }
}

resource "aws_security_group" "geode" {
  name        = "geode-sg"
  description = "Geode database security group"

  ingress {
    from_port   = 3141
    to_port     = 3141
    protocol    = "udp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  ingress {
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### Configuration with Ansible

```yaml
# ansible/playbook.yml
---
- name: Deploy Geode
  hosts: geode_cluster
  become: yes
  vars:
    geode_version: "__GEODE_VERSION__"
    geode_data_dir: "/var/lib/geode"

  tasks:
    - name: Clone Geode
      git:
        repo: "https://github.com/codeprosorg/geode"
        dest: "/opt/geode"
        version: "v{{ geode_version }}"

    - name: Build Geode
      command: make build
      args:
        chdir: "/opt/geode"

    - name: Install Geode binary
      copy:
        src: "/opt/geode/zig-out/bin/geode"
        dest: "/usr/local/bin/geode"
        mode: "0755"
        remote_src: true

    - name: Create data directory
      file:
        path: "{{ geode_data_dir }}"
        state: directory
        owner: geode
        group: geode
        mode: '0750'

    - name: Deploy configuration
      template:
        src: templates/config.yaml.j2
        dest: /etc/geode/config.yaml
        owner: geode
        group: geode
        mode: '0640'
      notify: restart geode

    - name: Enable and start Geode
      systemd:
        name: geode
        enabled: yes
        state: started

  handlers:
    - name: restart geode
      systemd:
        name: geode
        state: restarted
```

## Monitoring

### Prometheus Integration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets:
        - 'geode-1:9090'
        - 'geode-2:9090'
        - 'geode-3:9090'
```

### Key Metrics to Monitor

```yaml
# alert-rules.yml
groups:
  - name: geode
    interval: 30s
    rules:
      - alert: HighQueryLatency
        expr: histogram_quantile(0.95, geode_query_duration_seconds) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High query latency on {{ $labels.instance }}"

      - alert: TransactionFailures
        expr: rate(geode_transaction_failures_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical

      - alert: LowCacheHitRate
        expr: geode_cache_hit_rate < 0.8
        for: 10m
        labels:
          severity: warning

      - alert: DiskSpaceNearFull
        expr: geode_storage_disk_usage_percent > 85
        for: 5m
        labels:
          severity: critical
```

### Logging

```yaml
# geode config for structured logging
# NOTE: `monitoring:` is not a configuration-file section — it is ignored.
# The Prometheus listener is opt-in and env-only:
#   GEODE_METRICS_PORT=9090   (serves /metrics and /health)
#   GEODE_METRICS_BIND=127.0.0.1
```

Collect logs with Fluentd/Fluent Bit:

```yaml
# fluent-bit.conf
[INPUT]
    Name              tail
    Path              /var/log/geode/geode.log
    Parser            json
    Tag               geode

[OUTPUT]
    Name              es
    Match             geode
    Host              elasticsearch
    Port              9200
    Index             geode-logs
    Type              _doc
```

## Backup and Recovery

### Continuous Backup

```bash
# Automated backup script
#!/bin/bash

BACKUP_DIR="/backups/geode"
RETENTION_DAYS=30

# Create backup
geode backup create \
  --output "$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz" \
  --compression zstd

# Upload to S3
aws s3 cp "$BACKUP_DIR"/*.tar.gz s3://my-geode-backups/

# Clean old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
```

### Point-in-Time Recovery

```bash
# Restore from backup
geode restore \
  --from /backups/geode/backup-20250124-120000.tar.gz \
  --data-dir /var/lib/geode

# Or restore to specific point in time using WAL
geode restore \
  --from /backups/geode/backup-20250124-120000.tar.gz \
  --target-time "2025-01-24T14:30:00Z"
```

## High Availability

### Distributed Cluster Setup

```yaml
# Node 1 configuration
distributed:
  enabled: true
  node_id: "node-1"
  cluster_peers:
    - "node-2:3141"
    - "node-3:3141"
  replication_factor: 3
```

### Load Balancing

```nginx
# nginx.conf for load balancing
stream {
    upstream geode_cluster {
        least_conn;
        server geode-1:3141;
        server geode-2:3141;
        server geode-3:3141;
    }

    server {
        listen 3141 udp;
        proxy_pass geode_cluster;
        proxy_timeout 300s;
    }
}
```

## Best Practices

### Production Deployment Checklist

- [ ] Enable TLS with valid certificates
- [ ] Configure authentication and authorization
- [ ] Enable encryption at rest (TDE)
- [ ] Set up monitoring and alerting
- [ ] Configure automated backups
- [ ] Test recovery procedures
- [ ] Set resource limits (memory, CPU)
- [ ] Enable audit logging
- [ ] Configure log rotation
- [ ] Document runbooks for common issues
- [ ] Set up health checks
- [ ] Plan capacity for growth
- [ ] Enable connection pooling
- [ ] Configure firewall rules
- [ ] Set up DNS for service discovery

### Performance Tuning for Production

```yaml
# Production configuration
server:
  max_connections: 2000
  worker_threads: 16

storage:
  cache_size_mb: 16384  # 50% of available RAM
  wal:
    sync_mode: "group_commit"
    flush_interval_ms: 100

transactions:
  isolation_level: "snapshot_isolation"
  lock_timeout_ms: 5000

query:
  enable_query_cache: true
  query_cache_size_mb: 2048
  max_parallel_workers: 8
```

### Security Hardening

- Use TLS 1.3 with strong cipher suites
- Enable authentication (LDAP, OAuth2, SAML)
- Implement Row-Level Security (RLS)
- Enable transparent data encryption (TDE)
- Use field-level encryption for sensitive data
- Limit network access with firewall rules
- Enable audit logging
- Rotate credentials regularly
- Use secrets management (Vault, AWS Secrets Manager)
- Keep Geode updated with security patches

## Further Reading

- [Docker Guide](/tags/docker/) - Container deployment
- [Kubernetes Guide](/tags/kubernetes/) - Orchestration
- [Monitoring](/tags/monitoring/) - Metrics and alerting
- [Performance](/categories/performance/) - Optimization
- [Security](/categories/security/) - Hardening
- [Configuration](/categories/configuration/) - Server configuration
