---
title: "Event-Driven Architecture"
description: "Building reactive, scalable systems with event-driven patterns and asynchronous messaging in Geode"
keywords: ["event-driven architecture", "EDA", "events", "event sourcing", "CQRS", "reactive systems", "asynchronous messaging", "event handlers"]
weight: 10
---

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
from geode_client import GeodeClient

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
