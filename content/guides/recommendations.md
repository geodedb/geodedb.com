---
title: "Recommendation Engine Guide"
slug: "recommendations"
description: "Build powerful recommendation systems with Geode using collaborative filtering, content-based, and graph-based approaches"
weight: 61
tags: ["recommendations", "collaborative-filtering", "machine-learning", "personalization", "graph-algorithms"]
categories: ["guides", "use-cases"]
keywords:
  - recommendation engine
  - collaborative filtering
  - content-based recommendations
  - graph recommendations
  - personalization
  - Geode recommendations
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Recommendation Engine Guide

This guide demonstrates how to build a powerful recommendation engine using Geode. You'll learn collaborative filtering, content-based recommendations, and graph-based approaches that leverage Geode's native graph traversal capabilities.

## Overview

Recommendation engines help users discover relevant content, products, or connections. Graph databases excel at recommendations because they naturally model the relationships between users, items, and attributes.

**Why Geode for Recommendations?**

- **Native graph traversal** - Efficiently follow relationship chains
- **Pattern matching** - Find users with similar behavior patterns
- **Real-time computation** - Generate recommendations on demand
- **Flexible modeling** - Easily add new item types and relationships

## Data Model

### Core Entities

```gql
// Users who receive recommendations
(:User {
  id: STRING,
  username: STRING,
  email: STRING,
  preferences: MAP,       // User preferences
  created_at: TIMESTAMP,
  last_active: TIMESTAMP
})

// Items being recommended (products, content, etc.)
(:Item {
  id: STRING,
  name: STRING,
  description: STRING,
  category: STRING,
  price: FLOAT,
  attributes: MAP,        // Flexible attributes
  popularity_score: FLOAT,
  created_at: TIMESTAMP
})

// Categories for content organization
(:Category {
  id: STRING,
  name: STRING,
  parent_id: STRING
})

// Tags for fine-grained classification
(:Tag {
  name: STRING,
  usage_count: INTEGER
})

// Features for content-based filtering
(:Feature {
  name: STRING,
  type: STRING,          // "genre", "color", "size", etc.
  value: STRING
})
```

### Interaction Relationships

```gql
// User-Item interactions
(:User)-[:VIEWED {
  timestamp: TIMESTAMP,
  duration_seconds: INTEGER,
  source: STRING          // "search", "recommendation", "browse"
}]->(:Item)

(:User)-[:PURCHASED {
  timestamp: TIMESTAMP,
  quantity: INTEGER,
  price: FLOAT
}]->(:Item)

(:User)-[:RATED {
  rating: FLOAT,          // 1-5 scale
  timestamp: TIMESTAMP,
  review: STRING
}]->(:Item)

(:User)-[:WISHLISTED {
  timestamp: TIMESTAMP
}]->(:Item)

(:User)-[:CART_ADDED {
  timestamp: TIMESTAMP,
  quantity: INTEGER
}]->(:Item)

// Item relationships
(:Item)-[:IN_CATEGORY]->(:Category)
(:Item)-[:HAS_TAG]->(:Tag)
(:Item)-[:HAS_FEATURE]->(:Feature)
(:Item)-[:SIMILAR_TO {score: FLOAT}]->(:Item)
(:Item)-[:FREQUENTLY_BOUGHT_WITH {count: INTEGER}]->(:Item)
```

### Schema Setup

```gql
// Constraints
CREATE CONSTRAINT user_id_unique ON :User(id) ASSERT UNIQUE
CREATE CONSTRAINT item_id_unique ON :Item(id) ASSERT UNIQUE
CREATE CONSTRAINT category_id_unique ON :Category(id) ASSERT UNIQUE
CREATE CONSTRAINT tag_name_unique ON :Tag(name) ASSERT UNIQUE

// Indexes for recommendation queries
CREATE INDEX user_id ON :User(id)
CREATE INDEX item_id ON :Item(id)
CREATE INDEX item_category ON :Item(category)
CREATE INDEX item_popularity ON :Item(popularity_score)
CREATE INDEX tag_name ON :Tag(name)
CREATE INDEX feature_name_value ON :Feature(name, value)
```

## Collaborative Filtering

Collaborative filtering recommends items based on the behavior of similar users.

### User-Based Collaborative Filtering

Find users with similar tastes and recommend what they liked.

```gql
// Find users who purchased the same items as me
MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
WHERE me <> similar
WITH similar, count(DISTINCT item) AS shared_items
ORDER BY shared_items DESC
LIMIT 50

// Find items they purchased that I haven't
MATCH (similar)-[:PURCHASED]->(recommendation:Item)
WHERE NOT (me)-[:PURCHASED]->(recommendation)
  AND NOT (me)-[:VIEWED]->(recommendation)  // Optionally exclude viewed items
WITH recommendation, count(DISTINCT similar) AS recommender_count, sum(shared_items) AS score
ORDER BY score DESC
LIMIT $limit

RETURN
  recommendation.id AS id,
  recommendation.name AS name,
  recommendation.category AS category,
  recommendation.price AS price,
  recommender_count AS similar_users,
  score
```

