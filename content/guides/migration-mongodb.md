---
title: "Migrating from MongoDB to Geode"
slug: "migration-mongodb"
description: "Complete guide to migrating from MongoDB to Geode, including document to graph conversion, embedded documents to relationships, and query translation"
weight: 72
tags: ["migration", "mongodb", "document", "gql", "nosql"]
categories: ["guides", "migration"]
keywords:
  - MongoDB migration
  - document to graph
  - MongoDB to Geode
  - NoSQL migration
  - graph database migration
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Migrating from MongoDB to Geode

This guide provides a comprehensive approach to migrating from MongoDB to Geode. While both are NoSQL databases, they have fundamentally different data models: MongoDB stores documents in collections, while Geode stores nodes and relationships in a graph. This migration requires rethinking how you model and query your data.

## Migration Overview

### When to Move from Documents to Graphs

Graph databases are ideal when:
- **References between documents are common**: You frequently use `$lookup` or denormalize
- **Multi-hop queries are needed**: Finding connections through multiple documents
- **Relationship metadata matters**: You need properties on the connections themselves
- **Schema is highly connected**: Many-to-many relationships dominate

### When to Keep MongoDB

Consider keeping MongoDB for:
- Simple document storage and retrieval
- Highly nested, self-contained documents
- High-volume write workloads with simple reads
- Geospatial queries (native support)

### Comparison

| Feature | MongoDB | Geode |
|---------|---------|-------|
| Data Model | Documents in Collections | Nodes and Relationships |
| Query Language | MQL (MongoDB Query Language) | GQL (ISO Standard) |
| Schema | Flexible (schemaless) | Flexible with optional constraints |
| References | Manual ($lookup) or embedded | Native relationships |
| Traversal | Expensive ($graphLookup) | Native and efficient |
| Transactions | Multi-document ACID | Full ACID support |

## Document to Graph Conversion

### Core Concepts Mapping

| MongoDB Concept | Graph Equivalent |
|-----------------|------------------|
| Collection | Node Label |
| Document | Node |
| Field | Property |
| `_id` | Node ID property |
| DBRef / ObjectId reference | Relationship |
| Embedded document | Relationship + Node OR Properties |
| Embedded array | Relationships OR List property |

### Strategy Selection

For each embedded structure, choose a strategy:

1. **Keep as Properties**: For simple, owned data
2. **Extract to Nodes**: For entities that might be shared or queried independently
3. **Create Relationships**: For connections between entities

### Example: E-Commerce Application

**MongoDB Schema**:
```javascript
// users collection
{
  _id: ObjectId("..."),
  username: "alice",
  email: "alice@example.com",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    avatar: "https://..."
  },
  addresses: [
    {
      type: "home",
      street: "123 Main St",
      city: "New York",
      zip: "10001",
      isDefault: true
    },
    {
      type: "work",
      street: "456 Office Blvd",
      city: "New York",
      zip: "10002"
    }
  ],
  orders: [ObjectId("..."), ObjectId("...")]
}

// products collection
{
  _id: ObjectId("..."),
  name: "Laptop",
  price: 999.99,
  category: {
    name: "Electronics",
    parent: "Technology"
  },
  reviews: [
    {
      userId: ObjectId("..."),
      rating: 5,
      comment: "Great product!",
      date: ISODate("2024-01-15")
    }
  ],
  tags: ["electronics", "computers", "laptops"]
}

// orders collection
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  items: [
    {
      productId: ObjectId("..."),
      quantity: 2,
      price: 999.99
    }
  ],
  total: 1999.98,
  status: "shipped",
  createdAt: ISODate("2024-01-20")
}
```

**Geode Graph Model**:
```gql
// User node - flatten profile, keep simple
(:User {
  id: "user_123",
  username: "alice",
  email: "alice@example.com",
  firstName: "Alice",
  lastName: "Smith",
  avatar: "https://..."
})

// Address as separate nodes (allows sharing, independent queries)
(:Address {
  id: "addr_1",
  type: "home",
  street: "123 Main St",
  city: "New York",
  zip: "10001"
})

// Relationships
(:User)-[:HAS_ADDRESS {isDefault: true}]->(:Address)

// Product node
(:Product {
  id: "prod_456",
  name: "Laptop",
  price: 999.99,
  tags: ["electronics", "computers", "laptops"]  // Keep as list property
})

// Category as separate node (shared, hierarchical)
(:Category {name: "Electronics"})
(:Category {name: "Technology"})
(:Category {name: "Electronics"})-[:PARENT]->(:Category {name: "Technology"})
(:Product)-[:IN_CATEGORY]->(:Category {name: "Electronics"})

// Review as relationship (captures connection + metadata)
(:User)-[:REVIEWED {rating: 5, comment: "Great product!", date: "2024-01-15"}]->(:Product)

// Order node
(:Order {
  id: "order_789",
  total: 1999.98,
  status: "shipped",
  createdAt: "2024-01-20"
})

// Order relationships
(:User)-[:PLACED]->(:Order)
(:Order)-[:CONTAINS {quantity: 2, price: 999.99}]->(:Product)
```

