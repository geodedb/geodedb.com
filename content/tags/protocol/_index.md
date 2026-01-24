---
title: "Wire Protocol & Communication"
description: "Understand Geode's wire protocol and communication layer. Learn about QUIC+TLS transport, JSON line protocol, message types, connection management, and how to implement custom clients."
keywords:
  - wire protocol
  - QUIC protocol
  - TLS 1.3
  - JSON line protocol
  - network communication
  - Geode
  - graph database
  - client-server protocol
  - message format
  - binary protocol
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/protocol/"
    noindex: false
---

Geode uses a modern, efficient wire protocol built on QUIC+TLS 1.3 transport with JSON line messaging. This design provides security, performance, and simplicity while maintaining compatibility across all client libraries.

## Transport Layer

### QUIC Protocol

Geode exclusively uses QUIC (Quick UDP Internet Connections) for transport.

**Advantages over TCP:**
- Reduced connection establishment latency (0-RTT)
- Built-in multiplexing (no head-of-line blocking)
- Connection migration (survives network changes)
- Improved congestion control

**Port:** 3141 (standard) or 8443 (alternative)

**No TCP Fallback:** Geode requires QUIC support. Clients must use QUIC libraries.

### TLS 1.3 Security

All connections are encrypted using TLS 1.3.

**Certificate Configuration:**

```bash
# Generate self-signed certificate for development
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout geode-key.pem \
  -out geode-cert.pem \
  -days 365 \
  -subj "/CN=localhost"

# Start Geode with TLS
./geode serve \
  --tls-cert geode-cert.pem \
  --tls-key geode-key.pem \
  --listen 0.0.0.0:3141
```

**Production Deployment:**

```bash
# Use Let's Encrypt certificates
./geode serve \
  --tls-cert /etc/letsencrypt/live/geode.example.com/fullchain.pem \
  --tls-key /etc/letsencrypt/live/geode.example.com/privkey.pem \
  --listen 0.0.0.0:3141
```

**Client Certificate Verification:**

```toml
# geode.toml
[tls]
cert = "/path/to/server-cert.pem"
key = "/path/to/server-key.pem"
client_ca = "/path/to/client-ca.pem"  # For mTLS
verify_client = true
```

## Message Format

### JSON Line Protocol

Messages are newline-delimited JSON objects (one per line).

**Format:**
```
{"type": "MESSAGE_TYPE", ...fields}\n
```

**Example Session:**
```json
C: {"type": "HELLO", "version": "1.0", "client": "geode-client-go/0.18.0"}
S: {"type": "HELLO", "version": "1.0", "server": "geode/0.18.0"}

C: {"type": "RUN_GQL", "query": "MATCH (n) RETURN n LIMIT 1", "params": {}}
S: {"type": "SCHEMA", "fields": ["n"]}
S: {"type": "BINDINGS", "values": [{"id": 1, "labels": ["Person"], "properties": {"name": "Alice"}}]}
S: {"type": "SUCCESS", "rows": 1}
```

### Message Types

**Client Messages:**

**HELLO** - Connection handshake
```json
{
  "type": "HELLO",
  "version": "1.0",
  "client": "client-name/version",
  "capabilities": ["transactions", "savepoints"]
}
```

**RUN_GQL** - Execute GQL query
```json
{
  "type": "RUN_GQL",
  "query": "MATCH (u:User {email: $email}) RETURN u",
  "params": {"email": "alice@example.com"}
}
```

**BEGIN** - Start transaction
```json
{
  "type": "BEGIN",
  "isolation_level": "read_committed"
}
```

**COMMIT** - Commit transaction
```json
{
  "type": "COMMIT"
}
```

**ROLLBACK** - Rollback transaction
```json
{
  "type": "ROLLBACK",
  "savepoint": "optional_savepoint_name"
}
```

**PING** - Keep-alive
```json
{
  "type": "PING"
}
```

**Server Messages:**

**HELLO** - Handshake response
```json
{
  "type": "HELLO",
  "version": "1.0",
  "server": "geode/0.18.0",
  "capabilities": ["transactions", "savepoints", "vector_ops"]
}
```

**SCHEMA** - Query result schema
```json
{
  "type": "SCHEMA",
  "fields": ["u.name", "u.email", "u.age"]
}
```

**BINDINGS** - Result row
```json
{
  "type": "BINDINGS",
  "values": ["Alice Smith", "alice@example.com", 30]
}
```

**SUCCESS** - Query completed successfully
```json
{
  "type": "SUCCESS",
  "rows": 42,
  "duration_ms": 15
}
```

**ERROR** - Error occurred
```json
{
  "type": "ERROR",
  "code": "42000",
  "message": "Syntax error at position 10",
  "position": 10,
  "query": "MATCH (n RETURN n"
}
```

