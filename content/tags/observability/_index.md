---
title: "System Observability"
description: "Comprehensive observability guide for Geode covering the three pillars (metrics, logs, traces), distributed tracing, structured logging, and production debugging strategies."
keywords:
  - observability
  - monitoring
  - logging
  - tracing
  - telemetry
  - debugging
  - OpenTelemetry
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/observability/"
    noindex: false
---

Observability is the ability to understand a system's internal state by examining its outputs. Unlike traditional monitoring that focuses on predefined metrics, observability enables you to ask arbitrary questions about your system's behavior, making it essential for debugging complex distributed systems and understanding emergent behaviors.

Geode implements comprehensive observability through the three pillars: metrics for quantitative measurements, logs for detailed event records, and traces for request flow visualization. This multi-dimensional approach provides complete visibility into query execution, transaction behavior, resource utilization, and system health.

This guide covers observability architecture, implementation patterns, debugging strategies, and best practices for maintaining observable Geode deployments.

## The Three Pillars of Observability

### Metrics: What is Happening

Metrics provide aggregated, time-series data about system behavior:

```promql
# Query throughput over time
rate(geode_queries_total[5m])

# p95 query latency trend
histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m]))

# Memory usage pattern
geode_memory_used_bytes
```

**Use Cases**:
- Trend analysis and anomaly detection
- Performance baseline establishment
- Capacity planning
- SLO monitoring
- Alerting on threshold violations

### Logs: Why is it Happening

Logs capture discrete events with contextual details:

```json
{
  "timestamp": "2026-01-24T10:15:30.123Z",
  "level": "ERROR",
  "message": "Query execution failed",
  "query_id": "q-12847",
  "user": "analyst",
  "error": "Index out of bounds",
  "query_text": "MATCH (n:User) WHERE n.id > $limit RETURN n",
  "stack_trace": "...",
  "duration_ms": 234.5
}
```

**Use Cases**:
- Root cause analysis
- Error investigation
- Audit trails
- Security forensics
- Understanding specific execution paths

### Traces: How is it Flowing

Traces show request flows through distributed systems:

```
Trace ID: abc123-def456-ghi789
Span: http_handler [250ms]
  └─ Span: authenticate_user [15ms]
  └─ Span: execute_gql_query [220ms]
      ├─ Span: parse_query [5ms]
      ├─ Span: optimize_plan [10ms]
      ├─ Span: execute_plan [200ms]
      │   ├─ Span: index_lookup [30ms]
      │   ├─ Span: expand_relationships [150ms]
      │   └─ Span: aggregate_results [20ms]
      └─ Span: serialize_response [5ms]
```

**Use Cases**:
- Performance bottleneck identification
- Understanding service dependencies
- Latency attribution
- Distributed debugging
- Optimization targeting

## Structured Logging

Geode uses structured JSON logging for machine-readable, queryable log data:

### Log Configuration

```toml
# geode.toml
[logging]
level = "INFO"           # DEBUG, INFO, WARN, ERROR
format = "json"          # json or text
output = "stdout"        # stdout, stderr, file
file = "/var/log/geode/geode.log"
rotate_size = "100MB"
rotate_count = 10
include_caller = true    # Include file:line information
```

### Log Levels

**DEBUG**: Detailed diagnostic information
```json
{
  "level": "DEBUG",
  "message": "Query plan generated",
  "query_id": "q-12847",
  "plan_type": "indexed_lookup",
  "estimated_rows": 1250,
  "index_used": "User.email"
}
```

**INFO**: General operational events
```json
{
  "level": "INFO",
  "message": "Query executed successfully",
  "query_id": "q-12847",
  "duration_ms": 45.3,
  "rows_returned": 1250
}
```

**WARN**: Warning conditions
```json
{
  "level": "WARN",
  "message": "Slow query detected",
  "query_id": "q-12847",
  "duration_ms": 1234.5,
  "threshold_ms": 1000,
  "query_text": "MATCH (n) RETURN n"
}
```

