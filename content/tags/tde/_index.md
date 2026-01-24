---
title: "Tag: Transparent Data Encryption (TDE)"
description: "Explore Geode documentation tagged with tde. Learn about tde features, best practices, and implementation details."
keywords:
  - tde
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/tde/"
    noindex: false
---

Documentation tagged with **Transparent Data Encryption (TDE)** in the Geode graph database. TDE provides encryption-at-rest for database files, protecting data stored on disk from unauthorized access while remaining transparent to applications and queries.

## Introduction to Transparent Data Encryption

Transparent Data Encryption (TDE) is an enterprise security feature that encrypts database files on disk, ensuring that data remains protected even if storage media is stolen, improperly disposed of, or accessed by unauthorized users. The "transparent" aspect means encryption and decryption happen automatically—applications and users don't need to modify queries or code.

TDE addresses a critical security requirement: protecting data at rest. While network encryption (TLS) protects data in transit and authentication prevents unauthorized access, TDE ensures that raw database files, backups, and snapshots cannot be read without the encryption keys. This is essential for:

- **Compliance**: Regulations like GDPR, HIPAA, PCI-DSS, and SOC 2 require encryption at rest
- **Data breach protection**: Stolen drives or backups are useless without keys
- **Multi-tenant security**: Prevent cloud providers or storage administrators from accessing data
- **Secure decommissioning**: Safely dispose of old hardware without data recovery risks

Geode's TDE implementation uses industry-standard AES-256 encryption with hardware acceleration (AES-NI) for minimal performance overhead, typically less than 5% impact on throughput.

## Core TDE Concepts

### Encryption at Rest vs. In Transit

Geode provides multiple encryption layers:

- **TDE (Encryption at Rest)**: Protects data stored on disk
- **TLS (Encryption in Transit)**: Protects data transmitted over networks
- **FLE (Field-Level Encryption)**: Protects specific sensitive fields

Together, these provide defense-in-depth security.

### Two-Tier Key Architecture

Geode uses a two-tier key hierarchy for security and operational flexibility:

**Master Encryption Key (MEK)**:
- Stored in external Key Management Service (KMS) or Hardware Security Module (HSM)
- Never stored on disk with encrypted data
- Rotated infrequently (annually or when compromised)
- Examples: AWS KMS, Azure Key Vault, HashiCorp Vault, PKCS#11 HSM

**Data Encryption Keys (DEK)**:
- Generated per database/tablespace/file
- Encrypted with MEK and stored alongside encrypted data
- Rotated periodically for defense-in-depth
- Actual key used for encrypting data blocks

This architecture enables key rotation without re-encrypting the entire database—just re-encrypt the DEKs with the new MEK.

### Encryption Scope

TDE encrypts:
- **Data files**: Node storage, relationship storage, property storage
- **Index files**: All index structures (B-trees, HNSW graphs, etc.)
- **WAL (Write-Ahead Log)**: Transaction log files
- **Temporary files**: Sort buffers, intermediate query results
- **Backups**: Backup archives and snapshots

TDE does NOT encrypt:
- **Configuration files**: Database configuration (not sensitive data)
- **Logs**: Application logs (use separate log encryption if needed)
- **In-memory data**: Data in RAM (use encrypted memory for extreme security)
- **Query text**: GQL queries themselves (use TLS for query privacy)

### Encryption Algorithms

Geode supports industry-standard algorithms:

- **AES-256-GCM**: Recommended default (authenticated encryption, parallelizable)
- **AES-256-CBC**: Alternative for compatibility (requires separate HMAC for authentication)
- **ChaCha20-Poly1305**: Software-friendly alternative for systems without AES-NI

All algorithms use 256-bit keys meeting FIPS 140-2 requirements.

## How TDE Works in Geode

### Enabling TDE

Enable TDE when creating a new database:

```bash
# Generate or retrieve master encryption key from KMS
$ geode init --enable-tde \
  --kms-provider aws-kms \
  --kms-key-id arn:aws:kms:us-east-1:123456789:key/abc-def-123 \
  --encryption-algorithm aes-256-gcm
```

For existing databases, enable TDE through encryption conversion:

```bash
# Enable TDE on existing database (requires downtime)
$ geode convert-to-tde \
  --data-dir /var/lib/geode/data \
  --kms-provider vault \
  --kms-endpoint https://vault.example.com \
  --kms-token $VAULT_TOKEN
```

### Configuration

Configure TDE in `geode.yaml`:

```yaml
security:
  encryption:
    enabled: true
    algorithm: aes-256-gcm

    # Key Management Service configuration
    kms:
      provider: aws-kms  # aws-kms, azure-kv, gcp-kms, vault, pkcs11
      key_id: arn:aws:kms:us-east-1:123456789:key/abc-def-123
      region: us-east-1

    # DEK rotation policy
    dek_rotation:
      enabled: true
      interval_days: 90

    # Performance tuning
    cache_deks: true      # Cache decrypted DEKs in memory
    cache_size_mb: 128    # DEK cache size
```

### Key Management Integration

Geode integrates with enterprise key management systems:

**AWS KMS**:
```yaml
kms:
  provider: aws-kms
  key_id: arn:aws:kms:us-east-1:123456789:key/abc-def-123
  region: us-east-1
  credentials_profile: geode-production
```

**Azure Key Vault**:
```yaml
kms:
  provider: azure-kv
  vault_url: https://my-keyvault.vault.azure.net
  key_name: geode-master-key
  tenant_id: 12345-abcd-...
  client_id: 67890-efgh-...
```

**HashiCorp Vault**:
```yaml
kms:
  provider: vault
  endpoint: https://vault.example.com
  transit_mount: transit
  key_name: geode-mek
  token: $VAULT_TOKEN  # Or use AppRole, K8s auth
```

**PKCS#11 HSM**:
```yaml
kms:
  provider: pkcs11
  library_path: /usr/lib/softhsm/libsofthsm2.so
  slot_id: 0
  pin: $HSM_PIN
  key_label: geode-master-key
```

### Runtime Operations

TDE operates transparently:

```gql
-- Queries work exactly the same with TDE enabled
MATCH (p:Person {id: $userId})
SET p.last_login = datetime();

-- Application code doesn't change
INSERT (:Document {
  id: 'doc-123',
  title: 'Sensitive Data',
  content: 'This will be encrypted on disk automatically'
});
```

Encryption and decryption happen automatically in the storage layer.

## Use Cases

### Regulatory Compliance

Meet encryption requirements for regulated industries:

```yaml
# HIPAA-compliant TDE configuration
security:
  encryption:
    enabled: true
    algorithm: aes-256-gcm
    fips_mode: true  # Use FIPS 140-2 validated crypto

    kms:
      provider: aws-kms
      key_id: $HIPAA_COMPLIANT_KMS_KEY

    audit:
      log_key_access: true
      log_encryption_events: true
```

### Multi-Tenant SaaS

Isolate tenant data with per-tenant encryption:

```yaml
security:
  encryption:
    enabled: true
    per_tenant_keys: true  # Each tenant gets unique DEK

    kms:
      provider: vault
      endpoint: https://vault.example.com
```

Query with tenant context:

```gql
-- Tenant ID determines which DEK to use for decryption
SET SESSION tenant_id = 'tenant-abc-123';
MATCH (d:Document) RETURN d.content;
```

### Secure Cloud Deployments

Protect data from cloud provider access:

```bash
# Deploy to cloud with customer-managed keys
$ geode deploy \
  --cloud aws \
  --enable-tde \
  --kms-provider aws-kms \
  --customer-managed-key arn:aws:kms:us-east-1:MY_ACCOUNT:key/MY_KEY
```

Even cloud administrators cannot decrypt your data without your KMS key.

### Data Lifecycle Management

Securely retire old data:

```bash
# Crypto-shredding: Destroy encryption key to make data unrecoverable
$ geode retire-data \
  --tablespace archived_2023 \
  --method crypto-shred  # Delete DEK, data becomes permanently unreadable
```

Faster and more secure than deleting millions of records.

## Best Practices

### Key Management

1. **Use external KMS**: Never store MEK with encrypted data
   ```yaml
   # Good: MEK in AWS KMS
   kms:
     provider: aws-kms
     key_id: arn:aws:kms:...

   # Bad: MEK in config file
   # NEVER DO THIS
   encryption:
     master_key: "base64-encoded-key-here"  # Insecure!
   ```

2. **Rotate MEK annually**: Regular rotation limits exposure
   ```bash
   $ geode rotate-mek \
     --old-key-id arn:aws:kms:.../old-key \
     --new-key-id arn:aws:kms:.../new-key
   ```

3. **Rotate DEKs quarterly**: Defense-in-depth
   ```yaml
   dek_rotation:
     enabled: true
     interval_days: 90
   ```

4. **Backup keys separately**: Store key backups in different location than data backups

### Performance Optimization

