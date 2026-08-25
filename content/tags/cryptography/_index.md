---
title: "Cryptography and Cryptographic Primitives"
description: "Complete guide to cryptographic implementations in Geode. Learn about encryption algorithms, hashing functions, key management, digital signatures, and cryptographic best practices for securing graph database operations."
keywords:
  - cryptography
  - encryption
  - hashing
  - key management
  - digital signatures
  - AES-256
  - ChaCha20
  - Ed25519
  - SHA-256
  - Argon2
  - HMAC
  - cryptographic primitives
  - Geode
  - graph database
  - security
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/cryptography/"
    noindex: false
    title: "Cryptography and Cryptographic Primitives - Geode Graph Database"
    description: "Understand Geode's cryptographic foundations including AES-256-GCM encryption, Ed25519 signatures, Argon2 password hashing, and secure key management for enterprise security."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

Geode employs modern, industry-standard cryptographic primitives throughout its security architecture. This documentation covers the cryptographic algorithms, protocols, and implementations used to protect data at rest, in transit, and during processing. Understanding these foundations helps security teams evaluate Geode's security posture and configure appropriate cryptographic settings.

## Cryptographic Overview

Geode's cryptographic subsystem provides:

- **Confidentiality**: AES-256-GCM and ChaCha20-Poly1305 for data encryption
- **Integrity**: HMAC-SHA256 and Poly1305 for data integrity verification
- **Authentication**: Ed25519 and ECDSA for digital signatures
- **Password Security**: Argon2id for password hashing
- **Key Exchange**: X25519 and ECDHE for secure key agreement
- **Random Generation**: Cryptographically secure random number generation

## Symmetric Encryption

### AES-256-GCM

Advanced Encryption Standard with 256-bit keys in Galois/Counter Mode is the primary encryption algorithm for data at rest:

```
Algorithm: AES-256-GCM
Key Size: 256 bits
Block Size: 128 bits
Mode: Galois/Counter Mode (authenticated encryption)
Nonce Size: 96 bits (12 bytes)
Tag Size: 128 bits (16 bytes)
```

**Characteristics**:

- Authenticated encryption (AEAD) - provides confidentiality and integrity
- Hardware acceleration via AES-NI on modern CPUs
- Parallel encryption/decryption for high performance
- Standard for NIST, PCI DSS, and HIPAA compliance

**Usage in Geode**:

```yaml
# geode.yaml
encryption:
  algorithm: aes-256-gcm
  key_derivation: hkdf-sha256
  nonce_generation: random
```

**Performance Characteristics**:

```
Benchmark (Intel Xeon with AES-NI):
Encryption: 4.2 GB/s
Decryption: 4.5 GB/s
Overhead: ~3-5% for typical workloads
```

### ChaCha20-Poly1305

Alternative authenticated encryption algorithm, preferred on systems without AES hardware acceleration:

```
Algorithm: ChaCha20-Poly1305
Key Size: 256 bits
Nonce Size: 96 bits (12 bytes)
Tag Size: 128 bits (16 bytes)
```

**Characteristics**:

- Software-optimized, fast on all platforms
- Constant-time implementation (resistant to timing attacks)
- Used by TLS 1.3 and WireGuard
- Excellent for mobile and ARM devices

**Configuration**:

```yaml
# geode.yaml
encryption:
  algorithm: chacha20-poly1305
  # Preferred for ARM/mobile or when AES-NI unavailable
```

### Encryption Key Hierarchy

Geode uses a hierarchical key structure:

```
Master Key (stored in HSM/KMS)
    |
    +-- Key Encryption Key (KEK) 1
    |       |
    |       +-- Data Encryption Key (DEK) for Graph Data
    |       +-- Data Encryption Key (DEK) for Indexes
    |
    +-- Key Encryption Key (KEK) 2
            |
            +-- Data Encryption Key (DEK) for Transaction Logs
            +-- Data Encryption Key (DEK) for Backups
```

**Key Derivation**:

```yaml
# geode.yaml
key_derivation:
  function: hkdf-sha256
  salt_size: 256  # bits
  info: "geode-dek-v1"

  # Key rotation
  rotation:
    master_key: 90d
    kek: 180d
    dek: 365d
```

## Asymmetric Cryptography

### Ed25519 Digital Signatures

Edwards-curve Digital Signature Algorithm for authentication and integrity:

```
Algorithm: Ed25519
Key Size: 256 bits (32 bytes)
Signature Size: 512 bits (64 bytes)
Security Level: ~128 bits
```

**Characteristics**:

- Fast signature generation and verification
- Deterministic signatures (no random nonce needed)
- Small keys and signatures
- Resistant to timing attacks

**Usage in Geode**:

```yaml
# geode.yaml
signatures:
  algorithm: ed25519

  # Sign audit logs
  audit_log_signing: true

  # Sign backups
  backup_signing: true

  # Sign cluster communication
  cluster_signing: true
```

**Code Example (Key Generation)**:

```bash
# Generate Ed25519 key pair
geode keygen --algorithm=ed25519 \
  --output=/etc/geode/keys/signing.key \
  --public-output=/etc/geode/keys/signing.pub
```

### ECDSA Signatures

Elliptic Curve Digital Signature Algorithm for TLS certificates:

```
Curve: P-256 (secp256r1) or P-384 (secp384r1)
Key Size: 256 or 384 bits
Signature Size: ~64 or 96 bytes
```

**Certificate Configuration**:

```yaml
# geode.yaml
tls:
  certificate:
    algorithm: ecdsa
    curve: p-384  # or p-256
```

### X25519 Key Exchange

Elliptic Curve Diffie-Hellman for secure key agreement:

```
Algorithm: X25519 (Curve25519)
Key Size: 256 bits
Shared Secret: 256 bits
Security Level: ~128 bits
```

**Usage in TLS 1.3**:

```yaml
# geode.yaml
tls:
  key_exchange:
    algorithms:
      - x25519
      - secp384r1  # fallback
```

## Hashing Functions

### SHA-256 and SHA-384

Secure Hash Algorithm for data integrity:

```
SHA-256:
  Output Size: 256 bits (32 bytes)
  Block Size: 512 bits
  Use: General integrity checking

SHA-384:
  Output Size: 384 bits (48 bytes)
  Block Size: 1024 bits
  Use: Higher security requirements
```

**Usage**:

```yaml
# geode.yaml
integrity:
  algorithm: sha-256  # or sha-384

  # Hash data pages
  page_checksums: true

  # Hash transaction logs
  transaction_log_hashing: true
```

### BLAKE3

Modern, high-performance cryptographic hash:

```
Algorithm: BLAKE3
Output Size: Variable (default 256 bits)
Speed: 4x faster than SHA-256
Security Level: 128 bits
```

**Configuration**:

```yaml
# geode.yaml
integrity:
  algorithm: blake3
  # Recommended for high-throughput scenarios
```

## Password Hashing

### Argon2id

Memory-hard password hashing function (winner of Password Hashing Competition):

```
Algorithm: Argon2id (hybrid of Argon2i and Argon2d)
Output Size: Variable (recommended 256 bits)
Parameters:
  - Time Cost: Number of iterations
  - Memory Cost: Memory usage in KB
  - Parallelism: Number of threads
```

**Geode Default Configuration**:

```yaml
# geode.yaml
auth:
  password_hashing:
    algorithm: argon2id
    time_cost: 3
    memory_cost: 65536  # 64 MB
    parallelism: 4
    hash_length: 32  # bytes
```

**Security Considerations**:

```yaml
# High-security configuration
auth:
  password_hashing:
    algorithm: argon2id
    time_cost: 4      # More iterations
    memory_cost: 131072  # 128 MB
    parallelism: 8
    # Target: ~500ms hash time on server hardware
```

### Password Hash Verification

```gql
-- Verify password (internal implementation)
-- Constant-time comparison prevents timing attacks
-- Rate limiting prevents brute force attacks
```

## Message Authentication

### HMAC-SHA256

Hash-based Message Authentication Code for integrity and authenticity:

```
Algorithm: HMAC-SHA256
Key Size: 256 bits
Tag Size: 256 bits
```

**Usage**:

```yaml
# geode.yaml
authentication:
  # HMAC for API tokens
  token_algorithm: hmac-sha256

  # HMAC for session cookies
  session_algorithm: hmac-sha256
```

### Poly1305

One-time authenticator, used with ChaCha20:

```
Algorithm: Poly1305
Key Size: 256 bits
Tag Size: 128 bits
```

**Note**: Poly1305 keys must never be reused. Geode automatically manages key uniqueness.

## Random Number Generation

### Cryptographically Secure PRNG

Geode uses system-provided CSPRNGs:

```
Linux: /dev/urandom (getrandom syscall)
macOS: SecRandomCopyBytes
Windows: BCryptGenRandom

Entropy Sources:
- Hardware random (RDRAND/RDSEED)
- Timing jitter
- System events
- Network traffic patterns
```

**Configuration**:

```yaml
# geode.yaml
random:
  source: system  # Uses OS CSPRNG
  hardware_rng: prefer  # Use hardware RNG when available

  # Entropy health monitoring
  entropy_check: true
  min_entropy_bits: 256
```

### Nonce Generation

```yaml
# geode.yaml
encryption:
  nonce:
    generation: random  # or counter-based
    size: 96  # bits (12 bytes for AES-GCM)

    # Counter-based for high-volume encryption
    # counter:
    #   initial: random
    #   increment: 1
```

## Key Management

### Key Generation

```bash
# Generate encryption key
geode keygen --algorithm=aes-256 \
  --output=/etc/geode/keys/master.key \
  --format=raw

# Generate with passphrase protection
geode keygen --algorithm=aes-256 \
  --output=/etc/geode/keys/master.key \
  --protect-with-passphrase \
  --kdf=argon2id
```

### Key Storage Options

**File-Based (Development)**:

```yaml
encryption:
  key_source: file
  key_file: /etc/geode/keys/master.key
  key_file_permissions: 0400
```

**Environment Variable**:

```yaml
encryption:
  key_source: env
  key_env_var: GEODE_MASTER_KEY
  key_encoding: base64
```

**Hardware Security Module (HSM)**:

```yaml
encryption:
  key_source: hsm
  hsm:
    provider: pkcs11
    library: /usr/lib/softhsm/libsofthsm2.so
    slot: 0
    pin_file: /etc/geode/hsm-pin.txt
    key_label: geode-master-key
```

**Cloud KMS**:

```yaml
encryption:
  key_source: aws-kms
  aws_kms:
    key_id: arn:aws:kms:us-east-1:123456789012:key/abc123
    region: us-east-1

# Or Google Cloud KMS
encryption:
  key_source: gcp-kms
  gcp_kms:
    key_name: projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY

# Or Azure Key Vault
encryption:
  key_source: azure-keyvault
  azure_keyvault:
    vault_name: geode-keys
    key_name: master-key
```

### Key Rotation

```bash
# Rotate master key
geode key-rotate --key-type=master \
  --new-key-source=hsm \
  --grace-period=24h

# Rotate data encryption keys
geode key-rotate --key-type=dek \
  --background=true \
  --throttle=50mbps

# Check rotation status
geode key-rotate --status
```

### Key Derivation

```yaml
# geode.yaml
key_derivation:
  # HKDF for deriving multiple keys from master
  function: hkdf
  hash: sha-256

  # Domain separation
  contexts:
    data: "geode-data-encryption-v1"
    index: "geode-index-encryption-v1"
    log: "geode-log-encryption-v1"
    backup: "geode-backup-encryption-v1"
```

## Cryptographic Modes

### Transparent Data Encryption (TDE)

Automatic encryption/decryption of data at storage layer:

```yaml
# geode.yaml
tde:
  enabled: true
  algorithm: aes-256-gcm

  # What to encrypt
  encrypt:
    data_files: true
    index_files: true
    transaction_logs: true
    temporary_files: true

  # Performance tuning
  cache_decrypted_pages: true
  cache_size: 1GB
```

### Field-Level Encryption (FLE)

Client-side encryption of specific fields:

```gql
-- Encrypt sensitive fields
INSERT (:Person {
  name: 'Alice Smith',
  email: 'alice@example.com',
  ssn: $ssn /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar encrypt() */,
  salary: $salary /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar encrypt() */
});

-- Decrypt when needed (requires key access)
MATCH (p:Person {email: 'alice@example.com'})
RETURN p.name, p.ssn /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar decrypt() */ AS ssn;
```

**Encryption Modes**:

```gql
-- Deterministic encryption (allows equality comparison)
$value /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar encrypt_deterministic() */

-- Randomized encryption (maximum security)
/* FLE is CALL geode.fle.configurefield(...) */ ($value, $key)

-- Searchable encryption (allows pattern matching)
encrypt_searchable($value, $key)
```

## FIPS 140-2 Compliance

For organizations requiring FIPS 140-2 validated cryptography:

```yaml
# geode.yaml
fips:
  enabled: true
  mode: 140-2  # or 140-3

  # Use FIPS-validated crypto library
  crypto_library: openssl-fips

  # Restrict to FIPS-approved algorithms
  algorithms:
    encryption:
      - aes-256-gcm
      - aes-256-cbc
    hashing:
      - sha-256
      - sha-384
      - sha-512
    signatures:
      - ecdsa-p256
      - ecdsa-p384
      - rsa-2048
```

**FIPS-Approved Algorithms in Geode**:

| Category | Algorithm | FIPS Status |
|----------|-----------|-------------|
| Symmetric | AES-256-GCM | Approved |
| Symmetric | ChaCha20-Poly1305 | Not FIPS |
| Hash | SHA-256/384/512 | Approved |
| Hash | BLAKE3 | Not FIPS |
| Signature | ECDSA (P-256/P-384) | Approved |
| Signature | Ed25519 | Not FIPS |
| Key Exchange | ECDH (P-256/P-384) | Approved |
| Key Exchange | X25519 | Not FIPS |
| Password | PBKDF2-HMAC-SHA256 | Approved |
| Password | Argon2id | Not FIPS |

## Post-Quantum Considerations

Geode is preparing for post-quantum cryptography:

```yaml
# geode.yaml (experimental)
post_quantum:
  enabled: false  # Not yet production-ready
  algorithms:
    key_encapsulation: kyber-1024
    signature: dilithium-3

  # Hybrid mode (classical + post-quantum)
  hybrid_mode: true
```

**Timeline**: Full post-quantum support planned for 2027 following NIST standardization.

## Performance Optimization

### Hardware Acceleration

```bash
# Check available hardware acceleration
geode crypto-check

# Output:
# Hardware Acceleration Status:
#   AES-NI: Available
#   AVX2: Available
#   AVX-512: Available
#   SHA Extensions: Available
#   RDRAND: Available
#   RDSEED: Available
# Estimated performance: 4.2 GB/s encryption
```

### Tuning Configuration

```yaml
# geode.yaml
crypto:
  # Use hardware acceleration
  hardware_acceleration: true

  # Parallel encryption threads
  threads: 4

  # Batch size for encryption operations
  batch_size: 4MB

  # Cache encrypted pages
  encryption_cache:
    enabled: true
    size: 1GB
```

### Benchmarking

```bash
# Benchmark cryptographic operations
geode crypto-benchmark

# Output:
# Encryption Benchmarks:
#   AES-256-GCM (1KB):   2.1M ops/sec
#   AES-256-GCM (1MB):   4.2 GB/sec
#   ChaCha20-Poly1305:   3.8 GB/sec
#
# Hashing Benchmarks:
#   SHA-256:             5.1 GB/sec
#   BLAKE3:              12.4 GB/sec
#
# Signature Benchmarks:
#   Ed25519 sign:        55,000 ops/sec
#   Ed25519 verify:      18,000 ops/sec
```

## Security Best Practices

### 1. Use Authenticated Encryption

```yaml
# Always use AEAD modes
encryption:
  algorithm: aes-256-gcm  # Not aes-256-cbc
  # GCM provides confidentiality AND integrity
```

### 2. Protect Keys Appropriately

```yaml
# Production: Use HSM or KMS
encryption:
  key_source: hsm  # Not file

# Never store keys in code or version control
```

### 3. Rotate Keys Regularly

```yaml
key_rotation:
  master_key: 90d
  encryption_keys: 365d
  session_keys: 24h
```

### 4. Use Strong Random Numbers

```yaml
random:
  source: system
  hardware_rng: require  # Fail if unavailable
```

### 5. Implement Key Separation

```yaml
# Different keys for different purposes
keys:
  data_encryption: key1
  backup_encryption: key2
  audit_signing: key3
```

## Troubleshooting

### Verifying Cryptographic Configuration

```bash
# Check crypto status
geode crypto-status

# Verify encryption is working
geode crypto-test

# Check key availability
geode key-verify --key-source=hsm
```

### Common Issues

**Slow Encryption**:

```bash
# Check if hardware acceleration is available
geode crypto-check
# If AES-NI not available, consider ChaCha20-Poly1305
```

**Key Access Failures**:

```bash
# Verify HSM connectivity
geode hsm-test --provider=pkcs11

# Check key permissions
geode key-verify --verbose
```

## Related Topics

- [Encryption](/tags/encryption/) - Data encryption configuration
- [TLS](/tags/tls/) - Transport layer security
- [Security](/tags/security/) - Security overview
- [Compliance](/tags/compliance/) - Regulatory requirements
- [Key Management](/tags/key-management/) - Key lifecycle management
- [Post-Quantum](/tags/post-quantum/) - Future-proof cryptography

## Further Reading

- [Security Architecture](/docs/architecture/security-architecture/) - Security design
- [Security Overview](/docs/security/overview/) - Encryption configuration
- [Field-Level Encryption](/docs/security/field-level-encryption/) - FLE implementation
- Cryptographic Whitepaper - Detailed algorithm specifications
