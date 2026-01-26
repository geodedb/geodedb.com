---
title: "Full-Text Search & Query Capabilities"
description: "Comprehensive guide to full-text search in Geode graph database. Learn about text indexing, search operators, ranking, and advanced query capabilities for enterprise search workloads."
keywords:
  - full-text search
  - text search
  - search indexing
  - keyword search
  - search ranking
  - Geode
  - graph database
  - GQL search
  - text queries
  - search optimization
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/search/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Full-text search is a critical capability for modern applications, enabling users to find relevant information across massive graph datasets using natural language queries, keywords, and sophisticated matching algorithms. Geode provides enterprise-grade full-text search capabilities fully integrated with its GQL query language, allowing you to combine graph traversal with powerful text search in a single query.

As an ISO/IEC 39075:2024 GQL-compliant graph database, Geode's search functionality goes beyond simple substring matching, offering advanced features like relevance ranking, fuzzy matching, phonetic search, and multilingual support. Whether you're building a content management system, e-commerce platform, knowledge graph, or social network, Geode's search capabilities enable fast, accurate, and scalable text retrieval.

## Understanding Full-Text Search in Geode

Traditional substring matching using `CONTAINS` or pattern matching with regular expressions works well for exact searches but struggles with natural language queries, relevance ranking, and large-scale text retrieval. Full-text search indexes solve these challenges by tokenizing text, normalizing terms, and building inverted indexes that enable millisecond-speed searches across millions of documents.

**Tokenization and Normalization**: When you create a full-text index, Geode tokenizes text properties into individual terms, applies stemming (reducing words to root forms), removes stop words (common words like "the", "and", "or"), and normalizes case. This preprocessing enables intelligent matching that finds "running" when searching for "run" or "database" when searching for "databases".

**Inverted Indexes**: Geode maintains inverted indexes that map terms to the graph elements containing them. This data structure enables fast lookups: instead of scanning every node's text property, Geode consults the index to instantly retrieve matching elements.

**Relevance Ranking**: Search results are ranked by relevance using TF-IDF (Term Frequency-Inverse Document Frequency) scoring. Terms that appear frequently in a document but rarely across all documents receive higher scores, ensuring the most relevant results appear first.

**Query Language Integration**: Unlike standalone search engines that require separate queries and result merging, Geode's full-text search integrates seamlessly with GQL. You can combine graph patterns, property filters, and text search in a single query, leveraging the power of both paradigms.

## Creating and Managing Full-Text Indexes

Geode provides GQL syntax for creating and managing full-text indexes:

```gql
-- Create a full-text index on a single property
CREATE FULLTEXT INDEX article_title ON :Article(title);

-- Create a multi-property full-text index
CREATE FULLTEXT INDEX article_search ON :Article(title, body, summary);

-- Create a full-text index with custom configuration
CREATE FULLTEXT INDEX product_search ON :Product(name, description)
WITH (
  language: 'english',
  stemming: true,
  stop_words: true,
  min_token_length: 3
);

-- View all full-text indexes
SHOW FULLTEXT INDEXES;

-- Drop a full-text index
DROP FULLTEXT INDEX article_search;
```

**Index Configuration Options**:

- `language`: Specifies the language for stemming and stop word removal (e.g., 'english', 'spanish', 'french')
- `stemming`: Enable or disable word stemming (default: true)
- `stop_words`: Enable or disable stop word removal (default: true)
- `min_token_length`: Minimum character length for indexed tokens (default: 2)
- `case_sensitive`: Preserve case distinctions (default: false)
- `accent_sensitive`: Preserve accent/diacritic distinctions (default: false)

## Basic Search Queries

Once you've created a full-text index, use the `MATCHES` operator to perform text searches:

```gql
-- Simple keyword search
MATCH (a:Article)
WHERE a.title MATCHES 'graph database'
RETURN a.title, a.published_at
ORDER BY score(a) DESC;

-- Multi-term search with automatic AND logic
MATCH (p:Product)
WHERE p.description MATCHES 'wireless bluetooth headphones'
RETURN p.name, p.price, score(p) AS relevance
ORDER BY relevance DESC
LIMIT 10;

-- Search across multiple properties
MATCH (u:User)
WHERE u MATCHES 'software engineer'  -- Searches all indexed properties
RETURN u.name, u.bio;
```

