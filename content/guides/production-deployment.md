---
title: "Production Deployment Guide"
slug: "production-deployment"
description: "Complete guide to deploying Geode in production environments"
weight: 50
tags: ["production", "deployment", "docker", "kubernetes", "security", "tls"]
categories: ["guides", "deployment"]
keywords:
  - Geode production
  - graph database deployment
  - Docker deployment
  - Kubernetes deployment
  - TLS configuration
  - security hardening
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Production Deployment Guide

This guide covers everything you need to deploy Geode in production: hardware requirements, OS tuning, security hardening, TLS configuration, and container orchestration.

## Hardware Requirements

### Minimum Requirements

| Component | Specification |
|-----------|---------------|
| CPU | 4 cores (x86_64 or ARM64) |
| Memory | 8 GB RAM |
| Storage | 50 GB SSD |
| Network | 1 Gbps |

### Recommended Requirements

| Component | Specification |
|-----------|---------------|
| CPU | 16+ cores |
| Memory | 64+ GB RAM |
| Storage | 500+ GB NVMe SSD |
| Network | 10 Gbps |

### Storage Considerations

**SSD is Required**: Geode relies on fast random I/O for graph traversals. HDDs are not recommended.

**Storage Sizing Formula**:
```
Required Storage = (Nodes * 256 bytes) + (Relationships * 128 bytes) + (Properties * avg_size) + 20% overhead
```

**Example Calculation**:
```
10 million nodes: 10M * 256 = 2.56 GB
50 million relationships: 50M * 128 = 6.4 GB
100 million properties (avg 64 bytes): 100M * 64 = 6.4 GB
Total: ~18 GB + 20% = ~22 GB
```

### Memory Sizing

**Rule of Thumb**: Allocate 1 GB RAM per 10 million graph elements (nodes + relationships).

**Memory Distribution**:
- 60%: Page cache for data files
- 25%: Query execution buffers
- 10%: Connection handling
- 5%: System overhead

## OS Tuning (Linux)

### System Limits

Edit `/etc/security/limits.conf`:

```conf
# Geode user limits
geode soft nofile 65535
geode hard nofile 65535
geode soft nproc 65535
geode hard nproc 65535
geode soft memlock unlimited
geode hard memlock unlimited
```

### Kernel Parameters

Edit `/etc/sysctl.conf`:

```conf
# Network tuning for QUIC
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.core.rmem_default = 16777216
net.core.wmem_default = 16777216
net.core.optmem_max = 40960
net.core.netdev_max_backlog = 50000
net.ipv4.udp_mem = 65536 131072 262144
net.ipv4.udp_rmem_min = 16384
net.ipv4.udp_wmem_min = 16384

# Connection handling
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# File system
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288

# Virtual memory
vm.swappiness = 10
vm.dirty_ratio = 40
vm.dirty_background_ratio = 10
vm.max_map_count = 262144
```

Apply changes:

```bash
sudo sysctl -p
```

### I/O Scheduler

For NVMe drives:

```bash
echo "none" | sudo tee /sys/block/nvme0n1/queue/scheduler
```

For SSD drives:

```bash
echo "mq-deadline" | sudo tee /sys/block/sda/queue/scheduler
```

### Transparent Huge Pages

Disable for better memory performance:

```bash
echo "never" | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo "never" | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
```

Make persistent via `/etc/rc.local` or systemd service.

## Security Hardening

### Dedicated User

```bash
# Create geode user
sudo useradd -r -s /bin/false -d /var/lib/geode geode

# Create directories
sudo mkdir -p /var/lib/geode /var/log/geode /etc/geode
sudo chown -R geode:geode /var/lib/geode /var/log/geode /etc/geode
sudo chmod 750 /var/lib/geode /var/log/geode
sudo chmod 700 /etc/geode
```

### File Permissions

```bash
# Data directory
chmod 700 /var/lib/geode

# Configuration (may contain secrets)
chmod 600 /etc/geode/geode.yaml

# TLS certificates
chmod 600 /etc/geode/server.key
chmod 644 /etc/geode/server.crt

# Log directory
chmod 750 /var/log/geode
```

### Firewall Configuration

```bash
# Allow Geode port (default 3141)
sudo ufw allow 3141/udp comment "Geode QUIC"

# Alternative port 8443
sudo ufw allow 8443/udp comment "Geode QUIC Alt"

# Deny direct access to data directory port if using reverse proxy
sudo ufw deny 3142/udp
```

### SELinux (RHEL/CentOS)

