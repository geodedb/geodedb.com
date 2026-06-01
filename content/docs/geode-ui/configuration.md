---
title: "Geode UI Configuration"
description: "Complete reference for every Geode UI CLI flag and environment variable: listen address, JWT secrets and rotation, profile store, rate limits, LSP bridge, and metrics."
summary: "A full reference of the command-line flags and environment variables that configure the Geode UI server, with defaults, types, and example startup commands."
slug: "configuration"
url: "/docs/geode-ui/configuration/"
date: 2026-06-01
lastmod: 2026-06-01
draft: false
weight: 30
keywords: ["geode ui configuration", "geode-ui flags", "jwt-secret-hex", "GEODE_PROFILESTORE_KEY", "profile store", "rate limiting", "lsp bridge", "metrics url"]
tags: ["geode-ui", "configuration", "operations", "security"]
categories: ["Geode UI"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/geode-ui/configuration/"
---

Geode UI is configured entirely through command-line flags and environment variables — there is no separate config file. This page is the authoritative reference for every flag the `geode-ui` server accepts and every environment variable it reads, with defaults, types, and worked examples.

## Overview

The `geode-ui` binary parses its configuration once at startup. Flags are supplied on the command line (or, for the headless systemd service, in the unit file), while a small set of secrets and integration endpoints are supplied through the environment so they never appear in process listings or unit files.

Two pieces of configuration are non-negotiable to boot:

- A **JWT signing secret**, supplied either as the `JWT_SECRET_HEX_CURRENT` environment variable or the `-jwt-secret-hex` flag.
- The **profile store encryption key**, `GEODE_PROFILESTORE_KEY`, which encrypts DSN strings and TLS material at rest.

Everything else has a safe default. The minimal startup command is:

```bash
SECRET=$(openssl rand -hex 32)
KEY=$(openssl rand -base64 32)

GEODE_PROFILESTORE_KEY="$KEY" \
  ./bin/geode-ui -listen :8080 -jwt-secret-hex "$SECRET"
```

{{< callout type="note" >}}
The server signs every JWT with an HS256 key. When `JWT_SECRET_HEX_CURRENT` is set, it wins regardless of the `-jwt-secret-hex` flag — this is what lets a deployment flip into zero-downtime rotation mode without rewriting its unit file. See [Authentication & Security](/docs/geode-ui/authentication-and-security/) and [Operations & Troubleshooting](/docs/geode-ui/operations/) for the full rotation runbook.
{{< /callout >}}

## Command-line flags

All flags use Go's single-dash convention (`-flag value` or `-flag=value`). Boolean flags accept `-flag` (sets `true`), `-flag=true`, or `-flag=false`. Pass `-h` or `-help` to print the usage text and exit.

### Core server

| Flag | Default | Type | Purpose |
|------|---------|------|---------|
| `-listen` | `:8080` | string | HTTP listen address for the API + embedded SPA. |
| `-jwt-secret-hex` | (empty) | string | Hex-encoded HS256 secret, at least 32 bytes; generate with `openssl rand -hex 32`. Required unless `JWT_SECRET_HEX_CURRENT` is set in the environment. |
| `-jwt-ttl` | `8h` | duration | JWT lifetime. Must lie in the range `1m`..`24h`. |
| `-admin-users` | (empty) | string | Comma-separated upstream usernames granted the `admin` role on login. Empty means no admin auto-bootstrap. |

{{< callout type="warning" title="Breaking change: admin bootstrap is opt-in" >}}
`-admin-users` defaults to empty — **no** usernames are auto-granted the `admin` role unless you opt in explicitly. Deployments that relied on the previous hard-coded `geode` default must add `-admin-users=geode` (or whatever set they need) to their startup arguments. Name matching is Unicode-normalised (NFKC + case-folding), so `Bob`, `BOB`, and `bob` map to the same bucket. The set bootstrapped (or not) is recorded in the audit log under `admin_bootstrap`.
{{< /callout >}}

### Profiles and storage

| Flag | Default | Type | Purpose |
|------|---------|------|---------|
| `-profiles` | (empty) | string | Path to a JSON profiles config. On first launch with an empty profile store, the file is seeded into the store as `scope=system` profiles, then unused thereafter. |
| `-profile-seed-dir` | `/etc/geode-ui/seed-profiles.d` | string | Directory scanned for `*.json` profile seed drop-ins on first launch (only when the profile store is empty). Matches the apt package's `/etc/geode-ui/seed-profiles.d` convention. |
| `-profile-store` | `/var/lib/geode-ui/profiles.db` | string | Path to the SQLite profile store. Profiles can be CRUD'd at runtime via `/api/v1/profiles`. Use `:memory:` for ephemeral test runs. |
| `-upload-dir` | `/var/lib/geode-ui/uploads` | string | Filesystem directory where multipart uploads (backup files, migration content) are persisted. The subdirectories `backups/` and `migrations/` are auto-created. |
| `-profilestore-rewrap-from` | (empty) | string | One-shot startup sweep: base64-encoded **legacy** 32-byte AES-256 key. Re-seals every encrypted profile-store column under the active `GEODE_PROFILESTORE_KEY`, then continues to serve. Empty disables the sweep. See [Operations & Troubleshooting](/docs/geode-ui/operations/). |

If no profile store yet exists, the server falls back to a single bootstrap profile named `default` pointing at `quic://127.0.0.1:3141`. See [Connections & Profiles](/docs/geode-ui/connections-and-profiles/) for the profile JSON shape and runtime management.

### Security and rate limiting

| Flag | Default | Type | Purpose |
|------|---------|------|---------|
| `-secure-cookies` | `true` | bool | Set the `Secure` attribute on auth + CSRF cookies. Disable **only** for local development over plain HTTP — production deployments must keep this `true`. |
| `-password-hibp-check` | `false` | bool | Enable the HIBP k-anonymity check on user create / username / password handlers. Off by default so password-set handlers stay hermetic and air-gap-friendly. |
| `-trust-proxy-xff` | `false` | bool | Trust the `X-Forwarded-For` header for per-IP rate-limit keying. Enable only when behind a TLS-terminating reverse proxy you control. |
| `-profile-crud-rps` | `0` | float | Per-actor profile-CRUD rate in requests/second. A value `<= 0` uses the built-in default (`0.5`, i.e. 30/min). |
| `-profile-crud-burst` | `0` | float | Per-actor profile-CRUD burst size. A value `<= 0` uses the built-in default (`10`). |
| `-onboard-rps` | `0` | float | Per-IP rate in requests/second on `POST /api/v1/profiles/onboard`. A value `<= 0` uses the built-in default (`1`). |
| `-onboard-burst` | `0` | float | Per-IP burst size on `POST /api/v1/profiles/onboard`. A value `<= 0` uses the built-in default (`5`). |

{{< callout type="danger" title="Security note — -trust-proxy-xff" >}}
By default the per-IP login limiter (5 rps) and the per-(profile, username) lockout counter key on `RemoteAddr`, which makes the deployment secure-by-default against a public-internet attacker who would otherwise rotate `X-Forwarded-For` to bypass the limiter or trip per-IP lockouts against innocent IPs.

Set `-trust-proxy-xff=true` **only** when the binary sits behind a TLS-terminating reverse proxy you control and that proxy strips any inbound `X-Forwarded-For` before appending the real client hop.
{{< /callout >}}

### LSP bridge

The `/ws/lsp` WebSocket reverse-proxies to an upstream Geode LSP TCP listener (`geode serve --lsp-port`), giving the browser editor schema-aware completion.

| Flag | Default | Type | Purpose |
|------|---------|------|---------|
| `-lsp-enabled` | `true` | bool | Register the `/ws/lsp` WebSocket bridge to the upstream LSP listener. Set `false` to opt out of exposing LSP through the browser-facing surface. |
| `-lsp-upstream` | `127.0.0.1:3142` | string | `host:port` of the upstream LSP TCP listener (`geode serve --lsp-port`). |
| `-ws-allowed-origins` | (empty) | string | Comma-separated absolute origins permitted to upgrade `/ws/lsp` (e.g. `https://app.example.com`). Empty enforces **same-origin only** — the route is default-deny against cross-origin attackers. Add trusted origins here for cross-origin SPA deployments (e.g. a front-end served from a CDN distinct from the API origin). |

## Environment variables

A small set of secrets and integration endpoints are read from the environment rather than flags so they never appear in process arguments or unit files.

| Variable | Default | Type | Purpose |
|----------|---------|------|---------|
| `JWT_SECRET_HEX_CURRENT` | (none) | hex string | Active JWT signing key — stamped on every newly-issued token under `kid="current"`. When set, it wins over `-jwt-secret-hex`. Must be a hex-encoded 32-byte HS256 secret. |
| `JWT_SECRET_HEX_PREVIOUS` | (none) | hex string | Optional verification key for tokens issued before a rotation, indexed under `kid="previous"`. Must be a hex-encoded 32-byte secret. |
| `GEODE_PROFILESTORE_KEY` | (none, required) | base64 string | AES-256-GCM key encrypting the profile store's DSN strings and TLS PEM material at rest. Must be exactly 32 raw bytes after base64 decoding; generate with `openssl rand -base64 32`. The server refuses to start if this is missing, not valid base64, or the wrong length. |
| `GEODE_METRICS_URL` | (empty) | URL | Upstream Geode Prometheus listener to scrape for the dashboard metric cards (e.g. `http://geode:9090/metrics`). Empty disables `/api/v1/metrics` and the SPA hides the metric cards. |
| `GEODE_PPROF` | (unset) | flag (`1`) | Set to `1` to enable an opt-in `pprof` debug server. Any other value (or unset) leaves it off — the production listener never exposes `/debug/pprof/*`. |
| `GEODE_PPROF_LISTEN` | `127.0.0.1:6060` | host:port | Listen address for the `pprof` server when `GEODE_PPROF=1`. Must resolve to a loopback host (`127.0.0.1:N`, `[::1]:N`, or `localhost:N`); the server refuses any other interface to keep the endpoint off the network. |

{{< callout type="info" >}}
The upstream `geode` server, not `geode-ui`, owns the metrics listener. Start `geode` with `GEODE_METRICS_PORT` set (e.g. `9090`), then point `geode-ui` at it with `GEODE_METRICS_URL`. When either is missing the dashboard metric cards drop out of the grid entirely — there is no half-rendered state. See [Cluster Monitoring](/docs/geode-ui/cluster-monitoring/) and [Operations & Troubleshooting](/docs/geode-ui/operations/) for the card-by-card details.
{{< /callout >}}

## Example startup commands

### Minimal local development

Run against a local Geode at `quic://127.0.0.1:3141`, signing JWTs with a freshly generated secret. Disable `Secure` cookies only because local dev typically runs over plain HTTP.

```bash
SECRET=$(openssl rand -hex 32)
KEY=$(openssl rand -base64 32)

GEODE_PROFILESTORE_KEY="$KEY" \
  ./bin/geode-ui \
  -listen :8080 \
  -jwt-secret-hex "$SECRET" \
  -secure-cookies=false
```

Open `http://localhost:8080` and sign in with your Geode credentials.

### Production-shaped, behind a reverse proxy

Trust `X-Forwarded-For` (the proxy strips inbound XFF and appends the real hop), bootstrap a known admin username, and shorten the JWT lifetime.

```bash
GEODE_PROFILESTORE_KEY="$(cat /run/secrets/profilestore_key)" \
JWT_SECRET_HEX_CURRENT="$(cat /run/secrets/jwt_current)" \
  /usr/local/bin/geode-ui \
  -listen 127.0.0.1:8080 \
  -jwt-ttl 1h \
  -admin-users=geode \
  -trust-proxy-xff=true \
  -secure-cookies=true
```

{{< callout type="note" >}}
Because `JWT_SECRET_HEX_CURRENT` is set, the `-jwt-secret-hex` flag is not required and would be ignored if present.
{{< /callout >}}

### Seeding profiles on first launch

Seed connection profiles from a JSON file into a fresh profile store. After the first boot the profiles live in the SQLite store and are managed at runtime via `/api/v1/profiles`.

```bash
GEODE_PROFILESTORE_KEY="$KEY" \
  ./bin/geode-ui \
  -jwt-secret-hex "$SECRET" \
  -profiles ./profiles.json \
  -profile-store /var/lib/geode-ui/profiles.db
```

Profiles JSON example:

```json
[
  { "name": "local", "dsn": "quic://127.0.0.1:3141" },
  { "name": "prod",  "dsn": "quic://geode-prod.internal:3141", "tls_ca_file": "/etc/certs/ca.pem" }
]
```

### Dashboard metrics enabled

Wire the dashboard metric cards to an upstream Geode Prometheus listener.

```bash
GEODE_PROFILESTORE_KEY="$KEY" \
GEODE_METRICS_URL="http://geode:9090/metrics" \
  ./bin/geode-ui \
  -listen :8080 \
  -jwt-secret-hex "$SECRET"
```

### Opt-in pprof for performance debugging

Enable the loopback-only `pprof` server. It binds to a separate listener and is never mounted on the production routes.

```bash
GEODE_PROFILESTORE_KEY="$KEY" \
GEODE_PPROF=1 \
GEODE_PPROF_LISTEN=127.0.0.1:6060 \
  ./bin/geode-ui \
  -jwt-secret-hex "$SECRET"
```

Capture a 30-second CPU profile from the host:

```bash
go tool pprof http://127.0.0.1:6060/debug/pprof/profile?seconds=30
```

## Startup failure reference

The server returns a non-zero exit code and writes the error to stderr on any fatal-init failure. Common configuration errors:

| Symptom | Cause | Fix |
|---------|-------|-----|
| `missing JWT secret: set JWT_SECRET_HEX_CURRENT ... or pass -jwt-secret-hex` | Neither the env var nor the flag supplied a signing secret. | Set `JWT_SECRET_HEX_CURRENT` or pass `-jwt-secret-hex` with a value from `openssl rand -hex 32`. |
| `decode JWT_SECRET_HEX_CURRENT` / `decode -jwt-secret-hex` | The supplied secret is not a valid hex string. | Regenerate with `openssl rand -hex 32` and re-set. |
| `jwt: secret for kid "previous" must be at least 32 bytes` | `JWT_SECRET_HEX_PREVIOUS` was truncated or set to the wrong value. | Retrieve the original secret from your secrets manager. |
| `jwt: ttl must be 1m..24h` | `-jwt-ttl` is outside the allowed range. | Choose a duration between `1m` and `24h`. |
| `profilestore: env var GEODE_PROFILESTORE_KEY is required for at-rest encryption` | The encryption key was not set. | Generate one with `openssl rand -base64 32` and set `GEODE_PROFILESTORE_KEY`. |
| `key length N bytes (need 32)` | `GEODE_PROFILESTORE_KEY` decoded to the wrong length. | Regenerate with `openssl rand -base64 32`. |
| `pprof: refusing non-loopback listen address` | `GEODE_PPROF_LISTEN` resolved to a non-loopback host. | Use `127.0.0.1:N`, `[::1]:N`, or `localhost:N`. |

## Related pages

- [Installation](/docs/geode-ui/installation/) — apt packages and binary layout.
- [Quick Start](/docs/geode-ui/quick-start/) — first-launch walkthrough.
- [Authentication & Security](/docs/geode-ui/authentication-and-security/) — JWT signing, cookies, rate limiting, and admin roles.
- [Connections & Profiles](/docs/geode-ui/connections-and-profiles/) — the profile store and DSN format.
- [Cluster Monitoring](/docs/geode-ui/cluster-monitoring/) — the dashboard metric cards.
- [Operations & Troubleshooting](/docs/geode-ui/operations/) — JWT and profile-store key rotation runbooks.