The `score()` function returns the relevance score for search results, enabling you to sort by relevance and filter by minimum score thresholds.

## Advanced Search Operators

Geode supports sophisticated search operators for precise control over matching behavior:

**Boolean Operators**:

```gql
-- AND: All terms must match
MATCH (a:Article)
WHERE a.body MATCHES '+graph +database'
RETURN a;

-- OR: Any term can match (default behavior)
MATCH (a:Article)
WHERE a.body MATCHES 'graph OR database'
RETURN a;

-- NOT: Exclude terms
MATCH (a:Article)
WHERE a.body MATCHES 'database -relational'
RETURN a;

-- Complex boolean expressions
MATCH (p:Product)
WHERE p.description MATCHES '(laptop OR notebook) +gaming -used'
RETURN p;
```

**Phrase Searches**:

```gql
-- Exact phrase matching
MATCH (a:Article)
WHERE a.title MATCHES '"artificial intelligence"'
RETURN a;

-- Phrase with proximity (words within N positions)
MATCH (a:Article)
WHERE a.body MATCHES '"graph database"~5'  -- Within 5 words
RETURN a;
```

**Wildcard and Fuzzy Matching**:

```gql
-- Wildcard searches (* for multiple chars, ? for single char)
MATCH (u:User)
WHERE u.email MATCHES 'admin*@example.com'
RETURN u;

-- Fuzzy matching (tolerates spelling errors)
MATCH (p:Product)
WHERE p.name MATCHES 'laptop~2'  -- Allow 2 character differences
RETURN p;
```

**Prefix Searches**:

```gql
-- Find terms starting with prefix
MATCH (t:Tag)
WHERE t.name MATCHES 'data*'  -- Matches 'database', 'data science', etc.
RETURN t.name;
```

## Combining Search with Graph Patterns

The true power of Geode's search emerges when combining full-text search with graph traversal:

```gql
-- Find experts connected to users searching for topics
MATCH (u:User)-[:FOLLOWS]->(expert:User)-[:AUTHORED]->(article:Article)
WHERE article.body MATCHES 'machine learning'
RETURN expert.name, COUNT(article) AS article_count
ORDER BY article_count DESC;

-- Search within a subgraph
MATCH (category:Category {name: 'Technology'})-[:CONTAINS]->(product:Product)
WHERE product.description MATCHES 'wireless charging'
RETURN product.name, product.price
ORDER BY score(product) DESC;

-- Find shortest paths through content
MATCH path = shortestPath(
  (start:Topic {name: 'Databases'})-[*..5]-(end:Topic)
)
WHERE end.description MATCHES 'real-time analytics'
RETURN path;
```

## Multilingual Search

Geode supports full-text search across multiple languages with language-specific tokenization and stemming:

```gql
-- Create language-specific indexes
CREATE FULLTEXT INDEX article_en ON :Article(title_en, body_en)
WITH (language: 'english');

CREATE FULLTEXT INDEX article_es ON :Article(title_es, body_es)
WITH (language: 'spanish');

CREATE FULLTEXT INDEX article_fr ON :Article(title_fr, body_fr)
WITH (language: 'french');

-- Query with language-specific matching
MATCH (a:Article)
WHERE a.body_es MATCHES 'base de datos'
RETURN a.title_es;
```

**Supported Languages**:
- English, Spanish, French, German, Italian, Portuguese
- Chinese (simplified and traditional), Japanese, Korean
- Russian, Arabic, Hindi
- And 40+ additional languages with Unicode normalization

## Search Performance Optimization

**Index-Only Queries**: When possible, structure queries to retrieve data directly from the full-text index without accessing base properties:

```gql
-- Efficient: Returns only indexed data
MATCH (a:Article)
WHERE a.title MATCHES 'database'
RETURN a.title, score(a);

-- Less efficient: Requires base data access
MATCH (a:Article)
WHERE a.title MATCHES 'database'
RETURN a.title, a.author, a.metadata;  -- Non-indexed properties
```

