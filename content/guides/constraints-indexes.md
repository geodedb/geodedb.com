---
title: "Constraints and Indexes Guide"
description: "Create and manage constraints and indexes for data integrity and query performance in Geode"
weight: 12
tags: ["constraints", "indexes", "performance", "schema", "optimization"]
categories: ["guides", "performance"]
keywords:
  - Geode indexes
  - graph database constraints
  - unique constraints
  - property indexes
  - vector indexes
  - full-text search
  - GQL indexes
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Constraints and Indexes Guide

Constraints and indexes are essential tools for maintaining data integrity and optimizing query performance in Geode. This guide covers all constraint and index types, when to use each, and best practices for production systems.

## Overview

**Constraints** enforce data integrity rules:
- Unique constraints prevent duplicate values
- Existence constraints require properties to be present

**Indexes** improve query performance:
- B-tree indexes for range queries and ordering
- Hash indexes for exact lookups
- Composite indexes for multi-property queries
- Vector indexes for similarity search
- Full-text indexes for text search

## Constraints

### Unique Constraints

Unique constraints ensure that no two nodes with the same label have the same property value.

**Syntax**:
```gql
CREATE CONSTRAINT constraint_name ON :Label(property) ASSERT UNIQUE
```

**Examples**:
```gql
// Ensure unique email addresses
CREATE CONSTRAINT user_email_unique ON :User(email) ASSERT UNIQUE

// Ensure unique product SKUs
CREATE CONSTRAINT product_sku_unique ON :Product(sku) ASSERT UNIQUE

// Ensure unique order numbers
CREATE CONSTRAINT order_number_unique ON :Order(order_number) ASSERT UNIQUE
```

**Multi-Property Unique Constraints**:
```gql
// Composite unique constraint (tenant + username)
CREATE CONSTRAINT tenant_user_unique ON :User(tenant_id, username) ASSERT UNIQUE

// Unique within scope
CREATE CONSTRAINT org_repo_unique ON :Repository(org_id, name) ASSERT UNIQUE
```

{{< tabs >}}
{{< tab "Go" >}}
```go
// Create unique constraint
_, err := db.ExecContext(ctx, `
    CREATE CONSTRAINT user_email_unique ON :User(email) ASSERT UNIQUE
`)
if err != nil {
    log.Fatal(err)
}

// Attempt to insert duplicate (will fail)
_, err = db.ExecContext(ctx, `CREATE (:User {email: ?})`, "alice@example.com")
if err != nil {
    log.Fatal(err)
}

_, err = db.ExecContext(ctx, `CREATE (:User {email: ?})`, "alice@example.com")
if err != nil {
    // Error: constraint violation
    log.Printf("Expected error: %v", err)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async with client.connection() as conn:
    # Create unique constraint
    await conn.execute(
        "CREATE CONSTRAINT user_email_unique ON :User(email) ASSERT UNIQUE"
    )

    # Insert first user
    await conn.execute(
        "CREATE (:User {email: $email})",
        {"email": "alice@example.com"}
    )

    # Attempt duplicate (will raise exception)
    try:
        await conn.execute(
            "CREATE (:User {email: $email})",
            {"email": "alice@example.com"}
        )
    except ConstraintViolationError as e:
        print(f"Constraint violation: {e}")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
// Create unique constraint
conn.query("CREATE CONSTRAINT user_email_unique ON :User(email) ASSERT UNIQUE")
    .await?;

// Insert first user
let mut params = HashMap::new();
params.insert("email".to_string(), Value::string("alice@example.com"));
conn.query_with_params("CREATE (:User {email: $email})", &params).await?;

// Attempt duplicate (will error)
match conn.query_with_params("CREATE (:User {email: $email})", &params).await {
    Ok(_) => println!("Unexpected success"),
    Err(e) => println!("Expected constraint violation: {}", e),
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// Create unique constraint
await client.exec(
    'CREATE CONSTRAINT user_email_unique ON :User(email) ASSERT UNIQUE'
);

// Insert first user
await client.exec(
    'CREATE (:User {email: $email})',
    { params: { email: 'alice@example.com' } }
);

// Attempt duplicate (will throw)
try {
    await client.exec(
        'CREATE (:User {email: $email})',
        { params: { email: 'alice@example.com' } }
    );
} catch (error) {
    console.log('Expected constraint violation:', error.message);
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// Create unique constraint
try client.sendRunGql(1,
    "CREATE CONSTRAINT user_email_unique ON :User(email) ASSERT UNIQUE",
    null);
_ = try client.receiveMessage(30000);

// Insert first user
var params = std.json.ObjectMap.init(allocator);
defer params.deinit();
try params.put("email", .{ .string = "alice@example.com" });

try client.sendRunGql(2, "CREATE (:User {email: $email})",
    .{ .object = params });
_ = try client.receiveMessage(30000);

// Attempt duplicate (will return error in response)
try client.sendRunGql(3, "CREATE (:User {email: $email})",
    .{ .object = params });
const result = try client.receiveMessage(30000);
defer allocator.free(result);
// Check result for constraint violation error
```
{{< /tab >}}
{{< /tabs >}}

