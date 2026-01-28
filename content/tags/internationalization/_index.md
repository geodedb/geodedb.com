---
title: "Internationalization & Localization (i18n/l10n)"
description: "Complete guide to internationalization and localization in Geode. Covers Unicode support, collation, locale-specific features, RTL support, timezone handling, and translation strategies."
keywords:
  - internationalization
  - localization
  - i18n
  - l10n
  - Unicode
  - UTF-8
  - collation
  - locale
  - multilingual
  - RTL support
  - right-to-left
  - timezone
  - date formatting
  - string comparison
  - character encoding
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/internationalization/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Internationalization & Localization (i18n/l10n)

Geode provides comprehensive internationalization (i18n) and localization (l10n) support for building global applications. From full Unicode support to locale-aware string operations, Geode enables you to build graph applications that serve users worldwide with proper language, cultural, and regional conventions.

## Understanding i18n vs l10n

### Internationalization (i18n)

The process of designing software to support multiple languages and regions without code changes:

- **Unicode Support**: Full UTF-8 encoding for all text data
- **Locale Independence**: Core functionality works regardless of locale
- **Extensibility**: Easy addition of new languages and regions
- **Data Separation**: Content separated from code

### Localization (l10n)

The process of adapting software for specific languages and regions:

- **Translation**: User interface and messages in local language
- **Cultural Adaptation**: Date, time, number, and currency formats
- **Regional Compliance**: Legal and regulatory requirements
- **Local Conventions**: Sorting, collation, and comparison rules

## Unicode Support

### UTF-8 Encoding

Geode uses UTF-8 encoding throughout:

**String Storage**:
```gql
-- Store text in any language
CREATE (:Document {
  title_en: 'Hello World',
  title_zh: '你好世界',
  title_ar: 'مرحبا بالعالم',
  title_ru: 'Привет мир',
  title_ja: 'こんにちは世界',
  title_hi: 'नमस्ते दुनिया',
  title_emoji: '👋🌍'
});
```

**Query with Unicode**:
```gql
-- Search in multiple scripts
MATCH (d:Document)
WHERE d.title_zh CONTAINS '世界'
   OR d.title_ar CONTAINS 'العالم'
   OR d.title_emoji CONTAINS '🌍'
RETURN d;
```

### Unicode Normalization

Geode supports Unicode normalization for consistent string comparison:

**Normalization Forms**:
- **NFC (Canonical Composition)**: Preferred for most text
- **NFD (Canonical Decomposition)**: Separates combined characters
- **NFKC (Compatibility Composition)**: For compatibility
- **NFKD (Compatibility Decomposition)**: Full decomposition

**Example**:
```gql
-- Create property with combining characters
CREATE (:Text {
  nfc: 'café',      -- NFC form (é as single character)
  nfd: 'café'       -- NFD form (e + combining accent)
});

-- Query with normalization
MATCH (t:Text)
WHERE normalize(t.nfc, 'NFC') = normalize(t.nfd, 'NFC')
RETURN t;  -- Returns match despite different encodings
```

### Character Classification

```gql
-- Unicode character properties
MATCH (user:User)
WHERE is_alphabetic(user.name)
  AND NOT contains_emoji(user.name)
RETURN user;

-- Case conversion (locale-aware)
RETURN to_upper('straße', 'de_DE');  -- 'STRASSE' (German)
RETURN to_upper('i', 'tr_TR');        -- 'İ' (Turkish dotted I)
```

## Collation and Sorting

### Locale-Specific Collation

Geode supports ICU collation for culturally appropriate sorting:

**Create Index with Collation**:
```gql
-- German phonebook sorting
CREATE INDEX user_name_de ON :User(name)
  COLLATE 'de_DE@collation=phonebook';

-- Swedish sorting (ä, ö after z)
CREATE INDEX user_name_sv ON :User(name)
  COLLATE 'sv_SE';

-- Chinese pinyin sorting
CREATE INDEX user_name_zh ON :User(name)
  COLLATE 'zh_CN@collation=pinyin';
```

**Query with Specific Collation**:
```gql
-- Sort using German rules
MATCH (u:User)
RETURN u.name
ORDER BY u.name COLLATE 'de_DE'
LIMIT 100;

-- Case-insensitive sorting
MATCH (p:Product)
RETURN p.name
ORDER BY p.name COLLATE 'en_US@strength=secondary'
LIMIT 50;
```

