---
title: "Data Governance"
description: "Complete guide to data governance in Geode. Learn how to implement data quality, lineage tracking, metadata management, access policies, and compliance controls for enterprise graph databases."
keywords:
  - data governance
  - data quality
  - data lineage
  - metadata management
  - data catalog
  - data policies
  - compliance
  - stewardship
  - Geode
  - graph database
  - enterprise data
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/governance/"
    noindex: false
    title: "Data Governance - Geode Graph Database"
    description: "Implement comprehensive data governance in Geode. Track data lineage, enforce quality policies, manage metadata, and maintain compliance with enterprise governance frameworks."
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

Data governance in Geode provides comprehensive capabilities for managing data quality, tracking lineage, enforcing policies, and maintaining compliance across your graph database. This guide covers the tools and practices for implementing effective data governance in enterprise environments.

## Data Governance Overview

Data governance ensures that data is:
- **Accurate**: Data quality meets business requirements
- **Secure**: Access is controlled and audited
- **Compliant**: Regulatory requirements are met
- **Discoverable**: Users can find and understand data
- **Traceable**: Data lineage is documented
- **Consistent**: Standards are enforced across the organization

Geode provides built-in features to support all aspects of data governance.

## Data Quality Management

### Schema Constraints

Define data quality rules using schema constraints:

```gql
-- Ensure email addresses are valid
CREATE CONSTRAINT valid_email
  ON (u:User)
  ASSERT u.email MATCHES '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';

-- Ensure phone numbers follow E.164 format
CREATE CONSTRAINT valid_phone
  ON (c:Contact)
  ASSERT c.phone MATCHES '^\+[1-9]\d{1,14}$';

-- Ensure dates are in the future for events
CREATE CONSTRAINT future_event
  ON (e:Event)
  ASSERT e.event_date > current_date();

-- Ensure numeric ranges
CREATE CONSTRAINT valid_age
  ON (p:Person)
  ASSERT p.age >= 0 AND p.age <= 150;

-- Ensure required fields are present
CREATE CONSTRAINT required_fields
  ON (p:Product)
  ASSERT p.name IS NOT NULL
    AND p.sku IS NOT NULL
    AND p.price IS NOT NULL;
```

### Data Quality Checks

Implement automated data quality checks:

```gql
-- Find records with missing required data
MATCH (p:Person)
WHERE p.email IS NULL
   OR p.name IS NULL
   OR p.created_at IS NULL
RETURN count(p) AS incomplete_records;

-- Find duplicate records
MATCH (p1:Person), (p2:Person)
WHERE p1.email = p2.email
  AND id(p1) < id(p2)
RETURN p1.email, count(*) AS duplicates;

-- Find orphaned relationships
MATCH ()-[r:BELONGS_TO]->()
WHERE NOT EXISTS {
  MATCH (n)-[r]->(m)
  WHERE n:Entity AND m:Group
}
RETURN count(r) AS orphaned_relationships;

-- Validate referential integrity
MATCH (o:Order)-[:ORDERED_BY]->(c:Customer)
WHERE NOT EXISTS {
  MATCH (c) WHERE c:Customer
}
RETURN count(o) AS orders_without_customers;
```

### Data Quality Metrics

Track data quality over time:

```gql
-- Create data quality metrics
CREATE (:DataQualityMetric {
  name: 'email_completeness',
  timestamp: current_timestamp(),
  total_records: count {MATCH (p:Person) RETURN p},
  complete_records: count {MATCH (p:Person) WHERE p.email IS NOT NULL RETURN p},
  completeness_pct: 100.0 * count {MATCH (p:Person) WHERE p.email IS NOT NULL RETURN p} /
                           count {MATCH (p:Person) RETURN p}
});

-- Query quality trends
MATCH (m:DataQualityMetric)
WHERE m.name = 'email_completeness'
  AND m.timestamp > current_timestamp() - duration('P30D')
RETURN m.timestamp, m.completeness_pct
ORDER BY m.timestamp;
```

## Data Lineage Tracking

