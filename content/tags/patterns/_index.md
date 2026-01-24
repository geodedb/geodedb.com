---
title: "Tag: Query Patterns & Best Practices"
description: "Explore Geode documentation tagged with patterns. Learn about patterns features, best practices, and implementation details."
keywords:
  - patterns
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/patterns/"
    noindex: false
---

Query patterns represent proven, reusable solutions to common graph querying challenges. Understanding and applying effective query patterns is essential for writing performant, maintainable GQL queries in Geode. These patterns encode best practices learned from production deployments and help you avoid common pitfalls.

Geode's implementation of the ISO/IEC 39075:2024 GQL standard enables powerful pattern matching capabilities. By mastering query patterns, you can write concise, expressive queries that leverage Geode's optimization engine effectively while maintaining code clarity and performance.

This comprehensive guide explores essential query patterns, from basic node and relationship matching through advanced traversal strategies, aggregation patterns, and optimization techniques.

## Fundamental Pattern Matching

**Basic Node Pattern**:

```gql
-- Match nodes by label
MATCH (u:User)
RETURN u.name, u.email;

-- Match with property filter
MATCH (u:User {status: 'active'})
RETURN u;

-- Match with WHERE clause
MATCH (u:User)
WHERE u.created_at > '2024-01-01'
RETURN u;
```

**Relationship Pattern**:

```gql
-- Match relationship by type
MATCH (u:User)-[:FOLLOWS]->(other:User)
RETURN u.name, other.name;

-- Match with direction
MATCH (u:User)<-[:FOLLOWS]-(follower:User)
RETURN u.name, count(follower) as follower_count;

-- Undirected relationship
MATCH (u:User)-[:FRIENDS]-(friend:User)
RETURN u.name, friend.name;
```

**Variable Length Paths**:

```gql
-- Friends of friends (2 hops)
MATCH (u:User {id: 123})-[:FRIENDS*2]->(fof:User)
RETURN DISTINCT fof.name;

-- 1 to 3 hops
MATCH (u:User {id: 123})-[:KNOWS*1..3]->(connection:User)
RETURN connection.name, length(path) as degrees;

-- Any length (use with caution!)
MATCH path = (start:Node)-[:CONNECTED*]-(end:Node)
WHERE start.id = 1 AND end.id = 999
RETURN path;
```

## Pattern Combination Strategies

**Multiple Patterns (AND logic)**:

```gql
-- User and their posts and comments
MATCH (u:User {id: 123})
MATCH (u)-[:POSTED]->(p:Post)
MATCH (u)-[:COMMENTED]->(c:Comment)
RETURN u, collect(DISTINCT p) as posts, collect(DISTINCT c) as comments;
```

**OPTIONAL MATCH Pattern**:

```gql
-- Include users even if they haven't posted
MATCH (u:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
RETURN u.name, count(p) as post_count;
```

**UNION Pattern**:

```gql
-- Combine multiple patterns
MATCH (u:User)-[:POSTED]->(content:Post)
RETURN u.name, content.title, 'post' as type
UNION ALL
MATCH (u:User)-[:COMMENTED]->(content:Comment)
RETURN u.name, content.text as title, 'comment' as type;
```

## Aggregation Patterns

**Group and Count**:

```gql
-- Users by country
MATCH (u:User)
RETURN u.country, count(*) as user_count
ORDER BY user_count DESC;

-- Posts per user
MATCH (u:User)-[:POSTED]->(p:Post)
RETURN u.name, count(p) as post_count
ORDER BY post_count DESC
LIMIT 10;
```

**Collect Pattern**:

```gql
-- Collect all followers
MATCH (u:User {id: 123})<-[:FOLLOWS]-(follower:User)
RETURN u.name, collect(follower.name) as followers;

-- Collect with DISTINCT
MATCH (u:User)-[:POSTED]->(p:Post)-[:HAS_TAG]->(t:Tag)
RETURN u.name, collect(DISTINCT t.name) as tags;
```

**Statistical Aggregations**:

```gql
-- Compute statistics
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN
  count(p) as total_purchases,
  sum(p.price) as total_spent,
  avg(p.price) as avg_price,
  min(p.price) as cheapest,
  max(p.price) as most_expensive;
```

## Traversal Patterns

**Depth-First Exploration**:

```gql
-- Explore social network depth-first
MATCH path = (start:User {id: 123})-[:FOLLOWS*1..4]->(connected:User)
WHERE connected.id <> 123
RETURN path, length(path) as depth
ORDER BY depth;
```

