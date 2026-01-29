---
title: "Knowledge Graphs and Semantic Networks"
description: "Build knowledge graphs with Geode for semantic search, ontology management, RDF integration, and intelligent information retrieval"
url: /docs/use-cases/knowledge-graphs/
keywords: ["knowledge graph", "semantic network", "ontology", "RDF", "SPARQL", "semantic search", "entity resolution", "linked data", "information retrieval"]
weight: 40
slug: "knowledge-graphs"
canonical: "https://geodedb.com/docs/use-cases/knowledge-graphs/"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Knowledge Graphs and Semantic Networks

Build intelligent knowledge graphs with Geode for semantic search, entity linking, and complex information retrieval.

## Overview

Knowledge graphs represent real-world entities and their relationships in a structured, semantic format. Geode's property graph model naturally supports knowledge graph construction with rich metadata, type hierarchies, and flexible schema evolution.

### What is a Knowledge Graph?

A knowledge graph is a network of entities (people, places, concepts) connected by meaningful relationships, enriched with:

- **Entity Types**: Categorization using labels and properties
- **Relationships**: Typed connections with metadata
- **Semantics**: Meaning encoded in structure and attributes
- **Inference**: Derive new knowledge from existing facts

### Key Capabilities

- **Semantic Querying**: Find information by meaning, not just keywords
- **Entity Resolution**: Merge duplicate entities across sources
- **Ontology Management**: Define and enforce domain models
- **Relationship Discovery**: Uncover hidden connections
- **Multi-hop Reasoning**: Answer complex questions across relationships

## Use Case Scenarios

### 1. Enterprise Knowledge Management

**Challenge**: Organize organizational knowledge across departments

**Solution**: Build a unified knowledge graph of:
- People (employees, customers, partners)
- Projects and deliverables
- Documents and assets
- Expertise and skills

**Benefits**:
- Find relevant expertise quickly
- Discover hidden project connections
- Automate knowledge discovery
- Improve decision-making

### 2. Scientific Research Networks

**Challenge**: Navigate millions of papers, authors, and citations

**Solution**: Create research knowledge graph with:
- Authors and affiliations
- Papers and citations
- Topics and keywords
- Funding sources

**Benefits**:
- Find related research
- Identify collaboration opportunities
- Track research trends
- Discover influential work

### 3. Product Catalogs and Recommendations

**Challenge**: Organize complex product hierarchies with attributes

**Solution**: Model products as knowledge graph:
- Products and variants
- Categories and taxonomies
- Attributes and specifications
- Customer preferences

**Benefits**:
- Semantic product search
- Intelligent recommendations
- Cross-selling opportunities
- Attribute-based filtering

## Data Model

### Entity Modeling

```gql
-- Core entity types
CREATE
  (:Entity {
    id: 'ent_123',
    type: 'Person',
    name: 'Marie Curie',
    canonical_name: 'marie curie',
    aliases: ['Maria Sklodowska', 'Madame Curie']
  }),
  (:Entity {
    id: 'ent_456',
    type: 'Organization',
    name: 'University of Paris',
    founded: 1150,
    location: 'Paris, France'
  }),
  (:Entity {
    id: 'ent_789',
    type: 'Concept',
    name: 'Radioactivity',
    domain: 'Physics',
    definition: 'Emission of radiation from atomic nuclei'
  });
```

### Relationship Types

```gql
-- Typed relationships with metadata
MATCH (marie:Entity {id: 'ent_123'}), (uni:Entity {id: 'ent_456'})
CREATE (marie)-[:AFFILIATED_WITH {
  role: 'Professor',
  start_date: date('1906-01-01'),
  end_date: date('1934-07-04'),
  department: 'Physics'
}]->(uni);

MATCH (marie:Entity {id: 'ent_123'}), (radio:Entity {id: 'ent_789'})
CREATE (marie)-[:DISCOVERED {
  year: 1898,
  recognition: 'Nobel Prize in Physics (1903)',
  co_discoverers: ['Pierre Curie', 'Henri Becquerel']
}]->(radio);
```

### Ontology Definition

