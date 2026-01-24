---
title: "Connection Management & Security"
description: "Comprehensive guide to connection management and security in Geode. Learn about QUIC transport, TLS configuration, connection pooling, authentication, and best practices for secure database connections."
keywords:
  - connection management
  - connection pooling
  - QUIC
  - TLS
  - secure connections
  - authentication
  - connection security
  - client connections
  - Geode
  - graph database
  - network security
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/connections/"
    noindex: false
    title: "Connection Management & Security - Geode Graph Database"
    description: "Manage secure connections to Geode with QUIC transport, TLS 1.3 encryption, connection pooling, and enterprise authentication. Learn connection best practices and security."
---

Connection management in Geode encompasses establishing secure connections, managing connection pools, handling authentication, and optimizing network performance. Geode uses modern QUIC transport with TLS 1.3 encryption by default, providing secure and efficient connections for all client operations.

## Connection Architecture

Geode implements a modern connection architecture built on:

- **QUIC Transport**: UDP-based transport with built-in encryption and multiplexing
- **TLS 1.3**: Latest transport layer security for all connections
- **Connection Pooling**: Efficient resource management for high-throughput applications
- **Session Management**: Stateful sessions with authentication and context
- **Load Balancing**: Automatic distribution across cluster nodes

### Default Connection Settings

```bash
# Server listens on standard port 3141
geode serve --listen 0.0.0.0:3141

# Alternative secure port 8443
geode serve --listen 0.0.0.0:8443

# IPv6 support
geode serve --listen [::]:3141
```

## QUIC Transport

Geode uses QUIC (Quick UDP Internet Connections) as its primary transport protocol, providing advantages over traditional TCP:

### Benefits of QUIC

- **Faster Connection Establishment**: 0-RTT and 1-RTT connection setup vs TCP's 3-way handshake
- **No Head-of-Line Blocking**: Independent streams don't block each other
- **Built-in Encryption**: TLS 1.3 encryption mandatory, not optional
- **Connection Migration**: Connections survive IP address changes
- **Multiplexing**: Multiple queries over single connection without interference

### QUIC Configuration

```bash
# Basic QUIC configuration (uses defaults)
geode serve --transport=quic

# Advanced QUIC tuning
geode serve --transport=quic \
  --quic-max-streams=1000 \
  --quic-max-idle-timeout=300s \
  --quic-initial-rtt=100ms \
  --quic-congestion-control=cubic
```

### QUIC vs TCP

| Feature | QUIC | TCP |
|---------|------|-----|
| Connection Setup | 0-1 RTT | 1-3 RTT |
| Encryption | Built-in TLS 1.3 | Optional |
| Head-of-Line Blocking | None | Yes |
| Connection Migration | Yes | No |
| Multiplexing | Native | Requires HTTP/2 |

## TLS Configuration

All Geode connections are encrypted using TLS 1.3:

### Basic TLS Setup

```bash
# Generate self-signed certificate for development
geode cert-gen --output-dir=/etc/geode/certs \
  --common-name=geode.example.com \
  --validity-days=365

# Start server with TLS
geode serve --tls-cert=/etc/geode/certs/server.crt \
  --tls-key=/etc/geode/certs/server.key
```

### Production TLS Configuration

```bash
# Use production certificates from CA
geode serve --tls-cert=/etc/geode/certs/production.crt \
  --tls-key=/etc/geode/certs/production.key \
  --tls-ca=/etc/geode/certs/ca-bundle.crt \
  --tls-min-version=1.3 \
  --tls-cipher-suites=TLS_AES_256_GCM_SHA384,TLS_CHACHA20_POLY1305_SHA256
```

### Mutual TLS (mTLS)

Require clients to present valid certificates:

```bash
# Enable mutual TLS authentication
geode serve --require-client-certificates=true \
  --client-ca=/etc/geode/certs/client-ca.crt \
  --verify-client-certificates=strict

# Allow specific client certificates
geode serve --require-client-certificates=true \
  --client-cert-allowlist=/etc/geode/allowed-clients.txt
```

Client connection with certificate:

```python
# Python client with mTLS
from geode_client import GeodeClient

client = GeodeClient(
    host='geode.example.com',
    port=3141,
    tls_cert='/etc/client/client.crt',
    tls_key='/etc/client/client.key',
    tls_ca='/etc/client/ca.crt'
)
```

## Connection Pooling

Connection pools manage multiple connections efficiently:

### Server-Side Connection Limits

```bash
# Configure server connection limits
geode serve --max-connections=10000 \
  --max-connections-per-ip=100 \
  --connection-timeout=30s \
  --idle-timeout=300s
```