**EXPLAIN** - Query execution plan
```json
{
  "type": "EXPLAIN",
  "plan": {
    "steps": [
      {"operation": "IndexLookup", "cost": 1.0},
      {"operation": "Expand", "cost": 10.5}
    ]
  }
}
```

**PROFILE** - Query performance profile
```json
{
  "type": "PROFILE",
  "execution_time_ms": 15,
  "steps": [
    {"operation": "IndexLookup", "time_ms": 2, "rows": 1},
    {"operation": "Expand", "time_ms": 8, "rows": 45}
  ]
}
```

**PONG** - Ping response
```json
{
  "type": "PONG"
}
```

## Connection Lifecycle

### Connection Establishment

1. **Client initiates QUIC connection** to server
2. **TLS 1.3 handshake** completes
3. **Client sends HELLO** message with capabilities
4. **Server responds with HELLO** confirming capabilities
5. **Connection ready** for queries

**Example (Python):**
```python
import asyncio
import aioquic

async def connect_to_geode():
    # Establish QUIC connection
    connection = await aioquic.connect(
        host="localhost",
        port=3141,
        verify_mode=ssl.CERT_REQUIRED
    )

    # Send HELLO
    await connection.send(json.dumps({
        "type": "HELLO",
        "version": "1.0",
        "client": "custom-client/1.0"
    }) + "\n")

    # Receive HELLO response
    response = await connection.receive()
    hello = json.loads(response)

    return connection
```

### Query Execution Flow

1. **Client sends RUN_GQL** with query and parameters
2. **Server sends SCHEMA** with result field names
3. **Server sends BINDINGS** for each result row (streamed)
4. **Server sends SUCCESS** when complete (or ERROR if failed)

**Example:**
```python
async def execute_query(connection, query, params):
    # Send query
    await connection.send(json.dumps({
        "type": "RUN_GQL",
        "query": query,
        "params": params
    }) + "\n")

    # Receive schema
    schema_msg = json.loads(await connection.receive())
    fields = schema_msg["fields"]

    # Receive result rows
    rows = []
    while True:
        msg = json.loads(await connection.receive())

        if msg["type"] == "BINDINGS":
            row = dict(zip(fields, msg["values"]))
            rows.append(row)
        elif msg["type"] == "SUCCESS":
            break
        elif msg["type"] == "ERROR":
            raise Exception(f"Query error: {msg['message']}")

    return rows
```

### Transaction Management

**Begin Transaction:**
```json
C: {"type": "BEGIN"}
S: {"type": "SUCCESS", "transaction_id": "tx-12345"}

C: {"type": "RUN_GQL", "query": "CREATE (:User {name: $name})", "params": {"name": "Bob"}}
S: {"type": "SUCCESS", "rows": 0}

C: {"type": "COMMIT"}
S: {"type": "SUCCESS"}
```

**Rollback Example:**
```json
C: {"type": "BEGIN"}
S: {"type": "SUCCESS", "transaction_id": "tx-12345"}

C: {"type": "RUN_GQL", "query": "CREATE (:User {name: $name})", "params": {"name": "Bob"}}
S: {"type": "SUCCESS"}

C: {"type": "ROLLBACK"}
S: {"type": "SUCCESS"}
```

**Savepoints:**
```json
C: {"type": "BEGIN"}
S: {"type": "SUCCESS", "transaction_id": "tx-12345"}

C: {"type": "SAVEPOINT", "name": "sp1"}
S: {"type": "SUCCESS"}

C: {"type": "RUN_GQL", "query": "..."}
S: {"type": "SUCCESS"}

C: {"type": "ROLLBACK", "savepoint": "sp1"}
S: {"type": "SUCCESS"}

C: {"type": "COMMIT"}
S: {"type": "SUCCESS"}
```

### Connection Termination

**Graceful Shutdown:**
```json
C: {"type": "GOODBYE"}
S: {"type": "GOODBYE"}
```

**Server-Initiated:**
```json
S: {"type": "ERROR", "code": "08000", "message": "Server shutting down"}
```

## Error Codes

Geode uses ISO/IEC 39075:2024 GQL status codes.

### Common Error Codes

**42000** - Syntax Error
```json
{
  "type": "ERROR",
  "code": "42000",
  "message": "Syntax error: unexpected token 'FROM'",
  "position": 15
}
```

**22000** - Data Exception
```json
{
  "type": "ERROR",
  "code": "22000",
  "message": "Type mismatch: expected Integer, got String"
}
```

**40000** - Transaction Rollback
```json
{
  "type": "ERROR",
  "code": "40000",
  "message": "Transaction rolled back due to constraint violation"
}
```

**08000** - Connection Exception
```json
{
  "type": "ERROR",
  "code": "08000",
  "message": "Connection closed by server"
}
```

## Implementing Custom Clients

