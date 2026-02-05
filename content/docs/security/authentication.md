---
title: "Authentication"
description: "Configure authentication mechanisms in Geode including username/password, API keys, MFA, LDAP/AD integration, and OAuth2/OIDC"
url: /docs/security/authentication/
weight: 20
tags:
  - security
  - authentication
  - mfa
  - ldap
  - oauth
  - api-keys
categories:
  - security
keywords:
  - authentication
  - login
  - credentials
  - MFA
  - TOTP
  - LDAP
  - Active Directory
  - OAuth2
  - OIDC
  - API keys
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Authentication

Authentication (AuthN) verifies user identity before granting access to Geode. This guide covers all supported authentication mechanisms, configuration options, and security best practices.

## Overview

Geode supports multiple authentication methods to accommodate different deployment scenarios:

| Method | Use Case | Security Level |
|--------|----------|----------------|
| Username/Password | Interactive users, development | Medium |
| API Keys | Service accounts, automation | Medium-High |
| MFA (TOTP) | Administrative access, compliance | High |
| LDAP/Active Directory | Enterprise environments | High |
| OAuth2/OIDC | SSO integration, cloud-native | High |
| mTLS (Mutual TLS) | Zero-trust, service mesh | Very High |

**Default Behavior**: Authentication is **enabled by default** in Geode v0.1.3+. Configure at least one authentication method before production deployment.

## Username/Password Authentication

### Default Admin User

On first startup, Geode creates a default admin user from environment variables:

```bash
# Set admin credentials before first startup
export GEODE_ADMIN_USERNAME="admin"
export GEODE_DEFAULT_PASSWORD="change-me-immediately"

# Start server (creates admin user on first run)
./geode serve --listen 0.0.0.0:3141
```

**Security Warning**: Change the default password immediately after first login.

### User Management

```gql
-- Create new user
CREATE USER alice WITH PASSWORD 'secure-password-123';

-- Create user with roles
CREATE USER bob WITH PASSWORD 'password' ROLES ['analyst', 'reader'];

-- Change password
ALTER USER alice SET PASSWORD 'new-password-456';

-- List users
SHOW USERS;

-- Drop user
DROP USER bob;
```

### Password Policies

Configure password requirements in `geode.yaml`:

```yaml
security:
  password_policy:
    min_length: 16            # Minimum password length
    max_length: 128           # Maximum password length
    require_uppercase: true   # At least one uppercase letter
    require_lowercase: true   # At least one lowercase letter
    require_digits: true      # At least one number
    require_special: true     # At least one special character
    expiration_days: 90       # Password expires after 90 days
    history_count: 5          # Prevent reuse of last 5 passwords
    lockout_attempts: 5       # Lock account after 5 failed attempts
    lockout_duration_minutes: 30  # Lockout duration
```

### Password Hashing

Geode uses **Argon2id** for secure password storage:

```yaml
security:
  password_hashing:
    algorithm: "argon2id"     # argon2id, bcrypt, or pbkdf2
    argon2:
      memory: 65536           # 64 MB memory cost
      iterations: 3           # Time cost (iterations)
      parallelism: 4          # Parallel threads
      salt_length: 16         # Salt length in bytes
      hash_length: 32         # Output hash length
```

**Why Argon2id?**
- **Memory-hard**: Resistant to GPU/ASIC brute-force attacks
- **Side-channel resistant**: Constant-time operations
- **Winner of Password Hashing Competition**: Industry recommended

**Hash Format**:
```
$argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>
```

See [Password Hashing](/docs/security/password-hashing/) for detailed configuration.

## API Key Authentication

API keys provide programmatic access for service accounts and automation.

### Creating API Keys

```bash
# Generate API key for user
geode admin create-api-key \
  --user alice \
  --name "production-app" \
  --expires 365d

# Output:
# API Key: gsk_live_abc123xyz789...
# Key ID: key_01HQGR5T2N...
# Expires: 2027-01-28
#
# WARNING: This key will only be shown once. Store it securely.
```

### Using API Keys

