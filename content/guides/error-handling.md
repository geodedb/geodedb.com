---
title: "Error Handling Guide"
slug: "error-handling"
description: "Comprehensive guide to handling errors in Geode applications including error codes, retry strategies, and best practices"
weight: 41
tags: ["errors", "error-handling", "debugging", "retry", "logging"]
categories: ["guides", "development"]
keywords:
  - Geode error handling
  - graph database errors
  - GQL error codes
  - connection errors
  - query errors
  - transaction errors
  - retry strategies
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Error Handling Guide

Robust error handling is essential for building reliable applications with Geode. This guide covers understanding error codes, handling different error types, implementing retry strategies, and logging best practices.

## Understanding Geode Error Codes

Geode uses ISO/IEC 39075:2024 GQL standard error codes for consistent error reporting across all client libraries.

### Error Code Structure

Error codes follow the format: `GQL-XXXXX` where:
- First two digits indicate the error category
- Last three digits indicate the specific error

### Error Categories

| Category | Range | Description |
|----------|-------|-------------|
| Connection | 00xxx | Connection and transport errors |
| Authentication | 01xxx | Authentication and authorization errors |
| Syntax | 02xxx | Query syntax errors |
| Semantic | 03xxx | Query semantic errors |
| Constraint | 04xxx | Constraint violation errors |
| Transaction | 05xxx | Transaction errors |
| Resource | 06xxx | Resource limit errors |
| Internal | 99xxx | Internal server errors |

### Common Error Codes

| Code | Name | Description |
|------|------|-------------|
| GQL-00001 | CONNECTION_REFUSED | Cannot connect to server |
| GQL-00002 | CONNECTION_TIMEOUT | Connection timed out |
| GQL-00003 | CONNECTION_CLOSED | Connection closed unexpectedly |
| GQL-01001 | AUTHENTICATION_FAILED | Invalid credentials |
| GQL-01002 | AUTHORIZATION_DENIED | Insufficient permissions |
| GQL-02001 | SYNTAX_ERROR | Invalid query syntax |
| GQL-02002 | UNKNOWN_FUNCTION | Unknown function called |
| GQL-03001 | UNKNOWN_LABEL | Referenced label does not exist |
| GQL-03002 | UNKNOWN_PROPERTY | Referenced property does not exist |
| GQL-03003 | TYPE_MISMATCH | Type mismatch in expression |
| GQL-04001 | UNIQUE_CONSTRAINT_VIOLATION | Unique constraint violated |
| GQL-04002 | NOT_NULL_VIOLATION | NOT NULL constraint violated |
| GQL-04003 | CHECK_CONSTRAINT_VIOLATION | Check constraint violated |
| GQL-05001 | TRANSACTION_NOT_FOUND | Transaction does not exist |
| GQL-05002 | TRANSACTION_ALREADY_STARTED | Transaction already active |
| GQL-05003 | DEADLOCK_DETECTED | Deadlock detected |
| GQL-05004 | SERIALIZATION_FAILURE | Serialization failure |
| GQL-06001 | MEMORY_LIMIT_EXCEEDED | Memory limit exceeded |
| GQL-06002 | QUERY_TIMEOUT | Query execution timed out |
| GQL-99001 | INTERNAL_ERROR | Internal server error |

## Handling Connection Errors

Connection errors occur when the client cannot establish or maintain a connection to the server.

### Connection Error Types

