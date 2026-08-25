---
title: "Backup and Restore Guide"
slug: "backup-restore"
description: "Comprehensive guide to backing up and restoring Geode databases"
weight: 32
tags: ["backup", "restore", "disaster-recovery", "high-availability", "operations"]
categories: ["guides", "operations"]
keywords:
  - backup
  - restore
  - disaster recovery
  - point-in-time recovery
  - full backup
  - Geode backup
  - database backup
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Backup and Restore Guide

This guide covers backup and restore strategies for Geode databases: online and offline backups, the full-backup CLI workflow, restoring to the newest backup at or before a timestamp, and disaster recovery planning.

## Overview

Geode provides two backup strategies to protect your data:

| Backup Type | Description | Use Case |
|-------------|-------------|----------|
| Online Backup | Server keeps serving; `geode backup create` streams a full copy | Production systems |
| Offline Backup | Server stopped; filesystem copy of the data directory | Maintenance windows |

Every Geode backup is a **full** backup. There is no incremental backup type
(`geode backup create --type` accepts `full` and nothing else), and there is no
WAL-replay point-in-time recovery. `geode restore --target-time` selects the
newest backup at or before a timestamp — see
[Point-in-Time Selection](#point-in-time-selection).

**Backup and restore are CLI operations.** GQL `BACKUP`/`RESTORE` statements
parse but are intentionally refused by the executor with SQLSTATE `0A000`:

```text
GQL BACKUP/RESTORE statements are unsupported: use the CLI instead
(`geode backup create --output <file>` to create a backup,
`geode restore <file>` to restore one).
```

There is likewise no `geode.backup.*` or `geode.restore.*` procedure namespace;
drive backups from the CLI, including from application code (examples below).

## Backup Architecture

```
Geode Database
    |
    +-- Data Files (*.gdb)
    |
    +-- Transaction Logs (*.wal)
    |
    +-- Configuration (geode.conf)
    |
    +-- Metadata (schemas, indexes)
```

## Online vs Offline Backups

### Online Backups (Hot Backup)

Online backups allow you to back up the database while it's running and serving traffic.

**Advantages**:

- No downtime
- Consistent snapshot
- Suitable for 24/7 operations

**CLI Command**:

```bash
# Create online backup
geode backup create \
  --output /backups/geode-$(date +%Y%m%d-%H%M%S).backup \
  --compress

# With specific connection and credentials
geode backup create \
  --server localhost:3141 \
  --user admin --password "$GEODE_PASSWORD" \
  --output /backups/full-backup.backup
```

`geode backup create` accepts `--output` (required), `--type full`,
`--server`, `--user`, `--password`, `--compress`, and the TLS options
(`--ca-cert`, `--client-cert`, `--client-key`,
`--insecure-tls-skip-verify`). Inspect the result with
`geode backup info <file>` — there is no `--verify` flag.

**Multi-Language Online Backup Examples**:

{{< tabs >}}
{{< tab "Go" >}}

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os/exec"
    "time"
)

// createOnlineBackup shells out to the geode CLI: backup is not a GQL
// operation, so there is no query to send over the client connection.
func createOnlineBackup(ctx context.Context, server, backupPath string) error {
    cmd := exec.CommandContext(ctx, "geode", "backup", "create",
        "--server", server,
        "--output", backupPath,
        "--compress")
    if out, err := cmd.CombinedOutput(); err != nil {
        return fmt.Errorf("backup failed: %w: %s", err, out)
    }

    // Inspect the header the CLI wrote (format, type, timestamp, size, checksum)
    info, err := exec.CommandContext(ctx, "geode", "backup", "info", backupPath).CombinedOutput()
    if err != nil {
        return fmt.Errorf("backup info failed: %w: %s", err, info)
    }
    log.Printf("Backup header:\n%s", info)

    return nil
}

func main() {
    ctx := context.Background()

    backupPath := fmt.Sprintf("/backups/geode-%s.backup",
        time.Now().Format("20060102-150405"))

    if err := createOnlineBackup(ctx, "localhost:3141", backupPath); err != nil {
        log.Fatalf("Backup failed: %v", err)
    }

    log.Printf("Backup created successfully: %s", backupPath)
}
```

{{< /tab >}}
{{< tab "Python" >}}

```python
import asyncio
from datetime import datetime

async def run(*args: str) -> str:
    """Run a geode CLI command and return its combined output."""
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    out, _ = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"{' '.join(args)} failed: {out.decode()}")
    return out.decode()

