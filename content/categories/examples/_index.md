---
title: "Category: Examples"
description: "Practical code examples, sample applications, and real-world use cases demonstrating Geode graph database capabilities."
keywords:
  - examples
  - Geode
  - graph database
  - code samples
  - tutorials
  - use cases
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/examples/"
    noindex: false
---

The **Examples** category provides practical, production-ready code samples and complete applications demonstrating how to use Geode graph database effectively. From simple queries to complex distributed systems, these examples show you how to leverage Geode's capabilities in real-world scenarios.

## Introduction to Geode Examples

Learning by example is one of the most effective ways to understand new technology. Geode's example library includes everything from basic "Hello World" applications to sophisticated production systems handling millions of nodes and relationships. Each example is complete, tested, and documented with explanations of key concepts and design decisions.

All examples are maintained in the Geode repository and validated as part of the continuous integration pipeline, ensuring they remain current and functional with each release. Examples cover all supported client libraries (Go, Python, Rust, Zig) and demonstrate both basic operations and advanced features like vector search, full-text indexing, and distributed transactions.

## Getting Started Examples

### Hello World: Your First Graph

The simplest possible Geode example:

```gql
-- Create your first node
CREATE (p:Person {name: 'Alice', age: 30});

-- Query it back
MATCH (p:Person {name: 'Alice'})
RETURN p.name, p.age;
```

**Output**:
```
| name  | age |
|-------|-----|
| Alice | 30  |
```

### Basic CRUD Operations

Complete create, read, update, delete example:

```gql
-- Create nodes
CREATE (alice:Person {name: 'Alice', email: 'alice@example.com'});
CREATE (bob:Person {name: 'Bob', email: 'bob@example.com'});

-- Create relationship
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
CREATE (a)-[:KNOWS {since: 2020}]->(b);

-- Read with pattern matching
MATCH (p:Person)-[k:KNOWS]->(f:Person)
RETURN p.name, k.since, f.name;

-- Update properties
MATCH (p:Person {name: 'Alice'})
SET p.age = 31;

-- Delete relationship
MATCH (p:Person {name: 'Alice'})-[k:KNOWS]->(f)
DELETE k;

-- Delete node
MATCH (p:Person {name: 'Alice'})
DELETE p;
```

### Client Library Examples

**Go Example**:
```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"

    _ "go.codepros.org/geode/driver"
)

func main() {
    db, err := sql.Open("geode", "geode://localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Create a person
    _, err = db.ExecContext(context.Background(),
        "CREATE (p:Person {name: $1, age: $2})", "Alice", 30)
    if err != nil {
        log.Fatal(err)
    }

    // Query
    rows, err := db.QueryContext(context.Background(),
        "MATCH (p:Person {name: $1}) RETURN p.name, p.age", "Alice")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    for rows.Next() {
        var name string
        var age int
        if err := rows.Scan(&name, &age); err != nil {
            log.Fatal(err)
        }
        fmt.Printf("%s is %d years old\n", name, age)
    }
}
```

**Python Example**:
```python
import asyncio
from geode_client import GeodeClient

async def main():
    async with GeodeClient("localhost:3141") as client:
        # Create a person
        await client.execute("""
            CREATE (p:Person {name: $name, age: $age})
        """, {"name": "Alice", "age": 30})

        # Query
        result = await client.execute("""
            MATCH (p:Person {name: $name})
            RETURN p.name, p.age
        """, {"name": "Alice"})

        async for row in result:
            print(f"{row['p.name']} is {row['p.age']} years old")

asyncio.run(main())
```

**Rust Example**:
```rust
use geode_client::{GeodeClient, Value};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = GeodeClient::connect("localhost:3141").await?;

    // Create a person
    client.execute(
        "CREATE (p:Person {name: $name, age: $age})",
        vec![
            ("name", Value::String("Alice".to_string())),
            ("age", Value::Integer(30)),
        ],
    ).await?;

    // Query
    let result = client.execute(
        "MATCH (p:Person {name: $name}) RETURN p.name, p.age",
        vec![("name", Value::String("Alice".to_string()))],
    ).await?;

    for row in result {
        println!("{} is {} years old",
            row.get("p.name").unwrap(),
            row.get("p.age").unwrap());
    }

    Ok(())
}
```

## Real-World Application Examples

### Social Network

Complete social networking application example:

```gql
-- Schema setup
CREATE CONSTRAINT unique_email ON :User(email);
CREATE INDEX user_name ON :User(name);
CREATE INDEX post_timestamp ON :Post(timestamp);

-- Create users
CREATE (alice:User {
    name: 'Alice Anderson',
    email: 'alice@example.com',
    joined: datetime('2024-01-15')
});

CREATE (bob:User {
    name: 'Bob Brown',
    email: 'bob@example.com',
    joined: datetime('2024-02-20')
});

-- Create friendships
MATCH (a:User {email: 'alice@example.com'}),
      (b:User {email: 'bob@example.com'})
CREATE (a)-[:FRIENDS_WITH {since: datetime('2024-03-01')}]->(b);

-- Alice creates a post
MATCH (u:User {email: 'alice@example.com'})
CREATE (u)-[:POSTED]->(p:Post {
    content: 'Hello from Geode!',
    timestamp: datetime('2024-03-15T10:30:00'),
    likes: 0
});

-- Bob likes Alice's post
MATCH (u:User {email: 'bob@example.com'}),
      (p:Post {content: 'Hello from Geode!'})
CREATE (u)-[:LIKES]->(p)
SET p.likes = p.likes + 1;

-- Find a user's friend's posts (news feed)
MATCH (u:User {email: 'bob@example.com'})-[:FRIENDS_WITH]->(f)-[:POSTED]->(p:Post)
RETURN f.name, p.content, p.timestamp, p.likes
ORDER BY p.timestamp DESC
LIMIT 10;
```

### E-Commerce Recommendation Engine

Product recommendation example:

```gql
-- Create products
CREATE (laptop:Product {
    id: 'LAPTOP-001',
    name: 'Pro Laptop 15"',
    category: 'Electronics',
    price: 1299.99
});

CREATE (mouse:Product {
    id: 'MOUSE-001',
    name: 'Wireless Mouse',
    category: 'Electronics',
    price: 29.99
});

-- Create customers
CREATE (customer:Customer {
    id: 'CUST-123',
    name: 'Jane Doe',
    email: 'jane@example.com'
});

-- Record purchase
MATCH (c:Customer {id: 'CUST-123'}),
      (p:Product {id: 'LAPTOP-001'})
CREATE (c)-[:PURCHASED {
    date: datetime('2024-03-10'),
    quantity: 1,
    price: 1299.99
}]->(p);

-- Record view
MATCH (c:Customer {id: 'CUST-123'}),
      (p:Product {id: 'MOUSE-001'})
CREATE (c)-[:VIEWED {
    timestamp: datetime('2024-03-15T14:30:00')
}]->(p);

-- Collaborative filtering recommendation
-- Find products purchased by customers who bought similar items
MATCH (customer:Customer {id: 'CUST-123'})-[:PURCHASED]->(p:Product)
MATCH (p)<-[:PURCHASED]-(other:Customer)-[:PURCHASED]->(recommendation:Product)
WHERE NOT (customer)-[:PURCHASED]->(recommendation)
RETURN recommendation.name, recommendation.price, count(*) as score
ORDER BY score DESC
LIMIT 5;
```

### Knowledge Graph

Building a knowledge graph example:

```gql
-- Create entities
CREATE (python:Technology {
    name: 'Python',
    type: 'Programming Language',
    created: 1991
});

CREATE (django:Technology {
    name: 'Django',
    type: 'Web Framework',
    created: 2005
});

CREATE (flask:Technology {
    name: 'Flask',
    type: 'Web Framework',
    created: 2010
});

-- Create relationships
MATCH (django:Technology {name: 'Django'}),
      (python:Technology {name: 'Python'})
CREATE (django)-[:BUILT_WITH]->(python);

MATCH (flask:Technology {name: 'Flask'}),
      (python:Technology {name: 'Python'})
CREATE (flask)-[:BUILT_WITH]->(python);

-- Query: Find all frameworks built with Python
MATCH (framework:Technology {type: 'Web Framework'})-[:BUILT_WITH]->(lang:Technology {name: 'Python'})
RETURN framework.name, framework.created
ORDER BY framework.created;
```

## Advanced Feature Examples

### Vector Search Example

Semantic search with embeddings:

```gql
-- Create documents with embeddings
CREATE (doc1:Document {
    title: 'Graph Databases Introduction',
    content: 'Graph databases store data as nodes and relationships...',
    embedding: [0.1, 0.2, 0.3, ..., 0.9]  -- 384-dimensional vector
});

CREATE (doc2:Document {
    title: 'SQL vs NoSQL',
    content: 'Traditional SQL databases use tables...',
    embedding: [0.15, 0.25, 0.35, ..., 0.85]
});

-- Create vector index
CREATE VECTOR INDEX doc_embeddings ON :Document(embedding)
WITH (dimension: 384, metric: 'cosine');

-- Semantic search
MATCH (doc:Document)
WHERE vector_similarity(doc.embedding, $query_embedding) > 0.8
RETURN doc.title, doc.content, vector_similarity(doc.embedding, $query_embedding) as score
ORDER BY score DESC
LIMIT 10;
```

### Full-Text Search Example

Text search with BM25 ranking:

```gql
-- Create full-text index
CREATE FULLTEXT INDEX article_content ON :Article(title, content);

-- Insert articles
CREATE (a1:Article {
    title: 'Getting Started with Geode',
    content: 'Geode is a graph database implementing ISO GQL...',
    published: datetime('2024-01-15')
});

-- Search with BM25 ranking
MATCH (article:Article)
WHERE fulltext_search(article, 'graph database')
RETURN article.title, article.published, bm25_score(article) as relevance
ORDER BY relevance DESC;
```

### Transaction Example

Complex multi-step transaction:

```python
async def transfer_funds(client, from_account, to_account, amount):
    """Transfer money between accounts atomically"""
    async with client.transaction() as tx:
        # Debit from source
        result = await tx.execute("""
            MATCH (a:Account {id: $from_id})
            WHERE a.balance >= $amount
            SET a.balance = a.balance - $amount
            RETURN a.balance
        """, {"from_id": from_account, "amount": amount})

        if not result:
            await tx.rollback()
            raise ValueError("Insufficient funds")

        # Credit to destination
        await tx.execute("""
            MATCH (a:Account {id: $to_id})
            SET a.balance = a.balance + $amount
        """, {"to_id": to_account, "amount": amount})

        # Record transaction
        await tx.execute("""
            CREATE (t:Transaction {
                from: $from_id,
                to: $to_id,
                amount: $amount,
                timestamp: datetime()
            })
        """, {
            "from_id": from_account,
            "to_id": to_account,
            "amount": amount
        })

        await tx.commit()
```

### Graph Algorithms Example

PageRank implementation:

```gql
-- Create web page graph
CREATE (home:Page {url: 'example.com', title: 'Home'});
CREATE (about:Page {url: 'example.com/about', title: 'About'});
CREATE (blog:Page {url: 'example.com/blog', title: 'Blog'});
CREATE (contact:Page {url: 'example.com/contact', title: 'Contact'});

-- Create links
MATCH (home:Page {title: 'Home'}), (about:Page {title: 'About'})
CREATE (home)-[:LINKS_TO]->(about);

MATCH (home:Page {title: 'Home'}), (blog:Page {title: 'Blog'})
CREATE (home)-[:LINKS_TO]->(blog);

MATCH (about:Page {title: 'About'}), (contact:Page {title: 'Contact'})
CREATE (about)-[:LINKS_TO]->(contact);

MATCH (blog:Page {title: 'Blog'}), (home:Page {title: 'Home'})
CREATE (blog)-[:LINKS_TO]->(home);

-- Calculate PageRank
MATCH (p:Page)
OPTIONAL MATCH (p)<-[:LINKS_TO]-(incoming)
WITH p, count(incoming) as inbound_links
SET p.pagerank = 0.15 + 0.85 * (inbound_links / 10.0)
RETURN p.title, p.pagerank
ORDER BY p.pagerank DESC;
```

## Integration Examples

### REST API Integration

Building a REST API with Geode backend:

```python
from fastapi import FastAPI, HTTPException
from geode_client import GeodeClient
import asyncio

app = FastAPI()
client = None

@app.on_event("startup")
async def startup():
    global client
    client = GeodeClient("localhost:3141")
    await client.connect()

@app.get("/users/{user_id}")
async def get_user(user_id: str):
    result = await client.execute("""
        MATCH (u:User {id: $user_id})
        RETURN u
    """, {"user_id": user_id})

    user = await result.single()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/users/{user_id}/friends")
async def get_friends(user_id: str):
    result = await client.execute("""
        MATCH (u:User {id: $user_id})-[:FRIENDS_WITH]->(f:User)
        RETURN f.id, f.name, f.email
    """, {"user_id": user_id})

    friends = []
    async for row in result:
        friends.append({
            "id": row["f.id"],
            "name": row["f.name"],
            "email": row["f.email"]
        })
    return {"friends": friends}
```

