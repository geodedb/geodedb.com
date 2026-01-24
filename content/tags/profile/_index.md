---
title: "Query Profiling with PROFILE Command"
description: "Master query profiling in Geode using the PROFILE command. Analyze execution metrics, identify bottlenecks, optimize performance, and understand query execution patterns."
keywords:
  - PROFILE command
  - query profiling
  - performance analysis
  - execution metrics
  - query optimization
  - bottleneck identification
  - execution time
  - resource usage
  - performance tuning
  - query performance
  - profiling tools
  - execution plan analysis
  - performance metrics
  - optimization workflows
  - database profiling
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/profile/"
    noindex: false
---

# Query Profiling with PROFILE Command

Query profiling is essential for understanding and optimizing database performance. Geode's `PROFILE` command provides comprehensive execution metrics, timing information, and resource usage statistics to help you identify bottlenecks and optimize query performance.

## Understanding PROFILE

### What is Query Profiling?

Query profiling captures detailed runtime information about query execution:

- **Execution Time**: Time spent in each query phase
- **Row Counts**: Number of rows processed at each step
- **Index Usage**: Which indexes were used and how effectively
- **Memory Usage**: Memory allocated during execution
- **Cache Hits**: Cache effectiveness and hit rates
- **Lock Statistics**: Locking behavior and contention

### PROFILE vs EXPLAIN

While both commands analyze queries, they serve different purposes:

**EXPLAIN**:
- Shows the query execution plan
- Runs without executing the query
- Displays estimated costs and strategies
- Used for planning and design

**PROFILE**:
- Executes the query and collects actual metrics
- Shows real execution times and row counts
- Reveals actual resource usage
- Used for performance tuning

Use `EXPLAIN` during development, `PROFILE` during optimization.

## Basic PROFILE Usage

### Simple Profiling

```gql
PROFILE
MATCH (u:User)
WHERE u.age > 25
RETURN u.name, u.email;
```

**Output**:
```
+-------------------------+----------+----------+----------+
| Operation               | Rows     | Time(ms) | DB Hits  |
+-------------------------+----------+----------+----------+
| ProduceResults          | 1,523    | 2.3      | 0        |
| Projection              | 1,523    | 1.8      | 3,046    |
| Filter                  | 1,523    | 4.5      | 5,000    |
| NodeLabelScan(User)     | 5,000    | 8.1      | 5,000    |
+-------------------------+----------+----------+----------+
| Total                   | -        | 16.7     | 13,046   |
+-------------------------+----------+----------+----------+
```

### Understanding Profile Output

Each row represents an operation in the query execution:

- **Operation**: The type of operation performed
- **Rows**: Actual number of rows produced by this operation
- **Time(ms)**: Milliseconds spent in this operation
- **DB Hits**: Number of database lookups performed

### Complex Query Profiling

```gql
PROFILE
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.created > '2025-01-01'
  AND f.verified = true
WITH u, COUNT(f) AS followCount
WHERE followCount > 10
RETURN u.name, followCount
ORDER BY followCount DESC
LIMIT 20;
```

**Output**:
```
+-------------------------+----------+----------+----------+
| Operation               | Rows     | Time(ms) | DB Hits  |
+-------------------------+----------+----------+----------+
| Top(20)                 | 20       | 0.1      | 0        |
| Projection              | 45       | 0.2      | 90       |
| Filter(followCount>10)  | 45       | 0.3      | 0        |
| Aggregation             | 145      | 12.5     | 0        |
| Filter(verified)        | 892      | 3.2      | 892      |
| Expand(FOLLOWS)         | 2,345    | 18.7     | 2,345    |
| Filter(created)         | 1,234    | 4.1      | 1,234    |
| NodeLabelScan(User)     | 5,000    | 8.9      | 5,000    |
+-------------------------+----------+----------+----------+
| Total                   | -        | 48.0     | 9,561    |
+-------------------------+----------+----------+----------+
```

## Profiling Patterns

### Index Usage Analysis

Profile queries to verify index usage:

```gql
-- Without index
PROFILE
MATCH (u:User)
WHERE u.email = 'user@example.com'
RETURN u;

-- Output shows full scan:
-- NodeLabelScan(User): 50,000 rows, 125ms

-- Create index
CREATE INDEX user_email_idx ON :User(email);

-- With index
PROFILE
MATCH (u:User)
WHERE u.email = 'user@example.com'
RETURN u;

-- Output shows index usage:
-- NodeIndexSeek(User.email): 1 row, 0.8ms
```

The dramatic difference in rows processed and time confirms the index is working.

### Join Performance

Profile relationship traversals:

```gql
PROFILE
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
WHERE c.name = 'Electronics'
RETURN p.name, p.price;
```