async def create_online_backup(backup_path: str, server: str = "localhost:3141"):
    """Create an online backup without stopping the database."""
    print(f"Starting online backup to {backup_path}...")

    await run("geode", "backup", "create",
              "--server", server,
              "--output", backup_path,
              "--compress")

    # Read back the backup header: format, type, compression, timestamp,
    # payload size and checksum.
    print(await run("geode", "backup", "info", backup_path))
    print(f"Online backup complete: {backup_path}")

async def main():
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = f"/backups/geode-{timestamp}.backup"

    await create_online_backup(backup_path)

asyncio.run(main())
```

{{< /tab >}}
{{< tab "Rust" >}}

```rust
use chrono::Local;
use std::process::Command;

fn geode(args: &[&str]) -> Result<String, Box<dyn std::error::Error>> {
    let out = Command::new("geode").args(args).output()?;
    if !out.status.success() {
        return Err(format!(
            "geode {} failed: {}",
            args.join(" "),
            String::from_utf8_lossy(&out.stderr)
        )
        .into());
    }
    Ok(String::from_utf8_lossy(&out.stdout).to_string())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let timestamp = Local::now().format("%Y%m%d-%H%M%S");
    let backup_path = format!("/backups/geode-{}.backup", timestamp);

    println!("Starting online backup to {}...", backup_path);

    // Backup is a CLI operation; there is no GQL statement or procedure for it.
    geode(&[
        "backup",
        "create",
        "--server",
        "127.0.0.1:3141",
        "--output",
        &backup_path,
        "--compress",
    ])?;

    // Read back the header the CLI wrote, including its checksum.
    print!("{}", geode(&["backup", "info", &backup_path])?);

    println!("Online backup complete: {}", backup_path);
    Ok(())
}
```

{{< /tab >}}
{{< tab "Bash" >}}

```bash
#!/bin/bash
# Online backup script

set -euo pipefail

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/geode-${TIMESTAMP}.backup"
GEODE_SERVER="localhost:3141"

echo "Starting online backup..."

# Create backup (set -e aborts the script if this fails)
geode backup create \
  --server "${GEODE_SERVER}" \
  --output "${BACKUP_FILE}" \
  --compress

SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "Backup complete: ${BACKUP_FILE} (${SIZE})"

# Show the header the CLI wrote (type, compression, timestamp, checksum)
geode backup info "${BACKUP_FILE}"

# Keep only the last 7 days of backups
geode backup cleanup --older-than 7d
```

{{< /tab >}}
{{< /tabs >}}

### Offline Backups (Cold Backup)

Offline backups require stopping the database but guarantee complete consistency.

**CLI Commands**:

```bash
# Stop Geode
systemctl stop geode

# Create backup (filesystem copy)
tar -czvf /backups/geode-offline-$(date +%Y%m%d).tar.gz /var/lib/geode/data

# Restart Geode
systemctl start geode
```

**When to Use Offline Backups**:

- Major version upgrades
- Schema migrations
- Hardware maintenance
- Compliance requirements

## Full Backups

### Creating Full Backups

A full backup contains the complete database state. `full` is the only backup
type the CLI accepts, so this is what every `geode backup create` produces.

```bash
# Full backup, gzip-compressed
geode backup create \
  --type full \
  --output /backups/full-$(date +%Y%m%d).backup \
  --compress
```

`--compress` is a boolean switch: the CLI chooses the codec and records it in
the backup header (`geode backup info` reports `gzip` or `zstd`). There is no
compression-level, metadata or index selection flag — a full backup already
carries the schema and index definitions with the data.

### Full Backup Schedule

```python
import asyncio
import os
from datetime import datetime

async def run(*args: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    out, _ = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"{' '.join(args)} failed: {out.decode()}")
    return out.decode()

async def create_full_backup(server: str = "localhost:3141"):
    """Create a full backup and report what landed on disk."""
    backup_dir = "/backups/full"
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d")
    backup_path = f"{backup_dir}/geode-full-{timestamp}.backup"

    await run("geode", "backup", "create",
              "--server", server,
              "--type", "full",
              "--output", backup_path,
              "--compress")

    print(f"Full backup created: {backup_path}")
    print(f"  Size: {os.path.getsize(backup_path) / (1024 * 1024):.2f} MB")
    print(await run("geode", "backup", "info", backup_path))