### Existence Constraints

Existence constraints ensure that nodes with a specific label always have certain properties.

**Syntax**:
```gql
CREATE CONSTRAINT constraint_name ON :Label(property) ASSERT EXISTS
```

**Examples**:
```gql
// Require email for all users
CREATE CONSTRAINT user_email_exists ON :User(email) ASSERT EXISTS

// Require name for all products
CREATE CONSTRAINT product_name_exists ON :Product(name) ASSERT EXISTS

// Require created_at timestamp
CREATE CONSTRAINT order_created_exists ON :Order(created_at) ASSERT EXISTS
```

**Multi-Property Existence**:
```gql
// Require multiple properties
CREATE CONSTRAINT user_required ON :User(email) ASSERT EXISTS
CREATE CONSTRAINT user_name_required ON :User(name) ASSERT EXISTS
```

{{< tabs >}}
{{< tab "Go" >}}
```go
// Create existence constraint
_, err := db.ExecContext(ctx, `
    CREATE CONSTRAINT user_email_exists ON :User(email) ASSERT EXISTS
`)
if err != nil {
    log.Fatal(err)
}

// This will succeed
_, err = db.ExecContext(ctx, `CREATE (:User {email: ?, name: ?})`,
    "alice@example.com", "Alice")
if err != nil {
    log.Fatal(err)
}

// This will fail (missing email)
_, err = db.ExecContext(ctx, `CREATE (:User {name: ?})`, "Bob")
if err != nil {
    log.Printf("Expected error: %v", err)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async with client.connection() as conn:
    # Create existence constraint
    await conn.execute(
        "CREATE CONSTRAINT user_email_exists ON :User(email) ASSERT EXISTS"
    )

    # This will succeed
    await conn.execute(
        "CREATE (:User {email: $email, name: $name})",
        {"email": "alice@example.com", "name": "Alice"}
    )

    # This will fail (missing email)
    try:
        await conn.execute(
            "CREATE (:User {name: $name})",
            {"name": "Bob"}
        )
    except ConstraintViolationError as e:
        print(f"Missing required property: {e}")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
// Create existence constraint
conn.query("CREATE CONSTRAINT user_email_exists ON :User(email) ASSERT EXISTS")
    .await?;

// This will succeed
let mut params = HashMap::new();
params.insert("email".to_string(), Value::string("alice@example.com"));
params.insert("name".to_string(), Value::string("Alice"));
conn.query_with_params(
    "CREATE (:User {email: $email, name: $name})",
    &params
).await?;

// This will fail (missing email)
let mut bad_params = HashMap::new();
bad_params.insert("name".to_string(), Value::string("Bob"));
match conn.query_with_params("CREATE (:User {name: $name})", &bad_params).await {
    Ok(_) => println!("Unexpected success"),
    Err(e) => println!("Expected missing property error: {}", e),
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// Create existence constraint
await client.exec(
    'CREATE CONSTRAINT user_email_exists ON :User(email) ASSERT EXISTS'
);

// This will succeed
await client.exec(
    'CREATE (:User {email: $email, name: $name})',
    { params: { email: 'alice@example.com', name: 'Alice' } }
);

// This will fail (missing email)
try {
    await client.exec(
        'CREATE (:User {name: $name})',
        { params: { name: 'Bob' } }
    );
} catch (error) {
    console.log('Missing required property:', error.message);
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// Create existence constraint
try client.sendRunGql(1,
    "CREATE CONSTRAINT user_email_exists ON :User(email) ASSERT EXISTS",
    null);
_ = try client.receiveMessage(30000);

// This will succeed
var params = std.json.ObjectMap.init(allocator);
defer params.deinit();
try params.put("email", .{ .string = "alice@example.com" });
try params.put("name", .{ .string = "Alice" });

try client.sendRunGql(2, "CREATE (:User {email: $email, name: $name})",
    .{ .object = params });
_ = try client.receiveMessage(30000);

// This will fail (missing email)
params.clearRetainingCapacity();
try params.put("name", .{ .string = "Bob" });

try client.sendRunGql(3, "CREATE (:User {name: $name})",
    .{ .object = params });
const result = try client.receiveMessage(30000);
defer allocator.free(result);
// Response will contain constraint violation error
```
{{< /tab >}}
{{< /tabs >}}

