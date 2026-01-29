---
title: "Role-Based Access Control (RBAC)"
description: "Complete guide to Role-Based Access Control in Geode. Learn how to implement RBAC with roles, permissions, hierarchies, and best practices for managing secure access to your graph database."
keywords:
  - RBAC
  - role-based access control
  - roles
  - permissions
  - user management
  - access control
  - security
  - authorization
  - privilege management
  - Geode
  - graph database
  - enterprise security
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/rbac/"
    noindex: false
    title: "Role-Based Access Control (RBAC) - Geode Graph Database"
    description: "Implement enterprise-grade Role-Based Access Control in Geode. Create roles, define permissions, build hierarchies, and manage secure access to your graph data."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

Role-Based Access Control (RBAC) is the foundation of Geode's authorization system, providing a structured approach to managing permissions through roles rather than direct user grants. RBAC simplifies permission management, improves security consistency, and enables scalable access control for organizations of any size.

## RBAC Fundamentals

RBAC operates on three core concepts:

1. **Users**: Individual accounts that authenticate to the database
2. **Roles**: Named collections of permissions
3. **Permissions**: Specific capabilities to perform operations

Users are assigned to roles, and roles are granted permissions. This separation allows administrators to manage access for groups of users efficiently rather than maintaining individual permissions for each user.

## Benefits of RBAC

- **Simplified Administration**: Manage permissions for groups rather than individuals
- **Consistency**: All users with the same role have identical permissions
- **Audit Compliance**: Clear documentation of who has access to what
- **Least Privilege**: Easier to implement and maintain minimal access
- **Scalability**: Add users to roles without modifying permission grants
- **Reduced Errors**: Fewer permission changes means fewer mistakes

## Creating Roles

### Basic Role Creation

```gql
-- Create a simple role
CREATE ROLE data_analyst;

-- Create a role with description
CREATE ROLE data_engineer
  DESCRIPTION 'Full access to ETL pipelines and data transformation';

-- Create a role with specific attributes
CREATE ROLE temp_contractor
  DESCRIPTION 'Temporary contractor access'
  VALID UNTIL '2026-06-30'
  MAX_CONNECTIONS 5;
```

### System Roles

Geode includes built-in system roles:

```gql
-- View system roles
SHOW SYSTEM ROLES;

-- System roles include:
-- public       - Automatically granted to all users
-- admin        - Full administrative access
-- dba          - Database administration
-- security     - Security administration
-- monitor      - Read-only monitoring access
```

### Role Attributes

```gql
-- Create role with all attributes
CREATE ROLE senior_analyst
  DESCRIPTION 'Senior data analyst with elevated access'
  LOGIN FALSE                    -- Cannot be used for direct login
  INHERIT TRUE                   -- Inherits permissions from parent roles
  VALID UNTIL '2027-01-01'       -- Time-limited role
  MAX_CONNECTIONS 10             -- Limit concurrent connections
  CONNECTION_LIMIT_PER_USER 3;   -- Per-user connection limit
```

## Granting Permissions to Roles

### Data Access Permissions

```gql
-- Grant read access
GRANT SELECT ON GRAPH analytics TO data_analyst;

-- Grant write access
GRANT INSERT, UPDATE ON :Event TO data_engineer;

-- Grant full data access
GRANT SELECT, INSERT, UPDATE, DELETE ON GRAPH operations TO operations_team;

-- Grant access to specific labels
GRANT SELECT ON :Customer, :Order, :Product TO sales_team;
```

### Schema Permissions

```gql
-- Grant schema modification
GRANT CREATE CONSTRAINT ON GRAPH analytics TO schema_admin;
GRANT CREATE INDEX ON GRAPH analytics TO data_engineer;

-- Grant full schema control
GRANT CREATE, ALTER, DROP ON GRAPH development TO developer;
```

### Administrative Permissions

```gql
-- Grant user management
GRANT CREATE USER, ALTER USER, DROP USER TO user_admin;

-- Grant role management
GRANT CREATE ROLE, ALTER ROLE, DROP ROLE TO security_admin;

-- Grant backup capabilities
GRANT BACKUP, RESTORE TO backup_operator;
```

## Assigning Roles to Users

### Basic Assignment

```gql
-- Assign single role
GRANT ROLE data_analyst TO alice;

-- Assign multiple roles
GRANT ROLE data_analyst, report_viewer TO bob;

-- Assign role during user creation
CREATE USER charlie PASSWORD 'secure_pass_123'
  ROLE data_analyst;
```

### Role Assignment with Options

