---
title: "Database Features"
description: "Comprehensive overview of Geode database features: transactions, indexing, security, replication, backup, and advanced capabilities for enterprise workloads."
keywords:
  - database features
  - Geode features
  - enterprise features
  - graph database capabilities
  - transactions
  - indexing
  - security
  - replication
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/features/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Geode is an enterprise-ready graph database packed with production-grade features for reliability, performance, security, and scalability. This comprehensive guide covers all major database capabilities.

## Core Transaction Features

### ACID Compliance

Geode provides full ACID guarantees for data integrity:

```gql
// Atomic operations
BEGIN TRANSACTION;
  CREATE (:Account {id: 1, balance: 1000});
  CREATE (:Account {id: 2, balance: 500});
  MATCH (a:Account {id: 1}), (b:Account {id: 2})
  SET a.balance = a.balance - 100,
      b.balance = b.balance + 100;
COMMIT;

// Rollback on error
BEGIN TRANSACTION;
  MATCH (a:Account {id: 1})
  SET a.balance = a.balance - 10000;  // Would go negative
  // Automatically rolled back if constraint fails
COMMIT;
```

### Isolation Levels

Geode implements Serializable Snapshot Isolation (SSI) by default, the strongest isolation level, preventing all anomalies including phantom reads, dirty reads, and write skew.

```python
# Python client with explicit isolation
async with client.connection() as tx:
    # Isolation is configured server-side
    await tx.begin()
    result, _ = await tx.query("MATCH (u:User {id: $id}) RETURN u", {"id": 123})
    await tx.query("CREATE (:AuditLog {user_id: $id, action: 'login'})", {"id": 123})
    await tx.commit()
```

### Savepoints

Nested transaction control with savepoints:

```gql
BEGIN TRANSACTION;
  CREATE (:User {id: 1, name: 'Alice'});

  SAVEPOINT sp1;
  CREATE (:User {id: 2, name: 'Bob'});

  ROLLBACK TO SAVEPOINT sp1;  // Removes Bob, keeps Alice

  CREATE (:User {id: 3, name: 'Charlie'});
COMMIT;  // Commits Alice and Charlie
```

## Indexing and Performance

### Index Types

Multiple index types for different access patterns:

```gql
// B-tree index (range queries, sorting)
CREATE INDEX FOR (p:Product) ON (p.price);

// Hash index (equality lookups)
CREATE INDEX FOR (u:User) ON (u.id) USING hash;

// Text index (full-text search)
CREATE INDEX FOR (p:Post) ON (p.content) USING fulltext;

// Composite index (multi-column)
CREATE INDEX FOR (u:User) ON (u.last_name, u.first_name);

// HNSW vector index (similarity search)
CREATE INDEX FOR (d:Document) ON (d.embedding) USING vector
WITH (metric = 'cosine');

// BM25 index (ranking search)
CREATE BM25 INDEX FOR (a:Article) ON (a.title, a.body);
```

### Query Optimization

Built-in query optimization and execution planning:

```gql
// Explain query plan
EXPLAIN MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN u.name, COUNT(p);

// Profile execution with metrics
PROFILE MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE p.price > 100
RETURN u.name, COUNT(p);
```

## Security Features

### Row-Level Security (RLS)

Fine-grained access control at the data level:

```gql
// Create RLS policy
-- User.tenant_id must equal the caller's 'tenant' principal attribute
CALL geode.rls.add_attribute_policy('app', 'User', 'tenant_id', 'tenant');

// Apply policy
-- Geode has no ALTER LABEL / ALTER GRAPH / property DEFAULT DDL. Labels and
-- properties are schema-free: write the new property with SET, supplying the
-- default yourself.
MATCH (u:User) WHERE u.verified IS NULL SET u.verified = false;

// Set session context
SET app.tenant_id = 'acme';

// Query only sees tenant's data
MATCH (u:User) RETURN u;  // Automatically filtered
```

### Encryption

Data protection at rest and in transit:

```gql
// Transparent Data Encryption (TDE)
-- Configured at server level, encrypts all data files

// Field-Level Encryption (FLE)
CREATE (:User {
  name: 'Alice',
  ssn: '123-45-6789' /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar encrypt() */,
  email: 'alice@example.com' /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar encrypt() */
});

// Decrypt on retrieval
MATCH (u:User {name: 'Alice'})
RETURN u.name, u.ssn /* field-level encryption is configured with CALL geode.fle.configurefield(...), not a scalar decrypt() */ AS ssn;
```