### Managing Constraints

**View Constraints**:
```gql
SHOW CONSTRAINTS
```

**Drop Constraints**:
```gql
DROP CONSTRAINT user_email_unique
DROP CONSTRAINT user_email_exists
```

**Check Constraint Details**:
```gql
SHOW CONSTRAINT user_email_unique
```

## Property Indexes

Indexes accelerate query performance by creating efficient lookup structures.

### B-Tree Indexes

B-tree indexes are the default and most versatile index type. They support:
- Exact matches
- Range queries (>, <, >=, <=)
- Prefix matching (STARTS WITH)
- Ordering (ORDER BY)

**Syntax**:
```gql
CREATE INDEX index_name ON :Label(property)
CREATE BTREE INDEX index_name ON :Label(property)
```

**Examples**:
```gql
// Simple property index
CREATE INDEX user_email ON :User(email)

// Explicit B-tree index
CREATE BTREE INDEX user_age ON :User(age)

// Index for ordering
CREATE INDEX order_date ON :Order(created_at)
```

**Query Patterns That Use B-Tree Indexes**:
```gql
// Exact match
MATCH (u:User {email: "alice@example.com"}) RETURN u

// Range query
MATCH (u:User) WHERE u.age > 25 AND u.age < 40 RETURN u

// Prefix search
MATCH (u:User) WHERE u.name STARTS WITH "Ali" RETURN u

// Ordering
MATCH (o:Order) RETURN o ORDER BY o.created_at DESC
```

### Hash Indexes

Hash indexes provide the fastest exact-match lookups but do not support range queries or ordering.

**Syntax**:
```gql
CREATE HASH INDEX index_name ON :Label(property)
```

**Examples**:
```gql
// Hash index for exact lookups
CREATE HASH INDEX user_id ON :User(id)

// Hash index for foreign key lookups
CREATE HASH INDEX order_user_id ON :Order(user_id)
```

**When to Use Hash Indexes**:
- Primary key lookups
- Foreign key relationships
- Equality-only queries
- Maximum lookup speed needed

**Query Patterns That Use Hash Indexes**:
```gql
// Exact match (fast)
MATCH (u:User {id: 12345}) RETURN u

// These will NOT use hash index:
// MATCH (u:User) WHERE u.id > 100 RETURN u  -- range query
// MATCH (u:User) RETURN u ORDER BY u.id     -- ordering
```

### Composite Indexes

Composite indexes cover multiple properties and are essential for multi-property queries.

**Syntax**:
```gql
CREATE INDEX index_name ON :Label(property1, property2, ...)
```

**Examples**:
```gql
// Composite index for multi-tenant queries
CREATE INDEX user_tenant ON :User(tenant_id, email)

// Composite index for location queries
CREATE INDEX location_idx ON :Location(country, city, zip_code)

// Composite index for time-series data
CREATE INDEX event_time ON :Event(type, timestamp)
```