```gql
-- Type hierarchy
CREATE
  (:Type {name: 'Entity', level: 0}),
  (:Type {name: 'Person', level: 1, parent: 'Entity'}),
  (:Type {name: 'Scientist', level: 2, parent: 'Person'}),
  (:Type {name: 'Physicist', level: 3, parent: 'Scientist'}),
  (:Type {name: 'Organization', level: 1, parent: 'Entity'}),
  (:Type {name: 'University', level: 2, parent: 'Organization'}),
  (:Type {name: 'Concept', level: 1, parent: 'Entity'}),
  (:Type {name: 'Scientific_Concept', level: 2, parent: 'Concept'});

-- Type relationships
MATCH (scientist:Type {name: 'Scientist'}), (person:Type {name: 'Person'})
CREATE (scientist)-[:SUBCLASS_OF]->(person);
```

## Implementation Guide

### Step 1: Data Ingestion

#### From Structured Sources

```gql
-- Import from CSV
LOAD CSV WITH HEADERS FROM 'file:///entities.csv' AS row
CREATE (:Entity {
  id: row.id,
  type: row.type,
  name: row.name,
  properties: row
});

-- Import from JSON
LOAD JSON FROM 'file:///knowledge_base.json' AS data
UNWIND data.entities AS entity
CREATE (:Entity {
  id: entity.id,
  type: entity.type,
  name: entity.name,
  attributes: entity.attributes
});
```

#### From Unstructured Text

<!-- CANARY: REQ=REQ-CLIENT-PY-001; FEATURE="PythonClientConnection"; ASPECT=HelloHandshake; STATUS=IMPL; OWNER=clients; UPDATED=2025-02-14 -->

```python
# Python client - Extract entities from text
from geode_client import Client
import spacy

client = Client(host="geode.example.com", port=3141)
nlp = spacy.load("en_core_web_sm")

def extract_entities(text):
    doc = nlp(text)
    entities = []

    for ent in doc.ents:
        entities.append({
            'text': ent.text,
            'label': ent.label_,
            'start': ent.start_char,
            'end': ent.end_char
        })

    return entities

# Process document
text = "Marie Curie discovered radioactivity at the University of Paris."
entities = extract_entities(text)

# Create entities in Geode
async def store_entities(entities_to_store):
    async with client.connection() as conn:
        for ent in entities_to_store:
            await conn.execute("""
                MERGE (e:Entity {name: $name, type: $type})
                ON CREATE SET e.mentions = 1
                ON MATCH SET e.mentions = e.mentions + 1
            """, {'name': ent['text'], 'type': ent['label']})

# asyncio.run(store_entities(entities))
```

### Step 2: Entity Resolution

```gql
-- Find potential duplicates
MATCH (e1:Entity), (e2:Entity)
WHERE e1.id < e2.id
  AND e1.type = e2.type
  AND (
    e1.name = e2.name
    OR e1.canonical_name = e2.canonical_name
    OR ANY(alias IN e1.aliases WHERE alias IN e2.aliases)
  )
RETURN e1.id, e1.name, e2.id, e2.name, 'exact_match' AS match_type;

-- Fuzzy matching with string similarity
MATCH (e1:Entity), (e2:Entity)
WHERE e1.id < e2.id
  AND e1.type = e2.type
  AND levenshtein_distance(e1.canonical_name, e2.canonical_name) < 3
RETURN e1.id, e1.name, e2.id, e2.name,
       levenshtein_distance(e1.canonical_name, e2.canonical_name) AS edit_distance
ORDER BY edit_distance;
```

#### Merge Duplicates

```gql
-- Merge two entities
MATCH (primary:Entity {id: 'ent_123'})
MATCH (duplicate:Entity {id: 'ent_124'})

-- Merge relationships
MATCH (duplicate)-[r]->(other)
MERGE (primary)-[r2:TYPE(r)]->(other)
SET r2 = properties(r);

MATCH (other)-[r]->(duplicate)
MERGE (other)-[r2:TYPE(r)]->(primary)
SET r2 = properties(r);

-- Merge properties
SET primary.aliases = primary.aliases + duplicate.aliases,
    primary.mentions = primary.mentions + duplicate.mentions,
    primary.sources = primary.sources + duplicate.sources;

-- Delete duplicate
DETACH DELETE duplicate;
```

### Step 3: Semantic Search

#### Full-Text Search

```gql
-- Create full-text index
CREATE INDEX entity_name_ft_idx ON Entity(name) USING fulltext;

-- Search with ranking
MATCH (e:Entity)
WHERE fulltext_match(e.name, "physics nobel prize")
RETURN e.name, e.type,
       bm25_score(e.name, "physics nobel prize") AS relevance
ORDER BY relevance DESC
LIMIT 10;
```

#### Contextual Search

