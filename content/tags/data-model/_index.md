---
title: "Data Modeling"
description: "Design effective graph data models for Geode using property graph patterns, label hierarchies, and relationship types. Learn best practices for schema design, normalization, and domain modeling."
keywords:
  - data modeling
  - graph modeling
  - property graph
  - schema design
  - domain modeling
  - entity relationships
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/data-model/"
    noindex: false
---

Data modeling in Geode translates your domain into an effective property graph structure. Learn to design nodes, relationships, properties, and labels that optimize both query performance and semantic clarity.

## Graph Data Modeling Fundamentals

### Property Graph Model

Geode implements the ISO GQL property graph model with four core elements:

**Nodes**: Entities in your domain (users, products, locations, events).

**Relationships**: Connections between entities with direction and type (PURCHASED, FOLLOWS, LOCATED_IN).

**Properties**: Key-value attributes on nodes and relationships (name, price, timestamp).

**Labels**: Tags that classify nodes into types (User, Product, Organization).

### Modeling Principles

1. **Nodes are nouns**: Represent entities, concepts, or things
2. **Relationships are verbs**: Represent actions, associations, or connections
3. **Properties are adjectives**: Describe attributes of nodes and relationships
4. **Labels are categories**: Group nodes by type or role

## Designing Nodes

### Entity Nodes

Model domain entities as nodes:

```gql
// User entity
INSERT (u:User {
  user_id: 'user_123',
  email: 'alice@example.com',
  name: 'Alice Johnson',
  created_at: datetime('2024-01-15T10:00:00'),
  verified: true
});

// Product entity
INSERT (p:Product {
  product_id: 'prod_456',
  name: 'Wireless Headphones',
  category: 'Electronics',
  price: 199.99,
  in_stock: true,
  stock_quantity: 45
});

// Organization entity
INSERT (org:Organization {
  org_id: 'org_789',
  name: 'Acme Corp',
  industry: 'Technology',
  founded_year: 2015,
  employee_count: 250
});
```

### Multiple Labels

Nodes can have multiple labels for richer semantics:

```gql
// Premium user with multiple roles
INSERT (u:User:Premium:Admin {
  user_id: 'user_admin_1',
  name: 'Bob Smith',
  tier: 'premium',
  admin_level: 'super'
});

// Query by specific combination
MATCH (u:User:Premium)
WHERE u.tier = 'premium'
RETURN u.name, u.user_id;

// Query by any label
MATCH (admin:Admin)
RETURN admin.name, admin.admin_level;
```

### Value Nodes vs. Properties

Decide when to use nodes vs. properties:

```gql
// ANTI-PATTERN: Category as property (limits queries)
INSERT (p:Product {
  product_id: 'prod_123',
  category_name: 'Electronics',
  category_id: 'cat_456'  // Duplicated across products
});

// BETTER: Category as node (enables graph queries)
INSERT (c:Category {
  category_id: 'cat_456',
  name: 'Electronics',
  description: 'Electronic devices and accessories'
});

INSERT (p:Product {
  product_id: 'prod_123',
  name: 'Wireless Headphones'
});

INSERT (p)-[:IN_CATEGORY]->(c);

// Now can query category relationships
MATCH (c:Category {name: 'Electronics'})<-[:IN_CATEGORY]-(p:Product)
RETURN p.name, p.price;
```

**Use nodes when**:
- The value participates in relationships
- Multiple entities share the same value
- The value has its own attributes
- You need to query or traverse through the value

**Use properties when**:
- The value is simple and specific to one entity
- The value doesn't participate in relationships
- The value is frequently accessed with the entity

## Designing Relationships

### Relationship Types

Choose descriptive, action-oriented relationship types:

```gql
// E-commerce relationships
INSERT (user:User {user_id: 'user_123', name: 'Alice'})
INSERT (product:Product {product_id: 'prod_456', name: 'Laptop'})
INSERT (cart:ShoppingCart {cart_id: 'cart_789'})

INSERT (user)-[:OWNS]->(cart)
INSERT (cart)-[:CONTAINS]->(product)
INSERT (user)-[:PURCHASED {
  timestamp: datetime('2025-01-24T10:30:00'),
  amount: 1299.99,
  quantity: 1
}]->(product)
INSERT (user)-[:VIEWED {
  timestamp: datetime('2025-01-23T14:20:00'),
  duration_seconds: 145
}]->(product)
INSERT (user)-[:RATED {
  score: 4.5,
  timestamp: datetime('2025-01-25T09:15:00'),
  review_text: 'Great laptop, highly recommended'
}]->(product);
```

### Relationship Direction

Choose directions that reflect domain semantics:

```gql
// Social network: FOLLOWS is directional
INSERT (alice:User {user_id: 'alice', name: 'Alice'})
INSERT (bob:User {user_id: 'bob', name: 'Bob'})
INSERT (alice)-[:FOLLOWS {since: datetime()}]->(bob);

// Query followers
MATCH (bob:User {user_id: 'bob'})<-[:FOLLOWS]-(follower)
RETURN follower.name;

// Query following
MATCH (alice:User {user_id: 'alice'})-[:FOLLOWS]->(following)
RETURN following.name;

// Mutual follows (friends)
MATCH (alice:User {user_id: 'alice'})-[:FOLLOWS]->(bob:User)
MATCH (bob)-[:FOLLOWS]->(alice)
RETURN bob.name AS mutual_friend;
```

### Relationship Properties

Store metadata on relationships:

```gql
// Transaction with rich metadata
INSERT (sender:Account {account_id: 'acc_123'})
INSERT (receiver:Account {account_id: 'acc_456'})
INSERT (sender)-[:TRANSFERRED {
  transaction_id: 'tx_789',
  amount: 1500.00,
  currency: 'USD',
  timestamp: datetime('2025-01-24T15:30:00'),
  status: 'completed',
  fee: 2.50,
  description: 'Invoice payment',
  ip_address: '192.168.1.100',
  device_id: 'device_abc'
}]->(receiver);

// Query by relationship properties
MATCH (sender:Account)-[t:TRANSFERRED]->(receiver:Account)
WHERE t.amount > 1000
  AND t.timestamp > datetime().minusDays(7)
  AND t.status = 'completed'
RETURN sender.account_id,
       receiver.account_id,
       t.amount,
       t.timestamp;
```

## Schema Patterns

### Hub and Spoke

Central node connected to many peripheral nodes:

```gql
// Organization hub with employee spokes
INSERT (org:Organization {org_id: 'org_123', name: 'Acme Corp'})
INSERT (alice:Employee {emp_id: 'emp_001', name: 'Alice'})
INSERT (bob:Employee {emp_id: 'emp_002', name: 'Bob'})
INSERT (carol:Employee {emp_id: 'emp_003', name: 'Carol'})

INSERT (alice)-[:WORKS_FOR {since: datetime('2020-01-15')}]->(org)
INSERT (bob)-[:WORKS_FOR {since: datetime('2021-03-20')}]->(org)
INSERT (carol)-[:WORKS_FOR {since: datetime('2019-11-10')}]->(org);

// Query all employees of organization
MATCH (org:Organization {org_id: 'org_123'})<-[:WORKS_FOR]-(emp:Employee)
RETURN emp.name, emp.emp_id;
```

### Hierarchies

Model organizational or taxonomic hierarchies:

```gql
// Category hierarchy
INSERT (electronics:Category {cat_id: 'cat_001', name: 'Electronics'})
INSERT (computers:Category {cat_id: 'cat_002', name: 'Computers'})
INSERT (laptops:Category {cat_id: 'cat_003', name: 'Laptops'})
INSERT (desktops:Category {cat_id: 'cat_004', name: 'Desktops'})

INSERT (computers)-[:PARENT_CATEGORY]->(electronics)
INSERT (laptops)-[:PARENT_CATEGORY]->(computers)
INSERT (desktops)-[:PARENT_CATEGORY]->(computers);

// Query entire hierarchy
MATCH path = (leaf:Category {name: 'Laptops'})-[:PARENT_CATEGORY*]->(root)
RETURN [n IN nodes(path) | n.name] AS hierarchy;

// Query all subcategories
MATCH (electronics:Category {name: 'Electronics'})<-[:PARENT_CATEGORY*]-(sub:Category)
RETURN sub.name AS subcategory;
```

