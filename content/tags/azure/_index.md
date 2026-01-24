---
title: "Microsoft Azure Deployment - Geode Graph Database"
description: "Complete guide to deploying Geode on Microsoft Azure. Covers Azure Virtual Machines, AKS, Azure Storage, managed services, monitoring, security, and cost optimization."
keywords:
  - Azure deployment
  - Microsoft Azure
  - AKS
  - Azure Kubernetes Service
  - Azure Virtual Machines
  - Azure Storage
  - Azure Monitor
  - cloud deployment
  - Azure networking
  - Azure security
  - Azure cost optimization
  - managed services
  - hybrid cloud
  - Azure DevOps
  - infrastructure as code
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/azure/"
    noindex: false
---

# Geode on Microsoft Azure

Microsoft Azure provides enterprise-grade cloud infrastructure for deploying Geode graph database with comprehensive managed services, global reach, hybrid cloud capabilities, and deep integration with Microsoft's ecosystem. This guide covers production-ready deployment patterns, best practices, and Azure-specific optimizations.

## Azure Deployment Options

### Azure Virtual Machines

Deploy Geode on dedicated VMs for maximum control and performance.

**Recommended VM Series**:

**General Purpose (Development/Testing)**:
- **D-Series v5**: Balanced compute and memory
  - D4s_v5: 4 vCPUs, 16 GB RAM (small workloads)
  - D8s_v5: 8 vCPUs, 32 GB RAM (medium workloads)
  - D16s_v5: 16 vCPUs, 64 GB RAM (large workloads)

**Memory Optimized (Production)**:
- **E-Series v5**: High memory-to-CPU ratio for graph workloads
  - E8s_v5: 8 vCPUs, 64 GB RAM
  - E16s_v5: 16 vCPUs, 128 GB RAM
  - E32s_v5: 32 vCPUs, 256 GB RAM

**Compute Optimized**:
- **F-Series v2**: High CPU performance for query-intensive workloads
  - F8s_v2: 8 vCPUs, 16 GB RAM
  - F16s_v2: 16 vCPUs, 32 GB RAM

**Storage Optimized**:
- **L-Series v3**: Large local NVMe storage
  - L8s_v3: 8 vCPUs, 64 GB RAM, 1.92 TB NVMe
  - L16s_v3: 16 vCPUs, 128 GB RAM, 3.84 TB NVMe

### Azure Kubernetes Service (AKS)

Deploy Geode on AKS for automatic scaling, rolling updates, and orchestration.

**Benefits**:
- Managed Kubernetes control plane
- Auto-scaling (HPA and Cluster Autoscaler)
- Integration with Azure Active Directory
- Built-in monitoring with Azure Monitor
- Automatic security patches and updates

**Node Pool Configuration**:
```bash
# Create AKS cluster with system node pool
az aks create \
  --resource-group geode-rg \
  --name geode-cluster \
  --node-count 3 \
  --node-vm-size Standard_D4s_v5 \
  --enable-managed-identity \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10 \
  --network-plugin azure \
  --enable-addons monitoring \
  --location eastus

# Add memory-optimized node pool for Geode
az aks nodepool add \
  --resource-group geode-rg \
  --cluster-name geode-cluster \
  --name geodepool \
  --node-count 3 \
  --node-vm-size Standard_E8s_v5 \
  --node-taints workload=geode:NoSchedule \
  --labels workload=geode \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 12
```

### Azure Container Instances (ACI)

Quick deployment for development and testing:

```bash
# Deploy single Geode instance
az container create \
  --resource-group geode-rg \
  --name geode-dev \
  --image geodedb/geode:latest \
  --cpu 4 \
  --memory 16 \
  --ports 3141 8443 \
  --dns-name-label geode-dev \
  --environment-variables \
    GEODE_LOG_LEVEL=info \
  --location eastus
```

## VM Deployment Guide

### Single-Instance Deployment

