---
title: "Knowledge Graph Guide"
slug: "knowledge-graph"
description: "Build and query knowledge graphs with Geode - ontology design, entity modeling, inference, and NLP integration"
weight: 62
tags: ["knowledge-graph", "ontology", "entities", "inference", "nlp", "semantic"]
categories: ["guides", "use-cases"]
keywords:
  - knowledge graph
  - ontology design
  - entity extraction
  - semantic search
  - NLP integration
  - Geode knowledge base
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Knowledge Graph Guide

This guide demonstrates how to build and query knowledge graphs using Geode. You'll learn ontology design, entity-relationship modeling, inference patterns, and integration with NLP systems.

## Overview

Knowledge graphs represent real-world entities and their relationships in a structured format that machines can process. They power:

- **Semantic search** - Find answers, not just documents
- **Question answering** - Natural language queries over structured data
- **Data integration** - Connect disparate data sources
- **Recommendation** - Context-aware suggestions
- **AI/ML features** - Graph embeddings and reasoning

Geode's property graph model is ideal for knowledge graphs because it naturally represents entities as nodes and relationships as edges with rich attributes.

## Ontology Design

### Core Concepts

An ontology defines the types of entities and relationships in your knowledge graph.

```gql
// Entity types (classes)
(:Entity {
  id: STRING,
  name: STRING,
  description: STRING,
  aliases: LIST<STRING>,
  source: STRING,
  confidence: FLOAT,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
})

// Specific entity types (subclasses)
(:Person:Entity {
  birth_date: DATE,
  death_date: DATE,
  nationality: STRING,
  occupation: LIST<STRING>,
  gender: STRING
})

(:Organization:Entity {
  founded_date: DATE,
  dissolved_date: DATE,
  org_type: STRING,      // "company", "nonprofit", "government"
  industry: STRING,
  headquarters: STRING
})

(:Location:Entity {
  coordinates: POINT,
  location_type: STRING, // "city", "country", "building"
  population: INTEGER,
  area_km2: FLOAT
})

(:Concept:Entity {
  definition: STRING,
  domain: STRING
})

(:Event:Entity {
  start_date: DATE,
  end_date: DATE,
  event_type: STRING
})

(:Product:Entity {
  release_date: DATE,
  product_type: STRING,
  manufacturer: STRING
})
```

### Relationship Types

```gql
// Person relationships
(:Person)-[:BORN_IN {date: DATE}]->(:Location)
(:Person)-[:DIED_IN {date: DATE}]->(:Location)
(:Person)-[:WORKS_FOR {start_date: DATE, end_date: DATE, role: STRING}]->(:Organization)
(:Person)-[:FOUNDED {date: DATE}]->(:Organization)
(:Person)-[:EDUCATED_AT {degree: STRING, field: STRING, year: INTEGER}]->(:Organization)
(:Person)-[:MARRIED_TO {start_date: DATE, end_date: DATE}]->(:Person)
(:Person)-[:PARENT_OF]->(:Person)
(:Person)-[:KNOWS]->(:Person)
(:Person)-[:AUTHORED]->(:CreativeWork)
(:Person)-[:PARTICIPATED_IN {role: STRING}]->(:Event)

// Organization relationships
(:Organization)-[:HEADQUARTERED_IN]->(:Location)
(:Organization)-[:SUBSIDIARY_OF]->(:Organization)
(:Organization)-[:PARTNER_OF]->(:Organization)
(:Organization)-[:EMPLOYS {count: INTEGER}]->(:Person)
(:Organization)-[:PRODUCES]->(:Product)
(:Organization)-[:PARTICIPATED_IN {role: STRING}]->(:Event)

// Location relationships
(:Location)-[:LOCATED_IN]->(:Location)
(:Location)-[:BORDERS]->(:Location)
(:Location)-[:CAPITAL_OF]->(:Location)

// Concept relationships
(:Concept)-[:SUBCLASS_OF]->(:Concept)
(:Concept)-[:RELATED_TO]->(:Concept)
(:Entity)-[:INSTANCE_OF]->(:Concept)

// Event relationships
(:Event)-[:OCCURRED_IN]->(:Location)
(:Event)-[:CAUSED]->(:Event)
(:Event)-[:PRECEDED]->(:Event)
```

### Schema Setup

```gql
// Constraints
CREATE CONSTRAINT entity_id_unique ON :Entity(id) ASSERT UNIQUE

// Indexes for search
CREATE INDEX entity_name ON :Entity(name)
CREATE INDEX entity_aliases ON :Entity(aliases)
CREATE INDEX person_name ON :Person(name)
CREATE INDEX organization_name ON :Organization(name)
CREATE INDEX location_name ON :Location(name)
CREATE INDEX concept_name ON :Concept(name)

// Full-text search index
CREATE INDEX entity_search ON :Entity(name, description, aliases) USING fulltext
```

## Entity-Relationship Modeling

### Creating Entities

{{< tabs >}}
{{< tab "GQL" >}}

```gql
// Create a person entity
CREATE (p:Person:Entity {
  id: $id,
  name: $name,
  description: $description,
  aliases: $aliases,
  birth_date: date($birth_date),
  nationality: $nationality,
  occupation: $occupation,
  source: $source,
  confidence: $confidence,
  created_at: timestamp()
})
RETURN p
```

{{< /tab >}}
{{< tab "Go" >}}

