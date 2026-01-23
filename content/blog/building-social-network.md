---
title: "Building a Social Network with Geode"
description: "A complete tutorial on building a social network application using Geode graph database"
date: 2024-02-15
author: "Tutorial Team"
tags: ["tutorial", "social-network", "real-world", "application"]
categories: ["blog", "tutorials"]
---

# Building a Social Network with Geode

Social networks are a natural fit for graph databases. In this comprehensive tutorial, we'll build a full-featured social network using Geode, covering everything from schema design to advanced features like friend recommendations.

## What We'll Build

By the end of this tutorial, you'll have:

- User profiles with posts and comments
- Friend connections and follower relationships
- Like and share functionality
- Friend recommendations algorithm
- Activity feed generation
- Privacy controls

## Prerequisites

- Geode server running (see [Quick Start](/guides/quick-start/))
- Basic knowledge of GQL
- Python 3.11+ or Go 1.24+ (for application code)

## Schema Design

Let's design our graph schema:

### Nodes

```gql
// Users
(:User {
  id: INTEGER,
  username: STRING,
  email: STRING,
  password_hash: STRING,
  display_name: STRING,
  bio: STRING,
  avatar_url: STRING,
  created_at: TIMESTAMP,
  last_seen: TIMESTAMP
})

// Posts
(:Post {
  id: INTEGER,
  content: STRING,
  image_url: STRING,
  created_at: TIMESTAMP,
  visibility: STRING  // "public", "friends", "private"
})

// Comments
(:Comment {
  id: INTEGER,
  content: STRING,
  created_at: TIMESTAMP
})

// Groups
(:Group {
  id: INTEGER,
  name: STRING,
  description: STRING,
  created_at: TIMESTAMP,
  privacy: STRING  // "public", "closed", "secret"
})
```

### Relationships

```gql
// Friendships (bidirectional)
(:User)-[:FRIENDS_WITH {since: TIMESTAMP}]->(:User)

// Following (directional)
(:User)-[:FOLLOWS {since: TIMESTAMP}]->(:User)

// Content creation
(:User)-[:POSTED {timestamp: TIMESTAMP}]->(:Post)
(:User)-[:COMMENTED {timestamp: TIMESTAMP}]->(:Comment)

// Content relationships
(:Comment)-[:ON]->(:Post)
(:Comment)-[:REPLY_TO]->(:Comment)

// Engagement
(:User)-[:LIKES {timestamp: TIMESTAMP}]->(:Post)
(:User)-[:LIKES {timestamp: TIMESTAMP}]->(:Comment)
(:User)-[:SHARED {timestamp: TIMESTAMP, caption: STRING}]->(:Post)

// Groups
(:User)-[:MEMBER_OF {joined: TIMESTAMP, role: STRING}]->(:Group)
(:Post)-[:IN_GROUP]->(:Group)
```

## Step 1: Create Schema Constraints

First, let's ensure data integrity:

```gql
// Unique constraints
CREATE CONSTRAINT user_id_unique ON :User(id) ASSERT UNIQUE
CREATE CONSTRAINT user_username_unique ON :User(username) ASSERT UNIQUE
CREATE CONSTRAINT user_email_unique ON :User(email) ASSERT UNIQUE
CREATE CONSTRAINT post_id_unique ON :Post(id) ASSERT UNIQUE
CREATE CONSTRAINT comment_id_unique ON :Comment(id) ASSERT UNIQUE
CREATE CONSTRAINT group_id_unique ON :Group(id) ASSERT UNIQUE

// Existence constraints
CREATE CONSTRAINT user_username_exists ON :User(username) ASSERT EXISTS
CREATE CONSTRAINT user_email_exists ON :User(email) ASSERT EXISTS
CREATE CONSTRAINT post_content_exists ON :Post(content) ASSERT EXISTS
```

## Step 2: Create Indexes

Optimize common queries:

```gql
// User lookups
CREATE INDEX user_username ON :User(username)
CREATE INDEX user_email ON :User(email)
CREATE INDEX user_created_at ON :User(created_at)

// Post queries
CREATE INDEX post_created_at ON :Post(created_at)
CREATE INDEX post_visibility ON :Post(visibility)

// Comment queries
CREATE INDEX comment_created_at ON :Comment(created_at)

// Full-text search
CREATE FULLTEXT INDEX user_search ON :User(username, display_name, bio)
CREATE FULLTEXT INDEX post_search ON :Post(content)
```

## Step 3: Sample Data

Let's create some sample data:

```gql
BEGIN

// Create users
CREATE (:User {
  id: 1,
  username: "alice",
  email: "alice@example.com",
  display_name: "Alice Johnson",
  bio: "Software engineer and coffee enthusiast",
  created_at: timestamp()
})

CREATE (:User {
  id: 2,
  username: "bob",
  email: "bob@example.com",
  display_name: "Bob Smith",
  bio: "Photographer and traveler",
  created_at: timestamp()
})

CREATE (:User {
  id: 3,
  username: "charlie",
  email: "charlie@example.com",
  display_name: "Charlie Davis",
  bio: "Designer and artist",
  created_at: timestamp()
})

// Create friendships
MATCH (alice:User {username: "alice"})
MATCH (bob:User {username: "bob"})
CREATE (alice)-[:FRIENDS_WITH {since: timestamp()}]->(bob)
CREATE (bob)-[:FRIENDS_WITH {since: timestamp()}]->(alice)

MATCH (bob:User {username: "bob"})
MATCH (charlie:User {username: "charlie"})
CREATE (bob)-[:FRIENDS_WITH {since: timestamp()}]->(charlie)
CREATE (charlie)-[:FRIENDS_WITH {since: timestamp()}]->(bob)

// Create posts
MATCH (alice:User {username: "alice"})
CREATE (alice)-[:POSTED {timestamp: timestamp()}]->(:Post {
  id: 1,
  content: "Just deployed my first app with Geode! 🚀",
  visibility: "public",
  created_at: timestamp()
})

MATCH (bob:User {username: "bob"})
CREATE (bob)-[:POSTED {timestamp: timestamp()}]->(:Post {
  id: 2,
  content: "Beautiful sunset at the beach today",
  image_url: "https://example.com/sunset.jpg",
  visibility: "public",
  created_at: timestamp()
})

// Create comments
MATCH (bob:User {username: "bob"})
MATCH (post:Post {id: 1})
CREATE (bob)-[:COMMENTED {timestamp: timestamp()}]->(comment:Comment {
  id: 1,
  content: "Congrats! How do you like it so far?",
  created_at: timestamp()
})
CREATE (comment)-[:ON]->(post)

// Create likes
MATCH (charlie:User {username: "charlie"})
MATCH (post:Post {id: 1})
CREATE (charlie)-[:LIKES {timestamp: timestamp()}]->(post)

COMMIT
```

## Step 4: Core Queries

### User Profile

```gql
MATCH (u:User {username: $username})
OPTIONAL MATCH (u)-[:FRIENDS_WITH]-(friend)
OPTIONAL MATCH (u)-[:POSTED]->(post)
RETURN u {
  .*,
  friend_count: count(DISTINCT friend),
  post_count: count(DISTINCT post)
} AS profile
```

### Activity Feed

```gql
// Get posts from user and their friends
MATCH (me:User {username: $my_username})
MATCH (me)-[:FRIENDS_WITH*0..1]-(friend)
MATCH (friend)-[posted:POSTED]->(post:Post)
WHERE post.visibility IN ["public", "friends"]

// Get engagement data
OPTIONAL MATCH (post)<-[like:LIKES]-(liker)
OPTIONAL MATCH (post)<-[:ON]-(comment)

// Return with engagement counts
RETURN post {
  .*,
  author: friend.username,
  author_name: friend.display_name,
  like_count: count(DISTINCT liker),
  comment_count: count(DISTINCT comment)
} AS feed_item

ORDER BY posted.timestamp DESC
LIMIT 50
```

### Friend Recommendations

```gql
// Find friends of friends who aren't already friends
MATCH (me:User {username: $my_username})-[:FRIENDS_WITH]-(friend)
MATCH (friend)-[:FRIENDS_WITH]-(suggestion)
WHERE NOT (me)-[:FRIENDS_WITH]-(suggestion)
  AND me <> suggestion

// Count mutual friends
WITH me, suggestion, count(friend) AS mutual_count

// Get common interests (groups, liked posts, etc.)
OPTIONAL MATCH (me)-[:MEMBER_OF]->(group)<-[:MEMBER_OF]-(suggestion)
WITH me, suggestion, mutual_count, count(DISTINCT group) AS common_groups

// Score and rank
RETURN suggestion {
  .*,
  mutual_friends: mutual_count,
  common_groups: common_groups,
  score: mutual_count * 2 + common_groups
} AS recommendation

ORDER BY score DESC
LIMIT 10
```

### Post with Comments

