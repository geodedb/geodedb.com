---
title: "Forward Secrecy and Ephemeral Key Exchange"
description: "Complete guide to Perfect Forward Secrecy (PFS) in Geode. Learn how TLS 1.3 ephemeral key exchange protects past sessions from future key compromise, with configuration examples and security best practices."
keywords:
  - forward secrecy
  - perfect forward secrecy
  - PFS
  - ephemeral keys
  - key exchange
  - TLS 1.3
  - ECDHE
  - X25519
  - Diffie-Hellman
  - session security
  - key compromise
  - cryptographic security
  - Geode
  - graph database
  - enterprise security
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/forward-secrecy/"
    noindex: false
    title: "Forward Secrecy (PFS) in TLS 1.3 - Geode Graph Database"
    description: "Protect past communications with Perfect Forward Secrecy in Geode. TLS 1.3 ephemeral key exchange ensures session data remains secure even if long-term keys are compromised."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

Forward Secrecy, also known as Perfect Forward Secrecy (PFS), is a critical security property that Geode enforces through mandatory TLS 1.3. This cryptographic feature ensures that even if an attacker compromises your server's long-term private key in the future, they cannot decrypt previously recorded encrypted sessions. Geode's implementation of forward secrecy protects your graph data against "store now, decrypt later" attacks, making it essential for long-term data confidentiality.

## Understanding Forward Secrecy

Forward secrecy addresses a fundamental vulnerability in traditional public key cryptography: if an attacker records encrypted traffic today and later obtains the server's private key (through theft, legal compulsion, or cryptographic advances), they could decrypt all historical communications.

### The Problem Without Forward Secrecy

Without forward secrecy, a single key compromise can be catastrophic:

```
Time T1: Attacker records encrypted traffic
         Client <------ Encrypted Session ------> Server
                        (Recorded by attacker)

Time T2: Server's private key compromised
         Attacker obtains server private key

Time T3: Historical decryption possible
         Attacker decrypts ALL recorded sessions
```

This vulnerability is particularly concerning because:

- **Nation-state adversaries** may record encrypted traffic at scale
- **Storage costs** continue to decrease, making bulk storage feasible
- **Quantum computers** may eventually break current asymmetric cryptography
- **Key theft** through breaches or insider threats is always possible

### How Forward Secrecy Protects Data

With forward secrecy, each session uses unique ephemeral keys:

```
Session 1:
  Client generates ephemeral key pair K1
  Server generates ephemeral key pair K1'
  Session key derived from K1 and K1'
  K1 and K1' deleted after session

Result: Compromising server's long-term key
        reveals NOTHING about past sessions
```

## TLS 1.3 and Forward Secrecy

Geode exclusively uses TLS 1.3, which mandates forward secrecy for all connections. Unlike earlier TLS versions where forward secrecy was optional, TLS 1.3 removed all non-forward-secret cipher suites.

### TLS 1.3 Key Exchange

| Algorithm | Description | Performance | Security Level |
|-----------|-------------|-------------|----------------|
| X25519 | Curve25519 ECDHE | Fastest | 128-bit equivalent |
| secp384r1 | P-384 ECDHE | Fast | 192-bit equivalent |

### The TLS 1.3 Handshake

```
Client                                          Server
  |---- ClientHello + Key Share (X25519) ------->|
  |<--- ServerHello + Key Share (X25519) --------|
  |<--- {EncryptedExtensions, Certificate} ------|
  |<--- {CertificateVerify, Finished} -----------|
  |--- {Finished} ------------------------------>|
  |<========= Application Data (Encrypted) =====>|

Key Points:
- Both parties contribute ephemeral keys
- Session keys derived from ephemeral exchange
- Long-term keys only used for authentication
- Ephemeral keys discarded after handshake
```

## Geode Configuration

### Default Configuration

Geode enables forward secrecy by default with optimal settings:

```bash
# Forward secrecy is automatic with TLS 1.3
geode serve --tls-cert=/etc/geode/certs/server.crt \
  --tls-key=/etc/geode/certs/server.key

# Check forward secrecy status
geode tls-status --verbose
# TLS Version: 1.3
# Key Exchange: X25519 (ECDHE)
# Forward Secrecy: Enabled
```

### Configuration File

