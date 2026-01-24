---
title: "Category: Development & Developer Tools"
description: "Comprehensive development resources for building applications with Geode including SDKs, APIs, CLI tools, LSP integration, and best practices."
keywords:
  - development
  - developer tools
  - SDK
  - API
  - CLI
  - LSP
  - developer experience
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/development/"
    noindex: false
---

The **Development & Developer Tools** category encompasses comprehensive resources for building applications with Geode graph database. From initial setup through production deployment, these resources cover the complete development lifecycle with practical guides, API references, and tooling documentation.

## Introduction

Modern database development requires more than just query capabilities—developers need rich tooling, intuitive APIs, and streamlined workflows. Geode provides a complete development ecosystem designed for productivity and ease of use. The REPL shell enables interactive query development with syntax highlighting and auto-completion. Client libraries for Go, Python, Rust, and Zig offer idiomatic APIs for each language. LSP integration brings IDE features like error checking and go-to-definition to any editor. CLI tools automate common tasks from schema management to deployment.

This category documents the full development experience, from writing your first query in the REPL to building production applications with client libraries. Whether you're prototyping a new feature, debugging a complex query, or optimizing application performance, these resources provide the knowledge and tools you need. Topics span programming language integrations, development workflows, testing strategies, debugging techniques, and operational best practices.

## What You'll Find

### Development Tools

**Interactive Shell (REPL)**
- Interactive query development with immediate feedback
- Syntax highlighting and auto-completion
- Multi-line editing for complex queries
- Transaction management and session persistence
- Query profiling and execution plan analysis
- Meta-commands for database introspection
- History search and command recall
- Result formatting and export

**CLI Tools**
- Database server management (`geode serve`)
- Interactive shell access (`geode shell`)
- Schema management and migrations
- Backup and restore operations
- Performance monitoring and diagnostics
- Configuration management
- Deployment automation
- Testing and validation tools

**Language Server Protocol (LSP)**
- IDE integration for VS Code, Vim, Emacs, and others
- Real-time syntax validation and error checking
- Context-aware auto-completion
- Hover documentation and tooltips
- Go-to-definition navigation
- Find references and symbols
- Code formatting and refactoring
- Schema-aware suggestions

### Client Libraries

**Official SDKs**
- **Go Client**: `database/sql` driver with connection pooling
- **Python Client**: Async client with aioquic and connection pooling
- **Rust Client**: Tokio-based high-performance client
- **Zig Client**: Native Zig implementation with vendored QUIC

**Common Features**
- QUIC + TLS 1.3 transport protocol
- Connection pooling and management
- Prepared statement support
- Transaction management with savepoints
- Streaming result sets for large queries
- Parametrized queries for SQL injection prevention
- Error handling with GQL status codes
- Type-safe value marshaling

### API and Protocol

**GQL Query API**
- ISO/IEC 39075:2024 compliant query language
- Pattern matching with ASCII-art syntax
- CRUD operations (INSERT, UPDATE, DELETE)
- Aggregations and subqueries
- Path queries and graph algorithms
- Transaction control (BEGIN, COMMIT, ROLLBACK)
- Prepared statements and parameter binding

**Wire Protocol**
- JSON line protocol over QUIC
- Multiplexed streams for concurrent queries
- Request types: HELLO, RUN_GQL, PULL, BEGIN, COMMIT
- Response types: SCHEMA, BINDINGS, ERROR, DONE
- Streaming results with flow control
- Connection migration support
- 0-RTT resumption for low latency

### Development Workflows

**Local Development**
- Quick start with Docker or binary installation
- REPL-driven query development
- Schema design and iteration
- Test data generation and seeding
- Local debugging with profiling tools
- Integration testing with testcontainers

**CI/CD Integration**
- Automated testing in CI pipelines
- Schema migration automation
- Performance regression testing
- Deployment to staging and production
- Rollback strategies and blue-green deployments
- Monitoring and observability integration

