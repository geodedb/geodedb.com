---
title: "Troubleshooting Guide"
description: "Comprehensive guide for diagnosing and resolving common Geode database issues including installation, connectivity, queries, and performance problems."
summary: "Diagnose and resolve common issues with Geode database installation, connectivity, queries, performance, and operations."
slug: "troubleshooting"
url: "/docs/guides/troubleshooting/"
aliases: []
date: "2026-01-23"
lastmod: "2026-01-23"
draft: false
weight: 10
keywords: ["troubleshooting", "error messages", "debugging", "graph database errors", "connection problems", "query errors", "performance issues"]
tags: ["troubleshooting", "debugging", "operations", "support"]
categories: ["Operations", "Guides"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/guides/troubleshooting/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

## Overview

This guide helps you diagnose and resolve common issues with Geode database installation, connectivity, queries, performance, and operations. Issues are organized by category with step-by-step solutions.

**Quick Links:**

- [Installation Issues](#installation-issues)
- [Server Startup Problems](#server-startup-problems)
- [Connectivity & QUIC/TLS](#connectivity-quic-tls)
- [Query Errors](#query-errors)
- [Performance Problems](#performance-problems)
- [Transaction Issues](#transaction-issues)
- [Client Library Errors](#client-library-errors)
- [Error Code Reference](#error-code-reference)

---

## Installation Issues

### Build Fails with Zig Version Error

**Symptom**: Build fails with error about Zig version mismatch.

**Solution**:

```bash
# Check your Zig version
zig version

# Geode requires Zig 0.1.0+
# Install correct version if needed
# On Linux (from ziglang.org):
wget https://ziglang.org/download/0.1.0/zig-linux-x86_64-0.1.0.tar.xz
tar xf zig-linux-x86_64-0.1.0.tar.xz
export PATH="$(pwd)/zig-linux-x86_64-0.1.0:$PATH"

# Verify version
zig version  # Should show 0.1.0

# Rebuild
cd geode
make clean
make build
```

### Missing Dependencies During Build

**Symptom**: Build fails with missing library errors (libssl, etc.).

**Solution for Ubuntu/Debian**:

```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    libssl-dev \
    pkg-config \
    git \
    curl
```

**Solution for macOS**:

```bash
brew install openssl pkg-config
```

### Out of Memory During Build

**Symptom**: Build process killed or fails with OOM errors.

**Solution**:

```bash
# For debug build (requires less memory):
make build

# For release build (requires ~4GB RAM):
# Add swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Then build
make release
```

---

## Server Startup Problems

### Port Already in Use

**Symptom**: Server fails to start with "address already in use" error.

**Diagnosis**:

```bash
# Check what's using port 3141
lsof -i :3141

# Or use netstat
netstat -tulpn | grep 3141

# Kill the process if it's a stuck Geode instance
kill -9 <PID>
```

**Solution**:

```bash
# Option 1: Use a different port
geode serve --listen 0.0.0.0:8443

# Option 2: Stop the conflicting process
# If it's an old Geode server:
pkill geode

# Then start server
geode serve --listen 0.0.0.0:3141
```

### Data Directory Permission Denied

**Symptom**: Server fails with "permission denied" when accessing data directory.

**Diagnosis**:

```bash
# Check data directory permissions
ls -la /var/geode/data

# Check ownership
stat /var/geode/data
```

**Solution**:

```bash
# Option 1: Fix permissions
sudo chown -R $USER:$USER /var/geode/data
chmod -R 755 /var/geode/data

# Option 2: Use a directory you own
mkdir -p ~/geode-data
geode serve \
    --listen 0.0.0.0:3141 \
    --data-dir ~/geode-data
```

### TLS Certificate Errors on Startup

**Symptom**: Server fails with "cannot load TLS certificate" or similar.

**Diagnosis**:

```bash
# Check if certificate files exist
ls -la server.crt server.key

# Verify certificate is valid
openssl x509 -in server.crt -text -noout

# Check certificate and key match
openssl x509 -noout -modulus -in server.crt | openssl md5
openssl rsa -noout -modulus -in server.key | openssl md5
# These should match
```

**Solution - Generate Self-Signed Certificate**:

```bash
# Generate self-signed certificate for development
openssl req -x509 -newkey rsa:4096 \
    -keyout server.key \
    -out server.crt \
    -days 365 \
    -nodes \
    -subj "/CN=localhost"

# Start server with certificate
geode serve \
    --listen 0.0.0.0:3141 \
    --tls-cert server.crt \
    --tls-key server.key
```

**Solution - Use Let's Encrypt for Production**:

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate (requires domain)
sudo certbot certonly --standalone -d yourdomain.com

# Certificates will be in:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Start server
sudo geode serve \
    --listen 0.0.0.0:3141 \
    --tls-cert /etc/letsencrypt/live/yourdomain.com/fullchain.pem \
    --tls-key /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### Server Crashes Immediately After Start

**Symptom**: Server starts then immediately exits or crashes.

**Diagnosis**:

```bash
# Run with debug logging
geode serve \
    --listen 0.0.0.0:3141 \
    --log-level debug

# Check system logs
journalctl -xe | grep geode

# Check for core dumps
coredumpctl list geode
coredumpctl info <ID>
```

**Common Causes**:

1. **Corrupted data directory**: Delete `data/` and restart
2. **Insufficient file descriptors**: Increase limits with `ulimit -n 65536`
3. **Missing shared libraries**: Check `ldd geode`

---

## Connectivity & QUIC/TLS

### Cannot Connect - Connection Refused

**Symptom**: Client gets "connection refused" error.

**Diagnosis**:

```bash
# Verify server is running
ps aux | grep geode

# Check if port is listening
netstat -tulpn | grep 3141

# Test connectivity
telnet localhost 3141

# Check firewall
sudo iptables -L | grep 3141
```

**Solution**:

```bash
# If server isn't running, start it
geode serve --listen 0.0.0.0:3141

# If firewall is blocking, open port
sudo ufw allow 3141/tcp
sudo ufw allow 3141/udp  # QUIC uses UDP

# For remote connections, ensure server binds to 0.0.0.0
# NOT 127.0.0.1 (localhost only)
geode serve --listen 0.0.0.0:3141
```

### TLS Handshake Failures

**Symptom**: Client fails with "TLS handshake failed" or certificate verification errors.

**For Development (Self-Signed Certificates)**:

```bash
# Python client - disable verification (dev only!)
from geode_client import Client
client = Client(host="localhost", port=3141, skip_verify=True)

# Go client - disable verification (dev only!)
db, err := sql.Open("geode", "localhost:3141?insecure_tls_skip_verify=true")

# Rust client - disable verification (dev only!)
use geode_client::Client;
let client = Client::new("localhost", 3141).skip_verify(true);
let mut conn = client.connect().await?;
```

**For Production (Proper CA)**:

```bash
# Provide CA certificate path
# Python
from geode_client import Client
client = Client(host="localhost", port=3141, ca_cert="/path/to/ca.crt")

# Go
db, err := sql.Open("geode", "localhost:3141?ca=/path/to/ca.crt")

# Rust
use geode_client::Client;
let client = Client::new("localhost", 3141).skip_verify(false);
let mut conn = client.connect().await?;
```

### QUIC Connection Timeout

**Symptom**: Client times out during connection establishment.

**Diagnosis**:

```bash
# Check if QUIC port (UDP) is accessible
nc -zu <server-ip> 3141

# Check server logs for QUIC errors
geode serve --log-level debug 2>&1 | grep QUIC

# Verify UDP is not blocked by firewall
sudo tcpdump -i any udp port 3141
```

**Solution**:

```bash
# Validate UDP connectivity and QUIC MTU settings

# Check MTU issues (QUIC requires proper MTU)
ping -M do -s 1400 <server-ip>

# If MTU is too low, configure on server/network
```

### Connection Pool Exhaustion

**Symptom**: Client gets "no available connections" or "pool exhausted" error.

**Solution**:

```bash
# Increase max connections on server
geode serve \
    --listen 0.0.0.0:3141 \
    --max-connections 10000

# Increase pool size on client
# Go
db.SetMaxOpenConns(100)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(time.Hour)

# Python
from geode_client import ConnectionPool
pool = ConnectionPool(host="localhost", port=3141, max_size=100, timeout=30.0)

# Rust
use geode_client::ConnectionPool;
let pool = ConnectionPool::new("localhost", 3141, 100);
```

---

## Query Errors

### Syntax Error: Unexpected Token

**Symptom**: Query fails with `GQLSTATUS 42000 - Syntax error`.

**Common Causes & Solutions**:

**1. Reserved Keywords as Identifiers**:

```gql
-- WRONG: Using reserved keyword without backticks
MATCH (return:Person) RETURN return.name

-- CORRECT: Use backticks for reserved words
MATCH (`return`:Person) RETURN `return`.name
```

**2. Missing Backticks for Multi-Word Labels**:

```gql
-- WRONG
MATCH (n:Social Network) RETURN n

-- CORRECT
MATCH (n:`Social Network`) RETURN n
```

**3. Parameter Syntax Errors**:

```gql
-- WRONG: Missing $ for parameters
MATCH (n:Person {name: name_param}) RETURN n

-- CORRECT: Use $ prefix
MATCH (n:Person {name: $name_param}) RETURN n
```

**Debugging Tip**:

```bash
# Use EXPLAIN to see where parser fails
geode query "EXPLAIN <your query here>"
```

### Undefined Object Error

**Symptom**: `GQLSTATUS 42001 - Undefined object` or "label not found".

**Cause**: Referencing nodes/relationships that don't exist.

**Solution**:

```gql
-- First, check what labels exist
MATCH (n) RETURN DISTINCT labels(n) AS existing_labels;

-- Create missing labels/nodes
CREATE (p:Person {name: "Alice", age: 30});

-- Use MERGE if unsure if node exists
MERGE (p:Person {id: 1})
ON CREATE SET p.name = "Alice"
ON MATCH SET p.lastSeen = timestamp();
```

### Type Mismatch Errors

**Symptom**: `GQLSTATUS 22000 - Data exception` for type incompatibility.

**Common Cases**:

**1. Comparing Incompatible Types**:

```gql
-- WRONG: Comparing string to number
MATCH (p:Person) WHERE p.age = "30" RETURN p

-- CORRECT: Use consistent types
MATCH (p:Person) WHERE p.age = 30 RETURN p
```

**2. Arithmetic on Non-Numeric Types**:

```gql
-- WRONG
RETURN "hello" + 5

-- CORRECT: Convert first
RETURN toInt("123") + 5
```

**3. NULL Handling**:

```gql
-- NULL comparisons require IS NULL / IS NOT NULL
MATCH (p:Person) WHERE p.age IS NOT NULL RETURN p

-- Arithmetic with NULL returns NULL
RETURN 5 + null  -- Returns null
```

### Performance: Query Too Slow

**See [Performance Problems](#performance-problems) section below.**

### Cartesian Product Warning

**Symptom**: Query generates millions of rows unintentionally.

**Cause**: Multiple `MATCH` clauses without connecting them.

**Example of Problem**:

```gql
-- WARNING: Cartesian product (every person × every book)
MATCH (p:Person)
MATCH (b:Book)
RETURN p.name, b.title
-- If 1000 people and 1000 books = 1,000,000 rows!
```

**Solution**:

```gql
-- Connect the patterns
MATCH (p:Person)-[:READ]->(b:Book)
RETURN p.name, b.title

-- Or use WHERE to filter
MATCH (p:Person), (b:Book)
WHERE p.favoriteGenre = b.genre
RETURN p.name, b.title
```

---

## Performance Problems

### Slow Query Execution

**Step 1: Identify the Problem**

```bash
# Use PROFILE to see execution metrics
geode query "PROFILE MATCH (n:Person) RETURN n"
```

**Step 2: Analyze Query Plan**

```bash
# Use EXPLAIN to see query plan
geode query "EXPLAIN MATCH (n:Person WHERE n.age > 30) RETURN n"

# Look for:
# - "Scan" without index (bad for large datasets)
# - Large "EstimatedRows" counts
# - Missing index usage
```

**Step 3: Add Indexes**

```gql
-- Create index on frequently queried properties
CREATE INDEX person_age ON Person(age);
CREATE INDEX person_name ON Person(name);

-- For full-text search
CREATE INDEX person_bio ON Person(bio) USING fulltext;

-- For spatial queries
CREATE INDEX location_coords ON Location(coordinates) USING spatial;

-- For vector similarity
CREATE INDEX doc_embedding ON Document(embedding) USING vector;

-- Verify indexes exist
SHOW INDEXES;
```

**Step 4: Rewrite Inefficient Queries**

```gql
-- SLOW: Filtering after collecting all data
MATCH (p:Person)
WHERE p.age > 30
RETURN p

-- FASTER: Use index-backed property filter in MATCH
MATCH (p:Person {age: 30})  -- Exact match uses index
RETURN p

-- For ranges, ensure index exists first
CREATE INDEX person_age ON Person(age);
-- Then query
MATCH (p:Person) WHERE p.age > 30 RETURN p
```

### High Memory Usage

**Diagnosis**:

```bash
# Monitor server memory
ps aux | grep geode

# Check page cache size
geode serve --page-cache-size 512  # MB

# Monitor with metrics
curl http://localhost:9090/metrics | grep memory
```

**Solutions**:

**1. Reduce Page Cache**:

```bash
# Default is 1024MB, reduce if needed
geode serve \
    --listen 0.0.0.0:3141 \
    --page-cache-size 256
```

**2. Limit Query Results**:

```gql
-- Always use LIMIT for large result sets
MATCH (n) RETURN n LIMIT 1000

-- Use pagination
MATCH (n:Person)
RETURN n
ORDER BY n.id
SKIP 1000
LIMIT 100
```

**3. Use Streaming for Large Data**:

```python
# Python - stream results instead of loading all
for row in client.rows.query_stream("MATCH (n:Person) RETURN n"):
    process(row)  # Process one row at a time
```

### Index Not Being Used

**Diagnosis**:

```bash
# Check if index exists
geode query "SHOW INDEXES"

# Use EXPLAIN to see if index is used
geode query "
  EXPLAIN MATCH (p:Person WHERE p.email = 'alice@example.com')
  RETURN p
"

# Look for "IndexSeek" or "IndexScan" in plan
# If you see "NodeScan", index is NOT being used
```

**Common Reasons Index Isn't Used**:

**1. Index doesn't exist for that property**:

```gql
-- Create it
CREATE INDEX person_email ON Person(email);
```

**2. Query pattern doesn't match index**:

```gql
-- Index on "name" won't help this query:
MATCH (p:Person) WHERE p.email = '...' RETURN p

-- Need index on "email":
CREATE INDEX person_email ON Person(email);
```

**3. Function on indexed property**:

```gql
-- WRONG: Function prevents index usage
MATCH (p:Person) WHERE toLower(p.name) = 'alice' RETURN p

-- BETTER: Store normalized value
MATCH (p:Person) WHERE p.normalizedName = 'alice' RETURN p

-- Or create expression index (if supported):
CREATE INDEX person_name_lower ON Person(toLower(name));
```

### Slow Aggregations

**Problem**: `count()`, `sum()`, `avg()` queries are slow.

**Solution**:

```gql
-- SLOW: Count all nodes of a label
MATCH (p:Person) RETURN count(p)

-- FASTER: If you maintain counts in a separate node
MATCH (stats:Statistics {label: 'Person'}) RETURN stats.count

-- Update count when adding/removing
MATCH (stats:Statistics {label: 'Person'})
SET stats.count = stats.count + 1
```

**For Large Aggregations**:

```gql
-- Use materialized views (if available)
-- Materialized views are not reachable from GQL: the grammar has no
-- MATERIALIZED keyword. Precompute the aggregate onto nodes instead:
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH p, count(*) AS purchases
SET p.purchase_count = purchases;

-- Query the view
SELECT * FROM person_stats;
```

---

## Transaction Issues

### Deadlock Detected

**Symptom**: Transaction fails with deadlock error.

**Cause**: Two or more transactions waiting for each other to release locks.

**Solution 1: Retry with Exponential Backoff**:

```python
import time
import random
from geode_client import Client, QueryError

client = Client(host="localhost", port=3141)

async def execute_with_retry(conn, query, max_retries=3):
    for attempt in range(max_retries):
        try:
            await conn.query(query)
            return
        except QueryError:
            if attempt == max_retries - 1:
                raise
            # Exponential backoff with jitter
            wait = (2 ** attempt) + random.uniform(0, 1)
            time.sleep(wait)

# async with client.connection() as conn:
#     await execute_with_retry(conn, "MATCH (n) RETURN count(n)")
```

**Solution 2: Consistent Lock Ordering**:

```gql
-- BAD: Inconsistent ordering across transactions
-- Transaction 1: Locks Alice, then Bob
-- Transaction 2: Locks Bob, then Alice
-- = DEADLOCK RISK

-- GOOD: Always lock in same order (e.g., by ID)
BEGIN TRANSACTION;
  MATCH (a:Person {id: 1})
  MATCH (b:Person {id: 2})
  SET a.balance = a.balance - 100,
      b.balance = b.balance + 100;
COMMIT;
```

### Transaction Timeout

**Symptom**: Long-running transaction aborts with timeout.

**Solution 1: Increase Timeout**:

```bash
# Server-side timeout configuration
geode serve \
    --listen 0.0.0.0:3141 \
    --transaction-timeout 300  # seconds
```

**Solution 2: Break into Smaller Transactions**:

```python
# SLOW: One huge transaction
async with client.connection() as tx:
    await tx.begin()
    for i in range(100000):
        await tx.execute("CREATE (n:Node {id: $id})", {"id": i})
    await tx.commit()

# FASTER: Batch into smaller transactions
batch_size = 1000
for i in range(0, 100000, batch_size):
    async with client.connection() as tx:
        await tx.begin()
        for j in range(i, min(i + batch_size, 100000)):
            await tx.execute("CREATE (n:Node {id: $id})", {"id": j})
        await tx.commit()
```

### Savepoint Rollback Issues

**Symptom**: `ROLLBACK TO SAVEPOINT` doesn't restore expected state.

**Common Mistake**:

```gql
BEGIN TRANSACTION;
  CREATE (a:Person {name: "Alice"});
  SAVEPOINT sp1;
  CREATE (b:Person {name: "Bob"});
  ROLLBACK TO sp1;  -- Bob creation rolled back
  -- Alice is still there
  COMMIT;  -- Alice persists, Bob does not
```

**Solution**: Understand savepoint scope:

```gql
BEGIN TRANSACTION;
  SAVEPOINT sp1;
  CREATE (a:Person {name: "Alice"});
  CREATE (b:Person {name: "Bob"});
  ROLLBACK TO sp1;  -- Both Alice and Bob rolled back
  CREATE (c:Person {name: "Charlie"});
COMMIT;  -- Only Charlie persists
```

---

## Client Library Errors

### Python: asyncio Event Loop Errors

**Symptom**: `RuntimeError: Event loop is closed` or similar.

**Solution**:

```python
import asyncio

# WRONG: Reusing closed loop
loop = asyncio.get_event_loop()
loop.run_until_complete(main())
loop.close()
loop.run_until_complete(another_func())  # ERROR

# CORRECT: Use asyncio.run()
asyncio.run(main())
asyncio.run(another_func())

# Or manage loop properly
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)
try:
    loop.run_until_complete(main())
finally:
    loop.close()
```

### Go: Connection Pool Starvation

**Symptom**: Queries hang or timeout waiting for connection.

**Solution**:

```go
import (
    "database/sql"
    "time"
)

db, err := sql.Open("geode", "localhost:3141")
if err != nil {
    log.Fatal(err)
}

// Configure pool
db.SetMaxOpenConns(25)              // Max open connections
db.SetMaxIdleConns(5)               // Idle connections in pool
db.SetConnMaxLifetime(5 * time.Minute)  // Max lifetime
db.SetConnMaxIdleTime(1 * time.Minute)  // Max idle time

// Always use context with timeout
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

rows, err := db.QueryContext(ctx, "MATCH (n) RETURN n LIMIT 10")
```

### Rust: Quinn QUIC Connection Errors

**Symptom**: Connection fails with Quinn-specific errors.

**Solution**:

```rust
use geode_client::{Client, Error};

let client = Client::new("localhost", 3141).skip_verify(false);
let mut conn = client.connect().await?;

let mut retries = 3;
while retries > 0 {
    match conn.query("MATCH (n) RETURN n LIMIT 10").await {
        Ok(_) => break,
        Err(Error::Connection(_)) if retries > 1 => {
            retries -= 1;
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        }
        Err(e) => return Err(e),
    }
}
```

### Zig: Memory Allocation Failures

**Symptom**: Zig client panics with OOM or allocation error.

**Solution**:

```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    // Use larger allocator for large result sets
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = try geode.Client.init(allocator, .{
        .host = "localhost",
        .port = 3141,
    });
    defer client.deinit();

    // For very large results, use streaming or pagination
    const result = try client.query(
        "MATCH (n) RETURN n LIMIT 1000"  // Limit result size
    );
    defer result.deinit();

    // Process results in batches
    while (try result.next()) |row| {
        // Process row
        // Memory is freed after each iteration
    }
}
```

---

## Error Code Reference

### GQL Status Codes (ISO Standard)

| Code | Category | Meaning | Common Cause |
|------|----------|---------|--------------|
| `00000` | Success | No error | Query executed successfully |
| `02000` | No Data | Query returned no results | Empty result set (not an error) |
| `22000` | Data Exception | Type mismatch or invalid data | Comparing string to number |
| `42000` | Syntax Error | Invalid GQL syntax | Missing keyword, typo |
| `42001` | Undefined Object | Referenced object doesn't exist | Label/property not found |
| `42002` | Duplicate Object | Object already exists | Creating duplicate unique constraint |

### Internal Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `ERR_OOM` | Out of memory | Reduce query size, increase server memory |
| `ERR_FLOAT_NAN` | Invalid floating point (NaN) | Check calculation logic |
| `ERR_CHAR_LEN` | String exceeds max length | Shorten string or increase limit |
| `ERR_DEC_DIV_ZERO` | Division by zero | Add zero check before division |
| `ERR_IP_PARSE` | Invalid IP address format | Use valid IPv4/IPv6 format |
| `ERR_JSON_PARSE` | Invalid JSON | Validate JSON syntax |

### Transaction Error Codes

| Error | Meaning | Solution |
|-------|---------|----------|
| `DEADLOCK_DETECTED` | Circular wait for locks | Retry with backoff |
| `TRANSACTION_TIMEOUT` | Transaction exceeded time limit | Break into smaller transactions |
| `SERIALIZATION_FAILURE` | SSI conflict detected | Retry transaction |
| `INVALID_SAVEPOINT` | Savepoint name not found | Check savepoint spelling |

---

## Diagnostic Commands

### Server Health Check

```bash
# Check if server is responsive
curl http://localhost:9090/health

# Check readiness (for K8s)
curl http://localhost:9090/ready

# View metrics
curl http://localhost:9090/metrics
```

### Log Analysis

```bash
# View recent errors
journalctl -u geode -n 100 | grep ERROR

# Follow logs in real-time
journalctl -u geode -f

# Filter by severity
geode serve --log-level debug 2>&1 | grep -E 'ERROR|WARN'

# Search for specific error
grep "GQLSTATUS 42000" /var/log/geode/server.log
```

### Connection Testing

```bash
# Test QUIC connectivity (requires netcat with QUIC support)
nc -zu <server-ip> 3141

# Test with client
geode query "RETURN 1"

# Verbose connection debug
export GEODE_LOG_LEVEL=debug
geode query "RETURN 1"
```

### Performance Profiling

```gql
-- Profile a slow query
PROFILE
MATCH (p:Person)-[:KNOWS*1..3]->(f:Person)
WHERE p.name = 'Alice'
RETURN f.name, count(*) AS connections
ORDER BY connections DESC
LIMIT 10;

-- Explain query plan
EXPLAIN
MATCH (p:Person {age: 30})
RETURN p;

-- Running queries and open transactions are not listed by the server: there is
-- no db.currentQueries() or db.transactions() procedure. Time the suspect
-- statement directly instead.
PROFILE MATCH (p:Person) WHERE p.email = 'alice@example.com' RETURN p;
```

For fleet-wide load, scrape the metrics endpoint
(`geode_queries_total`, `geode_query_duration_seconds`,
`geode_connections_active`) rather than polling the database.

---

## Getting Help

### Check Documentation

- [Installation Guide](/guides/installation/)
- [Configuration Reference](/docs/configuration/server-configuration/)
- [GQL Guide](/docs/gql/guide/)
- [Performance Tuning](/docs/query/performance-tuning/)
- [Security Overview](/docs/security/overview/)

### Community & Support

- **GitLab Issues**: <https://gitlab.com/devnw/codepros/geode/geode/issues>
- **Discussions**: <https://gitlab.com/devnw/codepros/geode/geode/discussions>
- **GitLab**: <https://gitlab.com/devnw/codepros/geode/>

### Reporting Bugs

When reporting an issue, include:

1. **Geode version**: `geode --version`
2. **OS and version**: `uname -a`
3. **Zig version**: `zig version`
4. **Exact error message** with full stack trace
5. **Minimal reproducible example** of the query/code
6. **Server logs** around the time of error
7. **Configuration** (anonymize sensitive data)

**Example Bug Report**:

```markdown
**Geode Version**: __GEODE_TAG__
**OS**: Ubuntu 22.04 LTS
**Zig Version**: 0.1.0

**Issue**: Query with CASE expression fails with syntax error

**Query**:
```gql
MATCH (p:Person)
RETURN p.name, CASE WHEN p.age < 30 THEN 'young' ELSE 'senior' END AS category
```

**Error**:

```
GQLSTATUS 42000: Syntax error near 'CASE'
```

**Server Logs**:

```
[ERROR] Parser failed at line 2, column 20
```

**Expected**: Query should categorize people by age
**Actual**: Syntax error

```

---

## Next Steps

- [Configuration Reference](/docs/configuration/server-configuration/) - Tune server settings
- [Query Performance](/docs/query/performance-tuning/) - Optimize slow queries
- [Security Guide](/docs/security/overview/) - Harden production deployment
- [Deployment Guide](/docs/ops/deployment/) - Production deployment patterns
- [Monitoring](/docs/ops/observability/) - Set up metrics and alerts
