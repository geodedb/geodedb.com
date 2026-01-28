---
title: "Index Strategy Guide"
description: "Design effective indexing strategies for optimal Geode query performance"
weight: 21
tags: ["indexing", "performance", "optimization", "schema"]
categories: ["guides", "performance"]
keywords:
  - index strategy
  - database indexing
  - Geode indexes
  - query optimization
  - composite indexes
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Index Strategy Guide

Indexes are the foundation of query performance in Geode. This guide helps you analyze your query patterns, choose appropriate index types, and maintain indexes effectively.

## Index Fundamentals

### What Indexes Do

Indexes create auxiliary data structures that allow Geode to find nodes quickly without scanning all nodes with a given label. Without an index, finding a user by email requires examining every User node:

**Without index** - O(n) scan:
```gql
MATCH (u:User)
WHERE u.email = "alice@example.com"
RETURN u
// Scans all User nodes
```

**With index** - O(log n) lookup:
```gql
// After: CREATE INDEX user_email ON :User(email)
MATCH (u:User {email: "alice@example.com"})
RETURN u
// Direct index lookup
```

### Index Types in Geode

Geode supports several index types:

| Type | Use Case | Example |
|------|----------|---------|
| **B-tree** | Equality, range queries | `CREATE INDEX ON :User(age)` |
| **Hash** | Equality only (faster) | `CREATE HASH INDEX ON :User(id)` |
| **Composite** | Multi-property lookups | `CREATE INDEX ON :User(country, city)` |
| **Full-text** | Text search | `CREATE FULLTEXT INDEX ON :Product(name, description)` |
| **Unique** | Enforce uniqueness + index | `CREATE CONSTRAINT ON :User(email) ASSERT UNIQUE` |

## Analyzing Query Patterns

### Identify High-Frequency Queries

Before creating indexes, understand your query patterns:

1. **Log production queries** to identify the most frequent
2. **Profile critical paths** in your application
3. **Review slow query logs** for optimization candidates

**Example analysis**:
```
Query Pattern                                  Frequency  Avg Time
--------------------------------------------  ---------  --------
MATCH (u:User {email: ?})                     100k/day   45ms
MATCH (p:Product) WHERE p.price < ?           50k/day    120ms
MATCH (o:Order {status: ?})                   30k/day    80ms
MATCH (u:User)-[:PURCHASED]->(p:Product)      20k/day    15ms
```

### Identify Index Candidates

From the analysis above, prioritize:

1. **High frequency + high latency**: Product price queries
2. **High frequency**: User email lookups
3. **Moderate frequency + moderate latency**: Order status queries

### Check Existing Index Usage

See which indexes exist and their usage:

```gql
// Show all indexes
SHOW INDEXES

// Output:
// | name         | type    | label   | properties    | state  |
// |--------------|---------|---------|---------------|--------|
// | user_email   | BTREE   | User    | [email]       | ONLINE |
// | product_name | BTREE   | Product | [name]        | ONLINE |
```

Use EXPLAIN to verify index usage:

```gql
EXPLAIN
MATCH (u:User {email: "alice@example.com"})
RETURN u

// Look for "NodeIndexSeek" instead of "NodeByLabelScan"
```

## Choosing the Right Index Type

### B-tree Indexes

The default and most versatile index type. Use for:

- Equality comparisons (`=`)
- Range queries (`<`, `>`, `<=`, `>=`)
- Prefix matching (`STARTS WITH`)
- Sorting (`ORDER BY`)

```gql
// Create B-tree index
CREATE INDEX product_price ON :Product(price)

// Supports these queries:
MATCH (p:Product {price: 99.99}) RETURN p          // Equality
MATCH (p:Product) WHERE p.price < 100 RETURN p     // Range
MATCH (p:Product) WHERE p.price BETWEEN 50 AND 100 RETURN p  // Range
```

### Hash Indexes

Faster than B-tree for equality only. Use when:

- Only equality lookups needed
- No range queries on this property
- Maximum lookup performance required

```gql
// Create hash index
CREATE HASH INDEX user_id ON :User(id)

// Optimal for:
MATCH (u:User {id: "usr_12345"}) RETURN u

// NOT suitable for:
MATCH (u:User) WHERE u.id > "usr_10000" RETURN u  // Won't use hash index
```

