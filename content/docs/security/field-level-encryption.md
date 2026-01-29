---
title: "Field-Level Encryption Guide"
description: "Comprehensive guide to Geode's native field-level encryption: transparent encryption, searchable encrypted fields, key rotation, and RBAC-gated plaintext access"
url: /docs/security/field-level-encryption/
keywords: ["field-level encryption", "FLE", "AES-256-GCM", "ChaCha20-Poly1305", "blind index", "key rotation", "AEAD", "data encryption", "PII protection"]
weight: 45
slug: "field-level-encryption"
canonical: "https://geodedb.com/docs/security/field-level-encryption/"
---

<!-- CANARY: REQ=REQ-SEC-AUDIT-LOG-001; FEATURE="Security"; ASPECT=AuditLog; STATUS=TESTED; OWNER=security; UPDATED=2026-01-16 -->

# Field-Level Encryption Guide

Geode provides native, application-level field-level encryption (FLE) with transparent encryption/decryption, equality search on encrypted fields, and online key rotation.

## Overview

### What is Field-Level Encryption?

Field-Level Encryption allows you to encrypt specific sensitive fields in your graph database while keeping the rest of the data in plaintext. This provides:

- **Selective Protection**: Encrypt only PII, PHI, or other sensitive data
- **Transparent Access**: Authorized users see plaintext automatically
- **Searchable Encryption**: Equality queries on encrypted fields via blind indexes
- **Key Rotation**: Online re-encryption with zero downtime
- **RBAC Integration**: Role-based access to plaintext values

### Key Features

- ✅ **AEAD Encryption**: AES-256-GCM (hardware-accelerated) or ChaCha20-Poly1305
- ✅ **Blind Indexes**: Equality search without decryption
- ✅ **Hierarchical Keys**: Multi-layer key derivation (TRK → SK → FEK → BIK)
- ✅ **Online Rotation**: Zero-downtime key rotation with background re-encryption
- ✅ **RBAC Gates**: Fine-grained access control to plaintext
- ✅ **Audit Trail**: Complete encryption/decryption audit logs

## Architecture

### Key Hierarchy

Geode uses a four-level key hierarchy for maximum security and flexibility:

```
Master Key (Environment/KMS)
 └─ TRK (Tenant Root Key)
     └─ SK (Schema Key, per tenant+schema)
         ├─ FEK (Field Encryption Key, per field+version)
         └─ BIK (Blind Index Key, for searchable fields)
```

**Key Derivation**: HKDF-SHA256 with context strings ensures cryptographic separation.

### Encryption Algorithms

| Algorithm | Use Case | Performance Notes | Platform |
|-----------|----------|-------------------|----------|
| **AES-256-GCM** | Default for AES-NI hardware | Hardware-accelerated | x86-64, ARM with AES support |
| **ChaCha20-Poly1305** | Fallback for non-AES platforms | Constant-time | All platforms |

Both algorithms provide **authenticated encryption with associated data (AEAD)**, protecting against tampering and context-swapping attacks.

### Envelope Format

Encrypted fields are stored as binary envelopes:

```
[alg:u8][version:u16][nonce:12][tag:16][ciphertext_len:u32][ciphertext]
```

- **Algorithm ID**: 1=AES-256-GCM, 2=ChaCha20-Poly1305
- **Key Version**: For rotation tracking
- **Nonce**: 96-bit unique value
- **Tag**: 128-bit authentication tag
- **Ciphertext**: Encrypted field value

### Blind Indexes for Search

For searchable encrypted fields, Geode maintains a blind index:

```
BI = HMAC-SHA256(BIK, normalize(plaintext))
```

**Normalization**: ASCII lowercase + whitespace trim

This allows equality searches (`WHERE email = 'alice@example.com'`) on encrypted fields without decryption.

**Trade-off**: Reveals equality patterns (same plaintext → same BI) and value frequency.

## Getting Started

### Prerequisites

