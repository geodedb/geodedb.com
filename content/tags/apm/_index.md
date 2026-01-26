---
title: "Application Performance Monitoring (APM)"
description: "Comprehensive APM guide for Geode including end-to-end application monitoring, transaction tracing, error tracking, and integration with popular APM platforms."
keywords:
  - APM
  - application performance monitoring
  - transaction tracing
  - error tracking
  - Datadog
  - New Relic
  - Elastic APM
  - performance monitoring
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/apm/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Application Performance Monitoring (APM) provides end-to-end visibility into application behavior, tracking requests from user interactions through application layers down to database queries. APM solutions combine distributed tracing, metrics collection, error tracking, and business analytics to give comprehensive insight into application health and user experience.

Geode integrates with popular APM platforms including Datadog, New Relic, Elastic APM, and AppDynamics, enabling you to monitor database performance in the context of full application request flows. This holistic view helps identify bottlenecks, understand user impact, and optimize both application and database performance.

This guide covers APM concepts, integration patterns, platform-specific configuration, and best practices for monitoring Geode-powered applications.

## APM Architecture

### Full-Stack Visibility

APM provides unified monitoring across the entire stack:

```
User Request Flow with APM:
┌─────────────────────────────────────────────────────┐
│ Browser/Mobile App                                   │
│ - Page load time: 850ms                             │
│ - JavaScript errors: 0                               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ Load Balancer                                        │
│ - Request forwarding: 2ms                            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ Application Server (Python/Go/Rust)                 │
│ - Request handling: 420ms                            │
│   ├─ Authentication: 15ms                            │
│   ├─ Business logic: 45ms                            │
│   ├─ Database queries: 350ms ◄── Geode queries      │
│   └─ Response serialization: 10ms                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ Geode Database                                       │
│ - Query execution: 350ms                             │
│   ├─ Parse: 5ms                                      │
│   ├─ Optimize: 10ms                                  │
│   ├─ Execute: 330ms                                  │
│   │  ├─ Index lookup: 30ms                           │
│   │  └─ Relationship traversal: 300ms                │
│   └─ Serialize: 5ms                                  │
└─────────────────────────────────────────────────────┘
```

APM shows that 83% of request time is spent in database queries, specifically relationship traversal—actionable insight for optimization.

## Core APM Capabilities

### Transaction Tracing

Capture distributed traces showing complete request flows:

**Transaction Overview**:
- **Transaction Name**: `POST /api/recommendations`
- **Total Duration**: 850ms
- **Status**: Success (200 OK)
- **User Impact**: 1 user request
- **Timestamp**: 2026-01-24 10:15:30 UTC

**Trace Breakdown**:
```
Transaction: POST /api/recommendations (850ms)
├─ HTTP Handler (420ms)
│  ├─ Authenticate User (15ms)
│  ├─ Get User Preferences (350ms)
│  │  └─ Geode Query: MATCH (u:User)-[:LIKES]->() (350ms)
│  │     ├─ Parse Query (5ms)
│  │     ├─ Optimize Plan (10ms)
│  │     ├─ Execute Plan (330ms)
│  │     │  ├─ Index Lookup (30ms)
│  │     │  └─ Expand Relationships (300ms) ◄── BOTTLENECK
│  │     └─ Serialize Results (5ms)
│  ├─ Compute Recommendations (45ms)
│  └─ Serialize Response (10ms)
└─ Network Transmission (430ms)
```

### Error Tracking

Capture and analyze application errors:

**Error Details**:
- **Error Type**: `DatabaseQueryError`
- **Message**: "Query timeout after 30 seconds"
- **Stack Trace**: Full Python/Go/Rust stack trace
- **Query**: `MATCH (u:User)-[*1..5]->(other) RETURN other`
- **User**: `analyst@example.com`
- **Impact**: 5 users affected in last hour
- **First Seen**: 2026-01-24 09:30:00 UTC

### Performance Metrics

Track application-level performance metrics:

**Key Metrics**:
- **Throughput**: Requests per minute
- **Latency**: p50, p95, p99 response times
- **Error Rate**: Errors per minute
- **Apdex Score**: User satisfaction metric
- **Database Time**: Time spent in database queries
- **External Services**: Time in external API calls

### Business Analytics

Connect performance to business metrics:

**User Journey Analysis**:
- **Conversion Rate**: 12.3% (impacted by slow recommendations)
- **Cart Abandonment**: 8.5% (correlated with timeout errors)
- **Revenue Per Request**: $15.42 average
- **Top Revenue Transactions**: Product search, checkout, recommendations

## APM Platform Integration

### Datadog APM

#### Installation

```python
# Python application with Datadog APM
# requirements.txt
ddtrace>=1.0.0
geode-client>=0.18.0

# Install
pip install ddtrace geode-client
```

#### Configuration

