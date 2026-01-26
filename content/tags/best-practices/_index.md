---
title: "Best Practices & Design Patterns"
description: "Comprehensive best practices for Geode graph database including schema design, query optimization, indexing strategies, transaction management, security patterns, performance tuning, and production deployment guidelines."
keywords:
  - best practices
  - design patterns
  - schema design
  - query optimization
  - performance tuning
  - security patterns
  - production deployment
  - Geode
  - graph database
  - GQL
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/best-practices/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Best Practices & Design Patterns

Building production-ready graph applications with Geode requires understanding not just the technology, but proven patterns and practices that ensure performance, maintainability, and scalability. This comprehensive guide covers schema design, query optimization, security, and operational best practices for Geode deployments.

## Schema Design Best Practices

### 1. Model for Your Queries

Design your graph schema based on how you'll query it, not just the domain structure.

**Good Practice**:
```gql
-- If you frequently query "products a user might like"
-- Model supports this pattern:
MATCH (u:User {id: $user_id})-[:LIKES]->(cat:Category)
MATCH (p:Product)-[:IN_CATEGORY]->(cat)
WHERE NOT EXISTS { MATCH (u)-[:PURCHASED]->(p) }
RETURN p.name, count(cat) AS relevance
ORDER BY relevance DESC;
```

**Poor Practice**:
```gql
-- Model that doesn't support common queries efficiently
-- Requires complex traversals or multiple queries
```

### 2. Choose Appropriate Granularity

**When to Use Nodes**:
- Entity referenced by multiple others
- Has its own relationships
- Queried independently
- Complex structure

**When to Use Properties**:
- Simple attribute values
- Unique to parent entity
- Not queried independently
- No relationships

```gql
-- GOOD: Shared address as node
INSERT (addr:Address {street: '123 Main St', city: 'Austin'});
INSERT (alice:Person)-[:LIVES_AT]->(addr);
INSERT (bob:Person)-[:LIVES_AT]->(addr);

-- GOOD: Unique email as property
INSERT (charlie:Person {email: 'charlie@example.com'});

-- BAD: Address as string property (can't be shared/queried)
INSERT (dave:Person {address: '456 Oak St, Dallas, TX'});
```

### 3. Use Meaningful Relationship Types

Choose specific, action-oriented relationship types:

```gql
-- GOOD: Clear, specific relationships
(person:Person)-[:WORKS_AT]->(company:Company)
(user:User)-[:PURCHASED]->(product:Product)
(employee:Employee)-[:REPORTS_TO]->(manager:Manager)

-- BAD: Generic, unclear relationships
(entity1)-[:RELATED_TO]->(entity2)
(node1)-[:CONNECTS]->(node2)
```

### 4. Avoid Super Nodes

Nodes with millions of relationships degrade performance.

**Problem**:
```gql
-- Country node with millions of users
INSERT (user)-[:LIVES_IN]->(usa:Country);  -- Repeated millions of times
```

**Solutions**:
```gql
-- Solution 1: Use property + index
INSERT (user:User {country: 'USA'});
CREATE INDEX user_country ON User(country);

-- Solution 2: Add intermediate nodes
INSERT (user)-[:LIVES_IN]->(state:State);
INSERT (state)-[:IN_COUNTRY]->(country:Country);
```

### 5. Normalize Appropriately

Unlike relational databases, some denormalization improves performance:

```gql
-- Acceptable denormalization for performance
INSERT (order:Order {
  id: 'o123',
  customer_id: 'c456',
  customer_name: 'Alice',  -- Denormalized
  customer_email: 'alice@example.com',  -- Denormalized
  total: 299.99
});
-- Also maintain relationship
INSERT (order)-[:PLACED_BY]->(customer:Customer {id: 'c456'});
```

## Query Optimization

### 1. Use Parameterized Queries

Always use parameters for reusable, cacheable query plans:

```gql
-- GOOD: Parameterized
MATCH (p:Person {name: $person_name})
RETURN p.age, p.city;

-- BAD: Literal values (prevents plan caching)
MATCH (p:Person {name: 'Alice'})
RETURN p.age, p.city;
```