- Geode 0.18.0+
- Understanding of your data classification requirements
- RBAC/roles configured for your users

### Quick Start Example

```gql
-- 1. Create node type with encrypted fields
CREATE NODE TYPE Customer (
  id UUID PRIMARY KEY,
  name STRING,
  email STRING
    @encrypted(alg:"AES-256-GCM")
    @searchable(index:"blind-hmac-sha256")
    @classify(tags:["PII"]),
  ssn STRING
    @encrypted(alg:"AES-256-GCM")
    @classify(tags:["PII", "Restricted"])
    @visible(to_roles:["compliance_officer"]),
  credit_score INT
);

-- 2. Insert data (encryption happens automatically)
CREATE (:Customer {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  ssn: '123-45-6789',
  credit_score: 720
});

-- 3. Query with automatic decryption (for authorized users)
MATCH (c:Customer {email: 'alice@example.com'})
RETURN c.name, c.email, c.ssn;
-- Authorized user sees plaintext
-- Unauthorized user sees "[REDACTED]" for ssn
```

## Schema Annotations

Geode extends GQL with field-level encryption annotations (non-standard, Geode-specific):

### @encrypted

Enable encryption for a field:

```gql
@encrypted(alg:"AES-256-GCM", key_scope:"field", rotate:"90d")
```

**Parameters**:
- `alg`: "AES-256-GCM" (default) or "CHACHA20-POLY1305"
- `key_scope`: "field" (per-field key) or "schema" (shared schema key)
- `rotate`: Optional rotation interval hint (e.g., "90d", "1y")

### @searchable

Enable equality search via blind index:

```gql
@searchable(index:"blind-hmac-sha256")
```

**Parameters**:
- `index`: "blind-hmac-sha256" (only supported option)

**Use case**: Email addresses, usernames, account IDs

**Security note**: Reveals equality patterns and frequency distribution.

### @visible

RBAC gate for plaintext access:

```gql
@visible(to_roles:["admin", "compliance_officer"])
```

**Parameters**:
- `to_roles`: List of roles permitted to see plaintext

Users without these roles see `"[REDACTED]"` or ciphertext.

### @classify

Sensitivity classification tags:

```gql
@classify(tags:["PII", "PHI", "Restricted"])
```

**Parameters**:
- `tags`: Classification labels for audit and compliance

## Common Use Cases

### Use Case 1: Healthcare - Patient Records

```gql
CREATE NODE TYPE Patient (
  patient_id UUID PRIMARY KEY,
  name STRING,
  date_of_birth DATE
    @encrypted(alg:"AES-256-GCM")
    @classify(tags:["PHI", "Sensitive"]),
  ssn STRING
    @encrypted(alg:"AES-256-GCM")
    @classify(tags:["PHI", "Restricted"])
    @visible(to_roles:["physician", "compliance"]),
  medical_record_number STRING
    @encrypted(alg:"AES-256-GCM")
    @searchable(index:"blind-hmac-sha256")
    @classify(tags:["PHI"]),
  diagnosis STRING
    @encrypted(alg:"AES-256-GCM")
    @classify(tags:["PHI"])
    @visible(to_roles:["physician", "nurse"])
);
```

**Access control**:
- Physicians: See all PHI fields
- Nurses: See diagnosis, not SSN
- Billing staff: Search by MRN, see redacted diagnosis

### Use Case 2: Finance - Customer Data

```gql
CREATE NODE TYPE Account (
  account_id UUID PRIMARY KEY,
  customer_name STRING,
  account_number STRING
    @encrypted(alg:"AES-256-GCM")
    @searchable(index:"blind-hmac-sha256")
    @classify(tags:["PII", "PCI"]),
  routing_number STRING
    @encrypted(alg:"AES-256-GCM")
    @classify(tags:["PCI"]),
  balance DECIMAL,
  credit_card_number STRING
    @encrypted(alg:"AES-256-GCM")
    @classify(tags:["PCI-DSS", "Restricted"])
    @visible(to_roles:["fraud_analyst", "compliance"])
);
```

