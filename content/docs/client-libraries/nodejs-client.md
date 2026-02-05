---
title: "Node.js Client Library"
description: "Complete guide to the Geode Node.js and TypeScript client with QUIC/gRPC transport and Protobuf wire protocol"
url: /docs/client-libraries/nodejs-client/
keywords:
  - Geode Node.js client
  - TypeScript GQL driver
  - JavaScript graph database
  - QUIC TLS 1.3
  - npm @geodedb/client
weight: 25
slug: "nodejs-client"
---

<!-- CANARY: REQ=REQ-CLIENT-NODEJS-001; FEATURE="NodejsClientConnect"; ASPECT=DSNParse; STATUS=IMPL; OWNER=clients; UPDATED=2025-02-14 -->

# Node.js Client Library

The Node.js client provides a TypeScript-first API for Geode with QUIC + TLS 1.3 (default) or gRPC transport, pooling, query builders, and prepared statements.

## Installation

```bash
npm install @geodedb/client
```

## Quick Start

```ts
import { createClient } from '@geodedb/client';

const client = await createClient('quic://localhost:3141');

const rows = await client.queryAll(
  'MATCH (p:Person) RETURN p.name AS name, p.age AS age'
);

for (const row of rows) {
  console.log(`${row.name}: ${row.age}`);
}

await client.close();
```

## DSN Format

> **Note**: See the official [DSN specification](/docs/reference/dsn/) for complete details.

```
quic://[username:password@]host[:port][?options]   # QUIC transport (default port: 3141)
grpc://[username:password@]host[:port][?options]   # gRPC transport (default port: 50051)
host:port                                          # Scheme-less (defaults to QUIC)
```

Supported options: `page_size`, `hello_name`, `hello_ver`, `conformance`, `username`/`user`, `password`/`pass`, `ca`, `cert`, `key`, `insecure_tls_skip_verify`, `server_name`, `connect_timeout`, `request_timeout`, `tls` (gRPC only).

Environment defaults: `GEODE_HOST`, `GEODE_PORT`, `GEODE_TRANSPORT`, `GEODE_TLS_CA`, `GEODE_USERNAME`, `GEODE_PASSWORD`.

## Pooling

Pooling is enabled by default. Configure it via `ClientOptions`:

```ts
const client = await createClient('quic://localhost:3141', {
  pooling: true,
  pool: {
    min: 2,
    max: 10,
    acquireTimeout: 30000,
    idleTimeout: 60000,
  },
});
```

Disable pooling for a single connection:

```ts
const client = await createClient('quic://localhost:3141', { pooling: false });
```

## Queries

```ts
const result = await client.query('MATCH (n) RETURN n');
for await (const row of result) {
  const node = row.get('n')?.asNode;
  console.log(node);
}

const rows = await client.queryAll('MATCH (n) RETURN n.name AS name');
const first = await client.queryFirst('MATCH (n) RETURN n LIMIT 1');
const count = await client.queryScalar<number>('MATCH (n) RETURN count(n) AS cnt', 'cnt');
```

## Streaming Queries

`query()` returns an async iterator for streaming large result sets:

```ts
const result = await client.query('MATCH (p:Person) RETURN p.name AS name');
for await (const row of result) {
  console.log(row.get('name')?.asString);
}
```

## Parameters and Cancellation

```ts
const controller = new AbortController();

const rows = await client.queryAll(
  'MATCH (p:Person) WHERE p.age > $minAge RETURN p.name AS name',
  { params: { minAge: 21 }, signal: controller.signal, pageSize: 1000 }
);
```

## Transactions

```ts
await client.withTransaction(async (tx) => {
  await tx.exec("CREATE (:Person {name: 'Alice'})");
  await tx.exec("CREATE (:Person {name: 'Bob'})");
});
```

Manual transaction control with savepoints:

```ts
const conn = await client.getConnection();
const tx = await conn.begin();
try {
  await tx.exec("CREATE (p:Person {name: 'Alice'})");
  await tx.savepoint('before_update');
  await tx.exec("MATCH (p:Person {name: 'Alice'}) SET p.age = 30");
  await tx.rollbackTo('before_update');
  await tx.commit();
} catch (err) {
  await tx.rollback();
  throw err;
} finally {
  await client.releaseConnection(conn);
}
```

## Prepared Statements

```ts
const stmt = await client.prepare('MATCH (p:Person {name: $name}) RETURN p');

const rows = await stmt.executeAll({ name: 'Alice' });
stmt.close();
```

## Query Builder

```ts
import { query } from '@geodedb/client';

const { query: gql, params } = query()
  .match('(p:Person)')
  .return('p.name AS name')
  .build();

const rows = await client.queryAll(gql, { params });
```

## Explain and Profile

```ts
import { explain, profile } from '@geodedb/client';

await client.withConnection(async (conn) => {
  const plan = await explain(conn, 'MATCH (p:Person) RETURN p');
  const prof = await profile(conn, 'MATCH (p:Person) RETURN p');
  console.log(plan, prof);
});
```

## Authentication Helpers

```ts
import { createAuthClient } from '@geodedb/client';

await client.withConnection(async (conn) => {
  const auth = createAuthClient(conn);
  const user = await auth.currentUser();
  console.log(user);
});
```

## Connection Management

```ts
await client.withConnection(async (conn) => {
  const rows = await conn.queryAll('MATCH (n) RETURN n LIMIT 10');
  console.log(rows);
});
```

## Error Handling

```ts
import { isGeodeError, DriverError } from '@geodedb/client';

try {
  await client.exec('INVALID QUERY');
} catch (err) {
  if (isGeodeError(err)) {
    if (err instanceof DriverError && err.isRetryable) {
      // Retry logic
    }
  }
  throw err;
}
```

## Type Mapping

- `queryAll` returns plain JavaScript objects.
- `query` returns `Row` objects (`Map<string, GQLValue>`).
- Use `row.get('field')` for typed access, or `result.toObjects()` to convert.

## Repository

- GitLab: [devnw/geode/geode-client-nodejs](https://gitlab.com/devnw/geode/geode-client-nodejs)
- npm: [@geodedb/client](https://www.npmjs.com/package/@geodedb/client)
