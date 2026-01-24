---
title: "Security Configuration"
description: "Comprehensive guide to security configuration in Geode. Learn how to configure authentication, authorization, encryption, audit logging, and security policies for production graph database deployments."
keywords:
  - security configuration
  - authentication configuration
  - authorization settings
  - encryption settings
  - security policies
  - server security
  - hardening
  - Geode
  - graph database
  - enterprise security
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/configuration/"
    noindex: false
    title: "Security Configuration - Geode Graph Database"
    description: "Configure enterprise security in Geode. Complete guide to authentication, authorization, encryption, audit logging, and security hardening for production deployments."
---

Security configuration is critical for deploying Geode in production environments. This comprehensive guide covers all aspects of security configuration, from authentication and authorization to encryption and audit logging, ensuring your graph database meets enterprise security requirements.

## Configuration File Structure

Geode supports multiple configuration methods:

### Configuration File (Recommended)

```yaml
# /etc/geode/geode.yml
server:
  listen: "0.0.0.0:3141"
  max_connections: 10000

security:
  authentication:
    method: ldap
    ldap:
      server: "ldap://ldap.example.com:389"
      base_dn: "dc=example,dc=com"
      bind_dn: "cn=geode,ou=services,dc=example,dc=com"
      bind_password_file: "/etc/geode/secrets/ldap-password.txt"

  authorization:
    enabled: true
    default_role: "viewer"

  encryption:
    at_rest:
      enabled: true
      algorithm: "aes-256-gcm"
      key_source: "hsm"
    in_transit:
      tls_cert: "/etc/geode/certs/server.crt"
      tls_key: "/etc/geode/certs/server.key"
      tls_min_version: "1.3"

  audit:
    enabled: true
    level: "comprehensive"
    output: "/var/log/geode/audit.log"
    retention_days: 2555
```

Start with configuration file:

```bash
geode serve --config=/etc/geode/geode.yml
```

### Environment Variables

```bash
# Security settings via environment variables
export GEODE_AUTH_METHOD=ldap
export GEODE_LDAP_SERVER=ldap://ldap.example.com:389
export GEODE_TLS_CERT=/etc/geode/certs/server.crt
export GEODE_TLS_KEY=/etc/geode/certs/server.key
export GEODE_AUDIT_ENABLED=true

geode serve
```

### Command-Line Arguments

```bash
geode serve \
  --auth-method=ldap \
  --ldap-server=ldap://ldap.example.com:389 \
  --tls-cert=/etc/geode/certs/server.crt \
  --tls-key=/etc/geode/certs/server.key \
  --audit-enabled=true
```

## Authentication Configuration

### Password Authentication

```yaml
security:
  authentication:
    method: password
    password:
      min_length: 14
      require_uppercase: true
      require_lowercase: true
      require_digits: true
      require_special_chars: true
      max_age_days: 90
      history_count: 12
      lockout_threshold: 5
      lockout_duration: 1800
```

### LDAP/Active Directory

```yaml
security:
  authentication:
    method: ldap
    ldap:
      server: "ldaps://ad.example.com:636"
      base_dn: "dc=example,dc=com"
      bind_dn: "cn=geode,ou=services,dc=example,dc=com"
      bind_password_file: "/etc/geode/secrets/ldap-password.txt"
      user_search_filter: "(sAMAccountName={0})"
      group_search_base: "ou=groups,dc=example,dc=com"
      group_search_filter: "(member={0})"
      connection_timeout: 30
      read_timeout: 30
      pool_size: 10
```

### OAuth 2.0 / OpenID Connect

```yaml
security:
  authentication:
    method: oauth2
    oauth2:
      provider: "https://auth.example.com"
      client_id: "geode-server"
      client_secret_file: "/etc/geode/secrets/oauth-secret.txt"
      scopes: ["openid", "profile", "email"]
      jwks_uri: "https://auth.example.com/.well-known/jwks.json"
      issuer: "https://auth.example.com"
      audience: "geode-api"
      token_validation:
        validate_signature: true
        validate_expiry: true
        validate_issuer: true
        clock_skew_seconds: 60
```

### JWT Token Authentication

```yaml
security:
  authentication:
    method: jwt
    jwt:
      secret_key_file: "/etc/geode/secrets/jwt-secret.key"
      algorithm: "HS256"
      issuer: "geode.example.com"
      audience: "geode-api"
      expiry_seconds: 3600
      refresh_enabled: true
      refresh_expiry_seconds: 86400
```

### Multi-Factor Authentication

```yaml
security:
  authentication:
    mfa:
      enabled: true
      required_for_roles: ["admin", "dba"]
      providers: ["totp", "webauthn"]
      grace_period_seconds: 0
      remember_device_days: 30
      backup_codes: 10
```

## Authorization Configuration

### Role-Based Access Control