**Important: Left-Prefix Rule**:

Composite indexes follow the left-prefix rule. An index on `(a, b, c)` can be used for queries on:
- `(a)`
- `(a, b)`
- `(a, b, c)`

But NOT for queries on only `(b)`, `(c)`, or `(b, c)`.

```gql
// Index: CREATE INDEX idx ON :User(tenant_id, email, status)

// Uses index (full match)
MATCH (u:User {tenant_id: 1, email: "x@y.com", status: "active"})

// Uses index (left prefix)
MATCH (u:User {tenant_id: 1, email: "x@y.com"})
MATCH (u:User {tenant_id: 1})

// Does NOT use index (skips tenant_id)
MATCH (u:User {email: "x@y.com"})
MATCH (u:User {status: "active"})
```

{{< tabs >}}
{{< tab "Go" >}}
```go
// Create composite index
_, err := db.ExecContext(ctx, `
    CREATE INDEX user_tenant_email ON :User(tenant_id, email)
`)
if err != nil {
    log.Fatal(err)
}

// Query using composite index
rows, err := db.QueryContext(ctx, `
    MATCH (u:User {tenant_id: ?, email: ?})
    RETURN u.name
`, 1, "alice@example.com")
if err != nil {
    log.Fatal(err)
}
defer rows.Close()
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async with client.connection() as conn:
    # Create composite index
    await conn.execute(
        "CREATE INDEX user_tenant_email ON :User(tenant_id, email)"
    )

    # Query using composite index
    page, _ = await conn.query(
        "MATCH (u:User {tenant_id: $tenant, email: $email}) RETURN u.name",
        {"tenant": 1, "email": "alice@example.com"}
    )
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
// Create composite index
conn.query("CREATE INDEX user_tenant_email ON :User(tenant_id, email)")
    .await?;

// Query using composite index
let mut params = HashMap::new();
params.insert("tenant".to_string(), Value::int(1));
params.insert("email".to_string(), Value::string("alice@example.com"));
let (page, _) = conn.query_with_params(
    "MATCH (u:User {tenant_id: $tenant, email: $email}) RETURN u.name",
    &params
).await?;
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// Create composite index
await client.exec('CREATE INDEX user_tenant_email ON :User(tenant_id, email)');

// Query using composite index
const rows = await client.queryAll(
    'MATCH (u:User {tenant_id: $tenant, email: $email}) RETURN u.name',
    { params: { tenant: 1, email: 'alice@example.com' } }
);
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// Create composite index
try client.sendRunGql(1,
    "CREATE INDEX user_tenant_email ON :User(tenant_id, email)",
    null);
_ = try client.receiveMessage(30000);

// Query using composite index
var params = std.json.ObjectMap.init(allocator);
defer params.deinit();
try params.put("tenant", .{ .integer = 1 });
try params.put("email", .{ .string = "alice@example.com" });

try client.sendRunGql(2,
    "MATCH (u:User {tenant_id: $tenant, email: $email}) RETURN u.name",
    .{ .object = params });
_ = try client.receiveMessage(30000);

try client.sendPull(2, 1000);
const result = try client.receiveMessage(30000);
defer allocator.free(result);
```
{{< /tab >}}
{{< /tabs >}}

## Vector Indexes

Vector indexes enable similarity search on high-dimensional vector embeddings, essential for AI/ML applications.

### Creating Vector Indexes

**Syntax**:
```gql
CREATE VECTOR INDEX index_name ON :Label(property)
OPTIONS {
  dimensions: 1536,
  similarity: "cosine"  // or "euclidean", "dot_product"
}
```

**Examples**:
```gql
// OpenAI embedding index (1536 dimensions)
CREATE VECTOR INDEX document_embedding ON :Document(embedding)
OPTIONS { dimensions: 1536, similarity: "cosine" }

// Image feature vector (512 dimensions, euclidean distance)
CREATE VECTOR INDEX image_features ON :Image(features)
OPTIONS { dimensions: 512, similarity: "euclidean" }

// Sentence embedding with dot product similarity
CREATE VECTOR INDEX sentence_embed ON :Sentence(vector)
OPTIONS { dimensions: 768, similarity: "dot_product" }
```

