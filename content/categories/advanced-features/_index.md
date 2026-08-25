---
title: "Category: Advanced Features"
description: "Comprehensive advanced-features documentation for Geode graph database including guides, tutorials, and reference materials."
keywords:
  - advanced-features
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/advanced-features/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Advanced features in Geode represent the cutting edge of graph database technology, providing sophisticated capabilities that go beyond standard query and transaction processing. These features enable enterprise teams to build highly scalable, secure, and intelligent applications that leverage the full power of graph data structures and the ISO/IEC 39075:2024 GQL conformance profile.

Geode's advanced feature set includes vector search with HNSW indexing for semantic similarity, full-text search with BM25 ranking, distributed architecture with QUIC transport, Row-Level Security (RLS) for fine-grained access control, Change Data Capture (CDC) for real-time streaming, and sophisticated graph algorithms for analytics. Each feature is designed to work seamlessly within Geode's ACID-compliant, production-ready architecture while maintaining the 97.4% test coverage that ensures reliability.

This category explores these advanced capabilities in depth, providing architectural insights, implementation patterns, performance considerations, and real-world examples that demonstrate how to leverage Geode's most powerful features effectively.

## Key Advanced Features

### Vector Search and Embeddings

Geode implements Hierarchical Navigable Small World (HNSW) indexing for approximate nearest neighbor search, enabling semantic similarity queries on vector embeddings. This feature supports AI/ML workloads including recommendation systems, semantic search, and similarity detection.

```gql
// Create a node with vector embeddings
CREATE (:Document {
  title: 'Graph Database Architecture',
  embedding: [0.23, 0.45, 0.67, ...]  // 384-dimensional vector
})

// Find similar documents using vector search
MATCH (d:Document)
WHERE similarity(d.embedding, $query_vector) > 0.8
RETURN d.title, similarity(d.embedding, $query_vector) AS score
ORDER BY score DESC
LIMIT 10
```

HNSW indexes are automatically maintained and provide sub-linear search time even with millions of nodes. The index structure uses bidirectional links at multiple layers, ensuring both insertion and search efficiency.

### Full-Text Search with BM25

Geode's BM25 implementation provides production-grade full-text search with relevance ranking based on term frequency and document statistics. This enables sophisticated text search capabilities directly within your graph queries.

```gql
// Create a full-text index
CREATE TEXT INDEX doc_content ON :Document(content)

// Search with BM25 ranking
MATCH (d:Document)
WHERE text_search(d.content, 'graph database performance')
RETURN d.title, bm25_score(d.content, 'graph database performance') AS relevance
ORDER BY relevance DESC
LIMIT 20
```

BM25 scoring considers term saturation and document length normalization, providing more sophisticated ranking than simple term frequency approaches.

### Row-Level Security (RLS)

RLS policies provide fine-grained access control at the data level, enabling multi-tenant applications and complex authorization requirements without application-level filtering.

```python
from geode_client import Client

client = Client(host="localhost", port=3141)

async with client.connection() as conn:
    # Create a security policy
    await conn.execute("""
        CREATE POLICY user_data_access ON :UserData
        USING (node.user_id = current_user_id())
        WITH CHECK (node.user_id = current_user_id())
    """)

    # Queries automatically respect RLS policies
    # Users only see their own data
    result, _ = await conn.query("""
        MATCH (d:UserData)
        RETURN d.content
    """)
```

RLS policies are evaluated at query execution time and integrate seamlessly with Geode's authentication system. They provide mandatory access control that cannot be bypassed by application code.

### Change Data Capture (CDC)

CDC streams provide real-time notifications of data changes, enabling event-driven architectures, data synchronization, and audit logging without polling.

```go
package main

import (
    "context"
    "fmt"
    "geodedb.com/geode"
)

func main() {
    client, _ := geode.Connect("localhost:3141")
    defer client.Close()

    // Subscribe to CDC stream
    stream, _ := client.SubscribeCDC(context.Background(), geode.CDCOptions{
        IncludeTypes: []string{"CREATE", "UPDATE", "DELETE"},
        Labels:       []string{"User", "Transaction"},
    })

    for event := range stream {
        fmt.Printf("Change: %s on %s at %s\n",
            event.Operation, event.EntityID, event.Timestamp)
        fmt.Printf("Data: %v\n", event.NewData)
    }
}
```