```bash
# Via environment variable
export GEODE_API_KEY="gsk_live_abc123xyz789..."
geode shell

# Via command line
geode query "MATCH (n) RETURN n LIMIT 10" --api-key "$GEODE_API_KEY"

# In client libraries (Go example)
import "go.codepros.org/geode"

client, err := geode.Connect("quic://localhost:3141",
    geode.WithAPIKey("gsk_live_abc123xyz789..."))
```

### API Key Management

```bash
# List API keys for user
geode admin list-api-keys --user alice

# Output:
# Key ID                   Name             Created            Expires
# key_01HQGR5T2N...        production-app   2026-01-28         2027-01-28
# key_01HQGR5V3M...        staging-app      2026-01-15         2026-07-15

# Revoke API key
geode admin revoke-api-key --key-id key_01HQGR5T2N...

# Rotate API key (create new, revoke old)
geode admin rotate-api-key --key-id key_01HQGR5T2N...
```

### API Key Configuration

```yaml
security:
  api_keys:
    enabled: true
    prefix: "gsk_"           # Key prefix for identification
    max_keys_per_user: 10    # Maximum keys per user
    default_expiry_days: 365 # Default expiration
    min_expiry_days: 1       # Minimum expiration
    max_expiry_days: 730     # Maximum expiration (2 years)
```

## Multi-Factor Authentication (MFA)

MFA adds an additional verification step beyond username/password.

### TOTP Configuration

Configure Time-based One-Time Passwords (TOTP):

```yaml
security:
  mfa:
    enabled: true
    required_for_roles:       # Require MFA for specific roles
      - admin
      - dba
    totp:
      issuer: "Geode"         # Displayed in authenticator app
      digits: 6               # OTP length (6 or 8)
      period: 30              # OTP validity period in seconds
      algorithm: "SHA1"       # SHA1, SHA256, or SHA512
      skew: 1                 # Allow 1 period before/after
```

### Enabling MFA for Users

```bash
# Enable MFA for user
geode admin enable-mfa --user alice

# Output:
# MFA Enrollment
# ==============
# Scan this QR code with your authenticator app:
# [QR Code displayed]
#
# Manual entry:
# Secret: JBSWY3DPEHPK3PXP
# Algorithm: SHA1
# Digits: 6
# Period: 30
#
# Enter the current code to verify: _

# Enter TOTP code from authenticator
123456

# Output:
# MFA enabled successfully for user: alice
# Backup codes:
# - abc123def456
# - ghi789jkl012
# ...
# Store these backup codes securely. They can be used for recovery.
```

### MFA Login Flow

```bash
# Login with MFA
geode shell --username alice

# Output:
# Password: ********
# MFA Code: 123456
# Connected to Geode v0.1.3
```

### Backup Codes

```bash
# Generate new backup codes (invalidates old codes)
geode admin regenerate-backup-codes --user alice

# View remaining backup code count
geode admin mfa-status --user alice

# Output:
# MFA Status for alice
# ====================
# MFA Enabled: Yes
# Method: TOTP
# Backup Codes Remaining: 8/10
# Last Used: 2026-01-27 14:30:00 UTC
```

## LDAP/Active Directory Integration

Integrate with enterprise directory services for centralized user management.

### LDAP Configuration

```yaml
security:
  ldap:
    enabled: true
    url: "ldap://ldap.example.com:389"
    use_tls: true                     # STARTTLS
    tls_skip_verify: false            # Verify LDAP server certificate

    # Bind credentials (service account)
    bind_dn: "cn=geode-service,ou=services,dc=example,dc=com"
    bind_password: "${LDAP_BIND_PASSWORD}"

    # User search
    user_search_base: "ou=users,dc=example,dc=com"
    user_search_filter: "(uid={username})"
    user_attribute: "uid"

    # Group mapping
    group_search_base: "ou=groups,dc=example,dc=com"
    group_search_filter: "(member={dn})"
    group_attribute: "cn"

    # Role mapping (LDAP group -> Geode role)
    role_mapping:
      "geode-admins": "admin"
      "geode-analysts": "analyst"
      "geode-readers": "reader"
```

