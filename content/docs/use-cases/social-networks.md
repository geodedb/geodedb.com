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

<!-- CANARY: REQ=REQ-CLIENT-PY-001; FEATURE="PythonClientConnection"; ASPECT=HelloHandshake; STATUS=IMPL; OWNER=clients; UPDATED=2025-02-14 -->

```python
# Python client - Polling-based notifications
# (Current clients do not expose CDC streams; use polling or a custom CDC service.)
from geode_client import Client
import asyncio

client = Client(host="geode.example.com", port=3141)

async def poll_notifications(user_id):
    last_seen = None
    async with client.connection() as conn:
        while True:
            page, _ = await conn.query("""
                MATCH (u:User {id: $user_id})<-[r]-()
                WHERE $last_seen IS NULL OR r.timestamp > $last_seen
                RETURN type(r) AS rel_type, r.timestamp AS ts
                ORDER BY ts DESC
                LIMIT 20
            """, {"user_id": user_id, "last_seen": last_seen})

            for row in page.rows:
                rel_type = row["rel_type"].raw_value
                if rel_type == "LIKED":
                    print("Someone liked your post!")
                elif rel_type == "FOLLOWED":
                    print("New follower!")
                elif rel_type == "COMMENTED":
                    print("New comment on your post")

            if page.rows:
                last_seen = page.rows[0]["ts"].raw_value

            await asyncio.sleep(2)

asyncio.run(poll_notifications("u1"))
```

### Real-Time Feed Updates

```python
# Poll for new posts from followed users
async def poll_live_feed(user_id):
    last_seen = None
    async with client.connection() as conn:
        while True:
            page, _ = await conn.query("""
                MATCH (me:User {id: $user_id})-[:FOLLOWS]->(friend:User)
                      -[:POSTED]->(p:Post)
                WHERE $last_seen IS NULL OR p.created_at > $last_seen
                RETURN friend.username AS username, p.content AS content, p.created_at AS created_at
                ORDER BY p.created_at DESC
                LIMIT 50
            """, {"user_id": user_id, "last_seen": last_seen})

            for row in page.rows:
                username = row["username"].raw_value
                content = row["content"].raw_value
                print(f"New post from {username}: {content}")

            if page.rows:
                last_seen = page.rows[0]["created_at"].raw_value

            await asyncio.sleep(3)
```

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
