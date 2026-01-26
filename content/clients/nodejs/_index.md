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
import {
  DriverError,
  TransportError,
  ConfigError,
  SecurityError,
  isRetryableError,
} from '@geode/client';

try {
  await client.queryAll('INVALID QUERY');
} catch (e) {
  if (e instanceof DriverError) {
    console.log('Server error:', e.code, e.message);
    console.log('Status class:', e.statusClass); // ISO 39075 code

    if (isRetryableError(e)) {
      // Serialization or deadlock - can retry
    }
  } else if (e instanceof TransportError) {
    console.log('Network error:', e.operation, e.message);
  } else if (e instanceof ConfigError) {
    console.log('Configuration error:', e.field, e.message);
  } else if (e instanceof SecurityError) {
    console.log('Security error:', e.type, e.message);
  }
}
```

### ISO 39075 Status Classes

| Class | Meaning                   | Retryable |
| ----- | ------------------------- | --------- |
| 00000 | Success                   | -         |
| 01000 | Warning                   | No        |
| 02000 | No data                   | No        |
| 25000 | Invalid transaction state | No        |
| 28000 | Authorization error       | No        |
| 40001 | Serialization failure     | Yes       |
| 40502 | Transaction deadlock      | Yes       |
| 42000 | Syntax error              | No        |
| 23000 | Constraint violation      | No        |
| 58000 | System error              | No        |

## Type System

The client provides a comprehensive GQL type system:

```ts
import { GQLValue, fromJSON } from '@geode/client';

// Create typed values
const intVal = GQLValue.int(42);
const strVal = GQLValue.string('hello');
const arrVal = GQLValue.array([GQLValue.int(1), GQLValue.int(2)]);
const nodeVal = GQLValue.node({
  id: '123',
  labels: ['Person'],
  properties: { name: 'Alice' },
});

// Type-safe access
intVal.asNumber; // 42
intVal.asInt; // 42n (bigint)
strVal.asString; // 'hello'
arrVal.asArray; // [GQLValue, GQLValue]
nodeVal.asNode; // { id, labels, properties }

// Convert to plain JS
intVal.toJS(); // 42
nodeVal.toJS(); // { id: '123', labels: ['Person'], ... }

// Parse from JSON
const value = fromJSON({ name: 'Alice', age: 30 });
```

### Supported Types

| GQL Type   | Node.js Type  |
| ---------- | ------------- |
| INT        | number/bigint |
| FLOAT      | number        |
| DECIMAL    | Decimal       |
| STRING     | string        |
| BOOL       | boolean       |
| NULL       | null          |
| ARRAY/LIST | Array         |
| OBJECT/MAP | Object/Map    |
| NODE       | GQLNode       |
| EDGE       | GQLEdge       |
| PATH       | GQLPath       |
| BYTEA      | Uint8Array    |
| DATE       | Date          |
| TIME       | Date          |
| TIMESTAMP  | Date          |
| UUID       | string        |
| JSON/JSONB | any           |

## Advanced Features

### Batch Operations

```ts
import { batch, batchMap, batchParallel } from '@geode/client';

// Execute multiple queries in a batch
const summary = await client.batch([
  { query: "CREATE (n:Person {name: 'Alice'})" },
  { query: "CREATE (n:Person {name: 'Bob'})" },
  { query: 'MATCH (n:Person) RETURN count(n) AS cnt' },
]);

console.log(`${summary.successful}/${summary.total} queries succeeded`);
console.log('Total time:', summary.totalDurationMs, 'ms');

// Stop on first error
const summary2 = await client.batch(queries, { stopOnError: true });

// Execute in a transaction (all or nothing)
const summary3 = await client.batch(queries, { transaction: true });

// Map over data
const people = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }];
await batchMap(conn, 'CREATE (n:Person {name: $name})', people);
```

### Query Explain/Profile

```ts
import { explain, profile, formatPlan, formatProfile } from '@geode/client';

// Get query execution plan
const plan = await client.explain('MATCH (n:Person)-[:KNOWS]->(m) RETURN n, m');
console.log('Estimated cost:', plan.totalCost);
console.log('Estimated rows:', plan.totalRows);

// Format plan for display
console.log(formatPlan(plan));

// Profile actual execution
const prof = await client.profile('MATCH (n:Person) RETURN count(n)');
console.log('Execution time:', prof.totalTimeMs, 'ms');
console.log('Rows processed:', prof.totalRows);
console.log('Planning time:', prof.planningTimeMs, 'ms');
console.log('Memory used:', prof.memoryBytes, 'bytes');

// Format profile for display
console.log(formatProfile(prof));
```

### Authentication Client

```ts
import { AuthClient } from '@geode/client';

const auth = await client.auth();

// User management
await auth.createUser('alice', { password: 'securePass123', roles: ['analyst'] });
await auth.changePassword('alice', 'newPassword456');
await auth.deactivateUser('alice');
const users = await auth.listUsers();