**Analysis Points**:
- Check if Category filter happens before or after expansion
- Verify index usage on `Category.name`
- Compare row counts before and after filtering
- Identify if relationship direction affects performance

### Aggregation Performance

```gql
PROFILE
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p.category AS category,
     COUNT(*) AS purchases,
     SUM(p.price) AS revenue
RETURN category, purchases, revenue
ORDER BY revenue DESC;
```

**Watch For**:
- Memory usage in aggregation step
- Sorting overhead with large result sets
- Whether grouping keys are indexed
- Impact of multiple aggregation functions

### Subquery Profiling

```gql
PROFILE
MATCH (u:User)
WHERE EXISTS {
  MATCH (u)-[:POSTED]->(post:Post)
  WHERE post.likes > 100
}
RETURN u.name;
```

Profile shows subquery execution for each user, helping identify expensive existence checks.

## Performance Optimization Workflow

### 1. Baseline Profiling

Establish current performance:

```gql
PROFILE
MATCH (u:User)-[:FRIEND]->(f:User)
WHERE u.city = 'Seattle'
RETURN u.name, COUNT(f) AS friendCount;
```

Record baseline metrics:
- Total execution time: 245ms
- DB Hits: 125,000
- Rows scanned: 50,000

### 2. Identify Bottlenecks

Look for:
- **High Time**: Operations taking disproportionate time
- **High DB Hits**: Excessive database lookups
- **Large Row Counts**: Inefficient filtering order
- **Full Scans**: Missing indexes

In our example, `NodeLabelScan(User)` processes 50,000 rows when only 500 are in Seattle.

### 3. Apply Optimizations

Create index on frequently filtered property:

```gql
CREATE INDEX user_city_idx ON :User(city);
```

### 4. Re-Profile

```gql
PROFILE
MATCH (u:User)-[:FRIEND]->(f:User)
WHERE u.city = 'Seattle'
RETURN u.name, COUNT(f) AS friendCount;
```

New metrics:
- Total execution time: 18ms (13.6x faster)
- DB Hits: 1,200 (104x fewer)
- Rows scanned: 500 (100x fewer)

### 5. Iterate

Continue profiling and optimizing until performance meets requirements.

## Advanced Profiling Techniques

### Cache Analysis

Profile with cache statistics:

```gql
PROFILE
MATCH (u:User)
WHERE u.id = $userId
RETURN u;

-- Second execution shows cache hits:
-- NodeIndexSeek: 1 row, 0.1ms (cached)
```

### Memory Profiling

Monitor memory-intensive operations:

```gql
PROFILE
MATCH (u:User)
WITH u
ORDER BY u.name
RETURN u;
```

Large sorts show memory allocation in profile output.

### Concurrent Query Profiling

Profile queries under load:

```bash
# Run multiple instances
for i in {1..10}; do
  geode shell -e "PROFILE MATCH (u:User) RETURN COUNT(u);" &
done
```

Compare single-query vs concurrent execution times.

### Pattern Comparison

Profile different approaches to the same query:

**Approach 1: Filter then expand**
```gql
PROFILE
MATCH (u:User)
WHERE u.active = true
MATCH (u)-[:FOLLOWS]->(f:User)
RETURN u.name, f.name;
```

**Approach 2: Expand then filter**
```gql
PROFILE
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.active = true
RETURN u.name, f.name;
```

Compare total execution times and choose the faster approach.

## Profiling Best Practices

### Development Workflow

1. **Profile Early**: Don't wait until production
2. **Profile Often**: Check performance after each change
3. **Profile Realistic Data**: Use production-scale test data
4. **Profile Edge Cases**: Test with empty, small, and large datasets
5. **Profile Under Load**: Test concurrent execution

### Interpreting Results

**Red Flags**:
- Any operation > 100ms without data transfer
- DB Hits >> Row count (inefficient access)
- Large row count early in pipeline (filter late)
- Multiple full table scans

**Green Flags**:
- Index seeks instead of scans
- Filtering early in pipeline
- Minimal DB hits per row
- Consistent performance across executions

### Common Patterns

**Pattern: Early Filtering**
```gql
-- GOOD: Filter first
MATCH (u:User)
WHERE u.role = 'admin'  -- Reduces rows early
MATCH (u)-[:MANAGES]->(t:Team)
RETURN u.name, t.name;

-- BAD: Filter late
MATCH (u:User)-[:MANAGES]->(t:Team)
WHERE u.role = 'admin'  -- Expands all users first
RETURN u.name, t.name;
```

**Pattern: Index Coverage**
```gql
-- Ensure indexes cover WHERE and JOIN conditions
CREATE INDEX user_role_idx ON :User(role);
CREATE INDEX team_manager_idx ON ()-[:MANAGES]->();
```

