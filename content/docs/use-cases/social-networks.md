---
title: "Social Network Analysis"
description: "Build and analyze social networks with Geode: community detection, influence analysis, viral content tracking, and real-time engagement metrics"
keywords: ["social network", "community detection", "influence analysis", "viral content", "engagement metrics", "social graph", "PageRank", "network analysis", "friend recommendations"]
weight: 50
slug: "social-networks"
canonical: "https://geodedb.com/docs/use-cases/social-networks/"
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Social Network Analysis

Build scalable social networks with Geode for community detection, influence analysis, and real-time engagement tracking.

## Overview

Social networks model connections between people, organizations, and content. Geode's graph database provides natural support for social network analysis with efficient traversals, pattern matching, and real-time analytics.

### Key Capabilities

- **Community Detection**: Discover natural groupings and clusters
- **Influence Analysis**: Identify thought leaders and key influencers
- **Viral Content Tracking**: Monitor content spread through network
- **Friend Recommendations**: Suggest connections based on mutual friends
- **Engagement Metrics**: Track likes, shares, comments in real-time
- **Path Analysis**: Find degrees of separation, shortest paths

## Use Case Scenarios

### 1. Professional Networking Platform

**Challenge**: Connect professionals based on skills, interests, and connections

**Solution**: Build professional graph with:
- User profiles and skills
- Connection types (colleague, mentor, classmate)
- Companies and positions
- Endorsements and recommendations

**Benefits**:
- Smart connection suggestions
- Skill-based search
- Career path discovery
- Networking event recommendations

### 2. Content Distribution Network

**Challenge**: Track how content spreads through network

**Solution**: Model content propagation:
- Posts and shares
- Engagement (likes, comments, reactions)
- Viral coefficient tracking
- Influence chains

**Benefits**:
- Identify viral content early
- Detect trending topics
- Target influential users
- Optimize content strategy

### 3. Gaming and Social Platforms

**Challenge**: Build engaging social features for multiplayer games

**Solution**: Create social gaming graph:
- Players and friendships
- Teams and guilds
- Achievements and leaderboards
- In-game transactions

**Benefits**:
- Friend invites and referrals
- Team formation recommendations
- Social competitions
- Viral game mechanics

## Data Model

### User Profiles

```gql
CREATE GRAPH SocialNetwork;
USE SocialNetwork;

-- User nodes
CREATE
  (:User {
    id: 'u1',
    username: 'alice_dev',
    name: 'Alice Johnson',
    bio: 'Software engineer passionate about graphs',
    location: 'San Francisco, CA',
    joined: date('2022-01-15'),
    verified: true
  }),
  (:User {
    id: 'u2',
    username: 'bob_data',
    name: 'Bob Smith',
    bio: 'Data scientist | ML enthusiast',
    location: 'Seattle, WA',
    joined: date('2021-06-20'),
    verified: false
  });
```

### Relationships and Interactions

```gql
-- Friendship (bidirectional)
MATCH (alice:User {id: 'u1'}), (bob:User {id: 'u2'})
CREATE (alice)-[:FOLLOWS {since: timestamp()}]->(bob);

-- Close friends (stronger connection)
MATCH (alice:User {id: 'u1'}), (carol:User {id: 'u3'})
CREATE (alice)-[:CLOSE_FRIEND {
  since: timestamp(),
  interaction_score: 0.95
}]->(carol);

-- Professional connections
MATCH (alice:User {id: 'u1'}), (david:User {id: 'u4'})
CREATE (alice)-[:COLLEAGUE {
  company: 'TechCorp',
  start_date: date('2022-03-01'),
  department: 'Engineering'
}]->(david);
```

### Content and Engagement

```gql
-- Posts
CREATE
  (:Post {
    id: 'p1',
    content: 'Just launched my first graph database app!',
    timestamp: timestamp(),
    type: 'text',
    visibility: 'public'
  }),
  (:Post {
    id: 'p2',
    content: 'Check out this amazing graph visualization',
    timestamp: timestamp(),
    media_url: 'https://example.com/viz.png',
    type: 'image'
  });

-- Authorship
MATCH (alice:User {id: 'u1'}), (post:Post {id: 'p1'})
CREATE (alice)-[:POSTED {timestamp: timestamp()}]->(post);

-- Engagement
MATCH (bob:User {id: 'u2'}), (post:Post {id: 'p1'})
CREATE (bob)-[:LIKED {timestamp: timestamp()}]->(post);

MATCH (carol:User {id: 'u3'}), (post:Post {id: 'p1'})
CREATE (carol)-[:SHARED {
  timestamp: timestamp(),
  comment: 'This is awesome!'
}]->(post);
```

