---
title: "Monitoring Guide"
slug: "monitoring"
description: "Monitor Geode with built-in metrics, Prometheus, Grafana, and alerting"
weight: 52
tags: ["monitoring", "metrics", "prometheus", "grafana", "alerting", "observability"]
categories: ["guides", "operations"]
keywords:
  - Geode monitoring
  - graph database metrics
  - Prometheus integration
  - Grafana dashboards
  - alerting strategies
  - query performance
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Monitoring Guide

This guide covers monitoring Geode in production: built-in metrics, Prometheus integration, Grafana dashboards, alerting strategies, and performance monitoring.

## Quick Start: Docker Compose Monitoring Stack

Get a complete monitoring stack running in minutes with Docker Compose.

### Complete Docker Compose Setup

Create a `docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  geode:
    image: geodedb/geode:latest
    command: serve --listen 0.0.0.0:3141
    ports:
      - "3141:3141"
      - "9090:9090"  # Metrics endpoint
    volumes:
      - geode-data:/var/lib/geode
      - ./geode.yaml:/etc/geode/geode.yaml:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
    ports:
      - "9091:9090"
    depends_on:
      - geode

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    ports:
      - "3000:3000"
    depends_on:
      - prometheus

volumes:
  geode-data:
  prometheus-data:
  grafana-data:
```

### Geode Configuration for Metrics

Create `geode.yaml`:

```yaml
# Geode server configuration with metrics enabled
server:
  listen: "0.0.0.0:3141"
  data_dir: "/var/lib/geode/data"

metrics:
  enabled: true
  listen: "0.0.0.0:9090"
  path: "/metrics"

http:
  enabled: true
  listen: "0.0.0.0:8080"
```

### Prometheus Configuration

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

rule_files: []

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'geode'
    static_configs:
      - targets: ['geode:9090']
    scrape_interval: 10s
    metrics_path: /metrics
```

### Grafana Datasource Provisioning

Create `grafana/provisioning/datasources/prometheus.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

### Launch the Stack

```bash
# Start all services
docker compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker compose -f docker-compose.monitoring.yml ps

# View logs
docker compose -f docker-compose.monitoring.yml logs -f
```

### Access the Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Geode | `localhost:3141` | - |
| Geode Metrics | `localhost:9090/metrics` | - |
| Prometheus | `localhost:9091` | - |
| Grafana | `localhost:3000` | admin/admin |

### Verify Metrics Collection

```bash
# Check Geode metrics directly
curl http://localhost:9090/metrics | head -50

# Check Prometheus targets
curl http://localhost:9091/api/v1/targets | jq .

# Should show geode target as "up"
```

## Built-in Metrics

### Metrics Endpoint

Geode exposes metrics on a dedicated HTTP endpoint:

```yaml
# /etc/geode/geode.yaml
metrics:
  enabled: true
  listen: "0.0.0.0:9090"
  path: "/metrics"
```

Access metrics:
```bash
curl http://localhost:9090/metrics
```

### Metrics Format

Metrics are exposed in Prometheus format:

```prometheus
# HELP geode_connections_active Number of active connections
# TYPE geode_connections_active gauge
geode_connections_active 42

# HELP geode_queries_total Total number of queries executed
# TYPE geode_queries_total counter
geode_queries_total{status="success"} 1234567
geode_queries_total{status="error"} 123

# HELP geode_query_duration_seconds Query execution time
# TYPE geode_query_duration_seconds histogram
geode_query_duration_seconds_bucket{le="0.001"} 10000
geode_query_duration_seconds_bucket{le="0.01"} 50000
geode_query_duration_seconds_bucket{le="0.1"} 95000
geode_query_duration_seconds_bucket{le="1"} 99000
geode_query_duration_seconds_bucket{le="+Inf"} 100000
geode_query_duration_seconds_sum 450.5
geode_query_duration_seconds_count 100000
```

### Available Metrics