CDC streams are delivered via QUIC with at-least-once delivery guarantees. Events include before/after snapshots, operation metadata, and transaction context.

### Distributed Architecture

Geode's distributed mode provides horizontal scalability through sharding and replication, enabling deployments that handle billions of nodes and thousands of concurrent queries.

Key distributed features include:

- Automatic data partitioning across shards
- Configurable replication factors for fault tolerance
- Distributed transaction coordination with two-phase commit
- Query routing and distributed execution
- Automatic failover and recovery

```bash
# Start a distributed cluster
geode serve --mode distributed \
  --node-id node-1 \
  --cluster-peers node-2:3141,node-3:3141 \
  --replication-factor 3
```

### Time-Travel Queries

Geode's MVCC (Multi-Version Concurrency Control) implementation enables time-travel queries that access historical data states without impacting current operations.

```gql
// Query data as it existed at a specific time
MATCH (u:User)-[:PURCHASED]->(p:Product)
AS OF TIMESTAMP '2025-01-01T00:00:00Z'
RETURN u.name, p.title

// Query all versions of a node
MATCH (u:User {id: $user_id})
FOR ALL VERSIONS
RETURN u.name, u.email, version_timestamp()
ORDER BY version_timestamp()
```

Time-travel queries are useful for auditing, debugging, and analyzing historical trends without maintaining separate audit tables.

## Advanced Graph Algorithms

Geode provides built-in implementations of sophisticated graph algorithms optimized for its storage engine:

### Community Detection

```gql
// Detect communities using the Louvain algorithm
CALL algo.louvain.stream()
YIELD nodeId, community
RETURN community, COUNT(*) AS size
ORDER BY size DESC
```

The procedure takes no arguments and reports no modularity score: it runs over
the current graph and yields one `(nodeId, community)` row per node.

### Centrality Analysis

```gql
// Calculate PageRank centrality
MATCH (n:WebPage)
WITH graph.algorithms.pagerank(n, {
  iterations: 20,
  dampingFactor: 0.85
}) AS rank
RETURN n.url, rank
ORDER BY rank DESC
LIMIT 100
```

### Path Finding

```gql
// Find shortest weighted path
MATCH path = shortestPath(
  (a:Location {name: 'San Francisco'}),
  (b:Location {name: 'New York'}),
  (a)-[:ROUTE*]-(b),
  {weightProperty: 'distance'}
)
RETURN path, reduce(d = 0, r IN relationships(path) | d + r.distance) AS total_distance
```

## Performance Optimization Features

### Query Plan Caching

Geode automatically caches prepared query plans, eliminating parse and optimization overhead for repeated queries. Plan caching is particularly effective for parameterized queries.

```python
# Prepared statements benefit from plan caching
async with client.prepare("""
    MATCH (u:User {id: $user_id})-[:FRIEND]->(f:User)
    RETURN f.name, f.email
""") as stmt:
    for user_id in user_ids:
        results = await stmt.execute(user_id=user_id)
```

### Adaptive Indexing

Geode monitors query patterns and can automatically suggest or create indexes for frequently accessed properties and patterns.

```bash
# Enable adaptive indexing
geode config set adaptive_indexing.enabled true
geode config set adaptive_indexing.threshold 1000

# View index recommendations
geode index recommendations
```

### Write-Ahead Log (WAL) Tuning

Advanced WAL configuration enables trading durability guarantees for write performance in scenarios where some data loss is acceptable.

```yaml
# config.yaml
wal:
  sync_mode: "group_commit"  # Batch commits for throughput
  flush_interval_ms: 100      # Group commit window
  compression: "zstd"         # Compress WAL entries
  segment_size_mb: 64         # Larger segments reduce overhead
```

## Security Features

### Transparent Data Encryption (TDE)

TDE encrypts data at rest using AES-256, protecting against unauthorized physical access to storage media.

```bash
# Enable TDE with key rotation
geode config set encryption.tde.enabled true
geode config set encryption.tde.algorithm "aes-256-gcm"
geode config set encryption.tde.key_rotation_days 90
```

### Field-Level Encryption (FLE)

FLE encrypts specific properties client-side before transmission, ensuring sensitive data remains encrypted even within Geode's memory.

