---
title: "Audit Logging and Compliance"
description: "Comprehensive audit logging system in Geode with tamper-evident hash chains, RFC 5424 syslog integration, and enterprise compliance for SOX, PCI-DSS, and HIPAA requirements."
summary: "Learn how Geode's audit logging system provides tamper-evident trails with Ed25519 signatures, structured JSON logging, RFC 5424 syslog integration, and compliance-ready audit capabilities."
slug: "audit-logging"
url: "/docs/ops/audit-logging/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 350
keywords: ["audit logging", "compliance", "tamper-evident", "syslog", "RFC 5424", "SOX compliance", "PCI-DSS", "HIPAA", "security audit", "hash chain"]
tags: ["operations", "security", "compliance", "monitoring"]
categories: ["Operations", "Security"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/ops/audit-logging/"
    noindex: false
---

<!-- CANARY: REQ=REQ-SERVER-STARTUP-INTEGRATION-001; FEATURE="Server Startup Integration Tests"; ASPECT=EndToEndServerTesting; STATUS=TESTED; OWNER=server; UPDATED=2025-10-05 -->

## Overview

Geode provides a comprehensive, security-first audit logging and tracing subsystem designed for enterprise compliance and operational security. The system instruments authentication actions and database operations, emitting structured logs with tamper-evident guarantees through cryptographic hash chains and digital signatures.

### Key Features

**Security-First Design**:
- Default-deny filtration with built-in sensitive data redaction
- Tamper-evident logging with hash chains and Ed25519 signatures
- Fail-closed security: drops events if redaction cannot guarantee safety
- No SQL exposure: database adapter never logs query text or parameters

**Enterprise Integration**:
- RFC 5424 Syslog with UDP/TCP transport
- CEF:0 (Common Event Format) payloads for SIEM compatibility
- Structured JSON-Lines format with deterministic field ordering
- File rotation with configurable retention and backup policies

**Operational Excellence**:
- Non-blocking operations with bounded queues
- W3C distributed tracing support (trace_id and span_id propagation)
- Automatic field detection and PII/PCI redaction
- <500μs append latency (excluding fsync)

## Architecture

### Components

```
AuditLogger
├── EventBuffer       - Bounded queue for non-blocking writes
├── FileRotator       - Size/time-based rotation with backups
├── HashChain         - SHA-256/BLAKE3 chain with prev_hash linking
├── SignatureManager  - Ed25519 signing for Merkle digest records
├── RedactionEngine   - Multi-layer sensitive data protection
└── SyslogTransport   - RFC 5424 UDP/TCP syslog integration
```

### Data Flow

```plaintext
1. Application Event → AuditLogger.audit()
2. Redaction Engine → Strip PII/PCI, apply default-deny filters
3. Event Buffer → Non-blocking enqueue (drop on overflow)
4. Hash Chain → Compute event_hash, link with prev_hash
5. File Append → Write canonical JSON line (0600 permissions)
6. Signature Manager → Every 100 events, compute Merkle digest + sign
7. Syslog Transport → Send to remote syslog server (parallel)
8. File Rotation → Rotate on size threshold, preserve chain continuity
```

## Hash Chain & Verification

### Tamper-Evident Design

Geode's audit stream is a canonical JSON Lines (JSONL) append-only log where each record carries:
- **seq_no**: Monotonically increasing sequence number
- **event_hash**: SHA-256 hash of current event (excluding prev_hash)
- **prev_hash**: Hash of previous event's event_hash
- **signature**: Ed25519 signature on Merkle digest (every 100 events)

This creates a cryptographic chain: modifying any past event breaks the chain and invalidates all subsequent signatures.

### Record Structure

**Canonical Key Order**:
```json
[
  "stream", "seq_no", "timestamp", "event_type",
  "actor", "origin", "resource", "action", "result",
  "details", "prev_hash", "event_hash", "signature"
]
```

**Example Event**:
```json
{
  "stream": "geode-audit",
  "seq_no": 42,
  "timestamp": "2026-01-24T10:30:15.123Z",
  "event_type": "auth.login",
  "actor": "alice@example.com",
  "origin": "192.168.1.100",
  "resource": "database:geode",
  "action": "authenticate",
  "result": "success",
  "details": {"role": "admin", "session_id": "ses-abc123"},
  "prev_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "event_hash": "a3c7f1d2e5b4a8c9f0d1e2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
  "signature": null
}
```

**Digest Record** (every 100 events):
```json
{
  "stream": "geode-audit",
  "seq_no": 100,
  "timestamp": "2026-01-24T10:35:00.000Z",
  "event_type": "system.digest",
  "merkle_root": "b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5",
  "signature": "d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9..."
}
```

### Hash Algorithm

**Default**: SHA-256 (widely supported, FIPS 140-2 compliant)

**Alternative**: BLAKE3 (faster, modern cryptographic standard)

**Chain Logic**:
1. First event: `prev_hash = 0x00000000...` (32 zero bytes)
2. Subsequent events: `prev_hash = hash(previous_event.event_hash)`
3. Digest events: Compute Merkle root over last N event_hashes
4. Sign Merkle root with Ed25519 private key

### Signing Configuration

**Production Requirements**:
```bash
# Generate Ed25519 key pair
openssl genpkey -algorithm ED25519 -out audit_private.pem
openssl pkey -in audit_private.pem -pubout -out audit_public.pem

# Convert to hex format for environment variables
GEODE_AUDIT_PUB=$(openssl pkey -in audit_public.pem -pubin -text | grep -A4 pub | tail -n +2 | tr -d ':' | tr -d '\n')
GEODE_AUDIT_SEC=$(openssl pkey -in audit_private.pem -text | grep -A4 priv | tail -n +2 | tr -d ':' | tr -d '\n')

export GEODE_AUDIT_PUB
export GEODE_AUDIT_SEC
```

**Startup Validation**:
- If keys missing in non-test builds: Exit with `CONFIG_ERROR SIGNING_KEYS_MISSING` (exit code 78)
- Test builds: Derive deterministic key from fixed seed (for reproducible tests)

**Key Rotation**:
```json
{
  "event_type": "system.key_rotation",
  "details": {
    "old_key_fingerprint": "sha256:abc123...",
    "new_key_fingerprint": "sha256:def456...",
    "rotation_timestamp": "2026-01-24T12:00:00.000Z"
  }
}
```

## Configuration

### JSON Configuration Schema

**Location**: `config/logging.json`

```json
{
  "version": 1,
  "service": {
    "name": "geode-server",
    "host": "prod-db-01",
    "pid": 1234
  },
  "identity": {
    "cef": {
      "vendor": "DEVNW",
      "product": "GEODE",
      "version": "0.18.0"
    }
  },
  "sinks": {
    "file": {
      "enabled": true,
      "path": "/var/log/geode/audit.jsonl",
      "max_bytes": 104857600,
      "backup_count": 10
    },
    "syslog": {
      "enabled": true,
      "protocol": "udp",
      "host": "syslog.example.com",
      "port": 514,
      "rfc5424": {
        "facility": "local4"
      }
    }
  },
  "filters": {
    "default_deny": true,
    "allow_fields": [
      "actor_id", "subject_id", "request_id", "session_id",
      "source_ip", "trace_id", "span_id",
      "category", "action", "outcome", "severity",
      "db.operation", "db.table", "db.rowCount", "duration_ms"
    ],
    "deny_key_patterns": ["password", "secret", "token", "key"],
    "pii_mode": "mask",
    "pci_mode": true
  },
  "hash_chain": {
    "algorithm": "sha256",
    "digest_interval": 100
  },
  "signing": {
    "enabled": true,
    "algorithm": "ed25519"
  }
}
```

### Configuration Options

**Service Identity**:
- `name`: Service name for audit trail correlation
- `host`: Hostname for distributed deployment identification
- `pid`: Process ID (auto-populated at runtime)

**File Sink**:
- `path`: Audit log file path (created with 0600 permissions)
- `max_bytes`: Rotation threshold (default: 100 MB)
- `backup_count`: Number of rotated files to keep (default: 10)

**Syslog Sink**:
- `protocol`: "udp" or "tcp"
- `host`: Syslog server hostname
- `port`: Syslog server port (514 for UDP, 6514 for TLS)
- `facility`: RFC 5424 facility (default: "local4")

**Filters**:
- `default_deny`: If true, only `allow_fields` are logged
- `allow_fields`: Explicit allowlist of field names
- `deny_key_patterns`: Regex patterns for sensitive keys
- `pii_mode`: "mask", "redact", or "allow"
- `pci_mode`: Enable PCI-DSS compliant credit card redaction

**Hash Chain**:
- `algorithm`: "sha256" or "blake3"
- `digest_interval`: Events between Merkle digest records

**Signing**:
- `enabled`: Generate Ed25519 signatures (default: true)
- `algorithm`: "ed25519" (currently only supported algorithm)

## Event Types

### Authentication Events

**Successful Login**:
```json
{
  "event_type": "auth.login",
  "actor": "alice@example.com",
  "action": "authenticate",
  "result": "success",
  "details": {
    "role": "admin",
    "session_id": "ses-abc123",
    "auth_method": "password"
  }
}
```

**Failed Login**:
```json
{
  "event_type": "auth.login",
  "actor": "unknown@example.com",
  "action": "authenticate",
  "result": "failure",
  "details": {
    "reason": "invalid_credentials",
    "attempts": 3
  }
}
```

**Logout**:
```json
{
  "event_type": "auth.logout",
  "actor": "alice@example.com",
  "action": "terminate_session",
  "result": "success",
  "details": {
    "session_id": "ses-abc123",
    "session_duration_ms": 3600000
  }
}
```

### Database Operations

**Query Execution**:
```json
{
  "event_type": "db.query",
  "actor": "alice@example.com",
  "resource": "graph:main",
  "action": "execute",
  "result": "success",
  "details": {
    "db.operation": "MATCH",
    "db.rowCount": 42,
    "duration_ms": 15,
    "trace_id": "trace-xyz789"
  }
}
```

**Schema Modification**:
```json
{
  "event_type": "db.schema_change",
  "actor": "admin@example.com",
  "resource": "index:user_email",
  "action": "create",
  "result": "success",
  "details": {
    "index_type": "btree",
    "columns": ["email"]
  }
}
```

**Access Denied**:
```json
{
  "event_type": "db.access_denied",
  "actor": "readonly@example.com",
  "resource": "node:Person",
  "action": "create",
  "result": "failure",
  "details": {
    "reason": "insufficient_permissions",
    "required_role": "ReadWrite",
    "actual_role": "ReadOnly"
  }
}
```

### System Events

**Server Startup**:
```json
{
  "event_type": "system.startup",
  "actor": "system",
  "action": "initialize",
  "result": "success",
  "details": {
    "version": "0.18.0",
    "config_file": "/etc/geode/config.yaml"
  }
}
```

**File Rotation**:
```json
{
  "event_type": "system.rotation",
  "actor": "system",
  "action": "rotate_audit_log",
  "result": "success",
  "details": {
    "old_file": "/var/log/geode/audit.jsonl",
    "new_file": "/var/log/geode/audit.jsonl.1",
    "size_bytes": 104857600
  }
}
```

## Sensitive Data Redaction

### Multi-Layer Protection

Geode employs five layers of protection against sensitive data leakage:

1. **Key Pattern Detection**
   - Automatic detection of sensitive key names
   - Patterns: `password`, `secret`, `token`, `key`, `credential`, `ssn`, `card`

2. **Value Analysis**
   - Credit card number detection (Luhn algorithm)
   - Social Security Number patterns
   - Email address masking
   - IP address anonymization

3. **Default-Deny Filtering**
   - Only `allow_fields` are logged
   - Unknown fields automatically dropped
   - Explicit opt-in required for new fields

4. **Fail-Closed Behavior**
   - If redaction cannot guarantee safety, drop entire event
   - Log warning: `AUDIT_REDACTION_FAILED`
   - Never log potentially sensitive data

5. **Database Adapter Restriction**
   - SQL text and parameters **never** accepted
   - Only metadata logged: operation type, row count, duration
   - Prevents accidental query parameter exposure

### Redaction Examples

**Original Event**:
```json
{
  "user": "alice@example.com",
  "password": "SecurePassword123!",
  "credit_card": "4111-1111-1111-1111",
  "ssn": "123-45-6789"
}
```

**Redacted Event**:
```json
{
  "user": "alice@example.com",
  "password": "***REDACTED***",
  "credit_card": "***REDACTED***",
  "ssn": "***REDACTED***"
}
```

**PII Mode: Mask**:
```json
{
  "email": "a***@e*****.com",
  "ip_address": "192.168.xxx.xxx"
}
```

**PII Mode: Redact**:
```json
{
  "email": "***REDACTED***",
  "ip_address": "***REDACTED***"
}
```

## File Management

### Rotation Strategy

**Size-Based Rotation**:
```plaintext
/var/log/geode/audit.jsonl       (current, <100 MB)
/var/log/geode/audit.jsonl.1     (100 MB, yesterday)
/var/log/geode/audit.jsonl.2     (100 MB, 2 days ago)
...
/var/log/geode/audit.jsonl.10    (100 MB, 10 days ago)
```

**Rotation Process**:
1. Current file reaches `max_bytes` threshold
2. Close current file
3. Rename: `audit.jsonl` → `audit.jsonl.1`
4. Rotate existing: `.1` → `.2`, `.2` → `.3`, etc.
5. Delete oldest: `audit.jsonl.{backup_count}` removed
6. Create new: `audit.jsonl` with 0600 permissions
7. Continue `seq_no` and `prev_hash` chain from previous file
8. Emit `system.rotation` event

**Chain Continuity**:
- First record in new file uses `prev_hash` from tail of previous file
- Maintains tamper-evident chain across file boundaries
- Verification tool must process files in chronological order

### Permissions & Security

**File Permissions**:
```bash
# Audit log files
-rw------- 1 geode geode 104857600 Jan 24 10:30 audit.jsonl

# Directory permissions
drwx------ 2 geode geode 4096 Jan 24 10:30 /var/log/geode/
```

**SELinux Context** (if enabled):
```bash
chcon -t geode_log_t /var/log/geode/audit.jsonl
```

**AppArmor Profile**:
```plaintext
/var/log/geode/audit.jsonl rw,
/var/log/geode/audit.jsonl.* r,
```

## Verification

### Audit Log Verification

Verify tamper-evident chain and signatures:

```bash
# Verify single file
geode audit verify \
  --file /var/log/geode/audit.jsonl \
  --algo sha256 \
  --pubkey $GEODE_AUDIT_PUB

# Verify rotated files (chronological order)
for file in $(ls -tr /var/log/geode/audit.jsonl*); do
  geode audit verify \
    --file $file \
    --algo sha256 \
    --pubkey $GEODE_AUDIT_PUB
done
```

**Verification Outputs**:

✅ **Valid Chain**:
```
OK chain records=1000 digests=10 algo=sha256
```

❌ **Tampered Chain**:
```
TAMPER chain at_seq=523 reason=PREV_HASH_MISMATCH
  expected=a3c7f1d2e5b4a8c9f0d1e2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3
  got=b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5
```

❌ **Invalid Signature**:
```
TAMPER digest at_seq=600 reason=DIGEST_MISMATCH
  expected=d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9
  got=e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
```

⚠️ **Schema Error**:
```
SCHEMA_ERROR at_seq=789 field=timestamp detail="missing required field"
WARN ignored trailing partial record
```

### Forensic Analysis

**Extract events by actor**:
```bash
jq 'select(.actor == "alice@example.com")' /var/log/geode/audit.jsonl
```

**Count events by type**:
```bash
jq -r '.event_type' /var/log/geode/audit.jsonl | sort | uniq -c | sort -rn
```

**Find failed authentications**:
```bash
jq 'select(.event_type == "auth.login" and .result == "failure")' \
  /var/log/geode/audit.jsonl
```

**Verify chain segment**:
```bash
# Extract seq 100-200 and verify hash chain
jq 'select(.seq_no >= 100 and .seq_no <= 200)' audit.jsonl > segment.jsonl
geode audit verify --file segment.jsonl --algo sha256
```

## Integration

### Syslog Integration (RFC 5424)

**CEF Format** (Common Event Format):
```
<134>1 2026-01-24T10:30:15.123Z prod-db-01 geode 1234 auth.login -
CEF:0|DEVNW|GEODE|0.18.0|auth.login|User Login|5|
act=authenticate duser=alice@example.com outcome=success
rt=Jan 24 2026 10:30:15 src=192.168.1.100
```

**Field Mapping**:
- `<134>`: Priority (local4.info)
- `1`: RFC 5424 version
- `prod-db-01`: Hostname
- `geode`: Application name
- `1234`: Process ID
- `auth.login`: Message ID
- CEF fields: actor, action, outcome, timestamp, source IP

**Testing Syslog**:
```bash
# Test UDP syslog
nc -u -l 514

# In another terminal
echo "RETURN 1" | geode query --user alice --password test -

# Check nc output for CEF messages
```

### SIEM Integration

**Splunk**:
```splunk
sourcetype = geode:audit
| stats count by event_type, result
| where result="failure"
```

**Elasticsearch**:
```json
GET /geode-audit-*/_search
{
  "query": {
    "bool": {
      "must": [
        {"term": {"event_type": "auth.login"}},
        {"term": {"result": "failure"}}
      ]
    }
  }
}
```

**Grafana Loki**:
```logql
{job="geode-audit"} |= "auth.login" |= "failure" | json
```

## Compliance

### SOX (Sarbanes-Oxley)

**Requirements**:
- ✅ Tamper-evident audit trail (hash chain + signatures)
- ✅ Immutable log storage (append-only, 0600 permissions)
- ✅ Access tracking (all database operations logged)
- ✅ Retention policy (configurable backup_count)
- ✅ Periodic review (verification tools provided)

**Configuration**:
```json
{
  "sinks": {
    "file": {
      "backup_count": 90,
      "max_bytes": 104857600
    }
  }
}
```

### PCI-DSS (Payment Card Industry)

**Requirements**:
- ✅ Log all access to cardholder data (db.query events)
- ✅ Secure log storage (encryption at rest with TDE)
- ✅ Daily log review (automated verification)
- ✅ Retain logs for 1 year (90+ rotated files)
- ✅ Credit card redaction (Luhn algorithm detection)

**Configuration**:
```json
{
  "filters": {
    "pci_mode": true,
    "deny_key_patterns": ["card", "cvv", "pan"]
  }
}
```

### HIPAA (Health Insurance Portability)

**Requirements**:
- ✅ Audit controls (comprehensive event logging)
- ✅ Access tracking (actor, resource, action)
- ✅ Integrity controls (hash chain, signatures)
- ✅ PHI redaction (PII mode enabled)
- ✅ 6-year retention (adjust backup_count accordingly)

**Configuration**:
```json
{
  "filters": {
    "pii_mode": "redact",
    "deny_key_patterns": ["ssn", "dob", "mrn", "diagnosis"]
  },
  "sinks": {
    "file": {
      "backup_count": 2190
    }
  }
}
```

### GDPR (General Data Protection Regulation)

**Requirements**:
- ✅ Data minimization (default-deny filtering)
- ✅ Right to erasure (redaction tools)
- ✅ Breach notification (alerting on access_denied)
- ✅ Pseudonymization (PII masking)
- ✅ Audit trail (all processing logged)

**Configuration**:
```json
{
  "filters": {
    "default_deny": true,
    "pii_mode": "mask",
    "allow_fields": ["trace_id", "action", "outcome"]
  }
}
```

## Performance

### Benchmarks

**Append Latency**:
- **Non-blocking**: <500μs (queue insertion)
- **With fsync**: <5ms (durable write)
- **Hash computation**: <100μs (SHA-256)
- **Signature generation**: <1ms (Ed25519, every 100 events)

**Throughput**:
- **Single-threaded**: 10,000 events/sec
- **Multi-threaded**: 50,000 events/sec
- **With syslog**: 8,000 events/sec (network overhead)

**Memory Usage**:
- **Base**: 10 MB (buffer queues)
- **Per event**: 1 KB (average)
- **Max RSS**: 512 MB (limits enforced)

### Optimization

**Tuning for High Volumes**:
```json
{
  "buffer_size": 10000,
  "batch_flush_interval_ms": 100,
  "sinks": {
    "file": {
      "buffer_size_bytes": 1048576
    }
  }
}
```

**Async Syslog** (non-blocking network I/O):
```json
{
  "sinks": {
    "syslog": {
      "async": true,
      "queue_size": 10000,
      "timeout_ms": 5000
    }
  }
}
```

## Troubleshooting

### Common Issues

**Issue**: Audit log not created

**Solution**:
```bash
# Check directory permissions
ls -ld /var/log/geode/
# Should be drwx------ geode geode

# Create directory if missing
sudo mkdir -p /var/log/geode
sudo chown geode:geode /var/log/geode
sudo chmod 700 /var/log/geode

# Verify configuration
cat config/logging.json | jq '.sinks.file'
```

---

**Issue**: Verification fails with SCHEMA_ERROR

**Solution**:
```bash
# Check for truncated JSON lines
tail -n 1 audit.jsonl

# Remove partial line if present
head -n -1 audit.jsonl > audit_fixed.jsonl
mv audit_fixed.jsonl audit.jsonl

# Re-run verification
geode audit verify --file audit.jsonl
```

---

**Issue**: Syslog messages not reaching server

**Solution**:
```bash
# Test network connectivity
nc -zv syslog.example.com 514

# Check firewall rules
sudo iptables -L | grep 514

# Enable debug logging
GEODE_LOG_LEVEL=debug geode serve

# Verify CEF format
tcpdump -i any port 514 -A
```

---

**Issue**: High memory usage

**Solution**:
```bash
# Monitor memory
top -p $(pgrep geode)

# Reduce buffer size
jq '.buffer_size = 1000' config/logging.json > config/logging_new.json

# Enable aggressive rotation
jq '.sinks.file.max_bytes = 10485760' config/logging.json > config/logging_new.json

# Restart with new config
sudo systemctl restart geode
```

## Best Practices

### Deployment Checklist

Production deployment recommendations:

- [ ] Generate unique Ed25519 key pair (not test keys!)
- [ ] Store private key in secure vault (HashiCorp Vault, AWS Secrets Manager)
- [ ] Set `GEODE_AUDIT_PUB` and `GEODE_AUDIT_SEC` environment variables
- [ ] Configure log rotation (90-2190 files for compliance)
- [ ] Set up remote syslog server (redundant, geographically distributed)
- [ ] Enable TDE for audit log encryption at rest
- [ ] Configure automated verification (daily cron job)
- [ ] Set up alerting for verification failures
- [ ] Document key rotation procedures
- [ ] Test disaster recovery (restore from backups)

### Security Hardening

**Restrict Access**:
```bash
# Only geode user can read audit logs
chmod 600 /var/log/geode/audit.jsonl*

# Only root can rotate
chmod 700 /usr/local/bin/rotate_audit_logs.sh

# SELinux mandatory access control
semanage fcontext -a -t geode_log_t '/var/log/geode(/.*)?'
restorecon -Rv /var/log/geode
```

**Network Security**:
```bash
# Use TLS for syslog (port 6514)
{
  "sinks": {
    "syslog": {
      "protocol": "tls",
      "port": 6514,
      "tls": {
        "ca_cert": "/etc/geode/syslog-ca.pem",
        "verify": true
      }
    }
  }
}
```

**Monitoring**:
```bash
# Alert on verification failures
0 2 * * * /usr/local/bin/verify_audit_logs.sh || mail -s "Audit verification failed" admin@example.com

# Monitor for tampering attempts
journalctl -u geode -f | grep TAMPER | mail -s "ALERT: Audit tampering detected" security@example.com
```

## Code Examples

### Basic Usage

```zig
const std = @import("std");
const audit = @import("audit/logger.zig");
const config = @import("audit/config.zig");
const events = @import("audit/events.zig");
const time = @import("audit/time.zig");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    // Load configuration
    const audit_config = try config.loadConfig(allocator, "config/logging.json");
    defer audit_config.deinit();

    // Initialize logger
    var sys_clock = time.SystemClock{};
    var sys_id_gen = time.SystemIdGen.init();

    const logger = try audit.AuditLogger.init(
        allocator,
        audit_config,
        sys_clock.clock(),
        sys_id_gen.idGen(),
    );
    defer logger.deinit();

    // Emit authentication event
    const auth_event = events.AuditEvent{
        .category = "auth",
        .action = "login",
        .outcome = .success,
        .ts_unix_ms = 0, // Auto-filled
        .severity = .INFO,
        .actor_id = "alice@example.com",
        .subject_id = null,
        .request_id = "req-12345",
        .session_id = "ses-abcdef",
        .source_ip = "192.168.1.100",
        .trace_id = null, // Auto-generated
        .span_id = null,  // Auto-generated
        .metadata = null,
    };

    try logger.audit(&auth_event);
}
```

### Custom Event Types

```zig
// Create custom database event
const db_event = events.AuditEvent{
    .category = "db",
    .action = "execute",
    .outcome = .success,
    .severity = .INFO,
    .actor_id = "alice@example.com",
    .resource = "graph:main",
    .metadata = .{
        .db_operation = "MATCH",
        .db_rowCount = 42,
        .duration_ms = 15,
    },
};

try logger.audit(&db_event);
```

## References

### Standards

- **RFC 5424**: The Syslog Protocol
  - https://datatracker.ietf.org/doc/html/rfc5424

- **Common Event Format (CEF)**
  - ArcSight CEF specification for SIEM integration

- **W3C Trace Context**
  - https://www.w3.org/TR/trace-context/

- **Ed25519 Digital Signatures**
  - https://ed25519.cr.yp.to/

### Compliance Resources

- **SOX Compliance**: IT audit controls
- **PCI-DSS**: Requirement 10 (logging and monitoring)
- **HIPAA**: 164.312(b) audit controls
- **GDPR**: Article 30 (records of processing)

### Code Location

- **Implementation**: `src/audit/logger.zig`
- **Configuration**: `src/audit/config.zig`
- **Tests**: `tests/test_audit_logging.zig`
- **Documentation**: `docs/AUDIT_LOGGING.md`

## Next Steps

**For Operators**:
- [Monitoring & Observability](/docs/ops/observability/) - Complete monitoring setup
- [Telemetry Advanced](/docs/ops/telemetry-advanced/) - Custom metrics and dashboards
- [Docker Deployment](/docs/ops/docker-deployment/) - Container audit log integration

**For Security Teams**:
- [Security Overview](/docs/security/overview/) - Complete security architecture
- [Field-Level Encryption](/docs/security/field-level-encryption/) - Additional data protection
- [Session Management](/docs/security/session-management/) - Session audit integration

**For Developers**:
- [Client Libraries](/docs/client-libraries/go-client/) - Client-side audit event generation
- [Testing Strategies](/docs/guides/testing-strategies/) - Audit log testing approaches

---

**Document Version**: 1.0
**Last Updated**: January 24, 2026
**Status**: Production Ready
**Compliance**: SOX, PCI-DSS, HIPAA, GDPR ready
