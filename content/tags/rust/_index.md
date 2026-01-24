---
title: "Rust Client Library - Zero-Cost Graph Database Abstractions"
description: "High-performance Geode Rust client achieving 10,000+ queries/second with zero-cost abstractions, compile-time type safety, tokio/async-std integration, Quinn QUIC protocol, serde serialization, and connection pooling for Rust applications."
keywords:
  - Rust client
  - tokio
  - async Rust
  - Quinn QUIC
  - zero-cost abstractions
  - compile-time safety
  - Rust graph database
  - serde serialization
  - type-safe queries
  - async-std
  - futures
  - connection pooling
  - Rust 1.70
  - QUIC protocol
  - high performance
  - Geode database
  - graph queries
  - cargo
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/rust/"
    noindex: false
---

# Rust Client Library

The Geode Rust client delivers industry-leading performance with zero-cost abstractions, achieving 10,000+ queries per second while maintaining compile-time type safety. Built on Quinn for native QUIC protocol support and integrated with tokio for async runtime management, the client provides optimal performance for Rust applications requiring graph database capabilities. Comprehensive serde integration ensures seamless serialization/deserialization with compile-time guarantees.

## Why Choose the Rust Client?

**Zero-Cost Abstractions**: High-level APIs compiled down to optimal machine code with no runtime overhead. Type-safe query builders and result parsing achieve performance equivalent to hand-optimized code.

**Compile-Time Safety**: Leverage Rust's ownership system and type checker to catch errors at compile time. Generic query execution with serde deserialization ensures result types match expectations before runtime.

**Native Async Support**: First-class tokio and async-std integration enables efficient concurrent query execution without thread overhead. Connection pooling and multiplexing maximize throughput on limited connections.

**Maximum Performance**: Benchmarked at 10,000+ queries per second with Quinn's optimized QUIC implementation. Zero-copy deserialization and streaming results minimize memory allocations.

**Production Ready**: Memory-safe by design with no undefined behavior, data races, or null pointer dereferences. Comprehensive error types and graceful degradation ensure reliability under load.

## Installation

Add to `Cargo.toml`:

```toml
[dependencies]
geode-client = "0.18"
tokio = { version = "1", features = ["full"] }
```

Requirements: Rust 1.70+

## Quick Start

```rust
use geode_client::{Client, Error};
use tokio;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let client = Client::connect("localhost:3141").await?;

    let results = client.execute(
        "MATCH (p:Person)-[:KNOWS]->(friend:Person)
         WHERE p.name = $name
         RETURN friend.name, friend.age",
        &[("name", "Alice")]
    ).await?;

    for row in results {
        let name: String = row.get("friend.name")?;
        let age: i64 = row.get("friend.age")?;
        println!("{} is {} years old", name, age);
    }

    Ok(())
}
```

## Key Features

### Zero-Cost Abstractions

Compile-time optimization with no runtime overhead:

```rust
// Type-safe query execution
let results = client.execute::<User>(
    "MATCH (u:User) WHERE u.age > $min_age RETURN u",
    &[("min_age", &25i64)]
).await?;

for user in results {
    // Compiler knows exact type
    println!("{}: {}", user.name, user.age);
}
```

### Tokio Integration

Native async runtime support:

```rust
use tokio::task;

#[tokio::main]
async fn main() -> Result<(), Error> {
    let client = Client::connect("localhost:3141").await?;

    // Concurrent queries
    let (users, products, orders) = tokio::join!(
        client.execute("MATCH (u:User) RETURN COUNT(u)", &[]),
        client.execute("MATCH (p:Product) RETURN COUNT(p)", &[]),
        client.execute("MATCH (o:Order) RETURN COUNT(o)", &[])
    );

    Ok(())
}
```

### Compile-Time Type Safety

Strong typing prevents runtime errors:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
struct Person {
    id: i64,
    name: String,
    age: i64,
}

let results = client.execute::<Person>(
    "MATCH (p:Person) RETURN p.id, p.name, p.age",
    &[]
).await?;