### Use Case 3: E-commerce - User Profiles

```gql
CREATE NODE TYPE User (
  user_id UUID PRIMARY KEY,
  username STRING
    @searchable(index:"blind-hmac-sha256"),
  email STRING
    @encrypted(alg:"AES-256-GCM")
    @searchable(index:"blind-hmac-sha256")
    @classify(tags:["PII"]),
  phone STRING
    @encrypted(alg:"AES-256-GCM")
    @classify(tags:["PII"])
    @visible(to_roles:["customer_service", "admin"]),
  shipping_address STRING
    @encrypted(alg:"AES-256-GCM")
    @classify(tags:["PII"]),
  preferences OBJECT  -- Not encrypted
);
```

## Query Operations

### Inserting Data

```gql
-- Encryption happens automatically
CREATE (:Customer {
  id: gen_uuid(),
  name: 'Bob Smith',
  email: 'bob@example.com',
  ssn: '987-65-4321'
});
```

**What happens**:
1. Geode detects `@encrypted` annotation on `email` and `ssn`
2. Generates unique nonce
3. Encrypts values with appropriate FEK
4. Computes blind index for `email` (if `@searchable`)
5. Stores encrypted envelope

### Querying Encrypted Fields

**Equality search** (requires `@searchable`):
```gql
MATCH (c:Customer {email: 'alice@example.com'})
RETURN c.name, c.email;
```

**What happens**:
1. Geode computes blind index: `BI = HMAC(BIK, 'alice@example.com')`
2. Looks up records with matching BI
3. For authorized users, decrypts `email` field
4. Returns plaintext to authorized users, `"[REDACTED]"` to others

**Non-searchable fields**:
```gql
-- ERROR: Cannot filter on non-searchable encrypted field
MATCH (c:Customer)
WHERE c.ssn = '123-45-6789'
RETURN c.name;
```

### Explicit Projection Control

```gql
-- Force plaintext (requires READ_PLAINTEXT privilege)
RETURN PLAINTEXT(c.ssn);

-- Force ciphertext (always allowed if node readable)
RETURN CIPHERTEXT(c.ssn);
```

## Access Control

### Granting Plaintext Access

```bash
# Grant role access to plaintext
GRANT READ_PLAINTEXT ON Customer.ssn TO ROLE compliance_officer;

# Revoke access
REVOKE READ_PLAINTEXT ON Customer.ssn FROM ROLE analyst;
```

### Permissions Model

| Permission | Description |
|------------|-------------|
| `READ_PLAINTEXT(schema.field)` | View decrypted value |
| `READ_CIPHERTEXT(schema.field)` | View ciphertext (always granted if node readable) |
| `WRITE(schema.field)` | Set value (automatically encrypted) |

### Example Access Matrix

| Role | `Customer.name` | `Customer.email` | `Customer.ssn` |
|------|----------------|------------------|----------------|
| `customer_service` | Plaintext | Plaintext | `[REDACTED]` |
| `compliance_officer` | Plaintext | Plaintext | Plaintext |
| `analyst` | Plaintext | `[REDACTED]` | `[REDACTED]` |

## Key Rotation

### Why Rotate Keys?

- **Compliance**: Regulatory requirements (PCI-DSS, HIPAA)
- **Security**: Limit blast radius of key compromise
- **Best Practice**: Regular rotation reduces cryptographic exposure

### Online Rotation Process

```bash
# Rotate field encryption key (FEK)
geode key rotate --tenant default --schema Customer --field ssn --scope FEK

# Check rotation status
geode show rotation-status --tenant default

# Background re-encryption progress
# Records migrated: 12,450 / 50,000 (24.9%)
# Estimated completion: 2h 15m
```

**How it works**:
1. **Create new key version** (vN+1)
2. **New writes** use vN+1 immediately
3. **Background migration** re-encrypts existing records
4. **Mixed-version reads** supported during migration
5. **Opportunistic re-encryption** on reads

