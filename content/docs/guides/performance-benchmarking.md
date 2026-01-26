---
title: "Performance Benchmarking Guide"
description: "Comprehensive guide for benchmarking Geode performance: setup, tools, metrics, load testing, and result interpretation"
keywords: ["performance", "benchmarking", "load testing", "metrics", "profiling", "optimization", "throughput", "latency", "stress testing"]
weight: 95
slug: "performance-benchmarking"
canonical: "https://geodedb.com/docs/guides/performance-benchmarking/"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Performance Benchmarking Guide

Measure and optimize Geode performance with comprehensive benchmarking and profiling techniques.

## Overview

Benchmarking helps you:
- **Establish baselines**: Measure current performance
- **Track improvements**: Verify optimizations work
- **Identify bottlenecks**: Find performance issues
- **Capacity planning**: Determine hardware requirements
- **Compare configurations**: Test different settings

## Benchmark Types

### 1. Microbenchmarks
Test specific operations in isolation

**Examples**:
- Single query latency
- Vector distance calculation speed
- Index lookup performance
- MVCC transaction overhead

### 2. Workload Benchmarks
Simulate realistic usage patterns

**Examples**:
- OLTP (transactional workload)
- OLAP (analytical queries)
- Mixed read/write workload
- Graph traversal patterns

### 3. Stress Tests
Test system limits and behavior under extreme load

**Examples**:
- Maximum concurrent connections
- Sustained high throughput
- Large dataset queries
- Memory pressure scenarios

### 4. Endurance Tests
Long-running tests for stability

**Examples**:
- 24-hour continuous load
- Memory leak detection
- Performance degradation over time
- Resource cleanup verification

## Setup

### Hardware Recommendations

**Minimum (Development)**:
- CPU: 4 cores
- RAM: 8GB
- Storage: 50GB SSD
- Network: 1Gbps

**Recommended (Production Benchmarking)**:
- CPU: 16+ cores
- RAM: 32GB+
- Storage: 500GB NVMe SSD
- Network: 10Gbps

### Software Requirements

```bash
# Install Geode
git clone https://github.com/codeprosorg/geode
cd geode
make build

# Install benchmark tools
pip install locust geode-client

# Install monitoring tools
# Prometheus, Grafana (optional)
```

### System Tuning

```bash
# Increase file descriptor limit
ulimit -n 65536

# Disable swap for consistent performance
sudo swapoff -a

# Set CPU governor to performance mode
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Disable CPU frequency scaling
sudo cpupower frequency-set -g performance
```

## Built-in Benchmarks

### Run Native Benchmarks

```bash
# Run all benchmarks
cd geode
zig build bench

# Run specific benchmark category
zig build bench -- --filter "PageRank"
zig build bench -- --filter "Storage"
zig build bench -- --filter "HNSW"
```

**Categories**:
- `Storage`: Page manager, WAL, cache
- `Query`: Pattern matching, aggregations
- `Index`: B-tree, HNSW, full-text search
- `Vector`: Distance calculations, HNSW search
- `Graph`: PageRank, shortest path, centrality
- `Transaction`: MVCC, isolation, deadlock detection

### Interpret Benchmark Output

```
Benchmark: PageRank (100 nodes, 500 edges)
  Iterations: 20
  Damping factor: 0.85
  Time: 15.23ms
  Throughput: 65.7 iterations/sec
  Memory: 2.4MB
  Baseline: 18.50ms
  Improvement: 17.7%
```

**Key Metrics**:
- **Time**: Average execution time
- **Throughput**: Operations per second
- **Memory**: Peak memory usage
- **Baseline**: Previous performance
- **Improvement**: Percent change from baseline

## Query Benchmarking

### EXPLAIN and PROFILE

#### EXPLAIN (Plan Only)

```gql
EXPLAIN
MATCH (p:Person)-[:KNOWS*2]-(fof:Person)
WHERE p.name = 'Alice' AND fof <> p
RETURN DISTINCT fof.name;
```

**Output**:
```
QUERY PLAN:
┌─ Project [fof.name]
└─ Distinct
   └─ Filter [fof <> p]
      └─ VarLengthExpand [KNOWS*2]
         └─ IndexScan [person_name_idx]
            Condition: name = 'Alice'
            Estimated rows: 1
            Estimated cost: 2.5
```

#### PROFILE (Execute and Measure)