### Collation Strength Levels

**Primary**: Base character differences only
```gql
-- 'a' = 'A' = 'á' = 'Á'
ORDER BY name COLLATE 'en_US@strength=primary'
```

**Secondary**: Accents matter
```gql
-- 'a' = 'A' but 'a' ≠ 'á'
ORDER BY name COLLATE 'en_US@strength=secondary'
```

**Tertiary**: Case matters
```gql
-- 'a' ≠ 'A' and 'a' ≠ 'á'
ORDER BY name COLLATE 'en_US@strength=tertiary'
```

**Quaternary**: Punctuation and spaces matter
```gql
-- All differences considered
ORDER BY name COLLATE 'en_US@strength=quaternary'
```

### Language-Specific Sorting Examples

**Swedish (å, ä, ö at end)**:
```gql
MATCH (c:City)
WHERE c.country = 'Sweden'
RETURN c.name
ORDER BY c.name COLLATE 'sv_SE';
-- Result: Malmö, Stockholm, Västerås, Örebro
```

**Czech (ch as single letter)**:
```gql
MATCH (p:Person)
WHERE p.country = 'Czech Republic'
RETURN p.surname
ORDER BY p.surname COLLATE 'cs_CZ';
-- Result: Havel, Horak, Chlup (ch after h)
```

**Japanese (mixed scripts)**:
```gql
MATCH (u:User)
WHERE u.country = 'Japan'
RETURN u.name
ORDER BY u.name COLLATE 'ja_JP@collation=unihan';
-- Sorts hiragana, katakana, kanji appropriately
```

## Locale-Aware Operations

### Date and Time Formatting

**Store timestamps in UTC, display in local time**:
```gql
-- Store event with timezone
CREATE (:Event {
  name: 'Product Launch',
  timestamp: datetime('2025-06-15T14:00:00Z'),
  timezone: 'America/New_York'
});

-- Query with timezone conversion
MATCH (e:Event)
RETURN e.name,
       e.timestamp,
       datetime_in_timezone(e.timestamp, 'America/New_York') AS local_time,
       datetime_in_timezone(e.timestamp, 'Europe/London') AS london_time,
       datetime_in_timezone(e.timestamp, 'Asia/Tokyo') AS tokyo_time;
```

**Locale-Specific Formatting**:
```gql
-- Format dates per locale
MATCH (order:Order)
RETURN order.id,
       format_date(order.created, 'en_US') AS us_date,      -- "06/15/2025"
       format_date(order.created, 'en_GB') AS uk_date,      -- "15/06/2025"
       format_date(order.created, 'de_DE') AS german_date,  -- "15.06.2025"
       format_date(order.created, 'zh_CN') AS chinese_date; -- "2025年6月15日"
```

### Number Formatting

**Currency Formatting**:
```gql
MATCH (product:Product)
RETURN product.name,
       format_currency(product.price, 'USD', 'en_US') AS us_price,     -- "$29.99"
       format_currency(product.price, 'EUR', 'de_DE') AS euro_price,   -- "29,99 €"
       format_currency(product.price, 'JPY', 'ja_JP') AS yen_price,    -- "¥2,999"
       format_currency(product.price, 'INR', 'hi_IN') AS rupee_price;  -- "₹2,499.00"
```

**Decimal Formatting**:
```gql
MATCH (stat:Statistics)
RETURN stat.metric,
       format_number(stat.value, 'en_US') AS us_format,   -- "1,234.56"
       format_number(stat.value, 'de_DE') AS de_format,   -- "1.234,56"
       format_number(stat.value, 'fr_FR') AS fr_format;   -- "1 234,56"
```

### String Comparison

**Case-Insensitive Comparison**:
```gql
-- Turkish locale (special I handling)
MATCH (u:User)
WHERE compare_locale(u.username, 'İbrahim', 'tr_TR', ignoreCase: true) = 0
RETURN u;

-- General case-insensitive
MATCH (c:Customer)
WHERE compare_locale(c.email, $search_email, 'en_US', ignoreCase: true) = 0
RETURN c;
```

**Accent-Insensitive Comparison**:
```gql
-- French names (ignore accents)
MATCH (p:Person)
WHERE compare_locale(p.name, 'Francois', 'fr_FR', ignoreAccents: true) = 0
RETURN p;
-- Matches: François, Francois, FRANÇOIS
```

