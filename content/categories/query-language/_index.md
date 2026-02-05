---
title: "Category: Graph Query Language (GQL)"
description: "Comprehensive GQL query language documentation for Geode including ISO standard syntax, pattern matching, MATCH clauses, CREATE operations, aggregations, and advanced query techniques."
keywords:
  - GQL
  - Graph Query Language
  - ISO 39075
  - query language
  - pattern matching
  - MATCH
  - CREATE
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/query-language/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

The **Graph Query Language (GQL)** category provides comprehensive documentation on writing queries in Geode using the ISO/IEC 39075:2024 standard. From basic pattern matching to advanced analytical queries, this collection covers everything you need to effectively query graph data.

## Introduction to GQL

Graph Query Language (GQL) is the ISO-standardized language for querying graph databases, analogous to SQL for relational databases. Ratified as ISO/IEC 39075:2024, GQL represents decades of graph database research unified into a single, coherent specification. Geode follows the ISO/IEC 39075:2024 compliance to keep queries portable and semantics predictable.

GQL adopts a **declarative approach**: you describe what patterns to find, not how to find them. The query engine determines optimal execution strategies using cost-based optimization, indexes, and graph-specific algorithms. This separation of concerns lets you focus on business logic while Geode handles performance.

## Core Concepts

### Nodes and Relationships

Graphs consist of **nodes** (entities) and **relationships** (connections). Nodes have **labels** that categorize them and **properties** that store attributes. Relationships have **types** and can also contain properties.

```gql
-- Node: (variable:Label {property: value})
(person:Person {name: 'Alice', age: 30})

-- Relationship: -[variable:TYPE {property: value}]->
-[friendship:KNOWS {since: 2020}]->

-- Undirected relationship
-[connection:CONNECTED]-
```

### Pattern Matching

Pattern matching is the foundation of GQL queries. Use `MATCH` to describe patterns in the graph, then `RETURN` to specify what to retrieve:

```gql
-- Find Alice's friends
MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend:Person)
RETURN friend.name, friend.age
```

**Patterns** describe graph structure using ASCII art notation:
- `()` - A node
- `(n)` - A node bound to variable `n`
- `(n:Label)` - A node with label `Label`
- `(n:Label {prop: value})` - A node with label and properties
- `-[r:TYPE]->` - A directed relationship
- `-[r:TYPE]-` - An undirected relationship
- `-[:TYPE*1..3]->` - Variable-length path (1 to 3 hops)

### Variables and Binding

Variables bind to matched elements, allowing you to reference them in other clauses:

```gql
MATCH (u:User {id: $userId})-[:FOLLOWS]->(followed:User)
      -[:POSTED]->(post:Post)
WHERE post.created > current_timestamp() - INTERVAL '7' DAY
RETURN followed.username, post.content, post.created
ORDER BY post.created DESC
```

Variables scope within a query. Use `WITH` to pass variables between query parts:

```gql
MATCH (u:User)
WITH u, count{(u)-[:POSTED]->()} AS post_count
WHERE post_count > 10
RETURN u.username, post_count
```

## Basic Query Operations

### Reading Data: MATCH

`MATCH` finds patterns in the graph:

```gql
-- Single node
MATCH (n:Person)
RETURN n.name

-- Node with specific properties
MATCH (n:Person {country: 'USA', age: 25})
RETURN n.name

-- Node with relationship
MATCH (a:Person)-[:KNOWS]->(b:Person)
RETURN a.name, b.name

-- Multi-hop relationship
MATCH (a:Person)-[:KNOWS]->(:Person)-[:KNOWS]->(c:Person)
WHERE a.name = 'Alice'
RETURN c.name
```

### Creating Data: CREATE

`CREATE` adds new nodes and relationships:

```gql
-- Create single node
CREATE (n:Person {name: 'Alice', age: 30})

-- Create multiple nodes
CREATE (a:Person {name: 'Alice'}),
       (b:Person {name: 'Bob'})

-- Create nodes with relationship
CREATE (a:Person {name: 'Alice'})
       -[:KNOWS {since: 2020}]->
       (b:Person {name: 'Bob'})
```

