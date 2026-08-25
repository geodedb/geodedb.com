---
title: "Tag: Prometheus Metrics & Monitoring"
description: "Explore Geode documentation tagged with prometheus. Learn about prometheus features, best practices, and implementation details."
keywords:
  - prometheus
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/prometheus/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Prometheus is the industry-standard monitoring solution for cloud-native applications, and Geode provides first-class Prometheus integration. Geode exposes comprehensive metrics covering queries, transactions, connections, storage, memory, and system health through a Prometheus-compatible `/metrics` endpoint.

By integrating Geode with Prometheus, you gain real-time visibility into database performance, can set up intelligent alerting on critical conditions, and build comprehensive dashboards for operational insights. Combined with Grafana for visualization, Prometheus and Geode form a powerful observability stack for production graph database deployments.

This guide covers Prometheus integration patterns, essential metrics, alerting rules, and visualization strategies for monitoring Geode effectively.

## Prometheus Architecture with Geode

Prometheus uses a pull-based model where it periodically scrapes metrics from instrumented applications. Geode exposes metrics at `http://geode-host:8080/metrics` in Prometheus exposition format:

```
# HELP geode_queries_total Total number of queries executed
# TYPE geode_queries_total counter
geode_queries_total{status="success"} 125847
geode_queries_total{status="error"} 342

# HELP geode_query_duration_seconds Query execution duration
# TYPE geode_query_duration_seconds histogram
geode_query_duration_seconds_bucket{le="0.01"} 45234
geode_query_duration_seconds_bucket{le="0.05"} 89432
geode_query_duration_seconds_bucket{le="0.1"} 112847
geode_query_duration_seconds_sum 12847.3
geode_query_duration_seconds_count 125847
```

## Configuring Prometheus Scraping

**Basic Prometheus Configuration**:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'geode-production'

scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['localhost:8080']
        labels:
          instance: 'geode-primary'
          environment: 'production'
    scrape_interval: 10s
    scrape_timeout: 5s
    metrics_path: '/metrics'
```

**Multi-Instance Configuration**:

```yaml
scrape_configs:
  - job_name: 'geode-cluster'
    static_configs:
      - targets:
        - 'geode-node-1:8080'
        - 'geode-node-2:8080'
        - 'geode-node-3:8080'
        labels:
          cluster: 'geode-prod'
          datacenter: 'us-east-1'
```

**Kubernetes Service Discovery**:

```yaml
scrape_configs:
  - job_name: 'geode-k8s'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - geode
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: geode
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: instance
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
```

## Essential Geode Metrics

**Query Performance Metrics**:

```promql
# Query rate by status
rate(geode_queries_total[5m])

