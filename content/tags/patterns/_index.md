---
title: "Query Patterns & Best Practices"
description: "Master proven query patterns for Geode graph database including pathfinding, aggregations, traversals, and optimization strategies. Production-tested patterns for high-performance graph queries."
keywords:
  - query patterns
  - graph patterns
  - best practices
  - query optimization
  - pattern matching
  - traversal patterns
  - aggregation patterns
  - performance patterns
  - GQL patterns
  - graph query patterns
  - pathfinding patterns
  - relationship traversal
  - query anti-patterns
  - optimization strategies
  - Geode
  - graph database
  - documentation
  - ISO GQL
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/patterns/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Query patterns represent proven, reusable solutions to common graph querying challenges. Understanding and applying effective query patterns is essential for writing performant, maintainable GQL queries in Geode. These patterns encode best practices learned from production deployments and help you avoid common pitfalls.

Geode's implementation of the ISO/IEC 39075:2024 GQL standard enables powerful pattern matching capabilities. By mastering query patterns, you can write concise, expressive queries that leverage Geode's optimization engine effectively while maintaining code clarity and performance.

This comprehensive guide explores essential query patterns, from basic node and relationship matching through advanced traversal strategies, aggregation patterns, and optimization techniques.

## Fundamental Pattern Matching

**Basic Node Pattern**:

```gql
-- Match nodes by label
MATCH (u:User)
RETURN u.name, u.email;

-- Match with property filter
MATCH (u:User {status: 'active'})
RETURN u;

-- Match with WHERE clause
MATCH (u:User)
WHERE u.created_at > '2024-01-01'
RETURN u;
```

**Relationship Pattern**:

```gql
-- Match relationship by type
MATCH (u:User)-[:FOLLOWS]->(other:User)
RETURN u.name, other.name;

-- Match with direction
MATCH (u:User)<-[:FOLLOWS]-(follower:User)
RETURN u.name, count(follower) as follower_count;

-- Undirected relationship
MATCH (u:User)-[:FRIENDS]-(friend:User)
RETURN u.name, friend.name;
```

**Variable Length Paths**:

```gql
-- Friends of friends (2 hops)
MATCH (u:User {id: 123})-[:FRIENDS*2]->(fof:User)
RETURN DISTINCT fof.name;

-- 1 to 3 hops
MATCH (u:User {id: 123})-[:KNOWS*1..3]->(connection:User)
RETURN connection.name, length(path) as degrees;

-- Any length (use with caution!)
MATCH path = (start:Node)-[:CONNECTED*]-(end:Node)
WHERE start.id = 1 AND end.id = 999
RETURN path;
```

## Pattern Combination Strategies

**Multiple Patterns (AND logic)**:

```gql
-- User and their posts and comments
MATCH (u:User {id: 123})
MATCH (u)-[:POSTED]->(p:Post)
MATCH (u)-[:COMMENTED]->(c:Comment)
RETURN u, collect(DISTINCT p) as posts, collect(DISTINCT c) as comments;
```

**OPTIONAL MATCH Pattern**:

```gql
-- Include users even if they haven't posted
MATCH (u:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
RETURN u.name, count(p) as post_count;
```

**UNION Pattern**:

```gql
-- Combine multiple patterns
MATCH (u:User)-[:POSTED]->(content:Post)
RETURN u.name, content.title, 'post' as type
UNION ALL
MATCH (u:User)-[:COMMENTED]->(content:Comment)
RETURN u.name, content.text as title, 'comment' as type;
```

## Aggregation Patterns

**Group and Count**:

```gql
-- Users by country
MATCH (u:User)
RETURN u.country, count(*) as user_count
ORDER BY user_count DESC;

-- Posts per user
MATCH (u:User)-[:POSTED]->(p:Post)
RETURN u.name, count(p) as post_count
ORDER BY post_count DESC
LIMIT 10;
```

**Collect Pattern**:

```gql
-- Collect all followers
MATCH (u:User {id: 123})<-[:FOLLOWS]-(follower:User)
RETURN u.name, collect(follower.name) as followers;

-- Collect with DISTINCT
MATCH (u:User)-[:POSTED]->(p:Post)-[:HAS_TAG]->(t:Tag)
RETURN u.name, collect(DISTINCT t.name) as tags;
```

**Statistical Aggregations**:

```gql
-- Compute statistics
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN
  count(p) as total_purchases,
  sum(p.price) as total_spent,
  avg(p.price) as avg_price,
  min(p.price) as cheapest,
  max(p.price) as most_expensive;
```

## Traversal Patterns

**Depth-First Exploration**:

```gql
-- Explore social network depth-first
MATCH path = (start:User {id: 123})-[:FOLLOWS*1..4]->(connected:User)
WHERE connected.id <> 123
RETURN path, length(path) as depth
ORDER BY depth;
```

**Breadth-First Shortest Path**:

```gql
-- Find shortest path between users
MATCH path = shortestPath((u1:User {id: 123})-[:KNOWS*]-(u2:User {id: 456}))
RETURN path, length(path) as distance;

-- All shortest paths
MATCH paths = allShortestPaths((u1:User {id: 123})-[:KNOWS*]-(u2:User {id: 456}))
RETURN paths;
```

**Path Filtering Pattern**:

```gql
-- Paths avoiding specific nodes
MATCH path = (start:User {id: 123})-[:FOLLOWS*1..5]->(end:User)
WHERE NONE(node IN nodes(path) WHERE node.blocked = true)
RETURN path;

-- Paths with all relationships matching criteria
MATCH path = (start)-[r:RATED*1..3]->(end)
WHERE ALL(rel IN relationships(path) WHERE rel.rating >= 4)
RETURN path;
```

## Filtering and Predicate Patterns

**Property Comparison**:

```gql
-- Range filter
MATCH (u:User)
WHERE u.age BETWEEN 18 AND 65
  AND u.country = 'US'
  AND u.verified = true
RETURN u;

-- String matching
MATCH (u:User)
WHERE u.email ENDS WITH '@example.com'
  OR u.name STARTS WITH 'John'
RETURN u;

-- Pattern matching
MATCH (u:User)
WHERE u.email =~ '.*@(gmail|yahoo)\.com'
RETURN u;
```

**List Operations**:

```gql
-- IN operator
MATCH (u:User)
WHERE u.role IN ['admin', 'moderator']
RETURN u;

-- List comprehension
MATCH (u:User)
WHERE ANY(tag IN u.tags WHERE tag STARTS WITH 'tech-')
RETURN u;
```

**Existence Checks**:

```gql
-- Check relationship existence
MATCH (u:User)
WHERE EXISTS { (u)-[:VERIFIED]->(v:Verification) }
RETURN u;

-- Check property existence
MATCH (u:User)
WHERE u.email IS NOT NULL
  AND u.phone IS NOT NULL
RETURN u;
```

## Mutation Patterns

**Create Pattern**:

```gql
-- Create with relationship
CREATE (u:User {name: 'Alice', email: 'alice@example.com'})
CREATE (p:Post {title: 'First Post', content: '...'})
CREATE (u)-[:POSTED {timestamp: current_timestamp()}]->(p)
RETURN u, p;

-- Create from pattern
MATCH (u:User {id: 123})
CREATE (u)-[:POSTED]->(p:Post {title: 'New Post'})
RETURN p;
```

**MERGE Pattern** (upsert):

```gql
-- Create or match user
MERGE (u:User {email: 'alice@example.com'})
ON CREATE SET u.created_at = current_timestamp()
ON MATCH SET u.last_login = current_timestamp()
RETURN u;

-- Merge relationship
MATCH (u1:User {id: 123}), (u2:User {id: 456})
MERGE (u1)-[f:FOLLOWS]->(u2)
ON CREATE SET f.since = current_timestamp()
RETURN f;
```

**Conditional Update Pattern**:

```gql
-- Update with condition
MATCH (u:User {id: 123})
WHERE u.login_count < 1000
SET u.login_count = u.login_count + 1
RETURN u;

-- Batch update
MATCH (p:Post)
WHERE p.created_at < '2020-01-01'
SET p.archived = true
RETURN count(p) as archived_count;
```

## Performance Optimization Patterns

**Index-Backed Lookups**:

```gql
-- Start with indexed lookup
MATCH (u:User {email: 'user@example.com'})  -- Uses index
MATCH (u)-[:POSTED]->(p:Post)
RETURN u, p;

-- Avoid starting with unindexed scan
-- Inefficient:
MATCH (p:Post)
MATCH (p)<-[:POSTED]-(u:User {email: 'user@example.com'})
RETURN u, p;
```

**Early Filtering Pattern**:

```gql
-- Filter early in the query
MATCH (u:User)
WHERE u.country = 'US'  -- Reduce search space early
MATCH (u)-[:POSTED]->(p:Post)
WHERE p.created_at > '2024-01-01'
RETURN u, p;
```

**WITH Clause for Pipeline**:

```gql
-- Break complex queries into stages
MATCH (u:User)
WHERE u.follower_count > 10000
WITH u
ORDER BY u.follower_count DESC
LIMIT 100
MATCH (u)-[:POSTED]->(p:Post)
WHERE p.likes > 1000
RETURN u.name, count(p) as viral_posts;
```

**Avoid Cartesian Products**:

```gql
-- Bad: Cartesian product
MATCH (u:User), (p:Post)  -- Don't do this!
WHERE u.id = p.author_id
RETURN u, p;

-- Good: Use relationship pattern
MATCH (u:User)-[:POSTED]->(p:Post)
RETURN u, p;
```

## Analytical Patterns

**Recommendation Pattern**:

```gql
-- Collaborative filtering
MATCH (u:User {id: 123})-[:LIKED]->(item:Product)
MATCH (similar:User)-[:LIKED]->(item)
WHERE similar.id <> 123
MATCH (similar)-[:LIKED]->(recommendation:Product)
WHERE NOT EXISTS { (u)-[:LIKED]->(recommendation) }
RETURN recommendation.name, count(*) as score
ORDER BY score DESC
LIMIT 10;
```

**Influence Scoring Pattern**:

```gql
-- Calculate user influence
MATCH (u:User)
OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
RETURN
  u.name,
  count(DISTINCT follower) as followers,
  count(DISTINCT p) as posts,
  count(DISTINCT follower) * 2 + count(DISTINCT p) as influence_score
ORDER BY influence_score DESC;
```

**Community Detection Pattern**:

```gql
-- Find connected components
MATCH (u:User {id: 123})-[:KNOWS*]-(connected:User)
RETURN collect(DISTINCT connected.id) as community;

-- Mutual connections
MATCH (u1:User {id: 123})-[:KNOWS]->(mutual:User)<-[:KNOWS]-(u2:User {id: 456})
RETURN count(mutual) as mutual_friends, collect(mutual.name) as names;
```

## Time-Series Patterns

**Temporal Filtering**:

```gql
-- Events in time window
MATCH (e:Event)
WHERE e.timestamp BETWEEN '2024-01-01' AND '2024-12-31'
RETURN e
ORDER BY e.timestamp;

-- Time-based aggregation
MATCH (o:Order)
WHERE o.created_at > current_timestamp() - INTERVAL '30 days'
RETURN
  date_trunc('day', o.created_at) as day,
  count(*) as order_count,
  sum(o.total) as revenue
ORDER BY day;
```

**Trend Analysis Pattern**:

```gql
-- Growth over time
MATCH (u:User)
RETURN
  date_trunc('month', u.created_at) as month,
  count(*) as new_users
ORDER BY month;
```

## Anti-Patterns to Avoid

**Don't Fetch Everything**:

```gql
-- Bad: Returns huge result set
MATCH (n)
RETURN n;

-- Good: Use pagination
MATCH (n:Node)
RETURN n
ORDER BY n.id
LIMIT 100 OFFSET 0;
```

**Don't Use Variable Length Without Bounds**:

```gql
-- Bad: Can explode
MATCH path = (n)-[*]-(m)
RETURN path;

-- Good: Set reasonable limits
MATCH path = (n)-[*1..4]-(m)
RETURN path;
```

**Don't Skip Relationship Direction When Possible**:

```gql
-- Less efficient
MATCH (u:User)-[:FOLLOWS]-(other:User)
RETURN u, other;

-- More efficient (if direction is known)
MATCH (u:User)-[:FOLLOWS]->(other:User)
RETURN u, other;
```

## Best Practices Summary

1. **Start with indexed lookups** to narrow search space early
2. **Filter aggressively** before expensive operations like traversals
3. **Use LIMIT** to prevent unbounded result sets
4. **Break complex queries** into stages with WITH
5. **Leverage relationship direction** when known
6. **Set bounds on variable-length paths** to prevent explosions
7. **Use OPTIONAL MATCH** for left-join semantics
8. **Profile queries** with EXPLAIN and PROFILE to verify optimization
9. **Create appropriate indexes** for frequently filtered properties
10. **Consider cardinality** when ordering MATCH clauses

## Related Topics