### Updating Data: SET and REMOVE

`SET` modifies properties:

```gql
-- Set single property
MATCH (n:Person {name: 'Alice'})
SET n.age = 31

-- Set multiple properties
MATCH (n:Person {name: 'Alice'})
SET n.age = 31, n.city = 'New York'

-- Add label
MATCH (n:Person {name: 'Alice'})
SET n:VIP

-- Copy properties
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
SET b = a
```

`REMOVE` deletes properties or labels:

```gql
-- Remove property
MATCH (n:Person {name: 'Alice'})
REMOVE n.age

-- Remove label
MATCH (n:Person {name: 'Alice'})
REMOVE n:VIP
```

### Deleting Data: DELETE

`DELETE` removes nodes and relationships:

```gql
-- Delete relationship
MATCH (a:Person)-[r:KNOWS]->(b:Person)
WHERE a.name = 'Alice' AND b.name = 'Bob'
DELETE r

-- Delete node and its relationships
MATCH (n:Person {name: 'Alice'})
DETACH DELETE n

-- Delete all matching nodes
MATCH (n:TempData)
DELETE n
```

`DETACH DELETE` automatically removes all relationships connected to deleted nodes.

## Filtering with WHERE

`WHERE` filters matched patterns using predicates:

```gql
-- Comparison operators
MATCH (n:Person)
WHERE n.age > 25 AND n.age < 40
RETURN n.name

-- String matching
MATCH (n:Person)
WHERE n.name STARTS WITH 'A'
   OR n.email CONTAINS '@example.com'
RETURN n.name

-- NULL checks
MATCH (n:Person)
WHERE n.middle_name IS NULL
RETURN n.name

-- List membership
MATCH (n:Person)
WHERE n.country IN ['USA', 'Canada', 'Mexico']
RETURN n.name

-- Pattern existence
MATCH (u:User)
WHERE EXISTS {
    MATCH (u)-[:PURCHASED]->(:Product {category: 'Electronics'})
}
RETURN u.name
```

## Aggregations and Grouping

GQL provides statistical aggregation functions:

```gql
-- Count
MATCH (n:Person)
RETURN count(n) AS total_people

-- Sum, average, min, max
MATCH (u:User)-[t:TRANSACTION]->()
RETURN u.name,
       sum(t.amount) AS total_spent,
       avg(t.amount) AS avg_transaction,
       min(t.amount) AS smallest,
       max(t.amount) AS largest

-- Group by
MATCH (p:Product)
RETURN p.category, count(p) AS products_per_category
GROUP BY p.category
ORDER BY products_per_category DESC

-- Collect into list
MATCH (u:User {name: 'Alice'})-[:KNOWS]->(friend:Person)
RETURN u.name, collect(friend.name) AS friend_names
```

## Advanced Pattern Matching

### Variable-Length Paths

Match paths with varying length:

```gql
-- 1 to 3 hops
MATCH (a:Person {name: 'Alice'})-[:KNOWS*1..3]->(friend:Person)
RETURN friend.name

-- Exactly 2 hops
MATCH (a:Person {name: 'Alice'})-[:KNOWS*2]->(friend:Person)
RETURN friend.name

-- Any length (use cautiously!)
MATCH path = (a:Person {name: 'Alice'})-[:KNOWS*]->(b:Person {name: 'Bob'})
RETURN path
```

### Shortest Paths

Find minimal-length paths:

```gql
-- Shortest path
MATCH path = SHORTEST (a:Person {name: 'Alice'})
                      -[:KNOWS*]->
                      (b:Person {name: 'Bob'})
RETURN path, length(path) AS hops

-- All shortest paths
MATCH paths = ALL SHORTEST (a:Person {name: 'Alice'})
                           -[:KNOWS*]->
                           (b:Person {name: 'Bob'})
RETURN paths
```

