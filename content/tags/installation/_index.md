---
title: "Installation Guide"
description: "Comprehensive installation guide for Geode graph database covering platform-specific instructions, dependencies, build process, and deployment configurations."
keywords:
  - Geode installation
  - install graph database
  - database deployment
  - build from source
  - platform installation
  - Linux installation
  - macOS installation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/installation/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Installing Geode involves obtaining source code, installing build dependencies, compiling the database server, and deploying it to target environments. This comprehensive guide covers installation across different platforms, from development environments to production deployments, ensuring reliable operation of your GQL-compliant graph database.

## Installation Overview

Geode is distributed as source code and must be compiled for your target platform. This approach ensures optimal performance for your specific architecture while maintaining full control over the build process and dependencies. The installation process follows a consistent pattern across platforms: install dependencies, obtain source code, build binaries, and configure the runtime environment.

### Installation Approaches

Multiple installation paths accommodate different use cases. Development installations prioritize rapid iteration and debugging capabilities. Production installations optimize for performance, security, and operational reliability. Containerized installations package Geode with all dependencies for consistent deployment across environments.

### Installation Timeline

A typical installation completes in 15-30 minutes, depending on hardware and network speed:

- Dependency installation: 5-10 minutes
- Source code download: 1-2 minutes
- Compilation: 5-10 minutes
- Configuration and testing: 5-10 minutes

## Platform-Specific Prerequisites

Each platform requires specific preparation before beginning Geode installation.

### Linux Installation Prerequisites

Linux distributions provide the most straightforward installation path for production deployments.

**Ubuntu/Debian Systems:**

```bash
# Update package index
sudo apt-get update

# Install build essentials
sudo apt-get install -y \
  build-essential \
  git \
  wget \
  curl \
  ca-certificates

# Install optional development tools
sudo apt-get install -y \
  gdb \
  valgrind \
  strace
```

**RHEL/CentOS/Rocky Linux Systems:**

```bash
# Install EPEL repository
sudo yum install -y epel-release

# Install development tools
sudo yum groupinstall -y "Development Tools"
sudo yum install -y \
  git \
  wget \
  curl \
  ca-certificates

# Optional debugging tools
sudo yum install -y \
  gdb \
  valgrind \
  strace
```

**Arch Linux:**

```bash
# Install base development tools
sudo pacman -S --needed \
  base-devel \
  git \
  wget \
  curl

# Optional tools
sudo pacman -S \
  gdb \
  valgrind
```

### macOS Installation Prerequisites

macOS requires Xcode Command Line Tools and may benefit from Homebrew package manager.

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies via Homebrew
brew install git wget
```

### Windows Installation Prerequisites

Windows users should install Windows Subsystem for Linux 2 (WSL2) for optimal Geode support.

```powershell
# Enable WSL2 (run in PowerShell as Administrator)
wsl --install -d Ubuntu-22.04

# Restart computer, then enter WSL
wsl

# Follow Ubuntu installation instructions from within WSL
```

## Installing Zig Compiler

Geode requires the Zig programming language compiler version 0.15.1 or later.

### Linux Zig Installation

```bash
# Download Zig 0.15.1 for Linux
cd /tmp
wget https://ziglang.org/download/0.15.1/zig-linux-x86_64-0.15.1.tar.xz

# Extract to /opt
sudo tar -xf zig-linux-x86_64-0.15.1.tar.xz -C /opt

# Create symbolic link
sudo ln -s /opt/zig-linux-x86_64-0.15.1 /opt/zig

# Add to PATH
echo 'export PATH="/opt/zig:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
zig version
```

### macOS Zig Installation

```bash
# Download Zig for macOS
cd /tmp
wget https://ziglang.org/download/0.15.1/zig-macos-x86_64-0.15.1.tar.xz

# Extract to /usr/local
sudo tar -xf zig-macos-x86_64-0.15.1.tar.xz -C /usr/local

# Create symbolic link
sudo ln -s /usr/local/zig-macos-x86_64-0.15.1 /usr/local/zig

# Add to PATH
echo 'export PATH="/usr/local/zig:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
zig version
```

For Apple Silicon Macs, use the aarch64 version:

```bash
wget https://ziglang.org/download/0.15.1/zig-macos-aarch64-0.15.1.tar.xz
```

### Alternative Zig Installation Methods

Some platforms offer package manager installation:

```bash
# Homebrew (macOS/Linux)
brew install zig

# Verify version is 0.15.1+
zig version
```

## Obtaining Geode Source Code

Clone the Geode monorepo from the official repository.

### Git Clone

```bash
# Create installation directory
mkdir -p ~/projects
cd ~/projects

