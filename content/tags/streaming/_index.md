---
title: "Event Streaming"
description: "Real-time event streaming architectures, stream processing, and event-driven patterns in Geode"
keywords: ["event streaming", "stream processing", "real-time events", "event-driven architecture", "Apache Kafka", "message streaming", "data pipelines", "event sourcing"]
weight: 10
---

# Event Streaming

Event streaming is a paradigm for capturing, storing, and processing continuous flows of events in real-time. Geode's event streaming capabilities enable building reactive, scalable applications that respond to changes as they happen, powering use cases from real-time analytics to complex event processing.

## Event Streaming Fundamentals

### What is Event Streaming?

Event streaming treats data as a continuous flow of events:

**Events** - Immutable facts about what happened
**Streams** - Ordered sequences of events
**Producers** - Systems that emit events
**Consumers** - Systems that process events

### Event Stream Characteristics

Key properties of event streams:

- **Ordered** - Events maintain temporal ordering
- **Immutable** - Events cannot be changed once written
- **Append-Only** - New events added to stream end
- **Retained** - Events stored for configurable duration
- **Replayable** - Consumers can replay historical events

## Geode Event Streaming

### Creating Event Streams

Define streams to capture graph events:

```gql
-- Create stream for user activities
CREATE STREAM user_activities AS
SELECT
    event_time,
    user_id,
    action_type,
    properties
FROM user_actions
EMIT CHANGES;

-- Create stream with windowing
CREATE STREAM page_views AS
SELECT
    TUMBLING_WINDOW(5 MINUTES) AS window,
    page_url,
    COUNT(*) AS view_count
FROM page_view_events
GROUP BY page_url
EMIT CHANGES;
```

### Publishing Events

Publish events to streams:

```python
from geode_client import GeodeClient

async def publish_user_action(client, user_id, action):
    """Publish user action event"""
    event = {
        "event_time": datetime.now().isoformat(),
        "user_id": user_id,
        "action_type": action,
        "properties": {
            "page": "/products",
            "duration_ms": 1500
        }
    }
    
    await client.publish_event("user_activities", event)
```

### Consuming Events

Subscribe to stream events:

```python
async def process_user_activities(client):
    """Process user activity stream"""
    async with client.subscribe_stream("user_activities") as stream:
        async for event in stream:
            print(f"User {event['user_id']} performed {event['action_type']}")
            
            # React to specific actions
            if event['action_type'] == 'purchase':
                await handle_purchase(event)
            elif event['action_type'] == 'signup':
                await send_welcome_email(event['user_id'])
```

## Stream Processing Patterns

### Filter Streams

Filter events based on criteria:

```gql
-- Stream of high-value purchases
CREATE STREAM high_value_purchases AS
SELECT *
FROM purchases
WHERE amount > 1000
EMIT CHANGES;
```

### Transform Streams

Transform event data:

```gql
-- Enrich events with user data
CREATE STREAM enriched_purchases AS
SELECT
    p.purchase_id,
    p.amount,
    u.name AS customer_name,
    u.tier AS customer_tier
FROM purchases p
JOIN users u ON p.user_id = u.id
EMIT CHANGES;
```

### Aggregate Streams

Compute aggregations over time:

```gql
-- Real-time revenue by product
CREATE STREAM revenue_by_product AS
SELECT
    product_id,
    SUM(amount) AS total_revenue,
    COUNT(*) AS purchase_count
FROM purchases
GROUP BY product_id
WINDOW TUMBLING (SIZE 1 HOUR)
EMIT CHANGES;
```

### Join Streams

Combine multiple streams:

```gql
-- Join page views with purchases
CREATE STREAM conversion_events AS
SELECT
    v.user_id,
    v.page_url,
    p.purchase_id,
    p.amount,
    (p.event_time - v.event_time) AS time_to_purchase
FROM page_views v
JOIN purchases p
    ON v.user_id = p.user_id
    WITHIN 1 HOUR
EMIT CHANGES;
```

## Windowing Operations

### Tumbling Windows

Fixed-size, non-overlapping windows:

```gql
-- Count events per 5-minute window
CREATE STREAM event_counts AS
SELECT
    TUMBLING_WINDOW(5 MINUTES) AS window,
    event_type,
    COUNT(*) AS count
FROM events
GROUP BY event_type
EMIT CHANGES;
```

