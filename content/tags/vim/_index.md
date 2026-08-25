---
title: "Vim Plugin for Geode GQL"
description: "Comprehensive guide to the Vim plugin for Geode GQL development including syntax highlighting, omni-completion, query execution, ALE integration for linting, and configuration for efficient graph database development in classic Vim."
keywords:
  - Vim Geode plugin
  - GQL syntax highlighting
  - Vim editor
  - Geode tooling
  - vim-plug
  - ALE linting
  - graph database Vim
  - GQL development
  - omnicompletion
  - Vimscript
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/vim/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

Vim remains one of the most powerful and efficient text editors, favored by developers who value modal editing, extensive customization, and terminal-based workflows. The Geode GQL plugin for Vim brings comprehensive graph database development support including syntax highlighting, intelligent omni-completion, query execution, linting integration, and seamless workflow tools.

While Neovim users may prefer the native LSP integration, classic Vim users can achieve excellent GQL development experiences through the Geode Vim plugin, which provides syntax files, filetype detection, omnicompletion via external tools, ALE linter integration, and convenient commands for query execution.

This guide covers installation, configuration, features, key mappings, integration with popular Vim plugins, and best practices for productive GQL development in Vim.

## Installation

### Prerequisites

Ensure you have the following installed:

```bash
# Vim 8.0+ required (or Vim 7.4 with patches)
vim --version | head -1

# Geode CLI must be in PATH
which geode
geode --version

# Optional: ctags for tag generation
which ctags
```

### Using vim-plug

The most popular Vim plugin manager:

```vim
" ~/.vimrc
call plug#begin('~/.vim/plugged')

" Geode GQL plugin
Plug 'geodedb/vim-geode-gql'

" Recommended companion plugins
Plug 'dense-analysis/ale'           " Async linting
Plug 'prabirshrestha/vim-lsp'       " LSP support (optional)
Plug 'prabirshrestha/asyncomplete.vim'  " Async completion

call plug#end()
```

Install plugins:

```vim
:PlugInstall
```

### Using Vundle

```vim
" ~/.vimrc
set nocompatible
filetype off
set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()

Plugin 'VundleVim/Vundle.vim'
Plugin 'geodedb/vim-geode-gql'
Plugin 'dense-analysis/ale'

call vundle#end()
filetype plugin indent on
```

Install:

```vim
:PluginInstall
```

### Using Pathogen

```bash
# Clone to bundle directory
cd ~/.vim/bundle
git clone https://github.com/geodedb/vim-geode-gql.git
```

### Using Native Vim Packages (Vim 8+)

```bash
# Create pack directory
mkdir -p ~/.vim/pack/geode/start

# Clone plugin
git clone https://github.com/geodedb/vim-geode-gql.git \
  ~/.vim/pack/geode/start/vim-geode-gql
```

### Manual Installation

```bash
# Download and extract
curl -LO https://github.com/geodedb/vim-geode-gql/archive/main.tar.gz
tar xzf main.tar.gz

# Copy files
cp -r vim-geode-gql-main/syntax/* ~/.vim/syntax/
cp -r vim-geode-gql-main/ftplugin/* ~/.vim/ftplugin/
cp -r vim-geode-gql-main/ftdetect/* ~/.vim/ftdetect/
cp -r vim-geode-gql-main/autoload/* ~/.vim/autoload/
cp -r vim-geode-gql-main/plugin/* ~/.vim/plugin/
```

## Configuration

### Basic Setup

Add to your `.vimrc`:

```vim
" ~/.vimrc

" Enable file type detection and plugins
filetype plugin indent on
syntax on

" Geode GQL configuration
let g:geode_server_host = 'localhost'
let g:geode_server_port = 3141
let g:geode_default_database = 'default'
let g:geode_auto_connect = 1

" Query execution settings
let g:geode_execution_timeout = 30000
let g:geode_max_rows = 1000
let g:geode_auto_commit = 0

" Formatting settings
let g:geode_format_on_save = 1
let g:geode_keyword_case = 'UPPER'
let g:geode_indent_size = 2

" Results display
let g:geode_results_position = 'bottom'  " bottom, right, tab
let g:geode_results_height = 15
let g:geode_results_width = 80

" UI options
let g:geode_show_line_numbers = 1
let g:geode_highlight_current_row = 1
```

