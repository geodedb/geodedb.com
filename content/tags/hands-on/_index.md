---
title: "Hands-On Learning"
description: "Hands-on learning resources for Geode graph database. Interactive exercises, practical challenges, and real-world scenarios to master graph database development."
keywords:
  - hands-on learning
  - practical exercises
  - interactive tutorial
  - coding challenges
  - learn by doing
  - practice exercises
  - real-world examples
  - interactive guide
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/hands-on/"
    noindex: false
---

# Hands-On Learning

Hands-on learning provides the fastest path to mastering Geode through practical exercises, interactive challenges, and real-world scenarios. Learn by building, not just reading.

## Interactive Learning Philosophy

**Active Engagement**: Type every query yourself. Copy-paste teaches syntax; typing builds muscle memory and understanding.

**Immediate Feedback**: Execute queries and see results instantly. When something doesn't work, you learn why and how to fix it.

**Progressive Challenges**: Start simple and increase complexity gradually. Each exercise builds on previous knowledge while introducing new concepts.

**Real-World Context**: Work with realistic datasets and scenarios—social networks, e-commerce systems, knowledge graphs—not toy examples.

## Exercise 1: Building Your First Social Network (30 minutes)

### Setup

```bash
# Start Geode and connect
./zig-out/bin/geode serve --listen localhost:3141 &
./zig-out/bin/geode shell
```

### Task 1.1: Create User Profiles

Create 5 users with varying ages and locations:

```gql
CREATE (alice:Person {name: 'Alice', age: 30, city: 'New York'})
CREATE (bob:Person {name: 'Bob', age: 25, city: 'San Francisco'})
CREATE (carol:Person {name: 'Carol', age: 28, city: 'New York'})
CREATE (dave:Person {name: 'Dave', age: 35, city: 'Chicago'})
CREATE (eve:Person {name: 'Eve', age: 27, city: 'San Francisco'})
```

**Verification**: Run `MATCH (p:Person) RETURN count(p)` - should return 5.

### Task 1.2: Add Friendships

Create relationships between users:

```gql
MATCH (alice:Person {name: 'Alice'})
MATCH (bob:Person {name: 'Bob'})
CREATE (alice)-[:KNOWS {since: 2020}]->(bob)
```

**Challenge**: Add 6 more friendships forming a connected network. Make some bidirectional by creating relationships in both directions.

### Task 1.3: Query Your Network

Find all of Alice's friends:

```gql
MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend)
RETURN friend.name, friend.city
```

**Challenge Questions**:
1. Who lives in the same city as Alice?
2. Who has the most friends?
3. Find all friends-of-friends for Bob who aren't direct friends

<details>
<summary>Solutions</summary>

```gql
-- Same city as Alice
MATCH (alice:Person {name: 'Alice'})
MATCH (other:Person {city: alice.city})
WHERE other <> alice
RETURN other.name

-- Most friends
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN p.name, COUNT(friend) as friend_count
ORDER BY friend_count DESC
LIMIT 1

-- Friends of friends
MATCH (bob:Person {name: 'Bob'})-[:KNOWS]->(friend)-[:KNOWS]->(fof)
WHERE NOT (bob)-[:KNOWS]->(fof) AND bob <> fof
RETURN DISTINCT fof.name
```
</details>

## Exercise 2: E-Commerce Recommendation Engine (45 minutes)

### Setup Data

```gql
-- Create products
CREATE (laptop:Product {id: 'p1', name: 'Laptop', price: 999, category: 'Electronics'})
CREATE (mouse:Product {id: 'p2', name: 'Mouse', price: 29, category: 'Electronics'})
CREATE (keyboard:Product {id: 'p3', name: 'Keyboard', price: 79, category: 'Electronics'})
CREATE (desk:Product {id: 'p4', name: 'Desk', price: 299, category: 'Furniture'})
CREATE (chair:Product {id: 'p5', name: 'Chair', price: 199, category: 'Furniture'})

-- Create users
CREATE (u1:User {id: 'u1', name: 'Alice'})
CREATE (u2:User {id: 'u2', name: 'Bob'})
CREATE (u3:User {id: 'u3', name: 'Carol'})

-- Purchase history
MATCH (u1:User {id: 'u1'}), (laptop:Product {id: 'p1'})
CREATE (u1)-[:PURCHASED {at: '2025-01-01'}]->(laptop)

MATCH (u1:User {id: 'u1'}), (mouse:Product {id: 'p2'})
CREATE (u1)-[:PURCHASED {at: '2025-01-02'}]->(mouse)

MATCH (u2:User {id: 'u2'}), (laptop:Product {id: 'p1'})
CREATE (u2)-[:PURCHASED {at: '2025-01-03'}]->(laptop)

MATCH (u2:User {id: 'u2'}), (keyboard:Product {id: 'p3'})
CREATE (u2)-[:PURCHASED {at: '2025-01-04'}]->(keyboard)
```