## Implementation Guide

### Step 1: Friend Recommendations

#### Mutual Friends Algorithm

```gql
-- Find users with mutual friends
MATCH (me:User {id: 'u1'})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(candidate:User)
WHERE NOT EXISTS((me)-[:FOLLOWS]->(candidate))
  AND candidate <> me
WITH candidate, count(DISTINCT mutual) AS mutual_count,
     collect(DISTINCT mutual.username) AS mutual_friends
RETURN candidate.id,
       candidate.username,
       candidate.name,
       mutual_count,
       mutual_friends
ORDER BY mutual_count DESC
LIMIT 10;
```

{{< tabs >}}
{{< tab "Go" >}}
```go
func getFriendRecommendations(ctx context.Context, db *sql.DB, userID string) ([]Recommendation, error) {
    rows, err := db.QueryContext(ctx, `
        MATCH (me:User {id: ?})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(candidate:User)
        WHERE NOT EXISTS((me)-[:FOLLOWS]->(candidate)) AND candidate <> me
        WITH candidate, count(DISTINCT mutual) AS mutual_count
        RETURN candidate.id, candidate.username, candidate.name, mutual_count
        ORDER BY mutual_count DESC
        LIMIT 10
    `, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var recommendations []Recommendation
    for rows.Next() {
        var r Recommendation
        rows.Scan(&r.ID, &r.Username, &r.Name, &r.MutualCount)
        recommendations = append(recommendations, r)
    }
    return recommendations, nil
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async def get_friend_recommendations(conn, user_id: str, limit: int = 10):
    page, _ = await conn.query("""
        MATCH (me:User {id: $user_id})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(candidate:User)
        WHERE NOT EXISTS((me)-[:FOLLOWS]->(candidate)) AND candidate <> me
        WITH candidate, count(DISTINCT mutual) AS mutual_count,
             collect(DISTINCT mutual.username) AS mutual_friends
        RETURN candidate.id, candidate.username, candidate.name,
               mutual_count, mutual_friends
        ORDER BY mutual_count DESC
        LIMIT $limit
    """, {"user_id": user_id, "limit": limit})

    return [
        {
            "id": row["candidate.id"].as_string,
            "username": row["candidate.username"].as_string,
            "mutual_count": row["mutual_count"].as_int,
            "mutual_friends": row["mutual_friends"].as_array
        }
        for row in page.rows
    ]
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
async fn get_friend_recommendations(conn: &mut Connection, user_id: &str) -> Result<Vec<Recommendation>> {
    let params = [("user_id", Value::string(user_id))].into();
    let (page, _) = conn.query_with_params(r#"
        MATCH (me:User {id: $user_id})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(candidate:User)
        WHERE NOT EXISTS((me)-[:FOLLOWS]->(candidate)) AND candidate <> me
        WITH candidate, count(DISTINCT mutual) AS mutual_count
        RETURN candidate.id, candidate.username, candidate.name, mutual_count
        ORDER BY mutual_count DESC
        LIMIT 10
    "#, &params).await?;

    let recommendations = page.rows.iter().map(|row| Recommendation {
        id: row.get("candidate.id").unwrap().as_string().unwrap(),
        username: row.get("candidate.username").unwrap().as_string().unwrap(),
        mutual_count: row.get("mutual_count").unwrap().as_int().unwrap() as i32,
    }).collect();

    Ok(recommendations)
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
async function getFriendRecommendations(userId: string, limit = 10) {
    const rows = await client.queryAll(`
        MATCH (me:User {id: $userId})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(candidate:User)
        WHERE NOT EXISTS((me)-[:FOLLOWS]->(candidate)) AND candidate <> me
        WITH candidate, count(DISTINCT mutual) AS mutualCount,
             collect(DISTINCT mutual.username) AS mutualFriends
        RETURN candidate.id, candidate.username, candidate.name,
               mutualCount, mutualFriends
        ORDER BY mutualCount DESC
        LIMIT $limit
    `, { params: { userId, limit } });

    return rows.map(row => ({
        id: row.get('candidate.id')?.asString,
        username: row.get('candidate.username')?.asString,
        mutualCount: row.get('mutualCount')?.asNumber,
        mutualFriends: row.get('mutualFriends')?.asArray?.map(v => v.asString)
    }));
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
fn getFriendRecommendations(client: *GeodeClient, allocator: std.mem.Allocator, user_id: []const u8) ![]Recommendation {
    // Build params JSON object
    var params = std.json.ObjectMap.init(allocator);
    defer params.deinit();
    try params.put("user_id", .{ .string = user_id });

    const query =
        \\MATCH (me:User {id: $user_id})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(candidate:User)
        \\WHERE NOT EXISTS((me)-[:FOLLOWS]->(candidate)) AND candidate <> me
        \\WITH candidate, count(DISTINCT mutual) AS mutual_count
        \\RETURN candidate.id, candidate.username, mutual_count
        \\ORDER BY mutual_count DESC LIMIT 10
    ;

    try client.sendRunGql(1, query, .{ .object = params });
    const schema = try client.receiveMessage(30000);
    allocator.free(schema);

    try client.sendPull(1, 1000);
    const result = try client.receiveMessage(30000);
    defer allocator.free(result);
    return parseRecommendations(allocator, result);
}
```
{{< /tab >}}
{{< /tabs >}}

