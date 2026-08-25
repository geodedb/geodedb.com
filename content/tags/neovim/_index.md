---
title: "Neovim Plugin for Geode GQL"
description: "Comprehensive guide to the Neovim plugin for Geode GQL development including LSP integration, Tree-sitter syntax highlighting, Telescope integration, query execution, and advanced configuration for efficient graph database development."
keywords:
  - Neovim Geode plugin
  - GQL Neovim
  - Neovim LSP
  - Tree-sitter GQL
  - Geode tooling
  - nvim-lspconfig
  - graph database Neovim
  - GQL development
  - Telescope integration
  - Lua configuration
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/neovim/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

Neovim has become the editor of choice for developers who value speed, extensibility, and keyboard-driven workflows. The Geode GQL plugin brings first-class graph database development support to Neovim through native LSP integration, Tree-sitter-powered syntax highlighting, Telescope integration for schema exploration, and seamless query execution capabilities.

Built on Neovim's modern Lua API and leveraging the Language Server Protocol, the Geode plugin provides intelligent auto-completion, real-time diagnostics, hover documentation, and code navigation while maintaining the lightning-fast performance Neovim users expect.

This guide covers installation, configuration, features, keymappings, integration with popular Neovim plugins, and best practices for productive GQL development in Neovim.

## Installation

### Prerequisites

Ensure you have the following installed:

```bash
# Neovim 0.9.0+ required
nvim --version

# Geode CLI must be in PATH
which geode
geode --version

# Optional: Node.js for some features
node --version
```

### Using lazy.nvim

The recommended package manager for Neovim:

```lua
-- ~/.config/nvim/lua/plugins/geode.lua
return {
  {
    "geodedb/geode.nvim",
    dependencies = {
      "neovim/nvim-lspconfig",
      "nvim-treesitter/nvim-treesitter",
      "nvim-lua/plenary.nvim",
      "nvim-telescope/telescope.nvim",  -- Optional
      "hrsh7th/nvim-cmp",               -- Optional
    },
    ft = { "gql" },
    config = function()
      require("geode").setup({
        -- Configuration options
      })
    end,
  },
}
```

### Using packer.nvim

```lua
-- ~/.config/nvim/lua/plugins.lua
use {
  "geodedb/geode.nvim",
  requires = {
    "neovim/nvim-lspconfig",
    "nvim-treesitter/nvim-treesitter",
    "nvim-lua/plenary.nvim",
  },
  config = function()
    require("geode").setup()
  end,
}
```

### Using vim-plug

```vim
" ~/.config/nvim/init.vim
Plug 'neovim/nvim-lspconfig'
Plug 'nvim-treesitter/nvim-treesitter', {'do': ':TSUpdate'}
Plug 'nvim-lua/plenary.nvim'
Plug 'geodedb/geode.nvim'
```

### Manual Installation

```bash
# Clone to Neovim packages directory
git clone https://github.com/geodedb/geode.nvim \
  ~/.local/share/nvim/site/pack/geode/start/geode.nvim

# Install Tree-sitter parser
nvim -c "TSInstall gql" -c "q"
```

## Configuration

### Basic Setup

```lua
-- ~/.config/nvim/lua/config/geode.lua
local geode = require("geode")

geode.setup({
  -- LSP configuration
  lsp = {
    enabled = true,
    cmd = { "geode", "lsp", "--stdio" },
    log_level = "info",
    settings = {
      diagnostics = {
        enabled = true,
        max_problems = 100,
      },
      completion = {
        enabled = true,
        suggest_labels = true,
        suggest_properties = true,
        suggest_functions = true,
      },
    },
  },

  -- Server connection
  connection = {
    host = "localhost",
    port = 3141,
    database = "default",
    tls = false,
    timeout = 30000,
  },

  -- Query execution
  execution = {
    auto_commit = false,
    max_rows = 1000,
    format_results = true,
  },

  -- UI settings
  ui = {
    results_window = "split",  -- "split", "vsplit", "float", "tab"
    results_height = 15,
    results_width = 80,
    border = "rounded",
    icons = {
      label = "",
      property = "",
      relationship = "",
      function_icon = "󰊕",
      index = "",
    },
  },

  -- Formatting
  formatting = {
    enabled = true,
    format_on_save = true,
    keyword_case = "UPPER",
    indent_size = 2,
    max_line_length = 100,
  },

  -- Keymaps (set to false to disable defaults)
  keymaps = {
    execute_query = "<leader>ge",
    execute_selection = "<leader>gs",
    explain_query = "<leader>gx",
    profile_query = "<leader>gp",
    format_query = "<leader>gf",
    toggle_results = "<leader>gr",
    schema_explorer = "<leader>gS",
    connect = "<leader>gc",
  },
})
```

