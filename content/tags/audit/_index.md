---
title: "Audit Logging and Security Monitoring"
description: "Complete guide to audit logging in Geode. Learn how to track database operations, implement security monitoring, maintain compliance audit trails, and integrate with SIEM systems for comprehensive security oversight."
keywords:
  - audit
  - audit logging
  - audit trail
  - security monitoring
  - compliance
  - forensics
  - SIEM integration
  - event tracking
  - access logging
  - security events
  - Geode
  - graph database
  - enterprise security
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/audit/"
    noindex: false
    title: "Audit Logging and Security Monitoring - Geode Graph Database"
    description: "Track all database operations with Geode's comprehensive audit logging. Meet compliance requirements with detailed audit trails, security monitoring, and SIEM integration."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

Audit logging in Geode provides comprehensive tracking of all database operations, creating an immutable record of who accessed what data, when they accessed it, and what changes were made. This capability is essential for security monitoring, regulatory compliance, forensic analysis, incident response, and operational troubleshooting.

## Audit Logging Overview

Geode's audit system captures detailed information about every database interaction:

- **Authentication Events**: Login attempts, failures, session management
- **Authorization Events**: Permission checks, access grants and denials
- **Data Access**: All read operations with query details and result metadata
- **Data Modifications**: CREATE, UPDATE, DELETE operations with before/after values
- **Schema Changes**: Graph definitions, constraints, indexes, policies
- **Administrative Actions**: User management, configuration changes, maintenance
- **System Events**: Startup, shutdown, errors, resource exhaustion

### Audit Event Structure

Every audit event contains:

```json
{
  "event_id": "evt_2026012810152345678",
  "timestamp": "2026-01-28T10:15:23.456789Z",
  "event_type": "data_access",
  "severity": "info",

  "actor": {
    "user_id": "alice@example.com",
    "session_id": "sess_abc123def456",
    "roles": ["analyst", "viewer"],
    "ip_address": "192.168.1.100",
    "user_agent": "geode-client-python/0.1.3"
  },

  "operation": {
    "type": "SELECT",
    "query": "MATCH (c:Customer) WHERE c.region = $region RETURN c.name, c.email",
    "parameters": {"region": "EMEA"},
    "graph": "production",
    "duration_ms": 45,
    "rows_returned": 127,
    "bytes_transferred": 8192
  },

  "result": {
    "status": "success",
    "error_code": null,
    "error_message": null
  },

  "context": {
    "transaction_id": "txn_xyz789",
    "request_id": "req_abc123",
    "correlation_id": "corr_456def"
  }
}
```

## Enabling Audit Logging

### Command Line Configuration

```bash
# Enable comprehensive audit logging
geode serve --audit-enabled=true \
  --audit-log-level=comprehensive \
  --audit-log-file=/var/log/geode/audit.log \
  --audit-log-format=json

# Enable specific event types only
geode serve --audit-enabled=true \
  --audit-events=authentication,authorization,data_modification,admin

# Configure log rotation
geode serve --audit-log-max-size=100MB \
  --audit-log-max-files=30 \
  --audit-log-compress=true
```

### Configuration File

```yaml
# geode.yaml
audit:
  enabled: true
  level: comprehensive  # minimal, security, compliance, comprehensive

  # Event types to log
  events:
    authentication: true
    authorization: true
    data_access: true
    data_modification: true
    schema_changes: true
    admin_actions: true
    system_events: true

  # Output configuration
  output:
    file:
      path: /var/log/geode/audit.log
      format: json  # json, syslog, cef
      rotation:
        max_size: 100MB
        max_files: 30
        compress: true

    # Optional: Stream to external system
    stream:
      enabled: true
      endpoint: "https://siem.example.com/collect"
      batch_size: 100
      flush_interval: 5s

  # Data handling
  include_query_parameters: true
  include_result_data: false  # Avoid logging sensitive data
  include_before_after: true  # For modifications
  mask_sensitive_fields:
    - password
    - ssn
    - credit_card

  # Retention
  retention_days: 2555  # 7 years for compliance
```

## Audit Log Levels

### Minimal Level

Logs only critical security events:

```yaml
audit:
  level: minimal
  # Logs:
  # - Authentication failures
  # - Authorization denials
  # - Administrative actions
  # - System errors
```

### Security Level

Logs all security-relevant events:

```yaml
audit:
  level: security
  # Logs:
  # - All authentication events
  # - All authorization events
  # - Permission changes
  # - User management
  # - Configuration changes
```

### Compliance Level

Logs events required for regulatory compliance:

```yaml
audit:
  level: compliance
  # Logs:
  # - All data access (who accessed what)
  # - All data modifications (what changed)
  # - Exports and data transfers
  # - Schema changes
  # - Plus all security events
```

### Comprehensive Level

Logs everything:

```yaml
audit:
  level: comprehensive
  # Logs:
  # - Every query executed
  # - Every connection made
  # - All internal operations
  # - Performance metrics
  # - Plus all compliance events
```

## Event Types

### Authentication Events

```json
{
  "event_type": "authentication",
  "subtype": "login_success",
  "actor": {
    "user_id": "alice@example.com",
    "ip_address": "192.168.1.100",
    "auth_method": "password"
  },
  "details": {
    "mfa_used": true,
    "mfa_method": "totp",
    "session_duration": 3600
  }
}
```

Authentication subtypes:
- `login_success` - Successful login
- `login_failure` - Failed login attempt
- `logout` - User logout
- `session_expired` - Session timeout
- `mfa_challenge` - MFA initiated
- `mfa_success` - MFA passed
- `mfa_failure` - MFA failed
- `token_issued` - API token created
- `token_revoked` - API token revoked

### Authorization Events

```json
{
  "event_type": "authorization",
  "subtype": "access_denied",
  "actor": {
    "user_id": "bob@example.com",
    "roles": ["viewer"]
  },
  "details": {
    "resource": ":SensitiveData",
    "operation": "SELECT",
    "required_permission": "read:sensitive",
    "actual_permissions": ["read:public"],
    "policy_applied": "sensitive_data_policy"
  }
}
```

Authorization subtypes:
- `access_granted` - Permission check passed
- `access_denied` - Permission check failed
- `permission_granted` - New permission added
- `permission_revoked` - Permission removed
- `role_assigned` - Role given to user
- `role_removed` - Role taken from user
- `rls_applied` - Row-level security filtered results

### Data Access Events

```json
{
  "event_type": "data_access",
  "subtype": "query_executed",
  "actor": {
    "user_id": "analyst@example.com"
  },
  "operation": {
    "type": "SELECT",
    "query": "MATCH (c:Customer) WHERE c.vip = true RETURN c",
    "graph": "production",
    "labels_accessed": ["Customer"],
    "properties_accessed": ["name", "email", "vip"],
    "rows_returned": 45,
    "duration_ms": 23
  }
}
```

Data access subtypes:
- `query_executed` - Read query completed
- `data_exported` - Bulk data export
- `report_generated` - Report creation
- `aggregation_computed` - Aggregate query

### Data Modification Events

```json
{
  "event_type": "data_modification",
  "subtype": "node_updated",
  "actor": {
    "user_id": "admin@example.com"
  },
  "operation": {
    "type": "UPDATE",
    "graph": "production",
    "target": {
      "label": "Customer",
      "id": "cust_12345"
    },
    "changes": {
      "before": {"status": "active", "tier": "gold"},
      "after": {"status": "active", "tier": "platinum"}
    }
  }
}
```

Modification subtypes:
- `node_created` - New node inserted
- `node_updated` - Node properties changed
- `node_deleted` - Node removed
- `relationship_created` - New relationship
- `relationship_updated` - Relationship changed
- `relationship_deleted` - Relationship removed
- `bulk_insert` - Batch data import
- `bulk_delete` - Batch data removal

### Schema Change Events

```json
{
  "event_type": "schema_change",
  "subtype": "constraint_created",
  "actor": {
    "user_id": "dba@example.com"
  },
  "details": {
    "object_type": "constraint",
    "object_name": "unique_customer_email",
    "definition": "CONSTRAINT unique_customer_email ON :Customer ASSERT email IS UNIQUE"
  }
}
```

