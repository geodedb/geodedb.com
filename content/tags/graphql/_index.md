---
title: "GraphQL Integration"
description: "Guide to integrating Geode with GraphQL including schema mapping, resolver implementation, query translation, mutation support, and real-time subscriptions for graph data."
keywords:
  - GraphQL
  - GraphQL integration
  - GraphQL schema
  - GraphQL resolvers
  - GQL to GraphQL
  - API gateway
  - Geode
  - graph database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/graphql/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# GraphQL Integration

While Geode uses ISO/IEC 39075:2024 Graph Query Language (GQL) as its native query language, it can be seamlessly integrated with GraphQL to provide a modern API layer for frontend applications. This integration enables developers to leverage GraphQL's type system and tooling while benefiting from Geode's powerful graph capabilities.

## GraphQL vs GQL

It's important to understand the distinction between GraphQL and GQL:

- **GraphQL**: An API query language and runtime for APIs, designed by Facebook for frontend-backend communication
- **GQL (Graph Query Language)**: An ISO standard database query language for property graph databases (ISO/IEC 39075:2024)

While they share similar names and both deal with graph structures, they serve different purposes. This guide shows how to integrate them effectively.

## Architecture Overview

A typical Geode + GraphQL architecture includes:

```
Frontend (React/Vue/Angular)
         ↓ (GraphQL Queries)
GraphQL Server (Apollo/Graphene)
         ↓ (Resolvers)
Geode Client Library
         ↓ (GQL Queries via QUIC)
Geode Database
```

The GraphQL server acts as an API gateway, translating GraphQL queries into GQL queries for Geode.

## Schema Mapping

### Geode Graph Model to GraphQL Schema

Map Geode's property graph model to GraphQL types:

**Geode Graph Model**:
```gql
// Node labels: User, Post, Comment
// Relationship types: AUTHORED, COMMENTED_ON, FOLLOWS

MATCH (u:User)-[:AUTHORED]->(p:Post)
RETURN u, p
```

**Corresponding GraphQL Schema**:
```graphql
type User {
  id: ID!
  username: String!
  email: String!
  createdAt: DateTime!

  # Relationships
  posts: [Post!]!
  comments: [Comment!]!
  followers: [User!]!
  following: [User!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  createdAt: DateTime!

  # Relationships
  author: User!
  comments: [Comment!]!
}

type Comment {
  id: ID!
  content: String!
  createdAt: DateTime!

  # Relationships
  author: User!
  post: Post!
}

type Query {
  user(id: ID!): User
  users(limit: Int, offset: Int): [User!]!
  post(id: ID!): Post
  posts(limit: Int, offset: Int): [Post!]!

  # Graph traversal queries
  userFriends(userId: ID!, depth: Int): [User!]!
  recommendedPosts(userId: ID!, limit: Int): [Post!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  createPost(input: CreatePostInput!): Post!
  createComment(input: CreateCommentInput!): Comment!
  followUser(userId: ID!, targetUserId: ID!): Boolean!
}

input CreateUserInput {
  username: String!
  email: String!
}

input CreatePostInput {
  authorId: ID!
  title: String!
  content: String!
}

input CreateCommentInput {
  authorId: ID!
  postId: ID!
  content: String!
}
```

## Resolver Implementation

### Node.js with Apollo Server