### GQL File Settings

Create filetype-specific settings:

```vim
" ~/.vim/ftplugin/gql.vim

" Indentation
setlocal tabstop=2
setlocal shiftwidth=2
setlocal softtabstop=2
setlocal expandtab
setlocal smartindent

" Text width for formatting
setlocal textwidth=100

" Enable omni-completion
setlocal omnifunc=geode#Complete

" Folding (fold on query boundaries)
setlocal foldmethod=syntax
setlocal foldlevel=99

" Comments
setlocal commentstring=--\ %s

" Key mappings (buffer local)
nnoremap <buffer> <leader>ge :GeodeExecute<CR>
nnoremap <buffer> <leader>gx :GeodeExplain<CR>
nnoremap <buffer> <leader>gp :GeodeProfile<CR>
nnoremap <buffer> <leader>gf :GeodeFormat<CR>
nnoremap <buffer> <leader>gc :GeodeConnect<CR>
nnoremap <buffer> <leader>gr :GeodeToggleResults<CR>

vnoremap <buffer> <leader>ge :GeodeExecuteSelection<CR>

" Execute with Ctrl+Enter
nnoremap <buffer> <C-CR> :GeodeExecute<CR>
inoremap <buffer> <C-CR> <Esc>:GeodeExecute<CR>
vnoremap <buffer> <C-CR> :GeodeExecuteSelection<CR>
```

### Connection Profiles

Define multiple connection profiles:

```vim
" ~/.vimrc

" Connection profiles
let g:geode_connections = {
  \ 'development': {
  \   'host': 'localhost',
  \   'port': 3141,
  \   'database': 'dev',
  \ },
  \ 'staging': {
  \   'host': 'staging.example.com',
  \   'port': 3141,
  \   'database': 'staging',
  \   'tls': 1,
  \ },
  \ 'production': {
  \   'host': 'prod.example.com',
  \   'port': 3141,
  \   'database': 'production',
  \   'tls': 1,
  \   'read_only': 1,
  \ },
  \ }

" Default connection
let g:geode_default_connection = 'development'

" Quick connection switching
nnoremap <leader>c1 :GeodeUseConnection development<CR>
nnoremap <leader>c2 :GeodeUseConnection staging<CR>
nnoremap <leader>c3 :GeodeUseConnection production<CR>
```

## Features

### Syntax Highlighting

The plugin provides comprehensive syntax highlighting:

```vim
" ~/.vim/syntax/gql.vim (excerpt)

" Keywords
syntax keyword gqlKeyword MATCH WHERE RETURN CREATE DELETE MERGE SET REMOVE
syntax keyword gqlKeyword WITH UNWIND CALL YIELD ORDER BY SKIP LIMIT
syntax keyword gqlKeyword AND OR NOT IN IS NULL TRUE FALSE
syntax keyword gqlKeyword CASE WHEN THEN ELSE END
syntax keyword gqlKeyword OPTIONAL DISTINCT AS
syntax keyword gqlKeyword BEGIN COMMIT ROLLBACK TRANSACTION

" Functions
syntax keyword gqlFunction COUNT SUM AVG MIN MAX
syntax keyword gqlFunction COLLECT REDUCE
syntax keyword gqlFunction UPPER LOWER TRIM SUBSTRING REPLACE
syntax keyword gqlFunction SIZE LENGTH TYPE ID LABELS PROPERTIES
syntax keyword gqlFunction COALESCE NULLIF
syntax keyword gqlFunction DATE DATETIME TIME DURATION

" Types
syntax keyword gqlType Integer Float String Boolean Date DateTime Duration
syntax keyword gqlType Point List Map Node Relationship Path

" Labels (:Label)
syntax match gqlLabel ":\w\+"

" Properties (.property)
syntax match gqlProperty "\.\w\+"

" Variables
syntax match gqlVariable "\$\w\+"

" Strings
syntax region gqlString start=/"/ skip=/\\"/ end=/"/
syntax region gqlString start=/'/ skip=/\\'/ end=/'/

" Comments
syntax match gqlComment "--.*$"
syntax region gqlComment start="/\*" end="\*/"

" Numbers
syntax match gqlNumber "\<\d\+\>"
syntax match gqlNumber "\<\d\+\.\d\+\>"

" Highlighting groups
highlight link gqlKeyword Keyword
highlight link gqlFunction Function
highlight link gqlType Type
highlight link gqlLabel Structure
highlight link gqlProperty Identifier
highlight link gqlVariable Special
highlight link gqlString String
highlight link gqlComment Comment
highlight link gqlNumber Number
```

