---
title: "GQL Reference Documentation"
description: "Complete GQL (Graph Query Language) reference for Geode: syntax, clauses, expressions, functions, and ISO/IEC 39075:2024 language specification."
keywords:
  - GQL reference
  - Graph Query Language
  - GQL documentation
  - GQL syntax
  - ISO GQL
  - query language
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/gql-reference/"
    noindex: false
---

Complete reference documentation for GQL (Graph Query Language), the ISO/IEC 39075:2024 standard language for graph databases. This guide covers all GQL syntax, clauses, expressions, functions, and advanced features as implemented in Geode.

## What is GQL?

GQL (Graph Query Language) is the ISO/IEC 39075:2024 international standard for querying property graph databases. It provides a declarative syntax for pattern matching, data manipulation, and graph traversal, similar to SQL for relational databases but optimized for highly connected data.

Key characteristics:
- **Declarative**: Describe what you want, not how to get it
- **Pattern-based**: Match graph patterns using visual ASCII art syntax
- **Composable**: Build complex queries from simple building blocks
- **Type-safe**: Strong typing with comprehensive type system
- **Standard**: ISO-standardized, vendor-neutral specification

## Query Structure

### Basic Query Pattern

```gql
MATCH pattern
WHERE conditions
RETURN expressions
ORDER BY sort_expressions
LIMIT row_count
```

### Complete Query Anatomy

```gql
// Graph pattern clause
MATCH (n:Label {property: value})-[r:TYPE]->(m)

// Optional patterns
OPTIONAL MATCH (n)-[:RELATED]->(opt)

// Filtering
WHERE n.age > 25 AND m.verified = true

// WITH clause for piping
WITH n, COUNT(m) AS connections
WHERE connections > 10

// Return results
RETURN n.name,
       connections,
       COLLECT(opt.name) AS related_items

// Post-processing
ORDER BY connections DESC
LIMIT 20
OFFSET 0
```

## Pattern Matching Syntax

### Node Patterns

```gql
// Anonymous node
()

// Named node variable
(n)

// Node with label
(n:User)

// Multiple labels
(n:User:Admin)

// Node with properties
(n:User {name: 'Alice', age: 30})

// Property pattern matching
(n:User) WHERE n.age > 25
```

### Relationship Patterns

```gql
// Undirected relationship
(a)-[]-(b)

// Directed relationship
(a)-->(b)
(a)<--(b)

// Named relationship
(a)-[r]->(b)

// Relationship with type
(a)-[r:KNOWS]->(b)

// Multiple relationship types
(a)-[r:KNOWS|FOLLOWS]->(b)

// Relationship with properties
(a)-[r:KNOWS {since: 2020}]->(b)

// Variable-length paths
(a)-[*]-(b)           // Any length
(a)-[*1..3]-(b)       // 1 to 3 hops
(a)-[*..5]-(b)        // Up to 5 hops
(a)-[*3..]-(b)        // 3 or more hops
```

### Path Patterns

```gql
// Named path
MATCH path = (a)-[:KNOWS*]->(b)
RETURN path

// Shortest path
MATCH path = SHORTEST (a)-[:KNOWS*]-(b)
WHERE a.name = 'Alice' AND b.name = 'Bob'
RETURN path

// All shortest paths
MATCH paths = ALL SHORTEST (a)-[:KNOWS*]-(b)
RETURN paths
```

## Data Manipulation Language (DML)

### CREATE

```gql
// Create nodes
CREATE (n:Label {property: value})

// Create relationships
MATCH (a:User {id: 1}), (b:User {id: 2})
CREATE (a)-[:KNOWS {since: 2024}]->(b)

// Create complex patterns
CREATE (a:User {name: 'Alice'})-[:POSTED]->(p:Post {title: 'Hello'}),
       (a)-[:FOLLOWS]->(b:User {name: 'Bob'})
```

### SET

```gql
// Set properties
MATCH (n:User {id: 1})
SET n.name = 'New Name',
    n.updated_at = NOW()

// Set all properties from map
MATCH (n:User {id: 1})
SET n = {name: 'Alice', age: 30}

// Add properties from map
MATCH (n:User {id: 1})
SET n += {city: 'NYC', verified: true}

// Add labels
MATCH (n:User {id: 1})
SET n:Admin:Verified
```

