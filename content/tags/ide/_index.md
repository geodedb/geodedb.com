---
title: "IDE Integration & Language Server Protocol"
description: "Comprehensive guide to IDE integration for Geode development including Language Server Protocol (LSP), syntax highlighting, auto-completion, debugging, and editor plugins for GQL query development."
keywords:
  - IDE integration
  - Language Server Protocol
  - LSP
  - syntax highlighting
  - auto-completion
  - code editor
  - GQL editor
  - VS Code
  - IntelliJ
  - Geode
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/ide/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Modern development requires sophisticated IDE support for productivity, code quality, and developer experience. Geode provides comprehensive IDE integration through Language Server Protocol (LSP) implementation, syntax highlighting, intelligent auto-completion, real-time error checking, and debugging capabilities for GQL query development across popular editors and IDEs.

Whether you're using Visual Studio Code, IntelliJ IDEA, Vim, Emacs, or other LSP-compatible editors, Geode's tooling provides the rich development experience developers expect from enterprise database platforms.

## Language Server Protocol (LSP)

Geode implements the Language Server Protocol, providing standardized language intelligence features across all LSP-compatible editors:

**Features Provided**:

- **Syntax Highlighting**: Context-aware colorization of GQL syntax
- **Auto-Completion**: Intelligent suggestions for keywords, functions, labels, and properties
- **Diagnostics**: Real-time error and warning detection
- **Hover Information**: Documentation and type information on hover
- **Go to Definition**: Jump to label, property, or function definitions
- **Find References**: Locate all usages of labels, properties, or variables
- **Signature Help**: Parameter information for functions
- **Code Formatting**: Automatic GQL query formatting
- **Rename Refactoring**: Rename variables, labels, or properties across queries

**Starting the Language Server**:

```bash
# Start GQL language server
geode lsp --stdio

# Start with debug logging
geode lsp --stdio --log-level debug --log-file /tmp/geode-lsp.log

# Start with TCP socket (for remote editing)
geode lsp --listen 127.0.0.1:5007
```

## Visual Studio Code Integration

**Installation**:

1. Install the Geode GQL extension from VS Code Marketplace:

```bash
code --install-extension geodedb.geode-gql
```

2. Or manually from VSIX:

```bash
code --install-extension geode-gql-1.0.0.vsix
```

**Features**:

```gql
-- Auto-completion suggests labels, properties, functions
MATCH (u:User)  -- Suggests all labels including :User
WHERE u.email LIKE '%@example.com'  -- Suggests properties
RETURN UPPER(u.name);  -- Suggests UPPER, LOWER, etc.

-- Hover shows documentation
MATCH (u:User)
RETURN COUNT(u);  -- Hover over COUNT shows function signature and description

-- Error detection
MATCH (u:User)
WHERE u.nonexistent = 'value';  -- Warning: Property 'nonexistent' not found

-- Go to definition
MATCH (u:User)-[:FOLLOWS]->(f)
RETURN f.name;  -- Ctrl+Click on 'f' jumps to variable binding
```

**Configuration** (.vscode/settings.json):

```json
{
  "geode.serverPath": "/usr/local/bin/geode",
  "geode.connectionString": "geode://localhost:3141",
  "geode.enableDiagnostics": true,
  "geode.formatOnSave": true,
  "geode.maxNumberOfProblems": 100,
  "geode.trace.server": "verbose"
}
```

**Snippets**:

```json
{
  "Match Pattern": {
    "prefix": "match",
    "body": [
      "MATCH (${1:n}:${2:Label})",
      "WHERE ${3:condition}",
      "RETURN ${4:$1};"
    ]
  },
  "Create Node": {
    "prefix": "create",
    "body": [
      "CREATE (${1:n}:${2:Label} {",
      "  ${3:property}: ${4:value}",
      "});"
    ]
  }
}
```

## IntelliJ IDEA / DataGrip Integration

**Installation**:

1. Open Settings → Plugins
2. Search for "Geode GQL"
3. Click Install and restart IDE

**Features**:

- **Database Tool Window**: Visual schema explorer
- **Query Console**: Interactive GQL execution
- **Result Viewer**: Tabular and graph visualization
- **Schema Introspection**: Automatic schema discovery
- **Live Templates**: Predefined query patterns
- **SQL-like Experience**: Familiar database IDE workflow

**Configuration**:

```
File → Settings → Languages & Frameworks → Geode
  Connection String: geode://localhost:3141
  Username: admin
  Database: default
  Auto-connect: ✓
  Enable diagnostics: ✓
```

**Live Templates**:

```
Abbreviation: mtch
Template:     MATCH ($VAR$:$LABEL$)
              WHERE $CONDITION$
              RETURN $RETURN$;
```

## Vim/Neovim Integration

**Installation with vim-plug**:

```vim
" .vimrc or init.vim
Plug 'neovim/nvim-lspconfig'
Plug 'geodedb/vim-geode-gql'

" Configure LSP
lua << EOF
require'lspconfig'.geode_gql.setup{
  cmd = {'geode', 'lsp', '--stdio'},
  filetypes = {'gql'},
  root_dir = function(fname)
    return vim.fn.getcwd()
  end
}
EOF
```

**Key Mappings**:

```vim
" Auto-completion
autocmd FileType gql setlocal omnifunc=v:lua.vim.lsp.omnifunc

" Go to definition
nnoremap <silent> gd <cmd>lua vim.lsp.buf.definition()<CR>

" Hover documentation
nnoremap <silent> K <cmd>lua vim.lsp.buf.hover()<CR>

" Find references
nnoremap <silent> gr <cmd>lua vim.lsp.buf.references()<CR>

" Format query
nnoremap <silent> <leader>f <cmd>lua vim.lsp.buf.formatting()<CR>
```

**Syntax Highlighting**:

```vim
" syntax/gql.vim
syntax keyword gqlKeyword MATCH WHERE RETURN CREATE DELETE SET
syntax keyword gqlFunction COUNT SUM AVG MIN MAX
syntax match gqlLabel ":\w\+"
syntax match gqlProperty "\.\w\+"
syntax region gqlString start=/"/ skip=/\\"/ end=/"/
syntax region gqlString start=/'/ skip=/\\'/ end=/'/

highlight link gqlKeyword Keyword
highlight link gqlFunction Function
highlight link gqlLabel Type
highlight link gqlProperty Identifier
highlight link gqlString String
```

## Emacs Integration

**Installation with use-package**:

```elisp
;; .emacs or init.el
(use-package lsp-mode
  :ensure t
  :commands lsp)

(use-package geode-gql-mode
  :ensure t
  :mode "\\.gql\\'"
  :hook (geode-gql-mode . lsp))

(setq lsp-geode-server-path "geode")
(setq lsp-geode-server-args '("lsp" "--stdio"))
```

**Key Bindings**:

```elisp
(define-key geode-gql-mode-map (kbd "C-c C-c") 'geode-execute-query)
(define-key geode-gql-mode-map (kbd "C-c C-e") 'geode-explain-query)
(define-key geode-gql-mode-map (kbd "C-c C-p") 'geode-profile-query)
```

## Sublime Text Integration

**Installation**:

1. Install Package Control
2. Install LSP package: `Package Control: Install Package → LSP`
3. Install Geode GQL syntax: `Package Control: Install Package → Geode GQL`

**Configuration** (LSP.sublime-settings):

```json
{
  "clients": {
    "geode-gql": {
      "enabled": true,
      "command": ["geode", "lsp", "--stdio"],
      "selector": "source.gql",
      "schemes": ["file"]
    }
  }
}
```

## Debugging Support

**Query Execution with Breakpoints**:

```gql
-- Set breakpoint before execution
EXPLAIN
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.created_at > '2024-01-01'
RETURN f.name, COUNT(*) AS follower_count
GROUP BY f.name
ORDER BY follower_count DESC;
```

**Step-by-Step Query Execution** (VS Code):

1. Set breakpoint in .gql file
2. Press F5 to start debugging
3. Execution pauses at breakpoint
4. Inspect query execution plan
5. Step through pattern matching stages
6. View intermediate results

**Debug Console Commands**:

```
> SHOW QUERY PLAN
> SHOW VARIABLES
> SHOW INTERMEDIATE RESULTS
> SET BREAKPOINT AFTER MATCH
> CONTINUE
```

## Schema Explorer

**Visual Schema Browser** (VS Code/IntelliJ):

```
Database Explorer
├── Labels
│   ├── User
│   │   ├── Properties
│   │   │   ├── id (Integer)
│   │   │   ├── name (String)
│   │   │   ├── email (String)
│   │   │   └── created_at (Timestamp)
│   │   └── Indexes
│   │       ├── user_email_idx (email)
│   │       └── user_created_idx (created_at)
│   └── Product
│       ├── Properties
│       └── Indexes
└── Relationship Types
    ├── FOLLOWS
    ├── PURCHASED
    └── VIEWED
```