asyncio.run(create_full_backup())
```

Node and relationship counts are not part of the backup header. Capture them
from the live database before the backup if you want them in your logs:

```gql
CALL geode.storage.stats() YIELD node_count, edge_count
RETURN node_count, edge_count;
```

### Listing Backups

```bash
# Scans ./backups and /tmp by default
geode backup list

# Or a specific directory
geode backup list --dir /backups/full
```

The listing reports path, type, size and compression for each file whose name
starts with `geode_backup` or ends in `.backup`, `.gz` or `.zst`.

## Backup Rotation

Because every backup is a full backup, rotation is a retention decision rather
than a chain to maintain:

```bash
# Remove backups older than seven days
geode backup cleanup --older-than 7d

# Accepts h and d units, e.g. 1h, 24h, 30d
geode backup cleanup --older-than 30d
```

A weekly-full/daily-incremental scheme is not available: there is no
incremental backup type, no `--base` flag, and no LSN-delta procedure. If daily
full backups are too expensive for your dataset, take them less often and
accept the corresponding RPO, or replicate to a standby (see
[Distributed Systems](/docs/architecture/distributed-systems/)).

## Point-in-Time Selection

### What Geode Supports

Geode does not replay archived WAL segments to an arbitrary instant. What
`geode restore --target-time` does is **pick the newest backup at or before the
timestamp you name** and restore that. Your effective recovery point is
therefore your backup interval, not a single transaction.

There is no `[wal] archive_enabled` / `archive_command` configuration, no
`` flag and no `--target-lsn` flag. The server configuration file is a
flat YAML/TOML/JSON document (`.geode/config.yaml`, `.geode/config.toml`, ...)
holding keys such as `data_dir`, `listen_quic`, `listen_grpc`, `cert_path`,
`key_path`, `log_level` and `idle_timeout`.

### Restoring to a Timestamp

```bash
# Restore whatever backup was current at 14:30 UTC
geode restore \
  --source /backups/full \
  --target-time "2026-01-28T14:30:00Z" \
  --yes

# Or name the file directly
geode restore /backups/full/geode-full-20260128.backup --yes
```

`geode restore` takes the backup as a positional argument or via `--source`
(which also accepts a URI such as `s3://bucket/backup.gql`), plus `--server`,
`--user`, `--password`, `--yes`/`--confirm` and the TLS options. Without
`--yes` it prompts for interactive confirmation.

To narrow the recovery point, back up more often — every backup is a full
backup, so there is no chain to replay.

## Backup Verification

### Inspecting a Backup File

```bash
# Header: format version, type, compression, encryption flag,
# timestamp, payload size and checksum
geode backup info /backups/geode-20260128.backup

# Everything currently on disk
geode backup list --dir /backups
```

There is no `geode backup verify` command and no verification procedure. The
checks available are the header/checksum readout above, plus the live-store
integrity checks after a restore:

```bash
geode storage verify
```

```gql
CALL geode.storage.integrity()
YIELD node_count_consistent, edge_count_consistent, label_index_entries, total_errors
RETURN node_count_consistent, edge_count_consistent, label_index_entries, total_errors;
```

### Checking Every Backup in a Directory

```bash
#!/bin/bash
# Print the header of every backup in a directory and fail on the first
# file whose header cannot be read.
set -euo pipefail

BACKUP_DIR="${1:-/backups/full}"

for f in "${BACKUP_DIR}"/*.backup; do
    echo "=== ${f}"
    geode backup info "${f}"
done
```

### Test Restores

Regularly test your backups by restoring into a throwaway server:

```bash
#!/bin/bash
# Test restore script
set -euo pipefail

BACKUP_FILE="$1"
TEST_DIR="/tmp/geode-test-restore"

# Clean up previous test
rm -rf "${TEST_DIR}"
mkdir -p "${TEST_DIR}"

# Start a scratch server on its own port and data directory
geode serve --data-dir "${TEST_DIR}" --listen 127.0.0.1:3142 &
GEODE_PID=$!
sleep 5

# Restore into it
geode restore "${BACKUP_FILE}" --server 127.0.0.1:3142 --yes

# Verify the restored data
geode query --server 127.0.0.1:3142 "MATCH (n) RETURN count(n)"
geode query --server 127.0.0.1:3142 \
  "CALL geode.storage.integrity() YIELD total_errors RETURN total_errors"

# Stop the scratch instance and clean up
kill ${GEODE_PID}
rm -rf "${TEST_DIR}"

echo "Test restore completed successfully"
```

## Restore Procedures

### Full Restore

