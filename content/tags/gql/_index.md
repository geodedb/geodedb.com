---
title: "Tag: Graph Query Language (GQL)"
description: "Explore Geode's ISO/IEC 39075:2024 GQL standard implementation including query syntax, pattern matching, and the full GQL conformance profile."
keywords:
  - GQL
  - graph query language
  - ISO 39075
  - pattern matching
  - query syntax
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/gql/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Geode documentation tagged with **Graph Query Language (GQL)**. GQL is the ISO/IEC 39075:2024 international standard for querying property graph databases, providing a declarative, composable language designed specifically for graph data structures.

## Introduction to GQL

The Graph Query Language (GQL) represents a watershed moment in database standardization. Published as ISO/IEC 39075:2024, GQL provides the first international standard specifically designed for querying property graphs. Unlike SQL, which evolved from relational theory, or Cypher and SPARQL, which were vendor-specific or domain-specific, GQL was built from the ground up as a universal standard for graph databases.

GQL combines the best ideas from existing graph query languages while introducing new capabilities for modern graph workloads. The language supports both read queries (MATCH) and write operations (INSERT, SET, REMOVE, DELETE), making it a complete data manipulation language. Its declarative nature means you describe what data you want, not how to retrieve it—the query optimizer handles execution strategy.

Geode follows the ISO/IEC 39075:2024 compliance. See the conformance profile for scope, diagnostics, and implementation-defined behaviors.

## Key Concepts

### Pattern Matching

At the heart of GQL is pattern matching. The `MATCH` clause lets you describe graph structures using ASCII-art syntax:

```gql
MATCH (person:Person)-[:KNOWS]->(friend:Person)
WHERE person.name = 'Alice'
RETURN friend.name
```

This query reads naturally: "Match a Person node named Alice, connected by a KNOWS relationship to friend nodes, and return the friends' names."

### Node and Relationship Patterns

GQL supports rich pattern syntax:

- **Node patterns**: `(variable:Label {property: value})`
- **Relationship patterns**: `-[:TYPE]->`, `<-[:TYPE]-`, `-[:TYPE]-`
- **Variable-length paths**: `-[:KNOWS*1..3]->` (1 to 3 hops)
- **Property constraints**: `WHERE node.age > 30`

### Data Manipulation

GQL provides comprehensive write operations:

```gql
// Insert new nodes
INSERT (:Person {name: 'Bob', age: 30})

// Create relationships
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
INSERT (a)-[:KNOWS]->(b)

// Update properties
MATCH (p:Person {name: 'Bob'})
SET p.age = 31

// Remove properties
MATCH (p:Person {name: 'Bob'})
REMOVE p.temporary_flag

// Delete nodes and relationships
MATCH (p:Person {name: 'Bob'})
DELETE p
```

### Composability and Modularity

GQL queries compose naturally using subqueries, CTEs (Common Table Expressions), and nested patterns:

```gql
MATCH (p:Person)
WHERE EXISTS {
  MATCH (p)-[:WORKS_AT]->(:Company {name: 'Acme Corp'})
}
RETURN p.name
```

## How GQL Works in Geode

Geode's GQL implementation is built on a sophisticated query engine that transforms GQL syntax into optimized execution plans.

### Query Pipeline

1. **Lexical Analysis**: The lexer tokenizes GQL source code into tokens (keywords, identifiers, operators)
2. **Parsing**: The parser builds an Abstract Syntax Tree (AST) representing the query structure
3. **Semantic Analysis**: Type checking, label validation, and constraint verification
4. **Query Optimization**: The optimizer applies rules to generate efficient execution plans
5. **Execution**: The runtime engine executes the plan using Geode's storage and indexing layers

### Standards Compliance

Geode achieves ISO/IEC 39075:2024 compliance through:

- **Complete syntax support**: All GQL keywords, operators, and expressions
- **Correct semantics**: Exact ISO-specified behavior for edge cases
- **Test validation**: All 70 ISO compliance tests passing
- **Error handling**: ISO-compliant status codes and error messages

### Performance Optimizations