## Right-to-Left (RTL) Support

### RTL Languages

Geode supports RTL languages (Arabic, Hebrew, Persian, Urdu):

**Store Bidirectional Text**:
```gql
CREATE (:Article {
  title_ar: 'مقالة باللغة العربية',
  title_he: 'מאמר בעברית',
  content_ar: 'محتوى النص العربي...',
  direction: 'rtl'
});
```

**Mixed LTR/RTL Text**:
```gql
-- Store text with embedded numbers and Latin text
CREATE (:Product {
  name_ar: 'منتج رقم 123 في category',
  description_ar: 'وصف المنتج مع email@example.com',
  bidi_class: 'mixed'
});

-- Query preserves bidirectional algorithm
MATCH (p:Product)
WHERE p.name_ar CONTAINS '123'
RETURN p.name_ar;  -- Correct visual order preserved
```

### Bidirectional Algorithm

Geode implements Unicode Bidirectional Algorithm (UBA):

```gql
-- Explicit direction marks
CREATE (:Message {
  text: 'Hello \u202Eمرحبا\u202C World',  -- RLE/PDF marks
  has_bidi_marks: true
});

-- Direction override for display
MATCH (m:Message)
RETURN m.text,
       bidi_reorder(m.text, 'RTL') AS rtl_display,
       bidi_reorder(m.text, 'LTR') AS ltr_display;
```

## Multilingual Data Modeling

### Multiple Language Properties

**Separate Properties Pattern**:
```gql
CREATE (:Product {
  id: 'P123',
  name_en: 'Laptop Computer',
  name_es: 'Computadora Portátil',
  name_fr: 'Ordinateur Portable',
  name_de: 'Laptop-Computer',
  name_zh: '笔记本电脑',
  name_ja: 'ノートパソコン',
  description_en: 'High-performance laptop...',
  description_es: 'Portátil de alto rendimiento...',
  default_lang: 'en'
});
```

**Query with Language Fallback**:
```gql
MATCH (p:Product)
RETURN p.id,
       COALESCE(p['name_' + $user_lang], p.name_en) AS name,
       COALESCE(p['description_' + $user_lang], p.description_en) AS description;
```

### Translation Relationships

**Linked Translations Pattern**:
```gql
-- Create base content
CREATE (base:Content:en {
  id: 'article-123',
  title: 'Welcome to Geode',
  body: 'This is an introduction...',
  lang: 'en'
});

-- Create translations
CREATE (es:Content:es {
  id: 'article-123-es',
  title: 'Bienvenido a Geode',
  body: 'Esta es una introducción...',
  lang: 'es'
});

CREATE (fr:Content:fr {
  id: 'article-123-fr',
  title: 'Bienvenue à Geode',
  body: 'Ceci est une introduction...',
  lang: 'fr'
});

-- Link translations
MATCH (base:Content:en {id: 'article-123'}),
      (es:Content:es {id: 'article-123-es'}),
      (fr:Content:fr {id: 'article-123-fr'})
CREATE (base)-[:TRANSLATION]->(es),
       (base)-[:TRANSLATION]->(fr);
```

**Query Translations**:
```gql
-- Get content in user's language
MATCH (content:Content {id: $content_id})
OPTIONAL MATCH (content)-[:TRANSLATION]->(trans:Content)
WHERE trans.lang = $user_lang
RETURN COALESCE(trans, content) AS localized_content;

-- Get all available translations
MATCH (base:Content:en {id: $content_id})
OPTIONAL MATCH (base)-[:TRANSLATION]->(trans)
RETURN base.lang AS language, base AS content
UNION
MATCH (base:Content:en {id: $content_id})-[:TRANSLATION]->(trans)
RETURN trans.lang AS language, trans AS content;
```

## Timezone Handling

### Timezone Storage

**Store All Timestamps in UTC**:
```gql
CREATE (:Event {
  name: 'Conference',
  start_utc: datetime('2025-09-15T14:00:00Z'),
  end_utc: datetime('2025-09-15T18:00:00Z'),
  venue_timezone: 'America/New_York'
});
```

**Convert for Display**:
```gql
MATCH (e:Event)
RETURN e.name,
       datetime_in_timezone(e.start_utc, e.venue_timezone) AS local_start,
       datetime_in_timezone(e.start_utc, $user_timezone) AS user_start;
```

