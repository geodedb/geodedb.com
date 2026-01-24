---
title: "Key Management System (KMS) Integration"
description: "Enterprise key management for Geode: HashiCorp Vault, AWS KMS, envelope encryption, automated rotation, and secure key lifecycle management"
keywords: ["KMS", "key management", "HashiCorp Vault", "AWS KMS", "envelope encryption", "key rotation", "master key", "data encryption key", "TDE"]
weight: 50
slug: "kms-integration"
canonical: "https://geodedb.com/docs/security/kms-integration/"
---

# Key Management System (KMS) Integration

Geode provides enterprise-grade Key Management Service integration for Transparent Data Encryption (TDE) with support for multiple KMS providers, automated key rotation, and comprehensive audit trails.

## Overview

### Why Use External KMS?

External Key Management Systems provide:

- **Centralized Key Storage**: Master keys stored in hardware security modules (HSM)
- **Access Control**: Fine-grained permissions and multi-factor authentication
- **Audit Trails**: Complete key access logging for compliance
- **Key Rotation**: Automated rotation with policy enforcement
- **Disaster Recovery**: Key backup and replication across regions
- **Compliance**: SOX, PCI-DSS, HIPAA, GDPR requirements

### Architecture

Geode uses **envelope encryption** for optimal security and performance:

```
Master Key (in KMS - HSM-backed)
 └─ Data Encryption Key (DEK, wrapped by master)
     ├─ Data Page Encryption
     └─ WAL Record Encryption
```

**Benefits**:
- Master keys never leave KMS
- DEKs encrypted at rest (wrapped)
- Fast local encryption with DEKs
- Master key rotation without re-encrypting data

## Supported KMS Providers

| Provider | Use Case | Features |
|----------|----------|----------|
| **HashiCorp Vault** | Enterprise, on-premise | Transit engine, dynamic secrets, audit |
| **AWS KMS** | Cloud native AWS | HSM-backed, multi-region, automatic rotation |
| **Azure Key Vault** | Cloud native Azure | HSM-backed, RBAC, managed keys |
| **GCP Cloud KMS** | Cloud native GCP | HSM-backed, IAM integration |
| **Environment Variable** | Development only | Simple config, NOT for production |
| **File-based** | Local testing | File storage, NOT for production |

## Quick Start

### Using HashiCorp Vault

```bash
# 1. Set Vault environment
export VAULT_ADDR="https://vault.company.com"
export VAULT_TOKEN="hvs.CAESI..."

# 2. Configure Geode
export GEODE_KMS_PROVIDER="vault"
export GEODE_VAULT_KEY_PATH="geode/encryption"

# 3. Start Geode with Vault-backed TDE
./geode serve --enable-tde --kms-provider vault
```

### Using AWS KMS

```bash
# 1. Set AWS credentials
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."

# 2. Configure Geode
export GEODE_KMS_PROVIDER="aws"
export GEODE_AWS_KMS_KEY_ID="arn:aws:kms:us-east-1:123456789012:key/..."

# 3. Start Geode
./geode serve --enable-tde --kms-provider aws
```

## HashiCorp Vault Integration

### Prerequisites

- Vault 1.15.0+
- Vault transit engine enabled
- Valid authentication token
- Network access to Vault server

### Setup Steps

#### 1. Enable Vault Transit Engine

```bash
# Enable transit secrets engine
vault secrets enable -path=geode transit

# Create encryption key
vault write -f geode/keys/master-key
```

#### 2. Configure Vault Policy

```bash
# Create policy for Geode
vault policy write geode-tde - <<EOF
path "geode/keys/master-key" {
  capabilities = ["read"]
}

path "geode/encrypt/*" {
  capabilities = ["create", "update"]
}

path "geode/decrypt/*" {
  capabilities = ["create", "update"]
}

path "geode/keys/master-key/rotate" {
  capabilities = ["update"]
}
EOF

# Create token with policy
vault token create -policy=geode-tde -ttl=8760h
```

#### 3. Configure Geode

Create `geode.yaml`:
```yaml
security:
  tde:
    enabled: true
    kms:
      provider: vault
      vault:
        address: "https://vault.company.com:8200"
        token: "${VAULT_TOKEN}"
        key_path: "geode/keys/master-key"
        namespace: "geode"  # Optional
        tls_verify: true
        ca_cert: "/etc/geode/vault-ca.pem"  # Optional
```

Start Geode:
```bash
export VAULT_TOKEN="hvs.CAESI..."
./geode serve --config geode.yaml
```