**ERROR**: Error events requiring attention
```json
{
  "level": "ERROR",
  "message": "Transaction conflict",
  "transaction_id": "tx-456",
  "conflict_type": "write_write",
  "retry_count": 3,
  "error_code": "40001"
}
```

### Contextual Logging

Add context to log entries for correlation:

```python
# Python client with logging context
import logging
import geode_client

logger = logging.getLogger(__name__)

async def process_user_query(user_id, query):
    # Add context to all subsequent logs
    with logger.contextualize(user_id=user_id, request_id=generate_id()):
        logger.info("Processing user query", query_type="recommendation")

        try:
            result = await client.execute(query)
            logger.info(
                "Query completed",
                rows_returned=len(result),
                duration_ms=result.duration
            )
            return result
        except Exception as e:
            logger.error(
                "Query failed",
                error=str(e),
                query_text=query
            )
            raise
```

### Log Aggregation

Centralize logs with popular aggregation tools:

**Elasticsearch Integration**:
```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/geode/*.log
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "geode-logs-%{+yyyy.MM.dd}"
```

**Loki Integration**:
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
    pipeline_stages:
      - json:
          expressions:
            level: level
            timestamp: timestamp
            message: message
      - labels:
          level:
```

## Distributed Tracing

### OpenTelemetry Integration

Geode supports OpenTelemetry for standardized distributed tracing:

```toml
# geode.toml
[tracing]
enabled = true
exporter = "otlp"
endpoint = "http://localhost:4317"
sample_rate = 0.1            # Sample 10% of traces
service_name = "geode"
environment = "production"

# Trace specific operations
trace_queries = true
trace_transactions = true
trace_index_operations = true
```

### Trace Instrumentation

Automatic instrumentation captures spans for:

**Query Execution**:
```
Span: execute_gql_query
  Attributes:
    - query.text: "MATCH (u:User) WHERE u.age > 25 RETURN u"
    - query.id: "q-12847"
    - query.status: "success"
    - query.rows: 1250
  Duration: 145ms

  Child Spans:
    - parse_query (5ms)
    - optimize_plan (10ms)
    - execute_plan (125ms)
    - serialize_response (5ms)
```

**Transaction Lifecycle**:
```
Span: transaction
  Attributes:
    - tx.id: "tx-456"
    - tx.isolation_level: "SERIALIZABLE"
    - tx.status: "committed"
  Duration: 2340ms

  Child Spans:
    - begin_transaction (2ms)
    - execute_query_1 (145ms)
    - execute_query_2 (234ms)
    - commit_transaction (15ms)
```

**Index Operations**:
```
Span: index_build
  Attributes:
    - index.name: "User.email"
    - index.type: "btree"
    - index.rows: 1000000
  Duration: 45000ms
```

### Custom Spans

Add application-specific tracing:

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

async def recommend_products(user_id):
    with tracer.start_as_current_span("recommend_products") as span:
        span.set_attribute("user_id", user_id)

        # Fetch user preferences
        with tracer.start_as_current_span("fetch_preferences"):
            prefs = await client.execute(
                "MATCH (u:User {id: $id})-[:LIKES]->(p:Product) RETURN p",
                {"id": user_id}
            )

        # Generate recommendations
        with tracer.start_as_current_span("generate_recommendations") as rec_span:
            rec_span.set_attribute("input_products", len(prefs))
            recommendations = await compute_recommendations(prefs)
            rec_span.set_attribute("recommendations_count", len(recommendations))

        return recommendations
```

### Trace Sampling

Control trace volume with intelligent sampling:

**Tail-Based Sampling**: Sample based on trace characteristics
```toml
[tracing.sampling]
strategy = "tail_based"

# Always sample errors
sample_on_error = true

# Always sample slow requests
slow_threshold_ms = 1000
sample_slow = true

# Sample 10% of normal requests
default_rate = 0.1
```

