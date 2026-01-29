---
title: "UNWIND Clause - List Processing in GQL"
description: "Use the UNWIND clause in GQL to expand lists into rows for batch operations, data transformation, and efficient bulk processing in Geode."
keywords:
  - UNWIND
  - list processing
  - batch operations
  - GQL
  - data transformation
  - bulk insert
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/unwind/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# UNWIND Clause in Geode

The UNWIND clause transforms a list into individual rows, enabling powerful batch operations and list processing. It's essential for bulk data loading, transformations, and working with collection properties.

## Basic Syntax

UNWIND expands each list element into a separate row:

```gql
UNWIND [1, 2, 3, 4, 5] AS number
RETURN number;

-- Returns:
-- number
-- 1
-- 2
-- 3
-- 4
-- 5
```

## Batch Insert Operations

UNWIND enables efficient bulk inserts with a single query:

```gql
-- Insert multiple users in one query
UNWIND $users AS user
CREATE (u:User {
    name: user.name,
    email: user.email,
    created_at: datetime()
});
```

**Python client usage**:
```python
users = [
    {'name': 'Alice', 'email': 'alice@example.com'},
    {'name': 'Bob', 'email': 'bob@example.com'},
    {'name': 'Carol', 'email': 'carol@example.com'},
]

await conn.execute("""
    UNWIND $users AS user
    CREATE (u:User {name: user.name, email: user.email})
""", {'users': users})
```

## Processing Collection Properties

UNWIND works with properties that contain lists:

```gql
-- Expand tags from a node property
MATCH (article:Article {id: $article_id})
UNWIND article.tags AS tag
RETURN DISTINCT tag;

-- Create relationships from a list property
MATCH (user:User {id: $user_id})
UNWIND user.interests AS interest
MERGE (t:Topic {name: interest})
CREATE (user)-[:INTERESTED_IN]->(t);
```

## Combining UNWIND with Other Clauses

**UNWIND with MATCH**:
```gql
-- Find users by a list of IDs
UNWIND $user_ids AS id
MATCH (u:User {id: id})
RETURN u.name, u.email;
```

**UNWIND with aggregation**:
```gql
-- Count occurrences in a list
UNWIND ['a', 'b', 'a', 'c', 'a', 'b'] AS item
RETURN item, count(*) AS occurrences
ORDER BY occurrences DESC;
```

**Nested UNWIND**:
```gql
-- Process nested lists
UNWIND $orders AS order
UNWIND order.items AS item
CREATE (o:Order {id: order.id})-[:CONTAINS]->(i:Item {sku: item.sku});
```

## UNWIND with NULL and Empty Lists

**Empty list behavior**:
```gql
-- Empty list produces no rows
UNWIND [] AS x
RETURN x;
-- (no results)
```

**Preserving rows with empty lists**:
```gql
-- Use CASE to handle empty lists
MATCH (u:User)
WITH u, CASE WHEN size(u.tags) = 0 THEN [null] ELSE u.tags END AS tags
UNWIND tags AS tag
RETURN u.name, tag;
```

**NULL in lists**:
```gql
-- NULL elements are preserved
UNWIND [1, null, 3] AS x
RETURN x;
-- Returns: 1, null, 3
```

## Performance Considerations

**Batch size**: For large datasets, consider chunking:
```python
BATCH_SIZE = 1000

for i in range(0, len(items), BATCH_SIZE):
    batch = items[i:i + BATCH_SIZE]
    await conn.execute("""
        UNWIND $batch AS item
        CREATE (n:Node {data: item})
    """, {'batch': batch})
```

**Index usage**: UNWIND with MATCH benefits from indexes on matched properties.

## Common Patterns

**De-duplication**:
```gql
UNWIND [1, 2, 2, 3, 3, 3] AS num
RETURN DISTINCT num;
```

**List to relationships**:
```gql
MATCH (user:User {id: $user_id})
UNWIND $friend_ids AS friend_id
MATCH (friend:User {id: friend_id})
CREATE (user)-[:FRIENDS_WITH]->(friend);
```

**Generating sequences**:
```gql
UNWIND range(1, 100) AS i
CREATE (n:Node {index: i});
```

## Related Topics

- [Batch Operations](/tags/etl/)
- [Pattern Matching](/tags/pattern-matching/)
- [MERGE Clause](/tags/merge/)
- [Performance](/tags/performance/)
- [GQL Reference](/tags/gql-reference/)
