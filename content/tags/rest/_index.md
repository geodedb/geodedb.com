---
title: "REST API Integration"
description: "Complete guide to Geode's REST API including HTTP endpoints, request/response formats, authentication methods, query execution, transaction management, and error handling."
keywords:
  - REST API
  - HTTP API
  - web services
  - RESTful
  - API endpoints
  - HTTP integration
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/rest/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# REST API Integration

Geode provides a comprehensive REST API for HTTP-based integration, enabling access from any platform or language that can make HTTP requests. While native QUIC clients offer optimal performance, the REST API provides broad compatibility, ease of use, and standardized error handling for web services and microservices architectures.

## Introduction to Geode REST API

The REST API exposes all core Geode functionality through HTTP endpoints, following RESTful design principles. The API is designed for:

- **Cross-Platform Integration**: Access Geode from any language or platform
- **Web Application Development**: Direct integration with frontend applications
- **Microservices Architecture**: Service-to-service communication over HTTP
- **Legacy System Integration**: Connect systems that cannot use QUIC protocol
- **Development and Testing**: Easy exploration using curl, Postman, or similar tools

All endpoints return JSON responses and accept JSON request bodies. The API uses standard HTTP status codes and follows ISO/IEC 39075:2024 error code conventions.

## Base URL and Versioning

The REST API is versioned to ensure backward compatibility:

```
https://geode.example.com/api/v1/
```

Current version: `v1` (stable)

All endpoints should be prefixed with `/api/v1/`. Future API versions will use `/api/v2/`, etc., allowing clients to upgrade at their own pace.

## Authentication

### Bearer Token Authentication

The recommended authentication method for production applications:

```bash
curl -X POST https://geode.example.com/api/v1/query \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"query": "MATCH (n) RETURN n LIMIT 10"}'
```

Tokens can be obtained via the authentication endpoint:

```bash
# Obtain token
curl -X POST https://geode.example.com/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "secure_password"
  }'

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_abc123"
}
```

### API Key Authentication

For service-to-service communication, API keys provide simpler authentication:

```bash
curl -X POST https://geode.example.com/api/v1/query \
  -H "X-API-Key: geode_key_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{"query": "MATCH (n) RETURN n LIMIT 10"}'
```

### Basic Authentication

Supported for development and testing (not recommended for production):

```bash
curl -X POST https://geode.example.com/api/v1/query \
  -u username:password \
  -H "Content-Type: application/json" \
  -d '{"query": "MATCH (n) RETURN n LIMIT 10"}'
```

## Core Endpoints

### Execute Query

Execute a GQL query and return results.

**Endpoint**: `POST /api/v1/query`

**Request**:
```json
{
  "query": "MATCH (p:Person)-[:KNOWS]->(friend:Person) WHERE p.name = $name RETURN friend.name, friend.age",
  "parameters": {
    "name": "Alice"
  },
  "timeout": 30000,
  "explain": false,
  "profile": false
}
```

**Response**:
```json
{
  "schema": {
    "fields": [
      {"name": "friend.name", "type": "STRING"},
      {"name": "friend.age", "type": "INTEGER"}
    ]
  },
  "data": [
    {"friend.name": "Bob", "friend.age": 30},
    {"friend.name": "Charlie", "friend.age": 35}
  ],
  "metadata": {
    "rows_returned": 2,
    "execution_time_ms": 15,
    "rows_scanned": 150
  }
}
```

**Example with curl**:
```bash
curl -X POST https://geode.example.com/api/v1/query \
  -H "Authorization: Bearer token_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "MATCH (p:Person {name: $name}) RETURN p",
    "parameters": {"name": "Alice"}
  }'
```

**Example with Python**:
```python
import requests

def execute_query(query, parameters=None):
    response = requests.post(
        'https://geode.example.com/api/v1/query',
        headers={
            'Authorization': 'Bearer token_abc123',
            'Content-Type': 'application/json'
        },
        json={
            'query': query,
            'parameters': parameters or {}
        }
    )
    response.raise_for_status()
    return response.json()

result = execute_query(
    "MATCH (p:Person)-[:KNOWS]->(f:Person) WHERE p.name = $name RETURN f.name",
    {"name": "Alice"}
)

for row in result.rows['data']:
    print(row['f.name'])
```

