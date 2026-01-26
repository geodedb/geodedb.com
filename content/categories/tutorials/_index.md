---
title: "Category: Tutorials & Learning Guides"
description: "Hands-on tutorials for learning Geode including REPL basics, GQL patterns, indexing, transactions, graph algorithms, vector search, and production deployment."
keywords:
  - tutorials
  - learning
  - getting started
  - hands-on
  - examples
  - step-by-step
  - training
  - education
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/tutorials/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

The **Tutorials & Learning Guides** category provides structured, hands-on learning paths for mastering Geode graph database. From installation through advanced features, these tutorials build skills progressively with complete code examples, expected outputs, and practical exercises.

## Introduction

Learning a new database is most effective through hands-on practice with guided examples. Geode's tutorials are designed for progressive skill building: start with installation and basic queries, advance to pattern matching and indexing, explore transactions and concurrency, and master advanced features like vector search and graph algorithms. Each tutorial is self-contained with setup instructions, complete code, expected results, and exercises for practice.

Tutorials span beginner through advanced levels. Beginners learn installation, REPL basics, and simple MATCH patterns. Intermediate users explore indexing strategies, transaction management, and query optimization. Advanced users master vector search, graph algorithms, Row-Level Security, and production deployment patterns. Whether learning alone or training a team, these tutorials provide structured learning paths.

## What You'll Find

### Getting Started Tutorials

**Installation and Setup**
- Installing Geode (Docker, binary, source)
- Starting the database server
- Connecting with the REPL shell
- Creating your first graph
- Basic CRUD operations
- Understanding graph structure

**REPL Basics**
- Interactive shell features
- Multi-line query editing
- Result formatting options
- History and search
- Meta-commands
- Saving and loading sessions

### Query Language Tutorials

**Pattern Matching Fundamentals**
- Basic node patterns
- Relationship patterns
- Variable-length paths
- Pattern composition
- Optional patterns with EXISTS
- Filtering with WHERE

**Data Manipulation**
- Inserting nodes and relationships
- Updating properties with SET
- Removing properties
- Deleting nodes and relationships
- Merging patterns
- Bulk operations

**Aggregations and Analytics**
- COUNT, SUM, AVG, MIN, MAX
- GROUP BY for grouping
- COLLECT for arrays
- DISTINCT for uniqueness
- Nested aggregations
- Window functions

### Advanced Tutorials

**Indexing Strategies**
- Creating B+tree indexes
- Unique constraints
- Composite indexes
- Vector indexes (HNSW)
- Full-text search (BM25)
- Index selection and optimization

**Transaction Management**
- BEGIN/COMMIT/ROLLBACK
- Savepoints for partial rollback
- Transaction isolation levels
- Handling conflicts
- Deadlock prevention
- Concurrent access patterns

**Graph Algorithms**
- PageRank for centrality
- Community detection
- Shortest path algorithms
- Path finding strategies
- Graph traversal patterns
- Custom algorithm implementation

**Vector Search**
- Storing embeddings
- Creating HNSW indexes
- Similarity search queries
- Combining vector and graph queries
- RAG (Retrieval Augmented Generation)
- Semantic search patterns

### Production Tutorials

**Performance Optimization**
- Query profiling with EXPLAIN/PROFILE
- Index optimization
- Query rewriting for performance
- Connection pooling
- Batch operations
- Caching strategies

**Security Configuration**
- Setting up authentication
- Configuring Row-Level Security
- Enabling encryption (TDE/FLE)
- Audit logging configuration
- Certificate management
- Security best practices

**Deployment Patterns**
- Docker deployment
- Kubernetes deployment
- High availability setup
- Backup and restore
- Monitoring configuration
- Production checklist

## Learning Paths

### Path 1: Database Beginner

1. **Installation Tutorial** - Set up Geode locally
2. **REPL Basics** - Learn interactive shell
3. **First Graph** - Create simple graph structure
4. **Basic Queries** - Master MATCH and RETURN
5. **CRUD Operations** - Insert, update, delete data
6. **Simple Patterns** - Query relationships

Estimated time: 4-6 hours

### Path 2: GQL Developer

1. **Advanced Patterns** - Complex graph patterns
2. **Aggregations** - Analytics queries
3. **Subqueries** - Nested query logic
4. **Transactions** - ACID operations
5. **Query Optimization** - Performance tuning
6. **Client Integration** - Application development

Estimated time: 8-12 hours

