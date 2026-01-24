---
title: "Cloud Deployment"
description: "Deploy Geode on cloud platforms including AWS, Google Cloud, and Azure. Learn about cloud-native architectures, managed services, auto-scaling, and cloud optimization strategies."
keywords:
  - cloud
  - cloud deployment
  - cloud-native
  - AWS
  - Google Cloud
  - Azure
  - managed services
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/cloud/"
    noindex: false
---

# Cloud Deployment for Geode

Cloud platforms provide scalable, managed infrastructure for deploying Geode graph database systems. This guide covers cloud-native deployment patterns, platform-specific configurations, and best practices for running Geode on AWS, Google Cloud Platform (GCP), and Microsoft Azure.

## Introduction to Cloud Deployments

Cloud deployment offers several advantages for database systems:

**Elasticity**: Scale compute and storage resources dynamically based on demand

**Managed Services**: Leverage cloud-provider managed services for storage, networking, and monitoring

**Global Distribution**: Deploy across multiple regions for low-latency access worldwide

**High Availability**: Built-in redundancy and fault tolerance mechanisms

**Cost Optimization**: Pay only for resources used, with options for reserved capacity

**Automated Operations**: Leverage cloud-native tools for backups, patching, and monitoring

For Geode, cloud deployments typically use either virtual machines (IaaS), container orchestration (Kubernetes), or a hybrid approach combining both.

## Cloud Architecture Patterns

### 1. Single-Region Deployment

Deploy Geode in a single cloud region for applications with localized user bases:

```
┌─────────────────────────────────────┐
│         Cloud Region (us-east-1)     │
│                                      │
│  ┌──────────────────────────────┐   │
│  │     Load Balancer             │   │
│  │  (Cloud LB / K8s Ingress)     │   │
│  └──────────┬───────────────────┘   │
│             │                        │
│  ┌──────────┴───────────────────┐   │
│  │   Geode Cluster (3 nodes)     │   │
│  │  - Availability Zone A         │   │
│  │  - Availability Zone B         │   │
│  │  - Availability Zone C         │   │
│  └──────────┬───────────────────┘   │
│             │                        │
│  ┌──────────┴───────────────────┐   │
│  │   Persistent Storage          │   │
│  │  (EBS / Persistent Disk)      │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Benefits**:
- Lower latency (single region)
- Simpler networking
- Lower data transfer costs
- Easier management

**Use cases**: Regional applications, development/staging environments

### 2. Multi-Region Active-Passive

Primary region handles writes, secondary regions provide read replicas:

```
┌──────────────────┐          ┌──────────────────┐
│  Primary Region  │          │  Secondary Region │
│   (us-east-1)    │          │   (eu-west-1)     │
│                  │          │                   │
│  Geode Primary   │──────────>  Geode Replica    │
│  (Read/Write)    │ Async    │  (Read-only)      │
│                  │ Replica  │                   │
└──────────────────┘          └──────────────────┘
```

**Benefits**:
- Disaster recovery capability
- Read scaling across regions
- Geographic distribution

**Use cases**: Global applications with primary user base in one region

### 3. Multi-Region Active-Active

Multiple regions serve both reads and writes with conflict resolution:

```
┌──────────────────┐          ┌──────────────────┐
│    Region A      │          │    Region B       │
│  (us-east-1)     │<────────>│  (eu-west-1)      │
│                  │  Bi-dir  │                   │
│  Geode Cluster   │   Sync   │  Geode Cluster    │
│  (Read/Write)    │          │  (Read/Write)     │
└──────────────────┘          └──────────────────┘
         │                             │
         └─────────────┬───────────────┘
                       │
            ┌──────────┴──────────┐
            │    Region C          │
            │  (ap-south-1)        │
            │  Geode Cluster       │
            │  (Read/Write)        │
            └─────────────────────┘
```

**Benefits**:
- Global low latency
- High availability
- Regional failure tolerance

**Use cases**: Mission-critical global applications

## Cloud Platform Deployment Guides

### Amazon Web Services (AWS)

**EC2-Based Deployment**:

```bash
# Launch EC2 instances for Geode cluster
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --count 3 \
  --instance-type r6g.2xlarge \
  --key-name geode-key \
  --security-group-ids sg-0123456789abcdef0 \
  --subnet-id subnet-0bb1c79de3EXAMPLE \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=geode-node}]' \
  --block-device-mappings '[
    {
      "DeviceName": "/dev/sda1",
      "Ebs": {
        "VolumeSize": 100,
        "VolumeType": "gp3",
        "Iops": 3000,
        "Throughput": 125
      }
    }
  ]'
