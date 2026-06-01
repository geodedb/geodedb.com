---
title: "Operations & Troubleshooting"
description: "Run Geode UI in production: systemd service, /healthz liveness, the Geode metrics dashboard, internationalization, and a troubleshooting runbook for common failures."
summary: "Operational runbook for the Geode UI server covering health checks, the metrics dashboard, secret rotation, internationalization, and troubleshooting common failures."
slug: "operations"
url: "/docs/geode-ui/operations/"
date: 2026-06-01
lastmod: 2026-06-01
draft: false
weight: 110
keywords: ["geode ui operations", "healthz", "geode metrics dashboard", "jwt secret rotation", "profile store key rotation", "i18n", "troubleshooting", "systemd"]
tags: ["geode-ui", "operations", "observability", "i18n", "troubleshooting"]
categories: ["Geode UI"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/geode-ui/operations/"
---

This page is the operational runbook for the Geode UI server ({{< version "clients.ui" >}}). It covers liveness checking, the metrics dashboard, secret rotation, internationalization, and a troubleshooting reference for the most common production failures. For installable configuration surfaces see [Configuration](/docs/geode-ui/configuration/); for user, role, backup, and audit-log management see [Administration](/docs/geode-ui/administration/).

## Overview

Geode UI ships as a self-contained Go binary that embeds the React SPA and exposes the Geode graph database over an HTTP/WebSocket API. In production it is typically run as the `geode-ui` headless systemd service, installed from the `geode-ui` Debian package.

The server exposes a small set of well-known surfaces:

| Path | Purpose |
|------|---------|
| `/` | SPA served from the embedded `dist/` |
| `/api/v1/...` | REST handlers |
| `/ws/query` | streaming GQL query (WebSocket) |
| `/mcp` | MCP HTTP transport (one `query` tool) |
| `/healthz` | liveness |

## Health checks

The `/healthz` endpoint is the server's liveness surface. Point your process supervisor, load balancer, or container orchestrator at it to determine whether the `geode-ui` process is up and serving.

```bash
curl -i http://localhost:8080/healthz
```

{{< callout type="note" >}}
`/healthz` reports the liveness of the `geode-ui` server process itself. The upstream Geode database's health is surfaced separately through the metrics dashboard (the **Server** card), described below.
{{< /callout >}}

## Geode metrics dashboard

The Dashboard page surfaces the upstream Geode database's Prometheus metrics. It renders only when the operator both enables the metrics listener on the Geode server **and** points Geode UI at it. When either is missing, the metric cards drop out of the grid entirely — there is no broken or half-rendered state.

### Wiring the data path

Two environment variables connect the dashboard to the upstream metrics:

| Service | Env var | Value | Effect |
|---------|---------|-------|--------|
| `geode` | `GEODE_METRICS_PORT` | `9090` (or any free port) | Starts the Geode Prometheus HTTP listener on the named port. |
| `geode-ui` | `GEODE_METRICS_URL` | `http://geode:9090/metrics` | Tells the proxy where to scrape. Empty disables `/api/v1/metrics` (the SPA hides the cards). |

{{< callout type="info" >}}
The `deploy/docker-compose.test.yml` stack already wires both variables for the Playwright suite (`37-dashboard-metrics.spec.ts`).
{{< /callout >}}

### What each card shows

| Card | Source metric families | Notes |
|------|------------------------|-------|
| Query throughput | `geode_queries_total` (per-second derivative for the sparkline), `geode_queries_failed_total`, `geode_query_duration_seconds` (histogram; p95 via linear interpolation) | The "p95 latency" badge degrades to "—" when the histogram has fewer than two non-empty buckets. |
| Connections | `geode_connections_active` (live gauge), `geode_connections_total` | Sparkline shows the last 5 minutes of `active`. |
| Storage | `geode_nodes_total`, `geode_edges_total`, `geode_memory_bytes` | Memory is humanised (KB / MB / GB / TB). |
| Server | `geode_server_uptime`, `geode_server_health{component=server}`, `geode_transactions_total` | The health pill flips red when `healthy != 1`. |

### Dashboard troubleshooting

| Symptom | Probable cause | Fix |
|---------|----------------|-----|
| Cards do not render | `GEODE_METRICS_URL` is empty on the `geode-ui` server. | Set the env var and restart. |
| 503 `METRICS_DISABLED` in browser devtools | Same as above — an explicit "feature off" signal. | Set `GEODE_METRICS_URL` and restart. |
| 502 `METRICS_UPSTREAM` | `geode-ui` can reach the URL but the upstream is down or returns non-200. | Verify `geode` is running with `GEODE_METRICS_PORT` set; from inside the `geode-ui` container run `curl http://geode:9090/metrics`. |
| 502 `METRICS_PARSE_ERROR` | An upstream Geode update broke the Prometheus text shape. | Capture a fresh `/metrics` sample, compare against `internal/server/testdata/prom-geode-sample.txt`, and file an upstream issue. |
| Cards render with `—` everywhere | The polling hook has not received a sample yet, or the upstream returned 200 with no `geode_*` families (the Geode build was compiled without the monitoring module). | Wait 5s for the next poll; if persistent, run `geode --version` and confirm v0.5.19 or later. |

For the live cluster view that layers on top of these metrics, see [Cluster Monitoring](/docs/geode-ui/cluster-monitoring/).

## JWT secret rotation

The Geode UI server signs every issued JWT with an HS256 key chosen by a `kid` (key ID) header stamp. Operators can rotate the signing secret without invalidating in-flight tokens by running the server with two secrets at once — the previous and the current — and flipping the active `kid` to point at the new key. After one full JWT TTL window (default 8 hours), every legacy token has expired and the previous secret can be dropped.

### Configuration surfaces

There are two equivalent ways to supply secrets:

| Source | Variable | Purpose |
|--------|----------|---------|
| Env (rotation-aware) | `JWT_SECRET_HEX_CURRENT` | Active signing key — stamped on every newly-issued token under `kid="current"`. |
| Env (rotation-aware) | `JWT_SECRET_HEX_PREVIOUS` | Optional — verification key for tokens issued before the rotation, indexed under `kid="previous"`. |
| CLI (legacy) | `-jwt-secret-hex` | Single-secret backward-compatible mode; stamped under `kid="current"`. |

Whenever `JWT_SECRET_HEX_CURRENT` is set, it wins regardless of the CLI flag. This lets an existing deployment whose unit file passes `-jwt-secret-hex` flip into rotation mode by setting two env vars without rewriting the unit file.

Both env vars must be **hex-encoded 32-byte HS256 secrets**:

```bash
openssl rand -hex 32
```

### Rotation procedure

The following sequence rotates a deployment from secret `S_old` to secret `S_new` with zero session disruption. It assumes a JWT TTL of 8 hours; adjust the wait window if your TTL is different.

**Step 1 — generate a fresh secret.**

```bash
S_new=$(openssl rand -hex 32)
echo "$S_new"  # store in your secrets manager — you will need it twice
```

**Step 2 — deploy in dual-secret mode.** Set BOTH env vars on every replica, with `PREVIOUS` equal to the existing secret (your old `-jwt-secret-hex` value) and `CURRENT` equal to the new secret:

```bash
export JWT_SECRET_HEX_PREVIOUS="<the existing secret>"
export JWT_SECRET_HEX_CURRENT="$S_new"
# Restart geode-ui (rolling restart is fine; both states are valid).
```

After restart, the server:

- **Signs** every new token with `S_new` (stamped `kid="current"`).
- **Verifies** tokens stamped `kid="previous"` against `S_old`.
- **Verifies** tokens stamped `kid="current"` against `S_new`.
- **Rejects** tokens stamped with any other `kid` value.

A correctly-configured replica accepts both old and new tokens for the duration of the rotation window.

**Step 3 — wait one full JWT TTL window.** After `1 × jwtTTL` (default 8 hours), every legacy token signed under `S_old` has expired by RFC 7519 `exp` semantics, and the previous secret is no longer needed for verification.

{{< callout type="warning" >}}
If you cannot wait the full TTL — for example, you must rotate immediately because the previous secret is compromised — use the durable JWT revocation primitive to `RevokeUser` every active session instead. That is faster but invalidates every active session, which is what you would do for a known-compromise event anyway.
{{< /callout >}}

**Step 4 — drop the previous secret.**

```bash
unset JWT_SECRET_HEX_PREVIOUS
# Restart geode-ui (rolling restart).
```

After restart, the server holds only `S_new` and refuses any token stamped with `kid="previous"`. Rotation is complete.

### Verifying a rotation

Two quick smoke checks confirm a rotation deployment:

1. **`kid` header on a freshly-issued token.** Log into the SPA after the rotation deploy, then `curl -i` `/api/v1/whoami` with the resulting JWT. The token header should base64-decode to `{"alg":"HS256","kid":"current","typ":"JWT"}`.
2. **Dual verification.** Mint a token before the rotation deploy (`kid="current"` pointing at `S_old`), redeploy with the rotation env vars, then re-verify the old token against the new replica — it should still succeed for the duration of the rotation window. When the previous secret is dropped (Step 4), the old token must be rejected with `401`.

### Failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `jwt: unknown kid "<value>"` on every request | A client cached a token stamped with a `kid` the server no longer knows. | Client must re-login; alternatively, re-add the previous secret to the env to extend the rotation window. |
| Server refuses to start with `decode JWT_SECRET_HEX_CURRENT` | The env var is not a valid 32-byte hex string. | Regenerate via `openssl rand -hex 32` and re-set. |
| Server refuses to start with `jwt: secret for kid "previous" must be at least 32 bytes` | `JWT_SECRET_HEX_PREVIOUS` was truncated or set to the wrong value. | Retrieve the original `S_old` from the secrets manager. |

### Audit events to monitor

During a rotation window the audit log should show:

- `audit_event=auth_login` with the JWT subject — normal traffic, both `kid`s accepted.
- `audit_event=admin_bootstrap` once on each replica restart.
- An absence of `kid: unknown` parse errors at the server log level — every well-formed token should land in either the previous or the current secret.

## Profile store key rotation

The profile store columns holding DSN strings and TLS PEM material are encrypted at rest with AES-256-GCM using `GEODE_PROFILESTORE_KEY` (base64-encoded 32 bytes). To rotate the key, use the `-profilestore-rewrap-from <hex>` one-shot startup sweep: set the new key in `GEODE_PROFILESTORE_KEY`, pass the old key via the flag, and the server re-seals every encrypted column on boot before serving any request.

```bash
# 1. Snapshot the database first.
cp /var/lib/geode-ui/profiles.db /var/lib/geode-ui/profiles.db.bak.$(date +%Y%m%d-%H%M%S)

# 2. Generate the new key.
NEW_KEY=$(openssl rand -base64 32)
OLD_KEY="<the previous GEODE_PROFILESTORE_KEY>"

# 3. Run the rewrap sweep (server exits 0 on success).
GEODE_PROFILESTORE_KEY="$NEW_KEY" \
  /usr/local/bin/geode-ui \
  -jwt-secret-hex "$(openssl rand -hex 32)" \
  -profilestore-rewrap-from "$OLD_KEY"

# 4. Restart the production server with only the NEW key.
GEODE_PROFILESTORE_KEY="$NEW_KEY" systemctl restart geode-ui
```

The rewrap sweep is idempotent: re-running it with the same key yields zero re-seals and exits 0. A row that is already sealed under the new key (for example, one created between Step 1 and Step 3) passes through unchanged.

### Failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `profile store rewrap: decode legacy key` | `-profilestore-rewrap-from` was malformed. | Re-pass the old key as base64-encoded 32 bytes. |
| `profile store rewrap: cipher mismatch` | A row in the DB was not sealed under the supplied old key. | Restore from the pre-rotation snapshot, audit which row drifted, and re-run. |

For the related connection and TLS material managed in the profile store, see [Connections & Profiles](/docs/geode-ui/connections-and-profiles/).

## Internationalization (i18n)

Geode UI uses [i18next](https://www.i18next.com/) with [react-i18next](https://react.i18next.com/). The SPA's locale strings are managed as TypeScript resource files, and a set of pre-commit and CI gates keep translations complete and safe.

### How locales are organized

Each supported language is a TypeScript module under `src/services/i18n/locales/`, and `src/services/i18n/locales/index.ts` lists the active set in `SUPPORTED_LANGUAGES` and `RESOURCES`. The reference locale is English (`en`), which every other locale must match key-for-key.

### Adding a new locale

1. Copy `src/services/i18n/locales/en.ts` to `src/services/i18n/locales/<bcp47>.ts`.
2. Translate the values. **Preserve every `{{var}}` placeholder verbatim.**
3. Add the new code to `SUPPORTED_LANGUAGES` and `RESOURCES` in `src/services/i18n/locales/index.ts`.
4. Run `npm run verify:translations`. It parses every `t('key')` site in `src/` and confirms the key resolves in every required locale (default: `en`). Zero missing and zero orphan keys are required, or the commit fails.
5. Run `npm run check:html-renderers` to confirm no translator-introduced `<b>`/`<i>` markup leaked into the values.

### Plurals and interpolation

Geode UI follows standard i18next conventions:

- **Plural forms** use the suffixes `key_one`, `key_other`, `key_few`, `key_many`, `key_zero`, called as `t('key', { count: n })`. The validator treats the suffixes as alternate declarations of the base key.
- **Variables** are interpolated with double braces — `'Hello {{name}}'`, rendered via `t('greet', { name })`.
- **Date and number formatting** goes through `useLocalization().formatDate / formatNumber / formatRelativeTime`, not through translation strings.

### The escaping rule

The i18next configuration deliberately disables i18next's own value-escaping (`escapeValue: false` at `src/services/i18n/config.ts`) because React already escapes interpolated text at render time. That choice is safe under a single rule:

> Never feed a `t()` value through the JSX `__html` prop, and never introduce `<Trans>` without an explicit `components` allowlist.

Both `dangerouslySetInnerHTML={{ __html: value }}` and a bare `<Trans i18nKey="…" />` skip React's escape and render attacker-influenced strings as markup. With `escapeValue: false`, either pattern turns the i18n boundary into a stored-XSS sink.

{{< callout type="danger" >}}
Because escaping is disabled, an attacker who can influence a translation key (a stored copy, a forked locale, or a future translation-management UI) gets a stored-XSS sink for free if a translated value reaches the DOM as raw HTML. Every translated value must reach the DOM through a React text node or a known attribute — never through a JSX HTML renderer.
{{< /callout >}}

### The enforcement gates

A set of scripts ratchet the i18n discipline at both pre-commit and CI stages:

| Script | Stage | Enforces |
|--------|-------|----------|
| `verify:translations` | pre-commit + CI | Every `t('key')` resolves in `en`. |
| `detect:hardcoded-strings` | pre-commit + CI | No new JSX `label` / `placeholder` / `aria-label` literals. |
| `check:html-renderers` | pre-commit + CI | The escaping rule above (no `__html` `t()` values, no unguarded `<Trans>`). |

`scripts/check-html-renderers.mjs` (run via `npm run check:html-renderers`) greps `src/**/*.{ts,tsx}` for the two unsafe patterns and is wired in `.pre-commit-config.yaml` to run on every commit. If a change introduces one of the patterns intentionally and a reviewer has signed off on the risk, suppress the gate per line:

```tsx
// eslint-disable-next-line html-renderer
<Trans i18nKey="rich.welcome" components={{ b: <strong /> }} />
```

The `// eslint-disable-next-line html-renderer` annotation is recognized by the script. It is not an actual ESLint rule today; the comment is a shared spelling so the convention survives if enforcement later moves to a custom ESLint rule.

## Troubleshooting reference

This section consolidates the most common production failures and their fixes. Failure modes specific to a single subsystem are documented inline above.

### Server will not start

| Symptom | Cause | Fix |
|---------|-------|-----|
| `decode JWT_SECRET_HEX_CURRENT` | `JWT_SECRET_HEX_CURRENT` is not a valid 32-byte hex string. | Regenerate with `openssl rand -hex 32` and re-set. |
| `jwt: secret for kid "previous" must be at least 32 bytes` | `JWT_SECRET_HEX_PREVIOUS` was truncated or wrong. | Retrieve the original previous secret from the secrets manager. |
| `profile store rewrap: decode legacy key` | The key passed to `-profilestore-rewrap-from` was malformed. | Re-pass the old key as base64-encoded 32 bytes. |
| `profile store rewrap: cipher mismatch` | A profile-store row was not sealed under the supplied old key. | Restore from the pre-rotation snapshot, audit which row drifted, and re-run. |

### Authentication failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| `jwt: unknown kid "<value>"` on every request | A client cached a token stamped with a `kid` the server no longer knows. | Client must re-login; alternatively re-add the previous secret to extend the rotation window. |
| Old token rejected with `401` after a rotation | The previous secret was dropped (Step 4 of the rotation). | Expected behavior — the client must re-login. |

### Metrics dashboard failures

See [Dashboard troubleshooting](#dashboard-troubleshooting) above for the full `METRICS_*` error table.

{{< callout type="tip" >}}
When the metrics cards show `—` everywhere, first wait 5 seconds for the next poll. If the values are still empty, confirm the upstream Geode build includes the monitoring module by running `geode --version` and checking for v0.5.19 or later.
{{< /callout >}}

## Related pages

- [Configuration](/docs/geode-ui/configuration/) — flags, environment variables, and profile JSON.
- [Administration](/docs/geode-ui/administration/) — users, roles, policies, grants, backups, restores, migrations, and the audit log.
- [Authentication & Security](/docs/geode-ui/authentication-and-security/) — JWT issuance, rate limiting, and proxy trust.
- [Cluster Monitoring](/docs/geode-ui/cluster-monitoring/) — the live cluster view built on Geode metrics.
- [Connections & Profiles](/docs/geode-ui/connections-and-profiles/) — managing the encrypted profile store.