```javascript
const { ApolloServer } = require('apollo-server');
const { GeodeClient } = require('geode-client-node');

// Initialize Geode client
const geode = new GeodeClient('localhost:3141');

const resolvers = {
  Query: {
    user: async (_, { id }) => {
      const result = await geode.query(
        'MATCH (u:User {id: $id}) RETURN u',
        { id }
      );
      return result.data[0]?.u;
    },

    users: async (_, { limit = 10, offset = 0 }) => {
      const result = await geode.query(
        'MATCH (u:User) RETURN u SKIP $offset LIMIT $limit',
        { offset, limit }
      );
      return result.data.map(row => row.u);
    },

    userFriends: async (_, { userId, depth = 2 }) => {
      const result = await geode.query(
        `MATCH (u:User {id: $userId})-[:FOLLOWS*1..$depth]->(friend:User)
         RETURN DISTINCT friend`,
        { userId, depth }
      );
      return result.data.map(row => row.friend);
    },

    recommendedPosts: async (_, { userId, limit = 10 }) => {
      // Complex graph algorithm for recommendations
      const result = await geode.query(
        `MATCH (u:User {id: $userId})-[:FOLLOWS]->(friend:User)-[:AUTHORED]->(p:Post)
         WHERE NOT (u)-[:AUTHORED]->(p)
         RETURN p, COUNT(DISTINCT friend) AS score
         ORDER BY score DESC
         LIMIT $limit`,
        { userId, limit }
      );
      return result.data.map(row => row.p);
    }
  },

  Mutation: {
    createUser: async (_, { input }) => {
      const result = await geode.query(
        `CREATE (u:User {
           id: randomUUID(),
           username: $username,
           email: $email,
           createdAt: datetime()
         })
         RETURN u`,
        input
      );
      return result.data[0].u;
    },

    createPost: async (_, { input }) => {
      const result = await geode.query(
        `MATCH (author:User {id: $authorId})
         CREATE (p:Post {
           id: randomUUID(),
           title: $title,
           content: $content,
           createdAt: datetime()
         })
         CREATE (author)-[:AUTHORED]->(p)
         RETURN p`,
        input
      );
      return result.data[0].p;
    },

    followUser: async (_, { userId, targetUserId }) => {
      await geode.query(
        `MATCH (u:User {id: $userId}), (target:User {id: $targetUserId})
         MERGE (u)-[:FOLLOWS]->(target)`,
        { userId, targetUserId }
      );
      return true;
    }
  },

  // Field resolvers for relationships
  User: {
    posts: async (user) => {
      const result = await geode.query(
        'MATCH (u:User {id: $id})-[:AUTHORED]->(p:Post) RETURN p',
        { id: user.id }
      );
      return result.data.map(row => row.p);
    },

    followers: async (user) => {
      const result = await geode.query(
        'MATCH (follower:User)-[:FOLLOWS]->(u:User {id: $id}) RETURN follower',
        { id: user.id }
      );
      return result.data.map(row => row.follower);
    },

    following: async (user) => {
      const result = await geode.query(
        'MATCH (u:User {id: $id})-[:FOLLOWS]->(following:User) RETURN following',
        { id: user.id }
      );
      return result.data.map(row => row.following);
    }
  },

  Post: {
    author: async (post) => {
      const result = await geode.query(
        'MATCH (u:User)-[:AUTHORED]->(p:Post {id: $id}) RETURN u',
        { id: post.id }
      );
      return result.data[0]?.u;
    },

    comments: async (post) => {
      const result = await geode.query(
        'MATCH (c:Comment)-[:COMMENTED_ON]->(p:Post {id: $id}) RETURN c',
        { id: post.id }
      );
      return result.data.map(row => row.c);
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    // Pass authentication context
    userId: req.headers['x-user-id']
  })
});

server.listen().then(({ url }) => {
  console.log(`GraphQL server running at ${url}`);
});
```

### Python with Graphene

