---
title: "Storage Engine"
description: "Deep dive into Geode's storage engine architecture, data persistence mechanisms, disk layout, write-ahead logging, compaction, and storage configuration for optimal graph database performance."
keywords:
  - storage engine
  - data persistence
  - disk layout
  - write-ahead log
  - WAL
  - compaction
  - B-tree
  - LSM tree
  - page management
  - buffer pool
  - checkpointing
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/storage/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Storage Engine in Geode

The storage engine is the foundation of any database system, responsible for durably persisting data, managing memory, and providing efficient access patterns. Geode's storage engine is purpose-built for graph workloads, optimizing for relationship traversals, flexible schemas, and ACID transactions.

This guide explores Geode's storage architecture, configuration options, and best practices for optimal storage performance.

## Storage Architecture Overview

### Design Principles

Geode's storage engine follows key principles:

**Graph-Native Design**: Optimized for adjacency lookups and traversals, not just point queries

**Memory-Mapped I/O**: Efficient use of OS page cache for frequently accessed data

**Write-Ahead Logging**: Durability without sacrificing write performance

**Copy-on-Write MVCC**: Non-blocking reads during concurrent modifications

**Tiered Storage**: Hot/warm/cold data management for cost efficiency

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Query Engine                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Transaction Manager                       │
│              (MVCC, Locking, Isolation)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     Buffer Pool                             │
│           (Page Cache, Dirty Page Management)               │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│   Index Files   │ │  Data Files │ │    WAL Files    │
│   (B-tree)      │ │  (Pages)    │ │  (Sequential)   │
└─────────────────┘ └─────────────┘ └─────────────────┘
```

## Data File Organization

### Page Structure

Data is organized into fixed-size pages (default 16 KB):

```
Page Layout (16 KB):
┌──────────────────────────────────────────────────────────┐
│ Page Header (64 bytes)                                   │
│  - Page ID (8 bytes)                                     │
│  - Page Type (2 bytes): DATA, INDEX, OVERFLOW, FREE      │
│  - LSN (8 bytes): Log Sequence Number                    │
│  - Checksum (4 bytes)                                    │
│  - Free Space Offset (2 bytes)                           │
│  - Item Count (2 bytes)                                  │
│  - Flags (2 bytes)                                       │
│  - Reserved (36 bytes)                                   │
├──────────────────────────────────────────────────────────┤
│ Item Pointers (variable)                                 │
│  - Offset (2 bytes) + Length (2 bytes) per item          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                    Free Space                            │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ Items (variable)                                         │
│  - Node records, edge records, or property data          │
└──────────────────────────────────────────────────────────┘
```

**Page Configuration**:

```toml
[storage.pages]
size_kb = 16           # Page size (8, 16, or 32 KB)
alignment = 4096       # Disk alignment (usually 4K)
checksum = "crc32c"    # Checksum algorithm
```

### Node Storage

Nodes are stored with their labels and properties:

```
Node Record:
┌─────────────────────────────────────────────────────────┐
│ Node ID (8 bytes)                                       │
│ Label Bitmap (8 bytes) - Up to 64 labels per node       │
│ Property Count (2 bytes)                                │
│ First Edge Pointer (8 bytes) - Outgoing edges           │
│ Properties (variable):                                  │
│   - Key ID (4 bytes)                                    │
│   - Type (1 byte)                                       │
│   - Value (variable)                                    │
│   - ...                                                 │
│ Overflow Pointer (8 bytes) - For large properties       │
└─────────────────────────────────────────────────────────┘
```

### Edge Storage

Edges connect nodes with relationship data:

```
Edge Record:
┌─────────────────────────────────────────────────────────┐
│ Edge ID (8 bytes)                                       │
│ Source Node ID (8 bytes)                                │
│ Target Node ID (8 bytes)                                │
│ Relationship Type ID (4 bytes)                          │
│ Next Outgoing Edge (8 bytes) - Linked list              │
│ Next Incoming Edge (8 bytes) - Linked list              │
│ Property Count (2 bytes)                                │
│ Properties (variable)                                   │
└─────────────────────────────────────────────────────────┘
```

### File Layout

```
Data Directory Structure:
/var/lib/geode/data/
├── base/                    # Main database files
│   ├── nodes.dat           # Node data pages
│   ├── edges.dat           # Edge data pages
│   ├── properties.dat      # Large property overflow
│   └── free_space.map      # Free space tracking
├── indexes/                 # Index files
│   ├── node_labels.idx     # Label index
│   ├── edge_types.idx      # Relationship type index
│   └── property_*.idx      # Property indexes
├── wal/                     # Write-ahead log
│   ├── 000000010000000000000001
│   ├── 000000010000000000000002
│   └── ...
├── system/                  # System catalog
│   ├── schema.dat          # Schema definitions
│   ├── statistics.dat      # Query statistics
│   └── config.dat          # Runtime configuration
└── temp/                    # Temporary files
    └── sort_*.tmp          # Sort spill files