```gql
// Get post
MATCH (post:Post {id: $post_id})
MATCH (author)-[:POSTED]->(post)

// Get comments
OPTIONAL MATCH (post)<-[:ON]-(comment)<-[:COMMENTED]-(commenter)

// Get likes
OPTIONAL MATCH (post)<-[:LIKES]-(liker)

RETURN post {
  .*,
  author: author {.username, .display_name, .avatar_url},
  comments: collect(DISTINCT comment {
    .*,
    author: commenter {.username, .display_name, .avatar_url}
  }),
  likes: collect(DISTINCT liker {.username, .display_name}),
  like_count: count(DISTINCT liker),
  comment_count: count(DISTINCT comment)
} AS post_detail
```

### Mutual Friends

```gql
MATCH (me:User {username: $my_username})-[:FRIENDS_WITH]-(mutual)
MATCH (other:User {username: $other_username})-[:FRIENDS_WITH]-(mutual)

RETURN collect(mutual {.username, .display_name, .avatar_url}) AS mutual_friends
```

## Step 5: Application Code

### Python Example

```python
import asyncio
from datetime import datetime
from geode_client import GeodeClient

class SocialNetwork:
    def __init__(self, host: str, port: int):
        self.client = GeodeClient(host, port)

    async def create_user(self, username: str, email: str,
                          display_name: str, password_hash: str):
        """Create a new user"""
        result = await self.client.query(
            """
            CREATE (u:User {
              username: $username,
              email: $email,
              display_name: $display_name,
              password_hash: $password_hash,
              created_at: timestamp()
            })
            RETURN u
            """,
            params={
                "username": username,
                "email": email,
                "display_name": display_name,
                "password_hash": password_hash
            }
        )
        return await result.fetch_one()

    async def create_post(self, username: str, content: str,
                         visibility: str = "public"):
        """Create a new post"""
        result = await self.client.query(
            """
            MATCH (u:User {username: $username})
            CREATE (u)-[:POSTED {timestamp: timestamp()}]->(p:Post {
              content: $content,
              visibility: $visibility,
              created_at: timestamp()
            })
            RETURN p
            """,
            params={
                "username": username,
                "content": content,
                "visibility": visibility
            }
        )
        return await result.fetch_one()

    async def add_friend(self, user1: str, user2: str):
        """Create bidirectional friendship"""
        await self.client.query(
            """
            MATCH (u1:User {username: $user1})
            MATCH (u2:User {username: $user2})
            CREATE (u1)-[:FRIENDS_WITH {since: timestamp()}]->(u2)
            CREATE (u2)-[:FRIENDS_WITH {since: timestamp()}]->(u1)
            """,
            params={"user1": user1, "user2": user2}
        )

    async def get_feed(self, username: str, limit: int = 50):
        """Get activity feed for user"""
        result = await self.client.query(
            """
            MATCH (me:User {username: $username})
            MATCH (me)-[:FRIENDS_WITH*0..1]-(friend)
            MATCH (friend)-[posted:POSTED]->(post:Post)
            WHERE post.visibility IN ["public", "friends"]

            OPTIONAL MATCH (post)<-[like:LIKES]-(liker)
            OPTIONAL MATCH (post)<-[:ON]-(comment)

            RETURN post {
              .*,
              author: friend.username,
              author_name: friend.display_name,
              like_count: count(DISTINCT liker),
              comment_count: count(DISTINCT comment)
            } AS feed_item

            ORDER BY posted.timestamp DESC
            LIMIT $limit
            """,
            params={"username": username, "limit": limit}
        )

        feed = []
        async for row in result:
            feed.append(row["feed_item"])
        return feed

    async def get_recommendations(self, username: str, limit: int = 10):
        """Get friend recommendations"""
        result = await self.client.query(
            """
            MATCH (me:User {username: $username})-[:FRIENDS_WITH]-(friend)
            MATCH (friend)-[:FRIENDS_WITH]-(suggestion)
            WHERE NOT (me)-[:FRIENDS_WITH]-(suggestion)
              AND me <> suggestion

            WITH me, suggestion, count(friend) AS mutual_count

            OPTIONAL MATCH (me)-[:MEMBER_OF]->(group)<-[:MEMBER_OF]-(suggestion)

            RETURN suggestion {
              .*,
              mutual_friends: mutual_count,
              common_groups: count(DISTINCT group),
              score: mutual_count * 2 + count(DISTINCT group)
            } AS recommendation

            ORDER BY score DESC
            LIMIT $limit
            """,
            params={"username": username, "limit": limit}
        )

        recommendations = []
        async for row in result:
            recommendations.append(row["recommendation"])
        return recommendations

# Usage
async def main():
    network = SocialNetwork("localhost", 3141)

    # Create users
    await network.create_user(
        "alice", "alice@example.com",
        "Alice Johnson", "hash123"
    )

    # Create post
    await network.create_post(
        "alice",
        "Hello, Geode world!",
        "public"
    )

    # Add friends
    await network.add_friend("alice", "bob")

    # Get feed
    feed = await network.get_feed("alice")
    for post in feed:
        print(f"{post['author_name']}: {post['content']}")

    # Get recommendations
    recommendations = await network.get_recommendations("alice")
    for rec in recommendations:
        print(f"Suggested: {rec['display_name']} ({rec['mutual_friends']} mutual)")

asyncio.run(main())
```

