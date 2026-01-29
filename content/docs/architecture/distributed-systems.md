---
title: "Distributed Systems Architecture"
description: "Geode's distributed systems including Raft consensus, federation, sharding strategies, and fault tolerance mechanisms"
url: /docs/architecture/distributed-systems/
keywords: ["distributed systems", "Raft consensus", "federation", "sharding", "replication", "fault tolerance"]
weight: 30
slug: "distributed-systems"
canonical: "https://geodedb.com/docs/architecture/distributed-systems/"
---

<!-- CANARY: REQ=REQ-DISTRIBUTED-001; FEATURE="Distributed"; ASPECT=Documentation; STATUS=TESTED; OWNER=distributed; UPDATED=2026-01-28 -->

# Distributed Systems Architecture

Geode's distributed architecture enables horizontal scaling, high availability, and fault tolerance for enterprise graph workloads.

## Overview

The distributed layer implements several key patterns:

{{< mermaid title="Distributed Architecture Overview" >}}
flowchart TB
    subgraph Client["Client Layer"]
        C1[Client 1]
        C2[Client 2]
        C3[Client N]
    end

    subgraph Coordinator["Query Coordinator"]
        Router[Router]
        Planner[Planner]
        Merger[Merger]
    end

    subgraph Shards["Shard Layer"]
        subgraph S1["Shard 1"]
            L1[Leader]
            R1A[Replica]
            R1B[Replica]
        end
        subgraph S2["Shard 2"]
            L2[Leader]
            R2A[Replica]
            R2B[Replica]
        end
        subgraph SN["Shard N"]
            LN[Leader]
            RNA[Replica]
            RNB[Replica]
        end
    end

    Client --> Coordinator
    Router --> S1
    Router --> S2
    Router --> SN
    L1 --> R1A
    L1 --> R1B
    L2 --> R2A
    L2 --> R2B
    LN --> RNA
    LN --> RNB
{{< /mermaid >}}

## Raft Consensus

Geode uses Raft for distributed consensus within each shard:

### Leader Election

{{< mermaid title="Raft Consensus - Leader Election" >}}
sequenceDiagram
    participant F1 as Follower 1
    participant L as Leader
    participant F2 as Follower 2

    Note over F1,F2: Normal Operation
    L->>F1: Heartbeat
    L->>F2: Heartbeat
    F1-->>L: Ack
    F2-->>L: Ack

    Note over F1,F2: Leader Failure
    F1->>F1: Election Timeout
    F1->>F2: RequestVote
    F2-->>F1: VoteGranted
    F1->>F1: Becomes Leader

    Note over F1,F2: New Leader
    F1->>F2: Heartbeat (new leader)
    F2-->>F1: Ack
{{< /mermaid >}}

### Log Replication

All write operations are replicated through the Raft log:

```zig
pub const RaftLog = struct {
    entries: std.ArrayList(LogEntry),
    commit_index: u64,
    last_applied: u64,

    pub fn appendEntry(self: *RaftLog, entry: LogEntry) !void {
        try self.entries.append(entry);
        // Replicate to followers
        try self.replicateToFollowers(entry);
    }

    pub fn commit(self: *RaftLog, index: u64) void {
        self.commit_index = index;
        // Apply committed entries
        while (self.last_applied < self.commit_index) {
            self.applyEntry(self.entries[self.last_applied]);
            self.last_applied += 1;
        }
    }
};
```

### Configuration

```yaml
raft:
  election_timeout_ms: 150-300    # Random timeout range
  heartbeat_interval_ms: 50       # Leader heartbeat frequency
  snapshot_threshold: 10000       # Entries before snapshot
  max_entries_per_request: 100    # Batch size for replication
```

## Sharding Strategies

### Hash-Based Sharding

Distribute data evenly using consistent hashing:

```
┌─────────────────────────────────────────────────────────┐
│                    Hash Ring                             │
│                                                          │
│           Shard 1         Shard 2         Shard 3       │
│              │               │               │           │
│    ◄─────────┼───────────────┼───────────────┼─────────► │
│    0        25%            50%            75%       100% │
│                                                          │
│    hash(node_id) % num_shards → shard assignment        │
└─────────────────────────────────────────────────────────┘
```

### Range-Based Sharding

Partition by property ranges for range queries:

```yaml
sharding:
  strategy: "range"
  key: "created_at"
  ranges:
    - { shard: 1, min: "2024-01-01", max: "2024-06-30" }
    - { shard: 2, min: "2024-07-01", max: "2024-12-31" }
    - { shard: 3, min: "2025-01-01", max: "2025-06-30" }
```

### Graph-Aware Sharding

Keep connected nodes together to minimize cross-shard queries:

```zig
pub fn assignShard(node: Node, neighbors: []Node) ShardId {
    // Count neighbor shard assignments
    var shard_counts = std.AutoHashMap(ShardId, u32).init(allocator);
    for (neighbors) |neighbor| {
        const count = shard_counts.get(neighbor.shard_id) orelse 0;
        shard_counts.put(neighbor.shard_id, count + 1);
    }

    // Assign to shard with most neighbors (locality)
    var best_shard: ShardId = 0;
    var max_count: u32 = 0;
    var iter = shard_counts.iterator();
    while (iter.next()) |entry| {
        if (entry.value > max_count) {
            max_count = entry.value;
            best_shard = entry.key;
        }
    }

    return best_shard;
}
```

