---
title: "REST API, WebSocket & MCP"
description: "Complete reference for the Geode UI programmatic surface: every REST endpoint, the /ws/query streaming WebSocket protocol, and the genapi MCP HTTP transport."
summary: "Reference for the Geode UI HTTP REST API, the /ws/query streaming WebSocket, and the /mcp transport, including auth, rate limits, and message protocols."
slug: "rest-api"
url: "/docs/geode-ui/rest-api/"
date: 2026-06-01
lastmod: 2026-06-01
draft: false
weight: 80
keywords: ["geode ui rest api", "geode ui websocket", "geode ui mcp", "ws/query streaming", "genapi endpoints", "jwt bearer auth", "graph query api"]
tags: ["geode-ui", "rest-api", "websocket", "mcp", "api"]
categories: ["Geode UI"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/geode-ui/rest-api/"
---

Geode UI exposes its entire surface — query execution, schema discovery, transactions, administration, and operations — over an HTTP/WebSocket API. Every REST endpoint, WebSocket channel, and MCP tool is generated from a single genapi configuration file (`geode.json`), which is the authoritative contract for the wire shape. This page documents that programmatic surface so you can drive Geode UI from scripts, services, and AI agents instead of the browser SPA.

## Overview

A single Go binary serves four programmatic prefixes alongside the embedded React SPA:

- `/api/v1/...` — genapi-generated REST handlers (the routes below).
- `/ws/query` — streaming GQL query over a WebSocket.
- `/mcp` — genapi-generated MCP HTTP transport exposing a single `query` tool.
- `/healthz` — unauthenticated liveness probe.

Outbound, the server fans out to one or more Geode servers via the `geodedb.com/geode` driver (QUIC by default), multiplexed through a profile-aware connection pool.

{{< callout type="info" >}}
`geode.json` is the source of truth for every REST endpoint, WebSocket channel, and MCP tool. The routes, methods, schemas, and rate limits documented here are extracted directly from that contract. Do not assume any route, flag, or field that is not listed below.
{{< /callout >}}

### Authentication model

Most endpoints require a JWT bearer token. The auth column in each table uses these values:

- **`jwt`** — requires an `Authorization: Bearer <token>` header. Obtain the token from `POST /api/v1/auth/login`.
- **(none)** — no authentication required.
- **admin** — in addition to a valid JWT, the route requires the `admin` role (`required_roles: ["admin"]` in the contract).

Tokens are HS256-signed and carry the `sub` (username), `profile` (connection-profile name), and `roles` claims. WebSocket clients that cannot set an `Authorization` header on the upgrade may fall back to passing `?access_token=<token>` on the URL. For the full token lifecycle, role enforcement, lockout behavior, and the `-jwt-secret-hex` / `-jwt-ttl` flags, see [Authentication & Security](/docs/geode-ui/authentication-and-security/).

### Base URL and content type

The server binds to `0.0.0.0:8080` by default (configurable with `-listen`). All REST request and response bodies are JSON, with one exception: `POST /api/v1/auth/login` is form-encoded (`application/x-www-form-urlencoded`).

## Health & Capabilities

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/healthz` | (none) | Liveness probe. Returns `status` and the server `version`. |
| `GET` | `/api/v1/capabilities` | jwt | Reports upstream engine capabilities, including the `admin_writable` flags (`users`, `roles`, `policies`, `grants`) used by the SPA to gate admin controls. |

The `/healthz` response (`HealthResp`) returns:

```json
{
  "status": "ok",
  "version": "<server version>"
}
```

`GET /api/v1/capabilities` returns `geode_version`, the `admin_writable` object, and a `metrics_enabled` boolean. The SPA uses `admin_writable.{users,roles,policies,grants}` to disable admin write affordances when the upstream engine does not support a given operation.

```json
{
  "geode_version": "...",
  "admin_writable": {
    "users": true,
    "roles": true,
    "policies": false,
    "grants": true
  },
  "metrics_enabled": true
}
```

## Authentication

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/auth/login` | (none) | Authenticate against an upstream Geode profile and receive a JWT. **Form-encoded.** |

The login endpoint accepts `application/x-www-form-urlencoded` with `username`, `password`, and an optional `profile` field (defaults to `default`). It authenticates against the named upstream Geode profile and returns a bearer token.

{{< tabs >}}
{{< tab "curl" >}}

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  --data-urlencode "username=admin" \
  --data-urlencode "password=$GEODE_PASSWORD" \
  --data-urlencode "profile=default"
```

{{< /tab >}}
{{< tab "Response (LoginResp)" >}}

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 28800,
  "connection_id": "<id>"
}
```

{{< /tab >}}
{{< /tabs >}}

The response (`LoginResp`) contains `access_token`, `token_type` (`Bearer`), `expires_in` (seconds), and a `connection_id`. Use the `access_token` as `Authorization: Bearer <token>` on every subsequent request.

{{< callout type="note" title="Form encoding, not JSON" >}}
`POST /api/v1/auth/login` is the only endpoint that is form-encoded. Sending a JSON body will fail validation. Login also has the lowest body-size cap (4 KiB) of any route.
{{< /callout >}}

## Query Execution

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/query` | jwt | Execute a GQL statement and return columns and rows. Supports server-side streaming. |

`POST /api/v1/query` accepts a `QueryReq`:

```json
{
  "statement": "MATCH (n) RETURN n LIMIT 10",
  "params": {},
  "graph": "default",
  "page_size": 1000,
  "timeout_ms": 30000
}
```

- `statement` (required) — the GQL query (up to 524288 characters).
- `params` — query parameters object.
- `graph` — target graph name.
- `page_size` — rows per page (1–10000).
- `timeout_ms` — query timeout (1–600000 ms).

The response (`QueryResp`) returns `columns`, `rows`, `row_count`, and `elapsed_ms`, with an optional `graph_summary` carrying `nodes` and `edges` for graph visualization:

```json
{
  "columns": [{ "name": "n", "type": "node" }],
  "rows": [[ /* ... */ ]],
  "row_count": 10,
  "elapsed_ms": 4,
  "graph_summary": {
    "nodes": [],
    "edges": []
  }
}
```

This endpoint is marked `streaming: true` in the contract, so the server begins sending results before the full result set has been materialized — keeping time-to-first-byte low on large result sets. For interactive row-by-row streaming with cancellation, use the [`/ws/query` WebSocket](#websocket-wsquery) instead.

## Transactions

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/tx` | jwt | Begin a transaction. Returns a `txid`. |
| `POST` | `/api/v1/tx/{txid}/run` | jwt | Run a statement inside the open transaction. |
| `POST` | `/api/v1/tx/{txid}/commit` | jwt | Commit the transaction. |
| `POST` | `/api/v1/tx/{txid}/rollback` | jwt | Roll back the transaction. |

Begin a transaction with an optional `read_only` flag and target `graph` (`TxBeginReq`); the response (`TxBeginResp`) returns the `txid`:

```json
{ "read_only": false, "graph": "default" }
```

Run statements against the transaction by posting a `TxRunReq` to `/api/v1/tx/{txid}/run`. The request carries `txid`, `statement`, and optional `params`; the response is the same `QueryResp` shape as `POST /api/v1/query`. Finalize with `commit` or `rollback`, both of which return an empty body.

```bash
# Begin
TXID=$(curl -s -X POST http://localhost:8080/api/v1/tx \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"read_only": false}' | jq -r .txid)

# Run a statement in the transaction
curl -s -X POST "http://localhost:8080/api/v1/tx/$TXID/run" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"txid\": \"$TXID\", \"statement\": \"MATCH (n) RETURN count(n)\"}"

# Commit
curl -s -X POST "http://localhost:8080/api/v1/tx/$TXID/commit" \
  -H "Authorization: Bearer $TOKEN"
```

## Schema Discovery

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/graphs` | jwt | List available graphs. |
| `GET` | `/api/v1/graphs/{graph}/labels` | jwt | List node labels in a graph. |
| `GET` | `/api/v1/graphs/{graph}/edge-types` | jwt | List edge types in a graph. |
| `GET` | `/api/v1/graphs/{graph}/indexes` | jwt | List indexes in a graph. |
| `GET` | `/api/v1/graphs/{graph}/constraints` | jwt | List constraints in a graph. |

These read-only endpoints back the schema explorer. `GET /api/v1/graphs` returns `{ "graphs": [...] }`; the per-graph endpoints return `labels`, `types`, `indexes`, and `constraints` respectively. Index and constraint entries include `name`, `type`, `table`, and `columns` fields.

```bash
curl -s http://localhost:8080/api/v1/graphs \
  -H "Authorization: Bearer $TOKEN"

curl -s http://localhost:8080/api/v1/graphs/default/labels \
  -H "Authorization: Bearer $TOKEN"
```

## Users

All user-management endpoints require the `admin` role.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/users` | admin | List users. |
| `POST` | `/api/v1/users` | admin | Create a user. |
| `GET` | `/api/v1/users/{username}` | admin | Get a single user. |
| `PATCH` | `/api/v1/users/{username}` | admin | Update a user. |
| `DELETE` | `/api/v1/users/{username}` | admin | Delete a user. |
| `POST` | `/api/v1/users/{username}/disable` | admin | Disable a user. |
| `POST` | `/api/v1/users/{username}/enable` | admin | Enable a user. |
| `POST` | `/api/v1/users/{username}/password` | jwt | Change a user's password. |
| `POST` | `/api/v1/users/{username}/roles` | admin | Assign a role to a user. |
| `GET` | `/api/v1/users/{username}/permissions` | admin | List a user's effective permissions. |

A `User` carries `username`, `email`, `roles`, `disabled`, and `mfa_enrolled`. Creating a user (`UserCreateReq`) requires `username` and `email`, with optional `password` and `roles`.

```bash
curl -s -X POST http://localhost:8080/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "email": "alice@example.com", "roles": ["readonly"]}'
```

{{< callout type="note" title="Password change is not admin-gated" >}}
`POST /api/v1/users/{username}/password` requires only a valid JWT (`auth: jwt`), not the `admin` role — letting a user change their own password. The request (`PasswordChangeReq`) requires `username` and `new_password` (minimum 8 characters), with an optional `old_password`.
{{< /callout >}}

## Roles

All role endpoints require the `admin` role.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/roles` | admin | List roles. |
| `POST` | `/api/v1/roles` | admin | Create a role. |
| `GET` | `/api/v1/roles/{role}` | admin | Get a single role. |
| `DELETE` | `/api/v1/roles/{role}` | admin | Delete a role. |

A `Role` carries `name`, `description`, and `permissions`. Creating a role (`RoleCreateReq`) requires `name`, with optional `description` and `permissions`.

## Policies

All policy endpoints require the `admin` role.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/policies` | admin | List policies. |
| `POST` | `/api/v1/policies` | admin | Create a policy. |
| `GET` | `/api/v1/policies/{name}` | admin | Get a single policy. |
| `DELETE` | `/api/v1/policies/{name}` | admin | Delete a policy. |

A `Policy` carries `name`, `expression`, and `resource`. Creating a policy (`PolicyCreateReq`) requires `name` and `expression`.

{{< callout type="warning" title="Policy creation may be upstream-deferred" >}}
On some Geode engine versions, policy creation is reported as unsupported. The SPA reads `admin_writable.policies` from `GET /api/v1/capabilities` and disables the New Policy control when it is `false`. Check the capabilities probe before relying on policy writes.
{{< /callout >}}

## Grants

Grant endpoints require the `admin` role.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/grants` | admin | Grant a permission to a user or role. |
| `POST` | `/api/v1/grants/revoke` | admin | Revoke a permission from a user or role. |

Both endpoints accept a `GrantReq` requiring `permission` and `grantee`, with optional `resource` and `grantee_kind` (`""`, `"user"`, or `"role"`):

```json
{
  "permission": "READ",
  "resource": "myGraph",
  "grantee": "alice",
  "grantee_kind": "user"
}
```

## Backup & Restore

All backup and restore endpoints require the `admin` role.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/backups` | admin | List backups. |
| `POST` | `/api/v1/backups` | admin | Create a backup. |
| `GET` | `/api/v1/backups/{file}` | admin | Get metadata for a single backup. |
| `DELETE` | `/api/v1/backups/{file}` | admin | Delete a backup. |
| `POST` | `/api/v1/backups/cleanup` | admin | Remove eligible backups; reports count and bytes freed. |
| `POST` | `/api/v1/backups/upload` | admin | Upload a backup file. |
| `POST` | `/api/v1/restore` | admin | Restore from a backup file. |

Creating a backup (`BackupCreateReq`) accepts optional `graph` and `output` fields and returns a `BackupRef` with `file`, `path`, `size_bytes`, and `created_at`. A single backup's metadata (`BackupInfo`) adds `graph_count`, `node_count`, and `edge_count`. The cleanup response (`BackupCleanupResp`) returns `removed` and `freed_bytes`.

Restore (`RestoreReq`) requires `file` and accepts an optional `target_time` for point-in-time restore.

{{< callout type="note" title="Upload size limit" >}}
`POST /api/v1/backups/upload` accepts a file up to 64 MiB and returns an `UploadResp` (`file`, `size_bytes`, `path`, `uploaded_at`).
{{< /callout >}}

## Migrations

All migration endpoints require the `admin` role.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/migrations` | admin | Report migration status (`pending` / `applied`). |
| `POST` | `/api/v1/migrations` | admin | Create a migration. |
| `POST` | `/api/v1/migrations/run` | admin | Run pending migrations. |
| `POST` | `/api/v1/migrations/{name}/sign` | admin | Sign a migration. |
| `POST` | `/api/v1/migrations/upload` | admin | Upload a migration file. |

`GET /api/v1/migrations` returns `MigrationStatus` with `pending` and `applied` lists. Creating a migration (`MigrationCreateReq`) requires `name` (optional `description`) and returns a `MigrationRef`. Running migrations returns `MigrationRunResp` with the list of `applied` names. The upload endpoint accepts a file up to 64 MiB and returns an `UploadResp`.

## Audit Log

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/audit` | admin | Read audit-log entries. |

`GET /api/v1/audit` requires the `admin` role and accepts the optional query parameters `since`, `event`, and `user` (`AuditQuery`). It returns an `AuditList` with `entries`.

```bash
curl -s "http://localhost:8080/api/v1/audit?event=login&user=alice" \
  -H "Authorization: Bearer $TOKEN"
```

{{< callout type="note" >}}
On some engine versions, `/api/v1/audit` may return `403` even for administrators when audit permissions depend on a role the engine does not provide. See [Operations & Troubleshooting](/docs/geode-ui/operations/).
{{< /callout >}}

## Connection Profiles

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/v1/profiles/public` | (none) | List public (selectable) profiles — used by the login picker. |
| `GET` | `/api/v1/profiles` | jwt | List profiles visible to the caller. |
| `POST` | `/api/v1/profiles` | jwt | Create a profile. |
| `GET` | `/api/v1/profiles/{profileId}` | jwt | Get a single profile. |
| `PATCH` | `/api/v1/profiles/{profileId}` | jwt | Update a profile. |
| `DELETE` | `/api/v1/profiles/{profileId}` | jwt | Delete a profile. |

`GET /api/v1/profiles/public` is unauthenticated so the login screen can populate its connection picker before a token exists; it returns only `name` and `description` per profile. The authenticated endpoints return the full `Profile` (including `id`, `scope`, `name`, `dsn`, and optional `tls` / `pool_overrides`). Creating a profile (`CreateProfileReq`) requires `scope`, `name`, and `dsn`.

For how profiles map to upstream Geode servers and how the connection pool selects a DSN, see [Connections & Profiles](/docs/geode-ui/connections-and-profiles/).

## WebSocket: /ws/query {#websocket-wsquery}

For interactive, row-by-row streaming with cancellation, Geode UI exposes a JSON WebSocket at `/ws/query`. This is the channel the SPA's query editor uses for live streaming results.

### Connecting and authenticating

`/ws/query` requires a JWT (`auth: jwt`). Send the token as an `Authorization: Bearer <token>` header on the upgrade request. Clients that cannot set that header on the upgrade may instead pass the token on the URL as `?access_token=<token>`.

```text
ws://localhost:8080/ws/query?access_token=<token>
```

Channel parameters from the contract:

- `proto`: `json`
- `ping_interval_ms`: `15000` (the server sends a keepalive ping every 15 seconds)
- `max_frame_bytes`: `1048576` (1 MiB per frame)
- `max_message_bytes`: `16777216` (16 MiB per message)
- `same_origin_only`: `true` (with `allow_empty_origin: true`)

### Message protocol

Both directions exchange `QueryStreamMsg` JSON objects. Every message has a required `kind` field, which is one of:

```text
start | schema | row | summary | error | end | cancel
```

The relevant fields per `QueryStreamMsg` are:

- `kind` (required) — the message type from the enum above.
- `statement` — the GQL statement (sent with the `start` message).
- `graph` — target graph (sent with `start`).
- `params` — query parameters (sent with `start`).
- `columns` — column descriptors (carried by the `schema` message).
- `row` — a single result row (carried by each `row` message).
- `elapsed_ms` — elapsed time (carried by the `summary` message).
- `row_count` — total rows (carried by the `summary` message).
- `code` — an error code (carried by the `error` message).
- `message` — an error message (carried by the `error` message).

### Streaming behavior

A typical exchange:

1. **Client → server:** `{ "kind": "start", "statement": "...", "graph": "...", "params": {} }` to begin a query.
2. **Server → client:** a `schema` message carrying `columns`.
3. **Server → client:** one `row` message per result row, streamed as they arrive.
4. **Server → client:** a `summary` message carrying `row_count` and `elapsed_ms`.
5. **Server → client:** an `end` message to close out the stream.

If the query fails, the server sends an `error` message with `code` and `message` instead of a `summary`/`end`. To abort an in-flight query, the client sends `{ "kind": "cancel" }`.

```json
{ "kind": "start", "statement": "MATCH (n) RETURN n", "graph": "default", "params": {} }
```

```json
{ "kind": "cancel" }
```

{{< callout type="info" title="Also: /ws/ping" >}}
The contract also declares a `/ws/ping` channel (`PingMsg` with a `seq` integer, JWT-gated, 30-second ping interval). It is a lightweight keepalive/diagnostic channel; query streaming uses `/ws/query`.
{{< /callout >}}

## MCP: /mcp

Geode UI exposes a genapi-generated **Model Context Protocol (MCP) HTTP transport** at `/mcp`, letting MCP-capable AI agents run GQL against Geode through a typed tool.

From the contract, the MCP configuration is:

- **Transport:** `http`
- **Tools:** a single tool named `query`, with `paramsSchema: QueryReq` and `resultSchema: QueryResp`.

Because the `query` tool reuses the same `QueryReq` and `QueryResp` schemas as `POST /api/v1/query`, an agent calling the tool supplies a `statement` (and optionally `params`, `graph`, `page_size`, `timeout_ms`) and receives `columns`, `rows`, `row_count`, and `elapsed_ms` back. This is the only MCP tool exposed by Geode UI.

{{< callout type="note" >}}
The `/mcp` transport is part of the authenticated API surface. Configure your MCP client with the Geode UI base URL and a valid bearer token, consistent with the rest of the API. See [Authentication & Security](/docs/geode-ui/authentication-and-security/) for token issuance.
{{< /callout >}}

## Rate Limiting

Three independent server-side throttles are layered on the generated HTTP surface, checked in this order on every request after authentication and authorization:

1. **Cross-route aggregate ceiling** — a single server-wide token bucket shared by every generated route. In `geode.json` this is `global_rps: 2000` with a `burst` of `400`. Setting `global_rps: 0` disables the aggregate limiter.
2. **Per-route bucket** — each route declared with a `rateLimit` gets its own token bucket. A route exceeding its own `rateLimit` is throttled even if the aggregate budget has room. A route with no `rateLimit` falls back to `global_rps` as its per-route default.
3. **Per-IP limiter** — a coarse per-client ceiling partitioned by client IP (`per_ip_rps: 50`, `per_ip_burst: 100`, keyed on `remote_addr` by default). It is applied to every route.

When a limit is exceeded the server returns HTTP `429`.

### Per-route rate limits

The following table lists the `rateLimit` (requests per second) declared for each route in `geode.json`:

| Path | Method(s) | rateLimit (rps) |
|------|-----------|-----------------|
| `/healthz` | GET | 50 |
| `/api/v1/auth/login` | POST | 20 |
| `/api/v1/query` | POST | 2000 |
| `/api/v1/graphs` | GET | 100 |
| `/api/v1/graphs/{graph}/labels` | GET | 100 |
| `/api/v1/graphs/{graph}/edge-types` | GET | 100 |
| `/api/v1/graphs/{graph}/indexes` | GET | 100 |
| `/api/v1/graphs/{graph}/constraints` | GET | 100 |
| `/api/v1/capabilities` | GET | 100 |
| `/api/v1/tx` | POST | 50 |
| `/api/v1/tx/{txid}/run` | POST | 200 |
| `/api/v1/tx/{txid}/commit` | POST | 50 |
| `/api/v1/tx/{txid}/rollback` | POST | 50 |
| `/api/v1/users` | GET | 100 |
| `/api/v1/users` | POST | 50 |
| `/api/v1/users/{username}` | GET | 100 |
| `/api/v1/users/{username}` | PATCH | 50 |
| `/api/v1/users/{username}` | DELETE | 20 |
| `/api/v1/users/{username}/disable` | POST | 20 |
| `/api/v1/users/{username}/enable` | POST | 20 |
| `/api/v1/users/{username}/password` | POST | 20 |
| `/api/v1/users/{username}/roles` | POST | 20 |
| `/api/v1/users/{username}/permissions` | GET | 100 |
| `/api/v1/roles` | GET | 100 |
| `/api/v1/roles` | POST | 50 |
| `/api/v1/roles/{role}` | GET | 100 |
| `/api/v1/roles/{role}` | DELETE | 20 |
| `/api/v1/policies` | GET | 100 |
| `/api/v1/policies` | POST | 50 |
| `/api/v1/policies/{name}` | GET | 100 |
| `/api/v1/policies/{name}` | DELETE | 20 |
| `/api/v1/grants` | POST | 30 |
| `/api/v1/grants/revoke` | POST | 30 |
| `/api/v1/backups` | GET | 50 |
| `/api/v1/backups` | POST | 10 |
| `/api/v1/backups/{file}` | GET | 50 |
| `/api/v1/backups/{file}` | DELETE | 20 |
| `/api/v1/backups/cleanup` | POST | 10 |
| `/api/v1/backups/upload` | POST | 10 |
| `/api/v1/restore` | POST | 5 |
| `/api/v1/migrations` | GET | 50 |
| `/api/v1/migrations` | POST | 20 |
| `/api/v1/migrations/run` | POST | 5 |
| `/api/v1/migrations/{name}/sign` | POST | 20 |
| `/api/v1/migrations/upload` | POST | 10 |
| `/api/v1/audit` | GET | 50 |
| `/api/v1/profiles/public` | GET | 50 |
| `/api/v1/profiles` | GET | 50 |
| `/api/v1/profiles` | POST | 20 |
| `/api/v1/profiles/{profileId}` | GET | 50 |
| `/api/v1/profiles/{profileId}` | PATCH | 20 |
| `/api/v1/profiles/{profileId}` | DELETE | 20 |

### Body-size limits

The server enforces a global maximum body size of 1 MiB (`max_body_bytes: 1048576`). Several routes declare tighter or larger per-route limits in the contract:

| Path | maxBodyBytes |
|------|--------------|
| `/api/v1/auth/login` | 4096 (4 KiB) |
| `/api/v1/query` | 524288 (512 KiB) |
| `/api/v1/tx` | 4096 (4 KiB) |
| `/api/v1/tx/{txid}/run` | 524288 (512 KiB) |
| `/api/v1/backups` (POST) | 4096 (4 KiB) |
| `/api/v1/backups/upload` | 67108864 (64 MiB) |
| `/api/v1/restore` | 4096 (4 KiB) |
| `/api/v1/migrations` (POST) | 4096 (4 KiB) |
| `/api/v1/migrations/upload` | 67108864 (64 MiB) |

## CORS

CORS is enabled, with allowed origins set to `http://localhost:3000` by default (`security.cors` in `geode.json`). Adjust the allowed origins to match your deployment before exposing the API to a browser front end on a different origin.

## Related pages

- [Authentication & Security](/docs/geode-ui/authentication-and-security/) — token issuance, role enforcement, lockout, and the JWT flags.
- [Query Editor & Visualization](/docs/geode-ui/query-editor/) — how the SPA uses `/api/v1/query` and `/ws/query`.
- [Connections & Profiles](/docs/geode-ui/connections-and-profiles/) — profile management and DSN routing.
- [Administration](/docs/geode-ui/administration/) — the UI over the users, roles, policies, and grants endpoints.
- [Cluster Monitoring](/docs/geode-ui/cluster-monitoring/) — dashboards driven by the API.
- [Operations & Troubleshooting](/docs/geode-ui/operations/) — backups, migrations, audit, and restore in practice.
