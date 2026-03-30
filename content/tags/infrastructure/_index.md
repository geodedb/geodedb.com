---
title: "Infrastructure Management"
description: "Comprehensive guide to managing Geode infrastructure with Infrastructure as Code (IaC). Master Terraform, CloudFormation, Pulumi, and Ansible for automated provisioning, configuration management, monitoring, and production-ready deployments across AWS, Azure, GCP, and on-premises environments."
keywords:
  - infrastructure
  - Infrastructure as Code
  - IaC
  - Terraform
  - CloudFormation
  - Pulumi
  - automation
  - DevOps
  - infrastructure automation
  - cloud infrastructure
  - provisioning
  - configuration management
  - Ansible
  - infrastructure monitoring
  - disaster recovery
  - high availability
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/infrastructure/"
    noindex: false
    og_type: "article"
    og_image: "https://geodedb.com/images/infrastructure-management.png"
    article:
      published_time: "2025-01-24T10:00:00Z"
      modified_time: "2025-01-24T10:00:00Z"
      section: "Operations"
      tags: ["infrastructure", "IaC", "Terraform", "CloudFormation", "automation", "DevOps"]
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Infrastructure Management for Geode

Infrastructure as Code (IaC) has transformed how organizations deploy and manage database infrastructure, replacing error-prone manual processes with version-controlled, repeatable, and automated provisioning. This comprehensive guide explores Infrastructure as Code practices for Geode graph database deployments, covering Terraform, CloudFormation, Pulumi, Ansible, and production-ready patterns across cloud and on-premises environments.

## Why Infrastructure as Code Matters

Traditional infrastructure management through manual server configuration, point-and-click cloud consoles, and undocumented "tribal knowledge" creates significant operational challenges. Changes are difficult to track, inconsistencies emerge across environments, disaster recovery requires manual reconstruction, and scaling is slow and error-prone.

Infrastructure as Code solves these problems by treating infrastructure configuration as software. Every server, network rule, load balancer, and database instance is defined in version-controlled files. Changes go through code review. Deployments are automated and repeatable. Disaster recovery becomes as simple as re-running your infrastructure code in a new region.

For Geode deployments, IaC provides critical benefits including consistent environments across development, staging, and production, rapid scaling to handle load increases or create new environments, disaster recovery through infrastructure re-creation in minutes, compliance through auditability of every infrastructure change, and cost optimization by quickly provisioning environments only when needed.

## Infrastructure Architecture Principles

Before diving into specific tools, understanding infrastructure architecture principles ensures your Geode deployment is robust, scalable, and maintainable.

**High Availability Design**: Production Geode deployments should span multiple availability zones within a region. Place Geode instances in separate failure domains so that zone outages don't impact database availability. Use network load balancers to distribute client connections across healthy instances. Configure automatic health checks to remove failed instances from load balancer rotation.

**Network Segmentation**: Isolate Geode instances in private subnets with no direct internet access. Use bastion hosts or VPN connections for administrative access. Place load balancers in public subnets to accept client connections while keeping database instances protected. Configure security groups or network ACLs to restrict traffic to only required ports (3141 for QUIC, 9090 for metrics).

**Storage Strategy**: Use high-performance block storage (AWS EBS gp3, Azure Premium SSD, GCP Persistent SSD) for Geode data directories. Size IOPS and throughput based on workload requirements—typical production deployments need 5,000-16,000 IOPS and 250-1,000 MB/s throughput. Enable encryption at rest for compliance. Configure automated snapshots for backup and recovery.

**Monitoring and Observability**: Deploy monitoring agents to collect metrics, logs, and traces. Export metrics to centralized systems like Prometheus, CloudWatch, or Datadog. Configure alerting for critical conditions like high CPU, disk space exhaustion, connection pool saturation, or query latency spikes. Implement log aggregation for troubleshooting and compliance.

**Security Hardening**: Enable TLS for all connections with certificate management through ACM or cert-manager. Implement least-privilege IAM policies for service accounts. Use secrets management (AWS Secrets Manager, HashiCorp Vault) for credentials. Configure audit logging for compliance requirements. Regularly patch operating systems and update Geode to latest stable versions.

## Terraform

### AWS Infrastructure

