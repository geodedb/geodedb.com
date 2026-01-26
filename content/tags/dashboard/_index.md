---
title: "Monitoring Dashboards"
description: "Comprehensive guide to creating monitoring dashboards for Geode including Grafana dashboards, dashboard design, key visualizations, and dashboard best practices."
keywords:
  - dashboard
  - monitoring dashboards
  - Grafana
  - visualization
  - metrics visualization
  - monitoring
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/dashboard/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Monitoring dashboards provide visual representations of system metrics, enabling at-a-glance health checks, trend analysis, and rapid problem identification. Well-designed dashboards surface critical information, guide investigation workflows, and enable data-driven decision-making for operations and capacity planning.

Geode's comprehensive metrics expose detailed performance data that can be visualized through Grafana, Datadog, New Relic, or custom dashboard platforms. Effective dashboard design balances detail with clarity, focusing on actionable insights rather than raw data dumps.

This guide covers dashboard design principles, essential visualizations, Grafana configuration, dashboard templates, and best practices for monitoring Geode deployments.

## Dashboard Design Principles

### Purpose-Driven Organization

Design dashboards for specific audiences and use cases:

**Executive Dashboard**: High-level SLO compliance and business metrics
**Operations Dashboard**: System health, resource utilization, alerts
**Developer Dashboard**: Query performance, application metrics, errors
**Capacity Planning Dashboard**: Growth trends, resource forecasts

### Information Hierarchy

Organize panels from most to least important:

1. **SLO/Health Status** (top): Red/green indicators for overall health
2. **Key Metrics** (middle): Query rate, latency, errors
3. **Supporting Metrics** (bottom): Detailed breakdowns, diagnostics

### At-a-Glance Comprehension

Use visualization types that enable instant understanding:

**Stat Panels**: Single value with threshold coloring (good/warning/critical)
**Gauge Panels**: Percentage utilization with color zones
**Graph Panels**: Time series trends over last N hours
**Heatmaps**: Distribution visualization (latency percentiles)
**Tables**: Detailed breakdowns when needed

## Essential Geode Dashboards

### System Overview Dashboard

High-level health check for Geode cluster:

```yaml
Dashboard: Geode System Overview
Refresh: 30s
Time Range: Last 6 hours

Row 1: SLO Status
  - Panel: Overall Health
    Type: Stat
    Query: up{job="geode"}
    Thresholds: 0=red, 1=green
    Value: "{{ if value == 1 }}UP{{ else }}DOWN{{ end }}"

  - Panel: Query Success Rate (SLO: >99.9%)
    Type: Gauge
    Query: |
      rate(geode_queries_total{status="success"}[5m]) /
        rate(geode_queries_total[5m]) * 100
    Thresholds: <99.9=red, <99.95=orange, >=99.95=green

  - Panel: P95 Latency (SLO: <500ms)
    Type: Gauge
    Query: |
      histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m])) * 1000
    Thresholds: >500=red, >300=orange, <=300=green
    Unit: ms

  - Panel: Error Rate
    Type: Stat
    Query: rate(geode_queries_total{status="error"}[5m])
    Thresholds: >10=red, >1=orange, <=1=green
    Unit: errors/sec

Row 2: Query Metrics
  - Panel: Query Rate
    Type: Graph
    Queries:
      - Legend: Success
        Query: rate(geode_queries_total{status="success"}[5m])
      - Legend: Error
        Query: rate(geode_queries_total{status="error"}[5m])
    Y-Axis: queries/sec

  - Panel: Query Latency Percentiles
    Type: Graph
    Queries:
      - Legend: p50
        Query: histogram_quantile(0.50, rate(geode_query_duration_seconds_bucket[5m]))
      - Legend: p95
        Query: histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))
      - Legend: p99
        Query: histogram_quantile(0.99, rate(geode_query_duration_seconds_bucket[5m]))
    Y-Axis: seconds
    Format: Time series

Row 3: System Resources
  - Panel: Memory Usage
    Type: Graph
    Query: geode_memory_used_bytes / geode_memory_total_bytes * 100
    Y-Axis: percent
    Thresholds: >90=red, >75=orange

  - Panel: Disk Usage
    Type: Graph
    Query: geode_disk_used_bytes / geode_disk_total_bytes * 100
    Y-Axis: percent
    Thresholds: >90=red, >75=orange

  - Panel: Connection Pool
    Type: Graph
    Query: geode_active_connections / geode_max_connections * 100
    Y-Axis: percent
    Thresholds: >90=red, >75=orange

Row 4: Recent Alerts
  - Panel: Active Alerts
    Type: Alert List
    State Filter: Pending, Alerting
    Sort: Severity
```

### Query Performance Dashboard

Deep dive into query execution metrics:

```yaml
Dashboard: Geode Query Performance
Refresh: 10s
Time Range: Last 1 hour

Row 1: Query Throughput
  - Panel: Queries per Second
    Type: Graph
    Query: sum(rate(geode_queries_total[1m]))
    Fill: Area
    Stack: true

  - Panel: Queries by Status
    Type: Pie Chart
    Queries:
      - Legend: Success
        Query: sum(increase(geode_queries_total{status="success"}[1h]))
      - Legend: Error
        Query: sum(increase(geode_queries_total{status="error"}[1h]))

Row 2: Latency Analysis
  - Panel: Latency Heatmap
    Type: Heatmap
    Query: |
      sum(rate(geode_query_duration_seconds_bucket[5m])) by (le)
    X-Axis: Time
    Y-Axis: Latency buckets
    Color: Query count

  - Panel: Slow Queries (>1s)
    Type: Stat
    Query: rate(geode_slow_queries_total[5m])
    Thresholds: >5=red, >1=orange
    Unit: queries/sec

Row 3: Query Breakdown
  - Panel: Top Query Types by Duration
    Type: Bar Gauge
    Query: |
      topk(10,
        sum by (query_type) (rate(geode_query_duration_seconds_sum[5m]))
      )
    Orientation: Horizontal

  - Panel: Query Cache Hit Rate
    Type: Graph
    Query: |
      rate(geode_query_plan_cache_hits_total[5m]) /
        (rate(geode_query_plan_cache_hits_total[5m]) +
         rate(geode_query_plan_cache_misses_total[5m])) * 100
    Y-Axis: percent
    Thresholds: <70=red, <85=orange

Row 4: Query Details Table
  - Panel: Recent Slow Queries
    Type: Table
    Query: |
      topk(20,
        geode_query_duration_seconds{quantile="0.99"}
      )
    Columns:
      - Query ID
      - Query Text (truncated)
      - Duration (ms)
      - Rows Returned
      - Timestamp
```

### Transaction Dashboard

Monitor transaction behavior and ACID guarantees:

```yaml
Dashboard: Geode Transactions
Refresh: 10s
Time Range: Last 1 hour

Row 1: Transaction Throughput
  - Panel: Transactions per Second
    Type: Graph
    Queries:
      - Legend: Committed
        Query: rate(geode_transactions_total{status="committed"}[5m])
      - Legend: Rolled Back
        Query: rate(geode_transactions_total{status="rolled_back"}[5m])
    Stack: true

  - Panel: Commit Rate
    Type: Gauge
    Query: |
      rate(geode_transactions_total{status="committed"}[5m]) /
        rate(geode_transactions_total[5m]) * 100
    Thresholds: <95=red, <98=orange, >=98=green
    Unit: percent

Row 2: Transaction Performance
  - Panel: Transaction Duration
    Type: Graph
    Queries:
      - Legend: p50
        Query: histogram_quantile(0.50, rate(geode_transaction_duration_seconds_bucket[5m]))
      - Legend: p95
        Query: histogram_quantile(0.95, rate(geode_transaction_duration_seconds_bucket[5m]))
      - Legend: p99
        Query: histogram_quantile(0.99, rate(geode_transaction_duration_seconds_bucket[5m]))

  - Panel: Active Transactions
    Type: Graph
    Query: geode_active_transactions
    Y-Axis: count

Row 3: Conflicts and Retries
  - Panel: Conflict Rate
    Type: Graph
    Query: rate(geode_transaction_conflicts_total[5m])
    Y-Axis: conflicts/sec
    Thresholds: >100=red, >50=orange

  - Panel: Conflict Ratio
    Type: Graph
    Query: |
      rate(geode_transaction_conflicts_total[5m]) /
        rate(geode_transactions_total[5m]) * 100
    Y-Axis: percent
    Thresholds: >5=red, >2=orange

Row 4: Long-Running Transactions
  - Panel: Transactions >60s
    Type: Stat
    Query: geode_long_running_transactions{threshold="60s"}
    Thresholds: >5=red, >2=orange

  - Panel: Oldest Transaction Age
    Type: Stat
    Query: geode_oldest_transaction_age_seconds
    Unit: seconds
    Thresholds: >300=red, >120=orange
```

### Resource Utilization Dashboard

Track resource consumption and capacity:

```yaml
Dashboard: Geode Resource Utilization
Refresh: 30s
Time Range: Last 24 hours

Row 1: Memory
  - Panel: Memory Usage
    Type: Graph
    Queries:
      - Legend: Used
        Query: geode_memory_used_bytes
      - Legend: Total
        Query: geode_memory_total_bytes
    Y-Axis: bytes
    Format: IEC

  - Panel: Memory by Subsystem
    Type: Graph
    Query: sum by (subsystem) (geode_memory_used_bytes)
    Stack: true
    Y-Axis: bytes

Row 2: Disk
  - Panel: Disk Space
    Type: Graph
    Queries:
      - Legend: Used
        Query: geode_disk_used_bytes
      - Legend: Available
        Query: geode_disk_free_bytes
    Y-Axis: bytes
    Format: IEC

  - Panel: WAL Size
    Type: Graph
    Query: geode_wal_size_bytes
    Y-Axis: bytes
    Thresholds: >10GB=orange, >20GB=red

Row 3: I/O
  - Panel: Disk I/O Operations
    Type: Graph
    Queries:
      - Legend: Reads
        Query: rate(geode_disk_io_operations_total{type="read"}[5m])
      - Legend: Writes
        Query: rate(geode_disk_io_operations_total{type="write"}[5m])
    Y-Axis: ops/sec

  - Panel: Disk I/O Throughput
    Type: Graph
    Queries:
      - Legend: Read
        Query: rate(geode_disk_bytes_read_total[5m])
      - Legend: Write
        Query: rate(geode_disk_bytes_written_total[5m])
    Y-Axis: bytes/sec

Row 4: Cache
  - Panel: Cache Hit Rate
    Type: Graph
    Query: |
      rate(geode_cache_hits_total[5m]) /
        (rate(geode_cache_hits_total[5m]) + rate(geode_cache_misses_total[5m])) * 100
    Y-Axis: percent

  - Panel: Cache Size
    Type: Graph
    Query: geode_cache_size_bytes
    Y-Axis: bytes
```