```python
import graphene
from geode_client import GeodeClient
from datetime import datetime
import asyncio

client = GeodeClient("localhost:3141")

class User(graphene.ObjectType):
    id = graphene.ID()
    username = graphene.String()
    email = graphene.String()
    created_at = graphene.DateTime()

    posts = graphene.List(lambda: Post)
    followers = graphene.List(lambda: User)
    following = graphene.List(lambda: User)

    async def resolve_posts(self, info):
        result = await client.execute(
            "MATCH (u:User {id: $id})-[:AUTHORED]->(p:Post) RETURN p",
            {"id": self.id}
        )
        return [Post(**row['p']) for row in result]

    async def resolve_followers(self, info):
        result = await client.execute(
            "MATCH (follower:User)-[:FOLLOWS]->(u:User {id: $id}) RETURN follower",
            {"id": self.id}
        )
        return [User(**row['follower']) for row in result]

class Post(graphene.ObjectType):
    id = graphene.ID()
    title = graphene.String()
    content = graphene.String()
    created_at = graphene.DateTime()

    author = graphene.Field(User)
    comments = graphene.List(lambda: Comment)

    async def resolve_author(self, info):
        result = await client.execute(
            "MATCH (u:User)-[:AUTHORED]->(p:Post {id: $id}) RETURN u",
            {"id": self.id}
        )
        return User(**result[0]['u']) if result else None

class Comment(graphene.ObjectType):
    id = graphene.ID()
    content = graphene.String()
    created_at = graphene.DateTime()
    author = graphene.Field(User)
    post = graphene.Field(Post)

class Query(graphene.ObjectType):
    user = graphene.Field(User, id=graphene.ID(required=True))
    users = graphene.List(User, limit=graphene.Int(), offset=graphene.Int())
    user_friends = graphene.List(
        User,
        user_id=graphene.ID(required=True),
        depth=graphene.Int()
    )

    async def resolve_user(self, info, id):
        result = await client.execute(
            "MATCH (u:User {id: $id}) RETURN u",
            {"id": id}
        )
        return User(**result[0]['u']) if result else None

    async def resolve_users(self, info, limit=10, offset=0):
        result = await client.execute(
            "MATCH (u:User) RETURN u SKIP $offset LIMIT $limit",
            {"offset": offset, "limit": limit}
        )
        return [User(**row['u']) for row in result]

    async def resolve_user_friends(self, info, user_id, depth=2):
        result = await client.execute(
            """MATCH (u:User {id: $user_id})-[:FOLLOWS*1..$depth]->(friend:User)
               RETURN DISTINCT friend""",
            {"user_id": user_id, "depth": depth}
        )
        return [User(**row['friend']) for row in result]

class CreateUserInput(graphene.InputObjectType):
    username = graphene.String(required=True)
    email = graphene.String(required=True)

class CreateUser(graphene.Mutation):
    class Arguments:
        input = CreateUserInput(required=True)

    user = graphene.Field(User)

    async def mutate(self, info, input):
        result = await client.execute(
            """CREATE (u:User {
                 id: randomUUID(),
                 username: $username,
                 email: $email,
                 createdAt: datetime()
               })
               RETURN u""",
            {"username": input.username, "email": input.email}
        )
        return CreateUser(user=User(**result[0]['u']))

class Mutation(graphene.ObjectType):
    create_user = CreateUser.Field()

schema = graphene.Schema(query=Query, mutation=Mutation)
```

## DataLoader Pattern for N+1 Prevention

Use DataLoader to batch and cache Geode queries:

```javascript
const DataLoader = require('dataloader');

// Batch load users by IDs
const userLoader = new DataLoader(async (userIds) => {
  const result = await geode.query(
    'MATCH (u:User) WHERE u.id IN $ids RETURN u.id AS id, u',
    { ids: userIds }
  );

  const userMap = new Map(
    result.data.map(row => [row.id, row.u])
  );

  return userIds.map(id => userMap.get(id));
});

// Batch load posts by user IDs
const postsByUserLoader = new DataLoader(async (userIds) => {
  const result = await geode.query(
    `MATCH (u:User)-[:AUTHORED]->(p:Post)
     WHERE u.id IN $ids
     RETURN u.id AS userId, COLLECT(p) AS posts`,
    { ids: userIds }
  );

  const postsMap = new Map(
    result.data.map(row => [row.userId, row.posts])
  );

  return userIds.map(id => postsMap.get(id) || []);
});

// Use in resolvers
const resolvers = {
  Post: {
    author: (post) => userLoader.load(post.authorId)
  },
  User: {
    posts: (user) => postsByUserLoader.load(user.id)
  }
};
```

## Real-time Subscriptions

Implement GraphQL subscriptions using Geode's change streams:

```javascript
const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();

// Listen to Geode change stream
async function startChangeStream() {
  const stream = await geode.changeStream({
    patterns: ['(n:Post)', '(n:Comment)']
  });

  for await (const change of stream) {
    if (change.label === 'Post' && change.operation === 'CREATE') {
      pubsub.publish('POST_CREATED', { postCreated: change.data });
    }
    if (change.label === 'Comment' && change.operation === 'CREATE') {
      pubsub.publish('COMMENT_ADDED', { commentAdded: change.data });
    }
  }
}

startChangeStream();

// GraphQL subscription types
const typeDefs = `
  type Subscription {
    postCreated: Post!
    commentAdded(postId: ID!): Comment!
  }
`;

const resolvers = {
  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterator(['POST_CREATED'])
    },

    commentAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['COMMENT_ADDED']),
        (payload, variables) => {
          return payload.commentAdded.postId === variables.postId;
        }
      )
    }
  }
};
```