```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "geode" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "geode-vpc"
  }
}

# Security Group
resource "aws_security_group" "geode" {
  name        = "geode-sg"
  description = "Security group for Geode"
  vpc_id      = aws_vpc.geode.id

  ingress {
    from_port   = 3141
    to_port     = 3141
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 Instances
resource "aws_instance" "geode" {
  count = var.instance_count

  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.private[count.index].id

  vpc_security_group_ids = [aws_security_group.geode.id]

  root_block_device {
    volume_type = "gp3"
    volume_size = 100
    iops        = 3000
    throughput  = 125
    encrypted   = true
  }

  user_data = file("${path.module}/install-geode.sh")

  tags = {
    Name = "geode-${count.index}"
  }
}

# EBS Volumes for Data
resource "aws_ebs_volume" "geode_data" {
  count = var.instance_count

  availability_zone = aws_instance.geode[count.index].availability_zone
  size              = 1000
  type              = "gp3"
  iops              = 16000
  throughput        = 1000
  encrypted         = true

  tags = {
    Name = "geode-data-${count.index}"
  }
}

resource "aws_volume_attachment" "geode_data" {
  count = var.instance_count

  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.geode_data[count.index].id
  instance_id = aws_instance.geode[count.index].id
}

# Load Balancer
resource "aws_lb" "geode" {
  name               = "geode-nlb"
  internal           = true
  load_balancer_type = "network"
  subnets            = aws_subnet.private[*].id

  tags = {
    Name = "geode-nlb"
  }
}

resource "aws_lb_target_group" "geode" {
  name     = "geode-targets"
  port     = 3141
  protocol = "TCP"
  vpc_id   = aws_vpc.geode.id

  health_check {
    protocol = "TCP"
    port     = 3141
  }
}

resource "aws_lb_listener" "geode" {
  load_balancer_arn = aws_lb.geode.arn
  port              = 3141
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.geode.arn
  }
}

resource "aws_lb_target_group_attachment" "geode" {
  count = var.instance_count

  target_group_arn = aws_lb_target_group.geode.arn
  target_id        = aws_instance.geode[count.index].id
  port             = 3141
}
```

### Variables

```hcl
# variables.tf
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "instance_count" {
  description = "Number of Geode instances"
  type        = number
  default     = 3
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "r6g.2xlarge"
}
```

## CloudFormation

```yaml
# geode-stack.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Geode Graph Database Infrastructure

Parameters:
  InstanceType:
    Type: String
    Default: r6g.2xlarge
    Description: EC2 instance type

  InstanceCount:
    Type: Number
    Default: 3
    Description: Number of Geode instances

Resources:
  GeodeVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: geode-vpc

  GeodeSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupName: geode-sg
      GroupDescription: Security group for Geode
      VpcId: !Ref GeodeVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 3141
          ToPort: 3141
          CidrIp: 10.0.0.0/8

  GeodeLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: geode-nlb
      Type: network
      Scheme: internal
      Subnets:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
        - !Ref PrivateSubnet3

  GeodeTargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: geode-targets
      Port: 3141
      Protocol: TCP
      VpcId: !Ref GeodeVPC
      HealthCheckProtocol: TCP
      HealthCheckPort: 3141

  GeodeListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      LoadBalancerArn: !Ref GeodeLoadBalancer
      Port: 3141
      Protocol: TCP
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref GeodeTargetGroup

Outputs:
  LoadBalancerDNS:
    Description: Load balancer DNS name
    Value: !GetAtt GeodeLoadBalancer.DNSName
```

## Ansible Configuration Management

```yaml
# ansible/playbook.yml
---
- name: Deploy Geode
  hosts: geode_servers
  become: yes

  vars:
    geode_version: "__GEODE_TAG__"
    geode_data_dir: "/var/lib/geode"

  tasks:
    - name: Install dependencies
      apt:
        name:
          - git
          - ca-certificates
        state: present
        update_cache: yes

    - name: Clone Geode
      git:
        repo: "https://github.com/codeprosorg/geode"
        dest: "/opt/geode"
        version: "{{ geode_version }}"

    - name: Build Geode
      command: make build
      args:
        chdir: "/opt/geode"

    - name: Install Geode binary
      copy:
        src: "/opt/geode/zig-out/bin/geode"
        dest: "/usr/local/bin/geode"
        mode: "0755"
        remote_src: true

    - name: Create geode user
      user:
        name: geode
        system: yes
        shell: /bin/false

    - name: Create data directory
      file:
        path: "{{ geode_data_dir }}"
        state: directory
        owner: geode
        group: geode
        mode: '0755'

    - name: Install systemd service
      template:
        src: geode.service.j2
        dest: /etc/systemd/system/geode.service

    - name: Start Geode
      systemd:
        name: geode
        state: started
        enabled: yes
        daemon_reload: yes
```

