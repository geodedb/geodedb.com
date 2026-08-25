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

Row-Level Security (RLS) in Geode restricts which nodes a query can observe, based on the calling principal. Geode ships **two distinct mechanisms**, and they have very different capabilities. Choosing the wrong one is the single most common way to end up with a policy that silently denies everything — or one that silently protects nothing.

{{< callout type="warning" >}}
**Read this before writing a policy.** Geode's `CREATE POLICY … USING (…)` expression compiler implements only a **small subset** of predicate syntax (see [The `USING` expression subset](#the-using-expression-subset)). An expression outside that subset is **accepted at DDL time without error**, stored uncompiled, and then **never grants access** — the policy fails closed and the protected graph appears empty. There is no warning at `CREATE POLICY` time. Verify every policy with `SHOW POLICIES` and a read-back query as shown in [Verifying a policy actually works](#verifying-a-policy-actually-works).
{{< /callout >}}

## Choosing a mechanism

| Need | Use | Granularity |
|------|-----|-------------|
| Per-row filtering on a property (ownership, tenant tag, department) | `CALL geode.rls.add_attribute_policy(…)` | **Per row**, compares a row property to a principal attribute |
| Deny a label outright to a user | `CALL geode.rls.add_deny_policy(…)` | Per (graph, label, user) |
| Coarse allow/deny on a whole graph, optionally conditioned on *who* or *which tenant* is calling | `CREATE POLICY … ON GRAPH … USING (…)` | Per graph, literal comparison only |

The per-row mechanism is the one most people mean by "row-level security". `CREATE POLICY` is a graph-scoped authorization gate, not a row filter.

## Per-row filtering (attribute policies)

This is the real per-row ABAC path. It installs a **restrictive** policy that admits a row only when a named row property equals a named attribute on the calling principal.

```gql
CALL geode.rls.add_attribute_policy('social', 'Customer', 'tenant_id', 'tenant');
```

The four arguments are `(graph, label, row_property, attribute_key)`. The policy this installs is equivalent to the predicate:

```
row.tenant_id = principal.attribute.tenant
```

Attributes are set per user, and are what the policy resolves against at query time:

```gql
CALL geode.auth.user_set_attribute('alice', 'tenant', 'acme');
CALL geode.auth.user_set_attribute('bob',   'tenant', 'globex');
```

With that in place, `MATCH (c:Customer) RETURN c.name` returns only `acme` rows for `alice` and only `globex` rows for `bob`, with no change to the query.

Because the policy is restrictive, a principal with **no** value for the attribute key matches nothing — the mechanism fails closed rather than falling back to "see everything".

To remove a policy, pass the same four arguments:

```gql
CALL geode.rls.remove_attribute_policy('social', 'Customer', 'tenant_id', 'tenant');
CALL geode.rls.policy_count();
```

### Ownership filtering

The same shape covers per-user ownership. Store the owner on the row, and give each user an attribute holding their own identifier:

```gql
CALL geode.auth.user_set_attribute('alice', 'employee_id', 'E-1001');
CALL geode.rls.add_attribute_policy('hr', 'UserProfile', 'owner_id', 'employee_id');
```

`MATCH (p:UserProfile) RETURN p` now yields only rows whose `owner_id` is `E-1001` for `alice`.

{{< callout type="info" >}}
`geode.rls.add_attribute_policy` compares **one property to one attribute, for equality**. It cannot express ranges, `OR` branches, relationship traversal, or subqueries. Model those as a precomputed property that a single equality can test — for example, write a `visibility_bucket` property at ingest time instead of comparing a clearance level at read time. Richer predicates are available, but only over the client API — see [The expression-RLS grammar](#the-expression-rls-grammar).
{{< /callout >}}

### The expression-RLS grammar

`add_attribute_policy` is a convenience wrapper: it builds the predicate
`row.<property> = principal.attribute.<key>` and hands it to the expression-RLS
engine. That engine accepts a **richer** grammar than the `CREATE POLICY … USING`
compiler described below, but from GQL there is no procedure that takes an
arbitrary expression — the wrapper is the only entry point. A raw predicate can be
supplied through a client's RLS-policy API (for example `RLSPolicy(using_expression=…)`
in the Python client):

