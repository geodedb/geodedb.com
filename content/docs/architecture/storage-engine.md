---
title: "Storage Engine Architecture"
description: "Deep dive into Geode's storage engine including memory-mapped I/O, page management, MVCC transactions, and data persistence"
url: /docs/architecture/storage-engine/
keywords: ["storage engine", "memory-mapped I/O", "page cache", "MVCC", "transactions", "persistence", "WAL"]
weight: 20
slug: "storage-engine"
canonical: "https://geodedb.com/docs/architecture/storage-engine/"
---

<!-- CANARY: REQ=REQ-STORAGE-001; FEATURE="Storage"; ASPECT=Documentation; STATUS=TESTED; OWNER=storage; UPDATED=2026-01-28 -->

# Storage Engine Architecture

Geode's storage engine is built for high-performance graph workloads with ACID guarantees, efficient memory utilization, and durable persistence.

## Overview

The storage engine implements a page-based architecture with memory-mapped I/O for optimal performance:

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                   Storage Manager                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Page Cache  │  │    MVCC     │  │  Index Mgr  │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
└─────────┼────────────────┼────────────────┼─────────────┘
          │                │                │
┌─────────▼────────────────▼────────────────▼─────────────┐
│                    Buffer Pool                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │             Memory-Mapped Pages                  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                     Disk Storage                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Data File│  │   WAL    │  │  Indexes │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

## Page Management

### Page Structure

Each page is 8KB by default and contains:

```
┌────────────────────────────────────────┐
│ Page Header (64 bytes)                 │
│  - Page ID                             │
│  - Page Type                           │
│  - LSN (Log Sequence Number)           │
│  - Checksum                            │
│  - Free Space Pointer                  │
│  - Slot Count                          │
└────────────────────────────────────────┘
│ Slot Directory (grows down)            │
│  - Offset, Length pairs                │
└────────────────────────────────────────┘
│                                        │
│ Free Space                             │
│                                        │
└────────────────────────────────────────┘
│ Records (grow up)                      │
│  - Node/Relationship data              │
└────────────────────────────────────────┘
```

### Page Types

| Type | Description |
|------|-------------|
| `NodePage` | Stores node records with properties |
| `RelationshipPage` | Stores relationship records |
| `PropertyPage` | Overflow storage for large properties |
| `IndexPage` | B-tree and hash index nodes |
| `FreelistPage` | Tracks available space |

## Memory-Mapped I/O

Geode uses memory-mapped files for efficient data access:

```zig
const MappedFile = struct {
    fd: std.posix.fd_t,
    data: []align(page_size) u8,
    size: usize,

    pub fn init(path: []const u8, size: usize) !MappedFile {
        const fd = try std.posix.open(path, .{ .ACCMODE = .RDWR });
        const data = try std.posix.mmap(
            null,
            size,
            std.posix.PROT.READ | std.posix.PROT.WRITE,
            .{ .TYPE = .SHARED },
            fd,
            0
        );
        return .{ .fd = fd, .data = data, .size = size };
    }
};
```

### Benefits

- **Zero-copy access**: Direct memory access without system call overhead
- **OS page cache**: Automatic caching by the operating system
- **Efficient I/O**: Asynchronous writeback by the OS
- **Large address space**: Utilize virtual memory for large datasets

## Buffer Pool

The buffer pool manages page caching with LRU eviction:

```
┌─────────────────────────────────────────┐
│              Buffer Pool                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ P1  │ │ P2  │ │ P3  │ │ ... │       │
│  │ Hot │ │Warm │ │Cold │ │     │       │
│  └──┬──┘ └──┬──┘ └──┬──┘ └─────┘       │
│     │       │       │                   │
│  ┌──▼───────▼───────▼──┐                │
│  │    LRU Chain        │                │
│  └─────────────────────┘                │
└─────────────────────────────────────────┘
```

### Configuration

