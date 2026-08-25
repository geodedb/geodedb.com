---
title: "Continuous Integration"
description: "Learn about continuous integration practices for Geode, including automated testing, code quality checks, and build automation for reliable software delivery."
keywords:
  - continuous integration
  - CI
  - automated testing
  - build automation
  - code quality
  - test automation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/continuous-integration/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Continuous Integration for Geode

Continuous Integration (CI) is the practice of automatically building, testing, and validating code changes as they're committed to version control. For Geode, CI ensures that every change maintains database correctness, preserves GQL standards compliance, prevents performance regressions, and validates polyglot client compatibility.

## Foundations of Continuous Integration

Continuous Integration is built on several core principles:

**Frequent Integration**: Developers integrate code changes multiple times daily, preventing large merge conflicts and integration issues.

**Automated Building**: Every commit triggers an automated build process that compiles the codebase and identifies compilation errors immediately.

**Automated Testing**: Comprehensive test suites run automatically, providing rapid feedback on functionality and preventing regressions.

**Fast Feedback**: Developers receive build and test results within minutes, enabling quick fixes before context switching.

**Maintain a Single Source Repository**: All code, tests, and configuration reside in version control (Git), ensuring reproducibility.

For database systems like Geode, CI is particularly critical because bugs can result in data corruption, lost transactions, or query correctness issues that are difficult to debug in production.

## Geode's CI Implementation

### Repository Structure

Geode's monorepo structure enables comprehensive CI across all components:

```
/home/benji/src/gl/devnw/codepros/geode/
├── geode/                    # Server (Zig)
│   ├── src/
│   ├── test/
│   └── build.zig
├── geode-client-go/          # Go client
├── geode-client-python/      # Python client
├── geode-client-rust/        # Rust client
├── geode-client-zig/         # Zig client
├── geode-test-harness/       # Cross-client tests
└── .github/workflows/        # CI configuration
```

This structure allows CI to:

- Build all components in a single pipeline
- Test server changes against all clients
- Validate cross-client compatibility
- Ensure end-to-end functionality

### Build Process

**Server Build** (Zig):

```bash
# geode/Makefile
build:
	zig build -Doptimize=ReleaseSafe

test:
	zig build test

test-all-integration:
	# Local integration suites (integration, regression, ordering,
	# pagination, aggregation)
	$(MAKE) integration-test regression-test property-ordering-test \
		pagination-test aggregation-test
```

**CI Build Configuration**:

```yaml
# .github/workflows/build.yml
name: Build Geode

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-zig:
    name: Build Server (Zig ${{ matrix.zig }})
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-24.04, macos-14]
        zig: [0.1.0]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Zig
        uses: goto-bus-stop/setup-zig@v2
        with:
          version: ${{ matrix.zig }}

      - name: Build Geode
        working-directory: geode
        run: |
          zig build -Doptimize=ReleaseSafe
          ./zig-out/bin/geode --version

      - name: Verify Binary
        run: |
          file geode/zig-out/bin/geode
          ldd geode/zig-out/bin/geode || true

      - name: Upload Binary
        uses: actions/upload-artifact@v4
        with:
          name: geode-${{ matrix.os }}-${{ matrix.zig }}
          path: geode/zig-out/bin/geode
          retention-days: 7
```

### Automated Testing

Geode's CI runs multiple test suites:

**1. Unit Tests** (Core functionality):

```yaml
unit-tests:
  name: Unit Tests
  runs-on: ubuntu-24.04
  needs: build-zig
  steps:
    - uses: actions/checkout@v4

    - name: Setup Zig
      uses: goto-bus-stop/setup-zig@v2
      with:
        version: 0.1.0

    - name: Run Unit Tests
      working-directory: geode
      run: |
        zig build test

    - name: Parse Test Results
      run: |
        # Extract test counts
        echo "Tests run, passed, failed"
```

**2. GeodeTestLab Comprehensive Suite** (1,688 tests):

```yaml
    - name: Run Integration Suites
      working-directory: geode
      run: |
        make test-all-integration

    - name: Check Pass Rate
      run: |
        # Require 97.4% pass rate (1644/1688)
        python scripts/check-pass-rate.py \
          --results geode/test-results.json \
          --threshold 0.974
```

