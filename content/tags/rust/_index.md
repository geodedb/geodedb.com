---
title: "Rust Client"
description: "High-performance Geode Rust client with zero-cost abstractions, tokio integration, compile-time type safety, and serde support for Rust applications."
keywords:
  - Rust
  - Rust client
  - tokio
  - async Rust
  - Quinn
  - QUIC
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/rust/"
    noindex: false
---

# Rust Client

The Geode Rust client provides zero-cost abstractions with compile-time type safety, native tokio integration, and high performance (10,000+ queries/second). Built on Quinn for QUIC support, it delivers optimal performance for Rust applications requiring graph database capabilities.

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

## Performance: 10,000+ queries/second

## Related Topics

- [Client Libraries](/tags/client-libraries/)
- [SDK](/tags/sdk/)
- [Performance](/tags/performance/)

## Documentation

Full guide: [Rust Client Documentation](/docs/clients/rust/)
