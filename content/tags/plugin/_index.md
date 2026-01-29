---
title: "Plugin Development for Geode"
description: "Comprehensive guide to developing editor plugins and extensions for Geode GQL including Language Server Protocol implementation, syntax highlighting, auto-completion sources, query execution integration, and publishing to editor marketplaces."
keywords:
  - Geode plugins
  - editor integrations
  - IDE tooling
  - GQL plugins
  - developer tools
  - Language Server Protocol
  - plugin development
  - extension development
  - VS Code extension
  - Neovim plugin
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/plugin/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

Creating plugins and extensions for Geode enables developers to enhance their editor experience with GQL-specific features like syntax highlighting, intelligent auto-completion, real-time diagnostics, and integrated query execution. Whether you are building a plugin for your team's custom editor, extending an existing integration, or contributing to the Geode ecosystem, this guide provides comprehensive coverage of plugin development patterns and best practices.

Geode's plugin architecture leverages the Language Server Protocol (LSP) for cross-editor compatibility, allowing you to build language intelligence features once and deploy them across VS Code, Neovim, Vim, Emacs, Sublime Text, and any other LSP-compatible editor.

This guide covers LSP client implementation, syntax highlighting packages, completion sources, query execution integration, result visualization, testing strategies, and publishing workflows for various editor ecosystems.

## Architecture Overview

### Plugin Components

A complete Geode editor plugin typically includes:

```
geode-editor-plugin/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── lsp-client.ts         # LSP client implementation
│   ├── completion.ts         # Completion providers
│   ├── diagnostics.ts        # Diagnostic handling
│   ├── execution.ts          # Query execution
│   ├── results.ts            # Result visualization
│   └── schema.ts             # Schema explorer
├── syntaxes/
│   └── gql.tmLanguage.json   # TextMate grammar
├── snippets/
│   └── gql.json              # Code snippets
├── languages/
│   └── gql-language-configuration.json
├── package.json              # Extension manifest
└── README.md
```

### Integration Points

| Component | Purpose | Technology |
|-----------|---------|------------|
| Language Server | Intelligence features | LSP (JSON-RPC) |
| Syntax Highlighting | Tokenization | TextMate/Tree-sitter |
| Snippets | Code templates | Editor-specific |
| Commands | User actions | Editor API |
| UI | Results, explorer | Editor widgets |

## Language Server Protocol Client

### Basic LSP Client

Implement an LSP client to communicate with Geode's language server:

```typescript
// src/lsp-client.ts
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

export function createLanguageClient(context: ExtensionContext): LanguageClient {
  // Server options - how to start the language server
  const serverOptions: ServerOptions = {
    command: 'geode',
    args: ['lsp', '--stdio'],
    transport: TransportKind.stdio,
  };

  // Client options - document types and synchronization
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'gql' },
      { scheme: 'untitled', language: 'gql' },
    ],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.gql'),
    },
    initializationOptions: {
      connection: {
        host: workspace.getConfiguration('geode').get('host'),
        port: workspace.getConfiguration('geode').get('port'),
        database: workspace.getConfiguration('geode').get('database'),
      },
      diagnostics: {
        enabled: true,
        validateLabels: true,
        validateProperties: true,
      },
    },
  };

  // Create and return the client
  return new LanguageClient(
    'geode-gql',
    'Geode GQL Language Server',
    serverOptions,
    clientOptions
  );
}
```

### Handling LSP Notifications

Handle custom notifications from the language server:

```typescript
// src/notifications.ts
import { LanguageClient } from 'vscode-languageclient/node';

export function registerNotificationHandlers(client: LanguageClient): void {
  // Connection status updates
  client.onNotification('geode/connectionStatus', (params: ConnectionStatus) => {
    updateStatusBar(params);
    if (!params.connected) {
      showConnectionError(params.error);
    }
  });

  // Schema changes
  client.onNotification('geode/schemaChanged', (params: SchemaChange) => {
    refreshSchemaExplorer(params);
    showNotification(`Schema updated: ${params.changeType}`);
  });

  // Query execution progress
  client.onNotification('geode/queryProgress', (params: QueryProgress) => {
    updateProgressIndicator(params);
  });

  // Diagnostic updates
  client.onNotification('geode/diagnosticsUpdated', (params: DiagnosticUpdate) => {
    handleDiagnostics(params);
  });
}

interface ConnectionStatus {
  connected: boolean;
  host: string;
  port: number;
  database: string;
  error?: string;
}

interface SchemaChange {
  changeType: 'labels' | 'relationships' | 'indexes' | 'full';
  timestamp: string;
}

interface QueryProgress {
  queryId: string;
  stage: string;
  progress: number;
  rowsProcessed: number;
}
```