#### Connection Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `geode_connections_active` | Gauge | Current active connections |
| `geode_connections_total` | Counter | Total connections established |
| `geode_connections_errors_total` | Counter | Connection errors by type |
| `geode_connections_duration_seconds` | Histogram | Connection duration |

#### Query Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `geode_queries_total` | Counter | Total queries by status |
| `geode_query_duration_seconds` | Histogram | Query execution time |
| `geode_query_rows_returned` | Histogram | Rows returned per query |
| `geode_query_parse_duration_seconds` | Histogram | Query parsing time |
| `geode_query_plan_duration_seconds` | Histogram | Query planning time |
| `geode_query_execute_duration_seconds` | Histogram | Query execution time |

#### Storage Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `geode_storage_nodes_total` | Gauge | Total nodes in graph |
| `geode_storage_relationships_total` | Gauge | Total relationships |
| `geode_storage_properties_total` | Gauge | Total properties |
| `geode_storage_size_bytes` | Gauge | Storage size in bytes |
| `geode_storage_io_read_bytes_total` | Counter | Bytes read from disk |
| `geode_storage_io_write_bytes_total` | Counter | Bytes written to disk |

#### Memory Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `geode_memory_used_bytes` | Gauge | Memory currently in use |
| `geode_memory_allocated_bytes` | Gauge | Memory allocated |
| `geode_memory_cache_size_bytes` | Gauge | Cache size |
| `geode_memory_cache_hits_total` | Counter | Cache hits |
| `geode_memory_cache_misses_total` | Counter | Cache misses |

#### Transaction Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `geode_transactions_active` | Gauge | Active transactions |
| `geode_transactions_total` | Counter | Total transactions by outcome |
| `geode_transactions_duration_seconds` | Histogram | Transaction duration |
| `geode_transactions_conflicts_total` | Counter | Transaction conflicts |

#### Replication Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `geode_replication_lag_seconds` | Gauge | Replication lag |
| `geode_replication_bytes_total` | Counter | Bytes replicated |
| `geode_replication_transactions_total` | Counter | Transactions replicated |
| `geode_cluster_nodes_total` | Gauge | Cluster size |
| `geode_cluster_leader_elections_total` | Counter | Leader elections |

### CLI Metrics Commands

```bash
# View real-time metrics
geode stats

# View specific category
geode stats queries
geode stats storage
geode stats memory
geode stats connections

# Continuous monitoring
geode stats --watch --interval 5s

# JSON output for scripting
geode stats --format json
```

## Prometheus Integration

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets:
          - 'geode-node1:9090'
          - 'geode-node2:9090'
          - 'geode-node3:9090'

    # Add labels
    relabel_configs:
      - source_labels: [__address__]
        regex: '([^:]+):\d+'
        target_label: instance
        replacement: '${1}'

    # Metric relabeling
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'geode_.*'
        action: keep
```

### Kubernetes ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: geode
  namespace: monitoring
  labels:
    app: geode
spec:
  selector:
    matchLabels:
      app: geode
  namespaceSelector:
    matchNames:
      - geode
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
      scheme: http
```

### Recording Rules

```yaml
# prometheus-rules.yml
groups:
  - name: geode-recording
    interval: 15s
    rules:
      # Query rate
      - record: geode:queries:rate5m
        expr: sum(rate(geode_queries_total[5m]))

      # Query success rate
      - record: geode:queries:success_rate5m
        expr: |
          sum(rate(geode_queries_total{status="success"}[5m]))
          /
          sum(rate(geode_queries_total[5m]))

      # Average query latency
      - record: geode:query_latency:avg5m
        expr: |
          sum(rate(geode_query_duration_seconds_sum[5m]))
          /
          sum(rate(geode_query_duration_seconds_count[5m]))

      # P95 query latency
      - record: geode:query_latency:p95
        expr: histogram_quantile(0.95, sum(rate(geode_query_duration_seconds_bucket[5m])) by (le))

      # P99 query latency
      - record: geode:query_latency:p99
        expr: histogram_quantile(0.99, sum(rate(geode_query_duration_seconds_bucket[5m])) by (le))

      # Cache hit rate
      - record: geode:cache:hit_rate5m
        expr: |
          sum(rate(geode_memory_cache_hits_total[5m]))
          /
          (sum(rate(geode_memory_cache_hits_total[5m])) + sum(rate(geode_memory_cache_misses_total[5m])))

      # Connections per second
      - record: geode:connections:rate1m
        expr: sum(rate(geode_connections_total[1m]))
```

