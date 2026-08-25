---
title: "Text Processing & String Operations"
description: "Comprehensive guide to text processing in Geode graph database. Learn about string functions, pattern matching, text manipulation, collation, normalization, and advanced text operations for GQL queries."
keywords:
  - text processing
  - string functions
  - pattern matching
  - text manipulation
  - string operations
  - collation
  - text normalization
  - Geode
  - graph database
  - GQL strings
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/text/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Text processing is fundamental to database applications, from simple string manipulation to complex pattern matching and natural language operations. Geode provides comprehensive text processing capabilities through its GQL implementation, offering a rich set of string functions, pattern matching operators, Unicode support, and text normalization features that enable sophisticated text manipulation in graph queries.

As an ISO/IEC 39075:2024 GQL-compliant graph database, Geode treats text as a first-class data type with full Unicode support, locale-aware collation, and efficient string operations. Whether you're building search interfaces, data cleaning pipelines, or natural language processing workflows, Geode's text processing capabilities provide the tools you need.

## String Data Type

Geode stores text using UTF-8 encoding, supporting the full Unicode character set:

```gql
-- Create nodes with text properties
CREATE (u:User {
  name: 'Alice Johnson',
  email: 'alice@example.com',
  bio: 'Software engineer passionate about graph databases',
  nickname: 'AJ'
});

-- Unicode characters are fully supported
CREATE (u:User {
  name: 'José García',
  greeting: 'こんにちは',  -- Japanese
  emoji: '👋🌍'
});
```

**String Literals**:

```gql
-- Single quotes
'Hello, World!'

-- Double quotes (GQL standard)
"Hello, World!"

-- Escape sequences
'It\'s a string with a quote'
"Line 1\nLine 2\nLine 3"
"Tab\tseparated\tvalues"

-- Unicode escapes
"\u0048\u0065\u006C\u006C\u006F"  -- "Hello"
```

## Basic String Functions

**Length and Size**:

```gql
-- String length in BYTES (length() and size() are the same function)
MATCH (u:User)
RETURN u.name, length(u.name) AS name_bytes;

MATCH (u:User)
RETURN u.bio, size(u.bio) AS byte_size;
```

`length()`/`size()` measure UTF-8 **bytes**, so for ASCII text they equal the
character count and for multi-byte text they do not. There is no
`OCTET_LENGTH` or `CHAR_LENGTH` function and no code-point counter — compute a
character count in the client if you need one.

**Case Conversion**:

```gql
-- Convert to uppercase
MATCH (u:User)
RETURN UPPER(u.name) AS uppercase_name;

-- Convert to lowercase
MATCH (u:User)
RETURN LOWER(u.email) AS lowercase_email;

```

Title case has no built-in: there is no `INITCAP`. Capitalise in the client, or
compose it from the primitives for a single-word value:

```gql
MATCH (u:User)
RETURN toUpper(substring(u.first_name, 0, 1)) + toLower(substring(u.first_name, 1))
       AS title_case;
```

**Trimming and Padding**:

```gql
-- Remove leading and trailing whitespace
MATCH (u:User)
RETURN TRIM(u.name) AS trimmed_name;

-- Remove leading whitespace
MATCH (u:User)
RETURN LTRIM(u.name) AS left_trimmed;

-- Remove trailing whitespace
MATCH (u:User)
RETURN RTRIM(u.name) AS right_trimmed;

```

Padding has no built-in: there is no `LPAD` or `RPAD`. Pad in the client, or
store the padded form as its own property when you need to sort or match on
it.

## Substring and Extraction

**Substring Operations**:

```gql
-- Extract substring by position and length
MATCH (u:User)
RETURN SUBSTRING(u.email, 1, 5) AS first_five;

-- Extract from position to end
MATCH (u:User)
RETURN SUBSTRING(u.name FROM 6) AS last_name_approx;

-- Extract using position and length
MATCH (u:User)
RETURN SUBSTRING(u.bio, 1, 50) AS preview;
```

**String Splitting**:

`split(string, delimiter)` is listed by `SHOW FUNCTIONS`, but the evaluator has
no dispatch for it — treat it as unavailable until that is resolved upstream.
Split in the client and pass the parts in as a list, or model the parts as
properties when you need to query them:

```gql
-- Parts supplied by the client as a list parameter
MATCH (t:Tag) WHERE id(t) = $tag_id
UNWIND $keywords AS keyword
MERGE (k:Keyword {name: toLower(trim(keyword))})
MERGE (t)-[:HAS_KEYWORD]->(k);

-- Store the parts you filter on rather than splitting at query time
MATCH (u:User)
WHERE u.first_name = 'Alice'
RETURN u.first_name, u.last_name;
```

