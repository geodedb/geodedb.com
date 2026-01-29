---
title: "Multi-Tenancy - Shared Database Architecture"
description: "Implement multi-tenant architectures in Geode with row-level security, tenant isolation, and efficient resource sharing for SaaS applications."
keywords:
  - multi-tenancy
  - tenant isolation
  - SaaS
  - row-level security
  - shared database
  - data isolation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/multi-tenancy/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Multi-Tenancy in Geode

Multi-tenancy enables multiple customers (tenants) to share a single Geode deployment while maintaining strict data isolation. This architecture is fundamental for SaaS applications, reducing operational complexity and infrastructure costs.

## Multi-Tenancy Strategies

### Row-Level Security (RLS)

The preferred approach uses RLS policies to automatically filter data by tenant:

```gql
-- Add tenant_id to all tenant-scoped labels
CREATE CONSTRAINT tenant_required ON (n:Customer) ASSERT EXISTS(n.tenant_id);

-- Create RLS policy for tenant isolation
CREATE POLICY tenant_isolation ON Customer
FOR ALL
USING (tenant_id = current_setting('app.tenant_id'));

-- Enable RLS
ALTER LABEL Customer ENABLE ROW LEVEL SECURITY;
```

**Setting tenant context**:
```python
from geode_client import Client

async def query_as_tenant(tenant_id: str):
    client = Client(host="localhost", port=3141)
    async with client.connection() as conn:
        # Set tenant context for this session
        await conn.execute(
            "SET app.tenant_id = $tenant_id",
            {'tenant_id': tenant_id}
        )

        # All queries automatically filtered to this tenant
        result, _ = await conn.query("""
            MATCH (c:Customer)
            RETURN c.name, c.email
        """)
        # Only returns customers belonging to tenant_id
        return result
```

### Schema-Based Isolation

For stronger isolation, use separate schemas per tenant:

```gql
-- Create tenant-specific schema
CREATE SCHEMA tenant_acme;
CREATE SCHEMA tenant_globex;

-- Queries target specific schema
USE tenant_acme;
MATCH (c:Customer) RETURN c;
```

### Database-Level Isolation

Maximum isolation with separate databases:

```bash
# Create per-tenant databases
geode admin create-database --name tenant_acme
geode admin create-database --name tenant_globex
```

## Choosing an Approach

| Approach | Isolation | Efficiency | Complexity |
|----------|-----------|------------|------------|
| RLS | Logical | High | Low |
| Schema | Moderate | Medium | Medium |
| Database | Physical | Lower | Higher |

**RLS is recommended** for most SaaS applications, offering the best balance of isolation, efficiency, and operational simplicity.

## Implementation Patterns

**Tenant-aware connection middleware**:
```python
class TenantMiddleware:
    def __init__(self, client):
        self.client = client

    async def get_connection(self, tenant_id: str):
        conn = await self.client.connect()
        await conn.execute(
            "SET app.tenant_id = $tenant_id",
            {'tenant_id': tenant_id}
        )
        return conn
```

**Cross-tenant queries (admin only)**:
```gql
-- Bypass RLS for administrative queries
SET ROLE admin_bypass_rls;
MATCH (c:Customer)
RETURN c.tenant_id, count(*) AS customer_count
GROUP BY c.tenant_id;
```

## Best Practices

**Always include tenant_id**: Use constraints to ensure all tenant-scoped data includes the tenant identifier.

**Audit cross-tenant access**: Log any queries that bypass tenant isolation.

**Test isolation thoroughly**: Verify RLS policies prevent cross-tenant data access.

**Consider tenant-specific indexes**: For large tenants, partition indexes may improve performance.

## Related Topics

- [Row-Level Security](/tags/rls/)
- [Security](/tags/security/)
- [Authorization](/tags/authorization/)
- [Architecture](/tags/architecture/)
- [SaaS Patterns](/tags/patterns/)
