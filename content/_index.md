+++
title = "Geode - Enterprise Graph Database"
description = "Production-ready graph database implementing ISO/IEC 39075:2024 GQL standard"
keywords = [
  "Geode",
  "graph database",
  "GQL",
  "ISO 39075",
  "vector search",
  "full-text search",
  "graph analytics",
]
+++

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

## 100% ISO GQL Compliance

Geode achieves **100% compliance** with ISO/IEC 39075:2024 GQL standard:
- All 70 official conformance tests passing
- Complete pattern matching syntax
- Full aggregation support
- Set operations (UNION, INTERSECT, EXCEPT)

## Enterprise-Grade Security

- **Authentication**: RBAC/ABAC with MFA support
- **Encryption**: TDE and FLE with searchable encryption
- **Audit**: Comprehensive compliance tracking
- **RLS**: Enhanced row-level security with policy evaluation

## Architecture

- **Storage Engine**: Memory-mapped I/O with page-level caching
- **Vector Search**: HNSW indexes with SIMD-accelerated distance calculations
- **Indexes**: Six specialized index types (B-tree, Hash, HNSW, R-tree, Full-text, Patricia Trie)
- **Transport**: QUIC+TLS for secure, multiplexed connections

## Client Libraries

Geode provides official client libraries for multiple programming languages:

- [**Go**](/clients/go/) - `database/sql` driver with full prepared statement support
- [**Python**](/clients/python/) - Async client with connection pooling
- [**Rust**](/clients/rust/) - High-performance tokio-based client
- [**Node.js**](/clients/nodejs/) - TypeScript-first client with pooling
- [**Zig**](/clients/zig/) - Native Zig implementation

All clients communicate via QUIC+TLS using the JSON line protocol.

## Getting Started

{{< tabs >}}
{{< tab "Linux" >}}
{{< tabs >}}
{{< tab "Debian/Ubuntu" >}}
```bash
# Add GPG signing key
curl -fsSL https://apt.geodedb.com/geode.gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/geode-archive-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/geode-archive-keyring.gpg] https://apt.geodedb.com stable main" | \
  sudo tee /etc/apt/sources.list.d/geode.list

# Install
sudo apt update
sudo apt install geode
```
{{< /tab >}}
{{< tab "RHEL/Fedora" >}}
```bash
curl -L -o geode.rpm https://gitlab.com/devnw/codepros/geode/geode/-/releases/latest/download/geode-linux-x86_64.rpm
sudo rpm -i geode.rpm
```
{{< /tab >}}
{{< tab "Generic" >}}
```bash
curl -L -o geode-linux-amd64 https://gitlab.com/devnw/codepros/geode/geode/-/releases/latest/download/geode-linux-amd64
chmod +x geode-linux-amd64
sudo install -m 0755 geode-linux-amd64 /usr/local/bin/geode
```
{{< /tab >}}
{{< /tabs >}}
{{< /tab >}}
{{< tab "macOS" >}}
```bash
# Install via Homebrew (recommended)
brew tap geodedb/geode
brew install geode
```
{{< /tab >}}
{{< tab "Windows (WSL)" >}}
```bash
# PowerShell
wsl --install -d Ubuntu

# Inside Ubuntu (WSL)
# Add GPG signing key
curl -fsSL https://apt.geodedb.com/geode.gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/geode-archive-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/geode-archive-keyring.gpg] https://apt.geodedb.com stable main" | \
  sudo tee /etc/apt/sources.list.d/geode.list

# Install
sudo apt update
sudo apt install geode
```
{{< /tab >}}
{{< /tabs >}}

```bash
# Start the server
geode serve --listen 0.0.0.0:3141

# Connect with shell
geode shell
```

```bash
# Or build from source
git clone https://github.com/codeprosorg/geode
cd geode
make build
./zig-out/bin/geode serve
```

See the [Getting Started Guide](/docs/getting-started/) for full installation instructions.

## Documentation

- [**Installation**](/docs/installation/) - Install and configure Geode
- [**GQL Tutorial**](/docs/gql-tutorial/) - Learn the query language
- [**Architecture**](/docs/architecture/) - System design and internals
- [**API Reference**](/docs/api-reference/) - Complete API documentation

## Editor Support

- [**Neovim**](/plugins/neovim/) - Full LSP integration
- [**Vim**](/plugins/vim/) - Syntax highlighting
- [**VSCode**](/plugins/vscode/) - Complete IDE support
- [**Claude Code**](/plugins/claude/) - AI-assisted development
