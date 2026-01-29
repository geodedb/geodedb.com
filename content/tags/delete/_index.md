---
title: "DELETE Clause in GQL"
description: "Master the GQL DELETE clause for safely removing nodes, relationships, and properties from Geode graph database. Learn deletion patterns, cascading behavior, and best practices."
keywords:
  - DELETE
  - remove nodes
  - remove relationships
  - GQL
  - data deletion
  - Geode
  - graph modification
  - DETACH DELETE
  - cascading delete
  - property removal
  - data cleanup
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/delete/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# DELETE Clause in GQL

The DELETE clause removes nodes and relationships from your Geode graph database. Understanding deletion semantics is crucial for maintaining data integrity, as improper deletion can orphan data or violate referential constraints. Geode implements the DELETE clause according to the ISO/IEC 39075:2024 GQL standard with additional safety features.

## Introduction to DELETE

Deletion in graph databases differs from relational databases because of the interconnected nature of graph data. When you delete a node, you must consider what happens to its relationships. Geode provides multiple deletion modes to handle these scenarios safely.

**Key characteristics of DELETE**:

- **Referential Integrity**: Nodes with relationships cannot be deleted without explicitly handling those relationships
- **DETACH DELETE**: Automatically removes relationships when deleting nodes
- **Selective Deletion**: Delete specific elements matched by patterns
- **Transaction Safety**: Deletions are atomic and can be rolled back
- **Cascading Behavior**: Control over how deletion propagates through the graph

## Deleting Relationships

### Basic Relationship Deletion

Delete relationships while keeping the connected nodes intact.

```gql
-- Delete a specific relationship
MATCH (a:Person {name: 'Alice'})-[r:FRIENDS_WITH]->(b:Person {name: 'Bob'})
DELETE r;

-- Delete all relationships of a type
MATCH ()-[r:TEMPORARY]-()
DELETE r;

-- Delete relationships with specific properties
MATCH (a:User)-[r:FOLLOWS]->(b:User)
WHERE r.since < date('2020-01-01')
DELETE r;
```

### Deleting Multiple Relationships

Remove multiple relationships in a single operation.

```gql
-- Delete all relationships between two nodes
MATCH (a:Person {name: 'Alice'})-[r]-(b:Person {name: 'Bob'})
DELETE r;

-- Delete relationships matching a pattern
MATCH (u:User)-[r:LIKED|VIEWED]->(p:Post)
WHERE p.archived = true
DELETE r;

-- Delete all outgoing relationships from a node
MATCH (u:User {id: $user_id})-[r]->()
DELETE r;
```

### Conditional Relationship Deletion

Delete relationships based on complex conditions.

```gql
-- Delete inactive connections
MATCH (a:User)-[r:CONNECTED_TO]->(b:User)
WHERE r.last_interaction < datetime() - duration('P90D')
DELETE r;

-- Delete weak relationships
MATCH (a:Person)-[r:KNOWS]->(b:Person)
WHERE r.strength < 0.3
DELETE r
RETURN count(r) AS deleted_count;
```

## Deleting Nodes

### Basic Node Deletion

Delete nodes that have no relationships.

```gql
-- Delete a node without relationships
MATCH (n:TempNode {id: $id})
DELETE n;

-- Delete orphaned nodes
MATCH (n:DataPoint)
WHERE NOT (n)--()
DELETE n;
```

### Node Deletion Constraint

Attempting to delete a node with relationships raises an error.

```gql
-- This will fail if Alice has any relationships
MATCH (p:Person {name: 'Alice'})
DELETE p;
-- Error: Cannot delete node with relationships

-- First remove relationships, then delete
MATCH (p:Person {name: 'Alice'})-[r]-()
DELETE r;
MATCH (p:Person {name: 'Alice'})
DELETE p;
```

### DETACH DELETE

DETACH DELETE removes a node and all its relationships in one operation.

```gql
-- Delete node and all its relationships
MATCH (p:Person {name: 'Alice'})
DETACH DELETE p;

-- Delete multiple nodes with their relationships
MATCH (p:Product)
WHERE p.discontinued = true
DETACH DELETE p;

-- Delete user and all their activity
MATCH (u:User {id: $user_id})
DETACH DELETE u;
```

## Deleting by Pattern

### Pattern-Based Deletion

Delete elements that match specific graph patterns.

```gql
-- Delete posts and their comments
MATCH (p:Post {id: $post_id})-[:HAS_COMMENT]->(c:Comment)
DETACH DELETE p, c;

-- Delete a chain of nodes
MATCH (start:Node {id: $id})-[:NEXT*]->(following:Node)
DETACH DELETE start, following;

-- Delete nodes in a specific subgraph
MATCH (project:Project {id: $project_id})
MATCH (project)-[:CONTAINS]->(task:Task)
MATCH (task)-[:HAS_SUBTASK]->(subtask:Subtask)
DETACH DELETE project, task, subtask;
```

### Selective Pattern Deletion

Delete only specific elements from matched patterns.

