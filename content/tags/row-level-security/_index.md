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

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

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

Geode offers two distinct mechanisms, described in full under
[Row-Level Security](/tags/rls/):

- **Attribute policies** (`CALL geode.rls.add_attribute_policy(graph, label,
  row_property, attribute_key)`) — real per-row filtering. A row is visible only
  when the named property equals the caller's principal attribute of that name.
  Node labels only; equality only.
- **Graph-scoped policies** (`CREATE POLICY … ON GRAPH … FOR <actions> [USING …]`)
  — coarse authorization over a whole graph. Actions are `READ`, `WRITE`,
  `MATCH`, `CREATE`, `UPDATE`, `DELETE`, `SCHEMA` (not `SELECT`/`INSERT`), and the
  `USING` predicate compiles only equality against a **string literal**.

### Creating Basic Policies

```gql
-- Only allow users to see their own data
-- Person.person_id must equal the caller's 'username' principal attribute
CALL geode.rls.add_attribute_policy('app', 'Person', 'person_id', 'username');

-- Allow managers to see their team's data
-- Employee.manager_id must equal the caller's 'username' principal attribute
CALL geode.rls.add_attribute_policy('app', 'Employee', 'manager_id', 'username');

-- Allow admins to see everything
CREATE POLICY admin_full_access ON GRAPH app FOR READ, MATCH USING true;
```

### Policy Evaluation

Attribute policies are **restrictive**: a row must satisfy the policy to be
returned, and a principal with no value for the attribute key matches nothing, so
the mechanism fails closed rather than falling back to "see everything". The
filter is applied inside the match loop, so the query text never changes:

```gql
-- The user writes this
MATCH (p:Person)
RETURN p.name, p.email;

-- With an attribute policy on (Person, person_id, username), only rows whose
-- person_id equals the caller's 'username' attribute are returned. There is no
-- rewritten predicate to inspect; use EXPLAIN to confirm the scan is filtered.
```

{{< callout type="danger" >}}
A `CREATE POLICY … USING (…)` expression outside the supported subset is accepted
at DDL time **without error**, stored uncompiled, and then never grants access —
the graph reads as empty. Always verify with a read-back query. See
[the `USING` subset](/tags/rls/#the-using-expression-subset).
{{< /callout >}}

## Multi-Tenant Applications

RLS is ideal for SaaS applications serving multiple customers:

### Tenant Isolation

Per-row tenant isolation is installed with an attribute policy, one per label,
and resolved against a per-user attribute:

```gql
-- Row is visible only when row.tenant_id equals the caller's `tenant` attribute
CALL geode.rls.add_attribute_policy('app', 'Customer', 'tenant_id', 'tenant');
CALL geode.rls.add_attribute_policy('app', 'Order',    'tenant_id', 'tenant');

-- Give each user their tenant value
CALL geode.auth.user_set_attribute('alice', 'tenant', 'tenant_123');
```

{{< callout type="note" >}}
Attribute policies apply to **node labels**. There is no relationship-level RLS
policy, and no wildcard that covers every label at once — register one policy per
label you need to protect.
{{< /callout >}}

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

Some data may be shared across tenants. An attribute policy tests a single
equality, so "shared OR mine" cannot be expressed directly. The simplest model is
to leave shared labels unprotected, so every tenant can read them:

```gql
-- No attribute policy on :ReferenceData, so it stays readable by every tenant.
CALL geode.rls.policy_count();

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
-- Employee.employee_id must equal the caller's 'username' principal attribute
CALL geode.rls.add_attribute_policy('app', 'Employee', 'employee_id', 'username');

-- Managers can see their direct reports
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Employee', 'access_tag', 'access_tag');

-- Directors can see entire department
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Employee', 'access_tag', 'access_tag');

-- Executives can see everything
CREATE POLICY executive_all_access ON GRAPH app FOR READ, MATCH USING true;
```

### Graph-Based Hierarchy

Use the graph structure itself for hierarchical access:

```gql
-- Access based on organizational graph structure
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Employee', 'access_tag', 'access_tag');
```

## Attribute-Based Access Control

Define access based on node properties:

```gql
-- Access based on security clearance level
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Document', 'access_tag', 'access_tag');

-- Access based on data classification
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'DataAsset', 'access_tag', 'access_tag');

-- Time-based access
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'TemporaryData', 'access_tag', 'access_tag');
```

## Column-Level Security with RLS

Restrict access to specific properties:

```gql
-- Policy that only exposes certain properties
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Employee', 'access_tag', 'access_tag');

-- Sensitive properties like salary not included
MATCH (e:Employee)
RETURN e.name, e.salary;  -- salary is NULL for public role
```

## Conditional Insert/Update Policies

Write actions are gated at the **graph** level, by action, not per row. The action
list is `READ`, `WRITE`, `MATCH`, `CREATE`, `UPDATE`, `DELETE`, `SCHEMA`:

```gql
-- Only alice may create or update in the `app` graph
CREATE POLICY app_writers ON GRAPH app FOR CREATE, UPDATE
  USING (current_user() = 'alice');

-- Nobody gets DELETE via this policy; it is simply not granted
CREATE POLICY app_readers ON GRAPH app FOR READ, MATCH USING true;
```

{{< callout type="warning" >}}
Geode has no per-row `WITH CHECK` enforcement on writes: an attribute policy
filters what a query can **read**, it does not validate the values a write
supplies. Enforce write-side invariants in the application, or with a uniqueness
or existence constraint. A row-valued predicate such as
`USING (status != 'archived')` does not compile and would silently deny all
access — see the [`USING` subset](/tags/rls/#the-using-expression-subset).
{{< /callout >}}

## Policy Functions

Create reusable functions for complex policies:

```gql
-- Define helper function
-- Geode has no user-defined functions, aggregates or procedures: the
-- grammar has no CREATE FUNCTION / AGGREGATE / PROCEDURE. Inline the
-- logic into the query, or compute it in the client.

-- Use in policy
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Document', 'access_tag', 'access_tag');
```

## Performance Optimization

RLS policies can impact query performance if not carefully designed:

### Index Filtered Properties

An attribute policy adds an equality test on the row property to every scan of
that label, so index the property the policy names:

```gql
CREATE INDEX customer_tenant FOR (c:Customer) ON (c.tenant_id);

-- The policy compares that same indexed property
CALL geode.rls.add_attribute_policy('app', 'Customer', 'tenant_id', 'tenant');
```

### Avoid Complex Subqueries

```gql
-- Inefficient: Complex EXISTS subquery for every node
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Document', 'access_tag', 'access_tag');

-- More efficient: Pre-compute accessible documents
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Document', 'access_tag', 'access_tag');
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
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Employee', 'access_tag', 'access_tag');

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
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Employee', 'access_tag', 'access_tag');
```

### Time-Based Access

```gql
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'SensitiveData', 'access_tag', 'access_tag');
```

### Geographic Restrictions

```gql
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'CustomerData', 'access_tag', 'access_tag');
```

### Data Owner Access

```gql
-- Not expressible as a Geode policy predicate (only `=` against a string
-- literal compiles); precompute the decision into a property instead:
CALL geode.rls.add_attribute_policy('app', 'Document', 'access_tag', 'access_tag');
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
- [Authentication](/docs/security/authentication/) - User authentication and identity
- [Authorization](/docs/security/authorization/) - Role-based access control
- [Performance](/docs/performance/) - Optimizing RLS policy performance
- [Security Overview](/docs/security/) - Security best practices
