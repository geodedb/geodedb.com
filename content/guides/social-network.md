---
title: "Social Network Guide"
slug: "social-network"
description: "Build a scalable social network with Geode - users, posts, comments, likes, and friend recommendations"
weight: 60
tags: ["social-network", "graph-patterns", "recommendations", "feed", "relationships"]
categories: ["guides", "use-cases"]
keywords:
  - social network graph
  - friend recommendations
  - activity feed
  - follower graph
  - social media database
  - Geode social network
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Social Network Guide

This guide demonstrates how to build a comprehensive social network using Geode. You'll learn to model users, posts, comments, likes, and relationships, then implement features like activity feeds, friend recommendations, and privacy controls.

## Overview

Social networks are a natural fit for graph databases because they're built on relationships:
- Users **follow** or **friend** other users
- Users **create** posts and **comment** on content
- Users **like** content and **share** posts
- Recommendations emerge from **connection patterns**

Geode's graph model captures these relationships directly, enabling fast traversals for feeds, recommendations, and social analytics.

## Data Model

### Core Entities

```gql
// Users - the central entity
(:User {
  id: STRING,           // UUID
  username: STRING,     // Unique handle
  email: STRING,        // Unique email
  display_name: STRING,
  bio: STRING,
  avatar_url: STRING,
  location: STRING,
  website: STRING,
  verified: BOOLEAN,
  privacy: STRING,      // "public", "private", "friends"
  created_at: TIMESTAMP,
  last_active: TIMESTAMP
})

// Posts - content created by users
(:Post {
  id: STRING,
  content: STRING,
  media_urls: LIST<STRING>,
  visibility: STRING,   // "public", "friends", "private"
  reply_count: INTEGER,
  like_count: INTEGER,
  share_count: INTEGER,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
})

// Comments - replies to posts
(:Comment {
  id: STRING,
  content: STRING,
  like_count: INTEGER,
  created_at: TIMESTAMP
})

// Hashtags - for content discovery
(:Hashtag {
  name: STRING,
  usage_count: INTEGER,
  trending_score: FLOAT
})
```

### Relationship Types

```gql
// User relationships
(:User)-[:FOLLOWS {since: TIMESTAMP, notifications: BOOLEAN}]->(:User)
(:User)-[:BLOCKS {since: TIMESTAMP, reason: STRING}]->(:User)
(:User)-[:MUTES {since: TIMESTAMP}]->(:User)

// Content relationships
(:User)-[:POSTED {timestamp: TIMESTAMP}]->(:Post)
(:User)-[:COMMENTED {timestamp: TIMESTAMP}]->(:Comment)
(:Comment)-[:ON]->(:Post)
(:Comment)-[:REPLY_TO]->(:Comment)

// Engagement relationships
(:User)-[:LIKES {timestamp: TIMESTAMP}]->(:Post)
(:User)-[:LIKES {timestamp: TIMESTAMP}]->(:Comment)
(:User)-[:SHARED {timestamp: TIMESTAMP, comment: STRING}]->(:Post)
(:User)-[:BOOKMARKED {timestamp: TIMESTAMP}]->(:Post)

// Content tagging
(:Post)-[:TAGGED]->(:Hashtag)
(:Post)-[:MENTIONS]->(:User)
```

### Visual Schema

```
                    +---------+
                    | Hashtag |
                    +---------+
                         ^
                         | TAGGED
                         |
+------+  FOLLOWS   +------+  POSTED    +------+
| User |----------->| User |----------->| Post |
+------+            +------+            +------+
    |                   |                   ^
    |    LIKES/SHARED   |                   |
    +-------------------+                   |
    |                                       |
    |  COMMENTED   +---------+    ON        |
    +------------->| Comment |-------------+
                   +---------+
```

## Schema Setup

### Create Constraints

```gql
// Unique constraints
CREATE CONSTRAINT user_id_unique ON :User(id) ASSERT UNIQUE
CREATE CONSTRAINT user_username_unique ON :User(username) ASSERT UNIQUE
CREATE CONSTRAINT user_email_unique ON :User(email) ASSERT UNIQUE
CREATE CONSTRAINT post_id_unique ON :Post(id) ASSERT UNIQUE
CREATE CONSTRAINT comment_id_unique ON :Comment(id) ASSERT UNIQUE
CREATE CONSTRAINT hashtag_name_unique ON :Hashtag(name) ASSERT UNIQUE

// Existence constraints
CREATE CONSTRAINT user_username_exists ON :User(username) ASSERT EXISTS
CREATE CONSTRAINT post_content_exists ON :Post(content) ASSERT EXISTS
```

### Create Indexes

```gql
// User indexes
CREATE INDEX user_username ON :User(username)
CREATE INDEX user_email ON :User(email)
CREATE INDEX user_created_at ON :User(created_at)
CREATE INDEX user_location ON :User(location)

// Post indexes
CREATE INDEX post_created_at ON :Post(created_at)
CREATE INDEX post_visibility ON :Post(visibility)

// Hashtag indexes
CREATE INDEX hashtag_name ON :Hashtag(name)
CREATE INDEX hashtag_trending ON :Hashtag(trending_score)

// Comment indexes
CREATE INDEX comment_created_at ON :Comment(created_at)
```

## User Management

### Create User

