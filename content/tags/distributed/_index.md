---
title: "Distributed Systems Architecture"
description: "Explore Geode documentation tagged with distributed. Learn about distributed features, best practices, and implementation details."
keywords:
  - distributed
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/distributed/"
    noindex: false
---

# Distributed Systems Architecture in Geode

Distributed systems enable horizontal scaling by spreading data and compute across multiple machines. While Geode's current version (v0.18.0) operates as a single-node system optimized for vertical scaling, the architecture is designed with distributed capabilities in mind for future releases. This page covers distributed systems concepts, Geode's scaling approach, and how to build distributed graph applications today.

## Introduction to Distributed Graph Databases

Distributed graph databases face unique challenges compared to traditional distributed systems:

**Graph-Specific Challenges**:
- **Locality**: Graph traversals benefit from co-located data, but relationships often span partitions
- **Partitioning**: Splitting graphs across nodes while minimizing edge cuts is NP-hard
- **Query Routing**: Multi-hop traversals may need to touch multiple nodes
- **Consistency**: Maintaining ACID guarantees across distributed transactions

**Common Distributed Approaches**:
1. **Partitioning (Sharding)**: Divide graph across nodes by node ID or properties
2. **Replication**: Maintain copies of data on multiple nodes for availability
3. **Caching**: Store hot data closer to compute
4. **Federation**: Query across independent graph instances

## Geode's Current Architecture

Geode v0.18.0 is optimized as a **high-performance single-node system**:

**Design Principles**:
- **Vertical Scaling First**: Modern servers with 64-256 cores and terabytes of RAM
- **QUIC Protocol**: Efficient multiplexing for thousands of concurrent client connections
- **MVCC**: Lock-free reads enabling high concurrency
- **Zero-Copy I/O**: Memory-mapped files for efficient data access

**Performance Characteristics**:
- Handles graphs with **billions of nodes** on appropriate hardware
- **10,000+ queries per second** on mid-range servers
- **Millisecond latency** for most graph traversals
- **Terabyte-scale** databases with NVMe storage

**When Single-Node is Sufficient**:
```
Dataset Size     | Recommended Hardware       | Expected Performance
----------------|----------------------------|---------------------
< 100M nodes    | 32GB RAM, 8 cores          | 1,000+ QPS
100M-1B nodes   | 128GB RAM, 16-32 cores     | 5,000+ QPS
1B-10B nodes    | 512GB-2TB RAM, 64+ cores   | 10,000+ QPS
```

Most production workloads fit comfortably on single powerful nodes, especially with:
- Proper indexing (reduces full scans)
- Query optimization (EXPLAIN/PROFILE)
- Connection pooling (reuses connections)
- Caching strategies (application-level)

## Distributed Patterns with Current Geode

While Geode runs on single nodes, you can build distributed graph applications using established patterns:

### Pattern 1: Application-Level Sharding

Partition your graph at the application layer based on domain knowledge:

```python
from geode_client import GeodeClient

class DistributedGraphClient:
    def __init__(self, shard_configs):
        """
        shard_configs = [
            {"region": "us-east", "host": "geode1.example.com", "port": 3141},
            {"region": "us-west", "host": "geode2.example.com", "port": 3141},
            {"region": "eu", "host": "geode3.example.com", "port": 3141},
        ]
        """
        self.shards = {
            config["region"]: GeodeClient(config["host"], config["port"])
            for config in shard_configs
        }

    def get_shard(self, region):
        """Route queries to appropriate shard"""
        return self.shards[region]

    async def create_user(self, user_id, region, name):
        """Insert user into region-specific shard"""
        async with self.get_shard(region) as client:
            await client.execute("""
                CREATE (u:User {
                    id: $id,
                    name: $name,
                    region: $region
                })
            """, {"id": user_id, "name": name, "region": region})

    async def query_local_friends(self, user_id, region):
        """Query within single shard (fast)"""
        async with self.get_shard(region) as client:
            result = await client.execute("""
                MATCH (u:User {id: $id})-[:FRIEND]->(friend:User)
                RETURN friend.name
            """, {"id": user_id})
            return result.bindings

    async def query_global_friends(self, user_id, home_region):
        """Query across all shards (slower, more complex)"""
        all_friends = []

        for region, shard in self.shards.items():
            async with shard as client:
                result = await client.execute("""
                    MATCH (u:User {id: $id})-[:FRIEND]->(friend:User)
                    RETURN friend.name, friend.region
                """, {"id": user_id})
                all_friends.extend(result.bindings)

        return all_friends

# Usage
distributed_client = DistributedGraphClient([
    {"region": "us-east", "host": "geode1.example.com", "port": 3141},
    {"region": "eu", "host": "geode2.example.com", "port": 3141},
])

# Most queries stay within single shard
await distributed_client.query_local_friends(user_id=123, region="us-east")
```

