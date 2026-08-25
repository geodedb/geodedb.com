---
title: "Data Import - Loading Data into Geode"
description: "Comprehensive guide to importing data into Geode graph database: JSON, CSV, GraphML, and custom formats. Includes batch import, parallel loading, error handling, schema validation, transformation, and ETL pipeline integration."
keywords:
  - data import
  - bulk import
  - CSV import
  - JSON import
  - GraphML import
  - data loading
  - batch import
  - import tools
  - data ingestion
  - parallel import
  - ETL import
  - schema migration
  - data transformation
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Data Import

Data import loads external data into Geode from various sources and formats. Efficient import strategies ensure fast, reliable data loading while maintaining data integrity, handling errors gracefully, and optimizing for system performance during bulk operations.

## Import Formats

### JSON Import

Import graph structure from JSON files:

```bash
# Import JSON file
geode import --format json --input backup.json --graph production

# Import with validation
geode import --format json --input data.json --validate --graph production

# Import JSON lines (streaming format)
geode import --format jsonl --input large_dataset.jsonl --stream --graph production
```

**JSON Format**:

```json
{
  "nodes": [
    {
      "labels": ["Person"],
      "properties": {
        "name": "Alice Johnson",
        "age": 30,
        "email": "alice@example.com"
      }
    },
    {
      "labels": ["Company"],
      "properties": {
        "name": "Acme Corp",
        "industry": "Technology"
      }
    }
  ],
  "relationships": [
    {
      "type": "WORKS_FOR",
      "start_node_id": "person_1",
      "end_node_id": "company_1",
      "properties": {
        "since": "2020-01-15",
        "role": "Engineer"
      }
    }
  ]
}
```

### CSV Import

Import tabular data from CSV files:

```bash
# Import CSV with headers
geode import --format csv --input users.csv --has-header --graph production

# Import without headers (specify column mapping)
geode import --format csv --input data.csv \
  --columns "id,name,email,age" \
  --node-type Person \
  --graph production

# Custom delimiter (TSV)
geode import --format csv --input data.tsv --delimiter "\t" --graph production
```

**CSV Format**:

```csv
id,name,email,age,city
1,Alice Johnson,alice@example.com,30,San Francisco
2,Bob Smith,bob@example.com,25,New York
3,Carol White,carol@example.com,35,Seattle
```

### GraphML Import

Import from graph visualization tools:

```bash
# Import GraphML file
geode import --format graphml --input network.graphml --graph social

# Import with attribute mapping
geode import --format graphml --input graph.graphml \
  --map-attributes "id:nodeId,label:nodeLabel" \
  --graph production
```

## GQL LOAD Statements

Import data using GQL directly:

```gql
-- Load CSV data
LOAD CSV FROM '/data/users.csv'
WITH HEADERS
AS row
CREATE (p:Person {
    id: row.id,
    name: row.name,
    email: row.email,
    age: toInteger(row.age)
});

-- Load with filtering
LOAD CSV FROM '/data/products.csv'
WITH HEADERS
AS row
WHERE row.price IS NOT NULL AND decimal(row.price) > 0
CREATE (p:Product {
    id: row.id,
    name: row.name,
    price: decimal(row.price),
    category: row.category
});

-- Load relationships
LOAD CSV FROM '/data/connections.csv'
WITH HEADERS
AS row
MATCH (a:Person {id: row.person_a_id})
MATCH (b:Person {id: row.person_b_id})
CREATE (a)-[:KNOWS {since: date(row.since)}]->(b);

-- Load JSON
LOAD JSON FROM '/data/users.json'
AS item
CREATE (p:Person {
    id: item.id,
    name: item.name,
    email: item.email,
    age: item.age
});
```

## Batch Import

### Large Dataset Import

Import millions of records efficiently:

```python
# Python batch import
import asyncio
from geode_client import Client
import csv

async def batch_import(filename, batch_size=1000):
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        batch = []
        total_imported = 0

        with open(filename, 'r') as f:
            reader = csv.DictReader(f)

            for row in reader:
                batch.append(row)

                if len(batch) >= batch_size:
                    # Import batch in transaction
                    async with client.connection() as tx:
                        await tx.begin()
                        for record in batch:
                            await tx.execute("""
                                CREATE (p:Person {
                                    id: $id,
                                    name: $name,
                                    email: $email,
                                    age: $age
                                })
                            """, record)
                        await tx.commit()

                    total_imported += len(batch)
                    print(f"Imported {total_imported} records...")
                    batch = []

            # Import remaining records
            if batch:
                async with client.connection() as tx:
                    await tx.begin()
                    for record in batch:
                        await tx.execute("""
                            CREATE (p:Person {
                                id: $id,
                                name: $name,
                                email: $email,
                                age: $age
                            })
                        """, record)
                    await tx.commit()
                total_imported += len(batch)

        print(f"Import complete: {total_imported} total records")

asyncio.run(batch_import('users.csv'))
```

