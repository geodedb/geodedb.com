---
title: "ETL Pipelines"
description: "Extract Transform Load pipelines for data integration with Geode"
keywords: ["ETL", "extract transform load", "data pipeline", "data integration", "data workflow", "batch processing", "Apache Airflow"]
weight: 10
---

# ETL Pipelines

ETL (Extract, Transform, Load) pipelines move data from source systems through transformation stages into Geode, enabling data integration and analytics workflows.

## ETL Workflow

### Extract

```python
# Extract from source
async def extract_from_postgres(conn):
    users = await conn.fetch("SELECT * FROM users")
    orders = await conn.fetch("SELECT * FROM orders")
    return {"users": users, "orders": orders}
```

### Transform

```python
# Transform data
def transform_user(raw_user):
    return {
        "labels": ["User"],
        "properties": {
            "id": raw_user['id'],
            "name": f"{raw_user['first_name']} {raw_user['last_name']}",
            "email": raw_user['email'].lower(),
            "created_at": raw_user['created_at'].isoformat()
        }
    }
```

### Load

```python
# Load to Geode
async def load_to_geode(client, transformed_data):
    await client.create_nodes_batch(transformed_data)
```

## Scheduling

### Airflow DAG

```python
from airflow import DAG
from airflow.operators.python import PythonOperator

dag = DAG('user_etl', schedule_interval='@daily')

extract_task = PythonOperator(
    task_id='extract',
    python_callable=extract_from_postgres,
    dag=dag
)

transform_task = PythonOperator(
    task_id='transform',
    python_callable=transform_users,
    dag=dag
)

load_task = PythonOperator(
    task_id='load',
    python_callable=load_to_geode,
    dag=dag
)

extract_task >> transform_task >> load_task
```

## Incremental Loading

```python
# Load only new/changed records
last_run = get_last_run_timestamp()
new_records = extract_since(last_run)
transformed = transform(new_records)
load_to_geode(transformed)
save_timestamp(now())
```

## Error Handling

```python
try:
    data = extract()
    transformed = transform(data)
    load(transformed)
except Exception as e:
    log_error(e)
    send_alert(e)
    raise
```

## Best Practices

- Idempotent operations
- Incremental loading
- Error recovery
- Monitoring and alerting
- Data quality checks

## Related Topics

- [Import](/tags/import) - Data import
- [Migration](/tags/migration) - Data migration
- [Data Quality](/tags/data-quality) - Data quality
