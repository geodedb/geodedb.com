---
title: "Editor Integrations for Geode GQL"
description: "Comprehensive overview of editor and IDE integrations for Geode GQL development including Language Server Protocol support, syntax highlighting, auto-completion, and query execution across popular editors like VS Code, Neovim, Vim, Emacs, and JetBrains IDEs."
keywords:
  - Geode editor integrations
  - GQL editor support
  - IDE tooling
  - developer experience
  - LSP
  - Language Server Protocol
  - syntax highlighting
  - auto-completion
  - code editor
  - graph database development
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/editor/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

Modern development workflows demand sophisticated editor support for productivity, code quality, and developer experience. Geode provides comprehensive editor integrations through Language Server Protocol (LSP) implementations, syntax highlighting packages, intelligent auto-completion, real-time diagnostics, and query execution capabilities across all major editors and IDEs.

Whether you prefer Visual Studio Code, Neovim, classic Vim, Emacs, JetBrains IDEs, Sublime Text, or any LSP-compatible editor, Geode's tooling ecosystem ensures you have the rich development experience developers expect from enterprise database platforms.

This guide provides an overview of available editor integrations, common features, installation approaches, and guidance on choosing the right tools for your workflow.

## Available Integrations

### Visual Studio Code

The most feature-rich integration with full graphical support:

| Feature | Support |
|---------|---------|
| Syntax Highlighting | Full |
| LSP Integration | Full |
| Auto-Completion | Full |
| Diagnostics | Full |
| Hover Documentation | Full |
| Go to Definition | Full |
| Find References | Full |
| Query Execution | Full |
| Result Visualization | Table, Graph, JSON |
| Schema Explorer | Sidebar |
| Debugging | Full |
| Snippets | Built-in + Custom |

**Installation**:

```bash
code --install-extension geodedb.geode-gql
```

**Best For**: Developers who want a full-featured GUI experience with graph visualization and integrated debugging.

[Detailed VS Code Guide](/tags/vscode/)

### Neovim

Modern, Lua-based integration with native LSP support:

| Feature | Support |
|---------|---------|
| Syntax Highlighting | Tree-sitter |
| LSP Integration | Native |
| Auto-Completion | nvim-cmp |
| Diagnostics | Full |
| Hover Documentation | Full |
| Go to Definition | Full |
| Find References | Full |
| Query Execution | Full |
| Result Display | Split/Float |
| Schema Explorer | Telescope |
| Snippets | LuaSnip |

**Installation**:

```lua
-- lazy.nvim
{ "geodedb/geode.nvim", dependencies = { "nvim-lspconfig" } }
```

**Best For**: Developers who prefer modal editing, terminal workflows, and extensive customization through Lua.

[Detailed Neovim Guide](/tags/neovim/)

### Vim

Classic Vim support with omni-completion and ALE integration:

| Feature | Support |
|---------|---------|
| Syntax Highlighting | Vimscript |
| LSP Integration | vim-lsp |
| Auto-Completion | Omni-func |
| Diagnostics | ALE |
| Hover Documentation | vim-lsp |
| Query Execution | Full |
| Result Display | Split |
| Snippets | UltiSnips |

**Installation**:

```vim
Plug 'geodedb/vim-geode-gql'
```

**Best For**: Traditional Vim users who prefer stability and broad compatibility.

[Detailed Vim Guide](/tags/vim/)

### JetBrains IDEs (IntelliJ, DataGrip)

Professional IDE integration with database tooling:

| Feature | Support |
|---------|---------|
| Syntax Highlighting | Full |
| Auto-Completion | Full |
| Diagnostics | Full |
| Database Explorer | Full |
| Query Console | Full |
| Result Viewer | Table, Graph |
| Schema Introspection | Full |
| Live Templates | Full |

**Installation**: Settings → Plugins → Search "Geode GQL"

**Best For**: Teams already using JetBrains IDEs who want integrated database tooling.

### Emacs

Emacs integration via lsp-mode:

| Feature | Support |
|---------|---------|
| Syntax Highlighting | Major Mode |
| LSP Integration | lsp-mode |
| Auto-Completion | company-mode |
| Diagnostics | Flycheck |
| Query Execution | Full |

**Installation**:

```elisp
(use-package geode-gql-mode
  :ensure t
  :mode "\\.gql\\'"
  :hook (geode-gql-mode . lsp))
```

**Best For**: Emacs users who want consistent LSP integration.

### Sublime Text

Lightweight integration via LSP package:

| Feature | Support |
|---------|---------|
| Syntax Highlighting | Full |
| LSP Integration | LSP Package |
| Auto-Completion | Full |
| Diagnostics | Full |

**Installation**: Package Control → Install "Geode GQL"

**Best For**: Users who prefer a lightweight, fast editor.

### Helix

Modern terminal editor with built-in LSP:

| Feature | Support |
|---------|---------|
| Syntax Highlighting | Tree-sitter |
| LSP Integration | Built-in |
| Auto-Completion | Built-in |
| Diagnostics | Built-in |