```bash
# Restore into the running server (prompts unless --yes is given)
geode restore /backups/geode-full-20260128.backup \
  --server localhost:3141 \
  --yes

# Verify the restored store
geode query "CALL geode.storage.integrity() YIELD total_errors RETURN total_errors"
```

For an offline restore, stop the server, replace the data directory with the
copy taken by `tar`, and start it again — the same procedure as an offline
backup in reverse.

### Restoring a Chain of Backups

Not applicable: every Geode backup is self-contained. Restore the one backup
you want; there are no incremental files to apply on top of it, and `geode
restore` has no `--incremental` flag.

### Programmatic Restore

```python
import asyncio

async def run(*args: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    out, _ = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"{' '.join(args)} failed: {out.decode()}")
    return out.decode()

async def restore_database(backup_path: str, server: str = "localhost:3141"):
    """Restore a database from a full backup file."""
    print(f"Restoring: {backup_path}")
    print(await run("geode", "backup", "info", backup_path))
    print(await run("geode", "restore", backup_path, "--server", server, "--yes"))

    # Confirm the restored store is self-consistent
    print(await run(
        "geode", "query", "--server", server,
        "CALL geode.storage.integrity() YIELD total_errors RETURN total_errors",
    ))

asyncio.run(restore_database("/backups/full/geode-full-20260128.backup"))
```

## Disaster Recovery Planning

### Recovery Time Objective (RTO) and Recovery Point Objective (RPO)

| Strategy | RTO | RPO | Cost |
|----------|-----|-----|------|
| Standby replica | Minutes | Seconds | High |
| Hourly full backup | Hours | 1 hour | Medium |
| Daily full backup | Hours-Days | 24 hours | Low |

Because there is no WAL replay, the RPO of a backup-based strategy is exactly
the interval between full backups. Sub-minute RPO needs replication, not
backups.

### Disaster Recovery Runbook

```markdown
# Geode Disaster Recovery Runbook

## 1. Assess the Situation
- [ ] Identify the nature of the failure
- [ ] Determine data loss extent
- [ ] Notify stakeholders

## 2. Activate Recovery
- [ ] Access backup storage
- [ ] Identify latest valid backup
- [ ] Prepare recovery environment

## 3. Restore Database
- [ ] Deploy new Geode instance
- [ ] Restore from backup
- [ ] Confirm the restored store is consistent (`CALL geode.storage.integrity()`)
- [ ] Verify data integrity

## 4. Validate Recovery
- [ ] Run consistency checks
- [ ] Execute test queries
- [ ] Verify application connectivity

## 5. Resume Operations
- [ ] Update DNS/load balancer
- [ ] Monitor performance
- [ ] Document incident

## 6. Post-Incident
- [ ] Root cause analysis
- [ ] Update procedures
- [ ] Test improvements
```

### Multi-Region Backup Strategy

{{< tabs >}}
{{< tab "Python" >}}

```python
import asyncio
import boto3
from datetime import datetime

async def run(*args: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    out, _ = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"{' '.join(args)} failed: {out.decode()}")
    return out.decode()

class MultiRegionBackupManager:
    def __init__(self):
        self.primary_region = "us-east-1"
        self.backup_regions = ["us-west-2", "eu-west-1"]
        self.s3_clients = {
            region: boto3.client('s3', region_name=region)
            for region in [self.primary_region] + self.backup_regions
        }

    async def create_and_replicate_backup(self):
        """Create backup and replicate to multiple regions."""
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        local_path = f"/tmp/geode-backup-{timestamp}.backup"
        s3_key = f"backups/geode/full-{timestamp}.backup"

        # Create local backup with the CLI
        print("Creating backup...")
        await run("geode", "backup", "create",
                  "--output", local_path, "--compress")

        # Upload to primary region
        print(f"Uploading to {self.primary_region}...")
        self.s3_clients[self.primary_region].upload_file(
            local_path,
            f"geode-backups-{self.primary_region}",
            s3_key
        )

        # Replicate to backup regions
        for region in self.backup_regions:
            print(f"Replicating to {region}...")

            # Copy from primary to backup region
            self.s3_clients[region].copy_object(
                CopySource={
                    'Bucket': f"geode-backups-{self.primary_region}",
                    'Key': s3_key
                },
                Bucket=f"geode-backups-{region}",
                Key=s3_key
            )

        print(f"Backup replicated to {len(self.backup_regions)} regions")

        # Clean up local file
        import os
        os.remove(local_path)

    async def restore_from_nearest_region(self, server: str = "localhost:3141"):
        """Restore from the nearest available region."""
        # Check backup availability in each region
        for region in [self.primary_region] + self.backup_regions:
            bucket = f"geode-backups-{region}"
            try:
                response = self.s3_clients[region].list_objects_v2(
                    Bucket=bucket,
                    Prefix="backups/geode/full-",
                    MaxKeys=1
                )

                if response.get('Contents'):
                    latest = sorted(
                        response['Contents'],
                        key=lambda x: x['LastModified'],
                        reverse=True
                    )[0]

                    print(f"Restoring from {region}: {latest['Key']}")

                    # Download backup
                    local_path = f"/tmp/restore-{region}.backup"
                    self.s3_clients[region].download_file(
                        bucket,
                        latest['Key'],
                        local_path
                    )

                    # Restore into the running server
                    await run("geode", "restore", local_path,
                              "--server", server, "--yes")

                    print(f"Restore complete from {region}")
                    return True

            except Exception as e:
                print(f"Region {region} unavailable: {e}")
                continue

        print("No backup available in any region!")
        return False

async def main():
    manager = MultiRegionBackupManager()

    # Create and replicate backup
    await manager.create_and_replicate_backup()

asyncio.run(main())
```