### Similarity Search Queries

```gql
// Find similar documents
MATCH (d:Document)
WHERE d.embedding <-> $query_vector < 0.5
RETURN d.title, d.embedding <-> $query_vector AS distance
ORDER BY distance
LIMIT 10

// K-nearest neighbors
MATCH (d:Document)
RETURN d.title
ORDER BY d.embedding <-> $query_vector
LIMIT 5

// Hybrid search: filter + similarity
MATCH (d:Document {category: "science"})
WHERE d.embedding <-> $query_vector < 0.3
RETURN d.title, d.content
LIMIT 20
```

{{< tabs >}}
{{< tab "Go" >}}
```go
// Create vector index
_, err := db.ExecContext(ctx, `
    CREATE VECTOR INDEX doc_embedding ON :Document(embedding)
    OPTIONS { dimensions: 1536, similarity: "cosine" }
`)
if err != nil {
    log.Fatal(err)
}

// Search similar documents
queryVector := generateEmbedding("search query")
rows, err := db.QueryContext(ctx, `
    MATCH (d:Document)
    WHERE d.embedding <-> ? < 0.5
    RETURN d.title, d.embedding <-> ? AS distance
    ORDER BY distance
    LIMIT 10
`, queryVector, queryVector)
if err != nil {
    log.Fatal(err)
}
defer rows.Close()

for rows.Next() {
    var title string
    var distance float64
    rows.Scan(&title, &distance)
    fmt.Printf("%s (distance: %.4f)\n", title, distance)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import numpy as np

async with client.connection() as conn:
    # Create vector index
    await conn.execute("""
        CREATE VECTOR INDEX doc_embedding ON :Document(embedding)
        OPTIONS { dimensions: 1536, similarity: "cosine" }
    """)

    # Generate query embedding (using your ML model)
    query_vector = generate_embedding("search query")

    # Search similar documents
    page, _ = await conn.query("""
        MATCH (d:Document)
        WHERE d.embedding <-> $vector < 0.5
        RETURN d.title, d.embedding <-> $vector AS distance
        ORDER BY distance
        LIMIT 10
    """, {"vector": query_vector.tolist()})

    for row in page.rows:
        print(f"{row['d.title'].as_string} (distance: {row['distance'].as_float:.4f})")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
// Create vector index
conn.query(r#"
    CREATE VECTOR INDEX doc_embedding ON :Document(embedding)
    OPTIONS { dimensions: 1536, similarity: "cosine" }
"#).await?;

// Generate query embedding
let query_vector = generate_embedding("search query");

// Search similar documents
let mut params = HashMap::new();
params.insert("vector".to_string(), Value::float_array(query_vector));
let (page, _) = conn.query_with_params(r#"
    MATCH (d:Document)
    WHERE d.embedding <-> $vector < 0.5
    RETURN d.title, d.embedding <-> $vector AS distance
    ORDER BY distance
    LIMIT 10
"#, &params).await?;

for row in &page.rows {
    let title = row.get("d.title").unwrap().as_string()?;
    let distance = row.get("distance").unwrap().as_float()?;
    println!("{} (distance: {:.4})", title, distance);
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// Create vector index
await client.exec(`
    CREATE VECTOR INDEX doc_embedding ON :Document(embedding)
    OPTIONS { dimensions: 1536, similarity: "cosine" }
`);

// Generate query embedding
const queryVector = await generateEmbedding('search query');

// Search similar documents
const rows = await client.queryAll(`
    MATCH (d:Document)
    WHERE d.embedding <-> $vector < 0.5
    RETURN d.title, d.embedding <-> $vector AS distance
    ORDER BY distance
    LIMIT 10
