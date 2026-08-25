---
title: "Tag: Authentication & Authorization"
description: "Explore Geode documentation tagged with authentication. Learn about authentication features, best practices, and implementation details."
keywords:
  - authentication
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/authentication/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Authentication and authorization are critical components of Geode's enterprise security architecture. As a production-ready graph database handling sensitive data, Geode provides comprehensive security controls to ensure only authorized users and applications can access your data.

Geode implements multiple authentication mechanisms, fine-grained authorization policies, and integration with enterprise identity providers. Combined with Row-Level Security (RLS), encryption, and audit logging, Geode delivers the security guarantees required for regulated industries and mission-critical applications.

This guide explores Geode's authentication and authorization capabilities, from basic username/password authentication through advanced integration patterns with LDAP, OAuth2, and SAML.

## Authentication Mechanisms

Geode supports multiple authentication methods to accommodate different deployment scenarios:

**Username/Password Authentication**: The default authentication mechanism uses password hashing with bcrypt or Argon2. Credentials are stored securely in Geode's system catalogs:

```gql
-- Create a user with password
CREATE USER analyst PASSWORD 'secure_password_123';

-- Connect with credentials
-- (Implementation depends on client library)
```

**TLS Client Certificates**: For machine-to-machine authentication, Geode supports mutual TLS (mTLS) where clients present X.509 certificates:

```bash
# Start server requiring client certificates
geode serve --tls-cert server.crt --tls-key server.key \
  --tls-client-ca ca.crt --tls-client-auth required

# Connect with client certificate
geode shell --tls-cert client.crt --tls-key client.key \
  --tls-ca ca.crt
```

**API Tokens**: Long-lived tokens for service accounts and automation:

```gql
-- Generate an API token
CREATE TOKEN service_token FOR USER api_service
  EXPIRES '2025-12-31'
  SCOPES 'read:nodes', 'write:edges';

-- Revoke a token
REVOKE TOKEN service_token;
```

**LDAP Integration**: Authenticate users against existing LDAP directories:

```toml
# geode.toml configuration
[auth.ldap]
url = "ldaps://ldap.example.com:636"
bind_dn = "cn=geode,ou=services,dc=example,dc=com"
bind_password_file = "/secure/ldap_password"
user_search_base = "ou=users,dc=example,dc=com"
user_search_filter = "(uid=%s)"
```

**OAuth2/OIDC**: Integrate with identity providers like Auth0, Okta, or Azure AD:

```toml
[auth.oidc]
issuer = "https://auth.example.com"
client_id = "geode-production"
client_secret_file = "/secure/oidc_secret"
redirect_url = "https://geode.example.com/auth/callback"
```

**SAML 2.0**: Enterprise single sign-on for web-based access:

```toml
[auth.saml]
idp_metadata_url = "https://idp.example.com/metadata"
sp_entity_id = "geode-production"
assertion_consumer_service_url = "https://geode.example.com/saml/acs"
```

## Authorization and Access Control

Once authenticated, Geode's authorization system controls what users can do:

**Role-Based Access Control (RBAC)**: Users are assigned roles that define their permissions:

```gql
-- Create roles
CREATE ROLE readonly;
CREATE ROLE analyst;
CREATE ROLE admin;

-- Grant permissions to roles
GRANT SELECT ON GRAPH social_network TO readonly;
GRANT SELECT, INSERT ON GRAPH social_network TO analyst;
GRANT ALL ON GRAPH social_network TO admin;

-- Assign roles to users
GRANT ROLE readonly TO USER guest_user;
GRANT ROLE analyst TO USER john_doe;
```

**Graph-Level Permissions**: Control access at the graph level:

```gql
-- Grant graph-level privileges
GRANT CREATE GRAPH TO ROLE developer;
GRANT DROP GRAPH TO ROLE admin;

-- Revoke privileges
REVOKE INSERT ON GRAPH sensitive_data FROM ROLE analyst;
```

**Label-Level Permissions**: Restrict access to specific node or relationship types:

```gql
-- Restrict access to sensitive labels
GRANT SELECT ON :User TO ROLE analyst;
GRANT SELECT ON :Transaction TO ROLE auditor;
DENY SELECT ON :CreditCard TO ROLE analyst;
```

