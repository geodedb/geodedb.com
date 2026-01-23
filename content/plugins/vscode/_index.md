---
title: "VSCode Extension"
description: "VSCode extension for Geode with full IDE support"
weight: 3
tags: ["vscode", "plugin", "ide", "lsp"]
categories: ["plugins", "documentation"]
---

# VSCode Extension for Geode

Full-featured IDE support for Geode development in Visual Studio Code. Includes LSP integration, IntelliSense, debugging, query execution, and schema exploration.

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Geode GQL"
4. Click Install

### From Command Line

```bash
code --install-extension codeprosorg.geode-gql
```

### Manual Installation

1. Download the `.vsix` file from [GitLab Releases](https://gitlab.com/devnw/codepros/geode/geode-vscode/-/releases)
2. In VS Code: Extensions → More Actions (···) → Install from VSIX

## Features

### Syntax Highlighting

Comprehensive syntax highlighting for GQL:

- Keywords, types, and functions
- String literals and comments
- Variables and parameters
- Path patterns
- Semantic highlighting via LSP

### IntelliSense

Intelligent code completion:

- **Keyword Completion**: Auto-complete GQL keywords
- **Function Completion**: Suggest functions with parameter hints
- **Property Completion**: Auto-complete node/relationship properties
- **Label Completion**: Suggest node labels and relationship types
- **Variable Completion**: Auto-complete defined variables

### Diagnostics

Real-time error detection:

- Syntax errors with precise locations
- Semantic errors (undefined labels, properties)
- Type errors
- Performance warnings
- Best practice suggestions

### Go to Definition

Navigate your schema:

- Jump to node label definitions
- Jump to relationship type definitions
- Jump to property key definitions
- Jump to variable declarations

### Hover Information

Inline documentation:

- Function signatures and descriptions
- Type information
- Property details
- Performance hints

### Code Actions

Quick fixes and refactorings:

- Fix syntax errors
- Add missing labels
- Optimize queries
- Extract subqueries
- Rename variables

### Query Execution

Run queries directly from the editor:

- Execute current query (Ctrl+Enter / Cmd+Enter)
- Execute selection
- View results in table format
- Export results to JSON/CSV
- Query history

### Schema Explorer

Browse your database schema:

- View all node labels
- View all relationship types
- View all property keys
- View constraints and indexes
- Search schema

### Debugging

Debug your queries:

- Set breakpoints
- Step through query execution
- Inspect variables
- View execution plan
- Profile performance

## Configuration

### Connection Settings

Configure in VS Code settings (Ctrl+, / Cmd+,):

```json
{
  "geode.server.host": "localhost",
  "geode.server.port": 3141,
  "geode.server.username": "admin",
  "geode.server.password": "password",
  "geode.server.tls": true,
  "geode.server.timeout": 30000
}
```

### LSP Settings

```json
{
  "geode.lsp.enabled": true,
  "geode.lsp.trace.server": "verbose",
  "geode.lsp.diagnostics.enabled": true,
  "geode.lsp.completion.enabled": true,
  "geode.lsp.hover.enabled": true
}
```

### Editor Settings

```json
{
  "geode.editor.tabSize": 2,
  "geode.editor.insertSpaces": true,
  "geode.editor.formatOnSave": true,
  "geode.editor.semanticHighlighting": true
}
```

### Query Execution Settings

```json
{
  "geode.query.autoExecute": false,
  "geode.query.resultLimit": 100,
  "geode.query.timeout": 60000,
  "geode.query.profile": false
}
```

## Usage

### Creating a GQL File

1. Create a new file with `.gql` extension
2. Start typing your query
3. Use IntelliSense for auto-completion

### Executing Queries

**Method 1: Command Palette**
1. Press Ctrl+Shift+P / Cmd+Shift+P
2. Type "Geode: Execute Query"
3. Press Enter

**Method 2: Keyboard Shortcut**
- Windows/Linux: Ctrl+Enter
- macOS: Cmd+Enter

**Method 3: Context Menu**
- Right-click in editor
- Select "Execute Geode Query"

### Viewing Results

Results appear in a dedicated panel:

- **Table View**: Tabular display with sorting/filtering
- **JSON View**: Raw JSON output
- **Graph View**: Visual graph representation (for paths)
- **Export**: Save to CSV, JSON, or clipboard

### Schema Exploration

**Open Schema Explorer**:
1. Click the Geode icon in the Activity Bar
2. Browse node labels, relationships, properties

**Search Schema**:
1. Use the search box in Schema Explorer
2. Filter by name or type

**View Schema Details**:
- Click on any item to see details
- View properties, constraints, indexes
- See sample queries

### Debugging Queries

**Start Debugging**:
1. Set breakpoints by clicking in the gutter
2. Press F5 or use "Run → Start Debugging"
3. Step through execution with F10/F11

**Inspect Variables**:
- View variables in Debug panel
- Hover over variables for values
- Evaluate expressions in Debug Console

**View Execution Plan**:
- Enable profiling in settings
- Run query with debugging
- View plan in Debug panel

## Snippets

Built-in snippets for common patterns:

### Match Pattern

Trigger: `match`

```gql
MATCH (${1:n}:${2:Label})
WHERE ${3:condition}
RETURN $1
```

### Create Node

Trigger: `create`

```gql
CREATE (:${1:Label} {
  ${2:name}: "${3:value}"
})
```

### Create Relationship

Trigger: `rel`

```gql
MATCH (${1:a}:${2:Label1})
MATCH (${3:b}:${4:Label2})
CREATE ($1)-[:${5:REL_TYPE}]->($3)
```

### With Clause

Trigger: `with`

```gql
WITH ${1:expression} AS ${2:alias}
${3:next_clause}
```

### Case Expression

Trigger: `case`

```gql
CASE ${1:expression}
  WHEN ${2:value} THEN ${3:result}
  ELSE ${4:default}
END
```

### Transaction

Trigger: `tx`

```gql
BEGIN
  ${1:queries}
COMMIT
```

## Commands

Access via Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

- **Geode: Execute Query** - Run current query
- **Geode: Execute Selection** - Run selected text
- **Geode: Show Schema** - Open schema explorer
- **Geode: Connect to Server** - Connect to Geode server
- **Geode: Disconnect** - Disconnect from server
- **Geode: Clear Results** - Clear result panel
- **Geode: Export Results** - Export to file
- **Geode: Format Document** - Format current file
- **Geode: Optimize Query** - Analyze and optimize
- **Geode: Show Query History** - View past queries
- **Geode: Toggle Profile** - Enable/disable profiling

## Keyboard Shortcuts

Default shortcuts (customizable):

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Execute Query | Ctrl+Enter | Cmd+Enter |
| Execute Selection | Ctrl+Shift+Enter | Cmd+Shift+Enter |
| Format Document | Shift+Alt+F | Shift+Option+F |
| Show Schema | Ctrl+Shift+S | Cmd+Shift+S |
| Go to Definition | F12 | F12 |
| Peek Definition | Alt+F12 | Option+F12 |
| Find References | Shift+F12 | Shift+F12 |
| Rename Symbol | F2 | F2 |
| Show Hover | Ctrl+K Ctrl+I | Cmd+K Cmd+I |

## Multi-Root Workspace Support

Connect to multiple Geode servers:

```json
{
  "folders": [
    {
      "path": "/path/to/project1",
      "settings": {
        "geode.server.host": "dev.example.com",
        "geode.server.port": 3141
      }
    },
    {
      "path": "/path/to/project2",
      "settings": {
        "geode.server.host": "prod.example.com",
        "geode.server.port": 3141
      }
    }
  ]
}
```

## Extensions Integration

Works seamlessly with other VS Code extensions:

### GitLens

View GQL query history and blame information

### REST Client

Send queries via HTTP (if using Geode REST API)

### Database Client

Manage multiple database connections

### Code Spell Checker

Check spelling in comments and strings

## Themes

The extension works with any VS Code theme. Recommended themes:

- **One Dark Pro**: Popular dark theme
- **Material Theme**: Material Design theme
- **Dracula Official**: Dracula color scheme
- **Nord**: Arctic, blue color scheme
- **Palenight**: Elegant, purple theme

## Performance Tips

1. **Enable Semantic Highlighting** - Better syntax highlighting
2. **Use Connection Pooling** - Configure in settings
3. **Limit Results** - Set result limit for large queries
4. **Profile Queries** - Identify slow queries
5. **Index Management** - Create indexes for frequently queried properties

## Troubleshooting

### Extension Not Loading

1. Check VS Code output panel
2. Look for error messages
3. Reinstall extension
4. Restart VS Code

### LSP Not Working

1. Check LSP server status in status bar
2. Enable LSP trace in settings
3. View LSP logs in Output panel
4. Restart LSP server (Command Palette → Reload Window)

### Connection Issues

1. Verify server host and port
2. Check firewall settings
3. Test connection with CLI
4. Enable connection logging

### Syntax Highlighting Issues

1. Verify file extension is `.gql`
2. Check language mode (bottom right)
3. Reload window (Ctrl+R / Cmd+R)

### Performance Issues

1. Reduce result limit
2. Disable semantic highlighting
3. Disable unused features
4. Clear query history

## Development

### Building from Source

```bash
git clone https://gitlab.com/devnw/codepros/geode/geode-vscode.git
cd geode-vscode
npm install
npm run compile
```

### Running in Development Mode

```bash
# Open in VS Code
code .

# Press F5 to start debugging
# This opens a new VS Code window with the extension loaded
```

### Contributing

Contributions welcome! See [CONTRIBUTING.md](https://gitlab.com/devnw/codepros/geode/geode-vscode/-/blob/main/CONTRIBUTING.md)

## Examples

### Example Workspace Settings

`.vscode/settings.json`:

```json
{
  "geode.server.host": "localhost",
  "geode.server.port": 3141,
  "geode.editor.formatOnSave": true,
  "geode.query.resultLimit": 1000,
  "editor.tabSize": 2,
  "editor.insertSpaces": true
}
```

### Example Tasks

`.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Run Migration",
      "type": "shell",
      "command": "geode exec -f ${file}",
      "problemMatcher": []
    },
    {
      "label": "Format All Queries",
      "type": "shell",
      "command": "find . -name '*.gql' -exec gqlfmt -w {} \\;",
      "problemMatcher": []
    }
  ]
}
```

### Example Launch Configuration

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug GQL Query",
      "type": "geode",
      "request": "launch",
      "program": "${file}",
      "profile": true,
      "stopOnEntry": false
    }
  ]
}
```

## Resources

- [VS Code Documentation](https://code.visualstudio.com/docs)
- [GQL Reference](/docs/gql-reference/)
- [Example Queries](/docs/examples/)
- [LSP Specification](https://microsoft.github.io/language-server-protocol/)

## Support

- Report issues: [GitLab Issues](https://gitlab.com/devnw/codepros/geode/geode-vscode/-/issues)
- Feature requests: [GitLab Issues](https://gitlab.com/devnw/codepros/geode/geode-vscode/-/issues)
- Documentation: [docs.geodedb.com](https://docs.geodedb.com)

## Repository

- GitLab: [devnw/codepros/geode/geode-vscode](https://gitlab.com/devnw/codepros/geode/geode-vscode)
- Marketplace: [Geode GQL](https://marketplace.visualstudio.com/items?itemName=codeprosorg.geode-gql)
- Documentation: [docs.geodedb.com/plugins/vscode](https://docs.geodedb.com/plugins/vscode)
