---
title: "SET Clause in GQL"
description: "Master the GQL SET clause for updating properties, adding labels, and modifying nodes and relationships in Geode graph database. Learn update patterns and best practices."
keywords:
  - SET
  - update properties
  - modify nodes
  - GQL
  - data modification
  - Geode
  - property update
  - label management
  - graph mutation
  - data transformation
  - upsert patterns
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/set/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# SET Clause in GQL

The SET clause modifies properties on nodes and relationships in your Geode graph database. It allows you to add new properties, update existing values, remove properties, and manage labels. SET is essential for maintaining and evolving your graph data over time. Geode implements the SET clause according to the ISO/IEC 39075:2024 GQL standard.

## Introduction to SET

Unlike CREATE which adds new elements or DELETE which removes them, SET modifies existing graph elements. It operates on elements that have been matched by a preceding MATCH clause or created in the same query.

**Key characteristics of SET**:

- **Property Assignment**: Add or update property values
- **Property Removal**: Remove properties by setting to NULL
- **Label Management**: Add labels to existing nodes
- **Bulk Updates**: Modify multiple elements in one operation
- **Expression Support**: Compute new values from existing data
- **Type Coercion**: Automatic type handling for property values

## Basic Property Updates

### Setting Single Properties

Update or add a single property value.

```gql
-- Update an existing property
MATCH (p:Person {name: 'Alice'})
SET p.age = 31;

-- Add a new property
MATCH (p:Person {name: 'Alice'})
SET p.phone = '+1-555-0123';

-- Set with expression
MATCH (p:Product {id: $product_id})
SET p.price = p.price * 1.1;  -- 10% price increase
```

### Setting Multiple Properties

Update several properties in one SET clause.

```gql
-- Multiple properties with separate SET
MATCH (p:Person {name: 'Alice'})
SET p.age = 31
SET p.city = 'New York';

-- Multiple properties in one SET
MATCH (p:Person {name: 'Alice'})
SET p.age = 31, p.city = 'New York', p.updated_at = datetime();

-- Comprehensive update
MATCH (u:User {id: $user_id})
SET
    u.name = $name,
    u.email = $email,
    u.bio = $bio,
    u.updated_at = datetime(),
    u.version = u.version + 1;
```

### Setting Properties from Other Properties

Compute new values based on existing data.

```gql
-- Copy property
MATCH (p:Person)
SET p.display_name = p.name;

-- Concatenate
MATCH (p:Person)
SET p.full_name = p.first_name + ' ' + p.last_name;

-- Calculate
MATCH (o:Order)-[:CONTAINS]->(i:OrderItem)
WITH o, sum(i.price * i.quantity) AS total
SET o.total = total;
```

## Property Operations

### Removing Properties

Set a property to NULL to remove it.

```gql
-- Remove single property
MATCH (p:Person {name: 'Alice'})
SET p.temporary_field = null;

-- Remove multiple properties
MATCH (p:Product)
WHERE p.discontinued = true
SET p.price = null, p.inventory = null;

-- Alternative: REMOVE keyword
MATCH (p:Person {name: 'Alice'})
REMOVE p.deprecated_field;
```

### Replacing All Properties

Replace all properties of a node (use with caution).

```gql
-- Replace all properties (destructive)
MATCH (p:Person {id: $id})
SET p = {
    id: $id,
    name: $new_name,
    email: $new_email,
    updated_at: datetime()
};
-- Warning: This removes all properties not in the new map

-- Safer: Merge properties (keeps existing)
MATCH (p:Person {id: $id})
SET p += {
    name: $new_name,
    email: $new_email,
    updated_at: datetime()
};
-- This preserves properties not mentioned in the map
```

### Property Map Operations

Use maps for flexible property updates.

```gql
-- Merge properties from parameter
MATCH (p:Product {id: $product_id})
SET p += $updates;

-- Conditional property merge
MATCH (u:User {id: $user_id})
SET u += CASE
    WHEN $include_profile THEN {bio: $bio, avatar: $avatar}
    ELSE {}
END;

-- Copy properties between nodes
MATCH (source:Template {id: $template_id})
MATCH (target:Document {id: $doc_id})
SET target += source {.format, .style, .settings};
```

