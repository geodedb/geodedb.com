---
title: "Development Tooling & DevOps Integration"
description: "Comprehensive guide to Geode development tooling ecosystem. Learn about CLI tools, build systems, testing frameworks, CI/CD integration, and developer productivity tools for graph database development."
keywords:
  - development tooling
  - developer tools
  - CLI tools
  - build systems
  - testing frameworks
  - CI/CD integration
  - DevOps
  - Geode
  - graph database
  - development workflow
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/tooling/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Modern database development requires sophisticated tooling to maintain productivity, ensure quality, and streamline deployment workflows. Geode provides a comprehensive ecosystem of development tools, from command-line interfaces and interactive shells to testing frameworks, profiling utilities, and CI/CD integrations. These tools enable developers to build, test, debug, and deploy graph database applications efficiently at scale.

As an enterprise-ready graph database implementing the ISO/IEC 39075:2024 GQL standard, Geode's tooling focuses on developer experience, automation, and observability. Whether you're developing locally, running integration tests, or deploying to production clusters, Geode's tooling ecosystem provides the capabilities you need to ship reliable graph applications.

## Core Command-Line Interface

Geode's primary CLI provides unified access to server management, data operations, and administrative tasks:

```bash
# Start the Geode server
geode serve --listen 0.0.0.0:3141 --data /var/lib/geode

# Start with custom configuration
geode serve --config /etc/geode/config.yaml

# Run in development mode with auto-reload
geode serve --dev --watch

# Initialize a new database
geode init --path /var/lib/geode --graph production

# Check server status
geode status

# Display version and build information
geode version --verbose
```

**Server Management Commands**:

- `serve`: Start the Geode database server
- `init`: Initialize a new database instance
- `status`: Check server health and connection status
- `shutdown`: Gracefully shutdown a running server
- `restart`: Restart server with updated configuration

**Configuration Options**:

```bash
# Listen address and port
--listen 0.0.0.0:3141

# Data directory location
--data /var/lib/geode

# Configuration file
--config /etc/geode/config.yaml

# Log level (debug, info, warn, error)
--log-level debug

# Enable performance profiling
--profile

# Maximum memory limit
--max-memory 16GB
```

## Interactive GQL Shell

The Geode shell provides an interactive REPL (Read-Eval-Print Loop) for executing GQL queries, exploring schemas, and debugging:

```bash
# Launch interactive shell
geode shell

# Connect to remote server
geode shell --host geode.example.com:3141

# Execute query from command line
geode shell -c "MATCH (n:User) RETURN n LIMIT 5;"

# Execute queries from file
geode shell -f queries.gql

# Enable query timing
geode shell --timing
```

**Shell Features**:

- **Tab Completion**: Auto-complete GQL keywords, function names, and identifiers
- **Syntax Highlighting**: Color-coded query syntax for readability
- **Query History**: Navigate previous queries with up/down arrows
- **Multi-line Editing**: Write complex queries across multiple lines
- **Output Formatting**: Choose between table, JSON, CSV, or custom formats
- **Timing Statistics**: Display query execution time and row counts
- **Error Context**: Detailed error messages with line numbers and suggestions

**Shell Commands**:

```gql
-- Show all labels
\labels

-- Show all relationship types
\types

-- Describe schema
\schema

-- Show indexes
\indexes

-- Display query execution plan
\explain MATCH (n:User) RETURN n;

-- Profile query performance
\profile MATCH (n)-[r]->(m) RETURN n, r, m;

-- Toggle timing display
\timing

-- Change output format
\format json

-- Load and execute file
\source queries.gql

-- Clear screen
\clear

-- Exit shell
\quit
```

## Testing Frameworks

Geode provides comprehensive testing tools for validating database behavior, query correctness, and performance characteristics:

**Integration suites**: server validation runs from the Makefile; the
spec-driven harness lives in the separate `geode-test-harness` repository:

```bash
# Run the local integration suites
make test-all-integration

# Run specific suites
make integration-test   # Basic end-to-end script
make regression-test    # Regression suite
make graph-test         # Graph algorithm suite
make test-concurrency   # Concurrency and locking tests
make test-performance   # Performance benchmarks

# Run with coverage reporting
make test-coverage

# Generate test reports
make test-report --format html
```

**Client Library Testing**: Language-specific test frameworks for client libraries:

```bash
# Go client tests
cd geode-client-go
go test -v ./...
go test -race ./...    # Race condition detection
go test -cover ./...   # Coverage reporting

# Python client tests
cd geode-client-python
pytest tests/
pytest --cov=geode_client tests/  # With coverage
pytest -v -s tests/    # Verbose output

# Rust client tests
cd geode-client-rust
cargo test
cargo test --release   # Release mode testing
cargo test -- --nocapture  # Show output
```

**Integration Test Harness**: Cross-client validation framework:

```bash
cd geode-test-harness

# Setup test environment
make setup

# Run tests for all clients
make test-all

# Test specific client
make test-go
make test-python
make test-rust
make test-zig

# Generate HTML reports
make test-all-html

# Run performance benchmarks
make benchmark-all
```

## Build and Development Tools

**Makefile Targets**: Geode uses Make for build automation:

```bash
# Build debug version
make build

# Build release version (optimized)
make release

# Clean build artifacts
make clean

# Run linter
make lint

# Format source code
make format

# Generate documentation
make docs

# Run all quality checks
make check

# Complete CI pipeline
make ci
```

**Dependency Management**: Geode manages dependencies using language-specific tools:

- **Zig**: Native package management via `build.zig`
- **Go**: Go modules (`go.mod`)
- **Python**: pip with `requirements.txt` and `pyproject.toml`
- **Rust**: Cargo with `Cargo.toml`