### Minimal Client Example (Python)

```python
import asyncio
import json
from aioquic.asyncio import connect
from aioquic.quic.configuration import QuicConfiguration

class GeodeClient:
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.connection = None

    async def connect(self):
        # Configure QUIC
        config = QuicConfiguration(is_client=True)
        config.verify_mode = ssl.CERT_NONE  # For development only

        # Establish connection
        async with connect(self.host, self.port, configuration=config) as connection:
            self.connection = connection

            # Send HELLO
            await self.send({"type": "HELLO", "version": "1.0", "client": "minimal-client/0.1"})

            # Receive HELLO
            response = await self.receive()
            assert response["type"] == "HELLO"

    async def send(self, message):
        data = json.dumps(message) + "\n"
        await self.connection.send(data.encode())

    async def receive(self):
        data = await self.connection.receive()
        return json.loads(data.decode())

    async def query(self, gql, params=None):
        # Send query
        await self.send({
            "type": "RUN_GQL",
            "query": gql,
            "params": params or {}
        })

        # Receive schema
        schema_msg = await self.receive()
        fields = schema_msg["fields"]

        # Receive results
        results = []
        while True:
            msg = await self.receive()

            if msg["type"] == "BINDINGS":
                row = dict(zip(fields, msg["values"]))
                results.append(row)
            elif msg["type"] == "SUCCESS":
                break
            elif msg["type"] == "ERROR":
                raise Exception(f"Query error: {msg['message']}")

        return results

# Usage
async def main():
    client = GeodeClient("localhost", 3141)
    await client.connect()

    results = await client.query(
        "MATCH (u:User) WHERE u.email = $email RETURN u",
        {"email": "alice@example.com"}
    )

    for row in results:
        print(row)

asyncio.run(main())
```

## Performance Optimization

### Connection Pooling

Reuse connections to avoid handshake overhead:

```python
class ConnectionPool:
    def __init__(self, host, port, size=10):
        self.host = host
        self.port = port
        self.size = size
        self.pool = asyncio.Queue(maxsize=size)

    async def initialize(self):
        for _ in range(self.size):
            conn = await create_connection(self.host, self.port)
            await self.pool.put(conn)

    async def acquire(self):
        return await self.pool.get()

    async def release(self, conn):
        await self.pool.put(conn)
```

### Batch Queries

Send multiple queries in pipeline:

```python
# Pipeline queries for reduced latency
await connection.send(query1_msg)
await connection.send(query2_msg)
await connection.send(query3_msg)

# Receive responses
result1 = await receive_result(connection)
result2 = await receive_result(connection)
result3 = await receive_result(connection)
```

### Streaming Large Results

Process rows as they arrive:

```python
async def stream_results(connection, query):
    await connection.send(run_gql_msg)

    schema = await receive_schema(connection)

    async for row in receive_rows(connection):
        yield row  # Process immediately, don't buffer
```

## Protocol Versioning

Geode supports protocol version negotiation.

**Client requests version:**
```json
{"type": "HELLO", "version": "1.0"}
```

**Server responds with supported version:**
```json
{"type": "HELLO", "version": "1.0"}
```

**If version mismatch:**
```json
{
  "type": "ERROR",
  "code": "08004",
  "message": "Unsupported protocol version",
  "supported_versions": ["1.0", "1.1"]
}
```

## Best Practices

### Always Use Parameterized Queries

Prevent injection and enable query plan caching:

```json
// Good
{"type": "RUN_GQL", "query": "MATCH (u:User {email: $email}) RETURN u", "params": {"email": "user@example.com"}}

// Bad - never concatenate user input
{"type": "RUN_GQL", "query": "MATCH (u:User {email: 'user@example.com'}) RETURN u", "params": {}}
```

### Handle Errors Gracefully

Always check message type before processing:

```python
msg = await receive()
if msg["type"] == "ERROR":
    handle_error(msg)
elif msg["type"] == "BINDINGS":
    process_row(msg)
```

### Implement Connection Keep-Alive

Send periodic PING to prevent idle timeout:

```python
async def keep_alive(connection):
    while True:
        await asyncio.sleep(30)
        await connection.send({"type": "PING"})
        pong = await connection.receive()
        assert pong["type"] == "PONG"
```

### Use Transactions for Consistency

Group related operations in transactions:

```python
await connection.send({"type": "BEGIN"})
await connection.send({"type": "RUN_GQL", "query": "...", "params": {}})
await connection.send({"type": "RUN_GQL", "query": "...", "params": {}})
await connection.send({"type": "COMMIT"})
```

Geode's wire protocol balances simplicity, performance, and security. The JSON line format is human-readable for debugging while QUIC+TLS provides modern transport efficiency and security. All official client libraries implement this protocol consistently, ensuring reliable cross-language compatibility.
