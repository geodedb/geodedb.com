---
title: "Data Encryption"
description: "Comprehensive guide to data encryption in Geode. Learn about encryption at rest, encryption in transit, key management, and cryptographic best practices for securing graph database data."
keywords:
  - encryption
  - data encryption
  - encryption at rest
  - encryption in transit
  - TLS
  - AES
  - key management
  - cryptography
  - data security
  - Geode
  - graph database
  - security
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/encryption/"
    noindex: false
    title: "Data Encryption - Geode Graph Database"
    description: "Secure your graph data with Geode's comprehensive encryption. AES-256-GCM encryption at rest, TLS 1.3 in transit, and enterprise key management for complete data protection."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Geode provides enterprise-grade encryption for protecting sensitive graph data both at rest and in transit. This comprehensive encryption implementation uses industry-standard algorithms and follows cryptographic best practices to ensure data confidentiality, integrity, and compliance with security regulations.

## Encryption Architecture

Geode implements a multi-layered encryption architecture:

- **Encryption at Rest**: All data files encrypted with AES-256-GCM
- **Encryption in Transit**: TLS 1.3 for all network communications
- **Key Management**: Hierarchical key structure with master keys, data encryption keys, and key encryption keys
- **Memory Protection**: Sensitive data encrypted in memory when possible
- **Audit Log Encryption**: Optional encryption of audit logs
- **Backup Encryption**: Encrypted backups with independent keys

## Encryption at Rest

All data stored by Geode is encrypted using AES-256 in Galois/Counter Mode (GCM), providing both confidentiality and authenticity. This includes:

- Graph data (nodes and relationships)
- Property values
- Indexes
- Transaction logs
- Metadata
- System catalogs

### Enabling Encryption at Rest

```bash
# Enable encryption at rest with default settings
geode serve --encryption-at-rest=enabled \
  --encryption-algorithm=aes-256-gcm

# Use custom encryption key file
geode serve --encryption-at-rest=enabled \
  --encryption-key-file=/etc/geode/keys/master.key

# Generate a new master key
geode keygen --algorithm=aes-256 \
  --output=/etc/geode/keys/master.key \
  --protect-with-passphrase
```

### Key Storage Options

Geode supports multiple key storage backends:

**File-based (Development)**

```bash
# Store keys in protected file
geode serve --encryption-key-file=/etc/geode/keys/master.key \
  --key-file-permissions=0400
```

**Environment Variable (Container Deployments)**

```bash
# Pass key via environment variable
export GEODE_MASTER_KEY="base64-encoded-key-here"
geode serve --encryption-key-source=env:GEODE_MASTER_KEY
```

**Hardware Security Module (Production)**

```bash
# Use HSM for key storage
geode serve --encryption-key-source=hsm \
  --hsm-provider=pkcs11 \
  --hsm-library=/usr/lib/softhsm/libsofthsm2.so \
  --hsm-slot=0 \
  --hsm-pin-file=/etc/geode/hsm-pin.txt
```

**Cloud Key Management Service**

```bash
# AWS KMS
geode serve --encryption-key-source=aws-kms \
  --kms-key-id=arn:aws:kms:us-east-1:123456789012:key/abc123

# Google Cloud KMS
geode serve --encryption-key-source=gcp-kms \
  --kms-key-name=projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY

# Azure Key Vault
geode serve --encryption-key-source=azure-keyvault \
  --keyvault-name=mygeodekeys \
  --keyvault-key-name=master-key
```

### Key Hierarchy

Geode uses a hierarchical key structure for security and performance:

1. **Master Key (MK)**: Root of the key hierarchy, stored in HSM or KMS
2. **Key Encryption Keys (KEK)**: Encrypted by master key, used to encrypt data encryption keys
3. **Data Encryption Keys (DEK)**: Encrypted by KEK, used to encrypt actual data

```
Master Key (HSM/KMS)
  |
  +-- Key Encryption Key 1
  |     |
  |     +-- Data Encryption Key 1 (Graph Data)
  |     +-- Data Encryption Key 2 (Indexes)
  |
  +-- Key Encryption Key 2
        |
        +-- Data Encryption Key 3 (Transaction Logs)
        +-- Data Encryption Key 4 (Backups)
```

This hierarchy provides:

- **Key Rotation**: Rotate master key without re-encrypting all data
- **Performance**: Data encryption keys cached in memory
- **Isolation**: Different data types use different keys
- **Recovery**: Separate keys for backups and operational data

### Key Rotation

Regular key rotation is essential for security:

