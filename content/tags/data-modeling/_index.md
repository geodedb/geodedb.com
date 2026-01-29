---
title: "Graph Data Modeling"
description: "Master graph data modeling patterns in Geode. Learn property graph design, node and relationship modeling, schema strategies, normalization techniques, and best practices for building scalable graph databases."
keywords:
  - data modeling
  - graph modeling
  - schema design
  - node labels
  - relationships
  - properties
  - property graph
  - graph schema
  - data architecture
  - Geode
  - GQL
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/data-modeling/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Graph Data Modeling in Geode

Graph data modeling is the process of designing how your data is represented as nodes, relationships, and properties in a graph database. Unlike relational modeling where you think in tables and joins, graph modeling focuses on entities and their connections, enabling more natural representation of real-world relationships.

Geode implements the ISO/IEC 39075:2024 property graph model, providing a robust foundation for modeling complex, interconnected data. Effective graph modeling directly impacts query performance, data integrity, and application maintainability.

## Understanding the Property Graph Model

The property graph model consists of three fundamental elements:

**Nodes**: Represent entities or objects in your domain. Nodes can have labels (categories) and properties (attributes).

**Relationships**: Connect nodes and represent how entities relate to each other. Relationships have types, direction, and can also have properties.

**Properties**: Key-value pairs attached to nodes or relationships storing data attributes.

### Basic Structure

```gql
-- Create a Person node with properties
CREATE (p:Person {
    id: 'person_001',
    name: 'Alice Chen',
    email: 'alice@example.com',
    created_at: datetime()
});

-- Create a Company node
CREATE (c:Company {
    id: 'company_001',
    name: 'TechCorp',
    founded: DATE '2015-06-15'
});

-- Create a relationship with properties
MATCH (p:Person {id: 'person_001'})
MATCH (c:Company {id: 'company_001'})
CREATE (p)-[:WORKS_AT {
    role: 'Senior Engineer',
    start_date: DATE '2020-03-01',
    department: 'Engineering'
}]->(c);
```

## Core Modeling Principles

### 1. Model for Your Queries

Design your graph schema based on how you will query it. Understand your access patterns before committing to a model.

```gql
-- Query: "Find products a user might like based on purchase history"
-- Model supports this pattern efficiently:
MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)
MATCH (p)-[:IN_CATEGORY]->(cat:Category)
MATCH (other:Product)-[:IN_CATEGORY]->(cat)
WHERE NOT (u)-[:PURCHASED]->(other)
RETURN DISTINCT other.name, COUNT(cat) AS relevance
ORDER BY relevance DESC
LIMIT 10;

-- The model enables:
-- 1. Direct traversal from user to purchased products
-- 2. Category-based product discovery
-- 3. Filtering out already purchased items
```

### 2. Choose Appropriate Node Granularity

Determine what should be a node versus a property based on:
- Is it referenced by multiple entities?
- Does it have its own relationships?
- Will it be queried independently?
- Does it have complex internal structure?

```gql
-- GOOD: Address as shared node (multiple people can live there)
CREATE (addr:Address {
    id: 'addr_001',
    street: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102'
});
CREATE (alice:Person {name: 'Alice'})-[:LIVES_AT]->(addr);
CREATE (bob:Person {name: 'Bob'})-[:LIVES_AT]->(addr);

-- GOOD: Email as property (unique to person, no relationships)
CREATE (charlie:Person {
    name: 'Charlie',
    email: 'charlie@example.com'
});

-- AVOID: Storing structured data as a string property
-- Bad: address_string: '123 Main St, SF, CA 94102'
```

### 3. Use Meaningful Relationship Types

Relationship types should be specific, descriptive, and action-oriented:

```gql
-- GOOD: Clear, specific relationship types
(employee:Person)-[:WORKS_AT]->(company:Company)
(customer:Customer)-[:PURCHASED]->(product:Product)
(user:User)-[:FOLLOWS]->(other:User)
(manager:Person)-[:MANAGES]->(team:Team)
(article:Article)-[:CITES]->(reference:Article)

-- AVOID: Generic, unclear relationships
-- (entity1)-[:RELATED_TO]->(entity2)
-- (node1)-[:HAS]->(node2)
-- (a)-[:CONNECTS]->(b)
```

