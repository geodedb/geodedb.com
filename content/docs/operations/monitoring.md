---
title: "Monitoring"
description: "Set up comprehensive monitoring for Geode including Prometheus metrics, Grafana dashboards, alerting, and log aggregation"
url: /docs/operations/monitoring/
weight: 20
tags:
  - operations
  - monitoring
  - prometheus
  - grafana
  - alerting
  - observability
categories:
  - operations
keywords:
  - monitoring
  - Prometheus
  - Grafana
  - metrics
  - alerting
  - dashboards
  - observability
  - logging
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Monitoring

This guide covers setting up comprehensive monitoring for Geode, including Prometheus metrics collection, Grafana dashboards, alerting, and log aggregation.

## Overview

Geode provides extensive observability capabilities:

| Component | Purpose | Endpoint |
|-----------|---------|----------|
| Metrics | Prometheus-format metrics | `:8080/metrics` |
| Health | Health check endpoint | `:8080/health` |
| Ready | Readiness probe | `:8080/ready` |
| Live | Liveness probe | `:8080/live` |
| Logs | Structured JSON logs | stdout/file |

**Golden Signals** to monitor:

- **Latency**: Request duration (p50, p95, p99)
- **Traffic**: Requests per second
- **Errors**: Error rate and types
- **Saturation**: Resource utilization

## Prometheus Integration

### Enabling Metrics

```yaml
# geode.yaml
# NOTE: `monitoring:` is not a configuration-file section — it is ignored.
# The Prometheus listener is opt-in and env-only:
#   GEODE_METRICS_PORT=9090   (serves /metrics and /health)
#   GEODE_METRICS_BIND=127.0.0.1
```

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['geode-server:8080']
    metrics_path: /metrics
    scheme: http

    # Optional: authentication
    basic_auth:
      username: prometheus
      password_file: /etc/prometheus/password

    # Optional: TLS
    tls_config:
      ca_file: /etc/prometheus/ca.pem