```gql
-- Delete only intermediate nodes
MATCH (a:User)-[:AUTHORED]->(draft:Draft)-[:REVISION_OF]->(published:Post)
DETACH DELETE draft;

-- Delete relationship but keep nodes
MATCH (a:Person)-[r:BLOCKED]->(b:Person)
DELETE r;
```

## Bulk Deletion

### Deleting Many Nodes

Efficiently delete large numbers of nodes.

```gql
-- Delete all nodes of a label
MATCH (n:TempData)
DETACH DELETE n;

-- Delete in batches (application pattern)
MATCH (n:LogEntry)
WHERE n.timestamp < datetime() - duration('P30D')
WITH n LIMIT 10000
DETACH DELETE n
RETURN count(n) AS deleted;
-- Repeat until deleted = 0
```

### Time-Based Cleanup

Delete data based on age or timestamps.

```gql
-- Delete old sessions
MATCH (s:Session)
WHERE s.expires_at < datetime()
DETACH DELETE s;

-- Delete old events
MATCH (e:Event)
WHERE e.created_at < datetime() - duration('P1Y')
DETACH DELETE e
RETURN count(e) AS deleted_events;
```

### Conditional Bulk Deletion

Delete based on complex business rules.

```gql
-- Delete inactive users with no content
MATCH (u:User)
WHERE u.last_login < datetime() - duration('P2Y')
AND NOT (u)-[:AUTHORED]->(:Post)
AND NOT (u)-[:COMMENTED]->(:Comment)
DETACH DELETE u;

-- Delete products with no orders
MATCH (p:Product)
WHERE NOT (p)<-[:CONTAINS]-(:Order)
AND p.created_at < datetime() - duration('P1Y')
DETACH DELETE p;
```

## Removing Properties

### REMOVE for Properties

Use REMOVE to delete properties from nodes or relationships (alternative to SET ... = null).

```gql
-- Remove a property
MATCH (p:Person {name: 'Alice'})
REMOVE p.temporary_field;

-- Remove multiple properties
MATCH (p:Product)
WHERE p.discontinued = true
REMOVE p.price, p.inventory_count;

-- Remove property from relationship
MATCH (a:User)-[r:FOLLOWS]->(b:User)
WHERE r.muted = true
REMOVE r.muted;
```

### Using SET with NULL

An alternative way to remove properties.

```gql
-- Set property to null (removes it)
MATCH (p:Person {name: 'Alice'})
SET p.deprecated_field = null;

-- Clear optional properties
MATCH (u:User {id: $user_id})
SET u.phone = null, u.secondary_email = null;
```

### Removing Labels

Remove labels from nodes.

```gql
-- Remove a label
MATCH (e:Employee:Contractor {id: $id})
REMOVE e:Contractor;

-- Remove temporary labels
MATCH (n:Flagged)
WHERE n.reviewed = true
REMOVE n:Flagged;
```

## Safe Deletion Patterns

### Check Before Delete

Verify conditions before deleting.

```gql
-- Check for dependencies before delete
MATCH (p:Project {id: $project_id})
OPTIONAL MATCH (p)-[:HAS_TASK]->(t:Task)
WITH p, count(t) AS task_count
WHERE task_count = 0
DETACH DELETE p
RETURN CASE WHEN p IS NULL THEN 'Nothing deleted' ELSE 'Project deleted' END;
```

### Soft Delete Pattern

Mark as deleted instead of removing.

```gql
-- Soft delete: mark as deleted
MATCH (u:User {id: $user_id})
SET u.deleted = true, u.deleted_at = datetime();

-- Query excludes soft-deleted
MATCH (u:User)
WHERE u.deleted IS NULL OR u.deleted = false
RETURN u;

-- Hard delete after retention period
MATCH (u:User)
WHERE u.deleted = true AND u.deleted_at < datetime() - duration('P90D')
DETACH DELETE u;
```

### Archive Before Delete

Create an archive before deletion.

```gql
-- Archive user data before deletion
MATCH (u:User {id: $user_id})
CREATE (a:ArchivedUser {
    original_id: u.id,
    name: u.name,
    email: u.email,
    archived_at: datetime()
})
WITH u, a
MATCH (u)-[r:AUTHORED]->(p:Post)
CREATE (a)-[:ARCHIVED_POST]->(:ArchivedPost {
    title: p.title,
    created_at: p.created_at
})
WITH u
DETACH DELETE u;
```

### Transaction-Safe Deletion

Use transactions for complex deletions.

```gql
-- Within a transaction (pseudo-code showing concept)
BEGIN TRANSACTION;

-- Step 1: Verify no active orders
MATCH (c:Customer {id: $customer_id})-[:PLACED]->(o:Order)
WHERE o.status IN ['pending', 'processing']
WITH count(o) AS active_orders
WHERE active_orders > 0
THROW 'Cannot delete customer with active orders';

-- Step 2: Archive orders
MATCH (c:Customer {id: $customer_id})-[:PLACED]->(o:Order)
SET o.customer_archived = true;

-- Step 3: Delete customer
MATCH (c:Customer {id: $customer_id})
DETACH DELETE c;

COMMIT;
```

## Cascading Deletion

### Manual Cascade

Explicitly delete related elements in order.