`, { params: { vector: queryVector } });

for (const row of rows) {
    console.log(`${row.get('d.title')?.asString} (distance: ${row.get('distance')?.asNumber.toFixed(4)})`);
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// Create vector index
try client.sendRunGql(1,
    \\CREATE VECTOR INDEX doc_embedding ON :Document(embedding)
    \\OPTIONS { dimensions: 1536, similarity: "cosine" }
, null);
_ = try client.receiveMessage(30000);

// Generate query embedding (using your ML model)
const query_vector = try generateEmbedding(allocator, "search query");
defer allocator.free(query_vector);

// Convert to JSON array
var vector_json = std.ArrayList(u8).init(allocator);
defer vector_json.deinit();
try std.json.stringify(query_vector, .{}, vector_json.writer());

var params = std.json.ObjectMap.init(allocator);
defer params.deinit();
// Parse vector JSON and add to params
const parsed = try std.json.parseFromSlice(std.json.Value, allocator, vector_json.items, .{});
defer parsed.deinit();
try params.put("vector", parsed.value);

try client.sendRunGql(2,
    \\MATCH (d:Document)
    \\WHERE d.embedding <-> $vector < 0.5
    \\RETURN d.title, d.embedding <-> $vector AS distance
    \\ORDER BY distance
    \\LIMIT 10
, .{ .object = params });
_ = try client.receiveMessage(30000);

try client.sendPull(2, 1000);
const result = try client.receiveMessage(30000);
defer allocator.free(result);
```
{{< /tab >}}
{{< /tabs >}}

### Vector Index Options

| Option | Description | Values |
|--------|-------------|--------|
| `dimensions` | Vector dimensionality | 1-4096 |
| `similarity` | Distance metric | `cosine`, `euclidean`, `dot_product` |
| `ef_construction` | Build-time accuracy | 16-512 (default: 200) |
| `m` | Max connections per node | 4-64 (default: 16) |

**Choosing Similarity Metrics**:
- **Cosine**: Best for normalized embeddings (text, semantic search)
- **Euclidean**: Best for spatial/geometric data
- **Dot Product**: Best for maximum inner product search

## Full-Text Indexes

Full-text indexes enable efficient text search with tokenization, stemming, and relevance ranking.

### Creating Full-Text Indexes

**Syntax**:
```gql
CREATE FULLTEXT INDEX index_name ON :Label(property, ...)
OPTIONS {
  analyzer: "english",      // or "standard", "simple", language codes
  min_word_length: 3
}
```

**Examples**:
```gql
// Basic full-text index
CREATE FULLTEXT INDEX article_content ON :Article(title, content)

// Multi-property full-text index with options
CREATE FULLTEXT INDEX product_search ON :Product(name, description, tags)
OPTIONS { analyzer: "english", min_word_length: 2 }

// Multi-language support
CREATE FULLTEXT INDEX doc_multilang ON :Document(content)
OPTIONS { analyzer: "standard" }
```

### Full-Text Search Queries

```gql
// Simple text search
MATCH (a:Article)
WHERE a.content CONTAINS "graph database"
RETURN a.title

// Phrase search
MATCH (a:Article)
WHERE a.content CONTAINS '"exact phrase"'
RETURN a.title

// Boolean search
MATCH (a:Article)
WHERE a.content CONTAINS "graph AND (database OR query)"
RETURN a.title

// Wildcard search
MATCH (p:Product)
WHERE p.name CONTAINS "laptop*"
RETURN p.name

// Fuzzy search
MATCH (p:Product)
WHERE p.name CONTAINS "laptob~"  // matches "laptop"
RETURN p.name

// Relevance ranking
MATCH (a:Article)
WHERE a.content CONTAINS $search_term
RETURN a.title, score(a) AS relevance
ORDER BY relevance DESC
LIMIT 20
```

{{< tabs >}}
{{< tab "Go" >}}
```go
// Create full-text index
_, err := db.ExecContext(ctx, `
    CREATE FULLTEXT INDEX article_search ON :Article(title, content)
    OPTIONS { analyzer: "english" }
`)
if err != nil {
    log.Fatal(err)
}

// Search articles
rows, err := db.QueryContext(ctx, `
    MATCH (a:Article)
    WHERE a.content CONTAINS ?
    RETURN a.title, score(a) AS relevance
    ORDER BY relevance DESC
    LIMIT 10