```python
# app.py
from ddtrace import tracer, patch_all
import geode_client

# Auto-instrument Python libraries
patch_all()

# Configure tracer
tracer.configure(
    hostname='datadog-agent',
    port=8126,
    service_name='recommendation-service',
    env='production',
    version='1.2.3'
)

# Geode queries automatically traced
async def get_user_preferences(user_id):
    client = geode_client.open_database('localhost:3141')
    # This query automatically creates a span in Datadog
    result, _ = await client.query(
        "MATCH (u:User {id: $id})-[:LIKES]->(p:Product) RETURN p",
        {"id": user_id}
    )

    return result
```

#### Custom Spans

```python
from ddtrace import tracer

@tracer.wrap(service='recommendation-service', resource='generate_recommendations')
async def generate_recommendations(user_id):
    span = tracer.current_span()
    span.set_tag('user_id', user_id)
    span.set_tag('algorithm', 'collaborative_filtering')

    # Business logic
    recommendations = await compute_recommendations(user_id)

    span.set_metric('recommendations_count', len(recommendations))
    return recommendations
```

### New Relic APM

#### Installation

```python
# Python application with New Relic
# requirements.txt
newrelic>=8.0.0
geode-client>=0.18.0

# Install
pip install newrelic geode-client
```

#### Configuration

```ini
# newrelic.ini
[newrelic]
license_key = YOUR_LICENSE_KEY
app_name = Recommendation Service
monitor_mode = true
log_level = info

# Distributed tracing
distributed_tracing.enabled = true

# Database monitoring
transaction_tracer.enabled = true
transaction_tracer.record_sql = obfuscated
```

Run application:

```bash
# Start with New Relic agent
NEW_RELIC_CONFIG_FILE=newrelic.ini newrelic-admin run-program python app.py
```

#### Custom Instrumentation

```python
import newrelic.agent

@newrelic.agent.background_task()
async def process_recommendations_batch():
    application = newrelic.agent.application()

    with newrelic.agent.BackgroundTask(application, name='batch_recommendations'):
        await process_batch()

# Custom metrics
newrelic.agent.record_custom_metric('Custom/Recommendations/Generated', count)
newrelic.agent.record_custom_event('RecommendationGenerated', {
    'user_id': user_id,
    'count': len(recommendations),
    'algorithm': 'collaborative_filtering'
})
```

### Elastic APM

#### Installation

```python
# Python application with Elastic APM
# requirements.txt
elastic-apm[flask]>=6.0.0
geode-client>=0.18.0

# Install
pip install elastic-apm geode-client
```

#### Configuration

```python
# app.py
from elasticapm.contrib.flask import ElasticAPM
from flask import Flask
import geode_client

app = Flask(__name__)

# Configure Elastic APM
app.config['ELASTIC_APM'] = {
    'SERVICE_NAME': 'recommendation-service',
    'SERVER_URL': 'http://apm-server:8200',
    'ENVIRONMENT': 'production',
    'CAPTURE_BODY': 'all',
    'TRANSACTION_SAMPLE_RATE': 1.0,
    'SPAN_FRAMES_MIN_DURATION': '5ms'
}

apm = ElasticAPM(app)

@app.route('/recommendations/<user_id>')
async def recommendations(user_id):
    # Transaction automatically created and traced
    client = geode_client.open_database('localhost:3141')
    # Geode query creates span
    result, _ = await client.query(
        "MATCH (u:User {id: $id})-[:LIKES]->(p:Product) RETURN p",
        {"id": user_id}
    )

    return jsonify(result)
```

#### Custom Spans

```python
import elasticapm

@elasticapm.capture_span('compute_recommendations')
async def compute_recommendations(preferences):
    # Custom span tracking
    elasticapm.set_custom_context({
        'preferences_count': len(preferences),
        'algorithm': 'collaborative_filtering'
    })

    recommendations = await algorithm.compute(preferences)

    elasticapm.label(recommendations_count=len(recommendations))
    return recommendations
```

### AppDynamics

#### Installation

```bash
# Download AppDynamics Python agent
pip install appdynamics
```

#### Configuration

```python
# app.py
from appdynamics.agent import agent

# Initialize agent
agent.initialize({
    'controller_host': 'controller.appdynamics.com',
    'controller_port': 443,
    'controller_ssl': True,
    'account_name': 'customer1',
    'account_access_key': 'your-access-key',
    'application_name': 'RecommendationService',
    'tier_name': 'API',
    'node_name': 'api-node-1'
})

# Geode queries automatically instrumented
```

## Geode-Specific APM Configuration

### Query Tagging

Add custom tags to queries for APM categorization:

```python
# Tag queries by category
result, _ = await client.query(
    query,
    params,
    tags={
        'query_category': 'recommendation',
        'business_function': 'product_discovery',
        'priority': 'high'
    }
)
```

