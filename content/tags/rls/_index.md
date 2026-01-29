---
title: "Row-Level Security (RLS)"
description: "Complete guide to Row-Level Security in Geode. Learn how to implement fine-grained access control policies that filter data at the row level based on user context, tenant isolation, and business rules."
keywords:
  - RLS
  - row-level security
  - fine-grained access control
  - data filtering
  - security policies
  - multi-tenancy
  - data isolation
  - tenant isolation
  - access policies
  - Geode
  - graph database
  - enterprise security
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/rls/"
    noindex: false
    title: "Row-Level Security (RLS) - Geode Graph Database"
    description: "Implement fine-grained data access control with Geode's Row-Level Security. Automatic data filtering based on user context for multi-tenancy, compliance, and data isolation."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-28 -->

Row-Level Security (RLS) enables fine-grained access control by automatically filtering data based on user context and policy rules. Unlike traditional authorization that controls access to entire tables or labels, RLS controls access to individual rows (nodes and relationships), ensuring users only see data they are permitted to access.

## Understanding Row-Level Security

RLS works by applying security predicates to queries automatically. When a user executes a query, Geode evaluates RLS policies and filters results to include only rows matching the policy conditions. This filtering is transparent to the application and cannot be bypassed.

### How RLS Works

```
User Query:
  MATCH (c:Customer) RETURN c.name

Without RLS:
  Returns all 10,000 customers

With RLS Policy (tenant isolation):
  USING (c.tenant_id = current_user_property('tenant_id'))

Result for User in Tenant 'acme':
  Returns only 500 customers belonging to 'acme'
```

### RLS vs Traditional Authorization

| Aspect | Traditional Authorization | Row-Level Security |
|--------|--------------------------|-------------------|
| Granularity | Label/Table level | Individual row level |
| Filtering | All or nothing | Dynamic per-row |
| Context-Aware | Limited | Full user context |
| Application Changes | Required for filtering | Transparent |
| Performance | Manual optimization | Automatic optimization |

## Creating RLS Policies

### Basic Policy Syntax

```gql
CREATE POLICY policy_name ON :LabelName
  FOR operation_type
  TO role_or_user
  USING (predicate_expression);
```

### Policy Components

- **policy_name**: Unique identifier for the policy
- **LabelName**: Node or relationship label to protect
- **operation_type**: SELECT, INSERT, UPDATE, DELETE, or ALL
- **role_or_user**: Target role or specific user
- **predicate_expression**: Boolean expression that must be true for access

### Basic Examples

```gql
-- Tenant isolation: Users see only their tenant's data
CREATE POLICY tenant_isolation ON :Customer
  FOR ALL
  TO application_user
  USING (tenant_id = current_user_property('tenant_id'));

-- Manager sees only their team's data
CREATE POLICY manager_team_access ON :Employee
  FOR SELECT
  TO manager
  USING (department = current_user_property('department'));

-- Users can only modify their own records
CREATE POLICY self_edit ON :UserProfile
  FOR UPDATE
  TO authenticated_user
  USING (user_id = current_user_id());
```

## Operation-Specific Policies

### SELECT Policies

Control which rows users can read:

```gql
-- Classification-based access
CREATE POLICY classification_access ON :Document
  FOR SELECT
  TO employee
  USING (classification_level <= current_user_property('clearance_level'));

-- Geographic restriction
CREATE POLICY regional_data ON :CustomerData
  FOR SELECT
  TO regional_analyst
  USING (region = current_user_property('assigned_region'));

-- Time-based visibility
CREATE POLICY current_records ON :Contract
  FOR SELECT
  TO standard_user
  USING (end_date >= current_date() OR end_date IS NULL);
```

### INSERT Policies

Control which rows users can create:

```gql
-- Tenant must match for new records
CREATE POLICY tenant_insert ON :Order
  FOR INSERT
  TO application_user
  USING (tenant_id = current_user_property('tenant_id'));

-- Department restriction on creation
CREATE POLICY dept_create ON :Ticket
  FOR INSERT
  TO support_agent
  USING (assigned_department = current_user_property('department'));

-- Validate ownership on creation
CREATE POLICY owner_insert ON :Note
  FOR INSERT
  TO user
  USING (created_by = current_user_id());
```

### UPDATE Policies

Control which rows users can modify:

```gql
-- Only modify own records
CREATE POLICY self_update ON :UserSettings
  FOR UPDATE
  TO authenticated_user
  USING (user_id = current_user_id());

-- Manager can update team's records
CREATE POLICY manager_update ON :Employee
  FOR UPDATE
  TO manager
  USING (department = current_user_property('department')
         AND employee_id != current_user_property('employee_id'));

-- Prevent modification of closed records
CREATE POLICY open_records_only ON :Ticket
  FOR UPDATE
  TO support_agent
  USING (status != 'CLOSED');
```