## Pagination Patterns

### Offset-based Pagination

```graphql
type Query {
  posts(limit: Int, offset: Int): PostConnection!
}

type PostConnection {
  nodes: [Post!]!
  totalCount: Int!
  pageInfo: PageInfo!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
}
```

Implementation:
```javascript
posts: async (_, { limit = 10, offset = 0 }) => {
  const [dataResult, countResult] = await Promise.all([
    geode.query(
      'MATCH (p:Post) RETURN p SKIP $offset LIMIT $limit',
      { offset, limit }
    ),
    geode.query('MATCH (p:Post) RETURN COUNT(p) AS total')
  ]);

  const totalCount = countResult.data[0].total;
  const nodes = dataResult.data.map(row => row.p);

  return {
    nodes,
    totalCount,
    pageInfo: {
      hasNextPage: offset + limit < totalCount,
      hasPreviousPage: offset > 0
    }
  };
}
```

### Cursor-based Pagination (Relay)

```graphql
type Query {
  posts(first: Int, after: String): PostConnection!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
}

type PostEdge {
  node: Post!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}
```

Implementation:
```javascript
posts: async (_, { first = 10, after }) => {
  const afterClause = after
    ? `WHERE p.createdAt < datetime($after)`
    : '';

  const result = await geode.query(
    `MATCH (p:Post)
     ${afterClause}
     RETURN p
     ORDER BY p.createdAt DESC
     LIMIT ${first + 1}`,
    after ? { after } : {}
  );

  const posts = result.data.map(row => row.p);
  const hasNextPage = posts.length > first;
  const edges = posts.slice(0, first).map(post => ({
    node: post,
    cursor: post.createdAt
  }));

  return {
    edges,
    pageInfo: {
      hasNextPage,
      endCursor: edges[edges.length - 1]?.cursor
    }
  };
}
```

## Performance Optimization

### Query Complexity Analysis

Limit expensive graph traversals:

```javascript
const { createComplexityLimitRule } = require('graphql-validation-complexity');

const server = new ApolloServer({
  validationRules: [
    createComplexityLimitRule(1000, {
      scalarCost: 1,
      objectCost: 5,
      listFactor: 10
    })
  ]
});
```

### Field-level Caching

Cache expensive graph computations:

```javascript
const resolvers = {
  User: {
    recommendedFriends: async (user, _, { cache }) => {
      const cacheKey = `user:${user.id}:recommended`;

      let cached = await cache.get(cacheKey);
      if (cached) return cached;

      const result = await geode.query(
        `MATCH (u:User {id: $userId})-[:FOLLOWS*2..3]->(recommended:User)
         WHERE NOT (u)-[:FOLLOWS]->(recommended)
         RETURN recommended, COUNT(*) AS score
         ORDER BY score DESC
         LIMIT 10`,
        { userId: user.id }
      );

      const recommendations = result.data.map(row => row.recommended);
      await cache.set(cacheKey, recommendations, { ttl: 300 });

      return recommendations;
    }
  }
};
```

## Best Practices

1. **Schema Design**: Design GraphQL schema to match your frontend needs, not necessarily your Geode schema
2. **Batch Queries**: Use DataLoader to batch Geode queries and prevent N+1 problems
3. **Pagination**: Implement proper pagination for large result sets
4. **Caching**: Cache expensive graph computations at the resolver level
5. **Error Handling**: Translate Geode errors to appropriate GraphQL errors
6. **Monitoring**: Track resolver performance and Geode query execution time
7. **Security**: Implement depth and complexity limits to prevent abuse

## Related Topics

- [API Development](/tags/api/) - Complete API guide
- [Integration](/tags/integration/) - System integration patterns
- [Client Libraries](/tags/client-libraries/) - Native Geode clients
- [GQL Syntax](/tags/gql-syntax/) - Graph Query Language reference
- [Performance](/tags/performance/) - Query optimization

## Further Reading

- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Apollo Server Documentation](https://www.apollographql.com/docs/apollo-server/)
- [Graphene Documentation](https://docs.graphene-python.org/)
- [DataLoader Pattern](https://github.com/graphql/dataloader)
- [Geode Client Libraries](/docs/clients/) - Client integration guides
