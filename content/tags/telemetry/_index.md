---
title: "Telemetry & Observability"
description: "Learn about Geode's telemetry and observability capabilities. Discover how to monitor performance, track metrics, integrate with Prometheus and Grafana, and debug production issues effectively."
keywords:
  - telemetry
  - observability
  - monitoring
  - metrics
  - Geode
  - graph database
  - Prometheus
  - Grafana
  - performance monitoring
  - distributed tracing
  - logging
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/telemetry/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Comprehensive telemetry and observability are essential for operating Geode in production. Geode provides built-in instrumentation, metrics export, structured logging, and distributed tracing support for understanding system behavior, identifying performance bottlenecks, and troubleshooting issues efficiently.

## Metrics Collection

Geode exposes detailed metrics for monitoring database health and performance.

### Core Metrics

**Query Performance:**
```
geode_query_duration_seconds{quantile="0.50|0.95|0.99"}
geode_query_count_total{status="success|error"}
geode_query_result_rows{quantile="0.50|0.95|0.99"}
```

**Connection Pool:**
```
geode_pool_connections_active
geode_pool_connections_idle
geode_pool_connections_total
geode_pool_wait_duration_seconds{quantile="0.95|0.99"}
```

**Resource Utilization:**
```
geode_memory_usage_bytes{type="heap|graph|index"}
geode_cpu_usage_percent
geode_disk_usage_bytes{type="data|wal|index"}
```

**Graph Statistics:**
```
geode_nodes_total{label="User|Product|..."}
geode_relationships_total{type="FRIENDS_WITH|PURCHASED|..."}
geode_properties_total
```

## Prometheus Integration

Geode natively exports metrics in Prometheus format.

### Configuration

Enable Prometheus endpoint:

```bash
# Start Geode with metrics endpoint
./geode serve --metrics-port 9090
```

Or configure via config file:

```toml
[telemetry]
enabled = true
metrics_port = 9090
metrics_path = "/metrics"
```

### Prometheus Scrape Config

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 15s
    scrape_timeout: 10s
```

### Example Metrics Output

```
# HELP geode_query_duration_seconds Query execution time
# TYPE geode_query_duration_seconds summary
geode_query_duration_seconds{quantile="0.5"} 0.012
geode_query_duration_seconds{quantile="0.95"} 0.089
geode_query_duration_seconds{quantile="0.99"} 0.234
geode_query_duration_seconds_sum 1234.56
geode_query_duration_seconds_count 98765

# HELP geode_pool_connections_active Active database connections
# TYPE geode_pool_connections_active gauge
geode_pool_connections_active 42

# HELP geode_nodes_total Total number of nodes by label
# TYPE geode_nodes_total gauge
geode_nodes_total{label="User"} 1000000
geode_nodes_total{label="Product"} 500000
```

## Grafana Dashboards

Pre-built Grafana dashboards provide visual monitoring.

### Key Dashboard Panels

**Query Performance:**
```promql
# P95 Query Latency
histogram_quantile(0.95,
  rate(geode_query_duration_seconds_bucket[5m])
)

# Query Throughput
rate(geode_query_count_total[1m])

# Error Rate
rate(geode_query_count_total{status="error"}[5m]) /
rate(geode_query_count_total[5m])
```

**Resource Utilization:**
```promql
# Memory Usage
geode_memory_usage_bytes / geode_memory_limit_bytes * 100

# CPU Usage
rate(geode_cpu_usage_seconds_total[5m]) * 100

# Disk Usage
geode_disk_usage_bytes / geode_disk_capacity_bytes * 100
```

**Connection Pool Health:**
```promql
# Pool Utilization
geode_pool_connections_active / geode_pool_connections_total * 100

# Connection Wait Time
histogram_quantile(0.99,
  rate(geode_pool_wait_duration_seconds_bucket[5m])
)
```

### Dashboard Import

```bash
# Download pre-built dashboard
curl -O https://geodedb.com/grafana/geode-dashboard.json