### 4. Consider Relationship Direction

Choose direction that makes semantic sense and supports your queries:

```gql
-- Direction reflects real-world semantics
(person:Person)-[:KNOWS]->(other:Person)    -- Person knows another
(child:Person)-[:PARENT_OF]->(parent:Person) -- Wait, this is wrong!
(parent:Person)-[:PARENT_OF]->(child:Person) -- Correct direction

-- Queries can traverse either direction
MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend)
RETURN friend.name;

MATCH (bob:Person {name: 'Bob'})<-[:KNOWS]-(acquaintance)
RETURN acquaintance.name;
```

## Common Modeling Patterns

### Hierarchical Data

Model tree structures using self-referencing relationships:

```gql
-- Organizational hierarchy
CREATE (ceo:Employee {name: 'CEO', title: 'Chief Executive Officer'});
CREATE (vp_eng:Employee {name: 'VP Engineering', title: 'VP of Engineering'});
CREATE (vp_sales:Employee {name: 'VP Sales', title: 'VP of Sales'});
CREATE (lead:Employee {name: 'Tech Lead', title: 'Technical Lead'});
CREATE (dev1:Employee {name: 'Developer 1', title: 'Software Engineer'});
CREATE (dev2:Employee {name: 'Developer 2', title: 'Software Engineer'});

-- Reporting relationships
CREATE (vp_eng)-[:REPORTS_TO]->(ceo);
CREATE (vp_sales)-[:REPORTS_TO]->(ceo);
CREATE (lead)-[:REPORTS_TO]->(vp_eng);
CREATE (dev1)-[:REPORTS_TO]->(lead);
CREATE (dev2)-[:REPORTS_TO]->(lead);

-- Query: Find all reports (direct and indirect) for a manager
MATCH (manager:Employee {name: 'VP Engineering'})<-[:REPORTS_TO*1..5]-(report)
RETURN report.name, report.title;

-- Query: Find management chain for an employee
MATCH (emp:Employee {name: 'Developer 1'})-[:REPORTS_TO*1..10]->(manager)
RETURN manager.name, manager.title;
```

### Many-to-Many Relationships

Graphs naturally model many-to-many relationships without junction tables:

```gql
-- Students enrolled in courses
CREATE (s1:Student {name: 'Alice', student_id: 'S001'});
CREATE (s2:Student {name: 'Bob', student_id: 'S002'});
CREATE (c1:Course {code: 'CS101', name: 'Intro to Computer Science'});
CREATE (c2:Course {code: 'MATH201', name: 'Linear Algebra'});

-- Enrollments with properties
CREATE (s1)-[:ENROLLED_IN {semester: 'Fall 2025', grade: null}]->(c1);
CREATE (s1)-[:ENROLLED_IN {semester: 'Fall 2025', grade: null}]->(c2);
CREATE (s2)-[:ENROLLED_IN {semester: 'Fall 2025', grade: null}]->(c1);

-- Query: Students in a specific course
MATCH (s:Student)-[:ENROLLED_IN {semester: 'Fall 2025'}]->(c:Course {code: 'CS101'})
RETURN s.name, s.student_id;

-- Query: Courses for a student
MATCH (s:Student {name: 'Alice'})-[e:ENROLLED_IN]->(c:Course)
RETURN c.code, c.name, e.semester;
```

### Temporal Relationships

Model time-varying relationships by adding temporal properties:

```gql
-- Employment history with date ranges
CREATE (person:Person {name: 'Sarah'});
CREATE (company1:Company {name: 'StartupA'});
CREATE (company2:Company {name: 'BigCorp'});

CREATE (person)-[:WORKED_AT {
    role: 'Engineer',
    start_date: DATE '2018-01-15',
    end_date: DATE '2021-06-30'
}]->(company1);

CREATE (person)-[:WORKED_AT {
    role: 'Senior Engineer',
    start_date: DATE '2021-07-01',
    end_date: null  -- Current job
}]->(company2);

-- Query: Current employment
MATCH (p:Person {name: 'Sarah'})-[w:WORKED_AT]->(c:Company)
WHERE w.end_date IS NULL
RETURN c.name, w.role, w.start_date;

-- Query: Employment on a specific date
MATCH (p:Person {name: 'Sarah'})-[w:WORKED_AT]->(c:Company)
WHERE w.start_date <= DATE '2020-06-01'
  AND (w.end_date IS NULL OR w.end_date >= DATE '2020-06-01')
RETURN c.name, w.role;
```

### Versioned Data

Track changes over time with version nodes:

```gql
-- Product with version history
CREATE (p:Product {id: 'prod_001', name: 'Widget Pro'});

-- Current version
CREATE (v3:ProductVersion {
    version: 3,
    price: 29.99,
    description: 'Enhanced widget with new features',
    effective_date: DATE '2025-01-01'
});
CREATE (p)-[:CURRENT_VERSION]->(v3);
CREATE (p)-[:HAS_VERSION]->(v3);

-- Historical versions
CREATE (v2:ProductVersion {
    version: 2,
    price: 24.99,
    description: 'Improved widget',
    effective_date: DATE '2024-06-01'
});
CREATE (p)-[:HAS_VERSION]->(v2);
CREATE (v3)-[:PREVIOUS_VERSION]->(v2);

CREATE (v1:ProductVersion {
    version: 1,
    price: 19.99,
    description: 'Original widget',
    effective_date: DATE '2024-01-01'
});
CREATE (p)-[:HAS_VERSION]->(v1);
CREATE (v2)-[:PREVIOUS_VERSION]->(v1);

-- Query: Get current product info
MATCH (p:Product {id: 'prod_001'})-[:CURRENT_VERSION]->(v)
RETURN p.name, v.price, v.description;

-- Query: Get version history
MATCH (p:Product {id: 'prod_001'})-[:HAS_VERSION]->(v)
RETURN v.version, v.price, v.effective_date
ORDER BY v.version DESC;
```

### Event Sourcing Pattern

Store events as nodes for complete audit trail:

```gql
-- Order events
CREATE (order:Order {id: 'order_001', customer_id: 'cust_001'});

CREATE (e1:OrderEvent {
    event_type: 'CREATED',
    timestamp: datetime('2025-01-15T10:30:00Z'),
    data: '{"items": [{"sku": "PROD-1", "qty": 2}]}'
});
CREATE (order)-[:HAS_EVENT]->(e1);

CREATE (e2:OrderEvent {
    event_type: 'PAYMENT_RECEIVED',
    timestamp: datetime('2025-01-15T10:32:00Z'),
    data: '{"amount": 59.98, "method": "credit_card"}'
});
CREATE (order)-[:HAS_EVENT]->(e2);
CREATE (e2)-[:FOLLOWS]->(e1);

CREATE (e3:OrderEvent {
    event_type: 'SHIPPED',
    timestamp: datetime('2025-01-16T14:00:00Z'),
    data: '{"tracking": "1Z999AA10123456784"}'
});
CREATE (order)-[:HAS_EVENT]->(e3);
CREATE (e3)-[:FOLLOWS]->(e2);

-- Query: Order timeline
MATCH (o:Order {id: 'order_001'})-[:HAS_EVENT]->(e)
RETURN e.event_type, e.timestamp, e.data
ORDER BY e.timestamp;

-- Query: Current order state (latest event)
MATCH (o:Order {id: 'order_001'})-[:HAS_EVENT]->(e)
WHERE NOT EXISTS { (e)<-[:FOLLOWS]-() }
RETURN e.event_type AS current_status;
```

## Avoiding Common Antipatterns

### Antipattern 1: Super Nodes

Nodes with millions of relationships degrade performance significantly.

