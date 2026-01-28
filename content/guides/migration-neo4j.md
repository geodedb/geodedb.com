---
title: "Migrating from Neo4j to Geode"
slug: "migration-neo4j"
description: "Complete guide to migrating from Neo4j to Geode, including Cypher to GQL translation, data export, and driver migration"
weight: 70
tags: ["migration", "neo4j", "cypher", "gql", "graph-database"]
categories: ["guides", "migration"]
keywords:
  - Neo4j migration
  - Cypher to GQL
  - graph database migration
  - Neo4j to Geode
  - database migration
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Migrating from Neo4j to Geode

This comprehensive guide walks you through migrating from Neo4j to Geode. Geode implements the ISO/IEC 39075:2024 GQL standard, providing a standards-based alternative to Neo4j's proprietary Cypher language. While GQL and Cypher share common ancestry, there are important differences to understand.

## Migration Overview

### Why Migrate to Geode?

| Feature | Neo4j | Geode |
|---------|-------|-------|
| Query Language | Cypher (proprietary) | GQL (ISO standard) |
| Protocol | Bolt | QUIC + TLS 1.3 |
| Licensing | Enterprise features require license | Apache 2.0 |
| Standards Compliance | Partial | 100% GQL compliant |
| Performance | Good | Excellent (QUIC benefits) |

### Migration Steps

1. **Assessment**: Analyze your Neo4j schema and queries
2. **Schema Mapping**: Map Neo4j schema to Geode
3. **Query Translation**: Convert Cypher queries to GQL
4. **Data Export**: Export data from Neo4j
5. **Data Import**: Import data into Geode
6. **Driver Migration**: Update application code
7. **Testing**: Validate migration completeness
8. **Cutover**: Switch production traffic

## Cypher to GQL Translation

GQL and Cypher are similar in many ways, but there are key differences. Here's a comprehensive translation guide.

### Basic Pattern Matching

**Cypher**:
```cypher
MATCH (n:Person {name: 'Alice'})
RETURN n
```

**GQL**:
```gql
MATCH (n:Person {name: 'Alice'})
RETURN n
```

Most basic patterns are identical!

### Variable-Length Paths

**Cypher**:
```cypher
MATCH (a:Person)-[:KNOWS*1..3]->(b:Person)
RETURN a, b
```

**GQL**:
```gql
MATCH (a:Person)-[:KNOWS*1..3]->(b:Person)
RETURN a, b
```

### Optional Match

**Cypher**:
```cypher
MATCH (p:Person)
OPTIONAL MATCH (p)-[:KNOWS]->(friend)
RETURN p.name, friend.name
```

**GQL**:
```gql
MATCH (p:Person)
OPTIONAL MATCH (p)-[:KNOWS]->(friend)
RETURN p.name, friend.name
```

### Creating Nodes

**Cypher**:
```cypher
CREATE (n:Person {name: 'Alice', age: 30})
RETURN n
```

**GQL**:
```gql
CREATE (n:Person {name: 'Alice', age: 30})
RETURN n
```

### Creating Relationships

**Cypher**:
```cypher
MATCH (a:Person {name: 'Alice'})
MATCH (b:Person {name: 'Bob'})
CREATE (a)-[:KNOWS {since: 2020}]->(b)
```

**GQL**:
```gql
MATCH (a:Person {name: 'Alice'})
MATCH (b:Person {name: 'Bob'})
CREATE (a)-[:KNOWS {since: 2020}]->(b)
```

### Key Differences

#### 1. MERGE Syntax

**Cypher**:
```cypher
MERGE (n:Person {name: 'Alice'})
ON CREATE SET n.created = timestamp()
ON MATCH SET n.accessed = timestamp()
RETURN n
```

**GQL**:
```gql
MERGE (n:Person {name: 'Alice'})
ON CREATE SET n.created = timestamp()
ON MATCH SET n.accessed = timestamp()
RETURN n
```

#### 2. List Comprehensions

**Cypher**:
```cypher
WITH [x IN range(1, 5) WHERE x % 2 = 0 | x * 2] AS evens
RETURN evens
```