```python
from geode_client import EncryptedField

# Create a node with encrypted properties
await client.execute("""
    CREATE (:Patient {
        name: 'John Doe',
        ssn: $encrypted_ssn,
        diagnosis: $encrypted_diagnosis
    })
""", {
    'encrypted_ssn': EncryptedField('123-45-6789', key_id='patient_pii'),
    'encrypted_diagnosis': EncryptedField('Type 2 Diabetes', key_id='patient_phi')
})
```

## Monitoring and Observability

### Prometheus Integration

Geode exposes detailed metrics in Prometheus format, enabling comprehensive monitoring and alerting.

```bash
# Scrape Geode metrics
curl http://localhost:9090/metrics

# Key metrics include:
# - geode_query_duration_seconds
# - geode_transaction_commits_total
# - geode_index_operations_total
# - geode_wal_sync_duration_seconds
# - geode_mvcc_snapshot_age_seconds
```

### Query Profiling

PROFILE provides detailed execution metrics for performance tuning:

```gql
PROFILE MATCH (u:User)-[:FRIEND*2..3]-(f:User)
WHERE u.city = 'San Francisco'
RETURN DISTINCT f.name

// Returns execution plan with:
// - Row counts at each stage
// - Time spent in each operation
// - Index usage statistics
// - Memory allocation details
```

## Best Practices

### Feature Selection

Not all applications need all advanced features. Consider:

- **Vector search**: Use for semantic similarity, recommendations, and AI/ML integration
- **Full-text search**: Use for content discovery and search interfaces
- **RLS**: Use for multi-tenant SaaS applications and fine-grained security
- **CDC**: Use for event-driven architectures and data synchronization
- **Distributed mode**: Use when scaling beyond single-node capacity

### Performance Considerations

Advanced features have performance implications:

- HNSW indexes consume significant memory (O(N) with index size)
- RLS policies add overhead to every query (typically 5-10%)
- CDC streams require WAL retention (disk space)
- Distributed queries have network latency overhead

Benchmark your specific workload and enable features incrementally.

### Security Hardening

When using advanced security features:

- Combine TDE + FLE for defense in depth
- Use RLS policies instead of application-level filtering
- Rotate encryption keys regularly
- Monitor CDC streams for suspicious patterns
- Enable audit logging for security-critical operations

## Integration Patterns

### Hybrid Search

Combine full-text and vector search for powerful semantic + keyword search:

```gql
// Hybrid search with score fusion
MATCH (d:Document)
WHERE text_search(d.content, $query_text)
WITH d,
  bm25_score(d.content, $query_text) AS text_score,
  similarity(d.embedding, $query_vector) AS vector_score
RETURN d.title,
  (0.7 * text_score + 0.3 * vector_score) AS combined_score
ORDER BY combined_score DESC
LIMIT 20
```

### Event-Driven Architecture

Use CDC to trigger external workflows:

```python
async def process_cdc_events():
    client = Client(host="localhost", port=3141)
    last_seen = "1970-01-01T00:00:00Z"
    async with client.connection() as conn:
        while True:
            result, _ = await conn.query(
                """
                MATCH (e:ChangeLog)
                WHERE e.emitted_at > $since
                RETURN e.operation AS operation,
                       e.labels AS labels,
                       e.entity_id AS entity_id,
                       e.after AS after,
                       e.emitted_at AS emitted_at
                ORDER BY emitted_at
                """,
                {"since": last_seen},
            )
            for row in result.rows:
                labels = row["labels"].raw_value or []
                if row["operation"].raw_value == "CREATE" and "Order" in labels:
                    await process_order(row["after"].raw_value)
                elif row["operation"].raw_value == "UPDATE" and "Inventory" in labels:
                    await refresh_recommendations(row["entity_id"].raw_value)
                last_seen = row["emitted_at"].raw_value
```

## Advanced Transaction Patterns

### Optimistic Concurrency Control

```python
async def update_with_optimistic_locking(client, node_id, version):
    """Update with version checking to prevent lost updates."""
    try:
        result, _ = await client.query("""
            MATCH (n:Node {id: $id, version: $expected_version})
            SET n.data = $new_data,
                n.version = $expected_version + 1
            RETURN n.version AS new_version
        """, {
            "id": node_id,
            "expected_version": version,
            "new_data": "updated"
        })

        return result.rows[0] if result.rows else None
    except geode_client.NoResultsError:
        raise ConflictError("Version mismatch - data was modified")
```

