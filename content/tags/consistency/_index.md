---
title: "Data Consistency Models"
description: "Comprehensive guide to data consistency models in Geode, including strong consistency, eventual consistency, causal consistency, and tunable consistency for distributed graph databases."
keywords:
  - data consistency
  - consistency models
  - strong consistency
  - eventual consistency
  - causal consistency
  - distributed systems
  - graph database
  - Geode consistency
  - ACID properties
  - linearizability
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/consistency/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Data Consistency Models

Data consistency is a fundamental concern in distributed graph databases, governing how and when changes become visible across multiple nodes. Geode provides flexible consistency models that allow you to balance between strong guarantees and high performance, depending on your application requirements. This comprehensive guide explores consistency theory, practical implementation strategies, and configuration options for building reliable distributed graph systems.

## Understanding Consistency

In distributed systems, consistency refers to the agreement of data across multiple replicas. When a write operation completes on one node, consistency models define when and how that change becomes visible to readers on other nodes. Different consistency models offer different trade-offs between availability, latency, and correctness guarantees.

For graph databases, consistency is particularly important because graph queries often traverse multiple relationships, and inconsistent views can lead to incomplete or incorrect query results. Geode's consistency mechanisms ensure that graph semantics are preserved even in distributed deployments.

## Consistency Models in Geode

### Strong Consistency (Linearizability)

Strong consistency provides the strongest guarantee: every read returns the most recent write, and all operations appear to occur atomically in a global order. This model is essential for applications requiring strict correctness guarantees.

**Use Cases**:
- Financial transactions and accounting systems
- Inventory management with stock tracking
- Audit logs and compliance systems
- Critical infrastructure control systems

**Configuration**:

```yaml
consistency:
  # Default consistency model
  default_model: "strong"

  # Strong consistency settings
  strong:
    # Use synchronous replication
    replication_mode: "synchronous"

    # Require acknowledgment from majority
    write_quorum: "majority"

    # Read from leader only
    read_from: "leader"

    # Timeout for consistency operations
    timeout_ms: 5000
```

**Example Usage**:

```gql
-- This query uses strong consistency by default
BEGIN TRANSACTION;

MATCH (account:Account {id: $from_id})
SET account.balance = account.balance - $amount;

MATCH (dest:Account {id: $to_id})
SET dest.balance = dest.balance + $amount;

CREATE (t:Transaction {
  id: $tx_id,
  amount: $amount,
  timestamp: current_timestamp()
})
CREATE (account)-[:SENT]->(t)
CREATE (t)-[:RECEIVED]->(dest);

COMMIT;
```

### Eventual Consistency

Eventual consistency guarantees that if no new updates are made, all replicas will eventually converge to the same state. This model provides high availability and performance at the cost of temporary inconsistencies.

**Use Cases**:
- Social media feeds and timelines
- Analytics and reporting systems
- Content delivery and caching
- Collaborative editing with conflict resolution

**Configuration**:

```yaml
consistency:
  default_model: "eventual"

  eventual:
    # Maximum staleness tolerance
    max_staleness_ms: 1000

    # Asynchronous replication
    replication_mode: "asynchronous"

    # Read from any replica
    read_from: "any"

    # Anti-entropy interval
    anti_entropy_interval_ms: 60000

    # Conflict resolution strategy
    conflict_resolution: "last_write_wins"
```

**Example Usage**:

```gql
-- Query with eventual consistency tolerance
MATCH (u:User)-[:FOLLOWS]->(f:User)-[:POSTED]->(p:Post)
WHERE u.id = $user_id
  AND p.created > current_timestamp() - INTERVAL '24' HOUR
RETURN p.id, p.content, p.created, f.name
ORDER BY p.created DESC
LIMIT 100
OPTION (consistency = 'eventual', max_staleness = '5s');
```

### Causal Consistency

Causal consistency ensures that causally related operations are seen in the same order by all nodes, while allowing concurrent operations to be seen in different orders. This model is ideal for maintaining meaningful ordering without sacrificing performance.

