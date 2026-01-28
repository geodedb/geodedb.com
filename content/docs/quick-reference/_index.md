---
title: "GQL Quick Reference"
description: "Quick reference guide for Graph Query Language (GQL) syntax, common patterns, and essential commands in Geode"
summary: "Fast lookup reference for GQL syntax including pattern matching, data modification, aggregations, transactions, and common query patterns."
weight: 25
keywords:
  - GQL quick reference
  - GQL cheat sheet
  - graph query syntax
  - pattern matching reference
  - GQL commands
  - Geode reference
tags:
  - gql
  - reference
  - quick-reference
  - cheat-sheet
categories:
  - reference
  - gql
toc: true
params:
  seo:
    keywords: "GQL quick reference, GQL cheat sheet, graph query syntax, pattern matching, Geode GQL"
    description: "Quick reference guide for GQL syntax and common query patterns in Geode graph database"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# GQL Quick Reference

A fast-lookup reference for Graph Query Language (GQL) syntax, patterns, and commands. Use this guide for quick syntax checks and common pattern examples.

## Pattern Syntax

### Node Patterns

```gql
-- Basic node
(n)

-- Node with label
(n:Person)

-- Node with multiple labels
(n:Person:Employee)

-- Node with properties
(n:Person {name: 'Alice', age: 30})

-- Anonymous node
(:Person)
```

### Relationship Patterns

```gql
-- Directed relationship (outgoing)
(a)-[:KNOWS]->(b)

-- Directed relationship (incoming)
(a)<-[:KNOWS]-(b)

-- Undirected relationship
(a)-[:KNOWS]-(b)

-- Relationship with properties
(a)-[:KNOWS {since: 2020}]->(b)

-- Relationship with variable
(a)-[r:KNOWS]->(b)

-- Multiple relationship types
(a)-[:KNOWS|:FOLLOWS]->(b)
```

### Variable-Length Paths

```gql
-- Exactly 2 hops
(a)-[:KNOWS*2]->(b)

-- 1 to 3 hops
(a)-[:KNOWS*1..3]->(b)

-- 0 or more hops
(a)-[:KNOWS*0..]->(b)

-- 1 or more hops
(a)-[:KNOWS*1..]->(b)

-- Up to 5 hops
(a)-[:KNOWS*..5]->(b)
```

## Query Clauses

### MATCH

```gql
-- Basic match
MATCH (n:Person)
RETURN n.name

-- Multiple patterns
MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN a.name, b.name

-- Optional match (left outer join)
MATCH (a:Person)
OPTIONAL MATCH (a)-[:WORKS_FOR]->(c:Company)
RETURN a.name, c.name
```

### WHERE

```gql
-- Equality
WHERE n.name = 'Alice'

-- Comparison
WHERE n.age > 30
WHERE n.age >= 18 AND n.age <= 65

-- String matching
WHERE n.name STARTS WITH 'A'
WHERE n.name ENDS WITH 'son'
WHERE n.name CONTAINS 'li'

-- Regular expression
WHERE n.email =~ '.*@example\\.com'

-- IN list
WHERE n.status IN ['active', 'pending']

-- NULL checks
WHERE n.email IS NOT NULL
WHERE n.deleted IS NULL

-- Boolean operators
WHERE n.active = true AND n.verified = true
WHERE n.role = 'admin' OR n.role = 'moderator'
WHERE NOT n.banned
```

### RETURN

```gql
-- Return properties
RETURN n.name, n.age

-- Alias
RETURN n.name AS person_name

-- Expression
RETURN n.firstName + ' ' + n.lastName AS full_name

-- Distinct
RETURN DISTINCT n.city

-- All properties
RETURN n
```

### ORDER BY

```gql
-- Ascending (default)
ORDER BY n.name

-- Descending
ORDER BY n.age DESC

-- Multiple columns
ORDER BY n.lastName, n.firstName

-- Mixed direction
ORDER BY n.score DESC, n.name ASC

-- NULL handling
ORDER BY n.value NULLS FIRST
ORDER BY n.value NULLS LAST
```

### LIMIT and OFFSET

```gql
-- Limit results
LIMIT 10

-- Skip first N results
OFFSET 20

-- Pagination
LIMIT 10 OFFSET 20
```

