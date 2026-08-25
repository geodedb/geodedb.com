---
title: "AI and Machine Learning Integration with Geode"
description: "Integrate AI and machine learning workflows with Geode graph database. Learn about vector search, embeddings, RAG pipelines, recommendation systems, and LLM-powered applications."
keywords:
  - AI integration
  - machine learning
  - vector search
  - embeddings
  - RAG
  - retrieval augmented generation
  - LLM
  - recommendation systems
  - semantic search
  - Geode AI
  - graph neural networks
  - knowledge graphs
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/ai/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# AI and Machine Learning Integration with Geode

Geode provides native support for AI and machine learning workloads through vector similarity search, embedding storage, and seamless integration with modern ML pipelines. This page covers the patterns and best practices for building intelligent applications that combine graph traversals with AI capabilities.

## Introduction to AI-Powered Graph Applications

Graph databases and artificial intelligence are natural partners. While graphs excel at modeling relationships and enabling complex traversals, AI adds semantic understanding, pattern recognition, and predictive capabilities. Geode bridges these worlds with:

- **Native Vector Search**: HNSW indexes for efficient similarity search over embeddings
- **Hybrid Queries**: Combine graph traversals with vector similarity in single queries
- **ML Pipeline Integration**: Connect to embedding models, LLMs, and ML frameworks
- **Knowledge Graph Support**: Store and query structured knowledge for AI applications

### Why Combine Graphs with AI?

Traditional AI applications often struggle with:

- **Context**: Understanding relationships between entities
- **Explainability**: Tracing how conclusions were reached
- **Knowledge Integration**: Combining learned patterns with structured facts
- **Multi-hop Reasoning**: Following chains of relationships

Geode addresses these challenges by providing a unified platform where AI models can leverage graph structure for richer, more accurate results.

## Vector Search and Embeddings

### Storing Embeddings in Geode

Embeddings transform complex data into dense numerical vectors that capture semantic meaning. Store them as node or relationship properties:

```gql
-- Create a document with text embedding
CREATE (d:Document {
  doc_id: 'doc_001',
  title: 'Introduction to Graph Databases',
  content: 'Graph databases model data as nodes and relationships...',
  embedding: $embedding,  -- 384 or 1536 dimensional vector
  embedding_model: 'text-embedding-3-small',
  created_at: datetime()
});

-- Create a product with image embedding
CREATE (p:Product {
  product_id: 'prod_456',
  name: 'Wireless Headphones',
  image_url: '/images/headphones.jpg',
  image_embedding: $clip_embedding,  -- CLIP model output
  text_embedding: $text_embedding
});
```

### Creating Vector Indexes

Enable fast similarity search with HNSW indexes:

```gql
-- Create HNSW index for document embeddings
CREATE VECTOR INDEX document_embeddings
ON Document(embedding)
WITH (metric = 'cosine');

-- Create index for multi-modal search
CREATE VECTOR INDEX product_images
ON Product(image_embedding)
WITH (metric = 'cosine');
```

### Similarity Search Queries

Find semantically similar items:

```gql
-- Semantic document search
MATCH (d:Document)
WITH d, similarity(d.embedding, $query_embedding, 'cosine') AS score
WHERE score > 0.7
RETURN d.doc_id, d.title, score
ORDER BY score DESC
LIMIT 10;

-- Find similar products combining text and image
MATCH (p:Product)
WITH p,
     similarity(p.text_embedding, $text_query, 'cosine') AS text_score,
     similarity(p.image_embedding, $image_query, 'cosine') AS image_score
WITH p, 0.6 * text_score + 0.4 * image_score AS combined_score
WHERE combined_score > 0.65
RETURN p.name, p.product_id, combined_score
ORDER BY combined_score DESC
LIMIT 20;
```

## Retrieval-Augmented Generation (RAG)

RAG combines the knowledge retrieval capabilities of databases with the generation abilities of large language models. Geode is ideal for RAG because it can:

1. Store document chunks with embeddings
2. Retrieve relevant context via vector search
3. Provide graph-based context for richer answers

### RAG Pipeline Architecture

