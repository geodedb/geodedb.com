---
title: "Category: Guides"
description: "Step-by-step guides and how-to documentation for common tasks, workflows, and use cases with Geode graph database."
keywords:
  - guides
  - Geode
  - graph database
  - how-to
  - tutorials
  - workflows
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/guides/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

The **Guides** category provides practical, step-by-step instructions for accomplishing specific tasks with Geode graph database. From basic operations to advanced workflows, these guides help you implement solutions efficiently and correctly.

## Introduction to Geode Guides

Guides bridge the gap between reference documentation and hands-on tutorials. While reference docs explain what features exist and tutorials teach concepts, guides show you exactly how to accomplish specific tasks. Each guide provides clear steps, code examples, and explanations to help you implement solutions confidently.

The Geode guides cover installation, configuration, data modeling, query development, performance optimization, security implementation, deployment, and operational tasks. Whether you're setting up your first instance or optimizing a production system, these guides provide actionable instructions.

## Installation and Setup Guides

### Installing Geode

**Using Docker** (recommended for development):
```bash
# Pull latest image
docker pull codepros/geode:latest

# Run with persistent data
docker run -d \
  --name geode \
  -p 3141:3141 \
  -v geode-data:/var/lib/geode/data \
  -v geode-wal:/var/lib/geode/wal \
  codepros/geode:latest

# Verify installation
docker exec geode geode ping
```

**Building from Source** (Zig 0.1.0+):
```bash
# Install Zig
curl -L https://ziglang.org/download/0.1.0/zig-linux-x86_64-0.1.0.tar.xz | tar xJ
export PATH=$PATH:$(pwd)/zig-linux-x86_64-0.1.0

# Clone and build
git clone https://github.com/codeprosorg/geode
cd geode
make build

# Run
./zig-out/bin/geode serve
```

### Configuring Geode

**Basic Configuration** (`geode.toml`):
```toml
[server]
listen = "0.0.0.0:3141"
max_connections = 1000
log_level = "info"

[storage]
data_dir = "/var/lib/geode/data"
wal_dir = "/var/lib/geode/wal"
cache_size = "4GB"
page_size = 8192

[security]
auth_enabled = true
tls_cert = "/etc/geode/certs/server.crt"
tls_key = "/etc/geode/certs/server.key"

[performance]
query_cache_size = 10000
connection_pool_size = 500
parallel_workers = 8
```

**Start with configuration**:
```bash
geode serve --config /etc/geode/geode.toml
```

### Setting Up TLS

```bash
# Generate self-signed certificate (development only)
openssl req -x509 -newkey rsa:4096 \
  -keyout server.key -out server.crt \
  -days 365 -nodes \
  -subj "/CN=localhost"

# Or use Let's Encrypt (production)
certbot certonly --standalone -d geode.example.com

# Configure in geode.toml
[security]
tls_cert = "/etc/letsencrypt/live/geode.example.com/fullchain.pem"
tls_key = "/etc/letsencrypt/live/geode.example.com/privkey.pem"
```

## Data Modeling Guides

### Designing Your First Schema

**Step 1: Identify Entities**
```gql
-- In a social network, entities are:
-- Users, Posts, Comments, Groups

CREATE (alice:User {
    id: 'user_001',
    name: 'Alice Anderson',
    email: 'alice@example.com',
    joined: datetime('2024-01-15T09:00:00')
});

CREATE (post:Post {
    id: 'post_001',
    content: 'Hello, Geode!',
    timestamp: datetime('2024-03-15T10:30:00'),
    likes: 0
});
```

**Step 2: Define Relationships**
```gql
-- Users post content
MATCH (u:User {id: 'user_001'}), (p:Post {id: 'post_001'})
CREATE (u)-[:POSTED]->(p);

-- Users follow users
MATCH (alice:User {id: 'user_001'}), (bob:User {id: 'user_002'})
CREATE (alice)-[:FOLLOWS]->(bob);

-- Users like posts
MATCH (u:User {id: 'user_002'}), (p:Post {id: 'post_001'})
CREATE (u)-[:LIKED {timestamp: datetime()}]->(p)
SET p.likes = p.likes + 1;
```

