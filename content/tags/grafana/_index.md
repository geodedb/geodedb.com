---
title: "Grafana Visualization"
description: "Comprehensive Grafana integration guide for Geode including dashboard setup, visualization techniques, templating, alerting, and advanced Grafana features."
keywords:
  - Grafana
  - visualization
  - dashboards
  - monitoring
  - Prometheus
  - metrics visualization
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/grafana/"
    noindex: false
---

Grafana is the industry-leading open-source platform for metrics visualization, enabling you to create rich, interactive dashboards that transform Geode's operational metrics into actionable insights. With support for Prometheus, Loki, and other data sources, Grafana provides a unified interface for monitoring database health, performance, and resource utilization.

Geode's comprehensive metrics integrate seamlessly with Grafana, allowing you to build dashboards tailored to your monitoring needs—from high-level executive overviews to detailed performance analysis for database administrators and developers.

This guide covers Grafana installation, configuration, dashboard creation, advanced visualization techniques, and best practices for monitoring Geode deployments.

## Installation and Setup

### Docker Installation

Quick setup using Docker Compose:

```yaml
# docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=http://grafana.example.com
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    ports:
      - "3000:3000"
    depends_on:
      - prometheus

  geode:
    image: codepros/geode:latest
    ports:
      - "3141:3141"
      - "8080:8080"  # Metrics endpoint

volumes:
  prometheus-data:
  grafana-data:
```

Start the stack:

```bash
docker-compose up -d

# Access Grafana at http://localhost:3000
# Default credentials: admin/admin
```

### Kubernetes Installation

Deploy using Helm:

```bash
# Add Grafana Helm repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Grafana
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set adminPassword=admin \
  --set persistence.enabled=true \
  --set persistence.size=10Gi

# Get Grafana URL
kubectl get svc -n monitoring grafana -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

## Data Source Configuration

### Prometheus Data Source

Configure Prometheus as the primary data source:

```yaml
# provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
    jsonData:
      timeInterval: "15s"
      queryTimeout: "60s"
      httpMethod: POST
      prometheusType: Prometheus
      prometheusVersion: 2.40.0
      cacheLevel: High
      incrementalQuerying: true
      disableRecordingRules: false
```

### Loki Data Source (for Logs)

Add Loki for log visualization:

```yaml
# provisioning/datasources/loki.yml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    jsonData:
      maxLines: 1000
      derivedFields:
        - datasourceUid: tempo
          matcherRegex: "trace_id=(\\w+)"
          name: TraceID
          url: "$${__value.raw}"
```

### Tempo Data Source (for Traces)

Add Tempo for distributed tracing:

```yaml
# provisioning/datasources/tempo.yml
apiVersion: 1

datasources:
  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    jsonData:
      nodeGraph:
        enabled: true
      tracesToLogs:
        datasourceUid: loki
        tags: ['trace_id']
```

## Dashboard Provisioning

Automatically provision dashboards on startup:

```yaml
# provisioning/dashboards/dashboard.yml
apiVersion: 1

providers:
  - name: 'Geode Dashboards'
    orgId: 1
    folder: 'Geode'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards/geode