{{< tabs >}}
{{< tab "Go" >}}
```go
package main

import (
    "context"
    "database/sql"
    "log"
    _ "geodedb.com/geode"
)

type Recommendation struct {
    ID           string
    Name         string
    Category     string
    Price        float64
    SimilarUsers int
    Score        float64
}

func GetCollaborativeRecommendations(ctx context.Context, db *sql.DB, userID string, limit int) ([]Recommendation, error) {
    rows, err := db.QueryContext(ctx, `
        MATCH (me:User {id: ?})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
        WHERE me <> similar
        WITH similar, count(DISTINCT item) AS shared_items
        ORDER BY shared_items DESC
        LIMIT 50

        MATCH (similar)-[:PURCHASED]->(recommendation:Item)
        MATCH (me:User {id: ?})
        WHERE NOT (me)-[:PURCHASED]->(recommendation)
        WITH recommendation, count(DISTINCT similar) AS recommender_count, sum(shared_items) AS score
        ORDER BY score DESC
        LIMIT ?

        RETURN
            recommendation.id AS id,
            recommendation.name AS name,
            recommendation.category AS category,
            recommendation.price AS price,
            recommender_count AS similar_users,
            score
    `, userID, userID, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var recommendations []Recommendation
    for rows.Next() {
        var r Recommendation
        err := rows.Scan(&r.ID, &r.Name, &r.Category, &r.Price, &r.SimilarUsers, &r.Score)
        if err != nil {
            return nil, err
        }
        recommendations = append(recommendations, r)
    }

    return recommendations, nil
}

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()
    recs, err := GetCollaborativeRecommendations(ctx, db, "user-123", 10)
    if err != nil {
        log.Fatal(err)
    }

    for _, r := range recs {
        log.Printf("Recommended: %s (score: %.2f)", r.Name, r.Score)
    }
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import asyncio
from dataclasses import dataclass
from typing import List
from geode_client import Client

@dataclass
class Recommendation:
    id: str
    name: str
    category: str
    price: float
    similar_users: int
    score: float

async def get_collaborative_recommendations(
    client,
    user_id: str,
    limit: int = 10
) -> List[Recommendation]:
    """Get recommendations using user-based collaborative filtering."""
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
            WHERE me <> similar
            WITH me, similar, count(DISTINCT item) AS shared_items
            ORDER BY shared_items DESC
            LIMIT 50

            MATCH (similar)-[:PURCHASED]->(recommendation:Item)
            WHERE NOT (me)-[:PURCHASED]->(recommendation)
            WITH recommendation, count(DISTINCT similar) AS recommender_count, sum(shared_items) AS score
            ORDER BY score DESC
            LIMIT $limit

            RETURN
                recommendation.id AS id,
                recommendation.name AS name,
                recommendation.category AS category,
                recommendation.price AS price,
                recommender_count AS similar_users,
                score
        """, {"user_id": user_id, "limit": limit})

        return [
            Recommendation(
                id=row['id'].as_string,
                name=row['name'].as_string,
                category=row['category'].as_string,
                price=row['price'].as_float,
                similar_users=row['similar_users'].as_int,
                score=row['score'].as_float
            )
            for row in result.rows
        ]

async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)
    recs = await get_collaborative_recommendations(client, "user-123", limit=10)

    for r in recs:
        print(f"Recommended: {r.name} (score: {r.score:.2f})")

asyncio.run(main())
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::{Client, Value};
use std::collections::HashMap;

#[derive(Debug)]
struct Recommendation {
    id: String,
    name: String,
    category: String,
    price: f64,
    similar_users: i64,
    score: f64,
}

async fn get_collaborative_recommendations(
    conn: &mut geode_client::Connection,
    user_id: &str,
    limit: i64,
) -> Result<Vec<Recommendation>, Box<dyn std::error::Error>> {
    let mut params = HashMap::new();
    params.insert("user_id".to_string(), Value::string(user_id));
    params.insert("limit".to_string(), Value::int(limit));

    let (page, _) = conn.query_with_params(r#"
        MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
        WHERE me <> similar
        WITH me, similar, count(DISTINCT item) AS shared_items
        ORDER BY shared_items DESC
        LIMIT 50

        MATCH (similar)-[:PURCHASED]->(recommendation:Item)
        WHERE NOT (me)-[:PURCHASED]->(recommendation)
        WITH recommendation, count(DISTINCT similar) AS recommender_count, sum(shared_items) AS score
        ORDER BY score DESC
        LIMIT $limit

        RETURN
            recommendation.id AS id,
            recommendation.name AS name,
            recommendation.category AS category,
            recommendation.price AS price,
            recommender_count AS similar_users,
            score
    "#, &params).await?;

    let mut recommendations = Vec::new();
    for row in &page.rows {
        recommendations.push(Recommendation {
            id: row.get("id").unwrap().as_string()?,
            name: row.get("name").unwrap().as_string()?,
            category: row.get("category").unwrap().as_string()?,
            price: row.get("price").unwrap().as_float()?,
            similar_users: row.get("similar_users").unwrap().as_int()?,
            score: row.get("score").unwrap().as_float()?,
        });
    }

    Ok(recommendations)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    let recs = get_collaborative_recommendations(&mut conn, "user-123", 10).await?;

    for r in recs {
        println!("Recommended: {} (score: {:.2})", r.name, r.score);
    }

    Ok(())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { createClient, Client } from '@geodedb/client';

interface Recommendation {
  id: string;
  name: string;
  category: string;
  price: number;
  similarUsers: number;
  score: number;
}

async function getCollaborativeRecommendations(
  client: Client,
  userId: string,
  limit: number = 10
): Promise<Recommendation[]> {
  const rows = await client.queryAll(`
    MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
    WHERE me <> similar
    WITH me, similar, count(DISTINCT item) AS shared_items
    ORDER BY shared_items DESC
    LIMIT 50

    MATCH (similar)-[:PURCHASED]->(recommendation:Item)
    WHERE NOT (me)-[:PURCHASED]->(recommendation)
    WITH recommendation, count(DISTINCT similar) AS recommender_count, sum(shared_items) AS score
    ORDER BY score DESC
    LIMIT $limit

    RETURN
      recommendation.id AS id,
      recommendation.name AS name,
      recommendation.category AS category,
      recommendation.price AS price,
      recommender_count AS similar_users,
      score
  `, { params: { user_id: userId, limit } });

  return rows.map(row => ({
    id: row.get('id')?.asString ?? '',
    name: row.get('name')?.asString ?? '',
    category: row.get('category')?.asString ?? '',
    price: row.get('price')?.asNumber ?? 0,
    similarUsers: row.get('similar_users')?.asNumber ?? 0,
    score: row.get('score')?.asNumber ?? 0,
  }));
}

async function main() {
  const client = await createClient('quic://localhost:3141');

  const recs = await getCollaborativeRecommendations(client, 'user-123', 10);

  for (const r of recs) {
    console.log(`Recommended: ${r.name} (score: ${r.score.toFixed(2)})`);
  }

  await client.close();
}

main();
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const geode = @import("geode_client");

const Recommendation = struct {
    id: []const u8,
    name: []const u8,
    category: []const u8,
    price: f64,
    similar_users: i64,
    score: f64,
};

pub fn getCollaborativeRecommendations(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
    user_id: []const u8,
    limit: i64,
) !std.ArrayList(Recommendation) {
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("user_id", .{ .string = user_id });
    try params.put("limit", .{ .integer = limit });

    try client.sendRunGql(1,
        \\MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
        \\WHERE me <> similar
        \\WITH me, similar, count(DISTINCT item) AS shared_items
        \\ORDER BY shared_items DESC
        \\LIMIT 50
        \\MATCH (similar)-[:PURCHASED]->(recommendation:Item)
        \\WHERE NOT (me)-[:PURCHASED]->(recommendation)
        \\WITH recommendation, count(DISTINCT similar) AS recommender_count, sum(shared_items) AS score
        \\ORDER BY score DESC
        \\LIMIT $limit
        \\RETURN
        \\    recommendation.id AS id,
        \\    recommendation.name AS name,
        \\    recommendation.category AS category,
        \\    recommendation.price AS price,
        \\    recommender_count AS similar_users,
        \\    score
    , .{ .object = params });

    _ = try client.receiveMessage(30000);
    try client.sendPull(1, 1000);
    const result = try client.receiveMessage(30000);
    defer allocator.free(result);

    var recommendations = std.ArrayList(Recommendation).init(allocator);
    // Parse JSON result and populate recommendations
    return recommendations;
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.sendHello("recommendations", "1.0.0");
    _ = try client.receiveMessage(30000);

    const recs = try getCollaborativeRecommendations(&client, allocator, "user-123", 10);
    defer recs.deinit();

    for (recs.items) |r| {
        std.debug.print("Recommended: {s} (score: {d:.2})\n", .{ r.name, r.score });
    }
}
```
{{< /tab >}}
{{< /tabs >}}

