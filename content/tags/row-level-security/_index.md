---
title: "Row-Level Security (RLS)"
description: "Complete guide to Row-Level Security in Geode. Learn how to implement fine-grained access control at the node and relationship level for multi-tenant applications and data protection."
keywords:
  - row-level security
  - RLS
  - fine-grained access control
  - multi-tenancy
  - data isolation
  - access control
  - security policies
  - node-level security
  - Geode
  - graph database
  - enterprise security
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/row-level-security/"
    noindex: false
    title: "Row-Level Security (RLS) - Geode Graph Database"
    description: "Implement fine-grained access control with Geode's Row-Level Security. Protect sensitive data at the node level with flexible security policies for enterprise graph databases."
---

Row-Level Security (RLS) in Geode provides fine-grained access control at the node and relationship level, allowing you to restrict which graph elements users can access based on flexible policy rules. This is essential for multi-tenant applications, data privacy compliance, and protecting sensitive information within shared graph databases.

## Understanding Row-Level Security

Traditional database access control operates at the table or column level, granting or denying access to entire datasets. Row-Level Security goes further by controlling access to individual rows (in Geode's case, nodes and relationships) based on the context of the query and the user executing it.

In graph databases, RLS enables:
- **Multi-tenant isolation**: Different customers see only their data
- **Data compartmentalization**: Users access only data relevant to their role
- **Privacy compliance**: Automatic filtering of sensitive information
- **Hierarchical access**: Organizational structures reflected in data access
- **Attribute-based access**: Access based on node properties and relationships

## RLS Policy Basics

RLS policies in Geode consist of:
- **Target**: The node labels or relationship types the policy applies to
- **Operation**: SELECT, INSERT, UPDATE, or DELETE
- **Role**: Which users/roles the policy applies to
- **Condition**: A GQL expression that determines access

### Creating Basic Policies

```gql
-- Only allow users to see their own data
CREATE POLICY user_isolation
  ON Person
  FOR SELECT
  TO authenticated_user
  USING (person_id = current_user());

-- Allow managers to see their team's data
CREATE POLICY manager_team_access
  ON Employee
  FOR SELECT
  TO manager
  USING (manager_id = current_user());

-- Allow admins to see everything
CREATE POLICY admin_full_access
  ON Person
  FOR ALL
  TO admin
  USING (true);
```

### Policy Evaluation

When a query executes, Geode:
1. Identifies the user's roles
2. Finds all applicable RLS policies
3. Combines policy conditions with AND logic for restrictive policies
4. Combines policy conditions with OR logic for permissive policies
5. Automatically adds conditions to query WHERE clauses

```gql
-- User executes this query
MATCH (p:Person)
RETURN p.name, p.email;

-- With user_isolation policy, Geode executes
MATCH (p:Person)
WHERE p.person_id = current_user()  -- Automatically added by RLS
RETURN p.name, p.email;
```

## Multi-Tenant Applications

RLS is ideal for SaaS applications serving multiple customers:

### Tenant Isolation

```gql
-- Create tenant isolation policy
CREATE POLICY tenant_isolation
  ON (n)  -- Applies to all node types
  FOR ALL
  TO tenant_user
  USING (n.tenant_id = current_tenant_id());

-- Optionally, restrict at relationship level too
CREATE POLICY tenant_relationship_isolation
  ON ()-[r]-()
  FOR ALL
  TO tenant_user
  USING (start_node(r).tenant_id = current_tenant_id()
     AND end_node(r).tenant_id = current_tenant_id());
```

Every node includes a `tenant_id` property:

```gql
-- Create customer data with tenant ID
CREATE (:Customer {
  name: 'Acme Corp',
  tenant_id: 'tenant_123',
  email: 'contact@acme.com'
});

-- User from tenant_123 can see this
-- Users from other tenants cannot
```

### Shared Reference Data

Some data may be shared across tenants:

```gql
-- Allow all tenants to see shared reference data
CREATE POLICY shared_data_access
  ON ReferenceData
  FOR SELECT
  TO tenant_user
  USING (is_shared = true OR tenant_id = current_tenant_id());

-- Create shared data
CREATE (:ReferenceData {
  type: 'country',
  name: 'United States',
  is_shared: true
});
```

## Hierarchical Access Control

Model organizational hierarchies with RLS:

```gql
-- Employees can see their own data
CREATE POLICY employee_self_access
  ON Employee
  FOR SELECT
  TO employee
  USING (employee_id = current_user());

-- Managers can see their direct reports
CREATE POLICY manager_reports_access
  ON Employee
  FOR SELECT
  TO manager
  USING (
    manager_id = current_user()
    OR employee_id = current_user()
  );

-- Directors can see entire department
CREATE POLICY director_department_access
  ON Employee
  FOR SELECT
  TO director
  USING (
    department IN get_managed_departments(current_user())
    OR employee_id = current_user()
  );

-- Executives can see everything
CREATE POLICY executive_all_access
  ON Employee
  FOR SELECT
  TO executive
  USING (true);
```

### Graph-Based Hierarchy

Use the graph structure itself for hierarchical access:

```gql
-- Access based on organizational graph structure
CREATE POLICY org_hierarchy_access
  ON Employee
  FOR SELECT
  TO employee
  USING (
    EXISTS {
      MATCH path = (current:Employee {id: current_user()})-[:MANAGES*0..]->(e:Employee)
      WHERE e = this  -- 'this' refers to the current Employee node being checked
    }
  );
```

## Attribute-Based Access Control

Define access based on node properties:

```gql
-- Access based on security clearance level
CREATE POLICY clearance_based_access
  ON Document
  FOR SELECT
  TO employee
  USING (
    required_clearance <= get_user_clearance(current_user())
  );

-- Access based on data classification
CREATE POLICY classification_access
  ON DataAsset
  FOR SELECT
  TO analyst
  USING (
    classification IN ['public', 'internal']
    OR (classification = 'confidential' AND user_has_approval(current_user(), this.id))
  );

-- Time-based access
CREATE POLICY time_limited_access
  ON TemporaryData
  FOR SELECT
  TO user
  USING (
    valid_from <= current_timestamp()
    AND valid_until >= current_timestamp()
  );
```

## Column-Level Security with RLS

Restrict access to specific properties:

```gql
-- Policy that only exposes certain properties
CREATE POLICY employee_limited_view
  ON Employee
  FOR SELECT
  TO public
  WITH COLUMNS (name, title, department, email)
  USING (is_public_directory_enabled = true);

-- Sensitive properties like salary not included
MATCH (e:Employee)
RETURN e.name, e.salary;  -- salary is NULL for public role
```

## Conditional Insert/Update Policies

Control data modifications with RLS:

```gql
-- Users can only insert data for their tenant
CREATE POLICY tenant_insert_restriction
  ON (n)
  FOR INSERT
  TO tenant_user
  USING (n.tenant_id = current_tenant_id());

-- Users can only update their own data
CREATE POLICY self_update_only
  ON Person
  FOR UPDATE
  TO authenticated_user
  USING (person_id = current_user());

-- Prevent deletion of archived records
CREATE POLICY prevent_archive_deletion
  ON Record
  FOR DELETE
  TO user
  USING (status != 'archived');
```

## Policy Functions

Create reusable functions for complex policies:

```gql
-- Define helper function
CREATE FUNCTION is_accessible_to_user(node_id STRING, user_id STRING)
RETURNS BOOLEAN
AS $$
  MATCH (u:User {id: $user_id})
  MATCH (n {id: $node_id})
  RETURN EXISTS {
    MATCH (u)-[:HAS_ACCESS|MANAGES*1..3]->(n)
  }
$$;

-- Use in policy
CREATE POLICY complex_access_policy
  ON Document
  FOR SELECT
  TO user
  USING (is_accessible_to_user(this.id, current_user()));
```

## Performance Optimization

RLS policies can impact query performance if not carefully designed:

### Index Filtered Properties

```gql
-- Create index on frequently filtered property
CREATE INDEX tenant_id_index ON (n) FOR (n.tenant_id);

-- Policy uses indexed property
CREATE POLICY tenant_isolation
  ON (n)
  FOR SELECT
  TO tenant_user
  USING (n.tenant_id = current_tenant_id());  -- Uses index
```

### Avoid Complex Subqueries

```gql
-- Inefficient: Complex EXISTS subquery for every node
CREATE POLICY slow_policy
  ON Document
  FOR SELECT
  TO user
  USING (
    EXISTS {
      MATCH (u:User {id: current_user()})-[:BELONGS_TO]->(g:Group)-[:CAN_ACCESS]->(this)
    }
  );

-- More efficient: Pre-compute accessible documents
CREATE POLICY fast_policy
  ON Document
  FOR SELECT
  TO user
  USING (
    this.id IN get_accessible_documents(current_user())  -- Cached function
  );
```

### Policy Caching

```bash
# Enable policy evaluation caching
geode serve --rls-cache-enabled=true \
  --rls-cache-size=100MB \
  --rls-cache-ttl=300s
```

## Testing RLS Policies

Verify policies work correctly:

```gql
-- Test as specific user
SET ROLE 'employee';
SET SESSION current_user = 'alice@example.com';

MATCH (e:Employee)
RETURN count(e);  -- Should only see accessible employees

-- Test as admin
SET ROLE 'admin';
MATCH (e:Employee)
RETURN count(e);  -- Should see all employees

-- Verify policy enforcement
EXPLAIN MATCH (e:Employee) RETURN e;
-- Plan should show RLS filter: WHERE e.employee_id = current_user()
```

### Automated Policy Testing

```bash
# Run RLS policy test suite
geode test-rls --policy=employee_access \
  --test-users=alice,bob,admin \
  --expected-results=test-cases.json
```

## Policy Management

### Viewing Policies

```gql
-- List all policies
SHOW POLICIES;

-- Show policies for specific label
SHOW POLICIES ON Employee;

-- Show policy details
DESCRIBE POLICY employee_self_access;
```

### Modifying Policies

```gql
-- Drop policy
DROP POLICY employee_self_access;

-- Recreate with updated condition
CREATE POLICY employee_self_access
  ON Employee
  FOR SELECT
  TO employee
  USING (employee_id = current_user() OR is_manager = true);

-- Disable policy temporarily
ALTER POLICY employee_self_access DISABLE;

-- Re-enable policy
ALTER POLICY employee_self_access ENABLE;
```

## Best Practices

1. **Start with deny-all**: Create restrictive policies by default, then grant access
2. **Use indexed properties**: Filter on indexed properties for performance
3. **Test thoroughly**: Verify policies with different user roles and scenarios
4. **Keep policies simple**: Complex policies are hard to maintain and slow to evaluate
5. **Document policies**: Clearly document the intent and scope of each policy
6. **Monitor performance**: Track query performance impact of RLS policies
7. **Use policy functions**: Extract complex logic into reusable functions
8. **Regular audits**: Periodically review and update policies
9. **Principle of least privilege**: Grant minimum necessary access
10. **Combine with RBAC**: Use RLS together with role-based access control

## Common Patterns

### Department-Based Access

```gql
CREATE POLICY department_isolation
  ON Employee
  FOR SELECT
  TO department_user
  USING (department = get_user_department(current_user()));
```

### Time-Based Access

```gql
CREATE POLICY business_hours_access
  ON SensitiveData
  FOR SELECT
  TO employee
  USING (
    extract_hour(current_timestamp()) BETWEEN 9 AND 17
    AND extract_dow(current_timestamp()) BETWEEN 1 AND 5
  );
```

### Geographic Restrictions

```gql
CREATE POLICY geographic_restriction
  ON CustomerData
  FOR SELECT
  TO analyst
  USING (region IN get_user_regions(current_user()));
```

### Data Owner Access

```gql
CREATE POLICY owner_access
  ON Document
  FOR ALL
  TO user
  USING (created_by = current_user() OR owner = current_user());
```

## Troubleshooting

### Policy Not Applied

Check that:
1. User has correct role assigned
2. Policy target matches query pattern
3. Policy is enabled: `SHOW POLICIES`
4. No conflicting policies

### Performance Issues

1. Add indexes on filtered properties
2. Simplify policy conditions
3. Use policy evaluation caching
4. Monitor with `EXPLAIN` to see added filters

### Access Denied Unexpectedly

1. Review all applicable policies with `SHOW POLICIES`
2. Test policy condition manually
3. Check if multiple policies conflict
4. Verify user role and session context

## Related Topics

- [Compliance](/tags/compliance/) - Regulatory compliance with RLS
- [Audit Logging](/tags/audit-logging/) - Track RLS policy enforcement
- [Data Governance](/tags/governance/) - Governance policies and RLS
- [Multi-Tenancy](/docs/patterns/multi-tenancy/) - Multi-tenant application patterns
- [Authentication](/docs/security/authentication/) - User authentication and identity
- [Authorization](/docs/security/authorization/) - Role-based access control
- [Performance](/docs/performance/) - Optimizing RLS policy performance