### Active Directory Configuration

```yaml
security:
  ldap:
    enabled: true
    url: "ldap://dc.example.com:389"
    use_tls: true

    # AD bind credentials
    bind_dn: "CN=Geode Service,OU=Service Accounts,DC=example,DC=com"
    bind_password: "${AD_BIND_PASSWORD}"

    # AD user search (sAMAccountName)
    user_search_base: "OU=Users,DC=example,DC=com"
    user_search_filter: "(sAMAccountName={username})"
    user_attribute: "sAMAccountName"

    # AD group search
    group_search_base: "OU=Groups,DC=example,DC=com"
    group_search_filter: "(member:1.2.840.113556.1.4.1941:={dn})"  # Recursive
    group_attribute: "cn"

    # UPN login support
    upn_domain: "example.com"
```

### Testing LDAP Configuration

```bash
# Test LDAP connection
geode admin test-ldap

# Output:
# Testing LDAP connection...
# [OK] Connected to ldap://ldap.example.com:389
# [OK] STARTTLS negotiated
# [OK] Bind successful as cn=geode-service,...
# [OK] User search base accessible
# [OK] Group search base accessible
# LDAP configuration valid.

# Test user authentication
geode admin test-ldap --user alice

# Output:
# Testing authentication for user: alice
# [OK] User found: cn=alice,ou=users,dc=example,dc=com
# [OK] Password verified
# [OK] Groups: geode-analysts, geode-readers
# [OK] Mapped roles: analyst, reader
```

## OAuth2/OIDC Integration

Integrate with identity providers for Single Sign-On (SSO).

### OAuth2 Configuration

```yaml
security:
  oauth2:
    enabled: true
    provider: "generic"       # generic, okta, auth0, azure-ad, google

    # OAuth2 endpoints
    issuer_url: "https://auth.example.com"
    authorization_endpoint: "https://auth.example.com/oauth/authorize"
    token_endpoint: "https://auth.example.com/oauth/token"
    userinfo_endpoint: "https://auth.example.com/oauth/userinfo"
    jwks_uri: "https://auth.example.com/.well-known/jwks.json"

    # Client credentials
    client_id: "${OAUTH_CLIENT_ID}"
    client_secret: "${OAUTH_CLIENT_SECRET}"

    # Scopes
    scopes:
      - openid
      - profile
      - email

    # Callback URL
    redirect_uri: "https://geode.example.com/auth/callback"

    # Token validation
    audience: "geode-api"

    # Claim mapping
    claims:
      username: "preferred_username"
      email: "email"
      groups: "groups"

    # Role mapping
    role_mapping:
      "geode-admin": "admin"
      "geode-user": "reader"
```

### Provider-Specific Configuration

**Okta**:
```yaml
security:
  oauth2:
    enabled: true
    provider: "okta"
    issuer_url: "https://your-org.okta.com/oauth2/default"
    client_id: "${OKTA_CLIENT_ID}"
    client_secret: "${OKTA_CLIENT_SECRET}"
    scopes: ["openid", "profile", "email", "groups"]
```

**Azure AD**:
```yaml
security:
  oauth2:
    enabled: true
    provider: "azure-ad"
    tenant_id: "${AZURE_TENANT_ID}"
    client_id: "${AZURE_CLIENT_ID}"
    client_secret: "${AZURE_CLIENT_SECRET}"
    scopes: ["openid", "profile", "email"]
```

**Auth0**:
```yaml
security:
  oauth2:
    enabled: true
    provider: "auth0"
    domain: "your-tenant.auth0.com"
    client_id: "${AUTH0_CLIENT_ID}"
    client_secret: "${AUTH0_CLIENT_SECRET}"
    audience: "https://geode.example.com/api"
```

## Mutual TLS (mTLS)

Certificate-based authentication for zero-trust environments.

### mTLS Configuration