### Item-Based Collaborative Filtering

Find items frequently purchased together.

```gql
// Find items frequently purchased with items the user bought
MATCH (me:User {id: $user_id})-[:PURCHASED]->(my_item:Item)
MATCH (my_item)<-[:PURCHASED]-(other:User)-[:PURCHASED]->(co_purchased:Item)
WHERE me <> other
  AND NOT (me)-[:PURCHASED]->(co_purchased)
  AND my_item <> co_purchased
WITH co_purchased, count(DISTINCT other) AS co_purchase_count
ORDER BY co_purchase_count DESC
LIMIT $limit

RETURN
  co_purchased.id AS id,
  co_purchased.name AS name,
  co_purchased.category AS category,
  co_purchased.price AS price,
  co_purchase_count AS frequency
```

### Weighted Collaborative Filtering

Weight different interaction types for better recommendations.

```gql
// Weight interactions: purchase=5, rating=3, view=1
MATCH (me:User {id: $user_id})

// Get weighted interactions for similar users
OPTIONAL MATCH (me)-[:PURCHASED]->(p_item:Item)<-[:PURCHASED]-(similar:User)
WITH me, similar, sum(5) AS purchase_weight

OPTIONAL MATCH (me)-[:RATED]->(r_item:Item)<-[:RATED]-(similar)
WITH me, similar, purchase_weight, sum(3) AS rating_weight

OPTIONAL MATCH (me)-[:VIEWED]->(v_item:Item)<-[:VIEWED]-(similar)
WHERE similar IS NOT NULL
WITH similar, purchase_weight + rating_weight + sum(1) AS total_weight
WHERE total_weight > 5
ORDER BY total_weight DESC
LIMIT 100

// Get recommendations from similar users
MATCH (similar)-[:PURCHASED|RATED|WISHLISTED]->(recommendation:Item)
MATCH (me:User {id: $user_id})
WHERE NOT (me)-[:PURCHASED]->(recommendation)
WITH recommendation, sum(total_weight) AS score
ORDER BY score DESC
LIMIT $limit

RETURN recommendation.id, recommendation.name, score
```

## Content-Based Recommendations

Content-based filtering recommends items similar to what the user has liked before.

### Feature-Based Similarity

