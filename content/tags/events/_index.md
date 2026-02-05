---
title: "Event-Driven Architecture"
description: "Building reactive, scalable systems with event-driven patterns and asynchronous messaging in Geode"
keywords: ["event-driven architecture", "EDA", "events", "event sourcing", "CQRS", "reactive systems", "asynchronous messaging", "event handlers"]
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Event-Driven Architecture

Event-Driven Architecture (EDA) is a software design pattern where the flow of the program is determined by events. Geode's support for event-driven patterns enables building reactive, scalable, and loosely coupled systems that respond to changes as they occur.

## Event-Driven Fundamentals

### What are Events?

Events represent facts about things that happened:

**State Change** - User updated profile
**Action Performed** - Order placed
**Time Elapsed** - Subscription expired
**Threshold Crossed** - Inventory below minimum

Events are:
- **Immutable** - Cannot be changed after creation
- **Timestamped** - When did it happen
- **Attributed** - Who/what caused it
- **Typed** - What kind of event

### Event-Driven vs Traditional

| Aspect | Traditional | Event-Driven |
|--------|------------|--------------|
| Coupling | Tight | Loose |
| Flow | Synchronous | Asynchronous |
| Scalability | Vertical | Horizontal |
| Responsiveness | Request-driven | Event-driven |
| Complexity | Linear | Distributed |

## Geode Event System

### Defining Event Handlers

Register handlers for graph events:

```gql
-- Handle user creation
CREATE EVENT HANDLER new_user_handler
ON INSERT Person
EXECUTE GQL
  INSERT (n:Notification {
    type: 'welcome',
    user_id: NEW.id,
    created: NOW()
  });

-- Handle relationship creation
CREATE EVENT HANDLER friendship_handler
ON INSERT FRIEND
EXECUTE GQL
  INSERT (e:Event {
    type: 'friendship_created',
    user1_id: NEW.from_id,
    user2_id: NEW.to_id,
    timestamp: NOW()
  });
```

### Event Processing

Process events asynchronously:

```python
from geode_client import Client

class EventProcessor:
    def __init__(self, client):
        self.client = client
        self.handlers = {}
    
    def register_handler(self, event_type, handler):
        '''Register event handler'''
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)
    
    async def process_events(self):
        '''Process events from stream'''
        async with self.client.subscribe_events() as stream:
            async for event in stream:
                await self.dispatch_event(event)
    
    async def dispatch_event(self, event):
        '''Dispatch event to handlers'''
        event_type = event['type']
        
        if event_type in self.handlers:
            for handler in self.handlers[event_type]:
                try:
                    await handler(event)
                except Exception as e:
                    await self.handle_error(event, e)

# Usage
processor = EventProcessor(client)
processor.register_handler('user.created', send_welcome_email)
processor.register_handler('user.created', create_default_preferences)
processor.register_handler('order.placed', process_payment)
await processor.process_events()
```

## Event Sourcing

### Event Store

Store all events as source of truth:

```gql
-- Create event store
CREATE EVENT_STORE account_events (
    aggregate_id STRING,
    event_type STRING,
    event_data MAP<STRING, ANY>,
    version INTEGER,
    timestamp TIMESTAMP
) PARTITION BY aggregate_id;

-- Append events
INSERT INTO account_events VALUES (
    'account:123',
    'AccountCreated',
    {'owner': 'alice', 'initial_balance': 1000},
    1,
    NOW()
);

INSERT INTO account_events VALUES (
    'account:123',
    'DepositMade',
    {'amount': 500, 'source': 'transfer'},
    2,
    NOW()
);
```

### Rebuilding State

Replay events to rebuild current state:

```python
class AccountProjection:
    def __init__(self, account_id):
        self.account_id = account_id
        self.balance = 0
        self.owner = None
        self.transactions = []
    
    async def rebuild(self, client):
        '''Rebuild state from events'''
        events = await client.query(
            "SELECT * FROM account_events WHERE aggregate_id = $1 ORDER BY version",
            [self.account_id]
        )
        
        for event in events:
            self.apply_event(event)
    
    def apply_event(self, event):
        '''Apply event to update state'''
        if event['event_type'] == 'AccountCreated':
            self.owner = event['event_data']['owner']
            self.balance = event['event_data']['initial_balance']
        
        elif event['event_type'] == 'DepositMade':
            self.balance += event['event_data']['amount']
            self.transactions.append({
                'type': 'deposit',
                'amount': event['event_data']['amount'],
                'timestamp': event['timestamp']
            })
        
        elif event['event_type'] == 'WithdrawalMade':
            self.balance -= event['event_data']['amount']
            self.transactions.append({
                'type': 'withdrawal',
                'amount': event['event_data']['amount'],
                'timestamp': event['timestamp']
            })
```

## CQRS Pattern

### Command Model

Handle writes (commands):

```python
class AccountCommandHandler:
    def __init__(self, client):
        self.client = client
    
    async def handle_create_account(self, command):
        '''Handle account creation command'''
        event = {
            'aggregate_id': command['account_id'],
            'event_type': 'AccountCreated',
            'event_data': {
                'owner': command['owner'],
                'initial_balance': command['initial_balance']
            },
            'version': 1,
            'timestamp': datetime.now()
        }
        
        await self.client.append_event('account_events', event)
        await self.publish_event(event)
    
    async def handle_deposit(self, command):
        '''Handle deposit command'''
        # Validate
        if command['amount'] <= 0:
            raise ValueError("Amount must be positive")
        
        # Get current version
        version = await self.get_current_version(command['account_id'])
        
        # Create event
        event = {
            'aggregate_id': command['account_id'],
            'event_type': 'DepositMade',
            'event_data': {
                'amount': command['amount'],
                'source': command.get('source', 'unknown')
            },
            'version': version + 1,
            'timestamp': datetime.now()
        }
        
        await self.client.append_event('account_events', event)
        await self.publish_event(event)
```

### Query Model

Handle reads (queries):

```python
class AccountQueryHandler:
    def __init__(self, client):
        self.client = client
        self.cache = {}
    
    async def get_account_balance(self, account_id):
        '''Query account balance'''
        if account_id in self.cache:
            return self.cache[account_id]['balance']
        
        # Rebuild from events
        projection = AccountProjection(account_id)
        await projection.rebuild(self.client)
        
        # Cache result
        self.cache[account_id] = {
            'balance': projection.balance,
            'owner': projection.owner
        }
        
        return projection.balance
    
    async def get_transaction_history(self, account_id, limit=100):
        '''Query transaction history'''
        events = await self.client.query(
            '''SELECT * FROM account_events 
               WHERE aggregate_id = $1 
               AND event_type IN ('DepositMade', 'WithdrawalMade')
               ORDER BY timestamp DESC
               LIMIT $2''',
            [account_id, limit]
        )
        
        return [
            {
                'type': event['event_type'],
                'amount': event['event_data']['amount'],
                'timestamp': event['timestamp']
            }
            for event in events
        ]
```

## Saga Pattern

Coordinate distributed transactions:

```python
class OrderSaga:
    def __init__(self, client):
        self.client = client
    
    async def execute(self, order_id):
        '''Execute order saga'''
        try:
            # Step 1: Reserve inventory
            await self.reserve_inventory(order_id)
            await self.publish_event('inventory_reserved', {'order_id': order_id})
            
            # Step 2: Process payment
            await self.process_payment(order_id)
            await self.publish_event('payment_processed', {'order_id': order_id})
            
            # Step 3: Ship order
            await self.ship_order(order_id)
            await self.publish_event('order_shipped', {'order_id': order_id})
            
        except Exception as e:
            # Compensating transactions
            await self.compensate(order_id, e)
    
    async def compensate(self, order_id, error):
        '''Roll back completed steps'''
        await self.cancel_shipment(order_id)
        await self.refund_payment(order_id)
        await self.release_inventory(order_id)
        await self.publish_event('order_failed', {
            'order_id': order_id,
            'reason': str(error)
        })
```