**Example with JavaScript/Node.js**:
```javascript
const axios = require('axios');

async function executeQuery(query, parameters = {}) {
    const response = await axios.post(
        'https://geode.example.com/api/v1/query',
        {
            query,
            parameters
        },
        {
            headers: {
                'Authorization': 'Bearer token_abc123',
                'Content-Type': 'application/json'
            }
        }
    );
    return response.data;
}

// Usage
const result = await executeQuery(
    'MATCH (p:Person {name: $name}) RETURN p',
    { name: 'Alice' }
);

console.log(result.data);
```

### Query Explanation

Get query execution plan without executing the query.

**Endpoint**: `POST /api/v1/query/explain`

**Request**:
```json
{
  "query": "MATCH (p:Person)-[:KNOWS*1..3]->(friend) WHERE p.age > 25 RETURN friend.name"
}
```

**Response**:
```json
{
  "plan": {
    "operator": "Project",
    "columns": ["friend.name"],
    "children": [
      {
        "operator": "VariableLengthExpand",
        "pattern": "[:KNOWS*1..3]",
        "estimated_cost": 1500,
        "children": [
          {
            "operator": "NodeScan",
            "label": "Person",
            "filter": "age > 25",
            "index_used": "Person.age",
            "estimated_rows": 1000
          }
        ]
      }
    ]
  },
  "estimated_total_cost": 2500,
  "estimated_rows": 500
}
```

### Query Profiling

Execute query and return detailed performance metrics.

**Endpoint**: `POST /api/v1/query/profile`

**Request**:
```json
{
  "query": "MATCH (p:Person)-[:KNOWS]->(f) RETURN f.name",
  "parameters": {}
}
```

**Response**:
```json
{
  "data": [...],
  "profile": {
    "total_time_ms": 125,
    "operators": [
      {
        "name": "Project",
        "time_ms": 5,
        "rows_processed": 100,
        "db_hits": 100
      },
      {
        "name": "Expand",
        "time_ms": 80,
        "rows_processed": 100,
        "db_hits": 500
      },
      {
        "name": "NodeScan",
        "time_ms": 40,
        "rows_processed": 50,
        "db_hits": 50,
        "index": "Person.name"
      }
    ]
  }
}
```

## Transaction Management

### Begin Transaction

Start a new transaction and receive a transaction ID.

**Endpoint**: `POST /api/v1/transaction/begin`

**Request**:
```json
{
  "isolation_level": "READ_COMMITTED",
  "timeout": 300000
}
```

**Response**:
```json
{
  "transaction_id": "tx_abc123def456",
  "expires_at": "2025-01-24T15:30:00Z"
}
```

### Execute in Transaction

Execute a query within an existing transaction.

**Endpoint**: `POST /api/v1/transaction/{transaction_id}/query`

**Request**:
```json
{
  "query": "CREATE (p:Person {name: $name, age: $age})",
  "parameters": {
    "name": "David",
    "age": 40
  }
}
```

**Response**:
```json
{
  "schema": {...},
  "data": [...],
  "metadata": {
    "rows_affected": 1,
    "execution_time_ms": 8
  }
}
```

### Commit Transaction

Commit all changes in a transaction.

**Endpoint**: `POST /api/v1/transaction/{transaction_id}/commit`

**Response**:
```json
{
  "status": "committed",
  "transaction_id": "tx_abc123def456",
  "committed_at": "2025-01-24T15:25:00Z"
}
```

### Rollback Transaction

Rollback all changes in a transaction.

**Endpoint**: `POST /api/v1/transaction/{transaction_id}/rollback`

**Request**:
```json
{
  "to_savepoint": "savepoint_1"
}
```

**Response**:
```json
{
  "status": "rolled_back",
  "transaction_id": "tx_abc123def456",
  "rolled_back_at": "2025-01-24T15:25:00Z"
}
```

### Transaction Example

Complete transaction workflow:

```python
import requests

class GeodeTransaction:
    def __init__(self, base_url, auth_token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        }
        self.tx_id = None

    def begin(self):
        response = requests.post(
            f'{self.base_url}/api/v1/transaction/begin',
            headers=self.headers,
            json={'isolation_level': 'READ_COMMITTED'}
        )
        response.raise_for_status()
        self.tx_id = response.json()['transaction_id']
        return self

    def execute(self, query, parameters=None):
        response = requests.post(
            f'{self.base_url}/api/v1/transaction/{self.tx_id}/query',
            headers=self.headers,
            json={'query': query, 'parameters': parameters or {}}
        )
        response.raise_for_status()
        return response.json()

    def commit(self):
        response = requests.post(
            f'{self.base_url}/api/v1/transaction/{self.tx_id}/commit',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def rollback(self):
        response = requests.post(
            f'{self.base_url}/api/v1/transaction/{self.tx_id}/rollback',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage
tx = GeodeTransaction('https://geode.example.com', 'token_abc123')
tx.begin()

try:
    tx.execute(
        "CREATE (p:Person {name: $name, age: $age})",
        {"name": "Eve", "age": 28}
    )
    tx.execute(
        "MATCH (p:Person {name: $name}) CREATE (p)-[:KNOWS]->(:Person {name: $friend})",
        {"name": "Eve", "friend": "Frank"}
    )
    tx.commit()
except Exception as e:
    tx.rollback()
    raise
```

## Batch Operations

Execute multiple queries in a single request for efficiency.

**Endpoint**: `POST /api/v1/batch`

**Request**:
```json
{
  "queries": [
    {
      "query": "CREATE (p:Person {name: $name})",
      "parameters": {"name": "Alice"}
    },
    {
      "query": "CREATE (p:Person {name: $name})",
      "parameters": {"name": "Bob"}
    },
    {
      "query": "MATCH (a:Person {name: $a}), (b:Person {name: $b}) CREATE (a)-[:KNOWS]->(b)",
      "parameters": {"a": "Alice", "b": "Bob"}
    }
  ],
  "transaction": true
}
```

**Response**:
```json
{
  "results": [
    {
      "index": 0,
      "status": "success",
      "data": [...],
      "metadata": {"rows_affected": 1}
    },
    {
      "index": 1,
      "status": "success",
      "data": [...],
      "metadata": {"rows_affected": 1}
    },
    {
      "index": 2,
      "status": "success",
      "data": [...],
      "metadata": {"rows_affected": 1}
    }
  ],
  "total_time_ms": 45
}
```

## Health and Status Endpoints

### Health Check

Check database health and connectivity.

**Endpoint**: `GET /api/v1/health`

**Response**:
```json
{
  "status": "healthy",
  "version": "0.18.0",
  "uptime_seconds": 86400,
  "checks": {
    "database": "ok",
    "storage": "ok",
    "replication": "ok"
  }
}
```

### Server Status

Get detailed server status and statistics.

**Endpoint**: `GET /api/v1/status`

**Response**:
```json
{
  "version": "0.18.0",
  "uptime_seconds": 86400,
  "node_id": "node_abc123",
  "role": "primary",
  "statistics": {
    "total_nodes": 1500000,
    "total_relationships": 3000000,
    "queries_per_second": 1250,
    "active_connections": 150
  },
  "storage": {
    "total_bytes": 10737418240,
    "used_bytes": 5368709120,
    "free_bytes": 5368709120
  }
}
```

### Metrics

Prometheus-compatible metrics endpoint.

**Endpoint**: `GET /api/v1/metrics`

**Response** (text/plain):
```
# HELP geode_queries_total Total number of queries executed
# TYPE geode_queries_total counter
geode_queries_total 1500000

# HELP geode_query_duration_seconds Query execution duration
# TYPE geode_query_duration_seconds histogram
geode_query_duration_seconds_bucket{le="0.01"} 100000
geode_query_duration_seconds_bucket{le="0.05"} 450000
geode_query_duration_seconds_bucket{le="0.1"} 700000

# HELP geode_connections_active Active connections
# TYPE geode_connections_active gauge
geode_connections_active 150
```

## Error Handling

### Error Response Format

All errors follow a consistent format with ISO/IEC 39075:2024 status codes:

```json
{
  "error": {
    "code": "42000",
    "category": "SYNTAX_ERROR",
    "message": "Syntax error near line 1, column 15",
    "details": {
      "query": "MATCH (n:Person RETURN n",
      "position": {
        "line": 1,
        "column": 15
      },
      "suggestion": "Expected ')' after label expression"
    }
  }
}
```

### Common Error Codes