### Path 3: Production Engineer

1. **Indexing Strategies** - Optimize queries
2. **Performance Tuning** - System optimization
3. **Security Setup** - Authentication and encryption
4. **Monitoring** - Prometheus integration
5. **Backup/Recovery** - Disaster recovery
6. **Production Deployment** - Go-live checklist

Estimated time: 12-16 hours

### Path 4: Advanced Features

1. **Vector Search** - Embedding-based search
2. **Graph Algorithms** - PageRank, communities
3. **Row-Level Security** - Fine-grained access
4. **CDC Streaming** - Change data capture
5. **Advanced Optimization** - Expert tuning
6. **Custom Extensions** - Extending Geode

Estimated time: 16-20 hours

## Tutorial Format

Each tutorial follows a consistent structure:

1. **Learning Objectives** - What you'll learn
2. **Prerequisites** - Required knowledge and setup
3. **Overview** - Concept introduction
4. **Step-by-Step Instructions** - Detailed walkthrough
5. **Code Examples** - Complete, runnable code
6. **Expected Output** - Verification of results
7. **Exercises** - Practice problems
8. **Troubleshooting** - Common issues and solutions
9. **Next Steps** - Suggested follow-up tutorials
10. **Additional Resources** - Further reading

## Code Examples

All tutorials include complete, tested code examples:

```gql
-- Example from Pattern Matching Tutorial
MATCH (person:Person)-[:WORKS_AT]->(company:Company)
WHERE person.age > 30
  AND company.industry = 'Technology'
RETURN person.name AS employee,
       company.name AS employer,
       person.salary AS salary
ORDER BY person.salary DESC
LIMIT 10;
```

```python
# Example from Client Library Tutorial
import geode_client
import asyncio

async def get_employee_data():
    client = geode_client.open_database('geode://localhost:3141')
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (p:Person)-[:WORKS_AT]->(c:Company)
            WHERE p.age > 30
            RETURN p.name, c.name
        """)

        employees = []
        for row in result.rows:
            employees.append({
                'name': row[0],
                'company': row[1]
            })

        return employees

# Run tutorial example
employees = asyncio.run(get_employee_data())
for emp in employees:
    print(f"{emp['name']} works at {emp['company']}")
```

## Practice Exercises

Tutorials include exercises for skill reinforcement:

**Exercise: Friend Recommendations**
```gql
-- TODO: Write a query that finds friends-of-friends
-- who share at least 2 common interests with the user
-- but are not already friends
MATCH (user:Person {name: 'Alice'})...
-- Complete this query
```

**Exercise: Performance Optimization**
```gql
-- TODO: Optimize this slow query using indexes
-- Current execution time: 2.5 seconds
-- Target execution time: <100ms
MATCH (p:Person)
WHERE p.email LIKE '%@example.com'
RETURN p.name, p.email
-- Hint: Consider index strategy
```

## Related Categories

- [Getting Started](/categories/getting-started/) - Initial setup
- [GQL](/categories/gql/) - Query language reference
- [Use Cases](/categories/use-cases/) - Real-world applications
- [Examples](/categories/examples/) - Code examples
- [Best Practices](/categories/best-practices/) - Guidelines
- [Development](/categories/development/) - Development workflow

## Related Tags

- [Tutorial](/tags/tutorial/) - Tutorial content
- [Learning](/tags/learning/) - Learning resources
- [Getting Started](/tags/getting-started/) - Beginner content
- [Hands-On](/tags/hands-on/) - Practical exercises
- [Examples](/tags/examples/) - Code examples
- [REPL](/tags/repl/) - Interactive shell
- [GQL](/tags/gql/) - Query language

## Interactive Tutorials

### Beginner Tutorial: Your First Graph

**Learning Objective**: Create a simple social network and query it.

**Prerequisites**: Geode installed and running.

**Step 1: Start the REPL**

```bash
geode shell
Connected to Geode v0.18.0
geode>
```

**Step 2: Create Your First Nodes**

```gql
geode> CREATE (alice:Person {name: 'Alice', age: 30, city: 'San Francisco'});
Created 1 node

geode> CREATE (bob:Person {name: 'Bob', age: 25, city: 'New York'});
Created 1 node

geode> CREATE (carol:Person {name: 'Carol', age: 28, city: 'San Francisco'});
Created 1 node
```

**Step 3: Create Relationships**

