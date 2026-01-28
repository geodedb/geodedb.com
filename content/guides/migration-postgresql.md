---
title: "Migrating from PostgreSQL to Geode"
slug: "migration-postgresql"
description: "Complete guide to migrating from PostgreSQL to Geode, including relational to graph model conversion, ETL pipelines, and incremental migration strategies"
weight: 71
tags: ["migration", "postgresql", "sql", "gql", "relational"]
categories: ["guides", "migration"]
keywords:
  - PostgreSQL migration
  - SQL to GQL
  - relational to graph
  - database migration
  - PostgreSQL to Geode
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Migrating from PostgreSQL to Geode

This guide provides a comprehensive approach to migrating from PostgreSQL to Geode. Unlike migrating between similar databases, moving from a relational model to a graph model requires rethinking how you structure and query your data.

## Migration Overview

### When to Use a Graph Database

Graph databases excel when:
- **Relationships are first-class citizens**: Your queries traverse multiple relationships
- **Schema is flexible**: New relationship types emerge over time
- **Many-to-many relationships dominate**: Junction tables become unwieldy
- **Path queries are common**: Finding connections between entities

### When to Keep PostgreSQL

Consider keeping PostgreSQL for:
- Simple CRUD operations with fixed schemas
- Heavy aggregation/reporting workloads
- Strong ACID requirements with complex constraints
- Well-defined, stable relational structures

### Hybrid Approach

Many organizations run both:
- PostgreSQL for transactional data and reporting
- Geode for relationship-heavy queries and traversals

## Relational to Graph Model Conversion

### Core Concepts Mapping

| Relational Concept | Graph Equivalent |
|-------------------|------------------|
| Table | Node Label |
| Row | Node |
| Column | Property |
| Primary Key | Node ID property |
| Foreign Key | Relationship |
| Junction Table | Relationship (with properties) |
| View | Stored Query |

### Example: E-Commerce Schema

**PostgreSQL Schema**:
```sql
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category_id INTEGER REFERENCES categories(id)
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES categories(id)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    order_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50)
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    product_id INTEGER REFERENCES products(id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Geode Graph Model**:
```gql
// Nodes
(:Customer {id, name, email, created_at})
(:Product {id, name, price})
(:Category {id, name})
(:Order {id, order_date, status})

// Relationships
(:Customer)-[:PLACED]->(:Order)
(:Order)-[:CONTAINS {quantity, unit_price}]->(:Product)
(:Product)-[:IN_CATEGORY]->(:Category)
(:Category)-[:PARENT]->(:Category)
(:Customer)-[:REVIEWED {rating, comment, created_at}]->(:Product)
```

**Visual Representation**:
```
                    +-----------+
                    | Category  |
                    +-----------+
                         ^
                         | :PARENT (self-referential)
                         |
                    +-----------+
                    | Category  |
                    +-----------+
                         ^
                         | :IN_CATEGORY
                         |
+-----------+       +-----------+       +-----------+
| Customer  |------>|  Order    |------>|  Product  |
+-----------+ :PLACED +-----------+ :CONTAINS +-----------+
     |                                       ^
     |                                       |
     +---------------------------------------+
                    :REVIEWED
```

## Table to Node Mapping

### Simple Tables

**PostgreSQL**:
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255),
    age INTEGER,
    active BOOLEAN DEFAULT true
);
```

**GQL Node Creation**:
```gql
CREATE (:User {
    id: 1,
    username: 'alice',
    email: 'alice@example.com',
    age: 30,
    active: true
})
```

### Tables with Enums

**PostgreSQL**:
```sql
CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    role user_role
);
```

**GQL**:
```gql
// Option 1: Store as string property
CREATE (:User {id: 1, name: 'Alice', role: 'admin'})

// Option 2: Use labels for roles
CREATE (:User:Admin {id: 1, name: 'Alice'})
```

### Tables with Arrays

**PostgreSQL**:
```sql
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    tags TEXT[]
);
```

**GQL**:
```gql
// Option 1: Store as list property
CREATE (:Article {id: 1, title: 'Graph Databases', tags: ['database', 'graph', 'nosql']})

// Option 2: Create Tag nodes with relationships
CREATE (:Article {id: 1, title: 'Graph Databases'})
CREATE (:Tag {name: 'database'})
CREATE (:Tag {name: 'graph'})
MATCH (a:Article {id: 1}), (t:Tag {name: 'database'})
CREATE (a)-[:TAGGED]->(t)
```

### Tables with JSON

**PostgreSQL**:
```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    metadata JSONB
);
```