### Custom LSP Requests

Send custom requests to the language server:

```typescript
// src/requests.ts
import { LanguageClient } from 'vscode-languageclient/node';

export class GeodeRequests {
  constructor(private client: LanguageClient) {}

  // Execute a GQL query
  async executeQuery(query: string, params?: Record<string, any>): Promise<QueryResult> {
    return this.client.sendRequest('geode/executeQuery', {
      query,
      params,
      timeout: 30000,
    });
  }

  // Get execution plan
  async explainQuery(query: string): Promise<ExecutionPlan> {
    return this.client.sendRequest('geode/explainQuery', { query });
  }

  // Profile query execution
  async profileQuery(query: string): Promise<ProfileResult> {
    return this.client.sendRequest('geode/profileQuery', { query });
  }

  // Get schema information
  async getSchema(): Promise<Schema> {
    return this.client.sendRequest('geode/getSchema', {});
  }

  // Get labels with statistics
  async getLabels(): Promise<LabelInfo[]> {
    return this.client.sendRequest('geode/getLabels', {});
  }

  // Get properties for a label
  async getProperties(label: string): Promise<PropertyInfo[]> {
    return this.client.sendRequest('geode/getProperties', { label });
  }

  // Get relationship types
  async getRelationships(): Promise<RelationshipInfo[]> {
    return this.client.sendRequest('geode/getRelationships', {});
  }

  // Cancel running query
  async cancelQuery(queryId: string): Promise<void> {
    return this.client.sendRequest('geode/cancelQuery', { queryId });
  }
}

interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
  queryId: string;
}

interface ExecutionPlan {
  plan: PlanNode;
  estimatedCost: number;
  warnings: string[];
}

interface ProfileResult extends QueryResult {
  profile: ProfileNode;
  dbHits: number;
  memoryUsage: number;
}
```

## Syntax Highlighting

### TextMate Grammar

Create a TextMate grammar for GQL syntax:

```json
{
  "$schema": "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
  "name": "GQL",
  "scopeName": "source.gql",
  "patterns": [
    { "include": "#comments" },
    { "include": "#strings" },
    { "include": "#numbers" },
    { "include": "#keywords" },
    { "include": "#functions" },
    { "include": "#labels" },
    { "include": "#relationships" },
    { "include": "#properties" },
    { "include": "#variables" },
    { "include": "#operators" }
  ],
  "repository": {
    "comments": {
      "patterns": [
        {
          "name": "comment.line.double-dash.gql",
          "match": "--.*$"
        },
        {
          "name": "comment.block.gql",
          "begin": "/\\*",
          "end": "\\*/"
        }
      ]
    },
    "strings": {
      "patterns": [
        {
          "name": "string.quoted.single.gql",
          "begin": "'",
          "end": "'",
          "patterns": [
            {
              "name": "constant.character.escape.gql",
              "match": "\\\\."
            }
          ]
        },
        {
          "name": "string.quoted.double.gql",
          "begin": "\"",
          "end": "\"",
          "patterns": [
            {
              "name": "constant.character.escape.gql",
              "match": "\\\\."
            }
          ]
        }
      ]
    },
    "numbers": {
      "patterns": [
        {
          "name": "constant.numeric.float.gql",
          "match": "\\b\\d+\\.\\d+([eE][+-]?\\d+)?\\b"
        },
        {
          "name": "constant.numeric.integer.gql",
          "match": "\\b\\d+\\b"
        }
      ]
    },
    "keywords": {
      "patterns": [
        {
          "name": "keyword.control.gql",
          "match": "\\b(?i:MATCH|WHERE|RETURN|CREATE|DELETE|MERGE|SET|REMOVE|WITH|UNWIND|CALL|YIELD|ORDER|BY|SKIP|LIMIT|OPTIONAL|DISTINCT|AS|CASE|WHEN|THEN|ELSE|END)\\b"
        },
        {
          "name": "keyword.operator.logical.gql",
          "match": "\\b(?i:AND|OR|NOT|XOR|IN|IS|NULL|TRUE|FALSE)\\b"
        },
        {
          "name": "keyword.control.transaction.gql",
          "match": "\\b(?i:BEGIN|COMMIT|ROLLBACK|TRANSACTION)\\b"
        }
      ]
    },
    "functions": {
      "patterns": [
        {
          "name": "support.function.aggregate.gql",
          "match": "\\b(?i:COUNT|SUM|AVG|MIN|MAX|COLLECT|STDEV|PERCENTILE)\\b"
        },
        {
          "name": "support.function.string.gql",
          "match": "\\b(?i:UPPER|LOWER|TRIM|LTRIM|RTRIM|SUBSTRING|REPLACE|SPLIT|REVERSE|SIZE|LENGTH)\\b"
        },
        {
          "name": "support.function.math.gql",
          "match": "\\b(?i:ABS|CEIL|FLOOR|ROUND|SIGN|RAND|LOG|LOG10|EXP|SQRT|SIN|COS|TAN)\\b"
        },
        {
          "name": "support.function.temporal.gql",
          "match": "\\b(?i:DATE|DATETIME|TIME|DURATION|LOCALDATETIME|LOCALTIME)\\b"
        },
        {
          "name": "support.function.misc.gql",
          "match": "\\b(?i:COALESCE|NULLIF|ID|TYPE|LABELS|PROPERTIES|KEYS|NODES|RELATIONSHIPS|HEAD|TAIL|LAST)\\b"
        }
      ]
    },
    "labels": {
      "patterns": [
        {
          "name": "entity.name.type.label.gql",
          "match": ":\\s*([A-Za-z_][A-Za-z0-9_]*)",
          "captures": {
            "1": { "name": "entity.name.type.gql" }
          }
        }
      ]
    },
    "relationships": {
      "patterns": [
        {
          "name": "entity.name.type.relationship.gql",
          "match": "-\\[\\s*:?([A-Za-z_][A-Za-z0-9_]*)",
          "captures": {
            "1": { "name": "entity.name.type.gql" }
          }
        }
      ]
    },
    "properties": {
      "patterns": [
        {
          "name": "variable.other.property.gql",
          "match": "\\.([A-Za-z_][A-Za-z0-9_]*)"
        }
      ]
    },
    "variables": {
      "patterns": [
        {
          "name": "variable.parameter.gql",
          "match": "\\$([A-Za-z_][A-Za-z0-9_]*)"
        }
      ]
    },
    "operators": {
      "patterns": [
        {
          "name": "keyword.operator.comparison.gql",
          "match": "=|<>|!=|<|>|<=|>=|=~"
        },
        {
          "name": "keyword.operator.arithmetic.gql",
          "match": "\\+|-|\\*|/|%|\\^"
        },
        {
          "name": "keyword.operator.string.gql",
          "match": "\\b(?i:STARTS|ENDS|CONTAINS|LIKE)\\b"
        }
      ]
    }
  }
}
```

### Tree-sitter Grammar

For editors supporting Tree-sitter (Neovim, Helix):

