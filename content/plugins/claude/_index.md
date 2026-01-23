---
title: "Claude Code Plugin"
description: "AI-assisted Geode development with Claude Code"
weight: 4
---

# Claude Code Plugin for Geode

Enhance your Geode development workflow with AI-assisted code generation, query optimization, and schema design using Claude Code.

## Installation

The Geode plugin for Claude Code is automatically available when you have Claude Code installed and are working in a Geode project.

### Setup

1. Ensure you have Claude Code installed
2. Navigate to your Geode project directory
3. The plugin will auto-detect based on your project structure

## Features

### Query Generation

Generate GQL queries from natural language:

```
You: "Find all people who know someone older than 30"

Claude: Here's a GQL query for that:

MATCH (p:Person)-[:KNOWS]->(friend:Person)
WHERE friend.age > 30
RETURN p.name, collect(friend.name) AS older_friends
ORDER BY p.name
```

### Query Optimization

Analyze and optimize existing queries:

```
You: "Can you optimize this query?"

Claude: I can improve this query by:
1. Adding an index on Person.age
2. Using WITH to filter early
3. Rewriting to use a more efficient path pattern

Here's the optimized version:
[optimized query]
```

### Schema Design

Get help designing your graph schema:

```
You: "I need to model a social network with users, posts, and comments"

Claude: Here's a recommended schema:

// Nodes
(:User {id, username, email, created_at})
(:Post {id, title, content, created_at})
(:Comment {id, text, created_at})

// Relationships
(:User)-[:POSTED]->(:Post)
(:User)-[:COMMENTED]->(:Comment)
(:Comment)-[:ON]->(:Post)
(:User)-[:FOLLOWS]->(:User)
(:User)-[:LIKES]->(:Post)

Would you like me to generate the CREATE statements?
```

### Code Examples

Generate complete code examples with error handling:

```
You: "Show me how to connect to Geode from Python and execute a query"

Claude: Here's a complete example with proper error handling:
[full code example with connection, query execution, and result processing]
```

## Available Commands

### `/geode-query`

Generate a GQL query from a description:

```bash
/geode-query "Find shortest path between two people"
```

### `/geode-optimize`

Analyze and optimize a query:

```bash
/geode-optimize "MATCH (n) WHERE n.age > 25 RETURN n"
```

### `/geode-schema`

Design or analyze a schema:

```bash
/geode-schema "Design a schema for an e-commerce platform"
```

### `/geode-migrate`

Generate migration scripts:

```bash
/geode-migrate "Add a 'verified' property to User nodes"
```

## Use Cases

### 1. Learning GQL

Ask Claude to explain GQL concepts:

```
"Explain the difference between MATCH and OPTIONAL MATCH"
"How do I use aggregations in GQL?"
"What's the best way to model many-to-many relationships?"
```

### 2. Debugging Queries

Get help debugging query errors:

```
"This query returns duplicate results, how do I fix it?"
"Why is my query slow?"
"I'm getting a syntax error on line 5"
```

### 3. Schema Migration

Plan and execute schema changes:

```
"I need to add a new node type called 'Organization' and link it to existing Users"
"How do I rename a property across all nodes?"
"Show me how to add constraints to my schema"
```

### 4. Performance Tuning

Optimize for performance:

```
"What indexes should I create for this query?"
"How can I make this aggregation faster?"
"Analyze the execution plan and suggest improvements"
```

### 5. Code Generation

Generate client code:

```
"Generate a Go function to create a user and their first post"
"Write a Python script to bulk import data from CSV"
"Create a Rust function for transaction handling"
```

## Best Practices

### 1. Provide Context

Include relevant schema information:

```
Given this schema:
(:Person {name, age, email})
(:Post {title, content, created_at})
(:Person)-[:AUTHORED]->(:Post)

How do I find all posts by people over 30?
```

### 2. Share Error Messages

When debugging, include the full error:

```
I'm getting this error:
"Syntax error at line 3, column 15: expected RETURN"

Here's my query:
[paste query]
```

### 3. Specify Requirements

Be clear about constraints:

```
I need a query that:
- Finds related nodes
- Returns max 10 results
- Orders by creation date
- Includes pagination
```

### 4. Ask for Explanations

Request explanations with code:

```
"Generate the query and explain each clause"
"Show me the execution plan and why it's efficient"
```

## Example Workflows

### Building a Recommendation System

```
You: "I want to build a friend recommendation system based on mutual connections"

Claude: Here's a complete solution:

1. Query to find friend-of-friend recommendations:
[GQL query with explanation]

2. Scoring algorithm:
[Weighted scoring based on mutual friends]

3. Implementation in your preferred language:
[Complete code example]

4. Optimization suggestions:
[Indexes and caching strategies]
```

### Data Migration

```
You: "I need to migrate data from PostgreSQL to Geode"

Claude: Here's a migration strategy:

1. Schema mapping:
[SQL tables → Geode nodes/relationships]

2. ETL script:
[Python script with psycopg2 and geode-client]

3. Validation queries:
[Queries to verify data integrity]

4. Performance optimization:
[Batch processing and transaction management]
```

## Integration with Editor

Claude Code works seamlessly in your editor:

1. **Inline Suggestions** - Get query suggestions as you type
2. **Code Actions** - Quick fixes and refactorings
3. **Documentation** - Hover over functions for documentation
4. **Refactoring** - Rename variables, extract patterns

## Tips

1. **Be Specific** - The more context you provide, the better the suggestions
2. **Iterate** - Refine queries through conversation
3. **Test** - Always test generated queries with your actual data
4. **Learn** - Ask Claude to explain concepts you don't understand
5. **Validate** - Review generated code for correctness and security

## Limitations

- Claude generates based on documentation and examples
- Always validate queries against your actual schema
- Test performance with realistic data volumes
- Review security implications of generated code

## Resources

- [Claude Code Documentation](https://claude.ai/code)
- [Geode GQL Reference](/docs/gql-reference/)
- [Example Queries](/docs/examples/)