## Grafana Dashboards

### Dashboard Overview

Create a comprehensive Geode dashboard with these panels:

```json
{
  "dashboard": {
    "title": "Geode Overview",
    "tags": ["geode", "database"],
    "timezone": "browser",
    "refresh": "30s",
    "panels": []
  }
}
```

### Health Status Panel

```json
{
  "title": "Cluster Health",
  "type": "stat",
  "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0},
  "targets": [
    {
      "expr": "sum(up{job=\"geode\"})",
      "legendFormat": "Nodes Up"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "mappings": [
        {"type": "range", "options": {"from": 3, "to": 999, "result": {"text": "Healthy", "color": "green"}}},
        {"type": "range", "options": {"from": 2, "to": 2, "result": {"text": "Degraded", "color": "yellow"}}},
        {"type": "range", "options": {"from": 0, "to": 1, "result": {"text": "Critical", "color": "red"}}}
      ]
    }
  }
}
```

### Query Rate Panel

```json
{
  "title": "Query Rate",
  "type": "timeseries",
  "gridPos": {"h": 8, "w": 12, "x": 0, "y": 4},
  "targets": [
    {
      "expr": "sum(rate(geode_queries_total[5m]))",
      "legendFormat": "Total"
    },
    {
      "expr": "sum(rate(geode_queries_total{status=\"success\"}[5m]))",
      "legendFormat": "Success"
    },
    {
      "expr": "sum(rate(geode_queries_total{status=\"error\"}[5m]))",
      "legendFormat": "Error"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "reqps"
    }
  }
}
```

### Query Latency Panel

```json
{
  "title": "Query Latency",
  "type": "timeseries",
  "gridPos": {"h": 8, "w": 12, "x": 12, "y": 4},
  "targets": [
    {
      "expr": "histogram_quantile(0.50, sum(rate(geode_query_duration_seconds_bucket[5m])) by (le))",
      "legendFormat": "P50"
    },
    {
      "expr": "histogram_quantile(0.95, sum(rate(geode_query_duration_seconds_bucket[5m])) by (le))",
      "legendFormat": "P95"
    },
    {
      "expr": "histogram_quantile(0.99, sum(rate(geode_query_duration_seconds_bucket[5m])) by (le))",
      "legendFormat": "P99"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "s"
    }
  }
}
```

### Connection Panel

```json
{
  "title": "Connections",
  "type": "timeseries",
  "gridPos": {"h": 8, "w": 12, "x": 0, "y": 12},
  "targets": [
    {
      "expr": "sum(geode_connections_active)",
      "legendFormat": "Active"
    },
    {
      "expr": "sum(rate(geode_connections_total[5m])) * 60",
      "legendFormat": "New/min"
    }
  ]
}
```

### Memory Panel

```json
{
  "title": "Memory Usage",
  "type": "timeseries",
  "gridPos": {"h": 8, "w": 12, "x": 12, "y": 12},
  "targets": [
    {
      "expr": "sum(geode_memory_used_bytes)",
      "legendFormat": "Used"
    },
    {
      "expr": "sum(geode_memory_allocated_bytes)",
      "legendFormat": "Allocated"
    },
    {
      "expr": "sum(geode_memory_cache_size_bytes)",
      "legendFormat": "Cache"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "bytes"
    }
  }
}
```

### Storage Panel

