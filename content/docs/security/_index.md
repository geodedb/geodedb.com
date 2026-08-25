---
title: "Security"
description: "Enterprise security features including encryption, authentication, authorization, and compliance for Geode"
summary: "Comprehensive security documentation covering TDE, field-level encryption, Row-Level Security (RLS), KMS integration, authentication, and compliance."
weight: 75
keywords:
  - security
  - encryption
  - TDE
  - field-level encryption
  - authentication
  - authorization
  - RLS
  - row-level security
  - KMS
  - compliance
tags:
  - security
  - encryption
  - authentication
  - compliance
categories:
  - security
  - operations
toc: true
params:
  seo:
    keywords: "database security, encryption, TDE, field-level encryption, RLS, authentication, authorization, KMS, compliance"
    description: "Enterprise security for Geode including encryption at rest and in transit, fine-grained access control, and compliance features"
---

<!-- CANARY: REQ=REQ-SEC-AUDIT-LOG-001; FEATURE="Security"; ASPECT=AuditLog; STATUS=TESTED; OWNER=security; UPDATED=2026-01-16 -->

# Security

Enterprise-grade security features for protecting your data at rest, in transit, and in use. Geode provides comprehensive security capabilities including encryption, authentication, authorization, and compliance features.

> **Current implementation status (2026-03-30)**
>
> - Implemented today: TDE, FLE, RBAC/ABAC/RLS, audit logging, username/password auth, sessions, API keys, MFA, and mTLS
> - Planned, not implemented: LDAP/Active Directory and OAuth2/OIDC
> - Current open auth/tooling gap: local CLI auth commands do not yet delegate to a running server

## Overview

Security is built into every layer of Geode's architecture. From mandatory TLS 1.3 for all network connections to Transparent Data Encryption (TDE) for data at rest, Row-Level Security (RLS) for fine-grained access control, and comprehensive audit logging for compliance, Geode provides the security features enterprises require.

This section covers all security capabilities including encryption strategies, authentication mechanisms, authorization models, key management, password security, session management, and compliance features for GDPR, SOX, HIPAA, and PCI-DSS.

## Security Architecture

### Defense in Depth

Geode implements multiple layers of security:

1. **Network Security**: TLS 1.3 mandatory, no plaintext connections
2. **Authentication**: Username/password, sessions, API keys, MFA, and mTLS
3. **Authorization**: RBAC, ABAC, and RLS for access control
4. **Encryption at Rest**: TDE with AES-256-GCM
5. **Field-Level Encryption**: Searchable encryption for sensitive data
6. **Audit Logging**: Comprehensive audit trail for compliance
7. **Key Management**: Integration with HashiCorp Vault

### Zero Trust Model

- **Verify Explicitly**: Authenticate and authorize every request
- **Least Privilege**: Grant minimum required permissions
- **Assume Breach**: Monitor, log, and detect anomalies

## Topics in This Section

- **[Security Overview](/docs/security/overview/)** - Comprehensive security architecture overview including threat model, security controls, and best practices
- **[Field-Level Encryption](/docs/security/field-level-encryption/)** - Searchable encryption for sensitive fields with key rotation and performance optimization
- **[KMS Integration](/docs/security/kms-integration/)** - Key Management Service integration with HashiCorp Vault for secure key storage and rotation
- **[Password Hashing](/docs/security/password-hashing/)** - Secure password storage with Argon2id, bcrypt, and PBKDF2 algorithms
- **[Post-Quantum Readiness](/docs/security/post-quantum-readiness/)** - Cryptographic architecture for the Post-Quantum era including forward secrecy and algorithmic choices
- **[Session Management](/docs/security/session-management/)** - Secure session handling including session tokens, timeout, and revocation

## Encryption

### Transparent Data Encryption (TDE)

Encrypt all data at rest with AES-256-GCM:

```yaml
# geode.yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

**Features**:

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Scope**: All pages, indexes, and WAL segments
- **Key Rotation**: Supported with background re-encryption

**See**: [Security Overview](/docs/security/overview/#transparent-data-encryption)

### Field-Level Encryption (FLE)

Encrypt specific sensitive fields:

```gql
-- Create field with encryption
CREATE (:Person {
  name: 'Alice',
  ssn: '123-45-6789' /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar encrypt() */,
  email: 'alice@example.com'
});

