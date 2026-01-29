---
title: "Docker Deployment Guide"
description: "Complete guide to deploying Geode graph database with Docker: pre-built images, development environment, production deployment, and distributed clusters"
url: /docs/ops/docker-deployment/
keywords: ["docker", "containerization", "deployment", "docker compose", "orchestration", "production", "distributed", "QUIC", "TLS"]
weight: 35
slug: "docker-deployment"
canonical: "https://geodedb.com/docs/ops/docker-deployment/"
---

<!-- CANARY: REQ=REQ-SERVER-STARTUP-INTEGRATION-001; FEATURE="Server Startup Integration Tests"; ASPECT=EndToEndServerTesting; STATUS=TESTED; OWNER=server; UPDATED=2025-10-05 -->

# Docker Deployment Guide

Complete documentation for containerized deployment of Geode graph database using Docker and Docker Compose.

## Overview

Geode offers multiple Docker deployment options:
- **Pre-built images** from [Docker Hub](https://hub.docker.com/r/geodedb/geode) (fastest)
- **Development environment** with complete toolchain
- **Production deployment** with multi-stage builds
- **Distributed clusters** with 3-node Raft consensus

All Geode Docker containers use **QUIC+TLS over UDP port 8443** for secure, high-performance communication.

## Quick Start

### Using Pre-built Images (5 Minutes)

```bash
# Pull the latest image from Docker Hub
docker pull geodedb/geode:latest

# Run the container
docker run -d -p 3141:3141/udp --name geode geodedb/geode:latest

# Test connectivity
docker exec geode geode query "RETURN 1 AS health" --server 127.0.0.1:3141
```

**Expected output**:
```
Column: health
1
```

### Using Docker Compose

```yaml
version: '3.8'

services:
  geode:
    image: geodedb/geode:latest
    container_name: geode-server
    ports:
      - "3141:3141/udp"
      - "9090:9090"
    volumes:
      - geode-data:/data
    environment:
      - GEODE_LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "geode", "query", "RETURN 1", "--server", "127.0.0.1:3141"]
      interval: 30s
      timeout: 3s
      retries: 3

volumes:
  geode-data:
```

## Available Docker Images

Geode images are available on [Docker Hub](https://hub.docker.com/r/geodedb/geode) with multiple variants optimized for different use cases:

| Image Tag | Base | Size | Use Case |
|-----------|------|------|----------|
| `latest` | Debian Bookworm | ~250MB | General purpose (recommended) |
| `alpine` | Alpine 3.19 | ~80MB | Minimal size, musl libc |
| `gpu` | NVIDIA CUDA 12.6 | ~1.2GB | GPU acceleration support |
| `prod` | Distroless | ~180MB | Production, minimal attack surface |

### Pull Commands

```bash
# Standard (recommended for most deployments)
docker pull geodedb/geode:latest

# Alpine (minimal size)
docker pull geodedb/geode:alpine

# GPU support (vector operations, graph algorithms)
docker pull geodedb/geode:gpu

# Production optimized (distroless base)
docker pull geodedb/geode:prod
```

## Development Environment

A complete Docker-based development environment replicating the local development stack.

### What's Included

- **Zig 0.1.0** - Primary build system
- **Python 3.12** - Test harness and geodetestlab
- **OpenSSL 3.3.2 with FIPS** - Enterprise cryptography
- **MsQUIC v2.5.4** - High-performance QUIC implementation
- **HashiCorp Vault** - Secrets management
- **MinIO** - S3-compatible storage
- **Redis** - Caching layer
- **Optional**: Prometheus + Grafana monitoring

### Prerequisites

- Docker 20.10+
- Docker Compose 1.29+
- 8GB+ RAM
- 20GB+ disk space

### Setup & Usage

```bash
# Clone repository
git clone https://github.com/codeprosorg/geode
cd geode

# Start development environment (first build ~10 minutes)
./dev.sh start

# Check service health
./dev.sh status

# Enter development shell
./dev.sh shell

# Build Geode (inside shell)
zb          # Debug build
zbr         # Release build
zbt         # Build with tests

# Run tests
make test
make geodetestlab
make verify-fast

# Start Geode server
geode serve --listen 127.0.0.1:9999

# View logs
./dev.sh logs -f

# Stop environment
./dev.sh stop

# Full cleanup (removes volumes)
./dev.sh down
```

### Development Commands Reference

| Command | Description |
|---------|-------------|
| `./dev.sh start` | Start development environment |
| `./dev.sh stop` | Stop development environment |
| `./dev.sh restart` | Restart development environment |
| `./dev.sh shell` | Open interactive shell |
| `./dev.sh exec <cmd>` | Execute command in container |
| `./dev.sh build` | Build geode project |
| `./dev.sh test` | Run tests |
| `./dev.sh clean` | Clean build artifacts |
| `./dev.sh logs [-f]` | View logs (optionally follow) |
| `./dev.sh status` | Show service status |
| `./dev.sh down` | Remove containers and volumes |
| `./dev.sh rebuild` | Rebuild Docker image |
| `./dev.sh monitoring` | Start with Prometheus + Grafana |

### Service Access

When running the development environment, these services are available:

| Service | Port | Credentials |
|---------|------|-------------|
| Vault | 8200 | Token: `geode-dev-token` |
| MinIO Console | 9001 | `admin` / `geode-dev-secret-123` |
| Redis | 6379 | Password: `geode-dev-password` |
| Prometheus | 9090 | None |
| Grafana | 3000 | `admin` / `geode-dev-password` |

## Production Deployment

### Building Production Images

```bash
# Build complete production image
./docker-build.sh all geode:latest

# Or build specific stages
./docker-build.sh openssl     # OpenSSL FIPS only
./docker-build.sh msquic      # MsQUIC only
./docker-build.sh builder     # Full Geode build
./docker-build.sh runtime     # Production runtime
```

### Multi-Stage Build Architecture

Geode uses a four-stage build process for optimal security and size:

1. **Stage 1 - OpenSSL FIPS Builder**: Compiles OpenSSL 3.3.2 with FIPS 140-3 module
2. **Stage 2 - MsQUIC Builder**: Builds Microsoft MsQUIC v2.5.5 for high-performance QUIC
3. **Stage 3 - Geode Builder**: Compiles Geode with all dependencies
4. **Stage 4 - Runtime**: Minimal Debian base with only runtime dependencies

### Single-Node Production Deployment

```bash
# Run with production configuration
docker run -d \
  --name geode-prod \
  --restart=unless-stopped \
  -p 8443:8443/udp \
  -v /var/lib/geode:/data \
  -v /etc/geode/certs:/certs:ro \
  -e LOG_LEVEL=warn \
  geode:latest \
  --data-dir /data \
  --cert /certs/server.crt \
  --key /certs/server.key \
  --listen 0.0.0.0:8443
```

### Docker Compose Production Configuration

```yaml
version: '3.8'

services:
  geode:
    image: geodedb/geode:prod
    container_name: geode-server
    ports:
      - "8443:8443/udp"
      - "9090:9090"
    volumes:
      - geode-data:/data
      - ./certs:/certs:ro
      - ./logs:/var/log/geode
    environment:
      - GEODE_LOG_LEVEL=warn
      - GEODE_MAX_CONNECTIONS=1000
      - GEODE_CACHE_SIZE=2GB
      - FIPS_MODE=enabled
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G
    healthcheck:
      test: ["CMD", "geode", "query", "RETURN 1", "--server", "127.0.0.1:8443"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

volumes:
  geode-data:
    driver: local
```

### With TLS Certificates

```bash
# Generate self-signed certificates
docker run --rm -v ./certs:/certs geodedb/geode:latest \
  cert_gen --output-dir /certs

# Run with custom certificates
docker run -d \
  -p 8443:8443/udp \
  -v ./certs:/certs:ro \
  -v ./data:/data \
  geodedb/geode:latest \
  --data-dir /data \
  --cert /certs/server.crt \
  --key /certs/server.key \
  --listen 0.0.0.0:8443

# Verify certificate
openssl x509 -in ./certs/server.crt -text -noout
```

### With Persistent Data

```bash
# Create data directory
mkdir -p ./data

# Run with persistent storage
docker run -d \
  --name geode \
  -p 8443:8443/udp \
  -v $(pwd)/data:/data \
  geodedb/geode:latest \
  --data-dir /data
```

## Distributed Deployment

Deploy a 3-node Geode cluster with Raft consensus for high availability.

### Architecture

```
       ┌──────────────┐
       │   HAProxy    │
       │  LB (7500)   │
       └──────┬───────┘
              │
    ┌─────────┴──────────┬──────────┐
    │                    │          │
┌───▼────┐         ┌────▼────┐ ┌───▼────┐
│ Leader │◄────────► Follow-1│ │Follow-2│
│  7567  │  Raft   │  7569   │ │  7571  │
└────────┘         └─────────┘ └────────┘
```

### Quick Start

```bash
# Start distributed cluster
make docker-up-distributed

# Or manually:
docker-compose -f docker-compose.distributed.yml up -d

# Check cluster status
docker-compose -f docker-compose.distributed.yml ps

# View logs
docker-compose -f docker-compose.distributed.yml logs -f

# Stop cluster
docker-compose -f docker-compose.distributed.yml down
```

### Cluster Environment Variables

```bash
NODE_ID=node-1
NODE_ROLE=leader|follower
CLUSTER_NAME=geode-cluster
GEODE_DISTRIBUTED=true
GEODE_SHARD_COUNT=3
GEODE_REPLICATION_FACTOR=2
```

### Example Distributed Configuration

```yaml
version: '3.8'

services:
  geode-node-1:
    image: geodedb/geode:latest
    container_name: geode-leader
    ports:
      - "7567:8443/udp"
    environment:
      - NODE_ID=node-1
      - NODE_ROLE=leader
      - CLUSTER_NAME=geode-cluster
      - GEODE_DISTRIBUTED=true
    volumes:
      - geode-node-1:/data
    networks:
      - geode-cluster

  geode-node-2:
    image: geodedb/geode:latest
    container_name: geode-follower-1
    ports:
      - "7569:8443/udp"
    environment:
      - NODE_ID=node-2
      - NODE_ROLE=follower
      - CLUSTER_NAME=geode-cluster
      - GEODE_DISTRIBUTED=true
      - LEADER_HOST=geode-node-1
    volumes:
      - geode-node-2:/data
    networks:
      - geode-cluster
    depends_on:
      - geode-node-1

  geode-node-3:
    image: geodedb/geode:latest
    container_name: geode-follower-2
    ports:
      - "7571:8443/udp"
    environment:
      - NODE_ID=node-3
      - NODE_ROLE=follower
      - CLUSTER_NAME=geode-cluster
      - GEODE_DISTRIBUTED=true
      - LEADER_HOST=geode-node-1
    volumes:
      - geode-node-3:/data
    networks:
      - geode-cluster
    depends_on:
      - geode-node-1

  haproxy:
    image: haproxy:2.8
    container_name: geode-lb
    ports:
      - "7500:7500"
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro
    networks:
      - geode-cluster
    depends_on:
      - geode-node-1
      - geode-node-2
      - geode-node-3

networks:
  geode-cluster:
    driver: bridge

volumes:
  geode-node-1:
  geode-node-2:
  geode-node-3:
```

## Configuration Reference

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEODE_LOG_LEVEL` | Log level (debug, info, warn, error) | info |
| `GEODE_MAX_CONNECTIONS` | Maximum concurrent connections | 1000 |
| `GEODE_CACHE_SIZE` | Query cache size | 1GB |
| `GEODE_WAL_SIZE_LIMIT` | WAL size limit | 10GB |
| `LOG_LEVEL` | Alternative log level env var | error |
| `FIPS_MODE` | Enable FIPS 140-3 mode | enabled |
| `NODE_ID` | Cluster node identifier | - |
| `NODE_ROLE` | Cluster role (leader/follower) | - |
| `CLUSTER_NAME` | Cluster name for discovery | - |
| `GEODE_DISTRIBUTED` | Enable distributed mode | false |

### Volume Mounts

| Path | Description |
|------|-------------|
| `/data` | Persistent data storage (WAL, pages, indexes) |
| `/certs` | TLS certificates (read-only recommended) |
| `/var/log/geode` | Application logs |
| `/config` | Configuration files |

### Ports

| Port | Protocol | Description |
|------|----------|-------------|
| 8443 | UDP | QUIC with TLS 1.3 (primary communication) |
| 9090 | TCP | Prometheus metrics endpoint |
| 3141 | UDP | Alternative QUIC port (standard) |

## Security & FIPS

### FIPS Mode

OpenSSL FIPS 140-3 module is enabled by default in production images. Verify with:

```bash
# Check OpenSSL version
docker run --rm geodedb/geode:latest openssl version -a

# Check FIPS providers
docker exec <container> openssl list -providers
```

**Expected output**:
```
OpenSSL 3.3.2 with FIPS provider
Providers:
  fips
    name: OpenSSL FIPS Provider
    version: 3.0.9
```

### Security Best Practices

```yaml
services:
  geode:
    image: geodedb/geode:prod
    read_only: true                    # Immutable filesystem
    tmpfs:
      - /tmp                           # Writable temp only
    security_opt:
      - no-new-privileges:true         # Prevent privilege escalation
    cap_drop:
      - ALL                            # Drop all capabilities
    cap_add:
      - NET_BIND_SERVICE               # Only bind to privileged ports
    user: "1000:1000"                  # Run as non-root
```

### TLS Certificate Management

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout server.key \
  -out server.crt \
  -days 365 \
  -subj "/CN=geode.example.com"

# Or use Geode's built-in generator
docker run --rm -v ./certs:/certs geodedb/geode:latest \
  cert_gen --output-dir /certs --days 365

# Verify certificate
openssl x509 -in ./certs/server.crt -text -noout | grep -A 2 "Validity"
```

## GPU Acceleration

For vector operations and graph algorithms with GPU acceleration:

```bash
# Pull GPU-enabled image
docker pull geodedb/geode:gpu

# Run with GPU support
docker run -d \
  --name geode-gpu \
  --gpus all \
  -p 8443:8443/udp \
  geodedb/geode:gpu

# Verify CUDA availability
docker exec geode-gpu nvidia-smi
```

**Docker Compose with GPU**:
```yaml
services:
  geode-gpu:
    image: geodedb/geode:gpu
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## Performance Tuning

### UDP Buffer Sizes for QUIC

```bash
# Increase UDP buffer sizes for high-throughput
docker run \
  --sysctl net.core.rmem_max=26214400 \
  --sysctl net.core.wmem_max=26214400 \
  --ulimit nofile=65536:65536 \
  geodedb/geode:latest
```

### Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '8'
      memory: 16G
    reservations:
      cpus: '4'
      memory: 8G
```

### Connection Limits

```bash
# Increase connection limits
docker run -e GEODE_MAX_CONNECTIONS=10000 \
  -e GEODE_CACHE_SIZE=4GB \
  geodedb/geode:latest
```

## Monitoring & Health Checks

### Health Check Configuration

```yaml
healthcheck:
  test: ["CMD", "geode", "query", "RETURN 1", "--server", "127.0.0.1:8443"]
  interval: 30s
  timeout: 3s
  retries: 3
  start_period: 10s
```

### Prometheus Metrics

Geode exposes Prometheus metrics on port 9090:

```bash
# Access metrics
curl http://localhost:9090/metrics

# Example metrics
geode_query_duration_seconds
geode_storage_pages_written_total
geode_connections_active
geode_wal_segments_total
```

### Integration with Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['geode:9090']
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs geode

# For Docker Compose
docker-compose logs geode

# Verify port availability (UDP!)
netstat -uapn | grep 8443
```

### Common Issues

**1. Port Already in Use**

```bash
# Error: address already in use
# Solution: Change host port
docker run -p 9443:8443/udp geodedb/geode:latest
```

**2. Permission Errors**

```bash
# Fix ownership
sudo chown -R $(id -u):$(id -g) ./data

# Or set UID/GID in environment
echo "USER_UID=$(id -u)" > .env
echo "USER_GID=$(id -g)" >> .env
```

**3. Health Check Failures**

```bash
# Test manually (note: UDP, not TCP!)
docker exec geode geode query "RETURN 1" --server 127.0.0.1:8443

# Check server is listening on UDP
docker exec geode netstat -uapn | grep 8443
```

**4. Certificate Errors**

```bash
# Verify certificate validity
openssl x509 -in ./certs/server.crt -noout -dates

# Check certificate matches key
openssl x509 -in ./certs/server.crt -noout -modulus | md5sum
openssl rsa -in ./certs/server.key -noout -modulus | md5sum
# Both MD5 sums should match
```

### Debug Mode

```bash
# Enable debug logging
docker run -e GEODE_LOG_LEVEL=debug geodedb/geode:latest

# Attach for debugging
docker exec -it geode /bin/bash

# View real-time logs
docker logs -f --tail 100 geode
```

### Build Failures

```bash
# Rebuild from scratch
./dev.sh rebuild

# Try simple Dockerfile
docker build -f Dockerfile.simple -t geode:latest .

# Check Docker daemon logs
sudo journalctl -u docker.service -f
```

## Integration Testing

Geode includes a comprehensive Docker integration test suite:

```bash
# Run full integration test suite
make docker-integration-test

# View test results
cat docker-integration/results/integration_summary.json

# Run specific client tests
docker-compose -f docker-integration/docker-compose.integration.yml up client-go
docker-compose -f docker-integration/docker-compose.integration.yml up client-python
docker-compose -f docker-integration/docker-compose.integration.yml up client-rust
docker-compose -f docker-integration/docker-compose.integration.yml up client-zig
```

### Test Architecture

```
                    ┌─────────────────┐
                    │  geode-server   │
                    │ QUIC/TLS UDP:8443│
                    └────────┬────────┘
                             │
      ┌──────────────────────┼──────────────────────┐
      │                      │                      │
┌─────▼──────┐   ┌──────────▼──────────┐   ┌───────▼────────┐
│ migration  │   │   Client Tests      │   │   results-     │
│  runner    │   │  (run in parallel)  │   │  collector     │
│            │   │                      │   │                │
│ • Executes │   │ • client-go          │   │ • Aggregates   │
│   multi-   │   │ • client-python      │   │   test results │
│   statement│   │ • client-rust        │   │ • Generates    │
│   .gql     │   │ • client-zig         │   │   summary.json │
└────────────┘   └──────────────────────┘   └────────────────┘
```

## Docker Files Reference

- `Dockerfile` - Multi-stage production build
- `Dockerfile.dev` - Development environment with full toolchain
- `Dockerfile.simple` - Fallback with inline Zig installation
- `Dockerfile.prod` - Distroless production image
- `docker-compose.yml` - Standard single-node deployment
- `docker-compose.dev.yml` - Development orchestration
- `docker-compose.distributed.yml` - 3-node Raft cluster
- `docker-integration/docker-compose.integration.yml` - Integration test suite
- `dev.sh` - Development helper script
- `docker-build.sh` - Build orchestration script

## Best Practices

### Development

- Use `./dev.sh` commands for consistent environment
- Mount source code for live reloading
- Enable debug logging (`GEODE_LOG_LEVEL=debug`)
- Use named volumes for persistent data

### Production

- Use `prod` or `latest` image tags
- Enable read-only filesystem
- Set resource limits (CPU, memory)
- Use health checks for orchestration
- Enable FIPS mode for compliance
- Run as non-root user
- Use secrets management (Vault, Docker secrets)
- Configure proper TLS certificates
- Monitor with Prometheus/Grafana

### Security

- Always use TLS certificates in production
- Enable FIPS mode for cryptographic compliance
- Use distroless base images for minimal attack surface
- Drop unnecessary capabilities
- Run containers as non-root
- Use read-only filesystem where possible
- Scan images for vulnerabilities
- Rotate credentials regularly

## Next Steps

- [Server Configuration](/docs/configuration/server-configuration/) - Detailed configuration options
- [Observability](/docs/ops/observability/) - Monitoring and logging setup
- [Multi-Datacenter Deployment](/docs/guides/multi-datacenter/) - Advanced distributed deployment
- [Backup Automation](/docs/guides/backup-automation/) - S3 backup integration
- [Security Overview](/docs/security/overview/) - Enterprise security features

## Resources

- [Geode on Docker Hub](https://hub.docker.com/r/geodedb/geode) - Official Geode container images
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [QUIC Protocol](https://datatracker.ietf.org/doc/html/rfc9000)

---

**License**: Apache License 2.0
**Copyright**: 2024-2025 CodePros
**Last Updated**: January 2026
