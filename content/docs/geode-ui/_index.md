---
title: "Geode UI"
description: "Geode UI is a self-contained Go binary that embeds a React SPA and exposes the Geode graph database over an HTTP/WebSocket/MCP API with a GQL editor, graph visualization, and admin tooling."
slug: "geode-ui"
url: "/docs/geode-ui/"
weight: 48
keywords:
  - Geode UI
  - graph database UI
  - GQL editor
  - graph visualization
  - geode-ui
  - geode-ui-desktop
  - Monaco GQL editor
  - MCP HTTP transport
tags: ["geode-ui", "ui", "visualization", "admin", "mcp"]
categories: ["Geode UI"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/geode-ui/"
---

Geode UI is a self-contained Go binary that embeds a React + TypeScript single-page application (SPA) and exposes the Geode graph database client surface as an HTTP/WebSocket API. It provides a Monaco-based GQL editor, an interactive Neo4j-style graph visualization, a schema explorer, a dashboard, and admin/ops interfaces for users, roles, policies, grants, backups, restores, migrations, and the audit log.

## Overview

Geode UI is for operators, analysts, and developers who want a browser- or desktop-based front end to a running Geode database. Instead of speaking the wire protocol directly, you sign in with your Geode credentials and the binary brokers your queries and admin operations to one or more upstream Geode servers.

Geode UI is the current product version {{< version "clients.ui" >}}.

{{< callout type="warning" title="Requires a running Geode server" >}}
Geode UI is a front end, not a database. It connects outbound to one or more Geode servers over the `geodedb.com/geode` driver (QUIC by default). You must have at least one reachable Geode server before Geode UI can authenticate or run queries. When installed alongside the `geode` package, the postinstall step seeds a `local-geode` profile so the connection picker is non-empty on first launch.
{{< /callout >}}

## Two packages

Geode UI ships as two Debian packages. Choose the one that fits your environment.

| Package | What it is | Best for |
|---|---|---|
| `geode-ui` | Headless Go binary, managed as a systemd service | Servers, shared deployments, behind a reverse proxy |
| `geode-ui-desktop` | Electron GUI wrapping the same SPA | Workstations and local interactive use |

```bash
sudo apt install geode-ui              # headless service (systemd-managed)
sudo apt install geode-ui-desktop      # electron GUI (recommended on workstations)
```

Both packages serve the identical embedded SPA and API surface; the difference is how the binary is launched and presented. See [Installation](/docs/geode-ui/installation/) for the full set of install paths and [Desktop Application](/docs/geode-ui/desktop-app/) for the Electron client.

## Architecture

Geode UI is a single Go binary. Inbound, it serves several routes; outbound, it fans out to your Geode servers.

### Inbound routes

| Route | Purpose |
|---|---|
| `/` | The embedded React SPA, served from `go:embed dist/` |
| `/api/v1/...` | Generated REST handlers |
| `/ws/query` | Streaming GQL query over WebSocket |
| `/mcp` | MCP (Model Context Protocol) HTTP transport |
| `/healthz` | Liveness check |

### Outbound connections

The server connects to one or more Geode servers via the `geodedb.com/geode` driver (QUIC default, gRPC fallback, mTLS), multiplexed through a profile-aware connection pool. Each request carries a JWT whose `profile` claim selects which upstream pool DSN the handler uses, so a single Geode UI instance can broker connections to multiple Geode servers.

```text
Browser / Electron SPA
   │  HTTP / WebSocket
   ▼
geode-ui (single Go binary)
   ├─ /              → embedded React SPA
   ├─ /api/v1/...    → REST handlers
   ├─ /ws/query      → streaming GQL (WebSocket)
   ├─ /mcp           → MCP HTTP transport
   └─ /healthz       → liveness
   │  geodedb.com/geode driver (QUIC default, gRPC fallback, mTLS)
   ▼
one or more Geode servers (profile-aware connection pool)
```

### Authentication

Sign-in happens at `POST /api/v1/auth/login`, which authenticates against the named upstream Geode profile using your credentials and issues an HS256-signed JWT. Subsequent requests carry the token as `Authorization: Bearer <token>`; WebSocket clients that cannot set that header may fall back to `?access_token=<token>` on the URL. The HS256 secret is supplied at startup via `-jwt-secret-hex` and the binary refuses to start without it. See [Authentication & Security](/docs/geode-ui/authentication-and-security/) for the full flow.

## Feature highlights

- **Monaco GQL editor** — write and run GQL with the embedded Monaco editor, including a single-pane query editor route (`/`).
- **Multiple result views** — every editor result panel offers a Table / JSON / Graph / Matrix tab switcher; the Matrix view renders scalar-projection results (for example `RETURN n.name, n.age`) as a sortable matrix.
- **Neo4j-style graph visualization** — interactive, Cytoscape-backed graph rendering of query results.
- **Schema explorer** — browse graphs, labels, and edges, with stage-and-go into the editor.
- **Dashboard** — overview cards for graphs, recent queries, connection status, and on-demand graph stats at `/dashboard`.
- **Query history** — a persisted FIFO history (capped at 20 entries) backs the dashboard's recent-queries card and lets you prefill the editor from a past statement.
- **Streaming queries** — large result sets stream over the WebSocket query channel so first rows arrive before the full set completes.
- **Admin & ops UIs** — manage users, roles, policies, grants, backups, restores, migrations, and the audit log. Admin write affordances are gated by the upstream capability probe (`GET /api/v1/capabilities`); on older engines, unsupported actions render disabled with an inline "not supported" note instead of failing.
- **Connection profiles** — switch between configured Geode servers from the SPA's connection picker.
- **Metrics dashboard** — the dashboard polls a JWT-gated upstream metrics proxy at `GET /api/v1/metrics`.
- **MCP HTTP transport** — exposes a `/mcp` endpoint with a `query` tool for Model Context Protocol clients.
- **Desktop app** — an Electron build (`geode-ui-desktop`) wraps the same SPA for workstation use.

## Tech stack

| Component | Version |
|---|---|
| Product version | {{< version "clients.ui" >}} |
| Go (server) | 1.26.3 |
| Node.js (build) | 22.14.0+ |
| React | 18.2.0 |
| Electron (desktop) | 42.0.1 |

The server is licensed under the Apache License 2.0. The SPA is built with React, TypeScript, styled-components, and Webpack; the GQL editor uses Monaco, and graph visualization uses Cytoscape.

## In this section

- **[Overview](/docs/geode-ui/)** — this page: what Geode UI is, the two packages, and the architecture.
- **[Installation](/docs/geode-ui/installation/)** — install the `geode-ui` service or `geode-ui-desktop` GUI and bootstrap your first connection.
- **[Quick Start](/docs/geode-ui/quick-start/)** — generate a JWT secret, launch the binary against a local Geode, and run your first query.
- **[Configuration](/docs/geode-ui/configuration/)** — startup flags, the JWT secret, TTL bounds, and the profiles JSON file.
- **[Query Editor & Visualization](/docs/geode-ui/query-editor/)** — the Monaco GQL editor, result views (Table / JSON / Graph / Matrix), graph rendering, and query history.
- **[Connections & Profiles](/docs/geode-ui/connections-and-profiles/)** — defining connection profiles and switching between Geode servers.
- **[Cluster Monitoring](/docs/geode-ui/cluster-monitoring/)** — the dashboard, metrics proxy, and connection-status views.
- **[Administration](/docs/geode-ui/administration/)** — managing users, roles, policies, grants, backups, restores, and migrations.
- **[REST API, WebSocket & MCP](/docs/geode-ui/rest-api/)** — the `/api/v1/...` REST surface, the `/ws/query` streaming channel, and the `/mcp` HTTP transport.
- **[Authentication & Security](/docs/geode-ui/authentication-and-security/)** — login flow, JWT issuance, rate limiting, and proxy/XFF handling.
- **[Desktop Application](/docs/geode-ui/desktop-app/)** — the `geode-ui-desktop` Electron client.
- **[Operations & Troubleshooting](/docs/geode-ui/operations/)** — running the service, observability, and common issues.

## Next steps

- New to Geode UI? Start with [Installation](/docs/geode-ui/installation/), then the [Quick Start](/docs/geode-ui/quick-start/).
- Already running a Geode server? Jump straight to [Configuration](/docs/geode-ui/configuration/) to point Geode UI at it.
- Prefer to connect from your own code instead? See the [Client Libraries](/docs/client-libraries/).