```

**EBS Volume Configuration**:

```bash
# Create EBS volume for data
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 1000 \
  --volume-type io2 \
  --iops 64000 \
  --multi-attach-enabled \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=geode-data}]'

# Attach to EC2 instance
aws ec2 attach-volume \
  --volume-id vol-0123456789abcdef0 \
  --instance-id i-0123456789abcdef0 \
  --device /dev/sdf
```

**Application Load Balancer** (for client connections):

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name geode-alb \
  --subnets subnet-0bb1c79de3EXAMPLE subnet-0bb1c79de3EXAMPLE2 \
  --security-groups sg-0123456789abcdef0 \
  --type network \
  --ip-address-type ipv4

# Create target group
aws elbv2 create-target-group \
  --name geode-targets \
  --protocol TCP \
  --port 3141 \
  --vpc-id vpc-0123456789abcdef0 \
  --health-check-protocol TCP \
  --health-check-port 3141

# Register targets
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=i-0123456789abcdef0 Id=i-0123456789abcdef1 Id=i-0123456789abcdef2
```

**EKS Deployment**:

```yaml
# eksctl configuration
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: geode-cluster
  region: us-east-1
  version: "1.28"

nodeGroups:
  - name: geode-nodes
    instanceType: r6g.2xlarge
    desiredCapacity: 3
    minSize: 3
    maxSize: 6
    volumeSize: 100
    volumeType: gp3
    volumeIOPS: 3000
    volumeThroughput: 125
    labels:
      role: geode
    tags:
      Name: geode-node
      Environment: production
```

Deploy with:
```bash
eksctl create cluster -f cluster-config.yaml

# Deploy Geode using Helm
helm repo add geode https://charts.geodedb.com
helm install geode geode/geode \
  --set replicaCount=3 \
  --set resources.requests.memory=24Gi \
  --set storage.size=1Ti \
  --set storage.storageClass=gp3
```

See **[AWS](/tags/aws/)** for detailed AWS-specific configurations.

### Google Cloud Platform (GCP)

**Compute Engine Deployment**:

```bash
# Create instance template
gcloud compute instance-templates create geode-template \
  --machine-type=n2-highmem-8 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=100GB \
  --boot-disk-type=pd-ssd \
  --tags=geode-server \
  --metadata-from-file=startup-script=install-geode.sh

# Create managed instance group
gcloud compute instance-groups managed create geode-cluster \
  --base-instance-name=geode-node \
  --template=geode-template \
  --size=3 \
  --zone=us-central1-a
```

**Persistent Disk Configuration**:

```bash
# Create persistent disk
gcloud compute disks create geode-data-disk \
  --size=1000GB \
  --type=pd-ssd \
  --zone=us-central1-a

# Attach to instance
gcloud compute instances attach-disk geode-node-1 \
  --disk=geode-data-disk \
  --device-name=geode-data
```

**Cloud Load Balancing**:

```bash
# Create health check
gcloud compute health-checks create tcp geode-health-check \
  --port=3141 \
  --check-interval=10s \
  --timeout=5s

# Create backend service
gcloud compute backend-services create geode-backend \
  --protocol=TCP \
  --health-checks=geode-health-check \
  --global

# Add backends
gcloud compute backend-services add-backend geode-backend \
  --instance-group=geode-cluster \
  --instance-group-zone=us-central1-a \
  --global
```

**GKE Deployment**:

```bash
# Create GKE cluster
gcloud container clusters create geode-cluster \
  --machine-type=n2-highmem-8 \
  --num-nodes=3 \
  --zone=us-central1-a \
  --disk-type=pd-ssd \
  --disk-size=100 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10

# Create storage class
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: geode-storage
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
EOF

# Deploy Geode
kubectl apply -f geode-statefulset.yaml
```

See **[GCP](/tags/gcp/)** for detailed Google Cloud configurations.

### Microsoft Azure

**Virtual Machine Deployment**:

```bash
# Create resource group
az group create --name geode-rg --location eastus

# Create virtual network
az network vnet create \
  --resource-group geode-rg \
  --name geode-vnet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name geode-subnet \
  --subnet-prefix 10.0.1.0/24

# Create VMs
for i in 1 2 3; do
  az vm create \
    --resource-group geode-rg \
    --name geode-node-$i \
    --image Ubuntu2204 \
    --size Standard_E8s_v5 \
    --vnet-name geode-vnet \
    --subnet geode-subnet \
    --data-disk-sizes-gb 1000 \
    --storage-sku Premium_LRS \
    --admin-username geodeadmin \
    --generate-ssh-keys
done
```

