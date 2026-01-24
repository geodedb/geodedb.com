---
title: "Query Language and Execution"
description: "Explore Geode documentation tagged with query. Learn about query features, best practices, and implementation details."
keywords:
  - query
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/query/"
    noindex: false
---

# Query Language and Execution in Geode

Querying is the primary interface for interacting with graph databases. Geode implements the ISO/IEC 39075:2024 Graph Query Language (GQL) standard, providing a powerful, declarative language for pattern matching, traversals, aggregations, and data manipulation across graph structures.

## Introduction to Graph Querying

Graph queries differ fundamentally from SQL queries:

**SQL (Relational)**:
- Tables with rows and columns
- Joins explicitly specified
- Fixed schema required
- Path queries complex (recursive CTEs)

**GQL (Graph)**:
- Nodes and relationships as first-class citizens
- Relationships traversed naturally with pattern matching
- Flexible schema (property graph model)
- Path queries intuitive with variable-length patterns

Example comparison:
```sql
-- SQL: Find friends-of-friends (complex)
SELECT DISTINCT u3.name
FROM users u1
JOIN friendships f1 ON u1.id = f1.user_id
JOIN users u2 ON f1.friend_id = u2.id
JOIN friendships f2 ON u2.id = f2.user_id
JOIN users u3 ON f2.friend_id = u3.id
WHERE u1.name = 'Alice' AND u3.id != u1.id;
```

```gql
-- GQL: Same query (intuitive)
MATCH (u:User {name: 'Alice'})-[:FRIEND]->()-[:FRIEND]->(fof:User)
WHERE fof <> u
RETURN DISTINCT fof.name;
```

## GQL Query Structure

### Basic Pattern Matching

MATCH finds patterns in the graph:

```gql
-- Match nodes with label
MATCH (u:User)
RETURN u.name;

-- Match relationships
MATCH (u:User)-[:FRIEND]->(friend:User)
RETURN u.name, friend.name;

-- Match with properties
MATCH (p:Product {category: 'Electronics', available: true})
RETURN p.name, p.price;

-- Match with WHERE clause
MATCH (u:User)
WHERE u.age >= 18 AND u.country = 'USA'
RETURN u.name, u.email;
```

### Variable-Length Paths

Query paths of varying lengths:

```gql
-- Friends up to 3 hops away
MATCH (u:User {id: $user_id})-[:FRIEND*1..3]->(connection:User)
RETURN DISTINCT connection.name, length(path) AS hops;

-- All paths (use cautiously!)
MATCH path = (start:Node)-[:CONNECTED*]->(end:Node)
WHERE start.id = $start_id AND end.id = $end_id
RETURN path;

-- Shortest path
MATCH path = shortestPath((start:Node)-[:EDGE*]-(end:Node))
WHERE start.id = $start AND end.id = $end
RETURN path, length(path) AS distance;
```

### Data Manipulation

CREATE, UPDATE, DELETE operations:

```gql
-- Create nodes
CREATE (u:User {
    id: $id,
    name: $name,
    email: $email,
    created_at: timestamp()
});

-- Create relationships
MATCH (u:User {id: $user_id}), (p:Product {id: $product_id})
CREATE (u)-[:PURCHASED {
    timestamp: timestamp(),
    price: $price,
    quantity: $quantity
}]->(p);

-- Update properties
MATCH (u:User {id: $user_id})
SET u.last_login = timestamp(),
    u.login_count = u.login_count + 1;

-- Delete (node and relationships)
MATCH (u:User {id: $user_id})
DETACH DELETE u;  -- Deletes node and all its relationships
```

### Aggregations

Group and aggregate data:

```gql
-- Count by category
MATCH (p:Product)
RETURN p.category, count(p) AS product_count
ORDER BY product_count DESC;

-- Average, sum, min, max
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name,
       count(p) AS purchases,
       avg(p.price) AS avg_price,
       sum(p.price) AS total_spent,
       min(p.price) AS cheapest,
       max(p.price) AS most_expensive;

-- Collect into lists
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name, collect(p.name) AS purchased_products;
```

