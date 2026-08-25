---
title: "VS Code Extension for Geode GQL"
description: "Comprehensive guide to the Visual Studio Code extension for Geode GQL development including syntax highlighting, Language Server Protocol (LSP) integration, intelligent auto-completion, query execution, debugging, and graph visualization."
keywords:
  - VS Code Geode extension
  - GQL syntax highlighting
  - VS Code LSP
  - Geode tooling
  - Visual Studio Code
  - GQL development
  - query execution
  - graph visualization
  - auto-completion
  - code snippets
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/vscode/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

Visual Studio Code is one of the most popular code editors for modern development, and the Geode GQL extension brings first-class graph database development support to VS Code. The extension provides comprehensive Language Server Protocol (LSP) integration, enabling intelligent auto-completion, real-time diagnostics, query execution, result visualization, and debugging capabilities directly within the editor.

Whether you are writing complex graph traversal queries, exploring database schemas, or debugging performance issues, the Geode VS Code extension transforms your editor into a powerful graph database development environment with the productivity features developers expect from modern tooling.

This guide covers installation, configuration, features, keyboard shortcuts, customization options, and best practices for productive GQL development in VS Code.

## Installation

### From VS Code Marketplace

Install the extension directly from the VS Code Marketplace:

```bash
# Install via command line
code --install-extension geodedb.geode-gql

# Or search in VS Code
# 1. Open VS Code
# 2. Press Ctrl+Shift+X (Cmd+Shift+X on macOS)
# 3. Search for "Geode GQL"
# 4. Click Install
```

### Manual Installation from VSIX

For offline installation or development builds:

```bash
# Download the VSIX file
curl -LO https://releases.geodedb.com/vscode/geode-gql-1.0.0.vsix

# Install from VSIX
code --install-extension geode-gql-1.0.0.vsix

# Or in VS Code: Extensions → ... → Install from VSIX
```

### Prerequisites

The extension requires:

- **VS Code 1.85.0** or later
- **Geode CLI** installed and accessible in PATH
- **Running Geode server** for query execution and schema introspection

```bash
# Verify Geode installation
geode --version

# Start Geode server
geode serve --listen 0.0.0.0:3141

# Verify connectivity
geode shell
geode> RETURN 'Hello, Geode!';
```

## Configuration

### Extension Settings

Configure the extension in VS Code settings (`settings.json`):

```json
{
  // Server connection
  "geode.serverPath": "/usr/local/bin/geode",
  "geode.connectionString": "quic://localhost:3141",
  "geode.defaultDatabase": "default",
  "geode.username": "",
  "geode.password": "",

  // Language Server
  "geode.lsp.enabled": true,
  "geode.lsp.logLevel": "info",
  "geode.lsp.logFile": "",

  // Diagnostics
  "geode.diagnostics.enabled": true,
  "geode.diagnostics.maxProblems": 100,
  "geode.diagnostics.debounceMs": 300,
  "geode.diagnostics.validateProperties": true,
  "geode.diagnostics.validateLabels": true,

  // Formatting
  "geode.formatting.enabled": true,
  "geode.formatting.formatOnSave": true,
  "geode.formatting.keywordCase": "UPPER",
  "geode.formatting.indentSize": 2,
  "geode.formatting.maxLineLength": 100,
  "geode.formatting.alignClauses": true,

  // Query execution
  "geode.execution.timeout": 30000,
  "geode.execution.maxRows": 1000,
  "geode.execution.autoCommit": false,

  // Visualization
  "geode.visualization.defaultView": "table",
  "geode.visualization.graphLayout": "force-directed",
  "geode.visualization.maxNodes": 500,

  // Editor
  "geode.editor.suggestLabels": true,
  "geode.editor.suggestProperties": true,
  "geode.editor.suggestFunctions": true,
  "geode.editor.showHints": true
}
```

### Workspace Configuration

Create workspace-specific settings for different projects:

```json
// .vscode/settings.json
{
  "geode.connectionString": "quic://dev-server:3141",
  "geode.defaultDatabase": "project_db",
  "[gql]": {
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "editor.insertSpaces": true
  }
}
```

### Environment-Specific Connections

Use VS Code profiles or workspace settings for different environments:

```json
// Development
{
  "geode.connectionString": "quic://localhost:3141",
  "geode.defaultDatabase": "dev"
}

// Staging
{
  "geode.connectionString": "quic://staging.example.com:3141",
  "geode.defaultDatabase": "staging"
}

// Production (read-only)
{
  "geode.connectionString": "quic://prod.example.com:3141",
  "geode.defaultDatabase": "production",
  "geode.execution.readOnly": true
}
```

## Features

### Syntax Highlighting

The extension provides context-aware syntax highlighting for GQL:

```gql
-- Keywords highlighted in purple/blue
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.active = true AND u.created_at > '2024-01-01'
RETURN f.name AS friend_name, COUNT(*) AS mutual_count
GROUP BY f.name
ORDER BY mutual_count DESC
LIMIT 10;

-- Labels highlighted in orange
CREATE (p:Product:Featured {
    name: 'Premium Widget',
    price: 99.99,
    category: 'Electronics'
});

-- Functions highlighted in yellow
MATCH (u:User)
RETURN
    UPPER(u.name) AS name_upper,
    COALESCE(u.nickname, u.name) AS display_name,
    (datetime( - u.created_at)) AS account_age;
```

### Intelligent Auto-Completion

Context-aware suggestions as you type:

```gql
-- After typing "MATCH (u:"
-- Suggestions: All labels from schema (User, Product, Order, etc.)

-- After typing "WHERE u."
-- Suggestions: All properties of User (id, name, email, created_at, etc.)

-- After typing "RETURN UPPER("
-- Suggestions: Function signature with parameter hints

-- After typing "-[:"
-- Suggestions: All relationship types (FOLLOWS, PURCHASED, VIEWED, etc.)
```

**Completion Categories**:

- **Keywords**: MATCH, WHERE, RETURN, CREATE, DELETE, SET, etc.
- **Labels**: All labels discovered from schema introspection
- **Properties**: Properties available on the current label context
- **Functions**: All GQL functions with signatures and documentation
- **Variables**: Variables bound earlier in the query
- **Relationship Types**: All relationship types from schema

### Real-Time Diagnostics

Errors and warnings appear as you type:

```gql
-- Syntax Error (red squiggly underline)
MATCH (u:User)
WHER u.email = 'test@example.com'  -- Error: Expected WHERE, got WHER
RETURN u;

-- Unknown Label Warning (yellow squiggly)
MATCH (u:UnknownLabel)  -- Warning: Label 'UnknownLabel' not found in schema
RETURN u;

-- Property Warning (yellow squiggly)
MATCH (u:User)
WHERE u.nonexistent_property = 'value'  -- Warning: Property not in schema
RETURN u;

-- Type Error (red squiggly)
MATCH (u:User)
WHERE u.age + 'string'  -- Error: Cannot add Integer + String
RETURN u;

-- Unused Variable Warning (gray)
MATCH (u:User), (p:Product)  -- Warning: Variable 'p' declared but never used
RETURN u.name;
```

### Hover Information

Hover over elements to see documentation:

```gql
MATCH (u:User)  -- Hover over :User to see label statistics
WHERE u.email LIKE '%@example.com'  -- Hover over .email to see property type
RETURN COALESCE(u.nickname, u.name);  -- Hover over COALESCE for function docs
```

**Hover Details Include**:

- **Labels**: Node count, property list, index information
- **Properties**: Data type, nullable status, index coverage
- **Functions**: Signature, description, examples, return type
- **Variables**: Type inferred from binding, properties available
- **Relationship Types**: Count, connected labels

### Go to Definition

Navigate to variable bindings and schema elements:

```gql
MATCH (user:User)-[:FOLLOWS]->(friend:User)
WHERE user.active = true
RETURN friend.name;
       ^^^^^^
       -- Ctrl+Click jumps to "(friend:User)" binding
```

**Keyboard Shortcut**: `F12` or `Ctrl+Click`

### Find All References

Locate all usages of variables, labels, or properties:

```gql
MATCH (u:User)
WHERE u.email LIKE '%@example.com'
  AND u.active = true
RETURN u.name, u.email;
       ^
       -- Right-click → Find All References
       -- Shows all 4 usages of variable 'u'
```

**Keyboard Shortcut**: `Shift+F12`

### Rename Symbol

Rename variables across the query:

```gql
-- Before rename
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.active = true
RETURN u.name, f.name;

-- After renaming 'u' to 'user' (F2)
MATCH (user:User)-[:FOLLOWS]->(f:User)
WHERE user.active = true
RETURN user.name, f.name;
```

**Keyboard Shortcut**: `F2`

### Code Formatting

Format GQL queries for consistency:

```gql
-- Before formatting
match(u:User)-[:FOLLOWS]->(f) where u.active=true and u.created_at>'2024-01-01' return f.name,count(*) as cnt group by f.name order by cnt desc limit 10;

-- After formatting (Shift+Alt+F)
MATCH (u:User)-[:FOLLOWS]->(f)
WHERE u.active = true
  AND u.created_at > '2024-01-01'
RETURN f.name, COUNT(*) AS cnt
GROUP BY f.name
ORDER BY cnt DESC
LIMIT 10;
```

**Keyboard Shortcut**: `Shift+Alt+F`

### Query Execution

Execute queries directly from the editor:

```gql
-- Execute current query
-- Keyboard: Ctrl+Enter (Cmd+Enter on macOS)
-- Or right-click → Execute Query

MATCH (u:User)
WHERE u.active = true
RETURN u.name, u.email
LIMIT 10;
```

**Execution Commands**:

| Command | Shortcut | Description |
|---------|----------|-------------|
| Execute Query | `Ctrl+Enter` | Run current query |
| Execute Selection | `Ctrl+Shift+Enter` | Run selected text |
| Explain Query | `Ctrl+E` | Show execution plan |
| Profile Query | `Ctrl+Shift+E` | Run with profiling |
| Cancel Query | `Escape` | Cancel running query |

### Result Visualization

View query results in multiple formats:

**Table View** (default):

```
┌─────────┬─────────────────┬──────────────────────────┐
│ name    │ email           │ created_at               │
├─────────┼─────────────────┼──────────────────────────┤
│ Alice   │ alice@example.com│ 2024-01-15T10:30:00Z    │
│ Bob     │ bob@example.com  │ 2024-02-20T14:45:00Z    │
│ Carol   │ carol@example.com│ 2024-03-10T09:15:00Z    │
└─────────┴─────────────────┴──────────────────────────┘
```

**Graph View** (for path queries):

```gql
MATCH path = (u:User)-[:FOLLOWS*1..3]->(f:User)
WHERE u.name = 'Alice'
RETURN path;

-- Opens interactive graph visualization:
-- - Nodes displayed with labels and properties
-- - Relationships shown as directed edges
-- - Zoom, pan, and drag controls
-- - Click node to see details
-- - Export to PNG/SVG
```

**JSON View**:

```json
[
  {
    "name": "Alice",
    "email": "alice@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### Schema Explorer

Browse database schema in the sidebar:

```
GEODE EXPLORER
├── 📊 Connections
│   └── localhost:3141 (connected)
├── 🏷️ Labels
│   ├── User (1,234 nodes)
│   │   ├── Properties
│   │   │   ├── id (Integer, indexed)
│   │   │   ├── name (String)
│   │   │   ├── email (String, unique)
│   │   │   └── created_at (Timestamp, indexed)
│   │   └── Indexes
│   │       ├── user_email_unique
│   │       └── user_created_idx
│   ├── Product (567 nodes)
│   └── Order (890 nodes)
├── 🔗 Relationships
│   ├── FOLLOWS (5,678 edges)
│   ├── PURCHASED (3,456 edges)
│   └── VIEWED (12,345 edges)
└── 📁 Saved Queries
    ├── active_users.gql
    └── popular_products.gql
