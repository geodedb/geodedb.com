---
title: "System Integration"
description: "Complete guide to integrating Geode graph database into your application ecosystem including client libraries, APIs, protocols, data pipelines, and third-party system connectors."
keywords:
  - integration
  - system integration
  - API integration
  - client libraries
  - data pipelines
  - connectors
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/integration/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# System Integration

Geode provides comprehensive integration capabilities designed to fit seamlessly into modern application architectures. From native client libraries and standard protocols to data pipeline connectors and third-party integrations, Geode supports diverse integration patterns across multiple languages and platforms.

## Introduction to Geode Integration

Integration is a first-class concern in Geode's architecture. The database is designed to work in heterogeneous environments where applications may be written in different languages, deployed across various platforms, and need to communicate using different protocols. Geode achieves this through:

- **Native Client Libraries**: Production-ready clients for Go, Python, Rust, and Zig
- **Standard Protocols**: QUIC+TLS for high-performance communication, HTTP/REST for broad compatibility
- **ISO/IEC 39075:2024 GQL**: Standards-compliant query language ensuring long-term compatibility
- **JSON Line Protocol**: Simple, text-based wire format for easy debugging and custom client development
- **Database/SQL Interface**: Native Go integration with the standard database/sql package

## Client Library Integration

### Go Integration

Geode's Go client implements the standard `database/sql` interface, enabling seamless integration with existing Go applications:

```go
import (
    "database/sql"
    "fmt"
    _ "geodedb.com/geode"
)

func main() {
    // Standard database/sql interface
    db, err := sql.Open("geode", "geode://localhost:3141/graph")
    if err != nil {
        panic(err)
    }
    defer db.Close()

    // Connection pooling automatically managed
    db.SetMaxOpenConns(100)
    db.SetMaxIdleConns(10)
    db.SetConnMaxLifetime(time.Hour)

    // Execute GQL queries using familiar SQL patterns
    rows, err := db.Query(`
        MATCH (u:User)-[:PURCHASED]->(p:Product)
        WHERE u.id = $user_id
        RETURN p.name, p.price, p.category
    `, 12345)
    if err != nil {
        panic(err)
    }
    defer rows.Close()

    for rows.Next() {
        var name, category string
        var price float64
        if err := rows.Scan(&name, &price, &category); err != nil {
            panic(err)
        }
        fmt.Printf("%s ($%.2f) - %s\n", name, price, category)
    }

    // Transactions work as expected
    tx, err := db.Begin()
    defer tx.Rollback()

    _, err = tx.Exec(`
        CREATE (u:User {
            id: $id,
            email: $email,
            created_at: $timestamp
        })
    `, 99999, "user@example.com", time.Now())

    tx.Commit()
}
```

**Integration Benefits**:
- Drop-in replacement for SQL databases in Go applications
- Works with ORMs and query builders expecting database/sql
- Automatic connection pooling and lifecycle management
- Context-aware operations with timeout and cancellation support

### Python Integration

The Python client provides async/await integration with modern Python applications:

```python
import asyncio
import geode_client
import geode_client
from geode_client import Client
from datetime import datetime

async def integrate_geode():
    # Async context manager for automatic cleanup
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Execute queries with async/await
        result, _ = await conn.query("""
            MATCH (u:User)-[:PURCHASED]->(p:Product)
            WHERE u.id = $user_id
            RETURN p.name, p.price, p.category
        """, {"user_id": 12345})

        for row in result.rows:
            print(f"{row['p.name']} (${row['p.price']}) - {row['p.category']}")

        # Transaction support
        async with client.connection() as tx:
            await tx.begin()
            await tx.execute("""
                CREATE (u:User {
                    id: $id,
                    email: $email,
                    created_at: $timestamp
                })
            """, {
                "id": 99999,
                "email": "user@example.com",
                "timestamp": datetime.now()
            })
            await tx.commit()

# Integration with FastAPI
from fastapi import FastAPI, Depends
from typing import List

app = FastAPI()

# Shared connection pool
geode_pool = None

@app.on_event("startup")
async def startup():
    global geode_pool
    from geode_client import ConnectionPool
    geode_pool = ConnectionPool(
        url="localhost:3141",
        min_connections=10,
        max_connections=100
    )

@app.on_event("shutdown")
async def shutdown():
    await geode_pool.close()

async def get_client():
    async with geode_pool.acquire() as client:
        yield client

@app.get("/users/{user_id}/purchases")
async def get_user_purchases(
    user_id: int,
    client: Client = Depends(get_client)
) -> List[dict]:
    result, _ = await client.query("""
        MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)
        RETURN p.name, p.price, p.category
    """, {"user_id": user_id})

    return [dict(row) for row in result]
```

