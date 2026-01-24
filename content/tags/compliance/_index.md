---
title: "Regulatory Compliance (GDPR, HIPAA, SOC2)"
description: "Complete guide to regulatory compliance in Geode. Learn how Geode helps organizations meet GDPR, HIPAA, SOC2, and other compliance requirements with built-in security features and audit capabilities."
keywords:
  - compliance
  - GDPR
  - HIPAA
  - SOC2
  - PCI DSS
  - regulatory compliance
  - data protection
  - privacy
  - security standards
  - audit
  - Geode
  - graph database
  - enterprise database
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/compliance/"
    noindex: false
    title: "Regulatory Compliance (GDPR, HIPAA, SOC2) - Geode Graph Database"
    description: "Meet regulatory compliance requirements with Geode's enterprise security features. GDPR, HIPAA, SOC2, PCI DSS support with comprehensive audit logging and data protection."
---

Geode is designed to help organizations meet stringent regulatory compliance requirements across multiple frameworks including GDPR, HIPAA, SOC2, PCI DSS, and industry-specific regulations. This comprehensive guide covers how Geode's security features support compliance objectives and best practices for deploying compliant graph database systems.

## Compliance Framework Overview

Modern enterprises must comply with multiple regulatory frameworks simultaneously. Geode provides the technical controls and capabilities needed to satisfy requirements across:

- **GDPR**: European data protection and privacy regulation
- **HIPAA**: US healthcare data protection
- **SOC2**: Service organization security controls
- **PCI DSS**: Payment card industry data security
- **ISO 27001**: Information security management
- **CCPA**: California Consumer Privacy Act
- **FedRAMP**: US federal cloud security

## GDPR Compliance

The General Data Protection Regulation (GDPR) imposes strict requirements on organizations that process personal data of EU residents. Geode provides technical capabilities to support GDPR compliance:

### Right to Access (Article 15)

Data subjects have the right to obtain confirmation of whether their personal data is being processed. Geode supports this through comprehensive query capabilities:

```gql
-- Retrieve all personal data for a specific data subject
MATCH (p:Person {email: $data_subject_email})
OPTIONAL MATCH (p)-[r]->(related)
RETURN p, r, related;

-- Find all locations where personal data appears
MATCH (n)
WHERE n.email = $data_subject_email
   OR n.ssn = $data_subject_ssn
   OR n.phone = $data_subject_phone
RETURN labels(n), properties(n);
```

### Right to Erasure (Article 17)

Data subjects can request deletion of their personal data. Geode supports complete and auditable deletion:

```gql
-- Delete all personal data for a data subject
MATCH (p:Person {email: $data_subject_email})
DETACH DELETE p;

-- Anonymize data while preserving graph structure
MATCH (p:Person {email: $data_subject_email})
SET p.email = 'anonymized@deleted.local',
    p.name = 'Deleted User',
    p.ssn = NULL,
    p.phone = NULL,
    p.deleted_at = current_timestamp();
```

All deletion operations are logged in audit trails with:
- Timestamp of deletion
- User who performed the deletion
- Data subject identifier
- Reason for deletion (if provided)
- Confirmation of cascading deletions

### Right to Data Portability (Article 20)

Data subjects can receive their personal data in a structured, machine-readable format:

```gql
-- Export all personal data in structured format
MATCH (p:Person {email: $data_subject_email})
OPTIONAL MATCH (p)-[r]->(related)
RETURN {
  personal_info: properties(p),
  relationships: collect({
    type: type(r),
    target: labels(related),
    properties: properties(r)
  })
} AS data_export;
```

### Data Protection by Design (Article 25)

Geode implements privacy-enhancing features by default:

- **Encryption at rest**: All data encrypted using AES-256-GCM
- **Encryption in transit**: TLS 1.3 for all connections
- **Pseudonymization**: Support for hashed identifiers
- **Data minimization**: Field-level access control limits exposure
- **Purpose limitation**: Row-level security enforces usage boundaries

### Records of Processing Activities (Article 30)

Comprehensive audit logging documents all processing activities:

```bash
# Configure GDPR-compliant audit logging
geode serve --audit-log-level=compliance \
  --audit-retention-days=2555 \
  --audit-events=data_access,data_modification,data_deletion,data_export \
  --audit-include-legal-basis=true
```

Audit logs capture:
- What personal data was accessed
- When it was accessed
- Who accessed it
- Purpose of access (via session metadata)
- Legal basis for processing

### Breach Notification (Article 33)

Geode's security monitoring helps detect and respond to data breaches:

```bash
# Monitor for unusual access patterns
jq 'select(.event_type == "authorization_failure")' audit.log \
  | jq -s 'group_by(.user.ip_address) | map(select(length > 10))'

# Identify mass data exports
jq 'select(.operation.rows_returned > 1000 and .operation.type == "SELECT")' audit.log
```

## HIPAA Compliance

