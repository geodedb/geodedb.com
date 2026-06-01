---
title: "Time-Series Queries"
description: "Write and query native time-series data in Geode with the geode.ts.* GQL procedures: insert, insert_many, range, last, bucket_avg, and sample_by downsampling."
summary: "Learn how to ingest and query durable time-series points in Geode using the native geode.ts.* CALL procedures for range, last, and downsampled aggregation."
slug: "timeseries"
url: "/docs/query/timeseries/"
date: 2026-06-01
lastmod: 2026-06-01
draft: false
weight: 360
keywords: ["time-series", "timeseries", "GQL", "geode.ts", "downsampling", "bucket_avg", "sample_by", "metrics ingest"]
tags: ["query", "timeseries", "gql"]
categories: ["Query Optimization"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/query/timeseries/"
---

Geode ships a native time-series GQL surface for writing and richly querying ordered `(ts, value)` points over the wire. It is exposed through ISO GQL `CALL` procedures under the `geode.ts.*` namespace, the direct analog of the [full-text search](/docs/query/full-text-search/) surface (`CALL geode.fts.search`).

## Overview

A time-series is identified by a `(device_id, metric)` pair, where `device_id` is an integer and `metric` is a string. Each series is an append-friendly sequence of `(ts, value)` points. Points are durable -- the engine persists them, and they survive a server restart.

Both the row-returning queries (`range`, `last`, `bucket_avg`, `sample_by`) and the ingest verbs (`insert`, `insert_many`) are exposed as **procedures**, because ISO GQL surfaces a row set only through `CALL ... YIELD`. The procedures ride the generic GQL Execute+rows path, so any GQL client that can read result rows can consume them -- no client, proto, or transport changes are required.

{{< callout type="note" >}}
This is a Geode extension that is ISO-GQL-compliant in form: it uses ISO GQL's `CALL` procedure -- not a scalar function, and not Cypher's `UNWIND ... YIELD`.
{{< /callout >}}

### Key capabilities

| Capability | Notes |
|------------|-------|
| Durable store | Points persist and survive a server restart |
| Ingest over the wire | `CALL geode.ts.insert` / `insert_many` (mutating) |
| Range / last queries | `CALL geode.ts.range` / `last` (read-only) |
| Downsampling | `CALL geode.ts.bucket_avg` / `sample_by` (read-only) |
| Inclusive range | `range` returns points in `[start_ts, end_ts]` inclusive of both bounds |
| Concurrent ingest | The store is mutex-guarded for concurrent ingest |
| Value type | **integer (`i64`) only** this release -- float/decimal values are rejected |

## Data model

A series is the combination of:

- `device_id` -- an integer that identifies the source.
- `metric` -- a string that names the measurement (for example `'cpu.load'`).

Each point in a series is a `(ts, value)` pair. **All `ts` and `value` arguments are integers (`i64`)** in this release. A series is an append sequence of these points.

## Quick start

```gql
-- Ingest a single point: device 1, metric 'cpu.load', ts 1000, value 72
CALL geode.ts.insert(1, 'cpu.load', 1000, 72);

-- Read every point in [0, 2000] (inclusive) -- rows of (ts, value)
CALL geode.ts.range(1, 'cpu.load', 0, 2000);
```

Note the integer literals: `value` is `72`, **not** `72.0` (see [Value type](#value-type) below).

## GQL surface

{{< callout type="info" >}}
`device_id` is an integer, `metric` is a string, and **all `ts` and `value` arguments are integers (`i64`)**. `YIELD` is optional on every procedure -- a bare `CALL geode.ts.range(...)` auto-projects its result columns as rows.
{{< /callout >}}

### Write (mutating)

The write procedures are classified as mutating, so they require write privilege. A read-only user **cannot** run them.

```gql
-- One point -> YIELD inserted (count of points written)
CALL geode.ts.insert(device_id, metric, ts, value) YIELD inserted;

-- Many points in one batch (one sort + one durable append) -> YIELD inserted
CALL geode.ts.insert_many(device_id, metric, [[ts1, value1], [ts2, value2], ...]) YIELD inserted;
```

Example:

```gql
CALL geode.ts.insert(1, 'cpu.load', 1000, 72);
CALL geode.ts.insert_many(1, 'cpu.load', [[1010, 73], [1020, 71], [1030, 75]]);
```

`insert_many` batches the points into a single sort and a single durable append, which makes it the preferred path for bulk ingest.

### Read (read-only)

The read procedures classify as read-only -- a read-only user can query but not ingest.

```gql
-- All points in [start_ts, end_ts] (inclusive) -> rows of (ts, value)
CALL geode.ts.range(device_id, metric, start_ts, end_ts) YIELD ts, value;

-- The most recent point -> 0 or 1 row of (ts, value)
CALL geode.ts.last(device_id, metric) YIELD ts, value;

-- Average per fixed-width bucket -> rows of (bucket_ts, avg)
CALL geode.ts.bucket_avg(device_id, metric, start_ts, end_ts, bucket_seconds) YIELD bucket_ts, avg;

-- Downsample by interval with an aggregation -> rows of (bucket_ts, value)
-- agg in avg | sum | min | max | count | first | last
CALL geode.ts.sample_by(device_id, metric, interval_ms, start_ts, end_ts, agg) YIELD bucket_ts, value;
```

Example:

```gql
CALL geode.ts.range(1, 'cpu.load', 0, 2000);                          -- rows of (ts, value)
CALL geode.ts.last(1, 'cpu.load');                                    -- newest (ts, value)
CALL geode.ts.bucket_avg(1, 'cpu.load', 0, 3600, 60);                -- 60s buckets
CALL geode.ts.sample_by(1, 'cpu.load', 60000, 0, 3600000, 'max');    -- per-minute max
```

## Procedure reference

### geode.ts.insert

Inserts a single point into a series.

```gql
CALL geode.ts.insert(device_id, metric, ts, value) YIELD inserted;
```

`YIELD inserted` returns the count of points written. This procedure is mutating and requires write privilege.

### geode.ts.insert_many

Inserts many points into a series in a single batch (one sort plus one durable append).

```gql
CALL geode.ts.insert_many(device_id, metric, [[ts1, value1], [ts2, value2], ...]) YIELD inserted;
```

The points are passed as a list of `[ts, value]` pairs. `YIELD inserted` returns the count of points written. This procedure is mutating and requires write privilege.

### geode.ts.range

Returns every point in the inclusive interval `[start_ts, end_ts]`.

```gql
CALL geode.ts.range(device_id, metric, start_ts, end_ts) YIELD ts, value;
```

`range` is **inclusive of both bounds** -- a point exactly at `start_ts` or exactly at `end_ts` is returned. The interval is inclusive in both the in-memory and durable paths. Each row is `(ts, value)`.

### geode.ts.last

Returns the most recent point in a series.

```gql
CALL geode.ts.last(device_id, metric) YIELD ts, value;
```

`last` returns **0 or 1 row** of `(ts, value)`. On an empty or missing series it returns 0 rows -- this is not an error.

### geode.ts.bucket_avg

Computes the average value per fixed-width bucket.

```gql
CALL geode.ts.bucket_avg(device_id, metric, start_ts, end_ts, bucket_seconds) YIELD bucket_ts, avg;
```

Buckets are `bucket_seconds` wide. Each row is `(bucket_ts, avg)`. An empty bucket yields a `NULL` value.

### geode.ts.sample_by

Downsamples a series by a fixed interval using a chosen aggregation.

```gql
CALL geode.ts.sample_by(device_id, metric, interval_ms, start_ts, end_ts, agg) YIELD bucket_ts, value;
```

`interval_ms` is the bucket width in milliseconds. `agg` is one of:

| `agg` | Result |
|-------|--------|
| `avg` | Average of values in the bucket |
| `sum` | Sum of values in the bucket |
| `min` | Minimum value in the bucket |
| `max` | Maximum value in the bucket |
| `count` | Number of points in the bucket |
| `first` | First value in the bucket |
| `last` | Last value in the bucket |

Each row is `(bucket_ts, value)`. An empty bucket yields a `NULL` value.

## Value type

**Integer (`i64`) only in this release.** Both the `ts` and `value` arguments are integers. A GQL float/decimal literal (for example `100.0`) for a `ts` or `value` argument is **rejected with a clear error** -- there is no float lane wired through the store, and accepting a Double would force a silent lossy choice. Use `100`, not `100.0`.

{{< callout type="warning" >}}
A float (`f64`) value lane is a deferred, explicit follow-up. In this release, supply integer literals only for `ts` and `value`.
{{< /callout >}}

## Concurrency and durability

- **Concurrency:** the time-series store is mutex-guarded so concurrent ingest from the QUIC worker pool is safe.
- **Durability:** points persist to the store and survive a server restart.
- **Inclusive range:** `range` returns points in `[start_ts, end_ts]` inclusive of **both** bounds, in both the in-memory and durable paths.

## Behavior summary

| Procedure | Class | Rows returned | Empty-series behavior |
|-----------|-------|---------------|-----------------------|
| `insert` | Mutating | `inserted` count | n/a |
| `insert_many` | Mutating | `inserted` count | n/a |
| `range` | Read-only | `(ts, value)` per point | 0 rows |
| `last` | Read-only | `(ts, value)` | 0 rows |
| `bucket_avg` | Read-only | `(bucket_ts, avg)` per bucket | `NULL` for empty buckets |
| `sample_by` | Read-only | `(bucket_ts, value)` per bucket | `NULL` for empty buckets |

## Limitations

- **Integer values only:** `ts` and `value` must be integers (`i64`); float/decimal literals are rejected.
- **Empty `last`:** `last` on an empty or missing series returns 0 rows rather than an error.
- **Empty buckets:** `bucket_avg` and `sample_by` emit a `NULL` value for any bucket that contains no points.

## Related

- [Full-Text Search](/docs/query/full-text-search/) -- the FTS surface this mirrors (`CALL geode.fts.search`)
- [GQL Functions Reference](/docs/gql-reference/functions/) -- function and procedure reference