**1. Create Resource Group**:
```bash
az group create \
  --name geode-rg \
  --location eastus
```

**2. Create Virtual Network**:
```bash
az network vnet create \
  --resource-group geode-rg \
  --name geode-vnet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name geode-subnet \
  --subnet-prefix 10.0.1.0/24
```

**3. Create Network Security Group**:
```bash
az network nsg create \
  --resource-group geode-rg \
  --name geode-nsg

# Allow QUIC (3141)
az network nsg rule create \
  --resource-group geode-rg \
  --nsg-name geode-nsg \
  --name AllowQuic \
  --priority 100 \
  --source-address-prefixes '*' \
  --destination-port-ranges 3141 \
  --protocol Udp \
  --access Allow

# Allow HTTPS (8443)
az network nsg rule create \
  --resource-group geode-rg \
  --nsg-name geode-nsg \
  --name AllowHttps \
  --priority 101 \
  --source-address-prefixes '*' \
  --destination-port-ranges 8443 \
  --protocol Tcp \
  --access Allow

# Allow SSH
az network nsg rule create \
  --resource-group geode-rg \
  --nsg-name geode-nsg \
  --name AllowSsh \
  --priority 102 \
  --source-address-prefixes 'YOUR_IP/32' \
  --destination-port-ranges 22 \
  --protocol Tcp \
  --access Allow
```

**4. Create VM with Premium SSD**:
```bash
az vm create \
  --resource-group geode-rg \
  --name geode-vm-01 \
  --image Ubuntu2204 \
  --size Standard_E8s_v5 \
  --vnet-name geode-vnet \
  --subnet geode-subnet \
  --nsg geode-nsg \
  --storage-sku Premium_LRS \
  --os-disk-size-gb 128 \
  --data-disk-sizes-gb 512 \
  --admin-username azureuser \
  --ssh-key-values ~/.ssh/id_rsa.pub \
  --public-ip-sku Standard
```

**5. Install Geode**:
```bash
# SSH into VM
ssh azureuser@<VM_PUBLIC_IP>

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Mount data disk
sudo mkfs.ext4 /dev/sdc
sudo mkdir /data
sudo mount /dev/sdc /data
echo '/dev/sdc /data ext4 defaults 0 0' | sudo tee -a /etc/fstab

# Run Geode
docker run -d \
  --name geode \
  --restart always \
  -p 3141:3141/udp \
  -p 8443:8443/tcp \
  -v /data:/var/lib/geode \
  -e GEODE_DATA_DIR=/var/lib/geode \
  geodedb/geode:latest serve --listen 0.0.0.0:3141
```

### High-Availability Deployment

Deploy multiple VMs with Azure Load Balancer:

**1. Create Availability Set**:
```bash
az vm availability-set create \
  --resource-group geode-rg \
  --name geode-avset \
  --platform-fault-domain-count 2 \
  --platform-update-domain-count 5
```

**2. Create Load Balancer**:
```bash
az network lb create \
  --resource-group geode-rg \
  --name geode-lb \
  --sku Standard \
  --vnet-name geode-vnet \
  --subnet geode-subnet \
  --backend-pool-name geode-backend \
  --frontend-ip-name geode-frontend

# Create health probe
az network lb probe create \
  --resource-group geode-rg \
  --lb-name geode-lb \
  --name geode-health \
  --protocol tcp \
  --port 8443 \
  --interval 30

# Create load balancing rule (QUIC)
az network lb rule create \
  --resource-group geode-rg \
  --lb-name geode-lb \
  --name GeodeQuic \
  --protocol Udp \
  --frontend-port 3141 \
  --backend-port 3141 \
  --frontend-ip-name geode-frontend \
  --backend-pool-name geode-backend \
  --probe-name geode-health
```

