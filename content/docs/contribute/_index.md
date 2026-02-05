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

# Install Zig 0.1.0+
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
- [Related Guide](/docs/guides/)
- [Tutorial](/docs/tutorials/)
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
- Geode version: 0.1.3
- OS: Ubuntu 22.04
- Zig version: 0.1.0
- Client library: Python 0.1.3

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

## Geode Test Lab

The Geode Test Lab provides a comprehensive testing environment for validating contributions before they're merged.

### Test Lab Overview

The test lab runs automatically on all merge requests and includes:

| Test Suite | Duration | Description |
|------------|----------|-------------|
| Unit Tests | ~2 min | Fast, isolated function tests |
| Integration Tests | ~5 min | Component interaction tests |
| GQL Conformance | ~10 min | ISO/IEC 39075:2024 compliance |
| Client Tests | ~3 min | Multi-language client validation |
| Performance | ~15 min | Benchmark regression detection |
| Security Scan | ~5 min | Static analysis and CVE checks |

### Running Tests Locally

Before submitting a PR, run the test lab locally:

```bash
# Navigate to the geode directory
cd geode

# Run unit tests (fast)
make test

# Run comprehensive test suite (97.4% pass rate expected)
make geodetestlab-comprehensive

# Run specific test categories
zig build test -- --test-filter "storage"
zig build test -- --test-filter "query"
zig build test -- --test-filter "transaction"

# Run GQL conformance tests
make gql-conformance

# Run performance benchmarks
make benchmark
```

### Test Lab Requirements

**Minimum Standards**:
- ✅ 100% of existing tests must pass
- ✅ New code must include tests
- ✅ >90% code coverage maintained
- ✅ No performance regressions (>5% degradation fails)
- ✅ All CANARY markers properly formatted

### Test Categories

**1. Unit Tests** (`test "..."` in Zig):
```zig
test "Graph: add node with properties" {
    const allocator = std.testing.allocator;
    var graph = try Graph.init(allocator);
    defer graph.deinit();

    const node = try graph.addNode("Person", .{
        .name = "Alice",
        .age = @as(i64, 30),
    });

    try std.testing.expectEqualStrings("Person", node.label);
    try std.testing.expectEqual(@as(i64, 30), node.getProperty("age").?.int);
}
```

**2. Integration Tests**:
```bash
# Run the integration test harness
cd geode-test-harness
make test-all
```

**3. Client Compatibility Tests**:
```bash
# Test all client libraries against the server
cd geode-test-harness

# Test specific language
make test-go
make test-python
make test-rust
make test-zig

# Generate test reports
make test-all-html
```

### CI Pipeline Stages

When you push a commit, the CI pipeline runs:

```yaml
stages:
  - build
  - test-unit
  - test-integration
  - test-gql-conformance
  - test-clients
  - benchmark
  - security-scan
  - documentation
```

### Viewing Test Results

Access test results:

1. **GitLab CI**: Click on the pipeline status badge
2. **Test Reports**: Artifacts contain detailed HTML reports
3. **Coverage**: View coverage report in artifacts

### Common Test Failures

| Failure | Cause | Resolution |
|---------|-------|------------|
| `test_xxx FAILED` | Test logic error | Fix implementation or test |
| `memory leak detected` | Zig allocator issue | Use proper defer/deinit |
| `benchmark regression` | Performance degradation | Optimize or justify change |
| `CANARY missing` | Missing governance marker | Add CANARY comment |

## Code Signing for Contributors

All commits to Geode must be signed. This ensures authenticity and prevents tampering.

### Why Code Signing?

- **Authenticity**: Proves commits come from you
- **Integrity**: Detects if commits are modified
- **Compliance**: Required for enterprise deployments
- **Trust**: Builds chain of trust in the codebase

### Setting Up GPG Signing

**1. Generate GPG Key**:

```bash
# Generate new key pair
gpg --full-generate-key

# Recommended settings:
# - Key type: RSA and RSA (default)
# - Key size: 4096 bits
# - Expiration: 1-2 years
# - Real name: Your full name
# - Email: Same as your Git email
```

**2. List Your Keys**:

```bash
# List keys
gpg --list-secret-keys --keyid-format=long

# Output:
# sec   rsa4096/ABCD1234EFGH5678 2026-01-15 [SC] [expires: 2028-01-15]
#       1234567890ABCDEF1234567890ABCDEF12345678
# uid           [ultimate] Your Name <your.email@example.com>
```

**3. Configure Git**:

```bash
# Set signing key (use the key ID from step 2)
git config --global user.signingkey ABCD1234EFGH5678

# Enable automatic signing
git config --global commit.gpgsign true

# Set GPG program (if needed)
git config --global gpg.program gpg
```

