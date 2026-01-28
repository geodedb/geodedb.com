---
title: "Security Architecture"
description: "Geode's security architecture including authentication, authorization, encryption, audit logging, and compliance features"
keywords: ["security", "authentication", "authorization", "RBAC", "encryption", "TDE", "FLE", "audit logging"]
weight: 35
slug: "security-architecture"
canonical: "https://geodedb.com/docs/architecture/security-architecture/"
---

<!-- CANARY: REQ=REQ-SECURITY-001; FEATURE="Security"; ASPECT=Documentation; STATUS=TESTED; OWNER=security; UPDATED=2026-01-28 -->

# Security Architecture

Geode implements defense-in-depth security with multiple layers of protection for enterprise deployments.

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Transport Security                  │    │
│  │              (QUIC + TLS 1.3)                   │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Authentication                      │    │
│  │         (Password, Certificate, OIDC)           │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Authorization                       │    │
│  │              (RBAC + ABAC + RLS)                │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Data Protection                     │    │
│  │              (TDE + FLE)                        │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Audit & Compliance                  │    │
│  │         (Logging, Monitoring, Alerts)           │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Transport Security

### QUIC + TLS 1.3

All client-server communication uses QUIC with mandatory TLS 1.3:

```yaml
tls:
  enabled: true
  min_version: "1.3"
  cert: "/etc/geode/certs/server.crt"
  key: "/etc/geode/certs/server.key"
  ca: "/etc/geode/certs/ca.crt"
  client_auth: "require"  # none, request, require
  ciphers:
    - "TLS_AES_256_GCM_SHA384"
    - "TLS_CHACHA20_POLY1305_SHA256"
```

### Certificate Management

```bash
# Generate CA
openssl req -x509 -newkey rsa:4096 -days 365 -nodes \
  -keyout ca-key.pem -out ca-cert.pem

# Generate server certificate
openssl req -newkey rsa:4096 -nodes \
  -keyout server-key.pem -out server-req.pem
openssl x509 -req -in server-req.pem -days 365 \
  -CA ca-cert.pem -CAkey ca-key.pem -out server-cert.pem

# Generate client certificate
openssl req -newkey rsa:4096 -nodes \
  -keyout client-key.pem -out client-req.pem
openssl x509 -req -in client-req.pem -days 365 \
  -CA ca-cert.pem -CAkey ca-key.pem -out client-cert.pem
```

## Authentication

### Password Authentication

```yaml
authentication:
  methods:
    - type: "password"
      enabled: true
      password_policy:
        min_length: 12
        require_uppercase: true
        require_lowercase: true
        require_numbers: true
        require_special: true
        max_age_days: 90
```

### Certificate Authentication

```yaml
authentication:
  methods:
    - type: "certificate"
      enabled: true
      ca_cert: "/etc/geode/certs/ca.crt"
      crl: "/etc/geode/certs/crl.pem"
      subject_mapping:
        pattern: "CN=(.+),OU=(.+)"
        username: "$1"
        roles: "$2"
```

### OIDC / OAuth 2.0

```yaml
authentication:
  methods:
    - type: "oidc"
      enabled: true
      issuer: "https://auth.example.com"
      client_id: "geode-client"
      client_secret: "${OIDC_CLIENT_SECRET}"
      scopes: ["openid", "profile", "email"]
      claim_mapping:
        username: "preferred_username"
        roles: "groups"
```

### Multi-Factor Authentication

```yaml
authentication:
  mfa:
    enabled: true
    methods:
      - type: "totp"
        issuer: "Geode"
        algorithm: "SHA256"
        digits: 6
        period: 30
```

## Authorization

### Role-Based Access Control (RBAC)

```gql
-- Create roles
CREATE ROLE analyst;
CREATE ROLE data_engineer;
CREATE ROLE admin;

-- Grant privileges
GRANT READ ON GRAPH * TO analyst;
GRANT READ, WRITE ON GRAPH analytics TO data_engineer;
GRANT ALL ON GRAPH * TO admin;

-- Assign roles to users
GRANT ROLE analyst TO 'alice';
GRANT ROLE data_engineer TO 'bob';
GRANT ROLE admin TO 'carol';
```

### Built-in Roles

| Role | Permissions |
|------|-------------|
| `reader` | Read access to all graphs |
| `writer` | Read/write access to all graphs |
| `architect` | Schema modification |
| `admin` | Full administrative access |
| `public` | Minimal read access (if enabled) |

### Attribute-Based Access Control (ABAC)

```yaml
authorization:
  abac:
    enabled: true
    policies:
      - name: "department_access"
        effect: "allow"
        conditions:
          - attribute: "user.department"
            operator: "equals"
            value: "engineering"
        actions: ["read", "write"]
        resources: ["engineering_*"]
```

### Row-Level Security (RLS)

Restrict data visibility at the row level:

```gql
-- Create RLS policy
CREATE POLICY department_isolation ON :Employee
  FOR SELECT
  USING (department = current_user_department());

-- Enable RLS on label
ALTER LABEL :Employee ENABLE ROW LEVEL SECURITY;
```

