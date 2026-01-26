---
title: "Data Modeling"
description: "Design effective graph data models for Geode using property graph patterns, label hierarchies, and relationship types. Learn best practices for schema design, normalization, and domain modeling with production-proven patterns."
keywords:
  - data modeling
  - graph modeling
  - property graph
  - schema design
  - domain modeling
  - entity relationships
  - data architecture
  - graph schema
  - node modeling
  - relationship modeling
  - label design
  - property design
  - graph normalization
  - denormalization patterns
  - temporal modeling
  - hierarchical modeling
  - Geode
  - graph database
  - ISO GQL
  - schema patterns
  - modeling best practices
  - graph data architecture
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/data-model/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Data modeling in Geode translates your domain into an effective property graph structure. Learn to design nodes, relationships, properties, and labels that optimize both query performance and semantic clarity. This comprehensive guide covers production-proven modeling patterns, performance optimization strategies, and real-world design decisions for enterprise graph databases.

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

## Production Modeling Patterns

### Multi-Label Hierarchies

Design flexible type hierarchies using multiple labels:

```gql
// Content type hierarchy
INSERT (article:Content:Article:Premium {
  content_id: 'article_123',
  title: 'Advanced Graph Modeling',
  author_id: 'author_456',
  word_count: 2500,
  access_level: 'premium'
});

// Query flexibility
MATCH (c:Content) RETURN COUNT(c);  // All content
MATCH (a:Article) RETURN COUNT(a);  // Just articles
MATCH (p:Premium) RETURN COUNT(p);  // Premium content across types

// Label-based access control
MATCH (c:Content)
WHERE 'Premium' IN labels(c) AND user.subscription = 'premium'
  OR NOT 'Premium' IN labels(c)
RETURN c;
```

### Bidirectional Relationship Modeling

Choose between bidirectional and unidirectional relationships:

```gql
// APPROACH 1: Single directed relationship (recommended)
INSERT (alice:User {id: 'alice'})
INSERT (bob:User {id: 'bob'})
INSERT (alice)-[:FRIENDS_WITH]->(bob);

// Query in either direction
MATCH (alice:User {id: 'alice'})-[:FRIENDS_WITH]-(friend)
RETURN friend.name;

// APPROACH 2: Symmetric relationships (use sparingly)
INSERT (alice)-[:MARRIED_TO]->(bob)
INSERT (bob)-[:MARRIED_TO]->(alice);  // Truly bidirectional
```

**Best Practice**: Use single directed relationships with undirected queries (`-[:REL]-`) unless the relationship is fundamentally symmetric (marriage, equivalence).

### Intermediate Nodes for Complex Relationships

Model many-to-many relationships with rich metadata:

```gql
// ANTI-PATTERN: Properties on direct relationship
INSERT (student:Student {id: 's123'})-[:ENROLLED_IN {
  semester: 'Fall 2024',
  grade: 'A',
  credits: 3,
  attendance_rate: 0.95
}]->(course:Course {id: 'cs101'});

// BETTER: Intermediate enrollment node
INSERT (student:Student {id: 's123'})
INSERT (course:Course {id: 'cs101'})
INSERT (enrollment:Enrollment {
  enrollment_id: 'enr_789',
  semester: 'Fall 2024',
  grade: 'A',
  credits: 3,
  attendance_rate: 0.95
})
INSERT (student)-[:HAS_ENROLLMENT]->(enrollment)
INSERT (enrollment)-[:FOR_COURSE]->(course);

// Now can query enrollments as first-class entities
MATCH (e:Enrollment)
WHERE e.semester = 'Fall 2024' AND e.grade IN ['A', 'A+']
RETURN COUNT(e) AS honor_roll_students;
```

## Advanced Temporal Patterns

### Bi-Temporal Modeling

Track both valid time (when fact was true) and transaction time (when we knew about it):

```gql
// Bi-temporal employment record
INSERT (person:Person {person_id: 'p123', name: 'Alice'})
INSERT (company:Company {company_id: 'c456', name: 'Acme Corp'})
INSERT (person)-[:EMPLOYED_BY {
  valid_from: datetime('2020-01-01'),      // When employment started
  valid_to: datetime('2023-06-30'),        // When employment ended
  tx_from: datetime('2020-01-05'),         // When we recorded start
  tx_to: datetime('2023-07-15'),           // When we recorded end
  job_title: 'Senior Engineer',
  salary: 125000,
  department: 'Engineering'
}]->(company);

// Query: Who was employed on 2022-03-15?
MATCH (p:Person)-[e:EMPLOYED_BY]->(c:Company)
WHERE e.valid_from <= datetime('2022-03-15')
  AND (e.valid_to IS NULL OR e.valid_to >= datetime('2022-03-15'))
RETURN p.name, e.job_title, c.name;

// Query: What did we know about employment on 2023-07-01?
MATCH (p:Person)-[e:EMPLOYED_BY]->(c:Company)
WHERE e.tx_from <= datetime('2023-07-01')
  AND (e.tx_to IS NULL OR e.tx_to >= datetime('2023-07-01'))
RETURN p.name, e.job_title, c.name;
```

