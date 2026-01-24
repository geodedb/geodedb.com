---
title: "Advanced Telemetry and Monitoring Guide"
description: "Complete guide to Geode's telemetry system including custom metrics, Prometheus integration, Grafana dashboards, paging events, and advanced monitoring patterns."
summary: "Comprehensive telemetry guide covering streaming events, Prometheus metrics, Grafana dashboards, custom instrumentation, QUIC transport metrics, and operational monitoring."
slug: "telemetry-advanced"
url: "/docs/ops/telemetry-advanced/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 40
keywords: ["telemetry", "Prometheus", "Grafana", "metrics", "monitoring", "observability", "paging events", "QUIC metrics"]
tags: ["operations", "monitoring", "observability", "metrics"]
categories: ["Operations"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/ops/telemetry-advanced/"
    noindex: false
---

## Overview

Geode provides comprehensive telemetry capabilities for production observability, including streaming paging events, Prometheus metrics integration, QUIC transport metrics, and customizable monitoring dashboards.

**Version**: v0.16.0+ (includes QUIC+TLS metrics)

### What You'll Learn

- How to enable and configure streaming telemetry
- Prometheus metrics integration and scraping
- Grafana dashboard setup and customization
- QUIC transport metrics monitoring
- Custom metric instrumentation
- Alerting and incident response patterns

### Prerequisites

- Geode v0.16.0+ installed
- Basic understanding of metrics and monitoring
- Prometheus and Grafana (optional, for integration sections)

## Streaming Telemetry

### Paging Events

Geode can emit optional paging telemetry as JSON Lines on stderr. This feature is disabled by default to avoid noisy logs.

**Status**: Optional, single-node, development/ops aid

#### Environment Variables

**Core Toggles**:
```bash
# Enable pagination telemetry
export GEODE_TELEMETRY_PAGING=1

# Client-side: Capture server stderr for e2e tests
export GEODE_CAPTURE_SERVER_STDERR=1
```

**CI/Testing Variables**:
```bash
# Enable telemetry smoke test
export GEODE_CI_TELEMETRY_SMOKE=1

# Strict mode: Fail if telemetry missing
export GEODE_CI_TELEMETRY_STRICT=1

# Safety: Avoid vendor teardown crashes in short-lived tests
export GEODE_QUIC_PASSIVE_TEARDOWN=1
```

#### Event Shape

Each page emission produces a single JSON line on stderr:

```json
{
  "ts": "1758732000",
  "level": "INFO",
  "component": "server",
  "type": "TELEMETRY",
  "event": "PULL_PAGE",
  "page_size": "1000",
  "rows_emitted": "1000",
  "final": "false",
  "page": { "index": 0, "size": 1000 },
  "ordered": true,
  "order_keys": ["timestamp"],
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Field Descriptions**:
- `type`: Always `TELEMETRY` for these events
- `event`: Always `PULL_PAGE` for paging emissions
- `page_size`: Requested page size (stringified)
- `rows_emitted`: Actual rows in this page (stringified)
- `final`: `true` if last page, else `false`
- `ordered`: Whether result set is ordered
- `order_keys`: Keys used for ordering
- `request_id`: Unique identifier for the request

**Emission Location**: `src/server/main.zig` (guarded by `state.telemetry_paging`)

#### Usage Examples

**Server with Telemetry**:
```bash
# Start server with paging telemetry enabled
GEODE_TELEMETRY_PAGING=1 \
  geode serve \
  --listen 127.0.0.1:7567 \
  --log-json \
  --result-format json \
  2>server.log &

PID=$!

# Run queries
geode query "RETURN 1 AS x ORDER BY x LIMIT 1" --format json

# Check telemetry
kill $PID
cat server.log | grep '"event":"PULL_PAGE"'
```

**Client with Server Stderr Capture**:
```bash
GEODE_CAPTURE_SERVER_STDERR=1 \
  geode query "RETURN 1 AS x ORDER BY x LIMIT 1" --format json
```

**Helper Script**:
```bash
# Quick local validation
make build && bash scripts/telemetry-smoke.sh 1
```

The script:
- Builds `zig-out/bin/geode`
- Starts server with `GEODE_TELEMETRY_PAGING=1`
- Runs ordered+limited query
- Prints telemetry lines containing `"event":"PULL_PAGE"`
- Cleans up server process

### Testing Telemetry

**CANARY Integration**:
- Test: `TestCANARY_REQ_GQL_090_TelemetryPagingPull`
- Requirement: `REQ-GQL-090` - Streaming Telemetry, Paging Events
- Status: `TESTED`

**Smoke Tests**:
```bash
# Basic smoke test (non-fatal)
GEODE_TELEMETRY_PAGING=1 \
GEODE_CI_TELEMETRY_SMOKE=1 \
  zig test test_telemetry_smoke.zig

# Strict mode (fails if telemetry missing)
make quic-smoke-strict

# Convenience (non-fatal)
make quic-smoke
```

## QUIC Transport Metrics

**New in v0.16.0**: QUIC+TLS transport telemetry replaces TCP metrics.

### QUIC Metrics

**Handshake Metrics**:
```
geode_quic_handshake_duration_seconds{quantile="0.5"} 0.015
geode_quic_handshake_duration_seconds{quantile="0.95"} 0.045
geode_quic_handshake_duration_seconds{quantile="0.99"} 0.120
geode_quic_handshake_success_total{} 1234
geode_quic_handshake_failure_total{} 5
```

**Stream Multiplexing**:
```
geode_quic_active_streams{} 42
geode_quic_stream_create_total{} 5678
geode_quic_stream_close_total{} 5636
geode_quic_max_concurrent_streams{} 100
```

**Loss Recovery**:
```
geode_quic_packet_loss_rate{} 0.001
geode_quic_rtt_milliseconds{quantile="0.5"} 12.5
geode_quic_rtt_milliseconds{quantile="0.95"} 45.0
geode_quic_retransmit_total{} 23
geode_quic_congestion_events_total{} 3
```

**Data Transfer**:
```
geode_quic_bytes_sent_total{} 12345678
geode_quic_bytes_received_total{} 98765432
geode_quic_throughput_mbps{} 125.5
```

### TLS Metrics

```
geode_tls_version{version="1.3"} 1
geode_tls_cipher_suite{suite="TLS_AES_256_GCM_SHA384"} 1
geode_tls_handshake_duration_seconds{quantile="0.95"} 0.035
geode_tls_session_reuse_total{} 456
geode_tls_cert_verification_errors_total{} 0
```

## Prometheus Integration

### Server Configuration

Enable Prometheus metrics endpoint:

```yaml
# geode.yaml
monitoring:
  prometheus:
    enable: true
    port: 9090
    path: /metrics
    interval: 15s
```

**Command-Line**:
```bash
geode serve \
  --prometheus-enable \
  --prometheus-port 9090 \
  --prometheus-path /metrics
```

**Environment Variables**:
```bash
export GEODE_PROMETHEUS_ENABLE=1
export GEODE_PROMETHEUS_PORT=9090
export GEODE_PROMETHEUS_PATH=/metrics
```

### Prometheus Configuration

Add Geode as a scrape target in `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['localhost:9090']
        labels:
          instance: 'geode-primary'
          environment: 'production'

    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: '/metrics'

  - job_name: 'geode-federation'
    static_configs:
      - targets:
        - 'geode-shard-1:9090'
        - 'geode-shard-2:9090'
        - 'geode-shard-3:9090'
    scrape_interval: 30s
```

### Available Metrics

**Query Metrics**:
```
geode_queries_total{status="success"} 12345
geode_queries_total{status="error"} 23
geode_query_duration_seconds{quantile="0.5"} 0.015
geode_query_duration_seconds{quantile="0.95"} 0.250
geode_query_duration_seconds{quantile="0.99"} 1.500
geode_slow_queries_total{threshold="1s"} 45
```

**Connection Metrics**:
```
geode_active_connections{} 42
geode_connection_create_total{} 1234
geode_connection_close_total{} 1192
geode_connection_errors_total{} 5
geode_connection_pool_size{type="max"} 5000
geode_connection_pool_size{type="current"} 42
```

**Transaction Metrics**:
```
geode_transactions_active{} 8
geode_transactions_total{status="committed"} 5678
geode_transactions_total{status="rolled_back"} 12
geode_transaction_duration_seconds{quantile="0.95"} 2.5
geode_transaction_conflicts_total{} 3
geode_deadlocks_detected_total{} 1
```

**Storage Metrics**:
```
geode_storage_size_bytes{type="data"} 10737418240
geode_storage_size_bytes{type="wal"} 536870912
geode_storage_size_bytes{type="index"} 2147483648
geode_wal_sync_duration_seconds{quantile="0.95"} 0.005
geode_checkpoint_duration_seconds{quantile="0.95"} 5.0
geode_page_faults_total{} 1234
```

**Memory Metrics**:
```
geode_memory_used_bytes{} 4294967296
geode_memory_limit_bytes{} 17179869184
geode_memory_usage_percent{} 25.0
geode_buffer_pool_size_bytes{} 8589934592
geode_buffer_pool_hit_rate{} 0.98
```

**Index Metrics**:
```
geode_index_operations_total{type="insert"} 12345
geode_index_operations_total{type="delete"} 234
geode_index_operations_total{type="search"} 56789
geode_index_size_bytes{name="hnsw_embeddings"} 1073741824
geode_hnsw_search_duration_seconds{quantile="0.95"} 0.012
```

**Graph Metrics**:
```
geode_node_count{label="Person"} 1000000
geode_node_count{label="Product"} 50000
geode_relationship_count{type="KNOWS"} 5000000
geode_relationship_count{type="PURCHASED"} 250000
geode_graph_size_nodes_total{} 1050000
geode_graph_size_relationships_total{} 5250000
```

**Session Metrics**:
```
geode_active_sessions{} 42
geode_session_create_total{} 1234
geode_session_timeout_total{} 5
geode_avg_session_duration_seconds{} 180.5
geode_session_parameters_total{} 156
```

## Grafana Dashboards

### Installation

1. **Install Grafana**:
```bash
# Docker
docker run -d \
  --name=grafana \
  -p 3000:3000 \
  grafana/grafana

# Or use package manager
sudo apt-get install -y grafana
sudo systemctl start grafana-server
```

2. **Access Grafana**: http://localhost:3000 (default: admin/admin)

3. **Add Prometheus Data Source**:
   - Configuration → Data Sources → Add data source
   - Select Prometheus
   - URL: http://localhost:9091 (Prometheus server)
   - Save & Test

### Pre-Built Dashboards

Geode includes pre-built Grafana dashboards:

**Location**: `monitoring/grafana/dashboards/`

**Available Dashboards**:
1. `geode-overview.json` - System overview
2. `geode-queries.json` - Query performance
3. `geode-transactions.json` - Transaction monitoring
4. `geode-storage.json` - Storage and I/O
5. `geode-quic.json` - QUIC transport metrics (v0.16.0+)

**Import Dashboard**:
1. Dashboards → Import
2. Upload JSON file or paste JSON
3. Select Prometheus data source
4. Import

### Custom Dashboard Examples

#### System Overview Dashboard

**Key Panels**:

```json
{
  "dashboard": {
    "title": "Geode System Overview",
    "panels": [
      {
        "title": "Query Rate",
        "type": "graph",
        "targets": [{
          "expr": "rate(geode_queries_total[5m])",
          "legendFormat": "{{status}}"
        }]
      },
      {
        "title": "Active Connections",
        "type": "stat",
        "targets": [{
          "expr": "geode_active_connections"
        }]
      },
      {
        "title": "Memory Usage",
        "type": "gauge",
        "targets": [{
          "expr": "(geode_memory_used_bytes / geode_memory_limit_bytes) * 100"
        }]
      },
      {
        "title": "Query Duration (p95)",
        "type": "graph",
        "targets": [{
          "expr": "geode_query_duration_seconds{quantile=\"0.95\"}"
        }]
      }
    ]
  }
}
```

#### QUIC Transport Dashboard (v0.16.0+)

```json
{
  "panels": [
    {
      "title": "QUIC Handshake Duration",
      "targets": [{
        "expr": "geode_quic_handshake_duration_seconds"
      }]
    },
    {
      "title": "Active QUIC Streams",
      "targets": [{
        "expr": "geode_quic_active_streams"
      }]
    },
    {
      "title": "Packet Loss Rate",
      "targets": [{
        "expr": "geode_quic_packet_loss_rate"
      }]
    },
    {
      "title": "RTT Distribution",
      "targets": [{
        "expr": "geode_quic_rtt_milliseconds"
      }]
    }
  ]
}
```

### Dashboard Variables

Create dynamic dashboards with variables:

```json
{
  "templating": {
    "list": [
      {
        "name": "instance",
        "type": "query",
        "query": "label_values(geode_queries_total, instance)",
        "multi": true
      },
      {
        "name": "label",
        "type": "query",
        "query": "label_values(geode_node_count, label)"
      }
    ]
  }
}
```

Use in queries:
```promql
geode_node_count{instance=~"$instance", label="$label"}
```

## Custom Metrics

### Application-Level Metrics

Instrument your application code:

**Go Example**:
```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    userLoginCounter = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "app_user_logins_total",
            Help: "Total number of user logins",
        },
        []string{"status"},
    )

    queryLatency = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "app_query_duration_seconds",
            Help: "Query execution duration",
            Buckets: prometheus.DefBuckets,
        },
        []string{"query_type"},
    )
)