### Optional Patterns

Match patterns that may not exist:

```gql
-- OPTIONAL MATCH returns NULL if pattern doesn't exist
MATCH (u:User)
OPTIONAL MATCH (u)-[:PURCHASED]->(p:Product)
RETURN u.name, p.name

-- Multiple optional patterns
MATCH (u:User {name: 'Alice'})
OPTIONAL MATCH (u)-[:LIKES]->(post:Post)
OPTIONAL MATCH (u)-[:FOLLOWS]->(other:User)
RETURN u.name, post.title, other.username
```

### Subqueries

Execute nested queries:

```gql
-- Correlated subquery
MATCH (u:User)
WHERE EXISTS {
    MATCH (u)-[:PURCHASED]->(p:Product)
    WHERE p.price > 100
}
RETURN u.name

-- COUNT subquery
MATCH (u:User)
WITH u, count{(u)-[:POSTED]->()} AS post_count
WHERE post_count > 10
RETURN u.username, post_count
```

## Ordering and Limiting Results

Control result ordering and size:

```gql
-- Order by single property
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.price DESC

-- Order by multiple properties
MATCH (p:Person)
RETURN p.lastName, p.firstName
ORDER BY p.lastName, p.firstName

-- Limit results
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.price DESC
LIMIT 10

-- Skip and limit (pagination)
MATCH (p:Product)
RETURN p.name, p.price
ORDER BY p.price DESC
SKIP 20
LIMIT 10
```

## Working with Data Types

GQL supports rich data types:

```gql
-- Strings
CREATE (n:Node {text: 'Hello, World!'})

-- Numbers (integers and floats)
CREATE (n:Node {count: 42, ratio: 3.14159})

-- Booleans
CREATE (n:Node {active: true, deleted: false})

-- Dates and times
CREATE (n:Node {
    created: DATE '2024-01-15',
    updated: TIMESTAMP '2024-01-15T10:30:00Z',
    duration: DURATION 'P1Y2M3DT4H5M6S'
})

-- Lists
CREATE (n:Node {tags: ['important', 'urgent', 'review']})

-- Maps
CREATE (n:Node {metadata: {author: 'Alice', version: 2}})

-- NULL values
CREATE (n:Node {optional_field: NULL})
```

## Parameterized Queries

Use parameters for security and performance:

```python
import geode_client

client = geode_client.open_database("localhost:3141")

async with client.connection() as client:
    result, _ = await client.query("""
        MATCH (u:User {email: $email})
        SET u.last_login = $timestamp
        RETURN u
    """, {
        "email": "alice@example.com",
        "timestamp": datetime.now(timezone.utc)
    })
```

Parameters prevent SQL injection, enable query plan caching, and improve readability.

## Transaction Control

Manage multi-statement transactions:

```python
async with client.connection() as tx:
    await tx.begin()
    # All operations in one transaction
    await tx.execute("""
        MATCH (a:Account {id: $from})
        SET a.balance = a.balance - $amount
    """, {"from": 123, "amount": 100})

    await tx.execute("""
        MATCH (a:Account {id: $to})
        SET a.balance = a.balance + $amount
    """, {"to": 456, "amount": 100})

    # Commit atomically
    await tx.commit()
```

## Best Practices

1. **Use parameters**: Never concatenate user input into queries
2. **Filter early**: Place selective predicates in `MATCH` patterns when possible
3. **Limit results**: Always use `LIMIT` for unbounded queries
4. **Index wisely**: Create indexes on properties used in `WHERE` and `MATCH`
5. **Avoid Cartesian products**: Ensure patterns are connected
6. **Use OPTIONAL carefully**: Optional matches can complicate query plans
7. **Profile queries**: Use `EXPLAIN` and `PROFILE` to understand execution
8. **Document complex queries**: Explain business logic in comments

## Common Patterns

### Recommendation Query

