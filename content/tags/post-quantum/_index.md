---
title: "Post-Quantum Cryptography Readiness"
description: "Complete guide to Geode's post-quantum cryptography preparedness. Learn about quantum computing threats, NIST PQC standards, hybrid encryption strategies, and how Geode protects data against future quantum attacks."
keywords:
  - post-quantum cryptography
  - PQC
  - quantum computing
  - quantum resistant
  - NIST PQC
  - ML-KEM
  - Kyber
  - Dilithium
  - hybrid cryptography
  - lattice cryptography
  - quantum safe
  - cryptographic agility
  - future-proof security
  - Geode
  - graph database
  - enterprise security
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/post-quantum/"
    noindex: false
    title: "Post-Quantum Cryptography Readiness - Geode Graph Database"
    description: "Prepare for the quantum era with Geode's post-quantum cryptography strategy. Hybrid encryption, NIST PQC standards support, and defense against store-now-decrypt-later attacks."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

Post-quantum cryptography (PQC) addresses the threat that quantum computers pose to current cryptographic systems. Geode implements a comprehensive post-quantum preparedness strategy that protects sensitive graph data against both current and future threats. By combining strong symmetric encryption, mandatory forward secrecy, and cryptographic agility, Geode ensures your data remains secure even as quantum computing advances.

## The Quantum Threat

### Understanding Quantum Computing Risks

Current asymmetric cryptography (RSA, ECC) relies on mathematical problems that quantum computers can solve efficiently:

| Algorithm | Classical Security | Quantum Attack | Threat Level |
|-----------|-------------------|----------------|--------------|
| RSA-2048 | 112-bit | Shor's Algorithm | Critical |
| ECDSA P-256 | 128-bit | Shor's Algorithm | Critical |
| ECDH/X25519 | 128-bit | Shor's Algorithm | Critical |
| AES-256 | 256-bit | Grover's Algorithm | Manageable (128-bit) |
| SHA-256 | 256-bit | Grover's Algorithm | Manageable (128-bit) |

**Key insight**: Symmetric cryptography (AES) and hash functions (SHA) remain relatively secure against quantum attacks, but asymmetric cryptography used for key exchange and signatures is vulnerable.

### Store Now, Decrypt Later (SNDL)

The most immediate quantum threat is the "harvest now, decrypt later" attack:

```
Current Reality:
  1. Adversary records encrypted network traffic
  2. Traffic encrypted with classical cryptography
  3. Storage is cheap - bulk collection is feasible

Future Scenario:
  1. Cryptographically relevant quantum computer (CRQC) becomes available
  2. Adversary decrypts historical traffic
  3. Sensitive data exposed years after transmission
```

## Geode's Post-Quantum Strategy

### Layer 1: Strong Symmetric Encryption

AES-256 provides post-quantum security for data at rest and in transit:

```yaml
# geode.yaml
encryption:
  at_rest:
    enabled: true
    algorithm: "aes-256-gcm"  # 128-bit post-quantum security
    key_size: 256

  cipher_suites:
    - TLS_AES_256_GCM_SHA384
    - TLS_CHACHA20_POLY1305_SHA256
```

### Layer 2: Mandatory Forward Secrecy

Forward secrecy limits the value of future key compromise:

```yaml
# geode.yaml
tls:
  min_version: "1.3"  # Forward secrecy required
  session_resumption:
    enabled: true
    ticket_lifetime: 3600  # Short ticket lifetime
```

**Why this matters**: Even if a future quantum computer breaks the key exchange algorithm, past symmetric session keys were never transmitted and remain protected.

### Layer 3: Cryptographic Agility

Geode's architecture supports algorithm updates without major changes:

```yaml
# geode.yaml
cryptography:
  agility:
    enabled: true
    key_exchange:
      preferred:
        - "ML-KEM-768"      # Post-quantum (when available)
        - "X25519"          # Classical fallback
      hybrid_mode: true
```

## NIST Post-Quantum Standards

### Selected Algorithms

**Key Encapsulation (Key Exchange)**:

| Standard | Algorithm | Security Level | Key Size | Ciphertext Size |
|----------|-----------|----------------|----------|-----------------|
| FIPS 203 | ML-KEM-512 | 1 (128-bit) | 800 bytes | 768 bytes |
| FIPS 203 | ML-KEM-768 | 3 (192-bit) | 1,184 bytes | 1,088 bytes |
| FIPS 203 | ML-KEM-1024 | 5 (256-bit) | 1,568 bytes | 1,568 bytes |

**Digital Signatures**:

| Standard | Algorithm | Security Level | Public Key | Signature |
|----------|-----------|----------------|------------|-----------|
| FIPS 204 | ML-DSA-44 | 2 (128-bit) | 1,312 bytes | 2,420 bytes |
| FIPS 204 | ML-DSA-65 | 3 (192-bit) | 1,952 bytes | 3,293 bytes |
| FIPS 204 | ML-DSA-87 | 5 (256-bit) | 2,592 bytes | 4,595 bytes |

### Recommended Configuration

```yaml
# Standard Security (most use cases)
cryptography:
  post_quantum:
    key_encapsulation: "ML-KEM-768"   # NIST Level 3
    signature: "ML-DSA-65"             # NIST Level 3

# High Security (government, financial)
cryptography:
  post_quantum:
    key_encapsulation: "ML-KEM-1024"  # NIST Level 5
    signature: "ML-DSA-87"             # NIST Level 5
```