### Client-Side Connection Pooling

**Go Client**

```go
import "go.codepros.org/geode"

// Create connection pool
pool, err := geode.NewConnectionPool(&geode.PoolConfig{
    Host:            "geode.example.com",
    Port:            3141,
    MinConnections:  10,
    MaxConnections:  100,
    MaxIdleTime:     300 * time.Second,
    HealthCheckInterval: 30 * time.Second,
})

// Pool automatically manages connections
result, err := pool.Query("MATCH (p:Person) RETURN p")
```

**Python Client**

```python
from geode_client import GeodeClient

# Create connection pool
client = GeodeClient(
    host='geode.example.com',
    port=3141,
    pool_size=50,
    pool_max_overflow=20,
    pool_timeout=30,
    pool_recycle=3600
)

# Pool handles connection management
async with client.session() as session:
    result = await session.run("MATCH (p:Person) RETURN p")
```

**Rust Client**

```rust
use geode_client::{Client, PoolConfig};

// Create connection pool
let config = PoolConfig {
    min_connections: 10,
    max_connections: 100,
    acquire_timeout: Duration::from_secs(30),
    idle_timeout: Some(Duration::from_secs(300)),
    ..Default::default()
};

let client = Client::with_pool("geode.example.com:3141", config).await?;

// Acquire connection from pool
let result = client.query("MATCH (p:Person) RETURN p").await?;
```

### Connection Pool Best Practices

1. **Size appropriately**: Pool size should match expected concurrent queries
2. **Set idle timeouts**: Reclaim unused connections automatically
3. **Enable health checks**: Detect and remove failed connections
4. **Monitor pool metrics**: Track utilization, wait times, and failures
5. **Use connection recycling**: Periodically refresh connections to detect issues

## Authentication

Secure connection authentication methods:

### Username/Password Authentication

```bash
# Server with password authentication
geode serve --auth-method=password \
  --user-database=/etc/geode/users.db
```

Client connection:

```python
client = GeodeClient(
    host='geode.example.com',
    port=3141,
    username='alice@example.com',
    password='SecureP@ssw0rd'
)
```

### Token-Based Authentication

```bash
# Server with JWT token authentication
geode serve --auth-method=jwt \
  --jwt-secret-key-file=/etc/geode/jwt-secret.key \
  --jwt-issuer=geode.example.com \
  --jwt-audience=geode-api
```

Client with token:

```python
client = GeodeClient(
    host='geode.example.com',
    port=3141,
    auth_token='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
)
```

### OAuth 2.0 / OpenID Connect

```bash
# Server with OAuth 2.0
geode serve --auth-method=oauth2 \
  --oauth2-provider=https://auth.example.com \
  --oauth2-client-id=geode-server \
  --oauth2-client-secret-file=/etc/geode/oauth-secret.txt
```

### LDAP Authentication

```bash
# Server with LDAP authentication
geode serve --auth-method=ldap \
  --ldap-server=ldap://ldap.example.com:389 \
  --ldap-base-dn="dc=example,dc=com" \
  --ldap-bind-dn="cn=geode,ou=services,dc=example,dc=com" \
  --ldap-bind-password-file=/etc/geode/ldap-password.txt
```

### Multi-Factor Authentication

```bash
# Require MFA for connections
geode serve --require-mfa=true \
  --mfa-providers=totp,webauthn \
  --mfa-grace-period=0
```

## Session Management

### Session Configuration

```bash
# Configure session behavior
geode serve --session-timeout=1800 \
  --session-max-idle=900 \
  --session-max-lifetime=86400 \
  --persistent-sessions=true
```

### Session Variables

Set session-specific variables:

```gql
-- Set session variables
SET SESSION tenant_id = 'tenant_123';
SET SESSION timeout = 3600;
SET SESSION isolation_level = 'SNAPSHOT';

-- Query session settings
SHOW SESSION VARIABLES;

-- Reset session variable
RESET SESSION tenant_id;
```

### Session Monitoring

```bash
# View active sessions
geode sessions list

# Terminate specific session
geode sessions kill --session-id=sess_abc123

# Terminate idle sessions
geode sessions cleanup --idle-timeout=1800
```

## Connection Security Best Practices

### Network Security

```bash
# Bind to specific interface
geode serve --listen 10.0.1.50:3141

# Use firewall to restrict access
# Allow only application servers
iptables -A INPUT -p udp --dport 3141 -s 10.0.2.0/24 -j ACCEPT
iptables -A INPUT -p udp --dport 3141 -j DROP
```

