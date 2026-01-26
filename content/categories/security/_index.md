---
title: "Category: Security & Compliance"
description: "Enterprise security and compliance documentation covering authentication, encryption, Row-Level Security, audit logging, and regulatory compliance features."
keywords:
  - security
  - encryption
  - authentication
  - compliance
  - audit logging
  - Row-Level Security
  - GDPR
  - SOC 2
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/security/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

The **Security & Compliance** category encompasses comprehensive documentation for protecting your Geode graph database and meeting regulatory requirements. From transport encryption and authentication through data-at-rest protection and audit logging, these resources cover the full security stack required for enterprise deployments.

## Introduction

Enterprise databases handle sensitive data requiring multiple layers of protection. Geode provides defense-in-depth security with encryption at every layer, fine-grained access controls, and comprehensive audit logging. Transport security uses mandatory TLS 1.3 with no plaintext fallback. Data-at-rest encryption protects stored data with both Transparent Data Encryption (TDE) and Field-Level Encryption (FLE). Row-Level Security (RLS) policies enforce fine-grained access control at the data level. Audit logging captures all data access for compliance and forensics.

Security in Geode isn't an afterthought or optional feature—it's built into the architecture from the ground up. The QUIC transport protocol mandates TLS 1.3 encryption, eliminating the possibility of accidentally running unencrypted. Authentication uses Argon2id password hashing, the most secure algorithm available. KMS integration enables enterprise key management with automatic key rotation. These design choices reflect a security-first philosophy where secure defaults and defense-in-depth protect your data.

## What You'll Find

### Transport Security

**Mandatory TLS 1.3**
- All connections require TLS 1.3 encryption
- No plaintext fallback option
- QUIC protocol with integrated encryption
- Perfect forward secrecy for all connections
- Modern cipher suites only (no weak algorithms)
- Certificate-based server authentication
- Mutual TLS (mTLS) support for client authentication

**Connection Security**
- Connection migration with security preservation
- 0-RTT resumption with replay protection
- Certificate pinning for MITM prevention
- Hostname verification and validation
- SNI (Server Name Indication) support
- OCSP stapling for certificate validation

### Authentication & Authorization

**User Authentication**
- Argon2id password hashing (memory-hard, GPU-resistant)
- Configurable work factors for future-proofing
- Username/password authentication
- Certificate-based authentication (mTLS)
- Token-based authentication
- Session management with secure tokens
- Multi-factor authentication (MFA) support

**Authorization Model**
- Role-Based Access Control (RBAC)
- Graph-level permissions
- Label-level access control
- Property-level visibility
- Relationship-type permissions
- Function and procedure access control
- Administrative privilege separation

**Row-Level Security (RLS)**
- Fine-grained access control at data level
- Policy-based filtering using GQL expressions
- User and role-based policies
- Transparent query rewriting
- Performance-optimized policy evaluation
- Policy composition and inheritance
- Audit trail for policy violations

### Data-at-Rest Encryption

**Transparent Data Encryption (TDE)**
- Full database encryption with no schema changes
- AES-256-GCM authenticated encryption
- Key hierarchy: master key -> database key -> page keys
- KMS integration (AWS KMS, Azure Key Vault, HashiCorp Vault)
- Automatic key rotation with online re-encryption
- No performance impact on reads (hardware AES acceleration)
- Backup encryption included automatically

**Field-Level Encryption (FLE)**
- Selective encryption of sensitive fields
- Client-side or server-side encryption
- Deterministic encryption for equality searches
- Randomized encryption for maximum security
- Per-field encryption keys
- Key derivation from master secrets
- Queryable encryption patterns

**Key Management**
- KMS integration for enterprise key management
- Automatic key rotation schedules
- Key versioning and rollback
- Secure key derivation (HKDF-SHA256)
- Hardware Security Module (HSM) support
- Key lifecycle management
- Key revocation and emergency rotation

### Audit Logging

**Comprehensive Audit Trail**
- All data access logged (SELECT, INSERT, UPDATE, DELETE)
- Schema changes captured (CREATE, ALTER, DROP)
- Authentication events (login, logout, failed attempts)
- Authorization failures (permission denied)
- Configuration changes tracked
- Administrative operations logged
- Query execution history

**Audit Log Features**
- Immutable append-only log
- Tamper-evident with cryptographic hashing
- Structured log format (JSON)
- Real-time streaming to SIEM systems
- Configurable retention policies
- Compliant log format for regulations
- Performance impact <1% with async logging