### Vault Operations

#### Encrypt Data Key

```bash
# Geode automatically wraps DEKs
# Manual example:
vault write geode/encrypt/master-key \
  plaintext=$(echo -n "data-encryption-key-32-bytes" | base64)
```

#### Decrypt Data Key

```bash
vault write geode/decrypt/master-key \
  ciphertext="vault:v1:abcd1234..."
```

#### Rotate Master Key

```bash
# Rotate Vault key
vault write -f geode/keys/master-key/rotate

# Trigger Geode rewrap
geode key rewrap --kms-provider vault
```

### High Availability

```yaml
security:
  tde:
    kms:
      vault:
        address: "https://vault-cluster.company.com:8200"
        max_retries: 3
        timeout: 30s
        standby_addresses:
          - "https://vault-1.company.com:8200"
          - "https://vault-2.company.com:8200"
          - "https://vault-3.company.com:8200"
```

## AWS KMS Integration

### Prerequisites

- AWS account with KMS permissions
- IAM role or access keys
- KMS key created in desired region

### Setup Steps

#### 1. Create KMS Key

```bash
# Create customer-managed key
aws kms create-key \
  --description "Geode TDE Master Key" \
  --key-usage ENCRYPT_DECRYPT \
  --origin AWS_KMS \
  --multi-region

# Create alias
aws kms create-alias \
  --alias-name alias/geode-tde \
  --target-key-id <key-id>
```

#### 2. Configure IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:DescribeKey",
        "kms:GenerateDataKey",
        "kms:GenerateDataKeyWithoutPlaintext"
      ],
      "Resource": "arn:aws:kms:*:123456789012:key/*",
      "Condition": {
        "StringEquals": {
          "kms:EncryptionContext:Application": "Geode"
        }
      }
    }
  ]
}
```

#### 3. Configure Geode

```yaml
security:
  tde:
    enabled: true
    kms:
      provider: aws
      aws:
        region: "us-east-1"
        key_id: "arn:aws:kms:us-east-1:123456789012:key/..."
        # Or use alias:
        # key_id: "alias/geode-tde"
        encryption_context:
          Application: "Geode"
          Environment: "production"
```

### Multi-Region Deployment

```yaml
security:
  tde:
    kms:
      aws:
        # Primary region
        region: "us-east-1"
        key_id: "arn:aws:kms:us-east-1:123456789012:key/..."

        # Replicas for DR
        replica_keys:
          eu-west-1: "arn:aws:kms:eu-west-1:123456789012:key/..."
          ap-southeast-1: "arn:aws:kms:ap-southeast-1:123456789012:key/..."
```

### Cost Optimization

```yaml
security:
  tde:
    kms:
      aws:
        # Cache DEK for 1 hour
        data_key_cache_seconds: 3600
        # Use 256-bit keys
        data_key_spec: "AES_256"
```

**Estimated costs** (AWS pricing):
- Key storage: $1/month per key
- API requests: $0.03 per 10,000 requests
- With 1-hour cache: ~$5/month for 1M operations/day

## Azure Key Vault Integration

### Setup Steps

#### 1. Create Key Vault

```bash
# Create Key Vault
az keyvault create \
  --name geode-kms \
  --resource-group geode-rg \
  --location eastus \
  --enable-purge-protection true

# Create encryption key
az keyvault key create \
  --vault-name geode-kms \
  --name geode-master-key \
  --protection hsm \
  --ops encrypt decrypt wrapKey unwrapKey
```

#### 2. Configure Managed Identity

```bash
# Create managed identity for Geode
az identity create \
  --name geode-identity \
  --resource-group geode-rg

# Grant key permissions
az keyvault set-policy \
  --name geode-kms \
  --object-id <identity-object-id> \
  --key-permissions encrypt decrypt wrapKey unwrapKey get
```

#### 3. Configure Geode

```yaml
security:
  tde:
    kms:
      provider: azure
      azure:
        vault_url: "https://geode-kms.vault.azure.net/"
        key_name: "geode-master-key"
        tenant_id: "..."
        client_id: "..."  # Managed identity
        # Or use client secret:
        # client_secret: "${AZURE_CLIENT_SECRET}"
```

## GCP Cloud KMS Integration

### Setup Steps

#### 1. Create Keyring and Key

```bash
# Create keyring
gcloud kms keyrings create geode-keyring \
  --location us-east1

