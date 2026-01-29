---
title: "Installation and Quick Start"
description: "Install Geode via OS packages, Docker, or source; start the QUIC/TLS server; connect with CLI/REPL; run your first GQL query"
weight: 10
tags:
  - installation
  - quick-start
  - getting-started
  - docker
categories:
  - getting-started
  - deployment-and-devops
keywords:
  - geode install
  - geode cli
  - gql shell
  - docker
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Installation and Quick Start

Get Geode running locally in minutes, from zero to executing your first GQL query.

## Prerequisites

### System Requirements

**Minimum**:
- CPU: 2 cores
- RAM: 4GB
- Disk: 2GB free space

**Recommended**:
- CPU: 4+ cores
- RAM: 8GB+
- Disk: 10GB+ free space (SSD preferred)

### Supported Platforms

- **Linux**: Ubuntu 20.04+, Debian 11+, RHEL 8+, Arch Linux
- **macOS**: macOS 11+ (Big Sur or later), including Apple Silicon
- **Windows**: Windows 10+ with WSL2

## Installation Options

### Option 1: Install by Operating System

{{< tabs >}}
{{< tab "Linux" >}}
{{< tabs >}}
{{< tab "Debian/Ubuntu" >}}
```bash
# Add GPG signing key
curl -fsSL https://apt.geodedb.com/geode.gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/geode-archive-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/geode-archive-keyring.gpg] https://apt.geodedb.com stable main" | \
  sudo tee /etc/apt/sources.list.d/geode.list

# Install
sudo apt update
sudo apt install geode
```
{{< /tab >}}
{{< tab "RHEL/Fedora" >}}
```bash
curl -L -o geode.rpm https://gitlab.com/devnw/codepros/geode/geode/-/releases/latest/download/geode-linux-x86_64.rpm
sudo rpm -i geode.rpm
```
{{< /tab >}}
{{< tab "Generic" >}}
```bash
curl -L -o geode-linux-amd64 https://gitlab.com/devnw/codepros/geode/geode/-/releases/latest/download/geode-linux-amd64
chmod +x geode-linux-amd64
sudo install -m 0755 geode-linux-amd64 /usr/local/bin/geode
```
{{< /tab >}}
{{< /tabs >}}
{{< /tab >}}
{{< tab "macOS" >}}
```bash
# Install via Homebrew (recommended)
brew tap geodedb/geode
brew install geode
```
{{< /tab >}}
{{< tab "Windows (WSL)" >}}
```bash
# PowerShell
wsl --install -d Ubuntu

# Inside Ubuntu (WSL)
# Add GPG signing key
curl -fsSL https://apt.geodedb.com/geode.gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/geode-archive-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/geode-archive-keyring.gpg] https://apt.geodedb.com stable main" | \
  sudo tee /etc/apt/sources.list.d/geode.list

# Install
sudo apt update
sudo apt install geode
```
{{< /tab >}}
{{< /tabs >}}

### Option 2: Docker

**Quick start** with Docker Compose:

```bash
cd geode

# Single-node deployment
make docker-up-singleton

# Or distributed cluster
make docker-up-distributed
```

**Manual Docker run**:

```bash
# Pull image (when available)
docker pull geodedb/geode:latest

# Run server
docker run -d \
  -p 3141:3141 \
  -v geode-data:/var/lib/geode \
  --name geode \
  geodedb/geode:latest serve --listen 0.0.0.0:3141
```

**Environment variables** for Docker:

- `LOG_LEVEL`: Set logging level (debug/info/warn/error)
- `GEODE_DATA_DIR`: Data directory path (default: `/var/lib/geode`)
- `GEODE_ADMIN_USERNAME`: Initial admin username
- `GEODE_DEFAULT_PASSWORD`: Initial admin password