**3. Create Multiple VMs**:
```bash
for i in {1..3}; do
  az vm create \
    --resource-group geode-rg \
    --name geode-vm-0$i \
    --availability-set geode-avset \
    --image Ubuntu2204 \
    --size Standard_E8s_v5 \
    --vnet-name geode-vnet \
    --subnet geode-subnet \
    --nsg geode-nsg \
    --storage-sku Premium_LRS \
    --os-disk-size-gb 128 \
    --data-disk-sizes-gb 512 \
    --admin-username azureuser \
    --ssh-key-values ~/.ssh/id_rsa.pub \
    --lb-name geode-lb \
    --backend-pool-name geode-backend
done
```

## AKS Deployment

### Kubernetes Manifests

**Namespace and ConfigMap**:
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: geode
---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: geode-config
  namespace: geode
data:
  geode.conf: |
    log_level = "info"
    data_dir = "/var/lib/geode"
    listen_addr = "0.0.0.0:3141"
```

**StatefulSet with Azure Disk**:
```yaml
# statefulset.yaml
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
        workload: geode
      tolerations:
      - key: workload
        operator: Equal
        value: geode
        effect: NoSchedule
      containers:
      - name: geode
        image: geodedb/geode:latest
        ports:
        - containerPort: 3141
          protocol: UDP
          name: quic
        - containerPort: 8443
          protocol: TCP
          name: https
        env:
        - name: GEODE_DATA_DIR
          value: /var/lib/geode
        - name: GEODE_LOG_LEVEL
          value: info
        resources:
          requests:
            memory: "32Gi"
            cpu: "4"
          limits:
            memory: "64Gi"
            cpu: "8"
        volumeMounts:
        - name: data
          mountPath: /var/lib/geode
        - name: config
          mountPath: /etc/geode
        livenessProbe:
          httpGet:
            path: /health
            port: 8443
            scheme: HTTPS
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8443
            scheme: HTTPS
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: geode-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: managed-premium
      resources:
        requests:
          storage: 512Gi
```

**Service (Internal Load Balancer)**:
```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: geode
  namespace: geode
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
spec:
  type: LoadBalancer
  selector:
    app: geode
  ports:
  - name: quic
    port: 3141
    protocol: UDP
  - name: https
    port: 8443
    protocol: TCP
```

**HorizontalPodAutoscaler**:
```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: geode
  namespace: geode
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: geode
  minReplicas: 3
  maxReplicas: 12
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
```

**Deploy to AKS**:
```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group geode-rg \
  --name geode-cluster

# Apply manifests
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f statefulset.yaml
kubectl apply -f service.yaml
kubectl apply -f hpa.yaml

# Verify deployment
kubectl get pods -n geode
kubectl get svc -n geode
```

## Storage Options

### Azure Managed Disks

**Premium SSD (P-Series)**:
- P30: 1 TB, 5000 IOPS, 200 MB/s
- P40: 2 TB, 7500 IOPS, 250 MB/s
- P50: 4 TB, 7500 IOPS, 250 MB/s
- P60: 8 TB, 16000 IOPS, 500 MB/s

Best for production Geode workloads with predictable performance.

**Premium SSD v2**:
- Configurable IOPS and throughput independent of size
- Up to 64 TB per disk
- Up to 80,000 IOPS and 1,200 MB/s per disk

Ideal for high-performance requirements.

**Ultra Disk**:
- Up to 64 TB per disk
- Up to 160,000 IOPS and 4,000 MB/s
- Sub-millisecond latency

For extreme performance needs (financial services, real-time analytics).

### Azure Files

SMB or NFS file shares for shared storage:

```bash
# Create storage account
az storage account create \
  --resource-group geode-rg \
  --name geodestorage \
  --sku Premium_LRS \
  --kind FileStorage

# Create file share
az storage share create \
  --account-name geodestorage \
  --name geode-backup \
  --quota 1024
```

### Azure Blob Storage

For backups and long-term archival:

```bash
# Create storage account
az storage account create \
  --resource-group geode-rg \
  --name geodebackup \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Create container