# Import via Grafana UI or API
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @geode-dashboard.json
```

## Distributed Tracing

Geode supports OpenTelemetry for distributed tracing across services.

### OpenTelemetry Configuration

```toml
# geode.toml
[telemetry.tracing]
enabled = true
exporter = "jaeger"  # or "zipkin", "otlp"
endpoint = "http://jaeger:14268/api/traces"
sample_rate = 0.1  # Trace 10% of requests
```

### Trace Context Propagation

Geode automatically propagates trace context from client libraries:

**Go Client:**
```go
import "go.opentelemetry.io/otel"

ctx, span := tracer.Start(ctx, "fetch_user_network")
defer span.End()

// Trace context propagated to Geode
rows, err := db.QueryContext(ctx, `
    MATCH (u:User {id: ?})-[:FRIENDS_WITH]->(f)
    RETURN f
`, userID)
```

**Python Client:**
```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("fetch_user_network"):
    # Trace context propagated automatically
    results = await client.execute_gql("""
        MATCH (u:User {id: $id})-[:FRIENDS_WITH]->(f)
        RETURN f
    """, {"id": user_id})
```

### Trace Spans

Geode creates spans for internal operations:

```
Service Request
└─ Query Parsing (2ms)
└─ Query Planning (5ms)
└─ Query Execution (15ms)
   ├─ Index Lookup (3ms)
   ├─ Graph Traversal (10ms)
   └─ Result Serialization (2ms)
└─ Response Transmission (1ms)
```

## Structured Logging

Geode uses structured JSON logging for machine-readable logs.

### Log Levels

```bash
# Set log level
export GEODE_LOG_LEVEL=info  # debug|info|warn|error

# Start with specific level
./geode serve --log-level debug
```

### Log Format

```json
{
  "timestamp": "2026-01-24T14:30:00.123Z",
  "level": "info",
  "message": "Query executed successfully",
  "query_id": "q-12345",
  "duration_ms": 45,
  "result_rows": 100,
  "user_id": "user-456",
  "client_ip": "192.168.1.100"
}
```

### Log Aggregation

Forward logs to aggregation services:

**Loki:**
```yaml
# promtail.yml
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

**ELK Stack:**
```bash
# Forward to Elasticsearch
./geode serve --log-format json | \
  filebeat -e -c filebeat.yml
```

## Query Profiling

Detailed query profiling for performance optimization.

### PROFILE Command

```gql
PROFILE
MATCH (u:User {email: $email})-[:PURCHASED]->(p:Product)
RETURN p.name, p.price
ORDER BY p.price DESC
LIMIT 10
```

### Profile Output

```
Query Plan:
1. Index Lookup: User(email) [2ms, 1 row]
2. Expand Relationships: PURCHASED [8ms, 45 rows]
3. Project: p.name, p.price [1ms]
4. Sort: p.price DESC [3ms]
5. Limit: 10 [<1ms]

Total Execution Time: 15ms
Memory Allocated: 256KB
Rows Processed: 45
Rows Returned: 10

Index Usage:
- User.email: HIT (selectivity: 0.0001%)
```

### Query Metrics per Execution

```json
{
  "query_id": "q-67890",
  "execution_time_ms": 15,
  "planning_time_ms": 2,
  "rows_processed": 45,
  "rows_returned": 10,
  "memory_allocated_bytes": 262144,
  "index_lookups": 1,
  "index_hits": 1,
  "index_misses": 0,
  "traversal_depth": 1
}
```

## Performance Alerts

Configure alerts for performance degradation.

### Prometheus AlertManager Rules

```yaml
groups:
  - name: geode_performance
    rules:
      - alert: HighQueryLatency
        expr: |
          histogram_quantile(0.99,
            rate(geode_query_duration_seconds_bucket[5m])
          ) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High query latency detected"
          description: "P99 query latency is {{ $value }}s"

      - alert: HighErrorRate
        expr: |
          rate(geode_query_count_total{status="error"}[5m]) /
          rate(geode_query_count_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High query error rate"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: ConnectionPoolExhaustion
        expr: |
          geode_pool_connections_active /
          geode_pool_connections_total > 0.90
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Connection pool near capacity"

      - alert: MemoryPressure
        expr: |
          geode_memory_usage_bytes /
          geode_memory_limit_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
```