### DELETE

```gql
// Delete relationships
MATCH (a)-[r:KNOWS]->(b)
WHERE a.id = 1
DELETE r

// Delete nodes (must not have relationships)
MATCH (n:User {id: 1})
DELETE n

// Delete node and all relationships
MATCH (n:User {id: 1})
DETACH DELETE n

// Conditional delete
MATCH (n:TempData)
WHERE n.created_at < DATE('2024-01-01')
DETACH DELETE n
```

### MERGE

```gql
// Upsert pattern
MERGE (u:User {email: 'alice@example.com'})
ON CREATE SET u.created_at = NOW(), u.login_count = 1
ON MATCH SET u.last_login = NOW(), u.login_count = u.login_count + 1
RETURN u

// Merge relationships
MATCH (a:User {id: 1}), (b:User {id: 2})
MERGE (a)-[r:KNOWS]->(b)
ON CREATE SET r.since = NOW()
RETURN r
```

## Schema Definition Language (DDL)

### Indexes

```gql
// Create index
CREATE INDEX FOR (n:Label) ON (n.property)

// Named index
CREATE INDEX index_name FOR (n:Label) ON (n.property)

// Composite index
CREATE INDEX FOR (n:Label) ON (n.prop1, n.prop2, n.prop3)

// Index types
CREATE INDEX FOR (n:Label) ON (n.property)         // B-tree (default)
CREATE HASH INDEX FOR (n:Label) ON (n.property)    // Hash
CREATE TEXT INDEX FOR (n:Label) ON (n.property)    // Full-text
CREATE VECTOR INDEX FOR (n:Label) ON (n.embedding) // Vector similarity

// Drop index
DROP INDEX index_name
```

### Constraints

```gql
// Uniqueness
CREATE CONSTRAINT ON (n:Label) ASSERT n.property IS UNIQUE

// Existence
CREATE CONSTRAINT ON (n:Label) ASSERT EXISTS(n.property)

// Type constraint
CREATE CONSTRAINT ON (n:Label) ASSERT n.property IS :: TYPE

// Check constraint
CREATE CONSTRAINT ON (n:Label) ASSERT n.age >= 0 AND n.age <= 150

// Drop constraint
DROP CONSTRAINT constraint_name
```

## Expressions and Operators

### Comparison

```gql
=, <>, !=, <, >, <=, >=
IS NULL, IS NOT NULL
IN [list]
BETWEEN min AND max
STARTS WITH, ENDS WITH, CONTAINS
=~ (regex match)
```

### Logical

```gql
AND, OR, NOT, XOR
```

### Arithmetic

```gql
+, -, *, /, %, ^
```

### String

```gql
+ (concatenation)
|| (concatenation)
```

### List

```gql
[element1, element2, ...]    // Literal
list[index]                   // Access
list[start..end]             // Slice
IN list                       // Membership
+ (concatenation)
```

## Built-in Functions

### Aggregation

```gql
COUNT(*), COUNT(expr)
SUM(expr)
AVG(expr)
MIN(expr), MAX(expr)
COLLECT(expr)
STRING_AGG(expr, delimiter)
```

### String

```gql
UPPER(str), LOWER(str)
TRIM(str), LTRIM(str), RTRIM(str)
SUBSTRING(str, start, length)
LENGTH(str)
CONCAT(str1, str2, ...)
REPLACE(str, search, replace)
SPLIT(str, delimiter)
```

### Mathematical

```gql
ABS(num), CEIL(num), FLOOR(num), ROUND(num, precision)
SQRT(num), POWER(base, exponent)
SIN(num), COS(num), TAN(num)
LOG(num), LOG10(num), EXP(num)
RAND()
```

### Temporal

```gql
NOW(), CURRENT_TIMESTAMP, CURRENT_DATE, CURRENT_TIME
DATE(str), DATETIME(str), TIME(str)
DURATION(str)
```

### List

```gql
SIZE(list)
HEAD(list), LAST(list), TAIL(list)
REVERSE(list)
RANGE(start, end, step)
```

### Path