az storage container create \
  --account-name geodebackup \
  --name geode-backups
```

## Monitoring and Observability

### Azure Monitor Integration

**Enable Container Insights for AKS**:
```bash
az aks enable-addons \
  --resource-group geode-rg \
  --name geode-cluster \
  --addons monitoring
```

**Create Log Analytics Workspace**:
```bash
az monitor log-analytics workspace create \
  --resource-group geode-rg \
  --workspace-name geode-logs \
  --location eastus
```

**Custom Metrics**:
```bash
# Install Azure Monitor Agent on VM
az vm extension set \
  --resource-group geode-rg \
  --vm-name geode-vm-01 \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor
```

**KQL Queries for Geode**:
```kql
// Query latency percentiles
ContainerLog
| where ContainerName contains "geode"
| where LogEntry contains "query_duration"
| extend Duration = extract("duration=([0-9.]+)", 1, LogEntry)
| summarize
    p50=percentile(todouble(Duration), 50),
    p95=percentile(todouble(Duration), 95),
    p99=percentile(todouble(Duration), 99)
  by bin(TimeGenerated, 5m)

// Connection count
ContainerLog
| where ContainerName contains "geode"
| where LogEntry contains "connection_count"
| extend Count = extract("count=([0-9]+)", 1, LogEntry)
| summarize avg(toint(Count)) by bin(TimeGenerated, 1m)
```

### Application Insights

Instrument Geode clients with Application Insights:

```python
# Python client with App Insights
from azure.monitor.opentelemetry import configure_azure_monitor
import geode_client

configure_azure_monitor(
    connection_string="InstrumentationKey=..."
)

async with geode_client.connect() as conn:
    result = await conn.execute("MATCH (u:User) RETURN COUNT(u)")
```

### Metrics Dashboards

Create Azure Dashboard for Geode metrics:

```bash
az portal dashboard create \
  --resource-group geode-rg \
  --name geode-dashboard \
  --input-path dashboard.json
```

## Security

### Azure Active Directory Integration

**Managed Identity for AKS**:
```bash
# Enable managed identity
az aks update \
  --resource-group geode-rg \
  --name geode-cluster \
  --enable-managed-identity

# Grant Key Vault access
az keyvault set-policy \
  --name geode-keyvault \
  --object-id $(az aks show -g geode-rg -n geode-cluster \
    --query identityProfile.kubeletidentity.objectId -o tsv) \
  --secret-permissions get list
```

### Azure Key Vault

Store TLS certificates and secrets:

```bash
# Create Key Vault
az keyvault create \
  --resource-group geode-rg \
  --name geode-keyvault \
  --location eastus

# Store TLS certificate
az keyvault certificate import \
  --vault-name geode-keyvault \
  --name geode-tls-cert \
  --file geode-cert.pfx

# Store database password
az keyvault secret set \
  --vault-name geode-keyvault \
  --name geode-admin-password \
  --value "SecurePassword123!"
```

**Access from Kubernetes**:
```yaml
# Use CSI driver for secrets
apiVersion: v1
kind: SecretProviderClass
metadata:
  name: geode-secrets
  namespace: geode
spec:
  provider: azure
  parameters:
    keyvaultName: geode-keyvault
    objects: |
      array:
        - |
          objectName: geode-tls-cert
          objectType: secret
        - |
          objectName: geode-admin-password
          objectType: secret
    tenantId: "YOUR_TENANT_ID"
```

### Network Security

**Private Endpoints**:
```bash
# Create private endpoint for storage
az network private-endpoint create \
  --resource-group geode-rg \
  --name geode-storage-pe \
  --vnet-name geode-vnet \
  --subnet geode-subnet \
  --private-connection-resource-id $(az storage account show \
    -g geode-rg -n geodestorage --query id -o tsv) \
  --group-id file \
  --connection-name geode-storage-connection
```

**Azure Firewall**:
```bash
# Create firewall
az network firewall create \
  --resource-group geode-rg \
  --name geode-firewall \
  --location eastus

