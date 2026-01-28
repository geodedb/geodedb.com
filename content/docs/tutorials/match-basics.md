---
title: "MATCH Basics Tutorial"
description: "Step-by-step tutorial for learning GQL pattern matching fundamentals: creating nodes, relationships, and querying graph data with MATCH clauses"
keywords: ["MATCH tutorial", "pattern matching", "GQL basics", "graph queries", "node creation", "relationship patterns", "WHERE clause", "RETURN clause"]
weight: 20
slug: "match-basics"
url: "/docs/tutorials/match-basics/"
canonical: "https://geodedb.com/docs/tutorials/match-basics/"
---

<!-- CANARY: REQ=REQ-GQL-017-TUTORIAL; FEATURE="Docs"; ASPECT=Tutorial; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-16 -->

# MATCH Basics Tutorial

Learn fundamental pattern matching with GQL in this hands-on 10-minute tutorial.

## Prerequisites

- Geode server running (`geode serve`)
- Access to Geode shell (`geode shell`) or a client library
- No prior graph database experience required

### Connect with Client Libraries

{{< tabs >}}
{{< tab "Go" >}}
```go
import (
    "database/sql"
    _ "geodedb.com/geode"
)

db, err := sql.Open("geode", "localhost:3141")
if err != nil {
    log.Fatal(err)
}
defer db.Close()
```
{{< /tab >}}
{{< tab "Python" >}}
```python
from geode_client import Client

client = Client(host="localhost", port=3141, skip_verify=True)
# Use: async with client.connection() as conn:
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::Client;

let client = Client::new("127.0.0.1", 3141).skip_verify(true);
let mut conn = client.connect().await?;
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { createClient } from '@geodedb/client';

const client = await createClient('geode://localhost:3141');
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const geode = @import("geode_client");

var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
try client.connect();
try client.sendHello("match-tutorial", "1.0.0");
_ = try client.receiveMessage(30000);
```
{{< /tab >}}
{{< /tabs >}}

## Tutorial Overview

**Time**: 10 minutes
**Difficulty**: Beginner
**Topics**: Graph creation, node creation, relationships, basic queries

By the end of this tutorial, you'll be able to:
- Create a graph and add nodes
- Create relationships between nodes
- Query nodes with pattern matching
- Filter results with WHERE clauses
- Return specific properties

## Step 1: Create a Graph

Start by creating a new graph for this tutorial:

```gql
CREATE GRAPH SocialNetwork;
```

**Expected output**:
```
Graph 'SocialNetwork' created successfully
```

Switch to using the graph:

```gql
USE SocialNetwork;
```

**Expected output**:
```
Using graph 'SocialNetwork'
```

### What You Learned

- `CREATE GRAPH` creates a new named graph
- `USE` switches your session to work with a specific graph
- Graph names are case-sensitive

## Step 2: Create Nodes

Create three person nodes with properties:

```gql
CREATE
  (:Person {name: "Alice", age: 30}),
  (:Person {name: "Bob", age: 25}),
  (:Person {name: "Charlie", age: 35});
```

**Expected output**:
```
Created 3 nodes
```

### Node Syntax Breakdown

```gql
(:Label {property: value, ...})
```

- `()` - Node pattern
- `:Label` - Node label (type)
- `{...}` - Property map
- `property: value` - Key-value pairs

### What You Learned

- Nodes have labels (like `:Person`)
- Nodes can have multiple properties
- `CREATE` can create multiple nodes in one statement
- Properties use JSON-like syntax

## Step 3: Create Relationships

Connect Alice and Bob with a KNOWS relationship:

```gql
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:KNOWS {since: 2020}]->(b);
```

**Expected output**:
```
Created 1 relationship
```

### Relationship Syntax Breakdown

```gql
(a)-[:TYPE {property: value}]->(b)
```

- `(a)` and `(b)` - Start and end nodes
- `-[:TYPE]->` - Directed relationship with type
- `{...}` - Relationship properties

### What You Learned

- `MATCH` finds existing nodes
- Relationships connect two nodes
- Relationships have types (like `:KNOWS`)
- Relationships can have properties
- `->` indicates direction

## Step 4: Query All Nodes

Retrieve all person nodes:

```gql
MATCH (p:Person)
RETURN p.name, p.age;
```

### Execute with Client Libraries

