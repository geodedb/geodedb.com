---
title: "Tag: Read-Eval-Print Loop (REPL)"
description: "Explore Geode's interactive REPL shell for exploratory graph queries, rapid prototyping, debugging, and learning GQL with syntax highlighting and auto-completion."
keywords:
  - REPL
  - interactive shell
  - query development
  - GQL shell
  - command line
  - interactive mode
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/repl/"
    noindex: false
---

Geode documentation tagged with **Read-Eval-Print Loop (REPL)**. The REPL is an interactive shell that reads GQL commands, evaluates them against your database, and prints results immediately—the primary tool for exploratory analysis, query development, and learning GQL.

## Introduction to the REPL

A Read-Eval-Print Loop (REPL) is an interactive programming environment that accepts user input, executes it, and displays the result. REPLs have been fundamental to programming since the 1960s, popularized by Lisp and later adopted by languages like Python, Ruby, and JavaScript. For databases, REPLs provide immediate feedback for query development, making them essential tools for exploration and debugging.

Geode's REPL, invoked with `geode shell`, provides a rich interactive environment for working with graph data. Unlike batch query execution or programmatic access through client libraries, the REPL emphasizes immediate feedback and iterative refinement. You type a GQL query, press Enter, and see results instantly. This tight feedback loop accelerates learning, enables rapid prototyping, and makes debugging far more efficient than edit-compile-run cycles.

The Geode REPL goes beyond simple query execution to provide a comprehensive development environment. Features include syntax highlighting, auto-completion for keywords and labels, query history with search, multi-line editing for complex queries, and formatted result display with automatic table rendering. Transaction management, meta-commands for database introspection, and session persistence make the REPL suitable for both quick experiments and extended development sessions.

## Key Concepts

### Interactive Query Execution

The core REPL workflow:

1. **Prompt**: Display `geode>` prompt waiting for input
2. **Read**: Accept GQL query or meta-command from user
3. **Evaluate**: Execute query against database
4. **Print**: Display formatted results
5. **Loop**: Return to prompt for next command

### Multi-Line Editing

Complex queries span multiple lines:

```
geode> MATCH (p:Person)-[:WORKS_AT]->(c:Company)
       WHERE p.age > 30
       AND c.industry = 'Technology'
       RETURN p.name, c.name, p.salary
       ORDER BY p.salary DESC
       LIMIT 10;
```

The REPL detects incomplete statements and continues accepting input until a semicolon or empty line.

### Result Formatting

Results are displayed in readable tables:

```
geode> MATCH (p:Person) RETURN p.name, p.age LIMIT 3;

╭──────────────┬──────────╮
│ p.name       │ p.age    │
├──────────────┼──────────┤
│ Alice Smith  │ 32       │
│ Bob Johnson  │ 28       │
│ Carol Davis  │ 45       │
╰──────────────┴──────────╯

3 rows (15.2ms)
```

### Meta-Commands

Meta-commands provide database introspection:

- `\l` - List available graphs
- `\dt` - List node labels and relationship types
- `\d <label>` - Describe label properties
- `\timing on` - Enable query timing
- `\explain <query>` - Show query execution plan
- `\profile <query>` - Profile query execution
- `\history` - Show command history
- `\save <file>` - Save session to file
- `\load <file>` - Load and execute file

### Session Management

REPL sessions maintain state:

- **Transaction Context**: BEGIN/COMMIT/ROLLBACK manage transaction scope
- **Variable Binding**: Store query results for later reference
- **History**: Full command history with Up/Down arrow navigation
- **Settings**: Persistent configuration (display format, timing, etc.)

## How the REPL Works in Geode

### Starting the REPL

Launch the interactive shell:

```bash
# Start REPL connected to local server
geode shell

# Connect to remote server
geode shell --host db.example.com --port 3141

# Authenticate with username/password
geode shell --user admin --password

# Connect with TLS certificate
geode shell --cert client.crt --key client.key
```

### Query Execution Flow

When you execute a query in the REPL:

1. **Input Collection**: REPL accumulates input lines until complete statement
2. **Syntax Highlighting**: Keywords, strings, and operators highlighted in color
3. **Client Transmission**: Query sent to server via QUIC connection
4. **Server Processing**: Query parsed, optimized, and executed
5. **Result Streaming**: Results stream back to client
6. **Rendering**: REPL formats results as tables or JSON
7. **Timing Display**: Execution time displayed

### Interactive Features