### Go Example

```go
package main

import (
    "database/sql"
    "fmt"
    "log"
    _ "go.codepros.org/geode"
)

type SocialNetwork struct {
    db *sql.DB
}

func NewSocialNetwork(connStr string) (*SocialNetwork, error) {
    db, err := sql.Open("geode", connStr)
    if err != nil {
        return nil, err
    }
    return &SocialNetwork{db: db}, nil
}

func (sn *SocialNetwork) CreateUser(username, email, displayName, passwordHash string) error {
    _, err := sn.db.Exec(`
        CREATE (u:User {
            username: $1,
            email: $2,
            display_name: $3,
            password_hash: $4,
            created_at: timestamp()
        })
    `, username, email, displayName, passwordHash)
    return err
}

func (sn *SocialNetwork) CreatePost(username, content, visibility string) error {
    _, err := sn.db.Exec(`
        MATCH (u:User {username: $1})
        CREATE (u)-[:POSTED {timestamp: timestamp()}]->(p:Post {
            content: $2,
            visibility: $3,
            created_at: timestamp()
        })
    `, username, content, visibility)
    return err
}

func (sn *SocialNetwork) AddFriend(user1, user2 string) error {
    _, err := sn.db.Exec(`
        MATCH (u1:User {username: $1})
        MATCH (u2:User {username: $2})
        CREATE (u1)-[:FRIENDS_WITH {since: timestamp()}]->(u2)
        CREATE (u2)-[:FRIENDS_WITH {since: timestamp()}]->(u1)
    `, user1, user2)
    return err
}

type FeedItem struct {
    Content      string
    Author       string
    AuthorName   string
    LikeCount    int
    CommentCount int
}

func (sn *SocialNetwork) GetFeed(username string, limit int) ([]FeedItem, error) {
    rows, err := sn.db.Query(`
        MATCH (me:User {username: $1})
        MATCH (me)-[:FRIENDS_WITH*0..1]-(friend)
        MATCH (friend)-[posted:POSTED]->(post:Post)
        WHERE post.visibility IN ["public", "friends"]

        OPTIONAL MATCH (post)<-[like:LIKES]-(liker)
        OPTIONAL MATCH (post)<-[:ON]-(comment)

        RETURN post.content,
               friend.username,
               friend.display_name,
               count(DISTINCT liker),
               count(DISTINCT comment)

        ORDER BY posted.timestamp DESC
        LIMIT $2
    `, username, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var feed []FeedItem
    for rows.Next() {
        var item FeedItem
        err := rows.Scan(&item.Content, &item.Author, &item.AuthorName,
                         &item.LikeCount, &item.CommentCount)
        if err != nil {
            return nil, err
        }
        feed = append(feed, item)
    }
    return feed, nil
}

func main() {
    sn, err := NewSocialNetwork("geode://localhost:3141")
    if err != nil {
        log.Fatal(err)
    }
    defer sn.db.Close()

    // Create user
    err = sn.CreateUser("alice", "alice@example.com", "Alice Johnson", "hash123")
    if err != nil {
        log.Fatal(err)
    }

    // Create post
    err = sn.CreatePost("alice", "Hello, Geode world!", "public")
    if err != nil {
        log.Fatal(err)
    }

    // Get feed
    feed, err := sn.GetFeed("alice", 50)
    if err != nil {
        log.Fatal(err)
    }

    for _, item := range feed {
        fmt.Printf("%s: %s (%d likes, %d comments)\n",
            item.AuthorName, item.Content, item.LikeCount, item.CommentCount)
    }
}
```

## Advanced Features

### Privacy Controls

