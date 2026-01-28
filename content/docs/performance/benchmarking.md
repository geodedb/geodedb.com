---
title: "Benchmarking"
description: "Comprehensive benchmarking guide for Geode including methodology, tools, workload types, and performance analysis"
weight: 30
tags:
  - performance
  - benchmarking
  - testing
  - metrics
  - load-testing
categories:
  - performance
keywords:
  - benchmarking
  - performance testing
  - load testing
  - throughput
  - latency
  - YCSB
  - stress testing
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Benchmarking Guide

This guide covers benchmarking Geode for performance evaluation, capacity planning, and optimization validation.

## Overview

Effective benchmarking requires:

| Component | Purpose |
|-----------|---------|
| Clear objectives | What are you measuring? |
| Reproducible setup | Consistent environment |
| Realistic workloads | Representative of production |
| Proper metrics | Latency, throughput, resource usage |
| Statistical rigor | Multiple runs, confidence intervals |

## Benchmarking Objectives

### Common Objectives

| Objective | Metrics | Use Case |
|-----------|---------|----------|
| Baseline | Throughput, latency | Establish reference point |
| Capacity planning | Max throughput, breaking point | Sizing infrastructure |
| Regression testing | Before/after comparison | Validating changes |
| Optimization | Specific metric improvement | Tuning configuration |
| Competitive analysis | Comparison with alternatives | Technology selection |

### Defining Success Criteria

```yaml
# benchmark-criteria.yaml
objectives:
  - name: "Query Latency"
    metric: "p99_latency_ms"
    target: "<100ms"

  - name: "Read Throughput"
    metric: "queries_per_second"
    target: ">10000"

  - name: "Write Throughput"
    metric: "writes_per_second"
    target: ">5000"

  - name: "Mixed Workload"
    metric: "operations_per_second"
    target: ">8000"
    workload: "50% read, 50% write"
```

## Environment Setup

### Hardware Requirements

**Benchmark Server**:
```yaml
# Recommended for benchmarking
cpu: 16+ cores (same SKU as production)
memory: 64GB+ RAM
storage: NVMe SSD (1TB+)
network: 10Gbps+
```

**Load Generator**:
```yaml
# Separate machine for load generation
cpu: 8+ cores
memory: 16GB+ RAM
network: 10Gbps+ (same network as server)
```

### Software Configuration

```yaml
# geode.yaml - Benchmark configuration
server:
  listen: '0.0.0.0:3141'
  max_connections: 50000

storage:
  page_cache_size: '32GB'     # 50% of RAM
  page_size: 8192
  wal_sync_interval: 100ms

query:
  max_concurrent_queries: 1000
  query_timeout: 30s
  query_memory_limit: '2GB'

# Disable features that add overhead
logging:
  level: warn                  # Reduce logging
  slow_query:
    enabled: false

monitoring:
  detailed_metrics: false      # Reduce metric overhead
```

### System Tuning

```bash
#!/bin/bash
# system-tuning.sh - Prepare system for benchmarking

# Increase file descriptors
ulimit -n 1000000

# Tune TCP settings
sysctl -w net.core.somaxconn=65535
sysctl -w net.ipv4.tcp_max_syn_backlog=65535
sysctl -w net.core.netdev_max_backlog=65535

# Disable swap
swapoff -a

# Set CPU governor to performance
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
    echo performance > $cpu
done

# Disable transparent huge pages
echo never > /sys/kernel/mm/transparent_hugepage/enabled
```

## Benchmark Tools

### Geode Benchmark Tool

Built-in benchmarking utility:

```bash
# Basic benchmark
geode benchmark \
  --host localhost:3141 \
  --duration 60s \
  --threads 16

# Custom workload
geode benchmark \
  --host localhost:3141 \
  --workload mixed \
  --read-percent 80 \
  --write-percent 20 \
  --duration 300s \
  --threads 32 \
  --connections 100

# Output:
# ============================================
# Geode Benchmark Results
# ============================================
# Duration: 300s
# Threads: 32
# Connections: 100
#
# Throughput:
#   Total Operations: 2,450,000
#   Operations/sec: 8,166
#   Read ops/sec: 6,533
#   Write ops/sec: 1,633
#
# Latency (ms):
#   Min: 0.2
#   Max: 45.3
#   Mean: 2.1
#   P50: 1.8
#   P95: 4.5
#   P99: 8.2
#   P99.9: 15.3
#
# Errors: 0 (0.00%)
```

### Custom Benchmark Scripts

**Python Benchmark**:

```python
#!/usr/bin/env python3
# benchmark.py

import asyncio
import time
import statistics
from geode_client import GeodeClient

async def benchmark_reads(client, num_queries, concurrency):
    """Benchmark read queries"""
    latencies = []
    errors = 0

    async def run_query():
        nonlocal errors
        start = time.perf_counter()
        try:
            await client.query("MATCH (p:Person) RETURN p LIMIT 10")
            latencies.append((time.perf_counter() - start) * 1000)
        except Exception:
            errors += 1

    # Run concurrent queries
    tasks = []
    for _ in range(num_queries):
        if len(tasks) >= concurrency:
            done, tasks = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            tasks = list(tasks)
        tasks.append(asyncio.create_task(run_query()))

    await asyncio.gather(*tasks)

    return {
        'count': num_queries,
        'errors': errors,
        'latencies': latencies,
        'p50': statistics.median(latencies),
        'p95': statistics.quantiles(latencies, n=20)[18],
        'p99': statistics.quantiles(latencies, n=100)[98],
        'mean': statistics.mean(latencies),
        'qps': num_queries / (sum(latencies) / 1000 / concurrency)
    }

async def main():
    client = await GeodeClient.connect("localhost:3141")

    # Warmup
    print("Warming up...")
    await benchmark_reads(client, 1000, 10)

    # Benchmark
    print("Running benchmark...")
    results = await benchmark_reads(client, 100000, 100)

    print(f"""
Benchmark Results
=================
Queries: {results['count']}
Errors: {results['errors']}
QPS: {results['qps']:.0f}
Latency (ms):
  Mean: {results['mean']:.2f}
  P50: {results['p50']:.2f}
  P95: {results['p95']:.2f}
  P99: {results['p99']:.2f}
""")

if __name__ == "__main__":
    asyncio.run(main())
```

**Go Benchmark**:

```go
// benchmark_test.go
package main

import (
    "context"
    "sync"
    "testing"
    "time"

    "go.codepros.org/geode"
)

func BenchmarkReadQuery(b *testing.B) {
    ctx := context.Background()
    client, _ := geode.Connect(ctx, "localhost:3141")
    defer client.Close()

    b.ResetTimer()
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            _, _ = client.Query(ctx, "MATCH (p:Person) RETURN p LIMIT 10")
        }
    })
}

func BenchmarkWriteQuery(b *testing.B) {
    ctx := context.Background()
    client, _ := geode.Connect(ctx, "localhost:3141")
    defer client.Close()

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, _ = client.Query(ctx,
            "CREATE (p:Person {id: $id, name: 'Test'})",
            map[string]interface{}{"id": i})
    }
}

// Run: go test -bench=. -benchtime=60s -cpu=1,4,8,16
```

### Load Generation Tools

**wrk2**:
```bash
# Install wrk2
git clone https://github.com/giltene/wrk2.git
cd wrk2 && make

# Run constant-rate benchmark
./wrk -t4 -c100 -d60s -R10000 \
  --latency \
  -s benchmark.lua \
  http://localhost:8080/query
```

**hey**:
```bash
# HTTP-based benchmark
hey -n 100000 -c 100 -m POST \
  -H "Content-Type: application/json" \
  -d '{"query": "MATCH (n) RETURN n LIMIT 10"}' \
  http://localhost:8080/query
```

## Workload Types

### Read-Heavy Workload

```bash
# 95% reads, 5% writes
geode benchmark \
  --workload custom \
  --read-percent 95 \
  --write-percent 5 \
  --queries-file read-queries.gql

# read-queries.gql
MATCH (p:Person {email: $email}) RETURN p;
MATCH (p:Person)-[:KNOWS]->(f) WHERE p.id = $id RETURN f;
MATCH (p:Person) WHERE p.age > $min AND p.age < $max RETURN p LIMIT 100;
```

### Write-Heavy Workload

```bash
# 20% reads, 80% writes
geode benchmark \
  --workload custom \
  --read-percent 20 \
  --write-percent 80 \
  --queries-file write-queries.gql

# write-queries.gql
CREATE (p:Person {id: $id, name: $name, email: $email});
MATCH (a:Person {id: $from}), (b:Person {id: $to}) CREATE (a)-[:KNOWS]->(b);
MATCH (p:Person {id: $id}) SET p.updated = datetime();
```

### Mixed OLTP Workload

```bash
# Balanced OLTP workload
geode benchmark \
  --workload oltp \
  --duration 300s \
  --threads 64

# OLTP workload includes:
# - 50% point reads
# - 20% range reads
# - 15% inserts
# - 10% updates
# - 5% deletes
```

### Analytical Workload

```bash
# Analytical queries
geode benchmark \
  --workload analytical \
  --queries-file analytical-queries.gql

# analytical-queries.gql
MATCH (p:Person)-[:KNOWS]->(f)
RETURN p.city, count(f) AS friends
GROUP BY p.city
ORDER BY friends DESC
LIMIT 10;

MATCH path = shortestPath((a:Person)-[:KNOWS*1..6]->(b:Person))
WHERE a.id = $start AND b.id = $end
RETURN path;
```

