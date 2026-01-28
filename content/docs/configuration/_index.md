---
title: "Configuration Reference"
description: "Complete configuration reference for Geode server and client settings"
weight: 35

keywords:
  - Geode configuration
  - server configuration
  - graph database settings
  - config files
  - deployment config
---

<!-- CANARY: REQ=REQ-SERVER-REFACTOR-015; FEATURE="ServerRefactoring"; ASPECT=ConfigManagement; STATUS=TESTED; OWNER=server; UPDATED=2026-01-15 -->

# Configuration Reference

This comprehensive guide covers all configuration options for the Geode graph database server and client.

> **See also**: [Server Configuration Reference](/docs/configuration/server-configuration/) - Complete reference with deployment scenarios, TLS setup, and production configuration examples.

## Configuration Methods

Geode supports three configuration methods (in order of precedence):

1. **Command-line flags** - Highest priority
2. **Environment variables** - Medium priority
3. **Configuration file** (YAML/JSON) - Lowest priority

## Configuration File

### File Locations

Geode searches for configuration files in the following order:

1. Path specified by `--config` flag
2. `./geode.yaml`
3. `./geode.json`
4. `/etc/geode/geode.yaml`
5. `/etc/geode/geode.json`
6. `~/.config/geode/geode.yaml`

### Basic Configuration

```yaml
# geode.yaml
server:
  listen: '0.0.0.0:3141'
  data_dir: '/var/lib/geode'
  max_connections: 10000
  connection_timeout: '30s'
  idle_timeout: '5m'

tls:
  cert: '/etc/geode/cert.pem'
  key: '/etc/geode/key.pem'
  auto_generate: false

storage:
  page_size: 8192
  page_cache_size: '1GB'
  wal_dir: '/var/lib/geode/wal'
  wal_sync_interval: '100ms'
  wal_buffer_size: '16MB'

logging:
  level: 'info'
  format: 'json'
  file: '/var/log/geode/geode.log'

security:
  enable_tde: true
  enable_audit: true
  audit_dir: '/var/log/geode/audit'
```

## Server Configuration

### Network Settings

#### Listen Address

```yaml
server:
  listen: '0.0.0.0:3141'
```

Command line:
```bash
geode serve --listen 0.0.0.0:3141
```

Environment variable:
```bash
export GEODE_LISTEN='0.0.0.0:3141'
```

**Format**: `host:port`
- `0.0.0.0` - Listen on all interfaces
- `127.0.0.1` - Listen on localhost only
- Port `3141` - Default QUIC port

#### Connection Limits

```yaml
server:
  max_connections: 10000
  connection_timeout: '30s'
  idle_timeout: '5m'
```

**Parameters**:
- `max_connections` - Maximum concurrent connections (default: 10000)
- `connection_timeout` - Timeout for establishing connection (default: 30s)
- `idle_timeout` - Timeout for idle connections (default: 5m)

### Data Directory

```yaml
server:
  data_dir: '/var/lib/geode'
```

Command line:
```bash
geode serve --data-dir /var/lib/geode
```

Environment variable:
```bash
export GEODE_DATA_DIR='/var/lib/geode'
```

**Requirements**:
- Must be writable by Geode process
- Should be on fast storage (SSD recommended)
- Adequate space for database growth

## TLS Configuration

### Certificate Settings

```yaml
tls:
  cert: '/etc/geode/cert.pem'
  key: '/etc/geode/key.pem'
  auto_generate: false
  ca_cert: '/etc/geode/ca.pem'
  verify_client: false
```

Command line:
```bash
geode serve --tls-cert /etc/geode/cert.pem --tls-key /etc/geode/key.pem
```

**Parameters**:
- `cert` - Path to TLS certificate
- `key` - Path to TLS private key
- `auto_generate` - Generate self-signed cert if none provided (development only)
- `ca_cert` - CA certificate for client verification (mTLS)
- `verify_client` - Require client certificates (mTLS)

### Auto-Generation (Development Only)

```yaml
tls:
  auto_generate: true
```

**Warning**: Only use auto-generated certificates for development. Production systems must use proper certificates.

## Storage Configuration

### Page Management

```yaml
storage:
  page_size: 8192
  page_cache_size: '1GB'
```

Environment variables:
```bash
export GEODE_PAGE_SIZE=8192
export GEODE_PAGE_CACHE_SIZE=1073741824  # 1GB in bytes
```

**Parameters**:
- `page_size` - Page size in bytes (default: 8192, must be power of 2)
- `page_cache_size` - Page cache size (default: 1GB)
  - Formats: `1GB`, `512MB`, `2048KB`, bytes as integer

**Recommendations**:
- Read-heavy workload: 50-75% of RAM
- Write-heavy workload: 25-40% of RAM
- Mixed workload: 40-50% of RAM

### Write-Ahead Log (WAL)