## Best Practices

### Event Design
- Events represent facts that happened
- Use past tense for event names
- Include all relevant context
- Keep events immutable
- Version event schemas

### Processing Guarantees
- Design idempotent handlers
- Handle duplicate events
- Implement proper error handling
- Use compensation for failures
- Monitor processing lag

### Performance
- Batch event processing
- Use async/await patterns
- Implement caching strategically
- Scale consumers horizontally
- Partition event streams

## Related Topics

- [CDC](/tags/cdc) - Change data capture
- [Streaming](/tags/streaming) - Event streaming
- [Pub/Sub](/tags/pubsub) - Publish-subscribe patterns

## Learn More

- [Event-Driven Architecture (Martin Fowler)](https://martinfowler.com/articles/201701-event-driven.html)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)

## Production Event Patterns

### Change Data Capture Integration

Stream database changes to external systems:

```python
from geode_client import open_database
import asyncio

class CDCProcessor:
    def __init__(self, geode_url, output_handler):
        self.client = open_database(geode_url)
        self.output = output_handler

    async def stream_changes(self, labels=None):
        """Poll ChangeLog entries and publish events."""
        last_seen = "1970-01-01T00:00:00Z"
        async with self.client.connection() as conn:
            while True:
                result, _ = await conn.query(
                    """
                    MATCH (e:ChangeLog)
                    WHERE e.emitted_at > $since
                      AND ($labels IS NULL OR e.label IN $labels)
                    RETURN e.operation AS operation,
                           e.label AS label,
                           e.before AS before,
                           e.after AS after,
                           e.emitted_at AS emitted_at
                    ORDER BY emitted_at
                    """,
                    {"since": last_seen, "labels": labels},
                )
                for row in result.rows:
                    event = {
                        "timestamp": row["emitted_at"].raw_value,
                        "operation": row["operation"].raw_value,
                        "label": row["label"].raw_value,
                        "before": row["before"].raw_value,
                        "after": row["after"].raw_value,
                    }
                    await self.output.publish(event)
                    last_seen = row["emitted_at"].raw_value

# Usage
async def main():
    processor = CDCProcessor(
        "quic://localhost:3141",
        KafkaOutput("kafka:9092", "geode-cdc")
    )
    await processor.stream_changes(labels=['User', 'Order', 'Product'])
```

### Event Sourcing with Geode

Store events as source of truth:

```python
class EventStore:
    def __init__(self, client):
        self.client = client
    
    async def append_event(self, aggregate_id, event_type, event_data, expected_version=None):
        """Append event with optimistic concurrency"""
        async with self.client.connection() as conn:
            await conn.begin()
            try:
                # Check version if specified
                if expected_version is not None:
                    current, _ = await conn.query(
                        """
                        MATCH (a:Aggregate {id: $id})
                        RETURN a.version as version
                        """,
                        {"id": aggregate_id},
                    )

                    row = current.rows[0] if current.rows else None
                    if row and row["version"].as_int != expected_version:
                        raise ConcurrencyError("Version mismatch")

                # Append event
                await conn.execute(
                    """
                    MERGE (a:Aggregate {id: $aggregate_id})
                    ON CREATE SET a.version = 0
                    CREATE (e:Event {
                        id: randomUUID(),
                        aggregate_id: $aggregate_id,
                        event_type: $event_type,
                        event_data: $event_data,
                        version: a.version + 1,
                        timestamp: datetime()
                    })
                    CREATE (a)-[:HAS_EVENT]->(e)
                    SET a.version = a.version + 1
                    """,
                    {
                        "aggregate_id": aggregate_id,
                        "event_type": event_type,
                        "event_data": event_data,
                    },
                )
                await conn.commit()
            except Exception:
                await conn.rollback()
                raise
    
    async def get_events(self, aggregate_id, from_version=0):
        """Get events for aggregate"""
        async with self.client.connection() as conn:
            result, _ = await conn.query(
                """
                MATCH (a:Aggregate {id: $id})-[:HAS_EVENT]->(e:Event)
                WHERE e.version > $from_version
                RETURN e.event_type, e.event_data, e.version, e.timestamp
                ORDER BY e.version
                """,
                {"id": aggregate_id, "from_version": from_version},
            )
        return result.rows
```

### Saga Orchestration

Coordinate distributed transactions:

```python
class SagaOrchestrator:
    def __init__(self, client):
        self.client = client
        self.compensations = []
    
    async def execute_saga(self, saga_id, steps):
        """Execute saga with compensation on failure"""
        async with self.client.connection() as conn:
            await conn.begin()
            # Create saga record
            await conn.execute(
                """
                CREATE (s:Saga {
                    id: $id,
                    status: 'running',
                    started_at: datetime()
                })
                """,
                {"id": saga_id},
            )

            try:
                # Execute each step
                for i, step in enumerate(steps):
                    await self.execute_step(conn, saga_id, i, step)

                # Mark success
                await conn.execute(
                    """
                    MATCH (s:Saga {id: $id})
                    SET s.status = 'completed', s.completed_at = datetime()
                    """,
                    {"id": saga_id},
                )
                await conn.commit()
            except Exception as e:
                # Rollback with compensations
                await self.compensate(conn, saga_id)

                await conn.execute(
                    """
                    MATCH (s:Saga {id: $id})
                    SET s.status = 'failed', s.error = $error
                    """,
                    {"id": saga_id, "error": str(e)},
                )
                await conn.commit()
                raise
    
    async def execute_step(self, conn, saga_id, step_num, step):
        """Execute single saga step"""
        # Record step
        await conn.execute("""
            MATCH (s:Saga {id: $saga_id})
            CREATE (step:SagaStep {
                saga_id: $saga_id,
                step_num: $step_num,
                action: $action,
                status: 'running'
            })
            CREATE (s)-[:HAS_STEP]->(step)
        """, {
            "saga_id": saga_id,
            "step_num": step_num,
            "action": step['action']
        })
        
        # Execute step action
        execute_fn = step['execute']
        await execute_fn(conn)
        
        # Store compensation
        self.compensations.append(step.get('compensate'))
        
        # Mark step complete
        await conn.execute("""
            MATCH (step:SagaStep {saga_id: $saga_id, step_num: $step_num})
            SET step.status = 'completed'
        """, {"saga_id": saga_id, "step_num": step_num})
    
    async def compensate(self, conn, saga_id):
        """Execute compensating transactions"""
        for compensate in reversed(self.compensations):
            if compensate:
                await compensate(conn)
```

### Real-Time Event Processing

Process events with low latency:

```python
class RealTimeEventProcessor:
    def __init__(self, client):
        self.client = client
        self.handlers = {}
    
    def register_handler(self, event_type, handler):
        """Register event handler"""
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)
    
    async def process_stream(self):
        """Process event stream in real-time"""
        async for event in self.client.subscribe_events():
            # Dispatch to handlers
            await self.dispatch(event)
    
    async def dispatch(self, event):
        """Dispatch event to registered handlers"""
        event_type = event['type']
        
        if event_type in self.handlers:
            # Execute handlers in parallel
            tasks = [
                handler(event)
                for handler in self.handlers[event_type]
            ]
            await asyncio.gather(*tasks)

# Usage
processor = RealTimeEventProcessor(client)

# Register handlers
@processor.register_handler('UserCreated')
async def send_welcome_email(event):
    user_email = event['data']['email']
    await email_service.send(user_email, "Welcome!")

@processor.register_handler('OrderPlaced')
async def update_inventory(event):
    product_id = event['data']['product_id']
    quantity = event['data']['quantity']
    async with client.connection() as conn:
        await conn.execute(
            """
            MATCH (p:Product {id: $id})
            SET p.stock = p.stock - $qty
            """,
            {"id": product_id, "qty": quantity},
        )

# Start processing
await processor.process_stream()
```

Browse the tagged content below to discover event-driven architecture patterns and real-time processing guides for Geode.