### Graph Traversal Workload

```bash
# Deep graph traversals
geode benchmark \
  --workload traversal \
  --max-depth 5 \
  --queries-file traversal-queries.gql

# traversal-queries.gql
MATCH (a:Person {id: $id})-[:KNOWS*1..3]->(b)
RETURN DISTINCT b;

MATCH (a:Person)-[:KNOWS*2]->(b:Person)-[:KNOWS]->(c:Person)
WHERE a.id = $id
RETURN c LIMIT 100;
```

## Data Generation

### Synthetic Data Generator

```bash
# Generate test data
geode data-gen \
  --nodes 1000000 \
  --edges 5000000 \
  --node-labels Person,Company,Product \
  --edge-types KNOWS,WORKS_AT,PURCHASED \
  --output test-data/

# Load generated data
geode import \
  --source test-data/ \
  --format geode-export
```

### Custom Data Generator

```python
#!/usr/bin/env python3
# generate_data.py

import random
import json
from faker import Faker

fake = Faker()

def generate_persons(n):
    """Generate person nodes"""
    for i in range(n):
        yield {
            "id": i,
            "name": fake.name(),
            "email": fake.email(),
            "age": random.randint(18, 80),
            "city": fake.city(),
            "created_at": fake.date_time_this_decade().isoformat()
        }

def generate_knows_relationships(n_persons, avg_friends):
    """Generate KNOWS relationships"""
    for person_id in range(n_persons):
        n_friends = random.randint(0, avg_friends * 2)
        friends = random.sample(range(n_persons), min(n_friends, n_persons - 1))
        for friend_id in friends:
            if friend_id != person_id:
                yield {
                    "source": person_id,
                    "target": friend_id,
                    "since": fake.date_this_decade().isoformat()
                }

# Generate data
N_PERSONS = 1000000
AVG_FRIENDS = 10

with open('persons.jsonl', 'w') as f:
    for person in generate_persons(N_PERSONS):
        f.write(json.dumps(person) + '\n')

with open('knows.jsonl', 'w') as f:
    for rel in generate_knows_relationships(N_PERSONS, AVG_FRIENDS):
        f.write(json.dumps(rel) + '\n')
```

## Running Benchmarks

### Benchmark Script

```bash
#!/bin/bash
# run-benchmark.sh

set -euo pipefail

RESULTS_DIR="results/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

# Configuration
DURATION=300
THREADS="1 4 8 16 32 64"
WORKLOADS="read-heavy write-heavy mixed"

# System info
echo "Collecting system info..."
uname -a > "$RESULTS_DIR/system-info.txt"
lscpu >> "$RESULTS_DIR/system-info.txt"
free -h >> "$RESULTS_DIR/system-info.txt"
geode --version >> "$RESULTS_DIR/system-info.txt"

# Warmup
echo "Warming up..."
geode benchmark --duration 60s --threads 16 > /dev/null

# Run benchmarks
for workload in $WORKLOADS; do
    for threads in $THREADS; do
        echo "Running: workload=$workload threads=$threads"

        OUTPUT_FILE="$RESULTS_DIR/${workload}_${threads}threads.json"

        geode benchmark \
            --workload $workload \
            --duration $DURATION \
            --threads $threads \
            --output json \
            > "$OUTPUT_FILE"

        # Cool down between runs
        sleep 30
    done
done

# Generate summary
echo "Generating summary..."
python3 summarize_results.py "$RESULTS_DIR" > "$RESULTS_DIR/summary.md"

echo "Results saved to $RESULTS_DIR"
```

### Continuous Benchmarking

```yaml
# .github/workflows/benchmark.yml
name: Performance Benchmark

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  benchmark:
    runs-on: self-hosted  # Dedicated benchmark runner
    steps:
      - uses: actions/checkout@v3

      - name: Build Geode
        run: make release

      - name: Start Geode
        run: ./zig-out/bin/geode serve &

      - name: Load test data
        run: ./scripts/load-benchmark-data.sh

      - name: Run benchmarks
        run: ./scripts/run-benchmark.sh

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: results/

      - name: Compare with baseline
        run: |
          python3 scripts/compare_benchmark.py \
            --baseline results/baseline.json \
            --current results/latest.json \
            --threshold 5%  # Fail if >5% regression
```

## Analyzing Results

### Metrics to Analyze

| Metric | What It Tells You |
|--------|-------------------|
| Throughput (ops/sec) | System capacity |
| Latency (p50, p95, p99) | Response time distribution |
| Error rate | Reliability under load |
| CPU utilization | Compute efficiency |
| Memory usage | Memory efficiency |
| Disk I/O | Storage bottlenecks |
| Network I/O | Network bottlenecks |