{{< tabs >}}
{{< tab "Go" >}}
```go
rows, err := db.QueryContext(ctx, "MATCH (p:Person) RETURN p.name, p.age")
if err != nil {
    log.Fatal(err)
}
defer rows.Close()

for rows.Next() {
    var name string
    var age int
    if err := rows.Scan(&name, &age); err != nil {
        log.Fatal(err)
    }
    fmt.Printf("%s: %d\n", name, age)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async with client.connection() as conn:
    page, _ = await conn.query("MATCH (p:Person) RETURN p.name, p.age")
    for row in page.rows:
        name = row["p.name"].as_string
        age = row["p.age"].as_int
        print(f"{name}: {age}")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
let (page, _) = conn.query("MATCH (p:Person) RETURN p.name, p.age").await?;
for row in &page.rows {
    let name = row.get("p.name").unwrap().as_string()?;
    let age = row.get("p.age").unwrap().as_int()?;
    println!("{}: {}", name, age);
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
const rows = await client.queryAll('MATCH (p:Person) RETURN p.name, p.age');
for (const row of rows) {
    const name = row.get('p.name')?.asString;
    const age = row.get('p.age')?.asNumber;
    console.log(`${name}: ${age}`);
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
try client.sendRunGql(1, "MATCH (p:Person) RETURN p.name, p.age", null);
const schema = try client.receiveMessage(30000);
defer allocator.free(schema);

try client.sendPull(1, 1000);
const result = try client.receiveMessage(30000);
defer allocator.free(result);
// Parse JSON response
std.debug.print("Result: {s}\n", .{result});
```
{{< /tab >}}
{{< /tabs >}}

**Expected output**:
```
name     | age
---------|----
Alice    | 30
Bob      | 25
Charlie  | 35
```

### Query Breakdown

- `MATCH (p:Person)` - Find all Person nodes, bind to variable `p`
- `RETURN p.name, p.age` - Return specific properties
- Variables (`p`) are used to reference matched elements

### What You Learned

- `MATCH` patterns find nodes in the graph
- Variables bind matched elements for later use
- `RETURN` specifies which data to output
- Property access uses dot notation (`p.name`)

## Step 5: Filter with WHERE

Find people older than 26:

```gql
MATCH (p:Person)
WHERE p.age > 26
RETURN p.name, p.age
ORDER BY p.age DESC;
```

**Expected output**:
```
name     | age
---------|----
Charlie  | 35
Alice    | 30
```

### Query Breakdown

- `WHERE p.age > 26` - Filter condition
- `ORDER BY p.age DESC` - Sort results (descending)
- Only nodes matching the condition are returned

### Comparison Operators

```gql
=   -- Equal
<>  -- Not equal
<   -- Less than
<=  -- Less than or equal
>   -- Greater than
>=  -- Greater than or equal
```

### What You Learned

- `WHERE` filters matched nodes
- Comparison operators work like SQL
- `ORDER BY` sorts results
- `DESC` = descending, `ASC` = ascending (default)

## Step 6: Query Relationships

Find all KNOWS relationships:

```gql
MATCH (a:Person)-[k:KNOWS]->(b:Person)
RETURN a.name AS from, b.name AS to, k.since AS year;
```

### Execute with Client Libraries

{{< tabs >}}
{{< tab "Go" >}}
```go
rows, _ := db.QueryContext(ctx, `
    MATCH (a:Person)-[k:KNOWS]->(b:Person)
    RETURN a.name AS from, b.name AS to, k.since AS year
`)
defer rows.Close()

for rows.Next() {
    var from, to string
    var year int
    rows.Scan(&from, &to, &year)
    fmt.Printf("%s knows %s since %d\n", from, to, year)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
page, _ = await conn.query("""
    MATCH (a:Person)-[k:KNOWS]->(b:Person)
    RETURN a.name AS from, b.name AS to, k.since AS year
""")
for row in page.rows:
    print(f"{row['from'].as_string} knows {row['to'].as_string} since {row['year'].as_int}")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
let (page, _) = conn.query(r#"
    MATCH (a:Person)-[k:KNOWS]->(b:Person)
    RETURN a.name AS from, b.name AS to, k.since AS year
"#).await?;

for row in &page.rows {
    println!("{} knows {} since {}",
        row.get("from").unwrap().as_string()?,
        row.get("to").unwrap().as_string()?,
        row.get("year").unwrap().as_int()?);
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
const rows = await client.queryAll(`
    MATCH (a:Person)-[k:KNOWS]->(b:Person)
    RETURN a.name AS from, b.name AS to, k.since AS year
