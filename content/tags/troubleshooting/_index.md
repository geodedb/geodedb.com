---
title: "Troubleshooting Guide"
description: "Comprehensive troubleshooting guide for Geode graph database covering common issues, diagnostic techniques, error resolution, and debugging strategies."
keywords:
  - troubleshooting
  - debugging
  - error resolution
  - Geode issues
  - problem solving
  - diagnostics
  - graph database troubleshooting
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/troubleshooting/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Troubleshooting involves systematically diagnosing and resolving issues that prevent Geode from operating correctly. This comprehensive guide covers common problems, diagnostic techniques, resolution procedures, and preventive measures to maintain optimal database health and minimize downtime.

## Troubleshooting Methodology

Effective troubleshooting follows a systematic approach rather than random trial and error. This methodology ensures efficient problem resolution while building understanding of system behavior.

### Diagnostic Process

The standard diagnostic process proceeds through defined steps:

1. **Identify Symptoms** - Document observable behavior and error messages
2. **Gather Information** - Collect logs, metrics, and system state
3. **Isolate Variables** - Determine what changed before the issue appeared
4. **Form Hypothesis** - Develop theories about root causes
5. **Test Hypothesis** - Validate theories through targeted investigation
6. **Apply Solution** - Implement fixes based on confirmed diagnosis
7. **Verify Resolution** - Confirm the issue is resolved
8. **Document Findings** - Record the issue and solution for future reference

### Information Gathering

Comprehensive information gathering provides the foundation for accurate diagnosis:

```bash
# System information
uname -a
cat /etc/os-release

# Geode process status
ps aux | grep geode
systemctl status geode

# Resource usage
free -h
df -h
top -bn1 | head -20

# Network status
netstat -tulpn | grep 3141
ss -uln | grep 3141

# Recent logs
journalctl -u geode -n 100 --no-pager
tail -100 /var/log/geode/geode.log
```

## Connection Issues

Connection problems prevent clients from communicating with Geode.

### Cannot Connect to Server

**Symptoms:** Client applications receive connection refused or timeout errors.

**Diagnostic Steps:**

```bash
# Verify server is running
systemctl status geode
ps aux | grep geode

# Check if server is listening
netstat -tulpn | grep 3141
ss -uln sport = :3141

# Test local connectivity
geode shell
```

**Common Causes and Solutions:**

**Server Not Running:**

```bash
# Check why server stopped
journalctl -u geode -n 50

# Start server
systemctl start geode

# Enable automatic startup
systemctl enable geode
```

**Firewall Blocking Connections:**

```bash
# Check firewall status
sudo ufw status
sudo firewall-cmd --list-all

# Allow Geode port (UFW)
sudo ufw allow 3141/udp

# Allow Geode port (firewalld)
sudo firewall-cmd --permanent --add-port=3141/udp
sudo firewall-cmd --reload
```

**Wrong Listen Address:**

```bash
# Check configured listen address
journalctl -u geode | grep "Listening on"

# Reconfigure to listen on all interfaces
# Edit /etc/systemd/system/geode.service
# Change: --listen 127.0.0.1:3141
# To: --listen 0.0.0.0:3141

sudo systemctl daemon-reload
sudo systemctl restart geode
```

### TLS/Certificate Errors

**Symptoms:** "TLS handshake failed" or "Certificate verification failed" errors.

**Diagnostic Steps:**

```bash
# Verify certificate exists and is readable
ls -l /etc/geode/cert.pem /etc/geode/key.pem

# Check certificate validity
openssl x509 -in /etc/geode/cert.pem -text -noout

# Verify certificate not expired
openssl x509 -in /etc/geode/cert.pem -noout -dates
```

**Solutions:**

**Expired Certificate:**

```bash
# Generate new self-signed certificate
openssl req -x509 -newkey rsa:4096 \
  -keyout /etc/geode/key.pem \
  -out /etc/geode/cert.pem \
  -days 365 -nodes \
  -subj "/CN=geode.example.com"

# Restart server
systemctl restart geode
```