### Result Analysis Script

```python
#!/usr/bin/env python3
# analyze_results.py

import json
import pandas as pd
import matplotlib.pyplot as plt

def load_results(results_dir):
    """Load benchmark results"""
    results = []
    for file in Path(results_dir).glob("*.json"):
        with open(file) as f:
            data = json.load(f)
            data['file'] = file.name
            results.append(data)
    return pd.DataFrame(results)

def analyze_throughput(df):
    """Analyze throughput scaling"""
    fig, ax = plt.subplots()

    for workload in df['workload'].unique():
        subset = df[df['workload'] == workload]
        ax.plot(subset['threads'], subset['throughput'],
                marker='o', label=workload)

    ax.set_xlabel('Threads')
    ax.set_ylabel('Throughput (ops/sec)')
    ax.set_title('Throughput vs Concurrency')
    ax.legend()
    ax.grid(True)

    plt.savefig('throughput_scaling.png')

def analyze_latency(df):
    """Analyze latency distribution"""
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))

    for i, percentile in enumerate(['p50', 'p95', 'p99']):
        ax = axes[i]
        for workload in df['workload'].unique():
            subset = df[df['workload'] == workload]
            ax.plot(subset['threads'], subset[percentile],
                    marker='o', label=workload)
        ax.set_xlabel('Threads')
        ax.set_ylabel(f'{percentile} Latency (ms)')
        ax.set_title(f'{percentile} Latency vs Concurrency')
        ax.legend()
        ax.grid(True)

    plt.tight_layout()
    plt.savefig('latency_analysis.png')

def generate_report(df):
    """Generate markdown report"""
    report = """# Benchmark Report

## Summary

| Metric | Value |
|--------|-------|
| Max Throughput | {max_throughput:.0f} ops/sec |
| Best P99 Latency | {best_p99:.2f} ms |
| Optimal Threads | {optimal_threads} |

## Detailed Results

{detailed_table}
"""

    max_throughput = df['throughput'].max()
    best_p99 = df['p99'].min()
    optimal_threads = df.loc[df['throughput'].idxmax(), 'threads']
    detailed_table = df.to_markdown()

    return report.format(
        max_throughput=max_throughput,
        best_p99=best_p99,
        optimal_threads=optimal_threads,
        detailed_table=detailed_table
    )

if __name__ == "__main__":
    import sys
    results_dir = sys.argv[1]

    df = load_results(results_dir)
    analyze_throughput(df)
    analyze_latency(df)
    print(generate_report(df))
```

### Comparison Report

```markdown
# Performance Comparison Report

## Configuration
- **Baseline**: v0.17.5
- **Current**: v0.18.0
- **Hardware**: 16 cores, 64GB RAM, NVMe SSD
- **Data**: 1M nodes, 10M relationships

## Results

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| Read QPS | 15,234 | 16,891 | +10.9% |
| Write QPS | 5,123 | 5,456 | +6.5% |
| P50 Latency | 1.2ms | 1.1ms | -8.3% |
| P99 Latency | 8.5ms | 7.2ms | -15.3% |
| Peak Memory | 12GB | 11GB | -8.3% |

## Conclusion
Version 0.18.0 shows improvements across all metrics, with
particularly notable improvements in P99 latency (-15.3%).
No regressions detected.
```

## Best Practices

### Benchmarking Best Practices

1. **Isolate the system**: No other workloads during benchmark
2. **Warm up**: Run warmup phase before measurements
3. **Multiple runs**: At least 3 runs for statistical validity
4. **Realistic data**: Use production-like data size and distribution
5. **Monitor resources**: Track CPU, memory, disk, network
6. **Document everything**: Configuration, versions, hardware

### Common Pitfalls

1. **Insufficient warmup**: JIT compilation, cache warming
2. **Coordinated omission**: Load generator waiting skews latency
3. **Client bottleneck**: Load generator limiting throughput
4. **Network effects**: Localhost vs network overhead
5. **Small data sets**: Cache effects masking real performance
6. **Single run**: Statistical noise in results

### Reporting Guidelines

1. **Include configuration**: Hardware, software versions, settings
2. **Show distribution**: Not just averages, show percentiles
3. **Multiple metrics**: Throughput AND latency
4. **Error rates**: Include failures in results
5. **Reproducibility**: Share scripts and data

## Related Documentation

- **[Query Optimization](/docs/performance/query-optimization/)** - Optimize queries
- **[Performance Tuning](/docs/performance/)** - System tuning
- **[Monitoring](/docs/operations/monitoring/)** - Production monitoring
- **[Hardware Recommendations](/docs/deployment/deployment-patterns/)** - Hardware sizing
