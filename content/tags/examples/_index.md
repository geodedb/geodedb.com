---
title: "Code Examples"
description: "Practical code examples for Geode graph database across Python, Go, Rust, and Zig. Learn through working code snippets, query patterns, and integration examples."
keywords:
  - code examples
  - Geode examples
  - GQL code samples
  - graph database examples
  - working code
  - code snippets
  - implementation examples
  - sample queries
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/examples/"
    noindex: false
---

# Code Examples

Code examples provide immediate, practical demonstrations of Geode features through working code snippets. Unlike tutorials that explain concepts step-by-step, examples show you exactly how to accomplish specific tasks with copy-paste-ready code in Python, Go, Rust, and Zig.

## Why Code Examples Matter

**Immediate Understanding**: See how a feature works in seconds rather than reading lengthy explanations. Examples answer "show me how" more effectively than prose descriptions.

**Language-Specific Patterns**: Each language has idiomatic approaches to database integration. Examples demonstrate best practices for your preferred ecosystem—async/await in Python, database/sql in Go, tokio in Rust, or manual memory management in Zig.

**Real-World Context**: Examples use realistic scenarios—user authentication, product recommendations, social graphs, fraud detection—helping you understand how features apply to actual problems.

**Executable Code**: Every example is tested and runnable. Copy the code into your project and it works, accelerating development from prototype to production.

## Example Categories

### Basic CRUD Operations

**Creating Nodes**:
```python
# Python: Create a user node
async with GeodeClient("localhost:3141") as client:
    result = await client.execute("""
        CREATE (u:User {
            id: $id,
            name: $name,
            email: $email,
            created_at: $timestamp
        })
        RETURN u
    """, id="user123", name="Alice", email="alice@example.com",
         timestamp="2025-01-24T10:00:00Z")
```

```go
// Go: Create a product node
db, _ := sql.Open("geode", "geode://localhost:3141")
result, err := db.Exec(`
    CREATE (p:Product {
        id: $id,
        name: $name,
        price: $price,
        in_stock: $stock
    })
`, sql.Named("id", "prod456"),
   sql.Named("name", "Widget"),
   sql.Named("price", 29.99),
   sql.Named("stock", true))
```

```rust
// Rust: Create a post node
let client = Client::connect("localhost:3141").await?;
client.execute(
    "CREATE (p:Post {id: $id, title: $title, content: $content})",
    params! {
        "id" => "post789",
        "title" => "Hello Graph",
        "content" => "Learning Geode is fun!"
    }
).await?;
```

**Reading Nodes**:
```python
# Python: Find user by email
result = await client.execute(
    "MATCH (u:User {email: $email}) RETURN u",
    email="alice@example.com"
)
user = await result.first()
print(f"Found user: {user['u']['name']}")
```

**Updating Properties**:
```python
# Python: Update user's last login time
await client.execute("""
    MATCH (u:User {id: $user_id})
    SET u.last_login = $timestamp
""", user_id="user123", timestamp="2025-01-24T15:30:00Z")
```

**Deleting Nodes**:
```python
# Python: Delete a product and its relationships
await client.execute("""
    MATCH (p:Product {id: $product_id})
    DETACH DELETE p
""", product_id="prod456")
```

### Relationship Examples

**Creating Relationships**:
```python
# Python: User follows another user
await client.execute("""
    MATCH (a:User {id: $follower_id})
    MATCH (b:User {id: $followee_id})
    CREATE (a)-[:FOLLOWS {since: $timestamp}]->(b)
""", follower_id="user123", followee_id="user456",
     timestamp="2025-01-24T10:00:00Z")
```

```go
// Go: User purchases product
db.Exec(`
    MATCH (u:User {id: $user_id})
    MATCH (p:Product {id: $product_id})
    CREATE (u)-[:PURCHASED {
        at: $timestamp,
        quantity: $qty,
        total: $total
    }]->(p)
`, sql.Named("user_id", "user123"),
   sql.Named("product_id", "prod456"),
   sql.Named("timestamp", time.Now()),
   sql.Named("qty", 2),
   sql.Named("total", 59.98))
```

