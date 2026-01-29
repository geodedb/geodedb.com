---
title: "JavaScript Client Library - Node.js SDK for Geode Graph Database"
description: "Complete guide to using Geode with JavaScript and Node.js. Learn about QUIC + TLS connectivity, async patterns, connection pooling, and building graph-powered applications."
keywords:
  - JavaScript client
  - Node.js SDK
  - Geode JavaScript
  - graph database JavaScript
  - QUIC protocol
  - async await
  - connection pooling
  - GQL JavaScript
  - npm geode
  - web applications
  - Express.js
  - Fastify
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/javascript/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# JavaScript Client Library for Geode

The Geode JavaScript client enables Node.js applications to connect to Geode using QUIC + TLS 1.3 transport. It provides async/await patterns, connection pooling, and full GQL query support for building high-performance graph-powered applications.

## Introduction

The JavaScript client is designed for modern Node.js development:

- **Async/Await Native**: First-class Promise support throughout
- **Connection Pooling**: Efficient connection management for high-throughput scenarios
- **Stream Support**: Handle large result sets with streaming APIs
- **Framework Agnostic**: Works with Express, Fastify, Koa, NestJS, and more
- **ESM and CommonJS**: Supports both module systems

### Requirements

- Node.js 18.0 or later (for native QUIC support)
- npm 8.0+ or yarn 1.22+

## Installation

```bash
# Using npm
npm install @geodedb/client

# Using yarn
yarn add @geodedb/client

# Using pnpm
pnpm add @geodedb/client
```

## Quick Start

### Basic Connection

```javascript
const { Client } = require('@geodedb/client');

async function main() {
    // Create client
    const client = new Client({
        host: 'localhost',
        port: 3141,
    });

    // Connect
    const conn = await client.connect();

    try {
        // Execute query
        const result = await conn.query(
            'MATCH (p:Person) RETURN p.name AS name, p.age AS age'
        );

        // Process results
        for (const row of result.rows) {
            console.log(`${row.name}: ${row.age} years old`);
        }
    } finally {
        // Always close connection
        await conn.close();
    }
}

main().catch(console.error);
```

### ES Modules

```javascript
import { Client } from '@geodedb/client';

const client = new Client({ host: 'localhost', port: 3141 });
const conn = await client.connect();

const { rows } = await conn.query('RETURN "Hello, Geode!" AS greeting');
console.log(rows[0].greeting);

await conn.close();
```

## Connection Configuration

### Full Configuration Options

```javascript
const client = new Client({
    // Connection settings
    host: 'geode.example.com',
    port: 3141,

    // TLS configuration
    tls: {
        ca: fs.readFileSync('/path/to/ca.crt'),
        cert: fs.readFileSync('/path/to/client.crt'),
        key: fs.readFileSync('/path/to/client.key'),
        rejectUnauthorized: true,  // Verify server certificate
    },

    // Client identification
    clientName: 'my-application',
    clientVersion: '1.0.0',

    // Query settings
    defaultPageSize: 1000,
    queryTimeout: 30000,  // 30 seconds

    // Connection settings
    connectTimeout: 10000,  // 10 seconds
    idleTimeout: 60000,     // 1 minute
});
```

### Environment Variables

```javascript
// Load configuration from environment
const client = new Client({
    host: process.env.GEODE_HOST || 'localhost',
    port: parseInt(process.env.GEODE_PORT) || 3141,
    tls: process.env.GEODE_TLS_ENABLED === 'true' ? {
        ca: fs.readFileSync(process.env.GEODE_CA_PATH),
    } : undefined,
});
```

## Executing Queries

### Parameterized Queries

Always use parameters to prevent injection and improve performance:

```javascript
// Good: Parameterized query
const result = await conn.query(
    'MATCH (u:User {email: $email}) RETURN u',
    { email: userInput }
);

// Bad: String interpolation (vulnerable to injection)
// const result = await conn.query(`MATCH (u:User {email: "${userInput}"}) RETURN u`);
```

### Parameter Types

