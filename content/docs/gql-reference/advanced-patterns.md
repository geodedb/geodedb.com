---
title: "Advanced Pattern Matching Reference"
description: "Complete reference for advanced GQL pattern matching including variable-length paths, quantified patterns, path expressions, and complex graph traversals"
summary: "Comprehensive pattern matching reference covering variable-length paths, quantified patterns, shortest path algorithms, pattern predicates, and complex traversal techniques."
slug: "advanced-patterns"
url: "/docs/gql-reference/advanced-patterns/"
date: 2026-01-28
lastmod: 2026-01-28
draft: false
weight: 20
keywords: ["pattern matching", "variable-length paths", "shortest path", "path expressions", "graph traversal", "quantified patterns"]
tags: ["reference", "gql", "patterns", "traversal"]
categories: ["GQL Reference"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/gql-reference/advanced-patterns/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Advanced Pattern Matching Reference

This reference documents advanced GQL pattern matching capabilities including variable-length paths, quantified patterns, path expressions, and complex graph traversals.

## Pattern Syntax Overview

### Basic Pattern Elements

```bnf
<pattern> ::=
    <node-pattern>
  | <node-pattern> <relationship-pattern> <node-pattern>
  | <path-pattern>

<node-pattern> ::=
    '(' [<variable>] [<label-expression>] [<properties>] ')'

<relationship-pattern> ::=
    <left-arrow>? '-' [<relationship-detail>] '-' <right-arrow>?

<relationship-detail> ::=
    '[' [<variable>] [<type-expression>] [<quantifier>] [<properties>] ']'
```

---

## Node Patterns

### Basic Node Pattern

```gql
-- Anonymous node
MATCH (n)
RETURN n;

-- Named node
MATCH (person)
RETURN person;

-- With label
MATCH (p:Person)
RETURN p;

-- Multiple labels
MATCH (e:Person:Employee)
RETURN e;

-- With properties
MATCH (p:Person {name: 'Alice', age: 30})
RETURN p;
```

### Label Expressions

```gql
-- Single label
MATCH (n:Person)

-- Multiple labels (AND - node must have all)
MATCH (n:Person:Employee)

-- Label disjunction (OR - node must have at least one)
MATCH (n:Person|Company)

-- Label negation
MATCH (n:!Deleted)

-- Complex label expressions
MATCH (n:(Person|Company)&!Archived)
```

### Property Predicates in Pattern

```gql
-- Equality
MATCH (p:Person {name: 'Alice'})

-- Multiple properties
MATCH (p:Person {name: 'Alice', active: true})

-- With parameter
MATCH (p:Person {email: $email})

-- NULL property (use WHERE instead)
MATCH (p:Person)
WHERE p.phone IS NULL
```

---

## Relationship Patterns

### Direction

```gql
-- Outgoing
MATCH (a)-[r]->(b)

-- Incoming
MATCH (a)<-[r]-(b)

-- Undirected (either direction)
MATCH (a)-[r]-(b)
```

### Relationship Types

```gql
-- Single type
MATCH (a)-[:KNOWS]->(b)

-- Multiple types (OR)
MATCH (a)-[:KNOWS|FRIENDS_WITH]->(b)

-- Any type (omit type specification)
MATCH (a)-[r]->(b)
```

### Relationship Properties

```gql
-- With properties
MATCH (a)-[r:KNOWS {since: 2020}]->(b)

-- Named with properties
MATCH (a)-[friendship:FRIENDS_WITH {since: $year}]->(b)
RETURN friendship.trust_level;
```

---

## Variable-Length Paths

### Syntax

```bnf
<quantifier> ::=
    '*'                    -- Zero or more (Kleene star)
  | '*' <min>              -- At least min
  | '*' <min> '..'         -- At least min (same as above)
  | '*' '..' <max>         -- Zero to max
  | '*' <min> '..' <max>   -- Min to max (inclusive)
  | '+' equivalent to '*1..'
```

### Examples

```gql
-- Any length (0 or more hops)
MATCH (a)-[:KNOWS*]->(b)
RETURN a, b;

-- Exactly 2 hops
MATCH (a)-[:KNOWS*2]->(b)
RETURN a, b;

-- 1 to 3 hops (inclusive)
MATCH (a)-[:KNOWS*1..3]->(b)
RETURN a, b;

-- At least 2 hops
MATCH (a)-[:KNOWS*2..]->(b)
RETURN a, b;

-- Up to 5 hops (0 to 5)
MATCH (a)-[:KNOWS*..5]->(b)
RETURN a, b;

-- One or more hops (+ quantifier)
MATCH (a)-[:KNOWS+]->(b)
RETURN a, b;
```

### Capturing Path as Variable

```gql
-- Capture entire path
MATCH path = (a:Person {name: 'Alice'})-[:KNOWS*1..3]->(b:Person)
RETURN path, length(path) AS hops;

-- Access path elements
MATCH path = (a)-[:KNOWS*]->(b)
RETURN nodes(path) AS all_nodes,
       relationships(path) AS all_rels,
       length(path) AS hop_count;
```

### Variable-Length with Multiple Types

```gql
-- Multiple relationship types
MATCH (a)-[:KNOWS|WORKS_WITH*1..3]->(b)
RETURN a.name, b.name;

-- Undirected variable-length
MATCH (a)-[:KNOWS*1..5]-(b)
RETURN a.name, b.name;
```

---

## Path Patterns

### Named Paths

```gql
-- Assign path to variable
MATCH p = (a:Person)-[:KNOWS]->(b:Person)-[:WORKS_AT]->(c:Company)
RETURN p;

-- Multiple paths
MATCH
  social_path = (a)-[:KNOWS*]->(b),
  work_path = (b)-[:WORKS_AT]->(c)
RETURN social_path, work_path;
```

### Path Functions

```gql
-- Path length (number of relationships)
MATCH p = (a)-[:KNOWS*]->(b)
RETURN length(p) AS hops;

-- All nodes in path
MATCH p = (a)-[*]->(b)
RETURN nodes(p) AS path_nodes;

-- All relationships in path
MATCH p = (a)-[*]->(b)
RETURN relationships(p) AS path_rels;

-- First and last nodes
MATCH p = (a)-[*]->(b)
RETURN head(nodes(p)) AS start_node,
       last(nodes(p)) AS end_node;
```

---

## Shortest Path

### shortestPath

Finds a single shortest path between two nodes.

```gql
-- Shortest path with any relationship type
MATCH p = shortestPath((a:Person {name: 'Alice'})-[*]-(b:Person {name: 'Bob'}))
RETURN p, length(p) AS distance;

-- Shortest path with specific type
MATCH p = shortestPath((a:Person {name: 'Alice'})-[:KNOWS*]-(b:Person {name: 'Bob'}))
RETURN p;

-- With maximum depth
MATCH p = shortestPath((a:Person {name: 'Alice'})-[*..10]-(b:Person {name: 'Bob'}))
RETURN p;

-- With WHERE on path
MATCH p = shortestPath((a:Person)-[:KNOWS*]-(b:Person))
WHERE a.name = 'Alice' AND b.name = 'Bob'
  AND ALL(n IN nodes(p) WHERE n.active = true)
RETURN p;
```

### allShortestPaths

Finds all paths of the shortest length.

```gql
-- All shortest paths
MATCH p = allShortestPaths((a:Person {name: 'Alice'})-[*]-(b:Person {name: 'Bob'}))
RETURN p, length(p);

-- With constraint
MATCH p = allShortestPaths((a:City {name: 'Seattle'})-[:CONNECTED*]-(b:City {name: 'Boston'}))
WHERE ALL(r IN relationships(p) WHERE r.active = true)
RETURN p, [n IN nodes(p) | n.name] AS route;
```

### Shortest Path Performance

| Constraint | Impact |
|------------|--------|
| Max depth (`*..N`) | Limits search depth |
| Relationship type | Reduces edges to traverse |
| Direction | Reduces edges by 50% |
| WHERE on path | Applied after finding paths |

**Best practices:**

```gql
-- Always specify maximum depth for production queries
MATCH p = shortestPath((a)-[*..15]-(b))  -- Reasonable limit
RETURN p;

-- Use direction when possible
MATCH p = shortestPath((a)-[:REPORTS_TO*]->(b))  -- Only outgoing
RETURN p;
```

---

## Quantified Path Patterns

### Pattern Quantification

```gql
-- Repeated pattern
MATCH (a)-[:KNOWS]->{1,3}(b)  -- 1 to 3 KNOWS relationships
RETURN a, b;

-- Pattern group quantification
MATCH (a)(()-[:KNOWS]->()-[:WORKS_AT]->())+(b)
RETURN a, b;
```

### Path Pattern Selectors

```gql
-- TRAIL: No repeated edges
MATCH TRAIL (a)-[*]-(b)
WHERE a.name = 'Alice'
RETURN b;

-- ACYCLIC: No repeated nodes
MATCH ACYCLIC (a)-[*]-(b)
WHERE a.name = 'Alice'
RETURN b;

-- SIMPLE: No repeated nodes except endpoints can match
MATCH SIMPLE (a)-[*]-(b)
RETURN a, b;
```

---

## Pattern Predicates

### EXISTS

Check for pattern existence without returning matches.

```gql
-- Has at least one KNOWS relationship
MATCH (p:Person)
WHERE EXISTS { (p)-[:KNOWS]->() }
RETURN p.name;

-- Complex existence check
MATCH (p:Person)
WHERE EXISTS {
  MATCH (p)-[:WORKS_AT]->(c:Company)
  WHERE c.size > 1000
}
RETURN p.name AS enterprise_employee;
```

### COUNT in Pattern

```gql
-- Count matching patterns
MATCH (p:Person)
WHERE COUNT { (p)-[:KNOWS]->() } > 5
RETURN p.name AS popular_person;

-- Relationship count
MATCH (p:Person)
RETURN p.name, COUNT { (p)-[:KNOWS]->() } AS friend_count;
```

### ALL, ANY, NONE, SINGLE

```gql
-- ALL nodes in path satisfy condition
MATCH p = (a)-[:KNOWS*]->(b)
WHERE ALL(n IN nodes(p) WHERE n.active = true)
RETURN p;

-- ANY node in path satisfies condition
MATCH p = (a)-[:KNOWS*]->(b)
WHERE ANY(n IN nodes(p) WHERE n.verified = true)
RETURN p;

-- NONE of the nodes satisfy condition
MATCH p = (a)-[:KNOWS*]->(b)
WHERE NONE(n IN nodes(p) WHERE n.blocked = true)
RETURN p;

-- Exactly SINGLE node satisfies condition
MATCH p = (a)-[:KNOWS*]->(b)
WHERE SINGLE(n IN nodes(p) WHERE n.admin = true)
RETURN p;
```

---

## Pattern Comprehensions

### List Comprehension from Pattern

```gql
-- Collect pattern results into list
MATCH (p:Person)
RETURN p.name,
       [(p)-[:KNOWS]->(friend) | friend.name] AS friend_names;

-- With filter
MATCH (p:Person)
RETURN p.name,
       [(p)-[:KNOWS]->(f:Person) WHERE f.age > 30 | f.name] AS older_friends;

-- Nested comprehension
MATCH (p:Person)
RETURN p.name,
       [(p)-[:KNOWS]->(f) | {
         name: f.name,
         mutual: [(f)-[:KNOWS]->(m) WHERE (p)-[:KNOWS]->(m) | m.name]
       }] AS friends_with_mutual;
```

### Map Pattern Results

```gql
-- Pattern to map
MATCH (p:Person)
RETURN p.name,
       [(p)-[r:WORKED_AT]->(c:Company) | {
         company: c.name,
         from: r.start_date,
         to: r.end_date,
         duration: duration.between(r.start_date, r.end_date)
       }] AS work_history;
```

---

## Complex Pattern Examples

### Social Network Analysis

```gql
-- Friends of friends (not direct friends)
MATCH (me:Person {name: 'Alice'})-[:KNOWS]->(friend)-[:KNOWS]->(fof:Person)
WHERE NOT (me)-[:KNOWS]->(fof)
  AND me <> fof
RETURN DISTINCT fof.name AS recommendation;

-- Mutual friends count
MATCH (a:Person {name: 'Alice'})-[:KNOWS]->(mutual)<-[:KNOWS]-(b:Person {name: 'Bob'})
RETURN COUNT(mutual) AS mutual_friend_count;

-- Influence path
MATCH path = (influencer:Person {name: 'Alice'})-[:FOLLOWS*1..4]->(follower:Person)
WHERE follower.follower_count > 10000
RETURN path, length(path) AS degrees_of_separation;
```

### Organizational Hierarchy

```gql
-- All reports (direct and indirect)
MATCH (ceo:Person {title: 'CEO'})<-[:REPORTS_TO*]-(employee:Person)
RETURN employee.name, length(shortestPath((employee)-[:REPORTS_TO*]->(ceo))) AS level;

-- Team hierarchy
MATCH path = (manager:Person {name: 'Alice'})<-[:REPORTS_TO*0..]-(member:Person)
RETURN [n IN nodes(path) | n.name] AS chain,
       length(path) AS depth;

-- Find common manager
MATCH (a:Person {name: 'Alice'})-[:REPORTS_TO*]->(manager:Person)<-[:REPORTS_TO*]-(b:Person {name: 'Bob'})
RETURN manager.name AS common_manager
ORDER BY length(shortestPath((a)-[:REPORTS_TO*]->(manager)))
LIMIT 1;
```

### Graph Algorithms via Patterns

```gql
-- Triangle detection
MATCH (a)-[:KNOWS]->(b)-[:KNOWS]->(c)-[:KNOWS]->(a)
WHERE id(a) < id(b) AND id(b) < id(c)  -- Avoid duplicates
RETURN a.name, b.name, c.name;

-- Cycle detection
MATCH path = (n)-[*]->(n)
WHERE length(path) > 0
RETURN DISTINCT n.name AS node_in_cycle,
       [m IN nodes(path) | m.name] AS cycle;

-- Bridge nodes (connecting different communities)
MATCH (a:Person)-[:KNOWS]->(bridge:Person)-[:KNOWS]->(b:Person)
WHERE NOT (a)-[:KNOWS*..2]-(b)
RETURN bridge.name, COUNT(DISTINCT a) + COUNT(DISTINCT b) AS connections;
```

### Supply Chain

```gql
-- Product dependencies
MATCH path = (product:Product {name: 'Widget'})-[:REQUIRES*]->(component:Part)
RETURN [n IN nodes(path) | n.name] AS dependency_chain;

-- Critical path
MATCH path = (start:Task {name: 'Start'})-[:DEPENDS_ON*]->(end:Task {name: 'End'})
WITH path, REDUCE(total = 0, t IN nodes(path) | total + t.duration) AS path_duration
RETURN path, path_duration
ORDER BY path_duration DESC
LIMIT 1;

-- Single point of failure
MATCH (p:Part)<-[:REQUIRES*]-(products:Product)
WITH p, COUNT(DISTINCT products) AS dependent_products
WHERE dependent_products > 10
RETURN p.name AS critical_component, dependent_products;
```

---

## Performance Optimization

### Pattern Selectivity

Order patterns from most selective to least selective:

```gql
-- Good: Start with selective pattern
MATCH (p:Person {email: 'alice@example.com'})  -- Unique, indexed
MATCH (p)-[:KNOWS*1..3]->(friend)             -- Expansion after
RETURN friend;

-- Bad: Start with broad pattern
MATCH (friend:Person)                          -- All persons
MATCH (p:Person {email: 'alice@example.com'})-[:KNOWS*1..3]->(friend)
RETURN friend;
```

### Limiting Variable-Length Paths

```gql
-- Always set reasonable bounds
MATCH (a)-[:KNOWS*1..5]->(b)  -- Max 5 hops

-- Use LIMIT early
MATCH (a:Person {name: 'Alice'})-[:KNOWS*]->(b)
RETURN b
LIMIT 100;
```

### Using EXPLAIN

```gql
EXPLAIN
MATCH (a:Person {name: 'Alice'})-[:KNOWS*1..3]->(b)
RETURN b.name;

-- Check for:
-- 1. Index usage on starting node
-- 2. Estimated rows at each step
-- 3. Expansion operator type
```

---

## Pattern Matching Best Practices

### 1. Anchor Your Patterns

```gql
-- Good: Start from a specific node
MATCH (start:Person {id: 123})-[:KNOWS*]->(end)
RETURN end;

-- Avoid: Unanchored patterns
MATCH ()-[:KNOWS*]->()  -- Scans everything
```

### 2. Use Direction When Possible

```gql
-- Better: Directed
MATCH (a)-[:FOLLOWS]->(b)

-- Slower: Undirected (doubles the search space)
MATCH (a)-[:FOLLOWS]-(b)
```

### 3. Filter Early

```gql
-- Good: Filter in pattern
MATCH (p:Person {active: true})-[:KNOWS]->(f)
RETURN f;

-- Less efficient: Filter after
MATCH (p:Person)-[:KNOWS]->(f)
WHERE p.active = true
RETURN f;
```

### 4. Avoid Unbounded Paths in Production

```gql
-- Dangerous: Can traverse entire graph
MATCH (a)-[*]->(b)

-- Safe: Bounded depth
MATCH (a)-[*..10]->(b)
```

---

## Related Documentation

- [GQL Guide](/docs/gql/guide/) - Query language tutorial
- [GQL Specification](/docs/gql-reference/specification/) - ISO standard reference
- [Query Optimization](/docs/architecture/query-optimization/) - Optimizer details
- [Advanced GQL Patterns](/docs/gql/advanced-patterns/) - Tutorial with examples

---

**Last Updated:** January 28, 2026
**Geode Version:** **GEODE_TAG**+
**ISO GQL Conformance Profile:** ISO/IEC 39075:2024 compliance (see conformance profile)