**GQL**:
```gql
// Option 1: Store as map property
CREATE (:Event {
    id: 1,
    name: 'PageView',
    metadata: {browser: 'Chrome', os: 'Windows', version: '120.0'}
})

// Option 2: Flatten commonly queried fields
CREATE (:Event {
    id: 1,
    name: 'PageView',
    browser: 'Chrome',
    os: 'Windows',
    metadata: {version: '120.0'}
})
```

## Foreign Keys to Relationships

### One-to-Many Relationships

**PostgreSQL**:
```sql
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    department_id INTEGER REFERENCES departments(id)
);
```

**GQL**:
```gql
// Create nodes
CREATE (:Department {id: 1, name: 'Engineering'})
CREATE (:Employee {id: 1, name: 'Alice'})

// Create relationship
MATCH (e:Employee {id: 1})
MATCH (d:Department {id: 1})
CREATE (e)-[:WORKS_IN]->(d)
```

### Many-to-Many Relationships (Junction Tables)

**PostgreSQL**:
```sql
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE enrollments (
    student_id INTEGER REFERENCES students(id),
    course_id INTEGER REFERENCES courses(id),
    enrolled_at TIMESTAMP DEFAULT NOW(),
    grade VARCHAR(2),
    PRIMARY KEY (student_id, course_id)
);
```

**GQL**:
```gql
// Junction table becomes relationship with properties
CREATE (:Student {id: 1, name: 'Alice'})
CREATE (:Course {id: 1, name: 'Database Systems'})

MATCH (s:Student {id: 1})
MATCH (c:Course {id: 1})
CREATE (s)-[:ENROLLED_IN {enrolled_at: timestamp(), grade: 'A'}]->(c)
```

### Self-Referential Relationships

**PostgreSQL**:
```sql
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    manager_id INTEGER REFERENCES employees(id)
);
```

**GQL**:
```gql
CREATE (:Employee {id: 1, name: 'CEO'})
CREATE (:Employee {id: 2, name: 'VP Engineering'})
CREATE (:Employee {id: 3, name: 'Developer'})

MATCH (m:Employee {id: 1}), (e:Employee {id: 2})
CREATE (e)-[:REPORTS_TO]->(m)

MATCH (m:Employee {id: 2}), (e:Employee {id: 3})
CREATE (e)-[:REPORTS_TO]->(m)
```

## SQL to GQL Translation

### Basic Queries

**SELECT**:
```sql
-- SQL
SELECT name, email FROM customers WHERE age > 25;
```

```gql
-- GQL
MATCH (c:Customer)
WHERE c.age > 25
RETURN c.name, c.email
```

**INSERT**:
```sql
-- SQL
INSERT INTO customers (name, email, age) VALUES ('Alice', 'alice@example.com', 30);
```

```gql
-- GQL
CREATE (:Customer {name: 'Alice', email: 'alice@example.com', age: 30})
```

**UPDATE**:
```sql
-- SQL
UPDATE customers SET age = 31 WHERE name = 'Alice';
```

```gql
-- GQL
MATCH (c:Customer {name: 'Alice'})
SET c.age = 31
```

**DELETE**:
```sql
-- SQL
DELETE FROM customers WHERE id = 1;
```

```gql
-- GQL
MATCH (c:Customer {id: 1})
DELETE c
```

### Joins to Pattern Matching

**Inner Join**:
```sql
-- SQL
SELECT o.id, c.name
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id;
```

```gql
-- GQL
MATCH (c:Customer)-[:PLACED]->(o:Order)
RETURN o.id, c.name
```

**Left Join**:
```sql
-- SQL
SELECT c.name, o.id
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id;
```

```gql
-- GQL
MATCH (c:Customer)
OPTIONAL MATCH (c)-[:PLACED]->(o:Order)
RETURN c.name, o.id
```

**Multiple Joins**:
```sql
-- SQL
SELECT c.name, p.name, oi.quantity
FROM customers c
JOIN orders o ON c.id = o.customer_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id;
```

```gql
-- GQL
MATCH (c:Customer)-[:PLACED]->(o:Order)-[item:CONTAINS]->(p:Product)
RETURN c.name, p.name, item.quantity
```

### Subqueries

**Correlated Subquery**:
```sql
-- SQL
SELECT c.name,
       (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) AS order_count
FROM customers c;
```

```gql
-- GQL
MATCH (c:Customer)
OPTIONAL MATCH (c)-[:PLACED]->(o:Order)
RETURN c.name, count(o) AS order_count
```

**EXISTS Subquery**:
```sql
-- SQL
SELECT * FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders WHERE customer_id = c.id
);
```

```gql
-- GQL
MATCH (c:Customer)-[:PLACED]->(:Order)
RETURN DISTINCT c
```