**4. Export Public Key**:

```bash
# Export public key
gpg --armor --export ABCD1234EFGH5678 > my-public-key.asc

# Or copy to clipboard (macOS)
gpg --armor --export ABCD1234EFGH5678 | pbcopy

# Or copy to clipboard (Linux)
gpg --armor --export ABCD1234EFGH5678 | xclip -selection clipboard
```

**5. Add Key to GitLab**:

1. Go to GitLab > Preferences > GPG Keys
2. Paste your public key
3. Click "Add key"

### Using SSH Signing (Alternative)

If you prefer SSH keys over GPG:

```bash
# Configure SSH signing
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub

# Enable automatic signing
git config --global commit.gpgsign true
```

Add your SSH key to GitLab:
1. Go to GitLab > Preferences > SSH Keys
2. Check "Use this key for signing"

### Signing Commits

```bash
# Sign a commit (if not automatic)
git commit -S -m "feat: Add new feature"

# Verify commit signature
git log --show-signature -1

# Verify specific commit
git verify-commit HEAD
```

### Signing Tags

```bash
# Create signed tag
git tag -s v1.0.0 -m "Release v1.0.0"

# Verify tag signature
git tag -v v1.0.0
```

### Troubleshooting Code Signing

**GPG agent not running**:
```bash
# Start GPG agent
gpgconf --launch gpg-agent

# Or add to shell profile
export GPG_TTY=$(tty)
```

**"Secret key not available"**:
```bash
# Check key is available
gpg --list-secret-keys

# Ensure email matches Git config
git config user.email  # Must match GPG key email
```

**"Cannot sign commits" on macOS**:
```bash
# Install pinentry-mac
brew install pinentry-mac

# Configure GPG
echo "pinentry-program $(which pinentry-mac)" >> ~/.gnupg/gpg-agent.conf

# Restart agent
gpgconf --kill gpg-agent
```

**Verifying Setup**:
```bash
# Create test commit
echo "test" > test.txt
git add test.txt
git commit -m "test: Verify code signing works"

# Check signature
git log --show-signature -1

# Should show:
# gpg: Signature made [date]
# gpg: Good signature from "Your Name <your@email.com>"
```

## Contributor Vetting Process

Geode follows a formal vetting process for contributors to ensure code quality, security, and legal compliance.

### Contributor License Agreement (CLA)

All contributors must sign the Contributor License Agreement before their first contribution is accepted.

**Why a CLA?**
- Clarifies intellectual property rights
- Grants necessary permissions for code distribution
- Protects both contributors and the project
- Enables license compatibility

**Signing the CLA**:

1. **First-time contributors**: When you open your first PR, the CLA bot will prompt you
2. **Sign electronically**: Click the link and complete the form
3. **Verify identity**: Use the same email as your Git commits
4. **One-time process**: Only required once per contributor

**CLA Terms Summary**:
- You retain copyright of your contributions
- You grant perpetual license to use, modify, and distribute
- You confirm contributions are your original work
- You confirm you have the right to submit

### Third-Party Developer Verification

For contributors from organizations or those with access to sensitive systems:

**Verification Levels**:

| Level | Requirements | Access Granted |
|-------|--------------|----------------|
| Standard | CLA + Code signing | General contributions |
| Verified | Standard + Identity verification | Core system access |
| Trusted | Verified + Organization validation | Security-sensitive code |

**Standard Verification**:
1. Sign CLA
2. Set up code signing (GPG/SSH)
3. Maintain signed commit history

**Identity Verification** (for elevated access):
1. Complete standard verification
2. Provide government-issued ID verification
3. Pass background check (for enterprise contributors)
4. Complete security awareness training

**Organization Validation** (for corporate contributors):
1. Organization signs corporate CLA
2. Designated representative validates contributors
3. Organization assumes responsibility for member contributions

### Certificate Signing Request (CSR) Verification

For contributions to cryptographic or security-critical code:

**When CSR Verification is Required**:
- Authentication/authorization code changes
- Cryptographic implementations
- Key management system changes
- Certificate handling code
- TLS/mTLS implementations

**CSR Process**:

```bash
# Generate private key (keep secure!)
openssl genrsa -out contributor-private.key 4096

# Create Certificate Signing Request
openssl req -new \
  -key contributor-private.key \
  -out contributor.csr \
  -subj "/C=US/ST=State/L=City/O=Organization/OU=Development/CN=contributor@email.com"

# Submit CSR to security@codepros.org
# Subject: CSR Submission for [GitLab Username]
```

**CSR Requirements**:
- 4096-bit RSA or ED25519 key
- Matches registered email address
- Valid organization information
- No self-signed certificates