### Rate Limiting

```bash
# Limit connection rate per IP
geode serve --rate-limit-connections=100/min \
  --rate-limit-queries=1000/min \
  --rate-limit-bandwidth=100mbps
```

### IP Allowlisting

```bash
# Only allow specific IPs to connect
geode serve --ip-allowlist=/etc/geode/allowed-ips.txt

# /etc/geode/allowed-ips.txt:
# 10.0.2.0/24
# 192.168.1.100
# 2001:db8::/32
```

### Automatic Blocking

```bash
# Block IPs with failed authentication attempts
geode serve --auto-block-failed-auth=true \
  --failed-auth-threshold=5 \
  --failed-auth-window=300s \
  --block-duration=3600s
```

## Connection Monitoring

### Connection Metrics

```bash
# View connection statistics
geode stats --component=connections

# Example output:
# Active Connections: 1,247
# Peak Connections: 2,456
# Total Connections: 15,234,567
# Failed Connections: 123
# Average Connection Duration: 45.3s
# Connection Pool Utilization: 62%
```

### Connection Logging

```bash
# Enable connection audit logging
geode serve --log-connections=true \
  --log-level=info \
  --log-file=/var/log/geode/connections.log
```

Example log entry:

```
2026-01-24T10:15:32.123Z INFO connection_accepted
  remote_addr=192.168.1.100:54321
  session_id=sess_abc123
  user=alice@example.com
  tls_version=1.3
  cipher_suite=TLS_AES_256_GCM_SHA384
```

### Health Checks

```bash
# HTTP health check endpoint
geode serve --health-check-enabled=true \
  --health-check-port=8080 \
  --health-check-path=/health

# Check health
curl http://geode.example.com:8080/health
# {"status": "healthy", "connections": 1247, "uptime": 86400}
```

## Connection Troubleshooting

### Connection Refused

Check:
1. Server is running: `systemctl status geode`
2. Firewall allows connections: `iptables -L`
3. Correct port number
4. Server listening on correct interface

```bash
# Verify server is listening
netstat -ulnp | grep 3141
# Should show: udp 0.0.0.0:3141 ... geode
```

### TLS Handshake Failures

```bash
# Test TLS connection
openssl s_client -connect geode.example.com:3141 \
  -tls1_3 -showcerts

# Verify certificate
geode cert-verify --cert=/etc/geode/certs/server.crt
```

### Connection Timeouts

```bash
# Increase client timeout
client = GeodeClient(
    host='geode.example.com',
    connection_timeout=60,  # 60 seconds
    query_timeout=300       # 5 minutes
)

# Increase server timeout
geode serve --connection-timeout=60s \
  --query-timeout=300s
```

### Pool Exhaustion

If connection pool is exhausted:

1. Increase pool size
2. Reduce connection hold time
3. Enable connection recycling
4. Check for connection leaks

```bash
# Monitor pool usage
geode stats --component=connection-pool \
  --interval=1s \
  --duration=60s
```

## Performance Optimization

### Connection Reuse

```python
# Reuse connections efficiently
async with client.session() as session:
    # Reuse same connection for multiple queries
    await session.run("MATCH (p:Person {id: $id}) RETURN p", id=1)
    await session.run("MATCH (c:Company {id: $id}) RETURN c", id=2)
    await session.run("MATCH (p:Product {id: $id}) RETURN p", id=3)
```

### Batching

```python
# Batch multiple queries in single round-trip
async with client.session() as session:
    batch = session.batch()
    batch.add("MATCH (p:Person {id: $id}) RETURN p", id=1)
    batch.add("MATCH (c:Company {id: $id}) RETURN c", id=2)
    batch.add("MATCH (p:Product {id: $id}) RETURN p", id=3)
    results = await batch.execute()
```

### Connection Warmup

```bash
# Pre-warm connection pool on startup
geode connection-pool warmup --size=50 \
  --target=geode.example.com:3141
```

## Related Topics

- [Encryption](/tags/encryption/) - Data encryption in transit and at rest
- [Authentication](/docs/security/authentication/) - User authentication methods
- [Sessions](/tags/sessions/) - Session management and configuration
- [Configuration](/tags/configuration/) - Server and client configuration
- [Performance](/docs/performance/) - Performance tuning and optimization
- [Monitoring](/docs/operations/monitoring/) - Monitoring and observability
- [High Availability](/docs/deployment/ha/) - Cluster configuration and load balancing
- [Client Libraries](/docs/clients/) - Language-specific client documentation
