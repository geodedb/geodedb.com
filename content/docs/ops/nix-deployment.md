---
title: "Nix and NixOS Deployment Guide"
description: "Complete guide to deploying Geode using Nix, NixOS modules, declarative configuration, and reproducible builds for production environments."
summary: "Comprehensive Nix deployment covering package variants, NixOS modules, declarative configuration, Docker integration, Kubernetes, and development environments."
slug: "nix-deployment"
url: "/docs/ops/nix-deployment/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 35
keywords: ["Nix deployment", "NixOS", "declarative configuration", "reproducible builds", "Nix flakes", "systemd service", "infrastructure as code"]
tags: ["operations", "deployment", "Nix", "infrastructure"]
categories: ["Operations"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/ops/nix-deployment/"
    noindex: false
---

<!-- CANARY: REQ=REQ-SERVER-STARTUP-INTEGRATION-001; FEATURE="Server Startup Integration Tests"; ASPECT=EndToEndServerTesting; STATUS=TESTED; OWNER=server; UPDATED=2025-10-05 -->

## Overview

Geode provides first-class Nix support for reproducible builds, declarative configuration, and seamless NixOS integration. This guide covers all aspects of Nix-based deployment from development to production.

### What You'll Learn

- Building Geode with Nix
- NixOS module configuration
- Package variants (release, debug, static, docker)
- Development environments
- Production deployment patterns
- Kubernetes and Docker integration

### Prerequisites

- Nix installed (see [Nix Installation](https://nixos.org/download.html))
- Basic understanding of Nix expressions
- For NixOS deployment: NixOS 23.05+

## Quick Start

### Building Geode

```bash
# Clone repository
git clone https://github.com/codeprosorg/geode
cd geode

# Build default package (production-ready)
nix build

# Build specific variants
nix build .#geode-debug     # Debug build
nix build .#geode-static    # Static build
nix build .#geode-docker    # Docker image

# Run directly
nix run

# Run with custom arguments
nix run . -- serve --help
```

### Development Environment

```bash
# Enter development shell
nix develop

# Available commands in shell:
# - make build, make test, make release
# - zig build, zig test
# - docker, docker-compose
# - prometheus, grafana
```

## Architecture

### Repository Structure

```
geode/
├── flake.nix                      # Main flake definition
├── nix/
│   ├── packages/
│   │   ├── geode.nix             # Main package
│   │   ├── geode-docker.nix      # Docker image
│   │   └── zcap.nix              # Legacy compatibility
│   ├── modules/
│   │   ├── geode-daemon.nix      # NixOS service module
│   │   └── config-validation.nix # Validation utilities
│   └── templates/
│       ├── geode-service/        # Service template
│       └── geode-dev/            # Development template
```

### Flake Outputs

The `flake.nix` provides:
- `packages`: Binary packages (geode, geode-debug, geode-static, geode-docker)
- `nixosModules`: NixOS modules (geode-daemon)
- `devShells`: Development environments (default, ci, deploy)
- `templates`: Project templates
- `apps`: Runnable applications

## Package Variants

### geode (Default)

Production-ready optimized build:

```nix
{
  optimize = "ReleaseSafe";
  enableQuic = true;
  enableSentinel = false;
  enableTests = true;
}
```

**Use Cases**: Production deployments, containers, distribution

**Build**:
```bash
nix build
# Result in ./result/bin/geode
```

### geode-debug

Development build with debugging support:

```nix
{
  optimize = "Debug";
  enableQuic = true;
  enableSentinel = true;  # Memory debugging
  enableTests = true;
}
```

**Use Cases**: Development, debugging, testing

**Build**:
```bash
nix build .#geode-debug
```

### geode-static

Statically linked build for containers:

```nix
{
  optimize = "ReleaseSafe";
  enableQuic = true;
  linkage = "static";  # Where possible
}
```

**Use Cases**: Minimal containers, embedded systems

**Build**:
```bash
nix build .#geode-static
```

### geode-docker

Complete Docker image with runtime:

```nix
{
  baseImage = "minimal";
  includeCA = true;
  autoGenerateCerts = true;
  healthChecks = true;
  securityHardening = true;
}
```

**Use Cases**: Container orchestration, cloud deployments

**Build and Load**:
```bash
nix build .#geode-docker
docker load < result
docker tag geode:latest myregistry.com/geode:latest
```

## NixOS Module

### Basic Configuration

Add to your `configuration.nix`:

```nix
{
  # Import Geode module
  imports = [
    (fetchGit {
      url = "https://github.com/codeprosorg/geode";
      ref = "main";
    } + "/nix/modules/geode-daemon.nix")
  ];

  # Enable and configure
  services.geode = {
    enable = true;

    # Network settings
    network = {
      listenAddress = "0.0.0.0";
      quicPort = 3141;
    };

    # Performance settings
    performance = {
      maxConnections = 1000;
      memoryLimit = "4GB";
    };

    # Enable monitoring
    monitoring.enable = true;
  };
}
```

### Production Configuration

```nix
services.geode = {
  enable = true;

  # Network configuration
  network = {
    listenAddress = "0.0.0.0";
    quicPort = 3141;
  };

  # Performance tuning
  performance = {
    maxConnections = 5000;
    workerThreads = 16;        # Or 0 for auto-detect
    memoryLimit = "16GB";
  };

  # Storage configuration
  storage = {
    walSegmentSize = "512MB";
    checkpointInterval = "30m";
    pageSize = 16384;          # 16KB pages
  };

  # TLS with real certificates
  tls = {
    generateSelfSigned = false;
    certFile = "/etc/ssl/certs/geode.crt";
    keyFile = "/etc/ssl/private/geode.key";
  };

  # Federation for distributed setup
  federation = {
    enable = true;
    role = "shard";            # or "coordinator"
    peers = [
      "coordinator1.prod.com:3141"
      "coordinator2.prod.com:3141"
    ];
  };

  # S3 backups
  backup = {
    enable = true;
    s3Bucket = "prod-geode-backups";
    s3Region = "us-west-2";
    schedule = "0 2 * * *";    # Daily at 2 AM
  };

  # Change Data Capture
  cdc = {
    enable = true;
    webhookUrl = "https://api.prod.com/geode-events";
    retention = "30d";
  };

  # Monitoring and metrics
  monitoring = {
    enable = true;
    metricsPort = 9090;
  };

  # Logging
  logging = {
    level = "info";
    json = true;
  };

  # Environment variables
  environment = {
    GEODE_ENVIRONMENT = "production";
    RUST_LOG = "info";
  };
};
```

### High Availability Configuration

```nix
services.geode = {
  enable = true;

  federation = {
    enable = true;
    role = "coordinator";      # Primary coordinator
    peers = [
      "geode-shard-1.internal:3141"
      "geode-shard-2.internal:3141"
      "geode-shard-3.internal:3141"
    ];
  };

  network = {
    listenAddress = "0.0.0.0";
    quicPort = 3141;
  };

  # Shared storage (NFS/distributed storage)
  dataDir = "/shared/geode/coordinator";

  extraConfig = ''
    # Cluster settings
    cluster_heartbeat_interval = "5s"
    cluster_election_timeout = "30s"
    cluster_replication_factor = 3

    # Consistency settings
    consistency_level = "quorum"
    read_preference = "primary_preferred"
  '';
};

# Load balancer (HAProxy)
services.haproxy = {
  enable = true;
  config = ''
    global
        daemon

    defaults
        mode tcp
        timeout connect 5000ms
        timeout client 50000ms
        timeout server 50000ms

    frontend geode_frontend
        bind *:3141
        default_backend geode_servers

    backend geode_servers
        balance roundrobin
        server coord1 geode-coord-1.internal:3141 check
        server coord2 geode-coord-2.internal:3141 check
        server coord3 geode-coord-3.internal:3141 check
  '';
};
```

## Configuration Validation

The NixOS module includes comprehensive validation:

```nix
# Memory size validation
services.geode.performance.memoryLimit = "4GB";   # ✓ Valid
services.geode.performance.memoryLimit = "4000";  # ✗ Invalid

# Duration validation
services.geode.storage.checkpointInterval = "10m";  # ✓ Valid
services.geode.storage.checkpointInterval = "600";  # ✗ Invalid

# Network address validation
services.geode.network.listenAddress = "0.0.0.0";      # ✓ Valid
services.geode.network.listenAddress = "invalid.ip";   # ✗ Invalid

# Port validation
services.geode.network.quicPort = 3141;   # ✓ Valid
services.geode.network.quicPort = 70000;  # ✗ Invalid
```

## Docker Integration

### Building Docker Images

```bash
# Build Docker image with Nix
nix build .#geode-docker

# Load into Docker
docker load < result

# Tag and push
docker tag geode:latest myregistry.com/geode:latest
docker push myregistry.com/geode:latest
```

### Running Containers

```bash
# Basic container
docker run -d \
  --name geode \
  --restart unless-stopped \
  -p 3141:3141/udp \
  -v geode-data:/var/lib/geode \
  -v geode-logs:/var/log/geode \
  geode:latest serve

# With custom configuration
docker run -d \
  --name geode \
  -p 3141:3141/udp \
  -v ./geode.conf:/etc/geode/geode.conf:ro \
  -v geode-data:/var/lib/geode \
  -e GEODE_LOG_LEVEL=debug \
  geode:latest serve
```

### Docker Compose

```yaml
version: '3.8'

services:
  geode:
    image: geode:latest
    container_name: geode-server
    restart: unless-stopped
    ports:
      - "3141:3141/udp"   # QUIC
      - "9090:9090"       # Metrics
    volumes:
      - geode-data:/var/lib/geode
      - geode-logs:/var/log/geode
      - ./config:/etc/geode:ro
    environment:
      - GEODE_LOG_LEVEL=info
      - GEODE_JSON_LOGS=true
    healthcheck:
      test: ["CMD", "geode", "health-check"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
        reservations:
          memory: 2G
          cpus: '1.0'

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9091:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123

volumes:
  geode-data:
  geode-logs:
  prometheus-data:
  grafana-data:
```

## Development Environments

### Standard Development Shell

```bash
nix develop
```

**Included Tools**:
- Zig 0.15.1+ compiler
- Go toolchain for clients
- QUIC libraries
- Debugging tools (gdb, valgrind, strace)
- Network tools (tcpdump, wireshark, netcat)
- Container tools (docker, podman)
- Monitoring tools (prometheus, grafana)
- Documentation tools (mdbook, plantuml)

### Specialized Shells

```bash
# Minimal CI environment
nix develop .#ci
# Provides: zig, git, openssl, pkg-config

# Deployment environment
nix develop .#deploy
# Provides: geode package, systemd, docker, kubectl, terraform
```

### Custom Development Environment

```nix
# flake.nix
{
  inputs.geode.url = "github:codeprosorg/geode";

  outputs = { self, nixpkgs, geode, ... }:
    let
      pkgs = nixpkgs.legacyPackages.x86_64-linux;
    in {
      devShells.default = pkgs.mkShell {
        inputsFrom = [ geode.devShells.x86_64-linux.default ];

        packages = with pkgs; [
          jq
          curl
          postgresql
        ];

        shellHook = ''
          echo "🚀 Custom Geode Development Environment"

          # Set up local database
          export GEODE_DATA_DIR=./dev-data
          mkdir -p $GEODE_DATA_DIR

          # Custom aliases
          alias gd="geode --data-dir=$GEODE_DATA_DIR"
          alias gs="geode serve --data-dir=$GEODE_DATA_DIR"
        '';
      };
    };
}
```

## Security Features

### SystemD Hardening

The NixOS module applies comprehensive security:

```nix
systemd.services.geode.serviceConfig = {
  # Privilege restrictions
  NoNewPrivileges = true;
  PrivateTmp = true;
  ProtectSystem = "strict";
  ProtectHome = true;

  # Kernel protections
  ProtectKernelTunables = true;
  ProtectKernelModules = true;
  ProtectControlGroups = true;

  # Resource restrictions
  RestrictRealtime = true;
  RestrictSUIDSGID = true;
  RemoveIPC = true;

  # File system access
  ReadWritePaths = [ "/var/lib/geode" "/var/log/geode" ];
  ReadOnlyPaths = [ "/etc/geode" ];
};
```

### TLS Configuration

```nix
# Self-signed certificates (development)
services.geode.tls = {
  generateSelfSigned = true;
  certFile = "/etc/geode/server.crt";
  keyFile = "/etc/geode/server.key";
};

# Production certificates
services.geode.tls = {
  generateSelfSigned = false;
  certFile = "/etc/ssl/certs/geode.crt";
  keyFile = "/etc/ssl/private/geode.key";
};

# Let's Encrypt integration
security.acme = {
  acceptTerms = true;
  defaults.email = "admin@example.com";
  certs."geode.example.com" = {
    domain = "geode.example.com";
    dnsProvider = "cloudflare";
    credentialsFile = "/etc/nixos/cloudflare-credentials";
  };
};

services.geode.tls = {
  generateSelfSigned = false;
  certFile = "/var/lib/acme/geode.example.com/cert.pem";
  keyFile = "/var/lib/acme/geode.example.com/key.pem";
};
```

### Firewall Configuration

```nix
# Automatic firewall rules
networking.firewall = {
  enable = true;
  allowedTCPPorts = [ 3141 9090 ];  # QUIC, Metrics
  allowedUDPPorts = [ 3141 ];       # QUIC
};

# Custom firewall rules
networking.firewall.extraCommands = ''
  # Rate limiting
  iptables -A INPUT -p udp --dport 3141 -m limit --limit 1000/sec -j ACCEPT
  iptables -A INPUT -p udp --dport 3141 -j DROP
'';
```

## Monitoring Integration

### Prometheus

```nix
services.prometheus = {
  enable = true;
  port = 9091;

  scrapeConfigs = [
    {
      job_name = "geode";
      static_configs = [{
        targets = [ "localhost:9090" ];
        labels = {
          instance = "geode-primary";
          environment = "production";
        };
      }];
      scrape_interval = "15s";
      metrics_path = "/metrics";
    }
  ];

  rules = [
    ''
      groups:
      - name: geode
        rules:
        - alert: GeodeDown
          expr: up{job="geode"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Geode instance is down"
    ''
  ];
};
```

### Grafana

```nix
services.grafana = {
  enable = true;
  settings = {
    server = {
      http_addr = "127.0.0.1";
      http_port = 3000;
    };
  };

  provision = {
    enable = true;

    datasources.settings.datasources = [{
      name = "Prometheus";
      type = "prometheus";
      url = "http://localhost:9091";
      isDefault = true;
    }];
  };
};
```

## Performance Tuning

### System-Level Optimizations

```nix
boot.kernel.sysctl = {
  # Network tuning
  "net.core.rmem_max" = 134217728;
  "net.core.wmem_max" = 134217728;
  "net.ipv4.udp_mem" = "102400 873800 16777216";

  # File system tuning
  "vm.dirty_ratio" = 15;
  "vm.dirty_background_ratio" = 5;
  "vm.swappiness" = 1;

  # Process limits
  "fs.file-max" = 2097152;
  "kernel.pid_max" = 4194304;
};
```

### Geode Performance Configuration

```nix
services.geode = {
  performance = {
    maxConnections = 5000;
    workerThreads = 16;
    memoryLimit = "16GB";
  };

  storage = {
    walSegmentSize = "1GB";
    checkpointInterval = "1h";
    pageSize = 32768;
  };

  extraConfig = ''
    buffer_pool_size = "12GB"
    wal_buffer_size = "512MB"
    max_wal_size = "4GB"

    connection_pool_size = 100
    connection_timeout = "30s"

    query_cache_size = "1GB"
    query_timeout = "300s"

    io_threads = 8
    sync_method = "fsync"
  '';
};
```

## Troubleshooting

### Build Failures

```bash
# Check Zig version
zig version  # Should be 0.15.1+

# Clean build cache
rm -rf zig-cache zig-out
nix build --rebuild

# Check dependencies
nix flake check
```

### Service Start Failures

```bash
# Check systemd status
systemctl status geode
journalctl -u geode -f

# Validate configuration
geode --config=/etc/geode/geode.conf --validate-config

# Check permissions
ls -la /var/lib/geode /var/log/geode /etc/geode
```

### Network Issues

```bash
# Check QUIC port
ss -tulpn | grep 3141

# Test connectivity
nc -u localhost 3141

# Check firewall
iptables -L -n | grep 3141
```

## Best Practices

### Reproducible Builds

1. **Pin Nix dependencies** in `flake.lock`
2. **Use fixed revisions** for critical dependencies
3. **Test builds** in clean environments (`nix build --no-link`)
4. **Version flake outputs** (`packages.geode-v1-0-0`)

### Configuration Management

1. **Use NixOS modules** for declarative configuration
2. **Validate inputs** with assertion checks
3. **Document defaults** in module options
4. **Test configurations** before deployment

### Deployment Workflow

1. **Build locally**: `nix build`
2. **Test in VM**: `nixos-rebuild build-vm`
3. **Deploy to staging**: `nixos-rebuild switch --target-host staging`
4. **Verify**: Check services, logs, metrics
5. **Deploy to production**: `nixos-rebuild switch --target-host prod`

### Security

1. **Always use TLS** in production
2. **Enable systemd hardening** (automatic with NixOS module)
3. **Restrict file system access** to necessary paths
4. **Audit firewall rules** regularly
5. **Rotate credentials** periodically

## Next Steps

**Explore More**:
- [Deployment Guide](/docs/ops/deployment/) - General deployment
- [Docker Deployment](/docs/ops/docker-deployment/) - Container-specific
- [Kubernetes](/docs/ops/deployment/#kubernetes) - Orchestration

**Related Topics**:
- [Configuration Reference](/docs/configuration/server-configuration/) - All options
- [Security Overview](/docs/security/overview/) - Security hardening
- [Monitoring](/docs/ops/telemetry-advanced/) - Observability

**Resources**:
- [Nix Documentation](https://nixos.org/manual/nix/stable/)
- [NixOS Manual](https://nixos.org/manual/nixos/stable/)
- [Nix Flakes](https://nixos.wiki/wiki/Flakes)

---

**Nix Version**: 2.18+
**NixOS**: 23.05+
**Package Variants**: 4 (geode, geode-debug, geode-static, geode-docker)
**Status**: Production-ready
