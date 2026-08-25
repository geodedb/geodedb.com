---
title: "TLS Encryption and Transport Security"
description: "Complete guide to TLS 1.3 encryption in Geode. Learn about certificate management, cipher suite configuration, mutual TLS authentication, and secure transport over QUIC for protecting data in transit."
keywords:
  - TLS
  - TLS 1.3
  - encryption
  - transport security
  - certificates
  - cipher suites
  - mTLS
  - mutual TLS
  - QUIC
  - secure connections
  - data in transit
  - Geode
  - graph database
  - enterprise security
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/tls/"
    noindex: false
    title: "TLS 1.3 Encryption and Transport Security - Geode Graph Database"
    description: "Secure your Geode connections with TLS 1.3 encryption. Configure certificates, cipher suites, and mutual TLS for enterprise-grade transport security over QUIC."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

Transport Layer Security (TLS) provides encryption for all data transmitted between Geode clients and servers. Geode exclusively uses TLS 1.3, the most secure version of the TLS protocol, integrated with the QUIC transport protocol for optimal performance and security. This combination delivers encrypted, authenticated, and integrity-protected communications with minimal latency.

## TLS 1.3 Overview

TLS 1.3 offers significant improvements over earlier versions:

- **Faster Handshakes**: 1-RTT handshakes (0-RTT for resumption)
- **Stronger Cryptography**: Only modern, secure cipher suites
- **Forward Secrecy**: All cipher suites provide forward secrecy
- **Reduced Attack Surface**: Removed legacy features and algorithms
- **Simplified Protocol**: Cleaner, more auditable implementation

### QUIC + TLS Integration

Geode uses QUIC as its transport protocol, which integrates TLS 1.3 directly:

```
Client                                      Server
  |                                           |
  |--- QUIC Initial (Client Hello) --------->|
  |                                           |
  |<-- QUIC Handshake (Server Hello) --------|
  |<-- Certificate, Finished ----------------|
  |                                           |
  |--- Finished ----------------------------->|
  |                                           |
  |<======= Encrypted Application Data ======>|
```

Benefits of QUIC + TLS:

- Single round-trip connection establishment
- Encrypted transport from the first packet
- Multiplexed streams without head-of-line blocking
- Connection migration between networks
- Built-in congestion control

## Server TLS Configuration

### Basic Configuration

```bash
# Minimal TLS configuration
geode serve --tls-cert=/etc/geode/certs/server.crt \
  --tls-key=/etc/geode/certs/server.key

# With certificate chain
geode serve --tls-cert=/etc/geode/certs/server-chain.crt \
  --tls-key=/etc/geode/certs/server.key \
  --tls-ca=/etc/geode/certs/ca.crt
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
    ca_file: "/etc/geode/certs/ca.crt"

    # TLS 1.3 is the only supported version
    min_version: "1.3"
    max_version: "1.3"

    # Cipher suite preferences (TLS 1.3 suites only)
    cipher_suites:
      - TLS_AES_256_GCM_SHA384
      - TLS_CHACHA20_POLY1305_SHA256
      - TLS_AES_128_GCM_SHA256

    # Certificate verification
    verify_client: false
    verify_server: true
```

### Cipher Suites

Geode supports the following TLS 1.3 cipher suites:

| Cipher Suite | Description | Recommendation |
|-------------|-------------|----------------|
| TLS_AES_256_GCM_SHA384 | AES-256 with GCM mode | Preferred for high security |
| TLS_CHACHA20_POLY1305_SHA256 | ChaCha20-Poly1305 | Preferred for mobile/ARM |
| TLS_AES_128_GCM_SHA256 | AES-128 with GCM mode | Good balance of security/performance |

```bash
# Specify cipher suite order
geode serve --tls-cipher-suites=TLS_AES_256_GCM_SHA384,TLS_CHACHA20_POLY1305_SHA256
```

## Certificate Management

### Generating Certificates

#### Self-Signed Certificates (Development)