From client code:
```python
# Python
result = await client.query(
    "MATCH (p:Person {name: $name}) RETURN p.age",
    parameters={"name": user_input}
)
```

### 2. Profile Slow Queries

Use PROFILE to understand execution:

```gql
PROFILE
MATCH (p:Person)-[:KNOWS*2..4]->(friend)
WHERE p.city = 'San Francisco'
RETURN friend.name;
```

Analyze:
- Execution plan
- Operator costs
- Index usage
- Estimated vs actual rows

### 3. Create Strategic Indexes

Index properties used for lookups and filtering:

```gql
-- Single-column indexes
CREATE INDEX user_email ON User(email);
CREATE INDEX product_sku ON Product(sku);

-- Composite indexes for multi-property queries
CREATE INDEX product_category_price ON Product(category, price);

-- Full-text search
CREATE FULLTEXT INDEX product_search ON Product(name, description);
```

### 4. Limit Result Sets

Always use LIMIT for unbounded queries:

```gql
-- GOOD: Limited results
MATCH (p:Person)
RETURN p.name
ORDER BY p.created DESC
LIMIT 100;

-- BAD: Unbounded (could return millions)
MATCH (p:Person)
RETURN p.name;
```

### 5. Avoid Cartesian Products

Be careful with multiple MATCH clauses:

```gql
-- BAD: Creates cartesian product
MATCH (p:Person)
MATCH (c:Company)
RETURN p.name, c.name;  -- Returns p_count * c_count rows

-- GOOD: Use relationships
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN p.name, c.name;
```

## Indexing Strategies

### 1. Index High-Selectivity Properties

Index properties that narrow down results significantly:

```gql
-- High selectivity (good for indexing)
CREATE INDEX user_email ON User(email);  -- Unique or near-unique
CREATE INDEX product_sku ON Product(sku);

-- Low selectivity (poor candidate)
-- CREATE INDEX user_active ON User(active);  -- Only true/false
```

### 2. Composite Indexes for Multi-Property Queries

```gql
-- Create composite index
CREATE INDEX order_customer_date ON Order(customer_id, order_date);

-- Efficiently supports this query
MATCH (o:Order)
WHERE o.customer_id = $cust_id
  AND o.order_date >= DATE '2024-01-01'
RETURN o;
```

### 3. Monitor Index Usage

```gql
-- Check index statistics
SHOW INDEXES;

-- Profile to verify index usage
PROFILE
MATCH (u:User {email: $email})
RETURN u.name;
```

## Transaction Management

### 1. Keep Transactions Short

Minimize transaction duration to reduce lock contention:

```gql
-- GOOD: Short transaction
BEGIN TRANSACTION;
INSERT (order:Order {id: 'o123', total: 99.99});
MATCH (user:User {id: 'u456'})
INSERT (user)-[:PLACED]->(order);
COMMIT;

-- BAD: Long-running transaction
BEGIN TRANSACTION;
-- Complex data processing...
-- Multiple network calls...
-- User input...
COMMIT;  -- Holds locks too long
```

### 2. Use Savepoints for Partial Rollback

```gql
BEGIN TRANSACTION;

INSERT (user:User {name: 'Alice'});
SAVEPOINT sp1;

-- Risky operation
INSERT (payment:Payment {amount: 999.99});

-- Rollback just this operation if needed
ROLLBACK TO SAVEPOINT sp1;

-- Continue with transaction
INSERT (user:User {name: 'Bob'});
COMMIT;
```

### 3. Handle Transaction Errors

```python
# Python example
async def create_order(user_id, items):
    async with client.transaction() as tx:
        try:
            await tx.execute(
                "INSERT (o:Order {id: $id, total: $total})",
                {"id": order_id, "total": total}
            )
            await tx.execute(
                "MATCH (u:User {id: $uid}) INSERT (u)-[:PLACED]->(o:Order {id: $oid})",
                {"uid": user_id, "oid": order_id}
            )
            await tx.commit()
        except Exception as e:
            await tx.rollback()
            raise
```

## Security Best Practices

### 1. Use Row-Level Security (RLS)

Define security policies in the database:

```gql
-- Tenant isolation
CREATE POLICY tenant_isolation ON ALL
USING (tenant_id = current_tenant());

-- User data access
CREATE POLICY user_data_access ON User
USING (id = current_user_id() OR current_user_role = 'admin');

-- Confidential relationships
CREATE POLICY salary_access ON EARNS_SALARY
USING (current_user_role IN ['hr', 'admin']);
```

### 2. Never Trust Client Input

Always use parameterized queries:

```python
# GOOD: Parameterized
user_input = request.get_param('name')
result = await client.query(
    "MATCH (p:Person {name: $name}) RETURN p",
    {"name": user_input}
)

# BAD: String concatenation (injection risk!)
# query = f"MATCH (p:Person {{name: '{user_input}'}}) RETURN p"
```

### 3. Implement Audit Logging

Log all data modifications:

```gql
-- Geode automatically logs all mutations
-- Review audit logs regularly
-- Example: check recent mutations
CALL system.audit_log(CURRENT_TIMESTAMP - DURATION 'P7D');
```

### 4. Use TLS for All Connections

Geode enforces TLS 1.3 by default - don't disable it:

```bash
# Client connection (TLS required)
geode-client connect --host geode.example.com:3141 --tls-verify
```

## Performance Tuning

### 1. Batch Operations

Use UNWIND for bulk inserts:

```gql
-- Efficient batch insert
UNWIND $users AS user_data
INSERT (u:User {
  id: user_data.id,
  name: user_data.name,
  email: user_data.email
});
```

From application:
```python
users = [
    {"id": "u1", "name": "Alice", "email": "alice@example.com"},
    {"id": "u2", "name": "Bob", "email": "bob@example.com"},
    # ... thousands more
]
await client.query(
    "UNWIND $users AS u INSERT (user:User {id: u.id, name: u.name})",
    {"users": users}
)
```

### 2. Use Connection Pooling

Configure appropriate pool sizes:

```python
# Python
client = GeodeClient(
    "localhost:3141",
    pool_size=20,  # Adjust based on workload
    max_overflow=10
)
```

```go
// Go
db, err := sql.Open("geode", "geode://localhost:3141?pool_size=20")
```

### 3. Monitor Query Performance

Track slow queries:

```python
import logging

# Log slow queries
async def execute_with_timing(query, params):
    start = time.time()
    result = await client.query(query, params)
    duration = time.time() - start
    
    if duration > 1.0:  # Log queries over 1 second
        logging.warning(f"Slow query ({duration:.2f}s): {query}")
    
    return result
```

### 4. Cache Frequently Accessed Data

```python
from functools import lru_cache
import asyncio

# Cache user lookups
user_cache = {}

async def get_user(user_id):
    if user_id in user_cache:
        return user_cache[user_id]
    
    result = await client.query(
        "MATCH (u:User {id: $id}) RETURN u",
        {"id": user_id}
    )
    user_cache[user_id] = result
    return result
```

## Application Integration

### 1. Use Prepared Statements

```python
# Prepare once, execute many times
prepared = await client.prepare(
    "MATCH (p:Person {id: $id}) RETURN p.name, p.email"
)

# Execute with different parameters
for user_id in user_ids:
    result = await prepared.execute({"id": user_id})
```

### 2. Handle Concurrent Access

```python
import asyncio

# Process queries concurrently
async def fetch_user_data(user_ids):
    tasks = [
        client.query("MATCH (u:User {id: $id}) RETURN u", {"id": uid})
        for uid in user_ids
    ]
    results = await asyncio.gather(*tasks)
    return results
```

### 3. Implement Retry Logic

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10)
)
async def query_with_retry(query, params):
    return await client.query(query, params)
```

## Production Deployment

### 1. Resource Planning

**Minimum Resources**:
- CPU: 4 cores
- RAM: 8GB
- Storage: SSD recommended

**Scale Based on**:
- Number of nodes/relationships
- Query complexity
- Concurrent connections
- Write throughput

### 2. Backup Strategy

```bash
# Daily backups
0 2 * * * /usr/local/bin/geode backup \
  --output /backups/geode-$(date +\%Y\%m\%d).tar.gz