```yaml
storage:
  wal_dir: '/var/lib/geode/wal'
  wal_sync_interval: '100ms'
  wal_buffer_size: '16MB'
  wal_compression: true
```

**Parameters**:
- `wal_dir` - WAL directory (default: `<data_dir>/wal`)
- `wal_sync_interval` - Sync frequency (default: 100ms)
  - Lower = more durable, higher latency
  - Higher = less durable, lower latency
- `wal_buffer_size` - WAL buffer size (default: 16MB)
- `wal_compression` - Enable WAL compression (default: true)

**Best Practices**:
- Place WAL on separate fast SSD
- Increase buffer size for write-heavy workloads
- Adjust sync interval based on durability requirements

## Query Optimization

### Cost-Based Optimizer

```yaml
optimizer:
  enabled: true
  small_n_threshold: 100
  trace: false
  cost_model:
    seq_scan_cost: 1.0
    index_scan_cost: 0.1
    join_cost: 2.0
    aggregation_cost: 1.5
```

Environment variable:
```bash
export GEODE_TRACE_OPTIMIZER=1
```

**Parameters**:
- `enabled` - Enable cost-based optimizer (default: true)
- `small_n_threshold` - Use brute-force below this size (default: 100)
- `trace` - Enable optimizer tracing for debugging (default: false)
- `cost_model` - Cost factors for different operations

### Statistics Collection

```yaml
optimizer:
  statistics:
    auto_update: true
    update_interval: '1h'
    sample_size: 10000
```

**Parameters**:
- `auto_update` - Automatically update statistics (default: true)
- `update_interval` - How often to update (default: 1h)
- `sample_size` - Sample size for statistics (default: 10000)

## Logging Configuration

### Log Levels and Format

```yaml
logging:
  level: 'info'
  format: 'json'
  file: '/var/log/geode/geode.log'
  max_size: '100MB'
  max_backups: 10
  compress: true
```

Environment variables:
```bash
export GEODE_LOG_LEVEL=info
export GEODE_LOG_FORMAT=json
```

**Log Levels**:
- `debug` - Verbose debugging information
- `info` - General informational messages
- `warn` - Warning messages
- `error` - Error messages only

**Log Formats**:
- `json` - Structured JSON logs (recommended for production)
- `text` - Human-readable text logs (better for development)

### Component-Specific Logging

```yaml
logging:
  components:
    storage: 'debug'
    query: 'info'
    security: 'warn'
    network: 'info'
```

## Security Configuration

### Transparent Data Encryption (TDE)

```yaml
security:
  enable_tde: true
  tde:
    key_provider: 'env'  # or 'vault', 'file'
    key_id: 'primary'
```

Environment variable:
```bash
export GEODE_DISK_KEY_HEX='0123456789abcdef...'  # 64 hex chars
```

**Key Providers**:
- `env` - Read key from environment variable
- `vault` - Retrieve from HashiCorp Vault
- `file` - Read from encrypted file

### Audit Logging

```yaml
security:
  enable_audit: true
  audit:
    dir: '/var/log/geode/audit'
    format: 'json'
    include_queries: true
    include_connections: true
    include_auth: true
    rotation:
      max_size: '100MB'
      max_age: '30d'
```

**Parameters**:
- `include_queries` - Log all queries (default: true)
- `include_connections` - Log connection events (default: true)
- `include_auth` - Log authentication attempts (default: true)

### Authentication

```yaml
security:
  auth:
    enabled: true
    methods:
      - password
      - certificate
    password:
      min_length: 12
      require_uppercase: true
      require_lowercase: true
      require_numbers: true
      require_special: true
    mfa:
      enabled: false
      methods:
        - totp
```

## Federation Configuration

### Multi-Shard Setup

```yaml
federation:
  enabled: true
  coordinator: true
  shards:
    - id: 'shard1'
      endpoint: 'node1.cluster:3141'
      weight: 1.0
    - id: 'shard2'
      endpoint: 'node2.cluster:3141'
      weight: 1.0
    - id: 'shard3'
      endpoint: 'node3.cluster:3141'
      weight: 1.0
```

**Parameters**:
- `enabled` - Enable federation (default: false)
- `coordinator` - Act as coordinator node (default: false)
- `shards` - List of shard configurations
  - `id` - Unique shard identifier
  - `endpoint` - Shard network address
  - `weight` - Load balancing weight (default: 1.0)

### Query Coordination

```yaml
federation:
  query:
    timeout: '30s'
    max_concurrent: 100
    retry_attempts: 3
    retry_delay: '1s'
```

## Backup Configuration

### S3 Cloud Backup

```yaml
backup:
  s3:
    enabled: true
    bucket: 'geode-backups'
    prefix: 'prod'
    region: 'us-east-1'
    endpoint: 'https://nyc3.digitaloceanspaces.com'
    access_key_id: '${AWS_ACCESS_KEY_ID}'
    secret_access_key: '${AWS_SECRET_ACCESS_KEY}'
    compression: true
    encryption: true
    retention_days: 30
```