**GQL**:
```gql
WITH [x IN range(1, 5) WHERE x % 2 = 0 | x * 2] AS evens
RETURN evens
```

#### 3. Path Functions

**Cypher**:
```cypher
MATCH path = (a:Person)-[:KNOWS*]->(b:Person)
RETURN nodes(path), relationships(path), length(path)
```

**GQL**:
```gql
MATCH path = (a:Person)-[:KNOWS*]->(b:Person)
RETURN nodes(path), relationships(path), length(path)
```

#### 4. Aggregations

**Cypher**:
```cypher
MATCH (p:Person)
RETURN p.city, count(*) AS population, avg(p.age) AS avg_age
ORDER BY population DESC
```

**GQL**:
```gql
MATCH (p:Person)
RETURN p.city, count(*) AS population, avg(p.age) AS avg_age
ORDER BY population DESC
```

#### 5. APOC Procedures

Neo4j's APOC library has no direct equivalent. Translate APOC calls to native GQL.

**Cypher with APOC**:
```cypher
CALL apoc.path.spanningTree(startNode, {relationshipFilter: 'KNOWS'})
YIELD path
RETURN path
```

**GQL equivalent**:
```gql
MATCH path = (start:Person {id: $id})-[:KNOWS*0..]->(end)
WHERE NOT (end)-[:KNOWS]->()
  OR end = start
RETURN DISTINCT path
```

**Cypher with APOC date functions**:
```cypher
RETURN apoc.date.format(timestamp(), 'ms', 'yyyy-MM-dd')
```

**GQL equivalent**:
```gql
RETURN toString(date(timestamp()))
```

#### 6. Index Creation

**Cypher**:
```cypher
CREATE INDEX FOR (n:Person) ON (n.name)
CREATE CONSTRAINT FOR (n:Person) REQUIRE n.email IS UNIQUE
```

**GQL**:
```gql
CREATE INDEX person_name ON :Person(name)
CREATE CONSTRAINT person_email_unique ON :Person(email) ASSERT UNIQUE
```

#### 7. Parameters

**Cypher**:
```cypher
MATCH (n:Person {name: $name})
RETURN n
```

**GQL**:
```gql
MATCH (n:Person {name: $name})
RETURN n
```

Parameters work identically!

## Schema Mapping

### Labels and Node Types

Neo4j labels map directly to Geode labels:

```gql
// Neo4j: (:Person:Employee)
// Geode: (:Person:Employee)

// Multiple labels work the same
MATCH (n:Person:Employee)
RETURN n
```

### Relationship Types

Relationship types map directly:

```gql
// Neo4j: -[:KNOWS]->
// Geode: -[:KNOWS]->

MATCH (a)-[:WORKS_AT]->(b)
RETURN a, b
```

### Property Types

| Neo4j Type | Geode Type | Notes |
|------------|------------|-------|
| String | STRING | Direct mapping |
| Integer | INTEGER | Direct mapping |
| Float | FLOAT | Direct mapping |
| Boolean | BOOLEAN | Direct mapping |
| Date | DATE | Direct mapping |
| DateTime | TIMESTAMP | Use timestamp() |
| Duration | DURATION | Direct mapping |
| Point | Not supported | Store as properties |
| List | LIST | Direct mapping |
| Map | MAP | Direct mapping |

### Constraints

**Neo4j**:
```cypher
CREATE CONSTRAINT person_name_unique FOR (n:Person) REQUIRE n.name IS UNIQUE
CREATE CONSTRAINT person_email_exists FOR (n:Person) REQUIRE n.email IS NOT NULL
```

**Geode**:
```gql
CREATE CONSTRAINT person_name_unique ON :Person(name) ASSERT UNIQUE
CREATE CONSTRAINT person_email_exists ON :Person(email) ASSERT EXISTS
```

### Indexes

**Neo4j**:
```cypher
CREATE INDEX person_name FOR (n:Person) ON (n.name)
CREATE INDEX person_age_city FOR (n:Person) ON (n.age, n.city)
CREATE TEXT INDEX person_bio FOR (n:Person) ON (n.bio)
CREATE FULLTEXT INDEX person_search FOR (n:Person) ON EACH [n.name, n.bio]
```

