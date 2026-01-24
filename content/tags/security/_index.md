---
title: "Security Features and Architecture"
description: "Comprehensive security features in Geode including authentication, encryption, row-level security, RBAC, and enterprise compliance standards."
keywords:
  - security
  - authentication
  - encryption
  - RBAC
  - RLS
  - compliance
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/security/"
    noindex: false
---

# Security Features and Architecture in Geode

Security is foundational to Geode's design, not an afterthought. Geode implements defense-in-depth security with multiple layers of protection, from mandatory network encryption to fine-grained data access controls. This zero-trust architecture makes Geode suitable for regulated industries including healthcare, finance, and government.

## Introduction to Database Security

Modern database security requires protection across multiple dimensions:

**Network Security**: Encrypt data in transit, prevent eavesdropping
**Authentication**: Verify user identity before granting access
**Authorization**: Control what authenticated users can access
**Data Encryption**: Protect data at rest from unauthorized access
**Audit Logging**: Track access for compliance and forensics
**Data Integrity**: Prevent unauthorized modifications

Traditional databases often make security optional or add it as an afterthought. Geode makes security mandatory and deeply integrated.

## Geode's Security Architecture

### Mandatory TLS 1.3 Encryption

Geode **requires** TLS 1.3 for all network connections with **no plaintext fallback**:

**Why TLS 1.3**:
- **Strong cipher suites only**: No legacy weak ciphers (AES-GCM, ChaCha20)
- **Forward secrecy**: Past sessions remain secure if keys are compromised
- **Faster handshake**: 0-RTT resumption for returning clients
- **Simplified configuration**: Removes insecure options

**Server configuration**:
```bash
# Generate self-signed certificate (development)
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout server-key.pem -out server-cert.pem -days 365 \
  -subj "/CN=localhost"

# Start server with TLS
geode serve --listen 0.0.0.0:3141 \
  --tls-cert=server-cert.pem \
  --tls-key=server-key.pem
```

**Client connection (Python)**:
```python
from geode_client import GeodeClient

# Production: Verify server certificate
async with GeodeClient(
    host="geodedb.example.com",
    port=3141,
    tls=True,
    tls_verify=True,  # Verify certificate chain
    tls_ca_file="/path/to/ca-bundle.crt"
) as client:
    result = await client.execute("MATCH (n:User) RETURN count(n)")

# Development: Self-signed certificate
async with GeodeClient(
    host="localhost",
    port=3141,
    tls=True,
    tls_verify=False  # Skip verification (dev only!)
) as client:
    result = await client.execute("MATCH (n:User) RETURN count(n)")
```

**Certificate management best practices**:
- Use Let's Encrypt for public-facing servers (free, automated)
- Use internal CA for private networks
- Rotate certificates before expiration (automate with certbot)
- Store private keys securely (never in version control)

### Authentication

Geode supports multiple authentication mechanisms:

**Built-in Username/Password**:
```gql
-- Create user with password
CREATE USER alice PASSWORD 'secure_password_here' REQUIRE SECURE TRANSPORT;

-- User connects with credentials
-- (Credentials sent over TLS-encrypted connection)
```

**Python client authentication**:
```python
from geode_client import GeodeClient

async with GeodeClient(
    host="localhost",
    port=3141,
    username="alice",
    password="secure_password_here",
    tls=True
) as client:
    result = await client.execute("MATCH (n:Node) RETURN n")
```

**Password hashing** (server-side):
- Uses **Argon2id** (winner of Password Hashing Competition)
- Configurable time cost, memory cost, parallelism
- Resistant to GPU/ASIC attacks
- Automatically salted

**Certificate-Based Authentication** (mTLS):
```bash
# Server requires client certificates
geode serve --listen 0.0.0.0:3141 \
  --tls-cert=server-cert.pem \
  --tls-key=server-key.pem \
  --tls-client-auth=required \
  --tls-ca-file=client-ca.pem
```

```python
# Client provides certificate
async with GeodeClient(
    host="localhost",
    port=3141,
    tls=True,
    tls_client_cert="/path/to/client-cert.pem",
    tls_client_key="/path/to/client-key.pem"
) as client:
    result = await client.execute("MATCH (n:Node) RETURN n")
```