{{< /tab >}}
{{< /tabs >}}

## Automated Backup Scheduling

### Cron-Based Scheduling

```bash
# /etc/cron.d/geode-backup

# Full backup every day at 2 AM (every Geode backup is a full backup)
0 2 * * * geode /usr/local/bin/geode-full-backup.sh >> /var/log/geode-backup.log 2>&1

# Prune backups older than 30 days, weekly
0 4 * * 0 geode /usr/local/bin/geode backup cleanup --older-than 30d >> /var/log/geode-backup.log 2>&1
```

### Systemd Timer

```ini
# /etc/systemd/system/geode-backup.service
[Unit]
Description=Geode Database Backup
After=geode.service

[Service]
Type=oneshot
User=geode
ExecStart=/usr/local/bin/geode-backup.sh
StandardOutput=journal
StandardError=journal
```

```ini
# /etc/systemd/system/geode-backup.timer
[Unit]
Description=Daily Geode Backup Timer

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Enable timer
systemctl enable geode-backup.timer
systemctl start geode-backup.timer

# Check timer status
systemctl list-timers | grep geode
```

### Comprehensive Backup Script

```bash
#!/bin/bash
# /usr/local/bin/geode-backup.sh

set -euo pipefail

# Configuration
BACKUP_DIR="/backups/geode"
FULL_DIR="${BACKUP_DIR}/full"
RETENTION="30d"
GEODE_SERVER="${GEODE_SERVER:-localhost:3141}"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

mkdir -p "${FULL_DIR}"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${FULL_DIR}/geode-full-${TIMESTAMP}.backup"

log "Starting full backup"

# Every Geode backup is a full backup
geode backup create \
    --server "${GEODE_SERVER}" \
    --type full \
    --output "${BACKUP_FILE}" \
    --compress

# Read the header back (fails loudly if the file is unreadable)
log "Reading backup header..."
geode backup info "${BACKUP_FILE}"

SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
log "Backup complete: ${BACKUP_FILE} (${SIZE})"

# Retention
log "Removing backups older than ${RETENTION}..."
geode backup cleanup --older-than "${RETENTION}"

# Upload to remote storage (optional)
if [ -n "${S3_BUCKET:-}" ]; then
    log "Uploading to S3..."
    aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/backups/geode/"
fi

log "Backup job completed successfully"
```

## Monitoring Backups

### Backup Health Checks

```python
import asyncio
import os
from datetime import datetime

async def check_backup_health(backup_dir: str):
    """Check backup health and alert on issues."""
    issues = []

    # Check for recent full backup
    full_dir = os.path.join(backup_dir, "full")
    if os.path.exists(full_dir):
        full_backups = sorted([
            f for f in os.listdir(full_dir) if f.endswith('.backup')
        ], reverse=True)

        if not full_backups:
            issues.append("No full backups found")
        else:
            latest_full = os.path.join(full_dir, full_backups[0])
            mtime = datetime.fromtimestamp(os.path.getmtime(latest_full))
            age_days = (datetime.now() - mtime).days

            if age_days > 1:
                issues.append(f"Latest backup is {age_days} days old")

    # Check disk space
    statvfs = os.statvfs(backup_dir)
    free_gb = (statvfs.f_frsize * statvfs.f_bavail) / (1024**3)
    if free_gb < 50:
        issues.append(f"Low disk space: {free_gb:.1f} GB free")

    # Report
    if issues:
        print("BACKUP HEALTH CHECK: ISSUES FOUND")
        for issue in issues:
            print(f"  - {issue}")
        return False
    else:
        print("BACKUP HEALTH CHECK: OK")
        return True

asyncio.run(check_backup_health("/backups/geode"))
```