### Composite Indexes

Index multiple properties together. Use when:

- Queries filter on multiple properties
- Specific property combinations are common
- Single-property indexes aren't selective enough

```gql
// Create composite index
CREATE INDEX user_location ON :User(country, city)

// Optimal for:
MATCH (u:User {country: "USA", city: "NYC"}) RETURN u  // Uses full index
MATCH (u:User {country: "USA"}) RETURN u               // Uses index prefix

// NOT optimal for:
MATCH (u:User {city: "NYC"}) RETURN u  // Can't use index (missing leading property)
```

### Full-Text Indexes

For text search operations. Use when:

- Searching within text content
- Need CONTAINS or fuzzy matching
- Building search functionality

```gql
// Create full-text index
CREATE FULLTEXT INDEX product_search ON :Product(name, description)

// Query with full-text search
CALL db.index.fulltext.queryNodes("product_search", "wireless bluetooth")
YIELD node, score
RETURN node.name, score
ORDER BY score DESC
LIMIT 10
```

### Unique Constraints

Enforce uniqueness while creating an implicit index:

```gql
// Create unique constraint (also creates index)
CREATE CONSTRAINT user_email_unique ON :User(email) ASSERT UNIQUE

// Automatically indexed and enforces uniqueness
MATCH (u:User {email: "alice@example.com"}) RETURN u
```

## Index Coverage and Selectivity

### Understanding Selectivity

**Selectivity** measures how well an index narrows down results. High selectivity is better.

| Property | Unique Values | Total Nodes | Selectivity |
|----------|---------------|-------------|-------------|
| email    | 1,000,000     | 1,000,000   | 100% (excellent) |
| country  | 200           | 1,000,000   | 0.02% (poor) |
| status   | 5             | 1,000,000   | 0.0005% (very poor) |

**High selectivity** (good index candidates):
- User IDs, emails, usernames
- Product SKUs, ISBNs
- Order numbers, transaction IDs

**Low selectivity** (poor index candidates alone):
- Boolean flags (active/inactive)
- Status fields (few values)
- Country codes

### Improving Selectivity with Composite Indexes

Combine low-selectivity properties for better performance:

```gql
// Poor: Low selectivity on country alone
CREATE INDEX user_country ON :User(country)

// Better: Composite improves selectivity
CREATE INDEX user_country_city ON :User(country, city)

// Query benefits from higher combined selectivity
MATCH (u:User {country: "USA", city: "San Francisco"})
RETURN u
```

### Index Coverage

An index "covers" a query when all needed data is in the index itself, avoiding node lookup:

```gql
// Covered query - index has all needed properties
// Index: CREATE INDEX ON :User(email, name)
MATCH (u:User {email: "alice@example.com"})
RETURN u.name  // Retrieved from index, no node access

// Non-covered query - requires node access
MATCH (u:User {email: "alice@example.com"})
RETURN u.name, u.created_at  // created_at not in index
```

Consider covering indexes for your most critical queries:

```gql
// Create covering index for common query
CREATE INDEX user_email_profile ON :User(email, name, avatar_url)

// This query is fully covered:
MATCH (u:User {email: $email})
RETURN u.name, u.avatar_url
```

## Composite Index Ordering

### Property Order Matters

In composite indexes, the order of properties affects which queries can use the index:

```gql
// Index: (country, city, zip)
CREATE INDEX user_geo ON :User(country, city, zip)

// Can use index (matches prefix):
MATCH (u:User {country: "USA"}) ...                          // Uses index
MATCH (u:User {country: "USA", city: "NYC"}) ...             // Uses index
MATCH (u:User {country: "USA", city: "NYC", zip: "10001"}) ... // Uses index

// Cannot use index (skips prefix):
MATCH (u:User {city: "NYC"}) ...                             // Full scan
MATCH (u:User {zip: "10001"}) ...                            // Full scan
MATCH (u:User {country: "USA", zip: "10001"}) ...            // Partial scan
```

### Ordering Guidelines

1. **Most filtered first**: Put the most commonly filtered property first
2. **High selectivity first**: Put more selective properties earlier
3. **Equality before range**: Equality predicates should precede range predicates

