---
title: "Graph Schema Design Guide"
description: "Best practices for designing graph schemas and modeling domains as property graphs in Geode including node labels, relationship types, and property strategies."
summary: "Learn how to design effective graph schemas with proper labeling, relationship modeling, and property management for optimal query performance."
slug: "schema-design"
url: "/docs/guides/schema-design/"
aliases: []
date: "2026-01-23"
lastmod: "2026-01-23"
draft: false
weight: 20
keywords: ["graph schema design", "graph modeling", "property graph patterns", "database schema best practices", "graph database design", "node labels", "relationship types"]
tags: ["schema", "modeling", "design", "best-practices"]
categories: ["Guides", "Graph Modeling"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/guides/schema-design/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

## Overview

Designing an effective graph schema is critical for query performance, maintainability, and accurately representing your domain. This guide covers best practices for modeling data as property graphs in Geode.

**Key Principles:**

1. **Model the domain, not the data** - Think in relationships, not tables
2. **Optimize for queries, not storage** - Denormalization is often beneficial
3. **Use labels for types, properties for attributes** - Clear separation of concerns
4. **Make relationships meaningful** - Every edge should represent a real connection

**Quick Links:**

- [Property Graph Fundamentals](#property-graph-fundamentals)
- [Node Label Design](#node-label-design)
- [Relationship Type Design](#relationship-type-design)
- [Property Design Patterns](#property-design-patterns)
- [Domain Examples](#domain-examples)
- [Common Antipatterns](#common-antipatterns)

---

## Property Graph Fundamentals

### Core Concepts

A **property graph** consists of:

1. **Nodes** (vertices) - Entities in your domain
   - Have one or more **labels** (types/categories)
   - Contain **properties** (key-value pairs)
   - Uniquely identified by internal ID

2. **Relationships** (edges) - Connections between nodes
   - Have exactly one **type** (name)
   - Are **directed** (have start and end nodes)
   - Contain **properties** (key-value pairs)
   - Uniquely identified by internal ID

3. **Properties** - Key-value attributes
   - Keys are strings
   - Values can be 50+ data types (strings, numbers, dates, vectors, etc.)
   - Stored on nodes or relationships

### Example Graph

```gql
-- Nodes with labels and properties
(alice:Person {name: "Alice", age: 30, email: "[email protected]"})
(bob:Person {name: "Bob", age: 25})
(acme:Company {name: "Acme Corp", founded: 2010})

-- Relationships with types and properties
(alice)-[:KNOWS {since: 2020, closeness: 0.8}]->(bob)
(alice)-[:WORKS_AT {role: "Engineer", since: 2022}]->(acme)
```

---

## Node Label Design

### Labeling Strategy

**Labels represent entity types** - Use them to categorize nodes.

#### ✅ Good Labeling Patterns

**1. Use Clear, Singular Nouns**

```gql
-- GOOD
Person, Company, Product, Order, Review

-- BAD
People, Companies, person_table, usr
```

**2. Use Multi-Label for Subtypes**

```gql
-- GOOD: Person with specific roles
(alice:Person:Employee {name: "Alice"})
(bob:Person:Customer {name: "Bob"})
(charlie:Person:Employee:Manager {name: "Charlie"})

-- Query specific subtypes
MATCH (e:Employee) RETURN e          -- All employees
MATCH (m:Manager) RETURN m           -- All managers
MATCH (p:Person:!Employee) RETURN p  -- People who aren't employees
```

**3. Use Meaningful Hierarchies**

```gql
-- GOOD: Product categories
(laptop:Product:Electronics:Computer {brand: "Dell"})
(shirt:Product:Clothing:Apparel {size: "M"})

-- Query at different levels
MATCH (e:Electronics) RETURN e       -- All electronics
MATCH (c:Computer) RETURN c          -- Just computers
```

#### ❌ Bad Labeling Antipatterns

**1. Encoding Values in Labels (Dynamic Labels)**

```gql
-- BAD: Don't create labels from data
(alice:Person:Age30:Female {name: "Alice"})

-- GOOD: Use properties
(alice:Person {name: "Alice", age: 30, gender: "female"})
```

**2. Too Many Labels**

```gql
-- BAD: Label explosion
(alice:Person:Employee:Engineer:Senior:FullStack:JavaScript:Remote)

-- GOOD: Use selective labels + properties
(alice:Person:Employee {
  name: "Alice",
  level: "Senior",
  role: "Engineer",
  stack: "FullStack",
  skills: ["JavaScript", "Python"],
  location: "Remote"
})
```

**3. Generic Labels**

```gql
-- BAD: Too generic, hard to query
(thing1:Entity {type: "person", name: "Alice"})
(thing2:Entity {type: "company", name: "Acme"})

-- GOOD: Specific labels
(alice:Person {name: "Alice"})
(acme:Company {name: "Acme"})
```

### Label Naming Conventions

| Convention | Example | Use Case |
|------------|---------|----------|
| **PascalCase** | `Person`, `OrderItem` | Recommended - clear, standard |
| **UPPER_SNAKE** | `PURCHASE_ORDER` | Legacy systems integration |
| **Namespacing** | `app:User`, `sys:Config` | Multi-tenant or modular systems |

**Recommendation**: Use **PascalCase** for consistency with GQL standards.

```gql
-- Recommended naming
CREATE (p:Person {name: "Alice"})
CREATE (o:PurchaseOrder {id: 12345})
CREATE (li:LineItem {quantity: 5})
```

---

## Relationship Type Design

### Relationship Naming

**Relationship types describe the connection** - Use verbs or verb phrases.

#### ✅ Good Relationship Patterns

**1. Use Active Verbs (Past or Present Tense)**

```gql
-- GOOD: Clear, descriptive
(alice:Person)-[:KNOWS]->(bob:Person)
(alice:Person)-[:WORKS_AT]->(acme:Company)
(order:Order)-[:CONTAINS]->(item:Product)
(user:User)-[:PURCHASED]->(product:Product)
(employee:Employee)-[:REPORTS_TO]->(manager:Employee)
```

**2. Direction Matters**

```gql
-- GOOD: Relationship direction is meaningful
(parent:Person)-[:PARENT_OF]->(child:Person)

-- Query respects direction
MATCH (p:Person)-[:PARENT_OF]->(c:Person)
RETURN p.name AS parent, c.name AS child

-- Reverse direction
MATCH (c:Person)<-[:PARENT_OF]-(p:Person)
RETURN p.name AS parent, c.name AS child
```

**3. Use Specific Types**

```gql
-- GOOD: Specific relationship types
(alice:Person)-[:MANAGES]->(team:Team)
(alice:Person)-[:WORKS_ON]->(project:Project)
(alice:Person)-[:MENTORS]->(bob:Person)

-- BAD: Generic types
(alice:Person)-[:RELATED_TO {type: "manages"}]->(team:Team)
```

#### ❌ Bad Relationship Antipatterns

**1. Encoding Values in Type Names**

```gql
-- BAD: Dynamic relationship types
(alice)-[:KNOWS_SINCE_2020]->(bob)
(alice)-[:FRIEND_CLOSENESS_0.8]->(charlie)

-- GOOD: Use properties
(alice)-[:KNOWS {since: 2020}]->(bob)
(alice)-[:FRIEND {closeness: 0.8}]->(charlie)
```

**2. Bidirectional Relationships**

```gql
-- BAD: Creating duplicate relationships
(alice)-[:KNOWS]->(bob)
(bob)-[:KNOWS]->(alice)

-- GOOD: Use single direction + queries
(alice)-[:KNOWS]->(bob)

-- Query both directions
MATCH (a:Person)-[:KNOWS]-(b:Person)  -- Ignores direction
WHERE a.name = "Alice"
RETURN b.name
```

**3. Missing Relationship Types**

```gql
-- BAD: Properties on nodes instead of relationships
(alice:Person {friendsWith: ["Bob", "Charlie"]})

-- GOOD: Explicit relationships
(alice:Person)-[:KNOWS]->(bob:Person)
(alice:Person)-[:KNOWS]->(charlie:Person)
```

### Relationship Properties

**Properties on relationships capture connection metadata**.

```gql
-- Social network relationships
(alice)-[:KNOWS {
  since: date('2020-01-15'),
  strength: 0.8,
  context: "university",
  interactions: 147
}]->(bob)

-- Employment relationships
(alice)-[:WORKS_AT {
  role: "Senior Engineer",
  department: "Engineering",
  startDate: date('2022-03-01'),
  salary: 150000,
  employmentType: "full-time"
}]->(acme)

-- Transaction relationships
(order)-[:CONTAINS {
  quantity: 3,
  unitPrice: 29.99,
  discount: 0.1,
  addedAt: timestamp()
}]->(product)
```

---

## Property Design Patterns

### Property Selection

**Properties store attributes of nodes and relationships**.

#### ✅ When to Use Properties

1. **Attributes of the entity itself**

```gql
(person:Person {
  name: "Alice",
  age: 30,
  email: "[email protected]",
  bio: "Software engineer..."
})
```

2. **Frequently filtered/sorted values**

```gql
-- Create indexes for these
(product:Product {
  price: 29.99,        -- Frequently filtered
  category: "Books",   -- Frequently filtered
  rating: 4.5,         -- Frequently sorted
  stock: 100
})

-- Efficient queries
CREATE INDEX product_price ON Product(price);
MATCH (p:Product) WHERE p.price < 50 RETURN p;
```

3. **Temporal data**

```gql
(event:Event {
  title: "Launch Party",
  startTime: timestamp('2026-03-15T19:00:00Z'),
  endTime: timestamp('2026-03-15T23:00:00Z'),
  timezone: 'America/New_York'
})
```

#### ❌ When NOT to Use Properties

**1. Relationships Disguised as Properties**

```gql
-- BAD: Lists of related IDs
(person:Person {
  name: "Alice",
  friendIds: [10, 20, 30, 40]  -- Don't do this
})

-- GOOD: Explicit relationships
(alice:Person)-[:KNOWS]->(bob:Person)
(alice:Person)-[:KNOWS]->(charlie:Person)
```

**2. Computed/Aggregated Data (Usually)**

```gql
-- BAD: Redundant computed values
(person:Person {
  name: "Alice",
  friendCount: 15,      -- This can be queried
  avgFriendAge: 28.5    -- This can be computed
})

-- GOOD: Compute on demand
MATCH (p:Person {name: "Alice"})-[:KNOWS]->(friend)
RETURN p.name, count(friend) AS friendCount, avg(friend.age) AS avgFriendAge

-- EXCEPTION: Precompute for performance (materialized views/caching)
-- If counting friends is very slow, denormalize
(person:Person {name: "Alice", cachedFriendCount: 15})
-- But update on every friend add/remove
```

### Property Types

Geode supports 50+ data types. Choose appropriate types:

| Data Type | Use Case | Example |
|-----------|----------|---------|
| `String`, `Text` | Names, descriptions | `name: "Alice"` |
| `Int`, `BigInt` | IDs, counts | `id: 12345, age: 30` |
| `Real`, `Double` | Prices, ratings | `price: 29.99, rating: 4.5` |
| `Date`, `Timestamp` | Temporal data | `created: date('2026-01-23')` |
| `Boolean` | Flags | `active: true, verified: false` |
| `VectorF32` | ML embeddings | `embedding: vectorf32([0.1, 0.2, ...])` |
| `Json`, `Jsonb` | Semi-structured data | `metadata: jsonb('{"key": "value"}')` |
| `List` | Multiple values | `tags: ["tech", "database"]` |
| `GeoPoint` | Geographic locations | `location: geopoint(37.7749, -122.4194)` |

**Type Selection Tips**:

- **Use specific types** for better validation and performance
- **Avoid generic `Text`** when `Varchar(255)` suffices
- **Use `Jsonb`** for flexible schemas (but index key properties separately)
- **Use vectors** for similarity search (embeddings, recommendations)

---

## Domain Examples

### Example 1: Social Network

**Entities**: People, Posts, Comments, Likes
**Relationships**: KNOWS, POSTED, COMMENTED_ON, LIKED

```gql
-- Schema design
(alice:Person {
  id: 1,
  name: "Alice",
  email: "[email protected]",
  joinedAt: timestamp(),
  bio: "Software engineer"
})

(post:Post {
  id: 101,
  title: "Graph Databases",
  content: "Graph databases are...",
  createdAt: timestamp(),
  tags: ["tech", "databases"]
})

(comment:Comment {
  id: 501,
  content: "Great post!",
  createdAt: timestamp()
})

-- Relationships
(alice)-[:KNOWS {since: date('2020-01-01'), closeness: 0.8}]->(bob)
(alice)-[:POSTED {createdAt: timestamp()}]->(post)
(bob)-[:COMMENTED_ON {createdAt: timestamp()}]->(post)
(bob)-[:WROTE]->(comment)
(comment)-[:ON]->(post)
(alice)-[:LIKED {likedAt: timestamp()}]->(post)
```

**Key Queries**:

```gql
-- Find Alice's friends
MATCH (alice:Person {name: "Alice"})-[:KNOWS]->(friend:Person)
RETURN friend.name

-- Find posts by Alice's friends
MATCH (alice:Person {name: "Alice"})-[:KNOWS]->(friend)-[:POSTED]->(post:Post)
RETURN post.title, friend.name
ORDER BY post.createdAt DESC

-- Find popular posts (most likes)
MATCH (p:Post)<-[:LIKED]-(u:User)
RETURN p.title, count(u) AS likes
ORDER BY likes DESC
LIMIT 10
```

### Example 2: E-Commerce

**Entities**: Customer, Product, Order, LineItem, Category
**Relationships**: PURCHASED, CONTAINS, IN_CATEGORY, REVIEWED

```gql
-- Schema design
(customer:Customer {
  id: 1,
  name: "Alice",
  email: "[email protected]",
  memberSince: date('2020-01-01')
})

(product:Product {
  id: 101,
  name: "Laptop",
  price: 999.99,
  stock: 50,
  sku: "LAP-001"
})

(category:Category {
  id: 10,
  name: "Electronics",
  slug: "electronics"
})

(order:Order {
  id: 5001,
  orderDate: timestamp(),
  status: "shipped",
  total: 1049.98
})

(lineItem:LineItem {
  quantity: 1,
  unitPrice: 999.99,
  subtotal: 999.99
})

-- Relationships
(customer)-[:PURCHASED {date: timestamp()}]->(order)
(order)-[:CONTAINS]->(lineItem)
(lineItem)-[:OF_PRODUCT]->(product)
(product)-[:IN_CATEGORY]->(category)
(customer)-[:REVIEWED {rating: 5, date: timestamp()}]->(product)
```

**Key Queries**:

```gql
-- Find customer's order history
MATCH (c:Customer {email: "[email protected]"})-[:PURCHASED]->(o:Order)
      -[:CONTAINS]->(li:LineItem)-[:OF_PRODUCT]->(p:Product)
RETURN o.orderDate, o.total, collect(p.name) AS products
ORDER BY o.orderDate DESC

-- Product recommendations (customers who bought this also bought...)
MATCH (p1:Product {id: 101})<-[:OF_PRODUCT]-(:LineItem)
      <-[:CONTAINS]-(o:Order)<-[:PURCHASED]-(c:Customer)
      -[:PURCHASED]->(o2:Order)-[:CONTAINS]->(:LineItem)
      -[:OF_PRODUCT]->(p2:Product)
WHERE p1 <> p2
RETURN p2.name, count(*) AS frequency
ORDER BY frequency DESC
LIMIT 5
```

### Example 3: Knowledge Graph

**Entities**: Concept, Document, Author, Citation
**Relationships**: RELATED_TO, AUTHORED, CITES, HAS_TOPIC

```gql
-- Schema design
(concept:Concept {
  id: 1,
  name: "Graph Databases",
  definition: "A database that uses graph structures...",
  embedding: vectorf32([0.1, 0.2, 0.3, ...])  -- For similarity search
})

(doc:Document {
  id: 101,
  title: "Introduction to Graph Theory",
  abstract: "This paper introduces...",
  publishedDate: date('2025-06-15'),
  embedding: vectorf32([...])  -- For semantic search
})

(author:Author {
  id: 201,
  name: "Dr. Alice Smith",
  institution: "MIT",
  hIndex: 45
})

-- Relationships
(concept1:Concept)-[:RELATED_TO {strength: 0.8}]->(concept2:Concept)
(author)-[:AUTHORED {role: "primary"}]->(doc)
(doc)-[:HAS_TOPIC]->(concept)
(doc1)-[:CITES {context: "methodology"}]->(doc2)
```

**Key Queries**:

```gql
-- Find related concepts (via vector similarity)
MATCH (c:Concept {name: "Graph Databases"})
MATCH (related:Concept)
WHERE vector_cosine(c.embedding, related.embedding) > 0.7
  AND c <> related
RETURN related.name, vector_cosine(c.embedding, related.embedding) AS similarity
ORDER BY similarity DESC
LIMIT 10

-- Find influential papers (high citation count)
MATCH (doc:Document)<-[:CITES]-(citing:Document)
RETURN doc.title, count(citing) AS citations
ORDER BY citations DESC
LIMIT 20

-- Find collaboration networks
MATCH (a1:Author)-[:AUTHORED]->(doc:Document)<-[:AUTHORED]-(a2:Author)
WHERE a1 <> a2
RETURN a1.name, a2.name, count(doc) AS collaborations
ORDER BY collaborations DESC
```

### Example 4: Fraud Detection

**Entities**: Account, Transaction, Device, IP Address
**Relationships**: OWNS, INITIATED, USED, FROM_IP

```gql
-- Schema design
(account:Account {
  id: 1,
  accountNumber: "1234567890",
  status: "active",
  riskScore: 0.3
})

(txn:Transaction {
  id: 5001,
  amount: 150.00,
  timestamp: timestamp(),
  status: "completed",
  flagged: false
})

(device:Device {
  id: "device-abc123",
  type: "mobile",
  os: "iOS",
  fingerprint: "abcd1234..."
})

(ip:IPAddress {
  address: "192.168.1.100",
  country: "US",
  riskLevel: "low"
})

-- Relationships
(account)-[:INITIATED {timestamp: timestamp()}]->(txn)
(txn)-[:USED]->(device)
(txn)-[:FROM_IP]->(ip)
(account)-[:OWNS]->(device)
```

**Fraud Detection Queries**:

```gql
-- Find accounts using same device (account takeover)
MATCH (a1:Account)-[:OWNS]->(d:Device)<-[:OWNS]-(a2:Account)
WHERE a1 <> a2
RETURN a1.accountNumber, a2.accountNumber, d.fingerprint

-- Find transactions from high-risk IPs
MATCH (txn:Transaction)-[:FROM_IP]->(ip:IPAddress)
WHERE ip.riskLevel = "high"
RETURN txn.id, txn.amount, ip.address, ip.country

-- Detect unusual transaction patterns
MATCH (account:Account)-[:INITIATED]->(txn:Transaction)
WITH account, avg(txn.amount) AS avgAmount, collect(txn.amount) /* stddev/variance parse but are never computed; reduce client-side */ AS stdDev
MATCH (account)-[:INITIATED]->(recent:Transaction)
WHERE recent.timestamp > timestamp() - duration('PT24H')
  AND abs(recent.amount - avgAmount) > 3 * stdDev
RETURN account.accountNumber, recent.id, recent.amount, avgAmount, stdDev
```

---

## Schema Evolution

### Adding New Labels/Properties

```gql
-- Add new label to existing nodes
MATCH (e:Employee) WHERE e.role = "Manager"
SET e:Manager

-- Add new property with default
MATCH (p:Product) WHERE p.stock IS NULL
SET p.stock = 0

-- Add computed property
MATCH (p:Person)-[k:KNOWS]->(friend)
WITH p, count(friend) AS friendCount
SET p.cachedFriendCount = friendCount
```

### Migrating Relationships

```gql
-- Split generic relationship into specific types
MATCH (a:Account)-[r:RELATED_TO {type: "owns"}]->(b:Account)
CREATE (a)-[:OWNS {since: r.createdAt}]->(b)
DELETE r

-- Merge duplicate relationships
MATCH (a:Person)-[r:KNOWS]->(b:Person)
WITH a, b, collect(r) AS rels
WHERE size(rels) > 1
CREATE (a)-[:KNOWS {since: min([rel IN rels | rel.since])}]->(b)
FOREACH (rel IN rels | DELETE rel)
```

### Handling Breaking Changes

```gql
-- Create new property, migrate, then deprecate old
-- Step 1: Add new property
MATCH (p:Product)
SET p.priceInCents = toInt(p.price * 100)

-- Step 2: Update application to use priceInCents

-- Step 3: Remove old property (after migration)
MATCH (p:Product)
REMOVE p.price
```

---

## Common Antipatterns

### ❌ Antipattern 1: Treating Graph Like Relational

**Bad**:

```gql
-- Treating nodes as relational tables with foreign keys
(order:Order {id: 1, customerId: 42, productId: 101})
```

**Good**:

```gql
-- Use explicit relationships
(customer:Customer {id: 42})-[:PURCHASED]->(order:Order {id: 1})
(order)-[:CONTAINS]->(:LineItem)-[:OF_PRODUCT]->(product:Product {id: 101})
```

### ❌ Antipattern 2: Dense Nodes (Supernodes)

**Problem**: Nodes with millions of relationships cause performance issues.

**Bad**:

```gql
-- Every user connected to same "System" node
(user1:User)-[:REGISTERED_IN]->(system:System)
(user2:User)-[:REGISTERED_IN]->(system:System)
-- ... millions of users
```

**Good**:

```gql
-- Partition by time/category
(user1:User {registeredAt: timestamp()})
(user2:User {registeredAt: timestamp()})

-- Or use properties instead
(user:User {systemId: "main", registeredAt: timestamp()})
```

### ❌ Antipattern 3: Over-Indexing

**Bad**:

```gql
-- Creating indexes on every property
CREATE INDEX person_name ON Person(name);
CREATE INDEX person_age ON Person(age);
CREATE INDEX person_email ON Person(email);
CREATE INDEX person_city ON Person(city);
CREATE INDEX person_zip ON Person(zip);
CREATE INDEX person_created ON Person(createdAt);
-- Too many indexes slow down writes
```

**Good**:

```gql
-- Index only frequently queried/filtered properties
CREATE INDEX person_email ON Person(email);  -- Unique lookups
CREATE INDEX person_name ON Person(name);    -- Search by name

-- Skip indexes on rarely queried properties
```

### ❌ Antipattern 4: Ignoring Cardinality

**Problem**: Not considering relationship cardinality.

**Bad**:

```gql
-- Many-to-many without intermediate node
(student:Student)-[:ENROLLED_IN {grade: "A"}]->(course:Course)
-- What if student takes course multiple times?
```

**Good**:

```gql
-- Use intermediate node for many-to-many
(student:Student)-[:HAS]->(enrollment:Enrollment {
  grade: "A",
  semester: "Fall 2025",
  year: 2025
})-[:IN]->(course:Course)
```

---

## Performance Considerations

### Indexing Strategy

**Index properties used in**:

1. **Exact matches**: `WHERE p.email = '[email protected]'`
2. **Range queries**: `WHERE p.age > 30`
3. **Sorting**: `ORDER BY p.name`

```gql
-- Create appropriate index types
CREATE INDEX person_email ON Person(email);           -- B-tree for exact/range
CREATE INDEX person_bio ON Person(bio) USING fulltext;     -- Full-text search
CREATE INDEX doc_embed ON Document(embedding) USING vector; -- Vector similarity
CREATE INDEX loc_coords ON Location(coords) USING spatial;  -- Geo queries
```

### Query Optimization

**Principle**: Start with specific, indexed lookups, then expand.

```gql
-- GOOD: Start with indexed lookup
MATCH (alice:Person {email: "[email protected]"})  -- Index seek
MATCH (alice)-[:KNOWS]->(friend)
RETURN friend.name

-- BAD: Full scan first
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.email = "[email protected]"  -- Scans all persons first
RETURN friend.name
```

---

## Next Steps

- [Data Types Reference](/docs/model/data-model-and-types/) - Complete type system
- [Query Performance](/docs/query/performance-tuning/) - Optimize queries with EXPLAIN/PROFILE
- [Indexing Guide](/docs/query/indexing-and-optimization/) - Index types and strategies
- [GQL Guide](/docs/gql/guide/) - Query language syntax
- [Migration Guide](/docs/guides/migration-guide/) - Migrate from other graph databases
