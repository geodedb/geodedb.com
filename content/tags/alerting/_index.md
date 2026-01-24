---
title: "Alert Management"
description: "Comprehensive alerting guide for Geode including alert rules, thresholds, notification channels, alert fatigue prevention, and incident response strategies."
keywords:
  - alerting
  - alerts
  - notifications
  - Prometheus alerts
  - Alertmanager
  - incident response
  - on-call
  - SLO
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/alerting/"
    noindex: false
---

Alert management is the practice of defining, configuring, and responding to automated notifications when system conditions deviate from expected behavior. Effective alerting enables rapid incident response, reduces downtime, and ensures service level objectives (SLOs) are met while minimizing alert fatigue and false positives.

Geode integrates with Prometheus Alertmanager for flexible, powerful alerting on metrics, supporting multi-channel notifications, alert grouping, silencing, and escalation policies. Combined with comprehensive metrics coverage, Geode enables proactive monitoring and rapid problem detection.

This guide covers alert design principles, critical alert rules, notification configuration, alert fatigue prevention, and incident response workflows.

## Alerting Philosophy

### Alert on Symptoms, Not Causes

Focus alerts on user-impacting symptoms rather than internal metrics:

**Good (Symptom-Based)**:
```yaml
# High query error rate (users experiencing failures)
- alert: HighQueryErrorRate
  expr: rate(geode_queries_total{status="error"}[5m]) > 10

# Slow query latency (users experiencing delays)
- alert: HighQueryLatency
  expr: histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[5m])) > 1.0
```

**Bad (Cause-Based)**:
```yaml
# High CPU (may not impact users)
- alert: HighCPU
  expr: cpu_usage > 0.8

# High memory (may be normal)
- alert: HighMemory
  expr: memory_usage > 0.7
```

### Actionable Alerts Only

Every alert should require human action. If no action is needed, it's not an alert—it's a metric to track in dashboards.

**Actionable**: "Database is down" → Immediate response required
**Not Actionable**: "CPU at 60%" → Normal operation, monitor in dashboard

## Alert Severity Levels

### Critical Alerts

System down or severe degradation requiring immediate response:

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
          team: database
        annotations:
          summary: "Geode instance {{ $labels.instance }} is down"
          description: "Geode has been unreachable for more than 1 minute"
          runbook: "https://docs.geodedb.com/runbooks/geode-down"

      - alert: HighQueryErrorRate
        expr: |
          rate(geode_queries_total{status="error"}[5m]) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High query error rate on {{ $labels.instance }}"
          description: "Error rate is {{ $value }} errors/sec (threshold: 10/sec)"
          runbook: "https://docs.geodedb.com/runbooks/high-error-rate"

      - alert: DiskSpaceCritical
        expr: |
          geode_disk_free_bytes / geode_disk_total_bytes < 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Critical disk space on {{ $labels.instance }}"
          description: "Only {{ $value | humanizePercentage }} disk space remaining"
          runbook: "https://docs.geodedb.com/runbooks/disk-space"

      - alert: MemoryExhaustion
        expr: |
          geode_memory_used_bytes / geode_memory_total_bytes > 0.95
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Memory near exhaustion on {{ $labels.instance }}"
          description: "Memory usage at {{ $value | humanizePercentage }}"
          runbook: "https://docs.geodedb.com/runbooks/memory-pressure"
```

### Warning Alerts

Degraded performance or conditions that may lead to critical issues:

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
          description: "{{ $value }} slow queries per second (threshold: 5/sec)"
          runbook: "https://docs.geodedb.com/runbooks/slow-queries"

      - alert: HighTransactionConflicts
        expr: |
          rate(geode_transaction_conflicts_total[5m]) > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High transaction conflict rate"
          description: "{{ $value }} conflicts per second (threshold: 100/sec)"
          runbook: "https://docs.geodedb.com/runbooks/transaction-conflicts"

      - alert: ConnectionPoolPressure
        expr: |
          geode_active_connections / geode_max_connections > 0.8
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Connection pool pressure on {{ $labels.instance }}"
          description: "{{ $value | humanizePercentage }} of connection pool used"
          runbook: "https://docs.geodedb.com/runbooks/connection-pool"

      - alert: CacheHitRateLow
        expr: |
          rate(geode_cache_hits_total[5m]) /
          (rate(geode_cache_hits_total[5m]) + rate(geode_cache_misses_total[5m])) < 0.7
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate on {{ $labels.instance }}"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"
          runbook: "https://docs.geodedb.com/runbooks/cache-tuning"

      - alert: LongRunningQueries
        expr: |
          geode_active_queries{duration_seconds=">60"} > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Multiple long-running queries detected"
          description: "{{ $value }} queries running for >60 seconds"
          runbook: "https://docs.geodedb.com/runbooks/long-queries"

      - alert: WalSizeGrowing
        expr: |
          deriv(geode_wal_size_bytes[30m]) > 1e9
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "WAL size growing rapidly on {{ $labels.instance }}"
          description: "WAL growing at {{ $value | humanize1024 }}/sec"
          runbook: "https://docs.geodedb.com/runbooks/wal-growth"
```

