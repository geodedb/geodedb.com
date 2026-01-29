---
title: "Application Logging"
description: "Comprehensive logging guide for Geode including structured logging, log levels, log aggregation, analysis, and logging best practices for production deployments."
keywords:
  - logging
  - structured logging
  - log levels
  - log aggregation
  - Elasticsearch
  - Loki
  - JSON logging
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/logging/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Application logging is a critical component of system observability, providing detailed event records that capture the "why" behind system behavior. Geode implements comprehensive structured logging in JSON format, making logs machine-readable, easily queryable, and integrable with modern log aggregation platforms.

Effective logging enables debugging, security auditing, performance analysis, and compliance tracking. Geode's logging system balances detail with performance, providing rich context without impacting query throughput.

This guide covers logging architecture, configuration, best practices, log analysis techniques, and integration with popular log management platforms.

## Structured Logging Architecture

Geode uses structured logging where each log entry is a JSON object with consistent fields:

```json
{
  "timestamp": "2026-01-24T10:15:30.123456Z",
  "level": "INFO",
  "logger": "geode.query.executor",
  "message": "Query executed successfully",
  "query_id": "q-12847",
  "user": "analyst@example.com",
  "client_type": "python",
  "duration_ms": 45.3,
  "rows_returned": 1250,
  "plan_type": "indexed_lookup",
  "trace_id": "abc123def456",
  "span_id": "xyz789"
}
```

**Benefits**:
- **Machine-Readable**: Easy parsing and analysis with tools like jq, Elasticsearch, or Loki
- **Queryable**: Search and filter by any field
- **Consistent**: Predictable structure across all log entries
- **Contextual**: Rich metadata for debugging
- **Correlatable**: Links to traces and metrics via IDs

## Log Configuration

### Basic Configuration

```toml
# geode.toml
[logging]
# Log level: DEBUG, INFO, WARN, ERROR
level = "INFO"

# Output format: json or text
format = "json"

# Output destination: stdout, stderr, file
output = "stdout"

# File path (when output = "file")
file = "/var/log/geode/geode.log"

# File rotation settings
rotate_size = "100MB"
rotate_count = 10
rotate_compress = true

# Include source location (file:line)
include_caller = true

# Include hostname
include_hostname = true
```

### Environment-Specific Configuration

**Development**:
```toml
[logging]
level = "DEBUG"
format = "text"  # Human-readable
output = "stdout"
include_caller = true
```

**Production**:
```toml
[logging]
level = "INFO"
format = "json"  # Machine-readable
output = "file"
file = "/var/log/geode/geode.log"
rotate_size = "100MB"
rotate_count = 30
rotate_compress = true
include_caller = false  # Reduce overhead
```

### Per-Component Log Levels

Configure granular log levels for different subsystems:

```toml
[logging.levels]
"geode.query" = "DEBUG"
"geode.transaction" = "INFO"
"geode.storage" = "WARN"
"geode.network" = "INFO"
"geode.security" = "INFO"
```

## Log Levels

### DEBUG

Detailed diagnostic information for development and troubleshooting:

```json
{
  "level": "DEBUG",
  "logger": "geode.query.optimizer",
  "message": "Query plan generated",
  "query_id": "q-12847",
  "plan_type": "indexed_lookup",
  "estimated_cost": 125.4,
  "estimated_rows": 1250,
  "index_candidates": ["User.email", "User.created_at"],
  "selected_index": "User.email",
  "plan_json": "{...}"
}
```

**Use Cases**:
- Understanding query optimization decisions
- Debugging application logic
- Analyzing execution paths
- Development and testing

### INFO

General operational events indicating normal system behavior:

```json
{
  "level": "INFO",
  "logger": "geode.query.executor",
  "message": "Query executed successfully",
  "query_id": "q-12847",
  "duration_ms": 45.3,
  "rows_returned": 1250,
  "cache_hit": false
}
```

**Use Cases**:
- Tracking query execution
- Monitoring transaction commits
- Connection lifecycle events
- Checkpoint completion

### WARN

Warning conditions that don't prevent operation but may require attention:

```json
{
  "level": "WARN",
  "logger": "geode.query.executor",
  "message": "Slow query detected",
  "query_id": "q-12847",
  "duration_ms": 1234.5,
  "threshold_ms": 1000,
  "query_text": "MATCH (n) RETURN n",
  "recommendation": "Add index or limit result set"
}
```

**Use Cases**:
- Slow query detection
- Connection pool pressure
- Memory pressure warnings
- Configuration issues

### ERROR

Error conditions requiring immediate attention:

```json
{
  "level": "ERROR",
  "logger": "geode.transaction",
  "message": "Transaction failed to commit",
  "transaction_id": "tx-456",
  "error": "Serialization failure",
  "error_code": "40001",
  "retry_count": 3,
  "query_count": 5,
  "duration_ms": 2340,
  "stack_trace": "...",
  "user": "analyst@example.com"
}
```

