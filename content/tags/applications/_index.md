---
title: "Application Development"
description: "Learn how to build applications with Geode graph database. Discover development patterns, architecture best practices, integration strategies, and application design for graph-powered systems."
keywords:
  - application development
  - software architecture
  - graph applications
  - Geode
  - graph database
  - application patterns
  - integration strategies
  - microservices
  - API design
  - development best practices
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/applications/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Building applications with Geode enables developers to leverage graph database capabilities for modeling complex relationships, traversing networks efficiently, and discovering patterns in connected data. This guide explores application development patterns, architecture strategies, and best practices for graph-powered systems.

## Application Architecture Patterns

### Layered Architecture

Structure applications with clear separation of concerns.

**Architecture Layers:**
```
Presentation Layer (API, UI)
        ↓
Business Logic Layer (Services, Domain Logic)
        ↓
Data Access Layer (Repository Pattern)
        ↓
Geode Graph Database
```

**Example (Go):**
```go
// Data Access Layer
type UserRepository struct {
    db *sql.DB
}

func (r *UserRepository) FindByEmail(email string) (*User, error) {
    rows, err := r.db.Query(`
        MATCH (u:User {email: ?})
        RETURN u.id, u.name, u.email, u.created_at
    `, email)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var user User
    if rows.Next() {
        err = rows.Scan(&user.ID, &user.Name, &user.Email, &user.CreatedAt)
        return &user, err
    }
    return nil, ErrNotFound
}

// Business Logic Layer
type UserService struct {
    repo *UserRepository
}

func (s *UserService) GetUserNetwork(email string) (*UserNetwork, error) {
    user, err := s.repo.FindByEmail(email)
    if err != nil {
        return nil, err
    }

    friends, err := s.repo.FindFriends(user.ID)
    if err != nil {
        return nil, err
    }

    return &UserNetwork{User: user, Friends: friends}, nil
}

// Presentation Layer (HTTP API)
func (h *UserHandler) GetUserNetwork(w http.ResponseWriter, r *http.Request) {
    email := r.URL.Query().Get("email")

    network, err := h.userService.GetUserNetwork(email)
    if err != nil {
        http.Error(w, err.Error(), http.StatusNotFound)
        return
    }

    json.NewEncoder(w).Encode(network)
}
```

### Microservices Architecture

Use Geode as a specialized datastore within microservices.

**Service Boundaries:**
```
User Service → Geode (User profiles, relationships)
Product Service → Geode (Product catalog, categories)
Order Service → PostgreSQL (Transactional data)
Recommendation Service → Geode (Collaborative filtering)
```

**Inter-Service Communication:**
```python
# Recommendation Service
class RecommendationService:
    def __init__(self, geode_client, user_service_client):
        self.geode = geode_client
        self.user_service = user_service_client

    async def get_recommendations(self, user_id):
        # Fetch user preferences from User Service
        preferences = await self.user_service.get_preferences(user_id)

        # Query Geode for recommendations
        result, _ = await self.geode.query("""
            MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)
                  <-[:PURCHASED]-(similar:User)
                  -[:PURCHASED]->(rec:Product)
            WHERE NOT (u)-[:PURCHASED]->(rec)
              AND rec.category IN $preferred_categories
            RETURN rec.id, rec.name, count(similar) as score
            ORDER BY score DESC
            LIMIT 10
        """, {
            "user_id": user_id,
            "preferred_categories": preferences["categories"]
        })

        return result.rows
```

### CQRS Pattern

Separate read and write models for optimal performance.