**Compliance Reporting**
- Pre-built compliance reports (GDPR, SOC 2, HIPAA)
- User access reports
- Data modification reports
- Sensitive data access reports
- Anomaly detection and alerting
- Audit log search and analysis
- Export to compliance platforms

### Compliance Features

**Regulatory Compliance**
- GDPR (General Data Protection Regulation)
- HIPAA (Health Insurance Portability and Accountability Act)
- SOC 2 (System and Organization Controls)
- PCI DSS (Payment Card Industry Data Security Standard)
- CCPA (California Consumer Privacy Act)
- ISO 27001 information security management

**Data Privacy**
- Right to erasure (data deletion)
- Right to access (data export)
- Data minimization support
- Purpose limitation enforcement
- Consent management with RLS
- Data retention policies
- Anonymization and pseudonymization

## Use Cases with Code Examples

### Implementing Row-Level Security

```python
import geode_client

async def setup_rls_policies():
    """Set up RLS policies for multi-tenant application."""
    client = geode_client.open_database('geode://localhost:3141')
    async with client.connection() as conn:
        # Create policy: users can only see their own data
        await conn.execute("""
            CREATE POLICY user_isolation ON Person
            FOR SELECT
            USING (owner_id = current_user_id())
        """)

        # Create policy: managers can see their team's data
        await conn.execute("""
            CREATE POLICY manager_access ON Person
            FOR SELECT
            USING (
                owner_id = current_user_id()
                OR EXISTS {
                    MATCH (manager:User {id: current_user_id()})
                         -[:MANAGES]->(team:Team)<-[:MEMBER_OF]-(user:User)
                    WHERE user.id = owner_id
                }
            )
        """)

        # Create policy: admins see everything
        await conn.execute("""
            CREATE POLICY admin_access ON Person
            FOR ALL
            USING (current_user_role() = 'admin')
        """)

# Query data with RLS enforcement
async def get_customer_data(user_id: int):
    """Get customer data - RLS policies automatically enforced."""
    client = geode_client.open_database('geode://localhost:3141')
    async with client.connection() as conn:
        auth = geode_client.AuthClient(conn)
        await auth.login('app_user', 'secure_password')

        # RLS policies automatically filter results
        result, _ = await conn.query("""
            MATCH (c:Customer)
            RETURN c.name, c.email, c.phone
        """)

        # Only customers this user is authorized to see
        return [row for row in result.rows]
```

### Configuring Field-Level Encryption

```python
import base64
import hashlib
import hmac

def tokenize(value: str, key: bytes) -> str:
    """Deterministic tokenization for lookup (use KMS/HSM in production)."""
    return hmac.new(key, value.encode("utf-8"), hashlib.sha256).hexdigest()

async def store_sensitive_data():
    """Store data with application-layer tokenization."""
    token_key = get_master_key()
    client = geode_client.open_database('geode://localhost:3141')

    async with client.connection() as conn:
        tokenized_ssn = tokenize('123-45-6789', token_key)

        await conn.execute("""
            INSERT (:Customer {
                name: $name,
                email: $email,
                ssn_token: $ssn_token
            })
        """, {
            'name': 'John Doe',
            'email': 'john@example.com',
            'ssn_token': tokenized_ssn
        })

# Query tokenized data
async def find_customer_by_ssn(ssn: str):
    """Find customer by SSN using deterministic tokenization."""
    token_key = get_master_key()
    tokenized_ssn = tokenize(ssn, token_key)

    client = geode_client.open_database('geode://localhost:3141')
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (c:Customer {ssn_token: $ssn_token})
            RETURN c.name, c.email
        """, {'ssn_token': tokenized_ssn})

        row = result.rows[0] if result.rows else None
        return row if row else None
```

### Audit Logging and Compliance

```python
async def setup_audit_logging():
    """Configure audit logging for compliance."""
    client = geode_client.open_database('geode://localhost:3141')
    async with client.connection() as conn:
        # Enable audit logging
        await conn.execute("""
            ALTER SYSTEM SET audit_logging = 'all';
            ALTER SYSTEM SET audit_log_format = 'json';
            ALTER SYSTEM SET audit_retention_days = 90;
        """)

        # Configure SIEM integration
        await conn.execute("""
            ALTER SYSTEM SET audit_stream_to = 'syslog://siem.example.com:514';
            ALTER SYSTEM SET audit_stream_protocol = 'tls';
        """)

# Generate compliance report
async def generate_gdpr_access_report(user_id: int):
    """Generate GDPR data access report for user."""
    client = geode_client.open_database('geode://localhost:3141')
    async with client.connection() as conn:
        result, _ = await conn.query("""
            SELECT timestamp, user, query, affected_records
            FROM audit_log
            WHERE query LIKE '%User {id: $user_id}%'
            ORDER BY timestamp DESC
        """, {'user_id': user_id})

        accesses = []
        for row in result.rows:
            accesses.append({
                'timestamp': row['timestamp'],
                'accessed_by': row['user'],
                'query': row['query'],
                'records': row['affected_records']
            })

        return {
            'user_id': user_id,
            'report_date': datetime.now(),
            'total_accesses': len(accesses),
            'access_log': accesses
        }
```