```gql
LENGTH(path)
NODES(path)
RELATIONSHIPS(path)
```

### Type Conversion

```gql
TOSTRING(val)
TOINTEGER(val)
TOFLOAT(val)
TOBOOLEAN(val)
```

## Advanced Features

### Subqueries

```gql
// EXISTS subquery
MATCH (u:User)
WHERE EXISTS {
  MATCH (u)-[:PURCHASED]->(p:Product)
  WHERE p.price > 1000
}
RETURN u

// COUNT subquery
MATCH (u:User)
RETURN u.name, COUNT {
  MATCH (u)-[:POSTED]->(p:Post)
  WHERE p.published = true
} AS post_count
```

### CASE Expressions

```gql
MATCH (u:User)
RETURN u.name,
  CASE
    WHEN u.age < 18 THEN 'minor'
    WHEN u.age < 65 THEN 'adult'
    ELSE 'senior'
  END AS age_group
```

### List Comprehensions

```gql
MATCH (u:User)
RETURN [tag IN u.tags WHERE LENGTH(tag) > 5] AS long_tags

RETURN [x IN RANGE(1, 10) | x * x] AS squares
```

### Pattern Comprehensions

```gql
MATCH (u:User)
RETURN u.name, [(u)-[:FRIEND]->(f) | f.name] AS friend_names
```

## Transaction Control

```gql
BEGIN TRANSACTION;
  // statements
COMMIT;

// Or rollback
ROLLBACK;

// Savepoints
BEGIN TRANSACTION;
  SAVEPOINT sp1;
  // statements
  ROLLBACK TO SAVEPOINT sp1;
COMMIT;
```

## Query Optimization

### EXPLAIN and PROFILE

```gql
// Show query plan
EXPLAIN MATCH (u:User)-[:KNOWS]->(f) RETURN u, f

// Show execution metrics
PROFILE MATCH (u:User)-[:KNOWS]->(f) RETURN u, f
```

## Best Practices

1. **Use Parameters**: Never concatenate user input into queries
2. **Create Indexes**: Index frequently queried properties
3. **Limit Results**: Always use LIMIT for exploratory queries
4. **Filter Early**: Apply WHERE clauses before expensive operations
5. **Use WITH**: Break complex queries into readable stages
6. **Avoid Cartesian Products**: Always connect patterns with relationships
7. **Profile Queries**: Use PROFILE to identify bottlenecks

## Related Topics

- **GQL Syntax**: Detailed syntax guide
- **GQL Operators**: Complete operator reference
- **GQL Functions**: Built-in function documentation
- **Data Types**: GQL type system
- **ISO Standard**: ISO/IEC 39075:2024 specification

## Further Reading

- [GQL Syntax Guide](/tags/gql-syntax/) - Detailed syntax documentation
- [GQL Operators](/tags/operators/) - Operator reference
- [Built-in Functions](/tags/functions/) - Function catalog
- [Data Types](/tags/types/) - Type system documentation
- [ISO/IEC 39075:2024](/tags/iso-standard/) - Official standard

## Advanced Pattern Techniques

### Conditional Pattern Matching

Use conditional logic within patterns for complex queries:

```gql
// Pattern with conditional relationship types
MATCH (user:User)-[r:FOLLOWS|SUBSCRIBES]->(target)
WHERE type(r) = 'FOLLOWS' AND r.since < date('2024-01-01')
   OR type(r) = 'SUBSCRIBES' AND r.tier = 'premium'
RETURN user.name, target.name, type(r) AS relationship_type;

// Multiple optional patterns with fallbacks
MATCH (product:Product)
OPTIONAL MATCH (product)<-[:REVIEWED]-(review)
WHERE review.rating >= 4
OPTIONAL MATCH (product)<-[:PURCHASED]-(buyer:User)
WHERE buyer.verified = true
RETURN product.name,
       COALESCE(avg(review.rating), 0) AS avg_rating,
       count(DISTINCT buyer) AS verified_purchases;
```

### Dynamic Pattern Construction

Build patterns dynamically based on input:

```gql
// Variable relationship depth based on parameter
MATCH path = (start:Node {id: $start_id})
            -[:CONNECTED*1..$max_hops]->(end:Node)
WHERE end.category IN $categories
RETURN path, length(path) AS hops
ORDER BY hops
LIMIT $result_limit;

// Label matching with pattern variables
MATCH (n)
WHERE any(label IN labels(n) WHERE label IN $allowed_labels)
AND n.status = 'active'
RETURN n;
```

### Recursive Patterns and CTEs

Common Table Expressions for complex hierarchies:

```gql
// WITH for pipeline processing
WITH ['root', 'admin', 'moderator'] AS privileged_roles
MATCH (u:User)
WHERE u.role IN privileged_roles
WITH u, SIZE((u)-[:MANAGES]->(:User)) AS direct_reports
WHERE direct_reports > 0
RETURN u.name, u.role, direct_reports
ORDER BY direct_reports DESC;

// Multiple WITH clauses for incremental filtering
MATCH (product:Product)
WITH product, SIZE((product)<-[:PURCHASED]-()) AS purchase_count
WHERE purchase_count > 100
WITH product, purchase_count,
     avg([(product)<-[r:REVIEWED]-() | r.rating]) AS avg_rating
WHERE avg_rating > 4.0
RETURN product.name, purchase_count, avg_rating
ORDER BY purchase_count * avg_rating DESC
LIMIT 20;
```

## Performance Optimization Strategies

### Index Selection and Hints

Guide the query planner with index hints:

```gql
// Force specific index usage
MATCH (u:User {email: $email})
USING INDEX user_email_idx
RETURN u;

// Composite index hint
MATCH (p:Product)
WHERE p.category = $category
AND p.price BETWEEN $min_price AND $max_price
USING INDEX product_category_price_idx
RETURN p.name, p.price
ORDER BY p.price;

// Scan hint for small result sets
MATCH (n:SmallTable)
USING SCAN
WHERE n.rare_property = $value
RETURN n;
```

### Query Plan Analysis

Understand and optimize execution plans:

```gql
// Detailed execution plan
EXPLAIN
MATCH (u:User)-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(similar:User)
WHERE u.id = $user_id
AND NOT (u)-[:PURCHASED]->(recommended:Product)<-[:PURCHASED]-(similar)
RETURN recommended.name, count(similar) AS similarity_score
ORDER BY similarity_score DESC
LIMIT 10;

// Runtime statistics
PROFILE
MATCH (u:User)-[:PURCHASED]->(p:Product)<-[:PURCHASED]-(similar:User)
WHERE u.id = $user_id
RETURN count(similar) AS connections;

// Expected plan output:
// Projection (estimated rows: 1000)
//   Aggregation (estimated rows: 1000)
//     Expand (estimated rows: 50000)
//       Expand (estimated rows: 1000)
//         IndexSeek (estimated rows: 1)
```

### Parallel Query Execution

Leverage parallel processing:

```gql
// Parallel batch processing
CALL {
  MATCH (u:User)
  WHERE u.status = 'pending'
  WITH u LIMIT 10000
  SET u.status = 'processing'
  RETURN count(u) AS processed
} IN TRANSACTIONS OF 1000 ROWS;

// Parallel aggregation
MATCH (event:Event)
WHERE event.timestamp >= $start_date
WITH event.type AS event_type, count(*) AS count
RETURN event_type, count
ORDER BY count DESC;
```

## Advanced Data Type Operations

### Working with Lists

Advanced list manipulation:

```gql
// List comprehension with filtering and mapping
MATCH (user:User)
RETURN user.name,
       [tag IN user.tags WHERE size(tag) > 3 | upper(tag)] AS formatted_tags,
       [x IN range(1, 10) WHERE x % 2 = 0 | x * x] AS even_squares;

// List reduction
MATCH path = (start)-[:CONNECTED*]-(end)
WHERE start.id = $start_id AND end.id = $end_id
WITH path,
     reduce(total = 0, rel IN relationships(path) | total + rel.weight) AS path_weight
RETURN path, path_weight
ORDER BY path_weight
LIMIT 1;

// List slicing and indexing
MATCH (article:Article)
RETURN article.title,
       article.tags[0..3] AS top_tags,
       article.tags[-1] AS last_tag,
       size(article.tags) AS tag_count;
```

