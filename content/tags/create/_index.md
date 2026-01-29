---
title: "CREATE Clause in GQL"
description: "Master the GQL CREATE clause for creating nodes, relationships, and patterns in Geode graph database. Learn syntax, best practices, and advanced creation patterns."
keywords:
  - CREATE
  - create nodes
  - create relationships
  - GQL
  - data insertion
  - Geode
  - graph modeling
  - node creation
  - relationship creation
  - pattern creation
  - property assignment
  - labels
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/create/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# CREATE Clause in GQL

The CREATE clause is the primary mechanism for adding new data to your Geode graph database. It allows you to create nodes, relationships, and complete patterns with properties and labels in a single operation. Geode implements the CREATE clause according to the ISO/IEC 39075:2024 GQL standard.

## Introduction to CREATE

In graph databases, data is represented as nodes (entities) and relationships (connections between entities). The CREATE clause enables you to build your graph structure by inserting these elements along with their properties and labels.

**Key characteristics of CREATE**:

- **Atomic Operations**: Each CREATE statement executes as a single atomic operation
- **Pattern Support**: Create entire patterns (multiple nodes and relationships) in one statement
- **Property Assignment**: Set properties during creation
- **Label Assignment**: Assign one or more labels to nodes
- **Relationship Types**: Define relationship types and directions
- **Returning Created Elements**: Access created elements for further operations

## Creating Nodes

### Basic Node Creation

Create a simple node without labels or properties.

```gql
-- Create an empty node
CREATE ();

-- Create a node and return it
CREATE (n)
RETURN n;
```

### Nodes with Labels

Labels categorize nodes and enable efficient querying.

```gql
-- Create a node with a single label
CREATE (p:Person);

-- Create a node with multiple labels
CREATE (e:Person:Employee:Manager);

-- Create and return
CREATE (u:User)
RETURN u;
```

### Nodes with Properties

Properties store data on nodes as key-value pairs.

```gql
-- Create a node with properties
CREATE (p:Person {
    name: 'Alice',
    age: 30,
    email: 'alice@example.com'
});

-- Create with various data types
CREATE (p:Product {
    name: 'Laptop',
    price: 999.99,
    in_stock: true,
    tags: ['electronics', 'computers'],
    specs: {cpu: 'M3', ram: '16GB'}
});
```

### Creating Multiple Nodes

Create several nodes in a single statement.

```gql
-- Create multiple nodes
CREATE
    (a:Person {name: 'Alice'}),
    (b:Person {name: 'Bob'}),
    (c:Person {name: 'Charlie'});

-- Create with UNWIND for dynamic data
UNWIND $users AS user_data
CREATE (u:User {
    name: user_data.name,
    email: user_data.email
});
```

## Creating Relationships

### Basic Relationship Creation

Relationships connect nodes and have a type and direction.

```gql
-- Create a relationship between existing nodes
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
CREATE (a)-[:KNOWS]->(b);

-- Create with relationship variable
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
CREATE (a)-[r:FRIENDS_WITH]->(b)
RETURN r;
```

### Relationships with Properties

Relationships can store properties just like nodes.

```gql
-- Create relationship with properties
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
CREATE (a)-[:FRIENDS_WITH {
    since: date('2020-01-15'),
    closeness: 'best_friend'
}]->(b);

-- E-commerce example
MATCH (c:Customer {id: $customer_id}), (p:Product {id: $product_id})
CREATE (c)-[:PURCHASED {
    date: datetime(),
    quantity: $qty,
    price: $price
}]->(p);
```

### Relationship Directions

GQL relationships are always directed, but can be traversed in any direction.

```gql
-- Outgoing relationship
CREATE (a)-[:FOLLOWS]->(b);

-- Incoming relationship (conceptually)
CREATE (a)<-[:FOLLOWED_BY]-(b);

-- Note: In GQL, relationships are stored with direction
-- Query traversal can ignore direction using -[:TYPE]-
```

## Creating Patterns

### Complete Pattern Creation

Create nodes and relationships together in a single pattern.

```gql
-- Create a complete pattern
CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'});

-- Create a chain
CREATE (a:User {name: 'Alice'})
    -[:POSTED]->(p:Post {title: 'Hello World'})
    -[:HAS_COMMENT]->(c:Comment {text: 'Great post!'});
```

### Complex Patterns

Build intricate graph structures in one operation.