### DELETE Policies

Control which rows users can delete:

```gql
-- Users can delete their own temporary data
CREATE POLICY self_delete ON :TempFile
  FOR DELETE
  TO user
  USING (owner_id = current_user_id());

-- Admins can delete within their tenant
CREATE POLICY tenant_delete ON :AuditRecord
  FOR DELETE
  TO tenant_admin
  USING (tenant_id = current_user_property('tenant_id')
         AND created_at < current_timestamp() - INTERVAL '7 years');

-- Prevent deletion of linked records
CREATE POLICY no_delete_linked ON :Customer
  FOR DELETE
  TO admin
  USING (NOT EXISTS(
    MATCH (this)-[:HAS_ORDER]->(:Order)
    WHERE Order.status != 'CANCELLED'
  ));
```

## Policy Predicates

### Using User Context

```gql
-- Current user ID
USING (owner_id = current_user_id())

-- User property
USING (region = current_user_property('assigned_region'))

-- User roles
USING (classification IN current_user_roles())

-- Session attribute
USING (project_id = current_session_property('active_project'))
```

### Complex Predicates

```gql
-- Multiple conditions with AND
CREATE POLICY combined_access ON :SalesData
  FOR SELECT
  TO sales_rep
  USING (
    region = current_user_property('region')
    AND fiscal_year = current_user_property('active_year')
    AND is_confidential = false
  );

-- OR conditions
CREATE POLICY flexible_access ON :Project
  FOR SELECT
  TO employee
  USING (
    owner_id = current_user_id()
    OR team_id = current_user_property('team_id')
    OR is_public = true
  );

-- Subqueries
CREATE POLICY manager_hierarchy ON :Employee
  FOR SELECT
  TO manager
  USING (
    manager_id IN (
      SELECT employee_id FROM :Employee
      WHERE manager_id = current_user_id()
    )
    OR employee_id = current_user_id()
  );
```

### Graph Pattern Predicates

```gql
-- Access based on relationship existence
CREATE POLICY project_member ON :ProjectDocument
  FOR SELECT
  TO employee
  USING (
    EXISTS(
      MATCH (this)<-[:BELONGS_TO]-(:Project)<-[:MEMBER_OF]-(u:User)
      WHERE u.id = current_user_id()
    )
  );

-- Access based on graph traversal
CREATE POLICY org_hierarchy ON :Report
  FOR SELECT
  TO manager
  USING (
    EXISTS(
      MATCH (this)<-[:AUTHORED_BY]-(author:Employee)
      MATCH (author)-[:REPORTS_TO*0..3]->(mgr:Employee)
      WHERE mgr.id = current_user_id()
    )
  );
```

## Multi-Tenant Isolation

### Complete Tenant Isolation

```gql
-- Apply to all labels
CREATE POLICY tenant_isolation_customer ON :Customer
  FOR ALL TO application USING (tenant_id = current_tenant());

CREATE POLICY tenant_isolation_order ON :Order
  FOR ALL TO application USING (tenant_id = current_tenant());

CREATE POLICY tenant_isolation_product ON :Product
  FOR ALL TO application USING (tenant_id = current_tenant());

-- Helper function for cleaner policies
CREATE FUNCTION current_tenant() RETURNS STRING AS $$
  SELECT current_user_property('tenant_id')
$$;
```

### Cross-Tenant Access for Admins

```gql
-- Super admin sees all tenants
CREATE POLICY super_admin_access ON :Customer
  FOR SELECT
  TO super_admin
  USING (true);  -- No restriction

-- Tenant admin sees only their tenant
CREATE POLICY tenant_admin_access ON :Customer
  FOR ALL
  TO tenant_admin
  USING (tenant_id = current_tenant());

-- Support can view but not modify across tenants
CREATE POLICY support_view ON :Customer
  FOR SELECT
  TO support_team
  USING (true);
```

### Shared Resources

```gql
-- Some data is shared across tenants
CREATE POLICY shared_templates ON :Template
  FOR SELECT
  TO application
  USING (
    is_shared = true
    OR tenant_id = current_tenant()
  );

-- Global reference data
CREATE POLICY reference_data ON :Country
  FOR SELECT
  TO application
  USING (true);  -- Everyone can read
```

## Hierarchical Data Access

### Organizational Hierarchy

