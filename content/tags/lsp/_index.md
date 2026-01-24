---
title: "Tag: Language Server Protocol (LSP)"
description: "Explore Geode's LSP implementation for IDE integration providing syntax highlighting, auto-completion, error checking, and go-to-definition for GQL queries."
keywords:
  - LSP
  - language server
  - IDE integration
  - auto-completion
  - syntax highlighting
  - developer tools
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/lsp/"
    noindex: false
---

Geode documentation tagged with **Language Server Protocol (LSP)**. LSP is a standardized protocol for language tooling that enables IDE features like auto-completion, error checking, and refactoring across editors without requiring editor-specific implementations.

## Introduction to Language Server Protocol

The Language Server Protocol (LSP) was created by Microsoft in 2016 to solve a long-standing problem in developer tooling: implementing sophisticated language features for every editor/language combination required M × N implementations. With LSP, a single language server can provide features to any LSP-compliant editor, reducing the implementation burden from M × N to M + N. This architectural shift has enabled rich IDE experiences across VS Code, Vim, Emacs, Sublime Text, and many other editors.

For query languages like GQL, LSP integration transforms the development experience. Rather than writing queries in plain text and discovering syntax errors at execution time, developers get immediate feedback as they type. Auto-completion suggests table names, column names, and functions. Hover tooltips display documentation. Go-to-definition jumps to label definitions. These features, commonplace for programming languages, dramatically improve productivity when working with database queries.

Geode's LSP server provides comprehensive GQL language support to any LSP-compatible editor. The server understands GQL syntax, connects to your database to fetch schema information, and provides intelligent suggestions based on your actual graph structure. Whether you write queries in VS Code, Vim, or any other modern editor, you get the same high-quality development experience with syntax validation, smart auto-completion, and real-time error checking.

## Key Concepts

### Language Server Architecture

LSP uses a client-server architecture:

```
┌─────────────┐                    ┌─────────────────┐
│   Editor    │  JSON-RPC/stdio    │  Language       │
│   (Client)  │<------------------>│  Server         │
│             │                    │  (Geode LSP)    │
└─────────────┘                    └─────────────────┘
                                           │
                                           │ QUIC
                                           ▼
                                   ┌─────────────────┐
                                   │  Geode          │
                                   │  Database       │
                                   └─────────────────┘
```

- **Client**: Editor plugin that implements LSP client protocol
- **Server**: Geode LSP server that provides language intelligence
- **Communication**: JSON-RPC messages over stdin/stdout
- **Database Connection**: LSP server connects to Geode for schema info

### LSP Capabilities

The protocol defines standard capabilities:

- **textDocument/completion**: Auto-completion suggestions
- **textDocument/hover**: Hover tooltips with documentation
- **textDocument/definition**: Go-to-definition navigation
- **textDocument/references**: Find all references
- **textDocument/documentSymbol**: Document outline
- **textDocument/formatting**: Code formatting
- **textDocument/diagnostics**: Real-time error checking
- **textDocument/codeAction**: Quick fixes and refactorings

### Document Synchronization

LSP tracks document state:

- **didOpen**: Editor opens a GQL file
- **didChange**: User edits the document
- **didSave**: User saves changes
- **didClose**: Editor closes the document

The server maintains a synchronized copy of each document to provide accurate suggestions.

### Schema-Aware Features

Geode's LSP server uses database schema for intelligent suggestions:

- **Label Completion**: Suggests available node labels
- **Property Completion**: Suggests properties for specific labels
- **Relationship Types**: Suggests valid relationship types
- **Function Signatures**: Shows parameter lists for functions
- **Index Hints**: Suggests indexes for query optimization

## How LSP Works in Geode

### Installation and Setup

Install the Geode LSP server:

```bash
# Install globally
npm install -g @geodedb/language-server

# Or use with editor plugin (VS Code example)
code --install-extension geodedb.gql-language-server
```

Configure connection to your database:

```json
// .vscode/settings.json
{
  "gql.server.host": "localhost",
  "gql.server.port": 3141,
  "gql.server.database": "mydb",
  "gql.server.tls": true,
  "gql.validation.enabled": true,
  "gql.completion.autoComplete": true
}
```

### Auto-Completion

The LSP server provides context-aware suggestions:

```gql
MATCH (p:Pe|
         ^^
         Person       [label]
         Product      [label]
         Pet          [label]
```

After selecting a label, property suggestions appear:

```gql
MATCH (p:Person {na|
                  ^^
                  name          [property: STRING]
                  nationality   [property: STRING]
```

Relationship type completion:

```gql
MATCH (p:Person)-[:WO|
                   ^^
                   WORKS_AT      [relationship type]
                   WORKED_WITH   [relationship type]
```

### Error Checking

Real-time diagnostics highlight issues:

```gql
MATCH (p:Person)
WHERE p.age > 'thirty'
          ^^^^^^^^
Error: Type mismatch: cannot compare INTEGER with STRING
```

```gql
MATCH (p:UnknownLabel)
         ^^^^^^^^^^^^
Warning: Label 'UnknownLabel' does not exist in schema
```

### Hover Documentation

Hovering over keywords shows documentation:

```gql
MATCH (n:Person)
^^^^^
MATCH clause: Specify graph patterns to match against the database.
Syntax: MATCH <pattern> [WHERE <condition>]
```

Hovering over properties shows type information:

```gql
RETURN p.email
         ^^^^^
Property: email
Type: STRING
Indexed: UNIQUE BTREE
Description: User's email address (unique identifier)
```

### Go-to-Definition

Jump to label or property definitions:

```gql
MATCH (p:Person)  // Ctrl+Click on "Person" jumps to schema definition
      ^^^^^^

-- Jump to:
CREATE LABEL Person (
  id INTEGER PRIMARY KEY,
  name STRING NOT NULL,
  email STRING UNIQUE,
  age INTEGER
);
```

### Query Formatting

Auto-format GQL queries:

```gql
// Before formatting
MATCH(p:Person)-[:KNOWS]->(f)WHERE p.age>30RETURN p.name,f.name

// After formatting (Shift+Alt+F)
MATCH (p:Person)-[:KNOWS]->(f)
WHERE p.age > 30
RETURN p.name, f.name
```

## Use Cases

### VS Code Integration

```json
// .vscode/settings.json
{
  "gql.server.host": "localhost",
  "gql.server.port": 3141,
  "gql.validation.enabled": true,
  "gql.completion.autoComplete": true,
  "gql.format.enable": true,
  "gql.hover.documentation": true,
  "gql.trace.server": "verbose"
}
```

Create GQL file and get full IDE support:

```gql
// queries.gql - Full LSP support enabled
MATCH (p:Person)-[:WORKS_AT]->(c:Company)
WHERE p.age > $minAge
  AND c.industry = $industry
RETURN p.name AS employee,
       c.name AS company,
       p.salary AS salary
ORDER BY p.salary DESC
LIMIT 10
```

### Vim/Neovim Integration

```lua
-- init.lua
require('lspconfig').geode_gql.setup({
  cmd = { 'geode-language-server', '--stdio' },
  filetypes = { 'gql', 'geode' },
  root_dir = require('lspconfig').util.root_pattern('.git'),
  settings = {
    geode = {
      server = {
        host = 'localhost',
        port = 3141
      },
      validation = {
        enabled = true
      }
    }
  }
})
```

### Emacs Integration

```elisp
;; init.el
(use-package lsp-mode
  :hook ((gql-mode . lsp))
  :config
  (lsp-register-client
   (make-lsp-client
    :new-connection (lsp-stdio-connection "geode-language-server")
    :major-modes '(gql-mode)
    :server-id 'geode-gql)))

(setq lsp-geode-server-host "localhost")
(setq lsp-geode-server-port 3141)
```

### Jupyter Notebook Integration

```python
# Enable LSP in Jupyter cells with %%gql magic
%load_ext geode_jupyter

%%gql
MATCH (p:Person)
WHERE p.age > 30  # Auto-completion works here!
RETURN p.name, p.email
```

## Best Practices

### Editor Configuration

1. **Enable All Features**: Turn on validation, completion, and formatting
2. **Configure Connection**: Set database connection parameters
3. **File Associations**: Associate `.gql` files with GQL language mode
4. **Keybindings**: Set up convenient shortcuts for common operations
5. **Diagnostics Level**: Configure warning/error severity

### Query Development

1. **Let LSP Guide**: Follow auto-completion suggestions
2. **Fix Errors Early**: Address red squiggles immediately
3. **Use Hover**: Read documentation without leaving editor
4. **Format Frequently**: Format queries for consistency
5. **Navigate with LSP**: Use go-to-definition for exploration

### Schema Management

1. **Keep Schema Updated**: LSP reflects current database schema
2. **Reload After Changes**: Refresh LSP after schema modifications
3. **Document Schema**: Add comments that appear in hover tooltips
4. **Use Type Hints**: Leverage type information for correctness

### Performance Optimization

1. **Lazy Loading**: Configure LSP to load schema on demand
2. **Cache Settings**: Enable schema caching for large databases
3. **Selective Completion**: Limit suggestions for very large schemas
4. **Debounce Validation**: Adjust validation debounce time

