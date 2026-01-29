---
title: "Install from Source"
description: "Build Geode from source with Zig compiler"
url: /docs/installation/from-source/
weight: 20

keywords:
  - build Geode from source
  - Zig build
  - compile Geode
  - installation
  - developer setup
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Installing Geode from Source

This guide covers building Geode from source using the Zig compiler.

## Prerequisites

### Required Tools

- **Zig 0.15.1+** - [Download from ziglang.org](https://ziglang.org/download/)
- **Git** - For cloning the repository
- **Make** (optional) - For using build shortcuts

### System Requirements

**Minimum**:
- CPU: 2 cores
- RAM: 4GB
- Disk: 2GB free space

**Recommended**:
- CPU: 4+ cores
- RAM: 8GB+
- Disk: 10GB+ free space
- SSD storage for optimal performance

### Supported Platforms

- **Linux**: Ubuntu 20.04+, Debian 11+, RHEL 8+, Arch Linux
- **macOS**: macOS 11+ (Big Sur or later)
- **Windows**: Windows 10+ with WSL2 (native Windows support coming soon)

## Quick Start

### Clone the Repository

```bash
git clone https://github.com/codeprosorg/geode
cd geode
```

### Build

```bash
# Debug build (faster compilation, slower runtime)
make build

# Or use zig directly
zig build

# Release build (optimized for performance)
make release

# Or use zig directly
zig build -Doptimize=ReleaseFast
```

### Verify Installation

```bash
# Check version
./zig-out/bin/geode --version

# Run tests
make test

# Or use zig directly
zig build test
```

## Detailed Build Instructions

### Build Configurations

**Debug Build**:
```bash
zig build
# Binary: ./zig-out/bin/geode
# Characteristics: Fast compilation, debug symbols, slower runtime
```

**Release Build (Recommended)**:
```bash
zig build -Doptimize=ReleaseFast
# Binary: ./zig-out/bin/geode
# Characteristics: Optimized for speed, no debug symbols
```

**Small Binary Build**:
```bash
zig build -Doptimize=ReleaseSmall
# Binary: ./zig-out/bin/geode
# Characteristics: Optimized for size, slower than ReleaseFast
```

**Safe Release Build**:
```bash
zig build -Doptimize=ReleaseSafe
# Binary: ./zig-out/bin/geode
# Characteristics: Runtime safety checks enabled
```

### Build Options

```bash
# Enable specific features
zig build -Denable-tde=true          # Transparent Data Encryption
zig build -Denable-fle=true          # Field-Level Encryption
zig build -Denable-gpu=true          # GPU acceleration (Vulkan/CUDA)

# Disable features
zig build -Denable-telemetry=false   # Disable telemetry

# Cross-compilation
zig build -Dtarget=x86_64-linux      # Linux x86_64
zig build -Dtarget=aarch64-linux     # Linux ARM64
zig build -Dtarget=x86_64-macos      # macOS x86_64
zig build -Dtarget=aarch64-macos     # macOS ARM64 (Apple Silicon)
```

### Make Targets

```bash
# Building
make build              # Debug build
make release            # Release build
make verify-all         # Build and run full verification

# Testing
make test              # Run all tests
make integration-test  # Run integration tests only
make geodetestlab      # Run geodetestlab test suite

# Code Quality
make fmt               # Format code
make lint              # Run linter
make check             # Type check

# Benchmarks
make bench             # Run benchmarks

# Documentation
make docs              # Generate documentation

# Cleanup
make clean             # Remove build artifacts
```

## Installation

### System-Wide Installation

```bash
# Build release binary
make release

# Install to /usr/local/bin (requires root)
sudo cp zig-out/bin/geode /usr/local/bin/

# Verify installation
geode --version
```

### User Installation

```bash
# Build release binary
make release

# Install to user bin directory
mkdir -p ~/.local/bin
cp zig-out/bin/geode ~/.local/bin/

# Add to PATH if not already present
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
geode --version
```

### Creating a Service

**systemd (Linux)**:

```bash
# Create service file
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
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

# Create geode user
sudo useradd -r -s /bin/false geode

# Create data directory
sudo mkdir -p /var/lib/geode
sudo chown geode:geode /var/lib/geode

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable geode
sudo systemctl start geode

# Check status
sudo systemctl status geode
```

**launchd (macOS)**:

```bash
# Create plist file
cat > ~/Library/LaunchAgents/com.geodedb.geode.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.geodedb.geode</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/geode</string>
        <string>serve</string>
        <string>--listen</string>
        <string>0.0.0.0:3141</string>
        <string>--data-dir</string>
        <string>/usr/local/var/geode</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Create data directory
sudo mkdir -p /usr/local/var/geode
sudo chown $(whoami) /usr/local/var/geode

# Load service
launchctl load ~/Library/LaunchAgents/com.geodedb.geode.plist

# Check status
launchctl list | grep geode
```

## Post-Installation

### Generate Self-Signed Certificates (Development)

```bash
# Generate CA key and certificate
openssl req -x509 -newkey rsa:4096 -days 365 -nodes \
  -keyout ca-key.pem -out ca-cert.pem \
  -subj "/CN=Geode CA"

# Generate server key and CSR
openssl req -newkey rsa:4096 -nodes \
  -keyout server-key.pem -out server-req.pem \
  -subj "/CN=localhost"

# Sign server certificate with CA
openssl x509 -req -in server-req.pem -days 365 \
  -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \
  -out server-cert.pem

# Move to appropriate location
sudo mkdir -p /etc/geode/certs
sudo mv server-cert.pem server-key.pem /etc/geode/certs/
sudo chmod 600 /etc/geode/certs/server-key.pem
```

### Initial Configuration

```bash
# Create config directory
sudo mkdir -p /etc/geode

# Create basic config file
sudo tee /etc/geode/geode.yaml > /dev/null <<EOF
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
EOF
```

### Start Server

```bash
# With default settings
geode serve

# With custom config
geode serve --config /etc/geode/geode.yaml

# With environment variables
GEODE_DATA_DIR=/var/lib/geode geode serve --listen 0.0.0.0:3141
```

### Test Connection

```bash
# Interactive shell
geode shell

# Execute query
geode query "RETURN 1 AS x"

# Check server health
curl -f http://localhost:8080/health || echo "Health check failed"
```

## Development Setup

### IDE Integration

**Visual Studio Code**:

1. Install Zig extension
2. Open workspace: `code .`
3. Configure settings:

```json
{
  "zig.path": "/usr/local/bin/zig",
  "zig.zls.path": "/usr/local/bin/zls",
  "zig.buildOnSave": true
}
```

**Neovim** (with LSP):

```lua
require('lspconfig').zls.setup{
  cmd = {'/usr/local/bin/zls'},
  filetypes = {'zig'},
}
```

### Running Tests

```bash
# All tests
make test

# Integration tests only
make geodetestlab

# Specific test file
zig test tests/test_parser.zig

# With filter
zig build test -Dtest-filter="CANARY"

# With coverage (requires kcov)
make coverage
```

### Benchmarks

```bash
# Run all benchmarks
make bench

# Extract results
make bench 2>&1 | bench_extract

# Compare with baseline
bench_regress --baseline old.json --current new.json
```

### Code Quality

```bash
# Format code
make fmt

# Run linter
make lint

# Type checking
zig build check

# Generate documentation
zig build docs
```

## Troubleshooting

### Build Failures

**Zig version mismatch**:
```bash
# Check Zig version
zig version

# Should be 0.15.1 or later
# If not, download latest from ziglang.org
```

**Missing dependencies**:
```bash
# Update submodules
git submodule update --init --recursive

# Clean and rebuild
make clean
make build
```

**Out of memory during build**:
```bash
# Use single-threaded build
zig build -j1

# Or increase swap space
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Runtime Issues

**Port already in use**:
```bash
# Find process using port 3141
lsof -i :3141

# Kill process
kill -9 <PID>

# Or use different port
geode serve --listen 0.0.0.0:3142
```

**Permission denied**:
```bash
# Check data directory permissions
ls -la /var/lib/geode

# Fix permissions
sudo chown -R geode:geode /var/lib/geode
sudo chmod -R 755 /var/lib/geode
```

**TLS certificate errors**:
```bash
# Verify certificate
openssl x509 -in /etc/geode/certs/server-cert.pem -text -noout

# Check key matches certificate
openssl x509 -noout -modulus -in server-cert.pem | openssl md5
openssl rsa -noout -modulus -in server-key.pem | openssl md5
# Should match
```

## Next Steps

- [Configuration Reference](/docs/configuration/) - Configure Geode
- [Docker Deployment](/docs/ops/docker-deployment/) - Run with Docker
- [Getting Started Guide](/docs/getting-started/) - First steps with Geode
- [Client Libraries](/docs/client-libraries/) - Connect from your application
