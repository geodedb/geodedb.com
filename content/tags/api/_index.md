---
title: "API Development"
description: "Best practices for building APIs with Geode, including REST, GraphQL, and native client libraries"
keywords: ["API", "REST API", "GraphQL", "client libraries", "API design", "API versioning", "rate limiting", "API documentation", "SDK development"]
weight: 10
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# API Development

API development encompasses the design, implementation, and documentation of interfaces for accessing Geode's graph database functionality. Well-designed APIs enable developers to build powerful applications while maintaining security, performance, and backward compatibility.

## Geode Client Libraries

### Native Protocol

Geode's native protocol uses QUIC over TLS for efficient, secure communication:

**Transport** - QUIC (UDP-based, multiplexed)
**Security** - TLS 1.3 required
**Format** - JSON line protocol
**Port** - 3141 (standard) or 8443 (alternative)

```
Client Message Format:
{"type": "RUN_GQL", "query": "MATCH (n) RETURN n LIMIT 10"}

Server Response Format:
{"type": "SCHEMA", "columns": ["n"]}
{"type": "BINDINGS", "row": [{"id": "1", "labels": ["Person"]}]}
{"type": "BINDINGS", "row": [{"id": "2", "labels": ["Person"]}]}
```

### Go Client Library

Full-featured Go client with `database/sql` compatibility:

```go
import (
    "database/sql"
    _ "geodedb.com/geode"
)

// Open connection
db, err := sql.Open("geode", "geode://localhost:3141?tls=true")
if err != nil {
    log.Fatal(err)
}
defer db.Close()

// Execute query
rows, err := db.Query("MATCH (p:Person) WHERE p.age > ? RETURN p", 18)
if err != nil {
    log.Fatal(err)
}
defer rows.Close()

// Process results
for rows.Next() {
    var person Person
    if err := rows.Scan(&person); err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Person: %+v\n", person)
}
```

Features:
- Connection pooling
- Prepared statements
- Transaction support
- Context-aware operations
- Type-safe query builders

### Python Client Library

Async Python client built on aioquic:

```python
import asyncio
from geode_client import Client

async def main():
    # Connect to database
    client = Client("localhost", 3141, use_tls=True)
    async with client.connection() as client:
        # Execute query
        result, _ = await client.query(
            "MATCH (p:Person) WHERE p.age > $age RETURN p",
            {"age": 18}
        )
        
        # Process results
        for row in result.rows:
            print(f"Person: {row['p']}")

asyncio.run(main())
```

Features:
- Full async/await support
- Connection pooling (workload-dependent throughput)
- Query builders
- Row-Level Security policy management
- Savepoint support

### Rust Client Library

High-performance Rust client with tokio:

```rust
use geode_client::{Client, Query};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to database
    let client = Client::connect("localhost:3141").await?;
    
    // Execute query
    let query = Query::new("MATCH (p:Person) WHERE p.age > $age RETURN p")
        .param("age", 18);
    
    let mut result = client.execute(query).await?;
    
    // Process results
    while let Some(row) = result.next().await? {
        println!("Person: {:?}", row.get::<Person>("p")?);
    }
    
    Ok(())
}
```

Features:
- Zero-cost abstractions
- Type-safe query builders
- Connection pooling (workload-dependent throughput)
- Transaction support
- Compile-time query validation

### Zig Client Library

Native Zig client for systems programming:

```zig
const geode = @import("geode");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    
    // Connect to database
    var client = try geode.Client.connect(
        gpa.allocator(),
        "localhost",
        3141,
        .{ .tls = true }
    );
    defer client.deinit();
    
    // Execute query
    var result = try client.execute(
        "MATCH (p:Person) WHERE p.age > $age RETURN p",
        .{ .age = 18 }
    );
    defer result.deinit();
    
    // Process results
    while (try result.next()) |row| {
        const person = try row.get("p", Person);
        std.debug.print("Person: {}\n", .{person});
    }
}
```

## REST API Design

### RESTful Endpoints

Design clean, resource-oriented APIs:

```
GET    /api/v1/graphs                    # List graphs
POST   /api/v1/graphs                    # Create graph
GET    /api/v1/graphs/{id}               # Get graph details
DELETE /api/v1/graphs/{id}               # Delete graph

GET    /api/v1/graphs/{id}/nodes         # List nodes
POST   /api/v1/graphs/{id}/nodes         # Create node
GET    /api/v1/graphs/{id}/nodes/{nid}   # Get node
PUT    /api/v1/graphs/{id}/nodes/{nid}   # Update node
DELETE /api/v1/graphs/{id}/nodes/{nid}   # Delete node

POST   /api/v1/graphs/{id}/query         # Execute GQL query
```

### Request/Response Format

Use consistent JSON format:

```json
// Request
POST /api/v1/graphs/social/query
{
  "query": "MATCH (p:Person) WHERE p.age > $age RETURN p",
  "parameters": {
    "age": 18
  },
  "consistency": "strong"
}

// Response
{
  "status": "success",
  "schema": {
    "columns": [
      {"name": "p", "type": "node"}
    ]
  },
  "data": [
    {
      "p": {
        "id": "person:123",
        "labels": ["Person"],
        "properties": {
          "name": "Alice",
          "age": 25
        }
      }
    }
  ],
  "metadata": {
    "rows": 1,
    "execution_time_ms": 12,
    "cached": false
  }
}
```

### Error Handling

Return meaningful error responses:

```json
// Error Response
{
  "status": "error",
  "error": {
    "code": "INVALID_QUERY",
    "message": "Syntax error at line 1, column 15",
    "details": {
      "line": 1,
      "column": 15,
      "expected": "WHERE or RETURN",
      "got": "FROM"
    }
  },
  "request_id": "req_abc123"
}
```

Standard error codes:
- 400 - Bad Request (invalid syntax)
- 401 - Unauthorized (authentication required)
- 403 - Forbidden (insufficient permissions)
- 404 - Not Found (resource doesn't exist)
- 409 - Conflict (constraint violation)
- 429 - Too Many Requests (rate limited)
- 500 - Internal Server Error

## GraphQL API

### Schema Definition

Define GraphQL schema for graph access:

```graphql
type Person {
  id: ID!
  name: String!
  age: Int!
  friends: [Person!]!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: Person!
  comments: [Comment!]!
}

type Query {
  person(id: ID!): Person
  people(filter: PersonFilter, limit: Int): [Person!]!
  
  post(id: ID!): Post
  posts(filter: PostFilter, limit: Int): [Post!]!
}

type Mutation {
  createPerson(input: CreatePersonInput!): Person!
  updatePerson(id: ID!, input: UpdatePersonInput!): Person!
  deletePerson(id: ID!): Boolean!
  
  createPost(input: CreatePostInput!): Post!
}

input PersonFilter {
  minAge: Int
  maxAge: Int
  name: String
}
```

### Resolver Implementation

Map GraphQL to GQL queries:

```javascript
const resolvers = {
  Query: {
    person: async (_, { id }, { geode }) => {
      const result = await geode.execute(
        'MATCH (p:Person {id: $id}) RETURN p',
        { id }
      );
      return result.rows[0]?.p;
    },
    
    people: async (_, { filter, limit = 100 }, { geode }) => {
      let query = 'MATCH (p:Person)';
      const params = {};
      
      if (filter?.minAge) {
        query += ' WHERE p.age >= $minAge';
        params.minAge = filter.minAge;
      }
      
      query += ' RETURN p LIMIT $limit';
      params.limit = limit;
      
      const result = await geode.execute(query, params);
      return result.rows.map(row => row.p);
    }
  },
  
  Person: {
    friends: async (person, _, { geode }) => {
      const result = await geode.execute(
        'MATCH (p:Person {id: $id})-[:FRIEND]->(f:Person) RETURN f',
        { id: person.id }
      );
      return result.rows.map(row => row.f);
    }
  }
};
```

### Query Optimization

Optimize GraphQL queries:

**DataLoader** - Batch and cache database requests
**Query Depth Limiting** - Prevent excessive nesting
**Complexity Analysis** - Estimate query cost
**Persisted Queries** - Pre-approve query patterns

## API Versioning

### Versioning Strategies

Support multiple API versions:

**URL Versioning** - `/api/v1/`, `/api/v2/`
**Header Versioning** - `Accept: application/vnd.geode.v2+json`
**Content Negotiation** - Different formats per version

```
// URL versioning (recommended)
GET /api/v1/graphs/social/nodes
GET /api/v2/graphs/social/nodes

// Header versioning
GET /api/graphs/social/nodes
Accept: application/vnd.geode.v2+json

// Query parameter versioning
GET /api/graphs/social/nodes?version=2
```

### Deprecation Policy

Gracefully deprecate old versions:

1. **Announce** - Notify users of deprecation timeline
2. **Warn** - Include deprecation headers in responses
3. **Support** - Maintain old version for grace period (6-12 months)
4. **Sunset** - Remove support with final notice

```
Deprecation: true
Sunset: Sat, 31 Dec 2026 23:59:59 GMT
Link: <https://docs.geode.io/api/v3>; rel="successor-version"
```

## Rate Limiting

### Rate Limit Configuration

Protect API from abuse:

```yaml
rate_limiting:
  enabled: true
  strategies:
    - name: per_user
      limit: 1000
      window: 1h
      
    - name: per_ip
      limit: 100
      window: 1m
      
    - name: burst
      limit: 50
      window: 1s
```

### Rate Limit Headers

Communicate limits to clients:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 742
X-RateLimit-Reset: 1640995200
Retry-After: 3600
```

### Rate Limit Response

Return clear error when limited:

```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Retry after 3600 seconds.",
    "limit": 1000,
    "window": "1h",
    "reset_at": "2026-01-24T12:00:00Z"
  }
}
```

## Authentication and Authorization

### API Key Authentication

Simple authentication for service accounts:

```bash
# Include API key in request
curl -H "X-API-Key: gd_live_abc123..." \
  https://api.geode.io/v1/graphs
