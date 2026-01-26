---
title: "Distributed Tracing"
description: "Comprehensive distributed tracing guide for Geode including OpenTelemetry integration, trace instrumentation, sampling strategies, and trace-based debugging."
keywords:
  - tracing
  - distributed tracing
  - OpenTelemetry
  - observability
  - spans
  - trace analysis
  - Jaeger
  - Zipkin
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/tracing/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Distributed tracing provides end-to-end visibility into request flows through complex systems, enabling you to understand how queries propagate through Geode's execution pipeline and identify performance bottlenecks with precision. By capturing detailed timing information for each operation, tracing reveals exactly where time is spent during query execution.

Geode implements distributed tracing using OpenTelemetry, the industry-standard observability framework. Traces capture spans for query parsing, optimization, execution, index lookups, relationship traversals, and result serialization, providing comprehensive visibility into database operations.

This guide covers trace architecture, OpenTelemetry integration, instrumentation patterns, sampling strategies, and trace-based performance optimization.

## Distributed Tracing Concepts

### Traces and Spans

A **trace** represents a complete request flow through the system, composed of multiple **spans**:

```
Trace ID: abc123-def456-ghi789 (total: 250ms)
│
├─ Span: http_request (250ms)
│  │
│  ├─ Span: authenticate_user (15ms)
│  │
│  ├─ Span: execute_gql_query (220ms)
│  │  │
│  │  ├─ Span: parse_query (5ms)
│  │  │
│  │  ├─ Span: optimize_plan (10ms)
│  │  │
│  │  ├─ Span: execute_plan (200ms)
│  │  │  │
│  │  │  ├─ Span: index_lookup (30ms)
│  │  │  │
│  │  │  ├─ Span: expand_relationships (150ms)
│  │  │  │
│  │  │  └─ Span: aggregate_results (20ms)
│  │  │
│  │  └─ Span: serialize_response (5ms)
│  │
│  └─ Span: cache_update (15ms)
```

Each span captures:
- **Start time** and **duration**
- **Operation name** (e.g., "execute_gql_query")
- **Attributes** (key-value metadata)
- **Events** (timestamped log entries within span)
- **Status** (OK, ERROR)
- **Parent-child relationships**

### Trace Context Propagation

Trace context flows across service boundaries via HTTP headers or metadata:

```
traceparent: 00-abc123def456ghi789-xyz789012345-01
tracestate: geode=query_id:q-12847,user:analyst
```

## OpenTelemetry Integration

### Configuration

Enable tracing in Geode configuration:

```toml
# geode.toml
[tracing]
# Enable distributed tracing
enabled = true

# Exporter type: otlp, jaeger, zipkin
exporter = "otlp"

# OTLP endpoint (gRPC or HTTP)
endpoint = "http://localhost:4317"

# Service name in traces
service_name = "geode"

# Environment label
environment = "production"

# Sample rate (0.0 to 1.0)
sample_rate = 0.1

# Trace specific operations
trace_queries = true
trace_transactions = true
trace_index_operations = true
trace_storage_operations = false  # High volume
trace_network_operations = false  # Very high volume
```

### OTLP Exporter

Send traces to OpenTelemetry Collector:

```toml
[tracing]
exporter = "otlp"
endpoint = "http://otel-collector:4317"

# Optional authentication
[tracing.otlp]
headers = { "Authorization" = "Bearer ${OTEL_TOKEN}" }
compression = "gzip"
timeout_seconds = 10
```

### Jaeger Exporter

Send traces directly to Jaeger:

```toml
[tracing]
exporter = "jaeger"
endpoint = "http://jaeger:14250"

[tracing.jaeger]
agent_endpoint = "jaeger:6831"
max_packet_size = 65000
```

### Zipkin Exporter

Send traces to Zipkin:

```toml
[tracing]
exporter = "zipkin"
endpoint = "http://zipkin:9411/api/v2/spans"
```

## Automatic Instrumentation

Geode automatically instruments key operations:

### Query Execution Spans