{{< tabs >}}
{{< tab "Go" >}}
```go
package main

import (
    "context"
    "database/sql"
    "errors"
    "fmt"
    "log"
    "net"
    "time"

    geode "geodedb.com/geode"
)

func connectWithRetry(dsn string, maxRetries int) (*sql.DB, error) {
    var db *sql.DB
    var err error

    for attempt := 1; attempt <= maxRetries; attempt++ {
        db, err = sql.Open("geode", dsn)
        if err != nil {
            log.Printf("Attempt %d: Failed to open connection: %v", attempt, err)
            time.Sleep(time.Duration(attempt) * time.Second)
            continue
        }

        // Test connection
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        err = db.PingContext(ctx)
        cancel()

        if err == nil {
            log.Printf("Connected successfully on attempt %d", attempt)
            return db, nil
        }

        // Handle specific connection errors
        var netErr net.Error
        if errors.As(err, &netErr) {
            if netErr.Timeout() {
                log.Printf("Attempt %d: Connection timeout", attempt)
            } else {
                log.Printf("Attempt %d: Network error: %v", attempt, err)
            }
        } else {
            log.Printf("Attempt %d: Connection error: %v", attempt, err)
        }

        db.Close()
        time.Sleep(time.Duration(attempt) * time.Second)
    }

    return nil, fmt.Errorf("failed to connect after %d attempts: %w", maxRetries, err)
}

func handleConnectionError(err error) {
    var geodeErr *geode.Error
    if errors.As(err, &geodeErr) {
        switch geodeErr.Code {
        case "GQL-00001":
            log.Println("Connection refused - is Geode server running?")
        case "GQL-00002":
            log.Println("Connection timeout - check network connectivity")
        case "GQL-00003":
            log.Println("Connection closed - server may have restarted")
        default:
            log.Printf("Connection error: %s - %s", geodeErr.Code, geodeErr.Message)
        }
    } else {
        log.Printf("Unknown error: %v", err)
    }
}

func main() {
    db, err := connectWithRetry("localhost:3141", 5)
    if err != nil {
        handleConnectionError(err)
        return
    }
    defer db.Close()

    // Use connection...
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import asyncio
import logging
from typing import Optional
from geode_client import Client, GeodeError, ConnectionError, TimeoutError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def connect_with_retry(
    host: str,
    port: int,
    max_retries: int = 5,
    base_delay: float = 1.0
) -> Optional[Client]:
    """Connect to Geode with exponential backoff retry."""
    client = Client(host=host, port=port, skip_verify=True)

    for attempt in range(1, max_retries + 1):
        try:
            async with client.connection() as conn:
                # Test connection with ping
                await conn.query("RETURN 1")
                logger.info(f"Connected successfully on attempt {attempt}")
                return client

        except ConnectionError as e:
            logger.warning(f"Attempt {attempt}: Connection refused - {e}")
        except TimeoutError as e:
            logger.warning(f"Attempt {attempt}: Connection timeout - {e}")
        except GeodeError as e:
            logger.warning(f"Attempt {attempt}: Geode error {e.code} - {e.message}")
        except Exception as e:
            logger.warning(f"Attempt {attempt}: Unexpected error - {e}")

        if attempt < max_retries:
            delay = base_delay * (2 ** (attempt - 1))  # Exponential backoff
            logger.info(f"Retrying in {delay} seconds...")
            await asyncio.sleep(delay)

    logger.error(f"Failed to connect after {max_retries} attempts")
    return None


def handle_connection_error(error: Exception) -> None:
    """Handle and log connection errors appropriately."""
    if isinstance(error, GeodeError):
        error_handlers = {
            "GQL-00001": "Connection refused - is Geode server running?",
            "GQL-00002": "Connection timeout - check network connectivity",
            "GQL-00003": "Connection closed - server may have restarted",
        }
        message = error_handlers.get(error.code, f"Connection error: {error.message}")
        logger.error(message)
    elif isinstance(error, ConnectionError):
        logger.error(f"Connection error: {error}")
    elif isinstance(error, TimeoutError):
        logger.error(f"Timeout error: {error}")
    else:
        logger.error(f"Unknown error: {error}")


async def main():
    client = await connect_with_retry("localhost", 3141)

    if client is None:
        return

    try:
        async with client.connection() as conn:
            # Use connection
            result, _ = await conn.query("MATCH (n) RETURN count(n)")
            print(f"Node count: {result.rows[0]['count(n)'].as_int}")
    except Exception as e:
        handle_connection_error(e)


if __name__ == "__main__":
    asyncio.run(main())
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::{Client, Error, ErrorCode};
use std::time::Duration;
use tokio::time::sleep;
use tracing::{error, info, warn};

async fn connect_with_retry(
    host: &str,
    port: u16,
    max_retries: u32,
) -> Result<Client, Error> {
    let mut last_error = None;

    for attempt in 1..=max_retries {
        match Client::new(host, port).skip_verify(true).connect().await {
            Ok(conn) => {
                info!("Connected successfully on attempt {}", attempt);
                return Ok(Client::new(host, port).skip_verify(true));
            }
            Err(e) => {
                warn!("Attempt {}: Connection failed - {:?}", attempt, e);
                last_error = Some(e);

                if attempt < max_retries {
                    let delay = Duration::from_secs(2u64.pow(attempt - 1));
                    info!("Retrying in {:?}...", delay);
                    sleep(delay).await;
                }
            }
        }
    }

    Err(last_error.unwrap_or(Error::ConnectionRefused))
}

fn handle_connection_error(error: &Error) {
    match error.code() {
        Some(ErrorCode::ConnectionRefused) => {
            error!("Connection refused - is Geode server running?");
        }
        Some(ErrorCode::ConnectionTimeout) => {
            error!("Connection timeout - check network connectivity");
        }
        Some(ErrorCode::ConnectionClosed) => {
            error!("Connection closed - server may have restarted");
        }
        Some(code) => {
            error!("Connection error {:?}: {}", code, error);
        }
        None => {
            error!("Unknown connection error: {}", error);
        }
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::init();

    match connect_with_retry("127.0.0.1", 3141, 5).await {
        Ok(client) => {
            // Use client
            match client.connect().await {
                Ok(mut conn) => {
                    let (page, _) = conn.query("MATCH (n) RETURN count(n)").await.unwrap();
                    println!("Node count: {:?}", page.rows);
                }
                Err(e) => handle_connection_error(&e),
            }
        }
        Err(e) => {
            handle_connection_error(&e);
        }
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { createClient, GeodeClient, GeodeError } from '@geodedb/client';

const logger = {
    info: (msg: string) => console.log(`[INFO] ${msg}`),
    warn: (msg: string) => console.warn(`[WARN] ${msg}`),
    error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

async function connectWithRetry(
    url: string,
    maxRetries: number = 5,
    baseDelay: number = 1000
): Promise<GeodeClient | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const client = await createClient(url);
            // Test connection
            await client.queryAll('RETURN 1');
            logger.info(`Connected successfully on attempt ${attempt}`);
            return client;
        } catch (error) {
            lastError = error as Error;

            if (error instanceof GeodeError) {
                logger.warn(`Attempt ${attempt}: Geode error ${error.code} - ${error.message}`);
            } else {
                logger.warn(`Attempt ${attempt}: ${error}`);
            }

            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                logger.info(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    logger.error(`Failed to connect after ${maxRetries} attempts`);
    return null;
}

function handleConnectionError(error: unknown): void {
    if (error instanceof GeodeError) {
        const errorMessages: Record<string, string> = {
            'GQL-00001': 'Connection refused - is Geode server running?',
            'GQL-00002': 'Connection timeout - check network connectivity',
            'GQL-00003': 'Connection closed - server may have restarted',
        };

        const message = errorMessages[error.code] || `Connection error: ${error.message}`;
        logger.error(message);
    } else if (error instanceof Error) {
        logger.error(`Error: ${error.message}`);
    } else {
        logger.error(`Unknown error: ${error}`);
    }
}

async function main() {
    const client = await connectWithRetry('geode://localhost:3141');

    if (!client) {
        return;
    }

    try {
        const rows = await client.queryAll('MATCH (n) RETURN count(n)');
        console.log('Node count:', rows[0].get('count(n)')?.asNumber);
    } catch (error) {
        handleConnectionError(error);
    } finally {
        await client.close();
    }
}

main();
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const geode = @import("geode_client");

const Logger = struct {
    pub fn info(comptime fmt: []const u8, args: anytype) void {
        std.debug.print("[INFO] " ++ fmt ++ "\n", args);
    }

    pub fn warn(comptime fmt: []const u8, args: anytype) void {
        std.debug.print("[WARN] " ++ fmt ++ "\n", args);
    }

    pub fn err(comptime fmt: []const u8, args: anytype) void {
        std.debug.print("[ERROR] " ++ fmt ++ "\n", args);
    }
};

pub fn connectWithRetry(
    allocator: std.mem.Allocator,
    host: []const u8,
    port: u16,
    max_retries: u32,
) !geode.GeodeClient {
    var last_error: ?anyerror = null;

    var attempt: u32 = 1;
    while (attempt <= max_retries) : (attempt += 1) {
        var client = geode.GeodeClient.init(allocator, host, port, true);

        client.connect() catch |e| {
            Logger.warn("Attempt {d}: Connection failed - {any}", .{ attempt, e });
            last_error = e;

            if (attempt < max_retries) {
                const delay_ms = std.math.pow(u64, 2, attempt - 1) * 1000;
                Logger.info("Retrying in {d}ms...", .{delay_ms});
                std.time.sleep(delay_ms * std.time.ns_per_ms);
            }
            continue;
        };

        client.sendHello("app", "1.0.0") catch |e| {
            Logger.warn("Attempt {d}: Handshake failed - {any}", .{ attempt, e });
            last_error = e;
            client.deinit();
            continue;
        };

        _ = client.receiveMessage(30000) catch |e| {
            Logger.warn("Attempt {d}: Hello response failed - {any}", .{ attempt, e });
            last_error = e;
            client.deinit();
            continue;
        };

        Logger.info("Connected successfully on attempt {d}", .{attempt});
        return client;
    }

    Logger.err("Failed to connect after {d} attempts", .{max_retries});
    return last_error orelse error.ConnectionFailed;
}

pub fn handleConnectionError(err: anyerror) void {
    switch (err) {
        error.ConnectionRefused => {
            Logger.err("Connection refused - is Geode server running?", .{});
        },
        error.ConnectionTimeout => {
            Logger.err("Connection timeout - check network connectivity", .{});
        },
        error.ConnectionClosed => {
            Logger.err("Connection closed - server may have restarted", .{});
        },
        else => {
            Logger.err("Connection error: {any}", .{err});
        },
    }
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = connectWithRetry(allocator, "localhost", 3141, 5) catch |e| {
        handleConnectionError(e);
        return;
    };
    defer client.deinit();

    // Use client
    client.sendRunGql(1, "MATCH (n) RETURN count(n)", null) catch |e| {
        handleConnectionError(e);
        return;
    };

    const result = client.receiveMessage(30000) catch |e| {
        handleConnectionError(e);
        return;
    };
    defer allocator.free(result);

    std.debug.print("Result: {s}\n", .{result});
}
```
{{< /tab >}}
{{< /tabs >}}

## Handling Query Errors

Query errors occur during query parsing or execution. They can be syntax errors, semantic errors, or runtime errors.

### Syntax Errors

Syntax errors occur when the query does not conform to GQL grammar.