**Pattern Extraction**:

Geode has no regex **extraction** function — there is no `REGEXP_EXTRACT`,
`REGEXP_EXTRACT_ALL` or capture-group access. What the engine provides is a
regex **predicate**, `=~`, backed by a lightweight matcher supporting `^`, `$`,
`.`, `*`, `+`, `?`, character classes and escapes (no alternation, no capture
groups):

```gql
-- Test a pattern
MATCH (u:User)
WHERE u.email =~ '^[a-z]+@example\.com$'
RETURN u.email;
```

To pull a piece out of a string, use position-based extraction, or extract in
the client and store the result:

```gql
-- Local part of an email, without regex
MATCH (u:User)
RETURN substring(u.email, 0, size(u.email) - size(url_host(u.email))) AS username;
```

## String Concatenation and Formatting

**Concatenation**:

```gql
-- Concatenate strings
MATCH (u:User)
RETURN u.first_name + ' ' + u.last_name AS full_name;

-- Concatenate with the `||` operator
MATCH (u:User)
RETURN u.first_name || ' ' || u.last_name AS full_name;
```

There is no `CONCAT` or `CONCAT_WS` function: `+` and `||` are the
concatenation operators. Both propagate `NULL` (`null || 'x'` is `null`), so
guard optional parts with `coalesce()`:

```gql
MATCH (u:User)
RETURN u.first_name || ' ' || coalesce(u.middle_name || ' ', '') || u.last_name
       AS full_name;
```

**String Formatting**:

There is no `FORMAT` function. Build the string with concatenation and
`toString()`, and do numeric formatting (currency, fixed decimals) in the
client or in the presentation layer:

```gql
MATCH (u:User)
RETURN 'User: ' || u.name || ' (ID: ' || toString(u.user_id) || ')' AS formatted;

MATCH (p:Product)
RETURN '$' || toString(round(p.price * 100) / 100) AS approx_price;
```

**String Aggregation**:

There is no `STRING_AGG`. The aggregate that exists is `collect()`, which
returns a `LIST`; join it in the client (or keep it as a list, which is usually
more useful):

```gql
-- Members per team, as a list
MATCH (u:User)-[:MEMBER_OF]->(team:Team)
RETURN team.name, collect(u.name) AS members;

-- Ordered aggregation: order the rows before collecting
MATCH (u:User)-[:PURCHASED]->(p:Product)
WITH u, p ORDER BY p.purchased_at
RETURN u.name, collect(p.name) AS purchase_history;
```

## Pattern Matching

**LIKE Operator**:

```gql
-- Wildcard matching
MATCH (u:User)
WHERE u.email LIKE '%@example.com'
RETURN u.name, u.email;

-- Pattern matching with wildcards
MATCH (p:Product)
WHERE p.sku LIKE 'PROD-2024-%'
RETURN p.name, p.sku;

-- Case-insensitive matching
MATCH (u:User)
WHERE LOWER(u.name) LIKE '%smith%'
RETURN u.name;
```

**Regular Expressions**:

```gql
-- Regex matching
MATCH (u:User)
WHERE u.email =~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
RETURN u.email;

-- Case-insensitive regex
MATCH (p:Product)
WHERE p.name =~ '(?i)laptop'
RETURN p.name;

-- Regex is a predicate only: `=~` tests a pattern, and there is no extraction
-- function or capture-group access.
MATCH (p:Post)
WHERE p.content =~ '.*#[a-zA-Z0-9]+.*'
RETURN p.title;
```

**STARTS WITH, ENDS WITH, CONTAINS**:

```gql
-- Prefix matching
MATCH (p:Product)
WHERE p.sku STARTS WITH 'PROD-'
RETURN p.name, p.sku;

-- Suffix matching
MATCH (u:User)
WHERE u.email ENDS WITH '@company.com'
RETURN u.name, u.email;

-- Substring matching
MATCH (p:Post)
WHERE p.content CONTAINS 'graph database'
RETURN p.title, p.content;
```

## Text Replacement and Transformation

**Replace Operations**:

```gql
-- Simple replacement
MATCH (u:User)
RETURN REPLACE(u.phone, '-', '') AS phone_no_dashes;

-- Multiple replacements
MATCH (t:Text)
RETURN REPLACE(REPLACE(t.content, '\n', ' '), '\t', ' ') AS cleaned;
```

**Character Translation**:

There is no `TRANSLATE` and no regex replacement (`REGEXP_REPLACE`); `replace()`
is a literal substring replacement. Chain it for a small, fixed set of
characters, and do anything larger in the client:

```gql
-- Strip separators from a SKU
MATCH (p:Product)
RETURN replace(replace(p.sku, '-', ''), '_', '') AS sku_alphanumeric;
```

## String Comparison and Sorting

**Collation-Aware Comparison**:

```gql
-- Case-insensitive comparison
MATCH (u:User)
WHERE LOWER(u.name) = LOWER('alice johnson')
RETURN u;

-- Ordering is by code point; there is no COLLATE clause and no NATURAL_SORT
-- function. For locale or natural ordering, store a client-computed sort key
-- and order by that.
MATCH (p:Product)
RETURN p.name
ORDER BY p.sort_key;
```

**Fuzzy and Relevance Matching**:

Geode has no scalar string-similarity function — there is no `LEVENSHTEIN`,
`SOUNDEX` or string-argument `SIMILARITY` in the function registry (`similarity()`
is a *vector* function and takes two `VECTOR` arguments). Relevance-ranked text
matching is served by the full-text index and the `geode.fts.*` procedures, which
return a BM25 `score` per matching node:

```gql
-- Create a full-text index over the property you want to rank on
CREATE INDEX product_name_fts FOR (p:Product) ON (p.name) USING fulltext;

-- Relevance-ranked search: one row per match, as (node id, BM25 score)
CALL geode.fts.search('product_name_fts', 'laptop', 10) YIELD node, score;
```

`geode.fts.search` yields the matching node's **id** and its BM25 `score`; resolve
the ids to full nodes in a follow-up `MATCH ... WHERE id(p) IN $ids` query. See
[Full-Text Search](/docs/query/full-text-search/) for the complete surface,
including `geode.fts.phrase` and `geode.fts.proximity`.

For exact or prefix matching that does not need a score, use the operators and
functions the evaluator actually implements:

```gql
-- Case-insensitive substring match
MATCH (p:Product)
WHERE icontains(p.name, 'laptop')
RETURN p.name;

-- Case-insensitive equality via normalization to a single case
MATCH (u:User)
WHERE toLower(u.last_name) = toLower('Smith')
RETURN u.name;
```

**Limitation**: edit-distance (Levenshtein) and phonetic (Soundex/Metaphone)
matching are not implemented in the engine. Compute them client-side, or index a
precomputed phonetic key as a normal property and match on it exactly.

## Unicode and Normalization

**Unicode Operations**:

Text is stored as UTF-8 and the string functions operate on that encoding
directly:

```gql
-- First character of a name (substring is 1-indexed)
MATCH (u:User)
RETURN substring(u.name, 1, 1) AS first_char;

-- Length of a Unicode string
MATCH (u:User)
RETURN u.greeting, length(u.greeting) AS len;
```

Code-point conversion helpers (`ASCII()`, `CHR()`) are **not** implemented — do
that conversion in the client.

**Unicode normalization**: Geode has no `NORMALIZE(x, 'NFC')` function — Unicode
normal forms are not exposed to GQL. Normalize to NFC (or NFKC) in the client
before writing, and store the normalized value as the property you match on. For
case-insensitive comparison the engine does provide `toLower()`/`toUpper()` and
the `icontains()` operator:

```gql
-- Case-insensitive comparison against an already-NFC-normalized property
MATCH (u:User)
WHERE toLower(u.name) = toLower($search_term)
RETURN u;
```

**Locale-Specific Operations**:

Geode does not implement the `COLLATE` clause; comparison and case conversion are
locale-independent. `toUpper()`/`toLower()` apply the default Unicode mapping, so
locale-specific rules (for example Turkish dotless-i) must be applied client-side
and stored as a separate precomputed property if you need to match on them:

```gql
-- Match on a client-computed, locale-folded key stored alongside the name
MATCH (u:User)
WHERE u.name_folded_tr = $folded_search_term
RETURN u;
```

## Text Encoding and Hashing

**Encoding Functions**:

Geode has no Base64 or URL-encoding functions (`BASE64_ENCODE`,
`BASE64_DECODE`, `URL_ENCODE`, `URL_DECODE` do not exist). The encodings it
does implement are hex and URL *parsing*:

```gql
-- Hex encode / decode a binary value
MATCH (c:Config)
RETURN to_hex(c.payload) AS hex_encoded;

RETURN from_hex('\x48656c6c6f') AS decoded_bytes;

-- Parse a URL into its parts
MATCH (l:Link)
RETURN url_scheme(l.href) AS scheme,
       url_host(l.href) AS host,
       url_path(l.href) AS path,
       url_query(l.href) AS query;
```