### Authentication and Authorization

```python
# Client authentication
client = Client(
    'localhost:3141',
    username='admin',
    password='secure-password',
    tls_verify=True
)

# Role-based access control
await client.execute("""
    CREATE ROLE analyst;
    GRANT SELECT ON * TO analyst;
    GRANT analyst TO user_bob;
""")
```

## Replication and High Availability

### Streaming Replication

Real-time data replication to standby servers:

```bash
# Configure primary
geode serve --listen 0.0.0.0:3141 --replication-mode primary

# Configure replica
geode serve --listen 0.0.0.0:3142 --replication-mode replica --primary-host primary-host:3141
```

### Change Data Capture (CDC)

Stream database changes to external systems:

```python
# Poll application ChangeLog
last_seen = "1970-01-01T00:00:00Z"
async with client.connection() as conn:
    result, _ = await conn.query(
        """
        MATCH (e:ChangeLog)
        WHERE e.emitted_at > $since AND e.label IN $labels
        RETURN e.operation AS operation,
               e.label AS label,
               e.after AS after,
               e.emitted_at AS emitted_at
        ORDER BY emitted_at
        """,
        {"since": last_seen, "labels": ["User", "Product"]},
    )
    for row in result.rows:
        print(f"Operation: {row['operation'].raw_value}")  # INSERT, UPDATE, DELETE
        print(f"Label: {row['label'].raw_value}")
        print(f"Data: {row['after'].raw_value}")
        print(f"Timestamp: {row['emitted_at'].raw_value}")
```

## Backup and Recovery

### Point-in-Time Recovery

Restore to any point in transaction history:

```bash
# Create backup
geode backup create --destination /backups/geode-20240615

# Restore from backup
geode backup restore --source /backups/geode-20240615 --target /data/geode-restored

# Point-in-time restore
geode backup restore --source /backups/geode-20240615 --timestamp '2024-06-15T14:30:00Z'
```

### Continuous Backup

Automated backup scheduling:

```bash
# Configure continuous backup
geode serve --backup-enabled --backup-interval 3600 --backup-destination /backups
```

## Advanced Query Features

### Prepared Statements

Compiled queries with parameter substitution:

```python
# Prepare statement once
stmt = await client.prepare("""
    MATCH (u:User {id: $id})
    RETURN u.name, u.email
""")

# Execute multiple times with different parameters
result1, _ = await stmt.execute({"id": 1})
result2, _ = await stmt.execute({"id": 2})
result3, _ = await stmt.execute({"id": 3})
```

### Stored Procedures

Reusable database logic:

```gql
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.
  MATCH (from:Account {id: $from_id}), (to:Account {id: $to_id})
  WHERE from.balance >= $amount
  SET from.balance = from.balance - $amount,
      to.balance = to.balance + $amount;
  RETURN from, to;
COMMIT;
$$;

// Call procedure
CALL transfer_funds(1, 2, 100.0);
```

### Query Caching

Automatic result caching for repeated queries:

```python
# Enable query cache
client = Client('localhost:3141', enable_cache=True, cache_ttl=300)

# First execution hits database
result1 = await client.query("MATCH (u:User) WHERE u.active = true RETURN COUNT(u)")

# Second execution uses cache (if within TTL)
result2 = await client.query("MATCH (u:User) WHERE u.active = true RETURN COUNT(u)")
```

## Monitoring and Observability

### Performance Metrics

Built-in metrics collection:

```gql
// Query current metrics
SHOW METRICS;

// Results include:
// - queries_per_second
// - average_query_latency_ms
// - active_connections
// - cache_hit_rate
// - index_usage_stats
// - transaction_throughput
```

### Query Logging

Detailed query execution logging:

```bash
# Enable slow query log
geode serve --slow-query-log --slow-query-threshold 1000  # Log queries > 1s
```

### Health Checks

Built-in health monitoring:

```python
# Health check endpoint
health = await client.health_check()
print(f"Status: {health['status']}")  # 'healthy', 'degraded', 'unhealthy'
print(f"Uptime: {health['uptime_seconds']}")
print(f"Version: {health['version']}")
```

## Schema Management

### Constraints

Data integrity enforcement:

```gql
// Unique constraints
CREATE CONSTRAINT ON (u:User) ASSERT u.email IS UNIQUE;

// Existence constraints
CREATE CONSTRAINT ON (u:User) ASSERT EXISTS(u.email);

// Property type constraints
CREATE CONSTRAINT ON (p:Product) ASSERT p.price IS :: FLOAT;

// Check constraints
CREATE CONSTRAINT ON (u:User) ASSERT u.age >= 0 AND u.age <= 150;
```

### Schema Versioning

Track schema changes over time:

```gql
// Create versioned schema change
BEGIN SCHEMA MIGRATION 'v2.0.0';
  CREATE INDEX FOR (p:Product) ON (p.category);
  -- Geode has no ALTER LABEL / ALTER GRAPH / property DEFAULT DDL. Labels and
  -- properties are schema-free: write the new property with SET, supplying the
  -- default yourself.
  MATCH (u:User) WHERE u.verified IS NULL SET u.verified = false;
COMMIT SCHEMA MIGRATION;

// View migration history
SHOW SCHEMA MIGRATIONS;
```

## Import and Export

### Bulk Data Loading

Efficient bulk import:

```bash
# Import from CSV
geode import --format csv --file users.csv --label User --mapping id:id,name:name,email:email

# Import from JSON
geode import --format json --file data.json

# Import from Cypher/GQL dump
geode import --format gql --file database.gql
```

### Data Export

Export data in various formats:

```bash
# Export to CSV
geode export --format csv --query "MATCH (u:User) RETURN u.id, u.name, u.email" --output users.csv

# Export entire database
geode export --format gql --output database-backup.gql

# Export to JSON
geode export --format json --query "MATCH (u:User) RETURN u" --output users.json
```

## Multi-Tenancy

### Logical Isolation

Isolate tenant data within single database:

```gql
// Schema-based multi-tenancy
CREATE GRAPH tenant_acme;
CREATE GRAPH tenant_globex;

// Switch context
USE GRAPH tenant_acme;
MATCH (u:User) RETURN u;  // Only sees Acme data

// RLS-based multi-tenancy
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Label', 'access_tag', 'access_tag');
```

## Client Libraries

Polyglot client support for multiple languages:

```python
# Python (async)
from geode_client import Client
client = Client(host="localhost", port=3141)
async with client.connection() as conn:
    result, _ = await conn.query("MATCH (u:User) RETURN u")
```

```go
// Go (database/sql)
import "database/sql"
import _ "geodedb.com/geode"

db, _ := sql.Open("geode", "quic://localhost:3141")
rows, _ := db.Query("MATCH (u:User) RETURN u.name")
```

```rust
// Rust (async)
use geode_client::Client;

let client = Client::from_dsn("localhost:3141")?;
let mut conn = client.connect().await?;
let (page, _) = conn.query("MATCH (u:User) RETURN u").await?;
```

## Standards Compliance

### ISO/IEC 39075:2024 GQL

Aligned with the ISO 100% GQL compliance:

- MATCH and OPTIONAL MATCH with bounded expansions
- Deterministic ORDER BY and pagination policies
- Set operations (UNION, INTERSECT, EXCEPT)
- Diagnostics aligned to the conformance profile

### Interoperability

Standard protocol support:

- QUIC transport (RFC 9000)
- TLS 1.3 encryption (RFC 8446)
- Protobuf wire protocol
- OpenCypher compatibility layer

## Related Topics

- **Transactions**: Deep dive into transaction management
- **Security**: Comprehensive security configuration
- **Replication**: High availability setup
- **Performance**: Query optimization and tuning
- **Monitoring**: Observability and metrics

## Further Reading

- [Transaction Management](/tags/transactions/) - ACID and isolation
- [Security Guide](/tags/security/) - Authentication and encryption
- [Performance Tuning](/tags/performance/) - Optimization strategies
- [Replication Setup](/tags/replication/) - High availability
- [GQL Reference](/tags/gql-reference/) - Complete language documentation

Geode's comprehensive feature set provides everything needed for production-grade graph database deployments, from single-node development to distributed enterprise systems.

## Advanced Enterprise Features

### Multi-Tenancy Implementation

Isolate tenant data with Row-Level Security:

```python
class MultiTenantClient:
    def __init__(self, base_client):
        self.client = base_client

    async def setup_tenant_isolation(self):
        """Configure RLS policies for multi-tenancy"""
        await self.client.execute("""
            -- Create RLS policy for users
            CREATE POLICY tenant_users ON User
            USING (tenant_id = current_setting('app.tenant_id'));

            -- Create RLS policy for orders
            CREATE POLICY tenant_orders ON Order
            USING (tenant_id = current_setting('app.tenant_id'));

            -- Enable RLS
            ALTER LABEL User ENABLE ROW LEVEL SECURITY;
            ALTER LABEL Order ENABLE ROW LEVEL SECURITY;
        """)

    async def execute_for_tenant(self, tenant_id, query, params=None):
        """Execute query in tenant context"""
        async with self.client.connection() as conn:
            await conn.begin()
            try:
                # Set tenant context
                await conn.execute("""
                    SET app.tenant_id = $tenant_id
                """, {"tenant_id": tenant_id})

                # Execute query (RLS auto-applied)
                result, _ = await conn.query(query, params)
                await conn.commit()
                return result
            except Exception:
                await conn.rollback()
                raise

# Usage
client = MultiTenantClient(base_client)
await client.setup_tenant_isolation()

# Queries automatically filtered by tenant
result = await client.execute_for_tenant("tenant_123", """
    MATCH (u:User) RETURN u.name
""")  # Only sees tenant_123 users
```

### Time-Travel Queries

Query historical state with temporal data:

```gql
-- Point-in-time query
MATCH (u:User)
WHERE u.valid_from <= datetime('2024-01-15')
  AND (u.valid_to IS NULL OR u.valid_to > datetime('2024-01-15'))
RETURN u.name, u.email

-- Temporal join
MATCH (e:Employee)-[r:WORKS_FOR]->(c:Company)
WHERE r.start_date <= datetime('2023-06-01')
  AND (r.end_date IS NULL OR r.end_date >= datetime('2023-06-01'))
RETURN e.name, c.name

-- Audit trail
MATCH (a:Account {id: $account_id})-[:HAS_HISTORY]->(h:AccountHistory)
WHERE h.timestamp BETWEEN datetime('2024-01-01') AND datetime('2024-12-31')
RETURN h.balance, h.timestamp
ORDER BY h.timestamp
```

### Full-Text Search Integration

Advanced text search capabilities:

```gql
-- Create full-text index
CREATE INDEX FOR (p:Post) ON (p.title, p.content) USING fulltext;
CREATE INDEX FOR (a:Article) ON (a.body)
OPTIONS {language: 'english', stemming: true} USING fulltext;

-- Basic text search
MATCH (p:Post)
WHERE p.content CONTAINS 'graph database'
RETURN p.title, p.content

-- Ranked search with BM25
CREATE BM25 INDEX FOR (d:Document) ON (d.title, d.body);

MATCH (d:Document)
WHERE d MATCH 'graph AND (database OR query)'
RETURN d.title, score(d) as relevance
ORDER BY relevance DESC
LIMIT 10

-- Phrase search
MATCH (a:Article)
WHERE a.body CONTAINS PHRASE 'machine learning'
RETURN a.title

-- Fuzzy search
MATCH (u:User)
WHERE u.name =~ fuzzy('Alise', max_edit_distance: 2)
RETURN u.name
```

### Vector Similarity Search

Semantic search with embeddings:

```python
async def semantic_search(client, query_text, limit=10):
    """Perform semantic search using vector embeddings"""
    # Generate query embedding
    query_embedding = await generate_embedding(query_text)

    # Vector similarity search
    results, _ = await client.query("""
        MATCH (d:Document)
        WITH d, similarity(d.embedding, $query_embedding, 'cosine') as similarity
        WHERE similarity > 0.7
        RETURN d.id, d.title, d.content, similarity
        ORDER BY similarity DESC
        LIMIT $limit
    """, {
        "query_embedding": query_embedding,
        "limit": limit
    })

    return results

# HNSW index for fast approximate search
await client.execute("""
    CREATE VECTOR INDEX document_embeddings
    FOR (d:Document) ON (d.embedding)
    WITH (metric = 'cosine')
""")
```

### Graph Algorithms Library

Built-in algorithm implementations:

```gql
-- PageRank (no arguments: runs over the whole current graph)
CALL algo.pagerank.stream()
YIELD nodeId, score
MATCH (n:User) WHERE id(n) = nodeId
RETURN n.name, score
ORDER BY score DESC
LIMIT 10

-- Community Detection (Louvain)
CALL algo.louvain.stream()
YIELD nodeId, community
RETURN community, COUNT(nodeId) AS size
ORDER BY size DESC

-- Shortest Path
MATCH path = shortestPath((start:User {id: $id1})-[:KNOWS*]-(end:User {id: $id2}))
RETURN [node IN nodes(path) | node.name] as path, length(path) as distance

-- Betweenness Centrality
CALL algo.betweenness.stream()
YIELD nodeId, betweenness
MATCH (n:User) WHERE id(n) = nodeId
RETURN n.name, betweenness
ORDER BY betweenness DESC
LIMIT 20
```

