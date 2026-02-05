---
title: "Change Data Capture (CDC)"
description: "Real-time change detection and streaming of database modifications in Geode graph database"
keywords: ["CDC", "change data capture", "change tracking", "event streaming", "database replication", "data synchronization", "real-time updates", "changelog"]
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Change Data Capture (CDC)

Change Data Capture (CDC) is a design pattern that identifies and captures changes made to data in a database and delivers those changes to downstream systems in real-time. Geode's CDC implementation enables applications to react to data modifications as they occur, powering use cases like real-time analytics, data synchronization, and event-driven architectures.

## Understanding CDC

### What is CDC?

CDC monitors database changes and publishes events for:

**Insert Events** - New nodes or edges created
**Update Events** - Property modifications
**Delete Events** - Nodes or edges removed
**Schema Events** - Structural changes to graphs

### Why Use CDC?

CDC enables powerful scenarios:

- **Real-Time Analytics** - Update dashboards instantly
- **Cache Invalidation** - Maintain cache consistency
- **Data Synchronization** - Replicate to other systems
- **Audit Trails** - Track all data modifications
- **Event-Driven Architecture** - Trigger business workflows

## Geode CDC Architecture

### Change Event Structure

Each change produces a detailed event:

```json
{
  "event_id": "evt_abc123",
  "timestamp": "2026-01-24T10:30:00Z",
  "graph": "social",
  "operation": "INSERT",
  "entity_type": "node",
  "entity_id": "person:123",
  "before": null,
  "after": {
    "labels": ["Person"],
    "properties": {
      "name": "Alice",
      "age": 25,
      "created": "2026-01-24T10:30:00Z"
    }
  },
  "transaction_id": "tx_xyz789",
  "user": "alice@example.com"
}
```

### Enabling CDC

Enable CDC for specific graphs or globally:

```gql
-- Enable CDC for entire graph
ALTER GRAPH social SET CDC ENABLED;

-- Enable CDC for specific labels
ALTER GRAPH social 
SET CDC ENABLED FOR LABELS (Person, Post);

-- Enable CDC for specific operations
ALTER GRAPH social
SET CDC ENABLED FOR OPERATIONS (INSERT, UPDATE);
```

### CDC Streams

Changes flow through named streams:

```gql
-- Create CDC stream
CREATE CDC STREAM user_changes
ON GRAPH social
FOR LABELS (Person)
WHERE operation IN ('INSERT', 'UPDATE')
OPTIONS (
    format: 'json',
    include_before: true,
    include_after: true,
    buffer_size: 10000
);
```

## Consuming Change Events

### Polling Consumer

Pull events on demand:

```gql
-- Read events from stream
SELECT * FROM CDC_STREAM('user_changes')
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp ASC
LIMIT 1000;
```

### Push Consumer

Subscribe for real-time delivery:

```python
from geode_client import Client

async def handle_change(event):
    print(f"Change detected: {event['operation']} on {event['entity_id']}")
    
    if event['operation'] == 'INSERT':
        # Handle new entity
        await process_new_entity(event['after'])
    elif event['operation'] == 'UPDATE':
        # Handle modification
        await process_update(event['before'], event['after'])
    elif event['operation'] == 'DELETE':
        # Handle deletion
        await process_deletion(event['before'])

async def main():
    client = Client(host="localhost", port=3141)
    last_seen = "1970-01-01T00:00:00Z"

    # Poll application-managed ChangeLog entries
    async with client.connection() as conn:
        while True:
            result, _ = await conn.query(
                """
                MATCH (e:ChangeLog)
                WHERE e.emitted_at > $since
                RETURN e.operation AS operation,
                       e.entity_id AS entity_id,
                       e.before AS before,
                       e.after AS after,
                       e.emitted_at AS emitted_at
                ORDER BY emitted_at
                """,
                {"since": last_seen},
            )

            for row in result.rows:
                event = {
                    "operation": row["operation"].raw_value,
                    "entity_id": row["entity_id"].raw_value,
                    "before": row["before"].raw_value,
                    "after": row["after"].raw_value,
                }
                await handle_change(event)
                last_seen = row["emitted_at"].raw_value
```