**LDAP/Active Directory Integration** (Enterprise):
```bash
# Configure LDAP authentication
geode serve --listen 0.0.0.0:3141 \
  --auth-method=ldap \
  --ldap-url="ldaps://ldap.example.com:636" \
  --ldap-bind-dn="cn=geode,ou=services,dc=example,dc=com" \
  --ldap-bind-password="service_password" \
  --ldap-user-dn="ou=users,dc=example,dc=com"
```

### Authorization and Access Control

Geode implements fine-grained access control at multiple levels:

**Database-Level Permissions**:
```gql
-- Grant database access
GRANT ACCESS ON DATABASE sales TO alice;

-- Revoke access
REVOKE ACCESS ON DATABASE sales FROM alice;
```

**Label-Level Permissions**:
```gql
-- Grant read access to specific node labels
GRANT SELECT ON LABEL User TO alice;
GRANT SELECT ON LABEL Product TO alice;

-- Grant write access
GRANT INSERT, UPDATE, DELETE ON LABEL Order TO alice;

-- Read-only user
GRANT SELECT ON ALL LABELS TO readonly_user;
```

**Property-Level Permissions**:
```gql
-- Grant access to specific properties only
GRANT SELECT ON User(id, name, email) TO support_team;
-- support_team cannot see User.ssn or User.salary

-- Grant update on specific properties
GRANT UPDATE ON User(email, phone) TO profile_editor;
-- profile_editor can modify contact info, not other fields
```

**Row-Level Security (RLS)**:

RLS policies filter query results based on user context:

```gql
-- Create RLS policy: Users can only see their own data
CREATE POLICY user_isolation ON User
FOR SELECT
USING (id = current_user_id());

-- Create RLS policy: Managers can see their team's data
CREATE POLICY team_visibility ON Employee
FOR SELECT
USING (
    EXISTS {
        MATCH (e:Employee)-[:REPORTS_TO]->(manager:Employee)
        WHERE manager.user_id = current_user_id()
    }
);

-- Enable RLS on table
ALTER LABEL User ENABLE ROW LEVEL SECURITY;
ALTER LABEL Employee ENABLE ROW LEVEL SECURITY;
```

**Python usage with RLS**:
```python
from geode_client import GeodeClient

# User alice logs in
async with GeodeClient(
    host="localhost",
    port=3141,
    username="alice",
    password="alice_password"
) as client:
    # Query automatically filtered by RLS policy
    result = await client.execute("""
        MATCH (e:Employee)
        RETURN e.name, e.salary
    """)
    # Only returns employees alice manages (RLS policy applied)

# Different user sees different results
async with GeodeClient(
    host="localhost",
    port=3141,
    username="bob",
    password="bob_password"
) as client:
    result = await client.execute("""
        MATCH (e:Employee)
        RETURN e.name, e.salary
    """)
    # Only returns employees bob manages
```

**RLS Policy Examples**:

Multi-tenant isolation:
```gql
CREATE POLICY tenant_isolation ON ALL LABELS
FOR ALL
USING (tenant_id = current_tenant_id());
```

Time-based access:
```gql
CREATE POLICY business_hours ON SensitiveData
FOR SELECT
USING (extract_hour(current_timestamp()) BETWEEN 9 AND 17);
```

Role-based filtering:
```gql
CREATE POLICY role_based_access ON Document
FOR SELECT
USING (
    security_level <= (
        MATCH (u:User {id: current_user_id()})
        RETURN u.clearance_level
    )
);
```

### Data Encryption at Rest

**Transparent Data Encryption (TDE)**:

Geode encrypts database files automatically using AES-256-GCM:

```bash
# Generate encryption key
openssl rand -hex 32 > database-encryption-key.txt

# Start server with TDE
geode serve --listen 0.0.0.0:3141 \
  --data-dir=/var/lib/geode \
  --encryption-enabled=true \
  --encryption-key-file=database-encryption-key.txt
```

**Key characteristics**:
- AES-256-GCM (authenticated encryption)
- Per-page encryption (16KB blocks)
- Low overhead (~5% performance impact)
- Protects against physical theft, backup leaks