## Query Execution Process

Understanding how Geode executes queries helps write efficient queries:

### 1. Parsing

Query text parsed into Abstract Syntax Tree (AST):
```gql
MATCH (u:User {country: 'USA'})-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN u.name, p.name;
```

**Parsed structure**:
- MATCH clause: Pattern with node filters
- WHERE clause: Additional predicates
- RETURN clause: Projection

### 2. Planning

Optimizer generates execution plan:
```
EXPLAIN
MATCH (u:User {country: 'USA'})-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN u.name, p.name;

-- Plan:
Project(u.name, p.name)
  Filter(p.price > 100)
    Expand((User)-[:PURCHASED]->(Product))
      IndexSeek(User.country = 'USA')
```

### 3. Execution

Plan executed step-by-step:
1. IndexSeek: Find Users in USA (fast)
2. Expand: Follow PURCHASED relationships
3. Filter: Keep only products with price > 100
4. Project: Return requested properties

### 4. Result Streaming

Results streamed to client as they're produced (not buffered entirely).

## Common Query Patterns

### Pattern 1: Recommendation Engine

Collaborative filtering using graph traversals:

```gql
-- Find products bought by similar users
MATCH (me:User {id: $my_id})-[:PURCHASED]->(p:Product)
      <-[:PURCHASED]-(similar:User)-[:PURCHASED]->(recommendation:Product)
WHERE NOT (me)-[:PURCHASED]->(recommendation)
WITH recommendation, count(similar) AS similar_users
WHERE similar_users >= 3
RETURN recommendation.name,
       recommendation.price,
       similar_users
ORDER BY similar_users DESC
LIMIT 10;
```

### Pattern 2: Social Network Analysis

Find influential users (high centrality):

```gql
-- Count followers (in-degree centrality)
MATCH (u:User)<-[:FOLLOWS]-(follower)
WITH u, count(follower) AS follower_count
WHERE follower_count > 100
RETURN u.name, follower_count
ORDER BY follower_count DESC
LIMIT 50;

-- Find mutual connections
MATCH (me:User {id: $my_id})-[:FRIEND]-(mutual)-[:FRIEND]-(them:User {id: $their_id})
RETURN mutual.name, mutual.email;
```

### Pattern 3: Fraud Detection

Detect suspicious patterns:

```gql
-- Find accounts sharing devices but claiming to be different people
MATCH (u1:User)-[:LOGGED_IN_FROM]->(device:Device)<-[:LOGGED_IN_FROM]-(u2:User)
WHERE u1.id < u2.id
  AND u1.email <> u2.email
  AND u1.address = u2.address
RETURN u1.name, u2.name, device.fingerprint,
       count(*) AS shared_logins
ORDER BY shared_logins DESC;

-- Circular transfers (possible money laundering)
MATCH path = (a1:Account)-[:TRANSFER*4..6]->(a1)
WHERE reduce(total = 0, r IN relationships(path) | total + r.amount) > 10000
RETURN path, reduce(total = 0, r IN relationships(path) | total + r.amount) AS total_amount;
```

### Pattern 4: Knowledge Graph Queries

Semantic queries over structured knowledge:

```gql
-- Find entities related through multiple relationship types
MATCH (entity:Entity {name: 'Artificial Intelligence'})
      -[r:RELATED_TO|PART_OF|INFLUENCES*1..2]-(related:Entity)
RETURN related.name, collect(type(r)) AS relationship_types, count(r) AS connection_strength
ORDER BY connection_strength DESC
LIMIT 20;

-- Find experts on a topic
MATCH (topic:Topic {name: $topic_name})<-[:WROTE_ABOUT]-(article:Article)
      <-[:AUTHORED]-(author:Person)
WITH author, count(article) AS article_count
WHERE article_count >= 5
RETURN author.name, author.affiliation, article_count
ORDER BY article_count DESC;
```