```gql
-- Find entities in context
MATCH (e:Entity)-[r]-(related:Entity)
WHERE fulltext_match(e.name, "curie")
RETURN e.name, e.type,
       collect({
         relationship: type(r),
         entity: related.name,
         entity_type: related.type
       }) AS context
ORDER BY e.mentions DESC;
```

### Step 4: Knowledge Discovery

#### Find Hidden Connections

```gql
-- Find connection paths between entities
MATCH path = shortestPath(
  (marie:Entity {name: 'Marie Curie'})-[*1..5]-(einstein:Entity {name: 'Albert Einstein'})
)
RETURN [n IN nodes(path) | {name: n.name, type: n.type}] AS connection_path,
       [r IN relationships(path) | type(r)] AS relationship_types,
       length(path) AS degree_of_separation;
```

#### Discover Patterns

```gql
-- Find common collaboration patterns
MATCH (p1:Entity {type: 'Scientist'})-[:COLLABORATED_WITH]->(p2:Entity {type: 'Scientist'}),
      (p2)-[:COLLABORATED_WITH]->(p3:Entity {type: 'Scientist'}),
      (p3)-[:COLLABORATED_WITH]->(p1)
WHERE p1.id < p2.id AND p2.id < p3.id
RETURN p1.name, p2.name, p3.name, count(*) AS triangle_count
ORDER BY triangle_count DESC
LIMIT 10;
```

### Step 5: Inference and Reasoning

#### Type Inference

```gql
-- Infer types from relationships
MATCH (person:Entity)-[:WORKS_AT]->(org:Entity {type: 'University'})
WHERE NOT person.type = 'Professor'
SET person.type = 'Academic';

-- Infer expertise from publications
MATCH (author:Entity {type: 'Person'})-[:AUTHORED]->(paper:Entity),
      (paper)-[:ABOUT]->(topic:Entity {type: 'Concept'})
WITH author, topic, count(*) AS paper_count
WHERE paper_count > 5
MERGE (author)-[:EXPERT_IN {strength: paper_count}]->(topic);
```

#### Rule-Based Inference

```gql
-- Transitivity: If A→B and B→C, infer A→C
MATCH (a:Entity)-[:INFLUENCES]->(b:Entity)-[:INFLUENCES]->(c:Entity)
WHERE NOT EXISTS((a)-[:INFLUENCES]->(c))
MERGE (a)-[:INFLUENCES {derived: true, confidence: 0.7}]->(c);

-- Symmetry: If A COLLABORATED_WITH B, then B COLLABORATED_WITH A
MATCH (a:Entity)-[r:COLLABORATED_WITH]->(b:Entity)
WHERE NOT EXISTS((b)-[:COLLABORATED_WITH]->(a))
MERGE (b)-[:COLLABORATED_WITH {
  derived: true,
  source: r.source,
  year: r.year
}]->(a);
```

## Advanced Patterns

### RDF Integration

```gql
-- Model RDF triples as graph
-- Triple: (subject, predicate, object)

-- Create entities
MERGE (marie:Entity {uri: 'http://example.org/person/marie_curie', name: 'Marie Curie'})
MERGE (nobel:Entity {uri: 'http://example.org/award/nobel_physics_1903', name: 'Nobel Prize in Physics 1903'});

-- Create relationship (predicate)
MATCH (marie:Entity {uri: 'http://example.org/person/marie_curie'}),
      (nobel:Entity {uri: 'http://example.org/award/nobel_physics_1903'})
CREATE (marie)-[:RECEIVED {
  predicate: 'http://example.org/ontology/received',
  year: 1903
}]->(nobel);

-- SPARQL-like query in GQL
MATCH (subject:Entity)-[r]->(object:Entity)
WHERE r.predicate = 'http://example.org/ontology/received'
  AND object.uri CONTAINS 'nobel'
RETURN subject.uri, r.predicate, object.uri;
```

### Vector Embeddings for Semantic Similarity