## Embedded Documents to Relationships

### Strategy 1: Flatten to Properties

For simple, owned embedded documents:

**MongoDB**:
```javascript
{
  username: "alice",
  profile: {
    firstName: "Alice",
    lastName: "Smith",
    bio: "Software developer"
  }
}
```

**GQL**:
```gql
CREATE (:User {
  username: "alice",
  firstName: "Alice",
  lastName: "Smith",
  bio: "Software developer"
})
```

### Strategy 2: Extract to Nodes with Relationships

For embedded documents that could be shared or queried independently:

**MongoDB**:
```javascript
{
  name: "Order #123",
  shippingAddress: {
    street: "123 Main St",
    city: "New York",
    country: "USA"
  }
}
```

**GQL**:
```gql
CREATE (addr:Address {
  street: "123 Main St",
  city: "New York",
  country: "USA"
})
CREATE (order:Order {name: "Order #123"})
CREATE (order)-[:SHIPS_TO]->(addr)
```

### Strategy 3: Relationship with Properties

For connections that have metadata:

**MongoDB**:
```javascript
{
  productId: ObjectId("..."),
  reviews: [
    {
      userId: ObjectId("..."),
      rating: 5,
      comment: "Excellent!",
      date: ISODate("...")
    }
  ]
}
```

**GQL**:
```gql
// Review becomes a relationship with properties
MATCH (user:User {id: $userId})
MATCH (product:Product {id: $productId})
CREATE (user)-[:REVIEWED {
  rating: 5,
  comment: "Excellent!",
  date: timestamp("2024-01-15")
}]->(product)
```

### Strategy 4: Intermediate Node (Hyperedge)

For complex relationships involving multiple entities:

**MongoDB**:
```javascript
{
  type: "purchase",
  buyer: ObjectId("..."),
  seller: ObjectId("..."),
  product: ObjectId("..."),
  price: 100,
  date: ISODate("...")
}
```

**GQL**:
```gql
// Create a Transaction node
CREATE (tx:Transaction {
  id: "tx_123",
  price: 100,
  date: timestamp("2024-01-15")
})

MATCH (buyer:User {id: $buyerId})
MATCH (seller:User {id: $sellerId})
MATCH (product:Product {id: $productId})
MATCH (tx:Transaction {id: "tx_123"})
CREATE (buyer)-[:INITIATED]->(tx)
CREATE (tx)-[:BENEFITED]->(seller)
CREATE (tx)-[:INVOLVED]->(product)
```

## Collection to Label Mapping

### Direct Mapping

Simple collections map directly to labels:

```javascript
// MongoDB collections
db.users
db.products
db.orders
```

```gql
// GQL labels
:User
:Product
:Order
```

### Polymorphic Collections

Collections with `type` fields may need multiple labels:

**MongoDB**:
```javascript
// notifications collection
{ type: "email", to: "alice@...", subject: "..." }
{ type: "sms", to: "+1234567890", message: "..." }
{ type: "push", to: "device_token", payload: {...} }
```

**GQL**:
```gql
// Option 1: Multiple labels
(:Notification:Email {to: "alice@...", subject: "..."})
(:Notification:SMS {to: "+1234567890", message: "..."})
(:Notification:Push {to: "device_token", payload: {...}})

// Option 2: Single label with type property
(:Notification {type: "email", to: "alice@...", subject: "..."})
```

### Capped Collections / Time Series

**MongoDB**:
```javascript
// capped collection for logs
{ timestamp: ISODate("..."), level: "ERROR", message: "..." }
```

**GQL**:
```gql
// Create nodes with explicit lifecycle management
CREATE (:LogEntry {
  timestamp: timestamp(),
  level: "ERROR",
  message: "..."
})

// Periodic cleanup
MATCH (l:LogEntry)
WHERE l.timestamp < timestamp() - duration('P30D')
DELETE l
```

## Query Translation

### Basic Queries

**Find by ID**:
```javascript
// MongoDB
db.users.findOne({ _id: ObjectId("...") })
```

```gql
// GQL
MATCH (u:User {id: "..."})
RETURN u
```

**Find with conditions**:
```javascript
// MongoDB
db.users.find({
  age: { $gte: 18 },
  active: true
})
```

```gql
// GQL
MATCH (u:User)
WHERE u.age >= 18 AND u.active = true
RETURN u
```

**Find with projection**:
```javascript
// MongoDB
db.users.find(
  { active: true },
  { username: 1, email: 1 }
)
```