```bash
# Create policy for Geode
cat > geode.te << EOF
module geode 1.0;

require {
    type geode_t;
    type geode_port_t;
    type geode_data_t;
}

allow geode_t geode_port_t:udp_socket { bind listen };
allow geode_t geode_data_t:dir { read write add_name remove_name };
allow geode_t geode_data_t:file { read write create unlink };
EOF

# Compile and install
checkmodule -M -m -o geode.mod geode.te
semodule_package -o geode.pp -m geode.mod
semodule -i geode.pp
```

### AppArmor (Ubuntu/Debian)

```bash
cat > /etc/apparmor.d/usr.bin.geode << EOF
#include <tunables/global>

/usr/bin/geode {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  # Binary
  /usr/bin/geode mr,

  # Configuration
  /etc/geode/ r,
  /etc/geode/** r,

  # Data directory
  /var/lib/geode/ rw,
  /var/lib/geode/** rwk,

  # Logs
  /var/log/geode/ rw,
  /var/log/geode/** rw,

  # TLS
  /etc/geode/*.crt r,
  /etc/geode/*.key r,

  # Network
  network inet dgram,
  network inet6 dgram,
}
EOF

sudo apparmor_parser -r /etc/apparmor.d/usr.bin.geode
```

## TLS Configuration

### Generate Certificates

**Self-Signed (Development/Testing)**:

```bash
# Generate CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=Geode CA/O=MyOrg"

# Generate server certificate
openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr \
  -subj "/CN=geode.example.com/O=MyOrg"

# Create SAN config
cat > server.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = geode.example.com
DNS.2 = *.geode.example.com
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF

# Sign certificate
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 365 -extfile server.ext
```

**Let's Encrypt (Production)**:

```bash
# Install certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d geode.example.com

# Certificates stored at:
# /etc/letsencrypt/live/geode.example.com/fullchain.pem
# /etc/letsencrypt/live/geode.example.com/privkey.pem

# Auto-renewal
sudo systemctl enable certbot.timer
```

### TLS Configuration File

Create `/etc/geode/geode.yaml`:

```yaml
server:
  listen: "0.0.0.0:3141"

tls:
  enabled: true
  cert_file: "/etc/geode/server.crt"
  key_file: "/etc/geode/server.key"
  ca_file: "/etc/geode/ca.crt"  # Optional: for client auth
  min_version: "1.3"
  client_auth: "optional"  # none, optional, required

security:
  # Require TLS for all connections
  require_tls: true
  # Reject plaintext connections
  allow_plaintext: false
```

### Cipher Suites

Geode uses TLS 1.3 which provides strong defaults. For compliance requirements:

```yaml
tls:
  cipher_suites:
    - "TLS_AES_256_GCM_SHA384"
    - "TLS_CHACHA20_POLY1305_SHA256"
    - "TLS_AES_128_GCM_SHA256"
```

## Authentication Setup

### Built-in Authentication

```yaml
auth:
  enabled: true
  type: "builtin"

  # Admin user (created on first start)
  admin:
    username: "admin"
    password_hash: "$argon2id$v=19$m=65536,t=3,p=4$..."  # Use geode hash-password

  # Allow anonymous read-only access
  anonymous:
    enabled: false
    role: "reader"
```

### Generate Password Hash

```bash
geode hash-password
Enter password: ********
Confirm password: ********
Hash: $argon2id$v=19$m=65536,t=3,p=4$randomsalt$hashedpassword
```

### LDAP Authentication

```yaml
auth:
  enabled: true
  type: "ldap"

  ldap:
    url: "ldaps://ldap.example.com:636"
    base_dn: "dc=example,dc=com"
    bind_dn: "cn=geode,ou=services,dc=example,dc=com"
    bind_password_file: "/etc/geode/ldap-password"
    user_search: "(uid={username})"
    group_search: "(member={dn})"

    # Map LDAP groups to Geode roles
    group_mappings:
      - ldap_group: "cn=admins,ou=groups,dc=example,dc=com"
        geode_role: "admin"
      - ldap_group: "cn=developers,ou=groups,dc=example,dc=com"
        geode_role: "readwrite"
      - ldap_group: "cn=viewers,ou=groups,dc=example,dc=com"
        geode_role: "readonly"
```

### OAuth2/OIDC Authentication

```yaml
auth:
  enabled: true
  type: "oidc"

  oidc:
    issuer: "https://auth.example.com"
    client_id: "geode-server"
    client_secret_file: "/etc/geode/oidc-secret"

    # Claims mapping
    username_claim: "preferred_username"
    roles_claim: "groups"

    # Role mappings
    role_mappings:
      - claim_value: "geode-admins"
        geode_role: "admin"
      - claim_value: "geode-users"
        geode_role: "readwrite"
```