```gql
// Find items with similar features to what user has purchased
MATCH (me:User {id: $user_id})-[:PURCHASED]->(purchased:Item)-[:HAS_FEATURE]->(feature:Feature)
WITH me, feature, count(purchased) AS feature_frequency
ORDER BY feature_frequency DESC
LIMIT 20

// Find items with these features
MATCH (feature)<-[:HAS_FEATURE]-(recommendation:Item)
WHERE NOT (me)-[:PURCHASED]->(recommendation)
  AND NOT (me)-[:VIEWED]->(recommendation)
WITH recommendation, sum(feature_frequency) AS feature_match_score
ORDER BY feature_match_score DESC
LIMIT $limit

RETURN
  recommendation.id AS id,
  recommendation.name AS name,
  recommendation.category AS category,
  feature_match_score AS score
```

{{< tabs >}}
{{< tab "Go" >}}
```go
func GetContentBasedRecommendations(ctx context.Context, db *sql.DB, userID string, limit int) ([]Recommendation, error) {
    rows, err := db.QueryContext(ctx, `
        MATCH (me:User {id: ?})-[:PURCHASED]->(purchased:Item)-[:HAS_FEATURE]->(feature:Feature)
        WITH me, feature, count(purchased) AS feature_frequency
        ORDER BY feature_frequency DESC
        LIMIT 20

        MATCH (feature)<-[:HAS_FEATURE]-(recommendation:Item)
        WHERE NOT (me)-[:PURCHASED]->(recommendation)
          AND NOT (me)-[:VIEWED]->(recommendation)
        WITH recommendation, sum(feature_frequency) AS feature_match_score
        ORDER BY feature_match_score DESC
        LIMIT ?

        RETURN
            recommendation.id AS id,
            recommendation.name AS name,
            recommendation.category AS category,
            recommendation.price AS price,
            feature_match_score AS score
    `, userID, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var recommendations []Recommendation
    for rows.Next() {
        var r Recommendation
        err := rows.Scan(&r.ID, &r.Name, &r.Category, &r.Price, &r.Score)
        if err != nil {
            return nil, err
        }
        recommendations = append(recommendations, r)
    }

    return recommendations, nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async def get_content_based_recommendations(
    client,
    user_id: str,
    limit: int = 10
) -> List[Recommendation]:
    """Get recommendations based on content similarity."""
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (me:User {id: $user_id})-[:PURCHASED]->(purchased:Item)-[:HAS_FEATURE]->(feature:Feature)
            WITH me, feature, count(purchased) AS feature_frequency
            ORDER BY feature_frequency DESC
            LIMIT 20

            MATCH (feature)<-[:HAS_FEATURE]-(recommendation:Item)
            WHERE NOT (me)-[:PURCHASED]->(recommendation)
              AND NOT (me)-[:VIEWED]->(recommendation)
            WITH recommendation, sum(feature_frequency) AS feature_match_score
            ORDER BY feature_match_score DESC
            LIMIT $limit

            RETURN
                recommendation.id AS id,
                recommendation.name AS name,
                recommendation.category AS category,
                recommendation.price AS price,
                feature_match_score AS score
        """, {"user_id": user_id, "limit": limit})

        return [
            Recommendation(
                id=row['id'].as_string,
                name=row['name'].as_string,
                category=row['category'].as_string,
                price=row['price'].as_float,
                similar_users=0,
                score=row['score'].as_float
            )
            for row in result.rows
        ]
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
async fn get_content_based_recommendations(
    conn: &mut geode_client::Connection,
    user_id: &str,
    limit: i64,
) -> Result<Vec<Recommendation>, Box<dyn std::error::Error>> {
    let mut params = HashMap::new();
    params.insert("user_id".to_string(), Value::string(user_id));
    params.insert("limit".to_string(), Value::int(limit));

    let (page, _) = conn.query_with_params(r#"
        MATCH (me:User {id: $user_id})-[:PURCHASED]->(purchased:Item)-[:HAS_FEATURE]->(feature:Feature)
        WITH me, feature, count(purchased) AS feature_frequency
        ORDER BY feature_frequency DESC
        LIMIT 20

        MATCH (feature)<-[:HAS_FEATURE]-(recommendation:Item)
        WHERE NOT (me)-[:PURCHASED]->(recommendation)
          AND NOT (me)-[:VIEWED]->(recommendation)
        WITH recommendation, sum(feature_frequency) AS feature_match_score
        ORDER BY feature_match_score DESC
        LIMIT $limit

        RETURN
            recommendation.id AS id,
            recommendation.name AS name,
            recommendation.category AS category,
            recommendation.price AS price,
            feature_match_score AS score
    "#, &params).await?;

    let mut recommendations = Vec::new();
    for row in &page.rows {
        recommendations.push(Recommendation {
            id: row.get("id").unwrap().as_string()?,
            name: row.get("name").unwrap().as_string()?,
            category: row.get("category").unwrap().as_string()?,
            price: row.get("price").unwrap().as_float()?,
            similar_users: 0,
            score: row.get("score").unwrap().as_float()?,
        });
    }

    Ok(recommendations)
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
async function getContentBasedRecommendations(
  client: Client,
  userId: string,
  limit: number = 10
): Promise<Recommendation[]> {
  const rows = await client.queryAll(`
    MATCH (me:User {id: $user_id})-[:PURCHASED]->(purchased:Item)-[:HAS_FEATURE]->(feature:Feature)
    WITH me, feature, count(purchased) AS feature_frequency
    ORDER BY feature_frequency DESC
    LIMIT 20

    MATCH (feature)<-[:HAS_FEATURE]-(recommendation:Item)
    WHERE NOT (me)-[:PURCHASED]->(recommendation)
      AND NOT (me)-[:VIEWED]->(recommendation)
    WITH recommendation, sum(feature_frequency) AS feature_match_score
    ORDER BY feature_match_score DESC
    LIMIT $limit

    RETURN
      recommendation.id AS id,
      recommendation.name AS name,
      recommendation.category AS category,
      recommendation.price AS price,
      feature_match_score AS score
  `, { params: { user_id: userId, limit } });

  return rows.map(row => ({
    id: row.get('id')?.asString ?? '',
    name: row.get('name')?.asString ?? '',
    category: row.get('category')?.asString ?? '',
    price: row.get('price')?.asNumber ?? 0,
    similarUsers: 0,
    score: row.get('score')?.asNumber ?? 0,
  }));
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
pub fn getContentBasedRecommendations(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
    user_id: []const u8,
    limit: i64,
) !std.ArrayList(Recommendation) {
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("user_id", .{ .string = user_id });
    try params.put("limit", .{ .integer = limit });

    try client.sendRunGql(1,
        \\MATCH (me:User {id: $user_id})-[:PURCHASED]->(purchased:Item)-[:HAS_FEATURE]->(feature:Feature)
        \\WITH me, feature, count(purchased) AS feature_frequency
        \\ORDER BY feature_frequency DESC
        \\LIMIT 20
        \\MATCH (feature)<-[:HAS_FEATURE]-(recommendation:Item)
        \\WHERE NOT (me)-[:PURCHASED]->(recommendation)
        \\  AND NOT (me)-[:VIEWED]->(recommendation)
        \\WITH recommendation, sum(feature_frequency) AS feature_match_score
        \\ORDER BY feature_match_score DESC
        \\LIMIT $limit
        \\RETURN
        \\    recommendation.id AS id,
        \\    recommendation.name AS name,
        \\    recommendation.category AS category,
        \\    recommendation.price AS price,
        \\    feature_match_score AS score
    , .{ .object = params });

    _ = try client.receiveMessage(30000);
    try client.sendPull(1, 1000);
    const result = try client.receiveMessage(30000);
    defer allocator.free(result);

    var recommendations = std.ArrayList(Recommendation).init(allocator);
    return recommendations;
}
```
{{< /tab >}}
{{< /tabs >}}

