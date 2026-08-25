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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

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
CREATE INDEX document_content
FOR (d:Document)
ON (d.content, d.title)
OPTIONS {
  analyzer: 'standard',    -- Tokenization and stemming
  k1: 1.2,                 -- Term frequency saturation
  b: 0.75                  -- Length normalization
} USING fulltext;
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
CALL geode.fts.search('document_content', 'graph database performance')
YIELD node, score
MATCH (d:Document) WHERE id(d) = node
RETURN d.title, d.author, score AS relevance
ORDER BY relevance DESC
LIMIT 20;

-- Or using CALL syntax
CALL geode.fts.search('document_content', 'graph database performance', 20)
YIELD node, score
MATCH (d) WHERE id(d) = node
RETURN d.title, score
ORDER BY score DESC;
```

### Boolean Queries

Combine terms with Boolean operators:

```gql
-- Must contain "graph" and "database"
CALL geode.fts.search('document_content', '+graph +database')
YIELD node, score
MATCH (d:Document) WHERE id(d) = node
RETURN d.title, score AS score
ORDER BY score DESC;

-- Must contain "graph", should contain "database" (boosts score)
CALL geode.fts.search('document_content', '+graph database')
YIELD node, score
MATCH (d:Document) WHERE id(d) = node
RETURN d.title, score AS score
ORDER BY score DESC;

-- Contains "graph" but not "neo4j"
CALL geode.fts.search('document_content', 'graph -neo4j')
YIELD node, score
MATCH (d:Document) WHERE id(d) = node
RETURN d.title, score AS score
ORDER BY score DESC;
```

### Phrase Queries

Search for exact phrases:

```gql
-- Exact phrase match
CALL geode.fts.search('document_content', '"graph database"')
YIELD node, score
MATCH (d:Document) WHERE id(d) = node
RETURN d.title, score AS score
ORDER BY score DESC;

-- Proximity search (words within 5 tokens)
CALL geode.fts.search('document_content', '"graph database"~5')
YIELD node, score
MATCH (d:Document) WHERE id(d) = node
RETURN d.title, score AS score
ORDER BY score DESC;
```

### Combining with Graph Traversal

The power of BM25 in a graph database:

```gql
-- Find relevant documents written by friends
-- NOTE: geode.fts.search takes string literals only; a $parameter is
-- rejected. Interpolate the search terms client-side before sending.
CALL geode.fts.search('document_content', '<search terms>')
YIELD node, score
MATCH (me:User {id: $userId})-[:FRIEND]->(friend:User)
     -[:AUTHORED]->(doc:Document)
WHERE id(doc) = node
RETURN doc.title,
       friend.name AS author,
       score AS relevance,
       COUNT(DISTINCT friend) AS friend_author_count
ORDER BY relevance DESC, friend_author_count DESC
LIMIT 10;

-- Search within a specific graph context
CALL geode.fts.search('document_content', 'machine learning')
YIELD node, score
MATCH (category:Category {name: 'Technology'})<-[:IN_CATEGORY]-(doc:Document)
WHERE id(doc) = node AND doc.publish_date > date('2024-01-01')
RETURN doc.title, score
ORDER BY score DESC
LIMIT 20;
```

## Use Cases

### Document Search

Classic full-text search:

```gql
-- Search knowledge base
-- NOTE: geode.fts.search takes string literals only; a $parameter
-- is rejected. Interpolate the term client-side before sending.
CALL geode.fts.search('document_content', '<search terms>')
YIELD node, score
MATCH (doc:Document) WHERE id(doc) = node
RETURN doc.title, doc.summary, score AS relevance
ORDER BY relevance DESC
LIMIT 50;
```

### E-Commerce Product Search

Find relevant products:

```gql
-- Product search with metadata filtering
-- NOTE: geode.fts.search takes string literals only; a $parameter is
-- rejected. Interpolate the search terms client-side before sending.
CALL geode.fts.search('product_name_description', '<search terms>')
YIELD node, score
MATCH (product:Product)
WHERE id(product) = node AND product.price BETWEEN $min_price AND $max_price
  AND product.in_stock = true
RETURN product.name,
       product.price,
       score AS relevance
ORDER BY relevance DESC
LIMIT 20;
```

### Log and Event Search

Search through logs:

```gql
-- Find relevant log entries
CALL geode.fts.search('logentry_message', 'error timeout connection')
YIELD node, score
MATCH (log:LogEntry) WHERE id(log) = node
  AND log.timestamp > datetime() - duration('P1D')
  AND log.severity IN ['ERROR', 'FATAL']
