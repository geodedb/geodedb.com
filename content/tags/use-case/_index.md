---
title: "Use Case Examples"
description: "Explore practical use case examples for Geode graph database. Learn how to implement social networks, recommendation engines, access control, fraud detection, and knowledge graphs using GQL queries."
keywords:
  - use case examples
  - graph database applications
  - GQL examples
  - Geode
  - graph database
  - social networks
  - recommendation engines
  - fraud detection
  - knowledge graphs
  - access control
  - practical examples
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/use-case/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Graph databases excel at modeling and querying highly connected data. Geode's implementation of the ISO/IEC 39075:2024 GQL standard makes it straightforward to implement common graph use cases with declarative, readable queries. This guide explores practical examples demonstrating how to leverage Geode for real-world applications.

## Social Network Use Cases

Social networks are the canonical graph database application, with users, connections, content, and interactions forming natural graph structures.

### Friend Network Modeling

Model bidirectional friendships between users:

```gql
-- Create users
CREATE (:User {id: 'alice', name: 'Alice Smith', joined: date('2024-01-15')})
CREATE (:User {id: 'bob', name: 'Bob Johnson', joined: date('2024-02-20')})
CREATE (:User {id: 'carol', name: 'Carol Williams', joined: date('2024-03-10')})

-- Create friendships (bidirectional)
MATCH (a:User {id: 'alice'}), (b:User {id: 'bob'})
CREATE (a)-[:FRIENDS_WITH {since: date('2024-04-01')}]->(b)
CREATE (b)-[:FRIENDS_WITH {since: date('2024-04-01')}]->(a)

MATCH (b:User {id: 'bob'}), (c:User {id: 'carol'})
CREATE (b)-[:FRIENDS_WITH {since: date('2024-05-15')}]->(c)
CREATE (c)-[:FRIENDS_WITH {since: date('2024-05-15')}]->(b)
```

### Friend Recommendations

Find friends-of-friends who aren't already connected:

```gql
-- Find potential friend recommendations for Alice
MATCH (user:User {id: 'alice'})-[:FRIENDS_WITH]->(friend)
      -[:FRIENDS_WITH]->(fof:User)
WHERE NOT (user)-[:FRIENDS_WITH]->(fof)
  AND user <> fof
RETURN fof.name, count(friend) as mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10
```

This query efficiently identifies second-degree connections while excluding existing friends, enabling "People You May Know" features.

### Activity Feeds

Generate personalized activity feeds showing friend posts:

```gql
-- Create post activity
MATCH (u:User {id: 'bob'})
CREATE (u)-[:POSTED {timestamp: current_timestamp()}]->
       (:Post {id: 'post1', content: 'Great day!', likes: 0})

-- Fetch activity feed for user
MATCH (user:User {id: 'alice'})-[:FRIENDS_WITH]->(friend)
      -[posted:POSTED]->(post:Post)
RETURN friend.name, post.content, posted.timestamp, post.likes
ORDER BY posted.timestamp DESC
LIMIT 50
```

### Mutual Connections

Display mutual friends between two users:

```gql
MATCH (user1:User {id: 'alice'})-[:FRIENDS_WITH]->(mutual:User)
      <-[:FRIENDS_WITH]-(user2:User {id: 'carol'})
RETURN mutual.name, mutual.id
ORDER BY mutual.name
```

## Recommendation Engine Use Cases

Graph databases excel at collaborative filtering and recommendation algorithms.

### Product Recommendations

Recommend products based on what similar users purchased:

```gql
-- Model user purchases
MATCH (u:User {id: 'alice'})
CREATE (u)-[:PURCHASED {date: date('2024-06-01'), price: 29.99}]->
       (:Product {id: 'prod1', name: 'Wireless Mouse', category: 'Electronics'})

-- Find recommendations
MATCH (user:User {id: 'alice'})-[:PURCHASED]->(product:Product)
      <-[:PURCHASED]-(similar:User)
      -[:PURCHASED]->(recommendation:Product)
WHERE NOT (user)-[:PURCHASED]->(recommendation)
RETURN recommendation.name,
       recommendation.category,
       count(DISTINCT similar) as similar_users,
       avg(recommendation.rating) as avg_rating
ORDER BY similar_users DESC, avg_rating DESC
LIMIT 10
```

This collaborative filtering approach identifies products purchased by users with similar purchase history.

### Content-Based Filtering

Recommend products similar to previously purchased items:

```gql
-- Find products in same category
MATCH (user:User {id: 'alice'})-[:PURCHASED]->(purchased:Product)
MATCH (similar:Product)
WHERE similar.category = purchased.category
  AND NOT (user)-[:PURCHASED]->(similar)
  AND similar <> purchased
RETURN similar.name,
       similar.category,
       count(DISTINCT purchased) as category_matches
ORDER BY category_matches DESC
LIMIT 10
```

