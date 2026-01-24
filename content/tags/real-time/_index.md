---
title: "Real-Time Processing"
description: "Process graph data in real-time with Geode's low-latency query execution, change data capture, and streaming integrations. Learn to build responsive applications with millisecond query times."
keywords:
  - real-time processing
  - low latency
  - streaming
  - change data capture
  - CDC
  - event processing
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/real-time/"
    noindex: false
---

Real-time processing in Geode enables applications to query and analyze graph data with millisecond latency, react to data changes instantly, and maintain up-to-date materialized views. Geode's architecture is optimized for concurrent read/write workloads with predictable performance.

## What Is Real-Time Graph Processing?

Real-time graph processing involves executing queries, detecting patterns, and responding to graph changes with minimal delay. Geode achieves this through:

- Sub-millisecond query execution via optimized indexes
- Non-blocking MVCC for concurrent operations
- Change data capture (CDC) for event streaming
- Efficient incremental computation
- Low-latency QUIC protocol

## Low-Latency Query Execution

### Index-Optimized Lookups

Geode's indexes enable constant-time node and relationship lookups:

```gql
// Direct node lookup by indexed property (< 1ms typical)
MATCH (u:User {user_id: $user_id})
RETURN u;

// Indexed relationship traversal
MATCH (u:User {user_id: $user_id})-[:FOLLOWS]->(friend:User)
RETURN friend.user_id, friend.name;

// Range query on indexed property
MATCH (p:Product)
WHERE p.price BETWEEN 100 AND 500
  AND p.in_stock = true
RETURN p.product_id, p.name, p.price
ORDER BY p.price ASC
LIMIT 20;
```

### Query Performance Patterns

Optimize queries for real-time execution:

```gql
// BAD: Unbounded traversal
MATCH (start:Person {id: $id})-[:KNOWS*]-(connected)
RETURN connected;  // Can traverse millions of nodes

// GOOD: Bounded depth with early termination
MATCH path = (start:Person {id: $id})-[:KNOWS*1..3]-(connected)
WHERE connected.active = true
RETURN connected
LIMIT 100;  // Limit results for predictable latency

// GOOD: Use WHERE clauses to filter early
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.user_id = $user_id
  AND p.created_at > datetime().minusDays(30)
RETURN p;
```

### Prepared Statements

Reduce parsing overhead for frequently executed queries:

```python
# Python client example
from geode_client import Client

client = Client("geodedb://localhost:3141")

# Prepare query once
stmt = client.prepare("""
    MATCH (u:User {user_id: $user_id})-[:PURCHASED]->(p:Product)
    WHERE p.created_at > $since
    RETURN p.product_id, p.name, p.price
""")

# Execute multiple times with different parameters (faster)
for user_id in user_ids:
    results = stmt.execute({
        'user_id': user_id,
        'since': datetime.now() - timedelta(days=7)
    })
    process_results(results)
```

## Change Data Capture (CDC)

### Monitoring Graph Changes

Subscribe to data change events in real-time:

```gql
// Enable CDC on specific labels
CREATE CHANGE STREAM user_changes
FOR (u:User)
EMIT CREATED, UPDATED, DELETED;

CREATE CHANGE STREAM purchase_stream
FOR ()-[p:PURCHASED]->()
EMIT CREATED;

// Query change stream
POLL CHANGE STREAM user_changes
SINCE $last_sequence_number
LIMIT 100;
```

### Event Stream Processing

Process changes as they occur:

```python
# Python CDC consumer
from geode_client import Client
import asyncio

async def process_user_changes():
    client = await Client.connect("geodedb://localhost:3141")

    last_seq = 0
    while True:
        # Poll for changes
        changes = await client.poll_change_stream(
            'user_changes',
            since=last_seq,
            limit=100
        )

        for change in changes:
            if change['event_type'] == 'CREATED':
                await handle_new_user(change['after'])
            elif change['event_type'] == 'UPDATED':
                await handle_user_update(change['before'], change['after'])
            elif change['event_type'] == 'DELETED':
                await handle_user_deletion(change['before'])

            last_seq = change['sequence_number']

        if not changes:
            await asyncio.sleep(0.1)  # Poll interval

async def handle_new_user(user_data):
    # Send welcome email, update cache, etc.
    print(f"New user: {user_data['user_id']}")
```

