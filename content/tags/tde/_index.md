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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

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
CALL tde.get_encryption_status()
YIELD enabled, encrypted_tables, encryption_algorithm
RETURN enabled, encrypted_tables, encryption_algorithm;

-- Where key rotation stands
CALL tde.get_rotation_state()
YIELD current_generation, last_rotation_time, rotation_in_progress, scheduled_rotation
RETURN current_generation, last_rotation_time, rotation_in_progress, scheduled_rotation;

-- Encryption overhead against an unencrypted baseline
CALL tde.measure_overhead()
YIELD baseline_ops_per_sec, encrypted_ops_per_sec, overhead_percentage, passes_threshold
RETURN baseline_ops_per_sec, encrypted_ops_per_sec, overhead_percentage, passes_threshold;
```

Key-access events go to the audit trail rather than a dedicated encryption-audit
procedure — there is no `dbms.security.encryption.*` or `dbms.monitor.*`
namespace:

```gql
CALL audit.get_recent_events(100)
YIELD event_id, timestamp, category, action, outcome
RETURN timestamp, category, action, outcome
ORDER BY timestamp DESC;
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

## TDE Implementation Patterns

### Multi-Tenant Key Isolation

Isolate tenant data with separate encryption keys:

```yaml
# geode.yaml
security:
  encryption:
    enabled: true
    per_tenant_keys: true
    tenant_key_mapping:
      tenant-123:
        kms_key_id: arn:aws:kms:us-east-1:111:key/tenant-123-key
      tenant-456:
        kms_key_id: arn:aws:kms:us-east-1:111:key/tenant-456-key
```

Query with tenant context:

```gql
-- Set tenant context for session
SET SESSION tenant_id = 'tenant-123';

-- Geode automatically uses tenant-123's DEK for decryption
MATCH (d:Document) WHERE d.category = 'financial'
RETURN d.title, d.content;
```

Each tenant's data is encrypted with their unique key, preventing cross-tenant data access even if database is compromised.

### Tablespace-Level Encryption

Encrypt different tablespaces with different keys:

```gql
-- Create encrypted tablespace for sensitive data
CREATE TABLESPACE sensitive_data
LOCATION '/var/lib/geode/tablespaces/sensitive'
WITH (encryption = 'aes-256-gcm', kms_key_id = 'high-security-key');

-- Create encrypted tablespace for regular data
CREATE TABLESPACE regular_data
LOCATION '/var/lib/geode/tablespaces/regular'
WITH (encryption = 'aes-256-gcm', kms_key_id = 'standard-security-key');

-- Assign graphs to tablespaces
CREATE GRAPH financial_data TABLESPACE sensitive_data;
CREATE GRAPH analytics_data TABLESPACE regular_data;
```

Benefits: Different security levels, independent key rotation, compliance segmentation.

### Key Rotation Without Downtime

Rotate encryption keys while database remains online:

Rotation is driven by the `tde.*` procedures, not a `geode admin` subcommand
(there is no `admin` subcommand):

```gql
-- Rotate now
CALL tde.rotate_keys()
YIELD success, keys_rotated, new_master_key_id
RETURN success, keys_rotated, new_master_key_id;

-- Or install a schedule
CALL tde.configure_rotation('scheduled', 8760)
YIELD status, next_rotation_time
RETURN status, next_rotation_time;

-- Watch progress
CALL tde.get_rotation_state()
YIELD current_generation, last_rotation_time, rotation_in_progress, scheduled_rotation
RETURN current_generation, last_rotation_time, rotation_in_progress, scheduled_rotation;
```

Online rotation process:

1. New DEKs created with new MEK
2. Background process re-encrypts old DEKs with new MEK
3. Newly written data uses new DEKs
4. Old data gradually re-encrypted during maintenance windows
5. Rollback possible until 100% complete

### Hardware Security Module (HSM) Integration

Use hardware-backed key storage for maximum security:

```yaml
# geode.yaml with PKCS#11 HSM
security:
  encryption:
    enabled: true
    algorithm: aes-256-gcm

    kms:
      provider: pkcs11
      library_path: /usr/lib/softhsm/libsofthsm2.so
      slot_id: 0
      pin_file: /secure/hsm_pin
      key_label: geode-master-encryption-key

      # HSM-specific settings
      use_hsm_crypto: true  # Use HSM for encrypt/decrypt operations
      cache_deks_in_hsm: true  # Store DEKs in HSM memory
```

