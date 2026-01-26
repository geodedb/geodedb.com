---
title: "Contributing to Geode"
description: "Contribute to Geode graph database: code, documentation, testing, bug reports, and community participation guidelines"
keywords: ["contributing", "open source", "development", "pull request", "code contribution", "documentation", "testing", "community", "bug report"]
weight: 100
slug: "contribute"
canonical: "https://geodedb.com/docs/contribute/"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Contributing to Geode

Thank you for your interest in contributing to Geode! This guide will help you get started.

## Ways to Contribute

### Code Contributions
- Implement new features
- Fix bugs and issues
- Improve performance
- Add tests

### Documentation
- Write tutorials and guides
- Improve API documentation
- Fix typos and clarify examples
- Translate documentation

### Testing
- Report bugs
- Write test cases
- Perform load testing
- Test on different platforms

### Community
- Answer questions
- Help other users
- Share use cases
- Write blog posts

## Getting Started

### 1. Setup Development Environment

```bash
# Clone repository
git clone https://github.com/codeprosorg/geode
cd geode

# Install Zig 0.15.1+
# Download from https://ziglang.org/download/

# Build
zig build

# Run tests
zig build test

# Run comprehensive tests
python3 scripts/test/extended_test_runner.py
```

### 2. Find Something to Work On

- **Good First Issues**: Look for `good-first-issue` label
- **Help Wanted**: Check `help-wanted` label
- **Bug Reports**: Browse open issues
- **Feature Requests**: Review enhancement proposals

### 3. Create a Branch

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Or bug fix branch
git checkout -b fix/issue-123-description
```

## Code Contribution Guidelines

### Code Standards

**Zig Code Style**:
- Follow Zig style guide
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

**Example**:
```zig
// Good
pub fn calculatePageRank(
    graph: *Graph,
    iterations: u32,
    damping_factor: f64,
) !PageRankResult {
    // Implementation
}

// Bad
pub fn calc(g: *Graph, i: u32, d: f64) !PR {
    // Implementation
}
```

### CANARY Markers

All implementations must include CANARY markers for governance tracking:

```zig
// CANARY: REQ=REQ-XXX; FEATURE="PageRank"; ASPECT=Algorithm; STATUS=TESTED; TEST=TestPageRankBasic; OWNER=graph; UPDATED=2026-01-24
pub fn pageRank(graph: *Graph, config: PageRankConfig) !Result {
    // Implementation
}
```

**CANARY Format**:
```
// CANARY: REQ=REQ-XXX; FEATURE="Name"; ASPECT=Aspect; STATUS=IMPL; TEST=TestName; OWNER=team; UPDATED=YYYY-MM-DD
```

**Statuses**: `TESTED`, `BENCHED`, `IMPL`, `EXEMPT`

### Testing Requirements

Every code change must include tests:

```zig
test "PageRank: basic graph" {
    const allocator = std.testing.allocator;

    // Setup
    var graph = try Graph.init(allocator);
    defer graph.deinit();

    // Test implementation
    const result = try pageRank(&graph, .{
        .iterations = 20,
        .damping_factor = 0.85,
    });

    // Assertions
    try std.testing.expectApproxEqAbs(0.38, result.scores[0], 0.01);
}
```

**Test Coverage Requirements**:
- Unit tests for new functions
- Integration tests for features
- >90% code coverage maintained

### Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`

**Examples**:
```
feat(query): Add PageRank graph algorithm

Implements PageRank algorithm with configurable damping factor
and iteration count. Includes HNSW index integration.

CANARY: REQ=REQ-XXX; FEATURE="PageRank"; ASPECT=Algorithm; STATUS=TESTED; TEST=TestPageRankBasic; OWNER=graph; UPDATED=2026-01-24
Closes #123

fix(storage): Resolve WAL corruption on crash

Fixed race condition in WAL sync that could cause corruption
during ungraceful shutdown.

CANARY: REQ=REQ-XXX; FEATURE="WAL"; ASPECT=CrashRecovery; STATUS=TESTED; TEST=TestWalCrashRecovery; OWNER=storage; UPDATED=2026-01-24
Fixes #456
```

## Pull Request Process

### 1. Create Pull Request

```bash
# Push branch
git push origin feature/your-feature-name

# Create PR on GitLab
# Title: Brief description (50 chars)
# Description: Detailed explanation with:
#   - What changed
#   - Why the change was needed
#   - How to test
#   - Related issues
```

### 2. PR Template

```markdown
## Description
Brief summary of changes

## Motivation
Why is this change needed?

## Changes
- Added feature X
- Fixed bug Y
- Updated documentation Z

## Testing
- [ ] Unit tests added
- [ ] Integration tests pass
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] CANARY markers added
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Commit messages follow format

## Related Issues
Closes #123
Relates to #456
```

### 3. Code Review

Expect feedback on:
- Code quality and style
- Test coverage
- Performance implications
- Documentation
- Security considerations

**Responding to Feedback**:
- Be open to suggestions
- Ask questions if unclear
- Make requested changes
- Update PR description if scope changes

### 4. Merge Requirements

Before merge, PR must:
- ✅ Pass all CI checks
- ✅ Have >90% test coverage
- ✅ Be approved by maintainer
- ✅ Have no merge conflicts
- ✅ Include CANARY markers
- ✅ Update documentation

## Documentation Contributions

### Documentation Structure