### Omni-Completion

Intelligent completion via `<C-x><C-o>`:

```vim
" Completion function in autoload/geode.vim
function! geode#Complete(findstart, base)
  if a:findstart
    " Find start of word
    let line = getline('.')
    let start = col('.') - 1
    while start > 0 && line[start - 1] =~ '\w'
      let start -= 1
    endwhile
    return start
  else
    " Get completions from LSP or cache
    let completions = []

    " Context-aware completions
    let context = geode#GetContext()

    if context.after_colon
      " Complete labels
      let completions = geode#GetLabels(a:base)
    elseif context.after_dot
      " Complete properties
      let completions = geode#GetProperties(context.label, a:base)
    elseif context.after_bracket
      " Complete relationship types
      let completions = geode#GetRelationships(a:base)
    else
      " Complete keywords and functions
      let completions = geode#GetKeywordsAndFunctions(a:base)
    endif

    return completions
  endif
endfunction
```

**Using Completion**:

```vim
" In insert mode:
" <C-x><C-o>  - Trigger omni-completion
" <C-n>       - Next completion item
" <C-p>       - Previous completion item
" <C-y>       - Accept completion
" <C-e>       - Cancel completion
```

### Query Execution

Execute queries directly from Vim:

```vim
" Execute entire buffer
:GeodeExecute

" Execute current query (query under cursor)
:GeodeExecuteCurrent

" Execute visual selection
:'<,'>GeodeExecuteSelection

" Execute with EXPLAIN
:GeodeExplain

" Execute with PROFILE
:GeodeProfile

" Cancel running query
:GeodeCancel
```

**Results Window**:

```
┌─ Geode Results ──────────────────────────────────────────┐
│ Query: MATCH (u:User) WHERE u.active = true RETURN u... │
│ Status: Success | Time: 12ms | Rows: 3                   │
├──────────────────────────────────────────────────────────┤
│ name          │ email                │ created_at        │
├───────────────┼──────────────────────┼───────────────────┤
│ Alice Johnson │ alice@example.com    │ 2024-01-15        │
│ Bob Smith     │ bob@example.com      │ 2024-02-20        │
│ Carol Davis   │ carol@example.com    │ 2024-03-10        │
├──────────────────────────────────────────────────────────┤
│ [j/k] navigate | [y] yank row | [Y] yank all | [q] close │
└──────────────────────────────────────────────────────────┘
```

**Results Window Keys**:

| Key | Action |
|-----|--------|
| `j` / `k` | Navigate rows |
| `h` / `l` | Scroll horizontally |
| `gg` / `G` | Go to first/last row |
| `y` | Yank current row |
| `Y` | Yank all results |
| `/` | Search results |
| `n` / `N` | Next/previous search match |
| `q` | Close results window |
| `<CR>` | Expand row details |

### Code Formatting

Format GQL queries for consistency:

```vim
" Format entire buffer
:GeodeFormat

" Format visual selection
:'<,'>GeodeFormatSelection

" Format on save (if enabled)
autocmd BufWritePre *.gql :GeodeFormat
```

**Before/After Formatting**:

```gql
" Before
match(u:User)-[:FOLLOWS]->(f) where u.active=true and u.created>'2024-01-01' return f.name,count(*) as cnt group by f.name order by cnt desc limit 10;

" After
MATCH (u:User)-[:FOLLOWS]->(f)
WHERE u.active = true
  AND u.created > '2024-01-01'
RETURN f.name, COUNT(*) AS cnt
GROUP BY f.name
ORDER BY cnt DESC
LIMIT 10;
```

