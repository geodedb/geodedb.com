---
title: "Performance Metrics"
description: "Comprehensive guide to performance metrics in Geode including query metrics, transaction metrics, system metrics, custom instrumentation, and metrics-driven optimization."
keywords:
  - metrics
  - performance metrics
  - monitoring
  - instrumentation
  - Prometheus
  - telemetry
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/metrics/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Performance metrics are quantitative measurements that provide visibility into Geode's operational behavior, resource utilization, and query performance. Geode exposes hundreds of metrics covering every aspect of database operations, from query execution times and transaction throughput to memory consumption and disk I/O patterns.

By collecting and analyzing metrics, you can identify performance bottlenecks, detect anomalies, optimize resource allocation, and ensure your Geode deployment meets service level objectives (SLOs). Metrics form the foundation of observability, enabling data-driven decisions about scaling, tuning, and capacity planning.

This guide covers Geode's metrics architecture, key performance indicators (KPIs), collection strategies, and metrics-driven optimization techniques.

## Metrics Architecture

Geode implements a multi-layered metrics system built on industry standards:

**Prometheus Exposition Format**: Metrics are exposed at `/metrics` endpoint in Prometheus-compatible format, making integration with monitoring stacks straightforward.

**Hierarchical Organization**: Metrics are organized by subsystem (queries, transactions, storage, memory, connections) with consistent naming conventions.

**Low Overhead**: Metrics collection uses lock-free data structures and sampling techniques to minimize performance impact.

**Rich Labels**: Metrics include dimensional labels for filtering and aggregation (e.g., query status, client type, operation type).

## Core Metric Types

### Counter Metrics

Counters track cumulative totals that only increase over time. Use rate functions to convert to per-second rates:

```promql
# Total queries executed
geode_queries_total{status="success"} 1,284,372

# Query rate (queries per second)
rate(geode_queries_total[5m])
```

**Key Counters**:
- `geode_queries_total` - Total queries by status (success/error)
- `geode_transactions_total` - Total transactions by outcome
- `geode_connection_errors_total` - Failed connection attempts
- `geode_disk_io_operations_total` - Disk I/O operations by type
- `geode_cache_misses_total` - Cache miss count

### Gauge Metrics

Gauges represent point-in-time measurements that can increase or decrease:

```promql
# Current active connections
geode_active_connections 127

# Memory usage in bytes
geode_memory_used_bytes 2,147,483,648

# Active transactions
geode_active_transactions 15
```

**Key Gauges**:
- `geode_active_connections` - Current client connections
- `geode_active_queries` - Currently executing queries
- `geode_memory_used_bytes` - Total memory consumption
- `geode_disk_used_bytes` - Disk space used
- `geode_connection_pool_size` - Connection pool utilization

### Histogram Metrics

Histograms track distributions of values across predefined buckets, enabling percentile calculations:

```promql
# Query duration buckets
geode_query_duration_seconds_bucket{le="0.01"} 45,234
geode_query_duration_seconds_bucket{le="0.05"} 89,432
geode_query_duration_seconds_bucket{le="0.1"} 112,847
geode_query_duration_seconds_bucket{le="1.0"} 125,234
geode_query_duration_seconds_bucket{le="+Inf"} 125,847

# Calculate p95 latency
histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))
```

**Key Histograms**:
- `geode_query_duration_seconds` - Query execution time distribution
- `geode_transaction_duration_seconds` - Transaction duration distribution
- `geode_checkpoint_duration_seconds` - Checkpoint time distribution
- `geode_index_build_duration_seconds` - Index creation time distribution

### Summary Metrics

Summaries pre-calculate percentiles on the client side:

```promql
geode_query_latency{quantile="0.5"} 0.012
geode_query_latency{quantile="0.9"} 0.087
geode_query_latency{quantile="0.99"} 0.342
```

## Query Performance Metrics

Track query execution characteristics to identify optimization opportunities:

**Query Throughput**:
```promql
# Total query rate
sum(rate(geode_queries_total[5m]))

# Success rate percentage
rate(geode_queries_total{status="success"}[5m]) /
  rate(geode_queries_total[5m]) * 100
```

**Query Latency**:
```promql
# Median query time (p50)
histogram_quantile(0.50, rate(geode_query_duration_seconds_bucket[5m]))

# p95 query time (95% of queries complete faster)
histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))

# p99 query time (worst-case for 99% of queries)
histogram_quantile(0.99, rate(geode_query_duration_seconds_bucket[5m]))
```