### Info Alerts

Informational notifications that don't require immediate action:

```yaml
  - name: geode_info
    interval: 5m
    rules:
      - alert: GeodeInstanceRestarted
        expr: |
          time() - geode_start_time_seconds < 300
        labels:
          severity: info
        annotations:
          summary: "Geode instance {{ $labels.instance }} recently restarted"
          description: "Instance started {{ $value | humanizeDuration }} ago"

      - alert: IndexBuildCompleted
        expr: |
          increase(geode_index_builds_completed_total[5m]) > 0
        labels:
          severity: info
        annotations:
          summary: "Index build completed on {{ $labels.instance }}"
          description: "{{ $value }} index(es) built in the last 5 minutes"
```

## Alert Thresholds and Tuning

### Establishing Baselines

Measure normal behavior before setting thresholds:

```bash
# Calculate p95 query latency over last 7 days
promtool query instant \
  'histogram_quantile(0.95, rate(geode_query_duration_seconds_bucket[7d]))'

# Average query rate during business hours
promtool query instant \
  'avg_over_time(rate(geode_queries_total[7d])[1h:5m])'

# Peak connection count
promtool query instant \
  'max_over_time(geode_active_connections[7d])'
```

Set thresholds based on observed values:
- **Warning**: 1.5x baseline
- **Critical**: 2x baseline or SLO violation

### Dynamic Thresholds

Use statistical methods for dynamic thresholds:

**Detect anomalies using standard deviation**:
```yaml
- alert: QueryRateAnomaly
  expr: |
    abs(rate(geode_queries_total[5m]) -
        avg_over_time(rate(geode_queries_total[5m])[1h:5m])) >
      2 * stddev_over_time(rate(geode_queries_total[5m])[1h:5m])
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Anomalous query rate detected"
    description: "Current rate deviates >2 standard deviations from 1-hour average"
```

**Predict resource exhaustion**:
```yaml
- alert: DiskWillFillIn4Hours
  expr: |
    predict_linear(geode_disk_free_bytes[1h], 4 * 3600) < 0
  labels:
    severity: warning
  annotations:
    summary: "Disk will be full in approximately 4 hours"
    description: "Based on current growth rate"
```

## Alertmanager Configuration

### Basic Setup

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@example.com'
  smtp_auth_username: 'alerts@example.com'
  smtp_auth_password: '${SMTP_PASSWORD}'

# Alert routing tree
route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'instance']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    # Critical alerts to on-call
    - match:
        severity: critical
      receiver: oncall
      group_wait: 0s
      repeat_interval: 1h

    # Warnings to team channel
    - match:
        severity: warning
      receiver: team-slack
      repeat_interval: 4h

    # Info alerts to low-priority channel
    - match:
        severity: info
      receiver: info-channel
      repeat_interval: 24h

receivers:
  - name: 'default'
    email_configs:
      - to: 'team@example.com'

  - name: 'oncall'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'
        description: '{{ .GroupLabels.alertname }} on {{ .GroupLabels.instance }}'

  - name: 'team-slack'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#database-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'info-channel'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#database-info'
```

### Multi-Channel Notifications

Route alerts to appropriate channels:

```yaml
routes:
  # Database team for database-specific issues
  - match:
      team: database
    receiver: database-team
    routes:
      # Critical to PagerDuty + Slack
      - match:
          severity: critical
        receiver: database-oncall
        continue: true
      # All to Slack
      - receiver: database-slack

  # Infrastructure team for resource issues
  - match_re:
      alertname: (DiskSpaceCritical|MemoryExhaustion)
    receiver: infrastructure-team

receivers:
  - name: database-oncall
    pagerduty_configs:
      - service_key: '${DB_PAGERDUTY_KEY}'
    webhook_configs:
      - url: 'https://hooks.slack.com/services/...'

  - name: database-slack
    slack_configs:
      - channel: '#database-alerts'

  - name: infrastructure-team
    pagerduty_configs:
      - service_key: '${INFRA_PAGERDUTY_KEY}'
```

### Alert Grouping

Group related alerts to reduce noise:

```yaml
route:
  # Group by instance to see all issues with single node
  group_by: ['instance']
  group_wait: 30s
  group_interval: 5m

  # Don't group critical alerts (send immediately)
  routes:
    - match:
        severity: critical
      group_by: []
      group_wait: 0s
```

### Alert Silencing

Temporarily suppress alerts during maintenance:

```bash
# Silence alerts for instance during maintenance
amtool silence add \
  instance=geode-node-1 \
  --duration=2h \
  --author="ops@example.com" \
  --comment="Scheduled maintenance"