## Profiling and Performance Analysis

**Query Profiling**: Analyze query execution with built-in profiling:

```gql
-- Profile query execution
PROFILE
MATCH (u:User)-[:FOLLOWS]->(f:User)
WHERE u.created_at > '2024-01-01'
RETURN f.name, COUNT(*) AS follower_count
GROUP BY f.name
ORDER BY follower_count DESC
LIMIT 10;
```

**Server Profiling**: Enable runtime profiling for performance analysis:

```bash
# Start server with profiling enabled
geode serve --profile --profile-port 6060

# CPU profiling
curl http://localhost:6060/debug/pprof/profile?seconds=30 > cpu.prof

# Memory profiling
curl http://localhost:6060/debug/pprof/heap > mem.prof

# Goroutine analysis (for internal server debugging)
curl http://localhost:6060/debug/pprof/goroutine > goroutines.txt
```

**Metrics Collection**: Export metrics for monitoring systems:

```bash
# Prometheus metrics endpoint
curl http://localhost:3141/metrics

# JSON metrics
curl http://localhost:3141/api/v1/metrics
```

## CI/CD Integration

Geode integrates seamlessly with modern CI/CD platforms:

**GitHub Actions Example**:

```yaml
name: Geode Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      geode:
        image: geodedb/geode:latest
        ports:
          - 3141:3141
        options: >-
          --health-cmd "geode status"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Run Integration Tests
        run: |
          make test-integration

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.txt
```

**GitLab CI Example**:

```yaml
test:
  image: geodedb/geode:latest
  services:
    - name: geodedb/geode:latest
      alias: geode
  script:
    - make test-integration
  coverage: '/Coverage: \d+\.\d+%/'
```

**Docker Integration**:

```dockerfile
# Development Dockerfile with tooling
FROM geodedb/geode:latest AS dev

# Install development dependencies
RUN apt-get update && apt-get install -y \
    make \
    git \
    curl

# Copy source code
COPY . /app
WORKDIR /app

# Run tests
RUN make test

# Production image
FROM geodedb/geode:latest
COPY --from=dev /app/zig-out/bin/geode /usr/local/bin/
EXPOSE 3141
CMD ["geode", "serve", "--listen", "0.0.0.0:3141"]
```

## Data Management Tools

**Import/Export Utilities**:

```bash
# Export graph to JSON
geode export --format json --output graph.json

# Export to GraphML
geode export --format graphml --output graph.xml

# Import from JSON
geode import --format json --input graph.json

# Import from CSV
geode import --format csv --nodes users.csv --relationships follows.csv

# Bulk load data
geode bulk-load --input /data/bulk-import/
```

**Backup and Restore**:

```bash
# Create backup
geode backup --output /backups/geode-20240124.tar.gz

# Restore from backup
geode restore --input /backups/geode-20240124.tar.gz

# Incremental backup
geode backup --incremental --since 2024-01-20

# Verify backup integrity
geode backup verify --input /backups/geode-20240124.tar.gz
```

**Schema Management**:

```bash
# Export schema definition
geode schema export --output schema.gql

# Validate schema
geode schema validate --input schema.gql

# Apply schema changes
geode schema apply --input schema.gql

# Generate schema documentation
geode schema docs --output docs/
```

## IDE Integration

See the dedicated IDE Integration documentation for language server protocol (LSP) support, syntax highlighting, and debugger integration with popular development environments.

## Logging and Debugging

**Log Configuration**:

```yaml
# config.yaml
logging:
  level: debug
  format: json
  output: /var/log/geode/server.log
  rotation:
    max_size: 100MB
    max_age: 30
    max_backups: 10
```

**Debug Mode**:

```bash
# Start server in debug mode
geode serve --log-level debug --debug

# Enable query logging
geode serve --log-queries

# Trace all operations
geode serve --trace
```

## Containerization and Orchestration

**Docker Compose**:

```yaml
version: '3.8'
services:
  geode:
    image: geodedb/geode:latest
    ports:
      - "3141:3141"
    volumes:
      - geode-data:/var/lib/geode
      - ./config.yaml:/etc/geode/config.yaml
    environment:
      - GEODE_LOG_LEVEL=info
    healthcheck:
      test: ["CMD", "geode", "status"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  geode-data:
```

**Kubernetes Deployment**: See Kubernetes deployment guides for StatefulSet configurations, persistent volumes, and service definitions.

## Best Practices

1. **Use Configuration Files**: Avoid passing configuration via command-line flags in production. Use YAML or TOML configuration files for maintainability.

2. **Automate Testing**: Integrate Geode tests into your CI/CD pipeline to catch regressions early.

3. **Monitor Tool Output**: Log tool output and metrics for troubleshooting and auditing.

4. **Version Lock**: Pin Geode versions in production environments to ensure consistent behavior.

5. **Backup Regularly**: Automate backups using the built-in backup tools or snapshot mechanisms.

6. **Profile Before Optimizing**: Use `PROFILE` and `EXPLAIN` to identify actual bottlenecks before making performance changes.

## Related Topics

- CLI Reference and Command Documentation
- IDE Integration and Language Servers
- Testing Strategies and Best Practices
- CI/CD Pipeline Configuration
- Docker and Kubernetes Deployment
- Monitoring and Observability
- Performance Tuning and Optimization

## Further Reading

- Geode CLI Complete Reference
- Development Workflow Guide
- Testing Framework Documentation
- Docker Deployment Patterns
- Kubernetes StatefulSet Configuration
- CI/CD Integration Examples
