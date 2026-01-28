---
title: "Server Configuration"
description: "Complete guide to Geode server configuration, deployment options, runtime settings, performance tuning, resource management, and production best practices."
keywords:
  - server
  - configuration
  - deployment
  - runtime
  - performance tuning
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/server/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Server Configuration

Geode server configuration encompasses all aspects of running, managing, and optimizing the database server for production workloads. From basic startup parameters to advanced performance tuning, proper server configuration is essential for reliability, performance, and maintainability.

## Introduction to Geode Server

The Geode server is a single-binary application written in Zig that combines the database engine, query processor, network layer, and management interfaces. The server architecture emphasizes simplicity with zero external dependencies (no JVM, no runtime required), high performance through native code compilation, low resource usage with efficient memory management, and easy deployment with a single executable file.

The server supports multiple deployment modes including standalone single-node deployment, clustered multi-node configurations (planned), containerized deployment with Docker/Kubernetes, and embedded mode for testing and development.

## Basic Server Configuration

### Configuration File

Geode uses TOML format for configuration (`/etc/geode/geode.conf`):

```toml
# Server identification
[server]
id = "geode-01"
name = "Production Geode Server"

# Data directory
data_dir = "/var/lib/geode"

# Listen address and port
[network]
listen_address = "0.0.0.0"
port = 3141
enable_ipv6 = true

# TLS configuration
[network.tls]
cert_file = "/etc/geode/tls/server.crt"
key_file = "/etc/geode/tls/server.key"
require_client_cert = false

# Resource limits
[resources]
max_memory = "16GB"
max_connections = 10000
worker_threads = 8

# Logging
[logging]
level = "info"
output = "/var/log/geode/server.log"
rotation = "daily"
max_size = "100MB"
max_files = 30
```

### Command-Line Options

Start server with command-line overrides:

```bash
# Basic startup
geode serve --listen 0.0.0.0:3141

# With configuration file
geode serve --config /etc/geode/geode.conf

# Override specific settings
geode serve \
  --config /etc/geode/geode.conf \
  --data-dir /data/geode \
  --log-level debug

# Daemon mode
geode serve --daemon --pid-file /var/run/geode.pid

# Development mode (relaxed security)
geode serve --dev --listen localhost:3141
```

### Environment Variables

Configure via environment variables:

```bash
# Data directory
export GEODE_DATA_DIR=/var/lib/geode

# Listen address
export GEODE_LISTEN=0.0.0.0:3141

# Log level
export GEODE_LOG_LEVEL=info

# TLS certificates
export GEODE_TLS_CERT=/etc/geode/tls/server.crt
export GEODE_TLS_KEY=/etc/geode/tls/server.key

# Start server
geode serve
```

## Performance Configuration

### Memory Management

Configure memory allocation and caching:

```toml
[memory]
# Maximum heap size
max_heap = "16GB"

# Page cache size (for graph storage)
page_cache_size = "8GB"

# Query result cache
result_cache_size = "2GB"
result_cache_ttl = 300  # seconds

# Connection buffer sizes
connection_buffer_size = "1MB"

# Memory allocator (system, jemalloc, mimalloc)
allocator = "jemalloc"
```

### Thread Configuration

Optimize thread pool settings:

```toml
[threading]
# Query worker threads (0 = auto-detect CPU cores)
worker_threads = 0

# IO threads for network operations
io_threads = 4

# Background tasks (checkpoints, compaction, etc.)
background_threads = 2

# Thread stack size
stack_size = "2MB"

# Thread priority (normal, high, realtime)
priority = "high"
```

### Query Execution

Configure query processing:

```toml
[query]
# Maximum query execution time (milliseconds)
max_execution_time = 300000  # 5 minutes

# Maximum memory per query
max_query_memory = "1GB"

# Query result page size
result_page_size = 1000

# Enable query caching
enable_query_cache = true
query_cache_size = "512MB"

# Parallel query execution
enable_parallel_execution = true
max_parallel_workers = 4

# Query timeout for network operations
network_timeout = 30000  # 30 seconds
```

### Storage Configuration

Configure storage engine settings:

```toml
[storage]
# Storage engine (btree, lsm)
engine = "btree"

# Write-Ahead Log settings
[storage.wal]
enabled = true
dir = "/var/lib/geode/wal"
segment_size = "64MB"
fsync_mode = "everysec"  # never, everysec, always

# Checkpoint frequency
checkpoint_interval = 300  # seconds
checkpoint_threshold = "1GB"  # WAL size

# Compaction
[storage.compaction]
enabled = true
strategy = "incremental"  # incremental, full
schedule = "0 2 * * *"  # cron format
max_threads = 2
```