```gql
// Check if user can view post
MATCH (viewer:User {username: $viewer})
MATCH (post:Post {id: $post_id})
MATCH (author)-[:POSTED]->(post)

WHERE post.visibility = "public"
   OR (post.visibility = "friends"
       AND (viewer)-[:FRIENDS_WITH]-(author))
   OR (author.username = $viewer)

RETURN post
```

### Notifications

```gql
// Get notifications for user
MATCH (me:User {username: $username})

// Friend requests, likes, comments, etc.
OPTIONAL MATCH (other)-[action:LIKES|COMMENTED]->(content)<-[:POSTED|COMMENTED]-(me)
WHERE action.timestamp > $last_check

RETURN collect({
  type: type(action),
  from: other.username,
  content_id: content.id,
  timestamp: action.timestamp
}) AS notifications

ORDER BY timestamp DESC
```

### Block/Report

```gql
// Block user
MATCH (me:User {username: $my_username})
MATCH (blocked:User {username: $blocked_username})
CREATE (me)-[:BLOCKED {timestamp: timestamp()}]->(blocked)

// Hide blocked content in queries
MATCH (me:User {username: $username})
MATCH (me)-[:FRIENDS_WITH*0..1]-(friend)
WHERE NOT (me)-[:BLOCKED]->(friend)
MATCH (friend)-[:POSTED]->(post)
RETURN post
```

## Performance Optimization

### Caching Strategy

1. **Application Layer**: Cache user profiles, friend lists
2. **Query Results**: Cache feed queries for 1-5 minutes
3. **Computed Values**: Cache friend counts, post counts

### Pagination

```gql
// Cursor-based pagination
MATCH (me:User {username: $username})
MATCH (me)-[:FRIENDS_WITH*0..1]-(friend)
MATCH (friend)-[posted:POSTED]->(post:Post)
WHERE posted.timestamp < $cursor
ORDER BY posted.timestamp DESC
LIMIT $page_size

RETURN post, posted.timestamp AS cursor
```

## Testing

```python
import pytest
from social_network import SocialNetwork

@pytest.fixture
async def network():
    sn = SocialNetwork("localhost", 3141)
    yield sn
    # Cleanup
    await sn.client.query("MATCH (n) DETACH DELETE n")

@pytest.mark.asyncio
async def test_create_user(network):
    await network.create_user("test", "test@example.com", "Test User", "hash")

    result = await network.client.query(
        "MATCH (u:User {username: 'test'}) RETURN u"
    )
    user = await result.fetch_one()
    assert user is not None

@pytest.mark.asyncio
async def test_friend_recommendations(network):
    # Create test data
    await network.create_user("alice", "alice@example.com", "Alice", "hash1")
    await network.create_user("bob", "bob@example.com", "Bob", "hash2")
    await network.create_user("charlie", "charlie@example.com", "Charlie", "hash3")

    await network.add_friend("alice", "bob")
    await network.add_friend("bob", "charlie")

    # Get recommendations for alice
    recs = await network.get_recommendations("alice")

    # Should recommend charlie
    assert len(recs) == 1
    assert recs[0]["username"] == "charlie"
    assert recs[0]["mutual_friends"] == 1
```

## Deployment Considerations

### Database Setup

```bash
# Production configuration
docker run -d \
  --name geode-prod \
  -p 3141:3141 \
  -v /data/geode:/var/lib/geode \
  -e GEODE_MAX_CONNECTIONS=1000 \
  -e GEODE_CACHE_SIZE=4GB \
  geode:latest
```

### Monitoring

```gql
// Monitor slow queries
SHOW SLOW QUERIES

// Monitor index usage
SHOW INDEX STATS

// Monitor connection pool
SHOW CONNECTIONS
```

## Conclusion

We've built a complete social network with:
- User profiles and relationships
- Posts, comments, and likes
- Friend recommendations
- Activity feeds
- Privacy controls

The graph model makes these features natural and efficient. Geode's performance and GQL syntax keep the code clean and maintainable.

## Next Steps

- Add real-time features with WebSockets
- Implement search functionality
- Add group chat
- Build recommendation algorithms
- Scale to multiple nodes

## Resources

- [Complete Code](https://gitlab.com/devnw/codepros/geode/examples/social-network)
- [GQL Reference](/docs/gql-reference/)
- [Performance Guide](/guides/query-performance/)
- [Deployment Guide](/guides/production-deployment/)

---

**Questions?** Ask in our [community forum](https://forum.geodedb.com).