**Use Cases**:
- Transaction failures
- Connection errors
- Storage errors
- Authentication failures

## Log Categories

### Query Logs

Track query execution lifecycle:

```json
// Query started
{
  "level": "DEBUG",
  "logger": "geode.query",
  "message": "Query execution started",
  "query_id": "q-12847",
  "query_text": "MATCH (u:User {email: $email}) RETURN u",
  "parameters": {"email": "user@example.com"},
  "user": "analyst"
}

// Query completed
{
  "level": "INFO",
  "logger": "geode.query",
  "message": "Query execution completed",
  "query_id": "q-12847",
  "status": "success",
  "duration_ms": 45.3,
  "rows_returned": 1,
  "plan_cache_hit": true
}

// Query failed
{
  "level": "ERROR",
  "logger": "geode.query",
  "message": "Query execution failed",
  "query_id": "q-12847",
  "error": "Syntax error near line 1",
  "query_text": "MATCHH (u:User) RETURN u",
  "position": 0
}
```

### Transaction Logs

Track transaction lifecycle:

```json
// Transaction begin
{
  "level": "INFO",
  "logger": "geode.transaction",
  "message": "Transaction started",
  "transaction_id": "tx-456",
  "isolation_level": "SERIALIZABLE",
  "user": "analyst"
}

// Transaction commit
{
  "level": "INFO",
  "logger": "geode.transaction",
  "message": "Transaction committed",
  "transaction_id": "tx-456",
  "duration_ms": 2340,
  "queries_executed": 5,
  "rows_modified": 125
}

// Transaction rollback
{
  "level": "WARN",
  "logger": "geode.transaction",
  "message": "Transaction rolled back",
  "transaction_id": "tx-456",
  "reason": "Serialization failure",
  "duration_ms": 1850,
  "queries_executed": 3
}
```

### Connection Logs

Track client connectivity:

```json
// Connection established
{
  "level": "INFO",
  "logger": "geode.connection",
  "message": "Client connected",
  "connection_id": "conn-789",
  "client_address": "192.168.1.100:54321",
  "client_type": "python",
  "client_version": "0.1.3",
  "tls_version": "TLS1.3"
}

// Connection closed
{
  "level": "INFO",
  "logger": "geode.connection",
  "message": "Client disconnected",
  "connection_id": "conn-789",
  "duration_seconds": 3600,
  "queries_executed": 1247,
  "bytes_sent": 12458934,
  "bytes_received": 458723
}

// Connection error
{
  "level": "ERROR",
  "logger": "geode.connection",
  "message": "Connection failed",
  "client_address": "192.168.1.100:54321",
  "error": "TLS handshake failure",
  "error_code": "SSL_ERROR_HANDSHAKE_FAILURE"
}
```

### Security Logs

Track authentication and authorization:

```json
// Authentication success
{
  "level": "INFO",
  "logger": "geode.security",
  "message": "User authenticated",
  "user": "analyst@example.com",
  "client_address": "192.168.1.100",
  "auth_method": "password",
  "session_id": "sess-abc123"
}

// Authentication failure
{
  "level": "WARN",
  "logger": "geode.security",
  "message": "Authentication failed",
  "user": "analyst@example.com",
  "client_address": "192.168.1.100",
  "reason": "Invalid password",
  "attempts": 3
}

// Authorization failure
{
  "level": "WARN",
  "logger": "geode.security",
  "message": "Access denied",
  "user": "analyst@example.com",
  "action": "CREATE_GRAPH",
  "resource": "ProductionGraph",
  "required_permission": "graph:admin"
}
```

### Storage Logs

Track persistence operations:

```json
// Checkpoint started
{
  "level": "INFO",
  "logger": "geode.storage",
  "message": "Checkpoint started",
  "checkpoint_id": "ckpt-123",
  "wal_position": "00000001000000AB"
}

// Checkpoint completed
{
  "level": "INFO",
  "logger": "geode.storage",
  "message": "Checkpoint completed",
  "checkpoint_id": "ckpt-123",
  "duration_ms": 15234,
  "bytes_written": 1073741824,
  "buffers_flushed": 131072
}

// Disk space warning
{
  "level": "WARN",
  "logger": "geode.storage",
  "message": "Low disk space",
  "filesystem": "/var/lib/geode",
  "bytes_available": 1073741824,
  "bytes_total": 107374182400,
  "usage_percent": 90
}
```

## Log Analysis Techniques

### Using jq for Log Analysis

**Filter by level**:
```bash
# Show only errors
jq 'select(.level == "ERROR")' /var/log/geode/geode.log

# Show warnings and errors
jq 'select(.level == "WARN" or .level == "ERROR")' /var/log/geode/geode.log
```

