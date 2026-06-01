---
title: "Administration"
description: "Manage Geode UI users, roles, grants, RLS policies, backups, restores, migrations, and the audit log from the admin and ops screens. Requires the admin role."
summary: "Administer users, RBAC roles and grants, row-level security policies, backups, restores, migrations, and the audit log from the Geode UI admin and ops surfaces."
slug: "administration"
url: "/docs/geode-ui/administration/"
date: 2026-06-01
lastmod: 2026-06-01
draft: false
weight: 70
keywords: ["geode ui administration", "rbac", "roles", "grants", "row-level security", "rls policies", "backups", "restore", "migrations", "audit log", "user management"]
tags: ["geode-ui", "administration", "rbac", "security", "operations"]
categories: ["Geode UI"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/geode-ui/administration/"
---

The Geode UI bundles a set of administration and operations screens that expose the Geode graph database's policy and lifecycle primitives. From the admin surfaces you create and manage users, define RBAC roles and graph-level grants, write row-level security (RLS) policies, take and restore backups, run migrations, and inspect the audit log.

## Overview

The admin and ops screens are backed by REST endpoints under `/api/v1/`. Every write-capable admin endpoint requires the **`admin`** role on the calling user's JWT, and many capabilities are additionally gated on the version of the upstream Geode server you are connected to. The UI probes the server through `GET /api/v1/capabilities` and disables affordances that the connected engine does not support, surfacing an inline "not supported" note rather than failing outright.

For how authentication, JWTs, and the `admin` role interact with these screens, see [Authentication & Security](/docs/geode-ui/authentication-and-security/). For the raw HTTP contract behind each screen, see [REST API, WebSocket & MCP](/docs/geode-ui/rest-api/).

{{< callout type="info" title="Required role" >}}
All admin write actions (users, roles, policies, grants, backups, restore, migrations, audit) require the `admin` role. The endpoints carry `required_roles: ["admin"]` in the API contract, so a non-admin JWT is rejected before reaching the upstream database.
{{< /callout >}}

### Capabilities gating

`GET /api/v1/capabilities` returns the connected Geode server version and an `admin_writable` map describing which admin areas the engine can write:

```json
{
  "geode_version": "...",
  "admin_writable": {
    "users": true,
    "roles": true,
    "policies": true,
    "grants": true
  },
  "metrics_enabled": true
}
```

The SPA reads this map to decide whether a given tab or action is enabled. On engines that do not support a particular admin area, the corresponding action is disabled and carries a tooltip pointing at the version requirement.

{{< callout type="note" >}}
Admin DDL, role, and grant management require Geode v0.5.15 or newer. Older engines render the admin write affordances disabled with an inline "not supported" note while read-only query flows continue to work. The RLS attribute and deny-policy surfaces and per-user attributes require Geode v0.5.20 or newer.
{{< /callout >}}

## Users

The Users screen (`/admin/users`) lists every account on the connected server and lets administrators create, inspect, update, enable/disable, and delete users, manage role assignments, and edit per-user attributes.

### List and inspect users

`GET /api/v1/users` returns the user list. Each user record carries:

| Field | Meaning |
|---|---|
| `username` | Account login name |
| `email` | Account email |
| `roles` | Assigned RBAC roles |
| `disabled` | Whether the account is disabled |
| `mfa_enrolled` | Whether the account has enrolled in MFA |

To inspect a single account, the UI calls `GET /api/v1/users/{username}`. The effective permissions for an account are available from `GET /api/v1/users/{username}/permissions`.

### Create a user

Creating a user issues `POST /api/v1/users`. The request requires a `username` and `email`, and optionally accepts a `password` and an initial set of `roles`:

```json
{
  "username": "analyst",
  "email": "analyst@example.com",
  "password": "...",
  "roles": ["reader"]
}
```

### Update, enable, disable, and delete

| Action | Endpoint |
|---|---|
| Update a user (email, password, roles) | `PATCH /api/v1/users/{username}` |
| Disable an account | `POST /api/v1/users/{username}/disable` |
| Re-enable an account | `POST /api/v1/users/{username}/enable` |
| Delete an account | `DELETE /api/v1/users/{username}` |
| Assign a role | `POST /api/v1/users/{username}/roles` |

Disable and enable flip the account's `disabled` flag without removing the user, which is useful for temporarily suspending access. Deleting a user removes the account entirely.

{{< callout type="note" title="Password changes" >}}
The password-change endpoint, `POST /api/v1/users/{username}/password`, does not carry the `admin` role requirement — it accepts the current `old_password` and a `new_password` (minimum 8 characters), so users can rotate their own credentials.
{{< /callout >}}

### Per-user attributes (ABAC)

Each user can hold arbitrary key/value attributes (for example `department`, `region`, `level`) that attribute-based RLS policies consume at query time. Attributes are managed via the **Attributes** button on each row of `/admin/users`; the per-user editor lets you add and remove key/value pairs.

Attribute keys must match the GQL identifier shape `[A-Za-z_][A-Za-z0-9_]*`. The UI validates this client-side before issuing the wire call. Under the hood, the editor calls these backend procedures:

- `geode.auth.user_set_attribute(username, key, value)`
- `geode.auth.user_remove_attribute(username, key)`
- `geode.auth.user_list_attributes(username)` — optional; when this procedure is unimplemented on the connected build, the UI falls back to an in-session mirror.

Per-user attributes require Geode v0.5.20 or newer. `GET /api/v1/capabilities` reports `admin_writable.attributes` so the UI can disable the editor on older builds.

## Roles & Grants

RBAC roles and graph-level grants are managed from the roles and grants screens. Both require the `admin` role and are gated on `admin_writable.roles` and `admin_writable.grants`.

### Roles

A role groups a set of permissions and can be assigned to users. Role records carry a `name`, an optional `description`, and a list of `permissions`.

| Action | Endpoint |
|---|---|
| List roles | `GET /api/v1/roles` |
| Create a role | `POST /api/v1/roles` |
| Inspect a role | `GET /api/v1/roles/{role}` |
| Delete a role | `DELETE /api/v1/roles/{role}` |

Creating a role issues `POST /api/v1/roles` with a `name` and optional `description` and `permissions`:

```json
{
  "name": "reader",
  "description": "Read-only access",
  "permissions": ["..."]
}
```

To assign a role to a user, the Users screen calls `POST /api/v1/users/{username}/roles` with the target `username` and `role`.

### Grants

Grants attach a single permission to a grantee — either a user or a role — optionally scoped to a resource such as a graph. Grants are issued and revoked through two endpoints:

| Action | Endpoint |
|---|---|
| Grant a permission | `POST /api/v1/grants` |
| Revoke a permission | `POST /api/v1/grants/revoke` |

Both take a `permission`, a `grantee`, an optional `resource`, and a `grantee_kind` of `user` or `role`:

```json
{
  "permission": "read",
  "resource": "movies",
  "grantee": "analyst",
  "grantee_kind": "user"
}
```

## RLS Policies

Row-level security restricts which rows a principal can see. The Geode UI exposes RLS through the policy screens, the dedicated RLS deny and attribute surfaces, and per-user attributes.

### Policy list and the generic policy API

The Policies screen is backed by the generic policy endpoints:

| Action | Endpoint |
|---|---|
| List policies | `GET /api/v1/policies` |
| Create a policy | `POST /api/v1/policies` |
| Inspect a policy | `GET /api/v1/policies/{name}` |
| Delete a policy | `DELETE /api/v1/policies/{name}` |

A policy record carries a `name`, an `expression`, and an optional `resource`. Policy writes are gated on `admin_writable.policies`.

{{< callout type="warning" title="CREATE POLICY is upstream-deferred" >}}
On Geode v0.5.15, `admin_writable.policies` is reported as `false` — `CREATE POLICY` remains upstream-deferred. The SPA gates the policy-create affordance accordingly, and the end-to-end suite gracefully skips the `CREATE POLICY` flow on engines where the capability is unavailable.
{{< /callout >}}

### RLS deny policies

The RLS deny screen (`/admin/rls-deny`) implements label-level deny: rows of a given `<label>` in a given `<graph>` are hidden from `<username>`. Leaving the username empty applies the deny to all users.

The screen drives these backend procedures:

- `geode.rls.add_deny_policy(graph, label, username)`
- `geode.rls.remove_deny_policy(graph, label, username)`
- `geode.rls.list_deny_policies()`
- `geode.rls.policy_count()`

This surface requires Geode v0.5.20 or newer; `GET /api/v1/capabilities` reports `admin_writable.rls_deny_policies` so the UI can disable the tab on older builds.

### RLS attribute policies

The RLS attribute screen (`/admin/rls-attribute`) implements attribute-based row visibility: for each row of `<label>` in `<graph>`, the row is visible only when `row.<rowProperty>` equals the requesting principal's `attribute.<attributeKey>`. Combine this with per-user attributes to drive per-tenant or per-department row visibility.

The screen drives these backend procedures:

- `geode.rls.add_attribute_policy(graph, label, row_property, attribute_key)`
- `geode.rls.remove_attribute_policy(graph, label, row_property, attribute_key)`

Listing is provided indirectly via `gps.list_policies()`, filtered to restrictive `select` policies whose expression matches the canonical `row.X = principal.attribute.Y` shape. On builds without `gps.list_policies`, the UI maintains an in-session mirror so policies created during the current session remain visible.

This surface requires Geode v0.5.20 or newer; `GET /api/v1/capabilities` reports `admin_writable.rls_attribute_policies` to gate the tab on older builds.

## Backups & Restore

The Backups screen lists existing backups, takes new ones, inspects and deletes individual backups, runs a retention cleanup, and uploads backup files from your workstation. All backup actions require the `admin` role.

### List, create, inspect, and delete

| Action | Endpoint |
|---|---|
| List backups | `GET /api/v1/backups` |
| Create a backup | `POST /api/v1/backups` |
| Inspect a backup | `GET /api/v1/backups/{file}` |
| Delete a backup | `DELETE /api/v1/backups/{file}` |

A new backup is created with `POST /api/v1/backups`, which optionally accepts a `graph` to scope the backup and an `output` path:

```json
{
  "graph": "movies",
  "output": "..."
}
```

The create call returns a `BackupRef` (file name, path, size, and creation time). Inspecting a backup returns a `BackupInfo` record that adds `graph_count`, `node_count`, and `edge_count`.

### Cleanup and upload

- `POST /api/v1/backups/cleanup` runs a retention sweep and returns how many backups were `removed` and the number of `freed_bytes`.
- `POST /api/v1/backups/upload` uploads a backup file (up to 64 MiB) and returns the stored file name, size, path, and upload time.

### Restore

The Restore screen issues `POST /api/v1/restore` with the `file` to restore from and an optional `target_time` for point-in-time recovery:

```json
{
  "file": "backup-2026-06-01.tar",
  "target_time": "..."
}
```

{{< callout type="warning" >}}
Restore is a destructive operation. Confirm you are connected to the intended target server and profile before restoring, and consider taking a fresh backup first.
{{< /callout >}}

## Migrations

The Migrations screen shows pending and applied migrations, creates new migration entries, signs migrations, runs pending migrations, and uploads migration files. All migration actions require the `admin` role.

| Action | Endpoint |
|---|---|
| Migration status (pending + applied) | `GET /api/v1/migrations` |
| Create a migration | `POST /api/v1/migrations` |
| Run pending migrations | `POST /api/v1/migrations/run` |
| Sign a migration | `POST /api/v1/migrations/{name}/sign` |
| Upload a migration file | `POST /api/v1/migrations/upload` |

`GET /api/v1/migrations` returns the `pending` and `applied` lists so you can see what remains to be applied. Creating a migration with `POST /api/v1/migrations` takes a `name` and optional `description`:

```json
{
  "name": "0001_add_index",
  "description": "..."
}
```

`POST /api/v1/migrations/run` applies the pending migrations and returns the list that was `applied`. The migration upload endpoint accepts files up to 64 MiB.

## Audit Log

The Audit Log viewer reads `GET /api/v1/audit` and lists audit entries from the connected server. The query supports three optional filters:

| Filter | Purpose |
|---|---|
| `since` | Restrict to entries after a given time |
| `event` | Filter to a specific audit event type |
| `user` | Filter to a specific username |

The viewer requires the `admin` role.

### Events to watch

During a JWT signing-secret rotation, the audit log should show:

- `audit_event=auth_login` with the JWT subject — normal traffic.
- `audit_event=admin_bootstrap` once on each replica restart.

For the full rotation procedure and the operational context behind these events, see [Operations & Troubleshooting](/docs/geode-ui/operations/).

{{< callout type="note" title="Audit role on older engines" >}}
A dedicated `audit` role is not part of the Geode v0.5.15 built-in role set; on those engines the end-to-end suite skips the dedicated-`audit`-role check. The audit log viewer itself is gated on the `admin` role.
{{< /callout >}}

## Related pages

- [Authentication & Security](/docs/geode-ui/authentication-and-security/) — how the `admin` role, JWTs, and login lockouts work.
- [REST API, WebSocket & MCP](/docs/geode-ui/rest-api/) — the full HTTP contract behind every admin screen.
- [Operations & Troubleshooting](/docs/geode-ui/operations/) — JWT and profile-store key rotation, metrics, and runbooks.
- [Cluster Monitoring](/docs/geode-ui/cluster-monitoring/) — live server health and metrics.