func handleLogin(username, password string) error {
    start := time.Now()
    defer func() {
        duration := time.Since(start).Seconds()
        queryLatency.WithLabelValues("user_auth").Observe(duration)
    }()

    err := authenticateUser(username, password)
    if err != nil {
        userLoginCounter.WithLabelValues("failure").Inc()
        return err
    }

    userLoginCounter.WithLabelValues("success").Inc()
    return nil
}
```

**Python Example**:
```python
from prometheus_client import Counter, Histogram

user_login_counter = Counter(
    'app_user_logins_total',
    'Total number of user logins',
    ['status']
)

query_latency = Histogram(
    'app_query_duration_seconds',
    'Query execution duration',
    ['query_type']
)

async def handle_login(username: str, password: str) -> bool:
    with query_latency.labels('user_auth').time():
        try:
            authenticated = await authenticate_user(username, password)
            if authenticated:
                user_login_counter.labels('success').inc()
                return True
            else:
                user_login_counter.labels('failure').inc()
                return False
        except Exception as e:
            user_login_counter.labels('error').inc()
            raise
```

### Business Metrics

Track domain-specific metrics:

```promql
# Fraud detection rate
sum(rate(fraud_detected_total[5m])) / sum(rate(transactions_total[5m]))

# Recommendation click-through rate
sum(rate(recommendation_clicks_total[5m])) / sum(rate(recommendations_shown_total[5m]))

