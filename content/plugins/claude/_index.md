---
title: "Claude Code Plugin"
description: "Claude Code plugin for Geode GQL with LSP, MCP, and slash commands"
weight: 4
tags: ["claude", "plugin", "lsp", "mcp", "gql", "ai"]
categories: ["plugins", "documentation"]
keywords:
  - Geode Claude plugin
  - GQL assistance
  - developer tooling
  - Geode integrations
  - AI assistant
  - MCP tools
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-26 -->

# Claude Code Plugin for Geode

Language Server Protocol (LSP) support, Model Context Protocol (MCP) tools, and slash commands for Geode GQL in Claude Code.

## Features

### MCP Tools (via `geode mcp serve`)

The MCP server provides Claude with direct access to Geode:

| Tool | Description |
|------|-------------|
| `query` | Execute GQL queries against Geode |
| `schema` | Get graph schema information |
| `explain` | Get query execution plans |
| `catalogs` | List available catalogs |
| `graphs` | List available graphs |
| `validate` | Validate GQL query syntax |
| `complete` | Get code completions for GQL |
| `hover` | Get hover information for tokens |
| `diagnostics` | Get diagnostics for queries |

### MCP Resources

| Resource URI | Description |
|--------------|-------------|
| `geode://default/default/schema` | Graph schema |
| `geode://default/default/stats` | Database statistics |
| `geode://config` | Server configuration |

### MCP Prompts

Pre-built prompts for common graph operations:
- `find_nodes` - Generate queries to find nodes
- `find_relationships` - Generate relationship search queries
- `create_node` / `create_relationship` - Generate creation queries
- `shortest_path` - Generate shortest path queries
- `graph_analysis` - Generate graph analysis queries
- `pattern_match` - Generate pattern matching queries

### LSP Features

- **Syntax Diagnostics**: Real-time error detection for GQL
- **Hover Documentation**: Keyword, function, and type docs
- **Code Completion**: Intelligent keyword and type completion
- **Go-to-Definition**: Navigate to symbol definitions
- **Document Formatting**: Format GQL documents

### Slash Commands

- `/geode:status` - Check LSP and MCP installation and capabilities
- `/geode:mcp-status` - Detailed MCP server status and available tools
- `/geode:examples` - Show GQL query examples
- `/geode:syntax` - Quick reference for syntax and keywords
- `/geode:query` - Help draft, debug, or optimize GQL queries

## Supported File Extensions

- `.gql`
- `.gcypher`
- `.cypher`
- `.pgql`

## Installation

### Prerequisites

Geode must be installed and available in your PATH:

```bash
git clone https://gitlab.com/devnw/codepros/geode/geode.git
cd geode && make build
export PATH="$PWD/zig-out/bin:$PATH"
```

### Test Plugin Locally

```bash
claude --plugin-dir ./geode-claude-plugin
```

### Install from Marketplace (when published)

```bash
claude /plugin install geode@<marketplace-name>
```

## Usage

LSP features start automatically when you open a supported file. Use slash commands for quick references:

```
/geode:status
/geode:mcp-status
/geode:examples
/geode:examples vector
/geode:syntax
/geode:syntax aggregation
/geode:query
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
geode-claude-plugin/
├── .claude-plugin/
│   └── plugin.json
├── .lsp.json
├── .mcp.json
├── commands/
│   ├── status.md
│   ├── mcp-status.md
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

- GitLab: [devnw/codepros/geode/geode-claude-plugin](https://gitlab.com/devnw/codepros/geode/geode-claude-plugin)