```gql
PROFILE
MATCH (p:Person)-[:KNOWS*2]-(fof:Person)
WHERE p.name = 'Alice' AND fof <> p
RETURN DISTINCT fof.name;
```

**Output**:
```
PROFILE RESULTS:
  Operation: Project
    Rows: 5
    Time: 0.12ms

  Operation: Distinct
    Rows in: 8
    Rows out: 5
    Time: 0.08ms

  Operation: Filter [fof <> p]
    Rows in: 10
    Rows out: 8
    Time: 0.05ms

  Operation: VarLengthExpand [KNOWS*2]
    Rows: 10
    Time: 1.25ms
    Relationships traversed: 45

  Operation: IndexScan [person_name_idx]
    Rows: 1
    Time: 0.02ms
    Index: person_name_idx (hash)

Total Time: 1.52ms
Peak Memory: 1.2MB
```

### Benchmark Individual Queries

```python
# Python script - Query benchmarking
from geode_client import GeodeClient
import time
import statistics

client = GeodeClient("localhost:3141")

def benchmark_query(query, params=None, iterations=100):
    """Benchmark a single query"""
    times = []

    # Warmup
    for _ in range(10):
        client.execute(query, params)

    # Measure
    for _ in range(iterations):
        start = time.perf_counter()
        client.execute(query, params)
        end = time.perf_counter()
        times.append((end - start) * 1000)  # Convert to ms

    return {
        'mean': statistics.mean(times),
        'median': statistics.median(times),
        'p95': sorted(times)[int(len(times) * 0.95)],
        'p99': sorted(times)[int(len(times) * 0.99)],
        'min': min(times),
        'max': max(times),
        'stdev': statistics.stdev(times)
    }

# Example usage
query = """
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name, p.age
ORDER BY p.age DESC
LIMIT 10
"""

results = benchmark_query(query, iterations=1000)

print(f"Query Performance (1000 iterations):")
print(f"  Mean: {results['mean']:.2f}ms")
print(f"  Median: {results['median']:.2f}ms")
print(f"  P95: {results['p95']:.2f}ms")
print(f"  P99: {results['p99']:.2f}ms")
print(f"  Range: {results['min']:.2f}ms - {results['max']:.2f}ms")
print(f"  StdDev: {results['stdev']:.2f}ms")
```

## Load Testing with Locust

### Install Locust

```bash
pip install locust geode-client
```

### Create Load Test Script

```python
# locustfile.py
from locust import User, task, between
from geode_client import GeodeClient
import random

class GeodeUser(User):
    wait_time = between(0.1, 0.5)  # Wait 0.1-0.5s between requests

    def on_start(self):
        """Initialize connection"""
        self.client = GeodeClient("localhost:3141")

    @task(weight=70)
    def read_person(self):
        """Read operation (70% of requests)"""
        name = f"Person_{random.randint(1, 1000)}"
        self.client.execute("""
            MATCH (p:Person {name: $name})
            RETURN p
        """, {'name': name})

    @task(weight=20)
    def search_by_age(self):
        """Range query (20% of requests)"""
        min_age = random.randint(20, 60)
        self.client.execute("""
            MATCH (p:Person)
            WHERE p.age >= $min_age
            RETURN p.name, p.age
            LIMIT 10
        """, {'min_age': min_age})

    @task(weight=10)
    def create_person(self):
        """Write operation (10% of requests)"""
        person_id = random.randint(1, 10000)
        self.client.execute("""
            MERGE (p:Person {id: $id})
            SET p.name = $name,
                p.age = $age
        """, {
            'id': person_id,
            'name': f"Person_{person_id}",
            'age': random.randint(18, 80)
        })
```

### Run Load Test

```bash
# Run with web UI
locust -f locustfile.py --host=localhost:3141

# Run headless (100 users, 10 users/sec spawn rate, 5 min)
locust -f locustfile.py \
  --host=localhost:3141 \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --headless

# Generate report
locust -f locustfile.py \
  --host=localhost:3141 \
  --users 500 \
  --spawn-rate 50 \
  --run-time 10m \
  --headless \
  --html report.html
```

### Interpret Locust Results

```
Name                     # Requests    # Fails    Avg    Min    Max    Median  RPS    Failures/s
----------------------------------------------------------------------------------------
POST /query/read_person      7000         0        5     2      45      4      116.7    0.0
POST /query/search_age       2000         0        8     3      62      7       33.3    0.0
POST /query/create_person    1000         0       12     4      98     10       16.7    0.0
----------------------------------------------------------------------------------------
Aggregated                   10000        0        6     2      98      5      166.7    0.0
```

