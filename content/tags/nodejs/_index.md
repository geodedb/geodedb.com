---
title: "Node.js Client Library - TypeScript Graph Database Integration"
description: "Official Geode Node.js client with TypeScript-first APIs, QUIC + TLS 1.3 transport, connection pooling, query builders, and prepared statements for JavaScript and TypeScript services."
keywords:
  - Node.js client
  - TypeScript SDK
  - JavaScript graph database
  - Geode Node.js client
  - QUIC TLS
  - connection pooling
  - prepared statements
  - query builder
  - "@geode/client"
  - GQL driver
params:
  seo:
    canonical: "https://geodedb.com/tags/nodejs/"
    noindex: false
---

<!-- CANARY: REQ=REQ-CLIENT-NODEJS-001; FEATURE="NodejsClientConnect"; ASPECT=DSNParse; STATUS=IMPL; OWNER=clients; UPDATED=2025-02-14 -->

# Node.js Client Library

The Geode Node.js client delivers a TypeScript-first API for QUIC + TLS 1.3 access to Geode. It includes connection pooling, query builders, prepared statements, and transactional helpers designed for production JavaScript and TypeScript services.

## Install

```bash
npm install @geode/client
```

## Quick Start

```ts
import { createClient } from '@geode/client';

const client = await createClient('geode://localhost:3141');
const rows = await client.queryAll('RETURN 1 AS ok');
console.log(rows[0].ok);
```

## Related Links

- [Node.js Client Docs](/docs/client-libraries/nodejs-client/)
- [Client Libraries Overview](/docs/client-libraries/)