**Property-Level Security**: Hide sensitive properties from unauthorized users:

```gql
-- Allow reading most properties but hide sensitive ones
GRANT SELECT(name, email, created_at) ON :User TO ROLE support;
DENY SELECT(password_hash, ssn, salary) ON :User TO ROLE support;
```

## Row-Level Security (RLS)

RLS enables fine-grained access control where users can only see data matching specific criteria:

```gql
-- Create RLS policy for multi-tenant access
CREATE POLICY tenant_isolation ON :User
  FOR ALL
  TO analyst
  USING (tenant_id = current_user_property('tenant_id'));

-- Create RLS policy for regional data access
CREATE POLICY regional_access ON :Customer
  FOR SELECT
  TO regional_manager
  USING (region IN current_user_property('authorized_regions'));

-- Department-based access
CREATE POLICY department_data ON :Employee
  FOR ALL
  TO manager
  USING (department = current_user_property('department'));
```

**RLS Use Cases**:

- **Multi-tenancy**: Isolate tenant data in shared databases
- **Hierarchical access**: Managers see their team's data only
- **Regional compliance**: Restrict data access by geography
- **Privacy controls**: Users can only access their own data

## User and Role Management

**Creating and Managing Users**:

```gql
-- Create user with role
CREATE USER alice PASSWORD 'secure_password' ROLE analyst;

-- Modify user properties
ALTER USER alice SET email = 'alice@example.com';

-- Change password
ALTER USER alice PASSWORD 'new_secure_password';

-- Disable user account
ALTER USER alice DISABLE;

-- Delete user
DROP USER alice;
```

**Role Hierarchy**:

```gql
-- Create role hierarchy
CREATE ROLE employee;
CREATE ROLE manager INHERITS employee;
CREATE ROLE director INHERITS manager;

-- Grant privileges at each level
GRANT SELECT ON :Employee TO employee;
GRANT SELECT, UPDATE ON :Employee TO manager;
GRANT ALL ON :Employee TO director;
```

## Authentication Best Practices

**Use Strong Password Policies**: Enforce minimum password requirements:

```toml
[auth.password_policy]
min_length = 12
require_uppercase = true
require_lowercase = true
require_numbers = true
require_special_chars = true
max_age_days = 90
prevent_reuse = 5
```

**Implement Multi-Factor Authentication (MFA)**: Add second factor for critical accounts:

```gql
-- Enable TOTP for user
ALTER USER admin ENABLE MFA TOTP;

-- Require MFA for privileged roles
ALTER ROLE admin REQUIRE MFA;
```

**Rotate Credentials Regularly**: Set expiration on passwords and tokens:

```gql
-- Set password expiration
ALTER USER analyst PASSWORD_EXPIRES '90 days';

-- Create short-lived tokens
CREATE TOKEN temp_access FOR USER consultant
  EXPIRES '24 hours';
```

**Implement Least Privilege**: Grant minimal permissions necessary:

```gql
-- Instead of granting all permissions
-- GRANT ALL ON GRAPH * TO analyst; -- Too broad

-- Grant specific permissions needed
GRANT SELECT ON GRAPH analytics TO analyst;
GRANT INSERT ON :Event TO analyst;
```

**Audit Authentication Events**: Monitor authentication attempts:

```gql
-- View authentication logs
SELECT * FROM system.auth_log
WHERE event_type IN ('login_success', 'login_failure')
  AND timestamp > current_timestamp() - INTERVAL '24 hours';

-- Alert on suspicious activity
CREATE ALERT failed_login_attempts
  WHEN (SELECT count(*) FROM system.auth_log
        WHERE event_type = 'login_failure'
          AND timestamp > current_timestamp() - INTERVAL '5 minutes'
          AND username = $username
       ) > 5
  ACTION notify_security_team;
```

## Secure Connection Setup

**TLS Configuration**: Always use TLS in production:

```toml
[server.tls]
enabled = true
cert_file = "/etc/geode/tls/server.crt"
key_file = "/etc/geode/tls/server.key"
ca_file = "/etc/geode/tls/ca.crt"
min_version = "1.3"
cipher_suites = ["TLS_AES_256_GCM_SHA384", "TLS_CHACHA20_POLY1305_SHA256"]
```