```gql
// GQL
MATCH (u:User)
WHERE u.active = true
RETURN u.username, u.email
```

### Array Queries

**Element match**:
```javascript
// MongoDB
db.products.find({ tags: "electronics" })
```

```gql
// GQL
MATCH (p:Product)
WHERE "electronics" IN p.tags
RETURN p
```

**Array size**:
```javascript
// MongoDB
db.users.find({ orders: { $size: 5 } })
```

```gql
// GQL
MATCH (u:User)
WHERE size(u.orders) = 5
RETURN u

// Or with relationships
MATCH (u:User)-[:PLACED]->(o:Order)
WITH u, count(o) AS orderCount
WHERE orderCount = 5
RETURN u
```

**All elements match**:
```javascript
// MongoDB
db.products.find({ tags: { $all: ["electronics", "sale"] } })
```

```gql
// GQL
MATCH (p:Product)
WHERE "electronics" IN p.tags AND "sale" IN p.tags
RETURN p
```

### Embedded Document Queries

**Query nested field**:
```javascript
// MongoDB
db.users.find({ "profile.city": "New York" })
```

```gql
// GQL (if flattened)
MATCH (u:User)
WHERE u.city = "New York"
RETURN u

// GQL (if kept as relationship)
MATCH (u:User)-[:LIVES_IN]->(c:City {name: "New York"})
RETURN u
```

### Reference/Lookup Queries

**Single lookup**:
```javascript
// MongoDB
db.orders.aggregate([
  { $match: { _id: ObjectId("...") } },
  { $lookup: {
    from: "users",
    localField: "userId",
    foreignField: "_id",
    as: "user"
  }}
])
```

```gql
// GQL - much simpler!
MATCH (u:User)-[:PLACED]->(o:Order {id: "..."})
RETURN o, u
```

**Multiple lookups**:
```javascript
// MongoDB
db.orders.aggregate([
  { $lookup: { from: "users", ... } },
  { $lookup: { from: "products", ... } },
  { $unwind: "$items" },
  { $lookup: { from: "products", localField: "items.productId", ... } }
])
```

```gql
// GQL
MATCH (u:User)-[:PLACED]->(o:Order)-[item:CONTAINS]->(p:Product)
RETURN u, o, item, p
```

### Sorting and Limiting

```javascript
// MongoDB
db.products.find()
  .sort({ price: -1 })
  .skip(10)
  .limit(5)
```

```gql
// GQL
MATCH (p:Product)
RETURN p
ORDER BY p.price DESC
SKIP 10
LIMIT 5
```

### Updates

**Update single field**:
```javascript
// MongoDB
db.users.updateOne(
  { _id: ObjectId("...") },
  { $set: { email: "new@example.com" } }
)
```

```gql
// GQL
MATCH (u:User {id: "..."})
SET u.email = "new@example.com"
```

**Update multiple fields**:
```javascript
// MongoDB
db.users.updateOne(
  { _id: ObjectId("...") },
  { $set: { email: "new@example.com", active: true } }
)
```

```gql
// GQL
MATCH (u:User {id: "..."})
SET u.email = "new@example.com", u.active = true
```

**Increment**:
```javascript
// MongoDB
db.products.updateOne(
  { _id: ObjectId("...") },
  { $inc: { views: 1 } }
)
```

```gql
// GQL
MATCH (p:Product {id: "..."})
SET p.views = COALESCE(p.views, 0) + 1
```

**Push to array**:
```javascript
// MongoDB
db.users.updateOne(
  { _id: ObjectId("...") },
  { $push: { tags: "premium" } }
)
```

```gql
// GQL
MATCH (u:User {id: "..."})
SET u.tags = COALESCE(u.tags, []) + ["premium"]
```

### Deletes

**Delete one**:
```javascript
// MongoDB
db.users.deleteOne({ _id: ObjectId("...") })
```

```gql
// GQL
MATCH (u:User {id: "..."})
DELETE u
```

**Delete with relationships**:
```javascript
// MongoDB (references need manual cleanup)
db.users.deleteOne({ _id: ObjectId("...") })
db.orders.deleteMany({ userId: ObjectId("...") })
```

```gql
// GQL - delete node and all relationships
MATCH (u:User {id: "..."})
DETACH DELETE u
```

## Aggregation Pipeline Equivalents

### Group and Count

```javascript
// MongoDB
db.orders.aggregate([
  { $group: {
    _id: "$status",
    count: { $sum: 1 }
  }}
])
```

```gql
// GQL
MATCH (o:Order)
RETURN o.status, count(o) AS count
```

### Group with Multiple Accumulators

```javascript
// MongoDB
db.orders.aggregate([
  { $group: {
    _id: "$userId",
    orderCount: { $sum: 1 },
    totalSpent: { $sum: "$total" },
    avgOrder: { $avg: "$total" },
    lastOrder: { $max: "$createdAt" }
  }}
])
```

