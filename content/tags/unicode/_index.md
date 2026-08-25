---
title: "Unicode Support & Internationalization"
description: "Comprehensive guide to Unicode and internationalization in Geode graph database. Learn about UTF-8 encoding, character normalization, collation, multilingual support, and global text handling."
keywords:
  - Unicode support
  - UTF-8 encoding
  - internationalization
  - i18n
  - multilingual
  - character encoding
  - collation
  - Unicode normalization
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/unicode/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Modern applications serve global audiences with diverse languages, scripts, and cultural conventions. Geode provides comprehensive Unicode support and internationalization (i18n) capabilities, enabling you to build truly global graph applications that handle multilingual content, complex scripts, and locale-specific operations with ease and correctness.

As an ISO/IEC 39075:2024 GQL-compliant graph database, Geode uses UTF-8 encoding throughout, supporting the full Unicode 15.0 character set including emoji, mathematical symbols, ancient scripts, and all modern languages. From right-to-left text to combining diacritical marks, Geode handles the complexities of international text processing transparently and efficiently.

## Unicode Fundamentals in Geode

**UTF-8 Encoding**: Geode stores all text using UTF-8, the universal character encoding that represents every character in the Unicode standard. UTF-8 is backward-compatible with ASCII, efficient for most languages, and widely supported across platforms and programming languages.

```gql
-- All these characters work seamlessly
CREATE (u:User {
  name_en: 'Alice',
  name_ja: 'アリス',
  name_ar: 'أليس',
  name_ru: 'Алиса',
  name_zh: '爱丽丝',
  greeting_emoji: '👋🌍🎉'
});

-- Unicode escapes
CREATE (t:Text {
  content: '\u0048\u0065\u006C\u006C\u006F'  -- "Hello"
});
```

**Character Properties**: Geode correctly handles Unicode character properties including:

- **Case Mapping**: Upper, lower, and title case transformations
- **Character Categories**: Letters, numbers, punctuation, symbols, separators
- **Script Detection**: Latin, Cyrillic, Arabic, Han, etc.
- **Directionality**: Left-to-right (LTR) and right-to-left (RTL) text
- **Combining Characters**: Diacritics, accents, and modifiers

## Multilingual Text Storage

**Storing Multiple Languages**:

```gql
-- Product with multilingual descriptions
CREATE (p:Product {
  sku: 'LAPTOP-001',
  name_en: 'Professional Laptop',
  name_es: 'Portátil Profesional',
  name_fr: 'Ordinateur Portable Professionnel',
  name_de: 'Professioneller Laptop',
  name_ja: 'プロフェッショナル ラップトップ',
  name_zh: '专业笔记本电脑'
});

-- Content with mixed scripts
CREATE (doc:Document {
  title: 'International Meeting Notes',
  content: 'Discussion about データベース (database) and قاعدة البيانات'
});
```

**Language-Specific Properties**:

```gql
-- Query by language
MATCH (p:Product)
RETURN p.name_en, p.name_es, p.name_fr;

-- Dynamic language selection
MATCH (p:Product)
WITH p, 'es' AS lang
RETURN p.sku,
  CASE lang
    WHEN 'en' THEN p.name_en
    WHEN 'es' THEN p.name_es
    WHEN 'fr' THEN p.name_fr
    ELSE p.name_en
  END AS localized_name;
```

## Character Normalization

Unicode defines multiple ways to represent the same character (e.g., "é" can be a single character or "e" + combining accent). Normalization ensures consistent representation:

**Normalization Forms**:

- **NFC (Canonical Composition)**: Combines base + modifiers into single characters
- **NFD (Canonical Decomposition)**: Separates characters into base + modifiers
- **NFKC (Compatibility Composition)**: Aggressive composition with compatibility mappings
- **NFKD (Compatibility Decomposition)**: Aggressive decomposition with compatibility mappings

{{< callout type="warning" >}}
Geode does **not** expose a `NORMALIZE()` function to GQL — Unicode normal forms
are not part of the engine's function registry. Normalization must be performed
**client-side**, before the value reaches the database.
{{< /callout >}}

The practical pattern is to normalize once on ingestion and store the normalized
string, so that every later comparison is a plain equality against an
already-normalized property:

```gql
-- Write the client-normalized (NFC) value
MATCH (u:User {id: $id})
SET u.name = $name_nfc;

-- Compare against a client-normalized search term
MATCH (u:User)
WHERE u.name = $search_term_nfc
RETURN u;

-- Case-insensitive containment; toLower() and icontains() ARE implemented
MATCH (u:User)
WHERE icontains(u.name, $search_term_nfc)
RETURN u.name;
```

**When to Normalize** (all client-side):

- **Data Ingestion**: Normalize on insert to ensure consistency
- **Comparison**: Normalize user input with the same form used at ingestion
- **Indexing**: Index the stored normalized property for consistent matching
- **Search**: Normalize search terms with the same library used at ingestion