## Conditional Updates

### SET with CASE

Apply conditional logic to updates.

```gql
-- Conditional value assignment
MATCH (p:Product)
SET p.status = CASE
    WHEN p.inventory = 0 THEN 'out_of_stock'
    WHEN p.inventory < 10 THEN 'low_stock'
    ELSE 'in_stock'
END;

-- Multiple conditions
MATCH (u:User)
SET u.tier = CASE
    WHEN u.total_purchases >= 10000 THEN 'platinum'
    WHEN u.total_purchases >= 5000 THEN 'gold'
    WHEN u.total_purchases >= 1000 THEN 'silver'
    ELSE 'bronze'
END;
```

### Conditional Updates with WHERE

Filter which elements to update.

```gql
-- Update only matching elements
MATCH (p:Product)
WHERE p.category = 'Electronics' AND p.price < 100
SET p.on_sale = true;

-- Complex conditions
MATCH (u:User)
WHERE u.created_at < datetime() - duration('P1Y')
AND u.verified = false
SET u.status = 'inactive', u.archived_at = datetime();
```

### COALESCE for Default Values

Set values only if not already present.

```gql
-- Set default if null
MATCH (p:Person)
SET p.country = COALESCE(p.country, 'Unknown');

-- Initialize missing fields
MATCH (u:User)
SET
    u.login_count = COALESCE(u.login_count, 0),
    u.settings = COALESCE(u.settings, {}),
    u.tags = COALESCE(u.tags, []);
```

## Updating Relationships

### Relationship Properties

Modify properties on relationships.

```gql
-- Update relationship property
MATCH (a:User)-[r:FOLLOWS]->(b:User)
WHERE a.name = 'Alice' AND b.name = 'Bob'
SET r.since = date('2025-01-01');

-- Add property to relationship
MATCH (a:Person)-[r:KNOWS]->(b:Person)
SET r.strength = 0.5;

-- Update based on calculation
MATCH (a:User)-[r:INTERACTED_WITH]->(b:User)
SET r.interaction_count = r.interaction_count + 1,
    r.last_interaction = datetime();
```

### Bulk Relationship Updates

Update multiple relationships at once.

```gql
-- Mark all relationships
MATCH ()-[r:TEMPORARY]-()
SET r.expires_at = datetime() + duration('P7D');

-- Update based on connected nodes
MATCH (c:Customer)-[r:PURCHASED]->(p:Product)
WHERE p.category = 'Premium'
SET r.is_premium_purchase = true;
```

## Label Management

### Adding Labels

Add new labels to existing nodes.

```gql
-- Add single label
MATCH (p:Person {is_verified: true})
SET p:Verified;

-- Add multiple labels
MATCH (e:Employee {is_manager: true})
SET e:Manager:Leadership;

-- Conditional label addition
MATCH (u:User)
WHERE u.purchases > 100
SET u:PowerUser;
```

### Removing Labels

Use REMOVE to delete labels from nodes.

```gql
-- Remove single label
MATCH (p:Person:Temporary)
REMOVE p:Temporary;

-- Remove after condition changes
MATCH (u:User:Premium)
WHERE u.subscription_end < date()
REMOVE u:Premium;
```

### Label-Based Transformations

Change node categorization.

```gql
-- Promote user status
MATCH (u:User:Standard)
WHERE u.spending > 1000
SET u:Premium
REMOVE u:Standard;

-- Archive nodes
MATCH (p:Post)
WHERE p.created_at < datetime() - duration('P1Y')
SET p:Archived
REMOVE p:Active;
```

## SET with Other Clauses

### SET with CREATE

Set properties on newly created elements.

```gql
-- Create and set
CREATE (p:Product)
SET p.name = $name, p.price = $price, p.created_at = datetime()
RETURN p;

-- Or inline during CREATE
CREATE (p:Product {
    name: $name,
    price: $price,
    created_at: datetime()
})
RETURN p;
```

### SET with MERGE

Update on match or create.

