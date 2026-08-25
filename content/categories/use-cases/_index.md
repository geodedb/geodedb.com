---
title: "Category: Use Cases and Applications"
description: "Real-world use cases and applications for Geode including social networks, fraud detection, recommendation engines, knowledge graphs, network analysis, and enterprise solutions."
keywords:
  - use cases
  - applications
  - social networks
  - fraud detection
  - recommendations
  - knowledge graphs
  - real-world examples
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/use-cases/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

The **Use Cases and Applications** category explores real-world scenarios where Geode excels, providing practical examples, implementation patterns, and architectural guidance for common graph database applications. From social networks to fraud detection, see how organizations leverage Geode to solve complex problems with connected data.

## Why Graph Databases?

Traditional relational databases model data as tables with rows and columns, optimized for structured, tabular data. This works well for many applications but struggles with highly connected data where relationships are as important as entities themselves. Graph databases like Geode flip this paradigm: relationships are first-class citizens, making queries that traverse connections natural and performant.

**When relationships matter more than records, graphs excel.**

## Social Networks and Collaboration

Social networks are the canonical graph database use case because they're fundamentally about connections between people, content, and interactions.

### Friend Networks

Model users and friendships:

```gql
-- Create users and friendships
CREATE (alice:User {name: 'Alice', joined: DATE '2024-01-15'})
CREATE (bob:User {name: 'Bob', joined: DATE '2024-02-01'})
CREATE (alice)-[:FRIENDS_WITH {since: DATE '2024-02-15'}]->(bob)

-- Find friends of friends (potential connections)
MATCH (me:User {name: 'Alice'})-[:FRIENDS_WITH]->(friend)
      -[:FRIENDS_WITH]->(suggestion)
WHERE NOT EXISTS {
    MATCH (me)-[:FRIENDS_WITH]->(suggestion)
}
AND suggestion <> me
RETURN suggestion.name, COUNT(friend) AS mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10
```

### Content Feeds

Personalized feeds based on social graph:

```gql
-- Show posts from friends and their interactions
MATCH (me:User {id: $userId})-[:FOLLOWS]->(author:User)
      -[:POSTED]->(post:Post)
WHERE post.created > current_timestamp() - INTERVAL '24' HOUR
OPTIONAL MATCH (post)<-[:LIKED]-(liker:User)
OPTIONAL MATCH (post)<-[:COMMENTED]-(commenter:User)
RETURN post.content,
       author.name,
       post.created,
       COUNT(DISTINCT liker) AS likes,
       COUNT(DISTINCT commenter) AS comments
ORDER BY post.created DESC
LIMIT 50
```

### Community Detection

Identify user communities and interests:

```gql
-- Find users with similar interests
MATCH (me:User {id: $userId})-[:INTERESTED_IN]->(topic:Topic)
      <-[:INTERESTED_IN]-(similar:User)
WHERE similar <> me
WITH similar, COUNT(topic) AS common_interests
WHERE common_interests >= 3
RETURN similar.name, common_interests
ORDER BY common_interests DESC
```

## Fraud Detection and Risk Management

Graph analysis reveals fraud patterns invisible in traditional databases by analyzing relationships and transaction flows.

### Transaction Ring Detection

Identify circular money flows:

```gql
-- Detect transaction rings (money returning to source)
MATCH path = (a:Account)-[:TRANSFER*2..5]->(a)
WHERE ALL (r IN relationships(path) WHERE r.timestamp > current_timestamp() - INTERVAL '24' HOUR)
RETURN path,
       [r IN relationships(path) | r.amount] AS amounts,
       null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS total_amount
ORDER BY total_amount DESC
```

### First-Party Fraud

Detect customers with multiple accounts:

```gql
-- Find shared identifiers across accounts
MATCH (a1:Account)-[:HAS_EMAIL|HAS_PHONE|HAS_ADDRESS]->(identifier)
      <-[:HAS_EMAIL|HAS_PHONE|HAS_ADDRESS]-(a2:Account)
WHERE a1.id < a2.id  -- Avoid duplicates
WITH a1, a2, COUNT(DISTINCT identifier) AS shared_identifiers
WHERE shared_identifiers >= 2
RETURN a1.id, a2.id, shared_identifiers,
       COLLECT(identifier) AS common_identifiers
```

### Velocity Checks

Detect unusual activity patterns:

```gql
-- Find accounts with unusual transaction velocity
MATCH (a:Account)-[t:TRANSACTION]->()
WHERE t.timestamp > current_timestamp() - INTERVAL '1' HOUR
WITH a, COUNT(t) AS transaction_count, SUM(t.amount) AS total_amount
WHERE transaction_count > a.avg_hourly_transactions * 5
   OR total_amount > a.avg_hourly_amount * 10
RETURN a.id, transaction_count, total_amount,
       a.avg_hourly_transactions, a.avg_hourly_amount
```

### Network Analysis for Organized Fraud

Identify coordinated fraud networks:

```gql
-- Find densely connected suspicious accounts
MATCH (a:Account)
WHERE a.flagged = true
MATCH (a)-[r:TRANSFER|SHARES_DEVICE|SHARES_IP]-(connected:Account)
WITH connected, COUNT(DISTINCT a) AS suspicious_connections
WHERE suspicious_connections >= 3
RETURN connected.id, suspicious_connections
ORDER BY suspicious_connections DESC
```

## Recommendation Engines

Graphs power sophisticated recommendations by analyzing patterns in user behavior, product attributes, and social connections.

### Collaborative Filtering

Recommend based on similar users' preferences:

```gql
-- "Users who liked what you liked also liked..."
MATCH (me:User {id: $userId})-[:LIKED]->(item)
      <-[:LIKED]-(similar:User)
      -[:LIKED]->(recommendation)
WHERE NOT EXISTS {MATCH (me)-[:LIKED]->(recommendation)}
WITH recommendation,
     COUNT(DISTINCT similar) AS similar_user_count,
     COUNT(DISTINCT item) AS common_items
RETURN recommendation.title,
       recommendation.category,
       similar_user_count * common_items AS score
ORDER BY score DESC
LIMIT 10
```

### Content-Based Filtering

Recommend similar items:

```gql
-- Find products similar to user's purchases
MATCH (me:User {id: $userId})-[:PURCHASED]->(product:Product)
      -[:IN_CATEGORY]->(category:Category)
      <-[:IN_CATEGORY]-(similar:Product)
WHERE NOT EXISTS {MATCH (me)-[:PURCHASED]->(similar)}
WITH similar,
     COUNT(DISTINCT category) AS shared_categories,
     similarity(product.embedding, similar.embedding) AS similarity
RETURN similar.name,
       shared_categories,
       similarity,
       (shared_categories * 0.3 + similarity * 0.7) AS combined_score
ORDER BY combined_score DESC
LIMIT 10
```

### Hybrid Recommendations

Combine collaborative and content-based approaches:

```python
import geode_client

async def hybrid_recommendations(user_id: int, limit: int = 10):
    client = geode_client.open_database("localhost:3141")
    async with client.connection() as client:
        # Collaborative filtering score
        collab_result, _ = await client.query("""
            MATCH (me:User {id: $userId})-[:LIKED]->(item)<-[:LIKED]-(similar:User)
                  -[:LIKED]->(recommendation)
            WHERE NOT EXISTS {MATCH (me)-[:LIKED]->(recommendation)}
            RETURN recommendation.id AS id, COUNT(similar) AS collab_score
        """, {"userId": user_id})

        # Content-based score
        content_result, _ = await client.query("""
            MATCH (me:User {id: $userId})-[:LIKED]->(item)
            WITH me, AVG(item.embedding) AS user_profile
            MATCH (candidate:Product)
            WHERE NOT EXISTS {MATCH (me)-[:LIKED]->(candidate)}
            RETURN candidate.id AS id,
                   similarity(user_profile, candidate.embedding) AS content_score
        """, {"userId": user_id})

        # Combine scores
        return combine_and_rank(collab_result, content_result, limit)
```