**Azure Load Balancer**:

```bash
# Create load balancer
az network lb create \
  --resource-group geode-rg \
  --name geode-lb \
  --sku Standard \
  --frontend-ip-name geode-frontend \
  --backend-pool-name geode-backend

# Create health probe
az network lb probe create \
  --resource-group geode-rg \
  --lb-name geode-lb \
  --name geode-health \
  --protocol tcp \
  --port 3141

# Create load balancing rule
az network lb rule create \
  --resource-group geode-rg \
  --lb-name geode-lb \
  --name geode-rule \
  --protocol tcp \
  --frontend-port 3141 \
  --backend-port 3141 \
  --frontend-ip-name geode-frontend \
  --backend-pool-name geode-backend \
  --probe-name geode-health
```

**AKS Deployment**:

```bash
# Create AKS cluster
az aks create \
  --resource-group geode-rg \
  --name geode-aks \
  --node-count 3 \
  --node-vm-size Standard_E8s_v5 \
  --node-osdisk-size 100 \
  --enable-managed-identity \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group geode-rg --name geode-aks

# Deploy Geode
kubectl apply -f geode-azure-deployment.yaml
```

See **[Azure](/tags/azure/)** for detailed Azure configurations.

## Cloud-Native Features

### Auto-Scaling

**Horizontal Pod Autoscaling** (Kubernetes):

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: geode-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: geode
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: geode_queries_per_second
      target:
        type: AverageValue
        averageValue: "500"
```

**Vertical Pod Autoscaling**:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: geode-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: geode
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: geode
      minAllowed:
        cpu: 2
        memory: 16Gi
      maxAllowed:
        cpu: 16
        memory: 64Gi
```

### Managed Storage

**AWS EBS CSI Driver**:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: geode-ebs
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "16000"
  throughput: "1000"
  encrypted: "true"
  kmsKeyId: arn:aws:kms:us-east-1:123456789012:key/...
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

**GCP Persistent Disk**:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: geode-pd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd
  disk-encryption-kms-key: projects/PROJECT/locations/LOCATION/keyRings/KEYRING/cryptoKeys/KEY
allowVolumeExpansion: true
```

**Azure Managed Disks**:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: geode-disk
provisioner: disk.csi.azure.com
parameters:
  storageaccounttype: Premium_LRS
  kind: Managed
  diskEncryptionSetID: /subscriptions/.../diskEncryptionSets/...
allowVolumeExpansion: true
```

### Cloud Monitoring Integration

**AWS CloudWatch**:

```python
import boto3
from geode_client import GeodeClient

cloudwatch = boto3.client('cloudwatch')

async def publish_geode_metrics():
    async with GeodeClient('geode.aws.internal', 3141) as client:
        # Get metrics from Geode
        result = await client.execute("""
            MATCH (n) RETURN count(n) AS node_count
        """)

        # Publish to CloudWatch
        cloudwatch.put_metric_data(
            Namespace='Geode',
            MetricData=[
                {
                    'MetricName': 'NodeCount',
                    'Value': result.bindings[0]['node_count'],
                    'Unit': 'Count'
                }
            ]
        )
```

**GCP Cloud Monitoring**:

```python
from google.cloud import monitoring_v3

client = monitoring_v3.MetricServiceClient()
project_name = f"projects/{project_id}"

# Create custom metric for Geode
series = monitoring_v3.TimeSeries()
series.metric.type = "custom.googleapis.com/geode/queries_per_second"
series.resource.type = "gce_instance"

point = series.points.add()
point.value.double_value = qps
point.interval.end_time.seconds = int(time.time())

client.create_time_series(name=project_name, time_series=[series])
```

**Azure Monitor**:

```python
from azure.monitor.ingestion import LogsIngestionClient

client = LogsIngestionClient(endpoint, credential)

# Send Geode metrics to Azure Monitor
client.upload(
    rule_id=rule_id,
    stream_name=stream_name,
    logs=[
        {
            "timestamp": datetime.now().isoformat(),
            "metric": "query_latency_ms",
            "value": 25.4,
            "instance": "geode-node-1"
        }
    ]
)
```

## Cloud Cost Optimization