### Timezone-Aware Queries

**Find Events in User's Timezone**:
```gql
-- Events happening "today" in user's timezone
MATCH (e:Event)
WITH e,
     datetime_in_timezone(e.start_utc, $user_timezone) AS user_local
WHERE date(user_local) = current_date()
RETURN e.name, user_local
ORDER BY user_local;
```

**Business Hours Queries**:
```gql
-- Find stores open now in each timezone
MATCH (store:Store)
WITH store,
     datetime_in_timezone(now(), store.timezone) AS store_local_time
WHERE time(store_local_time) >= store.open_time
  AND time(store_local_time) <= store.close_time
  AND dayofweek(store_local_time) NOT IN [6, 7]  -- Weekend check
RETURN store.name, store.timezone, store_local_time;
```

## Translation Management

### Translation Workflow

**Track Translation Status**:
```gql
CREATE (:TranslationJob {
  content_id: 'article-123',
  source_lang: 'en',
  target_lang: 'es',
  status: 'pending',
  created: datetime(),
  translator: null,
  completed: null
});

-- Assign to translator
MATCH (job:TranslationJob {status: 'pending'}),
      (translator:Translator {languages: ['en', 'es']})
WHERE NOT EXISTS {
  MATCH (translator)-[:ASSIGNED_TO]->(other:TranslationJob {status: 'in_progress'})
}
CREATE (translator)-[:ASSIGNED_TO {assigned_at: datetime()}]->(job)
SET job.status = 'in_progress',
    job.translator = translator.id;
```

**Translation Memory**:
```gql
-- Store translation segments for reuse
CREATE (:TranslationSegment {
  source_lang: 'en',
  target_lang: 'es',
  source_text: 'Welcome to our platform',
  target_text: 'Bienvenido a nuestra plataforma',
  context: 'greeting',
  verified: true
});

-- Find similar translations
MATCH (seg:TranslationSegment)
WHERE seg.source_lang = 'en'
  AND seg.target_lang = 'es'
  AND similarity(seg.source_text, $new_text) > 0.8
RETURN seg.source_text, seg.target_text, similarity(seg.source_text, $new_text) AS score
ORDER BY score DESC
LIMIT 5;
```

## Locale Detection and Selection

### User Locale Preferences

**Store User Preferences**:
```gql
CREATE (:User {
  id: 'user123',
  preferred_language: 'es',
  preferred_region: 'MX',
  locale: 'es_MX',
  timezone: 'America/Mexico_City',
  date_format: 'dd/MM/yyyy',
  time_format: '24h',
  currency: 'MXN',
  measurement_system: 'metric'
});
```

**Fallback Chain**:
```gql
-- Get content with locale fallback
MATCH (u:User {id: $user_id})
WITH u,
     [u.locale,                    -- es_MX
      u.preferred_language,         -- es
      'en'] AS locale_chain          -- default
MATCH (content:Content {id: $content_id})
OPTIONAL MATCH (content)-[:TRANSLATION]->(trans:Content)
WHERE trans.locale IN locale_chain
WITH content, trans, locale_chain
ORDER BY indexOf(locale_chain, COALESCE(trans.locale, content.locale))
RETURN COALESCE(trans, content) AS localized
LIMIT 1;
```

### Browser/System Detection

**Accept-Language Header Processing**:
```python
# Python client example
import geode_client

async def get_localized_content(accept_language: str, content_id: str):
    # Parse Accept-Language: "en-US,en;q=0.9,es;q=0.8"
    locales = parse_accept_language(accept_language)

    client = geode_client.open_database()

    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (content:Content {id: $content_id})
            OPTIONAL MATCH (content)-[:TRANSLATION]->(trans:Content)
            WHERE trans.locale IN $locales
            WITH content, trans, $locales AS locale_list
            ORDER BY indexOf(locale_list, COALESCE(trans.locale, content.locale))
            RETURN COALESCE(trans, content) AS localized
            LIMIT 1
        """, content_id=content_id, locales=locales)

        return result.rows[0]['localized']
```

## Performance Considerations

### Index Optimization for i18n