**Configuration**:

```toml
# ~/.config/helix/languages.toml
[[language]]
name = "gql"
language-server = { command = "geode", args = ["lsp", "--stdio"] }
```

**Best For**: Users exploring modern terminal-based editors.

## Language Server Protocol (LSP)

### Overview

Geode implements the Language Server Protocol, enabling consistent language intelligence across all LSP-compatible editors. The LSP provides:

- **Syntax Highlighting**: Context-aware colorization
- **Auto-Completion**: Keywords, labels, properties, functions
- **Diagnostics**: Errors, warnings, hints
- **Hover Information**: Documentation on hover
- **Go to Definition**: Navigate to bindings
- **Find References**: Locate all usages
- **Rename Symbol**: Rename across queries
- **Code Formatting**: Automatic query formatting
- **Signature Help**: Function parameter hints

### Starting the Language Server

```bash
# Standard stdio mode (recommended)
geode lsp --stdio

# TCP socket mode (for remote editing)
geode lsp --listen 127.0.0.1:5007

# With debug logging
geode lsp --stdio --log-level debug --log-file /tmp/geode-lsp.log
```

### LSP Capabilities

```json
{
  "capabilities": {
    "textDocumentSync": {
      "openClose": true,
      "change": 2,
      "save": { "includeText": true }
    },
    "completionProvider": {
      "triggerCharacters": [".", ":", "(", "[", " "],
      "resolveProvider": true
    },
    "hoverProvider": true,
    "definitionProvider": true,
    "referencesProvider": true,
    "documentFormattingProvider": true,
    "renameProvider": { "prepareProvider": true },
    "signatureHelpProvider": {
      "triggerCharacters": ["(", ","]
    },
    "diagnosticProvider": {
      "interFileDependencies": false,
      "workspaceDiagnostics": false
    }
  }
}
```

### Connecting to Database

The LSP server connects to a Geode database for schema introspection and validation:

```json
// LSP initialization options
{
  "connection": {
    "host": "localhost",
    "port": 3141,
    "database": "default",
    "tls": false
  },
  "diagnostics": {
    "enabled": true,
    "validateLabels": true,
    "validateProperties": true,
    "validateRelationships": true
  }
}
```

## Common Features

### Syntax Highlighting

All integrations provide GQL syntax highlighting:

```gql
-- Keywords in keyword color
MATCH (user:User)-[:FOLLOWS]->(friend:User)
WHERE user.active = true
  AND user.created_at > datetime('2024-01-01')
RETURN friend.name AS friend_name,
       COUNT(*) AS mutual_friends
GROUP BY friend.name
ORDER BY mutual_friends DESC
LIMIT 10;

-- Different elements highlighted distinctly:
-- - Keywords: MATCH, WHERE, RETURN, etc.
-- - Labels: :User
-- - Relationships: :FOLLOWS
-- - Properties: .active, .created_at, .name
-- - Functions: datetime(), COUNT()
-- - Strings: '2024-01-01'
-- - Numbers: 10
-- - Comments: -- this line
```

### Auto-Completion

Context-aware suggestions:

```gql
-- After typing "MATCH (u:"
-- Completions: All labels from schema (User, Product, Order, etc.)

-- After typing "WHERE u."
-- Completions: Properties of User (id, name, email, active, etc.)

-- After typing "-[:"
-- Completions: Relationship types (FOLLOWS, PURCHASED, REVIEWED, etc.)

-- After typing "RETURN UPPER("
-- Completions: Function signature with parameter info
```

### Real-Time Diagnostics

Errors and warnings as you type:

```gql
-- Syntax Error
MATCH (u:User)
WHER u.email = 'test@example.com'  -- Error: Unknown keyword 'WHER'
RETURN u;

-- Unknown Label Warning
MATCH (u:UnknownLabel)  -- Warning: Label not found in schema
RETURN u;

-- Property Warning
MATCH (u:User)
WHERE u.nonexistent = 'value'  -- Warning: Property not in schema
RETURN u;

-- Type Error
MATCH (u:User)
WHERE u.age + 'string'  -- Error: Cannot add Integer + String
RETURN u;
```

### Query Execution

Execute queries without leaving the editor:

| Editor | Execute | Explain | Profile |
|--------|---------|---------|---------|
| VS Code | Ctrl+Enter | Ctrl+E | Ctrl+Shift+E |
| Neovim | `<leader>ge` | `<leader>gx` | `<leader>gp` |
| Vim | `<leader>ge` | `<leader>gx` | `<leader>gp` |
| IntelliJ | Ctrl+Enter | Ctrl+E | Ctrl+Shift+E |
| Emacs | C-c C-c | C-c C-e | C-c C-p |

### Code Formatting

Format queries for consistency:

```gql
-- Before formatting
match(u:User)-[:FOLLOWS]->(f) where u.active=true return f.name,count(*) as cnt group by f.name order by cnt desc;

-- After formatting
MATCH (u:User)-[:FOLLOWS]->(f)
WHERE u.active = true
RETURN f.name, COUNT(*) AS cnt
GROUP BY f.name
ORDER BY cnt DESC;
```