# Knowledge graph coverage
geode_node_count{label="Entity"} / geode_target_entities
```

## Alerting

### Prometheus Alerting Rules

Create `alerts.yml`:

```yaml
groups:
  - name: geode
    interval: 30s
    rules:
      - alert: GeodeDown
        expr: up{job="geode"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Geode instance is down"
          description: "Geode instance {{ $labels.instance }} has been down for more than 5 minutes."

      - alert: HighQueryLatency
        expr: geode_query_duration_seconds{quantile="0.95"} > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High query latency detected"
          description: "P95 query latency is {{ $value }}s on {{ $labels.instance }}"

      - alert: HighMemoryUsage
        expr: (geode_memory_used_bytes / geode_memory_limit_bytes) * 100 > 90
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}% on {{ $labels.instance }}"

      - alert: HighConnectionCount
        expr: geode_active_connections > geode_max_connections * 0.9
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High connection count"
          description: "{{ $value }} active connections on {{ $labels.instance }}"

      - alert: TransactionDeadlock
        expr: rate(geode_deadlocks_detected_total[5m]) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Transaction deadlocks detected"
          description: "{{ $value }} deadlocks/sec on {{ $labels.instance }}"

      - alert: SlowQueries
        expr: rate(geode_slow_queries_total[5m]) > 10
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "High rate of slow queries"
          description: "{{ $value }} slow queries/sec on {{ $labels.instance }}"
