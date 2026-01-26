---
title: "Monitoring and Telemetry"
description: "Monitor Geode with health checks and Prometheus metrics, enable optional paging telemetry, and configure tamper-evident audit logging with tracing IDs"
weight: 20
tags:
  - monitoring
  - observability
  - prometheus
  - metrics
  - telemetry
  - audit-logging
categories:
  - deployment-and-devops
keywords:
  - prometheus metrics
  - health check
  - telemetry
  - audit logging
  - grafana
  - loki
---

<!-- CANARY: REQ=REQ-SERVER-STARTUP-INTEGRATION-001; FEATURE="Server Startup Integration Tests"; ASPECT=EndToEndServerTesting; STATUS=TESTED; OWNER=server; UPDATED=2025-10-05 -->

# Monitoring and Telemetry

Comprehensive observability for Geode: health checks, Prometheus metrics, optional telemetry, and audit logging.

## Health and Readiness Endpoints

From `USAGE.md`:

### Health Check

**Endpoint**: `GET /health`

**Purpose**: Verify server is running and responsive

```bash
curl -f http://localhost:8080/health || echo "Health check failed"
```

**Response** (healthy):

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T14:30:00Z",
  "version": "0.18.0"
}
```

**Response** (unhealthy):

```json
{
  "status": "unhealthy",
  "error": "database connection failed",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

**HTTP status codes**:
- `200 OK` - Healthy
- `503 Service Unavailable` - Unhealthy

### Readiness Check

**Endpoint**: `GET /ready`

**Purpose**: Verify server is ready to accept traffic (useful for Kubernetes liveness probes)

```bash
curl -f http://localhost:8080/ready
```

**Response** (ready):

```json
{
  "status": "ready",
  "timestamp": "2024-01-15T14:30:00Z",
  "connections": 42,
  "active_transactions": 3
}
```

**Response** (not ready):

```json
{
  "status": "not_ready",
  "reason": "initialization in progress",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

**Kubernetes liveness probe**:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
```

**Kubernetes readiness probe**:

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Prometheus Metrics

From `USAGE.md`:

### Metrics Endpoint

**Endpoint**: `GET /metrics`

**Format**: Prometheus text exposition format

```bash
curl http://localhost:8080/metrics
```

### Key Metrics

From `USAGE.md`, key metrics list:

#### Query Metrics

```
# HELP geode_queries_total Total number of queries executed
# TYPE geode_queries_total counter
geode_queries_total{graph="SocialNetwork",status="success"} 12345

# HELP geode_query_duration_seconds Query execution time
# TYPE geode_query_duration_seconds histogram
geode_query_duration_seconds_bucket{graph="SocialNetwork",le="0.001"} 100
geode_query_duration_seconds_bucket{graph="SocialNetwork",le="0.01"} 500
geode_query_duration_seconds_bucket{graph="SocialNetwork",le="0.1"} 1200
geode_query_duration_seconds_bucket{graph="SocialNetwork",le="1.0"} 1250
geode_query_duration_seconds_sum{graph="SocialNetwork"} 45.67
geode_query_duration_seconds_count{graph="SocialNetwork"} 1250

# HELP geode_query_errors_total Total number of query errors
# TYPE geode_query_errors_total counter
geode_query_errors_total{graph="SocialNetwork",error_type="syntax"} 12
geode_query_errors_total{graph="SocialNetwork",error_type="constraint_violation"} 5
```

#### Transaction Metrics

```
# HELP geode_transactions_active Currently active transactions
# TYPE geode_transactions_active gauge
geode_transactions_active 3

# HELP geode_transactions_committed Total committed transactions
# TYPE geode_transactions_committed counter
geode_transactions_committed 5678

# HELP geode_transactions_aborted Total aborted transactions
# TYPE geode_transactions_aborted counter
geode_transactions_aborted{reason="serialization_error"} 23
geode_transactions_aborted{reason="constraint_violation"} 15

# HELP geode_transaction_duration_seconds Transaction execution time
# TYPE geode_transaction_duration_seconds histogram
geode_transaction_duration_seconds_bucket{le="0.1"} 4500
geode_transaction_duration_seconds_bucket{le="1.0"} 5600
geode_transaction_duration_seconds_bucket{le="10.0"} 5670
```

#### Storage Metrics

```
# HELP geode_storage_pages_total Total number of data pages
# TYPE geode_storage_pages_total gauge
geode_storage_pages_total 1234567

# HELP geode_storage_cache_hits Cache hit count
# TYPE geode_storage_cache_hits counter
geode_storage_cache_hits 98765432

# HELP geode_storage_cache_misses Cache miss count
# TYPE geode_storage_cache_misses counter
geode_storage_cache_misses 1234567

# HELP geode_storage_cache_hit_ratio Cache hit ratio
# TYPE geode_storage_cache_hit_ratio gauge
geode_storage_cache_hit_ratio 0.987

# HELP geode_wal_writes_bytes Write-Ahead Log bytes written
# TYPE geode_wal_writes_bytes counter
geode_wal_writes_bytes 123456789012
```

#### Connection Metrics

```
# HELP geode_connections_active Currently active client connections
# TYPE geode_connections_active gauge
geode_connections_active 42

# HELP geode_connections_total Total connections since start
# TYPE geode_connections_total counter
geode_connections_total 12345
```

#### Index Metrics

```
# HELP geode_index_lookups_total Index lookup count
# TYPE geode_index_lookups_total counter
geode_index_lookups_total{index="person_age_idx",type="btree"} 45678

# HELP geode_index_size_bytes Index size in bytes
# TYPE geode_index_size_bytes gauge
geode_index_size_bytes{index="person_age_idx",type="btree"} 12345678
```

### Prometheus Configuration

**prometheus.yml**:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/metrics'
```

**Start Prometheus**:

```bash
prometheus --config.file=prometheus.yml
```

**Query examples**:

```promql
# Query rate (QPS)
rate(geode_queries_total[5m])

# 95th percentile query latency
histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))