```
Span: execute_gql_query
  trace_id: abc123def456ghi789
  span_id: xyz789012345
  start_time: 2026-01-24T10:15:30.000Z
  duration: 145ms
  status: OK

  Attributes:
    db.system: geode
    db.operation: query
    db.statement: "MATCH (u:User) WHERE u.age > 25 RETURN u"
    db.query_id: q-12847
    db.user: analyst@example.com
    db.client_type: python
    db.rows_returned: 1250
    db.cache_hit: false

  Events:
    - timestamp: +5ms, name: "parsing_completed"
    - timestamp: +15ms, name: "optimization_completed"
    - timestamp: +140ms, name: "execution_completed"
```

Child spans for query pipeline stages:

```
├─ Span: parse_query (5ms)
│  Attributes:
│    query.length: 42
│    query.tokens: 8

├─ Span: optimize_plan (10ms)
│  Attributes:
│    plan.type: indexed_lookup
│    plan.estimated_cost: 125.4
│    plan.index_used: User.age

├─ Span: execute_plan (125ms)
│  Attributes:
│    execution.rows_scanned: 5234
│    execution.rows_filtered: 3984
│    execution.rows_returned: 1250

└─ Span: serialize_response (5ms)
   Attributes:
     serialization.format: json
     serialization.bytes: 125840
```

### Transaction Spans

```
Span: transaction
  trace_id: def456ghi789abc123
  span_id: abc123xyz789
  start_time: 2026-01-24T10:16:00.000Z
  duration: 2340ms
  status: OK

  Attributes:
    db.system: geode
    db.operation: transaction
    db.transaction_id: tx-456
    db.isolation_level: SERIALIZABLE
    db.queries_count: 5
    db.rows_modified: 125

  Child Spans:
    ├─ begin_transaction (2ms)
    ├─ execute_query_1 (145ms)
    ├─ execute_query_2 (234ms)
    ├─ execute_query_3 (87ms)
    ├─ execute_query_4 (156ms)
    ├─ execute_query_5 (98ms)
    └─ commit_transaction (15ms)
       Attributes:
         commit.wal_position: 00000001000000CD
         commit.fsync_duration_ms: 8
```

### Index Operation Spans

```
Span: index_build
  trace_id: ghi789abc123def456
  span_id: def456abc123
  start_time: 2026-01-24T10:17:00.000Z
  duration: 45000ms
  status: OK

  Attributes:
    db.system: geode
    db.operation: index_build
    db.index_name: User.email
    db.index_type: btree
    db.table: User
    db.column: email
    db.rows_indexed: 1000000
    db.index_size_bytes: 67108864

  Events:
    - timestamp: +100ms, name: "scan_started"
    - timestamp: +30000ms, name: "sort_completed"
    - timestamp: +44000ms, name: "index_written"
    - timestamp: +45000ms, name: "index_activated"
```

## Custom Instrumentation

Add application-specific spans for business logic:

### Python Client

```python
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
import geode_client

# Get tracer
tracer = trace.get_tracer(__name__)

async def recommend_products(user_id):
    # Create parent span for entire recommendation flow
    with tracer.start_as_current_span("recommend_products") as span:
        span.set_attribute("user_id", user_id)
        span.set_attribute("algorithm", "collaborative_filtering")

        try:
            # Fetch user preferences (creates child span automatically)
            with tracer.start_as_current_span("fetch_user_preferences"):
                client = await geode_client.connect("localhost:3141")
                preferences = await client.execute(
                    "MATCH (u:User {id: $id})-[:LIKES]->(p:Product) RETURN p",
                    {"id": user_id}
                )
                span.set_attribute("preferences_count", len(preferences))

            # Find similar users
            with tracer.start_as_current_span("find_similar_users") as sim_span:
                similar_users = await client.execute("""
                    MATCH (u1:User {id: $id})-[:LIKES]->(p:Product)<-[:LIKES]-(u2:User)
                    WHERE u1 <> u2
                    RETURN u2, count(p) as common_likes
                    ORDER BY common_likes DESC
                    LIMIT 10
                """, {"id": user_id})
                sim_span.set_attribute("similar_users_found", len(similar_users))

            # Generate recommendations
            with tracer.start_as_current_span("generate_recommendations") as rec_span:
                recommendations = await compute_recommendations(
                    preferences,
                    similar_users
                )
                rec_span.set_attribute("recommendations_count", len(recommendations))

                # Add event to span
                rec_span.add_event(
                    "recommendations_generated",
                    attributes={"algorithm_version": "2.1"}
                )

            # Mark span as successful
            span.set_status(Status(StatusCode.OK))
            return recommendations

        except Exception as e:
            # Record error in span
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise
```

