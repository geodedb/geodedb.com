---
title: "Publish-Subscribe Messaging"
description: "Publish-subscribe messaging patterns for decoupled, event-driven communication in Geode"
keywords: ["pub/sub", "publish-subscribe", "messaging", "message broker", "topics", "channels", "event bus", "message queue"]
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Publish-Subscribe Messaging

Publish-Subscribe (Pub/Sub) is a messaging pattern where publishers send messages to topics without knowing who will receive them, and subscribers receive messages from topics they're interested in without knowing who sent them. This decoupling enables scalable, flexible, event-driven architectures.

## Pub/Sub Fundamentals

### Core Concepts

**Publishers** - Send messages to topics
**Subscribers** - Receive messages from topics
**Topics** - Named channels for message distribution
**Messages** - Data packets being exchanged

### Benefits

- **Decoupling** - Publishers and subscribers are independent
- **Scalability** - Add subscribers without affecting publishers
- **Flexibility** - Dynamic subscription management
- **Fan-Out** - One message reaches multiple subscribers

## Geode Pub/Sub

### Creating Topics

Define topics for message distribution:

```gql
-- Create topic for user events
CREATE TOPIC user_events
WITH OPTIONS (
    retention_period: '7 days',
    message_ttl: '24 hours',
    max_subscribers: 100
);

-- Create topic with message schema
CREATE TOPIC order_notifications
SCHEMA (
    order_id STRING,
    status STRING,
    timestamp TIMESTAMP,
    details MAP<STRING, ANY>
);
```

### Publishing Messages

Publish to topics:

```python
from geode_client import GeodeClient

async def publish_user_event(client, user_id, event_type):
    """Publish user event to topic"""
    message = {
        "user_id": user_id,
        "event_type": event_type,
        "timestamp": datetime.now().isoformat(),
        "metadata": {
            "source": "user-service",
            "version": "1.0"
        }
    }
    
    await client.publish("user_events", message)
    print(f"Published: {event_type} for user {user_id}")
```

### Subscribing to Topics

Subscribe to receive messages:

```python
async def subscribe_to_user_events(client):
    """Subscribe to user event topic"""
    async with client.subscribe("user_events") as subscription:
        async for message in subscription:
            await handle_user_event(message)

async def handle_user_event(message):
    """Process user event"""
    event_type = message["event_type"]
    user_id = message["user_id"]
    
    if event_type == "signup":
        await send_welcome_email(user_id)
    elif event_type == "purchase":
        await update_analytics(user_id, message)
    elif event_type == "churn":
        await trigger_retention_campaign(user_id)
```

## Messaging Patterns

### Fan-Out Pattern

One message to many subscribers:

```python
# Publisher
async def notify_all(client, notification):
    """Send notification to all subscribers"""
    await client.publish("notifications", {
        "title": notification.title,
        "body": notification.body,
        "priority": "high"
    })

# Multiple subscribers receive the same message
async def email_subscriber(client):
    async with client.subscribe("notifications") as sub:
        async for msg in sub:
            await send_email(msg)

async def sms_subscriber(client):
    async with client.subscribe("notifications") as sub:
        async for msg in sub:
            await send_sms(msg)

async def push_subscriber(client):
    async with client.subscribe("notifications") as sub:
        async for msg in sub:
            await send_push_notification(msg)
```

### Topic Filtering

Subscribe with filters:

```gql
-- Subscribe only to high-priority orders
SUBSCRIBE TO order_notifications
WHERE priority = 'high';

-- Subscribe to specific user's events
SUBSCRIBE TO user_events
WHERE user_id = 'user123';
```

```python
async def filtered_subscription(client):
    """Subscribe with filter"""
    async with client.subscribe(
        "order_notifications",
        filter="priority = 'high'"
    ) as subscription:
        async for message in subscription:
            await handle_urgent_order(message)
```

### Request-Reply Pattern

Implement RPC over pub/sub:

```python
import uuid

class RPCClient:
    def __init__(self, client):
        self.client = client
        self.pending_requests = {}
        self.reply_topic = f"replies_{uuid.uuid4()}"
        
    async def call(self, method, params, timeout=5.0):
        """Make RPC call"""
        request_id = str(uuid.uuid4())
        
        # Set up reply handler
        reply_future = asyncio.Future()
        self.pending_requests[request_id] = reply_future
        
        # Publish request
        await self.client.publish("rpc_requests", {
            "id": request_id,
            "method": method,
            "params": params,
            "reply_to": self.reply_topic
        })
        
        # Wait for reply
        try:
            result = await asyncio.wait_for(reply_future, timeout)
            return result
        finally:
            del self.pending_requests[request_id]
    
    async def listen_for_replies(self):
        """Listen for RPC replies"""
        async with self.client.subscribe(self.reply_topic) as sub:
            async for message in sub:
                request_id = message["request_id"]
                if request_id in self.pending_requests:
                    self.pending_requests[request_id].set_result(message["result"])
```

### Topic Hierarchies

Organize topics hierarchically:

```
users/
  users/created
  users/updated
  users/deleted
  users/verified

orders/
  orders/placed
  orders/shipped
  orders/delivered
  orders/canceled
```

```python
# Subscribe to all user events
async with client.subscribe("users/*") as sub:
    async for message in sub:
        handle_user_event(message)

# Subscribe to specific event type
async with client.subscribe("users/created") as sub:
    async for message in sub:
        handle_new_user(message)
```

## Message Delivery Guarantees

### At-Most-Once

Message delivered zero or one time:

```gql
CREATE TOPIC notifications
WITH DELIVERY at_most_once;
```

- Fastest performance
- No retries
- Suitable for non-critical notifications

### At-Least-Once

Message delivered one or more times:

```gql
CREATE TOPIC orders
WITH DELIVERY at_least_once;
```

- Messages may be duplicated
- Subscribers must be idempotent
- Suitable for most applications

### Exactly-Once

Message delivered exactly one time:

```gql
CREATE TOPIC transactions
WITH DELIVERY exactly_once;
```

- Highest latency
- No duplicates
- Suitable for financial transactions

## Advanced Features

### Message Priorities

Prioritize message delivery:

```python
# Publish with priority
await client.publish("tasks", {
    "task_id": "task123",
    "action": "process_payment"
}, priority="high")

# Subscribe to high-priority messages first
async with client.subscribe(
    "tasks",
    priority_order=True
) as sub:
    async for message in sub:
        await process_task(message)
```

### Message Expiration

Set message TTL:

```python
# Publish with TTL
await client.publish("flash_sales", {
    "sale_id": "sale123",
    "discount": 0.5
}, ttl_seconds=3600)  # Expire after 1 hour
```

### Dead Letter Queues

Handle failed messages:

```gql
CREATE TOPIC payment_processing
WITH OPTIONS (
    max_retries: 3,
    dead_letter_topic: 'payment_failures'
);
```

```python
async def process_failed_payments(client):
    """Handle messages that exceeded retry limit"""
    async with client.subscribe("payment_failures") as sub:
        async for failed_message in sub:
            await manual_review(failed_message)
            await notify_support(failed_message)
```

### Message Batching

Improve throughput with batching:

```python
async def batch_publisher(client):
    """Publish messages in batches"""
    messages = [
        {"user_id": f"user{i}", "action": "login"}
        for i in range(1000)
    ]
    
    # Batch publish
    await client.publish_batch("user_events", messages)
```

## Monitoring and Observability

### Topic Metrics

Monitor topic health:

```gql
SELECT
    topic_name,
    messages_published,
    messages_consumed,
    pending_messages,
    subscriber_count,
    publish_rate,
    consume_rate
FROM SYSTEM.topics
WHERE pending_messages > 10000;
```

### Subscriber Lag

Track consumer lag:

```gql
SELECT
    subscriber_id,
    topic_name,
    lag_messages,
    lag_seconds,
    last_message_time
FROM SYSTEM.subscribers
WHERE lag_messages > 1000;
```

## Best Practices

### Message Design

- Keep messages small and focused
- Include timestamp and metadata
- Version message schemas
- Make messages self-contained
- Use consistent naming conventions