```yaml
storage:
  page_size: 8192           # 8KB pages
  page_cache_size: "1GB"    # Buffer pool size
  checkpoint_interval: 60   # Seconds between checkpoints
  wal_buffer_size: "16MB"   # Write-ahead log buffer
```

## MVCC (Multi-Version Concurrency Control)

Geode implements MVCC for non-blocking reads:

### Version Chain

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Version 3  │────▶│   Version 2  │────▶│   Version 1  │
│   TxID: 105  │     │   TxID: 100  │     │   TxID: 95   │
│   Status:    │     │   Status:    │     │   Status:    │
│   Active     │     │   Committed  │     │   Committed  │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Snapshot Isolation

```zig
pub const Snapshot = struct {
    txn_id: u64,
    min_active_txn: u64,
    active_txns: std.AutoHashMap(u64, void),

    pub fn isVisible(self: *Snapshot, version: *Version) bool {
        // Version must be committed and created before snapshot
        if (version.txn_id >= self.txn_id) return false;
        if (self.active_txns.contains(version.txn_id)) return false;
        return version.status == .Committed;
    }
};
```

## Write-Ahead Logging (WAL)

All modifications are logged before being applied:

### WAL Record Structure

```
┌─────────────────────────────────────┐
│ WAL Record                          │
│  - LSN (8 bytes)                    │
│  - Transaction ID (8 bytes)         │
│  - Record Type (1 byte)             │
│  - Page ID (8 bytes)                │
│  - Offset (2 bytes)                 │
│  - Length (2 bytes)                 │
│  - Before Image (variable)          │
│  - After Image (variable)           │
│  - Checksum (4 bytes)               │
└─────────────────────────────────────┘
```

### Recovery Process

1. **Analysis Phase**: Scan WAL to identify active transactions
2. **Redo Phase**: Replay committed changes
3. **Undo Phase**: Rollback uncommitted transactions

## Checkpointing

Periodic checkpoints reduce recovery time:

```
┌────────────────────────────────────────────────────────┐
│                    Timeline                             │
│                                                         │
│  ◄──────────────────────────────────────────────────►  │
│  │         │              │              │              │
│  Start   Chkpt1         Chkpt2        Crash            │
│           │              │              │               │
│           └──────────────┴──────────────┘               │
│                Recovery Window                          │
└────────────────────────────────────────────────────────┘
```

## Index Storage

Geode supports multiple index types with dedicated storage:

### B-tree Index

- Balanced tree structure for range queries
- Configurable fan-out (default: 128)
- Page-level locking for concurrent access

### Hash Index

- O(1) equality lookups
- Extendible hashing for growth
- Suitable for unique constraints

### HNSW Index (Vector Search)

- Hierarchical navigable small world graphs
- Approximate nearest neighbor search
- SIMD-accelerated distance calculations

## Performance Characteristics

| Operation | Latency | Throughput |
|-----------|---------|------------|
| Point Read | <0.1ms | 100K ops/s |
| Range Scan | ~1ms | 1M rows/s |
| Single Write | <1ms | 50K ops/s |
| Batch Write | <10ms | 200K ops/s |

## Configuration Options

```yaml
storage:
  # Data directory
  data_dir: "/var/lib/geode"

  # Page configuration
  page_size: 8192
  page_cache_size: "2GB"

  # WAL configuration
  wal_enabled: true
  wal_sync_mode: "fsync"  # fsync, fdatasync, or async
  wal_buffer_size: "16MB"

  # Checkpointing
  checkpoint_interval: 60
  checkpoint_threshold: 1000000  # Bytes of WAL before checkpoint

  # Compaction
  compaction_enabled: true
  compaction_threshold: 0.5  # Compact when 50% of space is dead
```

## Next Steps

- [Query Optimization](/docs/architecture/query-optimization/) - CBO and index selection
- [Distributed Systems](/docs/architecture/distributed-systems/) - Multi-node deployments
- [Performance Tuning](/docs/query/performance-tuning/) - Optimization strategies
