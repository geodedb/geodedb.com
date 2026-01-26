---
title: "Tag: Docker Containerization"
description: "Explore Geode documentation tagged with docker. Learn about docker features, best practices, and implementation details."
keywords:
  - docker
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/docker/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Docker containerization provides a standardized, portable way to deploy Geode across development, testing, and production environments. Containers encapsulate Geode with its dependencies, ensuring consistent behavior regardless of the host system.

Geode's official Docker images are optimized for production use, with carefully tuned defaults, comprehensive health checks, and support for orchestration platforms like Docker Compose and Kubernetes. Whether you're running a single-node development instance or a multi-region distributed cluster, Docker simplifies Geode deployment and management.

This guide covers Docker-based Geode deployments, from basic containers through advanced production configurations with persistence, networking, monitoring, and security.

## Official Geode Docker Images

Geode provides official images on Docker Hub and GitHub Container Registry:

```bash
# Pull latest stable version
docker pull geodedb/geode:latest

# Pull specific version
docker pull geodedb/geode:v0.18.0

# Pull from GitHub Container Registry
docker pull ghcr.io/devnw/geode:latest
```

**Image Variants**:
- `geode:latest` - Latest stable release
- `geode:v0.18.0` - Specific version tag
- `geode:alpine` - Alpine Linux based (smaller size)
- `geode:distroless` - Minimal distroless image (maximum security)

## Quick Start with Docker

**Run Geode in a Container**:

```bash
# Basic single-node instance
docker run -d \
  --name geode \
  -p 3141:3141 \
  -p 8080:8080 \
  geodedb/geode:latest

# Verify it's running
docker ps

# Check logs
docker logs geode

# Connect with shell
docker exec -it geode geode shell
```

**Run with Persistent Storage**:

```bash
# Create volume for data persistence
docker volume create geode-data

# Run with mounted volume
docker run -d \
  --name geode \
  -p 3141:3141 \
  -v geode-data:/var/lib/geode \
  geodedb/geode:latest
```

**Environment Variables**:

```bash
docker run -d \
  --name geode \
  -e GEODE_LOG_LEVEL=DEBUG \
  -e GEODE_MAX_CONNECTIONS=500 \
  -e GEODE_MEMORY_LIMIT=4GB \
  -e GEODE_ENABLE_METRICS=true \
  -p 3141:3141 \
  geodedb/geode:latest
```

## Docker Compose Configuration

