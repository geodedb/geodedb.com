---
title: "Neovim Plugin"
description: "Geode plugin for Neovim with LSP integration"
weight: 1
---

# Geode Neovim Plugin

Full-featured Neovim plugin for Geode GQL development with LSP integration, syntax highlighting, and query execution.

## Installation

### Using lazy.nvim

```lua
{
  'codeprosorg/geode-neovim',
  ft = 'gql',
  config = function()
    require('geode').setup({
      server = {
        host = 'localhost',
        port = 3141,
        timeout = 5000,
      },
      lsp = {
        enabled = true,
        auto_start = true,
      },
      ui = {
        results_window = 'split',
        split_direction = 'horizontal',
        split_size = 15,
      }
    })
  end
}
```

### Using packer.nvim

```lua
use {
  'codeprosorg/geode-neovim',
  ft = 'gql',
  config = function()
    require('geode').setup()
  end
}
```

## Features

### Syntax Highlighting

Comprehensive syntax highlighting for:
- GQL keywords (MATCH, CREATE, RETURN, WHERE, etc.)
- Data types (INTEGER, STRING, FLOAT, etc.)
- Built-in functions
- String literals and comments
- Path patterns and labels
- Variables and parameters

### LSP Integration

The plugin integrates with Neovim's native LSP client:

- **Auto-completion** - Complete GQL keywords, functions, and identifiers
- **Diagnostics** - Real-time error checking
- **Go to Definition** - Jump to node/relationship definitions
- **Hover Documentation** - Function and type information
- **Formatting** - Auto-format GQL queries

### Query Execution

Execute queries directly from Neovim:

```vim
" Execute query under cursor
:GeodeExecute

" Execute selected query (visual mode)
:'<,'>GeodeExecute

" Execute entire buffer
:%GeodeExecute
```

### Keymaps

Default keymaps (can be customized):

| Key | Mode | Action |
|-----|------|--------|
| `<leader>ge` | Normal | Execute query under cursor |
| `<leader>ge` | Visual | Execute selected query |
| `<leader>gr` | Normal | Show query results |
| `<leader>gs` | Normal | Show schema browser |
| `<leader>gf` | Normal | Format buffer |

### Schema Browser

Browse your graph schema:

```vim
:GeodeSchema
```

Shows:
- Node labels
- Relationship types
- Properties
- Indexes
- Constraints

## Configuration

Full configuration options:

```lua
require('geode').setup({
  server = {
    host = 'localhost',          -- Geode server host
    port = 3141,                 -- Geode server port
    timeout = 5000,              -- Connection timeout (ms)
    tls = true,                  -- Use TLS
    tls_verify = true,           -- Verify TLS certificate
  },

  lsp = {
    enabled = true,              -- Enable LSP
    auto_start = true,           -- Auto-start LSP server
    cmd = { 'geode', 'lsp' },    -- LSP command
  },

  ui = {
    results_window = 'split',    -- 'split', 'vsplit', 'tab', 'float'
    split_direction = 'horizontal', -- 'horizontal', 'vertical'
    split_size = 15,             -- Split size (lines/columns)
    border = 'rounded',          -- Border style
  },

  keymaps = {
    execute = '<leader>ge',      -- Execute query
    results = '<leader>gr',      -- Show results
    schema = '<leader>gs',       -- Schema browser
    format = '<leader>gf',       -- Format buffer
  },

  format = {
    indent = 2,                  -- Indent size
    max_width = 80,              -- Max line width
    keywords_uppercase = true,   -- Uppercase keywords
  },
})
```

## Commands

| Command | Description |
|---------|-------------|
| `:GeodeConnect` | Connect to Geode server |
| `:GeodeDisconnect` | Disconnect from server |
| `:GeodeExecute` | Execute query |
| `:GeodeSchema` | Open schema browser |
| `:GeodeFormat` | Format current buffer |
| `:GeodeResults` | Show last query results |
| `:GeodeExplain` | Show query execution plan |
| `:GeodeProfile` | Show query performance profile |

## Snippets

The plugin includes common query snippets:

- `match` - Basic MATCH pattern
- `create` - CREATE node/relationship
- `where` - WHERE clause
- `return` - RETURN clause
- `with` - WITH clause
- `foreach` - FOREACH loop

## Examples

### Execute Simple Query

```gql
-- Place cursor on this line and press <leader>ge
MATCH (p:Person) RETURN p.name, p.age
```

### Execute Complex Query

```gql
-- Select these lines in visual mode and press <leader>ge
MATCH (a:Person)-[:KNOWS]->(b:Person)
WHERE a.age > 25
RETURN a.name, collect(b.name) AS friends
ORDER BY a.name
```

### Browse Schema

Press `<leader>gs` to open the schema browser, then:
- `j/k` - Navigate
- `Enter` - Expand/collapse
- `q` - Close

## Troubleshooting

### LSP not starting

Check if Geode LSP server is available:

```bash
geode lsp --version
```

Enable debug logging:

```lua
require('geode').setup({
  lsp = {
    log_level = vim.lsp.protocol.MessageType.Log,
  }
})
```

### Connection errors

Verify server is running:

```bash
geode serve
```

Check connection settings in `:checkhealth geode`

## Repository

- GitLab: [devnw/codepros/geode/geode-neovim](https://gitlab.com/devnw/codepros/geode/geode-neovim)
- Issues: [Issue Tracker](https://gitlab.com/devnw/codepros/geode/geode-neovim/issues)