### Snippets

Common patterns available as snippets:

| Snippet | Expansion |
|---------|-----------|
| `match` | Basic MATCH query |
| `create` | CREATE node |
| `crel` | CREATE relationship |
| `merge` | MERGE pattern |
| `path` | Variable-length path |
| `agg` | Aggregation query |
| `case` | CASE expression |
| `tx` | Transaction block |

## Choosing an Editor

### Decision Guide

**Choose VS Code if**:

- You want graph visualization for results
- You prefer a GUI-based debugging experience
- You need extensive extension ecosystem
- You're new to GQL development

**Choose Neovim if**:

- You prefer modal editing
- You want maximum customization via Lua
- You value terminal-based workflows
- You need fast startup times

**Choose Vim if**:

- You need broad compatibility (SSH, minimal systems)
- You prefer traditional Vimscript configuration
- You have existing Vim workflows

**Choose JetBrains IDEs if**:

- You're already using IntelliJ/DataGrip
- You want integrated database tooling
- Your team uses JetBrains products

**Choose Emacs if**:

- You're an Emacs user
- You want consistent LSP integration
- You prefer Lisp-based configuration

### Feature Comparison

| Feature | VS Code | Neovim | Vim | JetBrains | Emacs |
|---------|---------|--------|-----|-----------|-------|
| LSP Support | Native | Native | Plugin | Native | Plugin |
| Tree-sitter | Yes | Yes | No | N/A | Limited |
| Graph Viz | Yes | No | No | Yes | No |
| Debugging | Yes | Limited | No | Yes | No |
| Remote Dev | Yes | Yes | Yes | Yes | Yes |
| Startup Time | Slow | Fast | Fast | Slow | Medium |
| Memory | High | Low | Low | High | Medium |

## Configuration Best Practices

### Project-Level Configuration

Create editor configuration files in your project:

```
project/
├── .vscode/
│   └── settings.json      # VS Code settings
├── .nvim.lua              # Neovim project config
├── .geode.json            # Geode connection config
└── queries/
    └── *.gql              # Query files
```

**Geode Connection Config** (`.geode.json`):

```json
{
  "connections": {
    "development": {
      "host": "localhost",
      "port": 3141,
      "database": "dev"
    },
    "staging": {
      "host": "staging.example.com",
      "port": 3141,
      "database": "staging",
      "tls": true
    }
  },
  "defaultConnection": "development",
  "formatting": {
    "keywordCase": "UPPER",
    "indentSize": 2
  }
}
```

### Team Configuration

Share consistent settings across the team:

```json
// .vscode/settings.json (committed to repo)
{
  "geode.formatting.formatOnSave": true,
  "geode.formatting.keywordCase": "UPPER",
  "geode.diagnostics.enabled": true,
  "[gql]": {
    "editor.tabSize": 2,
    "editor.formatOnSave": true
  }
}
```

### Environment-Specific Settings

Use environment variables for sensitive configuration:

```bash
# Development
export GEODE_HOST=localhost
export GEODE_PORT=3141

# Production (read-only)
export GEODE_HOST=prod.example.com
export GEODE_READ_ONLY=true
```

## Troubleshooting

### Common Issues

**LSP Not Starting**:

```bash
# Verify Geode installation
which geode
geode --version

# Test LSP manually
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' | geode lsp --stdio

# Check permissions
ls -la $(which geode)
```

**No Auto-Completion**:

- Ensure LSP is connected to database
- Check schema cache is populated
- Verify file type is detected as `gql`

**Slow Performance**:

- Reduce diagnostic debounce time
- Limit number of problems reported
- Check database connection latency

**Connection Failures**:

```bash
# Test connectivity
nc -zv localhost 3141

# Test TLS
openssl s_client -connect localhost:3141

# Check server status
geode shell -h localhost -p 3141
```

### Debug Logging

Enable verbose logging:

```bash
# LSP debug mode
geode lsp --stdio --log-level debug --log-file /tmp/geode-lsp.log

# View logs
tail -f /tmp/geode-lsp.log
```

### Getting Help

- Check editor-specific documentation
- Review LSP logs for errors
- Test with minimal configuration
- Report issues on GitHub

## Related Topics

- [VS Code Extension](/tags/vscode/) - Detailed VS Code guide
- [Neovim Plugin](/tags/neovim/) - Neovim configuration
- [Vim Plugin](/tags/vim/) - Classic Vim setup
- [IDE Integration](/tags/ide/) - IDE-specific features
- [Plugin Development](/tags/plugin/) - Creating custom plugins
- [LSP Guide](/docs/development/lsp-guide/) - LSP implementation details

## Further Reading

- Language Server Protocol Specification
- Editor-Specific Documentation
- GQL Language Reference
- Query Development Best Practices
- Team Collaboration Workflows
- Performance Optimization Guide