Geode's GQL engine includes advanced optimizations:

- **Index-aware planning**: Automatically uses indexes for WHERE clauses
- **Join reordering**: Optimizes multi-pattern queries
- **Predicate pushdown**: Filters data as early as possible
- **Parallel execution**: Distributes work across CPU cores
- **Query caching**: Reuses compiled query plans

## Use Cases

### Social Network Analysis

```gql
// Find friends-of-friends who share interests
MATCH (me:Person {id: $userId})-[:KNOWS]->()-[:KNOWS]->(foaf:Person)
WHERE NOT EXISTS {
  MATCH (me)-[:KNOWS]->(foaf)
}
AND EXISTS {
  MATCH (me)-[:INTERESTED_IN]->(interest)<-[:INTERESTED_IN]-(foaf)
}
RETURN DISTINCT foaf.name, COUNT(interest) AS shared_interests
ORDER BY shared_interests DESC
LIMIT 10
```

### Fraud Detection

```gql
// Detect suspicious transaction patterns
MATCH (account:Account)-[t1:TRANSACTION]->(intermediary:Account)
     -[t2:TRANSACTION]->(destination:Account)
WHERE t1.timestamp - t2.timestamp < duration('PT1H')
AND t1.amount > 10000
AND account.risk_score > 0.7
RETURN account.id, destination.id, t1.amount
```

### Knowledge Graph Queries

```gql
// Find related concepts within 3 hops
MATCH path = (start:Concept {name: 'Machine Learning'})
            -[:RELATED_TO*1..3]->(related:Concept)
WHERE related.importance > 0.5
RETURN related.name, length(path) AS distance
ORDER BY distance, related.importance DESC
```

### Recommendation Systems

```gql
// Collaborative filtering recommendations
MATCH (user:User {id: $userId})-[:RATED]->(item:Item)
     <-[:RATED]-(similar:User)-[:RATED]->(recommendation:Item)
WHERE NOT EXISTS {
  MATCH (user)-[:RATED]->(recommendation)
}
RETURN recommendation.title, COUNT(similar) AS score
ORDER BY score DESC
LIMIT 20
```

## Best Practices

### Query Optimization

1. **Use indexes**: Create indexes on frequently queried properties

   ```gql
   CREATE INDEX person_name FOR (p:Person) ON (p.name)
   ```

2. **Filter early**: Place selective WHERE clauses near MATCH patterns
3. **Limit results**: Always use LIMIT for unbounded queries
4. **Profile queries**: Use PROFILE to understand execution plans

### Schema Design

- **Label consistently**: Use clear, singular noun labels (`:Person`, `:Product`)
- **Type relationships**: Give relationships meaningful types (`:PURCHASED`, `:FRIEND_OF`)
- **Index strategically**: Index properties used in WHERE, JOIN, and ORDER BY
- **Normalize carefully**: Balance between normalization and query performance

### Transaction Management

```gql
BEGIN TRANSACTION;

MATCH (account:Account {id: $fromId})
WHERE account.balance >= $amount
SET account.balance = account.balance - $amount;

MATCH (recipient:Account {id: $toId})
SET recipient.balance = recipient.balance + $amount;

COMMIT;
```

### Error Handling

- Check for NULL values in optional patterns
- Use EXISTS for conditional logic
- Validate inputs in WHERE clauses
- Handle constraint violations gracefully

## Code Examples

### Basic Pattern Matching

```gql
// Find all employees in engineering department
MATCH (p:Person)-[:WORKS_IN]->(d:Department {name: 'Engineering'})
RETURN p.name, p.title
ORDER BY p.hire_date DESC
```

### Aggregation

```gql
// Count connections by relationship type
MATCH (p:Person)-[r]->()
RETURN type(r) AS relationship_type, COUNT(*) AS count
ORDER BY count DESC
```

### Path Queries

```gql
// Find shortest path between two people
MATCH path = shortestPath(
  (start:Person {name: 'Alice'})-[:KNOWS*]-(end:Person {name: 'Bob'})
)
RETURN [node IN nodes(path) | node.name] AS path
```

