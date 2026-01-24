---
title: "Container Technologies"
description: "Learn about deploying Geode with containers using Docker, Podman, and container runtimes. Includes Dockerfile best practices, image optimization, and container orchestration basics."
keywords:
  - containers
  - Docker
  - Podman
  - containerization
  - OCI
  - container images
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/containers/"
    noindex: false
---

# Container Technologies for Geode

Containerization provides consistent, portable deployments for Geode across development, testing, and production environments. This guide covers Docker, Podman, and container best practices for running Geode in containerized environments.

## Docker Deployment

### Official Geode Image

```bash
# Pull latest image
docker pull codepros/geode:latest

# Pull specific version
docker pull codepros/geode:v0.18.0

# Run container
docker run -d \
  --name geode \
  -p 3141:3141 \
  -v geode-data:/var/lib/geode \
  codepros/geode:v0.18.0
```

### Geode Dockerfile

```dockerfile
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create geode user
RUN useradd -r -s /bin/false geode

# Copy binary
COPY --chown=geode:geode geode /usr/local/bin/geode
RUN chmod +x /usr/local/bin/geode

# Create data directory
RUN mkdir -p /var/lib/geode && chown geode:geode /var/lib/geode

USER geode
EXPOSE 3141/udp 9090/tcp

VOLUME ["/var/lib/geode"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD ["/usr/local/bin/geode", "ping"] || exit 1

ENTRYPOINT ["/usr/local/bin/geode"]
CMD ["serve", "--listen", "0.0.0.0:3141", "--data", "/var/lib/geode"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  geode:
    image: codepros/geode:v0.18.0
    container_name: geode
    ports:
      - "3141:3141"
      - "9090:9090"
    volumes:
      - geode-data:/var/lib/geode
      - ./geode.yaml:/etc/geode/geode.yaml:ro
    environment:
      - GEODE_LOG_LEVEL=info
      - GEODE_MAX_CONNECTIONS=1000
    restart: unless-stopped
    healthcheck:
      test: ["/usr/local/bin/geode", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - geode-network

volumes:
  geode-data:
    driver: local

networks:
  geode-network:
    driver: bridge
```

## Container Optimization

### Multi-Stage Build

```dockerfile
# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /build
COPY geode/ .

RUN zig build -Doptimize=ReleaseSafe

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/zig-out/bin/geode /usr/local/bin/geode

RUN useradd -r -s /bin/false geode && \
    mkdir -p /var/lib/geode && \
    chown geode:geode /var/lib/geode

USER geode
EXPOSE 3141/udp 9090/tcp
VOLUME ["/var/lib/geode"]

ENTRYPOINT ["/usr/local/bin/geode"]
CMD ["serve", "--listen", "0.0.0.0:3141", "--data", "/var/lib/geode"]
```

### Image Size Optimization

```dockerfile
# Use distroless for minimal image
FROM gcr.io/distroless/base-debian12

COPY --chown=nonroot:nonroot geode /usr/local/bin/geode
COPY --chown=nonroot:nonroot --chmod=755 /data /var/lib/geode

USER nonroot
EXPOSE 3141/udp 9090/tcp

ENTRYPOINT ["/usr/local/bin/geode"]
CMD ["serve", "--listen", "0.0.0.0:3141"]
```

## Security Best Practices

### Non-Root User

```dockerfile
# Always run as non-root
USER geode

# Or use numeric UID
USER 1000:1000
```

### Read-Only Filesystem

```bash
docker run -d \
  --name geode \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \
  -v geode-data:/var/lib/geode \
  codepros/geode:v0.18.0
```

### Resource Limits

```bash
docker run -d \
  --name geode \
  --memory=16g \
  --memory-swap=16g \
  --cpus=8 \
  --pids-limit=4096 \
  codepros/geode:v0.18.0
```

## Related Topics

- **[Orchestration](/tags/orchestration/)**: Kubernetes orchestration
- **[Deployment](/tags/deployment/)**: Deployment strategies
- **[Cloud](/tags/cloud/)**: Cloud deployments
- **[Infrastructure](/tags/infrastructure/)**: Infrastructure as Code

## Further Reading

- **Container Guide**: `/docs/deployment/containers/`
- **Docker Best Practices**: `/docs/deployment/docker-best-practices/`
- **Security Hardening**: `/docs/security/container-security/`