Track how data flows through your systems and transformations:

### Lineage Model

Model data lineage in the graph:

```gql
-- Source systems
CREATE (:DataSource {
  id: 'crm_system',
  name: 'Customer CRM',
  type: 'database',
  connection: 'postgresql://crm.example.com'
});

-- Data transformations
CREATE (:DataTransformation {
  id: 'etl_customer_enrichment',
  name: 'Customer Data Enrichment',
  type: 'ETL',
  script: 'customer_enrichment.py',
  version: '2.1.0',
  last_run: current_timestamp()
});

-- Data assets
CREATE (:DataAsset {
  id: 'customer_360',
  name: 'Customer 360 View',
  type: 'graph',
  schema: 'Person, Company, Product'
});

-- Create lineage relationships
MATCH (source:DataSource {id: 'crm_system'})
MATCH (transform:DataTransformation {id: 'etl_customer_enrichment'})
MATCH (asset:DataAsset {id: 'customer_360'})
CREATE (source)-[:FEEDS]->(transform)
CREATE (transform)-[:PRODUCES]->(asset);
```

### Automatic Lineage Tracking

Enable automatic lineage tracking:

```bash
# Enable lineage tracking for all queries
geode serve --lineage-tracking=enabled \
  --lineage-detail=full \
  --lineage-storage=graph
```

Query lineage information:

```gql
-- Find all data sources for a specific asset
MATCH (source:DataSource)-[:FEEDS*]->(asset:DataAsset {id: 'customer_360'})
RETURN source.name, source.type;

-- Trace downstream impact of a data source
MATCH (source:DataSource {id: 'crm_system'})-[:FEEDS*]->(downstream)
RETURN downstream.name, labels(downstream);

-- Find all transformations applied to data
MATCH path = (source)-[:FEEDS*]->(asset:DataAsset {id: 'customer_360'})
WHERE 'DataTransformation' IN labels(nodes(path))
RETURN [n IN nodes(path) WHERE 'DataTransformation' IN labels(n) | n.name] AS transformations;
```

### Impact Analysis

Analyze the impact of changes:

```gql
-- Find all assets affected by changing a source
MATCH (source:DataSource {id: 'crm_system'})-[:FEEDS*]->(affected)
RETURN DISTINCT labels(affected), affected.name
ORDER BY labels(affected);

-- Find all users affected by data source change
MATCH (source:DataSource {id: 'crm_system'})-[:FEEDS*]->(asset:DataAsset)
MATCH (user:User)-[:USES]->(asset)
RETURN DISTINCT user.name, user.email;
```

## Metadata Management

### Data Catalog

Build a searchable data catalog:

```gql
-- Create catalog entries
CREATE (:CatalogEntry {
  id: 'customers_table',
  name: 'Customer Data',
  type: 'dataset',
  description: 'Primary customer information including contact details and preferences',
  owner: 'data-team@example.com',
  created_at: current_timestamp(),
  updated_at: current_timestamp(),
  tags: ['pii', 'customer', 'core'],
  classification: 'confidential',
  retention_period: duration('P7Y')
});

-- Add schema information
CREATE (:SchemaField {
  name: 'email',
  type: 'string',
  description: 'Customer email address',
  required: true,
  pii: true,
  example: 'customer@example.com'
});

-- Link catalog entries to schema
MATCH (catalog:CatalogEntry {id: 'customers_table'})
MATCH (field:SchemaField {name: 'email'})
CREATE (catalog)-[:HAS_FIELD]->(field);
```

### Searchable Metadata

Search the data catalog:

```gql
-- Search by tag
MATCH (entry:CatalogEntry)
WHERE 'pii' IN entry.tags
RETURN entry.name, entry.description;

-- Search by classification
MATCH (entry:CatalogEntry)
WHERE entry.classification = 'confidential'
RETURN entry.name, entry.owner;

-- Full-text search
MATCH (entry:CatalogEntry)
WHERE entry.name CONTAINS 'customer'
   OR entry.description CONTAINS 'customer'
RETURN entry.name, entry.description;
```