Base64 and percent-encoding belong in the client; store the encoded form as an
ordinary string property if you need to query it.

**Hashing Functions**:

Geode does not compute digests: there is no `MD5` or `SHA256` function. What it
provides is a `HASH` **type** whose constructor takes an algorithm name and an
already-computed hex digest, plus a constant-time comparison:

```gql
-- Store a digest computed by the client
MATCH (u:User) WHERE id(u) = $id
SET u.email_hash = hash('sha3-256', $hex_digest);

-- Constant-time comparison against another digest
MATCH (u:User)
WHERE hash_equals(u.email_hash, hash('sha3-256', $probe_digest))
RETURN u.email;
```

`hash()` accepts `sha3-256`, `sha3-512`, `blake3`, `blake2b-256`,
`blake2b-512`, `blake2s-256` and `argon2id`, and requires a hex digest of the
matching length (64 hex characters for the 256-bit algorithms, 128 for the
512-bit ones).

Never hash passwords this way. Password verification is the server's job —
see [password hashing](/docs/security/password-hashing/) and the
`geode.auth.*` procedures.

## Performance Optimization

**Index Usage for Text**:

```gql
-- Create index for prefix searches
CREATE INDEX user_email_prefix ON :User(email);

-- Efficient prefix query
MATCH (u:User)
WHERE u.email STARTS WITH 'alice'  -- Uses index
RETURN u;

-- Full-text index for content search
CREATE FULLTEXT INDEX post_content ON :Post(content);

MATCH (p:Post)
WHERE p.content MATCHES 'graph database'  -- Uses full-text index
RETURN p;
```

**Avoid Inefficient Patterns**:

```gql
-- Inefficient: requires full scan
MATCH (u:User)
WHERE u.email LIKE '%@example.com'  -- Cannot use index
RETURN u;

-- Efficient: uses index
MATCH (u:User)
WHERE u.email ENDS WITH '@example.com'  -- Can use suffix index
RETURN u;

-- Inefficient: case conversion on every row
MATCH (u:User)
WHERE LOWER(u.name) = 'alice'
RETURN u;

-- Efficient: store normalized version
CREATE INDEX user_name_lower ON :User(LOWER(name));
MATCH (u:User)
WHERE LOWER(u.name) = 'alice'  -- Uses expression index
RETURN u;
```

## Best Practices

1. **Use Appropriate Data Types**: Store structured data (emails, URLs, IDs) with validation rather than treating as plain text.

2. **Normalize Text Early**: Perform case conversion, trimming, and normalization during data ingestion rather than at query time.

3. **Index Strategically**: Create indexes on frequently filtered string properties, especially for prefix and exact match queries.

4. **Leverage Full-Text Search**: Use full-text indexes for keyword search rather than `LIKE` or `CONTAINS` on large text fields.

5. **Validate Input**: Use regular expressions and constraints to ensure text data quality.

6. **Consider Locale**: Use locale-aware collation and normalization for international applications.

## Common Use Cases

**Email Validation**:

```gql
CREATE (u:User {
  email: 'alice@example.com'
})
WHERE u.email =~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
```

**Name Normalization**:

```gql
-- Case-fold in the database; title-casing has no built-in, so store the
-- client-computed display form separately if you need it.
MATCH (u:User)
SET u.name_normalized = toLower(trim(u.name));
```

**Tag Extraction**:

```gql
-- Hashtags are extracted in the client (there is no regex-extraction function)
-- and passed in as a list parameter.
MATCH (p:Post) WHERE id(p) = $post_id
UNWIND $tags AS tag
MERGE (t:Tag {name: toLower(tag)})
MERGE (p)-[:TAGGED_WITH]->(t);
```

**Search Autocomplete**:

```gql
MATCH (p:Product)
WHERE p.name STARTS WITH 'lapt'
RETURN p.name
ORDER BY LENGTH(p.name)
LIMIT 10;
```

## Related Topics

- Full-Text Search and Indexing
- Unicode Support and Internationalization
- JSON Data Type and Functions
- Regular Expressions and Pattern Matching
- Data Validation and Constraints
- Query Optimization
- Collation and Sorting

## Further Reading

- String Functions Reference
- Regular Expression Syntax
- Unicode Normalization Forms
- Collation and Locale Configuration
- Full-Text Search Guide
- Performance Tuning for Text Queries
