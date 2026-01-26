---
title: "Container Orchestration"
description: "Deploy and manage Geode at scale with Kubernetes, including StatefulSets, operators, auto-scaling, and production orchestration patterns."
keywords:
  - orchestration
  - Kubernetes
  - K8s
  - StatefulSet
  - operators
  - auto-scaling
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/orchestration/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Container Orchestration for Geode

Kubernetes provides production-grade orchestration for Geode, enabling automated deployment, scaling, and management of containerized database instances across clusters.

## Kubernetes Deployment

### StatefulSet Configuration

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
      containers:
      - name: geode
        image: codepros/geode:v0.18.0
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
            memory: "24Gi"
            cpu: "4"
          limits:
            memory: "32Gi"
            cpu: "8"
        livenessProbe:
          exec:
            command: ["/usr/local/bin/geode", "ping"]
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["/usr/local/bin/geode", "ready"]
          initialDelaySeconds: 10
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 1Ti
```

### Service Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: geode
  namespace: geode
spec:
  selector:
    app: geode
  ports:
  - name: client
    port: 3141
    targetPort: 3141
  - name: metrics
    port: 9090
    targetPort: 9090
  clusterIP: None  # Headless service
---
apiVersion: v1
kind: Service
metadata:
  name: geode-lb
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

### Horizontal Pod Autoscaling

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
```

## Helm Charts

```yaml
# values.yaml
replicaCount: 3

image:
  repository: codepros/geode
  tag: v0.18.0
  pullPolicy: IfNotPresent

resources:
  requests:
    memory: "24Gi"
    cpu: "4"
  limits:
    memory: "32Gi"
    cpu: "8"

persistence:
  enabled: true
  storageClass: "fast-ssd"
  size: 1Ti

service:
  type: LoadBalancer
  port: 3141

monitoring:
  enabled: true
  serviceMonitor: true
```

## Related Topics

- **[Containers](/tags/containers/)**: Container technologies
- **[Deployment](/tags/deployment/)**: Deployment strategies
- **[Cloud](/tags/cloud/)**: Cloud platforms
- **[Infrastructure](/tags/infrastructure/)**: Infrastructure as Code

## Further Reading

- **Kubernetes Guide**: `/docs/deployment/kubernetes/`
- **Helm Charts**: `/docs/deployment/helm/`
- **Auto-Scaling**: `/docs/operations/auto-scaling/`

## Advanced Orchestration Patterns

### Custom Kubernetes Operator

Deploy a custom operator for automated Geode cluster management:

```yaml
# geode-operator/operator.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: geode-operator
  namespace: geode-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: geode-operator
rules:
  - apiGroups: ["apps"]
    resources: ["statefulsets", "deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["geode.codepros.org"]
    resources: ["geodeclusters"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: geode-operator
  namespace: geode-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: geode-operator
  template:
    metadata:
      labels:
        app: geode-operator
    spec:
      serviceAccountName: geode-operator
      containers:
      - name: operator
        image: codepros/geode-operator:v1.0.0
        env:
        - name: WATCH_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
```

### Custom Resource Definition (CRD)

Define Geode clusters as Kubernetes resources:

```yaml
# geode-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: geodeclusters.geode.codepros.org
spec:
  group: geode.codepros.org
  names:
    kind: GeodeCluster
    plural: geodeclusters
    singular: geodecluster
    shortNames:
    - gc
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              replicas:
                type: integer
                minimum: 1
                maximum: 100
                default: 3
              version:
                type: string
                pattern: '^v\d+\.\d+\.\d+$'
              resources:
                type: object
                properties:
                  memory:
                    type: string
                  cpu:
                    type: string
              storage:
                type: object
                properties:
                  size:
                    type: string
                  class:
                    type: string
              monitoring:
                type: object
                properties:
                  enabled:
                    type: boolean
                  prometheus:
                    type: boolean
---
# Example cluster resource
apiVersion: geode.codepros.org/v1
kind: GeodeCluster
metadata:
  name: production-cluster
  namespace: geode
spec:
  replicas: 5
  version: v0.18.0
  resources:
    memory: "32Gi"
    cpu: "8"
  storage:
    size: "1Ti"
    class: "fast-ssd"
  monitoring:
    enabled: true
    prometheus: true
```

### Advanced StatefulSet Configuration

