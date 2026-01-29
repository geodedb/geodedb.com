---
title: "TypeScript Client Library - Type-Safe Geode Graph Database SDK"
description: "Complete TypeScript guide for Geode graph database. Learn about type-safe queries, generics, interfaces, connection pooling, and building type-safe graph applications."
keywords:
  - TypeScript client
  - type-safe queries
  - Geode TypeScript
  - graph database TypeScript
  - type definitions
  - generics
  - interfaces
  - Node.js TypeScript
  - GQL TypeScript
  - strongly typed
  - IntelliSense
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/typescript/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# TypeScript Client Library for Geode

The Geode TypeScript client provides full type safety for graph database operations. Built on the JavaScript client with complete type definitions, it enables IntelliSense support, compile-time error checking, and type-safe query results.

## Introduction

TypeScript brings significant advantages to Geode development:

- **Type-Safe Queries**: Catch errors at compile time, not runtime
- **IntelliSense Support**: Auto-completion for all API methods
- **Generic Result Types**: Define expected query result shapes
- **Interface Definitions**: Model your graph schema as TypeScript types
- **Refactoring Safety**: Rename properties with confidence

### Requirements

- Node.js 18.0 or later
- TypeScript 4.7 or later
- `@geodedb/client` package includes type definitions

## Installation

```bash
npm install @geodedb/client
# TypeScript types are bundled - no @types package needed
```

### tsconfig.json Configuration

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "outDir": "./dist"
    },
    "include": ["src/**/*"]
}
```

## Quick Start

### Basic Usage

```typescript
import { Client, Connection, QueryResult } from '@geodedb/client';

async function main(): Promise<void> {
    const client = new Client({
        host: 'localhost',
        port: 3141,
    });

    const conn: Connection = await client.connect();

    try {
        // Query with type inference
        const result = await conn.query<{ name: string; age: number }>(
            'MATCH (p:Person) RETURN p.name AS name, p.age AS age'
        );

        // TypeScript knows row shape
        for (const row of result.rows) {
            console.log(`${row.name}: ${row.age} years old`);
            // row.name is string
            // row.age is number
        }
    } finally {
        await conn.close();
    }
}

main();
```

## Type Definitions

### Defining Graph Schema Types

Model your graph schema as TypeScript interfaces:

```typescript
// Node types
interface Person {
    id: string;
    name: string;
    email: string;
    age: number;
    createdAt: Date;
}

interface Company {
    id: string;
    name: string;
    industry: string;
    foundedYear: number;
    headquarters: string;
}

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    inStock: boolean;
    tags: string[];
}

// Relationship types
interface WorksAt {
    since: Date;
    role: string;
    department: string;
}

interface Purchased {
    timestamp: Date;
    quantity: number;
    totalPrice: number;
}

interface Follows {
    since: Date;
    strength: number;
}
```

### Type-Safe Query Results

```typescript
// Define query result type
interface UserWithCompany {
    user: Person;
    company: Company;
    employment: WorksAt;
}

async function getUsersWithEmployment(
    conn: Connection
): Promise<UserWithCompany[]> {
    const result = await conn.query<UserWithCompany>(`
        MATCH (u:Person)-[e:WORKS_AT]->(c:Company)
        RETURN u AS user, c AS company, e AS employment
    `);

    return result.rows;
}

// Usage with full type safety
const employees = await getUsersWithEmployment(conn);
for (const { user, company, employment } of employees) {
    console.log(`${user.name} works at ${company.name} as ${employment.role}`);
    // All properties are typed correctly
}
```

### Nullable Properties

Handle optional properties with TypeScript unions:

```typescript
interface UserProfile {
    id: string;
    name: string;
    email: string;
    phone: string | null;      // Nullable
    bio: string | null;        // Nullable
    avatarUrl: string | null;  // Nullable
}

async function getProfile(conn: Connection, userId: string): Promise<UserProfile | null> {
    const result = await conn.query<UserProfile>(
        'MATCH (u:User {id: $id}) RETURN u.id AS id, u.name AS name, u.email AS email, u.phone AS phone, u.bio AS bio, u.avatarUrl AS avatarUrl',
        { id: userId }
    );

    return result.rows[0] ?? null;
}

// Safe access to nullable properties
const profile = await getProfile(conn, 'user_123');
if (profile) {
    console.log(`Name: ${profile.name}`);
    console.log(`Phone: ${profile.phone ?? 'Not provided'}`);
}
```

## Generic Query Functions

### Reusable Query Patterns

```typescript
// Generic find by ID function
async function findById<T>(
    conn: Connection,
    label: string,
    id: string
): Promise<T | null> {
    const result = await conn.query<{ node: T }>(
        `MATCH (n:${label} {id: $id}) RETURN n AS node`,
        { id }
    );
    return result.rows[0]?.node ?? null;
}

