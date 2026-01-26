---
title: "Node.js Client"
description: "Official Node.js and TypeScript client for Geode graph database"
weight: 5
tags: ["nodejs", "javascript", "typescript", "client", "quic", "gql"]
categories: ["clients", "documentation"]
keywords:
  - Geode Node.js client
  - TypeScript GQL driver
  - JavaScript graph database client
  - QUIC TLS 1.3
  - npm @geode/client
series:
  - client-libraries
---

<!-- CANARY: REQ=REQ-CLIENT-NODEJS-001; FEATURE="NodejsClientConnect"; ASPECT=DSNParse; STATUS=IMPL; OWNER=clients; UPDATED=2025-02-14 -->

# Node.js Client Library

The official Node.js client for Geode provides a high-performance QUIC + TLS 1.3 implementation with full TypeScript types. Use `createClient` for a ready-to-use client with optional pooling.

## Installation

```bash
npm install @geode/client
```

**Requirements**: Node.js 20+

## Quick Start

```ts
import { createClient } from '@geode/client';

const client = await createClient('geode://localhost:3141');

const rows = await client.queryAll(
  'MATCH (p:Person) RETURN p.name AS name, p.age AS age'
);

for (const row of rows) {
  console.log(`${row.name}: ${row.age}`);
}

await client.close();
```

## DSN Options

```
geode://[username:password@]host[:port][?options]
```

Supported options: `page_size`, `hello_name`, `hello_ver`, `conformance`, `username`/`user`, `password`/`pass`, `ca`, `cert`, `key`, `insecure`, `server_name`, `connect_timeout`, `request_timeout`.

### Environment Defaults

- `GEODE_HOST`
- `GEODE_PORT`
- `GEODE_TLS_CA`
- `GEODE_USERNAME`
- `GEODE_PASSWORD`

## Pooling

Pooling is enabled by default. Configure it via `ClientOptions`:

```ts
const client = await createClient('geode://localhost:3141', {
  pooling: true,
  pool: {
    min: 2,
    max: 10,
    acquireTimeout: 30000,
    idleTimeout: 60000,
  },
});
```

Disable pooling for a single dedicated connection:

```ts
const client = await createClient('geode://localhost:3141', { pooling: false });
```

## Queries

```ts
const rows = await client.queryAll('MATCH (n) RETURN n.name AS name');
const first = await client.queryFirst('MATCH (n) RETURN n LIMIT 1');
const count = await client.queryScalar<number>('MATCH (n) RETURN count(n) AS cnt', 'cnt');
```

### Streaming Results

```ts
const result = await client.query('MATCH (p:Person) RETURN p.name AS name');
for await (const row of result) {
  console.log(row.get('name')?.asString);
}
```

## Transactions

```ts
await client.withTransaction(async (tx) => {
  await tx.exec("CREATE (:Person {name: 'Alice'})");
  await tx.exec("CREATE (:Person {name: 'Bob'})");
});
```

Manual control with savepoints:

```ts
const conn = await client.getConnection();
const tx = await conn.begin();
try {
  await tx.exec("CREATE (p:Person {name: 'Alice'})");
  await tx.savepoint('before_update');
  await tx.exec("MATCH (p:Person {name: 'Alice'}) SET p.age = 30");
  await tx.rollbackTo('before_update');
  await tx.commit();
} finally {
  await client.releaseConnection(conn);
}
```

## Prepared Statements

```ts
const stmt = await client.prepare('MATCH (p:Person {name: $name}) RETURN p');
const rows = await stmt.executeAll({ name: 'Alice' });
```

## Query Builder

```ts
import { query } from '@geode/client';

const { query: gql, params } = query()
  .match('(p:Person)')
  .return('p.name AS name')
  .build();

const rows = await client.queryAll(gql, { params });
```

## Error Handling

```ts
import { isGeodeError, DriverError } from '@geode/client';

try {
  await client.exec('INVALID QUERY');
} catch (err) {
  if (isGeodeError(err) && err instanceof DriverError && err.isRetryable) {
    // Retry logic
  }
  throw err;
}
```

## Repository

- GitLab: [devnw/geode/geode-client-nodejs](https://gitlab.com/devnw/geode/geode-client-nodejs)
- npm: [@geode/client](https://www.npmjs.com/package/@geode/client)