-- Query encrypted field (searchable)
MATCH (p:Person)
WHERE p.ssn /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar decrypt() */ = '123-45-6789'
RETURN p.name;
```

**Features**:

- **Searchable Encryption**: Query encrypted fields
- **Deterministic Encryption**: Same plaintext → same ciphertext (enables equality)
- **Order-Preserving Encryption**: Range queries on encrypted data
- **Key Rotation**: Re-encrypt data with new keys

**See**: [Field-Level Encryption](/docs/security/field-level-encryption/)

### Encryption in Transit

All network communication encrypted with TLS 1.3:

```bash
# Server with TLS certificates
geode serve \
  --cert /etc/geode/certs/server-cert.pem \
  --key /etc/geode/certs/server-key.pem
```

**Features**:

- **TLS 1.3 Only**: No fallback to older versions
- **Strong Cipher Suites**: AES-256-GCM, ChaCha20-Poly1305
- **Perfect Forward Secrecy**: ECDHE key exchange
- **Certificate Validation**: Mutual TLS supported

## Authentication

### Authentication Methods

**Username/Password**:

```bash
# Connect with credentials
geode shell --username geode --password secret
```

**Multi-Factor Authentication (MFA)**:

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

**API Keys**:

```bash
# Generate API key
geode apikey create --user alice --name prod-app --scope query:execute

# Use API key
export GEODE_API_KEY="gsk_..."
geode shell
```

**LDAP/Active Directory / OAuth2/OIDC**:

These remain roadmap items, not currently implemented server features. See [Authentication](/docs/security/authentication/) for the current-state matrix and gap references.

**See**: [Security Overview](/docs/security/overview/#authentication)

### Password Security

Secure password storage with Argon2id:

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

**Supported Algorithms**:

- **Argon2id** (recommended): Resistant to GPU/ASIC attacks
- **bcrypt**: Industry standard, slower but secure
- **PBKDF2**: NIST approved, configurable iterations

**See**: [Password Hashing](/docs/security/password-hashing/)

## Authorization

### Role-Based Access Control (RBAC)

Define roles with specific permissions:

```gql
-- Create role
CREATE ROLE analyst;

-- Grant permissions
GRANT SELECT ON GRAPH SocialNetwork TO analyst;
GRANT EXECUTE ON PROCEDURE analytics.* TO analyst;

-- Assign role to user
GRANT ROLE analyst TO alice;
```

### Attribute-Based Access Control (ABAC)

Fine-grained policies based on attributes:

```gql
-- Create ABAC policy
CREATE POLICY data_scientist_policy
FOR SELECT ON :Person
WHEN user.department = 'Data Science'
  AND user.clearance_level >= 3;
```

### Row-Level Security (RLS)

Restrict access at the row level:

```gql
-- Create RLS policy
CREATE POLICY customer_isolation
FOR SELECT ON :Order
WHEN current_user.customer_id = order.customer_id;

-- Enable policy
ENABLE POLICY customer_isolation;
```

**Features**:

- **Transparent**: Policies applied automatically to queries
- **Performance**: Optimized policy evaluation
- **Composable**: Multiple policies combine with AND logic
- **Audit**: Policy evaluations logged

**See**: [Security Overview](/docs/security/overview/#row-level-security)

## Key Management

### HashiCorp Vault Integration

Centralized key management with Vault:

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

**Features**:

- **Centralized Keys**: All encryption keys in Vault
- **Key Rotation**: Automated key rotation
- **Audit**: All key access logged
- **High Availability**: Vault's HA capabilities

**See**: [KMS Integration](/docs/security/kms-integration/)

### Key Rotation

Rotate encryption keys without downtime:

```bash
# Rotate TDE key
# There is no `geode admin` subcommand. Geode's CLI is: serve, shell, query,
# lsp, backup, restore, migrate, auth, login, logout, user, role, tenant,
# policy, grant, revoke, completion, mcp.
  --old-key-id master-key-v1 \
  --new-key-id master-key-v2

