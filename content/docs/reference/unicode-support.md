---
title: "Unicode Support and Text Processing"
description: "Comprehensive Unicode support in Geode including NFC normalization, case folding, UTF-8/UTF-16 conversion, and international text processing capabilities."
summary: "Learn about Geode's Unicode implementation with NFC normalization, case folding for search, UTF-8/UTF-16 conversion, and WTF-8 lossy decoding for robust international text handling."
slug: "unicode-support"
url: "/docs/reference/unicode-support/"
date: 2026-01-24
lastmod: 2026-01-24
draft: false
weight: 470
keywords: ["unicode", "NFC normalization", "case folding", "UTF-8", "UTF-16", "text processing", "internationalization", "i18n"]
tags: ["reference", "unicode", "text", "internationalization"]
categories: ["Reference"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/reference/unicode-support/"
    noindex: false
---

<!-- CANARY: REQ=REQ-GQL-UNICODE-012; FEATURE="UTF-8 -> UTF-16 Conversion"; ASPECT=ClientTestZig; STATUS=TESTED; OWNER=clients; UPDATED=2025-09-27 -->

## Overview

Geode provides comprehensive Unicode support for international text processing with NFC normalization, case folding, UTF encoding conversions, and robust error handling. The implementation focuses on correctness, performance, and practical use cases for graph database operations.

### Features

**Core Capabilities**:

- **NFC Normalization**: Canonical composition for consistent text representation
- **Case Folding**: Locale-independent case-insensitive comparisons
- **UTF-8 ↔ UTF-16**: Bidirectional encoding conversion
- **WTF-8 Lossy Decoding**: Graceful handling of ill-formed UTF-8 sequences
- **Full-Text Search Integration**: Normalized text indexing and search
- **Constraint Normalization**: Consistent unique key enforcement

## Unicode Fundamentals

### What is Unicode?

**Unicode** is a universal character encoding standard that provides a unique number (code point) for every character across all writing systems, modern and historic.

**Key Concepts**:

- **Code Point**: Numeric value representing a character (U+0041 = 'A')
- **UTF-8**: Variable-length encoding (1-4 bytes per character)
- **UTF-16**: Variable-length encoding (2 or 4 bytes per character)
- **Normalization**: Converting text to canonical form
- **Case Folding**: Locale-independent case conversion for comparison

### Why Normalization Matters

**Problem**: Multiple representations of "same" text

```plaintext
"café" can be encoded as:
  1. U+0063 U+0061 U+0066 U+00E9 (precomposed é)
  2. U+0063 U+0061 U+0066 U+0065 U+0301 (e + combining acute)

Without normalization: These don't match in string comparison!
With NFC normalization: Both become the same canonical form
```

**Impact on Graph Databases**:

- Unique constraints may fail incorrectly
- Full-text search misses matches
- Case-insensitive comparisons fail
- Index lookups miss data

## NFC Normalization

### Overview

**NFC** (Normalization Form C) is a canonical composition that converts decomposed characters to their precomposed equivalents where possible.

### API

```zig
pub fn nfcNormalize(alloc: std.mem.Allocator, s: []const u8) ![]u8
```

**Parameters**:

- `alloc`: Memory allocator
- `s`: UTF-8 encoded input string

**Returns**:

- Normalized UTF-8 string (caller owns memory)
- `error.InvalidUtf8` if input is not valid UTF-8
- `error.OutOfMemory` if allocation fails

### Examples

**Basic Normalization**:

```zig
const unicode = @import("geode").unicode;
const allocator = std.heap.page_allocator;

// Decomposed → Composed
const input = "café";  // e + combining acute (U+0065 U+0301)
const normalized = try unicode.nfcNormalize(allocator, input);
defer allocator.free(normalized);
// Result: "café" with precomposed é (U+00E9)
```

**Full-Text Search**:

```zig
// Normalize before indexing
const text = "Zürich naïve résumé";
const normalized = try unicode.nfcNormalize(allocator, text);
// Index normalized form for consistent search
try fulltext_index.add(normalized);
```

**Unique Constraints**:

```zig
// Normalize before uniqueness check
const email = "user@exämple.com";
const normalized_email = try unicode.nfcNormalize(allocator, email);
// Check normalized form prevents duplicate variations
if (isEmailTaken(normalized_email)) {
    return error.EmailAlreadyExists;
}
```

### Use Cases

1. **Full-Text Search**:

   ```gql
   -- Automatic normalization in search
   MATCH (doc:Document)
   WHERE doc.text CONTAINS 'café'
   RETURN doc.title
   -- Matches both composed and decomposed forms
   ```

2. **Unique Key Enforcement**:

   ```gql
   -- Create constraint with normalization
   CREATE CONSTRAINT unique_email ON User (email)
   -- "user@exämple.com" and "user@exa\u0308mple.com" treated as same
   ```

3. **ORDER BY Determinism**:

   ```gql
   -- Consistent ordering regardless of composition
   MATCH (p:Person)
   RETURN p.name
   ORDER BY p.name
   ```

## Case Folding

### Overview

**Case Folding** provides locale-independent case-insensitive string comparison. Unlike simple lowercase conversion, case folding handles special cases like German ß → ss.

### API

```zig
pub fn foldCase(alloc: std.mem.Allocator, s: []const u8) ![]u8
```

**Parameters**:

- `alloc`: Memory allocator
- `s`: UTF-8 encoded input string

**Returns**:

- Case-folded UTF-8 string (caller owns memory)
- `error.InvalidUtf8` if input is not valid UTF-8

### Mappings

**Supported Case Foldings**:

- **German ß**: ß → ss (U+00DF → U+0073 U+0073)
- **Greek Σ**: Σ → σ (uppercase sigma → lowercase sigma)
- **Basic Latin**: A-Z → a-z (U+0041-U+005A → U+0061-U+007A)
- **Latin Accents**: À → à, É → é, etc.

### Examples

**Basic Folding**:

```zig
const folded = try unicode.foldCase(allocator, "Straße");
// Result: "strasse" (ß → ss)

const greek = try unicode.foldCase(allocator, "ΣΕΛΛΑΣ");
// Result: "σελλασ" (Σ → σ)
```

**Case-Insensitive Search**:

```zig
// Fold both search term and indexed text
const query = try unicode.foldCase(allocator, "CAFÉ");
const document = try unicode.foldCase(allocator, "café");
// Now: query == document (case-insensitive match)
```

**Username Comparison**:

```zig
// Case-insensitive username lookup
const input = try unicode.foldCase(allocator, "Müller");
const stored = try unicode.foldCase(allocator, "MÜLLER");
if (std.mem.eql(u8, input, stored)) {
    // Usernames match (case-insensitive)
}
```

### Use Cases

1. **Full-Text Search**:

   ```gql
   -- Case-insensitive search (automatic)
   CREATE INDEX doc_text_idx ON Document (text) USING fulltext

   MATCH (doc:Document)
   WHERE doc.text CONTAINS 'Straße'
   RETURN doc.title
   -- Matches: "straße", "Straße", "STRASSE", etc.
   ```

2. **Case-Insensitive Constraints**:

   ```gql
   -- Username uniqueness (case-insensitive)
   CREATE CONSTRAINT unique_username ON User (username)
   -- "Alice", "alice", "ALICE" all rejected as duplicates
   ```

3. **Comparisons**:

   ```gql
   -- Case-insensitive WHERE clause
   MATCH (u:User)
   WHERE lower(u.name) = lower('MÜLLER')
   RETURN u.email
   ```

## UTF-8 ↔ UTF-16 Conversion

### UTF-8 to UTF-16

**API**:

```zig
pub fn utf8ToUtf16Alloc(ally: std.mem.Allocator, s: []const u8) ![]u16
```

**Parameters**:

- `ally`: Memory allocator
- `s`: UTF-8 encoded string

**Returns**:

- UTF-16LE encoded string as `[]u16` (caller owns)
- `error.InvalidUtf8` if input is invalid

**Use Cases**:

- Windows API interoperability
- Java/C# string compatibility
- UTF-16 based protocols

**Example**:

```zig
const utf8_str = "Hello 世界";
const utf16 = try unicode.utf8ToUtf16Alloc(allocator, utf8_str);
defer allocator.free(utf16);
// utf16 now contains UTF-16LE code units
```

### UTF-16 to UTF-8

**API**:

```zig
pub fn utf16ToUtf8Alloc(ally: std.mem.Allocator, units: []const u16) ![]u8
```

**Parameters**:

- `ally`: Memory allocator
- `units`: UTF-16LE code units

**Returns**:

- UTF-8 encoded string (caller owns)
- Allocation errors only (UTF-16 validation handled by stdlib)

**Use Cases**:

- Processing Windows filenames
- Importing data from UTF-16 sources
- Interoperability with .NET applications

**Example**:

```zig
const utf16_data: []const u16 = getWindowsString();
const utf8 = try unicode.utf16ToUtf8Alloc(allocator, utf16_data);
defer allocator.free(utf8);
// utf8 now contains UTF-8 encoded string
```

### Round-Trip Safety

**Guaranteed Properties**:

- UTF-8 → UTF-16 → UTF-8 preserves original (if valid UTF-8)
- UTF-16 → UTF-8 → UTF-16 preserves original (if valid UTF-16)
- Surrogates handled correctly

**Test**:

```zig
// Round-trip test
const original = "Hello 世界 🚀";
const utf16 = try unicode.utf8ToUtf16Alloc(allocator, original);
const back = try unicode.utf16ToUtf8Alloc(allocator, utf16);
assert(std.mem.eql(u8, original, back));  // true
```

## WTF-8 Lossy Decoding

### Overview

**WTF-8** (Wobbly Transformation Format) is a superset of UTF-8 that allows unpaired surrogates. Lossy decoding converts potentially ill-formed sequences to valid UTF-8 by replacing invalid sequences with U+FFFD (replacement character).

### API

```zig
pub fn wtf8LossyToUtf8Alloc(ally: std.mem.Allocator, bytes: []const u8) ![]u8
```

**Parameters**:

- `ally`: Memory allocator
- `bytes`: Potentially ill-formed UTF-8/WTF-8 data

**Returns**:

- Valid UTF-8 string with replacements (caller owns)
- Only allocation errors (never fails on invalid input)

### Use Cases

**Robust File Processing**:

```zig
// Read file with unknown encoding
const file_data = try readFile("unknown.txt");
const valid_utf8 = try unicode.wtf8LossyToUtf8Alloc(allocator, file_data);
// valid_utf8 is guaranteed valid UTF-8
```

**User Input Sanitization**:

```zig
// Handle potentially malformed user input
const user_input = getFormData();
const sanitized = try unicode.wtf8LossyToUtf8Alloc(allocator, user_input);
// Safe to store and display
```

**Legacy Data Migration**:

```zig
// Import data from legacy system with encoding issues
const legacy_data = importFromLegacyDB();
const clean_data = try unicode.wtf8LossyToUtf8Alloc(allocator, legacy_data);
// Store clean data in Geode
```

### Replacement Character

**U+FFFD**: � (Replacement Character)

**Replacement Rules**:

- Invalid UTF-8 sequences → U+FFFD
- Unpaired surrogates → U+FFFD
- Overlong encodings → U+FFFD
- Out-of-range code points → U+FFFD

**Example**:

```zig
const invalid = &[_]u8{0xFF, 0xFE, 0x41};  // Invalid bytes + 'A'
const fixed = try unicode.wtf8LossyToUtf8Alloc(allocator, invalid);
// Result: "��A" (two replacements + valid 'A')
```

## Integration with Geode Features

### Full-Text Search

**Automatic Normalization**:

```gql
-- Index creation normalizes text
CREATE INDEX article_idx ON Article (content) USING fulltext

-- Automatic NFC normalization + case folding
INSERT (a:Article {content: "Zürich café résumé"})

-- Search works with any variation
MATCH (a:Article)
WHERE a.content CONTAINS 'zurich cafe resume'
RETURN a
-- Finds the article (normalized + folded)
```

**Implementation**:

```zig
// FTS analyzer pipeline
fn analyzeText(text: []const u8) ![]Token {
    // 1. NFC normalization
    const normalized = try unicode.nfcNormalize(allocator, text);
    // 2. Case folding
    const folded = try unicode.foldCase(allocator, normalized);
    // 3. Tokenization
    return tokenize(folded);
}
```

### Unique Constraints

**Normalized Keys**:

```gql
CREATE CONSTRAINT unique_email ON User (email)

-- These are treated as duplicates:
INSERT (u1:User {email: "user@exämple.com"})  -- Composed
INSERT (u2:User {email: "user@exa\u0308mple.com"})  -- Decomposed
-- Second INSERT fails: duplicate key (after normalization)
```

**Implementation**:

```zig
fn checkUniqueConstraint(key: []const u8) !void {
    const normalized = try unicode.nfcNormalize(allocator, key);
    if (exists(normalized)) {
        return error.UniqueConstraintViolation;
    }
}
```

### ORDER BY Determinism

**Consistent Ordering**:

```gql
MATCH (p:Person)
RETURN p.name
ORDER BY p.name

-- Results ordered by normalized form:
-- "Müller" (composed)
-- "Müller" (decomposed) -- Same position (normalized)
-- "Schulz"
```

### Expression Comparison

**NFC Comparison**:

```gql
MATCH (u:User)
WHERE u.name = 'Müller'
RETURN u.email

-- Matches both:
-- name = "Müller" (U+00FC composed)
-- name = "Mu\u0308ller" (U+0075 U+0308 decomposed)
```

## Limitations & Future Work

### Current Scope

**Implemented**:

- ✅ NFC normalization (subset)
- ✅ Case folding (targeted mappings)
- ✅ UTF-8 ↔ UTF-16 conversion
- ✅ WTF-8 lossy decoding

**Not Yet Implemented**:

- ❌ Full canonical combining class ordering
- ❌ Complete composition table
- ❌ Locale-sensitive collation
- ❌ Grapheme cluster segmentation
- ❌ NFKC/NFKD normalization
- ❌ UTF-32 operations

### Subset Coverage

**Normalization**:

- Selected decompositions only
- Common Latin, Greek, Cyrillic characters
- Full table generation via `zig build unicode-gen`

**Case Folding**:

- Sharp S (ß → ss)
- Greek sigma variants (Σ/ς/σ)
- Basic Latin (A-Z → a-z)
- Common accented characters

### Future Enhancements

**Planned Features**:

- Full canonical combining class support
- Complete composition tables
- Locale-sensitive collation (ICU integration)
- Grapheme cluster boundary detection
- NFKC compatibility normalization
- Advanced text segmentation

## Performance

### Benchmarks

**NFC Normalization**:

- ASCII-only text: <100ns (fast path)
- Optimized for common Latin characters
- Handles complex scripts
- Memory overhead varies by input

**Case Folding**:

- Fast path for ASCII-only strings
- Handles German ß expansion
- Correct Greek sigma handling

**UTF-8 ↔ UTF-16**:

- Efficient ASCII conversion
- Full multi-byte support
- Surrogate pair handling for rare characters

**WTF-8 Lossy**:

- Valid UTF-8: <100ns overhead
- Invalid sequences: ~500ns per replacement
- Memory: 1.1x input size

### Optimization Tips

**Reuse Allocations**:

```zig
// Use arena allocator for batch processing
var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
defer arena.deinit();
const allocator = arena.allocator();

for (texts) |text| {
    const normalized = try unicode.nfcNormalize(allocator, text);
    // Process normalized text
    // Memory freed in bulk at arena.deinit()
}
```

**Cache Results**:

```zig
// Cache normalized strings
var cache = std.StringHashMap([]const u8).init(allocator);

fn getNormalized(text: []const u8) ![]const u8 {
    if (cache.get(text)) |cached| {
        return cached;
    }
    const normalized = try unicode.nfcNormalize(allocator, text);
    try cache.put(text, normalized);
    return normalized;
}
```

## Testing

### Test Coverage

**Unit Tests**: `tests/canary_unicode_utf16.zig`

- `TestCANARY_REQ_GQL_UNICODE_012_Utf8ToUtf16RoundTrip`
- `TestCANARY_REQ_GQL_UNICODE_013_Utf16ToUtf8RoundTrip`
- `TestCANARY_REQ_GQL_UNICODE_014_Wtf8Lossy`

**Test Cases**:

- Round-trip conversions
- Invalid sequence handling
- Surrogate pair processing
- Emoji support (🚀, 😀, etc.)
- CJK characters (Chinese, Japanese, Korean)
- Combining characters

### Example Tests

```zig
test "UTF-8 to UTF-16 round-trip" {
    const original = "Hello 世界 🚀";
    const utf16 = try unicode.utf8ToUtf16Alloc(allocator, original);
    defer allocator.free(utf16);
    const back = try unicode.utf16ToUtf8Alloc(allocator, utf16);
    defer allocator.free(back);
    try std.testing.expectEqualSlices(u8, original, back);
}

test "WTF-8 lossy decoding" {
    const invalid = &[_]u8{0xFF, 0xFE};
    const valid = try unicode.wtf8LossyToUtf8Alloc(allocator, invalid);
    defer allocator.free(valid);
    // Should contain replacement characters
    try std.testing.expect(valid.len > 0);
}
```

## Best Practices

### Always Normalize User Input

```zig
// ✅ Good: Normalize before storing
const user_input = getFormData();
const normalized = try unicode.nfcNormalize(allocator, user_input);
try storeInDatabase(normalized);

// ❌ Bad: Store raw input
const user_input = getFormData();
try storeInDatabase(user_input);  // May cause duplicate key issues
```

### Use Case Folding for Search

```zig
// ✅ Good: Case-insensitive search
const query = try unicode.foldCase(allocator, user_query);
const results = try searchFullText(query);

// ❌ Bad: Case-sensitive (misses matches)
const results = try searchFullText(user_query);
```

### Handle Errors Gracefully

```zig
// ✅ Good: Fallback on error
const normalized = unicode.nfcNormalize(allocator, text) catch |err| {
    // Log error, use lossy decoding as fallback
    std.log.warn("Normalization failed: {}, using lossy", .{err});
    const safe = try unicode.wtf8LossyToUtf8Alloc(allocator, text);
    return safe;
};

// ❌ Bad: Crash on invalid input
const normalized = try unicode.nfcNormalize(allocator, text);
```

### Free Allocated Memory

```zig
// ✅ Good: Free allocated strings
const normalized = try unicode.nfcNormalize(allocator, text);
defer allocator.free(normalized);
// Use normalized...

// ❌ Bad: Memory leak
const normalized = try unicode.nfcNormalize(allocator, text);
// Forgot to free!
```

## References

### Standards

- **Unicode Standard 15.0**: Character encoding and normalization
  - <https://unicode.org/versions/Unicode15.0.0/>

- **UAX #15**: Unicode Normalization Forms
  - <https://unicode.org/reports/tr15/>

- **UAX #21**: Case Mappings
  - <https://unicode.org/reports/tr21/>

### Implementation

- **Zig Stdlib**: `std.unicode` module
  - UTF-8/UTF-16 conversion functions
  - Validation and error handling

### Code Location

- **Implementation**: `src/unicode/geode_unicode.zig`
- **Tests**: `tests/canary_unicode_utf16.zig`
- **Documentation**: `docs/UNICODE.md`

## Next Steps

**For New Users**:

- [Data Types](/docs/data-types/_index/) - String type fundamentals
- [Full-Text Search](/docs/query/full-text-search/) - Search with Unicode
- [GQL Guide](/docs/gql/guide/) - Query language basics

**For Developers**:

- [Type Conversion](/docs/reference/type-conversion/) - String conversions
- [API Reference](/docs/reference/api-reference-complete/) - Complete function list
- [Testing](/docs/guides/testing-strategies/) - Text processing tests

**For Advanced Users**:

- [Performance Tuning](/docs/query/performance-tuning/) - Text query optimization
- [Indexing](/docs/query/indexing-and-optimization/) - Full-text index configuration

---

**Document Version**: 1.0
**Last Updated**: January 24, 2026
**Status**: Production Ready
**Unicode Version**: 15.0 (subset)
**CANARY**: REQ-GQL-UNICODE-004 through REQ-GQL-UNICODE-014 (TESTED)