```yaml
security:
  authorization:
    enabled: true
    default_role: "viewer"

    roles:
      - name: "viewer"
        permissions:
          - "read:*"

      - name: "analyst"
        permissions:
          - "read:*"
          - "write:temporary_data"

      - name: "developer"
        permissions:
          - "read:*"
          - "write:*"
          - "create:index"

      - name: "admin"
        permissions:
          - "*:*"

    role_mapping:
      ldap_groups:
        "CN=Geode-Admins,OU=Security,DC=example,DC=com": "admin"
        "CN=Geode-Developers,OU=Engineering,DC=example,DC=com": "developer"
        "CN=Geode-Analysts,OU=Business,DC=example,DC=com": "analyst"
```

### Row-Level Security Policies

```yaml
security:
  authorization:
    row_level_security:
      enabled: true
      default_policy: "deny_all"

      policies:
        - name: "tenant_isolation"
          target: "all_labels"
          condition: "node.tenant_id = current_tenant_id()"
          priority: 100

        - name: "department_access"
          target: ["Employee", "Project"]
          condition: "node.department IN get_user_departments(current_user())"
          priority: 50
```

## Encryption Configuration

### Encryption at Rest

```yaml
security:
  encryption:
    at_rest:
      enabled: true
      algorithm: "aes-256-gcm"

      key_source: "hsm"
      hsm:
        provider: "pkcs11"
        library: "/usr/lib/softhsm/libsofthsm2.so"
        slot: 0
        pin_file: "/etc/geode/secrets/hsm-pin.txt"

      key_rotation:
        enabled: true
        master_key_days: 90
        data_key_days: 365
        rotation_window: "02:00-06:00"

      fips_mode: true
```

### Cloud KMS Integration

```yaml
security:
  encryption:
    at_rest:
      enabled: true

      # AWS KMS
      key_source: "aws-kms"
      aws_kms:
        key_id: "arn:aws:kms:us-east-1:123456789012:key/abc123"
        region: "us-east-1"
        endpoint: "https://kms.us-east-1.amazonaws.com"

      # Google Cloud KMS
      # key_source: "gcp-kms"
      # gcp_kms:
      #   key_name: "projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY"
      #   credentials_file: "/etc/geode/secrets/gcp-credentials.json"

      # Azure Key Vault
      # key_source: "azure-keyvault"
      # azure_keyvault:
      #   vault_name: "mygeodekeys"
      #   key_name: "master-key"
      #   tenant_id: "tenant-id"
      #   client_id: "client-id"
      #   client_secret_file: "/etc/geode/secrets/azure-secret.txt"
```

### Encryption in Transit

```yaml
security:
  encryption:
    in_transit:
      tls_cert: "/etc/geode/certs/server.crt"
      tls_key: "/etc/geode/certs/server.key"
      tls_ca: "/etc/geode/certs/ca-bundle.crt"

      tls_min_version: "1.3"
      tls_max_version: "1.3"

      cipher_suites:
        - "TLS_AES_256_GCM_SHA384"
        - "TLS_CHACHA20_POLY1305_SHA256"

      client_certificates:
        required: true
        verify: "strict"
        ca: "/etc/geode/certs/client-ca.crt"
        allowlist: "/etc/geode/allowed-clients.txt"

      certificate_rotation:
        auto_reload: true
        check_interval: 3600
        graceful_overlap: 86400
```

## Audit Logging Configuration

### Comprehensive Audit Logging

```yaml
security:
  audit:
    enabled: true
    level: "comprehensive"  # minimal, security, compliance, comprehensive

    output:
      file:
        path: "/var/log/geode/audit.log"
        format: "json"
        rotation:
          max_size: "100MB"
          max_files: 100
          compress: true
        permissions: "0400"

      syslog:
        enabled: true
        server: "syslog.example.com:514"
        protocol: "tcp"
        facility: "local0"

      elasticsearch:
        enabled: false
        url: "https://elasticsearch.example.com:9200"
        index_prefix: "geode-audit"
        username: "geode"
        password_file: "/etc/geode/secrets/es-password.txt"

    events:
      authentication: true
      authorization: true
      data_access: true
      data_modification: true
      schema_changes: true
      configuration_changes: true
      administrative_actions: true

    retention:
      days: 2555  # 7 years
      archive_path: "/var/archive/geode/audit"
      compress_after_days: 90

    encryption:
      enabled: true
      key_file: "/etc/geode/secrets/audit-key.pem"
      signing: true
```

## Network Security Configuration

### Firewall and Access Control

```yaml
security:
  network:
    listen:
      address: "0.0.0.0"
      port: 3141
      interface: "eth0"

    ip_allowlist:
      enabled: true
      file: "/etc/geode/allowed-ips.txt"
      # Format: CIDR notation, one per line

    ip_blocklist:
      enabled: true
      file: "/etc/geode/blocked-ips.txt"

    rate_limiting:
      enabled: true
      connections_per_ip: 100
      connections_per_minute: 100
      queries_per_minute: 1000
      bandwidth_mbps: 100

    auto_blocking:
      enabled: true
      failed_auth_threshold: 5
      failed_auth_window: 300
      block_duration: 3600
```

### DDoS Protection

```yaml
security:
  network:
    ddos_protection:
      enabled: true
      syn_cookie: true
      connection_rate_limit: 1000
      max_connections_per_ip: 100
      challenge_on_spike: true
```

## Session Security Configuration