```json
{
  "title": "Graph Size",
  "type": "stat",
  "gridPos": {"h": 4, "w": 8, "x": 0, "y": 20},
  "targets": [
    {
      "expr": "sum(geode_storage_nodes_total)",
      "legendFormat": "Nodes"
    },
    {
      "expr": "sum(geode_storage_relationships_total)",
      "legendFormat": "Relationships"
    },
    {
      "expr": "sum(geode_storage_size_bytes)",
      "legendFormat": "Size"
    }
  ]
}
```

### Cache Hit Rate Panel

```json
{
  "title": "Cache Hit Rate",
  "type": "gauge",
  "gridPos": {"h": 4, "w": 4, "x": 8, "y": 20},
  "targets": [
    {
      "expr": "sum(rate(geode_memory_cache_hits_total[5m])) / (sum(rate(geode_memory_cache_hits_total[5m])) + sum(rate(geode_memory_cache_misses_total[5m]))) * 100",
      "legendFormat": "Hit Rate"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "percent",
      "min": 0,
      "max": 100,
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"value": 0, "color": "red"},
          {"value": 80, "color": "yellow"},
          {"value": 95, "color": "green"}
        ]
      }
    }
  }
}
```

### Replication Lag Panel

```json
{
  "title": "Replication Lag",
  "type": "timeseries",
  "gridPos": {"h": 8, "w": 12, "x": 0, "y": 24},
  "targets": [
    {
      "expr": "geode_replication_lag_seconds",
      "legendFormat": "{{instance}}"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "s",
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"value": 0, "color": "green"},
          {"value": 1, "color": "yellow"},
          {"value": 5, "color": "red"}
        ]
      }
    }
  }
}
```

### Complete Dashboard JSON

```json
{
  "dashboard": {
    "id": null,
    "uid": "geode-overview",
    "title": "Geode Overview",
    "tags": ["geode", "database", "graph"],
    "timezone": "browser",
    "schemaVersion": 38,
    "version": 1,
    "refresh": "30s",
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "templating": {
      "list": [
        {
          "name": "instance",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(geode_connections_active, instance)",
          "refresh": 2,
          "includeAll": true,
          "multi": true
        }
      ]
    },
    "annotations": {
      "list": [
        {
          "name": "Deployments",
          "datasource": "Prometheus",
          "expr": "changes(geode_build_info[5m]) > 0",
          "titleFormat": "Deployment",
          "textFormat": "Version: {{version}}"
        }
      ]
    },
    "panels": [
      {
        "title": "Cluster Status",
        "type": "row",
        "gridPos": {"h": 1, "w": 24, "x": 0, "y": 0}
      },
      {
        "title": "Nodes Up",
        "type": "stat",
        "gridPos": {"h": 4, "w": 4, "x": 0, "y": 1},
        "targets": [
          {"expr": "sum(up{job=\"geode\"})"}
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"value": 0, "color": "red"},
                {"value": 2, "color": "yellow"},
                {"value": 3, "color": "green"}
              ]
            }
          }
        }
      },
      {
        "title": "Queries/sec",
        "type": "stat",
        "gridPos": {"h": 4, "w": 4, "x": 4, "y": 1},
        "targets": [
          {"expr": "sum(rate(geode_queries_total[5m]))"}
        ],
        "fieldConfig": {
          "defaults": {"unit": "reqps"}
        }
      },
      {
        "title": "P95 Latency",
        "type": "stat",
        "gridPos": {"h": 4, "w": 4, "x": 8, "y": 1},
        "targets": [
          {"expr": "histogram_quantile(0.95, sum(rate(geode_query_duration_seconds_bucket[5m])) by (le))"}
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "steps": [
                {"value": 0, "color": "green"},
                {"value": 0.1, "color": "yellow"},
                {"value": 1, "color": "red"}
              ]
            }
          }
        }
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "gridPos": {"h": 4, "w": 4, "x": 12, "y": 1},
        "targets": [
          {"expr": "sum(rate(geode_queries_total{status=\"error\"}[5m])) / sum(rate(geode_queries_total[5m])) * 100"}
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "thresholds": {
              "steps": [
                {"value": 0, "color": "green"},
                {"value": 1, "color": "yellow"},
                {"value": 5, "color": "red"}
              ]
            }
          }
        }
      },
      {
        "title": "Active Connections",
        "type": "stat",
        "gridPos": {"h": 4, "w": 4, "x": 16, "y": 1},
        "targets": [
          {"expr": "sum(geode_connections_active)"}
        ]
      },
      {
        "title": "Cache Hit Rate",
        "type": "gauge",
        "gridPos": {"h": 4, "w": 4, "x": 20, "y": 1},
        "targets": [
          {"expr": "geode:cache:hit_rate5m * 100"}
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "min": 0,
            "max": 100
          }
        }
      }
    ]
  }
}
```