```gql
-- Allow user to grant this role to others
GRANT ROLE data_analyst TO alice WITH ADMIN OPTION;

-- Time-limited role assignment
GRANT ROLE elevated_access TO consultant
  VALID UNTIL '2026-03-31';

-- Conditional role assignment
GRANT ROLE regional_admin TO manager
  WHERE manager.region = 'EMEA';
```

### Viewing Role Assignments

```gql
-- Show roles for a user
SHOW ROLES FOR alice;

-- Show all members of a role
SHOW MEMBERS OF ROLE data_analyst;

-- Show role membership details
SELECT * FROM system.role_members
WHERE role_name = 'data_analyst';
```

## Role Hierarchies

Role hierarchies allow roles to inherit permissions from parent roles, creating a structured permission model.

### Creating Role Hierarchies

```gql
-- Create base roles
CREATE ROLE viewer;
CREATE ROLE editor;
CREATE ROLE manager;
CREATE ROLE admin;

-- Build hierarchy with inheritance
ALTER ROLE editor INHERIT viewer;
ALTER ROLE manager INHERIT editor;
ALTER ROLE admin INHERIT manager;

-- Now: admin inherits from manager, which inherits from editor, which inherits from viewer
```

### Hierarchy with Multiple Parents

```gql
-- Create specialized roles
CREATE ROLE analyst INHERITS viewer;
CREATE ROLE data_writer INHERITS viewer;

-- Create combined role with multiple parents
CREATE ROLE data_analyst;
ALTER ROLE data_analyst INHERIT analyst, data_writer;

-- data_analyst has permissions from both analyst and data_writer
```

### Viewing Role Hierarchy

```gql
-- Show complete role hierarchy
SHOW ROLE HIERARCHY;

-- Output:
-- admin
--   ├── manager
--   │   ├── editor
--   │   │   └── viewer
--   └── security_admin
-- data_analyst
--   ├── analyst
--   │   └── viewer
--   └── data_writer
--       └── viewer

-- Show hierarchy for specific role
SHOW ROLE HIERARCHY FOR manager;

-- Show effective permissions including inherited
SHOW EFFECTIVE GRANTS FOR ROLE manager;
```

## Role Groups

Organize related roles into groups for easier management:

```gql
-- Create role group
CREATE ROLE GROUP analytics_roles
  DESCRIPTION 'All analytics-related roles';

-- Add roles to group
ALTER ROLE GROUP analytics_roles
  ADD data_analyst, report_viewer, dashboard_user;

-- Grant to entire group
GRANT SELECT ON GRAPH metrics TO ROLE GROUP analytics_roles;

-- View group membership
SHOW MEMBERS OF ROLE GROUP analytics_roles;
```

## Revoking Roles and Permissions

### Revoke Role from User

```gql
-- Remove role assignment
REVOKE ROLE data_analyst FROM alice;

-- Remove multiple roles
REVOKE ROLE editor, viewer FROM bob;

-- Revoke admin option only
REVOKE ADMIN OPTION FOR ROLE data_analyst FROM alice;
```

### Revoke Permissions from Role

```gql
-- Remove specific permission
REVOKE INSERT ON :Customer FROM sales_team;

-- Remove multiple permissions
REVOKE UPDATE, DELETE ON GRAPH archive FROM analyst;

-- Remove all permissions
REVOKE ALL ON GRAPH development FROM developer;
```

### Cascading Revocation

```gql
-- Revoke and cascade to users who were granted via admin option
REVOKE ROLE elevated_access FROM manager CASCADE;

-- Revoke permission and remove from all roles that have it
REVOKE SELECT ON :ConfidentialData FROM analyst CASCADE TO ROLES;
```

## Dropping Roles

```gql
-- Drop a role (must have no members)
DROP ROLE temp_contractor;

-- Drop role and revoke from all members
DROP ROLE obsolete_role CASCADE;

-- Drop role only if it exists
DROP ROLE IF EXISTS legacy_role;
```

## RBAC Configuration Examples

### Organization Structure Model

```gql
-- Executive level
CREATE ROLE executive;
GRANT SELECT ON GRAPH * TO executive;

-- Department heads
CREATE ROLE department_head INHERITS executive;
GRANT SELECT, INSERT, UPDATE ON GRAPH department_data TO department_head;

-- Team leads
CREATE ROLE team_lead;
GRANT SELECT ON GRAPH team_data TO team_lead;
GRANT UPDATE ON :Task TO team_lead;

-- Individual contributors
CREATE ROLE employee;
GRANT SELECT ON :PublicInfo TO employee;

-- Department-specific roles
CREATE ROLE engineering INHERITS employee;
CREATE ROLE sales INHERITS employee;
CREATE ROLE hr INHERITS employee;

-- Grant department access
GRANT SELECT ON :Code, :Project, :Deployment TO engineering;
GRANT SELECT, UPDATE ON :Customer, :Lead, :Opportunity TO sales;
GRANT ALL ON :Employee, :Compensation TO hr;
```