### Conditional Logic

```gql
// Use CASE for computed values
MATCH (p:Person)
RETURN p.name,
       CASE
         WHEN p.age < 18 THEN 'Minor'
         WHEN p.age < 65 THEN 'Adult'
         ELSE 'Senior'
       END AS age_group
```

## Related Topics

Explore related GQL concepts and features:

- [ISO GQL Standard](/tags/iso-gql/) - ISO/IEC 39075:2024 specification details
- [GQL Compliance](/tags/gql-compliance/) - Standards conformance and testing
- [Pattern Matching](/tags/pattern-matching/) - Advanced pattern techniques
- [MATCH Clause](/tags/match/) - Core query patterns
- [Query Language](/tags/query-language/) - Language fundamentals
- [Query Optimization](/tags/query-optimization/) - Performance tuning
- [GQL Syntax](/tags/gql-syntax/) - Syntax reference
- [GQL Reference](/tags/gql-reference/) - Complete language reference

## Further Reading

### Documentation

- [GQL Quick Reference](/docs/quick-reference/) - Syntax cheat sheet
- [API Reference](/docs/api-reference/) - Complete API documentation
- [Query Optimization](/tags/query-optimization/) - Performance best practices
- [GQL Tutorial Series](/tags/tutorial/) - Step-by-step learning path

### Specifications

- [ISO/IEC 39075:2024 Overview](/tags/iso-standard/) - International standard details
- [GQL Specification](/tags/specification/) - Technical specification

### Advanced Topics

- [Transaction Management](/tags/transactions/) - ACID guarantees and isolation
- [Distributed Queries](/tags/distributed/) - Multi-node query execution
- [Security](/tags/security/) - Row-level security and query authorization
- [Performance](/tags/performance/) - Benchmarks and optimization

## Advanced Query Patterns

### Complex Traversals with Multiple Hops

Real-world graph applications often require sophisticated multi-hop traversals with conditional logic:

```gql
// Find influencers in a social network
MATCH (u:User)
WHERE EXISTS {
  MATCH (u)<-[:FOLLOWS]-(follower)
  WITH follower
  WHERE follower.verified = true
  WITH count(follower) AS verified_followers
  WHERE verified_followers > 1000
}
AND EXISTS {
  MATCH (u)-[:POSTED]->(p:Post)
  WHERE p.likes > 10000
  WITH count(p) AS viral_posts
  WHERE viral_posts > 5
}
RETURN u.name,
       SIZE((u)<-[:FOLLOWS]-()) AS total_followers,
       SIZE((u)-[:POSTED]->(:Post)) AS post_count
ORDER BY total_followers DESC
LIMIT 50
```

### Recursive Pattern Matching

GQL supports recursive patterns for hierarchical data:

```gql
// Organizational hierarchy traversal
MATCH path = (employee:Person {id: $employeeId})
            -[:REPORTS_TO*0..]->(manager:Person)
WHERE manager.role = 'CEO'
RETURN [n IN nodes(path) | {
  name: n.name,
  title: n.title,
  level: length(path) - null /* no indexOf(); use nodes(path) CONTAINS n as a predicate */
}] AS hierarchy
```

### Graph Algorithms with GQL

Implement graph algorithms using declarative GQL:

```gql
// PageRank-style influence calculation
MATCH (p:Page)
WITH p, SIZE((p)<-[:LINKS_TO]-()) AS inbound_links
WITH p, inbound_links,
     1.0 + 0.85 * SUM(
       CASE WHEN inbound_links > 0
       THEN 1.0 / inbound_links
       ELSE 0
       END
     ) AS page_rank
WHERE page_rank > 0.5
RETURN p.url, page_rank
ORDER BY page_rank DESC
LIMIT 100
```

## Performance Optimization Deep Dive

### Index Strategy

Choosing the right indexes dramatically impacts query performance:

```gql
// Multi-column composite index for complex queries
CREATE INDEX user_activity_idx
FOR (u:User)
ON (u.country, u.status, u.created_at);

// Covering index includes all needed properties
CREATE INDEX product_search_idx
FOR (p:Product)
ON (p.category, p.price, p.availability)
INCLUDE (p.name, p.description);

// Full-text search index for text queries
CREATE INDEX article_content_idx
FOR (a:Article)
ON (a.title, a.body)
OPTIONS {
  analyzer: 'english',
  min_token_length: 3
} USING fulltext;
```

### Query Rewriting for Performance

Transform queries to leverage indexes effectively:

```gql
-- SLOW: Property filter in WHERE clause
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE u.country = 'USA'
RETURN p.name, count(u) AS buyers;

-- FAST: Property filter in MATCH pattern
MATCH (u:User {country: 'USA'})-[:PURCHASED]->(p:Product)
RETURN p.name, count(u) AS buyers;

-- EVEN FASTER: Use index hints
MATCH (u:User {country: 'USA'})-[:PURCHASED]->(p:Product)
USING INDEX user_activity_idx
RETURN p.name, count(u) AS buyers;
```

### Batch Operations

Optimize bulk data operations:

```gql
// Batch insert with UNWIND
UNWIND $batch AS item
CREATE (p:Product {
  id: item.id,
  name: item.name,
  price: item.price,
  created_at: timestamp()
});

// Batch update with FOREACH
MATCH (u:User)
WHERE u.id IN $user_ids
FOREACH (update IN $updates |
  MERGE (u {id: update.id})
  SET u.last_login = update.timestamp
);

// Parallel batch processing
CALL {
  UNWIND range(0, $total_batches - 1) AS batch_num
  WITH batch_num, batch_num * $batch_size AS offset
  MATCH (n:Node)
  SKIP offset
  LIMIT $batch_size
  SET n.processed = true
} IN TRANSACTIONS OF 1000 ROWS;
```

## Advanced Features and Extensions

### Temporal Queries

GQL supports temporal data types and operations:

```gql
// Time-based filtering
MATCH (event:Event)
WHERE event.timestamp >= datetime('2025-01-01T00:00:00Z')
  AND event.timestamp < datetime('2025-02-01T00:00:00Z')
RETURN event.type, count(*) AS occurrences
ORDER BY occurrences DESC;

// Duration calculations
MATCH (session:Session)
WITH session,
     (session.end_time - session.start_time) AS session_length
WHERE session_length > duration('PT30M')
RETURN session.user_id, session_length
ORDER BY session_length DESC;

// Date arithmetic
MATCH (subscription:Subscription)
WHERE subscription.expires_at < date() + duration('P7D')
  AND subscription.auto_renew = false
RETURN subscription.user_email, subscription.expires_at
ORDER BY subscription.expires_at;
```

### Geospatial Queries

Geode extends GQL with spatial operations:

```gql
// Point-based proximity search
MATCH (store:Store)
WHERE st_distance(
  store.location,
  point({latitude: $user_lat, longitude: $user_lon})
) < 5000  // meters
RETURN store.name,
       store.address,
       st_distance(store.location,
                     point({latitude: $user_lat, longitude: $user_lon})) AS distance
ORDER BY distance
LIMIT 10;

// Polygon containment
MATCH (property:Property)
WHERE point.within(
  property.location,
  geometryfromtext($neighborhood_boundary)
)
RETURN property.address, property.price;
```

### Vector Similarity Search

Combine graph traversal with vector search:

```gql
// Semantic search over graph structures
MATCH (doc:Document)
WHERE similarity(doc.embedding, $query_embedding) > 0.8
OPTIONAL MATCH (doc)-[:CITES]->(cited:Document)
RETURN doc.title,
       doc.abstract,
       similarity(doc.embedding, $query_embedding) AS similarity,
       collect(cited.title) AS citations
ORDER BY similarity DESC
LIMIT 20;

// Hybrid search combining keywords and vectors
MATCH (article:Article)
WHERE article.content SEARCH $keywords
WITH article, SCORE(article) AS text_score
WHERE similarity(article.embedding, $query_vector) > 0.7
RETURN article.title,
       text_score,
       similarity(article.embedding, $query_vector) AS semantic_score,
       text_score * 0.4 + semantic_score * 0.6 AS combined_score
ORDER BY combined_score DESC;
```