### Event Sourcing Pattern

Store state changes as immutable events:

```gql
// Event stream for account balance
INSERT (account:Account {account_id: 'acc_123', current_balance: 0})

INSERT (event1:AccountEvent {
  event_id: 'evt_001',
  event_type: 'AccountOpened',
  timestamp: datetime('2024-01-01T10:00:00'),
  data: {initial_balance: 1000}
})
INSERT (account)-[:HAS_EVENT {sequence: 1}]->(event1)

INSERT (event2:AccountEvent {
  event_id: 'evt_002',
  event_type: 'DepositMade',
  timestamp: datetime('2024-01-15T14:30:00'),
  data: {amount: 500, source: 'wire_transfer'}
})
INSERT (account)-[:HAS_EVENT {sequence: 2}]->(event2)

INSERT (event3:AccountEvent {
  event_id: 'evt_003',
  event_type: 'WithdrawalMade',
  timestamp: datetime('2024-01-20T09:15:00'),
  data: {amount: 200, destination: 'check_1001'}
})
INSERT (account)-[:HAS_EVENT {sequence: 3}]->(event3);

// Rebuild current state from events
MATCH (a:Account {account_id: 'acc_123'})-[he:HAS_EVENT]->(e:AccountEvent)
WITH a, e ORDER BY he.sequence
WITH a, COLLECT(e) AS events
RETURN a.account_id,
       REDUCE(balance = 0, evt IN events |
         CASE evt.event_type
           WHEN 'AccountOpened' THEN evt.data.initial_balance
           WHEN 'DepositMade' THEN balance + evt.data.amount
           WHEN 'WithdrawalMade' THEN balance - evt.data.amount
           ELSE balance
         END
       ) AS calculated_balance;
```

## Performance-Driven Modeling

### Strategic Denormalization

Cache computed values for fast reads:

```gql
// User node with cached statistics
INSERT (u:User {
  user_id: 'user_123',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  created_at: datetime('2020-01-15T10:00:00'),

  // Denormalized aggregates (updated via triggers/app logic)
  total_posts: 0,
  total_followers: 0,
  total_following: 0,
  avg_post_engagement: 0.0,
  last_post_date: NULL,
  reputation_score: 100
});

// Update trigger pseudocode (application logic)
// When user creates post:
MATCH (u:User {user_id: $user_id})
MATCH (p:Post {post_id: $new_post_id})
INSERT (u)-[:POSTED {timestamp: datetime()}]->(p)
SET u.total_posts = u.total_posts + 1,
    u.last_post_date = datetime();

// Fast dashboard query (no aggregation needed)
MATCH (u:User {user_id: $user_id})
RETURN u.name,
       u.total_posts,
       u.total_followers,
       u.reputation_score;
```

### Locality Optimization

Co-locate frequently accessed data:

```gql
// Embed small, static reference data
INSERT (order:Order {
  order_id: 'ord_123',
  customer_id: 'cust_456',

  // Embedded shipping address (snapshot at order time)
  shipping_address: {
    street: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    country: 'USA'
  },

  // Embedded line items (small, fixed list)
  items: [
    {product_id: 'prod_789', name: 'Widget', quantity: 2, price: 19.99},
    {product_id: 'prod_012', name: 'Gadget', quantity: 1, price: 49.99}
  ],

  total: 89.97,
  status: 'shipped',
  created_at: datetime()
});

// Single-node query for complete order
MATCH (o:Order {order_id: 'ord_123'})
RETURN o;

// No joins needed for order display
```

### Relationship Fanout Management

Handle high-degree nodes:

```gql
// PROBLEM: Celebrity user with millions of followers (super node)
INSERT (celebrity:User {user_id: 'celeb_001', name: 'Famous Person'})
// ... 10 million follower relationships

// SOLUTION 1: Follower buckets
INSERT (celebrity:User {user_id: 'celeb_001'})
INSERT (bucket1:FollowerBucket {
  bucket_id: 'bucket_001',
  user_id: 'celeb_001',
  range_start: 0,
  range_end: 99999,
  follower_count: 100000
})
INSERT (bucket2:FollowerBucket {
  bucket_id: 'bucket_002',
  user_id: 'celeb_001',
  range_start: 100000,
  range_end: 199999,
  follower_count: 100000
})
INSERT (celebrity)-[:HAS_FOLLOWER_BUCKET]->(bucket1)
INSERT (celebrity)-[:HAS_FOLLOWER_BUCKET]->(bucket2);

// Distribute followers across buckets
INSERT (follower1:User {user_id: 'user_001'})
INSERT (follower1)-[:FOLLOWS]->(bucket1)  // Not directly to celebrity
INSERT (bucket1)-[:REPRESENTS_USER]->(celebrity);

// SOLUTION 2: Aggregation node
INSERT (celebrity)-[:FOLLOWER_COUNT {count: 10000000}]->(agg:FollowerAggregate);
```

## Domain-Specific Patterns

### Social Network Modeling

Complete social graph design:

```gql
// Users with profiles
INSERT (alice:User:Individual {
  user_id: 'alice_123',
  username: 'alice',
  display_name: 'Alice Johnson',
  email: 'alice@example.com',
  bio: 'Software engineer, graph database enthusiast',
  location: 'San Francisco, CA',
  website: 'https://alice.dev',
  verified: true,
  created_at: datetime('2020-05-15T10:00:00'),

  // Privacy settings
  profile_visibility: 'public',
  post_privacy_default: 'followers',

  // Cached counts
  follower_count: 0,
  following_count: 0,
  post_count: 0
});

// Follow relationships
INSERT (alice)-[:FOLLOWS {
  since: datetime('2024-01-10T14:30:00'),
  notifications_enabled: true,
  relationship_strength: 0.8  // ML-computed
}]->(bob:User {user_id: 'bob_456'});

// Posts with engagement
INSERT (post:Post {
  post_id: 'post_789',
  content: 'Just learned about graph databases!',
  created_at: datetime('2024-01-20T09:00:00'),
  edited_at: NULL,
  visibility: 'public',

  // Cached metrics
  like_count: 0,
  comment_count: 0,
  share_count: 0,
  view_count: 0
})
INSERT (alice)-[:POSTED]->(post);

// Interactions
INSERT (bob)-[:LIKED {timestamp: datetime()}]->(post)
INSERT (comment:Comment {
  comment_id: 'cmt_111',
  content: 'Great topic! Check out Geode.',
  created_at: datetime()
})
INSERT (bob)-[:COMMENTED]->(comment)
INSERT (comment)-[:ON_POST]->(post);
```

### E-Commerce Modeling

Complete product catalog and order system:

```gql
// Product hierarchy
INSERT (electronics:Category {cat_id: 'cat_001', name: 'Electronics'})
INSERT (computers:Category {cat_id: 'cat_002', name: 'Computers'})
INSERT (laptops:Category {cat_id: 'cat_003', name: 'Laptops'})
INSERT (computers)-[:SUBCATEGORY_OF]->(electronics)
INSERT (laptops)-[:SUBCATEGORY_OF]->(computers);

// Product with variants
INSERT (product:Product {
  product_id: 'prod_123',
  name: 'UltraBook Pro',
  brand: 'TechCo',
  base_price: 1299.99,
  description: 'High-performance laptop',

  // SEO
  slug: 'ultrabook-pro',
  meta_description: 'Professional laptop for developers',

  // Inventory tracking
  total_stock: 0,  // Sum of variant stock
  status: 'active'
})
INSERT (product)-[:IN_CATEGORY]->(laptops);

// Product variants
INSERT (variant1:ProductVariant {
  variant_id: 'var_001',
  sku: 'ULTRA-16-512-SLV',
  attributes: {
    ram: '16GB',
    storage: '512GB SSD',
    color: 'Silver'
  },
  price: 1299.99,
  stock: 25,
  weight_kg: 1.8
})
INSERT (variant2:ProductVariant {
  variant_id: 'var_002',
  sku: 'ULTRA-32-1TB-BLK',
  attributes: {
    ram: '32GB',
    storage: '1TB SSD',
    color: 'Black'
  },
  price: 1799.99,
  stock: 15,
  weight_kg: 1.8
})
INSERT (product)-[:HAS_VARIANT]->(variant1)
INSERT (product)-[:HAS_VARIANT]->(variant2);

// Order with line items
INSERT (order:Order {
  order_id: 'ord_456',
  customer_id: 'cust_789',
  status: 'processing',
  subtotal: 1299.99,
  tax: 104.00,
  shipping: 15.00,
  total: 1418.99,
  currency: 'USD',
  created_at: datetime(),

  // Payment info (reference)
  payment_method: 'credit_card',
  payment_id: 'pay_123',

  // Fulfillment
  shipping_method: 'standard',
  tracking_number: NULL
})
INSERT (lineitem:OrderLineItem {
  line_id: 'line_001',
  variant_id: 'var_001',
  quantity: 1,
  unit_price: 1299.99,
  total: 1299.99
})
INSERT (order)-[:CONTAINS]->(lineitem)
INSERT (lineitem)-[:FOR_VARIANT]->(variant1);
```