Production-ready StatefulSet with all features:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: geode-cluster
  namespace: geode
spec:
  serviceName: geode
  replicas: 5
  podManagementPolicy: Parallel
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0
  selector:
    matchLabels:
      app: geode
  template:
    metadata:
      labels:
        app: geode
        version: v0.18.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
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
      initContainers:
      - name: init-sysctl
        image: busybox:1.35
        command:
        - sh
        - -c
        - |
          sysctl -w net.core.somaxconn=65535
          sysctl -w net.ipv4.tcp_max_syn_backlog=8192
          sysctl -w vm.max_map_count=262144
        securityContext:
          privileged: true
      containers:
      - name: geode
        image: codepros/geode:v0.18.0
        ports:
        - containerPort: 3141
          name: client
          protocol: TCP
        - containerPort: 7000
          name: cluster
          protocol: TCP
        - containerPort: 9090
          name: metrics
          protocol: TCP
        env:
        - name: GEODE_CLUSTER_NAME
          value: "production"
        - name: GEODE_NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: GEODE_MEMORY_LIMIT
          valueFrom:
            resourceFieldRef:
              resource: limits.memory
        - name: GEODE_CPU_LIMIT
          valueFrom:
            resourceFieldRef:
              resource: limits.cpu
        volumeMounts:
        - name: data
          mountPath: /var/lib/geode
        - name: config
          mountPath: /etc/geode
        - name: tls-certs
          mountPath: /etc/geode/tls
          readOnly: true
        resources:
          requests:
            memory: "24Gi"
            cpu: "4"
          limits:
            memory: "32Gi"
            cpu: "8"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 9090
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 9090
          initialDelaySeconds: 30
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /health/startup
            port: 9090
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 30
        lifecycle:
          preStop:
            exec:
              command: ["/usr/local/bin/geode", "shutdown", "--graceful"]
      volumes:
      - name: config
        configMap:
          name: geode-config
      - name: tls-certs
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
          storage: 1Ti
```

### Intelligent Auto-Scaling

Custom metrics-based autoscaling:

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
    name: geode-cluster
  minReplicas: 3
  maxReplicas: 20
  metrics:
  # CPU utilization
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  # Memory utilization
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  # Custom metric: queries per second
  - type: Pods
    pods:
      metric:
        name: geode_queries_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  # Custom metric: transaction latency
  - type: Pods
    pods:
      metric:
        name: geode_transaction_latency_p99
      target:
        type: AverageValue
        averageValue: "100m"  # 100ms
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
      - type: Pods
        value: 1
        periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
```

### Monitoring and Observability

Complete monitoring stack integration:

```yaml
# prometheus-servicemonitor.yaml
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
    interval: 30s
    path: /metrics
---
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: geode-alerts
  namespace: geode
spec:
  groups:
  - name: geode
    interval: 30s
    rules:
    - alert: GeodeHighQueryLatency
      expr: geode_query_latency_p99 > 1000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High query latency detected"
        description: "P99 query latency is {{ $value }}ms"

    - alert: GeodeHighMemoryUsage
      expr: (geode_memory_used / geode_memory_total) > 0.9
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High memory usage"
        description: "Memory usage is {{ $value | humanizePercentage }}"

    - alert: GeodeTransactionConflicts
      expr: rate(geode_transaction_conflicts_total[5m]) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High transaction conflict rate"
        description: "{{ $value }} conflicts/sec"

    - alert: GeodeNodeDown
      expr: up{job="geode"} == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Geode node is down"
        description: "Instance {{ $labels.instance }} is not responding"
---
# grafana-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: geode-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  geode-dashboard.json: |
    {
      "dashboard": {
        "title": "Geode Cluster Overview",
        "panels": [
          {
            "title": "Queries per Second",
            "targets": [
              {
                "expr": "sum(rate(geode_queries_total[1m]))"
              }
            ]
          },
          {
            "title": "Query Latency (P50, P95, P99)",
            "targets": [
              {
                "expr": "geode_query_latency_p50",
                "legendFormat": "P50"
              },
              {
                "expr": "geode_query_latency_p95",
                "legendFormat": "P95"
              },
              {
                "expr": "geode_query_latency_p99",
                "legendFormat": "P99"
              }
            ]
          },
          {
            "title": "Active Transactions",
            "targets": [
              {
                "expr": "geode_active_transactions"
              }
            ]
          },
          {
            "title": "Memory Usage",
            "targets": [
              {
                "expr": "geode_memory_used / geode_memory_total"
              }
            ]
          }
        ]
      }
    }
```