## Pulumi for Infrastructure

Pulumi enables infrastructure management using familiar programming languages like Python, TypeScript, and Go:

```python
# pulumi_geode.py
import pulumi
import pulumi_aws as aws

# VPC Configuration
vpc = aws.ec2.Vpc("geode-vpc",
    cidr_block="10.0.0.0/16",
    enable_dns_hostnames=True,
    enable_dns_support=True,
    tags={"Name": "geode-vpc"})

# Private Subnets across AZs
private_subnets = []
azs = ["us-east-1a", "us-east-1b", "us-east-1c"]
for i, az in enumerate(azs):
    subnet = aws.ec2.Subnet(f"geode-private-{i}",
        vpc_id=vpc.id,
        cidr_block=f"10.0.{i+1}.0/24",
        availability_zone=az,
        tags={"Name": f"geode-private-{az}"})
    private_subnets.append(subnet)

# Geode Security Group
geode_sg = aws.ec2.SecurityGroup("geode-sg",
    vpc_id=vpc.id,
    description="Geode database security group",
    ingress=[
        aws.ec2.SecurityGroupIngressArgs(
            from_port=3141,
            to_port=3141,
            protocol="tcp",
            cidr_blocks=["10.0.0.0/8"],
            description="Geode QUIC protocol"
        ),
        aws.ec2.SecurityGroupIngressArgs(
            from_port=9090,
            to_port=9090,
            protocol="tcp",
            cidr_blocks=["10.0.0.0/8"],
            description="Prometheus metrics"
        )
    ],
    egress=[
        aws.ec2.SecurityGroupEgressArgs(
            from_port=0,
            to_port=0,
            protocol="-1",
            cidr_blocks=["0.0.0.0/0"]
        )
    ])

# Geode Instances
instances = []
for i in range(3):
    instance = aws.ec2.Instance(f"geode-{i}",
        ami="ami-0c55b159cbfafe1f0",  # Ubuntu 22.04
        instance_type="r6g.2xlarge",
        subnet_id=private_subnets[i].id,
        vpc_security_group_ids=[geode_sg.id],
        root_block_device=aws.ec2.InstanceRootBlockDeviceArgs(
            volume_type="gp3",
            volume_size=100,
            iops=3000,
            throughput=125,
            encrypted=True
        ),
        user_data="""#!/bin/bash
apt-get update
apt-get install -y git make
git clone https://github.com/codeprosorg/geode
cd geode
make build
cp ./zig-out/bin/geode /usr/local/bin/geode
useradd -r -s /bin/false geode
mkdir -p /var/lib/geode
chown geode:geode /var/lib/geode
cat > /etc/systemd/system/geode.service <<EOF
[Unit]
Description=Geode Graph Database
After=network.target

[Service]
User=geode
ExecStart=/usr/local/bin/geode serve --listen 0.0.0.0:3141 --data /var/lib/geode
Restart=always

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now geode
""",
        tags={"Name": f"geode-{i}", "Role": "database"})
    instances.append(instance)

# Export endpoint
pulumi.export("instance_ips", [inst.private_ip for inst in instances])
```

Pulumi advantages include full programming language support (loops, conditionals, functions), strong typing and IDE autocomplete, easier testing with familiar test frameworks, and reusable components through language packages.

## GitOps and CI/CD Integration

Integrate infrastructure changes into your development workflow:

```yaml
# .github/workflows/infrastructure.yml
name: Infrastructure Deployment

on:
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'
  pull_request:
    paths:
      - 'infrastructure/**'

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.6.0

      - name: Terraform Init
        run: terraform init
        working-directory: infrastructure/terraform

      - name: Terraform Validate
        run: terraform validate
        working-directory: infrastructure/terraform

      - name: Terraform Plan
        run: terraform plan -out=tfplan
        working-directory: infrastructure/terraform
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve tfplan
        working-directory: infrastructure/terraform
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

GitOps practices ensure every infrastructure change is reviewed, tested, and auditable through version control.

## Multi-Cloud Infrastructure

Deploy Geode across multiple cloud providers for redundancy:

```hcl
# multi-cloud/main.tf
# AWS Primary Region
module "geode_aws_us_east" {
  source = "./modules/geode-cluster"

  cloud_provider = "aws"
  region = "us-east-1"
  instance_count = 3
  instance_type = "r6g.2xlarge"
}

# Azure Secondary Region
module "geode_azure_west_europe" {
  source = "./modules/geode-cluster"

  cloud_provider = "azure"
  region = "westeurope"
  instance_count = 3
  instance_type = "Standard_E16ds_v4"
}

# GCP Tertiary Region
module "geode_gcp_asia" {
  source = "./modules/geode-cluster"

  cloud_provider = "gcp"
  region = "asia-northeast1"
  instance_count = 3
  instance_type = "n2-highmem-16"
}

# Global Load Balancer
resource "cloudflare_load_balancer" "geode_global" {
  zone_id = var.cloudflare_zone_id
  name = "geode.example.com"

  default_pool_ids = [
    cloudflare_load_balancer_pool.aws_pool.id,
    cloudflare_load_balancer_pool.azure_pool.id,
    cloudflare_load_balancer_pool.gcp_pool.id
  ]

  steering_policy = "geo"
  session_affinity = "cookie"
}
```

## Infrastructure Testing

Test infrastructure code before deploying to production:

```python
# tests/test_infrastructure.py
import unittest
from pulumi import automation as auto

class TestGeodeInfrastructure(unittest.TestCase):
    def test_vpc_cidr_valid(self):
        """Test VPC CIDR block is correct"""
        stack = auto.select_stack("dev")
        outputs = stack.outputs()
        vpc_cidr = outputs["vpc_cidr"].value
        self.assertEqual(vpc_cidr, "10.0.0.0/16")

    def test_security_group_ports(self):
        """Test security group allows required ports"""
        stack = auto.select_stack("dev")
        outputs = stack.outputs()
        sg_rules = outputs["security_group_rules"].value

        required_ports = [3141, 9090]
        allowed_ports = [rule["from_port"] for rule in sg_rules]

        for port in required_ports:
            self.assertIn(port, allowed_ports)

    def test_encryption_enabled(self):
        """Test encryption is enabled on all volumes"""
        stack = auto.select_stack("prod")
        outputs = stack.outputs()
        volumes = outputs["ebs_volumes"].value

        for volume in volumes:
            self.assertTrue(volume["encrypted"])

if __name__ == '__main__':
    unittest.main()
```

## Disaster Recovery Infrastructure

Automate disaster recovery with infrastructure code:

```bash
#!/bin/bash
# disaster-recovery.sh

# Disaster Recovery Orchestration Script
set -e

BACKUP_REGION="us-west-2"
DR_REGION="eu-west-1"

echo "Starting disaster recovery procedure..."

# Step 1: Provision infrastructure in DR region
echo "Provisioning DR infrastructure..."
cd terraform/dr-region
terraform init
terraform apply -auto-approve \
  -var="region=$DR_REGION" \
  -var="instance_count=3"

# Step 2: Retrieve latest backup
echo "Retrieving latest backup from S3..."
LATEST_BACKUP=$(aws s3 ls s3://geode-backups-$BACKUP_REGION/ \
  --region $BACKUP_REGION | sort | tail -n 1 | awk '{print $4}')

aws s3 cp "s3://geode-backups-$BACKUP_REGION/$LATEST_BACKUP" \
  /tmp/latest-backup.tar.gz --region $BACKUP_REGION

# Step 3: Restore to DR instances
echo "Restoring database to DR instances..."
DR_INSTANCES=$(terraform output -json instance_ips | jq -r '.[]')
for instance in $DR_INSTANCES; do
  scp /tmp/latest-backup.tar.gz geode@$instance:/tmp/
  ssh geode@$instance "geode restore --backup=/tmp/latest-backup.tar.gz"
done