### Aggregations

**GROUP BY**:
```sql
-- SQL
SELECT category_id, COUNT(*), AVG(price)
FROM products
GROUP BY category_id;
```

```gql
-- GQL
MATCH (p:Product)-[:IN_CATEGORY]->(c:Category)
RETURN c.id, count(p), avg(p.price)
```

**HAVING**:
```sql
-- SQL
SELECT customer_id, COUNT(*) as order_count
FROM orders
GROUP BY customer_id
HAVING COUNT(*) > 5;
```

```gql
-- GQL
MATCH (c:Customer)-[:PLACED]->(o:Order)
WITH c, count(o) AS order_count
WHERE order_count > 5
RETURN c.id, order_count
```

### Window Functions

**ROW_NUMBER**:
```sql
-- SQL
SELECT name, price,
       ROW_NUMBER() OVER (ORDER BY price DESC) as rank
FROM products;
```

```gql
-- GQL (using collect and unwind)
MATCH (p:Product)
WITH p ORDER BY p.price DESC
WITH collect(p) AS products
UNWIND range(0, size(products)-1) AS idx
RETURN products[idx].name, products[idx].price, idx + 1 AS rank
```

### Common Table Expressions (CTEs)

```sql
-- SQL
WITH high_value_customers AS (
    SELECT customer_id, SUM(total) as total_spent
    FROM orders
    GROUP BY customer_id
    HAVING SUM(total) > 1000
)
SELECT c.name, hvc.total_spent
FROM customers c
JOIN high_value_customers hvc ON c.id = hvc.customer_id;
```

```gql
-- GQL
MATCH (c:Customer)-[:PLACED]->(o:Order)
WITH c, sum(o.total) AS total_spent
WHERE total_spent > 1000
RETURN c.name, total_spent
```

### Recursive Queries

**PostgreSQL Recursive CTE**:
```sql
-- SQL: Find all subordinates
WITH RECURSIVE subordinates AS (
    SELECT id, name, manager_id
    FROM employees
    WHERE id = 1

    UNION ALL

    SELECT e.id, e.name, e.manager_id
    FROM employees e
    JOIN subordinates s ON e.manager_id = s.id
)
SELECT * FROM subordinates;
```

**GQL Variable-Length Path**:
```gql
-- GQL: Much simpler!
MATCH (manager:Employee {id: 1})<-[:REPORTS_TO*]-(subordinate)
RETURN subordinate.id, subordinate.name
```

## ETL Pipeline Setup

### Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ PostgreSQL  │────▶│   ETL Job   │────▶│   Geode     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │            ┌──────┴──────┐
       │            │             │
       ▼            ▼             ▼
  ┌─────────┐  ┌─────────┐  ┌─────────┐
  │ Extract │  │Transform│  │  Load   │
  └─────────┘  └─────────┘  └─────────┘
```

### Python ETL Script

```python
import asyncio
import psycopg
from geode_client import Client

# Configuration
PG_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "password",
    "dbname": "ecommerce"
}

GEODE_CONFIG = {
    "host": "localhost",
    "port": 3141,
    "skip_verify": True
}

