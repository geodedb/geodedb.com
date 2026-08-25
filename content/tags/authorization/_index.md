---
title: "Authorization and Access Control"
description: "Comprehensive guide to authorization in Geode. Learn about permission management, privilege hierarchies, access control mechanisms, and implementing secure authorization policies for graph database operations."
keywords:
  - authorization
  - access control
  - permissions
  - privileges
  - grants
  - deny
  - security policies
  - graph security
  - data protection
  - Geode
  - graph database
  - enterprise security
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/authorization/"
    noindex: false
    title: "Authorization and Access Control - Geode Graph Database"
    description: "Control access to your graph data with Geode's comprehensive authorization system. Fine-grained permissions, privilege hierarchies, and secure access policies for enterprise deployments."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

Authorization in Geode provides comprehensive control over who can access your graph data and what operations they can perform. Building on authentication (verifying identity), authorization determines what authenticated users are permitted to do within the database. Geode implements a multi-layered authorization system combining role-based access control (RBAC), object-level permissions, and row-level security (RLS) to deliver enterprise-grade access management.

## Authorization Architecture

Geode's authorization system operates at multiple levels to provide defense-in-depth:

- **System Level**: Controls server administration, user management, and global operations
- **Graph Level**: Controls access to entire graphs (create, read, write, delete)
- **Label Level**: Controls access to specific node and relationship types
- **Property Level**: Controls access to individual properties within nodes and relationships
- **Row Level**: Controls access to specific data rows based on runtime conditions

Authorization decisions are evaluated in order, with more specific rules taking precedence over general rules.

## Permission Types

Geode supports the following permission types:

### Data Permissions

```gql
-- SELECT: Read data from nodes, relationships, and properties
GRANT SELECT ON GRAPH social_network TO analyst;

-- INSERT: Create new nodes and relationships
GRANT INSERT ON :User TO application_service;

-- UPDATE: Modify existing properties
GRANT UPDATE ON :User TO user_management;

-- DELETE: Remove nodes, relationships, or properties
GRANT DELETE ON :TempData TO cleanup_service;

-- MERGE: Create or update data (combines INSERT and UPDATE)
GRANT MERGE ON :Session TO session_manager;
```

### Schema Permissions

```gql
-- CREATE: Create new graphs, labels, or constraints
GRANT CREATE GRAPH TO schema_admin;
GRANT CREATE CONSTRAINT TO developer;

-- ALTER: Modify schema definitions
GRANT ALTER ON GRAPH analytics TO data_architect;

-- DROP: Remove schema elements
GRANT DROP CONSTRAINT TO schema_admin;
```

### Administrative Permissions

```gql
-- ADMIN: Full administrative access
GRANT ADMIN ON DATABASE TO dba_team;

-- EXECUTE: Execute stored procedures and functions
GRANT EXECUTE ON PROCEDURE export_data TO analyst;

-- BACKUP: Create and restore backups
GRANT BACKUP ON DATABASE TO backup_service;
```

## Granting Permissions

Permissions are granted using the `GRANT` statement. Permissions can be granted to users directly or to roles (recommended).

### Basic Grant Syntax

```gql
-- Grant to a user
GRANT SELECT ON GRAPH customers TO alice;

-- Grant to a role
GRANT SELECT, INSERT ON GRAPH customers TO data_entry;

-- Grant multiple permissions at once
GRANT SELECT, INSERT, UPDATE, DELETE ON GRAPH inventory TO warehouse_manager;
```

### Granting with Grant Option

Allow recipients to further grant the permission to others:

```gql
-- Alice can grant SELECT to other users
GRANT SELECT ON GRAPH customers TO alice WITH GRANT OPTION;

-- Team lead can delegate permissions
GRANT INSERT ON :Order TO team_lead WITH GRANT OPTION;
```

### Granting All Permissions

```gql
-- Grant all data permissions on a graph
GRANT ALL ON GRAPH analytics TO data_scientist;

-- Grant all permissions on specific labels
GRANT ALL ON :Product, :Category TO product_manager;
```

## Denying Permissions

The `DENY` statement explicitly prevents access, overriding any granted permissions:

```gql
-- Prevent access to sensitive data
DENY SELECT ON :Salary TO general_employee;

-- Block modification of historical records
DENY UPDATE, DELETE ON :AuditLog TO ROLE application;

-- Deny specific property access
DENY SELECT(ssn, credit_score) ON :Customer TO marketing;
```

### Deny Precedence

Deny rules take precedence over grant rules at the same specificity level:

```gql
-- User has analyst role with broad SELECT
GRANT ROLE analyst TO bob;
GRANT SELECT ON GRAPH company TO analyst;

-- But Bob specifically cannot see salary data
DENY SELECT(salary) ON :Employee TO bob;

-- Bob can read employees but not their salaries
```

## Revoking Permissions

Remove previously granted permissions:

```gql
-- Revoke specific permission
REVOKE SELECT ON GRAPH customers FROM alice;

-- Revoke multiple permissions
REVOKE INSERT, UPDATE ON :Order FROM data_entry;

-- Revoke grant option only (keeps the permission)
REVOKE GRANT OPTION FOR SELECT ON GRAPH customers FROM alice;

-- Revoke all permissions from user/role
REVOKE ALL ON GRAPH analytics FROM consultant;
```