**Use Cases**:
- Comment threads and discussions
- Event sourcing systems
- Distributed workflow engines
- Real-time collaboration systems

**Configuration**:

```yaml
consistency:
  default_model: "causal"

  causal:
    # Track causality using vector clocks
    causality_tracking: "vector_clocks"

    # Session guarantees
    session_guarantees:
      read_your_writes: true
      monotonic_reads: true
      monotonic_writes: true
      writes_follow_reads: true

    # Maximum causality chain length
    max_chain_length: 1000
```

**Example Usage**:

```gql
-- Causal consistency for comment thread
BEGIN TRANSACTION WITH ISOLATION LEVEL CAUSAL;

-- Create parent comment
CREATE (parent:Comment {
  id: $parent_id,
  content: $parent_content,
  timestamp: current_timestamp()
});

-- Create reply (causally dependent on parent)
CREATE (reply:Comment {
  id: $reply_id,
  content: $reply_content,
  timestamp: current_timestamp()
})
CREATE (reply)-[:REPLY_TO]->(parent);

COMMIT;

-- All readers will see parent before reply
MATCH (parent:Comment)<-[:REPLY_TO]-(reply:Comment)
WHERE parent.id = $parent_id
RETURN parent, reply
OPTION (consistency = 'causal');
```

### Tunable Consistency

Tunable consistency allows per-operation control over consistency guarantees, enabling applications to optimize the consistency-performance trade-off for each operation.

**Configuration**:

```yaml
consistency:
  # Enable tunable consistency
  tunable: true

  # Define consistency levels
  levels:
    critical:
      write_quorum: "all"
      read_quorum: "quorum"
      timeout_ms: 10000

    standard:
      write_quorum: "quorum"
      read_quorum: "one"
      timeout_ms: 5000

    relaxed:
      write_quorum: "one"
      read_quorum: "one"
      timeout_ms: 1000
```

**Example Usage**:

```gql
-- Critical write with strong guarantees
CREATE (order:Order {id: $order_id, status: 'pending'})
OPTION (consistency_level = 'critical');

-- Standard read for display
MATCH (order:Order {id: $order_id})
RETURN order
OPTION (consistency_level = 'standard');

-- Relaxed read for analytics
MATCH (order:Order)
WHERE order.created > current_timestamp() - INTERVAL '1' DAY
RETURN COUNT(*) as daily_orders
OPTION (consistency_level = 'relaxed');
```

## Session Guarantees

Session guarantees provide consistency within a client session, ensuring predictable behavior across multiple operations.

### Read-Your-Writes

Guarantees that a client always sees its own writes:

```yaml
consistency:
  session_guarantees:
    read_your_writes:
      enabled: true
      # Track writes per session
      tracking: "session_based"
```

```gql
-- Write operation
CREATE (u:User {id: $user_id, name: $name})
OPTION (session_id = $session_id);

-- Immediate read sees the write
MATCH (u:User {id: $user_id})
RETURN u.name
OPTION (session_id = $session_id);
-- Always returns the created user
```

### Monotonic Reads

Ensures that successive reads return increasingly up-to-date data:

```yaml
consistency:
  session_guarantees:
    monotonic_reads:
      enabled: true
      # Use read timestamps
      mechanism: "read_timestamps"
```

### Monotonic Writes

Guarantees that writes from a session are applied in order:

```yaml
consistency:
  session_guarantees:
    monotonic_writes:
      enabled: true
      # Order writes per session
      ordering: "session_sequence"
```

## Consistency and Transactions

### ACID Properties

Geode transactions provide full ACID guarantees:

**Atomicity**: All operations in a transaction succeed or fail together.

**Consistency**: Transactions move the database from one valid state to another.

**Isolation**: Concurrent transactions don't interfere with each other.

**Durability**: Committed transactions are permanently stored.

