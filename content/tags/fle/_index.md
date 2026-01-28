---
title: "Tag: Field-Level Encryption (FLE)"
description: "Explore Geode documentation tagged with fle. Learn about fle features, best practices, and implementation details."
keywords:
  - fle
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/fle/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Documentation tagged with **Field-Level Encryption (FLE)** in the Geode graph database. FLE provides application-level encryption for specific sensitive fields, ensuring that confidential data like credit cards, SSNs, and health records remain encrypted even from database administrators.

## Introduction to Field-Level Encryption

Field-Level Encryption (FLE) is a selective encryption technique that protects specific sensitive properties while leaving other data unencrypted for querying and indexing. Unlike Transparent Data Encryption (TDE) which encrypts all data at rest, FLE provides granular control—you choose exactly which fields to encrypt based on sensitivity and compliance requirements.

FLE addresses the zero-trust security model: even if an attacker gains database access (through compromised credentials, SQL injection, or insider threats), encrypted fields remain protected. Only applications with the correct encryption keys can decrypt the data.

Key differences from TDE:

- **TDE**: Encrypts all data on disk, transparent to queries, protects against physical theft
- **FLE**: Encrypts specific fields, requires application awareness, protects against database compromise

FLE is essential for:

- **PCI-DSS compliance**: Credit card data must be encrypted
- **HIPAA compliance**: Protected Health Information (PHI) requires encryption
- **GDPR compliance**: Personal data should be encrypted when possible
- **Zero-trust architecture**: Minimize trust in database layer
- **Multi-tenant isolation**: Ensure tenants can't access each other's sensitive data

Geode's FLE implementation provides:
- Client-side encryption (data encrypted before reaching database)
- Deterministic and randomized encryption modes
- Queryable encryption for deterministic fields
- Automatic key rotation
- Integration with Key Management Systems (KMS)

## Core FLE Concepts

### Encryption Modes

FLE supports two encryption modes with different trade-offs:

**Deterministic Encryption**:
- Same plaintext always produces same ciphertext
- Enables equality queries (WHERE ssn = $encrypted_value)
- Reveals when two records have the same value
- Use for: Fields requiring exact-match queries (SSN, email, account numbers)

**Randomized Encryption**:
- Same plaintext produces different ciphertext each time
- Prevents all queries on encrypted field
- Maximum security (no pattern leakage)
- Use for: Highly sensitive fields without query requirements (credit card CVV, passwords)

Example:

```
Plaintext SSN: "123-45-6789"

Deterministic encryption:
- First record:   "AES256(123-45-6789, key)" → "Xy7$mP2qR..."
- Second record: "AES256(123-45-6789, key)" → "Xy7$mP2qR..." (same ciphertext)
- Can query: WHERE ssn = "Xy7$mP2qR..."

Randomized encryption:
- First record:   "AES256(123-45-6789, key, random_iv)" → "Xy7$mP2qR..."
- Second record: "AES256(123-45-6789, key, random_iv)" → "9fK#nQ8tZ..." (different!)
- Cannot query deterministically
```

### Data Encryption Keys (DEK)

Each encrypted field uses a Data Encryption Key (DEK):

- **Field-specific DEKs**: Different key for SSN vs. credit card
- **Key rotation**: Periodically rotate DEKs without re-encrypting all data
- **Key derivation**: Derive field keys from master key

Key hierarchy:

```
Customer Master Key (CMK) [AWS KMS]
    |
    +-- Application Master Key (AMK)
          |
          +-- Field DEK (ssn)
          +-- Field DEK (credit_card)
          +-- Field DEK (health_records)
```

### Encrypted Property Metadata

Geode stores encrypted properties with metadata:

```json
{
  "ssn": {
    "value": "Xy7$mP2qR...",        // Encrypted ciphertext
    "algorithm": "AES-256-GCM",     // Encryption algorithm
    "key_id": "dek-ssn-v2",         // Which DEK was used
    "mode": "deterministic",        // Encryption mode
    "iv": "base64-iv",              // Initialization vector (randomized mode)
    "tag": "base64-auth-tag"        // Authentication tag
  }
}
```

This metadata enables:
- Key rotation (identify which key encrypted each value)
- Algorithm agility (migrate to new algorithms)
- Authenticated encryption (detect tampering)

## How FLE Works in Geode

### Client-Side Encryption

FLE encryption happens in the client library before data reaches the database:

```python
from geode_client import Client
from geode_client.encryption import EncryptionConfig

# Configure encryption
encryption_config = EncryptionConfig(
    kms_provider='aws-kms',
    master_key_arn='arn:aws:kms:us-east-1:123:key/abc-123',
    field_configs={
        'Person.ssn': {
            'algorithm': 'AES-256-GCM',
            'mode': 'deterministic'
        },
        'Person.medical_notes': {
            'algorithm': 'AES-256-GCM',
            'mode': 'randomized'
        },
        'CreditCard.number': {
            'algorithm': 'AES-256-GCM',
            'mode': 'deterministic'
        }
    }
)

# Initialize client with encryption
client = Client('localhost:3141', encryption=encryption_config)

# Insert with automatic encryption
client.execute("""
    INSERT (:Person {
        name: 'Alice',
        ssn: '123-45-6789',              // Encrypted deterministically
        medical_notes: 'Patient has...'  // Encrypted randomly
    })
""")

# Query encrypted field (deterministic only)
result = client.execute("""
    MATCH (p:Person {ssn: '123-45-6789'})  // Client encrypts parameter
    RETURN p.name, p.ssn
""")
# p.ssn is automatically decrypted in result
```

The database never sees plaintext sensitive data.

### Queryable Encryption (Deterministic)

Deterministic encryption enables equality queries:

```gql
-- Client automatically encrypts the SSN parameter
MATCH (p:Person {ssn: $ssn})
RETURN p.name, p.email;

-- Supported operations on deterministic fields
MATCH (p:Person)
WHERE p.ssn = $ssn  // Equality
  OR p.ssn IN [$ssn1, $ssn2, $ssn3]  // IN clause
RETURN p;

-- NOT supported (requires plaintext comparison)
MATCH (p:Person)
WHERE p.ssn > '000-00-0000'  // Range query - NOT SUPPORTED
  OR p.ssn STARTS WITH '123'  // Pattern matching - NOT SUPPORTED
RETURN p;
```

### Key Rotation

Rotate encryption keys without re-encrypting all data:

```python
# Rotate DEK for SSN field
client.rotate_field_key('Person.ssn')

# Old data remains encrypted with old key (metadata stores key version)
# New inserts use new key
# Background job can re-encrypt old data gradually
```

Geode tracks which key version encrypted each value, enabling:
- Zero-downtime rotation
- Gradual re-encryption
- Key compromise recovery

### Schema Declaration

Declare encrypted fields in schema:

```gql
-- Define encrypted properties
CREATE CONSTRAINT person_ssn_encrypted
FOR (p:Person)
REQUIRE p.ssn IS ENCRYPTED DETERMINISTIC;

CREATE CONSTRAINT person_medical_encrypted
FOR (p:Person)
REQUIRE p.medical_notes IS ENCRYPTED RANDOMIZED;

-- Geode enforces encryption
INSERT (:Person {
    name: 'Bob',
    ssn: 'plaintext-ssn'  // ERROR: ssn must be encrypted
});
```

This prevents accidental plaintext storage.

## Use Cases

### PCI-DSS Compliance

Protect credit card data:

```python
# Configure FLE for payment data
encryption_config = EncryptionConfig(
    field_configs={
        'Payment.card_number': {
            'mode': 'deterministic',  # Enable lookups by card number
            'algorithm': 'AES-256-GCM'
        },
        'Payment.cvv': {
            'mode': 'randomized',  # Maximum security for CVV
            'algorithm': 'AES-256-GCM'
        },
        'Payment.expiry': {
            'mode': 'deterministic',
            'algorithm': 'AES-256-GCM'
        }
    }
)

# Store payment
client.execute("""
    INSERT (:Payment {
        card_number: '4532-1234-5678-9010',  // Encrypted
        cvv: '123',                          // Encrypted
        expiry: '12/25',                      // Encrypted
        amount: 99.99,                        // Plaintext (not sensitive)
        merchant: 'Acme Corp'                 // Plaintext
    })
""")

# Query by card number (deterministic encryption)
payments = client.execute("""
    MATCH (p:Payment {card_number: $card_number})
    RETURN p.amount, p.merchant, p.expiry
""", card_number='4532-1234-5678-9010')
```

### HIPAA Compliance

Protect Protected Health Information (PHI):

```python
encryption_config = EncryptionConfig(
    field_configs={
        'Patient.ssn': {'mode': 'deterministic'},
        'Patient.medical_record_number': {'mode': 'deterministic'},
        'Patient.diagnosis': {'mode': 'randomized'},
        'Patient.treatment_notes': {'mode': 'randomized'},
        'Patient.prescription': {'mode': 'randomized'}
    }
)

# Insert patient data
client.execute("""
    INSERT (:Patient {
        name: 'John Doe',  // Plaintext (public identifier)
        ssn: '987-65-4321',  // Encrypted deterministically
        mrn: 'MRN-123456',   // Encrypted deterministically
        diagnosis: 'Type 2 Diabetes',  // Encrypted randomly
        treatment_notes: '...',  // Encrypted randomly
        age: 45  // Plaintext (not PHI in this context)
    })
""")
```

### Multi-Tenant SaaS

Isolate tenant data cryptographically:

```python
# Each tenant gets unique encryption keys
class TenantEncryptionConfig:
    def __init__(self, tenant_id, master_key_arn):
        self.config = EncryptionConfig(
            kms_provider='aws-kms',
            master_key_arn=master_key_arn,
            key_namespace=f'tenant-{tenant_id}',  // Tenant-specific keys
            field_configs={
                'Document.content': {'mode': 'randomized'},
                'Document.metadata': {'mode': 'deterministic'}
            }
        )

# Tenant A's client
tenant_a_client = Client('localhost:3141',
    encryption=TenantEncryptionConfig('tenant-a', kms_key_a).config)

# Tenant B's client (different keys)
tenant_b_client = Client('localhost:3141',
    encryption=TenantEncryptionConfig('tenant-b', kms_key_b).config)

# Even if Tenant A compromises database, can't decrypt Tenant B's data
```

### Personally Identifiable Information (PII)

Protect PII for GDPR compliance:

```python
encryption_config = EncryptionConfig(
    field_configs={
        'User.email': {'mode': 'deterministic'},  # Queryable for login
        'User.phone': {'mode': 'deterministic'},  # Queryable for contact
        'User.address': {'mode': 'randomized'},  # No query needed
        'User.date_of_birth': {'mode': 'randomized'},  # No query needed
        'User.ip_address': {'mode': 'deterministic'},  # Queryable for audit
    }
)
```

## Best Practices

### Choosing Encryption Mode

**Use Deterministic Encryption When**:
- Need to query by exact value (login, lookup)
- Field has high cardinality (many unique values)
- Pattern leakage is acceptable

**Use Randomized Encryption When**:
- Maximum security required
- No query requirements
- Field has low cardinality (reveals patterns)
- Compliance demands strongest encryption

### Minimize Encrypted Fields

Only encrypt what's truly sensitive:

```python
# Good: Selective encryption
{
    'name': 'Alice',          // Plaintext (not sensitive)
    'email': '...',           // Deterministic (need to query)
    'ssn': '...',             // Deterministic (need to verify)
    'medical_notes': '...'    // Randomized (very sensitive)
}

# Bad: Over-encryption
{
    'name': '...',            // Encrypted (why? need to display)
    'created_at': '...',      // Encrypted (why? need to sort/filter)
    'public_bio': '...'       // Encrypted (why? it's public!)
}
```

Over-encryption hurts performance and usability without security benefit.

### Key Management

1. **Use KMS**: Never hardcode encryption keys
   ```python
   # Good
   config = EncryptionConfig(
       kms_provider='aws-kms',
       master_key_arn='arn:aws:kms:...'
   )

   # Bad
   config = EncryptionConfig(
       master_key='hardcoded-key-here'  // NEVER DO THIS
   )
   ```

2. **Rotate keys regularly**: Quarterly or annually
   ```python
   # Schedule automated key rotation
   client.schedule_key_rotation(
       field='Person.ssn',
       interval_days=90
   )
   ```

3. **Separate keys by sensitivity**: SSN vs. email
   ```python
   config = EncryptionConfig(
       field_configs={
           'Person.ssn': {'key_id': 'high-security-dek'},
           'Person.email': {'key_id': 'medium-security-dek'}
       }
   )
   ```

### Application Design

1. **Encrypt at client**: Never send plaintext to database
2. **Validate before encrypt**: Reject invalid SSNs before encrypting
3. **Cache decrypted values**: Avoid repeated decryption
4. **Handle encryption errors**: Key unavailable, KMS timeout, etc.

```python
def create_user(name, ssn, email):
    # Validate BEFORE encrypting
    if not is_valid_ssn(ssn):
        raise ValueError("Invalid SSN format")

    try:
        client.execute("""
            INSERT (:User {name: $name, ssn: $ssn, email: $email})
        """, name=name, ssn=ssn, email=email)
    except EncryptionError as e:
        logger.error(f"Encryption failed: {e}")
        # Handle gracefully (retry, alert, etc.)
        raise
```

## Performance Considerations

### Encryption Overhead

Typical performance impact:

- **Encryption latency**: +0.5-2ms per encrypted field
- **Decryption latency**: +0.5-2ms per encrypted field
- **Query performance**: Deterministic fields support indexes, minimal impact
- **Insert throughput**: 10-20% reduction for heavily encrypted records

### Optimization Tips

1. **Batch operations**: Amortize KMS overhead
   ```python
   # Encrypt batch before inserting
   encrypted_users = client.encrypt_batch(users)
   async with client.connection() as conn:
       await conn.begin()
       try:
           for query, params in insert_queries:
               await conn.execute(query, params)
           await conn.commit()
       except Exception:
           await conn.rollback()
           raise
   ```

2. **Cache DEKs**: Avoid repeated KMS calls
   ```python
   config = EncryptionConfig(
       kms_provider='aws-kms',
       dek_cache_size=1000,  # Cache up to 1000 DEKs
       dek_cache_ttl=3600    # Cache for 1 hour
   )
   ```

3. **Use connection pooling**: Reuse encrypted connections
4. **Minimize encrypted fields**: Only encrypt what's necessary

## Related Topics

- [Transparent Data Encryption (TDE)](/tags/tde/) - Full database encryption
- [Security](/tags/security/) - Overall security features
- [Encryption](/tags/encryption/) - Encryption capabilities
- [Compliance](/tags/compliance/) - Regulatory compliance
- [Authentication](/tags/authentication/) - Access control

## Further Reading

- [Field-Level Encryption Guide](/docs/security/field-level-encryption/) - Complete FLE documentation
- [KMS Integration](/docs/security/kms-integration/) - KMS integration guide
- [Client Libraries](/docs/client-libraries/) - Language-specific FLE usage

Geode's Field-Level Encryption provides granular protection for sensitive data with queryable encryption support, enabling compliance with PCI-DSS, HIPAA, and GDPR while maintaining application functionality.
