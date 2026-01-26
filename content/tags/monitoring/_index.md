---
title: "Tag: Monitoring & Observability"
description: "Explore Geode documentation tagged with monitoring. Learn about monitoring features, best practices, and implementation details."
keywords:
  - monitoring
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/monitoring/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Monitoring and observability are essential for operating Geode in production environments. Comprehensive monitoring enables you to track system health, identify performance bottlenecks, detect anomalies, and respond to issues before they impact users.

Geode provides rich telemetry through Prometheus metrics, structured logging, distributed tracing, and real-time performance profiling. Combined with integration capabilities for popular monitoring stacks like Grafana, Datadog, and New Relic, Geode gives you deep visibility into your graph database operations.

This guide covers monitoring strategies, key metrics, alerting patterns, and best practices for maintaining observable Geode deployments.

## Key Monitoring Concepts

**Metrics**: Quantitative measurements of system behavior collected over time. Geode exposes hundreds of metrics covering queries, transactions, connections, memory, disk I/O, and more.

**Logs**: Structured event records providing detailed context about system operations, errors, and state changes. Geode uses structured JSON logging for easy parsing and analysis.

**Traces**: End-to-end tracking of requests through distributed systems. Geode supports OpenTelemetry for distributed tracing across services.

**Profiling**: Runtime analysis of query execution, resource utilization, and performance characteristics. Use Geode's `PROFILE` command for query-level profiling.

## Prometheus Metrics Integration

Geode exposes metrics in Prometheus format at the `/metrics` endpoint:

```bash
# Access metrics endpoint
curl http://localhost:3141/metrics

# Sample metrics output
geode_queries_total{status="success"} 12847
geode_queries_total{status="error"} 23
geode_query_duration_seconds_bucket{le="0.1"} 8234
geode_active_connections{client="go"} 45
geode_transaction_duration_seconds_sum 1847.3
```

**Configure Prometheus Scraping**:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['localhost:3141']
    scrape_interval: 15s
    scrape_timeout: 10s
```

## Essential Metrics to Monitor

**Query Performance Metrics**:
- `geode_queries_total`: Total query count by status
- `geode_query_duration_seconds`: Query latency histogram
- `geode_query_execution_plan_cache_hits`: Query plan cache effectiveness
- `geode_slow_queries_total`: Queries exceeding threshold

**Transaction Metrics**:
- `geode_transactions_total`: Transaction count by outcome (commit/rollback)
- `geode_transaction_duration_seconds`: Transaction latency
- `geode_transaction_conflicts_total`: Serialization conflicts
- `geode_active_transactions`: Currently executing transactions

**Connection Metrics**:
- `geode_active_connections`: Current client connections
- `geode_connection_errors_total`: Failed connection attempts
- `geode_connection_pool_size`: Connection pool utilization
- `geode_quic_streams_active`: Active QUIC streams

**Memory Metrics**:
- `geode_memory_used_bytes`: Total memory consumption
- `geode_cache_size_bytes`: Query cache and buffer pool sizes
- `geode_mvcc_versions_count`: MVCC version overhead
- `geode_memory_allocations_total`: Allocation rate

**Storage Metrics**:
- `geode_disk_used_bytes`: Disk space consumption
- `geode_wal_size_bytes`: Write-ahead log size
- `geode_disk_io_operations_total`: I/O operations by type
- `geode_checkpoint_duration_seconds`: Checkpoint performance

**Index Metrics**:
- `geode_index_size_bytes`: Index storage consumption
- `geode_index_lookups_total`: Index usage frequency
- `geode_index_build_duration_seconds`: Index creation time

## Structured Logging

Geode emits structured logs in JSON format for easy processing:

```json
{
  "timestamp": "2024-01-24T10:15:30.123Z",
  "level": "INFO",
  "message": "Query executed successfully",
  "query_id": "q-12847",
  "user": "analyst",
  "duration_ms": 45.3,
  "rows_returned": 1250,
  "plan_type": "indexed_lookup"
}
```

**Configure Log Levels**:

```toml
# geode.toml
[logging]
level = "INFO"  # DEBUG, INFO, WARN, ERROR
format = "json"
output = "stdout"
file = "/var/log/geode/geode.log"
rotate_size = "100MB"
rotate_count = 10
```

**Log Categories**:
- `query`: Query execution and planning
- `transaction`: Transaction lifecycle events
- `connection`: Client connections and disconnections
- `storage`: Disk I/O and persistence operations
- `replication`: Replication and cluster coordination
- `security`: Authentication and authorization events

## Query Profiling and Analysis

Use Geode's built-in profiling capabilities to analyze query performance:

```gql
-- Profile a query
PROFILE
MATCH (u:User)-[:FOLLOWS]->(other:User)
WHERE u.created_at > '2024-01-01'
RETURN u.name, count(other) as followers
ORDER BY followers DESC
LIMIT 10;
```

**Profile Output**:
```
┌────────────────────┬─────────┬─────────────┬───────────┐
│ Operator           │ Rows    │ Time (ms)   │ Memory    │
├────────────────────┼─────────┼─────────────┼───────────┤
│ Sort + Limit       │ 10      │ 2.3         │ 1.2 KB    │
│ Aggregation        │ 8,432   │ 45.7        │ 2.4 MB    │
│ Expand(FOLLOWS)    │ 421,082 │ 187.4       │ 12.8 MB   │
│ IndexSeek(User)    │ 8,432   │ 12.1        │ 856 KB    │
└────────────────────┴─────────┴─────────────┴───────────┘
```

**Explain Query Plans**:

```gql
-- View execution plan without running query
EXPLAIN
MATCH (u:User {email: 'user@example.com'})
RETURN u;
```

## Alerting Strategies

Configure alerts for critical conditions:

**High Error Rate**:
```yaml
# Prometheus alerting rule
groups:
  - name: geode_alerts
    rules:
      - alert: HighQueryErrorRate
        expr: |
          rate(geode_queries_total{status="error"}[5m]) > 10
        for: 5m
        annotations:
          summary: "High query error rate detected"
          description: "Error rate is {{ $value }} errors/sec"