```

### Key Metrics

**Query Performance**:

```promql
# Query latency (p50, p95, p99)
histogram_quantile(0.50, rate(geode_query_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(geode_query_duration_seconds_bucket[5m]))

# Queries per second
rate(geode_query_total[5m])

# Query error rate
rate(geode_query_total{status="error"}[5m]) /
rate(geode_query_total[5m])
```

**Connection Metrics**:

```promql
# Active connections
geode_connections_active

# Connection rate
rate(geode_connections_total[5m])

# Connection errors
rate(geode_connection_errors_total[5m])
```

**Storage Metrics**:

```promql
# Page cache hit ratio
geode_storage_cache_hits_total /
(geode_storage_cache_hits_total + geode_storage_cache_misses_total)

# WAL write rate
rate(geode_storage_wal_bytes_written_total[5m])

# Disk usage
geode_storage_disk_usage_bytes
```

**Resource Utilization**:

```promql
# Memory usage
geode_process_memory_bytes

# CPU usage
rate(geode_process_cpu_seconds_total[5m])

# Goroutines (if Go-based metrics enabled)
geode_runtime_goroutines
```

### Complete Metrics Reference

| Metric | Type | Description |
|--------|------|-------------|
| `geode_query_duration_seconds` | histogram | Query execution time |
| `geode_query_total` | counter | Total queries by status |
| `geode_query_rows_returned` | histogram | Rows returned per query |
| `geode_connections_active` | gauge | Current active connections |
| `geode_connections_total` | counter | Total connections |
| `geode_connection_errors_total` | counter | Connection errors |
| `geode_storage_cache_hits_total` | counter | Page cache hits |
| `geode_storage_cache_misses_total` | counter | Page cache misses |
| `geode_storage_wal_bytes_written_total` | counter | WAL bytes written |
| `geode_storage_disk_usage_bytes` | gauge | Disk space used |
| `geode_index_lookups_total` | counter | Index lookups by type |
| `geode_index_size_bytes` | gauge | Index size |
| `geode_auth_attempts_total` | counter | Auth attempts by result |
| `geode_backup_last_success_timestamp` | gauge | Last backup time |

## Grafana Dashboards

### Dashboard Configuration

Create a comprehensive Geode dashboard:

```json
{
  "dashboard": {
    "title": "Geode Overview",
    "tags": ["geode", "database"],
    "panels": [
      {
        "title": "Query Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(geode_query_duration_seconds_bucket[5m]))",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, rate(geode_query_duration_seconds_bucket[5m]))",
            "legendFormat": "p99"
          }
        ]
      },
      {
        "title": "Queries per Second",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(geode_query_total[5m])",
            "legendFormat": "QPS"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "rate(geode_query_total{status='error'}[5m]) / rate(geode_query_total[5m]) * 100",
            "legendFormat": "Error %"
          }
        ]
      },
      {
        "title": "Active Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "geode_connections_active",
            "legendFormat": "Connections"
          }
        ]
      },
      {
        "title": "Cache Hit Ratio",
        "type": "gauge",
        "targets": [
          {
            "expr": "geode_storage_cache_hits_total / (geode_storage_cache_hits_total + geode_storage_cache_misses_total) * 100",
            "legendFormat": "Hit %"
          }
        ]
      }
    ]
  }
}
```

### Pre-built Dashboards

Import pre-built dashboards from Grafana.com:

- Dashboard ID: `XXXXX` - Geode Overview
- Dashboard ID: `XXXXX` - Geode Query Performance
- Dashboard ID: `XXXXX` - Geode Storage

### Dashboard Panels

**System Health Panel**:

```json
{
  "title": "System Health",
  "type": "stat",
  "fieldConfig": {
    "defaults": {
      "mappings": [
        {"type": "value", "options": {"1": {"text": "Healthy", "color": "green"}}},
        {"type": "value", "options": {"0": {"text": "Unhealthy", "color": "red"}}}
      ]
    }
  },
  "targets": [
    {"expr": "up{job='geode'}"}
  ]
}
```

**Query Performance Panel**:

```json
{
  "title": "Query Performance",
  "type": "timeseries",
  "fieldConfig": {
    "defaults": {"unit": "s"}
  },
  "targets": [
    {"expr": "histogram_quantile(0.50, rate(geode_query_duration_seconds_bucket[5m]))", "legendFormat": "p50"},
    {"expr": "histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))", "legendFormat": "p95"},
    {"expr": "histogram_quantile(0.99, rate(geode_query_duration_seconds_bucket[5m]))", "legendFormat": "p99"}
  ]
}
```

## Alerting

### Prometheus Alert Rules

```yaml
# /etc/prometheus/rules/geode.yml
groups:
  - name: geode_availability
    rules:
      - alert: GeodeDown
        expr: up{job="geode"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Geode server is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"

      - alert: GeodeHighLatency
        expr: histogram_quantile(0.99, rate(geode_query_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High query latency"
          description: "p99 latency is {{ $value }}s (threshold: 1s)"

      - alert: GeodeHighErrorRate
        expr: rate(geode_query_total{status="error"}[5m]) / rate(geode_query_total[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate"
          description: "Error rate is {{ $value | humanizePercentage }}"

  - name: geode_resources
    rules:
      - alert: GeodeHighMemory
        expr: geode_process_memory_bytes / geode_process_memory_limit_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      - alert: GeodeLowCacheHitRatio
        expr: geode_storage_cache_hits_total / (geode_storage_cache_hits_total + geode_storage_cache_misses_total) < 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit ratio"
          description: "Cache hit ratio is {{ $value | humanizePercentage }}"

      - alert: GeodeHighDiskUsage
        expr: geode_storage_disk_usage_bytes / geode_storage_disk_total_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High disk usage"
          description: "Disk usage is {{ $value | humanizePercentage }}"

  - name: geode_backups
    rules:
      - alert: GeodeBackupOld
        expr: (time() - geode_backup_last_success_timestamp) / 3600 > 26
        labels:
          severity: critical
        annotations:
          summary: "Backup is too old"
          description: "Last backup was {{ $value | humanizeDuration }} ago"

      - alert: GeodeBackupFailed
        expr: increase(geode_backup_total{status="failure"}[1h]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Backup failed"
          description: "Backup failure detected in the last hour"

  - name: geode_security
    rules:
      - alert: GeodeHighAuthFailures
        expr: rate(geode_auth_attempts_total{result="failure"}[5m]) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High authentication failure rate"
          description: "{{ $value }} auth failures per second"
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@example.com'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true

    - match:
        severity: critical
      receiver: 'slack-critical'

    - match:
        severity: warning
      receiver: 'slack-warnings'

receivers:
  - name: 'default'
    email_configs:
      - to: 'ops@example.com'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '<PAGERDUTY_KEY>'
        severity: critical

  - name: 'slack-critical'
    slack_configs:
      - api_url: '<SLACK_WEBHOOK_URL>'
        channel: '#alerts-critical'
        title: '{{ .Status | toUpper }}: {{ .CommonLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'

  - name: 'slack-warnings'
    slack_configs:
      - api_url: '<SLACK_WEBHOOK_URL>'
        channel: '#alerts-warnings'
```

## Health Checks

### Endpoints

```bash
# Health check (detailed status)
curl http://localhost:8080/health

# Output:
{
  "status": "healthy",
  "version": "__GEODE_VERSION__",
  "uptime": "72h15m30s",
  "checks": {
    "storage": "healthy",
    "query_engine": "healthy",
    "connections": "healthy"
  }
}

# Readiness probe (for load balancers)
curl http://localhost:8080/ready

# Output:
{
  "ready": true
}

# Liveness probe (for orchestrators)
curl http://localhost:8080/live

# Output:
{
  "alive": true
}
```

### Kubernetes Probes

```yaml
# kubernetes deployment
spec:
  containers:
    - name: geode
      livenessProbe:
        httpGet:
          path: /live
          port: 8080
        initialDelaySeconds: 30
        periodSeconds: 10
        failureThreshold: 3

      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 5
        failureThreshold: 3

      startupProbe:
        httpGet:
          path: /health
          port: 8080
        initialDelaySeconds: 10
        periodSeconds: 10
        failureThreshold: 30
```

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

## Log Aggregation

### Structured Logging

Geode outputs structured JSON logs:

```json
{
  "timestamp": "2026-01-28T14:30:00.123Z",
  "level": "info",
  "message": "Query executed",
  "query_id": "abc123",
  "user": "alice",
  "duration_ms": 23.5,
  "rows_returned": 150,
  "trace_id": "xyz789"
}
```

### Log Configuration

```yaml
# geode.yaml
logging:
  level: info              # debug, info, warn, error
  format: json             # json or text
  output: stdout           # stdout, file, or both

  file:
    path: /var/log/geode/geode.log
    max_size_mb: 100
    max_backups: 5
    max_age_days: 30
    compress: true

  # Log specific components
  components:
    query: info
    storage: warn
    network: info
    security: info
```

### Loki Integration

```yaml
# promtail.yml
server:
  http_listen_port: 9080

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
            trace_id: trace_id
            user: user

      - labels:
          level:
          user:

      - timestamp:
          source: timestamp
          format: RFC3339Nano
```

### Grafana Loki Queries

```logql
# All error logs
{job="geode"} |= "error"

# Slow queries (> 1s)
{job="geode"} | json | duration_ms > 1000

# Failed authentication
{job="geode"} | json | message = "authentication_failed"

# Queries by user
{job="geode"} | json | user = "alice"

# Error rate over time
rate({job="geode"} |= "error" [5m])
```

## Distributed Tracing

### OpenTelemetry Configuration

```yaml
# geode.yaml
tracing:
  enabled: true
  exporter: otlp          # otlp, jaeger, or zipkin
  otlp:
    endpoint: http://otel-collector:4317
    insecure: true

  sampling:
    type: probabilistic
    param: 0.1            # Sample 10% of traces

  propagation:
    - tracecontext        # W3C Trace Context
    - baggage             # W3C Baggage
```

### Jaeger Integration

```yaml
# geode.yaml
tracing:
  enabled: true
  exporter: jaeger
  jaeger:
    agent_host: jaeger-agent
    agent_port: 6831
    service_name: geode
```

### Trace Context

```bash
# Query with trace context
curl -X POST http://localhost:3141/query \
  -H "traceparent: 00-abc123-def456-01" \
  -d '{"query": "MATCH (n) RETURN n LIMIT 10"}'
```

## SLO Monitoring

### Service Level Objectives

```yaml
# slo.yaml
slos:
  - name: geode_availability
    target: 99.9
    window: 30d
    indicator:
      expr: avg_over_time(up{job="geode"}[5m])

  - name: geode_latency_p99
    target: 99
    window: 30d
    indicator:
      expr: |
        histogram_quantile(0.99,
          rate(geode_query_duration_seconds_bucket[5m])
        ) < 1

  - name: geode_error_rate
    target: 99.9
    window: 30d
    indicator:
      expr: |
        1 - (
          rate(geode_query_total{status="error"}[5m]) /
          rate(geode_query_total[5m])
        )
```

### Error Budget

```promql
# Error budget remaining (30 day window)
1 - (
  sum(increase(geode_query_total{status="error"}[30d])) /
  sum(increase(geode_query_total[30d]))
) / (1 - 0.999)  # 99.9% SLO
```

## Best Practices

### Monitoring Best Practices

1. **Monitor the four golden signals**: Latency, traffic, errors, saturation
2. **Set meaningful thresholds**: Based on SLOs, not arbitrary values
3. **Alert on symptoms, not causes**: User-facing impact
4. **Use dashboards for investigation**: Not alerting
5. **Document runbooks**: Link alerts to remediation steps

### Alert Best Practices

1. **Actionable alerts only**: Every alert should require action
2. **Include runbook links**: In alert annotations
3. **Set appropriate severity**: Critical for pages, warning for tickets
4. **Use routing wisely**: Right alert to right team
5. **Regular alert review**: Tune or remove noisy alerts

### Dashboard Best Practices

1. **Consistent layout**: Similar structure across dashboards
2. **Link related dashboards**: Drill-down navigation
3. **Include context**: Time ranges, annotations
4. **Version control dashboards**: Infrastructure as code
5. **Regular review**: Update as system evolves

## Troubleshooting

### Metrics Not Appearing

```bash
# Verify metrics endpoint
curl http://localhost:8080/metrics

# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets

# Verify network connectivity
curl -v http://geode-server:8080/metrics
```

### High Cardinality Issues

```bash
# Check label cardinality
curl http://prometheus:9090/api/v1/label/__name__/values | jq '. | length'

# Find high cardinality metrics
promtool tsdb analyze /prometheus/data
```

### Missing Alerts

```bash
# Check alert rules loaded
curl http://prometheus:9090/api/v1/rules

# Check Alertmanager status
curl http://alertmanager:9093/api/v2/status

# Test alert routing
amtool alert add alertname=test severity=critical
```

## Related Documentation

- **[Observability](/docs/ops/observability/)** - Complete observability setup
- **[Observability](/docs/ops/observability/)** - Advanced alerting and observability patterns
- **[Telemetry Advanced](/docs/ops/telemetry-advanced/)** - Advanced telemetry
- **[Troubleshooting](/docs/guides/troubleshooting/)** - Common issues