{{< tabs >}}
{{< tab "Go" >}}
```go
func executeQuery(db *sql.DB, query string) error {
    ctx := context.Background()
    rows, err := db.QueryContext(ctx, query)
    if err != nil {
        var geodeErr *geode.Error
        if errors.As(err, &geodeErr) {
            if geodeErr.Code == "GQL-02001" {
                // Syntax error
                log.Printf("Syntax error in query: %s", geodeErr.Message)
                log.Printf("Query: %s", query)
                if geodeErr.Position != nil {
                    log.Printf("Error at position: %d", geodeErr.Position)
                }
                return fmt.Errorf("invalid query syntax: %w", err)
            }
        }
        return err
    }
    defer rows.Close()
    return nil
}

// Example with detailed error info
func executeWithDetailedError(db *sql.DB, query string) error {
    _, err := db.ExecContext(context.Background(), query)
    if err != nil {
        var geodeErr *geode.Error
        if errors.As(err, &geodeErr) {
            return &QueryError{
                Code:     geodeErr.Code,
                Message:  geodeErr.Message,
                Query:    query,
                Position: geodeErr.Position,
                Line:     geodeErr.Line,
                Column:   geodeErr.Column,
            }
        }
        return err
    }
    return nil
}

type QueryError struct {
    Code     string
    Message  string
    Query    string
    Position *int
    Line     *int
    Column   *int
}

func (e *QueryError) Error() string {
    if e.Line != nil && e.Column != nil {
        return fmt.Sprintf("[%s] %s (line %d, column %d)",
            e.Code, e.Message, *e.Line, *e.Column)
    }
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
from dataclasses import dataclass
from typing import Optional
from geode_client import GeodeError, SyntaxError, SemanticError

@dataclass
class QueryError:
    code: str
    message: str
    query: str
    position: Optional[int] = None
    line: Optional[int] = None
    column: Optional[int] = None

    def __str__(self) -> str:
        if self.line and self.column:
            return f"[{self.code}] {self.message} (line {self.line}, column {self.column})"
        return f"[{self.code}] {self.message}"


async def execute_query(conn, query: str) -> None:
    """Execute a query with detailed error handling."""
    try:
        await conn.execute(query)
    except SyntaxError as e:
        logger.error(f"Syntax error in query: {e.message}")
        logger.error(f"Query: {query}")
        if e.position:
            logger.error(f"Error at position: {e.position}")
        raise QueryError(
            code=e.code,
            message=e.message,
            query=query,
            position=e.position,
            line=e.line,
            column=e.column,
        )
    except SemanticError as e:
        logger.error(f"Semantic error: {e.message}")
        raise QueryError(
            code=e.code,
            message=e.message,
            query=query,
        )
    except GeodeError as e:
        logger.error(f"Query error [{e.code}]: {e.message}")
        raise


def format_query_error(query: str, error: QueryError) -> str:
    """Format query error with visual indication of error location."""
    lines = query.split('\n')
    output = ["Query error:"]

    for i, line in enumerate(lines, 1):
        output.append(f"  {i:3d} | {line}")
        if error.line == i and error.column:
            marker = " " * (8 + error.column - 1) + "^"
            output.append(marker)

    output.append(f"\nError: {error}")
    return '\n'.join(output)


# Usage example
async def safe_query(conn, query: str):
    try:
        return await conn.query(query)
    except QueryError as e:
        print(format_query_error(query, e))
        raise
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::{Error, ErrorCode};
use thiserror::Error;

#[derive(Error, Debug)]
pub struct QueryError {
    pub code: String,
    pub message: String,
    pub query: String,
    pub position: Option<usize>,
    pub line: Option<usize>,
    pub column: Option<usize>,
}

impl std::fmt::Display for QueryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if let (Some(line), Some(column)) = (self.line, self.column) {
            write!(f, "[{}] {} (line {}, column {})",
                self.code, self.message, line, column)
        } else {
            write!(f, "[{}] {}", self.code, self.message)
        }
    }
}

async fn execute_query(conn: &mut Connection, query: &str) -> Result<(), QueryError> {
    match conn.query(query).await {
        Ok(_) => Ok(()),
        Err(e) => {
            let error = QueryError {
                code: e.code().map(|c| format!("{:?}", c)).unwrap_or_default(),
                message: e.to_string(),
                query: query.to_string(),
                position: e.position(),
                line: e.line(),
                column: e.column(),
            };

            match e.code() {
                Some(ErrorCode::SyntaxError) => {
                    error!("Syntax error in query: {}", error.message);
                    error!("Query: {}", query);
                    if let Some(pos) = error.position {
                        error!("Error at position: {}", pos);
                    }
                }
                Some(ErrorCode::UnknownLabel) => {
                    error!("Unknown label referenced: {}", error.message);
                }
                Some(ErrorCode::TypeMismatch) => {
                    error!("Type mismatch: {}", error.message);
                }
                _ => {
                    error!("Query error: {}", error);
                }
            }

            Err(error)
        }
    }
}

fn format_query_error(query: &str, error: &QueryError) -> String {
    let mut output = vec!["Query error:".to_string()];

    for (i, line) in query.lines().enumerate() {
        output.push(format!("  {:3} | {}", i + 1, line));

        if error.line == Some(i + 1) {
            if let Some(column) = error.column {
                let marker = format!("{}^", " ".repeat(8 + column - 1));
                output.push(marker);
            }
        }
    }

    output.push(format!("\nError: {}", error));
    output.join("\n")
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { GeodeError, SyntaxError, SemanticError } from '@geodedb/client';

interface QueryErrorDetails {
    code: string;
    message: string;
    query: string;
    position?: number;
    line?: number;
    column?: number;
}

class QueryError extends Error {
    constructor(public details: QueryErrorDetails) {
        super(details.message);
        this.name = 'QueryError';
    }

    toString(): string {
        const { code, message, line, column } = this.details;
        if (line && column) {
            return `[${code}] ${message} (line ${line}, column ${column})`;
        }
        return `[${code}] ${message}`;
    }
}

async function executeQuery(client: GeodeClient, query: string): Promise<void> {
    try {
        await client.exec(query);
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error(`Syntax error in query: ${error.message}`);
            console.error(`Query: ${query}`);
            if (error.position) {
                console.error(`Error at position: ${error.position}`);
            }
            throw new QueryError({
                code: error.code,
                message: error.message,
                query,
                position: error.position,
                line: error.line,
                column: error.column,
            });
        }

        if (error instanceof SemanticError) {
            console.error(`Semantic error: ${error.message}`);
            throw new QueryError({
                code: error.code,
                message: error.message,
                query,
            });
        }

        if (error instanceof GeodeError) {
            console.error(`Query error [${error.code}]: ${error.message}`);
            throw error;
        }

        throw error;
    }
}

function formatQueryError(query: string, error: QueryError): string {
    const lines = query.split('\n');
    const output: string[] = ['Query error:'];

    lines.forEach((line, index) => {
        const lineNum = index + 1;
        output.push(`  ${lineNum.toString().padStart(3)} | ${line}`);

        if (error.details.line === lineNum && error.details.column) {
            const marker = ' '.repeat(8 + error.details.column - 1) + '^';
            output.push(marker);
        }
    });

    output.push(`\nError: ${error.toString()}`);
    return output.join('\n');
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const geode = @import("geode_client");

pub const QueryError = struct {
    code: []const u8,
    message: []const u8,
    query: []const u8,
    position: ?usize,
    line: ?usize,
    column: ?usize,

    pub fn format(self: QueryError, writer: anytype) !void {
        if (self.line != null and self.column != null) {
            try writer.print("[{s}] {s} (line {d}, column {d})",
                .{ self.code, self.message, self.line.?, self.column.? });
        } else {
            try writer.print("[{s}] {s}", .{ self.code, self.message });
        }
    }
};

pub fn executeQuery(
    client: *geode.GeodeClient,
    query_id: i64,
    query: []const u8,
) !void {
    client.sendRunGql(query_id, query, null) catch |e| {
        std.debug.print("Failed to send query: {any}\n", .{e});
        return e;
    };

    const response = client.receiveMessage(30000) catch |e| {
        std.debug.print("Failed to receive response: {any}\n", .{e});
        return e;
    };
    defer client.allocator.free(response);

    // Parse response and check for errors
    const parsed = std.json.parseFromSlice(
        std.json.Value,
        client.allocator,
        response,
        .{},
    ) catch |e| {
        std.debug.print("Failed to parse response: {any}\n", .{e});
        return e;
    };
    defer parsed.deinit();

    if (parsed.value.object.get("error")) |error_value| {
        const error_obj = error_value.object;
        const code = error_obj.get("code").?.string;
        const message = error_obj.get("message").?.string;

        std.debug.print("Query error [{s}]: {s}\n", .{ code, message });
        std.debug.print("Query: {s}\n", .{query});

        return error.QueryError;
    }
}

pub fn formatQueryError(
    allocator: std.mem.Allocator,
    query: []const u8,
    err: QueryError,
) ![]const u8 {
    var output = std.ArrayList(u8).init(allocator);
    const writer = output.writer();

    try writer.writeAll("Query error:\n");

    var line_num: usize = 1;
    var line_start: usize = 0;

    for (query, 0..) |char, i| {
        if (char == '\n' or i == query.len - 1) {
            const line_end = if (char == '\n') i else i + 1;
            try writer.print("  {d:3} | {s}\n", .{ line_num, query[line_start..line_end] });

            if (err.line == line_num) {
                if (err.column) |col| {
                    try writer.writeByteNTimes(' ', 8 + col - 1);
                    try writer.writeAll("^\n");
                }
            }

            line_num += 1;
            line_start = i + 1;
        }
    }

    try writer.writeAll("\nError: ");
    try err.format(writer);
    try writer.writeAll("\n");

    return output.toOwnedSlice();
}
```
{{< /tab >}}
{{< /tabs >}}

