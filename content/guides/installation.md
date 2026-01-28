---
title: "Installation Guide"
slug: "installation"
description: "Complete guide for installing Geode and client libraries on all platforms"
weight: 2
tags: ["installation", "setup", "docker", "apt", "client-libraries"]
categories: ["guides", "getting-started"]
keywords:
  - install Geode
  - Geode docker
  - Geode apt
  - graph database installation
  - client libraries
  - build from source
---

<!-- CANARY: REQ=REQ-DOCS-002; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Installation Guide

This comprehensive guide covers all methods to install and configure Geode, the ISO/IEC 39075:2024 GQL-compliant graph database. Choose the installation method that best fits your environment.

## Prerequisites

Before installing Geode, ensure you have:

- **Operating System**: Linux (x86_64, ARM64), macOS (Apple Silicon, Intel), or Windows (WSL2)
- **Memory**: Minimum 2GB RAM (4GB+ recommended for production)
- **Disk**: Minimum 1GB free space
- **Network**: Port 3141 available (configurable)

## Quick Installation Methods

| Method | Best For | Difficulty |
|--------|----------|------------|
| Docker | Development, Testing, Quick Start | Easy |
| APT Repository | Production Linux Servers | Easy |
| Binary Download | Air-gapped environments | Medium |
| Build from Source | Contributors, Custom builds | Advanced |

---

## Docker Installation (Recommended)

Docker provides the fastest and most consistent way to run Geode.

### Prerequisites

- Docker 20.10+ installed
- Docker Compose v2+ (optional, for multi-container setups)

### Basic Installation

Pull and run the official Geode image:

```bash
# Pull the latest stable release
docker pull geodedb/geode:latest

# Run Geode
docker run -d \
  --name geode \
  -p 3141:3141 \
  -v geode-data:/var/lib/geode \
  geodedb/geode:latest serve --listen 0.0.0.0:3141
```

### Docker Compose Setup

For production deployments, use Docker Compose:

```yaml
# docker-compose.yml
version: '3.8'

services:
  geode:
    image: geodedb/geode:latest
    container_name: geode
    restart: unless-stopped
    ports:
      - "3141:3141"
    volumes:
      - geode-data:/var/lib/geode
      - ./geode.toml:/etc/geode/geode.toml:ro
    environment:
      - GEODE_LOG_LEVEL=info
      - GEODE_DATA_DIR=/var/lib/geode
    command: ["serve", "--listen", "0.0.0.0:3141", "--config", "/etc/geode/geode.toml"]
    healthcheck:
      test: ["CMD", "geode", "ping", "localhost:3141"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  geode-data:
    driver: local
```

Start with Docker Compose:

```bash
docker compose up -d
```

### Available Image Tags

| Tag | Description |
|-----|-------------|
| `latest` | Latest stable release |
| `0.18.0` | Specific version |
| `0.18` | Latest patch of minor version |
| `edge` | Latest development build |
| `alpine` | Minimal Alpine-based image |

### Docker Configuration Options

```bash
# Run with custom configuration
docker run -d \
  --name geode \
  -p 3141:3141 \
  -p 8443:8443 \
  -v geode-data:/var/lib/geode \
  -v $(pwd)/geode.toml:/etc/geode/geode.toml:ro \
  -e GEODE_LOG_LEVEL=debug \
  -e GEODE_MAX_CONNECTIONS=1000 \
  geodedb/geode:latest serve \
    --listen 0.0.0.0:3141 \
    --config /etc/geode/geode.toml

# Run with TLS certificates
docker run -d \
  --name geode \
  -p 3141:3141 \
  -v geode-data:/var/lib/geode \
  -v $(pwd)/certs:/etc/geode/certs:ro \
  geodedb/geode:latest serve \
    --listen 0.0.0.0:3141 \
    --tls-cert /etc/geode/certs/server.crt \
    --tls-key /etc/geode/certs/server.key
```

### Docker Verification

```bash
# Check container is running
docker ps | grep geode

# View logs
docker logs geode

# Test connection
docker exec -it geode geode ping localhost:3141

# Open interactive shell
docker exec -it geode geode shell
```

---

## APT Repository Installation (Debian/Ubuntu)

For production Linux servers, use the official APT repository.

### Supported Distributions

- Debian 11 (Bullseye), 12 (Bookworm)
- Ubuntu 20.04 LTS, 22.04 LTS, 24.04 LTS
- Linux Mint 20+

### Installation Steps

1. **Add the GPG key**:

```bash
curl -fsSL https://apt.geodedb.com/geode.gpg | sudo gpg --dearmor -o /usr/share/keyrings/geode-archive-keyring.gpg
```

2. **Add the repository**:

```bash
echo "deb [signed-by=/usr/share/keyrings/geode-archive-keyring.gpg] https://apt.geodedb.com stable main" | sudo tee /etc/apt/sources.list.d/geode.list
```

3. **Install Geode**:

```bash
sudo apt update
sudo apt install geode
```

4. **Enable and start the service**:

```bash
sudo systemctl enable geode
sudo systemctl start geode
```

### APT Configuration

The APT installation creates:

- **Binary**: `/usr/bin/geode`
- **Configuration**: `/etc/geode/geode.toml`
- **Data directory**: `/var/lib/geode`
- **Log directory**: `/var/log/geode`
- **Systemd service**: `geode.service`

Edit the configuration:

```bash
sudo nano /etc/geode/geode.toml
```

```toml
# /etc/geode/geode.toml
[server]
listen = "0.0.0.0:3141"
data_dir = "/var/lib/geode"
log_level = "info"

[storage]
engine = "lsm"
cache_size = "1GB"
wal_enabled = true

[security]
tls_enabled = true
tls_cert = "/etc/geode/certs/server.crt"
tls_key = "/etc/geode/certs/server.key"
```

### Managing the Service

```bash
# Start Geode
sudo systemctl start geode

# Stop Geode
sudo systemctl stop geode

# Restart Geode
sudo systemctl restart geode

# Check status
sudo systemctl status geode

# View logs
sudo journalctl -u geode -f
```

### Upgrading via APT

```bash
sudo apt update
sudo apt upgrade geode
```

---

## Binary Installation

For environments without Docker or package managers.

### macOS Installation (Homebrew)

The recommended way to install Geode on macOS is via Homebrew:

```bash
# Install via Homebrew
brew tap geodedb/geode
brew install geode

# Verify installation
geode version
```

### Download Binary (Linux)

```bash
# Linux x86_64
curl -LO https://releases.geodedb.com/latest/geode-linux-amd64.tar.gz
tar -xzf geode-linux-amd64.tar.gz

# Linux ARM64
curl -LO https://releases.geodedb.com/latest/geode-linux-arm64.tar.gz
tar -xzf geode-linux-arm64.tar.gz
```

### Install Binary

```bash
# Move to system path
sudo mv geode /usr/local/bin/
sudo chmod +x /usr/local/bin/geode

# Create data directory
sudo mkdir -p /var/lib/geode
sudo chown $USER:$USER /var/lib/geode

# Verify installation
geode version
```

### Create Systemd Service (Optional)

```bash
sudo tee /etc/systemd/system/geode.service > /dev/null <<EOF
[Unit]
Description=Geode Graph Database
After=network.target

[Service]
Type=simple
User=geode
Group=geode
ExecStart=/usr/local/bin/geode serve --listen 0.0.0.0:3141 --data-dir /var/lib/geode
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable geode
sudo systemctl start geode
```

---

## Building from Source

For contributors or custom builds.

### Prerequisites

- **Zig**: Version 0.15.1 or later
- **Git**: For cloning the repository
- **Make**: For build automation

### Installing Zig

```bash
# Download Zig (Linux x86_64)
curl -LO https://ziglang.org/download/0.15.1/zig-linux-x86_64-0.15.1.tar.xz
tar -xf zig-linux-x86_64-0.15.1.tar.xz
sudo mv zig-linux-x86_64-0.15.1 /opt/zig
echo 'export PATH="/opt/zig:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify Zig installation
zig version
```

### Build Geode

```bash
# Clone the repository
git clone https://gitlab.com/devnw/codepros/geode/geode.git
cd geode

# Build debug version
make build

# Build release version (optimized)
make release

# Run tests
make test

# The binary is located at:
# Debug: ./zig-out/bin/geode
# Release: ./zig-out/bin/geode
```

### Build Options

```bash
# Build with specific options
zig build -Doptimize=ReleaseSafe

# Build with debug symbols
zig build -Doptimize=Debug

# Build for specific target
zig build -Dtarget=aarch64-linux-gnu

# Run comprehensive tests
make geodetestlab-comprehensive
```

---

## Client Library Installation

Geode supports multiple programming languages. Install the client for your preferred language.

### Go Client

**Requirements**: Go 1.24.0+

{{< tabs >}}
{{< tab "go get" >}}
```bash
go get geodedb.com/geode
```
{{< /tab >}}
{{< tab "go.mod" >}}
```go
// Add to your go.mod
require geodedb.com/geode v0.18.0
```
{{< /tab >}}
{{< /tabs >}}