// Role management
await auth.createRole('analyst', {
  description: 'Data analyst role',
  permissions: [{ resource: 'NODE', action: 'READ' }],
});
await auth.assignRole('alice', 'analyst');
await auth.grantPermission('analyst', { resource: 'NODE', action: 'READ', label: 'Person' });

// Row-level security policies
await auth.createRLSPolicy(
  'tenant_isolation',
  'Document',
  'ALL',
  'n.tenant_id = current_user().tenant_id',
  { roles: ['user', 'analyst'] }
);
await auth.enableRLSPolicy('tenant_isolation', 'Document');

// Session info
const currentUser = await auth.currentUser();
const roles = await auth.currentRoles();
const canRead = await auth.hasPermission('NODE', 'READ', 'Person');
```

### Abort/Cancellation

```ts
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const rows = await client.queryAll('MATCH (n) RETURN n', { signal: controller.signal });
} catch (e) {
  if (e.message.includes('Aborted')) {
    console.log('Query was cancelled');
  }
}
```

## Connection Pool

```ts
const client = await createClient('geode://localhost:3141', {
  pooling: true,
  pool: {
    min: 2, // Minimum connections to maintain
    max: 10, // Maximum connections
    acquireTimeout: 30000, // Max wait time to acquire
    idleTimeout: 60000, // Close idle connections after
  },
});

// Check pool stats
console.log(client.poolStats);
// { total: 5, available: 3, inUse: 2, waiting: 0 }
```

## API Reference

### GeodeClient

| Method                            | Description                          |
| --------------------------------- | ------------------------------------ |
| `query(gql, options?)`            | Execute query, return async iterator |
| `queryAll(gql, options?)`         | Execute query, return all rows       |
| `queryFirst(gql, options?)`       | Get first row                        |
| `queryScalar(gql, col, options?)` | Get single value                     |
| `exec(gql, options?)`             | Execute statement (no results)       |
| `withTransaction(fn)`             | Execute in transaction               |
| `prepare(gql)`                    | Create prepared statement            |
| `explain(gql, options?)`          | Get query execution plan             |
| `profile(gql, options?)`          | Profile query execution              |
| `batch(queries, options?)`        | Execute multiple queries             |
| `auth()`                          | Get authentication client            |
| `ping()`                          | Check connection health              |
| `close()`                         | Close client                         |

### Connection

| Method                     | Description               |
| -------------------------- | ------------------------- |
| `query(gql, options?)`     | Execute query             |
| `exec(gql, options?)`      | Execute statement         |
| `begin()`                  | Start transaction         |
| `prepare(gql)`             | Create prepared statement |
| `explain(gql, options?)`   | Get query plan            |
| `profile(gql, options?)`   | Profile execution         |
| `batch(queries, options?)` | Execute batch             |
| `ping()`                   | Health check              |
| `reset()`                  | Reset session             |
| `close()`                  | Close connection          |

### Transaction

| Method                 | Description           |
| ---------------------- | --------------------- |
| `query(gql, options?)` | Execute query         |
| `exec(gql, options?)`  | Execute statement     |
| `savepoint(name)`      | Create savepoint      |
| `rollbackTo(name)`     | Rollback to savepoint |
| `commit()`             | Commit transaction    |
| `rollback()`           | Rollback transaction  |

### PreparedStatement

| Method                          | Description               |
| ------------------------------- | ------------------------- |
| `execute(params?, options?)`    | Execute, return iterator  |
| `executeAll(params?, options?)` | Execute, return all rows  |
| `exec(params?, options?)`       | Execute (no results)      |
| `validate(params?)`             | Validate parameters       |
| `close()`                       | Close statement           |
| `query`                         | Get query text            |
| `parameterCount`                | Get parameter count       |
| `namedParameters`               | Get named parameter names |

### AuthClient

| Method                               | Description           |
| ------------------------------------ | --------------------- |
| `createUser(name, options)`          | Create user           |
| `deleteUser(name)`                   | Delete user           |
| `getUser(name)`                      | Get user info         |
| `listUsers()`                        | List all users        |
| `changePassword(name, password)`     | Change password       |
| `activateUser(name)`                 | Activate user         |
| `deactivateUser(name)`               | Deactivate user       |
| `createRole(name, options?)`         | Create role           |
| `deleteRole(name)`                   | Delete role           |
| `assignRole(user, role)`             | Assign role to user   |
| `revokeRole(user, role)`             | Revoke role from user |
| `grantPermission(role, perm)`        | Grant permission      |
| `revokePermission(role, perm)`       | Revoke permission     |
| `createRLSPolicy(...)`               | Create RLS policy     |
| `deleteRLSPolicy(name, label)`       | Delete RLS policy     |
| `currentUser()`                      | Get current user      |
| `currentRoles()`                     | Get current roles     |
| `hasPermission(res, action, label?)` | Check permission      |

## Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests (requires Docker)
npm run test:integration
```

## Repository

- GitLab: [devnw/codepros/geode/geode-client-nodejs](https://gitlab.com/devnw/codepros/geode/geode-client-nodejs)
- npm: [@geode/client](https://www.npmjs.com/package/@geode/client)