### Event Filtering

Filter events before delivery:

```gql
-- Only high-value users
CREATE CDC STREAM vip_users
ON GRAPH social
FOR LABELS (Person)
WHERE after.properties.lifetime_value > 10000;

-- Only specific property changes
CREATE CDC STREAM email_changes
ON GRAPH social
FOR LABELS (Person)
WHERE before.properties.email != after.properties.email;
```

## CDC Patterns

### Database Replication

Replicate changes to other databases:

```python
async def replicate_to_postgres(event):
    """Replicate Geode changes to PostgreSQL"""
    if event['operation'] == 'INSERT':
        await pg_conn.execute(
            "INSERT INTO users (id, name, age) VALUES ($1, $2, $3)",
            event['entity_id'],
            event['after']['properties']['name'],
            event['after']['properties']['age']
        )
    elif event['operation'] == 'UPDATE':
        await pg_conn.execute(
            "UPDATE users SET name = $2, age = $3 WHERE id = $1",
            event['entity_id'],
            event['after']['properties']['name'],
            event['after']['properties']['age']
        )
    elif event['operation'] == 'DELETE':
        await pg_conn.execute(
            "DELETE FROM users WHERE id = $1",
            event['entity_id']
        )

async def main():
    last_seen = "1970-01-01T00:00:00Z"
    async with client.connection() as conn:
        while True:
            result, _ = await conn.query(
                """
                MATCH (e:ChangeLog)
                WHERE e.emitted_at > $since
                RETURN e.operation AS operation,
                       e.entity_id AS entity_id,
                       e.after AS after,
                       e.emitted_at AS emitted_at
                ORDER BY emitted_at
                """,
                {"since": last_seen},
            )
            for row in result.rows:
                event = {
                    "operation": row["operation"].raw_value,
                    "entity_id": row["entity_id"].raw_value,
                    "after": row["after"].raw_value,
                }
                await replicate_to_postgres(event)
                last_seen = row["emitted_at"].raw_value
```

### Cache Invalidation

Keep caches synchronized:

```javascript
const redis = require('redis');
const { createClient } = require('@geodedb/client');
const cache = redis.createClient();

async function pollChanges() {
  const geode = await createClient('quic://localhost:3141');
  let lastSeen = '1970-01-01T00:00:00Z';

  while (true) {
    const rows = await geode.queryAll(
      `
      MATCH (e:ChangeLog)
      WHERE e.emitted_at > $since
      RETURN e.operation AS operation,
             e.entity_id AS entity_id,
             e.after AS after,
             e.emitted_at AS emitted_at
      ORDER BY emitted_at
      `,
      { params: { since: lastSeen } }
    );

    for (const row of rows) {
      const cacheKey = `user:${row.entity_id}`;
      if (row.operation === 'DELETE') {
        await cache.del(cacheKey);
      } else {
        await cache.setEx(cacheKey, 3600, JSON.stringify(row.after));
      }
      lastSeen = row.emitted_at;
    }
  }
}

pollChanges();
```

### Search Index Synchronization

Update search indexes in real-time:

```python
from elasticsearch import Elasticsearch

es = Elasticsearch(['localhost:9200'])

async def sync_to_elasticsearch(event):
    """Sync changes to Elasticsearch"""
    index = 'users'
    doc_id = event['entity_id']
    
    if event['operation'] == 'DELETE':
        es.delete(index=index, id=doc_id)
    else:
        doc = {
            'name': event['after']['properties']['name'],
            'age': event['after']['properties']['age'],
            'updated_at': event['timestamp']
        }
        es.index(index=index, id=doc_id, document=doc)

last_seen = "1970-01-01T00:00:00Z"
async with client.connection() as conn:
    while True:
        result, _ = await conn.query(
            """
            MATCH (e:ChangeLog)
            WHERE e.emitted_at > $since
            RETURN e.operation AS operation,
                   e.entity_id AS entity_id,
                   e.after AS after,
                   e.emitted_at AS emitted_at
            ORDER BY emitted_at
            """,
            {"since": last_seen},
        )
        for row in result.rows:
            event = {
                "operation": row["operation"].raw_value,
                "entity_id": row["entity_id"].raw_value,
                "after": row["after"].raw_value,
                "timestamp": row["emitted_at"].raw_value,
            }
            await sync_to_elasticsearch(event)
            last_seen = row["emitted_at"].raw_value
```