```gql
-- Create a small social network
CREATE
    (alice:Person {name: 'Alice', age: 30}),
    (bob:Person {name: 'Bob', age: 25}),
    (charlie:Person {name: 'Charlie', age: 35}),
    (alice)-[:FRIENDS_WITH {since: 2020}]->(bob),
    (bob)-[:FRIENDS_WITH {since: 2021}]->(charlie),
    (charlie)-[:FRIENDS_WITH {since: 2019}]->(alice);

-- Create an order with items
CREATE (o:Order {
    id: $order_id,
    date: datetime(),
    status: 'pending'
})
WITH o
UNWIND $items AS item
MATCH (p:Product {id: item.product_id})
CREATE (o)-[:CONTAINS {
    quantity: item.quantity,
    price: item.price
}]->(p);
```

### Pattern with Existing Nodes

Combine MATCH and CREATE for patterns involving existing data.

```gql
-- Connect existing user to new post
MATCH (u:User {id: $user_id})
CREATE (u)-[:AUTHORED]->(p:Post {
    title: $title,
    content: $content,
    created_at: datetime()
})
RETURN p;

-- Create relationships between existing nodes
MATCH (p:Product), (c:Category)
WHERE p.category_name = c.name
CREATE (p)-[:IN_CATEGORY]->(c);
```

## CREATE with Other Clauses

### CREATE with MATCH

Use MATCH to find existing nodes before creating.

```gql
-- Find and connect
MATCH (u:User {email: $email})
MATCH (g:Group {name: $group_name})
CREATE (u)-[:MEMBER_OF {joined: datetime()}]->(g)
RETURN u, g;

-- Conditional pattern creation
MATCH (a:Person), (b:Person)
WHERE a.city = b.city AND a <> b AND NOT (a)-[:LIVES_NEAR]-(b)
CREATE (a)-[:LIVES_NEAR]->(b);
```

### CREATE with WITH

Chain operations using WITH.

```gql
-- Create node then create relationships
CREATE (p:Project {name: $project_name})
WITH p
MATCH (u:User {id: $owner_id})
CREATE (u)-[:OWNS]->(p)
WITH p, u
MATCH (t:Team {id: $team_id})
CREATE (t)-[:WORKS_ON]->(p)
RETURN p, u, t;
```

### CREATE with RETURN

Access created elements in the result.

```gql
-- Return created node
CREATE (u:User {
    name: $name,
    email: $email,
    created_at: datetime()
})
RETURN u.name AS name, elementId(u) AS id;

-- Return created relationship
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
CREATE (a)-[r:KNOWS {since: date()}]->(b)
RETURN type(r) AS relationship_type, r.since AS since;
```

### CREATE with Parameters

Use parameters for safe, efficient creation.

```gql
-- Parameterized node creation
CREATE (u:User {
    name: $name,
    email: $email,
    age: $age
});

-- Parameterized pattern
MATCH (author:User {id: $author_id})
CREATE (author)-[:WROTE]->(post:Post {
    title: $title,
    content: $content,
    tags: $tags
});
```

## Bulk Data Creation

### Using UNWIND

Create multiple elements from a list.

```gql
-- Create many nodes
UNWIND $users AS user_data
CREATE (u:User {
    name: user_data.name,
    email: user_data.email,
    department: user_data.department
});

-- Create nodes with relationships
UNWIND $friendships AS f
MATCH (a:User {id: f.user_id}), (b:User {id: f.friend_id})
CREATE (a)-[:FRIENDS_WITH {since: f.since}]->(b);
```

### Batch Processing

Efficiently create large amounts of data.

```gql
-- Process in batches (application-side pattern)
-- Execute this query for each batch of 1000 records
UNWIND $batch AS record
CREATE (n:DataPoint {
    timestamp: record.ts,
    value: record.val,
    sensor_id: record.sensor
});
```

### Importing from External Data

Create graph structure from imported data.

```gql
-- From CSV-like structure
UNWIND $rows AS row
MERGE (source:Location {name: row.from})
MERGE (target:Location {name: row.to})
CREATE (source)-[:CONNECTED_TO {
    distance: row.distance,
    transport: row.mode
}]->(target);
```

## CREATE vs MERGE

Understanding when to use CREATE vs MERGE.

### CREATE Behavior

CREATE always creates new elements, potentially causing duplicates.

```gql
-- This creates duplicates if run twice
CREATE (u:User {email: 'alice@example.com', name: 'Alice'});
CREATE (u:User {email: 'alice@example.com', name: 'Alice'});
-- Result: Two separate User nodes
```