```go
package main

import (
    "context"
    "database/sql"
    "log"
    "github.com/google/uuid"
    _ "geodedb.com/geode"
)

type Entity struct {
    ID          string
    Name        string
    Description string
    Aliases     []string
    Source      string
    Confidence  float64
}

type Person struct {
    Entity
    BirthDate   string
    Nationality string
    Occupation  []string
}

func CreatePerson(ctx context.Context, db *sql.DB, person Person) (string, error) {
    person.ID = uuid.New().String()

    _, err := db.ExecContext(ctx, `
        CREATE (p:Person:Entity {
            id: ?,
            name: ?,
            description: ?,
            aliases: ?,
            birth_date: date(?),
            nationality: ?,
            occupation: ?,
            source: ?,
            confidence: ?,
            created_at: timestamp()
        })
    `, person.ID, person.Name, person.Description, person.Aliases,
       person.BirthDate, person.Nationality, person.Occupation,
       person.Source, person.Confidence)

    return person.ID, err
}

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()

    id, err := CreatePerson(ctx, db, Person{
        Entity: Entity{
            Name:        "Marie Curie",
            Description: "Polish-French physicist and chemist",
            Aliases:     []string{"Maria Sklodowska", "Madame Curie"},
            Source:      "wikipedia",
            Confidence:  0.99,
        },
        BirthDate:   "1867-11-07",
        Nationality: "Polish-French",
        Occupation:  []string{"physicist", "chemist"},
    })
    if err != nil {
        log.Fatal(err)
    }

    log.Printf("Created person: %s", id)
}
```

{{< /tab >}}
{{< tab "Python" >}}

```python
import asyncio
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import date
from uuid import uuid4
from geode_client import Client

@dataclass
class Entity:
    id: str = ""
    name: str = ""
    description: str = ""
    aliases: List[str] = field(default_factory=list)
    source: str = ""
    confidence: float = 1.0

@dataclass
class Person(Entity):
    birth_date: Optional[date] = None
    death_date: Optional[date] = None
    nationality: str = ""
    occupation: List[str] = field(default_factory=list)

async def create_person(client, person: Person) -> str:
    """Create a person entity in the knowledge graph."""
    person.id = str(uuid4())

    async with client.connection() as conn:
        await conn.execute("""
            CREATE (p:Person:Entity {
                id: $id,
                name: $name,
                description: $description,
                aliases: $aliases,
                birth_date: date($birth_date),
                nationality: $nationality,
                occupation: $occupation,
                source: $source,
                confidence: $confidence,
                created_at: timestamp()
            })
        """, {
            "id": person.id,
            "name": person.name,
            "description": person.description,
            "aliases": person.aliases,
            "birth_date": person.birth_date.isoformat() if person.birth_date else None,
            "nationality": person.nationality,
            "occupation": person.occupation,
            "source": person.source,
            "confidence": person.confidence
        })

    return person.id

async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)

    person_id = await create_person(client, Person(
        name="Marie Curie",
        description="Polish-French physicist and chemist",
        aliases=["Maria Sklodowska", "Madame Curie"],
        birth_date=date(1867, 11, 7),
        nationality="Polish-French",
        occupation=["physicist", "chemist"],
        source="wikipedia",
        confidence=0.99
    ))

    print(f"Created person: {person_id}")

asyncio.run(main())
```

{{< /tab >}}
{{< tab "Rust" >}}

```rust
use geode_client::{Client, Value};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug)]
struct Person {
    id: String,
    name: String,
    description: String,
    aliases: Vec<String>,
    birth_date: String,
    nationality: String,
    occupation: Vec<String>,
    source: String,
    confidence: f64,
}

async fn create_person(
    conn: &mut geode_client::Connection,
    person: &mut Person,
) -> Result<String, Box<dyn std::error::Error>> {
    person.id = Uuid::new_v4().to_string();

    let mut params = HashMap::new();
    params.insert("id".to_string(), Value::string(&person.id));
    params.insert("name".to_string(), Value::string(&person.name));
    params.insert("description".to_string(), Value::string(&person.description));
    params.insert("aliases".to_string(), Value::list(
        person.aliases.iter().map(|a| Value::string(a)).collect()
    ));
    params.insert("birth_date".to_string(), Value::string(&person.birth_date));
    params.insert("nationality".to_string(), Value::string(&person.nationality));
    params.insert("occupation".to_string(), Value::list(
        person.occupation.iter().map(|o| Value::string(o)).collect()
    ));
    params.insert("source".to_string(), Value::string(&person.source));
    params.insert("confidence".to_string(), Value::float(person.confidence));

    conn.query_with_params(r#"
        CREATE (p:Person:Entity {
            id: $id,
            name: $name,
            description: $description,
            aliases: $aliases,
            birth_date: date($birth_date),
            nationality: $nationality,
            occupation: $occupation,
            source: $source,
            confidence: $confidence,
            created_at: timestamp()
        })
    "#, &params).await?;

    Ok(person.id.clone())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    let mut person = Person {
        id: String::new(),
        name: "Marie Curie".to_string(),
        description: "Polish-French physicist and chemist".to_string(),
        aliases: vec!["Maria Sklodowska".to_string(), "Madame Curie".to_string()],
        birth_date: "1867-11-07".to_string(),
        nationality: "Polish-French".to_string(),
        occupation: vec!["physicist".to_string(), "chemist".to_string()],
        source: "wikipedia".to_string(),
        confidence: 0.99,
    };

    let id = create_person(&mut conn, &mut person).await?;
    println!("Created person: {}", id);

    Ok(())
}
```

{{< /tab >}}
{{< tab "Node.js" >}}