## Collation and Sorting

Collation determines how text is sorted and compared, respecting language-specific rules:

**Default Collation**:

```gql
-- Default UTF-8 binary collation (byte-order sorting)
MATCH (u:User)
RETURN u.name
ORDER BY u.name;
```

**Locale-Specific Collation**:

```gql
-- English collation
MATCH (u:User)
RETURN u.name
ORDER BY u.name COLLATE 'en_US';

-- Spanish collation (ñ sorted after n)
MATCH (u:User)
RETURN u.name
ORDER BY u.name COLLATE 'es_ES';

-- German collation (ä, ö, ü sorted specifically)
MATCH (u:User)
RETURN u.name
ORDER BY u.name COLLATE 'de_DE';

-- Case-insensitive collation
MATCH (u:User)
RETURN u.name
ORDER BY u.name COLLATE 'en_US_CI';  -- CI = Case Insensitive
```

**Supported Locales**:

Geode supports 100+ locales including:

- Western European: en_US, es_ES, fr_FR, de_DE, it_IT, pt_BR
- Nordic: sv_SE, no_NO, da_DK, fi_FI
- Eastern European: pl_PL, cs_CZ, ru_RU, uk_UA
- Asian: zh_CN, ja_JP, ko_KR, th_TH, vi_VN
- Middle Eastern: ar_SA, he_IL, fa_IR, tr_TR

## Case Conversion

Unicode-aware case conversion respects language-specific rules:

```gql
-- Standard case conversion
MATCH (u:User)
RETURN UPPER(u.name), LOWER(u.name);

-- Locale-specific case conversion
MATCH (u:User)
RETURN UPPER(u.name COLLATE 'tr_TR') AS turkish_upper;

-- Turkish 'i' has special case rules:
-- 'i' → 'İ' (dotted capital I)
-- 'ı' → 'I' (dotless capital I)
RETURN UPPER('istanbul' COLLATE 'tr_TR');  -- 'İSTANBUL'
```

**Title Case**:

```gql
-- Initialize capitals (title case)
MATCH (u:User)
RETURN INITCAP(u.name) AS title_case;

-- Example: 'alice johnson' → 'Alice Johnson'
```

## Emoji and Special Characters

Geode fully supports emoji and special Unicode characters:

```gql
-- Store emoji
CREATE (p:Post {
  content: 'Loving the new features! 🎉🚀💯',
  reactions: ['❤️', '👍', '😂']
});

-- Search for emoji
MATCH (p:Post)
WHERE p.content CONTAINS '🎉'
RETURN p.content;

-- Count emoji
MATCH (p:Post)
RETURN LENGTH(REGEXP_EXTRACT_ALL(p.content, '[\u{1F600}-\u{1F64F}]')) AS emoji_count;

-- Mathematical symbols
CREATE (eq:Equation {
  formula: '∫₀^∞ e^(-x²) dx = √π / 2',
  symbols: ['∫', '∞', '√', 'π']
});
```

**Surrogate Pairs**: Geode correctly handles characters outside the Basic Multilingual Plane (BMP), including emoji that require surrogate pairs in UTF-16:

```gql
-- These emoji use 4-byte UTF-8 sequences
CREATE (p:Post {
  content: '🌈🦄🎨'  -- Rainbow, unicorn, palette
});

-- Character length is correct (3 characters, not 6 or 12)
MATCH (p:Post)
RETURN CHAR_LENGTH(p.content);  -- Returns 3
```

## Right-to-Left (RTL) Text

Geode stores and retrieves RTL text (Arabic, Hebrew, etc.) correctly:

```gql
-- Arabic text (RTL)
CREATE (p:Post {
  content_ar: 'مرحبا بك في قاعدة البيانات',
  content_he: 'ברוכים הבאים למסד הנתונים'
});

-- Mixed LTR/RTL (bidirectional text)
CREATE (p:Post {
  content: 'Welcome مرحبا שלום to our database!'
});

-- Query RTL text
MATCH (p:Post)
WHERE p.content_ar CONTAINS 'قاعدة البيانات'
RETURN p.content_ar;
```

## Internationalization Patterns

**Language Detection**:

```gql
-- Store language metadata
CREATE (doc:Document {
  content: 'This is an English document',
  language: 'en',
  detected_script: 'Latin'
});

-- Query by language
MATCH (doc:Document {language: 'en'})
RETURN doc.content;
```

**Locale-Specific Formatting**:

```gql
-- Store locale preferences
CREATE (u:User {
  name: 'Alice',
  locale: 'en_US',
  timezone: 'America/New_York',
  date_format: 'MM/DD/YYYY',
  number_format: '#,##0.00'
});

-- Query with locale
MATCH (u:User)
RETURN u.name,
       FORMAT_DATE(u.created_at, u.date_format) AS formatted_date,
       FORMAT_NUMBER(u.balance, u.number_format) AS formatted_balance;
```