```
geode/docs/           # Markdown documentation
geodedb.com/          # Hugo static site
  content/docs/       # User-facing documentation
    tutorials/        # Step-by-step guides
    guides/           # How-to guides
    reference/        # API reference
    use-cases/        # Domain examples
```

### Writing Documentation

**Style Guide**:
- Use active voice
- Keep sentences short (<25 words)
- Provide code examples
- Include expected output
- Add troubleshooting section

**Example Structure**:
```markdown
# Page Title

Brief introduction (2-3 sentences)

## Prerequisites
- Requirement 1
- Requirement 2

## Step-by-Step Guide

### Step 1: First Action
\```gql
-- Code example
CREATE (:Node {property: value});
\```

**Expected output**:
\```
Created 1 node
\```

### Step 2: Next Action
...

## Troubleshooting

**Problem**: Common issue

**Solution**: How to resolve

## Next Steps
- [Related Guide](/docs/guides/related/)
- [Tutorial](/docs/tutorials/tutorial/)
```

### Documentation PR

```bash
# Documentation changes
git checkout -b docs/improve-transaction-guide

# Make changes
vim geodedb.com/content/docs/tutorials/transactions.md

# Commit
git commit -m "docs(tutorials): Improve transaction examples"

# Push and create PR
git push origin docs/improve-transaction-guide
```

## Bug Reports

### Before Reporting

1. **Search existing issues**: Check if already reported
2. **Verify reproduction**: Ensure it's reproducible
3. **Check version**: Test on latest version
4. **Gather information**: Collect logs and environment details

### Bug Report Template

```markdown
## Bug Description
Clear, concise description of the bug

## Steps to Reproduce
1. Start Geode server
2. Execute query: `MATCH (n) RETURN n`
3. Observe error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Geode version: 0.18.0
- OS: Ubuntu 22.04
- Zig version: 0.15.1
- Client library: Python 0.18.0

## Logs
\```
[ERROR] Stack trace...
\```

## Additional Context
Any other relevant information
```

## Feature Requests

### Feature Request Template

```markdown
## Feature Description
What feature are you proposing?

## Motivation
Why is this feature needed? What problem does it solve?

## Proposed Solution
How should this be implemented?

## Alternatives Considered
What other solutions were considered?

## Additional Context
- Related features
- Use cases
- Examples from other systems
```

## Community Guidelines

### Code of Conduct

- **Be respectful**: Treat everyone with respect
- **Be collaborative**: Work together constructively
- **Be inclusive**: Welcome diverse perspectives
- **Be patient**: Help newcomers learn

### Communication Channels

- **GitLab Issues**: Bug reports, feature requests
- **GitLab Merge Requests**: Code review
- **Discussions**: General questions and ideas
- **Email**: security@codepros.org (security issues only)

## Development Workflow

### Typical Workflow

```bash
# 1. Sync with main
git checkout main
git pull origin main

# 2. Create branch
git checkout -b feature/my-feature

# 3. Make changes
vim src/feature.zig

# 4. Add tests
vim src/feature_test.zig

# 5. Run tests
zig build test

# 6. Commit
git add .
git commit -m "feat: Add my feature"

# 7. Push
git push origin feature/my-feature

# 8. Create PR
# (via GitLab web interface)

# 9. Address review feedback
# (update code, push again)

# 10. Merge
# (maintainer merges after approval)
```

### CI/CD Pipeline

All PRs run through CI:

1. **Build**: Compile on multiple platforms
2. **Test**: Run full test suite (>1,600 tests)
3. **Lint**: Check code style
4. **Coverage**: Verify >90% coverage
5. **Benchmark**: Run performance tests
6. **Documentation**: Build docs site

## License

By contributing, you agree that your contributions will be licensed under the **Apache License 2.0**.

## Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- Git commit history
- Documentation co-authorship

## Getting Help

- **Documentation**: Read existing guides first
- **Issues**: Search for similar issues
- **Discussions**: Ask in GitLab discussions
- **Code**: Check existing implementations for examples

## Advanced Topics

### Performance Optimization

When contributing performance improvements:

1. **Benchmark first**: Establish baseline
2. **Measure impact**: Use `zig build bench`
3. **Document results**: Include before/after metrics
4. **Avoid premature optimization**: Profile first

### Security

**Reporting Security Issues**:
- **DO NOT** open public issues
- **Email**: security@codepros.org
- **Encrypt**: Use PGP if possible
- **Include**: Detailed reproduction steps

**Security Review**:
- All authentication/authorization changes reviewed by security team
- Cryptographic code requires expert review
- Input validation mandatory

## Resources

### Documentation
- [Architecture Guide](/docs/architecture/)
- [API Reference](/docs/api-reference/)
- [Development TODO](https://gitlab.com/devnw/codepros/geode/-/blob/main/docs/TODO.md)

### Code
- [Source Repository](https://github.com/codeprosorg/geode)
- [Issue Tracker](https://gitlab.com/devnw/codepros/geode/-/issues)
- [Continuous Integration](https://gitlab.com/devnw/codepros/geode/-/pipelines)

### Community
- [Discussions](https://gitlab.com/devnw/codepros/geode/-/issues)
- [Contributors List](https://gitlab.com/devnw/codepros/geode/-/graphs/main)

## Thank You!

Your contributions make Geode better for everyone. We appreciate your time and effort!

---

**License**: Apache License 2.0
**Copyright**: 2024-2025 CodePros
**Last Updated**: January 2026