### Map Operations

Working with map data types:

```gql
// Map construction
MATCH (user:User)
RETURN {
  id: user.id,
  name: user.name,
  profile: {
    email: user.email,
    verified: user.verified,
    created: user.created_at
  },
  stats: {
    login_count: user.login_count,
    last_login: user.last_login
  }
} AS user_object;

// Map merging
MATCH (product:Product)
SET product += {
  updated_at: datetime(),
  updated_by: $user_id
};

// Accessing nested map properties
MATCH (config:Config)
WHERE config.settings.notifications.email = true
RETURN config.settings;
```

### Temporal Operations

Advanced date and time manipulation:

```gql
// Date arithmetic and formatting
MATCH (subscription:Subscription)
WITH subscription,
     duration.between(subscription.start_date, date()) AS active_duration
WHERE active_duration > duration('P1Y')  // Active for more than 1 year
RETURN subscription.user_id,
       date.format(subscription.start_date, 'YYYY-MM-DD') AS start,
       duration.inDays(active_duration) AS days_active;

// Time zone conversions
MATCH (event:Event)
RETURN event.title,
       datetime.convert(event.timestamp, 'UTC', 'America/New_York') AS local_time;

// Temporal ranges
MATCH (session:Session)
WHERE session.start_time >= datetime('2025-01-01T00:00:00Z')
AND session.end_time < datetime('2025-02-01T00:00:00Z')
WITH session,
     duration.between(session.start_time, session.end_time) AS duration
RETURN date.truncate(session.start_time, 'day') AS day,
       avg(duration.inMinutes(duration)) AS avg_session_minutes
ORDER BY day;
```

## Error Handling and Validation

### Input Validation

Validate query inputs:

```gql
// Parameter validation
MATCH (user:User)
WHERE user.id = $user_id
WITH user
WHERE user IS NOT NULL  // Ensure user exists
AND user.status = 'active'
AND user.email =~ '^[\\w.-]+@[\\w.-]+\\.\\w+$'  // Email format
RETURN user;

// Type checking
MATCH (node)
WHERE id(node) = $node_id
WITH node
WHERE node:User OR node:Admin  // Ensure correct type
RETURN node;

// Constraint validation before update
MATCH (account:Account {id: $account_id})
WHERE account.balance >= $withdrawal_amount
SET account.balance = account.balance - $withdrawal_amount
RETURN account.balance;
```

### Error Recovery Patterns

Handle errors gracefully:

```gql
// OPTIONAL MATCH for nullable relationships
MATCH (user:User {id: $user_id})
OPTIONAL MATCH (user)-[:HAS_PROFILE]->(profile:Profile)
RETURN user.name,
       COALESCE(profile.bio, 'No profile') AS bio;

// CASE for conditional logic
MATCH (product:Product)
RETURN product.name,
       CASE
         WHEN product.stock > 100 THEN 'In Stock'
         WHEN product.stock > 0 THEN 'Low Stock'
         ELSE 'Out of Stock'
       END AS availability;

// TRY-CATCH pattern with EXISTS
MATCH (order:Order {id: $order_id})
WITH order,
     CASE
       WHEN EXISTS {
         MATCH (order)-[:CONTAINS]->(item:Item)
         WHERE item.available = false
       }
       THEN 'unavailable_items'
       ELSE 'ready'
     END AS order_status
RETURN order, order_status;
```

## Stored Procedures and User-Defined Functions

### Calling Built-in Procedures

```gql
// Database statistics
CALL dbms.info() YIELD name, value
RETURN name, value;

// Index management
CALL dbms.indexes.list() YIELD name, type, state
WHERE state = 'online'
RETURN name, type;

// Transaction monitoring
CALL dbms.transactions.list() YIELD transactionId, elapsedTime
WHERE elapsedTime > duration('PT30S')
RETURN transactionId, elapsedTime
ORDER BY elapsedTime DESC;
```

### Custom Aggregation Functions

```gql
// Custom aggregation with COLLECT and list operations
MATCH (user:User)-[:PURCHASED]->(product:Product)
WITH user,
     COLLECT(product.price) AS prices
RETURN user.name,
       reduce(sum = 0.0, price IN prices | sum + price) AS total_spent,
       reduce(count = 0, price IN prices | count + 1) AS purchase_count,
       reduce(sum = 0.0, price IN prices | sum + price) /
       reduce(count = 0, price IN prices | count + 1) AS avg_price;
```