## Grafana Configuration

### Data Source Setup

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    jsonData:
      timeInterval: "15s"
      queryTimeout: "60s"
      httpMethod: POST
```

### Dashboard Variables

Use template variables for dynamic filtering:

```yaml
templating:
  - name: instance
    type: query
    datasource: Prometheus
    query: label_values(geode_queries_total, instance)
    refresh: on_time_range_change
    multi: true
    includeAll: true

  - name: interval
    type: interval
    query: 1m,5m,10m,30m,1h
    auto: true
    auto_count: 30
    auto_min: 10s

  - name: user
    type: query
    datasource: Prometheus
    query: label_values(geode_queries_total, user)
    refresh: on_time_range_change
    multi: true
    includeAll: true
```

Use variables in queries:

```promql
# Filter by selected instance
rate(geode_queries_total{instance=~"$instance"}[$interval])

# Filter by selected user
sum by (user) (rate(geode_queries_total{user=~"$user"}[5m]))
```

### Panel Annotations

Add context with annotations:

```yaml
annotations:
  - name: Deployments
    datasource: Prometheus
    expr: |
      ALERTS{alertname="DeploymentCompleted"}
    titleFormat: "Deployment"
    textFormat: "{{ version }}"
    iconColor: green

  - name: Incidents
    datasource: Prometheus
    expr: |
      ALERTS{severity="critical"}
    titleFormat: "{{ alertname }}"
    textFormat: "{{ description }}"
    iconColor: red
```

## Dashboard Best Practices

### Performance Optimization

**Use Recording Rules**: Pre-compute expensive queries to reduce dashboard load time

```yaml
groups:
  - name: dashboard_recordings
    interval: 15s
    rules:
      - record: job:geode_query_latency_p95:5m
        expr: histogram_quantile(0.95, sum(rate(geode_query_duration_seconds_bucket[5m])) by (job, le))

      - record: job:geode_query_rate:5m
        expr: sum(rate(geode_queries_total[5m])) by (job, status)
```

Use in dashboard:

```promql
# Instead of complex query
histogram_quantile(0.95, sum(rate(geode_query_duration_seconds_bucket[5m])) by (le))

# Use recording rule
job:geode_query_latency_p95:5m
```

### Consistent Visualization

**Color Schemes**: Use consistent colors across dashboards
- Green: Good/Normal
- Yellow/Orange: Warning
- Red: Critical/Error
- Blue: Informational

**Units**: Use appropriate units consistently
- Time: seconds, milliseconds
- Data: bytes (IEC format: KiB, MiB, GiB)
- Rates: /sec

**Thresholds**: Set meaningful thresholds based on SLOs

### Dashboard Organization

**Folder Structure**:
```
Geode/
├── Overview/
│   └── System Overview
├── Performance/
│   ├── Query Performance
│   ├── Transaction Performance
│   └── Index Performance
├── Resources/
│   ├── Resource Utilization
│   ├── Memory Deep Dive
│   └── Disk Analysis
└── Operations/
    ├── Alerts
    └── Capacity Planning
```

### Dashboard Sharing

Export dashboards as JSON for version control:

```bash
# Export dashboard
curl -H "Authorization: Bearer ${API_KEY}" \
  "http://grafana:3000/api/dashboards/uid/geode-overview" \
  | jq '.dashboard' > geode-overview.json

# Import dashboard
curl -X POST -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d @geode-overview.json \
  "http://grafana:3000/api/dashboards/db"
```

## Related Topics

- [System Monitoring](/tags/monitoring/) - Monitoring strategies
- [Performance Metrics](/tags/metrics/) - Metrics collection
- [Grafana Visualization](/tags/grafana/) - Grafana setup
- [Prometheus Integration](/tags/prometheus/) - Prometheus configuration
- [System Observability](/tags/observability/) - Observability pillars
- [Alerting](/tags/alerting/) - Alert configuration

## Further Reading

- Dashboard Design Best Practices
- Grafana Dashboard Templates
- Prometheus Query Optimization
- Visual Analytics Principles
- Dashboard as Code