### Role-Based Access Control

```yaml
roles:
  admin:
    permissions:
      - "*"  # All permissions

  readwrite:
    permissions:
      - "read:*"
      - "write:*"
      - "schema:read"

  readonly:
    permissions:
      - "read:*"
      - "schema:read"

  restricted:
    permissions:
      - "read:public/*"
    deny:
      - "read:private/*"
```

## Network Configuration

### Bind Address

```yaml
server:
  # Listen on all interfaces
  listen: "0.0.0.0:3141"

  # Or specific interface
  listen: "192.168.1.10:3141"

  # IPv6
  listen: "[::]:3141"

  # Multiple listeners
  listeners:
    - address: "0.0.0.0:3141"
      tls: true
    - address: "127.0.0.1:3142"
      tls: false  # Local only, no TLS
```

### Connection Limits

```yaml
server:
  max_connections: 10000
  connection_timeout: 30s
  idle_timeout: 300s

  # Per-client limits
  per_client:
    max_connections: 100
    rate_limit: 1000  # Requests per second
```

### QUIC Settings

```yaml
quic:
  # Maximum concurrent streams per connection
  max_streams: 100

  # Initial congestion window
  initial_window: 14720

  # Maximum receive buffer
  max_recv_buffer: 16777216

  # Keep-alive interval
  keep_alive: 15s

  # ACK delay
  max_ack_delay: 25ms
```

## Docker Production Deployment

### Production Dockerfile

```dockerfile
FROM alpine:3.19 AS base

# Install dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata

# Create non-root user
RUN addgroup -g 1000 geode && \
    adduser -u 1000 -G geode -s /bin/sh -D geode

FROM base AS runtime

# Copy binary
COPY --chown=geode:geode geode /usr/local/bin/geode

# Create directories
RUN mkdir -p /var/lib/geode /var/log/geode /etc/geode && \
    chown -R geode:geode /var/lib/geode /var/log/geode /etc/geode

# Set permissions
RUN chmod 700 /var/lib/geode /etc/geode && \
    chmod 750 /var/log/geode

USER geode

EXPOSE 3141/udp

VOLUME ["/var/lib/geode", "/etc/geode"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD geode ping localhost:3141 || exit 1

ENTRYPOINT ["/usr/local/bin/geode"]
CMD ["serve", "--config", "/etc/geode/geode.yaml"]
```

### Docker Compose (Production)

```yaml
version: '3.8'

services:
  geode:
    image: geodedb/geode:0.18.0
    container_name: geode-prod
    restart: unless-stopped
    user: "1000:1000"

    ports:
      - "3141:3141/udp"

    volumes:
      - geode-data:/var/lib/geode
      - geode-logs:/var/log/geode
      - ./config/geode.yaml:/etc/geode/geode.yaml:ro
      - ./certs:/etc/geode/certs:ro

    environment:
      - GEODE_LOG_LEVEL=info
      - GEODE_LOG_FORMAT=json
      - TZ=UTC

    deploy:
      resources:
        limits:
          cpus: '8'
          memory: 32G
        reservations:
          cpus: '4'
          memory: 16G

    healthcheck:
      test: ["CMD", "geode", "ping", "localhost:3141"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "10"

    security_opt:
      - no-new-privileges:true

    read_only: true
    tmpfs:
      - /tmp:size=100M,mode=1777

volumes:
  geode-data:
    driver: local
  geode-logs:
    driver: local
```

### Docker Swarm Deployment

```yaml
version: '3.8'

services:
  geode:
    image: geodedb/geode:0.18.0

    deploy:
      replicas: 3
      placement:
        constraints:
          - node.role == worker
          - node.labels.storage == ssd
        preferences:
          - spread: node.availability.zone

      resources:
        limits:
          cpus: '8'
          memory: 32G
        reservations:
          cpus: '4'
          memory: 16G

      update_config:
        parallelism: 1
        delay: 60s
        failure_action: rollback
        monitor: 30s

      rollback_config:
        parallelism: 1
        delay: 30s

      restart_policy:
        condition: on-failure
        delay: 10s
        max_attempts: 3
        window: 120s

    networks:
      - geode-internal
      - geode-external

    configs:
      - source: geode-config
        target: /etc/geode/geode.yaml

    secrets:
      - source: geode-tls-cert
        target: /etc/geode/server.crt
      - source: geode-tls-key
        target: /etc/geode/server.key
        mode: 0400

configs:
  geode-config:
    file: ./config/geode.yaml

secrets:
  geode-tls-cert:
    file: ./certs/server.crt
  geode-tls-key:
    file: ./certs/server.key

networks:
  geode-internal:
    driver: overlay
    internal: true
  geode-external:
    driver: overlay
```