```javascript
// String parameters
await conn.query('CREATE (p:Person {name: $name})', { name: 'Alice' });

// Number parameters
await conn.query('MATCH (p:Person) WHERE p.age > $age RETURN p', { age: 21 });

// Boolean parameters
await conn.query('MATCH (p:Product) WHERE p.active = $active RETURN p', { active: true });

// Null parameters
await conn.query('MATCH (p:Person) SET p.middleName = $middle', { middle: null });

// Array parameters
await conn.query('MATCH (p:Person) WHERE p.id IN $ids RETURN p', {
    ids: ['id1', 'id2', 'id3']
});

// Object/Map parameters
await conn.query('CREATE (c:Config {settings: $settings})', {
    settings: { theme: 'dark', notifications: true }
});

// Date parameters
await conn.query('CREATE (e:Event {date: $date})', {
    date: new Date('2026-01-28T10:00:00Z')
});
```

### Execute vs Query

```javascript
// Use query() for SELECT operations that return data
const { rows, schema } = await conn.query(
    'MATCH (p:Person) RETURN p.name, p.age'
);

// Use execute() for mutations that don't need results
const { summary } = await conn.execute(
    'CREATE (p:Person {name: $name, age: $age})',
    { name: 'Bob', age: 30 }
);

console.log(`Created ${summary.nodesCreated} nodes`);
```

## Connection Pooling

### Creating a Pool

```javascript
const { Pool } = require('@geodedb/client');

const pool = new Pool({
    host: 'localhost',
    port: 3141,

    // Pool configuration
    minConnections: 5,      // Minimum idle connections
    maxConnections: 20,     // Maximum total connections
    acquireTimeout: 5000,   // Wait time for connection
    idleTimeout: 60000,     // Close idle connections after
    maxLifetime: 3600000,   // Maximum connection age (1 hour)
});

// Initialize pool
await pool.initialize();
```

### Using the Pool

```javascript
// Method 1: Manual acquire/release
async function queryWithPool() {
    const conn = await pool.acquire();
    try {
        const result = await conn.query('MATCH (n) RETURN count(n) AS total');
        return result.rows[0].total;
    } finally {
        pool.release(conn);
    }
}

// Method 2: Using withConnection helper
async function queryWithHelper() {
    return pool.withConnection(async (conn) => {
        const result = await conn.query('MATCH (n) RETURN count(n) AS total');
        return result.rows[0].total;
    });
}

// Method 3: Using connection callback
const total = await pool.query('MATCH (n) RETURN count(n) AS total');
```

### Pool Events

```javascript
pool.on('connect', (conn) => {
    console.log('New connection established');
});

pool.on('acquire', (conn) => {
    console.log('Connection acquired from pool');
});

pool.on('release', (conn) => {
    console.log('Connection released to pool');
});

pool.on('error', (err) => {
    console.error('Pool error:', err);
});

pool.on('close', () => {
    console.log('Pool closed');
});
```

### Graceful Shutdown

```javascript
// Handle shutdown signals
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await pool.drain();  // Wait for active connections
    await pool.close();  // Close all connections
    process.exit(0);
});
```

## Transactions

### Basic Transaction

```javascript
async function transferFunds(fromId, toId, amount) {
    const conn = await pool.acquire();
    try {
        await conn.beginTransaction();

        try {
            // Debit source account
            await conn.execute(
                'MATCH (a:Account {id: $id}) SET a.balance = a.balance - $amount',
                { id: fromId, amount }
            );

            // Credit destination account
            await conn.execute(
                'MATCH (a:Account {id: $id}) SET a.balance = a.balance + $amount',
                { id: toId, amount }
            );

            await conn.commit();
            return { success: true };
        } catch (err) {
            await conn.rollback();
            throw err;
        }
    } finally {
        pool.release(conn);
    }
}
```

### Transaction with Savepoints