## Client Library Integration

### Python Advanced Usage

```python
from geode_client import Client, QueryBuilder
import asyncio

async def advanced_query_patterns():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Prepared statement caching
        stmt = await conn.prepare("""
            MATCH (u:User {id: $user_id})-[:FRIEND*1..2]->(friend)
            RETURN DISTINCT friend.name, friend.email
        """)

        # Execute with different parameters
        for user_id in range(1, 100):
            result, _ = await stmt.execute(user_id=user_id)
            friends = [row for row in result.rows]
            print(f"User {user_id} has {len(friends)} friends")

        # Transaction with savepoints
        async with client.connection() as txn:
            await txn.begin()
            await txn.execute("CREATE (u:User {id: 1000, name: 'Alice'})")

            await txn.savepoint("after_user")

            try:
                await txn.execute("""
                    MATCH (u:User {id: 1000})
                    CREATE (u)-[:POSTED]->(p:Post {title: 'Hello'})
                """)
            except Exception as e:
                await txn.rollback_to("after_user")
                print(f"Post creation failed: {e}")

            # Transaction commits automatically on context exit

        # Streaming large result sets
        query = """
            MATCH (n:Node)
            RETURN n.id, n.data
            ORDER BY n.created_at
        """

        async with client.stream(query) as stream:
            batch = []
            for row in stream.rows:
                batch.append(row)
                if len(batch) >= 1000:
                    await process_batch(batch)
                    batch = []

            if batch:
                await process_batch(batch)

async def process_batch(batch):
    # Process batch of results
    pass

asyncio.run(advanced_query_patterns())
```

### Go Advanced Usage

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "time"

    _ "geodedb.com/geode"
)

func advancedQueries() error {
    db, err := sql.Open("geode", "quic://localhost:3141")
    if err != nil {
        return err
    }
    defer db.Close()

    // Connection pooling configuration
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(10)
    db.SetConnMaxLifetime(5 * time.Minute)

    ctx := context.Background()

    // Prepared statements
    stmt, err := db.PrepareContext(ctx, `
        MATCH (u:User {id: $1})-[:PURCHASED]->(p:Product)
        WHERE p.price > $2
        RETURN p.name, p.price
        ORDER BY p.price DESC
    `)
    if err != nil {
        return err
    }
    defer stmt.Close()

    // Execute with different parameters
    rows, err := stmt.QueryContext(ctx, 123, 100.0)
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var name string
        var price float64
        if err := rows.Scan(&name, &price); err != nil {
            return err
        }
        fmt.Printf("%s: $%.2f\n", name, price)
    }

    // Transaction with retry logic
    return withRetry(ctx, db, func(tx *sql.Tx) error {
        _, err := tx.ExecContext(ctx, `
            MATCH (account:Account {id: $1})
            WHERE account.balance >= $2
            SET account.balance = account.balance - $2
        `, "acc_123", 50.0)
        return err
    })
}

func withRetry(ctx context.Context, db *sql.DB, fn func(*sql.Tx) error) error {
    maxRetries := 3
    for attempt := 0; attempt < maxRetries; attempt++ {
        tx, err := db.BeginTx(ctx, nil)
        if err != nil {
            return err
        }

        err = fn(tx)
        if err != nil {
            tx.Rollback()
            if isSerializationError(err) && attempt < maxRetries-1 {
                time.Sleep(time.Millisecond * time.Duration(1<<attempt))
                continue
            }
            return err
        }

        return tx.Commit()
    }
    return fmt.Errorf("max retries exceeded")
}

func isSerializationError(err error) bool {
    // Check for serialization error
    return false // Implement based on error codes
}
```

## Troubleshooting Common Issues

### Query Performance Problems

**Symptom**: Slow query execution

**Diagnosis**:

```gql
-- Use EXPLAIN to see query plan
EXPLAIN
MATCH (u:User)-[:FRIEND*1..3]->(friend)
WHERE u.country = 'USA'
RETURN friend.name;