```gql
// GQL
MATCH (u:User)-[:PLACED]->(o:Order)
RETURN
  u.id,
  count(o) AS orderCount,
  sum(o.total) AS totalSpent,
  avg(o.total) AS avgOrder,
  max(o.createdAt) AS lastOrder
```

### Unwind (Flatten Arrays)

```javascript
// MongoDB
db.products.aggregate([
  { $unwind: "$tags" },
  { $group: { _id: "$tags", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

```gql
// GQL
MATCH (p:Product)
UNWIND p.tags AS tag
RETURN tag, count(p) AS count
ORDER BY count DESC
```

### Faceted Search

```javascript
// MongoDB
db.products.aggregate([
  { $facet: {
    byCategory: [
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ],
    byPrice: [
      { $bucket: {
        groupBy: "$price",
        boundaries: [0, 50, 100, 500, 1000],
        default: "Other"
      }}
    ],
    totalCount: [
      { $count: "count" }
    ]
  }}
])
```

```gql
// GQL - run separate queries
// By category
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
RETURN c.name, count(p) AS count

// By price range
MATCH (p:Product)
RETURN
  CASE
    WHEN p.price < 50 THEN "0-50"
    WHEN p.price < 100 THEN "50-100"
    WHEN p.price < 500 THEN "100-500"
    WHEN p.price < 1000 THEN "500-1000"
    ELSE "1000+"
  END AS priceRange,
  count(p)

// Total count
MATCH (p:Product)
RETURN count(p)
```

### Graph Lookup (Recursive)

```javascript
// MongoDB $graphLookup
db.employees.aggregate([
  { $match: { name: "CEO" } },
  { $graphLookup: {
    from: "employees",
    startWith: "$_id",
    connectFromField: "_id",
    connectToField: "managerId",
    as: "subordinates",
    maxDepth: 5
  }}
])
```

```gql
// GQL - native and efficient!
MATCH (ceo:Employee {name: "CEO"})<-[:REPORTS_TO*1..5]-(subordinate)
RETURN subordinate
```

### Text Search

```javascript
// MongoDB text search
db.products.createIndex({ name: "text", description: "text" })
db.products.find({ $text: { $search: "laptop computer" } })
```

```gql
// GQL with fulltext index
CREATE FULLTEXT INDEX product_search ON :Product(name, description)

// Query
MATCH (p:Product)
WHERE p.name CONTAINS 'laptop' OR p.description CONTAINS 'computer'
RETURN p
```

## Schema Flexibility Comparison

### MongoDB Flexibility

MongoDB's schemaless nature allows:
- Different documents in same collection
- Adding fields without migration
- Nested structures of any depth

### Geode Flexibility

Geode provides similar flexibility:

```gql
// Different nodes with same label, different properties
CREATE (:Product {name: "Laptop", price: 999, specs: {ram: "16GB"}})
CREATE (:Product {name: "Book", isbn: "123-456", author: "Jane Doe"})

// Add new properties anytime
MATCH (p:Product {name: "Laptop"})
SET p.weight = 2.5

// Flexible relationship properties
CREATE (a)-[:PURCHASED {date: timestamp(), coupon: "SAVE10"}]->(b)
CREATE (c)-[:PURCHASED {date: timestamp(), giftWrap: true}]->(d)
```

### Schema Validation

Both support optional validation:

**MongoDB Validator**:
```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      required: ["email", "username"],
      properties: {
        email: { bsonType: "string" },
        age: { bsonType: "int", minimum: 0 }
      }
    }
  }
})
```

**Geode Constraints**:
```gql
CREATE CONSTRAINT user_email_exists ON :User(email) ASSERT EXISTS
CREATE CONSTRAINT user_email_unique ON :User(email) ASSERT UNIQUE
CREATE CONSTRAINT user_age_range ON :User(age) ASSERT age >= 0
```

## ETL Pipeline

### Python Migration Script

```python
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from geode_client import Client
from bson import ObjectId