### Subscription Management

- Clean up unused subscriptions
- Monitor subscriber lag
- Implement backpressure handling
- Use appropriate delivery guarantees
- Handle redelivery idempotently

### Error Handling

```python
async def robust_subscriber(client):
    """Handle errors gracefully"""
    while True:
        try:
            async with client.subscribe("events") as sub:
                async for message in sub:
                    try:
                        await process_message(message)
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")
                        await send_to_dlq(message, str(e))
        except ConnectionError:
            await asyncio.sleep(5)  # Reconnect delay
```

## Related Topics

- [Events](/tags/events) - Event-driven architecture
- [Streaming](/tags/streaming) - Event streaming
- [CDC](/tags/cdc) - Change data capture
- [WebSockets](/tags/websockets) - Real-time communication

## Production Patterns

### Multi-Region Pub/Sub

Distribute messages across geographic regions:

```yaml
topics:
  global_notifications:
    replicas:
      - region: us-east
        priority: primary
      - region: eu-west
        priority: secondary
      - region: ap-south
        priority: secondary
    replication: async
    message_routing: geo_nearest  # Route to nearest region
```

```python
# Publisher in US publishes to local topic
async with client.publish("global_notifications", message, region="us-east"):
    pass

# Subscribers in EU/AP receive via replication
async with client.subscribe("global_notifications", region="eu-west") as sub:
    async for msg in sub:
        # Receives messages from US with replication lag
        process_message(msg)
```

### Message Acknowledgment Strategies

Control message delivery and acknowledgment:

```python
async def manual_acknowledgment():
    """Fine-grained control over message acknowledgment"""
    async with client.subscribe("orders", auto_ack=False) as sub:
        async for message in sub:
            try:
                # Process message
                await process_order(message.data)

                # Explicitly acknowledge
                await message.ack()
                logger.info(f"Processed and acked: {message.id}")

            except ProcessingError as e:
                # Negative acknowledgment (requeue)
                await message.nack(requeue=True)
                logger.error(f"Failed to process {message.id}: {e}")

            except FatalError as e:
                # Dead letter (don't requeue)
                await message.nack(requeue=False)
                logger.critical(f"Fatal error on {message.id}: {e}")
```

### Consumer Groups

Load balance message processing across consumers:

```python
# Consumer group for parallel processing
async def consumer_group_worker(worker_id, group_id):
    """Worker in consumer group"""
    async with client.subscribe(
        "order_processing",
        consumer_group=group_id,  # Messages distributed across group
        consumer_id=worker_id
    ) as sub:
        async for message in sub:
            logger.info(f"Worker {worker_id} processing {message.id}")
            await process_order(message.data)
            await message.ack()

# Start multiple workers (messages distributed among them)
async def main():
    workers = [
        consumer_group_worker(f"worker-{i}", "order-processors")
        for i in range(10)  # 10 workers share the load
    ]
    await asyncio.gather(*workers)
```

### Ordered Message Processing

Maintain message ordering when required:

```python
# Publish with partition key (same key → same partition → ordered)
await client.publish("user_events", {
    "user_id": "user123",
    "action": "login",
    "timestamp": datetime.now()
}, partition_key="user123")  # All events for user123 ordered

# Subscribe with ordering guarantee
async with client.subscribe(
    "user_events",
    ordering=True,
    partition_key_filter="user123"  # Process only this user's events in order
) as sub:
    async for event in sub:
        # Events for user123 arrive in published order
        await process_user_event(event)
```

## Advanced Messaging Patterns

### Saga Pattern with Pub/Sub

Coordinate distributed transactions:

```python
class OrderSaga:
    """Distributed transaction using pub/sub"""

    def __init__(self, client):
        self.client = client

    async def start_order(self, order_data):
        """Initiate saga"""
        saga_id = str(uuid.uuid4())

        # Publish order created event
        await self.client.publish("saga_events", {
            "saga_id": saga_id,
            "type": "ORDER_CREATED",
            "data": order_data
        })

        return saga_id

    async def saga_orchestrator(self):
        """Orchestrate saga steps"""
        async with self.client.subscribe("saga_events") as sub:
            async for event in sub:
                saga_id = event.data['saga_id']
                event_type = event.data['type']

                if event_type == "ORDER_CREATED":
                    # Step 1: Reserve inventory
                    await self.reserve_inventory(saga_id, event.data['data'])

                elif event_type == "INVENTORY_RESERVED":
                    # Step 2: Process payment
                    await self.process_payment(saga_id, event.data['data'])

                elif event_type == "PAYMENT_PROCESSED":
                    # Step 3: Ship order
                    await self.ship_order(saga_id, event.data['data'])

                elif event_type == "SHIPPING_CONFIRMED":
                    # Saga complete
                    await self.complete_saga(saga_id)

                elif event_type.endswith("_FAILED"):
                    # Compensating actions
                    await self.rollback_saga(saga_id, event_type)

    async def reserve_inventory(self, saga_id, order):
        """Reserve inventory (Step 1)"""
        try:
            # Business logic
            result = await inventory_service.reserve(order['items'])

            # Publish success event
            await self.client.publish("saga_events", {
                "saga_id": saga_id,
                "type": "INVENTORY_RESERVED",
                "data": result
            })
        except Exception as e:
            # Publish failure event
            await self.client.publish("saga_events", {
                "saga_id": saga_id,
                "type": "INVENTORY_RESERVATION_FAILED",
                "error": str(e)
            })

    async def rollback_saga(self, saga_id, failed_step):
        """Compensating transactions"""
        if failed_step in ["PAYMENT_FAILED", "SHIPPING_FAILED"]:
            # Release inventory reservation
            await self.release_inventory(saga_id)

        if failed_step == "SHIPPING_FAILED":
            # Refund payment
            await self.refund_payment(saga_id)

        # Mark saga as rolled back
        await self.client.publish("saga_events", {
            "saga_id": saga_id,
            "type": "SAGA_ROLLED_BACK",
            "reason": failed_step
        })
```

### Event Sourcing

Store state as sequence of events:

```python
class EventSourcedEntity:
    """Entity rebuilt from event stream"""

    def __init__(self, entity_id, client):
        self.entity_id = entity_id
        self.client = client
        self.state = {}
        self.version = 0

    async def load(self):
        """Rebuild state from events"""
        # Subscribe to entity's event stream
        async with self.client.subscribe(
            f"entity_{self.entity_id}",
            from_beginning=True  # Replay all events
        ) as sub:
            async for event in sub:
                self.apply_event(event)
                self.version += 1

    def apply_event(self, event):
        """Apply event to state"""
        if event['type'] == 'ACCOUNT_CREATED':
            self.state['balance'] = event['initial_balance']
            self.state['created_at'] = event['timestamp']

        elif event['type'] == 'DEPOSIT':
            self.state['balance'] += event['amount']

        elif event['type'] == 'WITHDRAWAL':
            self.state['balance'] -= event['amount']

    async def deposit(self, amount):
        """Command: deposit money"""
        # Validate
        if amount <= 0:
            raise ValueError("Amount must be positive")

        # Publish event
        await self.client.publish(f"entity_{self.entity_id}", {
            "type": "DEPOSIT",
            "amount": amount,
            "timestamp": datetime.now(),
            "version": self.version + 1
        })

        # Apply to local state
        self.state['balance'] += amount
        self.version += 1
```

### CQRS with Pub/Sub

Separate read and write models:

```python
# Write side: publish events
async def create_user(user_data):
    """Command: create user (write model)"""
    user_id = str(uuid.uuid4())

    # Store in write database
    async with geode_client.transaction():
        await geode_client.execute("""
            CREATE (u:User {id: $id, email: $email, created_at: datetime()})
        """, {"id": user_id, "email": user_data['email']})

    # Publish event
    await pubsub_client.publish("user_events", {
        "type": "USER_CREATED",
        "user_id": user_id,
        "data": user_data
    })

    return user_id

# Read side: consume events and update read model
async def user_projection_updater():
    """Update read-optimized view"""
    async with pubsub_client.subscribe("user_events") as sub:
        async for event in sub:
            if event['type'] == 'USER_CREATED':
                # Update read database (denormalized for fast queries)
                await redis.hset(
                    f"user:{event['user_id']}",
                    mapping={
                        "email": event['data']['email'],
                        "created_at": event['data']['created_at']
                    }
                )

            elif event['type'] == 'USER_UPDATED':
                # Update read model
                await redis.hset(
                    f"user:{event['user_id']}",
                    mapping=event['data']
                )

# Read from read model (fast)
async def get_user(user_id):
    """Query: get user (read model)"""
    return await redis.hgetall(f"user:{user_id}")
```