**Geode**:
```gql
CREATE INDEX person_name ON :Person(name)
CREATE INDEX person_age_city ON :Person(age, city)
CREATE TEXT INDEX person_bio ON :Person(bio)
CREATE FULLTEXT INDEX person_search ON :Person(name, bio)
```

## Data Export from Neo4j

### Method 1: CSV Export

Export nodes and relationships to CSV using Neo4j's `apoc.export.csv` or `CALL ... YIELD`:

```cypher
// Export all Person nodes
CALL apoc.export.csv.query(
  "MATCH (p:Person) RETURN p.id AS id, p.name AS name, p.age AS age, p.email AS email",
  "persons.csv",
  {}
)

// Export relationships
CALL apoc.export.csv.query(
  "MATCH (a:Person)-[r:KNOWS]->(b:Person) RETURN a.id AS from_id, b.id AS to_id, r.since AS since",
  "knows.csv",
  {}
)
```

Or use `cypher-shell`:

```bash
# Export nodes
echo "MATCH (p:Person) RETURN p.id, p.name, p.age, p.email" | \
  cypher-shell -u neo4j -p password --format plain > persons.csv

# Export relationships
echo "MATCH (a:Person)-[r:KNOWS]->(b:Person) RETURN a.id, b.id, r.since" | \
  cypher-shell -u neo4j -p password --format plain > knows.csv
```

### Method 2: JSON Export

Export to JSON for complex data:

```cypher
CALL apoc.export.json.all("export.json", {useTypes: true})
```

### Method 3: neo4j-admin Dump

For large databases, use neo4j-admin:

```bash
neo4j-admin database dump neo4j --to-path=/backup/
```

Then parse the dump file for import.

### Method 4: Streaming Export Script

For very large databases, stream exports:

```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password"))

def export_nodes(label, output_file):
    with driver.session() as session:
        with open(output_file, 'w') as f:
            result = session.run(f"MATCH (n:{label}) RETURN n")
            for record in result:
                node = record["n"]
                f.write(json.dumps(dict(node)) + '\n')

def export_relationships(rel_type, output_file):
    with driver.session() as session:
        with open(output_file, 'w') as f:
            result = session.run(f"""
                MATCH (a)-[r:{rel_type}]->(b)
                RETURN id(a) AS from_id, id(b) AS to_id, properties(r) AS props
            """)
            for record in result:
                f.write(json.dumps({
                    'from': record['from_id'],
                    'to': record['to_id'],
                    'properties': record['props']
                }) + '\n')

# Export all labels
export_nodes('Person', 'persons.jsonl')
export_nodes('Company', 'companies.jsonl')
export_relationships('KNOWS', 'knows.jsonl')
export_relationships('WORKS_AT', 'works_at.jsonl')
```

## Data Import to Geode

### Import from CSV

```gql
// Import persons
LOAD CSV WITH HEADERS FROM 'file:///persons.csv' AS row
CREATE (:Person {
  id: toInteger(row.id),
  name: row.name,
  age: toInteger(row.age),
  email: row.email
})

// Import relationships
LOAD CSV WITH HEADERS FROM 'file:///knows.csv' AS row
MATCH (a:Person {id: toInteger(row.from_id)})
MATCH (b:Person {id: toInteger(row.to_id)})
CREATE (a)-[:KNOWS {since: toInteger(row.since)}]->(b)
```

### Import from JSON

```python
import asyncio
import json
from geode_client import Client

async def import_nodes(client, label, input_file):
    async with client.connection() as conn:
        with open(input_file, 'r') as f:
            for line in f:
                data = json.loads(line)
                await conn.execute(
                    f"CREATE (n:{label} $props)",
                    {"props": data}
                )

async def import_relationships(client, rel_type, input_file):
    async with client.connection() as conn:
        with open(input_file, 'r') as f:
            for line in f:
                data = json.loads(line)
                await conn.execute(f"""
                    MATCH (a {{id: $from_id}})
                    MATCH (b {{id: $to_id}})
                    CREATE (a)-[:{rel_type} $props]->(b)
                """, {
                    "from_id": data['from'],
                    "to_id": data['to'],
                    "props": data['properties']
                })

async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)

    # Import nodes
    await import_nodes(client, 'Person', 'persons.jsonl')
    await import_nodes(client, 'Company', 'companies.jsonl')

    # Import relationships
    await import_relationships(client, 'KNOWS', 'knows.jsonl')
    await import_relationships(client, 'WORKS_AT', 'works_at.jsonl')

    print("Import complete!")

asyncio.run(main())
```