**When to use**:
- Clear domain boundaries (geographic regions, business units, tenants)
- Most queries stay within single shard
- Cross-shard queries are infrequent or can be eventual consistency

**Trade-offs**:
- Application complexity (routing logic)
- Cross-shard transactions not supported
- Data rebalancing requires application-level migration

### Pattern 2: Read Replicas for High Availability

Use replication for read scaling and failover:

```python
class ReplicatedGraphClient:
    def __init__(self, primary_config, replica_configs):
        self.primary = GeodeClient(primary_config["host"], primary_config["port"])
        self.replicas = [
            GeodeClient(r["host"], r["port"])
            for r in replica_configs
        ]
        self.replica_idx = 0

    async def write(self, query, params):
        """All writes go to primary"""
        async with self.primary as client:
            return await client.execute(query, params)

    async def read(self, query, params):
        """Reads load-balanced across replicas"""
        replica = self.replicas[self.replica_idx % len(self.replicas)]
        self.replica_idx += 1

        async with replica as client:
            return await client.execute(query, params)

# Usage
client = ReplicatedGraphClient(
    primary_config={"host": "primary.example.com", "port": 3141},
    replica_configs=[
        {"host": "replica1.example.com", "port": 3141},
        {"host": "replica2.example.com", "port": 3141},
    ]
)

# Writes to primary
await client.write("""
    CREATE (u:User {id: $id, name: $name})
""", {"id": 123, "name": "Alice"})

# Reads from replicas (load balanced)
result = await client.read("""
    MATCH (u:User {id: $id}) RETURN u
""", {"id": 123})
```

**Implementation with streaming replication**:
```bash
# Primary server configuration
geode serve --listen 0.0.0.0:3141 \
  --data-dir /data/primary \
  --wal-streaming-enabled=true \
  --wal-streaming-port=3142

# Replica server (subscribes to primary's WAL stream)
geode serve --listen 0.0.0.0:3141 \
  --data-dir /data/replica \
  --replication-source=primary.example.com:3142 \
  --read-only=true
```

**When to use**:
- Read-heavy workloads (analytics, reporting)
- Geographic distribution for low-latency reads
- High availability requirements

**Trade-offs**:
- Replication lag (eventual consistency for reads)
- Increased infrastructure cost
- Complexity in failover scenarios

### Pattern 3: Federation with Cross-Instance Queries

Query multiple independent Geode instances and merge results:

```python
async def federated_search(query_text, instances):
    """Search across multiple independent graph instances"""
    tasks = []

    for instance in instances:
        tasks.append(search_instance(instance, query_text))

    # Execute queries in parallel
    results = await asyncio.gather(*tasks)

    # Merge and deduplicate results
    merged = []
    seen_ids = set()

    for result_set in results:
        for row in result_set:
            if row['id'] not in seen_ids:
                merged.append(row)
                seen_ids.add(row['id'])

    return merged

async def search_instance(instance, query_text):
    async with GeodeClient(instance['host'], instance['port']) as client:
        result = await client.execute("""
            MATCH (doc:Document)
            WHERE text_search(doc.content, $query)
            RETURN doc.id, doc.title, doc.content
            LIMIT 100
        """, {"query": query_text})
        return result.bindings

# Usage
instances = [
    {"host": "docs-db.example.com", "port": 3141, "name": "Documentation"},
    {"host": "wiki-db.example.com", "port": 3141, "name": "Wiki"},
    {"host": "blog-db.example.com", "port": 3141, "name": "Blog"},
]

results = await federated_search("graph database", instances)
```

**When to use**:
- Independent domains with occasional cross-domain queries
- Legacy systems integration
- Multi-tenant architectures with data isolation

### Pattern 4: Caching and Denormalization

Use caching layers to reduce database load:

```python
import redis.asyncio as redis
import json

class CachedGraphClient:
    def __init__(self, geode_host, geode_port, redis_host):
        self.geode = GeodeClient(geode_host, geode_port)
        self.cache = redis.Redis(host=redis_host)

    async def get_user_with_cache(self, user_id):
        # Check cache first
        cache_key = f"user:{user_id}"
        cached = await self.cache.get(cache_key)

        if cached:
            return json.loads(cached)

        # Cache miss: query database
        async with self.geode as client:
            result = await client.execute("""
                MATCH (u:User {id: $id})
                RETURN u.id AS id, u.name AS name, u.email AS email
            """, {"id": user_id})

            if result.bindings:
                user = result.bindings[0]
                # Store in cache (expire after 5 minutes)
                await self.cache.setex(
                    cache_key,
                    300,
                    json.dumps(user)
                )
                return user

        return None

    async def invalidate_user_cache(self, user_id):
        """Called after user updates"""
        await self.cache.delete(f"user:{user_id}")

# Usage
client = CachedGraphClient("localhost", 3141, "cache.example.com")

# First call: cache miss, queries database
user = await client.get_user_with_cache(123)

# Second call: cache hit, no database query
user = await client.get_user_with_cache(123)

# After update, invalidate cache
await client.invalidate_user_cache(123)
```