# Cache hit ratio
geode_storage_cache_hit_ratio

# Transaction abort rate
rate(geode_transactions_aborted[5m])
```

## Optional Telemetry

From `TELEMETRY.md`:

**Paging telemetry** outputs detailed system events to stderr (JSONL format).

**Purpose**: Debugging, CI/testing, performance analysis

**Enable**:

```bash
# Enable paging telemetry
export GEODE_TELEMETRY_PAGING=1

./geode serve
```

**Output** (stderr, JSONL):

```json
{"event":"page_read","page_id":12345,"timestamp":"2024-01-15T14:30:00.123Z","duration_us":42}
{"event":"page_write","page_id":12346,"timestamp":"2024-01-15T14:30:00.456Z","duration_us":156}
{"event":"index_lookup","index":"person_age_idx","key":30,"timestamp":"2024-01-15T14:30:00.789Z","duration_us":23}
```

**CI/Testing toggles** (from `TELEMETRY.md`):

```bash
# Disable telemetry in tests (reduce noise)
export GEODE_TELEMETRY_PAGING=0

# Enable verbose telemetry for debugging
export GEODE_TELEMETRY_VERBOSE=1
```

**Note**: Paging telemetry has performance overhead (~5-10%). Use only for debugging/testing.

## Audit Logs and Tracing

From `AUDIT_LOGGING.md`:

### Audit Log Configuration

**Enable audit logging** (`geode.yaml`):

```yaml
security:
  audit:
    enabled: true
    log_path: "/var/log/geode/audit.jsonl"

    # Syslog/CEF forwarding
    syslog:
      enabled: true
      address: "syslog.example.com:514"
      format: "CEF"  # Common Event Format

    # Retention
    retention_days: 365
    max_size: "10GB"
```

### What's Logged

**Events logged**:
- ✅ Authentication (login, logout, failed attempts)
- ✅ Authorization decisions (policy evaluations)
- ✅ Schema changes (CREATE/ALTER/DROP)
- ✅ Administrative actions (user/role management)
- ✅ Query metadata (timestamp, user, graph, execution time)

**Events NOT logged** (privacy/security):
- ❌ Query text (avoid logging sensitive data)
- ❌ Query parameters
- ❌ Result sets

### Audit Log Entry Format

**Example** (JSONL):

```json
{
  "timestamp": "2024-01-15T14:30:00.123Z",
  "event_type": "query_executed",
  "user": "alice",
  "graph": "SocialNetwork",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "trace_id": "7c9e8d6f-5b4a-3c2d-1e0f-9a8b7c6d5e4f",
  "execution_time_ms": 23.5,
  "rows_returned": 150,
  "prev_log_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "signature": "3045022100..."
}
```

**Tamper-evident properties**:
- **Hash chain**: Each entry includes `prev_log_hash` (SHA-256 of previous entry)
- **Signatures**: Entries signed with server private key for non-repudiation
- **Tracing IDs**: `trace_id` correlates events across distributed systems

### Tracing IDs

**Purpose**: Correlate events across:
- Multiple queries in a transaction
- Distributed query execution (federated queries)
- CDC webhooks and downstream processing

**Example: Distributed trace**:

```json
// Client query
{"trace_id": "7c9e8d6f-5b4a-3c2d-1e0f-9a8b7c6d5e4f", "event": "query_started", ...}