For multi-container setups, use Docker Compose:

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
      - "8080:8080"
    volumes:
      - geode-data:/var/lib/geode
      - ./geode.toml:/etc/geode/geode.toml:ro
    environment:
      - GEODE_LOG_LEVEL=INFO
      - GEODE_MAX_CONNECTIONS=1000
    healthcheck:
      test: ["CMD", "geode", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - geode-network

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    networks:
      - geode-network

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana-dashboards:/etc/grafana/provisioning/dashboards:ro
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password
    networks:
      - geode-network

volumes:
  geode-data:
  prometheus-data:
  grafana-data:

networks:
  geode-network:
    driver: bridge
```

**Start the Stack**:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f geode

# Stop services
docker-compose down

# Stop and remove volumes (data loss!)
docker-compose down -v
```

## Production Configuration

**Resource Limits**:

```yaml
services:
  geode:
    image: geodedb/geode:latest
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
      memlock:
        soft: -1
        hard: -1
```

**TLS Configuration**:

```yaml
services:
  geode:
    image: geodedb/geode:latest
    volumes:
      - ./certs/server.crt:/etc/geode/tls/server.crt:ro
      - ./certs/server.key:/etc/geode/tls/server.key:ro
      - ./certs/ca.crt:/etc/geode/tls/ca.crt:ro
    environment:
      - GEODE_TLS_ENABLED=true
      - GEODE_TLS_CERT=/etc/geode/tls/server.crt
      - GEODE_TLS_KEY=/etc/geode/tls/server.key
      - GEODE_TLS_CA=/etc/geode/tls/ca.crt
      - GEODE_TLS_CLIENT_AUTH=required
```

**Custom Configuration File**:

```toml
# geode.toml
[server]
listen = "0.0.0.0:3141"
max_connections = 1000
query_timeout = "30s"

[storage]
data_dir = "/var/lib/geode/data"
wal_dir = "/var/lib/geode/wal"
checkpoint_interval = "5m"

[logging]
level = "INFO"
format = "json"

[metrics]
enabled = true
endpoint = "/metrics"
```

Mount the configuration:
```yaml
volumes:
  - ./geode.toml:/etc/geode/geode.toml:ro
```

## Data Persistence and Backup

**Volume Management**:

```bash
# Create named volume
docker volume create geode-data

# Inspect volume
docker volume inspect geode-data

# Backup volume
docker run --rm \
  -v geode-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/geode-backup-$(date +%Y%m%d).tar.gz -C /data .

# Restore volume
docker run --rm \
  -v geode-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/geode-backup-20240124.tar.gz -C /data
```

**Bind Mounts for Development**:

```yaml
services:
  geode:
    volumes:
      # Bind mount for local development
      - ./data:/var/lib/geode
      - ./logs:/var/log/geode
```

## Networking and Service Discovery

**Bridge Network** (default):
```yaml
networks:
  geode-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

**Host Network** (better performance, less isolation):
```yaml
services:
  geode:
    network_mode: host
```

**Custom DNS**:
```yaml
services:
  geode:
    dns:
      - 8.8.8.8
      - 8.8.4.4
    dns_search:
      - internal.example.com
```

**Service Discovery**:
```yaml
services:
  app:
    environment:
      - GEODE_HOST=geode:3141
    depends_on:
      - geode
```

## Multi-Node Cluster with Docker

Deploy a distributed Geode cluster:

```yaml
version: '3.8'

services:
  geode-node-1:
    image: geodedb/geode:latest
    container_name: geode-node-1
    hostname: node-1
    environment:
      - GEODE_NODE_ID=1
      - GEODE_CLUSTER_PEERS=node-2:3141,node-3:3141
      - GEODE_BIND_ADDRESS=0.0.0.0
    ports:
      - "3141:3141"
    volumes:
      - geode-node-1-data:/var/lib/geode
    networks:
      - geode-cluster

  geode-node-2:
    image: geodedb/geode:latest
    container_name: geode-node-2
    hostname: node-2
    environment:
      - GEODE_NODE_ID=2
      - GEODE_CLUSTER_PEERS=node-1:3141,node-3:3141
    ports:
      - "3142:3141"
    volumes:
      - geode-node-2-data:/var/lib/geode
    networks:
      - geode-cluster

  geode-node-3:
    image: geodedb/geode:latest
    container_name: geode-node-3
    hostname: node-3
    environment:
      - GEODE_NODE_ID=3
      - GEODE_CLUSTER_PEERS=node-1:3141,node-2:3141
    ports:
      - "3143:3141"
    volumes:
      - geode-node-3-data:/var/lib/geode
    networks:
      - geode-cluster

volumes:
  geode-node-1-data:
  geode-node-2-data:
  geode-node-3-data:

networks:
  geode-cluster:
    driver: overlay
```

## Health Checks and Monitoring

**Built-in Health Checks**:

```yaml
services:
  geode:
    healthcheck:
      test: ["CMD", "geode", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
```

**Custom Health Check Script**:

```bash
#!/bin/bash
# health-check.sh
set -e

# Check if Geode is responding
if ! geode shell -c "RETURN 1" > /dev/null 2>&1; then
  echo "Geode health check failed"
  exit 1
fi

echo "Geode is healthy"
exit 0
```

```yaml
healthcheck:
  test: ["/health-check.sh"]
  interval: 30s
```

## Security Best Practices

**Run as Non-Root User**:

```dockerfile
# Custom Dockerfile
FROM geodedb/geode:latest

# Create non-root user
RUN adduser -D -u 1000 geode

# Change ownership
RUN chown -R geode:geode /var/lib/geode /var/log/geode

USER geode
```

**Read-Only Root Filesystem**:

```yaml
services:
  geode:
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
    volumes:
      - geode-data:/var/lib/geode:rw
```

**Secrets Management**:

```yaml
services:
  geode:
    secrets:
      - geode_admin_password
      - tls_key
    environment:
      - GEODE_ADMIN_PASSWORD_FILE=/run/secrets/geode_admin_password
      - GEODE_TLS_KEY_FILE=/run/secrets/tls_key

secrets:
  geode_admin_password:
    file: ./secrets/admin_password.txt
  tls_key:
    file: ./secrets/tls.key
```

**Security Scanning**:

```bash
# Scan image for vulnerabilities
docker scan geodedb/geode:latest

# Use Trivy for scanning
trivy image geodedb/geode:latest
```

## Development Workflows

**Hot Reload Development**:

```yaml
services:
  geode-dev:
    image: geodedb/geode:latest
    volumes:
      - ./src:/app/src:ro
      - ./geode.toml:/etc/geode/geode.toml:ro
    environment:
      - GEODE_DEV_MODE=true
      - GEODE_AUTO_RELOAD=true
```

**Integration Testing**:

```bash
# Start test instance
docker-compose -f docker-compose.test.yml up -d

# Run tests
npm test

# Cleanup
docker-compose -f docker-compose.test.yml down -v
```

**CI/CD Pipeline**:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      geode:
        image: geodedb/geode:latest
        ports:
          - 3141:3141
        options: >-
          --health-cmd "geode ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - name: Run integration tests
        run: npm test
        env:
          GEODE_HOST: localhost:3141
```

## Troubleshooting Docker Deployments

**Container Won't Start**:
```bash
# Check logs
docker logs geode

# Inspect container
docker inspect geode

# Check resource constraints
docker stats geode
```

**Permission Issues**:
```bash
# Fix volume permissions
docker run --rm \
  -v geode-data:/data \
  alpine chown -R 1000:1000 /data
```

**Network Connectivity**:
```bash
# Test network connectivity
docker exec geode ping -c 3 geode-node-2

# Check exposed ports
docker port geode
```

**Performance Issues**:
```bash
# Monitor resource usage
docker stats --no-stream

# Check disk I/O
docker exec geode iostat -x 1 5
```

## Best Practices

1. **Use Specific Version Tags**: Avoid `latest` in production
2. **Implement Health Checks**: Enable proper health monitoring
3. **Limit Resources**: Set CPU and memory limits
4. **Persist Data**: Use volumes for all persistent data
5. **Use Secrets**: Never put credentials in environment variables
6. **Monitor Logs**: Centralize log aggregation
7. **Regular Updates**: Keep images updated for security patches
8. **Test Restarts**: Verify graceful shutdown and recovery
9. **Document Configuration**: Maintain documentation for all settings
10. **Backup Regularly**: Automate backup procedures

## Related Topics

- [Kubernetes Orchestration](/tags/kubernetes/)
- [Deployment and DevOps](/tags/deployment/)
- [Infrastructure and Operations](/tags/infrastructure/)
- [Configuration Management](/tags/configuration/)
- [Monitoring and Observability](/tags/monitoring/)
- [Security Best Practices](/tags/security/)
- [Production Operations](/tags/production/)

## Further Reading

- Docker Deployment Guide
- Container Security Hardening
- Kubernetes Migration Path
- Production Checklist
- Backup and Recovery Procedures
