---
title: "Tag: Change Data Capture (CDC)"
description: "Explore Geode's Change Data Capture capabilities for real-time data synchronization, event streaming, and building reactive applications with graph database changes."
keywords:
  - CDC
  - change data capture
  - event streaming
  - real-time sync
  - data replication
  - audit log
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/cdc/"
    noindex: false
---

Geode documentation tagged with **Change Data Capture (CDC)**. CDC enables real-time tracking of all data modifications in your graph database, providing a foundation for event-driven architectures, data synchronization, and audit compliance.

## Introduction to Change Data Capture

Change Data Capture (CDC) is a design pattern that identifies and captures changes made to data in a database, making those changes available for downstream consumption. In the context of graph databases like Geode, CDC tracks insertions, updates, and deletions of nodes, relationships, and properties, emitting a stream of change events that applications can subscribe to and process.

CDC transforms your database from a passive data store into an active participant in event-driven architectures. Rather than polling for changes or building custom triggers, CDC provides a standardized, performant mechanism for reacting to data modifications in real-time. This is particularly valuable in graph databases where relationships and network effects mean that a single change can have cascading implications across the graph.

Geode's CDC implementation leverages the Write-Ahead Log (WAL) to capture changes with minimal performance overhead. By reading from the WAL rather than intercepting write operations, CDC in Geode achieves high throughput while maintaining ACID guarantees. The CDC stream is strongly consistent—events appear in the exact order that transactions committed, ensuring downstream systems can maintain correct derived state.

## Key Concepts

### Change Events

Every modification in Geode generates a change event containing:

- **Event Type**: INSERT, UPDATE, DELETE, or RELATIONSHIP_CREATE/DELETE
- **Entity Identifier**: Node ID or relationship ID
- **Before State**: Previous property values (for UPDATE and DELETE)
- **After State**: New property values (for INSERT and UPDATE)
- **Transaction ID**: Unique identifier linking related changes
- **Timestamp**: Commit time with microsecond precision
- **Labels/Types**: Node labels or relationship types affected

### Event Ordering Guarantees

Geode's CDC provides several ordering guarantees:

- **Per-entity ordering**: Changes to the same node or relationship appear in commit order
- **Transaction boundaries**: All changes within a transaction are grouped together
- **Causality preservation**: If transaction B reads data written by transaction A, B's events appear after A's
- **Snapshot consistency**: Events reflect a consistent snapshot at commit time

### Filtering and Subscriptions

CDC subscriptions can be filtered by:

- **Labels**: Only track changes to specific node labels
- **Relationship types**: Monitor specific edge types
- **Properties**: Filter events based on property names or value predicates
- **Event types**: Subscribe only to INSERT, UPDATE, or DELETE operations

### Consumer Patterns

Common CDC consumption patterns include:

- **Stream Processing**: Process events in real-time using streaming frameworks
- **Materialized Views**: Build denormalized views for fast queries
- **Cache Invalidation**: Keep application caches synchronized
- **Search Indexing**: Update full-text search indexes in real-time
- **Audit Logging**: Maintain compliance records of all changes
- **Data Replication**: Synchronize to other databases or data warehouses

## How CDC Works in Geode

### WAL-Based Architecture

Geode's CDC implementation reads from the Write-Ahead Log, the same durable log that ensures ACID compliance. When a transaction commits:

1. Changes are written to the WAL for durability
2. The WAL entry is assigned a monotonically increasing Log Sequence Number (LSN)
3. CDC consumers read WAL entries starting from their last processed LSN
4. Events are deserialized into structured change records
5. Filters are applied to match subscription criteria
6. Matching events are delivered to consumers

This architecture provides several advantages:

- **Zero-Copy**: CDC reads from the same WAL used for recovery
- **Low Overhead**: No additional write path instrumentation
- **Durability**: CDC events are guaranteed durable before delivery
- **Replay Capability**: Consumers can rewind to any historical LSN

### Event Stream Format

CDC events use a structured JSON format:

```json
{
  "lsn": "0000000001A2F3B4",
  "txn_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-01-24T15:30:45.123456Z",
  "event_type": "NODE_UPDATE",
  "entity_id": "node:12345",
  "labels": ["Person"],
  "before": {
    "name": "Alice Smith",
    "age": 30,
    "city": "Seattle"
  },
  "after": {
    "name": "Alice Johnson",
    "age": 31,
    "city": "Seattle"
  },
  "changed_properties": ["name", "age"]
}
```

### Checkpoint Management

CDC consumers maintain checkpoints to track processing progress:

- **LSN Tracking**: Each consumer records the last successfully processed LSN
- **Crash Recovery**: On restart, consumers resume from their last checkpoint
- **Exactly-Once Semantics**: Combined with transactional consumers, achieves exactly-once processing
- **Consumer Groups**: Multiple consumers can share work using consumer group coordination

## Use Cases

### Real-Time Recommendation Updates

```python
import geode_client

async def update_recommendations(event):
    """Update recommendation cache when user behavior changes."""
    if event['event_type'] == 'RELATIONSHIP_CREATE':
        if event['relationship_type'] == 'PURCHASED':
            user_id = event['source_id']
            product_id = event['target_id']

            # Recalculate recommendations for this user
            recommendations = await compute_recommendations(user_id)
            await cache.set(f"recs:{user_id}", recommendations)

async def consume_cdc_stream():
    async with geode_client.CDCConsumer(
        labels=['User', 'Product'],
        relationship_types=['PURCHASED', 'VIEWED']
    ) as consumer:
        async for event in consumer:
            await update_recommendations(event)
```

### Audit Trail for Compliance