**Pattern: Selective Properties**
```gql
-- GOOD: Return only needed properties
RETURN u.name, u.email;

-- BAD: Return entire node
RETURN u;  -- Transfers unnecessary data
```

## Profiling in Production

### Safe Production Profiling

```gql
-- Profile with read-only queries
PROFILE
MATCH (u:User)
WHERE u.lastLogin > '2025-01-01'
RETURN COUNT(u);

-- NEVER profile write-heavy queries in production
-- (they execute and modify data)
```

### Profiling via Monitoring

Integrate profiling into monitoring:

```python
# Python example
import geode_client

async with geode_client.connect() as conn:
    result = await conn.execute("""
        PROFILE
        MATCH (u:User)-[:PURCHASED]->(p:Product)
        WHERE u.id = ?
        RETURN p.name
    """, user_id)

    # Log profile metrics
    metrics = result.profile_data
    logger.info(f"Query time: {metrics.total_time}ms")
    logger.info(f"DB hits: {metrics.db_hits}")
```

### Continuous Profiling

Set up automated profiling:

```bash
#!/bin/bash
# profile-queries.sh

while read -r query; do
  echo "Profiling: $query"
  geode shell -e "PROFILE $query" >> profile-log.txt
  sleep 1
done < critical-queries.txt
```

## Troubleshooting with PROFILE

### Slow Queries

**Symptom**: Query takes > 1 second

**Diagnosis**:
```gql
PROFILE
MATCH (u:User)-[:FRIEND*1..3]->(f:User)
WHERE u.id = 'user123'
RETURN f.name;
```

**Analysis**:
- Check if variable-length expansion is too deep
- Verify starting point uses index
- Consider limiting depth or adding filters

### High Memory Usage

**Symptom**: Out of memory errors

**Diagnosis**:
```gql
PROFILE
MATCH (u:User)
WITH u
ORDER BY u.name  -- Materializes all users
RETURN u
LIMIT 100;
```

**Solution**:
```gql
-- Use index for ordering
CREATE INDEX user_name_idx ON :User(name);

PROFILE
MATCH (u:User)
RETURN u
ORDER BY u.name
LIMIT 100;  -- Now uses index scan, no materialization
```

### Unexpected Results

**Symptom**: Wrong number of rows returned

**Diagnosis**:
```gql
PROFILE
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.city = 'Seattle'
RETURN COUNT(DISTINCT f);
```

Profile shows row counts at each step, revealing where rows are added/removed unexpectedly.

## Integration with Development Tools

### IDE Integration

Many IDEs support profiling output:

```sql
-- Visual Studio Code with Geode extension
-- Hover over PROFILE results for visual execution plan
```

### CI/CD Profiling

Integrate profiling into tests:

```go
// Go example
func TestQueryPerformance(t *testing.T) {
    result := db.Profile(`
        MATCH (u:User)
        WHERE u.active = true
        RETURN COUNT(u)
    `)

    if result.TotalTime > 100 {
        t.Errorf("Query too slow: %dms", result.TotalTime)
    }
}
```

### Profiling Dashboards

Visualize profiling data:

```python
# Grafana dashboard example
import grafana_api

def send_profile_metrics(profile_data):
    grafana_api.send({
        'query_time': profile_data.total_time,
        'db_hits': profile_data.db_hits,
        'rows_processed': profile_data.total_rows
    })
```

## Related Topics

- **[EXPLAIN](/tags/explain/)**: Query execution plans without execution
- **[Performance](/tags/performance/)**: General performance optimization
- **[Indexing](/tags/indexing/)**: Index strategies for better performance
- **[Optimization](/tags/optimization/)**: Query optimization techniques
- **[Benchmarking](/tags/benchmarking/)**: Performance measurement and comparison
- **[Monitoring](/tags/monitoring/)**: Production monitoring and observability
- **[Caching](/tags/caching/)**: Query result caching strategies

## Further Reading

- **PROFILE Command Reference**: `/docs/gql-reference/profile/`
- **Performance Tuning Guide**: `/docs/performance/tuning-guide/`
- **Index Optimization**: `/docs/performance/index-optimization/`
- **Query Best Practices**: `/docs/best-practices/query-optimization/`
- **Monitoring Guide**: `/docs/operations/monitoring/`

## Conclusion

The `PROFILE` command is your most powerful tool for understanding and optimizing query performance in Geode. By systematically profiling queries, identifying bottlenecks, and applying targeted optimizations, you can achieve dramatic performance improvements.

Remember:
- Profile early and often during development
- Compare before and after optimization metrics
- Focus on the biggest bottlenecks first
- Use realistic data volumes for profiling
- Integrate profiling into your CI/CD pipeline

Master query profiling to build high-performance graph applications with Geode.