**Querying Relationships**:
```python
# Python: Find all products a user purchased
result = await client.execute("""
    MATCH (u:User {id: $user_id})-[r:PURCHASED]->(p:Product)
    RETURN p.name, r.quantity, r.total, r.at
    ORDER BY r.at DESC
""", user_id="user123")

async for row in result:
    print(f"{row['p.name']}: {row['r.quantity']} @ ${row['r.total']}")
```

### Pattern Matching Examples

**Multi-Hop Traversals**:
```python
# Python: Friends of friends (2 degrees of separation)
result = await client.execute("""
    MATCH (me:User {id: $my_id})-[:FRIENDS*2]->(friend_of_friend)
    WHERE NOT EXISTS {
        MATCH (me)-[:FRIENDS]->(friend_of_friend)
    }
    RETURN DISTINCT friend_of_friend.name, friend_of_friend.email
    LIMIT 10
""", my_id="user123")
```

```rust
// Rust: Product recommendation via similarity
let results = client.execute(
    r#"
    MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)
          -[:SIMILAR_TO]->(rec:Product)
    WHERE NOT EXISTS {
        MATCH (u)-[:PURCHASED]->(rec)
    }
    RETURN rec.name, rec.price, COUNT(*) as relevance
    ORDER BY relevance DESC
    LIMIT 5
    "#,
    params! { "user_id" => "user123" }
).await?;
```

**Optional Patterns**:
```python
# Python: Users with optional profile pictures
result = await client.execute("""
    MATCH (u:User)
    OPTIONAL MATCH (u)-[:HAS_AVATAR]->(img:Image)
    RETURN u.name, u.email, img.url
""")

async for row in result:
    avatar = row['img.url'] if row['img.url'] else "default.png"
    print(f"{row['u.name']}: {avatar}")
```

### Transaction Examples

**Basic Transaction**:
```python
# Python: Transfer credits between users atomically
async with client.transaction() as tx:
    # Deduct from sender
    await tx.execute("""
        MATCH (sender:User {id: $sender_id})
        SET sender.credits = sender.credits - $amount
    """, sender_id="user123", amount=100)

    # Add to receiver
    await tx.execute("""
        MATCH (receiver:User {id: $receiver_id})
        SET receiver.credits = receiver.credits + $amount
    """, receiver_id="user456", amount=100)

    # Both operations succeed or both fail
```

```go
// Go: Multi-step order creation with rollback
tx, _ := db.Begin()
defer func() {
    if r := recover(); r != nil {
        tx.Rollback()
    }
}()

// Create order
tx.Exec(`CREATE (o:Order {id: $id, user_id: $user_id, total: $total})`,
    sql.Named("id", orderID),
    sql.Named("user_id", userID),
    sql.Named("total", total))

// Add order items
for _, item := range items {
    tx.Exec(`
        MATCH (o:Order {id: $order_id})
        MATCH (p:Product {id: $product_id})
        CREATE (o)-[:CONTAINS {quantity: $qty}]->(p)
    `, sql.Named("order_id", orderID),
       sql.Named("product_id", item.ProductID),
       sql.Named("qty", item.Quantity))
}

tx.Commit()
```

**Savepoints**:
```python
# Python: Complex operation with partial rollback
async with client.transaction() as tx:
    await tx.execute("CREATE (u:User {id: 'temp1', name: 'Test'})")

    savepoint = await tx.savepoint("before_optional")

    try:
        # Risky operation that might fail
        await tx.execute("CREATE (u:User {id: 'temp1'})") # Duplicate!
    except Exception:
        # Roll back to savepoint, keep first user
        await tx.rollback_to(savepoint)

    await tx.execute("CREATE (u:User {id: 'temp2', name: 'Test2'})")
    # Commits temp1 and temp2, but not the duplicate attempt
```

### Aggregation Examples

```python
# Python: Count users by country
result = await client.execute("""
    MATCH (u:User)
    RETURN u.country, COUNT(*) as user_count
    ORDER BY user_count DESC
""")
```