## Kubernetes Deployment

### Namespace and RBAC

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: geode
  labels:
    app.kubernetes.io/name: geode
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: geode
  namespace: geode
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: geode
  namespace: geode
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "watch", "list"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: geode
  namespace: geode
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: geode
subjects:
  - kind: ServiceAccount
    name: geode
    namespace: geode
```

### ConfigMap and Secrets

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

    storage:
      data_dir: "/var/lib/geode"
      wal_dir: "/var/lib/geode/wal"

    logging:
      level: info
      format: json

    tls:
      enabled: true
      cert_file: "/etc/geode/certs/tls.crt"
      key_file: "/etc/geode/certs/tls.key"
---
apiVersion: v1
kind: Secret
metadata:
  name: geode-tls
  namespace: geode
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
```

### StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: geode
  namespace: geode
spec:
  serviceName: geode
  replicas: 3
  podManagementPolicy: Parallel

  selector:
    matchLabels:
      app: geode

  template:
    metadata:
      labels:
        app: geode
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"

    spec:
      serviceAccountName: geode
      terminationGracePeriodSeconds: 60

      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        runAsNonRoot: true

      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: geode
              topologyKey: kubernetes.io/hostname

        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: node-type
                    operator: In
                    values:
                      - database

      containers:
        - name: geode
          image: geodedb/geode:0.18.0
          imagePullPolicy: IfNotPresent

          command:
            - /usr/local/bin/geode
            - serve
            - --config=/etc/geode/geode.yaml

          ports:
            - name: quic
              containerPort: 3141
              protocol: UDP
            - name: metrics
              containerPort: 9090
              protocol: TCP

          resources:
            requests:
              cpu: "4"
              memory: "16Gi"
            limits:
              cpu: "8"
              memory: "32Gi"

          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL

          volumeMounts:
            - name: data
              mountPath: /var/lib/geode
            - name: config
              mountPath: /etc/geode/geode.yaml
              subPath: geode.yaml
              readOnly: true
            - name: tls
              mountPath: /etc/geode/certs
              readOnly: true
            - name: tmp
              mountPath: /tmp

          livenessProbe:
            exec:
              command:
                - geode
                - ping
                - localhost:3141
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            exec:
              command:
                - geode
                - ping
                - localhost:3141
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3

          startupProbe:
            exec:
              command:
                - geode
                - ping
                - localhost:3141
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 30

      volumes:
        - name: config
          configMap:
            name: geode-config
        - name: tls
          secret:
            secretName: geode-tls
        - name: tmp
          emptyDir:
            sizeLimit: 100Mi

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

### Services

```yaml
apiVersion: v1
kind: Service
metadata:
  name: geode
  namespace: geode
spec:
  type: ClusterIP
  clusterIP: None  # Headless for StatefulSet
  ports:
    - name: quic
      port: 3141
      protocol: UDP
      targetPort: 3141
  selector:
    app: geode
---
apiVersion: v1
kind: Service
metadata:
  name: geode-lb
  namespace: geode
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
spec:
  type: LoadBalancer
  ports:
    - name: quic
      port: 3141
      protocol: UDP
      targetPort: 3141
  selector:
    app: geode
```

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: geode
  namespace: geode
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: geode
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120
```

### Pod Disruption Budget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: geode
  namespace: geode
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: geode
```

## Health Checks and Readiness Probes

### Health Check Endpoints

Geode exposes health check endpoints:

| Endpoint | Protocol | Purpose |
|----------|----------|---------|
| `PING` | QUIC | Connection health |
| `/health` | HTTP | Overall health |
| `/ready` | HTTP | Readiness status |
| `/live` | HTTP | Liveness status |

### Health Check Script

```bash
#!/bin/bash
# /usr/local/bin/geode-health

set -e

# Check QUIC connection
if ! geode ping localhost:3141 --timeout 5s; then
    echo "QUIC health check failed"
    exit 1
fi

# Check disk space (>10% free)
DATA_DIR="/var/lib/geode"
FREE_PERCENT=$(df "$DATA_DIR" | tail -1 | awk '{print 100 - $5}' | tr -d '%')
if [ "$FREE_PERCENT" -lt 10 ]; then
    echo "Disk space low: ${FREE_PERCENT}% free"
    exit 1
fi

# Check memory usage (<90%)
MEM_PERCENT=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ "$MEM_PERCENT" -gt 90 ]; then
    echo "Memory usage high: ${MEM_PERCENT}%"
    exit 1
fi

echo "OK"
exit 0
```

