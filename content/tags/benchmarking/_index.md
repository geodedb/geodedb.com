---
title: "Performance Benchmarking"
description: "Comprehensive guide to benchmarking Geode graph database performance including load testing, throughput analysis, latency measurement, and comparison methodologies."
keywords:
  - benchmarking
  - performance testing
  - load testing
  - throughput
  - latency
  - stress testing
  - capacity planning
  - performance comparison
  - metrics
  - profiling
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/benchmarking/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Performance Benchmarking in Geode

Benchmarking provides objective measurements of database performance, enabling informed decisions about configuration, capacity planning, and optimization. Effective benchmarking reveals performance characteristics under various workloads and helps identify bottlenecks before they impact production systems.

This guide covers benchmarking methodologies, tools, metrics, and best practices for measuring and comparing Geode performance.

## Benchmarking Fundamentals

### Why Benchmark?

Benchmarking serves multiple purposes:

**Capacity Planning**: Determine hardware requirements for expected workloads

**Configuration Tuning**: Measure impact of configuration changes

**Regression Detection**: Ensure updates don't degrade performance

**Comparison**: Evaluate Geode against alternatives or previous versions

**Optimization Validation**: Verify that optimizations achieve intended improvements

### Key Performance Metrics

**Throughput**: Operations per second the system can sustain
- Queries per second (QPS)
- Transactions per second (TPS)
- Nodes/edges created per second

**Latency**: Time to complete individual operations
- Average latency
- Percentiles (p50, p95, p99, p99.9)
- Maximum latency

**Scalability**: How performance changes with load
- Vertical scaling (larger machines)
- Horizontal scaling (more nodes)
- Data volume scaling

**Resource Utilization**: System resource consumption
- CPU usage
- Memory usage
- Disk I/O
- Network I/O

### Benchmarking Principles

**Reproducibility**: Results should be consistent across runs

**Isolation**: Control for external factors

**Realistic Workloads**: Test patterns that match production

**Statistical Rigor**: Collect sufficient samples, report variance

**Warm-up**: Allow system to reach steady state before measuring

## Geode Benchmark Suite

### Built-in Benchmark Tool

Geode includes a benchmarking tool for common scenarios:

```bash
# Run standard benchmark suite
./geode benchmark run \
  --workload standard \
  --duration 300 \
  --connections 100 \
  --output /benchmarks/results/

# Available workloads
./geode benchmark list-workloads

# Workloads:
#   - standard: Mixed read/write operations
#   - read-heavy: 95% reads, 5% writes
#   - write-heavy: 20% reads, 80% writes
#   - traversal: Graph traversal patterns
#   - analytics: Aggregation and analysis queries
#   - import: Bulk data loading
```

### Benchmark Configuration

```toml
# benchmark.toml
[benchmark]
name = "production-baseline"
description = "Baseline performance measurement"

[benchmark.workload]
type = "standard"
read_ratio = 0.8
write_ratio = 0.2

[benchmark.load]
# Concurrent connections
connections = 100
# Queries per connection per second
rate_per_connection = 100
# Total duration
duration_seconds = 300

[benchmark.data]
# Initial dataset size
initial_nodes = 1000000
initial_edges = 5000000
# Node/edge properties
avg_properties_per_node = 5
avg_properties_per_edge = 2

[benchmark.queries]
# Query distribution
simple_lookup_percent = 40
index_scan_percent = 30
traversal_1hop_percent = 15
traversal_3hop_percent = 10
aggregation_percent = 5

[benchmark.output]
format = "json"
directory = "/benchmarks/results"
include_histograms = true
```

### Running Benchmarks

```bash
# Run with configuration file
./geode benchmark run --config benchmark.toml

# Run specific workload
./geode benchmark run \
  --workload read-heavy \
  --duration 600 \
  --connections 200 \
  --data-size 10000000

# Incremental load test
./geode benchmark run \
  --workload standard \
  --ramp-up 60 \
  --connections-start 10 \
  --connections-end 500 \
  --duration 600
```

## Load Testing Patterns