```gql
-- Delete project with all nested content
MATCH (project:Project {id: $project_id})

-- First delete deepest level
OPTIONAL MATCH (project)-[:CONTAINS]->(task:Task)-[:HAS_COMMENT]->(comment:Comment)
DETACH DELETE comment

-- Then delete tasks
WITH project
OPTIONAL MATCH (project)-[:CONTAINS]->(task:Task)
DETACH DELETE task

-- Finally delete project
WITH project
DETACH DELETE project;
```

### Recursive Deletion

Delete hierarchical structures.

```gql
-- Delete category and subcategories
MATCH (c:Category {id: $category_id})
CALL {
    WITH c
    MATCH (c)-[:PARENT_OF*0..]->(sub:Category)
    RETURN sub
}
DETACH DELETE sub;
```

### Handling Shared Relationships

Be careful with nodes that have multiple parents.

```gql
-- Delete tag only if no other posts reference it
MATCH (p:Post {id: $post_id})-[r:TAGGED]->(t:Tag)
DELETE r
WITH t
WHERE NOT (t)<-[:TAGGED]-()
DELETE t;
```

## Best Practices

### Safety Guidelines

1. **Test in Development First**: Always test deletion queries on non-production data
```gql
-- Use RETURN first to verify what will be deleted
MATCH (n:OldData)
WHERE n.created < date('2020-01-01')
RETURN n.id, n.name, n.created
LIMIT 100;
-- Then change RETURN to DETACH DELETE
```

2. **Use Transactions**: Wrap complex deletions in transactions
```gql
BEGIN;
-- Multiple delete operations
MATCH (a:TypeA) DETACH DELETE a;
MATCH (b:TypeB) DETACH DELETE b;
-- If anything fails, rollback
COMMIT;
```

3. **Limit Batch Sizes**: For large deletions, process in batches
```gql
-- Application loop pattern
CALL {
    MATCH (n:ExpiredData)
    WHERE n.expires < datetime()
    WITH n LIMIT 1000
    DETACH DELETE n
    RETURN count(n) AS deleted
};
```

### Performance Considerations

1. **Index Before Delete**: Ensure filter properties are indexed
```gql
CREATE INDEX data_timestamp ON Data(timestamp);

-- Faster deletion
MATCH (d:Data)
WHERE d.timestamp < $cutoff
DETACH DELETE d;
```

2. **Avoid Full Scans**: Use specific patterns
```gql
-- Good: Uses index
MATCH (u:User {email: $email})
DETACH DELETE u;

-- Avoid: Full scan
MATCH (u:User)
WHERE u.email = $email
DETACH DELETE u;  -- Only if email is not indexed
```

3. **Monitor Deletion Progress**: Return counts for visibility
```gql
MATCH (n:TempData)
WITH n LIMIT 10000
DETACH DELETE n
RETURN count(n) AS deleted_count;
```

### Data Protection

1. **Backup Before Mass Deletion**: Export data before large deletions
2. **Use Soft Deletes for Important Data**: Enable recovery
3. **Audit Deletions**: Log what was deleted and by whom
```gql
-- Create audit log entry
MATCH (u:User {id: $user_id})
CREATE (audit:AuditLog {
    action: 'DELETE_USER',
    target_id: u.id,
    target_name: u.name,
    deleted_by: $admin_id,
    deleted_at: datetime()
})
WITH u
DETACH DELETE u;
```

## Common Errors

### Cannot Delete Node with Relationships

```gql
-- Error: Cannot delete node<123>, because it still has relationships
MATCH (n:Node {id: 123})
DELETE n;

-- Solution: Use DETACH DELETE
MATCH (n:Node {id: 123})
DETACH DELETE n;
```

### Nothing Deleted

```gql
-- Returns 0 if node not found
MATCH (n:Node {id: 'nonexistent'})
DELETE n
RETURN count(n) AS deleted;
-- Result: deleted = 0
```

### Accidental Mass Deletion

```gql
-- DANGER: Deletes ALL nodes of label
MATCH (n:User)
DETACH DELETE n;  -- Probably not what you wanted!

-- Safe: Always use specific conditions
MATCH (n:User {status: 'deleted'})
DETACH DELETE n;
```

## Related Topics

- **[CREATE Clause](/tags/create/)**: Creating nodes and relationships
- **[SET Clause](/tags/set/)**: Updating properties instead of deleting
- **[MATCH Clause](/tags/match/)**: Finding elements to delete
- **[WHERE Clause](/tags/where/)**: Filtering deletion targets
- **[Transactions](/tags/transactions/)**: Atomic deletion operations
- **[GQL Reference](/tags/gql-reference/)**: Complete GQL language reference
- **[Data Modeling](/tags/data-modeling/)**: Designing for deletion

## Further Reading

- **GQL Tutorial - Deleting Data**: `/docs/gql-tutorial/deleting-data/`
- **Data Lifecycle Management**: `/docs/operations/data-lifecycle/`
- **Backup and Recovery**: `/docs/recovery/backup-restore/`
- **Transaction Guide**: `/docs/transactions/overview/`
- **Best Practices**: `/docs/guides/best-practices/`