**Step 3: Add Indexes**
```gql
-- Unique constraints
CREATE CONSTRAINT unique_user_id ON :User(id);
CREATE CONSTRAINT unique_user_email ON :User(email);
CREATE CONSTRAINT unique_post_id ON :Post(id);

-- Performance indexes
CREATE INDEX user_name ON :User(name);
CREATE INDEX post_timestamp ON :Post(timestamp);
```

### Migrating from SQL to Graph

**SQL Schema**:
```sql
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE
);

CREATE TABLE friendships (
    user1_id INT REFERENCES users(id),
    user2_id INT REFERENCES users(id),
    since DATE,
    PRIMARY KEY (user1_id, user2_id)
);
```

**Equivalent Graph Model**:
```gql
-- Users as nodes
CREATE (alice:User {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com'
});

CREATE (bob:User {
    id: 2,
    name: 'Bob',
    email: 'bob@example.com'
});

-- Friendships as relationships
MATCH (alice:User {id: 1}), (bob:User {id: 2})
CREATE (alice)-[:FRIENDS_WITH {since: date('2024-01-15')}]->(bob);
CREATE (bob)-[:FRIENDS_WITH {since: date('2024-01-15')}]->(alice);
```

**Advantages**:
- No junction table needed
- Bidirectional queries without self-joins
- Relationship properties directly on edges
- Variable-depth traversals (friends of friends) are simple

## Query Development Guides

### Writing Efficient Queries

**Pattern Matching Basics**:
```gql
-- Simple pattern
MATCH (p:Person {name: 'Alice'})
RETURN p;

-- Relationship pattern
MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.name = 'Alice'
RETURN friend.name;

-- Multi-hop pattern
MATCH (p:Person {name: 'Alice'})-[:KNOWS*1..3]->(connection)
RETURN DISTINCT connection.name;
```

**Using Indexes Effectively**:
```gql
-- Bad: Full scan without index
MATCH (p:Person)
WHERE p.email = 'alice@example.com'
RETURN p;

-- Good: Create index first
CREATE INDEX person_email ON :Person(email);

-- Now query uses index
MATCH (p:Person {email: 'alice@example.com'})
RETURN p;

-- Verify with EXPLAIN
EXPLAIN MATCH (p:Person {email: 'alice@example.com'}) RETURN p;
```

**Optimizing Aggregations**:
```gql
-- Efficient: Push filtering before aggregation
MATCH (c:Company)<-[:WORKS_AT]-(e:Employee)
WHERE c.industry = 'Technology'
RETURN c.name, count(e) as employees
ORDER BY employees DESC;

-- Inefficient: Aggregate then filter
MATCH (c:Company)<-[:WORKS_AT]-(e:Employee)
WITH c, count(e) as employees
WHERE employees > 100
RETURN c.name, employees;
```

### Implementing Common Patterns

**Pagination**:
```gql
-- Skip and limit for pagination
MATCH (p:Post)
RETURN p
ORDER BY p.timestamp DESC
SKIP 20
LIMIT 10;  -- Page 3 (items 21-30)
```

**Aggregation with Grouping**:
```gql
-- Count employees by department
MATCH (e:Employee)
RETURN e.department, count(e) as count
ORDER BY count DESC;

-- Average salary by department
MATCH (e:Employee)
RETURN e.department, avg(e.salary) as avg_salary
ORDER BY avg_salary DESC;
```

**Conditional Logic**:
```gql
-- CASE expressions
MATCH (e:Employee)
RETURN e.name,
       e.salary,
       CASE
         WHEN e.salary > 100000 THEN 'High'
         WHEN e.salary > 60000 THEN 'Medium'
         ELSE 'Entry'
       END as salary_band;
```

## Performance Optimization Guides

### Profiling Queries

```gql
-- Use PROFILE to see actual execution
PROFILE
MATCH (p:Person)-[:KNOWS*1..3]->(connection)
WHERE p.name = 'Alice'
RETURN DISTINCT connection.name;

-- Analyze output:
-- - Rows processed
-- - Time spent per operator
-- - Index usage
-- - Memory consumption
```

### Creating Indexes