**Filter by time range**:
```bash
# Logs from last hour
jq 'select(.timestamp > "2026-01-24T09:00:00Z")' /var/log/geode/geode.log

# Logs within specific timeframe
jq 'select(.timestamp >= "2026-01-24T09:00:00Z" and
           .timestamp <= "2026-01-24T10:00:00Z")' /var/log/geode/geode.log
```

**Analyze slow queries**:
```bash
# Queries over 1 second
jq 'select(.logger == "geode.query" and .duration_ms > 1000) |
    {query_id, duration_ms, query_text}' /var/log/geode/geode.log

# Top 10 slowest queries
jq 'select(.logger == "geode.query") | {query_id, duration_ms, query_text}' \
  /var/log/geode/geode.log | jq -s 'sort_by(.duration_ms) | reverse | .[0:10]'
```

**Group errors by type**:
```bash
# Count errors by message
jq -r 'select(.level == "ERROR") | .message' /var/log/geode/geode.log | \
  sort | uniq -c | sort -rn

# Group by error code
jq -r 'select(.level == "ERROR" and .error_code) | .error_code' \
  /var/log/geode/geode.log | sort | uniq -c | sort -rn
```

**Track user activity**:
```bash
# Queries by user
jq 'select(.logger == "geode.query") | {user, query_id}' \
  /var/log/geode/geode.log | jq -r '.user' | sort | uniq -c | sort -rn

# Failed authentications by user
jq 'select(.logger == "geode.security" and .message == "Authentication failed") |
    {user, client_address, reason}' /var/log/geode/geode.log
```

## Log Aggregation and Centralization

### Elasticsearch + Kibana

**Filebeat Configuration**:
```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/geode/*.log
    json.keys_under_root: true
    json.add_error_key: true
    json.message_key: message

processors:
  - add_host_metadata: ~
  - add_cloud_metadata: ~
  - add_docker_metadata: ~

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "geode-logs-%{+yyyy.MM.dd}"
  username: "elastic"
  password: "${ELASTICSEARCH_PASSWORD}"

setup.kibana:
  host: "kibana:5601"
```

**Kibana Query Examples**:
```
# Slow queries
level: "WARN" AND message: "Slow query" AND duration_ms > 1000

# Failed transactions
level: "ERROR" AND logger: "geode.transaction"

# User activity
user: "analyst@example.com" AND logger: "geode.query"
```

### Grafana Loki

**Promtail Configuration**:
```yaml
# promtail.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

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
            logger: logger
            timestamp: timestamp
            message: message
            query_id: query_id
            user: user
      - timestamp:
          source: timestamp
          format: RFC3339Nano
      - labels:
          level:
          logger:
```

**LogQL Queries**:
```logql
# All error logs
{job="geode"} | json | level="ERROR"

# Slow queries
{job="geode"} | json | logger="geode.query" | duration_ms > 1000

# User activity rate
rate({job="geode"} | json | user="analyst@example.com" [5m])

# Error rate by logger
sum(rate({job="geode"} | json | level="ERROR" [5m])) by (logger)
```

### Splunk

**Inputs Configuration**:
```ini
# inputs.conf
[monitor:///var/log/geode/*.log]
disabled = false
index = geode
sourcetype = geode:json
```

**Search Queries**:
```
# Slow queries
index=geode level=WARN message="Slow query" | stats avg(duration_ms) by query_text

# Error trends
index=geode level=ERROR | timechart count by logger

# Transaction failures
index=geode logger="geode.transaction" level=ERROR | stats count by error
```

## Logging Best Practices

**Appropriate Log Levels**: Use DEBUG sparingly in production to avoid performance impact and log volume explosion.

**Structured Fields**: Use structured fields instead of string interpolation for queryable data.

**Sensitive Data Redaction**: Avoid logging passwords, API keys, or personal data. Redact sensitive values automatically.

**Correlation IDs**: Include trace IDs, request IDs, and query IDs for correlation across log entries.

**Contextual Information**: Include user, client type, and other context in every log entry.

**Log Sampling**: Sample high-volume DEBUG logs to reduce overhead while maintaining visibility.

**Retention Policies**: Define appropriate retention periods based on compliance and operational needs (typically 7-90 days).

**Performance Impact**: Monitor logging overhead and adjust levels if exceeding 5% CPU impact.

**Timezone Consistency**: Use UTC timestamps consistently to avoid timezone confusion.

## Related Topics

- [System Observability](/tags/observability/) - Observability pillars
- [Distributed Tracing](/tags/tracing/) - Request flow tracing
- [System Monitoring](/tags/monitoring/) - Monitoring strategies
- [Performance Metrics](/tags/metrics/) - Metrics collection
- [Troubleshooting](/tags/troubleshooting/) - Debugging techniques
- [Security](/tags/security/) - Security logging

## Further Reading

- Structured Logging Best Practices
- Log Analysis Techniques
- Log Aggregation Platform Comparison
- Production Logging Patterns
- Compliance and Audit Logging