`);
for (const row of rows) {
    console.log(`${row.get('from')?.asString} knows ${row.get('to')?.asString} since ${row.get('year')?.asNumber}`);
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
try client.sendRunGql(1,
    \\MATCH (a:Person)-[k:KNOWS]->(b:Person)
    \\RETURN a.name AS from, b.name AS to, k.since AS year
, null);
const schema = try client.receiveMessage(30000);
defer allocator.free(schema);

try client.sendPull(1, 1000);
const result = try client.receiveMessage(30000);
defer allocator.free(result);
std.debug.print("Result: {s}\n", .{result});
```
{{< /tab >}}
{{< /tabs >}}

**Expected output**:
```
from   | to  | year
-------|-----|------
Alice  | Bob | 2020
```

### Relationship Pattern Breakdown

```gql
(a:Person)-[k:KNOWS]->(b:Person)
```

- `(a:Person)` - Source node
- `-[k:KNOWS]->` - Relationship with type, bound to variable `k`
- `(b:Person)` - Target node
- Matches only relationships from Person to Person

### Column Aliases

```gql
RETURN a.name AS from
```

- `AS` creates column alias
- Makes output more readable
- Useful for complex expressions

### What You Learned

- Relationships are matched with `-[variable:TYPE]->`
- Relationship properties are accessed like node properties
- `AS` creates column aliases for output
- Relationship patterns specify source and target nodes

## Step 7: Bidirectional Matching

Create a bidirectional relationship:

```gql
MATCH (b:Person {name: "Bob"}), (c:Person {name: "Charlie"})
CREATE (b)-[:KNOWS]->(c);
```

Now query without direction:

```gql
MATCH (p1:Person)-[:KNOWS]-(p2:Person)
WHERE p1.name = "Bob"
RETURN p1.name, p2.name;
```

**Expected output**:
```
name | name
-----|--------
Bob  | Alice
Bob  | Charlie
```

### Undirected vs Directed

```gql
-[:KNOWS]-   -- Matches either direction
-[:KNOWS]->  -- Matches only left-to-right
<-[:KNOWS]-  -- Matches only right-to-left
```

### What You Learned

- Omit `>` or `<` for bidirectional matching
- Same relationship can be traversed in either direction
- `WHERE` can filter on matched variables

## Step 8: Multiple Relationships

Create more connections:

```gql
MATCH (a:Person {name: "Alice"}), (c:Person {name: "Charlie"})
CREATE (a)-[:KNOWS]->(c);

MATCH (c:Person {name: "Charlie"}), (a:Person {name: "Alice"})
CREATE (c)-[:LIKES]->(a);
```

Query multiple relationship types:

```gql
MATCH (p1:Person)-[r]->(p2:Person)
RETURN p1.name, type(r) AS relationship_type, p2.name
ORDER BY p1.name, relationship_type;
```

**Expected output**:
```
name    | relationship_type | name
--------|-------------------|--------
Alice   | KNOWS             | Bob
Alice   | KNOWS             | Charlie
Bob     | KNOWS             | Charlie
Charlie | LIKES             | Alice
```

### Relationship Type Functions

```gql
type(r)  -- Returns relationship type as string
```

### What You Learned

- `[r]` without type matches any relationship
- `type(r)` function returns relationship type
- Multiple relationship types can exist between same nodes
- Results can be sorted by multiple columns

## Step 9: Count Aggregation

Count nodes and relationships:

```gql
-- Count all people
MATCH (p:Person)
RETURN count(p) AS total_people;

-- Count relationships
MATCH ()-[r:KNOWS]->()
RETURN count(r) AS total_knows;

-- Count per person
MATCH (p:Person)-[r:KNOWS]->()
RETURN p.name, count(r) AS connections
ORDER BY connections DESC;
```

**Expected output**:
```
total_people
------------
3

total_knows
-----------
3

name    | connections
--------|------------
Alice   | 2
Bob     | 1
Charlie | 0
```

### Aggregation Functions

```gql
count(x)  -- Count non-null values
sum(x)    -- Sum numeric values
avg(x)    -- Average
min(x)    -- Minimum
max(x)    -- Maximum
```

### What You Learned

- `count()` aggregates matched elements
- Aggregations collapse multiple rows
- Can combine aggregations with grouping
- `ORDER BY` works with aggregated values

## Step 10: Pattern Variables

Match multi-hop paths:

```gql
-- Find friends of friends
MATCH (a:Person {name: "Alice"})-[:KNOWS]->()-[:KNOWS]->(fof:Person)
WHERE fof <> a
RETURN DISTINCT fof.name AS friend_of_friend;
```

**Expected output**:
```
friend_of_friend
----------------
Charlie
```

### Pattern Breakdown

- `()-[:KNOWS]->()` - Anonymous intermediate node
- `fof <> a` - Exclude Alice herself
- `DISTINCT` - Remove duplicates

### What You Learned

- Anonymous nodes `()` match any node
- Multi-hop patterns traverse multiple relationships
- `<>` is "not equal" operator
- `DISTINCT` removes duplicate results

## Complete Example: Social Network Analysis

Put it all together:

```gql
-- Create a larger network
CREATE
  (:Person {name: "David", age: 28}),
  (:Person {name: "Emma", age: 32});

MATCH (a:Person {name: "Alice"}), (d:Person {name: "David"})
CREATE (a)-[:KNOWS {since: 2021}]->(d);

MATCH (b:Person {name: "Bob"}), (e:Person {name: "Emma"})
CREATE (b)-[:KNOWS {since: 2019}]->(e);

-- Find most connected people
MATCH (p:Person)
OPTIONAL MATCH (p)-[r:KNOWS]-()
RETURN p.name, p.age, count(r) AS connections
ORDER BY connections DESC, p.age ASC;
```

**Expected output**:
```
name    | age | connections
--------|-----|------------
Alice   | 30  | 3
Bob     | 25  | 2
Charlie | 35  | 0
David   | 28  | 0
Emma    | 32  | 0
```

### What You Learned

- `OPTIONAL MATCH` returns null if no match (like LEFT JOIN)
- Combine multiple `ORDER BY` criteria
- Build complex queries incrementally

## Common Patterns Reference

### Find Node by Property

```gql
MATCH (n:Label {property: value})
RETURN n;
```

### Find Related Nodes

```gql
MATCH (a:Label1)-[:REL_TYPE]->(b:Label2)
RETURN a, b;
```

### Filter with Multiple Conditions

```gql
MATCH (n:Label)
WHERE n.prop1 > 10 AND n.prop2 = 'value'
RETURN n;
```

### Count Relationships

```gql
MATCH (n)-[r:TYPE]-()
RETURN n, count(r) AS rel_count;
```

### Find Paths

```gql
MATCH path = (a)-[:TYPE*1..3]->(b)
RETURN path;
```

## Practice Exercises

### Exercise 1: Create Your Own Network

Create a network of movies and actors:

```gql
CREATE GRAPH MovieNetwork;
USE MovieNetwork;

-- Create movies
CREATE
  (:Movie {title: "The Matrix", year: 1999}),
  (:Movie {title: "John Wick", year: 2014});

-- Create actors
CREATE
  (:Actor {name: "Keanu Reeves", born: 1964}),
  (:Actor {name: "Laurence Fishburne", born: 1961});

-- Connect actors to movies
MATCH (k:Actor {name: "Keanu Reeves"}), (m1:Movie {title: "The Matrix"})
CREATE (k)-[:ACTED_IN {role: "Neo"}]->(m1);

MATCH (k:Actor {name: "Keanu Reeves"}), (m2:Movie {title: "John Wick"})
CREATE (k)-[:ACTED_IN {role: "John Wick"}]->(m2);

MATCH (l:Actor {name: "Laurence Fishburne"}), (m:Movie {title: "The Matrix"})
CREATE (l)-[:ACTED_IN {role: "Morpheus"}]->(m);
```

**Questions**:
1. Find all actors in "The Matrix"
2. Find all movies featuring Keanu Reeves
3. Count how many movies each actor has been in
4. Find actors who appeared in the same movie

### Exercise 2: Add More Relationships

Extend the social network:

```gql
USE SocialNetwork;

-- Add workplace
MATCH (a:Person {name: "Alice"}), (b:Person {name: "Bob"})
CREATE (a)-[:WORKS_WITH]->(b);

-- Add location
MATCH (p:Person)
WHERE p.name IN ["Alice", "Bob"]
SET p.city = "Seattle";

MATCH (p:Person)
WHERE p.name = "Charlie"
SET p.city = "Portland";
```

**Questions**:
1. Find people who both know each other AND work together
2. Find people in the same city
3. Count relationships per person (all types)

### Exercise 3: Complex Queries

Challenge yourself:

```gql
-- Find triangles (3 people who all know each other)
MATCH (a:Person)-[:KNOWS]->(b:Person)-[:KNOWS]->(c:Person)-[:KNOWS]->(a)
RETURN a.name, b.name, c.name;

-- Find people with no connections
MATCH (p:Person)
WHERE NOT EXISTS ((p)-[:KNOWS]-())
RETURN p.name;

-- Calculate average age by city
MATCH (p:Person)
RETURN p.city, avg(p.age) AS avg_age, count(p) AS population
ORDER BY avg_age DESC;
```

## Solutions

<details>
<summary>Exercise 1 Solutions</summary>

```gql
-- 1. Find all actors in "The Matrix"
MATCH (a:Actor)-[:ACTED_IN]->(m:Movie {title: "The Matrix"})
RETURN a.name, a.born;

-- 2. Find all movies featuring Keanu Reeves
MATCH (k:Actor {name: "Keanu Reeves"})-[r:ACTED_IN]->(m:Movie)
RETURN m.title, m.year, r.role;

-- 3. Count movies per actor
MATCH (a:Actor)-[:ACTED_IN]->(m:Movie)
RETURN a.name, count(m) AS movie_count
ORDER BY movie_count DESC;

-- 4. Find co-actors
MATCH (a1:Actor)-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(a2:Actor)
WHERE a1 <> a2
RETURN a1.name, a2.name, m.title;
```
</details>

<details>
<summary>Exercise 2 Solutions</summary>

```gql
-- 1. People who know each other AND work together
MATCH (a:Person)-[:KNOWS]->(b:Person)
WHERE EXISTS ((a)-[:WORKS_WITH]->(b))
RETURN a.name, b.name;

-- 2. People in same city
MATCH (p1:Person), (p2:Person)
WHERE p1.city = p2.city AND p1 <> p2
RETURN DISTINCT p1.name, p2.name, p1.city;

-- 3. Count all relationships per person
MATCH (p:Person)
OPTIONAL MATCH (p)-[r]-()
RETURN p.name, count(r) AS total_connections
ORDER BY total_connections DESC;
```
</details>

## Troubleshooting

### Common Errors

**Error**: "Graph 'SocialNetwork' not found"
- **Solution**: Run `CREATE GRAPH SocialNetwork` first

**Error**: "Variable 'p' not defined"
- **Solution**: Ensure variable is defined in MATCH clause before using in RETURN

**Error**: "Node with label 'Person' and properties {name: 'Alice'} not found"
- **Solution**: Check node exists with `MATCH (p:Person) RETURN p.name`

### Performance Tips

- Use specific labels instead of matching all nodes
- Filter early with WHERE clauses
- Create indexes on frequently queried properties (see [Indexing Tutorial](/docs/tutorials/indexing-tutorial/))
- Limit results with `LIMIT` when testing large datasets

## Next Steps

Now that you understand MATCH basics, continue learning:

1. **[Indexing Tutorial](/docs/tutorials/indexing-tutorial/)** - Optimize query performance
2. **[Graph Algorithms Tutorial](/docs/tutorials/graph-algorithms-tutorial/)** - PageRank, community detection
3. **[GQL Guide](/docs/gql/guide/)** - Complete language reference
4. **[Data Model](/docs/model/data-model-and-types/)** - Property graph concepts

## Quick Reference

### Node Patterns

```gql
()                    -- Any node
(:Label)              -- Node with label
({prop: value})       -- Node with property
(:Label {prop: val})  -- Both label and property
(n)                   -- Bind to variable n
```

### Relationship Patterns

```gql
-[:TYPE]->            -- Directed relationship
-[:TYPE]-             -- Any direction
<-[:TYPE]-            -- Reverse direction
-[r:TYPE]->           -- Bind to variable r
-[{prop: val}]->      -- With properties
```

### Clauses

```gql
CREATE                -- Create nodes/relationships
MATCH                 -- Find patterns
WHERE                 -- Filter conditions
RETURN                -- Output results
ORDER BY              -- Sort results
LIMIT                 -- Restrict result count
DISTINCT              -- Remove duplicates
```

### Functions

```gql
count(x)              -- Count elements
type(r)               -- Relationship type
EXISTS(pattern)       -- Check pattern exists
```

---

**Tutorial Complete!** You now understand the fundamentals of pattern matching in GQL.

**Next**: [Indexing and Optimization Tutorial](/docs/tutorials/indexing-tutorial/)