## Security Configuration

### Authentication

Configure authentication methods:

```toml
[auth]
# Enable authentication
enabled = true

# Authentication methods (password, cert, ldap, oauth)
methods = ["password", "cert"]

# Password policy
[auth.password]
min_length = 12
require_uppercase = true
require_lowercase = true
require_numbers = true
require_special = true
max_age_days = 90

# Session configuration
[auth.session]
timeout = 3600  # seconds
max_concurrent_sessions = 10
```

### Access Control

Configure role-based access control:

```toml
[access_control]
# Enable authorization
enabled = true

# Default role for authenticated users
default_role = "read_only"

# Admin users (full access)
admin_users = ["admin", "root"]

# Audit logging
[access_control.audit]
enabled = true
log_file = "/var/log/geode/audit.log"
log_queries = true
log_connections = true
log_admin_actions = true
```

### Encryption

Configure encryption at rest and in transit:

```toml
[encryption]
# Transparent Data Encryption (TDE)
[encryption.tde]
enabled = true
key_file = "/etc/geode/keys/master.key"
algorithm = "AES-256-GCM"

# Field-Level Encryption (FLE)
[encryption.fle]
enabled = true
key_provider = "vault"  # vault, file, kms
vault_url = "https://vault.example.com"
vault_token = "${VAULT_TOKEN}"
```

## Monitoring Configuration

### Metrics and Telemetry

Configure metrics collection:

```toml
[metrics]
# Enable metrics
enabled = true

# Metrics collection interval
interval = 10  # seconds

# Prometheus exporter
[metrics.prometheus]
enabled = true
port = 9090
path = "/metrics"

# OpenTelemetry
[metrics.otel]
enabled = false
endpoint = "http://otel-collector:4317"
```

### Health Checks

Configure health check endpoints:

```toml
[health]
# Enable health checks
enabled = true

# Health check port
port = 8080

# Liveness probe endpoint
liveness_path = "/health/live"

# Readiness probe endpoint
readiness_path = "/health/ready"

# Health check interval
check_interval = 5  # seconds
```

### Logging Configuration

Advanced logging settings:

```toml
[logging]
# Log level (debug, info, warn, error)
level = "info"

# Output destination
output = "/var/log/geode/server.log"

# Log format (json, text)
format = "json"

# Structured logging fields
[logging.fields]
service = "geode"
environment = "production"
datacenter = "us-east-1"

# Log rotation
rotation = "daily"  # daily, hourly, size
max_size = "100MB"
max_files = 30
compress = true

# Separate log files by level
[logging.files]
error = "/var/log/geode/error.log"
audit = "/var/log/geode/audit.log"
query = "/var/log/geode/query.log"
```

## High Availability Configuration

### Replication Settings

Configure replication for HA deployments:

```toml
[replication]
# Enable replication
enabled = true

# Replication mode (sync, async, semi-sync)
mode = "semi-sync"

# Primary server configuration
[replication.primary]
enabled = true
bind_address = "0.0.0.0:3142"

# Replica configuration
[replication.replica]
enabled = false
primary_host = "geode-primary:3142"
replication_lag_threshold = 1000  # milliseconds

# Automatic failover
[replication.failover]
enabled = true
election_timeout = 10000  # milliseconds
heartbeat_interval = 1000  # milliseconds
```

### Clustering

Configure multi-node clustering (planned feature):

```toml
[cluster]
# Enable clustering
enabled = true

# Cluster name
name = "geode-production"

# Cluster nodes
nodes = [
  "geode-01:3141",
  "geode-02:3141",
  "geode-03:3141"
]

# Consensus algorithm (raft)
consensus = "raft"

# Data sharding
[cluster.sharding]
enabled = true
shards = 16
replication_factor = 3
```

## Resource Limits

### Connection Limits

Configure connection and resource limits:

```toml
[limits]
# Maximum concurrent connections
max_connections = 10000

# Maximum connections per client IP
max_connections_per_ip = 100

# Connection queue size
connection_queue_size = 1000

# Maximum request size
max_request_size = "10MB"

# Maximum response size
max_response_size = "100MB"

# Rate limiting
[limits.rate]
enabled = true
requests_per_second = 10000
burst_size = 1000
```

### Query Limits

Prevent resource exhaustion from expensive queries:

```toml
[limits.query]
# Maximum query execution time
max_execution_time = 300000  # 5 minutes

# Maximum result set size
max_result_rows = 1000000

# Maximum traversal depth
max_path_length = 10

# Maximum concurrent queries per connection
max_concurrent_queries = 10

# Query complexity limits
max_query_complexity = 10000  # cost units
```

## Deployment Configurations

### Systemd Service