class PostgresToGeodeETL:
    def __init__(self):
        self.pg_conn = None
        self.geode_client = None

    async def connect(self):
        # Connect to PostgreSQL
        self.pg_conn = await psycopg.AsyncConnection.connect(
            **PG_CONFIG,
            autocommit=True
        )

        # Connect to Geode
        self.geode_client = Client(**GEODE_CONFIG)

    async def extract_table(self, table_name, batch_size=1000):
        """Extract data from PostgreSQL table in batches."""
        async with self.pg_conn.cursor() as cur:
            await cur.execute(f"SELECT COUNT(*) FROM {table_name}")
            total = (await cur.fetchone())[0]

            for offset in range(0, total, batch_size):
                await cur.execute(
                    f"SELECT * FROM {table_name} ORDER BY id LIMIT %s OFFSET %s",
                    (batch_size, offset)
                )
                columns = [desc[0] for desc in cur.description]
                rows = await cur.fetchall()

                for row in rows:
                    yield dict(zip(columns, row))

    async def load_nodes(self, label, data_generator, id_field='id'):
        """Load nodes into Geode."""
        async with self.geode_client.connection() as conn:
            count = 0
            await conn.begin()

            async for row in data_generator:
                # Convert types as needed
                props = self.transform_properties(row)

                await conn.execute(
                    f"CREATE (n:{label} $props)",
                    {"props": props}
                )
                count += 1

                # Commit in batches
                if count % 1000 == 0:
                    await conn.commit()
                    await conn.begin()
                    print(f"Loaded {count} {label} nodes...")

            await conn.commit()
            print(f"Total: {count} {label} nodes loaded")

    async def load_relationships(self, rel_type, from_label, to_label,
                                  from_field, to_field, data_generator):
        """Load relationships into Geode."""
        async with self.geode_client.connection() as conn:
            count = 0
            await conn.begin()

            async for row in data_generator:
                props = {k: v for k, v in row.items()
                        if k not in [from_field, to_field]}
                props = self.transform_properties(props)

                await conn.execute(f"""
                    MATCH (a:{from_label} {{id: $from_id}})
                    MATCH (b:{to_label} {{id: $to_id}})
                    CREATE (a)-[:{rel_type} $props]->(b)
                """, {
                    "from_id": row[from_field],
                    "to_id": row[to_field],
                    "props": props
                })
                count += 1

                if count % 1000 == 0:
                    await conn.commit()
                    await conn.begin()
                    print(f"Loaded {count} {rel_type} relationships...")

            await conn.commit()
            print(f"Total: {count} {rel_type} relationships loaded")

    def transform_properties(self, row):
        """Transform PostgreSQL types to Geode-compatible types."""
        result = {}
        for key, value in row.items():
            if value is None:
                continue  # Skip null values
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, Decimal):
                result[key] = float(value)
            elif isinstance(value, (list, dict)):
                result[key] = value  # Lists and maps are supported
            else:
                result[key] = value
        return result

    async def run_migration(self):
        """Run the complete migration."""
        await self.connect()

        # Step 1: Create indexes for efficient relationship creation
        async with self.geode_client.connection() as conn:
            await conn.execute("CREATE INDEX customer_id ON :Customer(id)")
            await conn.execute("CREATE INDEX product_id ON :Product(id)")
            await conn.execute("CREATE INDEX category_id ON :Category(id)")
            await conn.execute("CREATE INDEX order_id ON :Order(id)")

        # Step 2: Load nodes
        print("\n=== Loading Nodes ===")

        await self.load_nodes('Customer',
            self.extract_table('customers'))

        await self.load_nodes('Category',
            self.extract_table('categories'))

        await self.load_nodes('Product',
            self.extract_table('products'))

        await self.load_nodes('Order',
            self.extract_table('orders'))

        # Step 3: Load relationships
        print("\n=== Loading Relationships ===")

        # Product -> Category
        async with self.pg_conn.cursor() as cur:
            await cur.execute("""
                SELECT id as product_id, category_id
                FROM products
                WHERE category_id IS NOT NULL
            """)
            columns = [desc[0] for desc in cur.description]
            rows = await cur.fetchall()

        async def product_category_gen():
            for row in rows:
                yield dict(zip(columns, row))

        await self.load_relationships(
            'IN_CATEGORY', 'Product', 'Category',
            'product_id', 'category_id',
            product_category_gen()
        )

        # Category -> Parent Category
        async with self.pg_conn.cursor() as cur:
            await cur.execute("""
                SELECT id as child_id, parent_id
                FROM categories
                WHERE parent_id IS NOT NULL
            """)
            columns = [desc[0] for desc in cur.description]
            rows = await cur.fetchall()

        async def category_parent_gen():
            for row in rows:
                yield dict(zip(columns, row))

        await self.load_relationships(
            'PARENT', 'Category', 'Category',
            'child_id', 'parent_id',
            category_parent_gen()
        )

        # Customer -> Order
        async with self.pg_conn.cursor() as cur:
            await cur.execute("""
                SELECT id as order_id, customer_id
                FROM orders
            """)
            columns = [desc[0] for desc in cur.description]
            rows = await cur.fetchall()

        async def customer_order_gen():
            for row in rows:
                yield dict(zip(columns, row))

        await self.load_relationships(
            'PLACED', 'Customer', 'Order',
            'customer_id', 'order_id',
            customer_order_gen()
        )

        # Order -> Product (from order_items)
        await self.load_relationships(
            'CONTAINS', 'Order', 'Product',
            'order_id', 'product_id',
            self.extract_table('order_items')
        )

        # Customer -> Product (reviews)
        await self.load_relationships(
            'REVIEWED', 'Customer', 'Product',
            'customer_id', 'product_id',
            self.extract_table('reviews')
        )

        print("\n=== Migration Complete ===")

# Run migration
async def main():
    etl = PostgresToGeodeETL()
    await etl.run_migration()