```gql
-- Collaborative filtering
MATCH (me:User {id: $userId})-[:LIKES]->(item)<-[:LIKES]-(similar:User)
      -[:LIKES]->(recommendation)
WHERE NOT EXISTS {MATCH (me)-[:LIKES]->(recommendation)}
RETURN recommendation.title, COUNT(similar) AS score
ORDER BY score DESC
LIMIT 10
```

### Fraud Detection

```gql
-- Find suspicious transaction patterns
MATCH (a1:Account)-[t1:TRANSFER]->(a2:Account)-[t2:TRANSFER]->(a3:Account)
WHERE a3.id = a1.id
  AND t1.timestamp > current_timestamp() - INTERVAL '24' HOUR
RETURN a1.id, a2.id, SUM(t1.amount) AS circular_flow
```

### Social Network Analysis

```gql
-- Find friends of friends who aren't yet friends
MATCH (me:User {id: $userId})-[:FRIEND]->(friend)-[:FRIEND]->(suggestion)
WHERE NOT EXISTS {MATCH (me)-[:FRIEND]->(suggestion)}
  AND suggestion.id <> $userId
RETURN suggestion.name, COUNT(friend) AS mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10
```

## Related Topics

- [GQL Syntax Reference](/tags/gql-syntax/) - Detailed syntax documentation
- [Pattern Matching](/tags/pattern-matching/) - Advanced pattern techniques
- [Query Optimization](/categories/query-optimization/) - Performance tuning
- [Aggregation Functions](/tags/functions/) - Statistical operations
- [ISO GQL Standard](/tags/iso-gql/) - Official specification
- [MATCH Clause](/tags/match/) - Pattern matching details
- [Operators](/tags/operators/) - Comparison and logical operators

## Advanced GQL Features

### Window Functions

Window functions perform calculations across sets of rows related to the current row:

```gql
-- Rank products within categories
MATCH (p:Product)
RETURN p.category,
       p.name,
       p.price,
       RANK() OVER (PARTITION BY p.category ORDER BY p.price DESC) AS price_rank,
       AVG(p.price) OVER (PARTITION BY p.category) AS category_avg_price
ORDER BY p.category, price_rank
```

**Supported Window Functions**:
- `ROW_NUMBER()`: Sequential number for each row
- `RANK()`: Rank with gaps for ties
- `DENSE_RANK()`: Rank without gaps
- `PERCENT_RANK()`: Relative rank (0 to 1)
- `NTILE(n)`: Divide rows into n buckets
- `LAG(expr, offset)`: Access previous row
- `LEAD(expr, offset)`: Access next row
- `FIRST_VALUE(expr)`: First value in window
- `LAST_VALUE(expr)`: Last value in window

### Common Table Expressions (CTEs)

CTEs create named temporary result sets for complex queries:

```gql
-- Find users and their influence score
WITH user_metrics AS (
    MATCH (u:User)
    RETURN u,
           COUNT{(u)<-[:FOLLOWS]-()} AS follower_count,
           COUNT{(u)-[:POSTED]->()} AS post_count
),
engagement AS (
    MATCH (u:User)-[:POSTED]->(p:Post)
    RETURN u,
           AVG(p.likes + p.comments) AS avg_engagement
)
MATCH (u:User)
WITH u,
     user_metrics.follower_count AS followers,
     user_metrics.post_count AS posts,
     engagement.avg_engagement AS engagement
WHERE user_metrics.u = u AND engagement.u = u
RETURN u.username,
       followers,
       posts,
       engagement,
       (followers * 0.4 + posts * 0.2 + engagement * 0.4) AS influence_score
ORDER BY influence_score DESC
LIMIT 100
```

### Recursive Queries

Find all nodes reachable through recursive traversal:

```gql
-- Find all descendants in organizational hierarchy
MATCH (root:Employee {name: 'CEO'})
WITH root
MATCH path = (root)-[:MANAGES*0..]->(subordinate:Employee)
RETURN subordinate.name,
       subordinate.title,
       LENGTH(path) AS reporting_levels
ORDER BY reporting_levels, subordinate.name
```

