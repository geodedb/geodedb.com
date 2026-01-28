---
title: "GQL Tutorial"
description: "Step-by-step tutorial for learning Graph Query Language (GQL) from basics to advanced patterns in Geode"
summary: "Learn GQL through hands-on examples covering pattern matching, data modification, aggregations, and advanced query techniques for graph databases."
weight: 15
keywords:
  - GQL tutorial
  - learn GQL
  - graph query tutorial
  - pattern matching tutorial
  - Geode tutorial
  - graph database tutorial
tags:
  - tutorial
  - gql
  - learning
  - getting-started
categories:
  - tutorials
  - gql
toc: true
params:
  seo:
    keywords: "GQL tutorial, learn GQL, graph query language tutorial, Geode tutorial, graph database learning"
    description: "Step-by-step GQL tutorial for learning graph queries from basics to advanced patterns"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# GQL Tutorial

Welcome to the Graph Query Language (GQL) tutorial. This guide will take you from GQL basics to writing advanced graph queries through hands-on examples and exercises.

## What You'll Learn

By the end of this tutorial, you will be able to:

- Create and query nodes and relationships
- Use pattern matching to find graph structures
- Filter, sort, and paginate results
- Aggregate data with COUNT, SUM, AVG, and more
- Modify graph data with CREATE, SET, and DELETE
- Write complex queries with multiple clauses
- Optimize queries for performance

## Prerequisites

Before starting:

1. **Geode installed and running** - See [Installation Guide](/docs/overview/)
2. **Access to the Geode shell** - `geode shell`
3. **No prior GQL experience required** - SQL knowledge helpful but not necessary

## Part 1: Getting Started

### Connecting to Geode

Start the Geode interactive shell:

```bash
geode shell

# Output:
# Geode Shell v0.18.0
# Connected to localhost:3141
# Type \help for commands
# geode>
```

### Creating a Sample Graph

Let's create a simple social network:

```gql
-- Create the graph
CREATE GRAPH SocialNetwork;
USE SocialNetwork;

-- Create some people
CREATE (:Person {name: 'Alice', age: 30, city: 'Seattle'});
CREATE (:Person {name: 'Bob', age: 28, city: 'Portland'});
CREATE (:Person {name: 'Carol', age: 35, city: 'Seattle'});
CREATE (:Person {name: 'David', age: 32, city: 'Vancouver'});
CREATE (:Person {name: 'Eve', age: 27, city: 'Portland'});
```

**What happened?**
- `CREATE GRAPH` creates a new graph database
- `USE` switches to that graph
- `CREATE` with `(:Person {...})` creates nodes with the `Person` label and properties

### Creating Relationships

Connect the people with KNOWS relationships:

```gql
-- Create friendships
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
CREATE (a)-[:KNOWS {since: 2020}]->(b);

MATCH (a:Person {name: 'Alice'}), (c:Person {name: 'Carol'})
CREATE (a)-[:KNOWS {since: 2018}]->(c);

MATCH (b:Person {name: 'Bob'}), (c:Person {name: 'Carol'})
CREATE (b)-[:KNOWS {since: 2021}]->(c);

MATCH (c:Person {name: 'Carol'}), (d:Person {name: 'David'})
CREATE (c)-[:KNOWS {since: 2019}]->(d);

MATCH (d:Person {name: 'David'}), (e:Person {name: 'Eve'})
CREATE (d)-[:KNOWS {since: 2022}]->(e);
```

**Graph Structure Created:**
```
Alice --KNOWS--> Bob --KNOWS--> Carol --KNOWS--> David --KNOWS--> Eve
  |                              ^
  +----------KNOWS---------------+
```

## Part 2: Basic Queries

### Query 1: Find All People

```gql
MATCH (p:Person)
RETURN p.name, p.age, p.city;
```

**Expected Output:**
```
| p.name  | p.age | p.city    |
|---------|-------|-----------|
| Alice   | 30    | Seattle   |
| Bob     | 28    | Portland  |
| Carol   | 35    | Seattle   |
| David   | 32    | Vancouver |
| Eve     | 27    | Portland  |
```