```bash
# Generate CA certificate
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key \
  -out ca.crt \
  -subj "/CN=Geode Development CA/O=Development"

# Generate server certificate
openssl genrsa -out server.key 4096
openssl req -new -key server.key \
  -out server.csr \
  -subj "/CN=geode.local/O=Development"

# Sign server certificate
openssl x509 -req -days 365 \
  -in server.csr \
  -CA ca.crt -CAkey ca.key \
  -CAcreateserial \
  -out server.crt \
  -extfile <(printf "subjectAltName=DNS:geode.local,DNS:localhost,IP:127.0.0.1")
```

#### Using Geode's Certificate Generator

```bash
# Generate self-signed certificate
geode cert-gen --output-dir=/etc/geode/certs \
  --common-name=geode.example.com \
  --san=DNS:geode.example.com,DNS:localhost,IP:127.0.0.1 \
  --validity-days=365

# Generate CA and server certificates
geode cert-gen --mode=ca \
  --output-dir=/etc/geode/certs \
  --common-name="Geode Internal CA"

geode cert-gen --mode=server \
  --output-dir=/etc/geode/certs \
  --ca-cert=/etc/geode/certs/ca.crt \
  --ca-key=/etc/geode/certs/ca.key \
  --common-name=geode.example.com \
  --san=DNS:geode.example.com,DNS:*.geode.example.com
```

#### Certificate Signing Request (Production)

```bash
# Generate CSR for external CA
geode cert-gen --csr-only \
  --output=/etc/geode/certs/geode.csr \
  --key-output=/etc/geode/certs/geode.key \
  --common-name=geode.production.example.com \
  --san=DNS:geode.production.example.com \
  --organization="Example Corp" \
  --country=US

# Submit CSR to your CA, receive signed certificate
# Place signed certificate as server.crt
```

### Certificate Chain Configuration

```bash
# Concatenate certificates in order: server, intermediate, root
cat server.crt intermediate.crt root.crt > server-chain.crt

# Configure Geode with chain
geode serve --tls-cert=/etc/geode/certs/server-chain.crt \
  --tls-key=/etc/geode/certs/server.key
```

### Certificate Rotation

```bash
# Hot reload certificates without restart
geode cert-rotate --new-cert=/etc/geode/certs/new-server.crt \
  --new-key=/etc/geode/certs/new-server.key \
  --graceful=true \
  --overlap-duration=1h

# Verify rotation
geode tls-status
# Output:
# Current Certificate: /etc/geode/certs/new-server.crt
# Valid Until: 2027-01-28T00:00:00Z
# Cipher: TLS_AES_256_GCM_SHA384
```

### Automatic Certificate Renewal (ACME/Let's Encrypt)

```yaml
# geode.yaml
tls:
  acme:
    enabled: true
    email: admin@example.com
    domains:
      - geode.example.com
    directory_url: https://acme-v02.api.letsencrypt.org/directory
    storage_path: /etc/geode/acme
    renewal_days_before: 30
```

## Mutual TLS (mTLS)

Mutual TLS requires clients to present certificates for authentication, providing strong machine-to-machine authentication.

### Server Configuration for mTLS

```bash
# Require client certificates
geode serve --tls-cert=/etc/geode/certs/server.crt \
  --tls-key=/etc/geode/certs/server.key \
  --tls-client-ca=/etc/geode/certs/client-ca.crt \
  --require-client-certificates=true \
  --verify-client-certificates=true
```

### Configuration File

```yaml
# geode.yaml
tls:
  enabled: true
  cert_file: "/etc/geode/certs/server.crt"
  key_file: "/etc/geode/certs/server.key"

  client_auth:
    enabled: true
    required: true
    ca_file: "/etc/geode/certs/client-ca.crt"
    verify: true

    # Optional: Certificate pinning
    allowed_certs:
      - "/etc/geode/certs/allowed/app1.crt"
      - "/etc/geode/certs/allowed/app2.crt"

    # Optional: Subject name requirements
    allowed_subjects:
      - "CN=app-service,O=Example Corp"
      - "CN=etl-service,O=Example Corp"
```

### Generating Client Certificates

```bash
# Generate client key
openssl genrsa -out client.key 4096

# Generate CSR
openssl req -new -key client.key \
  -out client.csr \
  -subj "/CN=app-service/O=Example Corp"

# Sign with client CA
openssl x509 -req -days 365 \
  -in client.csr \
  -CA client-ca.crt -CAkey client-ca.key \
  -CAcreateserial \
  -out client.crt
```