### Rotation Scopes

| Scope | Impact | Downtime | Use Case |
|-------|--------|----------|----------|
| **FEK** | Re-encrypts field data | None | Regular rotation (90d-1y) |
| **SK** | Rewraps FEKs (no data change) | None | Schema key compromise |
| **TRK** | Rewraps all keys | None | Tenant key compromise |

### Rotation Best Practices

1. **Schedule regular rotations**: 90 days for PII, 365 days for less sensitive
2. **Monitor progress**: Check migration status regularly
3. **Plan for load**: Background re-encryption consumes I/O
4. **Test in staging**: Verify rotation process before production
5. **Audit rotation**: Log all key rotation events

## Migrating Existing Data

### Scenario: Adding Encryption to Existing Schema

```gql
-- 1. Alter schema to add encryption
ALTER NODE TYPE Customer ALTER PROPERTY ssn
  SET @encrypted(alg:"AES-256-GCM")
  SET @classify(tags:["PII", "Restricted"])
  SET @visible(to_roles:["compliance_officer"]);

-- 2. New writes are encrypted immediately
-- 3. Existing plaintext data remains until migration
```

### Running Migration

```bash
# Encrypt existing plaintext data
geode migrate encrypt \
  --tenant default \
  --field Customer.ssn \
  --batch 1000 \
  --progress

# Output:
# Encrypting Customer.ssn...
# Batch 1: 1000/50000 (2.0%) - 1.2s
# Batch 2: 2000/50000 (4.0%) - 1.1s
# ...
# Complete: 50000/50000 (100%) - 62.5s
```

**Migration features**:
- **Resumable**: Can restart after failure
- **Batched**: Processes records in configurable batches
- **Progress tracking**: Real-time migration status
- **Zero downtime**: Reads continue during migration

### Access During Migration

| User Role | Before Migration | During Migration | After Migration |
|-----------|-----------------|------------------|-----------------|
| Authorized | Plaintext | Plaintext (auto-decrypt) | Plaintext |
| Unauthorized | Plaintext | `[REDACTED]` | `[REDACTED]` |

## Performance

### Benchmarks

| Operation | Expected Behavior |
|-----------|-------------------|
| Encrypt field (AES-256-GCM) | Microsecond-scale overhead |
| Decrypt field (cache hit) | Microsecond-scale overhead |
| Blind index computation | Microsecond-scale overhead |
| Key cache lookup | Microsecond-scale overhead |

**Hardware**: x86-64 with AES-NI, 4-core CPU

### Optimization Tips

1. **Selective encryption**: Only encrypt truly sensitive fields
2. **Key caching**: KeyManager maintains LRU cache (95%+ hit rate)
3. **Batch operations**: Encrypt/decrypt multiple fields in parallel
4. **Hardware acceleration**: AES-NI auto-detected and used
5. **Searchable sparingly**: Blind indexes add 30-50% overhead

### Monitoring

```bash
# Check key cache performance
geode stats key-cache

# Output:
# Key Cache Statistics:
#   Hits: 125,340
#   Misses: 5,612
#   Hit Rate: 95.7%
#   Evictions: 234
```

## Security Considerations

### Threat Model

**Protected Against**:
- ✅ Data breach (ciphertext without keys)
- ✅ Ciphertext tampering (authenticated encryption)
- ✅ Context-swapping attacks (AAD binding)
- ✅ Unauthorized plaintext access (RBAC gates)
- ✅ Plaintext in logs (never logged)

**Not Protected Against**:
- ❌ Master key compromise
- ❌ Frequency analysis (blind indexes)
- ❌ Access pattern leakage
- ❌ Memory attacks (cold boot)

### Best Practices

**Key Management**:
- Store master keys in KMS (AWS KMS, Vault, Azure Key Vault)
- Rotate keys regularly (FEK: 90d, TRK: 1y)
- Separate tenant keys
- Monitor key access