### Materialized View Maintenance

Keep derived data up-to-date using CDC:

```gql
// Maintain user activity statistics in real-time
CREATE MATERIALIZED VIEW user_stats AS
SELECT u.user_id,
       COUNT(p) AS purchase_count,
       SUM(p.amount) AS total_spent,
       MAX(p.timestamp) AS last_purchase
FROM (u:User)-[p:PURCHASED]->()
GROUP BY u.user_id;

// Geode automatically updates view when purchases are inserted/deleted
INSERT (user:User {user_id: 'user_123'})
INSERT (product:Product {product_id: 'prod_456', price: 99.99})
INSERT (user)-[:PURCHASED {
  amount: 99.99,
  timestamp: datetime()
}]->(product);
// user_stats automatically reflects the new purchase
```

## Streaming Analytics

### Sliding Window Aggregations

Compute metrics over time windows:

```gql
// Count events in last 5 minutes
MATCH (e:Event)
WHERE e.timestamp > datetime().minusMinutes(5)
WITH COUNT(e) AS event_count_5min,
     COUNT(DISTINCT e.user_id) AS unique_users_5min
RETURN event_count_5min, unique_users_5min;

// Hourly breakdown for real-time dashboard
MATCH (e:Event)
WHERE e.timestamp > datetime().minusHours(24)
WITH date.truncate('hour', e.timestamp) AS hour,
     COUNT(e) AS event_count
ORDER BY hour DESC
RETURN hour, event_count;
```

### Session Detection

Identify user sessions in real-time:

```gql
// Detect session boundaries (30-minute inactivity threshold)
MATCH (u:User {user_id: $user_id})-[:PERFORMED]->(e:Event)
WHERE e.timestamp > datetime().minusHours(24)
WITH u, e
ORDER BY e.timestamp ASC

// Group events into sessions
WITH u, COLLECT(e) AS events
UNWIND RANGE(0, SIZE(events) - 1) AS i
WITH u, events[i] AS current_event,
     CASE
       WHEN i = 0 THEN true
       WHEN duration.between(events[i-1].timestamp, events[i].timestamp).minutes > 30
       THEN true
       ELSE false
     END AS is_session_start
WITH u, current_event,
     SUM(CASE WHEN is_session_start THEN 1 ELSE 0 END) OVER (
       ORDER BY current_event.timestamp
     ) AS session_id
RETURN session_id,
       MIN(current_event.timestamp) AS session_start,
       MAX(current_event.timestamp) AS session_end,
       COUNT(current_event) AS event_count;
```

## Concurrent Processing

### Non-Blocking Reads

Geode's MVCC ensures reads never block writes:

```gql
// Long-running analytical query doesn't block writes
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p.category AS category, COUNT(u) AS buyer_count
ORDER BY buyer_count DESC
RETURN category, buyer_count;

// Meanwhile, inserts proceed without waiting
INSERT (new_user:User {user_id: 'user_new'})
INSERT (product:Product {product_id: 'prod_new'})
INSERT (new_user)-[:PURCHASED {timestamp: datetime()}]->(product);
// Both queries execute concurrently
```

### Connection Pooling

Maximize throughput with connection pooling:

```go
// Go client with connection pooling
package main

import (
    "context"
    "log"
    "sync"
    "go.codepros.org/geode"
)

func main() {
    // Create connection pool
    db, err := geode.Open("geodedb://localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Configure pool
    db.SetMaxOpenConns(100)  // Max connections
    db.SetMaxIdleConns(10)   // Keep 10 idle connections ready

    // Execute queries concurrently
    var wg sync.WaitGroup
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func(userID string) {
            defer wg.Done()

            row := db.QueryRowContext(context.Background(),
                "MATCH (u:User {user_id: $user_id}) RETURN u",
                geode.Param("user_id", userID))

            // Process result...
        }(fmt.Sprintf("user_%d", i))
    }
    wg.Wait()
}
```

## Real-Time Recommendations