```typescript
import { createClient, Client } from '@geodedb/client';
import { v4 as uuidv4 } from 'uuid';

interface Entity {
  id: string;
  name: string;
  description: string;
  aliases: string[];
  source: string;
  confidence: number;
}

interface Person extends Entity {
  birthDate?: string;
  deathDate?: string;
  nationality: string;
  occupation: string[];
}

async function createPerson(client: Client, person: Partial<Person>): Promise<string> {
  const id = uuidv4();

  await client.exec(`
    CREATE (p:Person:Entity {
      id: $id,
      name: $name,
      description: $description,
      aliases: $aliases,
      birth_date: date($birth_date),
      nationality: $nationality,
      occupation: $occupation,
      source: $source,
      confidence: $confidence,
      created_at: timestamp()
    })
  `, {
    params: {
      id,
      name: person.name,
      description: person.description,
      aliases: person.aliases || [],
      birth_date: person.birthDate,
      nationality: person.nationality,
      occupation: person.occupation || [],
      source: person.source,
      confidence: person.confidence || 1.0
    }
  });

  return id;
}

async function main() {
  const client = await createClient('quic://localhost:3141');

  const personId = await createPerson(client, {
    name: 'Marie Curie',
    description: 'Polish-French physicist and chemist',
    aliases: ['Maria Sklodowska', 'Madame Curie'],
    birthDate: '1867-11-07',
    nationality: 'Polish-French',
    occupation: ['physicist', 'chemist'],
    source: 'wikipedia',
    confidence: 0.99
  });

  console.log(`Created person: ${personId}`);
  await client.close();
}

main();
```

{{< /tab >}}
{{< tab "Zig" >}}

```zig
const std = @import("std");
const geode = @import("geode_client");
const uuid = @import("uuid");

const Person = struct {
    id: []const u8,
    name: []const u8,
    description: []const u8,
    aliases: []const []const u8,
    birth_date: []const u8,
    nationality: []const u8,
    occupation: []const []const u8,
    source: []const u8,
    confidence: f64,
};

pub fn createPerson(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
    person: *Person,
) ![]const u8 {
    const id = uuid.v4();
    person.id = &id;

    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();

    try params.put("id", .{ .string = &id });
    try params.put("name", .{ .string = person.name });
    try params.put("description", .{ .string = person.description });
    // ... add other parameters

    try client.sendRunGql(1,
        \\CREATE (p:Person:Entity {
        \\    id: $id,
        \\    name: $name,
        \\    description: $description,
        \\    aliases: $aliases,
        \\    birth_date: date($birth_date),
        \\    nationality: $nationality,
        \\    occupation: $occupation,
        \\    source: $source,
        \\    confidence: $confidence,
        \\    created_at: timestamp()
        \\})
    , .{ .object = params });

    _ = try client.receiveMessage(30000);

    return &id;
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.sendHello("knowledge-graph", "1.0.0");
    _ = try client.receiveMessage(30000);

    var person = Person{
        .id = "",
        .name = "Marie Curie",
        .description = "Polish-French physicist and chemist",
        .aliases = &[_][]const u8{ "Maria Sklodowska", "Madame Curie" },
        .birth_date = "1867-11-07",
        .nationality = "Polish-French",
        .occupation = &[_][]const u8{ "physicist", "chemist" },
        .source = "wikipedia",
        .confidence = 0.99,
    };

    const id = try createPerson(&client, allocator, &person);
    std.debug.print("Created person: {s}\n", .{id});
}
```

{{< /tab >}}
{{< /tabs >}}

### Creating Relationships

```gql
// Link entities with relationships
MATCH (marie:Person {name: "Marie Curie"})
MATCH (sorbonne:Organization {name: "University of Paris"})
CREATE (marie)-[:EDUCATED_AT {
  degree: "PhD",
  field: "Physics",
  year: 1903
}]->(sorbonne)

MATCH (marie:Person {name: "Marie Curie"})
MATCH (poland:Location {name: "Poland"})
CREATE (marie)-[:BORN_IN {date: date('1867-11-07')}]->(poland)

MATCH (marie:Person {name: "Marie Curie"})
MATCH (pierre:Person {name: "Pierre Curie"})
CREATE (marie)-[:MARRIED_TO {
  start_date: date('1895-07-26'),
  end_date: date('1906-04-19')
}]->(pierre)
```

### Extracting Entity Relationships

```gql
// Find all relationships for an entity
MATCH (e:Entity {id: $entity_id})-[r]->(related:Entity)
RETURN
  type(r) AS relationship_type,
  properties(r) AS relationship_properties,
  related.id AS related_id,
  related.name AS related_name,
  labels(related) AS related_types
ORDER BY relationship_type

// Find incoming relationships
UNION

MATCH (e:Entity {id: $entity_id})<-[r]-(related:Entity)
RETURN
  type(r) AS relationship_type,
  properties(r) AS relationship_properties,
  related.id AS related_id,
  related.name AS related_name,
  labels(related) AS related_types
ORDER BY relationship_type
```

## Inference Patterns

### Type Inference

```gql
// Infer nationality from birthplace
MATCH (p:Person)-[:BORN_IN]->(loc:Location)-[:LOCATED_IN*0..3]->(country:Location {location_type: 'country'})
WHERE p.nationality IS NULL
SET p.inferred_nationality = country.name
RETURN p.name, p.inferred_nationality
```

### Transitive Relationships

```gql
// Find all ancestors (transitive closure)
MATCH (person:Person {id: $person_id})
MATCH path = (person)<-[:PARENT_OF*]-(ancestor:Person)
RETURN ancestor.name, length(path) AS generations
ORDER BY generations

// Find organizational hierarchy
MATCH (org:Organization {id: $org_id})
MATCH path = (org)-[:SUBSIDIARY_OF*]->(parent:Organization)
RETURN parent.name, length(path) AS levels
ORDER BY levels
```

### Relationship Inference

