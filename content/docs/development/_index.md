---
title: "Development"
description: "Developer guides for building with Geode including LSP integration, REPL usage, testing, and governance practices"
summary: "Comprehensive developer documentation covering LSP integration, advanced REPL features, testing strategies, and evidence-based governance with CANARY markers."
weight: 90
keywords:
  - development
  - developer guide
  - LSP
  - language server
  - REPL
  - testing
  - governance
  - CANARY markers
  - evidence-based development
tags:
  - development
  - developer-guide
  - testing
  - governance
  - tooling
categories:
  - development
  - contributing
toc: true
params:
  seo:
    keywords: "geode development, LSP integration, REPL guide, testing strategies, CANARY markers, evidence-based development"
    description: "Developer guides for building with Geode including LSP, REPL, testing frameworks, and evidence-based governance practices"
---

<!-- CANARY: REQ=REQ-DOCUMENTATION-STRUCTURE-001; FEATURE="DocStructure"; ASPECT=StructureTests; STATUS=TESTED; OWNER=claude; UPDATED=2026-01-16 -->

# Development

Build with Geode using modern development tools and practices. This section covers everything developers need to be productive, from LSP integration in your favorite editor to advanced testing strategies and evidence-based governance.

## Overview

Geode's development ecosystem is designed for developer productivity and code quality. Whether you're building client applications, contributing to the core database, or extending Geode with custom functionality, these guides provide the foundation you need.

The development workflow emphasizes evidence-based development with CANARY markers, comprehensive testing (97.4% pass rate), and modern tooling integration. Geode's LSP (Language Server Protocol) support brings IDE-like features to any editor, while the advanced REPL provides a powerful interactive development environment.

## Developer Tools

### LSP Integration

Full Language Server Protocol support brings autocomplete, diagnostics, go-to-definition, and hover documentation to your editor. Supports VSCode, Neovim, Emacs, and any LSP-compatible editor.

### Advanced REPL

Interactive shell with GQL syntax highlighting, multi-line editing, history search, tab completion, and integrated help. Perfect for query development, testing, and exploration.

### Testing Framework

Comprehensive testing infrastructure with unit tests, integration tests, and cross-client test harness. Includes performance benchmarks, compliance tests, and automated CI/CD pipelines.

## Topics in This Section

- **[LSP Guide](lsp-guide/)** - Language Server Protocol integration for editor support including installation, configuration, and feature overview
- **[REPL Advanced](repl-advanced/)** - Advanced REPL features including multi-line editing, history search, custom commands, and query debugging
- **[Testing Guide](testing-guide/)** - Complete testing guide covering unit tests, integration tests, test harness, and CI/CD best practices
- **[Governance](governance/)** - Evidence-based development methodology with CANARY markers, requirement tracking, and quality metrics

## Evidence-Based Development

Geode uses CANARY markers for governance and requirement tracking:

- **1,735 CANARY markers** tracking **2,190+ requirements**
- **81.4% TESTED** - Full test coverage with evidence
- **6.0% BENCHED** - Performance benchmarks
- **7.7% EXEMPT** - Documentation and metadata
- **5.7% IMPL** - Implementation without tests

This ensures every feature is backed by evidence, maintainable, and traceable to requirements.

## Development Workflow

```bash
# Clone repository
git clone https://github.com/codeprosorg/geode
cd geode

# Build debug version
make build

# Run tests
make test                           # Unit tests
make geodetestlab-comprehensive     # Full test suite

# Start REPL for interactive development
./geode shell

# Run with LSP server
./geode lsp --stdio
```

## Quality Standards

All development follows these standards:

- **Test Coverage**: Maintain >90% pass rate
- **Memory Safety**: Proper allocation/deallocation (Zig)
- **Standards Compliance**: ISO/IEC 39075:2024 for GQL
- **CANARY Markers**: Required for all implementations
- **No Feature Flags**: Remove experimental flags after validation

## Learn More

- [Contributing Guide](/docs/contribute/) - How to contribute to Geode
- [Architecture Overview](/docs/architecture/) - System architecture and design
- [GQL Guide](/docs/gql/guide/) - Complete GQL query language reference
- [API Reference](/docs/reference/api-reference-complete/) - Complete API documentation
- [Client Libraries](/docs/client-libraries/) - Build applications with Go, Python, Rust, Node.js, or Zig clients

## Getting Help

- **Documentation**: Start with the [GQL Guide](/docs/gql/guide/) and [Troubleshooting Guide](/docs/guides/troubleshooting/)
- **Issues**: Report bugs or request features on GitLab
- **Community**: Join discussions and ask questions