```javascript
// grammar.js
module.exports = grammar({
  name: 'gql',

  extras: $ => [
    /\s/,
    $.comment,
  ],

  rules: {
    source_file: $ => repeat($.statement),

    statement: $ => seq(
      choice(
        $.match_clause,
        $.create_clause,
        $.merge_clause,
        $.delete_clause,
        $.return_clause,
        $.with_clause,
      ),
      optional(';')
    ),

    match_clause: $ => seq(
      caseInsensitive('MATCH'),
      $.pattern,
      optional($.where_clause),
    ),

    pattern: $ => seq(
      $.node_pattern,
      repeat(seq($.relationship_pattern, $.node_pattern))
    ),

    node_pattern: $ => seq(
      '(',
      optional($.variable),
      optional($.label),
      optional($.properties),
      ')'
    ),

    relationship_pattern: $ => choice(
      seq('-[', optional($.variable), optional($.rel_type), optional($.properties), ']-'),
      seq('-[', optional($.variable), optional($.rel_type), optional($.properties), ']->'),
      seq('<-[', optional($.variable), optional($.rel_type), optional($.properties), ']-'),
    ),

    label: $ => seq(':', $.identifier),

    rel_type: $ => seq(':', $.identifier),

    variable: $ => $.identifier,

    identifier: $ => /[A-Za-z_][A-Za-z0-9_]*/,

    properties: $ => seq(
      '{',
      sepBy(',', $.property_assignment),
      '}'
    ),

    property_assignment: $ => seq(
      $.identifier,
      ':',
      $.expression
    ),

    where_clause: $ => seq(
      caseInsensitive('WHERE'),
      $.expression
    ),

    return_clause: $ => seq(
      caseInsensitive('RETURN'),
      sepBy(',', $.return_item)
    ),

    return_item: $ => seq(
      $.expression,
      optional(seq(caseInsensitive('AS'), $.identifier))
    ),

    expression: $ => choice(
      $.literal,
      $.variable,
      $.property_access,
      $.function_call,
      $.binary_expression,
      $.unary_expression,
      seq('(', $.expression, ')'),
    ),

    literal: $ => choice(
      $.string,
      $.number,
      $.boolean,
      $.null,
    ),

    string: $ => choice(
      seq("'", /[^']*/, "'"),
      seq('"', /[^"]*/, '"'),
    ),

    number: $ => /\d+(\.\d+)?/,

    boolean: $ => choice(
      caseInsensitive('TRUE'),
      caseInsensitive('FALSE')
    ),

    null: $ => caseInsensitive('NULL'),

    property_access: $ => seq(
      $.variable,
      '.',
      $.identifier
    ),

    function_call: $ => seq(
      $.identifier,
      '(',
      optional(sepBy(',', $.expression)),
      ')'
    ),

    binary_expression: $ => prec.left(seq(
      $.expression,
      choice('+', '-', '*', '/', '=', '<>', '<', '>', '<=', '>=', 'AND', 'OR'),
      $.expression
    )),

    unary_expression: $ => prec.right(seq(
      choice('NOT', '-'),
      $.expression
    )),

    comment: $ => choice(
      seq('--', /.*/),
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/')
    ),
  }
});

function caseInsensitive(keyword) {
  return new RegExp(keyword.split('').map(c =>
    `[${c.toLowerCase()}${c.toUpperCase()}]`
  ).join(''));
}

function sepBy(sep, rule) {
  return optional(seq(rule, repeat(seq(sep, rule))));
}
```

## Auto-Completion

### Completion Provider

Implement a completion provider for rich suggestions:

```typescript
// src/completion.ts
import * as vscode from 'vscode';
import { GeodeRequests } from './requests';

export class GeodeCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private geode: GeodeRequests) {}

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.CompletionItem[]> {
    const context = this.getCompletionContext(document, position);

    switch (context.type) {
      case 'label':
        return this.getLabelCompletions();
      case 'property':
        return this.getPropertyCompletions(context.label);
      case 'relationship':
        return this.getRelationshipCompletions();
      case 'function':
        return this.getFunctionCompletions();
      case 'keyword':
        return this.getKeywordCompletions(context.previousKeyword);
      default:
        return [];
    }
  }

  private getCompletionContext(
    document: vscode.TextDocument,
    position: vscode.Position
  ): CompletionContext {
    const lineText = document.lineAt(position).text;
    const textBeforeCursor = lineText.substring(0, position.character);

    // After colon - label completion
    if (textBeforeCursor.match(/:\s*\w*$/)) {
      return { type: 'label' };
    }

    // After dot - property completion
    const propMatch = textBeforeCursor.match(/(\w+)\.\w*$/);
    if (propMatch) {
      const label = this.inferLabel(document, propMatch[1], position);
      return { type: 'property', variable: propMatch[1], label };
    }

    // After -[ or relationship context
    if (textBeforeCursor.match(/-\[\s*:?\w*$/)) {
      return { type: 'relationship' };
    }

    // After function name opening paren
    if (textBeforeCursor.match(/\w+\(\s*$/)) {
      return { type: 'function_args' };
    }

    // Default to keyword completion
    return { type: 'keyword', previousKeyword: this.getPreviousKeyword(textBeforeCursor) };
  }

  private async getLabelCompletions(): Promise<vscode.CompletionItem[]> {
    const labels = await this.geode.getLabels();

    return labels.map(label => {
      const item = new vscode.CompletionItem(
        label.name,
        vscode.CompletionItemKind.Class
      );
      item.detail = `Label (${label.nodeCount} nodes)`;
      item.documentation = new vscode.MarkdownString(
        `**${label.name}**\n\n` +
        `- Nodes: ${label.nodeCount}\n` +
        `- Properties: ${label.properties.join(', ')}\n` +
        `- Indexes: ${label.indexes.join(', ')}`
      );
      return item;
    });
  }

  private async getPropertyCompletions(label?: string): Promise<vscode.CompletionItem[]> {
    if (!label) return [];

    const properties = await this.geode.getProperties(label);

    return properties.map(prop => {
      const item = new vscode.CompletionItem(
        prop.name,
        vscode.CompletionItemKind.Property
      );
      item.detail = `${prop.type}${prop.indexed ? ' (indexed)' : ''}`;
      item.documentation = new vscode.MarkdownString(
        `**${prop.name}**: ${prop.type}\n\n` +
        `- Nullable: ${prop.nullable}\n` +
        `- Indexed: ${prop.indexed}\n` +
        `- Unique: ${prop.unique}`
      );
      return item;
    });
  }

  private async getRelationshipCompletions(): Promise<vscode.CompletionItem[]> {
    const relationships = await this.geode.getRelationships();

    return relationships.map(rel => {
      const item = new vscode.CompletionItem(
        rel.type,
        vscode.CompletionItemKind.Reference
      );
      item.detail = `Relationship (${rel.count} edges)`;
      item.documentation = new vscode.MarkdownString(
        `**${rel.type}**\n\n` +
        `- Count: ${rel.count}\n` +
        `- From: ${rel.fromLabels.join(', ')}\n` +
        `- To: ${rel.toLabels.join(', ')}`
      );
      return item;
    });
  }

  private getFunctionCompletions(): vscode.CompletionItem[] {
    return GQL_FUNCTIONS.map(fn => {
      const item = new vscode.CompletionItem(
        fn.name,
        vscode.CompletionItemKind.Function
      );
      item.detail = fn.signature;
      item.documentation = new vscode.MarkdownString(
        `**${fn.signature}**\n\n${fn.description}\n\n` +
        `**Example:**\n\`\`\`gql\n${fn.example}\n\`\`\``
      );
      item.insertText = new vscode.SnippetString(`${fn.name}($1)`);
      return item;
    });
  }

  private getKeywordCompletions(previousKeyword?: string): vscode.CompletionItem[] {
    const keywords = this.getContextualKeywords(previousKeyword);

    return keywords.map(kw => {
      const item = new vscode.CompletionItem(
        kw.name,
        vscode.CompletionItemKind.Keyword
      );
      item.detail = 'Keyword';
      item.documentation = kw.description;
      if (kw.snippet) {
        item.insertText = new vscode.SnippetString(kw.snippet);
      }
      return item;
    });
  }

  private inferLabel(
    document: vscode.TextDocument,
    variable: string,
    position: vscode.Position
  ): string | undefined {
    // Search backwards for variable binding with label
    const text = document.getText(new vscode.Range(0, 0, position.line, position.character));
    const match = text.match(new RegExp(`\\(${variable}:(\\w+)\\)`));
    return match ? match[1] : undefined;
  }

  private getPreviousKeyword(text: string): string | undefined {
    const keywords = ['MATCH', 'WHERE', 'RETURN', 'CREATE', 'DELETE', 'SET', 'WITH'];
    for (const kw of keywords) {
      if (text.toUpperCase().includes(kw)) {
        return kw;
      }
    }
    return undefined;
  }

  private getContextualKeywords(previous?: string): KeywordInfo[] {
    // Return keywords valid in current context
    const all = [
      { name: 'MATCH', description: 'Match patterns in the graph', snippet: 'MATCH ($1)' },
      { name: 'WHERE', description: 'Filter results', snippet: 'WHERE $1' },
      { name: 'RETURN', description: 'Return results', snippet: 'RETURN $1;' },
      { name: 'CREATE', description: 'Create nodes/relationships', snippet: 'CREATE ($1)' },
      { name: 'DELETE', description: 'Delete nodes/relationships' },
      { name: 'SET', description: 'Set properties', snippet: 'SET $1 = $2' },
      { name: 'ORDER BY', description: 'Order results', snippet: 'ORDER BY $1' },
      { name: 'LIMIT', description: 'Limit results', snippet: 'LIMIT $1' },
      { name: 'SKIP', description: 'Skip results', snippet: 'SKIP $1' },
    ];

    // Filter based on context
    if (previous === 'MATCH') {
      return all.filter(k => ['WHERE', 'RETURN', 'WITH', 'CREATE', 'DELETE'].includes(k.name));
    }
    if (previous === 'WHERE') {
      return all.filter(k => ['AND', 'OR', 'RETURN', 'WITH'].includes(k.name));
    }

    return all;
  }
}