# Background re-encryption
# Monitor progress:
# There is no `geode admin` subcommand. Geode's CLI is: serve, shell, query,
# lsp, backup, restore, migrate, auth, login, logout, user, role, tenant,
# policy, grant, revoke, completion, mcp.
```

## Session Management

Secure session handling:

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

**Features**:

- **Session Tokens**: Cryptographically secure tokens
- **Timeout**: Idle and absolute timeout
- **Revocation**: Immediate session termination
- **Single Sign-On**: Integration with SSO providers

**See**: [Session Management](/docs/security/session-management/)

## Compliance

### Audit Logging

Comprehensive audit trail:

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

**Audit Events**:

- **Authentication**: Login, logout, MFA challenges
- **Authorization**: Permission checks, policy evaluations
- **Data Access**: All query executions with user context
- **Schema Changes**: DDL operations
- **Administrative Actions**: User management, policy changes

**See**: [Audit Logging](/docs/ops/audit-logging/)

### Compliance Features

**GDPR Compliance**:

- Data access logging
- Right to erasure (DELETE operations)
- Data portability (export features)
- Consent tracking

**SOX Compliance**:

- Access controls for financial data
- Audit trail of all data modifications
- Separation of duties with RBAC
- Change management tracking

**HIPAA Compliance**:

- Encryption at rest and in transit
- Access controls for PHI
- Audit logging of all PHI access
- Breach notification support

**PCI-DSS Compliance**:

- Strong access controls
- Encryption of cardholder data
- Audit trails
- Network segmentation support

## Best Practices

### Encryption

- **Enable TDE**: Encrypt all data at rest
- **Use TLS 1.3**: No plaintext connections
- **Rotate Keys**: Regular key rotation schedule
- **Secure Key Storage**: Use KMS (Vault) for keys
- **Field-Level Encryption**: For highly sensitive data

### Authentication

- **Enforce Strong Passwords**: Minimum length, complexity requirements
- **Enable MFA**: Require MFA for administrative access
- **Use API Keys**: For service accounts and automation
- **Integrate with LDAP/AD**: Centralized user management
- **Monitor Failed Logins**: Alert on suspicious activity

### Authorization

- **Principle of Least Privilege**: Grant minimum required permissions
- **Use RBAC**: Role-based permissions instead of user-specific
- **Implement RLS**: Row-level isolation for multi-tenant systems
- **Regular Access Reviews**: Audit and revoke unnecessary permissions
- **Separate Duties**: No single user with all privileges

### Monitoring

- **Enable Audit Logging**: Log all security events
- **Monitor Anomalies**: Alert on unusual access patterns
- **Track Failed Auth**: Multiple failed attempts → alert
- **Review Logs**: Regular security log analysis
- **Compliance Reports**: Generate compliance reports

## Threat Model

### Threats Addressed

**Network Attacks**:

- ✅ Man-in-the-middle: TLS 1.3
- ✅ Eavesdropping: Encryption in transit
- ✅ Replay attacks: Nonce-based authentication

**Data Attacks**:

- ✅ Data theft: TDE, FLE
- ✅ Unauthorized access: RBAC, RLS
- ✅ SQL injection: Parameterized queries

**Authentication Attacks**:

- ✅ Brute force: Rate limiting, account lockout
- ✅ Credential stuffing: MFA, password policies
- ✅ Session hijacking: Secure session tokens

**Insider Threats**:

- ✅ Privilege abuse: Audit logging, RLS
- ✅ Data exfiltration: Access controls, monitoring
- ✅ Unauthorized changes: Audit trail, RBAC

### Security Controls

**Preventive Controls**:

- TLS 1.3 for all connections
- Strong authentication with MFA
- RBAC and RLS for authorization
- Encryption at rest (TDE, FLE)

**Detective Controls**:

- Comprehensive audit logging
- Anomaly detection
- Failed authentication monitoring
- Access pattern analysis

**Corrective Controls**:

- Session revocation
- Account lockout
- Policy enforcement
- Incident response procedures

## Learn More

- [Deployment Guide](/docs/ops/deployment/) - Secure production deployment
- [Audit Logging](/docs/ops/audit-logging/) - Compliance and audit trails
- [Configuration Reference](/docs/configuration/) - Security configuration
- [Troubleshooting](/docs/guides/troubleshooting/) - Security issue resolution

## Security Resources

- **Security Advisories**: Monitor for security updates
- **Best Practices Guide**: [Security Overview](/docs/security/overview/)
- **Compliance Documentation**: Regulation-specific guides
- **Security Checklist**: Pre-deployment security review

## Reporting Security Issues

Found a security vulnerability?

- **Email**: <security@codepros.org>
- **PGP Key**: Available on website
- **Response Time**: Within 48 hours
- **Disclosure**: Coordinated disclosure process

Do NOT report security issues on public issue trackers.