### LSP Configuration

Configure the Language Server with nvim-lspconfig:

```lua
-- ~/.config/nvim/lua/config/lsp.lua
local lspconfig = require("lspconfig")
local configs = require("lspconfig.configs")

-- Define Geode GQL language server
if not configs.geode_gql then
  configs.geode_gql = {
    default_config = {
      cmd = { "geode", "lsp", "--stdio" },
      filetypes = { "gql" },
      root_dir = function(fname)
        return lspconfig.util.find_git_ancestor(fname)
          or lspconfig.util.path.dirname(fname)
      end,
      single_file_support = true,
      settings = {
        geode = {
          connection = {
            host = "localhost",
            port = 3141,
          },
          diagnostics = {
            enabled = true,
          },
        },
      },
    },
  }
end

-- Setup with capabilities
local capabilities = require("cmp_nvim_lsp").default_capabilities()

lspconfig.geode_gql.setup({
  capabilities = capabilities,
  on_attach = function(client, bufnr)
    -- Enable completion triggered by <c-x><c-o>
    vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")

    -- Keybindings
    local opts = { buffer = bufnr, noremap = true, silent = true }
    vim.keymap.set("n", "gd", vim.lsp.buf.definition, opts)
    vim.keymap.set("n", "K", vim.lsp.buf.hover, opts)
    vim.keymap.set("n", "gr", vim.lsp.buf.references, opts)
    vim.keymap.set("n", "<leader>rn", vim.lsp.buf.rename, opts)
    vim.keymap.set("n", "<leader>ca", vim.lsp.buf.code_action, opts)
    vim.keymap.set("n", "[d", vim.diagnostic.goto_prev, opts)
    vim.keymap.set("n", "]d", vim.diagnostic.goto_next, opts)
  end,
})
```

### Tree-sitter Configuration

Enable Tree-sitter for enhanced syntax highlighting:

```lua
-- ~/.config/nvim/lua/config/treesitter.lua
require("nvim-treesitter.configs").setup({
  ensure_installed = { "gql" },
  highlight = {
    enable = true,
    additional_vim_regex_highlighting = false,
  },
  indent = {
    enable = true,
  },
  incremental_selection = {
    enable = true,
    keymaps = {
      init_selection = "<CR>",
      node_incremental = "<CR>",
      scope_incremental = "<TAB>",
      node_decremental = "<BS>",
    },
  },
  textobjects = {
    select = {
      enable = true,
      lookahead = true,
      keymaps = {
        ["af"] = "@function.outer",
        ["if"] = "@function.inner",
        ["aq"] = "@query.outer",
        ["iq"] = "@query.inner",
      },
    },
    move = {
      enable = true,
      goto_next_start = {
        ["]q"] = "@query.outer",
      },
      goto_previous_start = {
        ["[q"] = "@query.outer",
      },
    },
  },
})
```

### nvim-cmp Integration

Configure auto-completion with nvim-cmp:

```lua
-- ~/.config/nvim/lua/config/cmp.lua
local cmp = require("cmp")
local luasnip = require("luasnip")

cmp.setup({
  snippet = {
    expand = function(args)
      luasnip.lsp_expand(args.body)
    end,
  },
  mapping = cmp.mapping.preset.insert({
    ["<C-b>"] = cmp.mapping.scroll_docs(-4),
    ["<C-f>"] = cmp.mapping.scroll_docs(4),
    ["<C-Space>"] = cmp.mapping.complete(),
    ["<C-e>"] = cmp.mapping.abort(),
    ["<CR>"] = cmp.mapping.confirm({ select = true }),
    ["<Tab>"] = cmp.mapping(function(fallback)
      if cmp.visible() then
        cmp.select_next_item()
      elseif luasnip.expand_or_jumpable() then
        luasnip.expand_or_jump()
      else
        fallback()
      end
    end, { "i", "s" }),
  }),
  sources = cmp.config.sources({
    { name = "nvim_lsp", priority = 1000 },
    { name = "luasnip", priority = 750 },
    { name = "buffer", priority = 500 },
    { name = "path", priority = 250 },
  }),
  formatting = {
    format = function(entry, vim_item)
      local icons = {
        Text = "",
        Method = "󰆧",
        Function = "󰊕",
        Constructor = "",
        Field = "󰜢",
        Variable = "󰀫",
        Class = "󰠱",
        Interface = "",
        Module = "",
        Property = "󰜢",
        Keyword = "󰌋",
        Snippet = "",
        Color = "󰏘",
        File = "󰈙",
        Reference = "",
        Folder = "󰉋",
        EnumMember = "",
        Constant = "󰏿",
        Struct = "",
      }
      vim_item.kind = string.format("%s %s", icons[vim_item.kind], vim_item.kind)
      vim_item.menu = ({
        nvim_lsp = "[LSP]",
        luasnip = "[Snip]",
        buffer = "[Buf]",
        path = "[Path]",
      })[entry.source.name]
      return vim_item
    end,
  },
})

-- GQL-specific completion
cmp.setup.filetype("gql", {
  sources = cmp.config.sources({
    { name = "nvim_lsp" },
    { name = "geode_labels" },
    { name = "geode_properties" },
    { name = "luasnip" },
  }),
})
```

## Features

### Syntax Highlighting

Tree-sitter provides accurate, context-aware highlighting:

```gql
-- Keywords highlighted distinctly
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.active = true
  AND u.created_at > datetime('2024-01-01')
RETURN f.name AS friend_name,
       COUNT(*) AS connection_count
GROUP BY f.name
ORDER BY connection_count DESC
LIMIT 10;

-- Labels in type color
CREATE (p:Product:Featured {
    id: uuid_v4(),
    name: 'Premium Widget',
    price: 99.99
});

-- Functions highlighted
MATCH (u:User)
RETURN UPPER(u.name),
       COALESCE(u.nickname, u.name),
       SIZE([(u)-[:FOLLOWS]->() | 1]);
```

### Auto-Completion

Context-aware completions powered by LSP:

```gql
-- After typing "MATCH (u:"
-- Completions: User, Product, Order, Category, etc.

-- After typing "WHERE u."
-- Completions: id, name, email, created_at, active, etc.

-- After typing "-[:"
-- Completions: FOLLOWS, PURCHASED, VIEWED, RATED, etc.

-- After typing "RETURN COUNT("
-- Shows function signature: COUNT(expression) -> Integer
```

### Real-Time Diagnostics

Errors and warnings appear inline:

```gql
MATCH (u:User)
WHER u.email = 'test@example.com'
-- ^ Error: Unknown keyword 'WHER'. Did you mean 'WHERE'?

MATCH (u:UnknownLabel)
--       ^^^^^^^^^^^^ Warning: Label 'UnknownLabel' not found

MATCH (u:User)
WHERE u.nonexistent = 'value'
--    ^^^^^^^^^^^^^ Warning: Property 'nonexistent' not in schema
```

View diagnostics:

```lua
-- Show all diagnostics in quickfix list
vim.diagnostic.setqflist()

-- Show diagnostics for current line
vim.diagnostic.open_float()

-- Navigate diagnostics
vim.diagnostic.goto_next()
vim.diagnostic.goto_prev()
```

### Hover Documentation

Press `K` to see documentation:

```gql
MATCH (u:User)
--       ^^^^ K shows: "Label: User, Nodes: 1,234, Properties: id, name, email, ..."

WHERE u.email LIKE '%@example.com'
--      ^^^^^ K shows: "Property: email, Type: String, Indexed: true, Unique: true"

RETURN COALESCE(u.nickname, u.name)
--     ^^^^^^^^ K shows: "COALESCE(value, default, ...) -> T
--                        Returns first non-null value from arguments"
```

### Code Navigation

**Go to Definition** (`gd`):

```gql
MATCH (user:User)-[:FOLLOWS]->(friend:User)
WHERE user.active = true
RETURN friend.name
--     ^^^^^^ gd jumps to "(friend:User)" binding
```

**Find References** (`gr`):

```gql
MATCH (u:User)
--     ^ gr shows all 4 usages of 'u' in the query
WHERE u.email LIKE '%@example.com'
  AND u.active = true
RETURN u.name, u.email;
```

**Rename Symbol** (`<leader>rn`):

```gql
-- Rename 'u' to 'user' across entire query
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.active = true
RETURN u.name, f.name;
```

### Query Execution

Execute queries directly from Neovim:

```lua
-- Execute current query
vim.keymap.set("n", "<leader>ge", function()
  require("geode").execute_query()
end)

-- Execute visual selection
vim.keymap.set("v", "<leader>gs", function()
  require("geode").execute_selection()
end)

-- Execute with EXPLAIN
vim.keymap.set("n", "<leader>gx", function()
  require("geode").explain_query()
end)

-- Execute with PROFILE
vim.keymap.set("n", "<leader>gp", function()
  require("geode").profile_query()
end)
```

Results appear in a split window:

```
┌─ Query Results ──────────────────────────────────────────┐
│ ✓ Query executed successfully (12ms, 3 rows)             │
├──────────────────────────────────────────────────────────┤
│ name          │ email                │ created_at        │
├───────────────┼──────────────────────┼───────────────────┤
│ Alice Johnson │ alice@example.com    │ 2024-01-15        │
│ Bob Smith     │ bob@example.com      │ 2024-02-20        │
│ Carol Davis   │ carol@example.com    │ 2024-03-10        │
└──────────────────────────────────────────────────────────┘
```

### Telescope Integration

Browse schema and queries with Telescope:

```lua
-- Configure Telescope extension
require("telescope").load_extension("geode")

-- Keymaps
vim.keymap.set("n", "<leader>gl", "<cmd>Telescope geode labels<CR>")
vim.keymap.set("n", "<leader>gp", "<cmd>Telescope geode properties<CR>")
vim.keymap.set("n", "<leader>gR", "<cmd>Telescope geode relationships<CR>")
vim.keymap.set("n", "<leader>gq", "<cmd>Telescope geode saved_queries<CR>")
vim.keymap.set("n", "<leader>gh", "<cmd>Telescope geode history<CR>")
```

**Telescope Pickers**:

| Command | Description |
|---------|-------------|
| `:Telescope geode labels` | Browse all labels |
| `:Telescope geode properties` | Search properties |
| `:Telescope geode relationships` | Browse relationship types |
| `:Telescope geode functions` | Search GQL functions |
| `:Telescope geode saved_queries` | Open saved queries |
| `:Telescope geode history` | Query execution history |
| `:Telescope geode connections` | Switch connections |

### Code Snippets

LuaSnip snippets for common patterns:

```lua
-- ~/.config/nvim/lua/snippets/gql.lua
local ls = require("luasnip")
local s = ls.snippet
local t = ls.text_node
local i = ls.insert_node
local c = ls.choice_node

ls.add_snippets("gql", {
  -- Basic MATCH
  s("match", {
    t("MATCH ("), i(1, "n"), t(":"), i(2, "Label"), t(")"),
    t({ "", "WHERE " }), i(3, "condition"),
    t({ "", "RETURN " }), i(4, "n"), t(";"),
  }),

  -- CREATE node
  s("create", {
    t("CREATE ("), i(1, "n"), t(":"), i(2, "Label"), t(" {"),
    t({ "", "  " }), i(3, "property"), t(": "), i(4, "value"),
    t({ "", "});" }),
  }),

  -- Path pattern
  s("path", {
    t("MATCH path = ("), i(1, "start"), t(":"), i(2, "Label"), t(")"),
    t("-[:"), i(3, "REL"), t("*"), i(4, "1..3"), t("]->("),
    i(5, "end"), t(":"), i(6, "Label"), t(")"),
    t({ "", "RETURN path;" }),
  }),

  -- Aggregation
  s("agg", {
    t("MATCH ("), i(1, "n"), t(":"), i(2, "Label"), t(")"),
    t({ "", "RETURN " }),
    c(3, {
      t("COUNT(*)"),
      t("SUM(n."),
      t("AVG(n."),
      t("MIN(n."),
      t("MAX(n."),
    }),
    t(" AS "), i(4, "result"), t(";"),
  }),
})
```

## Keybindings

### Default Keymaps

| Action | Keymap | Mode | Description |
|--------|--------|------|-------------|
| Execute Query | `<leader>ge` | n | Execute query under cursor |
| Execute Selection | `<leader>gs` | v | Execute selected text |
| Explain Query | `<leader>gx` | n | Show execution plan |
| Profile Query | `<leader>gp` | n | Execute with profiling |
| Format Query | `<leader>gf` | n | Format current buffer |
| Toggle Results | `<leader>gr` | n | Toggle results window |
| Schema Explorer | `<leader>gS` | n | Open schema explorer |
| Connect | `<leader>gc` | n | Connect to server |
| Go to Definition | `gd` | n | Jump to definition |
| Hover | `K` | n | Show hover information |
| Find References | `gr` | n | Find all references |
| Rename | `<leader>rn` | n | Rename symbol |
| Code Action | `<leader>ca` | n | Show code actions |
| Next Diagnostic | `]d` | n | Go to next diagnostic |
| Prev Diagnostic | `[d` | n | Go to previous diagnostic |

### Custom Keymaps

```lua
-- ~/.config/nvim/after/ftplugin/gql.lua
local opts = { buffer = true, noremap = true, silent = true }

-- Query execution
vim.keymap.set("n", "<C-CR>", function()
  require("geode").execute_query()
end, opts)

vim.keymap.set("v", "<C-CR>", function()
  require("geode").execute_selection()
end, opts)

-- Results navigation
vim.keymap.set("n", "<leader>rn", function()
  require("geode.results").next_page()
end, opts)

vim.keymap.set("n", "<leader>rp", function()
  require("geode.results").prev_page()
end, opts)

-- View modes
vim.keymap.set("n", "<leader>rt", function()
  require("geode.results").show_as_table()
end, opts)

vim.keymap.set("n", "<leader>rj", function()
  require("geode.results").show_as_json()
end, opts)

-- Connection management
vim.keymap.set("n", "<leader>cs", function()
  require("geode").switch_connection()
end, opts)

vim.keymap.set("n", "<leader>cd", function()
  require("geode").switch_database()
end, opts)
```

## Advanced Configuration

### Multiple Connections

Configure multiple database connections:

```lua
require("geode").setup({
  connections = {
    development = {
      host = "localhost",
      port = 3141,
      database = "dev",
      default = true,
    },
    staging = {
      host = "staging.example.com",
      port = 3141,
      database = "staging",
      tls = true,
    },
    production = {
      host = "prod.example.com",
      port = 3141,
      database = "production",
      tls = true,
      read_only = true,
    },
  },
})

-- Switch connections
vim.keymap.set("n", "<leader>c1", function()
  require("geode").use_connection("development")
end)
vim.keymap.set("n", "<leader>c2", function()
  require("geode").use_connection("staging")
end)
vim.keymap.set("n", "<leader>c3", function()
  require("geode").use_connection("production")
end)
```

### Custom Status Line

Show Geode connection status in lualine:

```lua
require("lualine").setup({
  sections = {
    lualine_x = {
      {
        function()
          local geode = require("geode")
          if geode.is_connected() then
            return " " .. geode.current_connection()
          else
            return " disconnected"
          end
        end,
        cond = function()
          return vim.bo.filetype == "gql"
        end,
        color = function()
          local geode = require("geode")
          if geode.is_connected() then
            return { fg = "#98c379" }
          else
            return { fg = "#e06c75" }
          end
        end,
      },
    },
  },
})
```

### Which-key Integration

```lua
local wk = require("which-key")

wk.register({
  ["<leader>g"] = {
    name = "Geode",
    e = { "<cmd>GeodeExecute<CR>", "Execute Query" },
    x = { "<cmd>GeodeExplain<CR>", "Explain Query" },
    p = { "<cmd>GeodeProfile<CR>", "Profile Query" },
    f = { "<cmd>GeodeFormat<CR>", "Format Query" },
    r = { "<cmd>GeodeToggleResults<CR>", "Toggle Results" },
    S = { "<cmd>GeodeSchema<CR>", "Schema Explorer" },
    c = { "<cmd>GeodeConnect<CR>", "Connect" },
    l = { "<cmd>Telescope geode labels<CR>", "Labels" },
    R = { "<cmd>Telescope geode relationships<CR>", "Relationships" },
    h = { "<cmd>Telescope geode history<CR>", "History" },
  },
}, { mode = "n" })
```

## Troubleshooting

### Common Issues

**LSP Not Starting**:

```lua
-- Check LSP status
:LspInfo

-- View LSP logs
:LspLog

-- Manually start LSP
:LspStart geode_gql
```

**No Completions**:

```lua
-- Verify nvim-cmp sources
:lua print(vim.inspect(require("cmp").get_config().sources))

-- Check LSP capabilities
:lua print(vim.inspect(vim.lsp.get_active_clients()[1].server_capabilities))
```

**Tree-sitter Not Working**:

```vim
" Check parser status
:TSInstallInfo

" Reinstall parser
:TSInstall gql

" Check highlighting
:TSHighlightCapturesUnderCursor
```

**Connection Failed**:

```lua
-- Test connection manually
:lua require("geode").test_connection()

-- Check connection settings
:lua print(vim.inspect(require("geode").get_config().connection))

-- View connection logs
:GeodeConnectionLog
```

### Debug Mode

Enable verbose logging:

```lua
require("geode").setup({
  debug = true,
  log_level = "debug",
  log_file = vim.fn.stdpath("cache") .. "/geode.log",
})

-- View logs
:edit ~/.cache/nvim/geode.log
```

## Best Practices

**Use Project-Local Config**: Create `.geode.lua` in project root for project-specific settings.

**Leverage Telescope**: Use Telescope pickers for schema exploration instead of manual queries.

**Set Up Snippets**: Create LuaSnip snippets for frequently used query patterns.

**Configure Auto-Format**: Enable format on save for consistent code style.

**Use Which-key**: Document keybindings with which-key for discoverability.

**Profile Before Execute**: Use EXPLAIN/PROFILE for complex queries before running them.

**Organize Queries**: Keep .gql files in version control for team collaboration.

**Set Read-Only for Production**: Configure production connections as read-only.

**Use Connection Switching**: Set up quick keymaps to switch between environments.

**Check Diagnostics**: Address warnings about unknown labels and properties.

## Related Topics

- [Editor Integrations](/tags/editor/) - Overview of all editor integrations
- [Vim Plugin](/tags/vim/) - Classic Vim support
- [VS Code Extension](/tags/vscode/) - VS Code integration
- [IDE Integration](/tags/ide/) - General IDE support
- [Plugin Development](/tags/plugin/) - Creating editor plugins
- [LSP Guide](/docs/development/lsp-guide/) - Language Server Protocol details

## Further Reading

- Neovim LSP Documentation
- nvim-lspconfig Configuration Guide
- Tree-sitter Query Documentation
- LuaSnip Snippet Guide
- Telescope Extension Development
- Neovim Lua API Reference