### Business Glossary

Define business terms and link to technical assets:

```gql
-- Create business terms
CREATE (:BusinessTerm {
  id: 'customer_lifetime_value',
  name: 'Customer Lifetime Value',
  abbreviation: 'CLV',
  definition: 'Predicted net profit attributed to the entire future relationship with a customer',
  owner: 'finance-team@example.com',
  approved_by: 'CFO',
  approved_at: current_timestamp()
});

-- Link terms to data assets
MATCH (term:BusinessTerm {id: 'customer_lifetime_value'})
MATCH (field:SchemaField {name: 'lifetime_value'})
CREATE (term)-[:DEFINED_BY]->(field);
```

## Access Policies

### Policy-Based Access Control

Define and enforce access policies:

```gql
-- Create data access policy
CREATE (:DataAccessPolicy {
  id: 'pii_access_policy',
  name: 'PII Access Control',
  description: 'Restrict access to personally identifiable information',
  effective_date: current_timestamp(),
  created_by: 'security-team@example.com'
});

-- Define policy rules
CREATE (:PolicyRule {
  policy_id: 'pii_access_policy',
  rule_type: 'row_level_security',
  condition: 'user.has_role("pii_viewer") OR data.owner = current_user()',
  action: 'allow'
});

-- Apply policies to data
MATCH (policy:DataAccessPolicy {id: 'pii_access_policy'})
MATCH (entry:CatalogEntry)
WHERE 'pii' IN entry.tags
CREATE (entry)-[:GOVERNED_BY]->(policy);
```

### Data Classification

Classify data by sensitivity:

```gql
-- Define classification levels
CREATE (:ClassificationLevel {name: 'public', level: 1});
CREATE (:ClassificationLevel {name: 'internal', level: 2});
CREATE (:ClassificationLevel {name: 'confidential', level: 3});
CREATE (:ClassificationLevel {name: 'restricted', level: 4});

-- Classify data assets
MATCH (entry:CatalogEntry {id: 'customers_table'})
MATCH (level:ClassificationLevel {name: 'confidential'})
CREATE (entry)-[:CLASSIFIED_AS]->(level);

-- Enforce classification-based access
CREATE POLICY classification_access
  ON CatalogEntry
  FOR SELECT
  USING {
    MATCH (entry)-[:CLASSIFIED_AS]->(level:ClassificationLevel)
    MATCH (user:User {id: current_user()})
    WHERE user.clearance_level >= level.level
    RETURN true
  };
```

## Data Retention and Lifecycle

### Retention Policies

Define and enforce data retention:

```gql
-- Create retention policy
CREATE (:RetentionPolicy {
  id: 'gdpr_customer_retention',
  name: 'GDPR Customer Data Retention',
  retention_period: duration('P7Y'),
  deletion_method: 'secure_delete',
  legal_basis: 'GDPR Article 5(1)(e)',
  approved_by: 'legal-team@example.com'
});

-- Apply to data
MATCH (policy:RetentionPolicy {id: 'gdpr_customer_retention'})
MATCH (entry:CatalogEntry)
WHERE 'customer' IN entry.tags
CREATE (entry)-[:GOVERNED_BY]->(policy);

-- Find data eligible for deletion
MATCH (data)-[:GOVERNED_BY]->(policy:RetentionPolicy)
WHERE data.created_at + policy.retention_period < current_timestamp()
RETURN data.id, data.name, data.created_at;
```

### Automated Lifecycle Management

```bash
# Enable automated data lifecycle management
geode serve --lifecycle-management=enabled \
  --lifecycle-check-interval=daily \
  --lifecycle-enforcement=true

# Run manual lifecycle check
geode lifecycle-check --policy=gdpr_customer_retention \
  --dry-run=true \
  --output=lifecycle-report.json
```

## Data Stewardship

### Assign Data Stewards

