---
title: "Vim Plugin"
description: "Vim plugin for Geode GQL syntax highlighting and basic features"
weight: 2
tags: ["vim", "plugin", "editor", "gql-syntax"]
categories: ["plugins", "documentation"]
keywords:
  - Geode Vim plugin
  - GQL syntax highlighting
  - Vim integration
  - Geode tooling
  - Graph query editor
---

<!-- CANARY: REQ=REQ-SYNTAX-VIM-002; FEATURE="VimSyntaxGeneration"; ASPECT=BuildTarget; STATUS=EXEMPT; OWNER=tooling; UPDATED=2026-01-03 -->

# Vim Plugin for Geode GQL

Syntax highlighting and filetype detection for Geode's GQL and Cypher-compatible files in Vim.

## Features

- **Syntax Highlighting** for GQL/Cypher keywords, types, functions, and operators
- **Filetype Detection** for `.gql` and `.geode`
- **Comment Support** for `--`, `//`, and `/* */`

## Installation

### vim-plug

```vim
Plug 'devnw/geode/geode-vim'
```

### Vundle

```vim
Plugin 'devnw/geode/geode-vim'
```

### Native Packages (Vim 8+)

```bash
mkdir -p ~/.vim/pack/geode/start
cd ~/.vim/pack/geode/start
git clone https://gitlab.com/devnw/geode/geode-vim.git
```

### Manual

```bash
git clone https://gitlab.com/devnw/geode/geode-vim.git
cp -r geode-vim/syntax ~/.vim/
cp -r geode-vim/ftdetect ~/.vim/
```

## Usage

Open any `.gql` or `.geode` file and Vim will detect the filetype automatically. To set manually:

```vim
:set filetype=gql
```

## Supported Keywords

### Query Clauses
`MATCH`, `OPTIONAL`, `WHERE`, `RETURN`, `WITH`, `ORDER BY`, `SKIP`, `LIMIT`, `UNION`, `INTERSECT`, `EXCEPT`, `UNWIND`, `CALL`, `YIELD`

### Data Modification
`CREATE`, `MERGE`, `DELETE`, `DETACH DELETE`, `SET`, `REMOVE`, `INSERT`

### DDL
`CREATE GRAPH`, `DROP GRAPH`, `CREATE INDEX`, `DROP INDEX`, `CONSTRAINT`, `SCHEMA`

### Transactions
`BEGIN`, `COMMIT`, `ROLLBACK`, `TRANSACTION`

### Data Types
`INTEGER`, `FLOAT`, `STRING`, `BOOLEAN`, `DATE`, `TIME`, `DATETIME`, `DURATION`, `POINT`, `VECTOR`, `UUID`, `BYTES`, `JSON`, `LIST`, `MAP`

## File Extensions

| Extension | Filetype |
|-----------|----------|
| `.gql` | gql |
| `.geode` | gql |

## Highlight Groups

| Group | Description |
|-------|-------------|
| `gqlKeyword` | Query clauses and keywords |
| `gqlBoolean` | Boolean and logical operators |
| `gqlDDL` | Data definition keywords |
| `gqlTransaction` | Transaction keywords |
| `gqlAggregate` | Aggregation functions |
| `gqlFunction` | Scalar and built-in functions |
| `gqlType` | Data types |
| `gqlComment` | Comments |
| `gqlString` | String literals |
| `gqlNumber` | Numeric literals |
| `gqlVariable` | Parameter variables (`$name`) |
| `gqlLabel` | Node/relationship labels (`:Label`) |
| `gqlOperator` | Operators |

## Repository

