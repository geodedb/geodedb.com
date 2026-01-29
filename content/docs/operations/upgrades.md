---
title: "Upgrade Procedures"
description: "Safe upgrade procedures for Geode including in-place upgrades, rolling upgrades, blue-green deployments, and rollback procedures"
url: /docs/operations/upgrades/
weight: 40
tags:
  - operations
  - upgrades
  - deployment
  - rolling-upgrade
  - blue-green
categories:
  - operations
keywords:
  - upgrade
  - update
  - rolling upgrade
  - blue-green deployment
  - zero downtime
  - version migration
  - rollback
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Upgrade Procedures

This guide covers safe upgrade procedures for Geode, including pre-upgrade planning, various upgrade strategies, and rollback procedures.

## Overview

Geode supports multiple upgrade strategies:

| Strategy | Downtime | Complexity | Use Case |
|----------|----------|------------|----------|
| In-place | Minutes | Low | Development, small production |
| Rolling | Zero | Medium | Distributed clusters |
| Blue-green | Zero | High | Critical production |
| Canary | Zero | High | Large-scale deployments |

## Pre-Upgrade Planning

### Compatibility Matrix

| From Version | To Version | Upgrade Path | Notes |
|--------------|------------|--------------|-------|
| 0.16.x | 0.17.x | Direct | Config changes required |
| 0.17.x | 0.18.x | Direct | Auth now required by default |
| 0.15.x | 0.18.x | Staged | Via 0.16.x, 0.17.x |

### Pre-Upgrade Checklist

```bash
# 1. Check current version
geode --version

# 2. Review release notes for target version
# https://geodedb.com/docs/releases/

# 3. Check system requirements
# - Zig version compatibility
# - OS version compatibility
# - Hardware requirements

# 4. Verify backup status
geode backup --dest s3://bucket/backups --list

# 5. Create pre-upgrade backup
geode backup \
  --dest s3://bucket/backups \
  --mode full \
  --label "pre-upgrade-$(date +%Y%m%d)"

# 6. Test upgrade in staging
# - Deploy to staging environment first
# - Run full test suite
# - Verify application compatibility

# 7. Document current configuration
cp /etc/geode/geode.yaml /etc/geode/geode.yaml.backup
geode config show > config-dump.yaml

# 8. Plan maintenance window (if required)
# - Notify stakeholders
# - Schedule window
# - Prepare rollback plan
```

### Breaking Changes Review

Review breaking changes for each version:

```yaml
# v0.1.x -> v0.1.x Breaking Changes

authentication:
  # Was: optional (auth_enabled: false by default)
  # Now: required (auth_enabled: true by default)
  action: Configure authentication or explicitly disable

tls:
  # Was: auto_generate: true
  # Now: auto_generate: false (secure by default)
  action: Provide valid TLS certificates

hardcoded_credentials:
  # Was: Default admin/admin credentials
  # Now: Removed, must use environment variables
  action: Set GEODE_ADMIN_USERNAME and GEODE_DEFAULT_PASSWORD
```

## In-Place Upgrade

For single-node deployments or development environments.

### Procedure

