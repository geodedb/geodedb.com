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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

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
geode serve --listen localhost:3141 &
geode shell
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

## Challenge Solutions and Hints

### Shortest Path Challenge Solution

```gql
-- Find degrees of separation between any two users
MATCH path = SHORTEST_PATH((a:User {name: 'Alice'})-[:KNOWS*]-(b:User {name: 'Eve'}))
RETURN length(path) AS degrees_of_separation,
       [node IN nodes(path) | node.name] AS path_names;

-- Find all paths within certain degree
MATCH path = (a:User {name: 'Alice'})-[:KNOWS*1..3]-(b:User)
WHERE a <> b
RETURN b.name, length(path) AS degree
ORDER BY degree, b.name;
```

### Influence Scoring Challenge Solution

```gql
-- Calculate PageRank-style influence
WITH collect(DISTINCT n) AS all_users
UNWIND all_users AS user
MATCH (user:User)
OPTIONAL MATCH (user)-[:KNOWS]->(friend:User)
WITH user,
     COUNT(friend) AS direct_influence,
     COLLECT(friend) AS friends
UNWIND friends AS friend
OPTIONAL MATCH (friend)-[:KNOWS]->(fof:User)
WITH user, direct_influence,
     AVG(COUNT(fof)) AS avg_friend_influence
RETURN user.name,
       direct_influence,
       avg_friend_influence,
       direct_influence + (avg_friend_influence * 0.5) AS total_influence
ORDER BY total_influence DESC;
```

### Real-Time Feed Challenge Solution

```gql
-- Latest posts from friends with pagination
MATCH (current:User {id: $user_id})-[:FOLLOWS]->(friend:User)-[:POSTED]->(post:Post)
RETURN friend.name,
       post.content,
       post.timestamp,
       post.likes_count
ORDER BY post.timestamp DESC
SKIP $offset
LIMIT $page_size;

-- With comment count
MATCH (current:User {id: $user_id})-[:FOLLOWS]->(friend:User)-[:POSTED]->(post:Post)
OPTIONAL MATCH (post)<-[:COMMENTED]-(comment:Comment)
WITH friend, post, COUNT(comment) AS comment_count
RETURN friend.name,
       post.content,
       post.timestamp,
       post.likes_count,
       comment_count
ORDER BY post.timestamp DESC
SKIP $offset
LIMIT $page_size;
```

### Fraud Detection Challenge Solution

```gql
-- Detect circular payment patterns
MATCH path = (a:Account)-[:PAYMENT*3..5]->(a)
WHERE ALL(r IN relationships(path) WHERE r.amount > 1000)
  AND ALL(n IN nodes(path) WHERE SIZE([(n)-[:PAYMENT]->() | 1]) > 5)
RETURN path,
       [r IN relationships(path) | r.amount] AS amounts,
       REDUCE(total = 0, r IN relationships(path) | total + r.amount) AS total_amount;

-- Velocity check: Too many transactions in short time
MATCH (a:Account)-[t:PAYMENT]->()
WHERE t.timestamp > CURRENT_TIMESTAMP - INTERVAL '1' HOUR
WITH a, COUNT(t) AS tx_count, SUM(t.amount) AS total_amount
WHERE tx_count > 10 OR total_amount > 50000
RETURN a.id, tx_count, total_amount
ORDER BY tx_count DESC;

-- Unusual pattern: Receive then immediately send similar amount
MATCH (a:Account)<-[r1:PAYMENT]-(sender)
WHERE r1.timestamp > CURRENT_TIMESTAMP - INTERVAL '24' HOUR
MATCH (a)-[r2:PAYMENT]->(recipient)
WHERE r2.timestamp > r1.timestamp
  AND r2.timestamp < r1.timestamp + INTERVAL '1' HOUR
  AND ABS(r2.amount - r1.amount) < r1.amount * 0.05  -- Within 5%
RETURN a.id,
       sender.id,
       recipient.id,
       r1.amount,
       r2.amount,
       DURATION.BETWEEN(r1.timestamp, r2.timestamp).minutes AS minutes_between;
```

## Advanced Hands-On Projects

### Project 1: Build a Recommendation System

**Objective**: Create a complete recommendation engine with multiple algorithms.

**Requirements**:
1. Collaborative filtering based on user similarity
2. Content-based recommendations using product attributes
3. Hybrid approach combining both
4. A/B testing framework to compare algorithms
5. Real-time recommendation serving

