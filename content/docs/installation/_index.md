---
title: "Installation"
description: "Install Geode from source, Docker, or Nix with step-by-step instructions for all supported platforms"
summary: "Complete installation guides for Geode covering source builds, Docker containers, and Nix packages on Linux, macOS, and Windows platforms."
weight: 15
keywords:
  - installation
  - install geode
  - build from source
  - docker install
  - nix install
  - setup
  - deployment
tags:
  - installation
  - setup
  - getting-started
  - deployment
categories:
  - getting-started
  - deployment-and-devops
toc: true
params:
  seo:
    keywords: "install geode, geode installation, build from source, docker setup, nix install, database setup"
    description: "Install Geode graph database with comprehensive guides for source builds, Docker containers, and Nix packages across all platforms"
---

# Installation

Get Geode running on your system with step-by-step installation instructions for all supported platforms and installation methods.

## Overview

Geode provides multiple installation options to suit different use cases and environments. Whether you're building from source for development, deploying with Docker for production, or using Nix for declarative infrastructure, Geode supports your workflow.

This section provides comprehensive installation guides for each method, including platform-specific instructions, prerequisites, verification steps, and troubleshooting tips.

## Installation Methods

### Build from Source

Build Geode from source code using the Zig compiler. This method gives you the most control and is ideal for:

- **Development**: Contributing to Geode or customizing the database
- **Latest Features**: Access to unreleased features in the main branch
- **Platform Support**: Build for any platform supported by Zig
- **Optimization**: Custom build flags for specific hardware

**Requirements**: Zig 0.15.1+ ([download from ziglang.org](https://ziglang.org/download/))

**See**: [Build from Source](from-source/)

### Docker Installation

Run Geode in Docker containers for isolated, reproducible deployments. Docker installation is ideal for:

- **Quick Start**: Get running in minutes without installing dependencies
- **Production**: Container orchestration with Docker Compose or Kubernetes
- **Isolation**: Run multiple Geode instances on the same host
- **CI/CD**: Consistent test environments

**Requirements**: Docker 20.10+ or Docker Desktop

**See**: [Docker Deployment](/docs/ops/docker-deployment/)

### Nix Installation

Use Nix for declarative, reproducible Geode installations. Nix installation is ideal for:

- **NixOS**: Native integration with NixOS modules
- **Reproducibility**: Bit-for-bit reproducible builds
- **Development**: Nix flakes for development environments
- **Hermetic Builds**: Zero-dependency build environments

**Requirements**: Nix 2.4+ with flakes enabled

**See**: [Nix Deployment](/docs/ops/nix-deployment/)

## Topics in This Section

- **[From Source](from-source/)** - Build Geode from source code with Zig including prerequisites, build commands, and platform-specific instructions

## Platform Support

### Linux

**Distributions**:
- Ubuntu 20.04+ (LTS recommended)
- Debian 11+ (Bullseye or later)
- RHEL 8+ / CentOS Stream 8+
- Fedora 35+
- Arch Linux (rolling release)

**Architectures**: x86_64 (amd64), ARM64 (aarch64)

### macOS

**Versions**: macOS 11+ (Big Sur or later)

**Architectures**: x86_64 (Intel), ARM64 (Apple Silicon)

### Windows

**Via WSL2**: Windows 10+ with Windows Subsystem for Linux 2

**Note**: Native Windows support is planned but not yet available. Use WSL2 for now.

## System Requirements

### Minimum Requirements

- **CPU**: 2 cores
- **RAM**: 4GB
- **Disk**: 2GB free space
- **Network**: For distributed deployments, stable network connectivity

### Recommended Requirements

- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB for large datasets)
- **Disk**: 10GB+ free space (SSD highly recommended)
- **Network**: 1Gbps+ for distributed deployments

### Production Requirements

- **CPU**: 8+ cores (16+ for high-throughput workloads)
- **RAM**: 32GB+ (proportional to dataset size and query complexity)
- **Disk**: 100GB+ NVMe SSD (RAID 10 recommended)
- **Network**: 10Gbps+ for distributed deployments with low latency

## Quick Start

### Option 1: Docker (Fastest)

```bash
# Pull and run Geode
docker run -d \
  -p 3141:3141 \
  -v geode-data:/var/lib/geode \
  --name geode \
  geodedb/geode:latest serve --listen 0.0.0.0:3141

# Verify server is running
docker logs geode
```

### Option 2: Build from Source

```bash
# Clone repository
git clone https://gitlab.com/devnw/codepros/geode.git
cd geode/geode

# Build (requires Zig 0.15.1+)
make build

# Start server
./zig-out/bin/geode serve

# Verify installation
./zig-out/bin/geode --version
```

### Option 3: Nix

```bash
# Run directly (no installation)
nix run github:codeprosorg/geode

# Or install to profile
nix profile install github:codeprosorg/geode
```

## Verification

After installation, verify Geode is working correctly:

```bash
# Check version
geode --version

# Start server
geode serve

# In another terminal, connect with shell
geode shell

# Run test query
RETURN 1 AS x;
```

Expected output:
```
┌───┐
│ x │
├───┤
│ 1 │
└───┘
```

## Post-Installation

### Configure TLS Certificates

For production deployments, configure TLS certificates instead of using auto-generated self-signed certificates:

```bash
# Generate certificates (or use existing)
openssl req -x509 -newkey rsa:4096 \
  -keyout server-key.pem -out server-cert.pem \
  -days 365 -nodes

# Start server with certificates
geode serve \
  --cert /etc/geode/certs/server-cert.pem \
  --key /etc/geode/certs/server-key.pem
```

### Set Up Data Directory

Choose a persistent data directory location:

```bash
# Create data directory
sudo mkdir -p /var/lib/geode
sudo chown $(whoami):$(whoami) /var/lib/geode

# Start server with custom data directory
geode serve --data-dir /var/lib/geode
```

### Configure System Service

For production, set up Geode as a system service:

**systemd** (Linux):
```bash
# Create service file
sudo vim /etc/systemd/system/geode.service

# Enable and start service
sudo systemctl enable geode
sudo systemctl start geode
```

See [Deployment Guide](/docs/ops/deployment/) for complete service configuration.

## Troubleshooting

### Build Errors

**Symptom**: Build fails with "command not found: zig"

**Solution**: Install Zig 0.15.1+ from [ziglang.org](https://ziglang.org/download/)

### Port Binding Errors

**Symptom**: "address already in use" when starting server

**Solution**: Check if another process is using port 3141:
```bash
lsof -i :3141
kill -9 <PID>
```

### Permission Errors

**Symptom**: "permission denied" when accessing data directory

**Solution**: Ensure proper ownership and permissions:
```bash
sudo chown -R $(whoami):$(whoami) /var/lib/geode
chmod 755 /var/lib/geode
```

## Next Steps

After installation:

- **[Quick Start Guide](/docs/get-started/)** - Get started with your first queries
- **[Configuration Reference](/docs/configuration/)** - Configure server settings
- **[GQL Guide](/docs/gql/guide/)** - Learn the query language
- **[Client Libraries](/docs/client-libraries/)** - Connect from your application
- **[Deployment Guide](/docs/ops/deployment/)** - Deploy to production

## Getting Help

For installation issues:

1. Check the [Troubleshooting Guide](/docs/guides/troubleshooting/)
2. Review platform-specific requirements above
3. Search existing issues on GitLab
4. Report new issues with detailed system information and error logs