### Application Service Roles

```gql
-- Read-only API service
CREATE ROLE api_reader;
GRANT SELECT ON GRAPH production TO api_reader;

-- Write API service
CREATE ROLE api_writer INHERITS api_reader;
GRANT INSERT, UPDATE ON :UserEvent, :Transaction TO api_writer;

-- Background worker
CREATE ROLE background_worker;
GRANT SELECT, UPDATE, DELETE ON :Job, :Task TO background_worker;

-- Analytics service
CREATE ROLE analytics_service;
GRANT SELECT ON GRAPH production TO analytics_service;
GRANT ALL ON GRAPH analytics TO analytics_service;
```

### Multi-Tenant RBAC

```gql
-- Base tenant role
CREATE ROLE tenant_base;

-- Tenant-specific roles (dynamically created per tenant)
CREATE ROLE tenant_acme_admin INHERITS tenant_base;
CREATE ROLE tenant_acme_user INHERITS tenant_base;
CREATE ROLE tenant_acme_viewer INHERITS tenant_base;

-- Apply tenant isolation via RLS
CREATE POLICY tenant_isolation ON :*
  FOR ALL
  USING (tenant_id = current_user_property('tenant_id'));

-- Grant based on tenant role
GRANT ALL ON GRAPH tenant_data TO tenant_acme_admin
  WHERE current_user_property('tenant_id') = 'acme';
```

## Role-Based Workflows

### New Employee Onboarding

```gql
-- Create new employee account
CREATE USER new_employee@company.com
  PASSWORD 'initial_password'
  REQUIRE PASSWORD_CHANGE;

-- Assign base role
GRANT ROLE employee TO new_employee@company.com;

-- Assign department role
GRANT ROLE engineering TO new_employee@company.com;

-- Assign project-specific roles
GRANT ROLE project_alpha_team TO new_employee@company.com;
```

### Employee Role Change

```gql
-- Employee promoted to team lead
REVOKE ROLE employee FROM alice@company.com;
GRANT ROLE team_lead TO alice@company.com;

-- Employee changes department
REVOKE ROLE engineering FROM bob@company.com;
GRANT ROLE sales TO bob@company.com;
```

### Employee Offboarding

```gql
-- Remove all roles
REVOKE ALL ROLES FROM departing_employee@company.com;

-- Disable account
ALTER USER departing_employee@company.com DISABLE;

-- Or delete account
DROP USER departing_employee@company.com;
```

## Temporary Role Assignments

### Time-Limited Access

```gql
-- Grant temporary elevated access
GRANT ROLE admin TO consultant
  VALID FROM '2026-02-01'
  VALID UNTIL '2026-02-28';

-- Extend temporary access
ALTER ROLE GRANT admin TO consultant
  VALID UNTIL '2026-03-15';

-- View expiring role assignments
SELECT member, role_name, valid_until
FROM system.role_members
WHERE valid_until < current_timestamp() + INTERVAL '7 days'
ORDER BY valid_until;
```

### Emergency Access Procedures

```gql
-- Create emergency access role (normally unassigned)
CREATE ROLE emergency_admin;
GRANT ADMIN ON DATABASE TO emergency_admin;

-- Emergency procedure: grant temporary access
GRANT ROLE emergency_admin TO on_call_engineer
  VALID UNTIL current_timestamp() + INTERVAL '4 hours'
  REASON 'Production incident INC-12345';

-- Automatic audit logging captures all emergency access
```

## Auditing RBAC

### Permission Audit Queries

```gql
-- Find all users with admin access
SELECT rm.member, r.role_name
FROM system.role_members rm
JOIN system.roles r ON rm.role_name = r.role_name
WHERE r.role_name = 'admin'
   OR r.role_name IN (SELECT child_role FROM system.role_hierarchy WHERE parent_role = 'admin');

-- Find unused roles (no members)
SELECT r.role_name
FROM system.roles r
LEFT JOIN system.role_members rm ON r.role_name = rm.role_name
WHERE rm.member IS NULL
  AND r.role_name NOT IN ('public');

-- Find over-privileged users (multiple high-privilege roles)
SELECT member, COUNT(*) as admin_role_count
FROM system.role_members
WHERE role_name IN ('admin', 'dba', 'security_admin')
GROUP BY member
HAVING COUNT(*) > 1;
```

### Role Usage Audit