The REPL provides rich editing capabilities:

- **Tab Completion**: Complete keywords, labels, properties
- **History Search**: Ctrl+R for reverse history search
- **Line Editing**: Emacs or Vi key bindings
- **Syntax Validation**: Real-time syntax checking
- **Error Display**: Detailed error messages with line/column

### Transaction Management

Manage transactions interactively:

```
geode> BEGIN;
Transaction started (txn:550e8400)

geode> INSERT (:Person {name: 'Eve', age: 29});
1 row inserted (5.2ms)

geode> MATCH (p:Person {name: 'Eve'}) RETURN p.name;
╭────────╮
│ p.name │
├────────┤
│ Eve    │
╰────────╯

geode> COMMIT;
Transaction committed (12.3ms)
```

## Use Cases

### Exploratory Data Analysis

```
geode> -- Explore graph structure
geode> MATCH (n) RETURN DISTINCT labels(n) AS label, count(*) AS count;
╭────────────┬───────╮
│ label      │ count │
├────────────┼───────┤
│ Person     │ 1523  │
│ Company    │ 245   │
│ Product    │ 3421  │
╰────────────┴───────╯

geode> -- Examine specific node
geode> MATCH (p:Person {name: 'Alice'}) RETURN p;
╭────────────────────────────────────────╮
│ p                                      │
├────────────────────────────────────────┤
│ {                                      │
│   "id": "node:12345",                  │
│   "labels": ["Person"],                │
│   "properties": {                      │
│     "name": "Alice",                   │
│     "age": 32,                         │
│     "email": "alice@example.com"       │
│   }                                    │
│ }                                      │
╰────────────────────────────────────────╯

geode> -- Find relationship patterns
geode> MATCH (p:Person)-[r]->(c:Company)
       RETURN type(r) AS rel_type, count(*) AS count
       ORDER BY count DESC;
╭──────────────┬───────╮
│ rel_type     │ count │
├──────────────┼───────┤
│ WORKS_AT     │ 1205  │
│ INVESTED_IN  │ 142   │
│ FOUNDED      │ 38    │
╰──────────────┴───────╯
```

### Query Development and Testing

```
geode> -- Test query incrementally
geode> MATCH (p:Person)
       WHERE p.age > 30
       RETURN count(*);
╭──────────╮
│ count(*) │
├──────────┤
│ 823      │
╰──────────╯

geode> -- Add more conditions
geode> MATCH (p:Person)
       WHERE p.age > 30 AND p.city = 'Seattle'
       RETURN count(*);
╭──────────╮
│ count(*) │
├──────────┤
│ 156      │
╰──────────╯

geode> -- Profile for performance
geode> \profile MATCH (p:Person)
                WHERE p.age > 30 AND p.city = 'Seattle'
                RETURN p.name, p.email;

Query Plan:
┌─ Filter (cost=0.1, rows=156)
│  └─ IndexScan (Person.city = 'Seattle')
│     └─ Filter (age > 30)
│        └─ Return (p.name, p.email)

Execution: 2.3ms (156 rows)
```

### Learning GQL

```
geode> -- Try basic MATCH patterns
geode> MATCH (n) RETURN n LIMIT 5;

geode> -- Experiment with relationships
geode> MATCH (a)-[r]->(b) RETURN a, type(r), b LIMIT 5;

geode> -- Learn aggregation
geode> MATCH (p:Person)
       RETURN p.city, count(*) AS population
       ORDER BY population DESC;

geode> -- Practice pattern matching
geode> MATCH (p:Person)-[:KNOWS]->()-[:KNOWS]->(friend)
       WHERE p.name = 'Alice'
       RETURN DISTINCT friend.name;
```

### Database Administration

```
geode> -- Check database size
geode> \dt
Labels:
  Person (1523 nodes)
  Company (245 nodes)
  Product (3421 nodes)

Relationship Types:
  WORKS_AT (1205 relationships)
  KNOWS (3421 relationships)
  PURCHASED (12456 relationships)

geode> -- View indexes
geode> SHOW INDEXES;
╭────────────────┬──────────────────┬─────────╮
│ label          │ properties       │ type    │
├────────────────┼──────────────────┼─────────┤
│ Person         │ [name]           │ BTREE   │
│ Person         │ [email]          │ UNIQUE  │
│ Product        │ [sku]            │ UNIQUE  │
│ Person         │ [embedding]      │ HNSW    │
╰────────────────┴──────────────────┴─────────╯

geode> -- Create new index
geode> CREATE INDEX person_age FOR (p:Person) ON (p.age);
Index created (234.5ms)
```

