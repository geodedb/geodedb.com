---
title: "Query Optimization"
description: "Explore Geode documentation tagged with optimization. Learn about optimization features, best practices, and implementation details."
keywords:
  - optimization
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/optimization/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Query Optimization in Geode

Query optimization is the process of analyzing and transforming database queries to execute them as efficiently as possible. In graph databases like Geode, optimization is particularly challenging due to the variable and unpredictable nature of graph traversals. Effective optimization can mean the difference between queries completing in milliseconds versus timing out after minutes.

## Introduction to Query Optimization

Query optimization operates on multiple levels:

1. **Logical Optimization**: Rewriting queries to equivalent but more efficient forms
2. **Physical Optimization**: Choosing the best execution strategy (indexes, join algorithms)
3. **Cost-Based Optimization**: Estimating execution costs and selecting minimum-cost plans
4. **Runtime Optimization**: Adapting execution based on intermediate results

For graph queries, additional challenges include:

- Highly variable result cardinalities from relationship traversals
- Complex pattern matching with multiple possible start points
- Trade-offs between depth-first and breadth-first traversal strategies
- Balancing memory usage against computation time

## Geode's Query Optimizer

Geode implements a sophisticated cost-based optimizer that analyzes GQL queries through several stages:

### Query Parsing and Analysis

The optimizer first parses the GQL query into an abstract syntax tree (AST) and performs semantic analysis:

```gql
-- Original query
MATCH (u:User {country: 'USA'})-[:PURCHASED]->(p:Product)
WHERE p.price > 100 AND p.category = 'Electronics'
RETURN u.name, p.name
ORDER BY p.price DESC;
```

**Parsed structure**:

1. MATCH clause with pattern and filters
2. WHERE clause with additional predicates
3. RETURN clause specifying projections
4. ORDER BY clause with sorting

### Logical Query Rewriting

The optimizer applies transformation rules to create equivalent but more efficient logical plans:

**Predicate Pushdown**:

```gql
-- Before: Filter after traversal
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.country = 'USA' AND p.price > 100
RETURN u.name, p.name;

-- After: Filter before traversal (implicit transformation)
MATCH (u:User {country: 'USA'})-[:PURCHASED]->(p:Product {price > 100})
RETURN u.name, p.name;
```

**Join Reordering**:

```gql
-- Optimizer evaluates multiple join orders:
-- Option 1: Start from User, expand to Product
-- Option 2: Start from Product, expand to User
-- Chooses based on selectivity and cardinality estimates
```

**Subquery Elimination**:

```gql
-- Before: Correlated subquery
MATCH (u:User)
WHERE EXISTS {
    MATCH (u)-[:PURCHASED]->(p:Product {category: 'Electronics'})
}
RETURN u.name;

-- After: Joined pattern (more efficient)
MATCH (u:User)-[:PURCHASED]->(:Product {category: 'Electronics'})
RETURN DISTINCT u.name;
```

### Physical Plan Generation

The optimizer generates concrete execution strategies:

**Index Selection**:

```gql
-- Query with multiple index opportunities
MATCH (u:User {email: $email})-[:FRIEND]->(f:User {country: 'USA'})
RETURN f.name;

-- Optimizer chooses:
-- 1. IndexSeek on User.email (high selectivity, unique)
-- 2. Then filter country during traversal
-- Rather than scanning all USA users first
```

**Access Methods**:

- **Index Seek**: Direct lookup by key (O(log n))
- **Index Scan**: Range scan over sorted index
- **Label Scan**: All nodes with specific label
- **Full Scan**: All nodes (last resort)

**Join Algorithms**:

- **Nested Loop**: For small inner sets
- **Hash Join**: For equi-joins with moderate cardinality
- **Expand**: Following relationship pointers (graph-specific)

## Using EXPLAIN for Query Analysis

EXPLAIN shows the query plan without executing it:

```gql
EXPLAIN
MATCH (u:User)-[:FOLLOWS*1..3]->(influencer:User)
WHERE u.id = $user_id AND influencer.follower_count > 10000
RETURN influencer.name, influencer.follower_count
ORDER BY influencer.follower_count DESC
LIMIT 10;
```

**Sample output**:

```
Limit(10)
  Sort(influencer.follower_count DESC)
    Filter(influencer.follower_count > 10000)
      VariableLengthExpand([:FOLLOWS*1..3])
        IndexSeek(User.id = $user_id)

Estimated rows: 10
Estimated cost: 2,450
```

**Interpreting the plan**:

- **Bottom-up execution**: Read from bottom (IndexSeek) to top (Limit)
- **Indentation**: Shows nesting/pipeline structure
- **Estimated rows**: Expected result cardinality at each stage
- **Cost**: Relative execution cost (higher = more expensive)

### Common Plan Patterns

**Efficient Plan (Good)**:

```
Project(u.name, p.name)
  Expand((User)-[:PURCHASED]->(Product))
    IndexSeek(User.country = 'USA')

Cost: 150, Rows: 1,234
```

**Inefficient Plan (Bad)**:

```
Filter(u.country = 'USA')
  CartesianProduct
    NodeScan(User)
    NodeScan(Product)

Cost: 45,000, Rows: 1,234
```

## Optimization Techniques

### Technique 1: Strategic Index Placement

**Identify frequently filtered properties**:

```python
# Analyze query logs
async def analyze_query_patterns(log_file):
    from collections import Counter
    property_filters = Counter()

    for query in parse_logs(log_file):
        for prop in extract_filtered_properties(query):
            property_filters[prop] += 1

    # Create indexes for top properties
    for prop, count in property_filters.most_common(10):
        print(f"CREATE INDEX ON {prop.label}({prop.name});")
```

**Composite indexes for multi-property filters**:

```gql
-- If you frequently filter by both category AND price:
CREATE INDEX product_cat_price ON Product(category, price);

-- This query uses the composite index efficiently:
MATCH (p:Product {category: 'Electronics'})
WHERE p.price BETWEEN 100 AND 500
RETURN p;
```

### Technique 2: Cardinality-Aware Query Writing

Start from the most selective (smallest result set) patterns:

```gql
-- BAD: Starts from high-cardinality pattern
MATCH (p:Product)-[:MANUFACTURED_BY]->(company:Company)
WHERE company.name = 'TechCorp'
RETURN p.name;
-- Scans all Products, filters later

-- GOOD: Starts from selective filter
MATCH (company:Company {name: 'TechCorp'})-[:MANUFACTURES]->(p:Product)
RETURN p.name;
-- Single Company lookup, then expand
```

**With multiple filters**:

```gql
-- Analyze cardinality first:
MATCH (u:User) RETURN count(*);  -- 1,000,000 users
MATCH (u:User {country: 'Luxembourg'}) RETURN count(*);  -- 500 users
MATCH (u:User {age: 25}) RETURN count(*);  -- 40,000 users

-- Start from most selective (country):
MATCH (u:User {country: 'Luxembourg'})
WHERE u.age = 25
RETURN u;
```

### Technique 3: Variable-Length Path Optimization

Variable-length paths can be expensive; optimize carefully:

```gql
-- EXPENSIVE: Unbounded path
MATCH (u:User)-[:FRIEND*]->(friend)
WHERE u.id = $user_id
RETURN friend.name;
-- May explore millions of paths!

-- BETTER: Limit maximum depth
MATCH (u:User)-[:FRIEND*1..3]->(friend)
WHERE u.id = $user_id
RETURN DISTINCT friend.name;
-- Bounded exploration

-- BEST: Use the built-in traversal procedure
MATCH (u:User {id: $user_id})
CALL algo.bfs.stream(u, {maxDepth: 3}) YIELD path
UNWIND path AS friend_id
MATCH (friend) WHERE id(friend) = friend_id
RETURN DISTINCT friend.name;
-- algo.bfs.stream yields `path` as a LIST of node ids and traverses every
-- relationship type; it takes no relationship-type filter.
```