Schema subtypes:
- `graph_created` - New graph
- `graph_dropped` - Graph deleted
- `constraint_created` - New constraint
- `constraint_dropped` - Constraint removed
- `index_created` - New index
- `index_dropped` - Index removed
- `policy_created` - RLS policy added
- `policy_modified` - RLS policy changed
- `policy_dropped` - RLS policy removed

### Administrative Events

```json
{
  "event_type": "admin_action",
  "subtype": "user_created",
  "actor": {
    "user_id": "security_admin@example.com"
  },
  "details": {
    "target_user": "new_analyst@example.com",
    "roles_assigned": ["analyst"],
    "password_policy": "standard"
  }
}
```

Administrative subtypes:
- `user_created` - New user account
- `user_modified` - User properties changed
- `user_deleted` - User account removed
- `user_disabled` - Account disabled
- `user_enabled` - Account enabled
- `password_changed` - Password updated
- `config_changed` - Server configuration modified
- `backup_created` - Backup initiated
- `backup_restored` - Restore completed
- `maintenance_started` - Maintenance window began

## Querying Audit Logs

### Built-in Audit Queries

```gql
-- Recent authentication failures
SELECT * FROM system.audit_log
WHERE event_type = 'authentication'
  AND subtype = 'login_failure'
  AND timestamp > current_timestamp() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Data access by specific user
SELECT timestamp, operation.query, operation.rows_returned
FROM system.audit_log
WHERE actor.user_id = 'analyst@example.com'
  AND event_type = 'data_access'
  AND timestamp BETWEEN $start_date AND $end_date;

-- Modifications to sensitive labels
SELECT *
FROM system.audit_log
WHERE event_type = 'data_modification'
  AND operation.target.label IN ('Customer', 'Payment', 'Account')
ORDER BY timestamp DESC
LIMIT 100;

-- Permission escalation attempts
SELECT *
FROM system.audit_log
WHERE event_type = 'authorization'
  AND subtype = 'access_denied'
  AND details.required_permission LIKE '%admin%'
ORDER BY timestamp DESC;
```

### Command Line Queries

```bash
# Search recent audit logs
geode audit search --since=1h --event-type=authentication

# Export audit data
geode audit export --start=2026-01-01 --end=2026-01-31 \
  --format=csv --output=january-audit.csv

# Summary statistics
geode audit summary --period=24h

# Output:
# Authentication Events: 1,234
#   - Successful logins: 1,180
#   - Failed logins: 54
# Data Access Events: 45,678
#   - Queries executed: 45,678
#   - Rows returned: 2,345,678
# Modification Events: 1,234
#   - Nodes created: 456
#   - Nodes updated: 678
#   - Nodes deleted: 100
```

## Security Monitoring

### Real-Time Alerting

```yaml
# geode.yaml
audit:
  alerts:
    # Multiple failed logins
    - name: brute_force_detection
      condition: |
        count(event_type = 'authentication' AND subtype = 'login_failure')
        WHERE actor.ip_address = $ip
          AND timestamp > now() - interval '5 minutes'
        > 5
      action:
        notify:
          - channel: slack
            webhook: ${SLACK_SECURITY_WEBHOOK}
          - channel: pagerduty
            service_key: ${PAGERDUTY_KEY}

    # Unusual data access
    - name: large_data_export
      condition: |
        event_type = 'data_access'
        AND operation.rows_returned > 10000
      action:
        notify:
          - channel: email
            recipients: security@example.com

    # Admin action after hours
    - name: after_hours_admin
      condition: |
        event_type = 'admin_action'
        AND extract(hour from timestamp) NOT BETWEEN 9 AND 17
      action:
        notify:
          - channel: slack
            webhook: ${SLACK_OPS_WEBHOOK}

    # Privilege escalation
    - name: privilege_escalation
      condition: |
        event_type = 'admin_action'
        AND subtype IN ('role_assigned', 'permission_granted')
        AND details.target_role IN ('admin', 'dba', 'security_admin')
      action:
        notify:
          - channel: email
            recipients: ciso@example.com
```

### Anomaly Detection