```python
from geode_client import Client
import openai

async def rag_query(question: str) -> str:
    client = Client(host="localhost", port=3141)

    # Step 1: Generate query embedding
    query_embedding = await generate_embedding(question)

    async with client.connection() as conn:
        # Step 2: Retrieve relevant documents
        result, _ = await conn.query("""
            MATCH (chunk:DocumentChunk)
            WITH chunk,
                 similarity(chunk.embedding, $query_emb, 'cosine') AS relevance
            WHERE relevance > 0.7
            ORDER BY relevance DESC
            LIMIT 5

            -- Step 3: Get document context via graph
            MATCH (chunk)-[:PART_OF]->(doc:Document)
            OPTIONAL MATCH (doc)-[:RELATED_TO]->(related:Document)

            RETURN chunk.content AS text,
                   doc.title AS source,
                   relevance,
                   collect(DISTINCT related.title)[0..3] AS related_docs
        """, {"query_emb": query_embedding})

        # Step 4: Build context for LLM
        context = "\n\n".join([
            f"Source: {row['source']}\n{row['text']}"
            for row in result.rows
        ])

        # Step 5: Generate answer with LLM
        response = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "Answer based on the provided context."},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
            ]
        )

        return response.choices[0].message.content
```

### Graph-Enhanced RAG

Leverage graph relationships for better context:

```gql
-- Retrieve chunks with related entities
MATCH (chunk:DocumentChunk)
WHERE similarity(chunk.embedding, $query_emb, 'cosine') > 0.7
WITH chunk
ORDER BY similarity(chunk.embedding, $query_emb, 'cosine') DESC
LIMIT 5

-- Expand context via graph relationships
MATCH (chunk)-[:MENTIONS]->(entity:Entity)
OPTIONAL MATCH (entity)-[:RELATED_TO]-(related_entity:Entity)
OPTIONAL MATCH (related_entity)<-[:MENTIONS]-(related_chunk:DocumentChunk)

RETURN chunk.content AS primary_content,
       collect(DISTINCT entity.name) AS mentioned_entities,
       collect(DISTINCT related_chunk.content)[0..3] AS related_content;
```

### Multi-Hop RAG

Answer complex questions requiring reasoning across multiple documents:

```gql
-- Question: "What companies did the CEO of TechCorp previously work for?"
MATCH (chunk:DocumentChunk)
WHERE similarity(chunk.embedding, $query_emb, 'cosine') > 0.6

-- Extract entity relationships
MATCH (chunk)-[:MENTIONS]->(person:Person)-[:CEO_OF]->(company:Company {name: 'TechCorp'})
MATCH (person)-[:WORKED_AT]->(prev_company:Company)

RETURN person.name AS ceo,
       collect(DISTINCT prev_company.name) AS previous_companies,
       chunk.content AS source_text;
```

## Recommendation Systems

Geode excels at building recommendation engines that combine collaborative filtering with content-based approaches.

### Collaborative Filtering with Graph

```gql
-- User-based collaborative filtering
MATCH (target_user:User {user_id: $user_id})-[:PURCHASED]->(item:Product)
MATCH (similar_user:User)-[:PURCHASED]->(item)
WHERE similar_user <> target_user
WITH similar_user, count(item) AS shared_purchases

-- Find what similar users bought that target hasn't
MATCH (similar_user)-[:PURCHASED]->(recommended:Product)
WHERE NOT (target_user)-[:PURCHASED]->(recommended)
  AND shared_purchases >= 3

RETURN recommended.product_id,
       recommended.name,
       count(DISTINCT similar_user) AS recommender_count,
       sum(shared_purchases) AS affinity_score
ORDER BY affinity_score DESC
LIMIT 10;
```

### Content-Based with Embeddings

```gql
-- Find products similar to user's purchase history
MATCH (user:User {user_id: $user_id})-[:PURCHASED]->(bought:Product)
WITH user, collect(bought.embedding) AS purchase_embeddings

-- Calculate average preference vector
WITH user,
     [i IN range(0, size(purchase_embeddings[0])-1) |
      avg([emb IN purchase_embeddings | emb[i]])] AS preference_vector

-- Find similar products
MATCH (candidate:Product)
WHERE NOT (user)-[:PURCHASED]->(candidate)
WITH candidate,
     similarity(candidate.embedding, preference_vector, 'cosine') AS similarity
WHERE similarity > 0.75

RETURN candidate.product_id, candidate.name, similarity
ORDER BY similarity DESC
LIMIT 20;
```

### Hybrid Recommendations

Combine multiple signals:

```gql
-- Hybrid recommendation combining graph and embeddings
MATCH (user:User {user_id: $user_id})

-- Get collaborative score
OPTIONAL MATCH (user)-[:PURCHASED]->()<-[:PURCHASED]-(similar:User)
OPTIONAL MATCH (similar)-[:PURCHASED]->(rec:Product)
WHERE NOT (user)-[:PURCHASED]->(rec)
WITH user, rec, count(DISTINCT similar) AS collab_score

-- Get content-based score
MATCH (user)-[:PURCHASED]->(bought:Product)
WITH user, rec, collab_score,
     avg(similarity(rec.embedding, bought.embedding, 'cosine')) AS content_score

-- Combine scores
WITH rec,
     0.6 * collab_score / 10.0 + 0.4 * content_score AS hybrid_score
WHERE hybrid_score > 0.5

RETURN rec.product_id, rec.name, hybrid_score
ORDER BY hybrid_score DESC
LIMIT 15;
```

## Knowledge Graphs for AI

### Building Knowledge Graphs

Structure domain knowledge for AI consumption:

```gql
-- Create entities and relationships
CREATE (company:Company {
  name: 'Anthropic',
  founded: 2021,
  description: 'AI safety company',
  embedding: $company_embedding
});

CREATE (person:Person {
  name: 'Dario Amodei',
  role: 'CEO',
  embedding: $person_embedding
});

CREATE (company)-[:FOUNDED_BY]->(person);
CREATE (person)-[:LEADS]->(company);

-- Add facts as typed relationships
CREATE (company)-[:HEADQUARTERED_IN {since: 2021}]->(:City {name: 'San Francisco'});
CREATE (company)-[:DEVELOPS]->(:Product {name: 'Claude', type: 'LLM'});
```

### Querying Knowledge Graphs

```gql
-- Entity resolution with embeddings
MATCH (e:Entity)
WHERE similarity(e.embedding, $query_embedding, 'cosine') > 0.85
RETURN e.name, labels(e) AS types, e.description;

-- Multi-hop knowledge queries
MATCH path = (start:Company {name: 'Anthropic'})-[*1..3]-(end:Entity)
WHERE end:Person OR end:Product OR end:Company
RETURN [n IN nodes(path) | n.name] AS entity_path,
       [r IN relationships(path) | type(r)] AS relationship_types;

-- Find related facts
MATCH (entity:Entity)
WHERE entity.name = $entity_name
MATCH (entity)-[r]-(related)
RETURN type(r) AS relationship,
       related.name AS related_entity,
       labels(related) AS entity_types;
```

## LLM Integration Patterns

### Structured Output from LLMs

Store LLM-extracted information in Geode:

```python
async def extract_and_store_entities(text: str, doc_id: str):
    # Use LLM to extract entities
    extraction = await openai.ChatCompletion.acreate(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Extract entities and relationships as JSON."},
            {"role": "user", "content": text}
        ],
        response_format={"type": "json_object"}
    )

    entities = json.loads(extraction.choices[0].message.content)

    async with client.connection() as conn:
        # Store entities
        for entity in entities['entities']:
            await conn.execute("""
                MERGE (e:Entity {name: $name})
                SET e.type = $type,
                    e.embedding = $embedding
            """, {
                "name": entity['name'],
                "type": entity['type'],
                "embedding": await generate_embedding(entity['name'])
            })

        # Store relationships
        for rel in entities['relationships']:
            await conn.execute("""
                MATCH (source:Entity {name: $source})
                MATCH (target:Entity {name: $target})
                MERGE (source)-[r:RELATED {type: $rel_type}]->(target)
            """, rel)
```

### Agent Tool Integration

Expose Geode queries as LLM tools:

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": "Search the knowledge graph for information",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural language query"},
                    "entity_types": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "find_relationships",
            "description": "Find relationships between entities",
            "parameters": {
                "type": "object",
                "properties": {
                    "entity_name": {"type": "string"},
                    "relationship_types": {"type": "array", "items": {"type": "string"}},
                    "max_hops": {"type": "integer", "default": 2}
                },
                "required": ["entity_name"]
            }
        }
    }
]

