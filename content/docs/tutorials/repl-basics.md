---
title: "REPL Interactive Shell Basics"
description: "Getting started with Geode's REPL interactive shell including meta commands, query execution, history navigation, and productivity features."
summary: "Master Geode's REPL shell for interactive query development with meta commands, keyboard shortcuts, history management, and productivity tips."
slug: "repl-basics"
url: "/docs/tutorials/repl-basics/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 150
keywords: ["REPL", "interactive shell", "CLI", "command line", "query development", "geode shell", "meta commands"]
tags: ["tutorial", "cli", "repl", "getting-started"]
categories: ["Tutorials"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/tutorials/repl-basics/"
    noindex: false
---

<!-- CANARY: REQ=REQ-REPL-ADVANCED-001; FEATURE="REPL Advanced Features"; ASPECT=Testing; STATUS=TESTED; OWNER=repl; UPDATED=2025-11-17 -->

## Overview

The Geode REPL (Read-Eval-Print Loop) provides an interactive shell for query development, data exploration, and administration. This tutorial covers essential REPL features for productive database interaction.

### What You'll Learn

- Starting and connecting to the REPL
- Executing GQL queries interactively
- Using meta commands for shell control
- Keyboard shortcuts for efficiency
- History navigation and search
- Output formatting options

## Getting Started

### Starting the REPL

```bash
# Start REPL connected to local server
geode shell

# Connect to remote server
geode shell --host db.example.com --port 3141

# With authentication
geode shell --user alice --password secretpass
```

**Welcome Screen**:

```
Geode Interactive Shell __GEODE_TAG__
Connected to: localhost:3141
Type \help or \? for help, \quit to exit

geode>
```

### First Query

```gql
geode> RETURN 1 AS number
┌────────┐
│ number │
├────────┤
│ 1      │
└────────┘

1 row in 0.002 seconds
```

**Features**:

- Automatic formatting (table layout)
- Execution time display
- Row count summary

## Meta Commands

**Meta commands** start with backslash (`\`) and control REPL behavior.

### Essential Commands

**Help**:

```
geode> \help
geode> \h
geode> \?
```

**Quit**:

```
geode> \quit
geode> \q
```

**Clear Screen**:

```
geode> \clear
```

**Echo Text**:

```
geode> \echo Hello, Geode!
Hello, Geode!
```

### Connection Management

**Connect to Server**:

```
geode> \connect db.example.com:3141
Connected to: db.example.com:3141
```

**Disconnect**:

```
geode> \disconnect
Disconnected from server
```

**Connection Status**:

```
geode> \status
Connected: Yes
Server: localhost:3141
User: alice
Database: main
```

### Transaction Commands

**Begin Transaction**:

```
geode> \begin
Transaction started
```

**Commit**:

```
geode> \commit
Transaction committed
```

**Rollback**:

```
geode> \rollback
Transaction rolled back
```

**Transaction Example**:

```gql
geode> \begin
geode> CREATE (n:Person {name: 'Alice'})
geode> CREATE (n:Person {name: 'Bob'})
geode> \commit
2 nodes created
```

### Output Formatting

**Table Format** (default):

```
geode> \format table
geode> MATCH (n:Person) RETURN n.name
┌───────┐
│ name  │
├───────┤
│ Alice │
│ Bob   │
└───────┘
```

**CSV Format**:

```
geode> \format csv
geode> MATCH (n:Person) RETURN n.name, n.age
name,age
Alice,30
Bob,28
```

**JSON Format**:

```
geode> \format json
geode> MATCH (n:Person) RETURN n.name, n.age
{"columns":["name","age"],"rows":[["Alice",30],["Bob",28]]}
```

### History Commands

**View History**:

```
geode> \history
  1  RETURN 1
  2  MATCH (n:Person) RETURN n.name
  3  CREATE (n:Person {name: 'Carol'})

geode> \history 5
  # Shows last 5 entries
```

**Clear History**:

```
geode> \history -c
History cleared
```

### Timing

**Enable Query Timing**:

```
geode> \timing on
Timing enabled

geode> MATCH (n) RETURN count(n)
┌──────────┐
│ count(n) │
├──────────┤
│ 1000     │
└──────────┘

1 row in 0.042 seconds
```

**Disable Timing**:

```
geode> \timing off
Timing disabled
```

### Configuration

**Set Options**:

```
geode> \set keymap vi
Keymap set to: vi

geode> \set keymap emacs
Keymap set to: emacs
```

**View Settings**:

```
geode> \set
keymap: emacs
format: table
timing: on
```

## Query Execution

### Single-Line Queries

**Press Enter to Execute**:

```gql
geode> RETURN 1 + 1
┌───┐
│ 2 │
└───┘
```

### Multi-Line Queries

**End with Semicolon**:

```gql
geode> MATCH (p:Person)
geode> WHERE p.age > 25
geode> RETURN p.name, p.age;
┌───────┬─────┐
│ name  │ age │
├───────┼─────┤
│ Alice │ 30  │
│ Bob   │ 28  │
└───────┴─────┘
```

**Indicators**:

```
geode>   # Ready for new command
geode-   # Continuation of multi-line query
```

### Query Cancellation

**Press Ctrl+C**:

```gql
geode> MATCH (n)-[r*1..10]->(m)
geode- WHERE n.id = 1
geode- RETURN m
^C
Query cancelled
```

## Keyboard Shortcuts

### Emacs Mode (Default)

**Navigation**:

- `Ctrl+A`: Beginning of line
- `Ctrl+E`: End of line
- `Alt+F`: Forward one word
- `Alt+B`: Backward one word

**Editing**:

- `Ctrl+K`: Kill to end of line
- `Ctrl+U`: Kill to beginning of line
- `Ctrl+W`: Kill word backward
- `Ctrl+Y`: Yank (paste) from kill ring

**History**:

- `Ctrl+P`: Previous history entry
- `Ctrl+N`: Next history entry
- `Ctrl+R`: Reverse search history
- `Ctrl+S`: Forward search history

**Control**:

- `Ctrl+L`: Clear screen
- `Ctrl+C`: Cancel current input
- `Ctrl+D`: Delete character or exit on empty line

### Vi Mode

**Activate**:

```
geode> \set keymap vi
```

**Command Mode**:

- `ESC`: Enter command mode
- `i`: Insert mode
- `a`: Append mode
- `A`: Append at end of line

**Navigation** (command mode):

- `h`: Left
- `l`: Right
- `w`: Forward word
- `b`: Backward word
- `0`: Beginning of line
- `$`: End of line

**Editing** (command mode):

- `dd`: Delete line
- `dw`: Delete word
- `x`: Delete character
- `p`: Paste

## History Navigation

### Reverse Search

**Press Ctrl+R**:

```
(reverse-i-search)`cre': CREATE (n:Person {name: 'Alice'})
```

**Type to Filter**:

```
(reverse-i-search)`match': MATCH (n:Person) RETURN n.name
```

**Press Enter**: Execute found command
**Press Ctrl+R Again**: Next match

### History File

**Location**:

- Linux: `~/.local/share/geode/history`
- macOS: `~/Library/Application Support/geode/history`
- Windows: `%APPDATA%\geode\history`

**Custom Location**:

```bash
export GEODE_HISTORY=/path/to/custom/history
geode shell
```

## Advanced Features

### Query Variables

**Set Variable**:

```gql
geode> WITH 30 AS age_threshold
geode- MATCH (p:Person)
geode- WHERE p.age > age_threshold
geode- RETURN p.name, p.age;
```

**Reuse in Multiple Queries**:

```gql
geode> CREATE (n:Config {threshold: 30})
geode> MATCH (c:Config)
geode- WITH c.threshold AS threshold
geode- MATCH (p:Person)
geode- WHERE p.age > threshold
geode- RETURN p.name;
```

### Pipeline Queries

**WITH Clause Chaining**:

```gql
geode> MATCH (u:User)-[:PLACED]->(o:Order)
geode- WITH u, count(o) AS order_count
geode- WHERE order_count > 5
geode- RETURN u.name, order_count
geode- ORDER BY order_count DESC;
```

### Parameterized Queries

**Future Feature**:

```gql
geode> :set min_age 30
geode> MATCH (p:Person) WHERE p.age > $min_age RETURN p.name;
```

## Practical Examples

### Data Exploration

**Count Nodes**:

```gql
geode> MATCH (n) RETURN labels(n) AS label, count(n) AS count
┌────────┬───────┐
│ label  │ count │
├────────┼───────┤
│ Person │ 100   │
│ Order  │ 500   │
└────────┴───────┘
```

**Sample Data**:

```gql
geode> MATCH (n:Person) RETURN n LIMIT 5
```

**Schema Discovery**:

```gql
geode> CALL db.labels()
┌────────┐
│ label  │
├────────┤
│ Person │
│ Order  │
│ Product│
└────────┘
```

`CALL db.relationshipTypes()` and `CALL db.propertyKeys()` complete the picture.

### Database Administration

**Show Indexes**:

```gql
geode> CALL db.indexes()
┌──────────────────┬──────────┬─────────┬────────────┐
│ name             │ type     │ label   │ properties │
├──────────────────┼──────────┼─────────┼────────────┤
│ person_email_idx │ BTREE    │ Person  │ email      │
│ product_sku_idx  │ BTREE    │ Product │ sku        │
└──────────────────┴──────────┴─────────┴────────────┘
```

`SHOW INDEXES` prints the same catalog.

**Database Statistics**:

```gql
geode> CALL geode.storage.stats() YIELD node_count, edge_count, label_count
┌────────────┬────────────┬─────────────┐
│ node_count │ edge_count │ label_count │
├────────────┼────────────┼─────────────┤
│ 10000      │ 25000      │ 3           │
└────────────┴────────────┴─────────────┘
```

The full column list also includes `format_version`, `page_size`, `wal_lsn`,
`last_checkpoint_lsn` and the `free_pages_*` counters. There is no `db.stats()`
procedure, and on-disk size is measured on the filesystem.

### Development Workflow

**1. Test Query**:

```gql
geode> EXPLAIN MATCH (n:Person) WHERE n.age > 25 RETURN n.name
# Review query plan
```

**2. Optimize**:

```gql
geode> CREATE INDEX person_age_idx ON Person (age)
Index created
```

**3. Verify**:

```gql
geode> PROFILE MATCH (n:Person) WHERE n.age > 25 RETURN n.name
# Check performance metrics
```

## Troubleshooting

### Common Issues

**Issue**: "REPL error: FileNotFound"

**Solution**:

```bash
# Create history directory
mkdir -p ~/.local/share/geode  # Linux
mkdir -p ~/Library/Application\ Support/geode  # macOS
```

---

**Issue**: Queries not executing

**Cause**: Missing semicolon on multi-line query

**Solution**:

```gql
geode> MATCH (n)
geode- RETURN n;  # Add semicolon
```

---

**Issue**: Connection lost during query

**Solution**:

```
geode> \connect localhost:3141
geode> # Re-run query
```

---

**Issue**: Output too wide for terminal

**Solution**:

```
geode> \format json
# Or use SELECT to limit columns
geode> MATCH (n) RETURN n.id, n.name  # Fewer columns
```

## Best Practices

### Query Development

1. **Start Simple**:

   ```gql
   geode> MATCH (n:Person) RETURN count(n)  # Test filter
   geode> MATCH (n:Person) RETURN n LIMIT 1  # Inspect structure
   geode> MATCH (n:Person) WHERE n.age > 25 RETURN n  # Full query
   ```

2. **Use EXPLAIN**:

   ```gql
   geode> EXPLAIN MATCH (n:Person)-[:KNOWS]->(m) RETURN n, m
   # Verify query plan before executing
   ```

3. **Limit Results**:

   ```gql
   geode> MATCH (n) RETURN n LIMIT 100  # Always limit during development
   ```

### History Management

**Search History**:

```
# Press Ctrl+R, type 'CREATE'
# Find previous CREATE statements quickly
```

**Save Important Queries**:

```bash
# Copy history to file
cat ~/.local/share/geode/history | grep CREATE > important_queries.txt
```

### Productivity Tips

**1. Use Aliases for Long Queries**:

```bash
# Create shell alias
alias gq='geode query --insecure'
gq "MATCH (n:Person) RETURN count(n)"
```

**2. Format Output for Scripts**:

```
geode> \format json
geode> # Pipe to jq for processing
```

**3. Transaction Batching**:

```gql
geode> \begin
geode> # Multiple CREATE/UPDATE statements
geode> \commit
# Atomic batch operation
```

## References

### Documentation

- **REPL Usage**: `docs/REPL_USAGE.md`
- **Advanced Features**: `docs/development/REPL_ADVANCED_FEATURES.md`
- **Client Libraries**: `docs/client-libraries/`

### Configuration

- **History File**: Platform-specific
- **Settings**: Stored in session (not persisted)
- **Customization**: Environment variables

## Next Steps

**For Beginners**:

- [GQL Guide](/docs/gql/guide/) - Query language fundamentals
- [Data Model](/docs/model/data-model-and-types/) - Graph concepts
- [Getting Started](/guides/installation/) - Installation guide

**For Developers**:

- [Advanced REPL Features](/docs/development/repl-advanced/) - Scripting, automation
- [Testing Strategies](/docs/guides/testing-strategies/) - Query testing
- [Client Libraries](/docs/client-libraries/go-client/) - Programmatic access

**For Administrators**:

- [Server Configuration](/docs/configuration/server-configuration/) - REPL server settings
- [Monitoring](/docs/ops/observability/) - Query monitoring
- [Security](/docs/security/overview/) - Authentication setup

---

**Document Version**: 1.0
**Last Updated**: January 24, 2026
**Status**: Production Ready
**Platform Support**: Linux, macOS, Windows
**Shell Modes**: Emacs (default), Vi