```gql
// Infer sibling relationships
MATCH (p1:Person)<-[:PARENT_OF]-(parent:Person)-[:PARENT_OF]->(p2:Person)
WHERE p1 <> p2
  AND NOT (p1)-[:SIBLING_OF]-(p2)
MERGE (p1)-[:SIBLING_OF {inferred: true}]-(p2)
RETURN p1.name, p2.name

// Infer colleague relationships
MATCH (p1:Person)-[:WORKS_FOR]->(org:Organization)<-[:WORKS_FOR]-(p2:Person)
WHERE p1 <> p2
  AND NOT (p1)-[:COLLEAGUE_OF]-(p2)
MERGE (p1)-[:COLLEAGUE_OF {
  inferred: true,
  via_organization: org.name
}]-(p2)
```

### Temporal Inference

```gql
// Infer if person was alive during event
MATCH (person:Person), (event:Event)
WHERE person.birth_date <= event.start_date
  AND (person.death_date IS NULL OR person.death_date >= event.start_date)
MERGE (person)-[:CONTEMPORARY_WITH {inferred: true}]->(event)
RETURN person.name, event.name
```

## Question Answering Queries

### Simple Factual Queries

```gql
// "Where was Marie Curie born?"
MATCH (p:Person {name: "Marie Curie"})-[:BORN_IN]->(location:Location)
RETURN location.name AS answer

// "Who founded Microsoft?"
MATCH (p:Person)-[:FOUNDED]->(org:Organization {name: "Microsoft"})
RETURN p.name AS founder

// "When did World War II start?"
MATCH (e:Event {name: "World War II"})
RETURN e.start_date AS start_date
```

{{< tabs >}}
{{< tab "Go" >}}

```go
type Answer struct {
    Value      interface{}
    Confidence float64
    Source     string
}

func AnswerQuestion(ctx context.Context, db *sql.DB, question string) (*Answer, error) {
    // Pattern matching for question types
    // This would typically use NLP to parse the question

    // Example: "Where was X born?"
    if strings.Contains(question, "born") {
        // Extract entity name from question
        entityName := extractEntityName(question)

        row := db.QueryRowContext(ctx, `
            MATCH (p:Person {name: ?})-[:BORN_IN]->(location:Location)
            RETURN location.name AS answer, p.confidence AS confidence, p.source AS source
        `, entityName)

        var answer Answer
        err := row.Scan(&answer.Value, &answer.Confidence, &answer.Source)
        if err != nil {
            return nil, err
        }
        return &answer, nil
    }

    // Add more question patterns...
    return nil, fmt.Errorf("could not understand question")
}
```

{{< /tab >}}
{{< tab "Python" >}}

```python
from dataclasses import dataclass
from typing import Any, Optional
import re

@dataclass
class Answer:
    value: Any
    confidence: float
    source: str
    explanation: Optional[str] = None

async def answer_question(client, question: str) -> Optional[Answer]:
    """Answer a natural language question using the knowledge graph."""

    # Pattern: "Where was X born?"
    born_match = re.match(r"[Ww]here was (.+?) born\??", question)
    if born_match:
        entity_name = born_match.group(1)
        async with client.connection() as conn:
            result, _ = await conn.query("""
                MATCH (p:Person {name: $name})-[:BORN_IN]->(location:Location)
                RETURN location.name AS answer, p.confidence AS confidence, p.source AS source
            """, {"name": entity_name})

            if result.rows:
                row = result.rows[0]
                return Answer(
                    value=row['answer'].as_string,
                    confidence=row['confidence'].as_float,
                    source=row['source'].as_string,
                    explanation=f"{entity_name} was born in {row['answer'].as_string}"
                )

    # Pattern: "Who founded X?"
    founded_match = re.match(r"[Ww]ho founded (.+?)\??", question)
    if founded_match:
        org_name = founded_match.group(1)
        async with client.connection() as conn:
            result, _ = await conn.query("""
                MATCH (p:Person)-[:FOUNDED]->(org:Organization {name: $name})
                RETURN p.name AS answer, p.confidence AS confidence, p.source AS source
            """, {"name": org_name})

            if result.rows:
                row = result.rows[0]
                return Answer(
                    value=row['answer'].as_string,
                    confidence=row['confidence'].as_float,
                    source=row['source'].as_string,
                    explanation=f"{row['answer'].as_string} founded {org_name}"
                )

    # Pattern: "What is the capital of X?"
    capital_match = re.match(r"[Ww]hat is the capital of (.+?)\??", question)
    if capital_match:
        country_name = capital_match.group(1)
        async with client.connection() as conn:
            result, _ = await conn.query("""
                MATCH (capital:Location)-[:CAPITAL_OF]->(country:Location {name: $name})
                RETURN capital.name AS answer
            """, {"name": country_name})

            if result.rows:
                return Answer(
                    value=result.rows[0]['answer'].as_string,
                    confidence=1.0,
                    source="knowledge_graph",
                    explanation=f"The capital of {country_name} is {result.rows[0]['answer'].as_string}"
                )

    return None

async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)

    questions = [
        "Where was Marie Curie born?",
        "Who founded Microsoft?",
        "What is the capital of France?"
    ]

    for q in questions:
        answer = await answer_question(client, q)
        if answer:
            print(f"Q: {q}")
            print(f"A: {answer.value} (confidence: {answer.confidence})")
            print()
```

{{< /tab >}}
{{< tab "Rust" >}}

