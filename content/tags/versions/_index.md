---
title: "Version Management & Compatibility"
description: "Comprehensive guide to Geode version management including version compatibility, dependency tracking, client-server versioning, upgrade paths, and multi-version deployment strategies."
keywords:
  - version management
  - version compatibility
  - dependency management
  - client versions
  - server versions
  - upgrade paths
  - version pinning
  - Geode
  - graph database
  - compatibility matrix
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/versions/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-06-01 -->

Managing database versions effectively is critical for maintaining stable, secure, and performant systems. Geode provides comprehensive version management capabilities including explicit version tracking, compatibility matrices, automated upgrade paths, and multi-version deployment support for enterprise environments.

As an ISO/IEC 39075:2024 GQL-compliant graph database, Geode follows semantic versioning with clear compatibility guarantees, enabling predictable upgrade strategies and safe dependency management across complex deployment environments.

## Version Numbering Scheme

Geode uses semantic versioning (SemVer 2.0.0):

```text
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]

Current Version: __GEODE_VERSION__
Next Minor:      0.3.0
Next Major:      1.0.0
```

**Version Components Explained**:

**MAJOR Version** (0.x.x → 1.x.x):

- Breaking API changes
- Protocol incompatibilities
- Database format changes requiring migration
- Removal of deprecated features
- Example: 0.2.15 → 1.0.0

**MINOR Version** (0.2.x → 0.3.x):

- New backward-compatible features
- New GQL functions or operators
- Performance improvements
- Enhanced client capabilities
- Example: 0.2.15 → 0.3.0

**PATCH Version** (0.2.14 → 0.2.15):

- Bug fixes
- Security patches
- Documentation corrections
- Minor optimizations
- Example: 0.2.14 → 0.2.15

## Current Version: **GEODE_VERSION**

**Server Version**:

```bash
$ geode version
Geode __GEODE_TAG__
Build: 20260329-<release-sha>
Zig: 0.1.0
Protocol: QUIC v1
GQL: ISO/IEC 39075:2024
```

**Client Library Versions**:

```bash
# Go
geodedb.com/geode __GEODE_TAG__

# Python
geode-client=={{< version "clients.python" >}}

# Rust
geode-client = "{{< version "clients.rust" >}}"

# Zig
geode-client v{{< version "clients.zig" >}}
```

## Version Compatibility Matrix

### Server-Client Compatibility

| Server Version | Go Client | Python Client | Rust Client | Zig Client | Protocol |
|----------------|-----------|---------------|-------------|------------|----------|
| 0.2.x          | rolling   | {{< version "clients.python" >}}+       | {{< version "clients.rust" >}}+ | {{< version "clients.zig" >}}+  | QUIC v1 |
| 0.1.28-0.1.39  | rolling   | 0.3.19+       | 0.1.1-alpha.8+ | 0.1.0+  | QUIC v1 |
| 0.1.3-0.1.27   | validate in staging | 0.3.x | 0.1.x | 0.1.x | QUIC v1 |

**Compatibility Rules**:

- **Prefer Current Stable Line**: Match the current stable server line with the latest published client for that language
- **Patch Flexibility**: Any patch version within the same minor version is compatible
- **Major Boundaries**: Crossing major versions requires explicit migration
- **Forward Compatibility**: Clients may connect to newer server patch versions
- **Backward Compatibility**: Servers support clients from the same minor version

### Protocol Version Compatibility

| Version | Protocol | Transport Notes | TLS     | Port | Status |
|---------|----------|-----------------|---------|------|--------|
| 0.2.x   | QUIC v1  | Multiplexed streams | TLS 1.3 | 3141 | Current |
| 0.1.28-0.1.39 | QUIC v1 | March 2026 storage transition line | TLS 1.3 | 3141 | Upgrade planned |
| 0.1.3-0.1.27 | QUIC v1 | Early production-ready line | TLS 1.3 | 3141 | Legacy |

**Migration Path**: Early `v0.1.x` stable line → March 2026 storage transition line → current `v0.2.x` stable line

## Checking Versions

**Server Version Check**:

```bash
# Version command
geode version

# Detailed version information
geode version --verbose

# JSON output for parsing
geode version --json
```

**Client Version Check**:

```bash
# Go
go list -m geodedb.com/geode

# Python
pip show geode-client

# Rust
cargo tree | grep geode-client

# Zig
zig build --version
```

**Runtime Version Negotiation**:

```gql
-- Query server version from client
SHOW VERSION;

-- Returns:
-- version: "__GEODE_VERSION__"
-- build: "20240124-1a2b3c4"
-- protocol: "QUIC v1"
-- gql_version: "ISO/IEC 39075:2024"
```

## Version Pinning

**Package Manager Pinning**:

```bash
# Go - go.mod
module myapp

go 1.24

require (
    geodedb.com/geode __GEODE_TAG__  // Exact version
)

# Python - requirements.txt
geode-client==0.3.19  # Exact version
geode-client>=0.3.19,<0.4.0  # Version range

# Rust - Cargo.toml
[dependencies]
geode-client = "=0.1.1-alpha.8"  # Exact version
# OR
geode-client = "~0.1"    # Same minor version
# OR
geode-client = "^0.1"    # Compatible versions
```

**Container Version Pinning**:

```dockerfile
# Exact version
FROM geodedb/geode:__GEODE_VERSION__

# Minor version (latest patch)
FROM geodedb/geode:0.2

# Major version (latest minor)
FROM geodedb/geode:0

# Latest (not recommended for production)
FROM geodedb/geode:latest
```

**Configuration Version Lock**:

```yaml
# config.yaml
server:
  version_check: strict  # Enforce exact version match
  min_client_version: "1.0.0"
  max_client_version: "1.0.99"
```

## Upgrade Strategies

### Rolling Upgrades (Zero-Downtime)

For clustered deployments:

```bash
# 1. Upgrade standby nodes first
ssh replica-1 "sudo apt-get install geode=__GEODE_VERSION__"
ssh replica-2 "sudo apt-get install geode=__GEODE_VERSION__"

# 2. Wait for replication sync
geode cluster status

# 3. Promote replica to primary
geode cluster promote replica-1

# 4. Upgrade old primary
ssh primary "sudo apt-get install geode=__GEODE_VERSION__"

# 5. Rebalance cluster
geode cluster rebalance
```

### Blue-Green Deployment

```bash
# 1. Deploy new version to green environment
docker-compose -f docker-compose.green.yml up -d

# 2. Replicate data from blue to green
geode replicate --from blue:3141 --to green:3141

# 3. Test green environment
./run-integration-tests.sh --host green:3141

# 4. Switch traffic to green
kubectl patch service geode -p '{"spec":{"selector":{"version":"__GEODE_VERSION__"}}}'

# 5. Decommission blue environment after validation
docker-compose -f docker-compose.blue.yml down
```

### Canary Deployment

```bash
# 1. Route 10% of traffic to new version
kubectl apply -f canary-10percent.yaml

# 2. Monitor metrics and errors
kubectl logs -l version=__GEODE_VERSION__ --tail=100

# 3. Gradually increase traffic: 25% → 50% → 100%
kubectl apply -f canary-25percent.yaml
kubectl apply -f canary-50percent.yaml
kubectl apply -f canary-100percent.yaml
```

## Multi-Version Support

**Running Multiple Versions**:

```bash
# Different versions on different ports
/opt/geode-0.1.2/bin/geode serve --listen :8443
/opt/geode-__GEODE_VERSION__/bin/geode serve --listen :3141

# Docker containers
docker run -p 8443:8443 geodedb/geode:0.1.2
docker run -p 3141:3141 geodedb/geode:__GEODE_VERSION__
```

**Client Version Selection**:

```go
// Go - include client version in HELLO
db, err := sql.Open("geode", "localhost:3141?hello_ver=__GEODE_VERSION__")

// Python - include client version in HELLO
client = Client(
    host="localhost",
    port=3141,
    hello_ver="__GEODE_VERSION__"
)

// Rust - include client version in HELLO
let client = Client::new("localhost", 3141).hello_ver("__GEODE_VERSION__");
let mut conn = client.connect().await?;
```