### ALE Integration

Integrate with ALE for asynchronous linting:

```vim
" ~/.vimrc

" Enable ALE for GQL
let g:ale_linters = {
  \ 'gql': ['geode'],
  \ }

" ALE Geode linter settings
let g:ale_gql_geode_executable = 'geode'
let g:ale_gql_geode_options = 'lint --format=ale'

" ALE display settings
let g:ale_sign_error = '✗'
let g:ale_sign_warning = '⚠'
let g:ale_echo_msg_error_str = 'E'
let g:ale_echo_msg_warning_str = 'W'
let g:ale_echo_msg_format = '[%linter%] %s [%severity%]'

" Navigate errors
nmap <silent> [e <Plug>(ale_previous_wrap)
nmap <silent> ]e <Plug>(ale_next_wrap)

" Fix on save
let g:ale_fix_on_save = 1
let g:ale_fixers = {
  \ 'gql': ['geode_format'],
  \ }
```

**Error Display**:

```
  1 │ MATCH (u:User)
  2 │ WHER u.email = 'test@example.com'
    │ ✗ E: Unknown keyword 'WHER'. Did you mean 'WHERE'?
  3 │ RETURN u;
```

### vim-lsp Integration

For LSP support in classic Vim:

```vim
" ~/.vimrc

" Register Geode LSP
if executable('geode')
  au User lsp_setup call lsp#register_server({
    \ 'name': 'geode-gql',
    \ 'cmd': {server_info->['geode', 'lsp', '--stdio']},
    \ 'allowlist': ['gql'],
    \ })
endif

" LSP keymaps
function! s:on_lsp_buffer_enabled() abort
  setlocal omnifunc=lsp#complete
  setlocal signcolumn=yes

  nmap <buffer> gd <plug>(lsp-definition)
  nmap <buffer> gr <plug>(lsp-references)
  nmap <buffer> K <plug>(lsp-hover)
  nmap <buffer> <leader>rn <plug>(lsp-rename)
  nmap <buffer> [g <plug>(lsp-previous-diagnostic)
  nmap <buffer> ]g <plug>(lsp-next-diagnostic)
endfunction

augroup lsp_install
  au!
  autocmd User lsp_buffer_enabled call s:on_lsp_buffer_enabled()
augroup END
```

### asyncomplete Integration

Async completion for better performance:

```vim
" ~/.vimrc

" Register Geode source
au User asyncomplete_setup call asyncomplete#register_source(
  \ asyncomplete#sources#geode#get_source_options({
  \   'name': 'geode',
  \   'allowlist': ['gql'],
  \   'completor': function('asyncomplete#sources#geode#completor'),
  \ }))

" Tab completion
inoremap <expr> <Tab>   pumvisible() ? "\<C-n>" : "\<Tab>"
inoremap <expr> <S-Tab> pumvisible() ? "\<C-p>" : "\<S-Tab>"
inoremap <expr> <CR>    pumvisible() ? "\<C-y>" : "\<CR>"
```

## Key Mappings

### Default Mappings

| Action | Mapping | Mode | Description |
|--------|---------|------|-------------|
| Execute Query | `<leader>ge` | n | Execute query under cursor |
| Execute Selection | `<leader>ge` | v | Execute selected text |
| Explain Query | `<leader>gx` | n | Show execution plan |
| Profile Query | `<leader>gp` | n | Execute with profiling |
| Format Buffer | `<leader>gf` | n | Format entire buffer |
| Toggle Results | `<leader>gr` | n | Toggle results window |
| Connect | `<leader>gc` | n | Connect to server |
| Schema Explorer | `<leader>gS` | n | Open schema browser |
| Next Error | `]e` | n | Go to next error |
| Prev Error | `[e` | n | Go to previous error |

### Custom Mappings

