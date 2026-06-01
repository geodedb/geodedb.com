---
title: "Cluster Monitoring"
description: "Monitor a Geode Raft cluster from Geode UI: the live /cluster page, the members table with leader and freshness affordances, the topbar role chip, and the dashboard card."
summary: "Watch Geode Raft cluster membership in real time with the Geode UI cluster page, members table, topbar role chip, and dashboard cards."
slug: "cluster-monitoring"
url: "/docs/geode-ui/cluster-monitoring/"
date: 2026-06-01
lastmod: 2026-06-01
draft: false
weight: 60
keywords: ["geode cluster monitoring", "raft cluster", "cluster members", "leader election", "geode ui", "SHOW CLUSTER STATUS", "node freshness"]
tags: ["geode-ui", "cluster", "monitoring", "raft", "operations"]
categories: ["Geode UI"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/geode-ui/cluster-monitoring/"
---

Geode UI surfaces the live membership of a Geode Raft cluster across several places in the interface: a dedicated `/cluster` page, an ambient role chip in the top navigation, and rows on the dashboard. This page documents each of those surfaces, what they show, and how they refresh.

## Overview

When the Geode instance you are connected to participates in a Raft cluster, Geode UI polls the server for cluster state and renders it across three surfaces:

- The **`/cluster` page** — a full membership table with self, leader, and contact-freshness affordances, plus a manual refresh control.
- The **topbar cluster role chip** — a small linked badge that shows your node's current role and links to the `/cluster` page.
- The **dashboard** — a Cluster card and a single-line cluster row on the Connection card.

All three are driven by the same underlying query and data model. When the connected instance is **not** clustered (standalone mode), the topbar chip and the dashboard Cluster card hide themselves entirely, and the `/cluster` page shows a standalone fallback panel instead of a members table.

{{< callout type="note" >}}
Cluster monitoring follows the connection you are actively using. If you switch connections in the connection picker, polling stops against the old connection and restarts against the new one. If there is no active connection (for example, mid-onboarding), polling is suppressed and the cluster surfaces stay empty. See [Connections & Profiles](/docs/geode-ui/connections-and-profiles/).
{{< /callout >}}

## How cluster state is fetched

Geode UI retrieves cluster state by submitting the GQL statement `SHOW CLUSTER STATUS` over the streaming WebSocket transport. The executor returns one row per cluster member with the columns:

```text
node_id, role, term, leader_id, endpoint, last_contact_ms
```

In standalone mode the server returns exactly one row with `role='standalone'`, so the UI always receives a non-empty result set. The server emits the connected node ("self") as row 0; Geode UI uses that to highlight your own node in the membership views.

Each member is normalized into the following fields:

| Field | Source column | Meaning |
|---|---|---|
| Node | `node_id` | Numeric node identifier |
| Role | `role` | One of `standalone`, `leader`, `follower`, `candidate`, `shutdown`, or `unknown` |
| Term | `term` | Current Raft term as known by that member |
| Leader | `leader_id` | The leader node this member recognizes (`0` renders as `—`) |
| Endpoint | `endpoint` | The member's address (for example `address:port`) |
| Last contact | `last_contact_ms` | Milliseconds since the last successful contact with that peer |

Malformed rows (wrong column count or an unusable `node_id`) are dropped silently, so a single bad row never breaks the views.

### Standalone vs. cluster mode

Geode UI decides whether the backend is clustered as follows:

- An empty result is treated as **not a cluster**.
- More than one member row means a **cluster** is wired.
- A single row is a cluster only if its role is **not** `standalone`.

When the result indicates standalone mode, the topbar chip and the dashboard Cluster card return nothing, and the `/cluster` page renders the standalone fallback.

## The cluster page (`/cluster`)

The `/cluster` page is the full Raft cluster view. It is reachable from the **Cluster** entry in the navigation and from the topbar role chip. The page polls cluster status every **5 seconds** — a faster cadence than the other surfaces so an operator watching an election sees fresher state.

The page header shows the title and the subtitle *"Live Raft cluster membership for the connected Geode instance."* It also shows a **Last updated** timestamp and a **Refresh** button.

### Manual refresh

The **Refresh** button forces an immediate poll so you can pull fresh state without waiting for the next 5-second tick. While a refresh is in flight the button is disabled and shows *"Refreshing…"*. Errors from a manual refresh surface in the page body rather than as a separate alert.

### Page states

The page body branches on the current data:

- **Loading** — before the first successful poll, a status panel shows *"Loading cluster status…"*.
- **Error** — if the first poll fails, an error panel shows *"Cluster status unavailable"* with the server's error message.
- **Standalone** — if the connected instance is not clustered, a panel titled *"Standalone instance"* explains: *"This Geode instance is not part of a Raft cluster. Start Geode with --cluster-port and --peers (or set GEODE_CLUSTER_TOKEN) to enable distributed mode."*
- **Cluster** — otherwise, a **Members** heading and the members table are rendered.

{{< callout type="info" >}}
Once a snapshot has been loaded, a later failed poll does not blank the page — the last good membership stays visible while the UI retries on the next tick.
{{< /callout >}}

## The members table

When a cluster is detected, the `/cluster` page renders a table of members with six columns: **Node**, **Role**, **Term**, **Leader**, **Endpoint**, and **Last contact**. Each row corresponds to one cluster member.

### Self and leader affordances

- **This node** — your own node (the "self" row) is marked with a *"this node"* badge in the Node cell.
- **Leader** — the leader row is accented with a colored left border on the Node cell, so you can spot the leader without scanning the Role column.
- **Role badge** — the Role column shows a colored badge per role. Leader, candidate, and shutdown roles use distinct colors (success, warning, and danger respectively); other roles use a neutral fill.
- **Leader column** — shows the leader node id each member recognizes; a value of `0` renders as `—` (no leader).

### Last-contact freshness

The **Last contact** column renders `last_contact_ms` in operator-friendly units and pairs it with a freshness badge. The duration is formatted as:

| Value | Rendered as |
|---|---|
| `0` or non-finite | `—` |
| under 1 second | milliseconds (e.g. `850 ms`) |
| 1–60 seconds | seconds to one decimal (e.g. `4.2 s`) |
| 1–60 minutes | minutes to one decimal (e.g. `2.5 m`) |
| 1 hour or more | hours to one decimal (e.g. `1.3 h`) |

Negative values (which can occur if the server clock jumps backward between probes) are clamped so the table never shows a confusing negative duration.

The freshness classifier groups each member into one of four states:

| Freshness | Threshold | Meaning |
|---|---|---|
| **self** | `last_contact_ms` is `0` or non-finite | This is your own node; no freshness badge is shown |
| **fresh** | under 2 seconds | Contacted within the normal heartbeat window |
| **stale** | 2–30 seconds | A transient blip; shown with a warning badge |
| **lost** | 30 seconds or more | Likely partitioned or down; the row is dimmed and shown with a danger badge |

{{< callout type="warning" >}}
A member in the **lost** state has had no successful contact for at least 30 seconds, which roughly corresponds to the leader-election timeout window. Treat lost members as candidates for investigation — the node may be partitioned, overloaded, or down.
{{< /callout >}}

## The topbar cluster role chip

The cluster role chip is an ambient indicator in the top navigation. It polls cluster status every **30 seconds** — a looser cadence than the dashboard card (10 seconds) and the `/cluster` page (5 seconds), because a role that is stale by a few seconds is acceptable for an ambient badge.

Behavior:

- In **standalone mode** the chip renders nothing, so single-node operators never see an inert badge.
- In **cluster mode** the chip shows your node's current role as a small colored badge and links to `/cluster` on click.
- The displayed role is derived from your own node in the membership list. If your node id is briefly missing from the snapshot (a race between a membership change and the poll), the chip falls through to **Unknown** rather than disappearing — keeping the chip visible signals "this is a cluster; we just don't know our own role yet."

The chip's colors mirror the dashboard role badge palette so the two stay visually consistent.

## Dashboard surfaces

The [dashboard](/docs/geode-ui/) polls cluster status (at the default cadence) and threads the result into two cards.

### Cluster card

The dashboard **Cluster** card shows your node's role, term, leader, and member count when the connected instance is part of a Raft cluster:

- **Role** — your node's role, as a colored badge.
- **Term** — the current Raft term as known by your node.
- **Leader** — either *"no leader elected"* (when `leader_id` is `0`) or the leader node id. When the leader is your own node, *"(this node)"* is appended.
- **Members** — the total number of members in the cluster.

While the first poll is in flight the card shows *"Loading cluster status…"*; if the first poll fails it shows *"Cluster status unavailable: …"* with the error. In **standalone mode the card renders nothing**, so single-node operators don't see a perpetually static panel.

### Connection card cluster row

The dashboard **Connection** card normally shows the connected Geode version and which admin DDL families are writable. When the connected instance is clustered, the card appends a single line at the bottom:

```text
Cluster        N nodes — Role
```

where `N` is the member count and `Role` is your node's role. For standalone or non-cluster snapshots this row is hidden entirely, so single-node operators don't see an inert row. See [Administration](/docs/geode-ui/administration/) for more on the admin-capability badges shown on this card.

## Polling cadence summary

The same data model backs every surface, but each polls at a cadence suited to its purpose:

| Surface | Poll interval | Notes |
|---|---|---|
| `/cluster` page | 5 seconds | Fresher view for watching an election; manual **Refresh** forces an immediate poll |
| Dashboard cards | 10 seconds (default) | Cluster card and Connection card cluster row |
| Topbar role chip | 30 seconds | Ambient indicator; hidden in standalone mode |

Polling runs only while the relevant view is mounted and there is an active connection. It stops on unmount, stops and restarts on a connection change, and is suppressed entirely when there is no active connection.

## Troubleshooting

**The cluster page shows "Standalone instance" but I expected a cluster.**
The connected Geode instance reported standalone mode (a single `standalone` row from `SHOW CLUSTER STATUS`). The fallback panel notes that distributed mode is enabled by starting Geode with `--cluster-port` and `--peers` (or by setting `GEODE_CLUSTER_TOKEN`). Confirm you are connected to the right instance in the connection picker.

**The cluster page shows "Cluster status unavailable".**
The first `SHOW CLUSTER STATUS` poll failed; the panel includes the server's error message. Verify the connection is healthy and that the server supports the statement, then use **Refresh** to retry.

**The topbar chip or dashboard Cluster card isn't visible.**
Both hide themselves in standalone mode by design. If you are connected to a clustered instance and still don't see them, check that you have an active connection and that the cluster status poll is succeeding (the `/cluster` page will show the error if it is not).

**A member shows as "lost".**
That member has had no successful contact for 30 seconds or more. Investigate whether the node is partitioned, overloaded, or down. See [Operations & Troubleshooting](/docs/geode-ui/operations/) for broader diagnostics.

## See also

- [Administration](/docs/geode-ui/administration/) — users, roles, policies, grants, and the admin-capability badges
- [Operations & Troubleshooting](/docs/geode-ui/operations/) — diagnostics and runbooks
- [Connections & Profiles](/docs/geode-ui/connections-and-profiles/) — how the active connection drives cluster polling
- [Geode UI Overview](/docs/geode-ui/) — the dashboard and the rest of the product surface