### Trending Products

Identify trending products based on recent purchase velocity:

```gql
MATCH (u:User)-[p:PURCHASED]->(product:Product)
WHERE p.date > date(current_date()) - duration('P7D')
RETURN product.name,
       count(DISTINCT u) as purchasers,
       sum(p.price) as revenue
ORDER BY purchasers DESC
LIMIT 20
```

## Access Control and Permissions

Model complex hierarchical and graph-based access control systems.

### Role-Based Access Control (RBAC)

Implement role hierarchy with permission inheritance:

```gql
-- Create roles and permissions
CREATE (:Role {id: 'admin', name: 'Administrator'})
CREATE (:Role {id: 'editor', name: 'Editor'})
CREATE (:Role {id: 'viewer', name: 'Viewer'})
CREATE (:Permission {id: 'read', name: 'Read Access'})
CREATE (:Permission {id: 'write', name: 'Write Access'})
CREATE (:Permission {id: 'delete', name: 'Delete Access'})

-- Assign permissions to roles
MATCH (admin:Role {id: 'admin'}),
      (read:Permission {id: 'read'}),
      (write:Permission {id: 'write'}),
      (del:Permission {id: 'delete'})
CREATE (admin)-[:HAS_PERMISSION]->(read)
CREATE (admin)-[:HAS_PERMISSION]->(write)
CREATE (admin)-[:HAS_PERMISSION]->(del)

MATCH (editor:Role {id: 'editor'}),
      (read:Permission {id: 'read'}),
      (write:Permission {id: 'write'})
CREATE (editor)-[:HAS_PERMISSION]->(read)
CREATE (editor)-[:HAS_PERMISSION]->(write)

MATCH (viewer:Role {id: 'viewer'}),
      (read:Permission {id: 'read'})
CREATE (viewer)-[:HAS_PERMISSION]->(read)

-- Assign user to role
MATCH (user:User {id: 'alice'}), (role:Role {id: 'editor'})
CREATE (user)-[:HAS_ROLE]->(role)

-- Check user permissions
MATCH (user:User {id: 'alice'})-[:HAS_ROLE]->(role:Role)
      -[:HAS_PERMISSION]->(permission:Permission)
RETURN DISTINCT permission.name
```

### Organizational Hierarchy

Model reporting structures and delegated access:

```gql
-- Create organizational structure
CREATE (:Employee {id: 'ceo', name: 'CEO', level: 1})
CREATE (:Employee {id: 'vp_eng', name: 'VP Engineering', level: 2})
CREATE (:Employee {id: 'eng_mgr', name: 'Engineering Manager', level: 3})
CREATE (:Employee {id: 'dev1', name: 'Developer 1', level: 4})

MATCH (ceo:Employee {id: 'ceo'}), (vp:Employee {id: 'vp_eng'})
CREATE (vp)-[:REPORTS_TO]->(ceo)

MATCH (vp:Employee {id: 'vp_eng'}), (mgr:Employee {id: 'eng_mgr'})
CREATE (mgr)-[:REPORTS_TO]->(vp)

MATCH (mgr:Employee {id: 'eng_mgr'}), (dev:Employee {id: 'dev1'})
CREATE (dev)-[:REPORTS_TO]->(mgr)

-- Find all reports (direct and indirect)
MATCH (manager:Employee {id: 'vp_eng'})<-[:REPORTS_TO*1..5]-(report:Employee)
RETURN report.name, report.level
ORDER BY report.level
```

### Resource Access Control

Implement fine-grained resource permissions:

```gql
-- Create resources
CREATE (:Document {id: 'doc1', title: 'Q4 Strategy', classification: 'confidential'})
CREATE (:Document {id: 'doc2', title: 'Team Notes', classification: 'internal'})

-- Grant access
MATCH (user:User {id: 'alice'}), (doc:Document {id: 'doc1'})
CREATE (user)-[:CAN_READ {granted: current_timestamp()}]->(doc)

MATCH (user:User {id: 'alice'}), (doc:Document {id: 'doc1'})
CREATE (user)-[:CAN_EDIT {granted: current_timestamp()}]->(doc)

-- Check user access to resource
MATCH (user:User {id: 'alice'})-[access]->(doc:Document {id: 'doc1'})
RETURN type(access) as permission, access.granted
```

## Fraud Detection Use Cases

Graph patterns excel at detecting fraudulent behavior through relationship analysis.

### Account Network Analysis

Detect suspicious account clusters sharing identifying information:

```gql
-- Create accounts with shared attributes
CREATE (:Account {id: 'acct1', email: 'user1@example.com', ip: '192.168.1.1'})
CREATE (:Account {id: 'acct2', email: 'user2@example.com', ip: '192.168.1.1'})
CREATE (:Account {id: 'acct3', email: 'user3@example.com', ip: '192.168.1.1'})

-- Find accounts sharing IP addresses
MATCH (a1:Account)-[:USED_IP]->(ip:IPAddress)<-[:USED_IP]-(a2:Account)
WHERE a1 <> a2
RETURN ip.address,
       count(DISTINCT a1) + count(DISTINCT a2) as account_count,
       collect(DISTINCT a1.email) + collect(DISTINCT a2.email) as emails
HAVING account_count > 5
ORDER BY account_count DESC
```

### Transaction Pattern Detection

Identify circular transaction patterns indicating money laundering:

```gql
-- Find circular money flows
MATCH path = (a:Account)-[:TRANSFERRED*3..5]->(a)
WHERE ALL(rel IN relationships(path) WHERE rel.amount > 1000)
RETURN nodes(path) as accounts,
       [rel IN relationships(path) | rel.amount] as amounts,
       null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ as total
```

### Velocity Checks

Detect abnormal transaction velocity:

```gql
MATCH (account:Account {id: 'acct1'})-[tx:TRANSFERRED]->(target:Account)
WHERE tx.timestamp > current_timestamp() - duration('PT1H')
RETURN account.id,
       count(tx) as transaction_count,
       sum(tx.amount) as total_amount,
       avg(tx.amount) as avg_amount
HAVING transaction_count > 20 OR total_amount > 50000
```

## Knowledge Graph Use Cases

Organize and query complex interconnected knowledge domains.

### Wikipedia-Style Knowledge Base

Model entities and their relationships:

```gql
-- Create entities
CREATE (:Person {id: 'einstein', name: 'Albert Einstein', born: 1879, died: 1955})
CREATE (:Concept {id: 'relativity', name: 'Theory of Relativity'})
CREATE (:Institution {id: 'princeton', name: 'Princeton University'})

-- Create relationships
MATCH (person:Person {id: 'einstein'}), (concept:Concept {id: 'relativity'})
CREATE (person)-[:DEVELOPED {year: 1915}]->(concept)

MATCH (person:Person {id: 'einstein'}), (inst:Institution {id: 'princeton'})
CREATE (person)-[:WORKED_AT {from: 1933, to: 1955}]->(inst)

-- Query related concepts
MATCH (start:Person {name: 'Albert Einstein'})-[rel*1..3]-(related)
RETURN related, type(rel) as relationship
```

### Citation Networks

Model academic papers and citations:

```gql
-- Create papers
CREATE (:Paper {
  id: 'paper1',
  title: 'Graph Databases: State of the Art',
  year: 2023,
  citations: 0
})

-- Create citations
MATCH (citing:Paper {id: 'paper2'}), (cited:Paper {id: 'paper1'})
CREATE (citing)-[:CITES {context: 'methodology'}]->(cited)

-- Find highly cited papers
MATCH (paper:Paper)<-[:CITES]-(citing:Paper)
RETURN paper.title,
       paper.year,
       count(citing) as citation_count
ORDER BY citation_count DESC
LIMIT 10

-- Find citation chains
MATCH path = (start:Paper {id: 'paper1'})<-[:CITES*1..3]-(citing:Paper)
RETURN citing.title, length(path) as degrees_of_separation
```

### Taxonomy and Classification

Build hierarchical classification systems:

```gql
-- Create taxonomy
CREATE (:Category {id: 'electronics', name: 'Electronics'})
CREATE (:Category {id: 'computers', name: 'Computers'})
CREATE (:Category {id: 'laptops', name: 'Laptops'})

MATCH (child:Category {id: 'laptops'}), (parent:Category {id: 'computers'})
CREATE (child)-[:SUBCATEGORY_OF]->(parent)

MATCH (child:Category {id: 'computers'}), (parent:Category {id: 'electronics'})
CREATE (child)-[:SUBCATEGORY_OF]->(parent)

-- Find all ancestor categories
MATCH (item:Category {id: 'laptops'})-[:SUBCATEGORY_OF*]->(ancestor:Category)
RETURN ancestor.name
ORDER BY length(path) ASC
```

## Supply Chain and Logistics

Track complex supply chain relationships and dependencies.

### Product Assembly Tracking

Model bill of materials (BOM):