```vim
" ~/.vim/ftplugin/gql.vim

" Quick execute with Ctrl+Enter
nnoremap <buffer> <C-CR> :GeodeExecute<CR>
inoremap <buffer> <C-CR> <Esc>:GeodeExecute<CR>a
vnoremap <buffer> <C-CR> :GeodeExecuteSelection<CR>

" Execute and stay in insert mode
inoremap <buffer> <C-S-CR> <C-o>:GeodeExecute<CR>

" Format with = (like other languages)
nnoremap <buffer> = :GeodeFormat<CR>

" Quick explain
nnoremap <buffer> <leader>e :GeodeExplain<CR>

" Quick profile
nnoremap <buffer> <leader>p :GeodeProfile<CR>

" Navigate queries in buffer
nnoremap <buffer> [q :GeodePrevQuery<CR>
nnoremap <buffer> ]q :GeodeNextQuery<CR>

" Copy results to clipboard
nnoremap <buffer> <leader>yy :GeodeYankResults<CR>
nnoremap <buffer> <leader>yj :GeodeYankResultsJSON<CR>

" Insert common patterns
inoremap <buffer> <C-g>m MATCH ()<Left>
inoremap <buffer> <C-g>w WHERE
inoremap <buffer> <C-g>r RETURN
inoremap <buffer> <C-g>c CREATE ()<Left>
```

## Snippets

### UltiSnips Integration

```vim
" ~/.vim/UltiSnips/gql.snippets

# Basic MATCH query
snippet match "MATCH query" b
MATCH (${1:n}:${2:Label})
WHERE ${3:condition}
RETURN ${4:$1};
endsnippet

# CREATE node
snippet create "CREATE node" b
CREATE (${1:n}:${2:Label} {
  ${3:property}: ${4:value}
});
endsnippet

# CREATE relationship
snippet rel "CREATE relationship" b
MATCH (a:${1:Label} {${2:prop}: ${3:value}})
MATCH (b:${4:Label} {${5:prop}: ${6:value}})
CREATE (a)-[:${7:REL_TYPE} {${8:}}]->(b);
endsnippet

# MERGE pattern
snippet merge "MERGE pattern" b
MERGE (${1:n}:${2:Label} {${3:id}: ${4:value}})
ON CREATE SET ${5:$1.created_at = datetime()}
ON MATCH SET ${6:$1.updated_at = datetime()}
RETURN $1;
endsnippet

# Path query
snippet path "Path query" b
MATCH path = (${1:start}:${2:Label})-[:${3:REL}*${4:1..3}]->(${5:end}:${6:Label})
WHERE ${7:condition}
RETURN path;
endsnippet

# Aggregation
snippet agg "Aggregation query" b
MATCH (${1:n}:${2:Label})
WHERE ${3:condition}
RETURN ${4:n.property}, ${5:COUNT}(*) AS ${6:count}
GROUP BY $4
ORDER BY $6 DESC
LIMIT ${7:10};
endsnippet

# Transaction block
snippet tx "Transaction block" b
BEGIN TRANSACTION;

${1:-- Your GQL statements here}

COMMIT;
endsnippet

# CASE expression
snippet case "CASE expression" b
CASE
  WHEN ${1:condition} THEN ${2:result}
  WHEN ${3:condition} THEN ${4:result}
  ELSE ${5:default}
END
endsnippet
```

### SnipMate Snippets

```snippets
# ~/.vim/snippets/gql.snippets

snippet match
 MATCH (${1:n}:${2:Label})
 WHERE ${3:condition}
 RETURN ${4:$1};

snippet create
 CREATE (${1:n}:${2:Label} {
   ${3:property}: ${4:value}
 });

snippet path
 MATCH path = (${1:start}:${2:Label})-[:${3:REL}*${4:1..3}]->(${5:end}:${6:Label})
 RETURN path;
```

## Commands Reference

### Execution Commands

| Command | Description |
|---------|-------------|
| `:GeodeExecute` | Execute query under cursor or entire buffer |
| `:GeodeExecuteSelection` | Execute visual selection |
| `:GeodeExecuteCurrent` | Execute current query only |
| `:GeodeExplain` | Show execution plan |
| `:GeodeProfile` | Execute with profiling |
| `:GeodeCancel` | Cancel running query |

