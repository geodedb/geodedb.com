---
title: "Post-Quantum Readiness & Cryptography"
description: "Geode's cryptographic architecture designed for the Post-Quantum era, emphasizing forward secrecy, crypto-agility, and quantum-resistant algorithms."
url: /docs/security/post-quantum-readiness/
summary: "Deep dive into Geode's security architecture ensuring data protection in the Post-Quantum future through advanced cryptographic choices and forward secrecy."
keywords:
  - post-quantum
  - cryptography
  - forward secrecy
  - quantum resistant
  - security architecture
  - encryption
  - TLS 1.3
  - AES-256
  - crypto agility
tags:
  - security
  - post-quantum
  - cryptography
  - architecture
  - forward-secrecy
categories:
  - security
  - architecture
weight: 30
params:
  seo:
    keywords: "post-quantum cryptography, forward secrecy database, quantum resistant graph database, geode security architecture, crypto agility"
---

<!-- CANARY: REQ=REQ-SEC-AUDIT-LOG-001; FEATURE="Security"; ASPECT=AuditLog; STATUS=TESTED; OWNER=security; UPDATED=2026-01-16 -->

# Post-Quantum Readiness & Cryptography

As we approach the Post-Quantum (PQ) era, the security landscape for enterprise data storage is shifting fundamental paradigms. Geode is architected not just for today's threats, but for the "store now, decrypt later" attacks of tomorrow. Our cryptographic choices prioritize **Forward Secrecy**, **Crypto-Agility**, and **Quantum-Resistance**.

## The Post-Quantum Threat Model

Quantum computers capable of running Shor's algorithm will eventually break classical public-key cryptography (RSA, ECC). While symmetric encryption (AES) remains relatively secure (requiring larger key sizes), the mechanisms we use to *exchange* those keys are vulnerable.

**Geode's Defense Strategy:**
1.  **Enforce Perfect Forward Secrecy (PFS)** today.
2.  **Maximize Key Strengths** for classical algorithms.
3.  **Architect for Hybrid Key Exchange** (Classical + PQ).
4.  **Field-Level Encryption (FLE)** independent of transport security.

## Cryptographic Primitives

Geode employs a "defense-in-depth" approach to cryptography, selecting algorithms that offer the highest security margins per bit of performance.

### Transport Layer (Data in Motion)

Geode uses **QUIC + TLS 1.3** exclusively. We have removed support for older protocols that lack mandatory forward secrecy or support weak cipher suites.

*   **Protocol**: TLS 1.3 (RFC 8446) / QUIC (RFC 9000)
*   **Key Exchange**: X25519 (Curve25519) - *High performance, constant-time execution.*
*   **Signatures**: Ed25519 - *Deterministic signatures, resistant to side-channel attacks.*
*   **Symmetric Encryption**:
    *   `TLS_AES_256_GCM_SHA384` (Default)
    *   `TLS_CHACHA20_POLY1305_SHA256` (Mobile/ARM optimization)

**Why this matters for Post-Quantum:**
By enforcing TLS 1.3, we mandate **Forward Secrecy**. If a server's long-term private key is compromised in the future (even by a quantum computer), past sessions recorded today cannot be decrypted because the session keys were ephemeral and never transmitted over the wire.

### Transparent Data Encryption (TDE)

For Data at Rest, Geode uses an envelope encryption scheme designed for long-term security.

*   **Data Encryption Key (DEK)**: AES-256-GCM
*   **Key Wrapping**: AES-256-KW (Key Wrap) or RSA-OAEP-4096 (migrating to Hybrid PQ-KEM)
*   **Key Derivation**: Argon2id (memory-hard, resistant to GPU/ASIC cracking)

We mandate **AES-256** rather than AES-128. Grover's algorithm suggests that a quantum computer could reduce the effective security of symmetric keys by half. AES-256 retains 128 bits of security against quantum brute-force, which is considered safe.

## Forward Secrecy & Key Rotation

Forward Secrecy is the property that compromise of long-term keys does not compromise past session keys. Geode implements this at multiple layers:

### 1. Network Session Rotation
QUIC streams in Geode rotate keys automatically based on data volume or time, ensuring that even within a single long-lived connection, a key compromise limits exposure to a small window of time.

### 2. Database Key Rotation
Geode's Key Management System (KMS) integration supports automated rotation of the Master Key encryption keys. When a key is rotated:
*   New data is encrypted with the new key.
*   Old data is lazily re-encrypted (or eagerly via background jobs).
*   Old keys are securely destroyed.

## Path to Quantum Resistance

Geode's architecture is built for **Crypto-Agility**—the ability to swap out cryptographic primitives without rewriting the core application.

### Hybrid Key Exchange (Upcoming)
We are actively integrating hybrid key exchange mechanisms (X25519 + Kyber/ML-KEM). This "hybrid" approach combines the battle-tested security of classical ECC with the quantum-resistance of lattice-based cryptography. This ensures that:
*   If the PQ algorithm has a flaw, the classical ECC still protects the data.
*   If a quantum computer attacks, the PQ algorithm protects the data.

### Post-Quantum Signatures
For authentication and integrity (e.g., commit logs, backups), we are evaluating **Dilithium (ML-DSA)** and **SPHINCS+** for future implementation. The larger signature sizes of these algorithms are mitigated by Geode's efficient binary protocol and compression layers.

## Comparison of Algorithmic Choices

| Feature | Legacy Standard | Geode Standard | Post-Quantum Readiness |
| :--- | :--- | :--- | :--- |
| **Symmetric** | AES-128-CBC | **AES-256-GCM** | ✅ Quantum Safe (128-bit margin) |
| **Hashing** | SHA-1 / SHA-256 | **BLAKE3 / SHA-384** | ✅ Collision Resistant |
| **Key Exchange** | RSA-2048 | **X25519** | ⚠️ Vulnerable (Requires Hybrid Upgrade) |
| **Signatures** | RSA-2048 | **Ed25519** | ⚠️ Vulnerable (Requires Dilithium Upgrade) |
| **Transport** | TLS 1.2 | **TLS 1.3 (QUIC)** | ✅ Enforced Forward Secrecy |

## Implementation for Developers

To leverage Geode's Post-Quantum readiness features:

1.  **Use Official Clients**: Our Go, Python, Rust, Node.js, and Zig clients negotiate the highest shared security protocol automatically.
2.  **Enable Key Rotation**: Configure your KMS provider to rotate keys every 90 days.
3.  **Avoid Static Keys**: Never hardcode encryption keys. Use the environment-based KMS integration.
4.  **Use Field-Level Encryption**: For highly sensitive fields (PII, secrets), use Geode's client-side FLE, which ensures the server (and any potential quantum attacker of the database files) never sees the plaintext.

## Conclusion

The transition to the Post-Quantum era is not a single event but a process. Geode's commitment to **Forward Secrecy**, **AES-256 defaults**, and **Modular Cryptography** ensures your data remains secure against both today's hackers and tomorrow's quantum computers.
