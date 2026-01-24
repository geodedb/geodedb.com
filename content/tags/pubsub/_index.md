---
title: "Publish-Subscribe Messaging"
description: "Publish-subscribe messaging patterns for decoupled, event-driven communication in Geode"
keywords: ["pub/sub", "publish-subscribe", "messaging", "message broker", "topics", "channels", "event bus", "message queue"]
weight: 10
---

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

## Learn More

- [Pub/Sub Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/publisher-subscriber)
- [Google Cloud Pub/Sub](https://cloud.google.com/pubsub/docs)
- [Apache Kafka](https://kafka.apache.org/)
