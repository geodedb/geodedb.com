---
title: "Category: Contributing"
description: "Comprehensive contributing documentation for Geode graph database including guides, tutorials, and reference materials."
keywords:
  - contributing
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/categories/contributing/"
    noindex: false
---

Contributing to Geode means joining a vibrant open-source community dedicated to building a production-ready, ISO/IEC 39075:2024-compliant graph database. Whether you're fixing bugs, adding features, improving documentation, or helping other users, your contributions help make Geode better for everyone. This category provides comprehensive guidance for contributing effectively, understanding the codebase, following project conventions, and participating in the community.

Geode is written primarily in Zig, with polyglot client libraries in Go, Python, Rust, and Zig. The project maintains rigorous quality standards including 97.4% test coverage, evidence-based development with CANARY governance markers tracking 2,190+ requirements, and comprehensive documentation. Understanding these standards and the contribution workflow ensures your contributions can be reviewed, merged, and maintained effectively.

This guide covers everything from setting up your development environment through submitting pull requests, writing tests, maintaining documentation, and participating in design discussions. Whether you're making your first open-source contribution or you're an experienced contributor, this guide provides the information you need.

## Getting Started

### Development Environment Setup

#### Prerequisites

- **Zig 0.15.1+**: For server and Zig client development
- **Go 1.24.0+**: For Go client development
- **Python 3.9+**: For Python client development
- **Rust 1.70+**: For Rust client development
- **Git**: For version control

#### Clone the Repository

```bash
# Clone the monorepo
git clone https://gitlab.com/devnw/codepros/geode.git
cd geode

# The monorepo contains:
# - geode/              Main database server
# - geode-client-go/    Go client library
# - geode-client-python/ Python client library
# - geode-client-rust/  Rust client library
# - geode-client-zig/   Zig client library
# - geode-test-harness/ Cross-client testing
# - gql/                GQL reference implementation
```

#### Server Development Setup

```bash
cd geode

# Build the server
make build

# Run tests
make test

# Run comprehensive test suite (97.4% pass rate)
make geodetestlab-comprehensive

# Start development server
./zig-out/bin/geode serve --listen 127.0.0.1:3141
```

#### Client Development Setup

```bash
# Go client
cd geode-client-go
go test -v

# Python client
cd geode-client-python
pip install -r requirements.txt
pytest

# Rust client
cd geode-client-rust
cargo build
cargo test

# Zig client
cd geode-client-zig
zig build
zig build test
```

## Contribution Workflow

### 1. Find or Create an Issue

Before starting work, check if an issue exists:

```bash
# Search existing issues
# Visit: https://gitlab.com/devnw/codepros/geode/-/issues

# Create a new issue if needed
# Describe the problem or feature request clearly
# Include reproduction steps for bugs
# Provide use cases for feature requests
```

### 2. Create a Feature Branch

```bash
# Create a branch from main
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description

# Branch naming conventions:
# - feature/feature-name
# - fix/bug-description
# - docs/documentation-update
# - refactor/refactoring-description
```

### 3. Make Your Changes

Follow the project's coding standards and architecture:

```zig
// Zig code style
// - Use 4 spaces for indentation
// - Follow Zig naming conventions
// - Add doc comments for public APIs

/// Executes a GQL query and returns results.
///
/// # Arguments
/// * `query` - The GQL query string
/// * `params` - Optional query parameters
///
/// # Returns
/// A result iterator over query results
pub fn execute(self: *Client, query: []const u8, params: ?Params) !ResultIterator {
    // Implementation
}
```

### 4. Write Tests

All code changes must include tests:

```zig
// geode/src/tests/query_test.zig
test "query with parameters" {
    const allocator = std.testing.allocator;

    var client = try Client.connect(allocator, "localhost", 3141);
    defer client.deinit();

    const query = "MATCH (u:User {id: $id}) RETURN u.name";
    const params = .{ .id = 123 };

    var result = try client.execute(query, params);
    defer result.deinit();

    const row = try result.next();
    try std.testing.expectEqualStrings("Alice", row.?.get("u.name").?.string);
}
```

Test coverage requirements:
- All new features must have tests
- Bug fixes must include regression tests
- Maintain or improve overall coverage (currently 97.4%)
- Use `make geodetestlab-comprehensive` to run full suite

### 5. Update Documentation

Documentation updates are required for:

```markdown
# API changes - Update API_REFERENCE.md
# New features - Update FEATURES_OVERVIEW.md
# User-facing changes - Update relevant guides
# Breaking changes - Update CHANGELOG.md and migration guides
```