### WITH

```gql
-- Pipeline stages
MATCH (n:Person)
WITH n, n.age AS age
WHERE age > 30
RETURN n.name

-- Aggregation in pipeline
MATCH (p:Person)-[:PURCHASED]->(prod:Product)
WITH p, count(prod) AS purchases
WHERE purchases > 5
RETURN p.name, purchases
```

## Data Modification

### CREATE

```gql
-- Create node
CREATE (n:Person {name: 'Alice', age: 30})

-- Create with return
CREATE (n:Person {name: 'Bob'})
RETURN n

-- Create relationship
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
CREATE (a)-[:KNOWS {since: 2024}]->(b)

-- Create path
CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})
```

### MERGE

```gql
-- Merge node (create if not exists)
MERGE (n:Person {email: 'alice@example.com'})

-- On create/match actions
MERGE (n:Person {email: 'alice@example.com'})
ON CREATE SET n.created = datetime()
ON MATCH SET n.accessed = datetime()

-- Merge relationship
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
MERGE (a)-[:KNOWS]->(b)
```

### SET

```gql
-- Set property
SET n.age = 31

-- Set multiple properties
SET n.age = 31, n.city = 'Seattle'

-- Set from map
SET n += {age: 31, city: 'Seattle'}

-- Set label
SET n:Employee

-- Remove property (set to null)
SET n.temp = null
```

### REMOVE

```gql
-- Remove property
REMOVE n.temp

-- Remove label
REMOVE n:Temporary
```

### DELETE

```gql
-- Delete node (must have no relationships)
MATCH (n:Person {name: 'Alice'})
DELETE n

-- Delete relationship
MATCH (a)-[r:KNOWS]->(b)
DELETE r

-- Detach delete (delete node and all relationships)
MATCH (n:Person {name: 'Alice'})
DETACH DELETE n
```

## Aggregation Functions

### Count

```gql
-- Count all
RETURN count(*)

-- Count nodes
RETURN count(n)

-- Count distinct
RETURN count(DISTINCT n.city)
```

### Numeric Aggregations

```gql
-- Sum
RETURN sum(n.amount)

-- Average
RETURN avg(n.score)

-- Minimum
RETURN min(n.age)

-- Maximum
RETURN max(n.price)

-- Standard deviation
RETURN stdev(n.value)
```

### Collection Aggregations

```gql
-- Collect into list
RETURN collect(n.name)

-- Collect distinct
RETURN collect(DISTINCT n.city)
```

### Grouping

```gql
-- Group by (implicit)
MATCH (p:Person)-[:LIVES_IN]->(c:City)
RETURN c.name, count(p) AS population

-- Multiple grouping keys
MATCH (e:Employee)
RETURN e.department, e.role, count(e)
```

## Path Functions

```gql
-- Get nodes in path
nodes(path)

-- Get relationships in path
relationships(path)

-- Path length
length(path)

-- Shortest path
MATCH path = shortestPath((a:Person)-[*]-(b:Person))
RETURN path

-- All shortest paths
MATCH path = allShortestPaths((a:Person)-[*]-(b:Person))
RETURN path
```

## List Operations

```gql
-- Create list
[1, 2, 3, 4, 5]

-- List comprehension
[x IN range(1, 10) | x * 2]

-- Filter list
[x IN list WHERE x > 5]

-- Access element
list[0]        -- First element
list[-1]       -- Last element
list[1..3]     -- Slice

-- List functions
size(list)
head(list)
tail(list)
last(list)
```

## String Functions

```gql
-- Case conversion
toUpper(str)
toLower(str)

-- Trimming
trim(str)
ltrim(str)
rtrim(str)

-- Substring
substring(str, start, length)

-- Replace
replace(str, search, replacement)

-- Split
split(str, delimiter)

-- Length
size(str)
```

## Date and Time

```gql
-- Current datetime
datetime()

-- Parse datetime
datetime('2026-01-28T10:30:00')

-- Date only
date('2026-01-28')

-- Time only
time('10:30:00')

-- Duration
duration({days: 7, hours: 2})

-- Date arithmetic
datetime() + duration({days: 30})
datetime().subtract(P7D)
```