**3. GQL Compliance Tests** (ISO/IEC 39075:2024):

```yaml
gql-compliance:
  name: GQL Compliance
  needs: build-zig
  steps:
    - name: Download Server Binary
      uses: actions/download-artifact@v4

    - name: Start Geode
      run: |
        chmod +x geode
        ./geode serve --listen 0.0.0.0:3141 &
        sleep 5

    - name: Run Conformance Profile Tests
      run: |
        # Must pass profile scope (see conformance profile)
        python gql/iso-tests/run-suite.py \
          --host localhost:3141 \
          --strict

    - name: Enforce Conformance Profile
      run: |
        if [ $? -ne 0 ]; then
          echo "GQL conformance profile tests failed - blocking merge"
          exit 1
        fi
```

**4. Client Library Tests**:

```yaml
client-tests:
  name: Test ${{ matrix.client }} Client
  needs: build-zig
  strategy:
    matrix:
      client: [go, python, rust, zig]
  steps:
    - name: Download Server
      uses: actions/download-artifact@v4

    - name: Start Server
      run: |
        ./geode serve &
        sleep 5

    - name: Setup ${{ matrix.client }}
      uses: ./.github/actions/setup-${{ matrix.client }}

    - name: Run Tests
      working-directory: geode-client-${{ matrix.client }}
      run: make test

    - name: Upload Results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: test-results-${{ matrix.client }}
        path: geode-client-${{ matrix.client }}/test-results/
```

**5. Cross-Client Integration Tests**:

```yaml
integration-tests:
  name: Integration Tests
  needs: client-tests
  steps:
    - name: Setup Test Harness
      working-directory: geode-test-harness
      run: make setup

    - name: Run All Client Tests
      run: |
        make test-all
        make test-all-html

    - name: Upload HTML Report
      uses: actions/upload-artifact@v4
      with:
        name: integration-report
        path: geode-test-harness/reports/
```

### Code Quality Checks

**Linting and Formatting**:

```yaml
code-quality:
  name: Code Quality
  runs-on: ubuntu-24.04
  steps:
    - uses: actions/checkout@v4

    - name: Check Zig Formatting
      run: |
        find geode/src -name "*.zig" | xargs zig fmt --check

    - name: Lint Go Client
      working-directory: geode-client-go
      run: |
        go fmt ./...
        go vet ./...
        golangci-lint run

    - name: Lint Python Client
      working-directory: geode-client-python
      run: |
        black --check .
        pylint geode_client/
        mypy geode_client/

    - name: Lint Rust Client
      working-directory: geode-client-rust
      run: |
        cargo fmt -- --check
        cargo clippy -- -D warnings
```

**Static Analysis**:

```yaml
    - name: Run Static Analysis
      run: |
        # Compile + format checks
        zig build
        zig fmt --check src/ tests/ build.zig

        # Security scanning
        semgrep --config=auto geode/src/

        # Dependency audit
        cd geode-client-go && go list -m all | nancy sleuth
        cd geode-client-rust && cargo audit
```

**CANARY Marker Validation**:

```yaml
    - name: Validate CANARY Markers
      run: |
        # Ensure all implementations have CANARY markers
        python scripts/validate-canary-markers.py \
          --dir geode/src \
          --require-evidence
```

## Advanced CI Patterns

### Parallel Test Execution

Geode parallelizes tests for faster feedback:

```yaml
test-parallel:
  name: Parallel Tests
  runs-on: ubuntu-24.04
  strategy:
    fail-fast: false
    matrix:
      shard: [1, 2, 3, 4, 5, 6, 7, 8]
  steps:
    - name: Run Test Shard ${{ matrix.shard }}
      run: |
        # Split tests into 8 load-balanced shards (shard index is 0-based)
        zig build test -Dtest-shard-total=8 -Dtest-shard-index=${{ matrix.shard }}
```

`-Dtest-shard-total` and `-Dtest-shard-index` are the only test-partitioning
options `zig build --help` declares; the matrix above must therefore count
`[0, 1, 2, 3, 4, 5, 6, 7]`.