// Usage
const person = await findById<Person>(conn, 'Person', 'person_123');
const company = await findById<Company>(conn, 'Company', 'company_456');

// Generic find all function
async function findAll<T>(
    conn: Connection,
    label: string,
    options: { limit?: number; offset?: number } = {}
): Promise<T[]> {
    const { limit = 100, offset = 0 } = options;

    const result = await conn.query<{ node: T }>(
        `MATCH (n:${label})
         RETURN n AS node
         SKIP $offset
         LIMIT $limit`,
        { offset, limit }
    );

    return result.rows.map(row => row.node);
}

// Usage
const allProducts = await findAll<Product>(conn, 'Product', { limit: 50 });
```

### Generic Repository Pattern

```typescript
interface Repository<T> {
    findById(id: string): Promise<T | null>;
    findAll(options?: { limit?: number; offset?: number }): Promise<T[]>;
    create(data: Omit<T, 'id'>): Promise<T>;
    update(id: string, data: Partial<T>): Promise<T | null>;
    delete(id: string): Promise<boolean>;
}

function createRepository<T extends { id: string }>(
    conn: Connection,
    label: string
): Repository<T> {
    return {
        async findById(id: string): Promise<T | null> {
            const result = await conn.query<{ node: T }>(
                `MATCH (n:${label} {id: $id}) RETURN n AS node`,
                { id }
            );
            return result.rows[0]?.node ?? null;
        },

        async findAll(options = {}): Promise<T[]> {
            const { limit = 100, offset = 0 } = options;
            const result = await conn.query<{ node: T }>(
                `MATCH (n:${label}) RETURN n AS node SKIP $offset LIMIT $limit`,
                { offset, limit }
            );
            return result.rows.map(r => r.node);
        },

        async create(data: Omit<T, 'id'>): Promise<T> {
            const id = crypto.randomUUID();
            const result = await conn.query<{ node: T }>(
                `CREATE (n:${label} $props) SET n.id = $id RETURN n AS node`,
                { props: data, id }
            );
            return result.rows[0].node;
        },

        async update(id: string, data: Partial<T>): Promise<T | null> {
            const result = await conn.query<{ node: T }>(
                `MATCH (n:${label} {id: $id}) SET n += $props RETURN n AS node`,
                { id, props: data }
            );
            return result.rows[0]?.node ?? null;
        },

        async delete(id: string): Promise<boolean> {
            const result = await conn.execute(
                `MATCH (n:${label} {id: $id}) DELETE n`,
                { id }
            );
            return result.summary.nodesDeleted > 0;
        },
    };
}

// Usage
const userRepo = createRepository<Person>(conn, 'Person');
const productRepo = createRepository<Product>(conn, 'Product');

const user = await userRepo.findById('user_123');
const products = await productRepo.findAll({ limit: 10 });
```

## Connection Pool Types

### Typed Pool Configuration

```typescript
import { Pool, PoolConfig, Connection } from '@geodedb/client';

const poolConfig: PoolConfig = {
    host: 'localhost',
    port: 3141,
    minConnections: 5,
    maxConnections: 20,
    acquireTimeout: 5000,
    idleTimeout: 60000,
    maxLifetime: 3600000,
};

const pool = new Pool(poolConfig);
await pool.initialize();

// Type-safe pool operations
async function queryWithPool<T>(
    query: string,
    params?: Record<string, unknown>
): Promise<T[]> {
    return pool.withConnection(async (conn: Connection) => {
        const result = await conn.query<T>(query, params);
        return result.rows;
    });
}
```

### Pool Event Types

```typescript
import { Pool, PoolEvents, Connection } from '@geodedb/client';

const pool = new Pool(config);

// Typed event handlers
pool.on('connect', (conn: Connection) => {
    console.log('New connection:', conn.id);
});

pool.on('acquire', (conn: Connection) => {
    console.log('Connection acquired:', conn.id);
});

pool.on('release', (conn: Connection) => {
    console.log('Connection released:', conn.id);
});

pool.on('error', (err: Error, conn?: Connection) => {
    console.error('Pool error:', err.message);
    if (conn) {
        console.error('Connection:', conn.id);
    }
});
```

## Transaction Types

### Typed Transactions

```typescript
import { Connection, Transaction, TransactionOptions } from '@geodedb/client';