1. **Enable hardware acceleration**: Use AES-NI when available
   ```bash
   # Verify AES-NI support
   $ grep -o aes /proc/cpuinfo | wc -l
   # If > 0, AES-NI is available
   ```

2. **Cache DEKs**: Reduce KMS roundtrips
   ```yaml
   encryption:
     cache_deks: true
     cache_size_mb: 256  # Larger cache for more tablespaces
   ```

3. **Use AES-GCM**: Faster than AES-CBC (parallel encryption)
   ```yaml
   encryption:
     algorithm: aes-256-gcm  # Recommended
   ```

4. **Benchmark impact**: Measure before deploying
   ```bash
   $ geode benchmark --with-tde --without-tde
   # Expect < 5% overhead with AES-NI
   ```

### Operational Security

1. **Principle of least privilege**: Limit KMS key access
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Principal": {"AWS": "arn:aws:iam::123:role/geode-prod"},
       "Action": ["kms:Decrypt", "kms:DescribeKey"],
       "Resource": "*"
     }]
   }
   ```

2. **Enable audit logging**: Track all key usage
   ```yaml
   audit:
     log_key_access: true
     log_to: /var/log/geode/tde-audit.log
   ```

3. **Test disaster recovery**: Practice key recovery procedures
   ```bash
   # Test MEK recovery from backup
   $ geode recover-mek \
     --backup-location s3://backup-bucket/mek-backup.enc \
     --recovery-key $RECOVERY_PASSPHRASE
   ```

## Performance Characteristics

### Throughput Impact

Typical overhead with AES-NI:

- **Read throughput**: 2-5% slower
- **Write throughput**: 3-7% slower
- **CPU usage**: +10-15%
- **Memory usage**: Minimal (DEK cache: 128-256 MB)

Without AES-NI (software AES):

- **Read throughput**: 15-25% slower
- **Write throughput**: 20-30% slower
- **CPU usage**: +50-100%

### Latency Impact

Typical latency overhead:

- **Query latency**: +0.5-2ms per query
- **Write latency**: +1-3ms per transaction
- **Startup time**: +5-30 seconds (DEK loading)

## Monitoring and Troubleshooting

### Monitoring

Track TDE health:

```gql
-- Check encryption status
CALL dbms.security.encryption.status()
YIELD enabled, algorithm, kms_provider, dek_count, last_rotation
RETURN enabled, algorithm, kms_provider, dek_count, last_rotation;

-- Monitor key access
CALL dbms.security.encryption.audit()
YIELD timestamp, operation, key_id, success, error
WHERE success = false
RETURN timestamp, operation, key_id, error;

-- Performance metrics
CALL dbms.monitor.encryption.stats()
YIELD encrypt_ops_per_sec, decrypt_ops_per_sec, avg_latency_ms
RETURN encrypt_ops_per_sec, decrypt_ops_per_sec, avg_latency_ms;
```

### Common Issues

**KMS unavailable**:
- **Symptom**: Cannot start database, "Failed to retrieve MEK"
- **Cause**: KMS service unreachable
- **Solution**: Verify network connectivity, check KMS service status, use cached DEKs (if enabled)

**Performance degradation**:
- **Symptom**: Slow queries after enabling TDE
- **Cause**: Missing AES-NI support or software encryption
- **Solution**: Verify AES-NI availability, consider hardware upgrade

**Key rotation failures**:
- **Symptom**: DEK rotation fails
- **Cause**: Insufficient KMS permissions
- **Solution**: Grant required KMS permissions (GenerateDataKey, Decrypt)

## Related Topics

- [Field-Level Encryption (FLE)](/tags/fle/) - Encrypt specific sensitive fields
- [Security](/tags/security/) - Overall security features
- [Encryption](/tags/encryption/) - Encryption capabilities
- [Compliance](/tags/compliance/) - Regulatory compliance
- [Authentication](/tags/authentication/) - Access control
- [Audit Logging](/tags/audit-logging/) - Security audit trails

## Further Reading

- [Security Guide](/docs/security/) - Complete security documentation
- [Encryption Best Practices](/docs/encryption-best-practices/) - Detailed recommendations
- [Key Management](/docs/key-management/) - KMS integration guide
- [Compliance](/docs/compliance/) - Regulatory compliance guides
- [Performance Tuning](/docs/performance-tuning/) - TDE performance optimization

Geode's Transparent Data Encryption provides enterprise-grade protection for data at rest with minimal performance overhead and zero application changes—essential for regulated industries and security-conscious deployments.