## Knowledge Graphs and Semantic Search

Knowledge graphs model entities, concepts, and their relationships to power intelligent search, question answering, and discovery.

### Entity Relationships

```gql
-- Model a knowledge graph
CREATE (person:Person {name: 'Albert Einstein', born: 1879})
CREATE (theory:Concept {name: 'Theory of Relativity'})
CREATE (physics:Field {name: 'Physics'})
CREATE (nobel:Award {name: 'Nobel Prize in Physics', year: 1921})

CREATE (person)-[:DEVELOPED]->(theory)
CREATE (theory)-[:IN_FIELD]->(physics)
CREATE (person)-[:RECEIVED]->(nobel)
```

### Semantic Search

Find information through relationship traversal:

```gql
-- Answer: "Who won Nobel prizes in Physics?"
MATCH (person:Person)-[:RECEIVED]->(award:Award)
WHERE award.name CONTAINS 'Nobel Prize'
  AND award.name CONTAINS 'Physics'
RETURN person.name, award.year
ORDER BY award.year

-- Answer: "What did Einstein contribute to Physics?"
MATCH (einstein:Person {name: 'Albert Einstein'})
      -[:DEVELOPED|DISCOVERED]->(contribution)
      -[:IN_FIELD]->(:Field {name: 'Physics'})
RETURN contribution.name, contribution.description
```

### Concept Exploration

Navigate related concepts:

```gql
-- Explore concepts related to a topic
MATCH path = (start:Concept {name: 'Machine Learning'})
            -[:RELATED_TO|REQUIRES|PART_OF*1..3]-(related:Concept)
RETURN DISTINCT related.name, LENGTH(path) AS distance
ORDER BY distance, related.name
```

## Network and Infrastructure Management

Model physical and logical networks for optimization, troubleshooting, and capacity planning.

### Network Topology

```gql
-- Model network infrastructure
CREATE (router1:Router {name: 'Core-Router-1', location: 'DataCenter-A'})
CREATE (router2:Router {name: 'Core-Router-2', location: 'DataCenter-B'})
CREATE (switch1:Switch {name: 'Access-Switch-1'})

CREATE (router1)-[:CONNECTED_TO {bandwidth: '10Gbps', latency: '2ms'}]->(router2)
CREATE (router2)-[:CONNECTED_TO {bandwidth: '1Gbps'}]->(switch1)
```

### Path Optimization

Find optimal routes:

```gql
-- Find lowest latency path
MATCH path = SHORTEST (a:Router {name: 'Core-Router-1'})
                      -[:CONNECTED_TO*]->
                      (b:Router {name: 'Edge-Router-5'})
RETURN path,
       null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS total_latency
```

### Impact Analysis

Identify critical infrastructure:

```gql
-- Find single points of failure
MATCH (device:Router|Switch)
WHERE NOT EXISTS {
    MATCH (device)-[:CONNECTED_TO*2..]-(device)
}
WITH device,
     SIZE([(device)-[:CONNECTED_TO]-(d) | d]) AS connections
WHERE connections >= 5
RETURN device.name, connections
ORDER BY connections DESC
```

## Access Control and Permissions

Model complex authorization hierarchies.

### Hierarchical Permissions

```gql
-- Model organizational hierarchy
CREATE (ceo:Role {name: 'CEO'})
CREATE (vp:Role {name: 'VP Engineering'})
CREATE (manager:Role {name: 'Engineering Manager'})
CREATE (engineer:Role {name: 'Software Engineer'})

CREATE (ceo)-[:MANAGES]->(vp)
CREATE (vp)-[:MANAGES]->(manager)
CREATE (manager)-[:MANAGES]->(engineer)

-- Check if user has permission through hierarchy
MATCH (user:User {id: $userId})-[:HAS_ROLE]->(role:Role)
      -[:MANAGES*0..]->(inherited:Role)
      -[:HAS_PERMISSION]->(permission:Permission {resource: $resource})
RETURN permission.access_level
```