### Saga Pattern for Distributed Transactions

```python
from dataclasses import dataclass
from typing import Callable, Any

@dataclass
class SagaStep:
    forward: Callable
    compensate: Callable

async def execute_saga(client, steps: list[SagaStep]):
    """Execute multi-step saga with compensation."""
    completed_steps = []

    try:
        async with client.connection() as conn:
            await conn.begin()
            for step in steps:
                await step.forward(conn)
                completed_steps.append(step)
            await conn.commit()
    except Exception as e:
        # Compensate completed steps in reverse order
        for step in reversed(completed_steps):
            try:
                await step.compensate(client)
            except Exception as comp_error:
                logger.error(f"Compensation failed: {comp_error}")
        raise

# Example saga
async def transfer_money_saga(from_account, to_account, amount):
    steps = [
        SagaStep(
            forward=lambda conn: debit_account(conn, from_account, amount),
            compensate=lambda c: credit_account(c, from_account, amount)
        ),
        SagaStep(
            forward=lambda conn: credit_account(conn, to_account, amount),
            compensate=lambda c: debit_account(c, to_account, amount)
        )
    ]
    await execute_saga(client, steps)
```

## Advanced Indexing Strategies

### Composite Index Optimization

```gql
-- Create composite index for multi-column queries
CREATE INDEX user_location_age ON :User(city, age)

-- Queries benefit from composite index
MATCH (u:User)
WHERE u.city = 'San Francisco'
  AND u.age >= 25
  AND u.age <= 35
RETURN u.name

-- Index covers both predicates efficiently
```

### Partial Indexes for Specific Conditions

```gql
-- Create index only for active users (reduces index size)
CREATE INDEX active_users ON :User(email)
WHERE active = true

-- Queries on active users use partial index
MATCH (u:User)
WHERE u.active = true
  AND u.email = $email
RETURN u
```

### Covering Indexes

```gql
-- Create index that includes returned columns
CREATE INDEX user_profile ON :User(email, name, city)

-- Query is answered entirely from index
MATCH (u:User)
WHERE u.email = $email
RETURN u.name, u.city
-- No need to access node storage
```

## Advanced Security Features

### Multi-Factor Authentication Integration

```python
from geode_client import Client
import pyotp

async def authenticate_with_mfa(username, password, totp_code):
    """Authenticate with username, password, and TOTP."""
    # First verify password
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        user = await conn.execute("""
            MATCH (u:User {username: $username})
            WHERE crypto.verify_password($password, u.password_hash)
            RETURN u.totp_secret AS secret, u.id AS id
        """, {"username": username, "password": password})

        user_data = user.rows[0] if user.rows else None
        if not user_data:
            raise AuthenticationError("Invalid credentials")

        # Verify TOTP
        totp = pyotp.TOTP(user_data['secret'])
        if not totp.verify(totp_code):
            raise AuthenticationError("Invalid TOTP code")

        # Create session
        session_token = generate_secure_token()
        await conn.execute("""
            MATCH (u:User {id: $user_id})
            CREATE (s:Session {
                token: $token,
                created: current_timestamp(),
                expires: current_timestamp() + INTERVAL '24' HOUR
            })
            CREATE (u)-[:HAS_SESSION]->(s)
        """, {"user_id": user_data['id'], "token": session_token})

        return session_token
```

### Attribute-Based Access Control (ABAC)

```gql
-- Define ABAC policy
CREATE POLICY document_access ON :Document
USING (
    // Allow access if user has clearance level >= document classification
    EXISTS {
        MATCH (current_user:User {id: current_user_id()})
        WHERE current_user.clearance_level >= node.classification_level
    }
    OR
    // Or if user is document owner
    EXISTS {
        MATCH (current_user:User {id: current_user_id()})
              -[:OWNS]->(node)
    }
    OR
    // Or if user is in authorized group
    EXISTS {
        MATCH (current_user:User {id: current_user_id()})
              -[:MEMBER_OF]->(:Group)
              <-[:AUTHORIZED]-(node)
    }
)
```

### Audit Trail Implementation