```

### Alertmanager Configuration

Configure alert routing in `alertmanager.yml`:

```yaml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@example.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

  routes:
    - match:
        severity: critical
      receiver: critical
      repeat_interval: 5m

    - match:
        severity: warning
      receiver: warnings

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:5001/webhook'
        send_resolved: true

  - name: 'critical'
    email_configs:
      - to: 'oncall@example.com'
        subject: '🚨 Critical Alert: {{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        title: 'Geode Critical Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

  - name: 'warnings'
    email_configs:
      - to: 'team@example.com'
```

## Advanced Monitoring Patterns

### SLI/SLO Monitoring

Track Service Level Indicators and Objectives:

```promql
# Availability SLI (target: 99.9%)
(sum(rate(geode_queries_total{status="success"}[30d])) /
 sum(rate(geode_queries_total[30d]))) * 100

# Latency SLI (target: p95 < 100ms)
geode_query_duration_seconds{quantile="0.95"} < 0.1

# Error budget remaining (1 - availability target)
1 - ((sum(rate(geode_queries_total{status="success"}[30d])) /
      sum(rate(geode_queries_total[30d]))))
```

**Grafana SLO Dashboard**:
```json
{
  "panels": [
    {
      "title": "Availability (30d rolling)",
      "targets": [{
        "expr": "(sum(rate(geode_queries_total{status=\"success\"}[30d])) / sum(rate(geode_queries_total[30d]))) * 100"
      }],
      "thresholds": [
        { "value": 99.9, "color": "green" },
        { "value": 99.0, "color": "yellow" },
        { "value": 0, "color": "red" }
      ]
    }
  ]
}
```

### Capacity Planning

Monitor resource trends:

```promql
# Predict storage exhaustion (linear regression)
predict_linear(geode_storage_size_bytes{type="data"}[7d], 30 * 24 * 3600)