interface TransferResult {
    fromBalance: number;
    toBalance: number;
    amount: number;
}

async function transferFunds(
    conn: Connection,
    fromId: string,
    toId: string,
    amount: number
): Promise<TransferResult> {
    const txOptions: TransactionOptions = {
        isolation: 'serializable',
        timeout: 30000,
    };

    return conn.transaction(txOptions, async (tx: Transaction) => {
        // Get current balances
        const [from] = (await tx.query<{ balance: number }>(
            'MATCH (a:Account {id: $id}) RETURN a.balance AS balance',
            { id: fromId }
        )).rows;

        const [to] = (await tx.query<{ balance: number }>(
            'MATCH (a:Account {id: $id}) RETURN a.balance AS balance',
            { id: toId }
        )).rows;

        if (from.balance < amount) {
            throw new Error('Insufficient funds');
        }

        // Update balances
        await tx.execute(
            'MATCH (a:Account {id: $id}) SET a.balance = a.balance - $amount',
            { id: fromId, amount }
        );

        await tx.execute(
            'MATCH (a:Account {id: $id}) SET a.balance = a.balance + $amount',
            { id: toId, amount }
        );

        return {
            fromBalance: from.balance - amount,
            toBalance: to.balance + amount,
            amount,
        };
    });
}
```

## Error Types

### Typed Error Handling

```typescript
import {
    GeodeError,
    ConnectionError,
    QueryError,
    TransactionError,
    TimeoutError,
    GqlErrorCode,
} from '@geodedb/client';

async function safeQuery<T>(
    conn: Connection,
    query: string,
    params?: Record<string, unknown>
): Promise<{ data: T[] | null; error: string | null }> {
    try {
        const result = await conn.query<T>(query, params);
        return { data: result.rows, error: null };
    } catch (err) {
        if (err instanceof QueryError) {
            return {
                data: null,
                error: `Query error (${err.code}): ${err.message}`,
            };
        }
        if (err instanceof ConnectionError) {
            return {
                data: null,
                error: `Connection error: ${err.message}`,
            };
        }
        if (err instanceof TimeoutError) {
            return {
                data: null,
                error: 'Query timed out',
            };
        }
        throw err;
    }
}

// Type guard for specific errors
function isConstraintViolation(err: unknown): err is QueryError {
    return (
        err instanceof QueryError &&
        err.code === GqlErrorCode.CONSTRAINT_VIOLATION
    );
}

// Usage
try {
    await conn.execute('CREATE (u:User {email: $email})', { email });
} catch (err) {
    if (isConstraintViolation(err)) {
        console.error('Email already exists');
    } else {
        throw err;
    }
}
```

## Query Builder Types

### Type-Safe Query Builder

```typescript
import { QueryBuilder, Pattern, Direction } from '@geodedb/client';

interface QueryBuilderResult<T> {
    query: string;
    params: Record<string, unknown>;
    _phantom?: T;  // Type marker
}

function buildUserFriendsQuery(
    userId: string,
    options: { limit?: number; minStrength?: number } = {}
): QueryBuilderResult<{ friend: Person; since: Date }> {
    const builder = new QueryBuilder()
        .match(
            Pattern.node('u', 'User', { id: userId })
                .relationship('f', 'FOLLOWS', Direction.OUTGOING)
                .node('friend', 'User')
        )
        .where('f.strength >= $minStrength')
        .return('friend', 'f.since AS since')
        .orderBy('f.since DESC')
        .limit(options.limit ?? 10);

    return {
        query: builder.build(),
        params: { minStrength: options.minStrength ?? 0 },
    };
}

// Usage with type inference
const { query, params } = buildUserFriendsQuery('user_123', {
    limit: 20,
    minStrength: 5,
});

const result = await conn.query<{ friend: Person; since: Date }>(query, params);
```

## Utility Types

### Helper Types for Graph Operations

```typescript
// Node with all properties optional except id
type NodeUpdate<T> = { id: string } & Partial<Omit<T, 'id'>>;

// Relationship with typed endpoints
interface Relationship<S, T, R> {
    source: S;
    target: T;
    properties: R;
}

// Query result with metadata
interface QueryResultWithMeta<T> {
    rows: T[];
    schema: FieldSchema[];
    timing: {
        planningMs: number;
        executionMs: number;
    };
}

// Pagination types
interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

