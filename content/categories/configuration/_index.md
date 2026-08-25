---
title: "Category: Configuration"
description: "Comprehensive Configuration documentation for Geode graph database including guides, tutorials, and reference materials."
keywords:
  - Configuration
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/configuration/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Configuration management in Geode provides fine-grained control over database behavior, performance characteristics, security policies, and operational parameters. Proper configuration is essential for optimizing Geode for specific workloads, environments, and organizational requirements. Whether running a development instance on a laptop or managing a distributed production cluster, configuration determines how Geode utilizes resources, handles connections, manages transactions, and enforces security policies.

Geode supports multiple configuration methods including YAML files, environment variables, command-line flags, and runtime configuration changes via GQL. Configuration is organized into logical sections covering server behavior, storage engine parameters, networking, security, monitoring, and feature flags. All configuration options are documented with their default values, acceptable ranges, and performance implications.

This category explores Geode's configuration system comprehensively, providing examples for common scenarios, best practices for production deployments, and guidance for tuning performance. Understanding configuration enables teams to extract maximum value from Geode while maintaining stability, security, and operational excellence.

## Configuration File Structure

Geode uses YAML for its primary configuration file, typically named `geode.yaml` or `config.yaml`:

```yaml
# geode.yaml - Main configuration file

# Server configuration
server:
  listen: "0.0.0.0:3141"
  max_connections: 1000
  connection_timeout_seconds: 300
  tls:
    enabled: true
    cert_file: "/path/to/cert.pem"
    key_file: "/path/to/key.pem"
    ca_file: "/path/to/ca.pem"

# Storage configuration
storage:
  data_dir: "/var/lib/geode/data"
  wal_dir: "/var/lib/geode/wal"
  cache_size_mb: 4096
  page_size_bytes: 8192
  compression: "zstd"
  compression_level: 3

# Transaction configuration
transactions:
  isolation_level: "snapshot_isolation"
  lock_timeout_ms: 5000
  deadlock_detection_interval_ms: 1000
  max_transaction_age_seconds: 3600

# Query configuration
query:
  max_query_time_seconds: 300
  default_result_limit: 1000
  enable_query_cache: true
  query_cache_size_mb: 512

# Security configuration
security:
  authentication:
    enabled: true
    provider: "ldap"
    ldap_url: "ldap://ldap.example.com"
  authorization:
    enabled: true
    default_role: "reader"
  encryption:
    tde:
      enabled: true
      algorithm: "aes-256-gcm"
      key_rotation_days: 90
    fle:
      enabled: true

# Monitoring configuration
monitoring:
  metrics:
    enabled: true
    prometheus_port: 9090
    export_interval_seconds: 15
  logging:
    level: "info"
    format: "json"
    output: "/var/log/geode/geode.log"
    rotation:
      max_size_mb: 100
      max_files: 10

# Distributed configuration (if running in distributed mode)
distributed:
  enabled: false
  node_id: "node-1"
  cluster_peers:
    - "node-2:3141"
    - "node-3:3141"
  replication_factor: 3
  shard_count: 16
```

## Configuration Methods

### 1. Configuration File

The primary configuration method using YAML:

```bash
# Start with configuration file
geode serve --config /etc/geode/geode.yaml

# Validate configuration without starting
geode config validate --config geode.yaml

# Show effective configuration
geode config show
```

### 2. Environment Variables

Override configuration using environment variables (prefixed with `GEODE_`):

```bash
# Set listen address
export GEODE_SERVER_LISTEN="0.0.0.0:3141"

# Set data directory
export GEODE_STORAGE_DATA_DIR="/data/geode"

# Set log level
export GEODE_MONITORING_LOGGING_LEVEL="debug"

# Start server (environment variables override config file)
geode serve --config geode.yaml
```

Environment variables use underscores to represent nesting:

- `GEODE_SERVER_LISTEN` → `server.listen`
- `GEODE_STORAGE_CACHE_SIZE_MB` → `storage.cache_size_mb`
- `GEODE_TRANSACTIONS_ISOLATION_LEVEL` → `transactions.isolation_level`

### 3. Command-Line Flags

Override specific settings via command-line:

```bash
# Override listen address and data directory
geode serve \
  --listen 0.0.0.0:3141 \
  --data-dir /data/geode \
  --cache-size 8192 \
  --log-level debug
```

### 4. Runtime Configuration

Geode has no runtime configuration surface: there is no `system.*` procedure
namespace, no configuration-reload command, and no way to change a server
setting from GQL. Configuration is read at start-up from the config file and
the command line, so a change means restarting the server:

```bash
# Edit .geode/config.yaml (or the file named by --config), then:
systemctl restart geode

# ...or pass the setting directly
geode serve --data-dir /var/lib/geode --max-connections 500 --log-level debug
```

Per-session settings that *can* change at runtime are set with `SESSION SET`
(for example the current graph or time zone), not through a procedure.

## Configuration Precedence