### Delegated Permissions

```gql
-- Delegate permissions temporarily
CREATE (alice:User {name: 'Alice'})-[:DELEGATES {
    expiry: timestamp '2026-02-01T00:00:00Z'
}]->(bob:User {name: 'Bob'})

-- Check delegated access
MATCH (user:User {id: $userId})-[d:DELEGATES]->(delegatee:User)
      -[:HAS_PERMISSION]->(perm:Permission)
WHERE d.expiry > current_timestamp()
RETURN perm.resource, perm.access_level
```

## Supply Chain and Logistics

Track products, shipments, and dependencies through complex supply chains.

### Product Lineage

```gql
-- Track component origins
MATCH path = (finished:Product {sku: $sku})
            -[:CONTAINS*]->(component:Component)
            -[:SUPPLIED_BY]->(supplier:Supplier)
RETURN path, supplier.name, supplier.country
```

### Dependency Analysis

```gql
-- Find critical suppliers
MATCH (supplier:Supplier)-[:SUPPLIES]->(component:Component)
      <-[:CONTAINS*]-(product:Product)
WITH supplier, COUNT(DISTINCT product) AS affected_products
WHERE affected_products > 100
RETURN supplier.name, affected_products
ORDER BY affected_products DESC
```

## Customer 360 and Marketing

Unify customer data across touchpoints.

### Customer Journey

```gql
-- Track customer interactions
MATCH (customer:Customer {id: $customerId})
      -[:INTERACTION {type: 'email_open'}]->(campaign:Campaign)
      -[:LED_TO]->(:Interaction {type: 'website_visit'})
      -[:LED_TO]->(:Interaction {type: 'purchase'})
RETURN campaign.name, COUNT(*) AS conversions
```

### Segment Analysis

```gql
-- Identify high-value customer segments
MATCH (customer:Customer)-[:PURCHASED]->(product:Product)
WITH customer,
     SUM(product.price) AS lifetime_value,
     COUNT(product) AS purchase_count
WHERE lifetime_value > 10000
RETURN customer.segment,
       AVG(lifetime_value) AS avg_ltv,
       COUNT(customer) AS segment_size
GROUP BY customer.segment
```

## Best Practices for Application Design

1. **Model the domain naturally**: Represent entities as nodes, relationships as edges
2. **Optimize for queries**: Design schema based on access patterns
3. **Use indexes**: Create indexes on frequently queried properties
4. **Denormalize when appropriate**: Trade storage for query performance
5. **Implement caching**: Cache frequent queries in application layer
6. **Monitor performance**: Profile queries and optimize bottlenecks
7. **Plan for scale**: Design with future growth in mind

## Related Topics

- [Social Networks](/tags/applications/) - Social platform implementations
- [Fraud Detection](/tags/fraud-detection/) - Financial fraud patterns
- [Recommendations](/tags/recommendations/) - Recommendation algorithms
- [Knowledge Graphs](/docs/use-cases/knowledge-graphs/) - Semantic networks
- [Real-Time Analytics](/tags/real-time-analytics/) - Streaming graph analytics
- [Machine Learning](/tags/machine-learning/) - ML integration patterns

## Healthcare and Life Sciences

### Patient Care Networks

Model complex relationships between patients, providers, medications, and conditions:

```gql
-- Find similar patient cases for treatment recommendations
MATCH (patient:Patient {id: $patient_id})-[:HAS_CONDITION]->(condition:Condition)
      <-[:HAS_CONDITION]-(similar:Patient)
      -[:PRESCRIBED]->(treatment:Treatment)
WHERE NOT EXISTS {
    MATCH (patient)-[:PRESCRIBED]->(treatment)
}
WITH treatment,
     COUNT(DISTINCT similar) AS similar_patient_count,
     AVG(similar.outcome_score) AS avg_outcome
WHERE similar_patient_count >= 5
  AND avg_outcome > 7.0
RETURN treatment.name,
       treatment.dosage,
       similar_patient_count,
       avg_outcome
ORDER BY similar_patient_count DESC, avg_outcome DESC
LIMIT 10
```

### Drug Interaction Detection

```gql
-- Identify dangerous drug interactions
MATCH (patient:Patient {id: $patient_id})-[:PRESCRIBED]->(drug1:Drug)
MATCH (patient)-[:PRESCRIBED]->(drug2:Drug)
MATCH (drug1)-[:INTERACTS_WITH {severity: 'high'}]-(drug2)
WHERE drug1.id < drug2.id
RETURN drug1.name AS medication1,
       drug2.name AS medication2,
       drug1.interaction_effect AS effect,
       drug1.interaction_severity AS severity
```

### Clinical Trial Matching

```gql
-- Find eligible patients for clinical trials
MATCH (trial:ClinicalTrial)
WHERE trial.status = 'recruiting'
MATCH (patient:Patient)
WHERE patient.age >= trial.min_age
  AND patient.age <= trial.max_age
  AND NOT EXISTS {
      MATCH (patient)-[:HAS_CONDITION]->(exclusion:Condition)
      WHERE exclusion.name IN trial.exclusion_criteria
  }
WITH trial, patient,
     SIZE([(patient)-[:HAS_CONDITION]->(c:Condition)
           WHERE c.name IN trial.inclusion_criteria | c]) AS matching_criteria
WHERE matching_criteria >= SIZE(trial.inclusion_criteria)
RETURN trial.name,
       trial.sponsor,
       patient.id,
       patient.name,
       matching_criteria
ORDER BY trial.priority DESC, matching_criteria DESC
```

## Financial Services

### Anti-Money Laundering (AML)

```gql
-- Detect layering patterns (multiple intermediate accounts)
MATCH path = (source:Account)-[:TRANSFER*3..7]->(destination:Account)
WHERE source.country <> destination.country
  AND ALL (r IN relationships(path) WHERE r.timestamp > current_timestamp() - INTERVAL '48' HOUR)
  AND LENGTH(path) >= 3
WITH path,
     [r IN relationships(path) | r.amount] AS amounts,
     null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS total_amount
WHERE total_amount > 50000
RETURN path,
       amounts,
       total_amount,
       [n IN nodes(path) | n.country] AS countries
ORDER BY total_amount DESC
```

### Credit Risk Assessment

```gql
-- Assess credit risk using network effects
MATCH (applicant:Person {id: $applicant_id})
OPTIONAL MATCH (applicant)-[:KNOWS]->(connection:Person)
WITH applicant,
     AVG(connection.credit_score) AS network_avg_credit,
     COUNT{(applicant)-[:EMPLOYED_BY]->(:Company)} AS employment_count,
     COUNT{(applicant)-[:DEFAULT]->()} AS default_count
RETURN applicant.id,
       applicant.credit_score AS individual_score,
       network_avg_credit,
       CASE
           WHEN network_avg_credit > 700 THEN 1.1
           WHEN network_avg_credit > 600 THEN 1.0
           ELSE 0.9
       END AS network_multiplier,
       employment_count,
       default_count,
       CASE
           WHEN default_count > 0 THEN 'high_risk'
           WHEN network_avg_credit < 600 THEN 'medium_risk'
           ELSE 'low_risk'
       END AS risk_category
```

## E-Commerce and Retail

### Product Recommendations