Tumbling windows:
- Fixed size (e.g., 5 minutes)
- No overlap between windows
- Each event belongs to exactly one window

### Hopping Windows

Fixed-size windows with overlap:

```gql
-- Sliding 10-minute window, advancing every 1 minute
CREATE STREAM sliding_averages AS
SELECT
    HOPPING_WINDOW(SIZE 10 MINUTES, ADVANCE 1 MINUTE) AS window,
    AVG(response_time_ms) AS avg_response_time
FROM api_requests
EMIT CHANGES;
```

Hopping windows:
- Fixed size with configurable advance
- Windows overlap
- Each event may appear in multiple windows

### Session Windows

Dynamic windows based on inactivity:

```gql
-- User sessions (15 minute timeout)
CREATE STREAM user_sessions AS
SELECT
    SESSION_WINDOW(15 MINUTES) AS session,
    user_id,
    COUNT(*) AS actions_in_session,
    COLLECT_LIST(action_type) AS actions
FROM user_activities
GROUP BY user_id
EMIT CHANGES;
```

Session windows:
- Variable size based on activity
- Gap threshold defines session boundary
- Useful for user behavior analysis

## Stream Processing

### Stateless Processing

Process each event independently:

```python
async def stateless_processor(event):
    """Process event without state"""
    # Validate event
    if not validate_event(event):
        return
    
    # Transform event
    transformed = {
        "id": event['id'],
        "timestamp": event['timestamp'],
        "value": event['value'] * 1.5  # Apply transformation
    }
    
    # Publish to output stream
    await publish(transformed)
```

### Stateful Processing

Maintain state across events:

```python
class StatefulProcessor:
    def __init__(self):
        self.state = {}
    
    async def process(self, event):
        """Process event with state"""
        user_id = event['user_id']
        
        # Retrieve user state
        if user_id not in self.state:
            self.state[user_id] = {
                "total_purchases": 0,
                "total_spent": 0
            }
        
        # Update state
        self.state[user_id]["total_purchases"] += 1
        self.state[user_id]["total_spent"] += event['amount']
        
        # Check for milestone
        if self.state[user_id]["total_spent"] > 10000:
            await notify_vip_status(user_id)
```

### Complex Event Processing (CEP)

Detect patterns across multiple events:

```gql
-- Detect suspicious behavior pattern
CREATE STREAM suspicious_activity AS
SELECT
    user_id,
    COLLECT_LIST(action_type) AS pattern
FROM user_activities
MATCH_RECOGNIZE (
    PARTITION BY user_id
    ORDER BY event_time
    MEASURES
        FIRST(A.event_time) AS start_time,
        LAST(B.event_time) AS end_time
    PATTERN (A B+ C)
    DEFINE
        A AS A.action_type = 'login_failure',
        B AS B.action_type = 'login_failure',
        C AS C.action_type = 'login_success'
            AND C.ip_address != A.ip_address
)
EMIT CHANGES;
```

## Event Sourcing

### Event Store

Store all events as source of truth:

```gql
-- Event-sourced account balance
CREATE EVENT_STORE account_transactions (
    account_id STRING,
    event_type STRING,
    amount DECIMAL,
    balance DECIMAL,
    event_time TIMESTAMP
) PARTITION BY account_id;

-- Publish transaction events
INSERT INTO account_transactions
VALUES (
    'acct123',
    'deposit',
    500.00,
    1500.00,
    NOW()
);
```

### Event Replay

Rebuild state from events:

```python
async def rebuild_account_state(account_id):
    """Rebuild account state from events"""
    balance = 0
    
    # Replay all events
    events = await client.query(
        "SELECT * FROM account_transactions WHERE account_id = $1 ORDER BY event_time",
        [account_id]
    )
    
    for event in events:
        if event['event_type'] == 'deposit':
            balance += event['amount']
        elif event['event_type'] == 'withdrawal':
            balance -= event['amount']
    
    return balance
```

### Snapshots

Optimize replay with periodic snapshots:

```gql
-- Create snapshot table
CREATE TABLE account_snapshots (
    account_id STRING PRIMARY KEY,
    balance DECIMAL,
    snapshot_time TIMESTAMP,
    last_event_id STRING
);

-- Periodically save snapshots
INSERT INTO account_snapshots
SELECT
    account_id,
    SUM(CASE 
        WHEN event_type = 'deposit' THEN amount
        WHEN event_type = 'withdrawal' THEN -amount
    END) AS balance,
    NOW() AS snapshot_time,
    MAX(event_id) AS last_event_id
FROM account_transactions
GROUP BY account_id;
```