## Integration with External Systems

### Parameterized Queries for APIs

```python
# REST API integration
from fastapi import FastAPI, HTTPException
from geode_client import GeodeClient

app = FastAPI()

@app.get("/api/users/{user_id}/recommendations")
async def get_recommendations(user_id: int, limit: int = 10):
    async with GeodeClient("localhost", 3141) as client:
        query = """
            MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)
                  <-[:PURCHASED]-(similar:User)-[:PURCHASED]->(rec:Product)
            WHERE NOT (u)-[:PURCHASED]->(rec)
            WITH rec, count(DISTINCT similar) AS score
            WHERE score >= 3
            RETURN rec.id,
                   rec.name,
                   rec.price,
                   score
            ORDER BY score DESC
            LIMIT $limit
        """

        result = await client.execute(query, {
            'user_id': user_id,
            'limit': limit
        })

        return {
            'user_id': user_id,
            'recommendations': [
                {
                    'id': row['rec.id'],
                    'name': row['rec.name'],
                    'price': row['rec.price'],
                    'score': row['score']
                }
                async for row in result
            ]
        }
```

### GraphQL Integration

```python
# GraphQL resolver with GQL backend
import strawberry
from typing import List

@strawberry.type
class User:
    id: int
    name: str
    email: str
    friends: List['User']

@strawberry.type
class Query:
    @strawberry.field
    async def user(self, id: int) -> User:
        async with GeodeClient("localhost", 3141) as client:
            result = await client.execute("""
                MATCH (u:User {id: $id})
                OPTIONAL MATCH (u)-[:FRIEND]->(f:User)
                RETURN u.id AS id,
                       u.name AS name,
                       u.email AS email,
                       COLLECT({
                           id: f.id,
                           name: f.name,
                           email: f.email
                       }) AS friends
            """, {'id': id})

            row = await result.fetch_one()
            if not row:
                raise ValueError(f"User {id} not found")

            return User(
                id=row['id'],
                name=row['name'],
                email=row['email'],
                friends=[
                    User(id=f['id'], name=f['name'], email=f['email'], friends=[])
                    for f in row['friends']
                    if f['id'] is not None
                ]
            )
```

## Troubleshooting Guide

### Common Query Errors

**Error: Syntax error near line X**
```gql
-- WRONG: Missing closing parenthesis
MATCH (u:User {id: 123}
RETURN u;

-- CORRECT:
MATCH (u:User {id: 123})
RETURN u;
```

**Error: Type mismatch**
```gql
-- WRONG: Comparing string to integer
MATCH (u:User)
WHERE u.age = '30'  -- age is INTEGER
RETURN u;

-- CORRECT:
MATCH (u:User)
WHERE u.age = 30
RETURN u;
```

**Error: Undefined variable**
```gql
-- WRONG: Using variable not in scope
MATCH (u:User)
WHERE friend.age > 25  -- friend not defined
RETURN u;

-- CORRECT:
MATCH (u:User)-[:FRIEND]->(friend:User)
WHERE friend.age > 25
RETURN u;
```

### Performance Troubleshooting

**Slow query diagnosis**:
```gql
-- Step 1: Check execution plan
EXPLAIN
[your query];

-- Step 2: Profile with metrics
PROFILE
[your query];

-- Step 3: Check index usage
CALL dbms.indexes.list() YIELD name, properties, state
RETURN name, properties, state;

-- Step 4: Add missing indexes
CREATE INDEX user_age_idx FOR (u:User) ON (u.age);
```

**Large result set issues**:
```gql
-- Add LIMIT to queries
MATCH (n:Node)
RETURN n
LIMIT 1000;  -- Prevent unbounded results

-- Use aggregation instead of collecting all rows
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN p.category, count(u) AS buyers
INSTEAD OF RETURN p, COLLECT(u);
```

This reference provides comprehensive documentation for writing GQL queries in Geode, from basic pattern matching to advanced features and optimization techniques.