### Client Connection with Certificate

```bash
# Shell connection with client certificate
geode shell --host=geode.example.com:3141 \
  --tls-cert=/path/to/client.crt \
  --tls-key=/path/to/client.key \
  --tls-ca=/path/to/ca.crt
```

### Client Library Configuration

**Go Client**:

```go
import (
    "crypto/tls"
    "geodedb.com/geode"
)

// Load client certificate
cert, err := tls.LoadX509KeyPair("client.crt", "client.key")
if err != nil {
    log.Fatal(err)
}

// Load CA certificate
caCert, err := os.ReadFile("ca.crt")
if err != nil {
    log.Fatal(err)
}
caCertPool := x509.NewCertPool()
caCertPool.AppendCertsFromPEM(caCert)

// Configure client
config := &geode.Config{
    Host: "geode.example.com:3141",
    TLS: &geode.TLSConfig{
        Certificates: []tls.Certificate{cert},
        RootCAs:      caCertPool,
    },
}

client, err := geode.NewClient(config)
```

**Python Client**:

```python
from geode_client import Client, TLSConfig

tls_config = TLSConfig(
    cert_file="/path/to/client.crt",
    key_file="/path/to/client.key",
    ca_file="/path/to/ca.crt",
    verify=True
)

client = Client(
    host="geode.example.com",
    port=3141,
    tls=tls_config
)
```

**Rust Client**:

```rust
use geode_client::{Client, TlsConfig};
use std::path::PathBuf;

let tls_config = TlsConfig::new()
    .with_cert(PathBuf::from("client.crt"))
    .with_key(PathBuf::from("client.key"))
    .with_ca(PathBuf::from("ca.crt"));

let client = Client::builder()
    .host("geode.example.com")
    .port(3141)
    .tls(tls_config)
    .build()
    .await?;
```

## Certificate Pinning

Pin specific certificates for additional security:

```yaml
# geode.yaml
tls:
  pinning:
    enabled: true
    mode: "strict"  # strict, report, or disabled

    # Pin by public key hash (SPKI)
    pins:
      - "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB="
      - "sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC="

    # Pin by certificate fingerprint
    fingerprints:
      - "sha256:AA:BB:CC:DD:..."
```

## OCSP and Certificate Revocation

### OCSP Stapling

```yaml
# geode.yaml
tls:
  ocsp:
    stapling: true
    responder_url: "http://ocsp.example.com"
    cache_duration: 3600  # seconds

    # Fail-open or fail-closed on OCSP failure
    strict: false
```

### CRL Configuration

```yaml
# geode.yaml
tls:
  crl:
    enabled: true
    urls:
      - "http://crl.example.com/ca.crl"
    refresh_interval: 3600  # seconds
    cache_path: "/var/cache/geode/crl"
```

## Session Resumption

TLS 1.3 supports efficient session resumption:

```yaml
# geode.yaml
tls:
  session_resumption:
    enabled: true
    ticket_lifetime: 86400  # 24 hours
    max_early_data: 16384   # bytes

    # 0-RTT early data (use with caution)
    allow_0rtt: false  # Vulnerable to replay attacks
```

### 0-RTT Considerations

```yaml
# Enable 0-RTT only for read-only operations
tls:
  session_resumption:
    allow_0rtt: true
    0rtt_allowed_operations:
      - "SELECT"
      - "MATCH"
    0rtt_replay_protection: true
```

## TLS Monitoring and Debugging

### Connection Status

```bash
# Check TLS status
geode tls-status

# Output:
# TLS Version: 1.3
# Cipher Suite: TLS_AES_256_GCM_SHA384
# Certificate Subject: CN=geode.example.com
# Certificate Issuer: CN=Example CA
# Certificate Valid: 2025-01-01 to 2026-01-01
# Client Auth: Required
# OCSP Stapling: Enabled
```

### TLS Metrics