```gql
-- Create components
CREATE (:Component {id: 'laptop', name: 'Gaming Laptop', type: 'finished_good'})
CREATE (:Component {id: 'motherboard', name: 'Motherboard', type: 'subassembly'})
CREATE (:Component {id: 'cpu', name: 'CPU', type: 'part'})
CREATE (:Component {id: 'ram', name: 'RAM Module', type: 'part'})

-- Create assembly relationships
MATCH (laptop:Component {id: 'laptop'}), (mb:Component {id: 'motherboard'})
CREATE (laptop)-[:CONTAINS {quantity: 1}]->(mb)

MATCH (mb:Component {id: 'motherboard'}), (cpu:Component {id: 'cpu'})
CREATE (mb)-[:CONTAINS {quantity: 1}]->(cpu)

MATCH (mb:Component {id: 'motherboard'}), (ram:Component {id: 'ram'})
CREATE (mb)-[:CONTAINS {quantity: 2}]->(ram)

-- Find all components required for product
MATCH (product:Component {id: 'laptop'})-[:CONTAINS*]->(component:Component)
RETURN component.name, component.type
```

### Shipment Tracking

Track packages through distribution network:

```gql
CREATE (:Location {id: 'warehouse', name: 'Main Warehouse', type: 'warehouse'})
CREATE (:Location {id: 'hub1', name: 'Distribution Hub', type: 'hub'})
CREATE (:Location {id: 'customer', name: 'Customer Address', type: 'destination'})

MATCH (shipment:Shipment {id: 'ship123'}), (loc:Location {id: 'warehouse'})
CREATE (shipment)-[:AT_LOCATION {timestamp: current_timestamp(), status: 'picked'}]->(loc)

-- Track shipment route
MATCH path = (shipment:Shipment {id: 'ship123'})
             -[:AT_LOCATION*]->(destination:Location {type: 'destination'})
RETURN [loc IN nodes(path) | loc.name] as route,
       [rel IN relationships(path) | rel.timestamp] as timestamps
```

## Network Infrastructure

Model network topology and dependencies.

### Service Dependency Mapping

Map microservice dependencies:

```gql
-- Create services
CREATE (:Service {id: 'api', name: 'API Gateway', version: '2.1.0'})
CREATE (:Service {id: 'auth', name: 'Auth Service', version: '1.5.0'})
CREATE (:Service {id: 'db', name: 'Database', version: '13.2'})

-- Create dependencies
MATCH (api:Service {id: 'api'}), (auth:Service {id: 'auth'})
CREATE (api)-[:DEPENDS_ON {critical: true}]->(auth)

MATCH (api:Service {id: 'api'}), (db:Service {id: 'db'})
CREATE (api)-[:DEPENDS_ON {critical: true}]->(db)

-- Find all transitive dependencies
MATCH (service:Service {id: 'api'})-[:DEPENDS_ON*]->(dependency:Service)
RETURN dependency.name, dependency.version

-- Impact analysis: what depends on this service?
MATCH (dependent:Service)-[:DEPENDS_ON*]->(service:Service {id: 'auth'})
RETURN dependent.name
```

### Network Topology

Model physical network infrastructure:

```gql
CREATE (:Device {id: 'router1', type: 'router', ip: '10.0.0.1'})
CREATE (:Device {id: 'switch1', type: 'switch', ip: '10.0.1.1'})
CREATE (:Device {id: 'server1', type: 'server', ip: '10.0.1.10'})

MATCH (router:Device {id: 'router1'}), (switch:Device {id: 'switch1'})
CREATE (router)-[:CONNECTED_TO {bandwidth: '10Gbps', port: 'eth0'}]->(switch)

-- Find path between devices
MATCH path = shortestPath(
  (source:Device {id: 'server1'})-[:CONNECTED_TO*]-(dest:Device {id: 'router1'})
)
RETURN [device IN nodes(path) | device.id] as path,
       length(path) as hops
```

## Best Practices for Use Case Implementation

### Start Simple

Begin with core entities and relationships, then add complexity:

```gql
-- Start: basic user-product relationship
MATCH (u:User)-[:PURCHASED]->(p:Product)

-- Evolve: add temporal and rating dimensions
MATCH (u:User)-[purchase:PURCHASED]->(p:Product)
WHERE purchase.date > date('2024-01-01')
  AND purchase.rating >= 4
```

### Use Appropriate Indexing

Create indexes on frequently queried properties:

```gql
CREATE INDEX user_email ON User(email)
CREATE INDEX product_category ON Product(category)
CREATE INDEX transaction_date ON TRANSFERRED(date)
```

### Leverage Parameterized Queries

Use parameters for reusable, secure queries:

```gql
-- Parameterized recommendation query
MATCH (user:User {id: $user_id})-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(similar:User)-[:PURCHASED]->(rec:Product)
WHERE NOT (user)-[:PURCHASED]->(rec)
RETURN rec
LIMIT $limit
```

### Monitor Query Performance

Use PROFILE to optimize complex queries:

```gql
PROFILE
MATCH (u:User)-[:FRIENDS_WITH*2..3]->(friend)
WHERE u.id = $user_id
RETURN friend
```

These use case examples demonstrate Geode's versatility across diverse application domains. The declarative nature of GQL combined with Geode's performance enables developers to model and query complex connected data efficiently.