```bash
#!/bin/bash
# in-place-upgrade.sh

set -euo pipefail

NEW_VERSION="0.1.3"
BACKUP_DIR="/var/lib/geode/upgrade-backup-$(date +%Y%m%d)"

echo "=== In-Place Upgrade to $NEW_VERSION ==="

# 1. Pre-flight checks
echo "Running pre-flight checks..."
geode admin status
geode backup --dest s3://bucket/backups --list | head -5

# 2. Create backup
echo "Creating pre-upgrade backup..."
geode backup \
  --dest s3://bucket/backups \
  --mode full \
  --label "pre-upgrade-$NEW_VERSION"

# 3. Stop server gracefully
echo "Stopping Geode server..."
sudo systemctl stop geode

# Wait for clean shutdown
sleep 10

# 4. Backup binaries and config
echo "Backing up current installation..."
mkdir -p "$BACKUP_DIR"
cp /usr/local/bin/geode "$BACKUP_DIR/"
cp /etc/geode/geode.yaml "$BACKUP_DIR/"

# 5. Install new version
echo "Installing new version..."
# Option A: From release binary
curl -L "https://github.com/codeprosorg/geode/releases/download/v$NEW_VERSION/geode-linux-amd64" \
  -o /usr/local/bin/geode
chmod +x /usr/local/bin/geode

# Option B: Build from source
# git clone --branch "v$NEW_VERSION" https://github.com/codeprosorg/geode /tmp/geode
# cd /tmp/geode && make release
# cp ./zig-out/bin/geode /usr/local/bin/geode

# 6. Verify new version
echo "Verifying installation..."
geode --version

# 7. Update configuration (if needed)
echo "Updating configuration..."
# Apply any required config changes for new version
# geode config migrate --from 0.17.x --to 0.18.x

# 8. Start server
echo "Starting Geode server..."
sudo systemctl start geode

# 9. Wait for startup
echo "Waiting for server to start..."
sleep 10

# 10. Verify health
echo "Verifying server health..."
geode admin status
geode query "RETURN 1 AS health_check"

# 11. Run smoke tests
echo "Running smoke tests..."
# Add application-specific tests here

echo "=== Upgrade Complete ==="
```

### Rollback Procedure

```bash
#!/bin/bash
# in-place-rollback.sh

BACKUP_DIR="/var/lib/geode/upgrade-backup-20260128"  # Adjust date

echo "=== Rolling Back Upgrade ==="

# 1. Stop server
sudo systemctl stop geode

# 2. Restore binary
cp "$BACKUP_DIR/geode" /usr/local/bin/geode

# 3. Restore configuration
cp "$BACKUP_DIR/geode.yaml" /etc/geode/geode.yaml

# 4. Start server
sudo systemctl start geode

# 5. Verify
geode --version
geode admin status

echo "=== Rollback Complete ==="
```

## Rolling Upgrade

For distributed clusters with zero downtime.

### Prerequisites

- At least 3 nodes in cluster
- Replication configured
- Health checks enabled

### Procedure

```bash
#!/bin/bash
# rolling-upgrade.sh

set -euo pipefail

NEW_VERSION="0.1.3"
NODES=("geode-node1" "geode-node2" "geode-node3")
GEODE_BIN_URL="https://releases.geodedb.com/v$NEW_VERSION/geode-linux-amd64"

echo "=== Rolling Upgrade to $NEW_VERSION ==="
echo "Nodes: ${NODES[*]}"

# Download new binary once
echo "Downloading new binary..."
curl -L "$GEODE_BIN_URL" -o /tmp/geode-$NEW_VERSION
chmod +x /tmp/geode-$NEW_VERSION

# Upgrade each node
for NODE in "${NODES[@]}"; do
    echo ""
    echo "=== Upgrading $NODE ==="

    # 1. Check node is healthy
    echo "Checking node health..."
    ssh "$NODE" "geode admin status"

    # 2. Check cluster has quorum without this node
    HEALTHY_NODES=$(ssh "${NODES[0]}" "geode admin cluster-status --format json" | \
        jq '[.nodes[] | select(.status == "healthy")] | length')

    if [ "$HEALTHY_NODES" -lt 2 ]; then
        echo "ERROR: Not enough healthy nodes. Aborting."
        exit 1
    fi

    # 3. Drain connections from node
    echo "Draining connections..."
    ssh "$NODE" "geode admin drain --timeout 60s"

    # 4. Stop node
    echo "Stopping node..."
    ssh "$NODE" "sudo systemctl stop geode"

    # 5. Copy new binary
    echo "Installing new version..."
    scp /tmp/geode-$NEW_VERSION "$NODE:/tmp/geode"
    ssh "$NODE" "sudo cp /tmp/geode /usr/local/bin/geode"

    # 6. Update configuration if needed
    # ssh "$NODE" "geode config migrate --from 0.17.x --to 0.18.x"

    # 7. Start node
    echo "Starting node..."
    ssh "$NODE" "sudo systemctl start geode"

    # 8. Wait for node to rejoin cluster
    echo "Waiting for node to rejoin..."
    for i in {1..30}; do
        STATUS=$(ssh "$NODE" "geode admin status --format json 2>/dev/null" | \
            jq -r '.status' 2>/dev/null || echo "starting")
        if [ "$STATUS" == "healthy" ]; then
            break
        fi
        echo "  Waiting... ($i/30)"
        sleep 10
    done

    # 9. Verify node is healthy
    echo "Verifying node health..."
    ssh "$NODE" "geode --version"
    ssh "$NODE" "geode admin status"

    # 10. Verify cluster health
    echo "Verifying cluster health..."
    ssh "${NODES[0]}" "geode admin cluster-status"

    echo "=== $NODE upgraded successfully ==="

    # Wait before next node (allow stabilization)
    if [ "$NODE" != "${NODES[-1]}" ]; then
        echo "Waiting 60s before next node..."
        sleep 60
    fi
done

echo ""
echo "=== Rolling Upgrade Complete ==="
echo "All nodes running version $NEW_VERSION"

# Final verification
for NODE in "${NODES[@]}"; do
    VERSION=$(ssh "$NODE" "geode --version" | head -1)
    echo "$NODE: $VERSION"
done
```

