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

| Category | Purpose | Where it comes from |
|----------|---------|---------------------|
| **Query Statistics** | Query performance analysis | `/metrics`, `EXPLAIN`/`PROFILE` |
| **Storage Statistics** | Storage-engine state | `CALL geode.storage.stats()` |
| **Catalog Statistics** | Labels, types, indexes | `SHOW`/`CALL db.*` introspection |
| **Transaction Statistics** | Commit and failure counts | `/metrics` |
| **Connection Statistics** | Client connections | `/metrics` |
| **Process Statistics** | Memory usage | `/metrics` |

### Access Methods

1. **Prometheus endpoint**: `GET /metrics` (see [Prometheus Integration](#prometheus-integration))
2. **Liveness endpoint**: `GET /health` on the same listener
3. **Storage procedures**: `CALL geode.storage.stats()` and `CALL geode.storage.integrity()`
4. **Catalog introspection**: `SHOW INDEXES`, `SHOW CONSTRAINTS`, `CALL db.labels()`, `CALL db.relationshipTypes()`, `CALL db.propertyKeys()`
5. **EXPLAIN/PROFILE**: per-query plan and execution metrics

There is no `db.stats.*` procedure namespace. The procedure surface the server
dispatches is `db.`, `dbms.`, `algo.`, `audit.`, `tde.`, `cdc.` and
`geode.{fle,auth,rls,storage,fts,ts,tenant}`; anything else returns
`UnknownProcedure`. Aggregate counters live on the Prometheus endpoint,
storage-level facts live on `geode.storage.stats()`, and everything else in this
page is derived with ordinary GQL.

---

## Query Statistics

### Global Query Statistics

Query counters are exported by the metrics listener, not by a procedure:

```bash
curl -s http://localhost:9090/metrics | grep '^geode_quer'
```

**Exported query metrics:**

| Metric | Type | Description |
|--------|------|-------------|
| `geode_queries_total` | Counter | Total number of queries executed |
| `geode_queries_failed_total` | Counter | Total number of failed queries |
| `geode_query_duration_seconds` | Histogram | Query execution duration in seconds |

Latency percentiles are computed from the histogram in PromQL rather than
being pre-aggregated by the server:

```promql
histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))
```

### Query Type Breakdown

The server does not label query counters by statement type, so there is no
per-type breakdown to read. Where you need one, count the statements you issue
in the client, or read the audit trail with
`CALL audit.get_recent_events(100) YIELD event_id, timestamp, category, action, outcome`
and group by `action`.

### Slow Query Analysis

There is no slow-query log and no `query.slow_threshold_ms` setting. Analyse an
individual slow statement with `PROFILE`, which runs the query and reports the
real per-operator work:

```gql
PROFILE MATCH (p:Person)-[:KNOWS]->(f)
WHERE p.name = 'Alice'
RETURN f.name;
```

Use `EXPLAIN` for the plan alone, without executing:

```gql
EXPLAIN MATCH (p:Person)-[:KNOWS]->(f)
WHERE p.name = 'Alice'
RETURN f.name;
```

For fleet-wide latency outliers, alert on the
`geode_query_duration_seconds` histogram rather than polling the database.

### Query Plan Statistics

The planner caches plans internally, but that cache has no user-facing
procedure or metric. `EXPLAIN` is the supported way to see the plan chosen for
a given statement.

---

## Storage Statistics

### Database Size

```gql
-- Storage-engine statistics for the default graph
CALL geode.storage.stats();

-- ...or for a named graph
CALL geode.storage.stats('analytics');
```

**Output columns:**

| Column | Description |
|--------|-------------|
| `node_count` | Nodes recorded by the storage engine |
| `edge_count` | Edges recorded by the storage engine |
| `label_count` | Distinct labels in the label index |
| `format_version` | On-disk format version |
| `page_size` | Page size in bytes |
| `wal_lsn` | Current write-ahead-log sequence number |
| `last_checkpoint_lsn` | LSN of the last checkpoint |
| `free_pages_nodes` | Free pages in the node region |
| `free_pages_adj_out` | Free pages in the outgoing-adjacency region |
| `free_pages_adj_in` | Free pages in the incoming-adjacency region |
| `free_pages_props` | Free pages in the property region |
| `free_pages_var` | Free pages in the variable-length region |

Total on-disk size is not reported by the engine; measure the data directory
(`du -sh <data-dir>`) for that. The free-page columns are the closest available
proxy for fragmentation.

### Storage Integrity

```gql
CALL geode.storage.integrity();
```

| Column | Description |
|--------|-------------|
| `node_count_consistent` | Node counts agree between store and index |
| `edge_count_consistent` | Edge counts agree between store and index |
| `label_index_entries` | Entries in the label index |
| `total_errors` | Number of inconsistencies detected |

The same checks are available offline from the CLI with `geode storage verify`.

### Graph Statistics

Element counts come from `geode.storage.stats()` (above) or from ordinary
aggregation:

```gql
-- Node and relationship totals
MATCH (n) RETURN count(n) AS node_count;
MATCH ()-[r]->() RETURN count(r) AS relationship_count;

-- Catalog cardinalities
CALL db.labels() YIELD label RETURN count(label) AS label_count;
CALL db.relationshipTypes() YIELD relationshipType
RETURN count(relationshipType) AS relationship_type_count;
CALL db.propertyKeys() YIELD propertyKey
RETURN count(propertyKey) AS property_key_count;
```

`geode_nodes_total` and `geode_edges_total` expose the same two counts as
Prometheus gauges.

### Label Statistics

```gql
-- Nodes per label, one label at a time
MATCH (n:Person) RETURN count(n) AS node_count;

-- Enumerate the labels first, then count each one
CALL db.labels() YIELD label RETURN label ORDER BY label;
```

Average property and relationship counts per label are not maintained by the
engine; derive them when you need them:

```gql
MATCH (n:Person)
RETURN avg(size(keys(n))) AS avg_property_count;

MATCH (n:Person)
RETURN avg(outdegree(n) + indegree(n)) AS avg_relationship_count;
```

### Relationship Type Statistics

```gql
-- Relationships of a given type
MATCH ()-[r:KNOWS]->() RETURN count(r) AS count;

-- Enumerate the types in use
CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType;
```

---

## Index Statistics

### Index Overview

```gql
-- Every index in the catalog
SHOW INDEXES;

-- Same list through the introspection procedure
CALL db.indexes() YIELD name, type, label, properties
RETURN name, type, label, properties
ORDER BY name;
```

**Columns:**

| Column | Description |
|--------|-------------|
| `name` | Index identifier |
| `type` | Index type (`BTREE`, `HASH`, `FULLTEXT`, `VECTOR`, ...) |
| `label` | Target label |
| `properties` | Indexed properties, comma-separated |

Constraints are listed the same way with `SHOW CONSTRAINTS` or
`CALL db.constraints() YIELD name, type, label, properties, enforced`.

### Index Size and Usage

The engine does not maintain per-index size, entry-count, read-count or
last-used counters, and exposes no procedure for them. To find out whether a
statement uses an index, read the plan:

```gql
EXPLAIN MATCH (p:Person) WHERE p.email = 'alice@example.com' RETURN p;
```

Index storage is part of the data directory; measure it on disk rather than
through a procedure.

### Index Health

There is no index-health procedure, and no fragmentation, tree-depth,
fill-factor or bloom-filter statistic is published. The available integrity
signal is `CALL geode.storage.integrity()`, which reports whether the label
index agrees with the store, plus `geode storage verify` from the CLI.

### Statistics Maintenance

Index and catalog state is maintained by the engine as data changes. There is
no `ANALYZE`-style command and no manual statistics-refresh procedure to run.

---

## Cardinality Estimation

The query optimizer keeps its own cost estimates internally. They are not
exposed as histograms, selectivity procedures, or configuration: there is no
histogram procedure, no selectivity procedure, and no `statistics:` block in
the server configuration file.

What you can inspect is the plan the optimizer actually chose, and the work it
actually did:

```gql
-- Chosen plan, without running the query
EXPLAIN MATCH (p:Person) WHERE p.age > 30 RETURN p;

-- Real per-operator work, by running it
PROFILE MATCH (p:Person) WHERE p.age > 30 RETURN p;
```

To check a predicate's real selectivity, count it:

```gql
MATCH (p:Person) WHERE p.age > 30
RETURN count(p) AS matching_rows;
```

---

## Transaction Statistics

Transaction counters are exported by the metrics listener:

| Metric | Type | Description |
|--------|------|-------------|
| `geode_transactions_total` | Counter | Total number of transactions |
| `geode_transactions_failed_total` | Counter | Total number of failed transactions |

Commit rate is a PromQL expression over the counter:

```promql
rate(geode_transactions_total[5m])
```

Open-transaction lists, per-transaction durations, deadlock counters and lock
tables are not published; there is no transaction- or lock-inspection
procedure. Use client-side timing plus the failure counter above.

---

## Connection Statistics

| Metric | Type | Description |
|--------|------|-------------|
| `geode_connections_active` | Gauge | Number of active connections |
| `geode_connections_total` | Counter | Total number of connections |

The connection ceiling is set with the server's `--max-connections` flag, so
available slots are `--max-connections` minus `geode_connections_active`.

Per-client session tables (client id, IP, bytes sent/received) are not
published by the server. Authentication and access events are recorded in the
audit trail instead:

```gql
CALL audit.get_recent_events(100)
YIELD event_id, timestamp, category, action, outcome
RETURN timestamp, category, action, outcome
ORDER BY timestamp DESC;
```

---

## System Metrics

### Resource Utilization

| Metric | Type | Description |
|--------|------|-------------|
| `geode_memory_bytes` | Gauge | Memory usage in bytes |

Geode is written in Zig and has no garbage collector, so there are no GC pause
or GC cycle metrics. CPU utilisation is not published by the server; collect it
from the host with `node_exporter` or the container runtime.

### I/O Statistics

Disk I/O counters and latency histograms are not published by the server.
Collect them from the host (`node_exporter`, `iostat`) and correlate with the
storage LSN columns from `CALL geode.storage.stats()`:

```gql
CALL geode.storage.stats()
YIELD wal_lsn, last_checkpoint_lsn
RETURN wal_lsn, last_checkpoint_lsn, wal_lsn - last_checkpoint_lsn AS unflushed;
```

### Page and Cache Statistics

Buffer-pool hit rates, dirty-page counts and eviction counters are internal to
the storage engine and are not exposed. The published page-level facts are the
`page_size` and `free_pages_*` columns of `CALL geode.storage.stats()`.

---

## Prometheus Integration

### Metrics Endpoint

The Prometheus listener is opt-in: start the server with `GEODE_METRICS_PORT`
set, and it serves `GET /metrics` and `GET /health` on that port (the GQL
listener on `3141` serves neither).

```bash
GEODE_METRICS_PORT=9090 geode serve --data-dir ./data
curl http://localhost:9090/metrics
curl http://localhost:9090/health   # {"status":"ok"}
```

### Sample Output

```prometheus
# HELP geode_queries_total Total number of queries executed
# TYPE geode_queries_total counter
geode_queries_total 1234567

# HELP geode_queries_failed_total Total number of failed queries
# TYPE geode_queries_failed_total counter
geode_queries_failed_total 123

# HELP geode_query_duration_seconds Query execution duration in seconds
# TYPE geode_query_duration_seconds histogram
geode_query_duration_seconds_bucket{le="0.001"} 10000
geode_query_duration_seconds_bucket{le="0.01"} 50000
geode_query_duration_seconds_bucket{le="0.1"} 100000
geode_query_duration_seconds_bucket{le="1.0"} 120000
geode_query_duration_seconds_bucket{le="+Inf"} 123456
geode_query_duration_seconds_sum 12345.67
geode_query_duration_seconds_count 123456

# HELP geode_connections_active Number of active connections
# TYPE geode_connections_active gauge
geode_connections_active 42

# HELP geode_nodes_total Total number of nodes in the graph
# TYPE geode_nodes_total gauge
geode_nodes_total 1000000

# HELP geode_edges_total Total number of edges in the graph
# TYPE geode_edges_total gauge
geode_edges_total 5000000

# HELP geode_memory_bytes Memory usage in bytes
# TYPE geode_memory_bytes gauge
geode_memory_bytes 1073741824
```

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['geode-server:9090']   # GEODE_METRICS_PORT
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Available Prometheus Metrics

These ten metrics are the complete registered set; none of them carry labels.

| Metric Name | Type | Description |
|-------------|------|-------------|
| `geode_queries_total` | Counter | Total number of queries executed |
| `geode_queries_failed_total` | Counter | Total number of failed queries |
| `geode_query_duration_seconds` | Histogram | Query execution duration in seconds |
| `geode_connections_active` | Gauge | Number of active connections |
| `geode_connections_total` | Counter | Total number of connections |
| `geode_transactions_total` | Counter | Total number of transactions |
| `geode_transactions_failed_total` | Counter | Total number of failed transactions |
| `geode_nodes_total` | Gauge | Total number of nodes in the graph |
| `geode_edges_total` | Gauge | Total number of edges in the graph |
| `geode_memory_bytes` | Gauge | Memory usage in bytes |

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

      # Connection pool exhaustion (900 = 90% of --max-connections 1000)
      - alert: GeodeConnectionPoolLow
        expr: geode_connections_active > 900
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Connection pool nearly exhausted"

      # Query error rate
      - alert: GeodeQueryErrorRate
        expr: rate(geode_queries_failed_total[5m]) / rate(geode_queries_total[5m]) > 0.01
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "More than 1% of queries are failing"

      # Memory growth
      - alert: GeodeMemoryHigh
        expr: geode_memory_bytes > 8e9
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Server memory usage exceeds 8GB"
```

Disk-space alerting uses the host filesystem collector (`node_exporter`) on the
data directory: the server publishes no storage-size metric.

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

1. **Scrape `/metrics`** so counters survive server restarts in Prometheus
2. **Profile individual statements** with `PROFILE` instead of a slow-query log
3. **Review plans with `EXPLAIN`** to confirm indexes are used
4. **Set up alerting** for critical metrics

### Performance Monitoring

1. **Baseline metrics** during normal operation
2. **Track trends** over time
3. **Correlate metrics** (e.g., latency vs. connection count)
4. **Review after changes** (schema, indexes, configuration)

### Capacity Planning

1. **Monitor data-directory growth** from the host filesystem collector
2. **Track query volume** trends with `rate(geode_queries_total[5m])`
3. **Track graph growth** with `geode_nodes_total` and `geode_edges_total`
4. **Size the host** so the working set fits in RAM (`geode_memory_bytes`)

---

## Related Documentation

- [Observability Guide](/docs/ops/observability/) - Monitoring setup
- [Performance Tuning](/docs/query/performance-tuning/) - Optimization guide
- [Index Types Reference](/docs/reference/indexes/) - Index statistics
- [Telemetry](/docs/ops/telemetry-advanced/) - Advanced telemetry

---

**Last Updated:** January 28, 2026
**Geode Version:** **GEODE_TAG**+
**Metrics Count:** 10 registered Prometheus metrics