**Permission Issues:**

```bash
# Fix certificate permissions
sudo chown geode:geode /etc/geode/*.pem
sudo chmod 600 /etc/geode/key.pem
sudo chmod 644 /etc/geode/cert.pem

sudo systemctl restart geode
```

### Connection Pool Exhaustion

**Symptoms:** "Maximum connections reached" or "Connection pool timeout" errors.

**Diagnostic Steps:**

```bash
# Check active connections
netstat -an | grep 3141 | wc -l

# Monitor connection count over time
watch -n 5 'netstat -an | grep 3141 | wc -l'
```

**Solutions:**

```bash
# Increase max connections
# Edit /etc/systemd/system/geode.service
# Add: --max-connections 2000

sudo systemctl daemon-reload
sudo systemctl restart geode

# Or adjust client pool size
# In application code, reduce pool size
```

## Performance Issues

Performance problems manifest as slow queries or high resource usage.

### Slow Query Performance

**Symptoms:** Queries take longer than expected to execute.

**Diagnostic Steps:**

```gql
-- Profile the slow query
PROFILE MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.city = 'Boston'
RETURN p.name, collect(friend.name);
```

**Common Causes and Solutions:**

**Missing Index:**

```gql
-- Check if query uses indexes
EXPLAIN MATCH (p:Person) WHERE p.email = 'user@example.com' RETURN p;

-- If showing full table scan, create index
CREATE INDEX ON Person(email);

-- Re-profile to verify improvement
PROFILE MATCH (p:Person) WHERE p.email = 'user@example.com' RETURN p;
```

**Inefficient Query Structure:**

```gql
-- Inefficient: Filter after traversal
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE friend.city = 'Boston'
RETURN p.name;

-- Efficient: Filter during pattern match
MATCH (p:Person)-[:KNOWS]->(friend:Person {city: 'Boston'})
RETURN p.name;
```

**Unbounded Variable-Length Paths:**

```gql
-- Problematic: Unbounded traversal
MATCH (a)-[:KNOWS*]->(b)
RETURN count(*);

-- Better: Limited depth
MATCH (a)-[:KNOWS*1..3]->(b)
RETURN count(*);
```

### High Memory Usage

**Symptoms:** Geode process consuming excessive memory or out-of-memory errors.

**Diagnostic Steps:**

```bash
# Check memory usage
ps aux | grep geode
top -p $(pidof geode)

# Monitor memory over time
while true; do
  ps -p $(pidof geode) -o %mem,rss,vsz
  sleep 5
done
```

**Common Causes and Solutions:**

**Large Result Sets:**

```gql
-- Problematic: Returns entire dataset
MATCH (n:Person) RETURN n;

-- Better: Paginate results
MATCH (n:Person) RETURN n LIMIT 1000;
```

**Memory Leaks in Query Execution:**

```bash
# Restart server to reclaim memory (temporary)
systemctl restart geode

# Monitor for recurring memory growth
# If memory grows continuously, report bug with reproduction case
```

**Insufficient System Memory:**

```bash
# Check system memory
free -h

# Increase swap space (temporary measure)
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
sudo mkswap /swapfile
sudo swapon /swapfile

# For permanent solution, add more RAM
```

### High CPU Usage

**Symptoms:** Geode consuming excessive CPU cycles.

**Diagnostic Steps:**

```bash
# Identify CPU usage
top -p $(pidof geode)

# Profile CPU usage
perf record -p $(pidof geode) -g -- sleep 10
perf report
```

**Common Causes and Solutions:**

**Expensive Queries:**

Profile and optimize slow queries (see Slow Query Performance above).

**High Query Volume:**

```bash
# Monitor query rate
# Review application logs for excessive query frequency

# Implement caching in application layer
# Add connection pooling to reduce connection overhead
```

## Data Integrity Issues

Data integrity problems involve incorrect or inconsistent data.

### Missing Data

**Symptoms:** Expected data not found in query results.