### MERGE for Idempotent Operations

MERGE creates only if the pattern does not exist.

```gql
-- This is idempotent - safe to run multiple times
MERGE (u:User {email: 'alice@example.com'})
ON CREATE SET u.name = 'Alice', u.created_at = datetime()
ON MATCH SET u.last_seen = datetime();
```

### When to Use Each

| Scenario | Recommendation |
|----------|----------------|
| Initial data load | CREATE (faster) |
| Incremental updates | MERGE (prevents duplicates) |
| Event logging | CREATE (each event is unique) |
| Entity creation | MERGE with unique constraint |
| Relationship creation | Depends on domain semantics |

## Best Practices

### Data Integrity

1. **Use Constraints**: Define uniqueness constraints before bulk creation
```gql
-- Create constraint first
CREATE CONSTRAINT user_email_unique ON (u:User) ASSERT u.email IS UNIQUE;

-- Then use MERGE for safety
MERGE (u:User {email: $email})
ON CREATE SET u.name = $name;
```

2. **Validate Data**: Check data before creating
```gql
-- Create only if valid
MATCH (u:User {id: $user_id})
WHERE u.active = true
CREATE (u)-[:PERFORMED]->(a:Action {type: $action_type, timestamp: datetime()});
```

### Performance Optimization

1. **Batch Creations**: Group multiple creates into transactions
```gql
-- More efficient than individual queries
UNWIND range(1, 1000) AS i
CREATE (n:TestNode {index: i});
```

2. **Index Before Bulk Load**: Create indexes before loading data
```gql
CREATE INDEX user_email ON User(email);
CREATE INDEX product_sku ON Product(sku);
-- Then perform bulk load
```

3. **Use Parameters**: Parameterized queries are cached and reused
```gql
-- Query plan is cached
CREATE (u:User {name: $name, email: $email});
```

### Modeling Best Practices

1. **Meaningful Labels**: Use descriptive, singular label names
```gql
-- Good
CREATE (p:Product), (c:Customer), (o:Order);

-- Avoid
CREATE (p:Products), (c:Cust), (o:Ord);
```

2. **Descriptive Relationship Types**: Use verb phrases in UPPER_CASE
```gql
-- Good
CREATE (a)-[:PURCHASED]->(b);
CREATE (a)-[:REPORTS_TO]->(b);
CREATE (a)-[:AUTHORED]->(b);

-- Avoid
CREATE (a)-[:rel]->(b);
CREATE (a)-[:connection]->(b);
```

3. **Property Naming**: Use consistent naming conventions
```gql
-- Consistent snake_case
CREATE (p:Product {
    product_name: 'Widget',
    unit_price: 29.99,
    created_at: datetime()
});
```

## Error Handling

### Common Errors

```gql
-- Constraint violation
-- Error: Node already exists with label 'User' and property 'email' = 'alice@example.com'
CREATE (u:User {email: 'alice@example.com'});  -- When constraint exists and node exists

-- Invalid property type
-- Error: Type mismatch: expected Integer but was String
CREATE (n:Node {count: 'five'});  -- If schema requires integer
```

### Handling Errors in Applications

```python
# Python example
from geode_client import Client, ConstraintViolationError

async def create_user(name, email):
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        try:
            result, _ = await conn.query("""
                CREATE (u:User {name: $name, email: $email})
                RETURN u
            """, {"name": name, "email": email})
            return result.bindings[0]['u']
        except ConstraintViolationError:
            # Handle duplicate
            return await get_user_by_email(email)
```

## Related Topics

- **[SET Clause](/tags/set/)**: Updating properties after creation
- **[DELETE Clause](/tags/delete/)**: Removing nodes and relationships
- **[MATCH Clause](/tags/match/)**: Finding existing elements
- **[MERGE](/tags/merge/)**: Idempotent creation
- **[GQL Reference](/tags/gql-reference/)**: Complete GQL language reference
- **[Data Modeling](/tags/data-modeling/)**: Graph modeling best practices
- **[Constraints](/tags/constraints/)**: Ensuring data integrity

## Further Reading

- **GQL Tutorial - Creating Data**: `/docs/gql-tutorial/creating-data/`
- **Data Modeling Guide**: `/docs/guides/graph-modeling/`
- **Bulk Import Guide**: `/docs/operations/bulk-import/`
- **Constraint Reference**: `/docs/reference/constraints/`
- **Transaction Management**: `/docs/transactions/overview/`