## Key Metrics to Monitor

### Service Level Indicators (SLIs)

| SLI | Definition | Target |
|-----|------------|--------|
| **Availability** | Percentage of successful health checks | 99.9% |
| **Latency (P95)** | 95th percentile query latency | < 100ms |
| **Latency (P99)** | 99th percentile query latency | < 500ms |
| **Error Rate** | Percentage of failed queries | < 0.1% |
| **Throughput** | Queries per second | > 10,000 |

### Service Level Objectives (SLOs)

```yaml
# SLO definitions
slos:
  - name: "Query Availability"
    target: 99.9
    window: 30d
    sli:
      expr: |
        sum(rate(geode_queries_total{status="success"}[5m]))
        /
        sum(rate(geode_queries_total[5m]))

  - name: "Query Latency P95"
    target: 95
    window: 30d
    sli:
      expr: |
        histogram_quantile(0.95, sum(rate(geode_query_duration_seconds_bucket[5m])) by (le)) < 0.1
```

### Critical Metrics

1. **Query Performance**
   - `geode_query_duration_seconds` - Latency distribution
   - `geode_queries_total` - Throughput and error rate
   - `geode_query_rows_returned` - Result set sizes

2. **Resource Utilization**
   - `geode_memory_used_bytes` - Memory pressure
   - `geode_storage_io_*` - I/O bottlenecks
   - `geode_connections_active` - Connection pressure

3. **Data Integrity**
   - `geode_replication_lag_seconds` - Replication health
   - `geode_transactions_conflicts_total` - Contention
   - `geode_cluster_nodes_total` - Cluster health

## Alerting Strategies

### Alert Severity Levels

| Level | Response Time | Examples |
|-------|--------------|----------|
| **Critical** | Immediate (< 5 min) | Database down, data loss risk |
| **Warning** | Soon (< 30 min) | High latency, degraded performance |
| **Info** | Next business day | Approaching limits, optimization needed |

### Prometheus Alerting Rules