## Performance Considerations

### Startup Time

LSP server initialization is fast:

- **Server Start**: 100-300ms cold start
- **Schema Loading**: 50-200ms depending on schema size
- **First Completion**: <10ms after initialization
- **Incremental Updates**: <5ms for document changes

### Memory Usage

LSP server is lightweight:

- **Base Memory**: ~50MB for server process
- **Schema Cache**: ~1-5MB for typical schemas
- **Document State**: ~10KB per open document
- **Total**: <100MB for typical usage

### Completion Performance

Auto-completion is very responsive:

- **Keyword Completion**: <1ms (pre-computed)
- **Label Completion**: 1-5ms (schema lookup)
- **Property Completion**: 2-10ms (filtered by label)
- **Complex Queries**: <20ms even with large schemas

## Troubleshooting

### LSP Server Not Starting

**Symptom**: Editor shows "Language server failed to start"

**Solutions**:
- Verify `geode-language-server` is in PATH
- Check server logs in editor output panel
- Confirm Node.js version >= 16
- Test server manually: `geode-language-server --stdio`
- Review editor's LSP configuration

### No Auto-Completion

**Symptom**: Auto-completion not appearing

**Solutions**:
- Verify file has `.gql` extension
- Check LSP client is enabled for GQL files
- Confirm database connection settings
- Test schema loading: hover over existing label
- Restart LSP server

### Incorrect Suggestions

**Symptom**: Wrong or outdated suggestions

**Solutions**:
- Refresh schema cache
- Verify LSP connected to correct database
- Check for schema changes not yet loaded
- Clear LSP cache and restart
- Review database connection status

### Performance Issues

**Symptom**: Slow auto-completion or validation

**Solutions**:
- Enable schema caching
- Increase debounce time for validation
- Limit completion result count
- Check network latency to database
- Review LSP trace logs for bottlenecks

## Related Topics

- [IDE Integration](/tags/ide/) - Editor and IDE features
- [Developer Tools](/tags/tools/) - Development tooling
- [GQL Syntax](/tags/gql-syntax/) - GQL language syntax
- [Query Development](/tags/development/) - Query development workflow
- [Productivity](/tags/productivity/) - Developer productivity
- [Tooling](/tags/tooling/) - Development tools ecosystem

## Implementation Details

### Language Server Architecture

Geode's LSP server implements the full LSP specification:

```
┌──────────────────────────────────────────────┐
│ Editor (VS Code, Vim, Emacs, etc.)          │
│  - UI rendering                              │
│  - User input handling                       │
│  - LSP client implementation                 │
└────────────────┬─────────────────────────────┘
                 │ JSON-RPC over stdio/socket
┌────────────────▼─────────────────────────────┐
│ Geode Language Server                        │
│  ┌──────────────────────────────────────┐    │
│  │ Protocol Handler                     │    │
│  │  - Message routing                   │    │
│  │  - Request/response matching         │    │
│  └────────────┬─────────────────────────┘    │
│               │                               │
│  ┌────────────▼─────────────────────────┐    │
│  │ Document Manager                     │    │
│  │  - Tracks open documents             │    │
│  │  - Synchronizes changes              │    │
│  │  - Caches parsed ASTs                │    │
│  └────────────┬─────────────────────────┘    │
│               │                               │
│  ┌────────────▼─────────────────────────┐    │
│  │ GQL Parser & Analyzer                │    │
│  │  - Lexical analysis                  │    │
│  │  - Syntax parsing                    │    │
│  │  - Semantic analysis                 │    │
│  │  - Type checking                     │    │
│  └────────────┬─────────────────────────┘    │
│               │                               │
│  ┌────────────▼─────────────────────────┐    │
│  │ Schema Provider                      │    │
│  │  - Connects to Geode database        │    │
│  │  - Caches schema information         │    │
│  │  - Provides label/property metadata  │    │
│  └────────────┬─────────────────────────┘    │
│               │                               │
│  ┌────────────▼─────────────────────────┐    │
│  │ Feature Providers                    │    │
│  │  - Completion                        │    │
│  │  - Hover                             │    │
│  │  - Definition                        │    │
│  │  - Diagnostics                       │    │
│  │  - Formatting                        │    │
│  └──────────────────────────────────────┘    │
└──────────────┬───────────────────────────────┘
               │ QUIC/TLS
┌──────────────▼───────────────────────────────┐
│ Geode Database Server                        │
│  - Schema metadata                           │
│  - Index information                         │
│  - Query validation                          │
└──────────────────────────────────────────────┘
```

### Completion Provider Implementation