```rust
use regex::Regex;

#[derive(Debug)]
struct Answer {
    value: String,
    confidence: f64,
    source: String,
    explanation: Option<String>,
}

async fn answer_question(
    conn: &mut geode_client::Connection,
    question: &str,
) -> Result<Option<Answer>, Box<dyn std::error::Error>> {
    // Pattern: "Where was X born?"
    let born_re = Regex::new(r"[Ww]here was (.+?) born\??")?;
    if let Some(caps) = born_re.captures(question) {
        let entity_name = &caps[1];
        let mut params = HashMap::new();
        params.insert("name".to_string(), Value::string(entity_name));

        let (page, _) = conn.query_with_params(r#"
            MATCH (p:Person {name: $name})-[:BORN_IN]->(location:Location)
            RETURN location.name AS answer, p.confidence AS confidence, p.source AS source
        "#, &params).await?;

        if let Some(row) = page.rows.first() {
            return Ok(Some(Answer {
                value: row.get("answer").unwrap().as_string()?,
                confidence: row.get("confidence").unwrap().as_float()?,
                source: row.get("source").unwrap().as_string()?,
                explanation: Some(format!("{} was born in {}",
                    entity_name, row.get("answer").unwrap().as_string()?)),
            }));
        }
    }

    // Pattern: "Who founded X?"
    let founded_re = Regex::new(r"[Ww]ho founded (.+?)\??")?;
    if let Some(caps) = founded_re.captures(question) {
        let org_name = &caps[1];
        let mut params = HashMap::new();
        params.insert("name".to_string(), Value::string(org_name));

        let (page, _) = conn.query_with_params(r#"
            MATCH (p:Person)-[:FOUNDED]->(org:Organization {name: $name})
            RETURN p.name AS answer, p.confidence AS confidence, p.source AS source
        "#, &params).await?;

        if let Some(row) = page.rows.first() {
            return Ok(Some(Answer {
                value: row.get("answer").unwrap().as_string()?,
                confidence: row.get("confidence").unwrap().as_float()?,
                source: row.get("source").unwrap().as_string()?,
                explanation: Some(format!("{} founded {}",
                    row.get("answer").unwrap().as_string()?, org_name)),
            }));
        }
    }

    Ok(None)
}
```

{{< /tab >}}
{{< tab "Node.js" >}}

```typescript
interface Answer {
  value: string;
  confidence: number;
  source: string;
  explanation?: string;
}

async function answerQuestion(client: Client, question: string): Promise<Answer | null> {
  // Pattern: "Where was X born?"
  const bornMatch = question.match(/[Ww]here was (.+?) born\??/);
  if (bornMatch) {
    const entityName = bornMatch[1];
    const rows = await client.queryAll(`
      MATCH (p:Person {name: $name})-[:BORN_IN]->(location:Location)
      RETURN location.name AS answer, p.confidence AS confidence, p.source AS source
    `, { params: { name: entityName } });

    if (rows.length > 0) {
      const row = rows[0];
      return {
        value: row.get('answer')?.asString ?? '',
        confidence: row.get('confidence')?.asNumber ?? 0,
        source: row.get('source')?.asString ?? '',
        explanation: `${entityName} was born in ${row.get('answer')?.asString}`
      };
    }
  }

  // Pattern: "Who founded X?"
  const foundedMatch = question.match(/[Ww]ho founded (.+?)\??/);
  if (foundedMatch) {
    const orgName = foundedMatch[1];
    const rows = await client.queryAll(`
      MATCH (p:Person)-[:FOUNDED]->(org:Organization {name: $name})
      RETURN p.name AS answer, p.confidence AS confidence, p.source AS source
    `, { params: { name: orgName } });

    if (rows.length > 0) {
      const row = rows[0];
      return {
        value: row.get('answer')?.asString ?? '',
        confidence: row.get('confidence')?.asNumber ?? 0,
        source: row.get('source')?.asString ?? '',
        explanation: `${row.get('answer')?.asString} founded ${orgName}`
      };
    }
  }

  return null;
}
```

{{< /tab >}}
{{< tab "Zig" >}}

```zig
const Answer = struct {
    value: []const u8,
    confidence: f64,
    source: []const u8,
    explanation: ?[]const u8,
};

pub fn answerQuestion(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
    question: []const u8,
) !?Answer {
    // Pattern matching for "Where was X born?"
    if (std.mem.indexOf(u8, question, "born")) |_| {
        // Extract entity name (simplified)
        const entity_name = extractEntityName(question);

        var params = std.json.ObjectMap.init(allocator);
        defer params.deinit();
        try params.put("name", .{ .string = entity_name });

        try client.sendRunGql(1,
            \\MATCH (p:Person {name: $name})-[:BORN_IN]->(location:Location)
            \\RETURN location.name AS answer, p.confidence AS confidence, p.source AS source
        , .{ .object = params });

        _ = try client.receiveMessage(30000);
        try client.sendPull(1, 1);
        const result = try client.receiveMessage(30000);
        defer allocator.free(result);

        // Parse result and return Answer
        // ...
    }

    return null;
}
```

{{< /tab >}}
{{< /tabs >}}

### Complex Queries

```gql
// "What scientists won Nobel Prizes in Physics?"
MATCH (p:Person)-[:RECEIVED]->(award:Award {name: "Nobel Prize in Physics"})
WHERE "scientist" IN p.occupation OR "physicist" IN p.occupation
RETURN p.name AS scientist, award.year AS year
ORDER BY award.year

// "Which companies were founded by Stanford graduates?"
MATCH (founder:Person)-[:EDUCATED_AT]->(:Organization {name: "Stanford University"})
MATCH (founder)-[:FOUNDED]->(company:Organization)
RETURN founder.name AS founder, company.name AS company, company.founded_date

// "Find all connections between Einstein and Curie"
MATCH path = shortestPath(
  (einstein:Person {name: "Albert Einstein"})-[*..5]-(curie:Person {name: "Marie Curie"})
)
RETURN path

// "What events did Marie Curie participate in?"
MATCH (marie:Person {name: "Marie Curie"})-[r:PARTICIPATED_IN]->(event:Event)
RETURN event.name, r.role, event.start_date
ORDER BY event.start_date
```

### Path-Based Queries

