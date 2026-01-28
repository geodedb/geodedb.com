---
title: "Backup and Restore Guide"
description: "Comprehensive guide to backing up and restoring Geode databases"
weight: 32
tags: ["backup", "restore", "disaster-recovery", "high-availability", "operations"]
categories: ["guides", "operations"]
keywords:
  - backup
  - restore
  - disaster recovery
  - point-in-time recovery
  - incremental backup
  - Geode backup
  - database backup
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Backup and Restore Guide

This guide covers comprehensive backup and restore strategies for Geode databases. Learn how to implement online and offline backups, full and incremental backups, point-in-time recovery, and disaster recovery planning.

## Overview

Geode provides multiple backup strategies to protect your data:

| Backup Type | Description | Use Case |
|-------------|-------------|----------|
| Online Backup | No downtime required | Production systems |
| Offline Backup | Database stopped | Maintenance windows |
| Full Backup | Complete database copy | Weekly/monthly backups |
| Incremental Backup | Changes since last backup | Daily backups |
| Point-in-Time | Restore to specific moment | Data recovery |
| Snapshot | Instant copy | Testing, development |

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
  --compress \
  --verify

# With specific connection
geode backup create \
  --host localhost:3141 \
  --output /backups/full-backup.backup
```

**Multi-Language Online Backup Examples**:

{{< tabs >}}
{{< tab "Go" >}}
```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"
    "time"

    _ "geodedb.com/geode"
)