{{< tabs >}}
{{< tab "GQL" >}}
```gql
CREATE (u:User {
  id: $id,
  username: $username,
  email: $email,
  display_name: $display_name,
  bio: $bio,
  avatar_url: $avatar_url,
  privacy: "public",
  verified: false,
  created_at: timestamp(),
  last_active: timestamp()
})
RETURN u
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

type User struct {
    ID          string
    Username    string
    Email       string
    DisplayName string
    Bio         string
    AvatarURL   string
}

func CreateUser(ctx context.Context, db *sql.DB, user User) error {
    user.ID = uuid.New().String()

    _, err := db.ExecContext(ctx, `
        CREATE (u:User {
            id: ?,
            username: ?,
            email: ?,
            display_name: ?,
            bio: ?,
            avatar_url: ?,
            privacy: 'public',
            verified: false,
            created_at: timestamp(),
            last_active: timestamp()
        })
    `, user.ID, user.Username, user.Email, user.DisplayName, user.Bio, user.AvatarURL)

    return err
}

func main() {
    db, err := sql.Open("geode", "localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    ctx := context.Background()

    err = CreateUser(ctx, db, User{
        Username:    "alice",
        Email:       "alice@example.com",
        DisplayName: "Alice Johnson",
        Bio:         "Software engineer and coffee enthusiast",
        AvatarURL:   "https://example.com/avatars/alice.jpg",
    })
    if err != nil {
        log.Fatal(err)
    }

    log.Println("User created successfully")
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import asyncio
from datetime import datetime
from uuid import uuid4
from geode_client import Client

async def create_user(client, username: str, email: str, display_name: str,
                      bio: str = "", avatar_url: str = "") -> dict:
    """Create a new user in the social network."""
    user_id = str(uuid4())

    async with client.connection() as conn:
        result, _ = await conn.query("""
            CREATE (u:User {
                id: $id,
                username: $username,
                email: $email,
                display_name: $display_name,
                bio: $bio,
                avatar_url: $avatar_url,
                privacy: 'public',
                verified: false,
                created_at: timestamp(),
                last_active: timestamp()
            })
            RETURN u
        """, {
            "id": user_id,
            "username": username,
            "email": email,
            "display_name": display_name,
            "bio": bio,
            "avatar_url": avatar_url
        })

        return {"id": user_id, "username": username}

async def main():
    client = Client(host="localhost", port=3141, skip_verify=True)

    user = await create_user(
        client,
        username="alice",
        email="alice@example.com",
        display_name="Alice Johnson",
        bio="Software engineer and coffee enthusiast",
        avatar_url="https://example.com/avatars/alice.jpg"
    )

    print(f"Created user: {user}")

asyncio.run(main())
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use geode_client::{Client, Value};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug)]
struct User {
    id: String,
    username: String,
    email: String,
    display_name: String,
    bio: String,
    avatar_url: String,
}

async fn create_user(
    conn: &mut geode_client::Connection,
    username: &str,
    email: &str,
    display_name: &str,
    bio: &str,
    avatar_url: &str,
) -> Result<User, Box<dyn std::error::Error>> {
    let user_id = Uuid::new_v4().to_string();

    let mut params = HashMap::new();
    params.insert("id".to_string(), Value::string(&user_id));
    params.insert("username".to_string(), Value::string(username));
    params.insert("email".to_string(), Value::string(email));
    params.insert("display_name".to_string(), Value::string(display_name));
    params.insert("bio".to_string(), Value::string(bio));
    params.insert("avatar_url".to_string(), Value::string(avatar_url));

    conn.query_with_params(r#"
        CREATE (u:User {
            id: $id,
            username: $username,
            email: $email,
            display_name: $display_name,
            bio: $bio,
            avatar_url: $avatar_url,
            privacy: 'public',
            verified: false,
            created_at: timestamp(),
            last_active: timestamp()
        })
    "#, &params).await?;

    Ok(User {
        id: user_id,
        username: username.to_string(),
        email: email.to_string(),
        display_name: display_name.to_string(),
        bio: bio.to_string(),
        avatar_url: avatar_url.to_string(),
    })
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new("127.0.0.1", 3141).skip_verify(true);
    let mut conn = client.connect().await?;

    let user = create_user(
        &mut conn,
        "alice",
        "alice@example.com",
        "Alice Johnson",
        "Software engineer and coffee enthusiast",
        "https://example.com/avatars/alice.jpg",
    ).await?;

    println!("Created user: {:?}", user);
    Ok(())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
import { createClient, Client } from '@geodedb/client';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
}

async function createUser(
  client: Client,
  username: string,
  email: string,
  displayName: string,
  bio: string = '',
  avatarUrl: string = ''
): Promise<User> {
  const userId = uuidv4();

  await client.exec(`
    CREATE (u:User {
      id: $id,
      username: $username,
      email: $email,
      display_name: $display_name,
      bio: $bio,
      avatar_url: $avatar_url,
      privacy: 'public',
      verified: false,
      created_at: timestamp(),
      last_active: timestamp()
    })
  `, {
    params: {
      id: userId,
      username,
      email,
      display_name: displayName,
      bio,
      avatar_url: avatarUrl,
    }
  });

  return {
    id: userId,
    username,
    email,
    displayName,
    bio,
    avatarUrl,
  };
}

async function main() {
  const client = await createClient('quic://localhost:3141');

  const user = await createUser(
    client,
    'alice',
    'alice@example.com',
    'Alice Johnson',
    'Software engineer and coffee enthusiast',
    'https://example.com/avatars/alice.jpg'
  );

  console.log('Created user:', user);
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

pub fn createUser(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
    username: []const u8,
    email: []const u8,
    display_name: []const u8,
    bio: []const u8,
    avatar_url: []const u8,
) ![]const u8 {
    const user_id = uuid.v4();

    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();

    try params.put("id", .{ .string = &user_id });
    try params.put("username", .{ .string = username });
    try params.put("email", .{ .string = email });
    try params.put("display_name", .{ .string = display_name });
    try params.put("bio", .{ .string = bio });
    try params.put("avatar_url", .{ .string = avatar_url });

    try client.sendRunGql(1,
        \\CREATE (u:User {
        \\  id: $id,
        \\  username: $username,
        \\  email: $email,
        \\  display_name: $display_name,
        \\  bio: $bio,
        \\  avatar_url: $avatar_url,
        \\  privacy: 'public',
        \\  verified: false,
        \\  created_at: timestamp(),
        \\  last_active: timestamp()
        \\})
    , .{ .object = params });

    _ = try client.receiveMessage(30000);

    return &user_id;
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const allocator = gpa.allocator();

    var client = geode.GeodeClient.init(allocator, "localhost", 3141, true);
    defer client.deinit();

    try client.connect();
    try client.sendHello("social-network", "1.0.0");
    _ = try client.receiveMessage(30000);

    const user_id = try createUser(
        &client,
        allocator,
        "alice",
        "alice@example.com",
        "Alice Johnson",
        "Software engineer and coffee enthusiast",
        "https://example.com/avatars/alice.jpg",
    );

    std.debug.print("Created user: {s}\n", .{user_id});
}
```
{{< /tab >}}
{{< /tabs >}}

### Follow User

```gql
// Create follow relationship
MATCH (follower:User {id: $follower_id})
MATCH (followed:User {id: $followed_id})
WHERE NOT (follower)-[:FOLLOWS]->(followed)
  AND NOT (follower)-[:BLOCKS]->(followed)
  AND NOT (followed)-[:BLOCKS]->(follower)
CREATE (follower)-[:FOLLOWS {
  since: timestamp(),
  notifications: true
}]->(followed)
RETURN follower.username, followed.username
```

{{< tabs >}}
{{< tab "Go" >}}
```go
func FollowUser(ctx context.Context, db *sql.DB, followerID, followedID string) error {
    result, err := db.ExecContext(ctx, `
        MATCH (follower:User {id: ?})
        MATCH (followed:User {id: ?})
        WHERE NOT (follower)-[:FOLLOWS]->(followed)
          AND NOT (follower)-[:BLOCKS]->(followed)
          AND NOT (followed)-[:BLOCKS]->(follower)
        CREATE (follower)-[:FOLLOWS {
            since: timestamp(),
            notifications: true
        }]->(followed)
    `, followerID, followedID)

    if err != nil {
        return err
    }

    rowsAffected, _ := result.RowsAffected()
    if rowsAffected == 0 {
        return fmt.Errorf("could not follow user")
    }

    return nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async def follow_user(client, follower_id: str, followed_id: str) -> bool:
    """Follow another user."""
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (follower:User {id: $follower_id})
            MATCH (followed:User {id: $followed_id})
            WHERE NOT (follower)-[:FOLLOWS]->(followed)
              AND NOT (follower)-[:BLOCKS]->(followed)
              AND NOT (followed)-[:BLOCKS]->(follower)
            CREATE (follower)-[:FOLLOWS {
                since: timestamp(),
                notifications: true
            }]->(followed)
            RETURN follower.username AS follower, followed.username AS followed
        """, {"follower_id": follower_id, "followed_id": followed_id})

        return len(result.rows) > 0
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
async fn follow_user(
    conn: &mut geode_client::Connection,
    follower_id: &str,
    followed_id: &str,
) -> Result<bool, Box<dyn std::error::Error>> {
    let mut params = HashMap::new();
    params.insert("follower_id".to_string(), Value::string(follower_id));
    params.insert("followed_id".to_string(), Value::string(followed_id));

    let (page, _) = conn.query_with_params(r#"
        MATCH (follower:User {id: $follower_id})
        MATCH (followed:User {id: $followed_id})
        WHERE NOT (follower)-[:FOLLOWS]->(followed)
          AND NOT (follower)-[:BLOCKS]->(followed)
          AND NOT (followed)-[:BLOCKS]->(follower)
        CREATE (follower)-[:FOLLOWS {
            since: timestamp(),
            notifications: true
        }]->(followed)
        RETURN follower.username, followed.username
    "#, &params).await?;

    Ok(!page.rows.is_empty())
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
async function followUser(
  client: Client,
  followerId: string,
  followedId: string
): Promise<boolean> {
  const result = await client.queryAll(`
    MATCH (follower:User {id: $follower_id})
    MATCH (followed:User {id: $followed_id})
    WHERE NOT (follower)-[:FOLLOWS]->(followed)
      AND NOT (follower)-[:BLOCKS]->(followed)
      AND NOT (followed)-[:BLOCKS]->(follower)
    CREATE (follower)-[:FOLLOWS {
      since: timestamp(),
      notifications: true
    }]->(followed)
    RETURN follower.username, followed.username
  `, { params: { follower_id: followerId, followed_id: followedId } });

  return result.length > 0;
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
pub fn followUser(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
    follower_id: []const u8,
    followed_id: []const u8,
) !bool {
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();

    try params.put("follower_id", .{ .string = follower_id });
    try params.put("followed_id", .{ .string = followed_id });

    try client.sendRunGql(1,
        \\MATCH (follower:User {id: $follower_id})
        \\MATCH (followed:User {id: $followed_id})
        \\WHERE NOT (follower)-[:FOLLOWS]->(followed)
        \\  AND NOT (follower)-[:BLOCKS]->(followed)
        \\  AND NOT (followed)-[:BLOCKS]->(follower)
        \\CREATE (follower)-[:FOLLOWS {
        \\    since: timestamp(),
        \\    notifications: true
        \\}]->(followed)
        \\RETURN follower.username, followed.username
    , .{ .object = params });

    const result = try client.receiveMessage(30000);
    defer allocator.free(result);

    // Parse result to check if follow was created
    return std.mem.indexOf(u8, result, "BINDINGS") != null;
}
```
{{< /tab >}}
{{< /tabs >}}

