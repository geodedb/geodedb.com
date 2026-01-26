---
title: "ETL Pipelines & Data Integration"
description: "Extract Transform Load pipelines for integrating data into Geode from relational databases, APIs, files, and streaming sources"
keywords: ["ETL", "extract transform load", "data pipeline", "data integration", "data workflow", "batch processing", "Apache Airflow", "streaming ETL", "incremental load", "change data capture", "CDC"]
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# ETL Pipelines & Data Integration

ETL (Extract, Transform, Load) pipelines are critical for integrating data from diverse sources into your Geode graph database. Whether migrating from a relational database, aggregating data from multiple APIs, or streaming real-time events, well-designed ETL processes ensure data arrives in Geode accurately, efficiently, and reliably.

## Understanding ETL in Graph Context

Traditional ETL processes are designed for tabular data moving between relational databases. Graph ETL requires additional considerations:

- **Relationship Discovery**: Identifying connections between entities during transformation
- **Node Deduplication**: Ensuring the same entity isn't created multiple times
- **Edge Creation**: Linking nodes based on foreign key relationships or business logic
- **Graph Schema Mapping**: Converting normalized tables to denormalized graph properties
- **Traversal Optimization**: Organizing data for efficient graph queries

## The ETL Process

### Extract: Pulling Data from Sources

Extract phase reads data from source systems without modifying the original data.

**Common Sources**:
- Relational databases (PostgreSQL, MySQL, Oracle)
- NoSQL databases (MongoDB, Cassandra)
- REST APIs
- CSV/JSON files
- Message queues (Kafka, RabbitMQ)
- Data warehouses (Snowflake, BigQuery)

```python
# Python - Extract from PostgreSQL
import asyncpg
from geode_client import Client

async def extract_from_postgres(pg_pool):
    """Extract users and orders from PostgreSQL."""
    async with pg_pool.acquire() as conn:
        # Extract users
        users = await conn.fetch("""
            SELECT
                user_id,
                email,
                first_name,
                last_name,
                created_at,
                country,
                status
            FROM users
            WHERE updated_at > $1
        """, last_sync_time)

        # Extract orders
        orders = await conn.fetch("""
            SELECT
                order_id,
                user_id,
                total_amount,
                currency,
                status,
                created_at
            FROM orders
            WHERE updated_at > $1
        """, last_sync_time)

        # Extract order items (relationships)
        order_items = await conn.fetch("""
            SELECT
                order_id,
                product_id,
                quantity,
                unit_price
            FROM order_items
            WHERE updated_at > $1
        """, last_sync_time)

        return {
            "users": users,
            "orders": orders,
            "order_items": order_items
        }
```

Go example with database/sql:

```go
// Go - Extract from MySQL
package main

import (
    "context"
    "database/sql"
    "time"
    _ "github.com/go-sql-driver/mysql"
)

type User struct {
    ID        string
    Email     string
    FirstName string
    LastName  string
    CreatedAt time.Time
}

func extractUsers(ctx context.Context, db *sql.DB, since time.Time) ([]User, error) {
    rows, err := db.QueryContext(ctx, `
        SELECT user_id, email, first_name, last_name, created_at
        FROM users
        WHERE updated_at > ?
        ORDER BY updated_at ASC
    `, since)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Email, &u.FirstName, &u.LastName, &u.CreatedAt); err != nil {
            return nil, err
        }
        users = append(users, u)
    }

    return users, rows.Err()
}
```

### Transform: Converting to Graph Structure

Transform phase converts source data into nodes, edges, and properties suitable for Geode.

