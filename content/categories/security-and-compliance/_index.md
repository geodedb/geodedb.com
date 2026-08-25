---
title: "Category: Security and Compliance"
description: "Comprehensive security and compliance documentation for Geode including authentication, authorization, encryption, audit logging, Row-Level Security, GDPR compliance, and security best practices."
keywords:
  - security
  - compliance
  - authentication
  - authorization
  - encryption
  - audit logging
  - GDPR
  - Row-Level Security
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/security-and-compliance/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

The **Security and Compliance** category provides comprehensive guidance on securing Geode deployments and meeting regulatory requirements. From authentication and encryption to audit logging and privacy compliance, these resources help you build and maintain secure, compliant graph database systems.

## Security Architecture

Geode implements defense-in-depth security with multiple layers protecting your data at every point in its lifecycle. Security is not an add-on but a fundamental aspect of Geode's architecture, with mandatory encryption, comprehensive access controls, and detailed audit capabilities built into the core system.

### Security Layers

**Network Security**: All client-server communication uses QUIC protocol with mandatory TLS 1.3 encryption. There is no plaintext fallback - encryption is always enabled, protecting data in transit against eavesdropping and tampering.

**Authentication**: Verify identity before granting any access using username/password, certificate-based authentication, or integration with external identity providers.

**Authorization**: Control what authenticated users can do through role-based access control (RBAC) and Row-Level Security (RLS) policies that filter data based on user attributes.

**Encryption**: Protect data at rest with Transparent Data Encryption (TDE) for all database files and Field-Level Encryption (FLE) for sensitive attributes requiring application-controlled keys.

**Audit Logging**: Record all database operations, authentication attempts, and authorization decisions for compliance, forensics, and threat detection.

**Data Integrity**: ACID transactions with cryptographic checksums ensure data cannot be corrupted, whether by bugs, hardware failures, or malicious actors.

## Authentication

### User Authentication

Geode supports multiple authentication mechanisms:

**Username and Password**:

```python
import geode_client

async def connect_with_password():
    client = geode_client.open_database("quic://localhost:3141")
    async with client.connection() as conn:
        auth = geode_client.AuthClient(conn)
        session = await auth.login("alice", "secure_password")
        return session
```

**Certificate-Based Authentication**:

```python
client = geode_client.Client(
    host="localhost",
    port=3141,
    ca_cert="/path/to/ca.crt",
    client_cert="/path/to/client-cert.pem",
    client_key="/path/to/client-key.pem",
)
```

**Token-Based Authentication**:

```python
async def login_and_store_token():
    client = geode_client.open_database("quic://localhost:3141")
    async with client.connection() as conn:
        auth = geode_client.AuthClient(conn)
        session = await auth.login("alice", "secure_password")
        return session.token
```

### Managing Users

```gql
-- Create user
CREATE USER alice WITH PASSWORD 'secure_password';

-- Grant roles
GRANT ROLE analyst TO USER alice;

-- Revoke roles
REVOKE ROLE analyst FROM USER alice;

-- Drop user
DROP USER alice;
```

### Password Policies

Configure password requirements for security:

```yaml
# geode.yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

## Authorization

### Role-Based Access Control (RBAC)

Define roles with specific privileges:

```gql
-- Create role
CREATE ROLE analyst;

-- Grant privileges
GRANT SELECT ON GRAPH analytics TO ROLE analyst;
GRANT INSERT, UPDATE ON GRAPH analytics TO ROLE data_engineer;
GRANT ALL PRIVILEGES ON GRAPH * TO ROLE admin;

-- Grant role to users
GRANT ROLE analyst TO USER alice, bob;
```

**Privilege Types**:

- `SELECT` - Read data
- `INSERT` - Create nodes and relationships
- `UPDATE` - Modify existing data
- `DELETE` - Remove data
- `INDEX` - Create and drop indexes
- `ADMIN` - Administrative operations

### Row-Level Security (RLS)

Implement fine-grained access control with policies that filter data based on user context:

```gql
-- Create RLS policy
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'User', 'access_tag', 'access_tag');

-- Enable RLS on label
-- Geode has no ALTER LABEL / ALTER GRAPH / property DEFAULT DDL. Labels and
-- properties are schema-free: write the new property with SET, supplying the
-- default yourself.
MATCH (u:User) WHERE u.verified IS NULL SET u.verified = false;