```python
async def audit_logger(event):
    """Maintain immutable audit log for regulatory compliance."""
    audit_entry = {
        'timestamp': event['timestamp'],
        'transaction_id': event['txn_id'],
        'user': event.get('metadata', {}).get('user_id'),
        'operation': event['event_type'],
        'entity': event['entity_id'],
        'before': event.get('before'),
        'after': event.get('after')
    }

    # Write to append-only audit storage
    await audit_store.append(audit_entry)

async def run_audit_logger():
    async with geode_client.CDCConsumer(
        labels=['SensitiveData'],
        consumer_group='audit-logger'
    ) as consumer:
        async for event in consumer:
            await audit_logger(event)
            await consumer.commit()  # Checkpoint progress
```

### Search Index Synchronization

```python
from elasticsearch import AsyncElasticsearch

async def sync_to_elasticsearch(event):
    """Keep Elasticsearch index synchronized with Geode."""
    es = AsyncElasticsearch(['http://localhost:9200'])

    if event['event_type'] == 'NODE_INSERT':
        await es.index(
            index='geode_nodes',
            id=event['entity_id'],
            document=event['after']
        )
    elif event['event_type'] == 'NODE_UPDATE':
        await es.update(
            index='geode_nodes',
            id=event['entity_id'],
            doc=event['after']
        )
    elif event['event_type'] == 'NODE_DELETE':
        await es.delete(
            index='geode_nodes',
            id=event['entity_id']
        )

async def run_search_sync():
    async with geode_client.CDCConsumer(
        labels=['Document', 'Article'],
        consumer_group='search-indexer'
    ) as consumer:
        async for event in consumer:
            await sync_to_elasticsearch(event)
            await consumer.commit()
```

### Cache Invalidation

```python
import redis.asyncio as redis

async def invalidate_cache(event):
    """Invalidate cached queries when data changes."""
    r = await redis.from_url('redis://localhost')

    # Invalidate all queries involving this entity
    entity_id = event['entity_id']
    cache_keys = await r.keys(f"query:*:{entity_id}:*")

    if cache_keys:
        await r.delete(*cache_keys)
        print(f"Invalidated {len(cache_keys)} cache entries")

async def run_cache_invalidator():
    async with geode_client.CDCConsumer() as consumer:
        async for event in consumer:
            await invalidate_cache(event)
```

## Best Practices

### Consumer Design

1. **Idempotency**: Design consumers to handle duplicate events safely
2. **Error Handling**: Implement retry logic with exponential backoff
3. **Checkpointing**: Commit checkpoints frequently to limit reprocessing
4. **Batch Processing**: Process events in batches for better throughput

### Performance Optimization

1. **Filter Early**: Use subscription filters to reduce event volume
2. **Parallel Processing**: Use consumer groups to distribute load
3. **Async I/O**: Leverage async operations for downstream writes
4. **Buffer Management**: Configure appropriate buffer sizes for your workload

### Operational Considerations

1. **Monitor Lag**: Track consumer lag (current LSN - checkpoint LSN)
2. **Alerting**: Set up alerts for consumer failures or increasing lag
3. **Retention**: Configure WAL retention based on maximum expected consumer lag
4. **Testing**: Test consumer restart and crash recovery scenarios

### Security

1. **Authentication**: CDC consumers require authenticated database connections
2. **Authorization**: Row-Level Security policies apply to CDC events
3. **Encryption**: CDC streams use TLS 1.3 encryption
4. **Sensitive Data**: Consider filtering sensitive properties from CDC events

## Performance Considerations

### Throughput

Geode's CDC implementation can deliver high throughput:

- **Single Consumer**: 50,000-100,000 events/second per consumer
- **Multiple Consumers**: Linear scaling with consumer count
- **Batching**: Batch processing can achieve 200,000+ events/second
- **Network Overhead**: Local consumers have ~10% overhead vs remote

### Latency

Event delivery latency is typically very low:

- **Local Network**: <1ms from commit to consumer delivery
- **Remote Network**: <10ms over WAN with good connectivity
- **Buffering**: Larger buffers trade latency for throughput
- **Filtering**: Complex filters add minimal latency (<100μs)

### Resource Usage

CDC resource consumption is modest:

- **Memory**: ~50MB base + ~10KB per active consumer
- **CPU**: <5% CPU overhead on producer
- **Disk I/O**: Leverages existing WAL reads
- **Network**: Bandwidth proportional to event rate and payload size

## Troubleshooting

### Consumer Lag Increasing

**Symptom**: Consumer checkpoint falls behind current LSN

**Solutions**:
- Scale out with consumer groups
- Optimize event processing code
- Increase batch sizes
- Add more parallelism

### Missing Events

**Symptom**: Expected events not received

**Solutions**:
- Check subscription filters
- Verify consumer checkpoint position
- Confirm transaction committed successfully
- Review Row-Level Security policies

### Duplicate Events

**Symptom**: Same event received multiple times

**Solutions**:
- Implement idempotent event handlers
- Check checkpoint commit logic
- Verify exactly-once delivery configuration
- Review consumer restart behavior

## Related Topics

- [Write-Ahead Log (WAL)](/tags/wal/) - Underlying durability mechanism
- [Audit Logging](/tags/audit-logging/) - Compliance and security logging
- [Real-Time Analytics](/tags/real-time-analytics/) - Stream processing patterns
- [Event Streaming](/tags/event-streaming/) - Event-driven architectures
- [Transactions](/tags/transactions/) - Transaction boundaries in CDC
- [Row-Level Security](/tags/row-level-security/) - Security filtering for CDC

## Further Reading

- [CDC Configuration Guide](/docs/cdc-configuration/) - Setup and tuning
- [Stream Processing Patterns](/docs/stream-processing/) - Common architectures
- [Audit Compliance](/docs/audit-compliance/) - Meeting regulatory requirements
- [Performance Tuning](/docs/performance-tuning/) - Optimizing CDC throughput