```gql
-- Employees see peers and downward
CREATE POLICY org_hierarchy ON :Employee
  FOR SELECT
  TO employee
  USING (
    -- Can see self
    employee_id = current_user_property('employee_id')
    -- Can see peers in same department
    OR (department = current_user_property('department')
        AND level <= current_user_property('level'))
    -- Can see direct reports (recursively)
    OR EXISTS(
      MATCH (this)-[:REPORTS_TO*1..10]->(mgr:Employee)
      WHERE mgr.employee_id = current_user_property('employee_id')
    )
  );

-- Executives see everyone
CREATE POLICY executive_access ON :Employee
  FOR SELECT
  TO executive
  USING (true);
```

### Geographic Hierarchy

```gql
-- Regional managers see their region
CREATE POLICY regional_access ON :Store
  FOR ALL
  TO regional_manager
  USING (region = current_user_property('region'));

-- Country managers see all regions in country
CREATE POLICY country_access ON :Store
  FOR ALL
  TO country_manager
  USING (country = current_user_property('country'));

-- Global sees everything
CREATE POLICY global_access ON :Store
  FOR ALL
  TO global_admin
  USING (true);
```

## Data Classification

### Classification-Based Access

```gql
-- Define classification levels
-- PUBLIC = 0, INTERNAL = 1, CONFIDENTIAL = 2, SECRET = 3

-- Users see data at or below their clearance
CREATE POLICY classification_policy ON :Document
  FOR SELECT
  TO employee
  USING (classification_level <= current_user_property('clearance'));

-- Writing requires exact level match or higher clearance
CREATE POLICY classification_write ON :Document
  FOR INSERT
  TO employee
  USING (classification_level <= current_user_property('clearance'));

-- Cannot downgrade classification
CREATE POLICY no_downgrade ON :Document
  FOR UPDATE
  TO employee
  USING (
    NEW.classification_level >= OLD.classification_level
    OR current_user_has_role('classification_admin')
  );
```

### Category-Based Access

```gql
-- Users have list of accessible categories
CREATE POLICY category_access ON :ResearchData
  FOR SELECT
  TO researcher
  USING (
    category = ANY(current_user_property('authorized_categories'))
  );
```

## Time-Based Policies

### Temporal Access Control

```gql
-- Business hours only
CREATE POLICY business_hours ON :ProductionData
  FOR ALL
  TO standard_user
  USING (
    EXTRACT(HOUR FROM current_timestamp()) BETWEEN 8 AND 18
    AND EXTRACT(DOW FROM current_timestamp()) BETWEEN 1 AND 5
  );

-- Emergency override for on-call
CREATE POLICY emergency_access ON :ProductionData
  FOR ALL
  TO on_call_engineer
  USING (true);

-- Historical data access window
CREATE POLICY historical_window ON :AuditLog
  FOR SELECT
  TO auditor
  USING (
    log_date BETWEEN current_user_property('audit_start_date')
                 AND current_user_property('audit_end_date')
  );
```

### Record Lifecycle

```gql
-- Only access active records
CREATE POLICY active_records ON :Contract
  FOR SELECT
  TO user
  USING (
    status = 'ACTIVE'
    OR (status = 'EXPIRED' AND current_user_has_role('archive_viewer'))
  );

-- Soft delete visibility
CREATE POLICY soft_delete ON :Customer
  FOR SELECT
  TO application
  USING (
    deleted_at IS NULL
    OR current_user_has_role('admin')
  );
```

## Policy Management

### Viewing Policies

```gql
-- Show all policies
SHOW POLICIES;

-- Show policies for specific label
SHOW POLICIES ON :Customer;

-- Show policies for a role
SHOW POLICIES FOR ROLE analyst;

-- Detailed policy information
SELECT * FROM system.rls_policies
WHERE label_name = 'Customer';
```

### Modifying Policies

```gql
-- Update policy predicate
ALTER POLICY tenant_isolation ON :Customer
  USING (tenant_id = current_tenant() AND is_active = true);

-- Change policy target
ALTER POLICY manager_access ON :Employee
  TO senior_manager;

-- Rename policy
ALTER POLICY old_name ON :Customer
  RENAME TO new_name;
```

### Disabling and Dropping Policies

```gql
-- Temporarily disable policy
ALTER POLICY tenant_isolation ON :Customer DISABLE;

-- Re-enable policy
ALTER POLICY tenant_isolation ON :Customer ENABLE;

-- Drop policy
DROP POLICY tenant_isolation ON :Customer;

-- Drop if exists
DROP POLICY IF EXISTS old_policy ON :Customer;
```

## Policy Bypass

### Bypassing RLS for Administration

```gql
-- Grant bypass ability to specific role
GRANT BYPASS RLS ON :Customer TO dba;

-- Session-level bypass (requires privilege)
SET SESSION bypass_rls = true;

-- Run query without RLS
MATCH (c:Customer) RETURN count(c);

-- Re-enable RLS
SET SESSION bypass_rls = false;
```