### Point Query Performance

Measure single-record lookup performance:

```gql
-- Benchmark query: lookup by ID
MATCH (u:User {id: $id})
RETURN u.name, u.email, u.created_at;
```

**Benchmark Script**:
```python
import asyncio
import time
import statistics
from geode_client import Client

async def benchmark_point_queries(
    host: str,
    num_queries: int,
    concurrency: int
):
    """Benchmark point query performance"""
    client = Client(host=host, port=3141)
    latencies = []
    errors = 0

    # Generate random user IDs
    user_ids = [f"user-{i}" for i in range(1, num_queries + 1)]

    semaphore = asyncio.Semaphore(concurrency)

    async def run_query(user_id):
        nonlocal errors
        async with semaphore:
            start = time.perf_counter()
            try:
                async with client.connection() as conn:
                    await conn.query(
                        "MATCH (u:User {id: $id}) RETURN u",
                        {"id": user_id}
                    )
                latencies.append((time.perf_counter() - start) * 1000)
            except Exception:
                errors += 1

    # Run queries
    start_time = time.perf_counter()
    await asyncio.gather(*[run_query(uid) for uid in user_ids])
    total_time = time.perf_counter() - start_time

    # Report results
    print(f"Total queries: {num_queries}")
    print(f"Errors: {errors}")
    print(f"Duration: {total_time:.2f}s")
    print(f"Throughput: {num_queries/total_time:.0f} QPS")
    print(f"Latency avg: {statistics.mean(latencies):.2f}ms")
    print(f"Latency p50: {statistics.median(latencies):.2f}ms")
    print(f"Latency p95: {sorted(latencies)[int(len(latencies)*0.95)]:.2f}ms")
    print(f"Latency p99: {sorted(latencies)[int(len(latencies)*0.99)]:.2f}ms")

asyncio.run(benchmark_point_queries("localhost", 100000, 100))
```

### Traversal Performance

Measure graph traversal efficiency:

```python
async def benchmark_traversals(
    host: str,
    num_queries: int,
    max_depth: int
):
    """Benchmark traversal performance at various depths"""
    client = Client(host=host, port=3141)

    for depth in range(1, max_depth + 1):
        query = f"""
            MATCH (u:User {{id: $id}})-[:FOLLOWS*1..{depth}]->(friend)
            RETURN DISTINCT friend.id, friend.name
            LIMIT 100
        """

        latencies = []
        for _ in range(num_queries):
            start = time.perf_counter()
            async with client.connection() as conn:
                result, _ = await conn.query(query, {"id": "user-1"})
                latencies.append((time.perf_counter() - start) * 1000)

        print(f"Depth {depth}: avg={statistics.mean(latencies):.2f}ms, "
              f"p95={sorted(latencies)[int(len(latencies)*0.95)]:.2f}ms")
```

### Write Performance

Measure insert and update throughput:

```python
async def benchmark_writes(
    host: str,
    num_operations: int,
    batch_size: int
):
    """Benchmark write performance"""
    client = Client(host=host, port=3141)

    # Single inserts
    single_latencies = []
    for i in range(num_operations):
        start = time.perf_counter()
        async with client.connection() as conn:
            await conn.execute("""
                CREATE (u:User {
                    id: $id,
                    name: $name,
                    email: $email,
                    created_at: datetime()
                })
            """, {
                "id": f"bench-user-{i}",
                "name": f"User {i}",
                "email": f"user{i}@example.com"
            })
        single_latencies.append((time.perf_counter() - start) * 1000)

    print(f"Single inserts: {num_operations/sum(single_latencies)*1000:.0f} ops/sec")

    # Batch inserts
    batch_latencies = []
    for batch_start in range(0, num_operations, batch_size):
        users = [
            {"id": f"batch-user-{i}", "name": f"User {i}", "email": f"user{i}@example.com"}
            for i in range(batch_start, min(batch_start + batch_size, num_operations))
        ]

        start = time.perf_counter()
        async with client.connection() as conn:
            await conn.execute("""
                UNWIND $users AS u
                CREATE (n:User {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    created_at: datetime()
                })
            """, {"users": users})
        batch_latencies.append((time.perf_counter() - start) * 1000)

    print(f"Batch inserts ({batch_size}): "
          f"{num_operations/sum(batch_latencies)*1000:.0f} ops/sec")
```