```gql
// Find how two entities are connected
MATCH (e1:Entity {id: $entity1_id}), (e2:Entity {id: $entity2_id})
MATCH path = shortestPath((e1)-[*..6]-(e2))
RETURN [node IN nodes(path) | node.name] AS entity_names,
       [rel IN relationships(path) | type(rel)] AS relationship_types,
       length(path) AS path_length

// Find all paths between entities
MATCH (e1:Entity {id: $entity1_id}), (e2:Entity {id: $entity2_id})
MATCH path = (e1)-[*..4]-(e2)
WHERE ALL(n IN nodes(path) WHERE n:Entity)
RETURN path
LIMIT 10
```

## NLP Integration

### Entity Extraction Pipeline

```gql
// Store extracted entities from NLP
CREATE (mention:Mention {
  id: $mention_id,
  text: $surface_form,
  document_id: $document_id,
  start_offset: $start_offset,
  end_offset: $end_offset,
  confidence: $confidence
})

// Link to resolved entity
MATCH (mention:Mention {id: $mention_id})
MATCH (entity:Entity {id: $entity_id})
CREATE (mention)-[:REFERS_TO {
  confidence: $linking_confidence,
  method: $linking_method
}]->(entity)
```

{{< tabs >}}
{{< tab "Go" >}}

```go
type EntityMention struct {
    ID         string
    Text       string
    DocumentID string
    StartOffset int
    EndOffset   int
    Confidence  float64
    EntityID    string  // Resolved entity
    LinkingConf float64
}

func StoreEntityMentions(ctx context.Context, db *sql.DB, mentions []EntityMention) error {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    for _, m := range mentions {
        // Create mention node
        _, err = tx.ExecContext(ctx, `
            CREATE (mention:Mention {
                id: ?,
                text: ?,
                document_id: ?,
                start_offset: ?,
                end_offset: ?,
                confidence: ?
            })
        `, m.ID, m.Text, m.DocumentID, m.StartOffset, m.EndOffset, m.Confidence)
        if err != nil {
            return err
        }

        // Link to entity if resolved
        if m.EntityID != "" {
            _, err = tx.ExecContext(ctx, `
                MATCH (mention:Mention {id: ?})
                MATCH (entity:Entity {id: ?})
                CREATE (mention)-[:REFERS_TO {
                    confidence: ?,
                    method: 'nlp_extraction'
                }]->(entity)
            `, m.ID, m.EntityID, m.LinkingConf)
            if err != nil {
                return err
            }
        }
    }

    return tx.Commit()
}
```

{{< /tab >}}
{{< tab "Python" >}}

```python
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class EntityMention:
    id: str
    text: str
    document_id: str
    start_offset: int
    end_offset: int
    confidence: float
    entity_id: Optional[str] = None
    linking_confidence: float = 0.0

async def store_entity_mentions(client, mentions: List[EntityMention]) -> None:
    """Store NLP-extracted entity mentions in the knowledge graph."""
    async with client.connection() as conn:
        await conn.begin()

        try:
            for mention in mentions:
                # Create mention node
                await conn.execute("""
                    CREATE (mention:Mention {
                        id: $id,
                        text: $text,
                        document_id: $document_id,
                        start_offset: $start_offset,
                        end_offset: $end_offset,
                        confidence: $confidence
                    })
                """, {
                    "id": mention.id,
                    "text": mention.text,
                    "document_id": mention.document_id,
                    "start_offset": mention.start_offset,
                    "end_offset": mention.end_offset,
                    "confidence": mention.confidence
                })

                # Link to resolved entity
                if mention.entity_id:
                    await conn.execute("""
                        MATCH (mention:Mention {id: $mention_id})
                        MATCH (entity:Entity {id: $entity_id})
                        CREATE (mention)-[:REFERS_TO {
                            confidence: $linking_confidence,
                            method: 'nlp_extraction'
                        }]->(entity)
                    """, {
                        "mention_id": mention.id,
                        "entity_id": mention.entity_id,
                        "linking_confidence": mention.linking_confidence
                    })

            await conn.commit()

        except Exception as e:
            await conn.rollback()
            raise e

# Example: Integration with spaCy
import spacy

async def extract_and_store_entities(client, document_id: str, text: str):
    """Extract entities from text using spaCy and store in knowledge graph."""
    nlp = spacy.load("en_core_web_lg")
    doc = nlp(text)

    mentions = []
    for ent in doc.ents:
        mention_id = str(uuid4())

        # Try to link to existing entity
        entity_id = await find_matching_entity(client, ent.text, ent.label_)

        mentions.append(EntityMention(
            id=mention_id,
            text=ent.text,
            document_id=document_id,
            start_offset=ent.start_char,
            end_offset=ent.end_char,
            confidence=0.9,  # spaCy confidence
            entity_id=entity_id,
            linking_confidence=0.8 if entity_id else 0.0
        ))

    await store_entity_mentions(client, mentions)
    return mentions

async def find_matching_entity(client, text: str, entity_type: str) -> Optional[str]:
    """Find matching entity in knowledge graph."""
    label_mapping = {
        "PERSON": "Person",
        "ORG": "Organization",
        "GPE": "Location",
        "LOC": "Location"
    }

    kg_label = label_mapping.get(entity_type)
    if not kg_label:
        return None

    async with client.connection() as conn:
        result, _ = await conn.query(f"""
            MATCH (e:{kg_label})
            WHERE e.name = $name OR $name IN e.aliases
            RETURN e.id AS id
            LIMIT 1
        """, {"name": text})

        if result.rows:
            return result.rows[0]['id'].as_string

    return None
```

{{< /tab >}}
{{< tab "Rust" >}}

