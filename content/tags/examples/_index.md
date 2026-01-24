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

## Production Code Examples

### Full-Stack Application Integration

Complete application with Geode backend:

```python
# FastAPI application with Geode
from fastapi import FastAPI, HTTPException, Depends, Header
from geode_client import GeodeClient
from pydantic import BaseModel, EmailStr
import asyncio

app = FastAPI()

# Connection pool (reused across requests)
geode_pool = GeodeClient(
    "localhost:3141",
    pool_size=20,
    pool_timeout=30.0
)

class UserRegistration(BaseModel):
    name: str
    email: EmailStr
    password: str

@app.on_event("startup")
async def startup():
    """Initialize database connection"""
    await geode_pool.connect()

@app.on_event("shutdown")
async def shutdown():
    """Close database connection"""
    await geode_pool.close()

async def get_current_user(authorization: str = Header(...)):
    """Dependency: Extract user from JWT token"""
    token = authorization.replace("Bearer ", "")
    user_id = decode_jwt(token)
    
    result = await geode_pool.execute("""
        MATCH (u:User {id: $id})
        RETURN u
    """, {"id": user_id})
    
    if not result:
        raise HTTPException(401, "Invalid token")
    
    return result[0]['u']

@app.post("/api/register")
async def register(user: UserRegistration):
    """Register new user"""
    # Hash password
    password_hash = hash_password(user.password)
    
    try:
        result = await geode_pool.execute("""
            CREATE (u:User {
                id: randomUUID(),
                name: $name,
                email: $email,
                password_hash: $password_hash,
                created_at: datetime(),
                verified: false
            })
            RETURN u.id as user_id, u.email as email
        """, {
            "name": user.name,
            "email": user.email,
            "password_hash": password_hash
        })
        
        user_id = result[0]['user_id']
        
        # Send verification email
        await send_verification_email(user.email, user_id)
        
        return {"user_id": user_id, "message": "Registration successful"}
        
    except UniqueConstraintViolation:
        raise HTTPException(400, "Email already registered")

@app.get("/api/users/{user_id}/profile")
async def get_profile(user_id: str, current_user=Depends(get_current_user)):
    """Get user profile"""
    result = await geode_pool.execute("""
        MATCH (u:User {id: $id})
        OPTIONAL MATCH (u)-[:FRIENDS_WITH]-(friend:User)
        OPTIONAL MATCH (u)-[:POSTED]->(post:Post)
        RETURN
            u.id as id,
            u.name as name,
            u.email as email,
            u.created_at as created_at,
            COUNT(DISTINCT friend) as friend_count,
            COUNT(DISTINCT post) as post_count
    """, {"id": user_id})
    
    if not result:
        raise HTTPException(404, "User not found")
    
    return result[0]

@app.post("/api/posts")
async def create_post(
    content: str,
    current_user=Depends(get_current_user)
):
    """Create new post"""
    result = await geode_pool.execute("""
        MATCH (u:User {id: $user_id})
        CREATE (p:Post {
            id: randomUUID(),
            content: $content,
            created_at: datetime(),
            likes: 0,
            comments: 0
        })
        CREATE (u)-[:POSTED]->(p)
        RETURN p.id as post_id
    """, {
        "user_id": current_user['id'],
        "content": content
    })
    
    return {"post_id": result[0]['post_id']}

@app.get("/api/feed")
async def get_feed(
    limit: int = 20,
    offset: int = 0,
    current_user=Depends(get_current_user)
):
    """Get personalized feed"""
    result = await geode_pool.execute("""
        MATCH (me:User {id: $user_id})-[:FRIENDS_WITH]-(friend:User)-[:POSTED]->(post:Post)
        WITH post, friend
        ORDER BY post.created_at DESC
        SKIP $offset
        LIMIT $limit
        RETURN
            post.id as id,
            post.content as content,
            post.created_at as created_at,
            post.likes as likes,
            friend.id as author_id,
            friend.name as author_name
    """, {
        "user_id": current_user['id'],
        "offset": offset,
        "limit": limit
    })
    
    return {"posts": [dict(r) for r in result]}
```

### Recommendation Engine

Collaborative filtering implementation:

```python
class RecommendationEngine:
    def __init__(self, client):
        self.client = client
    
    async def get_product_recommendations(self, user_id, limit=10):
        """Generate product recommendations using collaborative filtering"""
        # Find similar users based on purchase history
        similar_users = await self.client.execute("""
            MATCH (me:User {id: $user_id})-[:PURCHASED]->(p:Product)
                <-[:PURCHASED]-(other:User)
            WHERE other.id <> $user_id
            WITH other, COUNT(p) as common_purchases, me
            ORDER BY common_purchases DESC
            LIMIT 50
            MATCH (other)-[:PURCHASED]->(rec:Product)
            WHERE NOT EXISTS {
                MATCH (me)-[:PURCHASED]->(rec)
            }
            WITH rec, COUNT(other) as score, SUM(common_purchases) as weight
            RETURN
                rec.id as product_id,
                rec.name as name,
                rec.price as price,
                score * weight as recommendation_score
            ORDER BY recommendation_score DESC
            LIMIT $limit
        """, {"user_id": user_id, "limit": limit})
        
        return similar_users
    
    async def get_content_based_recommendations(self, user_id, limit=10):
        """Content-based recommendations using product attributes"""
        recommendations = await self.client.execute("""
            MATCH (u:User {id: $user_id})-[:PURCHASED]->(liked:Product)
            WITH u, COLLECT(liked.category) as liked_categories,
                 AVG(liked.price) as avg_price
            MATCH (rec:Product)
            WHERE rec.category IN liked_categories
              AND NOT EXISTS { MATCH (u)-[:PURCHASED]->(rec) }
              AND rec.price BETWEEN avg_price * 0.7 AND avg_price * 1.3
            WITH rec, SIZE([cat IN rec.tags WHERE cat IN liked_categories]) as tag_match
            RETURN
                rec.id as product_id,
                rec.name as name,
                rec.price as price,
                tag_match as relevance_score
            ORDER BY relevance_score DESC
            LIMIT $limit
        """, {"user_id": user_id, "limit": limit})
        
        return recommendations
```

