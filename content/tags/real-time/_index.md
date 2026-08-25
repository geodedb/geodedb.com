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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

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
  AND p.created_at > datetime() - duration('P30D')
RETURN p;
```

### Prepared Statements

Reduce parsing overhead for frequently executed queries:

```python
# Python client example
from geode_client import Client

client = Client(host="localhost", port=3141)

async with client.connection() as conn:
    # Prepare query once
    stmt = await conn.prepare("""
        MATCH (u:User {user_id: $user_id})-[:PURCHASED]->(p:Product)
        WHERE p.created_at > $since
        RETURN p.product_id, p.name, p.price
    """)

    # Execute multiple times with different parameters (faster)
    for user_id in user_ids:
        results, _ = await stmt.execute({
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
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;

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
WHERE e.timestamp > datetime() - duration('PT5M')
WITH COUNT(e) AS event_count_5min,
     COUNT(DISTINCT e.user_id) AS unique_users_5min
RETURN event_count_5min, unique_users_5min;

// Hourly breakdown for real-time dashboard
MATCH (e:Event)
WHERE e.timestamp > datetime() - duration('PT24H')
WITH $bucket_start /* no date_trunc(): bucket at write time or compare an explicit range */ AS hour,
     COUNT(e) AS event_count
ORDER BY hour DESC
RETURN hour, event_count;
```

### Session Detection

Identify user sessions in real-time:

```gql
// Detect session boundaries (30-minute inactivity threshold)
MATCH (u:User {user_id: $user_id})-[:PERFORMED]->(e:Event)
WHERE e.timestamp > datetime() - duration('PT24H')
WITH u, e
ORDER BY e.timestamp ASC

// Group events into sessions
WITH u, COLLECT(e) AS events
UNWIND RANGE(0, SIZE(events) - 1) AS i
WITH u, events[i] AS current_event,
     CASE
       WHEN i = 0 THEN true
       WHEN (events[i].timestamp - events[i-1].timestamp).minutes > 30
       THEN true
       ELSE false
     END AS is_session_start
WITH u, current_event,
     SUM(CASE WHEN is_session_start THEN 1 ELSE 0 END) AS session_id
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
    "geodedb.com/geode"
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
WHERE query_time > datetime() - duration('PT5M')
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

## Real-Time Application Architecture

### Event-Driven Microservices

Build responsive systems with event-driven architecture:

```python
# Microservice reacting to graph changes in real-time
from geode_client import Client, ChangeStreamConsumer
import asyncio

class OrderProcessingService:
    def __init__(self, geode_client):
        self.client = geode_client
        self.consumer = ChangeStreamConsumer(client, 'order_stream')

    async def start(self):
        """Process order events in real-time"""
        async for change in self.consumer.stream():
            if change.event_type == 'CREATED':
                await self.process_new_order(change.after)
            elif change.event_type == 'UPDATED':
                await self.handle_order_update(change.before, change.after)

    async def process_new_order(self, order):
        """Handle new order with sub-10ms latency"""
        # Validate inventory (indexed lookup, <1ms)
        available, _ = await self.client.query("""
            MATCH (p:Product {id: $product_id})
            WHERE p.stock_quantity >= $quantity
            RETURN p.stock_quantity
        """, {"product_id": order['product_id'], "quantity": order['quantity']})

        if available:
            # Reserve inventory atomically
            await self.client.execute("""
                MATCH (p:Product {id: $product_id})
                SET p.stock_quantity = p.stock_quantity - $quantity
                CREATE (o:Order {id: $order_id, status: 'confirmed'})
                CREATE (o)-[:RESERVES]->(p)
            """, {
                "product_id": order['product_id'],
                "quantity": order['quantity'],
                "order_id": order['id']
            })

            # Trigger downstream services (payment, shipping)
            await self.notify_payment_service(order)
            await self.notify_fulfillment_service(order)
```

### Real-Time Dashboard Backend

Power live dashboards with streaming queries:

```python
from fastapi import FastAPI, WebSocket
from geode_client import Client

app = FastAPI()

@app.websocket("/ws/dashboard")
async def dashboard_stream(websocket: WebSocket):
    """Stream real-time metrics to dashboard"""
    await websocket.accept()

    client = await Client.connect("localhost:3141")

    try:
        while True:
            # Compute real-time metrics every second
            metrics = await asyncio.gather(
                # Active users (last 5 minutes)
                client.execute("""
                    MATCH (e:Event {type: 'user_active'})
                    WHERE e.timestamp > datetime().minusMinutes(5)
                    RETURN COUNT(DISTINCT e.user_id) AS active_users
                """),

                # Orders per minute
                client.execute("""
                    MATCH (o:Order)
                    WHERE o.created_at > datetime().minusMinutes(1)
                    RETURN COUNT(o) AS orders_per_minute
                """),

                # Revenue (last hour)
                client.execute("""
                    MATCH (o:Order {status: 'completed'})
                    WHERE o.completed_at > datetime().minusHours(1)
                    RETURN SUM(o.total) AS revenue_last_hour
                """),

                # Top products
                client.execute("""
                    MATCH (o:Order)-[:CONTAINS]->(p:Product)
                    WHERE o.created_at > datetime().minusHours(1)
                    RETURN p.name, COUNT(o) AS orders
                    ORDER BY orders DESC
                    LIMIT 5
                """)
            )

            # Send to WebSocket (< 20ms total latency)
            await websocket.send_json({
                "timestamp": datetime.now().isoformat(),
                "active_users": metrics[0].bindings[0]['active_users'],
                "orders_per_minute": metrics[1].bindings[0]['orders_per_minute'],
                "revenue_last_hour": metrics[2].bindings[0]['revenue_last_hour'],
                "top_products": metrics[3].bindings
            })

            await asyncio.sleep(1)  # Update every second

    finally:
        await client.close()
```

### Live Recommendation Engine

Generate personalized recommendations with <10ms latency:

```python
class RecommendationEngine:
    def __init__(self, client):
        self.client = client
        # Prepare frequently-used queries
        self.similar_products_stmt = None

    async def initialize(self):
        """Prepare statements for faster execution"""
        self.similar_products_stmt = await self.client.prepare("""
            MATCH (viewed:Product {id: $product_id})-[:SIMILAR_TO]-(similar:Product)
            WHERE similar.in_stock = true
              AND NOT EXISTS {
                  MATCH (u:User {id: $user_id})-[:PURCHASED]->(similar)
              }
            WITH similar,
                 similar.popularity_score AS popularity,
                 COUNT{(similar)<-[:PURCHASED]-(:User)} AS purchase_count
            RETURN similar.id AS product_id,
                   similar.name AS name,
                   similar.price AS price,
                   (popularity * 0.3 + purchase_count * 0.7) AS score
            ORDER BY score DESC
            LIMIT $limit
        """)

    async def get_recommendations(self, user_id, context):
        """Real-time recommendations with <5ms latency"""
        # Use prepared statement for hot path
        recommendations, _ = await self.similar_products_stmt.execute({
            "user_id": user_id,
            "product_id": context['current_product_id'],
            "limit": 20
        })

        # Apply real-time personalization filters
        filtered = await self._apply_user_preferences(
            user_id,
            recommendations.rows
        )

        return filtered

    async def _apply_user_preferences(self, user_id, candidates):
        """Filter by user preferences (cached, <1ms)"""
        # User preferences cached in-memory or Redis
        prefs = await self.get_user_preferences(user_id)

        return [
            rec for rec in candidates
            if rec['price'] <= prefs['max_price']
            and rec['category'] in prefs['preferred_categories']
        ]
```

## Real-Time Analytics Patterns

### Sliding Time Windows

Compute metrics over rolling time windows:

```python
async def compute_rolling_metrics():
    """Calculate metrics over sliding windows"""
    client = await Client.connect("localhost:3141")

    # 5-minute rolling average of response times
    result, _ = await client.query("""
        MATCH (req:Request)
        WHERE req.timestamp > datetime().minusMinutes(5)
        WITH req.timestamp AS ts, req.duration_ms AS duration
        ORDER BY ts
        WITH collect({ts: ts, duration: duration}) AS samples
        UNWIND range(0, SIZE(samples) - 1) AS i
        WITH samples[i].ts AS timestamp,
             [x IN samples[i..i+59] | x.duration] AS window
        RETURN timestamp,
               AVG(window) AS avg_response_time,
               PERCENTILE_CONT(window, 0.95) AS p95_response_time
    """)

    for row in result.bindings:
        print(f"{row['timestamp']}: avg={row['avg_response_time']}ms, "
              f"p95={row['p95_response_time']}ms")
```

### Real-Time Anomaly Detection

Detect anomalies as they occur:

```python
async def detect_anomalies():
    """Real-time anomaly detection on graph patterns"""
    client = await Client.connect("localhost:3141")

    # Detect unusual user behavior patterns
    anomalies, _ = await client.query("""
        MATCH (u:User)-[a:ACTION]->(resource)
        WHERE a.timestamp > datetime().minusMinutes(5)
        WITH u,
             COUNT(a) AS action_count,
             COUNT(DISTINCT resource) AS unique_resources,
             AVG(a.duration_ms) AS avg_duration
        WHERE action_count > 100  -- Unusually high activity
           OR unique_resources > 50  -- Accessing many resources
           OR avg_duration < 10  -- Suspiciously fast
        RETURN u.id,
               action_count,
               unique_resources,
               avg_duration,
               'potential_bot' AS anomaly_type
    """)

    for anomaly in anomalies.bindings:
        await alert_security_team(anomaly)
        await throttle_user(anomaly['u.id'])
```

### Stream Joins

Join real-time event streams with graph data:

```python
async def join_streams_with_graph():
    """Enrich event stream with graph context"""
    # Event stream from Kafka/Kinesis
    event_stream = KafkaConsumer('user-events')

    client = await Client.connect("localhost:3141")

    async for event in event_stream:
        # Enrich event with user graph context
        context, _ = await client.query("""
            MATCH (u:User {id: $user_id})
            OPTIONAL MATCH (u)-[:FRIEND]->(friend:User)
            OPTIONAL MATCH (u)-[:MEMBER_OF]->(group:Group)
            RETURN u.name, u.tier,
                   COUNT(friend) AS friend_count,
                   COLLECT(group.name) AS groups
        """, {"user_id": event['user_id']})

        enriched_event = {
            **event,
            "user_context": context.bindings[0]
        }

        # Forward to downstream processing
        await process_enriched_event(enriched_event)
```

## Optimization Techniques

### Index-Optimized Queries

Ensure queries use indexes for consistent low latency:

```gql
-- Create indexes on lookup properties
CREATE INDEX FOR (u:User) ON (u.id);
CREATE INDEX FOR (u:User) ON (u.email);
CREATE INDEX FOR (p:Product) ON (p.sku);
CREATE INDEX FOR (e:Event) ON (e.timestamp);

-- Compound index for multi-property lookups
CREATE INDEX FOR (o:Order) ON (o.user_id, o.status);

-- Verify index usage with EXPLAIN
EXPLAIN
MATCH (u:User {email: $email})
RETURN u;
-- Should show: IndexScan (user_email_idx)

-- Queries using indexes have predictable latency
MATCH (u:User {email: 'alice@example.com'})  -- <1ms
RETURN u;

MATCH (u:User {id: 12345})  -- <1ms
RETURN u;

MATCH (o:Order {user_id: 12345, status: 'pending'})  -- <2ms
RETURN o;
```

### Connection Pooling for High Throughput

Optimize connection management for concurrent workloads:

```python
from geode_client import ConnectionPool

# Configure pool for real-time workload
pool = ConnectionPool(
    host="localhost",
    port=3141,
    min_connections=20,      # Always ready
    max_connections=200,     # Scale under load
    connection_timeout=5,    # Fail fast
    idle_timeout=300,        # Reap idle connections
    health_check_interval=60 # Verify connection health
)

async def handle_request(user_id):
    """Process request with pooled connection"""
    async with pool.acquire() as client:
        # Connection acquired from pool (no handshake overhead)
        result, _ = await client.query("""
            MATCH (u:User {id: $user_id})-[:RECENT]->(items)
            RETURN items
            LIMIT 10
        """, {"user_id": user_id})
        return result.bindings

# Concurrent request handling
async def main():
    requests = [handle_request(i) for i in range(10000)]
    results = await asyncio.gather(*requests)
    # Pool manages connection allocation efficiently
```

### Query Result Caching

Cache frequently accessed data at application layer:

```python
import asyncio
from cachetools import TTLCache

class CachedClient:
    def __init__(self, client):
        self.client = client
        # TTL cache: 1000 entries, 60-second TTL
        self.cache = TTLCache(maxsize=1000, ttl=60)

    async def get_user(self, user_id):
        """Get user with caching"""
        cache_key = f"user:{user_id}"

        if cache_key in self.cache:
            return self.cache[cache_key]  # Cache hit (<0.1ms)

        # Cache miss - query database
        result, _ = await self.client.query("""
            MATCH (u:User {id: $id})
            RETURN u
        """, {"id": user_id})

        user = result.bindings[0] if result.bindings else None
        self.cache[cache_key] = user
        return user

    async def invalidate_user(self, user_id):
        """Invalidate cache on updates"""
        cache_key = f"user:{user_id}"
        self.cache.pop(cache_key, None)
```

## Production Deployment

### Load Balancing

Distribute real-time queries across replicas:

```python
from geode_client import LoadBalancedClient

# Connect to multiple Geode nodes
client = LoadBalancedClient(
    nodes=[
        "node1.example.com:3141",
        "node2.example.com:3141",
        "node3.example.com:3141"
    ],
    strategy="least_loaded",  # Route to least loaded node
    health_check_interval=30  # Check node health every 30s
)

# Queries automatically distributed
async def query_with_lb():
    # Routes to healthy, least-loaded node
    result, _ = await client.query("MATCH (u:User) RETURN count(u)")
```

### Monitoring Real-Time Performance

Track real-time query performance:

```python
from prometheus_client import Histogram, Counter

# Metrics
query_duration = Histogram('geode_query_duration_seconds',
                           'Query execution time')
query_errors = Counter('geode_query_errors_total',
                       'Total query errors')

async def execute_with_metrics(client, query, params):
    """Execute query with performance tracking"""
    with query_duration.time():
        try:
            result, _ = await client.query(query, params)
            return result
        except Exception as e:
            query_errors.inc()
            raise

# Grafana dashboard queries Prometheus metrics:
# - P50, P95, P99 latency
# - QPS (queries per second)
# - Error rate
```

Browse the tagged content below to discover documentation, tutorials, and guides for building real-time graph applications with Geode.
