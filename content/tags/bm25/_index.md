---
title: "Tag: BM25 Ranking Algorithm"
description: "Explore Geode documentation tagged with bm25. Learn about bm25 features, best practices, and implementation details."
keywords:
  - bm25
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/bm25/"
    noindex: false
---

Documentation tagged with **BM25 Ranking Algorithm** in the Geode graph database. BM25 (Best Matching 25) is a probabilistic ranking function used for text search and information retrieval, providing relevance scoring for keyword-based document searches.

## Introduction to BM25

BM25 (Best Matching 25) is the gold standard ranking function for text search. Developed by Stephen Robertson and Karen Spärck Jones in the 1990s as part of the Okapi information retrieval system, BM25 has become the default ranking algorithm in search engines like Elasticsearch, Apache Solr, and Apache Lucene.

BM25 solves a fundamental question: given a search query and a collection of documents, which documents are most relevant? The algorithm computes a relevance score based on:

- **Term frequency**: How often query terms appear in each document
- **Inverse document frequency**: How rare or common terms are across all documents
- **Document length normalization**: Penalizing long documents that contain many terms
- **Saturation**: Diminishing returns for repeated terms

Unlike simple keyword matching (which is binary: match or no match), BM25 provides nuanced relevance scores that enable ranking search results by quality. This makes it invaluable for full-text search applications.

Geode implements BM25 for property text search, enabling powerful keyword-based search that complements semantic vector search (HNSW). You can combine BM25 text search with graph traversal for queries like "find documents about databases written by friends, ranked by relevance."

## Core BM25 Concepts

### The BM25 Formula

BM25 computes a relevance score for document D given query Q:

```
score(D, Q) = Σ IDF(qi) * (f(qi, D) * (k1 + 1)) / (f(qi, D) + k1 * (1 - b + b * |D| / avgdl))

Where:
- qi: Each term in query Q
- f(qi, D): Frequency of qi in document D
- |D|: Length of document D (in tokens)
- avgdl: Average document length in collection
- k1: Term frequency saturation parameter (typically 1.2-2.0)
- b: Length normalization parameter (typically 0.75)
- IDF(qi): Inverse document frequency of qi
```

### Term Frequency (TF)

Term frequency measures how often a query term appears in a document. BM25 uses a saturating function—the first few occurrences of a term matter much more than later ones:

```
TF Impact:
1 occurrence: High impact
2 occurrences: Medium impact
10 occurrences: Marginal additional impact
100 occurrences: Almost no additional impact
```

This saturation prevents keyword stuffing from artificially inflating relevance.

### Inverse Document Frequency (IDF)

IDF measures how rare or common a term is across the entire document collection:

```
IDF(term) = log((N - n(term) + 0.5) / (n(term) + 0.5))

Where:
- N: Total number of documents
- n(term): Number of documents containing term
```

Common terms (like "the", "and") have low IDF and contribute little to relevance. Rare terms have high IDF and strongly indicate relevance.

Examples:
- "the" appears in 1M of 1M docs → IDF ≈ 0
- "database" appears in 10K of 1M docs → IDF ≈ 4.6
- "geode" appears in 100 of 1M docs → IDF ≈ 9.2

### Length Normalization

Longer documents tend to contain more terms by chance. BM25 penalizes long documents to avoid bias:

```
Length penalty = 1 - b + b * |D| / avgdl

Where:
- b = 0: No length normalization
- b = 1: Full length normalization
- b = 0.75: Balanced (typical)
```

A document twice as long as average receives a moderate penalty.

### Parameter Tuning

BM25 has two main parameters:

**k1 (term frequency saturation)**:
- Low (0.5-1.0): Aggressive saturation, repeated terms matter less
- Medium (1.2-1.5): Balanced (typical default: 1.2)
- High (2.0-3.0): Weak saturation, repeated terms matter more

**b (length normalization)**:
- Low (0.0-0.5): Weak length penalty
- Medium (0.75): Balanced (typical default)
- High (0.9-1.0): Strong length penalty

## How BM25 Works in Geode

### Creating Full-Text Indexes

Enable BM25 ranking by creating full-text indexes:

```gql
-- Create full-text index on document content
CREATE TEXT INDEX document_content
FOR (d:Document)
ON (d.content, d.title)
OPTIONS {
  analyzer: 'standard',    -- Tokenization and stemming
  k1: 1.2,                 -- Term frequency saturation
  b: 0.75                  -- Length normalization
};
```

Options:
- **analyzer**: Text processing (standard, english, multilingual, custom)
- **k1**: Term frequency saturation parameter
- **b**: Length normalization parameter
- **stopwords**: Words to ignore (the, and, or, etc.)
- **stemming**: Reduce words to roots (running → run)