#### Common Interests

```gql
-- Recommend based on shared interests
MATCH (me:User {id: 'u1'})-[:INTERESTED_IN]->(interest:Topic),
      (interest)<-[:INTERESTED_IN]-(candidate:User)
WHERE NOT EXISTS((me)-[:FOLLOWS]->(candidate))
  AND candidate <> me
WITH candidate, collect(DISTINCT interest.name) AS common_interests
WHERE size(common_interests) >= 2
RETURN candidate.username,
       common_interests,
       size(common_interests) AS match_score
ORDER BY match_score DESC
LIMIT 10;
```

### Step 2: Community Detection

#### Louvain Algorithm

```gql
-- Detect communities
CALL graph.louvain('SocialNetwork', {
  relationship_type: 'FOLLOWS',
  max_iterations: 10
})
YIELD node, community
WITH community, collect(node.username) AS members, count(*) AS size
ORDER BY size DESC
RETURN community, size, members[0..5] AS sample_members;
```

#### Label Propagation

```gql
-- Alternative community detection
CALL graph.labelPropagation('SocialNetwork', {
  relationship_type: 'FOLLOWS',
  max_iterations: 20
})
YIELD node, community
RETURN community, count(*) AS community_size
ORDER BY community_size DESC;
```

### Step 3: Influence Analysis

#### PageRank for Influence

```gql
-- Calculate user influence
CALL graph.pageRank('SocialNetwork', {
  relationship_type: 'FOLLOWS',
  iterations: 20,
  damping_factor: 0.85
})
YIELD node, score
RETURN node.username,
       node.name,
       score AS influence_score
ORDER BY influence_score DESC
LIMIT 20;
```

#### Betweenness Centrality

```gql
-- Find bridge users (connectors between communities)
CALL graph.betweennessCentrality('SocialNetwork', {
  relationship_type: 'FOLLOWS',
  normalized: true
})
YIELD node, score
RETURN node.username,
       score AS bridge_score
ORDER BY score DESC
LIMIT 20;
```

### Step 4: Viral Content Tracking

#### Track Content Spread

```gql
-- Find viral posts
MATCH (post:Post)<-[engagement]-(user:User)
WHERE type(engagement) IN ['LIKED', 'SHARED', 'COMMENTED']
WITH post, count(DISTINCT user) AS reach,
     count(CASE WHEN type(engagement) = 'SHARED' THEN 1 END) AS shares,
     count(CASE WHEN type(engagement) = 'LIKED' THEN 1 END) AS likes
RETURN post.id,
       post.content,
       reach,
       shares,
       likes,
       (shares * 1.0 / reach) AS viral_coefficient
ORDER BY viral_coefficient DESC, reach DESC
LIMIT 10;
```

#### Propagation Path Analysis

```gql
-- Trace how content spread
MATCH path = (original_poster:User)-[:POSTED]->(post:Post)<-[:SHARED*1..3]-(sharer:User)
RETURN original_poster.username AS author,
       post.content AS content,
       length(path) AS hops,
       [n IN nodes(path)[2..] | n.username] AS propagation_chain;
```