# Create key
gcloud kms keys create geode-master-key \
  --location us-east1 \
  --keyring geode-keyring \
  --purpose encryption \
  --protection-level hsm
```

#### 2. Configure IAM

```bash
# Grant Geode service account permissions
gcloud kms keys add-iam-policy-binding geode-master-key \
  --location us-east1 \
  --keyring geode-keyring \
  --member serviceAccount:geode@project-id.iam.gserviceaccount.com \
  --role roles/cloudkms.cryptoKeyEncrypterDecrypter
```

#### 3. Configure Geode

```yaml
security:
  tde:
    kms:
      provider: gcp
      gcp:
        project_id: "my-project"
        location: "us-east1"
        keyring: "geode-keyring"
        key_name: "geode-master-key"
        credentials_file: "/etc/geode/gcp-credentials.json"
```

## Key Rotation

### Automatic Rotation

Configure automatic rotation policies:

```yaml
security:
  tde:
    rotation:
      enabled: true
      schedule: "0 0 * * 0"  # Weekly on Sunday
      min_age: "90d"
      max_age: "365d"
      rewrap_on_rotate: true
```

### Manual Rotation

```bash
# Rotate master key in KMS
geode key rotate --scope master

# Rewrap all DEKs with new master key
geode key rewrap --all

# Check rotation status
geode key status
```

**Output**:
```
Master Key Status:
  Current Version: v3
  Created: 2026-01-15 10:30:00 UTC
  Rotated: 2026-01-20 14:22:00 UTC
  Next Rotation: 2026-04-20 (in 89 days)

Data Encryption Keys:
  Active DEKs: 2
  Rewrap Progress: 100% (5,234 / 5,234 keys)
  Last Rewrap: 2026-01-20 14:25:33 UTC
```

### Rotation Best Practices

1. **Schedule regular rotations**: 90 days for compliance, 365 days for balance
2. **Test in staging**: Verify rotation process before production
3. **Monitor progress**: Track rewrap completion
4. **Backup before rotation**: Create backup before major key changes
5. **Audit rotation events**: Log all rotation activities

## Performance & Optimization

### Benchmarks

| Operation | Latency | Impact |
|-----------|---------|--------|
| DEK wrap (Vault) | <50ms | On startup only |
| DEK unwrap (Vault) | <50ms | On startup only |
| DEK cache hit | <5µs | 99.9% of operations |
| Page encryption (local DEK) | <100µs | <1% overhead |
| KMS API call (AWS) | <100ms | Cached, infrequent |

### Caching Strategy

```yaml
security:
  tde:
    kms:
      cache:
        enabled: true
        ttl: 3600  # 1 hour
        max_size: 1000  # DEKs
        eviction: "lru"
```

**Cache behavior**:
- DEKs cached after unwrap
- Automatic refresh before expiry
- LRU eviction under memory pressure
- 99.9%+ hit rate in production

### Connection Pooling

```yaml
security:
  tde:
    kms:
      vault:
        connection_pool:
          max_connections: 10
          idle_timeout: 300s
          connection_timeout: 30s
```

## Security Best Practices

### Key Lifecycle

1. **Generation**: Use KMS native key generation (HSM-backed)
2. **Storage**: Never store plaintext master keys
3. **Access**: Restrict KMS permissions to Geode service account only
4. **Rotation**: Regular rotation (90-365 days)
5. **Destruction**: Secure key destruction per compliance requirements

### Network Security

```yaml
security:
  tde:
    kms:
      vault:
        tls_verify: true
        ca_cert: "/etc/geode/ca.pem"
        client_cert: "/etc/geode/client.pem"  # mTLS
        client_key: "/etc/geode/client-key.pem"
        min_tls_version: "1.3"
```

### Authentication

**Vault**:
- Use short-lived tokens (8-24 hours)
- Rotate tokens regularly
- Use Vault agents for token renewal
- Avoid hardcoding tokens

**AWS**:
- Use IAM roles (not access keys)
- Enable MFA for key operations
- Use condition keys in policies
- Audit key usage with CloudTrail

**Azure**:
- Use managed identities
- Enable Key Vault firewall
- Require VNet integration
- Monitor with Azure Monitor

### Audit & Compliance

```yaml
security:
  tde:
    audit:
      enabled: true
      log_key_operations: true
      log_rotation_events: true
      log_rewrap_operations: true
      output: "/var/log/geode/kms-audit.log"
      format: "json"