### 6. Add CANARY Markers

Geode uses CANARY governance markers to track requirements:

```zig
// CANARY:START:FEATURE:GQL-COMPLIANCE:MATCH-CLAUSE
// Implementation of ISO/IEC 39075:2024 MATCH clause
pub fn executeMatch(self: *QueryEngine, pattern: Pattern) !ResultSet {
    // Implementation that satisfies GQL spec
}
// CANARY:END:FEATURE:GQL-COMPLIANCE:MATCH-CLAUSE
```

CANARY markers track:
- Feature implementations
- Compliance requirements
- Security measures
- Performance guarantees
- Test coverage

### 7. Commit Your Changes

Follow conventional commit format:

```bash
# Commit message format
git commit -m "type(scope): description

Longer description of the change, why it was needed,
and any relevant context.

Closes #issue-number"

# Types:
# - feat: New feature
# - fix: Bug fix
# - docs: Documentation only
# - style: Formatting, no code change
# - refactor: Code restructuring
# - perf: Performance improvement
# - test: Adding tests
# - chore: Build process, dependencies

# Examples:
git commit -m "feat(query): add support for OPTIONAL MATCH

Implements optional pattern matching per ISO/IEC 39075:2024
section 7.3. Includes comprehensive tests and updates to
query planner.

Closes #234"

git commit -m "fix(mvcc): prevent snapshot leak in long transactions

Fixes memory leak when transactions are held open for >1 hour.
Adds test case to verify cleanup.

Closes #456"
```

### 8. Push and Create Merge Request

```bash
# Push your branch
git push -u origin feature/your-feature-name

# Create merge request on GitLab
# Fill in the MR template:
# - Description of changes
# - Testing performed
# - Documentation updates
# - Breaking changes (if any)
# - Related issues

# MR title format:
# "feat: Add vector search support"
# "fix: Resolve deadlock in transaction manager"
# "docs: Update client library examples"
```

## Code Review Process

### What Reviewers Look For

1. **Correctness**: Does the code work as intended?
2. **Tests**: Are there comprehensive tests?
3. **Performance**: Are there performance regressions?
4. **Standards**: Does it follow ISO/IEC 39075:2024?
5. **Documentation**: Are user-facing changes documented?
6. **Code quality**: Is the code maintainable?
7. **CANARY markers**: Are requirements tracked?

### Addressing Review Feedback

```bash
# Make changes based on feedback
git add .
git commit -m "Address review feedback: improve error handling"
git push

# Merge requests are updated automatically
# Continue discussion in MR comments
# Resolve conversations as addressed
```

## Testing Guidelines

### Unit Tests

```zig
// Test individual functions
test "transaction rollback releases locks" {
    var tx = try Transaction.begin(allocator);
    defer tx.deinit();

    try tx.acquireLock(.exclusive, node_id);
    try tx.rollback();

    // Verify lock is released
    try std.testing.expect(!lock_manager.isLocked(node_id));
}
```

### Integration Tests

```gql
-- Test full query execution
-- tests/integration/query_test.gql

CREATE (:User {name: 'Alice', email: 'alice@example.com'})
CREATE (:User {name: 'Bob', email: 'bob@example.com'})

MATCH (u:User)
WHERE u.name = 'Alice'
RETURN u.email
-- EXPECT: alice@example.com
```

### Compliance Tests

```zig
// Test ISO/IEC 39075:2024 compliance
test "GQL compliance: MATCH with WHERE" {
    // Test implementation against GQL spec section X.Y.Z
    const query = "MATCH (n:Node) WHERE n.prop > 10 RETURN n";
    // Verify behavior matches spec
}
```

### Performance Tests

```zig
// Benchmark critical paths
test "query execution performance" {
    const iterations = 10000;
    const start = std.time.nanoTimestamp();

    for (0..iterations) |_| {
        _ = try client.execute(query, params);
    }

    const elapsed = std.time.nanoTimestamp() - start;
    const avg_ns = elapsed / iterations;

    // Verify performance target (e.g., < 1ms average)
    try std.testing.expect(avg_ns < 1_000_000);
}
```

## Documentation Guidelines

### Code Documentation