**Key Management Service (KMS) Integration**:
```bash
# Use AWS KMS for key management
geode serve --listen 0.0.0.0:3141 \
  --encryption-enabled=true \
  --encryption-kms=aws \
  --encryption-kms-key-id=arn:aws:kms:us-east-1:123456789012:key/abc-def \
  --encryption-kms-region=us-east-1
```

**Field-Level Encryption (FLE)**:

Encrypt specific sensitive fields in application:

```python
from cryptography.fernet import Fernet
from geode_client import GeodeClient

# Application-managed encryption key
encryption_key = Fernet.generate_key()
cipher = Fernet(encryption_key)

async def create_user_with_encrypted_ssn(name, ssn):
    # Encrypt SSN before storing
    encrypted_ssn = cipher.encrypt(ssn.encode()).decode()

    async with GeodeClient("localhost", 3141) as client:
        await client.execute("""
            CREATE (u:User {
                name: $name,
                ssn_encrypted: $ssn_encrypted
            })
        """, {"name": name, "ssn_encrypted": encrypted_ssn})

async def get_user_ssn(user_id):
    async with GeodeClient("localhost", 3141) as client:
        result = await client.execute("""
            MATCH (u:User {id: $id})
            RETURN u.ssn_encrypted
        """, {"id": user_id})

        encrypted_ssn = result.bindings[0]['ssn_encrypted']
        # Decrypt after retrieving
        ssn = cipher.decrypt(encrypted_ssn.encode()).decode()
        return ssn
```

**FLE vs TDE**:
- **TDE**: Protects stored files, transparent to application, database can query
- **FLE**: Protects specific fields, application-managed, database sees ciphertext

### Audit Logging

Comprehensive logging for compliance and forensics:

**Enable audit logging**:
```bash
geode serve --listen 0.0.0.0:3141 \
  --audit-log-enabled=true \
  --audit-log-file=/var/log/geode/audit.jsonl \
  --audit-log-level=verbose
```

**Audit log format** (JSON Lines):
```json
{
  "timestamp": "2026-01-24T14:32:45.123Z",
  "event_type": "authentication",
  "username": "alice",
  "source_ip": "192.168.1.100",
  "status": "success"
}
{
  "timestamp": "2026-01-24T14:32:46.456Z",
  "event_type": "query",
  "username": "alice",
  "database": "production",
  "query": "MATCH (u:User {id: $id}) RETURN u",
  "params": {"id": 123},
  "rows_returned": 1,
  "duration_ms": 2.4
}
{
  "timestamp": "2026-01-24T14:32:50.789Z",
  "event_type": "authorization_failure",
  "username": "bob",
  "database": "production",
  "attempted_action": "DELETE",
  "resource": "User",
  "reason": "insufficient_privileges"
}
```

**Audit log analysis**:
```python
import json

def analyze_audit_log(log_file):
    failed_logins = {}

    with open(log_file) as f:
        for line in f:
            event = json.loads(line)

            if event['event_type'] == 'authentication' and event['status'] == 'failure':
                username = event['username']
                failed_logins[username] = failed_logins.get(username, 0) + 1

    # Alert on brute force attempts
    for username, count in failed_logins.items():
        if count > 10:
            print(f"ALERT: {username} has {count} failed login attempts")

analyze_audit_log("/var/log/geode/audit.jsonl")
```

## Security Best Practices

### Principle of Least Privilege

Grant minimum necessary permissions:

```gql
-- BAD: Overly permissive
GRANT ALL PRIVILEGES ON ALL LABELS TO app_user;

-- GOOD: Specific permissions
GRANT SELECT ON User(id, name, email) TO app_user;
GRANT INSERT, UPDATE ON Order TO app_user;
GRANT SELECT ON Product TO app_user;
```

### Secure Credential Management

**Never hardcode credentials**:
```python
# BAD: Hardcoded password
client = GeodeClient("localhost", 3141, username="app", password="hardcoded_pass")

# GOOD: Environment variables
import os
client = GeodeClient(
    "localhost",
    3141,
    username=os.getenv("GEODE_USERNAME"),
    password=os.getenv("GEODE_PASSWORD")
)

# BETTER: Secrets management service
from boto3.session import Session
secrets_client = Session().client('secretsmanager', region_name='us-east-1')
secret = secrets_client.get_secret_value(SecretId='geode/prod/credentials')
credentials = json.loads(secret['SecretString'])

client = GeodeClient(
    "localhost",
    3141,
    username=credentials['username'],
    password=credentials['password']
)
```

