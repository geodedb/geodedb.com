---
title: "Data Export - Export Graph Data from Geode"
description: "Comprehensive guide to exporting data from Geode graph database: JSON, CSV, GraphML, and custom formats. Includes streaming exports, filtered data extraction, schema export, compression, backup strategies, and ETL integration patterns."
keywords:
  - data export
  - backup
  - data extraction
  - CSV export
  - JSON export
  - GraphML export
  - data dump
  - export tools
  - streaming export
  - database backup
  - ETL export
  - schema export
  - compressed export
  - selective export
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Data Export

Data export extracts graph data from Geode into external formats for backup, analysis, migration, or integration with other systems. Geode provides flexible export capabilities supporting multiple formats, streaming for large datasets, filtered extraction, schema export, and compression options.

## Export Formats

### JSON Export

JSON format preserves full graph structure with nodes, relationships, and properties:

```bash
# Export entire graph to JSON
geode export --format json --output backup.json --graph production

# Export with pretty printing
geode export --format json --output backup.json --pretty --graph production

# Streaming JSON for large graphs
geode export --format jsonl --output backup.jsonl --stream --graph production
```

**JSON Structure**:
```json
{
  "nodes": [
    {
      "id": "123",
      "labels": ["Person", "Employee"],
      "properties": {
        "name": "Alice Johnson",
        "age": 30,
        "email": "alice@example.com"
      }
    }
  ],
  "relationships": [
    {
      "id": "456",
      "type": "WORKS_FOR",
      "start_node": "123",
      "end_node": "789",
      "properties": {
        "since": "2020-01-15",
        "role": "Senior Engineer"
      }
    }
  ],
  "metadata": {
    "export_time": "2026-01-24T10:30:00Z",
    "node_count": 15000,
    "relationship_count": 45000
  }
}
```

### CSV Export

CSV format for tabular data and analysis tools:

```bash
# Export nodes to CSV
geode export --format csv --output users.csv \
  --query "MATCH (p:Person) RETURN p.name, p.age, p.email"

# Export relationships
geode export --format csv --output connections.csv \
  --query "MATCH (a:Person)-[r:KNOWS]->(b:Person) RETURN a.name, r.since, b.name"

# Custom delimiter
geode export --format csv --output data.tsv --delimiter "\t" \
  --query "MATCH (n) RETURN n.id, n.name"
```

### GraphML Export

GraphML XML format for graph visualization tools (Gephi, Cytoscape):

```bash
# Export to GraphML
geode export --format graphml --output graph.graphml --graph social

# Filtered GraphML export
geode export --format graphml --output network.graphml \
  --node-filter "label = 'Person'" \
  --edge-filter "type = 'KNOWS'"
```

### Custom Format Export

Define custom export formats:

```bash
# Neo4j Cypher format for migration
geode export --format cypher --output import.cypher --graph production

# Parquet format for analytics
geode export --format parquet --output data.parquet --compress snappy
```

## GQL EXPORT Statements

Export using GQL directly:

```gql
-- Export query results to CSV
EXPORT TO CSV '/exports/users.csv'
WITH HEADERS
MATCH (p:Person)
WHERE p.age >= 18
RETURN p.name AS name,
       p.age AS age,
       p.email AS email
ORDER BY p.name;

-- Export to JSON
EXPORT TO JSON '/exports/network.json'
MATCH (p:Person)-[r:KNOWS]->(friend:Person)
WHERE r.since > DATE('2025-01-01')
RETURN p.name AS person,
       friend.name AS friend,
       r.since AS connected_since;

-- Export with compression
EXPORT TO CSV '/exports/large_dataset.csv.gz'
COMPRESSED
MATCH (n:Product)
RETURN n.*;
```

## Selective Export

### Filtered Data Export

Export specific subsets:

```gql
-- Export active users only
EXPORT TO JSON '/exports/active_users.json'
MATCH (u:User)
WHERE u.last_login > NOW() - INTERVAL '30 days'
  AND u.status = 'active'
RETURN u;

-- Export specific node types
EXPORT TO CSV '/exports/products.csv'
MATCH (p:Product)
WHERE p.category IN ['Electronics', 'Computers']
  AND p.stock_quantity > 0
RETURN p.id, p.name, p.price, p.stock_quantity;

-- Export relationship data
EXPORT TO CSV '/exports/transactions.csv'
MATCH (u:User)-[t:PURCHASED]->(p:Product)
WHERE t.date >= DATE('2026-01-01')
RETURN u.id AS user_id,
       p.id AS product_id,
       t.date AS purchase_date,
       t.amount AS amount;
```

### Schema Export

Export graph schema and metadata:

