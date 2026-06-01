---
title: "Geode UI Quick Start"
description: "Get Geode UI running in minutes: generate a JWT secret, start the server against a local Geode, sign in with your credentials, and run your first GQL query."
summary: "A fast, task-oriented guide to launching Geode UI, signing in, and running your first GQL query."
slug: "quick-start"
url: "/docs/geode-ui/quick-start/"
date: 2026-06-01
lastmod: 2026-06-01
draft: false
weight: 20
keywords: ["geode ui quick start", "geode ui getting started", "jwt secret", "gql query editor", "geode graph database ui", "quic 3141"]
tags: ["geode-ui", "quick-start", "getting-started", "gql"]
categories: ["Geode UI"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/geode-ui/quick-start/"
---

This guide takes you from a freshly built or installed Geode UI binary to your first GQL query in a few commands. It assumes you already have a Geode server running and reachable.

## Overview

Geode UI is a self-contained Go binary that serves an embedded React SPA and exposes the Geode graph database over an HTTP/WebSocket API. To get started you need three things:

1. A running Geode server (the UI connects out to it).
2. A JWT secret the server uses to sign session tokens.
3. The `geode-ui` binary, started with a listen address and that secret.

Once the server is up, you open the SPA in your browser, sign in with your Geode credentials, and start querying.

{{< callout type="info" >}}
This page covers the **headless server** workflow you run yourself (built binary or systemd service). If you would rather install from packages, see [Installation](/docs/geode-ui/installation/). If you want the GUI wrapper, see the [Desktop Application](/docs/geode-ui/desktop-app/) guide.
{{< /callout >}}

## Prerequisites

- **A running Geode server.** By default Geode UI connects to a local Geode at `quic://127.0.0.1:3141`. If your Geode lives elsewhere, you will point the UI at it with a profile (see [Connections & Profiles](/docs/geode-ui/connections-and-profiles/)).
- **Geode credentials.** You sign in to the UI with the same username and password you use for the Geode database itself.
- **The `geode-ui` binary.** Either build it from source (Go 1.26.3 + Node 22.14+) or install the package. To build:

```bash
make build
```

The build produces the binary at `./bin/geode-ui`.

## Step 1 — Generate a JWT secret

Geode UI signs session tokens with an HS256 secret that you supply as a hex string. Generate one with `openssl`:

```bash
SECRET=$(openssl rand -hex 32)
```

{{< callout type="warning" >}}
The secret must be hex-encoded and at least 32 bytes. The `-jwt-secret-hex` flag is **required** — the server will not start without it. Keep the value private; anyone with it can mint valid session tokens.
{{< /callout >}}

## Step 2 — Run the server

Start `geode-ui`, telling it which address to listen on and passing the secret you just generated. With no profile configured, the server defaults to a single `default` profile pointing at `quic://127.0.0.1:3141`:

```bash
./bin/geode-ui -listen :8080 -jwt-secret-hex "$SECRET"
```

That is the whole command for a local setup. The two flags do the following:

| Flag | Value above | Purpose |
|------|-------------|---------|
| `-listen` | `:8080` | HTTP listen address (default `:8080`). |
| `-jwt-secret-hex` | `"$SECRET"` | Hex-encoded HS256 secret, ≥32 bytes (required). |

For the full flag reference — including `-jwt-ttl`, `-profiles`, and `-trust-proxy-xff` — see [Configuration](/docs/geode-ui/configuration/).

{{< callout type="tip" >}}
If you installed the `geode-ui` package as a systemd service, it is already running and listening on `127.0.0.1:8080` by default — you can skip straight to Step 3. Manage it with `systemctl status geode-ui.service`. See [Installation](/docs/geode-ui/installation/) for the service workflow.
{{< /callout >}}

## Step 3 — Open the SPA

With the server running, open the UI in your browser:

```text
http://localhost:8080
```

You can confirm the server is healthy at any time by hitting the liveness endpoint:

```bash
curl http://127.0.0.1:8080/api/v1/healthz
```

## Step 4 — Sign in

On the login screen, sign in with your **Geode credentials** — the same username and password you use for the Geode database. The UI authenticates against the Geode server you are connected to and stores a signed session token in your browser.

If more than one connection profile is configured, a connection picker lets you choose which Geode server to sign in against before authenticating. When Geode UI is installed alongside `geode` on the same host, the package postinstall seeds a `local-geode` profile so the picker is populated out of the box. See [Connections & Profiles](/docs/geode-ui/connections-and-profiles/) for managing multiple servers.

## Step 5 — Run your first query

After signing in you land on the single-pane query editor, a Monaco-based GQL editor. Type a query and run it. A simple one to start with:

```gql
MATCH (n)
RETURN n
LIMIT 25
```

The result panel offers a **Table / JSON / Graph / Matrix** tab switcher for the same result set:

- **Graph** renders nodes and relationships in an interactive, Neo4j-style canvas.
- **Table** shows tabular rows.
- **JSON** shows the raw result payload.
- **Matrix** renders scalar-projection results — for example `RETURN n.name, n.age` — as a sortable matrix.

To try the Matrix view, run a scalar projection:

```gql
MATCH (n)
RETURN n.name, n.age
```

{{< callout type="note" >}}
Geode UI streams query results over a WebSocket channel, so long-running queries return rows incrementally and can be cancelled mid-flight from the editor.
{{< /callout >}}

Every statement you run is added to a persisted **query history** (a FIFO list capped at 20 entries, stored in your browser). Click a past statement to prefill the editor with it. For the full editor and visualization tour, see [Query Editor & Visualization](/docs/geode-ui/query-editor/).

## Step 6 — Explore the dashboard

The SPA has two top-level routes:

- `/` — the single-pane query editor.
- `/dashboard` — an overview with cards for graphs, recent queries, connection status, and on-demand graph stats.

Open the dashboard to see the connection you are signed in to, your recent queries (backed by the same query history as the editor), and graph statistics you can fetch on demand. Clicking a recent query prefills the editor so you can re-run or tweak it.

## Next steps

You now have a running Geode UI, an authenticated session, and your first queries behind you. From here:

- [Configuration](/docs/geode-ui/configuration/) — every server flag, JWT TTL, profile JSON, and the `-trust-proxy-xff` security note.
- [Connections & Profiles](/docs/geode-ui/connections-and-profiles/) — point the UI at one or more Geode servers and manage profiles.
- [Query Editor & Visualization](/docs/geode-ui/query-editor/) — the Monaco GQL editor, result tabs, graph canvas, and query history in depth.
- [Installation](/docs/geode-ui/installation/) — package install, systemd service, and co-resident setup with `geode`.
