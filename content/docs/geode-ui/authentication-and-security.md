---
title: "Authentication & Security"
description: "Geode UI security model: JWT authentication, secret rotation, RBAC, per-IP rate limiting, profile-store at-rest encryption, and the Content Security Policy."
summary: "How Geode UI authenticates users with JWT, gates admin operations with RBAC, rate-limits logins per IP, encrypts the profile store at rest, and locks down the SPA with a strict CSP."
slug: "authentication-and-security"
url: "/docs/geode-ui/authentication-and-security/"
date: 2026-06-01
lastmod: 2026-06-01
draft: false
weight: 90
keywords: ["geode-ui security", "jwt authentication", "jwt secret rotation", "rbac", "rate limiting", "profile store encryption", "content security policy", "csp"]
tags: ["geode-ui", "security", "authentication", "jwt", "rbac"]
categories: ["Geode UI"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/geode-ui/authentication-and-security/"
---

Geode UI {{< version "clients.ui" >}} layers its own authentication and transport hardening on top of the Geode graph database it fronts. This page documents the security model end users and operators interact with: how the JWT login flow works, how to rotate the signing secret, which roles gate administrative operations, how the per-IP login limiter protects the deployment, how the profile/credential store is encrypted at rest, and the Content Security Policy that constrains the embedded SPA.

## Overview

Geode UI is a self-contained Go binary that embeds a React + TypeScript single-page application and exposes the Geode client surface over an HTTP/WebSocket API. Authentication is performed with short-lived JWTs signed with an HS256 secret supplied at startup. Authorization in the admin and ops surfaces follows a deny-by-default RBAC vocabulary. Network-facing protections include a per-IP login rate limiter and a per-(profile, username) lockout counter, while sensitive profile columns are sealed with AES-256-GCM before they ever touch disk.

{{< callout type="note" >}}
This page covers the browser/server security model. For Electron desktop hardening — the privileged `geode://` protocol, saved-password trust boundary, secure-store encryption, and OS permission policy — see the [Desktop Application](/docs/geode-ui/desktop-app/) page.
{{< /callout >}}

## JWT authentication

Geode UI uses JSON Web Tokens to authenticate API and WebSocket requests. The signing secret and token lifetime are configured with startup flags.

### The signing secret (`-jwt-secret-hex`)

A hex-encoded HS256 secret is **required** at startup. It must be at least 32 bytes. Generate one with `openssl`:

```bash
# Generate a JWT secret
SECRET=$(openssl rand -hex 32)

# Run, pointing at a local Geode at quic://127.0.0.1:3141
./bin/geode-ui -listen :8080 -jwt-secret-hex "$SECRET"
```

The following flags govern token handling:

| Flag | Default | Purpose |
|------|---------|---------|
| `-jwt-secret-hex` | (required) | hex-encoded HS256 secret, ≥32 bytes; generate with `openssl rand -hex 32` |
| `-jwt-ttl` | `8h` | JWT TTL (1m..24h) |

For the full configuration surface, see [Configuration](/docs/geode-ui/configuration/).

{{< callout type="warning" title="Keep the secret out of version control" >}}
Never commit secrets or tokens. Supply the JWT secret through an environment variable or another secret-management mechanism rather than hardcoding it.
{{< /callout >}}

### Login flow

After starting the server, open the listen address in a browser and sign in with your Geode credentials:

```bash
# Open http://localhost:8080 and sign in with your Geode credentials
```

The credentials you enter are the credentials of the underlying Geode database — Geode UI authenticates against the engine and, on success, issues a JWT for subsequent API and WebSocket calls. The token persists across reloads (the end-to-end suite's `01-auth.spec.ts` covers login, redirect, token persistence, and logout). When the token expires after the configured `-jwt-ttl`, you log in again.

### How tokens are used on the wire

Once issued, the token authenticates calls to the REST API (`/api/v1/...`) and the streaming GQL WebSocket channel (`/ws/query`). The same SPA bundle, auth flow, and token are reused under the Electron desktop build — there is no second auth flow for the desktop app. For the API surface itself, see [REST API, WebSocket & MCP](/docs/geode-ui/rest-api/).

### Rotating the JWT secret

To rotate the signing secret, generate a fresh hex secret and restart the binary with the new `-jwt-secret-hex` value:

```bash
# Generate and roll to a new secret, then restart the service
SECRET=$(openssl rand -hex 32)
./bin/geode-ui -listen :8080 -jwt-secret-hex "$SECRET"
```

Because tokens are signed with the secret in effect at issue time, rotating the secret invalidates all previously issued tokens — every signed-in session must log in again to obtain a token signed with the new secret.

## Role-based access control (RBAC)

Authorization in the admin and ops surfaces is **deny-by-default**. The authorization vocabulary is defined in-repo at `src/lib/rbacVocab.ts` and is hand-maintained to mirror the authoritative upstream enums in `geode_auth_lib.zig` (`Action`, `Resource`, `Permission`).

### Admin and ops surfaces gated by RBAC

The `/admin` section exposes Geode's policy primitives. The administrative and operational pages the UI ships include users, roles, policies, grants, backups, restores, migrations, and the audit log. The policy-management surfaces documented in the security-admin reference include:

- **User attributes** — arbitrary key/value attributes per user (department, region, level, …) that ABAC row-level policies consume at query time, managed via the **Attributes** button on each row of `/admin/users`.
- **RLS deny policies** (`/admin/rls-deny`) — label-level deny: rows of a label in a graph are hidden from a given user; leaving the username empty applies the deny to all users.
- **RLS attribute policies** (`/admin/rls-attribute`) — a row of a label is visible only when `row.<rowProperty>` equals the requesting principal's `attribute.<attributeKey>`, which combines with user attributes to drive per-tenant or per-department row visibility.

For the full administration walkthrough, see [Administration](/docs/geode-ui/administration/).

### Capability gating of admin write actions

The UI does not assume every connected engine supports every admin operation. `GET /api/v1/capabilities` reports `admin_writable.{attributes, rls_deny_policies, rls_attribute_policies}` so the UI can disable the affected tab or action on engines that do not support it. On builds that lack a surface, the SPA renders the admin write affordance in a disabled state with an inline note (and, for the version-gated surfaces, a tooltip pointing at the version requirement) instead of failing outright.

{{< callout type="info" >}}
The SPA gates admin call-to-action buttons from the upstream `SHOW CAPABILITIES` probe (surfaced via `GET /api/v1/capabilities`). Older engines render the admin write affordances disabled with an inline "not supported" note rather than erroring.
{{< /callout >}}

## Per-IP rate limiting and lockout

Geode UI ships secure-by-default against credential-stuffing and lockout-abuse from the public internet.

### How the limiter keys requests

By default, both protections key on the request's `RemoteAddr`:

- A **per-IP login limiter** allows 5 requests per second.
- A **per-(profile, username) lockout counter** tracks failed attempts.

Keying on `RemoteAddr` makes the deployment secure-by-default against a public-internet attacker who would otherwise rotate `X-Forwarded-For` to bypass the limiter or trip per-IP lockouts against innocent IPs.

### Trusting a reverse proxy (`-trust-proxy-xff`)

| Flag | Default | Purpose |
|------|---------|---------|
| `-trust-proxy-xff` | `false` | trust `X-Forwarded-For` for per-IP rate-limit keying |

{{< callout type="warning" title="Only enable -trust-proxy-xff behind a proxy you control" >}}
Set `-trust-proxy-xff=true` **only** when the binary sits behind a TLS-terminating reverse proxy you control and that proxy strips any inbound `X-Forwarded-For` before appending the real client hop. Otherwise an attacker can spoof `X-Forwarded-For` to defeat the per-IP limiter and lockout counter.
{{< /callout >}}

## Profile-store at-rest encryption

Geode UI can persist connection profiles, including sensitive transport material. Those sensitive columns are encrypted at rest.

### Sealed columns and the encryption key

The following profile-store columns are sealed with AES-256-GCM under a single-tier, env-keyed data encryption key (DEK) supplied via `GEODE_PROFILESTORE_KEY`:

- `dsn`
- `tls_ca_pem`
- `tls_cert_pem`
- `tls_key_pem`

The full trust model and migration shape are recorded in ADR 0002 (profile-store DEK trust model).

### Rotating the profile-store key

Key rotation is performed with the `-profilestore-rewrap-from <hex>` startup sweep, which rewraps the sealed columns from a prior key to the current `GEODE_PROFILESTORE_KEY`:

```bash
# Rotate: rewrap sealed profile-store columns from the previous DEK to the current one
GEODE_PROFILESTORE_KEY="<new-hex-key>" \
  ./bin/geode-ui -profilestore-rewrap-from "<previous-hex-key>"
```

For more on configuring profiles and connections, see [Connections & Profiles](/docs/geode-ui/connections-and-profiles/).

## Content Security Policy

The SPA is served with a strict Content Security Policy that constrains what the page may load and execute. The CSP is emitted on HTML responses by the server and reads:

```text
default-src 'self';
script-src  'self' 'wasm-unsafe-eval';
style-src   'self' 'unsafe-inline';
worker-src  'self' blob:;
connect-src 'self' wss:;
img-src     'self' data:;
font-src    'self' data:;
frame-ancestors 'none';
base-uri 'none';
form-action 'self';
object-src 'none'
```

The directives reflect the SPA's actual needs:

| Directive | Why |
|---|---|
| `script-src 'self'` | All bundle JavaScript is served same-origin. |
| `script-src 'wasm-unsafe-eval'` | Required by Monaco's tokenizer (tied to the Chromium feature, not the origin). |
| `style-src 'self' 'unsafe-inline'` | Minified CSS chunks load same-origin; styled-components injects inline `<style>` per render. |
| `worker-src 'self' blob:` | Monaco's worker bootstraps from a `blob:` URL on first edit. |
| `connect-src 'self' wss:` | The `/ws/query` upgrade and API calls go over `wss:`. |
| `img-src 'self' data:` | Icons, logos, and favicons load same-origin or as data URIs. |
| `font-src 'self' data:` | Brand woff2 fonts are self-hosted; no CDN. |
| `frame-ancestors 'none'` | The page cannot be framed. |
| `base-uri 'none'` | No `<base>` redirection. |
| `form-action 'self'` | Forms post same-origin only. |
| `object-src 'none'` | No plugins/embeds. |

The SPA is built to be CSP-friendly: there are no inline event handlers or unsafe patterns, and the current UI does not inject untrusted HTML — rendering is React-managed. (A `dompurify@^3.4.0` override is pinned in `package.json` so any transitive HTML-sanitization consumer resolves to a known patched version, even though the UI itself does not inject untrusted HTML.)

{{< callout type="note" >}}
Under the Electron desktop build the same CSP applies unchanged — the privileged `geode://` scheme gives the renderer the same `'self'` semantics a browser sees. The desktop-specific considerations (notably the `connect-src` boundary, which requires the API origin to be configured for packaged builds) are covered on the [Desktop Application](/docs/geode-ui/desktop-app/) page.
{{< /callout >}}

## Built-in security measures

Beyond the runtime controls above, the project applies the following measures across its supply chain and codebase:

- **Dependency scanning** — automated security scanning in CI.
- **Secret detection** — Gitleaks scanning for leaked credentials.
- **SAST** — static application security testing.
- **DOMPurify** — HTML sanitization is available via the `dompurify@^3.4.0` override pinned in `package.json`.
- **RBAC** — deny-by-default authorization vocabulary in `src/lib/rbacVocab.ts`, mirroring the upstream `geode_auth_lib.zig` enums.
- **CSP-ready** — no inline event handlers or unsafe patterns.
- **Profile-store at-rest encryption** — AES-256-GCM under an env-keyed DEK, with `-profilestore-rewrap-from` rotation.

### Operational best practices

When operating or developing with Geode UI:

1. Keep dependencies updated (`npm audit`).
2. Never commit secrets or tokens.
3. Use environment variables for sensitive configuration.
4. Sanitize user input before rendering.
5. Use the RBAC system for authorization.
6. External links must use `rel="noopener noreferrer"`.

## Reporting a vulnerability

Do not report security vulnerabilities through public issues. Report them by email to **<security@codepros.dev>** and include a description, steps to reproduce, a potential-impact assessment, and a suggested fix if you have one.

The project follows responsible disclosure: acknowledgment within 48 hours, an initial assessment within 1 week, and a resolution timeline that scales with severity (critical: 24–72 hours; high: 1–2 weeks; medium: 2–4 weeks; low: next release cycle). Security advisories are published after fixes are available, and credit is given to reporters unless anonymity is requested.

## Related pages

- [Administration](/docs/geode-ui/administration/) — users, roles, policies, grants, and RLS surfaces.
- [REST API, WebSocket & MCP](/docs/geode-ui/rest-api/) — the authenticated API surface.
- [Desktop Application](/docs/geode-ui/desktop-app/) — Electron hardening, saved-password trust boundary, secure store, and permission policy.
- [Configuration](/docs/geode-ui/configuration/) — full startup-flag reference.
- [Connections & Profiles](/docs/geode-ui/connections-and-profiles/) — managing the encrypted profile store.