```javascript
async function complexOperation(conn) {
    await conn.beginTransaction();

    try {
        // Create user
        await conn.execute(
            'CREATE (u:User {id: $id, name: $name})',
            { id: 'user_001', name: 'Alice' }
        );

        // Create savepoint before risky operation
        await conn.savepoint('before_preferences');

        try {
            // This might fail
            await conn.execute(
                'MATCH (u:User {id: $id}) CREATE (u)-[:PREFERS]->(:Category {name: $cat})',
                { id: 'user_001', cat: 'InvalidCategory' }
            );
        } catch (err) {
            // Rollback to savepoint, not entire transaction
            await conn.rollbackToSavepoint('before_preferences');

            // Use default instead
            await conn.execute(
                'MATCH (u:User {id: $id}) CREATE (u)-[:PREFERS]->(:Category {name: "General"})',
                { id: 'user_001' }
            );
        }

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    }
}
```

## Streaming Large Results

### Using Async Iterators

```javascript
async function streamLargeDataset() {
    const conn = await client.connect();

    try {
        const stream = conn.stream(
            'MATCH (p:Product) RETURN p.id, p.name, p.price',
            {},
            { batchSize: 1000 }
        );

        let count = 0;
        for await (const row of stream) {
            // Process row
            await processProduct(row);
            count++;

            if (count % 10000 === 0) {
                console.log(`Processed ${count} products`);
            }
        }

        console.log(`Total: ${count} products`);
    } finally {
        await conn.close();
    }
}
```

### Streaming to File

```javascript
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');

async function exportToCSV(filename) {
    const conn = await client.connect();

    try {
        const queryStream = conn.stream(
            'MATCH (u:User) RETURN u.id, u.name, u.email'
        );

        const csvTransform = new Transform({
            objectMode: true,
            transform(row, encoding, callback) {
                const line = `${row.id},${row.name},${row.email}\n`;
                callback(null, line);
            }
        });

        const fileStream = fs.createWriteStream(filename);

        // Write header
        fileStream.write('id,name,email\n');

        // Stream data
        await pipeline(queryStream, csvTransform, fileStream);
    } finally {
        await conn.close();
    }
}
```

## Framework Integration

### Express.js

```javascript
const express = require('express');
const { Pool } = require('@geodedb/client');

const app = express();
const pool = new Pool({ host: 'localhost', port: 3141 });

// Middleware to attach connection
app.use(async (req, res, next) => {
    req.geode = await pool.acquire();
    res.on('finish', () => pool.release(req.geode));
    next();
});

// Route handlers
app.get('/users/:id', async (req, res) => {
    try {
        const { rows } = await req.geode.query(
            'MATCH (u:User {id: $id}) RETURN u',
            { id: req.params.id }
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/users/:id/friends', async (req, res) => {
    const { rows } = await req.geode.query(
        `MATCH (u:User {id: $id})-[:FRIENDS_WITH]->(f:User)
         RETURN f.id AS id, f.name AS name`,
        { id: req.params.id }
    );
    res.json(rows);
});

app.listen(3000);
```

### Fastify

```javascript
const fastify = require('fastify')();
const { Pool } = require('@geodedb/client');

// Register Geode plugin
fastify.register(async (fastify) => {
    const pool = new Pool({ host: 'localhost', port: 3141 });
    await pool.initialize();

    fastify.decorate('geode', pool);

    fastify.addHook('onClose', async () => {
        await pool.close();
    });
});

// Routes
fastify.get('/products', async (request, reply) => {
    const { category, minPrice, maxPrice } = request.query;

    const { rows } = await fastify.geode.query(
        `MATCH (p:Product)
         WHERE ($category IS NULL OR p.category = $category)
           AND ($minPrice IS NULL OR p.price >= $minPrice)
           AND ($maxPrice IS NULL OR p.price <= $maxPrice)
         RETURN p.id, p.name, p.price, p.category
         ORDER BY p.price`,
        { category, minPrice, maxPrice }
    );

    return rows;
});

fastify.listen({ port: 3000 });
```

### NestJS