**Command (Write) Model:**
```rust
use geode_client::{Client, Value};
use std::collections::HashMap;

pub struct WriteModel {
    client: Client,
}

impl WriteModel {
    pub async fn create_user(&self, user: NewUser) -> Result<UserId> {
        let mut conn = self.client.connect().await?;
        let mut params = HashMap::new();
        params.insert("id".to_string(), Value::int(user.id as i64));
        params.insert("name".to_string(), Value::string(user.name));
        params.insert("email".to_string(), Value::string(user.email));

        let (page, _) = conn
            .query_with_params(
                r#"
                CREATE (u:User {
                    id: $id,
                    name: $name,
                    email: $email,
                    created_at: current_timestamp()
                })
                RETURN u.id
            "#,
                &params,
            )
            .await?;

        let id = page.rows[0].get("u.id").unwrap().as_int()? as UserId;
        Ok(id)
    }

    pub async fn add_friendship(&self, user_id: UserId, friend_id: UserId) -> Result<()> {
        let mut conn = self.client.connect().await?;
        conn.begin().await?;
        let mut params = HashMap::new();
        params.insert("user_id".to_string(), Value::int(user_id as i64));
        params.insert("friend_id".to_string(), Value::int(friend_id as i64));
        let _ = conn
            .query_with_params(
                r#"
                MATCH (u:User {id: $user_id}), (f:User {id: $friend_id})
                CREATE (u)-[:FRIENDS_WITH {since: current_timestamp()}]->(f)
                CREATE (f)-[:FRIENDS_WITH {since: current_timestamp()}]->(u)
            "#,
                &params,
            )
            .await?;
        conn.commit().await?;

        Ok(())
    }
}
```

**Query (Read) Model:**
```rust
use geode_client::{Client, Value};
use std::collections::HashMap;

pub struct ReadModel {
    client: Client,
}

impl ReadModel {
    pub async fn get_user_network(&self, user_id: UserId) -> Result<UserNetwork> {
        let mut conn = self.client.connect().await?;
        let mut params = HashMap::new();
        params.insert("user_id".to_string(), Value::int(user_id as i64));
        let (page, _) = conn
            .query_with_params(
                r#"
                MATCH (u:User {id: $user_id})
                OPTIONAL MATCH (u)-[:FRIENDS_WITH]->(f:User)
                RETURN u, collect(f) as friends
            "#,
                &params,
            )
            .await?;

        Ok(UserNetwork::from_rows(&page.rows))
    }

    pub async fn get_friend_suggestions(&self, user_id: UserId, limit: usize) -> Result<Vec<User>> {
        let mut conn = self.client.connect().await?;
        let mut params = HashMap::new();
        params.insert("user_id".to_string(), Value::int(user_id as i64));
        params.insert("limit".to_string(), Value::int(limit as i64));
        let (page, _) = conn
            .query_with_params(
                r#"
                MATCH (u:User {id: $user_id})-[:FRIENDS_WITH]->(f:User)
                      -[:FRIENDS_WITH]->(fof:User)
                WHERE NOT (u)-[:FRIENDS_WITH]->(fof) AND u <> fof
                RETURN fof, count(f) as mutual_friends
                ORDER BY mutual_friends DESC
                LIMIT $limit
            "#,
                &params,
            )
            .await?;

        Ok(page.rows.iter().map(User::from_row).collect())
    }
}
```

## API Design

### RESTful APIs

Design REST APIs leveraging graph relationships.

**Resource Endpoints:**
```
GET    /users/:id                    # Get user
POST   /users                        # Create user
GET    /users/:id/friends            # Get user's friends
POST   /users/:id/friends/:friend_id # Add friendship
DELETE /users/:id/friends/:friend_id # Remove friendship
GET    /users/:id/recommendations    # Get recommendations
```

