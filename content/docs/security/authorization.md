---
title: "Authorization"
description: "Configure authorization and access control in Geode including RBAC, ABAC, Row-Level Security (RLS), and fine-grained permissions"
url: /docs/security/authorization/
weight: 25
tags:
  - security
  - authorization
  - rbac
  - abac
  - rls
  - permissions
categories:
  - security
keywords:
  - authorization
  - permissions
  - RBAC
  - role-based access control
  - ABAC
  - attribute-based access control
  - RLS
  - row-level security
  - grants
  - privileges
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

# Authorization

Authorization (AuthZ) determines what authenticated users can access and perform in Geode. This guide covers role-based access control (RBAC), attribute-based access control (ABAC), row-level security (RLS), and fine-grained permissions.

## Overview

Geode provides layered authorization mechanisms:

| Layer | Mechanism | Granularity | Use Case |
|-------|-----------|-------------|----------|
| 1 | RBAC | Role-based | User groups, job functions |
| 2 | ABAC | Attribute-based | Dynamic policies, context-aware |
| 3 | RLS | Row-level | Multi-tenancy, data isolation |

**Authorization Flow**:

1. User authenticates (see [Authentication](/docs/security/authentication/))
2. System evaluates RBAC permissions
3. ABAC policies filter accessible resources
4. RLS policies filter accessible rows
5. Query executes with filtered scope

## Role-Based Access Control (RBAC)

RBAC assigns permissions to roles, then roles to users.

### Built-in Roles

Geode includes predefined roles:

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | Full system access | All operations |
| `dba` | Database administration | Schema, users, backup |
| `developer` | Development access | Read, write, schema (non-prod) |
| `analyst` | Read-only analytics | Read, execute procedures |
| `reader` | Read-only access | Read only |
| `writer` | Read and write access | Read, write |

### Creating Custom Roles

```gql
-- Create role
CREATE ROLE data_scientist;

-- Create role with description
CREATE ROLE compliance_officer
COMMENT 'Audit and compliance access';

-- List all roles
SHOW ROLES;

-- Show role details
DESCRIBE ROLE data_scientist;

-- Drop role
DROP ROLE data_scientist;
```

### Granting Permissions

**Permission Types**:

| Permission | Description |
|------------|-------------|
| `SELECT` | Read data (MATCH queries) |
| `INSERT` | Create nodes/relationships |
| `UPDATE` | Modify existing data |
| `DELETE` | Remove nodes/relationships |
| `EXECUTE` | Run stored procedures |
| `CREATE` | Create schema objects |
| `ALTER` | Modify schema objects |
| `DROP` | Delete schema objects |
| `GRANT` | Delegate permissions |
| `ADMIN` | Administrative operations |

**Grant Examples**:

```gql
-- Grant read access to specific graph
GRANT SELECT ON GRAPH SocialNetwork TO analyst;

-- Grant write access to specific node type
GRANT INSERT, UPDATE ON GRAPH SocialNetwork.Person TO writer;

-- Grant all data operations
GRANT SELECT, INSERT, UPDATE, DELETE ON GRAPH * TO developer;

-- Grant schema modification
GRANT CREATE, ALTER, DROP ON SCHEMA SocialNetwork TO dba;

-- Grant procedure execution
GRANT EXECUTE ON PROCEDURE analytics.* TO data_scientist;

-- Grant with grant
GRANT SELECT ON GRAPH SocialNetwork TO team_lead WITH GRANT OPTION;
```

### Revoking Permissions

```gql
-- Revoke specific permission
REVOKE INSERT ON GRAPH SocialNetwork.Person FROM writer;

-- Revoke all permissions on object
REVOKE ALL ON GRAPH SocialNetwork FROM developer;

-- Revoke role from user
REVOKE ROLE analyst FROM alice;

-- Revoke with cascade (revoke delegated permissions too)
REVOKE SELECT ON GRAPH SocialNetwork FROM team_lead CASCADE;
```

### Assigning Roles to Users

```gql
-- Grant role to user
GRANT ROLE analyst TO alice;

-- Grant multiple roles
GRANT ROLE analyst, reader TO bob;

-- Show user roles
SHOW ROLES FOR USER alice;

-- Revoke role from user
REVOKE ROLE analyst FROM alice;
```