**Integration Benefits**:
- Native async/await support for asyncio applications
- Connection pooling for high-concurrency workloads
- FastAPI, Django Channels, and AIOHTTP compatibility
- Type-safe query builders and parameter handling

### Rust Integration

The Rust client provides zero-cost abstractions with tokio integration:

```rust
use geode_client::{Client, Value};
use rust_decimal::Decimal;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
struct Purchase {
    name: String,
    price: Decimal,
    category: String,
}

#[tokio::main]
async fn main() -> geode_client::Result<()> {
    let client = Client::new("localhost", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    // Execute query
    let mut params = HashMap::new();
    params.insert("user_id".to_string(), Value::int(12345));
    let (page, _) = conn.query_with_params(
        "MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)
         RETURN p.name, p.price, p.category",
        &params,
    ).await?;

    for row in &page.rows {
        println!("{} (${}) - {}",
            row.get("name").unwrap().as_string()?,
            row.get("price").unwrap().as_decimal()?,
            row.get("category").unwrap().as_string()?
        );
    }

    // Transaction support
    conn.begin().await?;
    let mut tx_params = HashMap::new();
    tx_params.insert("id".to_string(), Value::int(99999));
    tx_params.insert("email".to_string(), Value::string("user@example.com"));
    conn.query_with_params(
        "CREATE (u:User {id: $id, email: $email})",
        &tx_params,
    ).await?;

    conn.commit().await?;

    Ok(())
}

// Integration with Actix-Web
use actix_web::{web, App, HttpServer, Result as ActixResult};
use std::sync::Arc;

#[actix_web::get("/users/{user_id}/purchases")]
async fn get_purchases(
    user_id: web::Path<i64>,
    client: web::Data<Arc<Client>>
) -> ActixResult<web::Json<Vec<Purchase>>> {
    let mut conn = client.connect().await
        .map_err(actix_web::error::ErrorInternalServerError)?;

    let mut params = HashMap::new();
    params.insert("user_id".to_string(), Value::int(user_id.into_inner()));
    let (page, _) = conn.query_with_params(
        "MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)
         RETURN p.name, p.price, p.category",
        &params
    ).await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    let purchases = page.rows.iter().map(|row| Purchase {
        name: row.get("name").unwrap().as_string().unwrap().to_string(),
        price: row.get("price").unwrap().as_decimal().unwrap(),
        category: row.get("category").unwrap().as_string().unwrap().to_string(),
    }).collect();

    Ok(web::Json(purchases))
}

#[tokio::main]
async fn server() -> std::io::Result<()> {
    let client = Arc::new(
        Client::new("localhost", 3141).skip_verify(true)
    );

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(client.clone()))
            .service(get_purchases)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

**Integration Benefits**:
- Zero-cost abstractions with compile-time optimization
- Native tokio integration for async Rust applications
- Type-safe query execution with serde deserialization
- High-performance, workload-dependent throughput

## HTTP/REST Integration

For environments where native clients are unavailable or HTTP integration is preferred, Geode provides RESTful endpoints:

```bash
# Execute query via REST API
curl -X POST https://geode.example.com/api/v1/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token_abc123" \
  -d '{
    "query": "MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product) RETURN p",
    "parameters": {
      "user_id": 12345
    }
  }'

# Response
{
  "schema": {
    "fields": [{"name": "p", "type": "NODE"}]
  },
  "data": [
    {
      "p": {
        "labels": ["Product"],
        "properties": {
          "id": 101,
          "name": "Laptop",
          "price": 999.99,
          "category": "Electronics"
        }
      }
    }
  ],
  "metadata": {
    "rows_returned": 1,
    "execution_time_ms": 12
  }
}
```

**REST Integration Patterns**:

```javascript
// JavaScript/Node.js integration
const axios = require('axios');

class GeodeClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    async query(gql, parameters = {}) {
        const response = await axios.post(
            `${this.baseUrl}/api/v1/query`,
            { query: gql, parameters },
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    }