### Batch Import for Large Datasets

For better performance, use batch operations:

```python
async def batch_import_nodes(client, label, input_file, batch_size=1000):
    async with client.connection() as conn:
        await conn.begin()
        count = 0

        with open(input_file, 'r') as f:
            for line in f:
                data = json.loads(line)
                await conn.execute(
                    f"CREATE (n:{label} $props)",
                    {"props": data}
                )
                count += 1

                if count % batch_size == 0:
                    await conn.commit()
                    await conn.begin()
                    print(f"Imported {count} nodes...")

        await conn.commit()
        print(f"Total imported: {count} nodes")
```

## Driver Migration

### Go Driver Migration

**Neo4j Go Driver**:
```go
import (
    "github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func main() {
    driver, _ := neo4j.NewDriverWithContext(
        "neo4j://localhost:7687",
        neo4j.BasicAuth("neo4j", "password", ""),
    )
    defer driver.Close(context.Background())

    session := driver.NewSession(context.Background(), neo4j.SessionConfig{})
    defer session.Close(context.Background())

    result, _ := session.Run(context.Background(),
        "MATCH (p:Person {name: $name}) RETURN p",
        map[string]interface{}{"name": "Alice"},
    )

    for result.Next(context.Background()) {
        record := result.Record()
        fmt.Println(record.Values[0])
    }
}
```

**Geode Go Driver**:
```go
import (
    "context"
    "database/sql"
    _ "geodedb.com/geode"
)

func main() {
    db, _ := sql.Open("geode", "localhost:3141")
    defer db.Close()

    ctx := context.Background()
    rows, _ := db.QueryContext(ctx,
        "MATCH (p:Person {name: ?}) RETURN p.name, p.age",
        "Alice",
    )
    defer rows.Close()

    for rows.Next() {
        var name string
        var age int
        rows.Scan(&name, &age)
        fmt.Printf("Name: %s, Age: %d\n", name, age)
    }
}
```

### Python Driver Migration

**Neo4j Python Driver**:
```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver(
    "neo4j://localhost:7687",
    auth=("neo4j", "password")
)

with driver.session() as session:
    result = session.run(
        "MATCH (p:Person {name: $name}) RETURN p",
        name="Alice"
    )
    for record in result:
        print(record["p"])

driver.close()
```

**Geode Python Driver**:
```python
import asyncio
from geode_client import Client

async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        page, _ = await conn.query(
            "MATCH (p:Person {name: $name}) RETURN p.name, p.age",
            {"name": "Alice"}
        )
        for row in page.rows:
            print(f"Name: {row['p.name'].as_string}, Age: {row['p.age'].as_int}")

asyncio.run(main())
```

### Rust Driver Migration

**Neo4j Rust Driver (neo4rs)**:
```rust
use neo4rs::*;

#[tokio::main]
async fn main() {
    let graph = Graph::new(
        "bolt://localhost:7687",
        "neo4j",
        "password"
    ).await.unwrap();

    let mut result = graph.execute(
        query("MATCH (p:Person {name: $name}) RETURN p")
            .param("name", "Alice")
    ).await.unwrap();

    while let Ok(Some(row)) = result.next().await {
        let node: Node = row.get("p").unwrap();
        println!("{:?}", node);
    }
}
```

**Geode Rust Driver**:
```rust
use geode_client::{Client, Value};
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    let mut params = HashMap::new();
    params.insert("name".to_string(), Value::string("Alice"));

    let (page, _) = conn.query_with_params(
        "MATCH (p:Person {name: $name}) RETURN p.name, p.age",
        &params
    ).await?;

    for row in &page.rows {
        println!("Name: {}, Age: {}",
            row.get("p.name").unwrap().as_string()?,
            row.get("p.age").unwrap().as_int()?
        );
    }

    Ok(())
}
```