asyncio.run(main())
```

### Go ETL Script

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"

    _ "github.com/lib/pq"
    _ "geodedb.com/geode"
)

type ETL struct {
    pg    *sql.DB
    geode *sql.DB
}

func NewETL(pgConn, geodeConn string) (*ETL, error) {
    pg, err := sql.Open("postgres", pgConn)
    if err != nil {
        return nil, err
    }

    geode, err := sql.Open("geode", geodeConn)
    if err != nil {
        return nil, err
    }

    return &ETL{pg: pg, geode: geode}, nil
}

func (e *ETL) MigrateTable(ctx context.Context, table, label string) error {
    // Count rows
    var count int
    err := e.pg.QueryRowContext(ctx,
        fmt.Sprintf("SELECT COUNT(*) FROM %s", table)).Scan(&count)
    if err != nil {
        return err
    }
    log.Printf("Migrating %d rows from %s to %s", count, table, label)

    // Query source data
    rows, err := e.pg.QueryContext(ctx,
        fmt.Sprintf("SELECT * FROM %s", table))
    if err != nil {
        return err
    }
    defer rows.Close()

    columns, err := rows.Columns()
    if err != nil {
        return err
    }

    // Begin transaction
    tx, err := e.geode.BeginTx(ctx, nil)
    if err != nil {
        return err
    }

    migrated := 0
    for rows.Next() {
        // Scan row
        values := make([]interface{}, len(columns))
        valuePtrs := make([]interface{}, len(columns))
        for i := range values {
            valuePtrs[i] = &values[i]
        }
        if err := rows.Scan(valuePtrs...); err != nil {
            return err
        }

        // Build property map
        props := make(map[string]interface{})
        for i, col := range columns {
            if values[i] != nil {
                props[col] = values[i]
            }
        }

        // Insert into Geode
        _, err = tx.ExecContext(ctx,
            fmt.Sprintf("CREATE (n:%s $props)", label),
            props,
        )
        if err != nil {
            tx.Rollback()
            return err
        }

        migrated++
        if migrated%1000 == 0 {
            log.Printf("Migrated %d/%d rows", migrated, count)
        }
    }

    if err := tx.Commit(); err != nil {
        return err
    }

    log.Printf("Completed: %d rows migrated", migrated)
    return nil
}

func main() {
    etl, err := NewETL(
        "postgres://user:pass@localhost/db?sslmode=disable",
        "localhost:3141",
    )
    if err != nil {
        log.Fatal(err)
    }

    ctx := context.Background()

    // Migrate tables
    tables := map[string]string{
        "customers":  "Customer",
        "products":   "Product",
        "categories": "Category",
        "orders":     "Order",
    }

    for table, label := range tables {
        if err := etl.MigrateTable(ctx, table, label); err != nil {
            log.Fatalf("Failed to migrate %s: %v", table, err)
        }
    }

    log.Println("Migration complete!")
}
```

## Incremental Migration

### Change Data Capture (CDC) Setup

Use PostgreSQL logical replication to capture changes:

```sql
-- Enable logical replication in postgresql.conf
-- wal_level = logical

-- Create replication slot
SELECT pg_create_logical_replication_slot('geode_slot', 'pgoutput');

-- Create publication
CREATE PUBLICATION geode_pub FOR TABLE customers, products, orders;
```

### CDC Consumer

```python
import asyncio
import psycopg
from psycopg import sql
from geode_client import Client

class CDCConsumer:
    def __init__(self, pg_config, geode_config):
        self.pg_config = pg_config
        self.geode_config = geode_config
        self.geode_client = None

    async def connect(self):
        self.geode_client = Client(**self.geode_config)

    async def process_change(self, change):
        """Process a single CDC change event."""
        async with self.geode_client.connection() as conn:
            table = change['table']
            operation = change['operation']
            data = change['data']

            # Map table to label
            label = table.title().rstrip('s')  # customers -> Customer

            if operation == 'INSERT':
                await conn.execute(
                    f"CREATE (n:{label} $props)",
                    {"props": data}
                )

            elif operation == 'UPDATE':
                set_clause = ', '.join(f"n.{k} = ${k}" for k in data.keys())
                await conn.execute(
                    f"MATCH (n:{label} {{id: $id}}) SET {set_clause}",
                    data
                )

            elif operation == 'DELETE':
                await conn.execute(
                    f"MATCH (n:{label} {{id: $id}}) DELETE n",
                    {"id": data['id']}
                )

    async def start_replication(self):
        """Start consuming CDC events."""
        await self.connect()

        conn = await psycopg.AsyncConnection.connect(
            **self.pg_config,
            autocommit=True
        )

        async with conn.cursor() as cur:
            # Start replication
            await cur.execute(
                "SELECT * FROM pg_logical_slot_get_changes('geode_slot', NULL, NULL)"
            )

            async for row in cur:
                change = self.parse_change(row)
                await self.process_change(change)

    def parse_change(self, row):
        """Parse PostgreSQL logical replication message."""
        # Implementation depends on output plugin format
        pass

# Run CDC consumer
async def main():
    consumer = CDCConsumer(
        pg_config={"host": "localhost", "user": "postgres", "dbname": "ecommerce"},
        geode_config={"host": "localhost", "port": 3141, "skip_verify": True}
    )
    await consumer.start_replication()

asyncio.run(main())
```