The Health Insurance Portability and Accountability Act requires covered entities to protect health information. Geode provides technical safeguards for HIPAA compliance:

### Administrative Safeguards

**164.308(a)(1)(ii)(D) - Information System Activity Review**

```bash
# Enable comprehensive audit logging for HIPAA
geode serve --audit-log-level=comprehensive \
  --audit-phi-access=true \
  --audit-retention-days=2555 \
  --audit-log-encryption=aes-256-gcm
```

**164.308(a)(3) - Workforce Security**

Implement role-based access control:

```gql
-- Create roles for different workforce members
CREATE ROLE physician;
CREATE ROLE nurse;
CREATE ROLE billing_clerk;
CREATE ROLE researcher;

-- Grant minimum necessary permissions
GRANT SELECT ON Patient TO physician;
GRANT SELECT, INSERT, UPDATE ON MedicalRecord TO physician;
GRANT SELECT ON Patient TO nurse WHERE assigned_nurse = current_user();
GRANT SELECT ON BillingInfo TO billing_clerk;
```

### Physical Safeguards

**164.310(d) - Device and Media Controls**

```bash
# Secure backup with encryption
geode backup create --encryption=aes-256-gcm \
  --output=/secure/backup/location \
  --verify-integrity=true

# Secure disposal of old data
geode data-purge --before-date=2019-01-01 \
  --secure-delete=7-pass \
  --audit-log=true
```

### Technical Safeguards

**164.312(a)(1) - Access Control**

Unique user identification and automatic logoff:

```bash
# Configure session security
geode serve --session-timeout=900 \
  --require-unique-identifiers=true \
  --automatic-logoff=true
```

**164.312(b) - Audit Controls**

```bash
# Comprehensive audit controls
geode serve --audit-events=all \
  --audit-log-immutable=true \
  --audit-log-integrity-check=hourly
```

**164.312(c) - Integrity Controls**

Cryptographic checksums for data integrity:

```bash
# Enable integrity verification
geode serve --data-integrity-checks=true \
  --checksum-algorithm=sha256 \
  --verify-on-read=true
```

**164.312(d) - Person or Entity Authentication**

Multi-factor authentication support:

```bash
# Require MFA for PHI access
geode serve --require-mfa=true \
  --mfa-providers=totp,webauthn \
  --mfa-grace-period=0
```

**164.312(e) - Transmission Security**

TLS 1.3 encryption for all transmissions:

```bash
# Enforce secure transmission
geode serve --tls-min-version=1.3 \
  --tls-cipher-suites=TLS_AES_256_GCM_SHA384 \
  --require-client-certificates=true
```

### Minimum Necessary Standard

Implement minimum necessary access:

```gql
-- Row-level security for minimum necessary
CREATE POLICY minimum_necessary_physicians
  ON Patient
  FOR SELECT
  TO physician
  USING (assigned_physician = current_user());

CREATE POLICY minimum_necessary_researchers
  ON Patient
  FOR SELECT
  TO researcher
  USING (patient_id IN (SELECT patient_id FROM research_cohort WHERE researcher = current_user()))
  WITH COLUMNS (age, diagnosis, treatment)  -- Exclude name, SSN, address
```

## SOC 2 Compliance

Service Organization Control 2 focuses on security, availability, processing integrity, confidentiality, and privacy. Geode supports all five trust service criteria:

### Security (Common Criteria)

**CC6.1 - Logical and Physical Access Controls**

```bash
# Implement comprehensive access controls
geode serve --rbac-enabled=true \
  --require-authentication=true \
  --password-policy=strict \
  --session-security=high
```

**CC6.2 - Identification and Authentication**

```bash
# Strong authentication requirements
geode serve --password-min-length=14 \
  --password-complexity=high \
  --password-rotation-days=90 \
  --lockout-threshold=5 \
  --lockout-duration=30min
```

**CC6.6 - Logical and Physical Access Controls - Vulnerabilities**

Regular security updates and vulnerability management:

```bash
# Check for security updates
geode version --check-updates --security-only

# Enable security monitoring
geode serve --security-monitoring=enabled \
  --vulnerability-scanning=continuous
```

**CC7.2 - System Monitoring - Detection of Security Events**

```bash
# Real-time security monitoring
geode serve --security-events=alert \
  --alert-channels=email,pagerduty,slack \
  --alert-threshold=medium
```

### Availability

**A1.2 - Environmental Protections**

```bash
# High availability configuration
geode serve --mode=cluster \
  --replication-factor=3 \
  --auto-failover=true \
  --health-check-interval=10s
```

### Processing Integrity

**PI1.5 - Data Validation**

```gql
-- Schema constraints ensure data integrity
CREATE CONSTRAINT valid_ssn
  ON (p:Patient)
  ASSERT p.ssn MATCHES '^\d{3}-\d{2}-\d{4}$';

CREATE CONSTRAINT valid_email
  ON (u:User)
  ASSERT u.email MATCHES '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';
```

