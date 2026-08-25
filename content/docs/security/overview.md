---
title: "Security and Compliance Guide"
description: "Configure Geode authentication and policies, enable row-level security, use TDE/FLE with KMS integration, and deploy tamper-evident audit logging"
url: /docs/security/overview/
weight: 10
tags:
  - security
  - authentication
  - encryption
  - row-level-security
  - tde
  - fle
  - audit-logging
  - compliance
categories:
  - security-and-compliance
keywords:
  - RBAC
  - ABAC
  - RLS
  - TDE
  - field-level encryption
  - audit logs
  - Argon2id
---

<!-- CANARY: REQ=REQ-SEC-AUDIT-LOG-001; FEATURE="Security"; ASPECT=AuditLog; STATUS=TESTED; OWNER=security; UPDATED=2026-01-16 -->

# Security and Compliance Guide

Comprehensive security features for enterprise deployments: authentication, authorization, encryption, and audit logging.

> **Implementation note (2026-03-30)**
>
> - Implemented today: username/password, sessions, API keys, MFA, mTLS, TDE, FLE, audit logging, and RLS
> - Planned, not implemented: LDAP/Active Directory and OAuth2/OIDC
> - Current open auth gap: CLI auth management commands still operate on the local auth store rather than delegating to a running server

## Security Model Overview

Geode provides defense-in-depth security:

- **Authentication (AuthN)**: Verify user identity with username/password, session tokens, API keys, MFA, and mTLS
- **Authorization (AuthZ)**: RBAC/ABAC with Enhanced Row-Level Security (RLS) policies
- **Encryption**:
  - **TDE**: Transparent Data Encryption for data-at-rest
  - **FLE**: Field-Level Encryption for selective column encryption
- **Audit Logging**: Tamper-evident logs with cryptographic signatures
- **Transport Security**: QUIC+TLS 1.3 for data-in-transit

## Authentication and User Bootstrapping

From `USER_AUTH.md`:

### Default User Creation

**On first startup**, Geode creates the bootstrap admin user if environment variables are set:

```bash
# Set admin credentials
export GEODE_ADMIN_USERNAME="geode"
export GEODE_DEFAULT_PASSWORD="change-me-immediately"

# Start server (creates admin user on first run)
./geode serve
```

If `GEODE_ADMIN_USERNAME` is not set, the default bootstrap username is `geode`.

**Security note**: Change the bootstrap password immediately after first login.

### Current Auth Management Surface

```bash
# Online login/session workflows
geode auth login -U geode --save-session
geode auth logout
geode auth token

# Offline/on-host auth integrity workflows
geode auth init --data-dir /var/lib/geode
geode auth reseal --data-dir /var/lib/geode
geode auth verify --data-dir /var/lib/geode
```

`geode user`, `role`, `policy`, `grant`, `revoke`, and `apikey` currently operate on the **local auth store** rather than a live server connection. Treat them as offline/on-host admin tools until the `GAP-0270` delegation fix lands.

### Password Policy

From `USER_AUTH.md`:

**Configurable policies**:

- Minimum length (default: 12 characters)
- Complexity requirements (uppercase, lowercase, digits, special chars)
- Password expiration (default: 90 days)
- History (prevent reuse of last N passwords)

**Example configuration** (`geode.yaml`):

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

### Password Hashing: Argon2id

From `ARGON2ID_IMPLEMENTATION.md`:

**Geode uses Argon2id** for password hashing:

- **Memory-hard**: Resistant to GPU/ASIC attacks
- **Side-channel resistant**: Constant-time operations
- **Configurable cost**: Adjust for security/performance trade-off

**Parameters**:

- **Time cost** (t): Number of iterations (default: 3)
- **Memory cost** (m): Memory in KiB (default: 65536 = 64MB)
- **Parallelism** (p): Threads (default: 4)

**Example hash**:

```
$argon2id$v=19$m=65536,t=3,p=4$salt$hash
```

**Security benefit**: Even with database breach, passwords are computationally infeasible to crack.

## Authorization

### Role-Based Access Control (RBAC)

```gql
-- Create role
CREATE ROLE analyst;

-- Grant permissions
GRANT READ ON GRAPH SocialNetwork TO analyst;
GRANT WRITE ON GRAPH SocialNetwork.Person TO analyst;

-- Assign role to user
GRANT ROLE analyst TO alice;

-- Revoke permissions
REVOKE WRITE ON GRAPH SocialNetwork.Person FROM analyst;
```

**Permission levels**:

- `READ` - Query data
- `WRITE` - Insert/update/delete
- `ADMIN` - Manage users, roles, schema

### Attribute-Based Access Control (ABAC)

**Policy-based authorization** using node/relationship attributes:

```gql
-- Policy: Users can only see data from their department
-- Person.department must equal the caller's 'department' principal attribute
CALL geode.rls.add_attribute_policy('app', 'Person', 'department', 'department');
```

### Enhanced Row-Level Security (RLS)

From `ADVANCED_SECURITY_FEATURES_OCTOBER_2025.md`:

**RLS policies control row-level access** based on user context.

**Policy types**:

- `SELECT` - Control which rows are visible
- `INSERT` - Control which rows can be inserted
- `UPDATE` - Control which rows can be updated
- `DELETE` - Control which rows can be deleted

**Example: Tenant isolation**:

```gql
-- Create RLS policy: users see only their tenant's data
-- Person.tenant_id must equal the caller's 'tenant' principal attribute
CALL geode.rls.add_attribute_policy('app', 'Person', 'tenant_id', 'tenant');

-- Create RLS policy: prevent cross-tenant updates
-- Person.tenant_id must equal the caller's 'tenant' principal attribute
CALL geode.rls.add_attribute_policy('app', 'Person', 'tenant_id', 'tenant');
```

**Example: Data classification**:

```gql
-- Policy: only analysts can see PII
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Person', 'access_tag', 'access_tag');
```

**Policy evaluation**:

- Evaluated **before** query execution
- Policies are **combined with AND** (all must pass)
- Policies are **transparent** to application (no query rewriting needed)

**See also**: `kb/RLS_IMPLEMENTATION.md` for implementation details

## Encryption

### Transparent Data Encryption (TDE)

From `DESIGN_TDE_KMS.md` and `KMS_PROVIDER_SYSTEM.md`:

**TDE encrypts data-at-rest** transparently.

**Architecture**:

- **Encryption**: AES-256-GCM
- **Key hierarchy**: Master key → Database keys → Page keys
- **Scope**: Disk storage, WAL (Write-Ahead Log)

**Configuration**:

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

**KMS Providers**:

#### 1. Environment Variable (Development)

```bash
# 32-byte hex key for AES-256-GCM
export GEODE_TDE_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

./geode serve
```

#### 2. HashiCorp Vault (Recommended)

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

#### 3. AWS KMS

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

**Key rotation**: Online key rotation supported (re-encrypts pages with new key).

**Current storage scope**:

- per-graph store files and checkpointed storage pages
- write-ahead log / recovery path
- encrypted-at-rest operation through the graph-storage pager on current `main`

**Performance**: Optimized with memory-mapped I/O and hardware AES acceleration where available.

### Field-Level Encryption (FLE)

From `FIELD_LEVEL_ENCRYPTION.md`:

**FLE encrypts individual properties** while leaving others in plaintext.

**Use cases**:

- Encrypt PII (SSN, credit cards) while leaving non-sensitive data searchable
- Comply with data residency regulations
- Minimize exposure in case of SQL injection or data breach

**Architecture**:

- **Encryption**: AES-256-GCM per field
- **Blind indexes**: Enable equality search on encrypted data
- **Key derivation**: Per-column keys derived from master key

**Example**:

```gql
-- Create table with FLE
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT ENCRYPTED,  -- Field-level encrypted
  ssn TEXT ENCRYPTED WITH BLIND INDEX  -- Encrypted + searchable
);

-- Insert (encryption transparent)
CREATE (:User {
  id: uuid_v4(),
  name: "Alice",
  email: "[email protected]",  -- Encrypted before storage
  ssn: "123-45-6789"  -- Encrypted + blind index created
});

-- Query with blind index (equality search works)
MATCH (u:User)
WHERE u.ssn = "123-45-6789"  -- Uses blind index
RETURN u.name, u.email;  -- Decrypted transparently
```

**Blind Index**: Hash-based index allowing equality search without decryption.

**Known issue**: `GAP-0271` tracks a remaining role-parser bug on `main` where semicolon-delimited role input must be rejected to prevent FLE plaintext access bypass. See the dedicated FLE guide for the current limitation note.

**Key rotation**:

- **Online rotation**: Re-encrypt fields with new key without downtime
- **Rotation strategy**: Rotate per-column keys periodically (e.g., quarterly)

**See also**: `FIELD_LEVEL_ENCRYPTION.md` for key derivation and rotation procedures

## Audit Logging

From `AUDIT_LOGGING.md`:

**Tamper-evident audit logs** for compliance and forensics.

**Architecture**:

- **Format**: JSONL (one JSON object per line)
- **Integrity**: Hash-chained logs with cryptographic signatures
- **Redaction**: Query text NOT logged (only metadata)
- **Tracing**: Correlation IDs for distributed tracing

**What's logged**:

- Authentication events (login, logout, failed attempts)
- Authorization decisions (policy evaluations)
- Schema changes (CREATE/ALTER/DROP)
- Administrative actions (user/role management)
- Query metadata (timestamp, user, graph, execution time)

**What's NOT logged**:

- Query text (to avoid logging sensitive data)
- Query parameters
- Result sets

**Log entry example**:

```json
{
  "timestamp": "2024-01-15T14:30:00.123Z",
  "event_type": "query_executed",
  "user": "alice",
  "graph": "SocialNetwork",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "trace_id": "7c9e8d6f-5b4a-3c2d-1e0f-9a8b7c6d5e4f",
  "execution_time_ms": 23.5,
  "rows_returned": 150,
  "prev_log_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "signature": "3045022100..."
}
```

**Hash chain**: Each log entry includes `prev_log_hash` (SHA-256 of previous entry), making tampering detectable.

**Signatures**: Entries signed with server private key for non-repudiation.

**Configuration**:

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

**Syslog/CEF integration**: Forward logs to SIEM for centralized monitoring.

**See also**: `AUDIT_LOGGING.md` for log analysis and compliance mapping

## Hardening Checklist

### 1. TLS Certificate Management

**Production**: Use valid certificates from trusted CA

```bash
# Generate CSR
openssl req -new -newkey rsa:4096 -nodes \
  -keyout server-key.pem -out server-csr.pem \
  -subj "/CN=geode.example.com"

# Get certificate from CA (e.g., Let's Encrypt)
certbot certonly --standalone -d geode.example.com

# Configure Geode
./geode serve \
  --cert /etc/letsencrypt/live/geode.example.com/fullchain.pem \
  --key /etc/letsencrypt/live/geode.example.com/privkey.pem
```

### 2. Admin Password Rotation

**Rotate admin password** periodically:

```gql
ALTER USER admin SET PASSWORD 'new-strong-password-789';
```

**Enforce expiration** in `geode.yaml`:

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

### 3. Logging Destinations

**Centralized logging** for audit trails:

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

### 4. KMS Integration

**Use external KMS** for production:

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

### 5. Network Isolation

**Firewall rules**:

```bash
# Allow QUIC (UDP) on port 3141
sudo ufw allow 3141/udp

# Allow metrics endpoint (localhost only)
sudo ufw allow from 127.0.0.1 to any port 8080

# Deny all other traffic
sudo ufw default deny incoming
```

## Compliance Mapping

### GDPR (General Data Protection Regulation)

| GDPR Requirement | Geode Feature |
|------------------|---------------|
| Right to erasure | `DETACH DELETE` + FLE key deletion |
| Data minimization | RLS policies + FLE selective encryption |
| Audit trails | Tamper-evident audit logs |
| Encryption | TDE + FLE |
| Access control | RBAC/ABAC + RLS |

### HIPAA (Health Insurance Portability and Accountability Act)

| HIPAA Control | Geode Feature |
|---------------|---------------|
| Access controls (§164.312(a)(1)) | RBAC/ABAC + RLS |
| Audit controls (§164.312(b)) | Audit logging with signatures |
| Integrity (§164.312(c)(1)) | Hash chains + checksums |
| Encryption (§164.312(a)(2)(iv)) | TDE + FLE |

### PCI DSS (Payment Card Industry Data Security Standard)

| PCI DSS Requirement | Geode Feature |
|---------------------|---------------|
| Encrypt cardholder data (Req 3) | FLE with blind indexes |
| Restrict access (Req 7) | RLS policies |
| Track access (Req 10) | Audit logging |
| Regularly test security (Req 11) | CANARY governance + test coverage |

**Note**: Compliance requires operational procedures beyond database features. Consult with compliance experts.

## Security Status and Evidence

From `SECURITY_PROGRESS.md`:

**Evidence-based development**: All security features tracked with CANARY markers and test evidence.

**Current status**:

- ✅ Authentication: Argon2id hashing, password policies
- ✅ RLS: Enhanced policies (SELECT/INSERT/UPDATE/DELETE)
- ✅ TDE: AES-256-GCM with KMS integration
- ✅ FLE: Blind indexes + online key rotation
- ✅ Audit Logging: Hash-chained + signatures

See `docs/SECURITY_PROGRESS.md` for detailed status matrix.

## Next Steps

- **[Deployment Guide](/docs/ops/deployment)** - Production security setup (Vault, Nginx, TLS)
- **[Monitoring and Telemetry](/docs/ops/observability)** - Audit log analysis
- **[User Authentication](/docs/security/password-hashing/)** - Detailed AuthN reference
- **[RLS Implementation](/docs/security/overview/#enhanced-row-level-security-rls)** - Deep dive into RLS evaluation
- **[KMS Provider System](/docs/security/kms-integration/)** - KMS configuration guide
