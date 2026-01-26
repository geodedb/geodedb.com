---
title: "Claude Code Plugin"
description: "Claude Code plugin for Geode GQL with LSP support and slash commands"
weight: 4
tags: ["claude", "plugin", "lsp", "gql", "ai"]
categories: ["plugins", "documentation"]
keywords:
  - Geode Claude plugin
  - GQL assistance
  - developer tooling
  - Geode integrations
  - AI assistant
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Claude Code Plugin for Geode

Language Server Protocol (LSP) support and slash commands for Geode GQL in Claude Code.

## Features

### LSP Features

- **Syntax Diagnostics**: Real-time error detection for GQL
- **Hover Documentation**: Keyword, function, and type docs
- **Code Completion**: Intelligent keyword and type completion
- **Go-to-Definition**: Navigate to symbol definitions
- **Document Formatting**: Format GQL documents

### Slash Commands

- `/geode-lsp:status` - Check LSP installation and capabilities
- `/geode-lsp:examples` - Show GQL query examples
- `/geode-lsp:syntax` - Quick reference for syntax and keywords
- `/geode-lsp:query` - Help draft, debug, or optimize GQL queries

## Supported File Extensions

- `.gql`
- `.gcypher`
- `.cypher`
- `.pgql`

## Installation

### Prerequisites

Geode must be installed and available in your PATH:

```bash
git clone https://github.com/geode-db/geode.git
cd geode && make build
export PATH="$PWD/zig-out/bin:$PATH"
```

### Test Plugin Locally

```bash
claude --plugin-dir ./claude-code-lsp-plugin
```

### Install from Marketplace (when published)

```bash
claude /plugin install geode-lsp@<marketplace-name>
```

## Usage

LSP features start automatically when you open a supported file. Use slash commands for quick references:

```
/geode-lsp:status
/geode-lsp:examples
/geode-lsp:examples vector
/geode-lsp:syntax
/geode-lsp:syntax aggregation
/geode-lsp:query
```

## LSP Capabilities

| Feature | Support |
|---------|---------|
| textDocument/hover | Yes |
| textDocument/completion | Yes (triggers: `.`, `:`, `$`) |
| textDocument/definition | Yes |
| textDocument/formatting | Yes |
| textDocument/publishDiagnostics | Yes |

## Plugin Structure

```
claude-code-lsp-plugin/
├── .claude-plugin/
│   └── plugin.json
├── .lsp.json
├── commands/
│   ├── status.md
│   ├── examples.md
│   ├── syntax.md
│   └── query.md
├── hooks/
│   ├── hooks.json
│   └── check-geode.sh
└── README.md
```

## Troubleshooting

### LSP Not Starting

1. Verify Geode is installed: `geode lsp --help`
2. Ensure Geode is in your PATH
3. Restart Claude Code after loading the plugin

### No Completions

Completions trigger on `.` for properties, `:` for labels, and `$` for parameters.

## Repository

- GitLab: [devnw/geode/geode-claude-code-lsp-plugin](https://gitlab.com/devnw/geode/geode-claude-code-lsp-plugin)