### Step 5: Engagement Metrics

#### Real-Time Engagement Dashboard

```gql
-- User engagement summary (last 24 hours)
MATCH (user:User {id: 'u1'})-[:POSTED]->(post:Post)
WHERE post.timestamp > timestamp() - (24 * 60 * 60 * 1000)
OPTIONAL MATCH (post)<-[:LIKED]-(liker:User)
OPTIONAL MATCH (post)<-[:SHARED]-(sharer:User)
OPTIONAL MATCH (post)<-[:COMMENTED]-(commenter:User)
RETURN user.username,
       count(DISTINCT post) AS posts,
       count(DISTINCT liker) AS total_likes,
       count(DISTINCT sharer) AS total_shares,
       count(DISTINCT commenter) AS total_comments;
```

#### Trending Topics

```gql
-- Find trending hashtags (last hour)
MATCH (post:Post)-[:TAGGED]->(tag:Hashtag)
WHERE post.timestamp > timestamp() - (60 * 60 * 1000)
WITH tag, count(DISTINCT post) AS post_count
ORDER BY post_count DESC
LIMIT 10
MATCH (tag)<-[:TAGGED]-(trending_post:Post)
WHERE trending_post.timestamp > timestamp() - (60 * 60 * 1000)
RETURN tag.name,
       post_count,
       collect(trending_post.content)[0..3] AS sample_posts;
```

## Advanced Patterns

### Graph Projections for Analysis

```gql
-- Create projection of strong connections only
CALL graph.project('StrongConnections', {
  node_filter: 'User',
  relationship_filter: 'CLOSE_FRIEND OR (FOLLOWS AND interaction_score > 0.7)'
})
YIELD graph_name, node_count, relationship_count;

-- Run algorithms on projection
CALL graph.pageRank('StrongConnections', {
  relationship_type: '*',
  iterations: 20
})
YIELD node, score
RETURN node.username, score
ORDER BY score DESC;
```

### Temporal Network Analysis

```gql
-- Find new connections in time window
MATCH (u1:User)-[f:FOLLOWS]->(u2:User)
WHERE f.since > timestamp() - (7 * 24 * 60 * 60 * 1000)  -- Last week
WITH u1, count(f) AS new_connections
ORDER BY new_connections DESC
LIMIT 10
RETURN u1.username, new_connections;

-- Analyze engagement over time
MATCH (user:User)-[:POSTED]->(post:Post)
WHERE post.timestamp > timestamp() - (30 * 24 * 60 * 60 * 1000)  -- Last month
WITH user,
     duration.between(datetime(post.timestamp), datetime()).days AS days_ago,
     post
WITH user, (days_ago / 7) AS week, count(post) AS posts_per_week
RETURN user.username,
       week,
       posts_per_week
ORDER BY user.username, week;
```

### Activity Streams

```gql
-- Generate personalized activity feed
MATCH (me:User {id: 'u1'})-[:FOLLOWS]->(friend:User)-[action]->(target)
WHERE type(action) IN ['POSTED', 'LIKED', 'SHARED', 'COMMENTED']
  AND action.timestamp > timestamp() - (24 * 60 * 60 * 1000)
WITH friend, action, target
ORDER BY action.timestamp DESC
LIMIT 50
RETURN {
  actor: friend.username,
  action: type(action),
  timestamp: action.timestamp,
  target: CASE
    WHEN target:Post THEN target.content
    WHEN target:User THEN target.username
    ELSE 'unknown'
  END
} AS activity;
```

## Real-Time Features

### Live Notifications

Poll for new notifications and display them to users.