- [Query Optimization](/tags/query-optimization/)
- [Performance Tuning](/tags/performance/)
- [Indexing Strategies](/tags/indexing/)
- [Pattern Matching](/tags/pattern-matching/)
- [GQL Query Language](/tags/gql/)
- [Best Practices](/tags/best-practices/)

## Further Reading

- GQL Pattern Matching Specification
- Query Performance Optimization Guide
- Graph Algorithm Patterns
- Advanced Traversal Techniques
- Production Query Patterns

## Production-Grade Query Patterns

### Pagination with Cursors

Efficient pagination for large result sets:

```gql
-- Offset-based pagination (simple but slower for deep pages)
MATCH (p:Post)
WHERE p.status = 'published'
RETURN p.post_id, p.title, p.created_at
ORDER BY p.created_at DESC
SKIP $offset
LIMIT $page_size

-- Cursor-based pagination (faster, more scalable)
MATCH (p:Post)
WHERE p.status = 'published'
  AND ($cursor IS NULL OR p.created_at < $cursor)
RETURN p.post_id, p.title, p.created_at
ORDER BY p.created_at DESC
LIMIT $page_size

-- Keyset pagination (best performance for sorted data)
MATCH (p:Post)
WHERE p.status = 'published'
  AND (p.created_at, p.post_id) < ($last_timestamp, $last_id)
RETURN p.post_id, p.title, p.created_at
ORDER BY p.created_at DESC, p.post_id DESC
LIMIT 20
```

### Conditional Query Building

Dynamic queries based on filters:

```python
# Python: Build query dynamically based on filters
def build_user_query(filters):
    clauses = ["u.active = true"]  # Base filter
    params = {}

    if filters.get('email'):
        clauses.append("u.email =~ $email_pattern")
        params['email_pattern'] = f".*{filters['email']}.*"

    if filters.get('min_age'):
        clauses.append("u.age >= $min_age")
        params['min_age'] = filters['min_age']

    if filters.get('country'):
        clauses.append("u.country = $country")
        params['country'] = filters['country']

    where_clause = " AND ".join(clauses)

    query = f"""
        MATCH (u:User)
        WHERE {where_clause}
        RETURN u.user_id, u.name, u.email, u.age
        ORDER BY u.created_at DESC
        LIMIT $limit
    """

    params['limit'] = filters.get('limit', 100)
    return query, params

# Usage
query, params = build_user_query({
    'email': 'alice',
    'min_age': 18,
    'country': 'USA',
    'limit': 50
})
result = await client.execute(query, params)
```

### Batch Operations

Efficiently process multiple operations:

```gql
-- Batch insert with UNWIND
UNWIND $users AS user_data
CREATE (u:User {
  user_id: user_data.id,
  name: user_data.name,
  email: user_data.email,
  created_at: datetime()
})

-- Batch relationship creation
UNWIND $friendships AS friendship
MATCH (a:User {user_id: friendship.user_a})
MATCH (b:User {user_id: friendship.user_b})
MERGE (a)-[:FRIENDS_WITH {since: datetime()}]->(b)

-- Batch update with conditional logic
UNWIND $updates AS update_data
MATCH (p:Product {product_id: update_data.id})
SET p.price = update_data.new_price,
    p.updated_at = datetime()
WHERE p.price <> update_data.new_price  // Only update if changed
```

### Hierarchical Queries with Recursion

Navigate tree structures efficiently:

```gql
-- Find all descendants of a category
MATCH path = (root:Category {cat_id: $root_id})-[:SUBCATEGORY_OF*0..]->(descendant:Category)
RETURN descendant.cat_id,
       descendant.name,
       length(path) AS depth
ORDER BY depth, descendant.name

-- Find all ancestors (path to root)
MATCH path = (leaf:Category {cat_id: $leaf_id})-[:SUBCATEGORY_OF*]->(ancestor:Category)
WHERE NOT EXISTS { MATCH (ancestor)-[:SUBCATEGORY_OF]->() }
RETURN [node IN nodes(path) | node.name] AS path_to_root

-- Limit recursion depth for safety
MATCH path = (a:Category)-[:SUBCATEGORY_OF*1..5]->(b:Category)
WHERE a.cat_id = $start_id
RETURN b.name, length(path) AS depth
ORDER BY depth
```

### Aggregation with Grouping Sets

Advanced aggregation patterns:

```gql
-- Multi-level aggregation (rollup pattern)
MATCH (o:Order)-[:CONTAINS]->(item:OrderLineItem)-[:FOR_PRODUCT]->(p:Product)
WHERE o.created_at >= datetime().minusDays(30)
RETURN
  p.category AS category,
  p.brand AS brand,
  COUNT(DISTINCT o.order_id) AS order_count,
  SUM(item.quantity) AS units_sold,
  SUM(item.total) AS revenue
ORDER BY revenue DESC

-- Compute subtotals at multiple levels
MATCH (o:Order)
WHERE o.created_at >= datetime().minusDays(30)
WITH
  date_trunc('day', o.created_at) AS day,
  o.status AS status,
  o.total AS amount
RETURN
  day,
  status,
  COUNT(*) AS order_count,
  SUM(amount) AS daily_revenue
ORDER BY day DESC, status

-- Pivot-like aggregations
MATCH (u:User)-[r:RATED]->(p:Product)
WITH p.product_id AS product,
     SUM(CASE WHEN r.rating = 5 THEN 1 ELSE 0 END) AS five_star,
     SUM(CASE WHEN r.rating = 4 THEN 1 ELSE 0 END) AS four_star,
     SUM(CASE WHEN r.rating = 3 THEN 1 ELSE 0 END) AS three_star,
     SUM(CASE WHEN r.rating = 2 THEN 1 ELSE 0 END) AS two_star,
     SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END) AS one_star
RETURN product, five_star, four_star, three_star, two_star, one_star
```

### Subquery Patterns

Complex filtering with correlated subqueries:

```gql
-- Users who have purchased from ALL specified categories
MATCH (u:User)
WHERE ALL(cat IN $required_categories WHERE EXISTS {
  MATCH (u)-[:PURCHASED]->(p:Product)-[:IN_CATEGORY]->(c:Category)
  WHERE c.name = cat
})
RETURN u.user_id, u.name

-- Find users with above-average activity
MATCH (u:User)
WITH u, COUNT{MATCH (u)-[:POSTED]->(:Post)} AS post_count
WITH AVG(post_count) AS avg_posts
MATCH (active:User)
WITH active, COUNT{MATCH (active)-[:POSTED]->(:Post)} AS user_posts, avg_posts
WHERE user_posts > avg_posts
RETURN active.name, user_posts, avg_posts

-- Lateral joins (correlated subqueries)
MATCH (category:Category)
CALL {
  WITH category
  MATCH (category)<-[:IN_CATEGORY]-(p:Product)
  RETURN p
  ORDER BY p.price DESC
  LIMIT 3
}
RETURN category.name, COLLECT(p.name) AS top_products
```

### Window Functions (Ranking and Analytics)

Advanced analytical queries:

```gql
-- Rank products within each category
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
WITH c.name AS category,
     p.name AS product,
     p.price AS price,
     p.sales AS sales,
     RANK() OVER (PARTITION BY c.name ORDER BY p.sales DESC) AS sales_rank
WHERE sales_rank <= 10
RETURN category, product, sales, sales_rank
ORDER BY category, sales_rank

-- Running totals
MATCH (o:Order)
WHERE o.created_at >= datetime('2025-01-01')
WITH o
ORDER BY o.created_at
RETURN
  o.order_id,
  o.created_at,
  o.total,
  SUM(o.total) OVER (
    ORDER BY o.created_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total

-- Percentile calculations
MATCH (p:Product)
WITH p.price AS price,
     PERCENTILE_CONT(0.5) OVER () AS median_price,
     PERCENTILE_CONT(0.25) OVER () AS q1_price,
     PERCENTILE_CONT(0.75) OVER () AS q3_price
RETURN DISTINCT median_price, q1_price, q3_price
```

## Performance Optimization Patterns

### Query Plan Analysis

Systematic performance tuning:

```gql
-- Step 1: Explain the query plan
EXPLAIN
MATCH (u:User {email: $email})-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN p.name

-- Look for:
-- - Full table scans (should use indexes)
-- - Cartesian products (accidental cross joins)
-- - Large intermediate result sets
-- - Missing index usage

-- Step 2: Profile actual execution
PROFILE
MATCH (u:User {email: $email})-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN p.name

-- Check:
-- - db hits per operator
-- - rows processed vs. returned
-- - execution time per operator
```

### Index Strategy Patterns

Optimize with targeted indexes:

```gql
-- Create indexes for lookup patterns
CREATE INDEX FOR (u:User) ON (u.email);
CREATE INDEX FOR (p:Product) ON (p.price);
CREATE INDEX FOR (o:Order) ON (o.created_at);

-- Composite index for multi-column filters
CREATE INDEX FOR (u:User) ON (u.country, u.status, u.created_at);

-- Use index hints when planner needs help
MATCH (u:User)
USING INDEX u:User(email)
WHERE u.email = $email
RETURN u

-- Full-text search optimization
CREATE TEXT INDEX FOR (p:Post) ON (p.title, p.content);
MATCH (p:Post)
WHERE p.content CONTAINS $search_term
RETURN p
```

### Caching Strategies

Reduce database load with smart caching:

```python
# Application-level query result caching
class GeodeCachedClient:
    def __init__(self, client, cache_ttl=300):
        self.client = client
        self.cache = {}
        self.cache_ttl = cache_ttl

    async def execute_cached(self, query, params=None, cache_key=None):
        if cache_key is None:
            cache_key = hash((query, json.dumps(params, sort_keys=True)))

        if cache_key in self.cache:
            result, timestamp = self.cache[cache_key]
            if time.time() - timestamp < self.cache_ttl:
                return result  # Cache hit

        # Cache miss - execute query
        result = await self.client.execute(query, params)
        self.cache[cache_key] = (result, time.time())
        return result

# Usage
cached_client = GeodeCachedClient(client, cache_ttl=300)

# Frequently accessed data is cached
user_count = await cached_client.execute_cached(
    "MATCH (u:User) WHERE u.active = true RETURN COUNT(u)",
    cache_key="active_user_count"
)
```

## Advanced Pattern Techniques

### Graph Algorithm Implementations

Implement custom algorithms:

```gql
-- PageRank-like influence scoring
MATCH (u:User)
OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower:User)
WITH u, COUNT(follower) AS follower_count,
     COLLECT(follower) AS followers
OPTIONAL MATCH (u)<-[:FOLLOWS]-()-[:FOLLOWS]->(influenced:User)
WHERE influenced <> u
WITH u, follower_count,
     follower_count + COUNT(DISTINCT influenced) * 0.5 AS influence_score
RETURN u.user_id, u.name, influence_score
ORDER BY influence_score DESC
LIMIT 20

-- Community detection via label propagation
// Initialize: Each node has own community ID
MATCH (u:User)
SET u.community = u.user_id

// Iteration 1: Adopt most common neighbor community
MATCH (u:User)-[:KNOWS]-(neighbor:User)
WITH u, neighbor.community AS neighbor_community, COUNT(*) AS frequency
ORDER BY u, frequency DESC
WITH u, COLLECT(neighbor_community)[0] AS most_common_community
SET u.community = most_common_community

// Repeat iteration multiple times, then analyze:
MATCH (u:User)
RETURN u.community, COUNT(*) AS community_size
ORDER BY community_size DESC
```

### Recommendation Engine Patterns

Build recommendation systems:

```gql
-- Collaborative filtering
MATCH (user:User {user_id: $user_id})-[:PURCHASED]->(product:Product)
  <-[:PURCHASED]-(other:User)
WHERE other.user_id <> $user_id
WITH other, COUNT(product) AS common_purchases
ORDER BY common_purchases DESC
LIMIT 10
MATCH (other)-[:PURCHASED]->(recommendation:Product)
WHERE NOT EXISTS {
  MATCH (user)-[:PURCHASED]->(recommendation)
}
WITH recommendation, COUNT(other) AS recommender_count
RETURN recommendation.product_id,
       recommendation.name,
       recommender_count
ORDER BY recommender_count DESC
LIMIT 5

-- Content-based filtering
MATCH (user:User {user_id: $user_id})-[:PURCHASED]->(liked:Product)
WITH user, COLLECT(liked.category) AS liked_categories
MATCH (candidate:Product)
WHERE candidate.category IN liked_categories
  AND NOT EXISTS {
    MATCH (user)-[:PURCHASED]->(candidate)
  }
WITH candidate,
     SIZE([cat IN candidate.tags WHERE cat IN $user_interests]) AS tag_match_score
WHERE tag_match_score > 0
RETURN candidate.product_id,
       candidate.name,
       tag_match_score
ORDER BY tag_match_score DESC
LIMIT 10
```

### Real-Time Analytics Patterns

Stream processing with materialized views:

```gql
-- Maintain real-time aggregates
// Trigger on insert to Order
ON INSERT INTO Order AS new_order
DO
  MATCH (product:Product {product_id: new_order.product_id})
  SET product.total_sales = product.total_sales + new_order.quantity,
      product.revenue = product.revenue + new_order.total,
      product.last_sold_at = new_order.created_at

-- Real-time leaderboards
MATCH (u:User)
WITH u,
     COUNT{MATCH (u)-[:POSTED]->(:Post)} AS post_count,
     COUNT{MATCH (u)<-[:FOLLOWS]-(:User)} AS follower_count
WITH u, post_count, follower_count,
     post_count * 1.0 + follower_count * 2.0 AS score
RETURN u.user_id, u.name, score
ORDER BY score DESC
LIMIT 100
```

## Pattern Anti-Patterns and Pitfalls

### Cartesian Product Prevention

Avoid accidental cross joins:

```gql
-- ANTI-PATTERN: Cartesian product
MATCH (u:User), (p:Product)
WHERE u.country = p.shipping_country  // Millions of combinations!
RETURN u, p

-- CORRECT: Use relationship path
MATCH (u:User)-[:INTERESTED_IN]->(c:Category)<-[:IN_CATEGORY]-(p:Product)
WHERE u.country = p.shipping_country
RETURN u, p

-- OR: Add early filtering
MATCH (u:User)
WHERE u.country = $country
WITH u LIMIT 100  // Limit early
MATCH (p:Product)
WHERE p.shipping_country = $country
RETURN u, p
```

### Variable-Length Path Limits

Always bound path lengths:

```gql
-- DANGEROUS: Unbounded path traversal
MATCH path = (a:User)-[:KNOWS*]-(b:User)
RETURN path  // Can explode!

-- SAFE: Bounded traversal
MATCH path = (a:User)-[:KNOWS*1..4]-(b:User)
WHERE a.user_id = $user_id
RETURN path
LIMIT 100

-- SAFER: Early termination
MATCH path = shortestPath((a:User)-[:KNOWS*..8]-(b:User))
WHERE a.user_id = $user_a AND b.user_id = $user_b
RETURN path
```

### Unnecessary OPTIONAL MATCH

Only use when needed:

```gql
-- INEFFICIENT: Unnecessary OPTIONAL
MATCH (u:User)
OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
RETURN u, COUNT(p)  // Every user always has 0+ posts

-- EFFICIENT: Regular MATCH with aggregation handles missing
MATCH (u:User)
WITH u, COUNT{MATCH (u)-[:POSTED]->(:Post)} AS post_count
RETURN u, post_count  // Simpler and faster
```

## Testing and Validation Patterns

### Query Correctness Validation

```python
# Test query results with expected data
async def test_user_recommendation():
    # Setup: Create test data
    await client.execute("""
        CREATE (alice:User {user_id: 'alice'})
        CREATE (bob:User {user_id: 'bob'})
        CREATE (carol:User {user_id: 'carol'})
        CREATE (p1:Product {product_id: 'p1', name: 'Laptop'})
        CREATE (p2:Product {product_id: 'p2', name: 'Mouse'})
        CREATE (alice)-[:PURCHASED]->(p1)
        CREATE (bob)-[:PURCHASED]->(p1)
        CREATE (bob)-[:PURCHASED]->(p2)
    """)

    # Execute: Run recommendation query
    result = await client.execute("""
        MATCH (alice:User {user_id: 'alice'})-[:PURCHASED]->(p:Product)
          <-[:PURCHASED]-(other:User)
        MATCH (other)-[:PURCHASED]->(rec:Product)
        WHERE NOT EXISTS {
          MATCH (alice)-[:PURCHASED]->(rec)
        }
        RETURN rec.product_id, rec.name
    """)

    # Assert: Verify expected recommendations
    assert len(result) == 1
    assert result[0]['rec.product_id'] == 'p2'
    assert result[0]['rec.name'] == 'Mouse'

    # Cleanup
    await client.execute("MATCH (n) DETACH DELETE n")
```

## Related Topics and Integration

Query patterns integrate deeply with:

- **Query Optimization**: Plan analysis and index strategy
- **Performance Tuning**: Execution optimization
- **Data Modeling**: Schema design for query efficiency
- **GQL Language**: Standard syntax and semantics
- **Indexing**: Strategic index creation
- **Caching**: Application-level result caching

Browse the tagged content below to discover comprehensive pattern documentation, query examples, and optimization guides.