---
title: "Key Management - Cryptographic Security"
description: "Manage cryptographic keys in Geode for TLS certificates, encryption at rest, and secure authentication with best practices for key rotation and storage."
keywords:
  - key management
  - cryptography
  - TLS certificates
  - encryption keys
  - key rotation
  - KMS
  - security
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/key-management/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Key Management in Geode

Cryptographic key management is fundamental to Geode's security architecture. Proper key management ensures that encryption protects data effectively while maintaining operational flexibility for key rotation, backup, and recovery.

## TLS Certificate Management

Geode requires TLS 1.3 for all connections. Managing TLS certificates properly is essential for secure deployments.

**Generating certificates**:
```bash
# Generate CA (for internal PKI)
openssl genrsa -out ca-key.pem 4096
openssl req -new -x509 -days 365 -key ca-key.pem -out ca-cert.pem \
    -subj "/CN=Geode Internal CA"

# Generate server certificate
openssl genrsa -out server-key.pem 4096
openssl req -new -key server-key.pem -out server.csr \
    -subj "/CN=geode.example.com"
openssl x509 -req -days 365 -in server.csr -CA ca-cert.pem \
    -CAkey ca-key.pem -CAcreateserial -out server-cert.pem
```

**Server configuration**:
```bash
geode serve --listen 0.0.0.0:3141 \
    --tls-cert=/etc/geode/certs/server-cert.pem \
    --tls-key=/etc/geode/certs/server-key.pem
```

## Encryption Key Management

**Data encryption keys (DEK)**: Geode uses AES-256-GCM for transparent data encryption. Keys can be provided directly or through a Key Management Service.

**Direct key configuration**:
```bash
# Generate encryption key
openssl rand -hex 32 > /etc/geode/keys/data-encryption.key
chmod 600 /etc/geode/keys/data-encryption.key

# Start with encryption enabled
geode serve --listen 0.0.0.0:3141 \
    --encryption-enabled=true \
    --encryption-key-file=/etc/geode/keys/data-encryption.key
```

**KMS integration**:
```bash
# AWS KMS
geode serve --listen 0.0.0.0:3141 \
    --encryption-enabled=true \
    --encryption-kms=aws \
    --encryption-kms-key-id=arn:aws:kms:us-east-1:123456789:key/abc-123

# HashiCorp Vault
geode serve --listen 0.0.0.0:3141 \
    --encryption-enabled=true \
    --encryption-kms=vault \
    --encryption-kms-endpoint=https://vault.example.com:8200 \
    --encryption-kms-key-path=secret/geode/encryption-key
```

## Key Rotation

Regular key rotation limits exposure from potential key compromise.

**Certificate rotation**:
1. Generate new certificate before expiration
2. Deploy new certificate alongside existing
3. Update server configuration
4. Graceful restart to apply new certificate
5. Remove old certificate after transition period

**Encryption key rotation**:
```bash
# Rotate data encryption key (requires re-encryption)
geode admin key-rotate \
    --old-key-file=/etc/geode/keys/data-encryption-old.key \
    --new-key-file=/etc/geode/keys/data-encryption-new.key
```

## Best Practices

**Secure key storage**:
- Never store keys in version control
- Use file system permissions (600 or stricter)
- Consider hardware security modules (HSM) for high-security deployments
- Use secrets management systems (Vault, AWS Secrets Manager)

**Key backup**:
- Maintain secure backups of encryption keys
- Store backups separately from encrypted data
- Test key recovery procedures regularly

**Access control**:
- Limit key access to necessary personnel only
- Use separate keys for different environments
- Audit key access and usage

## Related Topics

- [Security](/tags/security/)
- [Encryption](/tags/encryption/)
- [TLS](/tags/tls/)
- [Authentication](/tags/authentication/)
- [Compliance](/tags/compliance/)