## Content Creation

### Create Post

```gql
// Create a post with hashtags
MATCH (author:User {id: $author_id})
CREATE (p:Post {
  id: $post_id,
  content: $content,
  media_urls: $media_urls,
  visibility: $visibility,
  reply_count: 0,
  like_count: 0,
  share_count: 0,
  created_at: timestamp()
})
CREATE (author)-[:POSTED {timestamp: timestamp()}]->(p)

// Extract and link hashtags
WITH p, author
UNWIND $hashtags AS tag
MERGE (h:Hashtag {name: tag})
ON CREATE SET h.usage_count = 1
ON MATCH SET h.usage_count = h.usage_count + 1
CREATE (p)-[:TAGGED]->(h)

// Extract and link mentions
WITH p, author
UNWIND $mentions AS username
MATCH (mentioned:User {username: username})
CREATE (p)-[:MENTIONS]->(mentioned)

RETURN p
```

{{< tabs >}}
{{< tab "Go" >}}
```go
import (
    "regexp"
    "strings"
)

type Post struct {
    ID         string
    Content    string
    MediaURLs  []string
    Visibility string
}

func extractHashtags(content string) []string {
    re := regexp.MustCompile(`#(\w+)`)
    matches := re.FindAllStringSubmatch(content, -1)
    hashtags := make([]string, len(matches))
    for i, match := range matches {
        hashtags[i] = strings.ToLower(match[1])
    }
    return hashtags
}

func extractMentions(content string) []string {
    re := regexp.MustCompile(`@(\w+)`)
    matches := re.FindAllStringSubmatch(content, -1)
    mentions := make([]string, len(matches))
    for i, match := range matches {
        mentions[i] = match[1]
    }
    return mentions
}