## Handling Transaction Errors

Transaction errors require special handling to maintain data consistency.

{{< tabs >}}
{{< tab "Go" >}}
```go
func executeInTransaction(db *sql.DB, operations func(tx *sql.Tx) error) error {
    ctx := context.Background()

    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }

    // Ensure rollback on panic
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
            panic(r)
        }
    }()

    err = operations(tx)
    if err != nil {
        rollbackErr := tx.Rollback()
        if rollbackErr != nil {
            return fmt.Errorf("operation failed: %w, rollback also failed: %v", err, rollbackErr)
        }

        // Handle specific transaction errors
        var geodeErr *geode.Error
        if errors.As(err, &geodeErr) {
            switch geodeErr.Code {
            case "GQL-05003":
                return &DeadlockError{Cause: err}
            case "GQL-05004":
                return &SerializationError{Cause: err}
            case "GQL-04001":
                return &ConstraintViolationError{
                    Constraint: geodeErr.Constraint,
                    Cause:      err,
                }
            }
        }
        return err
    }

    if err := tx.Commit(); err != nil {
        return fmt.Errorf("failed to commit transaction: %w", err)
    }

    return nil
}

// Retry transaction on deadlock
func executeWithDeadlockRetry(db *sql.DB, maxRetries int, operations func(tx *sql.Tx) error) error {
    for attempt := 1; attempt <= maxRetries; attempt++ {
        err := executeInTransaction(db, operations)
        if err == nil {
            return nil
        }

        var deadlockErr *DeadlockError
        if errors.As(err, &deadlockErr) {
            log.Printf("Deadlock detected on attempt %d, retrying...", attempt)
            time.Sleep(time.Duration(rand.Intn(100)) * time.Millisecond)
            continue
        }

        var serializationErr *SerializationError
        if errors.As(err, &serializationErr) {
            log.Printf("Serialization failure on attempt %d, retrying...", attempt)
            time.Sleep(time.Duration(rand.Intn(100)) * time.Millisecond)
            continue
        }

        // Non-retryable error
        return err
    }

    return fmt.Errorf("transaction failed after %d retries", maxRetries)
}

type DeadlockError struct {
    Cause error
}

func (e *DeadlockError) Error() string {
    return fmt.Sprintf("deadlock detected: %v", e.Cause)
}

func (e *DeadlockError) Unwrap() error {
    return e.Cause
}

type SerializationError struct {
    Cause error
}

func (e *SerializationError) Error() string {
    return fmt.Sprintf("serialization failure: %v", e.Cause)
}

type ConstraintViolationError struct {
    Constraint string
    Cause      error
}

func (e *ConstraintViolationError) Error() string {
    return fmt.Sprintf("constraint violation (%s): %v", e.Constraint, e.Cause)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import asyncio
import random
from typing import Callable, TypeVar, Awaitable
from functools import wraps

T = TypeVar('T')

class DeadlockError(Exception):
    """Raised when a deadlock is detected."""
    pass

class SerializationError(Exception):
    """Raised when a serialization failure occurs."""
    pass

class ConstraintViolationError(Exception):
    """Raised when a constraint is violated."""
    def __init__(self, constraint: str, message: str):
        self.constraint = constraint
        super().__init__(f"Constraint violation ({constraint}): {message}")


async def execute_in_transaction(
    conn,
    operations: Callable[[], Awaitable[T]]
) -> T:
    """Execute operations within a transaction with proper error handling."""
    await conn.begin()

    try:
        result = await operations()
        await conn.commit()
        return result

    except GeodeError as e:
        await conn.rollback()

        if e.code == "GQL-05003":
            raise DeadlockError(str(e)) from e
        elif e.code == "GQL-05004":
            raise SerializationError(str(e)) from e
        elif e.code == "GQL-04001":
            raise ConstraintViolationError(
                constraint=e.details.get("constraint", "unknown"),
                message=str(e)
            ) from e
        raise

    except Exception as e:
        await conn.rollback()
        raise


async def execute_with_retry(
    conn,
    operations: Callable[[], Awaitable[T]],
    max_retries: int = 3,
    retryable_exceptions: tuple = (DeadlockError, SerializationError)
) -> T:
    """Execute operations with automatic retry on transient failures."""
    for attempt in range(1, max_retries + 1):
        try:
            return await execute_in_transaction(conn, operations)

        except retryable_exceptions as e:
            if attempt == max_retries:
                raise

            delay = random.uniform(0.01, 0.1) * (2 ** attempt)
            logger.warning(
                f"{type(e).__name__} on attempt {attempt}, "
                f"retrying in {delay:.3f}s..."
            )
            await asyncio.sleep(delay)

    raise RuntimeError("Should not reach here")


# Decorator version
def with_transaction_retry(max_retries: int = 3):
    """Decorator to wrap async functions in transaction with retry."""
    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @wraps(func)
        async def wrapper(conn, *args, **kwargs) -> T:
            async def operations():
                return await func(conn, *args, **kwargs)

            return await execute_with_retry(conn, operations, max_retries)

        return wrapper
    return decorator


# Usage
@with_transaction_retry(max_retries=3)
async def transfer_funds(conn, from_account: int, to_account: int, amount: float):
    """Transfer funds between accounts with automatic retry."""
    # Debit source account
    await conn.execute("""
        MATCH (a:Account {id: $id})
        SET a.balance = a.balance - $amount
    """, {"id": from_account, "amount": amount})

    # Credit destination account
    await conn.execute("""
        MATCH (a:Account {id: $id})
        SET a.balance = a.balance + $amount
    """, {"id": to_account, "amount": amount})
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::{Connection, Error, ErrorCode};
use std::future::Future;
use rand::Rng;
use tokio::time::{sleep, Duration};

#[derive(Debug)]
pub enum TransactionError {
    Deadlock(Error),
    SerializationFailure(Error),
    ConstraintViolation { constraint: String, cause: Error },
    Other(Error),
}

impl From<Error> for TransactionError {
    fn from(e: Error) -> Self {
        match e.code() {
            Some(ErrorCode::DeadlockDetected) => TransactionError::Deadlock(e),
            Some(ErrorCode::SerializationFailure) => TransactionError::SerializationFailure(e),
            Some(ErrorCode::UniqueConstraintViolation) => TransactionError::ConstraintViolation {
                constraint: e.constraint().unwrap_or_default().to_string(),
                cause: e,
            },
            _ => TransactionError::Other(e),
        }
    }
}

async fn execute_in_transaction<F, Fut, T>(
    conn: &mut Connection,
    operations: F,
) -> Result<T, TransactionError>
where
    F: FnOnce(&mut Connection) -> Fut,
    Fut: Future<Output = Result<T, Error>>,
{
    conn.begin().await.map_err(TransactionError::from)?;

    match operations(conn).await {
        Ok(result) => {
            conn.commit().await.map_err(TransactionError::from)?;
            Ok(result)
        }
        Err(e) => {
            // Always try to rollback
            let _ = conn.rollback().await;
            Err(TransactionError::from(e))
        }
    }
}

async fn execute_with_retry<F, Fut, T>(
    conn: &mut Connection,
    max_retries: u32,
    operations: F,
) -> Result<T, TransactionError>
where
    F: Fn(&mut Connection) -> Fut + Clone,
    Fut: Future<Output = Result<T, Error>>,
{
    let mut rng = rand::thread_rng();

    for attempt in 1..=max_retries {
        match execute_in_transaction(conn, operations.clone()).await {
            Ok(result) => return Ok(result),
            Err(TransactionError::Deadlock(_)) if attempt < max_retries => {
                let delay = Duration::from_millis(rng.gen_range(10..100) * 2u64.pow(attempt));
                warn!("Deadlock on attempt {}, retrying in {:?}...", attempt, delay);
                sleep(delay).await;
            }
            Err(TransactionError::SerializationFailure(_)) if attempt < max_retries => {
                let delay = Duration::from_millis(rng.gen_range(10..100) * 2u64.pow(attempt));
                warn!("Serialization failure on attempt {}, retrying in {:?}...", attempt, delay);
                sleep(delay).await;
            }
            Err(e) => return Err(e),
        }
    }

    Err(TransactionError::Other(Error::new("max retries exceeded")))
}

// Usage
async fn transfer_funds(
    conn: &mut Connection,
    from_account: i64,
    to_account: i64,
    amount: f64,
) -> Result<(), TransactionError> {
    execute_with_retry(conn, 3, |conn| async move {
        // Debit source
        let mut params = HashMap::new();
        params.insert("id".to_string(), Value::int(from_account));
        params.insert("amount".to_string(), Value::float(amount));
        conn.query_with_params(
            "MATCH (a:Account {id: $id}) SET a.balance = a.balance - $amount",
            &params
        ).await?;

        // Credit destination
        params.insert("id".to_string(), Value::int(to_account));
        conn.query_with_params(
            "MATCH (a:Account {id: $id}) SET a.balance = a.balance + $amount",
            &params
        ).await?;

        Ok(())
    }).await
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { GeodeClient, GeodeError, Transaction } from '@geodedb/client';

class DeadlockError extends Error {
    constructor(public cause: Error) {
        super(`Deadlock detected: ${cause.message}`);
        this.name = 'DeadlockError';
    }
}

class SerializationError extends Error {
    constructor(public cause: Error) {
        super(`Serialization failure: ${cause.message}`);
        this.name = 'SerializationError';
    }
}

class ConstraintViolationError extends Error {
    constructor(public constraint: string, public cause: Error) {
        super(`Constraint violation (${constraint}): ${cause.message}`);
        this.name = 'ConstraintViolationError';
    }
}

function mapTransactionError(error: GeodeError): Error {
    switch (error.code) {
        case 'GQL-05003':
            return new DeadlockError(error);
        case 'GQL-05004':
            return new SerializationError(error);
        case 'GQL-04001':
            return new ConstraintViolationError(
                error.details?.constraint || 'unknown',
                error
            );
        default:
            return error;
    }
}

async function executeInTransaction<T>(
    client: GeodeClient,
    operations: (tx: Transaction) => Promise<T>
): Promise<T> {
    return client.withTransaction(async (tx) => {
        try {
            return await operations(tx);
        } catch (error) {
            if (error instanceof GeodeError) {
                throw mapTransactionError(error);
            }
            throw error;
        }
    });
}

async function executeWithRetry<T>(
    client: GeodeClient,
    maxRetries: number,
    operations: (tx: Transaction) => Promise<T>
): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await executeInTransaction(client, operations);
        } catch (error) {
            const isRetryable =
                error instanceof DeadlockError ||
                error instanceof SerializationError;

            if (isRetryable && attempt < maxRetries) {
                const delay = Math.random() * 100 * Math.pow(2, attempt);
                console.warn(
                    `${error.constructor.name} on attempt ${attempt}, ` +
                    `retrying in ${delay.toFixed(0)}ms...`
                );
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            throw error;
        }
    }

    throw new Error('Should not reach here');
}

// Usage
async function transferFunds(
    client: GeodeClient,
    fromAccount: number,
    toAccount: number,
    amount: number
): Promise<void> {
    await executeWithRetry(client, 3, async (tx) => {
        // Debit source
        await tx.exec(
            'MATCH (a:Account {id: $id}) SET a.balance = a.balance - $amount',
            { params: { id: fromAccount, amount } }
        );

        // Credit destination
        await tx.exec(
            'MATCH (a:Account {id: $id}) SET a.balance = a.balance + $amount',
            { params: { id: toAccount, amount } }
        );
    });
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const geode = @import("geode_client");

pub const TransactionError = error{
    Deadlock,
    SerializationFailure,
    ConstraintViolation,
    TransactionFailed,
    RollbackFailed,
};

pub fn executeInTransaction(
    client: *geode.GeodeClient,
    comptime operations: fn (*geode.GeodeClient) anyerror!void,
) TransactionError!void {
    // Begin transaction
    client.sendBegin() catch return error.TransactionFailed;
    _ = client.receiveMessage(30000) catch return error.TransactionFailed;

    // Execute operations
    operations(client) catch |e| {
        // Rollback on error
        client.sendRollback() catch return error.RollbackFailed;
        _ = client.receiveMessage(30000) catch return error.RollbackFailed;

        // Map to transaction error
        return switch (e) {
            error.Deadlock => error.Deadlock,
            error.SerializationFailure => error.SerializationFailure,
            error.ConstraintViolation => error.ConstraintViolation,
            else => error.TransactionFailed,
        };
    };

    // Commit transaction
    client.sendCommit() catch return error.TransactionFailed;
    _ = client.receiveMessage(30000) catch return error.TransactionFailed;
}

pub fn executeWithRetry(
    client: *geode.GeodeClient,
    max_retries: u32,
    comptime operations: fn (*geode.GeodeClient) anyerror!void,
) TransactionError!void {
    var prng = std.rand.DefaultPrng.init(@intCast(std.time.timestamp()));
    const random = prng.random();

    var attempt: u32 = 1;
    while (attempt <= max_retries) : (attempt += 1) {
        executeInTransaction(client, operations) catch |e| {
            const is_retryable = e == error.Deadlock or e == error.SerializationFailure;

            if (is_retryable and attempt < max_retries) {
                const base_delay = random.intRangeAtMost(u64, 10, 100);
                const delay_ms = base_delay * std.math.pow(u64, 2, attempt);
                std.debug.print(
                    "{s} on attempt {d}, retrying in {d}ms...\n",
                    .{ @errorName(e), attempt, delay_ms },
                );
                std.time.sleep(delay_ms * std.time.ns_per_ms);
                continue;
            }

            return e;
        };

        return; // Success
    }

    return error.TransactionFailed;
}

// Usage
fn transferFunds(client: *geode.GeodeClient) !void {
    try executeWithRetry(client, 3, struct {
        fn op(c: *geode.GeodeClient) !void {
            // This is a simplified example - actual params would be captured
            try c.sendRunGql(1,
                "MATCH (a:Account {id: 1}) SET a.balance = a.balance - 100",
                null);
            _ = try c.receiveMessage(30000);

            try c.sendRunGql(2,
                "MATCH (a:Account {id: 2}) SET a.balance = a.balance + 100",
                null);
            _ = try c.receiveMessage(30000);
        }
    }.op);
}
```
{{< /tab >}}
{{< /tabs >}}