```gql
-- Multi-faceted product recommendations
MATCH (user:User {id: $user_id})

// Collaborative filtering
OPTIONAL MATCH (user)-[:PURCHASED]->(p1:Product)<-[:PURCHASED]-(similar:User)
                     -[:PURCHASED]->(collab_rec:Product)
WHERE NOT EXISTS {MATCH (user)-[:PURCHASED]->(collab_rec)}
WITH user, collab_rec, COUNT(similar) AS collab_score

// Content-based filtering
OPTIONAL MATCH (user)-[:PURCHASED]->(p2:Product)-[:IN_CATEGORY]->(cat:Category)
                     <-[:IN_CATEGORY]-(content_rec:Product)
WHERE NOT EXISTS {MATCH (user)-[:PURCHASED]->(content_rec)}
WITH user, collab_rec, collab_score, content_rec, COUNT(cat) AS content_score

// Trending products
OPTIONAL MATCH (trending:Product)<-[:PURCHASED]-(buyer:User)
WHERE buyer.purchase_timestamp > current_timestamp() - INTERVAL '7' DAY
WITH collab_rec, collab_score, content_rec, content_score,
     trending, COUNT(buyer) AS trend_score

// Combine scores
WITH COALESCE(collab_rec, content_rec, trending) AS recommendation,
     COALESCE(collab_score * 3, 0) +
     COALESCE(content_score * 2, 0) +
     COALESCE(trend_score, 0) AS combined_score
WHERE recommendation IS NOT NULL
RETURN DISTINCT recommendation.name,
                recommendation.price,
                combined_score
ORDER BY combined_score DESC
LIMIT 20
```

### Inventory Optimization

```gql
-- Identify supply chain bottlenecks
MATCH (product:Product)-[:REQUIRES]->(component:Component)
      -[:SUPPLIED_BY]->(supplier:Supplier)
WITH component,
     COUNT(DISTINCT product) AS dependent_products,
     COUNT(DISTINCT supplier) AS supplier_count,
     AVG(supplier.lead_time_days) AS avg_lead_time
WHERE supplier_count = 1  -- Single point of failure
   OR avg_lead_time > 30  -- Long lead time
RETURN component.name,
       component.stock_level,
       dependent_products,
       supplier_count,
       avg_lead_time,
       CASE
           WHEN component.stock_level < dependent_products * 10
                AND supplier_count = 1 THEN 'critical'
           WHEN avg_lead_time > 30 THEN 'warning'
           ELSE 'ok'
       END AS risk_status
ORDER BY dependent_products DESC, supplier_count ASC
```

## Telecommunications

### Network Capacity Planning

```gql
-- Identify network segments requiring capacity upgrade
MATCH (node1:NetworkNode)-[link:FIBER_LINK]-(node2:NetworkNode)
WITH link,
     link.current_utilization / link.capacity AS utilization_pct,
     link.peak_hour_traffic / link.capacity AS peak_utilization
WHERE utilization_pct > 0.7 OR peak_utilization > 0.85
OPTIONAL MATCH path = (node1)-[:BACKUP_ROUTE*1..3]-(node2)
WITH link, utilization_pct, peak_utilization,
     CASE WHEN path IS NULL THEN 'no_backup' ELSE 'has_backup' END AS backup_status
RETURN link.id,
       link.from_location,
       link.to_location,
       utilization_pct,
       peak_utilization,
       backup_status,
       CASE
           WHEN backup_status = 'no_backup' AND utilization_pct > 0.8 THEN 'urgent'
           WHEN peak_utilization > 0.85 THEN 'high_priority'
           ELSE 'monitor'
       END AS priority
ORDER BY utilization_pct DESC
```

### Service Outage Impact Analysis

```gql
-- Calculate customer impact of network node failure
MATCH (failed_node:NetworkNode {id: $node_id})
MATCH (customer:Customer)-[:SERVICED_BY]->(access_node:NetworkNode)
WHERE NOT EXISTS {
    MATCH path = (access_node)-[:ROUTE*]-(alternate:NetworkNode)
    WHERE alternate <> failed_node
      AND (alternate)-[:ROUTE]-(backbone:BackboneNode)
}
WITH COUNT(DISTINCT customer) AS affected_customers,
     SUM(customer.monthly_revenue) AS revenue_at_risk
RETURN failed_node.id,
       failed_node.location,
       affected_customers,
       revenue_at_risk,
       revenue_at_risk / affected_customers AS avg_customer_value
```