**Depth Control**:
```gql
-- Limit recursion depth
MATCH (start:Node {id: 1})-[*1..5]->(reachable)
RETURN DISTINCT reachable

-- Find all reachable (use cautiously)
MATCH (start:Node {id: 1})-[*]->(reachable)
RETURN DISTINCT reachable
```

### Graph Pattern Expressions

Combine multiple patterns with Boolean logic:

```gql
-- Find users matching complex criteria
MATCH (u:User)
WHERE (
    // Pattern 1: Active premium users
    (u.subscription = 'premium' AND u.last_login > current_date() - INTERVAL '7' DAY)
    OR
    // Pattern 2: High engagement free users
    (u.subscription = 'free' AND COUNT{(u)-[:POSTED]->()) > 50}
)
AND NOT EXISTS {
    // Exclude suspended users
    MATCH (u)-[:SUSPENDED]->(s:Suspension)
    WHERE s.active = true
}
RETURN u.username, u.subscription, u.last_login
```

### List Comprehensions

Process lists with filtering and transformation:

```gql
-- Extract and process relationship properties
MATCH (u:User {id: $user_id})-[follows:FOLLOWS]->(friend:User)
RETURN u.name,
       [f IN COLLECT(friend) WHERE f.active = true | f.name] AS active_friends,
       [f IN COLLECT(follows) | f.since] AS friendship_dates,
       REDUCE(total = 0, f IN COLLECT(friend) | total + f.follower_count) AS total_network_reach
```

**List Functions**:
- `COLLECT(expr)`: Aggregate to list
- `HEAD(list)`: First element
- `TAIL(list)`: All but first
- `LAST(list)`: Last element
- `SIZE(list)`: List length
- `REVERSE(list)`: Reverse order
- `REDUCE(...)`: Fold/reduce operation

### Map Projections

Create maps from node properties:

```gql
-- Return structured data
MATCH (u:User {id: $user_id})
RETURN {
    user: {
        id: u.id,
        name: u.name,
        email: u.email
    },
    stats: {
        follower_count: COUNT{(u)<-[:FOLLOWS]-()},
        following_count: COUNT{(u)-[:FOLLOWS]->()},
        post_count: COUNT{(u)-[:POSTED]->()}
    },
    recent_activity: [
        (u)-[:POSTED]->(p:Post)
        WHERE p.created > current_date() - INTERVAL '7' DAY |
        {title: p.title, created: p.created, likes: p.likes}
    ]
} AS user_profile
```

## Query Optimization Techniques

### Index Hints

Guide the query planner to use specific indexes:

```gql
-- Force index usage
MATCH (u:User)
USING INDEX u:User(email)
WHERE u.email = $email
RETURN u

-- Scan hint for small result sets
MATCH (u:User)
USING SCAN u:User
WHERE u.role = 'admin'
RETURN u
```

### Join Hints

Control join strategy:

```gql
-- Force hash join
MATCH (a:User)-[:FRIEND]-(b:User)
OPTION (join=hash)
WHERE a.city = 'NYC' AND b.city = 'SF'
RETURN a.name, b.name

-- Force nested loop
MATCH (a:User)-[:FRIEND]-(b:User)
OPTION (join=nested_loop)
WHERE a.id = $user_id
RETURN b.name
```

### Query Rewriting

**Before optimization**:
```gql
-- Inefficient: Cartesian product
MATCH (u:User), (p:Product)
WHERE u.city = p.warehouse_city
RETURN u.name, p.name
```

**After optimization**:
```gql
-- Efficient: Explicit relationship or property join
MATCH (u:User)
MATCH (p:Product {warehouse_city: u.city})
RETURN u.name, p.name
```

### Projection Pushdown

Select only needed columns early:

```gql
-- Inefficient: Materializes all properties
MATCH (u:User)-[:POSTED]->(p:Post)
WITH u, p
WHERE p.likes > 100
RETURN u.name, p.title

-- Efficient: Project early
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE p.likes > 100
RETURN u.name, p.title
```