## Version Metadata

**Query Runtime Version Information**:

```gql
-- Server version details
SHOW VERSION;

-- Protocol capabilities
SHOW PROTOCOL;

-- Feature support matrix
SHOW FEATURES;

-- Client library version
SHOW CLIENT_VERSION;
```

**Programmatic Version Access**:

```go
// Go
version := conn.ServerVersion()
fmt.Printf("Server: %s\n", version)
fmt.Printf("Client: %s\n", geode.ClientVersion)

// Python
version = await client.get_server_version()
print(f"Server: {version}")
print(f"Client: {geode_client.__version__}")

// Rust
let version = client.server_version().await?;
println!("Server: {}", version);
println!("Client: {}", geode_client::VERSION);
```

## Dependency Management

**Transitive Dependencies**:

```bash
# Go - view dependency tree
go mod graph | grep geode

# Python - view dependencies
pip show geode-client
pipdeptree -p geode-client

# Rust - dependency tree
cargo tree -p geode-client
```

**Lock Files**:

```bash
# Go - go.sum
geodedb.com/geode __GEODE_TAG__ h1:abc123...
geodedb.com/geode __GEODE_TAG__/go.mod h1:def456...

# Python - poetry.lock or Pipfile.lock
[[package]]
name = "geode-client"
version = "0.3.19"

# Rust - Cargo.lock
[[package]]
name = "geode-client"
version = "0.1.1-alpha.8"
```

## Version Constraints in CI/CD

**GitHub Actions**:

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      geode:
        image: geodedb/geode:__GEODE_VERSION__  # Pin exact version
        ports:
          - 3141:3141

    steps:
      - uses: actions/checkout@v3

      - name: Install Client
        run: pip install geode-client==0.3.19  # Pin exact version

      - name: Run Tests
        run: pytest tests/
```

**GitLab CI**:

```yaml
test:
  image: python:3.11
  services:
    - name: geodedb/geode:__GEODE_VERSION__
      alias: geode
  before_script:
    - pip install geode-client==0.3.19
  script:
    - pytest tests/
```

## Breaking Change Migration

When crossing major version boundaries:

```bash
# 1. Review breaking changes
geode changelog --breaking --since __GEODE_TAG__

# 2. Run migration checker
geode migrate check --from __GEODE_VERSION__ --to 1.0.0

# 3. Generate migration plan
geode migrate plan --from __GEODE_VERSION__ --to 1.0.0 --output plan.yaml

# 4. Execute migration
geode migrate execute --plan plan.yaml

# 5. Validate migration
geode migrate validate
```

## Best Practices

1. **Pin Production Versions**: Always use exact version constraints in production
2. **Test Upgrades**: Validate new versions in staging before production
3. **Monitor Version Skew**: Ensure client and server versions remain compatible
4. **Document Dependencies**: Maintain clear documentation of version requirements
5. **Automate Checks**: Use CI/CD to enforce version compatibility
6. **Plan Migrations**: Schedule maintenance windows for major version upgrades
7. **Keep Current**: Stay within supported version ranges (latest 2 minor versions)

## Troubleshooting Version Issues

**Version Mismatch Errors**:

```text
Error: Client version 0.2.0 incompatible with server __GEODE_VERSION__
Solution: Upgrade client to the current published line for your language
```

**Protocol Incompatibility**:

```text
Error: Protocol QUIC v1 required, but client uses TCP
Solution: Upgrade to client library version 1.0.0+
```

**Feature Not Available**:

```text
Error: CTE support not available in server version 0.2.13
Solution: Upgrade server to __GEODE_VERSION__+
```

## Related Topics

- Release Notes and Versioning
- Version Changelog
- Migration Guides
- Compatibility Matrix
- Dependency Management
- Upgrade Procedures
- Standards Compliance

## Further Reading

- Semantic Versioning Specification
- Version Compatibility Testing
- Database Migration Strategies
- Dependency Management Best Practices
- CI/CD Version Pinning
- Multi-Version Deployment
- Upgrade Planning Guide