interface CompletionContext {
  type: 'label' | 'property' | 'relationship' | 'function' | 'function_args' | 'keyword';
  variable?: string;
  label?: string;
  previousKeyword?: string;
}

interface KeywordInfo {
  name: string;
  description: string;
  snippet?: string;
}
```

## Query Execution

### Execution Provider

Implement query execution with result handling:

```typescript
// src/execution.ts
import * as vscode from 'vscode';
import { GeodeRequests, QueryResult } from './requests';
import { ResultsPanel } from './results-panel';

export class QueryExecutor {
  private resultsPanel: ResultsPanel;
  private runningQueries: Map<string, vscode.CancellationTokenSource> = new Map();

  constructor(private geode: GeodeRequests) {
    this.resultsPanel = new ResultsPanel();
  }

  async executeQuery(document: vscode.TextDocument, selection?: vscode.Selection): Promise<void> {
    const query = selection
      ? document.getText(selection)
      : this.getCurrentQuery(document);

    if (!query.trim()) {
      vscode.window.showWarningMessage('No query to execute');
      return;
    }

    const queryId = this.generateQueryId();
    const cancellation = new vscode.CancellationTokenSource();
    this.runningQueries.set(queryId, cancellation);

    try {
      // Show progress
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Executing query...',
          cancellable: true,
        },
        async (progress, token) => {
          token.onCancellationRequested(() => {
            this.cancelQuery(queryId);
          });

          const startTime = Date.now();
          const result = await this.geode.executeQuery(query);
          const executionTime = Date.now() - startTime;

          this.resultsPanel.showResults({
            ...result,
            executionTime,
            query,
          });
        }
      );
    } catch (error) {
      this.handleError(error);
    } finally {
      this.runningQueries.delete(queryId);
    }
  }

  async explainQuery(document: vscode.TextDocument): Promise<void> {
    const query = this.getCurrentQuery(document);

    try {
      const plan = await this.geode.explainQuery(query);
      this.resultsPanel.showPlan(plan);
    } catch (error) {
      this.handleError(error);
    }
  }

  async profileQuery(document: vscode.TextDocument): Promise<void> {
    const query = this.getCurrentQuery(document);

    try {
      const profile = await this.geode.profileQuery(query);
      this.resultsPanel.showProfile(profile);
    } catch (error) {
      this.handleError(error);
    }
  }

  private getCurrentQuery(document: vscode.TextDocument): string {
    const text = document.getText();
    const editor = vscode.window.activeTextEditor;

    if (!editor) return text;

    const position = editor.selection.active;
    const queries = this.splitQueries(text);

    // Find query containing cursor
    let currentOffset = 0;
    const cursorOffset = document.offsetAt(position);

    for (const query of queries) {
      const queryEnd = currentOffset + query.length;
      if (cursorOffset >= currentOffset && cursorOffset <= queryEnd) {
        return query;
      }
      currentOffset = queryEnd + 1; // +1 for semicolon
    }

    return text;
  }

  private splitQueries(text: string): string[] {
    // Split on semicolons, but respect strings
    const queries: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';

    for (const char of text) {
      if ((char === "'" || char === '"') && !inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && inString) {
        inString = false;
      } else if (char === ';' && !inString) {
        if (current.trim()) {
          queries.push(current.trim());
        }
        current = '';
        continue;
      }
      current += char;
    }

    if (current.trim()) {
      queries.push(current.trim());
    }

    return queries;
  }

  private async cancelQuery(queryId: string): Promise<void> {
    const cancellation = this.runningQueries.get(queryId);
    if (cancellation) {
      cancellation.cancel();
      await this.geode.cancelQuery(queryId);
      this.runningQueries.delete(queryId);
    }
  }

  private handleError(error: any): void {
    const message = error.message || 'Query execution failed';
    vscode.window.showErrorMessage(`Geode Error: ${message}`);
    this.resultsPanel.showError(error);
  }

  private generateQueryId(): string {
    return `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Results Panel

Create a webview panel for displaying results:

```typescript
// src/results-panel.ts
import * as vscode from 'vscode';

export class ResultsPanel {
  private panel: vscode.WebviewPanel | undefined;

  showResults(result: QueryResultWithMeta): void {
    this.ensurePanel();
    this.panel!.webview.html = this.getResultsHtml(result);
    this.panel!.reveal();
  }

  showPlan(plan: ExecutionPlan): void {
    this.ensurePanel();
    this.panel!.webview.html = this.getPlanHtml(plan);
    this.panel!.reveal();
  }

  showProfile(profile: ProfileResult): void {
    this.ensurePanel();
    this.panel!.webview.html = this.getProfileHtml(profile);
    this.panel!.reveal();
  }

  showError(error: any): void {
    this.ensurePanel();
    this.panel!.webview.html = this.getErrorHtml(error);
    this.panel!.reveal();
  }

  private ensurePanel(): void {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'geodeResults',
        'Geode Results',
        vscode.ViewColumn.Two,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    }
  }

  private getResultsHtml(result: QueryResultWithMeta): string {
    const tableRows = result.rows.map(row =>
      `<tr>${result.columns.map(col =>
        `<td>${this.formatValue(row[col])}</td>`
      ).join('')}</tr>`
    ).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: var(--vscode-font-family); padding: 10px; }
    .stats { color: var(--vscode-descriptionForeground); margin-bottom: 10px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid var(--vscode-panel-border); padding: 8px; text-align: left; }
    th { background: var(--vscode-editor-lineHighlightBackground); }
    tr:hover { background: var(--vscode-list-hoverBackground); }
    .toolbar { margin-bottom: 10px; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 5px 10px; cursor: pointer; }
    button:hover { background: var(--vscode-button-hoverBackground); }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="copyResults()">Copy</button>
    <button onclick="exportCsv()">Export CSV</button>
    <button onclick="exportJson()">Export JSON</button>
  </div>
  <div class="stats">
    ${result.rowCount} rows in ${result.executionTime}ms
  </div>
  <table>
    <thead>
      <tr>${result.columns.map(c => `<th>${c}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <script>
    const vscode = acquireVsCodeApi();
    const results = ${JSON.stringify(result)};

    function copyResults() {
      vscode.postMessage({ command: 'copy', data: results });
    }

    function exportCsv() {
      vscode.postMessage({ command: 'exportCsv', data: results });
    }

    function exportJson() {
      vscode.postMessage({ command: 'exportJson', data: results });
    }
  </script>
</body>
</html>`;
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '<span class="null">null</span>';
    }
    if (typeof value === 'object') {
      return `<pre>${JSON.stringify(value, null, 2)}</pre>`;
    }
    return String(value);
  }

  private getPlanHtml(plan: ExecutionPlan): string {
    // Render execution plan as tree
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: var(--vscode-font-family); padding: 10px; }
    .plan-node { margin-left: 20px; border-left: 2px solid var(--vscode-panel-border); padding-left: 10px; }
    .node-type { font-weight: bold; color: var(--vscode-symbolIcon-functionForeground); }
    .node-cost { color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <h2>Execution Plan</h2>
  <div class="plan-tree">
    ${this.renderPlanNode(plan.plan)}
  </div>
  <p>Estimated cost: ${plan.estimatedCost}</p>
</body>
</html>`;
  }

  private renderPlanNode(node: PlanNode): string {
    const children = node.children?.map(c => this.renderPlanNode(c)).join('') || '';
    return `
      <div class="plan-node">
        <span class="node-type">${node.type}</span>
        <span class="node-cost">(cost: ${node.cost}, rows: ${node.estimatedRows})</span>
        ${children}
      </div>
    `;
  }

  private getProfileHtml(profile: ProfileResult): string {
    // Similar to results but with profiling data
    return this.getResultsHtml(profile) + `
      <h3>Profile</h3>
      <p>DB Hits: ${profile.dbHits}</p>
      <p>Memory: ${(profile.memoryUsage / 1024 / 1024).toFixed(2)} MB</p>
    `;
  }

  private getErrorHtml(error: any): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: var(--vscode-font-family); padding: 10px; }
    .error { color: var(--vscode-errorForeground); }
    .details { background: var(--vscode-editor-background); padding: 10px; margin-top: 10px; }
  </style>
</head>
<body>
  <h2 class="error">Error</h2>
  <p>${error.message || 'Unknown error'}</p>
  ${error.code ? `<p>Code: ${error.code}</p>` : ''}
  ${error.details ? `<div class="details"><pre>${JSON.stringify(error.details, null, 2)}</pre></div>` : ''}
</body>
</html>`;
  }
}
```

## Testing

### Unit Tests

```typescript
// test/completion.test.ts
import * as assert from 'assert';
import { GeodeCompletionProvider } from '../src/completion';