for person in results {
    // Type-safe access
    println!("{}: {}", person.name, person.age);
}
```

### Transaction Support

Full ACID transactions:

```rust
let mut tx = client.transaction().await?;

tx.execute(
    "CREATE (p:Person {name: $name, age: $age})",
    &[("name", &"Bob"), ("age", &30i64)]
).await?;

tx.execute(
    "CREATE (p:Person {name: $name, age: $age})",
    &[("name", &"Carol"), ("age", &35i64)]
).await?;

tx.commit().await?;
```

### Connection Pooling

High-performance connection management:

```rust
let client = Client::builder()
    .url("localhost:3141")
    .max_connections(100)
    .connect()
    .await?;
```

### Serde Integration

Automatic serialization/deserialization:

```rust
#[derive(Deserialize)]
struct QueryResult {
    #[serde(rename = "friend.name")]
    name: String,
    #[serde(rename = "friend.age")]
    age: i64,
}

let results = client.execute::<QueryResult>(
    "MATCH (p:Person {name: $name})-[:KNOWS]->(friend) RETURN friend.name, friend.age",
    &[("name", &"Alice")]
).await?;
```

## Production Patterns

### Service Integration

```rust
use std::sync::Arc;
use geode_client::Client;

#[derive(Clone)]
struct UserService {
    client: Arc<Client>,
}

impl UserService {
    pub async fn new(url: &str) -> Result<Self, Error> {
        let client = Client::builder()
            .url(url)
            .max_connections(100)
            .connect()
            .await?;

        Ok(Self {
            client: Arc::new(client),
        })
    }

    pub async fn get_user(&self, id: i64) -> Result<Option<User>, Error> {
        let mut results = self.client.execute::<User>(
            "MATCH (u:User {id: $id}) RETURN u.id, u.name, u.email",
            &[("id", &id)]
        ).await?;

        Ok(results.into_iter().next())
    }

    pub async fn create_user(&self, name: &str, email: &str) -> Result<User, Error> {
        let mut results = self.client.execute::<User>(
            "CREATE (u:User {name: $name, email: $email}) RETURN u.id, u.name, u.email",
            &[("name", &name), ("email", &email)]
        ).await?;

        results.into_iter().next()
            .ok_or(Error::NoResults)
    }
}
```

### Error Handling

```rust
use geode_client::Error;

match client.execute(query, params).await {
    Ok(results) => process_results(results),
    Err(Error::SyntaxError(msg)) => {
        eprintln!("Query syntax error: {}", msg);
    }
    Err(Error::ConstraintViolation(msg)) => {
        eprintln!("Constraint violation: {}", msg);
    }
    Err(Error::ConnectionFailed(msg)) => {
        eprintln!("Connection failed: {}", msg);
    }
    Err(e) => {
        eprintln!("Unexpected error: {}", e);
    }
}
```

### Actix-Web Integration

```rust
use actix_web::{web, App, HttpServer, Result};
use std::sync::Arc;

#[actix_web::get("/users/{user_id}")]
async fn get_user(
    user_id: web::Path<i64>,
    client: web::Data<Arc<Client>>
) -> Result<web::Json<User>> {
    let mut results = client.execute::<User>(
        "MATCH (u:User {id: $id}) RETURN u",
        &[("id", &user_id.into_inner())]
    ).await
    .map_err(actix_web::error::ErrorInternalServerError)?;

    results.into_iter().next()
        .ok_or_else(|| actix_web::error::ErrorNotFound("User not found"))
        .map(web::Json)
}

#[tokio::main]
async fn main() -> std::io::Result<()> {
    let client = Arc::new(
        Client::connect("localhost:3141").await.unwrap()
    );

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(client.clone()))
            .service(get_user)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

## Advanced Features

### Generic Query Execution

Type-safe queries with automatic deserialization:

```rust
use serde::{Deserialize, Serialize};
use geode_client::{Client, Error};

#[derive(Debug, Deserialize, Serialize)]
struct UserPurchase {
    product_name: String,
    price: f64,
    purchase_date: String,
    quantity: i32,
}

async fn get_user_purchases(client: &Client, user_id: i64) -> Result<Vec<UserPurchase>, Error> {
    // Generic execution with compile-time type checking
    client.execute::<UserPurchase>(
        "MATCH (u:User {id: $user_id})-[p:PURCHASED]->(prod:Product)
         RETURN prod.name AS product_name,
                prod.price AS price,
                p.date AS purchase_date,
                p.quantity AS quantity
         ORDER BY p.date DESC",
        &[("user_id", &user_id)]
    ).await
}
```

### Connection Pool Management

High-performance connection pooling:

```rust
use geode_client::{Client, ClientBuilder, PoolConfig};
use std::time::Duration;

async fn create_pooled_client() -> Result<Client, Error> {
    ClientBuilder::new()
        .url("localhost:3141")
        .pool_config(PoolConfig {
            max_size: 100,                          // Maximum connections
            min_idle: 10,                           // Keep warm connections
            max_lifetime: Duration::from_secs(3600), // Recycle after 1 hour
            idle_timeout: Duration::from_secs(300),  // Close idle after 5 min
            connection_timeout: Duration::from_secs(10),
        })
        .connect()
        .await
}

// Pool automatically manages connections
async fn concurrent_queries(client: &Client) -> Result<(), Error> {
    use tokio::task;

    let handles: Vec<_> = (0..1000).map(|i| {
        let client = client.clone();
        task::spawn(async move {
            client.execute::<User>(
                "MATCH (u:User {id: $id}) RETURN u",
                &[("id", &i)]
            ).await
        })
    }).collect();

    // All queries execute concurrently using connection pool
    for handle in handles {
        handle.await??;
    }

    Ok(())
}
```

### Streaming Large Result Sets

Memory-efficient result streaming:

```rust
use futures::stream::StreamExt;

async fn process_all_users(client: &Client) -> Result<(), Error> {
    // Stream results without loading all into memory
    let mut stream = client.stream::<User>(
        "MATCH (u:User) RETURN u",
        &[]
    ).await?;

    while let Some(result) = stream.next().await {
        match result {
            Ok(user) => {
                process_user(&user).await?;
            }
            Err(e) => {
                eprintln!("Error processing user: {}", e);
            }
        }
    }

    Ok(())
}
```

### Transaction Management with Savepoints

```rust
use geode_client::{Transaction, Error};

async fn complex_transaction(client: &Client) -> Result<(), Error> {
    let mut tx = client.transaction().await?;

    // Initial operations
    tx.execute(
        "CREATE (u:User {name: $name, email: $email})",
        &[("name", &"Alice"), ("email", &"alice@example.com")]
    ).await?;

    // Create savepoint
    tx.savepoint("before_risky_operation").await?;

    // Potentially failing operation
    match tx.execute(
        "MATCH (u:User {email: $email}) SET u.verified = true",
        &[("email", &"alice@example.com")]
    ).await {
        Ok(_) => {
            // Success - commit everything
            tx.commit().await?;
        }
        Err(e) => {
            // Rollback to savepoint, keep initial user creation
            tx.rollback_to("before_risky_operation").await?;
            eprintln!("Verification failed: {}", e);
            tx.commit().await?;
        }
    }

    Ok(())
}
```

### Custom Type Conversions

Implement custom serde deserializers:

```rust
use serde::{Deserialize, Deserializer};
use chrono::{DateTime, Utc};

#[derive(Debug, Deserialize)]
struct Event {
    id: i64,
    name: String,
    #[serde(deserialize_with = "deserialize_timestamp")]
    created_at: DateTime<Utc>,
    #[serde(deserialize_with = "deserialize_optional_json")]
    metadata: Option<serde_json::Value>,
}

fn deserialize_timestamp<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
where
    D: Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    DateTime::parse_from_rfc3339(&s)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(serde::de::Error::custom)
}

fn deserialize_optional_json<'de, D>(deserializer: D) -> Result<Option<serde_json::Value>, D::Error>
where
    D: Deserializer<'de>,
{
    let s = Option::<String>::deserialize(deserializer)?;
    match s {
        Some(json_str) => serde_json::from_str(&json_str)
            .map(Some)
            .map_err(serde::de::Error::custom),
        None => Ok(None),
    }
}
```