```python
# Generate entity embeddings
from sentence_transformers import SentenceTransformer
from geode_client import Client

model = SentenceTransformer('all-MiniLM-L6-v2')
client = Client(host="geode.example.com", port=3141)

async def embed_entities():
    async with client.connection() as conn:
        # Get entities
        page, _ = await conn.query("MATCH (e:Entity) RETURN e.id, e.name, e.description")

        for record in page.rows:
            ent_id = record["e.id"].raw_value
            text = f"{record['e.name'].raw_value} {record['e.description'].raw_value}"

            # Generate embedding
            embedding = model.encode(text)

            # Store in Geode
            await conn.execute("""
                MATCH (e:Entity {id: $id})
                SET e.embedding = $embedding
            """, {'id': ent_id, 'embedding': embedding.tolist()})

        # Create vector index
        await conn.execute("CREATE INDEX entity_emb_idx ON Entity(embedding) USING vector")

        # Find semantically similar entities
        query_embedding = model.encode("nuclear physics research")
        page, _ = await conn.query("""
            MATCH (e:Entity)
            WHERE vector_distance_cosine(e.embedding, $query_vec) < 0.5
            RETURN e.name, e.type,
                   vector_distance_cosine(e.embedding, $query_vec) AS similarity
            ORDER BY similarity ASC
            LIMIT 10
        """, {'query_vec': query_embedding.tolist()})

# asyncio.run(embed_entities())
```

### Temporal Knowledge Graphs

```gql
-- Model time-varying facts
CREATE (:Entity {
  id: 'ent_123',
  name: 'Marie Curie',
  type: 'Person'
});

-- Facts with temporal validity
CREATE
  (marie:Entity {id: 'ent_123'}),
  (uni_paris:Entity {id: 'ent_456'}),
  (uni_sorbonne:Entity {id: 'ent_457'})
CREATE (marie)-[:WORKS_AT {
  valid_from: date('1906-01-01'),
  valid_to: date('1934-07-04'),
  position: 'Professor of Physics'
}]->(uni_paris);

-- Query facts at specific time
MATCH (person:Entity)-[r:WORKS_AT]->(org:Entity)
WHERE $query_date >= r.valid_from
  AND $query_date <= r.valid_to
RETURN person.name, org.name, r.position;
```

## Query Examples

### Question Answering

```gql
-- "Who won the Nobel Prize in Physics in 1903?"
MATCH (person:Entity)-[r:RECEIVED]->(award:Entity)
WHERE award.name CONTAINS 'Nobel'
  AND award.name CONTAINS 'Physics'
  AND r.year = 1903
RETURN person.name, award.name;

-- "What did Marie Curie discover?"
MATCH (marie:Entity {name: 'Marie Curie'})-[:DISCOVERED]->(thing:Entity)
RETURN thing.name, thing.type;

-- "Who collaborated with Marie Curie?"
MATCH (marie:Entity {name: 'Marie Curie'})-[:COLLABORATED_WITH]-(colleague:Entity)
RETURN colleague.name, colleague.type;
```

### Multi-hop Reasoning

```gql
-- "Find researchers influenced by Marie Curie's work"
MATCH (marie:Entity {name: 'Marie Curie'})-[:DISCOVERED]->(concept:Entity),
      (concept)<-[:STUDIED]-(researcher:Entity)
WHERE researcher <> marie
RETURN DISTINCT researcher.name,
       collect(DISTINCT concept.name) AS studied_concepts
ORDER BY size(studied_concepts) DESC;

-- "Find potential research collaborations"
MATCH (a:Entity {type: 'Scientist'})-[:EXPERT_IN]->(topic:Entity),
      (topic)<-[:EXPERT_IN]-(b:Entity {type: 'Scientist'})
WHERE a <> b
  AND NOT EXISTS((a)-[:COLLABORATED_WITH]-(b))
WITH a, b, collect(topic.name) AS common_topics
WHERE size(common_topics) >= 2
RETURN a.name, b.name, common_topics,
       size(common_topics) AS match_score
ORDER BY match_score DESC
LIMIT 20;
```

## Performance Optimization

### Indexing Strategy

```gql
-- Core indexes
CREATE INDEX entity_id_idx ON Entity(id) USING hash;
CREATE INDEX entity_type_idx ON Entity(type) USING btree;
CREATE INDEX entity_name_idx ON Entity(canonical_name) USING btree;
CREATE INDEX entity_ft_idx ON Entity(name, description) USING fulltext;
CREATE INDEX entity_vector_idx ON Entity(embedding) USING vector;

-- Composite indexes
CREATE INDEX entity_type_name_idx ON Entity(type, canonical_name) USING btree;
```

### Query Optimization

```gql
-- Use PROFILE to analyze
PROFILE
MATCH (e:Entity {type: 'Person'})-[:WORKS_AT]->(org:Entity {type: 'University'})
RETURN e.name, org.name;

-- Add index if SeqScan detected
CREATE INDEX person_type_idx ON Entity(type) USING btree;
```

### Caching Popular Queries

