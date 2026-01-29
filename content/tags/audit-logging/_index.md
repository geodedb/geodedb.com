---
title: "Audit Logging & Compliance"
description: "Comprehensive guide to audit logging in Geode. Learn how to track database operations, meet compliance requirements, and maintain detailed audit trails for security and regulatory purposes."
keywords:
  - audit logging
  - compliance
  - audit trails
  - security logging
  - forensics
  - regulatory compliance
  - event tracking
  - Geode
  - graph database
  - GDPR
  - HIPAA
  - SOC2
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/audit-logging/"
    noindex: false
    title: "Audit Logging & Compliance - Geode Graph Database"
    description: "Track all database operations with Geode's comprehensive audit logging. Meet GDPR, HIPAA, and SOC2 requirements with detailed audit trails and security event tracking."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Audit logging in Geode provides comprehensive tracking of all database operations, creating an immutable record of who accessed what data, when they accessed it, and what changes they made. This capability is essential for security monitoring, compliance requirements, forensic analysis, and operational troubleshooting.

## Overview of Audit Logging

Geode's audit logging system captures detailed information about every database operation, including:

- **User Authentication**: Login attempts, authentication failures, session creation and termination
- **Query Execution**: All GQL queries with parameters, execution time, and results metadata
- **Data Modifications**: INSERT, UPDATE, DELETE operations on nodes and relationships
- **Schema Changes**: Graph type definitions, constraint modifications, index creation
- **Access Control**: Permission checks, authorization failures, role changes
- **Configuration Changes**: Server settings, security policy updates, feature toggles
- **Administrative Actions**: User management, backup operations, maintenance tasks

All audit events include:
- Timestamp with microsecond precision
- User identity and session information
- Client IP address and connection details
- Operation type and affected resources
- Success or failure status
- Detailed error information for failures

## Enabling Audit Logging

Audit logging is configured through server settings and can be enabled at various levels of granularity:

```bash
# Enable comprehensive audit logging
geode serve --audit-log-level=comprehensive \
  --audit-log-file=/var/log/geode/audit.log \
  --audit-log-format=json

# Enable audit logging for specific operations only
geode serve --audit-log-level=security \
  --audit-events=auth,access,admin

# Configure audit log rotation
geode serve --audit-log-max-size=100MB \
  --audit-log-max-files=10 \
  --audit-log-compress=true
```

### Audit Log Levels

**Comprehensive**: Logs all database operations including queries, data modifications, schema changes, and administrative actions. Use for strict compliance environments.

**Security**: Logs authentication, authorization, access control, and security-related events. Recommended for most production deployments.

**Compliance**: Logs data access and modifications required for regulatory compliance (GDPR, HIPAA, SOC2). Optimized balance between detail and performance.

**Minimal**: Logs only critical security events like authentication failures, authorization denials, and administrative actions.

## Audit Log Format

Geode supports multiple audit log formats to integrate with existing security information and event management (SIEM) systems:

### JSON Format (Recommended)

```json
{
  "timestamp": "2026-01-24T10:15:32.123456Z",
  "event_type": "query_execution",
  "event_id": "evt_9k2j8h3g7f6d5s4a",
  "session_id": "sess_abc123def456",
  "user": {
    "username": "analyst@example.com",
    "roles": ["data_analyst", "viewer"],
    "ip_address": "192.168.1.100",
    "user_agent": "geode-client-python/0.1.3"
  },
  "operation": {
    "type": "SELECT",
    "query": "MATCH (p:Person)-[:WORKS_AT]->(c:Company) WHERE c.industry = $industry RETURN p.name, c.name",
    "parameters": {"industry": "technology"},
    "execution_time_ms": 45,
    "rows_returned": 127,
    "bytes_transferred": 8192
  },
  "result": {
    "status": "success",
    "rows_affected": 0,
    "error": null
  },
  "metadata": {
    "graph": "corporate_network",
    "transaction_id": "txn_xyz789",
    "query_plan_hash": "hash_abc123"
  }
}
```

### Syslog Format

For integration with traditional logging infrastructure:

```
Jan 24 10:15:32 geode-server audit[12345]: event=query_execution user=analyst@example.com session=sess_abc123 query="MATCH (p:Person)..." status=success rows=127 duration_ms=45
```

### Common Event Format (CEF)

For SIEM systems that support CEF:

```
CEF:0|CodePros|Geode|0.1.3|query_execution|Query Executed|5|src=192.168.1.100 suser=analyst@example.com act=SELECT outcome=success rt=Jan 24 2026 10:15:32 cs1=sess_abc123 cs1Label=SessionID
```

## Compliance Requirements

Geode's audit logging helps organizations meet various regulatory compliance requirements:

### GDPR Compliance

The General Data Protection Regulation requires organizations to maintain records of data processing activities:

- **Article 30 (Records of Processing)**: Audit logs document all personal data access and modifications
- **Article 32 (Security of Processing)**: Logs provide evidence of security measures and breach detection
- **Article 33 (Breach Notification)**: Detailed logs enable rapid breach assessment and reporting

Example GDPR-focused audit configuration:

```bash
geode serve --audit-log-level=compliance \
  --audit-events=data_access,data_modification,data_export \
  --audit-retention-days=2555  # 7 years as recommended
  --audit-include-pii-metadata=true
```

### HIPAA Compliance

The Health Insurance Portability and Accountability Act requires covered entities to maintain audit logs:

- **164.308(a)(1)(ii)(D)**: Information system activity review
- **164.312(b)**: Audit controls to record and examine system activity
- **164.312(d)**: Person or entity authentication

HIPAA-compliant audit logging configuration:

```bash
geode serve --audit-log-level=comprehensive \
  --audit-retention-days=2555 \
  --audit-events=all \
  --audit-phi-access=true \
  --audit-minimum-necessary=true
```

### SOC 2 Compliance

Service Organization Control 2 requires detailed logging for security monitoring:

- **CC6.1**: Logical and physical access controls
- **CC6.2**: Prior to issuing system credentials
- **CC7.2**: System monitoring to detect security breaches

SOC 2 audit configuration:

```bash
geode serve --audit-log-level=security \
  --audit-events=auth,access,config,admin \
  --audit-log-immutable=true \
  --audit-log-encryption=aes-256-gcm
```

## Query Audit Examples

Track specific query patterns for compliance or security monitoring:

### Tracking Personal Data Access

```gql
-- All queries accessing Person nodes are automatically logged
MATCH (p:Person {email: 'user@example.com'})
RETURN p.name, p.ssn, p.medical_records;

-- Audit log entry includes:
-- - Full query text
-- - Parameters used
-- - Rows returned
-- - Sensitive fields accessed (ssn, medical_records)
-- - User who executed the query
-- - Timestamp and session information
```

### Monitoring Data Modifications

```gql
-- Data modifications are logged with before/after values
MATCH (p:Person {id: $person_id})
SET p.salary = $new_salary
RETURN p;

-- Audit log captures:
-- - Original salary value: $85000
-- - New salary value: $92000
-- - User who made the change
-- - Timestamp and justification (if provided)
```

### Detecting Unauthorized Access Attempts

```gql
-- Failed authorization attempts are logged
MATCH (p:Person)
WHERE p.department = 'Executive'
RETURN p.salary;

-- If user lacks permission, audit log shows:
-- - Attempted query
-- - User identity
-- - Required permissions: ['read:executive_data']
-- - Actual permissions: ['read:general_data']
-- - Denial reason and timestamp
```

## Audit Log Management

### Log Rotation and Retention

Configure automatic log rotation to prevent disk space issues:

```bash
# Rotate logs daily, keep 90 days
geode serve --audit-log-rotate=daily \
  --audit-log-retention-days=90 \
  --audit-log-compress=gzip

# Rotate when logs reach size limit
geode serve --audit-log-max-size=500MB \
  --audit-log-max-files=20
```

### Secure Log Storage

Protect audit logs from tampering:

```bash
# Enable log encryption and integrity checking
geode serve --audit-log-encryption=aes-256-gcm \
  --audit-log-signing=true \
  --audit-log-key-file=/etc/geode/audit-key.pem

# Store logs on write-once storage
geode serve --audit-log-file=/mnt/worm-storage/geode-audit.log \
  --audit-log-immutable=true
```

### Log Analysis and Monitoring

Query audit logs for security monitoring:

```bash
# Search for failed authentication attempts
jq 'select(.event_type == "authentication" and .result.status == "failure")' \
  /var/log/geode/audit.log

# Find queries accessing sensitive data
jq 'select(.operation.query | contains("ssn") or contains("medical"))' \
  /var/log/geode/audit.log

# Identify unusual access patterns
jq 'select(.operation.rows_returned > 10000)' \
  /var/log/geode/audit.log | jq -s 'group_by(.user.username)'
```

## Integration with SIEM Systems

### Splunk Integration

Forward audit logs to Splunk for centralized monitoring:

```bash
# Configure Splunk forwarder
cat > /opt/splunkforwarder/etc/system/local/inputs.conf <<EOF
[monitor:///var/log/geode/audit.log]
disabled = false
sourcetype = geode:audit:json
index = database_audit
EOF
```

### Elasticsearch Integration

Send audit logs to Elasticsearch:

```bash
# Use Filebeat to ship logs
cat > /etc/filebeat/filebeat.yml <<EOF
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/geode/audit.log
  json.keys_under_root: true
  json.add_error_key: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "geode-audit-%{+yyyy.MM.dd}"
EOF
```

### Datadog Integration

Stream audit events to Datadog:

```bash
# Configure Datadog agent
cat > /etc/datadog-agent/conf.d/geode.d/conf.yaml <<EOF
logs:
  - type: file
    path: /var/log/geode/audit.log
    service: geode
    source: geode-audit
    sourcecategory: database
    tags:
      - env:production
      - database:graph
EOF
```

## Troubleshooting Audit Logging

### Missing Audit Entries

If expected events are not appearing in audit logs:

1. **Check audit level**: Ensure the event type is included in your configured audit level
2. **Verify file permissions**: Audit log file must be writable by the Geode process
3. **Check disk space**: Insufficient disk space prevents log writes
4. **Review filters**: Event filters may be excluding the events you expect

```bash
# Enable verbose audit logging for debugging
geode serve --audit-log-level=comprehensive --audit-debug=true
```

### Performance Impact

Audit logging has minimal performance impact, but comprehensive logging can affect high-throughput systems:

- **Async logging**: Logs are written asynchronously to avoid blocking queries
- **Buffering**: Events are buffered in memory before writing to disk
- **Batch writes**: Multiple events written in single I/O operations

Optimize audit logging performance:

```bash
# Configure larger buffer for high-throughput systems
geode serve --audit-log-buffer-size=10MB \
  --audit-log-flush-interval=5s
```

### Log Analysis Performance

For large audit logs, use indexed search tools:

```bash
# Index logs with lnav for fast searching
lnav /var/log/geode/audit.log

# Use jq with streaming for large files
cat audit.log | jq -c 'select(.user.username == "suspect@example.com")'
```

## Best Practices

1. **Enable audit logging in production**: Always run production systems with at least security-level auditing
2. **Protect audit logs**: Store logs on separate storage with restricted access and encryption
3. **Regular review**: Implement automated monitoring and regular manual review of audit logs
4. **Retention policies**: Align retention periods with compliance requirements (typically 7 years)
5. **Test log integrity**: Regularly verify that audit logs are being written correctly and are tamper-proof
6. **Document procedures**: Maintain clear procedures for accessing and analyzing audit logs
7. **Monitor log volume**: Set up alerts for unusual log volume that might indicate an attack or misconfiguration

## Related Topics

- [Compliance](/tags/compliance/) - Regulatory compliance frameworks (GDPR, HIPAA, SOC2)
- [Row-Level Security](/tags/row-level-security/) - Fine-grained access control with audit integration
- [Governance](/tags/governance/) - Data governance policies and enforcement
- [Encryption](/tags/encryption/) - Data encryption at rest and in transit
- [Security Overview](/docs/security/overview/) - Security documentation