### Category-Based Recommendations

```gql
// Recommend items from categories the user frequents
MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)-[:IN_CATEGORY]->(category:Category)
WITH me, category, count(item) AS purchase_count
ORDER BY purchase_count DESC
LIMIT 5

// Find popular items in those categories
MATCH (category)<-[:IN_CATEGORY]-(recommendation:Item)
WHERE NOT (me)-[:PURCHASED]->(recommendation)
WITH recommendation, sum(purchase_count) AS category_relevance, recommendation.popularity_score AS popularity
ORDER BY category_relevance * popularity DESC
LIMIT $limit

RETURN recommendation.id, recommendation.name, recommendation.category,
       category_relevance, popularity
```

### Tag-Based Recommendations

```gql
// Find items with similar tags to user's interests
MATCH (me:User {id: $user_id})-[:PURCHASED|WISHLISTED|RATED]->(item:Item)-[:HAS_TAG]->(tag:Tag)
WITH me, tag, count(item) AS tag_affinity
ORDER BY tag_affinity DESC
LIMIT 15

MATCH (tag)<-[:HAS_TAG]-(recommendation:Item)
WHERE NOT (me)-[:PURCHASED]->(recommendation)
WITH recommendation, collect(DISTINCT tag.name) AS matching_tags,
     sum(tag_affinity) AS tag_score
WHERE size(matching_tags) >= 2  // At least 2 matching tags
ORDER BY tag_score DESC
LIMIT $limit

RETURN recommendation.id, recommendation.name, matching_tags, tag_score
```

## Graph-Based Recommendations

Leverage graph structure for sophisticated recommendations.

### Similar Items via Graph Distance

```gql
// Find items within 2 hops of items user liked
MATCH (me:User {id: $user_id})-[r:RATED]->(liked:Item)
WHERE r.rating >= 4
WITH me, liked

// Traverse similar items
MATCH (liked)-[:SIMILAR_TO*1..2]->(recommendation:Item)
WHERE NOT (me)-[:PURCHASED]->(recommendation)
  AND liked <> recommendation
WITH recommendation, count(DISTINCT liked) AS connection_count,
     min(length((liked)-[:SIMILAR_TO*]->(recommendation))) AS distance
ORDER BY connection_count DESC, distance ASC
LIMIT $limit

RETURN recommendation.id, recommendation.name, connection_count, distance
```

### PageRank-Style Recommendations

```gql
// Personalized PageRank from user's purchased items
MATCH (me:User {id: $user_id})-[:PURCHASED]->(seed:Item)
WITH me, collect(seed) AS seeds

// Walk the graph
UNWIND seeds AS seed
MATCH path = (seed)-[:SIMILAR_TO|FREQUENTLY_BOUGHT_WITH*1..3]->(target:Item)
WHERE NOT target IN seeds
  AND NOT (me)-[:PURCHASED]->(target)
WITH target, count(path) AS path_count,
     avg(length(path)) AS avg_distance
ORDER BY path_count DESC, avg_distance ASC
LIMIT $limit

RETURN target.id, target.name, path_count, avg_distance
```

### Community-Based Recommendations