**Key Metrics**:
- **RPS**: Requests per second (throughput)
- **Avg/Median**: Average and median latency
- **Max**: Worst-case latency (outliers)
- **Failures**: Error rate
- **P95/P99**: 95th and 99th percentile latency

## Monitoring & Profiling

### Prometheus Metrics

```bash
# Query Prometheus metrics endpoint
curl http://localhost:9090/metrics

# Key metrics:
# - geode_query_duration_seconds (histogram)
# - geode_query_total (counter)
# - geode_connections_active (gauge)
# - geode_storage_page_cache_hit_rate (gauge)
# - geode_index_lookups_total (counter)
```

### Grafana Dashboards

```yaml
# Import Geode dashboard
{
  "dashboard": {
    "title": "Geode Performance",
    "panels": [
      {
        "title": "Query Latency (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, geode_query_duration_seconds)"
          }
        ]
      },
      {
        "title": "Throughput (Queries/sec)",
        "targets": [
          {
            "expr": "rate(geode_query_total[1m])"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "geode_storage_page_cache_hit_rate"
          }
        ]
      }
    ]
  }
}
```

### System Monitoring

```bash
# CPU usage
top -p $(pgrep geode)

# Memory usage
ps aux | grep geode

# I/O statistics
iostat -x 1

# Network bandwidth
iftop -i eth0

# Continuous monitoring
watch -n 1 'ps aux | grep geode | head -1'
```

## Benchmark Scenarios

### Scenario 1: OLTP Workload

**Characteristics**: High concurrency, short transactions, mixed read/write

```python
# OLTP benchmark
from locust import User, task, between
from geode_client import GeodeClient
import random

class OLTPUser(User):
    wait_time = between(0.01, 0.1)  # Very short wait

    @task(weight=50)
    def read_account(self):
        account_id = random.randint(1, 100000)
        self.client.execute("""
            MATCH (a:Account {id: $id})
            RETURN a.balance
        """, {'id': account_id})

    @task(weight=30)
    def transfer_funds(self):
        from_id = random.randint(1, 100000)
        to_id = random.randint(1, 100000)
        amount = random.randint(10, 1000)

        self.client.execute("START TRANSACTION")
        try:
            self.client.execute("""
                MATCH (from:Account {id: $from_id})
                SET from.balance = from.balance - $amount
            """, {'from_id': from_id, 'amount': amount})

            self.client.execute("""
                MATCH (to:Account {id: $to_id})
                SET to.balance = to.balance + $amount
            """, {'to_id': to_id, 'amount': amount})

            self.client.execute("COMMIT")
        except:
            self.client.execute("ROLLBACK")
            raise

    @task(weight=20)
    def get_balance_history(self):
        account_id = random.randint(1, 100000)
        self.client.execute("""
            MATCH (a:Account {id: $id})-[:TRANSACTION]->(t:Transaction)
            WHERE t.timestamp > $start_time
            RETURN t
            ORDER BY t.timestamp DESC
            LIMIT 10
        """, {'id': account_id, 'start_time': int(time.time()) - 86400})
```

### Scenario 2: Graph Analytics

**Characteristics**: Complex traversals, aggregations, analytical queries

```python
# Analytics benchmark
class AnalyticsUser(User):
    wait_time = between(1, 3)  # Longer wait for analytical queries

    @task(weight=40)
    def find_influencers(self):
        """PageRank-style influence analysis"""
        self.client.execute("""
            MATCH (p:Person)-[:FOLLOWS]->(other:Person)
            WITH other, count(p) AS follower_count
            RETURN other.name, follower_count
            ORDER BY follower_count DESC
            LIMIT 20
        """)

    @task(weight=30)
    def community_detection(self):
        """Find communities"""
        self.client.execute("""
            CALL graph.louvain('SocialNetwork', {
                relationship_type: 'FOLLOWS'
            })
            YIELD node, community
            RETURN community, count(node) AS size
            ORDER BY size DESC
        """)

    @task(weight=30)
    def shortest_path(self):
        """Find connection between random users"""
        user1 = random.randint(1, 1000)
        user2 = random.randint(1, 1000)
        self.client.execute("""
            MATCH (a:Person {id: $id1}), (b:Person {id: $id2}),
                  path = shortestPath((a)-[:FOLLOWS*]-(b))
            RETURN length(path) AS degrees_of_separation
        """, {'id1': user1, 'id2': user2})
```