### Kubernetes Probes

```yaml
livenessProbe:
  exec:
    command:
      - /usr/local/bin/geode-health
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 10
  failureThreshold: 3

readinessProbe:
  exec:
    command:
      - geode
      - ping
      - localhost:3141
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 5
  failureThreshold: 3

startupProbe:
  exec:
    command:
      - geode
      - ping
      - localhost:3141
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 30  # 5 minutes total startup time
```

## Logging Configuration

### Log Levels

```yaml
logging:
  level: info  # debug, info, warn, error

  # Per-component levels
  components:
    server: info
    storage: warn
    query: info
    replication: debug
```

### Log Format

```yaml
logging:
  format: json  # text, json

  # JSON format fields
  json:
    timestamp_field: "@timestamp"
    level_field: "level"
    message_field: "message"

  # Include additional fields
  fields:
    service: "geode"
    environment: "production"
    version: "0.18.0"
```

### Log Output

```yaml
logging:
  output:
    # Console output
    - type: console
      level: info

    # File output with rotation
    - type: file
      path: /var/log/geode/geode.log
      level: debug
      max_size: 100MB
      max_backups: 10
      max_age: 30  # days
      compress: true

    # Syslog output
    - type: syslog
      address: "localhost:514"
      facility: local0
      level: warn
```

### Log Aggregation

**Fluentd Configuration**:

```yaml
<source>
  @type tail
  path /var/log/geode/geode.log
  pos_file /var/log/fluentd/geode.pos
  tag geode
  <parse>
    @type json
    time_key @timestamp
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>

<filter geode>
  @type record_transformer
  <record>
    hostname "#{Socket.gethostname}"
    cluster "production"
  </record>
</filter>

<match geode>
  @type elasticsearch
  host elasticsearch.example.com
  port 9200
  index_name geode-logs
  type_name _doc
</match>
```

**Filebeat Configuration**:

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/geode/*.log
    json:
      keys_under_root: true
      add_error_key: true
    fields:
      service: geode
      environment: production

output.elasticsearch:
  hosts: ["elasticsearch.example.com:9200"]
  index: "geode-logs-%{+yyyy.MM.dd}"
```

## Systemd Service

```ini
[Unit]
Description=Geode Graph Database
Documentation=https://geodedb.com/docs
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=geode
Group=geode

ExecStart=/usr/local/bin/geode serve --config /etc/geode/geode.yaml
ExecReload=/bin/kill -HUP $MAINPID

Restart=on-failure
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

# Security
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/lib/geode /var/log/geode
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_BIND_SERVICE

# Resource limits
LimitNOFILE=65535
LimitNPROC=65535
LimitMEMLOCK=infinity

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=geode

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

## Pre-Production Checklist

### Security
- [ ] TLS enabled with valid certificates
- [ ] Authentication configured
- [ ] RBAC policies defined
- [ ] Firewall rules configured
- [ ] Security scanning completed
- [ ] Secrets stored securely (Vault, K8s secrets)

### Performance
- [ ] Hardware meets requirements
- [ ] OS tuning applied
- [ ] Storage is SSD/NVMe
- [ ] Memory limits configured
- [ ] Connection limits set

### Reliability
- [ ] Health checks configured
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured

### Operations
- [ ] Runbooks documented
- [ ] On-call rotation established
- [ ] Escalation paths defined
- [ ] Rollback procedures tested

## Troubleshooting

### Connection Issues

```bash
# Check if Geode is listening
ss -ulnp | grep 3141

# Test QUIC connectivity
geode ping geode.example.com:3141 --verbose

# Check TLS certificate
openssl s_client -connect geode.example.com:3141 -servername geode.example.com
```

### Performance Issues

```bash
# Check resource usage
top -p $(pgrep geode)

# Check disk I/O
iostat -xz 1

# Check network
iftop -i eth0

# Query performance
geode shell -c "PROFILE MATCH (n) RETURN count(n)"
```

### Memory Issues

```bash
# Check memory usage
free -h

# Check Geode memory
geode stats memory

# Force garbage collection (if supported)
kill -USR1 $(pgrep geode)
```

## Next Steps

- [High Availability Guide](/guides/high-availability/) - Set up HA clusters
- [Monitoring Guide](/guides/monitoring/) - Configure monitoring and alerting
- [Backup and Restore](/guides/backup-restore/) - Protect your data
- [Performance Tuning](/docs/performance/) - Optimize query performance

---

**Questions?** Contact us at [support@geodedb.com](mailto:support@geodedb.com) or visit our [community forum](https://forum.geodedb.com).