```typescript
// Simplified TypeScript pseudocode
class CompletionProvider {
  async provideCompletionItems(
    document: TextDocument,
    position: Position
  ): Promise<CompletionItem[]> {
    const line = document.lineAt(position.line).text;
    const context = this.getContext(line, position.character);

    if (context.type === 'LABEL') {
      // Provide label completions
      const labels = await this.schemaProvider.getLabels();
      return labels.map(label => ({
        label: label.name,
        kind: CompletionItemKind.Class,
        detail: `Label with ${label.propertyCount} properties`,
        documentation: label.description,
        insertText: label.name
      }));
    }

    if (context.type === 'PROPERTY') {
      // Provide property completions for specific label
      const properties = await this.schemaProvider.getProperties(
        context.labelName
      );
      return properties.map(prop => ({
        label: prop.name,
        kind: CompletionItemKind.Property,
        detail: `${prop.type}${prop.nullable ? ' | null' : ''}`,
        documentation: prop.description,
        insertText: prop.name
      }));
    }

    if (context.type === 'RELATIONSHIP_TYPE') {
      // Provide relationship type completions
      const types = await this.schemaProvider.getRelationshipTypes();
      return types.map(type => ({
        label: type.name,
        kind: CompletionItemKind.Reference,
        detail: `${type.fromLabel} -> ${type.toLabel}`,
        documentation: type.description,
        insertText: type.name
      }));
    }

    // Default: GQL keywords
    return this.getKeywordCompletions(context);
  }

  private getKeywordCompletions(context: Context): CompletionItem[] {
    const keywords = [
      'MATCH', 'WHERE', 'RETURN', 'CREATE', 'DELETE', 'SET',
      'MERGE', 'WITH', 'ORDER BY', 'LIMIT', 'SKIP', ...
    ];

    return keywords
      .filter(kw => kw.startsWith(context.prefix.toUpperCase()))
      .map(kw => ({
        label: kw,
        kind: CompletionItemKind.Keyword,
        insertText: kw + ' '
      }));
  }
}
```

### Diagnostic Provider Implementation

```typescript
class DiagnosticProvider {
  async provideDiagnostics(
    document: TextDocument
  ): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    try {
      // Parse query
      const ast = this.parser.parse(document.getText());

      // Validate against schema
      const schemaErrors = await this.validateSchema(ast);
      diagnostics.push(...schemaErrors);

      // Type checking
      const typeErrors = this.checkTypes(ast);
      diagnostics.push(...typeErrors);

      // Best practices warnings
      const warnings = this.checkBestPractices(ast);
      diagnostics.push(...warnings);

    } catch (syntaxError) {
      // Syntax error from parser
      diagnostics.push({
        range: this.getErrorRange(syntaxError),
        message: syntaxError.message,
        severity: DiagnosticSeverity.Error,
        source: 'gql-parser'
      });
    }

    return diagnostics;
  }

  private async validateSchema(ast: ASTNode): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];

    for (const node of ast.matchClauses) {
      if (node.label) {
        // Check if label exists
        const labelExists = await this.schemaProvider.hasLabel(
          node.label
        );
        if (!labelExists) {
          diagnostics.push({
            range: node.labelRange,
            message: `Label '${node.label}' does not exist in schema`,
            severity: DiagnosticSeverity.Warning,
            source: 'gql-schema',
            code: 'unknown-label'
          });
        }
      }

      // Check properties
      for (const prop of node.properties) {
        const propExists = await this.schemaProvider.hasProperty(
          node.label,
          prop.name
        );
        if (!propExists) {
          diagnostics.push({
            range: prop.range,
            message: `Property '${prop.name}' does not exist on label '${node.label}'`,
            severity: DiagnosticSeverity.Error,
            source: 'gql-schema',
            code: 'unknown-property'
          });
        }
      }
    }

    return diagnostics;
  }

  private checkTypes(ast: ASTNode): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Type check comparisons
    for (const comparison of ast.comparisons) {
      const leftType = this.inferType(comparison.left);
      const rightType = this.inferType(comparison.right);

      if (!this.typesCompatible(leftType, rightType)) {
        diagnostics.push({
          range: comparison.range,
          message: `Type mismatch: cannot compare ${leftType} with ${rightType}`,
          severity: DiagnosticSeverity.Error,
          source: 'gql-type-checker',
          code: 'type-mismatch'
        });
      }
    }

    return diagnostics;
  }

  private checkBestPractices(ast: ASTNode): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Check for unbounded traversals
    for (const pattern of ast.patterns) {
      if (pattern.isVariableLength && !pattern.hasMaxDepth) {
        diagnostics.push({
          range: pattern.range,
          message: 'Unbounded variable-length pattern may cause performance issues',
          severity: DiagnosticSeverity.Warning,
          source: 'gql-best-practices',
          code: 'unbounded-traversal'
        });
      }
    }

    // Check for missing LIMIT
    if (!ast.hasLimit && ast.matchClauses.length > 0) {
      diagnostics.push({
        range: ast.range,
        message: 'Consider adding LIMIT clause to bound result set',
        severity: DiagnosticSeverity.Hint,
        source: 'gql-best-practices',
        code: 'missing-limit'
      });
    }

    return diagnostics;
  }
}
```