# Clone repository
git clone https://github.com/codeprosorg/geode
cd geode

# Verify successful clone
ls -la
```

The repository contains the complete monorepo with server and all client libraries.

### Specific Version Installation

For production deployments, use a specific tagged version:

```bash
# List available tags
git tag -l

# Checkout specific version
git checkout v0.18.0

# Verify checked-out version
git describe --tags
```

### Repository Structure Navigation

Navigate to the server directory for database installation:

```bash
cd geode
ls -la
```

Expected contents include:
- `src/` - Source code
- `build.zig` - Build configuration
- `Makefile` - Build automation
- `tests/` - Test suite

## Building Geode

Compile Geode from source code to produce executable binaries.

### Development Build

Debug builds include full symbol information and runtime safety checks:

```bash
cd geode
make build
```

This invokes the Zig build system with debug settings. Output appears in `zig-out/bin/`:

```
Building Geode (Debug)...
Compiling src/main.zig...
Linking geode...
Build complete: zig-out/bin/geode
```

Verify the build:

```bash
ls -lh zig-out/bin/geode
./zig-out/bin/geode --version
```

### Production Build

Release builds enable optimizations while maintaining safety checks:

```bash
make release
```

The release build produces optimized binaries suitable for production deployment:

```
Building Geode (ReleaseSafe)...
Optimizing compilation units...
Linking geode...
Release build complete: zig-out/bin/geode
```

### Build Performance

Build times vary by hardware:
- Development machine (4-8 cores): 5-10 minutes
- Server (16+ cores): 2-5 minutes

For faster rebuilds during development, use incremental compilation (automatic with Zig).

### Troubleshooting Build Issues

**Compiler Version Mismatch:**

```bash
# Verify Zig version
zig version
# Should output: 0.15.1 or later
```

**Out of Memory:**

Build may fail on systems with limited RAM. Increase swap space or build on a machine with more memory.

**Permission Errors:**

```bash
# Ensure source directory is writable
ls -ld .
# Should show your user as owner

# If needed, fix permissions
sudo chown -R $USER:$USER .
```

## Installation Locations

Choose appropriate installation locations based on deployment type.

### Development Installation

For development, install in user home directory:

```bash
# Binaries remain in source tree
cd ~/projects/geode/geode
./zig-out/bin/geode --version

# Optionally add to PATH
echo 'export PATH="$HOME/projects/geode/geode/zig-out/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### System-Wide Installation

For production, install to system directories:

```bash
# Create installation directory
sudo mkdir -p /opt/geode

# Copy built binaries
sudo cp -r zig-out/* /opt/geode/

# Create symbolic link
sudo ln -s /opt/geode/bin/geode /usr/local/bin/geode

# Verify system-wide access
which geode
geode --version
```

### User and Group Setup

Production installations should run under a dedicated user:

```bash
# Create geode user and group
sudo groupadd -r geode
sudo useradd -r -g geode -d /var/lib/geode -s /sbin/nologin -c "Geode Graph Database" geode

# Create data directory
sudo mkdir -p /var/lib/geode/data
sudo chown -R geode:geode /var/lib/geode
sudo chmod 750 /var/lib/geode

# Create log directory
sudo mkdir -p /var/log/geode
sudo chown -R geode:geode /var/log/geode
sudo chmod 750 /var/log/geode
```

## Post-Installation Configuration

Configure Geode for initial operation.

### Data Directory Initialization

Create and configure the data storage directory:

```bash
# Development
mkdir -p ~/geode-data

# Production
sudo mkdir -p /var/lib/geode/data
sudo chown geode:geode /var/lib/geode/data
sudo chmod 750 /var/lib/geode/data
```

### TLS Certificate Generation

Generate certificates for secure QUIC connections:

```bash
# Self-signed certificate for development
openssl req -x509 -newkey rsa:4096 \
  -keyout /etc/geode/key.pem \
  -out /etc/geode/cert.pem \
  -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Dev/CN=localhost"

# Set permissions
sudo chown geode:geode /etc/geode/*.pem
sudo chmod 600 /etc/geode/key.pem
sudo chmod 644 /etc/geode/cert.pem
```

For production, obtain certificates from a trusted CA:

```bash
# Example using Let's Encrypt
sudo certbot certonly --standalone -d geode.example.com
```

### Systemd Service Installation

Install Geode as a system service:

```bash
# Create service file
sudo tee /etc/systemd/system/geode.service > /dev/null <<'EOF'
[Unit]
Description=Geode Graph Database
After=network.target
Documentation=https://geodedb.com

[Service]
Type=simple
User=geode
Group=geode
WorkingDirectory=/opt/geode
ExecStart=/opt/geode/bin/geode serve \
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

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/geode
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable geode

# Start service
sudo systemctl start geode

# Verify status
sudo systemctl status geode
```

## Verification and Testing

Confirm successful installation through testing.

### Basic Connectivity Test

```bash
# Start server (if not running as service)
./zig-out/bin/geode serve --listen 127.0.0.1:3141 &

# Connect with shell client
./zig-out/bin/geode shell

# Test basic operations
> PING
PONG

> CREATE (n:Test {value: 'installation_test'}) RETURN n;
> MATCH (n:Test) RETURN n;
```

### Test Suite Execution

Run the comprehensive test suite to verify correct installation:

```bash
cd geode

# Core unit tests
make test

# Comprehensive test suite (97.4% pass rate expected)
make geodetestlab-comprehensive
```

Successful test execution confirms proper installation.

### Performance Baseline

Establish performance baseline for your hardware:

```bash
# Run benchmarks
./scripts/benchmark.sh
```

Record baseline metrics for comparison during tuning.

## Client Library Installation

Install client libraries for your application language.

### Go Client Installation

```bash
# In your Go project
go get go.codepros.org/geode

# Verify installation
go mod tidy
```

### Python Client Installation

```bash
cd ~/projects/geode/geode-client-python

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install client
pip install -e .

# Verify installation
python -c "import geode_client; print('Installed successfully')"
```

### Rust Client Installation

```bash
cd ~/projects/geode/geode-client-rust

# Build client
cargo build --release

# Run tests
cargo test
```

### Zig Client Installation

```bash
cd ~/projects/geode/geode-client-zig

# Build client
zig build

# Run example
zig build run
```

## Container Installation

Deploy Geode in containerized environments.

### Docker Image Build

Create a Docker image for Geode:

```dockerfile
# Dockerfile
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create geode user
RUN groupadd -r geode && useradd -r -g geode geode

# Copy Geode binary
COPY --chown=geode:geode zig-out/bin/geode /usr/local/bin/geode

# Create data directory
RUN mkdir -p /var/lib/geode/data && \
    chown -R geode:geode /var/lib/geode

# Switch to geode user
USER geode

# Expose port
EXPOSE 3141/udp

# Set entrypoint
ENTRYPOINT ["geode"]
CMD ["serve", "--listen", "0.0.0.0:3141"]
```

Build the image:

```bash
docker build -t geode:latest .
```

### Docker Compose Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  geode:
    image: geode:latest
    ports:
      - "3141:3141/udp"
    volumes:
      - geode-data:/var/lib/geode/data
      - ./cert.pem:/etc/geode/cert.pem:ro
      - ./key.pem:/etc/geode/key.pem:ro
    environment:
      - GEODE_LOG_LEVEL=info
    restart: always

volumes:
  geode-data:
```

Deploy:

```bash
docker-compose up -d
```

## Upgrading Geode

Upgrade existing installations to newer versions.

### Upgrade Process

```bash
# Backup current data
sudo rsync -av /var/lib/geode/data/ /backup/geode-pre-upgrade/

# Stop service
sudo systemctl stop geode

# Update source code
cd ~/projects/geode
git fetch --tags
git checkout v0.18.0

# Rebuild
cd geode
make release

# Install new binaries
sudo cp zig-out/bin/geode /opt/geode/bin/

# Start service
sudo systemctl start geode

# Verify upgrade
geode --version
sudo systemctl status geode
```

### Rollback Procedure

If upgrade fails:

```bash
# Stop service
sudo systemctl stop geode

# Restore previous binaries
sudo cp /backup/geode-bin-backup/geode /opt/geode/bin/

# Restore data if necessary
sudo rsync -av /backup/geode-pre-upgrade/ /var/lib/geode/data/

# Start service
sudo systemctl start geode
```

## Related Topics

Installation connects to several operational areas:

- **Setup** - Initial configuration and deployment
- **Configuration** - Advanced configuration options
- **Operations** - Ongoing operational management
- **Deployment** - Production deployment strategies
- **Troubleshooting** - Resolving installation issues

## Resources

Additional installation resources:

- Official Geode documentation at geodedb.com
- Platform-specific installation guides
- Docker and container deployment documentation
- Community support and troubleshooting forums

Successful installation establishes the foundation for productive Geode usage. Following these platform-specific instructions ensures reliable installation across development and production environments.