### Vetting Timeline

| Step | Duration | Notes |
|------|----------|-------|
| CLA signing | Immediate | Automated via CLA bot |
| Code signing setup | 1-2 hours | Self-service |
| Identity verification | 1-3 business days | Manual review |
| Organization validation | 5-10 business days | Requires corporate contact |
| CSR verification | 2-5 business days | Security team review |

## Vulnerability Handling for Maintainers

This section documents the process for Geode team members handling security vulnerabilities.

### Responsible Disclosure

**Receiving Vulnerability Reports**:

1. Monitor security@codepros.org inbox
2. Acknowledge receipt within 24 hours
3. Assign CVE ID if applicable
4. Begin triage within 48 hours

**Vulnerability Classification**:

| Severity | CVSS Score | Response Time | Disclosure Timeline |
|----------|------------|---------------|---------------------|
| Critical | 9.0-10.0 | 24 hours | 7 days max |
| High | 7.0-8.9 | 72 hours | 30 days |
| Medium | 4.0-6.9 | 7 days | 60 days |
| Low | 0.1-3.9 | 30 days | 90 days |

### Vulnerability Response Process

**Step 1: Triage**
```markdown
## Vulnerability Triage Checklist
- [ ] Vulnerability verified/reproduced
- [ ] Severity assessed (CVSS score)
- [ ] Affected versions identified
- [ ] Attack vector documented
- [ ] Impact assessment completed
- [ ] CVE ID requested (if applicable)
```

**Step 2: Fix Development**

```bash
# Create private security branch
git checkout -b security/CVE-YYYY-XXXXX

# Develop fix in private
# DO NOT push to public repository

# Test fix thoroughly
make test
make security-scan
```

**Step 3: Patch Preparation**

```bash
# Prepare patches for all affected versions
git format-patch main

# Create backport patches for LTS versions
# v0.1.x, v0.1.x, v0.1.x
```

**Step 4: Coordinated Disclosure**

1. **Notify reporter**: Confirm fix and disclosure timeline
2. **Prepare advisory**: Draft security advisory
3. **Pre-notify**: Inform enterprise customers (if applicable)
4. **Release fix**: Publish patches to all branches
5. **Public disclosure**: Publish advisory and CVE details

### Security Advisory Template

```markdown
# Security Advisory: [CVE-YYYY-XXXXX]

## Summary
Brief description of the vulnerability

## Severity
**CVSS Score**: X.X (Critical/High/Medium/Low)
**Vector**: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H

## Affected Versions
- Geode 0.1.0 - 0.17.x
- Geode 0.1.3 - 0.1.3

## Fixed Versions
- Geode 0.1.2
- Geode 0.1.3

## Description
Detailed description of vulnerability and attack vector

## Mitigation
Temporary workarounds if immediate upgrade not possible

## Credit
Reporter name (if they consent to disclosure)

## Timeline
- YYYY-MM-DD: Vulnerability reported
- YYYY-MM-DD: Acknowledged
- YYYY-MM-DD: Fix developed
- YYYY-MM-DD: Patches released
- YYYY-MM-DD: Public disclosure
```

### Safely Removing Vulnerabilities from History

**When to Remove from History**:
- Committed credentials or secrets
- Accidentally committed private keys
- Sensitive data in commits

**Process**:

```bash
# CAUTION: This rewrites history - coordinate with all team members

# Use BFG Repo-Cleaner (preferred)
java -jar bfg.jar --delete-files "*.pem" geode.git
java -jar bfg.jar --replace-text passwords.txt geode.git

# Or use git filter-repo
git filter-repo --path-glob '*.key' --invert-paths

# Force push (requires coordinated effort)
git push origin --force --all
git push origin --force --tags
```

**Post-Removal Actions**:

1. **Rotate credentials**: All exposed secrets must be rotated
2. **Notify team**: Inform all maintainers to re-clone
3. **Update CI**: Regenerate CI tokens and secrets
4. **Audit access**: Review who might have seen exposed data
5. **Document incident**: Record in internal security log

### Security Scanning

**Regular Security Tasks**:

```bash
# Run daily security scan
make security-scan

# Check dependencies for CVEs
zig fetch --check-vulnerabilities

# Static analysis
make lint-security

# Generate SBOM (Software Bill of Materials)
make sbom
```

**Automated Alerts**:
- GitLab dependency scanning
- SAST (Static Application Security Testing)
- Container scanning
- License compliance

### Security Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| Security Lead | security@codepros.org | Overall security oversight |
| Incident Response | incident@codepros.org | Active incident handling |
| CVE Coordinator | cve@codepros.org | CVE assignments |

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