**QUIC Security**: Geode uses QUIC with mandatory TLS 1.3:

```bash
# Server automatically uses QUIC+TLS
geode serve --tls-cert cert.pem --tls-key key.pem

# Client verifies server certificate
geode shell --tls-ca ca.pem
```

## Integration Patterns

**Microservices Authentication**: Use service accounts with limited scopes:

```gql
CREATE USER recommendation_service;
GRANT SELECT ON :User, :Product, :Purchase TO recommendation_service;
CREATE TOKEN rec_service_token FOR USER recommendation_service;
```

**Web Application Integration**: Implement session management:

```python
from geode import connect
from flask import session

@app.route('/api/users')
@require_authentication
def get_users():
    # Use session credentials
    conn = connect(
        host='geode.example.com',
        username=session['username'],
        token=session['geode_token']
    )
    return conn.execute("MATCH (u:User) RETURN u LIMIT 100")
```

**Data Pipeline Authentication**: Use long-lived tokens for batch jobs:

```python
import os
from geode import connect

# Use token from environment
conn = connect(
    host='geode.example.com',
    token=os.environ['GEODE_TOKEN']
)

# Process data with read-only token
for batch in data_batches:
    conn.execute(insert_query, batch)
```

## Troubleshooting Authentication Issues

**Login Failures**: Check authentication logs:

```gql
SELECT timestamp, username, client_ip, failure_reason
FROM system.auth_log
WHERE event_type = 'login_failure'
ORDER BY timestamp DESC
LIMIT 50;
```

**Permission Denied Errors**: Verify user privileges:

```gql
-- Check user's effective permissions
SHOW GRANTS FOR USER alice;

-- Check role hierarchy
SHOW ROLE HIERARCHY FOR USER alice;
```

**Token Expiration**: Monitor token validity:

```gql
-- List active tokens
SELECT token_id, username, expires_at
FROM system.tokens
WHERE expires_at > current_timestamp()
ORDER BY expires_at;
```

**TLS Certificate Issues**: Validate certificate chain:

```bash
# Verify server certificate
openssl s_client -connect geode.example.com:3141 \
  -CAfile ca.crt

# Check certificate expiration
openssl x509 -in server.crt -noout -dates
```

## Security Compliance

Geode's authentication system helps meet compliance requirements:

- **SOC 2**: User access controls, audit logging
- **HIPAA**: Fine-grained access, encryption, audit trails
- **GDPR**: Data access restrictions, user consent management
- **PCI DSS**: Strong authentication, privileged access management

## Related Topics

- [Row-Level Security (RLS)](/tags/row-level-security/)
- [Encryption and Data Protection](/tags/encryption/)
- [Audit Logging and Compliance](/tags/audit-logging/)
- [Security Best Practices](/tags/security/)
- [User and Session Management](/tags/sessions/)
- [TLS and Network Security](/tags/networking/)

## Further Reading

- Enterprise Security Architecture Guide
- Authentication Integration Patterns
- Compliance and Regulatory Requirements
- Security Hardening Checklist
- Incident Response Playbook

## Advanced Authentication Patterns

### JWT Token-Based Authentication

Integrate Geode with JSON Web Tokens for stateless authentication:

```python
import jwt
from geode_client import Client

# Generate JWT for user
def generate_token(user_id, roles):
    payload = {
        'user_id': user_id,
        'roles': roles,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

# Connect with JWT
token = generate_token('user123', ['analyst'])
client = Client('localhost:3141', token=token)
```

Configure Geode to validate JWTs:

```yaml
# geode.yaml
auth:
  jwt:
    enabled: true
    secret_key_file: /secure/jwt_secret
    algorithm: HS256
    issuer: myapp.example.com
    audience: geode-api
    token_lifetime_seconds: 86400
```

### Service Account Authentication

Create service accounts for automated systems:

```gql
-- Create service account
CREATE USER etl_service TYPE service_account;

-- Grant minimal required permissions
GRANT SELECT ON :RawData TO etl_service;
GRANT INSERT ON :ProcessedData TO etl_service;

-- Generate long-lived API key
CREATE API_KEY FOR etl_service
  DESCRIPTION 'ETL pipeline data ingestion'
  EXPIRES '2027-01-01';
```

Use service accounts in applications:

```python
# etl_pipeline.py
import os
from geode_client import Client

# Load API key from environment
API_KEY = os.environ['GEODE_API_KEY']

client = Client(
    'geode.prod.example.com:3141',
    api_key=API_KEY
)

# Service account has limited permissions
# Can only read RawData and write ProcessedData
```

### Multi-Factor Authentication Setup

Enable MFA for administrative accounts:

```gql
-- Enable TOTP MFA for admin user
ALTER USER admin ENABLE MFA USING TOTP
SECRET generate_qr_code();

-- Require MFA for all admins
ALTER ROLE admin REQUIRE MFA;

-- Verify MFA code during login
AUTHENTICATE USER admin
PASSWORD 'secure_password'
MFA_CODE '123456';
```

Implement MFA in client applications:

```python
async def login_with_mfa(username, password, mfa_code):
    try:
        client = Client(
            'localhost:3141',
            username=username,
            password=password,
            mfa_code=mfa_code
        )
        return client
    except MFARequired:
        # Prompt user for MFA code
        mfa_code = input("Enter MFA code: ")
        return await login_with_mfa(username, password, mfa_code)
```

### SSO Integration with SAML

Configure SAML 2.0 for enterprise single sign-on:

```xml
<!-- geode-saml-config.xml -->
<EntityDescriptor entityID="https://geode.example.com/saml/metadata"
                  xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>MIIDXTCCAkWgAwIBAgIJ...</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </KeyDescriptor>

    <SingleLogoutService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="https://geode.example.com/saml/slo"/>

    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://geode.example.com/saml/acs"
      index="1"/>
  </SPSSODescriptor>
</EntityDescriptor>
```

### OAuth 2.0 Authorization Code Flow

Integrate with OAuth providers:

```yaml
# geode.yaml
auth:
  oauth2:
    enabled: true
    provider: okta
    client_id: ${OAUTH_CLIENT_ID}
    client_secret_file: /secure/oauth_secret
    authorization_endpoint: https://dev-123.okta.com/oauth2/v1/authorize
    token_endpoint: https://dev-123.okta.com/oauth2/v1/token
    userinfo_endpoint: https://dev-123.okta.com/oauth2/v1/userinfo
    scopes:
      - openid
      - profile
      - email
    redirect_url: https://geode.example.com/oauth/callback
```

Implement OAuth flow in web application:

```python
from flask import Flask, redirect, request, session
from geode_client import Client
import requests

app = Flask(__name__)

@app.route('/login')
def login():
    # Redirect to OAuth provider
    auth_url = (
        f"{OAUTH_AUTH_ENDPOINT}?"
        f"client_id={CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URL}&"
        f"response_type=code&"
        f"scope=openid profile email"
    )
    return redirect(auth_url)

@app.route('/oauth/callback')
def oauth_callback():
    code = request.args.get('code')

    # Exchange code for token
    token_response = requests.post(OAUTH_TOKEN_ENDPOINT, data={
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': REDIRECT_URL,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET
    })

    access_token = token_response.json()['access_token']

    # Create Geode client with OAuth token
    session['geode_client'] = Client(
        'localhost:3141',
        oauth_token=access_token
    )

    return redirect('/dashboard')
```

### Dynamic Permission Management

Implement runtime permission checks:

```gql
-- Check user's current permissions
SHOW PERMISSIONS FOR analyst;
SHOW GRANTS FOR analyst;

-- Or through the auth procedure surface
CALL geode.auth.user_permissions('analyst');

-- Temporarily elevate privileges
BEGIN TRANSACTION;
SET SESSION AUTHORIZATION admin;

-- Perform privileged operation
CREATE GRAPH sensitive_data;

-- Restore normal privileges
RESET SESSION AUTHORIZATION;
COMMIT;
```

### Audit Logging for Compliance

Track all authentication events:

```gql
-- View recent authentication attempts
SELECT
  timestamp,
  username,
  client_ip,
  user_agent,
  auth_method,
  success,
  failure_reason
FROM system.auth_audit
WHERE timestamp > current_timestamp() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Alert on suspicious patterns
CREATE ALERT brute_force_detection
WHEN (
  SELECT COUNT(*) as failed_attempts
  FROM system.auth_audit
  WHERE success = false
    AND username = $username
    AND timestamp > current_timestamp() - INTERVAL '5 minutes'
) > 5
ACTION notify_security_team($username, $client_ip);
```

Export audit logs for SIEM integration:

```python
# export_audit_logs.py
import asyncio
from geode_client import Client
import json

async def export_audit_logs_to_splunk():
    client = Client('localhost:3141', token=ADMIN_TOKEN)
    async with client.connection() as client:
        # Fetch recent audit events
        result, _ = await client.query("""
            SELECT * FROM system.auth_audit
            WHERE timestamp > current_timestamp() - INTERVAL '1 hour'
        """)

        # Send to Splunk HTTP Event Collector
        for event in result.rows:
            payload = {
                'time': event['timestamp'].isoformat(),
                'source': 'geode-auth',
                'sourcetype': 'geode:auth:audit',
                'event': {
                    'username': event['username'],
                    'success': event['success'],
                    'client_ip': event['client_ip'],
                    'auth_method': event['auth_method']
                }
            }

            requests.post(
                SPLUNK_HEC_URL,
                headers={'Authorization': f'Splunk {SPLUNK_TOKEN}'},
                json=payload
            )

asyncio.run(export_audit_logs_to_splunk())
```

### Certificate-Based Authentication

Use X.509 certificates for strong authentication:

```bash
# Generate client certificate
openssl req -new -newkey rsa:4096 \
  -days 365 -nodes -x509 \
  -subj "/CN=analyst/O=Example Corp" \
  -keyout client-key.pem \
  -out client-cert.pem

# Configure Geode to require client certificates
geode serve \
  --tls-cert server.crt \
  --tls-key server.key \
  --tls-client-ca ca.crt \
  --tls-client-auth required
```

Map certificates to users:

```gql
-- Map certificate subject to user account
CREATE CERTIFICATE_MAPPING
FOR USER analyst
WITH SUBJECT '/CN=analyst/O=Example Corp';
```

Connect with certificate:

```python
client = Client(
    'geode.example.com:3141',
    tls_cert='client-cert.pem',
    tls_key='client-key.pem',
    tls_ca='ca.crt'
)
```

### Password Policy Enforcement

Configure strong password requirements:

```yaml
# geode.yaml
auth:
  password_policy:
    min_length: 14
    require_uppercase: true
    require_lowercase: true
    require_numbers: true
    require_special_chars: true
    special_chars: "!@#$%^&*()_+-=[]{}|;:,.<>?"
    max_age_days: 90
    prevent_reuse_count: 10
    lockout_threshold: 5
    lockout_duration_minutes: 30
    password_history_count: 24
```

Enforce password changes:

```gql
-- Force password change on next login
ALTER USER analyst REQUIRE PASSWORD_CHANGE;

-- Set password expiration
ALTER USER analyst PASSWORD_EXPIRES '90 days';

-- Password policy is enforced by the server when the password is set; there is
-- no validate-password procedure to pre-check a candidate. Change it and let
-- the server accept or reject it:
CALL geode.auth.user_change_password('analyst', 'old_password', 'new_password');
```

## Authentication Best Practices Summary

1. **Always use TLS** in production to protect credentials in transit
2. **Implement principle of least privilege** - grant minimum required permissions
3. **Enable audit logging** for compliance and security monitoring
4. **Use strong authentication** - multi-factor for admin accounts
5. **Rotate credentials regularly** - passwords, API keys, certificates
6. **Monitor failed login attempts** - detect and respond to attacks
7. **Separate user types** - different auth methods for users, services, admins
8. **Integrate with enterprise identity** - LDAP, OAuth, SAML for centralized management
9. **Encrypt sensitive auth data** - passwords, tokens, secrets
10. **Test disaster recovery** - ensure you can restore access after failures
