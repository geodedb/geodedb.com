---
title: "Installation & Setup"
description: "Complete guide to installing and setting up Geode graph database including prerequisites, build process, configuration, and initial deployment steps."
keywords:
  - Geode installation
  - database setup
  - installation guide
  - configuration
  - deployment
  - getting started
  - graph database setup
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/setup/"
    noindex: false
---

Setting up Geode involves installing required dependencies, building from source, configuring the server, and establishing initial deployment parameters. This process transforms the source code into a running production-ready graph database capable of handling enterprise workloads with full GQL compliance.

## Prerequisites and Requirements

Before beginning Geode installation, ensure your system meets minimum requirements and has necessary dependencies installed.

### System Requirements

Geode requires a modern Linux, macOS, or Windows environment with sufficient resources for development and production workloads:

- **Operating System**: Linux (Ubuntu 20.04+, Debian 11+, RHEL 8+), macOS 11+, or Windows 10/11 with WSL2
- **CPU**: 2+ cores (4+ recommended for production)
- **Memory**: 4GB minimum (8GB+ recommended for production)
- **Storage**: 10GB for binaries and source, plus data storage requirements
- **Network**: QUIC/UDP support (not blocked by firewall)

### Build Dependencies

Geode is written in Zig and requires specific build tools:

**Zig Compiler**: Version 0.15.1 or later is required for building Geode. Download from the official Zig website:

```bash
# Linux/macOS: Download and extract
wget https://ziglang.org/download/0.15.1/zig-linux-x86_64-0.15.1.tar.xz
tar -xf zig-linux-x86_64-0.15.1.tar.xz
sudo mv zig-linux-x86_64-0.15.1 /opt/zig
export PATH="/opt/zig:$PATH"

# Verify installation
zig version
```

**Build Tools**: Standard development tools may be needed:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install build-essential git make

# RHEL/CentOS
sudo yum groupinstall "Development Tools"
sudo yum install git make

# macOS (via Homebrew)
xcode-select --install
brew install git make
```

### Network Configuration

Geode uses QUIC over UDP on port 3141 by default. Ensure firewall rules allow this traffic:

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 3141/udp
sudo ufw reload

# RHEL/CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=3141/udp
sudo firewall-cmd --reload

# Check port availability
netstat -an | grep 3141
```

## Obtaining Geode Source Code

Geode is distributed as source code through a Git repository.

### Cloning the Repository

Clone the complete monorepo containing the server and all client libraries:

```bash
# Clone via HTTPS
git clone https://gitlab.com/devnw/codepros/geode.git
cd geode

# Or clone via SSH
git clone git@gitlab.com:devnw/codepros/geode.git
cd geode
```

### Repository Structure

The monorepo contains multiple components:

```
geode/
├── geode/              # Main database server (Zig)
├── geode-client-go/    # Go client library
├── geode-client-python/  # Python client library
├── geode-client-rust/  # Rust client library
├── geode-client-zig/   # Zig client library
├── geode-test-harness/  # Cross-client test framework
└── gql/                # GQL reference implementation
```

Navigate to the server directory for database installation:

```bash
cd geode
```

## Building Geode

The build process compiles Geode from source, producing executable binaries.

### Development Build

Build a debug version for development and testing:

```bash
cd geode
make build
```

This creates debug binaries in `zig-out/bin/` with full debugging symbols and safety checks enabled.

### Production Build

Build an optimized release version for production deployment:

```bash
make release
```

The release build enables optimizations while maintaining ReleaseSafe mode, which includes runtime safety checks. The resulting binary appears in `zig-out/bin/geode`.

### Build Verification

Verify the build completed successfully:

```bash
# Check binary exists
ls -lh zig-out/bin/geode

# Verify it runs
./zig-out/bin/geode --version
```

### Build Options

The Makefile supports several build targets:

```bash
# Clean build artifacts
make clean

# Run tests
make test

# Run comprehensive test suite (97.4% pass rate)
make geodetestlab-comprehensive

# Complete CI pipeline
make ci
```

## Initial Configuration

Configure Geode for your environment before first run.

### Data Directory

Geode stores data in a configured directory. Create this directory with appropriate permissions:

```bash
# Development setup
mkdir -p ./data

# Production setup
sudo mkdir -p /var/lib/geode/data
sudo chown geode:geode /var/lib/geode/data
sudo chmod 750 /var/lib/geode/data
```

### TLS Certificates

Geode requires TLS certificates for secure QUIC connections. For development, generate self-signed certificates:

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 \
  -keyout key.pem -out cert.pem \
  -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Set appropriate permissions
chmod 600 key.pem
chmod 644 cert.pem
```

For production, obtain certificates from a trusted Certificate Authority (Let's Encrypt, etc.).

### Environment Variables

Configure environment variables for consistent operation:

```bash
# Add to ~/.bashrc or ~/.zshrc
export GEODE_DATA_DIR="/var/lib/geode/data"
export GEODE_CERT="/etc/geode/cert.pem"
export GEODE_KEY="/etc/geode/key.pem"
export GEODE_LOG_LEVEL="info"
```

## Running Geode

Start the Geode server with appropriate configuration.

### Development Server

Run a development server with default settings:

```bash
cd geode
./zig-out/bin/geode serve --listen 127.0.0.1:3141
```

The server starts and listens on localhost port 3141. Output indicates successful startup:

```
[INFO] Geode Graph Database v0.18.0
[INFO] Listening on 127.0.0.1:3141
[INFO] Data directory: ./data
[INFO] Ready for connections
```

### Production Server

Run with production-appropriate configuration:

```bash
./zig-out/bin/geode serve \
  --listen 0.0.0.0:3141 \
  --data-dir /var/lib/geode/data \
  --cert /etc/geode/cert.pem \
  --key /etc/geode/key.pem \
  --log-level info \
  --max-connections 1000
```

### Server as System Service

Configure Geode as a systemd service for automatic startup:

Create `/etc/systemd/system/geode.service`:

```ini
[Unit]
Description=Geode Graph Database
After=network.target
Documentation=https://geodedb.com

[Service]
Type=simple
User=geode
Group=geode
WorkingDirectory=/opt/geode
ExecStart=/opt/geode/zig-out/bin/geode serve \
  --listen 0.0.0.0:3141 \
  --data-dir /var/lib/geode/data \
  --cert /etc/geode/cert.pem \
  --key /etc/geode/key.pem \
  --log-level info
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=geode

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/geode
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable geode
sudo systemctl start geode
sudo systemctl status geode
```

## Verifying Installation

Confirm Geode is running correctly and accepting connections.

### Connection Testing

Use the Geode shell to test connectivity:

```bash
./zig-out/bin/geode shell

# At the prompt, test basic operations
> PING
PONG

> CREATE (n:Person {name: 'Alice', age: 30}) RETURN n;
> MATCH (n:Person) RETURN n;
```

Successful responses indicate proper installation.

### Client Library Testing

Test connectivity from client libraries:

```go
// Go client test
package main

import (
    "context"
    "fmt"
    "log"
    "go.codepros.org/geode"
)