## Query Formatting

**Auto-Formatting Rules**:

```gql
-- Before formatting
match(u:User)-[:FOLLOWS]->(f) where u.active=true return f.name,count(*) as cnt group by f.name order by cnt desc limit 10;

-- After formatting (Ctrl+Shift+F)
MATCH (u:User)-[:FOLLOWS]->(f)
WHERE u.active = true
RETURN f.name, COUNT(*) AS cnt
GROUP BY f.name
ORDER BY cnt DESC
LIMIT 10;
```

**Configuration**:

```json
{
  "geode.formatting.indentSize": 2,
  "geode.formatting.keywordCase": "UPPER",
  "geode.formatting.maxLineLength": 80,
  "geode.formatting.insertSpaces": true,
  "geode.formatting.alignClauses": true
}
```

## IntelliSense and Auto-Completion

**Context-Aware Suggestions**:

```gql
-- After typing "MATCH (u:U"
Suggestions:
  - User (label, 1234 nodes)
  - UserProfile (label, 456 nodes)

-- After typing "WHERE u."
Suggestions:
  - id (Integer, indexed)
  - name (String)
  - email (String, indexed, unique)
  - active (Boolean)
  - created_at (Timestamp, indexed)

-- After typing "RETURN UP"
Suggestions:
  - UPPER(string) → String
  - UPDATE (keyword)
```

## Error Detection and Diagnostics

**Real-Time Error Checking**:

```gql
-- Syntax error (red squiggly)
MATCH (u:User)
WHRE u.email = 'alice@example.com'  -- Error: Unknown keyword 'WHRE'
RETURN u;

-- Semantic error (yellow squiggly)
MATCH (u:User)
WHERE u.nonexistent = 'value'  -- Warning: Property 'nonexistent' not in schema
RETURN u;

-- Type error (red squiggly)
MATCH (u:User)
WHERE u.created_at + 'string'  -- Error: Cannot add Timestamp + String
RETURN u;
```

## Query Result Visualization

**Graph Visualization** (VS Code extension):

```gql
MATCH path = (u:User)-[:FOLLOWS*1..3]->(f:User)
WHERE u.name = 'Alice'
RETURN path;

-- Opens interactive graph viewer:
-- Nodes rendered with labels
-- Relationships shown with arrows
-- Properties displayed on hover
-- Zoom and pan controls
-- Export to PNG/SVG
```

**Table View**:

```
┌─────────┬─────────────────┬──────────────────────────┐
│ id      │ name            │ email                    │
├─────────┼─────────────────┼──────────────────────────┤
│ 1       │ Alice Johnson   │ alice@example.com        │
│ 2       │ Bob Smith       │ bob@example.com          │
│ 3       │ Carol Williams  │ carol@example.com        │
└─────────┴─────────────────┴──────────────────────────┘
```

## Best Practices

1. **Enable Auto-Formatting**: Format queries on save for consistency
2. **Use Schema Introspection**: Let IDE discover schema automatically
3. **Leverage Snippets**: Create common query patterns as snippets
4. **Configure Key Bindings**: Set up shortcuts for execute, explain, and profile
5. **Enable Diagnostics**: Real-time error checking catches issues early
6. **Use Debugging**: Step through complex queries to understand execution
7. **Organize Queries**: Use .gql files for version control and collaboration

## Troubleshooting

**Language Server Not Starting**:

```bash
# Check server is installed
which geode

# Test server manually
geode lsp --stdio

# Check logs
tail -f /tmp/geode-lsp.log
```

**No Auto-Completion**:

```json
// Verify connection in settings
{
  "geode.connectionString": "geode://localhost:3141",
  "geode.enableDiagnostics": true
}
```

**Slow Performance**:

```json
{
  "geode.maxNumberOfProblems": 50,  // Reduce from 100
  "geode.diagnostics.debounce": 500  // Increase delay
}
```

## Related Topics

- Development Tooling and DevOps
- CLI Tools and Utilities
- Query Optimization
- Debugging and Profiling
- Schema Management
- Code Quality and Linting

## Further Reading

- Language Server Protocol Specification
- VS Code Extension Development
- IntelliJ Plugin Development
- Vim LSP Configuration
- Emacs LSP Mode
- Query Debugging Guide
- IDE Configuration Best Practices