**Breadth-First Shortest Path**:

```gql
-- Find shortest path between users
MATCH path = shortestPath((u1:User {id: 123})-[:KNOWS*]-(u2:User {id: 456}))
RETURN path, length(path) as distance;

-- All shortest paths
MATCH paths = allShortestPaths((u1:User {id: 123})-[:KNOWS*]-(u2:User {id: 456}))
RETURN paths;
```

**Path Filtering Pattern**:

```gql
-- Paths avoiding specific nodes
MATCH path = (start:User {id: 123})-[:FOLLOWS*1..5]->(end:User)
WHERE NONE(node IN nodes(path) WHERE node.blocked = true)
RETURN path;

-- Paths with all relationships matching criteria
MATCH path = (start)-[r:RATED*1..3]->(end)
WHERE ALL(rel IN relationships(path) WHERE rel.rating >= 4)
RETURN path;
```

## Filtering and Predicate Patterns

**Property Comparison**:

```gql
-- Range filter
MATCH (u:User)
WHERE u.age BETWEEN 18 AND 65
  AND u.country = 'US'
  AND u.verified = true
RETURN u;

-- String matching
MATCH (u:User)
WHERE u.email ENDS WITH '@example.com'
  OR u.name STARTS WITH 'John'
RETURN u;

-- Pattern matching
MATCH (u:User)
WHERE u.email =~ '.*@(gmail|yahoo)\.com'
RETURN u;
```

**List Operations**:

```gql
-- IN operator
MATCH (u:User)
WHERE u.role IN ['admin', 'moderator']
RETURN u;

-- List comprehension
MATCH (u:User)
WHERE ANY(tag IN u.tags WHERE tag STARTS WITH 'tech-')
RETURN u;
```

**Existence Checks**:

```gql
-- Check relationship existence
MATCH (u:User)
WHERE EXISTS { (u)-[:VERIFIED]->(v:Verification) }
RETURN u;

-- Check property existence
MATCH (u:User)
WHERE u.email IS NOT NULL
  AND u.phone IS NOT NULL
RETURN u;
```

## Mutation Patterns

**Create Pattern**:

```gql
-- Create with relationship
CREATE (u:User {name: 'Alice', email: 'alice@example.com'})
CREATE (p:Post {title: 'First Post', content: '...'})
CREATE (u)-[:POSTED {timestamp: current_timestamp()}]->(p)
RETURN u, p;

-- Create from pattern
MATCH (u:User {id: 123})
CREATE (u)-[:POSTED]->(p:Post {title: 'New Post'})
RETURN p;
```

**MERGE Pattern** (upsert):

```gql
-- Create or match user
MERGE (u:User {email: 'alice@example.com'})
ON CREATE SET u.created_at = current_timestamp()
ON MATCH SET u.last_login = current_timestamp()
RETURN u;

-- Merge relationship
MATCH (u1:User {id: 123}), (u2:User {id: 456})
MERGE (u1)-[f:FOLLOWS]->(u2)
ON CREATE SET f.since = current_timestamp()
RETURN f;
```

**Conditional Update Pattern**:

```gql
-- Update with condition
MATCH (u:User {id: 123})
WHERE u.login_count < 1000
SET u.login_count = u.login_count + 1
RETURN u;

-- Batch update
MATCH (p:Post)
WHERE p.created_at < '2020-01-01'
SET p.archived = true
RETURN count(p) as archived_count;
```

## Performance Optimization Patterns

**Index-Backed Lookups**:

```gql
-- Start with indexed lookup
MATCH (u:User {email: 'user@example.com'})  -- Uses index
MATCH (u)-[:POSTED]->(p:Post)
RETURN u, p;

-- Avoid starting with unindexed scan
-- Inefficient:
MATCH (p:Post)
MATCH (p)<-[:POSTED]-(u:User {email: 'user@example.com'})
RETURN u, p;
```

**Early Filtering Pattern**:

```gql
-- Filter early in the query
MATCH (u:User)
WHERE u.country = 'US'  -- Reduce search space early
MATCH (u)-[:POSTED]->(p:Post)
WHERE p.created_at > '2024-01-01'
RETURN u, p;
```

**WITH Clause for Pipeline**:

```gql
-- Break complex queries into stages
MATCH (u:User)
WHERE u.follower_count > 10000
WITH u
ORDER BY u.follower_count DESC
LIMIT 100
MATCH (u)-[:POSTED]->(p:Post)
WHERE p.likes > 1000
RETURN u.name, count(p) as viral_posts;
```