**Explanation:**
- `MATCH (p:Person)` finds all nodes with the `Person` label
- `p` is a variable that refers to each matched node
- `RETURN p.name, p.age, p.city` selects which properties to display

### Query 2: Filter with WHERE

Find people over 30:

```gql
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name, p.age;
```

**Output:**
```
| p.name | p.age |
|--------|-------|
| Carol  | 35    |
| David  | 32    |
```

### Query 3: Multiple Conditions

Find people in Seattle under 35:

```gql
MATCH (p:Person)
WHERE p.city = 'Seattle' AND p.age < 35
RETURN p.name, p.age, p.city;
```

**Output:**
```
| p.name | p.age | p.city  |
|--------|-------|---------|
| Alice  | 30    | Seattle |
```

### Query 4: Sorting Results

Order by age (descending):

```gql
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY p.age DESC;
```

**Output:**
```
| p.name | p.age |
|--------|-------|
| Carol  | 35    |
| David  | 32    |
| Alice  | 30    |
| Bob    | 28    |
| Eve    | 27    |
```

### Query 5: Limiting Results

Get the 3 oldest people:

```gql
MATCH (p:Person)
RETURN p.name, p.age
ORDER BY p.age DESC
LIMIT 3;
```

**Output:**
```
| p.name | p.age |
|--------|-------|
| Carol  | 35    |
| David  | 32    |
| Alice  | 30    |
```

## Part 3: Relationship Queries

### Query 6: Find Direct Connections

Find who Alice knows:

```gql
MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend:Person)
RETURN friend.name;
```

**Output:**
```
| friend.name |
|-------------|
| Bob         |
| Carol       |
```

**Explanation:**
- `(alice:Person {name: 'Alice'})` matches the specific Alice node
- `-[:KNOWS]->` matches outgoing KNOWS relationships
- `(friend:Person)` captures the connected Person nodes

### Query 7: Bidirectional Relationships

Find anyone connected to Bob (in or out):

```gql
MATCH (bob:Person {name: 'Bob'})-[:KNOWS]-(connected:Person)
RETURN connected.name;
```

**Output:**
```
| connected.name |
|----------------|
| Alice          |
| Carol          |
```

**Note:** `-[:KNOWS]-` (no arrow) matches both directions.

### Query 8: Relationship Properties

Find when friendships were created:

```gql
MATCH (a:Person)-[k:KNOWS]->(b:Person)
RETURN a.name, b.name, k.since;
```

**Output:**
```
| a.name | b.name | k.since |
|--------|--------|---------|
| Alice  | Bob    | 2020    |
| Alice  | Carol  | 2018    |
| Bob    | Carol  | 2021    |
| Carol  | David  | 2019    |
| David  | Eve    | 2022    |
```

### Query 9: Friends of Friends

Find Alice's friends-of-friends:

```gql
MATCH (alice:Person {name: 'Alice'})-[:KNOWS*2]->(fof:Person)
WHERE fof <> alice
RETURN DISTINCT fof.name;
```

**Output:**
```
| fof.name |
|----------|
| Carol    |
| David    |
```

**Explanation:**
- `-[:KNOWS*2]->` means exactly 2 hops
- `WHERE fof <> alice` excludes Alice herself
- `DISTINCT` removes duplicates

### Query 10: Variable-Length Paths

Find everyone reachable from Alice:

```gql
MATCH (alice:Person {name: 'Alice'})-[:KNOWS*1..4]->(reachable:Person)
RETURN DISTINCT reachable.name;
```

**Output:**
```
| reachable.name |
|----------------|
| Bob            |
| Carol          |
| David          |
| Eve            |
```

**Explanation:** `-[:KNOWS*1..4]->` matches paths of 1 to 4 hops.

## Part 4: Aggregation

### Query 11: Count Nodes

Count all people:

```gql
MATCH (p:Person)
RETURN count(p) AS total_people;
```

**Output:**
```
| total_people |
|--------------|
| 5            |
```

### Query 12: Group By and Count

Count people by city:

```gql
MATCH (p:Person)
RETURN p.city, count(p) AS population
ORDER BY population DESC;
```

**Output:**
```
| p.city    | population |
|-----------|------------|
| Seattle   | 2          |
| Portland  | 2          |
| Vancouver | 1          |
```