```python
# Python - Transform relational data to graph structure
from typing import Dict, List, Any
from datetime import datetime

def transform_user(raw_user: Dict[str, Any]) -> Dict[str, Any]:
    """Transform PostgreSQL user record to Geode Person node."""
    return {
        "labels": ["Person", "Customer"],
        "properties": {
            "id": raw_user['user_id'],
            "email": raw_user['email'].lower().strip(),
            "name": f"{raw_user['first_name']} {raw_user['last_name']}",
            "first_name": raw_user['first_name'],
            "last_name": raw_user['last_name'],
            "country": raw_user['country'],
            "status": raw_user['status'],
            "created_at": raw_user['created_at'].isoformat(),
            "imported_at": datetime.utcnow().isoformat()
        }
    }

def transform_order(raw_order: Dict[str, Any]) -> Dict[str, Any]:
    """Transform order record to Geode Order node."""
    return {
        "labels": ["Order"],
        "properties": {
            "id": raw_order['order_id'],
            "total": float(raw_order['total_amount']),
            "currency": raw_order['currency'],
            "status": raw_order['status'],
            "created_at": raw_order['created_at'].isoformat()
        }
    }

def transform_order_relationship(raw_order: Dict[str, Any]) -> Dict[str, Any]:
    """Create PLACED edge between Person and Order."""
    return {
        "type": "PLACED",
        "from_id": raw_order['user_id'],
        "from_label": "Person",
        "to_id": raw_order['order_id'],
        "to_label": "Order",
        "properties": {
            "placed_at": raw_order['created_at'].isoformat()
        }
    }

def transform_order_item_relationship(raw_item: Dict[str, Any]) -> Dict[str, Any]:
    """Create CONTAINS edge between Order and Product."""
    return {
        "type": "CONTAINS",
        "from_id": raw_item['order_id'],
        "from_label": "Order",
        "to_id": raw_item['product_id'],
        "to_label": "Product",
        "properties": {
            "quantity": raw_item['quantity'],
            "unit_price": float(raw_item['unit_price'])
        }
    }
```

Rust example with type safety:

```rust
// Rust - Transform with type-safe builders
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Deserialize)]
struct RawUser {
    user_id: String,
    email: String,
    first_name: String,
    last_name: String,
    created_at: DateTime<Utc>,
}

#[derive(Serialize)]
struct PersonNode {
    labels: Vec<String>,
    properties: PersonProperties,
}

#[derive(Serialize)]
struct PersonProperties {
    id: String,
    email: String,
    name: String,
    created_at: String,
}

fn transform_user(raw: RawUser) -> PersonNode {
    PersonNode {
        labels: vec!["Person".into(), "Customer".into()],
        properties: PersonProperties {
            id: raw.user_id,
            email: raw.email.to_lowercase().trim().to_string(),
            name: format!("{} {}", raw.first_name, raw.last_name),
            created_at: raw.created_at.to_rfc3339(),
        },
    }
}
```

### Load: Inserting into Geode

Load phase efficiently inserts transformed data into Geode with proper error handling and retry logic.

```python
# Python - Batch load with transaction support
from geode_client import Client
import asyncio

async def load_to_geode(client: Client, nodes: List[Dict], edges: List[Dict]):
    """Load nodes and edges to Geode in batches."""
    batch_size = 1000

    async with client.connection() as tx:
        await tx.begin()
        # Load nodes in batches
        for i in range(0, len(nodes), batch_size):
            batch = nodes[i:i + batch_size]

            # Use MERGE to handle duplicates idempotently
            await tx.execute(
                """UNWIND $batch AS row
                   MERGE (n:Person {id: row.id})
                   SET n.email = row.email,
                       n.name = row.name,
                       n.created_at = row.created_at,
                       n.updated_at = NOW()
                """,
                {"batch": [node['properties'] for node in batch]}
            )

            print(f"Loaded {i + len(batch)}/{len(nodes)} nodes")

        # Load edges after all nodes exist
        for i in range(0, len(edges), batch_size):
            batch = edges[i:i + batch_size]

            await tx.execute(
                """UNWIND $batch AS row
                   MATCH (from:Person {id: row.from_id})
                   MATCH (to:Order {id: row.to_id})
                   MERGE (from)-[r:PLACED]->(to)
                   SET r.placed_at = row.placed_at
                """,
                {"batch": [edge['properties'] for edge in batch]}
            )

            print(f"Loaded {i + len(batch)}/{len(edges)} edges")

        await tx.commit()
```

## Incremental vs Full Load

### Full Load

Complete replacement of data, typically used for initial migration:

```python
async def full_load_etl(pg_pool, geode_client):
    """Full load: replace all data."""
    # Extract all data
    data = await extract_all_from_postgres(pg_pool)

    # Transform
    nodes = [transform_user(user) for user in data['users']]
    edges = [transform_order_relationship(order) for order in data['orders']]

    # Clear existing data (optional)
    await geode_client.execute("MATCH (n:Person) DELETE n")

    # Load all
    await load_to_geode(geode_client, nodes, edges)
```

### Incremental Load (Change Data Capture)

Only load changed records since last sync:

```python
import json
from datetime import datetime, timedelta
from pathlib import Path

class IncrementalETL:
    def __init__(self, state_file: str = "etl_state.json"):
        self.state_file = Path(state_file)

    def get_last_sync_time(self) -> datetime:
        """Get timestamp of last successful sync."""
        if self.state_file.exists():
            state = json.loads(self.state_file.read_text())
            return datetime.fromisoformat(state['last_sync'])
        return datetime.min  # First run, sync all data

    def save_sync_time(self, timestamp: datetime):
        """Save successful sync timestamp."""
        self.state_file.write_text(json.dumps({
            'last_sync': timestamp.isoformat()
        }))

    async def incremental_load(self, pg_pool, geode_client):
        """Load only changed records since last sync."""
        sync_start = datetime.utcnow()
        last_sync = self.get_last_sync_time()

        print(f"Syncing changes since {last_sync}")

        # Extract only changed records
        data = await extract_from_postgres(pg_pool, since=last_sync)

        print(f"Extracted {len(data['users'])} users, {len(data['orders'])} orders")

        # Transform
        nodes = [transform_user(user) for user in data['users']]
        edges = [transform_order_relationship(order) for order in data['orders']]

        # Load (MERGE handles inserts and updates)
        await load_to_geode(geode_client, nodes, edges)

        # Save state only after successful load
        self.save_sync_time(sync_start)
        print(f"Sync completed successfully")
```

## Orchestration with Apache Airflow

Apache Airflow is industry-standard for scheduling and monitoring ETL pipelines.

```python
# Airflow DAG for daily ETL
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago
from datetime import timedelta
import asyncio

default_args = {
    'owner': 'data-team',
    'depends_on_past': False,
    'email': ['alerts@company.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'geode_etl_daily',
    default_args=default_args,
    description='Daily ETL from PostgreSQL to Geode',
    schedule_interval='0 2 * * *',  # Run at 2 AM daily
    start_date=days_ago(1),
    tags=['etl', 'geode'],
    catchup=False
)

def extract_task(**context):
    """Extract data from source."""
    data = asyncio.run(extract_from_postgres(pg_pool))
    context['task_instance'].xcom_push(key='extracted_data', value=data)
    return f"Extracted {len(data['users'])} users"

def transform_task(**context):
    """Transform extracted data."""
    data = context['task_instance'].xcom_pull(key='extracted_data')
    nodes = [transform_user(u) for u in data['users']]
    edges = [transform_order_relationship(o) for o in data['orders']]
    context['task_instance'].xcom_push(key='transformed_data', value={'nodes': nodes, 'edges': edges})
    return f"Transformed {len(nodes)} nodes, {len(edges)} edges"

def load_task(**context):
    """Load data to Geode."""
    data = context['task_instance'].xcom_pull(key='transformed_data')
    asyncio.run(load_to_geode(geode_client, data['nodes'], data['edges']))
    return f"Loaded successfully"

def validate_task(**context):
    """Validate data quality after load."""
    result = asyncio.run(geode_client.execute("""
        MATCH (p:Person)
        WHERE p.email IS NULL OR p.email !~ '^[^@]+@[^@]+\.[^@]+$'
        RETURN count(p) AS invalid_count
    """))
    invalid = result.bindings[0]['invalid_count']
    if invalid > 0:
        raise ValueError(f"Found {invalid} persons with invalid emails")
    return f"Validation passed"

# Define task dependencies
extract = PythonOperator(task_id='extract', python_callable=extract_task, dag=dag)
transform = PythonOperator(task_id='transform', python_callable=transform_task, dag=dag)
load = PythonOperator(task_id='load', python_callable=load_task, dag=dag)
validate = PythonOperator(task_id='validate', python_callable=validate_task, dag=dag)

# Pipeline: extract -> transform -> load -> validate
extract >> transform >> load >> validate
```

## Real-Time Streaming ETL

For real-time data integration, use streaming ETL with Kafka or similar:

```python
# Python - Streaming ETL with Kafka
from kafka import KafkaConsumer
from geode_client import Client
import json

async def streaming_etl():
    """Process events from Kafka in real-time."""
    consumer = KafkaConsumer(
        'user-events',
        bootstrap_servers=['localhost:9092'],
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        group_id='geode-etl',
        auto_offset_reset='earliest'
    )

    client = Client(host="localhost", port=3141)

    async with client.connection() as conn:
        for message in consumer:
            event = message.value

            try:
                if event['type'] == 'user.created':
                    node = transform_user(event['data'])
                    await conn.execute(
                        """MERGE (p:Person {id: $id})
                           SET p += $properties""",
                        {"id": node['properties']['id'], "properties": node['properties']}
                    )

                elif event['type'] == 'order.placed':
                    order_node = transform_order(event['data'])
                    relationship = transform_order_relationship(event['data'])

                    await conn.execute(
                        """MERGE (o:Order {id: $order_id})
                           SET o += $order_props
                           WITH o
                           MATCH (p:Person {id: $user_id})
                           MERGE (p)-[r:PLACED]->(o)
                           SET r.placed_at = $placed_at""",
                        {
                            "order_id": order_node['properties']['id'],
                            "order_props": order_node['properties'],
                            "user_id": relationship['from_id'],
                            "placed_at": relationship['properties']['placed_at']
                        }
                    )

                # Commit offset after successful processing
                consumer.commit()

            except Exception as e:
                print(f"Error processing event: {e}")
                # Don't commit offset, retry on next poll
```

## Error Handling and Recovery

```python
# Python - Robust error handling
import logging
from tenacity import retry, stop_after_attempt, wait_exponential

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10)
)
async def load_batch_with_retry(client, batch, batch_num):
    """Load batch with exponential backoff retry."""
    try:
        await client.execute(
            "UNWIND $batch AS row\n"
            "MERGE (n:Person {id: row.id})\n"
            "SET n += row.properties",
            {"batch": batch}
        )
        logger.info(f"Batch {batch_num} loaded successfully")
    except Exception as e:
        logger.error(f"Batch {batch_num} failed: {e}")
        raise

async def resilient_etl(pg_pool, geode_client):
    """ETL with comprehensive error handling."""
    failed_batches = []

    try:
        data = await extract_from_postgres(pg_pool)
    except Exception as e:
        logger.error(f"Extract failed: {e}")
        send_alert("ETL Extract Failure", str(e))
        raise

    nodes = [transform_user(u) for u in data['users']]

    # Process batches with individual error handling
    batch_size = 1000
    for i in range(0, len(nodes), batch_size):
        batch = nodes[i:i + batch_size]
        batch_num = i // batch_size + 1

        try:
            await load_batch_with_retry(geode_client, batch, batch_num)
        except Exception as e:
            logger.error(f"Batch {batch_num} failed after retries: {e}")
            failed_batches.append((batch_num, batch))
            # Continue processing other batches

    # Report failures
    if failed_batches:
        logger.warning(f"{len(failed_batches)} batches failed")
        send_alert(f"ETL Partial Failure", f"{len(failed_batches)} batches failed")
    else:
        logger.info("ETL completed successfully")
```

## Best Practices

1. **Idempotent Operations**: Use MERGE instead of INSERT to handle re-runs safely
2. **Incremental Loading**: Only process changed data to reduce load time
3. **Batch Processing**: Load data in batches (1000-10000 records) for efficiency
4. **Transaction Management**: Use transactions to ensure atomicity
5. **Error Recovery**: Implement retry logic with exponential backoff
6. **Data Validation**: Validate both before and after loading
7. **Monitoring**: Track ETL metrics (records processed, duration, errors)
8. **State Management**: Track last sync time for incremental loads
9. **Deduplication**: Handle duplicate records gracefully
10. **Schema Versioning**: Version your transformation logic

## Performance Optimization

**Parallel Processing**: Load independent batches in parallel

**Connection Pooling**: Reuse database connections

**Bulk Operations**: Use batch inserts instead of individual queries

**Index Management**: Ensure target nodes have indexes on lookup keys

## Troubleshooting

**Slow extraction**: Add indexes on source database timestamp columns

**Memory issues**: Reduce batch size or use streaming approach

**Duplicate nodes**: Use MERGE instead of INSERT, ensure unique constraints

**Missing relationships**: Verify all referenced nodes exist before creating edges

## Related Topics

- [Import](/tags/import) - Data import utilities
- [Migration](/tags/migration) - Schema and data migration
- [Data Quality](/tags/data-quality) - Quality checks in ETL
- [Batch Processing](/tags/import/) - Batch operation patterns
- [Transactions](/tags/transactions) - Transactional loading
- [Performance](/tags/performance) - ETL performance optimization