## Label-Level Authorization

Control access to specific node and relationship types:

```gql
-- Different teams access different node types
GRANT SELECT ON :Customer TO sales_team;
GRANT SELECT ON :Product TO inventory_team;
GRANT SELECT ON :Employee TO hr_team;

-- Relationship type permissions
GRANT SELECT ON :PURCHASED TO analytics;
GRANT INSERT ON :FOLLOWS TO social_features;

-- Restrict access to sensitive labels
DENY SELECT ON :InternalMemo TO external_contractor;
```

### Pattern-Based Label Permissions

Use wildcards for managing permissions across multiple labels:

```gql
-- Grant access to all Public* labels
GRANT SELECT ON :Public* TO public_api;

-- Grant access to all labels in a namespace
GRANT SELECT ON :hr_* TO hr_department;

-- Deny access to all Internal* labels
DENY SELECT ON :Internal* TO external_user;
```

## Property-Level Authorization

Fine-grained control over individual properties:

```gql
-- Grant access to specific properties only
GRANT SELECT(name, email, department) ON :Employee TO directory_service;

-- Hide sensitive properties
DENY SELECT(salary, performance_rating, ssn) ON :Employee TO general_user;

-- Allow updating specific properties
GRANT UPDATE(email, phone, address) ON :Employee TO self_service;

-- Block modification of system properties
DENY UPDATE(created_at, created_by, internal_id) ON :* TO application;
```

### Column Masking

Automatically mask sensitive data for unauthorized users:

```gql
-- Create masking policy for credit cards
CREATE MASK credit_card_mask ON :Payment.card_number
  AS CASE
    WHEN current_user_has_role('pci_admin') THEN card_number
    ELSE '****-****-****-' || right(card_number, 4)
  END;

-- Apply masking to SSN
CREATE MASK ssn_mask ON :Person.ssn
  AS CASE
    WHEN current_user_has_role('hr_admin') THEN ssn
    ELSE '***-**-' || right(ssn, 4)
  END;
```

## Graph-Level Authorization

Control access to entire graphs:

```gql
-- Grant read access to a graph
GRANT SELECT ON GRAPH production TO reporting;

-- Grant full access to development graph
GRANT ALL ON GRAPH development TO developers;

-- Prevent access to sensitive graph
DENY ALL ON GRAPH executive_compensation TO general_employee;

-- Control graph management
GRANT CREATE GRAPH TO data_architect;
GRANT DROP GRAPH TO dba;
```

### Multi-Graph Authorization

When working with multiple graphs:

```gql
-- Grant access to multiple graphs
GRANT SELECT ON GRAPH customers, orders, inventory TO fulfillment;

-- Different permission levels per graph
GRANT SELECT ON GRAPH production TO analyst;
GRANT ALL ON GRAPH analytics TO analyst;

-- Cross-graph query permissions
GRANT SELECT ON GRAPH * TO global_reporting;
```

## Authorization with Stored Procedures

Control execution of stored procedures and functions:

```gql
-- Grant execute permission
GRANT EXECUTE ON PROCEDURE calculate_recommendations TO recommendation_engine;

-- Grant with elevated privileges
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Grant to run procedures with caller's privileges
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.
```

## Dynamic Authorization

Authorization decisions that depend on runtime context:

```gql
-- Time-based access control
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Transaction', 'access_tag', 'access_tag');

-- Location-based access
-- Customer.region must equal the caller's 'assigned_region' principal attribute
CALL geode.rls.add_attribute_policy('app', 'Customer', 'region', 'assigned_region');

-- Data classification-based access
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Document', 'access_tag', 'access_tag');
```

## Authorization Inheritance

### Role Hierarchy

Roles can inherit from other roles:

```gql
-- Create base role
CREATE ROLE employee;
GRANT SELECT ON :PublicInfo TO employee;

-- Create role that inherits from employee
CREATE ROLE manager INHERITS employee;
GRANT SELECT ON :TeamPerformance TO manager;

-- Managers automatically have employee permissions plus their own
```

### Permission Inheritance Chain

```gql
-- Build inheritance chain
CREATE ROLE viewer;
CREATE ROLE editor INHERITS viewer;
CREATE ROLE admin INHERITS editor;

-- Assign permissions at appropriate levels
GRANT SELECT ON GRAPH main TO viewer;
GRANT INSERT, UPDATE ON GRAPH main TO editor;
GRANT DELETE, ADMIN ON GRAPH main TO admin;

-- Admin has all permissions: SELECT, INSERT, UPDATE, DELETE, ADMIN
```

## Viewing Authorization

### Check Current Permissions

```gql
-- Show permissions for current user
SHOW GRANTS FOR CURRENT USER;

-- Show permissions for specific user
SHOW GRANTS FOR alice;

-- Show permissions for a role
SHOW GRANTS FOR ROLE analyst;

-- Show effective permissions (including inherited)
SHOW EFFECTIVE GRANTS FOR bob;
```

