---
title: "Claude Code Integration"
description: "Claude Code integration for Geode GQL development with LSP support, intelligent completions, query optimization suggestions, and slash commands for productive graph database development."
keywords:
  - Claude Code
  - Geode Claude plugin
  - Claude Code LSP
  - GQL assistance
  - AI developer tooling
  - intelligent code completion
  - query optimization
  - graph database AI
  - Anthropic Claude
  - AI pair programming
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/claude/"
    title: "Claude Code Integration for Geode GQL - AI-Assisted Development"
    description: "Use Claude Code with Geode for intelligent GQL completions, query optimization, and AI-assisted graph database development."
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Claude Code Integration for Geode

Claude Code provides AI-assisted development for Geode GQL, offering intelligent completions, query optimization suggestions, schema assistance, and contextual help for building graph database applications.

## Introduction

Claude Code integrates with Geode's Language Server Protocol (LSP) to provide an enhanced development experience. The integration combines Claude's language understanding with Geode's schema awareness to deliver context-aware assistance for GQL query development.

**Key Benefits**:
- **Intelligent Completions**: Context-aware suggestions based on your graph schema
- **Query Optimization**: Real-time suggestions for improving query performance
- **Schema Understanding**: Deep integration with your graph model
- **Natural Language Queries**: Convert natural language to GQL
- **Error Explanation**: Detailed explanations of GQL errors with fixes

## Getting Started

### Prerequisites

1. **Claude Code CLI** installed and authenticated
2. **Geode server** running with LSP enabled
3. **Project configuration** with connection details

### Project Setup

Create a `CLAUDE.md` file in your project root:

```markdown
# CLAUDE.md

## Geode Configuration

This project uses Geode graph database.

- **Server**: localhost:3141
- **Database**: myapp
- **Schema**: See schema/ directory

## GQL Guidelines

- Use parameterized queries for all user input
- Prefer MATCH patterns over subqueries
- Always include LIMIT for unbounded queries
- Use indexes for filtered properties
```

### LSP Configuration

Configure the Geode LSP in your editor settings:

```json
{
  "geode.lsp.enabled": true,
  "geode.lsp.connection": "geode://localhost:3141/myapp",
  "geode.lsp.schemaSync": true,
  "geode.lsp.diagnostics": {
    "level": "warning",
    "performanceHints": true
  }
}
```

## Features

### Intelligent Code Completion

Claude Code provides context-aware completions for GQL:

```gql
-- Type "MATCH (u:" and get label suggestions from your schema
MATCH (u:User)-[:FOLLOWS]->(f)
-- Claude suggests relationship types based on User node connections

-- Property completions based on node labels
WHERE u.email = $email
-- Claude shows all User properties with types
```

**Completion Features**:
- Label suggestions from schema
- Relationship types with direction
- Property names with type hints
- Function signatures with documentation
- Clause keywords with syntax hints

### Query Optimization Suggestions

Claude analyzes queries and suggests optimizations:

```gql
-- Original query (Claude highlights performance issue)
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE p.category = 'Electronics'
RETURN u.name, p.name

-- Claude suggestion: "Add index on Product.category"
-- Claude suggestion: "Filter early by moving WHERE before traversal"

-- Optimized query
MATCH (p:Product {category: 'Electronics'})<-[:PURCHASED]-(u:User)
RETURN u.name, p.name
```

**Optimization Categories**:
- Missing index suggestions
- Filter pushdown opportunities
- Cartesian product warnings
- Unbounded traversal alerts
- Aggregation improvements

### Natural Language to GQL

Ask Claude to generate GQL from natural language:

**You**: "Find users who purchased more than 5 products last month"

**Claude**:
```gql
MATCH (u:User)-[:PURCHASED]->(p:Product)
WHERE p.purchase_date >= date() - duration('P1M')
WITH u, count(p) AS purchase_count
WHERE purchase_count > 5
RETURN u.name, u.email, purchase_count
ORDER BY purchase_count DESC
```

### Schema Assistance

Claude helps with schema design and evolution:

**You**: "How should I model a social network with posts and comments?"

**Claude** suggests:
```gql
-- Users with profiles
CREATE (u:User {
    id: $id,
    username: $username,
    email: $email,
    created_at: datetime()
})

-- Posts authored by users
CREATE (p:Post {
    id: $id,
    content: $content,
    created_at: datetime()
})
CREATE (u)-[:AUTHORED]->(p)

-- Comments as nodes for threading
CREATE (c:Comment {
    id: $id,
    content: $content,
    created_at: datetime()
})
CREATE (u)-[:WROTE]->(c)
CREATE (c)-[:ON]->(p)

-- Likes as relationships
CREATE (u)-[:LIKES {at: datetime()}]->(p)

-- Recommended indexes
CREATE INDEX user_username ON User(username)
CREATE INDEX post_created ON Post(created_at)
```

### Error Explanation

Claude provides detailed error explanations:

```gql
-- Query with error
MATCH (u:User)
WHERE u.age = "25"  -- Type mismatch error
RETURN u
```

**Claude explains**:
> **Error**: Type mismatch - comparing INTEGER property with STRING value
>
> The `age` property is defined as INTEGER in your schema, but you're comparing it with the string "25".
>
> **Fix**: Remove quotes to use an integer literal:
> ```gql
> WHERE u.age = 25
> ```
>
> **Or** use a parameter with proper typing:
> ```gql
> WHERE u.age = $age  -- Pass age as integer in parameters
> ```

## Slash Commands

Claude Code provides Geode-specific slash commands:

### /gql-explain

Explain how a query will execute:

```
/gql-explain MATCH (u:User)-[:FOLLOWS*1..3]->(f) RETURN f.name
```

Claude provides:
- Execution plan breakdown
- Estimated row counts
- Index usage analysis
- Performance recommendations

### /gql-optimize

Get optimization suggestions:

```
/gql-optimize [paste your query]
```

Claude analyzes and returns optimized version with explanations.

### /gql-schema

Generate schema documentation:

```
/gql-schema User
```

Claude returns:
- Node properties with types
- Incoming/outgoing relationships
- Constraints and indexes
- Usage examples

### /gql-test

Generate test queries for a pattern:

```
/gql-test "user follows friend who likes post"
```

Claude generates test queries with sample data setup.

## Best Practices

### Effective Prompting

**Be specific about your schema**:
```
I have User nodes with email, name, created_at properties
and FOLLOWS relationships between users.
How do I find mutual friends?
```

**Include constraints**:
```
Generate a query to find popular products.
- Must use the existing Product.view_count index
- Limit to products from the last 30 days
- Return top 10 results
```

**Ask for explanations**:
```
Why is this query slow?
[paste query]

What indexes would help?
```

### Security Considerations

- Never paste sensitive data in queries
- Use parameter placeholders when sharing examples
- Review generated queries before production use
- Verify permission checks in generated code

### Performance Tips

- Enable LSP schema sync for accurate completions
- Keep CLAUDE.md updated with project context
- Use specific node labels in questions
- Reference existing queries for style consistency

## Troubleshooting

### LSP Connection Issues

```bash
# Verify Geode LSP is running
geode lsp --status

# Check connection
geode shell --test-connection

# View LSP logs
tail -f ~/.geode/lsp.log
```

### Completion Not Working

1. Verify schema sync is enabled
2. Check LSP connection status
3. Ensure file has `.gql` extension
4. Restart LSP server

### Incorrect Suggestions

- Update CLAUDE.md with project specifics
- Provide more context in your query
- Check schema is synced
- Report persistent issues

## Related Topics

- [LSP Development](/tags/lsp/)
- [Editor Integrations](/tags/editor/)
- [VS Code Extension](/tags/vscode/)
- [Query Optimization](/tags/query-optimization/)
- [GQL Reference](/docs/gql-reference/)

## Further Reading

- [Geode LSP Guide](/docs/development/lsp-guide/)
- [GQL Best Practices](/docs/gql/guide/)
- [Query Performance Guide](/guides/query-performance/)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