```

## Write-Ahead Logging (WAL)

### WAL Architecture

All modifications are written to the WAL before applying to data files:

```
Write Flow:
1. Transaction begins
2. Modifications logged to WAL buffer
3. WAL buffer flushed to disk (fsync)
4. Changes applied to buffer pool (memory)
5. Transaction commits
6. Background: dirty pages flushed to data files
```

**WAL Record Format**:

```
WAL Record:
┌─────────────────────────────────────────────────────────┐
│ LSN (8 bytes) - Log Sequence Number                     │
│ Transaction ID (8 bytes)                                │
│ Record Type (1 byte): INSERT, UPDATE, DELETE, COMMIT    │
│ Table ID (4 bytes)                                      │
│ Record Length (4 bytes)                                 │
│ Before Image (variable) - For rollback                  │
│ After Image (variable) - For replay                     │
│ Checksum (4 bytes)                                      │
└─────────────────────────────────────────────────────────┘
```

### WAL Configuration

```toml
[storage.wal]
enabled = true
directory = "/var/lib/geode/wal"

# Segment size (WAL files)
segment_size_mb = 64

# Sync mode
sync_mode = "fsync"  # fsync, fdatasync, or async

# Buffer size
buffer_size_mb = 16

# Checkpoint settings
checkpoint_interval_seconds = 300
checkpoint_threshold_mb = 1024

# Archiving
archive_enabled = true
archive_command = "/etc/geode/archive_wal.sh %f %p"
```

### WAL Sync Modes

**fsync** (default): Full durability, slightly slower

```toml
[storage.wal]
sync_mode = "fsync"
```

**fdatasync**: Faster, skips metadata sync

```toml
[storage.wal]
sync_mode = "fdatasync"
```

**async**: Best performance, risk of data loss on crash

```toml
[storage.wal]
sync_mode = "async"
sync_interval_ms = 100  # Periodic sync
```

### Monitoring WAL

```gql
-- WAL statistics
SELECT
    current_wal_lsn,
    last_checkpoint_lsn,
    wal_size_mb,
    wal_write_rate_mb_per_sec,
    checkpoint_in_progress
FROM system.wal_stats;

-- WAL file status
SELECT
    segment_name,
    size_mb,
    start_lsn,
    end_lsn,
    archived,
    archived_at
FROM system.wal_segments
ORDER BY start_lsn DESC
LIMIT 10;
```

## Buffer Pool Management

### Buffer Pool Architecture

The buffer pool caches data pages in memory:

```
Buffer Pool:
┌─────────────────────────────────────────────────────────┐
│ Hash Table (Page ID -> Buffer Index)                    │
├─────────────────────────────────────────────────────────┤
│ Buffer Frames:                                          │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│   │ Frame 0  │ │ Frame 1  │ │ Frame 2  │ ...          │
│   │ Page 42  │ │ Page 17  │ │ Page 891 │              │
│   │ Dirty    │ │ Clean    │ │ Dirty    │              │
│   │ Pinned:2 │ │ Pinned:0 │ │ Pinned:1 │              │
│   └──────────┘ └──────────┘ └──────────┘              │
├─────────────────────────────────────────────────────────┤
│ LRU List (eviction candidates)                          │
├─────────────────────────────────────────────────────────┤
│ Dirty Page List (checkpoint candidates)                 │
└─────────────────────────────────────────────────────────┘
```

### Configuration

```toml
[storage.buffer_pool]
# Total buffer pool size
size_mb = 4096  # 4 GB

# Percentage for different purposes
data_cache_percent = 70
index_cache_percent = 25
temp_buffer_percent = 5

# Eviction policy
eviction_policy = "lru"  # lru, lru-k, or clock

# Background writer
background_writer_enabled = true
background_writer_interval_ms = 100
background_writer_batch_size = 64

# Prefetching
prefetch_enabled = true
prefetch_distance = 32  # Pages to read ahead
```

### Page Replacement

Geode uses LRU-K for intelligent page eviction:

```gql
-- Buffer pool statistics
SELECT
    total_pages,
    used_pages,
    dirty_pages,
    hit_ratio,
    evictions_per_sec,
    reads_per_sec,
    writes_per_sec