```
or_     := and_ ( "OR"  and_ )*
and_    := cmp  ( "AND" cmp  )*
cmp     := unary ( ( "=" | "<>" | "!=" | "<=" | ">=" | "<" | ">" ) unary )?
unary   := "NOT" unary | primary
primary := "(" or_ ")" | "TRUE" | "FALSE" | "NULL"
         | "row." <ident> | "principal.attribute." <ident>
         | "current_user" | "'" <string> "'" | <integer>
```

Note that here `current_user` is a **bare keyword with no parentheses** — unlike the
`current_user()` call form used by `CREATE POLICY … USING`. The two mechanisms have
separate, incompatible expression languages; a predicate written for one will not
work in the other.

```python
# Python client: an ownership predicate the wrapper cannot express
RLSPolicy(name="own_or_public", table="Document", graph="app",
          using_expression="row.owner = current_user OR row.visibility = 'public'")
```

### Denying a label to a user

```gql
CALL geode.rls.add_deny_policy('social', 'AuditRecord', 'contractor');
CALL geode.rls.list_deny_policies('social');
CALL geode.rls.remove_deny_policy('social', 'AuditRecord', 'contractor');
```

## Graph-scoped policies (`CREATE POLICY`)

`CREATE POLICY` scopes to a **graph**, not a label, and its real grammar is:

```gql
CREATE POLICY <name> ON GRAPH (<graph_name> | *)
  FOR <action>[, <action> …]
  [USING <expression>];
```

Valid actions are exactly `READ`, `WRITE`, `MATCH`, `CREATE`, `UPDATE`, `DELETE` and `SCHEMA`. `SELECT`, `INSERT` and `ALL` are **not** accepted and will fail to parse.

```gql
-- Unconditional allow on one graph
CREATE POLICY analytics_read ON GRAPH analytics FOR READ, MATCH USING true;

-- Scope to every graph
CREATE POLICY schema_lockdown ON GRAPH * FOR SCHEMA USING true;
```

{{< callout type="warning" >}}
A `TO ROLE …` clause parses but is **discarded** — it does not restrict the policy to that role. Do not rely on it to target a policy at a subset of users.
{{< /callout >}}

### The `USING` expression subset

The expression compiler accepts only this grammar:

```
expr   ::= or_expr
or_    ::= and_ ( "OR" and_ )*
and_   ::= atom ( "AND" atom )*
atom   ::= "(" expr ")"
         | "true"
         | "current_user()"    "=" string_literal
         | "current_tenant()"  "=" string_literal
         | "current_graph()"   "=" string_literal
         | "resource.label"    "=" string_literal
         | "principal.attributes." <key> "=" string_literal
```

Every comparison must have a **string literal** on the right-hand side, and comparisons are case-sensitive. `AND` binds tighter than `OR`.

```gql
-- Compiles: literal comparisons combined with AND / OR
CREATE POLICY acme_customers ON GRAPH sales FOR READ, MATCH
  USING (current_tenant() = 'acme' AND resource.label = 'Customer');

CREATE POLICY oncall_access ON GRAPH ops FOR READ
  USING (current_user() = 'alice' OR current_user() = 'bob');

CREATE POLICY analyst_attr ON GRAPH sales FOR READ
  USING (principal.attributes.department = 'finance');
```

These do **not** compile, and each silently produces a deny-everything policy:

```gql
-- WRONG: right-hand side is a row property, not a string literal.
CREATE POLICY bad_owner ON GRAPH sales FOR READ
  USING (current_user() = n.owner);

-- WRONG: current_user_id() and current_user_property() do not exist anywhere
-- in Geode — not as policy accessors and not as GQL functions.
CREATE POLICY bad_fn ON GRAPH sales FOR READ
  USING (owner_id = current_user_id());

-- WRONG: no comparison operator other than "=", no NOT, no EXISTS, no subquery.
CREATE POLICY bad_cmp ON GRAPH docs FOR READ
  USING (classification_level <= '3');
```