```gql
-- Create stewardship assignments
CREATE (:DataSteward {
  id: 'alice@example.com',
  name: 'Alice Johnson',
  title: 'Senior Data Steward',
  department: 'Data Governance',
  responsibilities: ['Customer Data', 'Product Data']
});

-- Assign stewards to data
MATCH (steward:DataSteward {id: 'alice@example.com'})
MATCH (entry:CatalogEntry)
WHERE 'customer' IN entry.tags
CREATE (steward)-[:RESPONSIBLE_FOR]->(entry);

-- Find steward for specific data
MATCH (steward:DataSteward)-[:RESPONSIBLE_FOR]->(entry:CatalogEntry {id: 'customers_table'})
RETURN steward.name, steward.id;
```

## Compliance Reporting

### Generate Compliance Reports

```bash
# Generate GDPR compliance report
geode governance-report --framework=gdpr \
  --include=data-inventory,lineage,access-log \
  --start-date=2025-01-01 \
  --end-date=2025-12-31 \
  --output=gdpr-compliance-2025.pdf

# Generate data quality report
geode governance-report --type=data-quality \
  --metrics=completeness,accuracy,consistency \
  --output=data-quality-report.json

# Generate access report
geode governance-report --type=access-audit \
  --user=alice@example.com \
  --include-lineage=true \
  --output=access-audit.json
```

### Compliance Dashboards

```gql
-- Data quality dashboard metrics
MATCH (m:DataQualityMetric)
WHERE m.timestamp > current_timestamp() - duration('P1D')
RETURN m.name, avg(m.completeness_pct) AS avg_completeness
ORDER BY m.name;

-- Policy compliance metrics
MATCH (entry:CatalogEntry)-[:GOVERNED_BY]->(policy)
MATCH (violation:PolicyViolation)-[:VIOLATED]->(policy)
RETURN policy.name,
       count(DISTINCT entry) AS governed_assets,
       count(violation) AS violations,
       100.0 * (1 - count(violation)::float / count(DISTINCT entry)) AS compliance_pct;
```

## Data Discovery

### Self-Service Discovery

Enable users to discover data:

```gql
-- Search catalog by keyword
MATCH (entry:CatalogEntry)
WHERE entry.name CONTAINS $keyword
   OR entry.description CONTAINS $keyword
   OR ANY(tag IN entry.tags WHERE tag CONTAINS $keyword)
RETURN entry.name, entry.description, entry.tags, entry.owner;

-- Browse by classification
MATCH (entry:CatalogEntry)-[:CLASSIFIED_AS]->(level:ClassificationLevel)
WHERE level.name = $classification
RETURN entry.name, entry.description;

-- Find related datasets
MATCH (entry:CatalogEntry {id: $dataset_id})-[:RELATED_TO*1..2]-(related:CatalogEntry)
RETURN DISTINCT related.name, related.description;
```

## Best Practices

1. **Establish Clear Ownership**: Assign data stewards for all critical data assets
2. **Document Everything**: Maintain comprehensive metadata for all data
3. **Automate Quality Checks**: Run automated data quality checks regularly
4. **Track Lineage**: Enable automatic lineage tracking for all data flows
5. **Classify Appropriately**: Classify all data by sensitivity level
6. **Enforce Policies**: Use automated policy enforcement, not just documentation
7. **Regular Audits**: Conduct periodic governance audits
8. **User Education**: Train users on governance policies and tools
9. **Measure Effectiveness**: Track governance metrics and KPIs
10. **Continuous Improvement**: Regularly review and update governance policies

## Related Topics

- [Compliance](/tags/compliance/) - Regulatory compliance frameworks
- [Audit Logging](/tags/audit-logging/) - Comprehensive audit trails
- [Row-Level Security](/tags/row-level-security/) - Fine-grained access control
- [Data Integrity](/tags/data-integrity/) - Data consistency and validation
- [Encryption](/tags/encryption/) - Data protection with encryption
- [Configuration](/tags/configuration/) - Governance configuration settings
- [Schema Management](/docs/schema/) - Schema design and constraints
- [Access Control](/docs/security/access-control/) - Permission management