```

Place dashboard JSON files in the specified path:

```bash
/etc/grafana/provisioning/dashboards/geode/
├── geode-overview.json
├── geode-query-performance.json
├── geode-transactions.json
└── geode-resources.json
```

## Creating Custom Dashboards

### Dashboard JSON Structure

```json
{
  "dashboard": {
    "title": "Geode Query Performance",
    "tags": ["geode", "performance"],
    "timezone": "browser",
    "schemaVersion": 36,
    "version": 1,
    "refresh": "10s",

    "templating": {
      "list": [
        {
          "name": "instance",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(geode_queries_total, instance)",
          "refresh": 1,
          "multi": true,
          "includeAll": true
        }
      ]
    },

    "panels": [
      {
        "id": 1,
        "title": "Query Rate",
        "type": "graph",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "sum(rate(geode_queries_total{instance=~\"$instance\"}[5m]))",
            "legendFormat": "Total Queries/sec"
          }
        ],
        "yaxes": [
          {"format": "ops", "label": "Queries/sec"},
          {"format": "short"}
        ]
      }
    ]
  }
}
```

### Panel Types and Use Cases

**Graph Panel**: Time series visualization
```json
{
  "type": "graph",
  "title": "Query Latency",
  "targets": [
    {
      "expr": "histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))",
      "legendFormat": "p95 Latency"
    }
  ],
  "yaxes": [
    {"format": "s", "label": "Latency"}
  ]
}
```

**Stat Panel**: Single value with thresholds
```json
{
  "type": "stat",
  "title": "Query Success Rate",
  "targets": [
    {
      "expr": "rate(geode_queries_total{status=\"success\"}[5m]) / rate(geode_queries_total[5m]) * 100"
    }
  ],
  "options": {
    "reduceOptions": {
      "values": false,
      "calcs": ["lastNotNull"]
    }
  },
  "fieldConfig": {
    "defaults": {
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"color": "red", "value": 0},
          {"color": "yellow", "value": 99},
          {"color": "green", "value": 99.9}
        ]
      },
      "unit": "percent"
    }
  }
}
```

**Gauge Panel**: Percentage visualization
```json
{
  "type": "gauge",
  "title": "Memory Usage",
  "targets": [
    {
      "expr": "geode_memory_used_bytes / geode_memory_total_bytes * 100"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "thresholds": {
        "steps": [
          {"color": "green", "value": 0},
          {"color": "yellow", "value": 75},
          {"color": "red", "value": 90}
        ]
      },
      "unit": "percent",
      "min": 0,
      "max": 100
    }
  }
}
```

**Table Panel**: Detailed data display
```json
{
  "type": "table",
  "title": "Top Slow Queries",
  "targets": [
    {
      "expr": "topk(10, geode_query_duration_seconds{quantile=\"0.99\"})",
      "format": "table",
      "instant": true
    }
  ],
  "transformations": [
    {
      "id": "organize",
      "options": {
        "excludeByName": {"Time": true},
        "indexByName": {
          "query_id": 0,
          "query_text": 1,
          "Value": 2
        },
        "renameByName": {
          "Value": "Duration (ms)"
        }
      }
    }
  ]
}
```

**Heatmap Panel**: Distribution visualization
```json
{
  "type": "heatmap",
  "title": "Query Latency Distribution",
  "targets": [
    {
      "expr": "sum(rate(geode_query_duration_seconds_bucket[5m])) by (le)"
    }
  ],
  "heatmap": {
    "colorScheme": "interpolateViridis"
  },
  "dataFormat": "tsbuckets"
}
```

## Advanced Visualization Techniques

### Multi-Axis Graphs

Combine different metrics on one graph:

```json
{
  "type": "graph",
  "title": "Query Rate vs Latency",
  "targets": [
    {
      "expr": "sum(rate(geode_queries_total[5m]))",
      "legendFormat": "Query Rate",
      "yaxis": 1
    },
    {
      "expr": "histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))",
      "legendFormat": "p95 Latency",
      "yaxis": 2
    }
  ],
  "yaxes": [
    {"format": "ops", "label": "Queries/sec"},
    {"format": "s", "label": "Latency"}
  ]
}
```

### Conditional Formatting

Apply colors based on value ranges:

```json
{
  "type": "stat",
  "fieldConfig": {
    "overrides": [
      {
        "matcher": {"id": "byName", "options": "Error Rate"},
        "properties": [
          {
            "id": "thresholds",
            "value": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 1},
                {"color": "red", "value": 10}
              ]
            }
          }
        ]
      }
    ]
  }
}
```

### Template Variables

Create dynamic dashboards with variables:

**Query Variable**:
```json
{
  "name": "instance",
  "type": "query",
  "query": "label_values(geode_queries_total, instance)",
  "refresh": "on_time_range_change",
  "multi": true,
  "includeAll": true,
  "allValue": ".*"
}
```

**Interval Variable**:
```json
{
  "name": "interval",
  "type": "interval",
  "query": "1m,5m,10m,30m,1h",
  "auto": true,
  "auto_count": 30,
  "auto_min": "10s"
}
```

**Custom Variable**:
```json
{
  "name": "percentile",
  "type": "custom",
  "query": "0.50,0.95,0.99",
  "current": {
    "value": "0.95",
    "text": "p95"
  }
}
```

Use variables in queries:

```promql
# Dynamic instance filtering
rate(geode_queries_total{instance=~"$instance"}[$interval])