**Verify Installation**:

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"

    _ "geodedb.com/geode"
)

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    if err := db.PingContext(context.Background()); err != nil {
        log.Fatal(err)
    }
    fmt.Println("Connected to Geode!")
}
```

### Python Client

**Requirements**: Python 3.9+

{{< tabs >}}
{{< tab "pip" >}}
```bash
pip install geode-client
```
{{< /tab >}}
{{< tab "poetry" >}}
```bash
poetry add geode-client
```
{{< /tab >}}
{{< tab "pipenv" >}}
```bash
pipenv install geode-client
```
{{< /tab >}}
{{< tab "requirements.txt" >}}
```text
geode-client>=0.18.0
```
{{< /tab >}}
{{< /tabs >}}

**Verify Installation**:

```python
import asyncio
from geode_client import Client

async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)
    async with client.connection() as conn:
        result = await conn.ping()
        print(f"Connected to Geode! Latency: {result.latency_ms}ms")

asyncio.run(main())
```

### Rust Client

**Requirements**: Rust 1.70+, tokio runtime

{{< tabs >}}
{{< tab "Cargo.toml" >}}
```toml
[dependencies]
geode-client = "0.18"
tokio = { version = "1", features = ["full"] }
```
{{< /tab >}}
{{< tab "cargo add" >}}
```bash
cargo add geode-client
cargo add tokio --features full
```
{{< /tab >}}
{{< /tabs >}}

**Verify Installation**:

```rust
use geode_client::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    conn.ping().await?;
    println!("Connected to Geode!");

    Ok(())
}
```

### Node.js Client

**Requirements**: Node.js 18+

{{< tabs >}}
{{< tab "npm" >}}
```bash
npm install @geodedb/client
```
{{< /tab >}}
{{< tab "yarn" >}}
```bash
yarn add @geodedb/client
```
{{< /tab >}}
{{< tab "pnpm" >}}
```bash
pnpm add @geodedb/client
```
{{< /tab >}}
{{< tab "package.json" >}}
```json
{
  "dependencies": {
    "@geodedb/client": "^0.18.0"
  }
}
```
{{< /tab >}}
{{< /tabs >}}

**Verify Installation**:

```typescript
import { createClient } from '@geodedb/client';

async function main() {
    const client = await createClient('geode://localhost:3141');

    const pong = await client.ping();
    console.log(`Connected to Geode! Latency: ${pong.latency}ms`);

    await client.close();
}

