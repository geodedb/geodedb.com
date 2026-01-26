---
title: "Neovim Plugin"
description: "Geode plugin for Neovim with LSP integration"
weight: 1
tags: ["neovim", "plugin", "editor", "lsp", "gql", "ide"]
categories: ["plugins", "documentation"]
keywords:
  - Geode Neovim plugin
  - GQL syntax highlighting
  - Neovim integration
  - Geode tooling
  - Graph query editor
---

<!-- CANARY: REQ=REQ-SYNTAX-VIM-002; FEATURE="VimSyntaxGeneration"; ASPECT=BuildTarget; STATUS=EXEMPT; OWNER=tooling; UPDATED=2026-01-03 -->

# Geode Neovim Plugin

A comprehensive Neovim plugin for Geode GQL development, providing LSP support, syntax highlighting, query execution, snippets, and statusline integration.

## Features

- **LSP Integration**: Diagnostics, hover docs, go-to-definition, formatting
- **Syntax Highlighting**: Full GQL/Cypher syntax support, including `--` and `//` comments
- **Query Execution**: Run the current buffer with `<F5>` or visual selection with `<leader>gr`
- **Code Snippets**: 25+ LuaSnip snippets for common query patterns
- **Server Connection**: Connect and manage Geode server sessions
- **Status Line**: Lualine integration for connection/LSP status

## Requirements

- Neovim 0.8+
- Geode installed and in `PATH`
- `nvim-lspconfig` (recommended)
- `LuaSnip` (optional, snippets)
- `nvim-cmp` (optional, completion UI)

## Installation

### lazy.nvim

```lua
{
    "devnw/geode/geode-neovim",
    url = "https://gitlab.com/devnw/geode/geode-neovim.git",
    config = function()
        require("geode").setup({
            lsp = { enabled = true },
            server = { host = "localhost", port = 3141 },
        })
    end,
    ft = { "gql", "cypher", "gcypher", "pgql" },
}
```

### packer.nvim

```lua
use {
    "devnw/geode/geode-neovim",
    url = "https://gitlab.com/devnw/geode/geode-neovim.git",
    config = function()
        require("geode").setup()
    end,
    ft = { "gql", "cypher", "gcypher", "pgql" },
}
```

### vim-plug

```vim
Plug 'https://gitlab.com/devnw/geode/geode-neovim.git'

" In your init.vim/init.lua:
lua require('geode').setup()
```

### Manual

```bash
mkdir -p ~/.local/share/nvim/site/pack/geode/start
cd ~/.local/share/nvim/site/pack/geode/start
git clone https://gitlab.com/devnw/geode/geode-neovim.git
```

## Configuration

```lua
require("geode").setup({
    lsp = {
        enabled = true,
        cmd = { "geode", "lsp" },
        filetypes = { "gql", "cypher", "gcypher", "pgql" },
    },
    server = {
        host = "localhost",
        port = 3141,
        auto_connect = false,
    },
    query = {
        timeout = 30000,
        max_results = 1000,
        output_format = "json",
    },
    ui = {
        show_diagnostics = true,
        virtual_text = true,
        signs = true,
        float_border = "rounded",
    },
    keymaps = {
        run_query = "<F5>",
        run_selection = "<leader>gr",
        explain_query = "<leader>ge",
        format_buffer = "<leader>gf",
        show_docs = "K",
    },
})
```

## Commands

| Command | Description |
|---------|-------------|
| `:GeodeRunQuery` | Execute entire buffer as GQL query |
| `:GeodeRunSelection` | Execute visual selection as query |
| `:GeodeExplain` | Show query execution plan |
| `:GeodeConnect [host:port]` | Connect to Geode server |
| `:GeodeDisconnect` | Disconnect from server |
| `:GeodeStatus` | Show connection/LSP status |
| `:GeodeRestartLsp` | Restart the LSP server |

## Snippets

Enable snippets:

```lua
require("geode.snippets").setup()
```

Common triggers: `match`, `matchw`, `create`, `merge`, `unwind`, `shortest`, `vdist`, `vknn`.

## Statusline Integration

```lua
require("lualine").setup({
    sections = {
        lualine_x = {
            require("geode").statusline,
        },
    },
})
```

## Repository

- GitLab: [devnw/geode/geode-neovim](https://gitlab.com/devnw/geode/geode-neovim)