- GitLab: [devnw/geode/geode-vim](https://gitlab.com/devnw/geode/geode-vim)

## Color Schemes

The plugin works with any Vim color scheme. Recommended schemes for GQL:

- **gruvbox**: Warm, retro color scheme
- **nord**: Arctic, blue color scheme
- **one**: Atom-inspired color scheme
- **solarized**: Classic color scheme

```vim
" In .vimrc
colorscheme gruvbox
```

## Integration with External Tools

### Format on Save

```vim
" In .vimrc
au BufWritePre *.gql call GQLFormat()

function! GQLFormat()
  " Save cursor position
  let l:save = winsaveview()

  " Format using external tool (e.g., gqlfmt)
  %!gqlfmt

  " Restore cursor position
  call winrestview(l:save)
endfunction
```

### Syntax Checking

```vim
" In .vimrc
au BufWritePost *.gql call GQLCheck()

function! GQLCheck()
  " Check syntax using Geode server
  let l:file = expand('%:p')
  let l:output = system('geode check ' . shellescape(l:file))

  if v:shell_error
    echohl ErrorMsg
    echo l:output
    echohl None
  else
    echohl MoreMsg
    echo 'Syntax OK'
    echohl None
  endif
endfunction
```

## Snippets

Use with snippet plugins like UltiSnips or SnipMate:

### UltiSnips Example

Create `~/.vim/UltiSnips/gql.snippets`:

```snippets
snippet match "MATCH pattern" b
MATCH (${1:n}:${2:Label})
WHERE ${3:condition}
RETURN $1
endsnippet

snippet create "CREATE node" b
CREATE (:${1:Label} {
  ${2:name}: "${3:value}"
})
endsnippet

snippet rel "CREATE relationship" b
MATCH (${1:a}:${2:Label1})
MATCH (${3:b}:${4:Label2})
CREATE ($1)-[:${5:REL_TYPE}]->($3)
endsnippet

snippet with "WITH clause" b
WITH ${1:expression} AS ${2:alias}
${3:next_clause}
endsnippet
```

## Tips and Tricks

### Quick Query Execution

Map a key to execute the current query:

```vim
" In .vimrc
au FileType gql nnoremap <Leader>e :w !geode exec -<CR>
```

### Quick Navigation

Jump between query clauses:

```vim
" In .vimrc
au FileType gql nnoremap <Leader>m /\v^(MATCH\|CREATE\|RETURN\|WITH\|WHERE)<CR>
au FileType gql nnoremap <Leader>M ?\v^(MATCH\|CREATE\|RETURN\|WITH\|WHERE)<CR>
```

### Template Files

Create template files for common patterns:

```vim
" In .vimrc
au FileType gql nnoremap <Leader>tm :read ~/.vim/templates/match.gql<CR>
au FileType gql nnoremap <Leader>tc :read ~/.vim/templates/create.gql<CR>
```

## Limitations

Compared to the Neovim plugin, the Vim plugin lacks:

- LSP integration (no auto-completion, go-to-definition)
- Real-time diagnostics
- Integrated query execution
- Schema browsing
- Debugging support

For advanced features, consider using Neovim with the full Geode plugin.

## Upgrading to Neovim

If you want more features, upgrade to Neovim and use the full plugin:

```bash
# Install Neovim
brew install neovim  # macOS
apt install neovim   # Ubuntu/Debian
dnf install neovim   # Fedora

# Migrate your configuration
mkdir -p ~/.config/nvim
ln -s ~/.vimrc ~/.config/nvim/init.vim

# Install Geode Neovim plugin
# See /plugins/neovim/ for details
```

## Troubleshooting

### Syntax Highlighting Not Working

```vim
" Force reload
:syntax sync fromstart

" Or in .vimrc
au BufEnter *.gql syntax sync fromstart
```

### File Type Not Detected

```vim
" Manually set filetype
:set filetype=gql

" Or add to .vimrc
au BufRead,BufNewFile *.gql set filetype=gql
```

### Colors Look Wrong

```vim
" Enable true colors
set termguicolors

" Or use 256 colors
set t_Co=256
```

## Contributing

Contributions welcome! See the repository for details.

## Resources

- [Vim Documentation](https://www.vim.org/docs.php)
- [GQL Reference](/docs/gql-reference/)
- [Neovim Plugin](/plugins/neovim/) (for advanced features)

## Repository

- GitLab: [devnw/codepros/geode/geode-vim](https://gitlab.com/devnw/codepros/geode/geode-vim)
- Documentation: [docs.geodedb.com/plugins/vim](https://docs.geodedb.com/plugins/vim)