```yaml
# geode-alerts.yml
groups:
  - name: geode-critical
    rules:
      # Database unavailable
      - alert: GeodeDown
        expr: up{job="geode"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Geode instance {{ $labels.instance }} is down"
          description: "Geode has been unreachable for more than 1 minute."
          runbook_url: "https://docs.geodedb.com/runbooks/geode-down"

      # Cluster quorum lost
      - alert: GeodeQuorumLost
        expr: sum(up{job="geode"}) < 2
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Geode cluster has lost quorum"
          description: "Fewer than 2 nodes are available. Write operations may fail."

      # High error rate
      - alert: GeodeHighErrorRate
        expr: |
          sum(rate(geode_queries_total{status="error"}[5m]))
          /
          sum(rate(geode_queries_total[5m]))
          > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Geode error rate is above 5%"
          description: "Query error rate is {{ $value | printf \"%.2f\" }}%"

      # Disk space critical
      - alert: GeodeDiskSpaceCritical
        expr: |
          (geode_storage_size_bytes / geode_storage_capacity_bytes) > 0.95
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Geode disk space is critically low"
          description: "Disk usage is above 95%"

  - name: geode-warning
    rules:
      # High latency
      - alert: GeodeHighLatency
        expr: |
          histogram_quantile(0.95, sum(rate(geode_query_duration_seconds_bucket[5m])) by (le))
          > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Geode P95 latency is above 500ms"
          description: "P95 latency is {{ $value | printf \"%.3f\" }}s"

      # Replication lag
      - alert: GeodeReplicationLag
        expr: geode_replication_lag_seconds > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Geode replication lag is high"
          description: "Replica {{ $labels.instance }} is {{ $value }}s behind"

      # High memory usage
      - alert: GeodeHighMemory
        expr: |
          (geode_memory_used_bytes / geode_memory_allocated_bytes) > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Geode memory usage is above 90%"

      # Low cache hit rate
      - alert: GeodeLowCacheHitRate
        expr: geode:cache:hit_rate5m < 0.8
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Geode cache hit rate is below 80%"
          description: "Cache hit rate is {{ $value | printf \"%.1f\" }}%"

      # Connection pool exhaustion
      - alert: GeodeConnectionPoolHigh
        expr: |
          geode_connections_active / geode_connections_max > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Geode connection pool is 80% utilized"

  - name: geode-info
    rules:
      # Approaching disk limit
      - alert: GeodeDiskSpaceWarning
        expr: |
          (geode_storage_size_bytes / geode_storage_capacity_bytes) > 0.75
        for: 30m
        labels:
          severity: info
        annotations:
          summary: "Geode disk usage is above 75%"

      # Slow queries increasing
      - alert: GeodeSlowQueries
        expr: |
          rate(geode_query_duration_seconds_bucket{le="1"}[5m])
          /
          rate(geode_query_duration_seconds_count[5m])
          < 0.99
        for: 30m
        labels:
          severity: info
        annotations:
          summary: "More than 1% of queries are taking over 1 second"
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@geodedb.com'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true

    - match:
        severity: warning
      receiver: 'slack-warnings'

    - match:
        severity: info
      receiver: 'email-info'

receivers:
  - name: 'default'
    email_configs:
      - to: 'oncall@example.com'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '<pagerduty-integration-key>'
        severity: critical

  - name: 'slack-warnings'
    slack_configs:
      - api_url: '<slack-webhook-url>'
        channel: '#geode-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'

  - name: 'email-info'
    email_configs:
      - to: 'team@example.com'

inhibit_rules:
  # If critical alert fires, suppress warnings for same instance
  - source_match:
      severity: critical
    target_match:
      severity: warning
    equal: ['instance']
```

### PagerDuty Integration

```yaml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - routing_key: '<routing-key>'
        severity: '{{ .CommonLabels.severity }}'
        description: '{{ .CommonAnnotations.summary }}'
        details:
          alertname: '{{ .CommonLabels.alertname }}'
          instance: '{{ .CommonLabels.instance }}'
          description: '{{ .CommonAnnotations.description }}'
          runbook: '{{ .CommonAnnotations.runbook_url }}'
```

### Slack Integration

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: '<webhook-url>'
        channel: '#geode-alerts'
        username: 'Geode Alertmanager'
        icon_emoji: ':database:'
        color: '{{ if eq .Status "firing" }}{{ if eq .CommonLabels.severity "critical" }}danger{{ else }}warning{{ end }}{{ else }}good{{ end }}'
        title: '{{ .CommonLabels.alertname }} - {{ .Status | toUpper }}'
        text: |
          {{ range .Alerts }}
          *Instance:* {{ .Labels.instance }}
          *Summary:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          {{ if .Annotations.runbook_url }}*Runbook:* {{ .Annotations.runbook_url }}{{ end }}
          {{ end }}
```

## Query Performance Monitoring

### Slow Query Log

```yaml
# /etc/geode/geode.yaml
logging:
  slow_queries:
    enabled: true
    threshold: 1s
    include_parameters: true
    include_plan: true