## Best Practices

### Query Development Workflow

1. **Start Simple**: Begin with basic MATCH patterns
2. **Add Incrementally**: Add WHERE clauses and filters one at a time
3. **Profile Early**: Use EXPLAIN/PROFILE to understand execution
4. **Test with LIMIT**: Use LIMIT during development to avoid large result sets
5. **Refine Performance**: Iterate based on profiling feedback

### Interactive Session Management

1. **Use Transactions**: Wrap related operations in BEGIN/COMMIT
2. **Save Work**: Use `\save` to preserve successful queries
3. **History Search**: Use Ctrl+R to find previous commands
4. **Clear Output**: Use `\clear` for long sessions
5. **Tab Completion**: Leverage auto-completion for efficiency

### Result Display Optimization

1. **Limit Results**: Always use LIMIT for unbounded queries
2. **Format Selection**: Choose JSON or table format based on data
3. **Column Width**: Adjust terminal width for readable tables
4. **Vertical Display**: Use `\x` for wide result sets
5. **Paging**: Use `\pset pager on` for long results

### Learning and Exploration

1. **Experiment Freely**: REPL is perfect for trying new syntax
2. **Use Meta-Commands**: Explore `\?` for all available commands
3. **Read Error Messages**: REPL shows detailed error information
4. **Copy Queries**: Transfer successful queries to application code
5. **Practice Daily**: Regular REPL use builds GQL fluency

## Performance Considerations

### REPL Overhead

REPL introduces minimal overhead:

- **Parsing**: Client-side syntax highlighting adds <1ms
- **Rendering**: Table formatting adds 1-5ms for typical results
- **Network**: Same QUIC protocol as programmatic clients
- **Buffering**: Results stream with low memory overhead

### Large Result Sets

Handle large results efficiently:

```
geode> -- Use LIMIT during exploration
geode> MATCH (n:Person) RETURN n LIMIT 100;

geode> -- Count before retrieving
geode> MATCH (n:Person) RETURN count(n);

geode> -- Use cursors for large exports
geode> \export persons.json
geode> MATCH (n:Person) RETURN n;
```

### Query Timing

Enable timing to monitor performance:

```
geode> \timing on
Timing is on.

geode> MATCH (p:Person {email: 'alice@example.com'}) RETURN p;
╭─────────────────────────────────╮
│ p                               │
├─────────────────────────────────┤
│ {"name": "Alice", "age": 32}    │
╰─────────────────────────────────╯

1 row (0.8ms)
```

## Troubleshooting

### Connection Issues

**Symptom**: Cannot connect to database

**Solutions**:
- Verify server is running (`geode serve`)
- Check host/port configuration
- Confirm network connectivity
- Validate TLS certificates
- Review authentication credentials

### Slow Query Performance

**Symptom**: Queries take longer than expected

**Solutions**:
- Use `\explain` to view query plan
- Check for missing indexes
- Add LIMIT to unbounded queries
- Verify network latency
- Profile with `\profile`

### Display Issues

**Symptom**: Results not displaying correctly

**Solutions**:
- Adjust terminal width
- Switch format with `\format json`
- Use vertical display `\x on`
- Check for Unicode characters
- Clear screen with `\clear`

### History Problems

**Symptom**: Command history not working

**Solutions**:
- Check history file permissions
- Verify `~/.geode_history` exists
- Clear corrupted history file
- Restart REPL session

## Related Topics

- [CLI](/tags/cli/) - Command-line interface and tools
- [Query Development](/tags/development/) - Query development workflow
- [GQL Syntax](/tags/gql-syntax/) - GQL language syntax
- [Interactive Tools](/tags/tools/) - Development tools
- [Debugging](/tags/debugging/) - Query debugging techniques
- [Query Optimization](/tags/query-optimization/) - Performance tuning

## Further Reading

- [REPL User Guide](/docs/repl-user-guide/) - Complete REPL documentation
- [GQL Quick Reference](/docs/quick-reference/) - GQL syntax cheat sheet
- [Meta-Commands Reference](/docs/meta-commands/) - All REPL commands
- [Query Development Best Practices](/docs/query-development/) - Development workflow
- [Interactive Query Tutorial](/tutorials/interactive-queries/) - Hands-on REPL tutorial