**Implementation (Python/FastAPI):**
```python
from fastapi import FastAPI, HTTPException
from geode_client import Client

app = FastAPI()
geode = Client(host="localhost", port=3141)

@app.get("/users/{user_id}")
async def get_user(user_id: str):
    async with geode.connection() as conn:
        result, _ = await conn.query(
            "MATCH (u:User {id: $id}) RETURN u",
            {"id": user_id},
        )

        if not result.rows:
            raise HTTPException(status_code=404, detail="User not found")

        return result.rows[0]["u"].raw_value

@app.get("/users/{user_id}/friends")
async def get_friends(user_id: str):
    async with geode.connection() as conn:
        result, _ = await conn.query(
            """
            MATCH (u:User {id: $id})-[:FRIENDS_WITH]->(f:User)
            RETURN f.id AS id, f.name AS name, f.email AS email
            """,
            {"id": user_id},
        )

        return [
            {
                "id": row["id"].raw_value,
                "name": row["name"].raw_value,
                "email": row["email"].raw_value,
            }
            for row in result.rows
        ]

@app.post("/users/{user_id}/friends/{friend_id}")
async def add_friend(user_id: str, friend_id: str):
    async with geode.connection() as conn:
        await conn.begin()
        try:
            # Verify both users exist
            result, _ = await conn.query(
                """
                MATCH (u:User {id: $user_id})
                MATCH (f:User {id: $friend_id})
                RETURN u, f
                """,
                {"user_id": user_id, "friend_id": friend_id},
            )

            if not result.rows:
                raise HTTPException(status_code=404, detail="User not found")

            # Create bidirectional friendship
            await conn.execute(
                """
                MATCH (u:User {id: $user_id}), (f:User {id: $friend_id})
                CREATE (u)-[:FRIENDS_WITH {since: current_timestamp()}]->(f)
                CREATE (f)-[:FRIENDS_WITH {since: current_timestamp()}]->(u)
                """,
                {"user_id": user_id, "friend_id": friend_id},
            )

            await conn.commit()
        except Exception:
            await conn.rollback()
            raise

    return {"status": "success"}
```

### GraphQL APIs

GraphQL naturally maps to graph databases.

**Schema Definition:**
```graphql
type User {
  id: ID!
  name: String!
  email: String!
  friends: [User!]!
  friendCount: Int!
  recommendations: [Product!]!
}

type Product {
  id: ID!
  name: String!
  price: Float!
  category: String!
}

type Query {
  user(id: ID!): User
  users(limit: Int = 10): [User!]!
  product(id: ID!): Product
  products(category: String): [Product!]!
}

type Mutation {
  createUser(name: String!, email: String!): User!
  addFriend(userId: ID!, friendId: ID!): Boolean!
  purchaseProduct(userId: ID!, productId: ID!): Boolean!
}
```

**Resolver Implementation:**
```python
from ariadne import QueryType, MutationType, ObjectType

query = QueryType()
mutation = MutationType()
user_type = ObjectType("User")

@query.field("user")
async def resolve_user(_, info, id):
    async with geode.connection() as conn:
        result, _ = await conn.query(
            "MATCH (u:User {id: $id}) RETURN u",
            {"id": id},
        )
        return result.rows[0]["u"].raw_value if result.rows else None

@user_type.field("friends")
async def resolve_friends(user, info):
    async with geode.connection() as conn:
        result, _ = await conn.query(
            """
            MATCH (u:User {id: $id})-[:FRIENDS_WITH]->(f:User)
            RETURN f
            """,
            {"id": user["id"]},
        )

        return [row["f"].raw_value for row in result.rows]

@user_type.field("friendCount")
async def resolve_friend_count(user, info):
    async with geode.connection() as conn:
        result, _ = await conn.query(
            """
            MATCH (u:User {id: $id})-[:FRIENDS_WITH]->(:User)
            RETURN count(*) as count
            """,
            {"id": user["id"]},
        )

        return result.rows[0]["count"].raw_value if result.rows else 0

@user_type.field("recommendations")
async def resolve_recommendations(user, info):
    async with geode.connection() as conn:
        result, _ = await conn.query(
            """
            MATCH (u:User {id: $id})-[:PURCHASED]->(p:Product)
                  <-[:PURCHASED]-(similar:User)
                  -[:PURCHASED]->(rec:Product)
            WHERE NOT (u)-[:PURCHASED]->(rec)
            RETURN DISTINCT rec, count(similar) as score
            ORDER BY score DESC
            LIMIT 10
            """,
            {"id": user["id"]},
        )

        return [row["rec"].raw_value for row in result.rows]

@mutation.field("addFriend")
async def resolve_add_friend(_, info, userId, friendId):
    async with geode.connection() as conn:
        await conn.begin()
        try:
            await conn.execute(
                """
                MATCH (u:User {id: $user_id}), (f:User {id: $friend_id})
                CREATE (u)-[:FRIENDS_WITH]->(f)
                CREATE (f)-[:FRIENDS_WITH]->(u)
                """,
                {"user_id": userId, "friend_id": friendId},
            )
            await conn.commit()
        except Exception:
            await conn.rollback()
            raise

    return True
```