`, "graph database performance")
if err != nil {
    log.Fatal(err)
}
defer rows.Close()

for rows.Next() {
    var title string
    var relevance float64
    rows.Scan(&title, &relevance)
    fmt.Printf("%.2f: %s\n", relevance, title)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async with client.connection() as conn:
    # Create full-text index
    await conn.execute("""
        CREATE FULLTEXT INDEX article_search ON :Article(title, content)
        OPTIONS { analyzer: "english" }
    """)

    # Search articles
    page, _ = await conn.query("""
        MATCH (a:Article)
        WHERE a.content CONTAINS $search
        RETURN a.title, score(a) AS relevance
        ORDER BY relevance DESC
        LIMIT 10
    """, {"search": "graph database performance"})

    for row in page.rows:
        print(f"{row['relevance'].as_float:.2f}: {row['a.title'].as_string}")
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
// Create full-text index
conn.query(r#"
    CREATE FULLTEXT INDEX article_search ON :Article(title, content)
    OPTIONS { analyzer: "english" }
"#).await?;

// Search articles
let mut params = HashMap::new();
params.insert("search".to_string(), Value::string("graph database performance"));
let (page, _) = conn.query_with_params(r#"
    MATCH (a:Article)
    WHERE a.content CONTAINS $search
    RETURN a.title, score(a) AS relevance
    ORDER BY relevance DESC
    LIMIT 10
"#, &params).await?;

for row in &page.rows {
    let title = row.get("a.title").unwrap().as_string()?;
    let relevance = row.get("relevance").unwrap().as_float()?;
    println!("{:.2}: {}", relevance, title);
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
// Create full-text index
await client.exec(`
    CREATE FULLTEXT INDEX article_search ON :Article(title, content)
    OPTIONS { analyzer: "english" }
`);

// Search articles
const rows = await client.queryAll(`
    MATCH (a:Article)
    WHERE a.content CONTAINS $search
    RETURN a.title, score(a) AS relevance
    ORDER BY relevance DESC
    LIMIT 10
`, { params: { search: 'graph database performance' } });

for (const row of rows) {
    console.log(`${row.get('relevance')?.asNumber.toFixed(2)}: ${row.get('a.title')?.asString}`);
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
// Create full-text index
try client.sendRunGql(1,
    \\CREATE FULLTEXT INDEX article_search ON :Article(title, content)
    \\OPTIONS { analyzer: "english" }
, null);
_ = try client.receiveMessage(30000);

// Search articles
var params = std.json.ObjectMap.init(allocator);
defer params.deinit();
try params.put("search", .{ .string = "graph database performance" });

try client.sendRunGql(2,
    \\MATCH (a:Article)
    \\WHERE a.content CONTAINS $search
    \\RETURN a.title, score(a) AS relevance
    \\ORDER BY relevance DESC
    \\LIMIT 10
, .{ .object = params });
_ = try client.receiveMessage(30000);

try client.sendPull(2, 1000);
const result = try client.receiveMessage(30000);
defer allocator.free(result);
```
{{< /tab >}}
{{< /tabs >}}

## Choosing the Right Index Type

| Query Pattern | Best Index Type | Why |
|--------------|-----------------|-----|
| Exact match on ID | Hash | Fastest O(1) lookup |
| Exact match on multiple properties | Composite B-tree | Single index scan |
| Range queries (age > 25) | B-tree | Supports ordering |
| Prefix search (STARTS WITH) | B-tree | Ordered structure |
| Full-text search | Full-text | Tokenization, stemming |
| Similarity search (ML embeddings) | Vector | ANN algorithms |
| Ordering (ORDER BY) | B-tree | Maintains order |
| Unique enforcement | Unique constraint | Automatic index |

### Decision Flowchart

```
Is it a text search across content?
  Yes -> Full-text index
  No -> Continue

Is it similarity search on vectors?
  Yes -> Vector index
  No -> Continue

Do you need range queries or ordering?
  Yes -> B-tree index
  No -> Continue

Is it exact-match only?
  Yes -> Hash index (fastest)
  No -> B-tree index (most versatile)

Multiple properties in WHERE clause?
  Yes -> Composite index
  No -> Single-property index
```