### Connection Commands

| Command | Description |
|---------|-------------|
| `:GeodeConnect` | Connect to server |
| `:GeodeDisconnect` | Disconnect from server |
| `:GeodeReconnect` | Reconnect to server |
| `:GeodeUseConnection {name}` | Switch to named connection |
| `:GeodeUseDatabase {name}` | Switch database |
| `:GeodeConnectionStatus` | Show connection status |

### Formatting Commands

| Command | Description |
|---------|-------------|
| `:GeodeFormat` | Format entire buffer |
| `:GeodeFormatSelection` | Format visual selection |
| `:GeodeSetIndent {n}` | Set indent size |
| `:GeodeSetKeywordCase {case}` | Set keyword case (UPPER/lower) |

### Schema Commands

| Command | Description |
|---------|-------------|
| `:GeodeSchema` | Open schema explorer |
| `:GeodeLabels` | List all labels |
| `:GeodeRelationships` | List relationship types |
| `:GeodeProperties {label}` | List properties for label |
| `:GeodeIndexes` | List all indexes |
| `:GeodeRefreshSchema` | Refresh schema cache |

### Results Commands

| Command | Description |
|---------|-------------|
| `:GeodeToggleResults` | Toggle results window |
| `:GeodeShowResults` | Show results window |
| `:GeodeHideResults` | Hide results window |
| `:GeodeYankResults` | Copy results to clipboard |
| `:GeodeYankResultsJSON` | Copy results as JSON |
| `:GeodeExportResults {file}` | Export to file |

## Troubleshooting

### Common Issues

**Syntax Highlighting Not Working**:

```vim
" Check filetype detection
:set ft?
" Should show: filetype=gql

" Force filetype
:set ft=gql

" Check syntax loaded
:syntax list
```

**Completion Not Working**:

```vim
" Check omnifunc
:set omnifunc?
" Should show: omnifunc=geode#Complete

" Test completion manually
:call geode#Complete(0, '')
```

**Connection Failures**:

```vim
" Check connection status
:GeodeConnectionStatus

" Test connection
:GeodeTestConnection

" View connection log
:GeodeConnectionLog
```

**Plugin Not Loading**:

```vim
" Check plugin loaded
:scriptnames | grep geode

" Check for errors
:messages

" Reload plugin
:source ~/.vim/plugged/vim-geode-gql/plugin/geode.vim
```

### Debug Mode

Enable debug logging:

```vim
" Enable debug mode
let g:geode_debug = 1
let g:geode_log_file = '/tmp/geode-vim.log'

" View debug log
:edit /tmp/geode-vim.log

" Or tail in terminal
:terminal tail -f /tmp/geode-vim.log
```

## Best Practices

**Organize Query Files**: Keep `.gql` files in version control for collaboration.

**Use Connection Profiles**: Define profiles for different environments.

**Enable Format on Save**: Ensure consistent code style.

**Leverage Snippets**: Create snippets for common query patterns.

**Use ALE for Linting**: Get real-time feedback on syntax errors.

**Set Up Key Mappings**: Create efficient mappings for frequent operations.

**Profile Complex Queries**: Always profile before running expensive queries.

**Use Read-Only for Production**: Mark production connections as read-only.

**Check Schema Before Writing**: Use schema explorer to verify labels and properties.

**Document Custom Mappings**: Comment your mappings for future reference.

## Related Topics

- [Editor Integrations](/tags/editor/) - Overview of all editor integrations
- [Neovim Plugin](/tags/neovim/) - Modern Neovim integration with LSP
- [VS Code Extension](/tags/vscode/) - VS Code integration
- [IDE Integration](/tags/ide/) - General IDE support
- [Plugin Development](/tags/plugin/) - Creating editor plugins
- [LSP Guide](/docs/development/lsp-guide/) - Language Server Protocol details

## Further Reading

- Vim Script Documentation
- ALE Documentation
- vim-lsp Configuration Guide
- UltiSnips Documentation
- Vim Plugin Development Guide
- Modal Editing Best Practices
