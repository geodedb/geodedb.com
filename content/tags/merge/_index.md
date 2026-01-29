---
title: "MERGE Clause - Upsert Operations in GQL"
description: "Use the MERGE clause in Geode for upsert operations that create nodes or relationships if they don't exist, or match existing ones."
keywords:
  - MERGE clause
  - upsert
  - GQL
  - create or match
  - idempotent operations
  - graph mutations
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/merge/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# MERGE Clause in Geode

The MERGE clause provides upsert functionality in GQL, enabling idempotent operations that either match existing graph elements or create them if they don't exist. This is essential for data synchronization, ETL pipelines, and scenarios where duplicate prevention is critical.

## MERGE Syntax

The MERGE clause attempts to match a pattern in the graph. If the pattern exists, it binds to the existing elements. If not, it creates the entire pattern.

**Basic MERGE**:
```gql
-- Create user if not exists, or match existing
MERGE (user:User {email: 'alice@example.com'})
ON CREATE SET user.created_at = datetime()
ON MATCH SET user.last_seen = datetime()
RETURN user;
```

**MERGE with relationships**:
```gql
-- Ensure relationship exists between nodes
MATCH (user:User {id: $user_id}), (product:Product {id: $product_id})
MERGE (user)-[r:VIEWED]->(product)
ON CREATE SET r.first_viewed = datetime(), r.view_count = 1
ON MATCH SET r.last_viewed = datetime(), r.view_count = r.view_count + 1
RETURN r.view_count;
```

## ON CREATE and ON MATCH

The ON CREATE and ON MATCH clauses allow different actions based on whether MERGE created new elements or matched existing ones:

```gql
MERGE (company:Company {name: $name})
ON CREATE SET
    company.created_at = datetime(),
    company.source = 'import',
    company.status = 'new'
ON MATCH SET
    company.updated_at = datetime(),
    company.import_count = company.import_count + 1
RETURN company;
```

## MERGE Patterns

**Node-only MERGE**:
```gql
-- Idempotent node creation
MERGE (tag:Tag {name: 'graph-database'})
RETURN tag;
```

**Relationship MERGE with existing nodes**:
```gql
-- Create relationship only if nodes already exist
MATCH (author:Author {id: $author_id})
MATCH (book:Book {id: $book_id})
MERGE (author)-[:WROTE {year: $year}]->(book);
```

**Full pattern MERGE**:
```gql
-- MERGE entire pattern (use carefully)
MERGE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})
RETURN a, b;
```

## Best Practices

**Use unique constraints**: MERGE relies on matching properties. Create unique constraints to ensure correctness:
```gql
CREATE CONSTRAINT user_email_unique ON (u:User) ASSERT u.email IS UNIQUE;
```

**Be specific with MERGE patterns**: Include only the properties necessary to identify uniqueness. Additional properties should be set via ON CREATE/ON MATCH.

**Prefer MATCH + MERGE for relationships**: When creating relationships, first MATCH the nodes explicitly, then MERGE the relationship:
```gql
-- Recommended pattern
MATCH (from:Node {id: $from_id})
MATCH (to:Node {id: $to_id})
MERGE (from)-[:RELATES_TO]->(to);
```

## Use Cases

**Data synchronization**: Sync data from external systems without creating duplicates.

**Event tracking**: Increment counters or update timestamps on repeated events.

**Graph enrichment**: Add new relationships to existing nodes discovered through analysis.

**ETL pipelines**: Load data idempotently, handling both new and existing records.

## Related Topics

- [CREATE Clause](/tags/create/)
- [MATCH Clause](/tags/match/)
- [SET Clause](/tags/set/)
- [Constraints](/tags/constraints/)
- [Transactions](/tags/transactions/)
