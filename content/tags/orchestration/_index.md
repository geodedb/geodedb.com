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