# Average query duration (p50, p95, p99)
histogram_quantile(0.50, rate(geode_query_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(geode_query_duration_seconds_bucket[5m]))

# Slow query rate (queries > 1s)
rate(geode_slow_queries_total[5m])

# Query errors by type
sum by (error_type) (rate(geode_query_errors_total[5m]))
```

**Transaction Metrics**:

```promql
# Transaction commit rate
rate(geode_transactions_total{status="committed"}[5m])

# Transaction rollback rate
rate(geode_transactions_total{status="rolled_back"}[5m])

# Transaction conflict rate
rate(geode_transaction_conflicts_total[5m])

# Active transactions
geode_active_transactions

# Transaction duration
histogram_quantile(0.95, rate(geode_transaction_duration_seconds_bucket[5m]))
```

**Connection Metrics**:

```promql
# Active connections
geode_active_connections

# Connection pool utilization
geode_active_connections / geode_max_connections * 100

# Connection error rate
rate(geode_connection_errors_total[5m])

# Connections by client type
sum by (client_type) (geode_active_connections)
```

**Memory and Resource Metrics**:

```promql
# Memory usage
geode_memory_used_bytes

# Memory usage percentage
geode_memory_used_bytes / geode_memory_total_bytes * 100

# Cache hit rate
rate(geode_cache_hits_total[5m]) /
  (rate(geode_cache_hits_total[5m]) + rate(geode_cache_misses_total[5m]))

# MVCC version count
geode_mvcc_versions_total

# Garbage collection time
rate(geode_gc_duration_seconds_sum[5m])
```

**Storage Metrics**:

```promql
# Disk space used
geode_disk_used_bytes

# Disk space available
geode_disk_free_bytes

# WAL size
geode_wal_size_bytes

# Disk I/O operations
rate(geode_disk_io_operations_total[5m])

# Checkpoint duration
geode_checkpoint_duration_seconds
```

**Index Metrics**:

```promql
# Index size
geode_index_size_bytes

# Index lookups
rate(geode_index_lookups_total[5m])

# Index hit rate
rate(geode_index_hits_total[5m]) / rate(geode_index_lookups_total[5m])
```

## Alerting Rules

**Critical Alerts**:

```yaml
groups:
  - name: geode_critical
    interval: 30s
    rules:
      - alert: GeodeDown
        expr: up{job="geode"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Geode instance {{ $labels.instance }} is down"
          description: "Geode has been unreachable for more than 1 minute"

      - alert: HighQueryErrorRate
        expr: |
          rate(geode_queries_total{status="error"}[5m]) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High query error rate on {{ $labels.instance }}"
          description: "Query error rate is {{ $value }} errors/sec"

      - alert: DiskSpaceCritical
        expr: |
          geode_disk_free_bytes / geode_disk_total_bytes < 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Critical disk space on {{ $labels.instance }}"
          description: "Only {{ $value | humanizePercentage }} disk space remaining"

      - alert: MemoryExhaustion
        expr: |
          geode_memory_used_bytes / geode_memory_total_bytes > 0.95
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Memory near exhaustion on {{ $labels.instance }}"
          description: "Memory usage at {{ $value | humanizePercentage }}"
```

**Warning Alerts**:

```yaml
  - name: geode_warnings
    interval: 1m
    rules:
      - alert: SlowQueryRateIncreasing
        expr: |
          rate(geode_slow_queries_total[5m]) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow query rate increasing on {{ $labels.instance }}"
          description: "{{ $value }} slow queries per second"

      - alert: HighTransactionConflicts
        expr: |
          rate(geode_transaction_conflicts_total[5m]) > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High transaction conflict rate"
          description: "{{ $value }} conflicts per second"

      - alert: ConnectionPoolPressure
        expr: |
          geode_active_connections / geode_max_connections > 0.8
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Connection pool pressure on {{ $labels.instance }}"
          description: "{{ $value | humanizePercentage }} of connections used"

      - alert: LongRunningQueries
        expr: |
          geode_active_queries{duration_seconds=">60"} > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Multiple long-running queries detected"
          description: "{{ $value }} queries running for >60 seconds"

      - alert: WalSizeGrowing
        expr: |
          deriv(geode_wal_size_bytes[30m]) > 1e9
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "WAL size growing rapidly on {{ $labels.instance }}"
          description: "WAL growing at {{ $value | humanize1024 }}/sec"
```

## Grafana Dashboard Queries

**Query Performance Dashboard**:

```promql
# Panel: Query Rate
sum(rate(geode_queries_total[5m])) by (status)

# Panel: Query Latency Percentiles
histogram_quantile(0.50, sum(rate(geode_query_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.95, sum(rate(geode_query_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(geode_query_duration_seconds_bucket[5m])) by (le))

# Panel: Top Slow Queries
topk(10, geode_query_duration_seconds{quantile="0.99"})

# Panel: Query Errors by Type
sum by (error_type) (rate(geode_query_errors_total[5m]))
```

**System Health Dashboard**:

```promql
# Panel: CPU Usage
rate(geode_cpu_seconds_total[5m]) * 100

# Panel: Memory Usage
geode_memory_used_bytes / geode_memory_total_bytes * 100

# Panel: Disk Usage
geode_disk_used_bytes / geode_disk_total_bytes * 100

# Panel: Active Connections
geode_active_connections
```

**Transaction Dashboard**:

```promql
# Panel: Transaction Throughput
rate(geode_transactions_total{status="committed"}[5m])

# Panel: Transaction Success Rate
rate(geode_transactions_total{status="committed"}[5m]) /
  rate(geode_transactions_total[5m]) * 100

# Panel: Transaction Conflicts
rate(geode_transaction_conflicts_total[5m])

# Panel: Transaction Duration Heatmap
sum(rate(geode_transaction_duration_seconds_bucket[5m])) by (le)
```

## Recording Rules for Performance

Pre-aggregate expensive queries using recording rules:

```yaml
groups:
  - name: geode_recordings
    interval: 15s
    rules:
      - record: job:geode_query_rate:5m
        expr: sum(rate(geode_queries_total[5m])) by (job, instance)

      - record: job:geode_query_latency_p95:5m
        expr: histogram_quantile(0.95, sum(rate(geode_query_duration_seconds_bucket[5m])) by (job, instance, le))

      - record: job:geode_memory_usage_percent:current
        expr: |
          geode_memory_used_bytes / geode_memory_total_bytes * 100

      - record: job:geode_cache_hit_rate:5m
        expr: |
          rate(geode_cache_hits_total[5m]) /
            (rate(geode_cache_hits_total[5m]) + rate(geode_cache_misses_total[5m]))
```

## Advanced Monitoring Patterns

**Predict Disk Fullness**:

```promql
predict_linear(geode_disk_free_bytes[1h], 4 * 3600) < 0
```

**Detect Anomalies in Query Rate**:

```promql
abs(rate(geode_queries_total[5m]) -
    avg_over_time(rate(geode_queries_total[5m])[1h:5m])) >
  2 * stddev_over_time(rate(geode_queries_total[5m])[1h:5m])
```

**Correlate Query Performance with Memory Pressure**:

```promql
rate(geode_query_duration_seconds_sum[5m]) /
  rate(geode_query_duration_seconds_count[5m])
  and
  geode_memory_used_bytes / geode_memory_total_bytes > 0.8
```

## Federation for Multi-Cluster Monitoring

Monitor multiple Geode clusters from a central Prometheus:

```yaml
# Central Prometheus configuration
scrape_configs:
  - job_name: 'federate-us-east'
    honor_labels: true
    metrics_path: '/federate'
    params:
      'match[]':
        - '{job="geode"}'
    static_configs:
      - targets:
        - 'prometheus-us-east:9090'
        labels:
          region: 'us-east-1'

  - job_name: 'federate-us-west'
    honor_labels: true
    metrics_path: '/federate'
    params:
      'match[]':
        - '{job="geode"}'
    static_configs:
      - targets:
        - 'prometheus-us-west:9090'
        labels:
          region: 'us-west-2'
```

## Advanced Prometheus Patterns

### Dynamic Service Discovery

For dynamic Geode clusters, use service discovery:

```yaml
# Consul service discovery
scrape_configs:
  - job_name: 'geode-consul'
    consul_sd_configs:
      - server: 'localhost:8500'
        services: ['geode']
    relabel_configs:
      - source_labels: [__meta_consul_service]
        target_label: job
      - source_labels: [__meta_consul_node]
        target_label: instance
      - source_labels: [__meta_consul_tags]
        regex: '.*,environment=([^,]+),.*'
        target_label: environment
```

### Custom Exporters

Create custom exporters for Geode-specific metrics:

```python
# geode_exporter.py
from prometheus_client import start_http_server, Gauge, Counter
import asyncio
from geode_client import Client

# Define custom metrics
active_queries_gauge = Gauge('geode_custom_active_queries',
                             'Currently executing queries',
                             ['query_type'])

cache_memory_gauge = Gauge('geode_custom_cache_memory_bytes',
                          'Memory used by query cache')

async def collect_custom_metrics(client):
    """Collect custom Geode metrics"""
    while True:
        # The server does not list running queries (`system.*` is not a Geode
        # namespace). Export what your own client layer knows instead — the
        # in-flight statements this process has issued.
        result = inflight_statements_by_type()   # {'MATCH': 3, 'CREATE': 1, ...}

        for row in result:
            active_queries_gauge.labels(
                query_type=row['query_type']
            ).set(row['count'])

        # Server memory is already exported by the server itself as
        # `geode_memory_bytes` on GEODE_METRICS_PORT; scrape that endpoint
        # rather than re-exporting it. There is no cache-statistics procedure.

        await asyncio.sleep(15)  # Scrape interval

if __name__ == '__main__':
    start_http_server(9090)
    client = Client("localhost:3141")
    asyncio.run(collect_custom_metrics(client))
```

### Metric Relabeling

Transform metrics during scraping:

```yaml
scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['localhost:8080']
    metric_relabel_configs:
      # Drop high-cardinality debug metrics in production
      - source_labels: [__name__]
        regex: 'geode_debug_.*'
        action: drop

      # Rename legacy metrics
      - source_labels: [__name__]
        regex: 'geode_old_metric_name'
        target_label: __name__
        replacement: 'geode_new_metric_name'

      # Aggregate instance-level metrics to cluster level
      - source_labels: [instance]
        regex: 'geode-node-.*'
        target_label: cluster
        replacement: 'geode-production'
```

## Alert Management

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

route:
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'team-database'
  routes:
    - match:
        severity: critical
      receiver: 'team-database-pager'
      continue: true

    - match:
        severity: warning
      receiver: 'team-database-slack'

receivers:
  - name: 'team-database'
    email_configs:
      - to: 'database-team@example.com'

  - name: 'team-database-pager'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'

  - name: 'team-database-slack'
    slack_configs:
      - channel: '#database-alerts'
        title: 'Geode Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

### Alert Inhibition Rules

Prevent alert storms with inhibition:

```yaml
# alertmanager.yml (continued)
inhibit_rules:
  # Don't alert on high memory if instance is down
  - source_match:
      severity: 'critical'
      alertname: 'GeodeDown'
    target_match:
      severity: 'warning'
    equal: ['instance']

  # Don't alert on slow queries if database is overloaded
  - source_match:
      alertname: 'HighQueryErrorRate'
    target_match:
      alertname: 'SlowQueryRateIncreasing'
    equal: ['instance']
```

### Alert Templates

Create informative alert messages:

```yaml
groups:
  - name: geode_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          rate(geode_queries_total{status="error"}[5m]) > 10
        annotations:
          summary: "High query error rate on {{ $labels.instance }}"
          description: |
            Query error rate is {{ $value | humanize }} errors/sec.

            Current stats:
            - Instance: {{ $labels.instance }}
            - Error rate: {{ $value | humanize }}/sec
            - Time: {{ $labels.timestamp }}

            Runbook: https://docs.geodedb.com/runbooks/high-error-rate
          dashboard: "https://grafana.example.com/d/geode-errors"
          runbook_url: "https://docs.geodedb.com/runbooks/high-error-rate"
```

## Grafana Integration

### Provisioning Dashboards

```yaml
# grafana/provisioning/dashboards/geode.yml
apiVersion: 1

providers:
  - name: 'Geode'
    orgId: 1
    folder: 'Database'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/dashboards/geode
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
        "datasource": "Prometheus",
        "query": "label_values(geode_up, instance)",
        "multi": true,
        "includeAll": true
      },
      {
        "name": "time_range",
        "type": "interval",
        "query": "1m,5m,15m,30m,1h,6h,12h,1d",
        "current": {
          "text": "5m",
          "value": "5m"
        }
      }
    ]
  },
  "panels": [
    {
      "title": "Query Rate",
      "targets": [
        {
          "expr": "sum(rate(geode_queries_total{instance=~\"$instance\"}[$time_range]))"
        }
      ]
    }
  ]
}
```

### Panel Examples

**Heatmap Panel** for query duration distribution:

```json
{
  "type": "heatmap",
  "title": "Query Duration Heatmap",
  "targets": [
    {
      "expr": "sum(rate(geode_query_duration_seconds_bucket{instance=~\"$instance\"}[$time_range])) by (le)",
      "format": "heatmap",
      "legendFormat": "{{le}}"
    }
  ],
  "dataFormat": "tsbuckets",
  "yAxis": {
    "format": "s"
  }
}
```

**Status Panel** for system health:

```json
{
  "type": "stat",
  "title": "System Status",
  "targets": [
    {
      "expr": "up{job=\"geode\"}",
      "instant": true
    }
  ],
  "mappings": [
    {
      "value": 1,
      "text": "UP",
      "color": "green"
    },
    {
      "value": 0,
      "text": "DOWN",
      "color": "red"
    }
  ]
}
```

## Advanced Querying Techniques

### Quantile Aggregation

Calculate percentiles across multiple instances:

```promql
# P99 query latency across all instances
histogram_quantile(0.99,
  sum(rate(geode_query_duration_seconds_bucket[5m])) by (le)
)

# P99 per instance
histogram_quantile(0.99,
  sum(rate(geode_query_duration_seconds_bucket[5m])) by (le, instance)
)
```

### Rate Calculation Windows

Choose appropriate time windows:

```promql
# Very short window (1m) - noisy but responsive
rate(geode_queries_total[1m])

# Medium window (5m) - balanced
rate(geode_queries_total[5m])

# Long window (1h) - smooth but slow to react
rate(geode_queries_total[1h])

# Use irate for instant rate (last 2 samples)
irate(geode_queries_total[5m])
```

### Subquery Patterns

Calculate rate of rate (acceleration):

```promql
# Query acceleration (change in query rate)
deriv(
  rate(geode_queries_total[5m])[10m:1m]
)

# Predict future value
predict_linear(geode_queries_total[1h], 3600)
```

## Monitoring at Scale

### Hierarchical Federation

For large deployments with multiple regions:

```yaml
# Regional Prometheus federates from local instances
- job_name: 'federate-local'
  honor_labels: true
  metrics_path: '/federate'
  params:
    'match[]':
      - '{job="geode"}'
  static_configs:
    - targets:
      - 'prometheus-az1:9090'
      - 'prometheus-az2:9090'
      - 'prometheus-az3:9090'

# Global Prometheus federates from regional instances
- job_name: 'federate-regional'
  honor_labels: true
  metrics_path: '/federate'
  params:
    'match[]':
      - '{job="geode"}'
  static_configs:
    - targets:
      - 'prometheus-us-east:9090'
      - 'prometheus-us-west:9090'
      - 'prometheus-eu-west:9090'
```

### Remote Write for Long-Term Storage

Send metrics to long-term storage:

```yaml
remote_write:
  - url: "https://prometheus-remote-storage.example.com/api/v1/write"
    basic_auth:
      username: 'geode-metrics'
      password: 'SECRET'
    write_relabel_configs:
      # Only send aggregate metrics for long-term storage
      - source_labels: [__name__]
        regex: 'geode_(queries_total|query_duration_seconds_bucket|memory_used_bytes)'
        action: keep
    queue_config:
      capacity: 10000
      max_shards: 10
      min_shards: 1
      max_samples_per_send: 5000
```

### Thanos for Global View

Deploy Thanos for unlimited retention and global querying:

```yaml
# Prometheus with Thanos sidecar
global:
  external_labels:
    cluster: 'geode-production'
    region: 'us-east-1'

# Thanos sidecar configuration
--storage.tsdb.path=/prometheus
--objstore.config-file=/etc/thanos/bucket.yml
--grpc-address=0.0.0.0:10901
--http-address=0.0.0.0:10902
```

## Best Practices

**Appropriate Scrape Intervals**: Balance between data resolution and storage overhead. 15-30 seconds works well for most deployments.

**Use Recording Rules**: Pre-compute expensive queries to reduce dashboard load times.

**Set Alert Thresholds Based on Baselines**: Monitor normal behavior before setting alert thresholds to minimize false positives.

**Implement Alert Routing**: Use Alertmanager to route alerts to appropriate teams and communication channels.

**Retain Historical Data**: Configure appropriate retention periods to support trend analysis and capacity planning.

**Monitor Prometheus Itself**: Ensure your monitoring system is healthy and performant.

**Label Consistently**: Use consistent label naming across all metrics for easier querying and aggregation.

**Dashboard Organization**: Create focused dashboards for different personas (developers, operators, executives).

**Metric Naming**: Follow Prometheus naming conventions (unit suffix, descriptive names).

**Cardinality Management**: Keep label cardinality bounded to prevent memory issues.

## Troubleshooting Common Issues

**Missing Metrics**: Verify Geode metrics endpoint is accessible and Prometheus can reach it.

**High Cardinality**: Avoid labels with unbounded values (e.g., user IDs, session IDs).

**Storage Issues**: Monitor Prometheus disk usage and adjust retention policies as needed.

**Slow Queries**: Use recording rules to pre-aggregate complex queries used in dashboards.

**Scrape Failures**: Check network connectivity, TLS certificates, and authentication.

**Out of Memory**: Reduce retention period, use recording rules, or add more RAM.

**Slow Dashboards**: Optimize queries, use recording rules, reduce time ranges.

## Production Deployment Checklist

- [ ] Scrape intervals configured appropriately
- [ ] Recording rules created for expensive queries
- [ ] Alert rules defined and tested
- [ ] Alertmanager configured with proper routing
- [ ] Dashboards created for key metrics
- [ ] Retention period set based on requirements
- [ ] Backup strategy for Prometheus data
- [ ] Monitoring of Prometheus itself
- [ ] High availability setup (if required)
- [ ] Documentation of metrics and alerts
- [ ] Runbooks created for common alerts
- [ ] Load testing of monitoring stack

## Related Topics

- [Monitoring and Observability](/tags/monitoring/)
- [Metrics and Performance](/tags/metrics/)
- [Observability Best Practices](/tags/observability/)
- [Grafana Dashboards](/tags/tools/)
- [Alerting Strategies](/tags/operations/)
- [Performance Tuning](/tags/performance/)

## Further Reading

- Prometheus Configuration Guide
- Grafana Dashboard Templates for Geode
- Alert Runbook Examples
- Performance Tuning with Metrics
- Multi-Cluster Monitoring Patterns
- Prometheus Best Practices
- Recording Rules Guide
- Federation Patterns