## Client-Side Telemetry

Client libraries emit telemetry for end-to-end visibility.

### Go Client Metrics

```go
import "go.codepros.org/geode/telemetry"

// Enable Prometheus metrics
telemetry.EnablePrometheus(":9091")

// Metrics exposed:
// - geode_client_queries_total
// - geode_client_query_duration_seconds
// - geode_client_connection_errors_total
// - geode_client_pool_connections_active
```

### Python Client Metrics

```python
from geode_client import GeodeClient, enable_telemetry

# Enable telemetry export
enable_telemetry(
    exporter="prometheus",
    port=9091
)

# Metrics tracked:
# - Query count and duration
# - Connection pool statistics
# - Error rates by type
```

## Real-Time Monitoring

Stream real-time metrics for operational dashboards.

### WebSocket Metrics Stream

```bash
# Subscribe to real-time metrics
wscat -c ws://localhost:3141/metrics/stream

# Receives JSON messages:
{
  "timestamp": "2026-01-24T14:30:00Z",
  "queries_per_second": 1250,
  "avg_latency_ms": 15,
  "active_connections": 42,
  "memory_usage_mb": 2048
}
```

### Metrics API

```bash
# HTTP endpoint for current metrics
curl http://localhost:3141/metrics/current

{
  "timestamp": "2026-01-24T14:30:00Z",
  "queries": {
    "total": 12345678,
    "rate_per_second": 1250,
    "avg_duration_ms": 15,
    "p95_duration_ms": 45,
    "p99_duration_ms": 120
  },
  "connections": {
    "active": 42,
    "idle": 8,
    "total": 50
  },
  "resources": {
    "memory_used_mb": 2048,
    "memory_total_mb": 4096,
    "cpu_percent": 45,
    "disk_used_gb": 120
  }
}
```

## Debugging Tools

Built-in tools for troubleshooting production issues.

### Slow Query Log

```toml
[logging]
slow_query_threshold_ms = 1000
slow_query_log = "/var/log/geode/slow-queries.log"
```

Logs queries exceeding threshold:

```json
{
  "timestamp": "2026-01-24T14:30:00Z",
  "duration_ms": 2340,
  "query": "MATCH (u:User)-[:FRIENDS_WITH*3..5]->(f) RETURN f",
  "parameters": {"user_id": "user-123"},
  "rows_returned": 50000,
  "execution_plan": "..."
}
```

### Connection Debugging

```bash
# List active connections
./geode admin connections list

# Connection details
./geode admin connections show <connection-id>

# Kill stuck connection
./geode admin connections kill <connection-id>
```

### Query Debugging

```bash
# Explain query execution plan
./geode shell --explain <<< "MATCH (u:User) WHERE u.email = 'test@example.com' RETURN u"

# Profile query performance
./geode shell --profile <<< "MATCH (u:User)-[:PURCHASED]->(p:Product) RETURN p"
```

## Best Practices

### Set Appropriate Alert Thresholds

Tune thresholds based on baseline performance:

- Latency alerts: p99 > 2x baseline
- Error rate alerts: >1% for critical queries
- Resource alerts: >80% utilization

### Sample Traces Intelligently

Balance observability with overhead:

- Production: 1-10% sampling
- Staging: 50-100% sampling
- Development: 100% sampling

### Retain Metrics Appropriately

Configure retention policies:

- Real-time metrics: 1-7 days (high resolution)
- Historical metrics: 90 days (downsampled)
- Long-term trends: 1 year (aggregated)

### Monitor Client and Server

Track metrics on both sides:

- Server metrics: Query performance, resource usage
- Client metrics: Connection pool, request latency
- End-to-end tracing: Full request lifecycle

Comprehensive telemetry enables proactive monitoring, rapid troubleshooting, and data-driven optimization of Geode deployments. Integration with standard observability tools like Prometheus, Grafana, and OpenTelemetry provides seamless operational visibility.