### Prometheus Metrics

```python
# Expose backup metrics for Prometheus
from prometheus_client import Gauge, Counter, start_http_server
import os
from datetime import datetime

# Define metrics
backup_age_seconds = Gauge(
    'geode_backup_age_seconds',
    'Age of the latest backup in seconds',
    ['type']
)

backup_size_bytes = Gauge(
    'geode_backup_size_bytes',
    'Size of the latest backup in bytes',
    ['type']
)

backup_count = Gauge(
    'geode_backup_count',
    'Number of backup files',
    ['type']
)

backup_disk_free_bytes = Gauge(
    'geode_backup_disk_free_bytes',
    'Free disk space for backups'
)

def update_metrics(backup_dir: str):
    """Update Prometheus metrics."""
    for backup_type in ['full']:
        type_dir = os.path.join(backup_dir, backup_type)
        if not os.path.exists(type_dir):
            continue

        backups = [f for f in os.listdir(type_dir) if f.endswith('.backup')]

        # Count
        backup_count.labels(type=backup_type).set(len(backups))

        if backups:
            # Latest backup
            latest = max(backups, key=lambda f: os.path.getmtime(
                os.path.join(type_dir, f)))
            latest_path = os.path.join(type_dir, latest)

            # Age
            age = datetime.now().timestamp() - os.path.getmtime(latest_path)
            backup_age_seconds.labels(type=backup_type).set(age)

            # Size
            size = os.path.getsize(latest_path)
            backup_size_bytes.labels(type=backup_type).set(size)

    # Disk space
    statvfs = os.statvfs(backup_dir)
    free_bytes = statvfs.f_frsize * statvfs.f_bavail
    backup_disk_free_bytes.set(free_bytes)

# Start this exporter on its own port: 9090 is the conventional port for the
# server's own GEODE_METRICS_PORT listener.
start_http_server(9091)

# Update metrics periodically
import time
while True:
    update_metrics("/backups/geode")
    time.sleep(60)
```

## Best Practices

### Backup Checklist

- [ ] **Regular full backups** (every backup is a full backup)
- [ ] **Backup interval matched to your RPO** (there is no WAL replay to close the gap)
- [ ] **`geode backup info` after each backup** to confirm a readable header
- [ ] **Test restores** at least monthly
- [ ] **Off-site backup storage** (different region/provider)
- [ ] **Encryption** for backups containing sensitive data
- [ ] **Monitoring and alerting** for backup failures
- [ ] **Documented recovery procedures**
- [ ] **Regular DR drills**

### Security Considerations

Backup encryption is a property of the **server**, not a CLI flag: there is no
`--encrypt`, `--decrypt` or `--encryption-key-file` option. When the server runs
with Transparent Data Encryption (`geode serve --tde-provider ...`),
the backup it produces is written encrypted and `geode backup info` reports
`Encrypted: true`. See the [KMS integration guide](/docs/security/kms-integration/) for key
provider configuration and the `tde.*` procedures.

Protect the backup files themselves with ordinary filesystem controls, and use
the TLS options (`--ca-cert`, `--client-cert`, `--client-key`) so the backup
stream to the server is authenticated:

```bash
geode backup create \
  --server geode.internal:3141 \
  --output /backups/geode.backup \
  --compress \
  --ca-cert /etc/ssl/geode-ca.crt \
  --client-cert /etc/ssl/backup-client.crt \
  --client-key /etc/ssl/backup-client.key

chmod 600 /backups/geode.backup
```

## Next Steps

- [Data Import Guide](/guides/data-import/) - Import data into Geode
- [Data Export Guide](/guides/data-export/) - Export your data
- [High Availability Guide](/guides/high-availability/) - Configure HA
- [Performance Guide](/docs/performance/) - Optimize performance

## Resources

- [CLI Reference](/docs/reference/cli-and-api/)
- [Configuration Reference](/docs/configuration/)
- [API Reference](/docs/api-reference/)
- [Community Forum](https://forum.geodedb.com)

---

**Questions?** Discuss backup strategies in our [forum](https://forum.geodedb.com).