```yaml
transactions:
  # Isolation levels
  isolation:
    default_level: "serializable"

    levels:
      - read_uncommitted
      - read_committed
      - repeatable_read
      - snapshot
      - serializable

  # Durability settings
  durability:
    # Sync to disk before commit
    fsync_mode: "always"

    # Write-ahead logging
    wal:
      enabled: true
      sync_mode: "synchronous"
```

### Transaction Isolation Levels

Configure isolation level for consistency guarantees:

```gql
-- Serializable isolation (strongest)
BEGIN TRANSACTION WITH ISOLATION LEVEL SERIALIZABLE;
MATCH (a:Account {id: $id})
SET a.balance = a.balance + $amount;
COMMIT;

-- Snapshot isolation (good performance)
BEGIN TRANSACTION WITH ISOLATION LEVEL SNAPSHOT;
MATCH (u:User)-[:FOLLOWS]->(f:User)
RETURN COUNT(DISTINCT f) as follower_count;
COMMIT;

-- Read committed (minimal locking)
BEGIN TRANSACTION WITH ISOLATION LEVEL READ COMMITTED;
MATCH (p:Product {id: $id})
RETURN p.price, p.inventory;
COMMIT;
```

## Quorum-Based Consistency

Geode uses quorum mechanisms to balance consistency and availability:

### Read and Write Quorums

```yaml
consistency:
  quorum:
    # Number of replicas
    replication_factor: 3

    # Write quorum (W)
    write_quorum: 2

    # Read quorum (R)
    read_quorum: 2

    # Ensure W + R > N for strong consistency
    validate_quorum: true
```

**Strong Consistency**: Set `W + R > N` where N is replication factor.

**High Availability**: Set `W + R ≤ N` for better availability.

### Quorum Configuration Examples

```yaml
# Strong consistency (W=3, R=1, N=3)
# All writes must succeed before acknowledgment
# Reads always return latest data
strong_consistency:
  replication_factor: 3
  write_quorum: 3
  read_quorum: 1

# Balanced (W=2, R=2, N=3)
# Tolerates one node failure
# Strong consistency with good performance
balanced:
  replication_factor: 3
  write_quorum: 2
  read_quorum: 2

# High availability (W=1, R=1, N=3)
# Tolerates two node failures
# Eventual consistency
high_availability:
  replication_factor: 3
  write_quorum: 1
  read_quorum: 1
```

## Conflict Resolution

When eventual consistency allows conflicts, Geode provides resolution strategies:

### Last-Write-Wins (LWW)

```yaml
consistency:
  conflict_resolution:
    strategy: "last_write_wins"

    # Use logical clocks for ordering
    timestamp_source: "hybrid_logical_clock"

    # Conflict detection window
    detection_window_ms: 1000
```

### Multi-Value Registers

Keep all conflicting values and let application resolve:

```yaml
consistency:
  conflict_resolution:
    strategy: "multi_value"

    # Maximum concurrent values to track
    max_values: 10

    # Expose conflicts to application
    expose_conflicts: true
```

### Custom Conflict Resolution

```yaml
consistency:
  conflict_resolution:
    strategy: "custom"

    # User-defined resolution function
    resolver: "merge_by_priority"

    # Conflict resolution metadata
    metadata_properties:
      - priority
      - source_node
      - timestamp
```

## Monitoring Consistency

### Consistency Metrics

Track consistency-related metrics:

```yaml
monitoring:
  consistency_metrics:
    enabled: true

    # Metrics to collect
    metrics:
      - replication_lag_ms
      - consistency_violations_total
      - quorum_failures_total
      - conflict_resolutions_total
      - stale_reads_total
      - transaction_aborts_by_isolation_level

  # Export to Prometheus
  prometheus:
    enabled: true
    port: 9090
```

Key metrics to monitor:

- `geode_replication_lag_ms`: Time lag between primary and replicas
- `geode_consistency_violations_total`: Detected consistency violations
- `geode_quorum_failures_total`: Failed quorum operations
- `geode_stale_reads_total`: Reads that returned stale data
- `geode_transaction_conflicts_total`: Transaction conflicts

