---
title: "Query Editor & Visualization"
description: "Run GQL in the Geode UI Monaco editor, switch between Table, JSON, Graph, and Matrix result views, stream large result sets over WebSocket, and explore your schema."
summary: "A guide to the Geode UI single-pane query editor, its Table/JSON/Graph/Matrix result views, schema explorer, persisted query history, and WebSocket result streaming."
slug: "query-editor"
url: "/docs/geode-ui/query-editor/"
date: 2026-06-01
lastmod: 2026-06-01
draft: false
weight: 40
keywords: ["geode ui query editor", "monaco gql editor", "graph visualization", "result matrix view", "query history", "websocket streaming", "schema explorer"]
tags: ["geode-ui", "query-editor", "visualization", "gql"]
categories: ["Geode UI"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/geode-ui/query-editor/"
---

The Geode UI ({{< version "clients.ui" >}}) gives you an interactive, browser-based workspace for writing and running GQL against a Geode graph database. At its center is a Monaco-based GQL editor with a result panel that can render the same result set as a table, raw JSON, an interactive graph, or a sortable matrix. This page covers the editor, the result views, the schema explorer, the dashboard, and the query history that ties them together.

## Overview

The single-page application (SPA) embedded in the Geode UI binary exposes two top-level routes:

- **`/`** — the single-pane query editor. This is the primary workspace: you write a GQL statement in the Monaco editor and run it against the connected profile, then inspect the results in the tabbed result panel.
- **`/dashboard`** — an overview surface with cards for graphs, recent queries, connection status, and on-demand graph statistics.

Both surfaces are served by the same Go binary from an embedded React 18 + TypeScript build, so there is nothing extra to deploy beyond the Geode UI service itself. For how to install and start the service, see [Installation](/docs/geode-ui/installation/) and [Quick Start](/docs/geode-ui/quick-start/).

{{< callout type="note" >}}
The editor runs every query against the connection profile selected in the connection picker. If you have more than one Geode server configured, switch profiles before running a query. See [Connections & Profiles](/docs/geode-ui/connections-and-profiles/) for how profiles are defined and selected.
{{< /callout >}}

## The Monaco GQL editor

The query editor is built on Monaco — the same editor core that powers VS Code. You type a GQL statement, then run it against the upstream Geode server selected in the connection picker.

```gql
MATCH (p:Person)-[:ACTED_IN]->(m:Movie)
RETURN p.name, m.title
```

When a query succeeds, the result panel below the editor populates with the returned rows. When a query fails, the editor surface shows an error banner describing the failure instead of result rows, so you can correct the statement and re-run it.

The editor supports both a synchronous run path and a streaming run path:

- **Synchronous** queries return the full result set in a single response and are well suited to small, bounded result sets.
- **Streaming** queries deliver rows incrementally over a WebSocket connection and can be cancelled mid-flight. Streaming is the right choice for large result sets — see [WebSocket streaming for large result sets](#websocket-streaming-for-large-result-sets) below.

## Result views: Table, JSON, Graph, and Matrix

Every editor surface presents its results through a tab switcher offering four views of the same result set: **Table**, **JSON**, **Graph**, and **Matrix**. Switching tabs re-renders the current results in the chosen view without re-running the query.

{{< tabs >}}
{{< tab "Table" >}}
The **Table** view renders result rows in a virtualized data grid. It is the default tabular presentation for row-shaped results and is built for accessibility, exposing `grid`, `row`, `columnheader`, and `cell` roles to assistive technology.
{{< /tab >}}
{{< tab "JSON" >}}
The **JSON** view shows the raw JSON of the result set with syntax highlighting. Use it when you need to see the exact structure and types behind a result — for example when debugging a query or copying values out of the response.
{{< /tab >}}
{{< tab "Graph" >}}
The **Graph** view is a Neo4j-style interactive graph visualization. Nodes and relationships from the result set are rendered on a canvas you can pan and explore, with a sidebar of display controls (such as label and edge-type selectors). The graph is laid out once per completed query rather than per incremental row batch.
{{< /tab >}}
{{< tab "Matrix" >}}
The **Matrix** view renders scalar-projection results — queries that return scalar values such as `RETURN n.name, n.age` — as a sortable matrix. Use it when your `RETURN` clause projects individual properties rather than whole nodes or relationships, and you want to sort and scan the projected columns.
{{< /tab >}}
{{< /tabs >}}

{{< callout type="tip" title="Pick the view to match your RETURN clause" >}}
A query that returns whole nodes and relationships (for example `MATCH (a)-[r]->(b) RETURN a, r, b`) is a natural fit for the **Graph** view, while a query that projects scalar properties (for example `RETURN n.name, n.age`) is best read in the **Matrix** view. The **Table** and **JSON** views work for any result shape.
{{< /callout >}}

### Graph visualization

The Graph view renders the nodes and edges in your result set as an interactive canvas. The visualization is designed to stay responsive on larger result sets, performing a single layout pass per completed query rather than re-laying-out on each batch of streamed rows. When a query returns no graph elements, the Graph view shows an empty state rather than a blank canvas.

## Schema explorer

The schema explorer lets you browse the structure of the connected graph — its graphs, node labels, and edge types — so you can discover what is available to query without writing exploratory statements first. It supports a "stage-and-go" workflow: you can select an element from the schema and use it to seed a query in the editor.

{{< callout type="note" >}}
The exact set of schema elements you see reflects the graph you are connected to through the active profile. Connect to the profile that points at the database you want to explore before opening the schema explorer.
{{< /callout >}}

## The dashboard

The `/dashboard` route is an at-a-glance overview built from a set of cards:

- **Graphs** — the graphs available on the connected server.
- **Recent queries** — your most recent statements, backed by the persisted query history (see below). Clicking an entry prefills the editor with that statement.
- **Connection status** — the state of the connection to the upstream Geode server.
- **Graph statistics** — graph stats fetched on demand.

The dashboard is a complement to the editor: use it to orient yourself and jump back into recent work, then switch to the `/` route to run queries.

## Query history

The Geode UI keeps a persisted, first-in-first-out (FIFO) query history. It is **capped at 20 entries** and stored in the browser's `localStorage`, managed by the `useQueryHistory` hook. Because it lives in `localStorage`, the history is per-browser and survives page reloads.

The query history serves two purposes:

1. It backs the dashboard's **recent queries** card.
2. It enables **click-to-prefill** — selecting a past statement drops it back into the editor so you can re-run or tweak it without retyping.

{{< callout type="warning" >}}
Query history is stored locally in your browser via `localStorage` and is capped at the 20 most recent entries. It is not a server-side audit trail, and older statements are evicted as new ones arrive. For a durable, server-side record of administrative and query activity, use the audit log surfaces described in [Administration](/docs/geode-ui/administration/).
{{< /callout >}}

## WebSocket streaming for large result sets

For large result sets, the Geode UI streams results over a WebSocket rather than returning them in a single synchronous response. The streaming query channel is exposed at **`/ws/query`**, served by the same Geode UI binary.

Streaming has two practical advantages for big queries:

- **Incremental delivery** — rows arrive as they are produced upstream, so you begin seeing results before the full set has been computed.
- **Cancellation** — a streaming query can be cancelled mid-flight from the editor, so you are not forced to wait for an oversized result to finish.

WebSocket clients authenticate with the same JWT used by the REST API. Clients that can set headers send the token as an `Authorization: Bearer <token>` header on the upgrade; clients that cannot set the Authorization header on the upgrade can fall back to passing the token as an `?access_token=<token>` query parameter on the `/ws/query` URL.

{{< callout type="info" >}}
The full `/ws/query` protocol, the REST query endpoints, and the MCP transport are documented together in [REST API, WebSocket & MCP](/docs/geode-ui/rest-api/). The token used to authenticate WebSocket connections is the same one issued at login — see [Authentication & Security](/docs/geode-ui/authentication-and-security/).
{{< /callout >}}

## Related pages

- [Connections & Profiles](/docs/geode-ui/connections-and-profiles/) — define and select the Geode server your queries run against.
- [REST API, WebSocket & MCP](/docs/geode-ui/rest-api/) — the `/ws/query` streaming protocol and the rest of the API surface.
- [Authentication & Security](/docs/geode-ui/authentication-and-security/) — how login issues the token used by the editor and WebSocket channel.
- [Cluster Monitoring](/docs/geode-ui/cluster-monitoring/) — the metrics-driven monitoring view.
- [Administration](/docs/geode-ui/administration/) — users, roles, grants, and the server-side audit log.