## Transportation and Logistics

### Route Optimization with Constraints

```gql
-- Find optimal delivery route with time windows
MATCH (depot:Location {type: 'depot'})
MATCH (delivery:Delivery {status: 'pending', date: $delivery_date})
      -[:DELIVER_TO]->(destination:Location)
MATCH path = SHORTEST (depot)-[:ROUTE*]-(destination)
WHERE ALL (segment IN relationships(path)
          WHERE segment.traffic_level < 'high'
            AND segment.road_condition = 'good')
WITH delivery, destination, path,
     null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS total_time,
     null /* reduce() is advertised by SHOW FUNCTIONS but has no evaluator dispatch; collect() the values and fold client-side (for path weights use algo.dijkstra.stream, which yields cost) */ AS total_distance
WHERE total_time <= delivery.time_window_end - delivery.time_window_start
RETURN delivery.id,
       destination.address,
       total_distance,
       total_time,
       delivery.time_window_start,
       delivery.time_window_end
ORDER BY delivery.priority DESC, total_time ASC
```

## Manufacturing and Industry 4.0

### Predictive Maintenance

```gql
-- Identify equipment needing maintenance based on sensor data and dependencies
MATCH (equipment:Equipment)-[:DEPENDS_ON*1..2]->(dependency:Equipment)
WHERE equipment.sensor_vibration > equipment.vibration_threshold
   OR equipment.sensor_temperature > equipment.temperature_threshold
   OR dependency.status = 'degraded'
WITH equipment,
     COUNT(dependency) AS dependent_count,
     SUM(CASE WHEN dependency.status = 'degraded' THEN 1 ELSE 0 END) AS degraded_dependencies
OPTIONAL MATCH (equipment)<-[:PRODUCES]-(production_line:ProductionLine)
RETURN equipment.id,
       equipment.location,
       equipment.last_maintenance,
       dependent_count,
       degraded_dependencies,
       production_line.daily_output_value AS production_impact,
       CASE
           WHEN degraded_dependencies > 0 THEN 'critical'
           WHEN equipment.sensor_vibration > equipment.vibration_threshold * 1.5 THEN 'urgent'
           WHEN production_line.daily_output_value > 1000000 THEN 'high_priority'
           ELSE 'scheduled'
       END AS maintenance_priority
ORDER BY production_impact DESC
```

## Gaming and Entertainment

### Player Matchmaking

```gql
-- Match players for balanced teams
MATCH (player:Player {id: $player_id, looking_for_match: true})
MATCH (candidate:Player {looking_for_match: true})
WHERE candidate.id <> player.id
  AND ABS(candidate.skill_rating - player.skill_rating) <= 200
  AND candidate.preferred_game_mode = player.preferred_game_mode
WITH player, candidate,
     ABS(candidate.skill_rating - player.skill_rating) AS skill_diff,
     CASE WHEN candidate.region = player.region THEN 0 ELSE 50 END AS region_penalty
OPTIONAL MATCH (player)-[:PLAYED_WITH]->(candidate)
WITH player, candidate, skill_diff, region_penalty,
     COUNT(*) AS previous_matches
RETURN candidate.id,
       candidate.username,
       candidate.skill_rating,
       skill_diff + region_penalty - (previous_matches * 5) AS match_score
ORDER BY match_score ASC
LIMIT 10
```

## Education and Research

### Academic Collaboration Network