suite('Completion Provider', () => {
  test('should complete labels after colon', async () => {
    const provider = new GeodeCompletionProvider(mockGeode);
    const document = createMockDocument('MATCH (u:');
    const position = new Position(0, 10);

    const completions = await provider.provideCompletionItems(document, position);

    assert.ok(completions.length > 0);
    assert.ok(completions.some(c => c.label === 'User'));
  });

  test('should complete properties after dot', async () => {
    const provider = new GeodeCompletionProvider(mockGeode);
    const document = createMockDocument('MATCH (u:User) WHERE u.');
    const position = new Position(0, 23);

    const completions = await provider.provideCompletionItems(document, position);

    assert.ok(completions.length > 0);
    assert.ok(completions.some(c => c.label === 'email'));
  });
});
```

### Integration Tests

```typescript
// test/integration/execution.test.ts
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Query Execution Integration', () => {
  suiteSetup(async () => {
    // Activate extension
    const ext = vscode.extensions.getExtension('geodedb.geode-gql');
    await ext?.activate();
  });

  test('should execute simple query', async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: 'gql',
      content: 'RETURN 1 + 1 AS result;'
    });

    await vscode.window.showTextDocument(doc);
    await vscode.commands.executeCommand('geode.executeQuery');

    // Verify results panel appeared
    // Check result value
  });
});
```

## Publishing

### VS Code Marketplace

```json
// package.json
{
  "name": "geode-gql",
  "displayName": "Geode GQL",
  "description": "GQL language support for Geode graph database",
  "version": "1.0.0",
  "publisher": "geodedb",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Programming Languages", "Linters", "Formatters"],
  "activationEvents": ["onLanguage:gql"],
  "main": "./out/extension.js",
  "contributes": {
    "languages": [{ "id": "gql", "extensions": [".gql"], "aliases": ["GQL"] }],
    "grammars": [{ "language": "gql", "scopeName": "source.gql", "path": "./syntaxes/gql.tmLanguage.json" }],
    "commands": [
      { "command": "geode.executeQuery", "title": "Execute Query" }
    ]
  }
}
```

**Publishing**:

```bash
# Install vsce
npm install -g @vscode/vsce