```bash
# Export schema only
geode export --schema-only --output schema.gql --graph production

# Export with statistics
geode export --schema --statistics --output schema_stats.json
```

**Schema Output**:
```gql
-- Node type definitions
CREATE NODE TYPE Person (
    id STRING PRIMARY KEY,
    name STRING NOT NULL,
    age INTEGER,
    email STRING UNIQUE
);

CREATE NODE TYPE Product (
    id STRING PRIMARY KEY,
    name STRING NOT NULL,
    price DECIMAL,
    category STRING
);

-- Relationship type definitions
CREATE RELATIONSHIP TYPE PURCHASED (
    date DATE,
    amount DECIMAL,
    quantity INTEGER
) FROM User TO Product;

-- Indexes
CREATE INDEX idx_person_name ON Person(name);
CREATE INDEX idx_product_category ON Product(category);

-- Constraints
ALTER NODE TYPE Person ADD CONSTRAINT unique_email UNIQUE (email);
```

## Streaming Export for Large Datasets

### Memory-Efficient Streaming

Export large graphs without loading all data into memory:

```python
# Python streaming export
import asyncio
from geode_client import GeodeClient
import csv

async def streaming_export():
    async with GeodeClient("localhost:3141") as client:
        # Open output file
        with open('large_export.csv', 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['id', 'name', 'email', 'age'])  # Header

            # Stream query results
            processed = 0
            async for row in client.stream_query(
                "MATCH (p:Person) RETURN p.id, p.name, p.email, p.age"
            ):
                writer.writerow([
                    row['p.id'],
                    row['p.name'],
                    row['p.email'],
                    row['p.age']
                ])
                processed += 1

                # Progress reporting
                if processed % 10000 == 0:
                    print(f"Exported {processed} records...")

            print(f"Export complete: {processed} total records")

asyncio.run(streaming_export())
```

```go
// Go streaming export
package main

import (
    "database/sql"
    "encoding/csv"
    "fmt"
    "os"
    _ "go.codepros.org/geode"
)

func streamingExport() error {
    db, err := sql.Open("geode", "geode://localhost:3141/production")
    if err != nil {
        return err
    }
    defer db.Close()

    // Query with streaming cursor
    rows, err := db.Query("MATCH (p:Person) RETURN p.id, p.name, p.email")
    if err != nil {
        return err
    }
    defer rows.Close()

    // Create CSV writer
    file, err := os.Create("export.csv")
    if err != nil {
        return err
    }
    defer file.Close()

    writer := csv.NewWriter(file)
    defer writer.Flush()

    // Write header
    writer.Write([]string{"id", "name", "email"})

    // Stream and write rows
    processed := 0
    for rows.Next() {
        var id, name, email string
        if err := rows.Scan(&id, &name, &email); err != nil {
            return err
        }

        writer.Write([]string{id, name, email})
        processed++

        if processed%10000 == 0 {
            fmt.Printf("Exported %d records...\n", processed)
        }
    }

    fmt.Printf("Export complete: %d records\n", processed)
    return rows.Err()
}
```

## Compression Options

### Compression Formats

Reduce export file sizes:

```bash
# Gzip compression
geode export --output backup.json.gz --compress gzip --graph production

# Bzip2 compression (better compression ratio)
geode export --output backup.json.bz2 --compress bzip2

# Zstd compression (fast with good ratio)
geode export --output backup.json.zst --compress zstd

# LZ4 compression (fastest)
geode export --output backup.json.lz4 --compress lz4
```

### Compression Examples

```python
# Python with compression
import gzip
import json
from geode_client import GeodeClient

async def compressed_export():
    async with GeodeClient("localhost:3141") as client:
        result = await client.execute("MATCH (n) RETURN n")

        # Write compressed JSON
        with gzip.open('export.json.gz', 'wt', encoding='utf-8') as f:
            json.dump([dict(row) for row in result], f, indent=2)
```

## Backup Strategies

### Full Backup

```bash
#!/bin/bash
# Full database backup script

BACKUP_DIR="/backups/geode"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="geode_backup_${TIMESTAMP}"

# Export full graph
geode export \
  --format json \
  --output "${BACKUP_DIR}/${BACKUP_NAME}.json.gz" \
  --compress gzip \
  --graph production

# Export schema
geode export \
  --schema-only \
  --output "${BACKUP_DIR}/${BACKUP_NAME}_schema.gql"

# Verify backup
if [ $? -eq 0 ]; then
    echo "Backup successful: ${BACKUP_NAME}"
    
    # Cleanup old backups (keep last 7 days)
    find "${BACKUP_DIR}" -name "geode_backup_*.json.gz" -mtime +7 -delete
else
    echo "Backup failed!"
    exit 1
fi
```