**Debugging and Profiling**
- EXPLAIN for query execution plans
- PROFILE for performance analysis
- Query tracing and logging
- Connection debugging
- Performance bottleneck identification
- Memory and CPU profiling

## Use Cases with Code Examples

### Rapid Prototyping with REPL

```bash
# Start interactive shell
geode shell

# Explore existing data
geode> MATCH (n) RETURN DISTINCT labels(n), count(*);

# Test query patterns
geode> MATCH (p:Person)-[:KNOWS]->(f:Person)
       WHERE p.age > 30
       RETURN p.name, collect(f.name) AS friends;

# Profile for performance
geode> \profile MATCH (p:Person)-[:KNOWS*2]-(friend)
                WHERE p.name = 'Alice'
                RETURN DISTINCT friend.name;

# Save successful queries
geode> \save queries/social_network.gql
```

### Building Applications with Client Libraries

**Python Example**
```python
import geode_client
import asyncio

async def get_user_recommendations(user_id: int, limit: int = 10):
    """Get product recommendations for a user."""
    async with geode_client.connect('geode://localhost:3141') as conn:
        query = """
            MATCH (user:User {id: $user_id})-[:PURCHASED]->(product:Product)
                 <-[:PURCHASED]-(similar:User)-[:PURCHASED]->(rec:Product)
            WHERE NOT EXISTS {
                MATCH (user)-[:PURCHASED]->(rec)
            }
            RETURN rec.name AS product,
                   rec.price AS price,
                   COUNT(similar) AS score
            ORDER BY score DESC, rec.rating DESC
            LIMIT $limit
        """

        result = await conn.execute(query, {
            'user_id': user_id,
            'limit': limit
        })

        recommendations = []
        async for row in result:
            recommendations.append({
                'product': row['product'],
                'price': row['price'],
                'score': row['score']
            })

        return recommendations

# Use in application
recommendations = asyncio.run(get_user_recommendations(12345))
for rec in recommendations:
    print(f"{rec['product']}: ${rec['price']} (score: {rec['score']})")
```

**Go Example**
```go
package main

import (
    "context"
    "database/sql"
    "log"

    _ "go.codepros.org/geode"
)

type Product struct {
    Name  string
    Price float64
    Score int
}

func GetRecommendations(userID int, limit int) ([]Product, error) {
    db, err := sql.Open("geode", "geode://localhost:3141")
    if err != nil {
        return nil, err
    }
    defer db.Close()

    query := `
        MATCH (user:User {id: $1})-[:PURCHASED]->(product:Product)
             <-[:PURCHASED]-(similar:User)-[:PURCHASED]->(rec:Product)
        WHERE NOT EXISTS {
            MATCH (user)-[:PURCHASED]->(rec)
        }
        RETURN rec.name, rec.price, COUNT(similar) AS score
        ORDER BY score DESC, rec.rating DESC
        LIMIT $2
    `

    rows, err := db.QueryContext(context.Background(), query, userID, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var products []Product
    for rows.Next() {
        var p Product
        if err := rows.Scan(&p.Name, &p.Price, &p.Score); err != nil {
            return nil, err
        }
        products = append(products, p)
    }

    return products, rows.Err()
}

func main() {
    recommendations, err := GetRecommendations(12345, 10)
    if err != nil {
        log.Fatal(err)
    }

    for _, rec := range recommendations {
        log.Printf("%s: $%.2f (score: %d)", rec.Name, rec.Price, rec.Score)
    }
}
```

### IDE Integration with LSP

**VS Code Configuration**
```json
{
  "gql.server.host": "localhost",
  "gql.server.port": 3141,
  "gql.validation.enabled": true,
  "gql.completion.autoComplete": true,
  "gql.format.enable": true,
  "gql.hover.documentation": true,
  "editor.formatOnSave": true,
  "files.associations": {
    "*.gql": "gql"
  }
}
```