class MongoToGeodeETL:
    def __init__(self, mongo_uri, geode_host, geode_port):
        self.mongo = AsyncIOMotorClient(mongo_uri)
        self.geode = Client(host=geode_host, port=geode_port, skip_verify=True)
        self.id_mapping = {}  # ObjectId -> Geode ID

    def convert_id(self, oid):
        """Convert MongoDB ObjectId to string ID."""
        if isinstance(oid, ObjectId):
            return str(oid)
        return oid

    def transform_document(self, doc, flatten_fields=None):
        """Transform MongoDB document to Geode node properties."""
        result = {}
        flatten_fields = flatten_fields or []

        for key, value in doc.items():
            if key == '_id':
                result['id'] = self.convert_id(value)
            elif isinstance(value, ObjectId):
                # Skip ObjectId references - handle as relationships
                continue
            elif isinstance(value, dict):
                if key in flatten_fields:
                    # Flatten embedded document
                    for subkey, subvalue in value.items():
                        result[f"{key}_{subkey}"] = subvalue
                else:
                    # Keep as map property
                    result[key] = value
            elif isinstance(value, list):
                if value and isinstance(value[0], dict):
                    # Skip embedded documents - handle separately
                    continue
                else:
                    # Keep simple arrays as list properties
                    result[key] = value
            else:
                result[key] = value

        return result

    async def migrate_collection(self, db_name, collection_name, label,
                                  flatten_fields=None, batch_size=1000):
        """Migrate a MongoDB collection to Geode nodes."""
        collection = self.mongo[db_name][collection_name]
        total = await collection.count_documents({})
        print(f"Migrating {total} documents from {collection_name} to {label}")

        async with self.geode.connection() as conn:
            await conn.begin()
            count = 0

            async for doc in collection.find():
                props = self.transform_document(doc, flatten_fields)
                self.id_mapping[doc['_id']] = props['id']

                await conn.execute(
                    f"CREATE (n:{label} $props)",
                    {"props": props}
                )
                count += 1

                if count % batch_size == 0:
                    await conn.commit()
                    await conn.begin()
                    print(f"  Migrated {count}/{total} documents...")

            await conn.commit()
            print(f"  Completed: {count} {label} nodes created")

    async def migrate_references(self, db_name, collection_name,
                                  from_label, to_label, ref_field,
                                  rel_type, rel_props=None):
        """Migrate ObjectId references to relationships."""
        collection = self.mongo[db_name][collection_name]
        rel_props = rel_props or []

        async with self.geode.connection() as conn:
            await conn.begin()
            count = 0

            async for doc in collection.find({ref_field: {"$exists": True}}):
                ref_value = doc.get(ref_field)
                if not ref_value:
                    continue

                # Handle single reference
                refs = ref_value if isinstance(ref_value, list) else [ref_value]

                for ref in refs:
                    if isinstance(ref, ObjectId):
                        from_id = self.convert_id(doc['_id'])
                        to_id = self.convert_id(ref)

                        await conn.execute(f"""
                            MATCH (a:{from_label} {{id: $from_id}})
                            MATCH (b:{to_label} {{id: $to_id}})
                            CREATE (a)-[:{rel_type}]->(b)
                        """, {"from_id": from_id, "to_id": to_id})
                        count += 1

                if count % 1000 == 0:
                    await conn.commit()
                    await conn.begin()

            await conn.commit()
            print(f"Created {count} {rel_type} relationships")

    async def migrate_embedded_as_relationships(self, db_name, collection_name,
                                                  from_label, embedded_field,
                                                  to_label, rel_type,
                                                  id_field='id'):
        """Migrate embedded documents to nodes and relationships."""
        collection = self.mongo[db_name][collection_name]

        async with self.geode.connection() as conn:
            await conn.begin()
            node_count = 0
            rel_count = 0

            async for doc in collection.find():
                embedded_docs = doc.get(embedded_field, [])
                if not isinstance(embedded_docs, list):
                    embedded_docs = [embedded_docs]

                from_id = self.convert_id(doc['_id'])

                for i, embedded in enumerate(embedded_docs):
                    if not isinstance(embedded, dict):
                        continue

                    # Generate ID for embedded doc
                    embedded_id = f"{from_id}_{embedded_field}_{i}"
                    props = self.transform_document(embedded)
                    props['id'] = embedded_id

                    # Create node
                    await conn.execute(
                        f"CREATE (n:{to_label} $props)",
                        {"props": props}
                    )
                    node_count += 1

                    # Create relationship
                    await conn.execute(f"""
                        MATCH (a:{from_label} {{id: $from_id}})
                        MATCH (b:{to_label} {{id: $to_id}})
                        CREATE (a)-[:{rel_type}]->(b)
                    """, {"from_id": from_id, "to_id": embedded_id})
                    rel_count += 1

                if node_count % 1000 == 0:
                    await conn.commit()
                    await conn.begin()

            await conn.commit()
            print(f"Created {node_count} {to_label} nodes and {rel_count} relationships")

    async def migrate_embedded_as_relationship_props(self, db_name, collection_name,
                                                       parent_label, embedded_field,
                                                       ref_field, target_label,
                                                       rel_type):
        """Migrate embedded docs with references to relationships with properties."""
        collection = self.mongo[db_name][collection_name]

        async with self.geode.connection() as conn:
            await conn.begin()
            count = 0

            async for doc in collection.find():
                embedded_docs = doc.get(embedded_field, [])
                from_id = self.convert_id(doc['_id'])

                for embedded in embedded_docs:
                    if not isinstance(embedded, dict):
                        continue

                    ref_value = embedded.get(ref_field)
                    if not ref_value:
                        continue

                    to_id = self.convert_id(ref_value)

                    # Extract relationship properties
                    rel_props = {k: v for k, v in embedded.items()
                                if k != ref_field and not isinstance(v, (dict, list, ObjectId))}

                    await conn.execute(f"""
                        MATCH (a:{parent_label} {{id: $from_id}})
                        MATCH (b:{target_label} {{id: $to_id}})
                        CREATE (a)-[:{rel_type} $props]->(b)
                    """, {"from_id": from_id, "to_id": to_id, "props": rel_props})
                    count += 1

                if count % 1000 == 0:
                    await conn.commit()
                    await conn.begin()

            await conn.commit()
            print(f"Created {count} {rel_type} relationships with properties")

    async def run_migration(self, db_name):
        """Run complete migration."""
        print("=" * 60)
        print("MONGODB TO GEODE MIGRATION")
        print("=" * 60)

        # Step 1: Create indexes
        print("\n1. Creating indexes...")
        async with self.geode.connection() as conn:
            await conn.execute("CREATE INDEX user_id ON :User(id)")
            await conn.execute("CREATE INDEX product_id ON :Product(id)")
            await conn.execute("CREATE INDEX order_id ON :Order(id)")
            await conn.execute("CREATE INDEX category_id ON :Category(id)")

        # Step 2: Migrate collections to nodes
        print("\n2. Migrating collections to nodes...")

        await self.migrate_collection(
            db_name, 'users', 'User',
            flatten_fields=['profile']
        )

        await self.migrate_collection(
            db_name, 'products', 'Product'
        )

        await self.migrate_collection(
            db_name, 'orders', 'Order'
        )

        await self.migrate_collection(
            db_name, 'categories', 'Category'
        )

        # Step 3: Migrate references to relationships
        print("\n3. Migrating references to relationships...")

        await self.migrate_references(
            db_name, 'orders',
            'Order', 'User', 'userId',
            'PLACED_BY'
        )

        await self.migrate_references(
            db_name, 'products',
            'Product', 'Category', 'categoryId',
            'IN_CATEGORY'
        )

        await self.migrate_references(
            db_name, 'categories',
            'Category', 'Category', 'parentId',
            'PARENT'
        )

        # Step 4: Migrate embedded documents
        print("\n4. Migrating embedded documents...")

        await self.migrate_embedded_as_relationships(
            db_name, 'users',
            'User', 'addresses',
            'Address', 'HAS_ADDRESS'
        )

        await self.migrate_embedded_as_relationship_props(
            db_name, 'orders',
            'Order', 'items', 'productId',
            'Product', 'CONTAINS'
        )

        await self.migrate_embedded_as_relationship_props(
            db_name, 'products',
            'Product', 'reviews', 'userId',
            'User', 'REVIEWED'
        )

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETE")
        print("=" * 60)