```gql
-- Track which roles are actively used
SELECT
  rm.role_name,
  COUNT(DISTINCT rm.member) as member_count,
  MAX(al.last_activity) as last_used
FROM system.role_members rm
LEFT JOIN system.activity_log al ON rm.member = al.username
GROUP BY rm.role_name
ORDER BY last_used DESC;

-- Identify permissions never used
SELECT p.role_name, p.privilege, p.object_name
FROM system.privileges p
LEFT JOIN system.access_log al
  ON p.object_name = al.object_name
  AND al.username IN (SELECT member FROM system.role_members WHERE role_name = p.role_name)
WHERE al.last_access IS NULL
  OR al.last_access < current_timestamp() - INTERVAL '90 days';
```

## RBAC Best Practices

### 1. Design Role Hierarchy First

```gql
-- Plan your hierarchy before implementation
-- Level 1: Base organizational roles
-- Level 2: Department/function roles
-- Level 3: Application-specific roles
-- Level 4: Temporary/emergency roles

CREATE ROLE base_user;              -- Level 1
CREATE ROLE department INHERITS base_user;  -- Level 2
CREATE ROLE app_role INHERITS department;   -- Level 3
CREATE ROLE emergency_access;        -- Level 4 (no inheritance)
```

### 2. Follow Principle of Least Privilege

```gql
-- Start minimal
CREATE ROLE new_role;

-- Add permissions incrementally as needed
GRANT SELECT ON :PublicData TO new_role;

-- Review and justify each addition
-- Document why permissions are needed
```

### 3. Use Descriptive Role Names

```gql
-- Good: Clear, descriptive names
CREATE ROLE sales_readonly;
CREATE ROLE hr_employee_admin;
CREATE ROLE api_order_writer;

-- Avoid: Vague or personal names
-- CREATE ROLE role1;
-- CREATE ROLE johns_role;
```

### 4. Regular Access Reviews

```bash
# Schedule quarterly access reviews
# Generate role report
geode admin roles report --format=csv --output=role_report.csv

# Review for:
# - Unused roles
# - Over-privileged users
# - Expired temporary access
# - Orphaned permissions
```

### 5. Separate Duties

```gql
-- Security admin cannot modify data
CREATE ROLE security_admin;
GRANT CREATE USER, ALTER USER, CREATE ROLE, ALTER ROLE TO security_admin;
DENY SELECT, INSERT, UPDATE, DELETE ON GRAPH * TO security_admin;

-- DBA cannot manage security
CREATE ROLE dba;
GRANT BACKUP, RESTORE, CREATE GRAPH, DROP GRAPH TO dba;
DENY CREATE USER, ALTER USER, CREATE ROLE, ALTER ROLE TO dba;
```

## Troubleshooting RBAC

### Permission Denied Issues

```gql
-- Check user's roles
SHOW ROLES FOR alice;

-- Check effective permissions
SHOW EFFECTIVE GRANTS FOR alice;

-- Check for deny rules
SELECT * FROM system.privileges
WHERE grantee IN (SELECT role_name FROM system.role_members WHERE member = 'alice')
  AND is_deny = true;

-- Check role hierarchy
SHOW ROLE HIERARCHY FOR alice;
```

### Role Assignment Issues

```gql
-- Verify role exists
SHOW ROLES LIKE 'analyst%';

-- Check if role is assignable
SELECT role_name, is_assignable, valid_until
FROM system.roles
WHERE role_name = 'analyst';

-- Check admin option
SELECT member, role_name, with_admin_option
FROM system.role_members
WHERE member = 'alice';
```

## Server Configuration

```yaml
# geode.yaml
rbac:
  enabled: true
  default_role: public

  # Role caching
  cache:
    enabled: true
    size: 5000
    ttl_seconds: 300

  # Audit settings
  audit:
    log_role_changes: true
    log_permission_checks: false  # Can be verbose

  # Security settings
  security:
    max_roles_per_user: 50
    max_role_depth: 10
    prevent_self_grant: true
```

## Related Topics

- [Authorization](/tags/authorization/) - Comprehensive access control
- [Row-Level Security](/tags/rls/) - Fine-grained data access policies
- [Authentication](/tags/authentication/) - User identity verification
- [Audit Logging](/tags/audit-logging/) - Tracking access and changes
- [Compliance](/tags/compliance/) - Regulatory requirements
- [Security](/tags/security/) - Security overview

## Further Reading

- [Security Architecture](/docs/architecture/security-architecture/) - Security design details
- [Authorization Guide](/docs/security/authorization/) - Authorization best practices
- [User Management](/docs/reference/) - User administration reference
- RBAC Implementation Whitepaper - Detailed RBAC patterns