### Confidentiality

**C1.2 - Encryption of Confidential Information**

```bash
# Comprehensive encryption
geode serve --encryption-at-rest=aes-256-gcm \
  --encryption-in-transit=tls-1.3 \
  --key-rotation-days=90 \
  --encryption-key-provider=hsm
```

### Privacy

**P4.2 - Obtaining Consent**

Track consent in the graph:

```gql
-- Model consent in the graph
CREATE (p:Person {id: $person_id})
CREATE (c:Consent {
  purpose: 'marketing',
  granted_at: current_timestamp(),
  granted_by: $person_id,
  expires_at: timestamp() + duration('P1Y'),
  can_revoke: true
})
CREATE (p)-[:GRANTED]->(c);

-- Enforce consent in queries
MATCH (p:Person {id: $person_id})-[:GRANTED]->(c:Consent)
WHERE c.purpose = 'marketing'
  AND c.expires_at > current_timestamp()
RETURN p;
```

## PCI DSS Compliance

For organizations handling payment card data, Geode supports PCI DSS requirements:

### Requirement 2: Strong Cryptography

```bash
# PCI DSS compliant encryption
geode serve --encryption-algorithm=aes-256-gcm \
  --key-length=256 \
  --tls-version=1.3
```

### Requirement 8: Strong Access Control

```bash
# PCI DSS access controls
geode serve --password-min-length=15 \
  --password-complexity=strict \
  --mfa-required=true \
  --session-timeout=900
```

### Requirement 10: Audit Logging

```bash
# PCI DSS audit requirements
geode serve --audit-log-level=comprehensive \
  --audit-log-tamper-proof=true \
  --audit-retention-days=365 \
  --audit-review-frequency=daily
```

### Data Masking for PCI

```gql
-- Mask credit card numbers in logs and queries
MATCH (txn:Transaction)
RETURN txn.id,
       substring(txn.card_number, 0, 4) + '********' + substring(txn.card_number, -4, 4) AS masked_card,
       txn.amount;
```

## Compliance Monitoring

### Automated Compliance Checks

```bash
# Run compliance validation
geode compliance-check --framework=gdpr,hipaa,soc2 \
  --report-format=json \
  --output=compliance-report.json

# Example output:
# {
#   "framework": "GDPR",
#   "status": "compliant",
#   "checks": {
#     "encryption_at_rest": "pass",
#     "encryption_in_transit": "pass",
#     "audit_logging": "pass",
#     "data_retention": "pass",
#     "access_controls": "pass"
#   },
#   "recommendations": []
# }
```

### Compliance Reporting

Generate compliance reports for auditors:

```bash
# Generate SOC 2 compliance report
geode compliance-report --framework=soc2 \
  --start-date=2025-01-01 \
  --end-date=2025-12-31 \
  --include-evidence=true \
  --output=soc2-report-2025.pdf

# Generate GDPR data processing report
geode compliance-report --framework=gdpr \
  --report-type=processing-activities \
  --include-legal-basis=true \
  --output=gdpr-article-30-report.pdf
```

## Best Practices

1. **Defense in Depth**: Implement multiple layers of security controls
2. **Regular Audits**: Conduct periodic compliance audits and gap assessments
3. **Documentation**: Maintain detailed documentation of security controls and processes
4. **Training**: Ensure all users understand their compliance responsibilities
5. **Monitoring**: Implement continuous compliance monitoring and alerting
6. **Incident Response**: Develop and test incident response procedures
7. **Third-Party Risk**: Assess compliance of all third-party integrations
8. **Data Lifecycle**: Implement compliant data retention and deletion policies
9. **Encryption Everywhere**: Encrypt data at rest, in transit, and in use
10. **Principle of Least Privilege**: Grant minimum necessary access

## Compliance Certifications

Geode undergoes regular third-party audits and maintains certifications:

- **SOC 2 Type II**: Annual audit by independent CPA firms
- **ISO 27001**: Information security management certification
- **FedRAMP**: Authorized for US federal government use
- **HIPAA**: Business Associate Agreement available
- **GDPR**: Data Processing Agreement available

Contact compliance@geodedb.com for certification documentation.

## Related Topics

- [Audit Logging](/tags/audit-logging/) - Comprehensive audit logging and compliance tracking
- [Row-Level Security](/tags/row-level-security/) - Fine-grained access control
- [Encryption](/tags/encryption/) - Data encryption at rest and in transit
- [Data Governance](/tags/governance/) - Data governance policies and enforcement
- [Data Integrity](/tags/data-integrity/) - Ensuring data consistency and accuracy
- [Configuration](/tags/configuration/) - Security configuration best practices
- [Authentication](/docs/security/authentication/) - User authentication systems
- [Authorization](/docs/security/authorization/) - Access control and permissions