```python
async def create_audit_log(client, user_id, action, entity_type, entity_id, details):
    """Create comprehensive audit log entry."""
    await client.execute("""
        CREATE (log:AuditLog {
            timestamp: current_timestamp(),
            user_id: $user_id,
            action: $action,
            entity_type: $entity_type,
            entity_id: $entity_id,
            details: $details,
            ip_address: $ip,
            user_agent: $user_agent
        })
    """, {
        "user_id": user_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details,
        "ip": request.remote_addr,
        "user_agent": request.headers.get('User-Agent')
    })

# Query audit logs
async def get_audit_trail(entity_id):
    """Retrieve complete audit trail for entity."""
    result, _ = await client.query("""
        MATCH (log:AuditLog {entity_id: $entity_id})
        RETURN log.timestamp AS when,
               log.user_id AS who,
               log.action AS what,
               log.details AS details
        ORDER BY log.timestamp DESC
    """, {"entity_id": entity_id})

    return [row for row in result.rows]
```

## Stream Processing Integration

### Apache Kafka Integration

```python
from kafka import KafkaProducer, KafkaConsumer
import json

async def stream_changes_to_kafka(client, topic):
    """Stream Geode CDC events to Kafka."""
    producer = KafkaProducer(
        bootstrap_servers=['localhost:9092'],
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

    last_seen = "1970-01-01T00:00:00Z"
    async with client.connection() as conn:
        while True:
            result, _ = await conn.query(
                """
                MATCH (e:ChangeLog)
                WHERE e.emitted_at > $since
                RETURN e.operation AS operation,
                       e.entity_type AS entity_type,
                       e.entity_id AS entity_id,
                       e.emitted_at AS emitted_at,
                       e.after AS after
                ORDER BY emitted_at
                """,
                {"since": last_seen},
            )
            for row in result.rows:
                kafka_message = {
                    'operation': row["operation"].raw_value,
                    'entity_type': row["entity_type"].raw_value,
                    'entity_id': row["entity_id"].raw_value,
                    'timestamp': row["emitted_at"].raw_value,
                    'data': row["after"].raw_value,
                }
                producer.send(topic, value=kafka_message)
                last_seen = row["emitted_at"].raw_value

async def consume_from_kafka_to_geode(topic):
    """Consume Kafka messages and write to Geode."""
    consumer = KafkaConsumer(
        topic,
        bootstrap_servers=['localhost:9092'],
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )

    client = Client(host="localhost", port=3141)

    async with client.connection() as conn:
        for message in consumer:
            event = message.value
            await conn.execute("""
                CREATE (n:Event {
                    type: $type,
                    timestamp: $timestamp,
                    data: $data
                })
            """, event)
```

## Advanced Query Optimization

### Query Hints and Directives

```gql
-- Force specific index usage
MATCH (u:User)
USING INDEX u:User(email)
WHERE u.email = $email
RETURN u

-- Disable certain optimizations
MATCH (a:Node)-[r]-(b:Node)
OPTION (hash_join=off)
RETURN a, b
```

### Materialized Path Patterns

```gql
-- Store pre-computed paths for fast traversal
CREATE (root:Category {
    name: 'Electronics',
    path: '/Electronics',
    level: 0
})

CREATE (laptop:Category {
    name: 'Laptops',
    path: '/Electronics/Laptops',
    level: 1
})

-- Query entire subtree efficiently
MATCH (cat:Category)
WHERE cat.path STARTS WITH '/Electronics'
RETURN cat
ORDER BY cat.level, cat.name
```

### Denormalization for Read Performance

```gql
-- Denormalize frequently accessed aggregates
MATCH (product:Product)<-[:PURCHASED]-(order:Order)
WITH product, COUNT(order) AS purchase_count
SET product.cached_purchase_count = purchase_count,
    product.cache_updated = current_timestamp()

-- Fast reads from denormalized data
MATCH (p:Product)
WHERE p.cached_purchase_count > 100
RETURN p.name, p.cached_purchase_count
```

## Graph Machine Learning Workflows

### Link Prediction

