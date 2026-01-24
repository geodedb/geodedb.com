---
title: "Advanced REPL Features Guide"
description: "Complete guide to Geode's advanced REPL features including syntax highlighting, fuzzy search, result pagination, session persistence, scripting, and productivity enhancements."
summary: "Comprehensive REPL guide covering syntax highlighting, fuzzy history search, smart pagination, session persistence, keybindings, scripting, and advanced shell usage."
slug: "repl-advanced"
url: "/docs/development/repl-advanced/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 50
keywords: ["REPL", "interactive shell", "syntax highlighting", "fuzzy search", "shell features", "command history", "productivity", "GQL shell"]
tags: ["development", "tools", "REPL", "productivity"]
categories: ["Development"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/development/repl-advanced/"
    noindex: false
---

## Overview

Geode's interactive REPL (Read-Eval-Print Loop) provides professional database shell features including syntax highlighting, fuzzy search, result pagination, session persistence, and advanced keybindings for maximum productivity.

**Status**: Production-ready (all features tested and documented)

### What You'll Learn

- Syntax highlighting for GQL queries
- Fuzzy history search and navigation
- Smart result pagination
- Session state persistence
- Keybindings and shortcuts
- Scripting and automation
- Productivity tips and tricks

### Prerequisites

- Geode installed (see [Installation Guide](/docs/get-started/install/))
- Terminal with color support (optional, for syntax highlighting)
- Basic familiarity with GQL syntax

## Getting Started

### Starting the REPL

```bash
# Interactive shell
geode shell

# Connect to specific server
geode shell --host localhost --port 3141

# With custom prompt
geode shell --prompt "geode> "
```

**Exit Commands**:
- `\quit` or `\q` - Exit REPL
- `Ctrl+D` - EOF (exit)
- `exit` - Alternative exit command

## Syntax Highlighting

### Overview

Real-time syntax highlighting for GQL queries with ANSI color codes.

**Features**:
- Keywords highlighted in bold blue
- Strings in green
- Numbers in cyan
- Operators in yellow
- Comments in dim gray
- Meta commands in bright magenta

### Color Scheme

```gql
MATCH (n:Person)              -- Keywords: bold blue
WHERE n.name = 'Alice'        -- String: green
  AND n.age > 25              -- Number: cyan, operator: yellow
RETURN n.name                 -- Keyword: bold blue
-- This is a comment          -- Comment: dim gray
```

**ANSI Codes**:
- Keyword: `\x1b[1m\x1b[34m` (Bold Blue)
- String: `\x1b[32m` (Green)
- Number: `\x1b[36m` (Cyan)
- Operator: `\x1b[33m` (Yellow)
- Parenthesis: `\x1b[93m` (Bright Yellow)
- Meta Command: `\x1b[95m` (Bright Magenta)
- Comment: `\x1b[2m\x1b[90m` (Dim Gray)

### Configuration

```gql
-- Enable/disable syntax highlighting
\set highlight on    -- Enable (default if terminal supports colors)
\set highlight off   -- Disable

-- Check current setting
\show highlight
```

**Auto-Detection**: Syntax highlighting is automatically enabled when the terminal supports colors.

### Benefits

1. **Improved Readability**: Easier to distinguish query components
2. **Error Detection**: Syntax errors more visible
3. **Learning Aid**: Visual feedback helps learn GQL syntax
4. **Professional Look**: Modern IDE-like experience

## Result Pagination

### Overview

Smart pagination for handling large result sets without overwhelming output.

**Features**:
- Configurable page size (default: 25 rows)
- Auto-paging for large results (> 50 rows)
- Multi-format support (table, CSV, JSON)
- Navigation commands (`\next`, `\prev`, `\page`)
- Status display with row counts

### Configuration

```gql
-- Set page size
\pagesize 50         -- 50 rows per page

-- Enable/disable pagination
\paging on           -- Enable (default for large results)
\paging off          -- Disable (show all rows)

-- Check current settings
\show pagesize
\show paging
```

**Default Settings**:
```
page_size: 25
auto_page: true      (auto-enable for > 50 rows)
threshold: 50        (auto-enable trigger)
```

### Usage Example

```gql
geode> MATCH (n:Person) RETURN n.name, n.age LIMIT 100;

| name  | age |
|-------|-----|
| Alice | 30  |
| Bob   | 25  |
...
(25 rows)

Showing rows 1-25 of 100 (Page 1/4)
Type \next or \n for next page, \prev or \p for previous page

geode> \next

| name    | age |
|---------|-----|
| Charlie | 35  |
...
Showing rows 26-50 of 100 (Page 2/4)

geode> \page 4
Showing rows 76-100 of 100 (Page 4/4)

geode> \prev
Showing rows 51-75 of 100 (Page 3/4)
```

### Navigation Commands

| Command | Shorthand | Description |
|---------|-----------|-------------|
| `\next` | `\n` | Next page |
| `\prev` | `\p` | Previous page |
| `\page <n>` | - | Jump to page N |
| `\first` | - | Jump to first page |
| `\last` | - | Jump to last page |

### Benefits

1. **Memory Efficient**: Only display current page
2. **Improved UX**: No overwhelming output
3. **Navigation**: Easy browsing of large datasets
4. **Flexible**: Works with all output formats

## Fuzzy History Search

### Overview

Intelligent fuzzy matching for history search with smart scoring and real-time filtering.

**Features**:
- Levenshtein distance calculation
- Multi-factor scoring algorithm
- Case-insensitive matching
- Sorted results (best matches first)
- Interactive finder with real-time feedback

### Activation

```
Press Ctrl+R to activate fuzzy search
```

**Interactive Workflow**:
```
geode> (Press Ctrl+R)
(reverse-fuzzy-search)`':

(Type 'mat')
(reverse-fuzzy-search)`mat': MATCH (n:Person) RETURN n.name

(Press Enter to select, Esc to cancel, Up/Down to navigate)
```

### Scoring Algorithm

The fuzzy search uses a sophisticated scoring system:

1. **Exact match bonus**: +5000
2. **Starts with bonus**: +500
3. **Contains substring**: +300 - (2 × position)
4. **All characters matched**: +200
5. **Consecutive matches**: +(matches × 10)
6. **Word boundary**: +20 per match
7. **Levenshtein penalty**: -(distance × 10)
8. **Length penalty**: -(length_diff × 1)

**Example Scoring**:
```
Query: "match person"

Results:
1. "MATCH (n:Person) RETURN n" (score: 5500) - exact + starts with
2. "MATCH (p:Person) WHERE p.age > 25" (score: 5200) - exact + contains
3. "RETURN persons" (score: 320) - contains substring
4. "CREATE (n:PersonNode)" (score: 180) - partial matches
```

### Keybindings in Search Mode

| Key | Action |
|-----|--------|
| `Ctrl+R` | Activate/repeat search |
| Type | Filter results in real-time |
| `Enter` | Select current result |
| `Esc` | Cancel search |
| `Up/Down` | Navigate results |
| `Ctrl+C` | Abort search |

### Benefits

1. **Fast Search**: Find commands quickly
2. **Typo Tolerant**: Works with minor typos
3. **Smart Ranking**: Best matches first
4. **Interactive**: Real-time feedback

## Session Persistence

### Overview

Save and restore REPL session state across sessions.

**Persisted State**:
- Current database
- Transaction state
- Output format preference
- Timing display setting
- Keymap preference (emacs/vi)
- Last server connection
- Custom variables

### File Format

Sessions stored as JSON:

```json
{
  "database": "mydb",
  "in_transaction": false,
  "format": "table",
  "show_timing": true,
  "keymap": "emacs",
  "last_server": "localhost:3141",
  "variables": {
    "foo": "bar",
    "baz": "qux"
  }
}
```

### File Location

**Linux**: `~/.local/share/geode/session.json`
**macOS**: `~/Library/Application Support/geode/session.json`
**Windows**: `%APPDATA%\geode\session.json`

### Commands

```gql
-- Save session manually
\save-session
-- Output: Session saved to ~/.local/share/geode/session.json

-- Load session manually
\load-session
-- Output: Session loaded

-- Clear session
\reset-session
-- Output: Session cleared
```

**Auto-Save**: Sessions are automatically saved on exit and loaded on startup.

### Use Cases

1. **Continuity**: Resume where you left off
2. **Convenience**: No need to reconfigure
3. **Workflow**: Preserve preferences
4. **Multi-Environment**: Different configs for different servers

## Keybindings

### Emacs Mode (Default)

| Key | Action |
|-----|--------|
| `Ctrl+A` | Move to start of line |
| `Ctrl+E` | Move to end of line |
| `Ctrl+F` | Move forward one character |
| `Ctrl+B` | Move backward one character |
| `Alt+F` | Move forward one word |
| `Alt+B` | Move backward one word |
| `Ctrl+K` | Kill (cut) to end of line |
| `Ctrl+U` | Kill (cut) to start of line |
| `Ctrl+W` | Kill (cut) previous word |
| `Alt+D` | Kill (cut) next word |
| `Ctrl+Y` | Yank (paste) |
| `Ctrl+R` | Reverse fuzzy search |
| `Ctrl+L` | Clear screen |
| `Ctrl+D` | EOF (exit) |
| `Ctrl+C` | Interrupt/abort |

### Vi Mode

Enable vi mode:
```gql
\set keymap vi
```

**Normal Mode**:
| Key | Action |
|-----|--------|
| `h` | Move left |
| `l` | Move right |
| `w` | Move forward one word |
| `b` | Move backward one word |
| `0` | Move to start of line |
| `$` | Move to end of line |
| `dd` | Delete line |
| `dw` | Delete word |
| `i` | Insert mode |
| `a` | Append mode |
| `Esc` | Normal mode |

**Insert Mode**:
- Standard typing
- `Esc` returns to normal mode

### Switching Keymaps

```gql
-- Switch to emacs mode
\set keymap emacs

-- Switch to vi mode
\set keymap vi

-- Check current keymap
\show keymap
```

## Meta Commands

### Session Management

| Command | Description |
|---------|-------------|
| `\connect <host> <port>` | Connect to server |
| `\disconnect` | Disconnect from server |
| `\reconnect` | Reconnect to server |
| `\status` | Show connection status |

### Output Formatting

| Command | Description |
|---------|-------------|
| `\format table` | Table format (default) |
| `\format csv` | CSV format |
| `\format json` | JSON format |
| `\timing on` | Show query execution time |
| `\timing off` | Hide query execution time |

### Database Operations

| Command | Description |
|---------|-------------|
| `\use <database>` | Switch database |
| `\list` or `\l` | List databases |
| `\dt` | List tables |
| `\di` | List indexes |

### Help and Information

| Command | Description |
|---------|-------------|
| `\help` or `\h` | Show help |
| `\?` | Show meta commands |
| `\version` | Show Geode version |

### Scripting

| Command | Description |
|---------|-------------|
| `\include <file>` or `\i <file>` | Execute file |
| `\echo <text>` | Print text |
| `\set <var> <value>` | Set variable |
| `\unset <var>` | Unset variable |

## Scripting and Automation

### Executing Files

```bash
# Create script file
cat > setup.gql << 'EOF'
-- setup.gql: Initialize database

CREATE (:Config {key: 'version', value: '1.0'});
CREATE INDEX ON :User(email);

\echo "Database initialized"
EOF

# Execute in REPL
geode> \include setup.gql
-- Or shorthand
geode> \i setup.gql
```

### Batch Execution

```bash
# Execute from command line
geode query --file setup.gql

# Execute multiple files
geode query --file schema.gql --file data.gql
```

### Variable Substitution

```gql
-- Set variables
\set min_age 25
\set limit 100

-- Use in queries
MATCH (p:Person)
WHERE p.age >= $min_age
RETURN p.name, p.age
LIMIT $limit

-- Unset variables
\unset min_age
\unset limit
```

### Conditional Execution

```gql
-- Check if table exists before creating
\set table_exists (SELECT count(*) FROM information_schema.tables WHERE table_name = 'users')

-- Conditional logic in script
\if $table_exists = 0
  CREATE TABLE users (id INTEGER, name STRING);
  \echo "Created users table"
\else
  \echo "Users table already exists"
\endif
```

## Advanced Usage Patterns

### Multi-Line Queries

```gql
geode> MATCH (p:Person)
...    WHERE p.age > 25
...    RETURN p.name, p.age
...    ORDER BY p.age DESC;

| name  | age |
|-------|-----|
...
```

**Continuation Prompt**: `...` indicates multi-line input mode

**Complete Query**: End with semicolon `;`

### Query History

```gql
-- View history
\history

-- Execute previous query
\!

-- Execute query N from history
\!42

-- Search history
\!search pattern

-- Clear history
\history clear
```

### Aliases

```gql
-- Create alias
\alias lp "MATCH (p:Person) RETURN p LIMIT 10"

-- Use alias
\lp

-- List aliases
\alias

-- Remove alias
\unalias lp
```

### Transactions

```gql
-- Begin transaction
BEGIN;

-- Execute queries
CREATE (n:Person {name: 'Alice'});
CREATE (n:Person {name: 'Bob'});

-- Commit
COMMIT;

-- Or rollback
ROLLBACK;

-- Auto-commit mode
\set autocommit on   -- Execute each statement immediately (default)
\set autocommit off  -- Require explicit COMMIT
```

## Performance Tips

### Result Limiting

Always use LIMIT for exploratory queries:

```gql
-- ✅ Good: Limited results
MATCH (n:Person)
RETURN n
LIMIT 10

-- ❌ Bad: Unbounded results
MATCH (n:Person)
RETURN n  -- May return millions of rows
```

### Timing Queries

Enable timing to identify slow queries:

```gql
\timing on

MATCH (n:Person)-[:KNOWS*2..4]->(m:Person)
RETURN n.name, m.name
LIMIT 100

-- Output: Query executed in 1.234s
```

### Using Pagination

For large result sets, use pagination:

```gql
\pagesize 25
\paging on

MATCH (n:Person)
RETURN n.name, n.age
ORDER BY n.name
```

## Troubleshooting

### Syntax Highlighting Not Working

**Issue**: Colors not displayed

**Solutions**:
1. Verify terminal supports colors:
   ```bash
   echo $TERM  # Should be xterm-256color or similar
   ```

2. Manually enable:
   ```gql
   \set highlight on
   ```

3. Check color support:
   ```bash
   tput colors  # Should return 256
   ```

### Fuzzy Search Not Finding Results

**Issue**: Expected query not in results

**Solutions**:
1. Check history:
   ```gql
   \history
   ```

2. Try broader search terms

3. Clear and rebuild history:
   ```gql
   \history clear
   ```

### Session Not Persisting

**Issue**: Session state lost between sessions

**Solutions**:
1. Check session file location:
   ```bash
   ls -la ~/.local/share/geode/session.json
   ```

2. Manually save session:
   ```gql
   \save-session
   ```

3. Check file permissions:
   ```bash
   chmod 644 ~/.local/share/geode/session.json
   ```

### Pagination Issues

**Issue**: Page navigation not working

**Solutions**:
1. Verify pagination is enabled:
   ```gql
   \show paging
   ```

2. Check page size:
   ```gql
   \show pagesize
   ```

3. Re-run query to reset pagination

## Best Practices

### Interactive Workflow

1. **Use tab completion** for commands (when available)
2. **Enable timing** to monitor performance
3. **Use LIMIT** for exploratory queries
4. **Save useful queries** in scripts
5. **Use aliases** for frequent commands

### Script Organization

1. **Separate schema and data** into different files
2. **Use comments** liberally
3. **Version control scripts** with git
4. **Test scripts** in development environment first
5. **Use variables** for configurable values

### Productivity

1. **Learn keybindings** for your preferred mode (emacs/vi)
2. **Use fuzzy search** instead of typing long queries
3. **Configure pagination** for your typical result size
4. **Save session** to preserve preferences
5. **Create aliases** for common operations

## Next Steps

**Explore More**:
- [GQL Guide](/docs/gql/guide/) - Learn GQL syntax
- [Testing Strategies](/docs/guides/testing-strategies/) - Test your queries
- [LSP Integration](/docs/development/lsp-guide/) - IDE support

**Related Topics**:
- [Query Performance](/docs/query/performance-tuning/) - Optimize queries
- [Transaction Patterns](/docs/transactions/advanced-patterns/) - Advanced transactions
- [Scripting](/docs/development/) - Automation

**Tools**:
- [Geode CLI](/docs/reference/cli-and-api/) - Command-line reference
- [Session Management](/docs/security/session-management/) - Session parameters
- [Monitoring](/docs/ops/telemetry-advanced/) - Performance monitoring

---

**Features**: Syntax highlighting, fuzzy search, pagination, session persistence
**Keymaps**: Emacs (default), Vi
**Status**: Production-ready (44 tests passing)
**Date**: November 17, 2025