## Future Distributed Features (Roadmap)

Geode's architecture is designed to support distributed capabilities in future releases:

### Planned Features

**1. Native Sharding** (v1.0+):
- Automatic graph partitioning using METIS or similar algorithms
- Transparent query routing across shards
- Distributed transaction coordination
- Online resharding for elasticity

**2. Raft-Based Replication** (v1.0+):
- Strongly consistent replication using Raft consensus
- Automatic failover with leader election
- Configurable replication factor
- Read-your-writes consistency

**3. Distributed Query Execution** (v1.5+):
- Query plan distribution across nodes
- Parallel subquery execution
- Smart data shipping vs. query shipping
- Distributed aggregations and joins

**4. Global Secondary Indexes** (v1.5+):
- Indexes spanning multiple shards
- Parallel index scans
- Distributed HNSW for vector search

### Design Considerations

The distributed architecture will prioritize:
- **Strong consistency**: ACID guarantees across distributed transactions
- **GQL compatibility**: Distributed execution transparent to queries
- **Low latency**: Minimize cross-node communication
- **Operational simplicity**: Automatic cluster management

## Best Practices for Distributed Graph Applications

### Design for Locality

Minimize cross-partition queries:
```gql
-- GOOD: Query within single tenant/region
MATCH (u:User {tenant_id: $tenant})-[:FRIEND]->(friend)
WHERE friend.tenant_id = $tenant
RETURN friend.name;

-- BAD: Cross-partition traversal
MATCH (u:User)-[:FRIEND*1..5]->(friend)
RETURN friend.name;
-- May require querying multiple shards
```

### Use Eventual Consistency Where Appropriate

Not all data requires strong consistency:
```python
# Strong consistency for critical operations
async with client.transaction(isolation_level="SERIALIZABLE"):
    await client.execute("""
        MATCH (account:Account {id: $id})
        SET account.balance = account.balance - $amount
    """, {"id": account_id, "amount": amount})

# Eventual consistency for metrics (acceptable)
await client.execute("""
    MATCH (post:Post {id: $id})
    SET post.view_count = post.view_count + 1
""", {"id": post_id})
```

### Implement Idempotent Operations

Critical for retries in distributed systems:
```gql
-- Idempotent: Can be retried safely
MERGE (u:User {id: $id})
ON CREATE SET u.name = $name, u.created_at = timestamp()
ON MATCH SET u.last_seen = timestamp();

-- Not idempotent: Retry causes duplicate
CREATE (u:User {id: random_uuid(), name: $name});
```

### Monitor Cross-Shard Traffic

```python
# Track cross-shard query patterns
query_router_metrics = {
    "local_queries": 0,
    "cross_shard_queries": 0,
}

async def execute_with_metrics(shard, query, params):
    if is_cross_shard(query):
        query_router_metrics["cross_shard_queries"] += 1
    else:
        query_router_metrics["local_queries"] += 1

    async with shard as client:
        return await client.execute(query, params)

# Aim for >95% local queries
local_ratio = query_router_metrics["local_queries"] / sum(query_router_metrics.values())
if local_ratio < 0.95:
    print(f"Warning: Only {local_ratio:.1%} queries are local. Consider repartitioning.")
```

## Related Topics

- **[Scaling](/tags/scaling/)**: Vertical and horizontal scaling strategies
- **[Performance](/tags/performance/)**: Performance optimization techniques
- **[Architecture](/tags/architecture/)**: Geode's system architecture
- **[Deployment](/tags/deployment/)**: Deployment patterns and strategies
- **[Networking](/tags/networking/)**: Network configuration for distributed setups
- **[Operations](/tags/operations/)**: Operational best practices

## Further Reading

- **Geode Architecture Overview**: `/docs/architecture/overview/`
- **Scaling Guide**: `/docs/operations/scaling/`
- **Replication Setup**: `/docs/operations/replication/` (coming soon)
- **Sharding Strategies**: `/docs/architecture/sharding/` (coming soon)
- **CAP Theorem and Geode**: `/docs/architecture/consistency-models/`