```gql
-- Single-property index
CREATE INDEX person_email ON :Person(email);

-- Composite index
CREATE INDEX person_location ON :Person(city, state);

-- Unique constraint (creates index)
CREATE CONSTRAINT unique_user_id ON :User(id);

-- Full-text index
CREATE FULLTEXT INDEX article_content ON :Article(title, content);

-- Vector index for embeddings
CREATE VECTOR INDEX doc_embeddings ON :Document(embedding)
WITH (dimension: 384, metric: 'cosine');

-- List all indexes
SHOW INDEXES;

-- Drop index
DROP INDEX person_email;
```

### Query Optimization Checklist

1. **Use specific labels**: `MATCH (p:Person)` not `MATCH (p)`
2. **Create indexes** on frequently queried properties
3. **Use parameters** instead of string concatenation
4. **Limit early** with WHERE clauses before aggregation
5. **Avoid Cartesian products** (multiple MATCH without relationships)
6. **Use EXPLAIN/PROFILE** to verify query plans

## Security Implementation Guides

### Setting Up Authentication

```bash
# Enable authentication in config
[security]
auth_enabled = true

# Create admin user
geode user create admin --password 'SecurePassword123' --admin

# Create regular users
geode user create analyst --password 'UserPass456'
```

**Connect with authentication**:
```python
from geode_client import Client

client = Client(
    "localhost:3141",
    username="analyst",
    password="UserPass456"
)
```

### Implementing Row-Level Security

```gql
-- Create policy: users can only see their own department
CREATE POLICY department_access ON :Employee
  USING (department = current_user_department());

-- Create policy: managers see their reports
CREATE POLICY manager_access ON :Employee
  USING (
    id = current_user_id() OR
    EXISTS ((current_user)-[:MANAGES*]->(this))
  );

-- Enable policies
ENABLE POLICY department_access ON :Employee;
ENABLE POLICY manager_access ON :Employee;

-- Now queries automatically filter
MATCH (e:Employee) RETURN e;
-- Only returns employees user can see
```

### Configuring Encryption

**TLS in Transit**:
```toml
[security]
tls_cert = "/etc/geode/certs/server.crt"
tls_key = "/etc/geode/certs/server.key"
tls_client_auth = false  # Set true for mutual TLS
```

**Encryption at Rest**:
```toml
[security]
encryption_at_rest = true
encryption_key_file = "/etc/geode/keys/master.key"
```

## Deployment Guides

### Docker Deployment