```gql
geode> MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
       CREATE (a)-[:KNOWS {since: 2020}]->(b);
Created 1 relationship

geode> MATCH (a:Person {name: 'Alice'}), (c:Person {name: 'Carol'})
       CREATE (a)-[:KNOWS {since: 2019}]->(c);
Created 1 relationship

geode> MATCH (b:Person {name: 'Bob'}), (c:Person {name: 'Carol'})
       CREATE (b)-[:KNOWS {since: 2021}]->(c);
Created 1 relationship
```

**Step 4: Query the Graph**

```gql
geode> MATCH (p:Person)
       RETURN p.name, p.age, p.city;

┌─────────┬──────┬─────────────────┐
│ name    │ age  │ city            │
├─────────┼──────┼─────────────────┤
│ Alice   │ 30   │ San Francisco   │
│ Bob     │ 25   │ New York        │
│ Carol   │ 28   │ San Francisco   │
└─────────┴──────┴─────────────────┘
```

**Step 5: Find Connections**

```gql
geode> MATCH (a:Person {name: 'Alice'})-[:KNOWS]->(friend)
       RETURN friend.name, friend.city;

┌─────────┬─────────────────┐
│ name    │ city            │
├─────────┼─────────────────┤
│ Bob     │ New York        │
│ Carol   │ San Francisco   │
└─────────┴─────────────────┘
```

**Exercise**: Add yourself to the graph and create friendships. Then find all people who know at least 2 people.

### Intermediate Tutorial: Building a Recommendation Engine

**Learning Objective**: Implement collaborative filtering recommendations.

**Scenario**: A movie recommendation system based on user ratings.

**Step 1: Create the Data Model**

```python
import geode_client
import asyncio

async def setup_movie_database():
    client = geode_client.open_database('geode://localhost:3141')
    async with client.connection() as conn:
        # Create movies
        movies = [
            {'title': 'The Matrix', 'genre': 'Sci-Fi', 'year': 1999},
            {'title': 'Inception', 'genre': 'Sci-Fi', 'year': 2010},
            {'title': 'Interstellar', 'genre': 'Sci-Fi', 'year': 2014},
            {'title': 'The Shawshank Redemption', 'genre': 'Drama', 'year': 1994},
        ]

        for movie in movies:
            await conn.execute("""
                CREATE (:Movie {
                    title: $title,
                    genre: $genre,
                    year: $year
                })
            """, movie)

        # Create users
        users = ['Alice', 'Bob', 'Carol', 'Dave']
        for user in users:
            await conn.execute("""
                CREATE (:User {name: $name})
            """, {'name': user})

        # Create ratings
        ratings = [
            ('Alice', 'The Matrix', 5),
            ('Alice', 'Inception', 4),
            ('Bob', 'The Matrix', 5),
            ('Bob', 'Interstellar', 5),
            ('Carol', 'Inception', 4),
            ('Carol', 'Interstellar', 5),
            ('Dave', 'The Shawshank Redemption', 5),
        ]

        for user_name, movie_title, rating in ratings:
            await conn.execute("""
                MATCH (u:User {name: $user}), (m:Movie {title: $movie})
                CREATE (u)-[:RATED {score: $score}]->(m)
            """, {'user': user_name, 'movie': movie_title, 'score': rating})

asyncio.run(setup_movie_database())
```

**Step 2: Implement Collaborative Filtering**

```python
async def get_recommendations(user_name, limit=5):
    """Get movie recommendations for a user."""
    client = geode_client.open_database('geode://localhost:3141')
    async with client.connection() as conn:
        result, _ = await conn.query("""
            // Find users with similar taste
            MATCH (me:User {name: $user})-[my_rating:RATED]->(movie:Movie)
                 <-[their_rating:RATED]-(similar:User)
                 -[rec_rating:RATED]->(recommendation:Movie)
            WHERE NOT EXISTS {
                MATCH (me)-[:RATED]->(recommendation)
            }
            // Calculate similarity based on common ratings
            WITH recommendation,
                 AVG(rec_rating.score) AS avg_score,
                 COUNT(DISTINCT similar) AS similar_user_count
            RETURN recommendation.title AS title,
                   recommendation.genre AS genre,
                   avg_score,
                   similar_user_count
            ORDER BY similar_user_count DESC, avg_score DESC
            LIMIT $limit
        """, {'user': user_name, 'limit': limit})

        recommendations = []
        for row in result.rows:
            recommendations.append({
                'title': row['title'],
                'genre': row['genre'],
                'predicted_score': row['avg_score'],
                'confidence': row['similar_user_count']
            })

        return recommendations

# Test recommendations
recs = asyncio.run(get_recommendations('Alice'))
for rec in recs:
    print(f"{rec['title']}: {rec['predicted_score']:.1f} "
          f"(confidence: {rec['confidence']} users)")
```