# Dynamic percentile
histogram_quantile($percentile, rate(geode_query_duration_seconds_bucket[5m]))
```

### Transformations

Transform query results before visualization:

**Join by Field**:
```json
{
  "transformations": [
    {
      "id": "merge",
      "options": {}
    },
    {
      "id": "organize",
      "options": {
        "excludeByName": {"Time": true},
        "indexByName": {
          "instance": 0,
          "queries": 1,
          "errors": 2
        }
      }
    }
  ]
}
```

**Calculate Field**:
```json
{
  "transformations": [
    {
      "id": "calculateField",
      "options": {
        "mode": "binary",
        "reduce": {
          "reducer": "sum"
        },
        "alias": "Error Rate",
        "binary": {
          "left": "Errors",
          "operator": "/",
          "right": "Total"
        }
      }
    }
  ]
}
```

## Alerting in Grafana

### Configure Alert Rules

```json
{
  "type": "graph",
  "title": "Query Error Rate",
  "alert": {
    "name": "High Query Error Rate",
    "conditions": [
      {
        "evaluator": {
          "type": "gt",
          "params": [10]
        },
        "operator": {
          "type": "and"
        },
        "query": {
          "params": ["A", "5m", "now"]
        },
        "reducer": {
          "type": "avg"
        },
        "type": "query"
      }
    ],
    "executionErrorState": "alerting",
    "frequency": "1m",
    "handler": 1,
    "message": "Query error rate exceeds threshold",
    "noDataState": "no_data",
    "notifications": [
      {"uid": "slack-alerts"}
    ]
  }
}
```

### Notification Channels

**Slack**:
```json
{
  "name": "Slack Alerts",
  "type": "slack",
  "settings": {
    "url": "https://hooks.slack.com/services/...",
    "recipient": "#database-alerts",
    "username": "Grafana"
  }
}
```

**PagerDuty**:
```json
{
  "name": "PagerDuty",
  "type": "pagerduty",
  "settings": {
    "integrationKey": "xxxxx",
    "severity": "critical",
    "autoResolve": true
  }
}
```

**Email**:
```json
{
  "name": "Email Alerts",
  "type": "email",
  "settings": {
    "addresses": "ops@example.com;team@example.com",
    "singleEmail": false
  }
}
```

## Performance Optimization

### Use Recording Rules

Pre-compute expensive queries in Prometheus:

```yaml
# prometheus-rules.yml
groups:
  - name: grafana_recordings
    interval: 15s
    rules:
      - record: job:geode_query_rate:5m
        expr: sum(rate(geode_queries_total[5m])) by (job, instance)

      - record: job:geode_query_latency_p95:5m
        expr: histogram_quantile(0.95, sum(rate(geode_query_duration_seconds_bucket[5m])) by (job, instance, le))
```

Use in Grafana:

```promql
# Instead of complex query
sum(rate(geode_queries_total[5m])) by (job, instance)

# Use recording rule
job:geode_query_rate:5m
```

### Optimize Query Performance

**Reduce Time Range**: Use appropriate time windows
```promql
# Good for real-time dashboard
rate(geode_queries_total[5m])

# Too expensive for dashboard
rate(geode_queries_total[24h])
```

**Limit Series**: Use filters to reduce cardinality
```promql
# Too broad
sum(rate(geode_queries_total[5m]))

# Filtered appropriately
sum(rate(geode_queries_total{instance=~"$instance"}[5m]))
```

**Use Instant Queries for Tables**: When only latest value needed
```json
{
  "targets": [
    {
      "expr": "topk(10, geode_query_duration_seconds)",
      "instant": true,
      "format": "table"
    }
  ]
}
```

## Best Practices

**Consistent Naming**: Use consistent dashboard and panel names across folders.

**Organize by Persona**: Create dashboards for specific audiences (ops, devs, executives).

**Use Folders**: Group related dashboards in folders for easy navigation.

**Version Control**: Store dashboard JSON in Git for versioning and collaboration.

**Document Dashboards**: Add descriptions to dashboards and panels explaining metrics.

**Set Appropriate Refresh**: Balance freshness with performance (10s-1m for most dashboards).

**Use Variables**: Make dashboards reusable with template variables.

**Test Performance**: Ensure dashboards load quickly even with many panels.

**Color Consistently**: Use standard color schemes (green=good, red=bad).

**Include Links**: Link related dashboards and runbooks.

## Related Topics

- [Monitoring Dashboards](/tags/dashboard/) - Dashboard design
- [Prometheus Integration](/tags/prometheus/) - Prometheus setup
- [Performance Metrics](/tags/metrics/) - Metrics collection
- [System Monitoring](/tags/monitoring/) - Monitoring strategies
- [Alert Management](/tags/alerting/) - Alert configuration
- [System Observability](/tags/observability/) - Observability pillars

## Further Reading

- Grafana Documentation
- Dashboard Best Practices
- PromQL Query Guide
- Grafana Alerting Guide
- Dashboard as Code Patterns