# Silence specific alert
amtool silence add \
  alertname=SlowQueryRateIncreasing \
  --duration=30m \
  --comment="Known issue, fix in progress"

# List active silences
amtool silence query

# Expire silence early
amtool silence expire <silence-id>
```

## Alert Fatigue Prevention

### Reduce False Positives

**Appropriate for duration**: Require sustained condition before alerting

```yaml
# Bad: Alert on momentary spike
- alert: HighCPU
  expr: cpu_usage > 0.8

# Good: Alert on sustained high CPU
- alert: HighCPU
  expr: cpu_usage > 0.8
  for: 10m  # Must persist for 10 minutes
```

**Set realistic thresholds**: Base on actual SLOs, not arbitrary numbers

```yaml
# Bad: Arbitrary threshold
- alert: LatencyHigh
  expr: latency_seconds > 0.1

# Good: SLO-based threshold
- alert: LatencyViolatesSLO
  expr: |
    histogram_quantile(0.99, rate(geode_query_duration_seconds_bucket[5m])) >
      1.0  # SLO: p99 < 1s
```

### Alert on Rate of Change

Detect rapid changes that indicate problems:

```yaml
- alert: ErrorRateSpiking
  expr: |
    deriv(rate(geode_queries_total{status="error"}[5m])[5m:1m]) > 10
  annotations:
    summary: "Error rate increasing rapidly"
    description: "Error rate increased by {{ $value }}/sec in last 5 minutes"
```

### Deduplicate Related Alerts

Use alert dependencies and inhibition rules:

```yaml
# alertmanager.yml
inhibit_rules:
  # If Geode is down, inhibit all other alerts for that instance
  - source_match:
      alertname: GeodeDown
    target_match_re:
      alertname: (HighQueryErrorRate|HighQueryLatency|ConnectionPoolPressure)
    equal: ['instance']

  # If disk is critical, inhibit disk warnings
  - source_match:
      alertname: DiskSpaceCritical
    target_match:
      alertname: DiskSpaceWarning
    equal: ['instance']
```

## Runbooks and Documentation

Link alerts to detailed runbooks:

```yaml
- alert: HighQueryErrorRate
  annotations:
    summary: "High query error rate on {{ $labels.instance }}"
    description: "Error rate is {{ $value }} errors/sec"
    runbook: "https://docs.geodedb.com/runbooks/high-error-rate"
```

**Example Runbook Structure**:

```markdown
# Runbook: High Query Error Rate

## Severity
Critical

## Impact
Users experiencing query failures, application functionality degraded

## Diagnosis
1. Check error breakdown:
   ```
   sum by (error_type) (rate(geode_query_errors_total[5m]))
   ```

2. View recent error logs:
   ```
   jq 'select(.level == "ERROR" and .logger == "geode.query")' \
     /var/log/geode/geode.log | tail -50
   ```

3. Check for common error patterns

## Resolution Steps
1. If syntax errors: Check application code for malformed queries
2. If connection errors: Check network connectivity and connection pool
3. If permission errors: Review access control policies
4. If resource errors: Check memory/disk availability

## Escalation
If unable to resolve in 30 minutes, escalate to database team lead
```

## Testing Alerts

Verify alert rules before deploying:

```bash
# Test alert rule syntax
promtool check rules alert-rules.yml

# Query current alert state
promtool query instant \
  'ALERTS{alertname="HighQueryErrorRate"}'

# Simulate alert condition (if safe)
# Trigger slow queries to test alert
for i in {1..100}; do
  geode-cli query "MATCH (n) RETURN n" &
done
```

## Best Practices

**Alert on SLOs**: Tie critical alerts to service level objectives that matter to users.

**Include Context**: Provide runbook links, affected instances, and resolution hints in annotations.

**Test Regularly**: Verify alert delivery and escalation paths work correctly.

**Review and Refine**: Periodically review alerts that fire frequently or never fire.

**Document Everything**: Maintain up-to-date runbooks for all critical alerts.

**Appropriate Severity**: Reserve critical alerts for situations requiring immediate human response.

**Avoid Alert Storms**: Use grouping and inhibition to prevent overwhelming responders.

**Monitor Alertmanager**: Ensure alerting system itself is reliable and monitored.

## Related Topics

- [System Monitoring](/tags/monitoring/) - Monitoring strategies
- [Performance Metrics](/tags/metrics/) - Metrics collection
- [Prometheus Integration](/tags/prometheus/) - Prometheus configuration
- [System Observability](/tags/observability/) - Observability best practices
- [Operations](/tags/operations/) - Operations guide
- [Troubleshooting](/tags/troubleshooting/) - Debugging techniques

## Further Reading

- Alert Design Best Practices
- Prometheus Alerting Rules Reference
- Alertmanager Configuration Guide
- Runbook Templates
- On-Call Incident Response Guide