{{< tabs >}}
{{< tab "Go" >}}
```go
func pollNotifications(ctx context.Context, db *sql.DB, userID string) {
    var lastSeen *int64
    ticker := time.NewTicker(2 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            rows, err := db.QueryContext(ctx, `
                MATCH (u:User {id: ?})<-[r]-()
                WHERE ? IS NULL OR r.timestamp > ?
                RETURN type(r) AS rel_type, r.timestamp AS ts
                ORDER BY ts DESC LIMIT 20
            `, userID, lastSeen, lastSeen)
            if err != nil {
                continue
            }

            for rows.Next() {
                var relType string
                var ts int64
                rows.Scan(&relType, &ts)

                switch relType {
                case "LIKED":
                    fmt.Println("Someone liked your post!")
                case "FOLLOWED":
                    fmt.Println("New follower!")
                case "COMMENTED":
                    fmt.Println("New comment!")
                }
                if lastSeen == nil || ts > *lastSeen {
                    lastSeen = &ts
                }
            }
            rows.Close()
        }
    }
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async def poll_notifications(user_id):
    last_seen = None
    async with client.connection() as conn:
        while True:
            page, _ = await conn.query("""
                MATCH (u:User {id: $user_id})<-[r]-()
                WHERE $last_seen IS NULL OR r.timestamp > $last_seen
                RETURN type(r) AS rel_type, r.timestamp AS ts
                ORDER BY ts DESC LIMIT 20
            """, {"user_id": user_id, "last_seen": last_seen})

            for row in page.rows:
                rel_type = row["rel_type"].raw_value
                if rel_type == "LIKED":
                    print("Someone liked your post!")
                elif rel_type == "FOLLOWED":
                    print("New follower!")
                elif rel_type == "COMMENTED":
                    print("New comment!")

            if page.rows:
                last_seen = page.rows[0]["ts"].raw_value
            await asyncio.sleep(2)
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
async fn poll_notifications(conn: &mut Connection, user_id: &str) -> Result<()> {
    let mut last_seen: Option<i64> = None;

    loop {
        let params = [
            ("user_id", Value::string(user_id)),
            ("last_seen", last_seen.map(Value::int).unwrap_or(Value::null())),
        ].into();

        let (page, _) = conn.query_with_params(r#"
            MATCH (u:User {id: $user_id})<-[r]-()
            WHERE $last_seen IS NULL OR r.timestamp > $last_seen
            RETURN type(r) AS rel_type, r.timestamp AS ts
            ORDER BY ts DESC LIMIT 20
        "#, &params).await?;

        for row in &page.rows {
            let rel_type = row.get("rel_type").unwrap().as_string()?;
            match rel_type.as_str() {
                "LIKED" => println!("Someone liked your post!"),
                "FOLLOWED" => println!("New follower!"),
                "COMMENTED" => println!("New comment!"),
                _ => {}
            }
            if let Some(ts) = row.get("ts").and_then(|v| v.as_int().ok()) {
                last_seen = Some(ts.max(last_seen.unwrap_or(0)));
            }
        }
        tokio::time::sleep(Duration::from_secs(2)).await;
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
async function pollNotifications(userId: string) {
    let lastSeen: number | null = null;

    while (true) {
        const rows = await client.queryAll(`
            MATCH (u:User {id: $userId})<-[r]-()
            WHERE $lastSeen IS NULL OR r.timestamp > $lastSeen
            RETURN type(r) AS relType, r.timestamp AS ts
            ORDER BY ts DESC LIMIT 20
        `, { params: { userId, lastSeen } });

        for (const row of rows) {
            const relType = row.get('relType')?.asString;
            switch (relType) {
                case 'LIKED': console.log('Someone liked your post!'); break;
                case 'FOLLOWED': console.log('New follower!'); break;
                case 'COMMENTED': console.log('New comment!'); break;
            }
            const ts = row.get('ts')?.asNumber;
            if (ts && (!lastSeen || ts > lastSeen)) lastSeen = ts;
        }

        await new Promise(r => setTimeout(r, 2000));
    }
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
fn pollNotifications(client: *GeodeClient, allocator: std.mem.Allocator, user_id: []const u8) !void {
    var last_seen: ?i64 = null;
    var request_id: u64 = 1;

    while (true) {
        var params = std.json.ObjectMap.init(allocator);
        defer params.deinit();
        try params.put("user_id", .{ .string = user_id });
        try params.put("last_seen", if (last_seen) |ts| .{ .integer = ts } else .null);

        const query =
            \\MATCH (u:User {id: $user_id})<-[r]-()
            \\WHERE $last_seen IS NULL OR r.timestamp > $last_seen
            \\RETURN type(r) AS rel_type, r.timestamp AS ts
            \\ORDER BY ts DESC LIMIT 20
        ;

        try client.sendRunGql(request_id, query, .{ .object = params });
        request_id += 1;
        const schema = try client.receiveMessage(30000);
        allocator.free(schema);

        try client.sendPull(request_id - 1, 1000);
        const result = try client.receiveMessage(30000);
        defer allocator.free(result);
        // Parse JSON and handle notifications

        std.time.sleep(2 * std.time.ns_per_s);
    }
}
```
{{< /tab >}}
{{< /tabs >}}