# Retention: keep 30 days
find /backups -name "geode-*.tar.gz" -mtime +30 -delete
```

### 3. Monitoring

Monitor key metrics:
- Query latency (p50, p95, p99)
- Throughput (queries/sec)
- Connection pool usage
- Transaction rate
- Storage growth
- Cache hit rates

```python
# Example: Prometheus metrics
from prometheus_client import Counter, Histogram

query_counter = Counter('geode_queries_total', 'Total queries')
query_duration = Histogram('geode_query_duration_seconds', 'Query duration')

@query_duration.time()
async def monitored_query(query, params):
    query_counter.inc()
    return await client.query(query, params)
```

### 4. Log Management

```yaml
# logging.conf
version: 1
handlers:
  file:
    class: logging.handlers.RotatingFileHandler
    filename: /var/log/geode/application.log
    maxBytes: 104857600  # 100MB
    backupCount: 10
loggers:
  geode:
    level: INFO
    handlers: [file]
```

## Testing Best Practices

### 1. Unit Test Queries

```python
import pytest

@pytest.mark.asyncio
async def test_user_creation():
    # Setup
    await client.query("DELETE (u:User {email: 'test@example.com'})")
    
    # Execute
    await client.query(
        "INSERT (u:User {email: $email, name: $name})",
        {"email": "test@example.com", "name": "Test User"}
    )
    
    # Verify
    result = await client.query(
        "MATCH (u:User {email: $email}) RETURN u.name",
        {"email": "test@example.com"}
    )
    assert result[0]['u.name'] == "Test User"
    
    # Cleanup
    await client.query("DELETE (u:User {email: 'test@example.com'})")
```

### 2. Integration Tests

```python
@pytest.mark.integration
async def test_order_workflow():
    # Create test data
    await client.query("INSERT (u:User {id: 'test_user'})")
    await client.query("INSERT (p:Product {id: 'test_prod', price: 99.99})")
    
    # Test workflow
    async with client.transaction() as tx:
        await tx.execute(
            "INSERT (o:Order {id: 'test_order', total: 99.99})"
        )
        await tx.execute(
            "MATCH (u:User {id: 'test_user'}), (o:Order {id: 'test_order'}) "
            "INSERT (u)-[:PLACED]->(o)"
        )
        await tx.commit()
    
    # Verify
    result = await client.query(
        "MATCH (u:User {id: 'test_user'})-[:PLACED]->(o:Order) "
        "RETURN o.total"
    )
    assert result[0]['o.total'] == 99.99
```

## Common Antipatterns to Avoid

### 1. Don't Use Properties as Arrays of IDs

```gql
-- BAD
INSERT (user:User {friend_ids: ['u2', 'u3', 'u4']});

-- GOOD
INSERT (u1:User)-[:FRIENDS_WITH]->(u2:User);
INSERT (u1)-[:FRIENDS_WITH]->(u3:User);
```

### 2. Don't Create Redundant Relationships

```gql
-- BAD: Redundant relationship
INSERT (user)-[:LIVES_IN]->(city);
INSERT (city)-[:IN_STATE]->(state);
INSERT (user)-[:LIVES_IN_STATE]->(state);  -- Derivable!

-- GOOD: Derive when needed
MATCH (user)-[:LIVES_IN]->(city)-[:IN_STATE]->(state)
RETURN state.name;
```

### 3. Don't Over-Index

```gql
-- BAD: Too many indexes
CREATE INDEX user_id ON User(id);
CREATE INDEX user_name ON User(name);
CREATE INDEX user_email ON User(email);
CREATE INDEX user_created ON User(created);
CREATE INDEX user_updated ON User(updated);
-- ... etc

-- GOOD: Strategic indexes
CREATE INDEX user_id ON User(id);  -- Primary lookup
CREATE INDEX user_email ON User(email);  -- Login
```

## Conclusion

Following these best practices ensures your Geode deployments are performant, secure, and maintainable. Focus on:

1. **Schema Design**: Model for queries, use appropriate granularity
2. **Query Optimization**: Profile, index strategically, use parameters
3. **Security**: RLS policies, parameterized queries, audit logging
4. **Performance**: Batch operations, connection pooling, caching
5. **Production**: Monitoring, backups, resource planning

Explore the documentation below for detailed guides on specific topics, advanced patterns, and troubleshooting techniques.