```javascript
// geode.module.ts
import { Module, Global } from '@nestjs/common';
import { Pool } from '@geodedb/client';

@Global()
@Module({
    providers: [
        {
            provide: 'GEODE_POOL',
            useFactory: async () => {
                const pool = new Pool({
                    host: process.env.GEODE_HOST,
                    port: parseInt(process.env.GEODE_PORT),
                });
                await pool.initialize();
                return pool;
            },
        },
    ],
    exports: ['GEODE_POOL'],
})
export class GeodeModule {}

// users.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Pool } from '@geodedb/client';

@Injectable()
export class UsersService {
    constructor(@Inject('GEODE_POOL') private readonly pool: Pool) {}

    async findById(id: string) {
        const { rows } = await this.pool.query(
            'MATCH (u:User {id: $id}) RETURN u',
            { id }
        );
        return rows[0];
    }

    async findFriends(userId: string) {
        const { rows } = await this.pool.query(
            `MATCH (u:User {id: $id})-[:FRIENDS_WITH]->(f:User)
             RETURN f`,
            { id: userId }
        );
        return rows;
    }
}
```

## Error Handling

### Error Types

```javascript
const {
    GeodeError,
    ConnectionError,
    QueryError,
    TransactionError,
    TimeoutError,
} = require('@geodedb/client');

async function safeQuery(conn, query, params) {
    try {
        return await conn.query(query, params);
    } catch (err) {
        if (err instanceof ConnectionError) {
            console.error('Connection failed:', err.message);
            // Retry with new connection
        } else if (err instanceof QueryError) {
            console.error('Query failed:', err.code, err.message);
            // Log query details for debugging
        } else if (err instanceof TimeoutError) {
            console.error('Query timed out');
            // Consider increasing timeout or optimizing query
        } else {
            throw err;
        }
    }
}
```

### GQL Error Codes

```javascript
const { GqlErrorCode } = require('@geodedb/client');

try {
    await conn.query('INVALID SYNTAX');
} catch (err) {
    switch (err.code) {
        case GqlErrorCode.SYNTAX_ERROR:
            console.error('Invalid GQL syntax');
            break;
        case GqlErrorCode.CONSTRAINT_VIOLATION:
            console.error('Constraint violated');
            break;
        case GqlErrorCode.NOT_FOUND:
            console.error('Entity not found');
            break;
        default:
            console.error('Unknown error:', err.code);
    }
}
```

## Performance Best Practices

### Connection Reuse

```javascript
// Bad: New connection per request
app.get('/data', async (req, res) => {
    const conn = await client.connect();  // Expensive!
    const result = await conn.query('...');
    await conn.close();
    res.json(result);
});

// Good: Use connection pool
app.get('/data', async (req, res) => {
    const result = await pool.query('...');  // Reuses connection
    res.json(result);
});
```

### Batch Operations

```javascript
// Process items in batches
async function batchInsert(items, batchSize = 100) {
    const conn = await pool.acquire();
    try {
        await conn.beginTransaction();

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);

            await conn.execute(
                `UNWIND $items AS item
                 CREATE (p:Product {
                     id: item.id,
                     name: item.name,
                     price: item.price
                 })`,
                { items: batch }
            );
        }

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        pool.release(conn);
    }
}
```

## Related Topics

- **[TypeScript](/tags/typescript/)**: TypeScript type definitions and usage
- **[Node.js](/tags/nodejs/)**: Node.js specific patterns
- **[Client Libraries](/tags/client-libraries/)**: Overview of all client libraries
- **[Protocol](/tags/protocol/)**: Wire protocol specification
- **[Performance](/tags/performance/)**: Query optimization tips

## Further Reading

- **Node.js Client API Reference**: Complete API documentation
- **Express Integration Guide**: Building REST APIs with Geode
- **GraphQL Integration**: Using Geode as a GraphQL data source
- **Serverless Deployment**: Using Geode with AWS Lambda, Vercel
- **Testing Guide**: Unit and integration testing patterns

Browse the tagged content below for JavaScript and Node.js documentation, tutorials, and examples.