## Performance Tuning

### Batch Publishing

Improve throughput with batching:

```python
async def batch_publish_example():
    """Publish messages in batches"""
    messages = [
        {"user_id": i, "action": "click", "timestamp": datetime.now()}
        for i in range(10000)
    ]

    # Batch publish (100x faster than individual publishes)
    await client.publish_batch("user_actions", messages, batch_size=100)
    # Publishes 100 messages per network round-trip
```

### Message Compression

Reduce network bandwidth:

```python
# Enable compression for large messages
await client.publish(
    "analytics_data",
    large_payload,
    compression="lz4"  # Fast compression algorithm
)

# Compression reduces bandwidth by 70-90% for JSON payloads
```

### Topic Sharding

Scale topics horizontally:

```yaml
# Shard topic across multiple partitions
topics:
  high_volume_events:
    partitions: 64  # 64 shards for parallel processing
    partition_key: user_id  # Partition by user ID
```

```python
# Messages automatically sharded by partition key
await client.publish(
    "high_volume_events",
    message,
    partition_key=user_id  # Determines which partition
)

# Subscribers process partitions in parallel
async def consume_partition(partition_id):
    async with client.subscribe(
        "high_volume_events",
        partition=partition_id
    ) as sub:
        async for msg in sub:
            await process_message(msg)

# 64 workers, each processing one partition
workers = [consume_partition(i) for i in range(64)]
await asyncio.gather(*workers)
```

## Monitoring and Operations

### Message Flow Metrics

Track message flow through system:

```python
from prometheus_client import Counter, Histogram

messages_published = Counter(
    'pubsub_messages_published_total',
    'Total messages published',
    ['topic']
)

messages_consumed = Counter(
    'pubsub_messages_consumed_total',
    'Total messages consumed',
    ['topic', 'consumer_group']
)

message_latency = Histogram(
    'pubsub_message_latency_seconds',
    'Message end-to-end latency',
    ['topic']
)

async def publish_with_metrics(topic, message):
    """Publish with metrics tracking"""
    start_time = time.time()
    message['_published_at'] = start_time

    await client.publish(topic, message)

    messages_published.labels(topic=topic).inc()

async def consume_with_metrics(topic, consumer_group):
    """Consume with metrics tracking"""
    async with client.subscribe(topic, consumer_group=consumer_group) as sub:
        async for msg in sub:
            # Track latency
            latency = time.time() - msg.data['_published_at']
            message_latency.labels(topic=topic).observe(latency)

            # Process
            await process_message(msg)

            messages_consumed.labels(
                topic=topic,
                consumer_group=consumer_group
            ).inc()
```

### Health Checks

Monitor pub/sub system health:

```python
async def health_check():
    """Check pub/sub system health"""
    # Check topic lag
    lag = await client.get_consumer_lag("critical_events", "processors")
    if lag > 10000:
        alert("High consumer lag: {}".format(lag))

    # Check error rates
    error_rate = await client.get_error_rate("critical_events")
    if error_rate > 0.01:  # >1% error rate
        alert("High error rate: {:.2%}".format(error_rate))

    # Check throughput
    throughput = await client.get_throughput("critical_events")
    if throughput < 100:  # <100 msgs/sec
        alert("Low throughput: {} msgs/sec".format(throughput))
```

## Learn More

- [Pub/Sub Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/publisher-subscriber)
- [Google Cloud Pub/Sub](https://cloud.google.com/pubsub/docs)
- [Apache Kafka](https://kafka.apache.org/)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