## Transactions

### Basic Transaction

```gql
-- Start transaction
BEGIN

-- Execute queries
CREATE (n:Person {name: 'Alice'})

-- Commit
COMMIT

-- Or rollback
ROLLBACK
```

### Transaction Control

```gql
-- Begin with isolation level
BEGIN TRANSACTION
  ISOLATION LEVEL SERIALIZABLE

-- Savepoints
SAVEPOINT sp1
-- ... queries ...
ROLLBACK TO SAVEPOINT sp1
```

## Common Patterns

### Find Connected Nodes

```gql
-- Direct connections
MATCH (a:Person {name: 'Alice'})-[:KNOWS]->(friend)
RETURN friend.name

-- Friends of friends
MATCH (a:Person {name: 'Alice'})-[:KNOWS*2]->(fof)
WHERE fof <> a
RETURN DISTINCT fof.name
```

### Recommendation Pattern

```gql
-- Collaborative filtering
MATCH (me:User {id: 123})-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(other:User)-[:PURCHASED]->(rec:Product)
WHERE NOT (me)-[:PURCHASED]->(rec)
RETURN rec.name, count(*) AS score
ORDER BY score DESC
LIMIT 10
```

### Aggregation by Category

```gql
MATCH (p:Product)
RETURN p.category,
       count(p) AS count,
       avg(p.price) AS avg_price,
       min(p.price) AS min_price,
       max(p.price) AS max_price
ORDER BY count DESC
```

### Conditional Return

```gql
MATCH (u:User)
RETURN u.name,
       CASE
         WHEN u.orders > 100 THEN 'VIP'
         WHEN u.orders > 50 THEN 'Premium'
         ELSE 'Standard'
       END AS tier
```

### Null Handling

```gql
MATCH (u:User)
RETURN u.name,
       coalesce(u.nickname, u.name) AS display_name,
       coalesce(u.phone, 'N/A') AS phone
```

## Query Analysis

### EXPLAIN

```gql
-- Show execution plan (no execution)
EXPLAIN MATCH (n:Person) WHERE n.age > 30 RETURN n.name
```

### PROFILE

```gql
-- Execute and show metrics
PROFILE MATCH (n:Person) WHERE n.age > 30 RETURN n.name
```

## Index Commands

### Create Index

```gql
-- Property index
CREATE INDEX person_email_idx ON Person (email)

-- Composite index
CREATE INDEX order_customer_date_idx ON Order (customer_id, order_date)

-- Full-text index
CREATE FULLTEXT INDEX product_search_idx ON Product (name, description)
```

### Show Indexes

```gql
SHOW INDEXES
```

### Drop Index

```gql
DROP INDEX person_email_idx
```

## Constraint Commands

### Unique Constraint

```gql
CREATE CONSTRAINT unique_email ON Person ASSERT email IS UNIQUE
```

### Existence Constraint

```gql
CREATE CONSTRAINT person_name_exists ON Person ASSERT name IS NOT NULL
```

### Show Constraints

```gql
SHOW CONSTRAINTS
```

## Graph Management

### Create Graph

```gql
CREATE GRAPH my_graph
```

### Use Graph

```gql
USE my_graph
```

### Drop Graph

```gql
DROP GRAPH my_graph
```

## REPL Meta Commands

```bash
# Help
\help

# Connect to server
\connect host:port

# Enable timing
\timing on

# Change output format
\format json
\format table

# Transaction control
\begin
\commit
\rollback

# Quit
\quit
```

## Related Documentation

- **[GQL Guide](/docs/gql/guide/)** - Complete GQL language guide
- **[Advanced Patterns](/docs/gql/advanced-patterns/)** - Complex query patterns
- **[Pattern Matching](/docs/gql-reference/pattern-matching/)** - Detailed pattern matching
- **[Aggregations](/docs/gql-reference/aggregations/)** - Aggregation functions reference
- **[EXPLAIN and PROFILE](/docs/query/explain-profile/)** - Query analysis
- **[Tutorials](/docs/tutorials/)** - Hands-on learning

---

**Last Updated:** January 28, 2026
**Geode Version:** v0.18.0+
**GQL Compliance:** ISO/IEC 39075:2024