```python
# Python client with caching
from geode_client import Client

client = Client(host="geode.example.com", port=3141)
context_cache = {}

async def get_entity_context(conn, entity_id):
    if entity_id in context_cache:
        return context_cache[entity_id]

    page, _ = await conn.query("""
        MATCH (e:Entity {id: $id})-[r]-(related:Entity)
        RETURN e, collect({rel: type(r), entity: related}) AS context
    """, {'id': entity_id})

    context = page.rows[0] if page.rows else None
    context_cache[entity_id] = context
    return context

# async with client.connection() as conn:
#     ctx = await get_entity_context(conn, "entity_123")
```

## Best Practices

### 1. Entity Naming

- **Canonical Forms**: Normalize to lowercase, remove punctuation
- **Aliases**: Store all known variations
- **URIs**: Use stable identifiers (not display names)

### 2. Relationship Design

- **Explicit Types**: Use specific relationship types (avoid generic `:RELATED_TO`)
- **Metadata**: Add context (date, confidence, source)
- **Directionality**: Choose meaningful direction

### 3. Ontology Management

- **Start Simple**: Begin with core types, expand as needed
- **Document**: Maintain ontology documentation
- **Versioning**: Track ontology changes over time

### 4. Data Quality

- **Validation**: Enforce constraints on entity types
- **Provenance**: Track data sources
- **Confidence Scores**: Indicate certainty of facts

## Use Case Implementation

### Complete Example: Academic Knowledge Graph

```gql
-- Create research entities
CREATE GRAPH AcademicKnowledgeGraph;
USE AcademicKnowledgeGraph;

-- Authors
CREATE
  (:Person {id: 'p1', name: 'Dr. Alice Johnson', field: 'Machine Learning'}),
  (:Person {id: 'p2', name: 'Prof. Bob Smith', field: 'Graph Theory'}),
  (:Person {id: 'p3', name: 'Dr. Carol White', field: 'Databases'});

-- Papers
CREATE
  (:Paper {id: 'paper1', title: 'Graph Neural Networks', year: 2022, citations: 150}),
  (:Paper {id: 'paper2', title: 'Knowledge Graph Embeddings', year: 2023, citations: 75}),
  (:Paper {id: 'paper3', title: 'Scalable Graph Databases', year: 2021, citations: 200});

-- Topics
CREATE
  (:Topic {id: 't1', name: 'Graph Neural Networks'}),
  (:Topic {id: 't2', name: 'Knowledge Graphs'}),
  (:Topic {id: 't3', name: 'Graph Databases'});

-- Authorship
MATCH (p1:Person {id: 'p1'}), (paper1:Paper {id: 'paper1'})
CREATE (p1)-[:AUTHORED {contribution: 'primary'}]->(paper1);

MATCH (p2:Person {id: 'p2'}), (paper1:Paper {id: 'paper1'})
CREATE (p2)-[:AUTHORED {contribution: 'secondary'}]->(paper1);

-- Topics
MATCH (paper1:Paper {id: 'paper1'}), (t1:Topic {id: 't1'})
CREATE (paper1)-[:ABOUT]->(t1);

-- Find related researchers
MATCH (p1:Person)-[:AUTHORED]->(paper1:Paper)-[:ABOUT]->(topic:Topic),
      (topic)<-[:ABOUT]-(paper2:Paper)<-[:AUTHORED]-(p2:Person)
WHERE p1 <> p2
RETURN p1.name, p2.name, collect(DISTINCT topic.name) AS common_topics,
       count(DISTINCT topic) AS topic_overlap
ORDER BY topic_overlap DESC;
```

## Next Steps

- [Graph Algorithms](/docs/analytics/graph-algorithms/) - Analyze knowledge graph structure
- [Vector Search Tutorial](/docs/tutorials/vector-search-tutorial/) - Semantic similarity with embeddings
- [Full-Text Search](/docs/query/indexing-and-optimization/) - BM25 ranking for text queries
- [Real-Time Analytics](/docs/analytics/real-time-analytics/) - Streaming knowledge graph updates

## References

- [Data Model Guide](/docs/model/data-model-and-types/) - Property graph concepts
- [GQL Guide](/docs/gql/guide/) - Query language reference
- [Indexing Guide](/docs/query/indexing-and-optimization/) - Performance optimization
- [Migration Guide](/docs/guides/migration-guide/) - Import from RDF/Neo4j

---

**License**: Apache License 2.0
**Copyright**: 2024-2025 CodePros
**Last Updated**: January 2026
