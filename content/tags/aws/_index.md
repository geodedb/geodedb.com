---
title: "Amazon Web Services (AWS)"
description: "Deploy Geode on AWS using EC2, EKS, ECS, and other AWS services. Learn about AWS-specific optimizations, managed services integration, and production deployment patterns."
keywords:
  - AWS
  - Amazon Web Services
  - EC2
  - EKS
  - ECS
  - cloud deployment
  - AWS optimization
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/aws/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Geode on Amazon Web Services (AWS)

Amazon Web Services provides a comprehensive cloud platform for deploying Geode graph database. This guide covers AWS-specific deployment patterns, service integrations, and optimization strategies for running production Geode workloads on AWS infrastructure.

## AWS Deployment Options

### 1. EC2 (Elastic Compute Cloud)

Direct deployment on EC2 instances provides maximum control and performance:

**Instance Type Selection**:

For Geode, memory-optimized instances provide the best price/performance:

```bash
# R6g instances (ARM-based Graviton2, best price/performance)
r6g.large      # 2 vCPU, 16 GiB RAM   - Dev/test
r6g.xlarge     # 4 vCPU, 32 GiB RAM   - Small production
r6g.2xlarge    # 8 vCPU, 64 GiB RAM   - Medium production
r6g.4xlarge    # 16 vCPU, 128 GiB RAM - Large production
r6g.8xlarge    # 32 vCPU, 256 GiB RAM - Enterprise

# R6i instances (Intel-based, for x86-64 compatibility)
r6i.2xlarge    # 8 vCPU, 64 GiB RAM
r6i.4xlarge    # 16 vCPU, 128 GiB RAM
r6i.8xlarge    # 32 vCPU, 256 GiB RAM
```

**Launch EC2 Instance with AWS CLI**:

```bash
# Create key pair
aws ec2 create-key-pair \
  --key-name geode-key \
  --query 'KeyMaterial' \
  --output text > geode-key.pem
chmod 400 geode-key.pem

# Create security group
aws ec2 create-security-group \
  --group-name geode-sg \
  --description "Security group for Geode database" \
  --vpc-id vpc-0123456789abcdef0

# Allow Geode client port (3141)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 3141 \
  --cidr 10.0.0.0/8

# Allow Prometheus metrics (9090) - internal only
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 9090 \
  --source-group sg-0123456789abcdef0

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --count 1 \
  --instance-type r6g.2xlarge \
  --key-name geode-key \
  --security-group-ids sg-0123456789abcdef0 \
  --subnet-id subnet-0bb1c79de3EXAMPLE \
  --block-device-mappings '[
    {
      "DeviceName": "/dev/sda1",
      "Ebs": {
        "VolumeSize": 100,
        "VolumeType": "gp3",
        "Iops": 3000,
        "Throughput": 125,
        "DeleteOnTermination": false,
        "Encrypted": true
      }
    }
  ]' \
  --tag-specifications 'ResourceType=instance,Tags=[
    {Key=Name,Value=geode-production},
    {Key=Environment,Value=production},
    {Key=Application,Value=geode}
  ]' \
  --user-data file://install-geode.sh
```

**User Data Script** (`install-geode.sh`):

```bash
#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install dependencies (assumes Zig 0.1.0+ available)
apt-get install -y git make jq

# Build Geode from source
GEODE_VERSION="__GEODE_TAG__"
git clone https://github.com/codeprosorg/geode
cd geode
git checkout ${GEODE_VERSION}
make build
cp ./zig-out/bin/geode /usr/local/bin/geode
chmod +x /usr/local/bin/geode

# Create geode user
useradd -r -s /bin/false geode

# Create data directory
mkdir -p /var/lib/geode
chown geode:geode /var/lib/geode

# Create systemd service
cat > /etc/systemd/system/geode.service <<'EOF'
[Unit]
Description=Geode Graph Database
After=network.target

[Service]
Type=simple
User=geode
Group=geode
ExecStart=/usr/local/bin/geode serve --listen 0.0.0.0:3141 --data /var/lib/geode
Restart=on-failure
RestartSec=10s
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Start Geode
systemctl daemon-reload
systemctl enable geode
systemctl start geode

echo "Geode installation complete"
```