```python
import numpy as np
from sklearn.ensemble import RandomForestClassifier

async def train_link_predictor(client):
    """Train ML model to predict future links."""
    # Extract features for existing links
    result, _ = await client.query("""
        MATCH (u1:User)-[r:KNOWS]->(u2:User)
        WITH u1, u2,
             COUNT{(u1)-[:KNOWS]->()<-[:KNOWS]-(u2)} AS common_friends,
             u1.join_date AS u1_join,
             u2.join_date AS u2_join
        RETURN common_friends,
               duration_between(u1_join, u2_join) AS join_diff,
               1 AS label
        LIMIT 10000
    """)

    features = []
    labels = []
    for row in result.rows:
        features.append([row['common_friends'], row['join_diff']])
        labels.append(row['label'])

    # Train model
    model = RandomForestClassifier()
    model.fit(np.array(features), np.array(labels))

    return model

async def predict_new_links(client, model):
    """Predict which user pairs will connect."""
    # Get candidate pairs (users who aren't connected)
    result, _ = await client.query("""
        MATCH (u1:User), (u2:User)
        WHERE u1.id < u2.id
          AND NOT EXISTS {MATCH (u1)-[:KNOWS]-(u2)}
        WITH u1, u2,
             COUNT{(u1)-[:KNOWS]->()<-[:KNOWS]-(u2)} AS common_friends
        WHERE common_friends > 0
        RETURN u1.id AS user1,
               u2.id AS user2,
               common_friends,
               duration_between(u1.join_date, u2.join_date) AS join_diff
        LIMIT 1000
    """)

    predictions = []
    for row in result.rows:
        features = [[row['common_friends'], row['join_diff']]]
        probability = model.predict_proba(features)[0][1]
        predictions.append({
            'user1': row['user1'],
            'user2': row['user2'],
            'probability': probability
        })

    return sorted(predictions, key=lambda x: x['probability'], reverse=True)
```

### Graph Classification

```python
async def classify_graph_nodes(client, trained_gnn_model):
    """Classify nodes using Graph Neural Network."""
    # Extract node embeddings
    result, _ = await client.query("""
        MATCH (n:Node)
        RETURN n.id AS id,
               n.embedding AS embedding,
               [(n)-[:CONNECTED]-(neighbor) | neighbor.id] AS neighbor_ids
    """)

    node_features = {}
    edges = []
    for row in result.rows:
        node_features[row['id']] = row['embedding']
        for neighbor in row['neighbor_ids']:
            edges.append((row['id'], neighbor))

    # Run GNN inference
    predictions = trained_gnn_model.predict(node_features, edges)

    # Update graph with classifications
    for node_id, predicted_class in predictions.items():
        await client.execute("""
            MATCH (n:Node {id: $id})
            SET n.predicted_class = $class,
                n.classification_timestamp = current_timestamp()
        """, {"id": node_id, "class": predicted_class})
```

## Multi-Tenancy Patterns

### Schema-Based Isolation

```gql
-- Each tenant has labeled nodes
CREATE (d:Document:Tenant1 {content: 'data'})
CREATE (d:Document:Tenant2 {content: 'data'})

-- RLS policy enforces isolation
CREATE POLICY tenant_isolation ON :Document
USING (current_tenant() IN labels(node))
```

### Connection Pooling Per Tenant

```python
class MultiTenantConnectionManager:
    def __init__(self):
        self.pools = {}

    async def get_connection(self, tenant_id):
        """Get tenant-specific connection with RLS context."""
        if tenant_id not in self.pools:
            self.pools[tenant_id] = await Client.create_pool(
                "localhost:3141",
                context={"tenant_id": tenant_id}
            )
        return await self.pools[tenant_id].acquire()

# Usage
manager = MultiTenantConnectionManager()
async with manager.get_connection("tenant1") as conn:
    # Queries automatically filtered to tenant1
    result, _ = await conn.query("MATCH (d:Document) RETURN d")
```

## Further Reading

- [Vector Search Tutorial](/docs/tutorials/vector-search-tutorial/) - HNSW implementation details
- [Full-Text Search](/docs/query/full-text-search/) - BM25 text search and ranking
- [Row-Level Security](/tags/row-level-security/) - RLS policies and implementation
- [Change Data Capture](/tags/cdc/) - CDC streams and patterns
- [Distributed Architecture](/docs/architecture/distributed-architecture/) - Scaling and deployment
- [Transactions](/docs/transactions/) - MVCC and time-travel queries
- [Performance Optimization](/categories/performance/) - Tuning advanced features
- [Security and Compliance](/categories/security/) - TDE, FLE, and encryption
- [Graph Algorithms](/docs/analytics/graph-algorithms/) - Graph algorithm patterns
- [Real-Time Analytics](/docs/analytics/real-time-analytics/) - Real-time data pipelines
- [Indexing and Optimization](/docs/query/indexing-and-optimization/) - Index optimization