**Access Control**:
- Principle of least privilege
- Regular access reviews
- Audit all READ_PLAINTEXT grants
- MFA for sensitive role assignment

**Operational**:
- Never log plaintext or keys
- Secure memory cleanup (`secureZero`)
- Monitor encryption/decryption rates
- Alert on unusual access patterns

### Compliance Alignment

| Standard | Requirement | Geode Support |
|----------|-------------|---------------|
| **GDPR** | Encryption at rest | ✅ FLE with AEAD |
| **GDPR** | Right to erasure | ✅ Key destruction |
| **HIPAA** | PHI encryption | ✅ AES-256-GCM |
| **HIPAA** | Access controls | ✅ RBAC gates |
| **PCI-DSS** | Cardholder data encryption | ✅ Field-level encryption |
| **PCI-DSS** | Key rotation | ✅ Online rotation |
| **SOC 2** | Confidentiality controls | ✅ Encryption + audit |

## Troubleshooting

### Issue: Permission Denied on Query

**Error**:
```
Error: SearchNotPermitted - Cannot filter on encrypted field 'ssn'
```

**Causes**:
1. Field not marked `@searchable`
2. User lacks `READ_PLAINTEXT` privilege

**Solutions**:
```gql
-- Option 1: Make field searchable (if appropriate)
ALTER NODE TYPE Customer ALTER PROPERTY ssn
  SET @searchable(index:"blind-hmac-sha256");

-- Option 2: Grant user access
GRANT READ_PLAINTEXT ON Customer.ssn TO ROLE analyst;
```

### Issue: Decryption Failures

**Error**:
```
Error: AuthenticationFailed - AEAD tag verification failed
```

**Causes**:
1. Corrupted ciphertext
2. Wrong key used
3. AAD mismatch

**Solutions**:
```bash
# Check key version consistency
geode verify encryption --tenant default --schema Customer --field ssn

# Re-encrypt if needed
geode key rotate --tenant default --schema Customer --field ssn --scope FEK --force
```

### Issue: Slow Query Performance

**Symptom**: Queries on encrypted fields are slow

**Diagnosis**:
```bash
# Check cache hit rate
geode stats key-cache

# Profile query
PROFILE MATCH (c:Customer {email: 'alice@example.com'}) RETURN c;
```

**Solutions**:
1. Ensure blind indexes are created
2. Increase key cache size
3. Review access patterns
4. Consider hardware acceleration

## Advanced Topics

### Custom Key Providers

```zig
// Implement custom KMS integration
const CustomKMSProvider = struct {
    pub fn deriveKey(context: []const u8) ![]u8 {
        // Call external KMS
    }
};
```

### Streaming Large Fields

For fields >64KB:
```zig
// Use streaming encryption
const encrypted_stream = try aead.encryptStream(plaintext_reader, fek);
```

### Post-Quantum Cryptography

Future support for PQC:
- Kyber for key wrapping
- Dilithium for signatures
- CRYSTALS suite integration

## Next Steps

- [KMS Integration](/docs/security/kms-integration/) - External key management
- [Security Overview](/docs/security/overview/) - Complete security architecture
- [Authorization Guide](/docs/security/authorization/) - Role-based access control
- [Audit Logging](/docs/ops/audit-logging/) - Encryption audit trail
- [Server Configuration](/docs/configuration/server-configuration/) - Encryption settings

## References

- [NIST SP 800-38D](https://csrc.nist.gov/publications/detail/sp/800-38d/final) - GCM specification
- [NIST SP 800-57](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final) - Key management
- [RFC 5869](https://datatracker.ietf.org/doc/html/rfc5869) - HKDF specification
- [ISO/IEC 39075:2024](https://www.iso.org/standard/76120.html) - GQL standard

---

**License**: Apache License 2.0
**Copyright**: 2024-2025 CodePros
**Last Updated**: January 2026
