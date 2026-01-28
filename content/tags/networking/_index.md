---
title: "Network Configuration"
description: "Comprehensive guide to Geode network configuration, QUIC protocol settings, TLS security, connection pooling, firewall setup, and network performance optimization."
keywords:
  - networking
  - network configuration
  - QUIC
  - TLS
  - connection pooling
  - firewall
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/networking/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Network Configuration

Network configuration is fundamental to Geode's performance, security, and reliability. Geode uses the modern QUIC protocol over UDP with mandatory TLS 1.3 encryption, providing superior performance compared to traditional TCP-based databases while maintaining enterprise-grade security.

## Introduction to Geode Networking

Geode's networking architecture is built on QUIC (Quick UDP Internet Connections), the same protocol powering HTTP/3. This choice delivers significant advantages: reduced connection latency through 0-RTT resumption, improved performance on lossy networks with better congestion control, native multiplexing without head-of-line blocking, and mandatory encryption with TLS 1.3.

Unlike traditional databases that use TCP, Geode's QUIC implementation provides better performance for distributed deployments, especially across geographic regions or unreliable networks.

The default port is 3141, with an alternative port 8443 for environments where only standard HTTPS ports are permitted. All communication is encrypted by default with no insecure fallback options.

## Basic Network Configuration

### Server Configuration

Configure Geode server network settings in `/etc/geode/geode.conf`:

```toml
[network]
# Listen address (0.0.0.0 for all interfaces)
listen_address = "0.0.0.0"

# Port configuration
port = 3141

# Enable IPv6
enable_ipv6 = true

# Maximum concurrent connections
max_connections = 10000

# Connection idle timeout (seconds)
idle_timeout = 300

# Keep-alive interval (seconds)
keep_alive_interval = 30
```

Start the server with network configuration:

```bash
# Start with default configuration
geode serve --listen 0.0.0.0:3141

# Bind to specific interface
geode serve --listen 192.168.1.100:3141

# Enable IPv6
geode serve --listen [::]:3141

# Custom port for restricted environments
geode serve --listen 0.0.0.0:8443
```

### Client Configuration

Configure client connections with connection strings:

```python
from geode_client import Client

# Basic connection
client = Client("localhost:3141")

# Explicit TLS configuration
client = Client("geode.example.com:3141", tls={
    "verify": True,
    "ca_cert": "/etc/ssl/certs/geode-ca.pem",
    "client_cert": "/etc/ssl/certs/client.pem",
    "client_key": "/etc/ssl/private/client-key.pem"
})

# Connection with custom timeout
client = Client("geode.example.com:3141",
    connect_timeout=10,
    idle_timeout=300
)
```

In Go:

```go
import "geodedb.com/geode"

// Basic connection
db, err := sql.Open("geode", "geode://localhost:3141/graph")

// With TLS configuration
db, err := sql.Open("geode",
    "geode://geode.example.com:3141/graph?"+
    "tls_verify=true&"+
    "ca_cert=/etc/ssl/certs/geode-ca.pem&"+
    "client_cert=/etc/ssl/certs/client.pem&"+
    "client_key=/etc/ssl/private/client-key.pem")
```

## QUIC Protocol Configuration

### QUIC Parameters

Optimize QUIC settings for your network environment:

```toml
[network.quic]
# Initial receive window (bytes)
initial_receive_window = 1048576  # 1 MB

# Maximum receive window (bytes)
max_receive_window = 16777216  # 16 MB

# Maximum idle timeout (milliseconds)
max_idle_timeout = 300000  # 5 minutes

# Enable 0-RTT connection resumption
enable_0rtt = true

# Maximum concurrent bidirectional streams
max_concurrent_streams = 1000

# Datagram frame support (for lightweight messages)
enable_datagrams = true

# Congestion control algorithm (cubic, bbr, newreno)
congestion_control = "cubic"
```

### Connection Migration

QUIC supports connection migration for mobile and roaming clients:

```toml
[network.quic.migration]
# Enable connection migration
enabled = true

# Allow migration to different IP addresses
allow_ip_migration = true

# Allow migration to different ports
allow_port_migration = true

# Maximum migration attempts
max_migration_attempts = 5
```

This feature is particularly valuable for applications with mobile clients or clients behind NAT that may change IP addresses.

## TLS Configuration

### Certificate Management

Configure TLS certificates for secure communication:

```bash
# Generate self-signed certificate for development
geode tls generate-cert \
  --output-dir=/etc/geode/tls \
  --hostname=geode.example.com \
  --validity-days=365

# Use Let's Encrypt for production
geode tls configure-letsencrypt \
  --domain=geode.example.com \
  --email=admin@example.com \
  --auto-renew=true
```

Server TLS configuration:

```toml
[network.tls]
# Certificate and key paths
cert_file = "/etc/geode/tls/server.crt"
key_file = "/etc/geode/tls/server.key"

# CA certificate for client verification
ca_cert_file = "/etc/geode/tls/ca.crt"

# Require client certificates
require_client_cert = false

# TLS minimum version (must be 1.3)
min_version = "1.3"

# Cipher suites (TLS 1.3 only)
cipher_suites = [
  "TLS_AES_256_GCM_SHA384",
  "TLS_AES_128_GCM_SHA256",
  "TLS_CHACHA20_POLY1305_SHA256"
]
```

### Mutual TLS (mTLS)

Enable mutual TLS for enhanced security:

```toml
[network.tls]
# Require client certificates
require_client_cert = true

# CA certificate for verifying clients
ca_cert_file = "/etc/geode/tls/client-ca.crt"

# Certificate revocation list
crl_file = "/etc/geode/tls/revocation-list.crl"

# Client certificate verification mode
verify_mode = "strict"  # strict, permissive, or optional
```

Client configuration for mTLS:

```python
client = Client("geode.example.com:3141", tls={
    "verify": True,
    "ca_cert": "/etc/ssl/certs/geode-ca.pem",
    "client_cert": "/etc/ssl/certs/my-client.pem",
    "client_key": "/etc/ssl/private/my-client-key.pem"
})
```

## Connection Pooling

### Server-Side Pooling

Configure server connection limits:

```toml
[network.connection_pool]
# Maximum connections per client IP
max_connections_per_ip = 100

# Maximum total connections
max_total_connections = 10000

# Connection queue size
connection_queue_size = 1000

# Connection acceptance rate limit
accept_rate_limit = 1000  # connections per second

# Enable connection pooling statistics
enable_statistics = true
```

### Client-Side Pooling

Configure client connection pools for optimal performance:

```python
from geode_client import Client, ConnectionPool

# Create connection pool
pool = ConnectionPool(
    url="geode.example.com:3141",
    min_connections=10,
    max_connections=100,
    max_idle_time=300,
    connection_timeout=10,
    acquire_timeout=5
)

# Use connection from pool
async with pool.acquire() as client:
    result, _ = await client.query("MATCH (n:User) RETURN n LIMIT 10")

# Pool statistics
stats = pool.get_statistics()
print(f"Active: {stats.active_connections}")
print(f"Idle: {stats.idle_connections}")
print(f"Wait queue: {stats.waiting_requests}")
```

In Go with database/sql:

```go
import (
    "database/sql"
    _ "geodedb.com/geode"
)

db, err := sql.Open("geode", "geode://localhost:3141/graph")

// Configure connection pool
db.SetMaxOpenConns(100)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(time.Minute * 5)
db.SetConnMaxIdleTime(time.Minute * 1)
```

## Firewall Configuration

### Inbound Rules