### Regular Security Audits

```python
# Automated security checks
async def security_audit():
    async with GeodeClient("localhost", 3141, username="admin") as client:
        # Check for users without passwords
        result = await client.execute("""
            SHOW USERS WHERE password_set = false
        """)
        if result.bindings:
            print(f"WARNING: {len(result.bindings)} users without passwords")

        # Check for overly permissive grants
        result = await client.execute("""
            SHOW GRANTS WHERE privilege = 'ALL' AND grantee NOT IN ('admin', 'root')
        """)
        if result.bindings:
            print(f"WARNING: {len(result.bindings)} users with ALL privileges")

        # Check TLS enforcement
        result = await client.execute("SHOW VARIABLES LIKE 'require_secure_transport'")
        if result.bindings[0]['value'] != 'ON':
            print("WARNING: TLS not enforced")

await security_audit()
```

### Defense in Depth

Layer multiple security controls:

1. **Network**: Firewall rules, VPN, TLS
2. **Authentication**: Strong passwords, MFA, certificate-based
3. **Authorization**: RBAC, RLS policies
4. **Encryption**: TDE for data at rest, TLS for data in transit
5. **Auditing**: Comprehensive logging, monitoring, alerts
6. **Application**: Input validation, parameterized queries, rate limiting

## Compliance and Standards

Geode's security features support compliance with:

**GDPR** (General Data Protection Regulation):
- RLS for data access control
- Audit logging for data access tracking
- Encryption at rest and in transit
- Right to be forgotten (data deletion)

**HIPAA** (Health Insurance Portability and Accountability Act):
- Encryption of PHI (Protected Health Information)
- Access controls and authentication
- Audit trails for PHI access
- Data integrity verification

**PCI DSS** (Payment Card Industry Data Security Standard):
- Strong access control measures
- Network security (TLS 1.3)
- Encryption of cardholder data
- Logging and monitoring

**SOC 2** (Service Organization Control 2):
- Access controls and authentication
- Encryption and secure data handling
- Audit logging and monitoring
- Incident response procedures

## Troubleshooting Security Issues

### Issue: TLS Handshake Failures

**Symptoms**: Connection refused or TLS errors

**Diagnosis**:
```bash
# Test TLS connection
openssl s_client -connect localhost:3141 -tls1_3

# Check certificate validity
openssl x509 -in server-cert.pem -text -noout
```

**Solutions**:
- Verify certificate hasn't expired
- Ensure client trusts server certificate
- Check TLS cipher suite compatibility

### Issue: Authentication Failures

**Symptoms**: "Access denied" errors

**Diagnosis**: Check audit logs:
```bash
grep "authentication.*failure" /var/log/geode/audit.jsonl
```

**Solutions**:
- Verify username/password are correct
- Check account isn't locked
- Ensure user has database access

### Issue: Permission Denied Errors

**Symptoms**: "Insufficient privileges" errors

**Diagnosis**:
```gql
SHOW GRANTS FOR alice;
```

**Solutions**:
- Grant necessary permissions
- Check RLS policies aren't overly restrictive
- Verify user is accessing correct database

## Related Topics

- **[Authentication](/tags/authentication/)**: Authentication mechanisms in depth
- **[Encryption](/tags/encryption/)**: Encryption implementation details
- **[Row-Level Security](/tags/row-level-security/)**: RLS policies and patterns
- **[TDE](/tags/tde/)**: Transparent Data Encryption
- **[FLE](/tags/fle/)**: Field-Level Encryption
- **[Compliance](/tags/compliance/)**: Regulatory compliance
- **[Audit Logging](/tags/audit-logging/)**: Audit logging configuration

## Further Reading

- **Security Overview**: `/docs/security/overview/`
- **Authentication Guide**: `/docs/security/authentication/`
- **Authorization and RBAC**: `/docs/security/authorization/`
- **Encryption Best Practices**: `/docs/security/encryption/`
- **Compliance Guide**: `/docs/security/compliance/`
- **Security Hardening Checklist**: `/docs/security/hardening/`
