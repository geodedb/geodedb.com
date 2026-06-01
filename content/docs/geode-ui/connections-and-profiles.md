---
title: "Connections & Profiles"
description: "Understand the Geode UI connection model: what a connection is versus a stored profile, the connection picker, the seeded local-geode profile, and the profile-aware connection pool."
summary: "How Geode UI models saved Geode endpoints as connections backed by profile storage, including the connection picker, the seeded local-geode profile, and the profile-aware connection pool."
slug: "connections-and-profiles"
url: "/docs/geode-ui/connections-and-profiles/"
date: 2026-06-01
lastmod: 2026-06-01
draft: false
weight: 50
keywords: ["geode ui connections", "geode ui profiles", "connection picker", "local-geode profile", "profile-aware connection pool", "default connection", "active connection", "profilestore"]
tags: ["geode-ui", "connections", "profiles", "configuration"]
categories: ["Geode UI"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/geode-ui/connections-and-profiles/"
---

Geode UI talks to one or more Geode servers through saved endpoint definitions. In the interface these are called **connections**; in the storage and API layers the same records are called **profiles**. This page explains the model precisely, how the connection picker works, how profiles are stored and seeded, and how the server fans out to multiple Geode endpoints through a profile-aware connection pool.

## Overview

A **connection** is the user-facing name for a saved Geode endpoint. It bundles together the data source name (DSN), an optional saved username and password, an optional TLS bundle, and a default flag. It is **not** a user identity and **not** a UI-preferences pack.

A **profile** is the internal storage name for exactly the same thing. The two are not different objects — they are the same record viewed from different layers. The user-visible noun was changed from "Profile" to "Connection" (tracked as GAP-054), but the storage layer, the wire schema, and the API route kept the `Profile` name because those surfaces are stable and renaming them would break upgrades and clients.

{{< callout type="note" title="One concept, two names" >}}
When you read "Connection" in the Geode UI and "Profile" in storage paths (`internal/profilestore/`), the `/api/v1/profiles` route, or source types, they refer to the same saved endpoint. Operators should not encounter the word "Profile" in the UI itself.
{{< /callout >}}

## Why the two names exist

Before the rename, the SPA called these records "Profiles" everywhere. The problem is that "Profile" is ambiguous — different users arrive at the Login screen with different mental models:

- **psql / pgcli / DataGrip vocabulary:** a "Profile" is a saved connection bundle (DSN + saved username + TLS material + default flag). This is the reading Geode intended.
- **OS / SaaS vocabulary:** a "Profile" is a user identity ("my user profile" = my account).
- **Browser vocabulary:** a "Profile" is a UI-preferences pack ("Chrome profile" = saved tabs and bookmarks).

The first reading is the one Geode meant; the other two are the ones users actually arrived with. To match the operator's mental model of "a named Geode endpoint with optional saved credentials," the user-facing copy now says **Connection** for the entire concept.

### What the rename changed, and what it did not

| Surface | Renamed? | Detail |
|---|---|---|
| Login picker label | Yes | User-visible copy |
| "Save password for this connection" | Yes | User-visible copy |
| AddConnectionModal title | Yes | User-visible copy |
| Connection-switcher menu | Yes | Already said "Connections" |
| i18n keys (`auth.profile`, `auth.profileList`, …) | No | Internal identifiers; only the *values* changed |
| Server-side storage (`internal/profilestore/store.go`) | No | Records are still named `Profile` |
| API surface (`/api/v1/profiles`) | No | Part of the documented wire contract |
| Source-code symbols (`Profile`, `ConnectionRecord`, `profilestore`) | No | Each follows the layer it belongs to |

## Glossary

| Term | Meaning |
|---|---|
| **Connection** | The user-facing name for a saved Geode endpoint. Includes DSN, optional saved username/password, optional TLS bundle, and a default flag. Not a user identity, not a preferences pack. |
| **Profile** | The internal storage name for the same thing. Appears in `internal/profilestore/`, the `/api/v1/profiles` route, and source types. Operators should not encounter this term in the UI. |
| **Active connection** | The in-memory `ConnectionRecord` (a JWT plus its `expiresAt`) for whichever connection the user is currently authenticated as. Surfaced in the connection switcher and via `useActiveConnection()`. |
| **Default connection** | A connection that has `is_default: true` in storage. The Login page pre-selects it, and the connection switcher shows it first. |

## The connection picker

Geode UI surfaces saved connections in two places:

- **Login picker** — on the Login screen, the picker lists every saved connection and pre-selects the default connection (the one whose stored record has `is_default: true`).
- **Connection switcher** — once you are signed in, the connection-switcher menu lets you change which Geode endpoint you are working against. The switcher shows the default connection first.

The picker label, the "Save password for this connection" option, and the **Add Connection** modal all use the user-facing "Connection" wording.

{{< callout type="tip" >}}
For the connection picker to be non-empty on first launch, at least one connection must be saved. When Geode UI is installed alongside the `geode` server, the postinstall step seeds one for you — see [Seeding the local-geode connection](#seeding-the-local-geode-connection).
{{< /callout >}}

## What a connection record contains

Each stored connection (profile) record carries the following fields in `internal/profilestore/store.go`:

| Field | Purpose |
|---|---|
| `name` | The connection's display name |
| `dsn` | The Geode data source name (for example `quic://127.0.0.1:3141`) |
| `description` | Optional human-readable description |
| `saved_username` | Optional username saved with the connection |
| `is_default` | Marks this connection as the default |
| `tls_*_pem` | Optional TLS material (PEM) for the connection |
| conn-pool sizing | Connection-pool sizing parameters for this connection |

## Connections defined at startup

In addition to records persisted in the profile store, Geode UI accepts a profile configuration file at startup with the `-profiles` flag.

| Flag | Default | Purpose |
|------|---------|---------|
| `-profiles` | (none) | Path to a JSON profile config. When omitted, the server defaults to a single `default` profile pointing at `quic://127.0.0.1:3141`. |

The JSON file is an array of profile objects. Each object requires a `name` and a `dsn`, and may include TLS material such as `tls_ca_file`:

```json
[
  { "name": "local", "dsn": "quic://127.0.0.1:3141" },
  { "name": "prod",  "dsn": "quic://geode-prod.internal:3141", "tls_ca_file": "/etc/certs/ca.pem" }
]
```

If you pass no `-profiles` file, Geode UI still has a usable target: a single `default` profile that points at `quic://127.0.0.1:3141`.

## Seeding the local-geode connection

When `geode-ui` is installed on a host that also has the `geode` server package, the postinstall step seeds a `local-geode` profile. This guarantees the SPA's connection picker is non-empty the first time you open the UI, so you can sign in immediately without manually adding a connection.

```bash
sudo apt install geode-ui              # headless service (systemd-managed)
sudo apt install geode-ui-desktop      # electron GUI (recommended on workstations)
```

The co-resident setup and full install paths are covered in [Installation](/docs/geode-ui/installation/).

{{< callout type="info" >}}
The seeded `local-geode` profile exists so first launch "just works" on a co-resident host. You can still add, edit, or remove connections afterward, and you can mark a different connection as the default.
{{< /callout >}}

## How the default connection behaves

A connection is the default when its stored record has `is_default: true`. That single flag drives two behaviors:

- The **Login page pre-selects** the default connection in the picker.
- The **connection switcher shows it first** in the list.

## The active connection

The connection you are currently authenticated against is the **active connection**. Internally it is represented by an in-memory `ConnectionRecord` that holds a JWT and its `expiresAt` value. The active connection is surfaced in the connection switcher and through the `useActiveConnection()` hook in the SPA.

This distinguishes the two in-memory and on-disk shapes:

- `ConnectionRecord` is the in-memory active-session shape (used by the renderer and the Electron bridge).
- `Profile` is the on-disk storage shape.

For details on how authentication tokens are issued and how their lifetime is bounded, see [Authentication & Security](/docs/geode-ui/authentication-and-security/).

## Fanning out to multiple Geode servers

Geode UI is a single Go binary that serves the SPA, the REST API, the WebSocket query channel, and the MCP transport. On the outbound side, the server connects to one or more Geode servers using the `geodedb.com/geode` driver, multiplexed through a **profile-aware connection pool** in `internal/conn`.

Because the pool is profile-aware, each saved connection maps to its own pooled set of driver connections. That is what lets a single Geode UI instance work against several Geode endpoints — for example a local development database and a production cluster — and switch between them via the connection switcher without restarting the server.

```text
            Geode UI (single Go binary)
                       |
        profile-aware connection pool (internal/conn)
           /            |              \
   local-geode        prod          another-endpoint
  quic://127.0.0.1   quic://...      quic://...
```

The connection-pool sizing parameters stored on each profile record govern the pool for that connection.

## Managing connections via the API

The same records are exposed on the wire under `/api/v1/profiles`. This route is part of the documented wire contract — it keeps the `profiles` name even though the UI calls the concept "connections" — so clients written against it remain stable. For the full route list and how to drive the UI programmatically, see [REST API, WebSocket & MCP](/docs/geode-ui/rest-api/).

{{< callout type="warning" >}}
A future major release *may* rename `internal/profilestore` to `internal/connectionstore` and `/api/v1/profiles` to `/api/v1/connections`. That would be a wire-breaking change and is explicitly out of scope today. Until then, scripts and integrations should continue to target `/api/v1/profiles`.
{{< /callout >}}

## Connections in the desktop application

In the desktop build (`geode-ui-desktop`), the same connection model applies. The active-session `ConnectionRecord` shape is shared between the renderer and the Electron bridge, so the connection switcher and saved connections behave the same way as in the headless service. See [Desktop Application](/docs/geode-ui/desktop-app/) for desktop-specific behavior.

## Related pages

- [Installation](/docs/geode-ui/installation/) — install paths and the `local-geode` seeding behavior on co-resident hosts.
- [Configuration](/docs/geode-ui/configuration/) — startup flags including `-profiles`.
- [Administration](/docs/geode-ui/administration/) — managing users, roles, policies, and grants on the connected Geode server.
- [Authentication & Security](/docs/geode-ui/authentication-and-security/) — how the active connection's JWT is issued and bounded.
- [REST API, WebSocket & MCP](/docs/geode-ui/rest-api/) — the `/api/v1/profiles` route and the rest of the wire contract.
