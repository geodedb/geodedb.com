---
title: "Vim Plugin"
description: "Vim plugin for Geode GQL syntax highlighting and basic features"
weight: 2
tags: ["vim", "plugin", "editor", "syntax"]
categories: ["plugins", "documentation"]
keywords:
  - Geode Vim plugin
  - GQL syntax highlighting
  - Vim integration
  - Geode tooling
  - Graph query editor
---

<!-- CANARY: REQ=REQ-SYNTAX-VIM-002; FEATURE="VimSyntaxGeneration"; ASPECT=BuildTarget; STATUS=EXEMPT; OWNER=tooling; UPDATED=2026-01-03 -->

# Vim Plugin for Geode

Enhance your Vim editing experience with GQL syntax highlighting and basic Geode integration. While not as feature-rich as the Neovim plugin, it provides essential support for working with GQL files.

## Installation

### Using vim-plug

```vim
Plug 'codeprosorg/geode-vim'
```

### Using Vundle

```vim
Plugin 'codeprosorg/geode-vim'
```

### Using Pathogen

```bash
cd ~/.vim/bundle
git clone https://gitlab.com/devnw/codepros/geode/geode-vim.git
```

### Manual Installation

```bash
cd ~/.vim
git clone https://gitlab.com/devnw/codepros/geode/geode-vim.git
cp -r geode-vim/* .
```

## Features

### Syntax Highlighting

Comprehensive syntax highlighting for GQL including:

- **Keywords**: MATCH, CREATE, RETURN, WHERE, WITH, etc.
- **Types**: INTEGER, STRING, BOOLEAN, FLOAT, etc.
- **Functions**: count, sum, avg, collect, etc.
- **Operators**: AND, OR, NOT, IN, etc.
- **String Literals**: Single and double quoted strings
- **Comments**: Line and block comments
- **Variables**: Parameter placeholders
- **Path Patterns**: Node and relationship patterns

### File Type Detection

Automatic detection of GQL files:

- `.gql` files
- `.geode` files
- `.cypher` files (compatibility)

### Basic Integration

- Syntax folding
- Comment toggling
- Keyword completion

## Configuration

Add to your `.vimrc`:

```vim
" Enable syntax highlighting
syntax on

" Set filetype for GQL files
au BufRead,BufNewFile *.gql set filetype=gql
au BufRead,BufNewFile *.geode set filetype=gql

" Optional: Set tab width for GQL files
au FileType gql setlocal tabstop=2 shiftwidth=2 expandtab

" Optional: Enable folding
au FileType gql setlocal foldmethod=syntax
au FileType gql setlocal foldlevel=99

" Optional: Configure comment string
au FileType gql setlocal commentstring=//\ %s
```

## Syntax Highlighting Examples

### Keywords

```gql
MATCH (p:Person)
WHERE p.age > 30
RETURN p.name, p.age
ORDER BY p.age DESC
LIMIT 10
```

### Types and Properties

```gql
CREATE (:Person {
  name: "Alice",
  age: 30,
  active: true,
  score: 95.5
})
```

### Functions

```gql
MATCH (p:Person)
RETURN count(p) AS total,
       avg(p.age) AS average_age,
       collect(p.name) AS names
```

### Path Patterns

```gql
MATCH (p1:Person)-[:KNOWS]->(p2:Person)-[:WORKS_AT]->(c:Company)
WHERE c.name = "Acme Corp"
RETURN p1.name, p2.name, c.name
```

### Comments

```gql
// This is a line comment

/* This is a
   block comment */

MATCH (n) RETURN n // Inline comment
```

## Commands

### Basic Commands

- `:GQLFormat` - Format current buffer (requires external formatter)
- `:GQLCheck` - Check syntax (requires Geode server)

### Comment Toggling

Use standard Vim comment commands:

```vim
" In normal mode
gcc         " Toggle line comment
gc<motion>  " Toggle comment for motion

" In visual mode
gc          " Toggle comment for selection
```

## Folding

Enable syntax folding for better code organization:

```vim
" In .vimrc
au FileType gql setlocal foldmethod=syntax
au FileType gql setlocal foldlevel=99

" Usage
za  " Toggle fold under cursor
zc  " Close fold under cursor
zo  " Open fold under cursor
zM  " Close all folds
zR  " Open all folds
```

## Keyword Completion

Basic keyword completion using Vim's built-in completion:

```vim
" While in insert mode
Ctrl-X Ctrl-K   " Keyword completion
Ctrl-X Ctrl-L   " Line completion
Ctrl-N          " Next completion
Ctrl-P          " Previous completion
```

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