## Constraint Violation Handling

Handle constraint violations with appropriate user feedback.

{{< tabs >}}
{{< tab "Go" >}}
```go
func createUser(db *sql.DB, username, email string) error {
    _, err := db.ExecContext(context.Background(),
        "CREATE (:User {username: ?, email: ?})", username, email)

    if err != nil {
        var geodeErr *geode.Error
        if errors.As(err, &geodeErr) && geodeErr.Code == "GQL-04001" {
            // Unique constraint violation
            constraint := geodeErr.Constraint
            if strings.Contains(constraint, "username") {
                return &UserError{
                    Field:   "username",
                    Message: "Username already taken",
                }
            }
            if strings.Contains(constraint, "email") {
                return &UserError{
                    Field:   "email",
                    Message: "Email already registered",
                }
            }
        }
        return err
    }
    return nil
}

type UserError struct {
    Field   string
    Message string
}

func (e *UserError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Message)
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
from dataclasses import dataclass

@dataclass
class ValidationError:
    field: str
    message: str

async def create_user(conn, username: str, email: str) -> None:
    try:
        await conn.execute(
            "CREATE (:User {username: $username, email: $email})",
            {"username": username, "email": email}
        )
    except GeodeError as e:
        if e.code == "GQL-04001":
            constraint = e.details.get("constraint", "")
            if "username" in constraint:
                raise ValidationError(
                    field="username",
                    message="Username already taken"
                )
            if "email" in constraint:
                raise ValidationError(
                    field="email",
                    message="Email already registered"
                )
        raise
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
#[derive(Debug)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
}

async fn create_user(
    conn: &mut Connection,
    username: &str,
    email: &str,
) -> Result<(), ValidationError> {
    let mut params = HashMap::new();
    params.insert("username".to_string(), Value::string(username));
    params.insert("email".to_string(), Value::string(email));

    match conn.query_with_params(
        "CREATE (:User {username: $username, email: $email})",
        &params
    ).await {
        Ok(_) => Ok(()),
        Err(e) if e.code() == Some(ErrorCode::UniqueConstraintViolation) => {
            let constraint = e.constraint().unwrap_or("");
            if constraint.contains("username") {
                Err(ValidationError {
                    field: "username".to_string(),
                    message: "Username already taken".to_string(),
                })
            } else if constraint.contains("email") {
                Err(ValidationError {
                    field: "email".to_string(),
                    message: "Email already registered".to_string(),
                })
            } else {
                Err(ValidationError {
                    field: "unknown".to_string(),
                    message: e.to_string(),
                })
            }
        }
        Err(e) => Err(ValidationError {
            field: "unknown".to_string(),
            message: e.to_string(),
        }),
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
interface ValidationError {
    field: string;
    message: string;
}

async function createUser(
    client: GeodeClient,
    username: string,
    email: string
): Promise<void> {
    try {
        await client.exec(
            'CREATE (:User {username: $username, email: $email})',
            { params: { username, email } }
        );
    } catch (error) {
        if (error instanceof GeodeError && error.code === 'GQL-04001') {
            const constraint = error.details?.constraint || '';
            if (constraint.includes('username')) {
                throw { field: 'username', message: 'Username already taken' } as ValidationError;
            }
            if (constraint.includes('email')) {
                throw { field: 'email', message: 'Email already registered' } as ValidationError;
            }
        }
        throw error;
    }
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
pub const ValidationError = struct {
    field: []const u8,
    message: []const u8,
};

pub fn createUser(
    client: *geode.GeodeClient,
    username: []const u8,
    email: []const u8,
) !?ValidationError {
    var params = std.json.ObjectMap.init(client.allocator);
    defer params.deinit();
    try params.put("username", .{ .string = username });
    try params.put("email", .{ .string = email });

    client.sendRunGql(1,
        "CREATE (:User {username: $username, email: $email})",
        .{ .object = params }) catch |e| {
        // Check for constraint violation
        if (e == error.ConstraintViolation) {
            // Would need to parse error details to determine which constraint
            return ValidationError{
                .field = "username",
                .message = "Username or email already taken",
            };
        }
        return e;
    };

    _ = client.receiveMessage(30000) catch |e| {
        return e;
    };

    return null;
}
```
{{< /tab >}}
{{< /tabs >}}