### Full-Text Search Queries

Search using the text index:

```gql
-- BM25-ranked full-text search
MATCH (d:Document)
WHERE text_search(d.content, 'graph database performance')
RETURN d.title, d.author, text_score(d) AS relevance
ORDER BY relevance DESC
LIMIT 20;

-- Or using CALL syntax
CALL fulltext.search({
  index: 'document_content',
  query: 'graph database performance',
  limit: 20
})
YIELD node, score
RETURN node.title, score
ORDER BY score DESC;
```

### Boolean Queries

Combine terms with Boolean operators:

```gql
-- Must contain "graph" and "database"
MATCH (d:Document)
WHERE text_search(d.content, '+graph +database')
RETURN d.title, text_score(d) AS score
ORDER BY score DESC;

-- Must contain "graph", should contain "database" (boosts score)
MATCH (d:Document)
WHERE text_search(d.content, '+graph database')
RETURN d.title, text_score(d) AS score
ORDER BY score DESC;

-- Contains "graph" but not "neo4j"
MATCH (d:Document)
WHERE text_search(d.content, 'graph -neo4j')
RETURN d.title, text_score(d) AS score
ORDER BY score DESC;
```

### Phrase Queries

Search for exact phrases:

```gql
-- Exact phrase match
MATCH (d:Document)
WHERE text_search(d.content, '"graph database"')
RETURN d.title, text_score(d) AS score
ORDER BY score DESC;

-- Proximity search (words within 5 tokens)
MATCH (d:Document)
WHERE text_search(d.content, '"graph database"~5')
RETURN d.title, text_score(d) AS score
ORDER BY score DESC;
```

### Combining with Graph Traversal

The power of BM25 in a graph database:

```gql
-- Find relevant documents written by friends
MATCH (me:User {id: $userId})-[:FRIEND]->(friend:User)
     -[:AUTHORED]->(doc:Document)
WHERE text_search(doc.content, $query)
RETURN doc.title,
       friend.name AS author,
       text_score(doc) AS relevance,
       COUNT(DISTINCT friend) AS friend_author_count
ORDER BY relevance DESC, friend_author_count DESC
LIMIT 10;

-- Search within a specific graph context
MATCH (category:Category {name: 'Technology'})<-[:IN_CATEGORY]-(doc:Document)
WHERE text_search(doc.content, 'machine learning')
  AND doc.publish_date > date('2024-01-01')
RETURN doc.title, text_score(doc) AS score
ORDER BY score DESC
LIMIT 20;
```

## Use Cases

### Document Search

Classic full-text search:

```gql
-- Search knowledge base
MATCH (doc:Document)
WHERE text_search(doc.content, $user_query)
RETURN doc.title, doc.summary, text_score(doc) AS relevance
ORDER BY relevance DESC
LIMIT 50;
```

### E-Commerce Product Search

Find relevant products:

```gql
-- Product search with metadata filtering
MATCH (product:Product)
WHERE text_search(product.name, product.description, $query)
  AND product.price BETWEEN $min_price AND $max_price
  AND product.in_stock = true
RETURN product.name,
       product.price,
       text_score(product) AS relevance
ORDER BY relevance DESC
LIMIT 20;
```

### Log and Event Search

Search through logs:

```gql
-- Find relevant log entries
MATCH (log:LogEntry)
WHERE text_search(log.message, 'error timeout connection')
  AND log.timestamp > datetime() - duration('P1D')
  AND log.severity IN ['ERROR', 'FATAL']
RETURN log.timestamp, log.message, log.service, text_score(log) AS score
ORDER BY score DESC, log.timestamp DESC
LIMIT 100;
```

### Hybrid Search (BM25 + Vector Search)

Combine keyword and semantic search:

```gql
-- Hybrid search: BM25 + HNSW
MATCH (doc:Document)
WHERE text_search(doc.content, $keyword_query)
  AND vector_similarity(doc.embedding, $query_embedding) > 0.7
WITH doc,
     text_score(doc) AS bm25_score,
     vector_similarity(doc.embedding, $query_embedding) AS vector_score
RETURN doc.title,
       bm25_score,
       vector_score,
       (0.6 * bm25_score + 0.4 * vector_score) AS combined_score
ORDER BY combined_score DESC
LIMIT 20;
```

This hybrid approach leverages both keyword matching (BM25) and semantic understanding (vectors).

## Best Practices

### Index Configuration