## Full-Text Search with Multiple Languages

Create language-specific full-text indexes:

```gql
-- English full-text index
CREATE FULLTEXT INDEX content_en ON :Document(content_en)
WITH (language: 'english');

-- Spanish full-text index
CREATE FULLTEXT INDEX content_es ON :Document(content_es)
WITH (language: 'spanish');

-- Chinese full-text index (requires CJK tokenization)
CREATE FULLTEXT INDEX content_zh ON :Document(content_zh)
WITH (language: 'chinese');

-- Multi-language search
MATCH (d:Document)
WHERE d.content_en MATCHES 'database' OR d.content_es MATCHES 'base de datos'
RETURN d;
```

## Character Analysis Functions

**Character Categories**:

```gql
-- Check character type
RETURN IS_ALPHA('A');     -- true
RETURN IS_ALPHA('5');     -- false
RETURN IS_DIGIT('5');     -- true
RETURN IS_ALPHANUMERIC('A5');  -- true

-- Unicode category
RETURN UNICODE_CATEGORY('A');    -- 'Lu' (Letter, uppercase)
RETURN UNICODE_CATEGORY('π');    -- 'Ll' (Letter, lowercase)
RETURN UNICODE_CATEGORY('5');    -- 'Nd' (Number, decimal)
RETURN UNICODE_CATEGORY('!');    -- 'Po' (Punctuation, other)
```

**Script Detection**:

```gql
-- Detect script
RETURN DETECT_SCRIPT('Hello');     -- 'Latin'
RETURN DETECT_SCRIPT('こんにちは');  -- 'Hiragana'
RETURN DETECT_SCRIPT('你好');       -- 'Han'
RETURN DETECT_SCRIPT('مرحبا');     -- 'Arabic'
RETURN DETECT_SCRIPT('Привет');    -- 'Cyrillic'
```

## Performance Considerations

**Indexing Unicode Text**:

Indexes are defined over stored properties, not over expressions — and since
normalization happens client-side, store the normalized form as its own property
and index that:

```gql
-- Index the stored, client-normalized (NFC) property
CREATE INDEX ON :User(name_nfc)

-- Efficient search: plain equality against the indexed normalized property
MATCH (u:User)
WHERE u.name_nfc = $search_term_nfc
RETURN u;
```

**Storage Efficiency**:

- UTF-8 is most efficient for ASCII and European languages (1 byte per character)
- Asian scripts require 3-4 bytes per character
- Emoji and rare characters may require 4 bytes
- Normalization can reduce storage size by combining characters

**Query Optimization**:

```gql
-- Inefficient: case conversion on every row
MATCH (u:User)
WHERE LOWER(u.name) = 'alice'
RETURN u;

-- Efficient: store lowercase version
CREATE INDEX user_name_lower ON :User(LOWER(name));
SET u.name_lower = LOWER(u.name);  -- Compute once on insert/update
```

## Best Practices

1. **Always Normalize**: Normalize text to NFC on insertion for consistent storage and comparison.

2. **Choose Appropriate Collation**: Use locale-specific collation for sorting user-visible lists.

3. **Index Normalized Values**: Create indexes on normalized text for efficient searches.

4. **Validate Input**: Use Unicode-aware validation for emails, URLs, and other constrained fields.

5. **Store Language Metadata**: Track the language/locale of multilingual content for proper processing.

6. **Test with Real Data**: Use realistic multilingual test data including RTL text, emoji, and complex scripts.

7. **Consider Locale in Application Logic**: Make locale selection user-configurable for formatting and sorting.

## Common Use Cases

**Multilingual E-Commerce**:

```gql
MATCH (p:Product)
WHERE p.category_en = 'Electronics'
RETURN p.name_en, p.name_es, p.name_zh, p.price
ORDER BY p.name_en COLLATE 'en_US';
```

**Global User Profiles**:

```gql
CREATE (u:User {
  username: 'alice',
  display_name: 'Alice Johnson',
  display_name_ja: 'アリス・ジョンソン',
  bio: 'Software engineer 👨‍💻 who loves databases 💾',
  preferred_locale: 'en_US'
});
```

**International Search**:

```gql
-- Case-insensitive search over content stored in NFC form.
-- Normalize $search_query to NFC client-side before sending it.
MATCH (doc:Document)
WHERE icontains(doc.content, $search_query_nfc)
RETURN doc.title, doc.language;
```

## Related Topics

- Text Processing and String Operations
- Full-Text Search and Indexing
- Collation Configuration
- Data Validation and Constraints
- JSON and Semi-Structured Data
- Regular Expressions
- Client Library Character Encoding

## Further Reading

- Unicode Standard Documentation
- UTF-8 Encoding Specification
- Unicode Normalization Forms (TR15)
- Collation Algorithm (UCA)
- Locale Data and Cultural Conventions
- Emoji and Symbol Support
- Internationalization Best Practices