Configuration sources are applied in this order (later overrides earlier):

1. Built-in defaults
2. Configuration file (`geode.yaml`)
3. Environment variables (`GEODE_*`)
4. Command-line flags (`--flag`)
5. Runtime configuration changes (via GQL)

## Server Configuration

### Network Settings

```yaml
server:
  # Listen address and port
  listen: "0.0.0.0:3141"

  # Alternative port (commonly 8443)
  # listen: "0.0.0.0:8443"

  # Maximum concurrent connections
  max_connections: 1000

  # Connection idle timeout
  connection_timeout_seconds: 300

  # QUIC configuration
  quic:
    max_streams_per_connection: 100
    max_idle_timeout_seconds: 600
    keep_alive_interval_seconds: 30

  # TLS configuration (required)
  tls:
    enabled: true
    cert_file: "/etc/geode/certs/server.crt"
    key_file: "/etc/geode/certs/server.key"
    ca_file: "/etc/geode/certs/ca.crt"
    min_version: "1.3"  # TLS 1.3 only
    cipher_suites:
      - "TLS_AES_256_GCM_SHA384"
      - "TLS_CHACHA20_POLY1305_SHA256"
```

### Resource Limits

```yaml
server:
  # Memory limits
  max_memory_mb: 16384  # Total memory limit

  # Worker threads
  worker_threads: 0  # 0 = auto-detect CPU count

  # Per-connection limits
  max_query_size_bytes: 1048576  # 1MB max query size
  max_result_batch_size: 10000   # Max rows per batch
```

## Storage Configuration

### Storage Engine Parameters

```yaml
storage:
  # Data directory
  data_dir: "/var/lib/geode/data"

  # WAL directory (can be separate for performance)
  wal_dir: "/var/lib/geode/wal"

  # Cache configuration
  cache_size_mb: 4096  # Buffer pool size
  cache_eviction_policy: "lru"  # lru, lfu, or adaptive

  # Page size (must match for existing databases)
  page_size_bytes: 8192  # 4096, 8192, or 16384

  # Compression
  compression: "zstd"  # none, lz4, zstd, or snappy
  compression_level: 3  # 1-22 for zstd

  # Background operations
  checkpoint_interval_seconds: 300
  auto_vacuum: true
  vacuum_schedule: "0 2 * * *"  # Daily at 2 AM

  # I/O settings
  sync_mode: "normal"  # normal, full, or none
  use_direct_io: false  # Bypass OS page cache
```

### WAL (Write-Ahead Log) Configuration

```yaml
storage:
  wal:
    # Sync mode: full, group_commit, or async
    sync_mode: "group_commit"

    # Group commit window (for group_commit mode)
    flush_interval_ms: 100

    # WAL segment size
    segment_size_mb: 64

    # WAL retention
    retention_mode: "size"  # size, time, or checkpoint
    retention_size_mb: 10240  # Keep 10GB of WAL
    retention_time_hours: 168  # 7 days

    # WAL compression
    compression: "zstd"
    compression_level: 1  # Lower for WAL (speed > ratio)
```

## Transaction Configuration

```yaml
transactions:
  # Isolation level: read_committed, snapshot_isolation, or serializable
  isolation_level: "snapshot_isolation"

  # Lock timeouts
  lock_timeout_ms: 5000
  deadlock_detection_interval_ms: 1000

  # Transaction limits
  max_transaction_age_seconds: 3600  # 1 hour max
  max_locks_per_transaction: 100000

  # MVCC configuration
  mvcc:
    vacuum_interval_seconds: 60
    snapshot_cleanup_threshold: 1000
    version_retention_seconds: 300  # 5 minutes
```

## Query Configuration

```yaml
query:
  # Query timeouts
  max_query_time_seconds: 300  # 5 minutes default
  statement_timeout_ms: 300000

  # Result limits
  default_result_limit: 1000
  max_result_limit: 1000000

  # Query cache
  enable_query_cache: true
  query_cache_size_mb: 512
  query_cache_ttl_seconds: 3600

  # Query planning
  planner_timeout_ms: 5000
  enable_query_rewrite: true
  cost_based_optimization: true

  # Parallelism
  max_parallel_workers: 4
  parallel_threshold_rows: 10000
```

## Security Configuration

### Authentication

```yaml
security:
  authentication:
    enabled: true

    # Provider: local, ldap, oauth2, or saml
    provider: "local"

    # Local authentication
    local:
      password_min_length: 12
      password_require_special: true
      password_expiry_days: 90
      max_login_attempts: 5
      lockout_duration_minutes: 30

    # LDAP authentication
    ldap:
      url: "ldap://ldap.example.com"
      bind_dn: "cn=admin,dc=example,dc=com"
      bind_password: "${LDAP_PASSWORD}"
      user_search_base: "ou=users,dc=example,dc=com"
      user_search_filter: "(uid={0})"
      group_search_base: "ou=groups,dc=example,dc=com"

    # OAuth2 authentication
    oauth2:
      provider_url: "https://auth.example.com"
      client_id: "${OAUTH_CLIENT_ID}"
      client_secret: "${OAUTH_CLIENT_SECRET}"
      scopes: ["openid", "profile", "email"]

  # Authorization
  authorization:
    enabled: true
    default_role: "reader"
    role_hierarchy_enabled: true
```