FROM system.buffer_pool_stats;

-- Per-table buffer usage
SELECT
    table_name,
    cached_pages,
    cached_mb,
    hit_ratio
FROM system.buffer_pool_by_table
ORDER BY cached_mb DESC
LIMIT 10;
```

## Index Storage

### B-Tree Indexes

Primary index structure for most lookups:

```
B-Tree Structure:
                    ┌─────────────┐
                    │ Root Node   │
                    │ [50, 100]   │
                    └──────┬──────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │ < 50    │  │ 50-100  │  │ > 100   │
        │[10,25]  │  │[75,90]  │  │[125,150]│
        └────┬────┘  └────┬────┘  └────┬────┘
           ...          ...          ...
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │Leaf Page│  │Leaf Page│  │Leaf Page│
        │Key→Value│  │Key→Value│  │Key→Value│
        └─────────┘  └─────────┘  └─────────┘
```

**B-Tree Configuration**:

```toml
[storage.indexes.btree]
# Fill factor for leaf pages
fill_factor = 90  # Percent

# Node split strategy
split_strategy = "balanced"  # balanced or right_biased

# Bulk loading optimization
bulk_load_factor = 95
```

### Index File Format

```
Index Page:
┌─────────────────────────────────────────────────────────┐
│ Page Header                                             │
│   - Page Type: INDEX_INTERNAL or INDEX_LEAF             │
│   - Level: 0 for leaf, 1+ for internal                  │
│   - Key Count                                           │
│   - Right Sibling Pointer                               │
├─────────────────────────────────────────────────────────┤
│ Keys and Pointers:                                      │
│   Internal: [Key1][Ptr1][Key2][Ptr2]...[PtrN]          │
│   Leaf:     [Key1][Value1][Key2][Value2]...            │
└─────────────────────────────────────────────────────────┘
```

### Vector Indexes (HNSW)

For similarity search on embeddings:

```toml
[storage.indexes.hnsw]
# HNSW graph parameters (m, ef_construction, ef_search) are engine-managed
# and are not configurable in this release.

# Memory mapping
mmap_enabled = true
preload = false          # Load into memory on startup

# Quantization for memory efficiency
quantization = "none"    # none, pq, or sq
```

## Compaction and Maintenance

### Background Compaction

Geode performs continuous compaction to reclaim space:

```toml
[storage.compaction]
enabled = true

# Compaction triggers
dead_tuple_threshold = 20  # Percent dead tuples
size_amplification_threshold = 1.5

# Compaction schedule
schedule = "continuous"  # continuous or scheduled
scheduled_time = "03:00"

# Resource limits
max_concurrent_compactions = 2
throttle_mb_per_sec = 100
```

### Manual Maintenance

```bash
# Trigger compaction
./geode admin compact --graph social_network

# Analyze statistics
./geode admin analyze --graph social_network

# Vacuum dead tuples
./geode admin vacuum --graph social_network

# Rebuild indexes
./geode admin reindex --index user_email_idx
```

**Via GQL**:

```gql
-- Compact a specific table
CALL system.compact('User');

-- Update statistics
ANALYZE User;

-- Vacuum dead tuples
VACUUM User;

-- Rebuild index
REINDEX INDEX user_email_idx;

-- Check fragmentation
SELECT
    table_name,
    live_tuples,
    dead_tuples,
    dead_tuple_ratio,
    last_vacuum,
    last_analyze
FROM system.table_stats;
```

### Checkpointing

Checkpoints write dirty pages to disk and advance the recovery point:

```toml
[storage.checkpoint]
# Checkpoint triggers
interval_seconds = 300
wal_size_mb = 1024
dirty_page_percent = 50

# Checkpoint behavior
spread_writes = true      # Spread I/O over time
spread_duration_seconds = 60

# Monitoring
log_checkpoints = true
```

```gql
-- Checkpoint status
SELECT
    checkpoint_start_time,
    checkpoint_end_time,
    duration_seconds,
    pages_written,
    wal_segments_removed
FROM system.checkpoint_log
ORDER BY checkpoint_start_time DESC
LIMIT 5;

-- Force checkpoint
CHECKPOINT;
```

## Storage Monitoring

### Key Metrics

```bash
# Prometheus metrics
curl http://localhost:3141/metrics | grep -E "geode_storage|geode_buffer|geode_wal"