func main() {
    client, err := geode.NewClient("localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    ctx := context.Background()
    if err := client.Ping(ctx); err != nil {
        log.Fatal(err)
    }
    fmt.Println("Connected successfully!")
}
```

### Performance Baseline

Run baseline performance tests to establish expected performance:

```bash
cd geode
make test
```

This runs the test suite and provides performance metrics for comparison against future runs.

## User and Access Setup

Configure users and access controls for multi-user environments.

### Creating Users

While Geode's authentication model depends on your deployment, establish basic access patterns:

```gql
-- Create user accounts (example, actual implementation may vary)
CREATE USER admin WITH PASSWORD 'secure_password';
CREATE USER app_user WITH PASSWORD 'app_password';
```

### Access Policies

Configure Row-Level Security policies for fine-grained access control:

```gql
-- Enable RLS on sensitive tables
ALTER TABLE Person ENABLE ROW LEVEL SECURITY;

-- Create access policies
CREATE POLICY user_access ON Person
FOR SELECT
USING (owner_id = current_user_id());
```

## Client Setup

Configure client libraries to connect to Geode.

### Go Client Setup

```bash
# Install Go client
go get go.codepros.org/geode

# Import in your application
import "go.codepros.org/geode"
```

### Python Client Setup

```bash
cd geode-client-python

# Install dependencies
pip install -r requirements.txt

# Install client
pip install -e .
```

### Rust Client Setup

```bash
cd geode-client-rust

# Build client
cargo build --release

# Add to Cargo.toml
[dependencies]
geode-client = { path = "../geode-client-rust" }
```

### Zig Client Setup

```bash
cd geode-client-zig

# Build client
zig build

# Run example
zig build run
```

## Initial Data Loading

Load initial data into your Geode instance.

### Bulk Data Import

For large datasets, use batch operations:

```gql
BEGIN TRANSACTION;

UNWIND $nodes AS node
CREATE (n:Person {
  id: node.id,
  name: node.name,
  email: node.email
});

UNWIND $relationships AS rel
MATCH (a:Person {id: rel.from})
MATCH (b:Person {id: rel.to})
CREATE (a)-[:KNOWS]->(b);

COMMIT;
```

### Schema Initialization

Create indexes and constraints:

```gql
-- Create indexes for performance
CREATE INDEX ON Person(email);
CREATE INDEX ON Person(name);
CREATE INDEX ON Company(name);

-- Create unique constraints
CREATE CONSTRAINT ON Person(email) ASSERT email IS UNIQUE;
```

## Troubleshooting Setup Issues

Common setup problems and solutions.

### Build Failures

If build fails, verify Zig version and dependencies:

```bash
zig version  # Should be 0.15.1+
make clean
make build
```

### Connection Refused

If clients cannot connect, check server is running and firewall allows traffic:

```bash
# Verify server running
ps aux | grep geode

# Check port listening
netstat -an | grep 3141

# Test locally
./zig-out/bin/geode shell
```

### Permission Errors

Ensure data directory has correct permissions:

```bash
sudo chown -R geode:geode /var/lib/geode
sudo chmod -R 750 /var/lib/geode
```

### Certificate Issues

For TLS certificate problems, verify certificate files are readable:

```bash
ls -l cert.pem key.pem
openssl x509 -in cert.pem -text -noout
```

## Post-Installation Steps

Complete setup with operational configuration.

### Backup Configuration

Establish backup procedures:

```bash
# Create backup script
cat > /opt/geode/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/backup/geode/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR
rsync -av /var/lib/geode/data/ $BACKUP_DIR/
EOF

chmod +x /opt/geode/backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /opt/geode/backup.sh
```

### Monitoring Setup

Configure monitoring for production systems:

```bash
# Enable slow query logging
./zig-out/bin/geode serve \
  --slow-query-log \
  --slow-query-threshold 1000
```

### Documentation Review

Review relevant documentation:

- Geode server configuration reference
- Client library documentation for your language
- GQL query language syntax
- Performance tuning guides

## Related Topics

Setup connects to several operational areas:

- **Installation** - Detailed installation procedures
- **Configuration** - Advanced configuration options
- **Deployment** - Production deployment strategies
- **Operations** - Ongoing operational management
- **Troubleshooting** - Resolving setup and operational issues

## Resources

Additional setup resources:

- Official Geode documentation at geodedb.com
- Build system documentation in geode/CLAUDE.md
- Client library setup guides in respective directories
- Community support and issue tracking

Proper installation and setup establishes the foundation for reliable Geode operation. Following these procedures ensures a stable, performant graph database ready for development and production workloads.