# Connection pool utilization trend
avg_over_time(geode_active_connections[7d]) / geode_connection_pool_size{type="max"}

# Memory growth rate
deriv(geode_memory_used_bytes[1h])
```

### Anomaly Detection

Use recording rules for anomaly detection:

```yaml
groups:
  - name: anomaly_detection
    interval: 1m
    rules:
      - record: query_latency_baseline
        expr: avg_over_time(geode_query_duration_seconds{quantile="0.95"}[7d])

      - alert: LatencyAnomaly
        expr: geode_query_duration_seconds{quantile="0.95"} > query_latency_baseline * 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Query latency anomaly detected"
```

## Troubleshooting

### Missing Metrics

**Symptom**: Prometheus shows no targets or metrics unavailable

**Solutions**:
1. Verify server is running with metrics enabled:
   ```bash
   curl http://localhost:9090/metrics
   ```

2. Check Prometheus configuration:
   ```bash
   promtool check config prometheus.yml
   ```

3. Verify firewall allows port 9090

4. Check Prometheus logs:
   ```bash
   journalctl -u prometheus -f
   ```

### High Cardinality Metrics

**Symptom**: Prometheus consuming excessive memory

**Solutions**:
1. Limit label cardinality:
   ```yaml
   # ❌ Bad: Unique label per user
   geode_user_queries_total{user_id="12345"}

   # ✅ Good: Aggregated labels
   geode_user_queries_total{user_type="premium"}
   ```

2. Use recording rules to pre-aggregate:
   ```yaml
   - record: query_rate_by_type
     expr: sum(rate(geode_queries_total[5m])) by (type)
   ```

3. Adjust Prometheus retention:
   ```bash
   prometheus --storage.tsdb.retention.time=15d
   ```

### Telemetry Performance Impact

**Symptom**: Telemetry causing performance degradation

**Solutions**:
1. Disable paging telemetry in production:
   ```bash
   unset GEODE_TELEMETRY_PAGING
   ```

2. Reduce Prometheus scrape interval:
   ```yaml
   scrape_interval: 60s  # Instead of 15s
   ```

3. Use sampling for high-frequency events

## Next Steps

**Explore More**:
- [Observability Guide](/docs/ops/observability/) - Logging and tracing
- [Deployment](/docs/ops/deployment/) - Production deployment
- [Performance Tuning](/docs/query/performance-tuning/) - Query optimization

**Related Topics**:
- [Alerting Best Practices](/docs/ops/observability/#alerting) - Alert design
- [Backup and Recovery](/docs/guides/backup-automation/) - Data protection
- [Security Monitoring](/docs/security/overview/#audit-logging) - Security events

**Tools**:
- [Prometheus](https://prometheus.io/) - Metrics collection
- [Grafana](https://grafana.com/) - Visualization
- [Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/) - Alert routing

---

**Version**: v0.16.0+ (QUIC+TLS metrics)
**Telemetry**: Optional streaming events (stderr JSON Lines)
**Prometheus**: Full integration with 50+ metrics
**Status**: Production-ready