### Scenario 3: Vector Search

**Characteristics**: Embedding-based similarity search

```python
# Vector search benchmark
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

class VectorSearchUser(User):
    wait_time = between(0.1, 0.5)

    @task
    def semantic_search(self):
        """Find similar products"""
        # Random query
        queries = [
            "wireless headphones",
            "running shoes",
            "laptop computer",
            "smart watch",
            "camera lens"
        ]
        query_text = random.choice(queries)
        query_vec = model.encode(query_text).tolist()

        self.client.execute("""
            MATCH (p:Product)
            WHERE vector_distance_cosine(p.embedding, $query_vec) < 0.5
            RETURN p.name,
                   vector_distance_cosine(p.embedding, $query_vec) AS similarity
            ORDER BY similarity ASC
            LIMIT 10
        """, {'query_vec': query_vec})
```

## Performance Tuning

### Configuration Optimization

```yaml
# geode.yaml - High-performance configuration
storage:
  page_cache_size: '16GB'  # 50-70% of RAM for read-heavy
  page_size: 16384          # Larger pages for sequential access

  wal_buffer_size: '64MB'
  wal_sync_interval: '500ms'  # Balance durability vs performance

optimizer:
  enabled: true
  statistics:
    auto_update: true
    update_interval: '30m'

server:
  max_connections: 20000
  connection_timeout: '60s'
```

### Index Tuning

```gql
-- Ensure appropriate indexes exist
SHOW INDEXES;

-- Create composite indexes for common query patterns
CREATE INDEX user_city_age_idx ON User(city, age) USING btree;

-- Update statistics for accurate query planning
ANALYZE User;
```

## Benchmark Best Practices

### Do's

✅ **Warmup**: Run queries multiple times before measuring
✅ **Isolate**: Close other applications during benchmarking
✅ **Consistent**: Use same hardware and configuration
✅ **Realistic**: Use production-like data volumes
✅ **Monitor**: Track system resources (CPU, memory, I/O)
✅ **Document**: Record all configuration parameters
✅ **Repeat**: Run multiple iterations for statistical significance

### Don'ts

❌ **Don't** benchmark on shared/virtualized hardware
❌ **Don't** use trivial datasets (test with realistic size)
❌ **Don't** ignore cache warmup effects
❌ **Don't** benchmark with debug builds (use release builds)
❌ **Don't** test a single query (use representative workload)
❌ **Don't** ignore system resource contention

## Interpreting Results

### Latency Percentiles

```
P50 (median):  5ms  - Half of requests faster than this
P95:          15ms  - 95% of requests faster than this
P99:          50ms  - 99% of requests faster than this
P999:        200ms  - 99.9% of requests faster than this
Max:        1000ms  - Worst-case outlier
```

**Good Performance**:
- P50 < 10ms
- P95 < 50ms
- P99 < 100ms
- Max < 1000ms

### Throughput Analysis

```
Throughput: 10,000 queries/sec

Analysis:
- Peak rate: 12,000 queries/sec
- Sustained rate: 10,000 queries/sec
- Degradation under load: 5%
- Recommendation: Provision for 15,000 queries/sec (50% headroom)
```

### Resource Utilization

```
CPU:    60% average, 85% peak
Memory: 12GB / 32GB (38%)
Disk:   200 IOPS (40% of SSD capacity)
Network: 500 Mbps (5% of 10Gbps link)

Bottleneck: None identified
Recommendation: Current hardware adequate for 2x load
```

## Next Steps

- [Performance Tuning](/docs/performance/) - Optimization techniques
- [Indexing Tutorial](/docs/tutorials/indexing-tutorial/) - Index optimization
- [Query Optimization](/docs/query/performance-tuning/) - Query tuning
- [Architecture Guide](/docs/architecture/performance-and-scaling/) - Scaling strategies

## References

- [Server Configuration](/docs/configuration/server-configuration/) - Configuration options
- [Monitoring](/docs/ops/observability/) - Prometheus and Grafana setup
- [Testing Strategies](/docs/guides/testing-strategies/) - Testing approaches

---

**License**: Apache License 2.0
**Copyright**: 2024-2025 CodePros
**Last Updated**: January 2026