Configure firewall rules for Geode server:

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 3141/udp comment 'Geode QUIC'
sudo ufw allow from 10.0.0.0/8 to any port 3141 proto udp
sudo ufw enable

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3141/udp
sudo firewall-cmd --permanent --add-rich-rule='
  rule family="ipv4"
  source address="10.0.0.0/8"
  port protocol="udp" port="3141" accept'
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p udp --dport 3141 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 3141 -s 10.0.0.0/8 -j ACCEPT
sudo iptables-save > /etc/iptables/rules.v4
```

### Cloud Firewall Configuration

AWS Security Group:

```bash
# Allow Geode traffic from application tier
aws ec2 authorize-security-group-ingress \
  --group-id sg-geode123 \
  --protocol udp \
  --port 3141 \
  --source-group sg-app456

# Allow Geode traffic from specific CIDR
aws ec2 authorize-security-group-ingress \
  --group-id sg-geode123 \
  --protocol udp \
  --port 3141 \
  --cidr 10.0.0.0/16
```

Google Cloud Firewall:

```bash
gcloud compute firewall-rules create allow-geode-internal \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=udp:3141 \
  --source-ranges=10.0.0.0/8
```

## Network Performance Optimization

### Bandwidth Management

Configure bandwidth limits and Quality of Service (QoS):

```toml
[network.bandwidth]
# Maximum outbound bandwidth per connection (bytes/sec)
max_bandwidth_per_connection = 10485760  # 10 MB/s

# Maximum total server bandwidth (bytes/sec)
max_total_bandwidth = 1073741824  # 1 GB/s

# Enable bandwidth throttling
enable_throttling = true

# Priority queue for different query types
[network.bandwidth.priorities]
admin_queries = 100
user_queries = 50
batch_queries = 10
```

### Buffer Tuning

Optimize network buffer sizes for your workload:

```toml
[network.buffers]
# Send buffer size (bytes)
send_buffer_size = 2097152  # 2 MB

# Receive buffer size (bytes)
receive_buffer_size = 2097152  # 2 MB

# Maximum packet size (bytes)
max_packet_size = 65536  # 64 KB

# Read timeout (milliseconds)
read_timeout = 30000

# Write timeout (milliseconds)
write_timeout = 30000
```

### TCP/UDP Stack Tuning

Operating system network stack optimization:

```bash
# Linux sysctl settings for high-performance QUIC
cat >> /etc/sysctl.conf <<EOF
# Increase UDP buffer sizes
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.core.rmem_default = 16777216
net.core.wmem_default = 16777216

# Increase connection backlog
net.core.somaxconn = 4096
net.core.netdev_max_backlog = 8192

# Enable TCP/UDP performance options
net.ipv4.udp_rmem_min = 8192
net.ipv4.udp_wmem_min = 8192
EOF

sudo sysctl -p
```

## Load Balancing

### DNS Round-Robin

Simple load balancing with DNS:

```bash
# Multiple A records for geode.example.com
geode.example.com.  300  IN  A  192.168.1.101
geode.example.com.  300  IN  A  192.168.1.102
geode.example.com.  300  IN  A  192.168.1.103
```

Client automatically tries different IP addresses:

```python
# Client will try all IPs in round-robin fashion
client = Client("geode.example.com:3141")
```

### Layer 4 Load Balancing

Use UDP-aware load balancers:

```nginx
# NGINX Stream configuration for QUIC
stream {
    upstream geode_cluster {
        hash $remote_addr consistent;
        server 192.168.1.101:3141;
        server 192.168.1.102:3141;
        server 192.168.1.103:3141;
    }

    server {
        listen 3141 udp;
        proxy_pass geode_cluster;
        proxy_timeout 5m;
        proxy_responses 1;
    }
}
```

HAProxy configuration:

```haproxy
# HAProxy UDP load balancing for QUIC
frontend geode_frontend
    bind *:3141
    mode udp
    default_backend geode_backend

backend geode_backend
    mode udp
    balance roundrobin
    hash-type consistent
    server geode1 192.168.1.101:3141 check
    server geode2 192.168.1.102:3141 check
    server geode3 192.168.1.103:3141 check
```

## Monitoring Network Performance

### Network Metrics

Monitor network performance metrics:

```gql
-- Query network statistics
SELECT
  metric_name,
  metric_value,
  timestamp