## Query Optimization Tips

### Tip 1: Use Indexes

Create indexes on frequently filtered properties:

```gql
-- Without index: slow (full scan)
MATCH (u:User {email: 'alice@example.com'})
RETURN u;

-- Create index
CREATE INDEX user_email ON User(email);

-- With index: fast (logarithmic lookup)
MATCH (u:User {email: 'alice@example.com'})
RETURN u;
```

### Tip 2: Filter Early

Push filters as close to data source as possible:

```gql
-- BAD: Filter after expensive traversal
MATCH (u:User)-[:FRIEND*1..3]->(connection:User)
WHERE u.country = 'USA'
RETURN connection.name;

-- GOOD: Filter before traversal
MATCH (u:User {country: 'USA'})-[:FRIEND*1..3]->(connection:User)
RETURN connection.name;
```

### Tip 3: Limit Intermediate Results

Use LIMIT to bound explosion of intermediate results:

```gql
-- Potentially huge intermediate result
MATCH (u:User)-[:FRIEND]->(friend)
WITH friend
MATCH (friend)-[:LIKES]->(item)
RETURN item.name, count(friend) AS likes;

-- Bounded intermediate result
MATCH (u:User)-[:FRIEND]->(friend)
WITH friend
LIMIT 1000  -- Limit before expensive second traversal
MATCH (friend)-[:LIKES]->(item)
RETURN item.name, count(friend) AS likes;
```

### Tip 4: Use Parameters

Parameterized queries enable plan caching:

```gql
-- Plan cached and reused
MATCH (u:User {id: $user_id})
RETURN u;

-- Different plan for each query (slower)
MATCH (u:User {id: 123})
RETURN u;
```

## Client Libraries

### Python Client

```python
from geode_client import GeodeClient
import asyncio

async def query_example():
    async with GeodeClient("localhost", 3141) as client:
        # Simple query
        result = await client.execute("""
            MATCH (u:User)
            WHERE u.country = $country
            RETURN u.name, u.email
            ORDER BY u.name
            LIMIT 10
        """, {"country": "USA"})

        # Iterate results
        for row in result.bindings:
            print(f"{row['name']}: {row['email']}")

        # Transaction
        async with client.transaction():
            await client.execute("""
                CREATE (u:User {id: $id, name: $name})
            """, {"id": 123, "name": "Alice"})

            await client.execute("""
                MATCH (u:User {id: $id})
                SET u.verified = true
            """, {"id": 123})
            # Commits automatically on context exit

asyncio.run(query_example())
```

### Go Client

```go
import (
    "database/sql"
    _ "go.codepros.org/geode"
)

func queryExample() {
    db, err := sql.Open("geode", "geode://localhost:3141/mydb")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Parameterized query
    rows, err := db.Query(`
        MATCH (u:User)
        WHERE u.age >= $1
        RETURN u.name, u.age
        ORDER BY u.age DESC
    `, 18)
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
}
```

## Performance Considerations

**Query latency depends on**:
- Index utilization (indexed vs. full scan)
- Result cardinality (10 rows vs. 1M rows)
- Graph complexity (1 hop vs. 6 hops)
- Concurrent load (single query vs. 1000 QPS)

**Typical performance** (mid-range server):
- Indexed point lookup: <1ms
- Simple 1-2 hop traversal: 1-5ms
- Complex 3-4 hop pattern: 10-100ms
- Analytical aggregation: 100ms-10s

**Use PROFILE to measure**:
```gql
PROFILE
MATCH (u:User {id: $id})-[:FRIEND*1..2]->(connection)
RETURN connection.name;

-- Shows:
-- - Time per operation
-- - Rows processed
-- - Index usage
-- - Cache hits
```

## Related Topics

