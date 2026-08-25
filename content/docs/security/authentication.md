---
title: "Authentication"
description: "Current Geode authentication surface: username/password, sessions, API keys, MFA, mTLS, offline auth integrity tooling, and planned LDAP/OIDC work"
url: /docs/security/authentication/
weight: 20
tags:
  - security
  - authentication
  - mfa
  - ldap
  - oauth
  - api-keys
categories:
  - security
keywords:
  - authentication
  - login
  - credentials
  - MFA
  - TOTP
  - LDAP
  - Active Directory
  - OAuth2
  - OIDC
  - API keys
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-03-30 -->

# Authentication

Authentication (AuthN) verifies user identity before granting access to Geode. This page reflects the current tagged Geode authentication surface in `__GEODE_TAG__` plus the known auth gaps documented on `main` as of 2026-03-30.

> **Current state**
>
> - Implemented today: username/password, session tokens, API keys, MFA (TOTP), and mTLS
> - Planned, not implemented: LDAP/Active Directory (`GAP-0246`) and OAuth2/OIDC (`GAP-0247`)
> - Known limitation on `main`: CLI auth management commands still operate on the local auth store instead of delegating to a running server (`GAP-0270`)

## Feature Status

| Method | Status | Notes |
|--------|--------|-------|
| Username/Password | Implemented | Authentication is enabled by default |
| Session tokens | Implemented | Stored in `~/.geode/credentials.json` when saved |
| API keys | Implemented | Managed with `geode apikey ...` |
| MFA (TOTP) | Implemented | Core MFA support exists; some CLI end-to-end flows are affected by `GAP-0270` |
| mTLS | Implemented | Certificate-based client identity |
| LDAP / Active Directory | Planned | Not implemented in `src/security/` as of 2026-03-30 |
| OAuth2 / OIDC | Planned | Not implemented in `src/security/` as of 2026-03-30 |

## Default Bootstrap

Authentication is enabled by default in modern Geode builds. On first startup, Geode creates the bootstrap admin user from environment variables.

```bash
# Defaults to username "geode" if not overridden
export GEODE_ADMIN_USERNAME="geode"
export GEODE_DEFAULT_PASSWORD="change-me-immediately"

./geode serve --listen 0.0.0.0:3141
```

If `GEODE_ADMIN_USERNAME` is omitted, the default bootstrap username is `geode`. The docs site previously used `admin` in examples; that is no longer the correct default.

## Current CLI Surface

### Login and Session Management

```bash
# Login and save a session
geode auth login -U geode --save-session

# Reuse saved credentials automatically
geode query "RETURN 1 AS x"

# Inspect or clear saved credentials
geode auth token
geode auth logout
```

`geode auth --help` currently exposes:

- `login`
- `logout`
- `token`
- `init`
- `reseal`
- `verify`

### Query and Shell Authentication

```bash
# Explicit credentials
geode query -U geode -P "RETURN 1 AS x"
geode shell --server localhost:3141 -U geode -P secret

# DSN-based credentials
geode query --dsn quic://geode:secret@localhost:3141 "RETURN 1 AS x"
geode shell --dsn quic://geode:secret@localhost:3141/social
```

### Offline Auth Integrity Workflows

Auth storage now uses a graph-backed internal store with HMAC integrity support. The offline maintenance commands are:

```bash
geode auth init --data-dir /var/lib/geode
geode auth reseal --data-dir /var/lib/geode
geode auth verify --data-dir /var/lib/geode
```

Use these on-host against a stopped or explicitly managed data directory, not as a substitute for live server-side user administration.

## Important Limitation: Local vs Server-Side Auth Commands

As of the 2026-03-30 audit, these commands still manage the **local auth store** and do **not** yet delegate to the running server over QUIC:

- `geode user ...`
- `geode role ...`
- `geode policy ...`
- `geode grant ...`
- `geode revoke ...`
- `geode apikey ...`
- CLI MFA enrollment and verification flows

That is the root of `GAP-0270`, which currently accounts for most of the remaining geodetestlab failures on `main`.

**Practical guidance**:

- Use these commands for **offline/on-host administration** where local data-dir access is intended.
- Do not assume they operate against a live remote server yet.
- Track the next auth patch if you need server-delegated CLI user and API-key administration.

## Password Security

Geode documents and uses Argon2id-style password handling and enforces password policy at login/update time.

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

The CLI help and current auth docs also assume:

- the default bootstrap user is `geode`
- password prompts are preferred over inline plaintext arguments
- saved sessions live at `~/.geode/credentials.json`

## API Keys

API keys are managed through the `apikey` subcommand family:

```bash
geode apikey create --user alice --name prod-app --scope query:execute
geode apikey list --user alice
geode apikey revoke --user alice --name prod-app
geode apikey revoke-all --user alice --yes
```

**Current caveat**: CLI API key management still falls under the local-store limitation described above.

## Multi-Factor Authentication (MFA)

Geode includes TOTP-based MFA support and recent March hardening fixes addressed deterministic secret generation. Core MFA support exists, but some CLI-driven MFA workflows are still constrained by `GAP-0270` because they do not yet delegate to the running server.

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

Use MFA for:

- administrative users
- privileged automation accounts with interactive fallback
- regulated environments requiring step-up authentication

## Mutual TLS (mTLS)

Certificate-based client identity is available for zero-trust or service-mesh deployments.

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

Client usage:

```bash
geode query \
  --ca-cert /etc/ssl/ca.crt \
  --client-cert /etc/ssl/client.crt \
  --client-key /etc/ssl/client.key \
  --server secure.example.com:3141 \
  "RETURN 1 AS x"
```

## Planned Integrations

### LDAP / Active Directory

LDAP/AD remains **planned** and is still tracked as `GAP-0246`. The March 2026 audits explicitly confirmed there is no LDAP/AD implementation in `src/security/`.

For enterprise identity requirements today, use one of:

- mTLS with your existing PKI
- username/password plus MFA
- API keys for scoped automation

### OAuth2 / OIDC

OAuth2/OIDC remains **planned** and is still tracked as `GAP-0247`. The March 2026 audits explicitly confirmed there is no OAuth/OIDC implementation in `src/security/`.

Do not treat old draft configuration examples as deployable current-state guidance.

## Best Practices

1. Use `GEODE_DEFAULT_PASSWORD` only for bootstrap, then rotate immediately.
2. Prefer `geode auth login --save-session` over repeated inline passwords.
3. Use `--ca-cert` instead of `--insecure-tls-skip-verify` outside development.
4. Treat `geode user|role|policy|grant|revoke|apikey` as local/offline tools until `GAP-0270` is closed.
5. Reject semicolons in any caller-controlled FLE role input until the `GAP-0271` patch lands.

## Related Documentation

- [Security Overview](/docs/security/overview/)
- [Field-Level Encryption](/docs/security/field-level-encryption/)
- [DSN Specification](/docs/reference/dsn/)
- [CLI and API](/docs/reference/cli-and-api/)