```gql
-- PROBLEM: Country node connected to millions of users
-- Every user query touching country is slow
CREATE (usa:Country {name: 'United States'});
-- ... millions of (user)-[:LIVES_IN]->(usa) relationships

-- SOLUTION 1: Use property + index instead
CREATE INDEX idx_user_country ON User(country);
CREATE (user:User {name: 'Alice', country: 'USA'});

-- SOLUTION 2: Add intermediate nodes
CREATE (user:User {name: 'Alice'});
CREATE (city:City {name: 'Austin'});
CREATE (state:State {name: 'Texas', country: 'USA'});
CREATE (user)-[:LIVES_IN]->(city);
CREATE (city)-[:IN_STATE]->(state);

-- Query efficiently via city (smaller fan-out)
MATCH (u:User)-[:LIVES_IN]->(c:City)-[:IN_STATE]->(s:State {country: 'USA'})
RETURN u.name, c.name;
```

### Antipattern 2: Lists as Properties Instead of Relationships

```gql
-- BAD: Storing related IDs as array property
CREATE (user:User {
    id: 'user_001',
    friend_ids: ['user_002', 'user_003', 'user_004']  -- Anti-pattern!
});

-- GOOD: Use actual relationships
CREATE (u1:User {id: 'user_001'});
CREATE (u2:User {id: 'user_002'});
CREATE (u3:User {id: 'user_003'});
CREATE (u1)-[:FRIENDS_WITH]->(u2);
CREATE (u1)-[:FRIENDS_WITH]->(u3);

-- Now you can traverse naturally
MATCH (u:User {id: 'user_001'})-[:FRIENDS_WITH*1..2]->(friend)
RETURN DISTINCT friend.id;
```

### Antipattern 3: Redundant Derived Relationships

```gql
-- BAD: Creating relationships that can be derived
CREATE (user)-[:LIVES_IN]->(city);
CREATE (city)-[:IN_STATE]->(state);
CREATE (user)-[:LIVES_IN_STATE]->(state);  -- Redundant! Can be derived

-- GOOD: Derive when needed
MATCH (user:User {id: 'user_001'})-[:LIVES_IN]->(city)-[:IN_STATE]->(state)
RETURN state.name;

-- Exception: Denormalize for critical performance paths
-- If this query runs millions of times per second,
-- the direct relationship may be justified
```

### Antipattern 4: Over-Generic Models

```gql
-- BAD: Too generic, loses semantic meaning
CREATE (n1:Node {type: 'person', name: 'Alice'});
CREATE (n2:Node {type: 'company', name: 'TechCorp'});
CREATE (n1)-[:RELATES_TO {relation_type: 'works_at'}]->(n2);

-- GOOD: Use specific labels and relationship types
CREATE (alice:Person {name: 'Alice'});
CREATE (corp:Company {name: 'TechCorp'});
CREATE (alice)-[:WORKS_AT]->(corp);

-- Specific labels enable:
-- 1. Type-specific indexes
-- 2. Clearer queries
-- 3. Schema validation
-- 4. Better query planning
```

## Multi-Label Modeling

Nodes can have multiple labels for different classifications:

```gql
-- Person with multiple roles
CREATE (alice:Person:Employee:Manager {
    name: 'Alice Chen',
    employee_id: 'E001',
    hire_date: DATE '2020-01-15'
});

-- Product with category labels
CREATE (widget:Product:Electronics:Gadget {
    sku: 'GADGET-001',
    name: 'Smart Widget',
    price: 49.99
});

-- Query by any label
MATCH (m:Manager)
RETURN m.name, m.employee_id;

MATCH (e:Electronics)
WHERE e.price < 100
RETURN e.name, e.price;
```

## Schema Design Strategies

### Strategy 1: Start Simple, Evolve

Begin with a minimal model and add complexity as needed:

```gql
-- Phase 1: Basic structure
CREATE (user:User {id: $id, name: $name, email: $email});
CREATE (product:Product {sku: $sku, name: $name, price: $price});
CREATE (user)-[:PURCHASED]->(product);

-- Phase 2: Add categories
CREATE (category:Category {name: $category_name});
CREATE (product)-[:IN_CATEGORY]->(category);

-- Phase 3: Add reviews
CREATE (review:Review {
    rating: $rating,
    comment: $comment,
    created_at: datetime()
});
CREATE (user)-[:WROTE]->(review);
CREATE (review)-[:REVIEWS]->(product);
```

### Strategy 2: Domain-Driven Design

Model bounded contexts as separate subgraphs:

```gql
-- Customer Context
CREATE (customer:Customer:OrderContext {id: $id, name: $name});

-- Inventory Context
CREATE (product:Product:InventoryContext {sku: $sku, stock: $qty});

-- Order Context
CREATE (order:Order:OrderContext {id: $order_id, total: $total});
CREATE (customer)-[:PLACED]->(order);
CREATE (order)-[:CONTAINS {quantity: $qty}]->(product);

-- Cross-context references via IDs
CREATE (customer:Customer {id: 'c001', inventory_customer_id: 'ic001'});
```

### Strategy 3: Hybrid Approach

Combine graph traversal with indexed lookups:

```gql
-- Index frequently filtered properties
CREATE INDEX idx_user_email ON User(email);
CREATE INDEX idx_product_sku ON Product(sku);
CREATE INDEX idx_order_date ON Order(order_date);

-- Combine indexed lookup with traversal
MATCH (u:User {email: $email})-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN p.name, p.price;
```

## Performance Considerations

### Index Strategy

```gql
-- Index properties used in WHERE clauses and lookups
CREATE INDEX idx_person_name ON Person(name);
CREATE INDEX idx_product_category_price ON Product(category, price);

-- Use composite indexes for multi-property queries
MATCH (p:Product)
WHERE p.category = 'Electronics' AND p.price < 500
RETURN p.name;  -- Uses composite index

-- Full-text index for search
CREATE FULLTEXT INDEX idx_product_search ON Product(name, description);
```

### Query Patterns to Optimize For

```gql
-- Pattern 1: Anchor on most selective criteria first
MATCH (u:User {email: $email})  -- Indexed, unique
MATCH (u)-[:PURCHASED]->(p:Product)
RETURN p.name;

-- Pattern 2: Limit variable-length paths
MATCH (u:User {id: $id})-[:FOLLOWS*1..3]->(friend)  -- Bounded depth
RETURN DISTINCT friend.name;

-- Pattern 3: Use OPTIONAL MATCH for sparse relationships
MATCH (p:Product {sku: $sku})
OPTIONAL MATCH (p)<-[r:REVIEWS]-()
RETURN p.name, COUNT(r) AS review_count;
```

## Client Library Examples

### Python Client

```python
from geode_client import Client

async def model_social_network():
    client = Client(host="localhost", port=3141)

    async with client.connection() as conn:
        # Create users with relationships
        await conn.execute("""
            CREATE (alice:User {
                id: $id,
                name: $name,
                email: $email,
                created_at: datetime()
            })
        """, {'id': 'user_001', 'name': 'Alice', 'email': 'alice@example.com'})

        await conn.execute("""
            CREATE (bob:User {
                id: $id,
                name: $name,
                email: $email,
                created_at: datetime()
            })
        """, {'id': 'user_002', 'name': 'Bob', 'email': 'bob@example.com'})

        # Create follow relationship
        await conn.execute("""
            MATCH (a:User {id: $follower_id})
            MATCH (b:User {id: $followed_id})
            CREATE (a)-[:FOLLOWS {since: datetime()}]->(b)
        """, {'follower_id': 'user_001', 'followed_id': 'user_002'})

        # Query followers
        result, _ = await conn.query("""
            MATCH (u:User {id: $id})<-[:FOLLOWS]-(follower)
            RETURN follower.name, follower.email
        """, {'id': 'user_002'})

        for row in result.rows:
            print(f"Follower: {row['follower.name']}")
```

### Go Client