### 2. EBS (Elastic Block Store) Configuration

Geode requires fast, persistent storage. EBS provides several volume types:

**Volume Type Comparison**:

| Type | Use Case | IOPS | Throughput | Price |
|------|----------|------|------------|-------|
| gp3  | General | 16,000 | 1,000 MB/s | $ |
| io2  | High perf | 64,000 | 1,000 MB/s | $$$ |
| io2 Block Express | Enterprise | 256,000 | 4,000 MB/s | $$$$ |

**Recommended Configuration**:

```bash
# Create gp3 volume for production
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 1000 \
  --volume-type gp3 \
  --iops 16000 \
  --throughput 1000 \
  --encrypted \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/... \
  --tag-specifications 'ResourceType=volume,Tags=[
    {Key=Name,Value=geode-data},
    {Key=Application,Value=geode}
  ]'

# Attach to instance
aws ec2 attach-volume \
  --volume-id vol-0123456789abcdef0 \
  --instance-id i-0123456789abcdef0 \
  --device /dev/sdf

# Format and mount (SSH into instance)
mkfs.ext4 /dev/nvme1n1
mkdir -p /var/lib/geode
mount /dev/nvme1n1 /var/lib/geode
echo '/dev/nvme1n1 /var/lib/geode ext4 defaults,nofail 0 2' >> /etc/fstab
```

**EBS Optimization**:

```bash
# Enable EBS optimization on instance
aws ec2 modify-instance-attribute \
  --instance-id i-0123456789abcdef0 \
  --ebs-optimized

# Create snapshot for backup
aws ec2 create-snapshot \
  --volume-id vol-0123456789abcdef0 \
  --description "Geode data backup $(date +%Y-%m-%d)" \
  --tag-specifications 'ResourceType=snapshot,Tags=[
    {Key=Name,Value=geode-backup},
    {Key=Date,Value='$(date +%Y-%m-%d)'}
  ]'
```

### 3. Elastic Load Balancer (ELB)

Distribute traffic across multiple Geode instances:

**Network Load Balancer** (recommended for Geode):

```bash
# Create NLB
aws elbv2 create-load-balancer \
  --name geode-nlb \
  --type network \
  --scheme internal \
  --subnets subnet-0bb1c79de3EXAMPLE subnet-0bb1c79de3EXAMPLE2 \
  --tags Key=Name,Value=geode-nlb

# Create target group
aws elbv2 create-target-group \
  --name geode-targets \
  --protocol TCP \
  --port 3141 \
  --vpc-id vpc-0123456789abcdef0 \
  --health-check-protocol TCP \
  --health-check-port 3141 \
  --health-check-interval-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 2 \
  --tags Key=Name,Value=geode-targets

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:... \
  --protocol TCP \
  --port 3141 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...

# Register instances
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=i-0123456789abcdef0 Id=i-0123456789abcdef1 Id=i-0123456789abcdef2
```

### 4. EKS (Elastic Kubernetes Service)

Deploy Geode on managed Kubernetes:

**Create EKS Cluster with eksctl**:

```yaml
# cluster-config.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: geode-cluster
  region: us-east-1
  version: "1.28"

iam:
  withOIDC: true

managedNodeGroups:
  - name: geode-nodes
    instanceType: r6g.2xlarge
    desiredCapacity: 3
    minSize: 3
    maxSize: 10
    volumeSize: 100
    volumeType: gp3
    volumeIOPS: 3000
    volumeThroughput: 125
    privateNetworking: true
    labels:
      role: geode
      workload: database
    tags:
      Name: geode-node
      Environment: production
    iam:
      attachPolicyARNs:
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
        - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
      withAddonPolicies:
        ebs: true
        cloudWatch: true

addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
  - name: aws-ebs-csi-driver
```

**Create cluster**:

```bash
eksctl create cluster -f cluster-config.yaml

# Install EBS CSI driver
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.25"

# Create storage class
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: geode-ebs-gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "16000"
  throughput: "1000"
  encrypted: "true"
  kmsKeyId: arn:aws:kms:us-east-1:123456789012:key/...
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
EOF
```