```yaml
# geode.yaml
audit:
  anomaly_detection:
    enabled: true

    # Baseline learning period
    learning_period: 7d

    detectors:
      # Unusual access patterns
      - name: access_pattern_anomaly
        metric: queries_per_user_per_hour
        sensitivity: medium
        alert_threshold: 3.0  # standard deviations

      # Unusual data volume
      - name: data_volume_anomaly
        metric: rows_returned_per_user_per_day
        sensitivity: high
        alert_threshold: 2.5

      # New access patterns
      - name: new_label_access
        type: first_time_access
        alert_on: label
```

## SIEM Integration

### Splunk Integration

```bash
# Install Splunk forwarder
# Add Geode audit logs as input

cat > /opt/splunkforwarder/etc/system/local/inputs.conf <<EOF
[monitor:///var/log/geode/audit.log]
disabled = false
sourcetype = geode:audit:json
index = database_audit
EOF

# Configure Splunk to parse Geode audit events
cat > /opt/splunkforwarder/etc/system/local/props.conf <<EOF
[geode:audit:json]
TIME_FORMAT = %Y-%m-%dT%H:%M:%S.%6N%Z
TIME_PREFIX = "timestamp":"
KV_MODE = json
EOF
```

### Elasticsearch Integration

```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/geode/audit.log
    json.keys_under_root: true
    json.add_error_key: true
    fields:
      log_type: geode_audit
    fields_under_root: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "geode-audit-%{+yyyy.MM.dd}"
  pipeline: geode-audit-pipeline

# Create Elasticsearch pipeline for enrichment
PUT _ingest/pipeline/geode-audit-pipeline
{
  "processors": [
    {
      "date": {
        "field": "timestamp",
        "formats": ["ISO8601"]
      }
    },
    {
      "geoip": {
        "field": "actor.ip_address"
      }
    }
  ]
}
```

### Datadog Integration

```yaml
# datadog.yaml
logs:
  - type: file
    path: /var/log/geode/audit.log
    service: geode
    source: geode-audit
    sourcecategory: database

init_config:

instances:
  - min_collection_interval: 10

# Add custom metrics from audit events
dogstatsd_mapper_profiles:
  - name: geode_audit
    prefix: geode.audit.
    mappings:
      - match: "authentication.login_success"
        name: "geode.audit.login.success"
        tags:
          auth_method: "$1"
      - match: "authentication.login_failure"
        name: "geode.audit.login.failure"
        tags:
          reason: "$1"
```

### Streaming to Kafka

```yaml
# geode.yaml
audit:
  output:
    kafka:
      enabled: true
      brokers:
        - kafka1:9092
        - kafka2:9092
        - kafka3:9092
      topic: geode-audit-events
      compression: lz4
      batch_size: 100
      flush_interval: 1s
      security:
        protocol: SASL_SSL
        sasl_mechanism: PLAIN
        username: ${KAFKA_USERNAME}
        password: ${KAFKA_PASSWORD}
```

## Compliance Reporting

### Generating Compliance Reports

```bash
# Generate SOC 2 compliance report
geode audit report --framework=soc2 \
  --period=Q4-2025 \
  --output=soc2-q4-2025.pdf

# Generate GDPR data access report
geode audit report --framework=gdpr \
  --data-subject=user@example.com \
  --output=gdpr-access-report.pdf

# Generate HIPAA audit report
geode audit report --framework=hipaa \
  --period=2025 \
  --include-evidence=true \
  --output=hipaa-2025-audit.pdf
```

### Automated Compliance Checks

```yaml
# geode.yaml
audit:
  compliance:
    frameworks:
      - gdpr
      - hipaa
      - soc2

    checks:
      # GDPR: Records of processing
      - name: gdpr_article_30
        frequency: daily
        query: |
          SELECT DISTINCT actor.user_id, operation.type,
                 array_agg(DISTINCT operation.labels_accessed)
          FROM system.audit_log
          WHERE timestamp > current_timestamp() - INTERVAL '24 hours'
          GROUP BY actor.user_id, operation.type

      # HIPAA: Access to PHI
      - name: hipaa_phi_access
        frequency: daily
        query: |
          SELECT * FROM system.audit_log
          WHERE operation.labels_accessed && ARRAY['Patient', 'MedicalRecord']
            AND timestamp > current_timestamp() - INTERVAL '24 hours'
```