main();
```

### Zig Client

**Requirements**: Zig 0.15.1+

{{< tabs >}}
{{< tab "build.zig.zon" >}}
```zig
.{
    .name = "my-project",
    .version = "0.1.0",
    .dependencies = .{
        .geode_client = .{
            .url = "https://gitlab.com/devnw/codepros/geode/geode-client-zig/-/archive/v0.18.0/geode-client-zig-v0.18.0.tar.gz",
            .hash = "...", // Get hash from first build attempt
        },
    },
}
```
{{< /tab >}}
{{< tab "build.zig" >}}
```zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const geode_client = b.dependency("geode_client", .{
        .target = target,
        .optimize = optimize,
    });

    const exe = b.addExecutable(.{
        .name = "my-app",
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    exe.root_module.addImport("geode_client", geode_client.module("geode_client"));
    b.installArtifact(exe);
}
```
{{< /tab >}}
{{< /tabs >}}

**Verify Installation**:

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.sendHello("verify", "1.0.0");
    _ = try client.receiveMessage(30000);

    std.debug.print("Connected to Geode!\n", .{});
}
```

---

## Verification Steps

After installation, verify everything is working correctly.

### 1. Check Server Status

```bash
# Using CLI
geode ping localhost:3141

# Expected output:
# Connected to Geode v0.18.0
# Latency: 2ms
```

### 2. Run a Test Query

```bash
# Open interactive shell
geode shell

# Run test query
geode> RETURN 1 + 1 AS result
| result |
|--------|
| 2      |

geode> \exit
```

### 3. Verify Client Connection

{{< tabs >}}
{{< tab "Go" >}}
```bash
# Create test file
cat > test_connection.go << 'EOF'
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"
    _ "geodedb.com/geode"
)

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    row := db.QueryRowContext(context.Background(), "RETURN 1 + 1 AS result")
    var result int
    if err := row.Scan(&result); err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Query result: %d\n", result)
}
EOF

go run test_connection.go
```
{{< /tab >}}
{{< tab "Python" >}}
```bash
# Create test file
cat > test_connection.py << 'EOF'
import asyncio
from geode_client import Client

async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)
    async with client.connection() as conn:
        page, _ = await conn.query("RETURN 1 + 1 AS result")
        result = page.rows[0]['result'].as_int
        print(f"Query result: {result}")

asyncio.run(main())
EOF

python test_connection.py
```
{{< /tab >}}
{{< tab "Rust" >}}
```bash
# In a Cargo project
cargo run --example basic_connection
```
{{< /tab >}}
{{< tab "Node.js" >}}
```bash
# Create test file
cat > test_connection.mjs << 'EOF'
import { createClient } from '@geodedb/client';

const client = await createClient('geode://localhost:3141');
const rows = await client.queryAll('RETURN 1 + 1 AS result');
console.log(`Query result: ${rows[0].get('result')?.asNumber}`);
await client.close();
EOF

node test_connection.mjs
```
{{< /tab >}}
{{< /tabs >}}

---

## Troubleshooting

### Connection Refused

**Symptom**: `Connection refused` or `Cannot connect to server`

**Solutions**:

```bash
# 1. Check if Geode is running
docker ps | grep geode
# OR
systemctl status geode

# 2. Check if port is open
netstat -tlnp | grep 3141
# OR
ss -tlnp | grep 3141

# 3. Check firewall
sudo ufw status
sudo ufw allow 3141/tcp

# 4. Check logs
docker logs geode
# OR
journalctl -u geode -n 50
```

### Port Already in Use

**Symptom**: `Address already in use`

**Solutions**:

```bash
# Find process using port
lsof -i :3141
# OR
fuser 3141/tcp

# Kill the process
kill -9 <PID>

# Or use a different port
docker run -d -p 3142:3141 geodedb/geode:latest serve --listen 0.0.0.0:3141

# Connect to new port
geode ping localhost:3142
```

### TLS/Certificate Errors

**Symptom**: `Certificate verification failed` or `TLS handshake error`

**Solutions**:

```bash
# 1. For development, skip verification
# Go
db, _ := sql.Open("geode", "localhost:3141?skip_verify=true")

# Python
client = Client(host="localhost", port=3141, skip_verify=True)

# 2. Use proper certificates for production
docker run -d \
  -v $(pwd)/certs:/etc/geode/certs:ro \
  geodedb/geode:latest serve \
    --tls-cert /etc/geode/certs/server.crt \
    --tls-key /etc/geode/certs/server.key

# 3. Generate self-signed certificates
openssl req -x509 -newkey rsa:4096 \
  -keyout server.key -out server.crt \
  -days 365 -nodes \
  -subj "/CN=localhost"
```

### Out of Memory

**Symptom**: `Out of memory` or server crashes

**Solutions**:

```bash
# 1. Increase Docker memory limit
docker run -d \
  --memory=4g \
  --memory-swap=4g \
  geodedb/geode:latest

# 2. Adjust cache size in config
# /etc/geode/geode.toml
[storage]
cache_size = "512MB"  # Reduce from default

# 3. Monitor memory usage
docker stats geode
```

### Permission Denied

**Symptom**: `Permission denied` accessing data directory

**Solutions**:

```bash
# 1. Fix ownership
sudo chown -R $USER:$USER /var/lib/geode

# 2. Fix permissions
sudo chmod -R 755 /var/lib/geode

# 3. For Docker, use named volumes
docker run -d \
  -v geode-data:/var/lib/geode \
  geodedb/geode:latest
```

### Client Library Build Errors

**Go**:
```bash
# Clear module cache
go clean -modcache
go mod download
```

**Python**:
```bash
# Upgrade pip and reinstall
pip install --upgrade pip
pip install --force-reinstall geode-client
```

**Rust**:
```bash
# Update dependencies
cargo update
cargo clean
cargo build
```

**Zig**:
```bash
# Clear cache
rm -rf zig-cache .zig-cache
zig build
```

### Slow Queries

**Symptom**: Queries taking longer than expected

**Solutions**:

```bash
# 1. Check query execution plan
geode shell
geode> EXPLAIN MATCH (n:Person) RETURN n

# 2. Add indexes for frequently queried properties
CREATE INDEX person_name ON :Person(name)

# 3. Profile the query
geode> PROFILE MATCH (n:Person) RETURN n
```

---

## Next Steps

Now that Geode is installed:

1. **Quick Start**: Follow the [Quick Start Guide](/guides/quick-start/) to create your first graph
2. **Build an Application**: See [Building Your First Application](/guides/first-application/)
3. **Learn GQL**: Explore the [GQL Reference](/docs/gql-reference/)
4. **Design Your Schema**: Read the [Graph Modeling Guide](/guides/graph-modeling/)
5. **Production Setup**: Review [Production Deployment](/guides/production-deployment/)

---

## Resources

- [Full Documentation](/docs/)
- [Client Library APIs](/clients/)
- [Use Cases](/docs/use-cases/)
- [Community Forum](https://forum.geodedb.com)
- [GitLab Repository](https://gitlab.com/devnw/codepros/geode)

## Get Help

- [Documentation](https://docs.geodedb.com)
- [GitLab Issues](https://gitlab.com/devnw/codepros/geode/geode/-/issues)
- [Community Chat](https://chat.geodedb.com)
- [Email Support](mailto:support@geodedb.com)