```

### OAuth 2.0

Standard OAuth flow for user authorization:

```
1. Client redirects to authorization endpoint
   GET /oauth/authorize?client_id=...&response_type=code

2. User authenticates and grants permission

3. Client receives authorization code
   GET /callback?code=abc123

4. Client exchanges code for access token
   POST /oauth/token
   { "code": "abc123", "grant_type": "authorization_code" }

5. Client uses access token
   GET /api/v1/graphs
   Authorization: Bearer eyJhbGc...
```

### JWT Tokens

Use JWT for stateless authentication:

```javascript
// Verify JWT token
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

## API Documentation

### OpenAPI Specification

Document REST APIs with OpenAPI:

```yaml
openapi: 3.0.0
info:
  title: Geode Graph Database API
  version: 1.0.0
  description: RESTful API for Geode graph database

paths:
  /graphs/{graphId}/query:
    post:
      summary: Execute GQL query
      parameters:
        - name: graphId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                query:
                  type: string
                parameters:
                  type: object
      responses:
        '200':
          description: Query results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/QueryResult'
```

### Interactive Documentation

Provide interactive API exploration:

**Swagger UI** - Browse and test REST endpoints
**GraphiQL** - Interactive GraphQL IDE
**Postman Collections** - Pre-built API requests

### SDK Documentation

Generate client library documentation:

```bash
# Generate Go documentation
godoc -http=:6060

# Generate Python documentation
pdoc --html geode_client

# Generate Rust documentation
cargo doc --open
```

## Best Practices

### API Design Principles

Follow REST best practices:

- Use nouns for resources, verbs for actions
- Return appropriate HTTP status codes
- Support filtering, sorting, and pagination
- Version APIs from the start
- Use HTTPS for all endpoints

### Performance Optimization

Optimize API performance:

**Caching** - Cache GET responses with ETags
**Compression** - Enable gzip/brotli compression
**Connection Pooling** - Reuse database connections
**Pagination** - Limit result set sizes
**Field Selection** - Allow clients to specify needed fields

### Error Handling

Provide helpful error messages:

- Include error codes for programmatic handling
- Provide human-readable messages
- Include request IDs for debugging
- Suggest corrective actions
- Log errors for analysis

### Security Considerations

Secure API endpoints:

- Require authentication for all endpoints
- Use HTTPS exclusively
- Validate and sanitize inputs
- Implement rate limiting
- Audit API access
- Rotate credentials regularly

## Testing APIs

### Unit Testing

Test API handlers in isolation:

```javascript
describe('POST /graphs/{id}/query', () => {
  it('executes valid GQL query', async () => {
    const response = await request(app)
      .post('/api/v1/graphs/social/query')
      .send({
        query: 'MATCH (n) RETURN n LIMIT 1'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
  });
  
  it('returns error for invalid query', async () => {
    const response = await request(app)
      .post('/api/v1/graphs/social/query')
      .send({
        query: 'INVALID QUERY'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_QUERY');
  });
});
```

### Integration Testing

Test end-to-end API flows:

```python
def test_user_workflow():
    # Create user
    response = client.post('/api/v1/users', json={
        'name': 'Alice',
        'email': 'alice@example.com'
    })
    assert response.status_code == 201
    user_id = response.json()['id']
    
    # Get user
    response = client.get(f'/api/v1/users/{user_id}')
    assert response.status_code == 200
    assert response.json()['name'] == 'Alice'
    
    # Delete user
    response = client.delete(f'/api/v1/users/{user_id}')
    assert response.status_code == 204
```

### Contract Testing

Verify API contracts:

```yaml
# Pact contract test
interactions:
  - description: Get person by ID
    request:
      method: GET
      path: /api/v1/persons/123
    response:
      status: 200
      body:
        id: 123
        name: string
        age: integer
```

## Related Topics

- [Client Libraries](/tags/client-libraries) - Native client implementations
- [Security](/tags/security) - API security best practices
- [Performance](/tags/performance) - API optimization techniques
- [REST](/tags/rest) - RESTful API design

## Learn More

- [REST API Design Best Practices](https://restfulapi.net/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [OAuth 2.0](https://oauth.net/2/)