**RLS Implementation**:
```zig
pub fn applyRLS(
    query: Query,
    user: User,
    policies: []RLSPolicy
) Query {
    var filtered_query = query;

    for (policies) |policy| {
        if (policy.appliesTo(user, query)) {
            // Add policy predicate to WHERE clause
            filtered_query.addPredicate(
                policy.evaluatePredicate(user)
            );
        }
    }

    return filtered_query;
}
```

## Data Protection

### Transparent Data Encryption (TDE)

Encrypt data at rest:

```yaml
encryption:
  tde:
    enabled: true
    algorithm: "AES-256-GCM"
    key_management: "vault"
    vault:
      address: "https://vault.example.com"
      path: "secret/geode/tde-key"
      role: "geode-server"
```

### Field-Level Encryption (FLE)

Encrypt sensitive fields:

```gql
-- Define encrypted property
ALTER LABEL :Person
  ADD PROPERTY ssn STRING ENCRYPTED;

-- Query encrypted data (automatic decryption for authorized users)
MATCH (p:Person)
WHERE p.ssn = '123-45-6789'
RETURN p.name;
```

### Searchable Encryption

Enable queries on encrypted data:

```yaml
encryption:
  fle:
    enabled: true
    searchable: true
    algorithm: "AES-256-GCM-SIV"  # Deterministic for equality search
    properties:
      - label: "Person"
        property: "ssn"
        searchable: true
      - label: "Person"
        property: "medical_record"
        searchable: false
```

## Audit Logging

### Audit Configuration

```yaml
audit:
  enabled: true
  log_file: "/var/log/geode/audit.log"
  format: "json"
  events:
    - authentication
    - authorization
    - data_access
    - schema_changes
    - admin_actions
  include:
    user: true
    timestamp: true
    query: true
    result_count: true
    client_ip: true
```

### Audit Log Format

```json
{
  "timestamp": "2026-01-28T10:30:00Z",
  "event_type": "data_access",
  "user": "alice",
  "client_ip": "192.168.1.100",
  "action": "MATCH",
  "query": "MATCH (p:Person) RETURN p.name",
  "result_count": 42,
  "duration_ms": 15,
  "status": "success"
}
```

### Audit Queries

```gql
-- View recent audit events
CALL db.audit.recent(100)

-- Search audit logs
CALL db.audit.search({
  user: 'alice',
  event_type: 'data_access',
  start_time: datetime('2026-01-01'),
  end_time: datetime('2026-01-31')
})
```

## Security Best Practices

### 1. Principle of Least Privilege

```gql
-- Create specific roles for each function
CREATE ROLE reporting_analyst;
GRANT READ ON GRAPH analytics TO reporting_analyst;
DENY WRITE ON GRAPH * TO reporting_analyst;
```

### 2. Network Segmentation

```yaml
network:
  bind_address: "10.0.1.0"  # Internal network only
  admin_bind: "127.0.0.1"   # Admin on localhost only
  allowed_networks:
    - "10.0.0.0/8"
    - "192.168.0.0/16"
```

### 3. Key Rotation

```yaml
encryption:
  key_rotation:
    enabled: true
    interval_days: 90
    retain_old_keys: 3
```

### 4. Session Management

```yaml
sessions:
  timeout_minutes: 30
  max_concurrent: 5
  idle_timeout_minutes: 15
  require_reauthentication: true
```

## Compliance

### SOC 2 Compliance

- Access controls with audit trails
- Encryption at rest and in transit
- Vulnerability management
- Incident response procedures

### GDPR Compliance

```gql
-- Right to be forgotten
MATCH (p:Person {email: 'user@example.com'})
DETACH DELETE p;

-- Data export
MATCH (p:Person {email: 'user@example.com'})
RETURN p AS personal_data;

-- Consent tracking
MATCH (p:Person {email: 'user@example.com'})
SET p.consent_given = true,
    p.consent_date = datetime();
```

### HIPAA Compliance

- PHI encryption with FLE
- Access audit logging
- Role-based access controls
- Automatic session timeout

## Monitoring Security

### Security Metrics

| Metric | Description |
|--------|-------------|
| `auth_failures_total` | Failed authentication attempts |
| `authz_denials_total` | Authorization denials |
| `encryption_operations` | Encryption/decryption count |
| `audit_events_total` | Audit events logged |

### Alerts

```yaml
alerts:
  - name: "brute_force_detection"
    condition: "auth_failures > 10 in 5m"
    severity: "critical"
    action: "block_ip"

  - name: "privilege_escalation"
    condition: "role_grants > 5 in 1h"
    severity: "warning"
    action: "notify"
```

## Next Steps

- [Storage Engine](/docs/architecture/storage-engine/) - Data encryption at rest
- [Distributed Systems](/docs/architecture/distributed-systems/) - Cluster security
- [Query Optimization](/docs/architecture/query-optimization/) - Query planning
- [Audit Logging](/docs/ops/audit-logging/) - Detailed audit configuration