### Technique 4: Aggregation Optimization

**Push aggregation down**:

```gql
-- INEFFICIENT: Materialize all, then count
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH u, collect(p) AS products
RETURN u.name, size(products) AS purchase_count;

-- EFFICIENT: Count during traversal
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name, count(p) AS purchase_count;
```

**Use GROUP BY strategically**:

```gql
-- Complex aggregation with filtering
MATCH (u:User)-[:PURCHASED]->(p:Product)-[:IN_CATEGORY]->(c:Category)
WHERE p.price > 50
WITH c.name AS category, count(DISTINCT u) AS buyer_count
WHERE buyer_count > 100
RETURN category, buyer_count
ORDER BY buyer_count DESC;
```

### Technique 5: Materialized Views (Precomputed Results)

For expensive repeated queries, precompute and store results:

```gql
-- Expensive query: User's recommendation score
MATCH (u:User)-[:PURCHASED]->(p1:Product)<-[:PURCHASED]-(other:User)
      -[:PURCHASED]->(p2:Product)
WHERE NOT (u)-[:PURCHASED]->(p2)
RETURN u.id, p2.id, count(other) AS score
ORDER BY score DESC;

-- Instead, periodically compute and store:
MATCH (u:User)-[:PURCHASED]->(p1:Product)<-[:PURCHASED]-(other:User)
      -[:PURCHASED]->(p2:Product)
WHERE NOT (u)-[:PURCHASED]->(p2)
WITH u, p2, count(other) AS score
CREATE (u)-[:RECOMMENDATION_SCORE {score: score, computed_at: timestamp()}]->(p2);

-- Then query is fast:
MATCH (u:User {id: $user_id})-[r:RECOMMENDATION_SCORE]->(p:Product)
RETURN p.name, r.score
ORDER BY r.score DESC
LIMIT 10;
```

## Advanced Optimization Strategies

### Query Parameterization

Parameterized queries enable plan caching:

```python
# BAD: String concatenation prevents plan reuse
async def get_user(user_id):
    query = f"MATCH (u:User {{id: '{user_id}'}}) RETURN u"
    result, _ = await client.query(query)
    return result

# GOOD: Parameters enable plan caching
async def get_user(user_id):
    query = "MATCH (u:User {id: $user_id}) RETURN u"
    result, _ = await client.query(query, {"user_id": user_id})
    return result
```

### Batch Processing

Process multiple items in single query:

```gql
-- Instead of N queries:
-- MATCH (u:User {id: 1}) RETURN u;
-- MATCH (u:User {id: 2}) RETURN u;
-- ... (repeated 1000 times)

-- Single batched query:
UNWIND $user_ids AS uid
MATCH (u:User {id: uid})
RETURN u;
```

### Subquery Optimization

Use OPTIONAL MATCH carefully:

```gql
-- EXPENSIVE: Optional match multiplies cardinality
MATCH (u:User)
OPTIONAL MATCH (u)-[:PURCHASED]->(p:Product)
OPTIONAL MATCH (u)-[:REVIEWED]->(r:Review)
RETURN u, collect(p), collect(r);
-- Creates cartesian product of purchases × reviews!

-- BETTER: Separate aggregations
MATCH (u:User)
OPTIONAL MATCH (u)-[:PURCHASED]->(p:Product)
WITH u, collect(p) AS purchases
OPTIONAL MATCH (u)-[:REVIEWED]->(r:Review)
RETURN u, purchases, collect(r) AS reviews;
```

## Performance Monitoring

### Using PROFILE for Runtime Analysis

PROFILE executes and measures the query:

```gql
PROFILE
MATCH (u:User {country: 'USA'})-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN u.name, count(p) AS purchase_count
ORDER BY purchase_count DESC
LIMIT 10;
```