FROM system.network_metrics
WHERE metric_name IN (
  'connections_active',
  'connections_total',
  'bytes_sent',
  'bytes_received',
  'packets_lost',
  'rtt_average'
)
ORDER BY timestamp DESC
LIMIT 100;
```

Prometheus metrics:

```bash
# Scrape Geode network metrics
curl http://localhost:9090/metrics | grep geode_network

# Example metrics
geode_network_connections_active 523
geode_network_connections_total 152847
geode_network_bytes_sent_total 182374923847
geode_network_bytes_received_total 93847298347
geode_network_packets_lost_total 1234
geode_network_rtt_milliseconds{quantile="0.5"} 12
geode_network_rtt_milliseconds{quantile="0.95"} 45
geode_network_rtt_milliseconds{quantile="0.99"} 89
```

### Connection Diagnostics

Diagnose connection issues:

```bash
# Show active connections
geode admin connections list

# Show connection details
geode admin connection show --id=conn-12345

# Test connectivity
geode admin ping --host=geode.example.com:3141

# Trace route with QUIC
geode admin traceroute --host=geode.example.com:3141

# Network throughput test
geode admin benchmark network \
  --host=geode.example.com:3141 \
  --duration=60s \
  --packet-size=64KB
```

## Best Practices

1. **TLS Certificates**: Use valid TLS certificates from trusted CAs in production
2. **Connection Limits**: Set appropriate connection limits based on server capacity
3. **Firewall Rules**: Restrict access to trusted networks and IP ranges
4. **Monitoring**: Continuously monitor network metrics and connection health
5. **Bandwidth**: Configure bandwidth limits to prevent resource exhaustion
6. **Testing**: Test network configuration under load before production deployment
7. **Redundancy**: Use multiple network paths and load balancing for high availability
8. **Security**: Enable mTLS for sensitive deployments and internal services

## Troubleshooting

### Connection Issues

```bash
# Test basic connectivity
nc -vzu geode.example.com 3141
nmap -sU -p 3141 geode.example.com

# Check QUIC connectivity
geode admin diagnose network --host=geode.example.com:3141

# Verify TLS certificate
geode admin tls verify --host=geode.example.com:3141

# Check firewall rules
sudo iptables -L -n -v | grep 3141
sudo ufw status | grep 3141
```

### Performance Issues

```bash
# Monitor network latency
geode admin monitor network --interval=1s --duration=60s

# Identify slow connections
geode admin connections list --sort-by=latency --limit=10

# Check packet loss
geode admin stats network --metric=packet_loss --interval=5m

# Bandwidth utilization
geode admin stats network --metric=bandwidth --interval=1m
```

### Debugging QUIC Issues

```bash
# Enable QUIC debug logging
geode serve --listen 0.0.0.0:3141 --log-level=debug --log-filter=quic

# Capture QUIC packets
sudo tcpdump -i any -n -s 65535 -w geode-quic.pcap 'udp port 3141'

# Analyze with Wireshark
wireshark geode-quic.pcap
```

## Related Topics

- [QUIC Protocol](/tags/quic/) - QUIC protocol details and configuration
- [TLS Security](/tags/encryption/) - TLS configuration and certificate management
- [Server Configuration](/tags/server/) - General server configuration
- [Performance Optimization](/tags/performance/) - Performance tuning
- [Monitoring](/tags/monitoring/) - Monitoring and observability

## Further Reading

- [QUIC Protocol Specification](https://www.rfc-editor.org/rfc/rfc9000.html) - IETF RFC 9000
- [Server Configuration](/docs/configuration/server-configuration/) - Detailed server and network setup
- [Security Best Practices](/docs/security/overview/) - Security guidelines
- [Deployment Patterns](/docs/deployment/deployment-patterns/) - Load balancer and deployment configuration
- [Performance Tuning](/docs/query/performance-tuning/) - Performance optimization