async function paginate<T>(
    conn: Connection,
    query: string,
    countQuery: string,
    params: Record<string, unknown>,
    page: number = 1,
    pageSize: number = 20
): Promise<PaginatedResult<T>> {
    const offset = (page - 1) * pageSize;

    const [dataResult, countResult] = await Promise.all([
        conn.query<T>(`${query} SKIP $offset LIMIT $pageSize`, {
            ...params,
            offset,
            pageSize,
        }),
        conn.query<{ total: number }>(countQuery, params),
    ]);

    const total = countResult.rows[0]?.total ?? 0;

    return {
        items: dataResult.rows,
        total,
        page,
        pageSize,
        hasMore: offset + dataResult.rows.length < total,
    };
}
```

### Discriminated Unions for Node Types

```typescript
// Base node interface
interface BaseNode {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

// Specific node types
interface PersonNode extends BaseNode {
    __typename: 'Person';
    name: string;
    email: string;
    age: number;
}

interface CompanyNode extends BaseNode {
    __typename: 'Company';
    name: string;
    industry: string;
}

interface ProductNode extends BaseNode {
    __typename: 'Product';
    name: string;
    price: number;
}

// Union type for any node
type AnyNode = PersonNode | CompanyNode | ProductNode;

// Type guard functions
function isPerson(node: AnyNode): node is PersonNode {
    return node.__typename === 'Person';
}

function isCompany(node: AnyNode): node is CompanyNode {
    return node.__typename === 'Company';
}

function isProduct(node: AnyNode): node is ProductNode {
    return node.__typename === 'Product';
}

// Usage
async function searchNodes(conn: Connection, term: string): Promise<AnyNode[]> {
    const result = await conn.query<{ node: AnyNode }>(`
        MATCH (n)
        WHERE n.name CONTAINS $term
        RETURN n AS node, labels(n)[0] AS __typename
    `, { term });

    return result.rows.map(r => r.node);
}

const nodes = await searchNodes(conn, 'tech');
for (const node of nodes) {
    if (isPerson(node)) {
        console.log(`Person: ${node.name}, ${node.email}`);
    } else if (isCompany(node)) {
        console.log(`Company: ${node.name}, ${node.industry}`);
    } else if (isProduct(node)) {
        console.log(`Product: ${node.name}, $${node.price}`);
    }
}
```

## Framework Integration

### NestJS with TypeScript

```typescript
// geode.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, Connection } from '@geodedb/client';

@Injectable()
export class GeodeService implements OnModuleInit, OnModuleDestroy {
    private pool!: Pool;

    async onModuleInit(): Promise<void> {
        this.pool = new Pool({
            host: process.env.GEODE_HOST!,
            port: parseInt(process.env.GEODE_PORT!, 10),
        });
        await this.pool.initialize();
    }

    async onModuleDestroy(): Promise<void> {
        await this.pool.close();
    }

    async query<T>(
        query: string,
        params?: Record<string, unknown>
    ): Promise<T[]> {
        return this.pool.withConnection(async (conn) => {
            const result = await conn.query<T>(query, params);
            return result.rows;
        });
    }

    async execute(
        query: string,
        params?: Record<string, unknown>
    ): Promise<void> {
        await this.pool.withConnection(async (conn) => {
            await conn.execute(query, params);
        });
    }
}

// users.service.ts
@Injectable()
export class UsersService {
    constructor(private readonly geode: GeodeService) {}

    async findById(id: string): Promise<Person | null> {
        const users = await this.geode.query<Person>(
            'MATCH (u:User {id: $id}) RETURN u',
            { id }
        );
        return users[0] ?? null;
    }

    async findFriends(userId: string): Promise<Person[]> {
        return this.geode.query<Person>(`
            MATCH (u:User {id: $id})-[:FRIENDS_WITH]->(f:User)
            RETURN f
        `, { id: userId });
    }
}
```

## Related Topics

- **[JavaScript](/tags/javascript/)**: JavaScript client usage
- **[Node.js](/tags/nodejs/)**: Node.js patterns and frameworks
- **[Client Libraries](/tags/client-libraries/)**: Overview of all clients
- **[API Reference](/tags/api-reference/)**: Complete API documentation
- **[Type Safety](/tags/type-safety/)**: Type system best practices

## Further Reading

- **TypeScript API Reference**: Complete type definitions
- **Generic Patterns Guide**: Advanced TypeScript patterns for Geode
- **NestJS Integration**: Building NestJS applications with Geode
- **Testing TypeScript**: Type-safe testing strategies
- **Migration from JavaScript**: Converting JS projects to TypeScript

Browse the tagged content below for TypeScript documentation, tutorials, and examples.
