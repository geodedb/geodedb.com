---
title: "Python Client Library - Async Geode Graph Database"
description: "Geode Python client with asyncio, QUIC + TLS 1.3 transport, connection pooling, and query builders for modern Python services."
keywords:
  - Python client
  - asyncio
  - Python SDK
  - geode-client
  - async database
  - Python graph database
  - QUIC protocol
  - connection pooling
params:
  seo:
    canonical: "https://geodedb.com/tags/python/"
    noindex: false
---

<!-- CANARY: REQ=REQ-CLIENT-PY-001; FEATURE="PythonClientConnection"; ASPECT=HelloHandshake; STATUS=IMPL; OWNER=clients; UPDATED=2025-02-14 -->

# Python Client Library

The Geode Python client is async-first and built on aioquic. It exposes a `Client` factory that creates `Connection` instances, plus `ConnectionPool`, query builders, and auth helpers.

## Quick Start

```python
from geode_client import Client

client = Client(host="localhost", port=3141)
async with client.connection() as conn:
    page, _ = await conn.query("MATCH (p:Person) RETURN p.name AS name")
    for row in page.rows:
        print(row["name"].as_string)
```

## Related Links

- [Python Client Docs](/docs/client-libraries/python-client/)
- [Client Libraries Overview](/docs/client-libraries/)