```go
// Go batch import
package main

import (
    "database/sql"
    "encoding/csv"
    "fmt"
    "os"
    "strconv"
    _ "geodedb.com/geode"
)

func batchImport(filename string, batchSize int) error {
    db, err := sql.Open("geode", "quic://localhost:3141")
    if err != nil {
        return err
    }
    defer db.Close()

    file, err := os.Open(filename)
    if err != nil {
        return err
    }
    defer file.Close()

    reader := csv.NewReader(file)
    records, err := reader.ReadAll()
    if err != nil {
        return err
    }

    totalImported := 0
    for i := 0; i < len(records); i += batchSize {
        end := i + batchSize
        if end > len(records) {
            end = len(records)
        }
        batch := records[i:end]

        // Start transaction
        tx, err := db.Begin()
        if err != nil {
            return err
        }

        stmt, err := tx.Prepare("CREATE (p:Person {id: $1, name: $2, email: $3, age: $4})")
        if err != nil {
            tx.Rollback()
            return err
        }

        for _, record := range batch {
            age, _ := strconv.Atoi(record[3])
            _, err = stmt.Exec(record[0], record[1], record[2], age)
            if err != nil {
                tx.Rollback()
                return err
            }
        }

        if err := tx.Commit(); err != nil {
            return err
        }

        totalImported += len(batch)
        fmt.Printf("Imported %d records...\n", totalImported)
    }

    fmt.Printf("Import complete: %d total records\n", totalImported)
    return nil
}
```

### Parallel Import

Speed up imports with parallel workers:

```bash
# Split large file into chunks
split -l 10000 large_dataset.csv chunk_

# Import chunks in parallel
for chunk in chunk_*; do
    geode import --input "$chunk" --format csv --graph production &
done
wait

echo "Parallel import complete"
```

```python
# Python parallel import with multiprocessing
from multiprocessing import Pool
import asyncio
from geode_client import Client

async def import_chunk(chunk_file):
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Import logic for chunk
        # ... (similar to batch import)
        pass

def import_chunk_sync(chunk_file):
    asyncio.run(import_chunk(chunk_file))

# Main
chunk_files = ['chunk_00', 'chunk_01', 'chunk_02', 'chunk_03']
with Pool(processes=4) as pool:
    pool.map(import_chunk_sync, chunk_files)
```

## Error Handling

### Validation

Validate data before import:

```gql
-- Validate email format
LOAD CSV FROM '/data/users.csv'
WITH HEADERS
AS row
WHERE row.email LIKE '%@%'
CREATE (p:Person {
    id: row.id,
    name: row.name,
    email: row.email
});

-- Skip invalid records, log errors
LOAD CSV FROM '/data/products.csv'
WITH HEADERS
AS row
WHERE row.price IS NOT NULL
AND TRY_CAST(row.price AS DECIMAL) IS NOT NULL
CREATE (p:Product {
    id: row.id,
    name: row.name,
    price: CAST(row.price AS DECIMAL)
})
ON ERROR CONTINUE
LOG TO '/logs/import_errors.log';
```

### Duplicate Handling

Handle duplicate data:

```gql
-- Use MERGE for upsert behavior
LOAD CSV FROM '/data/users.csv'
WITH HEADERS
AS row
MERGE (p:Person {id: row.id})
ON CREATE SET
    p.name = row.name,
    p.email = row.email,
    p.created_at = datetime()
ON MATCH SET
    p.name = row.name,
    p.email = row.email,
    p.updated_at = datetime();

-- Skip duplicates
LOAD CSV FROM '/data/products.csv'
WITH HEADERS
AS row
WHERE NOT EXISTS {
    MATCH (p:Product {id: row.id})
}
CREATE (p:Product {
    id: row.id,
    name: row.name,
    price: decimal(row.price)
});
```

## Data Transformation

### Type Conversion

Transform data during import:

```gql
-- Convert string dates to DATE type
LOAD CSV FROM '/data/events.csv'
WITH HEADERS
AS row
CREATE (e:Event {
    id: row.id,
    name: row.name,
    event_date: DATE(row.event_date),
    timestamp: TIMESTAMP(row.timestamp),
    attendees: toInteger(row.attendees)
});

-- Parse JSON strings
LOAD CSV FROM '/data/metadata.csv'
WITH HEADERS
AS row
CREATE (p:Product {
    id: row.id,
    name: row.name,
    tags: parseJSON(row.tags),  -- "['tag1','tag2']" -> LIST
    metadata: parseJSON(row.metadata)  -- "{\"key\":\"value\"}" -> MAP
});
```

### Data Enrichment

Enrich data during import:

```gql
-- Calculate derived fields
LOAD CSV FROM '/data/users.csv'
WITH HEADERS
AS row
CREATE (p:Person {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: row.first_name || ' ' || row.last_name,
    birth_date: DATE(row.birth_date),
    age: YEAR(datetime()) - YEAR(DATE(row.birth_date))
});

-- Lookup and link existing nodes
LOAD CSV FROM '/data/purchases.csv'
WITH HEADERS
AS row
MATCH (user:User {id: row.user_id})
MATCH (product:Product {id: row.product_id})
CREATE (user)-[:PURCHASED {
    date: DATE(row.purchase_date),
    amount: decimal(row.amount),
    quantity: toInteger(row.quantity)
}]->(product);
```

## ETL Pipeline Integration

### Apache Airflow

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime
from geode_client import Client
import pandas as pd

def extract_transform_load():
    # Extract from source
    df = pd.read_csv('source_data.csv')

    # Transform
    df['full_name'] = df['first_name'] + ' ' + df['last_name']
    df['age'] = datetime.now().year - pd.to_datetime(df['birth_date']).dt.year

    # Load to Geode
    client = Client("localhost:3141")

    for _, row in df.iterrows():
        client.execute("""
            MERGE (p:Person {id: $id})
            SET p.name = $name,
                p.age = $age,
                p.email = $email
        """, dict(row))

    return len(df)

with DAG('import_to_geode', start_date=datetime(2026, 1, 1)) as dag:
    import_task = PythonOperator(
        task_id='etl_to_geode',
        python_callable=extract_transform_load
    )
```

## Performance Optimization

### Index Creation Strategy

```gql
-- Create indexes AFTER import for better performance
-- 1. Import data without indexes
LOAD CSV FROM '/data/users.csv' WITH HEADERS AS row
CREATE (p:Person {id: row.id, name: row.name, email: row.email});

-- 2. Create indexes after import
CREATE INDEX idx_person_id ON Person(id);
CREATE INDEX idx_person_email ON Person(email);
CREATE INDEX idx_person_name ON Person(name);
```

### Transaction Sizing

```python
# Optimal batch size: 1000-10000 records
OPTIMAL_BATCH_SIZE = 5000

async def optimized_import(data):
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        for i in range(0, len(data), OPTIMAL_BATCH_SIZE):
            batch = data[i:i+OPTIMAL_BATCH_SIZE]

            async with client.connection() as tx:
                await tx.begin()
                for record in batch:
                    await tx.execute(create_query, record)
                await tx.commit()
```

## Best Practices

1. **Validate Data**: Check data quality before import
2. **Use Transactions**: Batch operations in transactions
3. **Create Indexes After**: Import first, index later
4. **Handle Duplicates**: Use MERGE for idempotent imports
5. **Monitor Progress**: Log import progress and errors
6. **Test with Sample**: Validate on small dataset first
7. **Plan for Rollback**: Keep backups before large imports

## Troubleshooting

### Memory Issues

```bash
# Use streaming for large files
geode import --format jsonl --stream --input huge_file.jsonl

# Or split into smaller chunks
split -l 100000 large_file.csv chunk_
for chunk in chunk_*; do
    geode import --input "$chunk"
done
```

### Performance Problems

```gql
-- Disable constraints during import
ALTER TABLE Person DISABLE CONSTRAINTS;

-- Import data
LOAD CSV FROM 'data.csv' ...

-- Re-enable constraints
ALTER TABLE Person ENABLE CONSTRAINTS;
```

## Related Topics

- [Export](/tags/export/) - Data export strategies
- [Migration](/tags/migration/) - Database migration
- [ETL](/tags/etl/) - ETL pipelines
- [Integration](/tags/integration/) - Integration patterns

## Further Reading

- [Bulk Loading Best Practices](https://www.postgresql.org/docs/current/populate.html) - PostgreSQL guide
- [ETL Design Patterns](https://www.kimballgroup.com/) - Kimball Group resources