```yaml
security:
  mtls:
    enabled: true
    client_ca: "/etc/geode/certs/client-ca.pem"  # CA for client certs
    verify_client: "require"                      # require, optional, none

    # Certificate mapping (CN -> username)
    cn_mapping:
      enabled: true
      extract_username: "cn"    # Extract from CN field

    # SAN mapping (alternative)
    san_mapping:
      enabled: false
      extract_username: "email" # Extract from email SAN
```

### Generating Client Certificates

```bash
# Generate client CA (one-time)
openssl genrsa -out client-ca-key.pem 4096
openssl req -x509 -new -nodes -key client-ca-key.pem \
  -sha256 -days 3650 -out client-ca.pem \
  -subj "/CN=Geode Client CA"

# Generate client certificate for user
openssl genrsa -out alice-key.pem 2048
openssl req -new -key alice-key.pem -out alice.csr \
  -subj "/CN=alice/O=Engineering"

openssl x509 -req -in alice.csr -CA client-ca.pem \
  -CAkey client-ca-key.pem -CAcreateserial \
  -out alice-cert.pem -days 365 -sha256

# Connect with client certificate
geode shell \
  --cert alice-cert.pem \
  --key alice-key.pem
```

## Authentication Events and Audit

All authentication events are logged for security monitoring:

```yaml
security:
  audit:
    authentication_events:
      - login_success
      - login_failure
      - logout
      - mfa_challenge
      - mfa_success
      - mfa_failure
      - password_change
      - api_key_created
      - api_key_revoked
      - session_created
      - session_expired
```

**Sample Audit Log**:
```json
{
  "timestamp": "2026-01-28T14:30:00.123Z",
  "event_type": "login_failure",
  "user": "alice",
  "source_ip": "192.168.1.100",
  "method": "password",
  "reason": "invalid_password",
  "attempts": 3,
  "trace_id": "abc123..."
}
```

## Security Best Practices

### Password Security

1. **Enforce strong passwords**: Minimum 16 characters with complexity requirements
2. **Enable password expiration**: 90 days maximum
3. **Prevent password reuse**: Track last 5-10 passwords
4. **Use account lockout**: 5 failed attempts, 30-minute lockout

### MFA Requirements

1. **Require MFA for admins**: All users with admin role
2. **Provide backup codes**: Store securely for account recovery
3. **Monitor MFA events**: Alert on repeated failures
4. **Regular backup code rotation**: Regenerate annually

### API Key Management

1. **Use short-lived keys**: 90 days maximum for production
2. **Implement key rotation**: Rotate keys before expiration
3. **Monitor key usage**: Alert on unusual patterns
4. **Principle of least privilege**: Grant minimum required permissions

### Enterprise Integration

1. **Use LDAP/AD for user management**: Centralized user lifecycle
2. **Implement SSO with OAuth2/OIDC**: Single point of authentication
3. **Enable mTLS for service accounts**: Certificate-based authentication
4. **Regular access reviews**: Audit user permissions quarterly

## Troubleshooting

### Common Issues

**Issue**: "Invalid credentials" error
```bash
# Check user exists
geode admin show-user alice

# Verify password policy compliance
geode admin validate-password --user alice

# Check account lockout status
geode admin account-status --user alice
```

**Issue**: LDAP connection failure
```bash
# Test LDAP connectivity
geode admin test-ldap --verbose

# Check TLS certificate
openssl s_client -connect ldap.example.com:636 -showcerts
```

**Issue**: MFA not working
```bash
# Verify server time synchronization
timedatectl status

# Check MFA configuration
geode admin mfa-status --user alice

# Reset MFA (requires admin)
geode admin reset-mfa --user alice
```

## Related Documentation

- **[Security Overview](/docs/security/overview/)** - Complete security architecture
- **[Authorization](/docs/security/authorization/)** - RBAC, ABAC, and RLS
- **[Password Hashing](/docs/security/password-hashing/)** - Argon2id configuration
- **[Session Management](/docs/security/session-management/)** - Session security
- **[Audit Logging](/docs/ops/audit-logging/)** - Authentication audit trail