```

**Slow Query Detection**:
```yaml
- alert: SlowQueriesIncreasing
  expr: |
    rate(geode_slow_queries_total[5m]) > 5
  for: 10m
  annotations:
    summary: "Slow query rate increasing"
```

**Connection Pool Exhaustion**:
```yaml
- alert: ConnectionPoolExhausted
  expr: |
    geode_active_connections >= geode_max_connections * 0.9
  for: 5m
  annotations:
    summary: "Connection pool near capacity"
```

**Disk Space Low**:
```yaml
- alert: DiskSpaceLow
  expr: |
    geode_disk_free_bytes / geode_disk_total_bytes < 0.1
  for: 15m
  annotations:
    summary: "Disk space below 10%"
```

**Transaction Conflict Rate High**:
```yaml
- alert: HighTransactionConflicts
  expr: |
    rate(geode_transaction_conflicts_total[5m]) > 100
  for: 10m
  annotations:
    summary: "High transaction conflict rate"
```

## Grafana Dashboard Integration

Create comprehensive Grafana dashboards for Geode monitoring:

**Query Performance Dashboard**:
```json
{
  "dashboard": {
    "title": "Geode Query Performance",
    "panels": [
      {
        "title": "Query Rate",
        "targets": [{
          "expr": "rate(geode_queries_total[5m])"
        }]
      },
      {
        "title": "Query Latency (p95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))"
        }]
      },
      {
        "title": "Active Queries",
        "targets": [{
          "expr": "geode_active_queries"
        }]
      }
    ]
  }
}
```

## Distributed Tracing

Enable OpenTelemetry tracing for end-to-end visibility:

```toml
# geode.toml
[tracing]
enabled = true
exporter = "otlp"
endpoint = "http://localhost:4317"
sample_rate = 0.1  # Sample 10% of traces
```

**Trace Example**:
```
Trace: user_recommendation_flow
├─ http_request [200ms]
│  └─ geode_query: match_user_preferences [120ms]
│     ├─ index_lookup: user_by_id [5ms]
│     ├─ expand_relationships: purchased [80ms]
│     └─ aggregation: compute_scores [35ms]
└─ cache_update [10ms]
```

## Health Checks and Readiness

Implement health check endpoints for orchestration platforms:

```bash
# Liveness probe (is Geode running?)
curl http://localhost:3141/health/live
# Returns: {"status": "ok"}

# Readiness probe (can Geode serve traffic?)
curl http://localhost:3141/health/ready
# Returns: {"status": "ready", "connections": 45, "queries_per_sec": 127}
```

**Kubernetes Configuration**:
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3141
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3141
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Performance Tuning with Monitoring Data

Use monitoring data to identify optimization opportunities:

**Identify Hot Queries**:
```gql
-- View query statistics
SELECT query_text, execution_count, avg_duration_ms, max_duration_ms
FROM system.query_stats
WHERE execution_count > 1000
ORDER BY avg_duration_ms DESC
LIMIT 20;
```

**Analyze Index Usage**:
```gql
-- Find unused indexes
SELECT index_name, table_name, usage_count
FROM system.index_stats
WHERE usage_count = 0
  AND created_at < current_timestamp() - INTERVAL '7 days';
```

**Monitor Cache Effectiveness**:
```gql
-- Check cache hit rates
SELECT
  cache_hits / (cache_hits + cache_misses) as hit_rate,
  cache_evictions
FROM system.cache_stats;
```

## Troubleshooting Common Issues

**High Query Latency**:
1. Check `PROFILE` output for slow operators
2. Verify index usage with `EXPLAIN`
3. Review concurrent query load
4. Check memory pressure and cache hit rates

**Connection Issues**:
1. Monitor `geode_active_connections` vs. limits
2. Check network latency between client and server
3. Review authentication failures in logs
4. Verify TLS certificate validity

**Memory Growth**:
1. Check MVCC version accumulation
2. Review long-running transactions
3. Analyze query result set sizes
4. Monitor cache sizes

**Disk Space Issues**:
1. Check WAL size growth
2. Review checkpoint frequency
3. Analyze data growth rate
4. Verify backup and archival processes

## Best Practices

**Establish Baselines**: Monitor systems under normal load to establish performance baselines for comparison.

**Set Appropriate Thresholds**: Tune alert thresholds based on actual system behavior to minimize false positives.

**Implement Gradual Rollout**: When deploying changes, monitor metrics closely during incremental rollouts.

**Correlate Metrics with Events**: Link monitoring data with deployment events, configuration changes, and incidents.

**Automate Responses**: Implement auto-scaling, auto-remediation, and circuit breakers based on monitoring signals.

**Regular Review**: Periodically review dashboards, alerts, and runbooks to keep them relevant.

## Related Topics

- [Prometheus Metrics & Monitoring](/tags/prometheus/)
- [Performance Tuning](/tags/performance/)
- [Query Optimization](/tags/query-optimization/)
- [Observability Best Practices](/tags/observability/)
- [Operations and DevOps](/tags/operations/)
- [Profiling and Analysis](/tags/profiling/)
- [Troubleshooting Guide](/tags/troubleshooting/)

## Further Reading

- Monitoring and Observability Guide
- Grafana Dashboard Templates
- Alert Runbook Templates
- Performance Tuning Handbook
- Production Operations Checklist