### Authentication and Authorization

```python
import geode_client

async def authenticate_user(username: str, password: str):
    """Authenticate user with RBAC support."""
    try:
        client = geode_client.open_database('geode://localhost:3141')
        async with client.connection() as conn:
            auth = geode_client.AuthClient(conn)
            await auth.login(username, password)

            # Check user permissions
            result, _ = await conn.query("""
                MATCH (u:User {username: $username})
                RETURN u.roles AS roles, u.permissions AS permissions
            """, {'username': username})

            user_info = result.rows[0] if result.rows else None
            return {
                'authenticated': True,
                'roles': user_info['roles'],
                'permissions': user_info['permissions']
            }

    except geode_client.AuthError as e:
        # Failed authentication logged to audit log
        return {'authenticated': False, 'error': str(e)}

# Role-based access control
async def check_permission(user_id: int, resource: str, action: str):
    """Check if user has permission for action on resource."""
    client = geode_client.open_database('geode://localhost:3141')
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (u:User {id: $user_id})-[:HAS_ROLE]->(r:Role)
                 -[:HAS_PERMISSION]->(p:Permission)
            WHERE p.resource = $resource AND p.action = $action
            RETURN count(p) > 0 AS has_permission
        """, {
            'user_id': user_id,
            'resource': resource,
            'action': action
        })

        row = result.rows[0] if result.rows else None
        return row['has_permission']
```

## Best Practices

### Security Configuration

1. **Enable TDE**: Always encrypt data at rest in production
2. **Use Strong Passwords**: Enforce password policies (length, complexity)
3. **Rotate Keys**: Regular key rotation (90-180 days)
4. **Principle of Least Privilege**: Grant minimal required permissions
5. **Enable Audit Logging**: Log all access for compliance

### Access Control

1. **Implement RLS**: Use RLS for multi-tenant applications
2. **Separate Roles**: Create distinct roles for different access levels
3. **Review Permissions**: Regularly audit and review permissions
4. **Revoke Unused Access**: Remove permissions no longer needed
5. **Test Policies**: Validate RLS policies with test queries

### Encryption Management

1. **KMS Integration**: Use KMS for key management in production
2. **Separate Keys**: Use different keys for different data classifications
3. **Backup Keys**: Securely backup encryption keys
4. **Test Recovery**: Verify encrypted backup restoration
5. **Monitor Key Usage**: Track key usage and rotation

### Compliance

1. **Document Policies**: Document all security policies and procedures
2. **Regular Audits**: Conduct security audits quarterly
3. **Compliance Reviews**: Review compliance requirements annually
4. **Incident Response**: Maintain incident response procedures
5. **Training**: Train staff on security best practices

## Related Categories

- [Operations](/categories/operations/) - Production deployment and management
- [Configuration](/categories/configuration/) - Security configuration
- [Deployment](/categories/deployment-and-devops/) - Secure deployment practices
- [Best Practices](/categories/best-practices/) - Security guidelines

## Related Tags

- [TDE](/tags/tde/) - Transparent Data Encryption
- [FLE](/tags/fle/) - Field-Level Encryption
- [Row-Level Security](/tags/row-level-security/) - Fine-grained access control
- [Audit Logging](/tags/audit-logging/) - Compliance logging
- [Authentication](/tags/authentication/) - User authentication
- [Encryption](/tags/encryption/) - Data encryption
- [Compliance](/tags/compliance/) - Regulatory compliance

## Further Reading

- [Security Overview](/docs/security-overview/) - Complete security architecture
- [RLS Configuration Guide](/docs/rls-configuration/) - Row-Level Security setup
- [Encryption Setup](/docs/encryption-setup/) - TDE and FLE configuration
- [Audit Logging Guide](/docs/audit-logging/) - Compliance logging
- [Compliance Documentation](/docs/compliance/) - Regulatory compliance guides