// Federated execution on shard 1
{"trace_id": "7c9e8d6f-5b4a-3c2d-1e0f-9a8b7c6d5e4f", "event": "shard_query", "shard": 1, ...}

// Federated execution on shard 2
{"trace_id": "7c9e8d6f-5b4a-3c2d-1e0f-9a8b7c6d5e4f", "event": "shard_query", "shard": 2, ...}

// Result merge
{"trace_id": "7c9e8d6f-5b4a-3c2d-1e0f-9a8b7c6d5e4f", "event": "result_merged", ...}

// Query completed
{"trace_id": "7c9e8d6f-5b4a-3c2d-1e0f-9a8b7c6d5e4f", "event": "query_completed", ...}
```

### Audit Log Analysis

**Verify hash chain integrity**:

```bash
# Python script to verify audit log integrity
import json
import hashlib

prev_hash = None
with open('/var/log/geode/audit.jsonl') as f:
    for line_num, line in enumerate(f, 1):
        entry = json.loads(line)

        # Compute expected hash
        if prev_hash is not None:
            if entry['prev_log_hash'] != prev_hash:
                print(f"Hash chain broken at line {line_num}!")
                exit(1)

        # Update for next iteration
        prev_hash = hashlib.sha256(line.encode()).hexdigest()

print("Audit log integrity verified")
```

**Query audit logs**:

```bash
# Find all queries by user 'alice'
cat /var/log/geode/audit.jsonl | jq 'select(.user == "alice")'

# Find failed authentication attempts
cat /var/log/geode/audit.jsonl | jq 'select(.event_type == "auth_failed")'

# Find slow queries (>1 second)
cat /var/log/geode/audit.jsonl | jq 'select(.execution_time_ms > 1000)'
```

## Logging Configuration

From `DOCKER_LOG_LEVEL_CONFIG.md`:

### Log Levels

```bash
# Set log level (debug/info/warn/error)
export LOG_LEVEL=info

./geode serve
```

**Docker** (`docker-compose.yml`):

```yaml
services:
  geode:
    image: geodedb/geode:latest
    environment:
      LOG_LEVEL: info  # or debug, warn, error
```

**Defaults**:
- **Development**: `debug`
- **Production**: `info`

### Log Formats

**Text format** (human-readable):

```
2024-01-15T14:30:00.123Z INFO  [geode::server] Server started on 0.0.0.0:3141
2024-01-15T14:30:01.456Z DEBUG [geode::query] Executing query for user 'alice'
2024-01-15T14:30:01.789Z WARN  [geode::storage] Cache miss for page 12345
```

**JSON format** (machine-readable):

```json
{"timestamp":"2024-01-15T14:30:00.123Z","level":"INFO","module":"geode::server","message":"Server started on 0.0.0.0:3141"}
{"timestamp":"2024-01-15T14:30:01.456Z","level":"DEBUG","module":"geode::query","message":"Executing query for user 'alice'"}
```

**Configure** (`geode.yaml`):

```yaml
logging:
  level: 'info'
  format: 'json'  # or 'text'
```

## Grafana Dashboards

From `deployment/DEPLOYMENT.md`:

**Access Grafana**: `http://localhost:3000` (admin/admin)

### Import Geode Dashboard

1. **Download** dashboard JSON from `docs/deployment/grafana-dashboard.json`
2. **Import** in Grafana: Home → Dashboards → Import
3. **Configure** data source: Select Prometheus

### Dashboard Panels

**Query Performance**:
- Query rate (QPS)
- 50th/95th/99th percentile latency
- Error rate

**Transaction Metrics**:
- Active transactions
- Commit/abort rate
- Serialization error rate

**Storage**:
- Cache hit ratio
- Page read/write rate
- WAL write throughput

**Connections**:
- Active connections
- Connection rate

**Alerts**:
- High error rate (>1%)
- High latency (p95 >1s)
- Cache hit ratio low (<80%)
- Transaction abort rate high (>10%)

## Loki Log Aggregation

From `deployment/DEPLOYMENT.md`:

**Loki + Promtail** aggregate logs from all Geode instances.

**Promtail configuration** (`promtail-config.yaml`):

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

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
```

**Query logs in Grafana**:

```logql
# All logs from geode
{job="geode"}

# Error logs only
{job="geode"} |= "ERROR"

# Query execution logs
{job="geode"} |= "query_executed"

# Slow queries
{job="geode"} | json | execution_time_ms > 1000
```

## Next Steps

- **[Deployment Guide](/docs/ops/deployment)** - Production stack setup
- **[Security Guide](/docs/security/overview)** - Audit logging and integrity
- **[Performance and Scaling](/docs/architecture/performance-and-scaling)** - Performance metrics interpretation
- **[Telemetry Reference](/docs/reference/telemetry)** - Complete telemetry documentation