## Production Patterns

### Graceful Error Handling

```rust
use geode_client::Error;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] geode_client::Error),

    #[error("User not found: {0}")]
    UserNotFound(i64),

    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

pub type Result<T> = std::result::Result<T, AppError>;

async fn get_user_with_friends(
    client: &Client,
    user_id: i64
) -> Result<(User, Vec<User>)> {
    // Fetch user
    let mut users = client.execute::<User>(
        "MATCH (u:User {id: $id}) RETURN u",
        &[("id", &user_id)]
    ).await?;

    let user = users.into_iter().next()
        .ok_or(AppError::UserNotFound(user_id))?;

    // Fetch friends
    let friends = client.execute::<User>(
        "MATCH (u:User {id: $id})-[:FRIEND]->(f:User) RETURN f",
        &[("id", &user_id)]
    ).await?;

    Ok((user, friends))
}
```

### Retry Logic with Exponential Backoff

```rust
use tokio::time::{sleep, Duration};
use geode_client::{Client, Error};

async fn execute_with_retry<T>(
    client: &Client,
    query: &str,
    params: &[(&str, &dyn geode_client::Value)],
    max_attempts: u32,
) -> Result<Vec<T>, Error>
where
    T: for<'de> serde::Deserialize<'de>,
{
    let mut attempts = 0;
    let mut delay = Duration::from_millis(100);

    loop {
        attempts += 1;

        match client.execute::<T>(query, params).await {
            Ok(results) => return Ok(results),
            Err(e) if attempts >= max_attempts => return Err(e),
            Err(e) if is_retryable(&e) => {
                eprintln!("Attempt {}/{} failed: {}, retrying...", attempts, max_attempts, e);
                sleep(delay).await;
                delay *= 2; // Exponential backoff
            }
            Err(e) => return Err(e), // Non-retryable error
        }
    }
}

fn is_retryable(error: &Error) -> bool {
    matches!(error,
        Error::ConnectionFailed(_) |
        Error::Timeout(_) |
        Error::NetworkError(_)
    )
}
```

### Rocket Framework Integration

```rust
use rocket::{State, serde::json::Json};
use geode_client::Client;
use std::sync::Arc;

#[derive(Responder)]
enum ApiResponse<T> {
    #[response(status = 200)]
    Ok(Json<T>),
    #[response(status = 404)]
    NotFound(String),
    #[response(status = 500)]
    InternalError(String),
}

#[get("/users/<user_id>")]
async fn get_user(
    user_id: i64,
    client: &State<Arc<Client>>
) -> ApiResponse<User> {
    match client.execute::<User>(
        "MATCH (u:User {id: $id}) RETURN u",
        &[("id", &user_id)]
    ).await {
        Ok(mut users) => {
            if let Some(user) = users.into_iter().next() {
                ApiResponse::Ok(Json(user))
            } else {
                ApiResponse::NotFound(format!("User {} not found", user_id))
            }
        }
        Err(e) => ApiResponse::InternalError(format!("Database error: {}", e)),
    }
}

#[post("/users", data = "<user>")]
async fn create_user(
    user: Json<CreateUserRequest>,
    client: &State<Arc<Client>>
) -> ApiResponse<User> {
    let mut tx = match client.transaction().await {
        Ok(tx) => tx,
        Err(e) => return ApiResponse::InternalError(format!("Transaction error: {}", e)),
    };

    match tx.execute::<User>(
        "CREATE (u:User {name: $name, email: $email}) RETURN u",
        &[("name", &user.name.as_str()), ("email", &user.email.as_str())]
    ).await {
        Ok(mut users) => {
            tx.commit().await.ok();
            ApiResponse::Ok(Json(users.into_iter().next().unwrap()))
        }
        Err(e) => {
            tx.rollback().await.ok();
            ApiResponse::InternalError(format!("Create failed: {}", e))
        }
    }
}

#[launch]
fn rocket() -> _ {
    let client = Arc::new(
        Client::connect("localhost:3141").await.expect("Failed to connect")
    );

    rocket::build()
        .manage(client)
        .mount("/api", routes![get_user, create_user])
}
```