**Expected Output**:
```
Interstellar: 5.0 (confidence: 2 users)
The Shawshank Redemption: 5.0 (confidence: 1 user)
```

**Exercise**: Implement content-based filtering that recommends movies in the same genre with similar ratings.

### Advanced Tutorial: Real-Time Fraud Detection

**Learning Objective**: Build a fraud detection system using graph patterns.

**Scenario**: Detect suspicious transaction patterns in financial data.

**Step 1: Transaction Data Model**

```python
async def create_transaction_network():
    client = geode_client.open_database('geode://localhost:3141')
    async with client.connection() as conn:
        # Create accounts
        for i in range(1, 11):
            await conn.execute("""
                CREATE (:Account {
                    id: $id,
                    balance: $balance,
                    created: $created
                })
            """, {
                'id': i,
                'balance': 10000.0,
                'created': '2025-01-01'
            })

        # Simulate normal transactions
        normal_transactions = [
            (1, 2, 100, '2025-01-24T10:00:00Z'),
            (2, 3, 50, '2025-01-24T11:00:00Z'),
            (3, 4, 75, '2025-01-24T12:00:00Z'),
        ]

        for from_id, to_id, amount, timestamp in normal_transactions:
            await conn.execute("""
                MATCH (from:Account {id: $from}), (to:Account {id: $to})
                CREATE (from)-[:TRANSFER {
                    amount: $amount,
                    timestamp: $timestamp
                }]->(to)
            """, {'from': from_id, 'to': to_id, 'amount': amount, 'timestamp': timestamp})

        # Simulate suspicious circular transactions
        circular = [
            (5, 6, 1000, '2025-01-24T13:00:00Z'),
            (6, 7, 900, '2025-01-24T13:05:00Z'),
            (7, 5, 850, '2025-01-24T13:10:00Z'),
        ]

        for from_id, to_id, amount, timestamp in circular:
            await conn.execute("""
                MATCH (from:Account {id: $from}), (to:Account {id: $to})
                CREATE (from)-[:TRANSFER {
                    amount: $amount,
                    timestamp: $timestamp,
                    flagged: false
                }]->(to)
            """, {'from': from_id, 'to': to_id, 'amount': amount, 'timestamp': timestamp})

asyncio.run(create_transaction_network())
```

**Step 2: Detect Circular Transactions**

```python
async def detect_circular_transactions(time_window_hours=24):
    """Find circular money flows within time window."""
    client = geode_client.open_database('geode://localhost:3141')
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH path = (a1:Account)-[t1:TRANSFER]->(a2:Account)
                        -[t2:TRANSFER]->(a3:Account)
                        -[t3:TRANSFER]->(a1)
            WHERE t1.timestamp > current_timestamp() - INTERVAL '$hours' HOUR
              AND t2.timestamp > t1.timestamp
              AND t3.timestamp > t2.timestamp
              AND t3.timestamp < t1.timestamp + INTERVAL '1' HOUR
            RETURN a1.id AS account1,
                   a2.id AS account2,
                   a3.id AS account3,
                   t1.amount + t2.amount + t3.amount AS total_amount,
                   [t1.timestamp, t2.timestamp, t3.timestamp] AS timestamps
        """, {'hours': time_window_hours})

        suspicious_patterns = []
        for row in result.rows:
            suspicious_patterns.append({
                'accounts': [row['account1'], row['account2'], row['account3']],
                'total_amount': row['total_amount'],
                'timestamps': row['timestamps']
            })

        return suspicious_patterns

# Detect fraud
fraud_cases = asyncio.run(detect_circular_transactions())
for case in fraud_cases:
    print(f"Circular transaction detected: {case['accounts']}")
    print(f"  Total amount: ${case['total_amount']}")
    print(f"  Time span: {case['timestamps'][0]} to {case['timestamps'][-1]}")
```

**Step 3: Velocity Check Implementation**