**Query Plan Cache**:
```promql
# Cache hit rate (percentage)
rate(geode_query_plan_cache_hits_total[5m]) /
  (rate(geode_query_plan_cache_hits_total[5m]) +
   rate(geode_query_plan_cache_misses_total[5m])) * 100

# Cache size
geode_query_plan_cache_size_bytes
```

**Slow Queries**:
```promql
# Slow query rate (queries exceeding threshold)
rate(geode_slow_queries_total[5m])

# Slow query threshold (default 1 second)
geode_slow_query_threshold_seconds
```

## Transaction Metrics

Monitor transaction behavior and ACID guarantees:

**Transaction Throughput**:
```promql
# Commits per second
rate(geode_transactions_total{status="committed"}[5m])

# Rollbacks per second
rate(geode_transactions_total{status="rolled_back"}[5m])

# Commit ratio
rate(geode_transactions_total{status="committed"}[5m]) /
  rate(geode_transactions_total[5m]) * 100
```

**Transaction Conflicts**:
```promql
# Serialization conflict rate
rate(geode_transaction_conflicts_total[5m])

# Conflict ratio (conflicts per transaction)
rate(geode_transaction_conflicts_total[5m]) /
  rate(geode_transactions_total[5m])
```

**Transaction Duration**:
```promql
# Average transaction duration
rate(geode_transaction_duration_seconds_sum[5m]) /
  rate(geode_transaction_duration_seconds_count[5m])

# p95 transaction duration
histogram_quantile(0.95, rate(geode_transaction_duration_seconds_bucket[5m]))
```

**Long-Running Transactions**:
```promql
# Transactions exceeding 60 seconds
geode_long_running_transactions{threshold="60s"}

# Oldest active transaction age
geode_oldest_transaction_age_seconds
```

## Connection Metrics

Track client connectivity and connection pool health:

**Connection Utilization**:
```promql
# Current active connections
geode_active_connections

# Connection pool utilization percentage
geode_active_connections / geode_max_connections * 100

# Connections by client type
sum by (client_type) (geode_active_connections)
```

**Connection Churn**:
```promql
# New connections per second
rate(geode_connections_opened_total[5m])

# Closed connections per second
rate(geode_connections_closed_total[5m])

# Connection error rate
rate(geode_connection_errors_total[5m])
```

**QUIC Stream Metrics**:
```promql
# Active QUIC streams
geode_quic_streams_active

# Stream errors
rate(geode_quic_stream_errors_total[5m])

# Stream reset rate
rate(geode_quic_streams_reset_total[5m])
```

## Memory Metrics

Monitor memory consumption and allocation patterns:

**Memory Usage**:
```promql
# Total memory used
geode_memory_used_bytes

# Memory usage percentage
geode_memory_used_bytes / geode_memory_total_bytes * 100

# Memory by subsystem
sum by (subsystem) (geode_memory_used_bytes)
```

**Cache Metrics**:
```promql
# Query result cache size
geode_query_cache_size_bytes

# Buffer pool size
geode_buffer_pool_size_bytes

# Cache hit rate
rate(geode_cache_hits_total[5m]) /
  (rate(geode_cache_hits_total[5m]) + rate(geode_cache_misses_total[5m]))
```

**MVCC Version Overhead**:
```promql
# Total MVCC versions in memory
geode_mvcc_versions_count

# MVCC memory overhead
geode_mvcc_memory_bytes

# Version cleanup rate
rate(geode_mvcc_versions_cleaned_total[5m])
```

**Allocation Rate**:
```promql
# Memory allocations per second
rate(geode_memory_allocations_total[5m])

# Deallocations per second
rate(geode_memory_deallocations_total[5m])

# Allocation churn
rate(geode_memory_allocations_total[5m]) -
  rate(geode_memory_deallocations_total[5m])
```

## Storage Metrics

Track disk usage and I/O performance:

**Disk Space**:
```promql
# Disk space used
geode_disk_used_bytes

# Disk space available
geode_disk_free_bytes

# Disk usage percentage
geode_disk_used_bytes / geode_disk_total_bytes * 100
```

**Write-Ahead Log (WAL)**:
```promql
# WAL size in bytes
geode_wal_size_bytes

# WAL growth rate
deriv(geode_wal_size_bytes[15m])

# WAL segments
geode_wal_segments_count

# WAL flush rate
rate(geode_wal_flushes_total[5m])
```