## Schema Validation and Constraints

### Comprehensive Constraint Design

```gql
// Node existence constraints
CREATE CONSTRAINT ON (u:User) ASSERT EXISTS(u.user_id);
CREATE CONSTRAINT ON (u:User) ASSERT EXISTS(u.email);
CREATE CONSTRAINT ON (p:Product) ASSERT EXISTS(p.product_id);

// Uniqueness constraints
CREATE CONSTRAINT ON (u:User) ASSERT u.user_id IS UNIQUE;
CREATE CONSTRAINT ON (u:User) ASSERT u.email IS UNIQUE;
CREATE CONSTRAINT ON (p:Product) ASSERT p.sku IS UNIQUE;

// Type constraints
CREATE CONSTRAINT ON (u:User) ASSERT u.created_at IS :: DATETIME;
CREATE CONSTRAINT ON (p:Product) ASSERT p.price IS :: FLOAT;
CREATE CONSTRAINT ON (o:Order) ASSERT o.total IS :: DECIMAL(10,2);

// Range constraints
CREATE CONSTRAINT ON (u:User) ASSERT u.age >= 0 AND u.age <= 150;
CREATE CONSTRAINT ON (p:Product) ASSERT p.price > 0;
CREATE CONSTRAINT ON (r:Rating) ASSERT r.score BETWEEN 1 AND 5;

// Pattern constraints
CREATE CONSTRAINT ON (u:User) ASSERT u.email =~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$';
CREATE CONSTRAINT ON (p:Product) ASSERT u.sku =~ '^[A-Z0-9-]{6,20}$';
```

## Migration and Evolution Strategies

### Schema Versioning

```gql
// Add new optional property (backward compatible)
MATCH (u:User)
SET u.timezone = 'UTC'
WHERE u.timezone IS NULL;

// Add new label to existing nodes
MATCH (u:User)
WHERE u.subscription_tier = 'premium'
SET u:PremiumUser;

// Migrate relationship types
MATCH (a:User)-[old:FRIEND_OF]->(b:User)
CREATE (a)-[new:FRIENDS_WITH {since: old.created_at}]->(b)
DELETE old;

// Add intermediate nodes
MATCH (p:Person)-[emp:WORKS_FOR]->(c:Company)
CREATE (p)-[:HAS_EMPLOYMENT]->(e:Employment {
  start_date: emp.start_date,
  end_date: emp.end_date,
  job_title: emp.title
})-[:AT_COMPANY]->(c)
DELETE emp;
```

## Troubleshooting Common Modeling Issues

### Diagnosing Schema Problems

```gql
// Find nodes without required properties
MATCH (u:User)
WHERE u.email IS NULL
RETURN u.user_id, labels(u);

// Find orphaned nodes (no relationships)
MATCH (n)
WHERE NOT EXISTS { MATCH (n)--() }
RETURN labels(n) AS node_type, COUNT(n) AS orphan_count;

// Identify super nodes (high degree)
MATCH (n)
WITH n, COUNT{MATCH (n)-[]-() } AS degree
WHERE degree > 10000
RETURN labels(n), n.id, degree
ORDER BY degree DESC;

// Find duplicate data
MATCH (u1:User), (u2:User)
WHERE u1.email = u2.email AND u1.user_id < u2.user_id
RETURN u1.user_id, u2.user_id, u1.email AS duplicate_email;
```

## Related Topics and Resources

Data modeling integrates with:

- **Query Patterns**: Design models that support efficient query patterns
- **Indexing**: Create indexes aligned with model access patterns
- **Performance**: Optimize model structure for query performance
- **Constraints**: Enforce data integrity through schema constraints
- **Migrations**: Evolve models safely in production
- **GQL Standard**: Follow ISO/IEC 39075:2024 property graph model

Browse the tagged content below to discover documentation, tutorials, and guides for designing effective graph data models in Geode.