# Run migration
async def main():
    etl = MongoToGeodeETL(
        mongo_uri="mongodb://localhost:27017",
        geode_host="localhost",
        geode_port=3141
    )
    await etl.run_migration("ecommerce")

asyncio.run(main())
```

### Node.js Migration Script

```javascript
const { MongoClient, ObjectId } = require('mongodb');
const { createClient } = require('@geodedb/client');

class MongoToGeodeMigration {
  constructor(mongoUri, geodeUri) {
    this.mongoUri = mongoUri;
    this.geodeUri = geodeUri;
  }

  async connect() {
    this.mongo = new MongoClient(this.mongoUri);
    await this.mongo.connect();

    this.geode = await createClient(this.geodeUri);
  }

  async close() {
    await this.mongo.close();
    await this.geode.close();
  }

  convertId(oid) {
    return oid instanceof ObjectId ? oid.toString() : oid;
  }

  transformDocument(doc, flattenFields = []) {
    const result = {};

    for (const [key, value] of Object.entries(doc)) {
      if (key === '_id') {
        result.id = this.convertId(value);
      } else if (value instanceof ObjectId) {
        // Skip - handle as relationships
        continue;
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object') {
          // Skip embedded docs - handle separately
          continue;
        }
        result[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        if (flattenFields.includes(key)) {
          for (const [subkey, subvalue] of Object.entries(value)) {
            result[`${key}_${subkey}`] = subvalue;
          }
        } else {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  async migrateCollection(dbName, collectionName, label, options = {}) {
    const collection = this.mongo.db(dbName).collection(collectionName);
    const cursor = collection.find();
    const total = await collection.countDocuments();

    console.log(`Migrating ${total} documents from ${collectionName} to ${label}`);

    let count = 0;
    const batchSize = options.batchSize || 1000;

    for await (const doc of cursor) {
      const props = this.transformDocument(doc, options.flattenFields || []);

      await this.geode.exec(
        `CREATE (n:${label} $props)`,
        { params: { props } }
      );

      count++;
      if (count % batchSize === 0) {
        console.log(`  Migrated ${count}/${total} documents...`);
      }
    }

    console.log(`  Completed: ${count} ${label} nodes created`);
  }

  async migrateReferences(dbName, collectionName, fromLabel, toLabel, refField, relType) {
    const collection = this.mongo.db(dbName).collection(collectionName);
    const cursor = collection.find({ [refField]: { $exists: true } });

    let count = 0;

    for await (const doc of cursor) {
      const refValue = doc[refField];
      if (!refValue) continue;

      const refs = Array.isArray(refValue) ? refValue : [refValue];

      for (const ref of refs) {
        if (ref instanceof ObjectId) {
          await this.geode.exec(`
            MATCH (a:${fromLabel} {id: $fromId})
            MATCH (b:${toLabel} {id: $toId})
            CREATE (a)-[:${relType}]->(b)
          `, {
            params: {
              fromId: this.convertId(doc._id),
              toId: this.convertId(ref)
            }
          });
          count++;
        }
      }
    }

    console.log(`Created ${count} ${relType} relationships`);
  }

  async run(dbName) {
    await this.connect();

    try {
      console.log('Creating indexes...');
      await this.geode.exec('CREATE INDEX user_id ON :User(id)');
      await this.geode.exec('CREATE INDEX product_id ON :Product(id)');

      console.log('\nMigrating collections...');
      await this.migrateCollection(dbName, 'users', 'User', {
        flattenFields: ['profile']
      });
      await this.migrateCollection(dbName, 'products', 'Product');
      await this.migrateCollection(dbName, 'orders', 'Order');

      console.log('\nMigrating references...');
      await this.migrateReferences(dbName, 'orders', 'Order', 'User', 'userId', 'PLACED_BY');
      await this.migrateReferences(dbName, 'products', 'Product', 'Category', 'categoryId', 'IN_CATEGORY');

      console.log('\nMigration complete!');
    } finally {
      await this.close();
    }
  }
}

// Run
const migration = new MongoToGeodeMigration(
  'mongodb://localhost:27017',
  'geode://localhost:3141'
);
migration.run('ecommerce').catch(console.error);
```

## Validation

### Data Validation Script

```python
async def validate_migration(mongo_client, geode_client, db_name):
    """Validate migration completeness."""
    print("=" * 60)
    print("MIGRATION VALIDATION")
    print("=" * 60)

    db = mongo_client[db_name]

    # Collection to label mapping
    mappings = [
        ('users', 'User'),
        ('products', 'Product'),
        ('orders', 'Order'),
        ('categories', 'Category'),
    ]

    all_passed = True

    # 1. Count validation
    print("\n1. NODE COUNT VALIDATION")
    print("-" * 40)

    for collection_name, label in mappings:
        mongo_count = await db[collection_name].count_documents({})

        async with geode_client.connection() as conn:
            page, _ = await conn.query(
                f"MATCH (n:{label}) RETURN count(n) AS c"
            )
            geode_count = page.rows[0]['c'].as_int

        status = "PASS" if mongo_count == geode_count else "FAIL"
        if status == "FAIL":
            all_passed = False
        print(f"  {label}: MongoDB={mongo_count}, Geode={geode_count} [{status}]")

    # 2. Sample data validation
    print("\n2. SAMPLE DATA VALIDATION")
    print("-" * 40)

    for collection_name, label in mappings:
        # Get random samples from MongoDB
        samples = await db[collection_name].aggregate([
            {"$sample": {"size": 10}}
        ]).to_list(10)

        mismatches = 0
        for doc in samples:
            mongo_id = str(doc['_id'])

            async with geode_client.connection() as conn:
                page, _ = await conn.query(
                    f"MATCH (n:{label} {{id: $id}}) RETURN n",
                    {"id": mongo_id}
                )

                if not page.rows:
                    mismatches += 1

        status = "PASS" if mismatches == 0 else f"FAIL ({mismatches} missing)"
        if mismatches > 0:
            all_passed = False
        print(f"  {label}: {status}")

    # 3. Relationship validation
    print("\n3. RELATIONSHIP VALIDATION")
    print("-" * 40)

    # Count orders with user references
    orders_with_user = await db['orders'].count_documents({"userId": {"$exists": True}})

    async with geode_client.connection() as conn:
        page, _ = await conn.query(
            "MATCH (:Order)<-[:PLACED_BY]-(:User) RETURN count(*) AS c"
        )
        geode_rels = page.rows[0]['c'].as_int

    status = "PASS" if orders_with_user == geode_rels else "FAIL"
    print(f"  Order-User relationships: MongoDB={orders_with_user}, Geode={geode_rels} [{status}]")

    print("\n" + "=" * 60)
    print(f"VALIDATION {'PASSED' if all_passed else 'FAILED'}")
    print("=" * 60)

    return all_passed
```

## Common Pitfalls

### 1. ObjectId References

**Problem**: ObjectId references aren't automatically converted.

**Solution**: Explicitly migrate references as relationships.

```python
# Always convert ObjectId to string
def convert_id(oid):
    return str(oid) if isinstance(oid, ObjectId) else oid
```

### 2. Deeply Nested Documents

**Problem**: Multi-level nested documents are hard to migrate.

**Solution**: Flatten or create intermediate nodes.

```javascript
// MongoDB deeply nested
{
  company: {
    address: {
      street: {
        name: "Main St",
        number: 123
      }
    }
  }
}

// GQL - flatten
CREATE (:Company {
  address_street_name: "Main St",
  address_street_number: 123
})

// Or create nodes
CREATE (s:Street {name: "Main St", number: 123})
CREATE (a:Address)-[:ON_STREET]->(s)
CREATE (c:Company)-[:LOCATED_AT]->(a)
```

### 3. Array of References

**Problem**: Arrays of ObjectIds need individual relationships.

**Solution**: Iterate and create relationships for each.

```python
# MongoDB
{ followers: [ObjectId("..."), ObjectId("..."), ...] }

# GQL - create relationship for each
for follower_id in doc['followers']:
    await conn.execute("""
        MATCH (u:User {id: $user_id})
        MATCH (f:User {id: $follower_id})
        CREATE (f)-[:FOLLOWS]->(u)
    """, {"user_id": user_id, "follower_id": str(follower_id)})
```

### 4. Schema-less Diversity

**Problem**: Same collection has documents with different shapes.

**Solution**: Use multiple labels or handle optional properties.

```gql
// Handle optional properties with COALESCE
MATCH (p:Product)
RETURN p.name, COALESCE(p.isbn, 'N/A') AS isbn

// Or use multiple labels
CREATE (:Product:Book {name: "...", isbn: "..."})
CREATE (:Product:Electronics {name: "...", voltage: 110})
```

### 5. Timestamp Handling

**Problem**: MongoDB ISODate needs conversion.

**Solution**: Convert to ISO string or Geode timestamp.

```python
from datetime import datetime

def convert_date(mongo_date):
    if isinstance(mongo_date, datetime):
        return mongo_date.isoformat()
    return mongo_date
```

### 6. Binary Data

**Problem**: MongoDB Binary (BSON) data can't be stored directly.

**Solution**: Store as base64 or external reference.

```python
import base64

def convert_binary(binary_data):
    if binary_data:
        return base64.b64encode(binary_data).decode('utf-8')
    return None
```

### 7. Geospatial Data

**Problem**: MongoDB's geospatial features don't map directly.

**Solution**: Store coordinates as properties.

```javascript
// MongoDB
{ location: { type: "Point", coordinates: [-73.9857, 40.7484] } }

// GQL
CREATE (:Location {
  longitude: -73.9857,
  latitude: 40.7484
})
```

## Migration Checklist

### Pre-Migration
- [ ] Analyze MongoDB schema and collections
- [ ] Identify embedded documents and references
- [ ] Plan node labels and relationship types
- [ ] Document conversion strategy for each collection
- [ ] Estimate migration time and resources

### Schema Design
- [ ] Design node labels and properties
- [ ] Design relationship types and properties
- [ ] Decide embedding vs. extraction for each case
- [ ] Create Geode indexes and constraints

### Data Migration
- [ ] Implement ETL pipeline
- [ ] Test with sample data
- [ ] Run full migration
- [ ] Validate node counts
- [ ] Validate relationship counts
- [ ] Verify data integrity

### Application Migration
- [ ] Update data access layer
- [ ] Translate MongoDB queries to GQL
- [ ] Update connection configuration
- [ ] Handle error mapping
- [ ] Test all operations

### Validation
- [ ] Run data validation scripts
- [ ] Execute query equivalence tests
- [ ] Perform load testing
- [ ] Verify backup procedures

### Cutover
- [ ] Plan maintenance window
- [ ] Prepare rollback procedure
- [ ] Execute final sync
- [ ] Switch application
- [ ] Monitor for errors
- [ ] Decommission MongoDB access

## Resources

- [GQL Reference](/docs/gql-reference/)
- [Graph Modeling Guide](/guides/graph-modeling/)
- [Query Performance](/guides/query-performance/)
- [Client Libraries](/clients/)

## Getting Help

If you encounter issues during migration:

- [Documentation](https://docs.geodedb.com)
- [GitLab Issues](https://gitlab.com/devnw/codepros/geode/geode/-/issues)
- [Community Forum](https://forum.geodedb.com)
- [Email Support](mailto:support@geodedb.com)