### Node.js Driver Migration

**Neo4j JavaScript Driver**:
```javascript
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  'neo4j://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

const session = driver.session();

const result = await session.run(
  'MATCH (p:Person {name: $name}) RETURN p',
  { name: 'Alice' }
);

result.records.forEach(record => {
  console.log(record.get('p'));
});

await session.close();
await driver.close();
```

**Geode JavaScript Driver**:
```typescript
import { createClient } from '@geodedb/client';

const client = await createClient('geode://localhost:3141');

const rows = await client.queryAll(
  'MATCH (p:Person {name: $name}) RETURN p.name, p.age',
  { params: { name: 'Alice' } }
);

for (const row of rows) {
  console.log(`Name: ${row.get('p.name')?.asString}, Age: ${row.get('p.age')?.asNumber}`);
}

await client.close();
```

### Zig Driver Migration

**Geode Zig Driver** (no Neo4j equivalent):
```zig
const std = @import("std");
const geode = @import("geode_client");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.sendHello("migration-app", "1.0.0");
    _ = try client.receiveMessage(30000);

    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("name", .{ .string = "Alice" });

    try client.sendRunGql(1,
        "MATCH (p:Person {name: $name}) RETURN p.name, p.age",
        .{ .object = params }
    );
    _ = try client.receiveMessage(30000);

    try client.sendPull(1, 1000);
    const result = try client.receiveMessage(30000);
    defer allocator.free(result);

    std.debug.print("Result: {s}\n", .{result});
}
```

## Testing Migration Completeness

### Data Validation Script

```python
import asyncio
from geode_client import Client

async def validate_migration():
    client = Client(host="localhost", port=3141, skip_verify=True)

    async with client.connection() as conn:
        # Validate node counts
        expected_counts = {
            'Person': 10000,
            'Company': 500,
            'Product': 2000,
        }

        for label, expected in expected_counts.items():
            page, _ = await conn.query(f"MATCH (n:{label}) RETURN count(n) AS count")
            actual = page.rows[0]['count'].as_int
            if actual != expected:
                print(f"FAIL: {label} count mismatch. Expected {expected}, got {actual}")
            else:
                print(f"PASS: {label} count matches ({actual})")

        # Validate relationship counts
        expected_rels = {
            'KNOWS': 25000,
            'WORKS_AT': 10000,
            'PURCHASED': 50000,
        }

        for rel_type, expected in expected_rels.items():
            page, _ = await conn.query(
                f"MATCH ()-[r:{rel_type}]->() RETURN count(r) AS count"
            )
            actual = page.rows[0]['count'].as_int
            if actual != expected:
                print(f"FAIL: {rel_type} count mismatch. Expected {expected}, got {actual}")
            else:
                print(f"PASS: {rel_type} count matches ({actual})")

        # Validate indexes
        page, _ = await conn.query("SHOW INDEXES")
        print(f"\nIndexes: {len(page.rows)} found")
        for row in page.rows:
            print(f"  - {row}")

        # Validate constraints
        page, _ = await conn.query("SHOW CONSTRAINTS")
        print(f"\nConstraints: {len(page.rows)} found")
        for row in page.rows:
            print(f"  - {row}")

asyncio.run(validate_migration())
```

### Query Equivalence Testing

Create a test suite that runs the same queries on both databases:

```python
import asyncio
from neo4j import GraphDatabase
from geode_client import Client

# Test queries that should produce identical results
TEST_QUERIES = [
    {
        'name': 'Count all persons',
        'cypher': 'MATCH (p:Person) RETURN count(p)',
        'gql': 'MATCH (p:Person) RETURN count(p)',
    },
    {
        'name': 'Find person by name',
        'cypher': 'MATCH (p:Person {name: $name}) RETURN p.name, p.age',
        'gql': 'MATCH (p:Person {name: $name}) RETURN p.name, p.age',
        'params': {'name': 'Alice'},
    },
    {
        'name': 'Find friends',
        'cypher': 'MATCH (p:Person)-[:KNOWS]->(f) RETURN p.name, f.name ORDER BY p.name',
        'gql': 'MATCH (p:Person)-[:KNOWS]->(f) RETURN p.name, f.name ORDER BY p.name',
    },
    {
        'name': 'Count by city',
        'cypher': 'MATCH (p:Person) RETURN p.city, count(*) AS c ORDER BY c DESC',
        'gql': 'MATCH (p:Person) RETURN p.city, count(*) AS c ORDER BY c DESC',
    },
]

async def run_equivalence_tests():
    # Neo4j connection
    neo4j_driver = GraphDatabase.driver(
        "neo4j://localhost:7687",
        auth=("neo4j", "password")
    )

    # Geode connection
    geode_client = Client(host="localhost", port=3141, skip_verify=True)

    async with geode_client.connection() as geode_conn:
        for test in TEST_QUERIES:
            print(f"\nTesting: {test['name']}")
            params = test.get('params', {})

            # Run on Neo4j
            with neo4j_driver.session() as session:
                neo4j_result = list(session.run(test['cypher'], **params))

            # Run on Geode
            page, _ = await geode_conn.query(test['gql'], params)
            geode_result = page.rows

            # Compare results
            if len(neo4j_result) != len(geode_result):
                print(f"  FAIL: Row count mismatch ({len(neo4j_result)} vs {len(geode_result)})")
            else:
                print(f"  PASS: Row counts match ({len(geode_result)})")

    neo4j_driver.close()

asyncio.run(run_equivalence_tests())
```

### Performance Comparison

```python
import asyncio
import time
from statistics import mean, stdev

async def benchmark_query(conn, query, params=None, iterations=100):
    times = []
    for _ in range(iterations):
        start = time.perf_counter()
        await conn.query(query, params or {})
        elapsed = time.perf_counter() - start
        times.append(elapsed * 1000)  # Convert to ms

    return {
        'min': min(times),
        'max': max(times),
        'mean': mean(times),
        'stdev': stdev(times) if len(times) > 1 else 0,
    }

async def run_benchmarks():
    client = Client(host="localhost", port=3141, skip_verify=True)

    benchmarks = [
        ('Simple lookup', 'MATCH (p:Person {name: $name}) RETURN p', {'name': 'Alice'}),
        ('Full scan', 'MATCH (p:Person) RETURN count(p)', None),
        ('Traversal', 'MATCH (p:Person)-[:KNOWS*1..3]->(f) RETURN count(f)', None),
        ('Aggregation', 'MATCH (p:Person) RETURN p.city, count(*) ORDER BY count(*) DESC', None),
    ]

    async with client.connection() as conn:
        print("Geode Performance Benchmarks (100 iterations each)")
        print("=" * 60)

        for name, query, params in benchmarks:
            results = await benchmark_query(conn, query, params)
            print(f"\n{name}:")
            print(f"  Min:    {results['min']:.2f}ms")
            print(f"  Max:    {results['max']:.2f}ms")
            print(f"  Mean:   {results['mean']:.2f}ms")
            print(f"  StdDev: {results['stdev']:.2f}ms")

asyncio.run(run_benchmarks())
```

## Common Pitfalls

### 1. APOC Dependencies

**Problem**: Queries using APOC procedures won't work.

**Solution**: Rewrite queries using native GQL.

```cypher
// Neo4j with APOC
CALL apoc.do.when(
  $condition,
  'MATCH (n:Person) RETURN n',
  'MATCH (n:Company) RETURN n',
  {condition: $cond}
)
```

```gql
// GQL equivalent
MATCH (n)
WHERE ($condition AND n:Person) OR (NOT $condition AND n:Company)
RETURN n
```

### 2. Internal IDs

**Problem**: Neo4j internal IDs change during import.

**Solution**: Use application-level IDs.

```gql
// Add unique ID property before migration
// Neo4j
MATCH (n)
WHERE n.uuid IS NULL
SET n.uuid = randomUUID()

// Use uuid for relationships in Geode
MATCH (a {uuid: $from_uuid})
MATCH (b {uuid: $to_uuid})
CREATE (a)-[:KNOWS]->(b)
```