**Result Limiting**: Always use `LIMIT` for search queries to prevent retrieving massive result sets:

```gql
MATCH (p:Product)
WHERE p.description MATCHES 'laptop'
RETURN p
ORDER BY score(p) DESC
LIMIT 50;
```

**Minimum Score Filtering**: Filter low-relevance results to reduce processing:

```gql
MATCH (a:Article)
WHERE a.body MATCHES 'graph database' AND score(a) > 0.5
RETURN a.title, score(a)
ORDER BY score(a) DESC;
```

**Query Profiling**: Use `PROFILE` to analyze search performance:

```gql
PROFILE
MATCH (a:Article)
WHERE a.body MATCHES 'distributed systems'
RETURN a.title
ORDER BY score(a) DESC
LIMIT 20;
```

## Advanced Search Features

**Highlighting**: Retrieve snippets showing matched terms in context:

```gql
MATCH (a:Article)
WHERE a.body MATCHES 'graph database'
RETURN a.title, highlight(a.body, 'graph database') AS snippet;
```

**Faceted Search**: Combine search with aggregations for filtering:

```gql
MATCH (p:Product)
WHERE p.description MATCHES 'laptop'
RETURN p.category, COUNT(*) AS count, AVG(score(p)) AS avg_relevance
GROUP BY p.category
ORDER BY avg_relevance DESC;
```

**Custom Scoring**: Boost specific fields or combine relevance with other factors:

```gql
MATCH (p:Product)
WHERE p.name MATCHES 'laptop^2.0' OR p.description MATCHES 'laptop'
RETURN p.name, score(p) AS relevance, p.rating
ORDER BY (score(p) * 0.7 + p.rating * 0.3) DESC;
```

## Best Practices

1. **Index Selectively**: Full-text indexes consume significant memory. Only index properties that require text search capabilities.

2. **Use Multi-Property Indexes**: Instead of creating separate indexes for title, body, and summary, create a single multi-property index for better performance.

3. **Monitor Index Size**: Large text collections generate large indexes. Monitor disk usage and consider archiving or partitioning old content.

4. **Tune Tokenization**: Adjust `min_token_length` and stop word lists based on your domain. Technical documentation may benefit from indexing 2-character terms, while general content works better with 3+ characters.

5. **Combine with Property Indexes**: Use property indexes for structured filtering alongside full-text search:

```gql
MATCH (a:Article)
WHERE a.published_at > '2024-01-01'  -- Property index
  AND a.body MATCHES 'graph database'  -- Full-text index
RETURN a
ORDER BY score(a) DESC;
```

6. **Test Language Settings**: Verify stemming and stop word behavior matches your expectations for each language.

## Troubleshooting

**Low Relevance Scores**: Check tokenization settings. Overly aggressive stemming or stop word removal may eliminate important terms.

**Missing Results**: Verify index coverage. Multi-property indexes may not include all properties you're searching.

**Slow Queries**: Use `PROFILE` to identify bottlenecks. Consider adding property indexes for commonly filtered dimensions or limiting result sets.

**Phrase Search Failures**: Ensure terms in phrase queries exist in the index. Check for stemming conflicts where search terms don't match indexed stems.

## Integration with Other Geode Features

**Row-Level Security**: Full-text search respects RLS policies, ensuring users only retrieve content they're authorized to access.

**Transactions**: Index updates occur transactionally. Uncommitted changes aren't visible in search results until the transaction commits.

**Replication**: Full-text indexes replicate across cluster nodes, enabling distributed search queries.

**Backups**: Indexes are included in backup snapshots and restored alongside graph data.

## Related Topics

- Database Indexing Strategies
- Query Optimization and Performance
- Text Processing and Unicode Support
- GQL Query Language Reference
- Performance Monitoring and Profiling
- Data Modeling Best Practices

## Further Reading

- ISO/IEC 39075:2024 GQL Standard: Text search specifications
- Full-Text Search Architecture Documentation
- Index Management and Optimization Guide
- Multilingual Search Configuration
- Enterprise Search Patterns and Use Cases