### Real-Time Feed Updates

{{< tabs >}}
{{< tab "Go" >}}
```go
func pollLiveFeed(ctx context.Context, db *sql.DB, userID string) {
    var lastSeen *int64
    for {
        rows, _ := db.QueryContext(ctx, `
            MATCH (me:User {id: ?})-[:FOLLOWS]->(friend:User)-[:POSTED]->(p:Post)
            WHERE ? IS NULL OR p.created_at > ?
            RETURN friend.username AS username, p.content AS content, p.created_at
            ORDER BY p.created_at DESC LIMIT 50
        `, userID, lastSeen, lastSeen)

        for rows.Next() {
            var username, content string
            var createdAt int64
            rows.Scan(&username, &content, &createdAt)
            fmt.Printf("New post from %s: %s\n", username, content)
            if lastSeen == nil || createdAt > *lastSeen {
                lastSeen = &createdAt
            }
        }
        rows.Close()
        time.Sleep(3 * time.Second)
    }
}
```
{{< /tab >}}
{{< tab "Python" >}}
```python
async def poll_live_feed(user_id):
    last_seen = None
    async with client.connection() as conn:
        while True:
            page, _ = await conn.query("""
                MATCH (me:User {id: $user_id})-[:FOLLOWS]->(friend:User)-[:POSTED]->(p:Post)
                WHERE $last_seen IS NULL OR p.created_at > $last_seen
                RETURN friend.username AS username, p.content AS content, p.created_at
                ORDER BY p.created_at DESC LIMIT 50
            """, {"user_id": user_id, "last_seen": last_seen})

            for row in page.rows:
                print(f"New post from {row['username'].raw_value}: {row['content'].raw_value}")

            if page.rows:
                last_seen = page.rows[0]["p.created_at"].raw_value
            await asyncio.sleep(3)
```
{{< /tab >}}
{{< tab "Rust" >}}
```rust
async fn poll_live_feed(conn: &mut Connection, user_id: &str) -> Result<()> {
    let mut last_seen: Option<i64> = None;

    loop {
        let params = [
            ("user_id", Value::string(user_id)),
            ("last_seen", last_seen.map(Value::int).unwrap_or(Value::null())),
        ].into();

        let (page, _) = conn.query_with_params(r#"
            MATCH (me:User {id: $user_id})-[:FOLLOWS]->(friend:User)-[:POSTED]->(p:Post)
            WHERE $last_seen IS NULL OR p.created_at > $last_seen
            RETURN friend.username AS username, p.content AS content, p.created_at
            ORDER BY p.created_at DESC LIMIT 50
        "#, &params).await?;

        for row in &page.rows {
            println!("New post from {}: {}",
                row.get("username").unwrap().as_string()?,
                row.get("content").unwrap().as_string()?);
        }
        tokio::time::sleep(Duration::from_secs(3)).await;
    }
}
```
{{< /tab >}}
{{< tab "Node.js" >}}
```typescript
async function pollLiveFeed(userId: string) {
    let lastSeen: number | null = null;

    while (true) {
        const rows = await client.queryAll(`
            MATCH (me:User {id: $userId})-[:FOLLOWS]->(friend:User)-[:POSTED]->(p:Post)
            WHERE $lastSeen IS NULL OR p.created_at > $lastSeen
            RETURN friend.username AS username, p.content AS content, p.created_at AS createdAt
            ORDER BY createdAt DESC LIMIT 50
        `, { params: { userId, lastSeen } });

        for (const row of rows) {
            console.log(`New post from ${row.get('username')?.asString}: ${row.get('content')?.asString}`);
            const ts = row.get('createdAt')?.asNumber;
            if (ts && (!lastSeen || ts > lastSeen)) lastSeen = ts;
        }
        await new Promise(r => setTimeout(r, 3000));
    }
}
```
{{< /tab >}}
{{< tab "Zig" >}}
```zig
fn pollLiveFeed(client: *GeodeClient, allocator: std.mem.Allocator, user_id: []const u8) !void {
    var last_seen: ?i64 = null;
    var request_id: u64 = 1;

    while (true) {
        var params = std.json.ObjectMap.init(allocator);
        defer params.deinit();
        try params.put("user_id", .{ .string = user_id });
        try params.put("last_seen", if (last_seen) |ts| .{ .integer = ts } else .null);

        const query =
            \\MATCH (me:User {id: $user_id})-[:FOLLOWS]->(friend:User)-[:POSTED]->(p:Post)
            \\WHERE $last_seen IS NULL OR p.created_at > $last_seen
            \\RETURN friend.username AS username, p.content AS content, p.created_at
            \\ORDER BY p.created_at DESC LIMIT 50
        ;

        try client.sendRunGql(request_id, query, .{ .object = params });
        request_id += 1;
        const schema = try client.receiveMessage(30000);
        allocator.free(schema);

        try client.sendPull(request_id - 1, 1000);
        const result = try client.receiveMessage(30000);
        defer allocator.free(result);
        // Process feed items and update last_seen

        std.time.sleep(3 * std.time.ns_per_s);
    }
}
```
{{< /tab >}}
{{< /tabs >}}