### Audit Access Without Filtering

```gql
-- Auditors need to see everything for compliance
CREATE ROLE compliance_auditor;
GRANT BYPASS RLS ON GRAPH * TO compliance_auditor;

-- All audit queries logged even with bypass
```

## Performance Optimization

### Indexing for RLS

```gql
-- Create index on commonly filtered columns
CREATE INDEX tenant_idx ON :Customer(tenant_id);
CREATE INDEX department_idx ON :Employee(department);
CREATE INDEX region_idx ON :Store(region);

-- Composite index for multi-condition policies
CREATE INDEX tenant_status_idx ON :Order(tenant_id, status);
```

### Policy Optimization Tips

```gql
-- GOOD: Simple equality checks are fast
USING (tenant_id = current_tenant())

-- GOOD: Indexed column lookups
USING (department = current_user_property('department'))

-- AVOID: Complex subqueries if possible
-- Consider caching user permissions

-- GOOD: Pre-computed access lists
USING (id = ANY(current_user_property('accessible_ids')))
```

### Analyzing Policy Performance

```gql
-- Explain query with RLS
EXPLAIN MATCH (c:Customer) RETURN c.name;

-- Shows:
-- Filter: (c.tenant_id = current_user_property('tenant_id'))
-- Index Scan: tenant_idx

-- Profile with RLS overhead
PROFILE MATCH (c:Customer) RETURN c;
```

## Testing RLS Policies

### Test as Different Users

```gql
-- Switch user context for testing
SET SESSION AUTHORIZATION 'test_user';
SET SESSION PROPERTY 'tenant_id' = 'acme';

-- Run query to test policy
MATCH (c:Customer) RETURN count(c);

-- Reset to original user
RESET SESSION AUTHORIZATION;
```

### Policy Verification Queries

```gql
-- Verify no cross-tenant leakage
SELECT tenant_id, count(*) as count
FROM Customer
GROUP BY tenant_id;
-- Should only show current tenant

-- Verify all expected data is accessible
SELECT count(*) FROM Customer
WHERE tenant_id = current_tenant();
-- Compare with admin bypass count
```

## Integration with Other Security Features

### RLS with RBAC

```gql
-- RBAC controls CAN you access the label
GRANT SELECT ON :Customer TO analyst;

-- RLS controls WHICH rows you can see
CREATE POLICY analyst_region ON :Customer
  FOR SELECT
  TO analyst
  USING (region = current_user_property('region'));

-- Both must pass for access
```

### RLS with Property-Level Security

```gql
-- RLS filters rows
CREATE POLICY tenant_filter ON :Customer
  FOR SELECT
  USING (tenant_id = current_tenant());

-- Property security hides columns
DENY SELECT(ssn, credit_score) ON :Customer TO analyst;

-- Result: Analyst sees only tenant customers, without sensitive fields
```

## Best Practices

### 1. Always Use Indexes

```gql
-- Create indexes for RLS predicate columns
CREATE INDEX tenant_idx ON :Customer(tenant_id);
-- Dramatically improves RLS performance
```

### 2. Keep Policies Simple

```gql
-- Simple policies are faster and easier to audit
CREATE POLICY simple_tenant ON :Data
  USING (tenant_id = current_tenant());

-- Avoid complex nested subqueries when possible
```

### 3. Test Thoroughly

```gql
-- Test positive cases (should see)
-- Test negative cases (should NOT see)
-- Test edge cases (null values, missing properties)
-- Test performance under load
```

### 4. Document Policies

```gql
-- Use descriptive policy names
CREATE POLICY tenant_isolation_for_compliance ON :Customer
  FOR ALL
  TO application
  USING (tenant_id = current_tenant());

-- Maintain external documentation for complex policies
```

### 5. Regular Audits

```gql
-- Periodically verify RLS effectiveness
-- Check for bypass grants
-- Review policy predicates
-- Test with sample user contexts
```

## Related Topics

- [Authorization](/tags/authorization/) - Access control overview
- [RBAC](/tags/rbac/) - Role-based access control
- [Authentication](/tags/authentication/) - Identity verification
- [Audit Logging](/tags/audit-logging/) - Security event tracking
- [Compliance](/tags/compliance/) - Regulatory requirements
- [Multi-Tenancy](/tags/multi-tenancy/) - Tenant isolation patterns

## Further Reading

- [Security Architecture](/docs/architecture/security-architecture/) - Security design
- [Authorization Guide](/docs/security/authorization/) - Complete authorization
- [Performance Tuning](/docs/performance/) - RLS performance optimization
- Multi-Tenant Design Patterns - Tenant isolation strategies