**Benefits**:

- 8-minute test suite runs in 1-2 minutes
- Early failure detection
- Better resource utilization

### Incremental Testing

Only test affected components:

```yaml
    - name: Detect Changed Files
      id: changed
      run: |
        # Get changed files since last commit
        CHANGED=$(git diff --name-only HEAD~1 HEAD)
        echo "files=$CHANGED" >> $GITHUB_OUTPUT

    - name: Run Targeted Tests
      run: |
        if echo "${{ steps.changed.outputs.files }}" | grep -q "geode/src/gql"; then
          # Grammar changed - run the named GQL test steps
          # (there is no test-name filter option; each suite is its own step)
          zig build test-iso-conformance
          zig build test-match-parity
        fi

        if echo "${{ steps.changed.outputs.files }}" | grep -q "geode-client-python"; then
          # Python client changed
          cd geode-client-python && pytest
        fi
```

### Dependency Caching

Cache dependencies to speed up builds:

```yaml
    - name: Cache Zig Dependencies
      uses: actions/cache@v4
      with:
        path: |
          ~/.cache/zig
          geode/zig-cache
          geode/zig-out
        key: ${{ runner.os }}-zig-${{ hashFiles('**/build.zig.zon') }}
        restore-keys: |
          ${{ runner.os }}-zig-

    - name: Cache Go Modules
      uses: actions/cache@v4
      with:
        path: ~/go/pkg/mod
        key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}

    - name: Cache Rust Dependencies
      uses: actions/cache@v4
      with:
        path: |
          ~/.cargo/registry
          ~/.cargo/git
          geode-client-rust/target
        key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
```

### Test Result Reporting

Generate comprehensive test reports:

```yaml
    - name: Generate Test Report
      if: always()
      run: |
        python scripts/generate-test-report.py \
          --input test-results/ \
          --output test-report.html \
          --format html

    - name: Publish Test Results
      uses: EnricoMi/publish-unit-test-result-action@v2
      if: always()
      with:
        files: |
          geode/test-results/**/*.xml
          geode-client-*/test-results/**/*.xml
          geode-test-harness/reports/**/*.xml

    - name: Comment PR with Results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const report = fs.readFileSync('test-report.html', 'utf8');
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: report
          });
```

## CI Best Practices for Geode

### 1. Fail Fast

Prioritize quick checks first:

```yaml
jobs:
  # Run fast checks first
  quick-checks:
    runs-on: ubuntu-24.04
    steps:
      - name: Lint (30 seconds)
      - name: Format Check (20 seconds)
      - name: Compile Check (1 minute)

  # Run expensive tests only if quick checks pass
  comprehensive-tests:
    needs: quick-checks
    steps:
      - name: Full Test Suite (8 minutes)
      - name: Performance Tests (15 minutes)
```

### 2. Keep CI Fast

Target: Feedback within 10 minutes

**Optimization strategies**:

- Cache aggressively (builds, dependencies, test data)
- Parallelize independent tests
- Use incremental testing
- Run expensive tests nightly instead of per-commit

```yaml
on:
  push:
    branches: [main]
  pull_request:
    # Fast tests on PR
    types: [opened, synchronize]
  schedule:
    # Comprehensive tests nightly
    - cron: '0 2 * * *'
```

### 3. Make CI Reproducible

**Pin all versions**:

```yaml
env:
  ZIG_VERSION: 0.1.0
  GO_VERSION: 1.24.0
  PYTHON_VERSION: 3.11.8
  RUST_VERSION: 1.70.0

  # Pin action versions
  CHECKOUT_VERSION: v4
  SETUP_GO_VERSION: v5
```

**Use deterministic builds**:

```bash
# Zig builds are deterministic by default
zig build -Doptimize=ReleaseSafe

# Go builds with reproducibility
go build -trimpath -ldflags="-buildid="
```

### 4. Test in Clean Environments

**Avoid environment pollution**:

```yaml
    - name: Run Tests in Clean Environment
      run: |
        # Each test gets fresh database
        for test in tests/*; do
          # Clean state
          rm -rf /tmp/geode-test-data
          mkdir -p /tmp/geode-test-data

          # Run isolated
          GEODE_DATA_DIR=/tmp/geode-test-data $test
        done
```

### 5. Monitor CI Health

Track CI metrics:

```python
# scripts/ci-metrics.py
from datetime import datetime
from prometheus_client import Counter, Histogram, push_to_gateway

ci_duration = Histogram('ci_duration_seconds', 'CI duration', ['job'])
ci_failures = Counter('ci_failures_total', 'CI failures', ['job'])

def report_ci_metrics(job_name, duration, success):
    ci_duration.labels(job=job_name).observe(duration)
    if not success:
        ci_failures.labels(job=job_name).inc()

    push_to_gateway('monitoring.geodedb.com:9091',
                   job='ci-metrics',
                   registry=registry)
```

## Debugging CI Failures

### Access Build Logs

```bash
# Download logs from GitHub Actions
gh run view <run-id> --log

# Or via API
curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/devnw/geode/actions/runs/<run-id>/logs
```

### Reproduce Locally

Use act to run GitHub Actions locally:

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | bash

# Run specific job
act -j unit-tests

# Run entire workflow
act push
```

### Debug Mode

Enable debug logging:

```yaml
    - name: Enable Debug Logging
      if: runner.debug
      run: |
        # `zig build test` has no log-level option; build in Debug and let the
        # test output carry the detail. The server's own verbosity is a runtime
        # flag: `geode serve --log-level debug`.
        zig build test -Doptimize=Debug
```

Trigger with:

```bash
gh workflow run ci.yml -f debug=true
```

### Common CI Issues

**Issue 1: Flaky Tests**

```python
# Mark flaky tests with retries
@pytest.mark.flaky(reruns=3, reruns_delay=1)
async def test_concurrent_transactions():
    # Test that occasionally fails due to timing
    pass
```

**Issue 2: Resource Exhaustion**

```yaml
    - name: Clean Up Resources
      if: always()
      run: |
        # Stop all Geode processes
        pkill -9 geode || true

        # Clean temp data
        rm -rf /tmp/geode-*

        # Free memory
        sync; echo 3 > /proc/sys/vm/drop_caches || true
```

**Issue 3: Timeout Issues**

```yaml
jobs:
  test:
    timeout-minutes: 30  # Prevent hanging builds
    steps:
      - name: Run Tests
        timeout-minutes: 20  # Per-step timeout
        run: make test
```

## CI Security Considerations

### Secret Management

```yaml
    - name: Configure Secrets
      env:
        GEODE_LICENSE_KEY: ${{ secrets.GEODE_LICENSE_KEY }}
        AWS_SECRET_KEY: ${{ secrets.AWS_SECRET_KEY }}
      run: |
        # Never echo secrets
        # Never log secrets
        # Use secrets only where needed
```

### Dependency Scanning

```yaml
    - name: Scan Dependencies
      run: |
        # Scan for vulnerabilities
        cd geode-client-go && govulncheck ./...
        cd geode-client-rust && cargo audit
        cd geode-client-python && safety check
```

### Code Scanning

```yaml
    - name: CodeQL Analysis
      uses: github/codeql-action/analyze@v3
      with:
        languages: go, python, cpp
        queries: security-and-quality
```

## Related Topics

- **[CI/CD](/tags/ci-cd/)**: Complete CI/CD pipeline
- **[Unit Tests](/tags/unit-tests/)**: Unit testing strategies
- **[Integration Tests](/tags/integration-tests/)**: Integration testing
- **[Deployment](/tags/deployment/)**: Deployment automation
- **[Containers](/tags/containers/)**: Container-based CI
- **[Cloud](/tags/cloud/)**: Cloud-based CI/CD platforms

## Further Reading

- **CI Best Practices**: `/docs/development/ci-best-practices/`
- **Test Automation Guide**: `/docs/development/test-automation/`
- **GitHub Actions Reference**: `/docs/operations/github-actions/`
- **Build Optimization**: `/docs/development/build-optimization/`
- **Quality Assurance**: `/docs/development/quality-assurance/`