## Performance Optimization

### Indexing Strategy

```gql
-- Core indexes
CREATE INDEX user_id_idx ON User(id) USING hash;
CREATE INDEX user_username_idx ON User(username) USING hash;
CREATE INDEX post_timestamp_idx ON Post(timestamp) USING btree;

-- Composite indexes
CREATE INDEX user_location_verified_idx ON User(location, verified) USING btree;

-- Full-text search
CREATE INDEX user_bio_ft_idx ON User(bio, name) USING fulltext;
CREATE INDEX post_content_ft_idx ON Post(content) USING fulltext;
```

### Query Optimization

```gql
-- Use LIMIT to restrict results
MATCH (me:User {id: 'u1'})-[:FOLLOWS]->(friend:User)-[:POSTED]->(post:Post)
WHERE post.timestamp > timestamp() - (24 * 60 * 60 * 1000)
RETURN post
ORDER BY post.timestamp DESC
LIMIT 50;  -- Don't fetch more than needed

-- Use EXISTS for filtering
MATCH (user:User)
WHERE EXISTS((user)-[:FOLLOWS]->(:User {verified: true}))
RETURN user.username;
```

### Caching

```python
# Cache frequently accessed data
from geode_client import Client

client = Client(host="geode.example.com", port=3141)
profile_cache = {}
followers_cache = {}

async def get_user_profile(conn, user_id):
    """Cache user profiles"""
    if user_id in profile_cache:
        return profile_cache[user_id]

    page, _ = await conn.query("""
        MATCH (u:User {id: $id})
        RETURN u.username, u.name, u.bio, u.verified
    """, {'id': user_id})

    profile = page.rows[0] if page.rows else None
    profile_cache[user_id] = profile
    return profile

async def get_follower_count(conn, user_id):
    """Cache follower counts"""
    if user_id in followers_cache:
        return followers_cache[user_id]

    page, _ = await conn.query("""
        MATCH (:User {id: $id})<-[:FOLLOWS]-(follower)
        RETURN count(follower) AS count
    """, {'id': user_id})

    count = page.rows[0]["count"].raw_value if page.rows else 0
    followers_cache[user_id] = count
    return count

# Usage
# async with client.connection() as conn:
#     profile = await get_user_profile(conn, "u1")
#     count = await get_follower_count(conn, "u1")
```

## Metrics and KPIs

### Network Health Metrics

```gql
-- Average degree (connections per user)
MATCH (u:User)
OPTIONAL MATCH (u)-[:FOLLOWS]-()
WITH u, count(*) AS degree
RETURN avg(degree) AS avg_connections_per_user;

-- Network density
MATCH (u:User)
WITH count(u) AS total_users
MATCH ()-[f:FOLLOWS]->()
WITH total_users, count(f) AS total_edges
RETURN total_edges * 1.0 / (total_users * (total_users - 1)) AS network_density;

-- Clustering coefficient (how connected are friends of friends)
CALL graph.clusteringCoefficient('SocialNetwork', {
  relationship_type: 'FOLLOWS'
})
YIELD node, coefficient
RETURN avg(coefficient) AS avg_clustering_coefficient;
```

### Engagement KPIs