```go
// Go: Average order value by month
rows, _ := db.Query(`
    MATCH (o:Order)
    RETURN
        substring(o.created_at, 0, 7) as month,
        AVG(o.total) as avg_value,
        SUM(o.total) as total_revenue,
        COUNT(*) as order_count
    ORDER BY month DESC
`)
```

```rust
// Rust: Top products by revenue
let results = client.execute(
    r#"
    MATCH (o:Order)-[c:CONTAINS]->(p:Product)
    RETURN
        p.name,
        SUM(c.quantity) as units_sold,
        SUM(c.quantity * p.price) as revenue
    ORDER BY revenue DESC
    LIMIT 10
    "#,
    params! {}
).await?;
```

### Advanced Query Examples

**Subqueries**:
```python
# Python: Users who purchased all items in a category
result = await client.execute("""
    MATCH (category:Category {name: $category_name})<-[:IN_CATEGORY]-(p:Product)
    WITH category, COUNT(p) as total_products
    MATCH (u:User)
    WHERE EXISTS {
        MATCH (u)-[:PURCHASED]->(p2:Product)-[:IN_CATEGORY]->(category)
        WITH category, COUNT(DISTINCT p2) as user_purchased
        WHERE user_purchased = total_products
    }
    RETURN u.name, u.email
""", category_name="Electronics")
```

**Shortest Path**:
```python
# Python: Find shortest connection between two users
result = await client.execute("""
    MATCH path = shortestPath(
        (a:User {id: $user_a})-[:KNOWS*]-(b:User {id: $user_b})
    )
    RETURN [node IN nodes(path) | node.name] as connection_path,
           length(path) as degrees_of_separation
""", user_a="user123", user_b="user789")
```

### Client-Specific Patterns

**Python Async Patterns**:
```python
# Concurrent queries with asyncio
import asyncio

async def fetch_user_data(user_id):
    async with GeodeClient("localhost:3141") as client:
        user, posts, friends = await asyncio.gather(
            client.execute("MATCH (u:User {id: $id}) RETURN u", id=user_id),
            client.execute("MATCH (u:User {id: $id})-[:WROTE]->(p) RETURN p", id=user_id),
            client.execute("MATCH (u:User {id: $id})-[:FRIENDS]->(f) RETURN f", id=user_id)
        )
        return user, posts, friends
```

**Go Connection Pooling**:
```go
// Configure connection pool
db, _ := sql.Open("geode", "geode://localhost:3141")
db.SetMaxOpenConns(100)
db.SetMaxIdleConns(10)
db.SetConnMaxLifetime(time.Hour)

// Use connection from pool
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

row := db.QueryRowContext(ctx, "MATCH (u:User {id: $id}) RETURN u",
    sql.Named("id", "user123"))
```

**Rust Stream Processing**:
```rust
// Process large result sets efficiently
let mut stream = client.execute(
    "MATCH (u:User) WHERE u.active = true RETURN u",
    params! {}
).stream().await?;

while let Some(row) = stream.next().await {
    let user_id: String = row.get("u.id")?;
    let user_name: String = row.get("u.name")?;

    // Process each user without loading entire result set into memory
    process_user(user_id, user_name).await?;
}
```

### Error Handling Examples

```python
# Python: Retry logic for transient failures
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
async def execute_with_retry(client, query, **params):
    try:
        return await client.execute(query, **params)
    except TransactionConflictError:
        # Let retry decorator handle it
        raise
    except QueryError as e:
        # Don't retry syntax errors
        if e.is_retryable:
            raise
        else:
            logger.error(f"Non-retryable error: {e}")
            raise
```

```go
// Go: Graceful error handling
row := db.QueryRow("MATCH (u:User {id: $id}) RETURN u", sql.Named("id", userID))
var user User
err := row.Scan(&user.ID, &user.Name, &user.Email)

if err == sql.ErrNoRows {
    // User not found - expected case
    return nil, ErrUserNotFound
} else if err != nil {
    // Unexpected database error
    log.Printf("Database error: %v", err)
    return nil, err
}
```

## Related Topics

- **Tutorials**: Step-by-step learning paths with explanations
- **Guides**: Architectural patterns and design principles
- **Getting Started**: Quick examples for beginners
- **Developer Guide**: Complete API reference and documentation