### Go Client

```go
package main

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
    "go.codepros.org/geode"
)

var tracer = otel.Tracer("myapp")

func recommendProducts(ctx context.Context, userID int64) ([]Product, error) {
    ctx, span := tracer.Start(ctx, "recommend_products")
    defer span.End()

    span.SetAttributes(
        attribute.Int64("user_id", userID),
        attribute.String("algorithm", "collaborative_filtering"),
    )

    // Fetch preferences
    ctx, prefSpan := tracer.Start(ctx, "fetch_user_preferences")
    preferences, err := db.Query(ctx, `
        MATCH (u:User {id: $id})-[:LIKES]->(p:Product)
        RETURN p
    `, geode.Params{"id": userID})
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return nil, err
    }
    prefSpan.SetAttributes(attribute.Int("preferences_count", len(preferences)))
    prefSpan.End()

    // Generate recommendations
    ctx, recSpan := tracer.Start(ctx, "generate_recommendations")
    recommendations := computeRecommendations(preferences)
    recSpan.SetAttributes(attribute.Int("recommendations_count", len(recommendations)))
    recSpan.End()

    span.SetStatus(codes.Ok, "Success")
    return recommendations, nil
}
```

### Rust Client

```rust
use opentelemetry::trace::{Tracer, Span, Status};
use opentelemetry::KeyValue;

async fn recommend_products(user_id: i64) -> Result<Vec<Product>> {
    let tracer = opentelemetry::global::tracer("myapp");

    let mut span = tracer.start("recommend_products");
    span.set_attribute(KeyValue::new("user_id", user_id));
    span.set_attribute(KeyValue::new("algorithm", "collaborative_filtering"));

    let result = async {
        // Fetch preferences
        let mut pref_span = tracer.start("fetch_user_preferences");
        let preferences = client.execute(
            "MATCH (u:User {id: $id})-[:LIKES]->(p:Product) RETURN p",
            params!("id" => user_id)
        ).await?;
        pref_span.set_attribute(KeyValue::new("preferences_count", preferences.len() as i64));
        pref_span.end();

        // Generate recommendations
        let mut rec_span = tracer.start("generate_recommendations");
        let recommendations = compute_recommendations(&preferences);
        rec_span.set_attribute(KeyValue::new("recommendations_count", recommendations.len() as i64));
        rec_span.end();

        Ok(recommendations)
    }.await;

    match result {
        Ok(recs) => {
            span.set_status(Status::Ok);
            span.end();
            Ok(recs)
        }
        Err(e) => {
            span.record_error(&e);
            span.set_status(Status::error(e.to_string()));
            span.end();
            Err(e)
        }
    }
}
```

## Sampling Strategies

Control trace volume with intelligent sampling:

### Probabilistic Sampling

Sample a fixed percentage of traces:

```toml
[tracing.sampling]
strategy = "probabilistic"
rate = 0.1  # Sample 10% of all traces
```

### Tail-Based Sampling

Sample based on trace characteristics after completion:

```toml
[tracing.sampling]
strategy = "tail_based"

# Always sample errors
sample_on_error = true

# Always sample slow requests
slow_threshold_ms = 1000
sample_slow = true

# Sample transactions
sample_transactions = true

# Default rate for normal requests
default_rate = 0.05  # 5%
```

