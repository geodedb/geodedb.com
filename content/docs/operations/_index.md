---
title: "Operations"
description: "Operational guides for deploying, managing, and maintaining Geode in production environments"
summary: "Comprehensive operational documentation covering backup and recovery, monitoring, disaster recovery, upgrades, and migration procedures for production Geode deployments."
weight: 86
keywords:
  - operations
  - backup
  - monitoring
  - disaster recovery
  - upgrades
  - migration
  - production
tags:
  - operations
  - production
  - devops
  - sre
categories:
  - operations
toc: true
params:
  seo:
    keywords: "geode operations, backup, monitoring, disaster recovery, upgrades, migration, production deployment"
    description: "Complete operational guides for deploying and maintaining Geode in production"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Operations

Comprehensive operational guides for deploying, managing, and maintaining Geode in production environments. From single-node deployments to globally distributed clusters, these guides provide battle-tested practices for operational excellence.

## Overview

Running Geode in production requires careful attention to:

- **Backup and Recovery**: Protecting data with automated backups and tested restore procedures
- **Monitoring**: Observability with metrics, logging, and alerting
- **Disaster Recovery**: Business continuity planning and tested failover procedures
- **Upgrades**: Safe version upgrades with minimal downtime
- **Migration**: Moving data between environments and versions

Whether you're a DevOps engineer, SRE, or database administrator, these guides cover the operational aspects of Geode that ensure reliability, performance, and data protection.

## Topics in This Section

- **[Backup Procedures](/docs/operations/backup/)** - Automated backup strategies including S3 cloud storage, incremental backups, and point-in-time recovery
- **[Monitoring](/docs/operations/monitoring/)** - Set up comprehensive monitoring with Prometheus, Grafana, and alerting
- **[Disaster Recovery](/docs/operations/disaster-recovery/)** - DR planning, RTO/RPO objectives, and failover procedures
- **[Upgrade Procedures](/docs/operations/upgrades/)** - Safe upgrade strategies including rolling upgrades and blue-green deployments
- **[Migration Guide](/docs/operations/migration/)** - Migrate data between versions, environments, and from other databases

## Operational Checklist

### Pre-Production Checklist

Before deploying to production, verify:

- [ ] **Backup configured**: Automated backups to S3-compatible storage
- [ ] **Backup tested**: Restore procedure verified in staging
- [ ] **Monitoring deployed**: Prometheus metrics scraping, Grafana dashboards
- [ ] **Alerts configured**: Critical alerts for availability and performance
- [ ] **TLS certificates**: Valid certificates from trusted CA (not self-signed)
- [ ] **Authentication enabled**: Strong authentication with MFA for admins
- [ ] **Authorization configured**: RBAC/RLS policies for data access
- [ ] **Audit logging enabled**: Compliance-ready audit trail
- [ ] **DR plan documented**: Recovery procedures tested and documented
- [ ] **Runbooks created**: Operational procedures for common tasks

### Day 2 Operations

Ongoing operational tasks:

| Task | Frequency | Description |
|------|-----------|-------------|
| Backup verification | Weekly | Test restore from latest backup |
| Log review | Daily | Check for errors and anomalies |
| Metrics review | Daily | Monitor resource utilization trends |
| Certificate renewal | 30 days before expiry | Renew TLS certificates |
| Password rotation | 90 days | Rotate service account passwords |
| Security patches | As released | Apply security updates |
| Capacity review | Monthly | Plan for growth |
| DR drill | Quarterly | Test failover procedures |

## Quick Reference

### Health Checks

```bash
# Server health
curl http://localhost:8080/health

# Readiness check (for load balancers)
curl http://localhost:8080/ready

# Liveness check (for orchestrators)
curl http://localhost:8080/live

# Detailed status
geode query "SHOW CLUSTER STATUS"
```

### Backup Operations

```bash
# Create full backup
geode backup --dest s3://bucket/backups --mode full

# Create incremental backup
geode backup --dest s3://bucket/backups --mode incremental

# List backups
geode backup --dest s3://bucket/backups --list

# Restore from backup
geode restore --source s3://bucket/backups --backup-id <id>
```

### Monitoring

```bash
# View metrics
curl http://localhost:8080/metrics

# View logs
journalctl -u geode -f

# Check resource usage
geode query "CALL geode.storage.stats()"
```

### Common Operations