-- Create policy for writes
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'User', 'access_tag', 'access_tag');
```

**Policy Examples**:

```gql
-- Multi-tenant isolation
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Label', 'access_tag', 'access_tag');

-- Hierarchical access (manager sees all reports)
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Label', 'access_tag', 'access_tag');

-- Time-based access
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'SensitiveData', 'access_tag', 'access_tag');
```

Python client example:

```python
client = geode_client.open_database("quic://localhost:3141")
async with client.connection() as conn:
    auth = geode_client.AuthClient(conn)
    await auth.login("alice", "password")
    # RLS automatically filters results based on policies
    result, _ = await conn.query("""
        MATCH (u:User)
        RETURN u.name, u.department
    """)
    # Alice only sees users she's authorized to view
```

## Encryption

### Transparent Data Encryption (TDE)

TDE encrypts all database files at rest:

```bash
# Initialize encryption
# There is no `geode init`. The server creates its data directory on
# first start; TDE and FLE are always available.
geode serve --data-dir ./data

# Start server with TDE
./geode serve --tde-enabled --tde-key-file /secure/path/master.key
```

**TDE protects**:

- Data files
- Index files
- WAL (Write-Ahead Log) files
- Backup files
- Temporary files

**TDE does NOT protect**:

- Data in memory
- Data in transit (use TLS for that)
- Data in query results sent to clients

### Field-Level Encryption (FLE)

Encrypt specific sensitive fields with application-controlled keys:

```python
from geode_client import FieldEncryption

# Initialize encryption
encryption = FieldEncryption(key=encryption_key)

# Encrypt data before storing
encrypted_ssn = encryption.encrypt("123-45-6789")

await client.execute("""
    CREATE (p:Person {
        name: $name,
        ssn: $ssn
    })
""", {
    "name": "Alice",
    "ssn": encrypted_ssn
})

# Decrypt when reading
result, _ = await client.query("MATCH (p:Person {name: $name}) RETURN p.ssn", {"name": "Alice"})
ssn = encryption.decrypt(result.rows[0]["p.ssn"])
```

**FLE Use Cases**:

- Social Security Numbers
- Credit card numbers
- Health records
- Personally Identifiable Information (PII)
- Trade secrets

### Key Management

**Best practices for encryption keys**:

1. **Never hardcode keys**: Store in environment variables or key management systems
2. **Use key rotation**: Periodically change encryption keys
3. **Separate keys by purpose**: Different keys for TDE, FLE, backups
4. **Hardware Security Modules (HSM)**: Use HSM for production key storage
5. **Backup keys securely**: Encrypted backups require corresponding keys

Integration with key management systems:

```yaml
# geode.yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

## Audit Logging

Comprehensive audit logging tracks all database activity for compliance, security monitoring, and forensic analysis.

### Enabling Audit Logs

```bash
./geode serve \
    --enable-audit-log \
    --audit-log-path /var/log/geode/audit.log \
    --audit-log-format json
```

### Audit Log Contents

Each entry includes:

- **Timestamp**: When the event occurred
- **User**: Who performed the action
- **Action**: What was done (query, authentication, authorization check)
- **Result**: Success or failure
- **Query**: GQL query executed (if applicable)
- **Duration**: How long the operation took
- **Client IP**: Source of the request
- **Session ID**: Unique session identifier

Example audit entry:

```json
{
  "timestamp": "2026-01-24T10:30:45.123Z",
  "event_type": "query_execution",
  "user": "alice",
  "client_ip": "192.168.1.100",
  "session_id": "sess_abc123",
  "query": "MATCH (u:User) WHERE u.department = 'Engineering' RETURN u.name",
  "parameters": {"department": "Engineering"},
  "result": "success",
  "rows_returned": 42,
  "duration_ms": 15,
  "rls_policies_applied": ["tenant_isolation", "department_access"]
}
```

### Querying Audit Logs

```gql
-- View recent failed authentication attempts
-- Yields event_id, timestamp, category, action, outcome.
CALL audit.get_recent_events(100);

-- Identify users accessing sensitive data
-- Yields event_id, timestamp, category, action, outcome.
CALL audit.get_recent_events(100);
```

## Compliance

### GDPR Compliance

Geode provides features to support GDPR requirements:

**Right to Access**: Export all data for a specific user

```gql
MATCH (u:User {id: $user_id})-[r]-(related)
RETURN u, r, related
```

**Right to Erasure (Right to be Forgotten)**:

```gql
-- Delete user and all related data
MATCH (u:User {id: $user_id})
DETACH DELETE u
```

**Data Minimization**: Use RLS to limit data access to what's necessary

**Consent Management**: Track and enforce consent

```gql
CREATE (u:User {id: 123, email: 'alice@example.com'})
CREATE (c:Consent {
    user_id: 123,
    purpose: 'marketing',
    granted: true,
    timestamp: current_timestamp()
})

-- Check consent before processing
MATCH (u:User {id: $user_id})-[:HAS_CONSENT]->(c:Consent {purpose: 'marketing'})
WHERE c.granted = true
RETURN u
```

**Data Retention**: Automatically delete old data

```gql
-- Delete data older than retention period
MATCH (d:Data)
WHERE d.created < current_timestamp() - INTERVAL '7' YEAR
DELETE d
```

### HIPAA Compliance

For healthcare applications:

- **Encryption**: TDE and FLE for Protected Health Information (PHI)
- **Audit Logging**: Comprehensive access logs
- **Access Controls**: RLS for minimum necessary access
- **Data Integrity**: ACID guarantees prevent unauthorized modifications

### SOC 2 Compliance

Geode supports SOC 2 requirements:

- **Security**: Encryption, authentication, authorization
- **Availability**: High availability configurations, backup/restore
- **Processing Integrity**: ACID transactions, checksums
- **Confidentiality**: Encryption, access controls
- **Privacy**: RLS, data retention policies

## Security Best Practices

### Production Deployment

1. **Enable TLS**: Always use encrypted connections
2. **Use strong passwords**: Enforce password policies
3. **Principle of least privilege**: Grant minimum necessary permissions
4. **Enable audit logging**: Track all database activity
5. **Regular backups**: Encrypted backups stored securely
6. **Update promptly**: Apply security patches quickly
7. **Network isolation**: Use firewalls and private networks
8. **Monitor continuously**: Alert on suspicious activity

### Development Best Practices

1. **Never commit secrets**: Use environment variables or secrets management
2. **Use parameterized queries**: Prevent GQL injection
3. **Validate input**: Sanitize all user input
4. **Handle errors securely**: Don't expose sensitive information in error messages
5. **Test security**: Include security testing in CI/CD
6. **Review dependencies**: Keep client libraries updated
7. **Document security architecture**: Maintain security documentation

### Query Security

Prevent GQL injection by using parameters:

```python
# UNSAFE - vulnerable to injection
user_input = request.form["name"]
query = f"MATCH (u:User {{name: '{user_input}'}}) RETURN u"
await client.execute(query)

# SAFE - uses parameters
await client.execute(
    "MATCH (u:User {name: $name}) RETURN u",
    {"name": user_input}
)
```

## Incident Response

### Detecting Security Issues

Monitor for:

- Repeated failed authentication attempts
- Unusual query patterns
- Access to sensitive data outside normal hours
- Large data exports
- Privilege escalation attempts

### Responding to Incidents

1. **Isolate**: Disconnect affected systems
2. **Investigate**: Review audit logs
3. **Contain**: Revoke compromised credentials
4. **Remediate**: Patch vulnerabilities
5. **Recover**: Restore from clean backups if needed
6. **Document**: Record incident details
7. **Learn**: Update security policies

## Related Topics

- [Authentication](/tags/authentication/) - User authentication methods
- [Encryption](/tags/encryption/) - Data encryption techniques
- [Row-Level Security](/tags/row-level-security/) - Fine-grained access control
- [Audit Logging](/tags/audit-logging/) - Activity tracking
- [Compliance](/tags/compliance/) - Regulatory requirements
- [TDE](/tags/tde/) - Transparent Data Encryption
- [FLE](/tags/fle/) - Field-Level Encryption

## Further Reading

- [Security Architecture](/docs/architecture/security-architecture/) - Detailed security design
- [Deployment Patterns](/docs/deployment/deployment-patterns/) - Production deployment and hardening
- [Backup and Restore](/guides/backup-restore/) - Secure backup practices
- [Security Overview](/docs/security/overview/) - Security features and best practices