**Starter Code**:

```python
class RecommendationEngine:
    def __init__(self, client):
        self.client = client

    async def collaborative_filtering(self, user_id, limit=10):
        """Find products liked by similar users"""
        return await self.client.execute("""
            // TODO: Implement collaborative filtering
            // 1. Find users who bought similar products
            // 2. Find products those users also bought
            // 3. Rank by similarity score
        """, {"user_id": user_id, "limit": limit})

    async def content_based(self, user_id, limit=10):
        """Recommend based on product attributes"""
        return await self.client.execute("""
            // TODO: Implement content-based filtering
            // 1. Find products user has liked
            // 2. Find similar products by attributes
            // 3. Rank by attribute similarity
        """, {"user_id": user_id, "limit": limit})

    async def hybrid(self, user_id, limit=10):
        """Combine both approaches"""
        collab = await self.collaborative_filtering(user_id, limit * 2)
        content = await self.content_based(user_id, limit * 2)

        # TODO: Implement ranking combination
        pass
```

### Project 2: Social Network Analytics Dashboard

**Objective**: Build analytics dashboard for social network insights.

**Features**:
1. User growth metrics (daily/weekly/monthly active users)
2. Engagement metrics (posts, likes, comments per user)
3. Network topology analysis (clusters, influencers)
4. Content virality tracking
5. Retention cohort analysis

**Queries to Implement**:

```gql
-- Daily active users
MATCH (u:User)-[:ACTION]->(a)
WHERE a.timestamp >= DATE_TRUNC('day', CURRENT_TIMESTAMP)
RETURN DATE(a.timestamp) AS date,
       COUNT(DISTINCT u) AS daily_active_users;

-- Top influencers by engagement
MATCH (u:User)-[:POSTED]->(p:Post)
OPTIONAL MATCH (p)<-[:LIKED]-(liker)
OPTIONAL MATCH (p)<-[:COMMENTED]-(commenter)
WITH u,
     COUNT(DISTINCT p) AS post_count,
     COUNT(DISTINCT liker) AS total_likes,
     COUNT(DISTINCT commenter) AS total_comments
RETURN u.name,
       post_count,
       total_likes,
       total_comments,
       (total_likes + total_comments * 2) AS engagement_score
ORDER BY engagement_score DESC
LIMIT 100;

-- Content virality (posts shared most)
MATCH (p:Post)<-[:SHARED]-(sharer:User)
WITH p, COUNT(sharer) AS share_count
WHERE share_count > 5
MATCH (original_poster:User)-[:POSTED]->(p)
RETURN original_poster.name,
       p.content,
       p.timestamp,
       share_count,
       DURATION.BETWEEN(p.timestamp, CURRENT_TIMESTAMP).hours AS hours_since_posted,
       share_count * 1.0 / DURATION.BETWEEN(p.timestamp, CURRENT_TIMESTAMP).hours AS virality_rate
ORDER BY virality_rate DESC;
```

### Project 3: Knowledge Graph Query Engine

**Objective**: Build intelligent query engine over knowledge graph.

**Features**:
1. Natural language to GQL translation
2. Entity recognition and linking
3. Relationship extraction
4. Answer ranking by relevance
5. Explanation generation

**Implementation Outline**:

```python
class KnowledgeGraphQueryEngine:
    def __init__(self, client, nlp_model):
        self.client = client
        self.nlp = nlp_model

    async def query(self, natural_language_question):
        """Answer question using knowledge graph"""

        # 1. Extract entities
        entities = self.extract_entities(natural_language_question)

        # 2. Generate GQL queries
        gql_queries = self.generate_queries(entities, natural_language_question)

        # 3. Execute queries
        results = []
        for query in gql_queries:
            result = await self.client.execute(query)
            results.append(result)

        # 4. Rank and format answers
        answers = self.rank_answers(results, natural_language_question)

        return answers

    def extract_entities(self, question):
        # TODO: Use NLP to extract named entities
        pass

    def generate_queries(self, entities, question):
        # TODO: Generate GQL queries based on question type
        pass
```

### Project 4: Multi-Tenant SaaS Application

**Objective**: Build complete multi-tenant application with RLS.

**Features**:
1. Tenant isolation using RLS policies
2. Per-tenant resource limits
3. Shared schema with tenant-specific data
4. Audit logging per tenant
5. Tenant analytics dashboard

**RLS Policy Examples**:

```gql
-- Create RLS policy for tenant isolation
CREATE POLICY tenant_isolation ON User
FOR ALL
USING (tenant_id = current_tenant_id());

-- Create policy for hierarchical access
CREATE POLICY manager_access ON Employee
FOR SELECT
USING (
    employee_id = current_user_id()
    OR EXISTS {
        MATCH (current:Employee {id: current_user_id()})-[:MANAGES*]->(emp:Employee)
        WHERE emp.employee_id = Employee.employee_id
    }
);

-- Row-level encryption policy
CREATE POLICY sensitive_data ON Customer
FOR SELECT
USING (
    has_permission(current_user_id(), 'view_pii')
    OR customer_id = current_user_id()
);
```

## Debugging Exercises

### Exercise: Debug Slow Query

**Problem**: This query is very slow. Fix it.

```gql
-- Slow query
MATCH (u:User)
MATCH (p:Product)
WHERE EXISTS {
    MATCH (u)-[:PURCHASED]->(p)
}
RETURN u.name, p.name;
```

**Steps**:
1. Run EXPLAIN to see execution plan
2. Identify the problem (hint: Cartesian product)
3. Rewrite to use proper pattern matching
4. Verify with PROFILE

<details>
<summary>Solution</summary>

```gql
-- Optimized query
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name, p.name;
```

The original creates a Cartesian product of ALL users × ALL products, then filters. The optimized version uses pattern matching directly.
</details>

### Exercise: Fix Transaction Deadlock

**Problem**: Two concurrent transactions are deadlocking.

**Transaction 1**:
```gql
BEGIN;
MATCH (a:Account {id: 1}) SET a.balance = a.balance - 100;
-- Pause
MATCH (b:Account {id: 2}) SET b.balance = b.balance + 100;
COMMIT;
```

**Transaction 2**:
```gql
BEGIN;
MATCH (b:Account {id: 2}) SET b.balance = b.balance - 50;
-- Pause
MATCH (a:Account {id: 1}) SET a.balance = a.balance + 50;
COMMIT;
```

**Task**: Identify why deadlock occurs and fix it.

<details>
<summary>Solution</summary>

Deadlock occurs because:
- TX1 locks Account 1, then tries to lock Account 2
- TX2 locks Account 2, then tries to lock Account 1

Fix: Always acquire locks in consistent order:

```gql
-- Both transactions should lock in same order (by ID)
BEGIN;
MATCH (a:Account {id: 1}), (b:Account {id: 2})
WHERE a.id < b.id
SET a.balance = a.balance - 100,
    b.balance = b.balance + 100;
COMMIT;
```
</details>

## Community Challenges

### Weekly Challenge: Graph Algorithm Implementation

Implement these algorithms using only GQL:

1. **Dijkstra's shortest path** with weighted edges
2. **Triangle counting** for clustering coefficient
3. **Graph coloring** for conflict-free scheduling
4. **Maximum flow** in a network
5. **Minimum spanning tree** for optimization

### Monthly Project: Build a Full Application

Complete projects that combine multiple concepts:

1. **Twitter Clone**: Social graph with posts, likes, retweets, trending topics
2. **E-commerce Platform**: Products, recommendations, reviews, fraud detection
3. **Knowledge Base**: Hierarchical documentation with search and recommendations
4. **Project Management**: Tasks, dependencies, resources, timelines
5. **Supply Chain**: Logistics network with optimization and tracking

## Related Topics

- **[Tutorials](/tags/tutorials/)**: Structured learning paths with explanations
- **[Examples](/tags/examples/)**: Copy-paste ready code snippets
- **[Getting Started](/tags/getting-started/)**: Foundation concepts and setup
- **[Developer Guide](/tags/developer-guide/)**: Complete API reference
- **[Quickstart](/tags/quickstart/)**: Fast-track guides for immediate productivity
- **[Interactive Learning](/tags/interactive-learning/)**: More interactive exercises
- **[Code Challenges](/tags/code-challenges/)**: Coding challenges and competitions

## Additional Resources

- **Video Walkthroughs**: Watch step-by-step solution videos
- **Community Forums**: Discuss solutions and get help
- **Code Templates**: Starter code for common patterns
- **Solution Repository**: Browse complete working solutions
- **Office Hours**: Weekly live coding sessions

Start with Exercise 1 and work your way through. Don't skip ahead – each exercise builds essential skills for the next!