**Avoid Cartesian Products**:

```gql
-- Bad: Cartesian product
MATCH (u:User), (p:Post)  -- Don't do this!
WHERE u.id = p.author_id
RETURN u, p;

-- Good: Use relationship pattern
MATCH (u:User)-[:POSTED]->(p:Post)
RETURN u, p;
```

## Analytical Patterns

**Recommendation Pattern**:

```gql
-- Collaborative filtering
MATCH (u:User {id: 123})-[:LIKED]->(item:Product)
MATCH (similar:User)-[:LIKED]->(item)
WHERE similar.id <> 123
MATCH (similar)-[:LIKED]->(recommendation:Product)
WHERE NOT EXISTS { (u)-[:LIKED]->(recommendation) }
RETURN recommendation.name, count(*) as score
ORDER BY score DESC
LIMIT 10;
```

**Influence Scoring Pattern**:

```gql
-- Calculate user influence
MATCH (u:User)
OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
RETURN
  u.name,
  count(DISTINCT follower) as followers,
  count(DISTINCT p) as posts,
  count(DISTINCT follower) * 2 + count(DISTINCT p) as influence_score
ORDER BY influence_score DESC;
```

**Community Detection Pattern**:

```gql
-- Find connected components
MATCH (u:User {id: 123})-[:KNOWS*]-(connected:User)
RETURN collect(DISTINCT connected.id) as community;

-- Mutual connections
MATCH (u1:User {id: 123})-[:KNOWS]->(mutual:User)<-[:KNOWS]-(u2:User {id: 456})
RETURN count(mutual) as mutual_friends, collect(mutual.name) as names;
```

## Time-Series Patterns

**Temporal Filtering**:

```gql
-- Events in time window
MATCH (e:Event)
WHERE e.timestamp BETWEEN '2024-01-01' AND '2024-12-31'
RETURN e
ORDER BY e.timestamp;

-- Time-based aggregation
MATCH (o:Order)
WHERE o.created_at > current_timestamp() - INTERVAL '30 days'
RETURN
  date_trunc('day', o.created_at) as day,
  count(*) as order_count,
  sum(o.total) as revenue
ORDER BY day;
```

**Trend Analysis Pattern**:

```gql
-- Growth over time
MATCH (u:User)
RETURN
  date_trunc('month', u.created_at) as month,
  count(*) as new_users
ORDER BY month;
```

## Anti-Patterns to Avoid

**Don't Fetch Everything**:

```gql
-- Bad: Returns huge result set
MATCH (n)
RETURN n;

-- Good: Use pagination
MATCH (n:Node)
RETURN n
ORDER BY n.id
LIMIT 100 OFFSET 0;
```

**Don't Use Variable Length Without Bounds**:

```gql
-- Bad: Can explode
MATCH path = (n)-[*]-(m)
RETURN path;

-- Good: Set reasonable limits
MATCH path = (n)-[*1..4]-(m)
RETURN path;
```

**Don't Skip Relationship Direction When Possible**:

```gql
-- Less efficient
MATCH (u:User)-[:FOLLOWS]-(other:User)
RETURN u, other;

-- More efficient (if direction is known)
MATCH (u:User)-[:FOLLOWS]->(other:User)
RETURN u, other;
```

## Best Practices Summary

1. **Start with indexed lookups** to narrow search space early
2. **Filter aggressively** before expensive operations like traversals
3. **Use LIMIT** to prevent unbounded result sets
4. **Break complex queries** into stages with WITH
5. **Leverage relationship direction** when known
6. **Set bounds on variable-length paths** to prevent explosions
7. **Use OPTIONAL MATCH** for left-join semantics
8. **Profile queries** with EXPLAIN and PROFILE to verify optimization
9. **Create appropriate indexes** for frequently filtered properties
10. **Consider cardinality** when ordering MATCH clauses

## Related Topics

- [Query Optimization](/tags/query-optimization/)
- [Performance Tuning](/tags/performance/)
- [Indexing Strategies](/tags/indexing/)
- [Pattern Matching](/tags/pattern-matching/)
- [GQL Query Language](/tags/gql/)
- [Best Practices](/tags/best-practices/)

## Further Reading

- GQL Pattern Matching Specification
- Query Performance Optimization Guide
- Graph Algorithm Patterns
- Advanced Traversal Techniques
- Production Query Patterns