**Query Development with LSP**
```gql
-- Full IDE support: auto-completion, error checking, go-to-definition
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
WHERE p.age > $minAge
  AND c.industry = $industry
RETURN p.name AS employee,
       c.name AS company,
       p.salary AS salary
ORDER BY p.salary DESC
LIMIT $limit
```

### Automated Testing

**Python Testing Example**
```python
import pytest
import geode_client

@pytest.fixture
async def db():
    """Provide test database connection."""
    async with geode_client.connect('geode://localhost:3141') as conn:
        # Setup: Create test data
        await conn.execute("""
            INSERT (:Person {id: 1, name: 'Alice', age: 30}),
                   (:Person {id: 2, name: 'Bob', age: 25}),
                   (:Person {id: 1})-[:KNOWS]->(:Person {id: 2})
        """)

        yield conn

        # Teardown: Clean up test data
        await conn.execute("MATCH (n:Person) DELETE n")

@pytest.mark.asyncio
async def test_friend_recommendation(db):
    """Test friend recommendation query."""
    result = await db.execute("""
        MATCH (p:Person {id: 1})-[:KNOWS]->()-[:KNOWS]->(foaf:Person)
        WHERE NOT EXISTS {
            MATCH (p)-[:KNOWS]->(foaf)
        }
        RETURN foaf.name AS recommended_friend
    """)

    friends = [row['recommended_friend'] async for row in result]
    assert len(friends) > 0
```

## Best Practices

### Development Workflow

1. **REPL-First Development**: Use REPL for query prototyping
2. **Version Control**: Track queries and schema in Git
3. **Schema Migrations**: Use versioned migration scripts
4. **Environment Parity**: Keep dev/staging/prod schemas aligned
5. **Code Reviews**: Review GQL queries like application code

### API Usage

1. **Connection Pooling**: Reuse connections for better performance
2. **Prepared Statements**: Use parameterized queries for security
3. **Error Handling**: Catch and handle GQL-specific errors
4. **Transaction Boundaries**: Keep transactions short and focused
5. **Result Streaming**: Stream large result sets to conserve memory

### Testing Strategy

1. **Unit Tests**: Test query logic with test data
2. **Integration Tests**: Test against real database
3. **Performance Tests**: Benchmark critical queries
4. **Schema Tests**: Validate schema integrity
5. **Regression Tests**: Prevent performance regressions

### Debugging Techniques

1. **EXPLAIN Queries**: Understand execution plans
2. **PROFILE Queries**: Measure actual performance
3. **Logging**: Enable query logging in development
4. **Tracing**: Use distributed tracing for debugging
5. **Monitoring**: Watch query metrics in production

## Related Categories

- [Tutorials](/categories/tutorials/) - Step-by-step learning guides
- [Query Language](/categories/query-language/) - GQL reference and examples
- [Client Libraries](/categories/client-libraries/) - SDK documentation
- [Reference](/categories/reference/) - API and protocol reference
- [Best Practices](/categories/best-practices/) - Development guidelines

## Related Tags

- [REPL](/tags/repl/) - Interactive shell
- [CLI](/tags/cli/) - Command-line tools
- [LSP](/tags/lsp/) - Language Server Protocol
- [API](/tags/api/) - API documentation
- [GQL](/tags/gql/) - Graph Query Language
- [Tools](/tags/tools/) - Development tooling
- [Debugging](/tags/debugging/) - Debugging techniques
- [Testing](/tags/testing/) - Testing strategies

## Further Reading

- [Getting Started Guide](/docs/getting-started/) - Initial setup and first queries
- [Client Library Documentation](/docs/client-libraries/) - SDK references
- [REPL User Guide](/docs/repl-user-guide/) - Interactive shell documentation
- [LSP Setup Guide](/docs/lsp-setup/) - IDE integration
- [API Reference](/docs/api-reference/) - Complete API documentation
- [Development Best Practices](/docs/development-best-practices/) - Coding guidelines