### Query 13: Multiple Aggregations

Calculate age statistics by city:

```gql
MATCH (p:Person)
RETURN p.city,
       count(p) AS count,
       avg(p.age) AS avg_age,
       min(p.age) AS youngest,
       max(p.age) AS oldest;
```

**Output:**
```
| p.city    | count | avg_age | youngest | oldest |
|-----------|-------|---------|----------|--------|
| Seattle   | 2     | 32.5    | 30       | 35     |
| Portland  | 2     | 27.5    | 27       | 28     |
| Vancouver | 1     | 32.0    | 32       | 32     |
```

### Query 14: Count Relationships

Count friendships per person:

```gql
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN p.name, count(friend) AS friends
ORDER BY friends DESC;
```

**Output:**
```
| p.name | friends |
|--------|---------|
| Alice  | 2       |
| Bob    | 1       |
| Carol  | 1       |
| David  | 1       |
```

### Query 15: COLLECT Aggregation

Collect friends into a list:

```gql
MATCH (p:Person)-[:KNOWS]->(friend)
RETURN p.name, collect(friend.name) AS friend_list;
```

**Output:**
```
| p.name | friend_list      |
|--------|------------------|
| Alice  | [Bob, Carol]     |
| Bob    | [Carol]          |
| Carol  | [David]          |
| David  | [Eve]            |
```

## Part 5: Data Modification

### Query 16: Update Properties

Update Alice's age:

```gql
MATCH (p:Person {name: 'Alice'})
SET p.age = 31
RETURN p.name, p.age;
```

### Query 17: Add New Properties

Add email to all people:

```gql
MATCH (p:Person)
SET p.email = toLower(p.name) + '@example.com'
RETURN p.name, p.email;
```

### Query 18: Remove Properties

Remove the email property:

```gql
MATCH (p:Person)
REMOVE p.email
RETURN p.name, p.email;
```

### Query 19: Delete Relationships

Remove friendship between Alice and Bob:

```gql
MATCH (a:Person {name: 'Alice'})-[k:KNOWS]->(b:Person {name: 'Bob'})
DELETE k;
```

### Query 20: Delete Nodes

Delete a person (must delete relationships first):

```gql
-- First, delete relationships
MATCH (p:Person {name: 'Eve'})-[r]-()
DELETE r;

-- Then delete the node
MATCH (p:Person {name: 'Eve'})
DELETE p;

-- Or use DETACH DELETE to do both
MATCH (p:Person {name: 'Eve'})
DETACH DELETE p;
```

## Part 6: Advanced Queries

### Query 21: WITH Clause

Use WITH for query pipelines:

```gql
MATCH (p:Person)-[:KNOWS]->(friend)
WITH p, count(friend) AS friend_count
WHERE friend_count >= 2
RETURN p.name, friend_count;
```

**Explanation:** WITH passes intermediate results to subsequent clauses.

### Query 22: OPTIONAL MATCH

Find people and their friends (including those with no friends):

```gql
MATCH (p:Person)
OPTIONAL MATCH (p)-[:KNOWS]->(friend)
RETURN p.name, count(friend) AS friends;
```

**Note:** OPTIONAL MATCH is like a LEFT JOIN - it returns rows even when no match is found.

### Query 23: CASE Expressions

Categorize people by age:

```gql
MATCH (p:Person)
RETURN p.name, p.age,
       CASE
         WHEN p.age < 30 THEN 'Young'
         WHEN p.age < 35 THEN 'Middle'
         ELSE 'Senior'
       END AS category;
```

### Query 24: COALESCE for Defaults

Handle missing properties:

```gql
MATCH (p:Person)
RETURN p.name, coalesce(p.nickname, p.name) AS display_name;
```

### Query 25: Shortest Path

Find shortest path between two people:

```gql
MATCH path = shortestPath(
  (alice:Person {name: 'Alice'})-[*]-(eve:Person {name: 'Eve'})
)
RETURN [n IN nodes(path) | n.name] AS path_names,
       length(path) AS distance;
```

## Practice Exercises

### Exercise 1: Basic Query

**Task:** Find all people in Portland, sorted by age (youngest first).

<details>
<summary>Solution</summary>