**Deploy Geode StatefulSet**:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: geode
  namespace: geode
spec:
  serviceName: geode
  replicas: 3
  selector:
    matchLabels:
      app: geode
  template:
    metadata:
      labels:
        app: geode
    spec:
      nodeSelector:
        role: geode
      containers:
      - name: geode
        image: public.ecr.aws/geodedb/geode:__GEODE_VERSION__
        ports:
        - containerPort: 3141
          name: client
        - containerPort: 9090
          name: metrics
        volumeMounts:
        - name: data
          mountPath: /var/lib/geode
        resources:
          requests:
            memory: "48Gi"
            cpu: "6"
          limits:
            memory: "56Gi"
            cpu: "8"
        env:
        - name: GEODE_LOG_LEVEL
          value: "info"
        - name: AWS_REGION
          value: "us-east-1"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: geode-ebs-gp3
      resources:
        requests:
          storage: 1Ti
```

### 5. ECS (Elastic Container Service)

Run Geode on AWS Fargate or EC2-backed ECS:

**ECS Task Definition**:

```json
{
  "family": "geode",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "8192",
  "memory": "61440",
  "containerDefinitions": [
    {
      "name": "geode",
      "image": "public.ecr.aws/geodedb/geode:__GEODE_VERSION__",
      "portMappings": [
        {
          "containerPort": 3141,
          "protocol": "tcp"
        },
        {
          "containerPort": 9090,
          "protocol": "tcp"
        }
      ],
      "mountPoints": [
        {
          "sourceVolume": "geode-data",
          "containerPath": "/var/lib/geode"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/geode",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "geode"
        }
      }
    }
  ],
  "volumes": [
    {
      "name": "geode-data",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-0123456789abcdef0",
        "transitEncryption": "ENABLED"
      }
    }
  ]
}
```

**Create ECS Service**:

```bash
aws ecs create-service \
  --cluster geode-cluster \
  --service-name geode-service \
  --task-definition geode:1 \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-0bb1c79de3EXAMPLE,subnet-0bb1c79de3EXAMPLE2],
    securityGroups=[sg-0123456789abcdef0],
    assignPublicIp=DISABLED
  }" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=geode,containerPort=3141"
```

## AWS Service Integration

### S3 for Backups

Automated backups to S3:

```bash
#!/bin/bash
# backup-to-s3.sh

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="/tmp/geode-backup-${TIMESTAMP}.tar.gz"
S3_BUCKET="s3://geode-backups"

# Create backup
/usr/local/bin/geode backup --output "$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_FILE" "${S3_BUCKET}/$(date +%Y/%m/%d)/"

# Clean up local backup
rm "$BACKUP_FILE"

# Lifecycle policy will archive old backups to Glacier
```

**S3 Lifecycle Policy**:

```json
{
  "Rules": [
    {
      "Id": "Archive old Geode backups",
      "Status": "Enabled",
      "Prefix": "",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 2555
      }
    }
  ]
}
```

### CloudWatch Monitoring

**CloudWatch Metrics from Geode**:

```python
import boto3
from geode_client import Client

cloudwatch = boto3.client('cloudwatch', region_name='us-east-1')

async def publish_metrics():
    client = Client(host="geode.internal", port=3141)
    async with client.connection() as conn:
        # Query Geode metrics
        result, _ = await conn.query("""
            MATCH (n) RETURN count(n) AS total_nodes
        """)

        node_count = result.bindings[0]['total_nodes']

        # Publish to CloudWatch
        cloudwatch.put_metric_data(
            Namespace='Geode/Production',
            MetricData=[
                {
                    'MetricName': 'TotalNodes',
                    'Value': node_count,
                    'Unit': 'Count',
                    'Timestamp': datetime.utcnow(),
                    'Dimensions': [
                        {'Name': 'Environment', 'Value': 'production'},
                        {'Name': 'Cluster', 'Value': 'main'}
                    ]
                },
                {
                    'MetricName': 'QueryLatency',
                    'Value': result.execution_time_ms,
                    'Unit': 'Milliseconds',
                    'Timestamp': datetime.utcnow(),
                    'Dimensions': [
                        {'Name': 'QueryType', 'Value': 'COUNT'}
                    ]
                }
            ]
        )