func createOnlineBackup(db *sql.DB, backupPath string) error {
    ctx := context.Background()

    // Start backup
    _, err := db.ExecContext(ctx,
        "CALL geode.backup.create($path, $compress)",
        backupPath, true)
    if err != nil {
        return fmt.Errorf("backup failed: %w", err)
    }

    // Verify backup
    rows, err := db.QueryContext(ctx,
        "CALL geode.backup.verify($path)",
        backupPath)
    if err != nil {
        return fmt.Errorf("verification failed: %w", err)
    }
    defer rows.Close()

    var valid bool
    var checksum string
    if rows.Next() {
        rows.Scan(&valid, &checksum)
        if !valid {
            return fmt.Errorf("backup verification failed")
        }
        log.Printf("Backup verified: checksum=%s", checksum)
    }

    return nil
}

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    backupPath := fmt.Sprintf("/backups/geode-%s.backup",
        time.Now().Format("20060102-150405"))

    if err := createOnlineBackup(db, backupPath); err != nil {
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
from geode_client import Client

async def create_online_backup(backup_path: str):
    """Create an online backup without stopping the database."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        # Start backup
        print(f"Starting online backup to {backup_path}...")

        await conn.execute(
            "CALL geode.backup.create($path, $compress)",
            {"path": backup_path, "compress": True}
        )

        # Verify backup integrity
        result, _ = await conn.query(
            "CALL geode.backup.verify($path)",
            {"path": backup_path}
        )

        if result.rows:
            row = result.rows[0]
            valid = row['valid'].as_bool
            checksum = row['checksum'].as_string
            size_mb = row['size_bytes'].as_int / (1024 * 1024)

            if valid:
                print(f"Backup verified successfully")
                print(f"  Checksum: {checksum}")
                print(f"  Size: {size_mb:.2f} MB")
            else:
                raise Exception("Backup verification failed")

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
use geode_client::{Client, Value};
use std::collections::HashMap;
use chrono::Local;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    let timestamp = Local::now().format("%Y%m%d-%H%M%S");
    let backup_path = format!("/backups/geode-{}.backup", timestamp);

    println!("Starting online backup to {}...", backup_path);

    // Create backup
    let mut params = HashMap::new();
    params.insert("path".to_string(), Value::string(&backup_path));
    params.insert("compress".to_string(), Value::bool(true));

    conn.query_with_params(
        "CALL geode.backup.create($path, $compress)",
        &params
    ).await?;

    // Verify backup
    let mut verify_params = HashMap::new();
    verify_params.insert("path".to_string(), Value::string(&backup_path));

    let (result, _) = conn.query_with_params(
        "CALL geode.backup.verify($path)",
        &verify_params
    ).await?;

    if let Some(row) = result.rows.first() {
        let valid = row.get("valid").unwrap().as_bool()?;
        let checksum = row.get("checksum").unwrap().as_string()?;

        if valid {
            println!("Backup verified: checksum={}", checksum);
        } else {
            return Err("Backup verification failed".into());
        }
    }

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
GEODE_HOST="localhost:3141"

echo "Starting online backup..."

# Create backup
geode backup create \
  --host "${GEODE_HOST}" \
  --output "${BACKUP_FILE}" \
  --compress \
  --verify

# Check result
if [ $? -eq 0 ]; then
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "Backup complete: ${BACKUP_FILE} (${SIZE})"

    # Keep only last 7 daily backups
    find "${BACKUP_DIR}" -name "geode-*.backup" -mtime +7 -delete
    echo "Cleaned up old backups"
else
    echo "Backup failed!"
    exit 1
fi
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

A full backup contains the complete database state.

```bash
# Full backup with metadata
geode backup full \
  --output /backups/full-$(date +%Y%m%d).backup \
  --include-metadata \
  --include-indexes \
  --compress gzip \
  --compression-level 6
```

### Full Backup Schedule

```python
import asyncio
import os
from datetime import datetime
from geode_client import Client

async def create_full_backup():
    """Create a full backup with all data and metadata."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    backup_dir = "/backups/full"
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d")
    backup_path = f"{backup_dir}/geode-full-{timestamp}.backup"

    async with client.connection() as conn:
        # Create full backup with all options
        await conn.execute(
            """CALL geode.backup.full($path, {
                include_metadata: true,
                include_indexes: true,
                compression: 'gzip',
                compression_level: 6
            })""",
            {"path": backup_path}
        )

        # Get backup info
        result, _ = await conn.query(
            "CALL geode.backup.info($path)",
            {"path": backup_path}
        )

        if result.rows:
            info = result.rows[0]
            print(f"Full backup created: {backup_path}")
            print(f"  Nodes: {info['node_count'].as_int:,}")
            print(f"  Relationships: {info['relationship_count'].as_int:,}")
            print(f"  Size: {info['size_bytes'].as_int / (1024*1024):.2f} MB")
            print(f"  Duration: {info['duration_ms'].as_int} ms")

asyncio.run(create_full_backup())
```

## Incremental Backups

### Understanding Incremental Backups

Incremental backups only store changes since the last backup, reducing storage and time.

```
Day 1: Full Backup (10GB)
Day 2: Incremental (+500MB changes)
Day 3: Incremental (+300MB changes)
Day 4: Incremental (+400MB changes)
...
Day 7: New Full Backup
```

### Creating Incremental Backups

```bash
# Create incremental backup based on last full backup
geode backup incremental \
  --base /backups/full/geode-full-20260125.backup \
  --output /backups/incremental/geode-incr-$(date +%Y%m%d-%H%M%S).backup
```

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
import os
import json
from datetime import datetime
from geode_client import Client

class IncrementalBackupManager:
    def __init__(self, backup_dir: str):
        self.backup_dir = backup_dir
        self.full_dir = os.path.join(backup_dir, "full")
        self.incr_dir = os.path.join(backup_dir, "incremental")
        self.state_file = os.path.join(backup_dir, "backup_state.json")

        os.makedirs(self.full_dir, exist_ok=True)
        os.makedirs(self.incr_dir, exist_ok=True)

    def _load_state(self) -> dict:
        try:
            with open(self.state_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"last_full": None, "last_lsn": 0}

    def _save_state(self, state: dict):
        with open(self.state_file, 'w') as f:
            json.dump(state, f, indent=2)

    async def create_full_backup(self) -> str:
        """Create a new full backup."""
        client = Client(host="localhost", port=3141, skip_verify=True)

        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_path = os.path.join(self.full_dir, f"full-{timestamp}.backup")

        async with client.connection() as conn:
            # Create full backup
            result, _ = await conn.query(
                """CALL geode.backup.full($path, {
                    include_metadata: true,
                    compression: 'gzip'
                })""",
                {"path": backup_path}
            )

            if result.rows:
                lsn = result.rows[0]['end_lsn'].as_int

                # Update state
                state = self._load_state()
                state["last_full"] = backup_path
                state["last_lsn"] = lsn
                self._save_state(state)

                print(f"Full backup created: {backup_path}")
                print(f"  End LSN: {lsn}")

                return backup_path

        return None

    async def create_incremental_backup(self) -> str:
        """Create an incremental backup since last backup."""
        state = self._load_state()

        if not state["last_full"]:
            print("No full backup exists. Creating full backup first...")
            return await self.create_full_backup()

        client = Client(host="localhost", port=3141, skip_verify=True)

        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_path = os.path.join(self.incr_dir, f"incr-{timestamp}.backup")

        async with client.connection() as conn:
            # Create incremental backup
            result, _ = await conn.query(
                """CALL geode.backup.incremental($path, $from_lsn, {
                    compression: 'gzip'
                })""",
                {"path": backup_path, "from_lsn": state["last_lsn"]}
            )

            if result.rows:
                row = result.rows[0]
                changes = row['change_count'].as_int
                end_lsn = row['end_lsn'].as_int

                if changes == 0:
                    print("No changes since last backup")
                    os.remove(backup_path)
                    return None

                # Update state
                state["last_lsn"] = end_lsn
                self._save_state(state)

                print(f"Incremental backup created: {backup_path}")
                print(f"  Changes: {changes:,}")
                print(f"  End LSN: {end_lsn}")

                return backup_path

        return None

async def main():
    manager = IncrementalBackupManager("/backups/geode")

    # Weekly: Create full backup
    # await manager.create_full_backup()

    # Daily: Create incremental backup
    await manager.create_incremental_backup()

asyncio.run(main())
```
{{< /tab >}}
{{< tab "Go" >}}
```go
package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "os"
    "path/filepath"
    "time"

    _ "geodedb.com/geode"
)

type BackupState struct {
    LastFull string `json:"last_full"`
    LastLSN  int64  `json:"last_lsn"`
}

type IncrementalBackupManager struct {
    backupDir string
    db        *sql.DB
}

func NewIncrementalBackupManager(backupDir string, db *sql.DB) *IncrementalBackupManager {
    os.MkdirAll(filepath.Join(backupDir, "full"), 0755)
    os.MkdirAll(filepath.Join(backupDir, "incremental"), 0755)
    return &IncrementalBackupManager{backupDir: backupDir, db: db}
}

func (m *IncrementalBackupManager) loadState() BackupState {
    stateFile := filepath.Join(m.backupDir, "backup_state.json")
    data, err := os.ReadFile(stateFile)
    if err != nil {
        return BackupState{}
    }
    var state BackupState
    json.Unmarshal(data, &state)
    return state
}

func (m *IncrementalBackupManager) saveState(state BackupState) {
    stateFile := filepath.Join(m.backupDir, "backup_state.json")
    data, _ := json.MarshalIndent(state, "", "  ")
    os.WriteFile(stateFile, data, 0644)
}

func (m *IncrementalBackupManager) CreateFullBackup(ctx context.Context) (string, error) {
    timestamp := time.Now().Format("20060102-150405")
    backupPath := filepath.Join(m.backupDir, "full", fmt.Sprintf("full-%s.backup", timestamp))

    rows, err := m.db.QueryContext(ctx, `
        CALL geode.backup.full($1, {include_metadata: true, compression: 'gzip'})
    `, backupPath)
    if err != nil {
        return "", err
    }
    defer rows.Close()

    if rows.Next() {
        var endLSN int64
        rows.Scan(&endLSN)

        state := BackupState{LastFull: backupPath, LastLSN: endLSN}
        m.saveState(state)

        log.Printf("Full backup created: %s (LSN: %d)", backupPath, endLSN)
        return backupPath, nil
    }

    return "", fmt.Errorf("backup failed")
}

func (m *IncrementalBackupManager) CreateIncrementalBackup(ctx context.Context) (string, error) {
    state := m.loadState()

    if state.LastFull == "" {
        log.Println("No full backup exists, creating one first...")
        return m.CreateFullBackup(ctx)
    }

    timestamp := time.Now().Format("20060102-150405")
    backupPath := filepath.Join(m.backupDir, "incremental", fmt.Sprintf("incr-%s.backup", timestamp))

    rows, err := m.db.QueryContext(ctx, `
        CALL geode.backup.incremental($1, $2, {compression: 'gzip'})
    `, backupPath, state.LastLSN)
    if err != nil {
        return "", err
    }
    defer rows.Close()

    if rows.Next() {
        var changes int64
        var endLSN int64
        rows.Scan(&changes, &endLSN)

        if changes == 0 {
            os.Remove(backupPath)
            log.Println("No changes since last backup")
            return "", nil
        }

        state.LastLSN = endLSN
        m.saveState(state)

        log.Printf("Incremental backup: %s (changes: %d, LSN: %d)", backupPath, changes, endLSN)
        return backupPath, nil
    }

    return "", fmt.Errorf("incremental backup failed")
}

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()
    manager := NewIncrementalBackupManager("/backups/geode", db)

    // Create incremental backup
    _, err = manager.CreateIncrementalBackup(ctx)
    if err != nil {
        log.Fatalf("Backup failed: %v", err)
    }
}
```
{{< /tab >}}
{{< /tabs >}}

## Point-in-Time Recovery

### Understanding PITR

Point-in-Time Recovery allows you to restore the database to any specific moment.

**Requirements**:
- Full backup as a base
- Continuous WAL (Write-Ahead Log) archiving
- WAL files stored safely

### Configuring WAL Archiving

**geode.conf**:
```toml
[wal]
archive_enabled = true
archive_command = "cp %p /backups/wal/%f"
archive_timeout = 60  # seconds

[recovery]
restore_command = "cp /backups/wal/%f %p"
```

### Performing Point-in-Time Recovery

```bash
# Restore to specific timestamp
geode restore \
  --backup /backups/full/geode-full-20260125.backup \
  --wal-dir /backups/wal \
  --target-time "2026-01-28T14:30:00Z" \
  --output /var/lib/geode/data

# Restore to specific transaction
geode restore \
  --backup /backups/full/geode-full-20260125.backup \
  --wal-dir /backups/wal \
  --target-lsn 12345678 \
  --output /var/lib/geode/data
```

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
from datetime import datetime
from geode_client import Client

async def point_in_time_recovery(
    backup_path: str,
    wal_dir: str,
    target_time: datetime,
    output_dir: str
):
    """Restore database to a specific point in time."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        print(f"Starting point-in-time recovery...")
        print(f"  Base backup: {backup_path}")
        print(f"  Target time: {target_time.isoformat()}")

        # Initiate PITR
        result, _ = await conn.query(
            """CALL geode.restore.point_in_time($backup, $wal_dir, $target, $output, {
                verify: true,
                create_recovery_conf: true
            })""",
            {
                "backup": backup_path,
                "wal_dir": wal_dir,
                "target": target_time.isoformat(),
                "output": output_dir
            }
        )

        if result.rows:
            info = result.rows[0]
            print(f"Recovery complete:")
            print(f"  Restored to: {info['restored_to'].as_string}")
            print(f"  WAL files applied: {info['wal_files_applied'].as_int}")
            print(f"  Transactions recovered: {info['transactions_recovered'].as_int}")

            return True

    return False

async def main():
    # Restore to 2:30 PM today
    target = datetime(2026, 1, 28, 14, 30, 0)

    await point_in_time_recovery(
        backup_path="/backups/full/geode-full-20260125.backup",
        wal_dir="/backups/wal",
        target_time=target,
        output_dir="/var/lib/geode/data-recovered"
    )

asyncio.run(main())
```
{{< /tab >}}
{{< /tabs >}}

## Backup Verification

### Automatic Verification

```bash
# Verify backup integrity
geode backup verify /backups/geode-20260128.backup

# Verify with detailed output
geode backup verify \
  --backup /backups/geode-20260128.backup \
  --check-checksums \
  --check-consistency \
  --verbose
```

### Programmatic Verification

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
from geode_client import Client

async def verify_backup(backup_path: str) -> bool:
    """Comprehensively verify a backup file."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        print(f"Verifying backup: {backup_path}")

        # Basic integrity check
        result, _ = await conn.query(
            """CALL geode.backup.verify($path, {
                check_checksums: true,
                check_consistency: true,
                check_indexes: true
            })""",
            {"path": backup_path}
        )

        if not result.rows:
            print("Verification failed: No result")
            return False

        info = result.rows[0]

        checks = {
            "File integrity": info['file_valid'].as_bool,
            "Checksum match": info['checksum_valid'].as_bool,
            "Data consistency": info['data_consistent'].as_bool,
            "Index integrity": info['indexes_valid'].as_bool,
        }

        all_passed = True
        for check_name, passed in checks.items():
            status = "PASS" if passed else "FAIL"
            print(f"  {check_name}: {status}")
            if not passed:
                all_passed = False

        if all_passed:
            print(f"\nBackup verification: PASSED")
            print(f"  Checksum: {info['checksum'].as_string}")
            print(f"  Node count: {info['node_count'].as_int:,}")
            print(f"  Relationship count: {info['relationship_count'].as_int:,}")
        else:
            print(f"\nBackup verification: FAILED")

        return all_passed

async def verify_all_backups(backup_dir: str):
    """Verify all backups in a directory."""
    import os

    results = []
    for filename in os.listdir(backup_dir):
        if filename.endswith('.backup'):
            path = os.path.join(backup_dir, filename)
            valid = await verify_backup(path)
            results.append((filename, valid))
            print()

    print("=" * 50)
    print("SUMMARY")
    print("=" * 50)
    for filename, valid in results:
        status = "OK" if valid else "FAILED"
        print(f"  {filename}: {status}")

asyncio.run(verify_all_backups("/backups/full"))
```
{{< /tab >}}
{{< /tabs >}}

### Test Restores

Regularly test your backups by performing test restores:

```bash
#!/bin/bash
# Test restore script

BACKUP_FILE="$1"
TEST_DIR="/tmp/geode-test-restore"

# Clean up previous test
rm -rf "${TEST_DIR}"
mkdir -p "${TEST_DIR}"

# Restore to test directory
geode restore \
  --backup "${BACKUP_FILE}" \
  --output "${TEST_DIR}" \
  --no-start

# Verify data
geode verify "${TEST_DIR}"

# Start test instance
geode serve \
  --data-dir "${TEST_DIR}" \
  --port 3142 &

GEODE_PID=$!
sleep 5

# Run verification queries
geode shell --port 3142 -c "MATCH (n) RETURN count(n)"

# Stop test instance
kill ${GEODE_PID}

# Clean up
rm -rf "${TEST_DIR}"

echo "Test restore completed successfully"
```

## Restore Procedures

### Full Restore

```bash
# Stop Geode
systemctl stop geode

# Restore from backup
geode restore \
  --backup /backups/geode-full-20260128.backup \
  --output /var/lib/geode/data \
  --overwrite

# Verify restored data
geode verify /var/lib/geode/data

# Start Geode
systemctl start geode
```

### Restore from Incremental Backups

```bash
# Restore full backup first
geode restore \
  --backup /backups/full/geode-full-20260125.backup \
  --output /var/lib/geode/data

# Apply incremental backups in order
geode restore \
  --backup /backups/incremental/geode-incr-20260126.backup \
  --output /var/lib/geode/data \
  --incremental

geode restore \
  --backup /backups/incremental/geode-incr-20260127.backup \
  --output /var/lib/geode/data \
  --incremental
```

### Programmatic Restore

{{< tabs >}}
{{< tab "Python" >}}
```python
import asyncio
import os
from geode_client import Client

async def restore_database(
    backup_path: str,
    output_dir: str,
    incremental_backups: list = None
):
    """Restore database from backup files."""
    client = Client(host="localhost", port=3141, skip_verify=True)

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    async with client.connection() as conn:
        # Restore full backup
        print(f"Restoring full backup: {backup_path}")

        result, _ = await conn.query(
            """CALL geode.restore.full($backup, $output, {
                verify: true,
                overwrite: true
            })""",
            {"backup": backup_path, "output": output_dir}
        )

        if result.rows:
            info = result.rows[0]
            print(f"  Nodes restored: {info['node_count'].as_int:,}")
            print(f"  Relationships restored: {info['relationship_count'].as_int:,}")

        # Apply incremental backups
        if incremental_backups:
            for incr_backup in incremental_backups:
                print(f"Applying incremental: {incr_backup}")

                result, _ = await conn.query(
                    """CALL geode.restore.incremental($backup, $output, {
                        verify: true
                    })""",
                    {"backup": incr_backup, "output": output_dir}
                )

                if result.rows:
                    changes = result.rows[0]['changes_applied'].as_int
                    print(f"  Changes applied: {changes:,}")

        print(f"\nRestore complete. Data directory: {output_dir}")

async def main():
    await restore_database(
        backup_path="/backups/full/geode-full-20260125.backup",
        output_dir="/var/lib/geode/data-restored",
        incremental_backups=[
            "/backups/incremental/geode-incr-20260126.backup",
            "/backups/incremental/geode-incr-20260127.backup",
            "/backups/incremental/geode-incr-20260128.backup",
        ]
    )

asyncio.run(main())
```
{{< /tab >}}
{{< /tabs >}}

## Disaster Recovery Planning

### Recovery Time Objective (RTO) and Recovery Point Objective (RPO)

| Strategy | RTO | RPO | Cost |
|----------|-----|-----|------|
| Standby replica | Minutes | Seconds | High |
| Continuous backup | Hours | Minutes | Medium |
| Daily backup | Hours-Days | 24 hours | Low |

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
- [ ] Apply incremental/WAL files
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
from geode_client import Client

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
        client = Client(host="localhost", port=3141, skip_verify=True)

        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        local_path = f"/tmp/geode-backup-{timestamp}.backup"
        s3_key = f"backups/geode/full-{timestamp}.backup"

        async with client.connection() as conn:
            # Create local backup
            print("Creating backup...")
            await conn.execute(
                "CALL geode.backup.full($path, {compression: 'gzip'})",
                {"path": local_path}
            )

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

    async def restore_from_nearest_region(self, target_dir: str):
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

                    # Restore
                    client = Client(host="localhost", port=3141, skip_verify=True)
                    async with client.connection() as conn:
                        await conn.execute(
                            "CALL geode.restore.full($path, $output)",
                            {"path": local_path, "output": target_dir}
                        )

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

# Full backup every Sunday at 2 AM
0 2 * * 0 geode /usr/local/bin/geode-full-backup.sh >> /var/log/geode-backup.log 2>&1

# Incremental backup every day at 2 AM (except Sunday)
0 2 * * 1-6 geode /usr/local/bin/geode-incr-backup.sh >> /var/log/geode-backup.log 2>&1

# WAL archiving check every 5 minutes
*/5 * * * * geode /usr/local/bin/geode-wal-check.sh >> /var/log/geode-wal.log 2>&1
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
INCR_DIR="${BACKUP_DIR}/incremental"
WAL_DIR="${BACKUP_DIR}/wal"
STATE_FILE="${BACKUP_DIR}/backup_state.json"
RETENTION_DAYS=30
FULL_BACKUP_DAY=0  # Sunday

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Create directories
mkdir -p "${FULL_DIR}" "${INCR_DIR}" "${WAL_DIR}"

# Determine backup type
DAY_OF_WEEK=$(date +%w)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

if [ "${DAY_OF_WEEK}" -eq "${FULL_BACKUP_DAY}" ]; then
    BACKUP_TYPE="full"
    BACKUP_FILE="${FULL_DIR}/geode-full-${TIMESTAMP}.backup"
else
    BACKUP_TYPE="incremental"
    BACKUP_FILE="${INCR_DIR}/geode-incr-${TIMESTAMP}.backup"
fi

log "Starting ${BACKUP_TYPE} backup"

# Create backup
if [ "${BACKUP_TYPE}" = "full" ]; then
    geode backup full \
        --output "${BACKUP_FILE}" \
        --compress gzip \
        --verify

    # Update state with new full backup
    echo "{\"last_full\": \"${BACKUP_FILE}\"}" > "${STATE_FILE}"
else
    # Read last full backup from state
    if [ -f "${STATE_FILE}" ]; then
        LAST_FULL=$(jq -r '.last_full' "${STATE_FILE}")
    else
        log "No state file found. Creating full backup instead."
        BACKUP_FILE="${FULL_DIR}/geode-full-${TIMESTAMP}.backup"
        geode backup full --output "${BACKUP_FILE}" --compress gzip --verify
        echo "{\"last_full\": \"${BACKUP_FILE}\"}" > "${STATE_FILE}"
        exit 0
    fi

    geode backup incremental \
        --base "${LAST_FULL}" \
        --output "${BACKUP_FILE}" \
        --compress gzip \
        --verify
fi

# Verify backup
log "Verifying backup..."
geode backup verify "${BACKUP_FILE}"

# Get backup size
SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
log "Backup complete: ${BACKUP_FILE} (${SIZE})"

# Clean up old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${FULL_DIR}" -name "*.backup" -mtime +${RETENTION_DAYS} -delete
find "${INCR_DIR}" -name "*.backup" -mtime +${RETENTION_DAYS} -delete
find "${WAL_DIR}" -name "*.wal" -mtime +${RETENTION_DAYS} -delete

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
from datetime import datetime, timedelta
from geode_client import Client

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

            if age_days > 7:
                issues.append(f"Latest full backup is {age_days} days old")

    # Check for recent incremental backup
    incr_dir = os.path.join(backup_dir, "incremental")
    if os.path.exists(incr_dir):
        incr_backups = sorted([
            f for f in os.listdir(incr_dir) if f.endswith('.backup')
        ], reverse=True)

        if incr_backups:
            latest_incr = os.path.join(incr_dir, incr_backups[0])
            mtime = datetime.fromtimestamp(os.path.getmtime(latest_incr))
            age_hours = (datetime.now() - mtime).total_seconds() / 3600

            if age_hours > 25:  # More than 25 hours
                issues.append(f"Latest incremental is {age_hours:.0f} hours old")

    # Check WAL archiving
    wal_dir = os.path.join(backup_dir, "wal")
    if os.path.exists(wal_dir):
        wal_files = [f for f in os.listdir(wal_dir) if f.endswith('.wal')]
        if wal_files:
            latest_wal = max(wal_files, key=lambda f: os.path.getmtime(
                os.path.join(wal_dir, f)))
            mtime = datetime.fromtimestamp(
                os.path.getmtime(os.path.join(wal_dir, latest_wal)))
            age_minutes = (datetime.now() - mtime).total_seconds() / 60

            if age_minutes > 10:
                issues.append(f"WAL archiving may be delayed ({age_minutes:.0f} min)")

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
    for backup_type in ['full', 'incremental']:
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

# Start metrics server
start_http_server(9090)

# Update metrics periodically
import time
while True:
    update_metrics("/backups/geode")
    time.sleep(60)
```

## Best Practices

### Backup Checklist

- [ ] **Regular full backups** (weekly recommended)
- [ ] **Daily incremental backups**
- [ ] **WAL archiving enabled** for point-in-time recovery
- [ ] **Backup verification** after each backup
- [ ] **Test restores** at least monthly
- [ ] **Off-site backup storage** (different region/provider)
- [ ] **Encryption** for backups containing sensitive data
- [ ] **Monitoring and alerting** for backup failures
- [ ] **Documented recovery procedures**
- [ ] **Regular DR drills**

### Security Considerations

```bash
# Encrypt backup
geode backup create \
  --output /backups/geode.backup \
  --encrypt \
  --encryption-key-file /etc/geode/backup.key

# Restore encrypted backup
geode restore \
  --backup /backups/geode.backup \
  --decrypt \
  --encryption-key-file /etc/geode/backup.key \
  --output /var/lib/geode/data
```

## Next Steps

- [Data Import Guide](/guides/data-import/) - Import data into Geode
- [Data Export Guide](/guides/data-export/) - Export your data
- [High Availability Guide](/docs/high-availability/) - Configure HA
- [Performance Guide](/docs/performance/) - Optimize performance

## Resources

- [CLI Reference](/docs/cli-reference/)
- [Configuration Reference](/docs/configuration/)
- [API Reference](/docs/api-reference/)
- [Community Forum](https://forum.geodedb.com)

---

**Questions?** Discuss backup strategies in our [forum](https://forum.geodedb.com).