## Data Modeling

### Domain-Driven Design

Model graph schema aligned with business domains.

**Aggregate Boundaries:**
```gql
-- User Aggregate
(:User {id, name, email, created_at})
  -[:HAS_PROFILE]-> (:Profile {bio, avatar_url})
  -[:HAS_PREFERENCES]-> (:Preferences {theme, language})

-- Social Aggregate
(:User)-[:FRIENDS_WITH {since}]->(:User)
(:User)-[:FOLLOWS {since}]->(:User)
(:User)-[:BLOCKED {reason}]->(:User)

-- Content Aggregate
(:User)-[:POSTED {timestamp}]->(:Post {content, likes})
(:User)-[:LIKED {timestamp}]->(:Post)
(:User)-[:COMMENTED {text, timestamp}]->(:Post)
```

### Schema Validation

Implement schema validation in application layer.

**Example (Rust with serde):**
```rust
use geode_client::{Client, Value};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct NewUser {
    #[validate(length(min = 1, max = 100))]
    pub name: String,

    #[validate(email)]
    pub email: String,

    #[validate(length(min = 8))]
    pub password: String,
}

pub async fn create_user(client: &Client, user: NewUser) -> Result<UserId> {
    // Validate input
    user.validate()?;

    // Hash password
    let password_hash = hash_password(&user.password)?;

    // Create in Geode
    let mut conn = client.connect().await?;
    let mut params = HashMap::new();
    params.insert("id".to_string(), Value::string(Uuid::new_v4().to_string()));
    params.insert("name".to_string(), Value::string(user.name));
    params.insert("email".to_string(), Value::string(user.email));
    params.insert("password_hash".to_string(), Value::string(password_hash));
    let (page, _) = conn
        .query_with_params(
            r#"
            CREATE (u:User {
                id: $id,
                name: $name,
                email: $email,
                password_hash: $password_hash,
                created_at: current_timestamp()
            })
            RETURN u.id
        "#,
            &params,
        )
        .await?;

    Ok(page.rows[0].get("u.id").unwrap().as_string()?)
}
```

## Testing Strategies

### Unit Testing with Mocks

Mock Geode client for unit tests.

**Example (Go):**
```go
type MockGeodeClient struct {
    QueryFunc func(query string, params ...interface{}) (*sql.Rows, error)
}

func (m *MockGeodeClient) Query(query string, params ...interface{}) (*sql.Rows, error) {
    return m.QueryFunc(query, params...)
}

func TestUserService_GetUserNetwork(t *testing.T) {
    mockClient := &MockGeodeClient{
        QueryFunc: func(query string, params ...interface{}) (*sql.Rows, error) {
            // Return mock data
            return mockRows([]User{
                {ID: "user1", Name: "Alice"},
                {ID: "user2", Name: "Bob"},
            }), nil
        },
    }

    service := NewUserService(mockClient)
    network, err := service.GetUserNetwork("user1")

    assert.NoError(t, err)
    assert.Len(t, network.Friends, 2)
}
```

### Integration Testing

Test against real Geode instance.