### Task 2.1: Basic Recommendations

Write a query that recommends products to Alice based on what users with similar purchases bought:

```gql
MATCH (alice:User {id: 'u1'})-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(other:User)-[:PURCHASED]->(rec:Product)
WHERE NOT (alice)-[:PURCHASED]->(rec)
RETURN rec.name, rec.price, COUNT(*) as relevance
ORDER BY relevance DESC, rec.price ASC
```

**Challenge**: Modify to only recommend products under $100 in the Electronics category.

### Task 2.2: Product Similarity

Create similarity relationships between products:

```gql
MATCH (p1:Product), (p2:Product)
WHERE p1.category = p2.category AND p1 <> p2
CREATE (p1)-[:SIMILAR_TO {reason: 'same_category'}]->(p2)
```

**Challenge**: Create a query that recommends "frequently bought together" products based on users who bought both.

### Task 2.3: Category Browsing

```gql
MATCH (p:Product {category: 'Electronics'})
RETURN p.name, p.price
ORDER BY p.price DESC
```

**Challenge**: Add pagination (SKIP/LIMIT) and price range filtering.

## Exercise 3: Knowledge Graph Navigation (45 minutes)

### Setup Hierarchical Data

```gql
-- Create topic hierarchy
CREATE (root:Topic {name: 'Computer Science'})
CREATE (ai:Topic {name: 'Artificial Intelligence'})
CREATE (ml:Topic {name: 'Machine Learning'})
CREATE (dl:Topic {name: 'Deep Learning'})
CREATE (cv:Topic {name: 'Computer Vision'})
CREATE (nlp:Topic {name: 'Natural Language Processing'})

-- Create hierarchy
MATCH (root:Topic {name: 'Computer Science'})
MATCH (ai:Topic {name: 'Artificial Intelligence'})
CREATE (ai)-[:SUBTOPIC_OF]->(root)

MATCH (ai:Topic {name: 'Artificial Intelligence'})
MATCH (ml:Topic {name: 'Machine Learning'})
CREATE (ml)-[:SUBTOPIC_OF]->(ai)

MATCH (ml:Topic {name: 'Machine Learning'})
MATCH (dl:Topic {name: 'Deep Learning'})
CREATE (dl)-[:SUBTOPIC_OF]->(ml)

-- Add more connections...
```

### Task 3.1: Tree Traversal

Find all subtopics of a topic at any depth:

```gql
MATCH (parent:Topic {name: 'Artificial Intelligence'})
       <-[:SUBTOPIC_OF*]-(child:Topic)
RETURN child.name, length(path) as depth
ORDER BY depth, child.name
```

**Challenge**: Find the path from 'Deep Learning' to 'Computer Science' and list all intermediate topics.

### Task 3.2: Related Concepts

Add cross-cutting relationships:

```gql
MATCH (cv:Topic {name: 'Computer Vision'})
MATCH (dl:Topic {name: 'Deep Learning'})
CREATE (cv)-[:RELATED_TO {strength: 0.9}]->(dl)
```

**Challenge**: Find all topics within 2 hops of 'Natural Language Processing' (ignoring hierarchy).

## Exercise 4: Access Control with Row-Level Security (30 minutes)

### Task 4.1: Multi-Tenant Data

```gql
-- Create organizations
CREATE (orgA:Organization {id: 'org1', name: 'Acme Corp'})
CREATE (orgB:Organization {id: 'org2', name: 'TechStart Inc'})

-- Create users belonging to organizations
CREATE (u1:User {id: 'u1', name: 'Alice', org_id: 'org1'})
CREATE (u2:User {id: 'u2', name: 'Bob', org_id: 'org1'})
CREATE (u3:User {id: 'u3', name: 'Carol', org_id: 'org2'})

-- Link users to organizations
MATCH (u:User {id: 'u1'}), (org:Organization {id: 'org1'})
CREATE (u)-[:BELONGS_TO]->(org)
```

### Task 4.2: Filtered Queries

Write a query that only returns users from Alice's organization:

```gql
MATCH (current:User {id: 'u1'})-[:BELONGS_TO]->(org:Organization)
MATCH (coworker:User)-[:BELONGS_TO]->(org)
WHERE coworker <> current
RETURN coworker.name
```

**Challenge**: Create a view or parameterized query that automatically filters based on the current user's organization.

## Exercise 5: Performance Optimization (45 minutes)

### Task 5.1: Create Sample Data

```python
import asyncio
from geode_client import GeodeClient

async def load_data():
    async with GeodeClient("localhost:3141") as client:
        # Create 1000 users
        for i in range(1000):
            await client.execute("""
                CREATE (u:User {
                    id: $id,
                    name: $name,
                    email: $email,
                    created_at: $timestamp
                })
            """, id=f"user{i}", name=f"User {i}",
                 email=f"user{i}@example.com",
                 timestamp="2025-01-01T00:00:00Z")

asyncio.run(load_data())
```

### Task 5.2: Profile Slow Query

```gql
-- Run this query and note the execution time
PROFILE MATCH (u:User {email: 'user500@example.com'})
RETURN u.name, u.created_at
```

**Challenge**: Create an index on email and compare execution time:

```gql
CREATE INDEX ON User(email)

-- Re-run the profile query
PROFILE MATCH (u:User {email: 'user500@example.com'})
RETURN u.name, u.created_at
```

### Task 5.3: Identify Cartesian Products

```gql
-- This query is inefficient - why?
MATCH (u:User), (p:Product)
RETURN count(*)
```

**Challenge**: Rewrite using proper relationship patterns.

## Exercise 6: Transaction Management (30 minutes)

### Task 6.1: Banking Transfer

Implement an atomic money transfer:

```python
async def transfer(client, from_id, to_id, amount):
    async with client.transaction() as tx:
        # Check sender balance
        result = await tx.execute("""
            MATCH (sender:Account {id: $id})
            RETURN sender.balance
        """, id=from_id)

        row = await result.first()
        if row['sender.balance'] < amount:
            raise Exception("Insufficient funds")

        # Deduct from sender
        await tx.execute("""
            MATCH (sender:Account {id: $id})
            SET sender.balance = sender.balance - $amount
        """, id=from_id, amount=amount)

        # Add to receiver
        await tx.execute("""
            MATCH (receiver:Account {id: $id})
            SET receiver.balance = receiver.balance + $amount
        """, id=to_id, amount=amount)

        # Transaction commits automatically if no exceptions
```

**Challenge**: Add rollback handling for various failure scenarios.

### Task 6.2: Savepoints

```python
async def complex_operation(client):
    async with client.transaction() as tx:
        await tx.execute("CREATE (u:User {id: 'temp1', name: 'Test'})")

        sp = await tx.savepoint("checkpoint")

        try:
            # Risky operation
            await tx.execute("CREATE (u:User {id: 'temp1'})") # Duplicate!
        except Exception:
            await tx.rollback_to(sp)  # Rollback to savepoint

        await tx.execute("CREATE (u:User {id: 'temp2'})")
```

**Challenge**: Implement a multi-step import process with savepoints after each batch.

## Hands-On Challenges

### Challenge 1: Shortest Path

Find the shortest path between any two nodes in your social network. Calculate the degrees of separation.

### Challenge 2: Influence Scoring

Implement a query that calculates influence scores based on connection count and friend influence (recursive).

### Challenge 3: Real-Time Feeds

Build a query that returns the latest posts from friends, ordered by timestamp with pagination.

### Challenge 4: Fraud Detection

Create a graph of financial transactions and write queries to detect suspicious patterns (circular transfers, velocity rules).

### Challenge 5: Recommendation Diversity

Modify the recommendation engine to balance relevance with diversity (different categories, price ranges).

## Learning Labs

### Lab 1: Schema Design Workshop

Given a business domain (e.g., healthcare, logistics, media), design a complete graph schema. Create sample data and write 10 queries covering common use cases.

### Lab 2: Migration Project

Take an existing relational database schema and migrate it to Geode. Write queries that demonstrate improved performance for relationship-heavy queries.

### Lab 3: Performance Tuning

Start with slow queries, profile them, add indexes strategically, and measure improvements. Document your optimization process.

### Lab 4: Security Hardening

Implement a complete security model with authentication, role-based access, and row-level security for a multi-tenant application.

## Related Topics

- **Tutorials**: Structured learning paths with explanations
- **Examples**: Copy-paste ready code snippets
- **Getting Started**: Foundation concepts and setup
- **Developer Guide**: Complete API reference
- **Quickstart**: Fast-track guides for immediate productivity