### 3. Point/Spatial Data

**Problem**: Neo4j Point types aren't directly supported.

**Solution**: Store as separate properties.

```gql
// Neo4j
(:Location {point: point({latitude: 40.7, longitude: -74.0})})

// Geode
(:Location {latitude: 40.7, longitude: -74.0})

// Or as a map
(:Location {coordinates: {lat: 40.7, lng: -74.0}})
```

### 4. Transaction Semantics

**Problem**: Different default transaction behaviors.

**Solution**: Explicitly manage transactions.

```python
# Always use explicit transactions for multi-statement operations
async with client.connection() as conn:
    await conn.begin()
    try:
        await conn.execute("CREATE (:Person {name: 'Alice'})")
        await conn.execute("CREATE (:Person {name: 'Bob'})")
        await conn.commit()
    except Exception:
        await conn.rollback()
        raise
```

### 5. Date/Time Handling

**Problem**: Date/time format differences.

**Solution**: Use standard ISO formats.

```gql
// Always use ISO format for dates
CREATE (:Event {
  date: date('2024-01-15'),
  time: time('14:30:00'),
  datetime: timestamp('2024-01-15T14:30:00Z')
})
```

### 6. Large Property Values

**Problem**: Neo4j allows very large strings; Geode has limits.

**Solution**: Store large content externally.

```gql
// Instead of storing large content directly
(:Document {content: "very long text..."})

// Store reference to external storage
(:Document {content_url: "s3://bucket/doc123.txt", content_hash: "sha256..."})
```

### 7. Relationship Direction

**Problem**: Forgetting relationship direction matters.

**Solution**: Always specify direction or use undirected pattern.

```gql
// Directed (finds only outgoing)
MATCH (a)-[:KNOWS]->(b)

// Undirected (finds both directions)
MATCH (a)-[:KNOWS]-(b)
```

### 8. Null Handling

**Problem**: Different null semantics.

**Solution**: Use COALESCE for null-safe operations.

```gql
MATCH (p:Person)
RETURN p.name, COALESCE(p.nickname, p.name) AS display_name
```

## Migration Checklist

Use this checklist to track your migration progress:

### Pre-Migration
- [ ] Inventory all node labels and relationship types
- [ ] Document all Cypher queries used in applications
- [ ] Identify APOC procedure usage
- [ ] Assess data volume and migration time requirements
- [ ] Plan for hybrid operation period

### Schema Migration
- [ ] Export schema from Neo4j (labels, types, constraints, indexes)
- [ ] Create equivalent Geode schema
- [ ] Verify all constraints can be replicated
- [ ] Create all necessary indexes

### Data Migration
- [ ] Export all nodes by label
- [ ] Export all relationships by type
- [ ] Import nodes to Geode
- [ ] Create indexes before relationship import
- [ ] Import relationships to Geode
- [ ] Validate data counts

### Query Migration
- [ ] Translate all Cypher queries to GQL
- [ ] Replace APOC procedures with native GQL
- [ ] Test all queries for correctness
- [ ] Benchmark query performance

### Driver Migration
- [ ] Update dependencies in all applications
- [ ] Refactor connection code
- [ ] Update query execution code
- [ ] Test all application functionality

### Validation
- [ ] Run data validation scripts
- [ ] Execute query equivalence tests
- [ ] Perform load testing
- [ ] Verify backup/restore procedures

### Cutover
- [ ] Plan maintenance window
- [ ] Prepare rollback procedure
- [ ] Execute final data sync
- [ ] Switch application connections
- [ ] Monitor for errors
- [ ] Decommission Neo4j (after stability period)

## Resources

- [GQL Reference](/docs/gql-reference/)
- [Graph Modeling Guide](/guides/graph-modeling/)
- [Client Libraries](/clients/)
- [Performance Guide](/docs/performance/)

## Getting Help

If you encounter issues during migration:

- [Documentation](https://docs.geodedb.com)
- [GitLab Issues](https://gitlab.com/devnw/codepros/geode/geode/-/issues)
- [Community Forum](https://forum.geodedb.com)
- [Email Support](mailto:support@geodedb.com)