**Example (Python with pytest):**
```python
import pytest
from geode_client import Client

@pytest.fixture
async def geode_client():
    client = Client(host="localhost", port=3141)
    yield client
    # Cleanup
    async with client.connection() as conn:
        await conn.execute("MATCH (n) DETACH DELETE n")

@pytest.mark.asyncio
async def test_create_and_find_user(geode_client):
    # Create user
    async with geode_client.connection() as conn:
        await conn.execute("""
            CREATE (:User {id: 'test1', name: 'Test User', email: 'test@example.com'})
        """)

    # Find user
    async with geode_client.connection() as conn:
        results, _ = await conn.query("""
            MATCH (u:User {email: 'test@example.com'})
            RETURN u.id, u.name
        """)

    assert len(results.rows) == 1
    assert results.rows[0]["u.name"].raw_value == "Test User"

@pytest.mark.asyncio
async def test_friend_recommendations(geode_client):
    # Setup test data
    async with geode_client.connection() as conn:
        await conn.execute("""
            CREATE (alice:User {id: 'alice', name: 'Alice'})
            CREATE (bob:User {id: 'bob', name: 'Bob'})
            CREATE (carol:User {id: 'carol', name: 'Carol'})
            CREATE (alice)-[:FRIENDS_WITH]->(bob)
            CREATE (bob)-[:FRIENDS_WITH]->(alice)
            CREATE (bob)-[:FRIENDS_WITH]->(carol)
            CREATE (carol)-[:FRIENDS_WITH]->(bob)
        """)

    # Test recommendations
    async with geode_client.connection() as conn:
        results, _ = await conn.query("""
            MATCH (u:User {id: 'alice'})-[:FRIENDS_WITH]->(f)
                  -[:FRIENDS_WITH]->(fof:User)
            WHERE NOT (u)-[:FRIENDS_WITH]->(fof) AND u <> fof
            RETURN fof.name
        """)

    assert len(results.rows) == 1
    assert results.rows[0]["fof.name"].raw_value == "Carol"
```

## Performance Optimization

### Caching Strategies

Implement caching for frequently accessed data.

**Example (Python with Redis):**
```python
import redis
import json
from functools import wraps

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def cache_result(ttl=300):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{func.__name__}:{args}:{kwargs}"

            # Check cache
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

            # Execute function
            result = await func(*args, **kwargs)

            # Store in cache
            redis_client.setex(cache_key, ttl, json.dumps(result))

            return result
        return wrapper
    return decorator

@cache_result(ttl=600)
async def get_user_network(user_id):
    async with geode.connection() as conn:
        result, _ = await conn.query("""
            MATCH (u:User {id: $id})-[:FRIENDS_WITH]->(f)
            RETURN f.id AS id, f.name AS name
        """, {"id": user_id})
    return [
        {"id": row["id"].raw_value, "name": row["name"].raw_value}
        for row in result.rows
    ]
```

### Batch Operations

Batch related operations to reduce roundtrips.

**Example:**
```python
async def create_users_batch(users):
    async with geode.connection() as conn:
        await conn.begin()
        try:
            for user in users:
                await conn.execute("""
                    CREATE (:User {id: $id, name: $name, email: $email})
                """, user)
            await conn.commit()
        except Exception:
            await conn.rollback()
            raise
```

## Deployment

### Docker Deployment

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  geode:
    image: geodedb/geode:0.1.3
    ports:
      - "3141:3141"
    volumes:
      - geode-data:/data
    environment:
      - GEODE_LOG_LEVEL=info

  app:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - geode
    environment:
      - GEODE_URL=geode://geode:3141

volumes:
  geode-data:
```

### Health Checks

Implement health checks for monitoring.

**Example:**
```python
@app.get("/health")
async def health_check():
    try:
        # Ping Geode
        async with geode.connection() as conn:
            await conn.query("RETURN 1 AS ok")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}, 503
```

Building applications with Geode combines the flexibility of graph modeling with the simplicity of standards-based GQL queries. Following these patterns and best practices ensures scalable, maintainable, and performant graph-powered applications.