```gql
-- Daily Active Users (DAU)
MATCH (u:User)-[action]->()
WHERE action.timestamp > timestamp() - (24 * 60 * 60 * 1000)
  AND type(action) IN ['POSTED', 'LIKED', 'SHARED', 'COMMENTED']
RETURN count(DISTINCT u) AS dau;

-- Posts per active user
MATCH (u:User)-[:POSTED]->(p:Post)
WHERE p.timestamp > timestamp() - (24 * 60 * 60 * 1000)
WITH u, count(p) AS posts
RETURN avg(posts) AS avg_posts_per_active_user;

-- Viral coefficient (average shares per post)
MATCH (post:Post)<-[:SHARED]-(user)
WITH post, count(user) AS shares
RETURN avg(shares) AS avg_shares_per_post;
```

## Privacy and Security

### Content Visibility

```gql
-- Respect privacy settings
MATCH (viewer:User {id: 'u1'}), (author:User)-[:POSTED]->(post:Post)
WHERE (
  post.visibility = 'public'
  OR (post.visibility = 'friends' AND EXISTS((viewer)-[:FOLLOWS]->(author)))
  OR (post.visibility = 'private' AND viewer = author)
)
RETURN post;
```

### Block and Mute

```gql
-- Implement blocking
MATCH (blocker:User {id: 'u1'}), (blocked:User {id: 'u2'})
CREATE (blocker)-[:BLOCKED {timestamp: timestamp()}]->(blocked);

-- Filter blocked users from results
MATCH (me:User {id: 'u1'})-[:FOLLOWS]->(friend:User)-[:POSTED]->(post:Post)
WHERE NOT EXISTS((me)-[:BLOCKED]->(friend))
  AND NOT EXISTS((friend)-[:BLOCKED]->(me))
RETURN post;
```

## Complete Example: Twitter-Like Platform

```gql
-- Create users
CREATE
  (:User {id: 'u1', username: '@alice', followers: 0, following: 0}),
  (:User {id: 'u2', username: '@bob', followers: 0, following: 0}),
  (:User {id: 'u3', username: '@carol', followers: 0, following: 0});

-- Follow relationships
MATCH (alice:User {id: 'u1'}), (bob:User {id: 'u2'})
CREATE (alice)-[:FOLLOWS {since: timestamp()}]->(bob);

-- Create tweets
MATCH (bob:User {id: 'u2'})
CREATE (bob)-[:POSTED {timestamp: timestamp()}]->(:Tweet {
  id: 't1',
  content: 'Graph databases are amazing! #graphs #database',
  timestamp: timestamp(),
  retweets: 0,
  likes: 0
});

-- Like tweet
MATCH (alice:User {id: 'u1'}), (tweet:Tweet {id: 't1'})
CREATE (alice)-[:LIKED {timestamp: timestamp()}]->(tweet);

-- Retweet
MATCH (alice:User {id: 'u1'}), (original:Tweet {id: 't1'})
CREATE (alice)-[:RETWEETED {
  timestamp: timestamp(),
  comment: 'Totally agree!'
}]->(original);

-- Get personalized timeline
MATCH (me:User {id: 'u1'})-[:FOLLOWS]->(friend:User)-[posted:POSTED]->(tweet:Tweet)
WHERE posted.timestamp > timestamp() - (24 * 60 * 60 * 1000)
OPTIONAL MATCH (tweet)<-[:LIKED]-(liker)
OPTIONAL MATCH (tweet)<-[:RETWEETED]-(retweeter)
RETURN tweet.content,
       friend.username AS author,
       posted.timestamp,
       count(DISTINCT liker) AS likes,
       count(DISTINCT retweeter) AS retweets
ORDER BY posted.timestamp DESC
LIMIT 50;
```

## Next Steps

- [Graph Algorithms](/docs/analytics/graph-algorithms/) - Community detection, PageRank, centrality
- [Real-Time Analytics](/docs/analytics/real-time-analytics/) - Streaming analytics and CDC
- [Performance Tuning](/docs/performance/) - Optimize social network queries
- [Schema Design Guide](/docs/guides/schema-design/) - Model complex social relationships

## References

- [Data Model Guide](/docs/model/data-model-and-types/) - Property graph modeling
- [GQL Guide](/docs/gql/guide/) - Query language reference
- [Indexing Tutorial](/docs/tutorials/indexing-tutorial/) - Optimize query performance
- [Graph Algorithms Tutorial](/docs/tutorials/graph-algorithms-tutorial/) - Hands-on algorithm usage

---

**License**: Apache License 2.0
**Copyright**: 2024-2025 CodePros
**Last Updated**: January 2026