### Dual-Write Pattern

During migration, write to both databases:

```python
class DualWriteRepository:
    def __init__(self, pg_conn, geode_client):
        self.pg = pg_conn
        self.geode = geode_client

    async def create_customer(self, name, email, age):
        """Write to both PostgreSQL and Geode."""
        # Write to PostgreSQL (primary)
        async with self.pg.cursor() as cur:
            await cur.execute(
                "INSERT INTO customers (name, email, age) VALUES (%s, %s, %s) RETURNING id",
                (name, email, age)
            )
            customer_id = (await cur.fetchone())[0]

        # Write to Geode (secondary)
        try:
            async with self.geode.connection() as conn:
                await conn.execute(
                    "CREATE (:Customer {id: $id, name: $name, email: $email, age: $age})",
                    {"id": customer_id, "name": name, "email": email, "age": age}
                )
        except Exception as e:
            # Log error but don't fail - PostgreSQL is source of truth
            logging.error(f"Failed to write to Geode: {e}")

        return customer_id

    async def query_customer_network(self, customer_id, depth=3):
        """Query from Geode for graph traversals."""
        async with self.geode.connection() as conn:
            page, _ = await conn.query(f"""
                MATCH (c:Customer {{id: $id}})-[:KNOWS*1..{depth}]->(friend)
                RETURN DISTINCT friend
            """, {"id": customer_id})
            return page.rows
```

## Hybrid Operation Period

### Query Routing

Route queries to the appropriate database:

```python
class QueryRouter:
    def __init__(self, pg_conn, geode_client):
        self.pg = pg_conn
        self.geode = geode_client

        # Define which queries go where
        self.graph_patterns = [
            'KNOWS', 'FRIENDS', 'FOLLOWS',  # Social relationships
            'PURCHASED', 'VIEWED',           # Customer behavior
            'REPORTS_TO', 'MANAGES',         # Hierarchies
        ]

    def should_use_graph(self, query):
        """Determine if query should go to graph database."""
        query_upper = query.upper()

        # Check for relationship patterns
        for pattern in self.graph_patterns:
            if f':{pattern}' in query_upper or f'-[:{pattern}' in query_upper:
                return True

        # Check for path queries
        if '*' in query and ('-[' in query or '->' in query):
            return True

        return False

    async def execute(self, query, params=None):
        """Route and execute query."""
        if self.should_use_graph(query):
            async with self.geode.connection() as conn:
                return await conn.query(query, params or {})
        else:
            # Translate to SQL if needed
            sql_query = self.translate_to_sql(query)
            async with self.pg.cursor() as cur:
                await cur.execute(sql_query, params)
                return await cur.fetchall()
```

### Data Consistency Checks

```python
async def verify_data_consistency(pg_conn, geode_client):
    """Verify data is consistent between PostgreSQL and Geode."""
    discrepancies = []

    # Check node counts
    tables_labels = [
        ('customers', 'Customer'),
        ('products', 'Product'),
        ('orders', 'Order'),
    ]

    for table, label in tables_labels:
        # PostgreSQL count
        async with pg_conn.cursor() as cur:
            await cur.execute(f"SELECT COUNT(*) FROM {table}")
            pg_count = (await cur.fetchone())[0]

        # Geode count
        async with geode_client.connection() as conn:
            page, _ = await conn.query(f"MATCH (n:{label}) RETURN count(n)")
            geode_count = page.rows[0]['count(n)'].as_int

        if pg_count != geode_count:
            discrepancies.append({
                'type': 'count_mismatch',
                'entity': label,
                'postgresql': pg_count,
                'geode': geode_count
            })

    # Sample data verification
    async with pg_conn.cursor() as cur:
        await cur.execute("SELECT id, name, email FROM customers ORDER BY RANDOM() LIMIT 100")
        samples = await cur.fetchall()

    async with geode_client.connection() as conn:
        for pg_id, pg_name, pg_email in samples:
            page, _ = await conn.query(
                "MATCH (c:Customer {id: $id}) RETURN c.name, c.email",
                {"id": pg_id}
            )
            if not page.rows:
                discrepancies.append({
                    'type': 'missing_node',
                    'entity': 'Customer',
                    'id': pg_id
                })
            else:
                row = page.rows[0]
                if row['c.name'].as_string != pg_name or row['c.email'].as_string != pg_email:
                    discrepancies.append({
                        'type': 'data_mismatch',
                        'entity': 'Customer',
                        'id': pg_id,
                        'postgresql': {'name': pg_name, 'email': pg_email},
                        'geode': {'name': row['c.name'].as_string, 'email': row['c.email'].as_string}
                    })

    return discrepancies
```