```go
package main

import (
    "context"
    "database/sql"
    "log"

    _ "geodedb.com/geode"
)

func modelProductCatalog(ctx context.Context, db *sql.DB) error {
    // Create product with category
    _, err := db.ExecContext(ctx, `
        CREATE (p:Product {
            sku: $1,
            name: $2,
            price: $3,
            created_at: datetime()
        })
    `, "PROD-001", "Widget Pro", 29.99)
    if err != nil {
        return err
    }

    // Create category relationship
    _, err = db.ExecContext(ctx, `
        MATCH (p:Product {sku: $1})
        CREATE (c:Category {name: $2})
        CREATE (p)-[:IN_CATEGORY]->(c)
    `, "PROD-001", "Electronics")
    if err != nil {
        return err
    }

    // Query products by category
    rows, err := db.QueryContext(ctx, `
        MATCH (p:Product)-[:IN_CATEGORY]->(c:Category {name: $1})
        RETURN p.sku, p.name, p.price
        ORDER BY p.price
    `, "Electronics")
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var sku, name string
        var price float64
        rows.Scan(&sku, &name, &price)
        log.Printf("Product: %s - %s ($%.2f)", sku, name, price)
    }

    return nil
}
```

### Rust Client

```rust
use geode_client::{Client, Value};

async fn model_knowledge_graph(client: &Client) -> Result<(), Box<dyn std::error::Error>> {
    // Create entities
    client.execute(
        "CREATE (e:Entity {id: $id, name: $name, type: $type})",
        &[
            ("id", Value::String("entity_001".into())),
            ("name", Value::String("Artificial Intelligence".into())),
            ("type", Value::String("Concept".into())),
        ],
    ).await?;

    client.execute(
        "CREATE (e:Entity {id: $id, name: $name, type: $type})",
        &[
            ("id", Value::String("entity_002".into())),
            ("name", Value::String("Machine Learning".into())),
            ("type", Value::String("Concept".into())),
        ],
    ).await?;

    // Create relationship
    client.execute(
        r#"
        MATCH (parent:Entity {id: $parent_id})
        MATCH (child:Entity {id: $child_id})
        CREATE (child)-[:SUBSET_OF {confidence: $confidence}]->(parent)
        "#,
        &[
            ("parent_id", Value::String("entity_001".into())),
            ("child_id", Value::String("entity_002".into())),
            ("confidence", Value::Float(0.95)),
        ],
    ).await?;

    // Query related concepts
    let results = client.query(
        r#"
        MATCH (e:Entity {id: $id})<-[:SUBSET_OF*1..3]-(related)
        RETURN related.name, related.type
        "#,
        &[("id", Value::String("entity_001".into()))],
    ).await?;

    for row in results.rows() {
        println!("Related: {:?}", row.get::<String>("related.name")?);
    }

    Ok(())
}
```

## Best Practices Summary

### Do

- Model for your queries first
- Use specific, meaningful relationship types
- Keep nodes focused (single responsibility)
- Index properties used in lookups
- Use multi-labels for cross-cutting concerns
- Consider temporal aspects early
- Test with realistic data volumes

### Avoid

- Super nodes with millions of relationships
- Storing IDs in array properties
- Over-generic models (everything is "Node")
- Redundant derived relationships
- Deep nesting that could be flattened
- Ignoring cardinality patterns

## Related Topics

- [Schema Design](/tags/schema/) - Database schema management
- [Property Graph](/tags/property-graph/) - Property graph fundamentals
- [Graph Model](/tags/graph-model/) - Graph modeling concepts
- [Indexes](/tags/indexes/) - Index strategies and optimization
- [Query Optimization](/tags/query-optimization/) - Query performance tuning
- [Best Practices](/tags/best-practices/) - General best practices

## Further Reading

- ISO/IEC 39075:2024 - Graph Query Language Standard
- Property Graph Model Specification
- Geode Schema Management Guide
- Query Optimization and Performance Tuning
- Data Migration and Schema Evolution

Browse tagged content for complete data modeling documentation and examples.