Initialize HSM key:

```bash
# Initialize HSM slot
softhsm2-util --init-token --slot 0 --label "geode-hsm"

# Generate master key in HSM
pkcs11-tool --module /usr/lib/softhsm/libsofthsm2.so \
    --login --keypairgen --key-type AES:32 \
    --label geode-master-encryption-key
```

### Encryption Performance Optimization

Optimize TDE for your hardware:

```yaml
# geode.yaml performance tuning
security:
  encryption:
    enabled: true
    algorithm: aes-256-gcm

    # Performance optimizations
    use_aes_ni: true  # Use hardware AES acceleration
    cache_deks: true
    dek_cache_size_mb: 512  # Large cache for many tablespaces
    dek_cache_ttl_seconds: 3600

    # Parallelization
    encrypt_threads: 8  # Parallel encryption for writes
    decrypt_threads: 16  # Parallel decryption for reads

    # Batching
    encryption_batch_size: 128  # Pages to encrypt in batch
```

Benchmark configuration:

```bash
# Test read performance with TDE
geode benchmark read \
    --queries=1000000 \
    --threads=32 \
    --with-tde \
    --output=tde-read-results.json

# Test write performance
geode benchmark write \
    --inserts=1000000 \
    --threads=32 \
    --with-tde \
    --output=tde-write-results.json

# Compare with non-encrypted baseline
geode benchmark read --queries=1000000 --threads=32 --without-tde
```

Typical results with AES-NI:

- Read overhead: 2-4%
- Write overhead: 4-8%
- CPU increase: 10-15%

### Compliance Audit Trail

Generate TDE compliance reports:

```gql
-- Confirm encryption is on and which algorithm is in use
CALL tde.get_encryption_status()
YIELD enabled, encrypted_tables, encryption_algorithm
RETURN enabled, encrypted_tables, encryption_algorithm;

-- Prove no page still holds plaintext
CALL tde.verify_no_plaintext()
YIELD verified, pages_scanned, violations
RETURN verified, pages_scanned, violations;

-- Prove no key material is stored in the clear
CALL tde.audit_plaintext_keys()
YIELD plaintext_keys_found, encrypted_keys_count, security_violation
RETURN plaintext_keys_found, encrypted_keys_count, security_violation;

-- Write a signed manifest of the key hierarchy for the auditor
CALL tde.generate_key_manifest()
YIELD success, manifest_path, keys_included
RETURN success, manifest_path, keys_included;

-- Key access events come from the audit trail
CALL audit.get_recent_events(500)
YIELD event_id, timestamp, category, action, outcome
RETURN timestamp, category, action, outcome
ORDER BY timestamp DESC;
```

There is no per-tablespace encryption report and no key listing procedure:
Geode encrypts the whole store rather than individual tablespaces, and key
material is never enumerated to clients.

Export for compliance reporting:

```python
def generate_tde_compliance_report():
    """Generate quarterly TDE compliance report"""
    report = {
        'period': f"Q{datetime.now().quarter} {datetime.now().year}",
        'encryption_status': {},
        'key_management': {},
        'access_audit': {}
    }

    # Verify encryption is enabled and no plaintext remains
    result = db.execute("""
        CALL tde.verify_no_plaintext()
        YIELD verified, pages_scanned, violations
        RETURN verified, pages_scanned, violations
    """)

    row = result.rows[0]
    report['encryption_status'] = {
        'verified': row['verified'],
        'pages_scanned': row['pages_scanned'],
        'violations': row['violations'],
    }

    # Verify key rotation compliance
    result = db.execute("""
        CALL tde.get_rotation_state()
        YIELD current_generation, last_rotation_time, rotation_in_progress
        RETURN current_generation, last_rotation_time, rotation_in_progress
    """)

    row = result.rows[0]
    last_rotation = datetime.fromisoformat(row['last_rotation_time'])
    days_since_rotation = (datetime.now() - last_rotation).days
    report['key_management'] = {
        'generation': row['current_generation'],
        'age_days': days_since_rotation,
        'compliant': days_since_rotation < 365,  # Annual rotation required
    }

    return report
```

### Crypto-Shredding for Data Deletion

Implement cryptographic erasure for secure data deletion:

Crypto-shredding in Geode is **whole-store**, not per-tablespace: there is no
`dbms.security.cryptoShred` procedure and no per-tablespace DEK to destroy. The
key-destruction surface is the TDE key hierarchy itself:

```gql
-- Wipe live key material from memory
CALL tde.zeroize_keys()
YIELD success, keys_cleared, memory_wiped
RETURN success, keys_cleared, memory_wiped;

-- Tear down the derived key hierarchy
CALL tde.cleanup_key_hierarchy()
YIELD keys_zeroized, hierarchy_cleared
RETURN keys_zeroized, hierarchy_cleared;
```

For per-record erasure ("right to be forgotten") use
[field-level encryption](/docs/security/field-level-encryption/), where each
field is encrypted under a key you can retire independently, or delete the
records outright with `DETACH DELETE`. Destroying the TDE master key renders
the **entire** store unrecoverable, which is a disposal operation, not a
selective one.

### TDE Disaster Recovery

Backup encryption keys securely:

```gql
-- Write a key manifest alongside the backup (references, not key material)
CALL tde.generate_key_manifest()
YIELD success, manifest_path, keys_included
RETURN success, manifest_path, keys_included;
```

The manifest records key identifiers and hierarchy metadata. The key material
itself stays in the KMS: disaster recovery restores *access* to the keys, not
the keys themselves.

Recover a TDE-encrypted database:

```bash
# Step 1: Start the server with TDE enabled
geode serve --data-dir /var/lib/geode --enable-tde --tde-provider aws-kms

# Step 2: Restore the backup into it
geode restore /backups/geode-full-20260124.backup --yes
```

```gql
-- Step 3: Point the server at the KMS and confirm it can wrap/unwrap
CALL tde.configure_external_kms('https://kms.us-east-1.amazonaws.com', 'us-east-1')
YIELD status, endpoint, connection_verified
RETURN status, endpoint, connection_verified;

CALL tde.test_kms_wrap_unwrap()
YIELD wrap_success, unwrap_success, roundtrip_verified, latency_ms
RETURN wrap_success, unwrap_success, roundtrip_verified, latency_ms;

-- Step 4: Confirm the restored store decrypts
CALL tde.get_encryption_status()
YIELD enabled, encrypted_tables, encryption_algorithm
RETURN enabled, encrypted_tables, encryption_algorithm;
```

## TDE Monitoring and Alerting

Set up monitoring for encryption health:

The server exposes no `geode_tde_*` Prometheus metrics — the registered set is
the ten process-level metrics documented in the
[statistics reference](/docs/reference/statistics/). Monitor TDE by polling the
procedures on a schedule and alerting on their output:

```bash
#!/bin/bash
# /usr/local/bin/geode-tde-check.sh — run from cron, alert on non-zero exit
set -euo pipefail

geode query "CALL tde.get_encryption_status() YIELD enabled RETURN enabled" \
  | grep -q true || { echo "TDE not enabled"; exit 1; }

geode query "CALL tde.test_kms_wrap_unwrap() YIELD roundtrip_verified RETURN roundtrip_verified" \
  | grep -q true || { echo "KMS wrap/unwrap failed"; exit 1; }

geode query "CALL tde.audit_plaintext_keys() YIELD security_violation RETURN security_violation" \
  | grep -q false || { echo "Plaintext key material detected"; exit 1; }
```

Rotation age comes from `tde.get_rotation_state()`'s `last_rotation_time`;
compare it against your policy window in the same script.

## Related Topics

- **[Field-Level Encryption (FLE)](/tags/fle/)**: Encrypt specific sensitive fields
- **[Security](/tags/security/)**: Overall security features
- **[Encryption](/tags/encryption/)**: Encryption capabilities
- **[Compliance](/tags/compliance/)**: Regulatory compliance
- **[Authentication](/tags/authentication/)**: Access control
- **[Audit Logging](/tags/audit-logging/)**: Security audit trails
- **[Backup](/tags/backup/)**: Encrypted backup strategies

## Further Reading

- **[Security Guide](/docs/security/)**: Complete security documentation
- **[KMS Integration](/docs/security/kms-integration/)**: Key management service integration
- **[Performance Tuning](/docs/query/performance-tuning/)**: TDE performance optimization
- **[Disaster Recovery](/docs/operations/disaster-recovery/)**: TDE-encrypted backup recovery

Geode's Transparent Data Encryption provides enterprise-grade protection for data at rest with minimal performance overhead and zero application changes—essential for regulated industries and security-conscious deployments.