### Consistency Verification

Verify consistency across replicas:

```bash
# Check replica consistency
geode consistency verify \
  --graph=production \
  --sample-rate=0.1 \
  --report=consistency-report.json

# Measure replication lag
geode consistency lag \
  --graph=production \
  --interval=10s

# Detect consistency violations
geode consistency detect-violations \
  --graph=production \
  --window=1h
```

## Best Practices

### Choosing Consistency Models

1. **Default to Strong Consistency**: Use strong consistency unless you have specific performance requirements and can tolerate stale reads.

2. **Use Eventual Consistency for Analytics**: Read-heavy analytical queries can often tolerate eventual consistency for better performance.

3. **Apply Causal Consistency for Ordering**: When operation ordering matters but strict consistency is not required, use causal consistency.

4. **Tune Per-Operation**: Use tunable consistency to optimize critical paths while relaxing guarantees for non-critical operations.

### Configuration Guidelines

- Start with strong consistency and relax only when necessary
- Monitor replication lag and set appropriate staleness thresholds
- Configure session guarantees for multi-operation workflows
- Use appropriate isolation levels for transaction workloads
- Set quorum values based on availability requirements

### Testing Consistency

```bash
# Inject delays to test eventual consistency
geode consistency test \
  --scenario=delayed_replication \
  --delay-ms=1000 \
  --duration=5m

# Simulate network partitions
geode consistency test \
  --scenario=network_partition \
  --partition-nodes=node1,node2

# Verify ACID properties
geode consistency test \
  --scenario=acid_compliance \
  --isolation-level=serializable
```

## Troubleshooting

### Common Consistency Issues

**Stale Reads**: Clients reading outdated data.

*Solution*: Increase read quorum, reduce staleness tolerance, or use strong consistency.

**Replication Lag**: Replicas falling behind primary.

*Solution*: Increase replication bandwidth, reduce write throughput, or add more replicas.

**Quorum Failures**: Unable to achieve quorum for operations.

*Solution*: Reduce quorum requirements, add more nodes, or investigate network issues.

**Transaction Conflicts**: High abort rates due to conflicts.

*Solution*: Reduce transaction scope, use optimistic locking, or adjust isolation level.

### Diagnostic Queries

```gql
-- Check replication status
CALL dbms.cluster.replication_status()
YIELD node_id, lag_ms, status;

-- View active transactions
CALL dbms.transactions.list()
YIELD transaction_id, isolation_level, start_time;

-- Check consistency configuration
CALL dbms.config.get('consistency.*')
YIELD key, value;
```

## CAP Theorem Considerations

In distributed systems, the CAP theorem states you can have at most two of:

- **Consistency**: All nodes see the same data
- **Availability**: All requests receive a response
- **Partition Tolerance**: System continues despite network partitions

Geode's consistency models map to CAP choices:

**Strong Consistency (CP)**: Prioritizes consistency and partition tolerance, may sacrifice availability during partitions.

**Eventual Consistency (AP)**: Prioritizes availability and partition tolerance, allows temporary inconsistencies.

**Tunable Consistency**: Allows per-operation trade-offs between CP and AP.

## Related Topics

- [Clustering](/tags/clustering/) - Database clustering and multi-node deployment
- [Replication](/tags/replication/) - Data replication strategies
- [Transactions](/tags/transactions/) - Transaction management and ACID properties
- [Distributed](/tags/distributed/) - Distributed systems architecture
- [Performance](/tags/performance/) - Performance optimization
- [High Availability](/tags/high-availability/) - Building resilient systems

## Further Reading

- [Consistency Models Guide](/docs/architecture/consistency/)
- [Transaction Isolation Levels](/docs/features/transactions/)
- [Replication and Consistency](/docs/architecture/replication/)
- [CAP Theorem and Trade-offs](/docs/concepts/cap-theorem/)
- [Conflict Resolution Strategies](/docs/features/conflict-resolution/)
- [Production Consistency Configuration](/docs/deployment/consistency-tuning/)