```yaml
security:
  sessions:
    timeout: 1800  # 30 minutes
    max_idle: 900   # 15 minutes
    max_lifetime: 86400  # 24 hours

    cookie:
      secure: true
      http_only: true
      same_site: "strict"
      domain: ".example.com"

    persistence:
      enabled: true
      store: "redis"
      redis:
        url: "redis://redis.example.com:6379/0"
        password_file: "/etc/geode/secrets/redis-password.txt"
        tls: true

    concurrent_sessions:
      max_per_user: 5
      policy: "terminate_oldest"  # terminate_oldest, deny_new, allow_all
```

## Security Hardening

### Production Security Baseline

```yaml
security:
  hardening:
    # Disable unnecessary features
    disable_shell: false  # Set to true in production
    disable_metrics_endpoint: false
    disable_debug_endpoints: true

    # Strict security policies
    strict_mode: true
    paranoid_mode: false  # Maximum security, may impact performance

    # Resource limits
    max_query_complexity: 1000
    max_query_execution_time: 300
    max_result_size: 100000

    # Input validation
    sanitize_input: true
    reject_suspicious_queries: true

    # Security headers
    http_security_headers:
      x_frame_options: "DENY"
      x_content_type_options: "nosniff"
      x_xss_protection: "1; mode=block"
      strict_transport_security: "max-age=31536000; includeSubDomains"
```

## Secrets Management

### External Secrets

```yaml
security:
  secrets:
    provider: "vault"  # vault, aws-secrets-manager, azure-keyvault

    vault:
      address: "https://vault.example.com:8200"
      token_file: "/etc/geode/secrets/vault-token.txt"
      namespace: "geode"
      mount_path: "secret"

      secrets:
        database_password: "secret/geode/db-password"
        jwt_secret: "secret/geode/jwt-secret"
        encryption_key: "secret/geode/encryption-key"

    rotation:
      enabled: true
      check_interval: 3600
```

## Compliance Configuration

### GDPR Compliance

```yaml
security:
  compliance:
    gdpr:
      enabled: true
      data_retention:
        default_days: 2555  # 7 years
        personal_data_days: 1095  # 3 years
        anonymization_enabled: true

      right_to_access:
        enabled: true
        export_format: "json"

      right_to_erasure:
        enabled: true
        secure_deletion: true
        audit_deletion: true
```

### HIPAA Compliance

```yaml
security:
  compliance:
    hipaa:
      enabled: true
      audit_level: "comprehensive"
      encryption_required: true
      minimum_necessary: true

      access_controls:
        unique_user_ids: true
        emergency_access: true
        automatic_logoff: true
        logoff_timeout: 900
```

## Monitoring and Alerting

```yaml
security:
  monitoring:
    enabled: true

    metrics:
      prometheus:
        enabled: true
        port: 9090
        path: "/metrics"
        auth_required: true

    alerts:
      channels:
        - type: "email"
          recipients: ["security@example.com"]
        - type: "pagerduty"
          api_key_file: "/etc/geode/secrets/pagerduty-key.txt"
        - type: "slack"
          webhook_url_file: "/etc/geode/secrets/slack-webhook.txt"

      rules:
        - name: "multiple_failed_logins"
          condition: "failed_auth_count > 10"
          window: "5m"
          severity: "high"

        - name: "unauthorized_access"
          condition: "authorization_failures > 5"
          window: "5m"
          severity: "critical"
```

## Configuration Validation

```bash
# Validate configuration file
geode config validate --config=/etc/geode/geode.yml

# Output:
# ✓ Configuration syntax valid
# ✓ All required fields present
# ✓ TLS certificates valid and not expired
# ✓ LDAP connection successful
# ⚠ Warning: audit log directory not writable
# ✗ Error: HSM connection failed

# Test security configuration
geode config test-security --config=/etc/geode/geode.yml

# Generate secure configuration template
geode config generate --template=production-secure \
  --output=/etc/geode/geode-secure.yml
```

## Best Practices

1. **Use Configuration Files**: Prefer YAML configuration over command-line arguments
2. **Store Secrets Securely**: Never commit secrets to version control
3. **Enable Audit Logging**: Always enable comprehensive audit logging in production
4. **Require TLS 1.3**: Enforce latest TLS version for all connections
5. **Implement MFA**: Require multi-factor authentication for administrative access
6. **Regular Key Rotation**: Automate encryption key rotation
7. **Principle of Least Privilege**: Grant minimum necessary permissions
8. **Monitor Security Events**: Set up real-time alerting for security events
9. **Regular Security Audits**: Periodically review and update security configuration
10. **Document Changes**: Maintain change log for security configuration modifications

## Related Topics

- [Authentication](/docs/security/authentication/) - User authentication systems
- [Authorization](/docs/security/authorization/) - Access control and permissions
- [Encryption](/tags/encryption/) - Data encryption configuration
- [Audit Logging](/tags/audit-logging/) - Comprehensive audit trails
- [Compliance](/tags/compliance/) - Regulatory compliance requirements
- [Row-Level Security](/tags/row-level-security/) - Fine-grained access control
- [Connections](/tags/connections/) - Connection security and management
- [Deployment](/docs/deployment/) - Production deployment guides