## Stream Integration

### Kafka Integration

Integrate with Apache Kafka:

```python
from kafka import KafkaProducer, KafkaConsumer

# Publish Geode events to Kafka
async def publish_to_kafka(geode_event):
    producer = KafkaProducer(
        bootstrap_servers=['localhost:9092'],
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    
    producer.send('user-activities', geode_event)
    producer.flush()

# Consume Kafka events to Geode
async def consume_from_kafka():
    consumer = KafkaConsumer(
        'user-activities',
        bootstrap_servers=['localhost:9092'],
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )
    
    for message in consumer:
        await geode_client.publish_event('user_activities', message.value)
```

### Pulsar Integration

Connect with Apache Pulsar:

```python
import pulsar

async def pulsar_to_geode():
    client = pulsar.Client('pulsar://localhost:6650')
    consumer = client.subscribe('user-events', 'geode-subscription')
    
    while True:
        msg = consumer.receive()
        try:
            event = json.loads(msg.data())
            await geode_client.publish_event('user_activities', event)
            consumer.acknowledge(msg)
        except Exception as e:
            consumer.negative_acknowledge(msg)
```

## Performance Optimization

### Batching

Improve throughput with batching:

```python
async def batch_processor(stream_name, batch_size=100):
    """Process events in batches"""
    batch = []
    
    async with client.subscribe_stream(stream_name) as stream:
        async for event in stream:
            batch.append(event)
            
            if len(batch) >= batch_size:
                await process_batch(batch)
                batch = []
```

### Parallel Processing

Scale with parallel consumers:

```python
import asyncio

async def parallel_consumer(stream_name, num_workers=4):
    """Process stream with multiple workers"""
    async def worker(worker_id, partition):
        async with client.subscribe_stream(
            stream_name,
            partition=partition
        ) as stream:
            async for event in stream:
                await process_event(event, worker_id)
    
    # Start workers for each partition
    tasks = [
        worker(i, i)
        for i in range(num_workers)
    ]
    
    await asyncio.gather(*tasks)
```

### Backpressure

Handle slow consumers:

```python
async def backpressure_handler(stream_name):
    """Handle backpressure gracefully"""
    buffer = asyncio.Queue(maxsize=1000)
    
    async def producer():
        async with client.subscribe_stream(stream_name) as stream:
            async for event in stream:
                await buffer.put(event)
    
    async def consumer():
        while True:
            event = await buffer.get()
            await process_event(event)
            buffer.task_done()
    
    await asyncio.gather(producer(), consumer())
```

## Monitoring Streams

### Stream Metrics

Track stream health:

```gql
SELECT
    stream_name,
    events_per_second,
    bytes_per_second,
    consumer_lag,
    oldest_event_age
FROM SYSTEM.streams
WHERE consumer_lag > 10000;
```

### Consumer Monitoring

Monitor consumer performance:

```gql
SELECT
    consumer_id,
    stream_name,
    throughput,
    error_rate,
    last_heartbeat
FROM SYSTEM.stream_consumers
WHERE error_rate > 0.01;
```

## Best Practices

### Event Design

- Use consistent event schemas
- Include sufficient context
- Version events for evolution
- Keep events immutable
- Use timestamps for ordering

### Stream Management

- Choose appropriate retention
- Partition for scalability
- Monitor and alert on lag
- Implement backpressure handling
- Test failure scenarios

### Processing Guarantees

- Implement idempotent processing
- Use checkpointing for progress
- Handle exactly-once semantics
- Design for eventual consistency
- Monitor processing lag

## Related Topics

- [CDC](/tags/cdc) - Change data capture
- [Pub/Sub](/tags/pubsub) - Publish-subscribe messaging
- [Events](/tags/events) - Event-driven architecture
- [Real-Time](/tags/real-time) - Real-time processing

## Learn More

- [The Log: What every software engineer should know](https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying)
- [Event Streaming Patterns](https://www.confluent.io/blog/event-streaming-platform-1)
- [Kafka: The Definitive Guide](https://www.confluent.io/resources/kafka-the-definitive-guide/)