```bash
# Graceful shutdown
systemctl stop geode

# Force restart
systemctl restart geode

# Check configuration
geode config validate

# Database maintenance
# There is no `geode admin` subcommand. Geode's CLI is: serve, shell, query,
# lsp, backup, restore, migrate, auth, login, logout, user, role, tenant,
# policy, grant, revoke, completion, mcp.
```

## Architecture Overview

### Standalone Deployment

```
┌─────────────────────────────────────────────────┐
│                   Geode Server                   │
│                  (QUIC:3141)                     │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │              Query Engine                 │   │
│  │  ┌──────┐  ┌──────────┐  ┌───────────┐  │   │
│  │  │Parser│─>│ Optimizer│─>│ Executor  │  │   │
│  │  └──────┘  └──────────┘  └───────────┘  │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │              Storage Engine               │   │
│  │  ┌──────┐  ┌──────────┐  ┌───────────┐  │   │
│  │  │ WAL  │  │  Indexes │  │   Pages   │  │   │
│  │  └──────┘  └──────────┘  └───────────┘  │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
    ┌─────────┐          ┌─────────┐
    │ Backups │          │Monitoring│
    │  (S3)   │          │(Prometheus)│
    └─────────┘          └─────────┘
```

### Distributed Deployment

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (Nginx/HAProxy)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │ Geode 1 │          │ Geode 2 │          │ Geode 3 │
   │(Primary)│          │(Replica)│          │(Replica)│
   └────┬────┘          └────┬────┘          └────┬────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │  Vault  │          │  MinIO  │          │Prometheus│
   │  (KMS)  │          │(Backups)│          │ Grafana  │
   └─────────┘          └─────────┘          └──────────┘
```

## Operational Metrics

### Key Performance Indicators (KPIs)

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Availability | 99.9% | < 99% |
| Query latency (p50) | < 10ms | > 100ms |
| Query latency (p99) | < 100ms | > 1s |
| Error rate | < 0.1% | > 1% |
| Backup success rate | 100% | < 95% |
| RTO (Recovery Time) | < 5 min | > 15 min |
| RPO (Recovery Point) | < 15 min | > 1 hour |

### SLO Examples

```yaml
# Service Level Objectives
slos:
  availability:
    target: 99.9%
    window: 30d

  latency:
    p50_target: 10ms
    p99_target: 100ms
    window: 24h

  error_rate:
    target: 0.1%
    window: 1h

  backup:
    success_rate: 100%
    max_age: 26h
```

## Best Practices

### Availability

1. **Deploy multiple replicas**: At least 3 nodes for high availability
2. **Use load balancing**: Distribute traffic across healthy nodes
3. **Implement health checks**: Automatic removal of unhealthy nodes
4. **Test failover regularly**: Quarterly DR drills
5. **Monitor continuously**: Real-time alerting for issues

### Data Protection

1. **Automate backups**: Daily incremental, weekly full
2. **Test restores**: Monthly restore verification
3. **Offsite storage**: Backups in different region/provider
4. **Encrypt backups**: Server-side encryption for compliance
5. **Monitor backup age**: Alert if backup older than 26 hours

### Security

1. **Enable TLS**: TLS 1.3 for all connections
2. **Require authentication**: No anonymous access
3. **Implement RBAC**: Role-based permissions
4. **Enable audit logging**: Compliance-ready audit trail
5. **Rotate credentials**: Regular password and key rotation

### Performance

1. **Monitor resource usage**: CPU, memory, disk, network
2. **Set up alerts**: Proactive notification of issues
3. **Capacity planning**: Regular growth projections
4. **Index optimization**: Regular index analysis
5. **Query tuning**: Identify and optimize slow queries

## Related Documentation

- **[Deployment Patterns](/docs/deployment/deployment-patterns/)** - Deployment architectures
- **[Configuration Reference](/docs/configuration/)** - Server configuration
- **[Security Overview](/docs/security/overview/)** - Security architecture
- **[Observability](/docs/ops/observability/)** - Monitoring and telemetry
- **[Troubleshooting](/docs/guides/troubleshooting/)** - Common issues and solutions

## Getting Help

For operational issues:

1. Check [Troubleshooting Guide](/docs/guides/troubleshooting/)
2. Review [Error Codes](/docs/reference/error-codes/)
3. Check logs: `journalctl -u geode -f`
4. Review metrics: `/metrics` endpoint
5. Contact support with diagnostics