async def handle_tool_call(tool_name: str, args: dict):
    async with client.connection() as conn:
        if tool_name == "search_knowledge_base":
            query_emb = await generate_embedding(args['query'])
            result, _ = await conn.query("""
                MATCH (e:Entity)
                WHERE similarity(e.embedding, $emb, 'cosine') > 0.7
                RETURN e.name, e.type, e.description
                ORDER BY similarity(e.embedding, $emb, 'cosine') DESC
                LIMIT 10
            """, {"emb": query_emb})
            return result.rows

        elif tool_name == "find_relationships":
            result, _ = await conn.query("""
                MATCH (e:Entity {name: $name})-[r*1..$hops]-(related)
                RETURN DISTINCT related.name, labels(related),
                       [rel IN r | type(rel)] AS path
            """, {"name": args['entity_name'], "hops": args.get('max_hops', 2)})
            return result.rows
```

## Graph Neural Networks

### Preparing Data for GNNs

Export graph data for GNN training:

```python
async def export_for_gnn(client):
    # Export node features
    nodes, _ = await client.query("""
        MATCH (n:Entity)
        RETURN id(n) AS node_id,
               n.embedding AS features,
               labels(n) AS node_type
    """)

    # Export edges
    edges, _ = await client.query("""
        MATCH (source)-[r]->(target)
        RETURN id(source) AS source_id,
               id(target) AS target_id,
               type(r) AS edge_type
    """)

    return {
        'nodes': nodes.rows,
        'edges': edges.rows
    }
```

### Storing GNN Embeddings

```gql
-- Store learned node embeddings from GNN
MATCH (n:Entity {entity_id: $entity_id})
SET n.gnn_embedding = $gnn_vector,
    n.gnn_model_version = 'graphsage-v2',
    n.gnn_updated_at = datetime();

-- Use GNN embeddings for link prediction
MATCH (a:Entity), (b:Entity)
WHERE a <> b AND NOT (a)-[:RELATED]-(b)
WITH a, b,
     similarity(a.gnn_embedding, b.gnn_embedding, 'cosine') AS link_score
WHERE link_score > 0.8
RETURN a.name, b.name, link_score
ORDER BY link_score DESC
LIMIT 100;
```

## Performance Optimization

### Batch Embedding Generation

```python
async def batch_embed_documents(client, batch_size=100):
    async with client.connection() as conn:
        # Find documents needing embeddings
        docs, _ = await conn.query("""
            MATCH (d:Document)
            WHERE d.embedding IS NULL AND d.content IS NOT NULL
            RETURN d.doc_id AS id, d.content AS text
            LIMIT $batch_size
        """, {"batch_size": batch_size})

        if not docs.rows:
            return 0

        # Batch embed with model
        texts = [row['text'] for row in docs.rows]
        embeddings = embedding_model.encode(texts, batch_size=32)

        # Update in transaction
        async with conn.transaction() as tx:
            for doc, emb in zip(docs.rows, embeddings):
                await tx.execute("""
                    MATCH (d:Document {doc_id: $id})
                    SET d.embedding = $embedding,
                        d.embedding_model = 'text-embedding-3-small',
                        d.embedded_at = datetime()
                """, {"id": doc['id'], "embedding": emb.tolist()})

        return len(docs.rows)
```

### Caching Strategies

```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=10000)
def get_cached_embedding(text_hash: str):
    # Cache hit
    return embedding_cache.get(text_hash)

async def smart_embed(text: str):
    text_hash = hashlib.md5(text.encode()).hexdigest()

    cached = get_cached_embedding(text_hash)
    if cached:
        return cached

    embedding = await generate_embedding(text)
    embedding_cache[text_hash] = embedding
    return embedding
```

## Related Topics

- **[Vector Search](/tags/vector-search/)**: Deep dive into HNSW indexes and similarity queries
- **[Embeddings](/tags/embeddings/)**: Best practices for storing and querying embeddings
- **[Recommendations](/tags/recommendations/)**: Building recommendation systems
- **[Knowledge Graphs](/tags/knowledge-graphs/)**: Structuring knowledge for AI
- **[Performance](/tags/performance/)**: Optimizing AI workloads

## Further Reading

- **RAG Best Practices**: Building production RAG systems with Geode
- **Vector Index Tuning**: Optimizing HNSW parameters for your workload
- **LLM Integration Guide**: Connecting Geode to OpenAI, Anthropic, and other providers
- **Graph Neural Networks**: Training GNNs on Geode data
- **Knowledge Graph Construction**: Automated knowledge extraction and storage

Browse the tagged content below to explore AI and machine learning documentation, tutorials, and examples for Geode.