**Diagnostic Steps:**

```gql
-- Verify data exists
MATCH (n:Person {id: 12345}) RETURN n;

-- Check for soft deletes or filters
MATCH (n:Person {id: 12345, deleted: false}) RETURN n;

-- Search more broadly
MATCH (n) WHERE n.id = 12345 RETURN n, labels(n);
```

**Solutions:**

If data is genuinely missing, restore from backup:

```bash
# Stop server
systemctl stop geode

# Restore from backup
rsync -av /backup/geode-20260123/ /var/lib/geode/data/

# Start server
systemctl start geode
```

### Duplicate Data

**Symptoms:** Multiple nodes or relationships when only one expected.

**Diagnostic Steps:**

```gql
-- Find duplicates
MATCH (n:Person)
WITH n.email AS email, collect(n) AS nodes
WHERE size(nodes) > 1
RETURN email, size(nodes) AS count;
```

**Solutions:**

```gql
-- Remove duplicates, keeping first
MATCH (n:Person)
WITH n.email AS email, collect(n) AS nodes
WHERE size(nodes) > 1
FOREACH (node IN tail(nodes) | DELETE node);

-- Add unique constraint to prevent future duplicates
CREATE CONSTRAINT ON Person(email) ASSERT email IS UNIQUE;
```

### Transaction Failures

**Symptoms:** "Transaction failed" or "Deadlock detected" errors.

**Diagnostic Steps:**

```bash
# Check logs for transaction errors
journalctl -u geode | grep -i transaction

# Look for deadlock messages
journalctl -u geode | grep -i deadlock
```

**Solutions:**

**Retry Failed Transactions:**

```gql
-- Implement retry logic in application
BEGIN TRANSACTION;
-- operations
COMMIT;
-- If fails, retry with exponential backoff
```

**Reduce Transaction Scope:**

```gql
-- Break large transactions into smaller ones
-- Instead of updating 10,000 nodes in one transaction:
BEGIN TRANSACTION;
MATCH (n:Person) WHERE n.age > 30 SET n.category = 'adult';
COMMIT;

-- Do in batches:
MATCH (n:Person) WHERE n.age > 30
WITH n LIMIT 1000
BEGIN TRANSACTION;
SET n.category = 'adult';
COMMIT;
```

## Build and Installation Issues

Problems during Geode installation or compilation.

### Build Failures

**Symptoms:** Compilation errors during build process.

**Diagnostic Steps:**

```bash
# Check Zig version
zig version
# Should be 0.15.1 or later

# Clean and rebuild
make clean
make build
```

**Common Causes:**

**Wrong Zig Version:**

```bash
# Install correct Zig version
wget https://ziglang.org/download/0.15.1/zig-linux-x86_64-0.15.1.tar.xz
tar -xf zig-linux-x86_64-0.15.1.tar.xz
export PATH="$(pwd)/zig-linux-x86_64-0.15.1:$PATH"
zig version
```

**Missing Dependencies:**

```bash
# Ubuntu/Debian
sudo apt-get install build-essential

# RHEL/CentOS
sudo yum groupinstall "Development Tools"
```

### Startup Failures

**Symptoms:** Server fails to start or crashes immediately.

**Diagnostic Steps:**

```bash
# Check systemd status
systemctl status geode

# View detailed logs
journalctl -u geode -n 100

# Try manual startup for more verbose output
/opt/geode/bin/geode serve --listen 0.0.0.0:3141 --log-level debug
```

**Common Causes:**

**Permission Issues:**

```bash
# Verify data directory permissions
ls -ld /var/lib/geode/data
sudo chown -R geode:geode /var/lib/geode
sudo chmod 750 /var/lib/geode/data
```

**Port Already in Use:**

```bash
# Check what's using port 3141
sudo lsof -i :3141
sudo netstat -tulpn | grep 3141

# Kill conflicting process or use different port
```

**Corrupted Data:**

