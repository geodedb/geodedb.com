---
title: "Go Client Library - database/sql Driver for Geode"
description: "Geode Go client provides a production-ready database/sql driver with QUIC + TLS transport, prepared statements, and connection pooling."
keywords:
  - Go client
  - database/sql driver
  - Geode Go client
  - graph database Go
  - QUIC TLS
  - GQL driver
params:
  seo:
    canonical: "https://geodedb.com/tags/go/"
    noindex: false
---

<!-- CANARY: REQ=REQ-GQL-UNICODE-012; FEATURE="UTF-8 -> UTF-16 Conversion"; ASPECT=ClientWrapperGo; STATUS=IMPL; TEST=TestCANARY_ClientGo_Utf8Utf16RoundTrip; OWNER=clients; UPDATED=2025-09-27 -->
<!-- CANARY: REQ=REQ-GQL-UNICODE-013; FEATURE="UTF-16 -> UTF-8 Conversion"; ASPECT=ClientWrapperGo; STATUS=IMPL; TEST=TestCANARY_ClientGo_Utf8Utf16RoundTrip; OWNER=clients; UPDATED=2025-09-27 -->
<!-- CANARY: REQ=REQ-GQL-UNICODE-014; FEATURE="WTF-8 Lossy Decode"; ASPECT=ClientWrapperGo; STATUS=IMPL; TEST=TestCANARY_ClientGo_Wtf8Lossy; OWNER=clients; UPDATED=2025-09-27 -->

# Go Client Library

The Geode Go client is a `database/sql` driver that uses QUIC + TLS 1.3. It supports prepared statements, transactions, and pooling via the standard Go database APIs.

## Quick Start

```go
import (
    "database/sql"

    _ "geodedb.com/geode"
)

db, err := sql.Open("geode", "localhost:3141")
```

## DSN Options

Supported options: `page_size`, `hello_name`, `hello_ver`, `conformance`, `ca`, `cert`, `key`, `insecure`.

## Related Links

- [Go Client Docs](/docs/client-libraries/go-client/)
- [Client Libraries Overview](/docs/client-libraries/)