```gql
-- MERGE with ON MATCH SET
MERGE (u:User {email: $email})
ON CREATE SET
    u.name = $name,
    u.created_at = datetime()
ON MATCH SET
    u.last_login = datetime(),
    u.login_count = u.login_count + 1;

-- Upsert pattern
MERGE (p:Product {sku: $sku})
ON CREATE SET p = $product_data, p.created_at = datetime()
ON MATCH SET p += $product_data, p.updated_at = datetime();
```

### SET with WITH

Chain updates through query pipeline.

```gql
-- Update then continue
MATCH (o:Order {id: $order_id})
SET o.status = 'processing', o.processed_at = datetime()
WITH o
MATCH (o)-[:ORDERED_BY]->(c:Customer)
SET c.last_order_at = datetime()
RETURN o, c;

-- Aggregate then update
MATCH (c:Category)-[:CONTAINS]->(p:Product)
WITH c, count(p) AS product_count, avg(p.price) AS avg_price
SET c.product_count = product_count, c.average_price = avg_price;
```

### SET with FOREACH

Update elements in a collection.

```gql
-- Update all nodes in a path
MATCH path = (a:City)-[:ROAD*]->(b:City)
WHERE a.name = 'Start' AND b.name = 'End'
FOREACH (n IN nodes(path) | SET n.visited = true);

-- Update from list
MATCH (u:User {id: $user_id})
FOREACH (tag IN $new_tags |
    MERGE (t:Tag {name: tag})
    MERGE (u)-[:TAGGED]->(t)
);
```

## Bulk Update Patterns

### Updating All Nodes of a Type

Mass updates across the graph.

```gql
-- Add timestamp to all nodes
MATCH (n:Document)
SET n.migrated_at = datetime();

-- Initialize field
MATCH (u:User)
WHERE u.verified IS NULL
SET u.verified = false;

-- Schema migration
MATCH (p:Product)
SET p.price_currency = 'USD'
WHERE p.price IS NOT NULL;
```

### Batched Updates

Process large updates in batches.

```gql
-- Update in batches (application pattern)
MATCH (n:Node)
WHERE n.needs_update = true
WITH n LIMIT 1000
SET n.updated = true, n.needs_update = false
RETURN count(n) AS updated;
-- Repeat until updated = 0
```

### Update from External Data

Apply updates from external sources.

```gql
-- Update from parameter list
UNWIND $updates AS update
MATCH (p:Product {id: update.id})
SET p.price = update.new_price, p.updated_at = datetime();

-- Batch property updates
UNWIND $users AS user_data
MATCH (u:User {id: user_data.id})
SET u += user_data.properties;
```

## Computed Updates

### Mathematical Operations

Perform calculations during updates.

```gql
-- Increment
MATCH (p:Post {id: $post_id})
SET p.view_count = p.view_count + 1;

-- Decrement with bounds
MATCH (p:Product {id: $product_id})
SET p.inventory = CASE
    WHEN p.inventory > 0 THEN p.inventory - 1
    ELSE 0
END;

-- Percentage calculation
MATCH (p:Product)
WHERE p.original_price IS NOT NULL
SET p.discount_percent = round((1 - p.price / p.original_price) * 100, 1);
```

### Aggregation-Based Updates

Update using aggregated values.

```gql
-- Update with count
MATCH (u:User)-[:POSTED]->(p:Post)
WITH u, count(p) AS post_count
SET u.post_count = post_count;

-- Update with average
MATCH (p:Product)<-[r:RATED]-(u:User)
WITH p, avg(r.score) AS avg_rating, count(r) AS rating_count
SET p.average_rating = avg_rating, p.rating_count = rating_count;

-- Update from related nodes
MATCH (d:Department)<-[:WORKS_IN]-(e:Employee)
WITH d, sum(e.salary) AS total_salary, count(e) AS headcount
SET d.total_salary_cost = total_salary, d.employee_count = headcount;
```

### String Transformations

Transform string properties.

```gql
-- Normalize
MATCH (u:User)
SET u.email = toLower(trim(u.email));

-- Generate slug
MATCH (p:Post)
SET p.slug = toLower(replace(p.title, ' ', '-'));

-- Sanitize
MATCH (c:Comment)
SET c.text = trim(c.text);
```