```

**CloudWatch Alarms**:

```bash
# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name geode-high-error-rate \
  --alarm-description "Geode error rate > 1%" \
  --metric-name ErrorRate \
  --namespace Geode/Production \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 0.01 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:geode-alerts

# High latency alarm
aws cloudwatch put-metric-alarm \
  --alarm-name geode-high-latency \
  --alarm-description "Geode P99 latency > 500ms" \
  --metric-name QueryLatencyP99 \
  --namespace Geode/Production \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 500 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:geode-alerts
```

### AWS Secrets Manager

Store Geode credentials securely:

```bash
# Create secret
aws secretsmanager create-secret \
  --name geode/production/credentials \
  --description "Geode production credentials" \
  --secret-string '{
    "username":"admin",
    "password":"secure-password-here",
    "tls_cert":"<paste-pem-certificate-here>",
    "tls_key":"<paste-pem-private-key-here>"
  }'

# Retrieve in application
aws secretsmanager get-secret-value \
  --secret-id geode/production/credentials \
  --query SecretString \
  --output text | jq -r .password
```

**Use in Python**:

```python
import boto3
import json
from geode_client import AuthClient, Client

def get_geode_credentials():
    client = boto3.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId='geode/production/credentials')
    return json.loads(response['SecretString'])

async def connect_to_geode():
    creds = get_geode_credentials()
    client = Client(host="geode.internal", port=3141)
    async with client.connection() as conn:
        auth = AuthClient(conn)
        await auth.login(creds['username'], creds['password'])
        result, _ = await conn.query("MATCH (n) RETURN count(n) AS total")
        return result.rows[0]["total"] if result.rows else 0
```

### Route 53 DNS

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name geodedb.internal \
  --vpc VPCRegion=us-east-1,VPCId=vpc-0123456789abcdef0 \
  --caller-reference $(date +%s)

# Create A record for NLB
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "geode.geodedb.internal",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z215JYRZR1TBD5",
          "DNSName": "geode-nlb-1234567890.elb.us-east-1.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

## Cost Optimization

### Reserved Instances

Save up to 72% with 3-year reservations:

```bash
# View available offerings
aws ec2 describe-reserved-instances-offerings \
  --instance-type r6g.2xlarge \
  --offering-class standard \
  --product-description Linux/UNIX

# Purchase 1-year RI
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id <offering-id> \
  --instance-count 3
```

### Savings Plans

More flexible than RIs:

```bash
# Commit to $100/hour compute usage
aws savingsplans create-savings-plan \
  --savings-plan-offering-id <offering-id> \
  --commitment 100 \
  --upfront-payment-amount 0
```

### Spot Instances

Use for non-critical workloads (up to 90% discount):

```bash
# Launch spot instance
aws ec2 run-instances \
  --instance-type r6g.2xlarge \
  --instance-market-options '{"MarketType":"spot","SpotOptions":{"MaxPrice":"0.10"}}' \
  --image-id ami-0c55b159cbfafe1f0
```

## Related Topics

- **[Cloud](/tags/cloud/)**: General cloud deployment
- **[GCP](/tags/gcp/)**: Google Cloud Platform
- **[Azure](/tags/azure/)**: Microsoft Azure
- **[Containers](/tags/containers/)**: Container technologies
- **[Orchestration](/tags/orchestration/)**: Kubernetes orchestration
- **[Deployment](/tags/deployment/)**: Deployment strategies

## Further Reading

- **AWS Deployment Guide**: `/docs/deployment/aws/`
- **EKS Best Practices**: `/docs/deployment/eks-best-practices/`
- **AWS Cost Optimization**: `/docs/operations/aws-cost-optimization/`
- **CloudWatch Integration**: `/docs/monitoring/cloudwatch/`
- **AWS Security**: `/docs/security/aws-security/`