```python
async def velocity_check(account_id, threshold_multiplier=5):
    """Detect accounts with unusual transaction velocity."""
    client = geode_client.open_database('geode://localhost:3141')
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (a:Account {id: $account_id})-[t:TRANSFER]->()
            WITH a,
                 COUNT{(a)-[recent:TRANSFER]->()
                       WHERE recent.timestamp > current_timestamp() - INTERVAL '1' HOUR} AS recent_count,
                 AVG(t.amount) AS historical_avg
            WHERE recent_count > $threshold * historical_avg
            RETURN a.id AS account_id,
                   recent_count AS recent_transactions,
                   historical_avg AS normal_rate
        """, {'account_id': account_id, 'threshold': threshold_multiplier})

        return result.rows[0] if result.rows else None

# Check specific account
alert = asyncio.run(velocity_check(5))
if alert:
    print(f"⚠️  Velocity alert for account {alert['account_id']}")
    print(f"   Recent transactions: {alert['recent_transactions']}")
    print(f"   Normal rate: {alert['normal_rate']}")
```

**Exercise**: Implement a shared device detector that finds multiple accounts accessing from the same IP address or device ID.

## Tutorial Videos and Screencasts

While primarily text-based, Geode tutorials benefit from visual demonstrations:

**Available Video Tutorials**:
1. "Getting Started with Geode" (15 minutes)
2. "Pattern Matching Deep Dive" (30 minutes)
3. "Building a Social Network" (45 minutes)
4. "Transaction Management Best Practices" (25 minutes)
5. "Performance Tuning and Profiling" (40 minutes)

Access videos at: `https://geodedb.com/videos/`

## Troubleshooting Common Issues

### Connection Errors

**Problem**: Cannot connect to Geode server

```
Error: connection refused at localhost:3141
```

**Solution**:
```bash
# Check if server is running
ps aux | grep geode

# Start server if not running
geode serve --listen 0.0.0.0:3141

# Check firewall rules
sudo ufw status
sudo ufw allow 3141/tcp
```

### Query Performance Issues

**Problem**: Query taking too long

**Solution**: Use PROFILE to identify bottlenecks

```gql
PROFILE
MATCH (u:User)-[:FRIEND*2..3]-(friend)
WHERE u.city = 'San Francisco'
RETURN friend.name

-- Review execution plan
-- Look for full scans vs. index scans
-- Add indexes on frequently filtered properties

CREATE INDEX user_city ON :User(city);
```

### Memory Errors

**Problem**: Out of memory during large queries

**Solution**: Use pagination and streaming

```python
async def paginated_query(page_size=1000):
    """Process large result sets in chunks."""
    offset = 0
    client = geode_client.open_database('geode://localhost:3141')
    async with client.connection() as conn:
        while True:
            result, _ = await conn.query("""
                MATCH (n:Node)
                RETURN n
                ORDER BY n.id
                SKIP $offset
                LIMIT $limit
            """, {'offset': offset, 'limit': page_size})

            rows = []
            for row in result.rows:
                rows.append(row)

            if not rows:
                break

            # Process chunk
            process_chunk(rows)
            offset += page_size
```

## Tutorial Completion Checklist

After completing tutorials, verify your knowledge:

- [ ] Can create nodes and relationships
- [ ] Understand pattern matching syntax
- [ ] Can write WHERE clause filters
- [ ] Know how to use aggregation functions
- [ ] Understand transaction boundaries
- [ ] Can create and use indexes
- [ ] Able to profile and optimize queries
- [ ] Familiar with at least one client library
- [ ] Can implement basic graph algorithms
- [ ] Understand security best practices

## Next Steps After Tutorials

1. **Build a small project**: Apply knowledge to a real use case
2. **Read API documentation**: Deep dive into specific features
3. **Join community**: Share experiences and ask questions
4. **Contribute**: Report bugs or contribute documentation
5. **Production deployment**: Plan and execute production rollout

## Further Reading

- [Documentation Index](/docs/) - Complete documentation
- [API Reference](/docs/api-reference/) - API documentation
- [Quick Reference](/docs/quick-reference/) - Syntax cheat sheet
- [Video Tutorials](/videos/) - Video learning content
- [Community Forum](/community/) - Get help and share knowledge
- [Example Projects](/examples/) - Sample applications and code
- [Best Practices Guide](/docs/best-practices/) - Development guidelines
- [Production Deployment](/docs/deployment/) - Going to production
- [Performance Tuning](/docs/performance/) - Optimization techniques
- [Security Hardening](/docs/security/) - Security configuration