**Docker Compose** (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  geode:
    image: codepros/geode:latest
    ports:
      - "3141:3141"
    volumes:
      - geode-data:/var/lib/geode/data
      - geode-wal:/var/lib/geode/wal
      - ./config:/etc/geode
    environment:
      - GEODE_LOG_LEVEL=info
    restart: unless-stopped

volumes:
  geode-data:
  geode-wal:
```

**Deploy**:
```bash
docker-compose up -d
docker-compose logs -f geode
```

### Kubernetes Deployment

**StatefulSet** (`geode-statefulset.yaml`):
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: geode
spec:
  serviceName: geode
  replicas: 3
  selector:
    matchLabels:
      app: geode
  template:
    metadata:
      labels:
        app: geode
    spec:
      containers:
      - name: geode
        image: codepros/geode:latest
        ports:
        - containerPort: 3141
          name: client
        volumeMounts:
        - name: data
          mountPath: /var/lib/geode/data
        - name: wal
          mountPath: /var/lib/geode/wal
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
  - metadata:
      name: wal
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

**Service** (`geode-service.yaml`):
```yaml
apiVersion: v1
kind: Service
metadata:
  name: geode
spec:
  selector:
    app: geode
  ports:
  - port: 3141
    targetPort: 3141
  type: LoadBalancer
```

**Deploy**:
```bash
kubectl apply -f geode-statefulset.yaml
kubectl apply -f geode-service.yaml
kubectl get pods -l app=geode
```

## Operational Guides

### Backup and Restore

**Create Backup**:
```bash
# Stop writes (optional, for consistency)
geode maintenance lock

# Backup data directory
tar czf geode-backup-$(date +%Y%m%d).tar.gz \
  /var/lib/geode/data \
  /var/lib/geode/wal

# Resume writes
geode maintenance unlock

# Upload to S3
aws s3 cp geode-backup-$(date +%Y%m%d).tar.gz \
  s3://my-backups/geode/
```

**Restore from Backup**:
```bash
# Stop Geode
systemctl stop geode

# Restore data
cd /var/lib/geode
tar xzf /path/to/geode-backup-20240315.tar.gz

# Start Geode
systemctl start geode
```

### Monitoring Setup

**Prometheus Integration**:
```toml
# geode.toml
[telemetry]
prometheus_enabled = true
prometheus_port = 9090
```

**Prometheus Configuration** (`prometheus.yml`):
```yaml
scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['localhost:9090']
```

**Key Metrics to Monitor**:
- `geode_query_duration_seconds` - Query latency
- `geode_active_connections` - Connection count
- `geode_cache_hit_ratio` - Cache effectiveness
- `geode_transaction_commits_total` - Transaction throughput
- `geode_storage_bytes_used` - Disk usage

### Performance Tuning

**Memory Configuration**:
```toml
[storage]
cache_size = "8GB"  # Increase for larger datasets
page_size = 8192    # Default, rarely needs changing

[performance]
query_cache_size = 50000  # Cache more compiled queries
connection_pool_size = 2000  # More concurrent connections
```

**Query Optimization**:
```bash
# Enable query logging
[logging]
query_logging = true
slow_query_threshold = "1s"

# Review slow queries
tail -f /var/log/geode/slow-queries.log
```

## Integration Guides

### Connecting from Python

```python
import asyncio
from geode_client import Client

async def main():
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Execute query
        result, _ = await conn.query("""
            MATCH (p:Person {name: $name})
            RETURN p.email
        """, {"name": "Alice"})

        # Process results
        for row in result.rows:
            print(f"Email: {row['p.email']}")

asyncio.run(main())
```

### Connecting from Go

```go
package main

import (
    "context"
    "database/sql"
    "log"

    _ "geodedb.com/geode/driver"
)

func main() {
    db, err := sql.Open("geode", "quic://localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    rows, err := db.QueryContext(context.Background(),
        "MATCH (p:Person {name: $1}) RETURN p.email", "Alice")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    for rows.Next() {
        var email string
        if err := rows.Scan(&email); err != nil {
            log.Fatal(err)
        }
        log.Printf("Email: %s", email)
    }
}
```

### REST API Integration

```python
from fastapi import FastAPI
from geode_client import Client

app = FastAPI()
client = Client("localhost:3141")

@app.get("/users/{user_id}")
async def get_user(user_id: str):
    result, _ = await client.query("""
        MATCH (u:User {id: $user_id})
        RETURN u
    """, {"user_id": user_id})

    user = await result.single()
    return user if user else {"error": "Not found"}

@app.post("/users/{user_id}/follow/{target_id}")
async def follow_user(user_id: str, target_id: str):
    await client.execute("""
        MATCH (u:User {id: $user_id}), (t:User {id: $target_id})
        CREATE (u)-[:FOLLOWS {timestamp: datetime()}]->(t)
    """, {"user_id": user_id, "target_id": target_id})

    return {"status": "success"}
```

## Troubleshooting Guides

### Common Issues

**Connection Refused**:
```bash
# Check if server is running
geode ping

# Check port is listening
netstat -tln | grep 3141

# Check firewall
sudo ufw allow 3141/tcp
```

**Slow Queries**:
```gql
-- Use PROFILE to identify bottlenecks
PROFILE
MATCH (p:Person)-[:KNOWS*1..5]->(connection)
RETURN connection.name;

-- Create missing indexes
CREATE INDEX person_name ON :Person(name);
```

**Out of Memory**:
```toml
# Increase cache size
[storage]
cache_size = "16GB"

# Reduce connection pool
[performance]
connection_pool_size = 500
```

## Related Topics

- **Getting Started**: Initial setup and first steps
- **Examples**: Practical code samples and applications
- **Reference**: Complete API and syntax documentation
- **Best Practices**: Production deployment recommendations
- **Architecture**: Understanding Geode internals

## Further Reading

- **Query Optimization**: Advanced performance tuning
- **Security**: Comprehensive security hardening
- **Deployment**: Production deployment patterns
- **Monitoring**: Observability and alerting
- **Client Libraries**: Language-specific integration guides

---

Geode guides provide practical, actionable instructions for every aspect of working with the database. From installation to optimization, these step-by-step guides help you implement solutions efficiently and correctly, whether you're building your first application or scaling to production.