### Encryption

```yaml
security:
  encryption:
    # Transparent Data Encryption (TDE)
    tde:
      enabled: true
      algorithm: "aes-256-gcm"
      key_file: "/etc/geode/keys/tde-key.bin"
      key_rotation_days: 90

    # Field-Level Encryption (FLE)
    fle:
      enabled: true
      key_provider: "aws_kms"  # local, aws_kms, or azure_keyvault
      aws_kms:
        region: "us-west-2"
        key_id: "arn:aws:kms:..."
```

## Monitoring Configuration

### Metrics and Prometheus

```yaml
monitoring:
  metrics:
    enabled: true
    prometheus_port: 9090
    export_interval_seconds: 15

    # Metric categories to enable
    categories:
      - query
      - transaction
      - storage
      - network
      - security

    # Histogram buckets (seconds)
    query_duration_buckets: [0.001, 0.01, 0.1, 1.0, 10.0, 60.0]

  # Logging
  logging:
    level: "info"  # trace, debug, info, warn, error
    format: "json"  # json or text
    output: "/var/log/geode/geode.log"

    # Log rotation
    rotation:
      enabled: true
      max_size_mb: 100
      max_files: 10
      compress: true

    # Structured logging fields
    include_timestamp: true
    include_caller: false
    include_stacktrace_on_error: true
```

## Distributed Configuration

```yaml
distributed:
  enabled: true

  # Node identification
  node_id: "node-1"
  data_center: "us-west-2a"
  rack: "rack-1"

  # Cluster membership
  cluster_peers:
    - "node-2:3141"
    - "node-3:3141"
    - "node-4:3141"

  # Replication
  replication_factor: 3
  consistency_level: "quorum"  # one, quorum, or all

  # Sharding
  shard_count: 16
  rebalance_on_add: true

  # Failure detection
  heartbeat_interval_ms: 1000
  failure_detection_threshold: 10
```

## Performance Tuning Examples

### High-Throughput OLTP

Optimized for many concurrent short transactions:

```yaml
server:
  max_connections: 2000
  worker_threads: 16

storage:
  cache_size_mb: 8192
  wal:
    sync_mode: "group_commit"
    flush_interval_ms: 50

transactions:
  isolation_level: "read_committed"
  lock_timeout_ms: 1000

query:
  enable_query_cache: true
  query_cache_size_mb: 1024
```

### Analytical Workload

Optimized for complex, long-running queries:

```yaml
server:
  max_connections: 100
  worker_threads: 32

storage:
  cache_size_mb: 32768  # Large cache
  compression: "zstd"
  compression_level: 6

query:
  max_query_time_seconds: 3600  # 1 hour
  max_parallel_workers: 16
  parallel_threshold_rows: 1000

transactions:
  isolation_level: "snapshot_isolation"
```

### Development Environment

Optimized for fast startup and iteration:

```yaml
server:
  listen: "127.0.0.1:3141"
  max_connections: 10

storage:
  cache_size_mb: 256
  compression: "none"
  wal:
    sync_mode: "async"

monitoring:
  logging:
    level: "debug"
    format: "text"
```

## Best Practices

### Configuration Management

1. **Version control your configuration**: Keep `geode.yaml` in git
2. **Use environment variables for secrets**: Never commit passwords or keys
3. **Document changes**: Add comments explaining non-obvious settings
4. **Test configuration changes**: Validate before deploying to production
5. **Monitor after changes**: Watch metrics after configuration updates

### Security Hardening

```yaml
security:
  authentication:
    enabled: true
  authorization:
    enabled: true
  encryption:
    tde:
      enabled: true
    fle:
      enabled: true

server:
  tls:
    enabled: true
    min_version: "1.3"

monitoring:
  logging:
    level: "info"  # Avoid debug in production (leaks data)
```

### Resource Allocation

**Memory sizing**:

- Cache: 25-50% of available RAM
- Leave 25% for OS and other processes
- Monitor cache hit rate and adjust

**CPU allocation**:

- Worker threads: 1-2x CPU count for OLTP
- Worker threads: 2-4x CPU count for analytics
- Monitor CPU utilization and queue depth

## Further Reading

- [Server Configuration](/tags/configuration/) - Server setup details
- [Security Configuration](/categories/security/) - Security hardening
- [Performance Tuning](/categories/performance/) - Optimization guide
- [Distributed Mode](/tags/distributed/) - Cluster configuration
- [Monitoring Setup](/tags/monitoring/) - Metrics and logging
- [TLS Configuration](/tags/encryption/) - Certificate setup