**Output with timings**:

```
Limit(10) - 0.05ms, 10 rows
  Sort(purchase_count DESC) - 2.3ms, 1,234 rows
    Aggregate(count(p) GROUP BY u) - 8.7ms, 1,234 rows
      Filter(p.price > 100) - 15.2ms, 5,678 rows
        Expand((User)-[:PURCHASED]->(Product)) - 45.3ms, 23,456 rows
          IndexSeek(User.country = 'USA') - 1.2ms, 10,234 rows

Total: 72.8ms
Cache hits: 85%
Disk I/O: 234 pages
```

**What to look for**:

- **Time hotspots**: Operations taking >50% of total time
- **Cardinality explosion**: Row count increasing dramatically
- **Cache miss rate**: High disk I/O indicates insufficient memory
- **Redundant work**: Same subquery executed multiple times

### Comparing Alternative Queries

```python
import asyncio
from geode_client import Client

async def benchmark_queries():
    queries = [
        ("Option 1: Index first", """
            MATCH (u:User {email: $email})-[:PURCHASED]->(p:Product)
            RETURN p.name
        """),
        ("Option 2: Label scan first", """
            MATCH (u:User)-[:PURCHASED]->(p:Product)
            WHERE u.email = $email
            RETURN p.name
        """),
    ]

    client = Client(host="localhost", port=3141)

    async with client.connection() as conn:
        for name, query in queries:
            start = time.time()
            result, _ = await conn.query(query, {"email": "user@example.com"})
            elapsed = time.time() - start
            print(f"{name}: {elapsed*1000:.2f}ms")
```

## Troubleshooting Query Performance

### Problem: Query Times Out

**Diagnosis**:

```gql
EXPLAIN [your query]
```

Look for:

- NodeScan/LabelScan instead of IndexSeek
- High estimated row counts (>100K)
- Cartesian products
- Unbounded variable-length paths

**Solutions**:

1. Add missing indexes
2. Add LIMIT clauses to bound intermediate results
3. Rewrite to start from more selective patterns
4. Break into multiple smaller queries

### Problem: Query Uses Wrong Index

**Force specific index** (if optimizer chooses poorly):

```gql
-- Hint to use specific index
MATCH (u:User)
USING INDEX u:User(email)
WHERE u.email = $email AND u.country = 'USA'
RETURN u;
```

### Problem: Plan Changes with Different Parameters

**Enable plan stability**:

```gql
-- Query with stable plan regardless of parameters
MATCH (u:User)
WHERE u.country = $country
WITH u
LIMIT 10000  -- Bound worst-case
MATCH (u)-[:PURCHASED]->(p:Product)
RETURN u.name, p.name;
```

## Best Practices Summary

1. **Always use EXPLAIN** during development
2. **Create indexes** on frequently filtered properties
3. **Start queries** from most selective patterns
4. **Bound variable-length paths** with maximum depth
5. **Use parameters** instead of string concatenation
6. **Batch operations** when processing multiple items
7. **Monitor with PROFILE** in production
8. **Cache expensive computations** as materialized views
9. **Limit intermediate results** with strategic LIMIT clauses
10. **Test with production data sizes** (dev data often misleads)

## Query Plan Caching

Geode caches query execution plans to avoid repeated parsing and planning overhead:

### Plan Cache Behavior

```gql
-- First execution: Parse, plan, execute (20ms)
MATCH (u:User {email: $email}) RETURN u;

-- Subsequent executions with different parameters: Execute only (2ms)
MATCH (u:User {email: $different_email}) RETURN u;
```

The query structure is the same, so Geode reuses the cached plan. Only parameter values change.

### Cache Invalidation

Plans are invalidated when schema changes occur:

```gql
-- This invalidates cached plans involving User.email
CREATE INDEX ON User(email);

-- This invalidates plans for Product nodes
ALTER TABLE Product ADD PROPERTY discount FLOAT;

-- Statistics updates trigger re-planning
-- Geode has no ANALYZE / VACUUM / REINDEX. Statistics are maintained by
-- the engine, freed pages are reused automatically, and an index is
-- rebuilt by dropping and recreating it.
```

### Monitoring Cache Effectiveness

```python
# Check plan cache hit rate
async def monitor_plan_cache(client):
    # The plan cache publishes no statistics (`system.*` is not a Geode
    # namespace). Measure the effect end-to-end instead: run the statement
    # twice and compare the execution time PROFILE reports.
    first, _ = await client.query("PROFILE MATCH (u:User) RETURN count(u)")
    second, _ = await client.query("PROFILE MATCH (u:User) RETURN count(u)")
    print(f"cold={first.execution_time_ms}ms warm={second.execution_time_ms}ms")

    if stats['hit_rate'] < 0.80:
        print("Warning: Low plan cache hit rate")
        print("Consider using parameterized queries")
```

## Advanced Optimization Patterns

### Query Hints

Sometimes you know better than the optimizer:

```gql
-- Force specific index usage
MATCH (u:User)
USING INDEX u:User(email)
WHERE u.email = $email AND u.country = 'USA'
RETURN u;

-- Disable specific optimization
MATCH (a:User)-[:KNOWS]->(b:User)
WHERE a.country = b.country
RETURN a, b;

-- Force join order
MATCH (small:Product {category: 'Rare'}),
      (large:User)
WHERE (large)-[:PURCHASED]->(small)
RETURN large, small;
```

### Lateral Subqueries

Process correlated data efficiently:

```gql
-- For each user, get their top 3 purchases
MATCH (u:User)
LATERAL {
    MATCH (u)-[:PURCHASED]->(p:Product)
    RETURN p
    ORDER BY p.price DESC
    LIMIT 3
} AS top_purchases
RETURN u.name, top_purchases;
```

This is more efficient than collecting all purchases and filtering in application code.

### Parallel Query Execution

For independent subqueries, use UNION ALL with parallel execution:

```gql
-- These execute in parallel
MATCH (u:User {country: 'USA'})
RETURN u.name, 'USA' AS region
UNION ALL
MATCH (u:User {country: 'Canada'})
RETURN u.name, 'Canada' AS region
UNION ALL
MATCH (u:User {country: 'Mexico'})
RETURN u.name, 'Mexico' AS region;
```

### Query Decomposition

Break complex queries into steps with WITH clauses:

```gql
-- Step 1: Find high-value customers
MATCH (u:User)-[p:PURCHASED]->(prod:Product)
WITH u, SUM(prod.price) AS total_spent
WHERE total_spent > 1000
WITH u

-- Step 2: Find their referrals
MATCH (u)-[:REFERRED]->(referee:User)
WITH u, COUNT(referee) AS referral_count

-- Step 3: Calculate score
RETURN u.name, referral_count, referral_count * 100 AS influence_score
ORDER BY influence_score DESC;
```

Each step can be optimized independently.

## Optimization for Specific Patterns

### Graph Traversal Optimization

**Bi-directional Search**: For shortest path queries:

```gql
-- Geode automatically uses bi-directional search
MATCH path = SHORTEST_PATH((a:User {id: 1})-[:KNOWS*]-(b:User {id: 999}))
RETURN length(path);
```

This searches from both ends simultaneously, meeting in the middle.

**Pruning**: Stop traversal early when possible:

```gql
-- Find users within 3 hops OR until 100 users found
MATCH (start:User {id: $start_id})-[:KNOWS*1..3]->(connected:User)
RETURN DISTINCT connected
LIMIT 100;
```

The LIMIT causes traversal to stop after finding 100 users, even if depth < 3.

### Aggregation Optimization

**Partial Aggregation**: Pre-aggregate at lower levels:

```gql
-- Optimize hierarchical aggregation
MATCH (country:Country)<-[:LOCATED_IN]-(city:City)<-[:IN]-(user:User)
WITH country, city, COUNT(user) AS city_users
WITH country, SUM(city_users) AS total_users
RETURN country.name, total_users;
```

Aggregating by city first reduces intermediate data size.

**Streaming Aggregation**: For large result sets:

```python
# Process aggregations in streaming fashion
async def streaming_aggregation(client):
    query = """
        MATCH (u:User)-[:PURCHASED]->(p:Product)
        RETURN p.category, COUNT(*) AS purchases
        GROUP BY p.category
    """

    for row in client.rows.execute_streaming(query):
        category = row['p.category']
        purchases = row['purchases']
        # Process incrementally without loading all into memory
        await process_category_stats(category, purchases)
```

### Write Optimization

**Bulk Inserts**: Batch multiple writes:

```gql
-- Instead of 1000 individual inserts
UNWIND $user_list AS user_data
CREATE (u:User)
SET u = user_data;
```

This is more efficient than individual CREATE statements.

**Deferred Index Updates**: For bulk operations:

```gql
-- Disable index temporarily for bulk load
ALTER INDEX user_email_idx DISABLE;

-- Bulk insert
LOAD CSV FROM 'users.csv' AS row
CREATE (u:User {email: row.email, name: row.name});

-- Rebuild index once
ALTER INDEX user_email_idx ENABLE;
REBUILD INDEX user_email_idx;
```

## Real-World Optimization Case Studies

### Case Study 1: E-Commerce Recommendation Engine

**Problem**: Recommendation query taking 45 seconds.

```gql
-- Original slow query
MATCH (user:User {id: $user_id})-[:PURCHASED]->(p1:Product)
      <-[:PURCHASED]-(other:User)-[:PURCHASED]->(p2:Product)
WHERE NOT (user)-[:PURCHASED]->(p2)
RETURN p2.name, COUNT(*) AS score
ORDER BY score DESC
LIMIT 10;
```

**Optimization Steps**:

1. Add indexes:

```gql
CREATE INDEX ON User(id);
CREATE INDEX ON Product(id);
```

2. Limit intermediate results:

```gql
MATCH (user:User {id: $user_id})-[:PURCHASED]->(p1:Product)
      <-[:PURCHASED]-(other:User)
WITH other
LIMIT 100  -- Only consider top 100 similar users
MATCH (other)-[:PURCHASED]->(p2:Product)
WHERE NOT (user)-[:PURCHASED]->(p2)
RETURN p2.name, COUNT(*) AS score
ORDER BY score DESC
LIMIT 10;
```

3. Materialize frequently accessed data:

```gql
-- Pre-compute recommendations nightly
MATCH (user:User)-[:PURCHASED]->(p1:Product)
      <-[:PURCHASED]-(other:User)-[:PURCHASED]->(p2:Product)
WHERE NOT (user)-[:PURCHASED]->(p2)
WITH user, p2, COUNT(*) AS score
ORDER BY score DESC
WITH user, COLLECT({product: p2, score: score})[0..50] AS recommendations
SET user.recommendations = recommendations;

-- Fast query at runtime
MATCH (user:User {id: $user_id})
RETURN user.recommendations;
```

**Result**: Query time reduced from 45s to 8ms (5,625x faster).

### Case Study 2: Social Network Friend Suggestions

**Problem**: Finding friend suggestions consuming excessive memory.

```gql
-- Original memory-intensive query
MATCH (user:User {id: $user_id})-[:FRIENDS]->(friend)-[:FRIENDS]->(fof:User)
WHERE NOT (user)-[:FRIENDS]->(fof) AND user <> fof
WITH user, fof, COUNT(*) AS mutual_friends
ORDER BY mutual_friends DESC
RETURN fof.name, mutual_friends
LIMIT 20;
```

**Optimization**:

```gql
-- Stream results, don't collect all
MATCH (user:User {id: $user_id})-[:FRIENDS]->(friend)
WITH user, friend
LIMIT 50  -- Bound friend traversal

MATCH (friend)-[:FRIENDS]->(fof:User)
WHERE NOT (user)-[:FRIENDS]->(fof) AND user <> fof
WITH user, fof, COUNT(*) AS mutual_friends
ORDER BY mutual_friends DESC
LIMIT 20
RETURN fof.name, mutual_friends;
```

**Result**: Memory usage reduced from 2GB to 50MB.

### Case Study 3: Fraud Detection Pattern Matching

**Problem**: Detecting circular payment patterns timing out.

**Optimization**: Use specialized graph algorithms:

```gql
-- There is no cycle-detection procedure; express the cycle as a pattern and
-- let the planner bound it with the path length and the WHERE clause.
MATCH cycle = (a:Account)-[:PAYMENT*1..5]->(a)
WHERE all(r IN relationships(cycle) WHERE r.amount > 1000)
RETURN cycle;
```

Specialized algorithms are more efficient than generic pattern matching for specific graph problems.

## Optimization Tooling

### Query Performance Dashboard

```python
# Automated query performance tracking
import asyncio
from collections import defaultdict

class QueryPerformanceMonitor:
    def __init__(self, client):
        self.client = client
        self.metrics = defaultdict(list)

    async def execute_tracked(self, query, params=None):
        start = time.time()
        result, _ = await self.client.query(query, params)
        duration = time.time() - start

        # Track query performance
        query_hash = hashlib.md5(query.encode()).hexdigest()[:8]
        self.metrics[query_hash].append({
            'duration': duration,
            'timestamp': time.time(),
            'row_count': len(result.rows)
        })

        # Alert on slow queries
        if duration > 1.0:
            print(f"SLOW QUERY ({duration:.2f}s): {query[:100]}...")

        return result

    def get_slowest_queries(self, n=10):
        query_stats = {}
        for query_hash, executions in self.metrics.items():
            avg_duration = sum(e['duration'] for e in executions) / len(executions)
            query_stats[query_hash] = {
                'avg_duration': avg_duration,
                'execution_count': len(executions),
                'total_time': sum(e['duration'] for e in executions)
            }

        return sorted(query_stats.items(),
                     key=lambda x: x[1]['avg_duration'],
                     reverse=True)[:n]
```

### Automated Index Recommendations

```python
async def recommend_indexes(client, query_log_file):
    """Analyze query log and recommend indexes"""
    from collections import Counter

    property_access = Counter()

    # Parse query log
    for query in parse_query_log(query_log_file):
        # Extract filtered properties
        for prop in extract_property_filters(query):
            property_access[prop] += 1

    # Generate recommendations
    recommendations = []
    for (label, property), count in property_access.most_common(20):
        # Check if index exists
        existing, _ = await client.query(
            "SHOW INDEXES WHERE label = $label AND property = $prop",
            label=label, prop=property
        )

        if not existing.rows:
            recommendations.append({
                'label': label,
                'property': property,
                'access_count': count,
                'create_ddl': f"CREATE INDEX ON {label}({property});"
            })

    return recommendations
```

## Related Topics

- **[Performance](/tags/performance/)**: General performance optimization
- **[Indexing](/tags/indexing/)**: Index types and strategies
- **[Query Language](/tags/query-language/)**: GQL syntax and patterns
- **[Profiling](/tags/profiling/)**: Detailed profiling techniques
- **[Tuning](/tags/tuning/)**: Database tuning parameters
- **[Explain](/tags/explain/)**: EXPLAIN command reference

## Further Reading

- **Query Optimization Guide**: `/docs/performance/query-optimization/`
- **Index Selection Best Practices**: `/docs/indexing/choosing-indexes/`
- **GQL Query Patterns**: `/docs/gql/query-patterns/`
- **Performance Tuning**: `/docs/performance/tuning-guide/`