```bash
# View TLS metrics
geode metrics | grep tls

# tls_handshakes_total{version="1.3",cipher="TLS_AES_256_GCM_SHA384"} 15234
# tls_handshake_errors_total{reason="expired_certificate"} 3
# tls_handshake_duration_seconds{quantile="0.99"} 0.045
# tls_client_auth_failures_total 12
```

### Debug Logging

```bash
# Enable TLS debug logging
geode serve --log-level=debug --log-components=tls

# Log output includes:
# [TLS] ClientHello received from 192.168.1.100
# [TLS] Selected cipher suite: TLS_AES_256_GCM_SHA384
# [TLS] Client certificate verified: CN=app-service
# [TLS] Handshake completed in 23ms
```

### Testing TLS Configuration

```bash
# Test with OpenSSL
openssl s_client -connect geode.example.com:3141 \
  -CAfile ca.crt \
  -cert client.crt \
  -key client.key

# Test cipher suites
nmap --script ssl-enum-ciphers -p 3141 geode.example.com

# Test certificate chain
openssl verify -CAfile ca.crt server.crt
```

## Security Best Practices

### 1. Use Strong Key Sizes

```bash
# RSA: 4096 bits minimum for long-term keys
openssl genrsa -out server.key 4096

# ECDSA: P-384 or P-521 curves
openssl ecparam -genkey -name secp384r1 -out server.key

# Ed25519: Modern, fast, secure
openssl genpkey -algorithm ED25519 -out server.key
```

### 2. Protect Private Keys

```bash
# Restrict file permissions
chmod 400 /etc/geode/certs/server.key
chown geode:geode /etc/geode/certs/server.key

# Use encrypted key storage
geode serve --tls-key-password-file=/etc/geode/secrets/key-password
```

### 3. Implement Certificate Monitoring

```yaml
# Alert on certificate expiration
# NOTE: `monitoring:` is not a configuration-file section — it is ignored.
# The Prometheus listener is opt-in and env-only:
#   GEODE_METRICS_PORT=9090   (serves /metrics and /health)
#   GEODE_METRICS_BIND=127.0.0.1
```

### 4. Regular Security Audits

```bash
# Check for weak configurations
geode security-audit --component=tls

# Output:
# [PASS] TLS version 1.3 only
# [PASS] Strong cipher suites
# [PASS] Certificate valid for 180 days
# [WARN] OCSP stapling not enabled
# [PASS] Client authentication required
```

### 5. Defense in Depth

```yaml
# Combine TLS with network security
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS

  network:
    allowed_ips:
      - "10.0.0.0/8"
      - "192.168.1.0/24"
    rate_limiting:
      enabled: true
      max_connections_per_ip: 100
```

## Troubleshooting

### Certificate Errors

```bash
# Verify certificate chain
openssl verify -CAfile ca.crt -untrusted intermediate.crt server.crt

# Check certificate details
openssl x509 -in server.crt -noout -text

# Check for SAN entries
openssl x509 -in server.crt -noout -ext subjectAltName
```

### Handshake Failures

```bash
# Debug handshake
GEODE_TLS_DEBUG=1 geode shell --host=geode.example.com:3141

# Common issues:
# - Certificate not trusted: Add CA to trust store
# - Hostname mismatch: Check SAN entries
# - Expired certificate: Renew certificate
# - Cipher mismatch: Check supported ciphers
```

### Performance Issues

```bash
# Check handshake latency
geode metrics | grep handshake_duration

# Enable session resumption for repeat connections
# Verify 0-RTT is working for allowed operations
# Check for OCSP lookup delays
```

## Related Topics

- [Encryption](/tags/encryption/) - Data encryption at rest
- [Security](/tags/security/) - Security overview
- [Authentication](/tags/authentication/) - Identity verification
- [Compliance](/tags/compliance/) - Regulatory requirements
- [Cryptography](/tags/cryptography/) - Cryptographic foundations
- [QUIC Protocol](/tags/protocol/) - Transport protocol details

## Further Reading

- [Security Architecture](/docs/architecture/security-architecture/) - Security design
- [Deployment Guide](/docs/ops/deployment/) - Production deployment
- [Network Configuration](/docs/configuration/) - Network settings
- TLS Best Practices Whitepaper - Enterprise TLS guidance
