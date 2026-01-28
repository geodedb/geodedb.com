---
title: "Statistics and Metrics Reference"
description: "Complete reference for Geode statistics, metrics, and monitoring including query statistics, storage metrics, index statistics, and Prometheus integration"
summary: "Comprehensive statistics and metrics reference covering all observable metrics in Geode with collection methods, Prometheus exposition, and performance monitoring best practices."
slug: "statistics"
url: "/docs/reference/statistics/"
date: 2026-01-28
lastmod: 2026-01-28
draft: false
weight: 27
keywords: ["statistics", "metrics", "monitoring", "Prometheus", "observability", "query statistics", "index statistics", "performance metrics"]
tags: ["reference", "statistics", "monitoring", "observability"]
categories: ["Reference"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/reference/statistics/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Statistics and Metrics Reference

Geode provides comprehensive statistics and metrics for monitoring, optimization, and observability. This reference documents all available metrics, collection methods, and integration options.

## Overview

### Metric Categories

| Category | Purpose | Collection Method |
|----------|---------|-------------------|
| **Query Statistics** | Query performance analysis | Automatic |
| **Storage Statistics** | Disk and memory usage | Automatic |
| **Index Statistics** | Index efficiency | Automatic + Manual |
| **Transaction Statistics** | ACID operations | Automatic |
| **Connection Statistics** | Client connections | Automatic |
| **System Statistics** | Resource utilization | Automatic |

### Access Methods

1. **GQL Procedures**: `CALL db.stats.*`
2. **Prometheus Endpoint**: `/metrics`
3. **Admin API**: REST endpoints
4. **EXPLAIN/PROFILE**: Per-query metrics

---

## Query Statistics

### Global Query Statistics

```gql
-- View overall query statistics
CALL db.stats.queries();
```

**Output:**

| Metric | Type | Description |
|--------|------|-------------|
| `total_queries` | Counter | Total queries executed |
| `successful_queries` | Counter | Successfully completed queries |
| `failed_queries` | Counter | Failed queries |
| `queries_in_progress` | Gauge | Currently executing queries |
| `avg_query_time_ms` | Gauge | Average query latency |
| `p50_query_time_ms` | Gauge | Median query latency |
| `p95_query_time_ms` | Gauge | 95th percentile latency |
| `p99_query_time_ms` | Gauge | 99th percentile latency |
| `max_query_time_ms` | Gauge | Maximum observed latency |

### Query Type Breakdown

```gql
-- Statistics by query type
CALL db.stats.queries.by_type();
```

| Query Type | Description |
|------------|-------------|
| `MATCH` | Read queries |
| `CREATE` | Node/relationship creation |
| `SET` | Property updates |
| `DELETE` | Deletions |
| `MERGE` | Upsert operations |
| `CALL` | Procedure calls |

### Slow Query Log

```gql
-- View slow queries (> threshold)
CALL db.stats.slow_queries(100);  -- threshold in ms

-- Configure slow query threshold
CALL db.config.set('query.slow_threshold_ms', 100);
```

**Slow Query Entry:**

```json
{
  "timestamp": "2026-01-28T10:30:00Z",
  "query": "MATCH (p:Person)-[:KNOWS*5]->(f) RETURN f",
  "duration_ms": 1523,
  "rows_returned": 10000,
  "db_hits": 500000,
  "user": "alice",
  "client_ip": "192.168.1.100"
}
```

### Query Plan Statistics

```gql
-- View cached query plans
CALL db.stats.query_plans();
```

| Metric | Description |
|--------|-------------|
| `plan_cache_size` | Number of cached plans |
| `plan_cache_hits` | Cache hit count |
| `plan_cache_misses` | Cache miss count |
| `plan_cache_hit_rate` | Hit rate percentage |
| `avg_plan_time_ms` | Average planning time |

---

## Storage Statistics

### Database Size

```gql
-- Overall storage statistics
CALL db.stats.storage();
```

**Output:**

| Metric | Type | Description |
|--------|------|-------------|
| `data_size_bytes` | Gauge | Total data file size |
| `index_size_bytes` | Gauge | Total index size |
| `wal_size_bytes` | Gauge | Write-ahead log size |
| `total_size_bytes` | Gauge | Total disk usage |
| `page_count` | Gauge | Total pages allocated |
| `used_pages` | Gauge | Pages with data |
| `free_pages` | Gauge | Available pages |
| `fragmentation_ratio` | Gauge | Space fragmentation (0-1) |

### Graph Statistics

```gql
-- Graph element counts
CALL db.stats.graph();
```

| Metric | Description |
|--------|-------------|
| `node_count` | Total nodes |
| `relationship_count` | Total relationships |
| `label_count` | Distinct node labels |
| `relationship_type_count` | Distinct relationship types |
| `property_key_count` | Distinct property keys |

### Label Statistics

```gql
-- Statistics per label
CALL db.stats.labels();
```

**Per-label metrics:**

| Metric | Description |
|--------|-------------|
| `node_count` | Nodes with this label |
| `avg_property_count` | Average properties per node |
| `avg_relationship_count` | Average relationships per node |

### Relationship Type Statistics

```gql
-- Statistics per relationship type
CALL db.stats.relationship_types();
```

**Per-type metrics:**

| Metric | Description |
|--------|-------------|
| `count` | Relationships of this type |
| `avg_property_count` | Average properties per relationship |

---

## Index Statistics

### Index Overview

```gql
-- All index statistics
CALL db.stats.indexes();
```

**Per-index metrics:**

| Metric | Type | Description |
|--------|------|-------------|
| `index_name` | String | Index identifier |
| `index_type` | String | btree, hash, fulltext, etc. |
| `label` | String | Target label |
| `property` | String | Indexed property |
| `size_bytes` | Gauge | Index storage size |
| `entry_count` | Gauge | Number of indexed entries |
| `unique_values` | Gauge | Distinct indexed values |
| `null_count` | Gauge | NULL entries |
| `avg_values_per_key` | Gauge | Average duplicates per key |

### Index Usage Statistics

```gql
-- Index usage metrics
CALL db.stats.index_usage();
```

| Metric | Description |
|--------|-------------|
| `reads` | Index read operations |
| `scans` | Full index scans |
| `seeks` | Point lookups |
| `range_scans` | Range query operations |
| `updates` | Index update operations |
| `last_used` | Timestamp of last use |

### Index Health

```gql
-- Check index health
CALL db.stats.index_health('index_name');
```

| Metric | Description | Healthy Range |
|--------|-------------|---------------|
| `fragmentation` | Internal fragmentation | < 0.3 |
| `depth` | Tree depth (B-tree) | < 5 |
| `fill_factor` | Page fill ratio | > 0.7 |
| `bloom_false_positive_rate` | Bloom filter FP rate | < 0.01 |

### Manual Statistics Update

```gql
-- Update statistics for all indexes
CALL db.stats.update();

-- Update statistics for specific label
CALL db.stats.update('Person');

-- Update specific index statistics
CALL db.index.analyze('person_email_idx');
```

---

## Cardinality Estimation

The query optimizer uses cardinality estimates for cost-based optimization.

### Histogram Statistics

```gql
-- View histograms for a property
CALL db.stats.histogram('Person', 'age');
```

**Output:**

| Column | Description |
|--------|-------------|
| `bucket_min` | Bucket lower bound |
| `bucket_max` | Bucket upper bound |
| `frequency` | Row count in bucket |
| `cumulative_frequency` | Cumulative row count |
| `distinct_count` | Distinct values in bucket |

### Selectivity Estimates

```gql
-- Estimate predicate selectivity
CALL db.stats.selectivity('Person', 'age > 30');
```

| Metric | Description |
|--------|-------------|
| `estimated_rows` | Rows matching predicate |
| `selectivity` | Fraction of total (0-1) |
| `confidence` | Estimate confidence (low/medium/high) |

### Statistics Configuration

```yaml
statistics:
  auto_update: true
  update_threshold: 10000      # Update after N modifications
  sample_size: 1000            # Rows sampled for histograms
  histogram_buckets: 100       # Number of histogram buckets
  update_interval: 3600        # Auto-update interval (seconds)
```

---

## Transaction Statistics

```gql
-- Transaction statistics
CALL db.stats.transactions();
```

| Metric | Type | Description |
|--------|------|-------------|
| `active_transactions` | Gauge | Currently open transactions |
| `total_commits` | Counter | Successful commits |
| `total_rollbacks` | Counter | Rollbacks |
| `commit_rate` | Gauge | Commits per second |
| `avg_transaction_time_ms` | Gauge | Average transaction duration |
| `deadlock_count` | Counter | Deadlock occurrences |
| `lock_wait_time_ms` | Counter | Total lock wait time |

### Lock Statistics

```gql
-- Current lock information
CALL db.stats.locks();
```

| Metric | Description |
|--------|-------------|
| `active_locks` | Currently held locks |
| `waiting_locks` | Lock requests waiting |
| `lock_timeouts` | Lock timeout count |
| `avg_lock_wait_ms` | Average lock wait time |

---

## Connection Statistics

```gql
-- Connection statistics
CALL db.stats.connections();
```

| Metric | Type | Description |
|--------|------|-------------|
| `active_connections` | Gauge | Currently connected clients |
| `total_connections` | Counter | Total connections (lifetime) |
| `connection_errors` | Counter | Failed connection attempts |
| `max_connections` | Gauge | Connection limit |
| `available_connections` | Gauge | Available connection slots |

### Per-Client Statistics

```gql
-- Statistics per connected client
CALL db.stats.clients();
```

| Column | Description |
|--------|-------------|
| `client_id` | Client identifier |
| `user` | Authenticated user |
| `ip_address` | Client IP |
| `connected_at` | Connection timestamp |
| `queries_executed` | Query count for session |
| `bytes_sent` | Data sent to client |
| `bytes_received` | Data received from client |

---

## System Metrics

### Resource Utilization

```gql
-- System resource metrics
CALL db.stats.system();
```

| Metric | Type | Description |
|--------|------|-------------|
| `cpu_usage_percent` | Gauge | CPU utilization |
| `memory_used_bytes` | Gauge | Memory in use |
| `memory_available_bytes` | Gauge | Available memory |
| `memory_heap_bytes` | Gauge | Heap memory usage |
| `gc_pause_ms` | Histogram | GC pause times |
| `gc_count` | Counter | GC cycles |

### I/O Statistics

```gql
-- Disk I/O statistics
CALL db.stats.io();
```

| Metric | Type | Description |
|--------|------|-------------|
| `read_bytes` | Counter | Bytes read from disk |
| `write_bytes` | Counter | Bytes written to disk |
| `read_ops` | Counter | Read operations |
| `write_ops` | Counter | Write operations |
| `read_latency_ms` | Histogram | Read latency |
| `write_latency_ms` | Histogram | Write latency |
| `fsync_count` | Counter | fsync operations |
| `fsync_latency_ms` | Histogram | fsync latency |

### Buffer Pool Statistics

```gql
-- Buffer pool metrics
CALL db.stats.buffer_pool();
```

| Metric | Description |
|--------|-------------|
| `pool_size_pages` | Total buffer pool pages |
| `used_pages` | Pages in use |
| `dirty_pages` | Modified pages pending write |
| `hit_rate` | Buffer cache hit rate |
| `evictions` | Page evictions |
| `reads_from_disk` | Cache misses |

---

## Prometheus Integration

### Metrics Endpoint

Geode exposes metrics in Prometheus format at `/metrics`:

```bash
curl http://localhost:3141/metrics
```

### Sample Output

```prometheus
# HELP geode_queries_total Total queries executed
# TYPE geode_queries_total counter
geode_queries_total{status="success"} 1234567
geode_queries_total{status="error"} 123

# HELP geode_query_duration_seconds Query execution time
# TYPE geode_query_duration_seconds histogram
geode_query_duration_seconds_bucket{le="0.001"} 10000
geode_query_duration_seconds_bucket{le="0.01"} 50000
geode_query_duration_seconds_bucket{le="0.1"} 100000
geode_query_duration_seconds_bucket{le="1.0"} 120000
geode_query_duration_seconds_bucket{le="+Inf"} 123456
geode_query_duration_seconds_sum 12345.67
geode_query_duration_seconds_count 123456

# HELP geode_connections_active Active client connections
# TYPE geode_connections_active gauge
geode_connections_active 42

# HELP geode_storage_bytes Storage size in bytes
# TYPE geode_storage_bytes gauge
geode_storage_bytes{type="data"} 1073741824
geode_storage_bytes{type="index"} 268435456
geode_storage_bytes{type="wal"} 134217728

# HELP geode_nodes_total Total nodes in database
# TYPE geode_nodes_total gauge
geode_nodes_total 1000000

# HELP geode_relationships_total Total relationships
# TYPE geode_relationships_total gauge
geode_relationships_total 5000000
```

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['geode-server:3141']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Available Prometheus Metrics

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `geode_queries_total` | Counter | status | Total queries |
| `geode_query_duration_seconds` | Histogram | - | Query latency |
| `geode_connections_active` | Gauge | - | Active connections |
| `geode_connections_total` | Counter | - | Total connections |
| `geode_transactions_total` | Counter | status | Transaction count |
| `geode_storage_bytes` | Gauge | type | Storage usage |
| `geode_nodes_total` | Gauge | label | Node count |
| `geode_relationships_total` | Gauge | type | Relationship count |
| `geode_index_size_bytes` | Gauge | index | Index sizes |
| `geode_buffer_pool_hit_ratio` | Gauge | - | Cache hit rate |
| `geode_wal_size_bytes` | Gauge | - | WAL size |
| `geode_gc_pause_seconds` | Histogram | - | GC pauses |

---

## Alerting Guidelines

### Recommended Alerts

```yaml
# Alert rules for Geode
groups:
  - name: geode_alerts
    rules:
      # High query latency
      - alert: GeodeHighQueryLatency
        expr: histogram_quantile(0.95, geode_query_duration_seconds_bucket) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High query latency detected"

      # Connection pool exhaustion
      - alert: GeodeConnectionPoolLow
        expr: geode_connections_active / geode_connections_max > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Connection pool nearly exhausted"

      # Storage space
      - alert: GeodeStorageHigh
        expr: geode_storage_bytes{type="data"} > 100e9
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Database storage exceeds 100GB"

      # Buffer pool hit rate
      - alert: GeodeLowCacheHitRate
        expr: geode_buffer_pool_hit_ratio < 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Buffer pool hit rate below 90%"
```

---

## Grafana Dashboards

### Key Panels

**Query Performance:**
- Queries per second (rate)
- Query latency percentiles (p50, p95, p99)
- Slow query count
- Error rate

**Storage:**
- Database size growth
- Index size breakdown
- WAL size
- Fragmentation ratio

**Resources:**
- Buffer pool hit rate
- Memory usage
- I/O throughput
- Connection count

### Example Dashboard JSON

```json
{
  "dashboard": {
    "title": "Geode Database",
    "panels": [
      {
        "title": "Query Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(geode_queries_total[5m])",
            "legendFormat": "{{status}}"
          }
        ]
      },
      {
        "title": "Query Latency (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

---

## Best Practices

### Statistics Collection

1. **Enable auto-update** for query optimizer accuracy
2. **Monitor slow queries** with appropriate thresholds
3. **Track index usage** to identify unused indexes
4. **Set up alerting** for critical metrics

### Performance Monitoring

1. **Baseline metrics** during normal operation
2. **Track trends** over time
3. **Correlate metrics** (e.g., latency vs. connection count)
4. **Review after changes** (schema, indexes, configuration)

### Capacity Planning

1. **Monitor storage growth** rate
2. **Track query volume** trends
3. **Plan index storage** needs
4. **Size buffer pool** based on working set

---

## Related Documentation

- [Observability Guide](/docs/ops/observability/) - Monitoring setup
- [Performance Tuning](/docs/query/performance-tuning/) - Optimization guide
- [Index Types Reference](/docs/reference/indexes/) - Index statistics
- [Telemetry](/docs/ops/telemetry-advanced/) - Advanced telemetry

---

**Last Updated:** January 28, 2026
**Geode Version:** v0.18.0+
**Metrics Count:** 50+ observable metrics