- **[GQL](/tags/gql/)**: GQL standard and syntax
- **[Query Optimization](/tags/query-optimization/)**: Deep dive into optimization
- **[Pattern Matching](/tags/pattern-matching/)**: Pattern matching techniques
- **[Performance](/tags/performance/)**: Performance tuning
- **[Indexing](/tags/indexing/)**: Index strategies
- **[Explain](/tags/explain/)**: Query plan analysis

## Further Reading

- **GQL Language Guide**: `/docs/gql/language-guide/`
- **Query Patterns**: `/docs/gql/query-patterns/`
- **Optimization Guide**: `/docs/performance/query-optimization/`
- **Client Libraries**: `/docs/client-libraries/overview/`
- **API Reference**: `/docs/api-reference/gql-syntax/`
## Advanced Query Optimization Techniques

### Query Plan Caching

Geode caches compiled query plans for repeated queries:

```python
from geode_client import GeodeClient
import asyncio

async def demonstrate_plan_caching():
    async with GeodeClient("localhost", 3141) as client:
        # Prepared statement - plan cached
        stmt = await client.prepare("""
            MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)
            WHERE p.price > $min_price
            RETURN p.name, p.price
            ORDER BY p.price DESC
        """)

        # Execute multiple times - uses cached plan
        for user_id in range(1, 1000):
            result = await stmt.execute(
                user_id=user_id,
                min_price=100.0
            )
            products = [row async for row in result]
            await process_products(products)

async def process_products(products):
    pass  # Process product list

asyncio.run(demonstrate_plan_caching())
```

### Adaptive Query Execution

Geode's optimizer adapts based on actual data distribution:

```gql
-- Initial execution: Optimizer estimates cardinality
MATCH (u:User)-[:FRIEND]->(f:User)
WHERE u.country = $country
RETURN count(f) AS friend_count;

-- After several executions with different countries:
-- Optimizer learns actual selectivity and adjusts plan
--
-- High selectivity country (few users):
--   Plan: IndexSeek -> Expand -> Count
--
-- Low selectivity country (many users):
--   Plan: IndexSeek -> Parallel Expand -> Parallel Count
```

### Join Order Optimization

Understanding join reordering for complex queries:

```gql
-- Original query
MATCH (u:User)-[:PURCHASED]->(p:Product)<-[:MANUFACTURED]-(m:Manufacturer)
WHERE u.country = 'USA'
AND m.certified = true
AND p.category = 'Electronics'
RETURN u.name, p.name, m.name;

-- Optimizer reorders to minimize intermediate results:
-- 1. Filter manufacturers (certified = true) - smallest set
-- 2. Expand to products in Electronics - medium set
-- 3. Expand to users in USA - largest set
--
-- Execution plan:
-- Project(u.name, p.name, m.name)
--   HashJoin(p)
--     HashJoin(p)
--       IndexSeek(Manufacturer.certified = true)
--       Expand(MANUFACTURED)
--         IndexSeek(Product.category = 'Electronics')
--     Expand(PURCHASED)
--       IndexSeek(User.country = 'USA')
```

### Materialized Views

Create pre-computed results for expensive queries:

```gql
-- Create materialized view
CREATE MATERIALIZED VIEW popular_products AS
MATCH (p:Product)<-[:PURCHASED]-(u:User)
WITH p, count(u) AS purchase_count
WHERE purchase_count > 100
RETURN p.id, p.name, p.category, purchase_count
ORDER BY purchase_count DESC;

-- Query uses materialized view (fast)
MATCH (p:PopularProduct)
WHERE p.category = 'Electronics'
RETURN p.name, p.purchase_count
LIMIT 10;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW popular_products;
```

## Query Complexity Analysis

### Computational Complexity

Understanding query complexity helps predict performance:

```gql
-- O(1) - Constant time: Direct node lookup by ID
MATCH (u:User)
WHERE id(u) = $id
RETURN u;

-- O(log n) - Logarithmic: Indexed property lookup
MATCH (u:User {email: $email})  -- Assumes index on email
RETURN u;

-- O(n) - Linear: Full table scan
MATCH (u:User)
WHERE u.age > 18
RETURN count(u);

-- O(n * m) - Quadratic: Cartesian product
MATCH (u:User), (p:Product)  -- No relationship filter!
RETURN u.name, p.name;  -- Danger: n * m rows

-- O(n^k) - Exponential: Variable-length paths
MATCH (u:User)-[:FRIEND*1..5]->(f:User)  -- Can explode
RETURN DISTINCT f.name;

-- O(n log n) - Linearithmic: Sort operation
MATCH (u:User)
RETURN u.name
ORDER BY u.created_at
```

### Query Cost Estimation

```python
# Estimate query cost before execution
from geode_client import GeodeClient

async def estimate_query_cost(query, params):
    async with GeodeClient("localhost", 3141) as client:
        # Get query plan
        plan = await client.explain(query, params)

        # Analyze estimated costs
        total_rows = plan.estimated_rows
        total_cost = plan.estimated_cost

        print(f"Estimated rows: {total_rows}")
        print(f"Estimated cost: {total_cost}")
        print(f"Plan operators: {len(plan.operators)}")

        if total_cost > 100000:
            print("WARNING: Expensive query detected")
            print("Consider adding indexes or rewriting")

        return plan
```

## Real-Time Query Monitoring

### Query Performance Tracking

```python
from prometheus_client import Histogram, Counter
import time

# Metrics
query_latency = Histogram(
    'geode_query_latency_seconds',
    'Query execution latency',
    ['query_type', 'cache_status'],
    buckets=[0.001, 0.01, 0.1, 1.0, 10.0]
)

query_total = Counter(
    'geode_queries_total',
    'Total number of queries',
    ['status']
)

async def monitored_query(client, query, params):
    start = time.time()
    cache_hit = False

    try:
        result = await client.execute(query, params)
        query_total.labels(status='success').inc()

        # Check if result came from cache
        if hasattr(result, 'from_cache'):
            cache_hit = result.from_cache

        rows = [row async for row in result]

        latency = time.time() - start
        query_latency.labels(
            query_type='read' if 'MATCH' in query else 'write',
            cache_status='hit' if cache_hit else 'miss'
        ).observe(latency)

        return rows

    except Exception as e:
        query_total.labels(status='error').inc()
        raise
```

### Slow Query Logging

```python
import logging
from functools import wraps

logger = logging.getLogger('geode.slow_queries')

def log_slow_queries(threshold_seconds=1.0):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start = time.time()
            result = await func(*args, **kwargs)
            duration = time.time() - start

            if duration > threshold_seconds:
                logger.warning(
                    f"Slow query detected: {duration:.2f}s\n"
                    f"Query: {kwargs.get('query', 'unknown')}\n"
                    f"Params: {kwargs.get('params', {})}"
                )

            return result
        return wrapper
    return decorator

@log_slow_queries(threshold_seconds=2.0)
async def execute_query(client, query, params):
    return await client.execute(query, params)
```

## Query Pattern Catalog

### Pattern: Pagination

```gql
-- Offset-based pagination (simple but slow for large offsets)
MATCH (p:Product)
WHERE p.available = true
RETURN p.id, p.name, p.price
ORDER BY p.created_at DESC
SKIP $offset
LIMIT $page_size;

-- Cursor-based pagination (fast and scalable)
MATCH (p:Product)
WHERE p.available = true
AND p.created_at < $cursor_timestamp
RETURN p.id, p.name, p.price, p.created_at
ORDER BY p.created_at DESC
LIMIT $page_size;

-- Keyset pagination (best for large datasets)
MATCH (p:Product)
WHERE p.available = true
AND (p.created_at < $cursor_date
     OR (p.created_at = $cursor_date AND p.id > $cursor_id))
RETURN p.id, p.name, p.price, p.created_at
ORDER BY p.created_at DESC, p.id
LIMIT $page_size;
```

### Pattern: Deduplication