    async transaction(queries) {
        // Begin transaction
        const txResponse = await axios.post(
            `${this.baseUrl}/api/v1/transaction/begin`,
            {},
            { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
        );
        const txId = txResponse.data.transaction_id;

        try {
            // Execute queries
            for (const { query, parameters } of queries) {
                await axios.post(
                    `${this.baseUrl}/api/v1/transaction/${txId}/query`,
                    { query, parameters },
                    { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
                );
            }

            // Commit
            await axios.post(
                `${this.baseUrl}/api/v1/transaction/${txId}/commit`,
                {},
                { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
            );
        } catch (error) {
            // Rollback on error
            await axios.post(
                `${this.baseUrl}/api/v1/transaction/${txId}/rollback`,
                {},
                { headers: { 'Authorization': `Bearer ${this.apiKey}` } }
            );
            throw error;
        }
    }
}

// Usage
const { createClient } = require('@geode/client');
const client = await createClient('geode://geode.example.com:3141');

const rows = await client.queryAll(`
    MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)
    RETURN p.name, p.price
`, { params: { user_id: 12345 } });

console.log(rows);
```

## Data Pipeline Integration

### Apache Kafka Integration

Stream changes from Geode to Kafka using Change Data Capture (CDC):

```python
from geode_client import Client
from kafka import KafkaProducer
import json
import asyncio

async def geode_to_kafka():
    producer = KafkaProducer(
        bootstrap_servers=['kafka:9092'],
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

    client = Client(host="localhost", port=3141)
    last_seen = None

    async with client.connection() as conn:
        while True:
            result, _ = await conn.query(
                """
                MATCH (n)
                WHERE n.updated_at > $since
                RETURN labels(n) AS labels, n AS node, n.updated_at AS updated_at
                ORDER BY updated_at
                """,
                {"since": last_seen or "1970-01-01T00:00:00Z"},
            )

            for row in result.rows:
                topic = f\"geode.{row['labels'].raw_value[0]}\"
                producer.send(topic, {
                    "operation": "UPSERT",
                    "timestamp": row["updated_at"].raw_value,
                    "data": row["node"].raw_value,
                })
                last_seen = row["updated_at"].raw_value

            await asyncio.sleep(1)

asyncio.run(geode_to_kafka())
```

### ETL Integration

Integrate Geode with data transformation pipelines:

```python
from geode_client import Client
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

def extract_from_postgres(**context):
    import psycopg2
    conn = psycopg2.connect("postgresql://user:pass@postgres:5432/db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email FROM users WHERE created_at > %s",
                   (context['execution_date'],))
    return cursor.fetchall()

async def load_to_geode(**context):
    users = context['task_instance'].xcom_pull(task_ids='extract')

    client = Client(host="localhost", port=3141)

    async with client.connection() as conn:
        await conn.begin()
        try:
            for user_id, name, email in users:
                await conn.execute("""
                    MERGE (u:User {id: $id})
                    SET u.name = $name, u.email = $email, u.synced_at = $timestamp
                """, {
                    "id": user_id,
                    "name": name,
                    "email": email,
                    "timestamp": datetime.now()
                })
            await conn.commit()
        except Exception:
            await conn.rollback()
            raise

with DAG(
    'postgres_to_geode',
    default_args={'owner': 'airflow'},
    schedule_interval=timedelta(hours=1),
    start_date=datetime(2024, 1, 1)
) as dag:

    extract = PythonOperator(
        task_id='extract',
        python_callable=extract_from_postgres
    )

    load = PythonOperator(
        task_id='load',
        python_callable=load_to_geode
    )

    extract >> load
```

## Monitoring and Observability Integration

### Prometheus Integration

Geode exposes Prometheus metrics for monitoring integration:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'geode'
    static_configs:
      - targets: ['geode:9090']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

Query Geode metrics:

```python
from prometheus_api_client import PrometheusConnect

prom = PrometheusConnect(url="http://prometheus:9090")

# Query Geode query latency
query_latency = prom.custom_query(
    'histogram_quantile(0.95, geode_query_duration_seconds_bucket)'
)

# Query connection pool status
connections = prom.custom_query('geode_connection_pool_active')

# Alert on high error rate
error_rate = prom.custom_query(
    'rate(geode_query_errors_total[5m]) > 0.01'
)
```

### Grafana Integration

Import Geode dashboards for visualization:

```json
{
  "dashboard": {
    "title": "Geode Database Metrics",
    "panels": [
      {
        "title": "Query Rate",
        "targets": [
          {
            "expr": "rate(geode_queries_total[5m])",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "title": "Query Latency (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, geode_query_duration_seconds_bucket)",
            "legendFormat": "p95"
          }
        ]
      },
      {
        "title": "Connection Pool",
        "targets": [
          {
            "expr": "geode_connection_pool_active",
            "legendFormat": "Active"
          },
          {
            "expr": "geode_connection_pool_idle",
            "legendFormat": "Idle"
          }
        ]
      }
    ]
  }
}
```

## Authentication and Security Integration

### OAuth2/OIDC Integration

Integrate Geode with OAuth2 identity providers:

```python
from geode_client import Client
from authlib.integrations.httpx_client import AsyncOAuth2Client
import asyncio

async def geode_with_oauth():
    # Get OAuth2 token
    oauth = AsyncOAuth2Client(
        client_id='geode-client',
        client_secret='secret',
        token_endpoint='https://auth.example.com/token'
    )

    token = await oauth.fetch_token()
    access_token = token['access_token']

    # Map OAuth identity to a Geode user and login
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        auth = geode_client.AuthClient(conn)
        await auth.login("service_user", "service_password")
        result, _ = await conn.query("""
            MATCH (u:User {email: $email})
            RETURN u
        """, {"email": "user@example.com"})

asyncio.run(geode_with_oauth())
```

### LDAP Integration

Authenticate Geode users against LDAP:

```python
from geode_client import Client
import ldap3

def authenticate_ldap(username, password):
    server = ldap3.Server('ldap://ldap.example.com')
    conn = ldap3.Connection(
        server,
        user=f'uid={username},ou=users,dc=example,dc=com',
        password=password
    )
    return conn.bind()

async def run_query_with_ldap(username, password, query, params=None):
    if not authenticate_ldap(username, password):
        raise ValueError("Authentication failed")

    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        auth = geode_client.AuthClient(conn)
        await auth.login(username, password)
        result, _ = await conn.query(query, params)
        return result.rows
```

## Container Orchestration Integration

### Kubernetes Integration

Deploy Geode with Kubernetes service discovery:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: geode
  labels:
    app: geode
spec:
  type: ClusterIP
  ports:
    - port: 3141
      targetPort: 3141
      name: quic
    - port: 8080
      targetPort: 8080
      name: http
  selector:
    app: geode
---
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
        image: geodedb/geode:0.1.3
        ports:
        - containerPort: 3141
          name: quic
        - containerPort: 8080
          name: http
        env:
        - name: GEODE_CLUSTER_PEERS
          value: "geode-0.geode:3141,geode-1.geode:3141,geode-2.geode:3141"
        volumeMounts:
        - name: data
          mountPath: /var/lib/geode
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

Application integration with Kubernetes service:

```python
import geode_client
import os

async def connect_k8s():
    # Use Kubernetes service DNS
    geode_url = os.getenv("GEODE_SERVICE", "geode.default.svc.cluster.local:3141")

    client = geode_client.open_database(f"geode://{geode_url}")

    async with client.connection() as conn:
        result, _ = await conn.query("MATCH (n) RETURN COUNT(n) AS total")
        total = result.rows[0]["total"] if result.rows else 0
        print(f"Total nodes: {total}")
```

## Best Practices

1. **Connection Pooling**: Always use connection pools for production applications
   - Go: Configure via `db.SetMaxOpenConns()` and `db.SetMaxIdleConns()`
   - Python: Use `ConnectionPool` with appropriate min/max settings
   - Rust: Set `max_connections` in client builder

2. **Error Handling**: Implement proper error handling and retry logic
   - Handle transient network errors with exponential backoff
   - Parse ISO error codes for specific error conditions
   - Log errors with context for debugging

3. **Authentication**: Secure all integration points
   - Use TLS 1.3 for all connections
   - Rotate credentials regularly
   - Implement least-privilege access with Row-Level Security

4. **Monitoring**: Integrate comprehensive monitoring
   - Export metrics to Prometheus or similar systems
   - Set up alerts for query latency, error rates, and resource usage
   - Monitor connection pool health

5. **Testing**: Test integration points thoroughly
   - Use test containers for integration tests
   - Mock Geode clients for unit tests
   - Test failure scenarios and recovery

## Performance Considerations

- **Native Clients**: Use native QUIC clients (Go, Python, Rust, Node.js, Zig) for best performance
- **Batch Operations**: Group related operations in transactions for efficiency
- **Connection Reuse**: Maintain persistent connections and connection pools
- **Query Optimization**: Use EXPLAIN to optimize queries at integration points
- **Network Latency**: Co-locate clients with Geode servers when possible

## Related Topics

- [Client Libraries](/tags/client-libraries/) - Detailed client library documentation
- [API Development](/tags/api/) - API design and implementation
- [Protocol](/tags/protocol/) - QUIC protocol and wire format
- [Authentication](/tags/authentication/) - Authentication and authorization
- [Monitoring](/tags/monitoring/) - Observability and metrics

## Further Reading

- [Go Client Documentation](/docs/client-libraries/go-client/) - Complete Go integration guide
- [Python Client Documentation](/docs/client-libraries/python-client/) - Python client reference
- [Rust Client Documentation](/docs/client-libraries/rust-client/) - Rust client guide
- [Node.js Client Documentation](/docs/client-libraries/nodejs-client/) - Node.js client guide
- [API Reference](/docs/api-reference/) - API documentation
- [Examples](/tags/examples/) - Real-world integration patterns