### Mixed Workload

Simulate realistic production workloads:

```python
import random

async def benchmark_mixed_workload(
    host: str,
    duration_seconds: int,
    read_ratio: float = 0.8
):
    """Benchmark mixed read/write workload"""
    client = Client(host=host, port=3141)

    operations = {
        "read": 0,
        "write": 0,
        "read_latency": [],
        "write_latency": []
    }

    start_time = time.time()
    while time.time() - start_time < duration_seconds:
        if random.random() < read_ratio:
            # Read operation
            user_id = f"user-{random.randint(1, 100000)}"
            start = time.perf_counter()
            async with client.connection() as conn:
                await conn.query(
                    "MATCH (u:User {id: $id}) RETURN u",
                    {"id": user_id}
                )
            operations["read"] += 1
            operations["read_latency"].append((time.perf_counter() - start) * 1000)
        else:
            # Write operation
            start = time.perf_counter()
            async with client.connection() as conn:
                await conn.execute(
                    "MATCH (u:User {id: $id}) SET u.updated_at = datetime()",
                    {"id": f"user-{random.randint(1, 100000)}"}
                )
            operations["write"] += 1
            operations["write_latency"].append((time.perf_counter() - start) * 1000)

    elapsed = time.time() - start_time
    print(f"Duration: {elapsed:.0f}s")
    print(f"Read throughput: {operations['read']/elapsed:.0f} QPS")
    print(f"Write throughput: {operations['write']/elapsed:.0f} TPS")
    print(f"Read latency avg: {statistics.mean(operations['read_latency']):.2f}ms")
    print(f"Write latency avg: {statistics.mean(operations['write_latency']):.2f}ms")
```

## Stress Testing

### Finding Breaking Points

Gradually increase load to find system limits:

```bash
# Incremental load test
./geode benchmark stress \
  --start-rate 100 \
  --end-rate 10000 \
  --step 100 \
  --step-duration 30 \
  --workload standard
```

**Custom Stress Test**:
```python
async def stress_test(host: str, max_rate: int, step: int):
    """Find maximum sustainable throughput"""
    results = []

    for rate in range(step, max_rate + 1, step):
        print(f"Testing rate: {rate} QPS")

        latencies = []
        errors = 0
        target_interval = 1.0 / rate

        start_time = time.time()
        last_query = start_time

        while time.time() - start_time < 30:  # 30 second test per rate
            # Rate limiting
            now = time.time()
            if now - last_query < target_interval:
                await asyncio.sleep(target_interval - (now - last_query))
            last_query = time.time()

            # Execute query
            query_start = time.perf_counter()
            try:
                async with client.connection() as conn:
                    await conn.query("MATCH (u:User {id: $id}) RETURN u", {"id": "user-1"})
                latencies.append((time.perf_counter() - query_start) * 1000)
            except Exception:
                errors += 1

        actual_rate = len(latencies) / 30
        p99_latency = sorted(latencies)[int(len(latencies) * 0.99)] if latencies else 0

        results.append({
            "target_rate": rate,
            "actual_rate": actual_rate,
            "p99_latency": p99_latency,
            "error_rate": errors / (len(latencies) + errors) if latencies else 1
        })

        # Stop if system is saturated
        if p99_latency > 100 or errors > len(latencies) * 0.01:
            print(f"System saturated at {rate} QPS")
            break

    return results
```

### Sustained Load Testing

Test stability under continuous load:

```bash
# 24-hour stability test
./geode benchmark run \
  --workload standard \
  --duration 86400 \
  --connections 100 \
  --rate 5000 \
  --report-interval 60
```

### Failure Injection

Test performance under failure conditions:

```python
async def benchmark_with_failures(host: str, duration: int):
    """Benchmark while injecting failures"""
    import subprocess

    async def inject_failure():
        """Periodically restart a node"""
        while True:
            await asyncio.sleep(60)  # Every minute
            print("Injecting failure: restarting node2")
            subprocess.run(["docker", "restart", "geode-node2"])

    # Run benchmark and failure injection concurrently
    await asyncio.gather(
        benchmark_mixed_workload(host, duration),
        inject_failure()
    )
```

## Comparison Benchmarking

### Comparing Configurations

```python
async def compare_configurations(configs: list):
    """Compare performance across different configurations"""
    results = {}

    for config_name, config_file in configs:
        print(f"Testing configuration: {config_name}")

        # Apply configuration
        subprocess.run(["./geode", "admin", "reload-config", config_file])
        await asyncio.sleep(10)  # Wait for config to apply

        # Run benchmark
        result = await benchmark_mixed_workload("localhost", 300)
        results[config_name] = result

    # Report comparison
    print("\n=== Configuration Comparison ===")
    print(f"{'Config':<20} {'Read QPS':<12} {'Write TPS':<12} {'P99 Latency':<12}")
    for name, result in results.items():
        print(f"{name:<20} {result['read_qps']:<12.0f} "
              f"{result['write_tps']:<12.0f} {result['p99_latency']:<12.2f}")
```

### Version Comparison

```bash
# Benchmark current version
./geode benchmark run --workload standard --output results-v0.18.json

# Switch to previous version
./deploy-version.sh v0.17

# Benchmark previous version
./geode benchmark run --workload standard --output results-v0.17.json

# Compare results
./geode benchmark compare results-v0.17.json results-v0.18.json
```

## Benchmark Reporting

### JSON Output

```json
{
  "benchmark_name": "production-baseline",
  "timestamp": "2026-01-28T10:30:00Z",
  "duration_seconds": 300,
  "configuration": {
    "connections": 100,
    "workload": "standard",
    "data_size": 1000000
  },
  "results": {
    "throughput": {
      "total_operations": 1547832,
      "operations_per_second": 5159.44,
      "reads_per_second": 4127.55,
      "writes_per_second": 1031.89
    },
    "latency": {
      "read": {
        "avg_ms": 2.34,
        "p50_ms": 1.89,
        "p95_ms": 4.56,
        "p99_ms": 8.12,
        "p999_ms": 23.45,
        "max_ms": 156.78
      },
      "write": {
        "avg_ms": 5.67,
        "p50_ms": 4.23,
        "p95_ms": 12.34,
        "p99_ms": 24.56,
        "p999_ms": 67.89,
        "max_ms": 234.56
      }
    },
    "errors": {
      "total": 23,
      "rate": 0.000015,
      "by_type": {
        "timeout": 15,
        "connection_refused": 8
      }
    },
    "resources": {
      "cpu_avg_percent": 67.5,
      "memory_avg_mb": 4523,
      "disk_iops_avg": 12456,
      "network_mbps_avg": 234.5
    }
  }
}
```

### Visualization

```python
import matplotlib.pyplot as plt
import json

def plot_benchmark_results(results_file: str):
    """Generate benchmark visualization"""
    with open(results_file) as f:
        data = json.load(f)

    # Latency distribution
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))

    # Throughput over time
    ax1 = axes[0, 0]
    ax1.plot(data['time_series']['throughput'])
    ax1.set_title('Throughput Over Time')
    ax1.set_xlabel('Time (seconds)')
    ax1.set_ylabel('Operations/second')

    # Latency percentiles
    ax2 = axes[0, 1]
    percentiles = ['p50', 'p95', 'p99', 'p999']
    values = [data['results']['latency']['read'][f'{p}_ms'] for p in percentiles]
    ax2.bar(percentiles, values)
    ax2.set_title('Read Latency Percentiles')
    ax2.set_ylabel('Latency (ms)')

    # Resource utilization
    ax3 = axes[1, 0]
    ax3.plot(data['time_series']['cpu'], label='CPU')
    ax3.plot(data['time_series']['memory'], label='Memory')
    ax3.set_title('Resource Utilization')
    ax3.legend()

    # Error rate
    ax4 = axes[1, 1]
    ax4.plot(data['time_series']['error_rate'])
    ax4.set_title('Error Rate Over Time')
    ax4.set_xlabel('Time (seconds)')
    ax4.set_ylabel('Error Rate')

    plt.tight_layout()
    plt.savefig('benchmark_results.png')
    plt.show()
```