```zig
/// Executes a GQL query with parameters.
///
/// This function parses the query, creates an execution plan,
/// and returns an iterator over results. The query is executed
/// within the current transaction context if one exists.
///
/// # Arguments
/// * `query` - GQL query string (must be valid per ISO/IEC 39075:2024)
/// * `params` - Optional map of query parameters
///
/// # Returns
/// * `ResultIterator` - Iterator over query results
/// * `QueryError` - If query is invalid or execution fails
///
/// # Example
/// ```zig
/// var result = try client.execute(
///     "MATCH (u:User {id: $id}) RETURN u.name",
///     .{ .id = 123 }
/// );
/// while (try result.next()) |row| {
///     std.debug.print("{s}\n", .{row.get("u.name")});
/// }
/// ```
pub fn execute(
    self: *Client,
    query: []const u8,
    params: ?Params,
) !ResultIterator {
    // Implementation
}
```

### User Documentation

```markdown
# Update relevant documentation files:
# - README.md for overview changes
# - docs/FEATURES_OVERVIEW.md for features
# - docs/API_REFERENCE.md for API changes
# - docs/QUICK_REFERENCE.md for syntax
# - CHANGELOG.md for all user-visible changes

# Example CHANGELOG.md entry:

## [Unreleased]

### Added
- Vector search with HNSW indexing (#234)
- Support for OPTIONAL MATCH clause (#245)

### Fixed
- Deadlock in concurrent transactions (#256)
- Memory leak in long-running queries (#267)

### Changed
- Improved query planner performance by 30% (#278)

### Breaking Changes
- Configuration file format changed (see migration guide)
```

## Architecture and Design

### Read CLAUDE.md First

Before making architectural changes:

```bash
# Read the project guide
cat geode/CLAUDE.md

# Key sections:
# - Implementation Methodology (evidence-based development)
# - Architecture Overview (system design)
# - CANARY governance system
# - Development guidelines
```

### Consult for Major Changes

For significant architectural changes:

1. Create a design document
2. Open a discussion issue
3. Get feedback before implementation
4. Update architecture docs after approval

### ISO/IEC 39075:2024 Compliance

All GQL features must comply with the standard:

```zig
// Before implementing a GQL feature:
// 1. Read relevant section of ISO/IEC 39075:2024
// 2. Understand spec requirements
// 3. Implement per spec
// 4. Add compliance tests
// 5. Add CANARY markers

// Example: Implementing EXISTS predicate per spec section 8.4
// CANARY:START:COMPLIANCE:GQL:EXISTS-PREDICATE
pub fn evaluateExists(self: *Evaluator, pattern: Pattern) !bool {
    // Implementation must match spec behavior exactly
}
// CANARY:END:COMPLIANCE:GQL:EXISTS-PREDICATE
```

## Community Participation

### Communication Channels

- **GitLab Issues**: Bug reports and feature requests
- **Merge Requests**: Code review and discussion
- **Documentation**: Improvements and corrections

### Code of Conduct

- Be respectful and professional
- Focus on technical merit
- Welcome newcomers
- Assume good intentions
- Give constructive feedback

### Helping Others

- Answer questions in issues
- Review merge requests
- Improve documentation
- Write tutorials and examples
- Report bugs clearly

## Best Practices

### Development Workflow

1. **Pull latest changes** before starting work
2. **Work in small increments** (easier to review)
3. **Run tests frequently** during development
4. **Write tests first** (TDD when appropriate)
5. **Update docs** as you go
6. **Commit often** with clear messages
7. **Request review early** for large changes

### Code Quality

- Follow existing code style
- Keep functions small and focused
- Avoid premature optimization
- Write self-documenting code
- Add comments for non-obvious logic
- Handle errors properly

### Performance Considerations

- Profile before optimizing
- Add benchmarks for hot paths
- Document performance characteristics
- Test with production-scale data
- Monitor memory usage
- Avoid blocking operations

## Getting Help

### Documentation Resources

- `geode/CLAUDE.md` - Project overview and guidelines
- `geode/docs/` - Comprehensive documentation
- `README.md` files - Component-specific guides
- Code comments - Implementation details

### Asking Questions

When asking for help:

1. Search existing issues first
2. Provide clear reproduction steps
3. Include relevant code/configuration
4. Specify your environment
5. Show what you've tried

## Further Reading

- [Development Guide](/tags/development/) - Detailed development workflows
- [Architecture](/categories/architecture/) - System architecture
- [GQL Compliance](/tags/gql-compliance/) - ISO standard compliance
- [Testing Guide](/tags/debugging/) - Testing strategies
- [Performance](/categories/performance/) - Optimization guide