### Schema Caching Strategy

```typescript
class SchemaProvider {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  async getLabels(): Promise<Label[]> {
    const cacheKey = 'labels';

    if (this.isCached(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    // Fetch from database
    const labels = await this.client.execute(`
      SHOW LABELS
    `);

    this.cache.set(cacheKey, {
      data: labels,
      timestamp: Date.now()
    });

    return labels;
  }

  async getProperties(label: string): Promise<Property[]> {
    const cacheKey = `properties:${label}`;

    if (this.isCached(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    const properties = await this.client.execute(`
      SHOW PROPERTIES FOR (:${label})
    `);

    this.cache.set(cacheKey, {
      data: properties,
      timestamp: Date.now()
    });

    return properties;
  }

  invalidateCache() {
    this.cache.clear();
  }

  private isCached(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    if (age > this.cacheTimeout) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}
```

## Advanced IDE Features

### Inlay Hints

Display inferred types inline:

```gql
MATCH (u:User)-[:PURCHASED]->(p:Product)
      ^^User              ^^Product
WHERE p.price > 100
        ^^number
WITH u, count(p) AS purchase_count
            ^^number
RETURN u.name, purchase_count
         ^^string  ^^number
```

### Code Actions (Quick Fixes)

Provide automated fixes for common issues:

```gql
// Before: unbounded traversal
MATCH (u:User)-[:KNOWS*]->(friend)
                       ▲
                       Quick fix: Add depth limit

// After: quick fix applied
MATCH (u:User)-[:KNOWS*1..3]->(friend)
```

```typescript
class CodeActionProvider {
  async provideCodeActions(
    document: TextDocument,
    range: Range,
    context: CodeActionContext
  ): Promise<CodeAction[]> {
    const actions: CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.code === 'unbounded-traversal') {
        actions.push({
          title: 'Add depth limit (1..3)',
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          edit: {
            changes: {
              [document.uri]: [{
                range: diagnostic.range,
                newText: this.addDepthLimit(diagnostic.range, '1..3')
              }]
            }
          }
        });
      }

      if (diagnostic.code === 'missing-limit') {
        actions.push({
          title: 'Add LIMIT clause',
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          edit: {
                changes: {
              [document.uri]: [{
                range: new Range(document.lineCount, 0, document.lineCount, 0),
                newText: '\nLIMIT 100;'
              }]
            }
          }
        });
      }
    }

    return actions;
  }
}
```

### Semantic Highlighting

Syntax highlighting based on semantic meaning:

```gql
MATCH (u:User {id: $user_id})-[:PURCHASED]->(p:Product)
      ▲         ▲          ▲               ▲          ▲
      │         │          │               │          │
   variable   label    property      relationship   label
   (blue)    (green)  (yellow)      (purple)       (green)

WHERE p.price > 100
      ▲       ▲ ▲ ▲
      │       │ │ │
   variable  │ │ number
           property operator (literal)

RETURN u.name AS user_name
       ▲      ▲▲ ▲
       │      ││ │
    variable  ││ alias
           property keyword
```

### Workspace Symbol Search

Find symbols across all GQL files:

```
Ctrl+T → "User"

Results:
  ┌────────────────────────────────────────┐
  │ (:User) - queries/users.gql:1         │
  │ (:User:Admin) - queries/admin.gql:15  │
  │ user_events - streams/events.gql:42   │
  └────────────────────────────────────────┘
```

## Further Reading

- [LSP Specification](https://microsoft.github.io/language-server-protocol/) - Official LSP documentation
- [Geode LSP Setup Guide](/docs/lsp-setup/) - Installation and configuration
- [Editor Integration Guide](/docs/editor-integration/) - Editor-specific setup
- [GQL Language Reference](/docs/gql-reference/) - Complete GQL documentation
- [Developer Tools Overview](/docs/developer-tools/) - Geode development tooling
- [Language Server Implementation Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide) - VS Code LSP guide
- [Tree-sitter GQL Grammar](https://github.com/tree-sitter/tree-sitter-gql) - Parser implementation