## Retry Strategies

### Exponential Backoff with Jitter

```go
func exponentialBackoffWithJitter(attempt int, baseDelay time.Duration) time.Duration {
    // Calculate exponential delay
    expDelay := baseDelay * time.Duration(1<<uint(attempt))

    // Cap at max delay
    maxDelay := 30 * time.Second
    if expDelay > maxDelay {
        expDelay = maxDelay
    }

    // Add jitter (0-100% of calculated delay)
    jitter := time.Duration(rand.Int63n(int64(expDelay)))
    return expDelay/2 + jitter/2
}
```

### Circuit Breaker Pattern

{{< tabs >}}
{{< tab "Go" >}}
```go
type CircuitBreaker struct {
    mu              sync.Mutex
    failureCount    int
    successCount    int
    state           State
    lastFailureTime time.Time
    threshold       int
    resetTimeout    time.Duration
}

type State int

const (
    StateClosed State = iota
    StateOpen
    StateHalfOpen
)

func NewCircuitBreaker(threshold int, resetTimeout time.Duration) *CircuitBreaker {
    return &CircuitBreaker{
        threshold:    threshold,
        resetTimeout: resetTimeout,
        state:        StateClosed,
    }
}

func (cb *CircuitBreaker) Execute(operation func() error) error {
    cb.mu.Lock()

    // Check if circuit should transition from open to half-open
    if cb.state == StateOpen {
        if time.Since(cb.lastFailureTime) > cb.resetTimeout {
            cb.state = StateHalfOpen
        } else {
            cb.mu.Unlock()
            return errors.New("circuit breaker is open")
        }
    }

    cb.mu.Unlock()

    // Execute operation
    err := operation()

    cb.mu.Lock()
    defer cb.mu.Unlock()

    if err != nil {
        cb.failureCount++
        cb.lastFailureTime = time.Now()

        if cb.state == StateHalfOpen || cb.failureCount >= cb.threshold {
            cb.state = StateOpen
        }
        return err
    }

    // Success
    if cb.state == StateHalfOpen {
        cb.state = StateClosed
    }
    cb.failureCount = 0
    return nil
}

// Usage
var circuitBreaker = NewCircuitBreaker(5, 30*time.Second)

func queryWithCircuitBreaker(db *sql.DB, query string) (*sql.Rows, error) {
    var rows *sql.Rows
    err := circuitBreaker.Execute(func() error {
        var err error
        rows, err = db.QueryContext(context.Background(), query)
        return err
    })
    return rows, err
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import time
from enum import Enum
from threading import Lock
from typing import Callable, TypeVar

T = TypeVar('T')

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    def __init__(self, threshold: int = 5, reset_timeout: float = 30.0):
        self.threshold = threshold
        self.reset_timeout = reset_timeout
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        self.last_failure_time = 0.0
        self._lock = Lock()

    def execute(self, operation: Callable[[], T]) -> T:
        with self._lock:
            # Check if should transition from open to half-open
            if self.state == CircuitState.OPEN:
                if time.time() - self.last_failure_time > self.reset_timeout:
                    self.state = CircuitState.HALF_OPEN
                else:
                    raise CircuitBreakerOpenError("Circuit breaker is open")

        try:
            result = operation()

            with self._lock:
                if self.state == CircuitState.HALF_OPEN:
                    self.state = CircuitState.CLOSED
                self.failure_count = 0

            return result

        except Exception as e:
            with self._lock:
                self.failure_count += 1
                self.last_failure_time = time.time()

                if (self.state == CircuitState.HALF_OPEN or
                    self.failure_count >= self.threshold):
                    self.state = CircuitState.OPEN

            raise


class CircuitBreakerOpenError(Exception):
    pass


# Async version
class AsyncCircuitBreaker:
    def __init__(self, threshold: int = 5, reset_timeout: float = 30.0):
        self.threshold = threshold
        self.reset_timeout = reset_timeout
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        self.last_failure_time = 0.0
        self._lock = asyncio.Lock()

    async def execute(self, operation: Callable[[], Awaitable[T]]) -> T:
        async with self._lock:
            if self.state == CircuitState.OPEN:
                if time.time() - self.last_failure_time > self.reset_timeout:
                    self.state = CircuitState.HALF_OPEN
                else:
                    raise CircuitBreakerOpenError("Circuit breaker is open")

        try:
            result = await operation()

            async with self._lock:
                if self.state == CircuitState.HALF_OPEN:
                    self.state = CircuitState.CLOSED
                self.failure_count = 0

            return result

        except Exception as e:
            async with self._lock:
                self.failure_count += 1
                self.last_failure_time = time.time()

                if (self.state == CircuitState.HALF_OPEN or
                    self.failure_count >= self.threshold):
                    self.state = CircuitState.OPEN

            raise


# Usage
circuit_breaker = AsyncCircuitBreaker(threshold=5, reset_timeout=30.0)

async def query_with_circuit_breaker(conn, query: str):
    async def operation():
        return await conn.query(query)

    return await circuit_breaker.execute(operation)
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

#[derive(Clone, Copy, PartialEq)]
enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

pub struct CircuitBreaker {
    state: Arc<Mutex<CircuitState>>,
    failure_count: Arc<Mutex<u32>>,
    last_failure: Arc<Mutex<Option<Instant>>>,
    threshold: u32,
    reset_timeout: Duration,
}

impl CircuitBreaker {
    pub fn new(threshold: u32, reset_timeout: Duration) -> Self {
        Self {
            state: Arc::new(Mutex::new(CircuitState::Closed)),
            failure_count: Arc::new(Mutex::new(0)),
            last_failure: Arc::new(Mutex::new(None)),
            threshold,
            reset_timeout,
        }
    }

    pub async fn execute<F, Fut, T, E>(&self, operation: F) -> Result<T, E>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = Result<T, E>>,
        E: From<CircuitBreakerError>,
    {
        // Check state
        {
            let mut state = self.state.lock().unwrap();
            if *state == CircuitState::Open {
                let last_failure = self.last_failure.lock().unwrap();
                if let Some(time) = *last_failure {
                    if time.elapsed() > self.reset_timeout {
                        *state = CircuitState::HalfOpen;
                    } else {
                        return Err(CircuitBreakerError::Open.into());
                    }
                }
            }
        }

        match operation().await {
            Ok(result) => {
                let mut state = self.state.lock().unwrap();
                if *state == CircuitState::HalfOpen {
                    *state = CircuitState::Closed;
                }
                *self.failure_count.lock().unwrap() = 0;
                Ok(result)
            }
            Err(e) => {
                let mut failure_count = self.failure_count.lock().unwrap();
                *failure_count += 1;
                *self.last_failure.lock().unwrap() = Some(Instant::now());

                let mut state = self.state.lock().unwrap();
                if *state == CircuitState::HalfOpen || *failure_count >= self.threshold {
                    *state = CircuitState::Open;
                }
                Err(e)
            }
        }
    }
}

#[derive(Debug)]
pub enum CircuitBreakerError {
    Open,
}

impl std::fmt::Display for CircuitBreakerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CircuitBreakerError::Open => write!(f, "Circuit breaker is open"),
        }
    }
}

impl std::error::Error for CircuitBreakerError {}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
enum CircuitState {
    CLOSED = 'closed',
    OPEN = 'open',
    HALF_OPEN = 'half_open',
}

class CircuitBreakerOpenError extends Error {
    constructor() {
        super('Circuit breaker is open');
        this.name = 'CircuitBreakerOpenError';
    }
}

class CircuitBreaker {
    private state = CircuitState.CLOSED;
    private failureCount = 0;
    private lastFailureTime = 0;

    constructor(
        private threshold: number = 5,
        private resetTimeout: number = 30000
    ) {}

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        // Check if should transition from open to half-open
        if (this.state === CircuitState.OPEN) {
            if (Date.now() - this.lastFailureTime > this.resetTimeout) {
                this.state = CircuitState.HALF_OPEN;
            } else {
                throw new CircuitBreakerOpenError();
            }
        }

        try {
            const result = await operation();

            if (this.state === CircuitState.HALF_OPEN) {
                this.state = CircuitState.CLOSED;
            }
            this.failureCount = 0;

            return result;
        } catch (error) {
            this.failureCount++;
            this.lastFailureTime = Date.now();

            if (
                this.state === CircuitState.HALF_OPEN ||
                this.failureCount >= this.threshold
            ) {
                this.state = CircuitState.OPEN;
            }

            throw error;
        }
    }

    getState(): CircuitState {
        return this.state;
    }
}

// Usage
const circuitBreaker = new CircuitBreaker(5, 30000);

async function queryWithCircuitBreaker(
    client: GeodeClient,
    query: string
): Promise<Row[]> {
    return circuitBreaker.execute(() => client.queryAll(query));
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");

pub const CircuitState = enum {
    closed,
    open,
    half_open,
};

pub const CircuitBreaker = struct {
    state: CircuitState,
    failure_count: u32,
    last_failure_time: i64,
    threshold: u32,
    reset_timeout_ms: i64,
    mutex: std.Thread.Mutex,

    pub fn init(threshold: u32, reset_timeout_ms: i64) CircuitBreaker {
        return CircuitBreaker{
            .state = .closed,
            .failure_count = 0,
            .last_failure_time = 0,
            .threshold = threshold,
            .reset_timeout_ms = reset_timeout_ms,
            .mutex = std.Thread.Mutex{},
        };
    }

    pub fn execute(
        self: *CircuitBreaker,
        comptime operation: fn () anyerror!void,
    ) !void {
        self.mutex.lock();

        // Check state
        if (self.state == .open) {
            const now = std.time.milliTimestamp();
            if (now - self.last_failure_time > self.reset_timeout_ms) {
                self.state = .half_open;
            } else {
                self.mutex.unlock();
                return error.CircuitBreakerOpen;
            }
        }

        self.mutex.unlock();

        operation() catch |e| {
            self.mutex.lock();
            defer self.mutex.unlock();

            self.failure_count += 1;
            self.last_failure_time = std.time.milliTimestamp();

            if (self.state == .half_open or self.failure_count >= self.threshold) {
                self.state = .open;
            }

            return e;
        };

        // Success
        self.mutex.lock();
        defer self.mutex.unlock();

        if (self.state == .half_open) {
            self.state = .closed;
        }
        self.failure_count = 0;
    }
};

// Usage
var circuit_breaker = CircuitBreaker.init(5, 30000);

fn queryWithCircuitBreaker(client: *geode.GeodeClient, query: []const u8) !void {
    try circuit_breaker.execute(struct {
        fn op() !void {
            // Actual query execution
            try client.sendRunGql(1, query, null);
            _ = try client.receiveMessage(30000);
        }
    }.op);
}
```
{{< /tab >}}
{{< /tabs >}}