# Package extension
vsce package

# Publish
vsce publish
```

### Neovim Plugin Registry

Submit to awesome-neovim and nvim-lspconfig.

### Vim.org

Submit to vim.org scripts or use vim-plug registry.

## Best Practices

**Use LSP for Cross-Editor Features**: Implement features in the language server to share across editors.

**Follow Editor Conventions**: Match UI patterns and keybindings of the target editor.

**Handle Errors Gracefully**: Provide clear error messages and recovery options.

**Support Offline Mode**: Cache schema for basic completion when disconnected.

**Document Configuration**: Provide clear documentation for all settings.

**Test Thoroughly**: Cover unit, integration, and end-to-end scenarios.

**Version Compatibility**: Support multiple editor versions where possible.

**Performance**: Keep completion and diagnostics fast (< 100ms).

## Related Topics

- [VS Code Extension](/tags/vscode/) - VS Code integration details
- [Neovim Plugin](/tags/neovim/) - Neovim configuration
- [Vim Plugin](/tags/vim/) - Vim setup guide
- [Editor Integrations](/tags/editor/) - Overview of all integrations
- [IDE Integration](/tags/ide/) - IDE-specific features
- [LSP Guide](/docs/development/lsp-guide/) - LSP implementation

## Further Reading

- Language Server Protocol Specification
- VS Code Extension API
- Neovim Plugin Development
- Tree-sitter Grammar Development
- TextMate Grammar Reference
- Editor Plugin Best Practices