### Role Hierarchy

Create role hierarchies for inheritance:

```gql
-- Create role hierarchy
CREATE ROLE senior_analyst;
GRANT ROLE analyst TO senior_analyst;  -- Inherits analyst permissions

-- Add additional permissions
GRANT EXECUTE ON PROCEDURE analytics.* TO senior_analyst;

-- Assign hierarchy role
GRANT ROLE senior_analyst TO charlie;
-- charlie now has: analyst permissions + procedure execution
```

## Attribute-Based Access Control (ABAC)

ABAC provides dynamic, context-aware authorization using attributes.

### Policy Components

ABAC policies evaluate:

- **Subject attributes**: User properties (department, clearance, location)
- **Resource attributes**: Data properties (classification, owner, type)
- **Action**: Operation being performed (SELECT, INSERT, etc.)
- **Environment**: Context (time, IP address, device)

### Creating ABAC Policies

```gql
-- Policy: Only Data Science department can access ML models
CREATE POLICY ml_model_access
FOR SELECT ON :MLModel
WHEN current_user.department = 'Data Science';

-- Policy: Clearance level requirement
CREATE POLICY classified_data_access
FOR SELECT ON :Document
WHEN current_user.clearance_level >= resource.classification_level;

-- Policy: Time-based access
CREATE POLICY business_hours_only
FOR SELECT ON :FinancialData
WHEN current_time BETWEEN '09:00:00' AND '17:00:00'
  AND current_day NOT IN ('Saturday', 'Sunday');

-- Policy: Geographic restriction
CREATE POLICY us_data_residency
FOR SELECT ON :Customer
WHEN resource.country = 'US'
  AND current_user.location_country = 'US';
```

### Policy Functions

Built-in functions for policy evaluation:

```gql
-- User context functions
current_user.username         -- Current username
current_user.roles            -- User's roles (array)
current_user.department       -- User department attribute
current_user.clearance_level  -- User clearance level
has_role('admin')             -- Check if user has role

-- Session context functions
current_session.ip_address    -- Client IP address
current_session.created_at    -- Session start time
current_session.mfa_verified  -- MFA status

-- Time functions
current_time                  -- Current time (HH:MM:SS)
current_date                  -- Current date (YYYY-MM-DD)
current_timestamp             -- Current timestamp
current_day                   -- Day of week name

-- Resource functions
resource.<property>           -- Access resource property
```

### Combining Policies

Multiple policies combine with AND logic:

```gql
-- Policy 1: Department check
CREATE POLICY dept_policy
FOR SELECT ON :SensitiveData
WHEN current_user.department = resource.owning_department;

-- Policy 2: Clearance check
CREATE POLICY clearance_policy
FOR SELECT ON :SensitiveData
WHEN current_user.clearance_level >= resource.classification;

-- Both policies must pass for access
-- User must be in correct department AND have sufficient clearance
```

### Policy Management

```gql
-- List all policies
SHOW POLICIES;

-- Show policies for specific type
SHOW POLICIES ON :Person;

-- Enable/disable policy
DISABLE POLICY dept_policy;
ENABLE POLICY dept_policy;

-- Drop policy
DROP POLICY ml_model_access;
```

## Row-Level Security (RLS)

RLS provides fine-grained access control at the row (node/relationship) level.

### RLS Overview

RLS policies are **transparent** to applications:

- Automatically applied to all queries
- No query rewriting needed
- Users see only permitted data
- Violations return empty results (not errors)

### Creating RLS Policies

**SELECT Policies** (control visibility):

```gql
-- Multi-tenant isolation
-- Person.tenant_id must equal the caller's 'tenant' principal attribute
CALL geode.rls.add_attribute_policy('app', 'Person', 'tenant_id', 'tenant');

-- Data ownership
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Document', 'access_tag', 'access_tag');

-- Classification-based access
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Record', 'access_tag', 'access_tag');
```

**INSERT Policies** (control creation):

```gql
-- Users can only create in their tenant
-- Person.tenant_id must equal the caller's 'tenant' principal attribute
CALL geode.rls.add_attribute_policy('app', 'Person', 'tenant_id', 'tenant');

-- Validate data on insert
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Document', 'access_tag', 'access_tag');
```