```gql
MATCH (p:Person)
WHERE p.city = 'Portland'
RETURN p.name, p.age
ORDER BY p.age ASC;
```
</details>

### Exercise 2: Relationship Query

**Task:** Find all pairs of people who know each other and both live in the same city.

<details>
<summary>Solution</summary>

```gql
MATCH (a:Person)-[:KNOWS]->(b:Person)
WHERE a.city = b.city
RETURN a.name, b.name, a.city;
```
</details>

### Exercise 3: Aggregation

**Task:** Find the average age of people who have at least 1 friend.

<details>
<summary>Solution</summary>

```gql
MATCH (p:Person)-[:KNOWS]->()
WITH DISTINCT p
RETURN avg(p.age) AS avg_age;
```
</details>

### Exercise 4: Path Query

**Task:** Find all paths of length 3 starting from Alice.

<details>
<summary>Solution</summary>

```gql
MATCH path = (alice:Person {name: 'Alice'})-[:KNOWS*3]->(end)
RETURN [n IN nodes(path) | n.name] AS path;
```
</details>

### Exercise 5: Complex Query

**Task:** For each city, find the most connected person (person with the most outgoing KNOWS relationships).

<details>
<summary>Solution</summary>

```gql
MATCH (p:Person)-[:KNOWS]->(friend)
WITH p, count(friend) AS connections
ORDER BY connections DESC
WITH p.city AS city, collect({name: p.name, connections: connections})[0] AS top
RETURN city, top.name AS most_connected, top.connections;
```
</details>

## Common Mistakes

### Mistake 1: Missing Variable

```gql
-- Wrong: No variable to reference
MATCH (:Person)
RETURN name;  -- Error: name is not bound

-- Right: Use a variable
MATCH (p:Person)
RETURN p.name;
```

### Mistake 2: Forgetting DISTINCT

```gql
-- May have duplicates
MATCH (a)-[:KNOWS*1..3]->(b)
RETURN b.name;

-- Use DISTINCT to remove duplicates
MATCH (a)-[:KNOWS*1..3]->(b)
RETURN DISTINCT b.name;
```

### Mistake 3: Deleting Nodes with Relationships

```gql
-- Wrong: Will fail if node has relationships
MATCH (p:Person {name: 'Alice'})
DELETE p;

-- Right: Use DETACH DELETE
MATCH (p:Person {name: 'Alice'})
DETACH DELETE p;
```

### Mistake 4: Cartesian Product

```gql
-- Warning: This creates a cartesian product (every combination)
MATCH (a:Person), (b:Person)
WHERE a.city = b.city
RETURN a.name, b.name;

-- Better: Be explicit about the pattern
MATCH (a:Person)-[:LIVES_IN]->(c:City)<-[:LIVES_IN]-(b:Person)
RETURN a.name, b.name;
```

## Next Steps

Congratulations on completing the GQL tutorial! Continue learning with:

- **[Advanced Patterns](/docs/gql/advanced-patterns/)** - Complex query techniques
- **[Pattern Matching Reference](/docs/gql-reference/pattern-matching/)** - Complete pattern syntax
- **[Aggregations Reference](/docs/gql-reference/aggregations/)** - All aggregation functions
- **[EXPLAIN and PROFILE](/docs/query/explain-profile/)** - Query analysis and optimization
- **[Tutorials](/docs/tutorials/)** - More hands-on guides
- **[GQL Guide](/docs/gql/guide/)** - Complete language reference

## Quick Reference Card

```gql
-- Node pattern
(variable:Label {prop: value})

-- Relationship pattern
-[var:TYPE {prop: value}]->

-- Variable-length path
-[:TYPE*min..max]->

-- Query structure
MATCH pattern
WHERE condition
WITH projection
RETURN expression
ORDER BY column
LIMIT n

-- Aggregations
count(*), sum(n.x), avg(n.x), min(n.x), max(n.x), collect(n.x)

-- Modification
CREATE (n:Label {props})
SET n.prop = value
REMOVE n.prop
DELETE n
DETACH DELETE n
```

---

**Last Updated:** January 28, 2026
**Geode Version:** v0.18.0+
**GQL Compliance:** ISO/IEC 39075:2024