```gql
// Find users in similar "purchase communities"
MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(neighbor:User)
WITH me, neighbor, count(item) AS shared_items
WHERE shared_items >= 3
WITH me, collect(neighbor) AS community

// Find popular items within the community
UNWIND community AS member
MATCH (member)-[:PURCHASED]->(item:Item)
WHERE NOT (me)-[:PURCHASED]->(item)
WITH item, count(DISTINCT member) AS community_purchases
ORDER BY community_purchases DESC
LIMIT $limit

RETURN item.id, item.name, community_purchases
```

## Real-Time vs Batch Recommendations

### Real-Time Recommendations

For immediate, personalized recommendations:

```gql
// Quick personalized recommendations (< 100ms)
MATCH (me:User {id: $user_id})

// Get recent activity
OPTIONAL MATCH (me)-[r:VIEWED|PURCHASED]->(recent:Item)
WHERE r.timestamp > timestamp() - duration('P7D')
WITH me, collect(recent)[0..5] AS recent_items

// Find similar items
UNWIND recent_items AS recent
MATCH (recent)-[:SIMILAR_TO]->(similar:Item)
WHERE NOT (me)-[:PURCHASED]->(similar)
WITH DISTINCT similar, recent.category AS source_category
LIMIT $limit

RETURN similar.id, similar.name, similar.category, source_category
```

{{< tabs >}}
{{< tab "Go" >}}
```go
func GetRealTimeRecommendations(ctx context.Context, db *sql.DB, userID string, limit int) ([]Recommendation, error) {
    // Use context with timeout for real-time requirements
    ctx, cancel := context.WithTimeout(ctx, 100*time.Millisecond)
    defer cancel()

    rows, err := db.QueryContext(ctx, `
        MATCH (me:User {id: ?})
        OPTIONAL MATCH (me)-[r:VIEWED|PURCHASED]->(recent:Item)
        WHERE r.timestamp > timestamp() - duration('P7D')
        WITH me, collect(recent)[0..5] AS recent_items

        UNWIND recent_items AS recent
        MATCH (recent)-[:SIMILAR_TO]->(similar:Item)
        WHERE NOT (me)-[:PURCHASED]->(similar)
        WITH DISTINCT similar, recent.category AS source_category
        LIMIT ?

        RETURN similar.id, similar.name, similar.category, source_category
    `, userID, limit)

    if err != nil {
        // Fallback to cached recommendations on timeout
        if ctx.Err() == context.DeadlineExceeded {
            return getCachedRecommendations(userID, limit)
        }
        return nil, err
    }
    defer rows.Close()

    var recommendations []Recommendation
    for rows.Next() {
        var r Recommendation
        var sourceCategory string
        rows.Scan(&r.ID, &r.Name, &r.Category, &sourceCategory)
        recommendations = append(recommendations, r)
    }

    return recommendations, nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import asyncio
from typing import Optional

async def get_realtime_recommendations(
    client,
    user_id: str,
    limit: int = 10,
    timeout_ms: int = 100
) -> List[Recommendation]:
    """Get real-time recommendations with timeout fallback."""
    try:
        async with asyncio.timeout(timeout_ms / 1000):
            async with client.connection() as conn:
                result, _ = await conn.query("""
                    MATCH (me:User {id: $user_id})
                    OPTIONAL MATCH (me)-[r:VIEWED|PURCHASED]->(recent:Item)
                    WHERE r.timestamp > timestamp() - duration('P7D')
                    WITH me, collect(recent)[0..5] AS recent_items

                    UNWIND recent_items AS recent
                    MATCH (recent)-[:SIMILAR_TO]->(similar:Item)
                    WHERE NOT (me)-[:PURCHASED]->(similar)
                    WITH DISTINCT similar, recent.category AS source_category
                    LIMIT $limit

                    RETURN similar.id, similar.name, similar.category, source_category
                """, {"user_id": user_id, "limit": limit})

                return [
                    Recommendation(
                        id=row['similar.id'].as_string,
                        name=row['similar.name'].as_string,
                        category=row['similar.category'].as_string,
                        price=0,
                        similar_users=0,
                        score=0
                    )
                    for row in result.rows
                ]

    except asyncio.TimeoutError:
        # Fallback to cached recommendations
        return await get_cached_recommendations(user_id, limit)
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use tokio::time::{timeout, Duration};

async fn get_realtime_recommendations(
    conn: &mut geode_client::Connection,
    user_id: &str,
    limit: i64,
) -> Result<Vec<Recommendation>, Box<dyn std::error::Error>> {
    let mut params = HashMap::new();
    params.insert("user_id".to_string(), Value::string(user_id));
    params.insert("limit".to_string(), Value::int(limit));

    // Timeout after 100ms
    let result = timeout(Duration::from_millis(100), async {
        conn.query_with_params(r#"
            MATCH (me:User {id: $user_id})
            OPTIONAL MATCH (me)-[r:VIEWED|PURCHASED]->(recent:Item)
            WHERE r.timestamp > timestamp() - duration('P7D')
            WITH me, collect(recent)[0..5] AS recent_items

            UNWIND recent_items AS recent
            MATCH (recent)-[:SIMILAR_TO]->(similar:Item)
            WHERE NOT (me)-[:PURCHASED]->(similar)
            WITH DISTINCT similar, recent.category AS source_category
            LIMIT $limit

            RETURN similar.id, similar.name, similar.category, source_category
        "#, &params).await
    }).await;

    match result {
        Ok(Ok((page, _))) => {
            let mut recommendations = Vec::new();
            for row in &page.rows {
                recommendations.push(Recommendation {
                    id: row.get("similar.id").unwrap().as_string()?,
                    name: row.get("similar.name").unwrap().as_string()?,
                    category: row.get("similar.category").unwrap().as_string()?,
                    price: 0.0,
                    similar_users: 0,
                    score: 0.0,
                });
            }
            Ok(recommendations)
        }
        Ok(Err(e)) => Err(e.into()),
        Err(_) => {
            // Timeout - return cached recommendations
            get_cached_recommendations(user_id, limit).await
        }
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
async function getRealtimeRecommendations(
  client: Client,
  userId: string,
  limit: number = 10,
  timeoutMs: number = 100
): Promise<Recommendation[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const rows = await client.queryAll(`
      MATCH (me:User {id: $user_id})
      OPTIONAL MATCH (me)-[r:VIEWED|PURCHASED]->(recent:Item)
      WHERE r.timestamp > timestamp() - duration('P7D')
      WITH me, collect(recent)[0..5] AS recent_items

      UNWIND recent_items AS recent
      MATCH (recent)-[:SIMILAR_TO]->(similar:Item)
      WHERE NOT (me)-[:PURCHASED]->(similar)
      WITH DISTINCT similar, recent.category AS source_category
      LIMIT $limit

      RETURN similar.id, similar.name, similar.category, source_category
    `, {
      params: { user_id: userId, limit },
      signal: controller.signal
    });

    return rows.map(row => ({
      id: row.get('similar.id')?.asString ?? '',
      name: row.get('similar.name')?.asString ?? '',
      category: row.get('similar.category')?.asString ?? '',
      price: 0,
      similarUsers: 0,
      score: 0,
    }));
  } catch (error) {
    if (error.name === 'AbortError') {
      // Return cached recommendations on timeout
      return getCachedRecommendations(userId, limit);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
pub fn getRealtimeRecommendations(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
    user_id: []const u8,
    limit: i64,
    timeout_ms: u64,
) !std.ArrayList(Recommendation) {
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("user_id", .{ .string = user_id });
    try params.put("limit", .{ .integer = limit });

    // Use timeout for real-time requirements
    try client.sendRunGql(1,
        \\MATCH (me:User {id: $user_id})
        \\OPTIONAL MATCH (me)-[r:VIEWED|PURCHASED]->(recent:Item)
        \\WHERE r.timestamp > timestamp() - duration('P7D')
        \\WITH me, collect(recent)[0..5] AS recent_items
        \\UNWIND recent_items AS recent
        \\MATCH (recent)-[:SIMILAR_TO]->(similar:Item)
        \\WHERE NOT (me)-[:PURCHASED]->(similar)
        \\WITH DISTINCT similar, recent.category AS source_category
        \\LIMIT $limit
        \\RETURN similar.id, similar.name, similar.category, source_category
    , .{ .object = params });

    const result = client.receiveMessage(timeout_ms) catch |err| {
        if (err == error.Timeout) {
            // Return cached recommendations
            return getCachedRecommendations(allocator, user_id, limit);
        }
        return err;
    };
    defer allocator.free(result);

    var recommendations = std.ArrayList(Recommendation).init(allocator);
    return recommendations;
}
```
{{< /tab >}}
{{< /tabs >}}