```gql
-- Find potential research collaborators
MATCH (researcher:Researcher {id: $researcher_id})-[:PUBLISHED]->(paper:Paper)
      -[:TAGGED_WITH]->(topic:Topic)
MATCH (topic)<-[:TAGGED_WITH]-(other_paper:Paper)<-[:PUBLISHED]-(collaborator:Researcher)
WHERE collaborator.id <> researcher.id
  AND NOT EXISTS {
      MATCH (researcher)-[:CO_AUTHORED]-(collaborator)
  }
WITH collaborator,
     COUNT(DISTINCT topic) AS shared_topics,
     COUNT(DISTINCT other_paper) AS their_papers
OPTIONAL MATCH (collaborator)-[:AFFILIATED_WITH]->(institution:Institution)
                            <-[:AFFILIATED_WITH]-(researcher)
WITH collaborator,
     shared_topics,
     their_papers,
     CASE WHEN institution IS NOT NULL THEN 10 ELSE 0 END AS institution_bonus
RETURN collaborator.name,
       collaborator.field,
       shared_topics,
       their_papers,
       shared_topics * their_papers + institution_bonus AS collaboration_score
ORDER BY collaboration_score DESC
LIMIT 20
```

## Real Estate and Property Management

### Property Valuation Network

```gql
-- Estimate property value based on comparable sales
MATCH (property:Property {id: $property_id})
MATCH (comparable:Property)
WHERE comparable.id <> property.id
  AND comparable.sold_date > current_date() - INTERVAL '12' MONTH
  AND ABS(comparable.square_feet - property.square_feet) < 500
  AND comparable.bedrooms = property.bedrooms
  AND comparable.bathrooms = property.bathrooms
WITH property, comparable,
     point_distance(property.location, comparable.location) AS distance_meters
WHERE distance_meters < 1000
WITH property,
     AVG(comparable.sale_price) AS avg_price,
     collect(comparable.sale_price) /* stddev/variance parse but are never computed; reduce client-side */ AS price_stddev,
     COUNT(comparable) AS comparable_count
RETURN property.address,
       avg_price AS estimated_value,
       price_stddev AS value_uncertainty,
       comparable_count,
       avg_price - (2 * price_stddev) AS low_estimate,
       avg_price + (2 * price_stddev) AS high_estimate
```

## Performance Optimization for Use Cases

### Indexing Strategy

```gql
-- Create indexes for common access patterns

-- Social networks: user lookup
CREATE INDEX user_email ON :User(email);
CREATE INDEX user_username ON :User(username);

-- E-commerce: product search
CREATE INDEX product_category ON :Product(category);
CREATE FULL TEXT INDEX product_search ON :Product(name, description);

-- Finance: transaction lookup
CREATE INDEX transaction_timestamp ON :Transaction(timestamp);
CREATE INDEX account_transactions ON :Account(id);

-- Healthcare: patient records
CREATE INDEX patient_id ON :Patient(id);
CREATE INDEX patient_mrn ON :Patient(medical_record_number);
```

### Query Caching Strategy

```python
from functools import lru_cache
import hashlib
import json

class QueryCache:
    """Cache frequently executed queries."""

    def __init__(self, ttl_seconds=300):
        self.cache = {}
        self.ttl = ttl_seconds

    def cache_key(self, query, params):
        """Generate cache key from query and parameters."""
        param_str = json.dumps(params, sort_keys=True)
        return hashlib.sha256(f"{query}:{param_str}".encode()).hexdigest()

    async def execute(self, client, query, params=None):
        """Execute with caching."""
        key = self.cache_key(query, params or {})

        # Check cache
        if key in self.cache:
            cached_result, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return cached_result

        # Execute and cache
        result, _ = await client.query(query, params)
        self.cache[key] = (result, time.time())
        return result
```

## Further Reading

- [Data Modeling](/tags/modeling/) - Graph schema design
- [Best Practices](/categories/best-practices/) - Development patterns
- [Examples](/categories/examples/) - Code examples
- [Architecture](/docs/architecture/) - System design patterns
- [Performance](/categories/performance-and-scaling/) - Optimization techniques
- [Graph Algorithms](/categories/graph-algorithms-and-analytics/) - Analytics for use cases