func CreatePost(ctx context.Context, db *sql.DB, authorID string, post Post) error {
    post.ID = uuid.New().String()
    hashtags := extractHashtags(post.Content)
    mentions := extractMentions(post.Content)

    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Create post
    _, err = tx.ExecContext(ctx, `
        MATCH (author:User {id: ?})
        CREATE (p:Post {
            id: ?,
            content: ?,
            visibility: ?,
            reply_count: 0,
            like_count: 0,
            share_count: 0,
            created_at: timestamp()
        })
        CREATE (author)-[:POSTED {timestamp: timestamp()}]->(p)
    `, authorID, post.ID, post.Content, post.Visibility)
    if err != nil {
        return err
    }

    // Link hashtags
    for _, tag := range hashtags {
        _, err = tx.ExecContext(ctx, `
            MATCH (p:Post {id: ?})
            MERGE (h:Hashtag {name: ?})
            ON CREATE SET h.usage_count = 1
            ON MATCH SET h.usage_count = h.usage_count + 1
            CREATE (p)-[:TAGGED]->(h)
        `, post.ID, tag)
        if err != nil {
            return err
        }
    }

    // Link mentions
    for _, username := range mentions {
        _, err = tx.ExecContext(ctx, `
            MATCH (p:Post {id: ?})
            MATCH (mentioned:User {username: ?})
            CREATE (p)-[:MENTIONS]->(mentioned)
        `, post.ID, username)
        // Ignore errors for non-existent users
    }

    return tx.Commit()
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
import re
from typing import List, Optional

def extract_hashtags(content: str) -> List[str]:
    """Extract hashtags from content."""
    return [tag.lower() for tag in re.findall(r'#(\w+)', content)]

def extract_mentions(content: str) -> List[str]:
    """Extract @mentions from content."""
    return re.findall(r'@(\w+)', content)

async def create_post(
    client,
    author_id: str,
    content: str,
    media_urls: Optional[List[str]] = None,
    visibility: str = "public"
) -> dict:
    """Create a new post with automatic hashtag and mention extraction."""
    post_id = str(uuid4())
    hashtags = extract_hashtags(content)
    mentions = extract_mentions(content)

    async with client.connection() as conn:
        await conn.begin()

        try:
            # Create the post
            await conn.execute("""
                MATCH (author:User {id: $author_id})
                CREATE (p:Post {
                    id: $post_id,
                    content: $content,
                    media_urls: $media_urls,
                    visibility: $visibility,
                    reply_count: 0,
                    like_count: 0,
                    share_count: 0,
                    created_at: timestamp()
                })
                CREATE (author)-[:POSTED {timestamp: timestamp()}]->(p)
            """, {
                "author_id": author_id,
                "post_id": post_id,
                "content": content,
                "media_urls": media_urls or [],
                "visibility": visibility
            })

            # Link hashtags
            for tag in hashtags:
                await conn.execute("""
                    MATCH (p:Post {id: $post_id})
                    MERGE (h:Hashtag {name: $tag})
                    ON CREATE SET h.usage_count = 1
                    ON MATCH SET h.usage_count = h.usage_count + 1
                    CREATE (p)-[:TAGGED]->(h)
                """, {"post_id": post_id, "tag": tag})

            # Link mentions
            for username in mentions:
                await conn.execute("""
                    MATCH (p:Post {id: $post_id})
                    MATCH (mentioned:User {username: $username})
                    CREATE (p)-[:MENTIONS]->(mentioned)
                """, {"post_id": post_id, "username": username})

            await conn.commit()

        except Exception as e:
            await conn.rollback()
            raise e

    return {
        "id": post_id,
        "content": content,
        "hashtags": hashtags,
        "mentions": mentions
    }
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
use regex::Regex;

fn extract_hashtags(content: &str) -> Vec<String> {
    let re = Regex::new(r"#(\w+)").unwrap();
    re.captures_iter(content)
        .map(|cap| cap[1].to_lowercase())
        .collect()
}

fn extract_mentions(content: &str) -> Vec<String> {
    let re = Regex::new(r"@(\w+)").unwrap();
    re.captures_iter(content)
        .map(|cap| cap[1].to_string())
        .collect()
}

async fn create_post(
    conn: &mut geode_client::Connection,
    author_id: &str,
    content: &str,
    visibility: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let post_id = Uuid::new_v4().to_string();
    let hashtags = extract_hashtags(content);
    let mentions = extract_mentions(content);

    conn.begin().await?;

    // Create post
    let mut params = HashMap::new();
    params.insert("author_id".to_string(), Value::string(author_id));
    params.insert("post_id".to_string(), Value::string(&post_id));
    params.insert("content".to_string(), Value::string(content));
    params.insert("visibility".to_string(), Value::string(visibility));

    conn.query_with_params(r#"
        MATCH (author:User {id: $author_id})
        CREATE (p:Post {
            id: $post_id,
            content: $content,
            visibility: $visibility,
            reply_count: 0,
            like_count: 0,
            share_count: 0,
            created_at: timestamp()
        })
        CREATE (author)-[:POSTED {timestamp: timestamp()}]->(p)
    "#, &params).await?;

    // Link hashtags
    for tag in &hashtags {
        let mut tag_params = HashMap::new();
        tag_params.insert("post_id".to_string(), Value::string(&post_id));
        tag_params.insert("tag".to_string(), Value::string(tag));

        conn.query_with_params(r#"
            MATCH (p:Post {id: $post_id})
            MERGE (h:Hashtag {name: $tag})
            ON CREATE SET h.usage_count = 1
            ON MATCH SET h.usage_count = h.usage_count + 1
            CREATE (p)-[:TAGGED]->(h)
        "#, &tag_params).await?;
    }

    // Link mentions
    for username in &mentions {
        let mut mention_params = HashMap::new();
        mention_params.insert("post_id".to_string(), Value::string(&post_id));
        mention_params.insert("username".to_string(), Value::string(username));

        let _ = conn.query_with_params(r#"
            MATCH (p:Post {id: $post_id})
            MATCH (mentioned:User {username: $username})
            CREATE (p)-[:MENTIONS]->(mentioned)
        "#, &mention_params).await;
    }

    conn.commit().await?;

    Ok(post_id)
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
function extractHashtags(content: string): string[] {
  const matches = content.match(/#(\w+)/g) || [];
  return matches.map(tag => tag.slice(1).toLowerCase());
}

function extractMentions(content: string): string[] {
  const matches = content.match(/@(\w+)/g) || [];
  return matches.map(mention => mention.slice(1));
}

async function createPost(
  client: Client,
  authorId: string,
  content: string,
  visibility: string = 'public'
): Promise<{ id: string; hashtags: string[]; mentions: string[] }> {
  const postId = uuidv4();
  const hashtags = extractHashtags(content);
  const mentions = extractMentions(content);

  await client.withTransaction(async (tx) => {
    // Create post
    await tx.exec(`
      MATCH (author:User {id: $author_id})
      CREATE (p:Post {
        id: $post_id,
        content: $content,
        visibility: $visibility,
        reply_count: 0,
        like_count: 0,
        share_count: 0,
        created_at: timestamp()
      })
      CREATE (author)-[:POSTED {timestamp: timestamp()}]->(p)
    `, { params: { author_id: authorId, post_id: postId, content, visibility } });

    // Link hashtags
    for (const tag of hashtags) {
      await tx.exec(`
        MATCH (p:Post {id: $post_id})
        MERGE (h:Hashtag {name: $tag})
        ON CREATE SET h.usage_count = 1
        ON MATCH SET h.usage_count = h.usage_count + 1
        CREATE (p)-[:TAGGED]->(h)
      `, { params: { post_id: postId, tag } });
    }

    // Link mentions
    for (const username of mentions) {
      await tx.exec(`
        MATCH (p:Post {id: $post_id})
        MATCH (mentioned:User {username: $username})
        CREATE (p)-[:MENTIONS]->(mentioned)
      `, { params: { post_id: postId, username } });
    }
  });

  return { id: postId, hashtags, mentions };
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const std = @import("std");
const geode = @import("geode_client");

fn extractHashtags(allocator: std.mem.Allocator, content: []const u8) !std.ArrayList([]const u8) {
    var hashtags = std.ArrayList([]const u8).init(allocator);

    var i: usize = 0;
    while (i < content.len) : (i += 1) {
        if (content[i] == '#') {
            const start = i + 1;
            var end = start;
            while (end < content.len and std.ascii.isAlphanumeric(content[end])) : (end += 1) {}
            if (end > start) {
                const tag = try allocator.dupe(u8, content[start..end]);
                try hashtags.append(tag);
            }
            i = end;
        }
    }

    return hashtags;
}

pub fn createPost(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
    author_id: []const u8,
    content: []const u8,
    visibility: []const u8,
) ![]const u8 {
    const post_id = uuid.v4();
    var hashtags = try extractHashtags(allocator, content);
    defer hashtags.deinit();

    // Begin transaction
    try client.sendBegin();
    _ = try client.receiveMessage(30000);

    // Create post
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("author_id", .{ .string = author_id });
    try params.put("post_id", .{ .string = &post_id });
    try params.put("content", .{ .string = content });
    try params.put("visibility", .{ .string = visibility });

    try client.sendRunGql(1,
        \\MATCH (author:User {id: $author_id})
        \\CREATE (p:Post {
        \\    id: $post_id,
        \\    content: $content,
        \\    visibility: $visibility,
        \\    reply_count: 0,
        \\    like_count: 0,
        \\    share_count: 0,
        \\    created_at: timestamp()
        \\})
        \\CREATE (author)-[:POSTED {timestamp: timestamp()}]->(p)
    , .{ .object = params });
    _ = try client.receiveMessage(30000);

    // Link hashtags
    for (hashtags.items) |tag| {
        var tag_params = std.json.ObjectMap.init(allocator);
        defer tag_params.deinit();
        try tag_params.put("post_id", .{ .string = &post_id });
        try tag_params.put("tag", .{ .string = tag });

        try client.sendRunGql(2,
            \\MATCH (p:Post {id: $post_id})
            \\MERGE (h:Hashtag {name: $tag})
            \\ON CREATE SET h.usage_count = 1
            \\ON MATCH SET h.usage_count = h.usage_count + 1
            \\CREATE (p)-[:TAGGED]->(h)
        , .{ .object = tag_params });
        _ = try client.receiveMessage(30000);
    }

    // Commit transaction
    try client.sendCommit();
    _ = try client.receiveMessage(30000);

    return &post_id;
}
```
{{< /tab >}}
{{< /tabs >}}

### Like Post

```gql
// Like a post
MATCH (user:User {id: $user_id})
MATCH (post:Post {id: $post_id})
WHERE NOT (user)-[:LIKES]->(post)
CREATE (user)-[:LIKES {timestamp: timestamp()}]->(post)
SET post.like_count = post.like_count + 1
RETURN post.like_count AS likes
```

### Add Comment

```gql
// Add comment to post
MATCH (author:User {id: $author_id})
MATCH (post:Post {id: $post_id})
CREATE (c:Comment {
  id: $comment_id,
  content: $content,
  like_count: 0,
  created_at: timestamp()
})
CREATE (author)-[:COMMENTED {timestamp: timestamp()}]->(c)
CREATE (c)-[:ON]->(post)
SET post.reply_count = post.reply_count + 1
RETURN c
```

## Feed Generation

### Home Feed

The home feed shows posts from users you follow, ordered by recency.

```gql
// Get home feed for user
MATCH (me:User {id: $user_id})-[:FOLLOWS]->(followed:User)
MATCH (followed)-[:POSTED]->(post:Post)
WHERE post.visibility IN ['public', 'friends']
OPTIONAL MATCH (post)<-[like:LIKES]-(me)
OPTIONAL MATCH (post)<-[:POSTED]-(author:User)
RETURN
  post.id AS id,
  post.content AS content,
  post.created_at AS created_at,
  post.like_count AS likes,
  post.reply_count AS replies,
  author.username AS author_username,
  author.display_name AS author_name,
  author.avatar_url AS author_avatar,
  CASE WHEN like IS NOT NULL THEN true ELSE false END AS liked_by_me
ORDER BY post.created_at DESC
LIMIT $limit
OFFSET $offset
```

{{< tabs >}}
{{< tab "Go" >}}
```go
type FeedItem struct {
    ID             string
    Content        string
    CreatedAt      time.Time
    Likes          int
    Replies        int
    AuthorUsername string
    AuthorName     string
    AuthorAvatar   string
    LikedByMe      bool
}

func GetHomeFeed(ctx context.Context, db *sql.DB, userID string, limit, offset int) ([]FeedItem, error) {
    rows, err := db.QueryContext(ctx, `
        MATCH (me:User {id: ?})-[:FOLLOWS]->(followed:User)
        MATCH (followed)-[:POSTED]->(post:Post)
        WHERE post.visibility IN ['public', 'friends']
        OPTIONAL MATCH (post)<-[like:LIKES]-(me)
        OPTIONAL MATCH (post)<-[:POSTED]-(author:User)
        RETURN
            post.id AS id,
            post.content AS content,
            post.created_at AS created_at,
            post.like_count AS likes,
            post.reply_count AS replies,
            author.username AS author_username,
            author.display_name AS author_name,
            author.avatar_url AS author_avatar,
            CASE WHEN like IS NOT NULL THEN true ELSE false END AS liked_by_me
        ORDER BY post.created_at DESC
        LIMIT ?
        OFFSET ?
    `, userID, limit, offset)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var feed []FeedItem
    for rows.Next() {
        var item FeedItem
        err := rows.Scan(
            &item.ID, &item.Content, &item.CreatedAt,
            &item.Likes, &item.Replies,
            &item.AuthorUsername, &item.AuthorName, &item.AuthorAvatar,
            &item.LikedByMe,
        )
        if err != nil {
            return nil, err
        }
        feed = append(feed, item)
    }

    return feed, nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
from dataclasses import dataclass
from datetime import datetime
from typing import List

@dataclass
class FeedItem:
    id: str
    content: str
    created_at: datetime
    likes: int
    replies: int
    author_username: str
    author_name: str
    author_avatar: str
    liked_by_me: bool

async def get_home_feed(
    client,
    user_id: str,
    limit: int = 20,
    offset: int = 0
) -> List[FeedItem]:
    """Get personalized home feed for a user."""
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (me:User {id: $user_id})-[:FOLLOWS]->(followed:User)
            MATCH (followed)-[:POSTED]->(post:Post)
            WHERE post.visibility IN ['public', 'friends']
            OPTIONAL MATCH (post)<-[like:LIKES]-(me)
            OPTIONAL MATCH (post)<-[:POSTED]-(author:User)
            RETURN
                post.id AS id,
                post.content AS content,
                post.created_at AS created_at,
                post.like_count AS likes,
                post.reply_count AS replies,
                author.username AS author_username,
                author.display_name AS author_name,
                author.avatar_url AS author_avatar,
                CASE WHEN like IS NOT NULL THEN true ELSE false END AS liked_by_me
            ORDER BY post.created_at DESC
            LIMIT $limit
            OFFSET $offset
        """, {"user_id": user_id, "limit": limit, "offset": offset})

        feed = []
        for row in result.rows:
            feed.append(FeedItem(
                id=row['id'].as_string,
                content=row['content'].as_string,
                created_at=row['created_at'].as_datetime,
                likes=row['likes'].as_int,
                replies=row['replies'].as_int,
                author_username=row['author_username'].as_string,
                author_name=row['author_name'].as_string,
                author_avatar=row['author_avatar'].as_string,
                liked_by_me=row['liked_by_me'].as_bool
            ))

        return feed
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
#[derive(Debug)]
struct FeedItem {
    id: String,
    content: String,
    created_at: i64,
    likes: i64,
    replies: i64,
    author_username: String,
    author_name: String,
    author_avatar: String,
    liked_by_me: bool,
}

async fn get_home_feed(
    conn: &mut geode_client::Connection,
    user_id: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<FeedItem>, Box<dyn std::error::Error>> {
    let mut params = HashMap::new();
    params.insert("user_id".to_string(), Value::string(user_id));
    params.insert("limit".to_string(), Value::int(limit));
    params.insert("offset".to_string(), Value::int(offset));

    let (page, _) = conn.query_with_params(r#"
        MATCH (me:User {id: $user_id})-[:FOLLOWS]->(followed:User)
        MATCH (followed)-[:POSTED]->(post:Post)
        WHERE post.visibility IN ['public', 'friends']
        OPTIONAL MATCH (post)<-[like:LIKES]-(me)
        OPTIONAL MATCH (post)<-[:POSTED]-(author:User)
        RETURN
            post.id AS id,
            post.content AS content,
            post.created_at AS created_at,
            post.like_count AS likes,
            post.reply_count AS replies,
            author.username AS author_username,
            author.display_name AS author_name,
            author.avatar_url AS author_avatar,
            CASE WHEN like IS NOT NULL THEN true ELSE false END AS liked_by_me
        ORDER BY post.created_at DESC
        LIMIT $limit
        OFFSET $offset
    "#, &params).await?;

    let mut feed = Vec::new();
    for row in &page.rows {
        feed.push(FeedItem {
            id: row.get("id").unwrap().as_string()?,
            content: row.get("content").unwrap().as_string()?,
            created_at: row.get("created_at").unwrap().as_int()?,
            likes: row.get("likes").unwrap().as_int()?,
            replies: row.get("replies").unwrap().as_int()?,
            author_username: row.get("author_username").unwrap().as_string()?,
            author_name: row.get("author_name").unwrap().as_string()?,
            author_avatar: row.get("author_avatar").unwrap().as_string()?,
            liked_by_me: row.get("liked_by_me").unwrap().as_bool()?,
        });
    }

    Ok(feed)
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
interface FeedItem {
  id: string;
  content: string;
  createdAt: Date;
  likes: number;
  replies: number;
  authorUsername: string;
  authorName: string;
  authorAvatar: string;
  likedByMe: boolean;
}

async function getHomeFeed(
  client: Client,
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<FeedItem[]> {
  const rows = await client.queryAll(`
    MATCH (me:User {id: $user_id})-[:FOLLOWS]->(followed:User)
    MATCH (followed)-[:POSTED]->(post:Post)
    WHERE post.visibility IN ['public', 'friends']
    OPTIONAL MATCH (post)<-[like:LIKES]-(me)
    OPTIONAL MATCH (post)<-[:POSTED]-(author:User)
    RETURN
      post.id AS id,
      post.content AS content,
      post.created_at AS created_at,
      post.like_count AS likes,
      post.reply_count AS replies,
      author.username AS author_username,
      author.display_name AS author_name,
      author.avatar_url AS author_avatar,
      CASE WHEN like IS NOT NULL THEN true ELSE false END AS liked_by_me
    ORDER BY post.created_at DESC
    LIMIT $limit
    OFFSET $offset
  `, { params: { user_id: userId, limit, offset } });

  return rows.map(row => ({
    id: row.get('id')?.asString ?? '',
    content: row.get('content')?.asString ?? '',
    createdAt: new Date(row.get('created_at')?.asNumber ?? 0),
    likes: row.get('likes')?.asNumber ?? 0,
    replies: row.get('replies')?.asNumber ?? 0,
    authorUsername: row.get('author_username')?.asString ?? '',
    authorName: row.get('author_name')?.asString ?? '',
    authorAvatar: row.get('author_avatar')?.asString ?? '',
    likedByMe: row.get('liked_by_me')?.asBool ?? false,
  }));
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const FeedItem = struct {
    id: []const u8,
    content: []const u8,
    created_at: i64,
    likes: i64,
    replies: i64,
    author_username: []const u8,
    author_name: []const u8,
    author_avatar: []const u8,
    liked_by_me: bool,
};

pub fn getHomeFeed(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
    user_id: []const u8,
    limit: i64,
    offset: i64,
) !std.ArrayList(FeedItem) {
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("user_id", .{ .string = user_id });
    try params.put("limit", .{ .integer = limit });
    try params.put("offset", .{ .integer = offset });

    try client.sendRunGql(1,
        \\MATCH (me:User {id: $user_id})-[:FOLLOWS]->(followed:User)
        \\MATCH (followed)-[:POSTED]->(post:Post)
        \\WHERE post.visibility IN ['public', 'friends']
        \\OPTIONAL MATCH (post)<-[like:LIKES]-(me)
        \\OPTIONAL MATCH (post)<-[:POSTED]-(author:User)
        \\RETURN
        \\    post.id AS id,
        \\    post.content AS content,
        \\    post.created_at AS created_at,
        \\    post.like_count AS likes,
        \\    post.reply_count AS replies,
        \\    author.username AS author_username,
        \\    author.display_name AS author_name,
        \\    author.avatar_url AS author_avatar,
        \\    CASE WHEN like IS NOT NULL THEN true ELSE false END AS liked_by_me
        \\ORDER BY post.created_at DESC
        \\LIMIT $limit
        \\OFFSET $offset
    , .{ .object = params });

    const schema = try client.receiveMessage(30000);
    defer allocator.free(schema);

    try client.sendPull(1, 1000);
    const result = try client.receiveMessage(30000);
    defer allocator.free(result);

    // Parse JSON result and build feed items
    var feed = std.ArrayList(FeedItem).init(allocator);
    // ... parse result JSON and populate feed ...

    return feed;
}
```
{{< /tab >}}
{{< /tabs >}}

### Trending Feed

```gql
// Get trending posts (most engagement in last 24 hours)
MATCH (post:Post)
WHERE post.created_at > timestamp() - duration('P1D')
WITH post,
     post.like_count + post.reply_count * 2 + post.share_count * 3 AS engagement
ORDER BY engagement DESC
LIMIT 50

MATCH (post)<-[:POSTED]-(author:User)
OPTIONAL MATCH (post)-[:TAGGED]->(hashtag:Hashtag)
RETURN
  post.id AS id,
  post.content AS content,
  post.created_at AS created_at,
  engagement,
  author.username AS author_username,
  author.display_name AS author_name,
  collect(DISTINCT hashtag.name) AS hashtags
ORDER BY engagement DESC
```

### User Timeline

```gql
// Get user's own posts and activity
MATCH (user:User {id: $user_id})

// Get posts
OPTIONAL MATCH (user)-[:POSTED]->(post:Post)
WITH user, collect({
  type: 'post',
  id: post.id,
  content: post.content,
  timestamp: post.created_at
}) AS posts

// Get likes
OPTIONAL MATCH (user)-[like:LIKES]->(liked_post:Post)<-[:POSTED]-(author:User)
WITH user, posts, collect({
  type: 'like',
  id: liked_post.id,
  content: liked_post.content,
  author: author.username,
  timestamp: like.timestamp
}) AS likes

// Combine and sort
WITH posts + likes AS activities
UNWIND activities AS activity
RETURN activity
ORDER BY activity.timestamp DESC
LIMIT $limit
```

## Friend Recommendations

### Friends of Friends

```gql
// Recommend users that your friends follow
MATCH (me:User {id: $user_id})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(suggestion:User)
WHERE NOT (me)-[:FOLLOWS]->(suggestion)
  AND NOT (me)-[:BLOCKS]-(suggestion)
  AND me <> suggestion
WITH suggestion, count(DISTINCT friend) AS mutual_friends
ORDER BY mutual_friends DESC
LIMIT 10

MATCH (suggestion)
OPTIONAL MATCH (suggestion)<-[:FOLLOWS]-(follower)
RETURN
  suggestion.id AS id,
  suggestion.username AS username,
  suggestion.display_name AS display_name,
  suggestion.avatar_url AS avatar_url,
  suggestion.bio AS bio,
  mutual_friends,
  count(DISTINCT follower) AS follower_count
ORDER BY mutual_friends DESC
```

{{< tabs >}}
{{< tab "Go" >}}
```go
type UserSuggestion struct {
    ID            string
    Username      string
    DisplayName   string
    AvatarURL     string
    Bio           string
    MutualFriends int
    FollowerCount int
}

func GetFriendRecommendations(ctx context.Context, db *sql.DB, userID string, limit int) ([]UserSuggestion, error) {
    rows, err := db.QueryContext(ctx, `
        MATCH (me:User {id: ?})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(suggestion:User)
        WHERE NOT (me)-[:FOLLOWS]->(suggestion)
          AND NOT (me)-[:BLOCKS]-(suggestion)
          AND me <> suggestion
        WITH suggestion, count(DISTINCT friend) AS mutual_friends
        ORDER BY mutual_friends DESC
        LIMIT ?

        MATCH (suggestion)
        OPTIONAL MATCH (suggestion)<-[:FOLLOWS]-(follower)
        RETURN
            suggestion.id AS id,
            suggestion.username AS username,
            suggestion.display_name AS display_name,
            suggestion.avatar_url AS avatar_url,
            suggestion.bio AS bio,
            mutual_friends,
            count(DISTINCT follower) AS follower_count
        ORDER BY mutual_friends DESC
    `, userID, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var suggestions []UserSuggestion
    for rows.Next() {
        var s UserSuggestion
        err := rows.Scan(&s.ID, &s.Username, &s.DisplayName, &s.AvatarURL,
                        &s.Bio, &s.MutualFriends, &s.FollowerCount)
        if err != nil {
            return nil, err
        }
        suggestions = append(suggestions, s)
    }

    return suggestions, nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
@dataclass
class UserSuggestion:
    id: str
    username: str
    display_name: str
    avatar_url: str
    bio: str
    mutual_friends: int
    follower_count: int

async def get_friend_recommendations(
    client,
    user_id: str,
    limit: int = 10
) -> List[UserSuggestion]:
    """Get friend recommendations based on mutual connections."""
    async with client.connection() as conn:
        result, _ = await conn.query("""
            MATCH (me:User {id: $user_id})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(suggestion:User)
            WHERE NOT (me)-[:FOLLOWS]->(suggestion)
              AND NOT (me)-[:BLOCKS]-(suggestion)
              AND me <> suggestion
            WITH suggestion, count(DISTINCT friend) AS mutual_friends
            ORDER BY mutual_friends DESC
            LIMIT $limit

            MATCH (suggestion)
            OPTIONAL MATCH (suggestion)<-[:FOLLOWS]-(follower)
            RETURN
                suggestion.id AS id,
                suggestion.username AS username,
                suggestion.display_name AS display_name,
                suggestion.avatar_url AS avatar_url,
                suggestion.bio AS bio,
                mutual_friends,
                count(DISTINCT follower) AS follower_count
            ORDER BY mutual_friends DESC
        """, {"user_id": user_id, "limit": limit})

        return [
            UserSuggestion(
                id=row['id'].as_string,
                username=row['username'].as_string,
                display_name=row['display_name'].as_string,
                avatar_url=row['avatar_url'].as_string,
                bio=row['bio'].as_string,
                mutual_friends=row['mutual_friends'].as_int,
                follower_count=row['follower_count'].as_int
            )
            for row in result.rows
        ]
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
#[derive(Debug)]
struct UserSuggestion {
    id: String,
    username: String,
    display_name: String,
    avatar_url: String,
    bio: String,
    mutual_friends: i64,
    follower_count: i64,
}

async fn get_friend_recommendations(
    conn: &mut geode_client::Connection,
    user_id: &str,
    limit: i64,
) -> Result<Vec<UserSuggestion>, Box<dyn std::error::Error>> {
    let mut params = HashMap::new();
    params.insert("user_id".to_string(), Value::string(user_id));
    params.insert("limit".to_string(), Value::int(limit));

    let (page, _) = conn.query_with_params(r#"
        MATCH (me:User {id: $user_id})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(suggestion:User)
        WHERE NOT (me)-[:FOLLOWS]->(suggestion)
          AND NOT (me)-[:BLOCKS]-(suggestion)
          AND me <> suggestion
        WITH suggestion, count(DISTINCT friend) AS mutual_friends
        ORDER BY mutual_friends DESC
        LIMIT $limit

        MATCH (suggestion)
        OPTIONAL MATCH (suggestion)<-[:FOLLOWS]-(follower)
        RETURN
            suggestion.id AS id,
            suggestion.username AS username,
            suggestion.display_name AS display_name,
            suggestion.avatar_url AS avatar_url,
            suggestion.bio AS bio,
            mutual_friends,
            count(DISTINCT follower) AS follower_count
        ORDER BY mutual_friends DESC
    "#, &params).await?;

    let mut suggestions = Vec::new();
    for row in &page.rows {
        suggestions.push(UserSuggestion {
            id: row.get("id").unwrap().as_string()?,
            username: row.get("username").unwrap().as_string()?,
            display_name: row.get("display_name").unwrap().as_string()?,
            avatar_url: row.get("avatar_url").unwrap().as_string()?,
            bio: row.get("bio").unwrap().as_string()?,
            mutual_friends: row.get("mutual_friends").unwrap().as_int()?,
            follower_count: row.get("follower_count").unwrap().as_int()?,
        });
    }

    Ok(suggestions)
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
interface UserSuggestion {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  mutualFriends: number;
  followerCount: number;
}

async function getFriendRecommendations(
  client: Client,
  userId: string,
  limit: number = 10
): Promise<UserSuggestion[]> {
  const rows = await client.queryAll(`
    MATCH (me:User {id: $user_id})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(suggestion:User)
    WHERE NOT (me)-[:FOLLOWS]->(suggestion)
      AND NOT (me)-[:BLOCKS]-(suggestion)
      AND me <> suggestion
    WITH suggestion, count(DISTINCT friend) AS mutual_friends
    ORDER BY mutual_friends DESC
    LIMIT $limit

    MATCH (suggestion)
    OPTIONAL MATCH (suggestion)<-[:FOLLOWS]-(follower)
    RETURN
      suggestion.id AS id,
      suggestion.username AS username,
      suggestion.display_name AS display_name,
      suggestion.avatar_url AS avatar_url,
      suggestion.bio AS bio,
      mutual_friends,
      count(DISTINCT follower) AS follower_count
    ORDER BY mutual_friends DESC
  `, { params: { user_id: userId, limit } });

  return rows.map(row => ({
    id: row.get('id')?.asString ?? '',
    username: row.get('username')?.asString ?? '',
    displayName: row.get('display_name')?.asString ?? '',
    avatarUrl: row.get('avatar_url')?.asString ?? '',
    bio: row.get('bio')?.asString ?? '',
    mutualFriends: row.get('mutual_friends')?.asNumber ?? 0,
    followerCount: row.get('follower_count')?.asNumber ?? 0,
  }));
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
const UserSuggestion = struct {
    id: []const u8,
    username: []const u8,
    display_name: []const u8,
    avatar_url: []const u8,
    bio: []const u8,
    mutual_friends: i64,
    follower_count: i64,
};

pub fn getFriendRecommendations(
    client: *geode.GeodeClient,
    allocator: std.mem.Allocator,
    user_id: []const u8,
    limit: i64,
) !std.ArrayList(UserSuggestion) {
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("user_id", .{ .string = user_id });
    try params.put("limit", .{ .integer = limit });

    try client.sendRunGql(1,
        \\MATCH (me:User {id: $user_id})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(suggestion:User)
        \\WHERE NOT (me)-[:FOLLOWS]->(suggestion)
        \\  AND NOT (me)-[:BLOCKS]-(suggestion)
        \\  AND me <> suggestion
        \\WITH suggestion, count(DISTINCT friend) AS mutual_friends
        \\ORDER BY mutual_friends DESC
        \\LIMIT $limit
        \\MATCH (suggestion)
        \\OPTIONAL MATCH (suggestion)<-[:FOLLOWS]-(follower)
        \\RETURN
        \\    suggestion.id AS id,
        \\    suggestion.username AS username,
        \\    suggestion.display_name AS display_name,
        \\    suggestion.avatar_url AS avatar_url,
        \\    suggestion.bio AS bio,
        \\    mutual_friends,
        \\    count(DISTINCT follower) AS follower_count
        \\ORDER BY mutual_friends DESC
    , .{ .object = params });

    _ = try client.receiveMessage(30000);
    try client.sendPull(1, 1000);
    const result = try client.receiveMessage(30000);
    defer allocator.free(result);

    var suggestions = std.ArrayList(UserSuggestion).init(allocator);
    // Parse result and populate suggestions
    return suggestions;
}
```
{{< /tab >}}
{{< /tabs >}}

### Similar Interests

```gql
// Recommend users who like similar content
MATCH (me:User {id: $user_id})-[:LIKES]->(post:Post)-[:TAGGED]->(hashtag:Hashtag)
WITH me, hashtag, count(post) AS my_interest
ORDER BY my_interest DESC
LIMIT 10

MATCH (hashtag)<-[:TAGGED]-(post:Post)<-[:LIKES]-(other:User)
WHERE other <> me
  AND NOT (me)-[:FOLLOWS]->(other)
  AND NOT (me)-[:BLOCKS]-(other)
WITH other, count(DISTINCT hashtag) AS shared_interests
ORDER BY shared_interests DESC
LIMIT 10

RETURN
  other.id AS id,
  other.username AS username,
  other.display_name AS display_name,
  shared_interests
```

## Activity Timeline

### User Notifications

```gql
// Get notifications for user
MATCH (me:User {id: $user_id})

// Someone followed me
OPTIONAL MATCH (follower:User)-[f:FOLLOWS]->(me)
WHERE f.since > $since
WITH me, collect({
  type: 'follow',
  actor_id: follower.id,
  actor_name: follower.username,
  timestamp: f.since
}) AS follow_notifications

// Someone liked my post
OPTIONAL MATCH (liker:User)-[l:LIKES]->(post:Post)<-[:POSTED]-(me)
WHERE l.timestamp > $since
WITH me, follow_notifications, collect({
  type: 'like',
  actor_id: liker.id,
  actor_name: liker.username,
  post_id: post.id,
  timestamp: l.timestamp
}) AS like_notifications

// Someone commented on my post
OPTIONAL MATCH (commenter:User)-[c:COMMENTED]->(comment:Comment)-[:ON]->(post:Post)<-[:POSTED]-(me)
WHERE c.timestamp > $since
WITH follow_notifications + like_notifications AS notifications, collect({
  type: 'comment',
  actor_id: commenter.id,
  actor_name: commenter.username,
  post_id: post.id,
  comment_id: comment.id,
  timestamp: c.timestamp
}) AS comment_notifications

// Someone mentioned me
OPTIONAL MATCH (author:User)-[:POSTED]->(post:Post)-[:MENTIONS]->(me)
WHERE post.created_at > $since
WITH notifications + comment_notifications AS all_notifs, collect({
  type: 'mention',
  actor_id: author.id,
  actor_name: author.username,
  post_id: post.id,
  timestamp: post.created_at
}) AS mention_notifications

// Combine all notifications
WITH all_notifs + mention_notifications AS notifications
UNWIND notifications AS n
RETURN n
ORDER BY n.timestamp DESC
LIMIT $limit
```

## Privacy Considerations

### Privacy-Aware Queries

```gql
// Check if user can view post
MATCH (viewer:User {id: $viewer_id})
MATCH (post:Post {id: $post_id})<-[:POSTED]-(author:User)
WHERE
  // Public posts visible to all
  post.visibility = 'public'
  OR
  // Friends-only posts visible to followers
  (post.visibility = 'friends' AND (viewer)-[:FOLLOWS]->(author))
  OR
  // Private posts only visible to author
  (post.visibility = 'private' AND viewer = author)
  // And not blocked
  AND NOT (viewer)-[:BLOCKS]-(author)
RETURN post, author
```

### Block User

```gql
// Block a user (also removes follow relationships)
MATCH (blocker:User {id: $blocker_id})
MATCH (blocked:User {id: $blocked_id})

// Remove any existing follows
OPTIONAL MATCH (blocker)-[f1:FOLLOWS]->(blocked)
DELETE f1

OPTIONAL MATCH (blocked)-[f2:FOLLOWS]->(blocker)
DELETE f2

// Create block relationship
CREATE (blocker)-[:BLOCKS {
  since: timestamp(),
  reason: $reason
}]->(blocked)

RETURN blocker.username, blocked.username
```

### Data Export (GDPR)

```gql
// Export all user data
MATCH (user:User {id: $user_id})

// Get user profile
WITH user, {
  profile: {
    id: user.id,
    username: user.username,
    email: user.email,
    display_name: user.display_name,
    bio: user.bio,
    created_at: user.created_at
  }
} AS data

// Get posts
OPTIONAL MATCH (user)-[:POSTED]->(post:Post)
WITH user, data, collect({
  id: post.id,
  content: post.content,
  created_at: post.created_at
}) AS posts

// Get comments
OPTIONAL MATCH (user)-[:COMMENTED]->(comment:Comment)
WITH user, data, posts, collect({
  id: comment.id,
  content: comment.content,
  created_at: comment.created_at
}) AS comments

// Get follows
OPTIONAL MATCH (user)-[:FOLLOWS]->(followed:User)
WITH user, data, posts, comments, collect(followed.username) AS following

OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(user)
WITH data, posts, comments, following, collect(follower.username) AS followers

RETURN {
  profile: data.profile,
  posts: posts,
  comments: comments,
  following: following,
  followers: followers
} AS user_data
```

## Performance at Scale

### Indexing Strategy

```gql
// Essential indexes for social networks
CREATE INDEX user_id ON :User(id)
CREATE INDEX user_username ON :User(username)
CREATE INDEX post_id ON :Post(id)
CREATE INDEX post_created_at ON :Post(created_at)
CREATE INDEX hashtag_name ON :Hashtag(name)

// Composite indexes for common queries
CREATE INDEX post_visibility_created ON :Post(visibility, created_at)
```

### Feed Caching Pattern

For high-traffic feeds, consider a materialized feed approach:

```gql
// Pre-compute feed items for active users
MATCH (user:User)
WHERE user.last_active > timestamp() - duration('P7D')

// Get their feed items
MATCH (user)-[:FOLLOWS]->(followed:User)-[:POSTED]->(post:Post)
WHERE post.created_at > timestamp() - duration('P1D')

// Store in feed cache
MERGE (feed:FeedCache {user_id: user.id})
SET feed.items = collect({
  post_id: post.id,
  author_id: followed.id,
  timestamp: post.created_at
})[0..100],
    feed.updated_at = timestamp()
```

### Pagination Best Practices

```gql
// Cursor-based pagination (more efficient than OFFSET)
MATCH (me:User {id: $user_id})-[:FOLLOWS]->(followed:User)
MATCH (followed)-[:POSTED]->(post:Post)
WHERE post.created_at < $cursor_timestamp
ORDER BY post.created_at DESC
LIMIT $limit
RETURN post.id, post.content, post.created_at
```

### Batch Operations

```gql
// Batch follow multiple users
UNWIND $user_ids AS followed_id
MATCH (me:User {id: $my_id})
MATCH (other:User {id: followed_id})
WHERE NOT (me)-[:FOLLOWS]->(other)
CREATE (me)-[:FOLLOWS {since: timestamp()}]->(other)
```

## Analytics Queries

### User Engagement

```gql
// Get user engagement metrics
MATCH (user:User {id: $user_id})
OPTIONAL MATCH (user)-[:POSTED]->(post:Post)
WITH user, count(post) AS post_count, sum(post.like_count) AS total_likes

OPTIONAL MATCH (user)-[:FOLLOWS]->(following)
WITH user, post_count, total_likes, count(following) AS following_count

OPTIONAL MATCH (follower)-[:FOLLOWS]->(user)
RETURN
  user.username,
  post_count,
  total_likes,
  following_count,
  count(follower) AS follower_count,
  CASE WHEN following_count > 0
       THEN toFloat(count(follower)) / following_count
       ELSE 0 END AS follower_ratio
```

### Content Performance

```gql
// Analyze post performance
MATCH (post:Post {id: $post_id})<-[:POSTED]-(author:User)
OPTIONAL MATCH (post)<-[:LIKES]-(liker:User)
WITH post, author, collect(liker) AS likers

OPTIONAL MATCH (post)<-[:ON]-(comment:Comment)<-[:COMMENTED]-(commenter:User)
WITH post, author, likers, collect(DISTINCT commenter) AS commenters

RETURN
  post.id,
  post.content,
  author.username AS author,
  size(likers) AS likes,
  size(commenters) AS unique_commenters,
  post.reply_count AS total_comments,
  post.share_count AS shares,
  duration.between(post.created_at, timestamp()).hours AS age_hours
```

## Next Steps

- [Recommendation Engine Guide](/guides/recommendations/) - Advanced recommendation algorithms
- [Query Performance Guide](/guides/query-performance/) - Optimize social network queries
- [High Availability Guide](/guides/high-availability/) - Scale your social network
- [Security Guide](/docs/security/) - Protect user data

## Resources

- [GQL Reference](/docs/gql-reference/)
- [Graph Modeling Guide](/guides/graph-modeling/)
- [Example Applications](https://gitlab.com/devnw/codepros/geode/examples)

---

**Questions?** Join our [community forum](https://forum.geodedb.com) to discuss social network implementations.