## Migration Validation

### Comprehensive Validation Script

```python
async def run_migration_validation(pg_conn, geode_client):
    """Run comprehensive migration validation."""
    print("=" * 60)
    print("MIGRATION VALIDATION REPORT")
    print("=" * 60)

    # 1. Count validation
    print("\n1. NODE COUNT VALIDATION")
    print("-" * 40)

    entities = [
        ('customers', 'Customer'),
        ('products', 'Product'),
        ('categories', 'Category'),
        ('orders', 'Order'),
    ]

    all_counts_match = True
    for table, label in entities:
        async with pg_conn.cursor() as cur:
            await cur.execute(f"SELECT COUNT(*) FROM {table}")
            pg_count = (await cur.fetchone())[0]

        async with geode_client.connection() as conn:
            page, _ = await conn.query(f"MATCH (n:{label}) RETURN count(n) AS c")
            geode_count = page.rows[0]['c'].as_int

        status = "PASS" if pg_count == geode_count else "FAIL"
        if status == "FAIL":
            all_counts_match = False
        print(f"  {label}: PG={pg_count}, Geode={geode_count} [{status}]")

    # 2. Relationship count validation
    print("\n2. RELATIONSHIP COUNT VALIDATION")
    print("-" * 40)

    relationships = [
        ("SELECT COUNT(*) FROM order_items", "MATCH ()-[r:CONTAINS]->() RETURN count(r)"),
        ("SELECT COUNT(*) FROM reviews", "MATCH ()-[r:REVIEWED]->() RETURN count(r)"),
        ("SELECT COUNT(*) FROM products WHERE category_id IS NOT NULL",
         "MATCH ()-[r:IN_CATEGORY]->() RETURN count(r)"),
    ]

    for pg_query, gql_query in relationships:
        async with pg_conn.cursor() as cur:
            await cur.execute(pg_query)
            pg_count = (await cur.fetchone())[0]

        async with geode_client.connection() as conn:
            page, _ = await conn.query(gql_query)
            geode_count = page.rows[0]['count(r)'].as_int

        rel_type = gql_query.split(':')[1].split(']')[0]
        status = "PASS" if pg_count == geode_count else "FAIL"
        print(f"  {rel_type}: PG={pg_count}, Geode={geode_count} [{status}]")

    # 3. Data integrity validation
    print("\n3. DATA INTEGRITY VALIDATION")
    print("-" * 40)

    # Check referential integrity
    async with geode_client.connection() as conn:
        # Orders should have customers
        page, _ = await conn.query("""
            MATCH (o:Order)
            WHERE NOT (o)<-[:PLACED]-(:Customer)
            RETURN count(o) AS orphaned
        """)
        orphaned_orders = page.rows[0]['orphaned'].as_int
        print(f"  Orphaned orders: {orphaned_orders} [{'FAIL' if orphaned_orders > 0 else 'PASS'}]")

        # Order items should have products
        page, _ = await conn.query("""
            MATCH (o:Order)-[c:CONTAINS]->()
            WHERE NOT ()-[c]->(:Product)
            RETURN count(c) AS orphaned
        """)
        orphaned_items = page.rows[0]['orphaned'].as_int
        print(f"  Orphaned order items: {orphaned_items} [{'FAIL' if orphaned_items > 0 else 'PASS'}]")

    # 4. Query equivalence validation
    print("\n4. QUERY EQUIVALENCE VALIDATION")
    print("-" * 40)

    test_queries = [
        {
            'name': 'Top customers by order count',
            'sql': """
                SELECT c.name, COUNT(o.id) as order_count
                FROM customers c
                LEFT JOIN orders o ON c.id = o.customer_id
                GROUP BY c.id, c.name
                ORDER BY order_count DESC
                LIMIT 5
            """,
            'gql': """
                MATCH (c:Customer)
                OPTIONAL MATCH (c)-[:PLACED]->(o:Order)
                RETURN c.name, count(o) AS order_count
                ORDER BY order_count DESC
                LIMIT 5
            """
        },
        {
            'name': 'Products by category',
            'sql': """
                SELECT cat.name, COUNT(p.id)
                FROM categories cat
                LEFT JOIN products p ON p.category_id = cat.id
                GROUP BY cat.id, cat.name
            """,
            'gql': """
                MATCH (cat:Category)
                OPTIONAL MATCH (p:Product)-[:IN_CATEGORY]->(cat)
                RETURN cat.name, count(p)
            """
        }
    ]

    for test in test_queries:
        async with pg_conn.cursor() as cur:
            await cur.execute(test['sql'])
            pg_results = await cur.fetchall()

        async with geode_client.connection() as conn:
            page, _ = await conn.query(test['gql'])
            geode_results = [(r[0].as_string, r[1].as_int) for r in
                            [(row.values()[0], row.values()[1]) for row in page.rows]]

        # Compare first few results
        match = len(pg_results) == len(geode_results)
        print(f"  {test['name']}: [{'PASS' if match else 'FAIL'}]")

    print("\n" + "=" * 60)
    print("VALIDATION COMPLETE")
    print("=" * 60)
```