# Create application rules
az network firewall application-rule create \
  --firewall-name geode-firewall \
  --resource-group geode-rg \
  --collection-name geode-rules \
  --name AllowGeode \
  --protocols Https=8443 \
  --source-addresses 10.0.0.0/16 \
  --target-fqdns geode.example.com \
  --priority 100 \
  --action Allow
```

## Backup and Disaster Recovery

### Azure Backup

**VM Backup**:
```bash
# Create Recovery Services vault
az backup vault create \
  --resource-group geode-rg \
  --name geode-backup-vault \
  --location eastus

# Enable backup for VM
az backup protection enable-for-vm \
  --resource-group geode-rg \
  --vault-name geode-backup-vault \
  --vm geode-vm-01 \
  --policy-name DefaultPolicy
```

### Geo-Redundant Backup

```bash
# Backup to Blob Storage with GRS
az storage account create \
  --resource-group geode-rg \
  --name geodebackupgrs \
  --sku Standard_GRS \
  --location eastus

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
docker exec geode geode backup --output /tmp/backup-$DATE.tar.gz
az storage blob upload \
  --account-name geodebackupgrs \
  --container-name backups \
  --name backup-$DATE.tar.gz \
  --file /tmp/backup-$DATE.tar.gz
```

## Cost Optimization

### Reserved Instances

Save up to 72% with 3-year reservations:

```bash
# Purchase VM reservation
az reservations reservation-order purchase \
  --reservation-order-id ORDER_ID \
  --sku Standard_E8s_v5 \
  --location eastus \
  --quantity 3 \
  --term P3Y
```

### Spot Instances for Development

```bash
# Create spot VM (up to 90% savings)
az vm create \
  --resource-group geode-dev-rg \
  --name geode-dev-spot \
  --priority Spot \
  --max-price -1 \
  --eviction-policy Deallocate \
  --size Standard_D4s_v5 \
  --image Ubuntu2204
```

### Auto-Shutdown

```bash
# Schedule VM shutdown
az vm auto-shutdown \
  --resource-group geode-rg \
  --name geode-dev-vm \
  --time 1900 \
  --timezone "Pacific Standard Time"
```

### Storage Tiering

```bash
# Move old backups to Cool tier
az storage blob set-tier \
  --account-name geodebackup \
  --container-name backups \
  --name old-backup.tar.gz \
  --tier Cool
```

## Related Topics

- **[Cloud](/tags/cloud/)**: General cloud deployment strategies
- **[AWS](/tags/aws/)**: Amazon Web Services deployment
- **[GCP](/tags/gcp/)**: Google Cloud Platform deployment
- **[Kubernetes](/tags/kubernetes/)**: Kubernetes orchestration
- **[Docker](/tags/docker/)**: Container deployment
- **[Monitoring](/tags/monitoring/)**: Monitoring and observability
- **[Security](/tags/security/)**: Security best practices
- **[High Availability](/tags/high-availability/)**: HA architecture

## Further Reading

- **Azure Deployment Guide**: `/docs/deployment/azure/`
- **AKS Best Practices**: `/docs/deployment/aks/`
- **Azure Monitor Integration**: `/docs/monitoring/azure-monitor/`
- **Security on Azure**: `/docs/security/azure-security/`

## Conclusion

Microsoft Azure provides a comprehensive platform for deploying Geode graph database at any scale. From simple VM deployments to sophisticated AKS clusters with auto-scaling, Azure's managed services, global infrastructure, and deep integration with Microsoft ecosystem make it an excellent choice for enterprise Geode deployments.

Key advantages of Azure for Geode:
- Enterprise-grade managed services (AKS, Storage, Monitor)
- Hybrid cloud capabilities with Azure Arc
- Deep integration with Microsoft 365 and Active Directory
- Comprehensive compliance certifications
- Global network with 60+ regions