### Right-Sizing Instances

**Geode resource requirements by workload**:

```python
# Calculate required resources
def calculate_instance_size(workload):
    """
    Determine optimal cloud instance type based on workload.
    """
    if workload['nodes'] < 100_000 and workload['qps'] < 100:
        # Small workload
        return {
            'aws': 'r6g.large',      # 2 vCPU, 16 GiB RAM
            'gcp': 'n2-highmem-2',   # 2 vCPU, 16 GB RAM
            'azure': 'Standard_E2s_v5'  # 2 vCPU, 16 GiB RAM
        }
    elif workload['nodes'] < 1_000_000 and workload['qps'] < 500:
        # Medium workload
        return {
            'aws': 'r6g.2xlarge',    # 8 vCPU, 64 GiB RAM
            'gcp': 'n2-highmem-8',   # 8 vCPU, 64 GB RAM
            'azure': 'Standard_E8s_v5'  # 8 vCPU, 64 GiB RAM
        }
    else:
        # Large workload
        return {
            'aws': 'r6g.8xlarge',    # 32 vCPU, 256 GiB RAM
            'gcp': 'n2-highmem-32',  # 32 vCPU, 256 GB RAM
            'azure': 'Standard_E32s_v5'  # 32 vCPU, 256 GiB RAM
        }
```

### Reserved Capacity

**AWS Reserved Instances**:
```bash
# Purchase 1-year reserved instance
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id <offering-id> \
  --instance-count 3
```

**GCP Committed Use Discounts**:
```bash
gcloud compute commitments create geode-commitment \
  --plan=12-month \
  --resources=vcpu=24,memory=192GB \
  --region=us-central1
```

**Azure Reserved VM Instances**:
```bash
az reservations reservation-order purchase \
  --reservation-order-id <order-id> \
  --sku Standard_E8s_v5 \
  --location eastus \
  --quantity 3 \
  --term P1Y
```

### Storage Tiering

Move infrequently accessed data to cheaper storage:

```bash
# AWS S3 lifecycle policy for Geode backups
aws s3api put-bucket-lifecycle-configuration \
  --bucket geode-backups \
  --lifecycle-configuration '{
    "Rules": [
      {
        "Id": "Archive old backups",
        "Status": "Enabled",
        "Transitions": [
          {
            "Days": 30,
            "StorageClass": "STANDARD_IA"
          },
          {
            "Days": 90,
            "StorageClass": "GLACIER"
          }
        ]
      }
    ]
  }'
```

## Cloud Security Best Practices

### Network Security

**VPC Configuration**:

```hcl
# Terraform configuration for AWS VPC
resource "aws_vpc" "geode" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "geode-vpc"
  }
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.geode.id
  cidr_block        = "10.0.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "geode-private-${count.index}"
  }
}

# Security group
resource "aws_security_group" "geode" {
  name        = "geode-sg"
  description = "Security group for Geode"
  vpc_id      = aws_vpc.geode.id

  ingress {
    from_port   = 3141
    to_port     = 3141
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]  # Internal only
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### Encryption

**Encryption at rest** (all cloud providers support):
- Encrypted EBS volumes (AWS)
- Encrypted persistent disks (GCP)
- Encrypted managed disks (Azure)

**Encryption in transit**:
- Geode uses TLS 1.3 with QUIC protocol
- All client-server communication encrypted

### IAM and Access Control

**AWS IAM Role for Geode**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeVolumes",
        "s3:PutObject",
        "s3:GetObject",
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

## Related Topics

- **[AWS](/tags/aws/)**: Amazon Web Services deployment guide
- **[GCP](/tags/gcp/)**: Google Cloud Platform deployment guide
- **[Azure](/tags/azure/)**: Microsoft Azure deployment guide
- **[Containers](/tags/containers/)**: Container deployment patterns
- **[Orchestration](/tags/orchestration/)**: Kubernetes orchestration
- **[Infrastructure](/tags/infrastructure/)**: Infrastructure as Code
- **[Deployment](/tags/deployment/)**: General deployment strategies

## Further Reading

- **Cloud Deployment Guide**: `/docs/deployment/cloud/`
- **Multi-Cloud Strategy**: `/docs/deployment/multi-cloud/`
- **Cloud Cost Optimization**: `/docs/operations/cloud-cost-optimization/`
- **Cloud Security**: `/docs/security/cloud-security/`
- **Disaster Recovery**: `/docs/operations/disaster-recovery/`