### Axum Framework Integration

```rust
use axum::{
    extract::{State, Path},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use geode_client::Client;
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    client: Arc<Client>,
}

async fn get_user_handler(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
) -> Result<Json<User>, (StatusCode, String)> {
    let mut results = state.client
        .execute::<User>(
            "MATCH (u:User {id: $id}) RETURN u",
            &[("id", &user_id)]
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    results.into_iter().next()
        .map(Json)
        .ok_or((StatusCode::NOT_FOUND, "User not found".to_string()))
}

async fn create_user_handler(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), (StatusCode, String)> {
    let mut tx = state.client.transaction().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut results = tx.execute::<User>(
        "CREATE (u:User {name: $name, email: $email}) RETURN u",
        &[("name", &payload.name.as_str()), ("email", &payload.email.as_str())]
    )
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    tx.commit().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let user = results.into_iter().next()
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "No result returned".to_string()))?;

    Ok((StatusCode::CREATED, Json(user)))
}

#[tokio::main]
async fn main() {
    let client = Arc::new(
        Client::connect("localhost:3141").await.expect("Failed to connect")
    );

    let app_state = AppState { client };

    let app = Router::new()
        .route("/users/:id", get(get_user_handler))
        .route("/users", post(create_user_handler))
        .with_state(app_state);

    axum::Server::bind(&"0.0.0.0:3000".parse().unwrap())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
```

## Testing Strategies

### Unit Testing with Mock Client

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use mockall::predicate::*;
    use mockall::mock;

    mock! {
        pub Client {
            async fn execute<'a, T>(
                &self,
                query: &str,
                params: &[(&str, &dyn geode_client::Value)]
            ) -> Result<Vec<T>, Error>
            where
                T: for<'de> serde::Deserialize<'de>;
        }
    }

    #[tokio::test]
    async fn test_get_user() {
        let mut mock_client = MockClient::new();

        mock_client
            .expect_execute::<User>()
            .with(eq("MATCH (u:User {id: $id}) RETURN u"), always())
            .times(1)
            .returning(|_, _| {
                Ok(vec![User {
                    id: 123,
                    name: "Alice".to_string(),
                    email: "alice@example.com".to_string(),
                }])
            });

        let result = get_user(&mock_client, 123).await.unwrap();
        assert_eq!(result.name, "Alice");
    }
}
```

### Integration Testing with Testcontainers

```rust
#[cfg(test)]
mod integration_tests {
    use testcontainers::{clients, images::generic::GenericImage};
    use geode_client::Client;

    #[tokio::test]
    async fn test_full_crud_cycle() {
        let docker = clients::Cli::default();

        let geode = docker.run(GenericImage::new("geodedb/geode", "0.18.0")
            .with_exposed_port(3141));

        let host = geode.get_host().unwrap();
        let port = geode.get_host_port(3141).unwrap();
        let url = format!("{}:{}", host, port);

        let client = Client::connect(&url).await.unwrap();

        // Create
        let mut results = client.execute::<User>(
            "CREATE (u:User {name: $name, email: $email}) RETURN u",
            &[("name", &"Test User"), ("email", &"test@example.com")]
        ).await.unwrap();

        let user = results.into_iter().next().unwrap();
        let user_id = user.id;

        // Read
        let mut results = client.execute::<User>(
            "MATCH (u:User {id: $id}) RETURN u",
            &[("id", &user_id)]
        ).await.unwrap();
        assert_eq!(results.len(), 1);

        // Update
        client.execute::<()>(
            "MATCH (u:User {id: $id}) SET u.name = $name",
            &[("id", &user_id), ("name", &"Updated User")]
        ).await.unwrap();

        // Delete
        client.execute::<()>(
            "MATCH (u:User {id: $id}) DELETE u",
            &[("id", &user_id)]
        ).await.unwrap();
    }
}
```

## Performance Optimization

### Query Compilation and Caching

```rust
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::RwLock;