```

### Code Snippets

Built-in snippets for common patterns:

| Prefix | Snippet | Description |
|--------|---------|-------------|
| `match` | MATCH pattern | Basic match query |
| `create` | CREATE node | Create node |
| `crel` | CREATE relationship | Create relationship |
| `merge` | MERGE pattern | Merge node or relationship |
| `delete` | DELETE pattern | Delete query |
| `update` | SET properties | Update properties |
| `agg` | Aggregation query | Query with COUNT, SUM, etc. |
| `path` | Path pattern | Variable-length path |
| `case` | CASE expression | Conditional expression |
| `tx` | Transaction block | BEGIN/COMMIT wrapper |

**Example Snippet Expansion**:

```gql
-- Type: match<Tab>
-- Expands to:
MATCH (n:${1:Label})
WHERE ${2:condition}
RETURN ${3:n};
```

**Custom Snippets** (`.vscode/gql.code-snippets`):

```json
{
  "Find Connected Users": {
    "prefix": "connected",
    "body": [
      "MATCH (u:User {email: '${1:email}'})-[:${2:FOLLOWS}*1..${3:3}]->(connected:User)",
      "RETURN DISTINCT connected.name, connected.email",
      "ORDER BY connected.name",
      "LIMIT ${4:10};"
    ],
    "description": "Find users connected within N hops"
  },
  "Create User": {
    "prefix": "newuser",
    "body": [
      "CREATE (u:User {",
      "  id: randomUUID(),",
      "  name: '${1:name}',",
      "  email: '${2:email}',",
      "  created_at: datetime()",
      "})",
      "RETURN u;"
    ],
    "description": "Create a new user node"
  }
}
```

## Keyboard Shortcuts

### Default Keybindings

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Execute Query | `Ctrl+Enter` | `Cmd+Enter` |
| Execute Selection | `Ctrl+Shift+Enter` | `Cmd+Shift+Enter` |
| Explain Query | `Ctrl+E` | `Cmd+E` |
| Profile Query | `Ctrl+Shift+E` | `Cmd+Shift+E` |
| Format Document | `Shift+Alt+F` | `Shift+Option+F` |
| Go to Definition | `F12` | `F12` |
| Find References | `Shift+F12` | `Shift+F12` |
| Rename Symbol | `F2` | `F2` |
| Show Hover | `Ctrl+K Ctrl+I` | `Cmd+K Cmd+I` |
| Trigger Suggestions | `Ctrl+Space` | `Cmd+Space` |
| Toggle Schema Explorer | `Ctrl+Shift+G` | `Cmd+Shift+G` |
| Connect to Server | `Ctrl+Shift+C` | `Cmd+Shift+C` |
| New Query File | `Ctrl+N` | `Cmd+N` |

### Custom Keybindings

Add custom keybindings in `keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+r",
    "command": "geode.executeQuery",
    "when": "editorLangId == gql"
  },
  {
    "key": "ctrl+shift+p",
    "command": "geode.profileQuery",
    "when": "editorLangId == gql"
  },
  {
    "key": "ctrl+shift+t",
    "command": "geode.showResultsAsTable",
    "when": "editorLangId == gql"
  },
  {
    "key": "ctrl+shift+v",
    "command": "geode.showResultsAsGraph",
    "when": "editorLangId == gql"
  }
]
```

## Debugging

### Query Debugging

Debug queries step-by-step:

1. Set breakpoints by clicking in the gutter
2. Press `F5` to start debugging
3. Step through query execution stages
4. Inspect intermediate results and variables

```gql
-- Set breakpoint on line 2
MATCH (u:User)-[:FOLLOWS]->(f:User)  -- ● Breakpoint
WHERE u.active = true
  AND f.followers_count > 100