### Event Streaming Integration

Change data capture example:

```python
async def stream_changes(client):
    """Stream database changes in real-time"""
    async with client.cdc_stream(
        labels=["User", "Post"],
        operations=["CREATE", "UPDATE", "DELETE"]
    ) as stream:
        async for change in stream:
            print(f"Operation: {change.operation}")
            print(f"Label: {change.label}")
            print(f"Data: {change.data}")

            # Push to message queue, webhook, etc.
            await publish_to_kafka(change)
```

### Machine Learning Integration

Using Geode with scikit-learn:

```python
import asyncio
import numpy as np
from sklearn.cluster import KMeans
from geode_client import GeodeClient

async def cluster_users():
    async with GeodeClient("localhost:3141") as client:
        # Fetch user features
        result = await client.execute("""
            MATCH (u:User)
            RETURN u.id, u.age, u.purchase_count, u.avg_purchase_amount
        """)

        users = []
        features = []
        async for row in result:
            users.append(row["u.id"])
            features.append([
                row["u.age"],
                row["u.purchase_count"],
                row["u.avg_purchase_amount"]
            ])

        # Cluster with k-means
        X = np.array(features)
        kmeans = KMeans(n_clusters=3, random_state=42)
        labels = kmeans.fit_predict(X)

        # Store cluster assignments back in graph
        for user_id, cluster in zip(users, labels):
            await client.execute("""
                MATCH (u:User {id: $user_id})
                SET u.cluster = $cluster
            """, {"user_id": user_id, "cluster": int(cluster)})

asyncio.run(cluster_users())
```

## Performance Examples

### Bulk Loading

Efficient data import:

```python
async def bulk_load_users(client, users):
    """Load millions of users efficiently"""
    batch_size = 5000

    for i in range(0, len(users), batch_size):
        batch = users[i:i + batch_size]

        # Use UNWIND for batch insertion
        await client.execute("""
            UNWIND $users AS user
            CREATE (u:User {
                id: user.id,
                name: user.name,
                email: user.email,
                created: datetime()
            })
        """, {"users": batch})

        print(f"Loaded {min(i + batch_size, len(users))} / {len(users)} users")
```

### Query Optimization

Comparing query strategies:

```gql
-- Inefficient: Cartesian product
MATCH (p:Person), (c:Company)
WHERE p.company_id = c.id
RETURN p.name, c.name;

-- Efficient: Use relationship
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
RETURN p.name, c.name;

-- Inefficient: No index usage
MATCH (p:Person)
WHERE p.email = 'alice@example.com'
RETURN p;

-- Efficient: With index
CREATE INDEX person_email ON :Person(email);
MATCH (p:Person {email: 'alice@example.com'})
RETURN p;
```

## Testing Examples

### Unit Testing with Geode

```python
import pytest
from geode_client import GeodeClient

@pytest.fixture
async def client():
    client = GeodeClient("localhost:3141")
    await client.connect()
    yield client
    # Cleanup
    await client.execute("MATCH (n) DELETE n")
    await client.close()

@pytest.mark.asyncio
async def test_create_user(client):
    await client.execute("""
        CREATE (u:User {name: 'Test User', email: 'test@example.com'})
    """)

    result = await client.execute("""
        MATCH (u:User {email: 'test@example.com'})
        RETURN count(u) as count
    """)

    row = await result.single()
    assert row["count"] == 1
```

## Related Topics

- **Getting Started**: Begin your journey with introductory guides
- **Client Libraries**: Language-specific integration documentation
- **Query Language**: GQL syntax and query patterns
- **Best Practices**: Production deployment recommendations
- **Performance**: Optimization and tuning guides

## Further Reading

- **Tutorial Series**: Step-by-step learning path
- **Use Cases**: Industry-specific application examples
- **API Reference**: Complete client library documentation
- **GitHub Repository**: Full example applications and templates
- **Community Forum**: Share and discuss example implementations

---

Geode's extensive example library provides practical, tested code demonstrating every feature from basic operations to advanced analytics. All examples are production-ready and maintained alongside the codebase to ensure accuracy and relevance.