### Data Validation and Constraints

Comprehensive data integrity:

```gql
-- Uniqueness constraints
CREATE CONSTRAINT ON (u:User) ASSERT u.email IS UNIQUE;
CREATE CONSTRAINT ON (p:Product) ASSERT (p.sku, p.variant) IS UNIQUE;

-- Existence constraints
CREATE CONSTRAINT ON (u:User) ASSERT EXISTS(u.email);
CREATE CONSTRAINT ON (o:Order) ASSERT EXISTS(o.customer_id);

-- Type constraints
CREATE CONSTRAINT ON (p:Product) ASSERT p.price IS :: FLOAT;
CREATE CONSTRAINT ON (u:User) ASSERT p.created_at IS :: DATETIME;

-- Check constraints
CREATE CONSTRAINT ON (u:User) ASSERT u.age BETWEEN 0 AND 150;
CREATE CONSTRAINT ON (p:Product) ASSERT p.price > 0;
CREATE CONSTRAINT ON (r:Rating) ASSERT r.score IN [1,2,3,4,5];

-- Pattern constraints
CREATE CONSTRAINT ON (u:User)
ASSERT u.email =~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';

-- Custom validation functions
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.
$$;

CREATE CONSTRAINT ON (p:Payment)
ASSERT validate_credit_card(p.card_number);
```

### Geospatial Features

Location-based queries:

```gql
-- Create spatial index
CREATE INDEX FOR (l:Location) ON (l.coordinates) USING spatial;

-- Point creation
CREATE (store:Store {
    name: 'Main Street Store',
    coordinates: point({latitude: 37.7749, longitude: -122.4194})
});

-- Distance queries
MATCH (u:User {id: $user_id}), (store:Store)
WITH u, store, distance(u.location, store.location) as dist_meters
WHERE dist_meters < 5000  // Within 5km
RETURN store.name, dist_meters
ORDER BY dist_meters

-- Polygon containment
MATCH (p:Place)
WHERE contains(
    geometryfromtext([
        point({latitude: 37.8, longitude: -122.5}),
        point({latitude: 37.8, longitude: -122.3}),
        point({latitude: 37.7, longitude: -122.3}),
        point({latitude: 37.7, longitude: -122.5})
    ]),
    p.location
)
RETURN p.name
```

### Query Result Caching

Intelligent result caching:

```python
from functools import lru_cache
import hashlib

class CachedClient:
    def __init__(self, client, cache_backend):
        self.client = client
        self.cache = cache_backend

    def cache_key(self, query, params):
        """Generate cache key from query and params"""
        content = f"{query}:{json.dumps(params, sort_keys=True)}"
        return hashlib.sha256(content.encode()).hexdigest()

    async def execute_cached(self, query, params=None, ttl=300):
        """Execute query with result caching"""
        key = self.cache_key(query, params)

        # Check cache
        cached = await self.cache.get(key)
        if cached:
            return json.loads(cached)

        # Execute query
        result, _ = await self.client.query(query, params)

        # Store in cache
        await self.cache.set(key, json.dumps(result), ex=ttl)

        return result

    async def invalidate_pattern(self, pattern):
        """Invalidate cached queries matching pattern"""
        keys = await self.cache.keys(f"{pattern}*")
        if keys:
            await self.cache.delete(*keys)
```

### Batch Operations

Efficient bulk data processing:

```python
async def batch_insert_users(client, users, batch_size=1000):
    """Insert users in batches"""
    for i in range(0, len(users), batch_size):
        batch = users[i:i + batch_size]

        await client.execute("""
            UNWIND $users AS user_data
            CREATE (u:User {
                id: user_data.id,
                name: user_data.name,
                email: user_data.email,
                created_at: datetime()
            })
        """, {"users": batch})

async def batch_update_prices(client, price_updates):
    """Update prices in batch"""
    await client.execute("""
        UNWIND $updates AS update
        MATCH (p:Product {id: update.product_id})
        SET p.price = update.new_price,
            p.updated_at = datetime()
    """, {"updates": price_updates})
```

Browse the tagged content below to discover comprehensive feature documentation and implementation guides for Geode's enterprise capabilities.