## Federation

Connect multiple Geode clusters for geo-distribution:

{{< mermaid title="Federation - Geo-Distributed Clusters" >}}
flowchart LR
    subgraph US["US-East Region"]
        US1[Primary]
        US2[Replica]
        US3[Replica]
        US1 --> US2
        US1 --> US3
    end

    subgraph EU["EU-West Region"]
        EU1[Primary]
        EU2[Replica]
        EU3[Replica]
        EU1 --> EU2
        EU1 --> EU3
    end

    subgraph AP["AP-South Region"]
        AP1[Primary]
        AP2[Replica]
        AP3[Replica]
        AP1 --> AP2
        AP1 --> AP3
    end

    US1 <-.->|Async Replication| EU1
    EU1 <-.->|Async Replication| AP1
    AP1 <-.->|Async Replication| US1
{{< /mermaid >}}

### Federation Configuration

```yaml
federation:
  enabled: true
  cluster_id: "us-east-1"
  peers:
    - host: "eu-west.geode.example.com"
      port: 3141
      async: true
    - host: "ap-south.geode.example.com"
      port: 3141
      async: true
  conflict_resolution: "last-write-wins"
  replication_lag_threshold_ms: 5000
```

## Query Routing

### Scatter-Gather Pattern

```
Client Query
     │
     ▼
┌─────────────────┐
│ Query Coordinator│
└────────┬────────┘
         │
    ┌────┴────┐        (Scatter)
    ▼    ▼    ▼
┌─────┐┌─────┐┌─────┐
│Shard││Shard││Shard│
│  1  ││  2  ││  3  │
└──┬──┘└──┬──┘└──┬──┘
   │      │      │
   └──────┼──────┘     (Gather)
          ▼
   ┌──────────────┐
   │ Result Merger│
   └──────────────┘
          │
          ▼
      Final Result
```

### Shard Pruning

Eliminate unnecessary shard access:

```zig
fn pruneShards(query: Query, shards: []Shard) []Shard {
    var relevant = std.ArrayList(Shard).init(allocator);

    for (shards) |shard| {
        // Check if query predicates match shard range
        if (shardMayContainData(query.predicates, shard.range)) {
            try relevant.append(shard);
        }
    }

    return relevant.items;
}
```

## Fault Tolerance

### Automatic Failover

```
Normal Operation:           After Leader Failure:

    Leader ──► Follower         New Leader ◄── Follower
       │           │                │              │
       ▼           ▼                ▼              ▼
    Follower   Follower         Follower      Follower
```

### Read Replicas

Configure read scaling with replicas:

```yaml
replication:
  factor: 3                    # Total copies
  read_quorum: 1               # Reads from any replica
  write_quorum: 2              # Writes need majority
  sync_replicas: 1             # Synchronous replicas
  async_replicas: 1            # Asynchronous replicas
```

### Failure Detection

```zig
pub const FailureDetector = struct {
    heartbeat_interval: u64,
    failure_threshold: u32,
    missed_beats: std.AutoHashMap(NodeId, u32),

    pub fn checkNode(self: *FailureDetector, node_id: NodeId) NodeStatus {
        const missed = self.missed_beats.get(node_id) orelse 0;
        if (missed >= self.failure_threshold) {
            return .Failed;
        }
        return .Healthy;
    }
};
```

## Distributed Transactions

### Two-Phase Commit (2PC)

```
┌─────────────────────────────────────────────────────────┐
│                    2PC Protocol                          │
│                                                          │
│  Phase 1: Prepare                                        │
│  Coordinator ──► Prepare ──► Participants               │
│              ◄── Vote ◄──                               │
│                                                          │
│  Phase 2: Commit/Abort                                   │
│  Coordinator ──► Commit/Abort ──► Participants          │
│              ◄── Ack ◄──                                │
└─────────────────────────────────────────────────────────┘
```

### Configuration

```yaml
transactions:
  distributed:
    protocol: "2pc"           # 2pc or saga
    timeout_ms: 30000         # Transaction timeout
    retry_count: 3            # Retries on failure
  isolation: "snapshot"       # snapshot or serializable
```

## Monitoring

### Cluster Health

```gql
-- View cluster status
CALL db.cluster.status()

-- View shard distribution
CALL db.cluster.shards()

-- View replication lag
CALL db.cluster.replicationLag()
```

### Metrics

| Metric | Description |
|--------|-------------|
| `cluster_nodes_total` | Total nodes in cluster |
| `cluster_leader_elections` | Leader election count |
| `replication_lag_ms` | Replication delay |
| `cross_shard_queries` | Multi-shard query count |

## Next Steps

- [Query Optimization](/docs/architecture/query-optimization/) - Distributed query planning
- [Security Architecture](/docs/architecture/security-architecture/) - Cluster security
- [Storage Engine](/docs/architecture/storage-engine/) - Data persistence layer