# Example metrics
geode_storage_data_size_bytes 13421772800
geode_storage_index_size_bytes 2147483648
geode_storage_wal_size_bytes 536870912
geode_buffer_pool_hits_total 8472938
geode_buffer_pool_misses_total 234789
geode_buffer_pool_dirty_pages 1234
geode_wal_writes_total 847293
geode_wal_bytes_written_total 2147483648
geode_checkpoint_duration_seconds_sum 45.7
```

### Storage Health Queries

```gql
-- Overall storage statistics
SELECT
    data_size_gb,
    index_size_gb,
    wal_size_gb,
    free_space_gb,
    total_size_gb,
    fragmentation_percent
FROM system.storage_overview;

-- Per-graph storage
SELECT
    graph_name,
    node_count,
    edge_count,
    data_size_mb,
    index_size_mb
FROM system.graph_storage
ORDER BY data_size_mb DESC;

-- Disk I/O statistics
SELECT
    reads_per_sec,
    writes_per_sec,
    read_bytes_per_sec,
    write_bytes_per_sec,
    avg_read_latency_ms,
    avg_write_latency_ms
FROM system.disk_io_stats;
```

### Alerting Rules

```yaml
# Prometheus alerts for storage
groups:
  - name: geode_storage_alerts
    rules:
      - alert: DiskSpaceLow
        expr: geode_storage_free_bytes / geode_storage_total_bytes < 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Disk space below 10%"

      - alert: DiskSpaceCritical
        expr: geode_storage_free_bytes / geode_storage_total_bytes < 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space below 5%"

      - alert: BufferPoolHitRateLow
        expr: geode_buffer_pool_hit_ratio < 0.9
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Buffer pool hit rate below 90%"

      - alert: WALGrowthHigh
        expr: rate(geode_wal_bytes_written_total[5m]) > 100000000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High WAL write rate"

      - alert: CheckpointTooLong
        expr: geode_checkpoint_duration_seconds > 300
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Checkpoint taking too long"
```

## Storage Configuration Best Practices

### Hardware Recommendations

**SSDs**: Strongly recommended for production

```toml
[storage]
# SSD-optimized settings
disk_type = "ssd"
page_size_kb = 16
read_ahead_kb = 256
```

**NVMe**: Best performance for write-heavy workloads

```toml
[storage]
disk_type = "nvme"
page_size_kb = 16
io_depth = 32
```

**HDDs**: Only for archival/cold storage

```toml
[storage]
disk_type = "hdd"
page_size_kb = 32
read_ahead_kb = 1024
sequential_read_threshold = 64
```

### Memory Sizing

```toml
# Rule of thumb: buffer pool = 50-75% of available RAM
[storage.buffer_pool]
size_mb = 32768  # 32 GB for 48 GB system

# Working set should fit in buffer pool
# Monitor hit ratio and adjust
```

### File System Settings

```bash
# Linux ext4 recommended settings
mkfs.ext4 -O ^has_journal /dev/sdb1  # Disable journal (WAL handles durability)

# Mount options
mount -o noatime,nodiratime,data=writeback /dev/sdb1 /var/lib/geode

# Disable transparent huge pages
echo never > /sys/kernel/mm/transparent_hugepage/enabled

# Increase file descriptors
ulimit -n 65535
```

### Configuration Template

```toml
# Production storage configuration
[storage]
data_directory = "/var/lib/geode/data"
temp_directory = "/var/lib/geode/temp"

[storage.pages]
size_kb = 16
checksum = "crc32c"

[storage.buffer_pool]
size_mb = 32768
eviction_policy = "lru"
background_writer_enabled = true

[storage.wal]
directory = "/var/lib/geode/wal"
segment_size_mb = 64
sync_mode = "fsync"
checkpoint_interval_seconds = 300

[storage.compaction]
enabled = true
max_concurrent_compactions = 2
throttle_mb_per_sec = 100

[storage.indexes]
fill_factor = 90
```

## Related Topics

- [Performance](/tags/performance/) - Performance optimization
- [Caching](/tags/caching/) - Caching strategies
- [Backup](/tags/backup/) - Backup procedures
- [Recovery](/tags/recovery/) - Recovery procedures
- [Indexing](/tags/indexing/) - Index management
- [Configuration](/tags/configuration/) - Server configuration

## Further Reading

- Storage Engine Architecture Deep Dive
- WAL Configuration Guide
- Buffer Pool Tuning
- Index Selection and Maintenance
- Storage Capacity Planning
- I/O Performance Optimization