RETURN log.timestamp, log.message, log.service, score AS score
ORDER BY score DESC, log.timestamp DESC
LIMIT 100;
```

### Hybrid Search (BM25 + Vector Search)

Combine keyword and semantic search:

```gql
-- Hybrid search: BM25 + HNSW
-- NOTE: geode.fts.search takes string literals only; a $parameter
-- is rejected. Interpolate the term client-side before sending.
CALL geode.fts.search('document_content', '<search terms>')
YIELD node, score
MATCH (doc:Document) WHERE id(doc) = node
  AND similarity(doc.embedding, $query_embedding) > 0.7
WITH doc,
     score AS bm25_score,
     similarity(doc.embedding, $query_embedding) AS vector_score
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
CREATE INDEX docs_en FOR (d:Document) ON (d.content)
OPTIONS {analyzer: 'english'} USING fulltext;  -- running → run, databases → database

-- Multilingual support
CREATE INDEX docs_multi FOR (d:Document) ON (d.content)
OPTIONS {analyzer: 'multilingual'} USING fulltext;  -- Detects language automatically

-- Code/technical content
CREATE INDEX code FOR (d:Code) ON (d.content)
OPTIONS {analyzer: 'keyword'} USING fulltext;  -- No stemming, preserve exact terms
```

**Configure stopwords**:

```gql
CREATE INDEX docs FOR (d:Document) ON (d.content)
OPTIONS {
  stopwords: ['the', 'a', 'an', 'and', 'or', 'but']  -- Custom stopword list
} USING fulltext;
```

### Query Optimization

**Use specific terms**:

```gql
-- Poor: one very common term matches almost everything
CALL geode.fts.search('document_content', 'data')
YIELD node, score

-- Better: more terms, so documents matching more of them rank higher
CALL geode.fts.search('document_content', 'graph database ACID transactions')
YIELD node, score
```

**Combine with filters**:

```gql
-- Efficient: Filter before expensive text search
-- NOTE: geode.fts.search takes string literals only; a $parameter is
-- rejected. Interpolate the search terms client-side before sending.
CALL geode.fts.search('document_content', '<search terms>')
YIELD node, score
MATCH (d:Document)
WHERE id(d) = node AND d.category = 'technical'
  AND d.publish_date > date('2024-01-01')
RETURN d.title, score
ORDER BY score DESC;
```

**Tune parameters for your data**:

```gql
-- Short documents (tweets, titles): Reduce length penalty
CREATE INDEX tweets FOR (t:Tweet) ON (t.content)
OPTIONS {k1: 1.2, b: 0.5} USING fulltext;  -- Weak length normalization

-- Long documents (articles, books): Increase length penalty
CREATE INDEX articles FOR (a:Article) ON (a.content)
OPTIONS {k1: 1.2, b: 0.9} USING fulltext;  -- Strong length normalization
```

### Relevance Tuning

**Field weighting**:

Per-field weighting is not expressible in a query: search is a procedure call,
not a predicate, so it cannot appear inside `CASE`. Index the fields separately
and combine the two result sets in the client.

```gql
-- Run each search separately, then merge and weight client-side
CALL geode.fts.search('document_title', 'graph database')
YIELD node, score
MATCH (d:Document) WHERE id(d) = node
RETURN d.title, score
ORDER BY score DESC;
```

**Query-time boosting**:

```gql
-- Boost recent documents
-- NOTE: geode.fts.search takes string literals only; a $parameter
-- is rejected. Interpolate the term client-side before sending.
CALL geode.fts.search('document_content', '<search terms>')
YIELD node, score
MATCH (d:Document) WHERE id(d) = node
WITH d,
     score AS base_score,
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

The fulltext index publishes no statistics procedure — `SHOW INDEXES` confirms
it exists, and the corpus figures come from the data itself:

```gql
SHOW INDEXES;

-- Corpus size and average document length, straight from the documents
MATCH (d:Document)
RETURN count(d) AS documents,
       avg(length(d.content)) AS avg_doc_length_chars;
```

### Query Performance

```gql
-- Profile text search query
-- NOTE: geode.fts.search takes string literals only; a $parameter is
-- rejected. Interpolate the search terms client-side before sending.
PROFILE CALL geode.fts.search('document_content', '<search terms>')
YIELD node, score
MATCH (d:Document)
WHERE id(d) = node
RETURN d.title, score
ORDER BY score DESC
LIMIT 20;
```

## Related Topics