**Separate Indexes per Language**:
```gql
-- More efficient than single multi-language index
CREATE INDEX product_name_en ON :Product(name_en);
CREATE INDEX product_name_es ON :Product(name_es);
CREATE INDEX product_name_fr ON :Product(name_fr);

-- With collation
CREATE INDEX product_name_de ON :Product(name_de)
  COLLATE 'de_DE';
```

**Language-Specific Full-Text Search**:
```gql
-- Create language-specific full-text indexes
CREATE FULLTEXT INDEX content_en FOR (n:Content) ON (n.title_en, n.body_en)
  OPTIONS {analyzer: 'english'};

CREATE FULLTEXT INDEX content_es FOR (n:Content) ON (n.title_es, n.body_es)
  OPTIONS {analyzer: 'spanish'};

CREATE FULLTEXT INDEX content_zh FOR (n:Content) ON (n.title_zh, n.body_zh)
  OPTIONS {analyzer: 'chinese'};
```

### Caching Strategies

**Cache Translated Content**:
```python
# Application-level caching
from functools import lru_cache

@lru_cache(maxsize=1000)
async def get_translation(content_id: str, locale: str):
    client = geode_client.open_database()
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (content:Content {id: $content_id})
            OPTIONAL MATCH (content)-[:TRANSLATION]->(trans {locale: $locale})
            RETURN COALESCE(trans, content) AS localized
        """, content_id=content_id, locale=locale)

        return result.rows[0]['localized']
```

## Best Practices

### Data Modeling

1. **UTF-8 Everywhere**: Always use UTF-8 encoding
2. **Normalize Input**: Normalize to NFC before storage
3. **Separate Languages**: Use separate properties or nodes per language
4. **Store Locale Metadata**: Track language, region, script
5. **UTC for Timestamps**: Always store in UTC, display in local time

### Query Patterns

1. **Locale-Specific Indexes**: Create indexes with appropriate collation
2. **Fallback Chains**: Implement language fallback hierarchies
3. **Case Handling**: Use locale-aware case conversion
4. **Collation in ORDER BY**: Specify collation explicitly for sorting

### Application Integration

1. **Detect User Locale**: From Accept-Language, user profile, or geolocation
2. **Format at Display Time**: Store raw values, format when presenting
3. **Translation Memory**: Reuse translations across content
4. **Version Translations**: Track translation versions with content versions

## Common Pitfalls

### Avoid

- **String Length Assumptions**: "Hello" vs "Zdravstvuyte" (different lengths)
- **Case-Insensitive Without Locale**: `UPPER()` without locale fails for Turkish
- **Naive Date Parsing**: Use ISO 8601 or locale-aware parsing
- **Hardcoded Formats**: Make date/number formats configurable
- **Single-Language Indexes**: Create language-specific indexes
- **ASCII Assumptions**: Expect any Unicode character

### Do

- **Test with Real Data**: Use actual multilingual content
- **Support RTL**: Test with Arabic/Hebrew content
- **Validate Input**: Check for proper Unicode encoding
- **Consider Length**: Allow for text expansion in translations
- **Use ICU Collation**: Leverage ICU for proper sorting

## Related Topics

- **[Unicode](/tags/unicode/)**: Unicode implementation details
- **[Data Modeling](/tags/data-modeling/)**: Graph schema design
- **[Indexing](/tags/indexing/)**: Index strategies for multilingual data
- **[Performance](/tags/performance/)**: Optimization for i18n workloads
- **[Configuration](/tags/configuration/)**: Server configuration options

## Further Reading

- **Unicode Reference**: `/docs/reference/unicode-support/`
- **Server Configuration**: `/docs/configuration/server-configuration/`

## Conclusion

Geode provides comprehensive internationalization and localization support enabling you to build truly global graph applications. From full Unicode support and locale-aware collation to timezone handling and multilingual data modeling, Geode gives you the tools to serve users worldwide with appropriate language and cultural conventions.

Key capabilities:
- **Full UTF-8 Support**: Store and query text in any language
- **ICU Collation**: Culturally appropriate sorting and comparison
- **Locale-Aware Operations**: Date, time, number formatting per locale
- **RTL Support**: Proper handling of Arabic, Hebrew, and other RTL scripts
- **Timezone Management**: Store UTC, display in user's timezone
- **Flexible Translation Models**: Multiple approaches for multilingual content

Build applications that respect linguistic and cultural diversity with Geode's i18n features.