### Rollback (Rolling)

```bash
#!/bin/bash
# rolling-rollback.sh

# Same process as upgrade, but with previous version
# Keep previous binary available for quick rollback

OLD_VERSION="0.1.2"
# ... follow same rolling procedure with old version
```

## Blue-Green Deployment

For critical production with instant rollback capability.

### Architecture

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │   (Weighted)    │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │ 100%           │ 0%             │
       ┌────▼────┐      ┌────▼────┐
       │  Blue   │      │  Green  │
       │ v0.1.x │      │ v0.1.x │
       │(Active) │      │(Standby)│
       └─────────┘      └─────────┘
```

### Procedure

```bash
#!/bin/bash
# blue-green-upgrade.sh

set -euo pipefail

NEW_VERSION="0.1.3"
BLUE_CLUSTER="geode-blue"
GREEN_CLUSTER="geode-green"

echo "=== Blue-Green Upgrade to $NEW_VERSION ==="
echo "Blue (current): $BLUE_CLUSTER"
echo "Green (new): $GREEN_CLUSTER"

# Phase 1: Prepare Green Environment
echo ""
echo "=== Phase 1: Prepare Green Environment ==="

# Deploy new version to green
echo "Deploying $NEW_VERSION to green cluster..."
./deploy-cluster.sh "$GREEN_CLUSTER" "$NEW_VERSION"

# Wait for green to be ready
echo "Waiting for green cluster to be ready..."
./wait-for-cluster.sh "$GREEN_CLUSTER"

# Phase 2: Sync Data
echo ""
echo "=== Phase 2: Sync Data ==="

# Set up replication from blue to green
echo "Setting up replication..."
geode admin replicate \
  --source "$BLUE_CLUSTER" \
  --target "$GREEN_CLUSTER" \
  --mode async

# Wait for sync
echo "Waiting for initial sync..."
while true; do
    LAG=$(geode admin replication-lag --target "$GREEN_CLUSTER")
    echo "Replication lag: $LAG"
    [ "$LAG" -lt 10 ] && break
    sleep 10
done

# Phase 3: Test Green
echo ""
echo "=== Phase 3: Test Green Environment ==="

# Run smoke tests against green
echo "Running smoke tests..."
./smoke-tests.sh "$GREEN_CLUSTER"