**Choose the right analyzer**:
```gql
-- English text with stemming
CREATE TEXT INDEX docs_en FOR (d:Document) ON (d.content)
OPTIONS {analyzer: 'english'};  -- running → run, databases → database

-- Multilingual support
CREATE TEXT INDEX docs_multi FOR (d:Document) ON (d.content)
OPTIONS {analyzer: 'multilingual'};  -- Detects language automatically

-- Code/technical content
CREATE TEXT INDEX code FOR (d:Code) ON (d.content)
OPTIONS {analyzer: 'keyword'};  -- No stemming, preserve exact terms
```

**Configure stopwords**:
```gql
CREATE TEXT INDEX docs FOR (d:Document) ON (d.content)
OPTIONS {
  stopwords: ['the', 'a', 'an', 'and', 'or', 'but']  -- Custom stopword list
};
```

### Query Optimization

**Use specific terms**:
```gql
-- Poor: Too generic
WHERE text_search(d.content, 'data')

-- Better: Specific terms
WHERE text_search(d.content, 'graph database ACID transactions')
```

**Combine with filters**:
```gql
-- Efficient: Filter before expensive text search
MATCH (d:Document)
WHERE d.category = 'technical'
  AND d.publish_date > date('2024-01-01')
  AND text_search(d.content, $query)
RETURN d.title, text_score(d) AS score
ORDER BY score DESC;
```

**Tune parameters for your data**:
```gql
-- Short documents (tweets, titles): Reduce length penalty
CREATE TEXT INDEX tweets FOR (t:Tweet) ON (t.content)
OPTIONS {k1: 1.2, b: 0.5};  -- Weak length normalization

-- Long documents (articles, books): Increase length penalty
CREATE TEXT INDEX articles FOR (a:Article) ON (a.content)
OPTIONS {k1: 1.2, b: 0.9};  -- Strong length normalization
```

### Relevance Tuning

**Field weighting**:
```gql
-- Weight title matches higher than content matches
MATCH (d:Document)
WITH d,
     CASE WHEN text_search(d.title, $query) THEN 3.0 ELSE 0.0 END AS title_score,
     CASE WHEN text_search(d.content, $query) THEN 1.0 ELSE 0.0 END AS content_score
WHERE title_score > 0 OR content_score > 0
RETURN d.title, (title_score + content_score) AS score
ORDER BY score DESC;
```

**Query-time boosting**:
```gql
-- Boost recent documents
MATCH (d:Document)
WHERE text_search(d.content, $query)
WITH d,
     text_score(d) AS base_score,
     (datetime().epochSeconds - d.publish_date.epochSeconds) / (86400 * 365) AS age_years
RETURN d.title, base_score, (base_score / (1 + 0.1 * age_years)) AS adjusted_score
ORDER BY adjusted_score DESC;
```

## Performance Considerations

### Index Size

Full-text indexes require additional storage:

```
Index size ≈ 30-50% of original text size

Example:
- 1M documents, 5KB average
- Total text: 5GB
- Index size: 1.5-2.5GB
```

### Query Performance

Typical performance characteristics:

- **Simple queries**: 1-10ms for millions of documents
- **Complex Boolean queries**: 10-50ms
- **Combined graph + text**: 50-500ms depending on graph complexity

### Optimization Tips

1. **Limit result set**: Always use LIMIT to cap results
2. **Pre-filter**: Use property filters before text search
3. **Cache common queries**: Cache frequent query results
4. **Partition large collections**: Split by category, date, etc.

## Monitoring

### Index Statistics

```gql
-- Check index statistics
CALL fulltext.index.stats('document_content')
YIELD documents, terms, size_mb, avg_doc_length
RETURN documents, terms, size_mb, avg_doc_length;
```

### Query Performance

```gql
-- Profile text search query
PROFILE MATCH (d:Document)
WHERE text_search(d.content, $query)
RETURN d.title, text_score(d) AS score
ORDER BY score DESC
LIMIT 20;
```

## Related Topics

- [HNSW](/tags/hnsw/) - Vector similarity search
- [Vector Search](/tags/vector-search/) - Semantic search
- [Search](/tags/search/) - General search capabilities
- [Text](/tags/text/) - Text processing features
- [Indexing](/tags/indexing/) - Index management
- [Query Optimization](/tags/query-optimization/) - Performance tuning

## Further Reading

- [Full-Text Search Guide](/docs/full-text-search/) - Complete BM25 documentation
- [Hybrid Search Tutorial](/docs/hybrid-search/) - Combining BM25 and vectors
- [Query Optimization](/docs/query-optimization/) - Performance best practices
- [BM25 Algorithm Paper](https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf) - Academic paper

Geode's BM25 implementation provides powerful keyword-based search that integrates seamlessly with graph traversal, enabling rich text search applications combined with relationship-based filtering and ranking.