```bash
# Restore from backup
systemctl stop geode
mv /var/lib/geode/data /var/lib/geode/data.corrupted
rsync -av /backup/geode-latest/ /var/lib/geode/data/
systemctl start geode
```

## Client-Specific Issues

Problems specific to client library interactions.

### Go Client Errors

**Symptoms:** Errors in Go applications using Geode client.

```go
// Enable debug logging
import "log"

client.SetLogLevel("debug")

// Check connection
err := client.Ping(ctx)
if err != nil {
    log.Printf("Ping failed: %v", err)
}
```

### Python Client Issues

**Symptoms:** Python async client errors.

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test connection
async with GeodeClient("localhost:3141") as client:
    await client.ping()
```

### Rust Client Problems

**Symptoms:** Compilation or runtime errors in Rust client.

```rust
// Enable tracing
use tracing_subscriber;

tracing_subscriber::fmt::init();

// Test connection
let client = GeodeClient::connect("localhost:3141").await?;
client.ping().await?;
```

## Logging and Diagnostics

Effective use of logging aids troubleshooting.

### Enabling Debug Logging

```bash
# Temporary debug logging
geode serve --log-level debug

# Permanent configuration
# Edit /etc/systemd/system/geode.service
# Change: --log-level info
# To: --log-level debug

systemctl daemon-reload
systemctl restart geode
```

### Log Analysis

```bash
# Search for errors
journalctl -u geode | grep -i error

# Follow live logs
journalctl -u geode -f

# Filter by time range
journalctl -u geode --since "1 hour ago"

# Export logs
journalctl -u geode --since today > geode-logs.txt
```

### Common Error Messages

**"Connection refused"**: Server not running or firewall blocking

**"TLS handshake failed"**: Certificate issues or version mismatch

**"Query timeout"**: Query taking too long, optimize or increase timeout

**"Out of memory"**: Insufficient system memory or memory leak

**"Permission denied"**: File permission issues or user privileges

## Prevention Strategies

Proactive measures prevent many common issues.

### Regular Maintenance

```bash
# Schedule regular backups
0 2 * * * /opt/geode/backup.sh

# Monitor disk space
0 */6 * * * /opt/geode/check-disk-space.sh

# Rotate logs
/var/log/geode/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

### Health Checks

```bash
#!/bin/bash
# health-check.sh

# Check if server responds
if ! echo "PING" | geode shell | grep -q "PONG"; then
  echo "Health check failed"
  systemctl restart geode
  # Send alert
fi
```

### Capacity Monitoring

```bash
# Monitor key metrics
#!/bin/bash
CONNECTIONS=$(netstat -an | grep 3141 | wc -l)
MEMORY=$(ps -p $(pidof geode) -o %mem --no-headers)
DISK=$(df /var/lib/geode | tail -1 | awk '{print $5}' | sed 's/%//')

if [ $CONNECTIONS -gt 900 ]; then
  echo "Warning: Connection count high: $CONNECTIONS"
fi

if [ ${DISK%.*} -gt 80 ]; then
  echo "Warning: Disk usage high: $DISK%"
fi
```

## Getting Help

When self-troubleshooting doesn't resolve issues.

### Information to Provide

When seeking help, provide:

- Geode version: `geode --version`
- Operating system and version
- Complete error messages
- Steps to reproduce the issue
- Relevant log excerpts
- Configuration files (sanitized)

### Community Resources

- Official documentation at geodedb.com
- Issue tracker for bug reports
- Community forums for questions
- Professional support options

## Related Topics

Troubleshooting connects to several areas:

- **Operations** - Operational procedures and management
- **Monitoring** - System observability and alerting
- **Performance Profiling** - Analyzing query performance
- **Installation** - Setup and deployment procedures
- **Support** - Getting help and resources

## Resources

Additional troubleshooting resources:

- Geode error code reference documentation
- Common issues and solutions knowledge base
- Diagnostic script collection
- Log analysis tools and techniques

Systematic troubleshooting resolves issues efficiently while building operational knowledge. Following these procedures minimizes downtime and maintains optimal Geode database health.