### Batch Pre-Computation

For complex recommendations that can be pre-computed:

```gql
// Pre-compute recommendations for active users (run nightly)
MATCH (user:User)
WHERE user.last_active > timestamp() - duration('P30D')

// Compute collaborative filtering recommendations
CALL {
  WITH user
  MATCH (user)-[:PURCHASED]->(item:Item)<-[:PURCHASED]-(similar:User)
  WHERE user <> similar
  WITH user, similar, count(item) AS shared
  ORDER BY shared DESC
  LIMIT 50

  MATCH (similar)-[:PURCHASED]->(rec:Item)
  WHERE NOT (user)-[:PURCHASED]->(rec)
  WITH user, rec, count(similar) AS score
  ORDER BY score DESC
  LIMIT 50
  RETURN user, collect({item_id: rec.id, score: score}) AS recommendations
}

// Store in cache
MERGE (cache:RecommendationCache {user_id: user.id})
SET cache.items = recommendations,
    cache.computed_at = timestamp(),
    cache.algorithm = 'collaborative'
```

## A/B Testing Recommendations

### Experiment Setup

```gql
// Create experiment groups
CREATE (:Experiment {
  id: 'rec-algo-test-2026-01',
  name: 'Recommendation Algorithm Test',
  start_date: date('2026-01-01'),
  end_date: date('2026-01-31'),
  variants: ['control', 'collaborative', 'content', 'hybrid']
})

// Assign users to variants (deterministic hash)
MATCH (user:User)
WHERE NOT (user)-[:IN_EXPERIMENT]->(:Experiment {id: 'rec-algo-test-2026-01'})
WITH user, abs(hash(user.id)) % 4 AS variant_index
MATCH (exp:Experiment {id: 'rec-algo-test-2026-01'})
CREATE (user)-[:IN_EXPERIMENT {
  variant: exp.variants[variant_index],
  assigned_at: timestamp()
}]->(exp)
```

### Tracking Results

```gql
// Track recommendation click-through
MATCH (user:User {id: $user_id})-[exp:IN_EXPERIMENT]->(experiment:Experiment {id: $experiment_id})
MATCH (item:Item {id: $item_id})
CREATE (user)-[:CLICKED_RECOMMENDATION {
  item_id: item.id,
  variant: exp.variant,
  position: $position,
  timestamp: timestamp(),
  experiment_id: experiment.id
}]->(item)
```

### Analyze Results