## Monitoring During Benchmarks

### Metrics Collection

Collect comprehensive metrics during benchmarks:

```bash
# Start Prometheus metrics collection
curl http://localhost:3141/metrics > metrics_before.txt

# Run benchmark
./geode benchmark run --workload standard --duration 300

# Collect metrics after
curl http://localhost:3141/metrics > metrics_after.txt
```

### Real-Time Monitoring

```python
import prometheus_client

async def monitor_benchmark(benchmark_coro, metrics_port=8000):
    """Monitor benchmark with Prometheus metrics"""
    # Start metrics server
    prometheus_client.start_http_server(metrics_port)

    # Custom metrics
    ops_counter = prometheus_client.Counter(
        'benchmark_operations_total',
        'Total benchmark operations',
        ['operation_type']
    )
    latency_histogram = prometheus_client.Histogram(
        'benchmark_latency_seconds',
        'Operation latency',
        ['operation_type'],
        buckets=[.001, .005, .01, .025, .05, .1, .25, .5, 1.0, 2.5, 5.0]
    )

    # Run benchmark with metrics
    async def instrumented_query(query_func, op_type):
        with latency_histogram.labels(op_type).time():
            result = await query_func()
            ops_counter.labels(op_type).inc()
            return result

    await benchmark_coro(instrumented_query)
```

## Best Practices

### Benchmark Environment

1. **Isolate the system**: Dedicated hardware, no competing workloads
2. **Control external factors**: Network latency, disk state
3. **Use production-like data**: Size, distribution, and patterns
4. **Document environment**: Hardware, OS, configuration

### Methodology

1. **Warm up the system**: Run queries before measuring
2. **Use sufficient duration**: Minimum 5 minutes, preferably longer
3. **Multiple runs**: Average results across 3-5 runs
4. **Report variance**: Include standard deviation
5. **Test at multiple load levels**: Find saturation point

### Reporting

1. **Include all percentiles**: p50, p95, p99, p99.9, max
2. **Report throughput and latency**: Both matter
3. **Document configuration**: Complete reproducibility
4. **Show resource utilization**: CPU, memory, I/O
5. **Include error rates**: Completeness matters

### Common Pitfalls

1. **Insufficient warm-up**: Cold caches skew results
2. **Too short duration**: May miss periodic behaviors
3. **Client-side bottlenecks**: Ensure client can generate load
4. **Network effects**: Latency may be network, not database
5. **Ignoring errors**: High throughput with errors is meaningless

## Benchmark Checklist

Before running benchmarks:
- [ ] Environment isolated and documented
- [ ] Data loaded and representative
- [ ] Configuration documented
- [ ] Monitoring in place
- [ ] Warm-up period defined

During benchmarks:
- [ ] Monitor resource utilization
- [ ] Check for errors
- [ ] Verify steady-state reached
- [ ] Collect all metrics

After benchmarks:
- [ ] Verify data integrity
- [ ] Analyze results
- [ ] Document findings
- [ ] Archive raw data

## Related Topics

- [Performance](/tags/performance/) - Performance optimization
- [Profiling](/tags/profiling/) - Query profiling
- [Monitoring](/tags/monitoring/) - System monitoring
- [Query Optimization](/tags/query-optimization/) - Query tuning
- [Configuration](/tags/configuration/) - Server configuration
- [Scaling](/tags/scaling/) - Scaling strategies

## Further Reading

- Benchmarking Methodology Guide
- Load Testing Best Practices
- Performance Regression Testing
- Capacity Planning with Benchmarks
- Benchmark Result Analysis
- Industry Standard Benchmarks (LDBC, etc.)
