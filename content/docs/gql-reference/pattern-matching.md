---
title: "Pattern Matching in GQL"
description: "Complete reference for pattern matching in Graph Query Language (GQL) including node patterns, relationship patterns, path patterns, and variable-length paths"
summary: "Master GQL pattern matching with comprehensive coverage of node patterns, relationship patterns, variable-length paths, and path expressions for graph queries."
slug: "pattern-matching"
url: "/docs/gql-reference/pattern-matching/"
date: 2026-01-28
lastmod: 2026-01-28
draft: false
weight: 10
keywords: ["pattern matching", "node pattern", "relationship pattern", "path pattern", "variable-length path", "GQL patterns", "graph patterns"]
tags: ["gql", "pattern-matching", "reference"]
categories: ["GQL", "Reference"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/gql-reference/pattern-matching/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Pattern Matching in GQL

Pattern matching is the core of GQL queries. This reference covers all pattern types and their usage in Geode.

## Overview

Patterns describe graph structures to match. They consist of:

- **Node patterns**: Match nodes
- **Relationship patterns**: Match relationships between nodes
- **Path patterns**: Match sequences of nodes and relationships

## Node Patterns

### Basic Syntax

```gql
(variable:Label {property: value})
```

| Component | Description | Required |
|-----------|-------------|----------|
| `variable` | Variable name for referencing | No |
| `Label` | Node label(s) | No |
| `{...}` | Property constraints | No |

### Examples

```gql
-- Any node
(n)

-- Node with label
(p:Person)

-- Anonymous node (no variable)
(:Person)

-- Node with property constraint
(p:Person {name: 'Alice'})

-- Node with multiple properties
(p:Person {name: 'Alice', age: 30})

-- Node with multiple labels
(e:Person:Employee)

-- Just properties, no label
(n {status: 'active'})
```

### Multiple Labels

Nodes can have multiple labels. Match nodes with specific label combinations:

```gql
-- Match nodes with both Person AND Employee labels
MATCH (e:Person:Employee)
RETURN e.name;

-- Match nodes with Person label (may have other labels too)
MATCH (p:Person)
RETURN p.name, labels(p);
```

### Property Constraints

Property constraints filter nodes during matching:

```gql
-- Exact match
(p:Person {name: 'Alice'})

-- Multiple property constraints (AND)
(p:Person {name: 'Alice', city: 'Seattle'})

-- Dynamic values using parameters
(p:Person {id: $user_id})
```

**Note**: For complex filtering (comparisons, OR, etc.), use WHERE clause:

```gql
MATCH (p:Person)
WHERE p.age > 30 AND p.city IN ['Seattle', 'Portland']
RETURN p.name;
```

## Relationship Patterns

### Basic Syntax

```gql
-[variable:TYPE {property: value}]->
```

| Component | Description | Required |
|-----------|-------------|----------|
| `-` or `<-` | Left connection | Yes |
| `[...]` | Relationship details | No |
| `variable` | Variable name | No |
| `TYPE` | Relationship type | No |
| `{...}` | Property constraints | No |
| `->` or `-` | Right connection | Yes |

### Direction

```gql
-- Outgoing relationship (left to right)
(a)-[:KNOWS]->(b)

-- Incoming relationship (right to left)
(a)<-[:KNOWS]-(b)

-- Undirected (either direction)
(a)-[:KNOWS]-(b)
```

### Examples

```gql
-- Any relationship
(a)-[r]->(b)

-- Typed relationship
(a)-[:KNOWS]->(b)

-- Named relationship with type
(a)-[k:KNOWS]->(b)

-- Relationship with properties
(a)-[k:KNOWS {since: 2020}]->(b)

-- Anonymous relationship
(a)-[:KNOWS]->()

-- Multiple relationship types (OR)
(a)-[:KNOWS|:FOLLOWS]->(b)

-- Any relationship type
(a)-[r]->(b)
```

### Multiple Relationship Types

Match any of several relationship types:

```gql
-- Either KNOWS or FOLLOWS
MATCH (a:Person)-[:KNOWS|:FOLLOWS]->(b:Person)
RETURN a.name, b.name;

-- Store type in variable
MATCH (a:Person)-[r:KNOWS|:FOLLOWS]->(b:Person)
RETURN a.name, type(r), b.name;
```

### Relationship Properties

```gql
-- Match specific property value
MATCH (a)-[k:KNOWS {since: 2020}]->(b)
RETURN a.name, b.name;

-- Access relationship properties
MATCH (a)-[k:KNOWS]->(b)
RETURN a.name, b.name, k.since, k.strength;

-- Filter relationship properties in WHERE
MATCH (a)-[k:KNOWS]->(b)
WHERE k.since > 2020
RETURN a.name, b.name;
```

## Path Patterns

### Complete Patterns

A path pattern connects multiple node and relationship patterns:

```gql
-- Two-hop path
(a)-[:KNOWS]->(b)-[:WORKS_FOR]->(c)

-- Named path
path = (a)-[:KNOWS]->(b)-[:WORKS_FOR]->(c)
```

### Path Examples

```gql
-- Find mutual friends
MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend)-[:KNOWS]->(mutual)
WHERE mutual <> alice
RETURN mutual.name;

-- Three-hop pattern
MATCH (a:Person)-[:WORKS_FOR]->(c:Company)-[:LOCATED_IN]->(city:City)
RETURN a.name, c.name, city.name;

-- Diamond pattern
MATCH (a)-[:KNOWS]->(b), (a)-[:KNOWS]->(c), (b)-[:KNOWS]->(d), (c)-[:KNOWS]->(d)
RETURN a.name, b.name, c.name, d.name;
```

### Named Paths

Capture entire path for analysis:

```gql
-- Capture path
MATCH p = (a:Person {name: 'Alice'})-[:KNOWS*]->(b:Person {name: 'Bob'})
RETURN p;

-- Path functions
MATCH p = (a)-[:KNOWS*1..3]->(b)
RETURN nodes(p),         -- List of nodes in path
       relationships(p), -- List of relationships
       length(p);        -- Number of relationships
```

## Variable-Length Paths

### Syntax

```gql
-[:TYPE*min..max]->
```

| Pattern | Meaning |
|---------|---------|
| `*` | Zero or more (any length) |
| `*n` | Exactly n hops |
| `*..n` | Up to n hops (0 to n) |
| `*n..` | n or more hops |
| `*n..m` | Between n and m hops |

### Examples

```gql
-- Exactly 2 hops
MATCH (a)-[:KNOWS*2]->(b)
RETURN a.name, b.name;

-- 1 to 3 hops
MATCH (a)-[:KNOWS*1..3]->(b)
RETURN DISTINCT b.name;

-- Up to 5 hops
MATCH (a)-[:KNOWS*..5]->(b)
RETURN b.name;

-- 2 or more hops
MATCH (a)-[:KNOWS*2..]->(b)
RETURN b.name;

-- Any length (use with caution!)
MATCH (a)-[:KNOWS*]->(b)
RETURN b.name;
```

### Path Variables with Length

```gql
-- Capture path with variable length
MATCH path = (a:Person {name: 'Alice'})-[:KNOWS*1..4]->(b:Person)
RETURN [n IN nodes(path) | n.name] AS names,
       length(path) AS distance;

-- Filter by path length
MATCH path = (a)-[:KNOWS*]->(b)
WHERE length(path) <= 3
RETURN path;
```

### Relationship Variable in Path

Access all relationships in variable-length path:

```gql
-- Check all relationship properties
MATCH path = (a)-[rels:KNOWS*1..3]->(b)
WHERE ALL(r IN rels WHERE r.strength > 0.5)
RETURN a.name, b.name;

-- Aggregate over relationships
MATCH (a)-[rels:TRANSACTION*1..5]->(b)
RETURN a.id, b.id,
       reduce(total = 0, r IN rels | total + r.amount) AS path_total;
```

## Shortest Path

### shortestPath

Find single shortest path:

```gql
MATCH path = shortestPath(
  (a:Person {name: 'Alice'})-[*]-(b:Person {name: 'Bob'})
)
RETURN path, length(path) AS distance;
```

### allShortestPaths

Find all shortest paths (may be multiple with same length):

```gql
MATCH paths = allShortestPaths(
  (a:Person {name: 'Alice'})-[*]-(b:Person {name: 'Bob'})
)
RETURN paths;
```

### Constraints on Shortest Paths

```gql
-- Limit path length
MATCH path = shortestPath(
  (a:Person)-[:KNOWS*..10]-(b:Person)
)
RETURN path;

-- Specific relationship types
MATCH path = shortestPath(
  (a:City)-[:ROAD|:HIGHWAY*]-(b:City)
)
RETURN [n IN nodes(path) | n.name] AS route;

-- With WHERE filter
MATCH path = shortestPath(
  (a:Person)-[*]-(b:Person)
)
WHERE ALL(n IN nodes(path) WHERE n.active = true)
RETURN path;
```

## OPTIONAL MATCH

Match patterns that may not exist:

```gql
-- Include people with no friends
MATCH (p:Person)
OPTIONAL MATCH (p)-[:KNOWS]->(friend:Person)
RETURN p.name, collect(friend.name) AS friends;

-- Multiple optional patterns
MATCH (u:User)
OPTIONAL MATCH (u)-[:PLACED]->(o:Order)
OPTIONAL MATCH (u)-[:REVIEWED]->(r:Review)
RETURN u.name, count(o) AS orders, count(r) AS reviews;
```

### OPTIONAL vs Regular MATCH

```gql
-- Regular MATCH: excludes people with no friends
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN p.name, count(friend);

-- OPTIONAL MATCH: includes people with no friends (count = 0)
MATCH (p:Person)
OPTIONAL MATCH (p)-[:KNOWS]->(friend)
RETURN p.name, count(friend);
```

## Pattern Predicates

### Pattern in WHERE

```gql
-- Check pattern exists
MATCH (p:Person)
WHERE (p)-[:KNOWS]->(:Person {name: 'Alice'})
RETURN p.name;

-- Check pattern does not exist
MATCH (p:Person)
WHERE NOT (p)-[:BLOCKED]->()
RETURN p.name;
```

### EXISTS Subquery

```gql
-- Pattern exists
MATCH (p:Person)
WHERE EXISTS {
  MATCH (p)-[:PURCHASED]->(prod:Product)
  WHERE prod.price > 100
}
RETURN p.name;
```

### Pattern Expressions

```gql
-- Count patterns
MATCH (p:Person)
RETURN p.name,
       size((p)-[:KNOWS]->()) AS outgoing_knows,
       size((p)<-[:KNOWS]-()) AS incoming_knows;
```

## Advanced Patterns

### Disconnected Patterns

Match independent patterns (creates cartesian product):

```gql
-- Two separate patterns
MATCH (a:Person {city: 'Seattle'}), (b:Company {industry: 'Tech'})
RETURN a.name, b.name;
```

### Self-Relationships

```gql
-- Node related to itself
MATCH (n)-[r:LINKS]->(n)
RETURN n.name, r.type;
```

### Mutual Relationships

```gql
-- Bidirectional friendship
MATCH (a:Person)-[:KNOWS]->(b:Person)-[:KNOWS]->(a)
RETURN a.name, b.name;
```

### Negative Patterns

```gql
-- Not friends
MATCH (a:Person), (b:Person)
WHERE a <> b AND NOT (a)-[:KNOWS]-(b)
RETURN a.name, b.name;
```

## Pattern Matching Performance

### Best Practices

1. **Start with selective patterns**

   ```gql
   -- Good: Start with specific node
   MATCH (a:Person {email: 'alice@example.com'})-[:KNOWS]->(b)

   -- Avoid: Start with broad scan
   MATCH (a)-[:KNOWS]->(b:Person {email: 'alice@example.com'})
   ```

2. **Use labels**

   ```gql
   -- Good: Labels enable index usage
   MATCH (p:Person)-[:KNOWS]->(f:Person)

   -- Avoid: No labels means full scan
   MATCH (p)-[:KNOWS]->(f)
   ```

3. **Limit variable-length paths**

   ```gql
   -- Good: Bounded length
   MATCH (a)-[:KNOWS*1..5]->(b)

   -- Dangerous: Unbounded may be slow
   MATCH (a)-[:KNOWS*]->(b)
   ```

4. **Filter early**

   ```gql
   -- Good: Filter in pattern
   MATCH (p:Person {status: 'active'})-[:KNOWS]->(f)

   -- Also good: Filter immediately after
   MATCH (p:Person)-[:KNOWS]->(f)
   WHERE p.status = 'active'
   ```

### Use EXPLAIN

Analyze pattern matching performance:

```gql
EXPLAIN MATCH (a:Person)-[:KNOWS*1..3]->(b:Person)
WHERE a.name = 'Alice'
RETURN b.name;
```

## Common Pattern Examples

### Social Network

```gql
-- Friends of friends (not direct friends)
MATCH (me:Person {name: 'Alice'})-[:KNOWS]->()-[:KNOWS]->(fof)
WHERE NOT (me)-[:KNOWS]->(fof) AND me <> fof
RETURN DISTINCT fof.name;

-- Influence chain
MATCH path = (influencer:Person)-[:FOLLOWS*1..3]->(follower:Person)
WHERE influencer.verified = true
RETURN influencer.name, follower.name, length(path);
```

### E-Commerce

```gql
-- Products frequently bought together
MATCH (p1:Product)<-[:CONTAINS]-(o:Order)-[:CONTAINS]->(p2:Product)
WHERE p1.id < p2.id  -- Avoid duplicates
RETURN p1.name, p2.name, count(o) AS co_purchase_count
ORDER BY co_purchase_count DESC;

-- Customer journey
MATCH path = (c:Customer)-[:VIEWED*1..5]->(p:Product)-[:PURCHASED]->(p)
RETURN c.id, [n IN nodes(path) | n.name];
```

### Knowledge Graph

```gql
-- Concept hierarchy
MATCH path = (specific:Concept)-[:IS_A*1..5]->(general:Concept)
WHERE specific.name = 'German Shepherd'
RETURN [n IN nodes(path) | n.name] AS taxonomy;

-- Entity connections
MATCH (e1:Entity)-[r*1..2]-(e2:Entity)
WHERE e1.name = 'Albert Einstein'
RETURN e2.name, [rel IN r | type(rel)] AS connection_types;
```

## Related Documentation

- **[GQL Quick Reference](/docs/quick-reference/)** - Quick syntax lookup
- **[GQL Tutorial](/docs/gql-tutorial/)** - Learn GQL step by step
- **[Aggregations](/docs/gql-reference/aggregations/)** - Aggregation functions
- **[EXPLAIN and PROFILE](/docs/gql-reference/explain/)** - Query analysis
- **[Query Performance Tuning](/docs/query/performance-tuning/)** - Optimization

---

**Last Updated:** January 28, 2026
**Geode Version:** **GEODE_TAG**+
**GQL Compliance:** ISO/IEC 39075:2024