```rust
#[derive(Debug)]
struct EntityMention {
    id: String,
    text: String,
    document_id: String,
    start_offset: i64,
    end_offset: i64,
    confidence: f64,
    entity_id: Option<String>,
    linking_confidence: f64,
}

async fn store_entity_mentions(
    conn: &mut geode_client::Connection,
    mentions: &[EntityMention],
) -> Result<(), Box<dyn std::error::Error>> {
    conn.begin().await?;

    for mention in mentions {
        // Create mention node
        let mut params = HashMap::new();
        params.insert("id".to_string(), Value::string(&mention.id));
        params.insert("text".to_string(), Value::string(&mention.text));
        params.insert("document_id".to_string(), Value::string(&mention.document_id));
        params.insert("start_offset".to_string(), Value::int(mention.start_offset));
        params.insert("end_offset".to_string(), Value::int(mention.end_offset));
        params.insert("confidence".to_string(), Value::float(mention.confidence));

        conn.query_with_params(r#"
            CREATE (mention:Mention {
                id: $id,
                text: $text,
                document_id: $document_id,
                start_offset: $start_offset,
                end_offset: $end_offset,
                confidence: $confidence
            })
        "#, &params).await?;

        // Link to entity if resolved
        if let Some(ref entity_id) = mention.entity_id {
            let mut link_params = HashMap::new();
            link_params.insert("mention_id".to_string(), Value::string(&mention.id));
            link_params.insert("entity_id".to_string(), Value::string(entity_id));
            link_params.insert("linking_confidence".to_string(), Value::float(mention.linking_confidence));

            conn.query_with_params(r#"
                MATCH (mention:Mention {id: $mention_id})
                MATCH (entity:Entity {id: $entity_id})
                CREATE (mention)-[:REFERS_TO {
                    confidence: $linking_confidence,
                    method: 'nlp_extraction'
                }]->(entity)
            "#, &link_params).await?;
        }
    }

    conn.commit().await?;
    Ok(())
}
```

{{< /tab >}}
{{< tab "Node.js" >}}

```typescript
interface EntityMention {
  id: string;
  text: string;
  documentId: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
  entityId?: string;
  linkingConfidence?: number;
}

async function storeEntityMentions(client: Client, mentions: EntityMention[]): Promise<void> {
  await client.withTransaction(async (tx) => {
    for (const mention of mentions) {
      // Create mention node
      await tx.exec(`
        CREATE (mention:Mention {
          id: $id,
          text: $text,
          document_id: $document_id,
          start_offset: $start_offset,
          end_offset: $end_offset,
          confidence: $confidence
        })
      `, {
        params: {
          id: mention.id,
          text: mention.text,
          document_id: mention.documentId,
          start_offset: mention.startOffset,
          end_offset: mention.endOffset,
          confidence: mention.confidence
        }
      });

      // Link to entity if resolved
      if (mention.entityId) {
        await tx.exec(`
          MATCH (mention:Mention {id: $mention_id})
          MATCH (entity:Entity {id: $entity_id})
          CREATE (mention)-[:REFERS_TO {
            confidence: $linking_confidence,
            method: 'nlp_extraction'
          }]->(entity)
        `, {
          params: {
            mention_id: mention.id,
            entity_id: mention.entityId,
            linking_confidence: mention.linkingConfidence || 0
          }
        });
      }
    }
  });
}
```

{{< /tab >}}
{{< tab "Zig" >}}

```zig
const EntityMention = struct {
    id: []const u8,
    text: []const u8,
    document_id: []const u8,
    start_offset: i64,
    end_offset: i64,
    confidence: f64,
    entity_id: ?[]const u8,
    linking_confidence: f64,
};

pub fn storeEntityMentions(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
    mentions: []const EntityMention,
) !void {
    try client.sendBegin();
    _ = try client.receiveMessage(30000);

    for (mentions) |mention| {
        var params = std.json.ObjectMap.init(allocator);
        defer params.deinit();

        try params.put("id", .{ .string = mention.id });
        try params.put("text", .{ .string = mention.text });
        try params.put("document_id", .{ .string = mention.document_id });
        try params.put("start_offset", .{ .integer = mention.start_offset });
        try params.put("end_offset", .{ .integer = mention.end_offset });
        try params.put("confidence", .{ .float = mention.confidence });

        try client.sendRunGql(1,
            \\CREATE (mention:Mention {
            \\    id: $id,
            \\    text: $text,
            \\    document_id: $document_id,
            \\    start_offset: $start_offset,
            \\    end_offset: $end_offset,
            \\    confidence: $confidence
            \\})
        , .{ .object = params });
        _ = try client.receiveMessage(30000);

        if (mention.entity_id) |entity_id| {
            var link_params = std.json.ObjectMap.init(allocator);
            defer link_params.deinit();
            try link_params.put("mention_id", .{ .string = mention.id });
            try link_params.put("entity_id", .{ .string = entity_id });
            try link_params.put("linking_confidence", .{ .float = mention.linking_confidence });

            try client.sendRunGql(2,
                \\MATCH (mention:Mention {id: $mention_id})
                \\MATCH (entity:Entity {id: $entity_id})
                \\CREATE (mention)-[:REFERS_TO {
                \\    confidence: $linking_confidence,
                \\    method: 'nlp_extraction'
                \\}]->(entity)
            , .{ .object = link_params });
            _ = try client.receiveMessage(30000);
        }
    }

    try client.sendCommit();
    _ = try client.receiveMessage(30000);
}
```

{{< /tab >}}
{{< /tabs >}}

### Relation Extraction

