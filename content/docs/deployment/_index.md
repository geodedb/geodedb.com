---
title: "Deployment"
description: "Production deployment patterns for Geode including standalone, distributed, and cloud-native architectures"
summary: "Deploy Geode in production with confidence using proven deployment patterns for standalone, distributed clusters, Docker, Kubernetes, and cloud platforms."
weight: 80
keywords:
  - deployment
  - production
  - distributed deployment
  - kubernetes
  - docker
  - cloud deployment
  - high availability
  - clustering
tags:
  - deployment
  - production
  - distributed
  - kubernetes
  - docker
categories:
  - deployment-and-devops
  - operations
toc: true
params:
  seo:
    keywords: "geode deployment, production deployment, kubernetes, docker, distributed database, high availability"
    description: "Deploy Geode in production with standalone, distributed, or cloud-native architectures for high availability and scalability"
---

<!-- CANARY: REQ=REQ-SERVER-STARTUP-INTEGRATION-001; FEATURE="Server Startup Integration Tests"; ASPECT=EndToEndServerTesting; STATUS=TESTED; OWNER=server; UPDATED=2025-10-05 -->

# Deployment

Deploy Geode with confidence using production-ready deployment patterns designed for reliability, scalability, and operational excellence. From single-node installations to globally distributed clusters, Geode supports a wide range of deployment architectures.

## Overview

Geode's deployment model is designed for flexibility without compromising on enterprise requirements. Whether you're running a development instance on your laptop or a multi-region production cluster serving high-throughput workloads (read-only up to 100,000 txn/sec; read-write 10,000-50,000 txn/sec), Geode provides the deployment primitives you need.

The deployment subsystem integrates with modern infrastructure tooling including Docker, Kubernetes, Nix, and cloud-native platforms. Built-in support for federation, Raft consensus, and automatic failover ensures high availability without complex manual configuration.

## Deployment Patterns

### Standalone Mode

Single-node deployment ideal for development, testing, or small-scale production workloads. Provides full ACID guarantees, all query features, and complete security capabilities in a simple deployment model.

### Distributed Mode

Multi-shard distributed deployment with Raft consensus for high availability and horizontal scalability. Supports up to 32 shards with cross-shard query coordination, automatic failover, and load balancing.

### Cloud-Native

Kubernetes-ready deployment with Helm charts, StatefulSets, and native cloud integrations. Includes auto-scaling, rolling updates, and integration with cloud-native observability stacks (Prometheus, Grafana, Loki).

## Topics in This Section

- **[Deployment Patterns](deployment-patterns/)** - Comprehensive guide to standalone, distributed, and cloud-native deployment architectures

## Related Documentation

- [Docker Deployment](/docs/ops/docker-deployment/) - Docker Compose and container deployment
- [Nix Deployment](/docs/ops/nix-deployment/) - NixOS modules and Nix flakes for declarative deployment
- [Deployment Guide](/docs/ops/deployment/) - Complete production deployment guide with Vault, MinIO, and observability stack
- [Observability](/docs/ops/observability/) - Monitoring, metrics, and telemetry for production deployments

## Quick Start

```bash
# Standalone deployment
./geode serve --listen 0.0.0.0:3141

# Docker deployment
docker run -d -p 3141:3141 -v geode-data:/var/lib/geode geodedb/geode:latest

# Kubernetes deployment
helm install geode ./charts/geode --namespace geode
```

## Production Checklist

Before deploying to production:

- [ ] TLS certificates configured (not self-signed)
- [ ] Transparent Data Encryption (TDE) enabled
- [ ] Audit logging configured
- [ ] Backup automation in place
- [ ] Monitoring and alerting configured
- [ ] Load balancer health checks configured
- [ ] Resource limits set (CPU, memory, disk)
- [ ] Network policies configured
- [ ] Authentication and RBAC enabled

## Learn More

- [Installation Guide](/docs/get-started/) - Get started with local development
- [Configuration Reference](/docs/configuration/) - Complete server configuration options
- [Security Overview](/docs/security/overview/) - Security architecture and best practices
- [Multi-Datacenter Guide](/docs/guides/multi-datacenter/) - Deploy across multiple datacenters
