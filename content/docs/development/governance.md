---
title: "Governance and Requirements Tracking"
description: "CANARY governance system for evidence-based development with 1,735+ markers tracking 2,190+ requirements across automated verification and compliance."
summary: "Master Geode's CANARY governance system with requirements tracking, automated verification, evidence integrity, and compliance validation for robust software development."
slug: "governance"
url: "/docs/development/governance/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 450
keywords: ["CANARY markers", "requirements tracking", "governance", "evidence-based development", "compliance", "automated verification"]
tags: ["development", "governance", "testing", "compliance"]
categories: ["Development"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/development/governance/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCUMENTATION-STRUCTURE-001; FEATURE="DocStructure"; ASPECT=StructureTests; STATUS=TESTED; OWNER=claude; UPDATED=2026-01-16 -->

## Overview

Geode's CANARY governance system provides comprehensive requirements tracking with 1,735 markers tracking 2,190+ requirements. This evidence-based development methodology ensures traceability, automated verification, and compliance throughout the software lifecycle.

### Key Features

- **1,735 CANARY Markers**: Comprehensive requirements tracking across codebase
- **Automated Verification**: Continuous validation of evidence integrity
- **Evidence Ledger**: Machine-extracted status with freshness tracking
- **Governance Pipeline**: Multi-step automated checks with JSON output
- **Variance Guards**: Performance envelope monitoring with floor assertions
- **Gap Analysis**: Structured documentation synchronization

## CANARY System Fundamentals

### What is a CANARY Marker?

**CANARY markers** are structured comments in source code that link implementation to requirements, tests, and benchmarks. They provide bidirectional traceability between requirements and evidence.

**Format**:
```zig
// CANARY: REQ=REQ-XXX; FEATURE="FeatureName"; ASPECT=AspectName; STATUS=TESTED; TEST=TestName; OWNER=team; UPDATED=2026-01-24
```

**Components**:
- **REQ**: Requirement identifier (e.g., REQ-GQL-010)
- **FEATURE**: Feature name for grouping
- **ASPECT**: Specific aspect being implemented
- **STATUS**: Implementation status (STUB, IMPL, TESTED, BENCHED, EXEMPT, COMPLETE)
- **TEST**: Test name(s) for verification
- **BENCH**: Benchmark name(s) for performance validation
- **OWNER**: Responsible team/component
- **UPDATED**: Last modification date (YYYY-MM-DD)

### Status Progression

```plaintext
STUB → IMPL → TESTED → BENCHED → COMPLETE

STUB: Placeholder, not yet implemented
IMPL: Implemented but not tested
TESTED: Implementation + tests passing
BENCHED: Tested + performance validated
COMPLETE: Fully validated, production-ready
EXEMPT: Special cases (external dependencies, etc.)
```

### Current Statistics

**As of January 2026**:
- **Total Markers**: 1,735
- **Total Requirements**: 2,190+
- **TESTED Status**: 81.4%
- **BENCHED Status**: 6.0%
- **EXEMPT Status**: 7.7%
- **IMPL Status**: 5.7%
- **Test Pass Rate**: 97.4% (1644/1688 tests)

## Evidence Ledger

### Automated Generation

**Scanner Tool**: `./bin/canaryscan`

```bash
# Generate evidence ledger
go build -o ./bin/canaryscan ./tools/canaryscan
./bin/canaryscan --root . --out status.json --csv status.csv
```

**Output Files**:
- `status.json`: Complete evidence with metadata
- `status.csv`: Tabular format for reporting
- `GAP_ANALYSIS.md`: Human-readable gap summary

### Evidence Structure

**JSON Format**:
```json
{
  "generated_at": "2026-01-24T10:30:00Z",
  "total_requirements": 2190,
  "total_tested": 1783,
  "total_benched": 131,
  "total_exempt": 169,
  "requirements": [
    {
      "req_id": "REQ-GQL-010",
      "feature": "QueryExecution",
      "aspect": "BasicMatch",
      "status": "TESTED",
      "test": "TestBasicMatch",
      "owner": "engine",
      "updated": "2026-01-15",
      "file": "src/execution.zig",
      "line": 42
    }
  ]
}
```

**CSV Format**:
```csv
req_id,feature,aspect,status,test,bench,owner,updated,file,line
REQ-GQL-010,QueryExecution,BasicMatch,TESTED,TestBasicMatch,,engine,2026-01-15,src/execution.zig,42
```

## Governance Pipeline

### Automated Verification

**Pipeline Script**: `scripts/governance_ci.zig`

```bash
# Run complete governance check
zig run scripts/governance_ci.zig
```

**Steps Executed**:
1. **Freshness**: Verify NEXT.md generation date is current
2. **CANARY Scan**: Extract and validate evidence ledger
3. **Variance Envelope Guard**: Check performance floor assertions
4. **Doc Consistency**: Validate README/IMPLEMENTATION_REALITY counts
5. **Gap Consistency**: Verify GAP_ANALYSIS alignment
6. **Slice Validation**: Check NEXT.md slice structure
7. **Slice-Req Crosscheck**: Ensure all slices map to requirements
8. **Evidence Delta**: Detect removed requirement IDs
9. **Reality Freshness**: Verify IMPLEMENTATION_REALITY date
10. **Badge Generation**: Create evidence coverage SVG
11. **Trend Append**: Log metrics to history
12. **Badge Staleness**: Ensure badge freshness

### Verification Output

**Success**:
```json
{
  "type": "governance_summary",
  "status": "success",
  "steps": [
    {"name": "freshness", "ok": true},
    {"name": "canary", "ok": true},
    {"name": "variance_envelope_guard", "ok": true}
  ]
}
```

**Failure**:
```json
{
  "type": "governance_summary",
  "status": "failure",
  "failed_step": "doc_consistency",
  "error": "Count mismatch: README=1735, status.json=1730"
}
```

## Variance Envelope Guards

### Purpose

**Variance envelopes** define acceptable performance variability for benchmarks. Guards prevent silent performance regressions.

### Guard Script

**Command**:
```bash
zig run scripts/variance_envelope_guard.zig -- \
  --status status.csv \
  --readme README.md \
  --min 70 \
  --require-phrase
```

**Validation**:
- Counts variance envelopes in `status.csv`
- Checks README contains "Variance Guards Landed: N+" phrase
- Ensures actual count >= floor (N)
- Exits with code 2 on policy violation

**Example README Phrase**:
```markdown
Variance Guards Landed: 73+
```

### Envelope Definition

**Location**: `docs/VARIANCE_ENVELOPES.md`

**Example**:
```markdown
## QueryExecution Performance

Benchmark: BenchmarkBasicMatch
- **Metric**: Execution time
- **Baseline**: 1.5ms
- **CV Threshold**: ≤0.22 (22%)
- **p95/mean**: ≤2.55
- **Floor**: 0.8ms (cannot be faster, indicates mocking)
- **Ceiling**: 5.0ms (regression threshold)
```

## Requirement Tracking

### Requirement ID Format

**Pattern**: `REQ-{DOMAIN}-{NUMBER}`

**Examples**:
- `REQ-GQL-010`: GQL query execution requirement
- `REQ-AUTH-002`: Authentication requirement
- `REQ-PERF-025`: Performance requirement

### Lifecycle Management

**Creation**:
```zig
// New feature: Add CANARY marker
// CANARY: REQ=REQ-XXX; FEATURE="NewFeature"; ASPECT=CoreLogic; STATUS=IMPL; OWNER=team; UPDATED=2026-01-24
pub fn newFeature() void {
    // Implementation...
}
```

**Testing**:
```zig
// CANARY: REQ=REQ-XXX; FEATURE="NewFeature"; ASPECT=CoreLogic; STATUS=TESTED; TEST=TestNewFeature; OWNER=team; UPDATED=2026-01-24
test "TestNewFeature" {
    // Test implementation...
}
```

**Benchmarking**:
```zig
// CANARY: REQ=REQ-XXX; FEATURE="NewFeature"; ASPECT=Performance; STATUS=BENCHED; BENCH=BenchmarkNewFeature; OWNER=team; UPDATED=2026-01-24
benchmark "BenchmarkNewFeature" {
    // Benchmark implementation...
}
```

## Gap Analysis

### Structure

**File**: `docs/GAP_ANALYSIS.md`

**Sections**:
1. **Summary Table**: Requirement overview by domain
2. **Detail Tables**: Per-domain requirement breakdowns
3. **Gap Identification**: Missing or incomplete requirements
4. **Status Distribution**: TESTED/BENCHED/IMPL/STUB counts

**Example Table**:
```markdown
| Domain | Total | TESTED | BENCHED | IMPL | STUB | EXEMPT |
|--------|-------|--------|---------|------|------|--------|
| GQL    | 850   | 720    | 45      | 60   | 10   | 15     |
| Auth   | 120   | 110    | 5       | 3    | 0    | 2      |
```

### Strict Verification

**Command**:
```bash
./bin/canaryscan --root . \
  --verify docs/GAP_ANALYSIS.md \
  --strict
```

**Validation**:
- All counts in GAP_ANALYSIS match scanner output
- No requirements added/removed without documentation
- Freshness: UPDATED dates <60 days old
- No orphaned requirements (no CANARY markers)

## Badge Generation

### Evidence Coverage Badge

**Generate**:
```bash
zig run scripts/generate_badges.zig -- \
  --status status.csv \
  --out badges/evidence.svg
```

**Badge Display** (in your project README):

```text
![Evidence Coverage]\(badges/evidence.svg)
```

*Note: The badge path is relative to your project root, not this documentation site. Remove the backslash before the opening parenthesis when using.*

**Color Thresholds**:
| Coverage | Color | Hex |
|----------|-------|-----|
| ≥99.9% | Bright Green | #4c1 |
| ≥95% | Green | #97CA00 |
| ≥85% | Yellow | #dfb317 |
| ≥70% | Orange | #fe7d37 |
| <70% | Red | #e05d44 |

**Coverage Formula**:
```
coverage = (TESTED + BENCHED) / TOTAL
```

### Trend History

**Append Metrics**:
```bash
zig run scripts/governance_trend_append.zig
```

**History File**: `badges/history.jsonl`

**Format**:
```jsonl
{"timestamp":"2026-01-24T10:30:00Z","total":2190,"tested":1783,"benched":131,"coverage":0.874}
```

## Best Practices

### Writing CANARY Markers

1. **One CANARY per Aspect**:
   ```zig
   // ✅ Good: One aspect per marker
   // CANARY: REQ=REQ-XXX; FEATURE="ExampleFeature"; ASPECT=CoreLogic; STATUS=IMPL; OWNER=team; UPDATED=2026-01-24
   
   // ❌ Bad: Multiple aspects in one marker
   // CANARY: REQ=REQ-XXX; FEATURE="ExampleFeature"; ASPECT=CoreLogic,Validation; STATUS=IMPL; OWNER=team; UPDATED=2026-01-24
   ```

2. **Keep UPDATED Current**:
   ```zig
   // Update date when changing implementation
   // CANARY: REQ=REQ-XXX; FEATURE="ExampleFeature"; ASPECT=CoreLogic; STATUS=IMPL; OWNER=team; UPDATED=2026-01-24
   ```

3. **Link Tests Explicitly**:
   ```zig
   // CANARY: REQ=REQ-XXX; FEATURE="ExampleFeature"; ASPECT=UnitTesting; STATUS=TESTED; TEST=TestExactName; OWNER=team; UPDATED=2026-01-24
   ```

4. **Progress Status Appropriately**:
   ```
   STUB → IMPL (implementation added)
   IMPL → TESTED (tests passing)
   TESTED → BENCHED (performance validated)
   ```

### Governance Workflow

**Daily Development**:
```bash
# 1. Implement feature with CANARY marker
# 2. Run local tests
make test

# 3. Update CANARY status
# STATUS=IMPL → STATUS=TESTED

# 4. Verify governance
zig run scripts/governance_ci.zig
```

**PR Submission**:
```bash
# 1. Run full governance check
make governance-check

# 2. Verify no regressions
./bin/canaryscan --verify docs/GAP_ANALYSIS.md --strict

# 3. Update documentation if needed
# 4. Commit with evidence
git commit -m "feat: Add X (REQ-Y-001 TESTED)"
```

## Troubleshooting

### Common Issues

**Issue**: Governance check fails with "Count mismatch"

**Solution**:
```bash
# Regenerate evidence ledger
./bin/canaryscan --root . --out status.json --csv status.csv

# Update README/IMPLEMENTATION_REALITY with current counts
# Example: Total=1735, TESTED=1420, BENCHED=102
```

---

**Issue**: "UPDATED date stale" error

**Solution**:
```zig
// Update CANARY marker with current date
// CANARY: REQ=REQ-XXX; FEATURE="ExampleFeature"; ASPECT=CoreLogic; STATUS=IMPL; OWNER=team; UPDATED=2026-01-24
```

---

**Issue**: Variance envelope guard fails

**Solution**:
```bash
# Check actual variance envelope count
grep -r "VarianceEnvelope" src/ | grep CANARY | wc -l

# Update README phrase to match
# Variance Guards Landed: 73+
```

---

**Issue**: Test name mismatch

**Solution**:
```zig
// Ensure TEST field matches actual test name
// CANARY: REQ=REQ-XXX; FEATURE="ExampleFeature"; ASPECT=UnitTesting; STATUS=TESTED; TEST=TestExactFunctionName; OWNER=team; UPDATED=2026-01-24

test "TestExactFunctionName" {
    // Must match exactly (case-sensitive)
}
```

## References

### Documentation

- **Governance Guide**: `docs/GOVERNANCE.md`
- **GAP Analysis**: `docs/GAP_ANALYSIS.md`
- **Variance Envelopes**: `docs/VARIANCE_ENVELOPES.md`
- **Implementation Reality**: `docs/IMPLEMENTATION_REALITY.md`

### Tools

- **CANARY Scanner**: `tools/canaryscan/` (Go)
- **Governance CI**: `scripts/governance_ci.zig`
- **Variance Guard**: `scripts/variance_envelope_guard.zig`
- **Badge Generator**: `scripts/generate_badges.zig`

### Make Targets

```bash
make governance-check           # Complete governance pipeline
make governance-badge           # Generate evidence badge
make governance-variance-guard  # Variance envelope check
make status-generate            # Run CANARY scanner
```

## Next Steps

**For New Contributors**:
- [Contributing Guide](/docs/contribute/) - Code standards and CANARY usage
- [Testing Strategies](/docs/guides/testing-strategies/) - Test framework overview
- [Development Workflow](/docs/development/repl-advanced/) - Daily development practices

**For Maintainers**:
- [Release Process](/docs/reference/changelog/) - Version management
- [CI/CD Setup](/docs/ops/docker-deployment/) - Automated governance checks
- [Documentation](/docs/guides/troubleshooting/) - Gap analysis maintenance

---

**Document Version**: 1.0
**Last Updated**: January 24, 2026
**Status**: Production Ready
**Markers**: 1,735 active CANARY markers
**Requirements**: 2,190+ tracked requirements
**Coverage**: 81.4% TESTED, 6.0% BENCHED