# Run integration tests
echo "Running integration tests..."
./integration-tests.sh "$GREEN_CLUSTER"

# Phase 4: Switch Traffic
echo ""
echo "=== Phase 4: Switch Traffic ==="

read -p "Ready to switch traffic to green? (yes/no): " CONFIRM
[ "$CONFIRM" != "yes" ] && exit 1

# Gradual traffic shift
echo "Shifting 10% traffic to green..."
./update-lb-weights.sh blue=90 green=10
sleep 60

echo "Shifting 50% traffic to green..."
./update-lb-weights.sh blue=50 green=50
sleep 60

echo "Shifting 100% traffic to green..."
./update-lb-weights.sh blue=0 green=100

# Phase 5: Verify and Cleanup
echo ""
echo "=== Phase 5: Verify and Cleanup ==="

# Monitor for issues
echo "Monitoring for 5 minutes..."
sleep 300

# Check error rates
ERROR_RATE=$(./get-error-rate.sh)
if [ "$(echo "$ERROR_RATE > 0.01" | bc)" -eq 1 ]; then
    echo "ERROR: High error rate detected. Rolling back..."
    ./update-lb-weights.sh blue=100 green=0
    exit 1
fi

# Keep blue running for quick rollback
echo "Blue cluster retained for rollback capability"
echo "Run './cleanup-blue.sh' after validation period"

echo ""
echo "=== Blue-Green Upgrade Complete ==="
```

### Instant Rollback

```bash
#!/bin/bash
# blue-green-rollback.sh

echo "=== Instant Rollback to Blue ==="

# Switch all traffic back to blue
./update-lb-weights.sh blue=100 green=0

echo "Traffic switched to blue"
echo "Green cluster retained for investigation"
```

## Canary Deployment

For gradual rollout with monitoring.

### Procedure

```bash
#!/bin/bash
# canary-upgrade.sh

set -euo pipefail

NEW_VERSION="0.1.3"
CANARY_PERCENTAGE=5

echo "=== Canary Deployment to $NEW_VERSION ==="
echo "Initial canary: $CANARY_PERCENTAGE%"

# Deploy canary instance
echo "Deploying canary instance..."
./deploy-canary.sh "$NEW_VERSION"

# Route small percentage to canary
echo "Routing ${CANARY_PERCENTAGE}% to canary..."
./update-routing.sh canary=$CANARY_PERCENTAGE

# Monitor canary
echo "Monitoring canary for 30 minutes..."
./monitor-canary.sh --duration 30m --threshold-error-rate 0.01

if [ $? -ne 0 ]; then
    echo "Canary failed. Rolling back..."
    ./update-routing.sh canary=0
    exit 1
fi

# Gradually increase canary
for PCT in 10 25 50 75 100; do
    echo "Increasing canary to ${PCT}%..."
    ./update-routing.sh canary=$PCT

    echo "Monitoring for 15 minutes..."
    ./monitor-canary.sh --duration 15m --threshold-error-rate 0.01

    if [ $? -ne 0 ]; then
        echo "Canary failed at ${PCT}%. Rolling back..."
        ./update-routing.sh canary=0
        exit 1
    fi
done

echo "=== Canary Deployment Complete ==="
```

## Configuration Migration

### Automatic Migration

```bash
# Migrate configuration between versions
geode config migrate \
  --from-version 0.17.x \
  --to-version 0.18.x \
  --config /etc/geode/geode.yaml \
  --output /etc/geode/geode.yaml.new

# Review changes
diff /etc/geode/geode.yaml /etc/geode/geode.yaml.new

# Apply changes
mv /etc/geode/geode.yaml.new /etc/geode/geode.yaml
```

### Manual Migration Examples

**v0.1.x to v0.1.x**:

```yaml
# Old (v0.1.x)
server:
  listen: '0.0.0.0:3141'
  auth_enabled: false  # Optional auth

tls:
  auto_generate: true  # Auto-generate certs