| HTTP Status | ISO Code | Category | Description |
|-------------|----------|----------|-------------|
| 200 | 00000 | SUCCESS | Query executed successfully |
| 400 | 42000 | SYNTAX_ERROR | Invalid GQL syntax |
| 400 | 22000 | DATA_EXCEPTION | Invalid data value |
| 401 | 08001 | AUTH_FAILED | Authentication required or failed |
| 403 | 42501 | PERMISSION_DENIED | Insufficient privileges |
| 404 | 02000 | NOT_FOUND | Resource not found |
| 409 | 23000 | CONSTRAINT_VIOLATION | Constraint violation |
| 408 | 40003 | TIMEOUT | Query timeout exceeded |
| 500 | 40000 | TRANSACTION_ERROR | Transaction error |
| 503 | 08006 | CONNECTION_FAILURE | Database unavailable |

### Error Handling Example

```python
import requests
from requests.exceptions import HTTPError

def execute_with_retry(query, parameters, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = requests.post(
                'https://geode.example.com/api/v1/query',
                headers={
                    'Authorization': 'Bearer token_abc123',
                    'Content-Type': 'application/json'
                },
                json={'query': query, 'parameters': parameters}
            )
            response.raise_for_status()
            return response.json()

        except HTTPError as e:
            if e.response.status_code == 503:  # Service unavailable
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                    continue
                raise
            elif e.response.status_code == 408:  # Timeout
                if attempt < max_retries - 1:
                    continue
                raise
            else:
                # Parse error response
                error = e.response.json()['error']
                print(f"Error {error['code']}: {error['message']}")
                raise
```

## Rate Limiting

The REST API implements rate limiting to prevent abuse:

**Headers**:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1706112000
```

**Rate Limit Exceeded Response** (HTTP 429):
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit of 1000 requests per hour exceeded",
    "retry_after": 3600
  }
}
```

## CORS Support

The REST API supports Cross-Origin Resource Sharing (CORS) for browser-based applications:

**Preflight Request**:
```bash
curl -X OPTIONS https://geode.example.com/api/v1/query \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST"
```

**Response**:
```
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

## WebSocket Support

For real-time updates and streaming queries, the API supports WebSocket connections:

**Endpoint**: `wss://geode.example.com/api/v1/stream`

**JavaScript Example**:
```javascript
const ws = new WebSocket('wss://geode.example.com/api/v1/stream');

ws.onopen = () => {
    // Authenticate
    ws.send(JSON.stringify({
        type: 'AUTH',
        token: 'Bearer token_abc123'
    }));

    // Subscribe to changes
    ws.send(JSON.stringify({
        type: 'SUBSCRIBE',
        patterns: ['(n:Person)', '()-[r:KNOWS]->()']
    }));
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'CHANGE') {
        console.log('Change detected:', message.data);
    }
};
```

## Best Practices

1. **Use HTTPS**: Always use HTTPS in production for encrypted communication
2. **Token Management**: Implement token refresh before expiration
3. **Connection Pooling**: Reuse HTTP connections with keep-alive
4. **Parameterization**: Always use parameterized queries to prevent injection
5. **Error Handling**: Implement comprehensive error handling with retries
6. **Rate Limiting**: Respect rate limits and implement exponential backoff
7. **Timeouts**: Set appropriate request timeouts (default: 30 seconds)
8. **Monitoring**: Track API usage, latency, and error rates

## Performance Considerations

- **Batch Requests**: Use batch endpoint for multiple operations
- **Connection Reuse**: Enable HTTP keep-alive for connection pooling
- **Compression**: Enable gzip compression for large responses
- **Pagination**: Use LIMIT and OFFSET for large result sets
- **Field Selection**: Only request fields you need in RETURN clause

## Related Topics

- [API Development](/tags/api/) - Complete API guide
- [Authentication](/tags/authentication/) - Authentication methods
- [Client Libraries](/tags/client-libraries/) - Native client libraries
- [Protocol](/tags/protocol/) - QUIC protocol details
- [Security](/tags/security/) - Security best practices

## Further Reading

- [REST API Reference](/docs/api/rest/) - Complete endpoint documentation
- [Authentication Guide](/docs/security/authentication/) - Detailed auth setup
- [Error Codes](/docs/reference/error-codes/) - Complete error code list
- [Rate Limiting](/docs/api/rate-limiting/) - Rate limit configuration
- [API Examples](/docs/examples/rest-api/) - Real-world examples