Environment variables:
```bash
export AWS_ACCESS_KEY_ID='your-key'
export AWS_SECRET_ACCESS_KEY='your-secret'
export AWS_REGION='us-east-1'
```

### Backup Schedule

```yaml
backup:
  schedule:
    enabled: true
    full_backup: '0 2 * * 0'  # Weekly on Sunday at 2 AM
    incremental_backup: '0 2 * * 1-6'  # Daily except Sunday
```

**Format**: Cron expression

## Monitoring Configuration

### Metrics

```yaml
monitoring:
  enabled: true
  endpoint: 'http://localhost:9090/metrics'
  interval: '10s'
  prometheus:
    enabled: true
    port: 9090
```

**Exposed Metrics**:
- Query performance (duration, count, errors)
- Storage metrics (pages, cache hits, WAL segments)
- Connection metrics (active, idle, total)
- Index metrics (size, lookups, hits)

### Health Checks

```yaml
monitoring:
  health:
    enabled: true
    port: 8080
    endpoints:
      - /health
      - /ready
      - /live
```

## Advanced Features

### CDC (Change Data Capture)

```yaml
cdc:
  enabled: true
  webhook:
    endpoint: 'https://api.example.com/webhook'
    headers:
      Authorization: 'Bearer ${WEBHOOK_TOKEN}'
    retry:
      max_attempts: 5
      base_delay_ms: 100
      max_delay_ms: 30000
    dlq:
      enabled: true
      max_size: 10000
```

### GPU Acceleration

```yaml
gpu:
  enabled: false
  backend: 'vulkan'  # or 'cuda'
  device_id: 0
  memory_limit: '2GB'
```

### Real-Time Analytics

```yaml
analytics:
  enabled: true
  stream:
    buffer_size: 10000
    flush_interval: '1s'
  ml:
    enabled: true
    models_dir: '/var/lib/geode/models'
```

## Multi-Tenancy

```yaml
multitenancy:
  enabled: false
  default_tenant: 'default'
  isolation_level: 'strict'  # or 'shared'
```

## Example Configurations

### Development

```yaml
server:
  listen: '127.0.0.1:3141'
  data_dir: './data'

tls:
  auto_generate: true

storage:
  page_cache_size: '512MB'

logging:
  level: 'debug'
  format: 'text'

security:
  enable_tde: false
  enable_audit: false
```

### Production

```yaml
server:
  listen: '0.0.0.0:3141'
  data_dir: '/var/lib/geode'
  max_connections: 10000

tls:
  cert: '/etc/geode/certs/server.crt'
  key: '/etc/geode/certs/server.key'

storage:
  page_cache_size: '8GB'
  wal_dir: '/fast-ssd/geode/wal'
  wal_sync_interval: '100ms'

logging:
  level: 'info'
  format: 'json'
  file: '/var/log/geode/geode.log'

security:
  enable_tde: true
  enable_audit: true

monitoring:
  enabled: true
  prometheus:
    enabled: true
    port: 9090

backup:
  s3:
    enabled: true
    bucket: 'geode-production-backups'
    retention_days: 90
```

### High-Performance

```yaml
server:
  listen: '0.0.0.0:3141'
  max_connections: 20000

storage:
  page_size: 16384
  page_cache_size: '32GB'
  wal_buffer_size: '64MB'

optimizer:
  enabled: true
  small_n_threshold: 1000

gpu:
  enabled: true
  backend: 'vulkan'
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `GEODE_LISTEN` | Server listen address | `0.0.0.0:3141` |
| `GEODE_DATA_DIR` | Data directory | `./data` |
| `GEODE_LOG_LEVEL` | Log level | `info` |
| `GEODE_LOG_FORMAT` | Log format (json/text) | `json` |
| `GEODE_PAGE_CACHE_SIZE` | Page cache size (bytes) | `1073741824` |
| `GEODE_DISK_KEY_HEX` | TDE encryption key | |
| `GEODE_TRACE_OPTIMIZER` | Enable optimizer tracing | `0` |
| `AWS_ACCESS_KEY_ID` | S3 access key | |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key | |
| `AWS_REGION` | S3 region | `us-east-1` |

## Validation

### Check Configuration

```bash
# Validate configuration file
geode config validate --config geode.yaml

# Show effective configuration
geode config show

# Test with dry-run
geode serve --dry-run --config geode.yaml
```

## Next Steps

- [Performance Tuning](../performance/) - Optimize for your workload
- [Security Guide](/docs/security/overview/) - Secure your deployment
- [Observability](/docs/ops/observability/) - Set up monitoring and alerts
- [Backup and Recovery](/docs/guides/backup-automation/) - Implement backup strategy