## Functions and Operators

### String Functions

```gql
-- String manipulation
MATCH (u:User)
WHERE toLower(u.name) CONTAINS 'alice'
RETURN u.name,
       toUpper(u.email) AS email_upper,
       substring(u.email, 0, indexOf(u.email, '@')) AS email_prefix,
       replace(u.phone, '-', '') AS phone_clean,
       trim(u.address) AS address_trimmed,
       left(u.postal_code, 5) AS zip5,
       right(u.postal_code, 4) AS zip4_extension
```

### Mathematical Functions

```gql
-- Math operations
MATCH (product:Product)
RETURN product.name,
       product.price,
       round(product.price * 1.08, 2) AS price_with_tax,
       floor(product.price) AS price_floor,
       ceil(product.price) AS price_ceil,
       abs(product.profit_margin) AS abs_margin,
       sqrt(product.variance) AS std_deviation,
       power(product.growth_rate, 12) AS annual_growth
```

### Temporal Functions

```gql
-- Date and time operations
MATCH (event:Event)
WHERE event.date >= date('2026-01-01')
  AND event.date < date('2026-02-01')
RETURN event.name,
       event.date,
       duration_between(event.start_time, event.end_time) AS event_duration,
       date_add(event.date, duration('P7D')) AS week_later,
       extract(month FROM event.date) AS event_month,
       extract(year FROM event.date) AS event_year,
       format_temporal(event.date, 'YYYY-MM-DD') AS formatted_date
```

### Aggregation Functions

```gql
-- Statistical aggregations
MATCH (product:Product)-[:IN_CATEGORY]->(category:Category)
RETURN category.name,
       COUNT(product) AS product_count,
       MIN(product.price) AS min_price,
       MAX(product.price) AS max_price,
       AVG(product.price) AS avg_price,
       SUM(product.inventory) AS total_inventory,
       STDDEV(product.price) AS price_stddev,
       VARIANCE(product.price) AS price_variance,
       PERCENTILE_CONT(product.price, 0.5) AS median_price,
       PERCENTILE_CONT(product.price, 0.95) AS p95_price
```

### Graph Functions

```gql
-- Graph-specific functions
MATCH path = (a:Person {name: 'Alice'})-[:KNOWS*1..5]-(b:Person {name: 'Bob'})
RETURN path,
       LENGTH(path) AS path_length,
       nodes(path) AS all_nodes,
       relationships(path) AS all_relationships,
       [n IN nodes(path) | n.name] AS node_names,
       [r IN relationships(path) | type(r)] AS relationship_types,
       SIZE(nodes(path)) AS node_count
```

## Error Handling in Queries

### COALESCE for Null Handling

```gql
-- Provide defaults for null values
MATCH (u:User)
RETURN u.name,
       COALESCE(u.middle_name, '') AS middle_name,
       COALESCE(u.phone, 'No phone') AS contact,
       COALESCE(u.age, 0) AS age
```

### CASE Expressions

```gql
-- Conditional logic
MATCH (product:Product)
RETURN product.name,
       product.inventory,
       CASE
           WHEN product.inventory = 0 THEN 'Out of Stock'
           WHEN product.inventory < 10 THEN 'Low Stock'
           WHEN product.inventory < 50 THEN 'In Stock'
           ELSE 'Well Stocked'
       END AS stock_status,
       CASE product.category
           WHEN 'Electronics' THEN product.price * 0.9
           WHEN 'Clothing' THEN product.price * 0.8
           ELSE product.price * 0.95
       END AS sale_price
```

### TRY-CATCH Pattern