### System Views

```gql
-- View all permission grants
SHOW GRANTS;

-- View role memberships
-- Role membership is reported per user by
-- CALL geode.auth.user_show('<user>') / SHOW PERMISSIONS.
SHOW ROLES;

-- View all deny rules
SHOW GRANTS;
```

## Authorization Best Practices

### 1. Use Role-Based Access Control

```gql
-- DO: Grant to roles, assign roles to users
CREATE ROLE report_viewer;
GRANT SELECT ON GRAPH reports TO report_viewer;
GRANT ROLE report_viewer TO alice, bob, charlie;

-- DON'T: Grant directly to users
-- GRANT SELECT ON GRAPH reports TO alice;
-- GRANT SELECT ON GRAPH reports TO bob;
-- GRANT SELECT ON GRAPH reports TO charlie;
```

### 2. Implement Least Privilege

```gql
-- Start with no permissions
CREATE USER new_analyst;

-- Grant only what's needed
GRANT SELECT ON GRAPH analytics TO new_analyst;
GRANT SELECT(name, email, department) ON :Employee TO new_analyst;

-- Review and adjust as needed
SHOW GRANTS FOR new_analyst;
```

### 3. Use Deny for Explicit Restrictions

```gql
-- Broad grant with specific deny
GRANT SELECT ON GRAPH company TO analyst;
DENY SELECT ON :Salary TO analyst;
DENY SELECT ON :ExecutiveCompensation TO analyst;
```

### 4. Regular Permission Audits

```gql
-- Find users with admin privileges
SHOW GRANTS;

-- Find unused permissions
SHOW GRANTS;
```

### 5. Separate Development and Production

```gql
-- Production: Minimal permissions
GRANT SELECT ON GRAPH production TO application;

-- Development: Broader permissions
GRANT ALL ON GRAPH development TO developer;

-- Prevent production modification from dev accounts
DENY INSERT, UPDATE, DELETE ON GRAPH production TO developer;
```

## Authorization Configuration

### Server-Level Settings

```bash
# Enable authorization enforcement
geode serve --authorization-enabled=true

# Set default deny (no implicit permissions)
geode serve --default-deny=true

# Enable permission caching for performance
geode serve --permission-cache-size=10000 \
  --permission-cache-ttl=300s

# Log all authorization decisions
geode serve --log-authorization=true
```

### Configuration File

```yaml
# geode.yaml
authorization:
  enabled: true
  default_deny: true
  permission_cache:
    enabled: true
    size: 10000
    ttl_seconds: 300
  audit:
    log_grants: true
    log_denies: true
    log_checks: false  # Can be verbose
```

## Troubleshooting Authorization

### Permission Denied Errors

```gql
-- Check user's current permissions
SHOW GRANTS FOR current_user();

-- Check effective permissions including inheritance
SHOW EFFECTIVE GRANTS FOR alice;

-- Check for deny rules
SHOW GRANTS;
```

### Debugging Authorization

```bash
# Enable verbose authorization logging
geode serve --authorization-debug=true

# Log shows:
# [AUTH] User alice checking SELECT on :Customer
# [AUTH] Found grant via role analyst
# [AUTH] No deny rules match
# [AUTH] Authorization: ALLOW
```

### Common Issues

1. **Inherited deny blocking access**: Check parent roles for deny rules
2. **Missing role assignment**: Verify user has required roles
3. **Property-level deny**: Check for property restrictions
4. **Graph-level restriction**: Verify graph access before label access

## Authorization Patterns

### Multi-Tenant Authorization

```gql
-- Isolate tenant data
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Label', 'access_tag', 'access_tag');

-- Tenant admins see their own tenant only
-- User.tenant_id must equal the caller's 'tenant_id' principal attribute
CALL geode.rls.add_attribute_policy('app', 'User', 'tenant_id', 'tenant_id');
```

### Hierarchical Data Access

```gql
-- Manager sees direct reports
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Employee', 'access_tag', 'access_tag');

-- Executive sees entire organization
GRANT SELECT ON :Employee TO executive;
```

### Time-Limited Access

```gql
-- Temporary elevated access
GRANT SELECT ON :AuditData TO auditor
  VALID UNTIL '2026-03-31';

-- Audit-period access
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'FinancialRecord', 'access_tag', 'access_tag');
```

## Related Topics

- [Role-Based Access Control](/tags/rbac/) - RBAC implementation details
- [Row-Level Security](/tags/rls/) - Fine-grained row-level access policies
- [Authentication](/tags/authentication/) - User identity verification
- [Audit Logging](/tags/audit-logging/) - Tracking authorization decisions
- [Compliance](/tags/compliance/) - Regulatory compliance requirements
- [Security](/tags/security/) - Security overview and best practices

## Further Reading

- [Security Architecture](/docs/architecture/security-architecture/) - Deep dive into security design
- [Authorization Best Practices](/docs/security/authorization/) - Production deployment guide
- [Session Management](/docs/security/session-management/) - Session and context security
- Enterprise Security Whitepaper - Comprehensive security documentation