-- Use PROFILE for detailed metrics
PROFILE
MATCH (u:User)-[:FRIEND*1..3]->(friend)
WHERE u.country = 'USA'
RETURN friend.name;
```

**Solutions**:

- Add indexes on frequently filtered properties
- Rewrite variable-length patterns with LIMIT
- Break complex queries into smaller pieces with WITH
- Use OPTIONAL MATCH instead of EXISTS when appropriate

### Memory Issues with Large Result Sets

**Symptom**: Out of memory errors

**Solutions**:

```gql
-- Add LIMIT to bound results
MATCH (n:Node)
RETURN n
LIMIT 10000;

-- Use aggregation to reduce result size
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN p.category, count(u) AS buyers
ORDER BY buyers DESC;

-- Process in batches
MATCH (n:Node)
WITH n
SKIP $offset
LIMIT $batch_size
RETURN n;
```

### Deadlock and Conflict Errors

**Symptom**: Transaction aborted due to conflicts

**Solutions**:

- Implement retry logic with exponential backoff
- Access resources in consistent order
- Keep transactions short
- Use optimistic locking patterns

```python
from geode_client import QueryError

async def retry_on_conflict(client, query, params, max_attempts=3):
    for attempt in range(max_attempts):
        async with client.connection() as conn:
            await conn.begin()
            try:
                page, _ = await conn.query(query, params)
                await conn.commit()
                return page
            except QueryError as exc:
                await conn.rollback()
                if "40502" not in str(exc):
                    raise
                if attempt == max_attempts - 1:
                    raise
            await asyncio.sleep(0.1 * (2 ** attempt))
```

## Production Deployment Best Practices

### Monitoring and Observability

```python
# Export query metrics
from prometheus_client import Counter, Histogram

query_duration = Histogram(
    'geode_query_duration_seconds',
    'Query execution time',
    ['query_type']
)

query_errors = Counter(
    'geode_query_errors_total',
    'Query error count',
    ['error_type']
)

async def monitored_query(client, query, params):
    start = time.time()
    try:
        result, _ = await client.query(query, params)
        query_duration.labels(query_type='read').observe(time.time() - start)
        return result
    except Exception as e:
        query_errors.labels(error_type=type(e).__name__).inc()
        raise
```

### Query Caching Strategy

```python
from functools import lru_cache
import hashlib

class QueryCache:
    def __init__(self, max_size=1000, ttl=300):
        self.cache = {}
        self.max_size = max_size
        self.ttl = ttl

    def get_cache_key(self, query, params):
        return hashlib.md5(
            f"{query}:{params}".encode()
        ).hexdigest()

    async def execute(self, client, query, params):
        cache_key = self.get_cache_key(query, params)

        if cache_key in self.cache:
            entry = self.cache[cache_key]
            if time.time() - entry['timestamp'] < self.ttl:
                return entry['result']

        result, _ = await client.query(query, params)

        self.cache[cache_key] = {
            'result': result,
            'timestamp': time.time()
        }

        return result
```

### Load Balancing and Failover

```python
class GeodeCluster:
    def __init__(self, nodes):
        self.nodes = nodes
        self.current_index = 0

    async def get_client(self):
        """Round-robin load balancing."""
        for _ in range(len(self.nodes)):
            node = self.nodes[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.nodes)

            try:
                client = Client(host=node['host'], port=node['port'])
                conn = await client.connect()
                try:
                    await conn.query("RETURN 1")
                    return conn
                except Exception:
                    await conn.close()
                    continue
            except Exception:
                continue

        raise Exception("No healthy nodes available")

    async def execute(self, query, params):
        conn = await self.get_client()
        try:
            result, _ = await conn.query(query, params)
            return result
        finally:
            await conn.close()
```

Geode's GQL implementation aligned with the conformance profile provides a production-ready platform for graph workloads. Whether you're building social networks, fraud detection systems, recommendation engines, or knowledge graphs, GQL's declarative syntax and Geode's optimized execution deliver both developer productivity and runtime performance.