RETURN f.name, f.followers_count
ORDER BY f.followers_count DESC;
```

**Debug Panel Shows**:

- **Query Plan**: Visual execution plan
- **Variables**: Bound variables and their values
- **Intermediate Results**: Rows at current stage
- **Statistics**: Rows processed, time elapsed
- **Indexes Used**: Which indexes are being utilized

### Debug Console Commands

```
> SHOW PLAN
  → Displays query execution plan

> SHOW VARIABLES
  → Lists all bound variables

> SHOW ROWS
  → Shows intermediate result set

> STEP
  → Advance to next execution stage

> CONTINUE
  → Run to next breakpoint or end

> EVALUATE u.name
  → Evaluate expression in current context
```

## Troubleshooting

### Common Issues

**Extension Not Loading**:

```bash
# Check VS Code version
code --version  # Requires 1.85.0+

# Check extension logs
# View → Output → Select "Geode GQL" from dropdown

# Reinstall extension
code --uninstall-extension geodedb.geode-gql
code --install-extension geodedb.geode-gql
```

**LSP Server Not Starting**:

```bash
# Verify Geode installation
which geode
geode --version

# Test LSP manually
geode lsp --stdio

# Check extension settings
# Ensure geode.serverPath is correct
```

**No Auto-Completion**:

```json
// Verify these settings are enabled
{
  "geode.lsp.enabled": true,
  "geode.diagnostics.enabled": true,
  "geode.editor.suggestLabels": true,
  "geode.editor.suggestProperties": true
}
```

**Connection Failures**:

```bash
# Test server connectivity
geode shell --host localhost --port 3141

# Check firewall rules
nc -zv localhost 3141

# Verify TLS certificates if using secure connection
openssl s_client -connect localhost:3141
```

**Slow Performance**:

```json
{
  "geode.diagnostics.maxProblems": 50,
  "geode.diagnostics.debounceMs": 500,
  "geode.visualization.maxNodes": 200
}
```

### Logging

Enable detailed logging for troubleshooting:

```json
{
  "geode.lsp.logLevel": "debug",
  "geode.lsp.logFile": "/tmp/geode-lsp.log",
  "geode.trace.server": "verbose"
}
```

View logs:

```bash
# LSP server logs
tail -f /tmp/geode-lsp.log

# VS Code extension logs
# View → Output → "Geode GQL"
```

## Best Practices

**Organize Query Files**: Use `.gql` files in version control for team collaboration.

**Use Workspace Settings**: Configure project-specific connections and settings.

**Leverage Snippets**: Create custom snippets for frequently used patterns.

**Enable Format on Save**: Ensure consistent code style across the team.

**Use Schema Explorer**: Verify labels and properties before writing queries.

**Test with EXPLAIN**: Review query plans before executing expensive queries.

**Set Appropriate Limits**: Use LIMIT during development to avoid large result sets.

**Use Transactions**: Wrap mutations in transactions for safety.

**Profile Performance**: Use Profile Query to identify bottlenecks.

**Keep Extension Updated**: Update regularly for bug fixes and new features.

## Related Topics

- [Editor Integrations](/tags/editor/) - Overview of all editor integrations
- [Neovim Plugin](/tags/neovim/) - Neovim/Vim integration
- [IDE Integration](/tags/ide/) - General IDE support
- [Plugin Development](/tags/plugin/) - Creating editor plugins
- [LSP Guide](/docs/development/lsp-guide/) - Language Server Protocol details
- [GQL Reference](/docs/gql-reference/) - GQL language reference

## Further Reading

- VS Code Extension API Documentation
- Language Server Protocol Specification
- GQL Syntax and Semantics Guide
- Query Optimization Best Practices
- Debugging Complex Graph Queries
- Team Development Workflows