- [Search](/tags/search/) - General search capabilities
- [Text](/tags/text/) - Text processing features
- [Indexing](/tags/indexing/) - Index management
- [Query Optimization](/tags/query-optimization/) - Performance tuning

## Further Reading

- [Full-Text Search Guide](/docs/query/full-text-search/) - Complete BM25 documentation
- [Vector Search Tutorial](/docs/tutorials/vector-search-tutorial/) - Combining BM25 and vectors
- [Performance Tuning](/docs/query/performance-tuning/) - Performance best practices

Geode's BM25 implementation provides powerful keyword-based search that integrates seamlessly with graph traversal, enabling rich text search applications combined with relationship-based filtering and ranking.

## Advanced BM25 Techniques

### BM25+ (Improved Variant)

BM25+ adds a delta parameter to prevent negative IDF values:

```
BM25+(D, Q) = Σ IDF(qi) × ((k1 + 1) × f(qi, D)) / (k1 × (1 - b + b × |D| / avgdl) + f(qi, D)) + δ

Where δ = typically 1.0
```

**Advantages**:

- Never penalizes term presence
- Better performance on verbose queries
- More robust to long documents

### BM25F (Field-Weighted)

Weight different document fields separately:

```gql
-- There is no BM25F / per-field weighting. A single index may span several
-- properties, and a hit on any of them contributes to one combined score.
CALL geode.fts.search('document_all_fields', 'graph database')
YIELD node, score
MATCH (d:Document) WHERE id(d) = node
WITH d, score
WITH d,
     0.5 * title_score +    // Title boost: 2x
     0.3 * abstract_score + // Abstract boost: 1.5x
     0.2 * content_score    // Content: baseline
     AS weighted_score
WHERE weighted_score > 0
RETURN d.doc_id, d.title, weighted_score
ORDER BY weighted_score DESC
LIMIT 20;
```

## Query Expansion and Relevance Feedback

### Pseudo-Relevance Feedback

Expand query using top results:

`geode.fts.search` takes **string literals**, not variables or `$parameters`,
so the expansion round-trip happens in the client: run the first search, read
the expansion terms, then build and send the second search.

```gql
-- Stage 1: Initial retrieval (client substitutes the query text)
CALL geode.fts.search('documents', 'graph database', 10)
YIELD node, score
MATCH (top_doc) WHERE id(top_doc) = node
RETURN id(top_doc) AS doc_id, score;

-- Stage 2: Extract expansion terms from those documents
MATCH (top_doc)-[:HAS_TERM]->(term:Term)
WHERE id(top_doc) IN $top_doc_ids
WITH term, SUM(term.tfidf_score) AS term_importance
ORDER BY term_importance DESC
LIMIT 5
RETURN COLLECT(term.text) AS expansion_terms;

-- Stage 3: Expanded query (client concatenated the terms into the literal)
CALL geode.fts.search('documents', 'graph database index storage engine', 50)
YIELD node, score
MATCH (d) WHERE id(d) = node
RETURN d.title, score
ORDER BY score DESC;
```

### Query Relaxation

Progressively relax boolean constraints:

```gql
-- Strict: All terms required
CALL geode.fts.search('document_content', 'term1 term2 term3')
YIELD node, score
CALL geode.fts.search('document_content', '+term1 +term2 +term3')
YIELD node, score
MATCH (d:Document) WHERE id(d) = node
WHERE id(d) = node
WITH COUNT(d) AS strict_count

-- Relaxed: At least 2 of 3 terms
MATCH (d:Document)
WHERE strict_count = 0
WITH d, score
WHERE score > 0.5  // Higher threshold for relaxed query
RETURN d.title, score
ORDER BY score DESC;
```

## Text Processing and Analyzers

### Language-Specific Analyzers

```gql
-- English with stemming and stopword removal
CREATE INDEX docs_en FOR (d:Document) ON (d.content)
OPTIONS {
    analyzer: 'english',
    stopwords: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at'],
    stemmer: 'porter',
    k1: 1.2,
    b: 0.75
} USING fulltext;

-- German with compound word handling
CREATE INDEX docs_de FOR (d:Document) ON (d.content)
OPTIONS {
    analyzer: 'german',
    stemmer: 'snowball_german',
    compound_splitting: true
} USING fulltext;

-- Multi-language with automatic detection
CREATE INDEX docs_multi FOR (d:Document) ON (d.content)
OPTIONS {
    analyzer: 'icu',  // Unicode-aware tokenization
    language_detection: true,
    k1: 1.5,
    b: 0.75
} USING fulltext;
```