### Backup and Disaster Recovery

Automated backup with CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: geode-backup
  namespace: geode
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: codepros/geode-backup:v1.0.0
            env:
            - name: GEODE_HOST
              value: "geode-0.geode.geode.svc.cluster.local"
            - name: GEODE_PORT
              value: "3141"
            - name: BACKUP_BUCKET
              value: "s3://geode-backups/production"
            - name: AWS_REGION
              value: "us-east-1"
            - name: BACKUP_RETENTION_DAYS
              value: "30"
            volumeMounts:
            - name: backup-temp
              mountPath: /tmp/backup
            - name: aws-credentials
              mountPath: /root/.aws
              readOnly: true
            command:
            - /bin/bash
            - -c
            - |
              #!/bin/bash
              set -e

              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              BACKUP_FILE="geode-backup-${TIMESTAMP}.tar.gz"

              echo "Starting backup at ${TIMESTAMP}"

              # Create backup
              /usr/local/bin/geode backup \
                --host $GEODE_HOST \
                --port $GEODE_PORT \
                --output /tmp/backup/${BACKUP_FILE}

              # Upload to S3
              aws s3 cp /tmp/backup/${BACKUP_FILE} \
                ${BACKUP_BUCKET}/${BACKUP_FILE}

              # Clean up old backups
              aws s3 ls ${BACKUP_BUCKET}/ | \
                while read -r line; do
                  createDate=$(echo $line | awk '{print $1" "$2}')
                  createDate=$(date -d "$createDate" +%s)
                  olderThan=$(date -d "-${BACKUP_RETENTION_DAYS} days" +%s)
                  if [ $createDate -lt $olderThan ]; then
                    fileName=$(echo $line | awk '{print $4}')
                    aws s3 rm ${BACKUP_BUCKET}/${fileName}
                    echo "Deleted old backup: ${fileName}"
                  fi
                done

              echo "Backup completed successfully"
          volumes:
          - name: backup-temp
            emptyDir: {}
          - name: aws-credentials
            secret:
              secretName: aws-credentials
          restartPolicy: OnFailure
```

### Multi-Region Deployment

Deploy across multiple regions for disaster recovery:

```yaml
# region-us-east-1.yaml
apiVersion: geode.codepros.org/v1
kind: GeodeCluster
metadata:
  name: geode-us-east-1
  namespace: geode
  labels:
    region: us-east-1
    role: primary
spec:
  replicas: 5
  version: v0.18.0
  region: us-east-1
  crossRegionReplication:
    enabled: true
    peers:
    - region: us-west-2
      endpoint: geode.us-west-2.example.com:3141
    - region: eu-west-1
      endpoint: geode.eu-west-1.example.com:3141
---
# region-us-west-2.yaml
apiVersion: geode.codepros.org/v1
kind: GeodeCluster
metadata:
  name: geode-us-west-2
  namespace: geode
  labels:
    region: us-west-2
    role: replica
spec:
  replicas: 3
  version: v0.18.0
  region: us-west-2
  crossRegionReplication:
    enabled: true
    mode: async
    peers:
    - region: us-east-1
      endpoint: geode.us-east-1.example.com:3141
```

### Service Mesh Integration

Integrate with Istio for advanced traffic management:

```yaml
# istio-virtualservice.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: geode
  namespace: geode
spec:
  hosts:
  - geode.geode.svc.cluster.local
  http:
  - match:
    - headers:
        x-geode-version:
          exact: v0.18.0
    route:
    - destination:
        host: geode.geode.svc.cluster.local
        subset: v0-18-0
  - route:
    - destination:
        host: geode.geode.svc.cluster.local
        subset: stable
---
# istio-destinationrule.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: geode
  namespace: geode
spec:
  host: geode.geode.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        http1MaxPendingRequests: 1024
        http2MaxRequests: 1024
        maxRequestsPerConnection: 10
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
  subsets:
  - name: stable
    labels:
      version: v0.18.0
  - name: v0-18-0
    labels:
      version: v0.18.0
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 500
```

- **Auto-Scaling**: `/docs/operations/auto-scaling/`