```gql
// Store extracted relation
CREATE (rel:ExtractedRelation {
  id: $relation_id,
  subject_mention_id: $subject_mention_id,
  object_mention_id: $object_mention_id,
  relation_type: $relation_type,
  confidence: $confidence,
  document_id: $document_id,
  sentence: $sentence
})

// Link to mentions
MATCH (rel:ExtractedRelation {id: $relation_id})
MATCH (subject:Mention {id: $subject_mention_id})
MATCH (object:Mention {id: $object_mention_id})
CREATE (rel)-[:HAS_SUBJECT]->(subject)
CREATE (rel)-[:HAS_OBJECT]->(object)
```

## Knowledge Graph Population

### Import from Structured Data

```gql
// Import from CSV
LOAD CSV WITH HEADERS FROM 'file:///people.csv' AS row
CREATE (p:Person:Entity {
  id: row.id,
  name: row.name,
  description: row.description,
  birth_date: date(row.birth_date),
  nationality: row.nationality,
  source: 'csv_import',
  created_at: timestamp()
})

// Import relationships from CSV
LOAD CSV WITH HEADERS FROM 'file:///works_for.csv' AS row
MATCH (person:Person {id: row.person_id})
MATCH (org:Organization {id: row.org_id})
CREATE (person)-[:WORKS_FOR {
  start_date: date(row.start_date),
  end_date: CASE WHEN row.end_date IS NOT NULL THEN date(row.end_date) ELSE null END,
  role: row.role
}]->(org)
```

### Import from Wikidata

```gql
// Create entities from Wikidata SPARQL results
UNWIND $wikidata_results AS item
MERGE (e:Entity {wikidata_id: item.id})
ON CREATE SET
  e.id = uuid_v4(),
  e.name = item.label,
  e.description = item.description,
  e.aliases = item.aliases,
  e.source = 'wikidata',
  e.confidence = 1.0,
  e.created_at = timestamp()
ON MATCH SET
  e.name = item.label,
  e.description = item.description,
  e.updated_at = timestamp()

// Add appropriate label based on Wikidata type
WITH e, item
CALL {
  WITH e, item
  WHERE item.instance_of = 'Q5'  // human
  SET e:Person
  RETURN e
  UNION
  WITH e, item
  WHERE item.instance_of IN ['Q4830453', 'Q783794']  // company or types
  SET e:Organization
  RETURN e
  UNION
  WITH e, item
  WHERE item.instance_of IN ['Q515', 'Q6256']  // city or country
  SET e:Location
  RETURN e
}
RETURN count(e) AS imported_count
```

### Merge Duplicate Entities

```gql
// Find potential duplicates
MATCH (e1:Entity), (e2:Entity)
WHERE e1.name = e2.name
  AND id(e1) < id(e2)
  AND labels(e1) = labels(e2)
WITH e1, e2,
     CASE
       WHEN e1.source = 'wikidata' THEN e1
       WHEN e2.source = 'wikidata' THEN e2
       WHEN e1.confidence > e2.confidence THEN e1
       ELSE e2
     END AS keeper,
     CASE
       WHEN e1.source = 'wikidata' THEN e2
       WHEN e2.source = 'wikidata' THEN e1
       WHEN e1.confidence > e2.confidence THEN e2
       ELSE e1
     END AS duplicate

// Merge relationships from duplicate to keeper
MATCH (duplicate)-[r]-(other)
WHERE NOT other = keeper
WITH keeper, duplicate, r, other
CREATE (keeper)-[newRel:type(r)]->(other)
SET newRel = properties(r)

// Add duplicate's aliases to keeper
SET keeper.aliases = keeper.aliases + duplicate.aliases + [duplicate.name]

// Delete duplicate
DETACH DELETE duplicate
```

## Analytics and Quality

### Knowledge Graph Statistics

```gql
// Count entities by type
MATCH (e:Entity)
WITH labels(e) AS entity_labels
UNWIND entity_labels AS label
WHERE label <> 'Entity'
RETURN label AS entity_type, count(*) AS count
ORDER BY count DESC

// Count relationships by type
MATCH ()-[r]->()
RETURN type(r) AS relationship_type, count(r) AS count
ORDER BY count DESC

// Calculate graph density
MATCH (n)
WITH count(n) AS node_count
MATCH ()-[r]->()
WITH node_count, count(r) AS edge_count
RETURN
  node_count,
  edge_count,
  toFloat(edge_count) / (node_count * (node_count - 1)) AS density
```

### Data Quality Checks

```gql
// Find entities without relationships
MATCH (e:Entity)
WHERE NOT (e)-[]-()
RETURN e.id, e.name, labels(e) AS types
LIMIT 100

// Find low confidence entities
MATCH (e:Entity)
WHERE e.confidence < 0.5
RETURN e.id, e.name, e.confidence, e.source
ORDER BY e.confidence

// Find entities with missing required properties
MATCH (p:Person)
WHERE p.name IS NULL OR p.name = ''
RETURN p.id, p.source

// Find orphan mentions (not linked to entities)
MATCH (m:Mention)
WHERE NOT (m)-[:REFERS_TO]->()
RETURN m.id, m.text, m.document_id
LIMIT 100
```

## Next Steps

- [Fraud Detection Guide](/guides/fraud-detection/) - Pattern detection in knowledge graphs
- [Recommendation Engine Guide](/guides/recommendations/) - Entity recommendations
- [Query Performance Guide](/guides/query-performance/) - Optimize knowledge graph queries
- [Data Import Guide](/guides/data-import/) - Import knowledge from external sources

## Resources

- [GQL Reference](/docs/gql-reference/)
- [Graph Modeling Guide](/guides/graph-modeling/)
- [Wikidata Query Service](https://query.wikidata.org/)
- [Example Applications](https://gitlab.com/devnw/codepros/geode/examples)

---

**Questions?** Join our [community forum](https://forum.geodedb.com) to discuss knowledge graph implementations.