### Adaptive Sampling

Dynamically adjust sample rate based on load:

```toml
[tracing.sampling]
strategy = "adaptive"

# Target traces per second
target_tps = 100

# Adjust sample rate every N seconds
adjust_interval_seconds = 60

# Minimum sample rate
min_rate = 0.01  # 1%

# Maximum sample rate
max_rate = 1.0   # 100%
```

### Custom Sampling Rules

Define rules for specific scenarios:

```toml
[tracing.sampling.rules]
# Always sample specific users
[[tracing.sampling.rules.always]]
user = "admin@example.com"

# Always sample specific operations
[[tracing.sampling.rules.always]]
operation = "CREATE_GRAPH"

# Never sample health checks
[[tracing.sampling.rules.never]]
query_text = "MATCH (n) RETURN count(n)"
```

## Trace Analysis

### Jaeger UI

Query and visualize traces in Jaeger:

**Find slow queries**:
```
service: geode
operation: execute_gql_query
min_duration: 1s
```

**Find errors**:
```
service: geode
tags: error=true
```

**Find by user**:
```
service: geode
tags: db.user=analyst@example.com
```

### Programmatic Analysis

Query trace data via Jaeger API:

```python
import requests

# Find traces
response = requests.get(
    "http://jaeger:16686/api/traces",
    params={
        "service": "geode",
        "operation": "execute_gql_query",
        "minDuration": "1s",
        "limit": 100
    }
)

traces = response.json()

# Analyze trace durations
for trace in traces["data"]:
    root_span = trace["spans"][0]
    print(f"Trace {trace['traceID']}: {root_span['duration']/1000}ms")

    # Find slowest child span
    slowest = max(trace["spans"], key=lambda s: s["duration"])
    print(f"  Slowest operation: {slowest['operationName']} ({slowest['duration']/1000}ms)")
```

## Performance Optimization with Traces

### Identify Bottlenecks

Analyze span durations to find optimization opportunities:

1. **Sort spans by duration** to find slowest operations
2. **Compare similar traces** to find anomalies
3. **Examine span attributes** for context (index usage, row counts)
4. **Look for sequential operations** that could be parallelized

### Example Analysis

```
Trace: User recommendation flow (total: 2500ms)

├─ fetch_user_preferences (50ms) ✓ Fast
├─ find_similar_users (2200ms) ⚠️ BOTTLENECK
│  └─ expand_relationships (2150ms) ⚠️ Missing index?
└─ generate_recommendations (250ms) ✓ Acceptable

Action: Add index on LIKES relationship
Expected improvement: 2200ms → 150ms
```

## Best Practices

**Strategic Sampling**: Use tail-based sampling to capture all errors and slow requests while sampling normal traffic.

**Meaningful Span Names**: Use descriptive operation names (e.g., "recommend_products", not "function_A").

**Rich Attributes**: Include relevant context in span attributes for filtering and analysis.

**Avoid High Cardinality**: Don't use unbounded values (user IDs, query text) as span names.

**Propagate Context**: Ensure trace context flows through all service boundaries.

**Monitor Overhead**: Tracing should consume <2% of CPU; adjust sampling if higher.

**Correlate with Logs**: Include trace IDs in logs for cross-pillar correlation.

**Set Retention Policies**: Retain traces for 3-7 days (longer than logs, shorter than metrics).

## Related Topics

- [System Observability](/tags/observability/) - Observability pillars
- [Application Logging](/tags/logging/) - Structured logging
- [Performance Metrics](/tags/metrics/) - Metrics collection
- [System Monitoring](/tags/monitoring/) - Monitoring strategies
- [Performance Tuning](/tags/performance/) - Optimization techniques
- [Profiling](/tags/profiling/) - Query profiling

## Further Reading

- OpenTelemetry Documentation
- Distributed Tracing Best Practices
- Jaeger Deployment Guide
- Trace-Based Debugging Patterns
- Performance Optimization with Traces