## Audit Log Security

### Protecting Audit Logs

```yaml
# geode.yaml
audit:
  security:
    # Encrypt audit logs
    encryption:
      enabled: true
      algorithm: aes-256-gcm
      key_source: hsm

    # Sign audit entries for integrity
    signing:
      enabled: true
      algorithm: ed25519
      key_file: /etc/geode/keys/audit-signing.key

    # Immutable storage
    immutable: true
    append_only: true

    # Access control
    access:
      read_roles:
        - security_admin
        - compliance_auditor
      write_roles: []  # Only system can write
```

### Log Integrity Verification

```bash
# Verify audit log integrity
geode audit verify --log-file=/var/log/geode/audit.log

# Output:
# Verifying audit log integrity...
# Total entries: 1,234,567
# Valid signatures: 1,234,567
# Chain integrity: OK
# No tampering detected

# Verify specific time range
geode audit verify --start=2026-01-01 --end=2026-01-31
```

## Retention and Archival

### Retention Policies

```yaml
# geode.yaml
audit:
  retention:
    # Hot storage (fast access)
    hot:
      duration: 30d
      storage: /var/log/geode/audit

    # Warm storage (compressed)
    warm:
      duration: 365d
      storage: /archive/geode/audit
      compression: zstd

    # Cold storage (long-term archive)
    cold:
      duration: 2555d  # 7 years
      storage: s3://audit-archive/geode
      encryption: true

    # Automatic purge after retention
    purge_after_retention: true
```

### Archival Commands

```bash
# Archive old audit logs
geode audit archive --older-than=30d \
  --destination=s3://audit-archive/geode \
  --compress=true

# Restore archived logs for investigation
geode audit restore --date-range=2025-01-01:2025-03-31 \
  --source=s3://audit-archive/geode \
  --destination=/tmp/audit-investigation
```

## Best Practices

### 1. Enable Audit Logging in Production

```yaml
# Always run with at least security-level auditing
audit:
  enabled: true
  level: security  # minimum for production
```

### 2. Protect Audit Log Integrity

```yaml
audit:
  security:
    signing: true
    immutable: true
    encryption: true
```

### 3. Implement Real-Time Monitoring

```yaml
audit:
  alerts:
    - name: critical_events
      condition: severity = 'critical'
      action:
        notify: immediate
```

### 4. Align Retention with Compliance

```yaml
# Common retention requirements:
# - GDPR: No specific requirement (balance with data minimization)
# - HIPAA: 6 years
# - SOC 2: 1 year minimum, 3+ years recommended
# - PCI DSS: 1 year minimum
audit:
  retention:
    duration: 2555d  # 7 years covers most requirements
```

### 5. Regular Audit Log Review

```bash
# Schedule regular reviews
# Daily: Security events
# Weekly: Access patterns
# Monthly: Compliance summary
# Quarterly: Full audit review
```

## Troubleshooting

### Missing Events

```bash
# Check audit configuration
geode audit config show

# Verify event types enabled
geode audit config show | grep events

# Check for disk space issues
df -h /var/log/geode

# Check audit log permissions
ls -la /var/log/geode/audit.log
```

### Performance Impact

```yaml
# Optimize audit performance
audit:
  async: true
  buffer_size: 10000
  flush_interval: 5s
  batch_writes: true

  # Exclude high-volume, low-value events
  exclude:
    - event_type: data_access
      operation.query: "MATCH (n) RETURN count(n)"  # Health checks
```

## Related Topics

- [Compliance](/tags/compliance/) - Regulatory compliance frameworks
- [Security](/tags/security/) - Security overview
- [Authorization](/tags/authorization/) - Access control
- [RBAC](/tags/rbac/) - Role-based access control
- [Encryption](/tags/encryption/) - Data encryption
- [Monitoring](/tags/monitoring/) - System monitoring

## Further Reading

- [Audit Logging Guide](/docs/ops/audit-logging/) - Complete audit configuration
- [Security Overview](/docs/security/overview/) - Meeting regulatory requirements
- [Security Architecture](/docs/architecture/security-architecture/) - Security design
- SIEM Integration Whitepaper - Enterprise logging integration