### Incremental Backup

```bash
# Export only changed data since last backup
LAST_BACKUP_TIME="2026-01-23T00:00:00Z"

geode export \
  --format json \
  --output incremental_backup.json \
  --filter "updated_at > '${LAST_BACKUP_TIME}'" \
  --graph production
```

### Scheduled Backups

```bash
# Crontab entry: Daily backup at 2 AM
0 2 * * * /usr/local/bin/geode-backup.sh >> /var/log/geode-backup.log 2>&1
```

## ETL Integration

### Apache Airflow Integration

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
from geode_client import GeodeClient
import pandas as pd

def export_to_data_warehouse():
    """Export Geode data to data warehouse"""
    client = GeodeClient("localhost:3141")
    
    # Extract from Geode
    result = client.execute("""
        MATCH (p:Person)-[r:PURCHASED]->(prod:Product)
        WHERE r.date >= DATE(NOW()) - INTERVAL '1 day'
        RETURN p.id AS customer_id,
               prod.id AS product_id,
               r.amount AS amount,
               r.date AS purchase_date
    """)
    
    # Transform to DataFrame
    df = pd.DataFrame([dict(row) for row in result])
    
    # Load to warehouse
    df.to_sql('purchases', warehouse_engine, if_exists='append', index=False)
    
    return len(df)

with DAG(
    'geode_export_dag',
    default_args={'owner': 'data_team'},
    schedule_interval=timedelta(days=1),
    start_date=datetime(2026, 1, 1)
) as dag:
    
    export_task = PythonOperator(
        task_id='export_to_warehouse',
        python_callable=export_to_data_warehouse
    )
```

## Performance Optimization

### Parallel Export

```bash
# Export large dataset in parallel chunks
for i in {0..9}; do
    geode export \
      --format csv \
      --output "export_part_${i}.csv" \
      --query "MATCH (p:Person) WHERE MOD(toInteger(p.id), 10) = $chunk RETURN p" \
      --param chunk=$i &
done
wait

# Combine chunks
cat export_part_*.csv > complete_export.csv
```

### Batch Processing

```python
# Export in manageable batches
async def batch_export(batch_size=10000):
    async with GeodeClient("localhost:3141") as client:
        offset = 0
        batch_num = 0
        
        while True:
            result = await client.execute(f"""
                MATCH (p:Person)
                RETURN p
                ORDER BY p.id
                SKIP {offset}
                LIMIT {batch_size}
            """)
            
            if not result:
                break  # No more data
            
            # Write batch to file
            filename = f"export_batch_{batch_num:04d}.json"
            with open(filename, 'w') as f:
                json.dump([dict(row) for row in result], f)
            
            offset += batch_size
            batch_num += 1
            print(f"Exported batch {batch_num}: {len(result)} records")
```

## Best Practices

### General Guidelines

1. **Use Compression**: Always compress large exports to save space
2. **Validate Exports**: Verify exported data integrity
3. **Schedule Regular Backups**: Automate backup procedures
4. **Store Securely**: Encrypt sensitive data exports
5. **Document Exports**: Maintain export logs and metadata
6. **Test Restores**: Regularly test backup restoration
7. **Monitor Performance**: Track export times and sizes

### Security Considerations

```bash
# Encrypt exports
geode export --output backup.json --graph production
gpg --encrypt --recipient admin@example.com backup.json

# Secure transfer
scp backup.json.gpg backup-server:/secure/backups/

# Cleanup local unencrypted files
shred -u backup.json
```

## Troubleshooting

### Large Export Issues

```bash
# If export runs out of memory, use streaming
geode export --format jsonl --stream --output large.jsonl

# Or export in chunks by node type
geode export --output users.json --node-filter "label = 'User'"
geode export --output products.json --node-filter "label = 'Product'"
```

### Performance Problems

```gql
-- Optimize export queries with indexes
CREATE INDEX idx_export_timestamp ON Node(updated_at);

-- Use selective exports instead of full dumps
EXPORT TO CSV 'recent_data.csv'
MATCH (n)
WHERE n.updated_at > DATE('2026-01-01')
RETURN n;
```

## Related Topics

- [Import](/tags/import/) - Data import strategies
- [Migration](/tags/migration/) - Database migration tools
- [Backup](/tags/backup/) - Backup and recovery
- [ETL](/tags/etl/) - ETL pipeline integration
- [Data Integration](/tags/data-integration/) - Integration patterns

## Further Reading

- [Backup Best Practices](https://www.percona.com/blog/2019/01/03/backup-best-practices/) - Industry standards
- [ETL Design Patterns](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/etl-architecture-34-subsystems/) - Kimball Group guide