### Custom Analyzers

```gql
-- Code search analyzer (no stemming, preserve case)
CREATE INDEX code_search FOR (c:Code) ON (c.source)
OPTIONS {
    analyzer: 'code',
    tokenizer: 'whitespace',
    filters: ['lowercase'],
    preserve_original: true,
    k1: 1.2,
    b: 0.0  // No length normalization for code
} USING fulltext;

-- Product SKU search (exact matching)
CREATE INDEX product_sku FOR (p:Product) ON (p.sku)
OPTIONS {
    analyzer: 'keyword',  // No tokenization
    case_sensitive: true,
    k1: 2.0  // Higher term frequency boost
} USING fulltext;
```

## Performance Optimization

### Index Sharding

Partition large indexes:

```gql
-- Create date-partitioned indexes
CREATE INDEX docs_2024 FOR (d:Document) ON (d.content)
WHERE d.publish_date >= date('2024-01-01')
OPTIONS {analyzer: 'english'} USING fulltext;

CREATE INDEX docs_2023 FOR (d:Document) ON (d.content)
WHERE d.publish_date >= date('2023-01-01')
  AND d.publish_date < date('2024-01-01')
OPTIONS {analyzer: 'english'} USING fulltext;

-- Query specific partition
-- NOTE: geode.fts.search takes string literals only; a $parameter is
-- rejected. Interpolate the search terms client-side before sending.
CALL geode.fts.search('document_content', '<search terms>')
YIELD node, score
MATCH (d:Document)
WHERE id(d) = node AND d.publish_date >= date('2024-01-01')
RETURN d.title, score
ORDER BY score DESC;
```

### Caching Strategies

```python
# Cache frequent query results
from functools import lru_cache

@lru_cache(maxsize=1000)
async def cached_search(query: str, limit: int = 20):
    result, _ = await client.query("""
        CALL geode.fts.search('document_content', 'graph database')
        YIELD node, score
        MATCH (d:Document) WHERE id(d) = node
        RETURN d.doc_id, d.title, score
        ORDER BY score DESC
        LIMIT $limit
    """, {"limit": limit})  # index/query args must be string literals
    return result
```

## Evaluation and Tuning

### Precision/Recall Analysis

```gql
-- Compute precision@k and recall@k
WITH ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'] AS relevant_docs
-- NOTE: geode.fts.search takes string literals only; a $parameter
-- is rejected. Interpolate the term client-side before sending.
CALL geode.fts.search('document_content', '<search terms>')
YIELD node, score
MATCH (d:Document) WHERE id(d) = node
WITH d, score AS score, relevant_docs
ORDER BY score DESC
LIMIT 10
WITH COLLECT(d.doc_id) AS retrieved_docs, relevant_docs
WITH SIZE([id IN retrieved_docs WHERE id IN relevant_docs]) AS hits,
     SIZE(retrieved_docs) AS k,
     SIZE(relevant_docs) AS total_relevant
RETURN hits * 1.0 / k AS precision_at_10,
       hits * 1.0 / total_relevant AS recall_at_10,
       2 * (precision_at_10 * recall_at_10) / (precision_at_10 + recall_at_10) AS f1_score;
```

### Parameter Tuning

```gql
-- Grid search for optimal k1 and b
WITH [0.5, 1.0, 1.2, 1.5, 2.0] AS k1_values,
     [0.0, 0.25, 0.5, 0.75, 1.0] AS b_values
UNWIND k1_values AS k1
UNWIND b_values AS b

CALL {
    WITH k1, b
    // Recreate index with parameters
    DROP INDEX IF EXISTS test_index;
    CREATE INDEX test_index FOR (d:Document) ON (d.content)
    OPTIONS {k1: k1, b: b} USING fulltext;

    // Run evaluation queries
    CALL evaluate_queries() YIELD avg_ndcg
    RETURN k1, b, avg_ndcg
}
RETURN k1, b, avg_ndcg
ORDER BY avg_ndcg DESC
LIMIT 1;
```

## Further Reading

- **BM25 Algorithm**: Theory, Variants (BM25+, BM25F), and Applications
- **Text Analysis**: Tokenization, Stemming, and Language Processing
- **Query Expansion**: Pseudo-Relevance Feedback and Synonym Handling
- **Hybrid Search**: Combining BM25 with Vector Search (HNSW)
- **Index Optimization**: Sharding, Compression, and Caching

Browse tagged content for complete BM25 and full-text search documentation.