```

**Audit log example**:
```json
{
  "timestamp": "2026-01-24T10:30:00Z",
  "operation": "unwrap_dek",
  "kms_provider": "vault",
  "key_id": "master-key-v3",
  "dek_id": "dek-12345",
  "user": "geode-service",
  "result": "success",
  "latency_ms": 45
}
```

## Disaster Recovery

### Backup Strategy

```bash
# Backup KMS configuration
geode backup kms-config --output /backup/kms-config.json

# Backup encrypted DEKs (wrapped)
geode backup deks --output /backup/deks-encrypted.json

# Backup rotation state
geode backup rotation-state --output /backup/rotation.json
```

### Recovery Process

```bash
# 1. Restore KMS configuration
geode restore kms-config --input /backup/kms-config.json

# 2. Verify KMS connectivity
geode verify kms --provider vault

# 3. Restore DEKs
geode restore deks --input /backup/deks-encrypted.json

# 4. Restore rotation state
geode restore rotation-state --input /backup/rotation.json

# 5. Verify data access
geode query "RETURN 1" --verify-encryption
```

### Multi-Region Failover

```yaml
security:
  tde:
    kms:
      failover:
        enabled: true
        primary: "vault-us-east.company.com"
        replicas:
          - "vault-us-west.company.com"
          - "vault-eu-west.company.com"
        health_check_interval: 30s
        failover_timeout: 10s
```

## Troubleshooting

### Issue: KMS Connection Failures

**Error**:
```
Error: Failed to connect to KMS provider: connection timeout
```

**Diagnosis**:
```bash
# Test network connectivity
curl -v https://vault.company.com:8200/v1/sys/health

# Verify credentials
vault token lookup

# Check Geode logs
tail -f /var/log/geode/kms.log
```

**Solutions**:
1. Verify network access (firewall, VPN)
2. Check KMS service health
3. Validate credentials/tokens
4. Review timeout settings

### Issue: DEK Unwrap Failures

**Error**:
```
Error: Failed to unwrap data encryption key: invalid ciphertext
```

**Causes**:
- Corrupted wrapped DEK
- Wrong master key version
- KMS key deleted

**Solutions**:
```bash
# Check key status
geode key status --verbose

# Verify KMS key exists
vault read geode/keys/master-key

# Attempt rewrap
geode key rewrap --force --dek-id <id>
```

### Issue: High KMS Latency

**Symptom**: Slow database startup or high operation latency

**Diagnosis**:
```bash
# Profile KMS operations
geode profile kms --duration 60s

# Check cache hit rate
geode stats kms-cache
```

**Solutions**:
1. Increase DEK cache TTL
2. Use connection pooling
3. Deploy regional KMS replicas
4. Enable local cache warmup

## Compliance & Standards

### Regulatory Requirements

| Regulation | Requirement | Geode Support |
|------------|-------------|---------------|
| **PCI-DSS** | Key rotation every 365 days | ✅ Automated rotation |
| **HIPAA** | Encryption key management | ✅ KMS integration |
| **SOX** | Access control & audit | ✅ Complete audit trail |
| **GDPR** | Data protection at rest | ✅ TDE with KMS |
| **FIPS 140-2** | HSM-backed keys | ✅ Vault/AWS KMS HSM |

### Audit Requirements

```yaml
security:
  tde:
    audit:
      # PCI-DSS requirements
      log_all_key_access: true
      log_failed_operations: true
      log_rotation_events: true

      # SOX requirements
      tamper_proof_logs: true
      log_retention_days: 2555  # 7 years

      # HIPAA requirements
      encryption_algorithm_logging: true
      key_lifecycle_logging: true
```

## Next Steps

- [Field-Level Encryption](/docs/security/field-level-encryption/) - Selective field encryption
- [Security Overview](/docs/security/overview/) - Complete security architecture
- [Transparent Data Encryption](/docs/security/tde/) - TDE implementation details
- [Backup Automation](/docs/guides/backup-automation/) - Backup integration with KMS
- [Server Configuration](/docs/configuration/server-configuration/) - KMS configuration options

## References

- [HashiCorp Vault Transit](https://developer.hashicorp.com/vault/docs/secrets/transit) - Vault encryption engine
- [AWS KMS Documentation](https://docs.aws.amazon.com/kms/) - AWS key management
- [Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/) - Azure KMS
- [GCP Cloud KMS](https://cloud.google.com/kms/docs) - Google Cloud KMS
- [NIST SP 800-57](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final) - Key management

---

**License**: Apache License 2.0
**Copyright**: 2024-2025 CodePros
**Last Updated**: January 2026