```yaml
# geode.yaml
server:
  listen: "0.0.0.0:3141"

  tls:
    enabled: true
    cert_file: "/etc/geode/certs/server.crt"
    key_file: "/etc/geode/certs/server.key"
    min_version: "1.3"
    max_version: "1.3"

    key_exchange_preferences:
      - X25519        # Fastest, recommended
      - secp384r1     # Higher security level

    cipher_suites:
      - TLS_AES_256_GCM_SHA384
      - TLS_CHACHA20_POLY1305_SHA256
```

### Verifying Forward Secrecy

```bash
# Test with OpenSSL
openssl s_client -connect geode.example.com:3141 -tls1_3 2>&1 | \
  grep -E "(Protocol|Cipher|Server Temp Key)"
# Protocol  : TLSv1.3
# Cipher    : TLS_AES_256_GCM_SHA384
# Server Temp Key: X25519, 253 bits
```

## Client Library Configuration

**Go Client**:

```go
config := &geode.Config{
    Host: "geode.example.com:3141",
    TLS: &geode.TLSConfig{
        MinVersion: tls.VersionTLS13,  // Enforces forward secrecy
        CurvePreferences: []tls.CurveID{tls.X25519, tls.CurveP384},
    },
}
client, err := geode.NewClient(config)
```

**Python Client**:

```python
tls_config = TLSConfig(
    ca_file="/path/to/ca.crt",
    min_version="TLSv1.3",  # Enforces forward secrecy
)
async with Client(host="geode.example.com", port=3141, tls=tls_config) as client:
    result = await client.query("MATCH (n:Sensitive) RETURN n")
```

**Rust Client**:

```rust
let tls_config = TlsConfig::new()
    .with_ca(PathBuf::from("ca.crt"))
    .with_min_version(TlsVersion::Tls13);
let client = Client::builder().host("geode.example.com").tls(tls_config).build().await?;
```

## Ephemeral Key Management

Geode handles ephemeral key management automatically with secure memory handling:

```yaml
# geode.yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

## Session Resumption

TLS 1.3 session resumption maintains forward secrecy through careful design:

```yaml
# geode.yaml
tls:
  session_resumption:
    enabled: true
    ticket_lifetime: 86400     # 24 hours
    ticket_rotation: 3600      # Rotate keys hourly
    allow_0rtt: false          # Disable for maximum security
```

| Mode | Forward Secrecy | Latency | Use Case |
|------|-----------------|---------|----------|
| Full Handshake | Full | 1-RTT | First connection |
| 1-RTT Resumption | Full | 1-RTT | Subsequent connections |
| 0-RTT Resumption | Partial | 0-RTT | Performance-critical reads |

## Quantum Computing Preparedness

Forward secrecy is especially important for quantum computing threats:

```
With Forward Secrecy:
- Even if future quantum computer breaks server key
- Past session keys remain protected
- Each session used unique ephemeral keys
- Historical traffic stays encrypted (AES-256 quantum-resistant)
```

## Monitoring and Verification

### TLS Metrics

```bash
geode metrics | grep -E "(tls_|forward_secrecy)"
# tls_handshakes_total{key_exchange="X25519"} 15234
# tls_forward_secrecy_enabled 1
```

### Audit Logging

```yaml
audit:
  enabled: true
  log_tls_parameters: true
  include: [tls_version, cipher_suite, key_exchange, forward_secrecy_status]
```

## Troubleshooting

```bash
# Check if forward secrecy is active
geode tls-verify --host=geode.example.com:3141
# TLS 1.3: Yes
# Forward Secrecy: Enabled
# Key Exchange: X25519
```

**Common Issues**:

- **TLS 1.2 connections rejected**: Update client to support TLS 1.3
- **Key exchange mismatch**: Ensure client and server share common algorithms
- **Protocol downgrade**: Verify min_version is set to "1.3"

## Related Topics

- [TLS Encryption](/tags/tls/) - Transport security configuration
- [Post-Quantum Cryptography](/tags/post-quantum/) - Future-proofing security
- [Encryption](/tags/encryption/) - Data encryption at rest
- [Security](/tags/security/) - Security overview
- [Authentication](/tags/authentication/) - Identity verification
- [Compliance](/tags/compliance/) - Regulatory requirements

## Further Reading

- [Security Architecture](/docs/architecture/security-architecture/) - Security design
- [Deployment Guide](/docs/ops/deployment/) - Production deployment
- [Session Management](/docs/security/session-management/) - Session security
- RFC 8446 - TLS 1.3 Specification
- NIST SP 800-52 Rev. 2 - TLS Implementation Guidelines