```gql
// Compare conversion rates by variant
MATCH (exp:Experiment {id: $experiment_id})
MATCH (user:User)-[assignment:IN_EXPERIMENT]->(exp)

// Get impressions
OPTIONAL MATCH (user)-[impression:VIEWED_RECOMMENDATION]->(item:Item)
WHERE impression.experiment_id = exp.id

// Get clicks
OPTIONAL MATCH (user)-[click:CLICKED_RECOMMENDATION]->(item:Item)
WHERE click.experiment_id = exp.id

// Get conversions
OPTIONAL MATCH (user)-[purchase:PURCHASED]->(item:Item)
WHERE purchase.timestamp > assignment.assigned_at
  AND (user)-[:CLICKED_RECOMMENDATION {experiment_id: exp.id}]->(item)

WITH assignment.variant AS variant,
     count(DISTINCT user) AS users,
     count(DISTINCT impression) AS impressions,
     count(DISTINCT click) AS clicks,
     count(DISTINCT purchase) AS conversions

RETURN
  variant,
  users,
  impressions,
  clicks,
  conversions,
  toFloat(clicks) / impressions AS ctr,
  toFloat(conversions) / clicks AS conversion_rate
ORDER BY conversion_rate DESC
```

## Performance Optimization

### Query Optimization

```gql
// Use LIMIT early in the query
MATCH (me:User {id: $user_id})-[:PURCHASED]->(item:Item)
WITH me, item
LIMIT 100  // Limit input set early

// Continue with similarity search
MATCH (item)<-[:PURCHASED]-(similar:User)
WHERE me <> similar
// ...
```

### Index Usage

```gql
// Create indexes for recommendation queries
CREATE INDEX item_popularity ON :Item(popularity_score)
CREATE INDEX item_category_popularity ON :Item(category, popularity_score)
CREATE INDEX user_last_active ON :User(last_active)

// Composite index for filtering
CREATE INDEX item_category_price ON :Item(category, price)
```

### Caching Strategy

```gql
// Cache popular item similarities
MATCH (popular:Item)
WHERE popular.popularity_score > 0.8

// Pre-compute similarities
MATCH (popular)<-[:PURCHASED]-(user:User)-[:PURCHASED]->(other:Item)
WHERE popular <> other
WITH popular, other, count(user) AS co_purchases
WHERE co_purchases >= 10
ORDER BY co_purchases DESC
LIMIT 20

// Store as relationship
MERGE (popular)-[s:SIMILAR_TO]->(other)
SET s.score = co_purchases,
    s.updated_at = timestamp()
```

### Hybrid Recommendations

Combine multiple approaches for best results:

```gql
// Hybrid: Collaborative + Content + Popularity
MATCH (me:User {id: $user_id})

// Collaborative component (40% weight)
OPTIONAL MATCH (me)-[:PURCHASED]->(p:Item)<-[:PURCHASED]-(similar:User)-[:PURCHASED]->(collab:Item)
WHERE NOT (me)-[:PURCHASED]->(collab)
WITH me, collab, count(similar) * 0.4 AS collab_score

// Content component (35% weight)
OPTIONAL MATCH (me)-[:PURCHASED]->(my_item:Item)-[:HAS_FEATURE]->(f:Feature)<-[:HAS_FEATURE]-(content:Item)
WHERE NOT (me)-[:PURCHASED]->(content)
WITH me, collab, collab_score, content, count(f) * 0.35 AS content_score

// Popularity component (25% weight)
WITH me,
     CASE WHEN collab IS NOT NULL THEN collab ELSE content END AS item,
     CASE WHEN collab IS NOT NULL THEN collab_score ELSE 0 END +
     CASE WHEN content IS NOT NULL THEN content_score ELSE 0 END AS base_score

MATCH (item)
WITH item, base_score + item.popularity_score * 0.25 AS final_score
ORDER BY final_score DESC
LIMIT $limit

RETURN item.id, item.name, final_score
```

## Monitoring and Metrics

### Track Recommendation Performance

```gql
// Create metrics for recommendation system
MATCH (user:User)-[click:CLICKED_RECOMMENDATION]->(item:Item)
WHERE click.timestamp > timestamp() - duration('P1D')

WITH
  count(DISTINCT click) AS total_clicks,
  count(DISTINCT user) AS unique_users,
  avg(click.position) AS avg_click_position

// Compare with purchases
MATCH (user:User)-[purchase:PURCHASED]->(item:Item)
WHERE purchase.timestamp > timestamp() - duration('P1D')
  AND (user)-[:CLICKED_RECOMMENDATION]->(item)

WITH total_clicks, unique_users, avg_click_position,
     count(purchase) AS recommendation_purchases

RETURN {
  total_clicks: total_clicks,
  unique_users: unique_users,
  avg_click_position: avg_click_position,
  recommendation_purchases: recommendation_purchases,
  conversion_rate: toFloat(recommendation_purchases) / total_clicks
} AS metrics
```

## Next Steps

- [Social Network Guide](/guides/social-network/) - User relationship recommendations
- [Knowledge Graph Guide](/guides/knowledge-graph/) - Entity recommendations
- [Query Performance Guide](/guides/query-performance/) - Optimize recommendation queries
- [High Availability Guide](/guides/high-availability/) - Scale recommendation systems

## Resources

- [GQL Reference](/docs/gql-reference/)
- [Graph Modeling Guide](/guides/graph-modeling/)
- [Example Applications](https://gitlab.com/devnw/codepros/geode/examples)

---

**Questions?** Join our [community forum](https://forum.geodedb.com) to discuss recommendation strategies.