## Error Logging Best Practices

### Structured Logging

{{< tabs >}}
{{< tab "Go" >}}
```go
import (
    "log/slog"
    "os"
)

func setupLogger() *slog.Logger {
    return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    }))
}

func logQueryError(logger *slog.Logger, query string, err error) {
    var geodeErr *geode.Error
    if errors.As(err, &geodeErr) {
        logger.Error("Query execution failed",
            slog.String("error_code", geodeErr.Code),
            slog.String("error_message", geodeErr.Message),
            slog.String("query", query),
            slog.Any("position", geodeErr.Position),
            slog.Any("line", geodeErr.Line),
            slog.Any("column", geodeErr.Column),
        )
    } else {
        logger.Error("Query execution failed",
            slog.String("error", err.Error()),
            slog.String("query", query),
        )
    }
}

func logTransactionError(logger *slog.Logger, txID string, err error) {
    logger.Error("Transaction failed",
        slog.String("transaction_id", txID),
        slog.String("error", err.Error()),
        slog.String("error_type", fmt.Sprintf("%T", err)),
    )
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import structlog
import logging

def setup_logging():
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

logger = structlog.get_logger()

def log_query_error(query: str, error: Exception) -> None:
    if isinstance(error, GeodeError):
        logger.error(
            "Query execution failed",
            error_code=error.code,
            error_message=error.message,
            query=query,
            position=error.position,
            line=error.line,
            column=error.column,
        )
    else:
        logger.error(
            "Query execution failed",
            error=str(error),
            error_type=type(error).__name__,
            query=query,
        )

def log_transaction_error(tx_id: str, error: Exception) -> None:
    logger.error(
        "Transaction failed",
        transaction_id=tx_id,
        error=str(error),
        error_type=type(error).__name__,
    )
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use tracing::{error, info, instrument, span, Level};

#[instrument(skip(query), fields(query_length = query.len()))]
async fn execute_query_with_logging(
    conn: &mut Connection,
    query: &str,
) -> Result<Page, Error> {
    match conn.query(query).await {
        Ok(page) => {
            info!(rows = page.rows.len(), "Query executed successfully");
            Ok(page)
        }
        Err(e) => {
            error!(
                error_code = ?e.code(),
                error_message = %e,
                query = %query,
                position = ?e.position(),
                line = ?e.line(),
                column = ?e.column(),
                "Query execution failed"
            );
            Err(e)
        }
    }
}

#[instrument(skip(conn, operations), fields(tx_id = %tx_id))]
async fn execute_transaction_with_logging<F, Fut, T>(
    conn: &mut Connection,
    tx_id: &str,
    operations: F,
) -> Result<T, Error>
where
    F: FnOnce(&mut Connection) -> Fut,
    Fut: std::future::Future<Output = Result<T, Error>>,
{
    let span = span!(Level::INFO, "transaction", tx_id = %tx_id);
    let _enter = span.enter();

    info!("Starting transaction");

    conn.begin().await?;

    match operations(conn).await {
        Ok(result) => {
            conn.commit().await?;
            info!("Transaction committed successfully");
            Ok(result)
        }
        Err(e) => {
            error!(
                error = %e,
                error_type = ?std::any::type_name_of_val(&e),
                "Transaction failed, rolling back"
            );
            let _ = conn.rollback().await;
            Err(e)
        }
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import pino from 'pino';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

function logQueryError(query: string, error: unknown): void {
    if (error instanceof GeodeError) {
        logger.error({
            msg: 'Query execution failed',
            errorCode: error.code,
            errorMessage: error.message,
            query,
            position: error.position,
            line: error.line,
            column: error.column,
        });
    } else if (error instanceof Error) {
        logger.error({
            msg: 'Query execution failed',
            error: error.message,
            errorType: error.constructor.name,
            query,
            stack: error.stack,
        });
    } else {
        logger.error({
            msg: 'Query execution failed',
            error: String(error),
            query,
        });
    }
}

function logTransactionError(txId: string, error: unknown): void {
    logger.error({
        msg: 'Transaction failed',
        transactionId: txId,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
    });
}

// Context-aware logging
function createQueryLogger(context: { userId?: string; requestId?: string }) {
    return logger.child(context);
}

// Usage
const queryLogger = createQueryLogger({
    userId: 'user-123',
    requestId: 'req-456',
});

queryLogger.info({ query: 'MATCH (n) RETURN n' }, 'Executing query');
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");

pub const LogLevel = enum {
    debug,
    info,
    warn,
    err,
};

pub const Logger = struct {
    writer: std.fs.File.Writer,
    level: LogLevel,

    pub fn init(level: LogLevel) Logger {
        return Logger{
            .writer = std.io.getStdErr().writer(),
            .level = level,
        };
    }

    pub fn logQueryError(
        self: *Logger,
        query: []const u8,
        error_code: ?[]const u8,
        error_message: []const u8,
    ) void {
        const timestamp = std.time.timestamp();

        self.writer.print(
            \\{{"timestamp":{d},"level":"error","msg":"Query execution failed",
            \\"error_code":"{?s}","error_message":"{s}","query":"{s}"}}
            \\
        , .{ timestamp, error_code, error_message, query }) catch {};
    }

    pub fn logTransactionError(
        self: *Logger,
        tx_id: []const u8,
        error_message: []const u8,
    ) void {
        const timestamp = std.time.timestamp();

        self.writer.print(
            \\{{"timestamp":{d},"level":"error","msg":"Transaction failed",
            \\"transaction_id":"{s}","error":"{s}"}}
            \\
        , .{ timestamp, tx_id, error_message }) catch {};
    }

    pub fn info(self: *Logger, comptime fmt: []const u8, args: anytype) void {
        if (@intFromEnum(self.level) <= @intFromEnum(LogLevel.info)) {
            const timestamp = std.time.timestamp();
            self.writer.print("{d} [INFO] " ++ fmt ++ "\n", .{timestamp} ++ args) catch {};
        }
    }
};

// Usage
var logger = Logger.init(.info);

pub fn executeQueryWithLogging(
    client: *geode.GeodeClient,
    query: []const u8,
) !void {
    logger.info("Executing query: {s}", .{query});

    client.sendRunGql(1, query, null) catch |e| {
        logger.logQueryError(query, null, @errorName(e));
        return e;
    };

    const response = client.receiveMessage(30000) catch |e| {
        logger.logQueryError(query, null, @errorName(e));
        return e;
    };
    defer client.allocator.free(response);

    logger.info("Query completed successfully", .{});
}
```
{{< /tab >}}
{{< /tabs >}}

## Best Practices Summary

### Do

- Use specific error types for different error categories
- Implement retry logic with exponential backoff for transient errors
- Log errors with full context (query, parameters, stack trace)
- Use circuit breakers for external service calls
- Provide user-friendly error messages for constraint violations
- Clean up resources (connections, transactions) on error

### Avoid

- Catching all exceptions without proper handling
- Retrying non-transient errors (syntax errors, constraint violations)
- Exposing internal error details to end users
- Ignoring errors from cleanup operations
- Using generic error messages

## Resources

- [Transaction Management Guide](/guides/transactions/)
- [Testing Strategies Guide](/guides/testing/)
- [GQL Reference](/docs/gql-reference/)
- [Client Libraries](/clients/)

---

**Questions?** Discuss error handling in our [forum](https://forum.geodedb.com).
