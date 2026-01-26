---
title: "Use Case Guides"
description: "Practical guides to modeling and querying real-world domains in Geode, mapping features like embeddings, vector search, security, and analytics to business use cases"
weight: 10
tags:
  - use-cases
  - examples
  - applications
categories:
  - use-cases
keywords:
  - graph database fraud detection
  - recommendation system graph
  - knowledge graph database
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Use Case Guides

Real-world domain modeling patterns and implementation guides for common graph database applications.

## Available Use Cases

### [Fraud and Anomaly Detection](/docs/use-cases/fraud-detection)

Detect fraudulent transactions and anomalous behavior using graph patterns, ML embeddings, and real-time analytics.

**Key features used**:
- Graph algorithms (centrality, community detection)
- Real-time analytics with CDC
- Row-Level Security (RLS) for multi-tenant isolation
- Audit logging for compliance

**Suitable for**: Financial services, e-commerce, payment processing

### [Recommendation Systems](/docs/use-cases/recommendations)

Build personalized recommendation engines using collaborative filtering, embeddings, and vector similarity search.

**Key features used**:
- ML graph embeddings (Node2Vec, GraphSAGE)
- HNSW vector similarity search
- Graph traversal patterns
- Real-time updates

**Suitable for**: E-commerce, content platforms, social networks

### Knowledge Graphs

_(Coming soon)_ - Organize and query structured knowledge with semantic relationships, inference, and entity resolution.

**Key features used**:
- GQL pattern matching
- Full-text search with BM25
- Schema constraints
- Distributed query coordination

**Suitable for**: Enterprise search, data cataloging, research platforms

## Common Patterns

### Multi-Tenant Isolation

Use Row-Level Security (RLS) to isolate data by tenant:

```gql
-- Create RLS policy for tenant isolation
CREATE POLICY tenant_isolation ON Node
FOR SELECT
USING (tenant_id = current_user_tenant_id());

-- All queries automatically filtered by tenant
MATCH (n)
RETURN n;  -- Only returns nodes for current tenant
```

### Real-Time Updates

Combine CDC with webhooks for real-time processing:

```yaml
# cdc-config.yaml
cdc:
  enabled: true
  webhooks:
    - url: "https://analytics.example.com/process"
      events: ["node.created", "edge.created"]
```

### Vector Similarity Search

Use embeddings for similarity-based queries:

```gql
-- Find similar items
MATCH (item:Product)
WHERE vector_distance_cosine(item.embedding, $query_embedding) < 0.5
RETURN item.name, vector_distance_cosine(item.embedding, $query_embedding) AS similarity
ORDER BY similarity ASC
LIMIT 10;
```

## Next Steps

- [Fraud Detection Guide](/docs/use-cases/fraud-detection) - Complete fraud detection implementation
- [Recommendation Systems](/docs/use-cases/recommendations) - Build a recommendation engine
- [Graph Algorithms](/docs/analytics/graph-algorithms) - Algorithm reference and examples
- [Security Guide](/docs/security/overview) - Multi-tenancy and RLS configuration