**Example**:
```gql
// Query pattern:
MATCH (o:Order)
WHERE o.status = "pending" AND o.created_at > $since
RETURN o

// Good index order (equality first, then range):
CREATE INDEX order_status_date ON :Order(status, created_at)

// Poor index order (range first):
CREATE INDEX order_date_status ON :Order(created_at, status)  // Less efficient
```

### Multiple Index Strategies

For different query patterns, you may need multiple indexes:

```gql
// Query 1: Filter by status, sort by date
MATCH (o:Order {status: "pending"})
RETURN o ORDER BY o.created_at DESC

// Query 2: Filter by customer, sort by date
MATCH (o:Order {customer_id: $id})
RETURN o ORDER BY o.created_at DESC

// Create indexes for both patterns:
CREATE INDEX order_status_date ON :Order(status, created_at)
CREATE INDEX order_customer_date ON :Order(customer_id, created_at)
```

## Index Maintenance Overhead

### Write Performance Impact

Every index adds overhead to write operations:

| Operation | Without Index | With 1 Index | With 3 Indexes |
|-----------|---------------|--------------|----------------|
| CREATE    | 1x            | 1.2x         | 1.6x           |
| SET       | 1x            | 1.1x (if indexed prop) | 1.3x |
| DELETE    | 1x            | 1.2x         | 1.6x           |

### Memory Usage

Indexes consume memory. Monitor index memory:

```gql
// Check index sizes
CALL db.indexes() YIELD name, size
RETURN name, size
ORDER BY size DESC
```

### Balancing Read vs Write Performance

Consider your workload characteristics:

**Read-heavy workloads** (90% reads, 10% writes):
- More indexes are acceptable
- Prioritize query performance
- Consider covering indexes

**Write-heavy workloads** (30% reads, 70% writes):
- Minimize indexes
- Only index critical query paths
- Avoid redundant indexes

**Balanced workloads**:
- Index selectively
- Monitor both read and write latencies
- Review index usage periodically

## Monitoring Index Usage

### Check Index Statistics

```gql
// View index usage statistics
CALL db.indexes() YIELD name, type, state, populationPercent, size, usageCount
RETURN name, type, state, populationPercent, size, usageCount
ORDER BY usageCount DESC
```

### Identify Unused Indexes

Indexes with zero or low usage count may be candidates for removal:

```gql
// Find potentially unused indexes
CALL db.indexes() YIELD name, usageCount
WHERE usageCount < 100  // Threshold depends on your usage
RETURN name, usageCount
```

### Profile Query Index Usage

```gql
PROFILE
MATCH (u:User {country: "USA", city: "NYC"})
RETURN u.name

// Check output for:
// - "NodeIndexSeek" = index used
// - "NodeByLabelScan" = index NOT used
```

## When NOT to Index

### Avoid Indexing

**Low-selectivity properties**:
```gql
// Poor: Boolean with ~50/50 distribution
CREATE INDEX user_active ON :User(active)  // Only 2 values

// Usually better: Combine with other properties
CREATE INDEX user_active_created ON :User(active, created_at)
```

**Rarely queried properties**:
```gql
// Avoid: Internal metadata rarely searched
CREATE INDEX user_internal_notes ON :User(internal_notes)
```

**Frequently updated properties**:
```gql
// Avoid: Properties that change constantly
CREATE INDEX user_last_seen ON :User(last_seen_at)  // Updates every request

// Better: Batch updates or use different strategy
```

**Very large text properties**:
```gql
// Avoid: Large text blobs
CREATE INDEX article_content ON :Article(content)  // May be megabytes

// Better: Use full-text index for searchable content
CREATE FULLTEXT INDEX article_search ON :Article(title, summary)
```

### Alternative Strategies

**Denormalization** instead of indexing:
```gql
// Instead of indexing deep traversals, denormalize
// Add commonly needed data directly to nodes
SET user.company_name = "Acme Corp"  // Avoid JOIN/traverse
```

**Materialized aggregates**:
```gql
// Instead of counting on every query
// Maintain a count property
SET user.post_count = user.post_count + 1
```

**Application-level caching**:
```python
# Cache frequently accessed, rarely changed data
@cache(ttl=3600)
def get_user_by_email(email):
    return db.query("MATCH (u:User {email: $email}) RETURN u", email=email)
```

## Index Creation Best Practices

### Naming Conventions

Use descriptive, consistent names:

```gql
// Good: label_property pattern
CREATE INDEX user_email ON :User(email)
CREATE INDEX product_sku ON :Product(sku)
CREATE INDEX order_status_date ON :Order(status, created_at)

// Good: Include purpose for special indexes
CREATE INDEX user_search_name ON :User(normalized_name)  // For search
CREATE INDEX user_unique_email ON :User(email)           // Unique constraint

// Avoid: Cryptic names
CREATE INDEX idx1 ON :User(email)
CREATE INDEX ue ON :User(email)
```

### Creating Indexes in Production

Create indexes asynchronously to avoid blocking:

```gql
// Create index (may block queries during build)
CREATE INDEX user_email ON :User(email)

// Monitor index build progress
SHOW INDEXES
WHERE name = "user_email"
// State will be "POPULATING" then "ONLINE"
```

For large databases, schedule index creation during low-traffic periods.

### Testing Index Effectiveness

Before deploying new indexes:

1. **Test in staging** with production-like data
2. **Profile before and after**:

```gql
// Before index
PROFILE
MATCH (u:User {email: "test@example.com"})
RETURN u
// Note: NodeByLabelScan, rows examined, time

// Create index
CREATE INDEX user_email ON :User(email)

// After index
PROFILE
MATCH (u:User {email: "test@example.com"})
RETURN u
// Note: NodeIndexSeek, rows examined, time
```

3. **Monitor write performance** for regression

## Index Strategy Checklist

When designing your index strategy:

- [ ] **Analyzed query patterns** - Know your most frequent and critical queries
- [ ] **Identified selective properties** - Focus on high-cardinality fields
- [ ] **Chosen appropriate types** - B-tree, hash, composite, or full-text
- [ ] **Ordered composite indexes correctly** - Equality before range, selective first
- [ ] **Considered write impact** - Balance read performance with write overhead
- [ ] **Planned for monitoring** - Track index usage and query performance
- [ ] **Documented decisions** - Record why each index exists
- [ ] **Scheduled reviews** - Periodically audit index effectiveness

## Common Index Patterns

### User Lookup Pattern

```gql
// Primary lookup by ID (unique)
CREATE CONSTRAINT user_id_unique ON :User(id) ASSERT UNIQUE

// Login by email (unique)
CREATE CONSTRAINT user_email_unique ON :User(email) ASSERT UNIQUE

// Search by username (frequent lookups)
CREATE INDEX user_username ON :User(username)

// Filter by status and date
CREATE INDEX user_status_created ON :User(status, created_at)
```

### E-commerce Pattern

```gql
// Product lookup
CREATE CONSTRAINT product_sku_unique ON :Product(sku) ASSERT UNIQUE
CREATE INDEX product_category_price ON :Product(category, price)
CREATE FULLTEXT INDEX product_search ON :Product(name, description)

// Order lookup
CREATE CONSTRAINT order_number_unique ON :Order(order_number) ASSERT UNIQUE
CREATE INDEX order_customer_date ON :Order(customer_id, created_at)
CREATE INDEX order_status_date ON :Order(status, created_at)
```

### Social Network Pattern

```gql
// User lookup
CREATE CONSTRAINT user_handle_unique ON :User(handle) ASSERT UNIQUE
CREATE INDEX user_name ON :User(name)

// Post lookup
CREATE INDEX post_author_date ON :Post(author_id, created_at)
CREATE INDEX post_visibility_date ON :Post(visibility, created_at)
CREATE FULLTEXT INDEX post_content ON :Post(text)
```

## Summary

Effective index strategy requires:

1. **Understanding your queries**: Know what you search for and how often
2. **Choosing the right type**: Match index type to query pattern
3. **Optimizing selectivity**: Index high-cardinality properties
4. **Ordering composites correctly**: Equality first, then range, most selective first
5. **Balancing trade-offs**: Consider write overhead and memory usage
6. **Monitoring continuously**: Track usage and remove unused indexes

## Related Guides

- [Query Performance Guide](/guides/query-performance/) - Write efficient queries
- [Query Profiling Guide](/guides/query-profiling/) - Analyze execution plans
- [Graph Modeling Guide](/guides/graph-modeling/) - Schema design for performance

---

**Questions?** Discuss indexing strategies in our [forum](https://forum.geodedb.com).