### Bipartite Graphs

Model two distinct node types with relationships between them:

```gql
// Users and products (recommendation system)
INSERT (u1:User {user_id: 'u1', name: 'Alice'})
INSERT (u2:User {user_id: 'u2', name: 'Bob'})
INSERT (p1:Product {product_id: 'p1', name: 'Laptop'})
INSERT (p2:Product {product_id: 'p2', name: 'Mouse'})
INSERT (p3:Product {product_id: 'p3', name: 'Keyboard'})

INSERT (u1)-[:PURCHASED]->(p1)
INSERT (u1)-[:PURCHASED]->(p2)
INSERT (u2)-[:PURCHASED]->(p2)
INSERT (u2)-[:PURCHASED]->(p3);

// Find users who bought similar products
MATCH (u1:User)-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(u2:User)
WHERE u1 <> u2
RETURN u1.name, u2.name, COLLECT(p.name) AS common_products;
```

### Linked List

Ordered sequences using relationships:

```gql
// Order processing workflow
INSERT (s1:WorkflowStep {step_id: 1, name: 'Order Received'})
INSERT (s2:WorkflowStep {step_id: 2, name: 'Payment Processed'})
INSERT (s3:WorkflowStep {step_id: 3, name: 'Order Packed'})
INSERT (s4:WorkflowStep {step_id: 4, name: 'Order Shipped'})
INSERT (s5:WorkflowStep {step_id: 5, name: 'Order Delivered'})

INSERT (s1)-[:NEXT_STEP]->(s2)
INSERT (s2)-[:NEXT_STEP]->(s3)
INSERT (s3)-[:NEXT_STEP]->(s4)
INSERT (s4)-[:NEXT_STEP]->(s5);

// Traverse workflow
MATCH path = (start:WorkflowStep {step_id: 1})-[:NEXT_STEP*]->(end:WorkflowStep)
RETURN [n IN nodes(path) | n.name] AS workflow_steps;
```

## Temporal Modeling

### Time-Stamped Relationships

Track when relationships were created or modified:

```gql
// Friendship with temporal data
INSERT (alice:User {user_id: 'alice'})
INSERT (bob:User {user_id: 'bob'})
INSERT (alice)-[:FRIENDS_WITH {
  since: datetime('2020-05-15T10:00:00'),
  last_interaction: datetime('2025-01-20T14:30:00')
}]->(bob);

// Query recent friendships
MATCH (u1:User)-[f:FRIENDS_WITH]->(u2:User)
WHERE f.since > datetime().minusDays(30)
RETURN u1.name, u2.name, f.since;
```

### Valid Time Intervals

Model relationships that are valid for specific periods:

```gql
// Employment history
INSERT (employee:Person {person_id: 'p123', name: 'Alice'})
INSERT (company:Company {company_id: 'c456', name: 'Acme Corp'})
INSERT (employee)-[:EMPLOYED_BY {
  job_title: 'Senior Engineer',
  start_date: datetime('2020-01-01'),
  end_date: datetime('2023-06-30'),  // NULL for current employment
  department: 'Engineering'
}]->(company);

// Query current employees
MATCH (p:Person)-[e:EMPLOYED_BY]->(c:Company)
WHERE e.end_date IS NULL OR e.end_date > datetime()
RETURN p.name, e.job_title, c.name;

// Query employment at specific time
MATCH (p:Person)-[e:EMPLOYED_BY]->(c:Company)
WHERE e.start_date <= datetime('2022-03-15')
  AND (e.end_date IS NULL OR e.end_date >= datetime('2022-03-15'))
RETURN p.name, e.job_title, c.name;
```

## Denormalization for Performance

### Caching Aggregates

Store computed values for fast access:

```gql
// User node with cached statistics
INSERT (u:User {
  user_id: 'user_123',
  name: 'Alice',
  // Cached aggregates
  total_purchases: 45,
  total_spent: 5432.10,
  last_purchase_date: datetime('2025-01-20T09:30:00'),
  favorite_category: 'Electronics'
});

// Update cache when purchases occur
MATCH (u:User {user_id: 'user_123'})
MATCH (p:Product {product_id: 'prod_456'})
INSERT (u)-[:PURCHASED {
  amount: 199.99,
  timestamp: datetime()
}]->(p)
SET u.total_purchases = u.total_purchases + 1,
    u.total_spent = u.total_spent + 199.99,
    u.last_purchase_date = datetime();
```

### Materialized Paths

Store paths for fast traversal:

```gql
// Category with materialized path
INSERT (c:Category {
  category_id: 'cat_laptops',
  name: 'Laptops',
  path: '/Electronics/Computers/Laptops',  // Materialized path
  depth: 3
});

// Fast ancestor queries using path
MATCH (c:Category)
WHERE c.path STARTS WITH '/Electronics/Computers/'
RETURN c.name, c.depth;
```

## Anti-Patterns to Avoid

### 1. Overly Deep Hierarchies

```gql
// ANTI-PATTERN: 10+ levels deep
MATCH (leaf)-[:PARENT*15]->(root)  // Slow!

// BETTER: Limit depth or use materialized paths
MATCH (leaf {path: '/root/...'})-[:PARENT*0..3]->(ancestor)
```

### 2. Dense Nodes (Super Nodes)

```gql
// ANTI-PATTERN: Node with millions of relationships
INSERT (popular_user:User {user_id: 'celebrity'})
// ... connected to 10 million followers

// BETTER: Add intermediate grouping nodes
INSERT (celebrity:User {user_id: 'celebrity'})
INSERT (group1:FollowerGroup {group_id: 'g1', range: '0-100000'})
INSERT (group2:FollowerGroup {group_id: 'g2', range: '100001-200000'})
INSERT (celebrity)-[:HAS_FOLLOWER_GROUP]->(group1)
INSERT (celebrity)-[:HAS_FOLLOWER_GROUP]->(group2)
// Distribute followers across groups
```

### 3. Redundant Relationships

```gql
// ANTI-PATTERN: Storing both directions
INSERT (alice)-[:FRIENDS_WITH]->(bob)
INSERT (bob)-[:FRIENDS_WITH]->(alice)  // Redundant!

// BETTER: Use one direction, query bidirectionally
INSERT (alice)-[:FRIENDS_WITH]->(bob)

// Query ignoring direction
MATCH (alice:User {user_id: 'alice'})-[:FRIENDS_WITH]-(friend)
RETURN friend.name;
```

## Best Practices

1. **Start Simple**: Begin with core entities and relationships, add complexity as needed
2. **Model the Domain**: Graph structure should reflect business concepts naturally
3. **Index Key Properties**: Create indexes on properties used in lookups and filters
4. **Normalize Lookups**: Use nodes for values that are queried or traversed
5. **Denormalize Reads**: Cache aggregates for frequently accessed metrics
6. **Use Descriptive Names**: Relationship types should clearly indicate purpose
7. **Consistent Naming**: Follow naming conventions (snake_case for properties, UPPER_CASE for relationships)
8. **Limit Relationship Fan-Out**: Avoid nodes with millions of relationships
9. **Version Your Schema**: Track schema changes and support migrations
10. **Document Patterns**: Maintain documentation of your modeling decisions

## Integration with Geode Features

Data modeling leverages:

- **Labels**: Multiple labels per node for flexible categorization
- **Properties**: Rich property types (strings, numbers, dates, arrays, maps)
- **Indexes**: B-tree indexes on properties for fast lookups
- **Constraints**: Unique constraints and existence checks
- **GQL Compliance**: Standard ISO property graph model

Browse the tagged content below to discover documentation, tutorials, and guides for designing effective graph data models in Geode.