```bash
# Rotate master key (KEKs re-encrypted, DEKs unchanged)
geode key-rotate --key-type=master \
  --new-key-source=hsm \
  --old-key-file=/etc/geode/keys/old-master.key

# Rotate data encryption keys (data re-encrypted in background)
geode key-rotate --key-type=data \
  --background=true \
  --throttle=50mbps

# Check key rotation progress
geode key-rotate --status
# Output: 45% complete, 1.2 TB of 2.7 TB re-encrypted
```

Configure automatic key rotation:

```bash
# Rotate master key quarterly, data keys annually
geode serve --key-rotation-schedule=master:90d,data:365d \
  --key-rotation-window=02:00-06:00
```

## Encryption in Transit

All network communications are encrypted using TLS 1.3 with strong cipher suites. Geode's QUIC transport provides encryption by default.

### TLS Configuration

```bash
# Basic TLS configuration
geode serve --tls-cert=/etc/geode/certs/server.crt \
  --tls-key=/etc/geode/certs/server.key \
  --tls-ca=/etc/geode/certs/ca.crt

# Enforce TLS 1.3 only
geode serve --tls-min-version=1.3 \
  --tls-max-version=1.3

# Specify allowed cipher suites
geode serve --tls-cipher-suites=TLS_AES_256_GCM_SHA384,TLS_CHACHA20_POLY1305_SHA256
```

### Client Certificate Authentication

Require clients to present valid certificates:

```bash
# Enable mutual TLS (mTLS)
geode serve --require-client-certificates=true \
  --client-ca=/etc/geode/certs/client-ca.crt \
  --verify-client-certificates=true

# Allow specific client certificates only
geode serve --client-cert-allowlist=/etc/geode/allowed-clients.txt
```

### Certificate Management

Generate and manage TLS certificates:

```bash
# Generate self-signed certificate for development
geode cert-gen --output-dir=/etc/geode/certs \
  --common-name=geode.example.com \
  --san=DNS:geode.example.com,DNS:localhost,IP:127.0.0.1

# Generate certificate signing request for production
geode cert-gen --csr-only \
  --output=/etc/geode/certs/geode.csr \
  --common-name=geode.production.example.com

# Certificate rotation
geode cert-rotate --new-cert=/etc/geode/certs/new-cert.crt \
  --new-key=/etc/geode/certs/new-key.key \
  --graceful=true \
  --overlap-duration=24h
```

### Perfect Forward Secrecy

Geode enforces perfect forward secrecy (PFS) to protect past communications:

```bash
# PFS is enabled by default with ECDHE key exchange
geode serve --tls-require-pfs=true \
  --tls-key-exchange=ecdhe-secp256r1
```

## Field-Level Encryption

Encrypt specific fields within the graph for additional security:

```gql
-- Encrypt sensitive fields before storing
INSERT (:Person {
  name: 'Alice Smith',
  email: 'alice@example.com',
  ssn: '123-45-6789' /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar encrypt() */,
  salary: '95000' /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar encrypt() */
});

-- Decrypt on retrieval (requires permission)
MATCH (p:Person {email: 'alice@example.com'})
RETURN p.name, p.ssn /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar decrypt() */ AS ssn;
```

### Deterministic vs Randomized Encryption

**Deterministic Encryption**: Same plaintext always produces same ciphertext, allowing equality searches:

```gql
-- Store with deterministic encryption for searchability
INSERT (:Account {
  account_number: $account_num /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar encrypt_deterministic() */,
  balance: /* FLE is CALL geode.fle.configurefield(...) */ ($balance, 'balance-key')
});

-- Can search deterministically encrypted fields
MATCH (a:Account)
WHERE a.account_number = '1234567890' /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar encrypt_deterministic() */
RETURN decrypt_random(a.balance, 'balance-key') AS balance;
```

**Randomized Encryption**: Same plaintext produces different ciphertext each time, maximum security:

```gql
-- Maximum security, no searchability
INSERT (:MedicalRecord {
  patient_id: $patient_id,
  diagnosis: /* FLE is CALL geode.fle.configurefield(...) */ ($diagnosis, 'medical-key'),
  notes: /* FLE is CALL geode.fle.configurefield(...) */ ($notes, 'medical-key')
});
```

## Transparent Data Encryption

Enable transparent data encryption (TDE) for automatic encryption of all data:

```bash
# Enable TDE - all data automatically encrypted/decrypted
geode serve --transparent-encryption=enabled \
  --encryption-key-source=hsm \
  --encryption-algorithm=aes-256-gcm

# Applications don't need to change - encryption is transparent
# All data encrypted at storage layer automatically
```

With TDE enabled:

- No application code changes required
- All queries work normally
- Encryption/decryption handled automatically
- Performance impact: typically 5-10% for read/write operations