## Performance Considerations

### Index Overhead

Every index:
- **Increases write latency**: Updates must maintain index
- **Uses disk space**: Index structures require storage
- **Uses memory**: Hot indexes are cached

**Rule of Thumb**: Only create indexes for properties you query frequently.

### Measuring Index Usage

```gql
// Check if query uses index
EXPLAIN MATCH (u:User {email: "alice@example.com"}) RETURN u

// Profile query performance
PROFILE MATCH (u:User {email: "alice@example.com"}) RETURN u
```

**Interpret EXPLAIN Output**:
```
NodeIndexSeek       <- Using index
NodeByLabelScan     <- Full label scan (slow)
AllNodesScan        <- Full database scan (very slow)
```

### Index Selectivity

**High selectivity** = Few matching rows = Good index candidate
**Low selectivity** = Many matching rows = Poor index candidate

```gql
// Good: Email is unique
CREATE INDEX user_email ON :User(email)

// Bad: Boolean has only 2 values
// CREATE INDEX user_active ON :User(is_active)  -- Don't do this

// Good for boolean: Composite index
CREATE INDEX user_active_created ON :User(is_active, created_at)
```

### Composite Index Ordering

Order properties in composite indexes by:
1. Equality predicates first
2. Then range predicates
3. Highest selectivity first

```gql
// Query: WHERE status = 'active' AND created_at > date()
// Good order: (status, created_at)
CREATE INDEX idx ON :User(status, created_at)

// Bad order: (created_at, status)
// Cannot use range + equality efficiently
```

## Managing Indexes

### View All Indexes

```gql
SHOW INDEXES
```

### View Specific Index

```gql
SHOW INDEX user_email
```

### Drop Index

```gql
DROP INDEX user_email
```

### Rebuild Index

```gql
// Useful after bulk imports
REBUILD INDEX user_email
```

### Index Statistics

```gql
// Get index cardinality and usage stats
SHOW INDEX user_email STATS
```

## Best Practices

### 1. Start with Constraints

Unique and existence constraints automatically create indexes:

```gql
// This creates an index AND enforces uniqueness
CREATE CONSTRAINT user_email_unique ON :User(email) ASSERT UNIQUE
```

### 2. Index Foreign Keys

Always index properties used for relationship lookups:

```gql
CREATE INDEX order_user_id ON :Order(user_id)
CREATE INDEX review_product_id ON :Review(product_id)
```

### 3. Monitor and Iterate

```gql
// Check slow queries
SHOW SLOW QUERIES

// Check index usage
SHOW INDEX STATS

// Drop unused indexes
DROP INDEX unused_index
```

### 4. Bulk Loading

Disable indexes during bulk imports, then rebuild:

```gql
// Before import
DROP INDEX user_email

// Perform bulk import
LOAD CSV ...

// After import
CREATE INDEX user_email ON :User(email)
```

### 5. Document Your Indexes

Maintain a schema document listing all indexes and their purposes:

```markdown
## Index Documentation

### User Indexes
- `user_email_unique`: Unique constraint + lookup by email
- `user_tenant_id`: Multi-tenant isolation
- `user_created_at`: Date range queries

### Product Indexes
- `product_sku_unique`: Unique SKU enforcement
- `product_search`: Full-text search on name/description
- `product_embedding`: Vector similarity search
```

## Conclusion

Effective use of constraints and indexes is crucial for:

- **Data Integrity**: Constraints ensure valid data
- **Query Performance**: Indexes accelerate lookups
- **Scalability**: Proper indexing enables growth

Key takeaways:
- Use constraints for data integrity rules
- Choose index types based on query patterns
- Create composite indexes for multi-property queries
- Monitor and optimize based on actual usage
- Document your schema decisions

## Resources

- [GQL Reference](/docs/gql-reference/)
- [Query Optimization Guide](/guides/query-performance/)
- [Graph Modeling Guide](/guides/graph-modeling/)
- [Performance Tuning](/docs/performance/)

---

**Questions?** Discuss indexing strategies in our [forum](https://forum.geodedb.com).