**Probabilistic Sampling**: Random sampling percentage
```toml
[tracing.sampling]
strategy = "probabilistic"
rate = 0.05  # Sample 5% of traces
```

## Correlation Across Pillars

Link metrics, logs, and traces for comprehensive debugging:

### Request ID Propagation

```python
import uuid

# Generate request ID
request_id = str(uuid.uuid4())

# Include in query metadata
result = await client.execute(
    query,
    params,
    metadata={"request_id": request_id}
)

# Request ID appears in:
# - Trace (span attribute)
# - Logs (log field)
# - Metrics (optional label for custom metrics)
```

### Trace ID in Logs

```json
{
  "timestamp": "2026-01-24T10:15:30.123Z",
  "level": "ERROR",
  "message": "Query execution failed",
  "trace_id": "abc123def456ghi789",
  "span_id": "xyz789",
  "query_id": "q-12847",
  "error": "Index out of bounds"
}
```

Query logs in trace UI or trace from logs:
```bash
# Find logs for specific trace
jq 'select(.trace_id == "abc123def456ghi789")' /var/log/geode/geode.log

# Find trace from log entry
curl "http://jaeger:16686/api/traces/abc123def456ghi789"
```

## Observability-Driven Debugging

### Performance Regression Investigation

1. **Detect anomaly in metrics**:
```promql
# p95 latency spiked
histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m])) > 0.5
```

2. **Identify affected queries from logs**:
```bash
jq 'select(.duration_ms > 500) | {query_id, query_text, duration_ms}' \
  /var/log/geode/geode.log
```

3. **Analyze traces for bottlenecks**:
Look for spans with unexpectedly high duration in trace viewer.

4. **Profile slow query**:
```gql
PROFILE
MATCH (u:User)-[:FOLLOWS]->(other)
RETURN u.name, count(other);
```

### Error Rate Spike Investigation

1. **Detect in metrics**:
```promql
rate(geode_queries_total{status="error"}[5m]) > 10
```

2. **Analyze error logs**:
```bash
jq 'select(.level == "ERROR") | {timestamp, message, error, query_text}' \
  /var/log/geode/geode.log | tail -100
```

3. **Group errors by type**:
```bash
jq -r 'select(.level == "ERROR") | .error' /var/log/geode/geode.log | \
  sort | uniq -c | sort -rn
```

4. **Examine failed traces**:
Filter traces by error status to see failure patterns.

## Observability Best Practices

**High Cardinality Awareness**: Avoid unbounded label/field values (user IDs, session IDs) that explode storage requirements.

**Consistent Naming**: Use consistent naming conventions across metrics, logs, and traces for easy correlation.

**Contextual Enrichment**: Include relevant context (user, query type, client) in all observability signals.

**Sampling Strategy**: Sample traces appropriately to balance coverage and overhead (1-10% for high-volume systems).

**Retention Policies**: Define appropriate retention periods for each pillar based on use case (metrics: 30d, logs: 7d, traces: 3d).

**Alert on Symptoms, Not Causes**: Alert on user-impacting symptoms (high latency, errors) rather than internal metrics (CPU, memory).

**Documentation**: Maintain runbooks linking alerts to investigation procedures using observability tools.

**Cost Management**: Monitor observability pipeline costs and optimize sampling, retention, and cardinality.

## Related Topics

- [System Monitoring](/tags/monitoring/) - Monitoring strategies
- [Performance Metrics](/tags/metrics/) - Metrics collection
- [Application Logging](/tags/logging/) - Logging best practices
- [Distributed Tracing](/tags/tracing/) - Tracing implementation
- [Prometheus Integration](/tags/prometheus/) - Metrics collection
- [Performance Tuning](/tags/performance/) - Optimization techniques
- [Troubleshooting](/tags/troubleshooting/) - Debugging guide

## Further Reading

- Observability Engineering Handbook
- OpenTelemetry Integration Guide
- Distributed Tracing Patterns
- Log Analysis Best Practices
- Production Debugging Strategies