## Common Pitfalls

### 1. Losing Referential Integrity

**Problem**: Foreign key constraints aren't automatically enforced.

**Solution**: Create application-level validation or use Geode constraints.

```gql
// Create constraints
CREATE CONSTRAINT customer_id_unique ON :Customer(id) ASSERT UNIQUE
CREATE CONSTRAINT order_customer_exists ON :Order(customer_id) ASSERT EXISTS
```

### 2. N+1 Query Pattern

**Problem**: Fetching related data with multiple queries.

**Solution**: Use graph patterns to fetch all related data at once.

```gql
// Instead of multiple queries
// Query 1: Get customer
// Query 2: Get orders
// Query 3: Get products for each order

// Use a single query
MATCH (c:Customer {id: $id})-[:PLACED]->(o:Order)-[:CONTAINS]->(p:Product)
RETURN c, o, p
```

### 3. Missing Indexes

**Problem**: Slow queries due to missing indexes.

**Solution**: Create indexes for frequently queried properties.

```gql
CREATE INDEX customer_email ON :Customer(email)
CREATE INDEX product_name ON :Product(name)
CREATE INDEX order_date ON :Order(order_date)
```

### 4. Over-normalization

**Problem**: Creating too many node types for simple values.

**Solution**: Use properties for simple values, nodes for entities.

```gql
// Bad: Over-normalized
(:Customer)-[:HAS_EMAIL]->(:Email {address: 'alice@example.com'})

// Good: Property
(:Customer {email: 'alice@example.com'})
```

### 5. Ignoring NULL Semantics

**Problem**: Different NULL handling between SQL and GQL.

**Solution**: Use COALESCE and explicit NULL checks.

```gql
MATCH (c:Customer)
WHERE c.middle_name IS NOT NULL
RETURN c.name, COALESCE(c.nickname, c.name) AS display_name
```

## Migration Checklist

### Pre-Migration
- [ ] Analyze PostgreSQL schema complexity
- [ ] Identify tables suitable for graph modeling
- [ ] Document all foreign key relationships
- [ ] Assess query patterns and performance requirements
- [ ] Plan hybrid operation period

### Schema Migration
- [ ] Design node labels and properties
- [ ] Design relationship types and properties
- [ ] Create Geode schema (indexes, constraints)
- [ ] Document schema mapping

### Data Migration
- [ ] Create ETL pipeline
- [ ] Test with sample data
- [ ] Run full data migration
- [ ] Validate row/node counts
- [ ] Validate relationship counts

### Application Migration
- [ ] Update data access layer
- [ ] Translate SQL queries to GQL
- [ ] Implement dual-write if needed
- [ ] Update connection configuration
- [ ] Test all CRUD operations

### Validation
- [ ] Run data consistency checks
- [ ] Execute query equivalence tests
- [ ] Perform load testing
- [ ] Verify backup/restore procedures

### Cutover
- [ ] Plan maintenance window
- [ ] Prepare rollback procedure
- [ ] Execute final data sync
- [ ] Switch application to Geode
- [ ] Monitor for errors
- [ ] Decommission PostgreSQL integration

## Resources

- [GQL Reference](/docs/gql-reference/)
- [Graph Modeling Guide](/guides/graph-modeling/)
- [Query Performance](/guides/query-performance/)
- [Client Libraries](/clients/)

## Getting Help

If you encounter issues during migration:

- [Documentation](https://docs.geodedb.com)
- [GitLab Issues](https://gitlab.com/devnw/codepros/geode/geode/-/issues)
- [Community Forum](https://forum.geodedb.com)
- [Email Support](mailto:support@geodedb.com)
