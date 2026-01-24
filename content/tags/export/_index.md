---
title: "Data Export"
description: "Exporting data from Geode to external formats and systems"
keywords: ["data export", "backup", "data extraction", "CSV export", "JSON export", "data dump", "export tools"]
weight: 10
---

# Data Export

Data export extracts data from Geode into external formats for backup, analysis, or integration with other systems.

## Export Formats

### JSON Export

```bash
# Export to JSON
geode export --format json --output backup.json --graph social

# Result
[
  {"id": "1", "labels": ["Person"], "properties": {"name": "Alice"}},
  {"id": "2", "labels": ["Person"], "properties": {"name": "Bob"}}
]
```

### CSV Export

```bash
# Export to CSV
geode export --format csv --output users.csv --query "MATCH (p:Person) RETURN p.name, p.age"
```

### GQL EXPORT

```gql
-- Export query results
EXPORT TO CSV 'users.csv'
MATCH (p:Person)
RETURN p.name, p.age, p.email;
```

## Selective Export

### Filtered Export

```gql
-- Export subset
EXPORT TO JSON 'active_users.json'
MATCH (p:Person)
WHERE p.last_login > NOW() - INTERVAL '30 days'
RETURN p;
```

### Schema Export

```bash
# Export schema only
geode export --schema-only --output schema.gql
```

## Streaming Export

### Large Datasets

```python
async def streaming_export(client):
    async with client.stream_query("MATCH (n) RETURN n") as stream:
        async for row in stream:
            write_to_file(row)
```

## Compression

```bash
# Export with compression
geode export --output backup.json.gz --compress gzip
```

## Best Practices

- Schedule regular backups
- Compress large exports
- Validate exported data
- Store exports securely
- Document export procedures

## Related Topics

- [Import](/tags/import) - Data import
- [Migration](/tags/migration) - Data migration
- [Backup](/tags/backup) - Backup strategies
