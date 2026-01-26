---
title: "Editor Plugins"
description: "Editor and IDE integrations for Geode"
weight: 3
tags:
  - plugins
  - editors
  - ide
  - tools
  - lsp
categories:
  - plugins
  - documentation
keywords:
  - Geode plugins
  - editor integrations
  - GQL syntax highlighting
  - developer tooling
  - IDE support
  - plugins
  - development-tools
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Editor & IDE Plugins

Enhance your development experience with Geode plugins for popular editors and IDEs.

## Available Plugins

- [**Neovim**](/plugins/neovim/) - Full LSP integration, syntax highlighting, query execution
- [**Vim**](/plugins/vim/) - Syntax highlighting and basic integration
- [**VSCode**](/plugins/vscode/) - Complete IDE support with IntelliSense
- [**Claude Code**](/plugins/claude/) - AI-assisted development with Claude

## Features Comparison

| Feature | Neovim | Vim | VSCode | Claude |
|---------|--------|-----|--------|--------|
| Syntax Highlighting | ✓ | ✓ | ✓ | ✓ |
| LSP Support | ✓ | - | ✓ | ✓ |
| Auto-completion | ✓ | - | ✓ | ✓ |
| Query Execution | ✓ | - | ✓ | - |
| Snippets | ✓ | - | ✓ | - |
| Status Bar | ✓ | - | ✓ | - |
| Slash Commands | - | - | - | ✓ |
| AI Assistance | - | - | - | ✓ |

## Language Server Protocol (LSP)

The Geode LSP server provides:

- **Code Completion** - Auto-complete for GQL keywords, functions, and identifiers
- **Diagnostics** - Real-time syntax and semantic error checking
- **Go to Definition** - Navigate to node/relationship definitions
- **Hover Documentation** - Inline documentation for functions and types
- **Formatting** - Automatic code formatting
- **Snippets** - Common query patterns

## Quick Start

### Neovim

```lua
-- Using lazy.nvim
{
  'devnw/geode/geode-neovim',
  url = 'https://gitlab.com/devnw/geode/geode-neovim.git',
  config = function()
    require('geode').setup({
      server = {
        host = 'localhost',
        port = 3141
      }
    })
  end
}
```

### VSCode

```bash
npm install
npm run compile
npm run package
code --install-extension geode-gql-1.0.0.vsix
```

### Claude Code

```bash
claude --plugin-dir ./claude-code-lsp-plugin
```

## GQL Syntax Highlighting

All plugins provide comprehensive syntax highlighting for:

- Keywords (MATCH, CREATE, RETURN, etc.)
- Types (INTEGER, STRING, BOOLEAN, etc.)
- Functions (count, sum, avg, etc.)
- String literals and comments
- Variables and parameters
- Path patterns

## Next Steps

- Choose your editor and follow the detailed setup guide
- Check out [GQL Tutorial](/docs/gql-tutorial/) to learn the query language
- See [Example Queries](/docs/examples/) for common patterns