```

### Query Analysis

```bash
# View slow queries
geode queries slow --since 1h

# Output:
# ┌─────────────────────┬──────────┬──────────┬─────────────────────────────────┐
# │ Timestamp           │ Duration │ Rows     │ Query                           │
# ├─────────────────────┼──────────┼──────────┼─────────────────────────────────┤
# │ 2026-01-28 10:23:45 │ 2.34s    │ 10000    │ MATCH (n)-[*5..10]->(m) RETU... │
# │ 2026-01-28 10:24:12 │ 1.56s    │ 50000    │ MATCH (n) RETURN n.props...     │
# └─────────────────────┴──────────┴──────────┴─────────────────────────────────┘
```

### Query Profiling

```gql
-- Profile a specific query
PROFILE MATCH (p:Person)-[:KNOWS*2..3]->(friend)
WHERE p.name = 'Alice'
RETURN friend.name, count(*)

-- Output:
-- +------------------+-------+--------+------------+
-- | Operation        | Rows  | Time   | Memory     |
-- +------------------+-------+--------+------------+
-- | Produce Results  | 15    | 0.1ms  | 1KB        |
-- | Aggregate        | 15    | 0.5ms  | 2KB        |
-- | VarLengthExpand  | 150   | 45.2ms | 128KB      |
-- | NodeIndexSeek    | 1     | 0.2ms  | 64B        |
-- +------------------+-------+--------+------------+
-- Total: 46.0ms
```

### Query Metrics in Prometheus

```prometheus
# Top 10 slowest queries (requires query tagging)
topk(10,
  histogram_quantile(0.99,
    sum(rate(geode_query_duration_seconds_bucket[5m])) by (le, query_hash)
  )
)

# Query latency by type
histogram_quantile(0.95,
  sum(rate(geode_query_duration_seconds_bucket[5m])) by (le, query_type)
)
```

## Resource Utilization

### CPU Monitoring

```yaml
# Prometheus queries
- record: geode:cpu:usage
  expr: |
    rate(process_cpu_seconds_total{job="geode"}[5m]) * 100

- alert: GeodeHighCPU
  expr: geode:cpu:usage > 80
  for: 10m
  labels:
    severity: warning
```

### Memory Monitoring

```yaml
# Memory utilization
- record: geode:memory:utilization
  expr: |
    geode_memory_used_bytes / geode_memory_allocated_bytes

# Memory growth rate
- record: geode:memory:growth_rate
  expr: |
    deriv(geode_memory_used_bytes[1h])
```

### Disk I/O Monitoring

```yaml
# Disk read/write rates
- record: geode:disk:read_rate
  expr: rate(geode_storage_io_read_bytes_total[5m])

- record: geode:disk:write_rate
  expr: rate(geode_storage_io_write_bytes_total[5m])

# Disk I/O latency (if available)
- alert: GeodeHighDiskLatency
  expr: geode_storage_io_latency_seconds > 0.01
  for: 5m
  labels:
    severity: warning
```

### Network Monitoring

```yaml
# Connection rate
- record: geode:network:connection_rate
  expr: rate(geode_connections_total[5m])

# Bytes transferred
- record: geode:network:bytes_in
  expr: rate(geode_network_bytes_received_total[5m])

- record: geode:network:bytes_out
  expr: rate(geode_network_bytes_sent_total[5m])
```

## Log Aggregation

### Structured Logging

```yaml
# /etc/geode/geode.yaml
logging:
  format: json
  level: info

  fields:
    service: geode
    environment: production
    version: "0.1.3"

  output:
    - type: file
      path: /var/log/geode/geode.log