See [Docker Deployment](/docs/ops/deployment#docker) for the full production stack (Vault, MinIO, Prometheus, Grafana, Loki, Nginx).

### Option 3: Build from Source

**Requirements**: Zig 0.1.0+ ([download from ziglang.org](https://ziglang.org/download/))

```bash
# Clone repository
git clone https://github.com/codeprosorg/geode
cd geode

# Debug build (faster compilation)
make build

# Or release build (optimized, recommended for production)
make release

# Verify installation
geode --version
```

**Make targets** (from `QUICK_REFERENCE.md`):
- `make build` - Debug build with symbols
- `make release` - ReleaseSafe build (recommended)
- `make test` - Run core unit tests
- `make geodetestlab-comprehensive` - Full test suite (97.4% pass rate)

For detailed build options, see [Install from Source](/docs/installation/from-source).

## Start the Server

### Default Server Start

```bash
# Start with defaults (QUIC/TLS on port 3141)
./geode serve

# Or if installed system-wide
geode serve
```

**Default behavior**:
- Listens on `127.0.0.1:3141` (QUIC+TLS only, no TCP)
- Data directory: `./geode-data` (current directory)
- Auto-generates self-signed certificates if none provided
- Creates default admin user if `GEODE_ADMIN_USERNAME` / `GEODE_DEFAULT_PASSWORD` env vars are set

### Custom Server Start

```bash
# Custom listen address and data directory
./geode serve --listen 0.0.0.0:8443 --data-dir /var/lib/geode

# With TLS certificates (production)
./geode serve \
  --listen 0.0.0.0:3141 \
  --cert /etc/geode/certs/server-cert.pem \
  --key /etc/geode/certs/server-key.pem \
  --data-dir /var/lib/geode

# With configuration file
./geode serve --config /etc/geode/geode.yaml
```

**Example configuration** (`geode.yaml` from `USAGE.md`):

```yaml
server:
  listen: '0.0.0.0:3141'
  data_dir: '/var/lib/geode'

tls:
  cert: '/etc/geode/certs/server-cert.pem'
  key: '/etc/geode/certs/server-key.pem'

storage:
  page_size: 8192
  page_cache_size: '1GB'

logging:
  level: 'info'
  format: 'json'

security:
  tde:
    enabled: true
    key_hex: '0123456789abcdef...'  # 32-byte hex key for AES-256-GCM
```

## Connect and Run Your First Query

### Using the Client CLI

```bash
# Execute a single query
geode query "RETURN 1 AS x"

# Execute from file
geode query -f query.gql

# Choose output format
geode query --format json "MATCH (n) RETURN n LIMIT 10"
geode query --format txt "MATCH (n) RETURN n LIMIT 10"
```

**Output formats** (from `USAGE.md`):
- `txt` - Human-readable table format (default)
- `json` - JSON lines (one object per row)

### Using the Interactive Shell

**Start the REPL**:

```bash
# Start interactive shell
./geode shell

# Or the alternative entrypoint
./gql
```

**Key meta commands** (from `REPL_USAGE.md`):

| Command | Description |
|---------|-------------|
| `\connect <uri>` | Connect to a server |
| `\begin` | Start transaction |
| `\commit` | Commit transaction |
| `\rollback` | Rollback transaction |
| `\format json|txt` | Set output format |
| `\timing on|off` | Show query execution time |
| `\help` | Show help |
| `\quit` | Exit shell |

**Example session**:

```gql
-- Connect to server
\connect geode://localhost:3141

-- Create a graph
CREATE GRAPH SocialNetwork;
USE SocialNetwork;

-- Create nodes
CREATE (:Person {name: "Alice", age: 30});
CREATE (:Person {name: "Bob", age: 25});

-- Create relationship
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS {since: 2020}]->(b);

-- Query
MATCH (p:Person)-[k:KNOWS]->(friend)
RETURN p.name, friend.name, k.since;

-- Enable timing
\timing on

-- Run EXPLAIN
EXPLAIN MATCH (p:Person) RETURN p.name;

-- Start transaction
\begin

-- Make changes
CREATE (:Person {name: "Charlie", age: 35});

-- Commit
\commit
```

## Troubleshooting

### TLS/Certificate Issues

**Symptom**: "certificate verification failed" or "TLS handshake failed"

**Solution**:

```bash
# Verify certificate
openssl x509 -in /etc/geode/certs/server-cert.pem -text -noout

# Check certificate matches key
openssl x509 -noout -modulus -in server-cert.pem | openssl md5
openssl rsa -noout -modulus -in server-key.pem | openssl md5
# Should match

# For development, use self-signed cert
./geode serve  # Auto-generates if none present
```

### Port Binding Issues

**Symptom**: "address already in use" or "bind failed"

**Solution**:

```bash
# Find process using port
lsof -i :3141

# Kill process
kill -9 <PID>

# Or use different port
./geode serve --listen 0.0.0.0:3142
```

### Connection Issues

**Symptom**: "connection refused" or "cannot connect"

**Checklist**:

1. **Server running?**
   ```bash
   ps aux | grep geode
   ```

2. **Correct port?**
   ```bash
   # Check server logs for listening address
   ```

3. **Firewall blocking?**
   ```bash
   # Check firewall rules
   sudo ufw status  # Ubuntu/Debian
   sudo firewall-cmd --list-all  # RHEL/CentOS
   ```

4. **QUIC support?**
   - Geode requires QUIC (UDP transport). Ensure UDP port 3141 is open, not just TCP.

## Next Steps

Now that Geode is running:

- **[GQL Guide](/docs/gql/guide)** - Learn the query language with examples
- **[Data Model and Types](/docs/model/data-model-and-types)** - Understand property graphs and types
- **[Configuration Reference](/docs/configuration)** - Deep dive into server configuration
- **[Client Libraries](/docs/client-libraries)** - Connect from Go, Python, Rust, or Zig
- **[Deployment Guide](/docs/ops/deployment)** - Production deployment patterns (Vault, MinIO, Prometheus, Grafana, Loki)

### Health and Monitoring

Once running, check server health:

```bash
# Health check endpoint
curl http://localhost:8080/health

# Readiness check
curl http://localhost:8080/ready

# Prometheus metrics
curl http://localhost:8080/metrics
```

See [Monitoring and Telemetry](/docs/ops/observability) for full observability setup.