static QUERY_CACHE: Lazy<RwLock<HashMap<String, String>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));

async fn execute_cached_query<T>(
    client: &Client,
    query_key: &str,
    query: &str,
    params: &[(&str, &dyn geode_client::Value)]
) -> Result<Vec<T>, Error>
where
    T: for<'de> serde::Deserialize<'de>,
{
    // Check cache
    {
        let cache = QUERY_CACHE.read().unwrap();
        if let Some(compiled_query) = cache.get(query_key) {
            return client.execute(compiled_query, params).await;
        }
    }

    // Compile and cache
    let compiled = client.compile(query).await?;
    {
        let mut cache = QUERY_CACHE.write().unwrap();
        cache.insert(query_key.to_string(), compiled.clone());
    }

    client.execute(&compiled, params).await
}
```

### Batch Query Execution

```rust
async fn batch_insert_users(
    client: &Client,
    users: Vec<CreateUserRequest>
) -> Result<Vec<i64>, Error> {
    let mut tx = client.transaction().await?;
    let mut user_ids = Vec::with_capacity(users.len());

    // Process in batches of 100
    for chunk in users.chunks(100) {
        for user in chunk {
            let mut results = tx.execute::<User>(
                "CREATE (u:User {name: $name, email: $email}) RETURN u.id",
                &[("name", &user.name.as_str()), ("email", &user.email.as_str())]
            ).await?;

            if let Some(user) = results.into_iter().next() {
                user_ids.push(user.id);
            }
        }
    }

    tx.commit().await?;
    Ok(user_ids)
}
```

## Performance Benchmarks

**Query Throughput**: 10,000+ queries/second with connection pooling (max_connections=100)

**Latency**: p50=2ms, p95=8ms, p99=15ms for simple MATCH queries with warm connection

**Transaction Performance**: 5,000+ transactions/second with ACID guarantees

**Streaming Throughput**: Processes 50,000+ rows/second with zero-copy deserialization

**Memory Efficiency**: Constant memory usage for streaming queries regardless of result set size

**Connection Overhead**: Sub-millisecond connection acquisition from pool

## Troubleshooting

### Compilation Issues

```bash
# Ensure Rust version is 1.70+
rustc --version

# Update dependencies
cargo update

# Clean build artifacts
cargo clean && cargo build

# Check for version conflicts
cargo tree | grep geode-client
```

### Runtime Debugging

```rust
// Enable detailed logging
use tracing_subscriber;

tracing_subscriber::fmt()
    .with_max_level(tracing::Level::DEBUG)
    .init();

// Use EXPLAIN for query analysis
let plan = client.explain(
    "MATCH (u:User)-[:PURCHASED]->(p:Product) WHERE u.age > 25 RETURN p"
).await?;
println!("Query plan: {:?}", plan);
```

## Related Topics

- [Client Libraries](/tags/client-libraries/) - Overview of all Geode clients
- [SDK](/tags/sdk/) - Development kit resources
- [Performance](/tags/performance/) - Performance tuning and optimization
- [Async Programming](/tags/async/) - Asynchronous patterns with tokio
- [Type Safety](/tags/type-safety/) - Compile-time guarantees
- [Connection Pooling](/tags/connection-pooling/) - Pool configuration

## Documentation

- [Rust Client Documentation](/docs/clients/rust/) - Complete API reference
- [Installation Guide](/docs/clients/rust/installation/) - Setup with cargo
- [Tutorial](/docs/clients/rust/tutorial/) - Step-by-step learning path
- [Examples Repository](https://github.com/geodedb/rust-examples) - Production patterns
- [API Reference](https://docs.rs/geode-client) - Full crate documentation