```

### Log Format

```json
{
  "@timestamp": "2026-01-28T10:23:45.123Z",
  "level": "info",
  "service": "geode",
  "component": "query",
  "message": "Query executed",
  "query_id": "q-123456",
  "duration_ms": 45.2,
  "rows_returned": 100,
  "client_id": "c-789",
  "trace_id": "abc123"
}
```

### Elasticsearch/OpenSearch Integration

```yaml
# Filebeat configuration
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/geode/*.log
    json:
      keys_under_root: true
      add_error_key: true
      message_key: message

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "geode-logs-%{+yyyy.MM.dd}"

setup.template.name: "geode-logs"
setup.template.pattern: "geode-logs-*"
```

### Loki Integration

```yaml
# Promtail configuration
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
            component: component
            duration: duration_ms
      - labels:
          level:
          component:
```

### Log-Based Metrics

```yaml
# Extract metrics from logs in Loki
- record: geode:logs:errors_total
  expr: |
    sum(count_over_time({job="geode"} |= "error" [5m]))

- record: geode:logs:slow_queries_total
  expr: |
    sum(count_over_time({job="geode"} | json | duration_ms > 1000 [5m]))
```

## Distributed Tracing

### OpenTelemetry Configuration

```yaml
# /etc/geode/geode.yaml
tracing:
  enabled: true

  exporter:
    type: otlp
    endpoint: "otel-collector:4317"

  sampling:
    rate: 0.1  # Sample 10% of requests

  propagation:
    - tracecontext
    - baggage
```

### Jaeger Integration

```yaml
tracing:
  enabled: true

  exporter:
    type: jaeger
    endpoint: "http://jaeger:14268/api/traces"

  service_name: geode-production
```

### Trace Example

```
Trace ID: abc123def456

geode-server (45.2ms)
├── parse-query (0.5ms)
├── plan-query (2.1ms)
├── execute-query (40.8ms)
│   ├── index-scan (5.2ms)
│   ├── node-lookup (20.3ms)
│   └── relationship-expand (15.3ms)
└── serialize-response (1.8ms)
```

## Monitoring Best Practices

### Dashboard Organization

1. **Overview Dashboard**: High-level health and key metrics
2. **Query Dashboard**: Query performance and patterns
3. **Resource Dashboard**: CPU, memory, disk, network
4. **Cluster Dashboard**: Replication, failover, nodes
5. **Capacity Dashboard**: Growth trends and projections

### Alert Fatigue Prevention

1. **Set appropriate thresholds**: Base on actual performance baselines
2. **Use appropriate durations**: Avoid alerting on brief spikes
3. **Correlate alerts**: Group related issues
4. **Review and tune regularly**: Adjust based on false positive rate
5. **Document runbooks**: Include resolution steps in alerts

### Metric Cardinality

```yaml
# Avoid high cardinality labels
# BAD: query_text label (millions of unique values)
geode_query_duration_seconds{query_text="..."}

# GOOD: query_hash or query_type
geode_query_duration_seconds{query_type="match"}
```

### Retention Policies

```yaml
# prometheus.yml
storage:
  tsdb:
    retention.time: 30d
    retention.size: 50GB

# For long-term storage, use Thanos or Cortex
```

## Troubleshooting

### High Latency Investigation

```bash
# Check current query activity
geode queries active

# Check slow query log
geode queries slow --since 15m

# Profile specific query
geode shell -c "PROFILE <query>"

# Check index usage
geode indexes stats
```

### Memory Issues

```bash
# Check memory breakdown
geode stats memory --detailed

# Check cache efficiency
geode stats cache

# Force garbage collection (if supported)
geode admin gc
```

### Connection Issues

```bash
# Check connection stats
geode stats connections

# View active connections
geode connections list

# Check for connection leaks
geode connections --long-running
```

## Next Steps

- [Production Deployment](/guides/production-deployment/) - Deploy to production
- [High Availability](/guides/high-availability/) - Set up HA clusters
- [Performance Tuning](/docs/performance/) - Optimize performance
- [Backup and Restore](/guides/backup-restore/) - Protect your data

---

**Questions?** Contact us at [support@geodedb.com](mailto:support@geodedb.com) or visit our [community forum](https://forum.geodedb.com).