Create systemd service file (`/etc/systemd/system/geode.service`):

```ini
[Unit]
Description=Geode Graph Database
After=network.target
Wants=network-online.target

[Service]
Type=notify
User=geode
Group=geode
ExecStart=/usr/bin/geode serve --config /etc/geode/geode.conf
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10s
LimitNOFILE=65536
LimitNPROC=4096
StandardOutput=journal
StandardError=journal
SyslogIdentifier=geode

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/geode /var/log/geode

[Install]
WantedBy=multi-user.target
```

Manage service:

```bash
# Enable and start
sudo systemctl enable geode
sudo systemctl start geode

# Check status
sudo systemctl status geode

# View logs
sudo journalctl -u geode -f

# Reload configuration
sudo systemctl reload geode

# Restart service
sudo systemctl restart geode
```

### Docker Configuration

Dockerfile for containerized deployment:

```dockerfile
FROM alpine:latest

# Install dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create user
RUN addgroup -g 3141 geode && \
    adduser -D -u 3141 -G geode geode

# Copy binary
COPY --chown=geode:geode geode /usr/local/bin/geode

# Create directories
RUN mkdir -p /var/lib/geode /var/log/geode && \
    chown -R geode:geode /var/lib/geode /var/log/geode

# Switch to geode user
USER geode

# Expose ports
EXPOSE 3141

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s \
  CMD geode admin health || exit 1

# Start server
ENTRYPOINT ["/usr/local/bin/geode"]
CMD ["serve", "--listen", "0.0.0.0:3141"]
```

Docker Compose configuration:

```yaml
version: '3.8'

services:
  geode:
    image: geode:latest
    container_name: geode
    ports:
      - "3141:3141"
    volumes:
      - geode-data:/var/lib/geode
      - geode-logs:/var/log/geode
      - ./geode.conf:/etc/geode/geode.conf:ro
    environment:
      - GEODE_LOG_LEVEL=info
    restart: unless-stopped
    networks:
      - geode-network

volumes:
  geode-data:
  geode-logs:

networks:
  geode-network:
    driver: bridge
```

### Kubernetes Deployment

Kubernetes StatefulSet configuration:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: geode
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
        image: geode:0.18.0
        ports:
        - containerPort: 3141
          name: client
        - containerPort: 3142
          name: replication
        env:
        - name: GEODE_LOG_LEVEL
          value: "info"
        volumeMounts:
        - name: data
          mountPath: /var/lib/geode
        - name: config
          mountPath: /etc/geode
        resources:
          requests:
            memory: "8Gi"
            cpu: "4"
          limits:
            memory: "16Gi"
            cpu: "8"
        livenessProbe:
          exec:
            command:
            - geode
            - admin
            - health
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - geode
            - admin
            - health
            - --ready
          initialDelaySeconds: 15
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
```

## Best Practices

1. **Configuration Management**: Use version control for configuration files
2. **Resource Sizing**: Size memory and CPU based on workload characteristics
3. **Security**: Enable authentication and encryption in production
4. **Monitoring**: Configure comprehensive metrics and alerting
5. **Logging**: Use structured logging with appropriate log levels
6. **Backups**: Configure automated backups with retention policies
7. **Testing**: Test configuration changes in staging before production
8. **Documentation**: Document all configuration customizations and rationale

## Troubleshooting

### Server Won't Start

```bash
# Check configuration syntax
geode config validate --config /etc/geode/geode.conf

# Test with verbose logging
geode serve --config /etc/geode/geode.conf --log-level debug

# Check port availability
sudo netstat -tulpn | grep 3141

# Verify file permissions
ls -la /var/lib/geode /var/log/geode
```

### Performance Issues

```bash
# Check resource usage
geode admin resources

# Review slow queries
geode admin slow-queries --min-duration 1000

# Analyze query plans
geode query "EXPLAIN <query>"

# Check for lock contention
geode admin locks --show-contention
```

### Memory Issues

```bash
# Check memory usage
geode admin memory --detailed

# Analyze heap usage
geode admin heap-dump --output /tmp/heap.dump

# Review cache statistics
geode admin cache-stats
```

## Related Topics

- [Configuration](/tags/configuration/) - General configuration topics
- [Performance](/tags/performance/) - Performance tuning
- [Security](/tags/security/) - Security configuration
- [Monitoring](/tags/monitoring/) - Monitoring and metrics
- [Deployment](/tags/deployment/) - Deployment strategies

## Further Reading

- [Deployment Guide](/docs/deployment/) - Deployment patterns and strategies
- [Performance Optimization](/docs/performance/) - Performance tuning guide
- [Security Overview](/docs/security/) - Security configuration guide