```python
# Application-level error handling
async def safe_query_execution(client, query, params):
    """Execute query with comprehensive error handling."""
    try:
        result, _ = await client.query(query, params)
        return result
    except geode_client.ConstraintViolationError as e:
        logger.error(f"Constraint violation: {e}")
        # Handle uniqueness or other constraint issues
        return None
    except geode_client.QueryTimeoutError as e:
        logger.warning(f"Query timeout: {e}")
        # Potentially retry with increased timeout
        return None
    except geode_client.SyntaxError as e:
        logger.error(f"Invalid query syntax: {e}")
        # Fix query and retry
        return None
    except Exception as e:
        logger.exception(f"Unexpected error: {e}")
        raise
```

## Query Performance Patterns

### Batch Operations

```gql
-- Batch inserts for efficiency
UNWIND $users AS user_data
CREATE (u:User)
SET u = user_data

-- Batch updates
UNWIND $updates AS update
MATCH (u:User {id: update.id})
SET u.last_login = update.timestamp
```

### Pagination Strategies

**Offset-based pagination** (simple but slower for large offsets):
```gql
MATCH (p:Product)
RETURN p
ORDER BY p.created DESC
SKIP $offset
LIMIT $page_size
```

**Cursor-based pagination** (efficient for large datasets):
```gql
-- First page
MATCH (p:Product)
WHERE p.id > 0
RETURN p
ORDER BY p.id
LIMIT $page_size

-- Subsequent pages
MATCH (p:Product)
WHERE p.id > $last_seen_id
RETURN p
ORDER BY p.id
LIMIT $page_size
```

### Materialized Aggregates

```gql
-- Pre-compute expensive aggregates
MATCH (user:User)
WITH user,
     COUNT{(user)-[:POSTED]->()} AS post_count,
     COUNT{(user)<-[:FOLLOWS]-()} AS follower_count
SET user.cached_post_count = post_count,
    user.cached_follower_count = follower_count,
    user.cache_updated = current_timestamp()

-- Use cached values in queries
MATCH (u:User)
WHERE u.cached_follower_count > 1000
RETURN u.name, u.cached_follower_count
```

## Security Best Practices

### Parameterized Queries

**Never concatenate user input**:
```python
# WRONG - SQL injection vulnerable
user_input = request.args.get('email')
query = f"MATCH (u:User {{email: '{user_input}'}}) RETURN u"

# CORRECT - Parameterized
query = "MATCH (u:User {email: $email}) RETURN u"
result, _ = await client.query(query, {"email": user_input})
```

### Input Validation

```python
def validate_query_params(params: dict) -> dict:
    """Validate and sanitize query parameters."""
    validated = {}

    if 'email' in params:
        email = params['email']
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
            raise ValueError("Invalid email format")
        validated['email'] = email

    if 'age' in params:
        age = int(params['age'])
        if age < 0 or age > 150:
            raise ValueError("Invalid age")
        validated['age'] = age

    return validated
```

## Query Debugging Tools

### EXPLAIN Plans

```gql
-- View query execution plan
EXPLAIN
MATCH (u:User)-[:FRIEND]-(f:User)
WHERE u.city = 'NYC'
RETURN f.name

-- Example output:
-- NodeIndexSeek :User(city) (estimated rows: 1000)
--   Expand (u)-[:FRIEND]-(f)
--   Project f.name
```

### PROFILE for Actual Execution

```gql
-- Profile actual execution with real data
PROFILE
MATCH (u:User)-[:FRIEND]-(f:User)
WHERE u.city = 'NYC'
RETURN f.name

-- Shows actual row counts, execution time, memory usage
```

## Further Reading

- [GQL Tutorial](/docs/gql-tutorial/) - Step-by-step learning path
- [API Reference](/docs/api-reference/) - Complete function reference
- [Examples](/categories/examples/) - Real-world query examples
- [GQL Specification](/docs/gql-reference/specification/) - ISO standard details
- [Query Optimization Guide](/docs/query/performance-tuning/) - Performance tuning
- [Advanced Patterns](/docs/gql-reference/advanced-patterns/) - Complex query techniques
- [Function Reference](/docs/gql-reference/functions/) - Complete function catalog
- [Best Practices](/categories/best-practices/) - Query writing guidelines