# Step 4: Update DNS for failover
echo "Updating DNS to point to DR region..."
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-failover.json

echo "Disaster recovery complete. Database is now running in $DR_REGION"
```

## Cost Optimization Strategies

Optimize infrastructure costs while maintaining performance:

**Right-sizing Instances**: Use monitoring data to identify over-provisioned instances and downsize appropriately. ARM-based instances (AWS Graviton) offer 20-40% cost savings with equivalent performance.

**Spot Instances for Development**: Use spot instances for non-production environments to reduce costs by 70-90%. Implement graceful shutdown handling for spot interruptions.

**Storage Tiering**: Use appropriate storage classes—gp3 for active databases, st1 for infrequently accessed backups, Glacier for long-term retention.

**Auto-Scaling**: Implement auto-scaling for development environments that shut down outside business hours:

```hcl
resource "aws_autoscaling_schedule" "shutdown_evening" {
  scheduled_action_name = "shutdown-evening"
  min_size = 0
  max_size = 0
  desired_capacity = 0
  recurrence = "0 18 * * MON-FRI"  # 6 PM weekdays
  autoscaling_group_name = aws_autoscaling_group.geode_dev.name
}

resource "aws_autoscaling_schedule" "startup_morning" {
  scheduled_action_name = "startup-morning"
  min_size = 3
  max_size = 5
  desired_capacity = 3
  recurrence = "0 8 * * MON-FRI"  # 8 AM weekdays
  autoscaling_group_name = aws_autoscaling_group.geode_dev.name
}
```

## Production Deployment Checklist

Before deploying Geode infrastructure to production:

- [ ] Multi-AZ deployment configured with at least 3 availability zones
- [ ] Network segmentation with private subnets for database instances
- [ ] Security groups restrict traffic to required ports only
- [ ] Encryption enabled for all volumes (root and data)
- [ ] TLS certificates configured for encrypted client connections
- [ ] Load balancer health checks configured and tested
- [ ] Automated backups scheduled with appropriate retention
- [ ] Monitoring and alerting configured in CloudWatch/Prometheus
- [ ] Disaster recovery procedures documented and tested
- [ ] IAM roles follow least-privilege principle
- [ ] Secrets stored in AWS Secrets Manager or HashiCorp Vault
- [ ] Infrastructure code in version control with required approvals
- [ ] Terraform state stored remotely with locking enabled
- [ ] Runbook documented for common operational tasks
- [ ] Performance testing completed with production-like load

## Troubleshooting Common Infrastructure Issues

**Terraform State Corruption**: If Terraform state becomes corrupted, restore from backup and re-import resources. Enable state versioning and locking to prevent concurrent modifications.

**Security Group Conflicts**: Ensure security group rules don't conflict. Use Terraform's `terraform plan` to preview changes before applying.

**Instance Launch Failures**: Check IAM permissions, AMI availability in target region, and EC2 service limits. Review CloudTrail logs for detailed error messages.

**Network Connectivity Issues**: Verify route tables, NAT gateways, and security group rules. Use VPC Flow Logs to debug traffic patterns.

**High Infrastructure Costs**: Review unused resources (idle instances, unattached volumes, old snapshots). Implement cost allocation tags and budget alerts.

## Related Topics

- **[Deployment](/tags/deployment/)**: Deployment strategies and patterns
- **[Cloud](/tags/cloud/)**: Cloud platform integrations
- **[Containers](/tags/containers/)**: Container technologies
- **[Orchestration](/tags/orchestration/)**: Kubernetes orchestration
- **[Monitoring](/tags/monitoring/)**: Infrastructure monitoring
- **[Security](/tags/security/)**: Security best practices
- **[High Availability](/tags/high-availability/)**: HA architectures
- **[Backup](/tags/backup/)**: Backup and recovery

## Further Reading

- **Infrastructure as Code Guide**: `/docs/operations/infrastructure-as-code/`
- **Terraform Best Practices**: `/docs/operations/terraform-best-practices/`
- **Configuration Management**: `/docs/operations/configuration-management/`
- **Cloud Deployment Patterns**: `/docs/deployment/cloud-patterns/`
- **Cost Optimization**: `/docs/operations/cost-optimization/`
- **Disaster Recovery Planning**: `/docs/operations/disaster-recovery/`
