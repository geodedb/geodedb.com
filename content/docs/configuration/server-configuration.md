---
title: "Server Configuration Reference"
description: "Complete reference for Geode server configuration including command-line flags, environment variables, YAML configuration files, and deployment examples."
summary: "Comprehensive guide to configuring Geode database server with all options, defaults, and production deployment patterns."
slug: "server-configuration"
url: "/docs/configuration/server-configuration/"
aliases: ["/docs/config/", "/docs/configuration/"]
date: "2026-01-23"
lastmod: "2026-01-23"
draft: false
weight: 10
keywords: ["server configuration", "geode config", "database configuration", "QUIC configuration", "TLS setup", "environment variables", "YAML config"]
tags: ["configuration", "server", "deployment", "operations"]
categories: ["Configuration", "Operations"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/configuration/server-configuration/"
    noindex: false
---

<!-- CANARY: REQ=REQ-SERVER-REFACTOR-015; FEATURE="ServerRefactoring"; ASPECT=ConfigManagement; STATUS=TESTED; OWNER=server; UPDATED=2026-01-15 -->

## Overview

This guide provides complete reference documentation for configuring the Geode database server. Configuration can be provided through:

1. **Command-line flags** - Highest precedence
2. **Environment variables** - Medium precedence
3. **YAML configuration file** - Lowest precedence

{{< callout type="warning" >}}
**The configuration file is a flat, eight-key document.** `mergeFileConfig`
(`src/server/cli_args.zig`) reads exactly these keys, all at the top level:

`listen_quic`, `listen_grpc`, `cert_path`, `key_path`, `data_dir`, `log_level`,
`idle_timeout`, `persist_interval`.

There are **no nested sections**. `security:`, `storage:`, `cluster:`,
`monitoring:`, `performance:`, `logging:` and `encryption:` blocks are silently
ignored — an unknown key is not an error, so a file full of them looks like it
worked while changing nothing. Everything outside those eight keys is set with a
CLI flag or an environment variable.

Searched automatically, in order: `.geode/config.{yaml,toml,json}` (project) then
`~/.config/geode/config.*` (user). Any other path must be passed explicitly with
`-c/--config`, which accepts YAML, TOML or JSON.
{{< /callout >}}

**Quick Links:**

- [Command-Line Flags](#command-line-flags)
- [Environment Variables](#environment-variables)
- [YAML Configuration](#yaml-configuration-file)
- [Configuration Examples](#configuration-examples)
- [TLS/Certificate Setup](#tls-certificate-setup)

---

## Command-Line Flags

### Server Binary: `geode serve`

```bash
geode serve [OPTIONS]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-c`, `--config` | path | - | Config file path (YAML, TOML or JSON) |
| `--listen` | string | `0.0.0.0:3141` | QUIC/TLS listen address. Also `GEODE_PORT=<port>` |
| `--listen-grpc` | string | - | gRPC listen address (e.g. `0.0.0.0:3142`) |
| `--cert` | path | auto-generate | TLS certificate path |
| `--key` | path | auto-generate | TLS private key path |
| `--data_dir`, `--data-dir` | path | - | Data directory for storage and generated certs |
| `--order-keys` | `expr` | - | Allow expressions in `ORDER BY` |
| `--log-level` | string | `info` | `trace`, `debug`, `info`, `warn`, `error`, `critical` |
| `--idle-timeout` | int (ms) | `300000` | QUIC idle timeout |
| `--max-connections` | int | `10000` | Cap concurrent QUIC connections |
| `--persist-interval` | int (ms) | `100` | Background persistence interval |
| `--cluster-port` | int | - | Raft cluster listen port (needs `GEODE_CLUSTER_TOKEN`) |
| `--peers` | string | - | Comma-separated cluster peers (cluster ports) |
| `--no-auth` | flag | false | Disable authentication (not for production) |
| `--insecure-allow-all` | flag | false | Bypass **all** authorization checks (never in production) |
| `--strict-tenancy` | flag | false | Reject tenant-scoped ops with no tenant scope |

{{< callout type="note" >}}
This is the complete list. There is no `--tls-cert`/`--tls-key` (they are
`--cert`/`--key`), no `--log-json`, `--log-file`, `--page-cache-size` or
`--wal-dir` — the WAL lives inside `--data-dir`. `--enable-tde` and
`--enable-fle` are accepted for compatibility but do nothing: both are always
available.
{{< /callout >}}

### Examples

**Basic Server Start** (Development):

```bash
# Generate self-signed certificate first
openssl req -x509 -newkey rsa:4096 \
    -keyout server.key -out server.crt \
    -days 365 -nodes -subj "/CN=localhost"

# Start server
geode serve \
    --listen 0.0.0.0:3141 \
    --tls-cert server.crt \
    --tls-key server.key
```

**Production Server** with all options:

```bash
geode serve \
    --listen 0.0.0.0:3141 \
    --data-dir /var/lib/geode/data \
    --tls-cert /etc/geode/tls/server.crt \
    --tls-key /etc/geode/tls/server.key \
    --log-level info \
    --log-json \
    --log-level info \
    --max-connections 50000 \
    --page-cache-size 4096
```

**Using Configuration File**:

```bash
geode serve --config /etc/geode/config.yaml
```

---

## Environment Variables

### Core Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GEODE_DATA_DIR` | path | `./data` | Data directory path |
| `GEODE_LOG_LEVEL` | string | `info` | Log level (error, warn, info, debug, trace) |
| `LOG_LEVEL` | string | `info` | (Alternative) Log level for Docker compatibility |
| `GEODE_LOG_FORMAT` | string | `text` | Log format: `text` or `json` |
| `GEODE_LISTEN` | string | `0.0.0.0:3141` | QUIC listen address |
| `GEODE_TLS_CERT` | path | - | TLS certificate path |
| `GEODE_TLS_KEY` | path | - | TLS private key path |

### Performance Tuning

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GEODE_MAX_CONNECTIONS` | int | `10000` | Maximum concurrent connections |
| `GEODE_PAGE_CACHE_SIZE` | int | `1024` | Page cache size in MB |
| `GEODE_QUERY_TIMEOUT` | int | `300` | Query timeout in seconds |
| `GEODE_TRANSACTION_TIMEOUT` | int | `300` | Transaction timeout in seconds |

### Security & Encryption

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GEODE_ENABLE_TDE` | bool | `false` | Enable Transparent Data Encryption |
| `GEODE_DISK_KEY_HEX` | string | - | TDE encryption key (64 hex characters) |
| `GEODE_KMS_PROVIDER` | string | `env` | KMS provider: `env`, `vault`, `aws` |
| `VAULT_ADDR` | string | - | HashiCorp Vault address (if using Vault KMS) |
| `VAULT_TOKEN` | string | - | Vault authentication token |
| `AWS_KMS_KEY_ID` | string | - | AWS KMS key ID (if using AWS KMS) |

### Query Optimization

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GEODE_TRACE_OPTIMIZER` | bool | `false` | Enable optimizer trace logging |
| `GEODE_ORDER_KEYS_EXPR` | bool | `false` | Allow ORDER BY expressions (not just properties) |
| `GEODE_TELEMETRY_PAGING` | bool | `false` | Enable paging telemetry |

### Cloud Backup (S3)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | string | - | AWS/S3 access key ID |
| `AWS_SECRET_ACCESS_KEY` | string | - | AWS/S3 secret access key |
| `AWS_REGION` | string | `us-east-1` | AWS region |
| `S3_ENDPOINT` | string | - | Custom S3 endpoint (e.g., MinIO, DigitalOcean Spaces) |
| `S3_BUCKET` | string | - | S3 bucket name for backups |

### Change Data Capture (CDC)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GEODE_CDC_ENABLE` | bool | `false` | Enable CDC |
| `CDC_KAFKA_BROKERS` | string | - | Kafka broker addresses (comma-separated) |
| `CDC_WEBHOOK_ENDPOINT` | string | - | HTTP webhook endpoint for CDC events |
| `WEBHOOK_TOKEN` | string | - | Authorization token for webhook |

### QUIC Transport

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GEODE_QUIC_FORCE_CLOSE` | bool | `false` | Force immediate connection close |
| `GEODE_QUIC_PASSIVE_TEARDOWN` | bool | `false` | Use passive connection teardown |

### Development/Testing

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GEODE_CAPTURE_SERVER_STDERR` | bool | `false` | Capture server stderr (for testing) |
| `GEODE_INSECURE` | bool | `false` | Disable TLS verification (dev only!) |

---

## YAML Configuration File

### File Structure

```yaml
# geode.yaml - Complete configuration example
server:
  listen: '0.0.0.0:3141'
  data_dir: '/var/lib/geode/data'
  wal_dir: '/var/lib/geode/wal'
  max_connections: 10000

logging:
  level: 'info'               # error, warn, info, debug, trace
  format: 'json'              # text or json
  file: '/var/log/geode/server.log'

tls:
  cert: '/etc/geode/tls/server.crt'
  key: '/etc/geode/tls/server.key'
  auto_generate: false        # Auto-generate self-signed cert (dev only)

storage:
  page_size: 8192             # Bytes per page (default: 8KB)
  cache_size: '4GB'           # Page cache size (supports MB, GB suffixes)
  enable_tde: true            # Transparent Data Encryption
  disk_key_hex: '<64-hex-chars>'  # TDE encryption key

performance:
  query_timeout: 300          # Seconds
  transaction_timeout: 300    # Seconds
  page_cache_size: 4096       # MB

optimizer:
  trace: false                # Enable optimizer trace logging
  small_n_threshold: 100      # Threshold for small-N optimization

federation:
  enabled: true               # Enable distributed query federation
  coordinator: true           # This node is coordinator
  shards:
    - id: 'shard1'
      endpoint: 'node1.cluster:3141'
    - id: 'shard2'
      endpoint: 'node2.cluster:3141'
    - id: 'shard3'
      endpoint: 'node3.cluster:3141'

backup:
  s3:
    bucket: 'geode-backups'
    prefix: 'prod'
    region: 'us-east-1'
    endpoint: ''              # Custom endpoint (MinIO, DigitalOcean)
    retention_days: 30
    access_key_id: '${AWS_ACCESS_KEY_ID}'     # From environment
    secret_access_key: '${AWS_SECRET_ACCESS_KEY}'

cdc:
  enabled: false
  webhooks:
    - name: 'primary'
      endpoint: 'https://api.example.com/webhook'
      headers:
        Authorization: 'Bearer ${WEBHOOK_TOKEN}'
        X-Tenant-ID: 'tenant-123'
      retry:
        max_attempts: 5
        base_delay_ms: 100
        max_delay_ms: 30000
      dlq:
        enabled: true
        max_size: 10000
        retention_hours: 168
      idempotency:
        enabled: true
        header: 'X-Idempotency-Key'

# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS

# NOTE: `monitoring:` is not a configuration-file section — it is ignored.
# The Prometheus listener is opt-in and env-only:
#   GEODE_METRICS_PORT=9090   (serves /metrics and /health)
#   GEODE_METRICS_BIND=127.0.0.1
```

### Loading Configuration

```bash
# Load from file
geode serve --config /etc/geode/config.yaml

# Override with environment variables
GEODE_LOG_LEVEL=debug geode serve --config /etc/geode/config.yaml

# Override with command-line flags (highest precedence)
geode serve \
    --config /etc/geode/config.yaml \
    --max-connections 20000
```

---

## Configuration Examples

### Development Configuration

**File: `dev-config.yaml`**

```yaml
server:
  listen: '127.0.0.1:3141'
  data_dir: './dev-data'

logging:
  level: 'debug'
  format: 'text'

tls:
  auto_generate: true         # Auto-generate self-signed cert

storage:
  cache_size: '512MB'

performance:
  page_cache_size: 256

optimizer:
  trace: true                 # See optimizer decisions
```

**Start Command**:

```bash
geode serve --config dev-config.yaml
```

### Staging Configuration

**File: `/etc/geode/staging-config.yaml`**

```yaml
server:
  listen: '0.0.0.0:3141'
  data_dir: '/var/lib/geode/staging/data'
  max_connections: 5000

logging:
  level: 'info'
  format: 'json'
  file: '/var/log/geode/staging.log'

tls:
  cert: '/etc/geode/tls/staging.crt'
  key: '/etc/geode/tls/staging.key'

storage:
  cache_size: '2GB'
  enable_tde: true

performance:
  page_cache_size: 2048

backup:
  s3:
    bucket: 'geode-backups-staging'
    prefix: 'staging'
    retention_days: 7

# NOTE: `monitoring:` is not a configuration-file section — it is ignored.
# The Prometheus listener is opt-in and env-only:
#   GEODE_METRICS_PORT=9090   (serves /metrics and /health)
#   GEODE_METRICS_BIND=127.0.0.1
```

### Production Configuration

**File: `/etc/geode/prod-config.yaml`**

```yaml
server:
  listen: '0.0.0.0:3141'
  data_dir: '/var/lib/geode/data'
  wal_dir: '/var/lib/geode/wal'
  max_connections: 50000

logging:
  level: 'error'              # Production: errors only
  format: 'json'
  file: '/var/log/geode/server.log'

tls:
  cert: '/etc/letsencrypt/live/geode.example.com/fullchain.pem'
  key: '/etc/letsencrypt/live/geode.example.com/privkey.pem'

storage:
  cache_size: '8GB'
  enable_tde: true
  # GEODE_DISK_KEY_HEX from environment (managed by secrets manager)

performance:
  query_timeout: 300
  transaction_timeout: 300
  page_cache_size: 8192

federation:
  enabled: true
  coordinator: true
  shards:
    - id: 'shard1'
      endpoint: 'geode-node1.internal:3141'
    - id: 'shard2'
      endpoint: 'geode-node2.internal:3141'
    - id: 'shard3'
      endpoint: 'geode-node3.internal:3141'

backup:
  s3:
    bucket: 'geode-backups-prod'
    prefix: 'prod'
    region: 'us-east-1'
    retention_days: 90

cdc:
  enabled: true
  webhooks:
    - name: 'analytics'
      endpoint: 'https://analytics.example.com/webhook'
      headers:
        Authorization: 'Bearer ${WEBHOOK_TOKEN}'
      retry:
        max_attempts: 5
        base_delay_ms: 100
        max_delay_ms: 30000
      dlq:
        enabled: true
        max_size: 100000
        retention_hours: 168
      idempotency:
        enabled: true

# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS

# NOTE: `monitoring:` is not a configuration-file section — it is ignored.
# The Prometheus listener is opt-in and env-only:
#   GEODE_METRICS_PORT=9090   (serves /metrics and /health)
#   GEODE_METRICS_BIND=127.0.0.1
```

**Production Start (systemd)**:

```bash
# /etc/systemd/system/geode.service
[Unit]
Description=Geode Graph Database
After=network.target vault.service

[Service]
Type=simple
User=geode
Group=geode
WorkingDirectory=/var/lib/geode
Environment="GEODE_DISK_KEY_HEX=<from-vault>"
Environment="VAULT_TOKEN=<from-vault>"
Environment="AWS_ACCESS_KEY_ID=<from-secrets>"
Environment="AWS_SECRET_ACCESS_KEY=<from-secrets>"
ExecStart=/usr/local/bin/geode serve --config /etc/geode/prod-config.yaml
Restart=on-failure
RestartSec=10
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

### Docker Configuration

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  geode:
    image: geodedb/geode:latest
    ports:
      - "3141:3141/udp"       # QUIC
      - "9090:9090"           # Metrics
      - "8080:8080"           # Health
    volumes:
      - geode-data:/var/lib/geode/data
      - geode-wal:/var/lib/geode/wal
      - ./config.yaml:/etc/geode/config.yaml:ro
      - ./tls:/etc/geode/tls:ro
    environment:
      LOG_LEVEL: ${LOG_LEVEL:-error}
      GEODE_DISK_KEY_HEX: ${GEODE_DISK_KEY_HEX}
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      VAULT_TOKEN: ${VAULT_TOKEN}
    command: ["serve", "--config", "/etc/geode/config.yaml"]
    restart: unless-stopped
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

volumes:
  geode-data:
  geode-wal:
```

**Start with override**:

```bash
# Production (error logs only)
docker-compose up -d

# Debug mode
LOG_LEVEL=debug docker-compose up

# With secrets
GEODE_DISK_KEY_HEX=$(vault kv get -field=key geode/tde) \
VAULT_TOKEN=$(vault print token) \
AWS_ACCESS_KEY_ID=$(vault kv get -field=access_key aws/geode) \
AWS_SECRET_ACCESS_KEY=$(vault kv get -field=secret_key aws/geode) \
docker-compose up -d
```

---

## TLS Certificate Setup

### Development (Self-Signed)

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 \
    -keyout server.key \
    -out server.crt \
    -days 365 \
    -nodes \
    -subj "/CN=localhost"

# Start server
geode serve \
    --tls-cert server.crt \
    --tls-key server.key
```

### Production (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate (requires domain and port 80/443 access)
sudo certbot certonly --standalone \
    -d geode.example.com \
    --agree-tos \
    -m [email protected]

# Certificates will be in:
# /etc/letsencrypt/live/geode.example.com/fullchain.pem
# /etc/letsencrypt/live/geode.example.com/privkey.pem

# Start server
sudo geode serve \
    --tls-cert /etc/letsencrypt/live/geode.example.com/fullchain.pem \
    --tls-key /etc/letsencrypt/live/geode.example.com/privkey.pem

# Auto-renewal (add to crontab)
0 0 * * * certbot renew --quiet --post-hook "systemctl restart geode"
```

### Production (Custom CA)

```bash
# If using internal CA, provide full chain
cat server.crt intermediate.crt root.crt > fullchain.pem

# Start server
geode serve \
    --tls-cert fullchain.pem \
    --tls-key server.key
```

### Verify Certificate

```bash
# Check certificate details
openssl x509 -in server.crt -text -noout

# Verify certificate and key match
openssl x509 -noout -modulus -in server.crt | openssl md5
openssl rsa -noout -modulus -in server.key | openssl md5
# MD5 hashes should match

# Test TLS connection
openssl s_client -connect localhost:3141 -showcerts
```

---

## Performance Tuning

### Memory Configuration

```yaml
# For small deployments (<10GB data)
storage:
  cache_size: '1GB'

performance:
  page_cache_size: 1024

# For medium deployments (10-100GB data)
storage:
  cache_size: '4GB'

performance:
  page_cache_size: 4096

# For large deployments (>100GB data)
storage:
  cache_size: '16GB'

performance:
  page_cache_size: 16384
```

### Connection Tuning

```yaml
# Low-concurrency workload
server:
  max_connections: 100

# Medium-concurrency workload
server:
  max_connections: 1000

# High-concurrency workload
server:
  max_connections: 50000
```

**System Limits**:

```bash
# Increase file descriptor limit
ulimit -n 65536

# Or set in /etc/security/limits.conf
geode soft nofile 65536
geode hard nofile 65536
```

### Query Timeouts

```yaml
# Short-lived queries (OLTP)
performance:
  query_timeout: 30
  transaction_timeout: 60

# Mixed workload
performance:
  query_timeout: 300
  transaction_timeout: 300

# Analytics workload
performance:
  query_timeout: 3600
  transaction_timeout: 3600
```

---

## Log Configuration

### Log Levels

| Level | Use Case | Volume |
|-------|----------|--------|
| `error` | Production (default) | Minimal - errors only |
| `warn` | Production (with warnings) | Low - errors + warnings |
| `info` | Development/Staging | Medium - general info |
| `debug` | Troubleshooting | High - detailed debugging |
| `trace` | Deep troubleshooting | Very High - all events |

### Log Formats

**Text Format** (human-readable):

```
2026-01-23T10:30:45Z [INFO] Server started on 0.0.0.0:3141
2026-01-23T10:30:46Z [DEBUG] Accepted connection from 192.168.1.100:54321
2026-01-23T10:30:46Z [INFO] Query completed in 12ms
```

**JSON Format** (machine-parsable):

```json
{"timestamp":"2026-01-23T10:30:45Z","level":"INFO","message":"Server started on 0.0.0.0:3141"}
{"timestamp":"2026-01-23T10:30:46Z","level":"DEBUG","message":"Accepted connection from 192.168.1.100:54321"}
{"timestamp":"2026-01-23T10:30:46Z","level":"INFO","message":"Query completed in 12ms","duration_ms":12}
```

### Log Rotation

```bash
# Using logrotate
# /etc/logrotate.d/geode
/var/log/geode/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 geode geode
    sharedscripts
    postrotate
        systemctl reload geode >/dev/null 2>&1 || true
    endscript
}
```

---

## Security Configuration

### Encryption at Rest (TDE)

```yaml
storage:
  enable_tde: true
  # Provide key via environment (never hardcode!)
  # disk_key_hex: from GEODE_DISK_KEY_HEX environment variable
```

**Generate Encryption Key**:

```bash
# Generate random 256-bit key
openssl rand -hex 32 > /secure/location/tde-key.hex

# Set environment variable
export GEODE_DISK_KEY_HEX=$(cat /secure/location/tde-key.hex)

# Or use KMS
export GEODE_KMS_PROVIDER=vault
export VAULT_TOKEN=$(vault login -token-only)
```

### KMS Integration

**HashiCorp Vault**:

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

**AWS KMS**:

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

---

## Monitoring Configuration

### Prometheus Metrics

```yaml
# NOTE: `monitoring:` is not a configuration-file section — it is ignored.
# The Prometheus listener is opt-in and env-only:
#   GEODE_METRICS_PORT=9090   (serves /metrics and /health)
#   GEODE_METRICS_BIND=127.0.0.1
```

**Scrape Config** (`prometheus.yml`):

```yaml
scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['geode-server:9090']
    scrape_interval: 15s
```

### Health Checks

```yaml
# NOTE: `monitoring:` is not a configuration-file section — it is ignored.
# The Prometheus listener is opt-in and env-only:
#   GEODE_METRICS_PORT=9090   (serves /metrics and /health)
#   GEODE_METRICS_BIND=127.0.0.1
```

**Kubernetes Probes**:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## Troubleshooting Configuration

### Common Issues

**Issue: Server won't start with config file**

```bash
# Check config syntax
geode serve --config /etc/geode/config.yaml --validate

# Use debug logging to see what's failing
geode serve \
    --config /etc/geode/config.yaml \
    --log-level debug
```

**Issue: Environment variables not working**

```bash
# Verify environment is set
env | grep GEODE

# Test with explicit values
GEODE_LOG_LEVEL=debug geode serve
```

**Issue: TLS certificate errors**

```bash
# See TLS Certificate Setup section above
# Verify certificate paths in config
cat /etc/geode/config.yaml | grep -A 2 "tls:"

# Check file permissions
ls -la /etc/geode/tls/
```

---

## Next Steps

- [Deployment Guide](/docs/ops/deployment/) - Production deployment patterns
- [Security Overview](/docs/security/overview/) - Authentication and encryption
- [Monitoring](/docs/ops/observability/) - Metrics and observability
- [Troubleshooting](/docs/guides/troubleshooting/) - Diagnose configuration issues
- [Performance Tuning](/docs/query/performance-tuning/) - Optimize query performance