### Social Network Analytics

Graph analytics for social features:

```python
class SocialAnalytics:
    def __init__(self, client):
        self.client = client
    
    async def calculate_user_influence(self, user_id):
        """Calculate user influence score"""
        metrics = await self.client.execute("""
            MATCH (u:User {id: $user_id})
            OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower:User)
            WITH u, COUNT(DISTINCT follower) as followers
            OPTIONAL MATCH (u)-[:POSTED]->(post:Post)<-[:LIKED]-(liker:User)
            WITH u, followers, COUNT(DISTINCT liker) as total_likes
            OPTIONAL MATCH (u)-[:POSTED]->(post:Post)
            WITH u, followers, total_likes, COUNT(DISTINCT post) as posts
            RETURN
                followers,
                total_likes,
                posts,
                (followers * 2.0 + total_likes * 0.5 + posts * 1.0) as influence_score
        """, {"user_id": user_id})
        
        return metrics[0] if metrics else None
    
    async def detect_communities(self):
        """Detect communities using label propagation"""
        # Initialize communities
        await self.client.execute("""
            MATCH (u:User)
            SET u.community = u.id
        """)
        
        # Iterate label propagation
        for iteration in range(10):
            changes = await self.client.execute("""
                MATCH (u:User)-[:FRIENDS_WITH]-(neighbor:User)
                WITH u, neighbor.community as label, COUNT(*) as freq
                ORDER BY u, freq DESC
                WITH u, COLLECT(label)[0] as most_common
                WHERE u.community <> most_common
                SET u.community = most_common
                RETURN COUNT(u) as changes
            """)
            
            if changes[0]['changes'] == 0:
                break
        
        # Return communities
        communities = await self.client.execute("""
            MATCH (u:User)
            RETURN u.community as community_id, COUNT(u) as size
            ORDER BY size DESC
        """)
        
        return communities
    
    async def find_influencers(self, limit=20):
        """Find top influencers"""
        influencers = await self.client.execute("""
            MATCH (u:User)
            OPTIONAL MATCH (u)<-[:FOLLOWS]-(follower:User)
            WITH u, COUNT(DISTINCT follower) as followers
            OPTIONAL MATCH (u)-[:POSTED]->(p:Post)
            WITH u, followers, AVG(p.likes) as avg_likes
            WHERE followers > 100
            RETURN
                u.id as user_id,
                u.name as name,
                followers,
                avg_likes,
                (followers + avg_likes * 10) as influence_score
            ORDER BY influence_score DESC
            LIMIT $limit
        """, {"limit": limit})
        
        return influencers
```

### E-Commerce Transaction Processing

Complete order processing example:

```python
class OrderProcessor:
    def __init__(self, client):
        self.client = client
    
    async def process_order(self, customer_id, items):
        """Process order with inventory check"""
        async with self.client.transaction(isolation='SERIALIZABLE') as tx:
            # Create order
            order_result = await tx.execute("""
                MATCH (c:Customer {id: $customer_id})
                CREATE (o:Order {
                    id: randomUUID(),
                    status: 'pending',
                    created_at: datetime(),
                    subtotal: 0.0,
                    tax: 0.0,
                    total: 0.0
                })
                CREATE (c)-[:PLACED]->(o)
                RETURN o.id as order_id
            """, {"customer_id": customer_id})
            
            order_id = order_result[0]['order_id']
            subtotal = 0.0
            
            # Process each item
            for item in items:
                # Check and reserve inventory
                inventory = await tx.execute("""
                    MATCH (p:Product {id: $product_id})
                    WHERE p.stock >= $quantity
                    SET p.stock = p.stock - $quantity
                    RETURN p.id, p.name, p.price
                """, {
                    "product_id": item['product_id'],
                    "quantity": item['quantity']
                })
                
                if not inventory:
                    raise InsufficientInventoryError(f"Product {item['product_id']} out of stock")
                
                product = inventory[0]
                line_total = product['price'] * item['quantity']
                subtotal += line_total
                
                # Create order line item
                await tx.execute("""
                    MATCH (o:Order {id: $order_id}), (p:Product {id: $product_id})
                    CREATE (li:LineItem {
                        quantity: $quantity,
                        unit_price: $unit_price,
                        total: $total
                    })
                    CREATE (o)-[:CONTAINS]->(li)
                    CREATE (li)-[:FOR_PRODUCT]->(p)
                """, {
                    "order_id": order_id,
                    "product_id": item['product_id'],
                    "quantity": item['quantity'],
                    "unit_price": product['price'],
                    "total": line_total
                })
            
            # Calculate totals
            tax = subtotal * 0.08  # 8% tax
            total = subtotal + tax
            
            # Update order totals
            await tx.execute("""
                MATCH (o:Order {id: $order_id})
                SET o.subtotal = $subtotal,
                    o.tax = $tax,
                    o.total = $total,
                    o.status = 'confirmed'
            """, {
                "order_id": order_id,
                "subtotal": subtotal,
                "tax": tax,
                "total": total
            })
            
            return {"order_id": order_id, "total": total}
```

Browse the tagged content below to discover comprehensive code examples and integration patterns for Geode applications.