{{< callout type="danger" >}}
Each of the three statements above **succeeds** at DDL time. The compiler returns an error, the error is discarded, and the policy is stored with no compiled expression. At evaluation time an uncompiled, non-`true` policy never contributes an ALLOW, so the graph reads as empty for every principal the policy covers. Always confirm behaviour with a read-back query.
{{< /callout >}}

`current_user()`, `current_tenant()`, `current_graph()` and `resource.label` are **policy accessors only**. They are not GQL scalar functions — `RETURN current_user()` is not a valid query.

## Verifying a policy actually works

Because a malformed predicate fails closed and silently, treat a read-back as mandatory:

```gql
SHOW POLICIES;
```

Then confirm the policy admits what you expect, as the principal it targets:

```gql
MATCH (c:Customer) RETURN count(c) AS visible;
```

If `visible` is `0` where you expected rows, the predicate almost certainly failed to compile. Re-check it against [the supported subset](#the-using-expression-subset) — the most common cause is a non-literal right-hand side.

From the shell, the same catalog is reachable over the CLI:

```bash
geode policy list
geode policy show acme_customers
```

## Managing policies

```gql
-- Enable / disable without dropping
ALTER POLICY acme_customers SET ENABLED false;
ALTER POLICY acme_customers SET ENABLED true;

-- Rename
ALTER POLICY acme_customers RENAME TO tenant_acme_customers;

-- Drop
DROP POLICY tenant_acme_customers;
DROP POLICY IF EXISTS stale_policy;
```

Policy DDL persists durably and survives restart. `ALTER POLICY … SET ENABLED` and `RENAME TO` are the only two `ALTER` forms; there is no `ALTER POLICY … USING …` to swap a predicate — drop the policy and recreate it.

```bash
geode policy create tenant_acme
geode policy delete tenant_acme
```

## Multi-tenant isolation

For tenant isolation, prefer the per-row attribute policy — it scales to any number of tenants without a policy per tenant:

```gql
CALL geode.rls.add_attribute_policy('sales', 'Customer', 'tenant_id', 'tenant');
CALL geode.rls.add_attribute_policy('sales', 'Order',    'tenant_id', 'tenant');
CALL geode.auth.user_set_attribute('alice', 'tenant', 'acme');
```

A graph-scoped policy would need one `CREATE POLICY … USING (current_tenant() = '<literal>')` per tenant, since the tenant value must be a literal. That is workable for a handful of fixed tenants and unworkable beyond that.

{{< callout type="warning" >}}
Geode is **single-tenant recommended** for production. Multi-tenant deployments carry documented residuals and require operator review. Never run production with `--insecure-allow-all`: it bypasses tenant isolation, RLS and field-level encryption authorization for every request.
{{< /callout >}}

## Indexing for RLS

An attribute policy adds an equality test on the row property to every scan of that label. Index it:

```gql
CREATE INDEX customer_tenant FOR (c:Customer) ON (c.tenant_id);
CREATE INDEX profile_owner  FOR (p:UserProfile) ON (p.owner_id);
```

Confirm the index is used with the planner:

```gql
EXPLAIN MATCH (c:Customer) WHERE c.tenant_id = 'acme' RETURN c;
```

## What Geode does not provide

These appear in other databases' RLS documentation and have **no** Geode equivalent:

- `current_user_id()`, `current_user_property()`, `current_user_roles()`, `current_session_property()` — none exist.
- Predicates over relationships, `EXISTS { … }` subqueries, or variable-length traversal inside a policy.
- Comparison operators other than `=` inside `USING`.
- `WITH CHECK` enforcement on writes — the clause parses but is discarded.
- `GRANT BYPASS RLS` — there is no bypass privilege. Remove or disable the policy instead.
- Per-policy performance counters or a policy-cost report.

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
