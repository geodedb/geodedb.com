---
title: "Data Import"
description: "Tools and strategies for importing data into Geode from external sources"
keywords: ["data import", "bulk import", "CSV import", "JSON import", "data loading", "batch import", "import tools", "data ingestion"]
weight: 10
---

# Data Import

Data import is the process of loading external data into Geode. Efficient import strategies ensure fast, reliable data loading while maintaining data integrity and system performance.

## Import Formats

### JSON Import

```bash
# Import JSON file
geode import --format json --input users.json --graph social

# JSON format
[
  {"labels": ["Person"], "properties": {"name": "Alice", "age": 25}},
  {"labels": ["Person"], "properties": {"name": "Bob", "age": 30}}
]
```

### CSV Import

```bash
# Import CSV with header
geode import --format csv --input users.csv --graph social --has-header

# CSV format
name,age,email
Alice,25,alice@example.com
Bob,30,bob@example.com
```

### GQL LOAD

```gql
-- Load CSV data
LOAD CSV FROM 'users.csv' WITH HEADERS
MATCH (p:Person)
SET p.name = row.name, p.age = row.age;
```

## Batch Import

### Large Datasets

```python
async def batch_import(client, data, batch_size=1000):
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        await client.create_nodes_batch(batch)
        print(f"Imported {i+batch_size} records")
```

### Parallel Import

```bash
# Import with multiple workers
geode import --input data.json --workers 8 --graph production
```

## Error Handling

### Validation

```gql
LOAD CSV FROM 'users.csv' WITH HEADERS
MATCH (p:Person)
WHERE row.email IS NOT NULL AND row.email LIKE '%@%'
SET p.email = row.email;
```

## Best Practices

- Validate data before import
- Use batch processing
- Monitor progress
- Handle duplicates
- Create indexes after import

## Related Topics

- [Export](/tags/export) - Data export
- [Migration](/tags/migration) - Data migration
- [ETL](/tags/etl) - ETL pipelines