**UPDATE Policies** (control modification):

```gql
-- Users can only update their own data
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Profile', 'access_tag', 'access_tag');

-- Prevent modification of archived data
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Document', 'access_tag', 'access_tag');
```

**DELETE Policies** (control deletion):

```gql
-- Only owners or admins can delete
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Document', 'access_tag', 'access_tag');

-- Soft delete only (prevent hard delete)
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'AuditRecord', 'access_tag', 'access_tag');  -- Always deny hard delete
```

### RLS for Relationships

```gql
-- Relationship visibility based on node access
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Label', 'access_tag', 'access_tag');

-- Tenant isolation for relationships
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Label', 'access_tag', 'access_tag');
```

### RLS Context Variables

Set session context for RLS evaluation:

```gql
-- Set session variables
SET session.tenant_id = 'tenant-123';
SET session.user_department = 'Engineering';
SET session.clearance_level = 3;

-- Use in RLS policies
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Label', 'access_tag', 'access_tag');
```

**Client-Side Context Setting**:

```go
// Go client example
ctx := context.WithValue(ctx, "tenant_id", "tenant-123")
client.Query(ctx, "MATCH (n) RETURN n")
```

```python
# Python client example
async with client.session(tenant_id="tenant-123") as session:
    await session.run("MATCH (n) RETURN n")
```

### RLS Performance

RLS policies are optimized for performance:

```gql
-- View query plan with RLS
EXPLAIN MATCH (p:Person) WHERE p.age > 30 RETURN p;

-- Output shows RLS filter integration:
-- IndexScan (Person, age > 30)
--   └── RLS Filter (tenant_id = 'tenant-123')
--       └── Return
```

**Best Practices for RLS Performance**:

1. Index columns used in RLS policies
2. Use simple equality checks when possible
3. Avoid complex subqueries in policies
4. Test with EXPLAIN to verify index usage

## Permission Inheritance

### Graph-Level Permissions

```gql
-- Permission hierarchy:
-- DATABASE > GRAPH > LABEL > PROPERTY

-- Grant on database (all graphs)
GRANT SELECT ON DATABASE geodedb TO analyst;

-- Grant on graph (all labels)
GRANT SELECT ON GRAPH SocialNetwork TO analyst;

-- Grant on label (all properties)
GRANT SELECT ON GRAPH SocialNetwork.Person TO analyst;

-- Grant on property (specific columns)
GRANT SELECT (name, email) ON GRAPH SocialNetwork.Person TO analyst;
```

### Default Permissions

Configure default permissions for new objects:

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

## Effective Permissions

### Viewing Effective Permissions

```gql
-- Show effective permissions for current user
SHOW GRANTS;

-- Show permissions for specific user
SHOW GRANTS FOR USER alice;

-- Show permissions on specific object
SHOW GRANTS ON GRAPH SocialNetwork;

-- Detailed permission check
EXPLAIN SECURITY MATCH (p:Person) RETURN p;

-- Output:
-- Permission Check for: MATCH (p:Person) RETURN p
-- User: alice
-- Roles: analyst, reader
--
-- RBAC:
--   [ALLOW] SELECT on GRAPH SocialNetwork (via role: analyst)
--
-- ABAC:
--   [ALLOW] dept_policy: user.department = 'Analytics'
--
-- RLS:
--   [FILTER] tenant_isolation: tenant_id = 'tenant-123'
--
-- Effective: ALLOW with RLS filter
```

### Permission Precedence

1. **Explicit DENY** takes precedence over ALLOW
2. **More specific** permissions override general permissions
3. **Multiple ALLOW** permissions are combined (OR logic)
4. **RLS policies** are always applied after RBAC/ABAC

```gql
-- Explicit deny
DENY DELETE ON GRAPH SocialNetwork TO analyst;

-- This overrides any ALLOW from role inheritance
-- analyst cannot delete even if parent role allows it
```

## Audit and Compliance