## Backup Encryption

Backups are encrypted separately from operational data:

```bash
# Create encrypted backup
geode backup create --encryption=enabled \
  --encryption-key-source=file:/etc/geode/keys/backup.key \
  --output=/backups/geode-2026-01-24.backup

# Create backup with separate encryption key
geode backup create --encryption=enabled \
  --encryption-key-source=aws-kms \
  --kms-key-id=arn:aws:kms:us-east-1:123456789012:key/backup-key \
  --output=s3://my-backups/geode-backup.enc

# Restore from encrypted backup
geode backup restore --input=/backups/geode-2026-01-24.backup \
  --encryption-key-source=file:/etc/geode/keys/backup.key
```

## Audit Log Encryption

Protect audit logs from unauthorized access:

```bash
# Encrypt audit logs
geode serve --audit-log-encryption=enabled \
  --audit-log-encryption-key=/etc/geode/keys/audit.key \
  --audit-log-signing=true

# Decrypt audit logs for analysis
geode audit-log decrypt --input=/var/log/geode/audit.log.enc \
  --key=/etc/geode/keys/audit.key \
  --output=/tmp/audit.log
```

## Encryption Performance

Encryption has minimal performance impact due to hardware acceleration:

### Hardware Acceleration

```bash
# Check for AES-NI support (Intel/AMD)
geode check-crypto-accel

# Output:
# AES-NI: Available
# AVX2: Available
# SHA Extensions: Available
# Estimated encryption overhead: 3-5%

# Use hardware acceleration
geode serve --use-crypto-acceleration=true \
  --prefer-aes-ni=true
```

### Performance Optimization

```bash
# Tune encryption performance
geode serve --encryption-cache-size=1GB \
  --encryption-parallel-threads=4 \
  --encryption-batch-size=4MB
```

Typical performance impact:

- Encryption at rest: 3-7% throughput reduction
- Encryption in transit: 1-3% throughput reduction with TLS 1.3
- Field-level encryption: 10-15% for encrypted fields only
- Transparent encryption: 5-10% overall system throughput

## Compliance and Standards

Geode's encryption meets requirements for:

- **FIPS 140-2**: Use FIPS-validated cryptographic modules
- **PCI DSS**: Strong cryptography for payment data
- **HIPAA**: Encryption of electronic protected health information
- **GDPR**: State-of-the-art encryption for personal data

```bash
# Enable FIPS mode for compliance
geode serve --fips-mode=enabled \
  --crypto-library=fips-validated \
  --enforce-fips-algorithms=true
```

## Key Management Best Practices

1. **Never Store Keys in Code**: Use environment variables, HSM, or KMS
2. **Rotate Keys Regularly**: Master keys quarterly, data keys annually
3. **Separate Key Responsibilities**: Different keys for different purposes
4. **Backup Keys Securely**: Store backup keys separately from backups
5. **Monitor Key Access**: Log all key access and rotation events
6. **Use HSM for Production**: Hardware security modules for master keys
7. **Test Recovery**: Regularly test key recovery procedures
8. **Document Procedures**: Maintain clear documentation for key management
9. **Principle of Least Privilege**: Limit key access to necessary personnel only
10. **Key Destruction**: Securely destroy old keys after rotation

## Troubleshooting

### Decryption Failures

```bash
# Check encryption status
geode encryption-status

# Verify key availability
geode key-verify --key-source=hsm

# Test decryption
geode test-decrypt --key-source=file:/etc/geode/keys/master.key
```

### Performance Issues

```bash
# Check if hardware acceleration is working
geode check-crypto-accel --verbose

# Profile encryption overhead
geode profile --component=encryption \
  --duration=60s \
  --output=encryption-profile.json
```

### Key Rotation Issues

```bash
# Check rotation status
geode key-rotate --status --verbose

# Resume interrupted rotation
geode key-rotate --resume \
  --rotation-id=rot_abc123

# Roll back failed rotation
geode key-rotate --rollback \
  --rotation-id=rot_abc123
```

## Related Topics

- [Compliance](/tags/compliance/) - Regulatory compliance requirements
- [Audit Logging](/tags/audit-logging/) - Comprehensive security audit trails
- [Row-Level Security](/tags/row-level-security/) - Fine-grained access control
- [Configuration](/tags/configuration/) - Security configuration best practices
- [Connections](/tags/connections/) - Secure connection management
- [Security Overview](/docs/security/overview/) - Security documentation
- [Field-Level Encryption](/docs/security/field-level-encryption/) - Fine-grained encryption
- [KMS Integration](/docs/security/kms-integration/) - Key management service integration