### Materialized View Updates

Maintain derived data:

```gql
-- Trigger to update materialized view
CREATE TRIGGER update_user_stats
ON CDC_STREAM user_changes
WHEN operation = 'INSERT'
EXECUTE GQL
  INSERT INTO stats (user_count, last_updated)
  VALUES ((SELECT COUNT(*) FROM Person), NOW())
  ON CONFLICT (id) DO UPDATE SET
    user_count = EXCLUDED.user_count,
    last_updated = EXCLUDED.last_updated;
```

## CDC Performance

### Event Batching

Process events in batches for efficiency:

```python
async def process_batch(events):
    """Process events in batches"""
    # Group by operation
    inserts = [e for e in events if e['operation'] == 'INSERT']
    updates = [e for e in events if e['operation'] == 'UPDATE']
    deletes = [e for e in events if e['operation'] == 'DELETE']
    
    # Batch insert
    if inserts:
        await batch_insert(inserts)
    
    # Batch update
    if updates:
        await batch_update(updates)
    
    # Batch delete
    if deletes:
        await batch_delete(deletes)

last_seen = "1970-01-01T00:00:00Z"
batch = []
async with client.connection() as conn:
    while True:
        result, _ = await conn.query(
            """
            MATCH (e:ChangeLog)
            WHERE e.emitted_at > $since
            RETURN e.operation AS operation,
                   e.entity_id AS entity_id,
                   e.after AS after,
                   e.emitted_at AS emitted_at
            ORDER BY emitted_at
            """,
            {"since": last_seen},
        )
        for row in result.rows:
            batch.append({
                "operation": row["operation"].raw_value,
                "entity_id": row["entity_id"].raw_value,
                "after": row["after"].raw_value,
            })
            last_seen = row["emitted_at"].raw_value

            if len(batch) >= 100:
                await process_batch(batch)
                batch = []
```

### Event Compression

Reduce bandwidth with compression:

```gql
-- Enable compression for CDC stream
ALTER CDC STREAM user_changes
SET OPTIONS (
    compression: 'gzip',
    compression_level: 6
);
```

### Checkpoint Management

Track processing progress:

```python
class CheckpointManager:
    def __init__(self, stream_name):
        self.stream_name = stream_name
        self.checkpoint = self.load_checkpoint()
    
    def load_checkpoint(self):
        # Load last processed event ID
        return redis.get(f"cdc:checkpoint:{self.stream_name}")
    
    def save_checkpoint(self, event_id):
        redis.set(f"cdc:checkpoint:{self.stream_name}", event_id)
    
    async def process_from_checkpoint(self):
        last_seen = self.checkpoint or "0"
        async with client.connection() as conn:
            while True:
                result, _ = await conn.query(
                    """
                    MATCH (e:ChangeLog)
                    WHERE e.event_id > $since
                    RETURN e.event_id AS event_id,
                           e.operation AS operation,
                           e.after AS after
                    ORDER BY e.event_id
                    """,
                    {"since": last_seen},
                )
                for row in result.rows:
                    event = {
                        "event_id": row["event_id"].raw_value,
                        "operation": row["operation"].raw_value,
                        "after": row["after"].raw_value,
                    }
                    await process_event(event)
                    self.save_checkpoint(event["event_id"])
                    last_seen = event["event_id"]
```

## CDC Reliability

### At-Least-Once Delivery

Events may be delivered multiple times:

```python
# Use idempotent operations
async def process_event_idempotent(event):
    # Check if already processed
    if await is_processed(event['event_id']):
        return
    
    # Process event
    await handle_event(event)
    
    # Mark as processed
    await mark_processed(event['event_id'])
```

### Exactly-Once Semantics

Achieve exactly-once with deduplication:

```python
async def process_with_dedup(event):
    async with db.connection() as tx:
        await tx.begin()
        # Check for duplicate
        if await tx.exists("SELECT 1 FROM processed WHERE event_id = $1", event['event_id']):
            return
        
        # Process event
        await handle_event(event, tx)
        
        # Record processing
        await tx.execute(
            "INSERT INTO processed (event_id, timestamp) VALUES ($1, $2)",
            event['event_id'],
            datetime.now()
        )
```

### Error Handling

Handle failures gracefully:

```python
async def robust_processor(event):
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            await process_event(event)
            return
        except TransientError as e:
            retry_count += 1
            await asyncio.sleep(2 ** retry_count)  # Exponential backoff
        except FatalError as e:
            # Send to dead letter queue
            await send_to_dlq(event, str(e))
            return
    
    # Max retries exceeded
    await send_to_dlq(event, "Max retries exceeded")
```

## Monitoring CDC

### Stream Metrics

Monitor CDC stream health:

```gql
-- Query CDC stream metrics
SELECT
    stream_name,
    events_published,
    events_consumed,
    lag_events,
    lag_seconds,
    last_event_timestamp
FROM SYSTEM.cdc_streams;
```

### Consumer Lag

Track consumer processing lag:

```gql
SELECT
    consumer_id,
    stream_name,
    last_processed_event,
    lag_events,
    throughput_events_per_sec
FROM SYSTEM.cdc_consumers
WHERE lag_events > 1000;
```

### Alerting

Set up alerts for CDC issues:

```yaml
alerts:
  - name: CDC lag too high
    condition: lag_events > 10000
    action: notify_oncall
    
  - name: CDC consumer offline
    condition: last_heartbeat < NOW() - INTERVAL '5 minutes'
    action: page_oncall
```

## Best Practices

### Event Design

Design events carefully:

- Include enough context to process independently
- Keep events immutable
- Use consistent event schemas
- Version event formats
- Include causality information

### Stream Management

Manage streams effectively:

- Use separate streams for different purposes
- Configure appropriate retention periods
- Monitor and scale stream capacity
- Implement backpressure handling

### Consumer Patterns

Implement robust consumers:

- Process events idempotently
- Implement error handling and retries
- Track and checkpoint progress
- Monitor consumer lag
- Scale consumers horizontally

## Advanced Features

### Change Event Enrichment

Add context to events:

```gql
-- Enrich events with related data
CREATE CDC STREAM enriched_posts
ON GRAPH social
FOR LABELS (Post)
WITH ENRICHMENT (
    SELECT p.*, u.name AS author_name
    FROM Post p
    JOIN Person u ON p.author_id = u.id
);
```

### Event Transformation

Transform events before delivery:

```gql
CREATE CDC STREAM transformed_users
ON GRAPH social
FOR LABELS (Person)
WITH TRANSFORMATION (
    SELECT
        entity_id,
        after.properties.name AS user_name,
        UPPER(after.properties.email) AS email_upper,
        after.properties.age AS age
);
```

### Multi-Graph CDC

Capture changes across multiple graphs:

```gql
CREATE CDC STREAM all_changes
ON GRAPHS (social, commerce, analytics)
FOR ALL LABELS;
```

## Related Topics

- [Event Streaming](/tags/streaming) - Event streaming architectures
- [Pub/Sub](/tags/pubsub) - Publish-subscribe messaging
- [Events](/tags/events) - Event-driven architecture
- [Replication](/tags/replication) - Data replication strategies

## Learn More

- [Change Data Capture Patterns](https://www.confluent.io/learn/change-data-capture/)
- [Debezium CDC Platform](https://debezium.io/)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