## Hybrid Cryptography

Hybrid mode combines classical and post-quantum algorithms for defense in depth:

```
Hybrid Key Exchange:
  classical_secret = X25519(client_private, server_public)
  pq_secret = ML-KEM.Decapsulate(ciphertext, client_private)
  shared_secret = KDF(classical_secret || pq_secret)

Security: Attacker must break BOTH algorithms
```

### Configuration

```yaml
# geode.yaml
tls:
  hybrid:
    enabled: true
    mode: "require"
    key_exchange:
      classical: "X25519"
      post_quantum: "ML-KEM-768"
    authentication:
      classical: "Ed25519"
      post_quantum: "ML-DSA-65"
```

```bash
geode serve --tls-hybrid=enabled \
  --tls-hybrid-kex=X25519+ML-KEM-768

geode tls-status --verbose
# Hybrid Mode: Enabled
# Key Exchange: X25519 + ML-KEM-768
```

## Migration Planning

### Migration Timeline

```
Phase 1: Assessment (Current)
  - Inventory cryptographic assets
  - Identify sensitive long-term data

Phase 2: Preparation
  - Enable cryptographic agility
  - Test PQC algorithms in staging

Phase 3: Hybrid Deployment
  - Deploy hybrid TLS configuration
  - Monitor performance impact

Phase 4: Full PQC (Future)
  - Transition to pure PQC
  - Deprecate classical algorithms
```

### Assessment

```bash
geode crypto-audit --comprehensive

# Output:
# Current Cryptographic Inventory:
# TLS Key Exchange: X25519 (classical, quantum-vulnerable)
# Data Encryption: AES-256-GCM (quantum-resistant)
#
# Recommendations:
# - Enable hybrid key exchange when available
# - Current data-at-rest encryption is quantum-safe
```

## Performance Considerations

### Key Exchange Performance

```
Algorithm          Key Gen    Encaps     Decaps     Total
----------------------------------------------------------
X25519 (classical)   0.02ms    0.02ms     0.02ms    0.06ms
ML-KEM-768 (PQC)     0.08ms    0.10ms     0.12ms    0.30ms
Hybrid (X25519+KEM)  0.10ms    0.12ms     0.14ms    0.36ms
```

### Optimization

```yaml
performance:
  post_quantum:
    session_resumption:
      enabled: true
      ticket_lifetime: 86400
    connection_pooling:
      enabled: true
      max_idle_connections: 100
    acceleration:
      avx2: true
```

## Compliance and Standards

### Regulatory Guidance

- **NIST**: FIPS 203, 204, 205 (ML-KEM, ML-DSA, SLH-DSA)
- **NSA CNSA 2.0**: Post-quantum requirements for national security systems
- **CISA**: Post-quantum migration guidance for critical infrastructure

### Compliance Configuration

```yaml
# CNSA 2.0 compliant configuration
compliance:
  standard: "CNSA-2.0"
  cryptography:
    symmetric: "AES-256"
    hash: "SHA-384"
    key_exchange: "ML-KEM-1024"
    signature: "ML-DSA-87"
```

```bash
geode compliance-check --standard=CNSA-2.0
# Symmetric Encryption: COMPLIANT (AES-256-GCM)
# Key Exchange: PREPARING (X25519 -> ML-KEM-1024)
```

## Monitoring

```bash
geode crypto-status

# Cryptographic Status:
# TLS Version: 1.3
# Forward Secrecy: Enabled
# Cipher: AES-256-GCM (quantum-resistant)
# Hybrid Mode: Available
#
# Post-Quantum Readiness:
# - Data-at-rest: Protected (AES-256)
# - Forward secrecy: Limiting SNDL exposure
# - Algorithm agility: Enabled
```

## Best Practices

### Immediate Actions

1. **Enable AES-256**: Use 256-bit symmetric encryption
2. **Enforce TLS 1.3**: Mandatory forward secrecy
3. **Enable Agility**: Prepare for algorithm updates
4. **Audit Cryptography**: Inventory all cryptographic usage
5. **Classify Data**: Identify long-term sensitive data

### Long-term Strategy

1. **Deploy Hybrid**: Enable hybrid cryptography
2. **Migrate to PQC**: Transition to pure post-quantum
3. **Continuous Assessment**: Regular security audits
4. **Stay Current**: Update algorithms as standards evolve

## Related Topics

- [Forward Secrecy](/tags/forward-secrecy/) - Ephemeral key exchange
- [TLS Encryption](/tags/tls/) - Transport security configuration
- [Encryption](/tags/encryption/) - Data encryption at rest
- [Security](/tags/security/) - Security overview
- [Compliance](/tags/compliance/) - Regulatory requirements
- [Authentication](/tags/authentication/) - Identity verification

## Further Reading

- [Security Architecture](/docs/architecture/security-architecture/) - Security design
- [Deployment Guide](/docs/ops/deployment/) - Production deployment
- NIST Post-Quantum Cryptography Standards (FIPS 203, 204, 205)
- NSA CNSA 2.0 Commercial National Security Algorithm Suite
- CISA Post-Quantum Cryptography Initiative