## Best Practices

### Update Safety

1. **Preview Before Updating**: Check what will be affected
```gql
-- First: Check what will be updated
MATCH (p:Product)
WHERE p.category = 'Electronics'
RETURN p.name, p.price, p.price * 0.9 AS new_price
LIMIT 10;

-- Then: Apply the update
MATCH (p:Product)
WHERE p.category = 'Electronics'
SET p.price = p.price * 0.9;
```

2. **Use Transactions**: Wrap related updates together
```gql
BEGIN;
MATCH (o:Order {id: $order_id})
SET o.status = 'shipped', o.shipped_at = datetime();
MATCH (o:Order {id: $order_id})-[:CONTAINS]->(i:OrderItem)
SET i.status = 'shipped';
COMMIT;
```

3. **Track Changes**: Maintain audit trail
```gql
MATCH (p:Product {id: $product_id})
SET
    p.previous_price = p.price,
    p.price = $new_price,
    p.price_updated_at = datetime(),
    p.price_updated_by = $user_id;
```

### Performance Optimization

1. **Index Filter Properties**: Ensure properties used in WHERE are indexed
```gql
CREATE INDEX product_category ON Product(category);

MATCH (p:Product)
WHERE p.category = 'Electronics'  -- Uses index
SET p.discount = 0.1;
```

2. **Batch Large Updates**: Process in manageable chunks
```gql
-- Batch processing pattern
CALL {
    MATCH (n:Node)
    WHERE n.needs_migration = true
    WITH n LIMIT 10000
    SET n.migrated = true, n.needs_migration = false
    RETURN count(n) AS processed
}
RETURN processed;
```

3. **Minimize Property Access**: Compute once, use multiple times
```gql
-- Good: Calculate once
MATCH (p:Product)
WITH p, p.price * 0.8 AS sale_price
SET p.sale_price = sale_price, p.savings = p.price - sale_price;
```

### Data Integrity

1. **Validate Before Setting**: Check data validity
```gql
MATCH (u:User {id: $user_id})
WHERE $new_email =~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
SET u.email = $new_email;
```

2. **Use Constraints**: Let the database enforce rules
```gql
CREATE CONSTRAINT email_format ON (u:User)
ASSERT u.email =~ '^[^@]+@[^@]+$';
```

3. **Handle NULL Gracefully**: Prevent accidental data loss
```gql
MATCH (p:Product {id: $id})
SET p.description = COALESCE($description, p.description);
```

## Common Patterns

### Last Modified Tracking

```gql
MATCH (n:Document {id: $id})
SET n.updated_at = datetime(), n.updated_by = $user_id;
```

### Version Incrementing

```gql
MATCH (n:Config {id: $id})
SET n.version = COALESCE(n.version, 0) + 1, n.data = $new_data;
```

### Soft Delete

```gql
MATCH (n:Record {id: $id})
SET n.deleted = true, n.deleted_at = datetime();
```

### Status Transitions

```gql
MATCH (o:Order {id: $id})
WHERE o.status = 'pending'
SET o.status = 'confirmed', o.confirmed_at = datetime();
```

## Related Topics

- **[CREATE Clause](/tags/create/)**: Creating new elements
- **[DELETE Clause](/tags/delete/)**: Removing elements
- **[MERGE Clause](/tags/merge/)**: Upsert operations
- **[WHERE Clause](/tags/where/)**: Filtering updates
- **[WITH Clause](/tags/with/)**: Chaining operations
- **[GQL Reference](/tags/gql-reference/)**: Complete GQL language reference
- **[Constraints](/tags/constraints/)**: Data validation

## Further Reading

- **GQL Tutorial - Updating Data**: `/docs/gql-tutorial/updating-data/`
- **Schema Evolution Guide**: `/docs/guides/schema-migration/`
- **Transaction Management**: `/docs/transactions/overview/`
- **Data Integrity**: `/docs/reference/constraints/`
- **Best Practices**: `/docs/guides/best-practices/`
