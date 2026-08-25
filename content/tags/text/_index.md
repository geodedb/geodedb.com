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
-- String length (character count)
MATCH (u:User)
RETURN u.name, LENGTH(u.name) AS name_length;

-- Byte size
MATCH (u:User)
RETURN u.bio, OCTET_LENGTH(u.bio) AS byte_size;

-- Character count (Unicode-aware)
MATCH (u:User)
RETURN u.greeting, CHAR_LENGTH(u.greeting) AS char_count;
```

**Case Conversion**:

```gql
-- Convert to uppercase
MATCH (u:User)
RETURN UPPER(u.name) AS uppercase_name;

-- Convert to lowercase
MATCH (u:User)
RETURN LOWER(u.email) AS lowercase_email;

-- Title case (capitalize first letter of each word)
MATCH (u:User)
RETURN INITCAP(u.name) AS title_case;
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

-- Pad string to specified length
MATCH (p:Product)
RETURN LPAD(p.sku, 10, '0') AS padded_sku;  -- Left pad with zeros

MATCH (p:Product)
RETURN RPAD(p.name, 20, '.') AS padded_name;  -- Right pad with dots
```

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

```gql
-- Split string into array
MATCH (u:User)
RETURN u.name, SPLIT(u.name, ' ') AS name_parts;

-- Extract first element
MATCH (u:User)
WITH SPLIT(u.name, ' ') AS parts
RETURN parts[0] AS first_name;

-- Process split results
MATCH (t:Tag)
UNWIND SPLIT(t.keywords, ',') AS keyword
RETURN TRIM(keyword) AS cleaned_keyword;
```

**Pattern Extraction**:

```gql
-- Extract using regular expressions
MATCH (u:User)
RETURN REGEXP_EXTRACT(u.email, '^([^@]+)') AS username;

-- Extract all matches
MATCH (p:Post)
RETURN REGEXP_EXTRACT_ALL(p.content, '#(\w+)') AS hashtags;
```

## String Concatenation and Formatting

**Concatenation**:

```gql
-- Concatenate strings
MATCH (u:User)
RETURN u.first_name + ' ' + u.last_name AS full_name;

-- Concatenate with separator
MATCH (u:User)
RETURN CONCAT(u.first_name, ' ', u.last_name) AS full_name;

-- Concatenate with null handling
MATCH (u:User)
RETURN CONCAT_WS(' ', u.first_name, u.middle_name, u.last_name) AS full_name;
```

**String Formatting**:

```gql
-- Format string with placeholders
MATCH (u:User)
RETURN FORMAT('User: %s (ID: %d)', u.name, u.user_id) AS formatted;

-- Formatted output
MATCH (p:Product)
RETURN FORMAT('$%.2f', p.price) AS formatted_price;
```

**String Aggregation**:

```gql
-- Aggregate strings with separator
MATCH (u:User)-[:MEMBER_OF]->(team:Team)
RETURN team.name, STRING_AGG(u.name, ', ') AS members
GROUP BY team.name;

-- Aggregate with ordering
MATCH (u:User)-[:PURCHASED]->(p:Product)
RETURN u.name,
       STRING_AGG(p.name ORDER BY p.purchased_at, ', ') AS purchase_history
GROUP BY u.name;
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

-- Extract with regex
MATCH (p:Post)
WHERE p.content =~ '#(\w+)'
RETURN REGEXP_EXTRACT_ALL(p.content, '#(\w+)') AS hashtags;
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

-- Regular expression replacement
MATCH (p:Post)
RETURN REGEXP_REPLACE(p.content, '#(\w+)', '[$1]') AS processed_content;

-- Multiple replacements
MATCH (t:Text)
RETURN REPLACE(REPLACE(t.content, '\n', ' '), '\t', ' ') AS cleaned;
```

**Character Translation**:

```gql
-- Translate characters
MATCH (u:User)
RETURN TRANSLATE(u.name, 'aeiou', 'AEIOU') AS vowels_upper;

-- Remove specific characters
MATCH (p:Product)
RETURN TRANSLATE(p.sku, '-_', '') AS sku_alphanumeric;
```

## String Comparison and Sorting

**Collation-Aware Comparison**:

```gql
-- Case-insensitive comparison
MATCH (u:User)
WHERE LOWER(u.name) = LOWER('alice johnson')
RETURN u;

-- Locale-aware sorting
MATCH (u:User)
RETURN u.name
ORDER BY u.name COLLATE 'en_US';

-- Natural sorting (numbers sorted numerically)
MATCH (p:Product)
RETURN p.name
ORDER BY NATURAL_SORT(p.name);
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

```gql
-- Base64 encoding
MATCH (u:User)
RETURN BASE64_ENCODE(u.password_hash) AS encoded;

-- Base64 decoding
MATCH (c:Config)
RETURN BASE64_DECODE(c.encoded_value) AS decoded;

-- URL encoding
MATCH (p:Product)
RETURN URL_ENCODE(p.name) AS url_safe_name;
```

**Hashing Functions**:

```gql
-- MD5 hash
MATCH (u:User)
RETURN MD5(u.email) AS email_hash;

-- SHA256 hash
MATCH (u:User)
RETURN SHA256(u.email) AS email_sha;

-- Password hashing (use proper password hashing in production)
CREATE (u:User {
  email: 'user@example.com',
  password_hash: SHA256('password' + 'salt')
});
```

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
MATCH (u:User)
SET u.name_normalized = TRIM(INITCAP(u.name));
```

**Tag Extraction**:

```gql
MATCH (p:Post)
WITH p, REGEXP_EXTRACT_ALL(p.content, '#(\w+)') AS tags
UNWIND tags AS tag
MERGE (t:Tag {name: LOWER(tag)})
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