Tags appear in APM traces:
```
Span: Geode Query
  - db.system: geode
  - db.operation: query
  - query.category: recommendation
  - business.function: product_discovery
  - priority: high
```

### Slow Query Tracking

Configure slow query threshold for APM alerting:

```toml
# geode.toml
[performance]
slow_query_threshold_ms = 1000

[apm]
# Send slow queries to APM with full details
report_slow_queries = true
include_query_text = true
include_execution_plan = true
```

### Database Metrics in APM

Geode reports database metrics to APM platforms:

**Connection Pool**:
- Active connections
- Pool utilization %
- Connection wait time

**Query Performance**:
- Queries per second
- Average query duration
- Slow query rate

**Transaction Performance**:
- Transactions per second
- Transaction duration
- Conflict rate

## APM Alerting

Configure alerts in APM platforms based on application behavior:

### Datadog Alerts

```yaml
# Datadog monitor
name: "High Geode Query Latency"
type: apm
query: |
  avg(last_5m):
    avg:trace.geode.query.duration{env:production} > 1000
message: |
  Geode query latency is high ({{ value }}ms)
  @slack-database-alerts
  @pagerduty-oncall
tags:
  - service:recommendation-service
  - database:geode
```

### New Relic Alerts

```yaml
# New Relic alert condition
name: "Geode Error Rate High"
type: apm_app_metric
metric: error_rate
condition_scope: application
terms:
  - duration: 5
    operator: above
    threshold: 5
    time_function: all
incident_preference: PER_CONDITION
```

### Elastic APM Alerts

```json
{
  "name": "Slow Geode Transactions",
  "params": {
    "threshold": 1000,
    "serviceName": "recommendation-service",
    "transactionType": "request",
    "environment": "production"
  },
  "actions": [
    {
      "group": "default",
      "id": "slack",
      "params": {
        "message": "Transaction latency exceeded threshold"
      }
    }
  ]
}
```

## Performance Optimization with APM

### Identify Bottlenecks

Use APM transaction traces to find optimization opportunities:

1. **Sort transactions by duration** to find slowest endpoints
2. **Examine span breakdowns** to identify time-consuming operations
3. **Analyze database queries** for missing indexes or inefficient patterns
4. **Check external service calls** for timeout or latency issues

**Example Analysis**:
```
Transaction: GET /user/recommendations
Total: 1250ms

Breakdown:
- Database queries: 1100ms (88%) ◄── OPTIMIZE HERE
  - User preferences query: 850ms
  - Similar users query: 250ms
- Business logic: 100ms (8%)
- Serialization: 50ms (4%)

Action: Add index on LIKES relationship
Expected: 1100ms → 150ms
```

### A/B Testing Performance

Compare performance across application versions:

```python
# Tag transactions by version for comparison
import elasticapm

elasticapm.set_custom_context({
    'version': 'v2.0.0',
    'feature_flag': 'new_recommendation_algo'
})
```

APM dashboards show:
- v1.0.0 average latency: 850ms
- v2.0.0 average latency: 320ms (62% improvement)

### Capacity Planning

Use APM data for capacity planning:

**Metrics to Track**:
- Peak requests per minute
- Database query rate at peak
- Resource utilization during peak
- Growth trends over time

**Forecast Scaling Needs**:
```
Current: 1000 req/min peak
Growth: +20% per quarter
Forecast: 1728 req/min in 3 quarters

Database scaling needed:
- Current: Single instance handles 1500 req/min
- Q3 2026: Add read replica
- Q4 2026: Partition by user geography
```

## Best Practices

**Instrument Comprehensively**: Add APM to all application layers (frontend, backend, database).

**Use Consistent Tags**: Apply consistent tagging across traces for filtering and analysis.

**Set Meaningful Transaction Names**: Use descriptive names that reflect business operations.

**Monitor Business Metrics**: Track metrics that matter to business (conversion rate, revenue).

**Configure Sampling Appropriately**: Balance visibility with overhead (sample 100% for low-volume, 10% for high-volume).

**Correlate with Logs**: Link traces to logs for comprehensive debugging.

**Set Alert Thresholds Based on SLOs**: Alert on user-impacting issues, not arbitrary thresholds.

**Review Regularly**: Analyze APM data weekly to identify trends and optimization opportunities.

## Related Topics

- [System Observability](/tags/observability/) - Observability pillars
- [Distributed Tracing](/tags/tracing/) - OpenTelemetry tracing
- [Performance Metrics](/tags/metrics/) - Metrics collection
- [System Monitoring](/tags/monitoring/) - Monitoring strategies
- [Application Logging](/tags/logging/) - Structured logging
- [Performance Tuning](/tags/performance/) - Optimization techniques

## Further Reading

- APM Platform Comparison
- Distributed Tracing Best Practices
- Performance Monitoring Strategies
- Business Metrics in APM
- End-to-End Application Monitoring