**Checkpoint Metrics**:
```promql
# Checkpoint duration
geode_checkpoint_duration_seconds

# Checkpoints per hour
rate(geode_checkpoints_total[1h]) * 3600

# Data written during checkpoint
geode_checkpoint_bytes_written
```

**Disk I/O**:
```promql
# Read operations per second
rate(geode_disk_io_operations_total{type="read"}[5m])

# Write operations per second
rate(geode_disk_io_operations_total{type="write"}[5m])

# Bytes read per second
rate(geode_disk_bytes_read_total[5m])

# Bytes written per second
rate(geode_disk_bytes_written_total[5m])
```

## Index Metrics

Monitor index effectiveness and storage:

**Index Usage**:
```promql
# Index lookups per second
rate(geode_index_lookups_total[5m])

# Index hit rate
rate(geode_index_hits_total[5m]) /
  rate(geode_index_lookups_total[5m]) * 100

# Scans vs. seeks
rate(geode_index_scans_total[5m]) /
  rate(geode_index_seeks_total[5m])
```

**Index Storage**:
```promql
# Total index size
geode_index_size_bytes

# Index size by type
sum by (index_type) (geode_index_size_bytes)

# Index memory usage
geode_index_memory_bytes
```

**Index Maintenance**:
```promql
# Index build duration
geode_index_build_duration_seconds

# Index updates per second
rate(geode_index_updates_total[5m])

# Index rebuilds
geode_index_rebuilds_total
```

## Custom Metrics Integration

Extend Geode's metrics with application-specific measurements:

**Application Metrics via Labels**:
```python
# Track custom query categories
await client.execute(
    query,
    params,
    labels={"query_category": "recommendation", "version": "v2"}
)
```

**Custom Metric Exporter**:
```python
from prometheus_client import Counter, Histogram, Gauge

# Define custom metrics
recommendation_requests = Counter(
    'app_recommendation_requests_total',
    'Total recommendation requests',
    ['algorithm', 'status']
)

recommendation_latency = Histogram(
    'app_recommendation_duration_seconds',
    'Recommendation generation time',
    ['algorithm']
)

# Instrument application code
with recommendation_latency.labels(algorithm='collaborative').time():
    recommendations = await generate_recommendations(user_id)
    recommendation_requests.labels(
        algorithm='collaborative',
        status='success'
    ).inc()
```

## Metrics-Driven Optimization

Use metrics to guide performance improvements:

**Identify Hot Queries**:
```promql
# Queries consuming most total time
topk(10, rate(geode_query_duration_seconds_sum[5m]))

# Most frequently executed queries
topk(10, rate(geode_queries_total[5m]))
```

**Detect Resource Bottlenecks**:
```promql
# High memory pressure indicator
(geode_memory_used_bytes / geode_memory_total_bytes > 0.85)
  and
  (rate(geode_cache_evictions_total[5m]) > 100)

# Disk I/O bottleneck indicator
rate(geode_disk_io_wait_seconds_total[5m]) > 0.1
```

**Transaction Tuning**:
```promql
# High conflict rate requiring tuning
rate(geode_transaction_conflicts_total[5m]) /
  rate(geode_transactions_total[5m]) > 0.05
```

## Best Practices

**Establish Baselines**: Monitor metrics under normal load to establish performance baselines for anomaly detection and capacity planning.

**Use Recording Rules**: Pre-compute expensive metric queries in Prometheus recording rules to reduce dashboard load times.

**Set Meaningful Thresholds**: Configure alert thresholds based on actual system behavior and SLO requirements, not arbitrary values.

**Monitor Metric Cardinality**: Avoid high-cardinality labels (e.g., user IDs) that can explode metric storage requirements.

**Correlate Metrics**: Analyze multiple related metrics together to understand root causes (e.g., high query latency + memory pressure).

**Track Trends**: Monitor metric trends over time to predict capacity needs and detect gradual degradation.

**Validate Changes**: Compare metrics before and after configuration changes to measure impact.

## Related Topics

- [System Monitoring](/tags/monitoring/) - Comprehensive monitoring strategies
- [Observability](/tags/observability/) - Observability best practices
- [Prometheus Integration](/tags/prometheus/) - Prometheus configuration
- [Performance Tuning](/tags/performance/) - Performance optimization
- [Alerting](/tags/alerting/) - Alert configuration
- [Profiling](/tags/profiling/) - Query profiling techniques

## Further Reading

- Metrics Reference Documentation
- Prometheus Query Examples
- Metrics-Based Alerting Guide
- Capacity Planning with Metrics
- Custom Instrumentation Guide