```gql
-- Remove duplicates in results
MATCH (u:User)-[:FRIEND*1..2]->(connection:User)
WHERE u.id = $user_id
RETURN DISTINCT connection.id, connection.name;

-- Deduplicate using aggregation
MATCH (u:User)-[:LIKES]->(item:Item)
WITH item, collect(DISTINCT u.id) AS likers
RETURN item.name, size(likers) AS unique_likes;
```

### Pattern: Top-K with Aggregation

```gql
-- Find top 10 users by purchase amount
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH u, sum(p.price) AS total_spent
ORDER BY total_spent DESC
LIMIT 10
RETURN u.name, total_spent;

-- Top products per category
MATCH (p:Product)
WITH p.category AS category, p
ORDER BY p.sales DESC
WITH category, collect(p)[0..10] AS top_products
RETURN category, [p IN top_products | {name: p.name, sales: p.sales}];
```

### Pattern: Time-Based Windows

```gql
-- Aggregate data into time buckets
MATCH (event:Event)
WHERE event.timestamp >= datetime('2025-01-01T00:00:00Z')
WITH duration.truncate(event.timestamp, 'hour') AS hour,
     event.type AS event_type
RETURN hour,
       event_type,
       count(*) AS event_count
ORDER BY hour, event_type;

-- Rolling window aggregation
MATCH (metric:Metric)
WHERE metric.timestamp >= datetime() - duration('P1D')
WITH metric
ORDER BY metric.timestamp
WITH metric,
     avg(metric.value) OVER (
       ORDER BY metric.timestamp
       ROWS BETWEEN 11 PRECEDING AND CURRENT ROW
     ) AS moving_average
RETURN metric.timestamp, metric.value, moving_average;
```

## Troubleshooting Query Issues

### Issue: Cartesian Product

**Symptom**: Query returns millions of rows unexpectedly

```gql
-- PROBLEM: Accidental Cartesian product
MATCH (u:User), (p:Product)
WHERE u.country = 'USA'  -- Filters users but creates cross product
RETURN u.name, p.name;  -- Returns every user × every product

-- SOLUTION: Add relationship constraint
MATCH (u:User)-[:INTERESTED_IN]->(p:Product)
WHERE u.country = 'USA'
RETURN u.name, p.name;
```

### Issue: Unbounded Variable-Length Paths

**Symptom**: Query never completes

```gql
-- PROBLEM: Unbounded path traversal
MATCH (u:User {id: $id})-[:FRIEND*]->(f:User)
RETURN f.name;  -- May traverse entire graph!

-- SOLUTION: Add upper bound
MATCH (u:User {id: $id})-[:FRIEND*1..3]->(f:User)
RETURN DISTINCT f.name
LIMIT 100;  -- Also add result limit
```

### Issue: Missing Index

**Symptom**: Full table scan on large dataset

```gql
-- Check current indexes
CALL dbms.indexes.list() YIELD name, labels, properties
RETURN name, labels, properties;

-- Identify missing index from slow query
PROFILE
MATCH (u:User)
WHERE u.email = $email
RETURN u;
-- Shows: TableScan instead of IndexSeek

-- Create missing index
CREATE INDEX user_email_idx FOR (u:User) ON (u.email);

-- Verify index usage
EXPLAIN
MATCH (u:User)
WHERE u.email = $email
RETURN u;
-- Now shows: IndexSeek(user_email_idx)
```

### Issue: Lock Contention

**Symptom**: Transaction aborts with serialization errors

```python
# Solution: Implement retry with exponential backoff
import asyncio
import random

async def execute_with_retry(client, query, params, max_attempts=5):
    for attempt in range(max_attempts):
        try:
            async with client.transaction():
                result = await client.execute(query, params)
                return [row async for row in result]
        except SerializationError:
            if attempt == max_attempts - 1:
                raise

            # Exponential backoff with jitter
            delay = (2 ** attempt) * 0.1 * random.uniform(0.5, 1.5)
            await asyncio.sleep(delay)
```