### Authorization Audit Events

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS
```

**Sample Audit Log**:

```json
{
  "timestamp": "2026-01-28T14:30:00.123Z",
  "event_type": "access_denied",
  "user": "bob",
  "action": "DELETE",
  "resource": "SocialNetwork.Person",
  "reason": "insufficient_privileges",
  "required": "DELETE",
  "actual": "SELECT, INSERT",
  "trace_id": "abc123..."
}
```

### Compliance Reports

```bash
# Generate access report
geode query "SHOW GRANTS"
  --user alice \
  --output access-report.json

# Generate permission matrix
geode query "SHOW GRANTS"
  --graph SocialNetwork \
  --output permissions.csv

# Audit permission changes
geode query "CALL audit.get_recent_events(100)"
  --event-type permission_* \
  --since "2026-01-01" \
  --output audit.json
```

## Configuration Reference

### Complete Authorization Configuration

```yaml
# NOTE: `security:` is not a configuration-file section — it is ignored.
# KMS and encryption-at-rest are configured with environment variables:
#   GEODE_KMS_URL, GEODE_KMS_ENDPOINT, GEODE_KMS_API_KEY
#   GEODE_MASTER_KEY, GEODE_TDE_ENABLED, GEODE_ALLOW_LOCAL_KMS

    # Default deny (require explicit grants)
    default_deny: true

    # Cache settings
    cache:
      enabled: true
      ttl_seconds: 300
      max_entries: 10000

    # RBAC settings
    rbac:
      enabled: true
      role_hierarchy: true        # Enable role inheritance
      max_roles_per_user: 20

    # ABAC settings
    abac:
      enabled: true
      policy_evaluation_order: "most_specific_first"
      default_policy: "deny"

    # RLS settings
    rls:
      enabled: true
      bypass_roles:               # Roles that bypass RLS
        - admin
        - dba
      default_policy: "deny"      # Deny if no policy matches
```

## Best Practices

### RBAC Best Practices

1. **Use roles, not user-specific permissions**: Easier to manage and audit
2. **Create role hierarchy**: Inherit common permissions
3. **Principle of least privilege**: Grant minimum required permissions
4. **Regular access reviews**: Audit permissions quarterly
5. **Document role purposes**: Use COMMENT on role creation

### ABAC Best Practices

1. **Keep policies simple**: Complex policies are hard to debug
2. **Use meaningful attribute names**: Clear naming improves maintainability
3. **Test policies thoroughly**: Verify behavior with different contexts
4. **Monitor policy performance**: Avoid expensive computations
5. **Document policy rationale**: Explain why each policy exists

### RLS Best Practices

1. **Index RLS columns**: Performance critical for large datasets
2. **Use tenant isolation for multi-tenancy**: Standard pattern
3. **Test with multiple users**: Verify isolation works correctly
4. **Consider performance impact**: Simple policies perform better
5. **Combine with RBAC**: RLS filters what RBAC allows

## Troubleshooting

### Permission Denied

```bash
# Check effective permissions
geode query "SHOW GRANTS FOR USER alice"

# Explain security check
geode query "EXPLAIN SECURITY MATCH (p:Person) RETURN p" --as alice

# Check role membership
geode query "SHOW ROLES FOR USER alice"
```

### RLS Not Filtering

```bash
# Verify RLS is enabled
geode query "SHOW VERSION"| grep rls

# Check policy exists
geode query "SHOW POLICIES ON Person"

# Verify session context
geode query "SELECT session.tenant_id"
```

### Policy Conflicts

```bash
# List all policies affecting type
geode query "SHOW POLICIES ON :Person VERBOSE"

# Check policy evaluation order
# There is no `geode admin` subcommand. Geode's CLI is: serve, shell, query,
# lsp, backup, restore, migrate, auth, login, logout, user, role, tenant,
# policy, grant, revoke, completion, mcp.
```

## Related Documentation

- **[Authentication](/docs/security/authentication/)** - Authentication mechanisms
- **[Security Overview](/docs/security/overview/)** - Complete security architecture
- **[Audit Logging](/docs/ops/audit-logging/)** - Authorization audit trail
- **[Session Management](/docs/security/session-management/)** - Session-based context
- **[Multi-Datacenter Guide](/docs/guides/multi-datacenter/)** - Distributed authorization