# New (v0.1.x)
server:
  listen: '0.0.0.0:3141'
  # auth_enabled removed, now always true

security:
  authentication:
    enabled: true  # Explicit enable
    default_user: ${GEODE_ADMIN_USERNAME}
    default_password: ${GEODE_DEFAULT_PASSWORD}

tls:
  auto_generate: false  # Must provide certs
  cert: /etc/geode/certs/server.crt
  key: /etc/geode/certs/server.key
```

## Post-Upgrade Validation

### Validation Script

```bash
#!/bin/bash
# post-upgrade-validation.sh

set -euo pipefail

echo "=== Post-Upgrade Validation ==="

# 1. Version check
echo "1. Checking version..."
ACTUAL_VERSION=$(geode --version | grep -oP '\d+\.\d+\.\d+')
echo "   Version: $ACTUAL_VERSION"

# 2. Health check
echo "2. Checking server health..."
geode admin status

# 3. Query test
echo "3. Running query test..."
geode query "MATCH (n) RETURN count(n) AS count"

# 4. Write test
echo "4. Running write test..."
geode query "CREATE (t:Test {timestamp: datetime()}) RETURN t"
geode query "MATCH (t:Test) DELETE t"

# 5. Performance test
echo "5. Running performance test..."
START=$(date +%s%N)
for i in {1..100}; do
    geode query "MATCH (n) RETURN n LIMIT 10" > /dev/null
done
END=$(date +%s%N)
DURATION_MS=$(( (END - START) / 1000000 ))
AVG_MS=$(( DURATION_MS / 100 ))
echo "   100 queries in ${DURATION_MS}ms (avg: ${AVG_MS}ms)"

# 6. Backup test
echo "6. Testing backup functionality..."
geode backup --dest /tmp/validation-backup --mode full --verify
rm -rf /tmp/validation-backup

# 7. Application connectivity test
echo "7. Testing application connectivity..."
# Add application-specific tests

echo ""
echo "=== Validation Complete ==="
```

## Best Practices

### Before Upgrade

1. **Read release notes**: Understand changes and breaking changes
2. **Test in staging**: Full test cycle before production
3. **Create backup**: Always have a rollback point
4. **Notify stakeholders**: Communicate maintenance window
5. **Prepare rollback plan**: Know how to revert quickly

### During Upgrade

1. **Monitor closely**: Watch metrics and logs
2. **Proceed incrementally**: Don't rush
3. **Verify each step**: Don't assume success
4. **Document issues**: Note any problems encountered
5. **Be ready to rollback**: Have plan ready

### After Upgrade

1. **Run validation**: Complete test suite
2. **Monitor for 24h**: Watch for delayed issues
3. **Update documentation**: Note version in runbooks
4. **Clean up**: Remove old binaries, backup temp files
5. **Conduct review**: What went well, what to improve

## Troubleshooting

### Upgrade Fails to Start

```bash
# Check logs
journalctl -u geode -n 100

# Common issues:
# - Config format changed -> migrate config
# - Missing dependencies -> check Zig version
# - Permission issues -> check file ownership
```

### Data Incompatibility

```bash
# If data format changed between versions
geode admin migrate-data --from-version 0.17.x

# If migration fails, restore from backup
geode restore --source s3://bucket/backups --backup-id <pre-upgrade-id>
```

### Performance Regression

```bash
# Compare query plans
geode query "EXPLAIN MATCH (n) RETURN n LIMIT 100"

# Check index status
geode admin index-status

# Review new configuration options
geode config diff --from 0.17.x --to 0.18.x
```

## Related Documentation

- **[Migration Guide](/docs/guides/migration-guide/)** - Data migration procedures
- **[Backup Procedures](/docs/operations/backup/)** - Backup before upgrade
- **[Disaster Recovery](/docs/operations/disaster-recovery/)** - Recovery procedures
- **[Configuration Reference](/docs/configuration/)** - Configuration options
