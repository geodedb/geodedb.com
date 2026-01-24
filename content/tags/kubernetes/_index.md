---
title: "Tag: Kubernetes Orchestration"
description: "Explore Geode documentation tagged with kubernetes. Learn about kubernetes features, best practices, and implementation details."
keywords:
  - kubernetes
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/kubernetes/"
    noindex: false
---

Kubernetes provides production-grade orchestration for running Geode at scale. As a cloud-native graph database, Geode integrates seamlessly with Kubernetes, leveraging StatefulSets for stable storage, Services for networking, ConfigMaps and Secrets for configuration, and Operators for advanced lifecycle management.

Deploying Geode on Kubernetes enables automatic scaling, self-healing, rolling updates, and multi-region deployments. Whether you're running a single-node development cluster or a globally distributed production system, Kubernetes provides the infrastructure automation needed for enterprise graph database operations.

This comprehensive guide covers Kubernetes deployment patterns, from basic single-node setups through advanced multi-region topologies with automated backup, monitoring, and disaster recovery.

## Core Kubernetes Concepts for Geode

**StatefulSets**: Geode uses StatefulSets to maintain stable network identities and persistent storage across pod restarts. Each Geode node gets a predictable hostname and persistent volume claim.

**Services**: Kubernetes Services provide stable endpoints for client connections and inter-node communication. Geode uses headless Services for StatefulSet discovery and LoadBalancer Services for external access.

**Persistent Volumes**: Geode's data directory and WAL are stored on PersistentVolumeClaims, ensuring data survives pod rescheduling.

**ConfigMaps and Secrets**: Configuration files, TLS certificates, and credentials are managed through Kubernetes resources, enabling GitOps workflows.

**Health Checks**: Liveness and readiness probes ensure Kubernetes only routes traffic to healthy Geode nodes and restarts failed instances.

## Basic Deployment

**Single-Node Geode StatefulSet**:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: geode
  labels:
    app: geode
spec:
  ports:
    - port: 3141
      name: client
    - port: 8080
      name: metrics
  clusterIP: None
  selector:
    app: geode
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: geode
spec:
  serviceName: geode
  replicas: 1
  selector:
    matchLabels:
      app: geode
  template:
    metadata:
      labels:
        app: geode
    spec:
      containers:
      - name: geode
        image: geodedb/geode:v0.18.0
        ports:
        - containerPort: 3141
          name: client
        - containerPort: 8080
          name: metrics
        env:
        - name: GEODE_DATA_DIR
          value: /var/lib/geode
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        volumeMounts:
        - name: data
          mountPath: /var/lib/geode
        livenessProbe:
          exec:
            command: ["geode", "ping"]
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["geode", "ready"]
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

**Apply the Configuration**:

```bash
# Create namespace
kubectl create namespace geode

# Apply manifests
kubectl apply -f geode-statefulset.yaml -n geode

# Check status
kubectl get pods -n geode
kubectl get pvc -n geode

# View logs
kubectl logs geode-0 -n geode

# Connect to Geode shell
kubectl exec -it geode-0 -n geode -- geode shell
```

## Multi-Node Cluster Deployment

Deploy a three-node Geode cluster for high availability:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: geode
  namespace: geode
spec:
  serviceName: geode-headless
  replicas: 3
  podManagementPolicy: Parallel
  selector:
    matchLabels:
      app: geode
  template:
    metadata:
      labels:
        app: geode
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - geode
            topologyKey: kubernetes.io/hostname
      containers:
      - name: geode
        image: geodedb/geode:v0.18.0
        env:
        - name: GEODE_CLUSTER_MODE
          value: "distributed"
        - name: GEODE_NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: GEODE_CLUSTER_PEERS
          value: "geode-0.geode-headless:3141,geode-1.geode-headless:3141,geode-2.geode-headless:3141"
        - name: GEODE_REPLICATION_FACTOR
          value: "3"
        volumeMounts:
        - name: data
          mountPath: /var/lib/geode
        - name: config
          mountPath: /etc/geode
        - name: tls
          mountPath: /etc/geode/tls
          readOnly: true
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
          limits:
            memory: "8Gi"
            cpu: "4000m"
      volumes:
      - name: config
        configMap:
          name: geode-config
      - name: tls
        secret:
          secretName: geode-tls
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 500Gi
```

## Configuration Management

**ConfigMap for Geode Configuration**:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: geode-config
  namespace: geode
data:
  geode.toml: |
    [server]
    listen = "0.0.0.0:3141"
    max_connections = 1000

    [storage]
    data_dir = "/var/lib/geode/data"
    wal_dir = "/var/lib/geode/wal"

    [logging]
    level = "INFO"
    format = "json"

    [metrics]
    enabled = true
    endpoint = "/metrics"
```

**Secrets for TLS Certificates**:

```bash
# Create TLS secret
kubectl create secret tls geode-tls \
  --cert=server.crt \
  --key=server.key \
  -n geode

# Create secret from files
kubectl create secret generic geode-admin-password \
  --from-file=admin-password=./admin-password.txt \
  -n geode
```

## Service Exposure

**ClusterIP Service** (internal access):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: geode-headless
  namespace: geode
spec:
  clusterIP: None
  selector:
    app: geode
  ports:
  - name: client
    port: 3141
  - name: metrics
    port: 8080
```

**LoadBalancer Service** (external access):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: geode-external
  namespace: geode
spec:
  type: LoadBalancer
  selector:
    app: geode
  ports:
  - name: client
    port: 3141
    targetPort: 3141
```

**Ingress for HTTP/HTTPS**:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: geode-ingress
  namespace: geode
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - geode.example.com
    secretName: geode-tls
  rules:
  - host: geode.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: geode-external
            port:
              number: 3141
```

## Horizontal Pod Autoscaling

Scale Geode based on metrics:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: geode-hpa
  namespace: geode
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
        averageValue: "1000"
```

## Monitoring with Prometheus

**ServiceMonitor for Prometheus Operator**:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: geode
  namespace: geode
  labels:
    app: geode
spec:
  selector:
    matchLabels:
      app: geode
  endpoints:
  - port: metrics
    interval: 15s
    path: /metrics
```

**PodMonitor for Direct Pod Metrics**:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: geode-pods
  namespace: geode
spec:
  selector:
    matchLabels:
      app: geode
  podMetricsEndpoints:
  - port: metrics
    interval: 15s
```

## Backup and Disaster Recovery

**CronJob for Automated Backups**:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: geode-backup
  namespace: geode
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: geodedb/geode-backup:latest
            env:
            - name: GEODE_HOST
              value: geode-0.geode-headless:3141
            - name: BACKUP_DESTINATION
              value: s3://my-bucket/geode-backups
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secret-access-key
          restartPolicy: OnFailure
```

## Rolling Updates

**Update Strategy Configuration**:

```yaml
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0
```

**Perform Rolling Update**:

```bash
# Update image
kubectl set image statefulset/geode \
  geode=geodedb/geode:v0.18.1 \
  -n geode

# Monitor rollout
kubectl rollout status statefulset/geode -n geode

# Rollback if needed
kubectl rollout undo statefulset/geode -n geode
```

## Storage Classes

**Fast SSD Storage Class**:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: io2
  iopsPerGB: "50"
  fsType: ext4
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Network Policies

**Restrict Network Access**:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: geode-network-policy
  namespace: geode
spec:
  podSelector:
    matchLabels:
      app: geode
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: geode-client
    - namespaceSelector:
        matchLabels:
          name: application
    ports:
    - protocol: TCP
      port: 3141
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: geode
    ports:
    - protocol: TCP
      port: 3141
```

## Helm Chart Deployment

Install Geode using Helm:

```bash
# Add Geode Helm repository
helm repo add geode https://charts.geodedb.com
helm repo update

# Install with custom values
helm install geode geode/geode \
  --namespace geode \
  --create-namespace \
  --set replicaCount=3 \
  --set persistence.size=500Gi \
  --set resources.requests.memory=4Gi \
  --set resources.requests.cpu=2000m \
  --set metrics.enabled=true \
  --set ingress.enabled=true \
  --set ingress.hosts[0]=geode.example.com

# Upgrade installation
helm upgrade geode geode/geode \
  --namespace geode \
  --values custom-values.yaml

# Uninstall
helm uninstall geode -n geode
```

## Best Practices

**Resource Management**: Set appropriate resource requests and limits based on workload characteristics.

**Pod Anti-Affinity**: Distribute Geode pods across nodes to ensure high availability.

**Persistent Storage**: Use high-performance storage classes (SSD/NVMe) for database volumes.

**Health Checks**: Implement proper liveness and readiness probes to enable self-healing.

**Security**: Use RBAC, Network Policies, and Pod Security Standards to secure deployments.

**Monitoring**: Deploy Prometheus and Grafana for comprehensive observability.

**Backup Strategy**: Automate regular backups to external storage systems.

**Updates**: Use rolling updates with proper testing in staging environments first.

**Namespace Isolation**: Deploy Geode in dedicated namespaces with appropriate resource quotas.

**Configuration Management**: Use GitOps tools like ArgoCD or Flux for declarative configuration.

## Related Topics

- [Docker Containerization](/tags/docker/)
- [Deployment and DevOps](/tags/deployment/)
- [Monitoring and Observability](/tags/monitoring/)
- [Prometheus Metrics](/tags/prometheus/)
- [Infrastructure Operations](/tags/infrastructure/)
- [Production Best Practices](/tags/production/)
- [Scaling Strategies](/tags/scaling/)

## Further Reading

- Kubernetes Deployment Guide
- Helm Chart Documentation
- Multi-Region Deployment Patterns
- Disaster Recovery Planning
- Performance Tuning for Kubernetes
- Security Hardening Guide