### Instant Personalization

Generate recommendations with low latency:

```gql
// Real-time product recommendations (< 10ms typical)
MATCH (u:User {user_id: $user_id})-[:PURCHASED|VIEWED]->(interacted:Product)
WITH u, interacted
ORDER BY interacted.last_interaction DESC
LIMIT 10  // Use recent interactions

// Find similar products
MATCH (interacted)-[:SIMILAR_TO {similarity_score > 0.7}]-(candidate:Product)
WHERE NOT (u)-[:PURCHASED]->(candidate)  // Not already purchased

// Score candidates
WITH candidate,
     COUNT(interacted) AS based_on_count,
     AVG(similarity_score) AS avg_similarity,
     candidate.popularity_score AS popularity
WITH candidate,
     (based_on_count * avg_similarity * 0.7 + popularity * 0.3) AS score
ORDER BY score DESC
LIMIT 20
RETURN candidate.product_id, candidate.name, score;
```

### Contextual Filtering

Apply real-time context to recommendations:

```gql
// Filter recommendations by user's current context
MATCH (u:User {user_id: $user_id})
WITH u, $current_location AS location, $time_of_day AS time_hour

// Get base recommendations
MATCH (u)-[:INTERESTED_IN]->(category:Category)
MATCH (category)<-[:IN_CATEGORY]-(p:Product)
WHERE NOT (u)-[:PURCHASED]->(p)

// Apply contextual filters
WITH p, location, time_hour
WHERE (
  // Location-based availability
  EXISTS((p)-[:AVAILABLE_IN]->(:Region {name: location}))
  AND
  // Time-appropriate products
  (time_hour BETWEEN 9 AND 21 OR p.available_24_7 = true)
  AND
  // In stock
  p.stock_quantity > 0
)
ORDER BY p.relevance_score DESC
LIMIT 10
RETURN p.product_id, p.name, p.price;
```

## Performance Monitoring

### Query Profiling

Analyze query performance in real-time:

```gql
// Profile query execution
PROFILE
MATCH (u:User {user_id: $user_id})-[:FOLLOWS*1..2]->(friend:User)
WHERE friend.active = true
RETURN friend.user_id, friend.name
LIMIT 50;

// Returns execution plan with timing:
// - Index seek: 0.2ms
// - Traversal: 1.5ms
// - Filter: 0.3ms
// - Total: 2.0ms
```

### Real-Time Metrics

Monitor system performance:

```gql
// Query current system metrics
SHOW DATABASE METRICS;
// Returns:
// - queries_per_second
// - avg_query_latency_ms
// - active_connections
// - cache_hit_rate
// - transaction_rate

// Track query statistics
SHOW QUERY STATISTICS
WHERE query_time > datetime().minusMinutes(5)
ORDER BY execution_time DESC
LIMIT 10;
```

## Best Practices

1. **Use Indexes**: Ensure all lookup properties are indexed for constant-time access
2. **Limit Result Sets**: Always use LIMIT to bound query execution time
3. **Bound Traversals**: Limit path depths to prevent runaway queries
4. **Prepare Statements**: Reuse prepared statements for frequently executed queries
5. **Connection Pooling**: Maintain a pool of connections for concurrent workloads
6. **Filter Early**: Apply WHERE clauses as early as possible in queries
7. **Monitor Latency**: Track p50, p95, p99 latency metrics for all query types
8. **Batch Updates**: Group related writes into transactions for better throughput
9. **Async Processing**: Use CDC for asynchronous downstream processing
10. **Cache Strategically**: Cache frequently accessed data at the application layer

## Integration with Geode Features

Real-time processing leverages:

- **MVCC**: Non-blocking concurrent reads and writes
- **QUIC Protocol**: Low-latency network transport with multiplexing
- **Indexes**: B-tree, HNSW vector, and full-text indexes for fast lookups
- **CDC**: Change streams for event-driven architectures
- **Prepared Statements**: Reduced parsing overhead for repeated queries
- **Telemetry**: Real-time performance metrics via Prometheus

Browse the tagged content below to discover documentation, tutorials, and guides for building real-time graph applications with Geode.
