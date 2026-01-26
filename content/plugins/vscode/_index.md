---
title: "VSCode Extension"
description: "VSCode extension for Geode with full IDE support"
weight: 3
tags: ["vscode", "plugin", "ide", "lsp", "gql"]
categories: ["plugins", "documentation"]
keywords:
  - Geode VS Code extension
  - GQL syntax highlighting
  - VS Code plugin
  - Geode tooling
  - Graph query IDE
---

<!-- CANARY: REQ=REQ-SYNTAX-GEN-002; FEATURE="VSCodeSyntaxGeneration"; ASPECT=BuildTarget; STATUS=EXEMPT; OWNER=tooling; UPDATED=2026-01-03 -->

# VSCode Extension for Geode

Full-featured GQL and Cypher support for Geode in Visual Studio Code, with syntax highlighting, snippets, language server diagnostics, and query execution.

## Features

### Language Support

- **Syntax Highlighting** for GQL/Cypher via TextMate grammar
- **Code Snippets** for common query patterns
- **Language Server** for diagnostics, hover docs, and completions

### Query Execution

- **Run Query**: Execute the current file (`Ctrl+Enter` / `Cmd+Enter`)
- **Run Selection**: Execute selected text (`Ctrl+Shift+Enter`)
- **Explain Query**: View execution plan

### Editor Integration

- **Status Bar**: Connection status and LSP indicator
- **Documentation Panel**: Built-in GQL reference
- **Context Menus**: Right-click to run queries

## Installation

### Prerequisites

Geode must be installed and in your PATH:

```bash
git clone https://gitlab.com/devnw/codepros/geode/geode.git
cd geode && make build
export PATH="$PWD/zig-out/bin:$PATH"
```

### Build and Install VSIX (Recommended for Testing)

```bash
npm install
npm run compile
npm run package
code --install-extension geode-gql-1.0.0.vsix
```

### Development Mode (F5 Debugging)

1. Open the repository in VS Code
2. Run `npm install`
3. Press `F5` to launch Extension Development Host
4. Open a `.gql` file in the new window

### Using Make

```bash
make install
make dev
```

## Usage

### Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Run Query | `Ctrl+Enter` | `Cmd+Enter` |
| Run Selection | `Ctrl+Shift+Enter` | `Cmd+Shift+Enter` |
| Format Document | `Shift+Alt+F` | `Shift+Option+F` |

### Commands (Command Palette)

- `Geode: Run GQL Query`
- `Geode: Run Selected Query`
- `Geode: Explain Query Plan`
- `Geode: Connect to Geode Server`
- `Geode: Show GQL Documentation`
- `Geode: Restart Language Server`

### Snippets

Common snippet prefixes include: `match`, `matchw`, `matchr`, `create`, `merge`, `set`, `delete`, `vdist`, `vknn`, `groupby`, `case`, `shortest`.

## Configuration

```json
{
  "geode.lsp.enabled": true,
  "geode.lsp.path": "geode",
  "geode.server.host": "localhost",
  "geode.server.port": 3141,
  "geode.server.autoConnect": false,
  "geode.query.timeout": 30000,
  "geode.format.keywordCase": "upper"
}
```

## Troubleshooting

### LSP Not Starting

1. Verify Geode is installed: `geode lsp --help`
2. Check Output panel: View -> Output -> "Geode GQL"
3. Verify `geode.lsp.path`

### No Syntax Highlighting

1. Confirm file extension: `.gql`, `.cypher`, `.gcypher`, or `.pgql`
2. Verify language mode shows "GQL" or "Cypher"
3. Use Command Palette -> "Change Language Mode"

### Query Execution Fails

1. Ensure server is running: `geode serve`
2. Check host/port settings
3. Run `Geode: Connect to Geode Server`

## Supported File Types

| Extension | Language ID |
|-----------|-------------|
| `.gql` | gql |
| `.gcypher` | gql |
| `.pgql` | gql |
| `.cypher` | cypher |

## Repository

- GitLab: [devnw/geode/geode-vscode](https://gitlab.com/devnw/geode/geode-vscode)
